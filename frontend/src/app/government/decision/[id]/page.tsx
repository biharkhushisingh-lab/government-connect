"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import RiskRing from "@/components/RiskRing";
import CollapsibleSection from "@/components/CollapsibleSection";

// ---- CONSTANTS ----
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/v1').replace('/v1', '');
const API = `${BASE_URL}/experiment`;

// ---- TYPES ----
interface FraudResult { status: string; riskScore: number; fraudSignals: (string | { type: string; severity: string; description: string })[]; extractedFields: { invoiceNumber?: string; amount?: number; gstNumber?: string; date?: string; vendorName?: string }; confidence: string; message?: string; visualForensics?: { signature?: { present: boolean; quality: string; forgeryRisk: string }; qr?: { valid: boolean; found: boolean; message?: string }; tampering?: { isTampered: boolean; notes: string[] }; }; modelMetadata?: { used: boolean; confidence: string; version: string; model: string; source: string; }; }
interface ChatMessage { role: "user" | "ai"; content: string; timestamp: string; toolName?: string; attachments?: { name: string; url: string; type: string }[]; fraudResult?: FraudResult; receiptId?: string; }
interface AIAnalysisResult { riskLevel: string; confidenceScore: number; recommendedAction: string; analysisSummary: string; details?: string[]; }

// ---- HELPERS ----
const safeNum = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };
const fmtCurrency = (n: number | undefined): string => { const v = safeNum(n); if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`; if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`; return `₹${v.toLocaleString("en-IN")}`; };
const calcRisk = (v: any): number => { if (!v) return 0; const r = safeNum(v.fraudFlags) * 15 + safeNum(v.delayHistory) * 5 + (100 - safeNum(v.completionRate)) * 0.5 + (100 - safeNum(v.financialScore)) * 0.3; return Math.min(100, Math.max(0, Math.round(isNaN(r) ? 0 : r))); };
const riskColor = (s: number) => s >= 60 ? "#ef4444" : s >= 30 ? "#f59e0b" : "#10b981";
const riskLabel = (s: number) => s >= 60 ? "HIGH RISK" : s >= 30 ? "MODERATE" : "SAFE";

// =====================================================================
// MOCK AI ENGINE
// FUTURE: Plug ML fraud detection model here
// FUTURE: Add invoice OCR engine
// FUTURE: Add fake receipt classifier
// FUTURE: Add anomaly detection model
// FUTURE: Blockchain verification module
// =====================================================================
function runMockAI(vendor: any, toolName: string, userMessage?: string): AIAnalysisResult {
    const ff = safeNum(vendor.fraudFlags), dh = safeNum(vendor.delayHistory), fs2 = safeNum(vendor.financialScore);
    const bid = safeNum(vendor.bidAmount), cr = safeNum(vendor.completionRate), sr = safeNum(vendor.safetyRating), lit = safeNum(vendor.litigationHistory);
    const warnings: string[] = []; let rs = 0;

    if (ff > 2) { warnings.push(`⚠️ HIGH FRAUD: ${ff} fraud flags — systematic irregularities suspected.`); rs += 35; }
    else if (ff > 0) { warnings.push(`⚡ MODERATE FRAUD: ${ff} flag(s) — manual verification needed.`); rs += 15; }
    if (dh > 3) { warnings.push(`🕐 RELIABILITY RISK: ${dh} delays — delivery performance concerning.`); rs += 25; }
    else if (dh > 0) { warnings.push(`📋 Minor delays: ${dh} instance(s) — within tolerance.`); rs += 5; }
    if (fs2 < 60) { warnings.push(`💰 FINANCIAL INSTABILITY: Score ${fs2}/100 below threshold.`); rs += 20; }
    if (bid > 0 && bid < 250000000) { warnings.push(`🔍 SUSPICIOUS UNDERBIDDING: ₹${(bid / 10000000).toFixed(1)}Cr may indicate cost-cutting.`); rs += 10; }
    if (sr < 70) { warnings.push(`🦺 SAFETY CONCERN: Rating ${sr}/100 below compliance.`); rs += 10; }
    if (lit > 2) { warnings.push(`⚖️ LEGAL RISK: ${lit} litigation cases on record.`); rs += 15; }
    if (cr < 80) { warnings.push(`📉 LOW COMPLETION: ${cr}% rate — capacity concerns.`); rs += 10; }
    rs = Math.min(100, rs);

    const toolMap: Record<string, string> = {
        "Analyze Invoice": `Invoice analysis for ${vendor.name}: Bid ₹${(bid / 10000000).toFixed(1)}Cr. Financial score: ${fs2}/100. ${ff > 0 ? `${ff} fraud flag(s) in records.` : "No anomalies."}`,
        "Detect Fake Receipt": `Receipt scan for ${vendor.name}: ${ff > 2 ? "⚠️ HIGH ALERT — document manipulation suspected." : ff > 0 ? "⚡ Minor discrepancies." : "✅ No fraud indicators."}`,
        "Compare Historical Patterns": `Pattern analysis: ${safeNum(vendor.projectsCompleted)} projects, ${cr}% completion, ${dh} delays. Trend: ${fs2 > 80 ? "Positive" : fs2 > 60 ? "Neutral" : "Concerning"}.`,
        "Financial Anomaly Scan": `Financial scan: Turnover ₹${(safeNum(vendor.annualTurnover) / 10000000).toFixed(1)}Cr. Credit: ${vendor.creditRating || "N/A"}. ${fs2 < 60 ? "⚠️ ANOMALY — below industry median." : "Normal parameters."}`,
        "Delay Pattern Risk": `Delay assessment: ${dh} delays over ${safeNum(vendor.projectsCompleted)} projects. ${dh > 5 ? "⚠️ CRITICAL delay pattern." : dh > 2 ? "Moderate — milestone payments recommended." : "✅ LOW risk."}`,
        "Cross-Vendor Similarity Scan": `Cross-vendor: ${vendor.specialization}. ${ff > 0 ? "Fraud above peer median." : "Aligned with peers."} ${cr > 90 ? "Top tier completion." : "Below peer average."}`
    };

    let rl = rs >= 60 ? "HIGH RISK" : rs >= 30 ? "MODERATE" : "LOW RISK";
    let action = rs >= 60 ? "REJECT — Full forensic audit recommended." : rs >= 30 ? "CONDITIONAL APPROVAL — Enhanced monitoring required." : "APPROVED — Standard monitoring.";

    let summary = toolMap[toolName] || "";
    if (userMessage && !toolName) {
        const q = userMessage.toLowerCase();
        if (q.includes("fraud") || q.includes("flag")) summary = `Fraud analysis: ${ff} flag(s). ${ff > 2 ? "Exceeds threshold. Investigation recommended." : "Within parameters."}`;
        else if (q.includes("delay") || q.includes("deliver")) summary = `Delivery: ${dh} delays, ${cr}% completion. ${dh > 5 ? "Systemic issues." : "Acceptable range."}`;
        else if (q.includes("financ") || q.includes("bid") || q.includes("money")) summary = `Financial: Score ${fs2}/100. Bid ₹${(bid / 10000000).toFixed(1)}Cr. Turnover ₹${(safeNum(vendor.annualTurnover) / 10000000).toFixed(1)}Cr. ${fs2 < 60 ? "⚠️ Instability." : "Sound."}`;
        else summary = `Analysis of ${vendor.name}: ${warnings.length > 0 ? warnings.slice(0, 2).join(" ") : "No significant risk indicators."} Use tools for detailed scans.`;
    }

    return { riskLevel: rl, confidenceScore: Math.max(60, Math.min(98, 95 - rs * 0.3)), recommendedAction: action, analysisSummary: summary, details: warnings };
}

const AI_TOOLS = [
    { name: "Analyze Invoice", icon: "🧾", desc: "Verify bid amounts & invoices" },
    { name: "Detect Fake Receipt", icon: "🔍", desc: "Scan for document manipulation" },
    { name: "Compare Historical Patterns", icon: "📊", desc: "Track record analysis" },
    { name: "Financial Anomaly Scan", icon: "💰", desc: "Deep financial health" },
    { name: "Delay Pattern Risk", icon: "🕐", desc: "Delivery timeline risk" },
    { name: "Cross-Vendor Similarity Scan", icon: "🔗", desc: "Compare with peers" },
];

// =====================================================================
// MAIN COMPONENT
// =====================================================================
interface ProjectMetrics {
    totalReceipts: number;
    fraudCount: number;
    safeCount: number;
    totalAmount: number;
    fraudAmount: number;
    avgRisk: number;
    projectRiskIndex: number;
    status: string;
}

export default function GovernmentDecisionPage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params?.id as string;

    const [vendor, setVendor] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [masterData, setMasterData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAI, setShowAI] = useState(false);
    const [aiStatus, setAiStatus] = useState<"idle" | "scanning" | "online">("online");

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics | null>(null);

    const fetchProjectMetrics = async () => {
        if (!vendorId) return;
        try {
            const pid = "project_001"; // Scope to current project
            const r = await fetch(`${API}/project-evidence/${pid}/${vendorId}`);
            const d = await r.json();
            if (d.metrics) setProjectMetrics(d.metrics);
        } catch (e) {
            console.error("Failed to fetch project metrics", e);
        }
    };

    useEffect(() => {
        if (showAI && vendorId) fetchProjectMetrics();
    }, [showAI, vendorId]);
    const [pendingFiles, setPendingFiles] = useState<{ file: File; preview?: string }[]>([]);

    // ---- FETCH ALL DATA + ENTERPRISE MEMORY ----
    useEffect(() => {
        async function load() {
            console.log(`[DECISION] Loading data for vendor ${vendorId}`);
            try {
                const [vendorsRes, profileRes, masterRes] = await Promise.all([
                    fetch(`${API}/vendors`),
                    fetch(`${API}/bidder-profile/${vendorId}`),
                    fetch(`${API}/bidders-master`),
                ]);
                if (!vendorsRes.ok) throw new Error(`Vendors API: ${vendorsRes.status}`);
                const vendors = await vendorsRes.json();
                const found = Array.isArray(vendors) ? vendors.find((v: any) => v.id === vendorId) : null;
                if (!found) throw new Error(`Vendor "${vendorId}" not found`);

                // Sanitize vendor numerics
                const safe = { ...found };
                ["experienceYears", "projectsCompleted", "completionRate", "fraudFlags", "delayHistory", "financialScore", "bidAmount", "safetyRating", "litigationHistory", "workforceStrength", "annualTurnover"].forEach(k => { safe[k] = safeNum(found[k]); });
                setVendor(safe);

                if (profileRes.ok) {
                    const p = await profileRes.json();
                    setProfile(p);
                }
                if (masterRes.ok) { const m = await masterRes.json(); const md = Array.isArray(m) ? m.find((b: any) => b.id === vendorId) : null; setMasterData(md); }

                // ---- ENTERPRISE MEMORY: Load chat + metrics from backend ----
                try {
                    const memRes = await fetch(`${API}/vendor-memory/project_001/${vendorId}`);
                    if (memRes.ok) {
                        const mem = await memRes.json();
                        // Load persistent chat history from backend
                        if (mem.conversationHistory && mem.conversationHistory.length > 0) {
                            const backendMsgs: ChatMessage[] = mem.conversationHistory.map((m: any) => ({
                                role: m.role === 'ai' ? 'ai' as const : 'user' as const,
                                content: m.content || '',
                                timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '',
                                toolName: m.toolName,
                            }));
                            setChatMessages(backendMsgs);
                            console.log(`[MEMORY] ✅ Loaded ${backendMsgs.length} chat messages from backend`);
                        }
                        // Load project metrics from backend
                        if (mem.totals) {
                            setProjectMetrics(mem.totals);
                            console.log(`[MEMORY] ✅ Loaded metrics: ${mem.totals.totalReceipts} receipts, ${mem.totals.fraudCount} fraud`);
                        }
                    }
                } catch (memErr: any) {
                    console.warn(`[MEMORY] Could not load vendor memory: ${memErr.message}`);
                }

                console.log(`[DECISION] ✅ Loaded ${safe.name}`);
            } catch (err: any) { console.error("[DECISION] ❌", err.message); setError(err.message); } finally { setLoading(false); }
        }
        if (vendorId) load();
    }, [vendorId]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

    // ---- PERSIST CHAT TO PROFILE ----
    const persistChat = async (msgs: ChatMessage[]) => {
        if (!profile) return;
        const updated = { ...profile, aiConversations: msgs };
        updated.history = { ...updated.history, lastUpdated: new Date().toISOString(), totalInteractions: msgs.length };
        setProfile(updated);
        try { await fetch(`${API}/bidder-profile/${vendorId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }); } catch (e) { console.error("[DECISION] Profile save failed"); }
    };

    // ---- CALL REAL AI (with mock fallback) ----
    const callAI = async (msg: string, tool?: string): Promise<AIAnalysisResult> => {
        try {
            const res = await fetch(`${API}/ai-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorContext: vendor,
                    projectId: "project_001",
                    vendorId: vendorId,
                    message: tool ? undefined : msg,
                    toolName: tool || undefined,
                    // chatHistory: chatMessages.slice(-6), // Backend now manages history
                }),
            });
            const data = await res.json();
            if (data.success && data.result) {
                console.log(`[AI] ✅ Real AI response (${data.model})`);
                return data.result;
            }
            throw new Error(data.error || "AI returned no result");
        } catch (err: any) {
            console.warn(`[AI] ⚠️ Falling back to mock AI: ${err.message}`);
            return runMockAI(vendor, tool || "", tool ? undefined : msg);
        }
    };

    // ---- FILE UPLOAD ----
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newFiles = files.map(f => ({ file: f, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined }));
        setPendingFiles(prev => [...prev, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    const removePendingFile = (idx: number) => { setPendingFiles(prev => prev.filter((_, i) => i !== idx)); };
    const uploadFiles = async (): Promise<{ name: string; url: string; type: string }[]> => {
        const uploaded: { name: string; url: string; type: string }[] = [];
        for (const pf of pendingFiles) {
            const fd = new FormData();
            fd.append("file", pf.file);
            fd.append("bidderId", vendorId);
            fd.append("category", pf.file.type.startsWith("image/") ? "receipts" : "invoices");
            try {
                const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
                const data = await res.json();
                if (data.success && data.file) uploaded.push({ name: data.file.name, url: `${BASE_URL}${data.file.url}`, type: data.file.type });
            } catch (err) { console.error("[UPLOAD]", err); }
        }
        setPendingFiles([]);
        return uploaded;
    };
    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });

    // ---- SEND CHAT ----
    const sendMessage = async () => {
        if ((!chatInput.trim() && pendingFiles.length === 0) || !vendor) return;

        // Check if any pending files are images
        const imageFiles = pendingFiles.filter(pf => pf.file.type.startsWith("image/"));
        const nonImageFiles = pendingFiles.filter(pf => !pf.file.type.startsWith("image/"));

        // Upload non-image files normally
        const savedNonImage = nonImageFiles.length > 0 ? await (async () => {
            const old = pendingFiles; setPendingFiles(nonImageFiles);
            const r = await uploadFiles(); setPendingFiles(old); return r;
        })() : [];

        // Upload image files too (for storage) and get base64
        let imageBase64: string | null = null;
        let imageAttachments: { name: string; url: string; type: string }[] = [];
        if (imageFiles.length > 0) {
            // Convert first image to base64 for AI analysis
            imageBase64 = await fileToBase64(imageFiles[0].file);
            // Also upload to storage
            for (const pf of imageFiles) {
                const fd = new FormData();
                fd.append("file", pf.file);
                fd.append("bidderId", vendorId);
                fd.append("category", "receipts");
                try {
                    const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
                    const data = await res.json();
                    if (data.success && data.file) imageAttachments.push({ name: data.file.name, url: `${BASE_URL}${data.file.url}`, type: data.file.type });
                } catch (err) { console.error("[UPLOAD]", err); }
            }
        }

        const allAttachments = [...savedNonImage, ...imageAttachments];
        const content = chatInput.trim() || (allAttachments.length > 0 ? `Uploaded ${allAttachments.length} file(s): ${allAttachments.map(a => a.name).join(", ")}` : "");
        const userMsg: ChatMessage = { role: "user", content, timestamp: new Date().toLocaleTimeString(), attachments: allAttachments.length > 0 ? allAttachments : undefined };
        const newMsgs = [...chatMessages, userMsg];
        setChatMessages(newMsgs); setChatInput(""); setPendingFiles([]); setIsTyping(true); setAiStatus("scanning");

        let aiMsg: ChatMessage;

        if (imageBase64) {
            // Route to image analysis endpoint
            try {
                const res = await fetch(`${API}/ai-analyze-image`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ vendorId, imageBase64, message: content, vendorContext: vendor, projectId: "project_001" }),
                });
                const data = await res.json();
                if (data.success && data.result) {
                    const fr = data.result as FraudResult;
                    const statusIcon = fr.status === "FLAGGED" ? "🚨" : fr.status === "REVIEW" ? "⚡" : "✅";
                    const receiptNote = data.receiptId ? ` (Receipt: ${data.receiptId})` : '';
                    aiMsg = { role: "ai", content: `${statusIcon} **FRAUD ANALYSIS RESULT** — ${fr.status}${receiptNote}`, timestamp: new Date().toLocaleTimeString(), fraudResult: fr, attachments: imageAttachments, receiptId: data.receiptId };
                    // Auto-refresh metrics since backend already saved to memory
                    if (data.memoryUpdated) {
                        console.log(`[MEMORY] ✅ Receipt ${data.receiptId} auto-saved to vendor memory`);
                        fetchProjectMetrics();
                    }
                } else {
                    throw new Error(data.error || "Analysis failed");
                }
            } catch (err: any) {
                console.warn(`[AI-IMAGE] Error: ${err.message}`);
                const result = await callAI(content);
                aiMsg = { role: "ai", content: result.analysisSummary, timestamp: new Date().toLocaleTimeString() };
            }
        } else {
            // Normal text chat
            const result = await callAI(content);
            aiMsg = { role: "ai", content: result.analysisSummary, timestamp: new Date().toLocaleTimeString() };
            // Refresh metrics after AI chat (in case it references updated data)
            if (result) fetchProjectMetrics();
        }

        const finalMsgs = [...newMsgs, aiMsg];
        setChatMessages(finalMsgs); setIsTyping(false); setAiStatus("online");
        persistChat(finalMsgs);
    };

    // ---- RUN TOOL ----
    const runTool = async (toolName: string) => {
        if (!vendor) return;
        const sysMsg: ChatMessage = { role: "user", content: `Run tool: ${toolName}`, timestamp: new Date().toLocaleTimeString(), toolName };
        const newMsgs = [...chatMessages, sysMsg];
        setChatMessages(newMsgs); setIsTyping(true); setAiStatus("scanning");
        const result = await callAI("", toolName);
        const aiMsg: ChatMessage = { role: "ai", content: `**[${toolName}]**\n\n${result.analysisSummary}\n\n**Risk:** ${result.riskLevel} | **Confidence:** ${result.confidenceScore}% | **Action:** ${result.recommendedAction}`, timestamp: new Date().toLocaleTimeString(), toolName };
        const finalMsgs = [...newMsgs, aiMsg];
        setChatMessages(finalMsgs); setIsTyping(false); setAiStatus("online");
        persistChat(finalMsgs);
    };

    // ---- LOADING / ERROR ----
    if (loading) return (<div style={S.center}><div style={S.pulseRing} /><p style={{ color: "#3b82f6", fontWeight: "bold", letterSpacing: "0.1em" }}>LOADING BIDDER PROFILE...</p></div>);
    if (error || !vendor) return (<div style={S.center}><div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div><h2 style={{ color: "#ef4444", margin: "0 0 12px 0" }}>Vendor Not Found</h2><p style={{ color: "#94a3b8" }}>{error || "Invalid vendor ID"}</p><button style={S.outlineBtn} onClick={() => router.push("/")}>← RETURN TO DASHBOARD</button></div>);

    const rs = calcRisk(vendor);
    const rc = riskColor(rs);
    const rl = riskLabel(rs);
    const certs: string[] = Array.isArray(vendor.certifications) ? vendor.certifications : [];
    const bids = masterData?.historicalBids || [];
    const projHist = masterData?.projectHistory || [];
    const perfHist = masterData?.performanceHistory || [];
    const finHist = masterData?.financialHistory || [];
    const lifetime = masterData?.lifetimeSummary || {};
    const docs = profile?.documents || { invoices: [], receipts: [], contracts: [], complianceCertificates: [], aiReports: [] };
    const investigations = profile?.investigationLogs || [];
    const grants = profile?.grantHistory || [];

    // =====================================================================
    // AI INVESTIGATION (Page 3 concept — Current Project Only)
    // =====================================================================
    if (showAI) return (
        <div style={S.page}>
            <div style={S.topBar}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button style={S.backSmall} onClick={() => setShowAI(false)}>← Decision</button>
                    <span style={S.topTitle}>🤖 AI Investigation — {vendor.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: aiStatus === "scanning" ? "#f59e0b" : "#10b981", animation: aiStatus === "scanning" ? "pulse 1.5s infinite" : "none" }} />
                    <span style={{ fontSize: "12px", color: aiStatus === "scanning" ? "#f59e0b" : "#94a3b8", fontWeight: "bold" }}>{aiStatus === "scanning" ? "AI SCANNING..." : "AI ONLINE"}</span>
                </div>
            </div>
            <div style={S.aiGrid}>
                {/* LEFT */}
                <div style={S.scrollCol}>
                    <Card title="📋 Vendor Summary">
                        <h3 style={{ margin: "0 0 4px 0", fontSize: "15px" }}>{vendor.name}</h3>
                        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 10px 0" }}>{vendor.specialization}</p>
                        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                            <RiskRing score={projectMetrics ? projectMetrics.projectRiskIndex : rs} size={65} />
                        </div>
                        <div style={{ textAlign: "center" as const, color: projectMetrics ? riskColor(projectMetrics.projectRiskIndex) : rc, fontWeight: "bold", fontSize: "13px" }}>
                            {projectMetrics ? (projectMetrics.projectRiskIndex >= 60 ? "HIGH RISK" : projectMetrics.projectRiskIndex >= 30 ? "MODERATE" : "LOW RISK") : rl}
                        </div>
                    </Card>
                    <Card title="📊 Live Project Monitor">
                        {projectMetrics ? (
                            <>
                                <div style={{ marginBottom: "10px", padding: "8px", background: projectMetrics.status === "ACTIVE" ? "#064e3b" : projectMetrics.status === "UNDER REVIEW" ? "#450a0a" : "#1e3a8a", borderRadius: "6px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                                    <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>Project Status</div>
                                    <div style={{ fontWeight: "bold", color: "white" }}>{projectMetrics.status}</div>
                                </div>
                                <Mini l="Project Risk Index" v={`${projectMetrics.projectRiskIndex}%`} c={riskColor(projectMetrics.projectRiskIndex)} />
                                <Mini l="Receipts Uploaded" v={String(projectMetrics.totalReceipts)} />
                                <Mini l="Fraud Receipts" v={String(projectMetrics.fraudCount)} c={projectMetrics.fraudCount > 0 ? "#ef4444" : "#10b981"} />
                                <div style={{ borderTop: "1px solid #1e293b", margin: "6px 0" }} />
                                <Mini l="Total Claimed" v={`₹${(projectMetrics.totalAmount / 100000).toFixed(1)}L`} />
                                <Mini l="Fraud Flagged" v={`₹${(projectMetrics.fraudAmount / 100000).toFixed(1)}L`} c={projectMetrics.fraudAmount > 0 ? "#ef4444" : "#94a3b8"} />
                            </>
                        ) : (
                            <div style={{ padding: "10px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>No project data yet. Upload receipts to begin monitoring.</div>
                        )}
                    </Card>
                </div>
                {/* CENTER — CHAT */}
                <div style={{ display: "flex", flexDirection: "column" as const, background: "#0a0f1e", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #1e293b" }}><span style={{ fontWeight: "bold" }}>🤖 AI Fraud Investigation</span><span style={{ fontSize: "11px", color: "#64748b" }}>{chatMessages.length} msgs</span></div>
                    <div style={{ flex: 1, overflowY: "auto" as const, padding: "20px", display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                        {chatMessages.length === 0 && <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center" as const }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>🤖</div><h3 style={{ margin: "0 0 8px 0", color: "#e2e8f0" }}>AI Ready</h3><p style={{ color: "#64748b", fontSize: "13px", maxWidth: "400px", margin: 0 }}>Ask about {vendor.name}&apos;s risk profile, or use the tools panel.</p></div>}
                        {chatMessages.map((msg: any, i: number) => (<div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", padding: "12px 16px", borderRadius: "14px", border: "1px solid", borderColor: msg.role === "user" ? "#3b82f6" : "#334155", background: msg.role === "user" ? "#1e3a8a" : "#1e293b", maxWidth: "85%" }}>{msg.toolName && <div style={{ fontSize: "10px", color: "#3b82f6", marginBottom: "4px", fontWeight: "bold" }}>🔧 {msg.toolName}</div>}{msg.attachments && msg.attachments.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>{msg.attachments.map((att: any, ai: number) => att.type.startsWith("image/") ? <img key={ai} src={att.url} alt={att.name} style={{ maxWidth: "200px", maxHeight: "150px", borderRadius: "8px", border: "1px solid #334155" }} /> : <a key={ai} href={att.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 10px", background: "#0f172a", borderRadius: "8px", border: "1px solid #334155", color: "#93c5fd", fontSize: "11px", textDecoration: "none" }}>📄 {att.name}</a>)}</div>}<div style={{ fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>{msg.fraudResult && <FraudResultCard result={msg.fraudResult} imageUrl={msg.attachments?.[0]?.url} vendorId={vendor.id} vendorName={vendor.name} onEvidenceSaved={fetchProjectMetrics} receiptId={(msg as any).receiptId} />}<div style={{ fontSize: "10px", color: "#64748b", marginTop: "6px", textAlign: "right" }}>{msg.timestamp}</div></div>))}
                        {isTyping && <div style={{ alignSelf: "flex-start", padding: "12px 16px", borderRadius: "14px", background: "#1e293b", border: "1px solid #334155" }}><span style={{ color: "#3b82f6" }}>● ● ●</span></div>}
                        <div ref={chatEndRef} />
                    </div>
                    <div style={{ borderTop: "1px solid #1e293b" }}>
                        {pendingFiles.length > 0 && <div style={{ display: "flex", gap: "8px", padding: "10px 20px", flexWrap: "wrap" as const, background: "#0f172a" }}>{pendingFiles.map((pf, i) => (<div key={i} style={{ position: "relative" as const, display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", background: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>{pf.preview ? <img src={pf.preview} alt="" style={{ width: "32px", height: "32px", borderRadius: "4px", objectFit: "cover" as const }} /> : <span>📄</span>}<span style={{ fontSize: "11px", color: "#e2e8f0", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{pf.file.name}</span><button style={{ position: "absolute" as const, top: "-6px", right: "-6px", width: "18px", height: "18px", borderRadius: "50%", border: "none", background: "#ef4444", color: "white", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => removePendingFile(i)}>×</button></div>))}</div>}
                        <div style={{ display: "flex", padding: "14px 20px", gap: "8px", alignItems: "center" }}>
                            <input type="file" ref={fileInputRef} style={{ display: "none" }} multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={handleFileSelect} />
                            <button style={{ padding: "10px", borderRadius: "10px", border: "1px solid #334155", background: "#0f172a", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }} onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = "image/*"; fileInputRef.current.click(); } }} title="Attach Image" disabled={isTyping}>🖼️</button>
                            <button style={{ padding: "10px", borderRadius: "10px", border: "1px solid #334155", background: "#0f172a", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }} onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"; fileInputRef.current.click(); } }} title="Attach File" disabled={isTyping}>📎</button>
                            <input style={{ flex: 1, padding: "12px 16px", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "white", outline: "none", fontSize: "14px" }} placeholder={`Ask about ${vendor.name}...`} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} disabled={isTyping} />
                            <button style={{ padding: "12px 20px", borderRadius: "12px", border: "none", background: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "18px", opacity: isTyping ? 0.5 : 1 }} onClick={sendMessage} disabled={isTyping}>{isTyping ? "⏳" : "→"}</button>
                        </div>
                    </div>
                </div>
                {/* RIGHT — TOOLS */}
                <div style={S.scrollCol}>
                    <Card title="🧰 AI Tools"><p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 12px 0" }}>Click to run automated analysis</p>{AI_TOOLS.map(t => (<button key={t.name} style={S.toolBtn} onClick={() => runTool(t.name)} disabled={isTyping}><span style={{ fontSize: "16px" }}>{t.icon}</span><div><div style={{ fontSize: "11px", fontWeight: "bold" }}>{t.name}</div><div style={{ fontSize: "9px", color: "#64748b" }}>{t.desc}</div></div></button>))}</Card>
                    <Card title="🔮 Coming Soon" dashed><p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>• ML fraud detection<br />• Invoice OCR<br />• Fake receipt classifier<br />• Anomaly detection AI<br />• Blockchain verification</p></Card>
                </div>
            </div>
            <style>{`@keyframes pulse { 0% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.3); } 100% { opacity:1; transform:scale(1); } }`}</style>
        </div>
    );

    // =====================================================================
    // DECISION PAGE (Page 2 — Lifetime Data)
    // =====================================================================
    return (
        <div style={S.page}>
            <div style={S.topBar}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button style={S.backSmall} onClick={() => router.push("/")}>← Dashboard</button>
                    <span style={S.topTitle}>🏛️ National Infrastructure AI Oversight System</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>SYSTEM ACTIVE</span>
                </div>
            </div>

            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", gap: "2px", background: "#1e293b", overflow: "hidden" }}>
                {/* LEFT — PROFILE + HISTORY */}
                <div style={{ background: "#0a0f1e", padding: "24px", overflowY: "auto" as const }}>
                    {/* HEADER */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                        <div><h1 style={{ fontSize: "24px", margin: "0 0 4px 0" }}>{vendor.name}</h1><p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>{vendor.specialization} • {vendor.location}</p></div>
                        <RiskRing score={rs} size={80} />
                    </div>

                    {/* STATS GRID */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                        <Stat l="Bid Amount" v={fmtCurrency(vendor.bidAmount)} c="#3b82f6" /><Stat l="Risk Index" v={`${rs}%`} c={rc} /><Stat l="Financial" v={`${safeNum(vendor.financialScore)}/100`} c={safeNum(vendor.financialScore) >= 70 ? "#10b981" : "#f59e0b"} /><Stat l="Fraud Flags" v={String(safeNum(vendor.fraudFlags))} c={safeNum(vendor.fraudFlags) > 0 ? "#ef4444" : "#10b981"} />
                        <Stat l="Completion" v={`${safeNum(vendor.completionRate)}%`} c={safeNum(vendor.completionRate) >= 90 ? "#10b981" : "#f59e0b"} /><Stat l="Delays" v={String(safeNum(vendor.delayHistory))} c={safeNum(vendor.delayHistory) > 3 ? "#ef4444" : "#10b981"} /><Stat l="Experience" v={`${safeNum(vendor.experienceYears)}y`} /><Stat l="Safety" v={`${safeNum(vendor.safetyRating)}/100`} />
                        <Stat l="Litigation" v={String(safeNum(vendor.litigationHistory))} c={safeNum(vendor.litigationHistory) > 0 ? "#ef4444" : "#10b981"} /><Stat l="Workforce" v={safeNum(vendor.workforceStrength).toLocaleString()} /><Stat l="Turnover" v={fmtCurrency(vendor.annualTurnover)} /><Stat l="Credit" v={vendor.creditRating || "N/A"} />
                    </div>

                    {certs.length > 0 && <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginBottom: "20px" }}>{certs.map((c, i) => <span key={i} style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid rgba(59,130,246,0.3)" }}>{c}</span>)}</div>}

                    {/* LIFETIME SUMMARY */}
                    {masterData && <CollapsibleSection title="LIFETIME SUMMARY" icon="📈" defaultOpen badge={`Win Rate: ${lifetime.winRate || 0}%`} badgeColor="#10b981">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", paddingTop: "12px" }}>
                            <Stat l="Contracts Won" v={String(lifetime.totalContractsAwarded || 0)} c="#10b981" /><Stat l="Total Bids" v={String(lifetime.totalBidsSubmitted || 0)} /><Stat l="Total Received" v={fmtCurrency(lifetime.totalMoneyReceived)} c="#3b82f6" />
                            <Stat l="Avg Risk" v={`${(lifetime.averageRiskScore || 0).toFixed(1)}%`} c={riskColor(lifetime.averageRiskScore || 0)} /><Stat l="Avg Completion" v={`${(lifetime.averageCompletionRate || 0).toFixed(1)}%`} /><Stat l="Win Rate" v={`${lifetime.winRate || 0}%`} c="#10b981" />
                        </div>
                    </CollapsibleSection>}

                    {/* BIDDING HISTORY */}
                    <CollapsibleSection title="BIDDING HISTORY" icon="🧾" badge={`${bids.length} bids`}>
                        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "12px", marginTop: "10px" }}>
                            <thead><tr style={{ color: "#64748b" }}><th style={S.th}>Project</th><th style={S.th}>Year</th><th style={S.th}>Bid</th><th style={S.th}>Result</th><th style={S.th}>Contract</th></tr></thead>
                            <tbody>{bids.map((b: any, i: number) => <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}><td style={S.td}>{b.projectName}</td><td style={S.td}>{b.year}</td><td style={S.td}>{fmtCurrency(b.bidAmount)}</td><td style={S.td}><span style={{ color: b.result === "Won" ? "#10b981" : b.result === "Lost" ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>{b.result}</span></td><td style={S.td}>{b.contractValue > 0 ? fmtCurrency(b.contractValue) : "—"}</td></tr>)}</tbody>
                        </table>
                        {bids.length === 0 && <p style={{ color: "#64748b", fontSize: "12px", textAlign: "center" as const, padding: "16px 0" }}>No bidding history available</p>}
                    </CollapsibleSection>

                    {/* PROJECT HISTORY */}
                    <CollapsibleSection title="PROJECT HISTORY" icon="🏗️" badge={`${projHist.length} projects`}>
                        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "12px", marginTop: "10px" }}>
                            <thead><tr style={{ color: "#64748b" }}><th style={S.th}>Project</th><th style={S.th}>Year</th><th style={S.th}>Value</th><th style={S.th}>Status</th><th style={S.th}>Delay</th><th style={S.th}>Flags</th></tr></thead>
                            <tbody>{projHist.map((p: any, i: number) => <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}><td style={S.td}>{p.projectName}</td><td style={S.td}>{p.year}</td><td style={S.td}>{fmtCurrency(p.contractValue)}</td><td style={S.td}><span style={{ color: p.status === "Completed" ? "#10b981" : p.status === "Terminated" ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>{p.status}</span></td><td style={S.td}>{p.delayMonths}mo</td><td style={S.td}>{p.fraudFlagsInProject}</td></tr>)}</tbody>
                        </table>
                        {projHist.length === 0 && <p style={{ color: "#64748b", fontSize: "12px", textAlign: "center" as const, padding: "16px 0" }}>No project history available</p>}
                    </CollapsibleSection>

                    {/* DOCUMENT ARCHIVE */}
                    <CollapsibleSection title="DOCUMENT ARCHIVE" icon="📂" badge={`${(docs.invoices?.length || 0) + (docs.receipts?.length || 0) + (docs.contracts?.length || 0)} docs`}>
                        <div style={{ paddingTop: "12px" }}>
                            {["invoices", "receipts", "contracts", "complianceCertificates", "aiReports"].map(cat => (
                                <div key={cat} style={{ marginBottom: "10px" }}>
                                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" as const }}>{cat.replace(/([A-Z])/g, " $1")}</span>
                                    {(docs[cat] || []).length === 0 ? <p style={{ fontSize: "12px", color: "#475569", margin: "4px 0 0 0" }}>No {cat} uploaded</p> : (docs[cat] || []).map((d: any, i: number) => <div key={i} style={{ fontSize: "12px", color: "#e2e8f0", padding: "4px 0" }}>{d.name || d}</div>)}
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>

                    {/* AI CONVERSATION MEMORY */}
                    <CollapsibleSection title="AI CONVERSATION MEMORY" icon="💬" badge={`${profile?.aiConversations?.length || 0} msgs`} badgeColor="#3b82f6">
                        <div style={{ paddingTop: "10px", maxHeight: "200px", overflowY: "auto" as const }}>
                            {(profile?.aiConversations || []).length === 0 ? <p style={{ fontSize: "12px", color: "#475569", textAlign: "center" as const }}>No conversations yet. Start an AI investigation.</p> : (profile?.aiConversations || []).map((c: any, i: number) => <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #1e293b", fontSize: "12px" }}><span style={{ color: c.role === "user" ? "#3b82f6" : "#10b981", fontWeight: "bold" }}>{c.role === "user" ? "GOV" : "AI"}:</span> <span style={{ color: "#e2e8f0" }}>{(c.content || "").substring(0, 100)}{(c.content || "").length > 100 ? "..." : ""}</span><span style={{ color: "#475569", fontSize: "10px", marginLeft: "8px" }}>{c.timestamp}</span></div>)}
                        </div>
                    </CollapsibleSection>

                    {/* INVESTIGATION HISTORY */}
                    <CollapsibleSection title="INVESTIGATION HISTORY" icon="🔎" badge={`${investigations.length} audits`}>
                        {investigations.length === 0 ? <p style={{ fontSize: "12px", color: "#475569", textAlign: "center" as const, padding: "12px 0" }}>No investigations on record</p> : investigations.map((inv: any, i: number) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b", fontSize: "12px" }}><div style={{ color: "#e2e8f0", fontWeight: "bold" }}>{inv.date} — Risk Score: {inv.riskScore}%</div><div style={{ color: "#94a3b8" }}>Flags: {inv.flagsRaised} | Status: {inv.resolutionStatus} | Officer: {inv.reviewedBy}</div>{inv.notes && <div style={{ color: "#64748b", fontStyle: "italic" }}>{inv.notes}</div>}</div>)}
                    </CollapsibleSection>

                    {/* GRANT HISTORY */}
                    <CollapsibleSection title="GRANT HISTORY" icon="💸" badge={`${grants.length} grants`}>
                        {grants.length === 0 ? <p style={{ fontSize: "12px", color: "#475569", textAlign: "center" as const, padding: "12px 0" }}>No grant disbursements recorded</p> :
                            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "12px", marginTop: "10px" }}>
                                <thead><tr style={{ color: "#64748b" }}><th style={S.th}>Milestone</th><th style={S.th}>Amount</th><th style={S.th}>Date</th><th style={S.th}>AI</th><th style={S.th}>Bank</th></tr></thead>
                                <tbody>{grants.map((g: any, i: number) => <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}><td style={S.td}>{g.milestoneName}</td><td style={S.td}>{fmtCurrency(g.amountReleased)}</td><td style={S.td}>{g.date}</td><td style={S.td}>{g.verifiedByAI ? "✅" : "❌"}</td><td style={S.td}>{g.verifiedByBank ? "✅" : "❌"}</td></tr>)}</tbody>
                            </table>}
                    </CollapsibleSection>

                    {/* PERFORMANCE HISTORY */}
                    {perfHist.length > 0 && <CollapsibleSection title="PERFORMANCE HISTORY" icon="📊" badge={`${perfHist.length} years`}>
                        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "12px", marginTop: "10px" }}>
                            <thead><tr style={{ color: "#64748b" }}><th style={S.th}>Year</th><th style={S.th}>Completion</th><th style={S.th}>Risk</th><th style={S.th}>Completed</th><th style={S.th}>Delays</th></tr></thead>
                            <tbody>{perfHist.map((p: any, i: number) => <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}><td style={S.td}>{p.year}</td><td style={S.td}>{p.completionRate}%</td><td style={S.td} ><span style={{ color: riskColor(p.riskScore) }}>{p.riskScore}%</span></td><td style={S.td}>{p.projectsCompleted}</td><td style={S.td}>{p.delayIncidents}</td></tr>)}</tbody>
                        </table>
                    </CollapsibleSection>}

                    {/* FINANCIAL HISTORY */}
                    {finHist.length > 0 && <CollapsibleSection title="FINANCIAL HISTORY" icon="💰" badge={`${finHist.length} years`}>
                        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "12px", marginTop: "10px" }}>
                            <thead><tr style={{ color: "#64748b" }}><th style={S.th}>Year</th><th style={S.th}>Turnover</th><th style={S.th}>Score</th><th style={S.th}>Received</th></tr></thead>
                            <tbody>{finHist.map((f: any, i: number) => <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}><td style={S.td}>{f.year}</td><td style={S.td}>{fmtCurrency(f.turnover)}</td><td style={S.td}>{f.financialScore}/100</td><td style={S.td}>{f.totalReceived > 0 ? fmtCurrency(f.totalReceived) : "—"}</td></tr>)}</tbody>
                        </table>
                    </CollapsibleSection>}
                </div>

                {/* RIGHT — RECOMMENDATION PANEL */}
                <div style={{ background: "#0a0f1e", padding: "24px", display: "flex", flexDirection: "column" as const, overflowY: "auto" as const }}>
                    <h3 style={{ margin: "0 0 20px 0", fontSize: "18px" }}>📋 Decision Panel</h3>

                    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "8px", padding: "24px", borderRadius: "16px", border: `2px solid ${rc}`, background: rs < 30 ? "rgba(16,185,129,0.1)" : rs < 60 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)" }}>
                        <span style={{ fontSize: "32px" }}>{rs < 30 ? "✅" : rs < 60 ? "⚡" : "🚨"}</span>
                        <span style={{ fontSize: "20px", fontWeight: "bold", color: rc }}>{rl}</span>
                        <span style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center" as const }}>{rs < 30 ? "Vendor passes compliance checks." : rs < 60 ? "Moderate risk — due diligence required." : "Significant red flags — investigation recommended."}</span>
                    </div>

                    <div style={{ marginTop: "24px" }}>
                        <h4 style={{ fontSize: "14px", color: "#64748b", margin: "0 0 12px 0" }}>QUICK FLAGS</h4>
                        <QF ok={safeNum(vendor.fraudFlags) === 0} t="No Fraud Flags" /><QF ok={safeNum(vendor.delayHistory) <= 2} t="Acceptable Delays" /><QF ok={safeNum(vendor.financialScore) >= 70} t="Financially Stable" /><QF ok={safeNum(vendor.completionRate) >= 85} t="High Completion" /><QF ok={safeNum(vendor.safetyRating) >= 80} t="Safety Compliant" /><QF ok={safeNum(vendor.litigationHistory) === 0} t="No Litigation" />
                    </div>
                    <EvidenceArchive vendor={vendor} api={API} />

                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                        <button style={S.primaryBtn} onClick={() => setShowAI(true)}>🤖 PROCEED TO AI INVESTIGATION</button>
                        <button style={S.outlineBtn} onClick={() => router.push("/")}>← Return to Dashboard</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- SUBCOMPONENTS ----
function Stat({ l, v, c }: { l: string; v: string; c?: string }) {
    return <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px", background: "#111827", padding: "12px", borderRadius: "10px", border: "1px solid #1e293b" }}><span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{l}</span><span style={{ fontSize: "15px", fontWeight: "bold", color: c || "#f8fafc" }}>{v}</span></div>;
}
function QF({ ok, t }: { ok: boolean; t: string }) {
    return <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #1e293b" }}><span style={{ color: ok ? "#10b981" : "#ef4444" }}>{ok ? "✅" : "❌"}</span><span style={{ fontSize: "13px", color: ok ? "#e2e8f0" : "#fca5a5" }}>{t}</span></div>;
}
function Card({ title, children, dashed }: { title: string; children: React.ReactNode; dashed?: boolean }) {
    return <div style={{ background: "#111827", padding: "14px", borderRadius: "12px", border: `1px ${dashed ? "dashed" : "solid"} #1e293b`, marginBottom: "10px", opacity: dashed ? 0.5 : 1 }}><h4 style={{ fontSize: "12px", margin: "0 0 10px 0", color: "#3b82f6", fontWeight: "bold" }}>{title}</h4>{children}</div>;
}
function Mini({ l, v, c }: { l: string; v: string; c?: string }) {
    return <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1e293b" }}><span style={{ fontSize: "11px", color: "#94a3b8" }}>{l}</span><span style={{ fontSize: "12px", fontWeight: "bold", color: c || "#f8fafc" }}>{v}</span></div>;
}
function Flag({ level, text }: { level: string; text: string }) {
    const c = level === "h" ? "#ef4444" : level === "m" ? "#f59e0b" : "#10b981";
    return <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", borderBottom: "1px solid #1e293b" }}><div style={{ width: "7px", height: "7px", borderRadius: "50%", background: c }} /><span style={{ fontSize: "12px", color: "#e2e8f0" }}>{text}</span></div>;
}

function FraudResultCard({ result, imageUrl, vendorId, vendorName, onEvidenceSaved, receiptId }: { result: FraudResult; imageUrl?: string; vendorId?: string; vendorName?: string; onEvidenceSaved?: () => void; receiptId?: string }) {
    const [reporting, setReporting] = useState(false);
    const color = result.status === "FLAGGED" ? "#ef4444" : result.status === "REVIEW" ? "#f59e0b" : "#10b981";
    const bg = result.status === "FLAGGED" ? "rgba(239,68,68,0.1)" : result.status === "REVIEW" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)";
    const icon = result.status === "FLAGGED" ? "🚨" : result.status === "REVIEW" ? "⚡" : "✅";
    const ef = result.extractedFields || {};

    const handleReport = async (label: string) => {
        if (!imageUrl) return alert("Original image missing");
        try {
            // 1. Send Feedback to AI (Training)
            let b64 = imageUrl;
            if (imageUrl.startsWith("blob:")) {
                const r = await fetch(imageUrl);
                const b = await r.blob();
                b64 = await new Promise(res => {
                    const reader = new FileReader();
                    reader.onloadend = () => res(reader.result as string);
                    reader.readAsDataURL(b);
                }) as string;
            }

            await fetch(`${API}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image_base64: b64,
                    original_status: result.status,
                    correct_status: label,
                    notes: "User reported via UI"
                })
            });

            // 2. Save Evidence to Project Monitor
            if (vendorId) {
                let savePath = imageUrl;
                if (imageUrl.includes("/uploads/")) savePath = "/uploads/" + imageUrl.split("/uploads/")[1];

                const res = await fetch(`${API}/project-evidence/save`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId: "project_001",
                        vendorId,
                        receiptId: receiptId || undefined,
                        imagePath: savePath,
                        riskScore: result.riskScore,
                        fraudSignals: result.fraudSignals,
                        markedAs: label,
                        amount: safeNum(ef.amount)
                    })
                });

                if (res.ok) {
                    alert(`Receipt saved to LIVE PROJECT MONITOR.`);
                    if (onEvidenceSaved) onEvidenceSaved();
                } else {
                    const err = await res.json();
                    alert(`Error saving evidence: ${err.error || "Unknown error"}`);
                }
            } else {
                alert("Thanks! Feedback submitted.");
            }
            setReporting(false);
        } catch (e) {
            console.error(e);
            alert("Error submitting feedback");
        }
    };

    return (
        <div style={{ marginTop: "10px", padding: "14px", borderRadius: "12px", border: `1px solid ${color}44`, background: bg }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>{icon}</span>
                    <span style={{ fontWeight: "bold", fontSize: "14px", color }}>FRAUD ANALYSIS — {result.status}</span>
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Confidence: {result.confidence}</span>
            </div>

            {result.modelMetadata?.used && (
                <div style={{ marginBottom: "12px", padding: "8px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "6px", border: "1px solid rgba(59, 130, 246, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "14px" }}>🧠</span>
                        <span style={{ fontSize: "10px", color: "#60a5fa", fontWeight: "bold", textTransform: "uppercase" as const }}>Model Confidence</span>
                    </div>
                    <div style={{ textAlign: "right", lineHeight: "1.2" }}>
                        <div style={{ fontSize: "11px", color: "#eff6ff", fontWeight: "bold" }}>{result.modelMetadata.confidence}</div>
                        <div style={{ fontSize: "9px", color: "#93c5fd" }}>{result.modelMetadata.source}</div>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" as const }}>Risk Score</span>
                <div style={{ flex: 1, height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${result.riskScore}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "bold", color, minWidth: "36px", textAlign: "right" as const }}>{result.riskScore}%</span>
            </div>
            {result.fraudSignals && result.fraudSignals.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" as const, marginBottom: "6px", fontWeight: "bold" }}>Fraud Signals</div>
                    {result.fraudSignals.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", padding: "3px 0", fontSize: "12px", color: "#e2e8f0" }}>
                            <span style={{ color, flexShrink: 0 }}>•</span>
                            <span>{typeof s === 'string' ? s : `${s.type}: ${s.description}`}</span>
                        </div>
                    ))}
                </div>
            )}

            {result.visualForensics && (
                <div style={{ marginBottom: "10px", padding: "10px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "8px", border: "1px solid #1e293b" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" as const, marginBottom: "6px", fontWeight: "bold" }}>Visual Forensics</div>

                    {/* Signature */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span style={{ color: "#94a3b8" }}>Signature:</span>
                        <span style={{ color: result.visualForensics.signature?.present ? (result.visualForensics.signature.forgeryRisk === "Low" ? "#10b981" : "#f59e0b") : "#ef4444", fontWeight: "bold" }}>
                            {result.visualForensics.signature?.present
                                ? `${result.visualForensics.signature.quality} (${result.visualForensics.signature.forgeryRisk})`
                                : "MISSING"}
                        </span>
                    </div>

                    {/* QR Code */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span style={{ color: "#94a3b8" }}>QR Validation:</span>
                        <span style={{ color: result.visualForensics.qr?.valid ? "#10b981" : (result.visualForensics.qr?.found ? "#ef4444" : "#64748b"), fontWeight: "bold" }}>
                            {result.visualForensics.qr?.valid ? "VALID" : (result.visualForensics.qr?.found ? "INVALID" : "NONE")}
                        </span>
                    </div>

                    {/* Tampering */}
                    {result.visualForensics.tampering?.isTampered && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                            <span style={{ color: "#94a3b8" }}>Integrity:</span>
                            <span style={{ color: "#ef4444", fontWeight: "bold" }}>TAMPERING DETECTED</span>
                        </div>
                    )}
                </div>
            )}

            {(ef.invoiceNumber || ef.amount || ef.gstNumber || ef.date) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", padding: "10px", background: "#0a0f1e", borderRadius: "8px", fontSize: "11px" }}>
                    {ef.invoiceNumber && <div><span style={{ color: "#64748b" }}>Invoice: </span><span style={{ color: "#e2e8f0" }}>{ef.invoiceNumber}</span></div>}
                    {ef.amount && <div><span style={{ color: "#64748b" }}>Amount: </span><span style={{ color: "#e2e8f0" }}>₹{ef.amount.toLocaleString("en-IN")}</span></div>}
                    {ef.gstNumber && <div><span style={{ color: "#64748b" }}>GST: </span><span style={{ color: "#e2e8f0" }}>{ef.gstNumber}</span></div>}
                    {ef.date && <div><span style={{ color: "#64748b" }}>Date: </span><span style={{ color: "#e2e8f0" }}>{ef.date}</span></div>}
                    {ef.vendorName && <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Vendor: </span><span style={{ color: "#e2e8f0" }}>{ef.vendorName}</span></div>}
                </div>
            )}
            {result.message && <div style={{ marginTop: "8px", fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>{result.message}</div>}

            <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "flex-end" }}>
                {!reporting ? (
                    <button onClick={() => setReporting(true)} style={{ background: "none", border: "none", color: "#64748b", fontSize: "10px", cursor: "pointer", textDecoration: "underline" }}>Report Issue</button>
                ) : (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>Mark as:</span>
                        <button onClick={() => handleReport("SAFE")} style={{ padding: "4px 8px", background: "#059669", color: "white", borderRadius: "4px", fontSize: "10px", border: "none", cursor: "pointer" }}>SAFE</button>
                        <button onClick={() => handleReport("FRAUD")} style={{ padding: "4px 8px", background: "#dc2626", color: "white", borderRadius: "4px", fontSize: "10px", border: "none", cursor: "pointer" }}>FRAUD</button>
                        <button onClick={() => setReporting(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer" }}>×</button>
                    </div>
                )}
            </div>
        </div>
    );
}
const S: { [key: string]: React.CSSProperties } = {
    page: { height: "100vh", background: "#0a0f1e", color: "white", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" },
    center: { height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0f1e", color: "white", gap: "20px" },
    pulseRing: { width: "60px", height: "60px", borderRadius: "50%", border: "3px solid #3b82f6", animation: "pulseRing 1.5s infinite" },
    topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 24px", background: "#111827", borderBottom: "1px solid #1e293b", flexShrink: 0 },
    topTitle: { fontSize: "14px", fontWeight: "bold", letterSpacing: "0.05em", background: "linear-gradient(90deg, #f8fafc, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    backSmall: { padding: "6px 14px", borderRadius: "6px", border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "12px" },
    primaryBtn: { padding: "14px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", color: "white", fontWeight: "bold", cursor: "pointer", fontSize: "14px", letterSpacing: "0.05em" },
    outlineBtn: { padding: "12px", borderRadius: "8px", border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontWeight: "bold", fontSize: "12px" },
    scrollCol: { background: "#0a0f1e", padding: "14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" },
    aiGrid: { flex: 1, display: "grid", gridTemplateColumns: "250px 1fr 260px", gap: "2px", background: "#1e293b", overflow: "hidden" },
    toolBtn: { width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", marginBottom: "6px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white", cursor: "pointer", textAlign: "left" as const },
    th: { textAlign: "left" as const, padding: "8px 6px", borderBottom: "1px solid #334155", fontSize: "10px", textTransform: "uppercase" as const },
    td: { padding: "8px 6px", color: "#e2e8f0" },
};

function EvidenceArchive({ vendor, api }: { vendor: any; api: string }) {
    const [activeTab, setActiveTab] = useState<'fraud' | 'verified'>('fraud');
    const [evidence, setEvidence] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);

    useEffect(() => {
        if (vendor?.id && api) {
            fetch(`${api}/evidence/${activeTab}/${vendor.id}`)
                .then(r => r.json())
                .then(data => setEvidence(Array.isArray(data) ? data : []))
                .catch(e => console.error(e));
        }
    }, [vendor?.id, activeTab, api]);

    return (
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", background: "#0f172a", borderRadius: "12px", border: "1px solid #1e293b", overflow: "hidden" }}>
            <div style={{ padding: "12px", borderBottom: "1px solid #1e293b", display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#94a3b8" }}>EVIDENCE ARCHIVE</span>
                <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => setActiveTab('fraud')} style={{ padding: "4px 8px", background: activeTab === 'fraud' ? "rgba(239,68,68,0.1)" : "transparent", color: activeTab === 'fraud' ? "#ef4444" : "#64748b", border: activeTab === 'fraud' ? "1px solid #ef4444" : "1px solid #334155", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>FRAUD</button>
                    <button onClick={() => setActiveTab('verified')} style={{ padding: "4px 8px", background: activeTab === 'verified' ? "rgba(16,185,129,0.1)" : "transparent", color: activeTab === 'verified' ? "#10b981" : "#64748b", border: activeTab === 'verified' ? "1px solid #10b981" : "1px solid #334155", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>VERIFIED</button>
                </div>
            </div>

            <div style={{ maxHeight: "200px", overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {evidence.length === 0 ? <div style={{ color: "#475569", fontSize: "11px", textAlign: "center", padding: "10px" }}>No {activeTab} evidence</div> :
                    evidence.map((ev, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "#1e293b", borderRadius: "8px", border: `1px solid ${activeTab === 'fraud' ? '#ef444444' : '#10b98144'}`, cursor: "pointer" }} onClick={() => setSelected(ev)}>
                            <img src={`${BASE_URL}${ev.imagePath}`} style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px" }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: "bold" }}>Score: {ev.riskScore}%</div>
                                <div style={{ fontSize: "10px", color: "#94a3b8" }}>{new Date(ev.timestamp).toLocaleDateString()}</div>
                            </div>
                            <span style={{ fontSize: "14px" }}>👁️</span>
                        </div>
                    ))
                }
            </div>

            {selected && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }} onClick={(e) => { e.stopPropagation(); setSelected(null); }}>
                    <div style={{ background: "#0a0f1e", padding: "20px", borderRadius: "12px", border: "1px solid #334155", maxWidth: "500px", width: "90%", maxHeight: "90vh", overflowY: "auto", position: "relative" }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelected(null)} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}>×</button>
                        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: activeTab === 'fraud' ? "#ef4444" : "#10b981", textTransform: "uppercase" }}>{activeTab === 'fraud' ? "FRAUD EVIDENCE" : "VERIFIED PROOF"}</h3>
                        <img src={`${BASE_URL}${selected.imagePath}`} style={{ width: "100%", borderRadius: "8px", marginBottom: "16px", border: "1px solid #334155" }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                            <Stat l="Risk Score" v={`${selected.riskScore}%`} c={activeTab === 'fraud' ? "#ef4444" : "#10b981"} />
                            <Stat l="Model Confidence" v={`${selected.confidence}`} />
                            <div style={{ gridColumn: "span 2", background: "#111827", padding: "10px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                                <div style={{ color: "#94a3b8", marginBottom: "4px", fontSize: "10px", textTransform: "uppercase" }}>Signals</div>
                                <div style={{ color: "#e2e8f0" }}>{selected.signals?.join(", ") || "None"}</div>
                            </div>
                            <div style={{ gridColumn: "span 2", color: "#64748b", fontSize: "10px", textAlign: "right" }}>
                                ID: {selected.id} • {new Date(selected.timestamp).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
