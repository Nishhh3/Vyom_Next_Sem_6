# backend_api.py
# FastAPI implementation for KYC verification system

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body, Response, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from datetime import datetime
import json
from pathlib import Path
import shutil
from typing import Optional, Literal, Any
import base64
import uuid
from auth_utils import get_current_user


# Import your existing modules
try:
    from face_utils import BankingKYCPipeline
    FACE_UTILS_AVAILABLE = True
except ImportError as e:
    print(f"Error importing face_utils: {e}")
    FACE_UTILS_AVAILABLE = False

try:
    import db
    DB_AVAILABLE = True
except ImportError as e:
    print(f"Error importing database module: {e}")
    DB_AVAILABLE = False

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
    print(f"Error importing auth_utils: {e}")
    AUTH_AVAILABLE = False

try:
    from ocr_utils import extract_aadhar as extract_aadhar_number
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("OCR utilities not available - Aadhar extraction disabled")

# DeepFace is optional (used for face-login).
try:
    from deepface import DeepFace  # type: ignore
    DEEPFACE_AVAILABLE = True
except Exception as e:
    print(f"⚠️ DeepFace not available (face login disabled): {e}")
    DEEPFACE_AVAILABLE = False

# Initialize FastAPI app
app = FastAPI(
    title="KYC Verification API",
    description="Face verification system for banking KYC",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = "uploads"
VERIFICATION_REPORTS = "verification_reports"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(VERIFICATION_REPORTS, exist_ok=True)

def _get_email_utils():
    """
    Import email utilities safely.
    email_utils.py may raise if SMTP env vars are missing.
    """
    try:
        from email_utils import send_activation_email, send_rejection_email
        return send_activation_email, send_rejection_email
    except Exception as e:
        print(f"⚠️ Email utilities not available: {e}")
        return None, None

def _blob_to_data_url(blob: Optional[bytes], mime: str = "image/jpeg") -> Optional[str]:
    if not blob:
        return None
    b64 = base64.b64encode(bytes(blob)).decode("utf-8")
    return f"data:{mime};base64,{b64}"

def _load_latest_verification_report(email: str) -> Optional[dict]:
    try:
        if not email:
            return None
        report_dir = VERIFICATION_REPORTS
        if not os.path.exists(report_dir):
            return None

        email_prefix = email.replace("@", "_")
        reports = [
            f
            for f in os.listdir(report_dir)
            if f.startswith(email_prefix) and f.endswith(".json")
        ]
        if not reports:
            return None
        reports.sort(reverse=True)
        report_path = os.path.join(report_dir, reports[0])
        with open(report_path, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading verification report: {e}")
        return None

def convert_to_serializable(obj):
    """Convert NumPy types to native Python types"""
    import numpy as np
    
    if isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    else:
        return obj

def save_verification_report(email: str, report_data: dict) -> Optional[str]:
    """Save verification report as JSON"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = f"{VERIFICATION_REPORTS}/{email.replace('@', '_')}_{timestamp}.json"
        
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        return report_path
    except Exception as e:
        print(f"Error saving report: {e}")
        return None

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "KYC Verification API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "face_utils": FACE_UTILS_AVAILABLE,
        "database": DB_AVAILABLE,
        "ocr": OCR_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/verify")
async def verify_kyc(
    email: str = Form(...),
    id_document: UploadFile = File(...),
    webcam_image: UploadFile = File(...),
    enhance_document: bool = Form(True),
    enhance_webcam: bool = Form(True)
):
    """
    Main KYC verification endpoint
    
    Args:
        email: User's email address
        id_document: Uploaded Aadhar/ID document image
        webcam_image: Captured webcam image
        enhance_document: Whether to enhance document image
        enhance_webcam: Whether to enhance webcam image
    
    Returns:
        Verification result with match status, confidence, and other metrics
    """
    try:
        # Check if required modules are available
        if not FACE_UTILS_AVAILABLE or not DB_AVAILABLE:
            raise HTTPException(
                status_code=500,
                detail="Required modules not available"
            )

        # Validate file types
        allowed_extensions = {'.jpg', '.jpeg', '.png'}
        doc_ext = Path(id_document.filename).suffix.lower()
        webcam_ext = Path(webcam_image.filename).suffix.lower()
        
        if doc_ext not in allowed_extensions or webcam_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only JPG, JPEG, and PNG are allowed"
            )
        
        # Generate unique filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_email = email.replace('@', '_').replace('.', '_')
        
        doc_filename = f"{safe_email}_{timestamp}_doc{doc_ext}"
        webcam_filename = f"{safe_email}_{timestamp}_webcam{webcam_ext}"
        
        doc_path = os.path.join(UPLOAD_FOLDER, doc_filename)
        webcam_path = os.path.join(UPLOAD_FOLDER, webcam_filename)
        
        # Save uploaded files
        with open(doc_path, "wb") as buffer:
            shutil.copyfileobj(id_document.file, buffer)
        
        with open(webcam_path, "wb") as buffer:
            shutil.copyfileobj(webcam_image.file, buffer)
        
        # Extract Aadhar number if OCR is available
        aadhar_number = None
        if OCR_AVAILABLE:
            try:
                aadhar_number = extract_aadhar_number(doc_path)
            except Exception as e:
                print(f"Aadhar extraction failed: {e}")
        
        # Initialize pipeline and run verification
        pipeline = BankingKYCPipeline()
        
        # Verify using saved images
        result = pipeline.verify_with_saved_images(
            id_document_path=doc_path,
            webcam_image_path=webcam_path,
            model='ArcFace',
            enhance_document=enhance_document,
            enhance_webcam=enhance_webcam
        )
        
        # Convert result to serializable format
        result = convert_to_serializable(result)
        
        # Prepare verification report
        verification_report = {
            'email': email,
            'timestamp': datetime.now().isoformat(),
            'aadhar_number': aadhar_number,
            'verification_result': result,
            'file_paths': {
                'document': doc_path,
                'webcam': webcam_path
            },
            'settings': {
                'model': 'ArcFace',
                'enhance_document': enhance_document,
                'enhance_webcam': enhance_webcam
            }
        }
        
        # Save verification report
        report_path = save_verification_report(email, verification_report)
        
        # Save to database
        try:
            db_success = db.insert_signup(
                email=email,
                doc_path=doc_path,
                capture_path=webcam_path,
                aadhar_number=aadhar_number,
                webcam_path=webcam_path
            )
            
            if not db_success:
                print("Warning: Failed to save to database")
        except Exception as e:
            print(f"Database error: {e}")
            # Continue even if database save fails
        
        # Return success response
        return {
            "success": True,
            "verification": result,
            "aadhar_number": aadhar_number,
            "report_path": report_path,
            "message": "KYC verification completed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Verification error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )

@app.post("/api/login/password")
async def login_password(payload: dict = Body(...), response: Response = None):
    """
    Login with credentials (user_id or email + password).
    """
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="Database module not available")

    identifier = (payload.get("identifier") or payload.get("username") or payload.get("user_id") or payload.get("email") or "").strip()
    password = (payload.get("password") or "").strip()

    if not identifier or not password:
        raise HTTPException(status_code=400, detail="identifier and password are required")

    try:
        if "@" in identifier:
            user = db.get_user_by_email(identifier)
        else:
            user = db.get_user_by_userid(identifier)

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if user.get("status") != "ACCEPTED":
            raise HTTPException(status_code=403, detail=f"Account not activated (status: {user.get('status')})")

        if user.get("password") != password:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Existing login logic above remains unchanged.
        # JWT generation happens only after successful authentication.
        if not AUTH_AVAILABLE or response is None:
            return {
                "success": True,
                "email": user.get("email"),
                "user_id": user.get("user_id"),
            }

        access_token = create_access_token(user)
        refresh_token = create_refresh_token(user)
        set_refresh_cookie(response, refresh_token)

        return {
            "success": True,
            "email": user.get("email"),
            "user_id": user.get("user_id"),
            "access_token": access_token,
            "token_type": "bearer",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.post("/api/login/face")
async def login_face(
    user_id: str = Form(...),
    webcam_image: UploadFile = File(...),
    response: Response = None,
):
    """
    Login with face authentication.
    """
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="Database module not available")

    if not DEEPFACE_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="DeepFace not installed/configured on backend.",
        )

    safe_user_id = (user_id or "").strip()
    if not safe_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    allowed_extensions = {".jpg", ".jpeg", ".png"}
    ext = Path(webcam_image.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPG, JPEG, and PNG are allowed",
        )

    try:
        # Fetch user
        user = db.get_user_by_userid(safe_user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.get("status") != "ACCEPTED":
            raise HTTPException(
                status_code=403,
                detail=f"Account not activated (status: {user.get('status')})",
            )

        registration_image_path = user.get("capture_path") or user.get("registration_capture")
        if not registration_image_path or not os.path.exists(registration_image_path):
            raise HTTPException(
                status_code=500,
                detail="Registration capture not found for this user",
            )

        # Save login image
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"login_{safe_user_id}_{ts}_{uuid.uuid4().hex}{ext}"
        login_capture_path = os.path.join(UPLOAD_FOLDER, filename)

        with open(login_capture_path, "wb") as buffer:
            shutil.copyfileobj(webcam_image.file, buffer)

        # Face verification
        result = DeepFace.verify(
            img1_path=registration_image_path,
            img2_path=login_capture_path,
            model_name="ArcFace",
            enforce_detection=False,
        )

        # Cleanup
        try:
            if os.path.exists(login_capture_path):
                os.remove(login_capture_path)
        except Exception:
            pass

        verified = bool(result.get("verified", False))
        if not verified:
            raise HTTPException(status_code=401, detail="Face verification failed")

        # If JWT not configured
        if not AUTH_AVAILABLE or response is None:
            return {
                "success": True,
                "email": user.get("email"),
                "user_id": user.get("user_id"),
                "verification": {
                    "verified": verified,
                    "distance": result.get("distance"),
                    "threshold": result.get("threshold"),
                    "model": result.get("model"),
                },
            }

        # JWT generation
        access_token = create_access_token(user)
        refresh_token = create_refresh_token(user)
        set_refresh_cookie(response, refresh_token)

        return {
            "success": True,
            "email": user.get("email"),
            "user_id": user.get("user_id"),
            "access_token": access_token,
            "token_type": "bearer",
            "verification": {
                "verified": verified,
                "distance": result.get("distance"),
                "threshold": result.get("threshold"),
                "model": result.get("model"),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face login failed: {str(e)}")


@app.post("/api/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    """
    Refresh access token using refresh token cookie (with rotation).
    """
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Auth module not available")
    return await refresh_access_token(request, response)


@app.post("/api/auth/logout")
async def logout_endpoint(request: Request, response: Response):
    """
    Logout and invalidate refresh token.
    """
    if not AUTH_AVAILABLE:
        # Even if auth utils are unavailable, clear the cookie best-effort.
        response = response or Response()
        clear_refresh_cookie(response)
        return {"success": True}
    return await logout_logic(request, response)


@app.get("/api/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Example protected route using get_current_user dependency.
    """
    return {
        "success": True,
        "user": {
            "email": current_user.get("email"),
            "user_id": current_user.get("user_id"),
            "status": current_user.get("status"),
            "role": current_user.get("role", "user"),
        },
    }


@app.get("/api/admin/protected")
async def admin_protected_route(current_admin: dict = Depends(require_admin)):
    """
    Example admin-only protected route using require_admin dependency.
    """
    return {
        "success": True,
        "message": "Admin access granted",
        "admin_user_id": current_admin.get("user_id"),
    }


@app.get("/api/status")
async def check_status(email: str):
    """
    Check KYC status for an email
    
    Args:
        email: User's email address
    
    Returns:
        Current verification status
    """
    try:
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        if not DB_AVAILABLE:
            raise HTTPException(
                status_code=500,
                detail="Database module not available"
            )
        
        # Query database for status
        status = db.get_signup_status(email)
        
        if status:
            return {
                "success": True,
                "status": status
            }
        else:
            return {
                "success": False,
                "message": "No registration found for this email"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Status check error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check status: {str(e)}"
        )

@app.get("/api/admin/kyc-users")
async def admin_list_kyc_users(status: Optional[Literal["PENDING", "ACCEPTED", "REJECTED"]] = None):
    """
    Admin: list KYC users (optionally filtered by status).
    """
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="Database module not available")
    try:
        from psycopg2.extras import RealDictCursor
        conn = db.get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if status:
            cur.execute(
                """
                SELECT id, email, aadhar_number, user_id, status, email_sent, created_at, updated_at
                FROM kyc_users
                WHERE status=%s
                ORDER BY created_at DESC
                """,
                (status,),
            )
        else:
            cur.execute(
                """
                SELECT id, email, aadhar_number, user_id, status, email_sent, created_at, updated_at
                FROM kyc_users
                ORDER BY created_at DESC
                """
            )

        users = [dict(r) for r in cur.fetchall()]
        conn.close()

        return {"success": True, "users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load users: {str(e)}")

@app.get("/api/admin/kyc-users/metrics")
async def admin_kyc_metrics():
    """
    Admin: counts for dashboard cards.
    """
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="Database module not available")
    try:
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
        return {
            "success": True,
            "metrics": {
                "total": total,
                "accepted": accepted,
                "rejected": rejected,
                "pending": pending,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load metrics: {str(e)}")

@app.get("/api/admin/kyc-users/{user_id}")
async def admin_get_kyc_user(user_id: int):
    """
    Admin: get detailed user info including images + latest verification report.
    Images are returned as data URLs (base64).
    """
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="Database module not available")
    try:
        from psycopg2.extras import RealDictCursor
        conn = db.get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM kyc_users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        user = dict(row)
        email = user.get("email") or ""

        images = {
            "document_image": _blob_to_data_url(user.get("document_image")),
            "registration_capture": _blob_to_data_url(user.get("registration_capture")),
            "webcam_image": _blob_to_data_url(user.get("webcam_image")),
        }

        report = _load_latest_verification_report(email)

        # Remove raw blobs from response
        user.pop("document_image", None)
        user.pop("registration_capture", None)
        user.pop("webcam_image", None)

        return {"success": True, "user": user, "images": images, "verification_report": report}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load user: {str(e)}")

def _admin_update_user_status(user_id: int, new_status: str) -> None:
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE kyc_users SET status=%s, updated_at=%s WHERE id=%s",
        (new_status, datetime.now(), user_id),
    )
    conn.commit()
    conn.close()

def _admin_generate_credentials() -> tuple[str, str]:
    import random
    import string

    userid = f"VYM{random.randint(100000, 999999)}"
    password = "".join(random.choices(string.ascii_letters + string.digits, k=8))
    return userid, password

@app.post("/api/admin/kyc-users/{user_id}/accept")
async def admin_accept_user(user_id: int):
    """
    Admin: Accept user -> generate credentials -> activate in DB -> send activation email (if configured).
    """
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="Database module not available")
    try:
        # Load user email
        from psycopg2.extras import RealDictCursor
        conn = db.get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, email, status FROM kyc_users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        email = row["email"]
        userid, password = _admin_generate_credentials()

        activated = db.activate_user(email, userid, password)
        if not activated:
            raise HTTPException(status_code=500, detail="Failed to activate user")

        send_activation_email, _ = _get_email_utils()
        email_sent = False
        if send_activation_email:
            email_sent = bool(send_activation_email(email, userid, password))
            if email_sent:
                try:
                    conn = db.get_conn()
                    cur = conn.cursor()
                    cur.execute("UPDATE kyc_users SET email_sent=TRUE WHERE email=%s", (email,))
                    conn.commit()
                    conn.close()
                except Exception as e:
                    print(f"Error updating email_sent flag: {e}")

        return {
            "success": True,
            "user_id": userid,
            "password": password,
            "email_sent": email_sent,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Accept failed: {str(e)}")

@app.post("/api/admin/kyc-users/{user_id}/reject")
async def admin_reject_user(user_id: int, reason: Optional[str] = Form(None)):
    """
    Admin: Reject user and optionally email the reason.
    """
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="Database module not available")
    try:
        from psycopg2.extras import RealDictCursor
        conn = db.get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, email FROM kyc_users WHERE id=%s", (user_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        _admin_update_user_status(user_id, "REJECTED")

        _, send_rejection_email = _get_email_utils()
        if send_rejection_email:
            try:
                send_rejection_email(row["email"], reason=reason)
            except Exception as e:
                print(f"Error sending rejection email: {e}")

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reject failed: {str(e)}")

@app.post("/api/admin/kyc-users/{user_id}/pending")
async def admin_reset_pending(user_id: int):
    """
    Admin: Reset status to PENDING.
    """
    if not DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="Database module not available")
    try:
        _admin_update_user_status(user_id, "PENDING")
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

@app.delete("/api/cleanup")
async def cleanup_old_files(days: int = 7):
    """
    Cleanup old uploaded files (admin endpoint)
    
    Args:
        days: Delete files older than this many days
    
    Returns:
        Number of files deleted
    """
    try:
        from datetime import timedelta
        
        deleted_count = 0
        cutoff_time = datetime.now() - timedelta(days=days)
        
        # Cleanup uploads folder
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_time < cutoff_time:
                    os.remove(file_path)
                    deleted_count += 1
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Cleaned up files older than {days} days"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cleanup failed: {str(e)}"
        )

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Endpoint not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    
    # Run the FastAPI server
    uvicorn.run(
        "backend_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (development only)
        log_level="info"
    )