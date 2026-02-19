"use client";

import React from 'react';

interface LeaderboardDrawerProps {
    vendors: any[];
    isOpen: boolean;
    onToggle: () => void;
    getTier: (score: number) => string;
}

export default function LeaderboardDrawer({ vendors, isOpen, onToggle, getTier }: LeaderboardDrawerProps) {
    const sorted = [...vendors].sort((a, b) => a.riskScore - b.riskScore);

    return (
        <div style={{
            ...styles.drawer,
            height: isOpen ? '50vh' : '0',
            padding: isOpen ? '24px' : '0'
        }}>
            <div style={styles.header}>
                <h2 style={{ margin: 0, display: isOpen ? 'block' : 'none' }}>🏆 Integrity Leaderboard</h2>
                <button onClick={onToggle} style={styles.closeBtn}>
                    {isOpen ? '✕' : '▲ VIEW RANKINGS'}
                </button>
            </div>

            {isOpen && (
                <div style={styles.list}>
                    <div style={styles.rowHeader}>
                        <span style={{ width: '50px' }}>Rank</span>
                        <span style={{ flex: 2 }}>Contractor</span>
                        <span style={{ flex: 1 }}>Risk</span>
                        <span style={{ flex: 1 }}>Tier</span>
                    </div>
                    {sorted.map((v, i) => (
                        <div key={v.id} style={{
                            ...styles.row,
                            background: i === 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            borderLeft: i === 0 ? '4px solid #3b82f6' : 'none'
                        }}>
                            <span style={styles.rank}>#{i + 1}</span>
                            <span style={styles.name}>{v.name} {i === 0 && '👑'}</span>
                            <span style={styles.score}>{v.riskScore}%</span>
                            <span style={{
                                ...styles.tier,
                                color: v.riskScore < 30 ? '#10b981' : v.riskScore < 60 ? '#facc15' : '#ef4444'
                            }}>{getTier(v.riskScore)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    drawer: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        background: '#111827',
        zIndex: 100,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        borderTop: '2px solid #3b82f6',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.7)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    closeBtn: {
        background: '#3b82f6',
        border: 'none',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        position: 'absolute',
        top: '-40px',
        left: '50%',
        transform: 'translateX(-50%)',
        boxShadow: '0 -2px 10px rgba(59, 130, 246, 0.3)'
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '40vh',
        overflowY: 'auto'
    },
    rowHeader: {
        display: 'flex',
        padding: '0 12px 10px 12px',
        borderBottom: '1px solid #334155',
        fontSize: '12px',
        color: '#94a3b8',
        textTransform: 'uppercase'
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        borderRadius: '8px',
        borderBottom: '1px solid rgba(51, 65, 85, 0.3)'
    },
    rank: {
        width: '50px',
        fontWeight: 'bold',
        color: '#3b82f6'
    },
    name: {
        flex: 2,
        fontWeight: '600'
    },
    score: {
        flex: 1
    },
    tier: {
        flex: 1,
        fontSize: '12px',
        fontWeight: 'bold'
    }
};
