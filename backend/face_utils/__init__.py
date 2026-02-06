from .processor import FaceProcessor
from .matcher import WebcamFaceMatcher
from .pipeline import BankingKYCPipeline
from deepface import DeepFace
import cv2
import os

# Build ArcFace model on import
try:
    print("🔄 Loading ArcFace model...")
    DeepFace.build_model("ArcFace")
    print("✅ ArcFace model loaded successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not preload ArcFace model: {e}")

# Ensure captures directory exists
os.makedirs("captures", exist_ok=True)

__all__ = [
    'FaceProcessor',
    'WebcamFaceMatcher', 
    'BankingKYCPipeline',
    'verify',  # Simple verification function
    'webcam_capture',  # Simple webcam capture
]

# Simple utility functions for backward compatibility
MIN_CONF = 10.0


def verify(img1: str, img2: str, model: str = "ArcFace") -> tuple:
    """
    Simple face verification function.
    
    Args:
        img1: Path to first image
        img2: Path to second image
        model: DeepFace model name (default: ArcFace)
        
    Returns:
        Tuple of (is_match: bool, confidence: float)
    """
    try:
        res = DeepFace.verify(
            img1, img2,
            model_name=model,
            detector_backend="opencv",
            distance_metric="cosine",
            enforce_detection=False
        )
        
        conf = max(0, min(100, (1 - res["distance"] / res["threshold"]) * 100))
        return conf > MIN_CONF, conf
        
    except Exception as e:
        print(f"Verification error: {e}")
        return False, 0.0


def webcam_capture(path: str = "captures/webcam.jpg") -> bool:
    """
    Simple webcam capture function.
    
    Args:
        path: Path to save the captured image
        
    Returns:
        True if successful, False otherwise
    """
    try:
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        
        if not cap.isOpened():
            cap = cv2.VideoCapture(0)
            
        if not cap.isOpened():
            return False
            
        # Warmup
        for _ in range(15):
            cap.read()
        
        import time
        time.sleep(2)
        
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            cv2.imwrite(path, frame)
            return True
        return False
        
    except Exception as e:
        print(f"Webcam capture error: {e}")
        return False