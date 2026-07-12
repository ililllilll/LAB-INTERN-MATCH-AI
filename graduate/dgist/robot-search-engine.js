(function (root, factory) {
  const api = factory(root && root.DGIST_ROBOT_CURATED_DB);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DGISTRobotSearchEngine = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (db) {
  "use strict";
  db = db || { profiles: [], fields: [], bannerMap: {}, intentDefinitions: [] };

  const STOP = new Set(["교수", "교수님", "연구", "연구실", "랩", "랩실", "추천", "소개", "찾아줘", "관련", "분야", "하는", "하시는", "하고", "싶어", "싶습니다", "dgist", "디지스트", "로봇및기계전자공학과", "로봇기계학과"]);
  const BROAD_INTENTS = new Set(["robot", "ai", "physical-ai", "robot-control", "robot-design", "photonics", "mems", "nems", "hri", "robot-sensor"]);

  function normalize(value) {
    return String(value || "").normalize("NFKC").toLowerCase()
      .replace(/[·•,/()\[\]{}:;_|]+/g, " ")
      .replace(/[-–—]+/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function contains(text, term) {
    const source = normalize(text); const needle = normalize(term);
    if (!source || !needle) return false;
    if (/^[a-z0-9+.#]+$/i.test(needle) && needle.length <= 4) {
      return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`, "i").test(source);
    }
    return source.includes(needle);
  }

  function unique(items) {
    const seen = new Set(); const out = [];
    (items || []).forEach((item) => { const key = normalize(item); if (key && !seen.has(key)) { seen.add(key); out.push(item); } });
    return out;
  }

  function baseInternalRecords() {
    if (typeof window === "undefined") return [];
    const records = (((window.DGIST_INTERNAL_RECOMMENDATION_DB || {}).robot) || []);
    return Array.isArray(records) ? records : [];
  }

  function mergedProfiles() {
    // 로봇및기계전자공학과는 공식 페이지를 기준으로 수동 정제한 오버레이만 점수에 사용합니다.
    // 원본 data.js와 기존 내부 DB는 카드/링크 보존용이며, 자동 크롤링 키워드와 넓은 통합 태그는
    // 이 학과의 추천 점수에 다시 섞지 않습니다.
    return (db.profiles || []).map((profile, index) => {
      const strongTerms = unique([...(profile.directTerms || []), ...(profile.officialFields || [])]);
      const relatedTerms = unique([...(profile.relatedTerms || [])]);
      return { ...profile, index, strongTerms, relatedTerms, searchText: normalize([profile.professor, profile.labName, ...strongTerms, ...relatedTerms].join(" ")) };
    });
  }

  let profilesCache = null;
  function profiles() { if (!profilesCache) profilesCache = mergedProfiles(); return profilesCache; }

  function detectIntents(query) {
    const found = [];
    const add = (id, hit) => {
      const current = found.find((item) => item.id === id);
      if (current) current.hits = unique([...(current.hits || []), hit]);
      else found.push({ id, hits: [hit] });
    };
    (db.intentDefinitions || []).forEach((intent) => {
      const hits = (intent.aliases || []).filter((alias) => contains(query, alias));
      if (hits.length) found.push({ id: intent.id, hits });
    });

    // 자연스러운 결합 표현을 개념별로 분해합니다.
    // 예: "웨어러블 로봇 센서"는 웨어러블 로봇 AND 웨어러블 센서를 모두 요구합니다.
    const q = normalize(query);
    const wearable = contains(q, "웨어러블") || contains(q, "wearable") || contains(q, "착용형");
    if (wearable && (contains(q, "로봇") || contains(q, "robot"))) add("wearable-robot", "웨어러블 로봇");
    if (wearable && (contains(q, "센서") || contains(q, "sensor"))) add("wearable-sensor", "웨어러블 센서");

    const autonomous = contains(q, "자율") || contains(q, "autonomous");
    if (autonomous && (contains(q, "주행") || contains(q, "driving") || contains(q, "vehicle"))) add("autonomous-driving", "자율주행");
    if (autonomous && (contains(q, "비행") || contains(q, "flight"))) add("autonomous-flight", "자율비행");

    const aerial = contains(q, "드론") || contains(q, "uav") || contains(q, "무인비행체") || contains(q, "비행로봇");
    if (aerial) add("drone", "드론·UAV");
    if (aerial && (contains(q, "제어") || contains(q, "control"))) add("robot-control", "비행 제어");

    // "유연 로봇 피부"의 '유연 로봇'을 소프트로봇으로 이중 해석하지 않습니다.
    // 이 표현은 전자피부/로봇 피부의 재료 특성을 뜻하므로 피부 intent를 우선합니다.
    if (found.some((item) => item.id === "electronic-skin") && (contains(q, "피부") || contains(q, "skin"))) {
      const softIndex = found.findIndex((item) => item.id === "soft-robot");
      if (softIndex >= 0 && !contains(q, "소프트 로봇") && !contains(q, "soft robot")) found.splice(softIndex, 1);
    }

    return found;
  }

  function meaningfulTokens(query) {
    return unique(normalize(query).split(/\s+/).filter((t) => {
      if (!t || STOP.has(t)) return false;
      if (/^[a-z0-9]+$/i.test(t)) return t.length >= 3;
      return t.length >= 2;
    }));
  }

  function termHits(profile, query) {
    const strong = (profile.strongTerms || []).filter((term) => contains(query, term) || contains(term, query));
    const related = (profile.relatedTerms || []).filter((term) => contains(query, term) || contains(term, query));
    return { strong: unique(strong), related: unique(related) };
  }

  function intentMatch(profile, intentId) { return (profile.intents || []).includes(intentId); }

  function scoreProfile(profile, query, options) {
    const q = normalize(query); if (!q) return null;
    const intents = detectIntents(q);
    const specific = intents.filter((item) => !BROAD_INTENTS.has(item.id));
    const broad = intents.filter((item) => BROAD_INTENTS.has(item.id));
    const hits = termHits(profile, q);
    const tokens = meaningfulTokens(q);
    const tokenHits = tokens.filter((token) => contains(profile.searchText, token));
    const specificMatched = specific.filter((item) => intentMatch(profile, item.id));
    const broadMatched = broad.filter((item) => intentMatch(profile, item.id));

    // 교수명 직접 검색
    if (contains(q, profile.professor)) {
      return { profile, score: 100000, evidence: [profile.professor, ...(profile.officialFields || []).slice(0, 3)], coverage: 1, intentIds: intents.map((x) => x.id) };
    }

    // 구체 intent가 2개 이상이면 모두 만족해야 직접 후보로 인정합니다.
    if (specific.length && specificMatched.length < specific.length) return null;

    let tokenRequired = 0;
    if (!specific.length) {
      if (tokens.length <= 2) tokenRequired = tokens.length;
      else tokenRequired = Math.ceil(tokens.length * 0.67);
      if (tokenRequired && tokenHits.length < tokenRequired && !hits.strong.length) return null;
    }

    if (!specific.length && !broad.length && !hits.strong.length && !tokenHits.length) return null;

    let score = 0;
    score += specificMatched.length * 1500;
    score += broadMatched.length * 260;
    score += hits.strong.length * 360;
    score += hits.related.length * 110;
    score += tokenHits.length * 120;
    if (specific.length && specificMatched.length === specific.length) score += 700;

    // 공식 분야별 우선순위는 동률 후보의 전문성을 구분하기 위한 제한적 보너스입니다.
    // 예: "웨어러블 로봇"에서는 공식적으로 웨어러블·보조로봇 연구실인 박준혁 교수를 먼저 표시합니다.
    [...specificMatched, ...broadMatched].forEach((item) => {
      const order = ((db.intentPriority || {})[item.id] || []);
      const rank = order.indexOf(profile.professor);
      if (rank >= 0) score += Math.max(120, 900 - rank * 120);
    });
    if (contains(profile.labName, q)) score += 500;
    if (hits.strong.some((term) => normalize(term) === q)) score += 600;
    if (!specific.length && broad.length && !broadMatched.length && !hits.strong.length) return null;
    if (score < (specific.length ? 800 : 180)) return null;

    const evidence = unique([
      ...specificMatched.flatMap((i) => i.hits),
      ...hits.strong,
      ...tokenHits,
      ...hits.related
    ]).slice(0, 5);
    return { profile, score, evidence: evidence.length ? evidence : (profile.officialFields || []).slice(0, 3), coverage: tokens.length ? tokenHits.length / tokens.length : 1, intentIds: intents.map((x) => x.id) };
  }

  function search(query, options) {
    options = options || {};
    const scored = profiles().map((p) => scoreProfile(p, query, options)).filter(Boolean)
      .sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.profile.index - b.profile.index);
    const limit = Number.isFinite(options.limit) ? options.limit : 10;
    return scored.slice(0, Math.max(1, limit));
  }

  function banner(fieldKey) {
    const order = (db.bannerMap || {})[fieldKey] || [];
    const byName = new Map(profiles().map((p) => [p.professor, p]));
    return order.map((name, index) => ({ profile: byName.get(name), score: 100000 - index * 1000, evidence: [(db.fields || []).find((f) => f[2] === fieldKey)?.[0] || fieldKey], coverage: 1, intentIds: [fieldKey] })).filter((x) => x.profile);
  }

  function evidenceForProfessor(query, professor) {
    const item = search(query, { limit: 28 }).find((result) => result.profile.professor === professor);
    return item ? item.evidence : [];
  }

  return { version: db.version, db, normalize, contains, profiles, detectIntents, search, banner, evidenceForProfessor };
});
