import cv2
import re
import pytesseract
import numpy as np
from typing import Optional, Tuple


class AadharExtractor:
    """Extract Aadhar number from Aadhar card images."""
    
    def __init__(self, tesseract_path: Optional[str] = None):
        """
        Initialize Aadhar extractor.
        
        Args:
            tesseract_path: Path to tesseract executable (Windows only)
        """
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        
        print("✅ Aadhar Extractor initialized")
    
    def preprocess_for_ocr(self, image_path: str) -> np.ndarray:
        """
        Preprocess image for better OCR accuracy.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Preprocessed image
        """
        # Read image
        img = cv2.imread(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Resize for better OCR (larger is better for text)
        height, width = gray.shape
        if height < 1000:
            scale = 1000 / height
            new_width = int(width * scale)
            new_height = int(height * scale)
            gray = cv2.resize(gray, (new_width, new_height), 
                            interpolation=cv2.INTER_CUBIC)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Enhance contrast with CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # Threshold to get black text on white background
        _, binary = cv2.threshold(enhanced, 0, 255, 
                                 cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Morphological operations to clean up
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return cleaned
    
    def extract_aadhar_number(self, image_path: str) -> Optional[str]:
        """
        Extract Aadhar number from image.
        
        Args:
            image_path: Path to Aadhar card image
            
        Returns:
            Aadhar number as string (12 digits) or None if not found
        """
        print("🔍 Extracting Aadhar number from document...")
        
        try:
            # Preprocess image
            preprocessed = self.preprocess_for_ocr(image_path)
            
            # Perform OCR
            text = pytesseract.image_to_string(
                preprocessed,
                config='--psm 6'  # Assume uniform block of text
            )
            
            # Extract Aadhar number using multiple patterns
            aadhar = self._find_aadhar_pattern(text)
            
            if aadhar:
                print(f"✅ Aadhar number found: {aadhar}")
                return aadhar
            
            # Try again with different OCR settings
            print("⚠️  First attempt failed, trying alternative OCR method...")
            text_alt = pytesseract.image_to_string(
                preprocessed,
                config='--psm 11'  # Sparse text
            )
            
            aadhar = self._find_aadhar_pattern(text_alt)
            
            if aadhar:
                print(f"✅ Aadhar number found: {aadhar}")
                return aadhar
            
            print("❌ No Aadhar number found in document")
            print(f"📝 Extracted text:\n{text[:200]}...")
            return None
            
        except Exception as e:
            print(f"❌ OCR error: {e}")
            return None
    
    def _find_aadhar_pattern(self, text: str) -> Optional[str]:
        """
        Find Aadhar number in extracted text.
        
        Aadhar format: XXXX XXXX XXXX (12 digits, optionally with spaces)
        
        Args:
            text: OCR extracted text
            
        Returns:
            Aadhar number or None
        """
        # Remove extra whitespace and newlines
        text = ' '.join(text.split())
        
        # Pattern 1: 12 digits with spaces (XXXX XXXX XXXX)
        pattern1 = r'\b(\d{4})\s*(\d{4})\s*(\d{4})\b'
        
        # Pattern 2: 12 consecutive digits
        pattern2 = r'\b(\d{12})\b'
        
        # Try pattern 1 first (with spaces)
        matches = re.findall(pattern1, text)
        if matches:
            # Take the first valid match
            for match in matches:
                aadhar = ''.join(match)
                if self._is_valid_aadhar(aadhar):
                    return f"{match[0]} {match[1]} {match[2]}"
        
        # Try pattern 2 (without spaces)
        matches = re.findall(pattern2, text)
        if matches:
            for match in matches:
                if self._is_valid_aadhar(match):
                    # Format with spaces
                    return f"{match[0:4]} {match[4:8]} {match[8:12]}"
        
        # Try to find any sequence of 12 digits (allowing some errors)
        # Remove all non-digit characters
        digits_only = re.sub(r'\D', '', text)
        
        # Look for 12-digit sequences
        for i in range(len(digits_only) - 11):
            candidate = digits_only[i:i+12]
            if self._is_valid_aadhar(candidate):
                return f"{candidate[0:4]} {candidate[4:8]} {candidate[8:12]}"
        
        return None
    
    def _is_valid_aadhar(self, number: str) -> bool:
        """
        Validate Aadhar number.
        
        Args:
            number: Aadhar number string
            
        Returns:
            True if valid format
        """
        # Remove spaces
        clean = number.replace(' ', '')
        
        # Must be exactly 12 digits
        if len(clean) != 12:
            return False
        
        # Must be all digits
        if not clean.isdigit():
            return False
        
        # First digit cannot be 0 or 1 (Aadhar rule)
        if clean[0] in ['0', '1']:
            return False
        
        # Cannot be all same digits (unlikely to be real)
        if len(set(clean)) == 1:
            return False
        
        return True
    
    def extract_with_manual_fallback(self, image_path: str) -> Tuple[Optional[str], str]:
        """
        Extract Aadhar with manual fallback option.
        
        Args:
            image_path: Path to Aadhar card image
            
        Returns:
            Tuple of (aadhar_number, extraction_method)
        """
        # Try automatic extraction
        aadhar = self.extract_aadhar_number(image_path)
        
        if aadhar:
            return aadhar, "AUTO"
        else:
            return None, "MANUAL_REQUIRED"


# Standalone function for simple usage
def extract_aadhar(image_path: str, tesseract_path: Optional[str] = None) -> Optional[str]:
    """
    Simple function to extract Aadhar number.
    
    Args:
        image_path: Path to Aadhar card image
        tesseract_path: Optional path to tesseract executable
        
    Returns:
        Aadhar number or None
    """
    extractor = AadharExtractor(tesseract_path)
    return extractor.extract_aadhar_number(image_path)


if __name__ == "__main__":
    # Test the extractor
    import sys
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        aadhar = extract_aadhar(image_path)
        
        if aadhar:
            print(f"\n✅ Extracted Aadhar: {aadhar}")
        else:
            print("\n❌ Could not extract Aadhar number")
    else:
        print("Usage: python aadhar_extractor.py <image_path>")