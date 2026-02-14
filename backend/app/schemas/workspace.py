from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class WorkspaceCreate(BaseModel):
    name: str
    address: Optional[str] = None
    timezone: str = "UTC"
    contact_email: str
    phone: Optional[str] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    welcome_message: Optional[str] = None
    booking_confirmation_message: Optional[str] = None
    reminder_message: Optional[str] = None


class CommunicationSetup(BaseModel):
    email_provider: Optional[str] = None
    email_config: Optional[dict] = None
    sms_provider: Optional[str] = None
    sms_config: Optional[dict] = None


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    address: Optional[str] = None
    timezone: str
    contact_email: str
    phone: Optional[str] = None
    is_active: bool
    onboarding_step: str
    onboarding_completed: bool
    email_connected: bool
    sms_connected: bool
    created_at: datetime

    class Config:
        from_attributes = True