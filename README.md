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
- `analytics.js`: 공통 GoatCounter 이벤트 분석 코드

## 배포

1. ZIP 압축을 해제합니다.
2. 압축을 푼 폴더 안의 파일과 폴더 전체를 GitHub 저장소 최상위에 업로드합니다.
3. 기존 파일과 이름이 같으면 덮어쓰고, `analytics.js`와 문서 파일은 새로 추가합니다.
4. GitHub 저장소의 **Settings → Pages**에서 `Deploy from a branch`, `main`, `/(root)`를 선택합니다.
5. 배포 후 첫 화면, 인턴 서비스, 대학원 학교 선택, 학교별 서비스 링크를 확인합니다.

## 접속 및 이용 통계

모든 HTML은 기존 `https://dgist-intern-match.goatcounter.com/count` GoatCounter를 계속 사용합니다.

- 기존 pageview 경로 통계 유지
- 버튼 클릭, 서비스 선택, 학교 선택, 검색 실행, 더보기, 외부 링크 이동을 이벤트로 추가 집계
- 검색어 원문, 이름, 이메일, 학번, 사용자 식별자는 추가 수집하지 않음
- 이벤트 이름은 `lm-` 접두사로 구분

상세 변수와 분석 시나리오는 `ANALYTICS_GUIDE.md`를 확인하세요.

## 파일 분리 구조

인턴 및 학교별 서비스는 대용량 데이터와 실행 코드를 각각 `data.js`, `app.js`로 분리했습니다. GitHub에 올릴 때 이 파일들을 누락하면 서비스가 작동하지 않습니다.

## Python 분석

GoatCounter 대시보드의 JSON export를 내려받은 뒤 다음처럼 실행합니다.

```powershell
python analysis/goatcounter_analysis.py goatcounter-export.zip --output outputs
```

수정 전후 비교:

```powershell
python analysis/goatcounter_analysis.py goatcounter-export.zip --output outputs --split-date 2026-07-20
```

JSON export는 집계형 통계만 사용하므로 `Individual pageviews`를 활성화할 필요가 없습니다. 자세한 내용은 `analysis/README.md`를 확인하세요.


## 이용 통계와 개인정보 보호

첫 방문 시 이용 통계 동의 또는 거부를 선택할 수 있습니다. 동의 전에는 GoatCounter가 로드되지 않으며, 거부해도 모든 기능을 이용할 수 있습니다. 자세한 내용은 `privacy.html`과 `PRIVACY_IMPLEMENTATION.md`를 확인하세요.

## 데이터 운영 안내

- 교수 및 연구실 데이터의 출처, 비공식 서비스 고지, 검색 순위의 의미와 정정·삭제 절차는 `data-policy.html`에서 안내합니다.
- 내부 수집 및 검증 원칙은 `DATA_GOVERNANCE.md`에 정리했습니다.
- 정정 및 삭제 요청은 저장소 GitHub Issues를 통해 접수합니다.

## 공개 데이터 개인정보 최소화

공개 `data.js`에는 연구실과 인턴 탐색에 필요한 이름, 소속, 연구 분야, 추천용 구조화 데이터와 공식 URL을 유지하고, 불필요한 이메일 및 전화번호 필드와 원문 속 연락처는 제거했습니다. 추천 및 정렬 코드, UI와 통계 기능은 변경하지 않았습니다. 자세한 검증 내용은 `PRIVACY_MINIMIZATION_REPORT.md`, `REGRESSION_COMPARISON.md`, `PII_SCAN_REPORT.md`를 참고하세요.
