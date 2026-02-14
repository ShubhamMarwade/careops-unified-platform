import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """Abstracted SMS service - supports Twilio and fallback logging"""

    def __init__(self, workspace_config: Optional[dict] = None):
        self.config = workspace_config or {}
        self.provider = self.config.get("provider", "log")

    async def send_sms(self, to_phone: str, message: str) -> dict:
        """Send SMS through configured provider"""
        try:
            if self.provider == "twilio" and settings.TWILIO_ACCOUNT_SID:
                return await self._send_twilio(to_phone, message)
            else:
                return await self._send_log(to_phone, message)
        except Exception as e:
            logger.error(f"SMS send failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _send_twilio(self, to_phone, message):
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            msg = client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=to_phone
            )
            logger.info(f"Twilio SMS sent to {to_phone}, SID: {msg.sid}")
            return {"success": True, "provider": "twilio", "sid": msg.sid}
        except Exception as e:
            logger.error(f"Twilio error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _send_log(self, to_phone, message):
        logger.info(f"📱 SMS TO: {to_phone} | MESSAGE: {message[:100]}...")
        return {"success": True, "provider": "log", "message": "SMS logged (demo mode)"}


sms_service = SMSService()