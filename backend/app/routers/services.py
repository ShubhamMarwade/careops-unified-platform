import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import get_current_user, require_owner
from app.models.user import User
from app.models.service import Service, ServiceType, Availability
from app.schemas.booking import ServiceCreate, ServiceResponse, AvailabilityCreate

router = APIRouter(prefix="/api/services", tags=["Services"])


@router.get("/")
async def list_services(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    services = db.query(Service).filter(
        Service.workspace_id == user.workspace_id,
        Service.is_active == True
    ).all()

    result = []
    for svc in services:
        availabilities = db.query(Availability).filter(
            Availability.service_id == svc.id,
            Availability.is_active == True
        ).all()

        result.append({
            **ServiceResponse.from_orm(svc).dict(),
            "availabilities": [{
                "id": str(a.id),
                "day_of_week": a.day_of_week,
                "start_time": a.start_time,
                "end_time": a.end_time
            } for a in availabilities]
        })

    return {"services": result}


@router.post("/", response_model=ServiceResponse)
async def create_service(
    req: ServiceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    service = Service(
        id=uuid.uuid4(),
        workspace_id=user.workspace_id,
        name=req.name,
        description=req.description,
        duration_minutes=req.duration_minutes,
        service_type=ServiceType(req.service_type),
        location=req.location,
        price=req.price,
        color=req.color,
        linked_form_ids=req.linked_form_ids,
        linked_inventory=req.linked_inventory
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    req: ServiceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    service = db.query(Service).filter(
        Service.id == service_id,
        Service.workspace_id == user.workspace_id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == "service_type":
            setattr(service, key, ServiceType(value))
        else:
            setattr(service, key, value)

    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}")
async def delete_service(
    service_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    service = db.query(Service).filter(
        Service.id == service_id,
        Service.workspace_id == user.workspace_id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    service.is_active = False
    db.commit()
    return {"status": "success"}


@router.post("/{service_id}/availability")
async def set_availability(
    service_id: str,
    availabilities: list[AvailabilityCreate],
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    service = db.query(Service).filter(
        Service.id == service_id,
        Service.workspace_id == user.workspace_id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Clear existing availabilities
    db.query(Availability).filter(Availability.service_id == service.id).delete()

    # Add new ones
    for avail in availabilities:
        a = Availability(
            id=uuid.uuid4(),
            service_id=service.id,
            day_of_week=avail.day_of_week,
            start_time=avail.start_time,
            end_time=avail.end_time,
            is_active=True
        )
        db.add(a)

    db.commit()

    # Update workspace onboarding step
    from app.models.workspace import Workspace
    workspace = db.query(Workspace).filter(Workspace.id == user.workspace_id).first()
    if workspace and workspace.onboarding_step == "bookings":
        workspace.onboarding_step = "forms"
        db.commit()

    return {"status": "success", "count": len(availabilities)}