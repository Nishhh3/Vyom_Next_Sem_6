"""
Migration: Create vyom_ledger and blockchain_alerts tables
Run once: python migrate_blockchain.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import db

MIGRATION = """
-- Main blockchain ledger — append only
CREATE TABLE IF NOT EXISTS vyom_ledger (
    id              SERIAL PRIMARY KEY,
    block_number    INTEGER UNIQUE NOT NULL,
    prev_hash       VARCHAR(64) NOT NULL,
    block_hash      VARCHAR(64) NOT NULL,
    vyom_user_id    VARCHAR(50) NOT NULL,
    from_bank       VARCHAR(10) NOT NULL,
    from_account    VARCHAR(50) NOT NULL,
    to_account      VARCHAR(50) NOT NULL,
    to_ifsc         VARCHAR(11) NOT NULL,
    amount          NUMERIC(15,2) NOT NULL,
    ref_number      VARCHAR(50) NOT NULL,
    remarks         TEXT,
    credited_bank   VARCHAR(10),
    status          VARCHAR(20) DEFAULT 'SUCCESS',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table — written when tampering is detected
CREATE TABLE IF NOT EXISTS blockchain_alerts (
    id              SERIAL PRIMARY KEY,
    alert_type      VARCHAR(50) NOT NULL,
    block_number    INTEGER,
    expected_hash   VARCHAR(64),
    found_hash      VARCHAR(64),
    message         TEXT NOT NULL,
    resolved        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chain lock flag — when TRUE no new blocks can be written
CREATE TABLE IF NOT EXISTS blockchain_config (
    key     VARCHAR(50) PRIMARY KEY,
    value   TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO blockchain_config (key, value)
VALUES ('chain_locked', 'false')
ON CONFLICT (key) DO NOTHING;

-- Revoke UPDATE and DELETE from app user on ledger (tamper protection)
-- Uncomment and replace vyom_app with your actual Postgres app username
-- REVOKE UPDATE, DELETE ON vyom_ledger FROM vyom_app;
-- GRANT INSERT, SELECT ON vyom_ledger TO vyom_app;

CREATE INDEX IF NOT EXISTS idx_ledger_block_number ON vyom_ledger(block_number);
CREATE INDEX IF NOT EXISTS idx_ledger_user         ON vyom_ledger(vyom_user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved     ON blockchain_alerts(resolved);
"""

def run():
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute(MIGRATION)
        conn.commit()
        conn.close()
        print("✅ Blockchain tables ready: vyom_ledger, blockchain_alerts, blockchain_config")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run()