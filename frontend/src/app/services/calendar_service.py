import logging
from datetime import datetime, timedelta
from typing import Optional, List
import uuid

logger = logging.getLogger(__name__)


class CalendarEvent:
    def __init__(self, title: str, start: datetime, end: datetime, 
                 description: str = "", location: str = "", attendees: List[str] = None):
        self.id = str(uuid.uuid4())
        self.title = title
        self.start = start
        self.end = end
        self.description = description
        self.location = location
        self.attendees = attendees or []


class CalendarService:
    """
    Calendar integration service.
    Supports generating ICS files and Google Calendar links.
    """

    def generate_ics(self, event: CalendarEvent) -> str:
        """Generate an ICS calendar file content"""
        now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        start = event.start.strftime("%Y%m%dT%H%M%SZ")
        end = event.end.strftime("%Y%m%dT%H%M%SZ")

        attendee_lines = ""
        for email in event.attendees:
            attendee_lines += f"ATTENDEE;MAILTO:{email}\n"

        ics = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareOps//Booking//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:{start}
DTEND:{end}
DTSTAMP:{now}
UID:{event.id}@careops.io
SUMMARY:{event.title}
DESCRIPTION:{event.description}
LOCATION:{event.location}
{attendee_lines}STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""
        
        logger.info(f"📅 ICS generated for event: {event.title}")
        return ics

    def generate_google_calendar_link(self, event: CalendarEvent) -> str:
        """Generate a Google Calendar add event link"""
        start = event.start.strftime("%Y%m%dT%H%M%SZ")
        end = event.end.strftime("%Y%m%dT%H%M%SZ")
        
        import urllib.parse
        params = {
            "action": "TEMPLATE",
            "text": event.title,
            "dates": f"{start}/{end}",
            "details": event.description,
            "location": event.location,
        }
        
        base_url = "https://calendar.google.com/calendar/render"
        query = urllib.parse.urlencode(params)
        link = f"{base_url}?{query}"
        
        logger.info(f"📅 Google Calendar link generated for: {event.title}")
        return link

    async def create_booking_event(self, booking_data: dict) -> dict:
        """Create a calendar event from booking data"""
        event = CalendarEvent(
            title=f"Appointment: {booking_data.get('service_name', 'Service')}",
            start=booking_data.get('start_time', datetime.utcnow()),
            end=booking_data.get('end_time', datetime.utcnow() + timedelta(hours=1)),
            description=f"Booking with {booking_data.get('contact_name', 'Customer')}",
            location=booking_data.get('location', ''),
            attendees=[booking_data.get('contact_email', '')]
        )

        ics_content = self.generate_ics(event)
        google_link = self.generate_google_calendar_link(event)

        return {
            "event_id": event.id,
            "ics_content": ics_content,
            "google_calendar_link": google_link,
            "title": event.title,
            "start": str(event.start),
            "end": str(event.end)
        }


calendar_service = CalendarService()