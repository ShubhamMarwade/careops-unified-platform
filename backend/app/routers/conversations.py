import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, MessageType, MessageDirection, MessageStatus
from app.services.automation_engine import AutomationEngine
from app.services.email_service import EmailService
from app.services.sms_service import SMSService
from app.models.automation import AutomationTrigger

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


@router.get("/")
async def list_conversations(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(Conversation).filter(
        Conversation.workspace_id == user.workspace_id
    )

    if status:
        query = query.filter(Conversation.status == status)

    total = query.count()
    conversations = query.options(
        joinedload(Conversation.contact)
    ).order_by(
        Conversation.last_message_at.desc().nullslast()
    ).offset((page - 1) * limit).limit(limit).all()

    result = []
    for conv in conversations:
        last_message = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(Message.created_at.desc()).first()

        unread_count = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.direction == MessageDirection.INBOUND,
            Message.status != MessageStatus.DELIVERED
        ).count()

        result.append({
            "id": str(conv.id),
            "contact": {
                "id": str(conv.contact.id),
                "name": conv.contact.name,
                "email": conv.contact.email,
                "phone": conv.contact.phone
            } if conv.contact else None,
            "subject": conv.subject,
            "status": conv.status.value,
            "is_automation_paused": conv.is_automation_paused,
            "last_message": {
                "content": last_message.content[:100] if last_message else None,
                "type": last_message.message_type.value if last_message else None,
                "direction": last_message.direction.value if last_message else None,
                "created_at": str(last_message.created_at) if last_message else None
            },
            "unread_count": unread_count,
            "last_message_at": str(conv.last_message_at) if conv.last_message_at else None,
            "created_at": str(conv.created_at)
        })

    return {"conversations": result, "total": total, "page": page}


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.workspace_id == user.workspace_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    contact = db.query(Contact).filter(Contact.id == conv.contact_id).first()

    messages = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at.asc()).all()

    return {
        "conversation": {
            "id": str(conv.id),
            "status": conv.status.value,
            "subject": conv.subject,
            "is_automation_paused": conv.is_automation_paused,
            "created_at": str(conv.created_at)
        },
        "contact": {
            "id": str(contact.id),
            "name": contact.name,
            "email": contact.email,
            "phone": contact.phone
        } if contact else None,
        "messages": [{
            "id": str(m.id),
            "type": m.message_type.value,
            "direction": m.direction.value,
            "content": m.content,
            "status": m.status.value,
            "is_automated": m.is_automated,
            "sender_id": str(m.sender_id) if m.sender_id else None,
            "created_at": str(m.created_at)
        } for m in messages]
    }


@router.post("/{conversation_id}/reply")
async def reply_to_conversation(
    conversation_id: str,
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.workspace_id == user.workspace_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    contact = db.query(Contact).filter(Contact.id == conv.contact_id).first()

    content = body.get("content", "")
    channel = body.get("channel", "email")  # email or sms

    if not content.strip():
        raise HTTPException(status_code=400, detail="Message content is required")

    # Create message
    message = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        sender_id=user.id,
        message_type=MessageType.EMAIL if channel == "email" else MessageType.SMS,
        direction=MessageDirection.OUTBOUND,
        content=content,
        status=MessageStatus.SENT,
        is_automated=False
    )
    db.add(message)

    # Update conversation
    conv.status = ConversationStatus.REPLIED
    conv.last_message_at = datetime.utcnow()
    db.commit()

    # Send through channel
    from app.models.workspace import Workspace
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()

    if channel == "email" and contact.email:
        email_svc = EmailService({"provider": workspace.email_provider})
        await email_svc.send_email(contact.email, f"Re: {conv.subject or 'Your inquiry'}", content)
    elif channel == "sms" and contact.phone:
        sms_svc = SMSService({"provider": workspace.sms_provider})
        await sms_svc.send_sms(contact.phone, content)

    # Trigger staff reply automation (pause further automation)
    engine = AutomationEngine(db)
    await engine.trigger(user.workspace_id, AutomationTrigger.STAFF_REPLY, {
        "conversation_id": conv.id
    })

    return {"status": "success", "message_id": str(message.id)}


@router.put("/{conversation_id}/status")
async def update_conversation_status(
    conversation_id: str,
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.workspace_id == user.workspace_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    new_status = body.get("status")
    if new_status in [s.value for s in ConversationStatus]:
        conv.status = ConversationStatus(new_status)
        db.commit()

    return {"status": "success"}