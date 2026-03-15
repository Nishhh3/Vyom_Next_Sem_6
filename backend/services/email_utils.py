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

def send_activation_email(email: str, userid: str, password: str) -> bool:
    """
    Send activation email with credentials to user
    
    Args:
        email: User's email address
        userid: Generated user ID
        password: Generated password
        
    Returns:
        True if email sent successfully, False otherwise
    """
    msg = EmailMessage()

    msg["Subject"] = "🎉 KYC Approved - Your Account is Now Active!"
    msg["From"] = EMAIL
    msg["To"] = email

    # HTML email content for better formatting
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🏦 KYC Verification Complete</h1>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #28a745;">✅ Congratulations! Your Account is Activated</h2>
                    
                    <p>Dear Customer,</p>
                    
                    <p>We are pleased to inform you that your KYC verification has been successfully completed and your account is now <strong>ACTIVE</strong>.</p>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 5px solid #667eea; margin: 20px 0;">
                        <h3 style="color: #667eea; margin-top: 0;">🔑 Your Login Credentials</h3>
                        <p style="margin: 10px 0;">
                            <strong>User ID:</strong> <code style="background-color: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 16px;">{userid}</code>
                        </p>
                        <p style="margin: 10px 0;">
                            <strong>Password:</strong> <code style="background-color: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 16px;">{password}</code>
                        </p>
                    </div>
                    
                    <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 5px solid #2196F3; margin: 20px 0;">
                        <h3 style="color: #2196F3; margin-top: 0;">🚀 How to Login</h3>
                        <p>You can access your account using either of these methods:</p>
                        <ol style="margin: 10px 0;">
                            <li><strong>Face Authentication:</strong> Use your User ID and verify with facial recognition</li>
                            <li><strong>Traditional Login:</strong> Use your User ID and Password</li>
                        </ol>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 5px solid #ffc107; margin: 20px 0;">
                        <h3 style="color: #856404; margin-top: 0;">🔒 Security Tips</h3>
                        <ul style="margin: 10px 0;">
                            <li>Keep your credentials confidential</li>
                            <li>Do not share your password with anyone</li>
                            <li>Change your password regularly for better security</li>
                            <li>Enable two-factor authentication if available</li>
                        </ul>
                    </div>
                    
                    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    
                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>KYC Verification Team</strong>
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; 2024 Banking KYC System. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    # Plain text version for email clients that don't support HTML
    plain_text = f"""
🎉 KYC APPROVED - YOUR ACCOUNT IS NOW ACTIVE!

Dear Customer,

Congratulations! Your KYC verification has been successfully completed and your account is now ACTIVE.

🔑 YOUR LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User ID:  {userid}
Password: {password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 HOW TO LOGIN:
You can access your account using either of these methods:

1. Face Authentication: Use your User ID and verify with facial recognition
2. Traditional Login: Use your User ID and Password

🔒 SECURITY TIPS:
• Keep your credentials confidential
• Do not share your password with anyone
• Change your password regularly for better security
• Enable two-factor authentication if available

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
KYC Verification Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply to this email.
© 2024 Banking KYC System. All rights reserved.
    """
    
    msg.set_content(plain_text)
    msg.add_alternative(html_content, subtype='html')

    try:
        print(f"📧 Connecting to SMTP server {SMTP_SERVER}:{SMTP_PORT} ...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.set_debuglevel(0)  # Set to 1 for debugging
            server.starttls()
            print(f"🔐 Logging in as '{SMTP_USERNAME}' ...")
            server.login(SMTP_USERNAME, SMTP_KEY)
            print(f"📤 Sending email to {email} ...")
            server.send_message(msg)
            print("✅ Email sent successfully!")
            return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ SMTP Authentication failed: {e.smtp_code} {e.smtp_error.decode()}")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error occurred: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def send_rejection_email(email: str, reason: str = None) -> bool:
    """
    Send rejection email to user
    
    Args:
        email: User's email address
        reason: Optional reason for rejection
        
    Returns:
        True if email sent successfully, False otherwise
    """
    msg = EmailMessage()

    msg["Subject"] = "KYC Application Status Update"
    msg["From"] = EMAIL
    msg["To"] = email

    reason_text = f"\n\nReason: {reason}" if reason else ""
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(90deg, #dc3545 0%, #c82333 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🏦 KYC Verification Update</h1>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #dc3545;">❌ Application Requires Resubmission</h2>
                    
                    <p>Dear Customer,</p>
                    
                    <p>We regret to inform you that your KYC verification could not be completed at this time.{reason_text}</p>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 5px solid #ffc107; margin: 20px 0;">
                        <h3 style="color: #856404; margin-top: 0;">📝 Next Steps</h3>
                        <ul style="margin: 10px 0;">
                            <li>Please review your submitted documents</li>
                            <li>Ensure all photos are clear and legible</li>
                            <li>Make sure your face is clearly visible in the webcam capture</li>
                            <li>Resubmit your application with updated documents</li>
                        </ul>
                    </div>
                    
                    <p>If you have any questions or need assistance, please contact our support team.</p>
                    
                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>KYC Verification Team</strong>
                    </p>
                </div>
                
                <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; 2024 Banking KYC System. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    plain_text = f"""
KYC APPLICATION STATUS UPDATE

Dear Customer,

We regret to inform you that your KYC verification could not be completed at this time.{reason_text}

📝 NEXT STEPS:
• Please review your submitted documents
• Ensure all photos are clear and legible
• Make sure your face is clearly visible in the webcam capture
• Resubmit your application with updated documents

If you have any questions or need assistance, please contact our support team.

Best regards,
KYC Verification Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message. Please do not reply to this email.
© 2024 Banking KYC System. All rights reserved.
    """
    
    msg.set_content(plain_text)
    msg.add_alternative(html_content, subtype='html')

    try:
        print(f"📧 Connecting to SMTP server {SMTP_SERVER}:{SMTP_PORT} ...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.set_debuglevel(0)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_KEY)
            print(f"📤 Sending rejection email to {email} ...")
            server.send_message(msg)
            print("✅ Email sent successfully!")
            return True
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        return False


# For testing
if __name__ == "__main__":
    # Test the email function
    test_email = "test@example.com"
    test_userid = "VYM123456"
    test_password = "Abc12345"
    
    print("Testing activation email...")
    result = send_activation_email(test_email, test_userid, test_password)
    print(f"Result: {'Success' if result else 'Failed'}")