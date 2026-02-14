import uuid
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import get_current_user, require_owner
from app.models.user import User
from app.models.workspace import Workspace
from app.models.automation import AutomationRule, AutomationTrigger
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, CommunicationSetup, WorkspaceResponse

router = APIRouter(prefix="/api/workspace", tags=["Workspace"])


def generate_slug(name: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug


@router.post("/", response_model=WorkspaceResponse)
async def create_workspace(
    req: WorkspaceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    if user.workspace_id:
        raise HTTPException(status_code=400, detail="You already have a workspace")

    slug = generate_slug(req.name)
    existing = db.query(Workspace).filter(Workspace.slug == slug).first()
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"

    workspace = Workspace(
        id=str(uuid.uuid4()),
        name=req.name,
        slug=slug,
        address=req.address,
        timezone=req.timezone,
        contact_email=req.contact_email,
        phone=req.phone,
        onboarding_step="communications"
    )
    db.add(workspace)

    user.workspace_id = workspace.id
    db.commit()
    db.refresh(workspace)

    # Create default automation rules
    default_rules = [
        ("Welcome Message", AutomationTrigger.CONTACT_CREATED, "send_welcome"),
        ("Booking Confirmation", AutomationTrigger.BOOKING_CREATED, "send_confirmation"),
        ("Booking Reminder", AutomationTrigger.BOOKING_REMINDER, "send_reminder"),
        ("Form Reminder", AutomationTrigger.FORM_PENDING, "send_form_reminder"),
        ("Low Inventory Alert", AutomationTrigger.INVENTORY_LOW, "create_alert"),
        ("Pause on Staff Reply", AutomationTrigger.STAFF_REPLY, "pause_automation"),
    ]
    for name, trigger, action in default_rules:
        rule = AutomationRule(
            id=str(uuid.uuid4()),
            workspace_id=workspace.id,
            name=name,
            trigger=trigger,
            action=action,
            is_active=True
        )
        db.add(rule)
    db.commit()

    return workspace


@router.get("/", response_model=WorkspaceResponse)
async def get_workspace(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not user.workspace_id:
        raise HTTPException(status_code=404, detail="No workspace found")

    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.put("/", response_model=WorkspaceResponse)
async def update_workspace(
    req: WorkspaceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workspace, key, value)

    db.commit()
    db.refresh(workspace)
    return workspace


@router.post("/setup-communications")
async def setup_communications(
    req: CommunicationSetup,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.email_provider:
        workspace.email_provider = req.email_provider
        workspace.email_config = req.email_config
        workspace.email_connected = True

    if req.sms_provider:
        workspace.sms_provider = req.sms_provider
        workspace.sms_config = req.sms_config
        workspace.sms_connected = True

    if not workspace.email_connected and not workspace.sms_connected:
        raise HTTPException(status_code=400, detail="At least one communication channel is required")

    workspace.onboarding_step = "contact_form"
    db.commit()
    db.refresh(workspace)

    return {"status": "success", "message": "Communication channels configured"}


@router.post("/update-onboarding-step")
async def update_onboarding_step(
    step: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    valid_steps = ["workspace", "communications", "contact_form", "bookings", "forms", "inventory", "staff", "activate"]
    new_step = step.get("step")
    if new_step not in valid_steps:
        raise HTTPException(status_code=400, detail="Invalid onboarding step")

    workspace.onboarding_step = new_step
    db.commit()

    return {"status": "success", "step": new_step}


@router.post("/activate")
async def activate_workspace(
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    errors = []
    if not workspace.email_connected and not workspace.sms_connected:
        errors.append("At least one communication channel must be connected")

    from app.models.service import Service, Availability
    services = db.query(Service).filter(
        Service.workspace_id == workspace.id,
        Service.is_active == True
    ).count()
    if services == 0:
        errors.append("At least one booking type/service must exist")

    availabilities = db.query(Availability).join(Service).filter(
        Service.workspace_id == workspace.id
    ).count()
    if availabilities == 0:
        errors.append("Availability must be defined for at least one service")

    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    workspace.is_active = True
    workspace.onboarding_completed = True
    workspace.onboarding_step = "completed"
    db.commit()

    return {"status": "success", "message": "Workspace activated successfully!"}