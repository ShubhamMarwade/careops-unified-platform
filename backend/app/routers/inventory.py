import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import get_current_user, require_owner
from app.models.user import User
from app.models.inventory import InventoryItem, InventoryLog
from app.schemas.inventory import InventoryItemCreate, InventoryItemResponse, InventoryAdjustment
from app.services.automation_engine import AutomationEngine
from app.models.automation import AutomationTrigger

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


@router.get("/")
async def list_inventory(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    items = db.query(InventoryItem).filter(
        InventoryItem.workspace_id == user.workspace_id,
        InventoryItem.is_active == True
    ).all()

    result = []
    for item in items:
        resp = InventoryItemResponse.from_orm(item)
        resp.is_low_stock = item.quantity <= item.low_stock_threshold
        result.append(resp)

    return {"items": result}


@router.post("/", response_model=InventoryItemResponse)
async def create_inventory_item(
    req: InventoryItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    item = InventoryItem(
        id=uuid.uuid4(),
        workspace_id=user.workspace_id,
        name=req.name,
        description=req.description,
        quantity=req.quantity,
        low_stock_threshold=req.low_stock_threshold,
        unit=req.unit
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    resp = InventoryItemResponse.from_orm(item)
    resp.is_low_stock = item.quantity <= item.low_stock_threshold
    return resp


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: str,
    req: InventoryItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.workspace_id == user.workspace_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.name = req.name
    item.description = req.description
    item.quantity = req.quantity
    item.low_stock_threshold = req.low_stock_threshold
    item.unit = req.unit
    db.commit()
    db.refresh(item)

    resp = InventoryItemResponse.from_orm(item)
    resp.is_low_stock = item.quantity <= item.low_stock_threshold
    return resp


@router.post("/{item_id}/adjust")
async def adjust_inventory(
    item_id: str,
    req: InventoryAdjustment,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.workspace_id == user.workspace_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    old_quantity = item.quantity
    item.quantity += req.change

    if item.quantity < 0:
        item.quantity = 0

    log = InventoryLog(
        id=uuid.uuid4(),
        item_id=item.id,
        change=req.change,
        reason=req.reason
    )
    db.add(log)
    db.commit()

    # Check low stock
    if item.quantity <= item.low_stock_threshold and old_quantity > item.low_stock_threshold:
        engine = AutomationEngine(db)
        await engine.trigger(user.workspace_id, AutomationTrigger.INVENTORY_LOW, {"item": item})

    return {
        "status": "success",
        "previous_quantity": old_quantity,
        "new_quantity": item.quantity,
        "is_low_stock": item.quantity <= item.low_stock_threshold
    }


@router.delete("/{item_id}")
async def delete_inventory_item(
    item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.workspace_id == user.workspace_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.is_active = False
    db.commit()
    return {"status": "success"}