import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.contact import Contact, ContactSource
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, MessageType, MessageDirection, MessageStatus
from app.schemas.contact import ContactCreate, ContactResponse
from app.services.automation_engine import AutomationEngine
from app.models.automation import AutomationTrigger

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])


@router.get("/")
async def list_contacts(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(Contact).filter(Contact.workspace_id == user.workspace_id)

    if search:
        query = query.filter(
            or_(
                Contact.name.ilike(f"%{search}%"),
                Contact.email.ilike(f"%{search}%"),
                Contact.phone.ilike(f"%{search}%")
            )
        )

    total = query.count()
    contacts = query.order_by(Contact.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "contacts": [ContactResponse.from_orm(c) for c in contacts],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/{contact_id}")
async def get_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.workspace_id == user.workspace_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Get related data
    conversations = db.query(Conversation).filter(
        Conversation.contact_id == contact.id
    ).all()

    from app.models.booking import Booking
    bookings = db.query(Booking).filter(
        Booking.contact_id == contact.id
    ).order_by(Booking.booking_date.desc()).all()

    from app.models.form_submission import FormSubmission
    forms = db.query(FormSubmission).filter(
        FormSubmission.contact_id == contact.id
    ).all()

    return {
        "contact": ContactResponse.from_orm(contact),
        "conversations": [{"id": str(c.id), "status": c.status.value, "last_message_at": str(c.last_message_at)} for c in conversations],
        "bookings": [{"id": str(b.id), "status": b.status.value, "date": str(b.booking_date), "service_id": str(b.service_id)} for b in bookings],
        "forms": [{"id": str(f.id), "status": f.status.value, "template_id": str(f.template_id)} for f in forms]
    }


@router.post("/", response_model=ContactResponse)
async def create_contact(
    req: ContactCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    contact = Contact(
        id=uuid.uuid4(),
        workspace_id=user.workspace_id,
        name=req.name,
        email=req.email,
        phone=req.phone,
        notes=req.notes,
        source=ContactSource(req.source) if req.source else ContactSource.MANUAL
    )
    db.add(contact)

    # Create conversation
    conversation = Conversation(
        id=uuid.uuid4(),
        workspace_id=user.workspace_id,
        contact_id=contact.id,
        subject=f"Conversation with {req.name}",
        status=ConversationStatus.OPEN,
        last_message_at=datetime.utcnow()
    )
    db.add(conversation)
    db.commit()
    db.refresh(contact)

    # Trigger automation
    engine = AutomationEngine(db)
    await engine.trigger(user.workspace_id, AutomationTrigger.CONTACT_CREATED, {
        "contact": contact,
        "conversation": conversation
    })

    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    req: ContactCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.workspace_id == user.workspace_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.name = req.name
    if req.email:
        contact.email = req.email
    if req.phone:
        contact.phone = req.phone
    if req.notes:
        contact.notes = req.notes

    db.commit()
    db.refresh(contact)
    return contact