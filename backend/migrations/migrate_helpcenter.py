import sqlite3

DB_PATH = "vyom.db"


def run():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS complaints (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            channel          TEXT NOT NULL,
            user_identifier  TEXT NOT NULL,
            subject          TEXT,
            raw_message      TEXT NOT NULL,
            groq_summary     TEXT,
            groq_category    TEXT,
            groq_sentiment   TEXT,
            status           TEXT DEFAULT 'open',
            twilio_msg_sid   TEXT,
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()
    print("[migrate_helpcenter] complaints table ready.")


if __name__ == "__main__":
    run()