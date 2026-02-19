"use client";

import React from 'react';
import RiskRing from './RiskRing';

interface VendorCardProps {
    vendor: any;
    isSelected: boolean;
    onClick: () => void;
    riskScore: number;
    isLowestBid?: boolean;
    projectBudget?: number;
}

const formatBid = (n: number | undefined): string => {
    const val = Number(n) || 0;
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
    return `₹${val.toLocaleString("en-IN")}`;
};

export default function VendorCard({ vendor, isSelected, onClick, riskScore, isLowestBid, projectBudget }: VendorCardProps) {
    const getLevel = (score: number) => {
        if (score >= 80) return { color: '#ef4444', label: 'HIGH RISK' };
        if (score >= 50) return { color: '#f59e0b', label: 'MODERATE' };
        return { color: '#10b981', label: 'SAFE' };
    };

    const level = getLevel(riskScore);
    const bidVal = Number(vendor.bidAmount) || 0;
    const budgetDiff = projectBudget && bidVal > 0
        ? (((bidVal - projectBudget) / projectBudget) * 100).toFixed(1)
        : null;

    return (
        <div
            style={{
                ...styles.card,
                borderColor: isSelected ? '#3b82f6' : '#334155',
                background: isSelected ? 'rgba(59, 130, 246, 0.1)' : '#111827',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = '#475569';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#334155';
                }
            }}
        >
            <div style={styles.cardContent}>
                <div style={styles.info}>
                    <div style={styles.header}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={styles.name}>{vendor.name}</h3>
                            {isLowestBid && (
                                <span style={styles.lowestBidBadge}>LOWEST BID</span>
                            )}
                        </div>
                        <span style={{ color: level.color, fontSize: '10px', fontWeight: 'bold' }}>
                            {level.label}
                        </span>
                    </div>

                    <div style={styles.statsRow}>
                        <div style={styles.stat}>
                            <span style={styles.statLabel}>Exp</span>
                            <span style={styles.statValue}>{vendor.experienceYears ?? 0}y</span>
                        </div>
                        <div style={styles.stat}>
                            <span style={styles.statLabel}>Flags</span>
                            <span style={{ ...styles.statValue, color: (vendor.fraudFlags ?? 0) > 0 ? '#ef4444' : '#10b981' }}>
                                {vendor.fraudFlags ?? 0}
                            </span>
                        </div>
                        {bidVal > 0 && (
                            <div style={styles.stat}>
                                <span style={styles.statLabel}>Bid</span>
                                <span style={{ ...styles.statValue, color: isLowestBid ? '#10b981' : '#f8fafc' }}>
                                    {formatBid(vendor.bidAmount ?? 0)}
                                </span>
                            </div>
                        )}
                        {budgetDiff !== null && (
                            <div style={styles.stat}>
                                <span style={styles.statLabel}>vs Budget</span>
                                <span style={{
                                    ...styles.statValue,
                                    fontSize: '11px',
                                    color: Number(budgetDiff) <= 0 ? '#10b981' : '#f59e0b'
                                }}>
                                    {Number(budgetDiff) > 0 ? '+' : ''}{budgetDiff}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.ringWrapper}>
                    <RiskRing score={riskScore} size={48} />
                </div>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        padding: '14px 16px',
        borderRadius: '14px',
        border: '2px solid',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        marginBottom: '10px',
        position: 'relative',
        overflow: 'hidden',
    },
    cardContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '8px',
    },
    name: {
        margin: 0,
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#f8fafc',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    lowestBidBadge: {
        background: 'rgba(16, 185, 129, 0.2)',
        color: '#10b981',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: 'bold',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    statsRow: {
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap',
    },
    stat: {
        display: 'flex',
        flexDirection: 'column',
    },
    statLabel: {
        fontSize: '9px',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    statValue: {
        fontSize: '13px',
        fontWeight: 'bold',
    },
    ringWrapper: {
        marginLeft: '12px',
        flexShrink: 0,
    },
};
