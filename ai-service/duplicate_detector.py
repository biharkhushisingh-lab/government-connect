from PIL import Image
import imagehash
import os
import json

HASH_DB_FILE = "image_hashes.json"

class DuplicateDetector:
    def __init__(self):
        self.hashes = [] # List of (hash_str, filename_or_id)
        self.load_hashes()

    def load_hashes(self):
        if os.path.exists(HASH_DB_FILE):
            try:
                with open(HASH_DB_FILE, 'r') as f:
                    self.hashes = json.load(f)
            except Exception:
                self.hashes = []

    def save_hashes(self):
        try:
            with open(HASH_DB_FILE, 'w') as f:
                json.dump(self.hashes, f)
        except Exception as e:
            print(f"Failed to save image hashes: {e}")

    def check_duplicate(self, image_path: str, threshold: int = 5):
        """
        Generates perceptual hash and compares with DB.
        Returns dict with is_duplicate, etc.
        """
        if not os.path.exists(image_path):
             return {"is_duplicate": False, "error": "File not found"}

        try:
            img = Image.open(image_path)
            # perceptual hash (pHash) is good for robust matching (resizing/minor edits)
            img_hash = imagehash.phash(img)
            img_hash_str = str(img_hash)

            # Compare against existing
            for stored_hash_str, stored_id in self.hashes:
                stored_hash = imagehash.hex_to_hash(stored_hash_str)
                dist = img_hash - stored_hash
                
                if dist < threshold:
                    return {
                        "is_duplicate": True,
                        "hash": img_hash_str,
                        "similarity_score": dist,
                        "matched_with": stored_id
                    }

            # If not duplicate, store it
            # In a real app, we'd want to store some ID (invoice number) with it.
            # For now, just using filename or a placeholder.
            self.hashes.append((img_hash_str, os.path.basename(image_path)))
            self.save_hashes()
            
            return {
                "is_duplicate": False,
                "hash": img_hash_str,
                "similarity_score": 0
            }

        except Exception as e:
            return {"is_duplicate": False, "error": str(e)}

# Singleton instance
_detector = DuplicateDetector()

# Function alias for simple import as requested
def check_duplicate(image_path):
    return _detector.check_duplicate(image_path)
