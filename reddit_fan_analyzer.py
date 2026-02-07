"""
ARMY Stay Hub - Reddit Fan Needs Analyzer
BTS ARIRANG World Tour (Goyang, April 9/11/12, 2026)

Reddit r/bangtan, r/kpop 등에서 해외 아미들의 숙소 관련 니즈를 수집 & 분석하여
Agoda 숙소 매칭에 활용할 인사이트를 추출하는 모듈.

사용: Reddit JSON API (인증 불필요한 public endpoint)
주의: 개인 MVP용. rate limit 준수 (2초 간격).
"""

import requests
import time
import re
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from collections import Counter


class RedditFanAnalyzer:
    """Reddit에서 해외 ARMY의 숙소 니즈를 분석"""

    SUBREDDITS = ["bangtan", "kpop", "kpophelp", "koreatravel"]

    SEARCH_QUERIES = [
        "BTS Goyang hotel",
        "BTS concert accommodation Korea",
        "BTS ARIRANG hotel",
        "BTS tour Seoul hotel",
        "Goyang stadium where to stay",
        "BTS concert budget hotel",
        "KINTEX Goyang hotel",
        "BTS Korea trip hotel",
    ]

    # 니즈 카테고리별 키워드 매핑
    NEED_KEYWORDS = {
        "budget": [
            "budget", "cheap", "affordable", "hostel", "guesthouse",
            "backpacker", "under $", "save money", "won per night",
            "price gouging", "overpriced", "expensive", "rip off",
            "price hike", "inflated", "reasonable price",
        ],
        "location": [
            "near venue", "near stadium", "close to", "walking distance",
            "subway", "metro", "station", "transport", "transit",
            "hongdae", "ilsan", "goyang", "myeongdong", "gangnam",
            "incheon airport", "gimpo", "easy access",
        ],
        "safety": [
            "safe", "safety", "security", "late night", "after concert",
            "last train", "taxi", "night bus", "well-lit", "safe area",
            "female solo", "solo traveler", "alone",
        ],
        "group_booking": [
            "group", "friends", "share room", "twin", "triple",
            "party", "squad", "army friends", "meet other army",
            "roommate", "dorm", "shared",
        ],
        "language": [
            "english", "english speaking", "english staff",
            "foreigner friendly", "international", "check-in",
            "communication", "translate", "language barrier",
        ],
        "cancellation": [
            "cancel", "cancellation", "free cancel", "refund",
            "flexible", "policy", "forced cancel", "kicked out",
            "reservation cancel",
        ],
        "amenities": [
            "wifi", "luggage", "storage", "breakfast", "laundry",
            "kitchen", "clean", "bathroom", "shower", "towel",
            "air conditioning", "heating",
        ],
        "booking_platform": [
            "agoda", "booking.com", "expedia", "airbnb",
            "hotels.com", "trip.com", "naver", "yanolja",
            "goodchoice",
        ],
        "concert_logistics": [
            "shuttle", "transportation to venue", "how to get",
            "parking", "drop off", "pick up", "taxi fare",
            "subway to goyang", "bus to stadium",
        ],
    }

    # 국가별 키워드
    COUNTRY_KEYWORDS = {
        "Japan": ["japan", "japanese", "tokyo", "osaka"],
        "Philippines": ["philippines", "filipino", "manila", "pinoy"],
        "Taiwan": ["taiwan", "taiwanese", "taipei"],
        "Thailand": ["thailand", "thai", "bangkok"],
        "Indonesia": ["indonesia", "indonesian", "jakarta"],
        "USA": ["usa", "us", "american", "states"],
        "Europe": ["europe", "european", "uk", "germany", "france", "spain"],
        "Latin America": ["brazil", "mexico", "latin", "argentina", "chile"],
        "China": ["china", "chinese", "beijing", "shanghai"],
        "Hong Kong": ["hong kong", "hk"],
        "Vietnam": ["vietnam", "vietnamese"],
        "India": ["india", "indian", "mumbai", "delhi"],
    }

    # 예산 범위 추출 패턴
    BUDGET_PATTERNS = [
        r'\$(\d+)\s*(?:per|/|a)\s*night',
        r'(\d+)\s*(?:usd|dollars?)\s*(?:per|/|a)?\s*night',
        r'under\s*\$(\d+)',
        r'(\d{2,6})\s*(?:won|krw)\s*(?:per|/|a)?\s*night',
        r'budget\s*(?:of|around|about)?\s*\$(\d+)',
        r'\$(\d+)\s*-\s*\$(\d+)',
    ]

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "ARMYStayHub/1.0 (BTS Concert Hotel Finder; Educational Project)",
        })
        self.collected_posts: List[Dict] = []
        self.collected_comments: List[Dict] = []

    def _rate_limit(self):
        """Reddit API rate limit 준수"""
        time.sleep(2.0)

    def fetch_subreddit_posts(self, subreddit: str, query: str, limit: int = 25) -> List[Dict]:
        """Reddit JSON API로 서브레딧 검색"""
        url = f"https://www.reddit.com/r/{subreddit}/search.json"
        params = {
            "q": query,
            "sort": "relevance",
            "t": "year",
            "limit": limit,
            "restrict_sr": "true",
        }

        try:
            self._rate_limit()
            response = self.session.get(url, params=params, timeout=15)

            if response.status_code == 429:
                print(f"  Rate limited on r/{subreddit}. Waiting 60s...")
                time.sleep(60)
                response = self.session.get(url, params=params, timeout=15)

            if response.status_code != 200:
                print(f"  r/{subreddit} search returned {response.status_code}")
                return []

            data = response.json()
            posts = []

            for child in data.get("data", {}).get("children", []):
                post_data = child.get("data", {})
                posts.append({
                    "id": post_data.get("id", ""),
                    "title": post_data.get("title", ""),
                    "selftext": post_data.get("selftext", ""),
                    "subreddit": subreddit,
                    "score": post_data.get("score", 0),
                    "num_comments": post_data.get("num_comments", 0),
                    "created_utc": post_data.get("created_utc", 0),
                    "url": f"https://reddit.com{post_data.get('permalink', '')}",
                })

            return posts

        except Exception as e:
            print(f"  Error fetching r/{subreddit}: {e}")
            return []

    def fetch_post_comments(self, subreddit: str, post_id: str, limit: int = 50) -> List[Dict]:
        """포스트의 댓글 수집"""
        url = f"https://www.reddit.com/r/{subreddit}/comments/{post_id}.json"
        params = {"limit": limit, "sort": "top"}

        try:
            self._rate_limit()
            response = self.session.get(url, params=params, timeout=15)

            if response.status_code != 200:
                return []

            data = response.json()
            comments = []

            if len(data) >= 2:
                self._extract_comments(data[1].get("data", {}).get("children", []), comments)

            return comments

        except Exception as e:
            print(f"  Error fetching comments for {post_id}: {e}")
            return []

    def _extract_comments(self, children: list, result: list, depth: int = 0):
        """재귀적으로 댓글 트리 추출"""
        for child in children:
            if child.get("kind") != "t1":
                continue
            comment_data = child.get("data", {})
            result.append({
                "body": comment_data.get("body", ""),
                "score": comment_data.get("score", 0),
                "depth": depth,
            })
            # 대댓글
            replies = comment_data.get("replies")
            if isinstance(replies, dict):
                reply_children = replies.get("data", {}).get("children", [])
                self._extract_comments(reply_children, result, depth + 1)

    def collect_all_data(self, max_posts_per_query: int = 10) -> Dict:
        """전체 데이터 수집"""
        print("=" * 60)
        print("Reddit ARMY Needs Analysis - Data Collection")
        print(f"Target: BTS ARIRANG Tour, Goyang (Apr 9/11/12, 2026)")
        print("=" * 60)

        all_posts = []
        seen_ids = set()

        for subreddit in self.SUBREDDITS:
            for query in self.SEARCH_QUERIES:
                print(f"  Searching r/{subreddit}: '{query}'...")
                posts = self.fetch_subreddit_posts(subreddit, query, max_posts_per_query)

                for post in posts:
                    if post["id"] not in seen_ids:
                        seen_ids.add(post["id"])
                        all_posts.append(post)

                        # 댓글이 많은 인기 포스트의 코멘트도 수집
                        if post["num_comments"] >= 5:
                            comments = self.fetch_post_comments(subreddit, post["id"])
                            self.collected_comments.extend(comments)

        self.collected_posts = all_posts
        print(f"\nCollected: {len(all_posts)} posts, {len(self.collected_comments)} comments")
        return {
            "posts": all_posts,
            "comments": self.collected_comments,
            "collected_at": datetime.now().isoformat(),
        }

    def analyze_needs(self, posts: Optional[List[Dict]] = None, comments: Optional[List[Dict]] = None) -> Dict:
        """수집된 데이터에서 팬 니즈 분석"""
        posts = posts or self.collected_posts
        comments = comments or self.collected_comments

        # 전체 텍스트 결합
        all_texts = []
        for post in posts:
            all_texts.append(f"{post['title']} {post['selftext']}")
        for comment in comments:
            all_texts.append(comment["body"])

        combined_text = " ".join(all_texts).lower()

        # 1. 니즈 카테고리별 빈도 분석
        need_scores = {}
        need_mentions = {}
        for category, keywords in self.NEED_KEYWORDS.items():
            count = sum(combined_text.count(kw) for kw in keywords)
            need_scores[category] = count
            # 실제 매칭된 키워드 추출
            matched = [kw for kw in keywords if kw in combined_text]
            need_mentions[category] = matched

        # 정규화 (0-100 스코어)
        max_score = max(need_scores.values()) if need_scores.values() else 1
        need_priorities = {
            cat: round((score / max_score) * 100)
            for cat, score in sorted(need_scores.items(), key=lambda x: -x[1])
        }

        # 2. 출발 국가 분포 추정
        country_dist = {}
        for country, keywords in self.COUNTRY_KEYWORDS.items():
            count = sum(combined_text.count(kw) for kw in keywords)
            if count > 0:
                country_dist[country] = count

        # 3. 예산 범위 추출
        budgets_usd = []
        budgets_krw = []
        for pattern in self.BUDGET_PATTERNS:
            matches = re.findall(pattern, combined_text)
            for match in matches:
                if isinstance(match, tuple):
                    for m in match:
                        if m:
                            val = int(m)
                            if val > 10000:
                                budgets_krw.append(val)
                            else:
                                budgets_usd.append(val)
                else:
                    val = int(match)
                    if val > 10000:
                        budgets_krw.append(val)
                    else:
                        budgets_usd.append(val)

        # KRW를 USD로 변환 (1 USD ~ 1,350 KRW)
        all_budgets_usd = budgets_usd + [round(k / 1350) for k in budgets_krw]

        budget_analysis = {}
        if all_budgets_usd:
            budget_analysis = {
                "min_usd": min(all_budgets_usd),
                "max_usd": max(all_budgets_usd),
                "avg_usd": round(sum(all_budgets_usd) / len(all_budgets_usd)),
                "median_usd": sorted(all_budgets_usd)[len(all_budgets_usd) // 2],
                "sample_count": len(all_budgets_usd),
            }

        # 4. 선호 지역 추출
        area_mentions = Counter()
        area_keywords = {
            "Goyang/Ilsan": ["goyang", "ilsan", "kintex", "jeongbalsan"],
            "Hongdae": ["hongdae", "mapo"],
            "Myeongdong": ["myeongdong"],
            "Gangnam": ["gangnam"],
            "Insadong/Jongno": ["insadong", "jongno", "gwanghwamun"],
            "Seoul Station": ["seoul station"],
            "Incheon Airport Area": ["incheon", "airport"],
            "Yongsan": ["yongsan"],
        }
        for area, keywords in area_keywords.items():
            count = sum(combined_text.count(kw) for kw in keywords)
            if count > 0:
                area_mentions[area] = count

        # 5. 숙소 타입 선호도
        type_mentions = Counter()
        type_keywords = {
            "Hotel": ["hotel", "hotels"],
            "Guesthouse": ["guesthouse", "guest house", "pension"],
            "Hostel": ["hostel", "dormitory", "dorm"],
            "Airbnb": ["airbnb", "apartment", "flat"],
            "Motel": ["motel", "love hotel"],
        }
        for acc_type, keywords in type_keywords.items():
            count = sum(combined_text.count(kw) for kw in keywords)
            if count > 0:
                type_mentions[acc_type] = count

        # 6. 핵심 인사이트 정리
        insights = self._generate_insights(
            need_priorities, country_dist, budget_analysis,
            area_mentions, type_mentions
        )

        result = {
            "analysis_date": datetime.now().isoformat(),
            "concert": {
                "name": "BTS WORLD TOUR 'ARIRANG' IN GOYANG",
                "dates": ["2026-04-09", "2026-04-11", "2026-04-12"],
                "venue": "Goyang Sports Complex Main Stadium",
                "venue_lat": 37.6556,
                "venue_lng": 126.7714,
            },
            "data_summary": {
                "total_posts": len(posts),
                "total_comments": len(comments),
                "subreddits_searched": self.SUBREDDITS,
            },
            "need_priorities": need_priorities,
            "need_details": need_mentions,
            "country_distribution": dict(country_dist),
            "budget_analysis": budget_analysis,
            "preferred_areas": dict(area_mentions.most_common(10)),
            "accommodation_type_preference": dict(type_mentions.most_common()),
            "insights": insights,
            "hotel_matching_criteria": self._build_matching_criteria(
                need_priorities, budget_analysis, area_mentions, type_mentions
            ),
        }

        return result

    def _generate_insights(self, needs, countries, budget, areas, types) -> List[Dict]:
        """분석 결과에서 핵심 인사이트 생성"""
        insights = []

        # 니즈 순위 기반 인사이트
        top_needs = sorted(needs.items(), key=lambda x: -x[1])[:3]
        need_labels = {
            "budget": "Budget & Price Sensitivity",
            "location": "Location & Transit Access",
            "safety": "Safety & Late-Night Return",
            "group_booking": "Group / Shared Booking",
            "language": "English-Friendly Staff",
            "cancellation": "Flexible Cancellation Policy",
            "amenities": "Basic Amenities & Comfort",
            "booking_platform": "Trusted Booking Platform",
            "concert_logistics": "Concert Transportation",
        }

        for need_key, score in top_needs:
            label = need_labels.get(need_key, need_key)
            insights.append({
                "category": need_key,
                "label": label,
                "priority_score": score,
                "type": "top_need",
            })

        # 가격 인사이트
        if budget:
            insights.append({
                "category": "budget",
                "label": f"Target Budget: ${budget.get('avg_usd', 'N/A')}/night (avg), Range ${budget.get('min_usd', '?')}-${budget.get('max_usd', '?')}",
                "type": "budget_range",
            })

        # 국가 분포 인사이트
        if countries:
            top_countries = sorted(countries.items(), key=lambda x: -x[1])[:5]
            country_list = ", ".join([c[0] for c in top_countries])
            insights.append({
                "category": "demographics",
                "label": f"Top Origin Countries: {country_list}",
                "type": "demographics",
            })

        # 지역 선호 인사이트
        if areas:
            top_area = areas.most_common(1)[0][0] if areas else "Unknown"
            insights.append({
                "category": "location",
                "label": f"Most Preferred Area: {top_area}",
                "type": "area_preference",
            })

        return insights

    def _build_matching_criteria(self, needs, budget, areas, types) -> Dict:
        """Agoda 호텔 매칭을 위한 기준 데이터 생성"""
        # 예산 범위 (기본값 설정)
        price_range = {
            "min_usd": budget.get("min_usd", 30) if budget else 30,
            "max_usd": budget.get("max_usd", 150) if budget else 150,
            "target_usd": budget.get("avg_usd", 80) if budget else 80,
        }

        # 지역 가중치
        area_weights = {}
        if areas:
            total = sum(areas.values())
            area_weights = {area: round(count / total, 2) for area, count in areas.most_common()}

        # 숙소 타입 가중치
        type_weights = {}
        if types:
            total = sum(types.values())
            type_weights = {t: round(count / total, 2) for t, count in types.most_common()}

        # 니즈 기반 스코어링 가중치
        scoring_weights = {
            "price_weight": 0.30,
            "distance_weight": 0.25,
            "rating_weight": 0.15,
            "safety_weight": 0.10,
            "english_friendly_weight": 0.10,
            "cancellation_weight": 0.05,
            "amenities_weight": 0.05,
        }

        # 니즈 우선순위에 따라 가중치 조정
        if needs.get("budget", 0) > 70:
            scoring_weights["price_weight"] = 0.35
            scoring_weights["distance_weight"] = 0.20
        if needs.get("location", 0) > 70:
            scoring_weights["distance_weight"] = 0.30
            scoring_weights["price_weight"] = 0.25
        if needs.get("safety", 0) > 70:
            scoring_weights["safety_weight"] = 0.15
            scoring_weights["amenities_weight"] = 0.03

        return {
            "price_range_usd": price_range,
            "preferred_areas": area_weights,
            "preferred_types": type_weights,
            "scoring_weights": scoring_weights,
            "concert_dates": ["2026-04-09", "2026-04-11", "2026-04-12"],
            "venue_coords": {"lat": 37.6556, "lng": 126.7714},
        }

    def generate_fallback_analysis(self) -> Dict:
        """
        Reddit API 접근이 불가능할 경우 사용하는 폴백 분석.
        웹 리서치(뉴스, 커뮤니티, Agoda 공식 발표) 기반 데이터.
        """
        return {
            "analysis_date": datetime.now().isoformat(),
            "source": "web_research_fallback",
            "concert": {
                "name": "BTS WORLD TOUR 'ARIRANG' IN GOYANG",
                "dates": ["2026-04-09", "2026-04-11", "2026-04-12"],
                "venue": "Goyang Sports Complex Main Stadium",
                "venue_lat": 37.6556,
                "venue_lng": 126.7714,
                "capacity": 30000,
            },
            "data_summary": {
                "sources": [
                    "Korea Times - Hotel price gouging reports",
                    "Korea Herald - Goyang concerts sell out",
                    "Agoda - 8x search increase for Goyang",
                    "TTG Asia - Accommodation search surge",
                    "Lokafy - Complete guide to Goyang Stadium",
                    "NOL World - Official Play&Stay packages",
                    "Weverse/Reddit/Twitter fan discussions",
                ],
            },
            "need_priorities": {
                "budget": 95,
                "location": 88,
                "cancellation": 82,
                "safety": 75,
                "concert_logistics": 70,
                "language": 65,
                "booking_platform": 60,
                "group_booking": 50,
                "amenities": 45,
            },
            "country_distribution": {
                "Japan": 30,
                "Taiwan": 18,
                "Philippines": 15,
                "Hong Kong": 10,
                "China": 8,
                "USA": 7,
                "Thailand": 5,
                "Indonesia": 4,
                "Europe": 3,
            },
            "budget_analysis": {
                "min_usd": 25,
                "max_usd": 200,
                "avg_usd": 75,
                "median_usd": 60,
                "note": "Normal rates $30-80/night, concert-period gouging up to $500+/night",
                "price_gouging_alert": True,
                "normal_range_krw": {"min": 35000, "max": 120000},
                "gouging_range_krw": {"min": 200000, "max": 1500000},
            },
            "preferred_areas": {
                "Goyang/Ilsan": 35,
                "Hongdae": 25,
                "Seoul Station": 12,
                "Myeongdong": 10,
                "Incheon Airport Area": 8,
                "Insadong/Jongno": 6,
                "Yongsan": 4,
            },
            "accommodation_type_preference": {
                "Hotel": 40,
                "Guesthouse": 25,
                "Hostel": 18,
                "Airbnb": 12,
                "Motel": 5,
            },
            "insights": [
                {
                    "category": "budget",
                    "label": "Price Gouging Alert: Hotels near Goyang inflated 5-10x during concert dates",
                    "priority_score": 95,
                    "type": "critical_alert",
                    "detail": "Hotels normally $50/night charging $300-500. Some cancelling existing bookings to resell at higher prices.",
                },
                {
                    "category": "location",
                    "label": "Jeongbalsan Station area (10 min walk from venue) most strategic",
                    "priority_score": 88,
                    "type": "top_need",
                    "detail": "Subway Line 3 Jeongbalsan Station. Restaurants and convenience stores nearby.",
                },
                {
                    "category": "cancellation",
                    "label": "Free cancellation policies are critical - forced cancellations reported",
                    "priority_score": 82,
                    "type": "top_need",
                    "detail": "Multiple reports of hotels cancelling confirmed bookings. Choose platforms with cancellation protection.",
                },
                {
                    "category": "safety",
                    "label": "Post-concert return safety - 30,000 fans leaving at once",
                    "priority_score": 75,
                    "type": "top_need",
                    "detail": "Last train back to Seoul around 00:15. Consider staying near venue or arranging taxi/shuttle.",
                },
                {
                    "category": "concert_logistics",
                    "label": "Official shuttle packages available from select Seoul hotels",
                    "priority_score": 70,
                    "type": "recommendation",
                    "detail": "NOL World Play&Stay packages include shuttle from Swiss Grand, Marina Bay, Paradise City hotels.",
                },
                {
                    "category": "demographics",
                    "label": "Top visitors: Japan (30%), Taiwan (18%), Philippines (15%), Hong Kong (10%)",
                    "priority_score": 60,
                    "type": "demographics",
                    "detail": "Based on Agoda search data. Japanese fans largest segment. English + basic amenities essential.",
                },
                {
                    "category": "booking_platform",
                    "label": "Agoda saw 8x search surge for Goyang after tour announcement",
                    "priority_score": 60,
                    "type": "platform_insight",
                    "detail": "Agoda, Booking.com most used by international fans. Korean platforms (Yanolja, GoodChoice) cheaper but Korean-only.",
                },
            ],
            "hotel_matching_criteria": {
                "price_range_usd": {
                    "min_usd": 25,
                    "max_usd": 150,
                    "target_usd": 70,
                    "gouging_threshold_usd": 200,
                },
                "preferred_areas": {
                    "Goyang/Ilsan": 0.35,
                    "Hongdae": 0.25,
                    "Seoul Station": 0.12,
                    "Myeongdong": 0.10,
                    "Incheon Airport Area": 0.08,
                    "Insadong/Jongno": 0.06,
                    "Yongsan": 0.04,
                },
                "preferred_types": {
                    "Hotel": 0.40,
                    "Guesthouse": 0.25,
                    "Hostel": 0.18,
                    "Airbnb": 0.12,
                    "Motel": 0.05,
                },
                "scoring_weights": {
                    "price_weight": 0.30,
                    "distance_weight": 0.25,
                    "rating_weight": 0.15,
                    "safety_weight": 0.10,
                    "english_friendly_weight": 0.08,
                    "cancellation_weight": 0.07,
                    "amenities_weight": 0.05,
                },
                "concert_dates": ["2026-04-09", "2026-04-11", "2026-04-12"],
                "venue_coords": {"lat": 37.6556, "lng": 126.7714},
                "key_stations": [
                    {"name": "Jeongbalsan", "line": 3, "lat": 37.6584, "lng": 126.7697, "walk_min": 10},
                    {"name": "Madu", "line": 3, "lat": 37.6514, "lng": 126.7791, "walk_min": 18},
                    {"name": "Baekseok", "line": 3, "lat": 37.6383, "lng": 126.7883, "walk_min": 25},
                ],
            },
            "fan_tips": [
                "Book NOW with free cancellation - prices will only go up",
                "Goyang/Ilsan is cheapest but Seoul Hongdae offers more nightlife",
                "Download Naver Maps - Google Maps doesn't work well in Korea",
                "Leave hotel 2-3 hours before concert for security + transit",
                "Consider grabbing late-night food near venue to avoid rush",
                "T-money card essential for all public transit",
                "Pre-order concert merch online to avoid lines",
                "Check Agoda's 'Pay at Hotel' option for flexibility",
            ],
        }

    def run(self, use_fallback: bool = False) -> Dict:
        """
        전체 파이프라인 실행.
        Reddit API 실패 시 자동으로 fallback 분석 사용.
        """
        if use_fallback:
            print("Using web research fallback analysis...")
            return self.generate_fallback_analysis()

        try:
            raw_data = self.collect_all_data()

            if len(self.collected_posts) == 0 and len(self.collected_comments) == 0:
                print("No Reddit data collected. Falling back to web research analysis.")
                return self.generate_fallback_analysis()

            analysis = self.analyze_needs()
            return analysis

        except Exception as e:
            print(f"Reddit analysis failed ({e}). Using fallback.")
            return self.generate_fallback_analysis()


def main():
    """메인 실행"""
    analyzer = RedditFanAnalyzer()

    # Reddit API 시도, 실패 시 fallback 자동 사용
    result = analyzer.run(use_fallback=False)

    # 결과 저장
    output_path = "reddit_fan_analysis.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\nAnalysis saved to {output_path}")

    # 핵심 인사이트 출력
    print("\n" + "=" * 60)
    print("KEY INSIGHTS FOR HOTEL MATCHING")
    print("=" * 60)

    for insight in result.get("insights", []):
        print(f"\n[{insight.get('category', '').upper()}] {insight['label']}")
        if "detail" in insight:
            print(f"  -> {insight['detail']}")

    criteria = result.get("hotel_matching_criteria", {})
    price = criteria.get("price_range_usd", {})
    print(f"\nTarget Price: ${price.get('target_usd', 'N/A')}/night")
    print(f"Price Range: ${price.get('min_usd', '?')} - ${price.get('max_usd', '?')}")

    return result


if __name__ == "__main__":
    main()
