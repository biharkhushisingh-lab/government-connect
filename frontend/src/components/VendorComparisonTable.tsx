"use client";

import React from 'react';
import VendorCard from './VendorCard';

interface VendorComparisonTableProps {
    vendors: any[];
    onSelect: (v: any) => void;
    selectedId: string;
    calculateRisk: (v: any) => number;
    lowestBidId?: string;
    projectBudget?: number;
}

export default function VendorComparisonTable({ vendors, onSelect, selectedId, calculateRisk, lowestBidId, projectBudget }: VendorComparisonTableProps) {
    const [search, setSearch] = React.useState('');
    const [sort, setSort] = React.useState('risk');

    const filtered = vendors
        .filter(v => v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.specialization?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sort === 'risk') return calculateRisk(a) - calculateRisk(b);
            if (sort === 'risk-desc') return calculateRisk(b) - calculateRisk(a);
            if (sort === 'completion') return (Number(b.completionRate) || 0) - (Number(a.completionRate) || 0);
            if (sort === 'bid-low') return (Number(a.bidAmount) || 0) - (Number(b.bidAmount) || 0);
            if (sort === 'bid-high') return (Number(b.bidAmount) || 0) - (Number(a.bidAmount) || 0);
            return 0;
        });

    return (
        <div style={styles.container}>
            <div style={styles.topHeader}>
                <h2 style={styles.title}>🏗️ Bidder Pool Audit</h2>
                <div style={styles.countBadge}>{filtered.length} Bidders</div>
            </div>

            <div style={styles.controls}>
                <div style={styles.searchWrapper}>
                    <input
                        type="text"
                        placeholder="Search by name or specialization..."
                        style={styles.search}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    style={styles.sort}
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                >
                    <option value="risk">Lowest Risk</option>
                    <option value="risk-desc">Highest Risk</option>
                    <option value="completion">Best Completion</option>
                    <option value="bid-low">Lowest Bid</option>
                    <option value="bid-high">Highest Bid</option>
                </select>
            </div>

            <div style={styles.list}>
                {filtered.length > 0 ? filtered.map((v, index) => (
                    <VendorCard
                        key={v.id || index}
                        vendor={v}
                        isSelected={v.id === selectedId}
                        onClick={() => onSelect(v)}
                        riskScore={calculateRisk(v)}
                        isLowestBid={v.id === lowestBidId}
                        projectBudget={projectBudget}
                    />
                )) : (
                    <div style={styles.emptyState}>No contractors match your criteria</div>
                )}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    topHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    title: {
        fontSize: '22px',
        fontWeight: 'bold',
        margin: 0,
        background: 'linear-gradient(90deg, #f8fafc 0%, #94a3b8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    countBadge: {
        background: '#1e293b',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#3b82f6',
        fontWeight: 'bold',
        border: '1px solid #334155',
    },
    controls: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
    },
    searchWrapper: {
        flex: 1,
    },
    search: {
        width: '100%',
        padding: '12px 16px',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        color: 'white',
        outline: 'none',
        transition: 'border-color 0.2s',
        fontSize: '14px',
    },
    sort: {
        padding: '0 16px',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        color: 'white',
        cursor: 'pointer',
        outline: 'none',
        fontSize: '14px',
    },
    list: {
        flex: 1,
        overflowY: 'auto',
        paddingRight: '8px',
    },
    emptyState: {
        padding: '40px',
        textAlign: 'center',
        color: '#64748b',
        fontStyle: 'italic',
        background: 'rgba(30, 41, 59, 0.3)',
        borderRadius: '16px',
        border: '1px dashed #334155',
    },
};
