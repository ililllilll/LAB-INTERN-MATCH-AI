# LAB MATCH AI 통합 플랫폼 최종 검사 보고서

작성일: 2026-07-10

## 최종 구조

```text
index.html
analytics.js
intern/
  index.html
  data.js
  app.js
graduate/
  index.html
  dgist/
    index.html
    data.js
    app.js
  snu/
    index.html
    data.js
    app.js
  kaist/
    index.html
    data.js
    app.js
  postech/
    index.html
    data.js
    app.js
README.md
ANALYTICS_GUIDE.md
REVISION_SUMMARY.md
.nojekyll
```

## 적용 내용

- 첫 화면 제목을 `나만의 진로 탐색, MATCH AI`로 변경
- 인턴 화면 복귀 링크를 `← 첫 화면으로 돌아가기`로 변경
- 인턴 서비스 제목을 `DGIST Intern Match AI: 나에게 맞는 기업 인턴 찾기`로 변경
- 기존 pageview 수집 주소 `https://dgist-intern-match.goatcounter.com/count` 유지
- 공통 이벤트 분석 코드 `analytics.js` 추가
- 7개 HTML에서 각 상대경로로 `analytics.js`를 불러오도록 구성
- 기존 추천 알고리즘, 내부 DB, 더보기 및 인접 분야 로직은 변경하지 않음

## 개인정보 보호

추가 이벤트에는 검색어 원문, 사용자 이름, 이메일, 학번, 연락처, 사용자별 임의 식별자를 포함하지 않습니다. 학교와 기능 종류, 입력 길이 구간, 결과 수 구간, 결과 순위 구간만 기록합니다.

## 통계 구분

- pageview: 기존 URL path 기준 접속 기록
- event: `lm-`으로 시작하는 버튼 및 기능 이용 기록
- `lm-total-button-click`: 실제 버튼 클릭 총합
- `lm-total-navigation-click`: 화면 이동 링크 클릭 총합

기능별 상세 이벤트 정의와 분석식은 `ANALYTICS_GUIDE.md`를 확인합니다.

## 배포 주의사항

ZIP 자체를 올리지 말고 압축을 푼 내부 파일과 폴더 전체를 저장소 루트에 업로드해야 합니다. 특히 루트의 `analytics.js`와 각 서비스 폴더의 `data.js`, `app.js`가 누락되면 안 됩니다.
