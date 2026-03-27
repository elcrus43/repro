import logging
from typing import List, Optional
import httpx

logger = logging.getLogger(__name__)

class DomClickSearchParser:
    BASE_URL = "https://domclick.ru/api/offers/v1"
    
    async def search(self, params: dict) -> List[dict]:
        """Search listings on DomClick using their API"""
        # DomClick API uses a JSON filter
        url = self.BASE_URL.rstrip('/')
        
        # Example filters (refined based on browser observation)
        query_params = {
            "address": params.get("city", "Москва"),
            "sale_type": "flats",
            "offer_type": "sale" if params.get("deal_type") == "SALE" else "rent",
            "category": "living",
            "offset": 0,
            "limit": 20,
            "rooms": params.get("rooms", 1),
            "area__gte": int(params.get("area_min", 30)),
            "area__lte": int(params.get("area_max", 100)),
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://domclick.ru/search",
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        }
        
        logger.info(f"Searching DomClick API with params: {query_params}")
        
        async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
            try:
                response = await client.get(url, params=query_params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                items = data.get("items", [])
                results = []
                for item in items:
                    parsed = self._parse_item(item)
                    if parsed:
                        results.append(parsed)
                
                return results
            except Exception as e:
                logger.error(f"DomClick API error: {e}")
                return []

    def _parse_item(self, item: dict) -> Optional[dict]:
        try:
            offer_id = item.get("id")
            url = f"https://domclick.ru/card/sale__flat__{offer_id}"
            
            # Extract data from item structure
            price = item.get("price", {}).get("value")
            rooms = item.get("rooms")
            area = item.get("area")
            floor = item.get("floor")
            total_floors = item.get("floors")
            address = item.get("address", {}).get("display")
            
            if not price or not offer_id:
                return None

            return {
                "source": "DOMCLICK",
                "source_id": str(offer_id),
                "source_url": url,
                "title": f"{rooms}-к квартира, {area} м², {floor}/{total_floors} эт.",
                "price": int(price),
                "rooms": rooms,
                "total_area": float(area) if area else None,
                "floor": floor,
                "total_floors": total_floors,
                "address": address
            }
        except Exception as e:
            logger.warning(f"Error parsing DomClick item: {e}")
            return None
