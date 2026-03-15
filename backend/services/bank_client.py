"""
bank_client.py
--------------
Async HTTP client that talks to the Vyom dummy bank gateway (Flask, port 7000).
All bank communication is isolated here — bank_router.py imports from this.
"""

import httpx
import os
from typing import Optional

GATEWAY = os.getenv("BANK_GATEWAY_URL", "http://localhost:7000")
TIMEOUT = 10.0  # seconds


class BankServiceError(Exception):
    """Raised when the bank gateway returns an error or is unreachable."""
    def __init__(self, message: str, status_code: int = 503):
        self.message    = message
        self.status_code = status_code
        super().__init__(message)


async def _get(path: str, params: dict = None) -> dict:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(f"{GATEWAY}{path}", params=params)
            if r.status_code == 404:
                raise BankServiceError(r.json().get("error", "Not found"), 404)
            if r.status_code != 200:
                raise BankServiceError(
                    r.json().get("error", f"Bank gateway error {r.status_code}"),
                    r.status_code,
                )
            return r.json()
    except httpx.ConnectError:
        raise BankServiceError("Bank server is not running. Start bank_server.py first.", 503)
    except httpx.TimeoutException:
        raise BankServiceError("Bank server timed out.", 504)


async def _post(path: str, body: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(f"{GATEWAY}{path}", json=body)
            if r.status_code == 404:
                raise BankServiceError(r.json().get("error", "Not found"), 404)
            if r.status_code == 422:
                raise BankServiceError(r.json().get("error", "Unprocessable"), 422)
            if r.status_code not in (200, 201):
                raise BankServiceError(
                    r.json().get("error", f"Bank gateway error {r.status_code}"),
                    r.status_code,
                )
            return r.json()
    except httpx.ConnectError:
        raise BankServiceError("Bank server is not running. Start bank_server.py first.", 503)
    except httpx.TimeoutException:
        raise BankServiceError("Bank server timed out.", 504)


# ── Public API ────────────────────────────────────────────────

async def fetch_all_accounts(phone: str) -> dict:
    """
    Fetch all accounts linked to a phone number across ICICI, SBI, HDFC.
    Returns the raw gateway response.
    """
    return await _get("/vyom/accounts", params={"phone": phone})


async def fetch_balance(bank: str, account_id: str) -> dict:
    """
    Get live balance for a specific account.
    bank: 'ICICI' | 'SBI' | 'HDFC'
    """
    return await _get(f"/vyom/{bank.upper()}/accounts/{account_id}/balance")


async def fetch_transactions(
    bank: str,
    account_id: str,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """
    Get paginated transaction history for a specific account.
    """
    return await _get(
        f"/vyom/{bank.upper()}/accounts/{account_id}/transactions",
        params={"limit": limit, "offset": offset},
    )


async def initiate_transfer(
    bank: str,
    account_id: str,
    to_account_number: str,
    to_ifsc: str,
    amount: float,
    remarks: str = "Vyom Transfer",
) -> dict:
    """
    Debit from account_id and record transaction.
    Returns bank response with UTR ref_number for blockchain write.
    """
    return await _post(
        f"/vyom/{bank.upper()}/accounts/{account_id}/transfer",
        body={
            "to_account_number": to_account_number,
            "to_ifsc":           to_ifsc,
            "amount":            amount,
            "remarks":           remarks,
        },
    )


async def health_check() -> dict:
    """Check if all 3 bank servers are reachable."""
    return await _get("/health")