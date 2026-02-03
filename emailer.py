import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

EMAIL = os.getenv("SENDER_EMAIL")
SMTP_KEY = os.getenv("SMTP_API_KEY")
SMTP_SERVER = "smtp-relay.brevo.com"
SMTP_PORT = 587
SMTP_USERNAME = "877a3c001@smtp-brevo.com"  # Use your actual SMTP login username here

if SMTP_KEY is None:
    raise ValueError("SMTP_API_KEY environment variable not set")
if EMAIL is None:
    raise ValueError("SENDER_EMAIL environment variable not set")

def send_activation(email, userid, password):
    msg = EmailMessage()

    msg["Subject"] = "KYC Approved - Account Activated"
    msg["From"] = EMAIL
    msg["To"] = email

    msg.set_content(f"""
Your account is now activated.

UserID: {userid}
Password: {password}

You may login using:
1) Face Authentication
2) UserID + Password
""")

    try:
        print(f"Connecting to SMTP server {SMTP_SERVER}:{SMTP_PORT} ...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.set_debuglevel(1)  # Show communication with SMTP server
            server.starttls()
            print(f"Logging in as '{SMTP_USERNAME}' with provided SMTP key...")
            server.login(SMTP_USERNAME, SMTP_KEY)
            print(f"Login successful, sending email to {email} ...")
            server.send_message(msg)
            print("Email sent successfully!")
    except smtplib.SMTPAuthenticationError as e:
        print(f"SMTP Authentication failed: {e.smtp_code} {e.smtp_error.decode()}")
    except smtplib.SMTPException as e:
        print(f"SMTP error occurred: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
