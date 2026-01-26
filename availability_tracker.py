"""
ARMY Stay Hub - 숙소 재입고 알림 시스템
Hotel Availability Tracker & Notification System

마감된 숙소가 다시 예약 가능해지면 알림 발송
- Discord Webhook
- Telegram Bot
- Slack Webhook
"""

import json
import os
import hashlib
from datetime import datetime
from typing import Dict, List, Optional
import urllib.request
import urllib.error

# 설정 파일 경로
AVAILABILITY_STATE_FILE = "availability_state.json"
NOTIFICATION_LOG_FILE = "notification_log.json"


class AvailabilityTracker:
    """숙소 가용성 변화 추적"""

    def __init__(self, state_file: str = AVAILABILITY_STATE_FILE):
        self.state_file = state_file
        self.previous_state = self._load_state()

    def _load_state(self) -> Dict:
        """이전 상태 로드"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save_state(self, state: Dict):
        """현재 상태 저장"""
        with open(self.state_file, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)

    def _get_hotel_key(self, hotel: Dict) -> str:
        """호텔 고유 키 생성"""
        name = hotel.get("name_en", hotel.get("name", ""))
        platform = hotel.get("platform", "")
        return hashlib.md5(f"{name}_{platform}".encode()).hexdigest()[:12]

    def check_changes(self, current_hotels: List[Dict]) -> Dict:
        """
        가용성 변화 확인

        Returns:
            {
                "restocked": [...],      # 마감 → 예약가능
                "sold_out": [...],       # 예약가능 → 마감
                "low_stock": [...],      # 잔여 3개 이하
                "new_hotels": [...]      # 새로 추가된 호텔
            }
        """
        changes = {
            "restocked": [],
            "sold_out": [],
            "low_stock": [],
            "new_hotels": [],
            "timestamp": datetime.now().isoformat()
        }

        current_state = {}

        for hotel in current_hotels:
            key = self._get_hotel_key(hotel)
            is_available = hotel.get("is_available", True)
            rooms_left = hotel.get("rooms_left", -1)

            current_state[key] = {
                "name": hotel.get("name_en", hotel.get("name", "")),
                "is_available": is_available,
                "rooms_left": rooms_left,
                "price_krw": hotel.get("price_krw", 0),
                "platform": hotel.get("platform", ""),
                "location": hotel.get("location", {}).get("area_en", ""),
                "booking_url": hotel.get("booking_url", ""),
                "image_url": hotel.get("image_url", "")
            }

            # 이전 상태와 비교
            if key in self.previous_state:
                prev = self.previous_state[key]

                # 마감 → 예약가능 (재입고!)
                if not prev.get("is_available") and is_available:
                    changes["restocked"].append({
                        **current_state[key],
                        "previous_rooms": prev.get("rooms_left", 0),
                        "current_rooms": rooms_left
                    })

                # 예약가능 → 마감 (매진)
                elif prev.get("is_available") and not is_available:
                    changes["sold_out"].append(current_state[key])

                # 잔여 객실 3개 이하 (긴급!)
                elif is_available and 0 < rooms_left <= 3:
                    changes["low_stock"].append(current_state[key])
            else:
                # 새로 추가된 호텔
                changes["new_hotels"].append(current_state[key])

        # 상태 업데이트 및 저장
        self._save_state(current_state)

        return changes


class NotificationSender:
    """알림 발송 시스템"""

    def __init__(self):
        # 환경변수에서 웹훅 URL 로드
        self.discord_webhook = os.environ.get("DISCORD_WEBHOOK_URL", "")
        self.telegram_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
        self.slack_webhook = os.environ.get("SLACK_WEBHOOK_URL", "")

    def _post_json(self, url: str, data: Dict) -> bool:
        """JSON POST 요청"""
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.status == 200 or response.status == 204
        except Exception as e:
            print(f"알림 발송 실패: {e}")
            return False

    def send_discord(self, changes: Dict) -> bool:
        """Discord 웹훅 알림"""
        if not self.discord_webhook:
            return False

        embeds = []

        # 재입고 알림 (가장 중요!)
        for hotel in changes.get("restocked", [])[:5]:  # 최대 5개
            embeds.append({
                "title": f"🎉 재입고! {hotel['name']}",
                "description": f"**{hotel['location']}** | {hotel['platform']}\n"
                              f"💰 ₩{hotel['price_krw']:,}/박\n"
                              f"🛏️ 잔여 {hotel['current_rooms']}개",
                "color": 0x7C3AED,  # Purple
                "url": hotel.get("booking_url", ""),
                "thumbnail": {"url": hotel.get("image_url", "")}
            })

        # 잔여 3개 이하 긴급 알림
        for hotel in changes.get("low_stock", [])[:3]:
            embeds.append({
                "title": f"⚠️ 마감임박! {hotel['name']}",
                "description": f"**{hotel['location']}** | 잔여 {hotel['rooms_left']}개\n"
                              f"💰 ₩{hotel['price_krw']:,}/박",
                "color": 0xF59E0B,  # Amber
                "url": hotel.get("booking_url", "")
            })

        if not embeds:
            return True  # 알릴 내용 없음

        payload = {
            "username": "ARMY Stay Hub",
            "avatar_url": "https://www.armystay.com/favicon.ico",
            "content": "🏨 **BTS FESTA 2026 숙소 알림**",
            "embeds": embeds
        }

        return self._post_json(self.discord_webhook, payload)

    def send_telegram(self, changes: Dict) -> bool:
        """Telegram 봇 알림"""
        if not self.telegram_bot_token or not self.telegram_chat_id:
            return False

        messages = []

        # 재입고 알림
        for hotel in changes.get("restocked", [])[:5]:
            messages.append(
                f"🎉 *재입고!* {hotel['name']}\n"
                f"📍 {hotel['location']} | {hotel['platform']}\n"
                f"💰 ₩{hotel['price_krw']:,}/박\n"
                f"🛏️ 잔여 {hotel['current_rooms']}개\n"
                f"[예약하기]({hotel.get('booking_url', '')})"
            )

        # 마감임박 알림
        for hotel in changes.get("low_stock", [])[:3]:
            messages.append(
                f"⚠️ *마감임박!* {hotel['name']}\n"
                f"🛏️ 잔여 {hotel['rooms_left']}개만 남음!"
            )

        if not messages:
            return True

        url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"

        success = True
        for msg in messages:
            payload = {
                "chat_id": self.telegram_chat_id,
                "text": msg,
                "parse_mode": "Markdown",
                "disable_web_page_preview": False
            }
            if not self._post_json(url, payload):
                success = False

        return success

    def send_slack(self, changes: Dict) -> bool:
        """Slack 웹훅 알림"""
        if not self.slack_webhook:
            return False

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "🏨 BTS FESTA 2026 숙소 알림"}
            }
        ]

        # 재입고 알림
        for hotel in changes.get("restocked", [])[:5]:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"🎉 *재입고!* {hotel['name']}\n"
                           f"📍 {hotel['location']} | ₩{hotel['price_krw']:,}/박\n"
                           f"🛏️ 잔여 {hotel['current_rooms']}개"
                },
                "accessory": {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "예약하기"},
                    "url": hotel.get("booking_url", "https://www.armystay.com")
                }
            })

        if len(blocks) == 1:
            return True  # 알릴 내용 없음

        return self._post_json(self.slack_webhook, {"blocks": blocks})

    def send_all(self, changes: Dict) -> Dict:
        """모든 채널로 알림 발송"""
        results = {
            "discord": self.send_discord(changes),
            "telegram": self.send_telegram(changes),
            "slack": self.send_slack(changes),
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "restocked": len(changes.get("restocked", [])),
                "sold_out": len(changes.get("sold_out", [])),
                "low_stock": len(changes.get("low_stock", [])),
                "new_hotels": len(changes.get("new_hotels", []))
            }
        }

        # 로그 저장
        self._log_notification(results)

        return results

    def _log_notification(self, results: Dict):
        """알림 로그 저장"""
        log_file = NOTIFICATION_LOG_FILE
        logs = []

        if os.path.exists(log_file):
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    logs = json.load(f)
            except:
                logs = []

        logs.append(results)

        # 최근 100개만 유지
        logs = logs[-100:]

        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)


def check_and_notify(hotels_data: List[Dict]) -> Dict:
    """
    메인 함수: 가용성 확인 및 알림 발송

    Args:
        hotels_data: 현재 호텔 데이터 리스트

    Returns:
        알림 발송 결과
    """
    # 변화 감지
    tracker = AvailabilityTracker()
    changes = tracker.check_changes(hotels_data)

    # 변화가 있으면 알림 발송
    has_changes = (
        changes.get("restocked") or
        changes.get("low_stock")
    )

    if has_changes:
        sender = NotificationSender()
        results = sender.send_all(changes)

        print(f"📢 알림 발송 완료!")
        print(f"   - 재입고: {len(changes.get('restocked', []))}개")
        print(f"   - 마감임박: {len(changes.get('low_stock', []))}개")

        return results
    else:
        print("📭 알림 대상 없음")
        return {"status": "no_changes", "timestamp": datetime.now().isoformat()}


# CLI 테스트용
if __name__ == "__main__":
    # 테스트 데이터
    test_hotels = [
        {
            "name_en": "Test Hotel 1",
            "platform": "Agoda",
            "is_available": True,
            "rooms_left": 2,
            "price_krw": 150000,
            "location": {"area_en": "Goyang"},
            "booking_url": "https://example.com"
        },
        {
            "name_en": "Test Hotel 2",
            "platform": "Naver",
            "is_available": False,
            "rooms_left": 0,
            "price_krw": 200000,
            "location": {"area_en": "Hongdae"}
        }
    ]

    result = check_and_notify(test_hotels)
    print(json.dumps(result, indent=2, ensure_ascii=False))
