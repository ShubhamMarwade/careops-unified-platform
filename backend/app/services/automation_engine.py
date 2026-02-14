import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import (
    AutomationRule, AutomationLog, Conversation, Message, Alert,
    FormSubmission, InventoryItem
)
from app.models.automation import AutomationTrigger
from app.models.message import MessageType, MessageDirection, MessageStatus
from app.models.alert import AlertType, AlertSeverity
from app.models.form_submission import SubmissionStatus
from app.services.email_service import EmailService
from app.services.sms_service import SMSService
import uuid

logger = logging.getLogger(__name__)


class AutomationEngine:
    """Event-based automation engine with strict, predictable rules"""

    def __init__(self, db: Session):
        self.db = db

    async def trigger(self, workspace_id, trigger_type: str, context: dict):
        """Process an automation trigger"""
        logger.info(f"🤖 Automation trigger: {trigger_type} for workspace {workspace_id}")

        # Check if automation should be paused for this conversation
        conversation_id = context.get("conversation_id")
        if conversation_id:
            conversation = self.db.query(Conversation).filter(
                Conversation.id == conversation_id
            ).first()
            if conversation and conversation.is_automation_paused:
                logger.info(f"Automation paused for conversation {conversation_id}")
                self._log(workspace_id, None, trigger_type, "skipped", "Automation paused by staff reply")
                return

        # Execute based on trigger type
        if trigger_type == AutomationTrigger.CONTACT_CREATED:
            await self._handle_contact_created(workspace_id, context)
        elif trigger_type == AutomationTrigger.BOOKING_CREATED:
            await self._handle_booking_created(workspace_id, context)
        elif trigger_type == AutomationTrigger.FORM_PENDING:
            await self._handle_form_pending(workspace_id, context)
        elif trigger_type == AutomationTrigger.INVENTORY_LOW:
            await self._handle_inventory_low(workspace_id, context)
        elif trigger_type == AutomationTrigger.STAFF_REPLY:
            await self._handle_staff_reply(workspace_id, context)

    async def _handle_contact_created(self, workspace_id, context):
        """Send welcome message when new contact is created"""
        from app.models import Workspace
        workspace = self.db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            return

        contact = context.get("contact")
        conversation = context.get("conversation")

        welcome_msg = workspace.welcome_message or "Thank you for contacting us! We'll get back to you shortly."

        # Create automated message
        message = Message(
            id=uuid.uuid4(),
            conversation_id=conversation.id if conversation else None,
            message_type=MessageType.EMAIL if contact.email else MessageType.SMS,
            direction=MessageDirection.OUTBOUND,
            content=welcome_msg,
            status=MessageStatus.SENT,
            is_automated=True
        )
        self.db.add(message)

        # Send via appropriate channel
        if contact.email and workspace.email_connected:
            email_svc = EmailService({"provider": workspace.email_provider})
            await email_svc.send_email(
                contact.email,
                f"Welcome to {workspace.name}",
                welcome_msg
            )

        if contact.phone and workspace.sms_connected:
            sms_svc = SMSService({"provider": workspace.sms_provider})
            await sms_svc.send_sms(contact.phone, welcome_msg)

        self.db.commit()
        self._log(workspace_id, None, "contact_created", "send_welcome", "success")

    async def _handle_booking_created(self, workspace_id, context):
        """Send confirmation and forms when booking is created"""
        from app.models import Workspace, Service
        workspace = self.db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            return

        booking = context.get("booking")
        contact = context.get("contact")
        service = self.db.query(Service).filter(Service.id == booking.service_id).first()

        confirmation_msg = workspace.booking_confirmation_message or "Your booking has been confirmed!"
        confirmation_msg += f"\n\nService: {service.name if service else 'N/A'}"
        confirmation_msg += f"\nDate: {booking.booking_date.strftime('%B %d, %Y at %I:%M %p')}"

        # Send confirmation
        if contact.email and workspace.email_connected:
            email_svc = EmailService({"provider": workspace.email_provider})
            await email_svc.send_email(
                contact.email,
                f"Booking Confirmation - {workspace.name}",
                confirmation_msg
            )

        if contact.phone and workspace.sms_connected:
            sms_svc = SMSService({"provider": workspace.sms_provider})
            await sms_svc.send_sms(contact.phone, confirmation_msg)

        # Create form submissions if service has linked forms
        if service and service.linked_form_ids:
            for form_id in service.linked_form_ids:
                submission = FormSubmission(
                    id=uuid.uuid4(),
                    template_id=form_id,
                    contact_id=contact.id,
                    booking_id=booking.id,
                    workspace_id=workspace_id,
                    status=SubmissionStatus.PENDING,
                    due_date=booking.booking_date - timedelta(days=1)
                )
                self.db.add(submission)

                # Send form link
                if contact.email and workspace.email_connected:
                    from app.config import settings
                    form_link = f"{settings.FRONTEND_URL}/public/form/{submission.id}"
                    await email_svc.send_email(
                        contact.email,
                        f"Please complete your form - {workspace.name}",
                        f"Please complete this form before your appointment: {form_link}"
                    )

        # Deduct inventory if service has linked items
        if service and service.linked_inventory:
            for inv in service.linked_inventory:
                item = self.db.query(InventoryItem).filter(
                    InventoryItem.id == inv.get("item_id")
                ).first()
                if item:
                    item.quantity -= inv.get("quantity_per_booking", 1)
                    if item.quantity <= item.low_stock_threshold:
                        await self.trigger(workspace_id, AutomationTrigger.INVENTORY_LOW, {"item": item})

        booking.confirmation_sent = "yes"
        self.db.commit()
        self._log(workspace_id, None, "booking_created", "send_confirmation", "success")

    async def _handle_form_pending(self, workspace_id, context):
        """Send reminder for pending forms"""
        submission = context.get("submission")
        contact = context.get("contact")

        from app.models import Workspace
        workspace = self.db.query(Workspace).filter(Workspace.id == workspace_id).first()

        if contact.email and workspace.email_connected:
            from app.config import settings
            form_link = f"{settings.FRONTEND_URL}/public/form/{submission.id}"
            email_svc = EmailService({"provider": workspace.email_provider})
            await email_svc.send_email(
                contact.email,
                f"Reminder: Please complete your form - {workspace.name}",
                f"You have a pending form. Please complete it here: {form_link}"
            )

        self._log(workspace_id, None, "form_pending", "send_reminder", "success")

    async def _handle_inventory_low(self, workspace_id, context):
        """Create alert when inventory is low"""
        item = context.get("item")

        severity = AlertSeverity.CRITICAL if item.quantity <= 0 else AlertSeverity.WARNING
        alert = Alert(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            alert_type=AlertType.LOW_INVENTORY,
            severity=severity,
            title=f"Low stock: {item.name}",
            message=f"{item.name} has {item.quantity} {item.unit} remaining (threshold: {item.low_stock_threshold})",
            link=f"/dashboard/inventory",
            related_id=str(item.id)
        )
        self.db.add(alert)
        self.db.commit()
        self._log(workspace_id, None, "inventory_low", "create_alert", "success")

    async def _handle_staff_reply(self, workspace_id, context):
        """Pause automation when staff replies"""
        conversation_id = context.get("conversation_id")
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        if conversation:
            conversation.is_automation_paused = True
            self.db.commit()
        self._log(workspace_id, None, "staff_reply", "pause_automation", "success")

    def _log(self, workspace_id, rule_id, trigger, action, status, details=None):
        log = AutomationLog(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            rule_id=rule_id,
            trigger=trigger,
            action=action,
            status=status,
            details=details
        )
        self.db.add(log)
        self.db.commit()