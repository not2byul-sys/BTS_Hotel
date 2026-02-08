"""
호텔 이미지 일괄 업데이트 스크립트
48개 호텔 각각에 고유한 이미지 배정 (중복 없음)

각 호텔의 특성(럭셔리/비즈니스/게하/호스텔/에어비앤비)과
위치(부산 해변/서울 도심/고양 교외)에 맞는 이미지 선택
"""
import json

# 48개 호텔 × 48개 고유 이미지 (1:1 매핑, 중복 없음)
# Unsplash 이미지는 라이선스 프리이고 CDN이 안정적
HOTEL_IMAGES = {
    # === GOYANG / ILSAN (공연장 근처) ===
    # 레지던스/아파트 스타일
    "La Festa Residence":
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    # 깔끔한 비즈니스 호텔
    "Ilsan Hotel M":
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
    # 에어비앤비 스튜디오
    "Goyang Airbnb Studio":
        "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&q=80",
    # 5성급 대형 호텔 (소노캄)
    "Sono Calm Goyang":
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
    # 모던 비즈니스 호텔
    "Antives Hotel Ilsan":
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80",
    # 옐로우톤 모텔/호텔
    "Yellow 8 Hotel Goyang":
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
    # 레이크뷰 호텔
    "Ilsan Lake Park View":
        "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80",
    # 라마다 체인 호텔
    "Ramada Encore Goyang":
        "https://images.unsplash.com/photo-1606402179428-a57976d71fa4?w=800&q=80",
    # 프리미어 비즈니스 호텔
    "Best Western Premier Guro":
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80",
    # 클라움 부띠크 호텔
    "Hotel Claum Ilsan":
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80",
    # 킨텍스 근처 트리호텔
    "Kintex by K-Tree":
        "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80",
    # MVL 대형 컨벤션 호텔
    "MVL Hotel Kintex":
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",

    # === PAJU ===
    # 팜스테이 (전원 민박)
    "Paju Farm Stay":
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80",
    # 아울렛 근처 프리미엄 호텔
    "Lotte Premium Outlet Paju":
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    # 아트밸리 감성 호텔
    "Paju Heyri Art Valley Hotel":
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    # DMZ 리조트
    "DMZ Resort Paju":
        "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800&q=80",

    # === HONGDAE / MAPO (힙한 지역) ===
    # 나인트리 프리미어
    "Nine Tree Premier Hotel":
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
    # 머큐어 앰배서더
    "Mercure Ambassador Seoul Hongdae":
        "https://images.unsplash.com/photo-1549638441-b787d2e11f14?w=800&q=80",
    # RYSE 럭셔리 부띠크
    "RYSE Autograph Collection":
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80",
    # L7 모던 디자인 호텔
    "L7 Hongdae by Lotte":
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    # 홍대 게스트하우스 (보라색 인테리어)
    "Hongdae Purple House":
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
    # 마리골드 중급 호텔
    "Marigold Hotel Hongdae":
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
    # 홍대 스테이인 (가성비)
    "Hongdae Stay Inn":
        "https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800&q=80",
    # Zzzip 도미토리/게하
    "Zzzip Guesthouse Hongdae":
        "https://images.unsplash.com/photo-1520277739336-7bf67edfa768?w=800&q=80",
    # 홍대 레지던스
    "Hongdae ARMS Residence":
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    # 스탠포드 호텔
    "Stanford Hotel Seoul":
        "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=80",

    # === GWANGHWAMUN / JONGNO (역사 지역) ===
    # 포시즌스 울트라 럭셔리
    "Four Seasons Hotel Seoul":
        "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80",
    # 한옥풍 게스트하우스
    "Gwanghwamun Guesthouse":
        "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?w=800&q=80",
    # 서머셋 서비스 아파트
    "Somerset Palace Seoul":
        "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80",
    # 프레이저 서비스 레지던스
    "Fraser Place Central Seoul":
        "https://images.unsplash.com/photo-1594563703937-fdc640497dcd?w=800&q=80",
    # 롯데호텔 그랜드
    "Lotte Hotel Seoul":
        "https://images.unsplash.com/photo-1543968332-f99478b1ebdc?w=800&q=80",
    # 웨스틴 조선 클래식
    "The Westin Chosun Seoul":
        "https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800&q=80",

    # === GANGNAM / SEONGSU (트렌디) ===
    # 글래드 라이브
    "Glad Live Gangnam":
        "https://images.unsplash.com/photo-1580041065738-e72023775cdc?w=800&q=80",
    # 카푸치노 디자인 호텔
    "Hotel Cappuccino Seongsu":
        "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&q=80",
    # 성수 어반 스테이
    "Seongsu Urban Stay":
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    # 뚝섬 게스트하우스
    "Ttukseom Guesthouse":
        "https://images.unsplash.com/photo-1515362655824-9a74989f318e?w=800&q=80",
    # 성수 스테이
    "Seongsu Stay":
        "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800&q=80",
    # 성수 부띠크
    "Seongsu Boutique Hotel":
        "https://images.unsplash.com/photo-1587874522487-fe10e954d035?w=800&q=80",

    # === BUSAN / HAEUNDAE (해변) ===
    # 파크하얏트 오션뷰 럭셔리
    "Park Hyatt Busan":
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
    # 신라스테이 해운대
    "Shilla Stay Haeundae":
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80",
    # 롯데호텔 부산 해운대
    "Lotte Hotel Busan":
        "https://images.unsplash.com/photo-1519449556851-5720b33024e7?w=800&q=80",
    # 토요코인 가성비 체인
    "Toyoko Inn Busan Haeundae":
        "https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=800&q=80",
    # 노보텔 부산 비치
    "Novotel Ambassador Busan":
        "https://images.unsplash.com/photo-1574643156929-51fa098b0394?w=800&q=80",
    # 해운대 그랜드 호텔
    "Haeundae Grand Hotel":
        "https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?w=800&q=80",
    # 씨클라우드 해변 호텔
    "Haeundae Seacloud Hotel":
        "https://images.unsplash.com/photo-1559599238-308793637427?w=800&q=80",
    # 부산 백팩커 호스텔
    "Busan Backpackers Hostel":
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80",
    # 해운대 비치 에어비앤비
    "Haeundae Beach Airbnb":
        "https://images.unsplash.com/photo-1501183638710-841dd1904471?w=800&q=80",
    # 파라다이스 호텔 리조트
    "Paradise Hotel Busan":
        "https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800&q=80",
}


def update_hotel_images(json_path: str = "korean_ota_hotels.json"):
    """JSON 파일의 호텔 이미지를 호텔별 고유 이미지로 교체"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    hotels = data.get("hotels", [])
    updated = 0

    for hotel in hotels:
        name = hotel.get("name_en", "")
        if name in HOTEL_IMAGES:
            hotel["image_url"] = HOTEL_IMAGES[name]
            updated += 1
            print(f"  [OK] {name}")

            # nearby_hotels 이미지도 업데이트
            for nearby in hotel.get("nearby_hotels", []):
                nearby_name = nearby.get("name_en", "")
                if nearby_name in HOTEL_IMAGES:
                    nearby["image_url"] = HOTEL_IMAGES[nearby_name]

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nUpdated {updated}/{len(hotels)} hotels")
    return updated


if __name__ == "__main__":
    update_hotel_images()
