import sqlite3
from datetime import datetime

from services.groq_service import process_complaint

DB_PATH = "vyom.db"


def save_complaint(
    channel: str,
    user_identifier: str,
    raw_message: str,
    subject: str = None,
    twilio_msg_sid: str = None,
) -> dict:
    """
    1. Run Groq classification on the raw message
    2. Insert full record into complaints table
    3. Return saved record as dict
    """
    groq = process_complaint(raw_message)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO complaints
            (channel, user_identifier, subject, raw_message,
             groq_summary, groq_category, groq_sentiment, twilio_msg_sid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            channel,
            user_identifier,
            subject,
            raw_message,
            groq.get("summary"),
            groq.get("category"),
            groq.get("sentiment"),
            twilio_msg_sid,
        ),
    )
    conn.commit()
    complaint_id = cur.lastrowid
    conn.close()

    return {
        "id": complaint_id,
        "channel": channel,
        "user_identifier": user_identifier,
        "subject": subject,
        "groq_summary": groq.get("summary"),
        "groq_category": groq.get("category"),
        "groq_sentiment": groq.get("sentiment"),
        "status": "open",
    }


def get_all_complaints(status: str = None) -> list:
    """Fetch all complaints, optionally filtered by status."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    if status:
        cur.execute(
            "SELECT * FROM complaints WHERE status = ? ORDER BY created_at DESC",
            (status,),
        )
    else:
        cur.execute("SELECT * FROM complaints ORDER BY created_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_complaint_by_id(complaint_id: int) -> dict | None:
    """Fetch a single complaint by ID."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def update_complaint_status(complaint_id: int, new_status: str) -> bool:
    """Update status of a complaint. Returns True if record was found and updated."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?",
        (new_status, datetime.utcnow(), complaint_id),
    )
    conn.commit()
    updated = cur.rowcount > 0
    conn.close()
    return updated