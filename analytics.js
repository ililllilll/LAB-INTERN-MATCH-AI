(function () {
  "use strict";

  const CONSENT_KEY = "labmatch_analytics_consent_v2";
  const ENDPOINT = "https://dgist-intern-match.goatcounter.com/count";
  const pendingEvents = [];
  let retryTimer = null;
  let retryCount = 0;
  const MAX_RETRIES = 100;

  function hasConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY) === "granted";
    } catch (_) {
      return false;
    }
  }

  function normalizedCharacterCount(query) {
    return Array.from(String(query || "").trim().replace(/\s+/gu, "")).length;
  }

  function goatCounterReady() {
    return Boolean(window.goatcounter && typeof window.goatcounter.count === "function");
  }

  function stopRetry() {
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    retryTimer = null;
    retryCount = 0;
  }

  function scheduleFlush() {
    if (retryTimer !== null || !pendingEvents.length || !hasConsent()) return;
    if (retryCount >= MAX_RETRIES) return;
    retryTimer = window.setTimeout(function () {
      retryTimer = null;
      retryCount += 1;
      flush();
      if (pendingEvents.length) scheduleFlush();
    }, 100);
  }

  function flush() {
    if (!hasConsent()) {
      pendingEvents.length = 0;
      stopRetry();
      return;
    }
    if (!goatCounterReady()) {
      scheduleFlush();
      return;
    }
    stopRetry();
    while (pendingEvents.length) {
      const event = pendingEvents.shift();
      try {
        window.goatcounter.count(event);
      } catch (_) {
        pendingEvents.unshift(event);
        scheduleFlush();
        break;
      }
    }
  }

  function queueEvent(path, title) {
    if (!hasConsent()) return false;
    pendingEvents.push({
      path,
      title,
      referrer: "",
      event: true,
      no_session: true,
    });
    flush();
    return true;
  }

  function trackDirectSearch(query, resultCount) {
    const safeResultCount = Number(resultCount);
    if (!Number.isInteger(safeResultCount) || safeResultCount < 0) return false;
    const queryCharacterCount = normalizedCharacterCount(query);
    if (queryCharacterCount < 1) return false;

    // 한 번의 정상 완료 검색을 총횟수와 정확한 형태 통계로 각각 집계합니다.
    // 검색어 원문, 토큰, 교수명, 교수 ID, 결과 목록과 점수는 전송하지 않습니다.
    const accepted = queueEvent("direct-search-total", "직접 검색 총횟수");
    if (!accepted) return false;
    queueEvent(
      `direct-search-chars-${queryCharacterCount}-results-${safeResultCount}`,
      `직접 검색 · 공백 제외 ${queryCharacterCount}글자 · 결과 ${safeResultCount}명`
    );
    return true;
  }

  window.addEventListener("lm-analytics-ready", flush);
  window.addEventListener("lm-analytics-consent-granted", scheduleFlush);
  window.addEventListener("lm-analytics-consent-changed", function (event) {
    if (event.detail && event.detail.value === "granted") scheduleFlush();
    else if (event.detail && event.detail.value === "denied") {
      pendingEvents.length = 0;
      stopRetry();
    }
  });

  window.LabMatchAnalytics = Object.freeze({
    mode: "PAGEVIEW_PLUS_DIRECT_SEARCH_EXACT_COUNTS",
    endpoint: ENDPOINT,
    consentKey: CONSENT_KEY,
    tracksPageviews: true,
    tracksDirectSearches: true,
    tracksSearchQueryText: false,
    tracksResultDetails: false,
    queryLengthRule: "TRIMMED_UNICODE_CODE_POINTS_EXCLUDING_WHITESPACE",
    trackDirectSearch,
    flush,
    affectsRanking: false,
  });
})();
