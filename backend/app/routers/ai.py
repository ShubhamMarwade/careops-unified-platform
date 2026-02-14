from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.ai.careops_gpt import generate_careops_response

router = APIRouter(prefix="/ai", tags=["AI"])


# ✅ Request Schema
class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat_with_ai(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not request.message:
        raise HTTPException(status_code=400, detail="Message is required")

    response = generate_careops_response(
    db=db,
    workspace_id=current_user.workspace_id,
    user_message=request.message
)


    return {"response": response}
