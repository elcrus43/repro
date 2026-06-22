import re
import asyncio
import logging
import os
from typing import List, Optional, Dict
from urllib.parse import urlencode, urlparse
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class AvitoSearchParser:
    BASE_URL = "https://www.avito.ru"
    
    def __init__(self):
        self.proxy_url = os.getenv("PROXY_URL") or os.getenv("PROXY")

    def _parse_proxy(self, proxy_url: str) -> Optional[Dict[str, str]]:
        if not proxy_url:
            return None
        try:
            parsed = urlparse(proxy_url)
            proxy_dict = {"server": f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"}
            if parsed.username and parsed.password:
                proxy_dict["username"] = parsed.username
                proxy_dict["password"] = parsed.password
            return proxy_dict
        except Exception as e:
            logger.error(f"Error parsing proxy URL '{proxy_url}': {e}")
            return None

    def _get_city_slug(self, city: Optional[str]) -> str:
        if not city:
            return "moskva"
        city = city.lower().strip()
        mapping = {
            "москва": "moskva",
            "санкт-петербург": "sankt-peterburg",
            "спб": "sankt-peterburg",
            "казань": "kazan",
            "екатеринбург": "ekaterinburg",
            "новосибирск": "novosibirsk",
            "нижний новгород": "nizhniy_novgorod",
            "краснодар": "krasnodar",
            "сочи": "sochi",
            "киров": "kirov"
        }
        if city in mapping:
            return mapping[city]
        
        char_map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
            'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
            'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
            'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
            'я': 'ya', ' ': '-'
        }
        return ''.join(char_map.get(c, c) for c in city)

    async def search(self, params: dict) -> List[dict]:
        """Search listings on Avito by parameters"""
        search_url = self._build_search_url(params)
        logger.info(f"Searching Avito: {search_url}")
        
        proxy_config = self._parse_proxy(self.proxy_url) if self.proxy_url else None
        
        async with async_playwright() as p:
            logger.info("AvitoSearchParser: Launching Chromium...")
            browser = None
            try:
                launch_args = ["--disable-blink-features=AutomationControlled"]
                launch_kwargs = {}
                if proxy_config:
                    launch_kwargs["proxy"] = proxy_config
                
                browser = await p.chromium.launch(
                    headless=True,
                    args=launch_args,
                    timeout=60000,
                    **launch_kwargs
                )
                logger.info("AvitoSearchParser: Chromium launched successfully.")
                
                context = await browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                )
                
                # Bypassing webdriver detection
                await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                
                page = await context.new_page()
                
                logger.info(f"AvitoSearchParser: Navigating to {search_url}...")
                await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
                logger.info("AvitoSearchParser: Page loaded. Simulating scrolling...")
                
                # Human-like scrolling to trigger lazy loading
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 4)")
                await asyncio.sleep(1.0)
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                await asyncio.sleep(1.0)
                
                # Wait for any item to appear using a combined selector
                selectors = ["[data-marker='item']", "div[data-marker='item']", "[class*='iva-item-root']"]
                combined_selector = ", ".join(selectors)
                try:
                    await page.wait_for_selector(combined_selector, timeout=12000)
                    logger.info("AvitoSearchParser: Items found using combined selector.")
                except Exception as e:
                    logger.warning(f"AvitoSearchParser: Combined selector wait failed: {e}. Proceeding with raw content.")
                
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
                if browser:
                    await browser.close()

    def _build_search_url(self, params: dict) -> str:
        city_slug = self._get_city_slug(params.get("city"))
        url = f"{self.BASE_URL}/{city_slug}/kvartiry"
        
        query_params = {
            "s": "104", # Newest first
            "f": self._get_rooms_filter(params.get("rooms")),
        }
        
        if params.get("area_min"): query_params["amin"] = int(params["area_min"])
        if params.get("area_max"): query_params["amax"] = int(params["area_max"])
        
        return f"{url}?{urlencode(query_params)}"

    def _get_rooms_filter(self, rooms: Optional[int]) -> str:
        mapping = {
            0: "ASgBAQICAUSSA8YQAUDKByIw", # Студия
            1: "ASgBAQICAUSSA8YQAUDKByI1", # 1-к
            2: "ASgBAQICAUSSA8YQAUDKByI2", # 2-к
            3: "ASgBAQICAUSSA8YQAUDKByI3", # 3-к
            4: "ASgBAQICAUSSA8YQAUDKByI4"  # 4-к
        }
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
            elif "студия" in title.lower() or "studio" in title.lower():
                rooms = 0

            # Extract building type if mentioned in title
            building_type = None
            t_lower = title.lower()
            if "кирпич" in t_lower or "кирп" in t_lower:
                building_type = "brick"
            elif "панел" in t_lower:
                building_type = "panel"
            elif "монолит" in t_lower:
                building_type = "monolith"
            elif "дерев" in t_lower:
                building_type = "wood"
            elif "блоч" in t_lower:
                building_type = "block"

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
                "building_type": building_type
            }
        except Exception as e:
            logger.warning(f"Error parsing single item: {e}")
            return None
