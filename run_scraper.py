"""
BTS Hotel Finder - 확장판 (홍대, 상암, 파주 포함)
스테이폴리오 제외 / 레딧 추천 지역 반영
"""

import time
import random
import requests
from datetime import datetime
from typing import List, Dict
import json

class KoreanOTA_Scraper:
    def __init__(self):
        # 대상 지역 확장: 고양 + 레딧 아미 추천 지역
        self.target_areas = ["Goyang", "Ilsan", "Paju", "Hongdae", "Sangam"]
        
        # 15개 플랫폼 설정 (스테이폴리오 제외)
        self.platforms = {
            'naver': {'name': '네이버 호텔', 'priority': 1, 'cooldown': 180, 'last_request': 0},
            'goodchoice': {'name': '여기어때', 'priority': 1, 'cooldown': 240, 'last_request': 0},
            'yanolja': {'name': '야놀자', 'priority': 1, 'cooldown': 240, 'last_request': 0},
            'coupang_travel': {'name': '쿠팡 트래블', 'priority': 2, 'cooldown': 300, 'last_request': 0},
            'interpark_tour': {'name': '인터파크 투어', 'priority': 2, 'cooldown': 300, 'last_request': 0},
            'freeple': {'name': '프리플', 'priority': 3, 'cooldown': 360, 'last_request': 0},
            'myrealtrip': {'name': '마이리얼트립', 'priority': 2, 'cooldown': 300, 'last_request': 0},
            'airbnb': {'name': '에어비앤비', 'priority': 1, 'cooldown': 240, 'last_request': 0},
            'hotelscombined_kr': {'name': '호텔스컴바인', 'priority': 2, 'cooldown': 300, 'last_request': 0},
            # 스테이폴리오(stayfolio)가 리스트에서 삭제되었습니다.
            'booking': {'name': 'Booking.com', 'priority': 1, 'cooldown': 300, 'last_request': 0},
            'agoda': {'name': 'Agoda', 'priority': 2, 'cooldown': 300, 'last_request': 0},
            'expedia': {'name': 'Expedia', 'priority': 2, 'cooldown': 300, 'last_request': 0},
            'trip': {'name': 'Trip.com', 'priority': 2, 'cooldown': 300, 'last_request': 0},
            'hotels': {'name': 'Hotels.com', 'priority': 2, 'cooldown': 300, 'last_request': 0},
            'kayak': {'name': 'Kayak', 'priority': 2, 'cooldown': 300, 'last_request': 0}
        }
        
        self.stats = {'total_requests': 0, 'total_hotels': 0}

    def scrape_all_smart(self):
        all_hotels = []
        print(f"🚀 {', '.join(self.target_areas)} 지역 아미 숙소 수집 시작!")
        
        for area in self.target_areas:
            for p_key in self.platforms.keys():
                # 실제 스크래핑 로직 시뮬레이션 (지역별로 데이터 생성)
                hotel_name = f"[{area}] {self.platforms[p_key]['name']} 추천 숙소"
                price = random.randint(35, 250)
                
                all_hotels.append({
                    'name': hotel_name,
                    'price': price,
                    'currency': 'USD',
                    'source': p_key,
                    'location': area,
                    'available': True,
                    'last_update': datetime.now().strftime('%Y-%m-%d %H:%M')
                })
                self.stats['total_hotels'] += 1
        
        return all_hotels

    def save_data(self, hotels):
        output_file = 'korean_ota_hotels.json'
        # 가격 낮은 순으로 정렬해서 저장
        hotels.sort(key=lambda x: x['price'])
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(hotels, f, ensure_ascii=False, indent=2)
        print(f"\n💾 {len(hotels)}개 데이터가 {output_file}에 저장되었습니다.")

if __name__ == "__main__":
    scraper = KoreanOTA_Scraper()
    data = scraper.scrape_all_smart()
    scraper.save_data(data)
    print("\n✨ 모든 지역 업데이트 완료!")