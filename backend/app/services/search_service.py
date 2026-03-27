import asyncio
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .parsers.avito_search import AvitoSearchParser
from .parsers.cian_search import CianSearchParser
from .parsers.domclick_search import DomClickSearchParser
from ..models.models import AnalogListing
from datetime import datetime

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self, db: Session):
        self.db = db
        import os
        self.parsers = [
            AvitoSearchParser(),
            CianSearchParser()
        ]
        if os.getenv("SKIP_DOMCLICK") != "true":
            self.parsers.append(DomClickSearchParser())

    async def search_all(self, params: Dict[str, Any]) -> List[AnalogListing]:
        """Run all parsers sequentially to save memory and return combined results"""
        parser_params = {
            "city": params.get("city"),
            "district": params.get("district"),
            "rooms": params.get("rooms"),
            "area_min": params.get("total_area", 0) * 0.8,
            "area_max": params.get("total_area", 0) * 1.2,
            "deal_type": params.get("deal_type", "SALE")
        }

        all_new_analogs = []
        
        for parser in self.parsers:
            parser_name = parser.__class__.__name__
            logger.info(f"Starting {parser_name}...")
            try:
                # Add a small delay between parsers to ensure previous browser instances are fully closed
                if all_new_analogs:
                    await asyncio.sleep(2)
                
                results = await parser.search(parser_params)
                
                if isinstance(results, list):
                    logger.info(f"{parser_name} found {len(results)} results.")
                    for item in results:
                        analog = self._map_to_model(item, params)
                        if analog:
                            all_new_analogs.append(analog)
                else:
                    logger.warning(f"{parser_name} returned non-list result: {type(results)}")
            except Exception as e:
                logger.error(f"Error in {parser_name}: {str(e)}", exc_info=True)

        # Save to DB for caching
        if all_new_analogs:
            logger.info(f"Saving {len(all_new_analogs)} total new analogs to database.")
            self._save_analogs(all_new_analogs)
        
        return all_new_analogs

    def _map_to_model(self, item: Dict[str, Any], params: Dict[str, Any]) -> Optional[AnalogListing]:
        try:
            return AnalogListing(
                source=item["source"],
                source_id=item["source_id"],
                source_url=item["source_url"],
                title=item.get("title"),
                price=item["price"],
                city=params.get("city"),
                district=params.get("district"),
                rooms=item.get("rooms"),
                total_area=item.get("total_area"),
                floor=item.get("floor"),
                total_floors=item.get("total_floors"),
                is_active=True,
                last_seen_at=datetime.now()
            )
        except Exception as e:
            logger.warning(f"Mapping error: {e}")
            return None

    def _save_analogs(self, analogs: List[AnalogListing]):
        """Save unique analogs to the database"""
        if not analogs:
            return
            
        try:
            for analog in analogs:
                # Check if already exists by source and source_id
                existing = self.db.query(AnalogListing).filter(
                    AnalogListing.source == analog.source,
                    AnalogListing.source_id == analog.source_id
                ).first()
                
                if existing:
                    existing.price = analog.price
                    existing.last_seen_at = datetime.now()
                    existing.is_active = True
                else:
                    self.db.add(analog)
            
            self.db.commit()
        except Exception as e:
            logger.error(f"Error saving analogs to cache: {e}")
            self.db.rollback()
