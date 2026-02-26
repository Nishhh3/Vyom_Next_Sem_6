import json
from typing import Dict
from .processor import FaceProcessor
from .matcher import WebcamFaceMatcher


class BankingKYCPipeline:
    """Complete KYC verification pipeline with enhanced preprocessing options."""

    def __init__(self):
        """Initialize the KYC pipeline."""
        self.face_processor = FaceProcessor()
        self.webcam_matcher = WebcamFaceMatcher(self.face_processor)
        print("✅ Banking KYC Pipeline initialized!")

    def verify_customer(self,
                       id_document_path: str,
                       model: str = 'ArcFace',
                       enhance_document: bool = True,
                       enhance_webcam: bool = True,
                       countdown: int = 2) -> Dict:
        """
        Verify customer identity using document and webcam.
        
        Args:
            id_document_path: Path to ID document image
            model: DeepFace model to use (default: ArcFace)
            enhance_document: Whether to enhance document face
            enhance_webcam: Whether to enhance webcam face
            countdown: Countdown before webcam capture
            
        Returns:
            Dictionary containing verification results and decision
        """
        print("\n" + "="*70)
        print("🏦 ENHANCED BANKING KYC VERIFICATION PIPELINE")
        print("📸 MODE: Live Webcam Capture with Face-Only Comparison")
        print(f"🤖 MODEL: {model}")
        print(f"⚠️  Minimum Confidence Threshold: {WebcamFaceMatcher.MIN_CONFIDENCE_THRESHOLD}%")
        print("="*70 + "\n")

        # Run enhanced verification
        result = self.webcam_matcher.verify_with_webcam(
            document_path=id_document_path,
            model=model,
            enhance_document=enhance_document,
            enhance_webcam=enhance_webcam,
            countdown=countdown
        )

        # Add risk assessment
        if result['success']:
            result['risk_score'] = self._calculate_risk_score(result)
            result['approved'] = self._make_decision(result)
            result['decision'] = self._get_decision_text(result)
        else:
            result['risk_score'] = 100
            result['approved'] = False
            result['decision'] = f"REJECTED - {result.get('error', 'Unknown error')}"

        return result

    def verify_with_saved_images(self,
                                 id_document_path: str,
                                 webcam_image_path: str,
                                 model: str = 'ArcFace',
                                 enhance_document: bool = True,
                                 enhance_webcam: bool = True) -> Dict:
        """
        Verify customer identity using already saved document and webcam images.
        
        This is intended for server-side verification where the frontend has
        already captured and uploaded both the ID document and webcam image.
        """
        print("\n" + "="*70)
        print("🏦 ENHANCED BANKING KYC VERIFICATION PIPELINE (SAVED IMAGES)")
        print("📸 MODE: Saved Images (Document + Webcam)")
        print(f"🤖 MODEL: {model}")
        print(f"⚠️  Minimum Confidence Threshold: {WebcamFaceMatcher.MIN_CONFIDENCE_THRESHOLD}%")
        print("="*70 + "\n")

        # Run enhanced verification using saved images
        result = self.webcam_matcher.verify_with_saved_images(
            document_path=id_document_path,
            webcam_image_path=webcam_image_path,
            model=model,
            enhance_document=enhance_document,
            enhance_webcam=enhance_webcam,
        )

    # Pass face embedding forward for FAISS storage/search
        if result.get("success"):
            # Prefer webcam embedding (live face)
            emb = result.get("webcam_embedding") or result.get("embedding")
            if emb is not None:
                # ensure list (JSON/FAISS safe)
                if isinstance(emb, np.ndarray):
                    emb = emb.tolist()
                result["embedding"] = emb
                
        # Add risk assessment
        if result['success']:
            result['risk_score'] = self._calculate_risk_score(result)
            result['approved'] = self._make_decision(result)
            result['decision'] = self._get_decision_text(result)
        else:
            result['risk_score'] = 100
            result['approved'] = False
            result['decision'] = f"REJECTED - {result.get('error', 'Unknown error')}"

        return result

    def _calculate_risk_score(self, result: Dict) -> float:
        """
        Calculate risk score based on verification results.
        
        Args:
            result: Verification result dictionary
            
        Returns:
            Risk score from 0 (lowest risk) to 100 (highest risk)
        """
        risk = 0

        # Face match confidence (most important)
        if not result['match']:
            risk += 80
        else:
            risk += (100 - result['confidence']) * 0.5

        # Extra penalty for low confidence override
        if result.get('low_confidence_override', False):
            risk += 20

        # Detection quality
        doc_conf = result['doc_detection_conf']
        webcam_conf = result['webcam_detection_conf']

        if doc_conf < 0.95:
            risk += (1 - doc_conf) * 20

        if webcam_conf < 0.95:
            risk += (1 - webcam_conf) * 15

        return min(100, risk)

    def _make_decision(self, result: Dict) -> bool:
        """
        Make approval decision based on risk score.
        
        Args:
            result: Verification result dictionary
            
        Returns:
            True if approved, False otherwise
        """
        # Auto-reject if low confidence override
        if result.get('low_confidence_override', False):
            return False
        return result['risk_score'] < 30

    def _get_decision_text(self, result: Dict) -> str:
        """
        Get human-readable decision text.
        
        Args:
            result: Verification result dictionary
            
        Returns:
            Decision text string
        """
        if result.get('low_confidence_override', False):
            return "REJECTED - Confidence Below Minimum Threshold"

        risk = result['risk_score']

        if risk < 30:
            return "APPROVED - Low Risk"
        elif risk < 60:
            return "MANUAL REVIEW - Medium Risk"
        else:
            return "REJECTED - High Risk"

    def generate_report(self, result: Dict) -> str:
        """
        Generate comprehensive verification report.
        
        Args:
            result: Verification result dictionary
            
        Returns:
            Formatted report string
        """
        report = "\n" + "="*70 + "\n"
        report += "         BANKING KYC VERIFICATION REPORT\n"
        report += "="*70 + "\n\n"

        report += f"Timestamp: {result.get('timestamp', 'N/A')}\n"
        report += f"Capture Method: WEBCAM (LIVE) - FACE-ONLY COMPARISON\n"
        report += f"Model Used: {result.get('model', 'N/A')}\n"
        report += f"Min Confidence Threshold: {WebcamFaceMatcher.MIN_CONFIDENCE_THRESHOLD}%\n\n"

        report += "FINAL DECISION:\n"
        report += f"  Status: {result.get('decision', 'N/A')}\n"
        report += f"  Approved: {'YES ✅' if result.get('approved', False) else 'NO ❌'}\n"
        report += f"  Risk Score: {result.get('risk_score', 100):.1f}/100\n\n"

        report += "VERIFICATION DETAILS:\n" + "-"*70 + "\n"

        if result.get('success'):
            report += f"Face Match: {'✅ MATCH' if result['match'] else '❌ NO MATCH'}\n"

            if result.get('low_confidence_override', False):
                report += f"  ⚠️  Low Confidence Override Applied\n"

            report += f"  Confidence: {result['confidence']:.1f}%\n"
            report += f"  Distance: {result['distance']:.4f}\n"
            report += f"  Threshold: {result['threshold']:.4f}\n"
            report += f"  Model: {result['model']}\n\n"

            report += f"Detection Quality:\n"
            report += f"  Document: {result['doc_detection_conf']:.1%}\n"
            report += f"  Webcam: {result['webcam_detection_conf']:.1%}\n\n"

            if 'preprocessing' in result:
                report += f"Preprocessing:\n"
                report += f"  Document: {'Enhanced' if result['preprocessing']['document_enhanced'] else 'Raw'}\n"
                report += f"  Webcam: {'Enhanced' if result['preprocessing']['webcam_enhanced'] else 'Raw'}\n"
        else:
            report += f"Error: {result.get('error', 'Unknown error')}\n"

        report += "\n" + "="*70 + "\n"

        return report

    def save_result(self, result: Dict, filepath: str = 'kyc_result.json'):
        """
        Save verification result to JSON file.
        
        Args:
            result: Verification result dictionary
            filepath: Path to save JSON file
        """
        with open(filepath, 'w') as f:
            json.dump(result, f, indent=2, default=str)
        print(f"✅ Result saved to {filepath}")