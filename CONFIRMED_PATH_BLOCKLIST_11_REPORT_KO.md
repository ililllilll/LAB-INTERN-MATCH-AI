# 확정 오답 경로 11개 차단 보고서

## 적용 기준

- 기준 패키지: `LAB_MATCH_AI_DGIST_CURRICULUM_INTERNSHIP_GITHUB_PAGES_DEPLOY_V7_DIRECT_SEARCH_EXACT_ANALYTICS_R1`
- 차단 정책: `CONFIRMED_FALSE_POSITIVE_PATH_BLOCKLIST_11_V1`
- 차단 키: `professor_id + small_field_id`
- 교수 레코드와 다른 정상 분야 경로는 유지

## 결과

- 구조공학: 25명 → 16명
  - PRIMARY: 17명 → 16명
  - SECONDARY: 8명 → 0명
- 운영체제: 21명 → 19명
  - PRIMARY: 14명 → 13명
  - SECONDARY: 7명 → 6명
- 전체 공개 경로: 7,200개 → 7,189개
- 제거된 확정 오답 경로: 11개

## 구조공학에서 제거

- 김민성 (`POSTECH-PERSON-0066`)
- 서종철 (`POSTECH-PERSON-0051`)
- 송윤주 (`SNU-CHEM-0016`)
- 윤동기 (`KAIST-CHEM-YOON-DONG-KI`)
- 이규철 (`SNU-PHYS-0018`)
- 이기라 (`POSTECH-PERSON-0235`)
- 이성근 (`SNU-SEES-0022`)
- 장소연 (`SNU-PHYS-0023`)
- 조윤제 (`POSTECH-PERSON-0087`)

## 운영체제에서 제거

- 배중면 (`KAIST-ME-BAE-JOONGMYEON`)
- 위태웅 (`DGIST_ENERGY_001`)

## 배포 방법

ZIP을 압축 해제한 뒤 **내용물 전체를 GitHub Pages 저장소의 루트에 업로드**합니다. ZIP 파일을 감싸는 상위 폴더를 추가하지 않습니다. 저장소 루트에 `index.html`, `.nojekyll`, `graduate/`, `intern/`이 바로 보여야 합니다.
