"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import RiskRing from './RiskRing';

interface VendorCVPanelProps {
    vendor: any;
    riskScore: number;
}

// ---- FORMATTERS ----
const formatCurrency = (n: number | undefined): string => {
    const val = Number(n) || 0;
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
};

const safeNum = (v: any): number => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

export default function VendorCVPanel({ vendor, riskScore }: VendorCVPanelProps) {
    const router = useRouter();

    if (!vendor) return (
        <div style={styles.empty}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <p style={{ margin: 0 }}>Select a bidder to view full corporate profile</p>
        </div>
    );

    const getRating = (score: number) => {
        if (score >= 80) return { label: "C", color: "#ef4444" };
        if (score >= 50) return { label: "B", color: "#f59e0b" };
        if (score >= 30) return { label: "A", color: "#3b82f6" };
        return { label: "A+", color: "#10b981" };
    };

    const rating = getRating(riskScore);
    const certs: string[] = Array.isArray(vendor.certifications) ? vendor.certifications : [];
    const majorProjects: string[] = Array.isArray(vendor.pastMajorProjects) ? vendor.pastMajorProjects : [];

    return (
        <div style={styles.panel}>
            {/* ============ HEADER ============ */}
            <div style={styles.header}>
                <div style={{ ...styles.ratingCircle, background: rating.color, boxShadow: `0 0 20px ${rating.color}50` }}>
                    {rating.label}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={styles.name}>{vendor.name}</h2>
                    <p style={styles.subtext}>{vendor.specialization} • {vendor.location}</p>
                </div>
                {vendor.creditRating && (
                    <div style={styles.creditBadge}>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>CREDIT</span>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{vendor.creditRating}</span>
                    </div>
                )}
            </div>

            <div style={styles.scrollArea}>
                {/* ============ SECTION 1: COMPANY PROFILE ============ */}
                <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>🏢 Company Profile</h4>
                    <div style={styles.gridTwo}>
                        <Stat label="Experience" value={`${safeNum(vendor.experienceYears)} Years`} />
                        <Stat label="Workforce" value={`${safeNum(vendor.workforceStrength).toLocaleString()} Staff`} />
                        <Stat label="Location" value={vendor.location || 'N/A'} />
                        <Stat label="Specialization" value={vendor.specialization || 'N/A'} />
                    </div>
                </div>

                {/* ============ SECTION 2: PERFORMANCE METRICS ============ */}
                <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>📊 Performance Metrics</h4>
                    <div style={styles.gridThree}>
                        <MetricPill label="Projects" value={safeNum(vendor.projectsCompleted)} />
                        <MetricPill label="Completion" value={`${safeNum(vendor.completionRate)}%`} color={safeNum(vendor.completionRate) >= 90 ? '#10b981' : '#f59e0b'} />
                        <MetricPill label="Delays" value={safeNum(vendor.delayHistory)} color={safeNum(vendor.delayHistory) > 5 ? '#ef4444' : '#10b981'} />
                        <MetricPill label="Fraud Flags" value={safeNum(vendor.fraudFlags)} color={safeNum(vendor.fraudFlags) > 0 ? '#ef4444' : '#10b981'} />
                        <MetricPill label="Financial" value={`${safeNum(vendor.financialScore)}/100`} />
                        <MetricPill label="Safety" value={`${safeNum(vendor.safetyRating)}/100`} color={safeNum(vendor.safetyRating) >= 80 ? '#10b981' : '#f59e0b'} />
                    </div>
                    {safeNum(vendor.litigationHistory) > 0 && (
                        <div style={styles.litigationWarning}>
                            ⚖️ {safeNum(vendor.litigationHistory)} litigation case{safeNum(vendor.litigationHistory) !== 1 ? 's' : ''} on record
                        </div>
                    )}
                </div>

                {/* ============ SECTION 3: FINANCIAL OVERVIEW ============ */}
                <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>💰 Financial Overview</h4>
                    <div style={styles.gridTwo}>
                        <div style={styles.financialCard}>
                            <span style={styles.finLabel}>Bid Amount</span>
                            <span style={styles.finValue}>{formatCurrency(vendor.bidAmount)}</span>
                        </div>
                        <div style={styles.financialCard}>
                            <span style={styles.finLabel}>Annual Turnover</span>
                            <span style={styles.finValue}>{formatCurrency(vendor.annualTurnover)}</span>
                        </div>
                    </div>
                </div>

                {/* ============ SECTION 4: ASSETS & CAPABILITY ============ */}
                <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>🔧 Assets & Capability</h4>
                    {vendor.equipmentAssets && (
                        <p style={styles.equipmentText}>{vendor.equipmentAssets}</p>
                    )}
                    {certs.length > 0 && (
                        <div style={styles.certRow}>
                            {certs.map((c: string, i: number) => (
                                <span key={i} style={styles.certBadge}>{c}</span>
                            ))}
                        </div>
                    )}
                    {majorProjects.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' as const }}>Past Major Projects</span>
                            <ul style={styles.projectList}>
                                {majorProjects.map((p: string, i: number) => (
                                    <li key={i} style={styles.projectItem}>{p}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* ============ SECTION 5: RISK SUMMARY ============ */}
                <div style={styles.riskSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={styles.sectionTitle}>🛡️ AI Risk Audit</h4>
                        <RiskRing score={riskScore} size={60} />
                    </div>
                    <p style={styles.auditLog}>
                        {riskScore < 30
                            ? "Integrity verified. No significant anomalies detected in financial history, project delivery, or litigation records. This contractor demonstrates consistent compliance with quality and safety standards."
                            : riskScore < 60
                                ? "Moderate risk indicators present. Some history of delays and fraud flags detected. Manual verification of recent project outcomes and financial disclosures is recommended before contract award."
                                : "High-risk profile detected. Significant fraud flags, litigation history, and delivery delays present systemic concerns. Full forensic audit recommended before any engagement."
                        }
                    </p>
                </div>
            </div>

            {/* ============ FOOTER ============ */}
            <div style={styles.footer}>
                <button style={styles.btn}>DOWNLOAD FULL DOSSIER</button>
                <button
                    style={styles.selectBtn}
                    onClick={() => router.push(`/government/decision/${vendor.id}`)}
                >
                    🏛️ SELECT BIDDER FOR REVIEW
                </button>
            </div>
        </div>
    );
}

// ---- SUBCOMPONENTS ----

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' as const }}>{value}</span>
        </div>
    );
}

function MetricPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <div style={{
            background: '#0f172a',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            textAlign: 'center' as const,
        }}>
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' as const }}>{label}</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold' as const, color: color || '#f8fafc' }}>{value}</div>
        </div>
    );
}

// ---- STYLES ----
const styles: { [key: string]: React.CSSProperties } = {
    panel: {
        background: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    empty: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontStyle: 'italic',
        textAlign: 'center',
        background: '#1e293b',
        borderRadius: '16px',
        border: '1px dashed #334155',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px 20px 16px 20px',
        borderBottom: '1px solid #334155',
        flexShrink: 0,
    },
    ratingCircle: {
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        flexShrink: 0,
    },
    name: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 'bold',
    },
    subtext: {
        margin: '2px 0 0 0',
        color: '#94a3b8',
        fontSize: '12px',
    },
    creditBadge: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#0f172a',
        padding: '6px 12px',
        borderRadius: '10px',
        border: '1px solid #334155',
        flexShrink: 0,
    },
    scrollArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    section: {
        background: '#0f172a',
        padding: '14px',
        borderRadius: '12px',
        border: '1px solid #1e293b',
    },
    sectionTitle: {
        fontSize: '13px',
        margin: '0 0 12px 0',
        color: '#3b82f6',
        fontWeight: 'bold',
    },
    gridTwo: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
    },
    gridThree: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
    },
    litigationWarning: {
        marginTop: '10px',
        padding: '8px 12px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        fontSize: '12px',
        color: '#fca5a5',
    },
    financialCard: {
        background: '#111827',
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    finLabel: {
        fontSize: '10px',
        color: '#64748b',
        textTransform: 'uppercase' as const,
    },
    finValue: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#10b981',
    },
    equipmentText: {
        fontSize: '13px',
        color: '#94a3b8',
        lineHeight: 1.5,
        margin: '0 0 10px 0',
    },
    certRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '8px',
    },
    certBadge: {
        background: 'rgba(59, 130, 246, 0.15)',
        color: '#93c5fd',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 'bold',
        border: '1px solid rgba(59, 130, 246, 0.3)',
    },
    projectList: {
        margin: '6px 0 0 0',
        padding: '0 0 0 16px',
        listStyleType: 'none',
    },
    projectItem: {
        fontSize: '13px',
        color: '#cbd5e1',
        padding: '4px 0',
        borderBottom: '1px solid #1e293b',
        position: 'relative',
    },
    riskSection: {
        background: '#0f172a',
        padding: '14px',
        borderRadius: '12px',
        border: '1px solid #1e293b',
    },
    auditLog: {
        fontSize: '12px',
        color: '#94a3b8',
        lineHeight: 1.6,
        margin: 0,
    },
    footer: {
        padding: '12px 20px',
        borderTop: '1px solid #334155',
        flexShrink: 0,
    },
    btn: {
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '12px',
        letterSpacing: '0.05em',
        transition: 'opacity 0.2s',
    },
    selectBtn: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '2px solid #10b981',
        background: 'rgba(16, 185, 129, 0.1)',
        color: '#10b981',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '12px',
        letterSpacing: '0.05em',
        transition: 'all 0.3s ease',
        marginTop: '8px',
    },
};
