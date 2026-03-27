import re
import asyncio
import logging
from typing import List, Optional
from urllib.parse import urlencode
import httpx
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class AvitoSearchParser:
    BASE_URL = "https://www.avito.ru"
    
    async def search(self, params: dict) -> List[dict]:
        """Search listings on Avito by parameters"""
        search_url = self._build_search_url(params)
        logger.info(f"Searching Avito: {search_url}")
        
        async with async_playwright() as p:
            logger.info("AvitoSearchParser: Launching Chromium...")
            try:
                browser = await p.chromium.launch(headless=True, timeout=60000)
                logger.info("AvitoSearchParser: Chromium launched successfully.")
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
                )
                page = await context.new_page()
                
                logger.info(f"AvitoSearchParser: Navigating to {search_url}...")
                await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
                logger.info("AvitoSearchParser: Page loaded. Waiting for items...")
                
                # Wait for any item to appear
                try:
                    # Try multiple selectors for better robustness
                    selectors = ["[data-marker='item']", "div[data-marker='item']", "[class*='iva-item-root']"]
                    found = False
                    for selector in selectors:
                        try:
                            await page.wait_for_selector(selector, timeout=10000)
                            logger.info(f"AvitoSearchParser: Items found with selector '{selector}'.")
                            found = True
                            break
                        except:
                            continue
                    
                    if not found:
                        logger.warning("AvitoSearchParser: Standard selectors not found. Proceeding with raw content.")
                except Exception as e:
                    logger.warning(f"AvitoSearchParser: Error while waiting for selectors: {e}")
                
                # Small human-like delay
                await asyncio.sleep(2)
                
                content = await page.content()
                logger.info(f"AvitoSearchParser: Content retrieved ({len(content)} bytes). Parsing with BeautifulSoup...")
                soup = BeautifulSoup(content, 'html.parser')
                items = soup.select("[data-marker='item']")
                logger.info(f"AvitoSearchParser: BS4 found {len(items)} items matching selector.")
                
                results = []
                for item in items[:20]:
                    parsed = self._parse_item(item)
                    if parsed:
                        results.append(parsed)
                
                return results
            except Exception as e:
                logger.error(f"Avito parsing error: {e}")
                return []
            finally:
                await browser.close()

    def _build_search_url(self, params: dict) -> str:
        # Example: https://www.avito.ru/moskva/kvartiry/prodam-ASgBAgICAUSSA8YQ
        # For simplicity, we use a generic search URL with query params
        city_slug = "moskva" # Should be mapped from params['city']
        url = f"{self.BASE_URL}/{city_slug}/kvartiry"
        
        query_params = {
            "s": "104", # Newest first
            "f": self._get_rooms_filter(params.get("rooms")),
        }
        
        if params.get("area_min"): query_params["amin"] = int(params["area_min"])
        if params.get("area_max"): query_params["amax"] = int(params["area_max"])
        
        return f"{url}?{urlencode(query_params)}"

    def _get_rooms_filter(self, rooms: Optional[int]) -> str:
        # Avito internal filter mapping
        mapping = {1: "ASgBAQICAUSSA8YQAUDKByI1", 2: "ASgBAQICAUSSA8YQAUDKByI2", 3: "ASgBAQICAUSSA8YQAUDKByI3"}
        return mapping.get(rooms, "")

    def _parse_item(self, item) -> Optional[dict]:
        try:
            link_tag = item.select_one("[data-marker='item-title']")
            price_tag = item.select_one("[itemprop='price']")
            title_tag = item.select_one("[itemprop='name']")
            
            if not link_tag or not price_tag:
                return None
                
            title = title_tag.get_text() if title_tag else ""
            price = int(price_tag['content'])
            url = self.BASE_URL + link_tag['href']
            source_id = item.get('data-item-id')
            
            # Parse title for area and floor: "2-к. квартира, 54 м², 7/12 эт."
            area = None
            floor = None
            total_floors = None
            rooms = None
            
            area_match = re.search(r"([\d.,]+)\s*м²", title)
            if area_match:
                area = float(area_match.group(1).replace(",", "."))
                
            floor_match = re.search(r"(\d+)/(\d+)\s*эт", title)
            if floor_match:
                floor = int(floor_match.group(1))
                total_floors = int(floor_match.group(2))
                
            rooms_match = re.search(r"(\d+)-к", title)
            if rooms_match:
                rooms = int(rooms_match.group(1))

            return {
                "source": "AVITO",
                "source_id": source_id,
                "source_url": url,
                "title": title,
                "price": price,
                "rooms": rooms,
                "total_area": area,
                "floor": floor,
                "total_floors": total_floors,
            }
        except Exception as e:
            logger.warning(f"Error parsing single item: {e}")
            return None
