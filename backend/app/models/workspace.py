import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    address = Column(Text, nullable=True)
    timezone = Column(String(50), default="UTC")
    contact_email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=False)

    onboarding_step = Column(String(50), default="workspace")
    onboarding_completed = Column(Boolean, default=False)

    email_provider = Column(String(50), nullable=True)
    email_config = Column(JSON, nullable=True)
    email_connected = Column(Boolean, default=False)

    sms_provider = Column(String(50), nullable=True)
    sms_config = Column(JSON, nullable=True)
    sms_connected = Column(Boolean, default=False)

    welcome_message = Column(Text, default="Thank you for contacting us! We'll get back to you shortly.")
    booking_confirmation_message = Column(Text, default="Your booking has been confirmed. We look forward to seeing you!")
    reminder_message = Column(Text, default="This is a reminder about your upcoming appointment.")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="workspace")
    contacts = relationship("Contact", back_populates="workspace")
    conversations = relationship("Conversation", back_populates="workspace")
    services = relationship("Service", back_populates="workspace")
    bookings = relationship("Booking", back_populates="workspace")
    form_templates = relationship("FormTemplate", back_populates="workspace")
    inventory_items = relationship("InventoryItem", back_populates="workspace")
    automation_rules = relationship("AutomationRule", back_populates="workspace")
    alerts = relationship("Alert", back_populates="workspace")


class WorkspaceSettings(Base):
    __tablename__ = "workspace_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), nullable=False)
    key = Column(String(100), nullable=False)
    value = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)