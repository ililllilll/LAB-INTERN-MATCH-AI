# LAB MATCH AI 최종 통합 작업 및 검사 보고서

작성일: 2026-07-10

## 1. 사용한 원본 파일

사용자가 설명에서 언급한 번호와 실제 업로드된 번호가 1씩 달랐으므로, **이번 대화에 실제 첨부된 최신 파일**을 사용했습니다.

- 인턴 추천 서비스
  - 요청서 표기: `DGIST_Intern_Match_AI_mobile_optimized(4).html`
  - 실제 첨부: `DGIST_Intern_Match_AI_mobile_optimized(5).html`
  - 처리: 원본 바이트를 그대로 `intern/index.html`로 복사했습니다.
- DGIST ZIP 실제 첨부: `dgist_7.9 - 복사본(19).zip`
  - 원본 경로: `dgist_7.9 - 복사본/알고리즘11_인턴업부줄바꿈해결/dgist_intern_subject_internal_newline_fix_index.html`
- 서울대학교 ZIP 실제 첨부: `snu_7.9 - 복사본(15).zip`
  - 원본 경로: `snu_7.9 - 복사본/알고리즘7_존칭사소수정2/snu_related_more_label_fix_index.html`
- KAIST ZIP 실제 첨부: `kaist_7.9 - 복사본(12).zip`
  - 원본 경로: `kaist_7.9 - 복사본/알고리즘7_존칭사소수정2/kaist_related_more_label_fix_index.html`
- POSTECH ZIP 실제 첨부: `po_7.9 - 복사본(10).zip`
  - 원본 경로: `po_7.9 - 복사본/알고리즘7_존칭사소수정2/postech_related_more_label_fix_index.html`

`데이터베이스만최신화` 폴더와 이전 알고리즘 폴더의 HTML은 사용하지 않았습니다.

## 2. 최종 폴더 구조

```text
index.html
intern/
  index.html
graduate/
  index.html
  dgist/
    index.html
  snu/
    index.html
  kaist/
    index.html
  postech/
    index.html
README.md
INTEGRATION_REPORT.md
.nojekyll
```

## 3. 링크 연결 구조

- `index.html` → 인턴 추천: `intern/index.html`
- `index.html` → 대학원 추천: `graduate/index.html`
- `graduate/index.html` → DGIST: `dgist/`
- `graduate/index.html` → 서울대학교: `snu/`
- `graduate/index.html` → KAIST: `kaist/`
- `graduate/index.html` → POSTECH: `postech/`
- `graduate/index.html` → 첫 화면: `../index.html`
- 학교별 원본 HTML에 이미 포함된 `../` 학교 선택 링크는 유지했습니다.

모든 통합 내비게이션은 저장소명이 바뀌어도 작동하도록 상대경로를 사용했습니다.

## 4. 원본 보존 방식

- 인턴 HTML은 올바른 GoatCounter가 이미 1회 들어 있어 파일 내용을 바꾸지 않고 그대로 복사했습니다.
- 학교별 HTML은 추천 로직, 내부 DB, intent classifier, 배너 query, fallback, 문구와 UI를 변경하지 않았습니다.
- 학교별 HTML에서 기존 비활성 `YOUR_GOATCOUNTER_CODE` 로더가 있던 경우 해당 카운터 블록만 제거한 뒤 지정된 정적 GoatCounter 코드를 `</head>` 바로 앞에 삽입했습니다.
- DGIST 대학원 HTML에는 지정된 GoatCounter 코드만 추가했습니다.
- 학교별 원본에 이미 있던 상단 학교 선택 링크는 유지했으며 별도의 구조 변경은 하지 않았습니다.

## 5. GoatCounter 적용 및 기존 카운트 유지

모든 7개 HTML에 아래 주소가 정확히 1회 적용됩니다.

```html
<!-- GoatCounter: privacy-friendly pageview counter. Counts pageviews only. -->
<script data-goatcounter="https://dgist-intern-match.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```

- 새 GoatCounter 사이트를 만들지 않았습니다.
- 기존 `dgist-intern-match.goatcounter.com`을 계속 사용하므로 기존 누적 기록과 같은 대시보드에 새 플랫폼 접속 기록이 이어집니다.
- `goatcounter.count(...)` 또는 버튼 클릭 이벤트 추적 코드는 넣지 않았습니다.
- 정상적인 pageview 집계만 사용합니다.

## 6. 경로별 통계 해석

사용자 사이트 루트 또는 사용자 지정 도메인에 배포하면 다음 path로 구분됩니다.

- `/`
- `/intern/`
- `/graduate/`
- `/graduate/dgist/`
- `/graduate/snu/`
- `/graduate/kaist/`
- `/graduate/postech/`

**중요:** 일반적인 GitHub Pages 프로젝트 저장소로 배포하면 실제 `location.pathname` 앞에 저장소명이 붙을 수 있습니다. 예를 들어 저장소명이 `LAB-MATCH-AI`이면 `/LAB-MATCH-AI/graduate/dgist/`처럼 표시될 수 있습니다. 그래도 각 서비스는 path suffix로 구분할 수 있습니다.

GoatCounter의 pageview와 순 방문자 수는 같은 지표가 아닙니다. 한 사용자가 여러 페이지를 보거나 재방문하면 pageview가 증가할 수 있습니다. 따라서 보고서와 자기소개서에는 검증된 대시보드 수치를 기준으로 다음처럼 표현하는 편이 안전합니다.

- `누적 페이지뷰 @@@회`
- `누적 접속 @@@회`

고유 방문자 지표를 별도로 확인하지 않았다면 `@@@명이 방문`이라고 단정하지 않는 것이 안전합니다. 기존 약 200명 이상 기록을 유지하려면 이번 결과처럼 기존 GoatCounter 주소를 계속 사용해야 합니다.

## 7. 파일 해시와 변경 범위

| 서비스 | 원본 SHA-256 | 최종 SHA-256 | 처리 |
|---|---|---|---|
| intern | `6e9cdc16efe0fec15519554288d1202f71954d46fbbf23a622accdeb0b83b021` | `6e9cdc16efe0fec15519554288d1202f71954d46fbbf23a622accdeb0b83b021` | 원본 바이트 그대로 복사, 기존 올바른 GoatCounter 1회 유지 |
| dgist | `f808d3e0054cf8fe918bfd82419e9bd679e75cd4cd4ef0b5063d26e1061fead7` | `8622c41d391cdc2ade5abaa675bc8e959d6eb2f0a099a83824d97018d44cd2ba` | 추천 로직과 데이터는 유지하고 head의 GoatCounter 블록만 표준화 |
| snu | `e02a9779cc76f283b6e0208cf21e2ab6d34515a1e5db6a94ea6ec1584e2e5988` | `d117e1dd78b060bc72b4eae6258fc72a3ac0fff5f16086208996ab60f676786f` | 추천 로직과 데이터는 유지하고 head의 GoatCounter 블록만 표준화 |
| kaist | `56b8a8173622f9bc8d5eeb5d535d2ca1fce20fbeb97dac3eb4a3a49b48892509` | `5ea2486a2ddcad61612684a87d24b9f0b01a3eeaaa1a5befbca14a13a4f1a88a` | 추천 로직과 데이터는 유지하고 head의 GoatCounter 블록만 표준화 |
| postech | `caa7a76170e517762a397f5dffd8f8947f9b935b7e9341609dc73e86f336acf7` | `0547ecdd571831257026350e2c7547e3959d8ed3790f68716945217dd4b9bb5c` | 추천 로직과 데이터는 유지하고 head의 GoatCounter 블록만 표준화 |


## 8. 검사 결과

| 검사 항목 | 결과 |
|---|---|
| 필수 파일 10개 존재 | 통과 |
| 루트 → 인턴 링크 | 통과 |
| 루트 → 대학원 링크 | 통과 |
| 대학원 선택 → 4개 학교 링크 | 통과 |
| 학교별 `../` 학교 선택 복귀 링크 | 통과 |
| 7개 HTML GoatCounter 지정 주소 1회 | 통과 |
| 7개 HTML `count.js` 로더 1회 | 통과 |
| GoatCounter 코드가 `</head>` 바로 앞 | 통과 |
| `goatcounter.count(...)` 클릭 추적 부재 | 통과 |
| 인라인 JavaScript 문법 검사 | 통과, Node.js `--check` 7개 스크립트 |
| 내장 JSON 파싱 검사 | 통과, 5개 JSON 블록 |
| 로컬 HTTP 7개 경로 응답 | 모두 200 |
| 핵심 기능 문구 존재 여부 | 통과 |
| ZIP CRC 무결성 검사 | 통과 |

### 핵심 기능 표식 확인

- DGIST: `관련 교수님`, `분 더보기`, `인접 분야 교수님 보기`, `Algorithm5`, `인턴 업무`, `대표 분야`가 최종 HTML에 존재합니다.
- 서울대학교, KAIST, POSTECH: `관련 교수님`, `분 더보기`, `인접 분야 교수님 보기`, `Algorithm5`가 최종 HTML에 존재합니다.
- 이 검사는 원본 기능 표식이 사라지지 않았는지를 확인하는 정적 검사이며, 추천 결과의 학술적 적합성을 재평가하거나 알고리즘을 변경한 검사는 아닙니다.

## 9. JavaScript 및 데이터 검사

- 브라우저 실행용 인라인 JavaScript 7개를 추출해 Node.js `--check`로 검사했으며 문법 오류가 없었습니다.
- `application/json` 데이터 블록 5개를 JSON 파서로 검사했으며 파싱 오류가 없었습니다.
- 신규 루트 화면과 대학원 학교 선택 화면은 순수 HTML 링크로 구성하여 별도의 클릭 JavaScript나 이벤트 추적 코드를 사용하지 않았습니다.

## 10. ZIP 무결성 검사 결과

- ZIP 파일명: `LAB_MATCH_AI_integrated_platform_final.zip`
- ZIP 내부 파일 수: 10개
- ZIP SHA-256은 압축 내용에 보고서 자체가 포함되어 있어 보고서 내부에 고정값으로 기록하지 않았습니다. 최종 전달 파일은 별도 무결성 검사에서 확인했습니다.
- `ZipFile.testzip()` 결과: 손상 파일 없음
- ZIP을 열면 `index.html`, `intern/`, `graduate/`, `README.md`, `.nojekyll`이 바로 보이도록 상위 중첩 폴더 없이 압축했습니다.

## 11. GitHub Pages 업로드 방법 요약

1. `LAB_MATCH_AI_integrated_platform_final.zip`을 압축 해제합니다.
2. 압축 해제 폴더 안의 내용 전체를 GitHub 저장소 최상위에 업로드합니다. `LAB_MATCH_AI_integrated_platform/` 폴더 자체가 저장소 안에 한 단계 더 들어가지 않도록 합니다.
3. 저장소의 `Settings → Pages`에서 `Deploy from a branch`, `main`, `/(root)`를 선택합니다.
4. 배포 주소에서 첫 화면, 인턴 서비스, 대학원 학교 선택, 네 학교 페이지를 차례로 열어 확인합니다.
5. GoatCounter 대시보드에서 실제 배포 URL의 path가 분리되어 기록되는지 확인합니다.

## 12. 남은 확인 필요 사항

- 이 작업 환경에서는 외부 공개 GitHub Pages 주소로 실제 배포할 수 없으므로, 배포 후 스마트폰 iOS 및 Android에서 최종 실기기 확인이 필요합니다.
- GoatCounter 기록은 로컬 파일이나 로컬 검사만으로 대시보드 반영을 확정할 수 없습니다. 실제 GitHub Pages 배포 후 각 경로를 1회씩 열고 대시보드 path를 확인해야 합니다.
- 프로젝트형 GitHub Pages 주소에서는 저장소명 접두사가 path에 포함될 수 있습니다. 사용자가 기대한 `/graduate/dgist/` 대신 `/저장소명/graduate/dgist/`로 표시되는 것은 정상일 수 있습니다.
- 방문자 수와 pageview는 다릅니다. 자기소개서에 사용하기 전 GoatCounter 대시보드의 지표 이름과 기간을 함께 확인해야 합니다.

## 13. 최종 판정

정적 구조, 상대경로, 원본 파일 선택, GoatCounter 1회 적용, 클릭 추적 부재, JavaScript 문법, 내장 JSON, 로컬 HTTP 응답 및 ZIP 무결성 검사를 모두 통과했습니다.
