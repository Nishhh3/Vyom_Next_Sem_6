"""
rag_engine.py
-------------
RAG pipeline for VyomNext Help Center.

- Embeds FAQs using sentence-transformers (all-MiniLM-L6-v2)
- Stores embeddings in FAISS (faq_index.faiss)
- Retrieves top-K relevant FAQs for a user query
- Sends context + query to Groq (llama-3.3-70b-versatile)
- Returns answer + confidence score

Place at: services/rag_engine.py
"""

import os
import re
import json
import pickle
import numpy as np
from typing import Optional

# ── Paths ─────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_DIR  = os.path.join(BASE_DIR, "kyc_database")
INDEX_PATH = os.path.join(INDEX_DIR, "faq_index.faiss")
META_PATH  = os.path.join(INDEX_DIR, "faq_meta.pkl")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = "llama-3.3-70b-versatile"
EMBED_MODEL  = "all-MiniLM-L6-v2"
TOP_K        = 3

# Confidence threshold — below this, suggest raising a ticket
TICKET_THRESHOLD = 0.45


# ── Load embedding model (once) ───────────────────────────────
_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        print("🔄 Loading sentence-transformer model...")
        _embedder = SentenceTransformer(EMBED_MODEL)
        print("✅ Embedding model ready")
    return _embedder


def embed_text(text: str) -> np.ndarray:
    """Embed a single text string into a vector."""
    model = get_embedder()
    emb   = model.encode([text], normalize_embeddings=True)
    return emb[0].astype(np.float32)


def embed_batch(texts: list) -> np.ndarray:
    """Embed a list of strings in one batch."""
    model = get_embedder()
    embs  = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)
    return embs.astype(np.float32)


# ── Build FAISS index from FAQ list ──────────────────────────

def build_index(faqs: list) -> bool:
    """
    Build and save FAISS index from a list of {"q": ..., "a": ...} dicts.
    Called by build_faq_index.py.
    """
    try:
        import faiss
    except ImportError:
        print("❌ faiss-cpu not installed. Run: pip install faiss-cpu")
        return False

    os.makedirs(INDEX_DIR, exist_ok=True)

    print(f"\n📚 Embedding {len(faqs)} FAQs...")
    texts = [f"{faq['q']} {faq['a']}" for faq in faqs]
    matrix = embed_batch(texts)

    dim   = matrix.shape[1]
    index = faiss.IndexFlatIP(dim)   # inner product = cosine after L2 norm
    index.add(matrix)

    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "wb") as f:
        pickle.dump(faqs, f)

    print(f"✅ FAISS index saved → {INDEX_PATH}")
    print(f"✅ Metadata saved   → {META_PATH}")
    print(f"   Total FAQs indexed: {len(faqs)}")
    return True


# ── Load FAISS index ──────────────────────────────────────────

def load_index():
    """Load FAISS index and FAQ metadata from disk."""
    try:
        import faiss
        if not os.path.exists(INDEX_PATH) or not os.path.exists(META_PATH):
            print("⚠️  FAQ index not found. Run: python build_faq_index.py")
            return None, []

        index = faiss.read_index(INDEX_PATH)
        with open(META_PATH, "rb") as f:
            faqs = pickle.load(f)
        return index, faqs
    except Exception as e:
        print(f"❌ load_index error: {e}")
        return None, []


# ── Retrieve relevant FAQs ────────────────────────────────────

def retrieve(query: str, top_k: int = TOP_K) -> list:
    """
    Find top-K most relevant FAQs for a query.
    Returns list of {"faq": {...}, "score": float}
    """
    try:
        import faiss
        index, faqs = load_index()
        if index is None or not faqs:
            return []

        query_emb = embed_text(query).reshape(1, -1)
        scores, indices = index.search(query_emb, top_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if 0 <= idx < len(faqs) and score > 0.2:
                results.append({
                    "faq":   faqs[idx],
                    "score": float(score),
                })
        return results
    except Exception as e:
        print(f"❌ retrieve error: {e}")
        return []


# ── Groq chat ─────────────────────────────────────────────────

def ask_groq(query: str, context_faqs: list, history: list = []) -> dict:
    """
    Send query + retrieved FAQ context to Groq.
    Returns {"answer": str, "confidence": float, "can_resolve": bool, "sources": list}
    """
    if not GROQ_API_KEY:
        return {
            "answer":      "Groq API key not configured. Please set GROQ_API_KEY in your .env file.",
            "confidence":  0.0,
            "can_resolve": False,
            "sources":     [],
        }

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
    except ImportError:
        return {
            "answer":      "Groq package not installed. Run: pip install groq",
            "confidence":  0.0,
            "can_resolve": False,
            "sources":     [],
        }

    # Build context from retrieved FAQs
    avg_score = 0.0
    if context_faqs:
        context_text = "\n\n".join([
            f"Q: {r['faq']['q']}\nA: {r['faq']['a']}"
            for r in context_faqs
        ])
        avg_score = sum(r["score"] for r in context_faqs) / len(context_faqs)
        sources   = [r["faq"]["q"] for r in context_faqs]
    else:
        context_text = "No relevant FAQ found."
        sources      = []

    system_prompt = """You are Aria, VyomNext's friendly AI support assistant.
VyomNext is a unified digital banking platform with KYC verification, multi-bank linking, and secure transactions.

Answer the user's question using ONLY the FAQ context provided below.
Rules:
- Be concise and friendly (under 120 words)
- If the FAQ context directly answers the question, answer confidently
- If the context is not relevant or insufficient, say: "I don't have specific information about this. I'd recommend raising a support ticket so our team can help you directly."
- Never make up information not in the context
- Do not repeat the question back"""

    # Build messages with last 4 turns of history for context
    messages = [{"role": "system", "content": system_prompt}]

    for msg in history[-4:]:
        role = "user" if msg.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": msg.get("message", "")})

    messages.append({
        "role":    "user",
        "content": f"FAQ Context:\n{context_text}\n\nUser Question: {query}",
    })

    try:
        response = client.chat.completions.create(
            model       = GROQ_MODEL,
            messages    = messages,
            temperature = 0.3,
            max_tokens  = 200,
        )
        answer      = response.choices[0].message.content.strip()
        can_resolve = avg_score >= TICKET_THRESHOLD and "support ticket" not in answer.lower()

        return {
            "answer":      answer,
            "confidence":  round(avg_score, 3),
            "can_resolve": can_resolve,
            "sources":     sources,
        }

    except Exception as e:
        print(f"❌ Groq error: {e}")
        return {
            "answer":      "I'm having trouble connecting to the AI service right now. Please try again or raise a support ticket.",
            "confidence":  0.0,
            "can_resolve": False,
            "sources":     [],
        }


# ── Main chat function (called by support_router) ─────────────

def chat_with_rag(query: str, session_history: list = []) -> dict:
    """
    Full RAG pipeline:
    1. Retrieve relevant FAQs from FAISS
    2. Send to Groq with context
    3. Return answer + metadata

    Returns:
        {
            "answer":        str,
            "confidence":    float,
            "can_resolve":   bool,
            "suggest_ticket": bool,
            "sources":       list[str]
        }
    """
    relevant = retrieve(query)
    result   = ask_groq(query, relevant, session_history)
    result["suggest_ticket"] = not result["can_resolve"]
    return result


# ── Department detection ──────────────────────────────────────

def detect_department(text: str) -> str:
    """Use Groq to classify which department should handle this issue."""
    if not GROQ_API_KEY:
        return "General Support"

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)

        response = client.chat.completions.create(
            model    = GROQ_MODEL,
            messages = [{
                "role":    "user",
                "content": f"""Classify this support query into ONE department name. Reply with ONLY the department name, nothing else.

Examples:
- "Can't link SBI account" → Banking & Transactions
- "KYC was rejected" → KYC & Verification
- "App keeps crashing" → Technical Support
- "Update phone number" → Account & Profile
- "Unauthorized transaction" → Security & Fraud
- "Loan eligibility" → Loans & Credit
- "Download statement" → Documents & Reports
- "OTP not received" → Authentication

Query: {text}

Department:"""
            }],
            temperature = 0.1,
            max_tokens  = 20,
        )
        dept = response.choices[0].message.content.strip().split("\n")[0].strip()
        return dept if dept else "General Support"

    except Exception as e:
        print(f"❌ detect_department error: {e}")
        return "General Support"


# ── Priority detection ────────────────────────────────────────

def detect_priority(text: str, department: str) -> str:
    """Detect ticket priority based on keywords and department."""
    lower = text.lower()
    if any(k in lower for k in ["fraud", "unauthorized", "hacked", "stolen", "security breach"]):
        return "CRITICAL"
    if any(k in lower for k in ["money deducted", "payment failed", "refund", "kyc rejected", "account blocked"]):
        return "HIGH"
    if department in ["Security & Fraud", "Banking & Transactions"]:
        return "HIGH"
    if any(k in lower for k in ["how to", "what is", "can i", "question"]):
        return "LOW"
    return "MEDIUM"