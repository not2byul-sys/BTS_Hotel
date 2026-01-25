import streamlit as st
import pandas as pd
import json
import os

# 페이지 설정
st.set_page_config(page_title="BTS 콘서트 숙소 찾기", page_icon="💜")

st.title("💜 BTS 콘서트 고양 숙소 실시간 리포트")

# 데이터 로드
try:
    if os.path.exists('korean_ota_hotels.json'):
        with open('korean_ota_hotels.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
        
        # 상단 요약 카드
        st.metric("수집된 숙소", f"{len(df)}개")
        
        # 데이터 표
        st.write("### 🏨 숙소 리스트")
        st.dataframe(df, use_container_width=True)
    else:
        st.info("맥북에서 스크래퍼를 실행하여 데이터를 먼저 수집해주세요!")
except Exception as e:
    st.error(f"데이터를 불러오는 중 오류가 발생했습니다: {e}")