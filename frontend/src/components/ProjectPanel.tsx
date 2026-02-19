"use client";

import React from 'react';

interface ProjectPanelProps {
    project: any;
    bestVendorName?: string;
}

export default function ProjectPanel({ project, bestVendorName }: ProjectPanelProps) {
    return (
        <div style={styles.panel}>
            <h2 style={styles.title}>📁 Project Overview</h2>

            <div style={styles.section}>
                <label style={styles.label}>Project Title</label>
                <p style={styles.value}>{project.name}</p>
            </div>

            <div style={styles.row}>
                <div style={styles.section}>
                    <label style={styles.label}>Budget</label>
                    <p style={{ ...styles.value, color: '#10b981' }}>{project.budget}</p>
                </div>
                <div style={styles.section}>
                    <label style={styles.label}>Deadline</label>
                    <p style={styles.value}>{project.deadline}</p>
                </div>
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Location</label>
                <p style={styles.value}>{project.location}</p>
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Risk Status</label>
                <div style={styles.riskBadge}>SECURE AUDIT ACTIVE</div>
            </div>

            {bestVendorName && (
                <div style={styles.recommendation}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#93c5fd' }}>⭐ AI BEST MATCH</h4>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{bestVendorName}</p>
                </div>
            )}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    panel: {
        padding: '24px',
        background: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    title: {
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '10px',
        borderBottom: '1px solid #334155',
        paddingBottom: '10px'
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    label: {
        fontSize: '11px',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    value: {
        fontSize: '16px',
        fontWeight: '600',
        margin: 0
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between'
    },
    riskBadge: {
        background: 'rgba(16, 185, 129, 0.2)',
        color: '#10b981',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold',
        textAlign: 'center',
        border: '1px solid rgba(16, 185, 129, 0.3)'
    },
    recommendation: {
        marginTop: 'auto',
        padding: '16px',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
        borderRadius: '12px',
        border: '1px solid #3b82f6'
    }
};
