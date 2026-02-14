import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Abstracted email service - supports SendGrid and fallback logging"""

    def __init__(self, workspace_config: Optional[dict] = None):
        self.config = workspace_config or {}
        self.provider = self.config.get("provider", "log")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        from_email: Optional[str] = None
    ) -> dict:
        """Send email through configured provider"""
        try:
            if self.provider == "sendgrid" and settings.SENDGRID_API_KEY:
                return await self._send_sendgrid(to_email, subject, body, from_email)
            else:
                return await self._send_log(to_email, subject, body)
        except Exception as e:
            logger.error(f"Email send failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _send_sendgrid(self, to_email, subject, body, from_email):
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail

            sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
            message = Mail(
                from_email=from_email or settings.SENDGRID_FROM_EMAIL,
                to_emails=to_email,
                subject=subject,
                html_content=body
            )
            response = sg.send(message)
            logger.info(f"SendGrid email sent to {to_email}, status: {response.status_code}")
            return {"success": True, "provider": "sendgrid", "status": response.status_code}
        except Exception as e:
            logger.error(f"SendGrid error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _send_log(self, to_email, subject, body):
        """Fallback: log email for demo/development"""
        logger.info(f"📧 EMAIL TO: {to_email} | SUBJECT: {subject} | BODY: {body[:100]}...")
        return {"success": True, "provider": "log", "message": "Email logged (demo mode)"}


email_service = EmailService()