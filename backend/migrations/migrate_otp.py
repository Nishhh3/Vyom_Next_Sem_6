"""
Migration: Create transfer_otps table
Run once: python migrate_otp.py
"""

import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import db

MIGRATION = """
CREATE TABLE IF NOT EXISTS transfer_otps (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(50)  NOT NULL,
    email       VARCHAR(255) NOT NULL,
    otp         VARCHAR(6)   NOT NULL,
    attempts    INTEGER      DEFAULT 0,
    verified    BOOLEAN      DEFAULT FALSE,
    expires_at  TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_user_id
    ON transfer_otps(user_id);

CREATE INDEX IF NOT EXISTS idx_otp_expires
    ON transfer_otps(expires_at);
"""

def run():
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute(MIGRATION)
        conn.commit()
        conn.close()
        print("✅ transfer_otps table ready")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run()