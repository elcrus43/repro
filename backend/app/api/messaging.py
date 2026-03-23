from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..models.models import MessageTemplate, Reminder, ReminderRule
from ..services.template_engine import TemplateEngine, MessageLinkGenerator
from pydantic import BaseModel

router = APIRouter(prefix="/messaging", tags=["messaging"])

class TemplateCreate(BaseModel):
    name: str
    category: str
    body: str
    channels: List[str]

class RenderRequest(BaseModel):
    template_id: str
    context: dict

@router.get("/templates", response_model=List[dict])
async def list_templates(db: Session = Depends(get_db)):
    templates = db.query(MessageTemplate).all()
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "category": t.category,
            "body": t.body,
            "channels": t.channels,
            "variables": t.variables
        } for t in templates
    ]

@router.post("/templates")
async def create_template(request: TemplateCreate, db: Session = Depends(get_db)):
    # Hardcoded user_id for now as we don't have auth middleware here yet
    user_id = "00000000-0000-0000-0000-000000000000" 
    
    engine = TemplateEngine()
    vars = engine.extract_variables(request.body)
    
    template = MessageTemplate(
        user_id=user_id,
        name=request.name,
        category=request.category,
        body=request.body,
        channels=request.channels,
        variables=vars
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return {"id": str(template.id)}

@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, db: Session = Depends(get_db)):
    template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"status": "success"}

@router.post("/render")
async def render_message(request: RenderRequest, db: Session = Depends(get_db)):
    template = db.query(MessageTemplate).filter(MessageTemplate.id == request.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    engine = TemplateEngine()
    rendered = engine.render(template.body, request.context)
    
    return {
        "text": rendered,
        "whatsapp": MessageLinkGenerator.whatsapp_link(request.context.get("phone", ""), rendered),
        "telegram": MessageLinkGenerator.telegram_link(request.context.get("telegram", ""), rendered)
    }

@router.get("/reminders/pending")
async def get_pending_reminders(user_id: str, db: Session = Depends(get_db)):
    reminders = db.query(Reminder).filter(
        Reminder.user_id == user_id,
        Reminder.status.in_(['PENDING', 'SENT'])
    ).all()
    return reminders
