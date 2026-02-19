"use client";

import { useEffect, useState, useRef } from "react";
import ProjectPanel from "@/components/ProjectPanel";
import VendorComparisonTable from "@/components/VendorComparisonTable";
import VendorCVPanel from "@/components/VendorCVPanel";
import LeaderboardDrawer from "@/components/LeaderboardDrawer";

// ---- CONSTANTS ----
const API_URL = "http://127.0.0.1:5000";
const VENDORS_ENDPOINT = `${API_URL}/experiment/vendors`;
const HEALTH_ENDPOINT = `${API_URL}/health`;

export default function Dashboard() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Data Status Widget state
  const [dataStatus, setDataStatus] = useState({
    backendConnected: false,
    vendorCount: 0,
    lastFetchTime: "",
    latencyMs: 0,
  });

  const hasFetched = useRef(false); // Prevent double-fetch in StrictMode

  // PROJECT DATA
  const project = {
    name: "New National Highway (Phase 4)",
    budget: "$5,000,000",
    deadline: "18 Months",
    location: "Delhi-Mumbai Corridor",
    type: "Infrastructure Expansion",
  };

  // ---- RISK COMPUTATION ENGINE (Defensive, NaN-proof) ----
  const calculateRiskScore = (v: any): number => {
    if (!v) return 0;
    const fFlags = Number(v.fraudFlags) || 0;
    const dHistory = Number(v.delayHistory) || 0;
    const cRate = Number(v.completionRate) || 100;
    const fScore = Number(v.financialScore) || 100;

    const rawScore =
      (Number(v.fraudFlags) || 0) * 10 +
      (Number(v.delayHistory) || 0) * 2 +
      (100 - (Number(v.financialScore) || 0));

    const result = Math.min(100, Math.max(0, Math.round(rawScore)));
    return isNaN(result) ? 0 : result;
  };

  // ---- DATA FETCH (runs exactly once) ----
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function init() {
      const startTime = Date.now();
      console.log(`[FRONTEND] Fetching vendors from ${VENDORS_ENDPOINT}`);

      try {
        const res = await fetch(VENDORS_ENDPOINT);
        const latency = Date.now() - startTime;

        console.log("[TRACE] STATUS:", res.status);
        console.log("[TRACE] CONTENT-TYPE:", res.headers.get("content-type"));
        console.log("[TRACE] URL:", res.url);
        console.log("[TRACE] REDIRECTED:", res.redirected);
        console.log("[TRACE] HEADERS:", JSON.stringify([...res.headers.entries()]));

        if (!res.ok) {
          throw new Error(`Backend returned status ${res.status}`);
        }

        const text = await res.text();
        console.log("[TRACE] RAW BODY (first 300 chars):", text.substring(0, 300));

        if (text.startsWith("<!") || text.startsWith("<html")) {
          console.error("[FRONTEND] ❌ GOT HTML! Full response:", text.substring(0, 500));
          throw new Error("Backend returned HTML instead of JSON. Check if backend is running on port 5000.");
        }

        let data: any;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          console.error("[FRONTEND] ❌ JSON.parse failed. Raw text:", text.substring(0, 500));
          throw new Error("Response is not valid JSON");
        }

        console.log("[FETCH SUCCESS]", data.length);

        // ---- STRICT VALIDATION ----
        if (!Array.isArray(data)) {
          throw new Error(`Expected array, got ${typeof data}`);
        }
        if (data.length === 0) {
          throw new Error("Backend returned empty vendor array");
        }

        // Sanitize each vendor — force ALL numeric fields
        const sanitized = data.map((v: any) => ({
          ...v,
          experienceYears: Number(v.experienceYears) || 0,
          projectsCompleted: Number(v.projectsCompleted) || 0,
          completionRate: Number(v.completionRate) || 0,
          fraudFlags: Number(v.fraudFlags) || 0,
          delayHistory: Number(v.delayHistory) || 0,
          financialScore: Number(v.financialScore) || 0,
          bidAmount: Number(v.bidAmount) || 0,
          safetyRating: Number(v.safetyRating) || 0,
          litigationHistory: Number(v.litigationHistory) || 0,
          workforceStrength: Number(v.workforceStrength) || 0,
          annualTurnover: Number(v.annualTurnover) || 0,
        }));

        console.log(`[FRONTEND] ✅ Received ${sanitized.length} validated vendors (${latency}ms)`);
        sanitized.forEach((v: any) =>
          console.log(`  ${v.id}: ${v.name} — risk=${calculateRiskScore(v)}%`)
        );

        setVendors(sanitized);
        setFetchError(null);

        // Auto-select best (lowest risk) vendor
        const sorted = [...sanitized].sort(
          (a, b) => calculateRiskScore(a) - calculateRiskScore(b)
        );
        setSelected(sorted[0]);
        console.log(`[FRONTEND] Auto-selected: ${sorted[0].name}`);

        setDataStatus({
          backendConnected: true,
          vendorCount: sanitized.length,
          lastFetchTime: new Date().toLocaleTimeString(),
          latencyMs: latency,
        });
      } catch (err: any) {
        console.error("[FRONTEND] ❌ FETCH FAILED:", err.message);
        setFetchError(err.message);
        setDataStatus((prev) => ({
          ...prev,
          backendConnected: false,
          lastFetchTime: new Date().toLocaleTimeString(),
        }));
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const getTier = (score: number) => {
    const s = Number(score) || 0;
    if (s === 0) return "ELITE TIER";
    if (s <= 30) return "TIER 1 (SAFE)";
    if (s <= 50) return "TIER 2 (LOW)";
    if (s <= 80) return "TIER 3 (MOD)";
    return "TIER 4 (HIGH)";
  };

  // Numeric version of project budget for bid comparison
  const PROJECT_BUDGET_NUMERIC = 500000000; // ₹50 Cr

  const vendorsWithScores = vendors.map((v) => ({
    ...v,
    riskScore: calculateRiskScore(v),
  }));

  const bestVendor =
    vendorsWithScores.length > 0
      ? [...vendorsWithScores].sort((a, b) => a.riskScore - b.riskScore)[0]
      : null;

  // Find the vendor with the lowest bid
  const lowestBidVendor = vendors.length > 0
    ? [...vendors].filter(v => (Number(v.bidAmount) || 0) > 0).sort((a, b) => (Number(a.bidAmount) || 0) - (Number(b.bidAmount) || 0))[0]
    : null;
  const lowestBidId = lowestBidVendor?.id || '';

  // ---- LOADING STATE ----
  if (loading)
    return <div style={styles.loading}>Initializing Audit Engine...</div>;

  // ---- ERROR STATE (no placeholder fallback — fail loud) ----
  if (fetchError || vendors.length === 0) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ margin: "0 0 12px 0", color: "#ef4444" }}>
            Vendor Data Failed to Load
          </h2>
          <p style={{ color: "#94a3b8", margin: "0 0 20px 0", lineHeight: 1.6 }}>
            {fetchError || "No vendor data received from backend."}
          </p>
          <div style={styles.errorDetails}>
            <p>
              <strong>Endpoint:</strong> {VENDORS_ENDPOINT}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {dataStatus.backendConnected ? "Connected" : "Disconnected"}
            </p>
            <p>
              <strong>Time:</strong> {dataStatus.lastFetchTime || "N/A"}
            </p>
          </div>
          <button
            style={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* DATA STATUS WIDGET (always visible) */}
      <div style={styles.statusWidget}>
        <span style={{ color: dataStatus.backendConnected ? "#10b981" : "#ef4444", marginRight: "8px" }}>
          ●
        </span>
        <span>
          Backend: {dataStatus.backendConnected ? "Connected" : "Disconnected"}
        </span>
        <span style={styles.statusDivider}>|</span>
        <span>Vendors: {dataStatus.vendorCount}</span>
        <span style={styles.statusDivider}>|</span>
        <span>Fetched: {dataStatus.lastFetchTime}</span>
        <span style={styles.statusDivider}>|</span>
        <span>Latency: {dataStatus.latencyMs}ms</span>
      </div>

      {/* 3-PANEL GRID */}
      <div style={styles.mainGrid}>
        {/* LEFT: PROJECT PANEL */}
        <aside style={styles.sidePanel}>
          <ProjectPanel
            project={project}
            bestVendorName={bestVendor?.name}
          />
        </aside>

        {/* MIDDLE: COMPARISON & AUDIT */}
        <main style={styles.middlePanel}>
          <VendorComparisonTable
            vendors={vendors}
            onSelect={setSelected}
            selectedId={selected?.id}
            calculateRisk={calculateRiskScore}
            lowestBidId={lowestBidId}
            projectBudget={PROJECT_BUDGET_NUMERIC}
          />
        </main>

        {/* RIGHT: TECH DOSSIER (CV) */}
        <aside style={styles.sidePanel}>
          <VendorCVPanel
            vendor={selected}
            riskScore={selected ? calculateRiskScore(selected) : 0}
          />
        </aside>
      </div>

      {/* BOTTOM LEADERBOARD DRAWER */}
      <LeaderboardDrawer
        vendors={vendorsWithScores}
        isOpen={isLeaderboardOpen}
        onToggle={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
        getTier={getTier}
      />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: "100vh",
    background: "#0a0f1e",
    color: "white",
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  statusWidget: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 16px",
    background: "#111827",
    borderBottom: "1px solid #1e293b",
    fontSize: "11px",
    color: "#94a3b8",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  statusDivider: {
    color: "#334155",
    margin: "0 6px",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "300px 1fr 380px",
    flex: 1,
    gap: "2px",
    background: "#1e293b",
    overflow: "hidden",
  },
  sidePanel: {
    background: "#0a0f1e",
    overflowY: "auto",
    padding: "10px",
  },
  middlePanel: {
    background: "#0a0f1e",
    padding: "24px",
    overflowY: "auto",
  },
  loading: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0f1e",
    color: "#3b82f6",
    fontSize: "20px",
    fontWeight: "bold",
    letterSpacing: "0.1em",
  },
  errorContainer: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0f1e",
    color: "white",
  },
  errorCard: {
    textAlign: "center" as const,
    padding: "48px",
    background: "#111827",
    borderRadius: "20px",
    border: "1px solid #334155",
    maxWidth: "480px",
  },
  errorDetails: {
    textAlign: "left" as const,
    background: "#0a0f1e",
    padding: "16px",
    borderRadius: "12px",
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "20px",
    fontFamily: "monospace",
    lineHeight: 1.8,
  },
  retryBtn: {
    padding: "12px 32px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
};
