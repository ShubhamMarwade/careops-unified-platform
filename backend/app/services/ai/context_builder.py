from app.models.booking import Booking
from app.models.contact import Contact
from app.models.service import Service
from app.models.workspace import Workspace


def build_business_context(db, workspace_id):

    workspace = db.query(Workspace).filter_by(id=workspace_id).first()

    total_bookings = (
        db.query(Booking)
        .filter_by(workspace_id=workspace_id)
        .count()
    )

    total_contacts = (
        db.query(Contact)
        .filter_by(workspace_id=workspace_id)
        .count()
    )

    total_services = (
        db.query(Service)
        .filter_by(workspace_id=workspace_id)
        .count()
    )

    return f"""
    Business Overview for {workspace.name}:

    - Total Bookings: {total_bookings}
    - Total Clients: {total_contacts}
    - Total Services: {total_services}
    """
