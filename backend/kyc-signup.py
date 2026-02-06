"""
KYC Face Verification Module
Standalone version without Streamlit - can be used as a Python module or CLI tool
"""

import cv2
import os
from pathlib import Path
from datetime import datetime
import numpy as np
import json
import argparse
from typing import Optional, Dict, Any

# Import the face verification utilities
try:
    from face_utils import BankingKYCPipeline
    FACE_UTILS_AVAILABLE = True
except ImportError as e:
    print(f"Error importing face_utils: {e}")
    FACE_UTILS_AVAILABLE = False

# Import database module
try:
    import db
    DB_AVAILABLE = True
except ImportError as e:
    print(f"Error importing database module: {e}")
    DB_AVAILABLE = False

# Import OCR module if available
try:
    from ocr_utils import extract_aadhar_number
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("OCR utilities not available - Aadhar extraction disabled")


class KYCVerificationSystem:
    """KYC Face Verification System - Standalone class without Streamlit"""
    
    def __init__(self, output_dir: str = "verification_reports"):
        """
        Initialize KYC Verification System
        
        Args:
            output_dir: Directory to save verification reports
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize pipeline if available
        if FACE_UTILS_AVAILABLE:
            self.pipeline = BankingKYCPipeline()
        else:
            self.pipeline = None
            print("Warning: Face verification pipeline not available")
    
    def convert_to_serializable(self, obj: Any) -> Any:
        """Convert NumPy types to native Python types"""
        if isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {key: self.convert_to_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self.convert_to_serializable(item) for item in obj]
        else:
            return obj
    
    def save_verification_report(self, email: str, report_data: Dict) -> Optional[str]:
        """
        Save verification report as JSON for admin review
        
        Args:
            email: User's email address
            report_data: Verification report data
            
        Returns:
            Path to saved report or None if failed
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_path = f"{self.output_dir}/{email.replace('@', '_')}_{timestamp}.json"
            
            with open(report_path, 'w') as f:
                json.dump(report_data, f, indent=2)
            
            print(f"✅ Report saved: {report_path}")
            return report_path
        except Exception as e:
            print(f"❌ Error saving report: {e}")
            return None
    
    def capture_webcam_photo(self, countdown: int = 3, output_path: str = "webcam_capture.jpg") -> bool:
        """
        Capture photo from webcam with countdown
        
        Args:
            countdown: Countdown in seconds before capture
            output_path: Path to save captured image
            
        Returns:
            True if successful, False otherwise
        """
        print("\n📸 Starting webcam capture...")
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("❌ Could not access webcam")
            return False
        
        print("👁️  Webcam opened. Position your face in the center...")
        
        # Show preview
        print("Preview starting (press 'q' to skip countdown and capture immediately)")
        
        start_time = datetime.now()
        countdown_started = False
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("❌ Failed to grab frame")
                cap.release()
                cv2.destroyAllWindows()
                return False
            
            # Display frame
            display_frame = frame.copy()
            
            # Add countdown overlay
            elapsed = (datetime.now() - start_time).total_seconds()
            if elapsed > 2:  # Give 2 seconds to position
                if not countdown_started:
                    countdown_started = True
                    countdown_start = datetime.now()
                
                countdown_elapsed = (datetime.now() - countdown_start).total_seconds()
                remaining = max(0, countdown - int(countdown_elapsed))
                
                if remaining > 0:
                    # Draw countdown
                    cv2.putText(display_frame, str(remaining), 
                               (display_frame.shape[1]//2 - 50, display_frame.shape[0]//2),
                               cv2.FONT_HERSHEY_SIMPLEX, 3, (0, 255, 0), 5)
                else:
                    # Capture!
                    cv2.imwrite(output_path, frame)
                    print(f"✅ Photo captured and saved to: {output_path}")
                    cap.release()
                    cv2.destroyAllWindows()
                    return True
            else:
                # Show positioning message
                cv2.putText(display_frame, "Position your face", 
                           (50, 50),
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            cv2.imshow('KYC Webcam Capture', display_frame)
            
            # Press 'q' to capture immediately
            if cv2.waitKey(1) & 0xFF == ord('q'):
                cv2.imwrite(output_path, frame)
                print(f"✅ Photo captured and saved to: {output_path}")
                cap.release()
                cv2.destroyAllWindows()
                return True
        
        cap.release()
        cv2.destroyAllWindows()
        return False
    
    def verify_customer(self, 
                       email: str,
                       document_path: str,
                       webcam_path: Optional[str] = None,
                       enhance_document: bool = True,
                       enhance_webcam: bool = True,
                       capture_webcam: bool = False,
                       countdown: int = 3) -> Dict:
        """
        Verify customer KYC
        
        Args:
            email: Customer email address
            document_path: Path to Aadhar/ID document
            webcam_path: Path to webcam image (if None, will capture)
            enhance_document: Enhance document image quality
            enhance_webcam: Enhance webcam image quality
            capture_webcam: Whether to capture webcam photo
            countdown: Countdown before webcam capture
            
        Returns:
            Verification result dictionary
        """
        if not FACE_UTILS_AVAILABLE:
            return {
                'success': False,
                'error': 'Face verification utilities not available'
            }
        
        if not DB_AVAILABLE:
            print("⚠️  Warning: Database module not available. Results will not be saved to DB.")
        
        # Validate email
        if not email or '@' not in email:
            return {
                'success': False,
                'error': 'Invalid email address'
            }
        
        # Validate document path
        if not os.path.exists(document_path):
            return {
                'success': False,
                'error': f'Document not found: {document_path}'
            }
        
        # Handle webcam capture or path
        if capture_webcam or webcam_path is None:
            webcam_path = 'webcam_capture.jpg'
            print("\n📸 Webcam capture required...")
            if not self.capture_webcam_photo(countdown=countdown, output_path=webcam_path):
                return {
                    'success': False,
                    'error': 'Webcam capture failed'
                }
        
        if not os.path.exists(webcam_path):
            return {
                'success': False,
                'error': f'Webcam image not found: {webcam_path}'
            }
        
        print("\n🔍 Starting verification process...")
        print(f"   Email: {email}")
        print(f"   Document: {document_path}")
        print(f"   Webcam: {webcam_path}")
        
        # Extract Aadhar number if OCR is available
        aadhar_number = None
        if OCR_AVAILABLE:
            try:
                print("🔍 Extracting Aadhar number...")
                aadhar_number = extract_aadhar_number(document_path)
                if aadhar_number:
                    print(f"✅ Aadhar Number: {aadhar_number}")
                else:
                    print("⚠️  Could not extract Aadhar number")
            except Exception as e:
                print(f"⚠️  Aadhar extraction failed: {e}")
        
        try:
            # Run verification
            print("\n🤖 Running face verification with ArcFace model...")
            result = self.pipeline.verify_with_saved_images(
                id_document_path=document_path,
                webcam_image_path=webcam_path,
                model='ArcFace',
                enhance_document=enhance_document,
                enhance_webcam=enhance_webcam
            )
            
            # Convert to serializable format
            result = self.convert_to_serializable(result)
            
            # Print results
            print("\n" + "="*60)
            print("📊 VERIFICATION RESULTS")
            print("="*60)
            
            if result.get('success'):
                match = result.get('match', False)
                confidence = result.get('confidence', 0)
                risk_score = result.get('risk_score', 100)
                
                print(f"✅ Verification Status: {'PASSED' if match else 'FAILED'}")
                print(f"🎯 Face Match: {'✅ YES' if match else '❌ NO'}")
                print(f"📈 Confidence: {confidence:.2f}%")
                print(f"⚠️  Risk Score: {risk_score:.2f}/100")
                print(f"🔍 Model: ArcFace")
                
                if result.get('approved'):
                    print("✅ Status: APPROVED")
                else:
                    print("⏳ Status: PENDING REVIEW")
            else:
                print(f"❌ Verification Error: {result.get('error', 'Unknown error')}")
            
            print("="*60)
            
            # Prepare verification report
            verification_report = {
                'email': email,
                'timestamp': datetime.now().isoformat(),
                'aadhar_number': aadhar_number,
                'verification_result': result,
                'file_paths': {
                    'document': document_path,
                    'webcam': webcam_path
                },
                'settings': {
                    'model': 'ArcFace',
                    'enhance_document': enhance_document,
                    'enhance_webcam': enhance_webcam
                }
            }
            
            # Save verification report
            report_path = self.save_verification_report(email, verification_report)
            result['report_path'] = report_path
            
            # Save to database if available
            if DB_AVAILABLE and result.get('success'):
                try:
                    print("\n💾 Saving to database...")
                    db_success = db.insert_signup(
                        email=email,
                        doc_path=document_path,
                        capture_path=webcam_path,
                        aadhar_number=aadhar_number,
                        webcam_path=webcam_path
                    )
                    
                    if db_success:
                        print("✅ Saved to database successfully")
                    else:
                        print("❌ Failed to save to database")
                except Exception as e:
                    print(f"❌ Database error: {e}")
            
            return result
            
        except Exception as e:
            import traceback
            error_msg = f"Verification failed: {str(e)}"
            print(f"\n❌ {error_msg}")
            print(traceback.format_exc())
            return {
                'success': False,
                'error': error_msg
            }


def main():
    """Command-line interface for KYC verification"""
    parser = argparse.ArgumentParser(description='KYC Face Verification System')
    parser.add_argument('--email', required=True, help='Customer email address')
    parser.add_argument('--document', required=True, help='Path to Aadhar/ID document')
    parser.add_argument('--webcam', help='Path to webcam image (if not provided, will capture)')
    parser.add_argument('--no-enhance-document', action='store_true', help='Disable document enhancement')
    parser.add_argument('--no-enhance-webcam', action='store_true', help='Disable webcam enhancement')
    parser.add_argument('--countdown', type=int, default=3, help='Countdown before webcam capture (default: 3)')
    parser.add_argument('--output-dir', default='verification_reports', help='Output directory for reports')
    
    args = parser.parse_args()
    
    # Initialize system
    print("\n" + "="*60)
    print("🏦 KYC FACE VERIFICATION SYSTEM")
    print("="*60 + "\n")
    
    system = KYCVerificationSystem(output_dir=args.output_dir)
    
    # Run verification
    result = system.verify_customer(
        email=args.email,
        document_path=args.document,
        webcam_path=args.webcam,
        enhance_document=not args.no_enhance_document,
        enhance_webcam=not args.no_enhance_webcam,
        capture_webcam=(args.webcam is None),
        countdown=args.countdown
    )
    
    # Print final result
    print("\n" + "="*60)
    if result.get('success') and result.get('match'):
        print("✅ VERIFICATION COMPLETED SUCCESSFULLY")
    else:
        print("❌ VERIFICATION FAILED")
    print("="*60 + "\n")
    
    return 0 if result.get('success') else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())