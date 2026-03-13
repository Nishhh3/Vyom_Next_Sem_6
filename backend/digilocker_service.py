# digilocker_service.py
# Place this file in: VYOM_NEXT_SEM_6/backend/digilocker_service.py
# Multi-user DigiLocker — stores files as BLOBs in SQLite

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import Response
import sqlite3
import uuid
import base64
import mimetypes
from datetime import datetime

# ─── Router (mounted into backend_api.py) ────────────────────────────────────
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
    """Call this once on app startup."""
    conn = get_db()
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
    conn.commit()
    conn.close()
    print("✅ DigiLocker DB initialised")


# ─── Auth helper ──────────────────────────────────────────────────────────────
def get_user_email(request: Request) -> str:
    """
    Extracts the authenticated user's email.
    - Production: reads JWT from Authorization header using your existing auth_utils.
    - Dev fallback: reads X-User-Email header (set in frontend for testing).
    """
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
            pass  # auth_utils doesn't have decode_access_token yet — fall through
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(401, "Invalid or expired token")

    # Dev / testing fallback
    email = request.headers.get("X-User-Email", "").strip()
    if email:
        return email

    raise HTTPException(401, "Authentication required. Provide Bearer token or X-User-Email header.")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/health")
async def digilocker_health():
    return {"status": "ok", "service": "DigiLocker"}


# ── Upload a document ─────────────────────────────────────────────────────────
@router.post("/upload")
async def upload_document(request: Request, file: UploadFile = File(...)):
    email = get_user_email(request)

    # Validate MIME type
    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"File type not allowed: '{mime}'. Allowed: PDF, images, Word, Excel, TXT.")

    # Read file bytes & check size
    data = await file.read()
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, f"File exceeds {MAX_FILE_SIZE_MB}MB limit ({len(data) // 1024 // 1024}MB received).")

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


# ── List all documents for the current user ───────────────────────────────────
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

    docs = [
        {
            "id": r["id"],
            "name": r["name"],
            "type": r["mime_type"],
            "size": r["size_bytes"],
            "uploadedAt": r["uploaded_at"],
        }
        for r in rows
    ]
    return {"success": True, "documents": docs}


# ── Get document as base64 data URL (used by frontend preview modal) ──────────
@router.get("/documents/{doc_id}/dataurl")
async def get_document_dataurl(doc_id: str, request: Request):
    email = get_user_email(request)

    conn = get_db()
    row = conn.execute(
        """
        SELECT name, mime_type, file_data
        FROM digilocker_documents
        WHERE id = ? AND user_email = ?
        """,
        (doc_id, email),
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, "Document not found or access denied.")

    b64 = base64.b64encode(row["file_data"]).decode()
    data_url = f"data:{row['mime_type']};base64,{b64}"

    return {
        "success": True,
        "dataUrl": data_url,
        "name": row["name"],
        "type": row["mime_type"],
    }


# ── Download a document as raw binary (optional, browser-native download) ─────
@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, request: Request):
    email = get_user_email(request)

    conn = get_db()
    row = conn.execute(
        """
        SELECT name, mime_type, file_data
        FROM digilocker_documents
        WHERE id = ? AND user_email = ?
        """,
        (doc_id, email),
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, "Document not found or access denied.")

    return Response(
        content=row["file_data"],
        media_type=row["mime_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{row["name"]}"',
            "Cache-Control": "private, max-age=3600",
        },
    )


# ── Delete a document ─────────────────────────────────────────────────────────
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
        raise HTTPException(404, "Document not found or access denied.")

    return {"success": True, "deleted": doc_id}


# ── Storage stats for the current user ───────────────────────────────────────
@router.get("/stats")
async def get_stats(request: Request):
    email = get_user_email(request)

    conn = get_db()
    row = conn.execute(
        """
        SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total_size
        FROM digilocker_documents
        WHERE user_email = ?
        """,
        (email,),
    ).fetchone()
    conn.close()

    return {
        "success": True,
        "count": row["count"],
        "totalSize": row["total_size"],
        "maxFileSizeMB": MAX_FILE_SIZE_MB,
    }