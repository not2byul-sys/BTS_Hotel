"""
ARMY Stay Hub - Agoda 실시간 스크래핑 모듈
하루 10회, 불규칙 시간대 실행

주의: 개인 MVP용 소량 스크래핑. 상업적 대규모 사용 금지.
"""

import requests
import random
import time
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import re


class AgodaScraper:
    def __init__(self):
        # 요청 헤더 (일반 브라우저처럼 보이게)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        # 킨텍스 주변 검색을 위한 설정
        self.KINTEX_COORDS = {
            "lat": 37.6694,
            "lng": 126.7456,
            "city_id": 14690,  # Agoda 고양시 city ID
        }

        # 체크인/체크아웃 날짜 (콘서트 기준)
        self.concert_date = datetime(2026, 6, 12)  # D-Day 기준

    def _random_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        """사람처럼 보이기 위한 랜덤 딜레이"""
        delay = random.uniform(min_sec, max_sec)
        time.sleep(delay)

    def _build_search_url(self, checkin: datetime, checkout: datetime, adults: int = 2) -> str:
        """Agoda 검색 URL 생성"""
        checkin_str = checkin.strftime("%Y-%m-%d")
        checkout_str = checkout.strftime("%Y-%m-%d")

        # Agoda 검색 URL 패턴
        url = (
            f"https://www.agoda.com/search?"
            f"city={self.KINTEX_COORDS['city_id']}"
            f"&checkIn={checkin_str}"
            f"&checkOut={checkout_str}"
            f"&rooms=1"
            f"&adults={adults}"
            f"&children=0"
            f"&los=1"
            f"&sort=priceLowToHigh"
        )
        return url

    def scrape_hotels(self, checkin: Optional[datetime] = None, checkout: Optional[datetime] = None) -> List[Dict]:
        """
        Agoda에서 호텔 목록 스크래핑

        Returns:
            실제 호텔 데이터 리스트 (가격, 평점, 재고 포함)
        """
        if not checkin:
            checkin = self.concert_date - timedelta(days=1)  # 콘서트 전날 체크인
        if not checkout:
            checkout = self.concert_date + timedelta(days=1)  # 콘서트 다음날 체크아웃

        url = self._build_search_url(checkin, checkout)
        print(f"🔍 Agoda 검색 중: {url}")

        try:
            # 랜덤 딜레이 후 요청
            self._random_delay(2.0, 5.0)

            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()

            # HTML 파싱
            soup = BeautifulSoup(response.text, 'html.parser')

            # Agoda는 JavaScript로 데이터를 로드하므로,
            # 초기 HTML에서 JSON 데이터를 추출해야 함
            hotels = self._extract_hotels_from_html(soup, response.text)

            print(f"✅ {len(hotels)}개 호텔 데이터 수집 완료")
            return hotels

        except requests.exceptions.RequestException as e:
            print(f"❌ 스크래핑 실패: {e}")
            return []

    def _extract_hotels_from_html(self, soup: BeautifulSoup, html: str) -> List[Dict]:
        """
        HTML에서 호텔 데이터 추출

        Agoda는 서버사이드 렌더링과 클라이언트 하이드레이션을 함께 사용.
        초기 HTML에 __NEXT_DATA__ 또는 window.__STATE__ 형태로 JSON이 포함됨.
        """
        hotels = []

        # 방법 1: __NEXT_DATA__ 스크립트 태그에서 JSON 추출
        script_tag = soup.find('script', {'id': '__NEXT_DATA__'})
        if script_tag:
            try:
                data = json.loads(script_tag.string)
                # Agoda의 데이터 구조에서 호텔 목록 추출
                hotels = self._parse_next_data(data)
                if hotels:
                    return hotels
            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️ __NEXT_DATA__ 파싱 실패: {e}")

        # 방법 2: 페이지 내 JSON 데이터 패턴 검색
        json_pattern = r'window\.__STATE__\s*=\s*(\{.*?\});'
        match = re.search(json_pattern, html, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(1))
                hotels = self._parse_state_data(data)
                if hotels:
                    return hotels
            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️ __STATE__ 파싱 실패: {e}")

        # 방법 3: HTML 요소에서 직접 추출 (폴백)
        hotel_cards = soup.find_all('div', {'data-selenium': 'hotel-item'})
        if not hotel_cards:
            hotel_cards = soup.find_all('li', class_=re.compile(r'PropertyCard'))

        for card in hotel_cards[:50]:  # 최대 50개
            hotel = self._parse_hotel_card(card)
            if hotel:
                hotels.append(hotel)

        return hotels

    def _parse_next_data(self, data: dict) -> List[Dict]:
        """__NEXT_DATA__에서 호텔 데이터 파싱"""
        hotels = []
        try:
            # Agoda의 구조: props.pageProps.searchResult.properties
            props = data.get('props', {}).get('pageProps', {})
            search_result = props.get('searchResult', {}) or props.get('initialSearchResult', {})
            properties = search_result.get('properties', []) or search_result.get('results', [])

            for prop in properties[:50]:
                hotel = {
                    'name': prop.get('propertyName', prop.get('name', '')),
                    'name_en': prop.get('propertyNameEn', prop.get('englishName', '')),
                    'price_usd': self._extract_price(prop),
                    'rating': prop.get('rating', prop.get('reviewScore', 0)),
                    'review_count': prop.get('reviewCount', prop.get('numberOfReviews', 0)),
                    'star_rating': prop.get('starRating', prop.get('star', 0)),
                    'address': prop.get('address', ''),
                    'latitude': prop.get('latitude', prop.get('lat', 0)),
                    'longitude': prop.get('longitude', prop.get('lng', 0)),
                    'image_url': self._extract_image(prop),
                    'rooms_left': prop.get('roomsLeft', prop.get('availableRooms', -1)),
                    'property_id': prop.get('propertyId', prop.get('hotelId', '')),
                    'booking_url': self._build_booking_url(prop),
                }
                if hotel['name']:
                    hotels.append(hotel)
        except Exception as e:
            print(f"⚠️ NEXT_DATA 파싱 오류: {e}")

        return hotels

    def _parse_state_data(self, data: dict) -> List[Dict]:
        """window.__STATE__에서 호텔 데이터 파싱"""
        hotels = []
        try:
            # 다양한 키 패턴 시도
            for key in ['searchResults', 'properties', 'hotels', 'results']:
                if key in data:
                    results = data[key]
                    if isinstance(results, list):
                        for item in results[:50]:
                            hotel = self._normalize_hotel_data(item)
                            if hotel:
                                hotels.append(hotel)
                        break
        except Exception as e:
            print(f"⚠️ STATE 파싱 오류: {e}")

        return hotels

    def _parse_hotel_card(self, card) -> Optional[Dict]:
        """HTML 호텔 카드에서 데이터 추출"""
        try:
            # 호텔명
            name_el = card.find(['h3', 'span'], class_=re.compile(r'PropertyCard__HotelName|hotel-name'))
            name = name_el.get_text(strip=True) if name_el else ''

            # 가격
            price_el = card.find(['span', 'div'], class_=re.compile(r'Price|price'))
            price_text = price_el.get_text(strip=True) if price_el else '0'
            price = self._parse_price_text(price_text)

            # 평점
            rating_el = card.find(['span', 'div'], class_=re.compile(r'Review|rating|score'))
            rating = 0.0
            if rating_el:
                rating_text = rating_el.get_text(strip=True)
                rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                if rating_match:
                    rating = float(rating_match.group(1))

            # 이미지
            img_el = card.find('img')
            image_url = ''
            if img_el:
                image_url = img_el.get('src') or img_el.get('data-src', '')

            if name:
                return {
                    'name': name,
                    'name_en': name,
                    'price_usd': price,
                    'rating': rating,
                    'review_count': 0,
                    'star_rating': 0,
                    'address': '',
                    'latitude': 0,
                    'longitude': 0,
                    'image_url': image_url,
                    'rooms_left': -1,
                    'property_id': '',
                    'booking_url': '',
                }
        except Exception as e:
            print(f"⚠️ 카드 파싱 오류: {e}")

        return None

    def _extract_price(self, prop: dict) -> int:
        """가격 추출"""
        try:
            # 다양한 가격 필드 시도
            price_fields = ['price', 'displayPrice', 'pricePerNight', 'totalPrice', 'crossedPrice']
            for field in price_fields:
                if field in prop:
                    price_data = prop[field]
                    if isinstance(price_data, (int, float)):
                        return int(price_data)
                    elif isinstance(price_data, dict):
                        return int(price_data.get('value', price_data.get('amount', 0)))
                    elif isinstance(price_data, str):
                        return self._parse_price_text(price_data)
        except:
            pass
        return 0

    def _parse_price_text(self, text: str) -> int:
        """가격 텍스트에서 숫자 추출"""
        try:
            # 숫자만 추출
            numbers = re.findall(r'[\d,]+', text.replace(',', ''))
            if numbers:
                return int(numbers[0])
        except:
            pass
        return 0

    def _extract_image(self, prop: dict) -> str:
        """이미지 URL 추출"""
        try:
            image_fields = ['imageUrl', 'heroImage', 'thumbnail', 'primaryPhoto', 'images']
            for field in image_fields:
                if field in prop:
                    img = prop[field]
                    if isinstance(img, str):
                        return img
                    elif isinstance(img, list) and img:
                        return img[0] if isinstance(img[0], str) else img[0].get('url', '')
                    elif isinstance(img, dict):
                        return img.get('url', img.get('src', ''))
        except:
            pass
        return ''

    def _build_booking_url(self, prop: dict) -> str:
        """예약 URL 생성"""
        property_id = prop.get('propertyId', prop.get('hotelId', ''))
        if property_id:
            return f"https://www.agoda.com/ko-kr/hotel_{property_id}.html"
        return "https://www.agoda.com/search?city=14690"

    def _normalize_hotel_data(self, item: dict) -> Optional[Dict]:
        """다양한 형식의 호텔 데이터 정규화"""
        try:
            return {
                'name': item.get('name', item.get('propertyName', '')),
                'name_en': item.get('englishName', item.get('name', '')),
                'price_usd': self._extract_price(item),
                'rating': item.get('rating', item.get('score', 0)),
                'review_count': item.get('reviewCount', 0),
                'star_rating': item.get('star', item.get('starRating', 0)),
                'address': item.get('address', ''),
                'latitude': item.get('lat', item.get('latitude', 0)),
                'longitude': item.get('lng', item.get('longitude', 0)),
                'image_url': self._extract_image(item),
                'rooms_left': item.get('roomsLeft', -1),
                'property_id': str(item.get('id', item.get('propertyId', ''))),
                'booking_url': self._build_booking_url(item),
            }
        except:
            return None


def test_scraper():
    """스크래퍼 테스트"""
    print("=" * 50)
    print("🧪 Agoda 스크래퍼 테스트")
    print("=" * 50)

    scraper = AgodaScraper()

    # 테스트 날짜 설정
    checkin = datetime(2026, 6, 11)
    checkout = datetime(2026, 6, 13)

    hotels = scraper.scrape_hotels(checkin, checkout)

    if hotels:
        print(f"\n📊 수집된 호텔 샘플 (상위 3개):")
        for i, hotel in enumerate(hotels[:3], 1):
            print(f"\n{i}. {hotel['name']}")
            print(f"   가격: ${hotel['price_usd']}")
            print(f"   평점: {hotel['rating']}")
            print(f"   남은 객실: {hotel['rooms_left']}")
    else:
        print("\n⚠️ 호텔 데이터를 가져오지 못했습니다.")
        print("   Agoda가 JavaScript 렌더링을 요구할 수 있습니다.")
        print("   → Selenium/Playwright 사용 또는 시뮬레이션 데이터로 대체")

    return hotels


if __name__ == "__main__":
    test_scraper()
