from PIL import Image
from PIL.ExifTags import TAGS

def verify_image_metadata(image_path: str):
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        
        if not exif_data:
            return {"verified": False, "reason": "No EXIF metadata found"}
            
        gps_info = {}
        for tag, value in exif_data.items():
            tag_name = TAGS.get(tag, tag)
            if tag_name == "GPSInfo":
                gps_info = value
                
        if not gps_info:
             return {"verified": False, "reason": "No GPS metadata found"}

        return {"verified": True, "gps_data": "GPS Data Present (Parsing simplified)"}
        
    except Exception as e:
        return {"verified": False, "reason": str(e)}

def detect_tampering(image_path: str):
    # Placeholder for Error Level Analysis (ELA)
    # In production, compare compression levels
    return {"is_tampered": False, "confidence": 0.95}
