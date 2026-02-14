from pydantic import BaseModel
from typing import Optional


class StaffInvite(BaseModel):
    email: str
    full_name: str
    password: str
    can_access_inbox: bool = True
    can_access_bookings: bool = True
    can_access_forms: bool = True
    can_access_inventory: bool = False


class StaffUpdate(BaseModel):
    can_access_inbox: Optional[bool] = None
    can_access_bookings: Optional[bool] = None
    can_access_forms: Optional[bool] = None
    can_access_inventory: Optional[bool] = None
    is_active: Optional[bool] = None


class StaffResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    can_access_inbox: bool
    can_access_bookings: bool
    can_access_forms: bool
    can_access_inventory: bool

    class Config:
        from_attributes = True