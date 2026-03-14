"""
bank_router.py
--------------
FastAPI router for all bank-related endpoints.
Mounted at /api/bank in backend_api.py via:
    from bank_router import router as bank_router
    app.include_router(bank_router)

All routes require a valid JWT — uses your existing get_current_user dependency.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor

import db
from auth_utils import get_current_user
from bank_client import (
    BankServiceError,
    fetch_all_accounts,
    fetch_balance,
    fetch_transactions,
    initiate_transfer,
    health_check,
)

router = APIRouter(prefix="/api/bank", tags=["Banking"])

VALID_BANKS = {"ICICI", "SBI", "HDFC"}


# ── Helpers ───────────────────────────────────────────────────

def get_user_phone(user_id: str) -> Optional[str]:
    """Fetch phone from kyc_users by user_id."""
    try:
        conn = db.get_conn()
        cur  = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT phone FROM kyc_users WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        conn.close()
        return row["phone"] if row else None
    except Exception as e:
        print(f"❌ get_user_phone error: {e}")
        return None


def update_user_phone(user_id: str, phone: str) -> bool:
    """Save/update phone on kyc_users."""
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute(
            "UPDATE kyc_users SET phone = %s WHERE user_id = %s",
            (phone, user_id),
        )
        conn.commit()
        conn.close()
        return True
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(409, "This phone number is already linked to another Vyom account.")
    except Exception as e:
        print(f"❌ update_user_phone error: {e}")
        return False


def validate_bank(bank: str):
    if bank.upper() not in VALID_BANKS:
        raise HTTPException(400, f"Invalid bank. Must be one of: {', '.join(VALID_BANKS)}")


# ── Pydantic models ───────────────────────────────────────────

class LinkPhoneRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\d{10}$", description="10-digit mobile number")


class TransferRequest(BaseModel):
    to_account_number: str  = Field(..., min_length=5)
    to_ifsc:           str  = Field(..., min_length=11, max_length=11)
    amount:            float = Field(..., gt=0)
    remarks:           str  = Field(default="Vyom Transfer", max_length=100)


# ── Routes ────────────────────────────────────────────────────

@router.get("/health")
async def bank_health(current_user: dict = Depends(get_current_user)):
    """Check connectivity to all 3 bank servers."""
    try:
        result = await health_check()
        return {"success": True, **result}
    except BankServiceError as e:
        raise HTTPException(e.status_code, e.message)


@router.post("/link-phone")
async def link_phone(
    body: LinkPhoneRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Save the user's phone number to kyc_users.
    Required once before any bank account fetching.
    """
    user_id = current_user["user_id"]
    success = update_user_phone(user_id, body.phone)
    if not success:
        raise HTTPException(500, "Failed to save phone number.")
    return {"success": True, "message": "Phone number linked successfully."}


@router.get("/accounts")
async def get_all_accounts(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    phone   = get_user_phone(user_id)

    if not phone:
        raise HTTPException(
            400,
            "No phone number found for your account. "
            "Please contact support."
        )

    try:
        data = await fetch_all_accounts(phone)
    except BankServiceError as e:
        raise HTTPException(e.status_code, e.message)

    # Flatten into a clean list for the frontend
    accounts = []
    for bank_name, bank_data in data.get("banks", {}).items():
        if "error" in bank_data:
            # Bank returned no account — not an error, just not linked
            continue
        customer = bank_data.get("customer", {})
        for acc in bank_data.get("accounts", []):
            accounts.append({
                "bank":           bank_name,
                "account_id":     acc["account_id"],
                "account_number": acc["account_number"],
                "ifsc":           acc["ifsc"],
                "account_type":   acc["account_type"],
                "balance":        acc["balance"],
                "status":         acc["status"],
                "holder_name":    customer.get("name"),
            })

    return {
        "success":  True,
        "vyom_user": user_id,
        "phone":    phone,
        "total_accounts": len(accounts),
        "accounts": accounts,
    }


@router.get("/accounts/{bank}/{account_id}/balance")
async def get_balance(
    bank:       str,
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get live balance for a specific account.
    bank: ICICI | SBI | HDFC
    """
    validate_bank(bank)
    try:
        data = await fetch_balance(bank, account_id)
    except BankServiceError as e:
        raise HTTPException(e.status_code, e.message)
    return {"success": True, **data}


@router.get("/accounts/{bank}/{account_id}/transactions")
async def get_transactions(
    bank:       str,
    account_id: str,
    limit:  int = Query(default=20, ge=1,  le=100),
    offset: int = Query(default=0,  ge=0),
    current_user: dict = Depends(get_current_user),
):
    """
    Get paginated transaction history for a specific account.
    """
    validate_bank(bank)
    try:
        data = await fetch_transactions(bank, account_id, limit, offset)
    except BankServiceError as e:
        raise HTTPException(e.status_code, e.message)
    return {"success": True, **data}


@router.post("/accounts/{bank}/{account_id}/transfer")
async def transfer(
    bank:       str,
    account_id: str,
    body:       TransferRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Initiate a transfer from a linked bank account.
    Returns UTR ref_number — write this to your blockchain ledger.
    """
    validate_bank(bank)
    try:
        data = await initiate_transfer(
            bank        = bank,
            account_id  = account_id,
            to_account_number = body.to_account_number,
            to_ifsc     = body.to_ifsc,
            amount      = body.amount,
            remarks     = body.remarks,
        )
    except BankServiceError as e:
        raise HTTPException(e.status_code, e.message)

    return {
        "success":      True,
        "vyom_user":    current_user["user_id"],
        "bank":         bank.upper(),
        "tx_id":        data.get("tx_id"),
        "ref_number":   data.get("ref_number"),   # ← write this to blockchain
        "amount":       data.get("amount"),
        "balance_after": data.get("balance_after"),
        "to_account":   data.get("to_account"),
        "to_ifsc":      data.get("to_ifsc"),
        "timestamp":    data.get("timestamp"),
        "status":       data.get("status"),
    }