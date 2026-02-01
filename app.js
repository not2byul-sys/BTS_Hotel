/**
 * ARMY Stay Hub - Stable Version (fixed)
 */

// 1) 기본 설정 (공개 가능한 것만)
const SUPABASE_URL = "https://mjzuelvnowutvarghfbm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jAssSpSYZI02lBTKczkrZw_jvGAB48d";

// ✅ 절대 프론트에 service role key 두지 마세요.
// const SUPABASE_SERVICE_ROLE_KEY = "..."; // ❌ 금지

// 2) Supabase 클라이언트 생성
// index.html에서 <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> 로드했으니
// 전역에 window.supabase 가 있습니다.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3) UI 업데이트
function setAuthUI(session) {
  const loginBtn = document.getElementById("login-btn");
  const userInfo = document.getElementById("user-info");
  if (!loginBtn || !userInfo) return;

  if (session?.user) {
    loginBtn.style.display = "none";
    const email = session.user.email || "Signed in";
    userInfo.textContent = email;
    userInfo.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    userInfo.textContent = "";
    userInfo.style.display = "none";
  }
}

// 4) 로그인
async function signInWithGoogle() {
  try {
    console.log("🔐 signInWithGoogle clicked");

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        // ✅ 현재 접속 도메인으로 자동 설정 (Vercel/armystay 둘 다 대응)
        redirectTo: window.location.origin
      }
    });

    if (error) throw error;
  } catch (err) {
    console.error("로그인 에러:", err);
    alert("로그인 중 문제가 발생했어요. 콘솔을 확인해주세요.");
  }
}

// 5) 초기 바인딩/세션 복원
async function initAuth() {
  console.log("🔥 app.js loaded");

  // 버튼 클릭 연결
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", signInWithGoogle);
  } else {
    console.warn("login-btn not found");
  }

  // 최초 세션 반영
  const { data } = await supabaseClient.auth.getSession();
  setAuthUI(data.session);

  // 상태 변화 구독 (로그인/로그아웃/토큰갱신)
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    console.log("🔁 auth state changed:", _event);
    setAuthUI(session);
  });
}

// 6) 호텔 데이터 (기존 fetchHotels 유지)
// ⚠️ 여기 SERVICE_KEY가 공공데이터 키라면 노출 가능하지만,
// 가능하면 호출량 제한/도메인 제한 설정 권장.
const SERVICE_KEY = "YOUR_PUBLIC_DATA_API_KEY"; // <- 공공데이터 키만 넣기

async function fetchHotels(cityKey = "seoul") {
  const areaCodes = { seoul: "1", goyang: "31", busan: "6", daegu: "4", gwangju: "5" };
  const code = areaCodes[cityKey] || "1";
  const url = `https://apis.data.go.kr/B551011/KorService1/searchStay1?serviceKey=${SERVICE_KEY}&numOfRows=12&pageNo=1&MobileOS=ETC&MobileApp=BTS_Hotel&_type=json&listYN=Y&arrange=O&areaCode=${code}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const items = data?.response?.body?.items?.item || [];
    renderHotels(items);
  } catch (error) {
    console.error("데이터 로드 실패:", error);
  }
}

function renderHotels(hotels) {
  const hotelList = document.getElementById("hotel-list");
  if (!hotelList) return;
  hotelList.innerHTML = "";

  hotels.forEach((hotel) => {
    const card = document.createElement("div");
    card.className = "hotel-card";
    card.innerHTML = `
      <div class="hotel-image" style="background-image:url('${hotel.firstimage || "https://via.placeholder.com/400x300?text=Borahae"}')"></div>
      <div class="hotel-info">
        <h3>[ARMY 💜] ${hotel.title}</h3>
        <p>${hotel.addr1 || ""}</p>
        <div class="price">KRW ${Math.floor(Math.random() * 10 + 10) * 10000} ~</div>
      </div>
    `;
    hotelList.appendChild(card);
  });
}

// DOM 로드 후 실행
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  fetchHotels("seoul");
});
