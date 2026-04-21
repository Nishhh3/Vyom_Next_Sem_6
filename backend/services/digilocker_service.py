# digilocker_service.py (NO PIN VERSION)

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import Response
import sqlite3
import uuid
import mimetypes
import os
from datetime import datetime

# ─── Router ───────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/digilocker", tags=["DigiLocker"])

# ─── Config ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "digilocker.db")

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
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS digilocker_documents (
            id TEXT PRIMARY KEY,
            user_email TEXT NOT NULL,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            uploaded_at TEXT NOT NULL,
            file_data BLOB NOT NULL
        )
    """)

    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_digilocker_user
        ON digilocker_documents (user_email)
    """)

    conn.commit()
    conn.close()
    print("✅ DigiLocker DB initialised (NO PIN MODE) at:", DB_PATH)


# ─── Helpers ──────────────────────────────────────────────────────────────────
def get_user_email(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            from auth_utils import decode_access_token
            payload = decode_access_token(token)
            email = payload.get("email") or payload.get("sub")
            if not email:
                raise HTTPException(401, "Token missing email")
            print("🔍 DEBUG EMAIL:", email)
            return email
        except Exception:
            raise HTTPException(401, "Invalid token")

    # Dev fallback
    email = request.headers.get("X-User-Email", "").strip()
    if email:
        print("🔍 DEBUG EMAIL:", email)
        return email

    raise HTTPException(401, "Authentication required")


# ─── Document Routes ──────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    return {"status": "ok", "mode": "NO PIN"}


@router.post("/upload")
async def upload_document(request: Request, file: UploadFile = File(...)):
    email = get_user_email(request)

    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Invalid file type")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "File too large")

    doc_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    conn = get_db()
    conn.execute(
        "INSERT INTO digilocker_documents VALUES (?, ?, ?, ?, ?, ?, ?)",
        (doc_id, email, file.filename, mime, len(data), now, data)
    )
    conn.commit()
    conn.close()

    return {
        "success": True,
        "document": {
            "id": doc_id,
            "name": file.filename,
            "type": mime,
            "size": len(data),
            "uploadedAt": now,
        }
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
        "documents": [dict(r) for r in rows]
    }


@router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, request: Request):
    email = get_user_email(request)

    conn = get_db()
    row = conn.execute(
        "SELECT name, mime_type, file_data FROM digilocker_documents WHERE id=? AND user_email=?",
        (doc_id, email),
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, "Document not found")

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
        "DELETE FROM digilocker_documents WHERE id=? AND user_email=?",
        (doc_id, email),
    )
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        raise HTTPException(404, "Document not found")

    return {"success": True, "deleted": doc_id}


@router.get("/stats")
async def get_stats(request: Request):
    email = get_user_email(request)

    conn = get_db()
    row = conn.execute(
        "SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total_size FROM digilocker_documents WHERE user_email=?",
        (email,),
    ).fetchone()
    conn.close()

    return {
        "success": True,
        "count": row["count"],
        "totalSize": row["total_size"],
        "maxFileSizeMB": MAX_FILE_SIZE_MB,
    }