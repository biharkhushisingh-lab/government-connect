/**
 * vendorMemory.js — Enterprise Vendor Memory Service (v2)
 * 
 * Centralized persistent memory for AI fraud investigation.
 * Stores receipts, extracted data, fraud decisions, running totals,
 * and conversation history per vendor per project.
 * 
 * UPGRADES:
 * - Hybrid Scoring: heuristicScore, mlScore, finalRiskScore
 * - Detailed Fraud Signals: type, severity, description
 * - Strict Type Safety: No NaNs, forced Number() casting
 * - Backward Compatibility: Supports legacy fields
 */

const fs = require('fs');
const path = require('path');

const EVIDENCE_FILE = path.resolve(__dirname, '../../data/project_evidence.json');
const CHAT_FILE = path.resolve(__dirname, '../../data/project_chat_history.json');
const DATA_DIR = path.resolve(__dirname, '../../data');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ========================================================================
// LOW-LEVEL I/O
// ========================================================================

function readJSON(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
            return JSON.parse(JSON.stringify(fallback));
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`[MEMORY] Read error ${filePath}:`, err.message);
        return JSON.parse(JSON.stringify(fallback));
    }
}

function writeJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`[MEMORY] Write error ${filePath}:`, err.message);
    }
}

// ========================================================================
// EVIDENCE STORE (receipts + totals)
// ========================================================================

function getEvidenceDB() {
    return readJSON(EVIDENCE_FILE, { projects: {} });
}

function saveEvidenceDB(db) {
    writeJSON(EVIDENCE_FILE, db);
}

/** Ensure project/vendor path exists in DB */
function ensureVendorPath(db, projectId, vendorId) {
    if (!db.projects) db.projects = {};
    if (!db.projects[projectId]) db.projects[projectId] = { vendors: {} };
    if (!db.projects[projectId].vendors[vendorId]) {
        db.projects[projectId].vendors[vendorId] = { receipts: [] };
    }
    return db.projects[projectId].vendors[vendorId];
}

// ========================================================================
// CHAT STORE
// ========================================================================

function getChatDB() {
    return readJSON(CHAT_FILE, {});
}

function saveChatDB(db) {
    writeJSON(CHAT_FILE, db);
}

function ensureChatPath(db, projectId, vendorId) {
    if (!db[projectId]) db[projectId] = {};
    if (!db[projectId][vendorId]) db[projectId][vendorId] = [];
    return db[projectId][vendorId];
}

// ========================================================================
// PUBLIC API
// ========================================================================

/**
 * Add a receipt to vendor memory (called after image analysis).
 * Returns the saved receipt object with its receiptId.
 * Auto-calculates hybrid risk scores if not provided.
 */
function addReceipt(projectId, vendorId, {
    imagePath = '',
    extractedData = {},
    aiRiskScore = 0, // Fallback if no specific scores
    aiDecision = 'REVIEW',
    fraudSignals = [], // Array of { type, severity, description }
    confidence = 'Medium',
    visualForensics = null,
    modelMetadata = null,
    heuristicScore = 0,
    mlScore = 0,
    finalRiskScore = 0,
    scores = {} // New V3 sub-scores
} = {}) {
    const db = getEvidenceDB();
    const vendor = ensureVendorPath(db, projectId, vendorId);

    // Calculate final score if not provided (fallback logic)
    // Formula: (mlScore * 60) + (heuristicScore * 0.4) -> normalized to 100
    // If scores are missing, rely on aiRiskScore
    const calcFinalScore = finalRiskScore > 0 ? finalRiskScore : aiRiskScore;

    const receipt = {
        receiptId: `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        imagePath,
        uploadedAt: new Date().toISOString(),
        extractedData: {
            // Standardizing fields
            invoiceNumber: extractedData.invoiceNumber || extractedData.invoiceNo || null,
            invoiceDate: extractedData.date || null,
            amountRaw: Number(extractedData.amount) || Number(extractedData.amountRaw) || 0, // Strict Number
            vendorGST: extractedData.gstNumber || extractedData.gst || null,
            vendorName: extractedData.vendorName || null,
            currency: "INR",

            // Validation status (persisted)
            qrStatus: extractedData.qrValid === false ? "INVALID" : extractedData.qrValid === true ? "VALID" : "UNKNOWN",
            signatureStatus: extractedData.signatureConfidence === "Low" ? "MISSING" : "PRESENT",
            duplicateInvoice: false // Default, computed later
        },

        // Scoring (Zero default, never NaN)
        scores: {
            financial: Number(scores.financial) || 0,
            structural: Number(scores.structural) || 0,
            visual: Number(scores.visual) || 0,
            behavioral: Number(scores.behavioral) || 0
        },
        heuristicScore: Number(heuristicScore) || 0,
        mlScore: Number(mlScore) || 0,
        finalRiskScore: Number(calcFinalScore) || 0,
        aiRiskScore: Number(calcFinalScore) || 0, // Legacy support

        aiDecision,       // "FLAGGED" | "REVIEW" | "SAFE"
        manualDecision: null, // "SAFE" | "FRAUD" | null
        manualOverride: null, // Legacy support

        fraudSignals: Array.isArray(fraudSignals) ? fraudSignals : [],
        confidence,
        visualForensics: visualForensics || null,
        modelMetadata: modelMetadata || null
    };

    // Check for duplicates in existing receipts
    const isDuplicate = vendor.receipts.some(r =>
        r.extractedData?.invoiceNumber &&
        r.extractedData.invoiceNumber === receipt.extractedData.invoiceNumber
    );
    if (isDuplicate) {
        receipt.extractedData.duplicateInvoice = true;
        receipt.fraudSignals.push({
            type: "DUPLICATE_INVOICE",
            severity: "HIGH",
            description: `Duplicate invoice number detected: ${receipt.extractedData.invoiceNumber}`
        });
        // Bump score for duplicate
        receipt.finalRiskScore = Math.min(100, receipt.finalRiskScore + 25);
        receipt.heuristicScore = Math.min(100, receipt.heuristicScore + 25);
    }

    vendor.receipts.push(receipt);
    saveEvidenceDB(db);

    console.log(`[AUDIT] 💾 MEMORY PERSISTED to disk for ${vendorId}. Total receipts: ${vendor.receipts.length}`);
    console.log(`[AUDIT] 🧾 Receipt saved: ${receipt.receiptId} (Score: ${receipt.finalRiskScore}, ML: ${receipt.mlScore}, Heuristic: ${receipt.heuristicScore})`);
    return receipt;
}

/**
 * Update a receipt's manual decision (SAFE / FRAUD).
 * Recomputes totals implicitly by saving.
 */
function updateReceiptDecision(projectId, vendorId, receiptId, decision) {
    const db = getEvidenceDB();
    const vendor = ensureVendorPath(db, projectId, vendorId);
    const receipt = vendor.receipts.find(r => r.receiptId === receiptId);

    if (receipt) {
        receipt.manualDecision = decision;
        receipt.manualOverride = decision; // Legacy
        // Also update the legacy `markedAs` field
        receipt.markedAs = decision;

        saveEvidenceDB(db);
        console.log(`[MEMORY] Receipt ${receiptId} updated: ${decision}`);
        return receipt;
    }

    console.warn(`[MEMORY] Receipt ${receiptId} not found for ${vendorId}`);
    return null;
}

/**
 * Get computed totals for a vendor's project evidence.
 * STRICT NO-NAN POLICY.
 */
function getComputedTotals(projectId, vendorId) {
    const db = getEvidenceDB();
    const vendor = ensureVendorPath(db, projectId, vendorId);
    const receipts = vendor.receipts || [];

    const total = receipts.length;

    // Effective Decision Logic: Manual > AI
    const getDecision = (r) => r.manualDecision || r.manualOverride || r.markedAs || r.aiDecision;

    const fraudReceipts = receipts.filter(r => ['FRAUD', 'FLAGGED'].includes(getDecision(r)));
    const safeReceipts = receipts.filter(r => getDecision(r) === 'SAFE');
    const reviewReceipts = receipts.filter(r => getDecision(r) === 'REVIEW');

    // Strict Number Casting for Sums
    const getAmount = (r) => {
        const val = r.extractedData?.amountRaw || r.extractedData?.amount || r.amount || 0;
        return isNaN(Number(val)) ? 0 : Number(val);
    };

    const totalClaimed = receipts.reduce((acc, r) => acc + getAmount(r), 0);
    const fraudAmount = fraudReceipts.reduce((acc, r) => acc + getAmount(r), 0);
    const verifiedAmount = safeReceipts.reduce((acc, r) => acc + getAmount(r), 0);

    // Average Risk (0 if no receipts)
    const avgRisk = total > 0 ? Math.round(receipts.reduce((acc, r) => {
        const score = r.finalRiskScore || r.aiRiskScore || r.riskScore || 0;
        return acc + (isNaN(score) ? 0 : score);
    }, 0) / total) : 0;

    const fraudRatio = total > 0 ? (fraudReceipts.length / total) * 100 : 0;
    const projectRiskIndex = total > 0 ? Math.round((avgRisk + fraudRatio) / 2) : 0;

    return {
        totalReceipts: total,
        fraudCount: fraudReceipts.length,
        safeCount: safeReceipts.length,
        reviewCount: reviewReceipts.length,
        totalClaimedAmount: totalClaimed, // New naming
        totalClaimed: totalClaimed,       // Legacy
        fraudAmount,
        verifiedAmount,
        averageRiskScore: avgRisk,        // New naming
        avgRisk: avgRisk,                 // Legacy
        fraudRatio: Math.round(fraudRatio),
        projectRiskIndex,
        confirmedFraudCount: fraudReceipts.length, // New naming
        status: fraudReceipts.length > 0 ? "UNDER REVIEW" : total > 0 ? "ACTIVE" : "PENDING"
    };
}

/**
 * Build the full AI context object for LLM injection.
 */
function buildAIContext(projectId, vendorId) {
    const db = getEvidenceDB();
    const vendor = ensureVendorPath(db, projectId, vendorId);
    const receipts = vendor.receipts || [];
    const totals = getComputedTotals(projectId, vendorId);

    // Build receipt summaries (limit 20 for context window)
    const getDecision = (r) => r.manualDecision || r.manualOverride || r.markedAs || r.aiDecision;

    const receiptSummaries = receipts.slice(-20).map(r => ({
        receiptId: r.receiptId,
        date: r.timestamp || r.uploadedAt,
        invoiceNo: r.extractedData?.invoiceNumber || r.extractedData?.invoiceNo || 'Unknown',
        amount: r.extractedData?.amountRaw || r.extractedData?.amount || 0,
        riskScore: r.finalRiskScore || r.aiRiskScore || 0,
        decision: getDecision(r),
        fraudSignals: (r.fraudSignals || []).map(s => s.description || s).slice(0, 3)
    }));

    return {
        PROJECT_ID: projectId,
        VENDOR_ID: vendorId,
        TOTALS: totals,
        RECEIPTS: receiptSummaries,
        RECEIPT_COUNT: receipts.length,
        LAST_UPDATED: receipts.length > 0 ? receipts[receipts.length - 1].timestamp : null
    };
}

/**
 * Get the full vendor memory object (for frontend initialization).
 */
function getVendorMemory(projectId, vendorId) {
    const db = getEvidenceDB();
    const vendor = ensureVendorPath(db, projectId, vendorId);
    const totals = getComputedTotals(projectId, vendorId);
    const chatDB = getChatDB();
    const chatHistory = ensureChatPath(chatDB, projectId, vendorId);

    return {
        vendorId,
        projectId,
        receipts: vendor.receipts || [],
        totals,
        conversationHistory: chatHistory.slice(-50)
    };
}

/**
 * Save a chat message to persistent history.
 */
function saveChatMessage(projectId, vendorId, message) {
    const db = getChatDB();
    const history = ensureChatPath(db, projectId, vendorId);

    history.push({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        toolName: message.toolName || undefined,
        receiptId: message.receiptId || undefined
    });

    if (history.length > 100) {
        db[projectId][vendorId] = history.slice(-100);
    }

    saveChatDB(db);
    console.log(`[MEMORY] Chat saved: ${message.role} for ${vendorId}`);
}

function getChatHistory(projectId, vendorId) {
    const db = getChatDB();
    return ensureChatPath(db, projectId, vendorId);
}

module.exports = {
    addReceipt,
    updateReceiptDecision,
    getComputedTotals,
    buildAIContext,
    getVendorMemory,
    saveChatMessage,
    getChatHistory
};
