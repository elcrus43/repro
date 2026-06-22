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
    latitude: Optional[float] = None
    longitude: Optional[float] = None

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
        """Search local cache for similar properties using progressive parameters relaxation"""
        from sqlalchemy import or_
        
        # We define search steps. Each step progressively relaxes parameters.
        steps = [
            # 1. Geo-location (within 1.5 km)
            {"location": "geo", "building": "strict", "area_delta": 5.0, "is_pct": False, "desc": "geo (1.5km) + strict building + area ±5"},
            {"location": "geo", "building": "relaxed", "area_delta": 5.0, "is_pct": False, "desc": "geo (1.5km) + relaxed building + area ±5"},
            {"location": "geo", "building": "ignored", "area_delta": 5.0, "is_pct": False, "desc": "geo (1.5km) + ignored building + area ±5"},
            
            # 2. District
            {"location": "district", "building": "strict", "area_delta": 5.0, "is_pct": False, "desc": "district + strict building + area ±5"},
            {"location": "district", "building": "relaxed", "area_delta": 5.0, "is_pct": False, "desc": "district + relaxed building + area ±5"},
            {"location": "district", "building": "ignored", "area_delta": 5.0, "is_pct": False, "desc": "district + ignored building + area ±5"},
            
            # 3. City-wide
            {"location": "city", "building": "strict", "area_delta": 5.0, "is_pct": False, "desc": "city + strict building + area ±5"},
            {"location": "city", "building": "relaxed", "area_delta": 5.0, "is_pct": False, "desc": "city + relaxed building + area ±5"},
            {"location": "city", "building": "ignored", "area_delta": 5.0, "is_pct": False, "desc": "city + ignored building + area ±5"},
            
            # 4. Wider area range
            {"location": "city", "building": "ignored", "area_delta": 10.0, "is_pct": False, "desc": "city + ignored building + area ±10"},
            {"location": "city", "building": "ignored", "area_delta": 0.25, "is_pct": True, "desc": "city + ignored building + area ±25%"},
        ]
        
        for step in steps:
            # Skip geo steps if coordinates are missing
            if step["location"] == "geo" and (params.latitude is None or params.longitude is None):
                continue
            # Skip district steps if district is missing
            if step["location"] == "district" and not params.district:
                continue
            # Skip strict/relaxed building checks if no building type was specified
            if not params.building_type and step["building"] in ("strict", "relaxed"):
                continue
                
            query = self.db.query(AnalogListing).filter(
                AnalogListing.city == params.city,
                AnalogListing.deal_type == params.deal_type,
                AnalogListing.is_active == True,
                AnalogListing.last_seen_at > datetime.now() - timedelta(days=90)
            )
            
            # Rooms matching
            if params.rooms is not None:
                query = query.filter(AnalogListing.rooms == params.rooms)
                
            # Area matching
            if step["is_pct"]:
                area_min = params.total_area * (1.0 - step["area_delta"])
                area_max = params.total_area * (1.0 + step["area_delta"])
            else:
                area_min = params.total_area - step["area_delta"]
                area_max = params.total_area + step["area_delta"]
            query = query.filter(AnalogListing.total_area.between(area_min, area_max))
            
            # Building type matching
            if params.building_type and step["building"] != "ignored":
                if step["building"] == "strict":
                    query = query.filter(AnalogListing.building_type == params.building_type)
                elif step["building"] == "relaxed":
                    query = query.filter(or_(
                        AnalogListing.building_type == params.building_type,
                        AnalogListing.building_type == None
                    ))
            
            # Location matching
            if step["location"] == "geo":
                lat, lon = params.latitude, params.longitude
                # 1.5 km bounding box delta
                lat_delta = 1.5 / 111.0
                lon_delta = 1.5 / (111.0 * 0.57)
                query = query.filter(
                    AnalogListing.latitude.between(lat - lat_delta, lat + lat_delta),
                    AnalogListing.longitude.between(lon - lon_delta, lon + lon_delta)
                )
            elif step["location"] == "district":
                query = query.filter(AnalogListing.district.ilike(f"%{params.district}%"))
                
            results = query.order_by(AnalogListing.last_seen_at.desc()).limit(self.MAX_ANALOGS).all()
            if len(results) >= self.MIN_ANALOGS:
                logger.info(f"Found {len(results)} local analogs using fallback step: {step['desc']}")
                return results
                
        # If all steps fail, do a final desperate query ignoring rooms if necessary or just return whatever city-wide matches we have
        desperate_query = self.db.query(AnalogListing).filter(
            AnalogListing.city == params.city,
            AnalogListing.deal_type == params.deal_type,
            AnalogListing.is_active == True,
            AnalogListing.last_seen_at > datetime.now() - timedelta(days=90)
        )
        if params.rooms is not None:
            desperate_query = desperate_query.filter(AnalogListing.rooms == params.rooms)
            
        results = desperate_query.order_by(AnalogListing.last_seen_at.desc()).limit(self.MAX_ANALOGS).all()
        logger.info(f"Fallback to all active listings in city for rooms {params.rooms}. Found {len(results)} analogs.")
        return results

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
