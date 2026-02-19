"use client";
import React, { useState } from "react";

interface CollapsibleSectionProps {
    title: string;
    icon: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
    badgeColor?: string;
}

export default function CollapsibleSection({ title, icon, children, defaultOpen = false, badge, badgeColor = "#3b82f6" }: CollapsibleSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div style={S.section}>
            <button style={S.header} onClick={() => setOpen(!open)}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{icon}</span>
                    <span style={{ fontWeight: "bold", fontSize: "13px" }}>{title}</span>
                    {badge && <span style={{ ...S.badge, background: `${badgeColor}22`, color: badgeColor, borderColor: `${badgeColor}44` }}>{badge}</span>}
                </div>
                <span style={{ color: "#64748b", fontSize: "16px", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </button>
            {open && <div style={S.body}>{children}</div>}
        </div>
    );
}

const S: { [key: string]: React.CSSProperties } = {
    section: { background: "#111827", borderRadius: "12px", border: "1px solid #1e293b", overflow: "hidden", marginBottom: "12px" },
    header: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "transparent", border: "none", color: "white", cursor: "pointer" },
    body: { padding: "0 16px 16px 16px", borderTop: "1px solid #1e293b" },
    badge: { fontSize: "10px", padding: "2px 8px", borderRadius: "10px", border: "1px solid", fontWeight: "bold" },
};
