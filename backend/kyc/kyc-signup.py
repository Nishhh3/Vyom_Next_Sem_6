"""
KYC Face Verification Module
Standalone version using SilentFace + InsightFace
"""

import os
import json
import argparse
from datetime import datetime
from typing import Optional, Dict, Any

import cv2
import numpy as np

from face.face_auth_pipeline import verify_face_image

# FAISS SEARCH
from face.face_search.search_engine import add_face_embedding
from face.face_search.deduplication import check_duplicate

# OCR
try:
    from ocr.ocr_utils import extract_aadhar_number
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# DB optional
try:
    import db
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False


class KYCVerificationSystem:
    """Standalone KYC verification using SilentFace + InsightFace"""

    def __init__(self, output_dir: str = "verification_reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    # =========================
    # SERIALIZATION
    # =========================
    def convert_to_serializable(self, obj: Any) -> Any:
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, dict):
            return {k: self.convert_to_serializable(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self.convert_to_serializable(v) for v in obj]
        return obj

    # =========================
    # REPORT SAVE
    # =========================
    def save_verification_report(self, email: str, report_data: Dict) -> Optional[str]:
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            path = f"{self.output_dir}/{email.replace('@','_')}_{ts}.json"
            with open(path, "w") as f:
                json.dump(report_data, f, indent=2)
            print("✅ Report saved:", path)
            return path
        except Exception as e:
            print("❌ Report save error:", e)
            return None

    # =========================
    # WEBCAM CAPTURE (optional)
    # =========================
    def capture_webcam_photo(self, output_path="webcam_capture.jpg"):
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("❌ Webcam not accessible")
            return False

        print("📸 Press SPACE to capture")

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            cv2.imshow("Capture", frame)
            key = cv2.waitKey(1) & 0xFF

            if key == 32:  # space
                cv2.imwrite(output_path, frame)
                break
            if key == 27:
                break

        cap.release()
        cv2.destroyAllWindows()
        return os.path.exists(output_path)

    # =========================
    # MAIN VERIFY
    # =========================
    def verify_customer(
        self,
        email: str,
        document_path: str,
        webcam_path: Optional[str] = None,
        capture_webcam: bool = False
    ) -> Dict:

        if not email or "@" not in email:
            return {"success": False, "error": "Invalid email"}

        if not os.path.exists(document_path):
            return {"success": False, "error": "Document not found"}

        # Webcam capture if needed
        if webcam_path is None or capture_webcam:
            webcam_path = "webcam_capture.jpg"
            if not self.capture_webcam_photo(webcam_path):
                return {"success": False, "error": "Webcam capture failed"}

        if not os.path.exists(webcam_path):
            return {"success": False, "error": "Webcam image missing"}

        print("🔍 Running face verification...")

        # OCR Aadhaar
        aadhar_number = None
        if OCR_AVAILABLE:
            try:
                aadhar_number = extract_aadhar_number(document_path)
            except:
                pass

        # =====================
        # FACE PIPELINE
        # =====================
        with open(webcam_path, "rb") as f:
            image_bytes = f.read()

        face_result = verify_face_image(image_bytes)

        if face_result["status"] == "no_face":
            return {"success": False, "error": "No face detected"}

        if face_result["status"] == "spoof":
            return {"success": False, "error": "Spoof detected"}

        embedding = face_result["embedding"]
        liveness = float(face_result["liveness"])
        texture = float(face_result["texture"])

        # =====================
        # DUPLICATE CHECK
        # =====================
        duplicate_info = {"is_duplicate": False, "duplicates": []}
        if embedding is not None:
            duplicate_info = check_duplicate(embedding)

        # =====================
        # STORE EMBEDDING (FAISS)
        # =====================
        if embedding is not None:
            add_face_embedding(embedding, email)
            print("✅ Embedding stored in FAISS")

        # =====================
        # SAVE DB (optional)
        # =====================
        if DB_AVAILABLE and embedding is not None:
            try:
                db.insert_signup(
                    email=email,
                    doc_path=document_path,
                    capture_path=webcam_path,
                    aadhar_number=aadhar_number,
                    webcam_path=webcam_path,
                    face_embedding=embedding.tolist()
                )
            except Exception as e:
                print("⚠️ DB save warning:", e)

        # =====================
        # REPORT
        # =====================
        report = {
            "email": email,
            "timestamp": datetime.now().isoformat(),
            "aadhar_number": aadhar_number,
            "face": {
                "liveness": liveness,
                "texture": texture,
                "embedding_size": len(embedding)
            },
            "duplicate": duplicate_info
        }

        report_path = self.save_verification_report(email, report)

        return {
            "success": True,
            "liveness": liveness,
            "texture": texture,
            "duplicate": duplicate_info["is_duplicate"],
            "embedding_size": len(embedding),
            "report_path": report_path
        }


# =========================
# CLI
# =========================
def main():
    parser = argparse.ArgumentParser(description="KYC Verification")
    parser.add_argument("--email", required=True)
    parser.add_argument("--document", required=True)
    parser.add_argument("--webcam")
    parser.add_argument("--capture", action="store_true")

    args = parser.parse_args()

    system = KYCVerificationSystem()

    result = system.verify_customer(
        email=args.email,
        document_path=args.document,
        webcam_path=args.webcam,
        capture_webcam=args.capture
    )

    print("\nRESULT:")
    print(json.dumps(result, indent=2))

    return 0 if result.get("success") else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())