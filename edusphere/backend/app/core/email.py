import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAILS_FROM_EMAIL = os.getenv("EMAILS_FROM_EMAIL")
EMAILS_FROM_NAME = os.getenv("EMAILS_FROM_NAME", "EduSphere")

async def send_otp_email(to_email: str, otp_code: str):
    """
    Sends an email containing the OTP code to the user asynchronously using Gmail SMTP.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[DEV MODE] SMTP credentials missing. OTP for {to_email}: {otp_code}")
        return

    message = EmailMessage()
    message["Subject"] = "EduSphere - Email Verification OTP"
    message["From"] = f"{EMAILS_FROM_NAME} <{EMAILS_FROM_EMAIL}>"
    message["To"] = to_email
    
    # Email body design
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4F46E5;">Welcome to EduSphere!</h2>
        <p>Your verification code for completing registration is:</p>
        <div style="background: #F3F4F6; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; width: fit-content; border-radius: 8px; color: #1F2937;">
            {otp_code}
        </div>
        <p style="margin-top: 20px; color: #6B7280; font-size: 14px;">This code will expire shortly. If you did not request this, please ignore this email.</p>
    </div>
    """
    
    message.set_content(f"Your EduSphere OTP is: {otp_code}")
    message.add_alternative(html_content, subtype="html")

    try:
        # Connecting to Gmail SMTP server securely using STARTTLS
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(message)
        server.quit()
        print(f"Successfully sent OTP email to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise e