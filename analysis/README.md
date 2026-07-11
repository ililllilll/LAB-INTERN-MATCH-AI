# LAB MATCH AI GoatCounter 분석기

GoatCounter JSON export ZIP의 집계형 `paths.jsonl`, `hit_stats.jsonl`만 사용합니다. 검색어 원문, 사용자 ID, IP, 개인별 이동 경로는 필요하지 않습니다.

## 기준 구간 분석

GoatCounter는 시간 단위 집계이므로 2026년 7월 10일 19시 36분 공개 직후 24분은 정확히 분리할 수 없습니다. 엄격한 공개 후 분석은 다음 정각인 20시부터 시작합니다.

```bash
python analysis/goatcounter_analysis.py goatcounter-export.zip \
  --output analysis_result \
  --timezone Asia/Seoul \
  --start-kst 2026-07-10T20:00 \
  --end-kst 2026-07-12T01:00
```

## 수정 전후 비교

```bash
python analysis/goatcounter_analysis.py goatcounter-export.zip \
  --output before_after_result \
  --timezone Asia/Seoul \
  --start-kst 2026-07-10T20:00 \
  --end-kst 2026-07-26T01:00 \
  --split-kst 2026-07-12T01:30
```

`split-kst`에는 실제 수정본 배포 시각을 입력합니다.

## 생성 파일

- `school_summary.csv`: 학교 및 서비스별 검색·0개·공식 링크·심화 탐색
- `intent_summary.csv`: 학교와 익명 분야별 결과 분포
- `query_source_summary.csv`: 배너/직접 입력 및 입력 길이별 결과 분포
- `service_choice_summary.csv`, `school_choice_summary.csv`: 선택 비중
- `query_recovery_summary.csv`: 자동 보강과 분야 선택 복구 성과
- `normalized_pageviews.csv`: `/index.html` 변형을 합친 페이지뷰
- `event_counts.csv`: 전체 이벤트
- `unparsed_events.csv`: 아직 문서화되지 않은 이벤트
- `hourly_counts.csv`: 한국시간 시간대별 페이지뷰와 이벤트
- `before_after.csv`: 수정 전후 핵심 비율과 검정 결과
- `analysis_report.md`: 요약 보고서

## 개인정보 원칙

분석 결과는 항상 `학생 수`가 아니라 `검색 이벤트 수`, `클릭 이벤트 수`로 표현합니다. 검색어 원문은 분석 파일에도 존재하지 않습니다.
