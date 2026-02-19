from ml_model import detect_anomaly
from tamper_detector import tamper_detector
from duplicate_detector import check_duplicate

class FraudEngine:
    def __init__(self):
        # --- 1. Redlists & Config ---
        self.supplier_redlist = ["Suspicious Supplies Ltd", "Blacklisted Corp"]
        self.registered_suppliers = ["Good Supplies Inc", "Trusted Vendors LLC", "Alpha Construction"] # Mock DB
        self.seen_invoices = set() # Mock duplicate check DB

    def _check_image_metadata(self, image_path):
        """Checks for GPS data and date in image metadata"""
        if not image_path or not os.path.exists(image_path):
            return ["Image file missing or not found"]

        reasons = []
        try:
            with open(image_path, 'rb') as f:
                tags = exifread.process_file(f)
                
                # Check GPS
                if 'GPS GPSLatitude' not in tags or 'GPS GPSLongitude' not in tags:
                    reasons.append("Image metadata missing GPS coordinates")
                
                # Check Date
                date_taken = tags.get('Image DateTime')
                if date_taken:
                    # Parse EXIF date format: 'YYYY:MM:DD HH:MM:SS'
                    try:
                        dt_obj = datetime.strptime(str(date_taken), '%Y:%m:%d %H:%M:%S')
                        # Simple check: if older than 365 days (mock rule)
                        if (datetime.now() - dt_obj).days > 365:
                            reasons.append("Image is older than 1 year")
                    except ValueError:
                        pass # Date format error, skip
                else:
                    reasons.append("Image metadata missing capture date")

        except Exception as e:
            reasons.append(f"Failed to read image metadata: {str(e)}")
        
        return reasons

    def analyze_submission(self, data: dict, image_path: str = None):
        """
        Comprehensive fraud analysis
        """
        reasons = []
        risk_score = 0
        
        # Extract fields matching the User's requested JSON structure
        invoice_number = data.get('invoiceNumber') or data.get('invoice_id', 'Unknown')
        amount = data.get('amount', 0)
        project_budget = data.get('projectBudget') or data.get('project_budget', float('inf'))
        supplier = data.get('supplier') or data.get('supplier_name', 'Unknown')
        
        # Explicit Flags (if provided in JSON)
        supplier_redlisted = data.get('supplierRedlisted', False)
        duplicate_invoice = data.get('duplicateInvoice', False)
        image_has_gps = data.get('imageHasGPS', True) # Default to True if not provided/checked externally
        image_date_valid = data.get('imageDateValid', True)

        # 1. Invoice amount checks
        if amount > project_budget:
            reasons.append(f"Invoice amount ({amount}) exceeds project budget ({project_budget})")
            risk_score += 50
        elif amount > (project_budget * 0.8):
             reasons.append(f"Invoice amount ({amount}) is >80% of project budget")
             risk_score += 30

        # 2. Supplier Redlist (Internal Check OR External Flag)
        if supplier_redlisted or supplier in self.supplier_redlist:
            reasons.append(f"Supplier '{supplier}' is REDLISTED")
            risk_score += 100

        # 3. Supplier Registration (Internal Check Only for now, unless flag added)
        if supplier not in self.registered_suppliers and not data.get('supplierRedlisted'):
             # If explicitly redlisted, we already caught it. If not, check registration.
             reasons.append(f"Supplier '{supplier}' is not a registered vendor")
             risk_score += 40

        # 4. Duplicate Invoice (Internal Check OR External Flag)
        if duplicate_invoice or invoice_number in self.seen_invoices:
             reasons.append(f"Duplicate Invoice Number: {invoice_number}")
             risk_score += 100
        else:
            self.seen_invoices.add(invoice_number)

        # 5 & 6. Image Checks (External Flags OR Internal Path Check)
        if image_path:
            # Internal File Check
            meta_issues = self._check_image_metadata(image_path)
            if meta_issues:
                reasons.extend(meta_issues)
                risk_score += (20 * len(meta_issues))
        else:
            # External Flags Check
            if not image_has_gps:
                reasons.append("Image metadata missing GPS coordinates")
                risk_score += 20
            if not image_date_valid:
                reasons.append("Image date is invalid or too old")
                risk_score += 20

        # 7. AI Analysis (using ml_model)
        ml_result = detect_anomaly(amount)
        
        if ml_result['is_anomaly']:
            reasons.append("Invoice amount anomaly detected")
            risk_score += 30

        # 8. GPS Mismatch (Passed from Main)
        # If gps_valid is explicitly False, it means we checked and it failed.
        if data.get("gps_valid") is False:
             reason = data.get("gps_mismatch_reason", "Image location mismatch")
             reasons.append(reason)
             risk_score += 40

        # 9. Tamper Detection (Internal Check)
        tamper_result = {"tampered": False, "ela_score": 0.0}
        if image_path:
            tamper_result = tamper_detector.detect_tampering(image_path)
            if tamper_result["tampered"]:
                reasons.append("Image manipulation suspected")
                risk_score += 35



        # 10. Duplicate Detection (Internal Check)
        dup_result = {"is_duplicate": False, "similarity_score": 0}
        if image_path:
            dup_result = check_duplicate(image_path)
            if dup_result["is_duplicate"]:
                riskScore += 30
                reasons.append("Duplicate or reused image detected")

        # Clamp Status
        total_risk = min(100, risk_score)
        status = "RED" if total_risk >= 50 else "GREEN"

        return {
            "status": status,
            "riskScore": total_risk,
            "mlAnomaly": ml_result['is_anomaly'],
            "gpsValid": data.get("gps_valid", True),
            "tampered": tamper_result["tampered"],
            "elaScore": tamper_result["ela_score"],
            "duplicateImage": dup_result["is_duplicate"],
            "reasons": reasons
        }

# Singleton instance
fraud_engine = FraudEngine()
