"""
otp_service.py
--------------
Handles OTP generation, storage, verification and email delivery via SMTP.
Uses Brevo SMTP (or any SMTP provider).
"""

import os
import random
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from typing import Optional
import db

# ── SMTP config — add these to your .env ─────────────────────
SMTP_HOST      = "smtp-relay.brevo.com"
SMTP_PORT      = 587
SMTP_USER      = "877a3c001@smtp-brevo.com"   # ← your Brevo SMTP username
SMTP_PASSWORD  = os.getenv("SMTP_API_KEY",  "")
SMTP_FROM      = os.getenv("SENDER_EMAIL",  "")
SMTP_FROM_NAME = "VyomNext"

OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS   = 3


# ── OTP generation ────────────────────────────────────────────

def generate_otp() -> str:
    """Generate a 6-digit numeric OTP."""
    return str(random.randint(100000, 999999))


# ── DB helpers ────────────────────────────────────────────────

def create_otp(user_id: str, email: str) -> str:
    """
    Invalidate any existing OTPs for this user,
    create a fresh one, and return the OTP string.
    """
    otp        = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    conn = db.get_conn()
    cur  = conn.cursor()

    # Expire all previous OTPs for this user
    cur.execute(
        """
        UPDATE transfer_otps
        SET expires_at = NOW()
        WHERE user_id = %s AND verified = FALSE
        """,
        (user_id,),
    )

    # Insert fresh OTP
    cur.execute(
        """
        INSERT INTO transfer_otps (user_id, email, otp, expires_at)
        VALUES (%s, %s, %s, %s)
        """,
        (user_id, email, otp, expires_at),
    )

    conn.commit()
    conn.close()
    return otp


def verify_otp(user_id: str, otp_input: str) -> dict:
    """
    Verify OTP for user.
    Returns {"valid": True} or {"valid": False, "reason": "..."}
    """
    conn = db.get_conn()
    cur  = conn.cursor()

    cur.execute(
        """
        SELECT id, otp, attempts, expires_at, verified
        FROM transfer_otps
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (user_id,),
    )
    row = cur.fetchone()

    if not row:
        conn.close()
        return {"valid": False, "reason": "No OTP found. Request a new one."}

    otp_id, stored_otp, attempts, expires_at, verified = row

    if verified:
        conn.close()
        return {"valid": False, "reason": "OTP already used. Request a new one."}

    if datetime.utcnow() > expires_at:
        conn.close()
        return {"valid": False, "reason": "OTP expired. Request a new one."}

    if attempts >= OTP_MAX_ATTEMPTS:
        conn.close()
        return {"valid": False, "reason": "Too many attempts. Request a new OTP."}

    # Increment attempts
    cur.execute(
        "UPDATE transfer_otps SET attempts = attempts + 1 WHERE id = %s",
        (otp_id,),
    )

    if otp_input.strip() != stored_otp:
        conn.commit()
        conn.close()
        remaining = OTP_MAX_ATTEMPTS - (attempts + 1)
        return {
            "valid":   False,
            "reason":  f"Incorrect OTP. {remaining} attempt(s) remaining.",
        }

    # Mark as verified
    cur.execute(
        "UPDATE transfer_otps SET verified = TRUE WHERE id = %s",
        (otp_id,),
    )
    conn.commit()
    conn.close()
    return {"valid": True}


# ── SMTP email ────────────────────────────────────────────────

def send_otp_email(
    to_email: str,
    to_name: str,
    otp: str,
    amount: float,
    to_account: str,
    to_ifsc: str,
) -> bool:
    if not SMTP_PASSWORD or not SMTP_FROM:
        print("❌ SENDER_EMAIL or SMTP_API_KEY not set in .env")
        return False

    masked_account = f"XXXX{to_account[-4:]}" if len(to_account) >= 4 else to_account

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0b14; color: #ffffff; border-radius: 16px; overflow: hidden;">
      <div style="background: #c0392b; padding: 28px 32px;">
        <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">VyomNext</h1>
        <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.85;">Secure Transfer Verification</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #a0a0b0; font-size: 14px; margin: 0 0 24px;">Hi {to_name},</p>
        <p style="color: #e0e0e0; font-size: 15px; margin: 0 0 24px;">
          You have requested to transfer <strong style="color:#ffffff;">&#8377;{amount:,.2f}</strong>
          to account <strong style="color:#ffffff;">{masked_account}</strong> (IFSC: {to_ifsc}).
        </p>
        <p style="color: #a0a0b0; font-size: 13px; margin: 0 0 12px;">Your one-time password is:</p>
        <div style="background: #1a1b2e; border: 2px solid #c0392b; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #ffffff; font-family: monospace;">{otp}</span>
        </div>
        <div style="background: #12131f; border-left: 3px solid #c0392b; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #a0a0b0; font-size: 13px;">
            &#9201; This OTP is valid for <strong style="color:#ffffff;">{OTP_EXPIRY_MINUTES} minutes</strong>
            and can only be used <strong style="color:#ffffff;">once</strong>.
          </p>
        </div>
        <p style="color: #606070; font-size: 12px; margin: 0;">
          If you did not initiate this transfer, please ignore this email.
        </p>
      </div>
      <div style="background: #12131f; padding: 16px 32px; text-align: center;">
        <p style="margin: 0; color: #404050; font-size: 11px;">
          &copy; VyomNext &middot; Secured by blockchain technology
        </p>
      </div>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"VyomNext — Your Transfer OTP: {otp}"
        msg["From"]    = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
        msg["To"]      = to_email

        msg.attach(MIMEText(
            f"Your VyomNext transfer OTP is: {otp}. Valid for {OTP_EXPIRY_MINUTES} minutes.",
            "plain"
        ))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        print(f"✅ OTP email sent to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        print("❌ SMTP auth failed — check SMTP_USER and SMTP_PASSWORD in .env")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {e}")
        return False
    except Exception as e:
        print(f"❌ Email send failed: {e}")
        return False