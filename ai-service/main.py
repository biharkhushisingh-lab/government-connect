from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
import shutil
import json
from pydantic import BaseModel, Json
from typing import Optional
from fraud_engine import FraudEngine # Changed from fraud_engine
from image_validator import ImageValidator # Changed from image_validator
from tamper_detector import TamperDetector # New import
from behavior_model import BehaviorRiskModel # New import
from ml_fraud_engine import ml_engine # ML-enhanced pipeline

app = FastAPI(title="Government Contractor AI Service", version="1.0.0")

# Initialize Engines
fraud_engine = FraudEngine()
image_validator = ImageValidator()
behavior_model = BehaviorRiskModel()

# Ensure temp directory exists
os.makedirs("temp", exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "AI Service Operational", "version": "1.0.0"}

@app.post("/analyze")
async def analyze_submission(
    invoiceNumber: str = Form(...),
    amount: float = Form(...),
    projectBudget: float = Form(...),
    supplier: str = Form(...),
    projectLat: Optional[float] = Form(None),
    projectLon: Optional[float] = Form(None),
    supplierRedlisted: bool = Form(False),
    duplicateInvoice: bool = Form(False),
    image: Optional[UploadFile] = File(None)
):
    temp_file = None
    try:
        # Construct data dict
        data = {
            "invoiceNumber": invoiceNumber,
            "amount": float(amount),
            "projectBudget": float(projectBudget),
            "supplier": supplier,
            "supplierRedlisted": supplierRedlisted,
            "duplicateInvoice": duplicateInvoice,
            "projectLat": projectLat,
            "projectLon": projectLon
        }

        # Process Image if exists
        image_path = None
        gps_result = None

        if image:
            temp_file = f"temp_{image.filename}"
            with open(temp_file, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            image_path = temp_file
            
            # If Project GPS provided, validate location
            if projectLat is not None and projectLon is not None:
                gps_result = image_validator.validate_image_location(
                    temp_file, 
                    float(projectLat), 
                    float(projectLon)
                )
                # Inject GPS results into data for fraud engine or merge results later
                data["gps_valid"] = gps_result["gps_valid"]
                data["distance_meters"] = gps_result["distance_meters"]
                if not gps_result["gps_valid"] and gps_result["distance_meters"] != -1:
                     data["gps_mismatch_reason"] = gps_result.get("reason", "Location mismatch")

        # Run Analysis
        result = fraud_engine.analyze_submission(data, image_path=image_path)
        
        # Merge GPS detailed stats if available
        if gps_result:
            result["gpsValid"] = gps_result["gps_valid"]
            result["distanceMeters"] = gps_result["distance_meters"]

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if temp_file and os.path.exists(temp_file):
            os.remove(temp_file)

@app.post("/predict-risk")
async def predict_risk(
    completionRate: float = Form(...),
    avgDelayDays: float = Form(...),
    fraudFlags: int = Form(...),
    duplicateImageCount: int = Form(...),
    anomalyCount: int = Form(...),
    totalProjects: int = Form(...),
    avgRiskScore: float = Form(...),
    suspensionHistory: int = Form(...)
):
    try:
        features = {
            'completionRate': completionRate,
            'avgDelayDays': avgDelayDays,
            'fraudFlags': fraudFlags,
            'duplicateImageCount': duplicateImageCount,
            'anomalyCount': anomalyCount,
            'totalProjects': totalProjects,
            'avgRiskScore': avgRiskScore,
            'suspensionHistory': suspensionHistory
        }
        
        result = behavior_model.predict_risk(features)
        
        if "error" in result:
             # If model not trained, return neutral default
             return {
                 "riskProbability": 0.0, 
                 "riskLevel": "UNKNOWN", 
                 "message": "Model not trained yet"
            }
            
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate-score")
def calculate_score(completion_rate: float, delay_days: int, fraud_flags: int, quality_avg: float):
    """
    Calculate contractor credibility score based on performance metrics.
    """
    # Base weighted score
    score = (completion_rate * 100 * 0.30) + ((quality_avg / 5.0) * 100 * 0.40)
    score -= (delay_days * 2)
    score -= (fraud_flags * 20)
    
    final_score = max(0, min(100, score))
    return {"score": round(final_score, 2)}


class ImageAnalysisRequest(BaseModel):
    vendorId: str = ""
    image_base64: str
    query: str = ""
    vendorContext: Optional[dict] = None


@app.post("/analyze-image")
async def analyze_image(req: ImageAnalysisRequest):
    """
    OCR + Fraud Analysis Pipeline.
    Accepts base64-encoded image, extracts text via OCR,
    runs anomaly checks, and returns structured fraud result.
    """
    try:
        if not req.image_base64:
            raise HTTPException(status_code=400, detail="image_base64 is required")

        vendor_ctx = req.vendorContext or {}
        result = ml_engine.analyze_base64(req.image_base64, vendor_ctx, req.query)

        # Also run tamper detection if we can save the temp image
        if result.get("status") != "ERROR":
            try:
                import base64 as b64
                from io import BytesIO as BIO
                raw_b64 = req.image_base64
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]
                img_bytes = b64.b64decode(raw_b64)
                tamper_path = f"temp/tamper_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
                with open(tamper_path, "wb") as f:
                    f.write(img_bytes)
                tamper_result = tamper_detector.detect_tampering(tamper_path)
                if tamper_result.get("tampered"):
                    result["fraudSignals"].append("Image manipulation/tampering suspected")
                    result["riskScore"] = min(100, result["riskScore"] + 20)
                result["tamperDetection"] = tamper_result
                if os.path.exists(tamper_path):
                    os.remove(tamper_path)
            except Exception as te:
                print(f"[TAMPER] Skipped: {te}")

        result["vendorId"] = req.vendorId
        result["timestamp"] = datetime.now().isoformat()
        result["type"] = "invoice_analysis"

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from feedback_manager import feedback_manager

class FeedbackRequest(BaseModel):
    image_base64: str
    original_status: str
    correct_status: str
    notes: Optional[str] = ""

@app.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    """
    Submit feedback on incorrect fraud analysis.
    This data is used to retrain the ML model.
    """
    try:
        return feedback_manager.save_feedback(req.image_base64, req.original_status, req.correct_status, req.notes)
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
