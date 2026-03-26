import asyncio
import logging
from typing import List, Optional
from urllib.parse import urlencode
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class CianSearchParser:
    BASE_URL = "https://www.cian.ru/cat.php"
    
    async def search(self, params: dict) -> List[dict]:
        """Search listings on CIAN by parameters"""
        search_params = self._build_search_params(params)
        query_string = urlencode(search_params)
        search_url = f"{self.BASE_URL}?{query_string}"
        
        logger.info(f"Searching CIAN: {search_url}")
        
        async with async_playwright() as p:
            logger.info("CianSearchParser: Launching Chromium...")
            try:
                browser = await p.chromium.launch(headless=True, timeout=60000)
                logger.info("CianSearchParser: Chromium launched successfully.")
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
                )
                page = await context.new_page()
                
                logger.info(f"CianSearchParser: Navigating to {search_url}...")
                await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
                logger.info("CianSearchParser: Page loaded. Waiting for dynamic content...")
                
                # CIAN might have captcha or complex loading
                await asyncio.sleep(3) 
                
                content = await page.content()
                logger.info(f"CianSearchParser: Content retrieved ({len(content)} bytes). Parsing with BeautifulSoup...")
                soup = BeautifulSoup(content, 'html.parser')
                
                # CIAN selectors (using broad search as they change frequently)
                items = soup.select("[data-name='CardComponent']")
                if not items:
                    # Fallback selector
                    items = soup.select("article[data-testid='offer-card']")
                
                results = []
                for item in items[:20]:
                    parsed = self._parse_item(item)
                    if parsed:
                        results.append(parsed)
                
                return results
            except Exception as e:
                logger.error(f"CIAN parsing error: {e}")
                return []
            finally:
                await browser.close()

    def _build_search_params(self, params: dict) -> dict:
        # Simplified CIAN parameters
        # engine_version=2, deal_type=sale, offer_type=flat, region=1 (Moscow)
        # rooms=1,2,3
        cian_params = {
            "engine_version": 2,
            "deal_type": "sale" if params.get("deal_type") == "SALE" else "rent",
            "offer_type": "flat",
            "region": 1, # Default to Moscow, should be mapped
        }
        
        rooms = params.get("rooms")
        if rooms:
            cian_params[f"room{rooms}"] = 1
            
        if params.get("area_min"): cian_params["minarea"] = int(params["area_min"])
        if params.get("area_max"): cian_params["maxarea"] = int(params["area_max"])
        
        return cian_params

    def _parse_item(self, item) -> Optional[dict]:
        try:
            # Simple heuristic parsing for CIAN
            link_tag = item.select_one("a[href*='/sale/flat/']") or item.select_one("a")
            price_tag = item.select_one("[data-mark='MainPrice']") or item.find(text=lambda x: "₽" in x)
            title_tag = item.select_one("[data-name='TitleComponent']") or item.select_one("span")
            
            if not link_tag or not price_tag:
                return None
                
            url = link_tag['href']
            if not url.startswith("http"):
                url = "https://www.cian.ru" + url
                
            price_text = price_tag.get_text() if hasattr(price_tag, 'get_text') else str(price_tag)
            price = int(''.join(filter(str.isdigit, price_text)))
            
            title = title_tag.get_text() if title_tag else ""
            
            # Extract info from title/desc (similar to Avito)
            # "2-комн. кв., 54 м², 7/12 этаж"
            import re
            area = None
            floor = None
            total_floors = None
            rooms = None
            
            area_match = re.search(r"([\d.,]+)\s*м²", title)
            if area_match:
                area = float(area_match.group(1).replace(",", "."))
                
            floor_match = re.search(r"(\d+)/(\d+)\s*этаж", title)
            if floor_match:
                floor = int(floor_match.group(1))
                total_floors = int(floor_match.group(2))
                
            rooms_match = re.search(r"(\d+)-комн", title)
            if rooms_match:
                rooms = int(rooms_match.group(1))

            return {
                "source": "CIAN",
                "source_id": url.split('/')[-2],
                "source_url": url,
                "title": title,
                "price": price,
                "rooms": rooms,
                "total_area": area,
                "floor": floor,
                "total_floors": total_floors,
            }
        except Exception as e:
            logger.warning(f"Error parsing CIAN item: {e}")
            return None
