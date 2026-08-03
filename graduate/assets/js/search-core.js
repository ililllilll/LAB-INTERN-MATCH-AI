(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LabMatchSearch = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  const AXIS_BY_FIELD = Object.freeze({
    topic_ko: "topic",
    topic_en: "topic",
    method_ko: "method",
    method_en: "method",
    material_target_ko: "materialTarget",
    material_target_en: "materialTarget",
    phenomenon_ko: "phenomenon",
    phenomenon_en: "phenomenon",
    application_ko: "application",
    application_en: "application",
    platform_ko: "platform",
    platform_en: "platform",
    domain_ko: "domain",
    domain_en: "domain",
  });

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .replace(/[-‐‑‒–—―_/·•,.;:!?()[\]{}'"“”‘’<>|\\]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeSpacingVariant(value) {
    return normalizeText(value).replace(/\s+/g, "");
  }

  function tokenize(value) {
    const normalized = normalizeText(value);
    return normalized ? normalized.split(" ").filter(Boolean) : [];
  }

  function globalIdf(documentCount, documentFrequency) {
    const n = Number(documentCount);
    const df = Number(documentFrequency);
    if (!Number.isFinite(n) || !Number.isFinite(df) || n <= 0 || df < 0) return 0;
    const value = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function bm25PlusTerm({ tf, dl, avgdl, k1, b, delta, idf }) {
    const frequency = Number(tf);
    if (!Number.isFinite(frequency) || frequency <= 0) return 0;
    const safeLength = Number.isFinite(Number(dl)) && Number(dl) >= 0 ? Number(dl) : 0;
    const safeAverage = Number.isFinite(Number(avgdl)) && Number(avgdl) > 0 ? Number(avgdl) : 1;
    const safeK1 = Number.isFinite(Number(k1)) && Number(k1) > 0 ? Number(k1) : 1.2;
    const safeB = Number.isFinite(Number(b)) ? Math.min(1, Math.max(0, Number(b))) : 0.75;
    const safeDelta = Number.isFinite(Number(delta)) && Number(delta) >= 0 ? Number(delta) : 0;
    const safeIdf = Number.isFinite(Number(idf)) && Number(idf) >= 0 ? Number(idf) : 0;
    const denominator =
      frequency + safeK1 * (1 - safeB + safeB * (safeLength / safeAverage));
    if (!Number.isFinite(denominator) || denominator <= 0) return 0;
    const value =
      safeIdf * ((frequency * (safeK1 + 1)) / denominator + safeDelta);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function toSet(values) {
    return new Set(Array.isArray(values) ? values : []);
  }

  function unionInto(target, values) {
    for (const value of values || []) target.add(value);
    return target;
  }

  function intersectSets(left, right) {
    if (!left) return right ? new Set(right) : null;
    if (!right) return new Set(left);
    const output = new Set();
    const [small, large] = left.size <= right.size ? [left, right] : [right, left];
    for (const value of small) if (large.has(value)) output.add(value);
    return output;
  }

  function postingDocuments(flatPosting) {
    const values = [];
    for (let index = 0; index < (flatPosting || []).length; index += 2) {
      values.push(flatPosting[index]);
    }
    return values;
  }

  function phraseMatches(normalizedQuery, lookup, maxWords) {
    const queryTokens = tokenize(normalizedQuery);
    const matches = [];
    const seen = new Set();
    const maximum = Math.min(maxWords || 8, queryTokens.length);
    for (let size = maximum; size >= 1; size -= 1) {
      for (let start = 0; start + size <= queryTokens.length; start += 1) {
        const phrase = queryTokens.slice(start, start + size).join(" ");
        if (!seen.has(phrase) && lookup[phrase]) {
          seen.add(phrase);
          matches.push({ phrase, start, end: start + size, entry: lookup[phrase] });
        }
      }
    }
    return matches;
  }

  function interpretQuery(query, runtime, mode) {
    const normalized = normalizeText(query);
    const tokens = tokenize(normalized);
    const allMatches = phraseMatches(normalized, runtime.exactPhraseLookup || {}, 8);
    const occupied = new Set();
    const matches = [];
    for (const match of allMatches) {
      let overlaps = false;
      for (let index = match.start; index < match.end; index += 1) {
        if (occupied.has(index)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;
      matches.push(match);
      for (let index = match.start; index < match.end; index += 1) occupied.add(index);
    }
    const canonicalConceptIds = new Set();
    const aliasConceptIds = new Set();
    const resolvedAbbreviationIds = new Set();
    const unresolvedTerms = [];
    const exactPhrases = [];
    const axes = new Set();

    for (const match of matches) {
      const entry = match.entry || {};
      const ids = Array.isArray(entry.ids) ? entry.ids : [];
      const termTypes = new Set([entry.termType, ...(entry.termTypes || [])]);
      const isAbbreviation = termTypes.has("abbreviation");
      const isAlias = termTypes.has("alias");
      const isCanonical = termTypes.has("canonical_label");
      if (entry.ambiguous || ids.length !== 1) {
        unresolvedTerms.push({
          term: match.phrase,
          type: isAbbreviation ? "abbreviation" : "ambiguous_term",
          ids: ids.slice(),
          resolutionPolicy: entry.resolutionPolicy || "context_required",
        });
        continue;
      }
      if (isAbbreviation) {
        resolvedAbbreviationIds.add(ids[0]);
      } else if (isAlias && mode === "OFFICIAL_EXACT_ALIAS") {
        aliasConceptIds.add(ids[0]);
      } else if (isCanonical || !isAlias) {
        canonicalConceptIds.add(ids[0]);
      }
      if (!isAlias || mode === "OFFICIAL_EXACT_ALIAS") {
        exactPhrases.push(match.phrase);
      }
      for (const axis of entry.axes || []) axes.add(axis);
    }

    if (canonicalConceptIds.size || aliasConceptIds.size) {
      const contextIds = new Set([...canonicalConceptIds, ...aliasConceptIds]);
      for (const unresolved of unresolvedTerms) {
        if (unresolved.type !== "abbreviation") continue;
        const overlap = unresolved.ids.filter((id) => contextIds.has(id));
        if (overlap.length === 1) {
          resolvedAbbreviationIds.add(overlap[0]);
          unresolved.resolvedByContext = true;
        }
      }
    }

    return {
      original: String(query || ""),
      normalized,
      tokens,
      matches,
      canonicalConceptIds: [...canonicalConceptIds].sort(),
      aliasConceptIds: [...aliasConceptIds].sort(),
      resolvedAbbreviationIds: [...resolvedAbbreviationIds].sort(),
      exactPhrases: [...new Set(exactPhrases)].sort(),
      unresolvedTerms,
      axes: [...axes].sort(),
    };
  }

  class Engine {
    constructor(runtime) {
      this.runtime = runtime || {};
      this.documents = this.runtime.professorDocuments || [];
      this.displayRecords = this.runtime.displayRecords || [];
      this.documentDictionary = this.runtime.documentDictionary || [];
      this.fieldRegistry = this.runtime.fieldRegistry || { fields: [] };
      this.tokenDictionary = this.runtime.tokenDictionary || {};
      this.postings = this.runtime.postings || [];
      this.scorer = this.runtime.scorerConfig || {};
      this.tiers = this.runtime.tierConfig || {};
      this.recovery = this.runtime.recoveryConfig || {};
      this.directP1R2 = this.runtime.directP1R2Config || { enabledByDefault: false };
      this.filters = this.runtime.filterIndexes || { universities: {}, departments: {} };
      this.taxonomy = this.runtime.taxonomy || { bigFields: [], smallFields: [] };
      this.nameLookup = this.runtime.professorNameLookup || {};
      this.smallFieldById = Object.fromEntries(
        (this.taxonomy.smallFields || []).map((field) => [field.smallFieldId, field])
      );
      this.bigFieldById = Object.fromEntries(
        (this.taxonomy.bigFields || []).map((field) => [field.bigFieldId, field])
      );
      this.fieldConfig = Object.fromEntries(
        (this.fieldRegistry.fields || []).map((field) => [field.id, field])
      );
      this.lastDiagnostics = null;
    }

    eligibility(options) {
      const universities = [...new Set(options.universities || [])].sort();
      const departments = [...new Set(options.departments || [])].sort();
      let universitySet = null;
      let departmentSet = null;

      if (universities.length) {
        universitySet = new Set();
        for (const code of universities) {
          unionInto(universitySet, this.filters.universities?.[code]?.documents || []);
        }
      }
      if (departments.length) {
        departmentSet = new Set();
        for (const departmentId of departments) {
          unionInto(departmentSet, this.filters.departments?.[departmentId]?.documents || []);
        }
      }

      const compatibleDepartments = departments.filter((departmentId) =>
        universities.includes(this.filters.departments?.[departmentId]?.universityCode)
      );
      const invalid =
        universities.length > 0 &&
        departments.length > 0 &&
        compatibleDepartments.length === 0;
      const eligible = intersectSets(universitySet, departmentSet);
      return {
        status: invalid ? "INVALID_FILTER" : "VALID",
        universities,
        departments,
        eligible,
      };
    }

    _scoreLexical(interpreted) {
      const scoreByDocument = new Map();
      const axesByDocument = new Map();
      const matchedFieldsByDocument = new Map();
      const n = this.documents.length;
      const k1 = Number(this.scorer.k1 || 1.35);
      const delta = Number(this.scorer.delta || 0.75);
      const uniqueTokens = [...new Set(interpreted.tokens)];

      for (const token of uniqueTokens) {
        const dictionaryEntry = this.tokenDictionary[token];
        if (!dictionaryEntry) continue;
        const idf = globalIdf(n, dictionaryEntry.df);
        const shard = this.postings[dictionaryEntry.shard] || {};
        const fields = shard[token] || {};
        for (const [fieldId, flatPosting] of Object.entries(fields)) {
          const config = this.fieldConfig[fieldId];
          if (!config) continue;
          const weight = Number(this.scorer.fieldWeights?.[fieldId] ?? config.weight ?? 0);
          if (!weight) continue;
          for (let index = 0; index < flatPosting.length; index += 2) {
            const documentId = flatPosting[index];
            const tf = flatPosting[index + 1];
            const dl = this.documents[documentId]?.fieldLengths?.[fieldId] || 0;
            const contribution =
              weight *
              bm25PlusTerm({
                tf,
                dl,
                avgdl: config.avgdl,
                k1,
                b: config.b,
                delta,
                idf,
              });
            if (!contribution) continue;
            scoreByDocument.set(
              documentId,
              (scoreByDocument.get(documentId) || 0) + contribution
            );
            if (!matchedFieldsByDocument.has(documentId)) {
              matchedFieldsByDocument.set(documentId, new Set());
            }
            matchedFieldsByDocument.get(documentId).add(fieldId);
            const axis = AXIS_BY_FIELD[fieldId];
            if (axis) {
              if (!axesByDocument.has(documentId)) axesByDocument.set(documentId, new Set());
              axesByDocument.get(documentId).add(axis);
            }
          }
        }
      }
      return { scoreByDocument, axesByDocument, matchedFieldsByDocument };
    }

    _addConceptEvidence(state, interpreted, mode) {
      const conceptGroups = [
        {
          ids: interpreted.canonicalConceptIds,
          bonus: Number(this.scorer.bonuses?.canonicalConcept || 0),
          type: "canonical",
        },
        {
          ids: interpreted.aliasConceptIds,
          bonus: Number(this.scorer.bonuses?.aliasConcept || 0),
          type: "alias",
        },
        {
          ids: interpreted.resolvedAbbreviationIds,
          bonus: Number(this.scorer.bonuses?.resolvedAbbreviation || 0),
          type: "abbreviation",
        },
      ];
      for (const group of conceptGroups) {
        for (const conceptId of group.ids) {
          const documents = this.runtime.globalConceptPostings?.[conceptId] || [];
          const concept = this.runtime.globalConceptLookup?.[conceptId] || {};
          for (const documentId of documents) {
            const dedupeKey = `concept:${conceptId}`;
            if (!state.evidenceKeys.has(documentId)) state.evidenceKeys.set(documentId, new Set());
            if (state.evidenceKeys.get(documentId).has(dedupeKey)) continue;
            state.evidenceKeys.get(documentId).add(dedupeKey);
            state.scoreByDocument.set(
              documentId,
              (state.scoreByDocument.get(documentId) || 0) + group.bonus
            );
            if (!state.exactConcepts.has(documentId)) state.exactConcepts.set(documentId, new Set());
            state.exactConcepts.get(documentId).add(conceptId);
            if (!state.axesByDocument.has(documentId)) state.axesByDocument.set(documentId, new Set());
            if (concept.axis) state.axesByDocument.get(documentId).add(concept.axis);
            if (group.type === "abbreviation") {
              if (!state.abbreviations.has(documentId)) state.abbreviations.set(documentId, new Set());
              state.abbreviations.get(documentId).add(conceptId);
            }
          }
        }
      }

      for (const phrase of interpreted.exactPhrases) {
        const entry = this.runtime.exactPhraseLookup?.[phrase];
        if (!entry || entry.ambiguous || (entry.ids || []).length !== 1) continue;
        const conceptId = entry.ids[0];
        for (const documentId of this.runtime.globalConceptPostings?.[conceptId] || []) {
          const dedupeKey = `phrase:${phrase}`;
          if (!state.evidenceKeys.has(documentId)) state.evidenceKeys.set(documentId, new Set());
          if (state.evidenceKeys.get(documentId).has(dedupeKey)) continue;
          state.evidenceKeys.get(documentId).add(dedupeKey);
          state.scoreByDocument.set(
            documentId,
            (state.scoreByDocument.get(documentId) || 0) +
              Number(this.scorer.bonuses?.exactPhrase || 0)
          );
          if (!state.exactPhrases.has(documentId)) state.exactPhrases.set(documentId, new Set());
          state.exactPhrases.get(documentId).add(phrase);
        }
      }
    }

    _addTaxonomyEvidence(state, options) {
      const selectedSmallFieldId = options.smallFieldId || "";
      const selectedBigFieldId = options.bigFieldId || "";
      if (selectedSmallFieldId) {
        const field = this.smallFieldById[selectedSmallFieldId];
        for (const professorId of field?.directProfessorIds || []) {
          const documentId = this.documentDictionary.indexOf(professorId);
          if (documentId < 0) continue;
          state.scoreByDocument.set(
            documentId,
            (state.scoreByDocument.get(documentId) || 0) +
              Number(this.scorer.bonuses?.directSmallField || 0)
          );
          state.directSmall.add(documentId);
        }
      }
      if (selectedBigFieldId) {
        const field = this.bigFieldById[selectedBigFieldId];
        for (const professorId of field?.directProfessorIds || []) {
          const documentId = this.documentDictionary.indexOf(professorId);
          if (documentId < 0) continue;
          state.scoreByDocument.set(
            documentId,
            (state.scoreByDocument.get(documentId) || 0) +
              Number(this.scorer.bonuses?.directBigField || 0)
          );
          state.directBig.add(documentId);
        }
      }
    }

    _tier(documentId, state, browsing) {
      if (state.directSmall.has(documentId)) return "Direct";
      const score = state.scoreByDocument.get(documentId) || 0;
      const exactConceptCount = state.exactConcepts.get(documentId)?.size || 0;
      const exactPhraseCount = state.exactPhrases.get(documentId)?.size || 0;
      const axisCount = state.axesByDocument.get(documentId)?.size || 0;
      if (
        exactConceptCount > 0 ||
        exactPhraseCount > 0 ||
        (score >= Number(this.tiers.direct?.minimumScore || 13) &&
          axisCount >= Number(this.tiers.direct?.minimumIndependentAxes || 2))
      ) {
        return "Direct";
      }
      if (
        score >= Number(this.tiers.partial?.minimumScore || 4.25) &&
        axisCount >= Number(this.tiers.partial?.minimumIndependentAxes || 1)
      ) {
        return "Partial";
      }
      if (browsing || score >= Number(this.tiers.adjacent?.minimumScore || 1.15)) {
        return "Adjacent";
      }
      return "";
    }

    _result(documentId, state, options, recovery, browsing) {
      const document = this.documents[documentId];
      const display = this.displayRecords[documentId];
      const axes = [...(state.axesByDocument.get(documentId) || [])].sort();
      const matchedEvidence = {};
      for (const axis of axes) {
        const values = document.evidence?.[axis] || [];
        if (values.length) matchedEvidence[axis] = values.slice(0, 3);
      }
      const exactConceptIds = [...(state.exactConcepts.get(documentId) || [])].sort();
      const exactPhrases = [...(state.exactPhrases.get(documentId) || [])].sort();
      const tier = this._tier(documentId, state, browsing);
      const selectedSmall = options.smallFieldId
        ? this.smallFieldById[options.smallFieldId]
        : null;
      const reasons = [];
      if (state.directSmall.has(documentId) && selectedSmall) {
        reasons.push(`${selectedSmall.nameKo} 동결 taxonomy 직접 소속`);
      }
      if (exactConceptIds.length) reasons.push("공식 global concept 정확 일치");
      if (exactPhrases.length) reasons.push(`공식 표현 일치: ${exactPhrases.slice(0, 2).join(", ")}`);
      if (axes.length) reasons.push(`연구 근거 축: ${axes.join(", ")}`);
      if (!reasons.length && browsing) reasons.push("선택한 구조화 필터 범위의 교수");
      if (!reasons.length) reasons.push("권위 연구 문서의 제한적 어휘 일치");

      return {
        documentId,
        professorId: document.professorId,
        display,
        tier,
        rawScore: Number((state.scoreByDocument.get(documentId) || 0).toFixed(8)),
        exactConceptIds,
        exactConceptCount: exactConceptIds.length,
        exactPhrases,
        exactPhraseCount: exactPhrases.length,
        matchedIndependentAxes: axes,
        matchedIndependentAxisCount: axes.length,
        matchedEvidence,
        matchedSmallFieldId: state.directSmall.has(documentId)
          ? options.smallFieldId || ""
          : "",
        reason: reasons.join(" · "),
        recovery,
      };
    }

    _directP1R2Values(documentId) {
      const document = this.documents[documentId] || {};
      const display = this.displayRecords[documentId] || {};
      const configured = Array.isArray(this.directP1R2.authoritativeFields)
        ? this.directP1R2.authoritativeFields
        : [];
      const values = [];
      for (const fieldId of configured) {
        for (const value of document.fields?.[fieldId] || []) {
          const normalized = normalizeText(value);
          if (normalized) values.push({ fieldId, normalized, value: String(value) });
        }
      }
      const summary = normalizeText(display.summaryKo || "");
      if (summary) values.push({ fieldId: "display_summary_ko", normalized: summary, value: display.summaryKo });
      return values;
    }

    _orderedTokenSpan(value, tokens, maximumSpan) {
      const words = tokenize(value);
      if (!words.length || !tokens.length) return null;
      const sequences = [];
      function visit(tokenIndex, previousWordIndex, sequence) {
        if (tokenIndex >= tokens.length) {
          sequences.push(sequence.slice());
          return;
        }
        for (let wordIndex = previousWordIndex + 1; wordIndex < words.length; wordIndex += 1) {
          if (words[wordIndex].includes(tokens[tokenIndex])) {
            sequence.push(wordIndex);
            visit(tokenIndex + 1, wordIndex, sequence);
            sequence.pop();
          }
        }
      }
      visit(0, -1, []);
      let best = null;
      for (const sequence of sequences) {
        const span = sequence[sequence.length - 1] - sequence[0];
        if (span <= maximumSpan && (best === null || span < best)) best = span;
      }
      return best;
    }

    _directP1R2Evidence(result, interpreted, topScore) {
      const config = this.directP1R2 || {};
      const override = config.queryOverrides?.[interpreted.normalized] || {};
      const tokens = [...new Set(interpreted.tokens || [])];
      const compactQuery = safeSpacingVariant(interpreted.normalized);
      const maximumSpan = Number(override.maxOrderedSpanWords ?? config.maxOrderedSpanWords ?? 4);
      const values = this._directP1R2Values(result.documentId);
      const highSignal = new Set(config.highSignalFields || []);
      const exactSources = [];
      const proximitySources = [];
      const tokenSources = Object.fromEntries(tokens.map((token) => [token, new Set()]));
      let highSignalCoverage = true;

      for (const entry of values) {
        const compactValue = safeSpacingVariant(entry.normalized);
        if (compactQuery && compactValue.includes(compactQuery)) exactSources.push(entry.fieldId);
        const span = this._orderedTokenSpan(entry.normalized, tokens, maximumSpan);
        if (span !== null) proximitySources.push({ fieldId: entry.fieldId, span });
        for (const token of tokens) {
          if (entry.normalized.includes(token)) tokenSources[token].add(entry.fieldId);
        }
      }

      for (const token of tokens) {
        const hasHighSignal = [...(tokenSources[token] || [])].some(
          (fieldId) => highSignal.has(fieldId) || fieldId === "display_summary_ko"
        );
        if (!hasHighSignal) highSignalCoverage = false;
      }

      const exactConcept = (result.exactConceptCount || 0) > 0 || (result.exactPhraseCount || 0) > 0;
      const exactPhrase = exactSources.length > 0;
      const orderedProximity = proximitySources.length > 0;
      const allTokenCoverage = tokens.every((token) => (tokenSources[token]?.size || 0) > 0);
      const independentAxes = Number(result.matchedIndependentAxisCount || 0);
      const scoreRatio = topScore > 0 ? Number(result.rawScore || 0) / topScore : 0;
      const conflictTokens = override.conflictTokens || [];
      const combined = values.map((entry) => entry.normalized).join(" ");
      const conflictOnly =
        conflictTokens.some((token) => combined.includes(normalizeText(token))) &&
        !exactConcept &&
        !exactPhrase &&
        !orderedProximity;

      const C1 = exactConcept;
      const C2 = exactPhrase;
      const C3 = orderedProximity;
      const C4 = allTokenCoverage;
      const C5 = highSignalCoverage;
      const C6 = independentAxes >= Number(override.minimumFallbackIndependentAxes ?? config.minimumFallbackIndependentAxes ?? 2);
      const C7 = conflictOnly;
      const C8 = C1 || C2 || C3;
      const C10 = C4 && C5 && C6 && !C7 && scoreRatio >= Number(override.fallbackScoreRatioToTop ?? config.fallbackScoreRatioToTop ?? 0.42);

      return {
        C1, C2, C3, C4, C5, C6, C7, C8, C10,
        exactSources: [...new Set(exactSources)],
        proximitySources,
        tokenSourceCounts: Object.fromEntries(tokens.map((token) => [token, tokenSources[token]?.size || 0])),
        scoreRatio: Number(scoreRatio.toFixed(6)),
        strongPass: C8,
        fallbackPass: C10,
      };
    }

    _applyDirectP1R2(results, interpreted, options) {
      const config = this.directP1R2 || {};
      const head = interpreted.tokens?.[interpreted.tokens.length - 1] || "";
      const ambiguousHeads = new Set(config.ambiguousHeadTokens || []);
      const minimumResultCount = Number(config.minimumUnfilteredResultsToTrigger ?? 80);
      const applicable =
        Boolean(options.directP1R2) &&
        interpreted.tokens?.length >= 2 &&
        ambiguousHeads.has(head) &&
        results.length >= minimumResultCount;
      if (!applicable) {
        return {
          results,
          diagnostics: {
            applied: false,
            policyId: config.policyId || "DIRECT_SEARCH_P1R2_CONTEXT_GATE_V1",
            reason: !options.directP1R2
              ? "DISABLED"
              : results.length < minimumResultCount
                ? "RESULT_COUNT_BELOW_TRIGGER"
                : "QUERY_NOT_AMBIGUOUS_MULTI_TOKEN",
            beforeCount: results.length,
            afterCount: results.length,
            removedCount: 0,
          },
        };
      }

      const override = config.queryOverrides?.[interpreted.normalized] || {};
      const topScore = Number(results[0]?.rawScore || 0);
      const evaluated = results.map((result) => ({
        result,
        evidence: this._directP1R2Evidence(result, interpreted, topScore),
      }));
      const strong = evaluated.filter((entry) => entry.evidence.strongPass);
      const fallbackPool = evaluated
        .filter((entry) => !entry.evidence.strongPass && entry.evidence.fallbackPass)
        .sort((a, b) => b.result.rawScore - a.result.rawScore);
      const minimumStrong = Number(
        override.minimumStrongResultsBeforeFallback ??
          config.minimumStrongResultsBeforeFallback ??
          8
      );
      const maximumResults = Number(override.maximumResults ?? config.maximumResults ?? 60);
      const fallbackNeeded = Math.max(0, minimumStrong - strong.length);
      const selectedFallback = fallbackPool.slice(0, fallbackNeeded);
      const keepIds = new Set(
        [...strong, ...selectedFallback].map((entry) => entry.result.documentId)
      );
      const kept = evaluated
        .filter((entry) => keepIds.has(entry.result.documentId))
        .slice(0, maximumResults)
        .map((entry) => ({
          ...entry.result,
          directP1R2Evidence: entry.evidence,
        }));
      return {
        results: kept,
        diagnostics: {
          applied: true,
          policyId: config.policyId || "DIRECT_SEARCH_P1R2_CONTEXT_GATE_V1",
          status: config.status || "PROTOTYPE_HUMAN_REVIEW_REQUIRED",
          trigger: "AMBIGUOUS_MULTI_TOKEN_HEAD",
          ambiguousHead: head,
          queryTokens: interpreted.tokens.slice(),
          beforeCount: results.length,
          afterCount: kept.length,
          removedCount: results.length - kept.length,
          strongPassCount: strong.length,
          fallbackPassCount: selectedFallback.length,
          maximumResults,
          formula: "KEEP = C8 OR bounded C10 fallback; C8 = C1∪C2∪C3; C10 = C4∩C5∩C6∩¬C7",
        },
      };
    }

    _searchPass(query, options, mode) {
      const interpreted = interpretQuery(query, this.runtime, mode);
      const eligibility = this.eligibility(options);
      if (eligibility.status === "INVALID_FILTER") {
        return {
          status: "INVALID_FILTER",
          interpreted,
          results: [],
          sections: { Direct: [], Partial: [], Adjacent: [] },
          recovery: null,
          candidateCount: 0,
          eligibleCount: 0,
        };
      }

      const lexical = this._scoreLexical(interpreted);
      const state = {
        ...lexical,
        exactConcepts: new Map(),
        exactPhrases: new Map(),
        abbreviations: new Map(),
        evidenceKeys: new Map(),
        directSmall: new Set(),
        directBig: new Set(),
      };
      this._addConceptEvidence(state, interpreted, mode);
      this._addTaxonomyEvidence(state, options);

      const browsing =
        !interpreted.normalized && !options.smallFieldId && !options.bigFieldId;
      const candidateSet = new Set(state.scoreByDocument.keys());
      if (browsing) {
        if (eligibility.eligible) unionInto(candidateSet, eligibility.eligible);
      }
      let candidates = [...candidateSet];
      if (eligibility.eligible) {
        candidates = candidates.filter((documentId) => eligibility.eligible.has(documentId));
      }

      const unfilteredResults = candidates
        .map((documentId) => this._result(documentId, state, options, null, browsing))
        .filter((result) => result.tier)
        .sort(
          (left, right) =>
            right.rawScore - left.rawScore ||
            right.exactConceptCount - left.exactConceptCount ||
            right.exactPhraseCount - left.exactPhraseCount ||
            right.matchedIndependentAxisCount - left.matchedIndependentAxisCount ||
            left.professorId.localeCompare(right.professorId)
        );
      const filtered = this._applyDirectP1R2(unfilteredResults, interpreted, options);
      const results = filtered.results;
      const sections = { Direct: [], Partial: [], Adjacent: [] };
      for (const result of results) sections[result.tier].push(result);
      return {
        status: "OK",
        interpreted,
        results,
        sections,
        recovery: null,
        candidateCount: candidates.length,
        unfilteredResultCount: unfilteredResults.length,
        directP1R2: filtered.diagnostics,
        eligibleCount: eligibility.eligible?.size ?? this.documents.length,
      };
    }

    search(query, options) {
      const safeOptions = {
        universities: [...new Set(options?.universities || [])],
        departments: [...new Set(options?.departments || [])],
        smallFieldId: options?.smallFieldId || "",
        bigFieldId: options?.bigFieldId || "",
        directP1R2: Boolean(options?.directP1R2),
      };
      const normalized = normalizeText(query);
      const nameMatches = normalized ? this.nameLookup[normalized] || [] : [];
      if (nameMatches.length) {
        const eligibility = this.eligibility(safeOptions);
        if (eligibility.status === "INVALID_FILTER") {
          return {
            status: "INVALID_FILTER",
            nameNavigation: false,
            results: [],
            sections: { Direct: [], Partial: [], Adjacent: [] },
            recovery: null,
            candidateCount: 0,
          };
        }
        const documents = nameMatches.filter(
          (documentId) => !eligibility.eligible || eligibility.eligible.has(documentId)
        );
        const results = documents
          .map((documentId) => ({
            documentId,
            professorId: this.documentDictionary[documentId],
            display: this.displayRecords[documentId],
            tier: "Direct",
            rawScore: 0,
            exactConceptIds: [],
            exactConceptCount: 0,
            exactPhrases: [],
            exactPhraseCount: 0,
            matchedIndependentAxes: [],
            matchedIndependentAxisCount: 0,
            matchedEvidence: {},
            matchedSmallFieldId: "",
            reason: "교수명 정확 일치 — 연구 관련성 순위가 아닌 공식 기록 탐색",
            recovery: null,
          }))
          .sort((left, right) => left.professorId.localeCompare(right.professorId));
        return {
          status: "EXACT_NAME_NAVIGATION_NOT_RELEVANCE_RANKED",
          nameNavigation: true,
          results,
          sections: { Direct: results, Partial: [], Adjacent: [] },
          recovery: null,
          candidateCount: results.length,
        };
      }

      let result = this._searchPass(query, safeOptions, "ORIGINAL");
      if (result.status !== "OK") return result;
      const top = result.results[0];
      const exactEvidence =
        (top?.exactConceptCount || 0) + (top?.exactPhraseCount || 0) > 0;
      const weakThreshold = Number(
        this.recovery.trigger?.weakScoreThreshold ??
          this.tiers.minimumCandidateScore ??
          1.15
      );
      const shouldRecover =
        Boolean(normalized) &&
        (result.results.length === 0 ||
          (!exactEvidence && Number(top?.rawScore || 0) < weakThreshold));
      if (shouldRecover) {
        const collapsed = safeSpacingVariant(normalized);
        const spacingCandidates = this.runtime.safeSpacingLookup?.[collapsed] || [];
        if (spacingCandidates.length === 1 && spacingCandidates[0] !== normalized) {
          const recovered = this._searchPass(
            spacingCandidates[0],
            safeOptions,
            "SAFE_SPACING_VARIANT"
          );
          if (recovered.results.length) {
            recovered.recovery = {
              type: "SAFE_SPACING_VARIANT",
              originalQuery: String(query || ""),
              appliedQuery: spacingCandidates[0],
              retainedFilters: safeOptions,
            };
            for (const item of recovered.results) item.recovery = recovered.recovery;
            result = recovered;
          }
        }
        if (result.results.length === 0) {
          const aliasEntry = this.runtime.exactPhraseLookup?.[normalized];
          if (
            aliasEntry &&
            !aliasEntry.ambiguous &&
            aliasEntry.termType === "alias" &&
            (aliasEntry.ids || []).length === 1
          ) {
            const recovered = this._searchPass(query, safeOptions, "OFFICIAL_EXACT_ALIAS");
            if (recovered.results.length) {
              recovered.recovery = {
                type: "OFFICIAL_EXACT_ALIAS",
                originalQuery: String(query || ""),
                appliedQuery: normalized,
                retainedFilters: safeOptions,
              };
              for (const item of recovered.results) item.recovery = recovered.recovery;
              result = recovered;
            }
          }
        }
      }
      this.lastDiagnostics = {
        query: String(query || ""),
        normalized,
        candidateCount: result.candidateCount,
        resultCount: result.results.length,
        recovery: result.recovery?.type || "NONE",
        directP1R2: result.directP1R2 || null,
      };
      return result;
    }
  }

  return Object.freeze({
    FORMULA_ID: "BM25F_PLUS_WEIGHTED_FIELD_SUM_V1",
    Engine,
    normalizeText,
    safeSpacingVariant,
    tokenize,
    globalIdf,
    bm25PlusTerm,
    interpretQuery,
    phraseMatches,
    postingDocuments,
    intersectSets,
    toSet,
  });
});
