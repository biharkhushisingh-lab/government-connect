import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import logging
import os
"""
AI Retraining Pipeline
Schedule this script to run weekly (e.g. via cron) to update the machine learning model
based on verified invoice data.
"""

MODEL_PATH = "model.joblib"
DATA_PATH = "verified_invoices.csv" # Mock: in prod, fetch from DB

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def fetch_data():
    """
    Fetch verified invoice data.
    In a real system, connect to PostgreSQL and SELECT amount FROM invoices WHERE verified=TRUE.
    For this MVP, we create a mock updated dataset if not exists, or generate one.
    """
    if not os.path.exists(DATA_PATH):
        # Generate generic new data to simulate time passing
        import numpy as np
        data = {
            'amount': np.random.normal(loc=50000, scale=5000, size=200).tolist()
        }
        df = pd.DataFrame(data)
        df.to_csv(DATA_PATH, index=False)
        return df
    
    return pd.read_csv(DATA_PATH)

def retrain_model():
    logging.info("Starting AI Model Retraining...")
    
    df = fetch_data()
    
    if df.empty:
        logging.warning("No data available for retraining.")
        return

    # Train Isolation Forest
    # Contamination set low for verified data, as we assume it's mostly clean
    model = IsolationForest(contamination=0.01, random_state=42)
    model.fit(df[['amount']])
    
    # Save Model
    joblib.dump(model, MODEL_PATH)
    logging.info(f"Model successfully retrained and saved to {MODEL_PATH}")
    logging.info(f"Training Data Size: {len(df)} records")

if __name__ == "__main__":
    retrain_model()
