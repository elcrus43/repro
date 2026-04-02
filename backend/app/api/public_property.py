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

@router.post("/generate")
async def generate_link(data: dict, db: Session = Depends(get_db)):
    """Create a new public link for a property"""
    property_id = data.get("property_id")
    user_id = data.get("user_id", "00000000-0000-0000-0000-000000000000")
    
    if not property_id:
        raise HTTPException(status_code=400, detail="property_id is required")
        
    # Check if link already exists
    existing = db.query(PropertyLink).filter(PropertyLink.property_id == property_id).first()
    if existing:
        return {"slug": existing.slug}
        
    # Generate a simple short slug
    import string
    import random
    new_slug = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    
    link = PropertyLink(
        property_id=property_id,
        user_id=user_id,
        slug=new_slug,
        is_active=True
    )
    db.add(link)
    db.commit()
    
    return {"slug": new_slug}
