from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..core.database import get_db
from ..services.ai_service import AIService
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["ai"])

class DescriptionRequest(BaseModel):
    city: str
    district: str
    rooms: int
    total_area: float
    floor: int
    total_floors: int
    renovation: Optional[str] = "Косметический"
    features: Optional[str] = ""

@router.post("/generate-description")
async def generate_description(request: DescriptionRequest):
    ai = AIService()
    description = await ai.generate_property_description(request.dict())
    return {"description": description}
