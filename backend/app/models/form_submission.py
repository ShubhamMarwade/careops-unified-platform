import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    template_id = Column(String(36), ForeignKey("form_templates.id"), nullable=False)
    contact_id = Column(String(36), ForeignKey("contacts.id"), nullable=False)
    booking_id = Column(String(36), ForeignKey("bookings.id"), nullable=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.PENDING)
    data = Column(JSON, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    reminder_count = Column(String(10), default="0")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    template = relationship("FormTemplate", back_populates="submissions")
    contact = relationship("Contact", back_populates="form_submissions")