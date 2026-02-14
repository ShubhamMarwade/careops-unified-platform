import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class AutomationTrigger(str, enum.Enum):
    CONTACT_CREATED = "contact_created"
    BOOKING_CREATED = "booking_created"
    BOOKING_REMINDER = "booking_reminder"
    FORM_PENDING = "form_pending"
    INVENTORY_LOW = "inventory_low"
    STAFF_REPLY = "staff_reply"


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(255), nullable=False)
    trigger = Column(SQLEnum(AutomationTrigger), nullable=False)
    action = Column(String(50), nullable=False)
    config = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="automation_rules")


class AutomationLog(Base):
    __tablename__ = "automation_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    rule_id = Column(String(36), ForeignKey("automation_rules.id"), nullable=True)
    trigger = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    status = Column(String(50), default="success")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)