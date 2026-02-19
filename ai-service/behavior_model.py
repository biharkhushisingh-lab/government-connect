import pandas as pd
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import shap

MODEL_PATH = "behavior_risk_model.pkl"

class BehaviorRiskModel:
    def __init__(self):
        self.model = None
        self.load_model()

    def train_model(self, data: list):
        """
        Trains the Random Forest model on list of dictionaries.
        Features: completionRate, avgDelayDays, fraudFlags, duplicateImageCount, anomalyCount, totalProjects, avgRiskScore, suspensionHistory
        Label: high_risk (1 or 0)
        """
        df = pd.DataFrame(data)
        
        # Define features and label
        features = [
            'completionRate', 'avgDelayDays', 'fraudFlags', 
            'duplicateImageCount', 'anomalyCount', 'totalProjects', 
            'avgRiskScore', 'suspensionHistory'
        ]
        X = df[features]
        y = df['high_risk']

        # Train/Test Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Initialize and Train
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_train, y_train)

        # Save
        joblib.dump(self.model, MODEL_PATH)
        print("Model trained and saved.")
        
        # Basic Evaluation
        score = self.model.score(X_test, y_test)
        print(f"Model Accuracy: {score}")

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)

    def predict_risk(self, features: dict):
        if not self.model:
            return {"error": "Model not trained yet"}

        # Prepare input dataframe
        input_data = pd.DataFrame([features])
        
        # Predict Probability
        prob = self.model.predict_proba(input_data)[0][1] # Probability of class 1 (High Risk)
        
        # Predict Level
        risk_level = "LOW"
        if prob > 0.7:
            risk_level = "HIGH"
        elif prob > 0.4:
            risk_level = "MEDIUM"

        # SHAP Explanation (Simplified for fast inference)
        # For full SHAP in production, you might calculate this asynchronously or cache explainer
        # Here we just return top factors based on feature importance from the tree for speed
        feature_importances = pd.DataFrame(
            self.model.feature_importances_,
            index = input_data.columns,
            columns=['importance']
        ).sort_values('importance', ascending=False)
        
        top_factors = feature_importances.head(3).index.tolist()

        return {
            "riskProbability": round(float(prob), 2),
            "riskLevel": risk_level,
            "topFactors": top_factors
        }
