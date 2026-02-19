"use client";

import React from 'react';

interface RiskRingProps {
    score: number;
    size?: number;
}

export default function RiskRing({ score, size = 60 }: RiskRingProps) {
    const radius = (size / 2) - 5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 80) return "#ef4444";
        if (s >= 50) return "#f59e0b";
        if (s >= 30) return "#facc15";
        return "#10b981";
    };

    const color = getColor(score);

    return (
        <div style={{ ...styles.container, width: size, height: size }}>
            <svg width={size} height={size} style={styles.svg}>
                {/* Background Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#1e293b"
                    strokeWidth="6"
                    fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease' }}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            <div style={{ ...styles.percentage, color }}>
                {score}<span style={{ fontSize: '10px' }}>%</span>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    svg: {
        position: 'absolute',
        top: 0,
        left: 0
    },
    percentage: {
        fontSize: '14px',
        fontWeight: 'bold',
        fontFamily: 'monospace'
    }
};
