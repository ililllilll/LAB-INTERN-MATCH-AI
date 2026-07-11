# LAB MATCH AI 이용 통계 설계 가이드

## 1. 결론

기존 이벤트만으로는 서비스 선택률, 학교 선택 비중, 결과 0개 비율, 더보기 사용량, 외부 링크 클릭량은 분석할 수 있었습니다. 그러나 아래 두 분석은 불가능했습니다.

1. 어느 연구 분야에서 검색 실패가 많은지
2. 서비스 수정 후 이용 만족도가 실제로 개선됐는지

이번 버전에서는 이를 보완하기 위해 다음 기능을 추가했습니다.

- 검색어 원문을 전송하지 않는 익명 분야 분류
- 검색 결과별 `도움이 됐어요`, `아쉬워요` 익명 피드백
- GoatCounter JSON export를 이용하는 Python 분석기

## 2. 개인정보 보호 원칙

추가 이벤트는 다음 정보를 수집하지 않습니다.

- 검색어 원문
- 이름, 이메일, 학번, 전화번호
- 사용자 ID 또는 자체 생성 식별자
- 교수명, 기업명
- 개인별 전체 이동 경로

검색어는 사용자의 브라우저 안에서 아래처럼 넓은 범주로만 분류된 뒤 범주명만 GoatCounter로 전송됩니다.

```text
semiconductor
battery
ai-data
bio-medical
photonics-display
robotics-control
hci-ux
quantum
computer-systems
materials-chemistry
energy-environment
mechanical-aerospace
other
```

예를 들어 `고체전해질 기반 전고체전지`를 입력해도 GoatCounter에는 원문이 아니라 `battery`만 기록됩니다.

## 3. 수집 변수

| 변수 | 값 예시 | 분석 목적 |
|---|---|---|
| `page_path` | `/LAB-INTERN-MATCH-AI/graduate/kaist/` | 페이지별 이용량 |
| `service_choice` | `intern`, `graduate`, `field` | 인턴, 학교별 연구실, 분야별 통합 연구실 수요 비교 |
| `school_choice` | `dgist`, `snu`, `kaist`, `postech` | 학교 관심도 비교 |
| `action_type` | `search`, `more`, `adjacent`, `homepage`, `profile`, `job-open` | 기능 사용 분석 |
| `intent_category` | `battery`, `bio-medical`, `hci-ux` | 분야별 검색 품질 분석 |
| `input_length_bucket` | `empty`, `short`, `medium`, `long`, `preset` | 입력 방식 분석 |
| `result_count_bucket` | `0`, `1-3`, `4-10`, `11-plus` | 검색 실패 및 결과 과다 분석 |
| `result_rank_bucket` | `1-3`, `4-10`, `11-plus` | 추천 순위별 클릭 분석 |
| `feedback` | `helpful`, `not-helpful` | 익명 만족도 분석 |
| `feedback_prompt` | 학교, 분야, 결과 수 구간 | 피드백 응답률 계산 |
| `filter_type` | `season`, `eligibility`, `source` | 인턴 필터 활용 분석 |
| `navigation_type` | `back-home`, `back-school`, `school-select` | 화면 이동 분석 |

## 4. 주요 GoatCounter 이벤트

모든 이벤트는 `lm-`으로 시작합니다.

```text
lm-nav-home-intern
lm-nav-home-graduate
lm-nav-home-field
lm-nav-school-dgist
lm-nav-school-snu
lm-nav-school-kaist
lm-nav-school-postech
lm-lab-major-field-electrical
lm-search-outcome-field-banner-i-semiconductor-q-preset-r-11-plus

lm-search-outcome-dgist-manual-i-bio-medical-q-short-r-1-3
lm-search-outcome-postech-banner-i-hci-ux-q-preset-r-11-plus

lm-feedback-prompt-dgist-i-bio-medical-src-manual-r-1-3
lm-feedback-dgist-helpful-i-bio-medical-src-manual-r-1-3
lm-feedback-dgist-not-helpful-i-bio-medical-src-manual-r-1-3

lm-lab-more-direct-snu
lm-lab-show-adjacent-postech
lm-lab-homepage-kaist-rank-1-3
lm-lab-profile-snu-rank-4-10
lm-intern-job-open-rank-1-3
```

## 5. 분석 가능한 시나리오

### A. 서비스 및 학교 수요

```text
인턴 선택 비중
= 인턴 선택 이벤트 / 세 서비스 선택 이벤트 합계

분야별 통합 추천 선택 비중
= 분야별 통합 추천 선택 이벤트 / 세 서비스 선택 이벤트 합계

KAIST 선택 비중
= KAIST 선택 이벤트 / 네 학교 선택 이벤트 합계
```

### B. 학교별 및 분야 중심 통합 검색 실패율

```text
DGIST 바이오 검색 실패율
= DGIST + bio-medical + 결과 0개 이벤트
  / DGIST + bio-medical 전체 검색 결과 이벤트
```

학교별 페이지에서는 학교와 익명 분야를 함께 보고, 분야별 통합 페이지에서는 네 대학을 합친 상태에서 특정 분야의 결과 부족이나 과다를 확인할 수 있습니다.

### C. 결과 과다 및 오탐 가능성

```text
결과 과다 비율
= 결과 11개 이상 이벤트 / 전체 검색 결과 이벤트
```

특정 학교와 분야에서 11개 이상 비율이 지나치게 높고 `아쉬워요` 비율도 높다면 넓은 키워드의 점수가 과도하게 작동하는지 확인할 수 있습니다.

### D. 추천 결과 행동 전환

```text
연구실 외부 링크 클릭량
= 홈페이지 클릭 + 공식 프로필 클릭

인턴 공고 클릭량
= 공고 URL 클릭
```

개별 사용자 전환율이 아니라 `검색 100회당 외부 링크 클릭 수`로 해석해야 합니다. 반복 클릭이 포함될 수 있기 때문입니다.

### E. 탐색 깊이

```text
심화 탐색 행동
= 직접 결과 더보기 + 인접 분야 보기 + 카드 상세정보 열기
```

검색 100회당 심화 탐색 행동을 비교해 사용자가 결과를 추가로 비교하는지 확인할 수 있습니다.

### F. 익명 만족도

```text
도움 비율
= 도움이 됐어요 / 전체 피드백 응답

피드백 응답률
= 전체 피드백 응답 / 피드백 질문 표시 횟수
```

도움 비율은 자발적으로 응답한 이용자에 한정된 지표이므로 검색 실패율, 결과 과다 비율 및 외부 링크 클릭량과 함께 해석합니다.

## 6. 개선 시나리오

### 1단계: 기준 데이터 수집

배포 후 1~2주 동안 다음을 수집합니다.

- 학교 및 분야별 검색 횟수
- 결과 0개 비율
- 결과 11개 이상 비율
- 검색 100회당 공식 링크 클릭 수
- 검색 100회당 심화 탐색 행동 수
- 도움 비율

### 2단계: 문제 구간 탐색

예시:

```text
DGIST bio-medical
검색 80회
결과 0개 비율 31%
도움 비율 52%

DGIST semiconductor
검색 120회
결과 0개 비율 4%
도움 비율 84%
```

결론:

> DGIST 서비스 전체의 문제가 아니라 바이오 분야의 검색 사전 또는 내부 DB가 상대적으로 부족한 것으로 판단했습니다.

### 3단계: 서비스 수정

- 실패율이 높은 분야의 동의어 보강
- 결과 0개일 때 인접 분야 안내 개선
- 결과 과다 분야의 넓은 키워드 가중치 축소
- 공식 링크 클릭이 낮으면 버튼 명칭과 위치 개선
- 사용량이 높은 대표 분야를 배너 앞쪽으로 이동

### 4단계: 수정 전후 비교

동일한 기간을 비교합니다.

```text
수정 전 DGIST bio-medical 결과 0개 비율: 31%
수정 후 DGIST bio-medical 결과 0개 비율: 13%

수정 전 도움 비율: 52%
수정 후 도움 비율: 78%
```

Python 분석기는 `--split-date` 옵션을 사용하면 전후 차이와 결과 0개 비율, 도움 비율의 두 비율 검정 결과를 생성합니다.

## 7. GoatCounter 데이터 사용 방법

사용 가능한 데이터 원천은 기존 대시보드 하나로 유지됩니다.

```text
https://dgist-intern-match.goatcounter.com/
```

대시보드에서는 이벤트별 횟수를 바로 볼 수 있습니다. Python 분석에는 GoatCounter의 JSON export를 사용합니다. JSON export는 시간대별 집계 데이터이므로 개별 방문자 데이터가 필요하지 않습니다.

실행 방법은 `analysis/README.md`에 정리되어 있습니다.

## 8. 자기소개서 흐름

> LAB MATCH AI를 배포한 뒤 단순 조회수만으로는 사용자가 어디에서 불편을 겪는지 알 수 없었습니다. 이에 개인정보와 검색어 원문을 수집하지 않고, 학교와 익명 분야 범주, 결과 수 구간, 공식 링크 이동 및 익명 만족도만 집계하는 이벤트 체계를 설계했습니다. GoatCounter의 집계 데이터를 Python으로 분석한 결과, ○○학교의 ○○ 분야에서 결과 0개 비율이 상대적으로 높고 도움 비율이 낮음을 확인했습니다. 동의어 사전과 추천 UI를 수정한 뒤 동일 기간을 비교해 결과 0개 비율을 ○○%에서 ○○%로 낮추고 도움 비율을 ○○%에서 ○○%로 높였습니다. 이를 통해 전체 평균이 아닌 조건별 데이터를 세분화해 이상 구간을 찾고, 개선 전후 지표로 효과를 검증하는 데이터 기반 문제 해결 경험을 쌓았습니다.

실제 데이터가 쌓이기 전에는 숫자를 작성하지 않습니다.

## 9. 해석상 주의사항

- pageview, 검색 및 클릭은 서로 다른 지표입니다.
- 사용자 식별자를 만들지 않으므로 개인별 퍼널을 재구성할 수 없습니다.
- `몇 명이 클릭했다`가 아니라 `클릭 이벤트가 몇 회 발생했다`라고 표현해야 합니다.
- 외부 링크 클릭은 반복 클릭을 포함할 수 있습니다.
- 도움 비율은 자발적 응답 편향이 있을 수 있습니다.
- 광고 차단기가 GoatCounter를 막으면 일부 데이터가 누락될 수 있습니다.

## 10. 분야별 통합 연구실 추천 추가 지표

- `lm-nav-home-field`: 첫 화면에서 분야별 연구실 추천 선택
- `lm-lab-major-field-*`: 화학, 전기전자, 물리 등 큰 분야 선택
- `lm-lab-banner-field-*`: 세부 분야 선택
- `lm-search-outcome-field-*`: 분야별 통합 검색 직후 표시 결과 수 구간
- `lm-lab-homepage-field-rank-*`, `lm-lab-profile-field-rank-*`: 통합 결과의 공식 링크 이동
- `lm-feedback-field-*`: 통합 결과 만족도

학교별 추천과 분야별 통합 추천의 검색 100회당 외부 링크 클릭 수, 결과 0개 비율과 도움 비율을 비교하면 사용자가 학교를 먼저 선택하는 방식과 분야를 먼저 선택하는 방식 중 어느 경로에서 더 원활하게 탐색하는지 확인할 수 있습니다. 개인별 전환율이나 동일 사용자 비교로 해석하지 않습니다.
