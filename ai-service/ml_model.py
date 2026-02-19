import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import os
import numpy as np

MODEL_FILE = "model.joblib"
_model = None

def train_model(dataframe):
    """
    Trains the Isolation Forest model on invoice amounts.
    :param dataframe: pandas DataFrame containing an 'amount' column
    """
    global _model
    
    # Train only on invoice amounts
    # reshape(-1, 1) if it's a single feature
    if 'amount' not in dataframe.columns:
        raise ValueError("Dataframe must contain 'amount' column")
        
    X = dataframe[['amount']].values
    
    _model = IsolationForest(
        contamination=0.05,
        random_state=42
    )
    _model.fit(X)
    
    joblib.dump(_model, MODEL_FILE)
    print(f"Model trained and saved to {MODEL_FILE}")

def load_model():
    """
    Loads the model if it exists.
    """
    global _model
    if os.path.exists(MODEL_FILE):
        _model = joblib.load(MODEL_FILE)
        print("Model loaded successfully.")
        return True
    print("Model file not found.")
    return False

def detect_anomaly(amount):
    """
    Detects anomaly for a specific amount.
    Returns dictionary with is_anomaly and anomaly_score.
    """
    global _model
    
    if _model is None:
        if not load_model():
            # If still no model, we cannot predict. 
            # For safety in this demo, maybe train a dummy one or raise error.
            # I will return a safe default indicating 'Not Ready' or similar, 
            # but to adhere to return type:
            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "error": "Model not loaded"
            }

    # Predict requires 2D array
    X = np.array([[amount]])
    
    # -1 for anomaly, 1 for normal
    prediction = _model.predict(X)
    
    # decision_function: average anomaly score of X of the base classifiers.
    # The anomaly score of an input sample is computed as the mean anomaly score of the trees in the forest.
    # For IsolationForest, lower values indicate anomaly.
    score = _model.decision_function(X)[0]
    
    return {
        "is_anomaly": bool(prediction[0] == -1),
        "anomaly_score": float(score)
    }

# Initialization: Try to load model on import
load_model()
