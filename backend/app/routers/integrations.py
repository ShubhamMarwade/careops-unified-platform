import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import require_owner
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceSettings
from app.services.email_service import EmailService
from app.services.sms_service import SMSService

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


@router.get("/")
async def list_integrations(
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Get webhook settings
    webhook_settings = db.query(WorkspaceSettings).filter(
        WorkspaceSettings.workspace_id == workspace.id,
        WorkspaceSettings.key == "webhooks"
    ).first()

    return {
        "email": {
            "connected": workspace.email_connected,
            "provider": workspace.email_provider,
            "config": {k: "***" if "key" in k.lower() or "secret" in k.lower() else v
                      for k, v in (workspace.email_config or {}).items()}
        },
        "sms": {
            "connected": workspace.sms_connected,
            "provider": workspace.sms_provider,
            "config": {k: "***" if "key" in k.lower() or "token" in k.lower() or "secret" in k.lower() else v
                      for k, v in (workspace.sms_config or {}).items()}
        },
        "webhooks": webhook_settings.value if webhook_settings else []
    }


@router.post("/email/test")
async def test_email(
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace or not workspace.email_connected:
        raise HTTPException(status_code=400, detail="Email not configured")

    email_svc = EmailService({"provider": workspace.email_provider})
    result = await email_svc.send_email(
        to_email=body.get("to_email", user.email),
        subject="CareOps - Test Email",
        body="<h2>Email Integration Test</h2><p>Your email integration is working correctly!</p>"
    )

    return {"status": "success" if result.get("success") else "failed", "details": result}


@router.post("/sms/test")
async def test_sms(
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace or not workspace.sms_connected:
        raise HTTPException(status_code=400, detail="SMS not configured")

    sms_svc = SMSService({"provider": workspace.sms_provider})
    result = await sms_svc.send_sms(
        to_phone=body.get("to_phone"),
        message="CareOps Test: Your SMS integration is working correctly!"
    )

    return {"status": "success" if result.get("success") else "failed", "details": result}


@router.post("/webhooks")
async def configure_webhooks(
    body: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    webhook_url = body.get("url")
    events = body.get("events", [])

    if not webhook_url:
        raise HTTPException(status_code=400, detail="Webhook URL is required")

    # Store webhook config
    setting = db.query(WorkspaceSettings).filter(
        WorkspaceSettings.workspace_id == workspace.id,
        WorkspaceSettings.key == "webhooks"
    ).first()

    webhook_entry = {
        "id": str(uuid.uuid4()),
        "url": webhook_url,
        "events": events,
        "active": True
    }

    if setting:
        current = setting.value or []
        current.append(webhook_entry)
        setting.value = current
    else:
        setting = WorkspaceSettings(
            id=uuid.uuid4(),
            workspace_id=workspace.id,
            key="webhooks",
            value=[webhook_entry]
        )
        db.add(setting)

    db.commit()
    return {"status": "success", "webhook": webhook_entry}


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    setting = db.query(WorkspaceSettings).filter(
        WorkspaceSettings.workspace_id == workspace.id,
        WorkspaceSettings.key == "webhooks"
    ).first()

    if setting and setting.value:
        setting.value = [w for w in setting.value if w.get("id") != webhook_id]
        db.commit()

    return {"status": "success"}