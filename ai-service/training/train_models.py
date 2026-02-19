import sys
import os
import csv
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.feature_extractor import feature_extractor
from ocr_analyzer import ocr_analyzer
from visual_forensics import visual_forensics

DATASET_DIR = "dataset"
METADATA_FILE = os.path.join(DATASET_DIR, "metadata.csv")
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "fraud_model.pkl")
FEEDBACK_FILE = os.path.join(DATASET_DIR, "feedback", "feedback.csv")

def process_image(image_path):
    # Run Analysis Pipeline
    try:
        text = ocr_analyzer.extract_text(image_path)
        fields = ocr_analyzer.extract_fields(text)
        signals = ocr_analyzer.run_anomaly_checks(fields)
        vis = visual_forensics.analyze(image_path)
        
        data = {
            "text": text,
            "fields": fields,
            "signals": signals,
            "visual": vis
        }
        
        return feature_extractor.extract_features(image_path, data)
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None

def train():
    X = []
    y = []
    
    # 1. Load Synthetic Data
    if os.path.exists(METADATA_FILE):
        print("Loading dataset metadata...")
        df = pd.read_csv(METADATA_FILE)
        print(f"Extracting features from synthetic images...")
        
        limit = 200 # Process up to 200 synthetic images
        count = 0
        
        for i, row in df.iterrows():
            if count >= limit: break
            
            label = row['label']
            filename = row['filename']
            subdir = "safe" if label == "safe" else "fraud"
            image_path = os.path.join(DATASET_DIR, "receipts", subdir, filename)
            
            if not os.path.exists(image_path): continue
            
            print(f"[{count+1}/{limit}] Processing synthetic: {filename}")
            feats = process_image(image_path)
            if feats is not None:
                X.append(feats)
                y.append(1 if label == "fraud" else 0)
                count += 1
    
    # 2. Load Feedback Data (Real-world corrections)
    if os.path.exists(FEEDBACK_FILE):
        print("Loading feedback data for continuous learning...")
        try:
            fb_df = pd.read_csv(FEEDBACK_FILE)
            print(f"Found {len(fb_df)} feedback entries.")
            
            for _, row in fb_df.iterrows():
                image_path = row['image_path']
                correct_label = row['correct_status'] # SAFE or FRAUD
                
                if not os.path.exists(image_path):
                    print(f"Missing feedback image: {image_path}")
                    continue
                    
                print(f"[FEEDBACK] Processing {os.path.basename(image_path)} -> {correct_label}")
                feats = process_image(image_path)
                
                if feats is not None:
                    # Upsample feedback data (5x weight) to prioritize user corrections
                    lbl = 1 if correct_label.upper() == "FRAUD" else 0
                    for _ in range(5):
                        X.append(feats)
                        y.append(lbl)
                        
        except Exception as e:
            print(f"Error loading feedback: {e}")

    if len(X) == 0:
        print("No training data found.")
        return

    X = np.array(X)
    y = np.array(y)
    
    print(f"Training on {len(X)} samples (including oversampling). Shape: {X.shape}")
    
    # Train/Test Split
    if len(X) > 10:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    else:
        X_train, y_train = X, y
        X_test, y_test = X, y # Not enough data for split
    
    # Model: Random Forest
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluate
    if len(X_test) > 0:
        y_pred = clf.predict(X_test)
        print("\nModel Evaluation:")
        print(f"Accuracy: {accuracy_score(y_test, y_pred):.2f}")
    
    # Save
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train()
