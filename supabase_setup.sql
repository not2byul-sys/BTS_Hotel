-- ARMY Stay Hub - 숙소 알림 구독 테이블
-- Supabase SQL Editor에서 실행

-- 알림 구독 테이블
CREATE TABLE IF NOT EXISTS hotel_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    hotel_id TEXT NOT NULL,
    hotel_name TEXT,

    -- 알림 채널 설정
    notify_email BOOLEAN DEFAULT true,
    notify_discord BOOLEAN DEFAULT false,
    notify_telegram BOOLEAN DEFAULT false,
    discord_user_id TEXT,           -- Discord 사용자 ID (DM용)
    telegram_chat_id TEXT,          -- Telegram 채팅 ID

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified_at TIMESTAMP WITH TIME ZONE,

    -- 같은 이메일로 같은 호텔 중복 구독 방지
    UNIQUE(email, hotel_id)
);

-- 인덱스 추가 (검색 속도)
CREATE INDEX idx_notifications_hotel ON hotel_notifications(hotel_id);
CREATE INDEX idx_notifications_email ON hotel_notifications(email);
CREATE INDEX idx_notifications_active ON hotel_notifications(is_active) WHERE is_active = true;

-- RLS (Row Level Security) 활성화
ALTER TABLE hotel_notifications ENABLE ROW LEVEL SECURITY;

-- 누구나 구독 신청 가능 (INSERT)
CREATE POLICY "Anyone can subscribe" ON hotel_notifications
    FOR INSERT WITH CHECK (true);

-- 본인 이메일만 조회 가능 (SELECT)
CREATE POLICY "Users can view own subscriptions" ON hotel_notifications
    FOR SELECT USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- 본인 구독만 취소 가능 (UPDATE)
CREATE POLICY "Users can unsubscribe" ON hotel_notifications
    FOR UPDATE USING (email = current_setting('request.jwt.claims', true)::json->>'email');
