import re
import asyncio
import logging
import os
from typing import List, Optional, Dict
from urllib.parse import urlencode, urlparse
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class YandexRealtyParser:
    BASE_URL = "https://realty.yandex.ru"
    
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
            "нижний новгород": "nizhniy-novgorod",
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
        """Search listings on Yandex Realty by parameters"""
        search_url = self._build_search_url(params)
        logger.info(f"Searching Yandex Realty: {search_url}")
        
        proxy_config = self._parse_proxy(self.proxy_url) if self.proxy_url else None
        
        async with async_playwright() as p:
            logger.info("YandexRealtyParser: Launching Chromium...")
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
                logger.info("YandexRealtyParser: Chromium launched successfully.")
                
                context = await browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                )
                
                # Bypass webdriver detection
                await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                
                page = await context.new_page()
                
                logger.info(f"YandexRealtyParser: Navigating to {search_url}...")
                await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
                logger.info("YandexRealtyParser: Page loaded. Simulating scroll...")
                
                # Simulating scroll
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 3)")
                await asyncio.sleep(1.5)
                
                # Wait for any item to appear using a combined selector
                selectors = ["[data-test='offerCard']", ".SerpOffersList__item", ".OffersSerpItem", "li[data-id]"]
                combined_selector = ", ".join(selectors)
                try:
                    await page.wait_for_selector(combined_selector, timeout=12000)
                    logger.info("YandexRealtyParser: Items found using combined selector.")
                except Exception as e:
                    logger.warning(f"YandexRealtyParser: Combined selector wait failed: {e}. Proceeding with raw HTML.")
                
                content = await page.content()
                logger.info(f"YandexRealtyParser: Content retrieved ({len(content)} bytes). Parsing with BeautifulSoup...")
                soup = BeautifulSoup(content, 'html.parser')
                
                items = soup.select("[data-test='offerCard']")
                if not items:
                    items = soup.select(".SerpOffersList__item")
                if not items:
                    items = soup.select(".OffersSerpItem")
                if not items:
                    items = soup.select("li[data-id]")
                    
                logger.info(f"YandexRealtyParser: BS4 found {len(items)} items matching selectors.")
                
                results = []
                for item in items[:20]:
                    parsed = self._parse_item(item)
                    if parsed:
                        results.append(parsed)
                
                return results
            except Exception as e:
                logger.error(f"Yandex Realty parsing error: {e}")
                return []
            finally:
                if browser:
                    await browser.close()

    def _build_search_url(self, params: dict) -> str:
        city_slug = self._get_city_slug(params.get("city"))
        deal = "kupit" if params.get("deal_type") == "SALE" else "snyat"
        url = f"{self.BASE_URL}/{city_slug}/{deal}/kvartira/"
        
        query_params = {}
        
        rooms = params.get("rooms")
        if rooms is not None:
            if rooms == 0:
                query_params["roomsTotal"] = "STUDIO"
            else:
                query_params["roomsTotal"] = str(rooms)
            
        if params.get("area_min"): query_params["areaMin"] = int(params["area_min"])
        if params.get("area_max"): query_params["areaMax"] = int(params["area_max"])
        
        # Sort by newest / default
        query_params["sort"] = "DATE"
        
        return f"{url}?{urlencode(query_params)}"

    def _parse_item(self, item) -> Optional[dict]:
        try:
            link_tag = (
                item.select_one("a[href*='/offer/']") 
                or item.select_one("a[data-test='offer-link']") 
                or item.select_one("a")
            )
            price_tag = (
                item.select_one("[data-test='offer-price']") 
                or item.select_one(".OffersSerpItem__price") 
                or item.select_one("[class*='price']")
            )
            
            if not link_tag or not price_tag:
                return None
                
            href = link_tag['href']
            url = self.BASE_URL + href if href.startswith("/") else href
            
            price_text = price_tag.get_text()
            price = int(''.join(filter(str.isdigit, price_text)))
            
            # Extract basic info
            source_id = item.get("data-id") or item.get("id") or ""
            if not source_id:
                # Extract from link
                id_match = re.search(r"/offer/(\d+)", url)
                if id_match:
                    source_id = id_match.group(1)
                else:
                    source_id = url.split('/')[-2] or url.split('/')[-1]
            
            # Try to get descriptive text/title
            title_tag = (
                item.select_one(".OffersSerpItem__title") 
                or item.select_one("[class*='title']") 
                or item.select_one("[class*='description']")
            )
            title = title_tag.get_text(strip=True) if title_tag else "Квартира Yandex"
            
            area = None
            floor = None
            total_floors = None
            rooms = None
            
            # Parse title details like "2-комнатная квартира, 54.2 м², 7/12 этаж"
            area_match = re.search(r"([\d.,]+)\s*м²", title)
            if area_match:
                area = float(area_match.group(1).replace(",", "."))
                
            floor_match = re.search(r"(\d+)/(\d+)\s*этаж", title)
            if not floor_match:
                floor_match = re.search(r"(\d+)\s*этаж\s*из\s*(\d+)", title)
            if floor_match:
                floor = int(floor_match.group(1))
                total_floors = int(floor_match.group(2))
                
            rooms_match = re.search(r"(\d+)-комнатная", title)
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
                "source": "YANDEX",
                "source_id": str(source_id),
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
            logger.warning(f"Error parsing Yandex item: {e}")
            return None
