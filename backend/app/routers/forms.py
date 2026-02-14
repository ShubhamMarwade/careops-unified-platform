import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth import get_current_user, require_owner
from app.models.user import User
from app.models.form_template import FormTemplate
from app.models.form_submission import FormSubmission, SubmissionStatus
from app.schemas.forms import FormTemplateCreate, FormTemplateResponse, FormSubmissionCreate

router = APIRouter(prefix="/api/forms", tags=["Forms"])


# ===== Templates =====

@router.get("/templates")
async def list_templates(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    templates = db.query(FormTemplate).filter(
        FormTemplate.workspace_id == user.workspace_id,
        FormTemplate.is_active == True
    ).order_by(FormTemplate.sort_order.asc()).all()

    return {"templates": [FormTemplateResponse.from_orm(t) for t in templates]}


@router.post("/templates", response_model=FormTemplateResponse)
async def create_template(
    req: FormTemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    template = FormTemplate(
        id=uuid.uuid4(),
        workspace_id=user.workspace_id,
        name=req.name,
        description=req.description,
        form_type=req.form_type,
        fields=[f.dict() for f in req.fields] if req.fields else []
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/templates/{template_id}", response_model=FormTemplateResponse)
async def update_template(
    template_id: str,
    req: FormTemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    template = db.query(FormTemplate).filter(
        FormTemplate.id == template_id,
        FormTemplate.workspace_id == user.workspace_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.name = req.name
    template.description = req.description
    template.form_type = req.form_type
    template.fields = [f.dict() for f in req.fields] if req.fields else template.fields

    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_owner)
):
    template = db.query(FormTemplate).filter(
        FormTemplate.id == template_id,
        FormTemplate.workspace_id == user.workspace_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.is_active = False
    db.commit()
    return {"status": "success"}


# ===== Submissions =====

@router.get("/submissions")
async def list_submissions(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(FormSubmission).filter(
        FormSubmission.workspace_id == user.workspace_id
    )

    if status:
        query = query.filter(FormSubmission.status == status)

    total = query.count()
    submissions = query.order_by(FormSubmission.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    result = []
    for s in submissions:
        from app.models.contact import Contact
        contact = db.query(Contact).filter(Contact.id == s.contact_id).first()
        template = db.query(FormTemplate).filter(FormTemplate.id == s.template_id).first()

        result.append({
            "id": str(s.id),
            "template": {
                "id": str(template.id),
                "name": template.name,
                "form_type": template.form_type
            } if template else None,
            "contact": {
                "id": str(contact.id),
                "name": contact.name,
                "email": contact.email
            } if contact else None,
            "status": s.status.value,
            "data": s.data,
            "submitted_at": str(s.submitted_at) if s.submitted_at else None,
            "due_date": str(s.due_date) if s.due_date else None,
            "created_at": str(s.created_at)
        })

    return {"submissions": result, "total": total, "page": page}


@router.get("/submissions/stats")
async def get_submission_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    pending = db.query(FormSubmission).filter(
        FormSubmission.workspace_id == user.workspace_id,
        FormSubmission.status == SubmissionStatus.PENDING
    ).count()

    overdue = db.query(FormSubmission).filter(
        FormSubmission.workspace_id == user.workspace_id,
        FormSubmission.status == SubmissionStatus.OVERDUE
    ).count()

    completed = db.query(FormSubmission).filter(
        FormSubmission.workspace_id == user.workspace_id,
        FormSubmission.status == SubmissionStatus.COMPLETED
    ).count()

    return {
        "pending": pending,
        "overdue": overdue,
        "completed": completed,
        "total": pending + overdue + completed
    }