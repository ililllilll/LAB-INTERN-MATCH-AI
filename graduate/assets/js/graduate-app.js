(function () {
  "use strict";

  const appScriptUrl = document.currentScript
    ? document.currentScript.src
    : new URL("./graduate-app.js", window.location.href).href;
  const workerUrl = new URL("./search-worker.js", appScriptUrl);
  const root = document.querySelector("[data-graduate-app]");
  if (!root) return;

  const PAGE_SIZE = 8;
  const TIER_LABELS = Object.freeze({
    Direct: "직접 관련",
    Partial: "부분 관련",
    Adjacent: "인접 분야",
  });
  const EVIDENCE_LABELS = Object.freeze({
    topic: "핵심 주제",
    method: "연구 방법",
    materialTarget: "연구 대상",
    phenomenon: "핵심 현상",
    application: "응용 분야",
    platform: "연구 플랫폼",
    domain: "Domain",
    taxonomy: "명시적 분야 매핑",
  });
  const FIELD_MODES = new Set(["selection", "browse", "detailed"]);
  const BROWSE_CENTRALITY_LABELS = Object.freeze({
    PRIMARY: "핵심 분야",
    SECONDARY: "주요 분야",
  });
  const BROWSE_CENTRALITY_ORDER = Object.freeze({ PRIMARY: 0, SECONDARY: 1 });
  const KOREAN_NAME_COLLATOR = new Intl.Collator("ko-KR", {
    usage: "sort",
    sensitivity: "base",
    numeric: true,
  });
  const FIELD_MODE_COPY = Object.freeze({
    selection: {
      title: "관심 분야로 연구실 찾기",
      lead: "큰 연구 분야와 세부 연구 분야를 선택해 관련 연구실을 둘러보세요.",
    },
    browse: {
      title: "분야를 선택해서 찾기",
      lead: "큰 연구 분야와 세부 연구 분야를 차례로 선택해 관련 연구실을 둘러봅니다.",
    },
    detailed: {
      title: "연구 내용을 직접 입력해 찾기",
      lead: "관심 연구 주제, 소재, 연구 방법, 현상 또는 응용 내용을 직접 입력해 연구실을 찾습니다.",
    },
  });
  const mode = root.dataset.mode === "school" ? "school" : "field";
  const fixedSchool = root.dataset.school || "";
  const loader = new window.LabMatchRuntimeLoader.RuntimeLoader();

  function fieldModeFromLocation() {
    if (mode !== "field") return "selection";
    const value = new URLSearchParams(window.location.search).get("recommendationMode");
    return FIELD_MODES.has(value) ? value : "selection";
  }

  function browseSelectionFromLocation() {
    if (mode !== "field") return { bigFieldId: "", smallFieldId: "" };
    const params = new URLSearchParams(window.location.search);
    return {
      bigFieldId: params.get("bigField") || "",
      smallFieldId: params.get("smallField") || "",
    };
  }

  function freshVisible() {
    return { Direct: PAGE_SIZE, Partial: PAGE_SIZE, Adjacent: PAGE_SIZE, Browse: PAGE_SIZE };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""), window.location.href);
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function createStore(initialState) {
    let state = initialState;
    const listeners = new Set();
    return Object.freeze({
      get: () => state,
      set(patch) {
        state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
        for (const listener of listeners) listener(state);
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
  }

  const store = createStore({
    ready: false,
    busy: false,
    recommendationMode: fieldModeFromLocation(),
    bigFieldId: "",
    smallFieldId: "",
    universities: fixedSchool ? [fixedSchool] : [],
    departments: [],
    query: "",
    result: null,
    error: "",
    visible: freshVisible(),
    searchSource: "manual",
    directP1R2Enabled: new URLSearchParams(window.location.search).get("p1r2") !== "off",
  });

  class SearchTransport {
    constructor() {
      this.runtimePromise = null;
      this.mainEngine = null;
      this.worker = null;
      this.workerReady = null;
      this.sequence = 0;
      this.pending = new Map();
      this.mode = "uninitialized";
    }

    async runtime() {
      if (!this.runtimePromise) this.runtimePromise = loader.loadSearch();
      return this.runtimePromise;
    }

    async main() {
      if (!this.mainEngine) {
        this.mainEngine = new window.LabMatchSearch.Engine(await this.runtime());
      }
      return this.mainEngine;
    }

    async initializeWorker() {
      const workerDisabled = new URLSearchParams(window.location.search).get("worker") === "off";
      if (workerDisabled || !window.Worker) {
        this.mode = "main-thread";
        return false;
      }
      if (this.workerReady) return this.workerReady;
      this.workerReady = (async () => {
        try {
          const runtime = await this.runtime();
          const worker = new Worker(workerUrl, { name: "lab-match-bm25-plus" });
          this.worker = worker;
          worker.addEventListener("message", (event) => {
            const message = event.data || {};
            const pending = this.pending.get(message.requestId);
            if (!pending) return;
            if (message.type === "ERROR") {
              this.pending.delete(message.requestId);
              pending.reject(new Error(message.error || "WORKER_SEARCH_ERROR"));
            } else if (message.type === "READY" || message.type === "RESULT") {
              this.pending.delete(message.requestId);
              pending.resolve(message.result || true);
            }
          });
          worker.addEventListener("error", () => {
            this.mode = "main-thread";
            for (const pending of this.pending.values()) {
              pending.reject(new Error("WORKER_RUNTIME_ERROR"));
            }
            this.pending.clear();
          });
          const requestId = `init-${++this.sequence}`;
          const ready = new Promise((resolve, reject) => {
            this.pending.set(requestId, { resolve, reject });
            setTimeout(() => {
              if (!this.pending.has(requestId)) return;
              this.pending.delete(requestId);
              reject(new Error("WORKER_INIT_TIMEOUT"));
            }, 12000);
          });
          worker.postMessage({ type: "INIT", requestId, runtime });
          await ready;
          this.mode = "worker";
          return true;
        } catch (_) {
          this.mode = "main-thread";
          if (this.worker) this.worker.terminate();
          this.worker = null;
          return false;
        }
      })();
      return this.workerReady;
    }

    async search(query, options) {
      const workerAvailable = await this.initializeWorker();
      if (workerAvailable && this.worker && this.mode === "worker") {
        const requestId = `search-${++this.sequence}`;
        try {
          const result = await new Promise((resolve, reject) => {
            this.pending.set(requestId, { resolve, reject });
            setTimeout(() => {
              if (!this.pending.has(requestId)) return;
              this.pending.delete(requestId);
              reject(new Error("WORKER_SEARCH_TIMEOUT"));
            }, 12000);
            this.worker.postMessage({ type: "SEARCH", requestId, query, options });
          });
          return result;
        } catch (_) {
          this.mode = "main-thread";
        }
      }
      return (await this.main()).search(query, options);
    }
  }

  const transport = new SearchTransport();
  let initial = null;
  let bigById = {};
  let smallById = {};
  let browseBigById = {};
  let browseSmallById = {};
  let displayByProfessorId = {};
  let dgistProfessorEnrichment = null;
  let renderedFieldMode = "";
  let browseRunSequence = 0;

  function collectElements() {
    return {
      mount: document.getElementById("fieldModeMount"),
      modePageTitle: document.getElementById("modePageTitle"),
      modePageLead: document.getElementById("modePageLead"),
      bigFields: document.getElementById("bigFields"),
      smallFields: document.getElementById("smallFields"),
      smallFieldPanel: document.getElementById("smallFieldPanel"),
      smallFieldSearch: document.getElementById("smallFieldSearch"),
      universityFilters: document.getElementById("universityFilters"),
      departmentFilters: document.getElementById("departmentFilters"),
      departmentSearch: document.getElementById("departmentSearch"),
      banners: document.getElementById("researchBanners"),
      query: document.getElementById("researchQuery"),
      search: document.getElementById("searchButton"),
      directP1R2Toggle: document.getElementById("directP1R2Toggle"),
      reset: document.getElementById("resetButton"),
      previous: document.getElementById("previousButton"),
      summaryPanel: document.getElementById("browseSummaryPanel"),
      summary: document.getElementById("conditionSummary"),
      browseSelectionMessage: document.getElementById("browseSelectionMessage"),
      status: document.getElementById("searchStatus"),
      resultSection: document.getElementById("resultSection"),
      resultCount: document.getElementById("resultCount"),
      resultMeta: document.getElementById("resultMeta"),
      resultPolicy: document.getElementById("resultPolicy"),
      results: document.getElementById("results"),
      live: document.getElementById("resultAnnouncement"),
    };
  }

  let elements = collectElements();

  function resultPanelMarkup(hidden = false) {
    return `
      <section id="resultSection" class="panel results-panel" aria-labelledby="resultTitle"${
        hidden ? " hidden" : ""
      }>
        <div class="results-heading">
          <div>
            <h2 id="resultTitle">추천 결과 <span id="resultCount" class="result-number">검색 전</span></h2>
            <p id="resultMeta" class="result-meta">조건을 선택하거나 연구 내용을 입력해 검색하세요.</p>
          </div>
          <p id="resultPolicy" class="result-policy">직접 관련 결과가 0명일 수 있으며 약한 결과로 강제 충원하지 않습니다. 점수는 교수·연구실의 우수성 평가가 아닙니다.</p>
        </div>
        <div id="results"></div>
        <p id="resultAnnouncement" class="sr-only" aria-live="polite"></p>
      </section>`;
  }

  function selectionMarkup() {
    return `
      <section class="panel mode-selection-panel" aria-labelledby="modeSelectionTitle">
        <div class="panel-head">
          <div class="title-group"><span class="step">1</span><div>
            <h2 id="modeSelectionTitle">관심 분야로 연구실 찾기</h2>
            <p>연구 분야를 선택해 관련 교수님과 연구실을 둘러보세요.</p>
          </div></div>
        </div>
        <div class="mode-choice-grid">
          <article class="mode-choice-card">
            <span class="mode-choice-number" aria-hidden="true">01</span>
            <h3>분야를 선택해서 찾기</h3>
            <p>큰 연구 분야와 세부 연구 분야를 차례로 선택해 관련 연구실을 둘러봅니다.</p>
            <button class="primary-button" type="button" data-recommendation-mode="browse"
                    aria-label="분야를 선택해서 찾기 시작">분야 선택 시작</button>
          </article>
        </div>
      </section>`;
  }

  function browseMarkup() {
    return `
      <section class="mode-context" aria-label="현재 검색 방식">
        <div><span>현재 검색 방식</span><strong>분야를 선택해서 찾기</strong></div>
        <button class="secondary-button" type="button" data-reselect-mode
                aria-label="검색 방식 다시 선택">검색 방식 다시 선택</button>
      </section>
      <section class="panel" aria-labelledby="bigFieldTitle">
        <div class="panel-head">
          <div class="title-group"><span class="step">1</span><div>
            <h2 id="bigFieldTitle">큰 연구 분야 선택</h2>
            <p>6개 대학 교수 연구정보를 바탕으로 구성한 16개 탐색 분야입니다.</p>
          </div></div>
        </div>
        <div id="bigFields" class="major-grid" aria-label="큰 연구 분야"></div>
      </section>
      <section id="smallFieldPanel" class="panel" aria-labelledby="smallFieldTitle" hidden>
        <div class="panel-head">
          <div class="title-group"><span class="step">2</span><div>
            <h2 id="smallFieldTitle">세부 연구 분야 선택</h2>
            <p>세부 분야를 선택하면 해당 연구 분야에 관련된 교수·연구실이 표시됩니다. 소속 기반 탐색 항목은 연구 주제가 확인되지 않은 교수도 포함합니다.</p>
          </div></div>
          <label>
            <span class="sr-only">세부 분야 검색</span>
            <input id="smallFieldSearch" class="filter-search" type="search"
                   placeholder="세부 분야 이름 검색">
          </label>
        </div>
        <div id="smallFields" class="field-row" aria-label="세부 연구 분야"></div>
      </section>
      <section id="browseSummaryPanel" class="panel" aria-labelledby="browseSummaryTitle" hidden>
        <div class="panel-head">
          <div class="title-group"><span class="step">3</span><div>
            <h2 id="browseSummaryTitle">선택 결과 요약</h2>
            <p>선택한 분야와 공개 결과 수를 확인하세요.</p>
          </div></div>
        </div>
        <div id="conditionSummary" class="condition-summary" aria-label="선택 조건 요약"></div>
        <p id="browseSelectionMessage" class="browse-selection-message"></p>
        <div class="action-row">
          <button id="previousButton" class="secondary-button" type="button">이전 단계</button>
          <button id="resetButton" class="secondary-button" type="button">선택 초기화</button>
        </div>
        <p id="searchStatus" class="search-status" role="status">세부 분야를 선택하면 결과가 자동으로 표시됩니다.</p>
      </section>
      ${resultPanelMarkup(true)}`;
  }

  function detailedMarkup() {
    return `
      <section class="mode-context" aria-label="현재 검색 방식">
        <div><span>현재 검색 방식</span><strong>연구 내용을 직접 입력해 찾기</strong></div>
        <button class="secondary-button" type="button" data-reselect-mode
                aria-label="검색 방식 다시 선택">검색 방식 다시 선택</button>
      </section>
      <section class="panel" aria-labelledby="queryTitle">
        <div class="panel-head">
          <div class="title-group"><span class="step">1</span><div>
            <h2 id="queryTitle">상세 연구 내용 입력</h2>
            <p>관심 있는 연구 주제, 소재, 연구 방법, 현상 또는 응용 분야를 구체적으로 입력해 주세요.</p>
          </div></div>
        </div>
        <label class="query-label" for="researchQuery">연구 내용을 직접 입력해 주세요</label>
        <textarea id="researchQuery" class="query-area"
                  placeholder="예: 전고체 배터리에서 고체전해질 계면 저항을 분석하는 연구"></textarea>
        <div class="query-examples" aria-labelledby="queryExamplesTitle">
          <strong id="queryExamplesTitle">입력 예시</strong>
          <ul>
            <li>전고체 배터리에서 고체전해질 계면 저항을 분석하는 연구</li>
            <li>반도체 플라즈마 식각 공정의 손상과 균일도 제어</li>
            <li>의료 영상에 딥러닝을 적용해 질병을 진단하는 연구</li>
            <li>양자점 기반 적외선 센서 소재와 소자 제작</li>
          </ul>
        </div>
        <label class="direct-p1r2-control" for="directP1R2Toggle">
          <input id="directP1R2Toggle" type="checkbox" ${store.get().directP1R2Enabled ? "checked" : ""}>
          <span><strong>직접 검색 P1R2 문맥 필터</strong><small>다의어가 포함된 복합 검색어에서 전체 문구·같은 근거 안의 근접 일치를 우선하고, 단어 하나만 맞는 후보를 제거합니다.</small></span>
        </label>
        <p class="helper">BM25 Plus 후보 생성 후 P1R2 문맥 게이트를 적용합니다. Ctrl/⌘ + Enter로 검색할 수 있습니다.</p>
        <div class="action-row">
          <button id="searchButton" class="primary-button" type="button">검색 실행</button>
          <button id="resetButton" class="secondary-button" type="button">입력 초기화</button>
        </div>
        <p id="searchStatus" class="search-status" role="status">권위 데이터를 준비하고 있습니다.</p>
      </section>
      ${resultPanelMarkup()}`;
  }

  function renderFieldModeShell(state) {
    if (mode !== "field") return;
    const copy = FIELD_MODE_COPY[state.recommendationMode] || FIELD_MODE_COPY.selection;
    if (elements.modePageTitle) elements.modePageTitle.textContent = copy.title;
    if (elements.modePageLead) elements.modePageLead.textContent = copy.lead;
    document.title = `${copy.title} | LAB MATCH AI`;
    if (!elements.mount || renderedFieldMode === state.recommendationMode) return;
    elements.mount.innerHTML =
      state.recommendationMode === "browse"
        ? browseMarkup()
        : state.recommendationMode === "detailed"
          ? detailedMarkup()
          : selectionMarkup();
    renderedFieldMode = state.recommendationMode;
    elements = collectElements();
  }

  function fieldLabel(field) {
    return (
      field.label_ko ||
      field.mobileLabelKo ||
      field.nameKo ||
      field.label_en ||
      field.nameEn ||
      field.id ||
      field.bigFieldId ||
      field.smallFieldId ||
      ""
    );
  }

  function renderBigFields(state) {
    if (!elements.bigFields) return;
    const fields =
      mode === "field" && state.recommendationMode === "browse"
        ? initial.browseTaxonomyV3.big_fields
        : initial.taxonomy.bigFields;
    elements.bigFields.innerHTML = fields
      .map((field, index) => {
        const id = field.id || field.bigFieldId;
        const labelEn = field.label_en || field.nameEn || "";
        const count = field.professor_count ?? field.directProfessorCount;
        return `
          <button class="major-chip${state.bigFieldId === id ? " is-active" : ""}"
                  type="button" data-big-field="${escapeHtml(id)}"
                  aria-pressed="${state.bigFieldId === id}"
                  aria-label="${escapeHtml(fieldLabel(field))}, 교수 ${count}명">
            <span class="major-index">${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(fieldLabel(field))}</strong>
            <small>${escapeHtml(labelEn)}</small>
          </button>`;
      })
      .join("");
  }

  function orderedSmallFields(state) {
    if (mode === "field" && state.recommendationMode === "browse") {
      const big = browseBigById[state.bigFieldId];
      return (big?.small_field_ids || [])
        .map((smallFieldId) => ({ row: {}, field: browseSmallById[smallFieldId] }))
        .filter((entry) => entry.field);
    }
    const order = initial.taxonomy.displayOrderByBigField.find(
      (group) => group.bigFieldId === state.bigFieldId
    );
    if (!order) return [];
    return order.rows
      .map((row) => ({ row, field: smallById[row.smallFieldId] }))
      .filter((entry) => entry.field && entry.field.visibleInFieldFirst !== false);
  }

  function renderSmallFields(state) {
    if (!elements.smallFields || !elements.smallFieldPanel) return;
    const searchTerm = window.LabMatchSearch.normalizeText(elements.smallFieldSearch?.value || "");
    const entries = state.bigFieldId ? orderedSmallFields(state) : [];
    const filtered = entries.filter(({ field }) => {
      if (!searchTerm) return true;
      return window.LabMatchSearch
        .normalizeText(
          [
            field.label_ko,
            field.label_en,
            field.nameKo,
            field.nameEn,
            field.definition,
            field.descriptionKo,
          ].join(" ")
        )
        .includes(searchTerm);
    });
    elements.smallFieldPanel.hidden = !state.bigFieldId;
    elements.smallFields.innerHTML = filtered.length
      ? filtered
          .map(({ row, field }) => {
            const id = field.id || field.smallFieldId;
            const count = field.professor_count ?? field.directProfessorCount;
            return `
              <button class="field-chip${state.smallFieldId === id ? " is-active" : ""}"
                      type="button" data-small-field="${escapeHtml(id)}"
                      aria-pressed="${state.smallFieldId === id}">
                <span>${escapeHtml(fieldLabel(field))}</span>
                <small>${count}명${row.crossListed ? " · 교차 분야" : ""}</small>
              </button>`;
          })
          .join("")
      : '<p class="inline-empty">조건에 맞는 세부 분야가 없습니다.</p>';
  }

  function renderUniversities(state) {
    if (!elements.universityFilters) return;
    if (fixedSchool) {
      const university = initial.filterIndexes.universities[fixedSchool];
      elements.universityFilters.innerHTML = `
        <span class="fixed-filter" aria-label="고정 학교 필터">
          <span aria-hidden="true">✓</span> ${escapeHtml(university?.nameKo || fixedSchool)} 고정
        </span>`;
      return;
    }
    elements.universityFilters.innerHTML = Object.entries(initial.filterIndexes.universities)
      .map(
        ([code, university]) => `
          <label class="check-chip">
            <input type="checkbox" value="${escapeHtml(code)}" data-university
                   ${state.universities.includes(code) ? "checked" : ""}>
            <span>${escapeHtml(university.nameKo || code)}</span>
          </label>`
      )
      .join("");
  }

  function compatibleDepartments(state) {
    const schools = state.universities.length ? new Set(state.universities) : null;
    return Object.entries(initial.filterIndexes.departments)
      .filter(([, department]) => !schools || schools.has(department.universityCode))
      .sort((left, right) => {
        const schoolOrder = left[1].universityCode.localeCompare(right[1].universityCode);
        return schoolOrder || left[1].nameKo.localeCompare(right[1].nameKo, "ko");
      });
  }

  function renderDepartments(state) {
    if (!elements.departmentFilters) return;
    const term = window.LabMatchSearch.normalizeText(elements.departmentSearch?.value || "");
    const departments = compatibleDepartments(state).filter(([, department]) =>
      window.LabMatchSearch
        .normalizeText(`${department.nameKo} ${department.nameEn} ${department.universityCode}`)
        .includes(term)
    );
    elements.departmentFilters.innerHTML = departments.length
      ? departments
          .map(
            ([departmentId, department]) => `
              <label class="department-option">
                <input type="checkbox" value="${escapeHtml(departmentId)}" data-department
                       ${state.departments.includes(departmentId) ? "checked" : ""}>
                <span><strong>${escapeHtml(
                  department.nameKo || department.departmentCode
                )}</strong><small>${escapeHtml(department.universityCode)}</small></span>
              </label>`
          )
          .join("")
      : '<p class="inline-empty">조건에 맞는 학과가 없습니다.</p>';
  }

  function renderBanners(state) {
    if (!elements.banners) return;
    const scope = fixedSchool || "GLOBAL";
    const banners = initial.bannerConfig.groups[scope] || [];
    elements.banners.innerHTML = banners
      .map(
        (banner) => `
          <button type="button" class="banner-card" data-banner-small="${escapeHtml(
            banner.smallFieldId
          )}" data-banner-big="${escapeHtml(banner.bigFieldId)}">
            <span class="banner-count">${banner.professorCount}명 · ${banner.departmentCount}개 학과</span>
            <strong>${escapeHtml(banner.labelKo)}</strong>
            <small>${escapeHtml(bigById[banner.bigFieldId]?.nameKo || "")}</small>
          </button>`
      )
      .join("");
  }

  function renderSummary(state) {
    if (!elements.summary) return;
    if (mode === "field" && state.recommendationMode === "browse") {
      const big = browseBigById[state.bigFieldId];
      const small = browseSmallById[state.smallFieldId];
      const hasSelection = Boolean(
        big && small && small.parent_big_field_ids?.includes(state.bigFieldId)
      );
      if (elements.summaryPanel) elements.summaryPanel.hidden = !hasSelection;
      if (elements.resultSection) elements.resultSection.hidden = !hasSelection;
      if (!hasSelection) {
        elements.summary.innerHTML = "";
        if (elements.browseSelectionMessage) elements.browseSelectionMessage.textContent = "";
        return;
      }
      elements.summary.innerHTML = `
        <span class="browse-selection-path"><small>선택한 분야</small><strong>${escapeHtml(
          fieldLabel(big)
        )} &gt; ${escapeHtml(fieldLabel(small))}</strong></span>`;
      if (elements.browseSelectionMessage) {
        elements.browseSelectionMessage.textContent = small.affiliation_only
          ? `소속 학과 기준으로 찾은 교수 ${Number(small.professor_count || 0).toLocaleString("ko-KR")}명 · 세부 연구 주제는 미확인`
          : `${fieldLabel(small)}에 연결된 교수·연구실 ${Number(small.professor_count || 0).toLocaleString("ko-KR")}개`;
      }
      return;
    }
    const items = [];
    if (state.bigFieldId) {
      const field = browseBigById[state.bigFieldId] || bigById[state.bigFieldId] || {};
      items.push(`큰 분야: ${fieldLabel(field)}`);
    }
    if (state.smallFieldId) {
      const field = browseSmallById[state.smallFieldId] || smallById[state.smallFieldId] || {};
      items.push(`세부 분야: ${fieldLabel(field)}`);
    }
    if (mode === "school" && state.universities.length) {
      items.push(
        `학교: ${state.universities
          .map((code) => initial.filterIndexes.universities[code]?.nameKo || code)
          .join(", ")}`
      );
    }
    if (mode === "school" && state.departments.length) {
      items.push(
        `학과: ${state.departments
          .map((id) => initial.filterIndexes.departments[id]?.nameKo || id)
          .join(", ")}`
      );
    }
    if (mode === "school" && state.query.trim()) items.push(`상세 검색: ${state.query.trim()}`);
    elements.summary.innerHTML = items.length
      ? items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")
      : "<span>아직 선택한 조건이 없습니다.</span>";
  }

  function evidenceMarkup(result) {
    return Object.entries(result.matchedEvidence || {})
      .filter(([, values]) => values.length)
      .map(
        ([axis, values]) => `
          <div><dt>${escapeHtml(EVIDENCE_LABELS[axis] || axis)}</dt>
          <dd>${escapeHtml(values.join(" · "))}</dd></div>`
      )
      .join("");
  }


  function ensureProfessorInfoModal() {
    let modal = document.getElementById("professorInfoModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "professorInfoModal";
    modal.className = "professor-info-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="professor-info-backdrop" data-professor-info-close></div>
      <section class="professor-info-dialog" role="dialog" aria-modal="true" aria-labelledby="professorInfoTitle">
        <button type="button" class="professor-info-close" data-professor-info-close aria-label="닫기">×</button>
        <div id="professorInfoContent"></div>
      </section>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-professor-info-close]")) closeProfessorInfo();
    });
    return modal;
  }

  function closeProfessorInfo() {
    const modal = document.getElementById("professorInfoModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("professor-info-open");
  }

  function professorInfoHeader(record, label) {
    const labName = (record.labNames || [])[0] || "";
    const departments = (record.affiliations || [])
      .map((item) => item.departmentNameKo)
      .filter(Boolean);
    return `
      <p class="professor-info-eyebrow">${escapeHtml(label)}</p>
      <h2 id="professorInfoTitle">${escapeHtml(record.nameKo || "")} 교수</h2>
      <p class="professor-info-affiliation">${escapeHtml([...new Set(departments)].join(" · "))}</p>
      ${labName ? `<p class="professor-info-lab">${escapeHtml(labName)}</p>` : ""}`;
  }

  function openProfessorInfo(professorId, infoType) {
    const record = displayByProfessorId[professorId];
    if (!record || record.universityCode !== "DGIST") return;
    const modal = ensureProfessorInfoModal();
    const content = modal.querySelector("#professorInfoContent");
    const enrichment = dgistProfessorEnrichment || {};
    if (infoType === "curriculum") {
      const data = enrichment.curriculum2025ByProfessorId?.[professorId];
      const available = data?.status === "AVAILABLE" && Array.isArray(data.courses);
      const list = available
        ? `<ul class="professor-info-list course-list">${data.courses
            .map((course) => `<li>${escapeHtml(course)}</li>`)
            .join("")}</ul>`
        : `<div class="professor-info-empty">${escapeHtml(
            data?.notice ||
              "2025 DGIST 연구실별 추천 Course tree에 이 연구실의 추천 수강과목 정보가 수록되지 않았습니다."
          )}</div>`;
      content.innerHTML = `
        ${professorInfoHeader(record, "2025 추천 커리큘럼")}
        <div class="professor-info-section">
          <h3>추천 수강과목</h3>
          ${list}
        </div>
        <p class="professor-info-notice">이 정보는 연구실에서 제시한 추천 수강과목이며 대학원 진학을 위한 필수 이수과목은 아닙니다.</p>
        <p class="professor-info-source">자료 기준: 2025 DGIST 연구실별 추천 Course tree</p>`;
    } else {
      const data = enrichment.summerInternship2026ByProfessorId?.[professorId];
      const available = data?.status === "PARTICIPATING_LAB" && Array.isArray(data.items);
      const rows = available
        ? data.items
            .map((item) =>
              item.type === "topic"
                ? `<h4 class="intern-topic">${escapeHtml(item.text)}</h4>`
                : `<li>${escapeHtml(item.text)}</li>`
            )
            .join("")
        : "";
      const activity = available
        ? `<div class="intern-activity">${rows.replace(/(<h4[^>]*>.*?<\/h4>)(?=<li>)/g, "$1<ul>")}</div>`
        : `<div class="professor-info-empty">${escapeHtml(
            data?.notice ||
              "2026 DGIST 대학원 하계 인턴 프로그램 참여 연구실 목록에서 이 연구실은 확인되지 않습니다."
          )}</div>`;
      // Build valid topic/detail groups without inferring information.
      let grouped = "";
      if (available) {
        let listOpen = false;
        for (const item of data.items) {
          if (item.type === "topic") {
            if (listOpen) grouped += "</ul>";
            grouped += `<h4 class="intern-topic">${escapeHtml(item.text)}</h4>`;
            listOpen = false;
          } else {
            if (!listOpen) {
              grouped += '<ul class="professor-info-list intern-list">';
              listOpen = true;
            }
            grouped += `<li>${escapeHtml(item.text)}</li>`;
          }
        }
        if (listOpen) grouped += "</ul>";
      }
      content.innerHTML = `
        ${professorInfoHeader(record, "2026 하계 인턴")}
        <div class="professor-info-section">
          <h3>${available && data.labNameKo ? escapeHtml(data.labNameKo) : "하계 인턴 활동"}</h3>
          ${available ? grouped : activity}
        </div>
        <p class="professor-info-source">자료 기준: 2026 DGIST 대학원 하계 인턴 프로그램 참여 연구실</p>`;
    }
    modal.hidden = false;
    document.body.classList.add("professor-info-open");
    modal.querySelector(".professor-info-close")?.focus();
  }

  function resultCard(result) {
    const record = result.display || {};
    const homepage = safeUrl(record.homepage);
    const official = safeUrl(record.officialUrl);
    const departments = (record.affiliations || [])
      .map((item) => item.departmentNameKo)
      .filter(Boolean);
    const labName = (record.labNames || [])[0] || "";
    const isDgist = record.universityCode === "DGIST";
    const browseCentrality = result.browseCentrality || "";
    const tierLabel = browseCentrality
      ? BROWSE_CENTRALITY_LABELS[browseCentrality] || browseCentrality
      : TIER_LABELS[result.tier] || result.tier;
    const tierClass = browseCentrality === "PRIMARY"
      ? "direct"
      : browseCentrality === "SECONDARY"
        ? "partial"
        : result.tier.toLowerCase();
    return `
      <article class="professor-card" data-professor-id="${escapeHtml(result.professorId)}">
        <div class="card-kicker">
          <span class="tier tier-${escapeHtml(tierClass)}">${escapeHtml(tierLabel)}</span>
          <span class="school school-${escapeHtml(
            String(record.universityCode || "").toLowerCase()
          )}">${escapeHtml(record.universityNameKo || record.universityCode || "")}</span>
        </div>
        <h4>${escapeHtml(record.nameKo || "")} <small>${escapeHtml(
          record.nameEn || ""
        )}</small></h4>
        <p class="affiliation">${escapeHtml([...new Set(departments)].join(" · "))}</p>
        ${labName ? `<p class="lab-name">${escapeHtml(labName)}</p>` : ""}
        <p class="research-summary">${escapeHtml(
          record.summaryKo || "공식 연구 정보를 확인해 주세요."
        )}</p>
        <!-- Per-card selected-field, recommendation-reason, and structured-evidence UI intentionally omitted. -->
        <div class="card-links">
          ${
            homepage
              ? `<a href="${escapeHtml(
                  homepage
                )}" target="_blank" rel="noopener noreferrer">연구실 홈페이지</a>`
              : ""
          }
          ${
            official && official !== homepage
              ? `<a class="secondary" href="${escapeHtml(
                  official
                )}" target="_blank" rel="noopener noreferrer">공식 프로필</a>`
              : ""
          }
          ${
            isDgist
              ? `<button type="button" class="secondary info-link" data-professor-info="curriculum" data-professor-id="${escapeHtml(
                  result.professorId
                )}">추천 커리큘럼</button>
                 <button type="button" class="secondary info-link" data-professor-info="internship" data-professor-id="${escapeHtml(
                  result.professorId
                )}">2026 하계 인턴</button>`
              : ""
          }
        </div>
      </article>`;
  }

  function renderResults(state) {
    const result = state.result;
    if (!elements.results || !elements.resultCount || !elements.resultMeta) return;
    if (!result) {
      elements.resultCount.textContent = "검색 전";
      elements.resultMeta.textContent =
        state.recommendationMode === "browse"
          ? "큰 분야와 세부 분야를 선택해 관련 연구실을 확인하세요."
          : "상세 연구 내용을 입력해 검색하세요.";
      elements.results.innerHTML = "";
      return;
    }
    if (result.status === "INVALID_FILTER") {
      elements.resultCount.textContent = "필터 조합 확인";
      elements.resultMeta.textContent = "선택한 학교와 학과가 서로 호환되지 않습니다.";
      elements.results.innerHTML =
        '<section class="empty-state"><strong>학교·학과 조건을 확인해 주세요.</strong><p>필터를 자동으로 완화하지 않습니다.</p></section>';
      return;
    }
    elements.resultCount.textContent = `${result.results.length.toLocaleString("ko-KR")}명`;
    const p1r2Meta = result.directP1R2?.applied
      ? ` · P1R2 ${result.directP1R2.beforeCount}→${result.directP1R2.afterCount}`
      : "";
    elements.resultMeta.textContent = result.nameNavigation
      ? "교수명 정확 탐색 결과이며 연구 관련성 순위가 아닙니다."
      : result.recommendationMode === "browse"
        ? (browseSmallById[result.options?.smallFieldId]?.affiliation_only
            ? `공식 소속 학과에 근거한 교수 ${result.results.length}명 · 개인별 세부 연구 분야 미확인`
            : `선택 분야에 연결된 교수·연구실 ${result.results.length}개`)
        : `${TIER_LABELS.Direct} ${result.sections.Direct.length} · ${TIER_LABELS.Partial} ${result.sections.Partial.length} · ${TIER_LABELS.Adjacent} ${result.sections.Adjacent.length}${p1r2Meta}`;
    if (elements.resultPolicy) {
      elements.resultPolicy.textContent =
        result.recommendationMode === "browse"
          ? (browseSmallById[result.options?.smallFieldId]?.affiliation_only
              ? "소속 학과 기준 탐색입니다. 교수 개인의 세부 연구 주제는 검증되지 않았으며, 공식 프로필에서 확인해 주세요."
              : "연구 정보가 있는 분야 연결 결과입니다. 숫자 점수나 교수·연구실 순위는 제공하지 않습니다.")
          : "직접 관련 결과가 0명일 수 있으며 약한 결과로 강제 충원하지 않습니다. 점수는 교수·연구실의 우수성 평가가 아닙니다.";
    }
    if (!result.results.length) {
      elements.results.innerHTML = `
        <section class="empty-state">
          <strong>현재 조건에서 근거가 충분한 결과가 없습니다.</strong>
          <p>결과를 채우기 위해 약한 후보를 강제 추가하지 않습니다.</p>
        </section>`;
      return;
    }
    const recovery = result.recovery
      ? `<aside class="recovery-note"><strong>보수적 검색 복구 적용</strong>
          <span>원문 “${escapeHtml(result.recovery.originalQuery)}” · ${escapeHtml(
            result.recovery.type
          )} · 학교/학과 필터 유지</span></aside>`
      : "";
    const directP1R2Note = result.directP1R2?.applied
      ? `<aside class="direct-p1r2-note"><strong>직접 검색 P1R2 문맥 필터 적용</strong>
          <span>BM25 Plus 결과 ${result.directP1R2.beforeCount}명 중 ${result.directP1R2.afterCount}명을 유지했습니다. 전체 문구·같은 공식 근거 안의 순서/근접 일치를 우선하며 약한 후보를 강제 충원하지 않습니다.</span></aside>`
      : "";
    if (result.recommendationMode === "browse") {
      const visible = result.results.slice(0, state.visible.Browse);
      const remaining = result.results.length - visible.length;
      elements.results.innerHTML = `
        <section class="browse-result-section" aria-label="선택 분야 교수·연구실">
          <div class="professor-grid">${visible.map(resultCard).join("")}</div>
          ${
            remaining > 0
              ? `<button class="load-more" type="button" data-load-more="Browse">${remaining}명 더 보기</button>`
              : ""
          }
        </section>`;
      return;
    }
    const tierInfo = {
      Direct: "정확한 공식 개념·표현 또는 명시적 세부 분야 직접 소속",
      Partial: "핵심 연구 축이 의미 있게 겹치는 결과",
      Adjacent: "방법·응용·플랫폼은 인접하지만 핵심 주제가 다른 결과",
    };
    elements.results.innerHTML =
      recovery +
      directP1R2Note +
      ["Direct", "Partial", "Adjacent"]
        .filter((tier) => result.sections[tier].length)
        .map((tier) => {
          const visible = result.sections[tier].slice(0, state.visible[tier]);
          const remaining = result.sections[tier].length - visible.length;
          return `
            <section class="tier-section" aria-labelledby="tier-${tier}">
              <header><div><h3 id="tier-${tier}">${TIER_LABELS[tier]}</h3><p>${
                tierInfo[tier]
              }</p></div><span>${result.sections[tier].length}명</span></header>
              <div class="professor-grid">${visible.map(resultCard).join("")}</div>
              ${
                remaining > 0
                  ? `<button class="load-more" type="button" data-load-more="${tier}">${remaining}명 더 보기</button>`
                  : ""
              }
            </section>`;
        })
        .join("");
  }

  function render(state) {
    renderFieldModeShell(state);
    if (!initial) {
      if (elements.search) elements.search.disabled = true;
      if (elements.status) {
        elements.status.textContent = state.error || "권위 데이터를 준비하고 있습니다.";
      }
      return;
    }
    if (mode === "field") {
      if (state.recommendationMode === "browse") {
        renderBigFields(state);
        renderSmallFields(state);
        renderSummary(state);
        renderResults(state);
      } else if (state.recommendationMode === "detailed") {
        renderResults(state);
      }
    } else {
      renderBigFields(state);
      renderSmallFields(state);
      renderUniversities(state);
      renderDepartments(state);
      renderSummary(state);
      renderResults(state);
    }
    if (elements.search) {
      elements.search.disabled = state.busy || !state.ready;
      elements.search.textContent = state.busy
        ? "검색 중…"
        : state.recommendationMode === "browse"
          ? "결과 자동 갱신"
          : mode === "field"
            ? "검색 실행"
            : "연구실 찾기";
    }
    if (elements.status) {
      elements.status.textContent = state.error
        ? state.error
        : state.busy
          ? "권위 데이터에서 검색하고 있습니다."
          : state.ready
            ? state.recommendationMode === "browse"
              ? "명시적 taxonomy-교수 ID 매핑을 사용할 준비가 되었습니다."
              : `검색 준비 완료 · ${
                  transport.mode === "uninitialized" ? "Worker 대기" : transport.mode
                }`
            : "권위 데이터를 준비하고 있습니다.";
    }
  }

  function announceResult(result) {
    if (!elements.live) return;
    elements.live.textContent =
      result.status === "INVALID_FILTER"
        ? "학교와 학과 필터 조합을 확인해 주세요."
        : `검색 결과 ${result.results.length}명입니다.`;
  }

  function scrollToResults() {
    document
      .getElementById("resultSection")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function runBrowseRecommendation(source) {
    const state = store.get();
    if (mode !== "field" || state.recommendationMode !== "browse") return null;
    const big = browseBigById[state.bigFieldId];
    const small = browseSmallById[state.smallFieldId];
    if (!big || !small || !small.parent_big_field_ids?.includes(state.bigFieldId)) {
      store.set({ error: "큰 연구 분야와 세부 연구 분야를 차례로 선택해 주세요." });
      return null;
    }
    const requestSequence = ++browseRunSequence;
    const requestedBigFieldId = state.bigFieldId;
    const requestedSmallFieldId = state.smallFieldId;
    store.set({
      busy: true,
      error: "",
      query: "",
      universities: [],
      departments: [],
      result: null,
      searchSource: source || "browse",
      visible: freshVisible(),
    });
    await Promise.resolve();
    if (requestSequence !== browseRunSequence) return null;
    const mappingRows =
      initial.browseTaxonomyV3ProfessorMap.public_mappings_by_small_field[
        requestedSmallFieldId
      ] || [];
    const results = mappingRows
      .map((mapping) => {
        const professorId = mapping.professor_id;
        const display = displayByProfessorId[professorId];
        if (
          !display ||
          !mapping.parent_big_field_ids?.includes(requestedBigFieldId) ||
          !["PRIMARY", "SECONDARY"].includes(mapping.centrality)
        ) return null;
        const evidenceValues = [...new Set(mapping.evidence_values || [])];
        return {
          professorId,
          display,
          tier: mapping.centrality === "PRIMARY" ? "Direct" : "Partial",
          browseCentrality: mapping.centrality,
          browseConfidence: mapping.confidence,
          directOfficialEvidenceCount: mapping.direct_official_evidence_count,
          distinctEvidenceFieldCount: mapping.distinct_evidence_field_count,
          matchedSmallFieldId: requestedSmallFieldId,
          matchedEvidence: { taxonomy: evidenceValues.slice(0, 9) },
          reason:
            mapping.mapping_source === "AFFILIATION_ONLY_UNVERIFIED_TOPIC"
              ? "공식 소속 학과를 기준으로 표시했습니다. 개인별 세부 연구 주제는 검증되지 않았으므로 공식 프로필을 확인해 주세요."
              : mapping.centrality === "PRIMARY"
                ? "공개 연구정보에서 선택 분야가 핵심 연구로 확인됩니다."
                : "공개 연구정보에서 선택 분야와 연결된 근거가 확인됩니다.",
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const centralityOrder =
          BROWSE_CENTRALITY_ORDER[left.browseCentrality] -
          BROWSE_CENTRALITY_ORDER[right.browseCentrality];
        if (centralityOrder) return centralityOrder;
        const leftName =
          left.display?.nameKo || left.display?.nameEn || left.professorId;
        const rightName =
          right.display?.nameKo || right.display?.nameEn || right.professorId;
        const nameOrder = KOREAN_NAME_COLLATOR.compare(leftName, rightName);
        return nameOrder || left.professorId.localeCompare(right.professorId);
      });
    const result = {
      status: "OK",
      recommendationMode: "browse",
      algorithm: "HUMAN_GUIDED_POLYHIERARCHICAL_MULTI_LABEL_FACETED_EXPERT_DISCOVERY_V1",
      ordering:
        "CENTRALITY_THEN_PROFESSOR_NAME_KO_ASC_THEN_PROFESSOR_ID",
      query: "",
      options: {
        universities: [],
        departments: [],
        bigFieldId: requestedBigFieldId,
        smallFieldId: requestedSmallFieldId,
      },
      results,
      sections: {
        Direct: results.filter((row) => row.browseCentrality === "PRIMARY"),
        Partial: results.filter((row) => row.browseCentrality === "SECONDARY"),
        Adjacent: [],
      },
      recovery: null,
      nameNavigation: null,
    };
    const current = store.get();
    if (
      requestSequence !== browseRunSequence ||
      current.recommendationMode !== "browse" ||
      current.bigFieldId !== requestedBigFieldId ||
      current.smallFieldId !== requestedSmallFieldId
    ) {
      return null;
    }
    store.set({ busy: false, result });
    announceResult(result);
    elements.summaryPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
    return result;
  }

  async function runDetailedRecommendation(source) {
    const state = store.get();
    if (mode !== "field" || state.recommendationMode !== "detailed") return null;
    const query = elements.query?.value || "";
    if (!query.trim()) {
      store.set({ error: "상세 연구 내용을 구체적으로 입력해 주세요." });
      return null;
    }
    store.set({
      busy: true,
      error: "",
      query,
      bigFieldId: "",
      smallFieldId: "",
      universities: [],
      departments: [],
      result: null,
      searchSource: source || "detailed",
      visible: { Direct: PAGE_SIZE, Partial: PAGE_SIZE, Adjacent: PAGE_SIZE },
    });
    try {
      const result = await transport.search(query, {
        universities: [],
        departments: [],
        smallFieldId: "",
        bigFieldId: "",
        directP1R2: state.directP1R2Enabled,
      });
      result.recommendationMode = "detailed";
      if (window.LabMatchAnalytics?.trackDirectSearch) {
        window.LabMatchAnalytics.trackDirectSearch(query, result.results.length);
      }
      store.set({ busy: false, result });
      announceResult(result);
      scrollToResults();
      return result;
    } catch (error) {
      store.set({
        busy: false,
        error: `검색을 완료하지 못했습니다: ${String(error?.message || error)}`,
      });
      return null;
    }
  }

  async function runSchoolRecommendation(source) {
    const state = store.get();
    const query = elements.query?.value || "";
    const canBrowse =
      query.trim() ||
      state.smallFieldId ||
      state.bigFieldId ||
      state.universities.length ||
      state.departments.length;
    if (!canBrowse) {
      store.set({ error: "분야, 학교·학과, 또는 상세 연구 내용을 하나 이상 선택해 주세요." });
      return null;
    }
    store.set({
      busy: true,
      error: "",
      query,
      searchSource: source || "manual",
      visible: { Direct: PAGE_SIZE, Partial: PAGE_SIZE, Adjacent: PAGE_SIZE },
    });
    try {
      const result = await transport.search(query, {
        universities: store.get().universities,
        departments: store.get().departments,
        smallFieldId: store.get().smallFieldId,
        bigFieldId: store.get().bigFieldId,
      });
      store.set({ busy: false, result });
      announceResult(result);
      scrollToResults();
      return result;
    } catch (error) {
      store.set({
        busy: false,
        error: `검색을 완료하지 못했습니다: ${String(error?.message || error)}`,
      });
      return null;
    }
  }

  function runSearch(source) {
    if (mode === "school") return runSchoolRecommendation(source);
    return store.get().recommendationMode === "browse"
      ? runBrowseRecommendation(source)
      : runDetailedRecommendation(source);
  }

  function updateModeUrl(nextMode, historyAction) {
    if (mode !== "field" || historyAction === "none") return;
    const url = new URL(window.location.href);
    if (nextMode === "selection") url.searchParams.delete("recommendationMode");
    else url.searchParams.set("recommendationMode", nextMode);
    url.searchParams.delete("bigField");
    url.searchParams.delete("smallField");
    window.history[historyAction === "replace" ? "replaceState" : "pushState"](
      { recommendationMode: nextMode },
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }

  function updateBrowseSelectionUrl(bigFieldId, smallFieldId, historyAction) {
    if (mode !== "field" || historyAction === "none") return;
    const url = new URL(window.location.href);
    url.searchParams.set("recommendationMode", "browse");
    if (bigFieldId) url.searchParams.set("bigField", bigFieldId);
    else url.searchParams.delete("bigField");
    if (smallFieldId) url.searchParams.set("smallField", smallFieldId);
    else url.searchParams.delete("smallField");
    window.history[historyAction === "replace" ? "replaceState" : "pushState"](
      { recommendationMode: "browse", bigFieldId, smallFieldId },
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  }

  function validatedBrowseSelection(rawSelection) {
    const big = browseBigById[rawSelection.bigFieldId];
    if (!big) return { bigFieldId: "", smallFieldId: "" };
    const small = browseSmallById[rawSelection.smallFieldId];
    if (!small || !small.parent_big_field_ids?.includes(big.id)) {
      return { bigFieldId: big.id, smallFieldId: "" };
    }
    return { bigFieldId: big.id, smallFieldId: small.id };
  }

  function setRecommendationMode(nextMode, historyAction = "push") {
    if (mode !== "field") return;
    const safeMode = FIELD_MODES.has(nextMode) ? nextMode : "selection";
    updateModeUrl(safeMode, historyAction);
    if (elements.query) elements.query.value = "";
    if (elements.smallFieldSearch) elements.smallFieldSearch.value = "";
    renderedFieldMode = "";
    browseRunSequence += 1;
    store.set({
      recommendationMode: safeMode,
      bigFieldId: "",
      smallFieldId: "",
      universities: [],
      departments: [],
      query: "",
      result: null,
      error: "",
      busy: false,
      visible: freshVisible(),
    });
    document.getElementById("appTop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function restoreFieldLocation() {
    if (mode !== "field") return;
    const nextMode = fieldModeFromLocation();
    if (nextMode !== "browse" || !initial) {
      setRecommendationMode(nextMode, "none");
      return;
    }
    const rawSelection = browseSelectionFromLocation();
    const selection = validatedBrowseSelection(rawSelection);
    if (
      rawSelection.bigFieldId !== selection.bigFieldId ||
      rawSelection.smallFieldId !== selection.smallFieldId
    ) {
      updateBrowseSelectionUrl(selection.bigFieldId, selection.smallFieldId, "replace");
    }
    if (elements.query) elements.query.value = "";
    if (elements.smallFieldSearch) elements.smallFieldSearch.value = "";
    renderedFieldMode = "";
    browseRunSequence += 1;
    store.set({
      recommendationMode: "browse",
      bigFieldId: selection.bigFieldId,
      smallFieldId: selection.smallFieldId,
      universities: [],
      departments: [],
      query: "",
      result: null,
      error: "",
      busy: false,
      visible: freshVisible(),
    });
    if (selection.smallFieldId) runBrowseRecommendation("history-restore");
  }

  function reset() {
    if (elements.query) elements.query.value = "";
    if (elements.smallFieldSearch) elements.smallFieldSearch.value = "";
    if (elements.departmentSearch) elements.departmentSearch.value = "";
    const state = store.get();
    if (mode === "field" && state.recommendationMode === "browse") {
      browseRunSequence += 1;
      updateBrowseSelectionUrl("", "", "push");
    }
    store.set({
      bigFieldId: "",
      smallFieldId: "",
      universities: fixedSchool ? [fixedSchool] : [],
      departments: [],
      query: "",
      result: null,
      error: "",
      visible: freshVisible(),
    });
    document.getElementById("appTop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  root.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const professorInfoButton = target.closest("[data-professor-info]");
    if (professorInfoButton) {
      openProfessorInfo(
        professorInfoButton.dataset.professorId,
        professorInfoButton.dataset.professorInfo
      );
      return;
    }
    const modeButton = target.closest("[data-recommendation-mode]");
    if (modeButton) {
      setRecommendationMode(modeButton.dataset.recommendationMode, "push");
      return;
    }
    if (target.closest("[data-reselect-mode]")) {
      setRecommendationMode("selection", "push");
      return;
    }
    const big = target.closest("[data-big-field]");
    if (big) {
      const bigFieldId = big.dataset.bigField;
      if (mode === "field" && store.get().recommendationMode === "browse") {
        if (!browseBigById[bigFieldId]) return;
        browseRunSequence += 1;
        updateBrowseSelectionUrl(bigFieldId, "", "push");
      }
      store.set({ bigFieldId, smallFieldId: "", result: null, error: "", busy: false });
      elements.smallFieldPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const small = target.closest("[data-small-field]");
    if (small) {
      const smallFieldId = small.dataset.smallField;
      if (mode === "field" && store.get().recommendationMode === "browse") {
        const state = store.get();
        const field = browseSmallById[smallFieldId];
        if (!field || !field.parent_big_field_ids?.includes(state.bigFieldId)) return;
        updateBrowseSelectionUrl(state.bigFieldId, smallFieldId, "push");
        store.set({ smallFieldId, result: null, error: "", busy: false });
        runBrowseRecommendation("small-field");
      } else {
        store.set({ smallFieldId, result: null, error: "" });
        if (mode === "school") runSchoolRecommendation("small-field");
      }
      return;
    }
    const banner = target.closest("[data-banner-small]");
    if (banner) {
      store.set({
        bigFieldId: banner.dataset.bannerBig,
        smallFieldId: banner.dataset.bannerSmall,
        result: null,
        error: "",
      });
      runSchoolRecommendation("banner");
      return;
    }
    if (target.closest("#searchButton")) {
      runSearch("manual");
      return;
    }
    if (target.closest("#resetButton")) {
      reset();
      return;
    }
    if (target.closest("#previousButton")) {
      const state = store.get();
      if (state.smallFieldId) {
        browseRunSequence += 1;
        if (mode === "field" && state.recommendationMode === "browse") {
          updateBrowseSelectionUrl(state.bigFieldId, "", "push");
        }
        store.set({ smallFieldId: "", result: null, busy: false });
      } else if (state.bigFieldId) {
        browseRunSequence += 1;
        if (mode === "field" && state.recommendationMode === "browse") {
          updateBrowseSelectionUrl("", "", "push");
        }
        store.set({ bigFieldId: "", result: null, busy: false });
      }
      else if (mode === "field") setRecommendationMode("selection", "push");
      else window.history.back();
      return;
    }
    const more = target.closest("[data-load-more]");
    if (more) {
      const tier = more.dataset.loadMore;
      store.set((state) => ({
        visible: { ...state.visible, [tier]: state.visible[tier] + PAGE_SIZE },
      }));
    }
  });

  root.addEventListener("change", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.matches("#directP1R2Toggle")) {
      store.set({ directP1R2Enabled: target.checked, result: null, error: "" });
      return;
    }
    if (mode !== "school") return;
    if (target.matches("[data-university]")) {
      const universities = [...root.querySelectorAll("[data-university]:checked")].map(
        (input) => input.value
      );
      const compatible = new Set(
        Object.entries(initial.filterIndexes.departments)
          .filter(
            ([, department]) =>
              !universities.length || universities.includes(department.universityCode)
          )
          .map(([departmentId]) => departmentId)
      );
      store.set((state) => ({
        universities,
        departments: state.departments.filter((departmentId) => compatible.has(departmentId)),
        result: null,
      }));
    }
    if (target.matches("[data-department]")) {
      store.set({
        departments: [...root.querySelectorAll("[data-department]:checked")].map(
          (input) => input.value
        ),
        result: null,
      });
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.matches("#smallFieldSearch")) renderSmallFields(store.get());
    if (target.matches("#departmentSearch")) renderDepartments(store.get());
    if (target.matches("#researchQuery")) {
      store.set({
        query: target.value,
        result: mode === "field" ? null : store.get().result,
        error: "",
      });
    }
  });

  root.addEventListener("keydown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.matches("#researchQuery") &&
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      runSearch("keyboard");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.getElementById("professorInfoModal")?.hidden) {
      closeProfessorInfo();
    }
  }); // PROFESSOR_INFO_ESCAPE

  store.subscribe(render);
  window.addEventListener("popstate", () => {
    if (mode === "field") restoreFieldLocation();
  });

  if (
    mode === "field" &&
    new URLSearchParams(window.location.search).has("recommendationMode") &&
    !FIELD_MODES.has(new URLSearchParams(window.location.search).get("recommendationMode"))
  ) {
    updateModeUrl("selection", "replace");
  }

  const ready = (async () => {
    try {
      initial = await loader.loadInitial();
      bigById = Object.fromEntries(
        initial.taxonomy.bigFields.map((field) => [field.bigFieldId, field])
      );
      smallById = Object.fromEntries(
        initial.taxonomy.smallFields.map((field) => [field.smallFieldId, field])
      );
      browseBigById = Object.fromEntries(
        initial.browseTaxonomyV3.big_fields.map((field) => [field.id, field])
      );
      browseSmallById = Object.fromEntries(
        initial.browseTaxonomyV3.small_fields.map((field) => [field.id, field])
      );
      displayByProfessorId = Object.fromEntries(
        initial.displayRecords.map((record) => [record.professorId, record])
      );
      dgistProfessorEnrichment = initial.dgistProfessorEnrichment || null;
      renderBanners(store.get());
      store.set({ ready: true });
      if (mode === "field") restoreFieldLocation();
      if (mode === "school" || store.get().recommendationMode === "detailed") {
        transport.initializeWorker();
      }
      return true;
    } catch (error) {
      store.set({
        error: `권위 데이터를 불러오지 못했습니다: ${String(error?.message || error)}`,
      });
      return false;
    }
  })();

  window.LabMatchGraduateApp = Object.freeze({
    ready,
    search: runSearch,
    runBrowseRecommendation,
    runDetailedRecommendation,
    setRecommendationMode,
    reset,
    store,
    transport,
    loader,
    diagnostics() {
      return {
        mode,
        recommendationMode: store.get().recommendationMode,
        fixedSchool,
        transport: transport.mode,
        runtimeBase: window.LabMatchRuntimeLoader.runtimeBase,
        state: store.get(),
      };
    },
  });

  render(store.get());
})();
