"""
ARMY Stay Hub - 데이터 엔진 v2.0
레딧 해외 팬 페인포인트 기반 숙소 큐레이션 데이터 생성

핵심 해결 문제:
1. 교통 공포 → walking_time, last_train, safe_return_route
2. 정보 불균형 → 4단계 태그 시스템 (Type, Trans, Density, Keyword)
3. 외로움/소속감 → army_density, nearby_bts_spots
"""

import json
import random
import math
from datetime import datetime
from typing import List, Dict, Tuple

class ARMYStayHubEngine:
    def __init__(self):
        # 킨텍스 (KINTEX) 공연장 좌표 - 중심점
        self.KINTEX = {
            "name": "KINTEX (킨텍스)",
            "lat": 37.6694,
            "lng": 126.7456
        }

        # BTS 성지순례 장소 (Army Local Guide용)
        self.BTS_SPOTS = [
            {"name": "HYBE INSIGHT", "lat": 37.5260, "lng": 127.0405, "type": "museum", "description": "BTS 전시 및 체험 공간"},
            {"name": "방탄소년단 데뷔 무대 (광장시장)", "lat": 37.5700, "lng": 127.0098, "type": "historic", "description": "2013년 데뷔 무대 장소"},
            {"name": "상암 MBC", "lat": 37.5786, "lng": 126.8918, "type": "broadcast", "description": "음악방송 촬영지"},
            {"name": "여의도 KBS", "lat": 37.5172, "lng": 126.9297, "type": "broadcast", "description": "음악방송 촬영지"},
            {"name": "홍대 버스킹 거리", "lat": 37.5563, "lng": 126.9220, "type": "street", "description": "데뷔 전 버스킹 장소"},
            {"name": "용산 하이브 사옥", "lat": 37.5280, "lng": 127.0400, "type": "company", "description": "하이브 본사"},
            {"name": "서울숲 (화양연화 촬영지)", "lat": 37.5443, "lng": 127.0374, "type": "filming", "description": "뮤직비디오 촬영지"},
            {"name": "남산타워", "lat": 37.5512, "lng": 126.9882, "type": "landmark", "description": "BTS 콘텐츠 촬영지"},
            {"name": "청계천", "lat": 37.5696, "lng": 126.9784, "type": "landmark", "description": "Run BTS 촬영지"},
            {"name": "경복궁", "lat": 37.5796, "lng": 126.9770, "type": "landmark", "description": "한복 화보 촬영지"},
        ]

        # 숙소 타입별 설정
        self.HOTEL_TYPES = {
            "5star": {"label": "5-Star Hotel", "label_kr": "5성급 호텔", "price_range": (180, 350), "color": "#FFD700"},
            "4star": {"label": "4-Star Hotel", "label_kr": "4성급 호텔", "price_range": (120, 200), "color": "#C0C0C0"},
            "3star": {"label": "3-Star Hotel", "label_kr": "3성급 호텔", "price_range": (70, 130), "color": "#CD7F32"},
            "residence": {"label": "Residence", "label_kr": "레지던스", "price_range": (90, 180), "color": "#87CEEB"},
            "guesthouse": {"label": "Guesthouse", "label_kr": "게스트하우스", "price_range": (25, 60), "color": "#98FB98"},
            "airbnb": {"label": "Airbnb", "label_kr": "에어비앤비", "price_range": (40, 120), "color": "#FF5A5F"},
            "hostel": {"label": "Hostel", "label_kr": "호스텔", "price_range": (15, 40), "color": "#DDA0DD"},
        }

        # 예약 플랫폼 설정
        self.PLATFORMS = {
            "agoda": {"name": "Agoda", "iframe_support": True, "url_pattern": "https://www.agoda.com/search?city=14690"},
            "booking": {"name": "Booking.com", "iframe_support": False, "url_pattern": "https://www.booking.com/searchresults.ko.html?dest_id=-716583"},
            "hotels": {"name": "Hotels.com", "iframe_support": True, "url_pattern": "https://kr.hotels.com/search.do?destination-id=759818"},
            "expedia": {"name": "Expedia", "iframe_support": False, "url_pattern": "https://www.expedia.co.kr/Hotel-Search?destination=Goyang"},
            "trip": {"name": "Trip.com", "iframe_support": True, "url_pattern": "https://kr.trip.com/hotels/goyang-hotel"},
            "airbnb": {"name": "Airbnb", "iframe_support": False, "url_pattern": "https://www.airbnb.co.kr/s/Goyang/homes"},
            "yanolja": {"name": "야놀자", "iframe_support": True, "url_pattern": "https://www.yanolja.com/search/고양"},
            "goodchoice": {"name": "여기어때", "iframe_support": True, "url_pattern": "https://www.goodchoice.kr/search?keyword=고양"},
        }

        # 실제 호텔 데이터 (킨텍스 주변 + 서울 주요 지역)
        self.HOTELS_DATA = self._generate_hotels_database()

        # 막차 시간 데이터 (경의중앙선, 3호선 기준)
        self.LAST_TRAINS = {
            "kintex": "23:40",
            "ilsan": "23:50",
            "hongdae": "00:10",
            "sangam": "00:05",
            "seoul_station": "00:20",
        }

    def _generate_hotels_database(self) -> List[Dict]:
        """실제 호텔명과 좌표를 기반으로 100개+ 숙소 데이터베이스 생성"""

        hotels = []

        # 1. 킨텍스/일산 지역 (40개) - 공연장 도보권
        ilsan_hotels = [
            {"name": "KINTEX by Kensington Hotel", "name_en": "KINTEX by Kensington Hotel", "lat": 37.6685, "lng": 126.7510, "type": "5star"},
            {"name": "MVL Hotel Goyang", "name_en": "MVL Hotel Goyang", "lat": 37.6560, "lng": 126.7700, "type": "5star"},
            {"name": "베스트웨스턴 프리미어 호텔 국도", "name_en": "Best Western Premier Hotel Kukdo", "lat": 37.6555, "lng": 126.7750, "type": "4star"},
            {"name": "라마다 앙코르 고양 호텔", "name_en": "Ramada Encore Goyang", "lat": 37.6580, "lng": 126.7680, "type": "4star"},
            {"name": "호텔 캐슬", "name_en": "Hotel Castle Ilsan", "lat": 37.6620, "lng": 126.7595, "type": "3star"},
            {"name": "일산 스카이 호텔", "name_en": "Ilsan Sky Hotel", "lat": 37.6590, "lng": 126.7650, "type": "3star"},
            {"name": "호텔 마레", "name_en": "Hotel Mare Ilsan", "lat": 37.6550, "lng": 126.7780, "type": "3star"},
            {"name": "일산 레지던스", "name_en": "Ilsan Residence", "lat": 37.6545, "lng": 126.7730, "type": "residence"},
            {"name": "킨텍스 스테이", "name_en": "KINTEX Stay Residence", "lat": 37.6700, "lng": 126.7480, "type": "residence"},
            {"name": "라페스타 레지던스", "name_en": "La Festa Residence", "lat": 37.6575, "lng": 126.7705, "type": "residence"},
            {"name": "웨스턴돔 레지던스", "name_en": "Western Dom Residence", "lat": 37.6630, "lng": 126.7620, "type": "residence"},
            {"name": "백석 게스트하우스", "name_en": "Baekseok Guesthouse", "lat": 37.6480, "lng": 126.7820, "type": "guesthouse"},
            {"name": "일산 아미 하우스", "name_en": "Ilsan ARMY House", "lat": 37.6535, "lng": 126.7660, "type": "guesthouse"},
            {"name": "킨텍스 코지룸", "name_en": "KINTEX Cozy Room", "lat": 37.6710, "lng": 126.7520, "type": "airbnb"},
            {"name": "일산호수공원 뷰 아파트", "name_en": "Ilsan Lake Park View Apt", "lat": 37.6580, "lng": 126.7590, "type": "airbnb"},
            {"name": "주엽역 모던 스튜디오", "name_en": "Juyeop Station Modern Studio", "lat": 37.6693, "lng": 126.7610, "type": "airbnb"},
            {"name": "대화역 프라이빗 룸", "name_en": "Daehwa Station Private Room", "lat": 37.6762, "lng": 126.7436, "type": "airbnb"},
            {"name": "마두역 원룸", "name_en": "Madu Station One Room", "lat": 37.6518, "lng": 126.7781, "type": "airbnb"},
            {"name": "호텔 아이콘 일산", "name_en": "Hotel Icon Ilsan", "lat": 37.6530, "lng": 126.7710, "type": "3star"},
            {"name": "그레이스 호텔", "name_en": "Grace Hotel Ilsan", "lat": 37.6500, "lng": 126.7820, "type": "3star"},
            {"name": "호텔 W 일산", "name_en": "Hotel W Ilsan", "lat": 37.6615, "lng": 126.7560, "type": "4star"},
            {"name": "비즈니스 호텔 일산", "name_en": "Business Hotel Ilsan", "lat": 37.6565, "lng": 126.7685, "type": "3star"},
            {"name": "일산 호스텔 808", "name_en": "Ilsan Hostel 808", "lat": 37.6490, "lng": 126.7750, "type": "hostel"},
            {"name": "백마 호스텔", "name_en": "Baekma Hostel", "lat": 37.6420, "lng": 126.7880, "type": "hostel"},
            {"name": "풍산역 게스트하우스", "name_en": "Pungsan Station Guesthouse", "lat": 37.6460, "lng": 126.7920, "type": "guesthouse"},
            {"name": "정발산 레지던스", "name_en": "Jeongbalsan Residence", "lat": 37.6610, "lng": 126.7550, "type": "residence"},
            {"name": "호텔 르네상스 일산", "name_en": "Hotel Renaissance Ilsan", "lat": 37.6640, "lng": 126.7515, "type": "4star"},
            {"name": "일산 센트럴 호텔", "name_en": "Ilsan Central Hotel", "lat": 37.6555, "lng": 126.7630, "type": "3star"},
            {"name": "호텔 아트리움", "name_en": "Hotel Atrium Ilsan", "lat": 37.6695, "lng": 126.7530, "type": "4star"},
            {"name": "일산 로프트", "name_en": "Ilsan Loft Airbnb", "lat": 37.6605, "lng": 126.7670, "type": "airbnb"},
            {"name": "화정 비즈니스 호텔", "name_en": "Hwajeong Business Hotel", "lat": 37.6340, "lng": 126.8320, "type": "3star"},
            {"name": "화정역 레지던스", "name_en": "Hwajeong Station Residence", "lat": 37.6350, "lng": 126.8290, "type": "residence"},
            {"name": "원당 호텔", "name_en": "Wondang Hotel", "lat": 37.6450, "lng": 126.8150, "type": "3star"},
            {"name": "능곡 게스트하우스", "name_en": "Neunggok Guesthouse", "lat": 37.6380, "lng": 126.8100, "type": "guesthouse"},
            {"name": "덕양 호스텔", "name_en": "Deokyang Hostel", "lat": 37.6300, "lng": 126.8250, "type": "hostel"},
            {"name": "행신 레지던스", "name_en": "Haengsin Residence", "lat": 37.6120, "lng": 126.8350, "type": "residence"},
            {"name": "탄현역 에어비앤비", "name_en": "Tanhyeon Station Airbnb", "lat": 37.6820, "lng": 126.7280, "type": "airbnb"},
            {"name": "일산 더 스테이", "name_en": "Ilsan The Stay", "lat": 37.6585, "lng": 126.7725, "type": "residence"},
            {"name": "산들마을 게스트하우스", "name_en": "Sandeul Village Guesthouse", "lat": 37.6650, "lng": 126.7640, "type": "guesthouse"},
            {"name": "호수마을 아파트", "name_en": "Lake Village Apartment", "lat": 37.6560, "lng": 126.7575, "type": "airbnb"},
        ]

        # 2. 홍대/신촌 지역 (25개) - 외국인 인기 지역
        hongdae_hotels = [
            {"name": "L7 홍대 바이 롯데", "name_en": "L7 Hongdae by Lotte", "lat": 37.5567, "lng": 126.9236, "type": "5star"},
            {"name": "라이즈 오토그래프 컬렉션", "name_en": "RYSE Autograph Collection", "lat": 37.5559, "lng": 126.9213, "type": "5star"},
            {"name": "홍대 스테이 호텔", "name_en": "Hongdae Stay Hotel", "lat": 37.5578, "lng": 126.9220, "type": "4star"},
            {"name": "마리골드 호텔 홍대", "name_en": "Marigold Hotel Hongdae", "lat": 37.5590, "lng": 126.9198, "type": "4star"},
            {"name": "호텔 리버 홍대", "name_en": "Hotel River Hongdae", "lat": 37.5549, "lng": 126.9262, "type": "3star"},
            {"name": "미스터 홍 게스트하우스", "name_en": "Mr. Hong Guesthouse", "lat": 37.5570, "lng": 126.9255, "type": "guesthouse"},
            {"name": "홍대 아미 게스트하우스", "name_en": "Hongdae ARMY Guesthouse", "lat": 37.5585, "lng": 126.9245, "type": "guesthouse"},
            {"name": "웬즈데이 게스트하우스", "name_en": "Wednesday Guesthouse", "lat": 37.5555, "lng": 126.9270, "type": "guesthouse"},
            {"name": "세이프 스테이 홍대", "name_en": "Safe Stay Hongdae", "lat": 37.5598, "lng": 126.9185, "type": "hostel"},
            {"name": "하이 홍대 호스텔", "name_en": "Hi Hongdae Hostel", "lat": 37.5540, "lng": 126.9295, "type": "hostel"},
            {"name": "홍대입구 모던 스튜디오", "name_en": "Hongdae Modern Studio", "lat": 37.5572, "lng": 126.9235, "type": "airbnb"},
            {"name": "연남동 레트로 하우스", "name_en": "Yeonnam-dong Retro House", "lat": 37.5620, "lng": 126.9255, "type": "airbnb"},
            {"name": "상수역 아트 로프트", "name_en": "Sangsu Station Art Loft", "lat": 37.5478, "lng": 126.9227, "type": "airbnb"},
            {"name": "합정역 원룸", "name_en": "Hapjeong Station One Room", "lat": 37.5498, "lng": 126.9138, "type": "airbnb"},
            {"name": "홍대 아트 레지던스", "name_en": "Hongdae Art Residence", "lat": 37.5580, "lng": 126.9200, "type": "residence"},
            {"name": "신촌 세브란스 호텔", "name_en": "Sinchon Severance Hotel", "lat": 37.5580, "lng": 126.9370, "type": "3star"},
            {"name": "신촌 그랜드 호텔", "name_en": "Sinchon Grand Hotel", "lat": 37.5597, "lng": 126.9390, "type": "4star"},
            {"name": "이대 게스트하우스", "name_en": "Ewha Guesthouse", "lat": 37.5575, "lng": 126.9455, "type": "guesthouse"},
            {"name": "신촌 호스텔 1001", "name_en": "Sinchon Hostel 1001", "lat": 37.5560, "lng": 126.9385, "type": "hostel"},
            {"name": "연세로 레지던스", "name_en": "Yonsei-ro Residence", "lat": 37.5570, "lng": 126.9410, "type": "residence"},
            {"name": "더 로컬 홍대", "name_en": "The Local Hongdae", "lat": 37.5545, "lng": 126.9245, "type": "4star"},
            {"name": "아만티 홍대", "name_en": "Amanti Hotel Hongdae", "lat": 37.5535, "lng": 126.9310, "type": "4star"},
            {"name": "홍대 포레스트 호텔", "name_en": "Hongdae Forest Hotel", "lat": 37.5610, "lng": 126.9175, "type": "3star"},
            {"name": "K-Style Hub 게스트하우스", "name_en": "K-Style Hub Guesthouse", "lat": 37.5568, "lng": 126.9228, "type": "guesthouse"},
            {"name": "퍼플 하우스 홍대", "name_en": "Purple House Hongdae", "lat": 37.5592, "lng": 126.9208, "type": "airbnb"},
        ]

        # 3. 상암/DMC 지역 (20개) - 방송국 밀집
        sangam_hotels = [
            {"name": "스탠포드 호텔 상암", "name_en": "Stanford Hotel Sangam", "lat": 37.5795, "lng": 126.8898, "type": "4star"},
            {"name": "코트야드 바이 메리어트 상암", "name_en": "Courtyard by Marriott Sangam", "lat": 37.5768, "lng": 126.8920, "type": "5star"},
            {"name": "상암 MBC 프레스센터 호텔", "name_en": "MBC Press Center Hotel", "lat": 37.5780, "lng": 126.8910, "type": "4star"},
            {"name": "DMC 비즈니스 호텔", "name_en": "DMC Business Hotel", "lat": 37.5755, "lng": 126.8950, "type": "3star"},
            {"name": "상암 레지던스 호텔", "name_en": "Sangam Residence Hotel", "lat": 37.5770, "lng": 126.8875, "type": "residence"},
            {"name": "디지털미디어시티 게스트하우스", "name_en": "DMC Guesthouse", "lat": 37.5788, "lng": 126.8930, "type": "guesthouse"},
            {"name": "월드컵경기장 호스텔", "name_en": "World Cup Stadium Hostel", "lat": 37.5682, "lng": 126.8972, "type": "hostel"},
            {"name": "상암 파크 스튜디오", "name_en": "Sangam Park Studio", "lat": 37.5765, "lng": 126.8855, "type": "airbnb"},
            {"name": "하늘공원 뷰 아파트", "name_en": "Sky Park View Apartment", "lat": 37.5720, "lng": 126.8920, "type": "airbnb"},
            {"name": "상암 MBC 앞 원룸", "name_en": "Sangam MBC Front Room", "lat": 37.5792, "lng": 126.8905, "type": "airbnb"},
            {"name": "수색역 호텔", "name_en": "Susaek Station Hotel", "lat": 37.5802, "lng": 126.8960, "type": "3star"},
            {"name": "증산역 레지던스", "name_en": "Jeungsan Station Residence", "lat": 37.5830, "lng": 126.9095, "type": "residence"},
            {"name": "응암동 게스트하우스", "name_en": "Eungam-dong Guesthouse", "lat": 37.5950, "lng": 126.9150, "type": "guesthouse"},
            {"name": "새절역 호스텔", "name_en": "Saejeol Station Hostel", "lat": 37.5880, "lng": 126.9120, "type": "hostel"},
            {"name": "상암 스카이뷰 호텔", "name_en": "Sangam Skyview Hotel", "lat": 37.5750, "lng": 126.8905, "type": "4star"},
            {"name": "DMC 타워 레지던스", "name_en": "DMC Tower Residence", "lat": 37.5775, "lng": 126.8940, "type": "residence"},
            {"name": "상암 월드컵 호텔", "name_en": "Sangam World Cup Hotel", "lat": 37.5695, "lng": 126.8985, "type": "3star"},
            {"name": "난지도 게스트하우스", "name_en": "Nanjido Guesthouse", "lat": 37.5650, "lng": 126.8850, "type": "guesthouse"},
            {"name": "마포 상암 에어비앤비", "name_en": "Mapo Sangam Airbnb", "lat": 37.5710, "lng": 126.8965, "type": "airbnb"},
            {"name": "평화의공원 스튜디오", "name_en": "Peace Park Studio", "lat": 37.5670, "lng": 126.8935, "type": "airbnb"},
        ]

        # 4. 파주/운정 지역 (15개) - 외곽 저렴한 옵션
        paju_hotels = [
            {"name": "롯데 프리미엄 아울렛 파주", "name_en": "Lotte Premium Outlet Paju", "lat": 37.7150, "lng": 126.7250, "type": "4star"},
            {"name": "운정 호텔", "name_en": "Unjeong Hotel", "lat": 37.7120, "lng": 126.7580, "type": "3star"},
            {"name": "파주 레지던스", "name_en": "Paju Residence", "lat": 37.7080, "lng": 126.7620, "type": "residence"},
            {"name": "운정역 게스트하우스", "name_en": "Unjeong Station Guesthouse", "lat": 37.7095, "lng": 126.7550, "type": "guesthouse"},
            {"name": "파주 평화 호스텔", "name_en": "Paju Peace Hostel", "lat": 37.7200, "lng": 126.7180, "type": "hostel"},
            {"name": "운정호수공원 에어비앤비", "name_en": "Unjeong Lake Park Airbnb", "lat": 37.7060, "lng": 126.7650, "type": "airbnb"},
            {"name": "야당역 원룸", "name_en": "Yadang Station One Room", "lat": 37.7250, "lng": 126.7450, "type": "airbnb"},
            {"name": "금촌역 호텔", "name_en": "Geumchon Station Hotel", "lat": 37.7550, "lng": 126.7680, "type": "3star"},
            {"name": "금촌 레지던스", "name_en": "Geumchon Residence", "lat": 37.7530, "lng": 126.7710, "type": "residence"},
            {"name": "문산 게스트하우스", "name_en": "Munsan Guesthouse", "lat": 37.8580, "lng": 126.7850, "type": "guesthouse"},
            {"name": "파주 출판도시 호텔", "name_en": "Paju Book City Hotel", "lat": 37.7350, "lng": 126.7150, "type": "4star"},
            {"name": "헤이리 예술마을 에어비앤비", "name_en": "Heyri Art Village Airbnb", "lat": 37.7450, "lng": 126.6850, "type": "airbnb"},
            {"name": "파주 프리미엄 호텔", "name_en": "Paju Premium Hotel", "lat": 37.7180, "lng": 126.7350, "type": "4star"},
            {"name": "운정 비즈니스 호텔", "name_en": "Unjeong Business Hotel", "lat": 37.7100, "lng": 126.7530, "type": "3star"},
            {"name": "파주 더 스테이", "name_en": "Paju The Stay", "lat": 37.7140, "lng": 126.7480, "type": "residence"},
        ]

        # 모든 지역 합치기
        all_hotels = []

        for hotel in ilsan_hotels:
            hotel["area"] = "Ilsan/KINTEX"
            hotel["area_kr"] = "일산/킨텍스"
            all_hotels.append(hotel)

        for hotel in hongdae_hotels:
            hotel["area"] = "Hongdae/Sinchon"
            hotel["area_kr"] = "홍대/신촌"
            all_hotels.append(hotel)

        for hotel in sangam_hotels:
            hotel["area"] = "Sangam/DMC"
            hotel["area_kr"] = "상암/DMC"
            all_hotels.append(hotel)

        for hotel in paju_hotels:
            hotel["area"] = "Paju/Unjeong"
            hotel["area_kr"] = "파주/운정"
            all_hotels.append(hotel)

        return all_hotels

    def _calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """두 좌표 간 거리 계산 (km) - Haversine 공식"""
        R = 6371  # 지구 반경 (km)

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)

        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

        return R * c

    def _calculate_walking_time(self, distance_km: float) -> int:
        """거리에 따른 도보 시간 계산 (분) - 평균 5km/h 기준"""
        return int(distance_km / 5 * 60)

    def _get_transport_tag(self, walking_time: int, distance_km: float) -> Tuple[str, str]:
        """교통 태그 생성"""
        if walking_time <= 10:
            return f"Walk {walking_time}min", f"도보 {walking_time}분"
        elif walking_time <= 20:
            return f"Walk {walking_time}min", f"도보 {walking_time}분"
        elif distance_km <= 5:
            shuttle_time = int(distance_km * 3)  # 셔틀 평균 20km/h
            return f"Shuttle {shuttle_time}min", f"셔틀 {shuttle_time}분"
        elif distance_km <= 15:
            subway_time = int(distance_km * 2.5)  # 지하철 평균 24km/h
            return f"Subway {subway_time}min", f"지하철 {subway_time}분"
        else:
            taxi_time = int(distance_km * 1.5)  # 택시 평균 40km/h
            return f"Taxi {taxi_time}min", f"택시 {taxi_time}분"

    def _generate_army_density(self, hotel_type: str, area: str) -> int:
        """아미 밀집도 생성 - 지역/타입별 가중치"""
        base = random.randint(15, 45)

        # 지역 보너스
        if "KINTEX" in area or "Ilsan" in area:
            base += random.randint(20, 40)  # 킨텍스 근처는 아미 밀집도 높음
        elif "Hongdae" in area:
            base += random.randint(15, 30)  # 홍대도 외국인 아미 많음
        elif "Sangam" in area:
            base += random.randint(10, 25)  # 방송국 근처

        # 타입 보너스
        if hotel_type == "guesthouse":
            base += random.randint(10, 20)  # 게스트하우스는 팬들끼리 모이기 좋음
        elif hotel_type == "hostel":
            base += random.randint(5, 15)

        return min(base, 98)  # 최대 98%

    def _find_nearby_bts_spots(self, lat: float, lng: float, count: int = 2) -> List[Dict]:
        """숙소 근처 BTS 성지 찾기"""
        spots_with_distance = []

        for spot in self.BTS_SPOTS:
            distance = self._calculate_distance(lat, lng, spot["lat"], spot["lng"])
            spots_with_distance.append({
                **spot,
                "distance_km": round(distance, 1),
                "travel_time_min": self._calculate_walking_time(distance) if distance < 2 else int(distance * 2.5)
            })

        # 가장 가까운 순으로 정렬
        spots_with_distance.sort(key=lambda x: x["distance_km"])

        return spots_with_distance[:count]

    def _generate_keywords(self, hotel: Dict, walking_time: int, army_density: int, nearby_spots: List) -> List[str]:
        """추천 키워드 생성 (영어/한글 혼용)"""
        keywords = []

        # 교통 관련
        if walking_time <= 10:
            keywords.append("#WalkableVenue")
        if walking_time <= 20:
            keywords.append("#NearKINTEX")

        # 아미 밀집도 관련
        if army_density >= 70:
            keywords.append("#ARMYHotspot")
            keywords.append("#팬덤밀집")
        elif army_density >= 50:
            keywords.append("#ARMYFriendly")

        # 지역 특성
        if "Hongdae" in hotel.get("area", ""):
            keywords.append("#HongdaeVibes")
            keywords.append("#NightlifeArea")
        if "Sangam" in hotel.get("area", ""):
            keywords.append("#BroadcastStations")
            keywords.append("#MusicShowAccess")

        # 타입 관련
        if hotel["type"] == "guesthouse":
            keywords.append("#MeetARMY")
            keywords.append("#CommunityStay")
        elif hotel["type"] == "5star":
            keywords.append("#LuxuryStay")
        elif hotel["type"] in ["airbnb", "residence"]:
            keywords.append("#SelfCatering")
            keywords.append("#LongStayOK")

        # 성지순례 관련
        if any(spot["distance_km"] < 3 for spot in nearby_spots):
            keywords.append("#성지순례")
            keywords.append("#BTSSpot")

        # 영어 지원 (외국인용)
        if hotel["type"] in ["5star", "4star"] or "Hongdae" in hotel.get("area", ""):
            keywords.append("#EnglishOK")

        return keywords[:5]  # 최대 5개

    def _get_safe_return_info(self, hotel: Dict, distance_km: float) -> Dict:
        """안심 귀가 정보 생성"""
        area = hotel.get("area", "")

        # 지역별 막차 시간
        if "Ilsan" in area or "KINTEX" in area:
            last_train = "23:40"
            station = "대화역 (경의중앙선)"
        elif "Hongdae" in area:
            last_train = "00:10"
            station = "홍대입구역 (2호선/경의중앙선)"
        elif "Sangam" in area:
            last_train = "00:05"
            station = "디지털미디어시티역 (6호선/경의중앙선)"
        elif "Paju" in area:
            last_train = "23:20"
            station = "운정역 (경의중앙선)"
        else:
            last_train = "00:00"
            station = "인근 지하철역"

        # 콘서트 종료 시간 기준 (보통 21:30~22:00 종료)
        concert_end = "22:00"

        return {
            "last_train_time": last_train,
            "nearest_station": station,
            "concert_end_estimate": concert_end,
            "safe_return_possible": distance_km < 15,  # 15km 이내면 막차 가능
            "recommended_transport": "지하철" if distance_km < 10 else "택시" if distance_km < 20 else "셔틀버스",
            "taxi_estimate_krw": int(distance_km * 1200 + 4800) if distance_km > 2 else 0,  # 택시비 추정
        }

    def _get_booking_info(self, hotel: Dict) -> Dict:
        """예약 플랫폼 정보 생성"""
        # 호텔 타입에 따른 플랫폼 선택
        if hotel["type"] in ["5star", "4star", "3star"]:
            platforms = ["agoda", "booking", "hotels", "expedia", "trip"]
        elif hotel["type"] == "airbnb":
            platforms = ["airbnb"]
        elif hotel["type"] in ["guesthouse", "hostel"]:
            platforms = ["agoda", "booking", "yanolja", "goodchoice"]
        else:
            platforms = ["agoda", "booking", "yanolja"]

        selected = random.choice(platforms)
        platform_info = self.PLATFORMS[selected]

        return {
            "platform": platform_info["name"],
            "booking_url": platform_info["url_pattern"],
            "iframe_support": platform_info["iframe_support"],
        }

    def generate_hotel_data(self, hotel: Dict) -> Dict:
        """개별 호텔의 완전한 데이터 생성"""

        # 거리 및 시간 계산
        distance = self._calculate_distance(
            hotel["lat"], hotel["lng"],
            self.KINTEX["lat"], self.KINTEX["lng"]
        )
        walking_time = self._calculate_walking_time(distance)

        # 가격 생성
        type_info = self.HOTEL_TYPES[hotel["type"]]
        price = random.randint(*type_info["price_range"])

        # 태그 생성
        trans_tag_en, trans_tag_kr = self._get_transport_tag(walking_time, distance)
        army_density = self._generate_army_density(hotel["type"], hotel.get("area", ""))
        nearby_spots = self._find_nearby_bts_spots(hotel["lat"], hotel["lng"])
        keywords = self._generate_keywords(hotel, walking_time, army_density, nearby_spots)

        # Safe Return 정보
        safe_return = self._get_safe_return_info(hotel, distance)

        # 예약 정보
        booking = self._get_booking_info(hotel)

        # 객실 현황 (시뮬레이션)
        rooms_left = random.randint(0, 12)

        return {
            # 기본 정보
            "id": f"hotel_{hash(hotel['name']) % 100000:05d}",
            "name": hotel["name"],
            "name_en": hotel["name_en"],
            "area": hotel.get("area", ""),
            "area_kr": hotel.get("area_kr", ""),

            # 좌표 (지도 뷰용)
            "latitude": hotel["lat"],
            "longitude": hotel["lng"],

            # 가격
            "price_usd": price,
            "price_krw": price * 1350,  # 환율 적용
            "currency": "USD",

            # 4단계 태그 시스템
            "display_tags": {
                "type": {
                    "en": type_info["label"],
                    "kr": type_info["label_kr"],
                    "color": type_info["color"]
                },
                "trans": {
                    "en": trans_tag_en,
                    "kr": trans_tag_kr,
                    "walking_time_min": walking_time,
                    "distance_km": round(distance, 1)
                },
                "density": {
                    "value": army_density,
                    "label_en": f"ARMY Density {army_density}%",
                    "label_kr": f"아미 밀집도 {army_density}%"
                },
                "keywords": keywords
            },

            # 공연장 정보
            "venue": {
                "name": self.KINTEX["name"],
                "distance_km": round(distance, 1),
                "walking_time_min": walking_time
            },

            # 안심 귀가 정보 (Safe Return Route)
            "safe_return": safe_return,

            # Army Local Guide (성지순례)
            "nearby_bts_spots": nearby_spots,

            # 예약 정보
            "booking": booking,

            # 객실 현황
            "rooms_left": rooms_left,
            "status": "예약 마감" if rooms_left == 0 else f"남은 객실 {rooms_left}개",
            "is_available": rooms_left > 0,

            # 메타데이터
            "last_update": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "d_day": "D-138",  # 공연까지 남은 일수 (설정 필요)
        }

    def generate_all_hotels(self) -> List[Dict]:
        """모든 호텔 데이터 생성"""
        all_hotels = []

        for hotel in self.HOTELS_DATA:
            hotel_data = self.generate_hotel_data(hotel)
            all_hotels.append(hotel_data)

        # 거리순으로 정렬
        all_hotels.sort(key=lambda x: x["venue"]["distance_km"])

        return all_hotels

    def save_to_json(self, hotels: List[Dict], filename: str = "korean_ota_hotels.json"):
        """JSON 파일로 저장"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(hotels, f, ensure_ascii=False, indent=2)

        print(f"✅ {len(hotels)}개 숙소 데이터가 {filename}에 저장되었습니다.")

        # 통계 출력
        areas = {}
        types = {}
        for h in hotels:
            areas[h["area"]] = areas.get(h["area"], 0) + 1
            types[h["display_tags"]["type"]["en"]] = types.get(h["display_tags"]["type"]["en"], 0) + 1

        print("\n📊 지역별 분포:")
        for area, count in areas.items():
            print(f"   - {area}: {count}개")

        print("\n🏨 타입별 분포:")
        for t, count in types.items():
            print(f"   - {t}: {count}개")


if __name__ == "__main__":
    print("🚀 ARMY Stay Hub 데이터 엔진 v2.0 시작!")
    print("=" * 50)

    engine = ARMYStayHubEngine()
    hotels = engine.generate_all_hotels()
    engine.save_to_json(hotels)

    print("\n" + "=" * 50)
    print("✨ 데이터 생성 완료! Figma Site에서 확인하세요.")
    print("🔗 https://boar-ignite-62413385.figma.site/")
