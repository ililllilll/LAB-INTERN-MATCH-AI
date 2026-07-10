(function () {
  'use strict';

  const EVENT_PREFIX = 'lm';
  const queue = [];
  let flushTimer = null;
  let latestSearchContext = null;
  let searchSequence = 0;

  const INTENT_RULES = [
    ['hci-ux', ['hci', 'ux', 'ui', '사용자경험', '사용자 경험', '인터랙션', 'interaction', 'human computer', '인간컴퓨터', '가상현실', '증강현실', 'vr', 'ar']],
    ['quantum', ['양자', 'quantum', '큐비트', 'qubit', '초전도 큐비트', '양자컴퓨팅', '양자정보']],
    ['battery', ['배터리', 'battery', '이차전지', '전고체', '고체전해질', '리튬이온', '리튬 금속', '전극', '양극재', '음극재', '전해질']],
    ['bio-medical', ['바이오', 'bio', '생체', '의료', 'medical', 'biomedical', '세포', '유전체', '단백질', '신경', '뇌', 'brain', 'neural', '헬스케어', 'biosensor', '바이오센서', '의료영상', 'ct', 'mri']],
    ['photonics-display', ['광학', '광자', 'photon', '포토닉', 'laser', '레이저', 'led', 'oled', '디스플레이', 'display', '광전', 'opto', '이미징', 'imaging']],
    ['robotics-control', ['로봇', 'robot', '제어', 'control', '자율주행', '드론', '매니퓰레이터', '모션', 'mechatronics', '메카트로닉스']],
    ['ai-data', ['인공지능', 'artificial intelligence', '머신러닝', 'machine learning', '딥러닝', 'deep learning', '데이터', 'data', '컴퓨터비전', 'computer vision', '자연어', 'nlp', '생성형 ai', 'ai']],
    ['computer-systems', ['컴파일러', 'compiler', '운영체제', 'os', '시스템', 'system', '임베디드', 'embedded', '보안', 'security', '네트워크', 'network', '소프트웨어', 'software', '알고리즘', 'algorithm', '반도체 설계 자동화', 'eda']],
    ['semiconductor', ['반도체', 'semiconductor', '소자', 'device', '공정', 'process', '집적회로', 'ic', 'cmos', 'mosfet', '트랜지스터', 'transistor', '패키징', 'packaging', '3d ic', '나노전자']],
    ['materials-chemistry', ['소재', 'material', '재료', '화학', 'chemistry', '고분자', 'polymer', '촉매', 'catalyst', '나노소재', '박막', 'thin film', '세라믹', '금속']],
    ['energy-environment', ['에너지', 'energy', '태양전지', 'solar', '수소', 'hydrogen', '연료전지', 'fuel cell', '환경', 'environment', '탄소', 'carbon', '전기화학']],
    ['mechanical-aerospace', ['기계', 'mechanical', '항공', 'aerospace', '열유체', '유체', 'fluid', '구조', 'structure', '제조', 'manufacturing', '설계', 'design']]
  ];

  function pageKey() {
    const path = String(window.location.pathname || '').toLowerCase();
    if (path.includes('/graduate/dgist')) return 'dgist';
    if (path.includes('/graduate/snu')) return 'snu';
    if (path.includes('/graduate/kaist')) return 'kaist';
    if (path.includes('/graduate/postech')) return 'postech';
    if (path.includes('/graduate')) return 'graduate';
    if (path.includes('/intern')) return 'intern';
    return 'home';
  }

  function safeToken(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 140) || 'unknown';
  }

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\s_/.,;:()[\]{}+]+/g, ' ')
      .trim();
  }

  function intentCategory(value) {
    const text = normalizeText(value);
    if (!text || text === '__preset__') return 'other';

    let bestName = 'other';
    let bestScore = 0;
    for (const [name, terms] of INTENT_RULES) {
      let score = 0;
      for (const term of terms) {
        const normalizedTerm = normalizeText(term);
        if (!normalizedTerm) continue;
        const isShortAscii = /^[a-z0-9]+$/.test(normalizedTerm) && normalizedTerm.length <= 2;
        const matched = isShortAscii
          ? new RegExp('(^|[^a-z0-9])' + normalizedTerm + '([^a-z0-9]|$)').test(text)
          : text.includes(normalizedTerm);
        if (matched) score += Math.max(1, normalizedTerm.length);
      }
      if (score > bestScore) {
        bestScore = score;
        bestName = name;
      }
    }
    return bestName;
  }

  function queryLengthBucket(value, preset) {
    if (preset) return 'preset';
    const length = String(value || '').trim().length;
    if (length === 0) return 'empty';
    if (length <= 10) return 'short';
    if (length <= 30) return 'medium';
    return 'long';
  }

  function resultCountBucket(count) {
    if (!count) return '0';
    if (count <= 3) return '1-3';
    if (count <= 10) return '4-10';
    return '11-plus';
  }

  function isVisible(element) {
    if (!element) return false;
    if (element.closest('[hidden], .is-hidden')) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  }

  function rankBucket(element) {
    const page = pageKey();
    const selector = page === 'intern' ? '#cards .card' : '.lab-card';
    const card = element && element.closest ? element.closest(page === 'intern' ? '.card' : '.lab-card') : null;
    if (!card) return 'unknown';
    const visibleCards = Array.from(document.querySelectorAll(selector)).filter(isVisible);
    const rank = visibleCards.indexOf(card) + 1;
    if (rank <= 0) return 'unknown';
    if (rank <= 3) return '1-3';
    if (rank <= 10) return '4-10';
    return '11-plus';
  }

  function currentResultCount() {
    const page = pageKey();
    const selector = page === 'intern' ? '#cards .card' : '.lab-card';
    return Array.from(document.querySelectorAll(selector)).filter(isVisible).length;
  }

  function flushQueue() {
    if (!window.goatcounter || typeof window.goatcounter.count !== 'function') return;
    while (queue.length) {
      window.goatcounter.count(queue.shift());
    }
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }

  function track(name, title) {
    const eventName = safeToken(EVENT_PREFIX + '-' + name);
    const payload = {
      path: eventName,
      title: String(title || eventName).slice(0, 180),
      event: true,
      no_session: true,
      referrer: window.location.pathname || '/'
    };

    if (window.goatcounter && typeof window.goatcounter.count === 'function') {
      window.goatcounter.count(payload);
      return;
    }

    queue.push(payload);
    if (!flushTimer) {
      flushTimer = setInterval(flushQueue, 100);
      setTimeout(function () {
        if (flushTimer) {
          clearInterval(flushTimer);
          flushTimer = null;
        }
        queue.length = 0;
      }, 5000);
    }
  }

  function ensureFeedbackStyles() {
    if (document.getElementById('lm-feedback-styles')) return;
    const style = document.createElement('style');
    style.id = 'lm-feedback-styles';
    style.textContent = `
      .lm-feedback{margin:16px 0;padding:15px 16px;border:1px solid #dfe5f1;border-radius:16px;background:#f8faff;color:#24324a;box-shadow:0 6px 18px rgba(20,40,90,.05)}
      .lm-feedback[hidden]{display:none!important}
      .lm-feedback-title{margin:0 0 5px;font-size:14px;font-weight:900;line-height:1.45}
      .lm-feedback-note{margin:0 0 11px;color:#667085;font-size:12px;line-height:1.55}
      .lm-feedback-actions{display:flex;gap:8px;flex-wrap:wrap}
      .lm-feedback-button{min-height:40px;padding:9px 12px;border:1px solid #cfd7e6;border-radius:11px;background:#fff;color:#344054;font:inherit;font-size:13px;font-weight:850;cursor:pointer}
      .lm-feedback-button:hover{border-color:#7896ff;background:#eef3ff;color:#173b9a}
      .lm-feedback-button:disabled{cursor:default;opacity:.58}
      .lm-feedback-thanks{margin:0;color:#3151a3;font-size:13px;font-weight:800}
      @media(max-width:640px){.lm-feedback-actions{display:grid;grid-template-columns:1fr 1fr}.lm-feedback-button{width:100%;min-height:44px}}
    `;
    document.head.appendChild(style);
  }

  function feedbackHost() {
    const page = pageKey();
    if (page === 'intern') {
      return document.querySelector('.main-panel .chat') || document.querySelector('.main-panel');
    }
    if (['dgist', 'snu', 'kaist', 'postech'].includes(page)) {
      return document.getElementById('chatFeed') || document.querySelector('.query-area');
    }
    return null;
  }

  function hideFeedback() {
    const existing = document.getElementById('lm-feedback');
    if (existing) existing.hidden = true;
  }

  function renderFeedback(context) {
    const host = feedbackHost();
    if (!host || !context || context.sequence !== searchSequence) return;
    ensureFeedbackStyles();

    let box = document.getElementById('lm-feedback');
    if (!box) {
      box = document.createElement('section');
      box.id = 'lm-feedback';
      box.className = 'lm-feedback';
      box.setAttribute('aria-live', 'polite');
      if (pageKey() === 'intern') host.parentNode.insertBefore(box, host);
      else host.insertAdjacentElement('afterend', box);
    }

    box.hidden = false;
    box.dataset.sequence = String(context.sequence);
    box.innerHTML = `
      <p class="lm-feedback-title">이 검색 결과가 탐색에 도움이 되었나요?</p>
      <p class="lm-feedback-note">검색어 원문, 이름, 학번 등 개인정보는 전송하지 않고 선택 결과만 집계합니다.</p>
      <div class="lm-feedback-actions">
        <button type="button" class="lm-feedback-button" data-lm-feedback="helpful">도움이 됐어요</button>
        <button type="button" class="lm-feedback-button" data-lm-feedback="not-helpful">아쉬워요</button>
      </div>
    `;

    track(
      'feedback-prompt-' + context.page + '-i-' + context.intent + '-src-' + context.source + '-r-' + context.resultBucket,
      context.page.toUpperCase() + ' 익명 만족도 질문 표시'
    );
  }

  function feedbackEvent(button) {
    const context = latestSearchContext;
    const box = button.closest('#lm-feedback');
    if (!context || !box || String(context.sequence) !== box.dataset.sequence) return null;
    if (box.dataset.submitted === '1') return null;

    box.dataset.submitted = '1';
    const value = button.dataset.lmFeedback === 'helpful' ? 'helpful' : 'not-helpful';
    box.querySelectorAll('button').forEach(function (item) { item.disabled = true; });
    const actions = box.querySelector('.lm-feedback-actions');
    if (actions) actions.innerHTML = '<p class="lm-feedback-thanks">응답이 반영되었습니다. 감사합니다.</p>';

    return [
      'feedback-' + context.page + '-' + value + '-i-' + context.intent + '-src-' + context.source + '-r-' + context.resultBucket,
      context.page.toUpperCase() + ' 익명 만족도: ' + value
    ];
  }

  function scheduleOutcome(source, queryValue, preset) {
    const page = pageKey();
    const context = {
      sequence: ++searchSequence,
      page: page,
      source: safeToken(source),
      queryBucket: queryLengthBucket(queryValue, Boolean(preset)),
      intent: intentCategory(queryValue),
      resultBucket: 'unknown',
      resultCount: 0
    };
    latestSearchContext = context;
    hideFeedback();

    setTimeout(function () {
      if (context.sequence !== searchSequence) return;
      const count = currentResultCount();
      context.resultCount = count;
      context.resultBucket = resultCountBucket(count);
      track(
        'search-outcome-' + page + '-' + context.source + '-i-' + context.intent + '-q-' + context.queryBucket + '-r-' + context.resultBucket,
        page.toUpperCase() + ' 검색 결과: ' + count + '개, 분야 ' + context.intent
      );
      renderFeedback(context);
    }, 400);
  }

  function classifyButton(button) {
    const page = pageKey();
    const id = button.id || '';

    if (button.dataset.lmFeedback) return feedbackEvent(button);

    if (id === 'searchBtn') {
      const value = document.getElementById('searchInput')?.value || '';
      const intent = intentCategory(value);
      scheduleOutcome('manual', value, false);
      return ['intern-search-submit-i-' + intent + '-q-' + queryLengthBucket(value, false), '인턴 검색 실행, 분야 ' + intent];
    }
    if (id === 'chatBtn') {
      const value = document.getElementById('chatInput')?.value || '';
      const intent = intentCategory(value);
      scheduleOutcome('chat', value, false);
      return ['intern-chat-submit-i-' + intent + '-q-' + queryLengthBucket(value, false), '인턴 질문 검색 실행, 분야 ' + intent];
    }
    if (id === 'askButton') {
      const value = document.getElementById('goalInput')?.value || '';
      const intent = intentCategory(value);
      scheduleOutcome('manual', value, false);
      return ['lab-search-submit-' + page + '-i-' + intent + '-q-' + queryLengthBucket(value, false), page.toUpperCase() + ' 연구실 추천 실행, 분야 ' + intent];
    }
    if (['resetBtn', 'resetButton', 'clearChatButton'].includes(id)) {
      hideFeedback();
      return ['reset-' + page, page.toUpperCase() + ' 초기화'];
    }

    if (button.closest('#categoryChips')) {
      const buttons = Array.from(button.parentElement?.querySelectorAll('.chip') || []);
      const index = Math.max(0, buttons.indexOf(button)) + 1;
      const label = button.textContent.trim();
      const intent = intentCategory(label);
      scheduleOutcome('category', label, true);
      return ['intern-category-' + String(index).padStart(2, '0') + '-i-' + intent, '인턴 분야 선택, 범주 ' + intent];
    }

    if (button.dataset.toggleExamples) {
      return ['lab-banner-list-toggle-' + page, page.toUpperCase() + ' 대표 분야 목록 펼치기 또는 접기'];
    }

    if (button.closest('#exampleChips') || button.classList.contains('field-chip')) {
      const container = button.closest('#exampleChips') || button.parentElement;
      const buttons = Array.from(container?.querySelectorAll('button:not([data-toggle-examples]), .chip:not([data-toggle-examples]), .field-chip:not([data-toggle-examples])') || []);
      const index = Math.max(0, buttons.indexOf(button)) + 1;
      const label = button.textContent.trim();
      const intent = intentCategory(label);
      scheduleOutcome('banner', label, true);
      return ['lab-banner-' + page + '-' + String(index).padStart(2, '0') + '-i-' + intent, page.toUpperCase() + ' 대표 분야 선택, 범주 ' + intent];
    }

    if (button.classList.contains('small-tab')) {
      return ['intern-sort-' + safeToken(button.dataset.sort), '인턴 정렬 변경'];
    }

    if (button.classList.contains('copy-btn')) {
      return ['intern-copy-rank-' + rankBucket(button), '인턴 공고 복사, 결과 순위 ' + rankBucket(button)];
    }

    if (button.classList.contains('dgist-direct-more-button') || button.classList.contains('load-more-button') && /관련 교수님/.test(button.textContent)) {
      return ['lab-more-direct-' + page, page.toUpperCase() + ' 직접 관련 결과 더보기'];
    }
    if (button.classList.contains('dgist-adjacent-more-button') || /인접 분야 교수님 .*더보기/.test(button.textContent)) {
      return ['lab-more-adjacent-' + page, page.toUpperCase() + ' 인접 분야 결과 더보기'];
    }
    if (button.classList.contains('dgist-show-adjacent-button') || id === 'showAdjacentResults' || /인접 분야 교수님 보기/.test(button.textContent)) {
      return ['lab-show-adjacent-' + page, page.toUpperCase() + ' 인접 분야 보기'];
    }
    if (button.classList.contains('dgist-more-results-button')) {
      return ['lab-more-results-' + page, page.toUpperCase() + ' 관련 교수 더보기'];
    }

    return null;
  }

  function classifyLink(anchor) {
    const page = pageKey();
    const href = anchor.getAttribute('href') || '';
    const text = anchor.textContent.trim();

    if (page === 'home') {
      if (href.includes('intern')) return ['nav-home-intern', '첫 화면에서 인턴 추천 서비스 선택'];
      if (href.includes('graduate')) return ['nav-home-graduate', '첫 화면에서 대학원 연구실 추천 서비스 선택'];
    }

    if (page === 'graduate') {
      if (anchor.classList.contains('back')) return ['nav-back-home-graduate', '대학원 선택 화면에서 첫 화면으로 돌아가기'];
      for (const school of ['dgist', 'snu', 'kaist', 'postech']) {
        if (href.includes(school)) return ['nav-school-' + school, '대학원 학교 선택: ' + school.toUpperCase()];
      }
    }

    if (page === 'intern' && anchor.classList.contains('platform-back')) {
      return ['nav-back-home-intern', '인턴 서비스에서 첫 화면으로 돌아가기'];
    }

    if (['dgist', 'snu', 'kaist', 'postech'].includes(page) && anchor.classList.contains('portal-back')) {
      return ['nav-back-school-' + page, page.toUpperCase() + '에서 학교 선택 화면으로 돌아가기'];
    }

    if (page === 'intern' && (anchor.classList.contains('link-btn') || /공고/.test(text))) {
      return ['intern-job-open-rank-' + rankBucket(anchor), '인턴 공고 링크 열기, 결과 순위 ' + rankBucket(anchor)];
    }

    if (['dgist', 'snu', 'kaist', 'postech'].includes(page)) {
      if (/홈페이지/.test(text) || anchor.classList.contains('summary-link')) {
        return ['lab-homepage-' + page + '-rank-' + rankBucket(anchor), page.toUpperCase() + ' 연구실 홈페이지 열기, 결과 순위 ' + rankBucket(anchor)];
      }
      if (/공식 프로필|교수 프로필|프로필/.test(text)) {
        return ['lab-profile-' + page + '-rank-' + rankBucket(anchor), page.toUpperCase() + ' 공식 프로필 열기, 결과 순위 ' + rankBucket(anchor)];
      }
    }

    if (/^https?:\/\//i.test(href)) {
      return ['external-link-' + page, page.toUpperCase() + ' 외부 링크 열기'];
    }

    return null;
  }

  document.addEventListener('click', function (event) {
    if (!event.isTrusted) return;

    const button = event.target.closest('button');
    if (button && !button.disabled && isVisible(button)) {
      track('total-button-click', '전체 버튼 클릭');
      const classified = classifyButton(button);
      if (classified) track(classified[0], classified[1]);
      return;
    }

    const summary = event.target.closest('summary');
    if (summary) {
      const page = pageKey();
      if (['dgist', 'snu', 'kaist', 'postech'].includes(page)) {
        track('lab-details-' + page + '-rank-' + rankBucket(summary), page.toUpperCase() + ' 교수 카드 상세정보 열기, 결과 순위 ' + rankBucket(summary));
      }
      return;
    }

    const anchor = event.target.closest('a');
    if (anchor && anchor.getAttribute('href') && !anchor.getAttribute('href').startsWith('#')) {
      track('total-navigation-click', '전체 탐색 링크 클릭');
      const classified = classifyLink(anchor);
      if (classified) track(classified[0], classified[1]);
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    if (!event.isTrusted || event.key !== 'Enter') return;
    const target = event.target;
    const page = pageKey();

    if (page === 'intern' && target.id === 'searchInput') {
      const value = target.value || '';
      const intent = intentCategory(value);
      track('intern-search-submit-i-' + intent + '-q-' + queryLengthBucket(value, false), '인턴 검색 실행, Enter, 분야 ' + intent);
      scheduleOutcome('manual', value, false);
    }

    if (page === 'intern' && target.id === 'chatInput') {
      const value = target.value || '';
      const intent = intentCategory(value);
      track('intern-chat-submit-i-' + intent + '-q-' + queryLengthBucket(value, false), '인턴 질문 검색 실행, Enter, 분야 ' + intent);
      scheduleOutcome('chat', value, false);
    }

    if (['dgist', 'snu', 'kaist', 'postech'].includes(page) && target.id === 'goalInput' && (event.ctrlKey || event.metaKey)) {
      const value = target.value || '';
      const intent = intentCategory(value);
      track('lab-search-submit-' + page + '-i-' + intent + '-q-' + queryLengthBucket(value, false), page.toUpperCase() + ' 연구실 추천 실행, 단축키, 분야 ' + intent);
      scheduleOutcome('manual', value, false);
    }
  }, true);

  document.addEventListener('change', function (event) {
    if (!event.isTrusted) return;
    const target = event.target;
    const page = pageKey();

    if (page === 'intern') {
      const map = {
        seasonFilter: 'season',
        fitFilter: 'eligibility',
        sourceFilter: 'source'
      };
      if (map[target.id]) {
        const option = target.options?.[target.selectedIndex];
        track('intern-filter-' + map[target.id] + '-' + String(target.selectedIndex), '인턴 필터 변경: ' + (option?.textContent || target.value));
        setTimeout(function () {
          track('intern-filter-outcome-' + map[target.id] + '-r-' + resultCountBucket(currentResultCount()), '인턴 필터 적용 후 결과 ' + currentResultCount() + '개');
        }, 250);
      }
      if (target.id === 'reviewToggle' || target.id === 'tableToggle') {
        track('intern-toggle-' + safeToken(target.id) + '-' + (target.checked ? 'on' : 'off'), '인턴 옵션 변경: ' + target.id + ' ' + (target.checked ? '켜기' : '끄기'));
      }
    }

    if (['dgist', 'snu', 'kaist', 'postech'].includes(page) && target.tagName === 'SELECT' && isVisible(target)) {
      const option = target.options?.[target.selectedIndex];
      track('lab-filter-' + page + '-' + safeToken(target.id) + '-' + String(target.selectedIndex), page.toUpperCase() + ' 선택 조건 변경: ' + (option?.textContent || '선택'));
    }
  }, true);

  window.LabMatchAnalytics = Object.freeze({
    track: track,
    pageKey: pageKey,
    resultCount: currentResultCount,
    intentCategory: intentCategory
  });

  flushQueue();
})();
