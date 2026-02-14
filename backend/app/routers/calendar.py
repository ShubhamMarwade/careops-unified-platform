from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.booking import Booking
from app.models.contact import Contact
from app.models.service import Service
from app.services.calendar_service import calendar_service, CalendarEvent

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])


@router.get("/booking/{booking_id}/ics")
async def get_booking_ics(
    booking_id: str,
    db: Session = Depends(get_db)
):
    """Generate ICS file for a booking"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    contact = db.query(Contact).filter(Contact.id == booking.contact_id).first()
    service = db.query(Service).filter(Service.id == booking.service_id).first()

    event = CalendarEvent(
        title=f"Appointment: {service.name if service else 'Service'}",
        start=booking.booking_date,
        end=booking.end_time,
        description=f"Booking with {contact.name if contact else 'Customer'}",
        location=service.location if service else "",
        attendees=[contact.email] if contact and contact.email else []
    )

    ics_content = calendar_service.generate_ics(event)
    
    return PlainTextResponse(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=booking-{booking_id}.ics"}
    )


@router.get("/booking/{booking_id}/google-link")
async def get_google_calendar_link(
    booking_id: str,
    db: Session = Depends(get_db)
):
    """Generate Google Calendar link for a booking"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    contact = db.query(Contact).filter(Contact.id == booking.contact_id).first()
    service = db.query(Service).filter(Service.id == booking.service_id).first()

    result = await calendar_service.create_booking_event({
        "service_name": service.name if service else "Service",
        "start_time": booking.booking_date,
        "end_time": booking.end_time,
        "contact_name": contact.name if contact else "Customer",
        "contact_email": contact.email if contact else "",
        "location": service.location if service else ""
    })

    return {"google_calendar_link": result["google_calendar_link"]}