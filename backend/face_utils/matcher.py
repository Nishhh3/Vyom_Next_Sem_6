import cv2
import time
from deepface import DeepFace
from datetime import datetime
from typing import Optional, Dict
from .processor import FaceProcessor


class WebcamFaceMatcher:
    """Face verification using webcam capture."""
    
    # CONFIDENCE THRESHOLD FOR MATCHING
    MIN_CONFIDENCE_THRESHOLD = 10.0

    def __init__(self, face_processor: Optional[FaceProcessor] = None):
        """
        Initialize webcam face matcher.
        
        Args:
            face_processor: Optional FaceProcessor instance
        """
        self.face_processor = face_processor or FaceProcessor()
        print("✅ Webcam Face Matcher initialized")

    def capture_from_webcam(self, save_path: str = 'webcam_capture.jpg',
                           warmup_frames: int = 15,
                           delay_seconds: int = 2) -> Optional[str]:
        """
        Capture image from webcam with warmup period.
        
        Args:
            save_path: Path to save captured image
            warmup_frames: Number of frames to skip for camera warmup
            delay_seconds: Delay before capture in seconds
            
        Returns:
            Path to captured image or None if capture failed
        """
        print(f"📸 Starting webcam capture...")
        
        try:
            # Open camera with DirectShow backend for Windows
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            
            if not cap.isOpened():
                # Try default backend if DirectShow fails
                cap = cv2.VideoCapture(0)
                
            if not cap.isOpened():
                print("❌ Failed to open webcam")
                return None

            # Warmup frames
            print(f"⏳ Warming up camera ({warmup_frames} frames)...")
            for _ in range(warmup_frames):
                ret, _ = cap.read()
                if not ret:
                    print("❌ Failed to read from webcam")
                    cap.release()
                    return None

            # Countdown
            print(f"⏱️  Get ready! Capturing in {delay_seconds} seconds...")
            time.sleep(delay_seconds)

            # Capture frame
            ret, frame = cap.read()
            cap.release()

            if not ret or frame is None:
                print("❌ Failed to capture frame")
                return None

            # Save captured frame
            cv2.imwrite(save_path, frame)
            
            # Verify the saved image
            img = cv2.imread(save_path)
            if img is None:
                print("❌ Failed to read captured image")
                return None

            print(f"✅ Photo captured: {img.shape[1]}x{img.shape[0]} pixels")
            return save_path

        except Exception as e:
            print(f"❌ Capture error: {e}")
            return None

    def verify_with_webcam(self, document_path: str,
                          model: str = 'ArcFace',
                          enhance_document: bool = True,
                          enhance_webcam: bool = True,
                          countdown: int = 2) -> Dict:
        """
        Verify face from document against webcam capture.
        
        Args:
            document_path: Path to ID document image
            model: DeepFace model to use for verification (default: ArcFace)
            enhance_document: Whether to enhance document face
            enhance_webcam: Whether to enhance webcam face
            countdown: Countdown before webcam capture
            
        Returns:
            Dictionary containing verification results
        """
        print("\n" + "="*70)
        print("🎥 ENHANCED KYC FACE VERIFICATION SYSTEM")
        print("="*70 + "\n")

        # Step 1: Extract and prepare document face
        print("📄 STEP 1: Processing document photo...")
        doc_result = self.face_processor.extract_face(document_path)

        if doc_result is None:
            print("❌ No face found in document")
            return {
                'success': False, 
                'match': False, 
                'error': 'No face in document'
            }

        doc_face_raw, doc_info = doc_result
        print(f"✅ Face extracted (confidence: {doc_info['confidence']:.2f})")
        print(f"   Face size: {doc_face_raw.shape[1]}x{doc_face_raw.shape[0]} pixels")

        # Save raw extracted face
        cv2.imwrite('document_face_raw.jpg', doc_face_raw)

        # Enhance if requested
        if enhance_document:
            print("🔧 Enhancing document face quality...")
            doc_face = self.face_processor.enhance_face(doc_face_raw)
            doc_path = 'document_enhanced.jpg'
        else:
            doc_face = doc_face_raw
            doc_path = 'document_extracted.jpg'

        cv2.imwrite(doc_path, doc_face)

        # Step 2: Capture from webcam
        print(f"\n📸 STEP 2: Webcam capture")
        print("👤 Position your face clearly in front of the camera")
        print("💡 Ensure good lighting and similar pose to ID photo\n")

        webcam_path = self.capture_from_webcam(
            save_path='webcam_capture.jpg',
            delay_seconds=countdown
        )

        if not webcam_path:
            return {
                'success': False, 
                'match': False, 
                'error': 'Webcam capture failed'
            }

        # Step 3: Extract face from webcam capture
        print("\n🔍 STEP 3: Extracting face from webcam capture...")
        webcam_result = self.face_processor.extract_face(webcam_path)

        if webcam_result is None:
            print("❌ No face detected in webcam capture")
            return {
                'success': False, 
                'match': False, 
                'error': 'No face in webcam capture'
            }

        webcam_face_raw, webcam_info = webcam_result
        print(f"✅ Face detected (confidence: {webcam_info['confidence']:.2f})")
        print(f"   Face size: {webcam_face_raw.shape[1]}x{webcam_face_raw.shape[0]} pixels")

        # Save raw extracted face
        cv2.imwrite('webcam_face_raw.jpg', webcam_face_raw)

        # Enhance webcam face for consistency
        if enhance_webcam:
            print("🔧 Enhancing webcam face quality...")
            webcam_face = self.face_processor.enhance_face(webcam_face_raw)
            webcam_final_path = 'webcam_face_enhanced.jpg'
        else:
            webcam_face = webcam_face_raw
            webcam_final_path = 'webcam_face_extracted.jpg'

        cv2.imwrite(webcam_final_path, webcam_face)

        # Step 4: Face matching
        print(f"\n🔍 STEP 4: Comparing faces using {model}...")
        print(f"   Using: {'Enhanced' if enhance_document else 'Raw'} document face")
        print(f"   Using: {'Enhanced' if enhance_webcam else 'Raw'} webcam face")

        try:
            result = DeepFace.verify(
                img1_path=doc_path,
                img2_path=webcam_final_path,
                model_name=model,
                distance_metric='cosine',
                enforce_detection=False,
                align=True
            )

            distance = result['distance']
            threshold = result['threshold']
            confidence = max(0, min(100, (1 - distance / threshold) * 100))

            # CRITICAL FIX: Override match result if confidence is too low
            verified = result['verified']
            if confidence < self.MIN_CONFIDENCE_THRESHOLD:
                verified = False
                print(f"\n⚠️  Confidence ({confidence:.1f}%) below minimum threshold ({self.MIN_CONFIDENCE_THRESHOLD}%)")
                print("   Overriding match result to NO MATCH")

            match_result = {
                'success': True,
                'match': verified,
                'confidence': confidence,
                'distance': distance,
                'threshold': threshold,
                'model': model,
                'doc_detection_conf': doc_info['confidence'],
                'webcam_detection_conf': webcam_info['confidence'],
                'timestamp': datetime.now().isoformat(),
                'preprocessing': {
                    'document_enhanced': enhance_document,
                    'webcam_enhanced': enhance_webcam
                },
                'low_confidence_override': confidence < self.MIN_CONFIDENCE_THRESHOLD
            }

        except Exception as e:
            print(f"❌ Face matching failed: {e}")
            return {
                'success': False, 
                'match': False, 
                'error': str(e)
            }

        # Step 5: Print results
        self._print_results(match_result)

        return match_result

    def verify_with_saved_images(self,
                                 document_path: str,
                                 webcam_image_path: str,
                                 model: str = 'ArcFace',
                                 enhance_document: bool = True,
                                 enhance_webcam: bool = True) -> Dict:
        """
        Verify face from document image against an already captured webcam image.
        
        This is similar to verify_with_webcam but skips live webcam capture
        and instead uses the provided webcam image path. This is intended for
        use with web frontends that have already captured and uploaded images.
        """
        print("\n" + "="*70)
        print("🎥 ENHANCED KYC FACE VERIFICATION (SAVED IMAGES)")
        print("="*70 + "\n")

        # Step 1: Extract and prepare document face
        print("📄 STEP 1: Processing document photo...")
        doc_result = self.face_processor.extract_face(document_path)

        if doc_result is None:
            print("❌ No face found in document")
            return {
                'success': False,
                'match': False,
                'error': 'No face in document'
            }

        doc_face_raw, doc_info = doc_result
        print(f"✅ Face extracted (confidence: {doc_info['confidence']:.2f})")
        print(f"   Face size: {doc_face_raw.shape[1]}x{doc_face_raw.shape[0]} pixels")

        # Save raw extracted face
        cv2.imwrite('document_face_raw.jpg', doc_face_raw)

        # Enhance if requested
        if enhance_document:
            print("🔧 Enhancing document face quality...")
            doc_face = self.face_processor.enhance_face(doc_face_raw)
            doc_path = 'document_enhanced.jpg'
        else:
            doc_face = doc_face_raw
            doc_path = 'document_extracted.jpg'

        cv2.imwrite(doc_path, doc_face)

        # Step 2: Use provided webcam image
        print(f"\n📸 STEP 2: Using provided webcam image at {webcam_image_path}")

        # Step 3: Extract face from provided webcam image
        print("\n🔍 STEP 3: Extracting face from webcam image...")
        webcam_result = self.face_processor.extract_face(webcam_image_path)

        if webcam_result is None:
            print("❌ No face detected in webcam image")
            return {
                'success': False,
                'match': False,
                'error': 'No face in webcam image'
            }

        webcam_face_raw, webcam_info = webcam_result
        print(f"✅ Face detected (confidence: {webcam_info['confidence']:.2f})")
        print(f"   Face size: {webcam_face_raw.shape[1]}x{webcam_face_raw.shape[0]} pixels")

        # Save raw extracted face
        cv2.imwrite('webcam_face_raw.jpg', webcam_face_raw)

        # Enhance webcam face for consistency
        if enhance_webcam:
            print("🔧 Enhancing webcam face quality...")
            webcam_face = self.face_processor.enhance_face(webcam_face_raw)
            webcam_final_path = 'webcam_face_enhanced.jpg'
        else:
            webcam_face = webcam_face_raw
            webcam_final_path = 'webcam_face_extracted.jpg'

        cv2.imwrite(webcam_final_path, webcam_face)

        # Step 4: Face matching
        print(f"\n🔍 STEP 4: Comparing faces using {model}...")
        print(f"   Using: {'Enhanced' if enhance_document else 'Raw'} document face")
        print(f"   Using: {'Enhanced' if enhance_webcam else 'Raw'} webcam face")

        try:
            result = DeepFace.verify(
                img1_path=doc_path,
                img2_path=webcam_final_path,
                model_name=model,
                distance_metric='cosine',
                enforce_detection=False,
                align=True
            )

            distance = result['distance']
            threshold = result['threshold']
            confidence = max(0, min(100, (1 - distance / threshold) * 100))

            # Override match result if confidence is too low
            verified = result['verified']
            if confidence < self.MIN_CONFIDENCE_THRESHOLD:
                verified = False
                print(f"\n⚠️  Confidence ({confidence:.1f}%) below minimum threshold ({self.MIN_CONFIDENCE_THRESHOLD}%)")
                print("   Overriding match result to NO MATCH")

            match_result = {
                'success': True,
                'match': verified,
                'confidence': confidence,
                'distance': distance,
                'threshold': threshold,
                'model': model,
                'doc_detection_conf': doc_info['confidence'],
                'webcam_detection_conf': webcam_info['confidence'],
                'timestamp': datetime.now().isoformat(),
                'preprocessing': {
                    'document_enhanced': enhance_document,
                    'webcam_enhanced': enhance_webcam
                },
                'low_confidence_override': confidence < self.MIN_CONFIDENCE_THRESHOLD
            }

        except Exception as e:
            print(f"❌ Face matching failed: {e}")
            return {
                'success': False,
                'match': False,
                'error': str(e)
            }

        # Step 5: Print results
        self._print_results(match_result)

        return match_result

    def _print_results(self, result: Dict):
        """Print formatted verification results."""
        print("\n" + "="*70)
        print("📊 VERIFICATION RESULTS")
        print("="*70)

        if result['match']:
            print("\n✅ ✅ ✅  IDENTITY VERIFIED  ✅ ✅ ✅")
        else:
            if result.get('low_confidence_override', False):
                print("\n❌ ❌ ❌  IDENTITY VERIFICATION FAILED (LOW CONFIDENCE)  ❌ ❌ ❌")
            else:
                print("\n❌ ❌ ❌  IDENTITY VERIFICATION FAILED  ❌ ❌ ❌")

        print(f"\nMatch Confidence: {result['confidence']:.1f}%")

        # Show low confidence warning
        if result.get('low_confidence_override', False):
            print(f"⚠️  WARNING: Confidence below {self.MIN_CONFIDENCE_THRESHOLD}% threshold - Match overridden to NO MATCH")

        print(f"Distance Score: {result['distance']:.4f}")
        print(f"Threshold: {result['threshold']:.4f}")
        print(f"Model Used: {result['model']}")

        print(f"\nDetection Quality:")
        print(f"  Document: {result['doc_detection_conf']:.1%}")
        print(f"  Webcam:   {result['webcam_detection_conf']:.1%}")

        print(f"\nPreprocessing Applied:")
        print(f"  Document: {'✅ Enhanced' if result['preprocessing']['document_enhanced'] else '❌ Raw'}")
        print(f"  Webcam:   {'✅ Enhanced' if result['preprocessing']['webcam_enhanced'] else '❌ Raw'}")

        # Interpretation
        if result['match']:
            if result['confidence'] > 70:
                status = "🎉 HIGH CONFIDENCE - Identity verified!"
            elif result['confidence'] > 50:
                status = "⚠️  MEDIUM CONFIDENCE - Manual review recommended"
            else:
                status = "⚠️  LOW CONFIDENCE - Additional verification required"
        else:
            if result.get('low_confidence_override', False):
                status = f"🚫 VERIFICATION FAILED - Confidence too low (< {self.MIN_CONFIDENCE_THRESHOLD}%)"
            else:
                status = "🚫 VERIFICATION FAILED - Identity does not match"

        print(f"\n{status}")
        print("="*70 + "\n")