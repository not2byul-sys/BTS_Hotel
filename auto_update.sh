#!/bin/bash

# 1. 수집 폴더로 이동
cd /Users/seoinlee/Desktop/BTS_Hotel

# 2. 파이썬 스크래퍼 실행 (가상환경 활성화 포함)
source venv/bin/activate
python3 run_scraper.py

# 3. 깃허브에 자동으로 업로드 (연동의 핵심!)
git add .
git commit -m "Auto-update hotel data: $(date)"
git push origin main