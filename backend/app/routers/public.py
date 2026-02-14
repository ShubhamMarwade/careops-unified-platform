import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.workspace import Workspace
from app.models.contact import Contact, ContactSource
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, MessageType, MessageDirection, MessageStatus
from app.models.booking import Booking, BookingStatus
from app.models.service import Service, Availability
from app.models.form_template import FormTemplate
from app.models.form_submission import FormSubmission, SubmissionStatus
from app.schemas.contact import PublicContactForm
from app.schemas.booking import BookingCreate
from app.services.automation_engine import AutomationEngine
from app.models.automation import AutomationTrigger

router = APIRouter(prefix="/api/public", tags=["Public"])


@router.get("/workspace/{slug}")
async def get_public_workspace(slug: str, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(
        Workspace.slug == slug,
        Workspace.is_active == True
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "name": workspace.name,
        "slug": workspace.slug,
        "address": workspace.address,
        "timezone": workspace.timezone,
        "contact_email": workspace.contact_email,
        "phone": workspace.phone
    }


@router.post("/contact/{slug}")
async def submit_contact_form(
    slug: str,
    form: PublicContactForm,
    db: Session = Depends(get_db)
):
    workspace = db.query(Workspace).filter(
        Workspace.slug == slug,
        Workspace.is_active == True
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if not form.email and not form.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Check for existing contact
    existing = None
    if form.email:
        existing = db.query(Contact).filter(
            Contact.workspace_id == workspace.id,
            Contact.email == form.email
        ).first()
    if not existing and form.phone:
        existing = db.query(Contact).filter(
            Contact.workspace_id == workspace.id,
            Contact.phone == form.phone
        ).first()

    if existing:
        contact = existing
    else:
        contact = Contact(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            name=form.name,
            email=form.email,
            phone=form.phone,
            source=ContactSource.CONTACT_FORM
        )
        db.add(contact)

    # Create or find conversation
    conversation = db.query(Conversation).filter(
        Conversation.contact_id == contact.id,
        Conversation.workspace_id == workspace.id,
        Conversation.status != ConversationStatus.CLOSED
    ).first()

    if not conversation:
        conversation = Conversation(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            contact_id=contact.id,
            subject=f"Inquiry from {form.name}",
            status=ConversationStatus.OPEN,
            last_message_at=datetime.utcnow()
        )
        db.add(conversation)

    # Add message if provided
    if form.message:
        message = Message(
            id=uuid.uuid4(),
            conversation_id=conversation.id,
            message_type=MessageType.EMAIL if form.email else MessageType.SMS,
            direction=MessageDirection.INBOUND,
            content=form.message,
            status=MessageStatus.DELIVERED,
            is_automated=False
        )
        db.add(message)
        conversation.last_message_at = datetime.utcnow()

    db.commit()

    # Trigger automation
    if not existing:
        engine = AutomationEngine(db)
        await engine.trigger(workspace.id, AutomationTrigger.CONTACT_CREATED, {
            "contact": contact,
            "conversation": conversation
        })

    return {
        "status": "success",
        "message": "Thank you! We'll be in touch shortly."
    }


@router.get("/booking/{slug}")
async def get_booking_page(slug: str, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(
        Workspace.slug == slug,
        Workspace.is_active == True
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    services = db.query(Service).filter(
        Service.workspace_id == workspace.id,
        Service.is_active == True
    ).all()

    result = []
    for svc in services:
        avails = db.query(Availability).filter(
            Availability.service_id == svc.id,
            Availability.is_active == True
        ).all()

        result.append({
            "id": str(svc.id),
            "name": svc.name,
            "description": svc.description,
            "duration_minutes": svc.duration_minutes,
            "service_type": svc.service_type.value,
            "location": svc.location,
            "price": svc.price,
            "color": svc.color,
            "availabilities": [{
                "day_of_week": a.day_of_week,
                "start_time": a.start_time,
                "end_time": a.end_time
            } for a in avails]
        })

    return {
        "workspace": {
            "name": workspace.name,
            "address": workspace.address,
            "timezone": workspace.timezone
        },
        "services": result
    }


@router.post("/booking/{slug}")
async def create_public_booking(
    slug: str,
    req: BookingCreate,
    db: Session = Depends(get_db)
):
    workspace = db.query(Workspace).filter(
        Workspace.slug == slug,
        Workspace.is_active == True
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    service = db.query(Service).filter(
        Service.id == req.service_id,
        Service.workspace_id == workspace.id,
        Service.is_active == True
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Create or find contact
    contact = None
    if req.customer_email:
        contact = db.query(Contact).filter(
            Contact.workspace_id == workspace.id,
            Contact.email == req.customer_email
        ).first()

    if not contact and req.customer_phone:
        contact = db.query(Contact).filter(
            Contact.workspace_id == workspace.id,
            Contact.phone == req.customer_phone
        ).first()

    if not contact:
        if not req.customer_name:
            raise HTTPException(status_code=400, detail="Customer name is required")

        contact = Contact(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            name=req.customer_name,
            email=req.customer_email,
            phone=req.customer_phone,
            source=ContactSource.BOOKING
        )
        db.add(contact)
        db.flush()

    # Check availability
    end_time = req.booking_date + timedelta(minutes=service.duration_minutes)
    conflict = db.query(Booking).filter(
        Booking.workspace_id == workspace.id,
        Booking.service_id == service.id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
        Booking.booking_date < end_time,
        Booking.end_time > req.booking_date
    ).count()

    if conflict > 0:
        raise HTTPException(status_code=409, detail="This time slot is no longer available")

    booking = Booking(
        id=uuid.uuid4(),
        workspace_id=workspace.id,
        contact_id=contact.id,
        service_id=service.id,
        status=BookingStatus.CONFIRMED,
        booking_date=req.booking_date,
        end_time=end_time,
        notes=req.notes
    )
    db.add(booking)

        # Create conversation if new contact
    conversation = db.query(Conversation).filter(
        Conversation.contact_id == contact.id,
        Conversation.workspace_id == workspace.id
    ).first()

    if not conversation:
        conversation = Conversation(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            contact_id=contact.id,
            subject=f"Booking - {service.name}",
            status=ConversationStatus.OPEN,
            last_message_at=datetime.utcnow()
        )
        db.add(conversation)

    db.commit()
    db.refresh(booking)

    # Trigger automation
    engine = AutomationEngine(db)
    await engine.trigger(workspace.id, AutomationTrigger.BOOKING_CREATED, {
        "booking": booking,
        "contact": contact,
        "service": service
    })

    return {
        "status": "success",
        "message": "Your booking has been confirmed!",
        "booking": {
            "id": str(booking.id),
            "service": service.name,
            "date": str(booking.booking_date),
            "end_time": str(booking.end_time)
        }
    }


@router.get("/form/{submission_id}")
async def get_public_form(submission_id: str, db: Session = Depends(get_db)):
    """Public endpoint for customers to view and fill forms"""
    submission = db.query(FormSubmission).filter(
        FormSubmission.id == submission_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Form not found")

    if submission.status == SubmissionStatus.COMPLETED:
        return {"status": "completed", "message": "This form has already been submitted."}

    template = db.query(FormTemplate).filter(
        FormTemplate.id == submission.template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Form template not found")

    workspace = db.query(Workspace).filter(
        Workspace.id == submission.workspace_id
    ).first()

    contact = db.query(Contact).filter(
        Contact.id == submission.contact_id
    ).first()

    return {
        "submission_id": str(submission.id),
        "workspace_name": workspace.name if workspace else "",
        "template": {
            "id": str(template.id),
            "name": template.name,
            "description": template.description,
            "form_type": template.form_type,
            "fields": template.fields or []
        },
        "contact_name": contact.name if contact else "",
        "status": submission.status.value,
        "due_date": str(submission.due_date) if submission.due_date else None
    }


@router.post("/form/{submission_id}")
async def submit_public_form(
    submission_id: str,
    data: dict,
    db: Session = Depends(get_db)
):
    """Public endpoint for customers to submit forms"""
    submission = db.query(FormSubmission).filter(
        FormSubmission.id == submission_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Form not found")

    if submission.status == SubmissionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Form already submitted")

    submission.data = data.get("fields", data)
    submission.status = SubmissionStatus.COMPLETED
    submission.submitted_at = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "message": "Form submitted successfully! Thank you."
    }