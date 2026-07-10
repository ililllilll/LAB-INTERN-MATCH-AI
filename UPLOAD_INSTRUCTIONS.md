# GitHub 업로드 방법

## 업로드 대상

`LAB_MATCH_AI_privacy_minimized_same_output.zip`을 먼저 압축 해제한다. ZIP 파일 자체를 GitHub Pages 저장소에 올리지 말고, 압축을 푼 내부 파일과 폴더 전체를 저장소 루트에 올린다.

최상단에는 다음 항목이 보여야 한다.

```text
index.html
analytics.js
privacy-consent.js
privacy.html
data-policy.html
intern/
graduate/
analysis/
README.md
PRIVACY_MINIMIZATION_REPORT.md
REGRESSION_COMPARISON.md
PII_SCAN_REPORT.md
.nojekyll
```

## 권장 교체 방법

기존 저장소에 새 파일만 덮어쓰면 새 ZIP에 없는 구버전 파일이 남을 수 있다. 가장 안전한 방법은 다음과 같다.

1. 기존 GitHub 저장소를 백업한다.
2. 저장소의 기존 사이트 파일을 삭제한다. `.git` 폴더는 삭제하지 않는다.
3. 최종 ZIP 내부 파일 전체를 저장소 루트에 복사한다.
4. 변경 사항을 커밋하고 푸시한다.
5. GitHub Pages 배포가 끝난 뒤 기존 URL을 시크릿 창에서 확인한다.

GitHub Desktop을 사용하면 삭제, 수정, 추가 파일이 한 번에 표시돼 가장 안전하다.

## 업로드 후 확인

- 첫 화면이 정상적으로 열리는지
- 인턴 및 대학원 서비스로 이동되는지
- 네 학교 검색이 작동하는지
- 교수 홈페이지와 공식 프로필 링크가 열리는지
- 통계 동의 및 거부 배너가 작동하는지
- GoatCounter의 기존 계정과 이벤트가 유지되는지

기존 GoatCounter 주소와 이벤트 이름은 변경하지 않았으므로 기존 누적 통계와 연결된다.
