import base64, json, urllib.request, os

# Try finding any png in fraud dir
img_path = "dataset/receipts/fraud/fraud_0.png"
fraud_dir = "dataset/receipts/fraud"
if not os.path.exists(img_path) and os.path.exists(fraud_dir):
    files = [f for f in os.listdir(fraud_dir) if f.endswith(".png")]
    if files:
        img_path = os.path.join(fraud_dir, files[0])

print(f"Testing with image: {img_path}")

try:
    with open(img_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()

    payload = json.dumps({'vendorId': 'v1', 'image_base64': b64, 'query': 'Check fraud', 'vendorContext': {}}).encode()
    req = urllib.request.Request('http://localhost:8000/analyze-image', data=payload, headers={'Content-Type': 'application/json'})

    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read())
    print("STATUS:", result.get("status"))
    print("RISK:", result.get("riskScore"))
    print("ML META:", json.dumps(result.get("modelMetadata", {}), indent=2))
except Exception as e:
    print("ERROR:", e)
