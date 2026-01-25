#!/bin/bash

# ============================================
# ARMY Stay Hub - 맥북 자동 업데이트 스크립트
# 하루 10회 crontab 실행용
# ============================================

# 로그 파일 설정
LOG_FILE="/Users/seoinlee/Desktop/BTS_Hotel/update.log"

# 시작 로그
echo "======================================" >> "$LOG_FILE"
echo "[$(TZ='Asia/Seoul' date +'%Y-%m-%d %H:%M:%S KST')] 업데이트 시작" >> "$LOG_FILE"

# 1. 프로젝트 폴더로 이동
cd /Users/seoinlee/Desktop/BTS_Hotel || {
    echo "[ERROR] 폴더 이동 실패" >> "$LOG_FILE"
    exit 1
}

# 2. 가상환경 활성화 및 스크래퍼 실행
source venv/bin/activate
python3 run_scraper.py >> "$LOG_FILE" 2>&1

# 3. 변경사항 확인 후 깃허브 푸시
if git diff --quiet korean_ota_hotels.json; then
    echo "[INFO] 변경사항 없음 - 커밋 스킵" >> "$LOG_FILE"
else
    git add korean_ota_hotels.json
    git commit -m "Auto-update: $(TZ='Asia/Seoul' date +'%Y년 %m월 %d일 %H시 %M분 KST')"
    git push origin main >> "$LOG_FILE" 2>&1
    echo "[SUCCESS] 깃허브 푸시 완료" >> "$LOG_FILE"
fi

echo "[$(TZ='Asia/Seoul' date +'%Y-%m-%d %H:%M:%S KST')] 업데이트 종료" >> "$LOG_FILE"
