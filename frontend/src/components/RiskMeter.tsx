"use client";

import React from 'react';

interface RiskMeterProps {
    score: number;
}

export default function RiskMeter({ score }: RiskMeterProps) {
    const getColor = (s: number) => {
        if (s >= 80) return "#ef4444";
        if (s >= 50) return "#f59e0b";
        if (s >= 30) return "#facc15";
        return "#10b981";
    };

    return (
        <div style={styles.container}>
            <div style={styles.labelRow}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Risk Index</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: getColor(score) }}>{score}%</span>
            </div>
            <div style={styles.track}>
                <div style={{
                    ...styles.fill,
                    width: `${score}%`,
                    background: getColor(score)
                }} />
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        width: '100%',
        margin: '10px 0'
    },
    labelRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px'
    },
    track: {
        height: '8px',
        background: '#334155',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    fill: {
        height: '100%',
        borderRadius: '4px',
        transition: 'width 0.5s ease-out'
    }
};
