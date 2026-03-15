# backend/face_search/search_engine.py

from .index_store import FaceIndexStore

store = FaceIndexStore()

def add_face_embedding(embedding, email):
    store.add(embedding, email)
    store.save()

def search_similar_faces(embedding, k=5):
    return store.search(embedding, k)