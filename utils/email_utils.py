import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

PROVIDERS = {
    "gmail": ("smtp.gmail.com", 587),
    "outlook": ("smtp-mail.outlook.com", 587),
    "yahoo": ("smtp.mail.yahoo.com", 587),
}


def send_password_reset_email(to_email: str, passcode: str, provider: str = "gmail") -> tuple[bool, str]:
    host, port = PROVIDERS.get(provider.lower(), PROVIDERS["gmail"])

    smtp_host = os.getenv("SMTP_HOST", host)
    smtp_port = int(os.getenv("SMTP_PORT", port))
    smtp_user = os.getenv("SMTP_USERNAME", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    email_from = os.getenv("EMAIL_FROM", smtp_user)

    if not smtp_user or not smtp_pass:
        return False, "SMTP credentials are not configured. Check your .env file."

    subject = "Let's Evaluate – Password Reset Code"
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 40px;">
      <div style="max-width: 480px; margin: auto; background: white; border-radius: 12px;
                  padding: 32px; box-shadow: 0 4px 16px rgba(79,70,229,0.12);">
        <h2 style="color: #4F46E5; margin-bottom: 8px;">🎯 Let's Evaluate</h2>
        <p style="color: #1e293b;">You requested a password reset. Use the code below:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px;
                       color: #4F46E5; background: #EEF2FF; padding: 16px 28px;
                       border-radius: 10px; display: inline-block;">{passcode}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code expires in <strong>15 minutes</strong>.</p>
        <p style="color: #64748b; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = email_from
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(email_from, to_email, msg.as_string())
        return True, ""
    except smtplib.SMTPAuthenticationError:
        return False, "SMTP authentication failed. Check your username and app password."
    except smtplib.SMTPException as exc:
        return False, f"SMTP error: {exc}"
    except Exception as exc:
        return False, f"Unexpected error sending email: {exc}"
