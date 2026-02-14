from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationStatus
from app.models.form_submission import FormSubmission, SubmissionStatus
from app.models.inventory import InventoryItem
from app.models.alert import Alert

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/")
async def get_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    workspace_id = user.workspace_id
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)

    # === Booking Overview ===
    todays_bookings = db.query(Booking).filter(
        Booking.workspace_id == workspace_id,
        Booking.booking_date >= today_start,
        Booking.booking_date < today_end
    ).count()

    upcoming_bookings = db.query(Booking).filter(
        Booking.workspace_id == workspace_id,
        Booking.booking_date >= now,
        Booking.booking_date < week_end,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING])
    ).count()

    completed_bookings = db.query(Booking).filter(
        Booking.workspace_id == workspace_id,
        Booking.status == BookingStatus.COMPLETED
    ).count()

    no_show_bookings = db.query(Booking).filter(
        Booking.workspace_id == workspace_id,
        Booking.status == BookingStatus.NO_SHOW
    ).count()

    # === Leads & Conversations ===
    new_inquiries = db.query(Contact).filter(
        Contact.workspace_id == workspace_id,
        Contact.created_at >= today_start
    ).count()

    open_conversations = db.query(Conversation).filter(
        Conversation.workspace_id == workspace_id,
        Conversation.status == ConversationStatus.OPEN
    ).count()

    unanswered = db.query(Conversation).filter(
        Conversation.workspace_id == workspace_id,
        Conversation.status == ConversationStatus.OPEN
    ).count()

    total_contacts = db.query(Contact).filter(
        Contact.workspace_id == workspace_id
    ).count()

    # === Forms Status ===
    pending_forms = db.query(FormSubmission).filter(
        FormSubmission.workspace_id == workspace_id,
        FormSubmission.status == SubmissionStatus.PENDING
    ).count()

    overdue_forms = db.query(FormSubmission).filter(
        FormSubmission.workspace_id == workspace_id,
        FormSubmission.status == SubmissionStatus.OVERDUE
    ).count()

    completed_forms = db.query(FormSubmission).filter(
        FormSubmission.workspace_id == workspace_id,
        FormSubmission.status == SubmissionStatus.COMPLETED
    ).count()

    # === Inventory Alerts ===
    low_stock_items = db.query(InventoryItem).filter(
        InventoryItem.workspace_id == workspace_id,
        InventoryItem.is_active == True,
        InventoryItem.quantity <= InventoryItem.low_stock_threshold
    ).all()

    # === Key Alerts ===
    recent_alerts = db.query(Alert).filter(
        Alert.workspace_id == workspace_id,
        Alert.is_read == False
    ).order_by(Alert.created_at.desc()).limit(10).all()

    # === Today's Schedule ===
    todays_schedule = db.query(Booking).filter(
        Booking.workspace_id == workspace_id,
        Booking.booking_date >= today_start,
        Booking.booking_date < today_end
    ).order_by(Booking.booking_date.asc()).all()

    schedule_items = []
    for b in todays_schedule:
        from app.models.service import Service
        contact = db.query(Contact).filter(Contact.id == b.contact_id).first()
        service = db.query(Service).filter(Service.id == b.service_id).first()
        schedule_items.append({
            "id": str(b.id),
            "time": b.booking_date.strftime("%I:%M %p"),
            "end_time": b.end_time.strftime("%I:%M %p"),
            "contact_name": contact.name if contact else "Unknown",
            "service_name": service.name if service else "Unknown",
            "service_color": service.color if service else "#3B82F6",
            "status": b.status.value
        })

    return {
        "bookings": {
            "today": todays_bookings,
            "upcoming": upcoming_bookings,
            "completed": completed_bookings,
            "no_show": no_show_bookings
        },
        "leads": {
            "new_today": new_inquiries,
            "open_conversations": open_conversations,
            "unanswered": unanswered,
            "total_contacts": total_contacts
        },
        "forms": {
            "pending": pending_forms,
            "overdue": overdue_forms,
            "completed": completed_forms
        },
        "inventory": {
            "low_stock_items": [{
                "id": str(item.id),
                "name": item.name,
                "quantity": item.quantity,
                "threshold": item.low_stock_threshold,
                "unit": item.unit,
                "is_critical": item.quantity <= 0
            } for item in low_stock_items],
            "low_stock_count": len(low_stock_items)
        },
        "alerts": [{
            "id": str(a.id),
            "type": a.alert_type.value,
            "severity": a.severity.value,
            "title": a.title,
            "message": a.message,
            "link": a.link,
            "created_at": str(a.created_at)
        } for a in recent_alerts],
        "todays_schedule": schedule_items
    }


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.workspace_id == user.workspace_id
    ).first()
    if alert:
        alert.is_read = True
        db.commit()
    return {"status": "success"}


@router.post("/alerts/read-all")
async def mark_all_alerts_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    db.query(Alert).filter(
        Alert.workspace_id == user.workspace_id,
        Alert.is_read == False
    ).update({Alert.is_read: True})
    db.commit()
    return {"status": "success"}