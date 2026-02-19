/**
 * Fraud Engine V3 - Defensive Government Auditing System
 * Implements 4-Pillar Architecture + Hard Rule Overrides
 */

function validateFinancials(extracted) {
    const subtotal = Number(extracted.subtotal) || 0;
    const cgst = Number(extracted.cgst) || 0;
    const sgst = Number(extracted.sgst) || 0;
    const grandTotal = Number(extracted.grandTotal) || 0;
    const lineItemsSum = Number(extracted.lineItemsSum) || subtotal;

    let score = 0; // 0 is perfect, 100 is bad
    const signals = [];

    // 1. Line Item Match
    if (Math.abs(lineItemsSum - subtotal) > 1.0) {
        score += 30;
        signals.push({ type: "MATH_MISMATCH", severity: "HIGH", description: `Line items total (${lineItemsSum}) != Subtotal (${subtotal})` });
    }

    // 2. Tax Validation (Strict 9%)
    const expectedTax = subtotal * 0.09;
    if (Math.abs(cgst - expectedTax) > 1.0) {
        score += 25;
        signals.push({ type: "TAX_MISMATCH", severity: "MEDIUM", description: "CGST is not 9% of subtotal" });
    }
    if (Math.abs(sgst - expectedTax) > 1.0) {
        score += 25;
        signals.push({ type: "TAX_MISMATCH", severity: "MEDIUM", description: "SGST is not 9% of subtotal" });
    }

    // 3. Grand Total Match
    const calculatedTotal = subtotal + cgst + sgst;
    if (Math.abs(grandTotal - calculatedTotal) > 1.0) {
        score += 40; // Hard Rule trigger
        signals.push({ type: "TOTAL_MISMATCH", severity: "CRITICAL", description: `Grand Total (${grandTotal}) violates sum check` });
    }

    // 4. Inflation
    if (lineItemsSum > 0 && (grandTotal / lineItemsSum) > 1.25) {
        score += 30;
        signals.push({ type: "INFLATION_DETECTED", severity: "HIGH", description: "Inflation ratio > 1.25" });
    }

    return { score: Math.min(100, score), signals };
}

function getStructuralScore(extracted) {
    let score = 0;
    const signals = [];
    const gstPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;

    if (!extracted.vendorGST) {
        score = 100;
        signals.push({ type: "MISSING_GST", severity: "CRITICAL", description: "GST Number Missing" });
    } else if (!gstPattern.test(extracted.vendorGST)) {
        score = 80;
        signals.push({ type: "INVALID_GST_FORMAT", severity: "HIGH", description: "GST Pattern Invalid" });
    }

    if (extracted.duplicateInvoice) {
        score = 100;
        signals.push({ type: "DUPLICATE_INVOICE", severity: "CRITICAL", description: "Duplicate Invoice ID" });
    }

    return { score: Math.min(100, score), signals };
}

function getVisualScore(extracted) {
    let score = 0;
    const signals = [];

    // Mock Visual Forensics (would come from CNN in production)
    if (extracted.qrValid === false) {
        score += 50;
        signals.push({ type: "INVALID_QR", severity: "MEDIUM", description: "QR Code Readability Fail" });
    }

    // Simulate Overlay Detection if confidence is low
    if (extracted.signatureConfidence === "Low") {
        score += 40;
        signals.push({ type: "DIGITAL_OVERLAY", severity: "HIGH", description: "Potential digital signature overlay" });
    }

    return { score: Math.min(100, score), signals };
}

function getBehavioralScore(extracted, vendorContext) {
    let score = 0;
    const signals = [];
    const amount = Number(extracted.grandTotal) || 0;

    // High Value Check
    if (amount > 5000000) { // 50 Lakhs
        score += 40;
        signals.push({ type: "HIGH_VALUE_TRANSACTION", severity: "MEDIUM", description: "Amount > 50L INR" });
    }

    // Vendor History Check
    if (vendorContext?.fraudFlags > 0) {
        score += (vendorContext.fraudFlags * 20);
        signals.push({ type: "VENDOR_RISK", severity: "HIGH", description: `Vendor has ${vendorContext.fraudFlags} flags` });
    }

    return { score: Math.min(100, score), signals };
}

function analyzeV3(extracted, vendorContext) {
    // 1. Calculate 4 Pillars
    const fin = validateFinancials(extracted);
    const str = getStructuralScore(extracted);
    const vis = getVisualScore(extracted);
    const beh = getBehavioralScore(extracted, vendorContext);

    // 2. Weighted Formula (Part 3)
    // 0.35 * Financial + 0.25 * Structural + 0.20 * Visual + 0.20 * Behavioral
    const weightedScore = (fin.score * 0.35) + (str.score * 0.25) + (vis.score * 0.20) + (beh.score * 0.20);

    // 3. Hard Rule Overrides (Part 4)
    let hardPenalty = 0;
    const allSignals = [...fin.signals, ...str.signals, ...vis.signals, ...beh.signals];

    if (allSignals.some(s => s.type === 'MISSING_GST')) hardPenalty = Math.max(hardPenalty, 40);
    if (allSignals.some(s => s.type === 'DUPLICATE_INVOICE')) hardPenalty = Math.max(hardPenalty, 35);
    if (allSignals.some(s => s.type === 'TOTAL_MISMATCH')) hardPenalty = Math.max(hardPenalty, 30);
    if (allSignals.some(s => s.type === 'INVALID_GST_FORMAT')) hardPenalty = Math.max(hardPenalty, 25);
    if (allSignals.some(s => s.type === 'INVALID_QR')) hardPenalty = Math.max(hardPenalty, 20);
    if (allSignals.some(s => s.type === 'DIGITAL_OVERLAY')) hardPenalty = Math.max(hardPenalty, 20);

    // Final Score Logic: Take Max of Weighted or Hard Penalty (to stay defensive)
    // User said: "Hard rules (instant high risk) -> +25 risk".
    // I previously interpreted as additive. Here I'll interpret as a "Floor" or override.
    // If weighted is 10 but Hard Rule is +40, result should reflect that risk.
    // I will ADD hard penalties to the weighted score to strictly follow "defensive".

    // Actually, "Total +25 risk" sounds additive.
    // I will add them.
    let finalScore = weightedScore + hardPenalty;
    finalScore = Math.min(100, Math.round(finalScore));

    return {
        scores: {
            financial: fin.score,
            structural: str.score,
            visual: vis.score,
            behavioral: beh.score
        },
        finalRiskScore: finalScore,
        fraudSignals: allSignals
    };
}

module.exports = { analyzeV3, validateFinancials };
