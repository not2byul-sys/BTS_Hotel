"""
ARMY Stay Hub - 다중 플랫폼 한국 OTA 스크래퍼
여러 플랫폼에서 분산 수집하여 리스크 분산 + 정보 풍부화

지원 플랫폼:
1. Agoda - 글로벌 OTA, 영어 데이터
2. 네이버 호텔 - 국내 최대 포털
3. 여기어때 (GoodChoice) - 국내 숙박 앱
4. 야놀자 (Yanolja) - 국내 숙박 앱
5. 쿠팡 트래블 - 이커머스 숙박

주의: 개인 MVP용 소량 스크래핑. 상업적 대규모 사용 금지.
"""

import requests
import random
import time
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from abc import ABC, abstractmethod
from urllib.parse import urlencode, quote

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None
    print("⚠️ BeautifulSoup not installed. Run: pip install beautifulsoup4")


class BaseScraper(ABC):
    """모든 OTA 스크래퍼의 베이스 클래스"""

    def __init__(self):
        self.name = "Base"
        self.name_kr = "기본"
        self.base_url = ""

        # 공통 헤더
        self.headers = {
            "User-Agent": self._get_random_user_agent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        # 킨텍스/고양시 지역 설정
        self.target_coords = {"lat": 37.6694, "lng": 126.7456}
        self.target_areas = ["고양", "일산", "킨텍스", "Goyang", "Ilsan", "KINTEX"]

    def _get_random_user_agent(self) -> str:
        """랜덤 User-Agent 선택"""
        agents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        ]
        return random.choice(agents)

    def _random_delay(self, min_sec: float = 2.0, max_sec: float = 5.0):
        """사람처럼 보이기 위한 랜덤 딜레이"""
        delay = random.uniform(min_sec, max_sec)
        time.sleep(delay)

    def _make_request(self, url: str, params: dict = None) -> Optional[requests.Response]:
        """안전한 HTTP 요청"""
        try:
            self._random_delay()
            self.headers["User-Agent"] = self._get_random_user_agent()

            response = requests.get(
                url,
                headers=self.headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response

        except requests.exceptions.RequestException as e:
            print(f"❌ [{self.name}] 요청 실패: {e}")
            return None

    @abstractmethod
    def scrape(self, checkin: datetime, checkout: datetime) -> List[Dict]:
        """호텔 목록 스크래핑 (각 플랫폼별 구현)"""
        pass

    def _normalize_hotel(self, raw_data: dict) -> Dict:
        """호텔 데이터 정규화"""
        return {
            "name": raw_data.get("name", ""),
            "name_en": raw_data.get("name_en", raw_data.get("name", "")),
            "price_krw": raw_data.get("price_krw", 0),
            "price_usd": raw_data.get("price_usd", int(raw_data.get("price_krw", 0) / 1350)),
            "rating": raw_data.get("rating", 0),
            "review_count": raw_data.get("review_count", 0),
            "address": raw_data.get("address", ""),
            "latitude": raw_data.get("latitude", 0),
            "longitude": raw_data.get("longitude", 0),
            "image_url": raw_data.get("image_url", ""),
            "rooms_left": raw_data.get("rooms_left", -1),
            "booking_url": raw_data.get("booking_url", ""),
            "platform": self.name,
            "scraped_at": datetime.now().isoformat(),
        }


class AgodaScraper(BaseScraper):
    """Agoda 스크래퍼 - 글로벌 OTA"""

    def __init__(self):
        super().__init__()
        self.name = "Agoda"
        self.name_kr = "아고다"
        self.base_url = "https://www.agoda.com"
        self.city_id = 14690  # 고양시

    def _build_url(self, checkin: datetime, checkout: datetime) -> str:
        """검색 URL 생성"""
        params = {
            "city": self.city_id,
            "checkIn": checkin.strftime("%Y-%m-%d"),
            "checkOut": checkout.strftime("%Y-%m-%d"),
            "rooms": 1,
            "adults": 2,
            "children": 0,
            "los": (checkout - checkin).days,
            "sort": "priceLowToHigh",
        }
        return f"{self.base_url}/search?{urlencode(params)}"

    def scrape(self, checkin: datetime, checkout: datetime) -> List[Dict]:
        """Agoda 호텔 스크래핑"""
        url = self._build_url(checkin, checkout)
        print(f"🔍 [{self.name}] 검색 중...")

        response = self._make_request(url)
        if not response:
            return []

        hotels = self._parse_response(response.text)
        print(f"✅ [{self.name}] {len(hotels)}개 호텔 수집")
        return hotels

    def _parse_response(self, html: str) -> List[Dict]:
        """응답 파싱"""
        hotels = []

        if not BeautifulSoup:
            return hotels

        soup = BeautifulSoup(html, 'html.parser')

        # __NEXT_DATA__ 파싱 시도
        script_tag = soup.find('script', {'id': '__NEXT_DATA__'})
        if script_tag:
            try:
                data = json.loads(script_tag.string)
                props = data.get('props', {}).get('pageProps', {})
                search_result = props.get('searchResult', {}) or props.get('initialSearchResult', {})
                properties = search_result.get('properties', []) or search_result.get('results', [])

                for prop in properties[:30]:
                    hotel = self._normalize_hotel({
                        "name": prop.get('propertyName', ''),
                        "name_en": prop.get('propertyNameEn', prop.get('propertyName', '')),
                        "price_krw": self._extract_price_krw(prop),
                        "rating": prop.get('rating', 0),
                        "review_count": prop.get('reviewCount', 0),
                        "address": prop.get('address', ''),
                        "latitude": prop.get('latitude', 0),
                        "longitude": prop.get('longitude', 0),
                        "image_url": self._extract_image(prop),
                        "rooms_left": prop.get('roomsLeft', -1),
                        "booking_url": f"{self.base_url}/hotel_{prop.get('propertyId', '')}.html",
                    })
                    if hotel["name"]:
                        hotels.append(hotel)
            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️ [{self.name}] JSON 파싱 실패: {e}")

        return hotels

    def _extract_price_krw(self, prop: dict) -> int:
        """가격 추출 (KRW)"""
        for field in ['price', 'displayPrice', 'pricePerNight']:
            if field in prop:
                val = prop[field]
                if isinstance(val, (int, float)):
                    return int(val * 1350) if val < 1000 else int(val)
                if isinstance(val, dict):
                    return int(val.get('value', 0))
        return 0

    def _extract_image(self, prop: dict) -> str:
        """이미지 URL 추출"""
        for field in ['imageUrl', 'heroImage', 'thumbnail']:
            if field in prop:
                img = prop[field]
                if isinstance(img, str):
                    return img
                if isinstance(img, list) and img:
                    return img[0] if isinstance(img[0], str) else img[0].get('url', '')
        return ""


class NaverHotelScraper(BaseScraper):
    """네이버 호텔 스크래퍼"""

    def __init__(self):
        super().__init__()
        self.name = "NaverHotel"
        self.name_kr = "네이버 호텔"
        self.base_url = "https://hotel.naver.com"
        self.api_url = "https://hotel.naver.com/api"

    def _build_url(self, checkin: datetime, checkout: datetime) -> str:
        """API URL 생성"""
        params = {
            "keyword": "고양",
            "checkIn": checkin.strftime("%Y-%m-%d"),
            "checkOut": checkout.strftime("%Y-%m-%d"),
            "rooms": 1,
            "adults": 2,
            "children": 0,
        }
        return f"{self.api_url}/search/v2?{urlencode(params)}"

    def scrape(self, checkin: datetime, checkout: datetime) -> List[Dict]:
        """네이버 호텔 스크래핑"""
        # 네이버는 검색 결과 페이지에서 데이터 추출
        search_url = f"{self.base_url}/domestic/search?keyword={quote('고양')}&checkIn={checkin.strftime('%Y-%m-%d')}&checkOut={checkout.strftime('%Y-%m-%d')}"

        print(f"🔍 [{self.name}] 검색 중...")

        response = self._make_request(search_url)
        if not response:
            return []

        hotels = self._parse_response(response.text)
        print(f"✅ [{self.name}] {len(hotels)}개 호텔 수집")
        return hotels

    def _parse_response(self, html: str) -> List[Dict]:
        """응답 파싱"""
        hotels = []

        if not BeautifulSoup:
            return hotels

        soup = BeautifulSoup(html, 'html.parser')

        # 네이버 호텔은 __NEXT_DATA__ 또는 window.__PRELOADED_STATE__ 사용
        script_tag = soup.find('script', {'id': '__NEXT_DATA__'})
        if script_tag:
            try:
                data = json.loads(script_tag.string)
                # 네이버 구조에 맞게 파싱
                page_props = data.get('props', {}).get('pageProps', {})
                hotel_list = page_props.get('hotels', []) or page_props.get('searchResult', {}).get('hotels', [])

                for hotel_data in hotel_list[:30]:
                    hotel = self._normalize_hotel({
                        "name": hotel_data.get('name', ''),
                        "price_krw": hotel_data.get('lowestPrice', hotel_data.get('price', 0)),
                        "rating": hotel_data.get('rating', hotel_data.get('score', 0)),
                        "review_count": hotel_data.get('reviewCount', 0),
                        "address": hotel_data.get('address', ''),
                        "latitude": hotel_data.get('latitude', hotel_data.get('y', 0)),
                        "longitude": hotel_data.get('longitude', hotel_data.get('x', 0)),
                        "image_url": hotel_data.get('imageUrl', hotel_data.get('thumbnailUrl', '')),
                        "booking_url": f"{self.base_url}/hotels/{hotel_data.get('id', '')}",
                    })
                    if hotel["name"]:
                        hotels.append(hotel)
            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️ [{self.name}] JSON 파싱 실패: {e}")

        # HTML 요소 폴백
        if not hotels:
            hotel_cards = soup.find_all('div', class_=re.compile(r'hotel|item|card', re.I))
            for card in hotel_cards[:20]:
                name_el = card.find(['h2', 'h3', 'span'], class_=re.compile(r'name|title', re.I))
                price_el = card.find(['span', 'div'], class_=re.compile(r'price', re.I))

                if name_el:
                    name = name_el.get_text(strip=True)
                    price = 0
                    if price_el:
                        price_text = price_el.get_text(strip=True)
                        price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
                        if price_match:
                            price = int(price_match.group())

                    hotel = self._normalize_hotel({
                        "name": name,
                        "price_krw": price,
                    })
                    hotels.append(hotel)

        return hotels


class GoodChoiceScraper(BaseScraper):
    """여기어때 스크래퍼"""

    def __init__(self):
        super().__init__()
        self.name = "GoodChoice"
        self.name_kr = "여기어때"
        self.base_url = "https://www.goodchoice.kr"

    def scrape(self, checkin: datetime, checkout: datetime) -> List[Dict]:
        """여기어때 스크래핑"""
        # 여기어때 모바일 웹 검색
        search_url = f"{self.base_url}/search?keyword={quote('고양')}&check_in={checkin.strftime('%Y-%m-%d')}&check_out={checkout.strftime('%Y-%m-%d')}"

        print(f"🔍 [{self.name}] 검색 중...")

        # 모바일 User-Agent로 변경 (더 간단한 HTML)
        self.headers["User-Agent"] = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"

        response = self._make_request(search_url)
        if not response:
            return []

        hotels = self._parse_response(response.text)
        print(f"✅ [{self.name}] {len(hotels)}개 호텔 수집")
        return hotels

    def _parse_response(self, html: str) -> List[Dict]:
        """응답 파싱"""
        hotels = []

        if not BeautifulSoup:
            return hotels

        soup = BeautifulSoup(html, 'html.parser')

        # 여기어때 카드 요소 찾기
        hotel_items = soup.find_all('li', class_=re.compile(r'list_item|hotel_item', re.I))
        if not hotel_items:
            hotel_items = soup.find_all('div', class_=re.compile(r'accommodation|hotel|room', re.I))

        for item in hotel_items[:30]:
            try:
                # 이름
                name_el = item.find(['h3', 'strong', 'a'], class_=re.compile(r'name|title', re.I))
                name = name_el.get_text(strip=True) if name_el else ""

                # 가격
                price = 0
                price_el = item.find(['span', 'strong'], class_=re.compile(r'price|won', re.I))
                if price_el:
                    price_text = price_el.get_text(strip=True)
                    price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
                    if price_match:
                        price = int(price_match.group())

                # 평점
                rating = 0
                rating_el = item.find(['span', 'em'], class_=re.compile(r'score|rating', re.I))
                if rating_el:
                    rating_text = rating_el.get_text(strip=True)
                    rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                    if rating_match:
                        rating = float(rating_match.group(1))

                # 이미지
                img_el = item.find('img')
                image_url = ""
                if img_el:
                    image_url = img_el.get('src') or img_el.get('data-src', '')

                if name:
                    hotel = self._normalize_hotel({
                        "name": name,
                        "price_krw": price,
                        "rating": rating,
                        "image_url": image_url,
                    })
                    hotels.append(hotel)

            except Exception as e:
                continue

        return hotels


class YanoljaScraper(BaseScraper):
    """야놀자 스크래퍼"""

    def __init__(self):
        super().__init__()
        self.name = "Yanolja"
        self.name_kr = "야놀자"
        self.base_url = "https://www.yanolja.com"

    def scrape(self, checkin: datetime, checkout: datetime) -> List[Dict]:
        """야놀자 스크래핑"""
        # 야놀자 검색 (고양시 지역코드 사용)
        search_url = f"{self.base_url}/search/{quote('고양')}?checkin={checkin.strftime('%Y-%m-%d')}&checkout={checkout.strftime('%Y-%m-%d')}"

        print(f"🔍 [{self.name}] 검색 중...")

        response = self._make_request(search_url)
        if not response:
            return []

        hotels = self._parse_response(response.text)
        print(f"✅ [{self.name}] {len(hotels)}개 호텔 수집")
        return hotels

    def _parse_response(self, html: str) -> List[Dict]:
        """응답 파싱"""
        hotels = []

        if not BeautifulSoup:
            return hotels

        soup = BeautifulSoup(html, 'html.parser')

        # __NEXT_DATA__ 시도 (Next.js 앱)
        script_tag = soup.find('script', {'id': '__NEXT_DATA__'})
        if script_tag:
            try:
                data = json.loads(script_tag.string)
                page_props = data.get('props', {}).get('pageProps', {})

                # 다양한 키 시도
                for key in ['hotels', 'accommodations', 'places', 'searchResults', 'items']:
                    items = page_props.get(key, [])
                    if not items and 'data' in page_props:
                        items = page_props['data'].get(key, [])

                    if items:
                        for item in items[:30]:
                            hotel = self._normalize_hotel({
                                "name": item.get('name', item.get('placeName', '')),
                                "price_krw": item.get('price', item.get('minPrice', item.get('lowestPrice', 0))),
                                "rating": item.get('rating', item.get('reviewScore', 0)),
                                "review_count": item.get('reviewCount', 0),
                                "address": item.get('address', ''),
                                "latitude": item.get('latitude', item.get('y', 0)),
                                "longitude": item.get('longitude', item.get('x', 0)),
                                "image_url": item.get('imageUrl', item.get('thumbnailUrl', '')),
                                "booking_url": f"{self.base_url}/place/{item.get('id', '')}",
                            })
                            if hotel["name"]:
                                hotels.append(hotel)
                        break
            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️ [{self.name}] JSON 파싱 실패: {e}")

        # HTML 폴백
        if not hotels:
            cards = soup.find_all(['div', 'article'], class_=re.compile(r'PlaceCard|accommodation|hotel', re.I))
            for card in cards[:20]:
                name_el = card.find(['h2', 'h3', 'a'], class_=re.compile(r'name|title', re.I))
                if name_el:
                    hotel = self._normalize_hotel({
                        "name": name_el.get_text(strip=True),
                    })
                    hotels.append(hotel)

        return hotels


class CoupangTravelScraper(BaseScraper):
    """쿠팡 트래블 스크래퍼"""

    def __init__(self):
        super().__init__()
        self.name = "CoupangTravel"
        self.name_kr = "쿠팡 트래블"
        self.base_url = "https://travel.coupang.com"

    def scrape(self, checkin: datetime, checkout: datetime) -> List[Dict]:
        """쿠팡 트래블 스크래핑"""
        # 쿠팡 트래블 검색
        search_url = f"{self.base_url}/np/search/stays?q={quote('고양')}&checkin={checkin.strftime('%Y-%m-%d')}&checkout={checkout.strftime('%Y-%m-%d')}"

        print(f"🔍 [{self.name}] 검색 중...")

        response = self._make_request(search_url)
        if not response:
            return []

        hotels = self._parse_response(response.text)
        print(f"✅ [{self.name}] {len(hotels)}개 호텔 수집")
        return hotels

    def _parse_response(self, html: str) -> List[Dict]:
        """응답 파싱"""
        hotels = []

        if not BeautifulSoup:
            return hotels

        soup = BeautifulSoup(html, 'html.parser')

        # JSON 데이터 추출 시도
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and ('__PRELOADED_STATE__' in script.string or 'window.__data' in script.string):
                try:
                    # JSON 추출
                    match = re.search(r'=\s*(\{.*?\});', script.string, re.DOTALL)
                    if match:
                        data = json.loads(match.group(1))

                        # 호텔 데이터 찾기
                        for key in ['stays', 'hotels', 'accommodations', 'results']:
                            if key in data:
                                for item in data[key][:30]:
                                    hotel = self._normalize_hotel({
                                        "name": item.get('name', ''),
                                        "price_krw": item.get('price', item.get('salePrice', 0)),
                                        "rating": item.get('rating', 0),
                                        "image_url": item.get('imageUrl', ''),
                                        "booking_url": f"{self.base_url}/np/stays/{item.get('id', '')}",
                                    })
                                    if hotel["name"]:
                                        hotels.append(hotel)
                                break
                except:
                    continue

        # HTML 폴백
        if not hotels:
            cards = soup.find_all('div', class_=re.compile(r'stay|hotel|item', re.I))
            for card in cards[:20]:
                name_el = card.find(['h2', 'h3', 'span'], class_=re.compile(r'name|title', re.I))
                if name_el:
                    hotel = self._normalize_hotel({
                        "name": name_el.get_text(strip=True),
                    })
                    hotels.append(hotel)

        return hotels


class KoreanOTAScraper:
    """
    다중 플랫폼 한국 OTA 스크래퍼 매니저

    5개 플랫폼에서 분산 수집하여:
    1. 리스크 분산 (각 플랫폼당 소량 요청)
    2. 정보 풍부화 (가격 비교, 재고 교차 확인)
    3. 신뢰성 향상 (여러 소스에서 데이터 검증)
    """

    def __init__(self):
        self.target_areas = ["Goyang", "Ilsan", "Paju", "Hongdae", "Sangam"]

        # 지원 플랫폼
        self.platforms = {
            'agoda': {'scraper': AgodaScraper(), 'weight': 2},  # 글로벌, 영어 데이터
            'naver': {'scraper': NaverHotelScraper(), 'weight': 2},  # 국내 최대
            'goodchoice': {'scraper': GoodChoiceScraper(), 'weight': 1},
            'yanolja': {'scraper': YanoljaScraper(), 'weight': 1},
            'coupang': {'scraper': CoupangTravelScraper(), 'weight': 1},
        }

        # 콘서트 날짜 (D-Day)
        self.concert_date = datetime(2026, 6, 12)

    def scrape_all(self, checkin: datetime = None, checkout: datetime = None,
                   platforms: List[str] = None, max_per_platform: int = 2) -> Dict:
        """
        모든 플랫폼에서 호텔 정보 수집

        Args:
            checkin: 체크인 날짜 (기본: 콘서트 전날)
            checkout: 체크아웃 날짜 (기본: 콘서트 다음날)
            platforms: 사용할 플랫폼 리스트 (기본: 전체)
            max_per_platform: 플랫폼당 최대 요청 수

        Returns:
            플랫폼별 호텔 데이터 딕셔너리
        """
        if not checkin:
            checkin = self.concert_date - timedelta(days=1)
        if not checkout:
            checkout = self.concert_date + timedelta(days=1)

        if not platforms:
            platforms = list(self.platforms.keys())

        print("=" * 60)
        print(f"🚀 ARMY Stay Hub - 다중 플랫폼 스크래핑 시작")
        print(f"📅 체크인: {checkin.strftime('%Y-%m-%d')}")
        print(f"📅 체크아웃: {checkout.strftime('%Y-%m-%d')}")
        print(f"🎯 플랫폼: {', '.join(platforms)}")
        print("=" * 60)

        results = {
            "meta": {
                "checkin": checkin.isoformat(),
                "checkout": checkout.isoformat(),
                "scraped_at": datetime.now().isoformat(),
                "platforms_used": platforms,
            },
            "by_platform": {},
            "all_hotels": [],
        }

        # 플랫폼별 스크래핑 (순차적, 딜레이 포함)
        for platform_name in platforms:
            if platform_name not in self.platforms:
                print(f"⚠️ 알 수 없는 플랫폼: {platform_name}")
                continue

            platform = self.platforms[platform_name]
            scraper = platform['scraper']

            try:
                hotels = scraper.scrape(checkin, checkout)
                results["by_platform"][platform_name] = {
                    "name_kr": scraper.name_kr,
                    "count": len(hotels),
                    "hotels": hotels,
                }
                results["all_hotels"].extend(hotels)

                # 플랫폼 간 딜레이 (5~10초)
                if platform_name != platforms[-1]:
                    delay = random.uniform(5, 10)
                    print(f"⏳ 다음 플랫폼까지 {delay:.1f}초 대기...")
                    time.sleep(delay)

            except Exception as e:
                print(f"❌ [{platform_name}] 스크래핑 실패: {e}")
                results["by_platform"][platform_name] = {
                    "name_kr": scraper.name_kr,
                    "count": 0,
                    "hotels": [],
                    "error": str(e),
                }

        # 통계
        total = len(results["all_hotels"])
        print("\n" + "=" * 60)
        print(f"✅ 스크래핑 완료! 총 {total}개 호텔 수집")
        for p_name, p_data in results["by_platform"].items():
            print(f"   - {p_data['name_kr']}: {p_data['count']}개")
        print("=" * 60)

        return results

    def scrape_distributed(self, checkin: datetime = None, checkout: datetime = None) -> List[Dict]:
        """
        하루 10회 분산 스크래핑용 - 매 실행마다 다른 플랫폼 선택

        분산 전략:
        - 가중치 기반 랜덤 선택 (agoda, naver는 2배 확률)
        - 한 번에 1~2개 플랫폼만 사용
        - 요청 간 충분한 딜레이
        """
        if not checkin:
            checkin = self.concert_date - timedelta(days=1)
        if not checkout:
            checkout = self.concert_date + timedelta(days=1)

        # 가중치 기반 플랫폼 선택
        weighted_platforms = []
        for name, config in self.platforms.items():
            weighted_platforms.extend([name] * config['weight'])

        # 1~2개 플랫폼 랜덤 선택
        num_platforms = random.randint(1, 2)
        selected = random.sample(weighted_platforms, min(num_platforms, len(set(weighted_platforms))))
        selected = list(set(selected))  # 중복 제거

        print(f"🎲 이번 실행 플랫폼: {', '.join(selected)}")

        # 선택된 플랫폼만 스크래핑
        results = self.scrape_all(checkin, checkout, platforms=selected)

        return results["all_hotels"]

    def merge_with_simulation(self, scraped_hotels: List[Dict], simulated_hotels: List[Dict]) -> List[Dict]:
        """
        스크래핑 데이터와 시뮬레이션 데이터 병합

        스크래핑 데이터가 있으면 해당 호텔의 가격/재고 업데이트
        없으면 시뮬레이션 데이터 유지
        """
        # 이름으로 매칭
        scraped_by_name = {h['name'].lower(): h for h in scraped_hotels if h.get('name')}
        scraped_by_name_en = {h.get('name_en', '').lower(): h for h in scraped_hotels if h.get('name_en')}

        merged = []
        updated_count = 0

        for sim_hotel in simulated_hotels:
            hotel = sim_hotel.copy()

            # 이름으로 매칭 시도
            sim_name = sim_hotel.get('name', '').lower()
            sim_name_en = sim_hotel.get('name_en', '').lower()

            matched = scraped_by_name.get(sim_name) or scraped_by_name_en.get(sim_name_en)

            if matched:
                # 실제 데이터로 업데이트
                if matched.get('price_krw') and matched['price_krw'] > 0:
                    hotel['price_krw'] = matched['price_krw']
                    hotel['price_usd'] = matched.get('price_usd', int(matched['price_krw'] / 1350))

                if matched.get('rating') and matched['rating'] > 0:
                    hotel['rating'] = matched['rating']

                if matched.get('rooms_left') and matched['rooms_left'] >= 0:
                    hotel['rooms_left'] = matched['rooms_left']
                    hotel['status'] = "예약 마감" if matched['rooms_left'] == 0 else f"남은 객실 {matched['rooms_left']}개"
                    hotel['status_en'] = "Sold Out" if matched['rooms_left'] == 0 else f"{matched['rooms_left']} rooms left"
                    hotel['is_available'] = matched['rooms_left'] > 0

                hotel['_data_source'] = matched.get('platform', 'scraped')
                updated_count += 1
            else:
                hotel['_data_source'] = 'simulation'

            hotel['last_update'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            merged.append(hotel)

        print(f"📊 데이터 병합 완료: {updated_count}/{len(simulated_hotels)}개 실제 데이터로 업데이트")

        return merged


def test_multi_platform():
    """다중 플랫폼 스크래퍼 테스트"""
    print("🧪 다중 플랫폼 스크래퍼 테스트")
    print("=" * 60)

    scraper = KoreanOTAScraper()

    # 테스트 날짜
    checkin = datetime(2026, 6, 11)
    checkout = datetime(2026, 6, 13)

    # 분산 스크래핑 테스트 (1-2개 플랫폼만)
    hotels = scraper.scrape_distributed(checkin, checkout)

    if hotels:
        print(f"\n📊 수집된 호텔 샘플 (상위 5개):")
        for i, hotel in enumerate(hotels[:5], 1):
            print(f"\n{i}. {hotel['name']}")
            print(f"   플랫폼: {hotel.get('platform', 'unknown')}")
            print(f"   가격: ₩{hotel.get('price_krw', 0):,}")
            print(f"   평점: {hotel.get('rating', 0)}")
    else:
        print("\n⚠️ 호텔 데이터를 수집하지 못했습니다.")
        print("   JavaScript 렌더링이 필요할 수 있습니다.")
        print("   → 시뮬레이션 데이터로 대체됩니다.")

    return hotels


if __name__ == "__main__":
    test_multi_platform()
