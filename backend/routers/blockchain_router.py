"""
blockchain_router.py
--------------------
FastAPI router for blockchain admin endpoints.
Auth is handled at the Next.js proxy layer — no JWT needed here.

Mount in backend_api.py:
    from routers.blockchain_router import router as blockchain_router
    app.include_router(blockchain_router)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.blockchain import (
    verify_chain, get_blocks, get_alerts,
    set_chain_lock, is_chain_locked, resolve_alert,
)

router = APIRouter(prefix="/api/blockchain", tags=["Blockchain"])


# ── Chain status ──────────────────────────────────────────────

@router.get("/status")
async def chain_status():
    locked = is_chain_locked()
    alerts = get_alerts(unresolved_only=True)
    blocks = get_blocks(limit=1, offset=0)
    return {
        "chain_locked":      locked,
        "unresolved_alerts": len(alerts),
        "total_blocks":      blocks.get("total", 0),
    }


# ── Verify chain ──────────────────────────────────────────────

@router.get("/verify")
async def verify():
    return verify_chain()


# ── Get blocks ────────────────────────────────────────────────

@router.get("/blocks")
async def list_blocks(limit: int = 20, offset: int = 0):
    data = get_blocks(limit=limit, offset=offset)
    for b in data.get("blocks", []):
        b["amount"]     = float(b["amount"])
        b["created_at"] = str(b["created_at"])
    return data


# ── Get alerts ────────────────────────────────────────────────

@router.get("/alerts")
async def list_alerts():
    alerts = get_alerts(unresolved_only=False)
    for a in alerts:
        a["created_at"] = str(a["created_at"])
    return {"alerts": alerts}


# ── Toggle chain lock ─────────────────────────────────────────

class LockRequest(BaseModel):
    locked: bool


@router.post("/lock")
async def toggle_lock(body: LockRequest):
    success = set_chain_lock(body.locked)
    if not success:
        raise HTTPException(500, "Failed to update chain lock.")
    action = "locked" if body.locked else "unlocked"
    return {
        "success":      True,
        "chain_locked": body.locked,
        "message":      f"Chain {action}",
    }


# ── Resolve alert ─────────────────────────────────────────────

@router.post("/alerts/{alert_id}/resolve")
async def resolve(alert_id: int):
    success = resolve_alert(alert_id)
    if not success:
        raise HTTPException(500, "Failed to resolve alert.")
    return {"success": True, "alert_id": alert_id}