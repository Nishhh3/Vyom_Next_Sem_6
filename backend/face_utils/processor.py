import cv2
import numpy as np
from mtcnn import MTCNN
from typing import Optional, Tuple
import os


class FaceProcessor:
    """Detect, extract and enhance faces from images."""

    def __init__(self):
        """Initialize the face processor with MTCNN detector."""
        self.detector = MTCNN()
        print("✅ Face Processor initialized")

    def detect_faces(self, image_path: str) -> Tuple:
        """
        Detect all faces in an image.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Tuple of (faces_list, image) or (None, None) if image can't be read
        """
        img = cv2.imread(image_path)
        if img is None:
            return None, None

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces = self.detector.detect_faces(rgb_img)
        return faces, img

    def extract_face(self, image_path: str, padding: int = 20) -> Optional[Tuple]:
        """
        Extract the best quality face from image.
        
        Args:
            image_path: Path to the image file
            padding: Padding around detected face in pixels
            
        Returns:
            Tuple of (face_image, face_info) or None if no face detected
        """
        faces, img = self.detect_faces(image_path)

        if not faces or len(faces) == 0:
            return None

        # Get face with highest confidence
        best_face = max(faces, key=lambda x: x['confidence'])

        # Extract with padding
        x, y, w, h = best_face['box']
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = w + 2 * padding
        h = h + 2 * padding

        # Ensure coordinates are within image bounds
        img_h, img_w = img.shape[:2]
        x2 = min(x + w, img_w)
        y2 = min(y + h, img_h)

        face_img = img[y:y2, x:x2]
        return face_img, best_face

    def enhance_face(self, face_img: np.ndarray,
                    target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
        """
        Enhance face image quality for better matching.
        
        Args:
            face_img: Face image as numpy array
            target_size: Target size for the output image
            
        Returns:
            Enhanced face image
        """
        h, w = face_img.shape[:2]

        # Upscale for better quality
        upscaled = cv2.resize(face_img, (w * 4, h * 4), 
                             interpolation=cv2.INTER_CUBIC)

        # Denoise
        denoised = cv2.fastNlMeansDenoisingColored(
            upscaled, None, 10, 10, 7, 21
        )

        # Enhance contrast using CLAHE
        lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

        # Sharpen
        kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)

        # Resize to target
        final = cv2.resize(sharpened, target_size, 
                          interpolation=cv2.INTER_LANCZOS4)
        return final