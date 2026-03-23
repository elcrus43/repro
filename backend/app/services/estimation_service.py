from dataclasses import dataclass
from decimal import Decimal
from statistics import mean, median
from typing import Optional, List
import asyncio
from datetime import datetime, timedelta
import logging
from numpy import percentile
from sqlalchemy.orm import Session
from ..models.models import AnalogListing, PriceEstimation
from .parsers.avito_search import AvitoSearchParser # to be created

logger = logging.getLogger(__name__)

@dataclass
class EstimationInput:
    city: str
    district: str
    rooms: int
    total_area: float
    floor: int
    total_floors: int
    building_type: Optional[str] = None
    deal_type: str = "SALE"
    year_built: Optional[int] = None

@dataclass
class EstimationResult:
    estimated_min: int
    estimated_avg: int
    estimated_max: int
    price_per_sqm_avg: int
    price_per_sqm_median: int
    analogs_count: int
    analogs: List[AnalogListing]
    confidence: str           # HIGH / MEDIUM / LOW
    sources_breakdown: dict   # {"AVITO": 12, "CIAN": 8, ...}

class InsufficientDataError(Exception):
    pass

class EstimationService:
    MIN_ANALOGS = 3
    TARGET_ANALOGS = 15
    MAX_ANALOGS = 100
    
    def __init__(self, db: Session):
        self.db = db
        from .search_service import SearchService
        self.search_service = SearchService(db)
    
    async def estimate(self, params: EstimationInput) -> EstimationResult:
        """Core estimation method"""
        
        # Step 1: Search in local DB
        analogs = await self._find_local_analogs(params)
        
        # Step 2: If few - trigger fresh parsing
        if len(analogs) < 10: # Threshold for fresh search
            logger.info(f"Insufficient local data ({len(analogs)}). Triggering fresh search.")
            fresh_analogs = await self.search_service.search_all(params.__dict__)
            
            # Re-fetch from DB to get combined and deduplicated results with correct types
            analogs = await self._find_local_analogs(params)
        
        # Step 4: Remove outliers
        analogs = self._remove_outliers(analogs)
        
        if len(analogs) < self.MIN_ANALOGS:
            raise InsufficientDataError(
                f"Found only {len(analogs)} analogs. Minimum required: {self.MIN_ANALOGS}"
            )
        
        # Step 5: Calculate estimation
        result = self._calculate_estimation(analogs, params)
        
        return result
    
    async def _find_local_analogs(self, params: EstimationInput, relaxed: bool = False) -> List[AnalogListing]:
        """Search local cache for similar properties"""
        query = self.db.query(AnalogListing).filter(
            AnalogListing.city == params.city,
            AnalogListing.district == params.district,
            AnalogListing.deal_type == params.deal_type,
            AnalogListing.is_active == True,
            AnalogListing.last_seen_at > datetime.now() - timedelta(days=90)
        )
        
        if relaxed:
            area_min = params.total_area * 0.7
            area_max = params.total_area * 1.3
            floor_min = max(1, params.floor - 5)
            floor_max = params.floor + 5
            rooms_range = [params.rooms - 1, params.rooms, params.rooms + 1]
        else:
            area_min = params.total_area * 0.85
            area_max = params.total_area * 1.15
            floor_min = max(1, params.floor - 2)
            floor_max = params.floor + 2
            rooms_range = [params.rooms]
            if params.building_type:
                query = query.filter(AnalogListing.building_type == params.building_type)

        query = query.filter(
            AnalogListing.rooms.in_(rooms_range),
            AnalogListing.total_area.between(area_min, area_max),
            AnalogListing.floor.between(floor_min, floor_max)
        )
        
        return query.order_by(AnalogListing.last_seen_at.desc()).limit(self.MAX_ANALOGS).all()

    def _remove_outliers(self, analogs: List[AnalogListing]) -> List[AnalogListing]:
        """IQR based outlier removal"""
        if len(analogs) < 5:
            return analogs
        
        prices_per_sqm = [a.price / float(a.total_area) for a in analogs if a.total_area]
        
        q1 = percentile(prices_per_sqm, 25)
        q3 = percentile(prices_per_sqm, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        return [a for a in analogs if lower_bound <= (a.price / float(a.total_area)) <= upper_bound]

    def _calculate_estimation(self, analogs: List[AnalogListing], params: EstimationInput) -> EstimationResult:
        prices_per_sqm = [a.price / float(a.total_area) for a in analogs]
        
        avg_price_per_sqm = mean(prices_per_sqm)
        median_price_per_sqm = median(prices_per_sqm)
        
        p25 = percentile(prices_per_sqm, 25)
        p75 = percentile(prices_per_sqm, 75)
        
        area = params.total_area
        
        if len(analogs) >= 15:
            confidence = "HIGH"
        elif len(analogs) >= 5:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"
            
        sources = {}
        for a in analogs:
            sources[a.source] = sources.get(a.source, 0) + 1
            
        return EstimationResult(
            estimated_min=int(p25 * area),
            estimated_avg=int(avg_price_per_sqm * area),
            estimated_max=int(p75 * area),
            price_per_sqm_avg=int(avg_price_per_sqm),
            price_per_sqm_median=int(median_price_per_sqm),
            analogs_count=len(analogs),
            analogs=sorted(analogs, key=lambda a: abs(float(a.total_area) - area))[:10],
            confidence=confidence,
            sources_breakdown=sources
        )
