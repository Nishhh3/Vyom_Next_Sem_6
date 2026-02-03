import mysql.connector
from datetime import datetime

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "root",
    "database": "vyom_next"
}

def get_conn():
    return mysql.connector.connect(**DB_CONFIG)

def insert_signup(email, doc_path, capture_path):

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO kyc_users
    (email, document_path, registration_capture,
     status, created_at)
    VALUES (%s,%s,%s,'PENDING',%s)
    """, (email, doc_path, capture_path, datetime.now()))

    conn.commit()
    conn.close()

def get_user_by_email(email):

    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM kyc_users WHERE email=%s", (email,))
    row = cur.fetchone()

    conn.close()
    return row

def activate_user(email, userid, password):

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    UPDATE kyc_users
    SET status='ACCEPTED',
        user_id=%s,
        password=%s
    WHERE email=%s
    """, (userid, password, email))

    conn.commit()
    conn.close()

def get_user_by_userid(userid):

    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM kyc_users WHERE user_id=%s", (userid,))
    row = cur.fetchone()

    conn.close()
    return row

def get_newly_accepted():

    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT * FROM kyc_users
        WHERE status='ACCEPTED'
        AND (email_sent IS NULL OR email_sent=FALSE)
        AND user_id IS NULL
    """)

    rows = cur.fetchall()
    conn.close()
    return rows


def finalize_activation(email, userid, password):

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        UPDATE kyc_users
        SET user_id=%s,
            password=%s,
            email_sent=TRUE
        WHERE email=%s
    """,(userid,password,email))

    conn.commit()
    conn.close()
