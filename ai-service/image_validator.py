import exifread
from datetime import datetime
from geopy.distance import geodesic
import os

class ImageValidator:
    def _get_start_decimal(self, dms, ref):
        """Helper to convert DMS (degrees, minutes, seconds) to decimal degrees"""
        degrees = dms[0].num / dms[0].den
        minutes = dms[1].num / dms[1].den / 60.0
        seconds = dms[2].num / dms[2].den / 3600.0

        if ref in ['S', 'W']:
            degrees = -degrees
            seconds = -seconds
            minutes = -minutes

        return degrees + minutes + seconds

    def get_image_gps(self, image_path):
        """Extracts text GPS data from image"""
        try:
            with open(image_path, 'rb') as f:
                tags = exifread.process_file(f)
                
                if 'GPS GPSLatitude' in tags and 'GPS GPSLongitude' in tags:
                    lat_dms = tags['GPS GPSLatitude'].values
                    lat_ref = tags['GPS GPSLatitudeRef'].values
                    lon_dms = tags['GPS GPSLongitude'].values
                    lon_ref = tags['GPS GPSLongitudeRef'].values
                    
                    lat = self._get_start_decimal(lat_dms, lat_ref)
                    lon = self._get_start_decimal(lon_dms, lon_ref)
                    
                    return lat, lon
        except Exception:
            pass
        return None, None

    def validate_image_location(self, image_path: str, project_lat: float, project_lon: float):
        """
        Validates if image was taken near the project location.
        Threshold: 200 meters.
        """
        if not os.path.exists(image_path):
             return {
                "gps_valid": False,
                "distance_meters": -1,
                "timestamp_valid": False,
                "error": "File not found"
            }

        image_lat, image_lon = self.get_image_gps(image_path)
        
        if image_lat is None or image_lon is None:
             return {
                "gps_valid": False,
                "distance_meters": -1,
                "timestamp_valid": False,
                "reason": "No GPS metadata found"
            }

        # Calculate distance
        # coords_1 = (52.2296756, 21.0122287)
        # coords_2 = (52.406374, 16.9251681)
        try:
            distance = geodesic((image_lat, image_lon), (project_lat, project_lon)).meters
        except Exception as e:
             return {
                "gps_valid": False,
                "distance_meters": -1,
                "timestamp_valid": False,
                "reason": f"Distance calculation error: {str(e)}"
            }

        # Validate Timestamp (Mock: check if present)
        timestamp_valid = False
        try:
            with open(image_path, 'rb') as f:
                tags = exifread.process_file(f, stop_tag='DateTimeOriginal')
                if 'EXIF DateTimeOriginal' in tags:
                    timestamp_valid = True # logic to check date range can be added here
        except:
            pass

        return {
            "gps_valid": distance <= 200,
            "distance_meters": round(distance, 2),
            "timestamp_valid": timestamp_valid,
            "reason": None if distance <= 200 else f"Location mismatch ({round(distance, 2)}m away)"
        }

# Singleton
image_validator = ImageValidator()
