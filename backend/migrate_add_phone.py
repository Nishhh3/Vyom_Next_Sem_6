"""
Migration: Add phone column to kyc_users
Run once: python migrate_add_phone.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import db  # your existing db.py

MIGRATION = """
DO $$
BEGIN
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'kyc_users'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE kyc_users ADD COLUMN phone VARCHAR(15) UNIQUE;
        RAISE NOTICE 'phone column added';
    ELSE
        RAISE NOTICE 'phone column already exists, skipping';
    END IF;

    -- Index for fast lookup
    IF NOT EXISTS (
        SELECT FROM pg_indexes
        WHERE tablename = 'kyc_users'
        AND indexname = 'idx_kyc_users_phone'
    ) THEN
        CREATE INDEX idx_kyc_users_phone ON kyc_users(phone);
        RAISE NOTICE 'index created';
    END IF;
END $$;
"""

def run():
    try:
        conn = db.get_conn()
        cur  = conn.cursor()
        cur.execute(MIGRATION)
        conn.commit()
        conn.close()
        print("✅ Migration complete — phone column ready on kyc_users")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run()