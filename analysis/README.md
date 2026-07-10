# GoatCounter 데이터 Python 분석 방법

이 분석기는 GoatCounter의 **JSON export**를 사용합니다. JSON export는 시간대별 집계 통계를 제공하므로, `Individual pageviews`를 켜거나 사용자별 세션 데이터를 받을 필요가 없습니다.

## 1. GoatCounter에서 자료 받기

1. `https://dgist-intern-match.goatcounter.com/`에 로그인합니다.
2. Export 메뉴에서 JSON 형식을 선택합니다.
3. 분석 기간을 지정해 ZIP을 내려받습니다.

## 2. 분석 실행

```powershell
python analysis/goatcounter_analysis.py goatcounter-export.zip --output outputs
```

서비스 수정일을 기준으로 전후 비교하려면 다음처럼 실행합니다.

```powershell
python analysis/goatcounter_analysis.py goatcounter-export.zip --output outputs --split-date 2026-07-20
```

## 3. 생성 파일

- `school_summary.csv`: 학교별 검색 실패율, 공식 링크 클릭, 만족도
- `intent_summary.csv`: 학교 및 익명 분야 범주별 결과 분포와 만족도
- `event_counts.csv`: 이벤트별 총 횟수
- `daily_event_counts.csv`: 날짜별 이벤트 횟수
- `before_after.csv`: 수정 전후 지표와 두 비율 검정, `--split-date` 사용 시 생성
- `analysis_report.md`: 핵심 결과 요약

## 개인정보 보호

분석에 사용하는 이벤트에는 검색어 원문, 이름, 학번, 이메일, 전화번호, 교수명 및 사용자 ID가 포함되지 않습니다. 검색어는 브라우저 안에서 넓은 분야 범주로만 변환됩니다.
