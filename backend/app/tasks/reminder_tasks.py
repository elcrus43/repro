from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from ..models.models import Reminder, ReminderRule
from ..core.celery_app import celery_app
from ..core.database import SessionLocal

@celery_app.task
def check_reminders():
    """Periodic task to check for pending reminders and send notifications"""
    db = SessionLocal()
    try:
        now = datetime.now()
        pending = db.query(Reminder).filter(
            Reminder.status == 'PENDING',
            Reminder.remind_at <= now
        ).all()
        
        for reminder in pending:
            # Here we would send a push notification or websocket update
            print(f"NOTIFY USER {reminder.user_id}: {reminder.title}")
            reminder.status = 'SENT'
        
        db.commit()
    finally:
        db.close()

@celery_app.task
def generate_scheduled_reminders():
    """Daily task to generate reminders based on rules (e.g., birthdays)"""
    db = SessionLocal()
    try:
        # Example logic for NO_CONTACT_WARNING
        # This would query clients and check their last_contact_at
        pass
    finally:
        db.close()

def create_followup_reminder(
    db: Session,
    user_id: str,
    client_id: str,
    trigger_type: str,
    delay_hours: int = 2
):
    """Trigger a one-off reminder (e.g., after showing)"""
    rule = db.query(ReminderRule).filter(
        ReminderRule.trigger_type == trigger_type,
        ReminderRule.is_active == True
    ).first()
    
    if not rule:
        return
        
    remind_at = datetime.now() + timedelta(hours=delay_hours)
    
    reminder = Reminder(
        rule_id=rule.id,
        user_id=user_id,
        client_id=client_id,
        title=f"Follow-up: {rule.name}",
        message=rule.message_template, # Simplified, should be rendered
        remind_at=remind_at,
        priority=rule.priority
    )
    db.add(reminder)
    db.commit()
