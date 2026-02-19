from PIL import Image, ImageChops
import os
import numpy as np

class TamperDetector:
    def detect_tampering(self, image_path: str, quality: int = 90, threshold: float = 3.5):
        """
        Detects potential tampering using Error Level Analysis (ELA).
        
        1. Resaves image at 90% quality.
        2. Calculates difference between original and resaved image.
        3. High difference usually indicates manipulation (or high frequency noise).
        """
        if not os.path.exists(image_path):
            return {"tampered": False, "ela_score": 0.0, "error": "File not found"}

        try:
            original = Image.open(image_path).convert('RGB')
            
            # Temporary filename
            directory, filename = os.path.split(image_path)
            temp_filename = f"temp_ela_{filename}.jpg"
            temp_path = os.path.join(directory, temp_filename)
            
            # Save compressed version
            original.save(temp_path, 'JPEG', quality=quality)
            
            # Open compressed version
            compressed = Image.open(temp_path).convert('RGB')
            
            # Calculate difference
            diff = ImageChops.difference(original, compressed)
            
            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            # ELA Score Calculation
            # Get extrema (min, max) for each channel to see range of diffs
            extrema = diff.getextrema()
            max_diff = max([ex[1] for ex in extrema])
            
            # Calculate mean pixel difference using numpy for speed
            diff_np = np.array(diff)
            mean_diff = np.mean(diff_np)
            
            # Logic: 
            # If the original was a JPEG, saving it again at similar quality 
            # should result in very little change (low mean diff).
            # If it was a PNG or BMP saved as JPEG, change might be higher but uniform.
            # If parts were pasted (different compression levels), ELA highlights edges.
            # For a simple metric: High mean difference might imply the source wasn't 
            # a consistent JPEG or has high noise (tampering/pasting).
            
            # Threshold is tricky. Let's use the provided logic:
            # "If score > threshold → flag as tampered"
            
            is_tampered = mean_diff > threshold
            
            return {
                "tampered": bool(is_tampered),
                "ela_score": round(float(mean_diff), 2),
                "details": f"Max channel diff: {max_diff}"
            }

        except Exception as e:
            # Handle non-JPEG or errors safely
            return {
                "tampered": False, 
                "ela_score": 0.0, 
                "error": str(e)
            }

# Singleton
tamper_detector = TamperDetector()
