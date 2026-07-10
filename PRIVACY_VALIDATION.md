# 개인정보 보호형 통계 구현 검사

- 통과: service_html_count (7)
- 통과: no_static_goatcounter:index.html
- 통과: consent_script:index.html
- 통과: analytics_script:index.html
- 통과: no_static_goatcounter:graduate/index.html
- 통과: consent_script:graduate/index.html
- 통과: analytics_script:graduate/index.html
- 통과: no_static_goatcounter:intern/index.html
- 통과: consent_script:intern/index.html
- 통과: analytics_script:intern/index.html
- 통과: no_static_goatcounter:graduate/dgist/index.html
- 통과: consent_script:graduate/dgist/index.html
- 통과: analytics_script:graduate/dgist/index.html
- 통과: no_static_goatcounter:graduate/kaist/index.html
- 통과: consent_script:graduate/kaist/index.html
- 통과: analytics_script:graduate/kaist/index.html
- 통과: no_static_goatcounter:graduate/postech/index.html
- 통과: consent_script:graduate/postech/index.html
- 통과: analytics_script:graduate/postech/index.html
- 통과: no_static_goatcounter:graduate/snu/index.html
- 통과: consent_script:graduate/snu/index.html
- 통과: analytics_script:graduate/snu/index.html
- 통과: privacy_page
- 통과: consent_script
- 통과: analytics_guard

## JavaScript 문법 검사
- 통과: privacy-consent.js
- 통과: analytics.js
- 통과: intern/app.js
- 통과: graduate/dgist/app.js
- 통과: graduate/kaist/app.js
- 통과: graduate/postech/app.js
- 통과: graduate/snu/app.js
- 통과: intern/data.js
- 통과: graduate/dgist/data.js
- 통과: graduate/kaist/data.js
- 통과: graduate/postech/data.js
- 통과: graduate/snu/data.js

## 공개 데이터 최소화 추가 검증

- 최종 공개 파일의 이메일 주소 형식 0건
- 명확한 국내 전화번호 형식 0건
- 메일 링크 스킴 및 전화 링크 스킴 링크 0건
- 연락처 전용 교수 및 인턴 데이터 필드 0건
- 공식 URL 목록과 순서 수정 전후 동일
- 추천, 정렬, UI, 통계 코드 수정 전후 동일
- 세부 결과는 `PRIVACY_MINIMIZATION_REPORT.md`, `REGRESSION_COMPARISON.md`, `PII_SCAN_REPORT.md` 참고
