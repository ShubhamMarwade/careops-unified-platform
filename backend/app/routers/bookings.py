import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.contact import Contact
from app.models.service import Service, Availability
from app.schemas.booking import BookingCreate, BookingResponse, BookingStatusUpdate
from app.services.automation_engine import AutomationEngine
from app.models.automation import AutomationTrigger

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.get("/")
async def list_bookings(
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(Booking).filter(Booking.workspace_id == user.workspace_id)

    if status:
        query = query.filter(Booking.status == status)
    if date_from:
        query = query.filter(Booking.booking_date >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Booking.booking_date <= datetime.fromisoformat(date_to))

    total = query.count()
    bookings = query.order_by(Booking.booking_date.asc()).offset((page - 1) * limit).limit(limit).all()

    result = []
    for b in bookings:
        contact = db.query(Contact).filter(Contact.id == b.contact_id).first()
        service = db.query(Service).filter(Service.id == b.service_id).first()

        result.append({
            "id": str(b.id),
            "contact": {
                "id": str(contact.id),
                "name": contact.name,
                "email": contact.email,
                "phone": contact.phone
            } if contact else None,
            "service": {
                "id": str(service.id),
                "name": service.name,
                "duration_minutes": service.duration_minutes,
                "color": service.color
            } if service else None,
            "status": b.status.value,
            "booking_date": str(b.booking_date),
            "end_time": str(b.end_time),
            "notes": b.notes,
            "confirmation_sent": b.confirmation_sent,
            "created_at": str(b.created_at)
        })

    return {"bookings": result, "total": total, "page": page}


@router.get("/today")
async def get_today_bookings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    bookings = db.query(Booking).filter(
        Booking.workspace_id == user.workspace_id,
        Booking.booking_date >= today_start,
        Booking.booking_date < today_end
    ).order_by(Booking.booking_date.asc()).all()

    result = []
    for b in bookings:
        contact = db.query(Contact).filter(Contact.id == b.contact_id).first()
        service = db.query(Service).filter(Service.id == b.service_id).first()

        result.append({
            "id": str(b.id),
            "contact_name": contact.name if contact else "Unknown",
            "service_name": service.name if service else "Unknown",
            "service_color": service.color if service else "#3B82F6",
            "status": b.status.value,
            "booking_date": str(b.booking_date),
            "end_time": str(b.end_time)
        })

    return {"bookings": result, "count": len(result)}


@router.post("/", response_model=BookingResponse)
async def create_booking(
    req: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    service = db.query(Service).filter(
        Service.id == req.service_id,
        Service.workspace_id == user.workspace_id
    ).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Check for conflicting bookings
    end_time = req.booking_date + timedelta(minutes=service.duration_minutes)
    conflicts = db.query(Booking).filter(
        Booking.workspace_id == user.workspace_id,
        Booking.service_id == req.service_id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
        Booking.booking_date < end_time,
        Booking.end_time > req.booking_date
    ).count()

    if conflicts > 0:
        raise HTTPException(status_code=409, detail="Time slot already booked")

    contact = db.query(Contact).filter(
        Contact.id == req.contact_id,
        Contact.workspace_id == user.workspace_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    booking = Booking(
        id=uuid.uuid4(),
        workspace_id=user.workspace_id,
        contact_id=contact.id,
        service_id=service.id,
        status=BookingStatus.CONFIRMED,
        booking_date=req.booking_date,
        end_time=end_time,
        notes=req.notes
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Trigger automation
    engine = AutomationEngine(db)
    await engine.trigger(user.workspace_id, AutomationTrigger.BOOKING_CREATED, {
        "booking": booking,
        "contact": contact,
        "service": service
    })

    return booking


@router.put("/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    req: BookingStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.workspace_id == user.workspace_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    valid_statuses = [s.value for s in BookingStatus]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    booking.status = BookingStatus(req.status)
    db.commit()

    return {"status": "success", "booking_status": booking.status.value}


@router.get("/slots/{service_id}")
async def get_available_slots(
    service_id: str,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """Public endpoint to get available time slots for a service"""
    service = db.query(Service).filter(Service.id == service_id, Service.is_active == True).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    target_date = datetime.strptime(date, "%Y-%m-%d")
    day_of_week = target_date.weekday()

    # Get availability for this day
    availabilities = db.query(Availability).filter(
        Availability.service_id == service.id,
        Availability.day_of_week == day_of_week,
        Availability.is_active == True
    ).all()

    if not availabilities:
        return {"slots": [], "message": "No availability on this day"}

    # Generate slots
    slots = []
    for avail in availabilities:
        start_hour, start_min = map(int, avail.start_time.split(":"))
        end_hour, end_min = map(int, avail.end_time.split(":"))

        current = target_date.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
        end = target_date.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)

        while current + timedelta(minutes=service.duration_minutes) <= end:
            slot_end = current + timedelta(minutes=service.duration_minutes)

            # Check if slot is already booked
            conflict = db.query(Booking).filter(
                Booking.service_id == service.id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                Booking.booking_date < slot_end,
                Booking.end_time > current
            ).count()

            if conflict == 0 and current > datetime.utcnow():
                slots.append({
                    "start": str(current),
                    "end": str(slot_end),
                    "display": current.strftime("%I:%M %p")
                })

            current += timedelta(minutes=service.duration_minutes)

    return {"slots": slots, "date": date, "service": service.name}