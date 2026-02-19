import numpy as np
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ocr_analyzer import ocr_analyzer
from visual_forensics import visual_forensics

class FeatureExtractor:
    def extract_features(self, image_path, ocr_data=None):
        """
        Extract numerical features from receipt image.
        Returns a numpy array of features:
        [
          0: text_length_normalized,
          1: amount_match (binary),
          2: gst_valid (binary),
          3: signature_present (binary),
          4: signature_blurred (binary),
          5: signature_forgery_risk (binary),
          6: qr_valid (binary),
          7: tampering_detected (binary),
        ]
        """
        if not ocr_data:
            # Run pipeline if data not provided
            ocr_text = ocr_analyzer.extract_text(image_path)
            fields = ocr_analyzer.extract_fields(ocr_text)
            signals = ocr_analyzer.run_anomaly_checks(fields) 
            vis = visual_forensics.analyze(image_path)
        else:
            ocr_text = ocr_data.get("text", "")
            fields = ocr_data.get("fields", {})
            signals = ocr_data.get("signals", [])
            vis = ocr_data.get("visual", {})

        features = []
        
        # 1. Text Length (normalized 0-1, assuming max 2000 chars)
        features.append(min(len(ocr_text) / 2000.0, 1.0))
        
        # 2. Textual Fraud Signals
        features.append(1.0 if any("Amount" in s or "mismatch" in s for s in signals) else 0.0)
        features.append(1.0 if any("GST" in s and "invalid" in s for s in signals) else 0.0)
        
        # 3. Visual Signals
        sig = vis.get("signature", {})
        features.append(1.0 if sig.get("present") else 0.0)
        features.append(1.0 if sig.get("quality") == "Blurred" else 0.0)
        features.append(1.0 if sig.get("forgeryRisk", "Low") != "Low" else 0.0)
        
        qr = vis.get("qr", {})
        features.append(1.0 if qr.get("found") and not qr.get("valid") else 0.0) # Invalid QR flag
        
        tamper = vis.get("tampering", {})
        features.append(1.0 if tamper.get("isTampered") else 0.0)
        
        return np.array(features, dtype=np.float32)

feature_extractor = FeatureExtractor()
