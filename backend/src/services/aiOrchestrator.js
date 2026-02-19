const path = require('path');
const fs = require('fs');

// INTERNAL SERVICES
const vendorMemory = require('./vendorMemory');
const trainingPipeline = require('../ml/trainingPipeline');
const heuristicsEngine = require('./heuristicsEngine');

// AI SETTINGS
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

// ============================================================
// SYSTEM PROMPTS (V3 Defensive Government Mode)
// ============================================================
const BASE_SYSTEM_PROMPT = `
You are a government-grade forensic audit AI.
You must analyze receipts strictly based on extracted data.
Never assume.
Always verify totals mathematically.
Always validate GST structure.
Always check consistency.
If evidence of inconsistency exists, explain clearly.
If insufficient evidence exists, classify as REVIEW.
Do not hallucinate.
Do not ignore extracted receipt data.
Always reference receipt ID and extracted fields.

OUTPUT FORMAT (JSON):
{
  "decision": "SAFE | REVIEW | FRAUD",
  "confidence": "High | Medium | Low",
  "ruleScore": <number>,
  "mlScore": <number>,
  "finalScore": <number>,
  "financialValidation": { "taxMatch": boolean, "totalMatch": boolean },
  "fraudSignals": [ "List of specific violations..." ],
  "extractedData": { ... },
  "memoryContext": {
    "totalReceipts": <number>,
    "fraudCount": <number>,
    "verifiedCount": <number>,
    "totalClaimed": <number>,
    "fraudAmount": <number>
  }
}
`;

/**
 * Main Entry Point: Process a Receipt Image (V3 Engine)
 */
async function processReceipt({ vendorId, projectId, imageBase64, vendorContext }) {
    console.log(`[ORCHESTRATOR] V3 Defensive Processing for ${vendorId}...`);

    // A. Vision AI (Extract Raw Data)
    let aiResult = await callVisionAI(imageBase64, vendorContext);

    // B. Heuristic V3 Analysis (4 Pillars)
    const v3Result = heuristicsEngine.analyzeV3(aiResult.extractedFields, vendorContext);
    const { scores, finalRiskScore, fraudSignals } = v3Result;

    console.log(`[AUDIT] 🛡️ V3 SCORING:`);
    console.log(`[AUDIT] - Financial (35%): ${scores.financial}`);
    console.log(`[AUDIT] - Structural (25%): ${scores.structural}`);
    console.log(`[AUDIT] - Visual (20%): ${scores.visual}`);
    console.log(`[AUDIT] - Behavioral (20%): ${scores.behavioral}`);

    // C. ML Analysis (Probabilistic Support)
    // We still use ML as a secondary confirmation, but V3 relies heavily on the Deterministic Engine.
    // We map V3 features to the ML pipeline for recording purposes.
    const mlResult = trainingPipeline.predictRiskScore({
        financialScore: (100 - scores.financial) / 100, // Normalized
        taxMismatch: scores.financial > 0,
        duplicateFlag: fraudSignals.some(s => s.type === 'DUPLICATE_INVOICE'),
        overlayScore: scores.visual > 0 ? 0.8 : 0.0,
        inflationRatio: 1.0, // Already checked in Financial
        qrValid: scores.visual < 50
    });
    console.log(`[AUDIT] 🤖 ML Probability: ${mlResult.mlScore}%`);

    // D. Final Decision Logic
    // Logic: V3 Engine Score is the authority. ML is advisory.
    // If V3 Score > 75 -> FRAUD
    // If V3 Score > 50 -> HIGH RISK
    // If V3 Score > 20 -> REVIEW
    // Else SAFE

    let status = 'SAFE';
    if (finalRiskScore > 20) status = 'REVIEW';
    if (finalRiskScore > 50) status = 'FLAGGED'; // High Risk
    if (finalRiskScore > 75) status = 'FRAUD';

    // E. Persist to Enterprise Memory
    const savedReceipt = vendorMemory.addReceipt(projectId, vendorId, {
        imagePath: '/receipt-processed',
        extractedData: aiResult.extractedFields,

        // V3 Scores
        scores: scores,
        heuristicScore: finalRiskScore, // V3 is the new heuristic
        mlScore: mlResult.mlScore,
        finalRiskScore: finalRiskScore,

        aiDecision: status,
        fraudSignals: [...(aiResult.fraudSignals || []), ...fraudSignals],

        confidence: finalRiskScore > 50 ? 'High' : 'Medium',
        visualForensics: aiResult.visualForensics,
        modelMetadata: {
            source: 'FraudEngineV3',
            architecture: '4-Pillar-Defensive',
            version: '3.0'
        }
    });

    console.log(`[AUDIT] 💾 V3 Memory Persisted. Receipt: ${savedReceipt.receiptId}`);

    return {
        result: {
            status,
            riskScore: finalRiskScore,
            fraudSignals: savedReceipt.fraudSignals,
            extractedFields: savedReceipt.extractedData,
            confidence: 'High',
            analysisSummary: `Defensive Analysis: Risk ${finalRiskScore}/100. Breakdown: Fin(${scores.financial}) Str(${scores.structural}) Vis(${scores.visual}) Beh(${scores.behavioral}).`
        },
        receiptId: savedReceipt.receiptId
    };
}

async function generateChatResponse({ vendorId, projectId, message, toolName, vendorContext }) {
    // 1. Force Load Memory to avoid "0 receipts" hallucination
    // We re-read from disk to be absolutely sure.
    const db = vendorMemory.getEvidenceDB();
    const vendorData = db.projects?.[projectId]?.vendors?.[vendorId] || { receipts: [] };
    const computed = vendorMemory.getComputedTotals(vendorData);

    // 2. Build Context
    const aiContext = {
        totalReceipts: vendorData.receipts.length,
        fraudCount: computed.fraudCount,
        verifiedCount: computed.verifiedCount,
        totalClaimed: computed.totalClaimedAmount,
        fraudAmount: computed.totalFraudAmount,
        runningRiskAvg: computed.averageRiskScore,
        allInvoiceIds: vendorData.receipts.map(r => r.extractedData?.invoiceNumber).filter(Boolean)
    };

    const systemPrompt = `
${BASE_SYSTEM_PROMPT}

═══════════════════════════════════════
LIVE MEMORY CONTEXT (TRUST THIS):
- Total Receipts Uploaded: ${aiContext.totalReceipts}
- Total Claimed Amount: ₹${aiContext.totalClaimed}
- Fraud Count: ${aiContext.fraudCount}
- Verified Count: ${aiContext.verifiedCount}
- Last Receipt: ${vendorData.receipts.length > 0 ? JSON.stringify(vendorData.receipts[vendorData.receipts.length - 1].extractedData) : "None"}
═══════════════════════════════════════

USER QUERY: "${message}"

INSTRUCTIONS:
- If the user asks about receipts, use the "Total Receipts Uploaded" count above.
- Never say "0 receipts" if Total Receipts > 0.
- Reference invoice numbers from the list: ${aiContext.allInvoiceIds.join(", ")}.
`;

    // 3. Call LLM
    if (!OPENROUTER_KEY) {
        return { result: { analysisSummary: "AI Key Missing" }, raw: "System Error: No API Key", memorySnapshot: aiContext };
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content || "AI Error";

        // Attempt to parse JSON
        let result = {};
        try {
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                result = { analysisSummary: aiText };
            }
        } catch (e) {
            result = { analysisSummary: aiText };
        }

        return { result, raw: aiText, memorySnapshot: aiContext };

    } catch (err) {
        console.error("AI Chat Error:", err);
        return { result: { error: err.message }, raw: "Error connecting to AI", memorySnapshot: aiContext };
    }
}

// Mock Vision AI (Reused but with more fields extracted if possible)
async function callVisionAI(imageBase64, vendorContext) {
    if (OPENROUTER_KEY) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "STRICT OCR EXTRACTION. Return JSON: { invoiceNumber, date, amount, vendorName, gstNumber, subtotal, cgst, sgst, grandTotal, lineItemsSum }. Check if QR is valid." },
                                { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
                            ]
                        }
                    ]
                })
            });
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || "{}";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return { extractedFields: JSON.parse(jsonMatch[0]), confidence: "High" };
        } catch (e) {
            console.error("Vision AI failed", e);
        }
    }

    return {
        extractedFields: { amount: 0, invoiceNumber: "UNKNOWN", qrValid: true },
        confidence: "Low"
    };
}

module.exports = { processReceipt, generateChatResponse };
