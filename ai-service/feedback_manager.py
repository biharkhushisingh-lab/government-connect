import os
import csv
import json
import base64
import uuid
from datetime import datetime

class FeedbackManager:
    def __init__(self, dataset_dir="dataset"):
        self.feedback_dir = os.path.join(dataset_dir, "feedback")
        self.csv_path = os.path.join(self.feedback_dir, "feedback.csv")
        os.makedirs(self.feedback_dir, exist_ok=True)
        os.makedirs(os.path.join(self.feedback_dir, "safe"), exist_ok=True)
        os.makedirs(os.path.join(self.feedback_dir, "fraud"), exist_ok=True)
        
        # Initialize CSV if not exists
        if not os.path.exists(self.csv_path):
            with open(self.csv_path, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["id", "timestamp", "original_status", "correct_status", "notes", "image_path"])

    def save_feedback(self, image_base64, original_status, correct_status, notes=""):
        # Decode image
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
            
        try:
            img_bytes = base64.b64decode(image_base64)
        except:
             return {"status": "ERROR", "message": "Invalid Base64"}
             
        # Generate ID
        fid = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Determine folder based on correct status (SAFE vs FRAUD)
        # Map frontend status to folder
        label = "safe" if correct_status.upper() == "SAFE" else "fraud"
        filename = f"{label}_{fid[:8]}.png"
        path = os.path.join(self.feedback_dir, label, filename)
        
        # Save image
        with open(path, "wb") as f:
            f.write(img_bytes)
            
        # Append to CSV
        with open(self.csv_path, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([fid, timestamp, original_status, correct_status, notes, path])
            
        print(f"[FEEDBACK] Implementation saved feedback {fid} as {correct_status}")
        return {"id": fid, "status": "SAVED", "path": path}

feedback_manager = FeedbackManager()
