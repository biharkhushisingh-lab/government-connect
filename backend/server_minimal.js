// ============================================================
// HARDENED AUDIT SERVER — Zero-Trust Data Flow
// ============================================================
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

// Increase payload limit for Base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ---- REQUIRED FIELDS FOR EACH VENDOR ----
const REQUIRED_NUMERIC_FIELDS = [
    "experienceYears",
    "projectsCompleted",
    "completionRate",
    "fraudFlags",
    "delayHistory",
    "financialScore",
];
const REQUIRED_STRING_FIELDS = ["id", "name", "specialization", "location"];

// ---- STARTUP VALIDATION (FAIL-FAST) ----
const DATA_FILE = path.resolve(__dirname, "mock-data", "vendors_full.json");
console.log(`[STARTUP] Data file path: ${DATA_FILE}`);

if (!fs.existsSync(DATA_FILE)) {
    console.error(`\n!!! FATAL: vendors_full.json NOT FOUND at:\n    ${DATA_FILE}\n`);
    console.error("Server CANNOT start without vendor data. Exiting.\n");
    process.exit(1);
}

// Pre-load and validate once at startup so we know data is good
let VENDOR_CACHE;
try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    VENDOR_CACHE = JSON.parse(raw);
} catch (parseErr) {
    console.error(`\n!!! FATAL: vendors_full.json is corrupt / invalid JSON.\n`, parseErr.message);
    process.exit(1);
}

if (!Array.isArray(VENDOR_CACHE) || VENDOR_CACHE.length === 0) {
    console.error(`\n!!! FATAL: vendors_full.json must be a non-empty array. Got length=${VENDOR_CACHE?.length}\n`);
    process.exit(1);
}

// Validate every vendor record
VENDOR_CACHE.forEach((v, i) => {
    REQUIRED_STRING_FIELDS.forEach((field) => {
        if (typeof v[field] !== "string" || v[field].trim() === "") {
            console.error(`!!! FATAL: Vendor[${i}] missing or invalid string field "${field}". Value: ${v[field]}`);
            process.exit(1);
        }
    });
    REQUIRED_NUMERIC_FIELDS.forEach((field) => {
        if (typeof v[field] !== "number" || isNaN(v[field])) {
            console.error(`!!! FATAL: Vendor[${i}] missing or invalid numeric field "${field}". Value: ${v[field]}`);
            process.exit(1);
        }
    });
});

console.log(`[STARTUP] ✅ Validated ${VENDOR_CACHE.length} vendors — all fields intact.`);

// ---- MIDDLEWARE ----
app.use(cors());
app.use(express.json());

// ---- ROUTES ----

app.get("/", (req, res) => {
    res.json({
        status: "alive",
        server: "Hardened Audit Server",
        port: PORT,
        vendorCount: VENDOR_CACHE.length,
        uptime: process.uptime(),
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        vendorCount: VENDOR_CACHE.length,
        uptimeSeconds: Math.round(process.uptime()),
        dataFile: DATA_FILE,
    });
});

// ---- MOUNT FULL EXPERIMENT ROUTER ----
// This provides ALL routes the frontend decision page needs:
// /experiment/vendors, /experiment/bidder-profile/:id, /experiment/bidders-master,
// /experiment/upload, /experiment/ai-chat, /experiment/ai-analyze-image,
// /experiment/project-evidence/*, /experiment/evidence/*, /experiment/feedback, etc.
const experimentRouter = require("./src/routes/experiment");
app.use("/experiment", experimentRouter);

// Override vendors route with our validated cache for extra safety
app.get("/experiment/vendors", (req, res) => {
    console.log(`[ROUTE] /experiment/vendors → Serving ${VENDOR_CACHE.length} vendors (validated cache)`);
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(VENDOR_CACHE);
});

// ---- CATCH-ALL: Prevent HTML responses for unknown routes ----
app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.url} — Not found (returning JSON, not HTML)`);
    res.status(404).json({ error: "Route not found", path: req.url });
});

// ---- START SERVER ----
const server = app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`✅ AUDIT SERVER RUNNING — http://localhost:${PORT}`);
    console.log(`   /                     → Server info`);
    console.log(`   /health               → Health check`);
    console.log(`   /experiment/vendors   → ${VENDOR_CACHE.length} vendors`);
    console.log(`   DIR: ${__dirname}`);
    console.log(`=========================================\n`);
}).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`\n!!! Port ${PORT} is already in use. Kill the blocking process first.\n`);
    } else {
        console.error("[SERVER ERROR]", err);
    }
    process.exit(1);
});

// ---- CRASH PROTECTION ----
process.on("uncaughtException", (err) => {
    console.error("[CRASH] Uncaught Exception:", err);
    // Keep running — do NOT exit
});

process.on("unhandledRejection", (reason) => {
    console.error("[CRASH] Unhandled Rejection:", reason);
    // Keep running — do NOT exit
});

process.on("SIGTERM", () => {
    console.log("[SHUTDOWN] Received SIGTERM — closing server gracefully.");
    server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
    console.log("[SHUTDOWN] Received SIGINT — closing server gracefully.");
    server.close(() => process.exit(0));
});
