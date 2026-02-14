from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FormFieldSchema(BaseModel):
    label: str
    field_type: str
    is_required: bool = False
    options: Optional[List[str]] = None
    sort_order: int = 0


class FormTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    form_type: str = "intake"
    fields: Optional[List[FormFieldSchema]] = None


class FormTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    form_type: str
    fields: Optional[list] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FormSubmissionCreate(BaseModel):
    data: dict


class FormSubmissionResponse(BaseModel):
    id: str
    template_id: str
    contact_id: str
    booking_id: Optional[str] = None
    status: str
    data: Optional[dict] = None
    submitted_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True