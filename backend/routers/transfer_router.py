"""
transfer_router.py
------------------
Handles the full transfer flow with OTP verification.

Mount in backend_api.py:
    from transfer_router import router as transfer_router
    app.include_router(transfer_router)

Flow:
  1. POST /api/transfer/request-otp  → generate + email OTP
  2. POST /api/transfer/execute      → verify OTP + do bank transfer
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from psycopg2.extras import RealDictCursor

import db
from services.auth_utils import get_current_user
from services.bank_client import BankServiceError, initiate_transfer
from services.otp_service import create_otp, verify_otp, send_otp_email

router = APIRouter(prefix="/api/transfer", tags=["Transfer"])

VALID_BANKS = {"ICICI", "SBI", "HDFC"}


# ── Helpers ───────────────────────────────────────────────────

def get_user_details(user_id: str) -> dict:
    """Fetch email and name from kyc_users."""
    try:
        conn = db.get_conn()
        cur  = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT email, aadhar_number FROM kyc_users WHERE user_id = %s",
            (user_id,),
        )
        row = conn.execute if False else cur.fetchone()
        conn.close()
        return dict(row) if row else {}
    except Exception as e:
        print(f"❌ get_user_details error: {e}")
        return {}

def fetch_user_email(user_id: str) -> Optional[str]:
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute("SELECT email FROM kyc_users WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception as e:
        print(f"❌ fetch_user_email error: {e}")
        return None

def fetch_user_name(user_id: str) -> str:
    """Use email prefix as display name since full name isn't stored separately."""
    email = fetch_user_email(user_id) or ""
    return email.split("@")[0].replace(".", " ").title()


# ── Pydantic models ───────────────────────────────────────────

class OTPRequest(BaseModel):
    bank:              str   = Field(..., description="ICICI | SBI | HDFC")
    account_id:        str   = Field(..., description="Source account UUID")
    to_account_number: str   = Field(..., min_length=5)
    to_ifsc:           str   = Field(..., min_length=4, max_length=11)
    amount:            float = Field(..., gt=0)
    remarks:           Optional[str] = Field(default="Vyom Transfer", max_length=100)


class TransferExecute(BaseModel):
    bank:              str   = Field(...)
    account_id:        str   = Field(...)
    to_account_number: str   = Field(..., min_length=5)
    to_ifsc:           str   = Field(..., min_length=4, max_length=11)
    amount:            float = Field(..., gt=0)
    remarks:           Optional[str] = Field(default="Vyom Transfer", max_length=100)
    otp:               str   = Field(..., min_length=6, max_length=6)


# ── Routes ────────────────────────────────────────────────────

@router.post("/request-otp")
async def request_transfer_otp(
    body: OTPRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Step 1 — Generate OTP and send to user's registered email.
    Call this when user clicks 'Send Money'.
    """
    if body.bank.upper() not in VALID_BANKS:
        raise HTTPException(400, f"Invalid bank. Must be one of: {', '.join(VALID_BANKS)}")

    user_id = current_user["user_id"]
    email   = fetch_user_email(user_id)
    name    = fetch_user_name(user_id)

    if not email:
        raise HTTPException(404, "User email not found.")

    # Generate and store OTP
    otp = create_otp(user_id, email)

    # Send via Brevo
    sent = send_otp_email(
        to_email   = email,
        to_name    = name,
        otp        = otp,
        amount     = body.amount,
        to_account = body.to_account_number,
        to_ifsc    = body.to_ifsc,
    )

    if not sent:
        raise HTTPException(503, "Failed to send OTP email. Please try again.")

    # Mask email for response — don't expose full email
    at   = email.index("@")
    masked = email[:2] + "****" + email[at:]

    return {
        "success":      True,
        "message":      f"OTP sent to {masked}",
        "expires_in":   120,   # seconds
    }


@router.post("/execute")
async def execute_transfer(
    body: TransferExecute,
    current_user: dict = Depends(get_current_user),
):
    """
    Step 2 — Verify OTP then execute the bank transfer.
    """
    if body.bank.upper() not in VALID_BANKS:
        raise HTTPException(400, f"Invalid bank.")

    user_id = current_user["user_id"]

    # ── Verify OTP ──────────────────────────────────────────
    result = verify_otp(user_id, body.otp)
    if not result["valid"]:
        raise HTTPException(401, result["reason"])

    # ── Execute bank transfer ────────────────────────────────
    try:
        data = await initiate_transfer(
            bank              = body.bank,
            account_id        = body.account_id,
            to_account_number = body.to_account_number,
            to_ifsc           = body.to_ifsc.upper(),
            amount            = body.amount,
            remarks           = body.remarks or "Vyom Transfer",
        )
    except BankServiceError as e:
        raise HTTPException(e.status_code, e.message)

    return {
        "success":          True,
        "vyom_user":        user_id,
        "bank":             body.bank.upper(),
        "tx_id":            data.get("tx_id"),
        "ref_number":       data.get("ref_number"),
        "amount":           data.get("amount"),
        "balance_after":    data.get("balance_after"),
        "to_account":       data.get("to_account"),
        "to_ifsc":          data.get("to_ifsc"),
        "timestamp":        data.get("timestamp"),
        "status":           data.get("status"),
        "credited_to_bank": data.get("credited_to_bank"),   # ← ADD
        "credit_status":    data.get("credit_status"),       # ← ADD
    }