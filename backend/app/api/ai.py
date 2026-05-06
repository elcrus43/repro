from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from ..core.database import get_db
from ..services.ai_service import AIService
from pydantic import BaseModel
from ..core.rate_limiter import limiter, AI_RATE_LIMIT

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
@limiter.limit(AI_RATE_LIMIT)
async def generate_description(request: Request, req: DescriptionRequest):
    ai = AIService()
    description = await ai.generate_property_description(req.dict())
    return {"description": description}

class ParseRequest(BaseModel):
    image_url: str

@router.post("/parse-mortgage")
@limiter.limit(AI_RATE_LIMIT)
async def parse_mortgage(request: Request, req: ParseRequest):
    ai = AIService()
    data = await ai.parse_mortgage_calculation(req.image_url)
    return data
