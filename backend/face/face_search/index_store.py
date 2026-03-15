# backend/face_search/index_store.py

import os
import numpy as np
import faiss

INDEX_DIR = "kyc_database"
INDEX_PATH = os.path.join(INDEX_DIR, "face_index.faiss")
META_PATH = os.path.join(INDEX_DIR, "face_meta.npy")
DIM = 512  # ArcFace embedding size


class FaceIndexStore:
    def __init__(self):
        os.makedirs(INDEX_DIR, exist_ok=True)

        self.index = None
        self.meta = []

        self._load_or_create()

    # =========================
    # SAFE LOAD
    # =========================
    def _load_or_create(self):
        if os.path.exists(INDEX_PATH):
            try:
                self.index = faiss.read_index(INDEX_PATH)
                print("✅ FAISS index loaded")
            except Exception:
                print("⚠️ FAISS index corrupted → rebuilding")
                self.index = faiss.IndexFlatL2(DIM)
        else:
            print("ℹ️ Creating new FAISS index")
            self.index = faiss.IndexFlatL2(DIM)

        # Load meta safely
        if os.path.exists(META_PATH):
            try:
                self.meta = np.load(META_PATH, allow_pickle=True).tolist()
                print("✅ FAISS meta loaded")
            except Exception:
                print("⚠️ FAISS meta corrupted → reset")
                self.meta = []
        else:
            self.meta = []

        # Ensure size consistency
        if self.index.ntotal != len(self.meta):
            print("⚠️ FAISS/meta mismatch → reset meta")
            self.meta = [{"email": None}] * self.index.ntotal

    # =========================
    # ADD
    # =========================
    def add(self, embedding: np.ndarray, email: str):
        emb = np.array([embedding]).astype("float32")
        self.index.add(emb)
        self.meta.append({"email": email})

    # =========================
    # SEARCH
    # =========================
    def search(self, embedding: np.ndarray, k=5):
        if self.index.ntotal == 0:
            return []

        emb = np.array([embedding]).astype("float32")
        D, I = self.index.search(emb, k)

        results = []
        for dist, idx in zip(D[0], I[0]):
            if idx < len(self.meta):
                results.append({
                    "email": self.meta[idx]["email"],
                    "distance": float(dist)
                })
        return results

    # =========================
    # SAVE
    # =========================
    def save(self):
        faiss.write_index(self.index, INDEX_PATH)
        np.save(META_PATH, self.meta)