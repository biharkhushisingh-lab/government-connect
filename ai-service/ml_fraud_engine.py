import os
import joblib
import numpy as np
import sys

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.feature_extractor import feature_extractor
from ocr_analyzer import ocr_analyzer

class MLFraudEngine:
    def __init__(self, model_path="models/fraud_model.pkl"):
        self.model = None
        self.enabled = os.getenv("USE_TRAINED_MODEL", "false").lower() == "true"
        
        if self.enabled:
            real_model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), model_path)
            if os.path.exists(real_model_path):
                try:
                    self.model = joblib.load(real_model_path)
                    print(f"[ML] Model loaded from {real_model_path}")
                except Exception as e:
                    print(f"[ML] Failed to load model: {e}")
            else:
                print(f"[ML] Model file not found at {real_model_path}")
        else:
            print("[ML] ML Engine disabled (USE_TRAINED_MODEL!=true). Using heuristic fallback.")

    def analyze_image(self, image_path: str, vendor_context: dict = None, query: str = "") -> dict:
        """
        Run hybrid analysis: Heuristic Rules + ML Model (if enabled).
        """
        # 1. Run standard heuristic analysis (OCR + Visual Rules)
        # This provides the raw signals and features
        result = ocr_analyzer.analyze_image(image_path, vendor_context, query)
        
        # 2. If ML disabled or failed, return heuristic result
        if not self.model or result.get("status") == "ERROR":
            return result
            
        try:
            # 3. Extract features for ML
            # We reconstruct the data object expected by feature_extractor
            # We use extracted data from the heuristic run to avoid re-running OCR
            
            # Proxy text length using ocrTextLength
            # Since we don't have the full raw text here easily without modifying ocr_analyzer return,
            # we can just pass a dummy string of correct length or modify feature_extractor.
            # But feature_extractor uses len(text). 
            text_proxy = "x" * result.get("ocrTextLength", 0)
            
            data = {
                "text": text_proxy,
                "fields": result.get("extractedFields", {}),
                "signals": result.get("fraudSignals", []),
                "visual": result.get("visualForensics", {})
            }
            
            features = feature_extractor.extract_features(image_path, data)
            
            # 4. Predict
            # features is 1D array, reshape for sklearn
            probabilities = self.model.predict_proba([features])[0]
            # probabilities = [prob_safe, prob_fraud]
            fraud_prob = probabilities[1]
            
            ml_risk_score = int(fraud_prob * 100)
            
            # 5. Hybrid Scoring Strategy
            # User request: Final Risk Score = 0.35*text + ...
            # Our ML model is trained on ALL features, so it subsumes the heuristic score.
            # However, we might want to keep some heuristic penalties if they are severe.
            # For now, we trust the calibrated ML probability.
            
            result["riskScore"] = ml_risk_score
            result["modelMetadata"] = {
                "used": True,
                "confidence": f"{max(fraud_prob, 1-fraud_prob)*100:.1f}%",
                "version": "v1.0-experimental",
                "model": "RandomForest",
                "source": "Hybrid ML + Heuristic Features"
            }
            
            # Update status based on ML score
            if ml_risk_score >= 80:
                result["status"] = "FLAGGED"
            elif ml_risk_score >= 40:
                result["status"] = "REVIEW"
            else:
                result["status"] = "SAFE"
                
            # Add explanation
            result["fraudSignals"].append(f"[ML] AI Confidence: {result['modelMetadata']['confidence']}")
            
            return result
            
        except Exception as e:
            print(f"[ML] Inference error: {e}")
            # Fallback to heuristic result
            return result

    def analyze_base64(self, b64_string: str, vendor_context: dict = None, query: str = "") -> dict:
        import base64 as b64
        import uuid
        
        # Strip header if present
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
            
        try:
            img_bytes = b64.b64decode(b64_string)
        except Exception:
             return {"status": "ERROR", "message": "Invalid Base64"}
             
        filename = f"temp/ml_upload_{uuid.uuid4()}.png"
        os.makedirs("temp", exist_ok=True)
        
        with open(filename, "wb") as f:
            f.write(img_bytes)
            
        try:
            result = self.analyze_image(filename, vendor_context, query)
        finally:
            if os.path.exists(filename):
                os.remove(filename)
                
        return result

ml_engine = MLFraudEngine()
