# digilocker_service.py
# Place this file in: VYOM_NEXT_SEM_6/backend/digilocker_service.py
# Multi-user DigiLocker — stores files as BLOBs in SQLite + PIN protection per user

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
import sqlite3
import uuid
import base64
import hashlib
import mimetypes
from datetime import datetime

# ─── Router ───────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/digilocker", tags=["DigiLocker"])

# ─── Config ───────────────────────────────────────────────────────────────────
DB_PATH = "digilocker.db"
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
}


# ─── Database ─────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_digilocker_db():
    """Call once on app startup."""
    conn = get_db()

    # Documents table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS digilocker_documents (
            id          TEXT PRIMARY KEY,
            user_email  TEXT NOT NULL,
            name        TEXT NOT NULL,
            mime_type   TEXT NOT NULL,
            size_bytes  INTEGER NOT NULL,
            uploaded_at TEXT NOT NULL,
            file_data   BLOB NOT NULL
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_digilocker_user
        ON digilocker_documents (user_email)
    """)

    # PIN table — one row per user
    conn.execute("""
        CREATE TABLE IF NOT EXISTS digilocker_pins (
            user_email  TEXT PRIMARY KEY,
            pin_hash    TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("✅ DigiLocker DB initialised (documents + pins)")


# ─── Helpers ──────────────────────────────────────────────────────────────────
def hash_pin(pin: str, email: str) -> str:
    """SHA-256 hash of PIN salted with the user's email so same PIN → different hash per user."""
    salted = f"{email}:{pin}"
    return hashlib.sha256(salted.encode()).hexdigest()


def get_user_email(request: Request) -> str:
    """Extract authenticated user email from JWT Bearer token or X-User-Email dev header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            from auth_utils import decode_access_token
            payload = decode_access_token(token)
            email = payload.get("email") or payload.get("sub")
            if not email:
                raise HTTPException(401, "Token missing email claim")
            return email
        except ImportError:
            pass
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(401, "Invalid or expired token")

    # Dev fallback — remove in production
    email = request.headers.get("X-User-Email", "").strip()
    if email:
        return email

    raise HTTPException(401, "Authentication required.")


# ─── PIN Routes ───────────────────────────────────────────────────────────────

class PinSetRequest(BaseModel):
    pin: str

class PinVerifyRequest(BaseModel):
    pin: str

class PinChangeRequest(BaseModel):
    old_pin: str
    new_pin: str


@router.get("/pin/status")
async def pin_status(request: Request):
    """
    Returns has_pin: true/false.
    Frontend calls this on mount to decide which screen to show:
      - false → 'Create your PIN' screen
      - true  → 'Enter your PIN' screen
    """
    email = get_user_email(request)
    conn = get_db()
    row = conn.execute(
        "SELECT user_email FROM digilocker_pins WHERE user_email = ?",
        (email,)
    ).fetchone()
    conn.close()
    return {"success": True, "has_pin": row is not None}


@router.post("/pin/set")
async def set_pin(request: Request, body: PinSetRequest):
    """
    Create PIN for the first time.
    Rejects if PIN already exists — use /pin/change for updates.
    """
    email = get_user_email(request)

    pin = body.pin.strip()
    if not pin.isdigit() or len(pin) != 4:
        raise HTTPException(400, "PIN must be exactly 4 digits.")

    conn = get_db()
    existing = conn.execute(
        "SELECT user_email FROM digilocker_pins WHERE user_email = ?", (email,)
    ).fetchone()

    if existing:
        conn.close()
        raise HTTPException(409, "PIN already set. Use /pin/change to update it.")

    now = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO digilocker_pins (user_email, pin_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (email, hash_pin(pin, email), now, now)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "PIN set successfully."}


@router.post("/pin/verify")
async def verify_pin(request: Request, body: PinVerifyRequest):
    """
    Verify the PIN before granting access to the locker vault.
    Returns 200 on success, 401 on wrong PIN.
    """
    email = get_user_email(request)

    pin = body.pin.strip()
    if not pin.isdigit() or len(pin) != 4:
        raise HTTPException(400, "PIN must be exactly 4 digits.")

    conn = get_db()
    row = conn.execute(
        "SELECT pin_hash FROM digilocker_pins WHERE user_email = ?", (email,)
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, "No PIN set. Please create a PIN first.")

    if row["pin_hash"] != hash_pin(pin, email):
        raise HTTPException(401, "Incorrect PIN. Please try again.")

    return {"success": True, "message": "PIN verified."}


@router.post("/pin/change")
async def change_pin(request: Request, body: PinChangeRequest):
    """Change PIN — requires current PIN to be verified first."""
    email = get_user_email(request)

    old_pin = body.old_pin.strip()
    new_pin = body.new_pin.strip()

    if not new_pin.isdigit() or len(new_pin) != 4:
        raise HTTPException(400, "New PIN must be exactly 4 digits.")
    if old_pin == new_pin:
        raise HTTPException(400, "New PIN must be different from current PIN.")

    conn = get_db()
    row = conn.execute(
        "SELECT pin_hash FROM digilocker_pins WHERE user_email = ?", (email,)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(404, "No PIN found. Create a PIN first.")

    if row["pin_hash"] != hash_pin(old_pin, email):
        conn.close()
        raise HTTPException(401, "Current PIN is incorrect.")

    now = datetime.utcnow().isoformat()
    conn.execute(
        "UPDATE digilocker_pins SET pin_hash = ?, updated_at = ? WHERE user_email = ?",
        (hash_pin(new_pin, email), now, email)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "PIN changed successfully."}


# ─── Document Routes ──────────────────────────────────────────────────────────

@router.get("/health")
async def digilocker_health():
    return {"status": "ok", "service": "DigiLocker"}


@router.post("/upload")
async def upload_document(request: Request, file: UploadFile = File(...)):
    email = get_user_email(request)

    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"File type not allowed: '{mime}'.")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, f"File exceeds {MAX_FILE_SIZE_MB}MB limit.")

    doc_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    conn = get_db()
    try:
        conn.execute(
            """
            INSERT INTO digilocker_documents
                (id, user_email, name, mime_type, size_bytes, uploaded_at, file_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (doc_id, email, file.filename, mime, len(data), now, data),
        )
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(500, f"Database error: {e}")
    conn.close()

    return {
        "success": True,
        "document": {
            "id": doc_id,
            "name": file.filename,
            "type": mime,
            "size": len(data),
            "uploadedAt": now,
        },
    }


@router.get("/documents")
async def list_documents(request: Request):
    email = get_user_email(request)
    conn = get_db()
    rows = conn.execute(
        """
        SELECT id, name, mime_type, size_bytes, uploaded_at
        FROM digilocker_documents
        WHERE user_email = ?
        ORDER BY uploaded_at DESC
        """,
        (email,),
    ).fetchall()
    conn.close()
    return {
        "success": True,
        "documents": [
            {
                "id": r["id"],
                "name": r["name"],
                "type": r["mime_type"],
                "size": r["size_bytes"],
                "uploadedAt": r["uploaded_at"],
            }
            for r in rows
        ],
    }


@router.get("/documents/{doc_id}/dataurl")
async def get_document_dataurl(doc_id: str, request: Request):
    email = get_user_email(request)
    conn = get_db()
    row = conn.execute(
        "SELECT name, mime_type, file_data FROM digilocker_documents WHERE id = ? AND user_email = ?",
        (doc_id, email),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Document not found.")
    b64 = base64.b64encode(row["file_data"]).decode()
    return {
        "success": True,
        "dataUrl": f"data:{row['mime_type']};base64,{b64}",
        "name": row["name"],
        "type": row["mime_type"],
    }


@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, request: Request):
    email = get_user_email(request)
    conn = get_db()
    row = conn.execute(
        "SELECT name, mime_type, file_data FROM digilocker_documents WHERE id = ? AND user_email = ?",
        (doc_id, email),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Document not found.")
    return Response(
        content=row["file_data"],
        media_type=row["mime_type"],
        headers={"Content-Disposition": f'attachment; filename="{row["name"]}"'},
    )


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, request: Request):
    email = get_user_email(request)
    conn = get_db()
    result = conn.execute(
        "DELETE FROM digilocker_documents WHERE id = ? AND user_email = ?",
        (doc_id, email),
    )
    conn.commit()
    deleted = result.rowcount
    conn.close()
    if not deleted:
        raise HTTPException(404, "Document not found.")
    return {"success": True, "deleted": doc_id}


@router.get("/stats")
async def get_stats(request: Request):
    email = get_user_email(request)
    conn = get_db()
    row = conn.execute(
        "SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total_size FROM digilocker_documents WHERE user_email = ?",
        (email,),
    ).fetchone()
    conn.close()
    return {
        "success": True,
        "count": row["count"],
        "totalSize": row["total_size"],
        "maxFileSizeMB": MAX_FILE_SIZE_MB,
    }