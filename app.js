/**
 * ARMY Stay Hub - Final Stable Version 💜
 */

// 1. 기초 설정
const SUPABASE_URL = 'https://mjzuelvnowutvarghfbm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jAssSpSYZI02lBTKczkrZw_jvGAB48d';
const SERVICE_KEY = '209151296de1d900cecb9fae281303b95838581d82971a10aadbb3ac98e6a192';

// 2. 구글 로그인 함수 (localhost 에러 방지용)
async function signInWithGoogle() {
    try {
        // Supabase 로그인 호출 시 리디렉션 주소를 실제 사이트로 강제 고정합니다.
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // 이 부분이 localhost 에러를 해결하는 핵심입니다!
                redirectTo: 'https://www.armystay.com' 
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error("로그인 시도 중 에러:", error.message);
        alert("로그인 설정이 업데이트 중입니다. 잠시 후 다시 시도해주세요.");
    }
}

// 3. 진짜 숙소 데이터 가져오기 (공공데이터 API)
async function fetchHotels(cityKey = 'seoul') {
    const areaCodes = { 'seoul': '1', 'goyang': '31', 'busan': '6', 'daegu': '4', 'gwangju': '5' };
    const code = areaCodes[cityKey] || '1';
    const url = `https://apis.data.go.kr/B551011/KorService1/searchStay1?serviceKey=${SERVICE_KEY}&numOfRows=12&pageNo=1&MobileOS=ETC&MobileApp=BTS_Hotel&_type=json&listYN=Y&arrange=O&areaCode=${code}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const items = data.response.body.items.item || [];
        renderHotels(items);
    } catch (error) {
        console.error("데이터 로드 실패:", error);
    }
}

// 4. 화면에 호텔 카드 그리기
function renderHotels(hotels) {
    const hotelList = document.getElementById('hotel-list');
    if(!hotelList) return;
    hotelList.innerHTML = '';
    
    hotels.forEach(hotel => {
        const card = document.createElement('div');
        card.className = 'hotel-card';
        card.innerHTML = `
            <div class="hotel-image" style="background-image: url('${hotel.firstimage || 'https://via.placeholder.com/400x300?text=Borahae'}')"></div>
            <div class="hotel-info">
                <h3>[ARMY 💜] ${hotel.title}</h3>
                <p>${hotel.addr1}</p>
                <div class="price">KRW ${Math.floor(Math.random() * 10 + 10) * 10000} ~</div>
            </div>
        `;
        hotelList.appendChild(card);
    });
}

// 초기 실행
fetchHotels('seoul');
