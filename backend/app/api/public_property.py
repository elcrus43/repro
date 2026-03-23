from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from ..core.database import get_db
from ..models.models import PropertyLink, PropertyView
from hashlib import sha256
from user_agents import parse as parse_ua

router = APIRouter(prefix="/p", tags=["public"])

@router.get("/{slug}")
async def get_public_property(slug: str, request: Request, db: Session = Depends(get_db)):
    """Public endpoint to view property details via mini-site link"""
    link = db.query(PropertyLink).filter(PropertyLink.slug == slug, PropertyLink.is_active == True).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found or inactive")
        
    # Simple tracking logic
    ip = request.client.host
    ua_string = request.headers.get("user-agent", "")
    visitor_hash = sha256(f"{ip}:{ua_string}".encode()).hexdigest()[:16]
    
    ua = parse_ua(ua_string)
    
    view = PropertyView(
        link_id=link.id,
        visitor_hash=visitor_hash,
        device_type="MOBILE" if ua.is_mobile else "DESKTOP",
        os=ua.os.family,
        browser=ua.browser.family
    )
    db.add(view)
    link.views_count += 1
    db.commit()
    
    # In a real app, we would return a rendered HTML or JSON for the frontend to render the mini-site
    return {
        "property_id": link.property_id,
        "show_price": link.show_price,
        "show_address": link.show_address,
        "custom_note": link.custom_note
    }

@router.post("/{slug}/track")
async def track_engagement(slug: str, data: dict, db: Session = Depends(get_db)):
    """Endpoint for tracking engagement (duration, clicks) from the frontend"""
    link = db.query(PropertyLink).filter(PropertyLink.slug == slug).first()
    if not link:
        return {"status": "ignored"}
        
    # Engagement logic...
    return {"status": "ok"}
