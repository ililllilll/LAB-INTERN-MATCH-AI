# 통계 기능 검사 결과

## 기능 확인

- 기존 GoatCounter pageview 코드: 7개 HTML에 각각 1회 유지
- 공통 `analytics.js`: 7개 HTML에서 각각 1회 연결
- 검색어 원문 비전송 검사: 임의 문자열을 포함한 검색 테스트에서 이벤트 path와 title에 원문이 포함되지 않음
- 익명 분야 분류 검사: 반도체 검색은 `semiconductor`, 바이오센서 검색은 `bio-medical`로 기록
- 검색 결과 구간 이벤트 검사: `0`, `1-3`, `4-10`, `11-plus` 구조 확인
- 익명 만족도 질문 표시 및 `helpful`, `not-helpful` 이벤트 확인
- 모든 JavaScript 문법 검사 통과
- GoatCounter JSON export 분석기 구문 및 합성 데이터 실행 검사 통과

## 원본 기능 보존

인턴, DGIST, 서울대학교, KAIST, POSTECH의 `data.js`와 `app.js` SHA-256을 수정 전 파일과 비교했으며 모두 동일합니다. 추천 DB와 추천 알고리즘은 변경하지 않았습니다.

## 개인정보 보호

- 검색어 원문 미전송
- 이름, 학번, 이메일 및 전화번호 미수집
- 사용자 ID와 자체 추적 ID 미생성
- 교수명과 기업명을 이벤트명에 기록하지 않음
- 이벤트에 `no_session: true` 적용
- Python 분석은 개별 방문 기록 대신 GoatCounter JSON export의 시간대별 집계값 사용
