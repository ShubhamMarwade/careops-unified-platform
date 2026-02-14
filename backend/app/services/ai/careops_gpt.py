from sqlalchemy.orm import Session
from app.services.ai.groq_client import generate_response


def generate_careops_response(db: Session, workspace_id: str, user_message: str):

    print("INSIDE generate_careops_response")

    from app.models.workspace import Workspace
    from app.models.booking import Booking
    from app.models.user import User

    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id
    ).first()

    if not workspace:
        return "Workspace not found."

    total_bookings = db.query(Booking).filter(
        Booking.workspace_id == workspace_id
    ).count()

    total_users = db.query(User).filter(
        User.workspace_id == workspace_id
    ).count()

    business_context = f"""
    Business Name: {workspace.name}
    Total Bookings: {total_bookings}
    Total Users: {total_users}
    Active: {workspace.is_active}
    """

    final_prompt = f"""
    You are CareOpsGPT — an elite AI Business Intelligence Advisor for high-growth service businesses. 
    
    You ONLY answer in the context of managing service businesses.

    If the user asks about forms, bookings, customers, revenue,
    always respond with practical fields and structured output.

    Business Metrics:
    {business_context}

    User Request:
    {user_message}

    Response Rules:
- Write in premium executive tone.
- Use structured bullet points.
- Use relevant but minimal emojis (not too many).
- Provide deeper strategic insights (not obvious statements).
- Highlight risks, opportunities, and growth levers.
- Keep it concise but powerful.
- Format sections like this:

📊 Executive Snapshot
📈 Performance Insights
⚠️ Risk Signals
🚀 Growth Opportunities
🎯 Strategic Focus

Make it feel like a McKinsey-style business brief.
Avoid generic advice.
Be specific and strategic.
    """

    print("FINAL PROMPT:", final_prompt)  # Debug

    return generate_response(final_prompt)
