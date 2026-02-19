import pandas as pd
import numpy as np
from ml_model import train_model

# Generate mock data
# Normal distribution: Mean=50000, StdDev=10000, 1000 samples
print("Generating mock data...")
data = {
    "amount": np.random.normal(loc=50000, scale=10000, size=1000)
}

df = pd.DataFrame(data)

# Add some anomalies manually to ensure the model has 'outliers' if we were doing supervised, 
# but for Isolation Forest, it learns what is "normal".
# The normal distribution above defines "normal".

print("Training model...")
train_model(df)
print("Done.")
