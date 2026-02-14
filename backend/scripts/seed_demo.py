"""
Demo seed script - creates sample data for testing.
Run: python scripts/seed_demo.py
"""
import sys
sys.path.insert(0, '.')

import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.workspace import Workspace
from app.models.contact import Contact, ContactSource
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, MessageType, MessageDirection, MessageStatus
from app.models.service import Service, ServiceType, Availability
from app.models.booking import Booking, BookingStatus
from app.models.form_template import FormTemplate
from app.models.inventory import InventoryItem
from app.models.automation import AutomationRule, AutomationTrigger
from app.models.alert import Alert, AlertType, AlertSeverity

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    # Create all tables
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    print("Seeding demo data...")

    # Create workspace
    workspace_id = str(uuid.uuid4())
    workspace = Workspace(
        id=workspace_id,
        name="Sunrise Wellness Center",
        slug="sunrise-wellness",
        address="123 Wellness Drive, San Francisco, CA 94102",
        timezone="America/Los_Angeles",
        contact_email="hello@sunrise-wellness.com",
        phone="+1 415 555 0123",
        is_active=True,
        onboarding_completed=True,
        onboarding_step="completed",
        email_provider="demo",
        email_connected=True,
        sms_provider="demo",
        sms_connected=True,
        welcome_message="Welcome to Sunrise Wellness Center! Thank you for reaching out.",
        booking_confirmation_message="Your appointment has been confirmed!",
        reminder_message="Reminder about your upcoming appointment."
    )
    db.add(workspace)

    # Create owner
    owner_id = str(uuid.uuid4())
    owner = User(
        id=owner_id,
        email="owner@demo.com",
        hashed_password=pwd_context.hash("demo123"),
        full_name="Sarah Johnson",
        role=UserRole.OWNER,
        workspace_id=workspace_id,
        is_active=True
    )
    db.add(owner)

    # Create staff
    staff = User(
        id=str(uuid.uuid4()),
        email="staff@demo.com",
        hashed_password=pwd_context.hash("demo123"),
        full_name="Mike Chen",
        role=UserRole.STAFF,
        workspace_id=workspace_id,
        is_active=True,
        can_access_inbox=True,
        can_access_bookings=True,
        can_access_forms=True,
        can_access_inventory=True
    )
    db.add(staff)

    # Create services
    svc1 = Service(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name="Initial Consultation",
        description="60-minute initial consultation",
        duration_minutes=60,
        service_type=ServiceType.IN_PERSON,
        color="#3B82F6",
        location="Room 101",
        price=15000,
        is_active=True
    )
    db.add(svc1)

    svc2 = Service(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name="Follow-up Session",
        description="30-minute follow-up",
        duration_minutes=30,
        service_type=ServiceType.IN_PERSON,
        color="#10B981",
        location="Room 101",
        price=7500,
        is_active=True
    )
    db.add(svc2)

    created_services = [svc1, svc2]

    # Add availability (Mon-Fri 9-5)
    for svc in created_services:
        for day in range(5):
            avail = Availability(
                id=str(uuid.uuid4()),
                service_id=svc.id,
                day_of_week=day,
                start_time="09:00",
                end_time="17:00",
                is_active=True
            )
            db.add(avail)

    # Create contacts
    contacts_data = [
        {"name": "Alice Thompson", "email": "alice@example.com", "phone": "+1 555 0101"},
        {"name": "Bob Martinez", "email": "bob@example.com", "phone": "+1 555 0102"},
        {"name": "Carol Williams", "email": "carol@example.com", "phone": "+1 555 0103"},
        {"name": "David Lee", "email": "david@example.com", "phone": "+1 555 0104"},
    ]

    created_contacts = []
    for c_data in contacts_data:
        contact = Contact(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            name=c_data["name"],
            email=c_data["email"],
            phone=c_data["phone"],
            source=ContactSource.CONTACT_FORM
        )
        db.add(contact)
        created_contacts.append(contact)

        conv = Conversation(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            contact_id=contact.id,
            subject=f"Conversation with {c_data['name']}",
            status=ConversationStatus.OPEN,
            last_message_at=datetime.utcnow() - timedelta(hours=len(created_contacts))
        )
        db.add(conv)

        msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            message_type=MessageType.SYSTEM,
            direction=MessageDirection.OUTBOUND,
            content="Welcome to Sunrise Wellness Center!",
            status=MessageStatus.SENT,
            is_automated=True
        )
        db.add(msg)

    # Create bookings
    now = datetime.utcnow()
    booking1 = Booking(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        contact_id=created_contacts[0].id,
        service_id=svc1.id,
        status=BookingStatus.CONFIRMED,
        booking_date=now + timedelta(hours=2),
        end_time=now + timedelta(hours=3),
        confirmation_sent="yes",
        reminder_sent="no"
    )
    db.add(booking1)

    booking2 = Booking(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        contact_id=created_contacts[1].id,
        service_id=svc2.id,
        status=BookingStatus.COMPLETED,
        booking_date=now - timedelta(hours=24),
        end_time=now - timedelta(hours=23, minutes=30),
        confirmation_sent="yes",
        reminder_sent="yes"
    )
    db.add(booking2)

    # Create form template
    form_template = FormTemplate(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name="Patient Intake Form",
        description="Please complete before your visit",
        form_type="intake",
        fields=[
            {"label": "Date of Birth", "field_type": "text", "is_required": True, "sort_order": 0},
            {"label": "Emergency Contact", "field_type": "text", "is_required": True, "sort_order": 1},
            {"label": "Allergies", "field_type": "textarea", "is_required": False, "sort_order": 2},
        ],
        is_active=True
    )
    db.add(form_template)

    # Create inventory
    inv1 = InventoryItem(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name="Face Masks",
        quantity=50,
        low_stock_threshold=10,
        unit="boxes",
        is_active=True
    )
    db.add(inv1)

    inv2 = InventoryItem(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name="Sanitizer Bottles",
        quantity=3,
        low_stock_threshold=10,
        unit="bottles",
        is_active=True
    )
    db.add(inv2)

    # Create automation rules
    rules = [
        ("Welcome Message", AutomationTrigger.CONTACT_CREATED, "send_welcome"),
        ("Booking Confirmation", AutomationTrigger.BOOKING_CREATED, "send_confirmation"),
        ("Booking Reminder", AutomationTrigger.BOOKING_REMINDER, "send_reminder"),
        ("Form Reminder", AutomationTrigger.FORM_PENDING, "send_form_reminder"),
        ("Low Inventory Alert", AutomationTrigger.INVENTORY_LOW, "create_alert"),
        ("Pause on Staff Reply", AutomationTrigger.STAFF_REPLY, "pause_automation"),
    ]
    for name, trigger, action in rules:
        rule = AutomationRule(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            name=name,
            trigger=trigger,
            action=action,
            is_active=True
        )
        db.add(rule)

    # Create alerts
    alert = Alert(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        alert_type=AlertType.LOW_INVENTORY,
        severity=AlertSeverity.WARNING,
        title="Low stock: Sanitizer Bottles",
        message="3 bottles remaining (threshold: 10)",
        link="/dashboard/inventory",
        is_read=False
    )
    db.add(alert)

    db.commit()
    db.close()

    print("Demo data seeded successfully!")
    print(f"\nOwner login:  owner@demo.com / demo123")
    print(f"Staff login:  staff@demo.com / demo123")
    print(f"\nPublic Contact: /public/contact/sunrise-wellness")
    print(f"Public Booking: /public/book/sunrise-wellness")


if __name__ == "__main__":
    seed()