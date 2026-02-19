const fs = require("fs");
const path = require("path");

function loadInvoices() {
    try {
        const filePath = path.join(__dirname, "../mock-data/invoices.json");
        console.log(`Loading invoices from: ${filePath}`);
        const data = fs.readFileSync(filePath);
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error loading invoices: ${err.message}`);
        throw err;
    }
}

function analyzeInvoice(invoiceId) {
    const invoices = loadInvoices();
    const invoice = invoices.find(i => i.invoiceId === invoiceId);

    if (!invoice) {
        return { error: "Invoice not found" };
    }

    let riskScore = 0;
    let reasons = [];

    if (invoice.amount > invoice.projectBudget) {
        riskScore += 30;
        reasons.push("Amount exceeds project budget");
    }

    if (invoice.supplierRedlisted) {
        riskScore += 25;
        reasons.push("Supplier is redlisted");
    }

    if (invoice.duplicateInvoice) {
        riskScore += 20;
        reasons.push("Duplicate invoice detected");
    }

    if (!invoice.imageHasGPS) {
        riskScore += 15;
        reasons.push("Missing GPS metadata");
    }

    if (!invoice.imageDateValid) {
        riskScore += 10;
        reasons.push("Invalid image timestamp");
    }

    const status =
        riskScore >= 60 ? "HIGH RISK"
            : riskScore >= 30 ? "MEDIUM RISK"
                : "LOW RISK";

    return {
        invoice,
        riskScore,
        status,
        reasons
    };
}

module.exports = { analyzeInvoice };
