from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..services.estimation_service import EstimationService, EstimationInput, EstimationResult
from ..services.pdf_report import EstimationReportGenerator
from pydantic import BaseModel, Field
from fastapi.responses import Response
from ..core.rate_limiter import limiter, ESTIMATION_RATE_LIMIT
import io

router = APIRouter(prefix="/estimation", tags=["estimation"])

class EstimationRequest(BaseModel):
    city: str
    district: str
    rooms: int
    total_area: float
    floor: int
    total_floors: int
    building_type: Optional[str] = None
    deal_type: str = "SALE"
    property_id: Optional[str] = None

class AnalogItem(BaseModel):
    source: str
    source_url: str
    price: int
    rooms: Optional[int]
    total_area: Optional[float]
    floor: Optional[int]
    total_floors: Optional[int]

class EstimationResponse(BaseModel):
    estimated_min: int
    estimated_avg: int
    estimated_max: int
    price_per_sqm_avg: int
    price_per_sqm_median: int
    analogs_count: int
    confidence: str
    sources_breakdown: dict
    analogs: List[AnalogItem]

@router.post("/calculate", response_model=EstimationResponse)
@limiter.limit(ESTIMATION_RATE_LIMIT)
async def calculate_estimation(
    request: Request,
    req: EstimationRequest,
    db: Session = Depends(get_db)
):
    service = EstimationService(db)
    params = EstimationInput(
        city=req.city,
        district=req.district,
        rooms=req.rooms,
        total_area=req.total_area,
        floor=req.floor,
        total_floors=req.total_floors,
        building_type=req.building_type,
        deal_type=req.deal_type
    )

    try:
        result = await service.estimate(params)
        return result
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/pdf")
@limiter.limit(ESTIMATION_RATE_LIMIT)
async def generate_pdf(
    request: Request,
    req: EstimationRequest,
    db: Session = Depends(get_db)
):
    service = EstimationService(db)
    params = EstimationInput(
        city=req.city,
        district=req.district,
        rooms=req.rooms,
        total_area=req.total_area,
        floor=req.floor,
        total_floors=req.total_floors,
        building_type=req.building_type,
        deal_type=req.deal_type
    )

    try:
        result = await service.estimate(params)
        pdf_gen = EstimationReportGenerator()
        pdf_bytes = pdf_gen.generate(req.dict(), result)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=estimation_report.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
