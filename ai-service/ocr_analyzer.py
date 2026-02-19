"""
OCR Document Analyzer for Government Contractor Fraud Detection
Extracts text from receipt/invoice images and runs anomaly checks.
"""
import re
import os
import base64
from io import BytesIO
from datetime import datetime
from visual_forensics import visual_forensics

try:
    import easyocr
    READER = easyocr.Reader(['en'], gpu=False, verbose=False)
    print("[OCR] EasyOCR initialized successfully")
except Exception as e:
    READER = None
    print(f"[OCR] EasyOCR not available: {e}")

try:
    from PIL import Image
except ImportError:
    Image = None


class OCRAnalyzer:
    """Extracts text from document images and detects fraud signals."""

    # Known GST format: 2-digit state + 10-char PAN + 1 entity + 1 check digit + Z
    GST_PATTERN = re.compile(r'\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d][Z][A-Z\d]\b')
    INVOICE_PATTERN = re.compile(r'(?:INV|INVOICE|BILL|RECEIPT)[\s\-#:]*([A-Z0-9\-/]+)', re.IGNORECASE)
    AMOUNT_PATTERN = re.compile(r'(?:total|amount|grand\s*total|net\s*amount|payable)[\s:₹$]*([0-9,]+\.?\d*)', re.IGNORECASE)
    DATE_PATTERN = re.compile(r'(\d{1,2}[\-/\.]\d{1,2}[\-/\.]\d{2,4})')
    VENDOR_PATTERN = re.compile(r'(?:from|vendor|supplier|company|firm|m/s)[\s:]*([A-Za-z\s&.]+)', re.IGNORECASE)

    def __init__(self):
        self.seen_invoices = set()

    def extract_text(self, image_path: str) -> str:
        """Extract text from image using EasyOCR."""
        if READER is None:
            return ""
        try:
            results = READER.readtext(image_path, detail=0)
            text = "\n".join(results)
            print(f"[OCR] Extracted {len(text)} chars from {os.path.basename(image_path)}")
            return text
        except Exception as e:
            print(f"[OCR] Extraction error: {e}")
            return ""

    def extract_fields(self, text: str) -> dict:
        """Parse structured fields from OCR text."""
        fields = {
            "invoiceNumber": None,
            "amount": None,
            "gstNumber": None,
            "date": None,
            "vendorName": None,
            "rawText": text[:500] if text else ""
        }

        if not text:
            return fields

        # Invoice number
        inv_match = self.INVOICE_PATTERN.search(text)
        if inv_match:
            fields["invoiceNumber"] = inv_match.group(1).strip()

        # Amount (find largest number as likely total)
        amt_match = self.AMOUNT_PATTERN.search(text)
        if amt_match:
            try:
                fields["amount"] = float(amt_match.group(1).replace(",", ""))
            except ValueError:
                pass
        if fields["amount"] is None:
            # Fallback: find all numbers and take the largest
            numbers = re.findall(r'[\d,]+\.?\d+', text)
            nums = []
            for n in numbers:
                try:
                    nums.append(float(n.replace(",", "")))
                except ValueError:
                    pass
            if nums:
                fields["amount"] = max(nums)

        # GST number
        gst_match = self.GST_PATTERN.search(text)
        if gst_match:
            fields["gstNumber"] = gst_match.group(0)

        # Date
        date_match = self.DATE_PATTERN.search(text)
        if date_match:
            fields["date"] = date_match.group(1)

        # Vendor name
        vendor_match = self.VENDOR_PATTERN.search(text)
        if vendor_match:
            fields["vendorName"] = vendor_match.group(1).strip()[:60]

        return fields

    def run_anomaly_checks(self, fields: dict, vendor_context: dict = None) -> list:
        """Run fraud anomaly checks on extracted fields."""
        signals = []
        vendor_context = vendor_context or {}

        bid_amount = vendor_context.get("bidAmount", 0)
        extracted_amount = fields.get("amount")

        # 1. Amount mismatch vs bid
        if extracted_amount and bid_amount and bid_amount > 0:
            if extracted_amount > bid_amount:
                pct = ((extracted_amount - bid_amount) / bid_amount) * 100
                signals.append(f"Amount exceeds bid by {pct:.0f}% (₹{extracted_amount:,.0f} vs bid ₹{bid_amount:,.0f})")
            elif extracted_amount > bid_amount * 0.8:
                signals.append(f"Amount is >{80}% of total bid (₹{extracted_amount:,.0f} / ₹{bid_amount:,.0f})")

        # 2. Duplicate invoice number
        inv_num = fields.get("invoiceNumber")
        if inv_num:
            if inv_num in self.seen_invoices:
                signals.append(f"Duplicate invoice ID detected: {inv_num}")
            else:
                self.seen_invoices.add(inv_num)

        # 3. Invalid GST format
        gst = fields.get("gstNumber")
        if gst:
            if not self.GST_PATTERN.match(gst):
                signals.append(f"GST format invalid: {gst}")
        else:
            signals.append("Missing GST number — no tax registration found")

        # 4. Missing tax breakdown
        raw = (fields.get("rawText") or "").lower()
        has_tax_terms = any(t in raw for t in ["cgst", "sgst", "igst", "tax", "gst"])
        if not has_tax_terms:
            signals.append("Missing tax breakdown (no CGST/SGST/IGST found)")

        # 5. Over budget threshold
        project_budget = vendor_context.get("projectBudget", 0) or bid_amount
        if extracted_amount and project_budget and project_budget > 0:
            if extracted_amount > project_budget * 0.5:
                signals.append(f"Single invoice exceeds 50% of project budget")

        # 6. Missing invoice number
        if not inv_num:
            signals.append("No invoice number detected — document may be informal")

        # 7. Missing date
        if not fields.get("date"):
            signals.append("No date found on document")

        # 8. Vendor name mismatch
        vendor_name = vendor_context.get("name", "")
        doc_vendor = fields.get("vendorName", "")
        if vendor_name and doc_vendor and vendor_name.lower() not in doc_vendor.lower() and doc_vendor.lower() not in vendor_name.lower():
            signals.append(f"Vendor name mismatch: document says '{doc_vendor}', expected '{vendor_name}'")

        return signals


    def analyze_image(self, image_path: str, vendor_context: dict = None, query: str = "") -> dict:
        """Full pipeline: OCR → extract → anomaly check → visual forensics → structured result."""
        try:
            # Step 1: Visual Forensics (Parallelizable)
            vf_result = visual_forensics.analyze(image_path)
            
            # Step 2: OCR
            text = self.extract_text(image_path)
            if not text:
                return {
                    "status": "ERROR",
                    "riskScore": 0,
                    "fraudSignals": ["Unable to extract text from image — OCR returned empty"],
                    "extractedFields": {},
                    "visualForensics": vf_result,
                    "confidence": "Low",
                    "message": "Unable to process image. The image may be too blurry or not a document."
                }

            # Step 3: Extract fields
            fields = self.extract_fields(text)

            # Step 4: Run textual anomaly checks
            signals = self.run_anomaly_checks(fields, vendor_context)

            # Step 5: Merge Visual Signals & Scoring
            risk_score = min(100, len(signals) * 15)
            
            # Signature Logic
            sig = vf_result.get("signature", {})
            if not sig.get("present"):
                signals.append("Signature missing or not detected against background")
                risk_score += 20
            elif sig.get("quality") == "Blurred":
                signals.append("Signature appears blurred/low quality")
                risk_score += 10
            
            if sig.get("forgeryRisk", "Low") != "Low":
                signals.append(f"Signature Flag: {sig.get('forgeryRisk')}")
                risk_score += 25

            # QR Logic
            qr = vf_result.get("qr", {})
            if qr.get("found") and not qr.get("valid"):
                signals.append("QR code detected but unreadable/invalid")
                risk_score += 15

            # Tampering Logic
            tamper = vf_result.get("tampering", {})
            if tamper.get("isTampered"):
                signals.append("Visual inconsistency detected (potential cut-paste)")
                risk_score += 20

            # Determine status
            risk_score = min(100, risk_score)
            if risk_score >= 60:
                status = "FLAGGED"
                confidence = "High"
            elif risk_score >= 30:
                status = "REVIEW"
                confidence = "Medium"
            else:
                status = "SAFE"
                confidence = "High"

            return {
                "status": status,
                "riskScore": risk_score,
                "fraudSignals": signals,
                "extractedFields": {
                    "invoiceNumber": fields.get("invoiceNumber"),
                    "amount": fields.get("amount"),
                    "gstNumber": fields.get("gstNumber"),
                    "date": fields.get("date"),
                    "vendorName": fields.get("vendorName"),
                },
                "visualForensics": vf_result,
                "confidence": confidence,
                "ocrTextLength": len(text)
            }

        except Exception as e:
            return {
                "status": "ERROR",
                "riskScore": 0,
                "fraudSignals": [],
                "extractedFields": {},
                "visualForensics": {},
                "confidence": "Low",
                "message": f"Unable to process image: {str(e)}"
            }

    def analyze_base64(self, image_base64: str, vendor_context: dict = None, query: str = "") -> dict:
        """Analyze a base64-encoded image."""
        try:
            # Strip data URI prefix if present
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]

            img_bytes = base64.b64decode(image_base64)
            temp_path = f"temp/ocr_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
            os.makedirs("temp", exist_ok=True)

            if Image:
                img = Image.open(BytesIO(img_bytes))
                img.save(temp_path)
            else:
                with open(temp_path, "wb") as f:
                    f.write(img_bytes)

            result = self.analyze_image(temp_path, vendor_context, query)

            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)

            return result

        except Exception as e:
            return {
                "status": "ERROR",
                "riskScore": 0,
                "fraudSignals": [],
                "extractedFields": {},
                "confidence": "Low",
                "message": f"Unable to process image: {str(e)}"
            }


# Singleton
ocr_analyzer = OCRAnalyzer()
