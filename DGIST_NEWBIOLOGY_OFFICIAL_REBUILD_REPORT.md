# DGIST 뉴바이올로지학과 공식 자료 기반 추천 DB 재구축 보고서

## 작업 범위
- 기준 ZIP: `LAB_MATCH_AI_DGIST_ENERGY_Official_Curated_Final(1).zip`
- 대상: DGIST 학교별 연구실 추천의 뉴바이올로지학과 22명
- 원본 `graduate/dgist/data.js`는 수정하지 않음
- 뉴바이올로지학과 전용 정제 DB와 검색기만 추가
- 로봇기계·전전컴·뇌과학·에너지 정제 결과와 다른 서비스는 유지

## 공식 근거
- 교수 및 연구 분야: https://www.dgist.ac.kr/prog/peopleProfsr/newbiology/sub02_01/list.do
- 학과 연구 클러스터: https://www.dgist.ac.kr/newbiology/sub03_01.do
- 학과 공식 연구축: FEP(식량안보·에코플랜트), DAC(질환·노화 제어), MAB(멀티오믹스·AI 바이오정보학)
- 각 교수의 공식 연결 연구실 홈페이지와 DGIST 공개 연구 분야를 보조 근거로 사용

## 핵심 오류 수정 결과
- `환경응답`: 0명 → 우혜련, 곽준명
- `크로마틴`: 18명 → 김유리 1명
- `단백질 분해`: 6명 → 이병훈 1명
- `노화`: 식물·인간 노화 혼합 → 이영삼, 이재민, 남창훈
- `식물 노화`: 곽준명, 우혜련으로 별도 분리
- `세포노화`: 이영삼
- `노화 대사`: 이재민
- `면역노화`: 남창훈
- `식물 면역`: 식물 또는 면역 중 하나만 맞는 OR 추천을 막아 0명 처리

## 배너 재구성
총 17개 배너를 공식 세 연구 클러스터와 교수별 공식 연구 분야에 맞춰 다시 연결했습니다.
모든 교수 22명이 최소 한 개 이상의 배너에 포함되며, 배너당 최대 결과는 4명입니다.

## 내부 회귀검사
- 교수별 직접 검색어: 258개
- 해당 교수 1위: 248/258 (96.1%)
- 해당 교수 상위 3위: 258/258 (100.0%)
- 완전 누락: 0개
- 배너: 17개, 결과 0개 0개, 10명 초과 0개

이 수치는 실제 사용자 만족도가 아니라 배포 전 내부 회귀검사 결과입니다.

## 변경 파일
- ADDED `graduate/dgist/newbiology-curated-db.js`
- ADDED `graduate/dgist/newbiology-search-engine.js`
- ADDED `analysis/validate_dgist_newbiology_search.js`
- MODIFIED `graduate/dgist/index.html`
- MODIFIED `graduate/dgist/app.js`

원본 `data.js`, `analytics.js` 및 다른 학과 전용 정제 DB는 수정하지 않았습니다.
