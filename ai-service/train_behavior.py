import random
from behavior_model import BehaviorRiskModel

def generate_mock_data(n=1000):
    data = []
    for _ in range(n):
        # Generate random features
        completion_rate = random.uniform(50, 100)
        avg_delay = random.uniform(0, 30)
        fraud_flags = random.randint(0, 5)
        duplicate_images = random.randint(0, 3)
        anomalies = random.randint(0, 5)
        total_projects = random.randint(1, 50)
        avg_risk_score = random.uniform(0, 100)
        suspension_history = random.choice([0, 1])

        # Heuristic for labeling 'high_risk' for training
        risk_score = (
            (100 - completion_rate) * 0.5 + 
            avg_delay * 1.5 + 
            fraud_flags * 10 + 
            duplicate_images * 5 + 
            anomalies * 5 +
            suspension_history * 20
        )
        
        high_risk = 1 if risk_score > 50 else 0

        data.append({
            'completionRate': completion_rate,
            'avgDelayDays': avg_delay,
            'fraudFlags': fraud_flags,
            'duplicateImageCount': duplicate_images,
            'anomalyCount': anomalies,
            'totalProjects': total_projects,
            'avgRiskScore': avg_risk_score,
            'suspensionHistory': suspension_history,
            'high_risk': high_risk
        })
    return data

if __name__ == "__main__":
    print("Generating mock behavior data...")
    dataset = generate_mock_data()
    
    print("Training model...")
    model = BehaviorRiskModel()
    model.train_model(dataset)
    print("Done.")
