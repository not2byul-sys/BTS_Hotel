# ARMY Stay Hub - Project Architecture

> BTS 콘서트 숙박 실시간 검색 및 알림 서비스
> Real-time hotel search and notification service for BTS concerts

---

## Table of Contents / 목차

- [Overview / 개요](#overview--개요)
- [Infrastructure / 인프라](#infrastructure--인프라)
- [Project Structure / 프로젝트 구조](#프로젝트-구조)
- [Technology Stack / 기술 스택](#기술-스택)
- [Core Components / 핵심 컴포넌트](#핵심-컴포넌트)
- [Data Flow / 데이터 플로우](#애플리케이션-흐름)
- [Automation / 자동화 설정](#자동화-설정)

---

## Overview / 개요

**ARMY Stay Hub** is a web-based hotel booking platform designed for BTS fans (ARMY) attending Korean concerts. The application provides real-time hotel availability tracking, price comparison across multiple Korean OTAs (Online Travel Agencies), and multi-channel notifications.

**Primary Target:** June 2026 Goyang Stadium concert (고양 스타디움)

ARMY Stay Hub는 BTS 팬(ARMY)들이 한국 콘서트 기간 동안 숙소를 쉽게 찾고 예약할 수 있도록 돕는 웹 서비스입니다. 2026년 6월 고양 스타디움 콘서트를 주요 타겟으로 하며, 다양한 한국 OTA(Online Travel Agency) 플랫폼에서 호텔 정보를 수집하고 실시간 재고 변동 알림을 제공합니다.

---

## Infrastructure / 인프라

### Supabase Configuration

| Setting | Value |
|---------|-------|
| **Project Name** | ARMY STAY |
| **Project ID** | `mjzuelvnowutvarghfbm` |
| **Region** | (Supabase default) |

### URL Configuration

| Type | URL |
|------|-----|
| **Site URL** | `https://www.armystay.com/` |
| **Production Domain** | `https://www.armystay.com/` |
| **Vercel Preview** | `https://bts-hotel-5zlx.vercel.app/` |

### Authentication Redirect URLs

The following redirect URLs are configured for OAuth authentication:

```
https://www.armystay.com/
https://www.armystay.com/**
https://bts-hotel-5zlx.vercel.app/**
https://bts-hotel-5zlx.vercel.app
https://armystay.com/**
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Production Environment                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐    ┌─────────────────┐                   │
│   │   Custom Domain │    │  Vercel Preview │                   │
│   │ armystay.com    │    │ bts-hotel-5zlx  │                   │
│   │ www.armystay.com│    │ .vercel.app     │                   │
│   └────────┬────────┘    └────────┬────────┘                   │
│            │                      │                             │
│            └──────────┬───────────┘                             │
│                       ↓                                         │
│            ┌─────────────────────┐                              │
│            │   Vercel Hosting    │                              │
│            │   (Static Files)    │                              │
│            │  - index.html       │                              │
│            │  - app.js           │                              │
│            │  - style.css        │                              │
│            │  - *.json           │                              │
│            └─────────┬───────────┘                              │
│                      │                                          │
│                      ↓                                          │
│            ┌─────────────────────┐                              │
│            │      Supabase       │                              │
│            │   (PostgreSQL)      │                              │
│            │  - Authentication   │                              │
│            │  - Notifications DB │                              │
│            │  - Google OAuth     │                              │
│            └─────────────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Configuration

#### Frontend (Supabase Client)
```javascript
// Required environment variables
SUPABASE_URL = "https://mjzuelvnowutvarghfbm.supabase.co"
SUPABASE_ANON_KEY = "<your-anon-key>"
```

#### Backend (Notification Services)
```bash
# GitHub Secrets / Environment Variables
DISCORD_WEBHOOK_URL=<discord-webhook>
TELEGRAM_BOT_TOKEN=<telegram-bot-token>
TELEGRAM_CHAT_ID=<telegram-chat-id>
SLACK_WEBHOOK_URL=<slack-webhook>
```

---

---

## Project Structure / 프로젝트 구조

```
BTS_Hotel/
├── Frontend (웹 UI)
│   ├── index.html              # Main web interface (mobile-optimized)
│   ├── app.js                  # Frontend logic (Supabase integration)
│   └── style.css               # Stylesheet (mobile-first design)
│
├── Backend (데이터 수집)
│   ├── korean_ota_scraper.py   # Multi-platform OTA scraper (1,339 lines)
│   ├── agoda_scraper.py        # Agoda-specific scraper (349 lines)
│   ├── availability_tracker.py # Inventory monitoring & alerts (359 lines)
│   ├── run_scraper.py          # Data engine v5.0 - main orchestrator (929 lines)
│   └── app.py                  # Streamlit dashboard
│
├── Data (JSON 데이터)
│   ├── korean_ota_hotels.json         # Main hotel dataset (90 hotels)
│   ├── concert_hotels_sample.json     # Sample data (Seoul/Goyang)
│   ├── availability_state.json        # Current inventory state
│   └── notification_log.json          # Notification delivery log
│
├── Database
│   └── supabase_setup.sql      # PostgreSQL schema for Supabase
│
├── Automation (자동화)
│   ├── auto_scrape.sh          # MacBook crontab scraper script
│   ├── auto_update.sh          # Auto-update and git sync script
│   └── .github/workflows/
│       ├── main.yml            # Manual data update workflow
│       └── scrape.yml          # Auto-scraping (disabled)
│
└── Configuration
    ├── requirements.txt        # Python dependencies
    ├── .gitignore              # Git ignore patterns
    └── ARCHITECTURE.md         # This documentation file
```

### Codebase Statistics

| Metric | Value |
|--------|-------|
| Total Lines of Code | ~18,600 |
| Python Backend | ~3,000 lines |
| Frontend (HTML+JS+CSS) | ~611 lines |
| JSON Data | ~15,000 lines |
| Hotels Supported | 90 |
| OTA Platforms | 5 |
| Locations | 6 |
| Notification Channels | 3 |

---

## 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| HTML5 | 웹 인터페이스 구조 |
| CSS3 | 모바일 우선 반응형 스타일링 |
| JavaScript (ES6) | 프론트엔드 로직 |
| Supabase Client | 인증 및 데이터베이스 연동 |
| Google OAuth | 사용자 인증 |

### Backend
| 기술 | 용도 |
|------|------|
| Python 3.11 | 백엔드 언어 |
| Streamlit | 관리자 대시보드 |
| Pandas | 데이터 처리 |
| Requests | HTTP 요청 |
| BeautifulSoup4 | HTML 파싱 |

### Database & Services
| 기술 | 용도 |
|------|------|
| Supabase (PostgreSQL) | 실시간 DB, 인증 |
| Row-Level Security | 데이터 접근 제어 |

### Automation & CI/CD
| 기술 | 용도 |
|------|------|
| GitHub Actions | 워크플로우 자동화 |
| Shell Scripts | 로컬 crontab 스케줄링 |

---

## 핵심 컴포넌트

### 1. 프론트엔드

#### index.html
메인 웹 인터페이스로, 430px 너비의 모바일 최적화 디자인을 사용합니다.

**주요 기능:**
- 날짜 범위 선택기 (콘서트 일정)
- 지역 탭 (전체, 고양, 서울, 부산, 파주)
- 필터 탭 (전체, 공연장 근처, 최저가)
- 호텔 목록 표시
- 알림 구독 모달 (이메일, Discord, Telegram)

#### app.js
Supabase와 연동되는 프론트엔드 로직을 담당합니다.

**주요 기능:**
- Supabase 초기화 및 Google OAuth 로그인
- 호텔 데이터 페칭 (Korea Tourism API)
- 호텔 카드 렌더링
- 알림 구독 처리

#### style.css
모바일 우선 반응형 디자인을 제공합니다.

---

### 2. 백엔드

#### korean_ota_scraper.py (52.8KB)
멀티 플랫폼 OTA 스크래퍼의 핵심 모듈입니다.

**지원 플랫폼:**
- Agoda
- Naver Hotels
- GoodChoice
- Yanolja
- Coupang Travel

**지원 도시 (6개):**
| 도시 | 설명 |
|------|------|
| Goyang | 고양 스타디움 주변 |
| Hongdae | 홍대 지역 |
| Seongsu | 성수동 지역 |
| Gwanghwamun | 광화문 지역 |
| Busan | 부산 지역 |
| Paju | 파주 지역 |

#### agoda_scraper.py (13.8KB)
Agoda 전용 스크래퍼로 호텔 상세 정보를 추출합니다.

**추출 정보:**
- 호텔명, 주소
- 가격, 잔여 객실
- 이미지 URL

#### run_scraper.py (52.6KB)
데이터 엔진 v5.0 - 메인 오케스트레이터입니다.

**`ARMYStayHubEngine` 클래스 기능:**
- 공연장 정보 관리 (고양 스타디움: 37.6556°N, 126.7714°E)
- 로컬 명소 데이터베이스 (BTS 관련 장소, 맛집, 카페)
- 교통 정보 (거리, 지하철 노선)
- 스크래핑 + 계산 + 정적 데이터 통합
- JSON 내보내기

#### availability_tracker.py (12KB)
재고 변동을 감지하고 알림을 발송합니다.

**감지 유형:**
| 이벤트 | 설명 |
|--------|------|
| Restocked | 품절 → 재입고 |
| Sold Out | 입고 → 품절 |
| Low Stock | 잔여 3실 이하 |
| New Hotel | 신규 호텔 등록 |

**알림 채널:**
- Discord Webhooks
- Telegram Bot
- Slack Webhooks

#### app.py (27 lines)
Streamlit 기반 관리자 대시보드입니다.

---

### 3. 데이터베이스

#### supabase_setup.sql
`hotel_notifications` 테이블 스키마:

```sql
CREATE TABLE hotel_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    hotel_id TEXT NOT NULL,
    hotel_name TEXT,
    notify_email BOOLEAN DEFAULT true,
    notify_discord BOOLEAN DEFAULT false,
    notify_telegram BOOLEAN DEFAULT false,
    discord_user_id TEXT,
    telegram_chat_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    notified_at TIMESTAMP,
    UNIQUE(email, hotel_id)
);
```

**Row-Level Security 정책:**
- INSERT: 누구나 구독 가능
- SELECT: 본인 구독만 조회 가능
- UPDATE: 본인 구독만 수정 가능

---

### 4. 데이터 파일

#### korean_ota_hotels.json (354.8KB)
메인 호텔 데이터셋으로 48개 호텔 정보를 포함합니다.

**구조:**
```json
{
  "home": {
    "available_count": 45,
    "total_count": 48,
    "lowest_price_krw": 89000,
    "last_update": "2026-02-03T10:00:00+09:00"
  },
  "map": {
    "venue": { "name": "고양스타디움", "lat": 37.6556, "lng": 126.7714 },
    "attractions": [...]
  },
  "hotels": [
    {
      "name": "호텔명",
      "location": "고양시",
      "area": "일산",
      "is_available": true,
      "rooms_left": 5,
      "price_krw": 150000,
      "price_tier": 2,
      "platform": "Agoda",
      "booking_url": "https://...",
      "image_url": "https://...",
      "distance_km": 2.5,
      "transport": "지하철 3호선 화정역에서 도보 10분",
      "highlights": ["무료 조식", "공연장 셔틀"],
      "features": ["WiFi", "주차"]
    }
  ]
}
```

#### availability_state.json (26KB)
이전 상태를 저장하여 변동 감지에 사용합니다.

#### notification_log.json
알림 발송 기록 (최근 10건)을 저장합니다.

---

## 애플리케이션 흐름

### 프론트엔드 플로우

```
사용자 브라우저
    ↓
index.html 로드
    ↓
app.js 초기화
    ↓
Supabase 인증 (Google OAuth)
    ↓
호텔 데이터 페칭
    ↓
호텔 카드 렌더링
    ↓
사용자 인터랙션 (필터, 지역 선택)
    ↓
알림 구독 (모달)
    ↓
Supabase DB 저장
```

### 백엔드 데이터 플로우

```
Crontab / GitHub Actions (트리거)
    ↓
run_scraper.py 실행
    ↓
korean_ota_scraper.py (멀티 플랫폼 스크래핑)
    ├─ AgodaScraper
    ├─ NaverHotelScraper
    ├─ GoodChoiceScraper
    ├─ YanoljaScraper
    └─ CoupangTravelScraper
    ↓
데이터 보강 (거리, 교통, 가이드)
    ↓
korean_ota_hotels.json 저장
    ↓
availability_tracker.py (변동 감지)
    ↓
알림 발송 (Discord/Telegram/Slack)
    ↓
notification_log.json 기록
    ↓
Git Commit & Push
```

---

## 자동화 설정

### GitHub Actions

#### main.yml (수동 업데이트)
- **트리거:** `workflow_dispatch` (수동 실행)
- **작업:** Python 설정 → 스크래퍼 실행 → 커밋/푸시

#### scrape.yml (자동 스크래핑 - 비활성화됨)
- **원래 스케줄:** 매시간 (`0 * * * *`)
- **환경 변수:**
  - `DISCORD_WEBHOOK_URL`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
  - `SLACK_WEBHOOK_URL`

### 로컬 자동화

#### auto_scrape.sh
MacBook crontab용 스크래퍼 스크립트입니다.

#### auto_update.sh
자동 업데이트 스크립트로 Git 커밋/푸시를 포함합니다.

---

## Project Statistics / 프로젝트 통계

| Metric / 항목 | Value / 값 |
|---------------|------------|
| Total Code Lines / 총 코드 라인 | ~18,600 |
| Python Files / Python 파일 | 5 (korean_ota_scraper.py, agoda_scraper.py, run_scraper.py, availability_tracker.py, app.py) |
| Frontend Files / 프론트엔드 파일 | 3 (index.html, app.js, style.css) |
| JSON Data Files / JSON 데이터 파일 | 4 (~500KB total) |
| Hotels / 호텔 수 | 90 |
| Supported Locations / 지원 지역 | 6 (Goyang, Seoul, Hongdae, Seongsu, Busan, Paju) |
| OTA Platforms / OTA 플랫폼 | 5 (Agoda, Naver, GoodChoice, Yanolja, Coupang) |
| Notification Channels / 알림 채널 | 3 (Discord, Telegram, Slack) |

---

## Key Features Summary / 주요 기능 요약

### English

1. **Multi-platform Scraping** - Collects data from Agoda, Naver, GoodChoice, Yanolja, Coupang
2. **Real-time Inventory Tracking** - Monitors stock changes and sold-out status
3. **Smart Notifications** - Discord, Telegram, Slack alerts
4. **Mobile-first Web UI** - Optimized for mobile users
5. **User Authentication** - Google OAuth via Supabase
6. **Location Filtering** - Supports various Korean concert venues
7. **Price Tracking** - Lowest price aggregation
8. **ARMY-specific Content** - Local guides, BTS landmarks, transportation guides
9. **Automation** - Git-integrated crontab scheduling
10. **Data Persistence** - State tracking with JSON storage

### 한국어

1. **멀티 플랫폼 스크래핑** - Agoda, Naver, GoodChoice, Yanolja, Coupang에서 수집
2. **실시간 재고 추적** - 재고 변동 및 품절 모니터링
3. **지능형 알림** - Discord, Telegram, Slack 알림
4. **모바일 우선 웹 UI** - 모바일 사용자 최적화
5. **사용자 인증** - Supabase를 통한 Google OAuth
6. **지역별 필터링** - 다양한 한국 콘서트 공연장 지원
7. **가격 추적** - 최저가 집계
8. **ARMY 전용 콘텐츠** - 로컬 가이드, BTS 명소, 교통 가이드
9. **자동화** - Git 연동 crontab 스케줄링
10. **데이터 지속성** - 상태 추적 JSON 스토리지

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ARMY Stay Hub Architecture                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐       ┌──────────────────────────────────────────┐
│   User's Browser    │       │         External OTA Platforms           │
│                     │       ├──────────────────────────────────────────┤
│  - index.html       │       │  Agoda     Naver Hotels   GoodChoice     │
│  - app.js           │       │  Yanolja   Coupang Travel                │
│  - style.css        │       └───────────────────┬──────────────────────┘
└──────────┬──────────┘                           │
           │                                      │ (scraping)
           │ (loads JSON)                         ↓
           ↓                           ┌─────────────────────────┐
┌──────────────────────────┐           │   Python Backend        │
│      Data Layer          │◄──────────┤                         │
├──────────────────────────┤  (writes) │ - korean_ota_scraper.py │
│ korean_ota_hotels.json   │           │ - agoda_scraper.py      │
│ availability_state.json  │           │ - run_scraper.py        │
│ notification_log.json    │           │ - availability_tracker  │
└──────────────────────────┘           └───────────┬─────────────┘
                                                   │
                                                   │ (sends alerts)
                                                   ↓
                                    ┌──────────────────────────────┐
                                    │    Notification Services     │
                                    ├──────────────────────────────┤
                                    │  Discord    Telegram   Slack │
                                    │  Webhooks   Bot API    Webhooks│
                                    └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        Supabase (PostgreSQL)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Project: ARMY STAY (mjzuelvnowutvarghfbm)                              │
│                                                                         │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │    Authentication       │    │  hotel_notifications    │            │
│  │    (Google OAuth)       │    │  (Subscriptions DB)     │            │
│  └─────────────────────────┘    └─────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         Hosting & CI/CD                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Production: www.armystay.com ──► Vercel (bts-hotel-5zlx.vercel.app)   │
│  Automation: GitHub Actions + MacBook crontab                           │
│  Repository: GitHub (auto-commit on data updates)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## License / 라이선스

This project is a community project for BTS fans.
이 프로젝트는 BTS 팬들을 위한 커뮤니티 프로젝트입니다.

---

*Last Updated / 마지막 업데이트: 2026-02-04*
