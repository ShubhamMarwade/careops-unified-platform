import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)


class WebhookService:
    """Webhook integration for external systems"""

    async def send_webhook(self, url: str, event: str, data: dict) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                payload = {
                    "event": event,
                    "data": data,
                    "timestamp": str(__import__('datetime').datetime.utcnow())
                }
                response = await client.post(url, json=payload)
                logger.info(f"Webhook sent to {url}: {response.status_code}")
                return {"success": True, "status_code": response.status_code}
        except Exception as e:
            logger.error(f"Webhook failed for {url}: {str(e)}")
            return {"success": False, "error": str(e)}


webhook_service = WebhookService()