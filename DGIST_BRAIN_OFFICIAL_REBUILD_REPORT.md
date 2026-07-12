# DGIST 뇌과학과 공식 자료 기반 재구축 보고서

## 1. 작업 범위

기준 파일: `LAB_MATCH_AI_DGIST_EECS_Official_Curated_Final(1).zip`

이번 작업은 DGIST 학교별 연구실 추천 중 **뇌과학과만** 재구축했다.

원본 `graduate/dgist/data.js`는 수정하지 않고 다음 두 파일을 추가했다.

- `graduate/dgist/brain-curated-db.js`
- `graduate/dgist/brain-search-engine.js`

뇌과학과를 선택했을 때만 정제 DB와 전용 검색기가 적용된다. 로봇및기계전자공학과, 전기전자컴퓨터공학과, 다른 DGIST 학과, 다른 학교와 인턴 추천은 기존 로직을 유지한다.

## 2. 공식 근거

- DGIST 뇌과학과 교수진: https://www.dgist.ac.kr/prog/peopleProfsr/brain/sub02_01/list.do
- DGIST Scholar 연구자·연구실 페이지
- 각 교수 공식 연구실 홈페이지

현재 DGIST 뇌과학과 전임교원 20명을 기준으로 정리했다.

## 3. 해결한 문제

### 직접 검색 0개

- `학습 기억` → 박포정, 현정호, 이광 교수
- `BMI` → 이광 교수
- `축삭재생` → 조용철 교수

### 신경회로 누락

`신경회로` 검색에서 고재원, 이광, 김규형, 김민환, 이효상, 백명인 등 회로 연구 교수가 함께 표시되도록 수정했다.

### 잘린 연구실명

아래와 같이 완전한 명칭으로 교체했다.

- `Laboratory of Animal` → `Laboratory of Animal Behavior and Circadian Rhythm`
- `Laboratory of Synapse and` → `Laboratory of Synapse and Circuits Dynamics`
- `Laboratory of Locomotor` → `Locomotor NeuroCircuit Lab`
- `Laboratory of Neuronal Cell` → `Laboratory of Neuronal Cell Death`
- `Laboratory of Protein` → `Protein Biophysics and Computational Neuroscience Laboratory`
- `Laboratory of Axon` → `Laboratory of Axon Regeneration and Degeneration`
- `Laboratory of Structural` → `Laboratory of Structural Learning and Neuromodulation`
- 빈 연구실명도 공식 연구 분야에 맞는 완전한 표시명으로 보완했다.

## 4. 재구성한 배너

총 12개:

1. 신경회로·행동
2. 학습·기억·시냅스
3. 감각·후각·생체리듬
4. 정서·스트레스·정신질환
5. 뇌대사·비만·당뇨
6. 뇌질환·신경퇴행
7. 축삭재생·신경손상
8. 계산신경과학·BMI
9. 신경생리·이온채널
10. 구조생물학·단백질
11. 운동회로·신경발생
12. 환경생명·생분해

모든 배너는 공식 연구 분야를 확인한 교수 목록에 직접 연결했다.

## 5. 핵심 검색 검증

15개 핵심 검색어 검증: **15/15 통과**

- 배너 결과 0개: **0개**
- 배너 과다 후보 10명 초과: **0개**
- `BMI`에서 유우경·현정호 교수 오추천 제거
- `후각`에서 생체리듬·정서 연구실 오추천 제거
- `뇌대사`에서 미세플라스틱 연구실 오추천 제거

## 6. 교수별 직접 검색어 회귀검사

총 **280개** 직접 검색어를 검사했다.

- 해당 교수 1위: **248/280 (88.6%)**
- 상위 3위: **280/280 (100.0%)**
- 상위 5위: **280/280 (100.0%)**
- 상위 10위: **280/280 (100.0%)**
- 완전 누락: **0개**

이 수치는 실제 사용자 만족도가 아니라 배포 전 내부 정답 검색 회귀검사 결과다.

## 7. 보존 확인

업로드 원본과 SHA-256을 비교해 다음 파일은 동일함을 확인했다.

- `graduate/dgist/data.js`
- `analytics.js`
- 로봇기계학과 정제 DB와 검색기
- 전전컴 정제 DB와 검색기

따라서 기존 GoatCounter 이벤트 이름과 개인정보 동의 구조는 유지된다.

## 8. 배포 후 확인할 항목

- 뇌과학과 결과 0개 비율
- 뇌과학과 검색 100회당 공식 링크 클릭
- 12개 배너별 선택과 공식 링크 클릭
- `other` 분야 및 짧은 직접 검색의 결과 0개 비율

배포 정확한 한국시간을 기록해야 수정 전후 통계를 나눌 수 있다.
