from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import logging
from ..core.database import get_db
from ..services.estimation_service import EstimationService, EstimationInput
from ..core.rate_limiter import limiter, ESTIMATION_RATE_LIMIT

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cma", tags=["cma"])

class CmaRequest(BaseModel):
    city: str
    district: str
    rooms: int
    total_area: float
    floor: int
    total_floors: int
    deal_type: str = "SALE"
    property_price: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    building_type: Optional[str] = None

class CmaAnalogItem(BaseModel):
    source: str
    source_id: str
    source_url: str
    title: Optional[str]
    price: int
    rooms: Optional[int]
    total_area: Optional[float]
    floor: Optional[int]
    total_floors: Optional[int]

class CmaResponse(BaseModel):
    analogs: List[CmaAnalogItem]
    market_min: int
    market_avg: int
    market_max: int
    price_per_sqm_avg: int
    price_per_sqm_median: int
    your_price: int
    position_pct: float
    recommendation: str
    price_fast: int
    price_optimal: int
    price_premium: int
    days_forecast_current: int
    days_forecast_optimal: int
    sources_count: dict
    confidence: str

@router.post("/run", response_model=CmaResponse)
@limiter.limit(ESTIMATION_RATE_LIMIT)
async def run_cma(
    request: Request,
    req: CmaRequest,
    db: Session = Depends(get_db)
):
    estimation_service = EstimationService(db)
    params = EstimationInput(
        city=req.city,
        district=req.district,
        rooms=req.rooms,
        total_area=req.total_area,
        floor=req.floor,
        total_floors=req.total_floors,
        deal_type=req.deal_type,
        building_type=req.building_type,
        latitude=req.latitude,
        longitude=req.longitude
    )

    try:
        # Trigger parsing and get results
        result = await estimation_service.estimate(params)
        
        # Calculations
        market_avg = result.estimated_avg
        your_price = req.property_price
        
        # Position percentage compared to average market price
        if market_avg > 0:
            position_pct = round(((your_price - market_avg) / market_avg) * 100, 1)
        else:
            position_pct = 0.0
            
        price_fast = result.estimated_min
        price_optimal = result.estimated_avg
        price_premium = result.estimated_max
        
        # Recommendations
        if position_pct > 15:
            recommendation = (
                f"Ваша цена ({your_price:,.0f} ₽) значительно выше средней рыночной цены ({market_avg:,.0f} ₽) на {position_pct}%. "
                f"Рекомендуется снизить цену ближе к оптимальной ({price_optimal:,.0f} ₽) для предотвращения простоя объекта."
            ).replace(",", " ")
        elif position_pct > 5:
            recommendation = (
                f"Ваша цена ({your_price:,.0f} ₽) выше средней рыночной цены на {position_pct}%. "
                f"Срок экспозиции может быть увеличен. Для ускорения продажи рассмотрите небольшую скидку до {price_optimal:,.0f} ₽."
            ).replace(",", " ")
        elif position_pct >= -5:
            recommendation = (
                f"Ваша цена ({your_price:,.0f} ₽) находится в оптимальном рыночном коридоре (отклонение всего {position_pct}%). "
                f"Отличное позиционирование для стабильной продажи."
            ).replace(",", " ")
        else:
            recommendation = (
                f"Ваша цена ({your_price:,.0f} ₽) ниже рыночной цены на {abs(position_pct)}%. "
                f"Это обеспечит быструю продажу, но вы можете недополучить прибыль. Рекомендуется поднять цену до оптимальной ({price_optimal:,.0f} ₽)."
            ).replace(",", " ")

        # Days forecast
        if position_pct > 15:
            days_forecast_current = int(90 + position_pct * 2)
        elif position_pct > 5:
            days_forecast_current = int(60 + position_pct * 1.5)
        elif position_pct >= -5:
            days_forecast_current = int(30 + max(-10, position_pct))
        else:
            days_forecast_current = max(10, int(20 + position_pct))
            
        days_forecast_optimal = 30
        
        # Map analogs
        mapped_analogs = []
        for analog in result.analogs:
            mapped_analogs.append(
                CmaAnalogItem(
                    source=analog.source,
                    source_id=analog.source_id,
                    source_url=analog.source_url,
                    title=analog.title,
                    price=analog.price,
                    rooms=analog.rooms,
                    total_area=float(analog.total_area) if analog.total_area else None,
                    floor=analog.floor,
                    total_floors=analog.total_floors
                )
            )

        return CmaResponse(
            analogs=mapped_analogs,
            market_min=result.estimated_min,
            market_avg=result.estimated_avg,
            market_max=result.estimated_max,
            price_per_sqm_avg=result.price_per_sqm_avg,
            price_per_sqm_median=result.price_per_sqm_median,
            your_price=your_price,
            position_pct=position_pct,
            recommendation=recommendation,
            price_fast=price_fast,
            price_optimal=price_optimal,
            price_premium=price_premium,
            days_forecast_current=days_forecast_current,
            days_forecast_optimal=days_forecast_optimal,
            sources_count=result.sources_breakdown,
            confidence=result.confidence
        )
    except Exception as e:
        logger.error(f"CMA Error: {e}", exc_info=True)
        raise HTTPException(status_code=422, detail=str(e))
