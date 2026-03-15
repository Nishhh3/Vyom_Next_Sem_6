# backend/face_search/deduplication.py

from .search_engine import search_similar_faces

# ArcFace typical thresholds
DUPLICATE_THRESHOLD = 0.6
POSSIBLE_THRESHOLD = 1.0

def check_duplicate(embedding):
    matches = search_similar_faces(embedding, k=5)

    duplicates = []
    possible = []

    for m in matches:
        d = m["distance"]

        if d < DUPLICATE_THRESHOLD:
            duplicates.append(m)
        elif d < POSSIBLE_THRESHOLD:
            possible.append(m)

    return {
        "is_duplicate": len(duplicates) > 0,
        "duplicates": duplicates,
        "possible_matches": possible
    }