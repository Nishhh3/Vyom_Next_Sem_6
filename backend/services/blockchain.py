"""
blockchain.py
-------------
Pure Python SHA-256 blockchain ledger for Vyom transaction audit trail.
Stores blocks in PostgreSQL vyom_ledger table.

Usage in transfer_router.py:
    from banking.blockchain import write_block, verify_chain
"""

import hashlib
import json
from datetime import datetime
from typing import Optional
from psycopg2.extras import RealDictCursor
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import db

GENESIS_HASH = "0" * 64  # First block's prev_hash


# ── Hashing ───────────────────────────────────────────────────

def compute_hash(
    block_number: int,
    prev_hash: str,
    vyom_user_id: str,
    from_account: str,
    to_account: str,
    to_ifsc: str,
    amount: float,
    ref_number: str,
    timestamp: str,
) -> str:
    """Compute SHA-256 hash of block data."""
    payload = json.dumps({
        "block_number":  block_number,
        "prev_hash":     prev_hash,
        "vyom_user_id":  vyom_user_id,
        "from_account":  from_account,
        "to_account":    to_account,
        "to_ifsc":       to_ifsc,
        "amount":        str(amount),
        "ref_number":    ref_number,
        "timestamp":     timestamp,
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


# ── Chain lock helpers ────────────────────────────────────────

def is_chain_locked() -> bool:
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute("SELECT value FROM blockchain_config WHERE key = 'chain_locked'")
        row = cur.fetchone()
        conn.close()
        return row and row[0].lower() == "true"
    except Exception:
        return False


def set_chain_lock(locked: bool) -> bool:
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute(
            """UPDATE blockchain_config
               SET value = %s, updated_at = NOW()
               WHERE key = 'chain_locked'""",
            ("true" if locked else "false",),
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ set_chain_lock error: {e}")
        return False


# ── Alert writer ──────────────────────────────────────────────

def write_alert(
    alert_type: str,
    message: str,
    block_number: Optional[int] = None,
    expected_hash: Optional[str] = None,
    found_hash: Optional[str] = None,
):
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute(
            """INSERT INTO blockchain_alerts
               (alert_type, block_number, expected_hash, found_hash, message)
               VALUES (%s, %s, %s, %s, %s)""",
            (alert_type, block_number, expected_hash, found_hash, message),
        )
        conn.commit()
        conn.close()
        print(f"🚨 BLOCKCHAIN ALERT [{alert_type}]: {message}")
    except Exception as e:
        print(f"❌ write_alert error: {e}")


# ── Write block ───────────────────────────────────────────────

def write_block(
    vyom_user_id: str,
    from_bank: str,
    from_account: str,
    to_account: str,
    to_ifsc: str,
    amount: float,
    ref_number: str,
    remarks: str = "",
    credited_bank: Optional[str] = None,
    status: str = "SUCCESS",
) -> Optional[dict]:
    """
    Append a new block to the chain.
    Returns the block dict if successful, None if chain is locked or error.
    """
    if is_chain_locked():
        print("🔴 BLOCKCHAIN LOCKED — new blocks cannot be written until admin unlocks")
        write_alert(
            "WRITE_BLOCKED",
            f"Transfer blocked — chain is locked. ref: {ref_number}"
        )
        return None

    try:
        conn = db.get_conn()
        cur  = conn.cursor(cursor_factory=RealDictCursor)

        # Get last block
        cur.execute(
            "SELECT block_number, block_hash FROM vyom_ledger ORDER BY block_number DESC LIMIT 1"
        )
        last = cur.fetchone()

        block_number = (last["block_number"] + 1) if last else 1
        prev_hash    = last["block_hash"] if last else GENESIS_HASH
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        block_hash = compute_hash(
            block_number, prev_hash, vyom_user_id,
            from_account, to_account, to_ifsc,
            amount, ref_number, timestamp,
        )

        cur.execute(
            """INSERT INTO vyom_ledger
               (block_number, prev_hash, block_hash, vyom_user_id,
                from_bank, from_account, to_account, to_ifsc,
                amount, ref_number, remarks, credited_bank, status, created_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                block_number, prev_hash, block_hash, vyom_user_id,
                from_bank.upper(), from_account, to_account, to_ifsc.upper(),
                amount, ref_number, remarks, credited_bank, status, timestamp,
            ),
        )
        conn.commit()
        conn.close()

        print(f"⛓️  Block #{block_number} written | ref: {ref_number} | hash: {block_hash[:16]}...")
        return {
            "block_number": block_number,
            "block_hash":   block_hash,
            "ref_number":   ref_number,
        }

    except Exception as e:
        print(f"❌ write_block error: {e}")
        return None


# ── Verify chain ──────────────────────────────────────────────

def verify_chain() -> dict:
    """
    Recompute every block hash and check chain integrity.
    Returns full verification report.
    """
    try:
        conn = db.get_conn()
        cur  = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM vyom_ledger ORDER BY block_number ASC")
        blocks = cur.fetchall()
        conn.close()
    except Exception as e:
        return {"valid": False, "error": str(e), "total_blocks": 0}

    if not blocks:
        return {
            "valid":        True,
            "total_blocks": 0,
            "message":      "Chain is empty — no transactions yet",
        }

    prev_hash    = GENESIS_HASH
    broken_at    = None
    broken_block = None

    for block in blocks:
        # Check sequence
        if block["block_number"] == 1:
            expected_prev = GENESIS_HASH
        else:
            expected_prev = prev_hash

        if block["prev_hash"] != expected_prev:
            broken_at    = block["block_number"]
            broken_block = dict(block)
            broken_block["issue"] = "prev_hash mismatch — block may have been inserted or deleted"
            write_alert(
                "CHAIN_BREAK",
                f"prev_hash mismatch at block {broken_at}",
                block_number   = broken_at,
                expected_hash  = expected_prev,
                found_hash     = block["prev_hash"],
            )
            break

# Normalize timestamp to same format used when writing
        ts = block["created_at"]
        if hasattr(ts, "strftime"):
            ts = ts.strftime("%Y-%m-%d %H:%M:%S")
        else:
            ts = str(ts)[:19]

        # Recompute hash
        expected_hash = compute_hash(
            block["block_number"],
            block["prev_hash"],
            block["vyom_user_id"],
            block["from_account"],
            block["to_account"],
            block["to_ifsc"],
            float(block["amount"]),
            block["ref_number"],
            ts,
        )

        if expected_hash != block["block_hash"]:
            broken_at    = block["block_number"]
            broken_block = dict(block)
            broken_block["expected_hash"] = expected_hash
            broken_block["issue"] = "block_hash mismatch — transaction data may have been tampered"
            write_alert(
                "HASH_MISMATCH",
                f"Hash mismatch at block {broken_at} — possible tampering",
                block_number  = broken_at,
                expected_hash = expected_hash,
                found_hash    = block["block_hash"],
            )
            break

        prev_hash = block["block_hash"]

    if broken_at:
        # Auto-lock the chain
        set_chain_lock(True)
        write_alert(
            "AUTO_LOCK",
            f"Chain auto-locked due to tampering detected at block {broken_at}"
        )
        return {
            "valid":          False,
            "total_blocks":   len(blocks),
            "broken_at_block": broken_at,
            "tampered_block": broken_block,
            "message":        f"⛔ Chain integrity failure at block {broken_at}. Chain has been auto-locked.",
            "chain_locked":   True,
        }

    return {
        "valid":          True,
        "total_blocks":   len(blocks),
        "last_hash":      prev_hash[:16] + "...",
        "message":        f"✅ Chain intact — {len(blocks)} blocks verified",
        "chain_locked":   False,
    }


# ── Get blocks (paginated) ────────────────────────────────────

def get_blocks(limit: int = 20, offset: int = 0) -> dict:
    try:
        conn = db.get_conn()
        cur  = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT * FROM vyom_ledger ORDER BY block_number DESC LIMIT %s OFFSET %s",
            (limit, offset),
        )
        blocks = [dict(b) for b in cur.fetchall()]
        cur.execute("SELECT COUNT(*) FROM vyom_ledger")
        total = cur.fetchone()["count"]
        conn.close()
        return {"blocks": blocks, "total": int(total)}
    except Exception as e:
        return {"blocks": [], "total": 0, "error": str(e)}


# ── Get alerts ────────────────────────────────────────────────

def get_alerts(unresolved_only: bool = False) -> list:
    try:
        conn = db.get_conn()
        cur  = conn.cursor(cursor_factory=RealDictCursor)
        if unresolved_only:
            cur.execute(
                "SELECT * FROM blockchain_alerts WHERE resolved = FALSE ORDER BY created_at DESC"
            )
        else:
            cur.execute(
                "SELECT * FROM blockchain_alerts ORDER BY created_at DESC LIMIT 50"
            )
        alerts = [dict(a) for a in cur.fetchall()]
        conn.close()
        return alerts
    except Exception as e:
        print(f"❌ get_alerts error: {e}")
        return []


def resolve_alert(alert_id: int) -> bool:
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute(
            "UPDATE blockchain_alerts SET resolved = TRUE WHERE id = %s", (alert_id,)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ resolve_alert error: {e}")
        return False