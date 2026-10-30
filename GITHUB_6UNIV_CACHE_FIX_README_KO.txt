LAB MATCH AI 6개 대학 간접 추천 — 브라우저 JSON 캐시 수정

발견된 현상:
- GitHub 최신 ZIP에서 물리학 > 양자과학 데이터는 55명 (GIST 8명, UNIST 15명)
- 사용자가 본 32명 목록은 이전 4개 대학 버전의 양자과학 데이터 수와 일치
- 원인 후보: 기존 runtime-loader.js의 force-cache 요청으로 구버전 JSON 재사용

수정 사항:
1. component-manifest.json을 매번 재검증(no-cache)
2. 매니페스트에 기록된 SHA-256을 개별 데이터 JSON 요청 URL의 v 파라미터에 사용
3. 페이지에서 runtime-loader.js, graduate-app.js의 파일 버전 식별자 변경
4. GIST/UNIST 교수 DB, 기존 16개 대분야, 247개 세부 분야, 1993명 ID 모두 변경하지 않음
5. 학교별 상세 검색, 기존 서비스 기능 변경하지 않음

업로드 방법:
- 폴더 안의 파일 전체를 GitHub Desktop 저장소 루트에 덮어쓰기
- Commit to main -> Push origin
- Actions에서 Pages build and deployment success 확인 후 Ctrl+Shift+R
- 물리학 > 양자과학에서 55명과 GIST/UNIST 배지가 표시되는지 확인

주의: 실제 GitHub Pages 접속 브라우저 동작의 최종 확인은 별도 필요.
