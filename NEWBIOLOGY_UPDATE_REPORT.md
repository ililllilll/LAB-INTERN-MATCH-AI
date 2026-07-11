# DGIST 뉴바이올로지학과 데이터베이스 추가 보고서

## 기준

- 확인일: 2026-07-12
- 공식 교수 목록: https://www.dgist.ac.kr/prog/peopleProfsr/newbiology/sub02_01/list.do
- 적용 범위: 공식 목록에서 `전임교원`으로 표시된 교수
- 개인정보 최소화: 이메일, 전화번호, 팩스와 사진은 수집하거나 공개 DB에 넣지 않음

## 추가 결과

- DGIST 화면용 연구실 데이터: 136개 → 158개
- 뉴바이올로지학과 전임교원: 22명 추가
- 내부 추천 DB: `newbiology` 22개 추가
- 전체 병합 추천 DB: 136명 → 158명
- 기존 검색 로직, UI, 통계와 개인정보 동의 기능은 변경하지 않음

## 추가한 전임교원

곽준명, 구재형, 기영훈, 김민석, 김민식, 김유리, 김진해, 김태완, 남창훈, 예경무, 우혜련, 이병훈, 이상임, 이송이, 이영삼, 이재민, 이종찬, 이창훈, 정영태, 정찬, 최일규, 요나스 페릭스

## 제외한 비전임 분류

기존 DGIST 데이터베이스가 전임교원을 추천 대상으로 운영되는 구조이므로 다음 2명은 추가하지 않았다.

- 임평옥, 명예교수
- 문대원, 석좌교수

## 데이터 필드

각 교수에 대해 기존 DGIST DB와 같은 구조로 다음 항목을 구성했다.

- 교수명과 영문명
- 학과와 직위
- 연구실 한글명과 영문명
- 공식 연구 분야와 짧은 요약
- topics, keywords, domainTags, topKeywords
- 공식 교수 목록 및 연구실 홈페이지 URL
- 내부 추천용 primary_domains, secondary_domains, subfields
- methods, materials_or_targets, applications
- positive_queries, weak_queries, negative_queries
- 한글 및 영문 검색 동의어
- 관련 분야 구분 설명과 근거 URL

논문, 교과목과 인턴 연결 자료는 공식 근거를 별도로 확인하지 않은 상태에서 임의로 만들지 않고 빈 배열로 유지했다.

## 검증

- JavaScript 문법 검사 통과
- 화면용 DGIST 연구실 158개 확인
- 뉴바이올로지학과 전임교원 22명 확인
- 전체 병합 내부 DB 158명 확인
- 교수 ID와 이름 중복 없음
- 22개 대표 연구 검색어에서 해당 교수가 내부 추천 점수 1위인지 점검
- 새 뉴바이올로지 데이터에 이메일, 전화번호, `mailto:`, `tel:` 없음
- 원본 대비 변경 파일은 `graduate/dgist/data.js`, `graduate/dgist/index.html`과 본 보고서뿐임
