from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InventoryItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int = 0
    low_stock_threshold: int = 5
    unit: str = "units"


class InventoryItemResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    quantity: int
    low_stock_threshold: int
    unit: str
    is_active: bool
    is_low_stock: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class InventoryAdjustment(BaseModel):
    change: int
    reason: Optional[str] = None