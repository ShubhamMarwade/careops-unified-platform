from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = 30
    service_type: str = "in_person"
    location: Optional[str] = None
    price: Optional[int] = None
    color: str = "#3B82F6"
    linked_form_ids: Optional[List[str]] = None
    linked_inventory: Optional[List[dict]] = None


class ServiceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    duration_minutes: int
    service_type: str
    location: Optional[str] = None
    price: Optional[int] = None
    color: str
    is_active: bool
    linked_form_ids: Optional[List[str]] = None
    linked_inventory: Optional[List[dict]] = None

    class Config:
        from_attributes = True


class AvailabilityCreate(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str


class BookingCreate(BaseModel):
    contact_id: Optional[str] = None
    service_id: str
    booking_date: datetime
    notes: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None


class BookingResponse(BaseModel):
    id: str
    workspace_id: str
    contact_id: str
    service_id: str
    status: str
    booking_date: datetime
    end_time: datetime
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BookingStatusUpdate(BaseModel):
    status: str