import numpy as np
from sklearn.ensemble import IsolationForest

# Mock training data for anomaly detection (amount, location_risk_score, vendor_trust_score)
X_train = np.array([
    [1000, 0.1, 0.9],
    [1200, 0.1, 0.9],
    [1100, 0.2, 0.8],
    [50000, 0.9, 0.1], # Anomaly
    [1050, 0.1, 0.95]
])

# Train model (In real world, load pre-trained model)
clf = IsolationForest(random_state=42).fit(X_train)

def detect_invoice_anomaly(amount: float, location_risk: float, vendor_trust: float):
    # -1 is anomaly, 1 is normal
    prediction = clf.predict([[amount, location_risk, vendor_trust]])
    score = clf.decision_function([[amount, location_risk, vendor_trust]])
    
    is_anomaly = prediction[0] == -1
    risk_score = (0.5 - score[0]) * 100 # Normalize roughly to 0-100
    
    return {
        "is_anomaly": bool(is_anomaly),
        "risk_score": max(0, min(100, float(risk_score)))
    }
