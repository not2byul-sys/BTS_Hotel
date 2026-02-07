"""
ARMY Stay Hub - Concert Hotel Recommender Engine
Reddit 팬 니즈 분석 → Agoda 숙소 최적 매칭

BTS ARIRANG World Tour - Goyang (April 9/11/12, 2026)

파이프라인:
1. Reddit 팬 니즈 분석 (reddit_fan_analyzer.py)
2. 기존 호텔 데이터 로드 (korean_ota_hotels.json)
3. 팬 니즈 기반 스코어링 & 랭킹
4. 최적화된 추천 결과 생성
"""

import json
import math
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple

from reddit_fan_analyzer import RedditFanAnalyzer


class ConcertHotelRecommender:
    """Reddit 팬 니즈 기반 숙소 추천 엔진"""

    # 고양종합운동장 좌표
    VENUE_LAT = 37.6556
    VENUE_LNG = 126.7714

    # 주요 지하철역 (3호선 중심)
    KEY_STATIONS = [
        {"name": "Jeongbalsan", "name_kr": "정발산", "line": 3, "lat": 37.6584, "lng": 126.7697},
        {"name": "Madu", "name_kr": "마두", "line": 3, "lat": 37.6514, "lng": 126.7791},
        {"name": "Baekseok", "name_kr": "백석", "line": 3, "lat": 37.6383, "lng": 126.7883},
        {"name": "Daehwa", "name_kr": "대화", "line": 3, "lat": 37.6718, "lng": 126.7472},
        {"name": "Juyeop", "name_kr": "주엽", "line": 3, "lat": 37.6686, "lng": 126.7577},
        {"name": "Hongdae", "name_kr": "홍대입구", "line": 2, "lat": 37.5571, "lng": 126.9236},
        {"name": "Seoul Station", "name_kr": "서울역", "line": 1, "lat": 37.5547, "lng": 126.9707},
    ]

    # 지역별 안전도 점수 (0-100, 야간 기준)
    AREA_SAFETY = {
        "goyang": 75, "ilsan": 78, "hongdae": 82, "myeongdong": 85,
        "gangnam": 88, "jongno": 80, "yongsan": 78, "seoul_station": 72,
        "incheon": 70, "default": 65,
    }

    def __init__(self, hotels_json_path: str = "korean_ota_hotels.json"):
        self.hotels_json_path = hotels_json_path
        self.hotels: List[Dict] = []
        self.fan_analysis: Dict = {}
        self.matching_criteria: Dict = {}
        self.recommendations: List[Dict] = []

    def load_hotels(self) -> List[Dict]:
        """기존 호텔 데이터 로드"""
        if not os.path.exists(self.hotels_json_path):
            print(f"Hotel data not found: {self.hotels_json_path}")
            return []

        with open(self.hotels_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # JSON 구조에 따라 호텔 리스트 추출
        if isinstance(data, dict):
            self.hotels = data.get("hotels", [])
        elif isinstance(data, list):
            self.hotels = data
        else:
            self.hotels = []

        print(f"Loaded {len(self.hotels)} hotels from {self.hotels_json_path}")
        return self.hotels

    def analyze_fans(self, use_fallback: bool = True) -> Dict:
        """Reddit 팬 니즈 분석 실행"""
        analyzer = RedditFanAnalyzer()
        self.fan_analysis = analyzer.run(use_fallback=use_fallback)
        self.matching_criteria = self.fan_analysis.get("hotel_matching_criteria", {})
        return self.fan_analysis

    def load_existing_analysis(self, path: str = "reddit_fan_analysis.json") -> Dict:
        """이전에 저장된 분석 결과 로드"""
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                self.fan_analysis = json.load(f)
            self.matching_criteria = self.fan_analysis.get("hotel_matching_criteria", {})
            print(f"Loaded existing analysis from {path}")
            return self.fan_analysis
        return {}

    @staticmethod
    def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """두 좌표 간 거리 (km)"""
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlng / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def _get_hotel_coords(self, hotel: Dict) -> Tuple[float, float]:
        """호텔 좌표 추출"""
        lat = hotel.get("lat", 0) or hotel.get("coords", {}).get("lat", 0)
        lng = hotel.get("lng", 0) or hotel.get("coords", {}).get("lng", 0)

        if not lat or not lng:
            loc = hotel.get("location", {})
            if isinstance(loc, dict):
                lat = loc.get("lat", 0)
                lng = loc.get("lng", 0)

        return float(lat or 0), float(lng or 0)

    def _get_hotel_price_usd(self, hotel: Dict) -> float:
        """호텔 가격 USD 추출"""
        price = hotel.get("price", 0)
        if isinstance(price, dict):
            krw = price.get("discounted_price", 0) or price.get("original_price", 0)
            return round(krw / 1350, 2) if krw else 0
        elif isinstance(price, (int, float)):
            if price > 10000:
                return round(price / 1350, 2)
            return float(price)

        price_krw = hotel.get("price_krw", 0)
        if price_krw:
            return round(price_krw / 1350, 2)

        return 0

    def _get_hotel_name(self, hotel: Dict) -> str:
        """호텔 이름 추출"""
        return (hotel.get("hotel_name") or hotel.get("name_en") or
                hotel.get("name") or hotel.get("name_kr") or "Unknown")

    def _get_hotel_rating(self, hotel: Dict) -> float:
        """호텔 평점 추출"""
        rating = hotel.get("rating", 0)
        if isinstance(rating, dict):
            return float(rating.get("score", 0))
        return float(rating or 0)

    def _get_hotel_area(self, hotel: Dict) -> str:
        """호텔 지역 추출"""
        area_sources = [
            hotel.get("city_key", ""),
            hotel.get("city", ""),
        ]
        loc = hotel.get("location", {})
        if isinstance(loc, dict):
            area_sources.append(loc.get("area_en", ""))
            area_sources.append(loc.get("address_en", ""))

        area_sources.extend([
            hotel.get("address_en", ""),
            hotel.get("address", ""),
            hotel.get("area", ""),
        ])

        combined = " ".join(str(s) for s in area_sources if s).lower()

        if "goyang" in combined or "ilsan" in combined or "kintex" in combined:
            return "goyang"
        if "hongdae" in combined or "mapo" in combined:
            return "hongdae"
        if "myeongdong" in combined:
            return "myeongdong"
        if "gangnam" in combined:
            return "gangnam"
        if "jongno" in combined or "insadong" in combined or "gwanghwamun" in combined:
            return "jongno"
        if "yongsan" in combined:
            return "yongsan"
        if "seoul station" in combined or "서울역" in combined:
            return "seoul_station"
        if "incheon" in combined:
            return "incheon"

        return "default"

    def _get_hotel_type(self, hotel: Dict) -> str:
        """호텔 타입 추출"""
        raw_type = hotel.get("hotel_type", {})
        if isinstance(raw_type, dict):
            type_str = raw_type.get("label_en", "").lower()
        else:
            type_str = str(hotel.get("type", "")).lower()

        if "guesthouse" in type_str or "guest" in type_str:
            return "Guesthouse"
        if "hostel" in type_str or "dorm" in type_str:
            return "Hostel"
        if "airbnb" in type_str or "apartment" in type_str:
            return "Airbnb"
        if "motel" in type_str:
            return "Motel"
        return "Hotel"

    def _nearest_station(self, lat: float, lng: float) -> Dict:
        """가장 가까운 지하철역"""
        best = None
        best_dist = float("inf")

        for station in self.KEY_STATIONS:
            dist = self.haversine_distance(lat, lng, station["lat"], station["lng"])
            if dist < best_dist:
                best_dist = dist
                best = station

        return {
            "name": best["name"] if best else "Unknown",
            "name_kr": best.get("name_kr", "") if best else "",
            "line": best["line"] if best else 0,
            "distance_km": round(best_dist, 2),
            "walk_min": round(best_dist * 12),  # ~5km/h walking speed
        }

    def score_hotel(self, hotel: Dict) -> Dict:
        """
        팬 니즈 기반으로 각 호텔에 종합 점수 부여.

        Returns:
            호텔 데이터 + fan_match_score, score_breakdown 포함
        """
        weights = self.matching_criteria.get("scoring_weights", {
            "price_weight": 0.30,
            "distance_weight": 0.25,
            "rating_weight": 0.15,
            "safety_weight": 0.10,
            "english_friendly_weight": 0.08,
            "cancellation_weight": 0.07,
            "amenities_weight": 0.05,
        })

        price_range = self.matching_criteria.get("price_range_usd", {
            "min_usd": 25, "max_usd": 150, "target_usd": 70,
        })

        # --- 개별 스코어 계산 ---

        # 1. 가격 스코어 (0-100)
        price_usd = self._get_hotel_price_usd(hotel)
        target = price_range.get("target_usd", 70)
        max_price = price_range.get("max_usd", 150)

        if price_usd <= 0:
            price_score = 50  # 가격 정보 없음
        elif price_usd <= target:
            price_score = 90 + (10 * (1 - price_usd / target))  # 타겟 이하면 90-100
        elif price_usd <= max_price:
            price_score = 90 * (1 - (price_usd - target) / (max_price - target))
        else:
            # 바가지 의심 구간
            gouging_threshold = price_range.get("gouging_threshold_usd", 200)
            if price_usd > gouging_threshold:
                price_score = max(0, 20 - (price_usd - gouging_threshold) / 10)
            else:
                price_score = max(0, 30 - (price_usd - max_price) / 5)

        # 2. 거리 스코어 (0-100)
        lat, lng = self._get_hotel_coords(hotel)
        if lat and lng:
            dist_km = self.haversine_distance(lat, lng, self.VENUE_LAT, self.VENUE_LNG)
        else:
            dist_km = 20  # 좌표 없으면 먼 거리로 처리

        if dist_km <= 1:
            distance_score = 100
        elif dist_km <= 3:
            distance_score = 90
        elif dist_km <= 5:
            distance_score = 80
        elif dist_km <= 10:
            distance_score = 60
        elif dist_km <= 20:
            distance_score = 40
        else:
            distance_score = max(0, 30 - dist_km)

        # 3. 평점 스코어 (0-100)
        rating = self._get_hotel_rating(hotel)
        if rating >= 9:
            rating_score = 100
        elif rating >= 8:
            rating_score = 85
        elif rating >= 7:
            rating_score = 70
        elif rating > 0:
            rating_score = rating * 10
        else:
            rating_score = 50  # 평점 없음

        # 4. 안전도 스코어
        area = self._get_hotel_area(hotel)
        safety_score = self.AREA_SAFETY.get(area, 65)

        # 5. 영어 친화도 스코어
        english_score = 60  # 기본값
        platforms = hotel.get("platform", {})
        if isinstance(platforms, dict):
            platform_name = platforms.get("name", "").lower()
            if "agoda" in platform_name or "booking" in platform_name:
                english_score = 85  # 글로벌 플랫폼
            elif "expedia" in platform_name or "hotels.com" in platform_name:
                english_score = 85
        hotel_type = self._get_hotel_type(hotel)
        if hotel_type in ("Guesthouse", "Hostel"):
            english_score = min(english_score + 10, 95)  # 게하/호스텔은 외국인 많음

        # 6. 취소 정책 스코어
        cancel_score = 50  # 기본
        if isinstance(platforms, dict):
            if platforms.get("free_cancel"):
                cancel_score = 95

        # 7. 어메니티 스코어
        amenity_score = 60  # 기본
        rooms_left = hotel.get("rooms_left", -1)
        if isinstance(rooms_left, int) and rooms_left > 0 and rooms_left < 5:
            amenity_score += 10  # 잔여 적으면 인기있는 곳

        # --- 종합 스코어 ---
        total_score = (
            price_score * weights.get("price_weight", 0.30) +
            distance_score * weights.get("distance_weight", 0.25) +
            rating_score * weights.get("rating_weight", 0.15) +
            safety_score * weights.get("safety_weight", 0.10) +
            english_score * weights.get("english_friendly_weight", 0.08) +
            cancel_score * weights.get("cancellation_weight", 0.07) +
            amenity_score * weights.get("amenities_weight", 0.05)
        )

        # 지역 보너스 (팬 선호 지역이면 가산점)
        area_weights = self.matching_criteria.get("preferred_areas", {})
        area_mapping = {
            "goyang": "Goyang/Ilsan",
            "hongdae": "Hongdae",
            "myeongdong": "Myeongdong",
            "jongno": "Insadong/Jongno",
            "yongsan": "Yongsan",
            "seoul_station": "Seoul Station",
            "incheon": "Incheon Airport Area",
        }
        mapped_area = area_mapping.get(area, "")
        area_bonus = area_weights.get(mapped_area, 0) * 15  # 최대 ~5점 보너스
        total_score += area_bonus

        # 숙소 타입 보너스
        type_weights = self.matching_criteria.get("preferred_types", {})
        type_bonus = type_weights.get(hotel_type, 0) * 10  # 최대 ~4점 보너스
        total_score += type_bonus

        # 가격 바가지 경고 플래그
        is_price_gouging = False
        if price_usd > 0:
            gouging_threshold = price_range.get("gouging_threshold_usd", 200)
            if price_usd > gouging_threshold:
                is_price_gouging = True
                total_score *= 0.5  # 바가지 숙소는 점수 반감

        # 가까운 역 정보
        station_info = self._nearest_station(lat, lng) if lat and lng else {}

        return {
            **hotel,
            "fan_match_score": round(min(total_score, 100), 1),
            "score_breakdown": {
                "price": round(price_score, 1),
                "distance": round(distance_score, 1),
                "rating": round(rating_score, 1),
                "safety": round(safety_score, 1),
                "english_friendly": round(english_score, 1),
                "cancellation": round(cancel_score, 1),
                "amenities": round(amenity_score, 1),
            },
            "computed": {
                "price_usd": round(price_usd, 2),
                "distance_km": round(dist_km, 2) if lat and lng else None,
                "area": area,
                "hotel_type": hotel_type,
                "nearest_station": station_info,
                "is_price_gouging": is_price_gouging,
            },
        }

    def generate_recommendations(self, top_n: int = 20) -> List[Dict]:
        """전체 호텔을 스코어링하고 상위 N개 추천"""
        if not self.hotels:
            self.load_hotels()
        if not self.matching_criteria:
            self.analyze_fans(use_fallback=True)

        print(f"\nScoring {len(self.hotels)} hotels against fan needs...")

        scored = []
        for hotel in self.hotels:
            scored_hotel = self.score_hotel(hotel)
            scored.append(scored_hotel)

        # 점수 순 정렬
        scored.sort(key=lambda x: -x["fan_match_score"])

        self.recommendations = scored[:top_n]

        # 카테고리별 추천도 생성
        categorized = self._categorize_recommendations(scored)

        return {
            "generated_at": datetime.now().isoformat(),
            "concert": self.fan_analysis.get("concert", {}),
            "fan_insights_summary": {
                "top_needs": self.fan_analysis.get("need_priorities", {}),
                "budget_target": self.matching_criteria.get("price_range_usd", {}),
                "top_countries": self.fan_analysis.get("country_distribution", {}),
            },
            "top_recommendations": self.recommendations,
            "categorized": categorized,
            "total_scored": len(scored),
            "price_gouging_alert": {
                "count": sum(1 for h in scored if h.get("computed", {}).get("is_price_gouging")),
                "warning": "Some hotels have inflated prices for concert dates. Look for fan_match_score > 60 for fair-priced options.",
            },
            "fan_tips": self.fan_analysis.get("fan_tips", []),
        }

    def _categorize_recommendations(self, scored: List[Dict]) -> Dict:
        """카테고리별 추천"""
        categories = {
            "best_value": [],       # 가성비 최고
            "nearest_venue": [],    # 공연장 최근접
            "safest_return": [],    # 안전 귀환 최적
            "army_social": [],      # 아미 만날 확률 높은 곳
            "budget_friendly": [],  # 최저가
        }

        for hotel in scored:
            comp = hotel.get("computed", {})
            breakdown = hotel.get("score_breakdown", {})

            # Best Value: 종합점수 높은 순 (이미 정렬됨)
            if len(categories["best_value"]) < 5:
                categories["best_value"].append(hotel)

            # Nearest Venue
            dist = comp.get("distance_km")
            if dist is not None and dist <= 3 and len(categories["nearest_venue"]) < 5:
                categories["nearest_venue"].append(hotel)

            # Safest Return
            if breakdown.get("safety", 0) >= 75 and len(categories["safest_return"]) < 5:
                categories["safest_return"].append(hotel)

            # Army Social (게스트하우스/호스텔)
            if comp.get("hotel_type") in ("Guesthouse", "Hostel") and len(categories["army_social"]) < 5:
                categories["army_social"].append(hotel)

            # Budget Friendly
            price = comp.get("price_usd", 0)
            if 0 < price <= 50 and len(categories["budget_friendly"]) < 5:
                categories["budget_friendly"].append(hotel)

        # 카테고리별 정렬
        categories["nearest_venue"].sort(key=lambda x: x.get("computed", {}).get("distance_km", 999))
        categories["budget_friendly"].sort(key=lambda x: x.get("computed", {}).get("price_usd", 999))

        return categories

    def export_for_frontend(self, output_path: str = "concert_recommendations.json") -> str:
        """프론트엔드용 JSON 데이터 내보내기"""
        result = self.generate_recommendations(top_n=30)

        # 프론트엔드에 필요한 데이터만 추출
        frontend_data = {
            "meta": {
                "generated_at": result["generated_at"],
                "concert_name": "BTS WORLD TOUR 'ARIRANG' IN GOYANG",
                "concert_dates": ["2026-04-09", "2026-04-11", "2026-04-12"],
                "venue": "Goyang Sports Complex Main Stadium",
                "venue_coords": {"lat": self.VENUE_LAT, "lng": self.VENUE_LNG},
            },
            "fan_insights": {
                "need_priorities": self.fan_analysis.get("need_priorities", {}),
                "insights": self.fan_analysis.get("insights", []),
                "budget_target_usd": self.matching_criteria.get("price_range_usd", {}).get("target_usd", 70),
                "top_countries": list(self.fan_analysis.get("country_distribution", {}).keys())[:5],
                "fan_tips": self.fan_analysis.get("fan_tips", []),
            },
            "recommendations": [],
            "categories": {
                "best_value": {"label": "Best Value for ARMY", "label_kr": "아미를 위한 베스트 가성비", "hotels": []},
                "nearest_venue": {"label": "Closest to Venue", "label_kr": "공연장 최근접", "hotels": []},
                "safest_return": {"label": "Safest Late-Night Return", "label_kr": "안전한 야간 귀환", "hotels": []},
                "army_social": {"label": "Meet Fellow ARMY", "label_kr": "아미 친구 만나기", "hotels": []},
                "budget_friendly": {"label": "Budget ARMY Picks", "label_kr": "예산 아미 추천", "hotels": []},
            },
            "price_gouging_alert": result.get("price_gouging_alert", {}),
        }

        # 호텔 데이터를 프론트엔드용으로 변환
        def to_frontend_hotel(h):
            comp = h.get("computed", {})
            return {
                "id": h.get("id", ""),
                "name": self._get_hotel_name(h),
                "name_kr": h.get("name_kr", ""),
                "fan_match_score": h.get("fan_match_score", 0),
                "score_breakdown": h.get("score_breakdown", {}),
                "price_usd": comp.get("price_usd", 0),
                "price_krw": h.get("price_krw") or (h.get("price", {}).get("discounted_price") if isinstance(h.get("price"), dict) else None),
                "distance_km": comp.get("distance_km"),
                "area": comp.get("area", ""),
                "hotel_type": comp.get("hotel_type", ""),
                "rating": self._get_hotel_rating(h),
                "nearest_station": comp.get("nearest_station", {}),
                "is_price_gouging": comp.get("is_price_gouging", False),
                "image_url": h.get("images", [""])[0] if h.get("images") else h.get("image_url", ""),
                "booking_url": (h.get("platform", {}).get("booking_url", "") if isinstance(h.get("platform"), dict) else h.get("booking_url", "")),
                "rooms_left": h.get("rooms_left", -1),
            }

        frontend_data["recommendations"] = [to_frontend_hotel(h) for h in result["top_recommendations"]]

        for cat_key, cat_hotels in result.get("categorized", {}).items():
            if cat_key in frontend_data["categories"]:
                frontend_data["categories"][cat_key]["hotels"] = [
                    to_frontend_hotel(h) for h in cat_hotels
                ]

        # 저장
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(frontend_data, f, ensure_ascii=False, indent=2)

        print(f"\nFrontend data exported to {output_path}")
        return output_path


def main():
    """메인 실행"""
    print("=" * 60)
    print("ARMY Stay Hub - Concert Hotel Recommender")
    print("BTS ARIRANG World Tour | Goyang | April 9/11/12, 2026")
    print("=" * 60)

    recommender = ConcertHotelRecommender()

    # 1. 호텔 데이터 로드
    recommender.load_hotels()

    # 2. 팬 니즈 분석 (fallback 사용)
    recommender.analyze_fans(use_fallback=True)

    # 3. 추천 생성 & 프론트엔드 내보내기
    output = recommender.export_for_frontend()

    # 4. 결과 요약
    print("\n" + "=" * 60)
    print("RECOMMENDATION SUMMARY")
    print("=" * 60)

    recs = recommender.recommendations[:5]
    for i, hotel in enumerate(recs, 1):
        name = recommender._get_hotel_name(hotel)
        score = hotel.get("fan_match_score", 0)
        comp = hotel.get("computed", {})
        price = comp.get("price_usd", 0)
        dist = comp.get("distance_km", "?")
        station = comp.get("nearest_station", {})
        gouging = " [PRICE GOUGING]" if comp.get("is_price_gouging") else ""

        print(f"\n{i}. {name} (Fan Match: {score}/100){gouging}")
        print(f"   ${price}/night | {dist}km from venue")
        if station:
            print(f"   Nearest: {station.get('name', '')} Stn ({station.get('walk_min', '?')} min walk)")

    return recommender


if __name__ == "__main__":
    main()
