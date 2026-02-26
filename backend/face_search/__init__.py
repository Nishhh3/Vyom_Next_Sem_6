"""
Face Search Module
Biometric FAISS index + duplicate detection for KYC system.
"""

from .search_engine import add_face_embedding, search_similar_faces
from .deduplication import check_duplicate

__all__ = [
    "add_face_embedding",
    "search_similar_faces",
    "check_duplicate",
]