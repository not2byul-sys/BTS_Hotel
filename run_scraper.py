import json
import random

# 1. 기준 좌표 설정 (KINTEX)
VENUE_COORDS = {"lat": 37.6694, "lng": 126.7456}

def generate_hotel_data(count=100):
    hotels = []
    types = ["5-Star Hotel", "4-Star Hotel", "Business Hotel", "Guesthouse", "Residence"]
    platforms = ["AGODA", "Booking.com", "Yanolja"]
    
    for i in range(1, count + 1):
        # 거리 및 좌표 랜덤 생성 (킨텍스 근처)
        lat = VENUE_COORDS["lat"] + random.uniform(-0.02, 0.02)
        lng = VENUE_COORDS["lng"] + random.uniform(-0.02, 0.02)
        dist = round(random.uniform(0.5, 5.0), 1)
        
        hotel = {
            "id": f"army_stay_{i:03d}",
            "venue": {
                "name_en": "KINTEX",
                "distance_km": dist
            },
            "name_en": f"Stay Venue {i} near KINTEX",
            "address_en": f"{random.randint(10, 500)}, KINTEX-ro, Ilsanseo-gu, Goyang",
            "latitude": lat,
            "longitude": lng,
            "price_usd": random.randint(45, 350),
            "rating": round(random.uniform(4.0, 5.0), 1),
            "image_url": f"https://images.unsplash.com/photo-{random.randint(1500000, 1600000)}?auto=format&fit=crop&w=800&q=80",
            "status_en": random.choice(["Available", "6 rooms left", "Likely to sell out"]),
            "booking": {
                "platform": random.choice(platforms),
                "booking_url": "https://www.agoda.com/partners/link?id=12345",
                "iframe_support": False
            },
            "display_tags": {
                "type": {"en": random.choice(types)},
                "trans": {"en": f"Walk {int(dist*12)}min"},
                "density": {"label_en": f"ARMY Density {random.randint(40, 95)}%"},
                "keywords": ["#ARMYHotspot", "#SafePath", "#EnglishSpeaking"]
            },
            "safe_return": {
                "route_summary": "KINTEX → Main Road → Stay",
                "line_color": "#EF7C1C",
                "last_train_time": f"{random.randint(23, 24)}:{random.choice(['10', '30', '45'])}",
                "walk_from_station_min": random.randint(5, 20)
            },
            "nearby_bts_spots": [
                {
                    "type": "cafe",
                    "name_en": "Purple Coffee",
                    "spot_tag": "BTS Favorite Spot",
                    "description_en": "A cafe visited by RM during his holiday.",
                    "travel_time_min": "10min"
                },
                {
                    "type": "restaurant",
                    "name_en": "Bangtan Sikdang",
                    "spot_tag": "Trainee Days Memory",
                    "description_en": "The place where members had dinner often.",
                    "travel_time_min": "25min"
                }
            ]
        }
        hotels.append(hotel)
    
    return hotels

# JSON 파일로 저장
with open('korean_ota_hotels.json', 'w', encoding='utf-8') as f:
    json.dump(generate_hotel_data(), f, indent=4, ensure_all_ascii=False)

print("✅ 100개의 숙소 데이터가 명세서에 맞춰 생성되었습니다.")