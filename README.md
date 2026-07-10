# LAB MATCH AI 통합 플랫폼

GitHub Pages에 그대로 업로드할 수 있는 정적 통합 플랫폼입니다.

## 서비스 경로

- `index.html`: 서비스 종류 선택
- `intern/index.html`: DGIST 이공계 인턴 추천 서비스
- `graduate/index.html`: 대학원 학교 선택
- `graduate/dgist/index.html`: DGIST 대학원 연구실 추천 서비스
- `graduate/snu/index.html`: 서울대학교 대학원 연구실 추천 서비스
- `graduate/kaist/index.html`: KAIST 대학원 연구실 추천 서비스
- `graduate/postech/index.html`: POSTECH 대학원 연구실 추천 서비스

## 배포

1. ZIP 압축을 해제합니다.
2. 압축을 푼 폴더 안의 파일과 폴더를 GitHub 저장소 최상위에 업로드합니다. 상위 폴더 자체가 한 단계 더 들어가지 않게 주의합니다.
3. GitHub 저장소의 **Settings → Pages**에서 배포 소스를 `Deploy from a branch`, 브랜치를 `main`, 폴더를 `/(root)`로 선택합니다.
4. 배포 후 첫 화면, 인턴 서비스, 대학원 학교 선택, 학교별 서비스 링크를 확인합니다.

## 접속 통계

모든 HTML은 기존 `https://dgist-intern-match.goatcounter.com/count` GoatCounter를 사용하며 pageview만 기록합니다. 버튼 클릭 이벤트 추적은 포함하지 않습니다.

> GitHub Pages가 프로젝트 저장소 주소로 배포되면 GoatCounter path에 저장소명 접두사가 붙을 수 있습니다. 예: `/REPOSITORY/graduate/dgist/`. 사용자 사이트 루트 또는 사용자 지정 도메인에서는 `/graduate/dgist/` 형태가 됩니다.

상세 작업 및 검사 결과는 `INTEGRATION_REPORT.md`를 확인하세요.
