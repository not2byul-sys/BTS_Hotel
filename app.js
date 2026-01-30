/**
 * ARMY Stay Hub - Real Data Version
 * 인증키: 209151296de1d900cecb9fae281303b95838581d82971a10aadbb3ac98e6a192
 */

const SERVICE_KEY = '209151296de1d900cecb9fae281303b95838581d82971a10aadbb3ac98e6a192';

// 1. 화면의 요소를 가져옵니다.
const hotelList = document.getElementById('hotel-list');

// 2. 지역 코드를 설정합니다.
const areaCodes = {
    'seoul': '1',
    'goyang': '31',
    'busan': '6',
    'daegu': '4',
    'gwangju': '5'
};

// 3. 진짜 데이터를 가져오는 함수
async function fetchHotels(cityKey = 'seoul') {
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

// 4. 화면에 호텔을 그리는 함수
function renderHotels(hotels) {
    hotelList.innerHTML = ''; // 기존 내용 지우기
    
    hotels.forEach(hotel => {
        const card = document.createElement('div');
        card.className = 'hotel-card'; // 기존 style.css의 디자인을 사용합니다.
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

// 5. 탭 클릭 이벤트 연결
document.querySelectorAll('.location-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const city = e.target.textContent.toLowerCase(); // 탭 텍스트 기준
        // 'seoul', 'busan' 등 영어 텍스트가 탭에 있어야 작동합니다.
        fetchHotels(city);
    });
});

// 초기 실행
fetchHotels('seoul');
