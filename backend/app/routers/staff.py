import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.middleware.auth import require_owner
from app.models.user import User, UserRole
from app.schemas.staff import StaffInvite, StaffUpdate, StaffResponse

router = APIRouter(prefix="/api/staff", tags=["Staff"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("/")
async def list_staff(
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    staff = db.query(User).filter(
        User.workspace_id == user.workspace_id,
        User.role == UserRole.STAFF
    ).all()

    return {"staff": [StaffResponse.from_orm(s) for s in staff]}


@router.post("/invite", response_model=StaffResponse)
async def invite_staff(
    req: StaffInvite,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    staff_user = User(
        id=uuid.uuid4(),
        email=req.email,
        hashed_password=pwd_context.hash(req.password),
        full_name=req.full_name,
        role=UserRole.STAFF,
        workspace_id=user.workspace_id,
        is_active=True,
        can_access_inbox=req.can_access_inbox,
        can_access_bookings=req.can_access_bookings,
        can_access_forms=req.can_access_forms,
        can_access_inventory=req.can_access_inventory
    )
    db.add(staff_user)
    db.commit()
    db.refresh(staff_user)
    return staff_user


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: str,
    req: StaffUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    staff_user = db.query(User).filter(
        User.id == staff_id,
        User.workspace_id == user.workspace_id,
        User.role == UserRole.STAFF
    ).first()
    if not staff_user:
        raise HTTPException(status_code=404, detail="Staff member not found")

    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(staff_user, key, value)

    db.commit()
    db.refresh(staff_user)
    return staff_user


@router.delete("/{staff_id}")
async def remove_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    staff_user = db.query(User).filter(
        User.id == staff_id,
        User.workspace_id == user.workspace_id,
        User.role == UserRole.STAFF
    ).first()
    if not staff_user:
        raise HTTPException(status_code=404, detail="Staff member not found")

    staff_user.is_active = False
    db.commit()
    return {"status": "success"}