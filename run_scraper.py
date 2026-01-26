"""
ARMY Stay Hub - 데이터 엔진 v4.0
고양종합운동장 기준 숙소 큐레이션 + 외국인 예약 가이드

페이지별 데이터:
- Home: 예약 가능 숙소 수, 최저가
- List: 거리(도보/차), 4단계 태그(Type, Density, Transport, ArmySpot)
- Detail: Safe Return Route, Army Local Guide, 예약 가이드, 추천 숙소
"""

import json
import random
import math
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

# 스크래핑 모듈 임포트 (선택적)
try:
    from korean_ota_scraper import KoreanOTAScraper
    SCRAPING_ENABLED = True
except ImportError:
    SCRAPING_ENABLED = False
    print("⚠️ 스크래핑 모듈 없음 - 시뮬레이션 모드로 실행")


class ARMYStayHubEngine:
    def __init__(self):
        # 고양종합운동장 좌표 - 중심점 (변경됨)
        self.VENUE = {
            "name": "고양종합운동장",
            "name_en": "Goyang Stadium",
            "lat": 37.6556,
            "lng": 126.7714
        }

        # 아미 로컬 가이드 - BTS 관련 장소 + 맛집/카페/핫스팟
        self.LOCAL_SPOTS = [
            # BTS 관련 장소
            {"name": "HYBE INSIGHT", "name_en": "HYBE INSIGHT", "lat": 37.5260, "lng": 127.0405,
             "category": "bts", "type": "museum",
             "description_en": "Official BTS museum with exhibitions and experiences",
             "spot_tag": "BTS Museum"},
            {"name": "하이브 사옥", "name_en": "HYBE Headquarters", "lat": 37.5280, "lng": 127.0400,
             "category": "bts", "type": "landmark",
             "description_en": "HYBE company headquarters in Yongsan",
             "spot_tag": "BTS Home"},
            {"name": "홍대 버스킹 거리", "name_en": "Hongdae Busking Street", "lat": 37.5563, "lng": 126.9220,
             "category": "bts", "type": "street",
             "description_en": "Pre-debut busking location of BTS",
             "spot_tag": "Trainee Memory"},
            {"name": "상암 MBC", "name_en": "MBC Sangam", "lat": 37.5786, "lng": 126.8918,
             "category": "bts", "type": "broadcast",
             "description_en": "Music show filming location",
             "spot_tag": "Music Show"},
            {"name": "광장시장", "name_en": "Gwangjang Market", "lat": 37.5700, "lng": 127.0098,
             "category": "bts", "type": "historic",
             "description_en": "2013 debut stage location",
             "spot_tag": "Debut Memory"},

            # 고양시 주변 맛집
            {"name": "일산 맛집거리", "name_en": "Ilsan Food Street", "lat": 37.6580, "lng": 126.7720,
             "category": "restaurant", "type": "food_street",
             "description_en": "Popular local food street near stadium",
             "spot_tag": "Local Eats"},
            {"name": "라페스타 맛집", "name_en": "La Festa Restaurants", "lat": 37.6575, "lng": 126.7705,
             "category": "restaurant", "type": "dining",
             "description_en": "Various restaurants in La Festa complex",
             "spot_tag": "Dining Hub"},
            {"name": "웨스턴돔 푸드코트", "name_en": "Western Dom Food Court", "lat": 37.6630, "lng": 126.7620,
             "category": "restaurant", "type": "food_court",
             "description_en": "Food court with Korean and international options",
             "spot_tag": "Food Court"},

            # 카페
            {"name": "일산호수공원 카페거리", "name_en": "Ilsan Lake Park Cafe Street", "lat": 37.6590, "lng": 126.7600,
             "category": "cafe", "type": "cafe_street",
             "description_en": "Scenic cafes along Ilsan Lake Park",
             "spot_tag": "Lake View Cafe"},
            {"name": "라페스타 카페", "name_en": "La Festa Cafes", "lat": 37.6572, "lng": 126.7710,
             "category": "cafe", "type": "cafe",
             "description_en": "Trendy cafes in La Festa area",
             "spot_tag": "Trendy Cafe"},

            # 핫스팟
            {"name": "일산호수공원", "name_en": "Ilsan Lake Park", "lat": 37.6580, "lng": 126.7590,
             "category": "hotspot", "type": "park",
             "description_en": "Beautiful lake park, great for walks",
             "spot_tag": "Must Visit"},
            {"name": "원마운트", "name_en": "One Mount", "lat": 37.6650, "lng": 126.7510,
             "category": "hotspot", "type": "entertainment",
             "description_en": "Theme park with water park and snow park",
             "spot_tag": "Entertainment"},
            {"name": "스타필드 고양", "name_en": "Starfield Goyang", "lat": 37.6450, "lng": 126.8950,
             "category": "hotspot", "type": "shopping",
             "description_en": "Large shopping mall with various stores",
             "spot_tag": "Shopping"},
        ]

        # 플랫폼별 외국인 예약 가이드
        self.BOOKING_GUIDES = {
            "Agoda": {
                "platform": "Agoda",
                "steps_en": [
                    "1. Select your dates and search for hotels",
                    "2. Choose your room and click 'Book Now'",
                    "3. Enter guest details (passport name required)",
                    "4. Pay with international credit card or PayPal",
                    "5. Receive confirmation email instantly"
                ],
                "tips_en": [
                    "Use 'Pay at Hotel' option if available for flexibility",
                    "Check cancellation policy before booking",
                    "AgodaCash can be used for discounts"
                ],
                "payment_methods": ["Credit Card", "PayPal", "Pay at Hotel"],
                "foreigner_friendly": True
            },
            "Booking.com": {
                "platform": "Booking.com",
                "steps_en": [
                    "1. Search for Goyang hotels with your dates",
                    "2. Filter by 'Free Cancellation' for flexibility",
                    "3. Select room and enter guest information",
                    "4. Choose 'Pay at Property' or prepay online",
                    "5. Show confirmation at check-in"
                ],
                "tips_en": [
                    "Genius membership gives extra discounts",
                    "Many hotels offer free cancellation",
                    "Mobile app has exclusive deals"
                ],
                "payment_methods": ["Credit Card", "Pay at Property"],
                "foreigner_friendly": True
            },
            "야놀자": {
                "platform": "Yanolja",
                "steps_en": [
                    "1. Download Yanolja app (available in English)",
                    "2. Search '고양' or 'Goyang' for hotels",
                    "3. Select dates and choose accommodation",
                    "4. Register with phone number (Korean or international)",
                    "5. Pay with Korean card or international card"
                ],
                "tips_en": [
                    "App has English language option",
                    "Some hotels may require Korean phone for contact",
                    "Check if hotel accepts foreign guests"
                ],
                "payment_methods": ["Credit Card", "Korean Pay"],
                "foreigner_friendly": "partial"
            },
            "여기어때": {
                "platform": "GoodChoice",
                "steps_en": [
                    "1. Use GoodChoice app or website",
                    "2. Search for Goyang area accommodations",
                    "3. Select room type and check-in time",
                    "4. Enter booking information",
                    "5. Pay and receive confirmation"
                ],
                "tips_en": [
                    "Limited English support",
                    "Recommend using Papago translator",
                    "Better to book through global OTA for foreigners"
                ],
                "payment_methods": ["Credit Card", "Korean Pay"],
                "foreigner_friendly": "limited"
            },
            "Hotels.com": {
                "platform": "Hotels.com",
                "steps_en": [
                    "1. Search 'Goyang, South Korea' on Hotels.com",
                    "2. Filter by price, rating, or amenities",
                    "3. Select hotel and room type",
                    "4. Enter guest details and payment info",
                    "5. Collect stamps for free nights reward"
                ],
                "tips_en": [
                    "Collect 10 stamps = 1 free night",
                    "Price match guarantee available",
                    "Secret prices for app users"
                ],
                "payment_methods": ["Credit Card", "PayPal"],
                "foreigner_friendly": True
            },
        }

        # 지역별 지하철 노선 정보
        self.SUBWAY_ROUTES = {
            "Ilsan/KINTEX": {"station": "정발산역", "station_en": "Jeongbalsan", "line": "3호선", "line_en": "Line 3", "line_color": "#EF7C1C", "to_venue_min": 10},
            "Hongdae/Sinchon": {"station": "홍대입구역", "station_en": "Hongik Univ.", "line": "2호선", "line_en": "Line 2", "line_color": "#00A84D", "to_venue_min": 45},
            "Sangam/DMC": {"station": "디지털미디어시티역", "station_en": "DMC", "line": "6호선", "line_en": "Line 6", "line_color": "#CD7C2F", "to_venue_min": 30},
            "Paju/Unjeong": {"station": "운정역", "station_en": "Unjeong", "line": "경의중앙선", "line_en": "Gyeongui Line", "line_color": "#77C4A3", "to_venue_min": 25},
        }

        # 숙소 타입 설정
        self.HOTEL_TYPES = {
            "5star": {"label_en": "5-Star Hotel", "label_kr": "5성급", "price_range": (180000, 350000), "color": "#FFD700"},
            "4star": {"label_en": "4-Star Hotel", "label_kr": "4성급", "price_range": (120000, 200000), "color": "#C0C0C0"},
            "3star": {"label_en": "3-Star Hotel", "label_kr": "3성급", "price_range": (70000, 130000), "color": "#CD7F32"},
            "residence": {"label_en": "Residence", "label_kr": "레지던스", "price_range": (90000, 180000), "color": "#87CEEB"},
            "guesthouse": {"label_en": "Guesthouse", "label_kr": "게스트하우스", "price_range": (25000, 60000), "color": "#98FB98"},
            "airbnb": {"label_en": "Airbnb", "label_kr": "에어비앤비", "price_range": (40000, 120000), "color": "#FF5A5F"},
            "hostel": {"label_en": "Hostel", "label_kr": "호스텔", "price_range": (15000, 40000), "color": "#DDA0DD"},
        }

        # 숙소 이미지
        self.HOTEL_IMAGES = {
            "5star": ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
                      "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800"],
            "4star": ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
                      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"],
            "3star": ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
                      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800"],
            "residence": ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
                         "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"],
            "guesthouse": ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"],
            "airbnb": ["https://images.unsplash.com/photo-1501183638710-841dd1904471?w=800"],
            "hostel": ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800"],
        }

        # 플랫폼 설정
        self.PLATFORMS = {
            "agoda": {"name": "Agoda", "url_pattern": "https://www.agoda.com/search?city=14690"},
            "booking": {"name": "Booking.com", "url_pattern": "https://www.booking.com/searchresults.ko.html?dest_id=-716583"},
            "hotels": {"name": "Hotels.com", "url_pattern": "https://kr.hotels.com/search.do?destination-id=759818"},
            "yanolja": {"name": "야놀자", "url_pattern": "https://www.yanolja.com/search/고양"},
            "goodchoice": {"name": "여기어때", "url_pattern": "https://www.goodchoice.kr/search?keyword=고양"},
        }

        # 호텔 데이터베이스 생성
        self.HOTELS_DATA = self._generate_hotels_database()

    def _generate_hotels_database(self) -> List[Dict]:
        """호텔 기본 데이터베이스 생성"""
        hotels = []

        # 일산/고양 지역 (고양종합운동장 근처)
        ilsan_hotels = [
            {"name_en": "MVL Hotel Goyang", "lat": 37.6560, "lng": 126.7700, "type": "5star"},
            {"name_en": "Best Western Premier Kukdo", "lat": 37.6555, "lng": 126.7750, "type": "4star"},
            {"name_en": "Ramada Encore Goyang", "lat": 37.6580, "lng": 126.7680, "type": "4star"},
            {"name_en": "Hotel Castle Ilsan", "lat": 37.6620, "lng": 126.7595, "type": "3star"},
            {"name_en": "Ilsan Sky Hotel", "lat": 37.6590, "lng": 126.7650, "type": "3star"},
            {"name_en": "Hotel Mare Ilsan", "lat": 37.6550, "lng": 126.7780, "type": "3star"},
            {"name_en": "Ilsan Residence", "lat": 37.6545, "lng": 126.7730, "type": "residence"},
            {"name_en": "Goyang Stay Residence", "lat": 37.6570, "lng": 126.7740, "type": "residence"},
            {"name_en": "La Festa Residence", "lat": 37.6575, "lng": 126.7705, "type": "residence"},
            {"name_en": "Western Dom Residence", "lat": 37.6630, "lng": 126.7620, "type": "residence"},
            {"name_en": "Baekseok Guesthouse", "lat": 37.6480, "lng": 126.7820, "type": "guesthouse"},
            {"name_en": "Ilsan ARMY House", "lat": 37.6535, "lng": 126.7660, "type": "guesthouse"},
            {"name_en": "Goyang Cozy Room", "lat": 37.6560, "lng": 126.7720, "type": "airbnb"},
            {"name_en": "Lake Park View Apt", "lat": 37.6580, "lng": 126.7590, "type": "airbnb"},
            {"name_en": "Jeongbalsan Modern Studio", "lat": 37.6550, "lng": 126.7680, "type": "airbnb"},
            {"name_en": "Madu Station Room", "lat": 37.6518, "lng": 126.7781, "type": "airbnb"},
            {"name_en": "Hotel Icon Ilsan", "lat": 37.6530, "lng": 126.7710, "type": "3star"},
            {"name_en": "Grace Hotel Ilsan", "lat": 37.6500, "lng": 126.7820, "type": "3star"},
            {"name_en": "Hotel W Ilsan", "lat": 37.6615, "lng": 126.7560, "type": "4star"},
            {"name_en": "Ilsan Hostel 808", "lat": 37.6490, "lng": 126.7750, "type": "hostel"},
            {"name_en": "Baekma Hostel", "lat": 37.6420, "lng": 126.7880, "type": "hostel"},
            {"name_en": "Jeongbalsan Residence", "lat": 37.6610, "lng": 126.7550, "type": "residence"},
            {"name_en": "Hotel Renaissance Ilsan", "lat": 37.6640, "lng": 126.7515, "type": "4star"},
            {"name_en": "Ilsan Central Hotel", "lat": 37.6555, "lng": 126.7630, "type": "3star"},
            {"name_en": "Hotel Atrium Ilsan", "lat": 37.6600, "lng": 126.7580, "type": "4star"},
            {"name_en": "Ilsan Loft Airbnb", "lat": 37.6605, "lng": 126.7670, "type": "airbnb"},
            {"name_en": "Hwajeong Business Hotel", "lat": 37.6340, "lng": 126.8320, "type": "3star"},
            {"name_en": "Hwajeong Residence", "lat": 37.6350, "lng": 126.8290, "type": "residence"},
            {"name_en": "Haengsin Residence", "lat": 37.6120, "lng": 126.8350, "type": "residence"},
            {"name_en": "Ilsan The Stay", "lat": 37.6585, "lng": 126.7725, "type": "residence"},
        ]

        # 홍대/신촌 지역
        hongdae_hotels = [
            {"name_en": "L7 Hongdae by Lotte", "lat": 37.5567, "lng": 126.9236, "type": "5star"},
            {"name_en": "RYSE Autograph Collection", "lat": 37.5559, "lng": 126.9213, "type": "5star"},
            {"name_en": "Hongdae Stay Hotel", "lat": 37.5578, "lng": 126.9220, "type": "4star"},
            {"name_en": "Marigold Hotel Hongdae", "lat": 37.5590, "lng": 126.9198, "type": "4star"},
            {"name_en": "Hotel River Hongdae", "lat": 37.5549, "lng": 126.9262, "type": "3star"},
            {"name_en": "Mr. Hong Guesthouse", "lat": 37.5570, "lng": 126.9255, "type": "guesthouse"},
            {"name_en": "Hongdae ARMY Guesthouse", "lat": 37.5585, "lng": 126.9245, "type": "guesthouse"},
            {"name_en": "Safe Stay Hongdae", "lat": 37.5598, "lng": 126.9185, "type": "hostel"},
            {"name_en": "Hi Hongdae Hostel", "lat": 37.5540, "lng": 126.9295, "type": "hostel"},
            {"name_en": "Hongdae Modern Studio", "lat": 37.5572, "lng": 126.9235, "type": "airbnb"},
            {"name_en": "Yeonnam Retro House", "lat": 37.5620, "lng": 126.9255, "type": "airbnb"},
            {"name_en": "Hongdae Art Residence", "lat": 37.5580, "lng": 126.9200, "type": "residence"},
            {"name_en": "The Local Hongdae", "lat": 37.5545, "lng": 126.9245, "type": "4star"},
            {"name_en": "Amanti Hotel Hongdae", "lat": 37.5535, "lng": 126.9310, "type": "4star"},
            {"name_en": "Purple House Hongdae", "lat": 37.5592, "lng": 126.9208, "type": "airbnb"},
        ]

        # 상암/DMC 지역
        sangam_hotels = [
            {"name_en": "Stanford Hotel Sangam", "lat": 37.5795, "lng": 126.8898, "type": "4star"},
            {"name_en": "Courtyard by Marriott Sangam", "lat": 37.5768, "lng": 126.8920, "type": "5star"},
            {"name_en": "MBC Press Center Hotel", "lat": 37.5780, "lng": 126.8910, "type": "4star"},
            {"name_en": "DMC Business Hotel", "lat": 37.5755, "lng": 126.8950, "type": "3star"},
            {"name_en": "Sangam Residence Hotel", "lat": 37.5770, "lng": 126.8875, "type": "residence"},
            {"name_en": "DMC Guesthouse", "lat": 37.5788, "lng": 126.8930, "type": "guesthouse"},
            {"name_en": "World Cup Stadium Hostel", "lat": 37.5682, "lng": 126.8972, "type": "hostel"},
            {"name_en": "Sangam Park Studio", "lat": 37.5765, "lng": 126.8855, "type": "airbnb"},
            {"name_en": "Sky Park View Apartment", "lat": 37.5720, "lng": 126.8920, "type": "airbnb"},
            {"name_en": "Sangam Skyview Hotel", "lat": 37.5750, "lng": 126.8905, "type": "4star"},
        ]

        # 파주 지역
        paju_hotels = [
            {"name_en": "Unjeong Hotel", "lat": 37.7120, "lng": 126.7580, "type": "3star"},
            {"name_en": "Paju Residence", "lat": 37.7080, "lng": 126.7620, "type": "residence"},
            {"name_en": "Unjeong Guesthouse", "lat": 37.7095, "lng": 126.7550, "type": "guesthouse"},
            {"name_en": "Paju Peace Hostel", "lat": 37.7200, "lng": 126.7180, "type": "hostel"},
            {"name_en": "Unjeong Lake Airbnb", "lat": 37.7060, "lng": 126.7650, "type": "airbnb"},
            {"name_en": "Paju Book City Hotel", "lat": 37.7350, "lng": 126.7150, "type": "4star"},
            {"name_en": "Heyri Art Village Airbnb", "lat": 37.7450, "lng": 126.6850, "type": "airbnb"},
            {"name_en": "Paju Premium Hotel", "lat": 37.7180, "lng": 126.7350, "type": "4star"},
            {"name_en": "Unjeong Business Hotel", "lat": 37.7100, "lng": 126.7530, "type": "3star"},
            {"name_en": "Paju The Stay", "lat": 37.7140, "lng": 126.7480, "type": "residence"},
        ]

        # 지역 태그 추가
        for h in ilsan_hotels:
            h["area"] = "Ilsan/KINTEX"
            hotels.append(h)
        for h in hongdae_hotels:
            h["area"] = "Hongdae/Sinchon"
            hotels.append(h)
        for h in sangam_hotels:
            h["area"] = "Sangam/DMC"
            hotels.append(h)
        for h in paju_hotels:
            h["area"] = "Paju/Unjeong"
            hotels.append(h)

        return hotels

    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Haversine 공식으로 거리 계산 (km)"""
        R = 6371
        lat1_rad, lat2_rad = math.radians(lat1), math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    def _get_distance_display(self, distance_km: float) -> Dict:
        """거리 표시 생성 - 도보 30분 이내면 도보, 아니면 차로"""
        walking_time = int(distance_km / 5 * 60)  # 5km/h 기준
        driving_time = int(distance_km / 30 * 60)  # 30km/h 기준 (시내)

        if walking_time <= 30:
            return {
                "type": "walk",
                "display_en": f"Walk {walking_time}min",
                "display_kr": f"도보 {walking_time}분",
                "minutes": walking_time,
                "distance_km": round(distance_km, 1)
            }
        else:
            return {
                "type": "car",
                "display_en": f"Drive {driving_time}min",
                "display_kr": f"차로 {driving_time}분",
                "minutes": driving_time,
                "distance_km": round(distance_km, 1)
            }

    def _generate_army_density(self, hotel_type: str, area: str) -> Dict:
        """아미 밀집도 생성"""
        base = random.randint(20, 50)

        if "Ilsan" in area or "KINTEX" in area:
            base += random.randint(20, 35)
        elif "Hongdae" in area:
            base += random.randint(15, 30)
        elif "Sangam" in area:
            base += random.randint(10, 20)

        if hotel_type == "guesthouse":
            base += random.randint(10, 20)
        elif hotel_type == "hostel":
            base += random.randint(5, 15)

        value = min(base, 95)
        return {
            "value": value,
            "label_en": f"ARMY {value}%",
            "label_kr": f"아미 {value}%"
        }

    def _get_transport_info(self, area: str) -> Dict:
        """근처 교통편 정보"""
        route = self.SUBWAY_ROUTES.get(area, self.SUBWAY_ROUTES["Ilsan/KINTEX"])
        return {
            "station_en": route["station_en"],
            "station_kr": route["station"],
            "line_en": route["line_en"],
            "line_kr": route["line"],
            "line_color": route["line_color"],
            "to_venue_min": route["to_venue_min"],
            "display_en": f"{route['station_en']} ({route['line_en']})",
            "display_kr": f"{route['station']} ({route['line']})"
        }

    def _get_army_spot_tag(self, lat: float, lng: float) -> Dict:
        """가장 가까운 아미 스팟 태그"""
        bts_spots = [s for s in self.LOCAL_SPOTS if s["category"] == "bts"]
        nearest = min(bts_spots, key=lambda s: self._calculate_distance(lat, lng, s["lat"], s["lng"]))
        distance = self._calculate_distance(lat, lng, nearest["lat"], nearest["lng"])
        return {
            "name_en": nearest["name_en"],
            "spot_tag": nearest["spot_tag"],
            "distance_km": round(distance, 1)
        }

    def _get_safe_return_route(self, hotel: Dict, distance_km: float) -> Dict:
        """Safe Return Route - 공연장에서 숙소까지 경로"""
        area = hotel.get("area", "Ilsan/KINTEX")
        route = self.SUBWAY_ROUTES.get(area, self.SUBWAY_ROUTES["Ilsan/KINTEX"])

        # 공연 종료 예상 시간
        concert_end = "22:00"

        # 막차 시간
        last_trains = {
            "Ilsan/KINTEX": "23:50",
            "Hongdae/Sinchon": "00:15",
            "Sangam/DMC": "00:10",
            "Paju/Unjeong": "23:30",
        }
        last_train = last_trains.get(area, "23:50")

        # 이동 수단 결정
        walking_time = int(distance_km / 5 * 60)
        if walking_time <= 30:
            transport = "walk"
            travel_time = walking_time
            route_detail = f"Walk from {self.VENUE['name_en']} → {hotel['name_en']}"
        elif distance_km <= 10:
            transport = "subway"
            travel_time = route["to_venue_min"]
            route_detail = f"{self.VENUE['name_en']} → {route['station_en']} ({route['line_en']}) → Walk to hotel"
        else:
            transport = "taxi"
            travel_time = int(distance_km / 30 * 60)
            route_detail = f"Taxi from {self.VENUE['name_en']} → {hotel['name_en']}"

        return {
            "venue_name_en": self.VENUE["name_en"],
            "venue_name_kr": self.VENUE["name"],
            "route_detail_en": route_detail,
            "route_summary_en": f"{self.VENUE['name_en']} → {route['line_en']} → Hotel",
            "route_summary_kr": f"{self.VENUE['name']} → {route['line']} → 숙소",
            "transport_type": transport,
            "travel_time_min": travel_time,
            "last_train_time": last_train,
            "concert_end_estimate": concert_end,
            "safe_return_possible": distance_km < 15,
            "line_color": route["line_color"],
            "station_en": route["station_en"],
            "taxi_estimate_krw": int(distance_km * 1200 + 4800) if transport == "taxi" else 0
        }

    def _get_army_local_guide(self, lat: float, lng: float) -> Dict:
        """아미 로컬 가이드 - BTS/맛집/카페/핫스팟"""
        result = {"bts_spots": [], "restaurants": [], "cafes": [], "hotspots": []}

        for spot in self.LOCAL_SPOTS:
            dist = self._calculate_distance(lat, lng, spot["lat"], spot["lng"])
            spot_data = {
                "name_en": spot["name_en"],
                "spot_tag": spot["spot_tag"],
                "description_en": spot["description_en"],
                "distance_km": round(dist, 1),
                "latitude": spot["lat"],
                "longitude": spot["lng"]
            }

            if spot["category"] == "bts":
                result["bts_spots"].append(spot_data)
            elif spot["category"] == "restaurant":
                result["restaurants"].append(spot_data)
            elif spot["category"] == "cafe":
                result["cafes"].append(spot_data)
            elif spot["category"] == "hotspot":
                result["hotspots"].append(spot_data)

        # 각 카테고리별 가까운 순 정렬 및 제한
        for key in result:
            result[key] = sorted(result[key], key=lambda x: x["distance_km"])[:3]

        return result

    def _get_booking_guide(self, platform_name: str) -> Dict:
        """외국인 예약 가이드"""
        guide = self.BOOKING_GUIDES.get(platform_name, self.BOOKING_GUIDES["Agoda"])
        return guide

    def generate_hotel_data(self, hotel: Dict, all_hotels: List[Dict] = None) -> Dict:
        """개별 호텔 완전 데이터 생성"""

        # 거리 계산
        distance = self._calculate_distance(
            hotel["lat"], hotel["lng"],
            self.VENUE["lat"], self.VENUE["lng"]
        )

        # 타입 정보
        type_info = self.HOTEL_TYPES[hotel["type"]]

        # 가격 (원화 기준)
        price_krw = random.randint(*type_info["price_range"])

        # 플랫폼 선택
        if hotel["type"] in ["5star", "4star", "3star"]:
            platform_key = random.choice(["agoda", "booking", "hotels"])
        elif hotel["type"] == "airbnb":
            platform_key = "agoda"  # 에어비앤비도 글로벌 OTA로
        else:
            platform_key = random.choice(["agoda", "booking", "yanolja"])

        platform = self.PLATFORMS[platform_key]

        # 평점 생성
        rating_base = {"5star": 4.5, "4star": 4.2, "3star": 3.9, "residence": 4.1,
                       "guesthouse": 4.3, "airbnb": 4.0, "hostel": 3.8}
        rating = round(rating_base.get(hotel["type"], 4.0) + random.uniform(-0.3, 0.4), 1)
        rating = min(5.0, max(3.5, rating))

        # 객실 현황
        rooms_left = random.randint(0, 10)

        # 이미지
        images = self.HOTEL_IMAGES.get(hotel["type"], self.HOTEL_IMAGES["3star"])
        image_url = random.choice(images)

        # 4단계 태그 (키워드 제거)
        display_tags = {
            "type": {
                "label_en": type_info["label_en"],
                "label_kr": type_info["label_kr"],
                "color": type_info["color"]
            },
            "density": self._generate_army_density(hotel["type"], hotel.get("area", "")),
            "transport": self._get_transport_info(hotel.get("area", "")),
            "army_spot": self._get_army_spot_tag(hotel["lat"], hotel["lng"])
        }

        hotel_id = f"hotel_{abs(hash(hotel['name_en'])) % 100000:05d}"

        return {
            "id": hotel_id,
            "name_en": hotel["name_en"],
            "area": hotel.get("area", ""),
            "latitude": hotel["lat"],
            "longitude": hotel["lng"],

            # 가격 (원화)
            "price_krw": price_krw,

            # 거리 표시 (도보/차)
            "distance": self._get_distance_display(distance),

            # 4단계 태그 (키워드 없음)
            "display_tags": display_tags,

            # 플랫폼 & 평점
            "platform": {
                "name": platform["name"],
                "rating": rating,
                "booking_url": platform["url_pattern"]
            },

            # 객실 현황
            "rooms_left": rooms_left,
            "is_available": rooms_left > 0,
            "status_en": "Sold Out" if rooms_left == 0 else f"{rooms_left} rooms left",

            # 이미지
            "image_url": image_url,

            # === Detail 페이지용 ===

            # Safe Return Route
            "safe_return": self._get_safe_return_route(hotel, distance),

            # Army Local Guide
            "army_local_guide": self._get_army_local_guide(hotel["lat"], hotel["lng"]),

            # 외국인 예약 가이드
            "booking_guide": self._get_booking_guide(platform["name"]),

            # 메타
            "last_update": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        }

    def _add_nearby_recommendations(self, hotels: List[Dict]) -> List[Dict]:
        """각 호텔에 가까운 추천 숙소 3개 추가"""
        for hotel in hotels:
            nearby = []
            for other in hotels:
                if other["id"] != hotel["id"]:
                    dist = self._calculate_distance(
                        hotel["latitude"], hotel["longitude"],
                        other["latitude"], other["longitude"]
                    )
                    nearby.append({
                        "id": other["id"],
                        "name_en": other["name_en"],
                        "price_krw": other["price_krw"],
                        "distance_km": round(dist, 1),
                        "image_url": other["image_url"],
                        "platform_name": other["platform"]["name"],
                        "rating": other["platform"]["rating"]
                    })

            # 거리순 정렬 후 상위 3개
            nearby.sort(key=lambda x: x["distance_km"])
            hotel["nearby_recommendations"] = nearby[:3]

        return hotels

    def generate_all_hotels(self) -> List[Dict]:
        """전체 호텔 데이터 생성"""
        hotels = []
        for h in self.HOTELS_DATA:
            hotel_data = self.generate_hotel_data(h)
            hotels.append(hotel_data)

        # 거리순 정렬
        hotels.sort(key=lambda x: x["distance"]["distance_km"])

        # 추천 숙소 추가
        hotels = self._add_nearby_recommendations(hotels)

        return hotels

    def generate_home_summary(self, hotels: List[Dict]) -> Dict:
        """홈 페이지용 요약 데이터"""
        available = [h for h in hotels if h["is_available"]]
        prices = [h["price_krw"] for h in available]

        return {
            "venue": {
                "name_en": self.VENUE["name_en"],
                "name_kr": self.VENUE["name"],
                "latitude": self.VENUE["lat"],
                "longitude": self.VENUE["lng"]
            },
            "available_count": len(available),
            "total_count": len(hotels),
            "lowest_price_krw": min(prices) if prices else 0,
            "highest_price_krw": max(prices) if prices else 0,
            "last_update": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

    def generate_map_data(self, hotels: List[Dict]) -> Dict:
        """맵뷰용 데이터"""
        return {
            "venue": {
                "name_en": self.VENUE["name_en"],
                "latitude": self.VENUE["lat"],
                "longitude": self.VENUE["lng"],
                "type": "venue"
            },
            "local_spots": [
                {
                    "name_en": s["name_en"],
                    "category": s["category"],
                    "spot_tag": s["spot_tag"],
                    "latitude": s["lat"],
                    "longitude": s["lng"]
                } for s in self.LOCAL_SPOTS
            ],
            "hotels": [
                {
                    "id": h["id"],
                    "name_en": h["name_en"],
                    "latitude": h["latitude"],
                    "longitude": h["longitude"],
                    "price_krw": h["price_krw"],
                    "type": "hotel"
                } for h in hotels
            ]
        }

    def save_to_json(self, hotels: List[Dict], filename: str = "korean_ota_hotels.json"):
        """JSON 저장"""
        output = {
            "home": self.generate_home_summary(hotels),
            "map": self.generate_map_data(hotels),
            "hotels": hotels
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"✅ {len(hotels)}개 숙소 데이터 저장 완료: {filename}")

        # 통계
        available = sum(1 for h in hotels if h["is_available"])
        print(f"📊 예약 가능: {available}/{len(hotels)}개")
        print(f"💰 최저가: ₩{output['home']['lowest_price_krw']:,}")


def run_with_scraping(use_scraping: bool = True):
    """메인 실행 함수"""
    print("🚀 ARMY Stay Hub 데이터 엔진 v4.0")
    print("=" * 60)

    engine = ARMYStayHubEngine()

    print("\n📊 데이터 생성 중...")
    hotels = engine.generate_all_hotels()

    print("\n💾 저장 중...")
    engine.save_to_json(hotels)

    print("\n" + "=" * 60)
    print("✨ 완료!")

    return hotels


if __name__ == "__main__":
    run_with_scraping()
