import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.form_submission import FormSubmission, SubmissionStatus
from app.models.contact import Contact
from app.models.workspace import Workspace
from app.models.alert import Alert, AlertType, AlertSeverity
from app.services.email_service import EmailService
from app.services.sms_service import SMSService
import uuid

logger = logging.getLogger(__name__)


class SchedulerService:
    """
    Background scheduler for time-based automations:
    - Booking reminders (24h before)
    - Overdue form detection
    - Periodic health checks
    """

    async def run_booking_reminders(self):
        """Send reminders for bookings happening in the next 24 hours"""
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            reminder_window_start = now + timedelta(hours=23)
            reminder_window_end = now + timedelta(hours=25)

            bookings = db.query(Booking).filter(
                Booking.status == BookingStatus.CONFIRMED,
                Booking.booking_date >= reminder_window_start,
                Booking.booking_date <= reminder_window_end,
                Booking.reminder_sent == "no"
            ).all()

            for booking in bookings:
                contact = db.query(Contact).filter(Contact.id == booking.contact_id).first()
                workspace = db.query(Workspace).filter(Workspace.id == booking.workspace_id).first()

                if not contact or not workspace:
                    continue

                reminder_msg = workspace.reminder_message or "Reminder: You have an upcoming appointment."
                reminder_msg += f"\nDate: {booking.booking_date.strftime('%B %d, %Y at %I:%M %p')}"

                if contact.email and workspace.email_connected:
                    email_svc = EmailService({"provider": workspace.email_provider})
                    await email_svc.send_email(
                        contact.email,
                        f"Reminder: Upcoming Appointment - {workspace.name}",
                        reminder_msg
                    )

                if contact.phone and workspace.sms_connected:
                    sms_svc = SMSService({"provider": workspace.sms_provider})
                    await sms_svc.send_sms(contact.phone, reminder_msg)

                booking.reminder_sent = "yes"
                db.commit()
                logger.info(f"Reminder sent for booking {booking.id}")

            logger.info(f"Booking reminders processed: {len(bookings)} sent")
        except Exception as e:
            logger.error(f"Reminder job failed: {str(e)}")
        finally:
            db.close()

    async def run_overdue_form_check(self):
        """Mark forms as overdue if past due date"""
        db = SessionLocal()
        try:
            now = datetime.utcnow()

            overdue_forms = db.query(FormSubmission).filter(
                FormSubmission.status == SubmissionStatus.PENDING,
                FormSubmission.due_date != None,
                FormSubmission.due_date < now
            ).all()

            for form in overdue_forms:
                form.status = SubmissionStatus.OVERDUE

                alert = Alert(
                    id=uuid.uuid4(),
                    workspace_id=form.workspace_id,
                    alert_type=AlertType.OVERDUE_FORM,
                    severity=AlertSeverity.WARNING,
                    title="Overdue form for contact",
                    message="A form submission is past its due date",
                    link="/dashboard/forms",
                    related_id=str(form.id)
                )
                db.add(alert)

            db.commit()
            logger.info(f"Overdue form check: {len(overdue_forms)} marked overdue")
        except Exception as e:
            logger.error(f"Overdue form check failed: {str(e)}")
        finally:
            db.close()

    async def run_missed_message_check(self):
        """Create alerts for unanswered conversations older than 2 hours"""
        db = SessionLocal()
        try:
            from app.models.conversation import Conversation, ConversationStatus

            threshold = datetime.utcnow() - timedelta(hours=2)

            unanswered = db.query(Conversation).filter(
                Conversation.status == ConversationStatus.OPEN,
                Conversation.last_message_at != None,
                Conversation.last_message_at < threshold
            ).all()

            for conv in unanswered:
                existing_alert = db.query(Alert).filter(
                    Alert.workspace_id == conv.workspace_id,
                    Alert.alert_type == AlertType.MISSED_MESSAGE,
                    Alert.related_id == str(conv.id),
                    Alert.is_read == False
                ).first()

                if not existing_alert:
                    contact = db.query(Contact).filter(Contact.id == conv.contact_id).first()
                    alert = Alert(
                        id=uuid.uuid4(),
                        workspace_id=conv.workspace_id,
                        alert_type=AlertType.MISSED_MESSAGE,
                        severity=AlertSeverity.WARNING,
                        title=f"Unanswered message from {contact.name if contact else 'customer'}",
                        message="This conversation has been waiting for over 2 hours",
                        link="/dashboard/inbox",
                        related_id=str(conv.id)
                    )
                    db.add(alert)

            db.commit()
            logger.info(f"Missed message check: {len(unanswered)} unanswered conversations")
        except Exception as e:
            logger.error(f"Missed message check failed: {str(e)}")
        finally:
            db.close()


scheduler_service = SchedulerService()