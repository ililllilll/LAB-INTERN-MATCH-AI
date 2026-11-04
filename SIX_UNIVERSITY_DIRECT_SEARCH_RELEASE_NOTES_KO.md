# LAB MATCH AI — 6개 대학 직접 검색 UI 복원 및 1,993명 데이터 연결

## 변경 내용 (2026-11-04)

- 메인 화면의 **분야별 연구실 추천**을 열면 **분야를 선택해서 찾기**, **연구 내용 직접 검색** 두 옵션을 모두 표시합니다.
- 직접 검색은 기존 4개 대학(1,531명)과 GIST(158명), UNIST(304명)의 **총 1,993명 고유 교수 ID**를 하나의 통합 검색 인덱스로 조회합니다.
- 직접 검색 화면에는 **전체 6개 대학** 또는 특정 대학만 선택하는 필터를 추가했습니다.
- 기존 16개 대분야 및 247개 세부분야 **분야 선택 추천**, 기존 학교별 상세 검색 4개교, 인턴 추천, 개인정보/분석 기능 등은 변경하지 않았습니다.
- 기존 학교별 4개교 BM25 Plus 인덱스는 그대로 유지합니다. 통합 직접 검색은 1,993명 전체를 대상으로 **별도 가중 필드 BM25+** 검색 및 복합 검색어 문맥 필터를 사용합니다. 따라서 기존 4개교 검색 점수와 1:1로 동일하다고 주장하지 않습니다.
- 직접 검색이 빈 결과를 약한 후보로 억지 채우지 않도록 했으며, 교수명 정확 입력은 인명 탐색으로 처리합니다.

## 실제 데이터 출처 및 한계

- 기존 네 대학: 현재 공개 GitHub의 `professor-documents.json`에 포함된 1,531명 연구·분야 데이터.
- GIST·UNIST: **2026-08-13 Codex 후보 Recommendation DB**에서 공식 조사한 연구 텍스트와 축/검색어를 교수 ID별로 사용. 기존 공개 서비스 표시 인원과 정확히 매칭되는 교수 ID만 색인함 (GIST 158명, UNIST 304명).
- GIST/UNIST 출처의 연구정보는 **2026년 11월 기준으로 재크롤·전수검증한 정보가 아닙니다.** 일부는 연구실명 정도만 확인됐을 수 있고, UNIST의 양자대학원은 이전 수집에서 차단됐습니다.
- 새 검색의 품질에 대해 F1 99.68%/99.88%를 적용하거나 검색 추천 정확도로 광고하지 않습니다. 그 수치는 과거 교수 선별 독립검증의 지표였습니다.
- 추천 점수는 연구실의 우수성, 대학 평가, 교수님의 학생 모집 여부를 의미하지 않습니다. 지원 전 공식 출처 확인이 필요합니다.

## GitHub Desktop 업로드 방법

1. 이 ZIP 압축을 풉니다.
2. `LAB-INTERN-MATCH-AI-main` 폴더 **안의 모든 파일과 폴더**를 GitHub Desktop 로컬 저장소 `LAB-INTERN-MATCH-AI`의 최상위 폴더에 덮어씁니다. 상위 폴더를 통째로 추가해 `LAB-INTERN-MATCH-AI-main/LAB-INTERN-MATCH-AI-main/...` 같은 중첩 경로를 만들면 안 됩니다.
3. GitHub Desktop에서 변경 내용을 검토한 뒤 **Commit to main → Push origin**을 수행합니다. 이 ZIP을 만드는 동안 원격 GitHub 저장소는 변경하지 않았습니다.
4. GitHub Actions의 GitHub Pages 배포 성공 여부를 확인하고 새로고침(Ctrl+Shift+R)합니다.
5. `graduate/field/index.html` → '연구 내용 직접 검색' → 학교 필터 GIST/UNIST, 검색어 예: `아토초 레이저`, `레이저 가공`, `바이오센서` 순서로 결과를 확인합니다.
6. 분야 선택 추천과 기존 4개 대학 학교별 검색, 인턴 추천 화면도 회귀 점검합니다.

## 기술 구조

- 신규 검색 인덱스: `graduate/assets/runtime/six-university-direct-index.json`
- 검색 엔진: `graduate/assets/js/six-direct-search.js`
- 기존 RuntimeLoader를 통한 JSON SHA cache-bust, **직접 검색을 선택했을 때만 신규 검색 인덱스 지연 로딩**
- 화면: `graduate/assets/js/graduate-app.js`, `graduate/field/index.html`, 기존 CSS 증분 수정
- 인증 키나 외부 서버 없이 기존 GitHub Pages 정적 구성에서 작동

