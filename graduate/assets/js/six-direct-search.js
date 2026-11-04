/* Six-university direct research search. The original four-university BM25
   school engine and all browse taxonomy files are intentionally untouched. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LabMatchSixDirect = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  const GROUP_WEIGHTS = Object.freeze({
    official: 5.0, topic: 4.3, lab: 4.0, target: 3.5,
    method: 3.4, phenomenon: 3.0, application: 2.8,
    platform: 2.8, normalized: 2.5, terms: 1.5,
    domain: 0.85, department: 0.45, name: 0,
  });
  const CORE = new Set([
    "official", "topic", "lab", "target", "method", "phenomenon",
    "application", "platform", "normalized",
  ]);
  const STOP = new Set([
    "연구", "분야", "관련", "기반", "위한", "통해", "통한", "활용", "적용", "대해",
    "대한", "에서", "있는", "하는", "하고", "과", "와", "및", "등", "그", "이",
    "the", "and", "for", "with", "into", "from", "using", "study", "research",
    "based", "on", "of", "in", "a", "an", "to", "by", "at",
  ]);
  const ORDER = { Direct: 0, Partial: 1, Adjacent: 2 };
  const KO = new Intl.Collator("ko-KR", { sensitivity: "base", numeric: true });
  const CODES = new Set(["DGIST", "KAIST", "SNU", "POSTECH", "GIST", "UNIST"]);

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC").toLocaleLowerCase("en-US")
      .replace(/[‐‑‒–—―\-_\/,.;:!?()[\]{}'"“”‘’<>|\\·•+&]+/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function significantTokens(query) {
    const values = normalize(query).split(" ").filter(Boolean);
    const significant = [...new Set(values.filter((v) => !STOP.has(v) && v.length >= 2))];
    return significant.length ? significant.slice(0, 14) : [];
  }
  function termIn(text, term) {
    if (!text || !term) return false;
    // CJK compounds can be written without spaces; English word boundaries
    // prevent e.g. AI matching 'chair' or 'mail'.
    if (/[가-힣ぁ-ゟァ-ヿ一-龯]/u.test(term)) return text.includes(term);
    return (` ${text} `).includes(` ${term} `);
  }
  function inEvidence(evidence, term) {
    return evidence.some((s) => termIn(s, term));
  }
  function stableEvidence(groups, tokens) {
    for (const group of CORE) {
      for (const phrase of groups[group] || []) {
        if (tokens.filter((token) => termIn(phrase, token)).length >= 2) return true;
      }
    }
    return false;
  }

  class Engine {
    constructor(index, displayRecords) {
      if (!index || index.schemaVersion !== "LAB_MATCH_SIX_UNIVERSITY_DIRECT_RESEARCH_INDEX_V1") {
        throw new Error("SIX_UNIVERSITY_DIRECT_INDEX_SCHEMA_MISMATCH");
      }
      const display = new Map((displayRecords || []).map((r) => [r.professorId, r]));
      if (index.records.length !== 1993 || display.size !== 1993) {
        throw new Error("SIX_UNIVERSITY_DIRECT_COUNT_MISMATCH");
      }
      this.rows = index.records.map((rec) => {
        const record = display.get(rec.id);
        if (!record || record.universityCode !== rec.university) {
          throw new Error(`SIX_UNIVERSITY_DIRECT_IDENTITY_MISMATCH:${rec.id}`);
        }
        const groups = {};
        for (const [group, values] of Object.entries(rec.fields || {})) {
          groups[group] = [...new Set(values.map(normalize).filter(Boolean))];
        }
        return { id: rec.id, university: rec.university, display: record, groups };
      });
      this.documentCount = this.rows.length;
    }

    search(query, options = {}) {
      const tokens = significantTokens(query);
      const allowed = new Set((options.universities || []).filter((x) => CODES.has(x)));
      const useContextGate = options.directP1R2 !== false;
      const sections = { Direct: [], Partial: [], Adjacent: [] };
      const empty = (result = {}) => ({
        status: "OK", query, options, results: [], sections,
        algorithm: "SIX_UNIVERSITY_FIELD_WEIGHTED_BM25_PLUS_V1",
        directP1R2: { applied: useContextGate, beforeCount: 0, afterCount: 0 },
        recovery: null, nameNavigation: null, ...result,
      });
      if (!tokens.length) return empty();
      const eligible = this.rows.filter((row) => !allowed.size || allowed.has(row.university));
      const nQuery = normalize(query);
      const compact = nQuery.replace(/\s+/g, "");
      const names = eligible.filter((row) =>
        (row.groups.name || []).some((name) => name === nQuery || name.replace(/\s+/g, "") === compact)
      );
      if (names.length) {
        const results = names.map((row) => ({
          professorId: row.id, display: row.display, tier: "Direct", score: 0,
          reason: "교수 이름과 정확히 일치하는 탐색 결과입니다.",
        })).sort((a, b) => KO.compare(a.display.nameKo || "", b.display.nameKo || ""));
        sections.Direct = results;
        return empty({ results, sections, nameNavigation: { query: nQuery } });
      }

      // Resolve document frequencies from the same 1,993-person corpus, not
      // the historical four-university-only inverted index.
      const candidateRows = [];
      const frequencies = new Array(tokens.length).fill(0);
      for (const row of this.rows) {
        const matched = [];
        const matchedGroups = new Set();
        let coreMatched = 0;
        for (let i = 0; i < tokens.length; i += 1) {
          const term = tokens[i];
          let bestWeight = 0;
          let bestGroup = "";
          let tf = 0;
          let core = false;
          const presentGroups = [];
          for (const [group, phrases] of Object.entries(row.groups)) {
            if (group === "name") continue;
            let occurrences = 0;
            for (const phrase of phrases) if (termIn(phrase, term)) occurrences += 1;
            if (!occurrences) continue;
            presentGroups.push(group);
            if (CORE.has(group)) core = true;
            const weight = GROUP_WEIGHTS[group] || 0;
            if (weight > bestWeight) {
              bestWeight = weight;
              bestGroup = group;
              tf = occurrences;
            }
          }
          if (bestWeight) {
            frequencies[i] += 1;
            if (core) coreMatched += 1;
            presentGroups.forEach((group) => { if (CORE.has(group)) matchedGroups.add(group); });
            matched.push({ index: i, weight: bestWeight, group: bestGroup, tf, core });
          }
        }
        if (matched.length) candidateRows.push({ row, matched, matchedGroups, coreMatched });
      }
      const n = this.documentCount;
      const idfs = frequencies.map((df) => Math.log(1 + (n - df + .5) / (df + .5)));
      const minCoverageCount = tokens.length === 1 ? 1 : Math.max(2, Math.ceil(tokens.length * 0.6));
      let beforeGate = 0;
      const results = [];
      for (const hit of candidateRows) {
        const { row, matched, matchedGroups, coreMatched } = hit;
        if (allowed.size && !allowed.has(row.university)) continue;
        const coreRatio = coreMatched / tokens.length;
        if (matched.length < minCoverageCount || !coreMatched) continue;
        if (tokens.length > 1 && coreMatched < 2) continue;
        const coherent = stableEvidence(row.groups, tokens);
        const twoIndependent = matchedGroups.size >= 2 && coreMatched >= minCoverageCount;
        beforeGate += 1;
        // Conservative gate: avoid composing unrelated single-word evidence
        // into a fake claim that a lab researches their combination.
        if (useContextGate && tokens.length > 1 && !coherent && !twoIndependent) continue;
        let score = 0;
        for (const h of matched) {
          const tf = Math.min(h.tf, 4);
          const k1 = 1.2;
          const b = 0.75;
          const sourceLength = Math.max(1, (row.groups[h.group] || []).length);
          const dl = Math.min(5, sourceLength);
          const bm25Plus = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / 2)) + 0.75;
          score += idfs[h.index] * h.weight * bm25Plus;
        }
        const phrase = tokens.length >= 2 && [...CORE].some((g) =>
          (row.groups[g] || []).some((text) => text.includes(nQuery))
        );
        if (phrase) score += 10;
        if (coherent) score += 5;
        score += 7 * (matched.length / tokens.length);
        let tier;
        if (tokens.length === 1) {
          tier = matched.some((m) => m.core && m.weight >= 2.5) ? "Direct" : "Partial";
        } else if (matched.length === tokens.length && (phrase || coherent || matchedGroups.size >= 2)) {
          tier = "Direct";
        } else {
          tier = "Partial";
        }
        results.push({
          professorId: row.id,
          display: row.display,
          tier,
          score: Math.round(score * 100) / 100,
          reason: coherent
            ? "같은 연구정보 근거 안에서 검색어가 함께 확인됩니다."
            : "공개 연구정보에서 일부 연구 요소가 확인됩니다.",
        });
      }
      results.sort((a, b) =>
        ORDER[a.tier] - ORDER[b.tier] || b.score - a.score ||
        KO.compare(a.display.nameKo || "", b.display.nameKo || "") ||
        a.professorId.localeCompare(b.professorId)
      );
      for (const r of results) sections[r.tier].push(r);
      return empty({ results, sections, directP1R2: {
        applied: useContextGate && tokens.length > 1, beforeCount: beforeGate, afterCount: results.length,
      } });
    }
  }
  return Object.freeze({ Engine, normalize, significantTokens });
});
