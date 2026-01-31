/**
 * ARMY Stay Hub - Integrated Final Version 💜
 */

// 1. 기초 설정 (기존 설정 유지)
const SUPABASE_URL = 'https://mjzuelvnowutvarghfbm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jAssSpSYZI02lBTKczkrZw_jvGAB48d';
const SERVICE_KEY = '209151296de1d900cecb9fae281303b95838581d82971a10aadbb3ac98e6a192';

// 2. 고양 지역 전용 데이터 (지하철 정보 포함)
const GOYANG_PRESET = [
    { title: "Sono Calm Goyang", addr1: "Ilsan · 10 min taxi", subway_line: "Line 3", subway_name: "Daehwa Stn.", price: 155, army: "98%", tag: "Best option for multiple nights" },
    { title: "Hotel Millennium Goyang", addr1: "Ilsan · 10 min taxi", subway_line: "Line 3", subway_name: "Juyeop Stn.", price: 65, army: "85%", tag: "Quiet after concerts" },
    { title: "Ramada Encore Goyang", addr1: "Ilsan · 15 min taxi", subway_line: "G-J Line", subway_name: "KINTEX Area", price: 78, army: "80%", tag: "Reliable chain stay" },
    { title: "Urban-Est Hotel Ilsan", addr1: "Ilsan · 10 min taxi", subway_line: "Line 3", subway_name: "Jeongbalsan Stn.", price: 52, army: "75%", tag: "Budget-friendly base" },
    { title: "Hotel Rich Ilsan", addr1: "Ilsan · 15 min taxi", subway_line: "G-J Line", subway_name: "Yadang Stn.", price: 48, army: "70%", tag: "Easy access to stadium" }
];

// 3. 숙소 데이터 가져오기 (기존 API 로직 + 고양 프리셋 통합)
async function fetchHotels(cityKey = 'seoul') {
    // 탭 활성화 UI 처리
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.city === cityKey);
    });

    if (cityKey === 'goyang') {
        // 고양시는 요청하신 리스트로 렌더링
        renderHotels(GOYANG_PRESET, true);
    } else {
        // 서울, 부산 등은 기존 API 활용
        const areaCodes = { 'seoul': '1', 'busan': '6', 'daegu': '4', 'gwangju': '5' };
        const code = areaCodes[cityKey] || '1';
        const url = `https://apis.data.go.kr/B551011/KorService1/searchStay1?serviceKey=${SERVICE_KEY}&numOfRows=12&pageNo=1&MobileOS=ETC&MobileApp=BTS_Hotel&_type=json&listYN=Y&arrange=O&areaCode=${code}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const items = data.response.body.items.item || [];
            renderHotels(items, false);
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        }
    }
}

// 4. 화면에 호텔 카드 그리기 (스크린샷 UI + 지하철 정보 적용)
function renderHotels(hotels, isPreset) {
    const hotelList = document.getElementById('hotel-list');
    if(!hotelList) return;
    hotelList.innerHTML = '';
    
    hotels.forEach(hotel => {
        // 데이터 정규화
        const title = hotel.title;
        const address = hotel.addr1;
        const img = hotel.firstimage || 'https://via.placeholder.com/400x300?text=ARMY+STAY';
        
        // 지하철 및 가격 정보 (프리셋 vs API 구분)
        const subInfo = hotel.subway_name ? `🚇 ${hotel.subway_line} ${hotel.subway_name}` : "📍 Near Public Transport";
        const price = hotel.price || Math.floor(Math.random() * 80 + 40);
        const armyDensity = hotel.army || (Math.floor(Math.random() * 20 + 60) + "%");
        const specialTag = hotel.tag || "Perfect for ARMY";

        const card = document.createElement('div');
        card.className = 'hotel-card';
        card.innerHTML = `
            <div class="hotel-image-container" style="position: relative; height: 200px; border-radius: 20px 20px 0 0; overflow: hidden;">
                <div class="hotel-image" style="height: 100%; background-size: cover; background-position: center; background-image: url('${img}')"></div>
                <div style="position: absolute; top: 12px; left: 12px; background: white; color: #ff4d4d; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px;">Only 1 left!</div>
                <div style="position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.7); color: white; padding: 2px 8px; border-radius: 8px; font-size: 12px;">⭐ 4.${Math.floor(Math.random() * 5 + 4)}</div>
            </div>
            <div class="hotel-info" style="padding: 18px; background: white; border-radius: 0 0 20px 20px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 800;">${title}</h3>
                <p style="margin: 5px 0; color: #7f52ff; font-size: 13px; font-weight: 600;">${subInfo}</p>
                <p style="margin: 2px 0; color: #888; font-size: 12px;">${address}</p>
                
                <div style="display: flex; gap: 5px; margin: 12px 0;">
                    <span style="background: #f3efff; color: #7f52ff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">ARMY ${armyDensity}</span>
                    <span style="background: #f1f3f5; color: #666; padding: 4px 8px; border-radius: 6px; font-size: 11px;">${specialTag}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #f1f1f1; padding-top: 15px;">
                    <div>
                        <span style="font-size: 22px; font-weight: 900;">$${price}</span>
                        <span style="font-size: 12px; color: #999;">/ night</span>
                    </div>
                    <button style="background: #7f52ff; color: white; border: none; padding: 10px 18px; border-radius: 12px; font-weight: bold; cursor: pointer;">Reserve ❯</button>
                </div>
            </div>
        `;
        hotelList.appendChild(card);
    });
}

// 5. 구글 로그인 함수 (기존 로직 유지)
async function signInWithGoogle() {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: 'https://www.armystay.com' }
        });
        if (error) throw error;
    } catch (error) {
        console.error("로그인 시도 중 에러:", error.message);
    }
}

// 초기 실행
document.addEventListener('DOMContentLoaded', () => fetchHotels('seoul'));
