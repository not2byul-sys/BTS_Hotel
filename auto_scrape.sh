#!/bin/bash
# ARMY Stay Hub - 자동 스크래핑 스크립트
# MacBook crontab에서 실행

# 프로젝트 경로 (사용자 환경에 맞게 수정)
PROJECT_DIR="$HOME/BTS_Hotel"
LOG_FILE="$PROJECT_DIR/scraper.log"

# 타임스탬프
echo "========================================" >> "$LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') - 스크래핑 시작" >> "$LOG_FILE"

# 프로젝트 디렉토리로 이동
cd "$PROJECT_DIR" || exit 1

# Python 스크래퍼 실행
python3 run_scraper.py >> "$LOG_FILE" 2>&1

# 스크래핑 성공 여부 확인
if [ $? -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 스크래핑 성공" >> "$LOG_FILE"

    # Git 변경사항 확인
    if [[ -n $(git status --porcelain korean_ota_hotels.json) ]]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - JSON 변경 감지, 커밋 중..." >> "$LOG_FILE"

        # Git 커밋 및 푸시
        git add korean_ota_hotels.json
        git commit -m "chore: Auto-update hotel data $(date '+%Y-%m-%d %H:%M')"
        git push origin main >> "$LOG_FILE" 2>&1

        if [ $? -eq 0 ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') - GitHub 푸시 완료" >> "$LOG_FILE"
        else
            echo "$(date '+%Y-%m-%d %H:%M:%S') - GitHub 푸시 실패" >> "$LOG_FILE"
        fi
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 변경사항 없음" >> "$LOG_FILE"
    fi
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 스크래핑 실패" >> "$LOG_FILE"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - 완료" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
