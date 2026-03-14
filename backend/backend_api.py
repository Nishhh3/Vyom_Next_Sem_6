# backend_api.py
# FINAL STABLE VERSION — SilentFace + InsightFace + Admin + FAISS (v3.2 + JWT) + Loan Recommendation + Gemini AI Advisor + DigiLocker

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import os
import cv2
import json
import shutil
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional

from face_search.search_engine import add_face_embedding
from face_auth_pipeline import verify_face_image
from insightface.app import FaceAnalysis

from email_utils import send_activation_email, send_rejection_email

from face_config import FACE_MATCH_THRESHOLD
from security_utils import encrypt_data
from ocr_utils.aadhar_extractor import mask_aadhar
import requests

# =========================
# DB
# =========================
try:
    import db
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

# =========================
# OCR
# =========================
try:
    from ocr_utils import extract_aadhar as extract_aadhar_number
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# =========================
# AUTH (JWT + REFRESH)
# =========================
try:
    from auth_utils import (
        create_access_token,
        create_refresh_token,
        set_refresh_cookie,
        clear_refresh_cookie,
        get_current_user,
        require_admin,
        refresh_access_token,
        logout as logout_logic,
    )
    AUTH_AVAILABLE = True
except ImportError as e:
    print("Auth utils not available:", e)
    AUTH_AVAILABLE = False

# =========================
# LOAN RECOMMENDATION
# =========================
try:
    from loan_recommendation.predictor import predict_loan
    LOAN_MODEL_AVAILABLE = True
    print("✅ Loan recommendation models loaded")
except ImportError as e:
    print("Loan models not available:", e)
    LOAN_MODEL_AVAILABLE = False

# =========================
# GROQ AI
# =========================
try:
    from groq import Groq
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    if GROQ_API_KEY:
        groq_client = Groq(api_key=GROQ_API_KEY)
        GROQ_AVAILABLE = True
        print("✅ Groq AI loaded")
    else:
        GROQ_AVAILABLE = False
        print("⚠️  GROQ_API_KEY not set")
except ImportError:
    GROQ_AVAILABLE = False
    print("⚠️  groq package not installed. Run: pip install groq")

# =========================
# DIGILOCKER
# =========================
try:
    from digilocker_service import router as digilocker_router, init_digilocker_db
    DIGILOCKER_AVAILABLE = True
    print("✅ DigiLocker service loaded")
except ImportError as e:
    DIGILOCKER_AVAILABLE = False
    print("⚠️  DigiLocker service not available:", e)


# Bank router
try:
    from bank_router import router as bank_router
    BANK_AVAILABLE = True
    print("✅ Bank router loaded")
except ImportError as e:
    BANK_AVAILABLE = False
    print("⚠️  Bank router not available:", e)
 

# =========================
# APP INIT
# =========================
app = FastAPI(title="KYC Verification API", version="3.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
REPORT_FOLDER = "verification_reports"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REPORT_FOLDER, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

# =========================
# DIGILOCKER INIT + MOUNT
# =========================
if DIGILOCKER_AVAILABLE:
    init_digilocker_db()
    app.include_router(digilocker_router)
    print("✅ DigiLocker routes mounted at /api/digilocker")

if BANK_AVAILABLE:
    app.include_router(bank_router)
    print("✅ Bank routes mounted at /api/bank")

# =========================
# LOAD INSIGHTFACE ONCE
# =========================
print("🔄 Loading InsightFace...")
face_model = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
face_model.prepare(ctx_id=0, det_size=(640, 640))
print("✅ InsightFace ready")

# =========================
# UTILS
# =========================
def require_db():
    if not DB_AVAILABLE:
        raise HTTPException(500, "Database not available")

def safe_email(email: str) -> str:
    return email.replace("@", "_").replace(".", "_")

def file_to_url(path: Optional[str]):
    if not path:
        return None
    return f"http://127.0.0.1:8000/uploads/{os.path.basename(path)}"

def save_report(email: str, data: dict):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = f"{REPORT_FOLDER}/{safe_email(email)}_{ts}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return path

def load_latest_report(email: str):
    report_dir = Path(REPORT_FOLDER)
    if not report_dir.exists():
        return None
    files = sorted(report_dir.glob(f"{safe_email(email)}_*.json"), reverse=True)
    if not files:
        return None
    try:
        with open(files[0], "r") as f:
            return json.load(f)
    except Exception:
        return None

# =========================
# ROOT
# =========================
@app.get("/")
async def root():
    return {"message": "KYC API running", "version": "3.2"}

# =========================
# VERIFY KYC
# =========================
@app.post("/api/verify")
async def verify_kyc(
    email: str = Form(...),
    id_document: UploadFile = File(...),
    webcam_image: UploadFile = File(...),
    phone: Optional[str] = Form(None),      # ← ADD
):
    require_db()

    allowed = {".jpg", ".jpeg", ".png"}
    if Path(id_document.filename).suffix.lower() not in allowed:
        raise HTTPException(400, "Invalid document type")
    if Path(webcam_image.filename).suffix.lower() not in allowed:
        raise HTTPException(400, "Invalid webcam type")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = safe_email(email)

    doc_path = f"{UPLOAD_FOLDER}/{safe}_{ts}_doc.jpg"
    cam_path = f"{UPLOAD_FOLDER}/{safe}_{ts}_webcam.jpg"

    with open(doc_path, "wb") as f:
        shutil.copyfileobj(id_document.file, f)
    with open(cam_path, "wb") as f:
        shutil.copyfileobj(webcam_image.file, f)

    raw_aadhar = None
    encrypted_aadhar = None
    masked_aadhar = None

    if OCR_AVAILABLE:
        try:
            raw_aadhar = extract_aadhar_number(doc_path)
            if not raw_aadhar:
                raise HTTPException(400, "Invalid or unreadable Aadhaar document")
            if raw_aadhar:
                clean = raw_aadhar.replace(" ", "")
                encrypted_aadhar = encrypt_data(clean)
                masked_aadhar = mask_aadhar(raw_aadhar)
        except Exception as e:
            print("Aadhaar extraction error:", e)

    with open(cam_path, "rb") as f:
        live_bytes = f.read()

    face_result = verify_face_image(live_bytes)

    if face_result["status"] == "no_face":
        raise HTTPException(400, "No face detected")
    if face_result["status"] == "spoof":
        raise HTTPException(400, "Spoof detected")

    live_embedding = np.array(face_result["embedding"], dtype=np.float32)
    live_embedding /= max(np.linalg.norm(live_embedding), 1e-6)

    doc_img = cv2.imread(doc_path)
    faces = face_model.get(doc_img)

    if not faces:
        raise HTTPException(400, "No face in document")

    doc_embedding = faces[0].normed_embedding.astype(np.float32)
    doc_embedding /= max(np.linalg.norm(doc_embedding), 1e-6)

    similarity = float(np.dot(live_embedding, doc_embedding))
    confidence = similarity * 100
    distance = 1 - similarity
    match = similarity >= FACE_MATCH_THRESHOLD

    risk_score = float(
        distance * 100 * 0.6 +
        (1 - face_result["liveness"]) * 40
    )

    try:
        db.insert_signup(
            email=email,
            doc_path=doc_path,
            capture_path=cam_path,
            aadhar_number=encrypted_aadhar,
            webcam_path=cam_path,
            face_embedding=[float(x) for x in live_embedding],
            phone=phone,                     # ← ADD
        )
    except Exception as e:
        print("DB insert error:", e)

    try:
        add_face_embedding(live_embedding, email)
    except Exception as e:
        print("FAISS add error:", e)

    report = {
        "email": email,
        "timestamp": datetime.now().isoformat(),
        "aadhar_number": masked_aadhar,
        "face_match": {
            "match": match,
            "confidence": confidence,
            "distance": distance,
            "threshold": FACE_MATCH_THRESHOLD,
        },
        "risk_score": risk_score,
        "liveness": float(face_result["liveness"]),
        "texture": float(face_result["texture"]),
        "embedding_size": len(live_embedding),
        "images": {
            "document_url": file_to_url(doc_path),
            "webcam_url": file_to_url(cam_path),
        },
    }

    report_path = save_report(email, report)

    return {
        "success": True,
        "match": match,
        "confidence": confidence,
        "distance": distance,
        "risk_score": risk_score,
        "report_path": report_path,
    }

# =========================
# STATUS
# =========================
@app.get("/api/status")
async def api_status(email: str):
    require_db()
    st = db.get_signup_status(email)
    return {"success": bool(st), "status": st}

# =========================
# PASSWORD LOGIN (JWT)
# =========================
@app.post("/api/login/password")
async def login_password(
    user_id: str = Form(...),
    password: str = Form(...),
    response: Response = None,
):
    require_db()

    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT email, status, password FROM kyc_users WHERE user_id=%s", (user_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, "User not found")

    email, status, stored_password = row

    if status != "ACCEPTED":
        raise HTTPException(403, "Account not active")
    if password != stored_password:
        raise HTTPException(401, "Invalid password")

    user = {"user_id": user_id, "email": email, "status": status}

    if not AUTH_AVAILABLE or response is None:
        return {"success": True, "user_id": user_id, "email": email}

    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    set_refresh_cookie(response, refresh_token)

    return {
        "success": True,
        "user_id": user_id,
        "email": email,
        "access_token": access_token,
        "token_type": "bearer",
    }

# =========================
# FACE LOGIN (JWT)
# =========================
@app.post("/api/login/face")
async def login_face(
    user_id: str = Form(...),
    webcam_image: UploadFile = File(...),
    response: Response = None,
):
    require_db()

    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, email, status, face_embedding FROM kyc_users WHERE user_id=%s", (user_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, "User not found")
    if row[2] != "ACCEPTED":
        raise HTTPException(403, "Account not active")

    stored_embedding = row[3]
    if not stored_embedding:
        raise HTTPException(400, "No face registered")

    image_bytes = await webcam_image.read()
    face_result = verify_face_image(image_bytes)

    if face_result["status"] == "no_face":
        raise HTTPException(401, "No face detected")
    if face_result["status"] == "spoof":
        raise HTTPException(401, "Spoof detected")

    live_embedding = np.array(face_result["embedding"], dtype=np.float32)
    db_embedding = np.array(stored_embedding, dtype=np.float32)

    live_embedding /= max(np.linalg.norm(live_embedding), 1e-6)
    db_embedding /= max(np.linalg.norm(db_embedding), 1e-6)

    similarity = float(np.dot(live_embedding, db_embedding))
    confidence = similarity * 100

    if similarity < FACE_MATCH_THRESHOLD:
        raise HTTPException(401, "Face mismatch")

    user = {"user_id": user_id, "email": row[1], "status": "ACCEPTED"}

    if not AUTH_AVAILABLE or response is None:
        return {"success": True, "user_id": user_id, "confidence": confidence}

    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    set_refresh_cookie(response, refresh_token)

    return {
        "success": True,
        "user_id": user_id,
        "access_token": access_token,
        "token_type": "bearer",
        "confidence": confidence,
    }

# =========================
# AUTH REFRESH
# =========================
@app.post("/api/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    if not AUTH_AVAILABLE:
        raise HTTPException(500, "Auth not available")
    return await refresh_access_token(request, response)

# =========================
# AUTH LOGOUT
# =========================
@app.post("/api/auth/logout")
async def logout_endpoint(request: Request, response: Response):
    if not AUTH_AVAILABLE:
        clear_refresh_cookie(response)
        return {"success": True}
    return await logout_logic(request, response)

# =========================
# CURRENT USER
# =========================
@app.get("/api/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": {
            "user_id": current_user.get("user_id"),
            "email": current_user.get("email"),
            "status": current_user.get("status"),
        },
    }

# =========================
# ADMIN APIs
# =========================
@app.get("/api/admin/kyc-users")
async def admin_list_kyc_users(status: Optional[str] = None):
    require_db()
    conn = db.get_conn()
    cur = conn.cursor()
    if status:
        cur.execute("SELECT id, email, aadhar_number, user_id, status, created_at FROM kyc_users WHERE status=%s", (status,))
    else:
        cur.execute("SELECT id, email, aadhar_number, user_id, status, created_at FROM kyc_users")
    rows = cur.fetchall()
    conn.close()
    users = [{"id": r[0], "email": r[1], "aadhar_number": r[2], "user_id": r[3], "status": r[4], "created_at": r[5]} for r in rows]
    return {"success": True, "users": users}

@app.get("/api/admin/kyc-users/metrics")
async def admin_metrics():
    require_db()
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM kyc_users")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM kyc_users WHERE status='ACCEPTED'")
    accepted = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM kyc_users WHERE status='REJECTED'")
    rejected = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM kyc_users WHERE status='PENDING'")
    pending = cur.fetchone()[0]
    conn.close()
    return {"success": True, "metrics": {"total": total, "accepted": accepted, "rejected": rejected, "pending": pending}}

@app.post("/api/admin/kyc-users/{user_id}/accept")
async def admin_accept_kyc(user_id: int):
    require_db()
    conn = db.get_conn()
    cur = conn.cursor()
    new_user_id = f"VYOM{user_id:05d}"
    password = os.urandom(4).hex()
    cur.execute(
        "UPDATE kyc_users SET status='ACCEPTED', user_id=%s, password=%s WHERE id=%s RETURNING email",
        (new_user_id, password, user_id),
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        raise HTTPException(404, "User not found")
    email_sent = False
    try:
        email_sent = send_activation_email(row[0], new_user_id, password)
    except Exception as e:
        print("Email send error:", e)
    return {"success": True, "user_id": new_user_id, "password": password, "email_sent": email_sent}

@app.post("/api/admin/kyc-users/{user_id}/reject")
async def admin_reject_kyc(user_id: int, payload: dict):
    require_db()
    reason = payload.get("reason")
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE kyc_users SET status='REJECTED' WHERE id=%s RETURNING email", (user_id,))
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        raise HTTPException(404, "User not found")
    try:
        send_rejection_email(row[0], reason)
    except Exception as e:
        print("Reject email error:", e)
    return {"success": True, "reason": reason}

@app.post("/api/admin/kyc-users/{user_id}/pending")
async def admin_reset_pending(user_id: int):
    require_db()
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE kyc_users SET status='PENDING' WHERE id=%s", (user_id,))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/api/admin/kyc-users/{user_id}")
async def admin_get_kyc_user(user_id: int):
    require_db()
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, email, aadhar_number, user_id, status, doc_path, capture_path, webcam_path, created_at FROM kyc_users WHERE id=%s",
        (user_id,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "User not found")
    email = row[1]
    verification_report = load_latest_report(email)
    user = {
        "id": row[0], "email": email, "aadhar_number": row[2], "user_id": row[3],
        "status": row[4], "document_url": file_to_url(row[5]), "capture_url": file_to_url(row[6]),
        "webcam_url": file_to_url(row[7]), "created_at": row[8],
    }
    return {"success": True, "user": user, "verification_report": verification_report}

# =========================
# ADMIN — AADHAAR FORGERY ANALYSIS
# =========================
@app.get("/api/admin/analyze-document/{user_id}")
async def admin_analyze_document(user_id: int):
    require_db()
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT doc_path FROM kyc_users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    conn.close()
    if not row or not row[0]:
        raise HTTPException(404, "Document not found for user")
    doc_path = row[0]
    if not os.path.exists(doc_path):
        raise HTTPException(404, "Document file missing on disk")
    try:
        with open(doc_path, "rb") as f:
            response = requests.post("http://127.0.0.1:9000/analyze", files={"file": f}, timeout=10)
        if response.status_code != 200:
            raise HTTPException(500, f"Forgery service error: {response.text}")
        result = response.json()
    except requests.exceptions.ConnectionError:
        raise HTTPException(500, "Forgery service not running (port 9000)")
    except requests.exceptions.Timeout:
        raise HTTPException(500, "Forgery service timeout")
    except Exception as e:
        print("Forgery analysis error:", e)
        raise HTTPException(500, "Forgery analysis failed")
    forgery_probability = float(result.get("forgery_probability", 0.0))
    is_forged = bool(result.get("is_forged", forgery_probability >= 0.5))
    return {"success": True, "forgery_probability": forgery_probability, "is_forged": is_forged}


# =========================
# LOAN RECOMMENDATION
# =========================

class LoanRequest(BaseModel):
    age: int
    employment_type: str
    monthly_income: float
    credit_score: int
    savings: float
    existing_loan: str
    loan_purpose: str
    requested_amount: float
    tenure_years: int
    collateral: str


@app.post("/api/loan/predict")
async def loan_predict(data: LoanRequest):
    if not LOAN_MODEL_AVAILABLE:
        raise HTTPException(500, "Loan recommendation models not loaded")
    result = predict_loan(data.model_dump())
    return {
        "success": True,
        "predicted_status": result["predicted_status"],
        "probabilities": result["probabilities"],
        "estimated_amount": result["estimated_amount"],
    }


# =========================
# GROQ AI LOAN ADVISOR
# =========================

class AIAdviceRequest(BaseModel):
    result: dict
    formData: dict


@app.post("/api/loan/ai-advice")
async def loan_ai_advice(payload: AIAdviceRequest):
    if not GROQ_AVAILABLE:
        raise HTTPException(503, "Groq AI is not configured. Set GROQ_API_KEY environment variable.")

    r = payload.result
    f = payload.formData

    # Safe value extraction — no crash if any field is None
    age             = r.get("age") or f.get("age", "N/A")
    emp_type        = f.get("employment_type", "N/A")
    monthly_income  = f.get("monthly_income", 0)
    credit_score    = f.get("credit_score", "N/A")
    savings         = f.get("savings", 0)
    existing_loan   = f.get("existing_loan", "N/A")
    loan_purpose    = f.get("loan_purpose", "N/A")
    requested_amt   = f.get("requested_amount", 0)
    tenure          = f.get("tenure_years", "N/A")
    collateral      = f.get("collateral", "N/A")
    status          = r.get("status", "N/A")
    recommended_amt = r.get("recommendedAmount", 0)
    risk_level      = r.get("riskLevel", "N/A")
    probability     = r.get("probability", 0)

    prompt = f"""
You are an expert Indian bank loan advisor. A customer submitted a loan application and received an ML prediction.
Based on their profile and result, provide personalized, practical advice.

=== CUSTOMER PROFILE ===
Age: {age}
Employment Type: {emp_type}
Monthly Income: Rs {monthly_income}
Credit Score: {credit_score}
Savings: Rs {savings}
Existing Loan: {existing_loan}
Loan Purpose: {loan_purpose}
Requested Amount: Rs {requested_amt}
Tenure: {tenure} years
Collateral Available: {collateral}

=== ML MODEL PREDICTION ===
Status: {status}
Estimated Approved Amount: Rs {recommended_amt}
Risk Level: {risk_level}
Approval Probability: {probability}%

=== YOUR TASK ===
Respond ONLY with a valid JSON object. No markdown, no backticks, no extra text outside JSON.

The JSON must have exactly these 4 keys:
1. "summary" - 2-3 sentence personalized summary of their situation and prediction.
2. "documents" - list of 6-8 specific documents needed for a "{loan_purpose}" loan in India.
3. "steps" - list of 4-6 clear next steps to proceed or improve their application.
4. "tips" - list of 3-5 specific tips to improve approval chances based on their weak points.

Example format:
{{
  "summary": "...",
  "documents": ["...", "..."],
  "steps": ["...", "..."],
  "tips": ["...", "..."]
}}
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        advice = json.loads(raw)
        return {"success": True, "advice": advice}

    except json.JSONDecodeError as e:
        print("Groq JSON parse error:", e)
        raise HTTPException(500, "AI response could not be parsed. Try again.")
    except Exception as e:
        print("Groq error:", e)
        raise HTTPException(500, f"Groq AI error: {str(e)}")