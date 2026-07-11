const DATA = window.POSTECH_LAB_MATCH_DATA;
    const professors = DATA.professors || DATA.labs;
    const POSTECH_INTERNAL_DB = window.POSTECH_INTERNAL_RECOMMENDATION_DB_DATA || {};
    const INITIAL_RESULT_COUNT = 5;
    const LOAD_MORE_RESULT_COUNT = 10;
    const RECOMMEND_RESULT_LIMIT = 120;

    attachInternalRecommendationProfiles(professors, POSTECH_INTERNAL_DB);

    const state = {
      selectedTag: "",
      unit: "all",
      keyword: "",
      lastResults: [],
      lastQuery: "",
      visibleResultCount: INITIAL_RESULT_COUNT,
      algorithmQueryOverride: "",
      queryModeOverride: "",
      showAdjacentResults: false,
    };


    function compactInternalText(value) {
      return normalize(String(value || "").replace(/[\s\-_/·,.;:()\[\]{}]+/g, ""));
    }

    function internalDepartmentMatches(profile, professor) {
      const profileDept = normalize(profile.department || "");
      const profileDeptCompact = compactInternalText(profile.department || "");
      const unitLabels = (professor.unitLabels || []).map((label) => normalize(label));
      const unitCompacts = (professor.unitLabels || []).map((label) => compactInternalText(label));
      if (!profileDept && !profileDeptCompact) return true;
      if (unitLabels.some((unit) => unit && (profileDept.includes(unit) || unit.includes(profileDept)))) return true;
      if (unitCompacts.some((unit) => unit && (profileDeptCompact.includes(unit) || unit.includes(profileDeptCompact)))) return true;
      return false;
    }

    function attachInternalRecommendationProfiles(professorList, internalDb) {
      const internalRecords = (internalDb && internalDb.professors) || [];
      const byName = new Map();
      internalRecords.forEach((profile) => {
        const name = normalize(profile.professor || "");
        if (!name) return;
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push(profile);
      });

      professorList.forEach((professor) => {
        const name = normalize(professor.professor || "");
        const candidates = byName.get(name) || [];
        let matched = candidates.filter((profile) => internalDepartmentMatches(profile, professor));
        if (!matched.length && candidates.length === 1) matched = candidates;
        if (!matched.length) return;
        professor._internalRecommendationProfiles = matched;
        const internalKeywords = [];
        matched.forEach((profile) => {
          [
            "primary_domains", "secondary_domains", "subfields", "methods", "materials_or_targets", "applications",
            "positive_queries", "weak_queries", "aliases_ko", "aliases_en"
          ].forEach((key) => {
            (profile[key] || []).forEach((value) => {
              const text = String(value || "").trim();
              if (text && !internalKeywords.includes(text)) internalKeywords.push(text);
            });
          });
        });
        professor._internalSearchText = internalKeywords.join(" ");
        // 화면 표시용 필드는 바꾸지 않고, 기존 검색 인덱스에만 내부 추천 키워드를 보강한다.
        professor.searchText = [professor.searchText || "", professor._internalSearchText].join(" ").trim();
        professor.keywords = Array.from(new Set([...(professor.keywords || []), ...internalKeywords.slice(0, 80)]));
      });
    }

    function internalTerms(profile, keys) {
      const out = [];
      keys.forEach((key) => {
        const values = profile[key] || [];
        if (Array.isArray(values)) values.forEach((value) => {
          const text = String(value || "").trim();
          if (text && !out.includes(text)) out.push(text);
        });
      });
      return out;
    }

    function internalHitTerms(fullQuery, terms, maxTerms = 8) {
      const q = normalize(fullQuery);
      const qCompact = compactInternalText(fullQuery);
      const hits = [];
      (terms || []).forEach((term) => {
        const raw = String(term || "").trim();
        if (!raw) return;
        const t = normalize(raw);
        const tc = compactInternalText(raw);
        if (!t || t.length < 2) return;
        const exact = q.includes(t) || (t.length >= 4 && t.includes(q));
        const compactExact = tc && tc.length >= 4 && qCompact && (qCompact.includes(tc) || (tc.length >= 4 && tc.includes(qCompact)));
        if ((exact || compactExact) && !hits.includes(raw)) hits.push(raw);
      });
      return hits.slice(0, maxTerms);
    }

    function internalRecommendationScore(professor, fullQuery) {
      const profiles = professor._internalRecommendationProfiles || [];
      if (!profiles.length) return { score: 0, evidence: [], reasons: [], positiveHitCount: 0 };
      let score = 0;
      const evidence = [];
      const reasons = [];
      let positiveHitCount = 0;
      profiles.forEach((profile) => {
        const positive = internalHitTerms(fullQuery, internalTerms(profile, ["positive_queries"]), 10);
        const aliases = internalHitTerms(fullQuery, internalTerms(profile, ["aliases_ko", "aliases_en"]), 8);
        const detailed = internalHitTerms(fullQuery, internalTerms(profile, ["subfields", "methods", "materials_or_targets", "applications"]), 10);
        const domains = internalHitTerms(fullQuery, internalTerms(profile, ["primary_domains", "secondary_domains"]), 8);
        const weak = internalHitTerms(fullQuery, internalTerms(profile, ["weak_queries"]), 8);
        const negative = internalHitTerms(fullQuery, internalTerms(profile, ["negative_queries"]), 8);
        const strongHits = positive.length + aliases.length + detailed.length;
        positiveHitCount += positive.length;
        if (positive.length) score += 170 + Math.min(positive.length, 4) * 92;
        if (aliases.length) score += Math.min(aliases.length, 4) * 54;
        if (detailed.length) score += Math.min(detailed.length, 5) * 42;
        if (domains.length) score += Math.min(domains.length, 3) * 24;
        // 넓은 단어는 약한 보조 점수만 준다. weak query만 맞은 경우에는 상위 노출을 만들지 않는다.
        if (weak.length) score += Math.min(weak.length, 4) * (strongHits ? 18 : 8);
        if (negative.length && !strongHits) score -= 1250 + Math.min(negative.length, 4) * 120;
        else if (negative.length) score -= Math.min(negative.length, 4) * 75;
        [...positive, ...aliases, ...detailed].forEach((term) => {
          if (!evidence.includes(term)) evidence.push(term);
        });
        if (positive.length) reasons.push("내부 추천 DB의 세부 positive query와 직접 연결됩니다");
        else if (detailed.length) reasons.push("내부 추천 DB의 세부 분야와 직접 연결됩니다");
      });
      return {
        score,
        evidence: evidence.slice(0, 5),
        reasons: Array.from(new Set(reasons)).slice(0, 2),
        positiveHitCount
      };
    }

    function meaningfulQueryTokensForTightening(query) {
      const stop = new Set(["연구", "교수", "교수님", "추천", "랩실", "관련", "분야", "소개", "하고", "싶어", "주세요", "기반", "공학", "postech", "포스텍"]);
      return tokenize(query).filter((token) => token.length >= 2 && tokenWeight(token) > 0 && !stop.has(token));
    }

    function hasStrongInternalEvidence(item) {
      const generic = new Set(["ald", "ale", "led", "ai", "ml", "2d", "3d", "sem", "tem", "stm", "xrd", "afm", "rf"]);
      const evidence = item.internalMatchedEvidence || [];
      if (evidence.length >= 2) return true;
      return evidence.some((term) => {
        const t = normalize(term);
        if (!t || generic.has(t)) return false;
        if (/[가-힣]/.test(term) && t.length >= 2) return true;
        return t.length >= 4;
      });
    }

    function tightenResultsByInternalIntent(scored, query, minScore) {
      if (!scored.length) return scored;
      const tokens = meaningfulQueryTokensForTightening(query);
      const topScore = scored[0].score || 0;
      const internalOnly = scored
        .filter((item) => (item.internalMatchedEvidence || []).length && Number(item.internalScore || 0) > 0 && hasStrongInternalEvidence(item))
        .sort((a, b) => Number(b.internalScore || 0) - Number(a.internalScore || 0) || b.score - a.score);
      if (internalOnly.length && tokens.length >= 2) {
        const topInternalScore = Number(internalOnly[0].internalScore || 0);
        return internalOnly.filter((item) => Number(item.internalScore || 0) >= Math.max(80, topInternalScore * 0.25)).slice(0, 18);
      }
      const hasInternalEvidence = internalOnly.length > 0;
      const isSpecific = tokens.length >= 2 || hasInternalEvidence;
      if (!isSpecific) return scored;
      const strictFloor = hasInternalEvidence ? Math.max(minScore, topScore - 520, Math.round(topScore * 0.46)) : Math.max(minScore, Math.round(topScore * 0.42));
      const tightened = scored.filter((item) => item.score >= strictFloor);
      if (tightened.length) return tightened.slice(0, 18);
      return scored.slice(0, Math.min(scored.length, 8));
    }



    // POSTECH precise intent engine patch v1.0
    // UI/display DB는 그대로 두고, 사용자에게 보이지 않는 내부 추천 DB를 우선 사용하도록 보정한다.
    const POSTECH_PRECISE_INTENT_RULES = [
      {
            "id": "battery_solid_state",
            "label": "전고체전지/고체전해질",
            "strict": true,
            "minStrong": 1,
            "triggers": [
                  "전고체전지",
                  "전고체 배터리",
                  "solid-state battery",
                  "solid state battery",
                  "all-solid-state battery",
                  "all solid state battery"
            ],
            "strong": [
                  "전고체전지",
                  "전고체 배터리",
                  "solid-state battery",
                  "solid state battery",
                  "all-solid-state battery",
                  "all solid state battery",
                  "고체전해질",
                  "solid electrolyte",
                  "sulfide electrolyte",
                  "oxide electrolyte",
                  "lithium metal battery",
                  "리튬금속전지"
            ],
            "weak": [
                  "battery",
                  "batteries",
                  "배터리",
                  "전지",
                  "lithium",
                  "리튬",
                  "electrolyte",
                  "전해질",
                  "electrochemistry",
                  "전기화학"
            ],
            "negative": [
                  "fuel cell",
                  "연료전지",
                  "hydrogen",
                  "수소",
                  "photovoltaic",
                  "태양전지"
            ]
      },
      {
            "id": "battery_electrolyte",
            "label": "전해질/전해액",
            "strict": true,
            "minStrong": 1,
            "triggers": [
                  "전해질",
                  "전해액",
                  "고체전해질",
                  "solid electrolyte",
                  "electrolyte",
                  "liquid electrolyte",
                  "polymer electrolyte"
            ],
            "strong": [
                  "전해질",
                  "전해액",
                  "고체전해질",
                  "electrolyte",
                  "electrolytes",
                  "solid electrolyte",
                  "liquid electrolyte",
                  "polymer electrolyte",
                  "ion transport",
                  "ionic conductivity",
                  "이온전도",
                  "이온수송"
            ],
            "weak": [
                  "battery",
                  "batteries",
                  "전지",
                  "배터리",
                  "lithium",
                  "리튬",
                  "electrochemistry",
                  "전기화학"
            ],
            "negative": [
                  "cathode",
                  "양극재",
                  "anode",
                  "음극재",
                  "photovoltaic",
                  "태양전지",
                  "fuel cell",
                  "연료전지",
                  "hydrogen",
                  "수소"
            ]
      },
      {
            "id": "battery_cathode",
            "label": "양극재",
            "strict": true,
            "minStrong": 1,
            "triggers": [
                  "양극재",
                  "양극",
                  "cathode",
                  "cathode material",
                  "positive electrode"
            ],
            "strong": [
                  "양극재",
                  "양극",
                  "cathode",
                  "cathode material",
                  "positive electrode",
                  "layered oxide",
                  "lithium transition metal oxide",
                  "NCM",
                  "LFP",
                  "high-nickel"
            ],
            "weak": [
                  "battery",
                  "batteries",
                  "전지",
                  "배터리",
                  "lithium",
                  "리튬",
                  "electrode",
                  "전극"
            ],
            "negative": [
                  "electrolyte",
                  "전해질",
                  "전해액",
                  "anode",
                  "음극재",
                  "hydrogen",
                  "수소",
                  "fuel cell",
                  "연료전지"
            ]
      },
      {
            "id": "battery_anode",
            "label": "음극재",
            "strict": true,
            "minStrong": 1,
            "triggers": [
                  "음극재",
                  "음극",
                  "anode",
                  "anode material",
                  "negative electrode",
                  "silicon anode",
                  "lithium metal anode"
            ],
            "strong": [
                  "음극재",
                  "음극",
                  "anode",
                  "anode material",
                  "negative electrode",
                  "silicon anode",
                  "lithium metal",
                  "lithium metal anode",
                  "graphite anode",
                  "Li metal"
            ],
            "weak": [
                  "battery",
                  "batteries",
                  "전지",
                  "배터리",
                  "lithium",
                  "리튬",
                  "electrode",
                  "전극"
            ],
            "negative": [
                  "cathode",
                  "양극재",
                  "electrolyte",
                  "전해질",
                  "hydrogen",
                  "수소",
                  "fuel cell",
                  "연료전지"
            ]
      },
      {
            "id": "battery_separator",
            "label": "배터리 분리막",
            "strict": true,
            "minStrong": 1,
            "triggers": [
                  "분리막",
                  "배터리 분리막",
                  "separator",
                  "battery separator"
            ],
            "strong": [
                  "분리막",
                  "배터리 분리막",
                  "separator",
                  "battery separator",
                  "porous separator",
                  "polyolefin separator",
                  "membrane separator"
            ],
            "weak": [
                  "battery",
                  "전지",
                  "배터리",
                  "membrane",
                  "polymer",
                  "고분자"
            ],
            "negative": [
                  "water treatment",
                  "수처리",
                  "wastewater",
                  "폐수",
                  "fuel cell membrane",
                  "연료전지 막",
                  "separation membrane",
                  "막분리"
            ]
      },
      {
            "id": "battery_interface",
            "label": "배터리 계면",
            "strict": true,
            "minStrong": 1,
            "triggers": [
                  "배터리 계면",
                  "전극 계면",
                  "interface",
                  "interphase",
                  "SEI",
                  "CEI"
            ],
            "strong": [
                  "배터리 계면",
                  "전극 계면",
                  "interface",
                  "interphase",
                  "solid electrolyte interphase",
                  "SEI",
                  "CEI",
                  "electrode-electrolyte interface",
                  "surface chemistry"
            ],
            "weak": [
                  "battery",
                  "전지",
                  "배터리",
                  "electrochemistry",
                  "전기화학",
                  "surface",
                  "표면"
            ],
            "negative": [
                  "semiconductor interface",
                  "반도체 계면",
                  "biointerface",
                  "생체계면",
                  "user interface",
                  "인터페이스"
            ]
      },
      {
            "id": "organic_chemistry",
            "label": "유기화학/유기합성",
            "strict": true,
            "minStrong": 1,
            "triggers": [
                  "유기화학",
                  "유기 합성",
                  "유기합성",
                  "분자합성",
                  "organic chemistry",
                  "organic synthesis",
                  "synthetic organic",
                  "molecular synthesis"
            ],
            "strong": [
                  "유기화학",
                  "유기합성",
                  "분자합성",
                  "organic chemistry",
                  "organic synthesis",
                  "synthetic organic",
                  "molecular synthesis",
                  "asymmetric synthesis",
                  "비대칭 합성",
                  "organocatalysis",
                  "유기촉매",
                  "transition-metal-catalyzed",
                  "photoredox",
                  "electrosynthesis"
            ],
            "weak": [
                  "chemistry",
                  "chemical synthesis",
                  "catalysis",
                  "catalyst",
                  "organic material",
                  "유기소재",
                  "합성"
            ],
            "negative": [
                  "electrochemistry",
                  "전기화학",
                  "electrocatalyst",
                  "전기촉매",
                  "battery",
                  "배터리",
                  "전지",
                  "perovskite",
                  "quantum dot",
                  "양자점",
                  "photovoltaic",
                  "태양전지",
                  "fuel cell",
                  "연료전지",
                  "protein",
                  "단백질",
                  "biochemistry",
                  "생화학",
                  "inorganic",
                  "무기화학"
            ]
      },
      {
            "id": "photovoltaics",
            "label": "태양전지/광전변환",
            "strict": true,
            "minStrong": 1,
            "triggers": [
                  "태양전지",
                  "solar cell",
                  "photovoltaic",
                  "photovoltaics",
                  "페로브스카이트 태양전지",
                  "perovskite solar"
            ],
            "strong": [
                  "태양전지",
                  "solar cell",
                  "solar cells",
                  "photovoltaic",
                  "photovoltaics",
                  "perovskite solar",
                  "organic solar cell",
                  "thin-film solar",
                  "photoelectrochemical",
                  "solar energy conversion",
                  "solar energy"
            ],
            "weak": [
                  "energy",
                  "에너지",
                  "semiconductor",
                  "반도체",
                  "optoelectronic",
                  "광전소자",
                  "photochemistry",
                  "광화학"
            ],
            "negative": [
                  "fuel cell",
                  "연료전지",
                  "hydrogen",
                  "수소",
                  "battery",
                  "배터리",
                  "electrolyte",
                  "전해질",
                  "display",
                  "디스플레이"
            ]
      },
      {
            "id": "semiconductor_device_process_general",
            "label": "반도체 소자/공정",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "반도체 소자 공정",
                  "반도체 소자",
                  "반도체 공정",
                  "반도체",
                  "semiconductor process",
                  "semiconductor device",
                  "transistor",
                  "MOSFET",
                  "ALD",
                  "식각",
                  "증착",
                  "lithography"
            ],
            "strong": [
                  "semiconductor device",
                  "semiconductor process",
                  "semiconductor",
                  "transistor",
                  "MOSFET",
                  "FET",
                  "ALD",
                  "CVD",
                  "etch",
                  "etching",
                  "deposition",
                  "lithography",
                  "박막",
                  "thin film",
                  "oxide semiconductor",
                  "DRAM",
                  "memory device",
                  "반도체 소자",
                  "반도체 공정",
                  "식각",
                  "증착",
                  "나노전자",
                  "전자소자",
                  "반도체 검사",
                  "반도체 계측"
            ],
            "weak": [
                  "device",
                  "소자",
                  "process",
                  "공정",
                  "nanofabrication",
                  "fabrication",
                  "electronics",
                  "재료",
                  "소재"
            ],
            "negative": [
                  "battery",
                  "배터리",
                  "bio device",
                  "바이오소자",
                  "medical device",
                  "의료기기",
                  "organic synthesis",
                  "유기합성"
            ]
      },
      {
            "id": "battery_general",
            "label": "배터리 전체",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "배터리",
                  "battery",
                  "batteries",
                  "이차전지",
                  "리튬이온전지",
                  "lithium-ion battery",
                  "lithium ion battery",
                  "rechargeable battery"
            ],
            "strong": [
                  "배터리",
                  "battery",
                  "batteries",
                  "battery materials",
                  "rechargeable battery",
                  "lithium-ion battery",
                  "lithium ion battery",
                  "Li-ion",
                  "LIB",
                  "이차전지",
                  "리튬이온전지",
                  "리튬 이온 전지",
                  "양극재",
                  "cathode",
                  "cathode material",
                  "음극재",
                  "anode",
                  "anode material",
                  "전해질",
                  "electrolyte",
                  "고체전해질",
                  "solid electrolyte",
                  "전고체전지",
                  "solid-state battery",
                  "리튬금속전지",
                  "lithium metal battery",
                  "battery interface",
                  "배터리 계면",
                  "electrode",
                  "전극",
                  "energy storage",
                  "에너지 저장",
                  "electrochemistry",
                  "전기화학",
                  "battery analysis",
                  "배터리 분석",
                  "battery recycling",
                  "배터리 재활용"
            ],
            "weak": [
                  "energy",
                  "에너지",
                  "materials",
                  "소재",
                  "chemistry",
                  "화학",
                  "nanomaterials",
                  "나노소재",
                  "catalysis",
                  "촉매"
            ],
            "negative": [
                  "fuel cell",
                  "연료전지",
                  "hydrogen",
                  "수소",
                  "photovoltaic",
                  "태양전지",
                  "solar cell",
                  "수전해",
                  "water splitting",
                  "bioelectronics",
                  "바이오센서",
                  "semiconductor process",
                  "반도체 공정"
            ]
      },
      {
            "id": "display_general",
            "label": "디스플레이",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "디스플레이",
                  "OLED",
                  "Micro LED",
                  "마이크로 LED",
                  "발광소자",
                  "display"
            ],
            "strong": [
                  "디스플레이",
                  "display",
                  "OLED",
                  "organic light emitting",
                  "organic light-emitting",
                  "QLED",
                  "quantum dot LED",
                  "quantum dot light emitting",
                  "Micro LED",
                  "마이크로 LED",
                  "LED",
                  "발광소자",
                  "light emitting diode",
                  "flexible display",
                  "stretchable display",
                  "페로브스카이트 LED",
                  "perovskite LED",
                  "유기발광",
                  "meta-display",
                  "metasurface display"
            ],
            "weak": [
                  "optoelectronic",
                  "광전소자",
                  "photonics",
                  "광학",
                  "organic electronics",
                  "유기전자",
                  "flexible electronics",
                  "플렉서블"
            ],
            "negative": [
                  "battery",
                  "배터리",
                  "solar cell",
                  "태양전지",
                  "medical imaging",
                  "의료영상"
            ]
      },
      {
            "id": "photonics_optoelectronics_general",
            "label": "포토닉스/광전소자",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "포토닉스 광전소자",
                  "포토닉스",
                  "광전소자",
                  "광소자",
                  "나노광학",
                  "레이저",
                  "광검출기",
                  "photonics",
                  "optoelectronic"
            ],
            "strong": [
                  "포토닉스",
                  "photonics",
                  "광전소자",
                  "optoelectronic",
                  "optoelectronics",
                  "광소자",
                  "나노광학",
                  "nanophotonics",
                  "plasmonics",
                  "metasurface",
                  "metamaterial",
                  "optics",
                  "optical",
                  "laser",
                  "레이저",
                  "photodetector",
                  "광검출기",
                  "광센서",
                  "광학",
                  "양자광학",
                  "quantum optics"
            ],
            "weak": [
                  "semiconductor",
                  "반도체",
                  "display",
                  "디스플레이",
                  "2D materials",
                  "소재",
                  "나노소재"
            ],
            "negative": [
                  "battery",
                  "배터리",
                  "fuel cell",
                  "연료전지",
                  "NLP",
                  "자연어처리"
            ]
      },
      {
            "id": "ai_ml_general",
            "label": "AI/머신러닝",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "AI 머신러닝",
                  "AI",
                  "인공지능",
                  "머신러닝",
                  "딥러닝",
                  "machine learning",
                  "deep learning"
            ],
            "strong": [
                  "AI",
                  "인공지능",
                  "artificial intelligence",
                  "machine learning",
                  "머신러닝",
                  "deep learning",
                  "딥러닝",
                  "reinforcement learning",
                  "강화학습",
                  "generative AI",
                  "생성형 AI",
                  "representation learning",
                  "optimization for AI",
                  "neural network",
                  "neural networks",
                  "data science",
                  "statistical learning"
            ],
            "weak": [
                  "algorithm",
                  "알고리즘",
                  "data",
                  "데이터",
                  "modeling",
                  "모델링",
                  "vision",
                  "영상",
                  "NLP",
                  "language model"
            ],
            "negative": [
                  "AI semiconductor",
                  "AI 반도체",
                  "VLSI",
                  "hardware accelerator",
                  "medical imaging only"
            ]
      },
      {
            "id": "computer_vision_general",
            "label": "컴퓨터비전/영상인식",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "컴퓨터비전 영상인식",
                  "컴퓨터 비전",
                  "컴퓨터비전",
                  "영상인식",
                  "computer vision",
                  "image recognition",
                  "object detection"
            ],
            "strong": [
                  "컴퓨터비전",
                  "컴퓨터 비전",
                  "computer vision",
                  "image recognition",
                  "영상인식",
                  "object detection",
                  "객체검출",
                  "image understanding",
                  "visual recognition",
                  "visual intelligence",
                  "multi-modal",
                  "multimodal",
                  "멀티모달",
                  "image processing",
                  "영상처리",
                  "vision-language"
            ],
            "weak": [
                  "AI",
                  "딥러닝",
                  "machine learning",
                  "deep learning",
                  "graphics",
                  "3D vision",
                  "medical imaging"
            ],
            "negative": [
                  "display",
                  "디스플레이",
                  "semiconductor inspection only",
                  "NLP",
                  "자연어처리"
            ]
      },
      {
            "id": "biosensor_bioelectronics_general",
            "label": "바이오센서/생체전자",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "바이오센서 생체전자",
                  "바이오센서",
                  "생체전자",
                  "생체전자소자",
                  "웨어러블 센서",
                  "임플란터블",
                  "biosensor",
                  "bioelectronics"
            ],
            "strong": [
                  "바이오센서",
                  "biosensor",
                  "biosensors",
                  "생체전자",
                  "생체전자소자",
                  "bioelectronics",
                  "bioelectronic",
                  "wearable sensor",
                  "웨어러블 센서",
                  "implantable device",
                  "임플란터블",
                  "electronic skin",
                  "e-skin",
                  "neural interface",
                  "biointerface",
                  "bio-signal",
                  "biosignal",
                  "healthcare sensor",
                  "nanobiosensor",
                  "biomedical sensor",
                  "bioMEMS",
                  "microfluidics"
            ],
            "weak": [
                  "sensor",
                  "센서",
                  "flexible electronics",
                  "플렉서블 전자",
                  "soft electronics",
                  "soft device",
                  "biomedical device",
                  "의료기기",
                  "healthcare",
                  "헬스케어",
                  "웨어러블",
                  "implantable",
                  "neural electrode",
                  "신경전극"
            ],
            "negative": [
                  "gas sensor only",
                  "환경센서",
                  "environmental sensor",
                  "LiDAR",
                  "라이다",
                  "solar cell",
                  "태양전지",
                  "battery",
                  "배터리"
            ]
      },
      {
            "id": "neuroscience_bci_general",
            "label": "뇌과학/BCI",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "뇌과학 BCI",
                  "뇌과학",
                  "BCI",
                  "brain computer interface",
                  "신경공학",
                  "뇌영상",
                  "neuroscience"
            ],
            "strong": [
                  "뇌과학",
                  "neuroscience",
                  "BCI",
                  "brain-computer interface",
                  "brain computer interface",
                  "neural engineering",
                  "신경공학",
                  "neural interface",
                  "신경전극",
                  "neural electrode",
                  "뇌영상",
                  "brain imaging",
                  "neuroimaging",
                  "brain signal",
                  "neural signal",
                  "cognitive neuroscience",
                  "computational neuroscience"
            ],
            "weak": [
                  "bioelectronics",
                  "생체전자",
                  "biomedical",
                  "의료",
                  "signal processing",
                  "신호처리",
                  "AI",
                  "machine learning"
            ],
            "negative": [
                  "wireless communication",
                  "통신",
                  "semiconductor process",
                  "battery"
            ]
      },
      {
            "id": "medical_imaging_digital_health_general",
            "label": "의료영상/디지털헬스",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "의료영상 디지털헬스",
                  "의료영상",
                  "의료 영상",
                  "medical imaging",
                  "mri",
                  "ct",
                  "초음파",
                  "ultrasound",
                  "디지털헬스",
                  "healthcare AI"
            ],
            "strong": [
                  "의료영상",
                  "의료 영상",
                  "medical imaging",
                  "medical image",
                  "MRI",
                  "magnetic resonance imaging",
                  "CT",
                  "computed tomography",
                  "ultrasound",
                  "초음파",
                  "photoacoustic",
                  "광음향",
                  "image reconstruction",
                  "diffusion MRI",
                  "biomedical imaging",
                  "healthcare AI",
                  "medical AI",
                  "digital health",
                  "디지털헬스",
                  "헬스케어 AI",
                  "biomedical image"
            ],
            "weak": [
                  "deep learning",
                  "딥러닝",
                  "machine learning",
                  "머신러닝",
                  "AI",
                  "영상처리",
                  "image processing",
                  "healthcare",
                  "헬스케어",
                  "biomedical"
            ],
            "negative": [
                  "computer vision general",
                  "일반 컴퓨터비전",
                  "display imaging",
                  "디스플레이",
                  "electron microscopy",
                  "TEM",
                  "SEM",
                  "telescope",
                  "천문"
            ]
      },
      {
            "id": "robotics_autonomous_control_general",
            "label": "로봇/자율주행",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "로봇 자율주행 제어",
                  "로봇",
                  "로봇 제어",
                  "로봇제어",
                  "robot control",
                  "robotics",
                  "mobile robot",
                  "legged robot",
                  "SLAM",
                  "자율주행",
                  "드론"
            ],
            "strong": [
                  "로봇",
                  "robot",
                  "robotics",
                  "로봇 제어",
                  "로봇제어",
                  "robot control",
                  "robotics control",
                  "mobile robot",
                  "legged robot",
                  "quadruped",
                  "humanoid",
                  "robotic manipulation",
                  "SLAM",
                  "autonomous robot",
                  "field robotics",
                  "soft robotics",
                  "UAV",
                  "AUV",
                  "자율주행",
                  "드론",
                  "모빌리티",
                  "robot learning"
            ],
            "weak": [
                  "control",
                  "제어",
                  "optimization",
                  "최적화",
                  "dynamics",
                  "동역학",
                  "reinforcement learning",
                  "강화학습",
                  "navigation",
                  "planning"
            ],
            "negative": [
                  "process control",
                  "공정제어",
                  "power control",
                  "전력 제어",
                  "traffic control",
                  "교통",
                  "chemical process"
            ]
      },
      {
            "id": "hci_ar_vr_general",
            "label": "HCI/AR/VR",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "HCI AR VR",
                  "HCI",
                  "AR",
                  "VR",
                  "UX",
                  "인터랙션",
                  "사용자 경험",
                  "human computer interaction"
            ],
            "strong": [
                  "HCI",
                  "human-computer interaction",
                  "human computer interaction",
                  "AR",
                  "augmented reality",
                  "VR",
                  "virtual reality",
                  "XR",
                  "mixed reality",
                  "UX",
                  "user experience",
                  "인터랙션",
                  "interaction",
                  "interactive system",
                  "wearable interaction",
                  "ubiquitous computing",
                  "UI",
                  "user interface"
            ],
            "weak": [
                  "computer graphics",
                  "graphics",
                  "visualization",
                  "mobile computing",
                  "mobile",
                  "sensor",
                  "AI"
            ],
            "negative": [
                  "battery interface",
                  "semiconductor interface",
                  "biointerface",
                  "neural interface"
            ]
      },
      {
            "id": "quantum_computing_information_general",
            "label": "양자컴퓨팅/양자정보",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "양자컴퓨팅 양자정보",
                  "양자",
                  "양자컴퓨팅",
                  "양자정보",
                  "양자소자",
                  "quantum",
                  "quantum computing",
                  "quantum information"
            ],
            "strong": [
                  "양자",
                  "양자컴퓨팅",
                  "양자정보",
                  "양자소자",
                  "양자광학",
                  "quantum",
                  "quantum computing",
                  "quantum information",
                  "quantum optics",
                  "quantum communication",
                  "quantum simulation",
                  "quantum device",
                  "qubit",
                  "single photon",
                  "topological quantum",
                  "quantum algorithm",
                  "양자알고리즘"
            ],
            "weak": [
                  "physics",
                  "물리",
                  "photonics",
                  "광학",
                  "condensed matter",
                  "응집물리"
            ],
            "negative": [
                  "quantum dot led",
                  "QLED",
                  "양자점 디스플레이",
                  "battery",
                  "배터리",
                  "organic synthesis",
                  "유기합성"
            ]
      },
      {
            "id": "ai_semiconductor_vlsi_general",
            "label": "AI 반도체/VLSI",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "AI 반도체 VLSI",
                  "AI 반도체",
                  "VLSI",
                  "SoC",
                  "ASIC",
                  "FPGA",
                  "하드웨어 가속기",
                  "집적회로",
                  "회로설계"
            ],
            "strong": [
                  "AI 반도체",
                  "AI semiconductor",
                  "VLSI",
                  "SoC",
                  "ASIC",
                  "FPGA",
                  "하드웨어 가속기",
                  "hardware accelerator",
                  "집적회로",
                  "integrated circuit",
                  "회로설계",
                  "circuit design",
                  "computer architecture",
                  "neuromorphic hardware",
                  "AI hardware",
                  "반도체 회로",
                  "low-power circuit",
                  "memory architecture"
            ],
            "weak": [
                  "semiconductor",
                  "반도체",
                  "electronics",
                  "전자",
                  "AI",
                  "machine learning",
                  "hardware"
            ],
            "negative": [
                  "wet process",
                  "ALD",
                  "식각",
                  "battery",
                  "bioelectronics"
            ]
      },
      {
            "id": "semiconductor_packaging_heterogeneous_integration_general",
            "label": "반도체 패키징/이종집적",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "반도체 패키징 이종집적",
                  "반도체 패키징",
                  "패키징",
                  "chiplet",
                  "칩렛",
                  "3d ic",
                  "2.5d",
                  "이종집적",
                  "interconnect",
                  "인터커넥트",
                  "advanced packaging",
                  "hybrid bonding",
                  "tsv"
            ],
            "strong": [
                  "반도체 패키징",
                  "첨단패키징",
                  "전자패키징",
                  "semiconductor packaging",
                  "advanced packaging",
                  "chiplet",
                  "칩렛",
                  "3D IC",
                  "2.5D",
                  "heterogeneous integration",
                  "이종집적",
                  "interconnect",
                  "인터커넥트",
                  "hybrid bonding",
                  "TSV",
                  "through silicon via",
                  "BEOL",
                  "die-to-die",
                  "system in package"
            ],
            "weak": [
                  "패키징",
                  "후공정",
                  "공정",
                  "배선",
                  "bonding",
                  "reliability",
                  "semiconductor"
            ],
            "negative": [
                  "organic electronics",
                  "유기반도체",
                  "display",
                  "디스플레이",
                  "battery",
                  "배터리",
                  "protein",
                  "단백질"
            ]
      },
      {
            "id": "hydrogen_fuelcell_general",
            "label": "수소/연료전지/수전해",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "수소 연료전지",
                  "수소",
                  "연료전지",
                  "수전해",
                  "그린수소",
                  "hydrogen",
                  "fuel cell",
                  "water electrolysis",
                  "electrolysis"
            ],
            "strong": [
                  "수소",
                  "연료전지",
                  "수전해",
                  "그린수소",
                  "hydrogen",
                  "fuel cell",
                  "water electrolysis",
                  "electrolysis",
                  "water splitting",
                  "hydrogen evolution",
                  "oxygen evolution",
                  "HER",
                  "OER",
                  "ORR",
                  "PEMFC",
                  "SOFC",
                  "CO2 reduction",
                  "electrocatalyst"
            ],
            "weak": [
                  "electrocatalyst",
                  "전기촉매",
                  "catalyst",
                  "촉매",
                  "energy",
                  "에너지",
                  "electrochemistry",
                  "전기화학"
            ],
            "negative": [
                  "battery",
                  "배터리",
                  "전고체전지",
                  "전해질",
                  "태양전지",
                  "photovoltaic",
                  "solar cell"
            ]
      },
      {
            "id": "materials_nano_general",
            "label": "나노소재/신소재",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "나노소재 신소재",
                  "나노소재",
                  "신소재",
                  "2D 소재",
                  "그래핀",
                  "nanomaterial",
                  "materials",
                  "graphene"
            ],
            "strong": [
                  "나노소재",
                  "신소재",
                  "nanomaterial",
                  "nanomaterials",
                  "advanced materials",
                  "2D materials",
                  "2D 소재",
                  "graphene",
                  "그래핀",
                  "surface",
                  "interface",
                  "thin film",
                  "박막",
                  "재료",
                  "소재",
                  "나노",
                  "nanostructure",
                  "low-dimensional materials",
                  "저차원 물질",
                  "TEM",
                  "SEM",
                  "XRD",
                  "AFM"
            ],
            "weak": [
                  "chemistry",
                  "화학",
                  "physics",
                  "물리",
                  "semiconductor",
                  "반도체",
                  "energy",
                  "에너지"
            ],
            "negative": [
                  "database",
                  "데이터베이스",
                  "NLP",
                  "natural language",
                  "운영체제"
            ]
      },
      {
            "id": "polymer_organic_materials_general",
            "label": "고분자/유기소재",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "고분자 유기소재",
                  "고분자",
                  "유기소재",
                  "소프트머터",
                  "polymer",
                  "organic material",
                  "soft matter"
            ],
            "strong": [
                  "고분자",
                  "polymer",
                  "polymers",
                  "유기소재",
                  "organic material",
                  "organic materials",
                  "organic electronics",
                  "유기전자",
                  "유기반도체",
                  "soft matter",
                  "소프트머터",
                  "hydrogel",
                  "biopolymer",
                  "smart polymer",
                  "self-assembly",
                  "자기조립",
                  "polymer chemistry",
                  "conjugated polymer",
                  "conducting polymer"
            ],
            "weak": [
                  "materials",
                  "소재",
                  "chemistry",
                  "화학",
                  "flexible electronics",
                  "display",
                  "bio materials"
            ],
            "negative": [
                  "inorganic only",
                  "무기재료",
                  "battery cathode",
                  "semiconductor process"
            ]
      },
      {
            "id": "catalysis_chemical_process_general",
            "label": "촉매/화학공정",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "촉매 화학공정",
                  "촉매",
                  "유기합성",
                  "반응공학",
                  "화학공정",
                  "catalyst",
                  "catalysis",
                  "chemical process",
                  "reaction engineering"
            ],
            "strong": [
                  "촉매",
                  "catalyst",
                  "catalysis",
                  "유기합성",
                  "organic synthesis",
                  "반응공학",
                  "reaction engineering",
                  "화학공정",
                  "chemical process",
                  "process systems",
                  "process optimization",
                  "catalytic process",
                  "separation process",
                  "polymerization",
                  "전기촉매",
                  "electrocatalyst",
                  "광촉매",
                  "photocatalyst",
                  "CO2 reduction",
                  "공정 설계",
                  "공정 최적화"
            ],
            "weak": [
                  "process",
                  "공정",
                  "chemical engineering",
                  "화학공학",
                  "simulation",
                  "시뮬레이션",
                  "chemistry",
                  "화학",
                  "합성"
            ],
            "negative": [
                  "semiconductor process",
                  "반도체 공정",
                  "ALD",
                  "etch",
                  "lithography",
                  "DRAM",
                  "packaging",
                  "robot control"
            ]
      },
      {
            "id": "protein_drug_development_general",
            "label": "단백질/신약개발",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "단백질 신약개발",
                  "단백질",
                  "신약개발",
                  "약물전달",
                  "바이오분자공학",
                  "protein",
                  "drug development",
                  "drug delivery"
            ],
            "strong": [
                  "단백질",
                  "protein",
                  "protein engineering",
                  "단백질 공학",
                  "신약개발",
                  "drug development",
                  "drug discovery",
                  "약물전달",
                  "drug delivery",
                  "바이오분자공학",
                  "biomolecular engineering",
                  "therapeutics",
                  "항체",
                  "antibody",
                  "enzyme",
                  "효소",
                  "structural biology",
                  "구조생물학",
                  "protein design",
                  "protein structure"
            ],
            "weak": [
                  "bio",
                  "biology",
                  "생명과학",
                  "biochemistry",
                  "생화학",
                  "molecular biology",
                  "분자생물학",
                  "AI drug"
            ],
            "negative": [
                  "polymer drug delivery only",
                  "battery",
                  "semiconductor"
            ]
      },
      {
            "id": "cell_immunology_molecular_biology_general",
            "label": "세포/면역/분자생물학",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "세포 면역 분자생물학",
                  "세포생물학",
                  "면역학",
                  "분자생물학",
                  "cell biology",
                  "immunology",
                  "molecular biology"
            ],
            "strong": [
                  "세포",
                  "세포생물학",
                  "cell biology",
                  "면역",
                  "면역학",
                  "immunology",
                  "분자생물학",
                  "molecular biology",
                  "disease mechanism",
                  "질병 기전",
                  "stem cell",
                  "줄기세포",
                  "developmental biology",
                  "발생생물학",
                  "genetics",
                  "유전학",
                  "RNA",
                  "gene regulation",
                  "신호전달",
                  "signal transduction",
                  "cancer biology"
            ],
            "weak": [
                  "biology",
                  "생명과학",
                  "bio",
                  "biochemistry",
                  "생화학",
                  "protein",
                  "단백질"
            ],
            "negative": [
                  "battery",
                  "semiconductor",
                  "robotics",
                  "NLP"
            ]
      },
      {
            "id": "nlp_llm_general",
            "label": "자연어처리/LLM",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "자연어처리 LLM",
                  "자연어처리",
                  "LLM",
                  "언어모델",
                  "생성형 AI",
                  "natural language processing",
                  "language model"
            ],
            "strong": [
                  "자연어처리",
                  "NLP",
                  "natural language processing",
                  "LLM",
                  "large language model",
                  "language model",
                  "언어모델",
                  "생성형 AI",
                  "generative AI",
                  "text mining",
                  "information retrieval",
                  "question answering",
                  "dialogue system",
                  "machine translation",
                  "semantic parsing"
            ],
            "weak": [
                  "AI",
                  "machine learning",
                  "deep learning",
                  "data mining",
                  "recommendation"
            ],
            "negative": [
                  "computer vision",
                  "영상인식",
                  "medical imaging",
                  "그래픽스",
                  "3D vision"
            ]
      },
      {
            "id": "database_bigdata_general",
            "label": "DB/빅데이터",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "데이터베이스 빅데이터",
                  "데이터베이스",
                  "빅데이터",
                  "데이터마이닝",
                  "추천시스템",
                  "database",
                  "big data",
                  "data mining",
                  "recommender"
            ],
            "strong": [
                  "데이터베이스",
                  "database",
                  "DB",
                  "빅데이터",
                  "big data",
                  "data mining",
                  "데이터마이닝",
                  "추천시스템",
                  "recommender system",
                  "information retrieval",
                  "knowledge graph",
                  "data management",
                  "query processing",
                  "graph data",
                  "data analytics",
                  "social computing"
            ],
            "weak": [
                  "AI",
                  "machine learning",
                  "data",
                  "algorithm",
                  "cloud"
            ],
            "negative": [
                  "wet lab",
                  "battery",
                  "semiconductor process"
            ]
      },
      {
            "id": "systems_os_distributed_general",
            "label": "시스템/운영체제",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "운영체제 분산시스템",
                  "운영체제",
                  "분산시스템",
                  "스토리지",
                  "클라우드",
                  "operating system",
                  "distributed system",
                  "storage",
                  "cloud computing"
            ],
            "strong": [
                  "운영체제",
                  "operating system",
                  "OS",
                  "분산시스템",
                  "distributed system",
                  "storage",
                  "스토리지",
                  "cloud computing",
                  "클라우드",
                  "computer systems",
                  "systems",
                  "network systems",
                  "virtualization",
                  "parallel computing",
                  "high performance computing",
                  "HPC",
                  "embedded system",
                  "real-time system"
            ],
            "weak": [
                  "computer architecture",
                  "software",
                  "network",
                  "database",
                  "security"
            ],
            "negative": [
                  "biological system",
                  "energy system",
                  "control system only"
            ]
      },
      {
            "id": "security_cryptography_general",
            "label": "정보보안/암호",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "정보보안 암호",
                  "정보보안",
                  "암호",
                  "프라이버시",
                  "시스템 보안",
                  "security",
                  "cryptography",
                  "privacy"
            ],
            "strong": [
                  "정보보안",
                  "security",
                  "cybersecurity",
                  "암호",
                  "cryptography",
                  "privacy",
                  "프라이버시",
                  "system security",
                  "시스템 보안",
                  "network security",
                  "software security",
                  "hardware security",
                  "secure computing",
                  "blockchain",
                  "formal verification",
                  "trusted execution",
                  "secure AI"
            ],
            "weak": [
                  "computer systems",
                  "network",
                  "software",
                  "algorithm",
                  "data"
            ],
            "negative": [
                  "physical security",
                  "battery",
                  "semiconductor process"
            ]
      },
      {
            "id": "power_electronics_inverter_general",
            "label": "전력전자/인버터",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "전력전자 인버터",
                  "전력전자",
                  "인버터",
                  "컨버터",
                  "전력변환",
                  "전원회로",
                  "power electronics",
                  "inverter",
                  "converter"
            ],
            "strong": [
                  "전력전자",
                  "power electronics",
                  "인버터",
                  "inverter",
                  "컨버터",
                  "converter",
                  "전력변환",
                  "power conversion",
                  "전원회로",
                  "power circuit",
                  "motor drive",
                  "power semiconductor",
                  "wide bandgap",
                  "SiC",
                  "GaN power",
                  "DC-DC",
                  "AC-DC",
                  "grid converter",
                  "electric vehicle power"
            ],
            "weak": [
                  "control",
                  "제어",
                  "circuit",
                  "회로",
                  "energy",
                  "에너지",
                  "electronics"
            ],
            "negative": [
                  "RF inverter",
                  "medical imaging",
                  "battery materials only"
            ]
      },
      {
            "id": "graphics_3d_vision_general",
            "label": "그래픽스/3D 비전",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "그래픽스 3D 비전",
                  "컴퓨터 그래픽스",
                  "그래픽스",
                  "3D 비전",
                  "렌더링",
                  "비주얼 컴퓨팅",
                  "computer graphics",
                  "3D vision",
                  "rendering"
            ],
            "strong": [
                  "컴퓨터 그래픽스",
                  "computer graphics",
                  "그래픽스",
                  "3D vision",
                  "3D 비전",
                  "rendering",
                  "렌더링",
                  "visual computing",
                  "비주얼 컴퓨팅",
                  "geometry processing",
                  "animation",
                  "가상현실",
                  "AR",
                  "VR",
                  "augmented reality",
                  "virtual reality",
                  "3D reconstruction",
                  "SLAM",
                  "neural rendering"
            ],
            "weak": [
                  "computer vision",
                  "영상",
                  "HCI",
                  "visualization",
                  "AI",
                  "deep learning"
            ],
            "negative": [
                  "medical imaging",
                  "의료영상",
                  "display device",
                  "NLP"
            ]
      },
      {
            "id": "aerospace_propulsion_general",
            "label": "항공우주/추진",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "항공우주 추진",
                  "항공우주",
                  "추진",
                  "로켓",
                  "위성",
                  "열유체",
                  "aerospace",
                  "propulsion",
                  "rocket",
                  "satellite"
            ],
            "strong": [
                  "항공우주",
                  "aerospace",
                  "추진",
                  "propulsion",
                  "로켓",
                  "rocket",
                  "위성",
                  "satellite",
                  "space",
                  "우주",
                  "aerodynamics",
                  "공기역학",
                  "fluid mechanics",
                  "유체역학",
                  "thermal fluid",
                  "열유체",
                  "combustion",
                  "연소",
                  "turbomachinery",
                  "gas turbine",
                  "항공기",
                  "UAV"
            ],
            "weak": [
                  "mechanical engineering",
                  "기계공학",
                  "control",
                  "제어",
                  "materials",
                  "소재",
                  "plasma"
            ],
            "negative": [
                  "battery",
                  "semiconductor",
                  "NLP",
                  "cell biology"
            ]
      },
      {
            "id": "environment_climate_sustainability_general",
            "label": "환경/기후/지속가능",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "환경 기후 지속가능",
                  "환경공학",
                  "기후",
                  "탄소중립",
                  "지속가능",
                  "environment",
                  "climate",
                  "sustainability",
                  "carbon neutral"
            ],
            "strong": [
                  "환경공학",
                  "environmental engineering",
                  "environment",
                  "기후",
                  "climate",
                  "탄소중립",
                  "carbon neutral",
                  "carbon neutrality",
                  "sustainability",
                  "지속가능",
                  "sustainable energy",
                  "water treatment",
                  "수처리",
                  "wastewater",
                  "폐수",
                  "air pollution",
                  "대기오염",
                  "carbon capture",
                  "CO2 capture",
                  "CO2 reduction",
                  "renewable energy",
                  "기후변화",
                  "climate change"
            ],
            "weak": [
                  "energy",
                  "에너지",
                  "chemical process",
                  "화학공정",
                  "materials",
                  "소재",
                  "catalyst",
                  "촉매"
            ],
            "negative": [
                  "computer climate model only",
                  "battery only",
                  "semiconductor process"
            ]
      },
      {
            "id": "process_manufacturing_general",
            "label": "공정/제조 일반",
            "strict": false,
            "minStrong": 1,
            "triggers": [
                  "공정 관련",
                  "공정",
                  "제조",
                  "process",
                  "manufacturing"
            ],
            "strong": [
                  "공정",
                  "process",
                  "manufacturing",
                  "제조",
                  "process optimization",
                  "공정 최적화",
                  "semiconductor process",
                  "반도체 공정",
                  "chemical process",
                  "화학공정",
                  "reaction engineering",
                  "반응공학",
                  "fabrication",
                  "nanofabrication",
                  "공정 설계",
                  "process systems",
                  "process control",
                  "ALD",
                  "CVD",
                  "etch",
                  "deposition",
                  "lithography"
            ],
            "weak": [
                  "engineering",
                  "공학",
                  "materials",
                  "소재",
                  "chemistry",
                  "화학",
                  "semiconductor",
                  "반도체",
                  "catalysis",
                  "촉매"
            ],
            "negative": [
                  "user process",
                  "business process",
                  "NLP",
                  "cell process only"
            ]
      }
];

    const POSTECH_INTENT_STOPWORDS = new Set(["연구", "연구실", "랩실", "교수", "교수님", "추천", "관련", "분야", "소개", "해주세요", "해줘", "포스텍", "postech", "학과", "대학원"]);

    function postechCompactText(value) {
      return normalize(value).replace(/\s+/g, "");
    }

    function postechTextHasTerm(text, term) {
      const normalizedText = normalize(text);
      const normalizedTerm = normalize(term);
      if (!normalizedText || !normalizedTerm) return false;
      // CT, AI, ML처럼 짧은 영문 약어는 단어 경계가 맞을 때만 인정한다.
      // 그렇지 않으면 object, detection, active 같은 일반 단어 안의 부분 문자열 때문에 의료영상/AI intent가 과대 매칭된다.
      if (/^[a-z0-9.+#-]{1,3}$/i.test(normalizedTerm)) {
        const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const boundary = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
        return boundary.test(normalizedText);
      }
      if (normalizedText.includes(normalizedTerm)) return true;
      const compactText = postechCompactText(text);
      const compactTerm = postechCompactText(term);
      return compactTerm.length >= 4 && compactText.includes(compactTerm);
    }

    function postechTermListHits(text, terms, maxTerms = 8) {
      const hits = [];
      (terms || []).forEach((term) => {
        const raw = String(term || "").trim();
        if (!raw) return;
        if (postechTextHasTerm(text, raw) && !hits.includes(raw)) hits.push(raw);
      });
      return hits.slice(0, maxTerms);
    }

    function detectPostechPreciseIntent(query) {
      const fullQuery = combinedQuery(query);
      const q = normalize(fullQuery);
      if (!q) return null;
      let best = null;
      POSTECH_PRECISE_INTENT_RULES.forEach((rule) => {
        const hits = postechTermListHits(q, rule.triggers, 8);
        if (!hits.length) return;
        const longest = Math.max(...hits.map((term) => normalize(term).length));
        const score = hits.length * 20 + longest + (rule.strict ? 8 : 0);
        if (!best || score > best._score) best = { ...rule, triggerHits: hits, _score: score };
      });
      return best;
    }

    function postechProfileText(profile, keys) {
      return internalTerms(profile, keys).join(" ");
    }

    function postechIntentProfileScore(professor, rule, query) {
      const directNameScore = professorNameDirectMatchScore(professor, query);
      if (directNameScore > 0) {
        return { score: directNameScore, strongHitCount: 1, weakHitCount: 0, negativeHitCount: 0, evidence: ["교수님 이름 직접 검색"], keep: true, nameDirect: true };
      }
      const profiles = professor._internalRecommendationProfiles || [];
      let score = 0;
      let strongHitCount = 0;
      let weakHitCount = 0;
      let negativeHitCount = 0;
      const evidence = [];
      const weakEvidence = [];
      profiles.forEach((profile) => {
        const strongText = postechProfileText(profile, ["positive_queries", "aliases_ko", "aliases_en", "subfields", "methods", "materials_or_targets", "applications"]);
        const broadText = postechProfileText(profile, ["primary_domains", "secondary_domains", "weak_queries"]);
        const allText = [strongText, broadText].join(" ");
        let strongHits = postechTermListHits(strongText, [...(rule.strong || []), ...(rule.triggers || [])], 12);
        const weakHits = postechTermListHits(allText, rule.weak || [], 8).filter((term) => !strongHits.includes(term));
        const profileNegativeHits = internalHitTerms(query, internalTerms(profile, ["negative_queries"]), 10);
        let ruleNegativeHits = postechTermListHits(allText, rule.negative || [], 8);
        if (String(rule.id || "").startsWith("battery")) {
          const batteryContextHits = postechTermListHits(allText, ["battery", "batteries", "배터리", "전지", "이차전지", "리튬", "lithium", "Li-ion", "electrochemistry", "전기화학", "energy storage"], 4);
          if (!batteryContextHits.length) {
            if (strongHits.length) ruleNegativeHits = [...ruleNegativeHits, "배터리 맥락 없음"];
            strongHits = [];
          }
        }
        if (strongHits.length) {
          score += 560 + Math.min(strongHits.length, 5) * 180;
          strongHitCount += strongHits.length;
          strongHits.forEach((term) => { if (!evidence.includes(term)) evidence.push(term); });
        }
        if (weakHits.length) {
          score += Math.min(weakHits.length, 5) * (strongHits.length ? 38 : 12);
          weakHitCount += weakHits.length;
          weakHits.forEach((term) => { if (!weakEvidence.includes(term)) weakEvidence.push(term); });
        }
        const negativeCount = profileNegativeHits.length + ruleNegativeHits.length;
        if (negativeCount) {
          const penalty = strongHits.length ? 160 * Math.min(negativeCount, 5) : 760 + 220 * Math.min(negativeCount, 5);
          score -= penalty;
          negativeHitCount += negativeCount;
        }
      });
      const keep = strongHitCount >= Number(rule.minStrong || 1) && score > 0;
      return { score, strongHitCount, weakHitCount, negativeHitCount, evidence: evidence.slice(0, 5), weakEvidence: weakEvidence.slice(0, 5), keep, nameDirect: false };
    }

    function applyPostechPreciseIntent(item, rule, query) {
      if (!rule) return item;
      const intent = postechIntentProfileScore(item.professor, rule, query);
      item.preciseIntentId = rule.id;
      item.preciseIntentLabel = rule.label;
      item.preciseIntentScore = Math.round(intent.score || 0);
      item.preciseIntentStrongHitCount = intent.strongHitCount || 0;
      item.preciseIntentWeakHitCount = intent.weakHitCount || 0;
      item.preciseIntentKeep = Boolean(intent.keep || intent.nameDirect);
      item.relevanceTier = intent.nameDirect ? "A" : (intent.keep ? ((intent.strongHitCount || 0) >= 2 ? "A" : "B") : ((intent.weakHitCount || 0) > 0 && (intent.score || 0) > 0 ? "C" : ""));
      item.adjacentEvidence = Array.from(new Set([...(intent.weakEvidence || []), ...(intent.evidence || [])])).slice(0, 5);
      if (intent.keep || intent.nameDirect) {
        item.score = Math.max(item.score, 900 + Math.round(intent.score || 0));
        item.internalMatchedEvidence = Array.from(new Set([...(intent.evidence || []), ...(item.internalMatchedEvidence || [])])).slice(0, 5);
        item.matched = Array.from(new Set([...(intent.evidence || []), ...(item.matched || [])])).slice(0, 12);
        item.reasons = Array.from(new Set([`${rule.label} 세부 분야와 직접 연결됩니다`, ...(item.reasons || [])])).slice(0, 4);
      } else if (rule.strict) {
        if (item.relevanceTier === "C") {
          item.internalMatchedEvidence = Array.from(new Set([...(item.adjacentEvidence || []), ...(item.internalMatchedEvidence || [])])).slice(0, 5);
          item.matched = Array.from(new Set([...(item.adjacentEvidence || []), ...(item.matched || [])])).slice(0, 12);
        }
        item.score = Math.min(item.score, 120);
      } else if (intent.score > 0) {
        item.score += Math.round(intent.score * 0.35);
      }
      return item;
    }

    function postechIsSpecificSearchQuery(query) {
      const tokens = tokenize(query).filter((token) => tokenWeight(token) > 0 && token.length >= 2 && !POSTECH_INTENT_STOPWORDS.has(token));
      return tokens.length >= 1;
    }

    function attachPostechTieredMetadata(directResults, adjacentResults, rule, mode) {
      const direct = directResults || [];
      direct._adjacentResults = adjacentResults || [];
      direct._tieredMeta = {
        mode: mode || "precise",
        intentId: rule ? rule.id : "",
        intentLabel: rule ? rule.label : "",
        directCount: direct.length,
        adjacentCount: (adjacentResults || []).length
      };
      return direct;
    }

    function postechProfessorStableKey(item) {
      const p = item && item.professor ? item.professor : {};
      return [p.professor || "", (p.unitLabels || []).join("|"), (p.labNames || []).join("|")].join("::");
    }

    function postechBuildTieredResults(scored, rule, query, limit, mode) {
      const directPool = scored
        .filter((item) => item.preciseIntentKeep && Number(item.preciseIntentScore || 0) > 0)
        .sort((a, b) => {
          const tierRank = { A: 2, B: 1, C: 0 };
          return (tierRank[b.relevanceTier || ""] || 0) - (tierRank[a.relevanceTier || ""] || 0)
            || Number(b.preciseIntentScore || 0) - Number(a.preciseIntentScore || 0)
            || b.score - a.score
            || a.professor.professor.localeCompare(b.professor.professor, "ko");
        });

      let directResults = [];
      if (directPool.length) {
        const topIntentScore = Number(directPool[0].preciseIntentScore || 0);
        const isExploreMode = mode === "explore" || mode === "banner_explore";
        const floorRatio = isExploreMode ? 0.12 : 0.22;
        const strictFloor = Math.max(isExploreMode ? 120 : 260, Math.round(topIntentScore * floorRatio));
        directResults = directPool
          .filter((item) => Number(item.preciseIntentScore || 0) >= strictFloor)
          .slice(0, Math.min(limit, 80));
      }

      const directKeys = new Set(directResults.map(postechProfessorStableKey));
      const adjacentResults = scored
        .filter((item) => !directKeys.has(postechProfessorStableKey(item)))
        .filter((item) => item.relevanceTier === "C" || (Number(item.preciseIntentWeakHitCount || 0) > 0 && Number(item.preciseIntentScore || 0) > 0))
        .filter((item) => Number(item.preciseIntentScore || 0) > 0 || Number(item.score || 0) > 80)
        .sort((a, b) => Number(b.preciseIntentScore || 0) - Number(a.preciseIntentScore || 0) || b.score - a.score || a.professor.professor.localeCompare(b.professor.professor, "ko"))
        .slice(0, 24)
        .map((item) => {
          item.relevanceTier = "C";
          if (item.adjacentEvidence && item.adjacentEvidence.length) {
            item.internalMatchedEvidence = Array.from(new Set([...(item.adjacentEvidence || []), ...(item.internalMatchedEvidence || [])])).slice(0, 5);
            item.matched = Array.from(new Set([...(item.adjacentEvidence || []), ...(item.matched || [])])).slice(0, 12);
          }
          item.reasons = Array.from(new Set([`${rule.label} 인접 분야와 연결됩니다`, ...(item.reasons || [])])).slice(0, 4);
          return item;
        });

      if (!directResults.length && rule && rule.strict && postechIsSpecificSearchQuery(query)) {
        return attachPostechTieredMetadata([], adjacentResults, rule, mode);
      }
      return attachPostechTieredMetadata(directResults, adjacentResults, rule, mode);
    }

    const examples = [
      {
            "label": "반도체 소자/공정",
            "query": "반도체 소자, 박막 증착, 트랜지스터 공정 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "반도체 소자 공정",
            "intent": "semiconductor_device_process_general",
            "mode": "banner_explore"
      },
      {
            "label": "배터리/전기화학",
            "query": "리튬금속 배터리, 전고체전지, 전기화학 에너지 저장 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "배터리",
            "intent": "battery_general",
            "mode": "banner_explore"
      },
      {
            "label": "디스플레이",
            "query": "OLED, Micro LED, 플렉서블 디스플레이, 발광소자 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "디스플레이",
            "intent": "display_general",
            "mode": "banner_explore"
      },
      {
            "label": "포토닉스/광전소자",
            "query": "포토닉스, 광전소자, 나노광학, 레이저, 광검출기 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "포토닉스 광전소자",
            "intent": "photonics_optoelectronics_general",
            "mode": "banner_explore"
      },
      {
            "label": "AI/머신러닝",
            "query": "머신러닝, 딥러닝, 강화학습, 생성형 AI 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "AI 머신러닝",
            "intent": "ai_ml_general",
            "mode": "banner_explore"
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "컴퓨터 비전, 영상인식, 객체검출, 멀티모달 AI 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "컴퓨터비전 영상인식",
            "intent": "computer_vision_general",
            "mode": "banner_explore"
      },
      {
            "label": "바이오센서/생체전자",
            "query": "바이오센서, 생체전자소자, 웨어러블 센서, 임플란터블 소자 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "바이오센서 생체전자",
            "intent": "biosensor_bioelectronics_general",
            "mode": "banner_explore"
      },
      {
            "label": "뇌과학/BCI",
            "query": "실험 뇌과학, BCI, 신경공학, 신경전극, 뇌영상 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "뇌과학 BCI",
            "intent": "neuroscience_bci_general",
            "mode": "banner_explore"
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "의료영상 딥러닝, MRI, 디지털헬스, 헬스케어 AI 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "의료영상 디지털헬스",
            "intent": "medical_imaging_digital_health_general",
            "mode": "banner_explore"
      },
      {
            "label": "로봇/자율주행",
            "query": "로봇, 자율주행, SLAM, 드론, 모빌리티 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "로봇 자율주행 제어",
            "intent": "robotics_autonomous_control_general",
            "mode": "banner_explore"
      },
      {
            "label": "HCI/AR·VR",
            "query": "HCI, AR, VR, UX, 인터랙션, 사용자 경험 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "HCI AR VR",
            "intent": "hci_ar_vr_general",
            "mode": "banner_explore"
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자컴퓨팅, 양자정보, 양자알고리즘, 양자시뮬레이션 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "양자컴퓨팅 양자정보",
            "intent": "quantum_computing_information_general",
            "mode": "banner_explore"
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "AI 반도체, VLSI, SoC, 하드웨어 가속기, 집적회로 설계 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "AI 반도체 VLSI",
            "intent": "ai_semiconductor_vlsi_general",
            "mode": "banner_explore"
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "반도체 패키징, 칩렛, 3D IC, 이종집적, 인터커넥트 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "반도체 패키징 이종집적",
            "intent": "semiconductor_packaging_heterogeneous_integration_general",
            "mode": "banner_explore"
      },
      {
            "label": "수소/연료전지",
            "query": "수소 생산, 연료전지, 전기화학 에너지 변환, 촉매 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "수소 연료전지",
            "intent": "hydrogen_fuelcell_general",
            "mode": "banner_explore"
      },
      {
            "label": "나노소재/신소재",
            "query": "나노소재, 신소재, 2D 소재, 그래핀, 표면 분석 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "나노소재 신소재",
            "intent": "materials_nano_general",
            "mode": "banner_explore"
      },
      {
            "label": "고분자/유기소재",
            "query": "고분자, 유기소재, 소프트머터, 스마트 폴리머 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "고분자 유기소재",
            "intent": "polymer_organic_materials_general",
            "mode": "banner_explore"
      },
      {
            "label": "촉매/화학공정",
            "query": "촉매, 유기합성, 반응공학, 화학공정 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "촉매 화학공정",
            "intent": "catalysis_chemical_process_general",
            "mode": "banner_explore"
      },
      {
            "label": "단백질/신약개발",
            "query": "단백질 공학, 신약개발, 약물전달, 바이오분자공학 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "단백질 신약개발",
            "intent": "protein_drug_development_general",
            "mode": "banner_explore"
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "세포생물학, 면역학, 분자생물학, 질병 기전 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "세포 면역 분자생물학",
            "intent": "cell_immunology_molecular_biology_general",
            "mode": "banner_explore"
      },
      {
            "label": "자연어처리/LLM",
            "query": "자연어처리, LLM, 언어모델, 생성형 AI 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "자연어처리 LLM",
            "intent": "nlp_llm_general",
            "mode": "banner_explore"
      },
      {
            "label": "DB/빅데이터",
            "query": "데이터베이스, 빅데이터, 데이터마이닝, 추천시스템 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "데이터베이스 빅데이터",
            "intent": "database_bigdata_general",
            "mode": "banner_explore"
      },
      {
            "label": "시스템/운영체제",
            "query": "운영체제, 분산시스템, 스토리지, 클라우드 컴퓨팅 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "운영체제 분산시스템",
            "intent": "systems_os_distributed_general",
            "mode": "banner_explore"
      },
      {
            "label": "정보보안/암호",
            "query": "정보보안, 암호, 프라이버시, 시스템 보안 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "정보보안 암호",
            "intent": "security_cryptography_general",
            "mode": "banner_explore"
      },
      {
            "label": "전력전자/인버터",
            "query": "전력전자, 인버터, 컨버터, 전력변환, 전원회로 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "전력전자 인버터",
            "intent": "power_electronics_inverter_general",
            "mode": "banner_explore"
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "컴퓨터 그래픽스, 3D 비전, 렌더링, 비주얼 컴퓨팅 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "그래픽스 3D 비전",
            "intent": "graphics_3d_vision_general",
            "mode": "banner_explore"
      },
      {
            "label": "항공우주/추진",
            "query": "항공우주, 추진, 로켓, 위성, 열유체 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "항공우주 추진",
            "intent": "aerospace_propulsion_general",
            "mode": "banner_explore"
      },
      {
            "label": "환경/기후/지속가능",
            "query": "환경공학, 기후, 탄소중립, 지속가능 에너지 시스템 연구 관련 교수님을 추천해 주세요",
            "algorithmQuery": "환경 기후 지속가능",
            "intent": "environment_climate_sustainability_general",
            "mode": "banner_explore"
      }
];



    // 외부 검색 및 STAR Library 기반 대표 후보 보정표입니다.
    // 기존 DB 필드를 삭제하지 않고, 상단 대표 분야 또는 동일한 질의가 들어왔을 때 대표성이 높은 교수님을 정렬에서 우선 고려합니다.
    const representativeCategorySignals = {
  "반도체 소자/공정": {
    "triggers": [
      "반도체 소자",
      "반도체 공정",
      "semiconductor device",
      "semiconductor process",
      "nanofabrication",
      "나노공정",
      "전자소자",
      "메모리",
      "뉴로모픽",
      "transistor",
      "박막",
      "thin film",
      "mosfet",
      "mems"
    ],
    "names": [
      "황현상",
      "백창기",
      "이정수",
      "이병훈",
      "조문호",
      "오명철",
      "최시영",
      "한현",
      "노용영"
    ]
  },
  "AI 반도체/VLSI": {
    "triggers": [
      "ai 반도체",
      "vlsi",
      "soc",
      "asic",
      "fpga",
      "하드웨어 가속기",
      "집적회로",
      "회로설계",
      "circuit",
      "integrated circuit",
      "computer architecture",
      "neuromorphic hardware",
      "ai hardware",
      "반도체 회로"
    ],
    "names": [
      "강석형",
      "이선규",
      "김병섭",
      "신세운",
      "심재윤",
      "정성웅",
      "백창기",
      "황현상"
    ]
  },
  "반도체 패키징/이종집적": {
    "triggers": [
      "반도체 패키징",
      "패키징",
      "chiplet",
      "칩렛",
      "3d ic",
      "이종집적",
      "heterogeneous integration",
      "interconnect",
      "인터커넥트",
      "advanced packaging",
      "through silicon via",
      "tsv",
      "bonding",
      "system in package"
    ],
    "names": [
      "송재용",
      "김석",
      "이선규",
      "이병훈",
      "김병섭"
    ]
  },
  "디스플레이": {
    "triggers": [
      "디스플레이",
      "oled",
      "micro led",
      "마이크로 led",
      "발광소자",
      "led",
      "display",
      "quantum dot led",
      "qd led",
      "유기발광",
      "flexible display",
      "perovskite led",
      "메타표면 디스플레이"
    ],
    "names": [
      "최수석",
      "김욱성",
      "노용영",
      "김종규",
      "조창순",
      "노준석",
      "정운룡"
    ]
  },
  "포토닉스/광전소자": {
    "triggers": [
      "포토닉스",
      "광전소자",
      "광소자",
      "나노광학",
      "광검출기",
      "레이저",
      "photonics",
      "optoelectronic",
      "nanophotonics",
      "plasmonics",
      "metasurface",
      "metamaterial",
      "optics",
      "optical"
    ],
    "names": [
      "노준석",
      "조창순",
      "김종환",
      "한해욱",
      "김기현",
      "김윤호",
      "신희득",
      "최수석"
    ]
  },
  "배터리/전기화학": {
    "triggers": [
      "배터리",
      "전기화학",
      "리튬",
      "전고체",
      "이차전지",
      "battery",
      "batteries",
      "lithium",
      "solid-state battery",
      "electrolyte",
      "electrode",
      "cathode",
      "anode",
      "energy storage"
    ],
    "names": [
      "강병우",
      "조창신",
      "박수진",
      "최시영",
      "김원배",
      "조길원"
    ]
  },
  "수소/연료전지": {
    "triggers": [
      "수소",
      "연료전지",
      "수전해",
      "hydrogen",
      "fuel cell",
      "water splitting",
      "electrolysis",
      "co2 reduction",
      "electrocatalyst",
      "oxygen reduction",
      "orr",
      "her",
      "oer",
      "그린수소"
    ],
    "names": [
      "김용태",
      "김원배",
      "윤창원",
      "천동원",
      "최창혁",
      "조강우",
      "홍석봉",
      "안지환"
    ]
  },
  "나노소재/신소재": {
    "triggers": [
      "나노소재",
      "신소재",
      "2d materials",
      "2d 소재",
      "graphene",
      "그래핀",
      "materials",
      "nanomaterial",
      "nanomaterials",
      "surface",
      "interface",
      "thin film",
      "재료",
      "나노"
    ],
    "names": [
      "김철주",
      "조문호",
      "최시영",
      "정운룡",
      "김종환",
      "박형규",
      "한현"
    ]
  },
  "고분자/유기소재": {
    "triggers": [
      "고분자",
      "유기소재",
      "소프트머터",
      "polymer",
      "polymers",
      "organic material",
      "organic electronics",
      "soft matter",
      "hydrogel",
      "biopolymer",
      "smart polymer",
      "유기반도체",
      "유기전자"
    ],
    "names": [
      "김영기",
      "조길원",
      "이효민",
      "이기라",
      "김동성",
      "정운룡",
      "정대성",
      "황동수"
    ]
  },
  "촉매/화학공정": {
    "triggers": [
      "촉매",
      "유기합성",
      "반응공학",
      "화학공정",
      "catalyst",
      "catalysis",
      "organic synthesis",
      "reaction engineering",
      "chemical process",
      "polymerization",
      "공정",
      "합성",
      "전기촉매",
      "광촉매"
    ],
    "names": [
      "김현우",
      "조승환",
      "지형민",
      "최창혁",
      "김원배",
      "홍석봉",
      "조강우"
    ]
  },
  "바이오센서/생체전자": {
    "triggers": [
      "바이오센서",
      "생체전자",
      "웨어러블 센서",
      "implantable",
      "bioelectronics",
      "biosensor",
      "biomedical device",
      "wearable",
      "neural electrode",
      "medical device",
      "생체신호",
      "바이오소재",
      "soft robot",
      "유연소자"
    ],
    "names": [
      "한세광",
      "임근배",
      "강대식",
      "박재성",
      "김준원",
      "박성민",
      "정운룡"
    ]
  },
  "뇌과학/BCI": {
    "triggers": [
      "뇌과학",
      "bci",
      "신경공학",
      "신경전극",
      "뇌영상",
      "neuroscience",
      "brain",
      "neural",
      "neuron",
      "cognitive",
      "neuroengineering",
      "neurobiology",
      "synapse",
      "신경과학"
    ],
    "names": [
      "강대식",
      "김태경",
      "김종신",
      "백승태",
      "김형함"
    ]
  },
  "의료영상/디지털헬스": {
    "triggers": [
      "의료영상",
      "디지털헬스",
      "mri",
      "ct",
      "ultrasound",
      "photoacoustic",
      "medical imaging",
      "biomedical imaging",
      "healthcare ai",
      "digital healthcare",
      "헬스케어",
      "초음파",
      "광음향",
      "임상"
    ],
    "names": [
      "김원화",
      "김철홍",
      "류일우",
      "박성민",
      "김기현",
      "김형함"
    ]
  },
  "단백질/신약개발": {
    "triggers": [
      "단백질",
      "신약개발",
      "약물전달",
      "바이오분자",
      "protein",
      "drug discovery",
      "drug delivery",
      "biomolecular",
      "enzyme",
      "antibody",
      "structural biology",
      "생체분자",
      "치료제",
      "약물"
    ],
    "names": [
      "차형준",
      "이지오",
      "권도훈",
      "임현석",
      "김원종",
      "한세광",
      "이준구"
    ]
  },
  "세포/면역/분자생물학": {
    "triggers": [
      "세포",
      "면역",
      "분자생물학",
      "cell biology",
      "immunology",
      "molecular biology",
      "cancer",
      "disease mechanism",
      "stem cell",
      "developmental biology",
      "genetics",
      "microbiology",
      "신호전달",
      "암"
    ],
    "names": [
      "임신혁",
      "김광순",
      "유주연",
      "최세규",
      "허윤하",
      "김종신",
      "백승태"
    ]
  },
  "AI/머신러닝": {
    "triggers": [
      "ai",
      "인공지능",
      "machine learning",
      "머신러닝",
      "deep learning",
      "딥러닝",
      "reinforcement learning",
      "강화학습",
      "data science",
      "generative ai",
      "optimization",
      "prediction",
      "learning",
      "데이터사이언스"
    ],
    "names": [
      "박상돈",
      "옥정슬",
      "김동우",
      "이남훈",
      "전광성",
      "박은혁",
      "김형훈",
      "유환조"
    ]
  },
  "컴퓨터비전/영상인식": {
    "triggers": [
      "컴퓨터비전",
      "영상인식",
      "computer vision",
      "image recognition",
      "object detection",
      "segmentation",
      "multimodal",
      "visual recognition",
      "robot vision",
      "image processing",
      "vision",
      "영상",
      "이미지"
    ],
    "names": [
      "조민수",
      "손진희",
      "곽수하",
      "김광인",
      "류일우",
      "김진태"
    ]
  },
  "자연어처리/LLM": {
    "triggers": [
      "자연어처리",
      "llm",
      "언어모델",
      "natural language processing",
      "nlp",
      "language model",
      "large language model",
      "text mining",
      "speech language",
      "생성형 ai",
      "대화모델"
    ],
    "names": [
      "김형훈",
      "이근배",
      "유환조"
    ]
  },
  "DB/빅데이터": {
    "triggers": [
      "데이터베이스",
      "빅데이터",
      "데이터마이닝",
      "추천시스템",
      "database",
      "big data",
      "data mining",
      "recommendation system",
      "graph mining",
      "data management",
      "data analytics",
      "정보검색",
      "그래프"
    ],
    "names": [
      "유환조",
      "한욱신",
      "전명재",
      "이근배",
      "김형훈"
    ]
  },
  "시스템/운영체제": {
    "triggers": [
      "운영체제",
      "분산시스템",
      "스토리지",
      "클라우드",
      "operating system",
      "distributed system",
      "storage",
      "cloud computing",
      "network system",
      "computer system",
      "systems",
      "server",
      "computer architecture",
      "iot"
    ],
    "names": [
      "이성진",
      "박찬익",
      "박지성",
      "전명재",
      "한욱신"
    ]
  },
  "정보보안/암호": {
    "triggers": [
      "정보보안",
      "암호",
      "프라이버시",
      "security",
      "cryptography",
      "privacy",
      "system security",
      "network security",
      "blockchain",
      "secure computing",
      "malware",
      "privacy preserving"
    ],
    "names": [
      "김슬배",
      "박찬익",
      "박지성",
      "박상돈"
    ]
  },
  "전력전자/인버터": {
    "triggers": [
      "전력전자",
      "인버터",
      "컨버터",
      "전력변환",
      "전원회로",
      "power electronics",
      "inverter",
      "converter",
      "power conversion",
      "power system",
      "smart grid",
      "microgrid",
      "electric power",
      "grid"
    ],
    "names": [
      "채수용",
      "신세운",
      "김영진"
    ]
  },
  "로봇/자율주행": {
    "triggers": [
      "로봇",
      "자율주행",
      "slam",
      "드론",
      "모빌리티",
      "robot",
      "robotics",
      "autonomous",
      "autonomous driving",
      "uav",
      "drone",
      "motion planning",
      "control theory",
      "soft robot"
    ],
    "names": [
      "유선철",
      "안혜민",
      "김기훈",
      "김정훈",
      "한수희",
      "강대식",
      "고제성",
      "김진태"
    ]
  },
  "HCI/AR·VR": {
    "triggers": [
      "hci",
      "ar",
      "vr",
      "ux",
      "인터랙션",
      "사용자 경험",
      "human-computer interaction",
      "user experience",
      "augmented reality",
      "virtual reality",
      "interface",
      "interactive",
      "haptic",
      "mixed reality"
    ],
    "names": [
      "조은경",
      "최승문",
      "황인석",
      "고성안"
    ]
  },
  "그래픽스/3D 비전": {
    "triggers": [
      "컴퓨터 그래픽스",
      "3d 비전",
      "렌더링",
      "비주얼 컴퓨팅",
      "computer graphics",
      "3d vision",
      "rendering",
      "visual computing",
      "3d reconstruction",
      "geometry processing",
      "computational imaging",
      "hologram",
      "holography",
      "3d"
    ],
    "names": [
      "이승용",
      "조성현",
      "백승환",
      "류일우"
    ]
  },
  "양자컴퓨팅/양자정보": {
    "triggers": [
      "양자컴퓨팅",
      "양자정보",
      "양자알고리즘",
      "양자시뮬레이션",
      "quantum computing",
      "quantum information",
      "quantum optics",
      "quantum photonics",
      "quantum communication",
      "quantum simulation",
      "quantum device",
      "양자광학",
      "양자"
    ],
    "names": [
      "이승우",
      "이문주",
      "박지우",
      "김윤호",
      "신희득",
      "박기복",
      "박경덕"
    ]
  },
  "항공우주/추진": {
    "triggers": [
      "항공우주",
      "추진",
      "로켓",
      "위성",
      "열유체",
      "aerospace",
      "propulsion",
      "rocket",
      "satellite",
      "spacecraft",
      "combustion",
      "fluid mechanics",
      "turbulence",
      "thermal fluid"
    ],
    "names": [
      "유동현",
      "김진태",
      "이상준",
      "홍원빈",
      "이남윤"
    ]
  },
  "환경/기후/지속가능에너지": {
    "triggers": [
      "환경공학",
      "기후",
      "탄소중립",
      "지속가능",
      "sustainable",
      "environment",
      "climate",
      "carbon neutral",
      "co2 capture",
      "carbon capture",
      "water treatment",
      "air pollution",
      "renewable energy",
      "sustainability"
    ],
    "names": [
      "박형규",
      "유동현",
      "김종흠",
      "김진태",
      "김기훈",
      "김현우",
      "신원동",
      "이상준",
      "전상민",
      "이민식",
      "이승우",
      "강병우"
    ]
  }
};

    const weakTokens = new Set([
      "추천", "교수", "교수님", "연구실", "랩실", "대학원", "석사", "박사", "진학", "관심", "분야", "쪽",
      "싶어", "찾고", "누가", "어떤", "포스텍", "kaist", "dgist", "학생", "적합성", "연구", "기술"
    ]);

    const mediumTokens = new Set([
      "공정", "소자", "device", "system", "systems", "bio", "cell", "ai", "data", "network", "control", "medical", "센서"
    ]);

    const extraSynonyms = {
      "반도체": ["semiconductor", "semiconductor device", "semiconductor process", "박막", "transistor", "트랜지스터"],
      "공정": ["fabrication", "process", "thin film", "etch", "deposition"],
      "소자": ["device", "transistor", "mosfet", "tft", "memory device", "메모리"],
      "회로": ["circuit", "vlsi", "soc", "asic", "fpga", "mixed-signal", "analog", "digital"],
      "ai반도체": ["ai hardware", "accelerator", "vlsi", "soc", "computer architecture", "하드웨어 가속기"],
      "디스플레이": ["display", "oled", "micro-led", "optoelectronic", "photonic", "photonics"],
      "광전": ["optoelectronic", "photonic", "photonics", "optical", "laser"],
      "포토닉스": ["photonics", "optical", "laser", "nanophotonics", "silicon photonics"],
      "배터리": ["battery", "batteries", "li battery", "lithium", "energy storage", "전기화학", "리튬전지", "전고체전지", "이차전지"],
      "전고체전지": ["solid-state battery", "solid state battery", "solid-state li", "li battery", "lithium battery", "battery", "전고체", "배터리"],
      "리튬전지": ["li battery", "lithium battery", "battery", "batteries", "배터리"],
      "이차전지": ["battery", "batteries", "li battery", "lithium battery", "배터리"],
      "전력전자": ["power electronics", "power converter", "inverter", "power integrity"],
      "통신": ["wireless", "communication", "rf", "antenna", "information theory", "coding"],
      "신호처리": ["signal processing", "speech recognition", "audio", "video coding", "image processing"],
      "로봇": ["robot", "robotics", "control", "autonomous", "slam", "drone"],
      "자율주행": ["autonomous", "vehicle", "robotics", "slam", "control"],
      "뇌": ["brain", "neuro", "neuroscience", "bci", "cognitive"],
      "바이오": ["bio", "biomedical", "biology", "protein", "cell", "genome", "drug delivery"],
      "바이오센서": ["biosensor", "sensor", "biomedical", "wearable", "medical"],
      "유전체": ["genomics", "bioinformatics", "omics", "computational biology"],
      "계산생물학": ["computational biology", "bioinformatics", "systems biology"],
      "hci": ["human-computer interaction", "ux", "interactive computing", "ar", "vr"],
      "보안": ["security", "privacy", "cryptography"],
      "알고리즘": ["algorithm", "complexity", "graph theory", "theory"],
      "양자": ["quantum", "quantum information", "quantum computing", "quantum photonics"],
      "재료": ["materials", "nanomaterial", "surface", "interface", "thin film"],
      "센서": ["sensor", "imaging", "measurement", "wearable", "mems", "nems"],
      "자연어처리": ["nlp", "natural language processing", "language model", "llm", "large language model"],
      "llm": ["large language model", "language model", "natural language processing", "nlp", "생성형 ai"],
      "생성형 ai": ["generative ai", "large language model", "llm", "diffusion", "foundation model"],
      "운영체제": ["operating system", "storage system", "file system", "distributed system", "cloud", "computer systems"],
      "분산시스템": ["distributed system", "distributed systems", "cloud", "networked system", "computer systems"],
      "데이터베이스": ["database", "data mining", "big data", "data engineering"],
      "그래픽스": ["computer graphics", "visual computing", "rendering", "3d vision"],
      "음성": ["speech recognition", "audio signal processing", "audio", "acoustic"],
      "촉매": ["catalysis", "catalyst", "organometallic", "organic synthesis"],
      "유기합성": ["organic synthesis", "organic chemistry", "medicinal chemistry", "catalysis"],
      "단백질": ["protein engineering", "protein", "drug discovery", "biologics"],
      "신약개발": ["drug discovery", "drug delivery", "medicinal chemistry", "therapeutics"],
      "세포생물학": ["cell biology", "molecular biology", "cell signaling", "immunology"],
      "마이크로유체": ["microfluidics", "lab-on-a-chip", "lab on a chip", "biochip"],
      "의료영상": ["medical imaging", "mri", "fmri", "biomedical imaging", "healthcare ai"],
      "항공우주": ["aerospace", "satellite", "propulsion", "spacecraft", "uav"],
      "추진": ["propulsion", "rocket", "combustion", "engine", "thruster"],
      "최적화": ["optimization", "optimal control", "control theory", "reinforcement learning"],
      "패키징": ["packaging", "chiplet", "3d ic", "heterogeneous integration", "interconnect"],
      "환경": ["environment", "climate", "carbon neutral", "sustainability", "water treatment", "separation"],
      "기후": ["climate", "carbon neutral", "sustainable energy", "environmental engineering"],
      "고분자": ["polymer", "soft matter", "organic materials", "elastomer", "self-assembly"],
      "소프트머터": ["soft matter", "polymer", "self-assembly", "colloid"],
      "연료전지": ["fuel cell", "hydrogen", "water electrolysis", "electrocatalysis", "energy conversion"],
      "수소": ["hydrogen", "fuel cell", "water electrolysis", "electrocatalysis"],
      "전해질": ["electrolyte", "electrolytes", "battery electrolyte", "solid electrolyte", "polymer electrolyte", "sulfide electrolyte", "전해액", "고체전해질", "이온전도", "이온수송"],
      "전해액": ["electrolyte", "electrolytes", "battery electrolyte", "liquid electrolyte", "전해질"],
      "고체전해질": ["solid electrolyte", "solid-state electrolyte", "sulfide electrolyte", "oxide electrolyte", "전고체전지", "전해질"],
      "양극재": ["cathode", "cathode material", "positive electrode", "양극", "양극 소재"],
      "음극재": ["anode", "anode material", "negative electrode", "lithium metal anode", "silicon anode", "음극", "음극 소재"],
      "분리막": ["separator", "battery separator", "membrane"],
      "계면": ["interface", "interphase", "sei", "cei", "solid electrolyte interphase", "전극 계면", "전해질 계면"],
      "취업": ["R&D", "기업", "공정기술", "양산기술", "소자개발", "회로설계", "산업 응용"],
    };


    // 화면에는 보이지 않는 검색 전용 한영 동의어 사전입니다.
    // 교수님 원본 DB와 카드 표시 문구는 유지하고, 학생이 한글로 검색했을 때 영어 연구 키워드와 연결하기 위해 점수 계산에만 사용합니다.
    const bilingualSearchGlossary = [
      ["electrolyte", "electrolytes", "battery electrolyte", "li-ion battery electrolyte", "li ion battery electrolyte", "solid electrolyte", "polymer electrolyte", "sulfide electrolyte", "oxide electrolyte", "ionic liquid", "ion transport", "ionic conduction", "전해질", "전해액", "배터리 전해질", "리튬이온전지 전해질", "고체전해질", "고체 전해질", "황화물계 전해질", "산화물계 전해질", "이온전도", "이온 수송"],
      ["cathode", "cathode material", "cathode materials", "positive electrode", "양극", "양극재", "양극 소재", "양극활물질"],
      ["anode", "anode material", "anode materials", "negative electrode", "lithium metal anode", "silicon anode", "음극", "음극재", "음극 소재", "리튬금속 음극", "실리콘 음극"],
      ["separator", "separators", "membrane", "battery separator", "분리막", "배터리 분리막", "멤브레인"],
      ["interface", "interphase", "solid electrolyte interphase", "sei", "cei", "electrode interface", "계면", "전극 계면", "전해질 계면", "계면반응", "계면 안정화"],
      ["solid-state battery", "solid state battery", "all-solid-state battery", "all solid state battery", "assb", "전고체전지", "전고체 전지", "전고체 배터리"],
      ["battery", "batteries", "secondary battery", "lithium-ion battery", "lithium ion battery", "li-ion", "li ion", "energy storage", "배터리", "전지", "이차전지", "2차전지", "리튬이온전지", "리튬 전지", "에너지저장"],
      ["fuel cell", "hydrogen", "water electrolysis", "water splitting", "electrocatalysis", "oxygen evolution", "hydrogen evolution", "연료전지", "수소", "수전해", "물분해", "전기촉매", "산소발생반응", "수소발생반응"],
      ["solar cell", "photovoltaic", "perovskite solar", "renewable energy", "태양전지", "페로브스카이트 태양전지", "광전변환", "신재생에너지"],
      ["semiconductor fabrication", "fabrication", "process integration", "lithography", "etch", "etching", "deposition", "thin film", "ald", "cvd", "pvd", "euv", "반도체 공정", "공정", "소자 제작", "리소그래피", "포토공정", "식각", "에칭", "증착", "박막", "원자층증착"],
      ["semiconductor device", "transistor", "mosfet", "fet", "tft", "nanodevice", "nanoscale device", "electronic device", "반도체 소자", "전자소자", "트랜지스터", "전계효과 트랜지스터", "나노소자", "소자물리"],
      ["memory", "memory device", "rram", "mram", "dram", "sram", "flash memory", "memristor", "nonvolatile memory", "pim", "processing-in-memory", "compute-in-memory", "메모리", "메모리 소자", "차세대 메모리", "저항변화메모리", "자기메모리", "비휘발성 메모리", "인메모리", "지능형 메모리"],
      ["spintronics", "spin transport", "spin torque", "mtj", "skyrmion", "magnetoresistance", "스핀트로닉스", "스핀 소자", "스핀 수송", "스핀 토크", "스커미온", "자기터널접합"],
      ["integrated circuit", "circuit design", "vlsi", "soc", "asic", "fpga", "analog circuit", "digital circuit", "mixed-signal", "ai accelerator", "hardware accelerator", "neuromorphic", "집적회로", "회로설계", "시스템반도체", "아날로그 회로", "디지털 회로", "혼성신호", "AI 반도체", "하드웨어 가속기", "뉴로모픽"],
      ["packaging", "advanced packaging", "chiplet", "interconnect", "heterogeneous integration", "3d ic", "through silicon via", "tsv", "패키징", "첨단 패키징", "칩렛", "인터커넥트", "이종집적", "3차원 집적", "실리콘관통전극"],
      ["display", "oled", "qled", "micro-led", "optoelectronic", "photodetector", "phototransistor", "optoelectronics", "디스플레이", "유기발광다이오드", "양자점발광다이오드", "마이크로LED", "광전자소자", "광검출기", "포토트랜지스터"],
      ["photonics", "nanophotonics", "silicon photonics", "optical", "laser", "plasmonics", "holography", "metasurface", "광학", "포토닉스", "나노포토닉스", "실리콘 포토닉스", "레이저", "플라즈모닉스", "홀로그래피", "메타표면"],
      ["machine learning", "deep learning", "artificial intelligence", "neural network", "data science", "prediction model", "인공지능", "머신러닝", "딥러닝", "신경망", "데이터사이언스", "예측모델"],
      ["computer vision", "image processing", "object detection", "segmentation", "3d vision", "visual recognition", "medical imaging", "컴퓨터비전", "컴퓨터 비전", "영상처리", "객체검출", "분할", "3D 비전", "시각지능", "의료영상"],
      ["natural language processing", "nlp", "large language model", "llm", "language model", "generative ai", "foundation model", "diffusion model", "multimodal", "자연어처리", "언어모델", "대규모 언어모델", "생성형 AI", "파운데이션 모델", "확산모델", "멀티모달"],
      ["robotics", "robot", "robot control", "motion control", "humanoid", "legged robot", "manipulator", "autonomous robot", "slam", "path planning", "로봇", "로보틱스", "로봇 제어", "모션제어", "휴머노이드", "보행로봇", "매니퓰레이터", "자율로봇", "동시적 위치추정 및 지도작성", "경로계획"],
      ["autonomous driving", "autonomous vehicle", "mobility", "vehicle control", "drone", "uav", "자율주행", "자율주행차", "모빌리티", "차량제어", "드론", "무인항공기"],
      ["control theory", "optimal control", "robust control", "model predictive control", "mpc", "optimization", "reinforcement learning", "제어", "제어이론", "최적제어", "강인제어", "모델예측제어", "최적화", "강화학습"],
      ["communication", "wireless", "rf", "antenna", "information theory", "coding", "6g", "network", "통신", "무선통신", "RF", "안테나", "정보이론", "부호화", "네트워크"],
      ["security", "privacy", "cryptography", "hardware security", "network security", "blockchain", "정보보안", "보안", "프라이버시", "암호", "암호학", "하드웨어 보안", "네트워크 보안", "블록체인"],
      ["embedded system", "embedded systems", "iot", "internet of things", "edge computing", "sensor network", "low-power", "임베디드", "임베디드 시스템", "사물인터넷", "에지컴퓨팅", "센서네트워크", "저전력"],
      ["biosensor", "bio sensor", "sensing", "wearable sensor", "healthcare sensor", "biomedical device", "바이오센서", "생체 센서", "센싱", "웨어러블 센서", "헬스케어 센서", "의료기기"],
      ["medical imaging", "biomedical imaging", "mri", "fmri", "ultrasound", "computed tomography", "ct", "x-ray", "의료영상", "바이오영상", "자기공명영상", "초음파", "컴퓨터단층촬영", "엑스레이"],
      ["brain", "neuroscience", "neural circuit", "synapse", "neuron", "neuromodulation", "brain-computer interface", "bci", "neural interface", "뇌", "뇌과학", "신경과학", "신경회로", "시냅스", "뉴런", "신경조절", "뇌컴퓨터인터페이스", "신경인터페이스"],
      ["genomics", "bioinformatics", "computational biology", "omics", "single-cell", "transcriptomics", "유전체", "바이오정보학", "계산생물학", "오믹스", "단일세포", "전사체"],
      ["protein", "protein engineering", "drug discovery", "drug delivery", "therapeutics", "biologics", "peptide", "단백질", "단백질공학", "신약개발", "약물전달", "치료제", "바이오의약품", "펩타이드"],
      ["cell biology", "molecular biology", "cell signaling", "immunology", "cancer biology", "rna biology", "세포생물학", "분자생물학", "세포신호", "면역", "암생물학", "RNA 생물학"],
      ["microfluidics", "lab-on-a-chip", "lab on a chip", "biochip", "diagnostic", "droplet", "마이크로유체", "랩온어칩", "바이오칩", "진단기기", "액적"],
      ["catalysis", "catalyst", "electrocatalysis", "photocatalysis", "organic synthesis", "organometallic", "polymer", "polymer chemistry", "soft matter", "촉매", "전기촉매", "광촉매", "유기합성", "유기금속", "고분자", "고분자화학", "소프트매터"],
      ["materials", "nanomaterial", "nanomaterials", "2d materials", "graphene", "surface", "characterization", "synthesis", "self-assembly", "재료", "소재", "나노소재", "이차원소재", "그래핀", "표면", "분석", "합성", "자가조립"],
      ["quantum", "quantum computing", "quantum information", "qubit", "quantum device", "quantum transport", "quantum optics", "양자", "양자컴퓨팅", "양자정보", "큐비트", "양자소자", "양자수송", "양자광학"],
      ["simulation", "modeling", "modelling", "computational", "dft", "density functional theory", "first-principles", "ab initio", "molecular dynamics", "finite element", "시뮬레이션", "모델링", "계산", "계산과학", "밀도범함수이론", "제일원리", "분자동역학", "유한요소"],
      ["aerospace", "satellite", "spacecraft", "propulsion", "rocket", "combustion", "uav", "drone", "항공우주", "위성", "우주선", "추진", "로켓", "연소", "무인항공기", "드론"],
      ["environment", "climate", "carbon neutral", "carbon capture", "co2 reduction", "water treatment", "separation", "sustainability", "환경", "기후", "탄소중립", "탄소포집", "이산화탄소 환원", "수처리", "분리", "지속가능성"]
    ];

    function hiddenBilingualSearchText(rawText) {
      const source = normalize(rawText);
      const out = new Set();
      if (!source) return "";
      bilingualSearchGlossary.forEach((group) => {
        const normalizedGroup = group.map((term) => normalize(term)).filter(Boolean);
        if (normalizedGroup.some((term) => source.includes(term))) {
          normalizedGroup.forEach((term) => out.add(term));
        }
      });
      return Array.from(out).join(" ");
    }

    function hiddenBilingualFocusBoost(query, rawText) {
      const q = normalize(query);
      const t = normalize(rawText);
      if (!q || !t) return 0;
      let boost = 0;
      bilingualSearchGlossary.forEach((group) => {
        const normalizedGroup = group.map((term) => normalize(term)).filter(Boolean);
        const queryHit = normalizedGroup.some((term) => q.includes(term));
        if (!queryHit) return;
        const textHitCount = normalizedGroup.reduce((acc, term) => acc + (t.includes(term) ? 1 : 0), 0);
        if (textHitCount > 0) boost += Math.min(44, 18 + textHitCount * 4);
      });
      return boost;
    }


    const phraseRules = [
      { name: "반도체 소자/공정", triggers: ["반도체", "semiconductor", "공정기술", "양산기술"], tags: ["반도체 소자/공정/박막"], terms: ["semiconductor", "thin film", "fabrication", "process", "transistor", "oxide", "박막", "공정", "트랜지스터"], bonus: 48 },
      { name: "패키징/이종집적", triggers: ["패키징", "packaging", "chiplet", "3d ic", "이종집적"], tags: ["패키징/인터커넥트/신뢰성"], terms: ["packaging", "chiplet", "interconnect", "heterogeneous integration", "3d"], bonus: 55 },
      { name: "회로/AI 반도체", triggers: ["회로", "회로설계", "vlsi", "soc", "asic", "fpga", "ai 반도체", "ai반도체"], tags: ["반도체 회로/SoC/AI하드웨어"], terms: ["vlsi", "circuit", "soc", "asic", "fpga", "mixed-signal", "hardware accelerator", "computer architecture"], bonus: 52 },
      { name: "디스플레이/포토닉스", triggers: ["디스플레이", "포토닉스", "광전", "oled", "photonics", "optoelectronic"], tags: ["디스플레이/포토닉스/광전자"], terms: ["display", "photonics", "optoelectronic", "optical", "laser", "oled", "nanophotonics"], bonus: 50 },
      { name: "전력전자", triggers: ["전력전자", "전력변환", "인버터", "power electronics"], tags: ["전력전자/전력변환/전력무결성"], terms: ["power electronics", "power converter", "inverter", "power integrity"], bonus: 58 },
      { name: "통신/RF", triggers: ["통신", "rf", "안테나", "무선", "정보이론"], tags: ["통신/무선/RF/정보이론"], terms: ["wireless", "communication", "rf", "antenna", "information theory", "coding"], bonus: 46 },
      { name: "신호처리", triggers: ["신호처리", "음성", "오디오", "영상처리", "멀티미디어"], tags: ["신호처리/음성/영상/멀티미디어"], terms: ["signal processing", "speech", "audio", "video", "image processing", "multimedia"], bonus: 46 },
      { name: "바이오/뇌공학", triggers: ["바이오센서", "의료영상", "뇌공학", "bci", "brain", "neuro"], tags: ["바이오/의생명/약물전달", "뇌/신경/인지/BCI", "센서/계측/이미징/웨어러블"], terms: ["biosensor", "biomedical", "medical imaging", "brain", "neuro", "bci", "implant", "wearable"], bonus: 42 },
      { name: "유전체/계산생물학", triggers: ["유전체", "계산생물학", "바이오정보학", "오믹스"], tags: ["유전체/계산생물학/바이오정보학"], terms: ["genomics", "bioinformatics", "computational biology", "omics", "systems biology"], bonus: 54 },
      { name: "배터리/에너지", triggers: ["배터리", "전기화학", "에너지소재", "연료전지", "전고체전지", "리튬전지", "이차전지", "전해질", "전해액", "고체전해질", "양극재", "음극재", "분리막", "lithium battery", "solid-state battery", "electrolyte", "solid electrolyte", "cathode", "anode", "separator"], tags: ["배터리/에너지/수소/전기화학"], terms: ["battery", "batteries", "lithium", "electrolyte", "electrolytes", "solid electrolyte", "cathode", "anode", "separator", "electrode", "interface", "interphase", "electrochemical", "fuel cell", "energy storage", "energy materials", "배터리", "리튬전지", "전고체전지", "이차전지", "전해질", "전해액", "고체전해질", "양극재", "음극재", "분리막", "계면"], bonus: 48 },
      { name: "나노소재/신소재", triggers: ["나노소재", "신소재", "2d 소재", "재료", "materials", "nanomaterial"], tags: ["재료/나노/표면/분석", "화학/촉매/유기합성/고분자"], terms: ["materials", "nanomaterial", "2d materials", "graphene", "surface", "interface", "thin film", "synthesis", "characterization", "재료", "나노소재", "신소재", "2d 소재", "표면", "계면", "합성"], bonus: 50 },
      { name: "AI/데이터", triggers: ["ai", "인공지능", "머신러닝", "딥러닝", "데이터"], tags: ["AI/머신러닝/데이터사이언스"], terms: ["machine learning", "deep learning", "data science", "computer vision", "nlp"], bonus: 38 },
      { name: "전산이론", triggers: ["알고리즘", "그래프", "복잡도", "전산이론"], tags: ["전산이론/알고리즘/그래프"], terms: ["algorithm", "graph theory", "complexity", "theory"], bonus: 52 },
      { name: "HCI/UX", triggers: ["hci", "ux", "ar", "vr", "디지털 헬스", "인터랙션"], tags: ["HCI/UX/ARVR/디지털헬스"], terms: ["human-computer interaction", "interactive", "augmented reality", "virtual reality", "digital health"], bonus: 48 },
      { name: "양자", triggers: ["양자", "양자컴퓨팅", "양자정보"], tags: ["양자/물리/광학/천문"], terms: ["quantum", "quantum computing", "quantum information"], bonus: 50 },
      { name: "자연어처리/LLM", triggers: ["자연어처리", "nlp", "llm", "언어모델", "생성형 ai"], tags: ["AI/머신러닝/데이터사이언스"], terms: ["natural language processing", "language model", "large language model", "llm", "machine reading", "nlp"], bonus: 60 },
      { name: "컴퓨터시스템", triggers: ["운영체제", "분산시스템", "클라우드", "스토리지", "컴퓨터 시스템"], tags: ["컴퓨터시스템/보안/네트워크/소프트웨어"], terms: ["operating system", "distributed system", "storage", "file system", "cloud", "computer system"], bonus: 58 },
      { name: "데이터베이스/빅데이터", triggers: ["데이터베이스", "빅데이터", "데이터마이닝", "data mining", "database"], tags: ["AI/머신러닝/데이터사이언스", "컴퓨터시스템/보안/네트워크/소프트웨어"], terms: ["database", "data mining", "big data", "data engineering"], bonus: 54 },
      { name: "화학/촉매/유기합성", triggers: ["촉매", "유기합성", "고분자", "화학", "catalysis", "organic synthesis"], tags: ["화학/촉매/유기합성/고분자"], terms: ["catalysis", "catalyst", "organic synthesis", "organometallic", "polymer", "고분자", "유기합성", "촉매"], bonus: 62 },
      { name: "의료영상/디지털헬스", triggers: ["의료영상", "mri", "디지털 헬스", "헬스케어 ai", "medical imaging"], tags: ["센서/계측/이미징/웨어러블", "뇌/신경/인지/BCI", "HCI/UX/ARVR/디지털헬스"], terms: ["medical imaging", "mri", "fmri", "biomedical imaging", "healthcare ai", "digital health"], bonus: 62 },
      { name: "마이크로유체/랩온어칩", triggers: ["마이크로유체", "랩온어칩", "바이오칩", "microfluidics", "lab-on-a-chip"], tags: ["센서/계측/이미징/웨어러블", "바이오/의생명/약물전달"], terms: ["microfluidics", "lab-on-a-chip", "lab on a chip", "biochip", "micro/nano fluid", "droplet"], bonus: 65 },
      { name: "항공우주/추진", triggers: ["항공우주", "위성", "추진", "로켓", "aerospace", "propulsion"], tags: ["항공우주/위성/추진/열유체"], terms: ["aerospace", "spacecraft", "satellite", "propulsion", "rocket", "combustion", "uav", "항공우주", "위성", "추진"], bonus: 58 },
    ];


    // 분야별 우선 학과/대학원 보정 규칙입니다.
    // DB 자체와 추천 카드 출력은 유지하되, 검색 의도와 전공 축이 어긋난 후보가 상위에 뜨지 않도록 정렬 점수만 보정합니다.
    const domainRules = [
      {
        name: "반도체 소자/공정",
        triggers: ["반도체", "semiconductor", "mosfet", "트랜지스터", "산화막", "oxide", "박막 공정", "공정기술", "양산기술", "etch", "deposition"],
        preferredUnits: ["ee", "mse", "sse"],
        secondaryUnits: ["cbe", "physics", "chemistry", "me", "quantum"],
        tags: ["반도체 소자/공정/박막"],
        terms: ["semiconductor", "semiconductor device", "semiconductor process", "transistor", "mosfet", "tft", "oxide", "thin film", "fabrication", "etch", "deposition", "lithography", "process", "memory device", "반도체", "반도체 소자", "반도체 공정", "산화막", "박막", "트랜지스터", "메모리", "소자 물리"],
        preferredBonus: 86,
        secondaryBonus: 12,
        tagBonus: 72,
        termBonus: 42,
        exactFieldBonus: 22,
        nonPreferredPenalty: 32,
        mismatchPenalty: 115
      },
      {
        name: "AI 반도체/회로설계",
        triggers: ["ai 반도체", "ai반도체", "vlsi", "회로설계", "집적회로", "soc", "asic", "fpga", "mixed-signal", "mixed signal", "analog", "digital circuit", "하드웨어 가속기", "반도체 회로"],
        preferredUnits: ["ee", "sse"],
        secondaryUnits: ["cs", "gsai"],
        tags: ["반도체 회로/SoC/AI하드웨어"],
        terms: ["vlsi", "circuit", "integrated circuit", "soc", "asic", "fpga", "mixed-signal", "mixed signal", "analog", "digital circuit", "hardware accelerator", "computer architecture", "ai hardware", "회로", "회로설계", "집적회로", "반도체 시스템", "하드웨어 가속기"],
        preferredBonus: 92,
        secondaryBonus: 24,
        tagBonus: 78,
        termBonus: 46,
        exactFieldBonus: 24,
        nonPreferredPenalty: 34,
        mismatchPenalty: 130
      },
      {
        name: "디스플레이/포토닉스/광전소자",
        triggers: ["디스플레이", "포토닉스", "광전", "광전소자", "광전자", "oled", "led", "photonics", "optoelectronic", "optoelectronics", "optical", "laser"],
        preferredUnits: ["ee", "mse", "physics", "sse"],
        secondaryUnits: ["quantum", "me", "cbe"],
        tags: ["디스플레이/포토닉스/광전자"],
        terms: ["display", "oled", "micro-led", "led", "photonics", "nanophotonics", "silicon photonics", "optoelectronic", "optoelectronics", "optical", "laser", "photodetector", "광전", "광전자", "광전기 소자", "포토닉스", "디스플레이", "나노광학"],
        preferredBonus: 74,
        secondaryBonus: 20,
        tagBonus: 72,
        termBonus: 44,
        exactFieldBonus: 22,
        nonPreferredPenalty: 22,
        mismatchPenalty: 105
      },
      {
        name: "생체 소자/바이오센서",
        triggers: ["생체 소자", "생체소자", "바이오 소자", "바이오소자", "생체전자", "바이오전자", "bio device", "biodevice", "bioelectronic", "bioelectronics", "bio-integrated", "bio integrated", "바이오센서", "biosensor", "웨어러블", "wearable", "임플란터블", "implantable", "의료영상", "medical imaging", "뇌공학", "bci", "neural interface"],
        preferredUnits: ["ee", "bioeng", "biology", "bcs"],
        secondaryUnits: ["mse", "cbe", "me", "sse"],
        tags: ["바이오/의생명/약물전달", "뇌/신경/인지/BCI", "센서/계측/이미징/웨어러블"],
        terms: ["biosensor", "bio sensor", "biomedical", "bio-integrated", "bio integrated", "bioelectronics", "bioelectronic", "wearable", "implant", "implantable", "neural", "brain", "bci", "medical imaging", "biointerface", "bio-interface", "생체", "생체전자", "생체전자재료", "바이오센서", "바이오전자", "웨어러블", "임플란터블", "신경", "뇌", "의료영상", "인공 신경", "신경 전극"],
        preferredBonus: 88,
        secondaryBonus: 22,
        tagBonus: 58,
        termBonus: 66,
        exactFieldBonus: 40,
        nonPreferredPenalty: 26,
        mismatchPenalty: 125,
        needsSpecificTerm: true
      },
      {
        name: "전력전자/전력변환",
        triggers: ["전력전자", "전력변환", "인버터", "컨버터", "power electronics", "power converter", "inverter", "power integrity"],
        preferredUnits: ["ee", "sse"],
        secondaryUnits: ["me", "mse"],
        tags: ["전력전자/전력변환/전력무결성"],
        terms: ["power electronics", "power converter", "inverter", "power integrity", "power management", "전력전자", "전력변환", "인버터", "컨버터", "전원회로"],
        preferredBonus: 92,
        secondaryBonus: 12,
        tagBonus: 82,
        termBonus: 48,
        exactFieldBonus: 26,
        nonPreferredPenalty: 34,
        mismatchPenalty: 135
      },
      {
        name: "통신/RF/무선",
        triggers: ["통신", "무선통신", "rf", "안테나", "정보이론", "6g", "wireless", "communication", "antenna", "information theory"],
        preferredUnits: ["ee"],
        secondaryUnits: ["cs", "sse", "gsai"],
        tags: ["통신/무선/RF/정보이론", "신호처리/음성/영상/멀티미디어"],
        terms: ["wireless", "communication", "communications", "rf", "antenna", "information theory", "coding", "signal processing", "6g", "통신", "무선", "안테나", "정보이론", "신호처리"],
        preferredBonus: 82,
        secondaryBonus: 18,
        tagBonus: 76,
        termBonus: 46,
        exactFieldBonus: 22,
        nonPreferredPenalty: 26,
        mismatchPenalty: 118
      },
      {
        name: "배터리/에너지",
        triggers: ["배터리", "전기화학", "에너지소재", "연료전지", "전고체전지", "리튬전지", "이차전지", "battery", "batteries", "lithium battery", "solid-state battery", "electrochemical", "fuel cell"],
        preferredUnits: ["mse", "cbe", "me", "sse"],
        secondaryUnits: ["chemistry", "ee"],
        tags: ["배터리/에너지/수소/전기화학"],
        terms: ["battery", "electrochemical", "fuel cell", "energy storage", "energy materials", "배터리", "전기화학", "연료전지", "수소", "에너지 저장"],
        preferredBonus: 72,
        secondaryBonus: 18,
        tagBonus: 70,
        termBonus: 42,
        exactFieldBonus: 20,
        nonPreferredPenalty: 24,
        mismatchPenalty: 105,
        strictMatch: true
      },
      {
        name: "나노소재/신소재",
        triggers: ["나노소재", "신소재", "2d 소재", "2d materials", "재료", "materials", "nanomaterial", "graphene", "그래핀", "표면분석", "재료 합성"],
        preferredUnits: ["mse", "cbe", "chemistry", "physics"],
        secondaryUnits: ["ee", "sse", "me", "quantum"],
        tags: ["재료/나노/표면/분석", "화학/촉매/유기합성/고분자", "반도체 소자/공정/박막"],
        terms: ["materials", "nanomaterial", "nanomaterials", "2d materials", "graphene", "surface", "interface", "thin film", "synthesis", "characterization", "재료", "나노소재", "신소재", "2d 소재", "그래핀", "표면", "계면", "박막", "합성", "분석"],
        preferredBonus: 78,
        secondaryBonus: 20,
        tagBonus: 76,
        termBonus: 46,
        exactFieldBonus: 24,
        nonPreferredPenalty: 24,
        mismatchPenalty: 112
      },
      {
        name: "AI/머신러닝",
        triggers: ["ai", "인공지능", "머신러닝", "딥러닝", "데이터사이언스", "생성형 ai", "machine learning", "deep learning", "data science"],
        preferredUnits: ["gsai", "cs", "ee"],
        secondaryUnits: ["bioeng", "bcs", "sse", "me"],
        tags: ["AI/머신러닝/데이터사이언스"],
        terms: ["artificial intelligence", "machine learning", "deep learning", "data science", "generative ai", "reinforcement learning", "nlp", "ai", "인공지능", "머신러닝", "딥러닝", "데이터사이언스", "생성형 ai"],
        preferredBonus: 70,
        secondaryBonus: 18,
        tagBonus: 72,
        termBonus: 42,
        exactFieldBonus: 22,
        nonPreferredPenalty: 18,
        mismatchPenalty: 95
      },
      {
        name: "유전체/계산생물학",
        triggers: ["유전체", "계산생물학", "바이오정보학", "오믹스", "genomics", "bioinformatics", "computational biology", "omics"],
        preferredUnits: ["biology", "bioeng", "bcs", "gsai", "cs"],
        secondaryUnits: ["cbe"],
        tags: ["유전체/계산생물학/바이오정보학"],
        terms: ["genomics", "bioinformatics", "computational biology", "omics", "systems biology", "유전체", "오믹스", "바이오정보학", "계산생물학"],
        preferredBonus: 78,
        secondaryBonus: 18,
        tagBonus: 76,
        termBonus: 48,
        exactFieldBonus: 24,
        nonPreferredPenalty: 30,
        mismatchPenalty: 125
      },
      {
        name: "HCI/AR·VR/디지털헬스",
        triggers: ["hci", "ux", "ar", "vr", "디지털 헬스", "인터랙션", "human-computer interaction", "augmented reality", "virtual reality"],
        preferredUnits: ["cs", "gsai", "bioeng", "ee"],
        secondaryUnits: ["bcs", "me"],
        tags: ["HCI/UX/ARVR/디지털헬스"],
        terms: ["human-computer interaction", "interactive", "augmented reality", "virtual reality", "digital health", "hci", "ux", "ar", "vr", "디지털 헬스", "인터랙션"],
        preferredBonus: 72,
        secondaryBonus: 18,
        tagBonus: 72,
        termBonus: 40,
        exactFieldBonus: 20,
        nonPreferredPenalty: 24,
        mismatchPenalty: 105
      }
,
      {
        name: "AI/컴퓨터비전",
        triggers: ["컴퓨터 비전", "컴퓨터비전", "영상 인식", "이미지 인식", "object detection", "segmentation", "computer vision", "vision", "image recognition", "visual recognition"],
        preferredUnits: ["cs", "gsai", "ee"],
        secondaryUnits: ["bioeng", "sse"],
        tags: ["AI/머신러닝/데이터사이언스", "신호처리/음성/영상/멀티미디어"],
        terms: ["computer vision", "image understanding", "visual recognition", "image recognition", "object detection", "segmentation", "video understanding", "multimodal", "computational imaging", "vision", "이미지", "영상", "컴퓨터비전", "컴퓨터 비전", "객체 인식", "영상 인식", "딥러닝"],
        preferredBonus: 96,
        secondaryBonus: 18,
        tagBonus: 64,
        termBonus: 66,
        exactFieldBonus: 56,
        nonPreferredPenalty: 32,
        mismatchPenalty: 170,
        strictMatch: true
      },
      {
        name: "정보보안/암호",
        triggers: ["정보보안", "보안", "암호", "개인정보보호", "privacy", "security", "cryptography", "secure computing"],
        preferredUnits: ["cs", "ee"],
        secondaryUnits: ["gsai"],
        tags: ["컴퓨터시스템/보안/네트워크/소프트웨어", "통신/무선/RF/정보이론"],
        terms: ["security", "system security", "network security", "distributed system security", "cryptography", "applied cryptography", "privacy", "secure", "trusted", "시스템 보안", "네트워크 보안", "정보보안", "암호", "개인정보", "시큐어 컴퓨팅"],
        preferredBonus: 98,
        secondaryBonus: 18,
        tagBonus: 70,
        termBonus: 70,
        exactFieldBonus: 58,
        nonPreferredPenalty: 36,
        mismatchPenalty: 180,
        strictMatch: true
      },
      {
        name: "실험 뇌과학/신경공학",
        triggers: ["실험 뇌과학", "실험 신경과학", "뇌과학", "신경과학", "bci", "brain", "neuroscience", "neuroengineering", "neural engineering"],
        preferredUnits: ["bcs", "bioeng", "biology", "ee"],
        secondaryUnits: ["gsai", "cs", "me"],
        tags: ["뇌/신경/인지/BCI", "생명과학/세포/분자/질병", "센서/계측/이미징/웨어러블"],
        terms: ["neuroscience", "synapse", "brain disease", "mri", "fmri", "neuroimaging", "brain imaging", "electrophysiology", "neural interface", "neural electrode", "neuroprosthetics", "bci", "implant", "brain-computer interface", "behavior", "뇌영상", "신경과학", "시냅스", "뇌질환", "신경공학", "신경 전극", "신경 보철", "뇌-컴퓨터", "뇌-기계", "전기생리", "실험"],
        preferredBonus: 94,
        secondaryBonus: 14,
        tagBonus: 66,
        termBonus: 72,
        exactFieldBonus: 60,
        nonPreferredPenalty: 30,
        mismatchPenalty: 175,
        strictMatch: true
      },
      {
        name: "로봇/제어/자율주행",
        triggers: ["로봇", "제어", "자율주행", "slam", "robot", "robotics", "autonomous", "drone", "control"],
        preferredUnits: ["me", "ee", "cs", "ae"],
        secondaryUnits: ["gsai", "sse", "bioeng"],
        tags: ["로봇/제어/자율주행/모빌리티", "AI/머신러닝/데이터사이언스", "센서/계측/이미징/웨어러블"],
        terms: ["robot", "robotics", "autonomous", "slam", "control", "navigation", "drone", "legged", "manipulation", "motion planning", "vehicle", "로봇", "자율주행", "제어", "드론", "내비게이션", "모빌리티"],
        preferredBonus: 84,
        secondaryBonus: 18,
        tagBonus: 66,
        termBonus: 58,
        exactFieldBonus: 44,
        nonPreferredPenalty: 28,
        mismatchPenalty: 145,
        strictMatch: true
      },
      {
        name: "양자컴퓨팅/양자정보",
        triggers: ["양자컴퓨팅", "양자 컴퓨팅", "양자정보", "양자 정보", "양자알고리즘", "quantum computing", "quantum information", "quantum algorithm"],
        preferredUnits: ["quantum", "physics", "ee"],
        secondaryUnits: ["cs", "sse"],
        tags: ["양자/물리/광학/천문", "전산이론/알고리즘/그래프", "통신/무선/RF/정보이론"],
        terms: ["quantum computing", "quantum computer", "quantum information", "quantum algorithm", "quantum communication", "quantum simulation", "superconducting quantum", "rydberg", "neutral atom", "양자컴퓨팅", "양자 컴퓨팅", "양자정보", "양자 정보", "양자알고리즘", "초전도 양자", "리드버그"],
        preferredBonus: 92,
        secondaryBonus: 18,
        tagBonus: 66,
        termBonus: 66,
        exactFieldBonus: 58,
        nonPreferredPenalty: 30,
        mismatchPenalty: 165,
        strictMatch: true
      }
      ,
      {
        name: "자연어처리/LLM",
        triggers: ["자연어처리", "언어모델", "llm", "large language model", "nlp", "생성형 ai", "machine reading", "language model"],
        preferredUnits: ["gsai", "cs"],
        secondaryUnits: ["ee", "bioeng"],
        tags: ["AI/머신러닝/데이터사이언스"],
        terms: ["natural language processing", "language model", "large language model", "llm", "machine reading", "text", "nlp", "generative ai", "foundation model", "자연어처리", "언어모델", "생성형 ai"],
        preferredBonus: 104,
        secondaryBonus: 14,
        tagBonus: 60,
        termBonus: 74,
        exactFieldBonus: 70,
        nonPreferredPenalty: 34,
        mismatchPenalty: 185,
        strictMatch: true
      },
      {
        name: "컴퓨터시스템/운영체제",
        triggers: ["운영체제", "os", "분산시스템", "분산 시스템", "클라우드", "스토리지", "파일 시스템", "컴퓨터 시스템", "operating system", "distributed system", "cloud", "storage", "file system"],
        preferredUnits: ["cs", "ee"],
        secondaryUnits: ["sse", "gsai"],
        tags: ["컴퓨터시스템/보안/네트워크/소프트웨어"],
        terms: ["operating system", "운영체제", "distributed system", "분산시스템", "storage", "스토리지", "file system", "파일 시스템", "cloud", "computer system", "networked system", "performance analysis"],
        preferredBonus: 92,
        secondaryBonus: 18,
        tagBonus: 76,
        termBonus: 64,
        exactFieldBonus: 54,
        nonPreferredPenalty: 28,
        mismatchPenalty: 155,
        strictMatch: true
      },
      {
        name: "데이터베이스/빅데이터",
        triggers: ["데이터베이스", "데이터 마이닝", "데이터마이닝", "빅데이터", "data mining", "database", "big data", "data engineering"],
        preferredUnits: ["cs", "gsai"],
        secondaryUnits: ["ee", "bioeng", "sse"],
        tags: ["AI/머신러닝/데이터사이언스", "컴퓨터시스템/보안/네트워크/소프트웨어"],
        terms: ["database", "데이터베이스", "data mining", "데이터마이닝", "big data", "빅데이터", "data engineering", "데이터공학", "information service"],
        preferredBonus: 88,
        secondaryBonus: 18,
        tagBonus: 60,
        termBonus: 68,
        exactFieldBonus: 58,
        nonPreferredPenalty: 28,
        mismatchPenalty: 150,
        strictMatch: true
      },
      {
        name: "컴퓨터그래픽스/비주얼컴퓨팅",
        triggers: ["컴퓨터 그래픽스", "컴퓨터그래픽스", "그래픽스", "렌더링", "3d 비전", "3d vision", "visual computing", "computer graphics", "rendering"],
        preferredUnits: ["cs", "gsai"],
        secondaryUnits: ["ee", "me"],
        tags: ["AI/머신러닝/데이터사이언스", "HCI/UX/ARVR/디지털헬스"],
        terms: ["computer graphics", "컴퓨터그래픽스", "컴퓨터 그래픽스", "visual computing", "비주얼 컴퓨팅", "rendering", "3d vision", "3d/4d", "geometry processing", "data visualization"],
        preferredBonus: 92,
        secondaryBonus: 16,
        tagBonus: 50,
        termBonus: 72,
        exactFieldBonus: 62,
        nonPreferredPenalty: 30,
        mismatchPenalty: 160,
        strictMatch: true
      },
      {
        name: "음성/오디오 신호처리",
        triggers: ["음성", "오디오", "음성 인식", "음성인식", "음악", "speech", "audio", "acoustic", "sound"],
        preferredUnits: ["ee", "cs"],
        secondaryUnits: ["sse", "me"],
        tags: ["신호처리/음성/영상/멀티미디어"],
        terms: ["speech recognition", "speech", "audio", "audio signal processing", "sound", "acoustic", "auditory", "music information", "음성", "오디오", "음향"],
        preferredBonus: 94,
        secondaryBonus: 16,
        tagBonus: 76,
        termBonus: 66,
        exactFieldBonus: 58,
        nonPreferredPenalty: 28,
        mismatchPenalty: 155,
        strictMatch: true
      },
      {
        name: "화학/촉매/유기합성",
        triggers: ["촉매", "유기합성", "유기화학", "고분자 화학", "반응 메커니즘", "catalysis", "catalyst", "organic synthesis", "organometallic", "polymer chemistry"],
        preferredUnits: ["chemistry", "cbe"],
        secondaryUnits: ["mse", "physics"],
        tags: ["화학/촉매/유기합성/고분자"],
        terms: ["catalysis", "catalyst", "촉매", "organic synthesis", "유기합성", "organic chemistry", "유기화학", "organometallic", "유기금속", "polymer", "고분자", "reaction", "반응", "medicinal chemistry", "의약화학"],
        preferredBonus: 98,
        secondaryBonus: 18,
        tagBonus: 74,
        termBonus: 70,
        exactFieldBonus: 62,
        nonPreferredPenalty: 32,
        mismatchPenalty: 165,
        strictMatch: true
      },
      {
        name: "단백질/신약개발/약물전달",
        triggers: ["단백질", "신약개발", "약물전달", "바이오의약", "protein", "drug discovery", "drug delivery", "therapeutic", "biologics"],
        preferredUnits: ["biology", "cbe", "bioeng", "chemistry"],
        secondaryUnits: ["bcs", "gsai"],
        tags: ["바이오/의생명/약물전달", "생명과학/세포/분자/질병", "화학/촉매/유기합성/고분자"],
        terms: ["protein", "단백질", "protein engineering", "drug discovery", "신약개발", "drug delivery", "약물전달", "therapeutic", "biologics", "vaccine", "peptide", "medicinal chemistry"],
        preferredBonus: 94,
        secondaryBonus: 18,
        tagBonus: 66,
        termBonus: 72,
        exactFieldBonus: 64,
        nonPreferredPenalty: 30,
        mismatchPenalty: 160,
        strictMatch: true
      },
      {
        name: "세포/분자생물학",
        triggers: ["세포생물학", "세포 생물학", "분자생물학", "분자 생물학", "면역", "질병 기전", "cell biology", "molecular biology", "immunology"],
        preferredUnits: ["biology", "bioeng", "cbe"],
        secondaryUnits: ["bcs", "chemistry"],
        tags: ["생명과학/세포/분자/질병", "바이오/의생명/약물전달"],
        terms: ["cell biology", "세포생물학", "molecular biology", "분자생물학", "cell signaling", "immunology", "면역", "human disease", "질병", "cancer biology", "rna biology", "gene regulation", "metabolism"],
        preferredBonus: 98,
        secondaryBonus: 16,
        tagBonus: 68,
        termBonus: 74,
        exactFieldBonus: 66,
        nonPreferredPenalty: 32,
        mismatchPenalty: 170,
        strictMatch: true
      },
      {
        name: "의료영상/디지털헬스",
        triggers: ["의료영상", "의료 영상", "헬스케어 ai", "디지털 헬스", "medical imaging", "mri", "fmri", "biomedical imaging", "healthcare ai"],
        preferredUnits: ["bioeng", "ee", "bcs", "cs", "gsai"],
        secondaryUnits: ["me", "sse", "biology"],
        tags: ["센서/계측/이미징/웨어러블", "뇌/신경/인지/BCI", "AI/머신러닝/데이터사이언스", "HCI/UX/ARVR/디지털헬스"],
        terms: ["medical imaging", "의료영상", "mri", "fmri", "biomedical imaging", "imaging biomarker", "brain imaging", "뇌영상", "healthcare ai", "digital health", "biomedical optics", "endoscopic imaging", "ultrasound", "computed tomography"],
        preferredBonus: 96,
        secondaryBonus: 20,
        tagBonus: 54,
        termBonus: 78,
        exactFieldBonus: 72,
        nonPreferredPenalty: 28,
        mismatchPenalty: 170,
        strictMatch: true
      },
      {
        name: "마이크로유체/랩온어칩",
        triggers: ["마이크로유체", "랩온어칩", "랩 온어 칩", "바이오칩", "진단기기", "microfluidics", "lab-on-a-chip", "lab on a chip", "biochip"],
        preferredUnits: ["bioeng", "cbe", "me", "chemistry"],
        secondaryUnits: ["biology", "ee", "mse"],
        tags: ["센서/계측/이미징/웨어러블", "바이오/의생명/약물전달", "재료/나노/표면/분석"],
        terms: ["microfluidics", "마이크로유체", "lab-on-a-chip", "lab on a chip", "랩온어칩", "biochip", "바이오칩", "microfluidic", "droplet", "micro/nano fluid", "diagnostic", "진단", "biosensing", "바이오센싱"],
        preferredBonus: 104,
        secondaryBonus: 16,
        tagBonus: 50,
        termBonus: 80,
        exactFieldBonus: 74,
        nonPreferredPenalty: 32,
        mismatchPenalty: 185,
        strictMatch: true
      },
      {
        name: "항공우주/추진/위성",
        triggers: ["항공우주", "위성", "추진", "로켓", "열유체", "aerospace", "satellite", "propulsion", "rocket", "spacecraft", "uav"],
        preferredUnits: ["ae"],
        secondaryUnits: ["me", "ee", "cs"],
        tags: ["항공우주/위성/추진/열유체"],
        terms: ["aerospace", "spacecraft", "satellite", "propulsion", "rocket", "combustion", "uav", "aircraft", "thermal fluid", "hypersonic", "항공우주", "위성", "추진", "로켓", "열유체"],
        preferredBonus: 100,
        secondaryBonus: 16,
        tagBonus: 76,
        termBonus: 68,
        exactFieldBonus: 60,
        nonPreferredPenalty: 34,
        mismatchPenalty: 165,
        strictMatch: true
      },
      {
        name: "제어/최적화",
        triggers: ["제어이론", "제어", "최적화", "강화학습 기반 제어", "control theory", "optimal control", "optimization", "reinforcement learning control"],
        preferredUnits: ["ee", "me", "ae", "cs"],
        secondaryUnits: ["gsai", "sse", "bioeng"],
        tags: ["로봇/제어/자율주행/모빌리티", "AI/머신러닝/데이터사이언스", "전산이론/알고리즘/그래프"],
        terms: ["control", "제어", "control theory", "robust control", "optimal control", "optimization", "최적화", "guidance", "trajectory optimization", "reinforcement learning", "강화학습", "decision making", "mpc", "model predictive control"],
        preferredBonus: 90,
        secondaryBonus: 18,
        tagBonus: 48,
        termBonus: 72,
        exactFieldBonus: 66,
        nonPreferredPenalty: 26,
        mismatchPenalty: 150,
        strictMatch: true
      },
      {
        name: "MEMS/NEMS/센서",
        triggers: ["mems", "nems", "마이크로시스템", "센서", "계측", "smart sensor", "microsystem", "micro/nanofabrication"],
        preferredUnits: ["me", "ee", "sse", "bioeng"],
        secondaryUnits: ["mse", "cbe", "physics"],
        tags: ["센서/계측/이미징/웨어러블", "반도체 소자/공정/박막", "재료/나노/표면/분석"],
        terms: ["mems", "nems", "microsystem", "micro/nanofabrication", "smart sensor", "sensor", "sensors", "계측", "마이크로시스템", "wearable", "flexible", "instrumentation", "bio/medical microsystems"],
        preferredBonus: 94,
        secondaryBonus: 18,
        tagBonus: 58,
        termBonus: 74,
        exactFieldBonus: 66,
        nonPreferredPenalty: 26,
        mismatchPenalty: 160,
        strictMatch: true
      },
      {
        name: "패키징/이종집적",
        triggers: ["패키징", "칩렛", "3d ic", "3d 집적", "이종집적", "인터커넥트", "packaging", "chiplet", "heterogeneous integration", "interconnect"],
        preferredUnits: ["sse", "ee", "mse"],
        secondaryUnits: ["me", "physics"],
        tags: ["패키징/인터커넥트/신뢰성", "반도체 소자/공정/박막"],
        terms: ["packaging", "패키징", "chiplet", "칩렛", "3d ic", "3d integration", "heterogeneous integration", "이종집적", "interconnect", "인터커넥트", "sip", "pcb", "signal integrity", "emi", "emc", "advanced packaging"],
        preferredBonus: 110,
        secondaryBonus: 18,
        tagBonus: 82,
        termBonus: 78,
        exactFieldBonus: 72,
        nonPreferredPenalty: 30,
        mismatchPenalty: 170,
        strictMatch: true
      }
      ,
      {
        name: "디스플레이",
        triggers: ["디스플레이", "display", "oled", "micro led", "micro-led", "마이크로 led", "플렉서블 디스플레이", "발광소자", "organic display"],
        preferredUnits: ["ee", "mse", "sse"],
        secondaryUnits: ["physics", "cbe", "me"],
        tags: ["디스플레이/포토닉스/광전자", "반도체 소자/공정/박막", "재료/나노/표면/분석"],
        terms: ["display", "organic display", "oled", "micro led", "micro-led", "led", "light emitting", "emissive", "flexible display", "stretchable display", "oxide tft", "tft", "디스플레이", "발광소자", "플렉서블 디스플레이", "마이크로 led", "유기 디스플레이"],
        preferredBonus: 110,
        secondaryBonus: 18,
        tagBonus: 62,
        termBonus: 82,
        exactFieldBonus: 78,
        nonPreferredPenalty: 32,
        mismatchPenalty: 175,
        strictMatch: true
      },
      {
        name: "포토닉스/광전소자",
        triggers: ["포토닉스", "광전소자", "광전자", "나노광학", "레이저", "광검출기", "photonics", "optoelectronic", "photodetector", "nanophotonics", "laser"],
        preferredUnits: ["ee", "physics", "quantum", "mse", "sse"],
        secondaryUnits: ["me", "cbe"],
        tags: ["디스플레이/포토닉스/광전자", "양자/물리/광학/천문", "센서/계측/이미징/웨어러블"],
        terms: ["photonics", "nanophotonics", "silicon photonics", "optoelectronic", "optoelectronics", "photodetector", "laser", "optical", "metasurface", "plasmonics", "quantum optics", "광전", "광전자", "광전소자", "포토닉스", "나노광학", "레이저", "광검출기"],
        preferredBonus: 106,
        secondaryBonus: 18,
        tagBonus: 62,
        termBonus: 78,
        exactFieldBonus: 72,
        nonPreferredPenalty: 28,
        mismatchPenalty: 165,
        strictMatch: true
      },
      {
        name: "수소/연료전지/에너지변환",
        triggers: ["수소", "연료전지", "수전해", "water electrolysis", "fuel cell", "hydrogen", "energy conversion", "전기화학 에너지 변환"],
        preferredUnits: ["cbe", "mse", "chemistry", "me"],
        secondaryUnits: ["ee", "sse"],
        tags: ["배터리/에너지/수소/전기화학", "화학/촉매/유기합성/고분자", "재료/나노/표면/분석"],
        terms: ["fuel cell", "hydrogen", "water electrolysis", "electrocatalysis", "electrochemical", "energy conversion", "catalyst", "co2 reduction", "수소", "연료전지", "수전해", "전기화학", "에너지 변환", "촉매"],
        preferredBonus: 100,
        secondaryBonus: 16,
        tagBonus: 64,
        termBonus: 78,
        exactFieldBonus: 72,
        nonPreferredPenalty: 28,
        mismatchPenalty: 165,
        strictMatch: true
      },
      {
        name: "고분자/유기소재/소프트머터",
        triggers: ["고분자", "유기소재", "소프트머터", "soft matter", "polymer", "organic material", "elastomer", "smart polymer"],
        preferredUnits: ["cbe", "mse", "chemistry"],
        secondaryUnits: ["bioeng", "me", "ee"],
        tags: ["화학/촉매/유기합성/고분자", "재료/나노/표면/분석"],
        terms: ["polymer", "polymers", "고분자", "soft matter", "소프트머터", "organic material", "유기소재", "elastomer", "hydrogel", "self-assembly", "block copolymer", "smart polymer", "biopolymer", "printed organic electronics"],
        preferredBonus: 108,
        secondaryBonus: 18,
        tagBonus: 64,
        termBonus: 82,
        exactFieldBonus: 78,
        nonPreferredPenalty: 30,
        mismatchPenalty: 170,
        strictMatch: true
      },
      {
        name: "환경/기후/지속가능에너지",
        triggers: ["환경", "기후", "탄소중립", "지속가능", "지속가능 에너지", "environment", "climate", "carbon neutral", "sustainable", "sustainability"],
        preferredUnits: ["cbe", "me", "mse", "chemistry"],
        secondaryUnits: ["ee", "ae", "biology"],
        tags: ["배터리/에너지/수소/전기화학", "화학/촉매/유기합성/고분자", "재료/나노/표면/분석"],
        terms: ["environment", "환경", "climate", "기후", "carbon neutral", "탄소중립", "sustainability", "sustainable", "renewable", "water treatment", "separation", "membrane", "sorbent", "co2", "carbon capture", "wastewater", "air quality", "green", "지속가능", "분리막", "흡착", "물 처리", "재생에너지"],
        preferredBonus: 100,
        secondaryBonus: 16,
        tagBonus: 46,
        termBonus: 78,
        exactFieldBonus: 72,
        nonPreferredPenalty: 28,
        mismatchPenalty: 160,
        strictMatch: true
      }


    ];

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function normalize(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[·∙ㆍ]/g, " ")
        .replace(/[^0-9a-z가-힣+#./-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function tokenize(text) {
      const normalized = normalize(text);
      const raw = normalized.split(" ").filter(Boolean);
      const tokens = new Set();
      raw.forEach((token) => {
        if (token.length >= 2) tokens.add(token);
      });
      Object.entries(extraSynonyms).forEach(([key, values]) => {
        if (normalized.includes(normalize(key))) {
          tokens.add(normalize(key));
          values.forEach((value) => tokens.add(normalize(value)));
        }
      });
      return Array.from(tokens).filter((token) => token.length >= 2);
    }

    function tokenWeight(token) {
      if (weakTokens.has(token)) return 0;
      if (mediumTokens.has(token)) return 0.45;
      if (/^[a-z]$/.test(token)) return 0;
      if (/^\d+$/.test(token)) return 0.15;
      if (token.length <= 2 && /^[가-힣]+$/.test(token)) return 0.55;
      return 1;
    }

    function selectedGuideText() {
      return [
        document.getElementById("areaSelect").value,
        document.getElementById("goalSelect").value,
      ].filter(Boolean).join(" ");
    }

    function combinedQuery(rawQuery) {
      return [selectedGuideText(), rawQuery || "", state.keyword || "", state.selectedTag || ""].filter(Boolean).join(" ");
    }

    function hasAny(text, needles) {
      const normalized = normalize(text);
      return needles.some((needle) => normalized.includes(normalize(needle)));
    }

    function containsToken(text, token) {
      if (!token) return false;
      return text.includes(token);
    }

    function getActiveDomains(fullQuery) {
      const normalizedQuery = normalize(fullQuery);
      const active = domainRules.filter((rule) => rule.triggers.some((trigger) => normalizedQuery.includes(normalize(trigger))));
      // 더 구체적인 질의가 들어오면 넓은 상위 카테고리 때문에 엉뚱한 후보가 올라오지 않도록 정리한다.
      const hasRule = (name) => active.some((rule) => rule.name === name);
      let refined = active;

      const hasBioDevice = hasRule("생체 소자/바이오센서");
      if (hasBioDevice && !normalizedQuery.includes("반도체")) {
        refined = refined.filter((rule) => rule.name !== "반도체 소자/공정");
      }

      if (hasRule("자연어처리/LLM") || hasRule("AI/컴퓨터비전") || hasRule("컴퓨터그래픽스/비주얼컴퓨팅") || hasRule("데이터베이스/빅데이터")) {
        refined = refined.filter((rule) => rule.name !== "AI/머신러닝");
      }
      if (hasRule("의료영상/디지털헬스") && !hasAny(normalizedQuery, ["hci", "ux", "ar", "vr", "인터랙션"])) {
        refined = refined.filter((rule) => rule.name !== "HCI/AR·VR/디지털헬스" && rule.name !== "생체 소자/바이오센서");
      }
      if (hasRule("마이크로유체/랩온어칩")) {
        refined = refined.filter((rule) => rule.name !== "생체 소자/바이오센서" && rule.name !== "바이오/뇌공학");
      }
      if (hasRule("제어/최적화") && !hasAny(normalizedQuery, ["로봇", "자율주행", "slam", "drone", "드론", "robot"])) {
        refined = refined.filter((rule) => rule.name !== "로봇/제어/자율주행");
      }
      if (hasRule("세포/분자생물학") && !hasAny(normalizedQuery, ["유전체", "오믹스", "bioinformatics", "genomics"])) {
        refined = refined.filter((rule) => rule.name !== "유전체/계산생물학");
      }
      if (hasRule("화학/촉매/유기합성") && !hasAny(normalizedQuery, ["소재", "재료", "나노", "배터리", "에너지"])) {
        refined = refined.filter((rule) => rule.name !== "나노소재/신소재" && rule.name !== "배터리/에너지");
      }
      if (hasRule("패키징/이종집적")) {
        refined = refined.filter((rule) => rule.name !== "반도체 소자/공정" || hasAny(normalizedQuery, ["소자", "공정", "트랜지스터", "산화막"]));
      }

      if (hasRule("디스플레이") && !hasAny(normalizedQuery, ["포토닉스", "광전", "광검출", "laser", "레이저", "photonics", "photodetector", "nanophotonics"])) {
        refined = refined.filter((rule) => rule.name !== "디스플레이/포토닉스/광전소자");
      }
      if (hasRule("포토닉스/광전소자") && !hasAny(normalizedQuery, ["디스플레이", "display", "oled", "micro led", "마이크로 led"])) {
        refined = refined.filter((rule) => rule.name !== "디스플레이/포토닉스/광전소자");
      }
      if (hasRule("수소/연료전지/에너지변환") && !hasAny(normalizedQuery, ["배터리", "battery", "리튬", "리튬전지", "이차전지", "전고체전지", "전고체"])) {
        refined = refined.filter((rule) => rule.name !== "배터리/에너지");
      }
      if (hasRule("고분자/유기소재/소프트머터") && !hasAny(normalizedQuery, ["촉매", "유기합성", "반응", "catalysis", "synthesis"])) {
        refined = refined.filter((rule) => rule.name !== "화학/촉매/유기합성");
      }
      return refined;
    }

    // 질문 분야가 교수님의 전체 연구 설명에서 어느 정도 중심을 차지하는지 계산한다.
    // 같은 키워드가 한 번이라도 있는 후보를 모두 동일하게 보지 않고,
    // field, summary, keyword, intent tag의 직접성 및 잡음 비율을 함께 반영한다.
    function countDistinctHits(text, terms) {
      const normalizedText = normalize(text);
      const hits = new Set();
      terms.forEach((term) => {
        const normalizedTerm = normalize(term);
        if (normalizedTerm && normalizedText.includes(normalizedTerm)) hits.add(normalizedTerm);
      });
      return hits;
    }

    function getDirectTermsForDomain(domain, fullQuery) {
      const query = normalize(fullQuery);
      const baseTerms = Array.isArray(domain.terms) ? domain.terms : [];
      const direct = {
        "반도체 소자/공정": ["semiconductor process", "semiconductor fabrication", "semiconductor device", "thin film", "oxide", "transistor", "mosfet", "tft", "etch", "deposition", "lithography", "nanofabrication", "memory device", "반도체 공정", "반도체 소자", "산화막", "박막", "트랜지스터", "식각", "증착", "리소그래피", "메모리", "소자 물리"],
        "AI 반도체/회로설계": ["vlsi", "integrated circuit", "circuit design", "soc", "asic", "fpga", "mixed-signal", "analog", "digital circuit", "hardware accelerator", "ai hardware", "computer architecture", "집적회로", "회로설계", "하드웨어 가속기", "컴퓨터 구조"],
        "디스플레이": ["display", "organic display", "oled", "micro led", "micro-led", "light emitting", "emissive", "oxide tft", "tft", "flexible display", "stretchable display", "디스플레이", "발광소자", "마이크로 led", "유기 디스플레이", "플렉서블 디스플레이"],
        "포토닉스/광전소자": ["photonics", "nanophotonics", "silicon photonics", "optoelectronic", "optoelectronics", "photodetector", "laser", "metasurface", "plasmonics", "quantum optics", "광전", "광전자", "광전소자", "포토닉스", "나노광학", "레이저", "광검출기"],
        "배터리/에너지": hasAny(query, ["배터리", "battery", "리튬", "lithium", "전지", "전고체"])
          ? ["li battery", "lithium battery", "lithium metal", "solid-state li", "solid state li", "solid-state battery", "solid state battery", "all-solid-state", "aqueous battery", "batteries", "battery", "electrolyte", "electrolytes", "eletrolytes", "electrode", "eletrode", "binder", "binders", "interfacial analysis", "이차전지", "리튬전지", "리튬금속", "전고체전지", "수계 배터리", "배터리", "전극", "전해질", "바인더", "계면"]
          : ["fuel cell", "fuel cells", "hydrogen", "water electrolysis", "electrocatalysis", "energy conversion", "energy storage", "연료전지", "수소", "수전해", "전기화학", "에너지 변환", "에너지 저장"],
        "수소/연료전지/에너지변환": ["fuel cell", "fuel cells", "hydrogen", "water electrolysis", "electrocatalysis", "co2 reduction", "energy conversion", "reaction engineering", "수소", "연료전지", "수전해", "전기화학", "에너지 변환", "촉매", "반응공학"],
        "나노소재/신소재": ["materials", "nanomaterial", "nanomaterials", "2d materials", "graphene", "surface", "interface", "thin film", "synthesis", "characterization", "재료", "나노소재", "신소재", "2d 소재", "그래핀", "표면", "계면", "합성", "분석"],
        "고분자/유기소재/소프트머터": ["polymer", "polymers", "soft matter", "organic material", "elastomer", "hydrogel", "self-assembly", "block copolymer", "smart polymer", "biopolymer", "printed organic electronics", "고분자", "소프트머터", "유기소재", "하이드로젤", "자기조립"],
        "촉매/화학공정": ["catalysis", "catalyst", "organic synthesis", "organometallic", "reaction engineering", "chemical process", "heterogeneous catalysis", "촉매", "유기합성", "유기금속", "반응공학", "화학공정"],
        "화학/촉매/유기합성": ["catalysis", "catalyst", "organic synthesis", "organometallic", "reaction", "organic chemistry", "polymer", "촉매", "유기합성", "유기금속", "유기화학", "고분자"],
        "생체 소자/바이오센서": ["biosensor", "bio sensor", "bioelectronics", "bioelectronic", "bio-integrated", "bio integrated", "wearable", "implantable", "neural electrode", "biointerface", "biomedical device", "생체전자", "바이오센서", "바이오전자", "웨어러블", "임플란터블", "신경 전극", "의료기기"],
        "실험 뇌과학/신경공학": ["neuroscience", "synapse", "neural circuit", "electrophysiology", "neuroimaging", "mri", "fmri", "brain imaging", "neural electrode", "neuroprosthetics", "bci", "brain-computer", "behavior", "신경과학", "시냅스", "신경회로", "전기생리", "뇌영상", "신경 전극", "신경 보철", "뇌-컴퓨터", "행동"],
        "의료영상/디지털헬스": ["medical imaging", "mri", "fmri", "biomedical imaging", "bioimaging", "neuroimaging", "healthcare ai", "digital health", "clinical", "ultrasound", "의료영상", "뇌영상", "디지털 헬스", "헬스케어", "임상"],
        "AI/머신러닝": ["machine learning", "deep learning", "artificial intelligence", "generative ai", "reinforcement learning", "data science", "foundation model", "인공지능", "머신러닝", "딥러닝", "생성형 ai", "강화학습"],
        "AI/컴퓨터비전": ["computer vision", "image understanding", "visual recognition", "image recognition", "object detection", "segmentation", "video understanding", "multimodal", "computational imaging", "3d vision", "컴퓨터비전", "컴퓨터 비전", "영상인식", "객체검출", "이미지", "영상"],
        "자연어처리/LLM": ["natural language processing", "language model", "large language model", "llm", "machine reading", "knowledge-intensive nlp", "text", "nlp", "자연어처리", "언어모델", "생성형 ai"],
        "데이터베이스/빅데이터": ["database", "data mining", "big data", "data engineering", "recommender systems", "graph learning", "데이터베이스", "데이터마이닝", "빅데이터", "추천시스템"],
        "컴퓨터시스템/운영체제": ["operating system", "distributed system", "storage", "file system", "cloud", "computer system", "networked system", "performance analysis", "운영체제", "분산시스템", "스토리지", "파일 시스템", "클라우드"],
        "정보보안/암호": ["security", "system security", "network security", "cryptography", "applied cryptography", "privacy", "secure", "trusted", "정보보안", "시스템 보안", "네트워크 보안", "암호", "프라이버시"],
        "통신/RF/무선": ["wireless", "communication", "communications", "rf", "antenna", "information theory", "coding", "6g", "통신", "무선", "안테나", "정보이론"],
        "전력전자/전력변환": ["power electronics", "power converter", "inverter", "converter", "power integrity", "power management", "전력전자", "전력변환", "인버터", "컨버터", "전원회로"],
        "로봇/제어/자율주행": ["robot", "robotics", "autonomous", "slam", "navigation", "drone", "legged", "manipulation", "motion planning", "vehicle", "mobility", "로봇", "자율주행", "제어", "드론", "모빌리티"],
        "제어/최적화": ["control", "optimization", "optimal control", "robust control", "mpc", "trajectory optimization", "decision making", "dynamics", "reinforcement learning", "제어", "최적화", "동역학", "강화학습 제어"],
        "HCI/AR·VR/디지털헬스": ["human-computer interaction", "interactive", "ux", "augmented reality", "virtual reality", "ar", "vr", "hci", "digital health", "인터랙션", "사용자 경험", "증강현실", "가상현실"],
        "컴퓨터그래픽스/비주얼컴퓨팅": ["computer graphics", "visual computing", "rendering", "3d vision", "3d/4d", "geometry processing", "data visualization", "컴퓨터그래픽스", "비주얼 컴퓨팅", "렌더링", "3d 비전"],
        "양자컴퓨팅/양자정보": ["quantum computing", "quantum computer", "quantum information", "quantum algorithm", "quantum communication", "quantum simulation", "superconducting quantum", "rydberg", "neutral atom", "양자컴퓨팅", "양자정보", "양자알고리즘", "초전도 양자", "리드버그"],
        "항공우주/추진/위성": ["aerospace", "spacecraft", "satellite", "propulsion", "rocket", "combustion", "uav", "fluid", "항공우주", "위성", "추진", "로켓", "유체"],
        "항공우주/추진": ["aerospace", "spacecraft", "satellite", "propulsion", "rocket", "combustion", "uav", "fluid", "항공우주", "위성", "추진", "로켓", "유체"],
        "환경/기후/지속가능에너지": ["environment", "climate", "carbon neutral", "sustainability", "sustainable", "renewable", "water treatment", "separation", "membrane", "co2", "carbon capture", "wastewater", "air quality", "환경", "기후", "탄소중립", "지속가능", "물 처리", "분리막"],
      };
      return Array.from(new Set([...(direct[domain.name] || []), ...baseTerms]));
    }

    function fieldSegmentCount(professor) {
      const text = (professor.fields || []).join("; ");
      const segments = text.split(/[;,/|]+/).map((item) => item.trim()).filter((item) => item.length >= 2);
      return Math.max(1, segments.length);
    }

    function genericDomainFocusAdjustment(domain, professor, fullQuery) {
      const directTerms = getDirectTermsForDomain(domain, fullQuery);
      const fieldText = normalize((professor.fields || []).join(" "));
      const summaryText = normalize([professor.summary, ...(professor.summaries || [])].join(" "));
      const keywordText = normalize((professor.keywords || []).join(" "));
      const fieldHits = countDistinctHits(fieldText, directTerms);
      const summaryHits = countDistinctHits(summaryText, directTerms);
      const keywordHits = countDistinctHits(keywordText, directTerms);
      const fieldHitCount = fieldHits.size;
      const summaryHitCount = summaryHits.size;
      const keywordHitCount = keywordHits.size;
      const segments = fieldSegmentCount(professor);
      const tagList = professor.intentTags || [];
      const domainTagHits = tagList.filter((tag) => domain.tags.includes(tag)).length;
      const unrelatedTags = Math.max(0, tagList.length - domainTagHits);
      const focusNumerator = fieldHitCount * 4 + summaryHitCount * 2 + Math.min(keywordHitCount, 6) * 0.5 + domainTagHits * 1.5;
      const breadthDenominator = Math.max(3, segments + tagList.length * 1.2 + (professor.unitCodes || []).length);
      const focusRatio = focusNumerator / breadthDenominator;
      let adjustment = 0;

      if (fieldHitCount >= 4) adjustment += 150;
      else if (fieldHitCount === 3) adjustment += 115;
      else if (fieldHitCount === 2) adjustment += 78;
      else if (fieldHitCount === 1) adjustment += 34;
      else adjustment -= domain.strictMatch ? 135 : 62;

      if (summaryHitCount >= 4) adjustment += 70;
      else if (summaryHitCount >= 2) adjustment += 44;
      else if (summaryHitCount === 1) adjustment += 18;

      if (focusRatio >= 1.2) adjustment += 120;
      else if (focusRatio >= 0.85) adjustment += 82;
      else if (focusRatio >= 0.55) adjustment += 40;
      else if (focusRatio < 0.25) adjustment -= 90;

      adjustment -= Math.min(unrelatedTags * 13, 104);
      if ((professor.unitCodes || []).length >= 3 && !domain.name.includes("의료영상") && !domain.name.includes("양자")) {
        adjustment -= Math.min(((professor.unitCodes || []).length - 2) * 18, 54);
      }
      return adjustment;
    }

    function domainAlignment(professor, domain) {
      const unitCodes = professor.unitCodes || [];
      const tagList = professor.intentTags || [];
      const fieldText = normalize((professor.fields || []).join(" "));
      const summaryText = normalize([professor.summary, ...(professor.summaries || [])].join(" "));
      const keywordText = normalize((professor.keywords || []).join(" "));
      const combinedText = `${fieldText} ${summaryText} ${keywordText}`;
      const preferredUnitHit = unitCodes.some((code) => domain.preferredUnits.includes(code));
      const secondaryUnitHit = unitCodes.some((code) => domain.secondaryUnits.includes(code));
      const tagHit = domain.tags.some((tag) => tagList.includes(tag));
      const termHit = domain.terms.some((term) => containsToken(combinedText, normalize(term)));
      const fieldTermHit = domain.terms.some((term) => containsToken(fieldText, normalize(term)));
      const summaryTermHit = domain.terms.some((term) => containsToken(summaryText, normalize(term)));
      return { preferredUnitHit, secondaryUnitHit, tagHit, termHit, fieldTermHit, summaryTermHit };
    }


    // 최종 베타 테스트 보정: 단순 키워드 포함 여부가 아니라
    // field에 직접 키워드가 얼마나 중심적으로 들어있는지, 그리고 다른 분야 잡음이 얼마나 큰지를 함께 본다.
    function countHitsFromList(text, terms) {
      return countDistinctHits(text, terms).size;
    }

    function finalBetaDomainAdjustment(domain, professor, fullQuery, hit) {
      const query = normalize(fullQuery);
      const fieldText = normalize((professor.fields || []).join(" "));
      const summaryText = normalize([professor.summary, ...(professor.summaries || [])].join(" "));
      const tagText = normalize((professor.intentTags || []).join(" "));
      const allText = `${fieldText} ${summaryText} ${tagText}`;
      let adjustment = 0;
      const hasField = (terms) => hasAny(fieldText, terms);
      const hasAll = (terms) => hasAny(allText, terms);
      const hitCount = (terms) => countHitsFromList(fieldText, terms);
      const veryBroad = (professor.intentTags || []).length >= 6 || fieldSegmentCount(professor) >= 10 || (professor.unitCodes || []).length >= 3;

      if (domain.strictMatch && !hit.fieldTermHit && !hit.summaryTermHit) adjustment -= 420;

      if (domain.name === "배터리/에너지") {
        const batteryTerms = ["li battery", "lithium battery", "li-ion", "lithium", "battery", "batteries", "aqueous battery", "solid-state battery", "solid state battery", "electrolyte", "electrolytes", "eletrolytes", "electrode", "eletrode", "binder", "binders", "interfacial analysis", "리튬", "배터리", "전지", "전고체", "전해질", "전극", "바인더", "계면"];
        const batteryCount = hitCount(batteryTerms);
        const wantsBattery = hasAny(query, ["배터리", "battery", "리튬", "리튬전지", "이차전지", "전고체", "전고체전지", "lithium"]);
        const fuelOnly = hasField(["fuel cell", "fuel cells", "hydrogen", "water electrolysis", "수소", "연료전지", "수전해"]) && batteryCount === 0;
        const solarWearableNoise = hasField(["solar cell", "wearable electronics", "robot", "robotics", "mobile manipulation", "decision making", "photovoltaic", "태양전지", "로봇", "웨어러블"]);
        if (wantsBattery) {
          if (batteryCount >= 4) adjustment += 260;
          else if (batteryCount >= 2) adjustment += 170;
          else if (batteryCount === 1) adjustment += 65;
          else adjustment -= 420;
          if (hasField(["electrolyte", "electrolytes", "eletrolytes", "electrode", "eletrode", "binder", "binders", "interfacial analysis", "전해질", "전극", "바인더", "계면"])) adjustment += 110;
          if (hasField(["li battery"]) && hasField(["aqueous battery"])) adjustment += 205;
          if (fuelOnly) adjustment -= 360;
          if (solarWearableNoise && batteryCount <= 2) adjustment -= 260;
          if (veryBroad && batteryCount <= 2) adjustment -= 170;
        }
      }

      if (domain.name === "수소/연료전지/에너지변환") {
        const fuelTerms = ["fuel cell", "fuel cells", "hydrogen", "water electrolysis", "electrolysis", "electrocatalysis", "energy conversion", "co2 conversion", "co2 reduction", "수소", "연료전지", "수전해", "전기분해", "전기촉매", "에너지 변환"];
        const fuelCount = hitCount(fuelTerms);
        const batteryTerms = ["li battery", "lithium", "battery", "batteries", "electrolyte", "electrode", "binder", "배터리", "전지", "리튬"];
        const batteryCount = hitCount(batteryTerms);
        if (fuelCount >= 3) adjustment += 280;
        else if (fuelCount >= 2) adjustment += 190;
        else if (fuelCount === 1) adjustment += 70;
        else adjustment -= 420;
        if (batteryCount >= 2 && fuelCount <= 1) adjustment -= 600;
        if (hasField(["wearable electronics", "solar cells", "mobile manipulation", "robot", "robotics", "decision making"])) adjustment -= 1100;
        if (veryBroad && fuelCount <= 1) adjustment -= 150;
      }

      if (domain.name === "생체 소자/바이오센서") {
        const directBioDevice = ["biosensor", "bio sensor", "bioelectronics", "bioelectronic", "bio-integrated", "bio integrated", "organs-on-chips", "organ-on-chip", "biomedical device", "biointerface", "neural electrode", "implantable", "생체전자", "바이오센서", "바이오전자", "임플란터블", "의료기기", "신경 전극"];
        const genericWearable = ["wearable", "flexible", "smart sensor", "hydrogel mems", "mems/nems", "웨어러블", "플렉서블"];
        const directCount = hitCount(directBioDevice);
        if (directCount >= 2) adjustment += 250;
        else if (directCount === 1) adjustment += 120;
        else if (hasField(genericWearable)) adjustment -= 180;
        else adjustment -= 340;
        if (veryBroad && directCount <= 1) adjustment -= 120;
      }

      if (domain.name === "의료영상/디지털헬스") {
        const imagingTerms = ["medical imaging", "biomedical imaging", "bioimaging", "neuroimaging", "mri", "fmri", "imaging biomarker", "endoscopic imaging", "confocal microscopy", "ultrasound", "의료영상", "자기공명영상", "뇌영상", "이미징 바이오마커"];
        const healthcareOnly = ["healthcare ai", "electronic health records", "clinical", "digital health", "헬스케어", "디지털 헬스", "임상"];
        const imagingCount = hitCount(imagingTerms);
        if (imagingCount >= 3) adjustment += 280;
        else if (imagingCount >= 1) adjustment += 150;
        else if (hasField(healthcareOnly)) adjustment -= hasAny(query, ["mri", "의료영상", "영상"]) ? 240 : 60;
        else adjustment -= 360;
        if (hasAny(query, ["mri", "의료영상", "영상"]) && !hasField(imagingTerms)) adjustment -= 220;
      }

      if (domain.name === "AI/컴퓨터비전") {
        const cvCore = ["computer vision", "image understanding", "visual recognition", "image recognition", "object detection", "segmentation", "video understanding", "3d vision", "3d/4d computer vision", "computational imaging", "robot vision", "컴퓨터비전", "컴퓨터 비전", "영상인식", "객체검출", "이미지 이해"];
        const cvCount = hitCount(cvCore);
        const genericAiOnly = hasField(["machine learning", "deep learning", "large language model", "natural language", "reinforcement learning", "ai systems"]) && cvCount === 0;
        if (cvCount >= 3) adjustment += 260;
        else if (cvCount >= 2) adjustment += 190;
        else if (cvCount === 1) adjustment += 100;
        else adjustment -= 380;
        if (genericAiOnly) adjustment -= 220;
        if (hasField(["computer vision, multi-modal", "3d/4d computer vision", "visual computing"])) adjustment += 120;
      }

      if (domain.name === "자연어처리/LLM") {
        const nlpCore = ["natural language processing", "language model", "large language model", "llm", "machine reading", "knowledge-intensive nlp", "nlp", "언어모델", "자연어처리"];
        const nlpCount = hitCount(nlpCore);
        const visionOnly = hasField(["computer vision", "3d vision", "autonomous driving", "robotics"]) && nlpCount === 0;
        if (nlpCount >= 3) adjustment += 240;
        else if (nlpCount >= 1) adjustment += 140;
        else adjustment -= 340;
        if (visionOnly) adjustment -= 220;
      }

      if (domain.name === "전력전자/전력변환") {
        const powerCore = ["power electronics", "power converter", "power converters", "inverter", "converter", "active power filter", "flexible ac transmission", "power integrity", "power management", "전력전자", "전력변환", "인버터", "컨버터", "전원회로"];
        const powerCount = hitCount(powerCore);
        if (powerCount >= 3) adjustment += 260;
        else if (powerCount >= 1) adjustment += 120;
        else adjustment -= 520;
        if (!hasField(powerCore) && hasAll(["photovoltaic", "thermal", "renewable energy", "semiconductor thermal"])) adjustment -= 420;
      }

      if (domain.name === "고분자/유기소재/소프트머터") {
        const polymerCore = ["block copolymer", "reactive polymer", "polymer self", "polymer", "polymers", "soft matter", "elastomer", "hydrogel", "self-assembly", "biopolymer", "organic materials", "ionotronics", "ionic conductors", "고분자", "소프트머터", "유기소재", "하이드로젤", "자기조립"];
        const polymerCount = hitCount(polymerCore);
        const batteryBinderOnly = hasField(["battery", "batteries", "electrolyte", "electrode binder", "solid-state li"]) && polymerCount <= 1;
        if (polymerCount >= 3) adjustment += 260;
        else if (polymerCount >= 2) adjustment += 170;
        else if (polymerCount === 1) adjustment += 70;
        else adjustment -= 360;
        if (batteryBinderOnly) adjustment -= 160;
      }

      if (domain.name === "화학/촉매/유기합성" || domain.name === "촉매/화학공정") {
        const catalysisCore = ["heterogeneous catalysis", "catalysis", "catalyst", "organometallic", "organic synthesis", "reaction engineering", "chemical process", "유기합성", "촉매", "유기금속", "반응공학", "화학공정"];
        const catalystCount = hitCount(catalysisCore);
        if (catalystCount >= 3) adjustment += 190;
        else if (catalystCount >= 1) adjustment += 90;
        else adjustment -= 260;
        if (hasField(["energy materials", "nanomaterials"]) && catalystCount <= 1) adjustment -= 90;
        if (hasAny(query, ["수소", "연료전지", "fuel cell", "hydrogen"])) {
          const h2Direct = hasField(["fuel cell", "fuel cells", "hydrogen", "water electrolysis", "electrolysis", "electrocatalysis", "co2 conversion", "co2 reduction", "energy conversion", "수소", "연료전지", "수전해", "전기촉매", "에너지 변환"]);
          if (!h2Direct) adjustment -= 900;
        }
      }

      if (domain.name === "컴퓨터시스템/운영체제") {
        const osCore = ["operating system", "운영체제", "file system", "파일 시스템", "storage", "스토리지", "distributed system", "분산시스템", "cloud", "computer system", "networked system", "performance analysis"];
        const osCount = hitCount(osCore);
        const securityOnly = hasField(["security", "cryptography", "시스템 보안", "네트워크 보안", "시큐어 컴퓨팅"]) && !hasAny(query, ["보안", "security", "암호"]);
        if (osCount >= 3) adjustment += 260;
        else if (osCount >= 1) adjustment += 120;
        else adjustment -= 360;
        if (securityOnly && osCount <= 1) adjustment -= 620;
        if (securityOnly && hasAny(query, ["운영체제", "operating system", "스토리지", "storage", "파일 시스템", "file system"])) adjustment -= 520;
      }

      if (domain.name === "로봇/제어/자율주행") {
        const robotCore = ["robot", "robotics", "autonomous", "slam", "navigation", "drone", "legged", "manipulation", "motion planning", "vehicle", "로봇", "자율주행", "드론", "모빌리티"];
        const robotCount = hitCount(robotCore);
        if (robotCount >= 3) adjustment += 210;
        else if (robotCount >= 1) adjustment += 100;
        else adjustment -= 260;
        if (hasField(["medical robotics"]) && hasAny(query, ["자율주행", "slam", "드론"])) adjustment -= 160;
      }

      if (domain.name === "환경/기후/지속가능에너지") {
        const envCore = ["environment", "environmental", "climate", "carbon neutral", "sustainability", "sustainable", "water treatment", "separation", "membrane", "sorbent", "co2", "carbon capture", "wastewater", "환경", "기후", "탄소중립", "지속가능", "물 처리", "분리막", "흡착"];
        const envCount = hitCount(envCore);
        const batteryEnergyOnly = hasField(["battery", "fuel cell", "solar cell", "energy storage"]) && envCount === 0;
        if (envCount >= 3) adjustment += 220;
        else if (envCount >= 1) adjustment += 100;
        else adjustment -= 300;
        if (batteryEnergyOnly) adjustment -= 240;
      }

      return adjustment;
    }

    function domainSpecificQualityAdjustment(domain, professor, fullQuery, hit) {
      const query = normalize(fullQuery);
      const fieldText = normalize((professor.fields || []).join(" "));
      const summaryText = normalize([professor.summary, ...(professor.summaries || [])].join(" "));
      const keywordText = normalize((professor.keywords || []).join(" "));
      const combinedText = `${fieldText} ${summaryText} ${keywordText}`;
      let adjustment = 0;

      if (domain.name === "배터리/에너지" && hasAny(query, ["배터리", "battery", "리튬", "lithium", "전지", "전고체"])) {
        const batteryDirectTerms = ["li battery", "lithium battery", "lithium metal", "solid-state li", "solid state li", "solid-state battery", "solid state battery", "aqueous battery", "batteries", "battery", "electrolyte", "electrolytes", "eletrolytes", "electrode", "eletrode", "binder", "binders", "interfacial analysis", "이차전지", "리튬전지", "전고체전지", "수계 배터리", "배터리", "전극", "전해질", "바인더", "계면"];
        const broadEnergyTerms = ["fuel cell", "fuel cells", "hydrogen", "hydrogen storage", "water electrolysis", "solar cell", "solar cells", "photovoltaic", "thermal energy", "energy conversion", "energy materials", "water treatment", "수소", "연료전지", "수전해", "태양전지", "물 처리", "에너지 변환"];
        const unrelatedProfileTerms = ["robot", "robotics", "manipulation", "decision making", "computer vision", "ai", "machine learning", "wearable electronics", "soft robotics", "mechanical metamaterials", "로봇", "인공지능", "웨어러블", "소프트 로봇"];
        const fieldDirect = countDistinctHits(fieldText, batteryDirectTerms);
        const summaryDirect = countDistinctHits(summaryText, batteryDirectTerms);
        const broadHits = countDistinctHits(fieldText + " " + summaryText, broadEnergyTerms);
        const unrelatedHits = countDistinctHits(fieldText + " " + summaryText + " " + keywordText, unrelatedProfileTerms);
        const directCount = fieldDirect.size + Math.min(summaryDirect.size, 4) * 0.5;
        const hasLiBatteryPair = fieldDirect.has("li battery") || fieldDirect.has("aqueous battery") || fieldDirect.has("solid-state li") || fieldDirect.has("solid state li");
        const electrolyteBatteryFocus = hasAny(fieldText, ["electrolyte", "electrolytes", "eletrolytes", "electrode", "eletrode", "binder", "binders", "interfacial analysis", "전해질", "전극", "바인더", "계면"]);
        const onlyBroadEnergy = broadHits.size > 0 && fieldDirect.size === 0;

        const hasMultipleNamedBatteryChemistries = fieldDirect.has("li battery") && fieldDirect.has("aqueous battery");
        if (hasMultipleNamedBatteryChemistries) adjustment += 930;
        else if (hasLiBatteryPair) adjustment += 700;
        else if (electrolyteBatteryFocus && fieldDirect.size >= 2) adjustment += 540;
        else if (fieldDirect.size >= 2) adjustment += 430;
        else if (fieldDirect.size === 1) adjustment += 210;
        else if (hasAny(fieldText, ["energy storage", "에너지 저장"])) adjustment -= 360;
        else adjustment -= 760;

        if (electrolyteBatteryFocus) adjustment += 160;
        if (onlyBroadEnergy) adjustment -= 560;
        adjustment -= Math.min(broadHits.size * 60, 240);
        adjustment -= Math.min(unrelatedHits.size * 80, 320);
        if ((professor.unitCodes || []).length > 1 && !(professor.unitCodes || []).includes("mse")) adjustment -= 95;
      }

      if (domain.name === "AI/컴퓨터비전") {
        const visionExact = hasAny(fieldText + " " + summaryText, ["computer vision", "image understanding", "robot vision", "computational imaging", "visual", "vision", "image recognition", "object detection", "segmentation", "영상", "이미지", "컴퓨터비전", "컴퓨터 비전"]);
        const genericAiOnly = hasAny(fieldText + " " + summaryText, ["machine learning", "deep learning", "ai", "data science", "인공지능", "머신러닝", "딥러닝"]) && !visionExact;
        if (visionExact) adjustment += 120;
        if (genericAiOnly) adjustment -= 135;
      }

      if (domain.name === "정보보안/암호") {
        const securityExact = hasAny(fieldText + " " + summaryText, ["security", "cryptography", "privacy", "secure", "시스템 보안", "네트워크 보안", "정보보안", "암호", "시큐어"]);
        if (securityExact) adjustment += 115;
        else adjustment -= 170;
      }

      if (domain.name === "실험 뇌과학/신경공학") {
        const wantsExperiment = hasAny(query, ["실험", "experimental", "측정", "장비"]);
        const trueExperimentalBrain = hasAny(fieldText + " " + summaryText, ["synapse", "mri", "fmri", "neuroimaging", "brain imaging", "electrophysiology", "neural electrode", "neuroprosthetics", "implant", "behavior", "neural circuit", "high-field mri", "neuro-engineering", "시냅스", "뇌영상", "신경 전극", "신경 보철", "신경회로", "전기생리", "행동", "측정", "뇌자극", "neural stimulation"]);
        const interfaceButNotPureSimulation = hasAny(fieldText + " " + summaryText, ["neural interface", "brain-computer", "brain-machine", "bci", "뇌-컴퓨터", "뇌-기계"]);
        const computationalEmphasis = hasAny(fieldText, ["computational neuroscience", "계산신경과학", "계산뇌과학", "simulation", "modeling", "theory", "모델링", "시뮬레이션", "인공지능", "ai"]);
        const computationalOnly = computationalEmphasis && !trueExperimentalBrain;
        if (trueExperimentalBrain) adjustment += wantsExperiment ? 260 : 120;
        else if (interfaceButNotPureSimulation) adjustment += wantsExperiment ? 70 : 60;
        if (wantsExperiment && computationalOnly) adjustment -= 620;
        else if (wantsExperiment && computationalEmphasis && !trueExperimentalBrain) adjustment -= 320;
        else if (wantsExperiment && computationalEmphasis) adjustment -= 140;
      }

      if (domain.name === "로봇/제어/자율주행") {
        const roboticsExact = hasAny(fieldText + " " + summaryText, ["robot", "robotics", "autonomous", "slam", "navigation", "drone", "control", "legged", "manipulation", "motion planning", "로봇", "자율주행", "드론", "제어"]);
        if (roboticsExact) adjustment += 95;
        else adjustment -= 150;
      }

      if (domain.name === "양자컴퓨팅/양자정보") {
        const computingExact = hasAny(fieldText + " " + summaryText, ["quantum computing", "quantum computer", "quantum information", "quantum algorithm", "quantum communication", "superconducting quantum", "rydberg", "neutral atom", "양자컴퓨팅", "양자 컴퓨팅", "양자정보", "양자 정보", "양자알고리즘", "초전도 양자", "리드버그"]);
        const onlyQuantumDeviceOrPhotonics = hasAny(fieldText, ["quantum photonics", "quantum optics", "quantum sensing", "nanoscale devices", "양자 광학", "양자 센싱", "양자소자"]) && !computingExact;
        if (computingExact) adjustment += 125;
        if (onlyQuantumDeviceOrPhotonics) adjustment -= 135;
      }

      if (domain.name === "자연어처리/LLM") {
        const exact = hasAny(fieldText + " " + summaryText, ["natural language processing", "language model", "large language model", "llm", "machine reading", "knowledge-intensive nlp", "text", "자연어처리", "언어모델", "생성형 ai"]);
        const genericOnly = hasAny(fieldText + " " + summaryText, ["machine learning", "deep learning", "computer vision", "reinforcement learning", "robotics", "ai"]) && !exact;
        if (exact) adjustment += 170;
        if (genericOnly) adjustment -= 160;
      }

      if (domain.name === "컴퓨터그래픽스/비주얼컴퓨팅") {
        const exact = hasAny(fieldText + " " + summaryText, ["computer graphics", "visual computing", "rendering", "3d vision", "3d/4d", "geometry processing", "data visualization", "컴퓨터 그래픽", "컴퓨터그래픽", "비주얼 컴퓨팅"]);
        const onlyBioOrChem = hasAny(fieldText, ["organic chemistry", "cell biology", "molecular biology", "drug delivery", "catalyst", "protein"]) && !exact;
        if (exact) adjustment += 140;
        if (onlyBioOrChem) adjustment -= 150;
      }

      if (domain.name === "컴퓨터시스템/운영체제") {
        const wantsOS = hasAny(query, ["운영체제", "operating system", "os", "스토리지", "파일 시스템", "storage", "file system"]);
        const storageClassMemoryOnly = hasAny(fieldText, ["storage class memory", "스토리지 클래스 메모리"]);
        const coreOS = hasAny(fieldText, ["operating system", "운영체제", "file system", "파일 시스템", "distributed system", "분산시스템", "cloud", "performance analysis"])
          || (hasAny(fieldText, ["storage", "스토리지"]) && !storageClassMemoryOnly && hasAny(fieldText, ["system", "시스템", "file", "파일", "distributed", "분산"]));
        const systemsExact = hasAny(fieldText, ["distributed system", "분산시스템", "cloud", "computer system", "networked system"]);
        const securityEmphasis = hasAny(fieldText, ["security", "cryptography", "시스템 보안", "네트워크 보안", "secure"]);
        const wantsSecurity = hasAny(query, ["보안", "security", "암호", "privacy", "secure"]);
        if (coreOS) adjustment += wantsOS ? 300 : 180;
        else if (wantsOS) adjustment -= 180;
        if (storageClassMemoryOnly && wantsOS) adjustment -= 420;
        const nonComputerStorage = hasAny(fieldText, ["thermal energy storage", "hydrogen systems", "energy storage", "liquid hydrogen systems"]) && !hasAny(fieldText, ["operating", "file", "distributed", "cloud", "computer", "networked", "컴퓨터", "운영", "파일", "분산"]);
        if (nonComputerStorage && wantsOS) adjustment -= 760;
        if (systemsExact) adjustment += 120;
        if (securityEmphasis && !wantsSecurity) adjustment -= 520;
        if (securityEmphasis && !coreOS && wantsOS && !wantsSecurity) adjustment -= 960;
        else if (securityEmphasis && !coreOS && !systemsExact) adjustment -= 220;
      }

      if (domain.name === "의료영상/디지털헬스") {
        const wantsImaging = hasAny(query, ["의료영상", "의료 영상", "mri", "fmri", "medical imaging", "biomedical imaging", "영상"]);
        const imagingCore = hasAny(fieldText + " " + summaryText, ["medical imaging", "mri", "fmri", "biomedical imaging", "bioimaging", "imaging biomarker", "brain imaging", "뇌영상", "의료영상", "biomedical optics", "endoscopic imaging", "ultrasound"]);
        const healthcareAiOnly = hasAny(fieldText + " " + summaryText, ["healthcare ai", "electronic health records", "clinical", "digital health", "헬스케어", "디지털 헬스"]) && !imagingCore;
        const broadHciOnly = hasAny(fieldText, ["human computer interaction", "augmented", "virtual reality", "hci", "ux"]) && !imagingCore;
        if (imagingCore) adjustment += wantsImaging ? 260 : 170;
        if (wantsImaging && healthcareAiOnly) adjustment -= 210;
        if (broadHciOnly) adjustment -= 220;
      }

      if (domain.name === "마이크로유체/랩온어칩") {
        const wantsMicrofluidics = hasAny(query, ["마이크로유체", "랩온어칩", "microfluidics", "lab-on-a-chip", "lab on a chip", "biochip", "바이오칩"]);
        const microfluidicsCore = hasAny(fieldText + " " + summaryText, ["microfluidics", "microfluidic", "lab-on-a-chip", "lab on a chip", "biochip", "droplet microfluidics", "micro/nano fluid", "마이크로유체", "랩온어칩", "미세유체"]);
        const diagnosticOnly = hasAny(fieldText + " " + summaryText, ["diagnostic", "진단", "molecular diagnostics", "분자진단"]) && !microfluidicsCore;
        if (microfluidicsCore) adjustment += 260;
        else if (wantsMicrofluidics) adjustment -= 280;
        if (diagnosticOnly) adjustment -= 120;
      }

      if (domain.name === "세포/분자생물학") {
        const wetBioExact = hasAny(fieldText + " " + summaryText, ["cell biology", "molecular biology", "cell signaling", "immunology", "rna biology", "gene regulation", "cancer biology", "human disease", "metabolism", "세포", "분자", "면역", "질병"]);
        const computationalOnly = hasAny(fieldText, ["bioinformatics", "computational", "genomics", "omics", "계산", "바이오정보학"]) && !wetBioExact;
        if (wetBioExact) adjustment += 145;
        if (computationalOnly) adjustment -= 210;
      }

      if (domain.name === "화학/촉매/유기합성") {
        const chemistryExact = hasAny(fieldText + " " + summaryText, ["catalysis", "catalyst", "organic synthesis", "organic chemistry", "organometallic", "polymer", "reaction", "유기합성", "촉매", "유기화학", "유기금속", "고분자"]);
        if (chemistryExact) adjustment += 135;
        if ((professor.unitCodes || []).length >= 4 && !hit.preferredUnitHit) adjustment -= 120;
      }

      if (domain.name === "제어/최적화") {
        const controlExact = hasAny(fieldText + " " + summaryText, ["control", "제어", "optimization", "최적화", "guidance", "trajectory optimization", "robust control", "optimal control", "reinforcement learning", "decision making", "mpc"]);
        const onlyVehicleOrAero = hasAny(fieldText, ["satellite", "spacecraft", "uav", "aerospace", "vehicle"]) && !hasAny(query, ["항공", "위성", "우주", "자율주행", "uav", "vehicle"]);
        if (controlExact) adjustment += 110;
        if (onlyVehicleOrAero && !hasAny(fieldText, ["control", "optimization", "제어", "최적화"])) adjustment -= 130;
      }

      if (domain.name === "패키징/이종집적") {
        const packagingExact = hasAny(fieldText + " " + summaryText, ["packaging", "advanced packaging", "chiplet", "3d ic", "3d integration", "heterogeneous integration", "interconnect", "sip", "pcb", "signal integrity", "emi", "emc", "패키징", "이종집적", "인터커넥트"]);
        const onlyGenericSemiconductor = hasAny(fieldText, ["semiconductor", "transistor", "device", "thin film"]) && !packagingExact;
        if (packagingExact) adjustment += 170;
        if (onlyGenericSemiconductor) adjustment -= 170;
      }


      if (domain.name === "디스플레이") {
        const displayExact = hasAny(fieldText + " " + summaryText, ["display", "organic display", "oled", "micro led", "micro-led", "light emitting", "emissive", "flexible display", "stretchable display", "oxide tft", "tft", "디스플레이", "발광소자", "플렉서블 디스플레이", "마이크로 led", "유기 디스플레이"]);
        const photonicsOnly = hasAny(fieldText, ["photonics", "nanophotonics", "laser", "quantum optics", "optical mems", "silicon photonics"]) && !displayExact;
        if (displayExact) adjustment += 260;
        else adjustment -= 220;
        if (photonicsOnly) adjustment -= 180;
      }

      if (domain.name === "포토닉스/광전소자") {
        const photonicsExact = hasAny(fieldText + " " + summaryText, ["photonics", "nanophotonics", "silicon photonics", "optoelectronic", "optoelectronics", "photodetector", "laser", "metasurface", "plasmonics", "quantum optics", "광전", "광전자", "광전소자", "포토닉스", "나노광학", "레이저", "광검출기"]);
        const displayOnly = hasAny(fieldText, ["organic display", "oled", "display", "디스플레이"]) && !photonicsExact;
        if (photonicsExact) adjustment += 230;
        else adjustment -= 200;
        if (displayOnly) adjustment -= 140;
      }

      if (domain.name === "수소/연료전지/에너지변환") {
        const conversionCore = hasAny(fieldText, ["electrocatalysis", "water electrolysis", "energy conversion", "co2 reduction", "electrified chemical synthesis", "heterogeneous catalysis", "reaction engineering", "수전해", "전기화학", "에너지 변환", "촉매", "반응공학"]);
        const fuelCellCore = hasAny(fieldText, ["fuel cell", "fuel cells", "hydrogen", "hydrogen storage", "연료전지", "수소"]);
        const batteryOnly = hasAny(fieldText, ["battery", "batteries", "li battery", "lithium", "전지", "배터리"]) && !(conversionCore || fuelCellCore);
        if (conversionCore) adjustment += 300;
        else if (fuelCellCore) adjustment += 160;
        else adjustment -= 220;
        if (batteryOnly) adjustment -= 260;
      }

      if (domain.name === "고분자/유기소재/소프트머터") {
        const polymerExact = hasAny(fieldText + " " + summaryText, ["polymer", "polymers", "고분자", "soft matter", "소프트머터", "organic material", "유기소재", "elastomer", "hydrogel", "self-assembly", "block copolymer", "smart polymer", "biopolymer", "printed organic electronics"]);
        const inorganicOnly = hasAny(fieldText, ["inorganic", "oxide", "semiconductor", "metal", "ceramic", "무기", "산화물", "반도체"]) && !polymerExact;
        if (polymerExact) adjustment += 260;
        else adjustment -= 260;
        if (inorganicOnly) adjustment -= 140;
      }

      if (domain.name === "환경/기후/지속가능에너지") {
        const envExact = hasAny(fieldText + " " + summaryText, ["environment", "climate", "carbon neutral", "sustainability", "sustainable", "renewable", "water treatment", "separation", "membrane", "sorbent", "co2", "carbon capture", "wastewater", "air quality", "green", "환경", "기후", "탄소중립", "지속가능", "분리막", "흡착", "물 처리", "재생에너지"]);
        const onlyDeviceEnergy = hasAny(fieldText, ["battery", "fuel cell", "solar cell", "energy storage", "전지", "연료전지", "태양전지"]) && !envExact;
        if (envExact) adjustment += 220;
        else adjustment -= 180;
        if (onlyDeviceEnergy) adjustment -= 90;
      }
      return adjustment;
    }

    function domainScoreAdjustment(professor, fullQuery, matched, reasons) {
      const activeDomains = getActiveDomains(fullQuery);
      if (!activeDomains.length) return { adjustment: 0, aligned: true };

      let adjustment = 0;
      let aligned = false;
      activeDomains.forEach((domain) => {
        const hit = domainAlignment(professor, domain);
        const contentHit = domain.strictMatch ? (hit.fieldTermHit || hit.summaryTermHit) : (hit.tagHit || hit.termHit);

        if (!contentHit) {
          adjustment -= domain.mismatchPenalty;
          return;
        }

        aligned = true;
        if (hit.preferredUnitHit) adjustment += domain.preferredBonus;
        else if (hit.secondaryUnitHit) adjustment += domain.secondaryBonus;
        else adjustment -= domain.nonPreferredPenalty;

        if (hit.tagHit) adjustment += domain.tagBonus;
        if (hit.termHit) adjustment += domain.termBonus;
        if (hit.fieldTermHit) adjustment += domain.exactFieldBonus;

        if (hit.preferredUnitHit && hit.tagHit && hit.termHit) adjustment += 24;
        if (domain.needsSpecificTerm && !hit.fieldTermHit) adjustment -= 140;

        if (domain.name === "반도체 소자/공정" && hasAny(fullQuery, ["공정", "산화막", "박막", "fabrication", "process", "etch", "deposition", "lithography", "양산기술", "공정기술"])) {
          const rawFieldText = normalize((professor.fields || []).join(" "))
            .replace(/반도체 소자 및 공정/g, " ")
            .replace(/semiconductor devices and 3d integration advanced packaging and heterogeneous integration/g, " ");
          const semiconductorSpecificHit = hasAny(rawFieldText, [
            "semiconductor", "oxide", "thin film", "transistor", "mosfet", "tft", "cmos", "memory", "nanofabrication", "nanoelectronics", "dtco", "graphene", "2d", "device",
            "반도체", "산화막", "박막", "트랜지스터", "메모리", "나노", "소자", "그래핀", "뉴로모픽"
          ]);
          const processSpecificHit = hasAny(rawFieldText, [
            "oxide", "thin film", "semiconductor process", "semiconductor fabrication", "materials and processing", "thin-film processing", "fabrication", "etch", "deposition", "lithography",
            "산화막", "박막", "식각", "증착", "리소그래피", "포토", "합성", "제조", "공정", "dtco"
          ]);
          if (!semiconductorSpecificHit) adjustment -= 520;
          else adjustment += processSpecificHit ? 72 : -24;
        }

        adjustment += domainSpecificQualityAdjustment(domain, professor, fullQuery, hit);
        adjustment += genericDomainFocusAdjustment(domain, professor, fullQuery);
        adjustment += finalBetaDomainAdjustment(domain, professor, fullQuery, hit);

        reasons.push(`${domain.name} 분야와 전공 축이 일치합니다`);
        matched.push(domain.name);
      });

      return { adjustment, aligned };
    }


    function structuredSectionText(professor, key) {
      const sp = professor.structuredProfile || {};
      const value = sp[key];
      if (Array.isArray(value)) return normalize(value.join(" "));
      return normalize(value || "");
    }

    function structuredProfileScore(professor, fullQuery, activeDomains) {
      if (!activeDomains.length) return 0;
      const sp = professor.structuredProfile || {};
      const primaryText = structuredSectionText(professor, "primaryResearchText") || normalize((professor.fields || []).join(" "));
      const keywordText = structuredSectionText(professor, "detailedKeywordText") || normalize((professor.keywords || []).join(" "));
      const introText = structuredSectionText(professor, "labIntroText") || normalize([professor.summary, ...(professor.summaries || [])].join(" "));
      const categoryText = structuredSectionText(professor, "representativeCategoryText");
      let adjustment = 0;
      activeDomains.forEach((domain) => {
        const terms = getDirectTermsForDomain(domain, fullQuery);
        const primaryHits = countDistinctHits(primaryText, terms).size;
        const introHits = countDistinctHits(introText, terms).size;
        const keywordHits = countDistinctHits(keywordText, terms).size;
        const repHit = (sp.representativeCategories || []).some((cat) => normalize(cat) === normalize(domain.name) || normalize(cat).includes(normalize(domain.name).split("/")[0]));
        if (primaryHits >= 4) adjustment += 210;
        else if (primaryHits === 3) adjustment += 165;
        else if (primaryHits === 2) adjustment += 105;
        else if (primaryHits === 1) adjustment += 46;
        else if (domain.strictMatch) adjustment -= 110;
        if (introHits >= 3) adjustment += 78;
        else if (introHits >= 1) adjustment += 34;
        adjustment += Math.min(keywordHits, 8) * 8;
        if (repHit || categoryText.includes(normalize(domain.name))) adjustment += 120;
      });
      return adjustment;
    }


    function getBookletEvidenceItems(professor) {
      const sp = professor.structuredProfile || {};
      return Array.isArray(sp.bookletEvidence) ? sp.bookletEvidence : [];
    }

    function bookletEvidenceString(professor) {
      return normalize(getBookletEvidenceItems(professor).map((ev) => [
        ev.researchTitle || "",
        ev.summary || "",
        ...((ev.keywords || [])),
        ...((ev.displayEvidence || []))
      ].join(" ")).join(" "));
    }

    function bookletEvidenceMatches(professor, fullQuery) {
      const evidence = getBookletEvidenceItems(professor);
      if (!evidence.length) return [];
      const query = normalize(fullQuery);
      const queryTokens = tokenize(fullQuery).filter((token) => tokenWeight(token) > 0 && token.length >= 2);
      const results = [];
      evidence.forEach((ev) => {
        const evText = normalize([ev.researchTitle || "", ev.summary || "", ...((ev.keywords || [])), ...((ev.displayEvidence || []))].join(" "));
        const directHit = queryTokens.some((token) => containsToken(evText, token)) || (ev.keywords || []).some((kw) => hasAny(query, [kw]));
        if (!directHit) return;
        (ev.displayEvidence || ev.keywords || []).forEach((term) => {
          const value = String(term || "").trim();
          if (value && !results.includes(value)) results.push(value);
        });
      });
      return results.slice(0, 4);
    }

    function bookletEvidenceScore(professor, fullQuery, activeDomains) {
      const evidenceText = bookletEvidenceString(professor);
      if (!evidenceText) return 0;
      const tokens = tokenize(fullQuery).filter((token) => tokenWeight(token) > 0 && token.length >= 2);
      let hits = 0;
      tokens.forEach((token) => {
        if (containsToken(evidenceText, token)) hits += token.length >= 4 ? 2 : 1;
      });
      if (!hits) return 0;
      let score = Math.min(160, hits * 16);
      const activeNames = (activeDomains || []).map((domain) => normalize(domain.name || "")).join(" ");
      const categoryOverlap = activeNames && hasAny(evidenceText, activeNames.split(/\s+|\//).filter(Boolean));
      if (categoryOverlap) score += 36;
      return score;
    }


    function bookletEvidenceSortRank(professor, fullQuery, activeDomains) {
      const evidence = getBookletEvidenceItems(professor);
      if (!evidence.length) return 999;
      const q = normalize(fullQuery);
      const rawTokens = tokenize(fullQuery).filter((token) => tokenWeight(token) > 0 && token.length >= 2);
      const weakTokens = new Set(["연구", "기술", "개발", "기반", "시스템", "소재", "분야", "교수", "교수님", "랩실", "추천", "ai", "기계", "화학", "물리", "전자", "공학"]);
      const tokens = rawTokens.filter((token) => !weakTokens.has(token));
      if (!tokens.length) return 999;
      let bestRank = 999;
      evidence.forEach((ev) => {
        const evText = normalize([ev.researchTitle || "", ev.summary || "", ...((ev.keywords || [])), ...((ev.displayEvidence || []))].join(" "));
        let hits = 0;
        tokens.forEach((token) => {
          if (containsToken(evText, token)) hits += token.length >= 4 ? 2 : 1;
        });
        (ev.displayEvidence || []).forEach((term) => {
          const t = normalize(term);
          if (t && q.includes(t)) hits += 3;
        });
        if (hits >= 3) {
          bestRank = Math.min(bestRank, Math.max(1, 35 - hits));
        }
      });
      return bestRank;
    }

    function buildMatchEvidenceText(item) {
      const fromInternal = item.internalMatchedEvidence || [];
      if (fromInternal.length) return fromInternal.slice(0, 3).join(", ");
      const fromBooklet = item.bookletMatchedEvidence || [];
      if (fromBooklet.length) return fromBooklet.slice(0, 3).join(", ");
      return (item.matched || []).slice(0, 3).filter(Boolean).join(", ");
    }

    function categoryWhitelistBoost(professor, fullQuery) {
      const categories = activeRepresentativeCategories(fullQuery);
      if (!categories.length) return 0;
      const name = normalize([professor.professor, professor.professorEn].join(" "));
      const sp = professor.structuredProfile || {};
      let boost = 0;
      categories.forEach(([category, spec]) => {
        const directSignal = (professor.representativeSignals || []).find((signal) => signal.category === category);
        if (directSignal) {
          const rank = Number(directSignal.rank || 99);
          boost = Math.max(boost, Math.max(70, 230 - Math.min(rank, 15) * 10));
        }
        (spec.names || []).forEach((candidate, index) => {
          const c = normalize(candidate);
          if (c && name.includes(c)) {
            boost = Math.max(boost, Math.max(80, 220 - Math.min(index + 1, 15) * 10));
          }
        });
        if ((sp.representativeCategories || []).some((cat) => normalize(cat) === normalize(category))) {
          boost = Math.max(boost, 130);
        }
      });
      return boost;
    }

    function structuredNoisePenalty(professor, fullQuery, activeDomains) {
      if (!activeDomains.length) return 0;
      const primaryText = structuredSectionText(professor, "primaryResearchText") || normalize((professor.fields || []).join(" "));
      const keywordText = structuredSectionText(professor, "detailedKeywordText") || normalize((professor.keywords || []).join(" "));
      const text = `${primaryText} ${keywordText}`;
      let penalty = 0;
      activeDomains.forEach((domain) => {
        if (domain.name === "배터리/에너지" && hasAny(fullQuery, ["배터리", "battery", "리튬", "이차전지", "전고체"])) {
          const batteryCore = hasAny(primaryText, ["battery", "batteries", "lithium", "electrolyte", "electrode", "전지", "배터리", "리튬", "전해질", "전극"]);
          const energyNoise = hasAny(primaryText, ["fuel cell", "hydrogen", "solar cell", "photovoltaic", "연료전지", "수소", "태양전지"]);
          if (energyNoise && !batteryCore) penalty -= 950;
        }
        if (domain.name === "컴퓨터그래픽스/비주얼컴퓨팅") {
          const graphicsCore = hasAny(primaryText, ["computer graphics", "visual computing", "rendering", "3d vision", "computational imaging", "컴퓨터 그래픽", "비주얼 컴퓨팅", "렌더링"]);
          const bioChemNoise = hasAny(primaryText, ["cell biology", "molecular biology", "organic chemistry", "drug", "protein", "세포", "분자생물학", "유기화학", "단백질"]);
          if (bioChemNoise && !graphicsCore) penalty -= 1250;
        }
        if (domain.name === "HCI/AR·VR/디지털헬스" || domain.name === "HCI/AR·VR") {
          const hciCore = hasAny(primaryText, ["human-computer interaction", "hci", "ux", "user experience", "augmented reality", "virtual reality", "interactive", "인간-컴퓨터", "사용자 경험", "인터랙션", "증강현실", "가상현실"]);
          const aiOnly = hasAny(primaryText, ["machine learning", "deep learning", "computer vision", "natural language", "data mining"]) && !hciCore;
          if (aiOnly) penalty -= 230;
        }
        if (domain.name === "컴퓨터시스템/운영체제") {
          const csCore = hasAny(primaryText, ["operating system", "distributed system", "file system", "cloud", "computer system", "운영체제", "분산시스템", "파일 시스템", "클라우드"]);
          const nonCsSystem = hasAny(primaryText, ["hydrogen storage system", "energy storage", "fuel cell system", "battery system", "수소 저장", "에너지 저장", "연료전지 시스템", "배터리 시스템"]);
          if (nonCsSystem && !csCore) penalty -= 560;
        }
      });
      return penalty;
    }



    function compactNameText(value) {
      return normalize(String(value || ""))
        .replace(/교수님/g, "")
        .replace(/교수/g, "")
        .replace(/professor/g, "")
        .replace(/[^0-9a-z가-힣]/g, "");
    }

    function professorNameDirectMatchScore(professor, query) {
      const compactQuery = compactNameText(query);
      if (compactQuery.length < 2) return 0;
      const nameCandidates = [
        professor && professor.professor,
        professor && professor.professorEn,
        professor && professor.name,
        professor && professor.nameEn,
        ...((professor && Array.isArray(professor.names)) ? professor.names : []),
        ...((professor && Array.isArray(professor.professorNames)) ? professor.professorNames : []),
      ].filter(Boolean);
      for (const rawName of nameCandidates) {
        const compactName = compactNameText(rawName);
        if (!compactName || compactName.length < 2) continue;
        if (compactQuery === compactName) return 6000;
        if (compactQuery.includes(compactName)) return 5800;
        if (compactName.includes(compactQuery) && compactQuery.length >= 2) return 5600;
      }
      return 0;
    }

    function scoreProfessor(professor, query, filters) {
      const fullQuery = combinedQuery(query);
      // 패키징/칩렛/3D IC/이종집적 질의에서는 첨단 패키징 자체가 주 연구축인 후보만 우선 노출한다.
      // Taek-Soo Kim 교수는 DB상 advanced packaging mechanics가 포함되어 있지만, 사용자 피드백 기준으로
      // 이 질의의 추천 후보에서는 제외한다.
      if (hasAny(fullQuery, ["반도체 패키징", "패키징", "칩렛", "3d ic", "이종집적", "인터커넥트", "packaging", "chiplet", "heterogeneous integration", "interconnect"])) {
        const normalizedName = normalize([professor.professor, professor.professorEn].join(" "));
        if (normalizedName.includes("taek-soo kim") || normalizedName.includes("taek soo kim") || normalizedName.includes("김택수")) {
          return { professor, score: 0, matched: [], reasons: [] };
        }
      }

      // 컴퓨터 그래픽스/3D 비전 질의에서는 실제 그래픽스, 3D 비전, 렌더링, 비주얼 컴퓨팅이
      // 주 연구축인 후보만 보여준다. 김현우 교수는 DB에 AI/비전 소속 레코드가 함께 있지만,
      // 화학/생명/분자 메커니즘 성격의 연구 정보가 강하게 섞여 이 질의에서는 추천 후보에서 제외한다.
      if (hasAny(fullQuery, ["컴퓨터 그래픽스", "컴퓨터그래픽스", "그래픽스", "3d 비전", "3d vision", "렌더링", "비주얼 컴퓨팅", "visual computing", "computer graphics", "rendering"])) {
        const normalizedName = normalize([professor.professor, professor.professorEn].join(" "));
        if (normalizedName.includes("김현우") || normalizedName.includes("hyunwoo kim") || normalizedName.includes("kim hyunwoo")) {
          return { professor, score: 0, matched: [], reasons: [] };
        }
      }

      // 운영체제/분산시스템/클라우드 질의에서 energy storage/hydrogen storage system처럼
      // 단어만 겹치는 에너지 시스템 후보가 상위에 섞이지 않도록 제외한다.
      if (hasAny(fullQuery, ["운영체제", "분산시스템", "스토리지", "클라우드", "operating system", "distributed system", "computer system", "file system", "storage system", "cloud"])) {
        const sysField = normalize((professor.fields || []).join(" ") + " " + [professor.summary, ...(professor.summaries || [])].join(" "));
        const trueComputerSystem = hasAny(sysField, ["operating system", "file system", "distributed system", "computer system", "systems software", "cloud", "networked system", "스토리지 및 파일 시스템", "운영체제", "분산시스템", "컴퓨터 시스템", "시스템 소프트웨어"]);
        const energySystemNoise = hasAny(sysField, ["hydrogen storage", "energy storage", "fuel cell system", "battery system", "수소 저장", "에너지 저장", "연료전지 시스템", "배터리 시스템"]);
        if (energySystemNoise && !trueComputerSystem) {
          return { professor, score: 0, matched: [], reasons: [] };
        }
      }
      const tokens = tokenize(fullQuery);
      const fieldRaw = (professor.fields || []).join(" ");
      const summaryRaw = [professor.summary, ...(professor.summaries || [])].join(" ");
      const tagRaw = (professor.intentTags || []).join(" ");
      const keywordRaw = (professor.keywords || []).join(" ");
      const searchRaw = String(professor.searchText || "");
      const hiddenSearchRaw = hiddenBilingualSearchText([fieldRaw, summaryRaw, tagRaw, keywordRaw, searchRaw].join(" "));
      const search = normalize([searchRaw, hiddenSearchRaw].join(" "));
      const field = normalize([fieldRaw, hiddenSearchRaw].join(" "));
      const summary = normalize([summaryRaw, hiddenSearchRaw].join(" "));
      const tags = normalize(tagRaw);
      const keywords = normalize([keywordRaw, hiddenSearchRaw].join(" "));
      let score = 0;
      const matched = [];
      const reasons = [];

      tokens.forEach((token) => {
        const weight = tokenWeight(token);
        if (weight <= 0) return;
        let tokenScore = 0;
        if (containsToken(field, token)) tokenScore += 18;
        if (containsToken(keywords, token)) tokenScore += 12;
        if (containsToken(tags, token)) tokenScore += 10;
        if (containsToken(summary, token)) tokenScore += 7;
        if (containsToken(search, token)) tokenScore += 4;
        if (tokenScore > 0) {
          score += Math.min(tokenScore * weight, 28);
          matched.push(token);
        }
      });

      const internalMatch = internalRecommendationScore(professor, fullQuery);
      if (internalMatch.score !== 0) {
        score += internalMatch.score;
        internalMatch.evidence.forEach((term) => matched.push(term));
        internalMatch.reasons.forEach((reason) => reasons.push(reason));
      }

      const hiddenFocusBoost = hiddenBilingualFocusBoost(fullQuery, [fieldRaw, summaryRaw, tagRaw, keywordRaw, searchRaw].join(" "));
      if (hiddenFocusBoost > 0) score += hiddenFocusBoost;

      phraseRules.forEach((rule) => {
        if (!hasAny(fullQuery, rule.triggers)) return;
        const tagHit = rule.tags.some((tag) => (professor.intentTags || []).includes(tag));
        const termHit = rule.terms.some((term) => containsToken(field + " " + keywords + " " + summary, normalize(term)));
        if (tagHit || termHit) {
          score += rule.bonus + (tagHit && termHit ? 12 : 0);
          reasons.push(`${rule.name} 분야 적합도가 높음`);
          rule.triggers.forEach((trigger) => {
            if (hasAny(fullQuery, [trigger])) matched.push(normalize(trigger));
          });
        }
      });

      const domainAdjustment = domainScoreAdjustment(professor, fullQuery, matched, reasons);
      score += domainAdjustment.adjustment;
      if (!domainAdjustment.aligned) {
        score = 0;
      }

      // 구조화된 DB 항목 기반 재평가: 주 연구분야 > 연구실 소개 > 세부 키워드 > 대표 분야 신호 순으로 가중치를 다르게 준다.
      const activeDomainsForStructured = getActiveDomains(fullQuery);
      score += structuredProfileScore(professor, fullQuery, activeDomainsForStructured);
      const bookletMatchedEvidence = bookletEvidenceMatches(professor, fullQuery);
      const bookletBoost = bookletEvidenceScore(professor, fullQuery, activeDomainsForStructured);
      if (bookletBoost > 0) {
        score += bookletBoost;
        bookletMatchedEvidence.forEach((term) => matched.push(term));
        reasons.push("POSTECH 연구자 책자의 대표성과와 직접 연결됩니다");
      }
      score += structuredNoisePenalty(professor, fullQuery, activeDomainsForStructured);
      score += precisionNoisePenalty(professor, fullQuery, activeDomainsForStructured);
      score += finalBetaStrictPenalty(professor, fullQuery, activeDomainsForStructured);
      score += finalBetaStrictPenaltyV2(professor, fullQuery, activeDomainsForStructured);
      score += finalBetaStrictPenaltyV3(professor, fullQuery, activeDomainsForStructured);
      score += finalBetaStrictPenaltyV4(professor, fullQuery, activeDomainsForStructured);
      if (typeof officialBetaPenaltyV2 === "function") {
        score += officialBetaPenaltyV2(professor, fullQuery, activeDomainsForStructured);
      }
      if (typeof officialBetaPenaltyV3 === "function") {
        score += officialBetaPenaltyV3(professor, fullQuery, activeDomainsForStructured);
      }

      const representativeBoost = Math.max(representativeSignalScore(professor, fullQuery), categoryWhitelistBoost(professor, fullQuery));
      if (representativeBoost > 0) {
        score += representativeBoost;
        matched.push("대표 검색 후보");
      }

      // 최종 베타 공식 대표 후보는 감점 로직 때문에 필터링되지 않도록 최소 점수선을 보장한다.
      if (typeof officialBetaSortRankV3 === "function") {
        const officialRankV3 = officialBetaSortRankV3(professor, fullQuery, activeDomainsForStructured);
        if (officialRankV3 < 999) {
          score = Math.max(score, 1220 - Math.min(officialRankV3, 25) * 14);
          matched.push("공식 검수 대표 후보");
        }
      }
      if (typeof officialBetaSortRankV2 === "function") {
        const officialRank = officialBetaSortRankV2(professor, fullQuery, activeDomainsForStructured);
        if (officialRank < 999) {
          score = Math.max(score, 1180 - Math.min(officialRank, 25) * 14);
          matched.push("공식 검수 대표 후보");
        }
      }

      // 공식 검색 결과 기반 대표 후보는 감점 로직 때문에 필터링되지 않도록 최소 점수선을 보장한다.
      if (typeof googleVerifiedSortRank === "function") {
        const googleRank = googleVerifiedSortRank(professor, fullQuery, activeDomainsForStructured);
        if (googleRank < 999) {
          score = Math.max(score, 900 - Math.min(googleRank, 20) * 12);
          matched.push("공식 검색 대표 후보");
        }
      }

      if (hasAny(fullQuery, ["취업", "기업", "r&d", "양산기술", "공정기술", "산업 응용"])) {
        const appliedHit = hasAny(field + " " + keywords + " " + tags, [
          "semiconductor", "process", "fabrication", "device", "circuit", "packaging", "sensor", "battery", "power electronics", "system", "소자", "공정", "회로", "센서"
        ]);
        if (appliedHit) {
          score += 18;
          reasons.push("기업 R&D, 공정, 소자, 시스템 직무와의 연관성이 높음");
        }
      }

      if (hasAny(fullQuery, ["실험", "제작", "측정", "공정", "장비"])) {
        if (hasAny(field + " " + keywords, ["experiment", "fabrication", "device", "measurement", "synthesis", "공정", "제작", "측정", "소자"])) {
          score += 16;
          reasons.push("실험, 제작, 측정 중심 연구 스타일에 적합함");
        }
      }

      if (hasAny(fullQuery, ["이론", "모델링", "시뮬레이션", "계산"])) {
        if (hasAny(field + " " + keywords, ["theory", "modeling", "simulation", "computational", "계산", "이론", "시뮬레이션"])) {
          score += 16;
          reasons.push("이론, 모델링, 시뮬레이션 중심 연구 스타일에 적합함");
        }
      }

      if (filters.unit !== "all" && !(professor.unitCodes || []).includes(filters.unit)) {
        score -= 36;
      }

      if (filters.tag) {
        const activeTag = normalize(filters.tag);
        const tagHit = (professor.intentTags || []).some((tag) => normalize(tag) === activeTag);
        score += tagHit ? 28 : -18;
      }

      if (filters.keyword) {
        const keyword = normalize(filters.keyword);
        if (containsToken(search, keyword)) score += 20;
      }

      if (typeof bookletBoost !== "undefined" && bookletBoost >= 80) {
        score = Math.max(score, 430 + bookletBoost);
      }

      const directNameScore = professorNameDirectMatchScore(professor, fullQuery);
      if (directNameScore > 0) {
        score = Math.max(score, directNameScore);
        matched.unshift("교수님 이름 직접 검색");
        reasons.unshift("입력한 교수님 성함과 일치합니다");
      }

      if (score > 0) {
        score += Math.min(Number(professor.qualityScore || 0) / 12, 8);
      }

      return {
        professor,
        score: Math.max(0, Math.round(score)),
        matched: Array.from(new Set(matched)).slice(0, 12),
        reasons: Array.from(new Set(reasons)).slice(0, 4),
        bookletMatchedEvidence: Array.from(new Set(bookletMatchedEvidence || [])).slice(0, 4),
        internalMatchedEvidence: Array.from(new Set((typeof internalMatch !== "undefined" && internalMatch.evidence) || [])).slice(0, 5),
        internalScore: (typeof internalMatch !== "undefined" && internalMatch.score) || 0,
      };
    }

    function getCurrentFilters() {
      return {
        unit: state.unit,
        tag: state.selectedTag,
        keyword: state.keyword,
      };
    }

    function getPrimaryHomepage(professor) {
      const candidates = [
        professor && professor.homepage,
        ...((professor && Array.isArray(professor.homepages)) ? professor.homepages : [])
      ];
      for (const url of candidates) {
        const value = String(url || "").trim();
        if (!value) continue;
        if (value === "-" || /미등록|없음|none|n\/a/i.test(value)) continue;
        return value;
      }
      return "";
    }

    function hasValidHomepage(professor) {
      return Boolean(getPrimaryHomepage(professor));
    }

    function resultSortPriority(item) {
      return hasValidHomepage(item.professor) ? 1 : 0;
    }

    function isGeneralControlQuery(query) {
      const q = normalize(query);
      if (!hasAny(q, ["제어", "최적화", "control", "optimization", "동역학", "강화학습"])) return false;
      return !hasAny(q, [
        "항공우주", "위성", "우주선", "궤도", "우주", "비행", "유도", "uav", "드론", "spacecraft", "astrodynamics", "trajectory", "guidance", "flight", "aerospace", "satellite", "interplanetary"
      ]);
    }

    function controlSortRank(professor, query, activeDomains) {
      if (!activeDomains.some((domain) => domain.name === "제어/최적화")) return 999;
      if (!isGeneralControlQuery(query)) return 999;

      const field = normalize((professor.fields || []).join(" "));
      const summary = normalize([professor.summary, ...(professor.summaries || [])].join(" "));
      const keywords = normalize((professor.keywords || []).join(" "));
      const units = professor.unitCodes || [];
      const text = `${field} ${summary} ${keywords}`;

      let rank = 999;
      const coreGeneralControl = hasAny(field, [
        "제어, 최적화", "control theory", "robust control", "optimal control", "model predictive control", "mpc", "motion control", "motor control", "control design", "active control", "process control", "제어", "최적화"
      ]);
      const rlControl = hasAny(field, ["reinforcement learning", "강화학습"]) && hasAny(field, ["control", "로봇", "robot", "motion"]);
      const optimizationOnly = hasAny(field, ["optimization", "최적화", "decision making under uncertainty", "mathematical optimization"]);
      const robotControl = hasAny(field, ["robot", "robotics", "로봇", "legged", "humanoid", "quadruped", "wearable robot"]) && hasAny(field, ["control", "reinforcement learning", "mpc", "제어", "강화학습"]);
      const aerospaceOnly = hasAny(field, ["spacecraft", "astrodynamics", "interplanetary", "flight dynamics", "uav guidance", "space structures", "aerospace", "satellite", "propulsion"]);
      const weakNoiseOnly = hasAny(field, ["emission control", "noise and vibration control", "postural control", "thermal", "combustion"])
        && !hasAny(field, ["control theory", "robust control", "optimal control", "model predictive control", "reinforcement learning", "process control", "motor control", "active control", "로보틱스", "robotics"]);

      if (coreGeneralControl && units.includes("ee")) rank = 1;
      else if (coreGeneralControl && units.includes("me")) rank = 2;
      else if (robotControl) rank = 3;
      else if (rlControl) rank = 4;
      else if (optimizationOnly && (units.includes("cs") || units.includes("gsai") || units.includes("ee"))) rank = 5;
      else if (coreGeneralControl) rank = 6;
      else if (optimizationOnly) rank = 7;

      // 일반 제어/최적화 버튼에서는 항공우주 유도제어가 관련은 있지만 너무 먼저 나오면
      // 사용자가 의도한 일반 제어이론, 로보틱스, 최적화 후보를 가린다. 항공우주 단어를 직접 입력한 경우는 이 감점이 적용되지 않는다.
      if (aerospaceOnly) rank += 6;
      if (weakNoiseOnly) rank += 8;
      return rank;
    }


    function hciSortRank(professor, query, activeDomains) {
      if (!activeDomains.some((domain) => String(domain.name || "").includes("HCI"))) return 999;
      const q = normalize(query);
      if (!hasAny(q, ["hci", "ar", "vr", "ux", "인터랙션", "사용자", "user experience", "human-computer", "인간-컴퓨터", "증강현실", "가상현실"])) return 999;
      const name = normalize([professor.professor, professor.professorEn].join(" "));
      const field = normalize((professor.fields || []).join(" "));
      const lab = normalize((professor.labNames || []).join(" "));
      // HCI 정렬은 자동 생성 요약이나 범용 태그보다 실제 연구분야와 연구실명에 우선 의존한다.
      // 그렇지 않으면 AI/소셜컴퓨팅 연구실이 HCI 전용 질의에서 과도하게 올라올 수 있다.
      const text = `${field} ${lab}`;
      const priorityNames = [
        ["이안 오클리", "ian oakley"],
        ["이기혁", "geehyuk lee"],
        ["김주호", "juho kim"],
        ["이의진", "uichin lee"],
        ["시어링 조셉", "joseph seering"],
        ["이성주", "sung-ju lee", "sung ju lee"]
      ];
      for (let i = 0; i < priorityNames.length; i += 1) {
        if (priorityNames[i].some((n) => name.includes(normalize(n)))) return i + 1;
      }
      const directHci = hasAny(text, [
        "human-computer interaction", "human computer interaction", "인간-컴퓨터 상호작용", "hci", "user experience", "ux", "interaction design", "interactive computing", "인터랙션", "사용자 인터페이스", "user interface"
      ]);
      const arvr = hasAny(text, ["augmented", "virtual reality", "ar/vr", "ar", "vr", "증강현실", "가상현실", "xr", "haptic", "햅틱"]);
      const weakHciOnly = hasAny(text, ["social computing", "interactive computing", "소셜 컴퓨팅", "인터랙티브 컴퓨팅"]) && !directHci && !arvr;
      const aiOnly = hasAny(text, ["machine learning", "deep learning", "computer vision", "natural language", "data mining"]) && !directHci && !arvr;
      if (directHci && arvr) return 7;
      if (directHci) return 8;
      if (weakHciOnly) return 14;
      if (aiOnly) return 40;
      return 999;
    }




    function activeRepresentativeCategories(query) {
      const q = normalize(query);
      let active = Object.entries(representativeCategorySignals).filter(([, spec]) => {
        return (spec.triggers || []).some((trigger) => q.includes(normalize(trigger)));
      });

      // 세부 분야가 명확한 질의에서는 AI/머신러닝 같은 넓은 대표 신호가
      // 의료영상, 컴퓨터비전, 자연어처리, DB, 시스템 등 세부 분야 후보를 밀어내지 않게 한다.
      const hasCategory = (name) => active.some(([category]) => category === name);
      const specificCategories = [
        "반도체 소자/공정", "AI 반도체/VLSI", "반도체 패키징/이종집적", "디스플레이", "포토닉스/광전소자",
        "배터리/전기화학", "수소/연료전지", "바이오센서/생체전자", "뇌과학/BCI", "의료영상/디지털헬스",
        "컴퓨터비전/영상인식", "자연어처리/LLM", "DB/빅데이터", "시스템/운영체제", "정보보안/암호",
        "로봇/자율주행", "HCI/AR·VR", "그래픽스/3D 비전", "양자컴퓨팅/양자정보", "항공우주/추진", "환경/기후/지속가능에너지"
      ];
      const hasSpecific = active.some(([category]) => specificCategories.includes(category) && category !== "AI/머신러닝");
      if (hasSpecific) {
        active = active.filter(([category]) => category !== "AI/머신러닝");
      }
      if (hasCategory("의료영상/디지털헬스")) {
        active = active.filter(([category]) => category === "의료영상/디지털헬스");
      }
      if (hasCategory("그래픽스/3D 비전")) {
        active = active.filter(([category]) => category === "그래픽스/3D 비전" || category === "컴퓨터비전/영상인식");
      }
      if (hasCategory("자연어처리/LLM")) {
        active = active.filter(([category]) => category === "자연어처리/LLM");
      }
      if (hasCategory("DB/빅데이터")) {
        active = active.filter(([category]) => category === "DB/빅데이터");
      }
      if (hasCategory("시스템/운영체제")) {
        active = active.filter(([category]) => category === "시스템/운영체제");
      }
      if (hasCategory("정보보안/암호")) {
        active = active.filter(([category]) => category === "정보보안/암호");
      }
      return active;
    }

    function representativeSignalScore(professor, query) {
      const categories = activeRepresentativeCategories(query);
      if (!categories.length) return 0;
      const signals = professor.representativeSignals || [];
      let best = 0;
      categories.forEach(([category, spec]) => {
        const signal = signals.find((item) => item.category === category);
        if (signal) {
          const rank = Number(signal.rank || 99);
          best = Math.max(best, Math.max(40, 170 - Math.min(rank, 12) * 9));
        }
        const name = normalize([professor.professor, professor.professorEn].join(" "));
        (spec.names || []).forEach((candidate, index) => {
          const c = normalize(candidate);
          if (c && name.includes(c)) {
            best = Math.max(best, Math.max(35, 150 - Math.min(index + 1, 12) * 8));
          }
        });
      });
      return best;
    }

    function representativeSortRank(professor, query) {
      const categories = activeRepresentativeCategories(query);
      if (!categories.length) return 999;
      const name = normalize([professor.professor, professor.professorEn].join(" "));
      const signals = professor.representativeSignals || [];
      let best = 999;
      categories.forEach(([category, spec]) => {
        const signal = signals.find((item) => item.category === category);
        if (signal) best = Math.min(best, Number(signal.rank || 999));
        (spec.names || []).forEach((candidate, index) => {
          const c = normalize(candidate);
          if (c && name.includes(c)) best = Math.min(best, index + 1);
        });
      });
      return best;
    }

    function hydrogenSortRank(professor, query, activeDomains) {
      if (!activeDomains.some((domain) => domain.name === "수소/연료전지/에너지변환")) return 999;
      const q = normalize(query);
      const name = normalize([professor.professor, professor.professorEn].join(" "));
      const isStorageInfra = hasAny(q, ["액체수소", "수소 저장", "저장", "인프라", "충전", "운송", "liquid hydrogen", "hydrogen storage", "infrastructure"]);
      const isElectrolysis = hasAny(q, ["수전해", "그린수소", "water electrolysis", "electrolysis", "green hydrogen", "수소 생산"])
        && !hasAny(q, ["연료전지", "fuel cell"]);
      let names;
      if (isStorageInfra) {
        names = ["장대준", "daejun chang", "배중면", "joongmyeon bae", "조은선", "eun seon cho", "이강택", "kangtaek lee", "김희탁", "hee tak kim", "조은애", "eunae cho"];
      } else if (isElectrolysis) {
        names = ["이진우", "jinwoo lee", "이강택", "kangtaek lee", "오지훈", "jihun oh", "김희탁", "hee tak kim", "조은애", "eunae cho", "이현주", "hyunjoo lee", "정우철", "woochul jung", "박승빈", "seung bin park", "김일두", "il doo kim", "황승준", "seung jun hwang", "배중면", "joongmyeon bae"];
      } else {
        names = ["조은애", "eunae cho", "배중면", "joongmyeon bae", "이강택", "kangtaek lee", "김희탁", "hee tak kim", "이진우", "jinwoo lee", "이현주", "hyunjoo lee", "정우철", "woochul jung", "오지훈", "jihun oh", "김일두", "il doo kim", "황승준", "seung jun hwang", "박승빈", "seung bin park", "정연식", "yeon sik jung", "장대준", "daejun chang", "양용수", "yongsoo yang"];
      }
      for (let i = 0; i < names.length; i += 1) {
        if (name.includes(normalize(names[i]))) return Math.floor(i / 2) + 1;
      }
      return 999;
    }

    function batterySortRank(professor, query, activeDomains) {
      if (!activeDomains.some((domain) => domain.name === "배터리/에너지")) return 999;
      const q = normalize(query);
      if (!hasAny(q, ["배터리", "battery", "batteries", "리튬", "리튬전지", "이차전지", "전고체", "전고체전지", "battery system"])) return 999;
      const name = normalize([professor.professor, professor.professorEn].join(" "));
      const field = normalize((professor.fields || []).join(" "));
      const summary = normalize([professor.summary, ...(professor.summaries || [])].join(" "));
      const text = `${field} ${summary}`;
      const isBatterySystemQuery = hasAny(q, ["bms", "팩", "pack", "모듈", "module", "시스템", "system", "열관리", "thermal", "안전", "safety", "모빌리티"]);
      const hasLithiumMetalFocus = hasAny(q, ["리튬금속", "lithium metal", "anode-free", "무음극"]);
      const isSolidStateQuery = hasAny(q, ["전고체", "solid-state", "solid state", "고체전해질", "solid electrolyte", "양극", "cathode"]) && !hasLithiumMetalFocus;
      const isElectrolyteInterfaceQuery = hasAny(q, ["전해질", "electrolyte", "sei", "계면", "interface", "리튬금속", "lithium metal", "고속충전", "fast charging"]);
      const directNames = isBatterySystemQuery
        ? ["이윤구", "yoonkoo lee", "김성수", "seong su kim", "김희탁", "hee tak kim", "최남순", "nam-soon choi", "서동화", "dong-hwa seo", "강정구", "jeung ku kang", "변혜령", "hye ryung byon"]
        : isSolidStateQuery
          ? ["서동화", "dong-hwa seo", "최남순", "nam-soon choi", "김희탁", "hee tak kim", "강정구", "jeung ku kang", "변혜령", "hye ryung byon", "조은애", "eunae cho", "이윤구", "yoonkoo lee", "김성수", "seong su kim"]
          : isElectrolyteInterfaceQuery
            ? ["김희탁", "hee tak kim", "최남순", "nam-soon choi", "서동화", "dong-hwa seo", "강정구", "jeung ku kang", "변혜령", "hye ryung byon", "홍승범", "seungbum hong", "이윤구", "yoonkoo lee", "김성수", "seong su kim"]
            : ["김희탁", "hee tak kim", "최남순", "nam-soon choi", "서동화", "dong-hwa seo", "강정구", "jeung ku kang", "변혜령", "hye ryung byon", "이윤구", "yoonkoo lee", "김성수", "seong su kim", "조은애", "eunae cho", "황승준", "seung jun hwang", "홍승범", "seungbum hong", "김일두", "il doo kim", "박선아", "sarah sunah park", "정성윤", "sung-yoon chung", "이진우", "jinwoo lee", "조은선", "eun seon cho"];
      for (let i = 0; i < directNames.length; i += 1) {
        if (name.includes(normalize(directNames[i]))) return Math.floor(i / 2) + 1;
      }
      const batteryCore = hasAny(text, ["li battery", "lithium battery", "lithium-ion", "lithium ion", "lithium metal", "anode-free", "solid-state battery", "solid state battery", "batteries", "battery", "electrolyte", "electrode", "cathode", "battery system", "battery thermal", "battery pack", "리튬", "배터리", "이차전지", "전고체", "전해질", "전극", "양극", "음극", "배터리 시스템"]);
      const fuelHydrogenOnly = hasAny(text, ["fuel cell", "hydrogen", "water electrolysis", "co2 reduction", "수소", "연료전지", "수전해"]) && !batteryCore;
      if (batteryCore && !fuelHydrogenOnly) return 90;
      if (batteryCore) return 120;
      return 999;
    }

    function communicationSortRank(professor, query, activeDomains) {
      if (!activeDomains.some((domain) => domain.name === "통신/RF/무선" || domain.name === "통신/RF")) return 999;
      const q = normalize(query);
      if (!hasAny(q, ["통신", "무선", "rf", "안테나", "6g", "정보이론", "wireless", "communication", "antenna", "information theory"])) return 999;
      const name = normalize([professor.professor, professor.professorEn].join(" "));
      const priority = ["이시현", "하정석", "강준혁", "최진석", "최준일", "박성욱", "유종원", "서창호", "최성현", "김성민", "김문철", "김준모", "배현민"];
      for (let i = 0; i < priority.length; i += 1) {
        if (name.includes(normalize(priority[i]))) return i + 1;
      }
      return 999;
    }

    function clearHiddenFiltersForDirectQuery() {
      state.selectedTag = "";
      state.unit = "all";
      state.keyword = "";
      const unitSelect = document.getElementById("unitFilter");
      const keywordFilter = document.getElementById("keywordFilter");
      if (unitSelect) unitSelect.value = "all";
      if (keywordFilter) keywordFilter.value = "";
      document.querySelectorAll("#tagFilter .chip").forEach((chip) => chip.classList.remove("active"));
    }



    // 실제 서비스 검수 기반 정밀 보정 레이어입니다.
    // 일반 대학생이 많이 검색하는 10개 분야에서, 단어만 겹치는 연구실이 상위에 오르지 않도록
    // 주 연구분야, 연구실명, 소속, 실제 세부 키워드를 함께 사용해 정렬과 감점을 적용합니다.
    function precisionText(professor) {
      const sp = professor.structuredProfile || {};
      return normalize([
        professor.professor,
        professor.professorEn,
        ...(professor.fields || []),
        ...(professor.keywords || []),
        ...(professor.labNames || []),
        professor.summary || "",
        ...((professor.summaries || [])),
        sp.primaryResearchText || "",
        sp.detailedKeywordText || "",
        sp.labIntroText || "",
        sp.representativeCategoryText || "",
        sp.bookletEvidenceText || "",
        ...((professor.unitLabels || []))
      ].join(" "));
    }

    function precisionFieldText(professor) {
      const sp = professor.structuredProfile || {};
      return normalize([
        ...(professor.fields || []),
        ...(professor.labNames || []),
        professor.summary || "",
        ...((professor.summaries || [])),
        sp.primaryResearchText || "",
        sp.labIntroText || "",
        sp.bookletEvidenceText || ""
      ].join(" "));
    }

    function precisionRankByNames(professor, names) {
      const name = normalize([professor.professor, professor.professorEn].join(" "));
      for (let i = 0; i < names.length; i += 1) {
        const item = normalize(names[i]);
        if (item && name.includes(item)) return i + 1;
      }
      return 999;
    }

    function precisionSortRank(professor, query, activeDomains) {
      const q = normalize(query);
      const text = precisionText(professor);
      const field = precisionFieldText(professor);
      const units = professor.unitCodes || [];
      let best = 999;
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      const consider = (rank) => {
        if (rank < best) best = rank;
      };

      if (hasDomain("반도체 소자/공정") && hasAny(q, ["반도체", "공정", "박막", "트랜지스터", "semiconductor", "transistor", "deposition", "fabrication"])) {
        const named = precisionRankByNames(professor, ["이병훈", "Byoung-Hoon Lee", "이정수", "Jungsu Lee", "이장식", "정성웅", "강종훈", "노용영", "조항정", "정윤영"]);
        const processCore = hasAny(field, ["semiconductor process", "nano devices and processing", "gate stack", "thin film", "transistor", "mosfet", "memory device", "dram", "high-k", "euv", "ald", "ale", "fabrication", "박막", "트랜지스터", "메모리", "반도체 공정", "나노소자"]);
        const bioOnly = hasAny(field, ["biosensor", "bioelectronic", "implantable", "neural", "생체", "바이오센서", "임플란터블"]) && !processCore;
        if (named < 999) consider(named);
        else if (processCore && (units.includes("sse") || units.includes("ee"))) consider(20);
        else if (processCore) consider(35);
        if (bioOnly) consider(220);
      }

      if (hasDomain("배터리/에너지") && hasAny(q, ["배터리", "battery", "리튬", "전고체", "이차전지"])) {
        const named = precisionRankByNames(professor, ["강병우", "조창신", "김원배", "한세광", "이승우"]);
        const batteryCore = hasAny(field, ["battery materials", "sodium-ion battery", "lithium", "lithium-ion", "lithium ion", "solid-state", "solid state", "battery", "batteries", "energy storage", "고체 전해질", "전고체", "리튬", "이차 전지", "차세대 이차 전지", "배터리"]);
        const fuelOnly = hasAny(field, ["fuel cell", "hydrogen", "water electrolysis", "co2 electrolysis", "p2g", "연료전지", "수소", "수전해", "co2전환"]) && !batteryCore;
        if (named < 999) consider(named);
        else if (batteryCore) consider(45);
        if (fuelOnly) consider(230);
      }

      if (hasDomain("디스플레이") && hasAny(q, ["디스플레이", "display", "oled", "micro led", "발광소자", "플렉서블"])) {
        const named = precisionRankByNames(professor, ["최수석", "김욱성", "김종규", "노용영", "조창순"]);
        const displayCore = hasAny(field, ["display", "display engineering", "smart display", "future display", "oled", "micro led", "leds for illumination and display", "light emitting", "organic electronics", "printed electronics", "oxide semiconductor", "tft", "soft electronics", "플렉서블 디스플레이", "발광소자"]);
        const imageSensorOnly = hasAny(field, ["image sensor", "pixel"]) && !displayCore;
        if (named < 999) consider(named);
        else if (displayCore) consider(35);
        if (imageSensorOnly) consider(170);
      }

      if (hasDomain("포토닉스/광전소자") && hasAny(q, ["포토닉스", "광전", "나노광학", "레이저", "광검출기", "photonics", "optoelectronic", "photodetector", "laser"])) {
        const named = precisionRankByNames(professor, ["노준석", "조창순", "김종규", "김기현", "김범준"]);
        const photonicsCore = hasAny(field, ["photonics", "nanophotonics", "metaphotonics", "metasurface", "plasmonics", "optoelectronic", "photodetector", "laser", "optical", "biophotonics", "광전", "광센서", "레이저", "나노광학"]);
        const materialOnly = hasAny(field, ["2d materials", "graphene", "surface science", "van der waals"]) && !photonicsCore;
        if (named < 999) consider(named);
        else if (photonicsCore) consider(40);
        if (materialOnly) consider(190);
      }

      if (hasDomain("정보보안/암호") && hasAny(q, ["정보보안", "보안", "암호", "privacy", "security", "cryptography"])) {
        const named = precisionRankByNames(professor, ["김슬배", "박지성", "박찬익", "김광준"]);
        const securityCore = hasAny(field, ["computer security", "system security", "software security", "operating system security", "cyber-physical security", "cryptography", "privacy", "secure", "보안", "암호", "프라이버시"]);
        const systemNoSecurity = hasAny(field, ["storage system", "operating systems", "computer architecture", "memory systems", "machine learning lab"]) && !securityCore;
        if (named < 999) consider(named);
        else if (securityCore) consider(35);
        if (systemNoSecurity) consider(210);
      }

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "computer vision", "object detection", "visual"])) {
        const named = precisionRankByNames(professor, ["손진희", "곽수하", "김광인", "김대진", "조민수"]);
        const visionCore = hasAny(field, ["computer vision", "machine learning and vision", "visual tracking", "robust vision", "object detection", "segmentation", "image recognition", "video understanding", "visual", "컴퓨터비전", "영상인식"]);
        const appliedMechanicsVision = hasAny(field, ["fluid integrated electronics", "mechanics", "thermal/fluid"]) && visionCore;
        const genericLearningOnly = hasAny(field, ["efficient learning", "model compression", "reinforcement learning", "machine learning lab"]) && !visionCore;
        if (named < 999) consider(named);
        else if (visionCore && (units.includes("cs") || units.includes("ee"))) consider(30);
        else if (visionCore) consider(appliedMechanicsVision ? 95 : 55);
        if (genericLearningOnly) consider(190);
      }

      if (hasDomain("자연어처리/LLM") && hasAny(q, ["자연어처리", "llm", "언어모델", "nlp", "language model"])) {
        const named = precisionRankByNames(professor, ["김형훈", "이근배"]);
        const nlpCore = hasAny(field, ["natural language processing", "large language model", "language model", "conversational ai", "statistical nlp", "korean language processing", "spoken language processing", "nlp", "언어모델", "자연어처리"]);
        const genericAiOnly = hasAny(field, ["machine learning lab", "trustworthy ai", "efficient computing", "computer vision", "visualization"]) && !nlpCore;
        if (named < 999) consider(named);
        else if (nlpCore) consider(35);
        if (genericAiOnly) consider(180);
      }

      if ((hasDomain("데이터베이스/빅데이터") || hasDomain("DB/빅데이터")) && hasAny(q, ["데이터베이스", "빅데이터", "데이터마이닝", "추천시스템", "database", "data mining", "recommender"])) {
        const named = precisionRankByNames(professor, ["유환조", "한욱신"]);
        const dbCore = hasAny(field, ["data mining", "recommender", "recommender systems", "database systems", "data systems", "query processing", "big data infrastructure", "large-scale data", "data intelligence", "데이터마이닝", "추천시스템", "데이터베이스"]);
        const nonCsDatabase = hasAny(field, ["energy big data", "thermodynamic databases", "calphad", "atomistic simulation", "smart grid"]) && !dbCore;
        if (named < 999) consider(named);
        else if (dbCore) consider(40);
        if (nonCsDatabase) consider(230);
      }

      if ((hasDomain("로봇/제어/자율주행") || hasDomain("로봇/자율주행")) && hasAny(q, ["로봇", "자율주행", "slam", "드론", "모빌리티", "robot", "autonomous", "auv", "uav"])) {
        const named = precisionRankByNames(professor, ["김기훈", "유선철", "김정훈", "고제성", "김진태"]);
        const robotCore = hasAny(field, ["robotics", "robot", "autonomous", "autonomous manipulation", "auv", "uav", "underwater robot", "autonomous marine vehicle", "slam", "drone", "control theory", "로봇", "자율주행"]);
        const materialOnly = hasAny(field, ["smart surfaces", "adhesion", "wetting", "mems fabrication", "micro-lego"]) && !robotCore;
        if (named < 999) consider(named);
        else if (robotCore) consider(45);
        if (materialOnly) consider(220);
      }

      if (hasDomain("의료영상/디지털헬스") && hasAny(q, ["의료영상", "mri", "디지털헬스", "헬스케어", "medical imaging", "healthcare"])) {
        const named = precisionRankByNames(professor, ["김원화", "김철홍", "김형함", "김기현", "박성민", "한세광"]);
        const medicalCore = hasAny(field, ["medical imaging", "mri", "diffusion mri", "photoacoustic", "ultrasound imaging", "biomedical imaging", "digital healthcare", "healthcare ai", "medical ai", "biomedical optics", "의료영상", "초음파", "광음향", "디지털 헬스"]);
        const deviceNoImaging = hasAny(field, ["implantable medical device", "drug delivery", "tissue engineering"]) && !medicalCore;
        if (named < 999) consider(named);
        else if (medicalCore) consider(40);
        if (deviceNoImaging) consider(150);
      }

      if ((hasDomain("생체 소자/바이오센서") || hasDomain("MEMS/NEMS/센서")) && hasAny(q, ["바이오센서", "생체전자", "웨어러블", "임플란터블", "biosensor", "wearable", "implantable"])) {
        const named = precisionRankByNames(professor, ["임근배", "한승용", "박성민", "한세광", "김철홍"]);
        const bioSensorCore = hasAny(field, ["biosensor", "bio sensors", "bio-integrated", "bio integrated", "wearable", "implantable", "aimd", "soft and bio-integrated sensors", "micro/nano fabrication", "bio mems", "micro/nano fluidics", "smart healthcare", "생체융합", "바이오센서", "웨어러블", "임플란터블"]);
        const robotOrSemiOnly = hasAny(field, ["robotics for science", "mechanical intelligence", "semiconductor process", "silicon nanowire", "nano devices and processing"]) && !bioSensorCore;
        if (named < 999) consider(named);
        else if (bioSensorCore) consider(40);
        if (robotOrSemiOnly) consider(230);
      }

      if (hasDomain("실험 뇌과학/신경공학") && hasAny(q, ["실험", "뇌과학", "신경과학", "bci", "neuroscience", "neural", "brain"])) {
        const named = precisionRankByNames(professor, ["김정훈", "김태경", "김종신", "백승태", "박상기", "크리스토퍼 피오릴로"]);
        const wetNeuro = hasAny(field, ["molecular neuroscience", "neurobiology", "neural circuits", "neuroepigenetics", "neuroimmunology", "neurogenetics", "molecular neuropsychiatry", "brain disorders", "cns barriers", "신경생물학", "신경회로", "신경면역", "신경유전", "분자신경"]);
        const theoryOnly = hasAny(field, ["simulation", "computational", "modeling", "theory", "시뮬레이션", "계산", "이론"]) && !wetNeuro;
        if (named < 999) consider(named);
        else if (wetNeuro) consider(35);
        if (theoryOnly) consider(240);
      }

      return best;
    }

    function precisionNoisePenalty(professor, fullQuery, activeDomains) {
      const q = normalize(fullQuery);
      const field = precisionFieldText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      let penalty = 0;

      if (hasDomain("배터리/에너지") && hasAny(q, ["배터리", "battery", "리튬", "전고체", "이차전지"])) {
        const batteryCore = hasAny(field, ["battery materials", "sodium-ion battery", "lithium", "lithium-ion", "lithium ion", "solid-state", "solid state", "battery", "batteries", "energy storage", "고체 전해질", "전고체", "리튬", "이차 전지", "차세대 이차 전지", "배터리"]);
        const hydrogenOnly = hasAny(field, ["fuel cell", "hydrogen", "water electrolysis", "co2 electrolysis", "p2g", "연료전지", "수소", "수전해", "co2전환"]);
        const processSystemOnly = hasAny(field, ["process systems engineering", "techno-economic", "life cycle assessment"]);
        if (!batteryCore) penalty -= 1700;
        if (hydrogenOnly && !batteryCore) penalty -= 1050;
        if (processSystemOnly) penalty -= 1150;
      }

      if (hasDomain("디스플레이") && hasAny(q, ["디스플레이", "display", "oled", "micro led", "발광소자"])) {
        const displayCore = hasAny(field, ["display", "oled", "micro led", "leds for illumination and display", "light emitting", "future display", "smart display", "soft electronics", "tft", "organic electronics", "디스플레이", "발광"]);
        const imageSensorOnly = hasAny(field, ["image sensor", "pixel"]) && !displayCore;
        if (!displayCore) penalty -= 1250;
        if (imageSensorOnly) penalty -= 1250;
      }

      if (hasDomain("포토닉스/광전소자") && hasAny(q, ["포토닉스", "광전", "레이저", "광검출기", "photonics", "optoelectronic", "laser"])) {
        const photonicsCore = hasAny(field, ["photonics", "nanophotonics", "metaphotonics", "metasurface", "plasmonics", "optoelectronic", "photodetector", "laser", "optical", "biophotonics", "광전", "광센서", "레이저", "나노광학"]);
        const materialOnly = hasAny(field, ["2d materials", "graphene", "surface science", "van der waals"]) && !photonicsCore;
        if (!photonicsCore) penalty -= 1150;
        if (materialOnly) penalty -= 1250;
      }

      if (hasDomain("정보보안/암호") && hasAny(q, ["정보보안", "보안", "암호", "security", "privacy"])) {
        const securityCore = hasAny(field, ["security", "cryptography", "privacy", "secure", "trusted", "보안", "암호", "프라이버시"]);
        const genericSystem = hasAny(field, ["storage systems", "memory systems", "machine learning lab", "efficient computing"]) && !securityCore;
        if (!securityCore) penalty -= 1700;
        if (genericSystem) penalty -= 950;
      }

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "computer vision"])) {
        const visionCore = hasAny(field, ["computer vision", "machine learning and vision", "visual tracking", "robust vision", "object detection", "segmentation", "image recognition", "video understanding", "컴퓨터비전", "영상인식"]);
        const genericAi = hasAny(field, ["efficient learning", "model compression", "reinforcement learning", "trustworthy ai"]) && !visionCore;
        if (!visionCore) penalty -= 1450;
        if (genericAi) penalty -= 1250;
      }

      if (hasDomain("자연어처리/LLM") && hasAny(q, ["자연어처리", "llm", "언어모델", "nlp"])) {
        const nlpCore = hasAny(field, ["natural language processing", "large language model", "language model", "conversational ai", "statistical nlp", "korean language processing", "spoken language processing", "nlp"]);
        if (!nlpCore) penalty -= 1550;
      }

      if ((hasDomain("데이터베이스/빅데이터") || hasDomain("DB/빅데이터")) && hasAny(q, ["데이터베이스", "빅데이터", "데이터마이닝", "추천시스템", "database", "data mining"])) {
        const dbCore = hasAny(field, ["data mining", "recommender", "database systems", "data systems", "query processing", "big data infrastructure", "large-scale data", "data intelligence", "데이터마이닝", "추천시스템"]);
        const nonCsDatabase = hasAny(field, ["energy big data", "thermodynamic databases", "calphad", "atomistic simulation", "smart grid"]);
        if (!dbCore) penalty -= 1700;
        if (nonCsDatabase) penalty -= 1450;
      }

      if ((hasDomain("로봇/제어/자율주행") || hasDomain("로봇/자율주행")) && hasAny(q, ["로봇", "자율주행", "slam", "드론", "모빌리티", "robot", "autonomous"])) {
        const robotCore = hasAny(field, ["robotics", "robot", "autonomous", "auv", "uav", "slam", "drone", "manipulation", "control theory", "로봇", "자율주행"]);
        const surfaceOnly = hasAny(field, ["smart surfaces", "adhesion", "wetting", "micro-lego", "mems fabrication"]) && !robotCore;
        if (!robotCore) penalty -= 1400;
        if (surfaceOnly) penalty -= 1600;
      }

      if (hasDomain("의료영상/디지털헬스") && hasAny(q, ["의료영상", "mri", "디지털헬스", "헬스케어", "medical imaging"])) {
        const medicalCore = hasAny(field, ["medical imaging", "mri", "diffusion mri", "photoacoustic", "ultrasound imaging", "biomedical imaging", "digital healthcare", "healthcare ai", "medical ai", "biomedical optics", "의료영상", "광음향", "초음파"]);
        if (!medicalCore) penalty -= 1450;
      }

      if ((hasDomain("생체 소자/바이오센서") || hasDomain("MEMS/NEMS/센서")) && hasAny(q, ["바이오센서", "생체전자", "웨어러블", "임플란터블", "biosensor", "wearable", "implantable"])) {
        const bioSensorCore = hasAny(field, ["biosensor", "bio sensors", "bio-integrated", "bio integrated", "soft and bio-integrated sensors", "wearable sensor", "wearable sensors", "implantable", "aimd", "active implantable", "bio mems", "micro/nano fluidics", "smart healthcare", "생체융합", "바이오센서", "웨어러블 센서", "임플란터블"]);
        const robotOrSemiOnly = hasAny(field, ["robotics for science", "mechanical intelligence", "semiconductor process", "silicon nanowire", "nano devices and processing"]) && !bioSensorCore;
        if (!bioSensorCore) penalty -= 1700;
        if (robotOrSemiOnly) penalty -= 1550;
      }

      if (hasDomain("실험 뇌과학/신경공학") && hasAny(q, ["실험", "뇌과학", "신경과학", "bci", "neuroscience", "neural", "brain"])) {
        const wetNeuro = hasAny(field, ["molecular neuroscience", "neurobiology", "neural circuits", "neuroepigenetics", "neuroimmunology", "neurogenetics", "molecular neuropsychiatry", "brain disorders", "cns barriers", "신경생물학", "신경회로", "신경면역", "신경유전", "분자신경"]);
        const pureSimulation = hasAny(field, ["simulation", "computational", "modeling", "theory", "시뮬레이션", "계산", "이론"]) && !wetNeuro;
        if (!wetNeuro) penalty -= 1250;
        if (pureSimulation) penalty -= 1700;
      }

      return penalty;
    }


    function finalBetaCoreText(professor) {
      const sp = professor.structuredProfile || {};
      return normalize([
        professor.professor || "",
        professor.professorEn || "",
        (professor.unitLabels || []).join(" "),
        (professor.labNames || []).join(" "),
        (professor.fields || []).join(" "),
        professor.summary || "",
        ...(professor.summaries || []),
        sp.primaryResearchText || "",
        sp.labIntroText || ""
      ].join(" "));
    }

    function finalBetaNameRank(professor, names) {
      const name = normalize([professor.professor, professor.professorEn].join(" "));
      for (let i = 0; i < names.length; i += 1) {
        const item = normalize(names[i]);
        if (item && name.includes(item)) return i + 1;
      }
      return 999;
    }

    function finalBetaStrictPenalty(professor, fullQuery, activeDomains) {
      const q = normalize(fullQuery);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      let penalty = 0;

      if (hasDomain("반도체 패키징/이종집적") && hasAny(q, ["패키징", "이종집적", "chiplet", "interconnect", "heterogeneous integration", "advanced packaging", "3d ic"])) {
        const packagingCore = hasAny(core, ["heterogeneous integration", "semiconductor packaging", "advanced packaging", "beol interconnect", "chiplet", "electronic packaging", "thermal modeling", "heat dissipation", "nanostructured interconnect", "이종집적", "반도체 패키징", "패키징"]);
        const genericSemiOnly = hasAny(core, ["semiconductor process", "tft", "flexible electronics", "wearable device", "integrated circuits", "analog ic"]) && !packagingCore;
        if (!packagingCore) penalty -= 2600;
        if (genericSemiOnly) penalty -= 1800;
      }

      if (hasDomain("디스플레이") && hasAny(q, ["디스플레이", "display", "oled", "micro led", "발광소자", "플렉서블"])) {
        const displayCore = hasAny(core, ["display engineering", "smart display", "future display", "display technology", "oled", "micro led", "leds for illumination and display", "light emitting", "organic electronics", "printed electronics", "organic field-effect transistor", "oxide semiconductor", "soft electronics", "디스플레이", "발광소자"]);
        const imageSensorOnly = hasAny(core, ["image sensor", "pixel", "camera systems", "computational imaging"]) && !displayCore;
        if (!displayCore) penalty -= 1700;
        if (imageSensorOnly) penalty -= 2200;
      }

      if (hasDomain("포토닉스/광전소자") && hasAny(q, ["포토닉스", "광전", "나노광학", "레이저", "광검출기", "photonics", "optoelectronic", "photodetector", "laser"])) {
        const photonicsCore = hasAny(core, ["photonics", "nanophotonics", "metaphotonics", "metasurface", "plasmonics", "optoelectronic", "photodetector", "photodetectors", "laser", "optical", "biophotonics", "thz photonics", "terahertz", "광전", "광센서", "레이저", "나노광학"]);
        const materialOnly = hasAny(core, ["2d materials", "graphene", "transition metal dichalcogenides", "van der waals", "surface science"]) && !photonicsCore;
        if (!photonicsCore) penalty -= 1700;
        if (materialOnly) penalty -= 2200;
      }

      if (hasDomain("정보보안/암호") && hasAny(q, ["정보보안", "보안", "암호", "프라이버시", "security", "cryptography", "privacy"])) {
        const securityCore = hasAny(core, ["computer security", "system security", "software security", "operating system security", "cyber-physical security", "drone security", "autonomous vehicle security", "satellite security", "ai security", "fuzzing", "cryptography", "privacy", "secure", "security lab", "보안", "암호", "프라이버시"]);
        const genericSystemOrAi = hasAny(core, ["storage systems", "memory systems", "machine learning lab", "efficient computing", "reinforcement learning", "computer architecture"]) && !securityCore;
        if (!securityCore) penalty -= 2600;
        if (genericSystemOrAi) penalty -= 1800;
      }

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "computer vision", "object detection", "visual tracking"])) {
        const visionCore = hasAny(core, ["computer vision", "machine learning and vision", "visual tracking", "robust vision", "object detection", "segmentation", "image recognition", "video understanding", "semantic correspondence", "visual matching", "object discovery", "action recognition", "컴퓨터비전", "영상인식"]);
        const genericAiOnly = hasAny(core, ["efficient learning", "model compression", "reinforcement learning", "trustworthy ai", "conformal prediction", "optimization for machine learning"]) && !visionCore;
        if (!visionCore) penalty -= 2100;
        if (genericAiOnly) penalty -= 1700;
      }

      if (hasDomain("배터리/에너지") && hasAny(q, ["배터리", "battery", "리튬", "전고체", "이차전지", "전기화학"])) {
        const batteryCore = hasAny(core, ["battery materials", "sodium-ion battery", "lithium-sulfur battery", "solid-state battery", "lithium", "lithium-ion", "battery", "batteries", "고체 전해질", "전고체", "리튬", "이차 전지", "차세대 이차 전지", "배터리"]);
        const analysisSupport = hasAny(core, ["stem", "electron microscopy", "원자구조", "계면분석"]) && hasAny(core, ["battery", "배터리", "전고체"]);
        const hydrogenFuelOnly = hasAny(core, ["fuel cell", "hydrogen", "water electrolysis", "co2 electrolysis", "p2g", "연료전지", "수소", "수전해", "co2전환"]) && !batteryCore;
        const processSystemOnly = hasAny(core, ["process systems engineering", "techno-economic analysis", "life cycle assessment", "process simulation"]) && !batteryCore;
        if (!batteryCore && !analysisSupport) penalty -= 2400;
        if (hydrogenFuelOnly) penalty -= 2600;
        if (processSystemOnly) penalty -= 2200;
      }

      if ((hasDomain("항공우주/추진") || hasDomain("항공우주/추진/유체")) && hasAny(q, ["항공우주", "추진", "터빈", "유체역학", "aerospace", "propulsion", "turbine", "uav", "드론"])) {
        const propulsionCore = hasAny(core, ["gas turbine", "steam turbine", "jet engine", "computational flow physics", "fluid mechanics", "multi-physics", "uav", "unmanned aerial vehicles", "satellite communication", "sar", "터빈", "젯엔진", "열유동", "유동 물리"]);
        const unrelatedMech = hasAny(core, ["biofluid", "microfluidics", "polymer nanomanufacturing", "biomaterials", "energy storage", "semiconductor technologies", "adhesion", "wetting"]) && !propulsionCore;
        if (!propulsionCore) penalty -= 2100;
        if (unrelatedMech) penalty -= 1800;
      }

      if ((hasDomain("환경/기후/지속가능에너지") || hasDomain("환경/기후/지속가능")) && hasAny(q, ["환경", "기후", "지속가능", "탄소중립", "environment", "climate", "sustainable", "carbon neutral"])) {
        const sustainabilityCore = hasAny(core, ["sustainable", "sustainability", "renewable", "carbon", "co2 reduction", "co2 conversion", "hydrogen production", "biorefinery", "life cycle assessment", "membrane material", "nanofluidics", "energy harvesting", "energy conversion", "thermoelectric", "seawater desalination", "환경", "지속가능", "탄소", "신재생", "에너지 전환"]);
        const unrelatedRobotBio = hasAny(core, ["robotics", "mechanism design", "plant pathology", "neuro", "cell biology"]) && !sustainabilityCore;
        if (!sustainabilityCore) penalty -= 1800;
        if (unrelatedRobotBio) penalty -= 1600;
      }

      if (hasDomain("양자컴퓨팅/양자정보") && hasAny(q, ["양자컴퓨팅", "양자정보", "quantum computing", "quantum information", "quantum algorithm"])) {
        const quantumInfoCore = hasAny(core, ["quantum information", "quantum computing", "quantum algorithm", "quantum communication", "photonic quantum", "neutral atoms", "quantum simulation", "양자정보", "양자컴퓨팅"]);
        const genericQuantumMatter = hasAny(core, ["quantum matter", "topological", "condensed matter", "quantum transport"]) && !quantumInfoCore;
        if (!quantumInfoCore) penalty -= 1350;
        if (genericQuantumMatter) penalty -= 900;
      }

      return penalty;
    }

    function finalBetaSortRank(professor, query, activeDomains) {
      const q = normalize(query);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      const rankBy = (names) => finalBetaNameRank(professor, names);

      if (hasDomain("반도체 패키징/이종집적") && hasAny(q, ["패키징", "이종집적", "chiplet", "interconnect", "advanced packaging", "heterogeneous integration"])) {
        const packagingCore = hasAny(core, ["semiconductor packaging", "advanced packaging", "beol interconnect", "chiplet", "electronic packaging", "heterogeneous integration", "이종집적"]);
        if (!packagingCore) return 999;
        const named = rankBy(["송재용", "이병훈", "정성웅"]);
        return named < 999 ? named : 40;
      }

      if (hasDomain("정보보안/암호") && hasAny(q, ["정보보안", "보안", "암호", "privacy", "security", "cryptography"])) {
        const securityCore = hasAny(core, ["computer security", "system security", "software security", "operating system security", "cyber-physical security", "drone security", "autonomous vehicle security", "satellite security", "ai security", "cryptography", "privacy", "fuzzing"]);
        if (!securityCore) return 999;
        const named = rankBy(["김슬배", "박지성", "박찬익"]);
        return named < 999 ? named : 35;
      }

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "computer vision", "object detection"])) {
        const visionCore = hasAny(core, ["computer vision", "machine learning and vision", "visual tracking", "robust vision", "object detection", "segmentation", "semantic correspondence", "visual matching", "object discovery", "action recognition"]);
        if (!visionCore) return 999;
        const named = rankBy(["손진희", "곽수하", "김광인", "조민수", "김진태", "백승환", "이승용", "조성현"]);
        return named < 999 ? named : 45;
      }

      if (hasDomain("디스플레이") && hasAny(q, ["디스플레이", "display", "oled", "micro led", "발광소자"])) {
        const displayCore = hasAny(core, ["display engineering", "smart display", "future display", "display technology", "oled", "micro led", "leds for illumination and display", "light emitting", "organic electronics", "printed electronics", "organic field-effect transistor", "oxide semiconductor", "soft electronics"]);
        if (!displayCore) return 999;
        const named = rankBy(["최수석", "김욱성", "김종규", "노용영", "조창순"]);
        return named < 999 ? named : 40;
      }

      if (hasDomain("포토닉스/광전소자") && hasAny(q, ["포토닉스", "광전", "나노광학", "레이저", "광검출기", "photonics", "optoelectronic", "photodetector", "laser"])) {
        const photonicsCore = hasAny(core, ["photonics", "nanophotonics", "metaphotonics", "metasurface", "plasmonics", "optoelectronic", "photodetector", "laser", "optical", "biophotonics", "thz photonics", "terahertz"]);
        if (!photonicsCore) return 999;
        const named = rankBy(["노준석", "조창순", "김종규", "한해욱", "김기현"]);
        return named < 999 ? named : 45;
      }

      if (hasDomain("양자컴퓨팅/양자정보") && hasAny(q, ["양자컴퓨팅", "양자정보", "quantum computing", "quantum information", "quantum algorithm"])) {
        const qinfo = hasAny(core, ["quantum information", "quantum computing", "quantum algorithm", "quantum communication", "photonic quantum", "quantum simulation", "neutral atoms"]);
        if (!qinfo) return 999;
        const named = rankBy(["이승우", "김윤호", "박지우", "최영준", "박경덕"]);
        return named < 999 ? named : 40;
      }

      if ((hasDomain("항공우주/추진") || hasDomain("항공우주/추진/유체")) && hasAny(q, ["항공우주", "추진", "터빈", "유체역학", "aerospace", "propulsion", "turbine", "uav", "드론"])) {
        const propulsionCore = hasAny(core, ["gas turbine", "steam turbine", "jet engine", "computational flow physics", "fluid mechanics", "uav", "unmanned aerial vehicles", "satellite communication", "sar"]);
        if (!propulsionCore) return 999;
        const named = rankBy(["유동현", "김진태", "이남윤"]);
        return named < 999 ? named : 60;
      }

      if ((hasDomain("환경/기후/지속가능에너지") || hasDomain("환경/기후/지속가능")) && hasAny(q, ["환경", "기후", "지속가능", "탄소중립", "environment", "climate", "sustainable"])) {
        const sustainCore = hasAny(core, ["sustainable", "sustainability", "renewable", "carbon", "co2 reduction", "co2 conversion", "hydrogen production", "biorefinery", "life cycle assessment", "membrane material", "energy harvesting", "energy conversion", "thermoelectric", "seawater desalination"]);
        if (!sustainCore) return 999;
        const named = rankBy(["박형규", "진현규", "한지훈", "김원배", "유동현", "용기중", "김현우", "이상준"]);
        return named < 999 ? named : 60;
      }

      return 999;
    }


    function finalBetaStrictPenaltyV2(professor, fullQuery, activeDomains) {
      const q = normalize(fullQuery);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      let penalty = 0;

      if ((hasDomain("패키징/이종집적") || hasDomain("반도체 패키징/이종집적")) && hasAny(q, ["패키징", "이종집적", "chiplet", "interconnect", "heterogeneous integration", "advanced packaging", "3d ic"])) {
        const packagingCore = hasAny(core, ["heterogeneous integration", "semiconductor packaging", "advanced packaging", "beol interconnect", "chiplet", "electronic packaging", "thermal modeling", "heat dissipation", "nanostructured interconnect", "이종집적", "반도체 패키징", "패키징"]);
        if (!packagingCore) penalty -= 4200;
      }

      if (hasDomain("디스플레이") && hasAny(q, ["디스플레이", "display", "oled", "micro led", "발광소자", "플렉서블"])) {
        const trueDisplay = hasAny(core, ["display engineering", "smart display", "future display", "display technology", "oled", "micro led", "leds for illumination and display", "light emitting", "organic electronics", "printed electronics", "organic field-effect transistor", "oxide semiconductor", "soft electronics"]);
        const imageSensorOnly = hasAny(core, ["image sensor", "pixel", "camera systems", "computational imaging"]);
        if (!trueDisplay) penalty -= 2100;
        if (imageSensorOnly && !trueDisplay) penalty -= 2600;
      }

      if (hasDomain("포토닉스/광전소자") && hasAny(q, ["포토닉스", "광전", "나노광학", "레이저", "광검출기", "photonics", "optoelectronic", "photodetector", "laser"])) {
        const truePhotonics = hasAny(core, ["photonics", "nanophotonics", "metaphotonics", "metasurface", "plasmonics", "photodetector", "photodetectors", "laser", "optical metamaterials", "flat optics", "active nanophotonics", "biophotonics", "thz photonics", "terahertz", "광센서", "레이저", "나노광학"]);
        const onlyMaterialOpto = hasAny(core, ["optoelectronic materials", "2d materials", "graphene", "surface science", "van der waals"]);
        if (!truePhotonics) penalty -= 2100;
        if (onlyMaterialOpto && !truePhotonics) penalty -= 2600;
      }

      if (hasDomain("정보보안/암호") && hasAny(q, ["정보보안", "보안", "암호", "프라이버시", "security", "cryptography", "privacy"])) {
        const directSecurity = hasAny(core, ["computer security", "system security", "software security", "operating system security", "cyber-physical security", "drone security", "autonomous vehicle security", "satellite security", "ai security", "fuzzing", "cryptography", "security lab"]);
        const privacyOnly = hasAny(core, ["privacy", "federated learning", "watermark"]) && !directSecurity;
        if (!directSecurity) penalty -= 3200;
        if (privacyOnly) penalty -= 1800;
      }

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "computer vision", "object detection"])) {
        const directVision = hasAny(core, ["computer vision lab", "computer vision", "machine learning and vision", "visual tracking", "robust vision", "object detection", "segmentation", "semantic correspondence", "visual matching", "object discovery", "action recognition"]);
        const mechanicsVision = hasAny(core, ["fluid integrated electronics", "unmanned aerial vehicles"]) && directVision;
        const genericAi = hasAny(core, ["efficient learning", "model compression", "reinforcement learning", "trustworthy ai", "conformal prediction", "optimization for machine learning"]) && !directVision;
        if (!directVision) penalty -= 2600;
        if (genericAi) penalty -= 2000;
        if (mechanicsVision) penalty -= 360;
      }

      if ((hasDomain("항공우주/추진") || hasDomain("항공우주/추진/유체")) && hasAny(q, ["항공우주", "추진", "터빈", "유체역학", "aerospace", "propulsion", "turbine", "uav", "드론"])) {
        const directPropulsion = hasAny(core, ["gas turbine", "steam turbine", "jet engine", "computational flow physics", "multi-physics", "unmanned aerial vehicles", "satellite communication", "sar"]);
        const bioFluidOnly = hasAny(core, ["biofluid", "microfluidics", "seawater desalination", "biomimetic"]);
        if (!directPropulsion) penalty -= 2400;
        if (bioFluidOnly && !directPropulsion) penalty -= 1600;
      }

      if ((hasDomain("환경/기후/지속가능에너지") || hasDomain("환경/기후/지속가능")) && hasAny(q, ["환경", "기후", "지속가능", "탄소중립", "environment", "climate", "sustainable", "carbon"])) {
        const directSustain = hasAny(core, ["sustainable", "sustainability", "renewable", "carbon", "co2 reduction", "co2 conversion", "hydrogen production", "biorefinery", "life cycle assessment", "techno-economic", "membrane material", "energy harvesting", "energy conversion", "thermoelectric", "seawater desalination"]);
        if (!directSustain) penalty -= 2200;
      }

      return penalty;
    }

    function finalBetaSortRankV2(professor, query, activeDomains) {
      const q = normalize(query);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      const rankBy = (names) => finalBetaNameRank(professor, names);

      if ((hasDomain("패키징/이종집적") || hasDomain("반도체 패키징/이종집적")) && hasAny(q, ["패키징", "이종집적", "chiplet", "interconnect", "advanced packaging", "heterogeneous integration"])) {
        const coreHit = hasAny(core, ["semiconductor packaging", "advanced packaging", "beol interconnect", "chiplet", "electronic packaging", "heterogeneous integration", "nanostructured interconnect"]);
        if (!coreHit) return 999;
        const named = rankBy(["송재용", "이병훈", "정성웅"]);
        return named < 999 ? named : 50;
      }

      if (hasDomain("디스플레이") && hasAny(q, ["디스플레이", "display", "oled", "micro led", "발광소자"])) {
        const coreHit = hasAny(core, ["display engineering", "smart display", "future display", "display technology", "oled", "micro led", "leds for illumination and display", "light emitting", "organic electronics", "printed electronics", "organic field-effect transistor", "oxide semiconductor", "soft electronics"]);
        if (!coreHit) return 999;
        const named = rankBy(["최수석", "김욱성", "김종규", "노용영", "조창순"]);
        return named < 999 ? named : 50;
      }

      if (hasDomain("포토닉스/광전소자") && hasAny(q, ["포토닉스", "광전", "나노광학", "레이저", "광검출기", "photonics", "laser"])) {
        const coreHit = hasAny(core, ["photonics", "nanophotonics", "metaphotonics", "metasurface", "plasmonics", "photodetector", "laser", "optical metamaterials", "flat optics", "biophotonics", "thz photonics", "terahertz"]);
        if (!coreHit) return 999;
        const named = rankBy(["노준석", "조창순", "김종규", "한해욱", "김기현", "김철홍"]);
        return named < 999 ? named : 55;
      }

      if (hasDomain("정보보안/암호") && hasAny(q, ["정보보안", "보안", "암호", "privacy", "security", "cryptography", "난수", "엔트로피", "nist"])) {
        const entropyQuery = hasAny(q, ["난수", "엔트로피", "entropy", "nist", "random number", "무작위성"]);
        const entropyNamed = entropyQuery ? rankBy(["김용준"]) : 999;
        if (entropyNamed < 999) return 0;
        const coreHit = hasAny(core, ["computer security", "system security", "software security", "operating system security", "cyber-physical security", "drone security", "autonomous vehicle security", "satellite security", "ai security", "fuzzing", "cryptography"]);
        if (!coreHit) return 999;
        const named = rankBy(["김슬배", "박지성", "박찬익", "이성진"]);
        return named < 999 ? named : 50;
      }

      return 999;
    }


    function finalBetaStrictPenaltyV3(professor, fullQuery, activeDomains) {
      const q = normalize(fullQuery);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      let penalty = 0;

      if (hasDomain("HCI/AR·VR") || hasDomain("HCI/AR·VR/디지털헬스")) {
        if (hasAny(q, ["hci", "ar", "vr", "ux", "인터랙션", "사용자 경험", "가상현실", "증강현실"])) {
          const hciCore = hasAny(core, ["human-computer interaction", "human-centered", "interaction lab", "haptics", "haptic", "xr", "virtual reality", "augmented reality", "user experience", "visual analytics", "health and human-computer interaction", "human-ai interaction"]);
          const hardwareOnly = hasAny(core, ["integrated circuits", "analog ic", "semiconductor circuits", "power electronics", "wireless communications"]) && !hciCore;
          if (!hciCore) penalty -= 2200;
          if (hardwareOnly) penalty -= 2400;
        }
      }

      if (hasDomain("컴퓨터시스템/운영체제") && hasAny(q, ["운영체제", "분산시스템", "스토리지", "시스템", "operating system", "distributed system", "storage", "cloud"])) {
        const csSystemCore = hasAny(core, ["operating systems", "operating system", "system software", "storage system", "embedded real-time operating system", "large-scale systems", "data-intensive computing", "machine learning systems", "computer architecture", "cpu-gpu", "distributed", "cloud", "file system"]);
        const nonCsSystem = hasAny(core, ["energy storage", "hydrogen storage", "fuel cell", "semiconductor technologies", "energy systems", "robot", "sensors"]) && !csSystemCore;
        if (!csSystemCore) penalty -= 2200;
        if (nonCsSystem) penalty -= 2600;
      }

      if (hasDomain("수소/연료전지/에너지변환") && hasAny(q, ["수소", "연료전지", "수전해", "hydrogen", "fuel cell", "electrolysis"])) {
        const hydrogenCore = hasAny(core, ["hydrogen", "fuel cell", "water electrolysis", "solid oxide electrolysis", "co2 electrolysis", "hydrogen evolution", "hydrogen storage", "lohc", "ammonia", "p2g", "수소", "연료전지", "수전해", "수소저장", "전극 소재"]);
        const organicCatalysisOnly = hasAny(core, ["organic synthesis", "transition-metal-catalyzed organic", "organic chemistry", "synthetic organic methodology"]) && !hydrogenCore;
        if (!hydrogenCore) penalty -= 2600;
        if (organicCatalysisOnly) penalty -= 2400;
      }

      if (hasDomain("포토닉스/광전소자") && hasAny(q, ["포토닉스", "광전", "나노광학", "레이저", "광검출기", "photonics", "laser"])) {
        const thzPhotonics = hasAny(core, ["thz photonics", "terahertz spectroscopy", "bio photonics", "nanophotonics"]);
        const microwaveOnly = hasAny(core, ["microwave", "antenna", "millimeter-wave", "rf/microwave"]) && !thzPhotonics;
        if (microwaveOnly) penalty -= 3200;
      }

      return penalty;
    }

    function finalBetaSortRankV3(professor, query, activeDomains) {
      const q = normalize(query);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      const rankBy = (names) => finalBetaNameRank(professor, names);

      if (hasDomain("수소/연료전지/에너지변환") && hasAny(q, ["수소", "연료전지", "수전해", "hydrogen", "fuel cell", "electrolysis"])) {
        const coreHit = hasAny(core, ["hydrogen", "fuel cell", "electrolysis", "hydrogen evolution", "hydrogen storage", "lohc", "ammonia", "p2g", "수소", "연료전지", "수전해", "수소저장"]);
        if (!coreHit) return 999;
        const named = rankBy(["김용태", "김원배", "용기중", "윤창원", "천동원", "안지환", "최창혁", "권순호", "진현규", "한지훈"]);
        return named < 999 ? named : 70;
      }

      if (hasDomain("컴퓨터시스템/운영체제") && hasAny(q, ["운영체제", "분산시스템", "스토리지", "operating system", "distributed system", "storage", "cloud"])) {
        const coreHit = hasAny(core, ["operating systems", "operating system", "system software", "storage system", "embedded real-time operating system", "large-scale systems", "data-intensive computing", "machine learning systems", "computer architecture", "cpu-gpu", "distributed"]);
        if (!coreHit) return 999;
        const named = rankBy(["박찬익", "박지성", "전명재", "이성진", "서영주"]);
        return named < 999 ? named : 60;
      }

      if ((hasDomain("HCI/AR·VR") || hasDomain("HCI/AR·VR/디지털헬스")) && hasAny(q, ["hci", "ar", "vr", "ux", "인터랙션", "사용자 경험", "가상현실", "증강현실"])) {
        const coreHit = hasAny(core, ["human-computer interaction", "human-centered", "interaction lab", "haptics", "xr", "virtual reality", "augmented reality", "visual analytics", "health and human-computer interaction", "human-ai interaction"]);
        if (!coreHit) return 999;
        const named = rankBy(["최승문", "조은경", "고성안", "황인석"]);
        return named < 999 ? named : 70;
      }

      return 999;
    }


    function finalBetaStrictPenaltyV4(professor, fullQuery, activeDomains) {
      const q = normalize(fullQuery);
      const core = finalBetaCoreText(professor);
      const units = professor.unitCodes || [];
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      let penalty = 0;

      if (hasDomain("컴퓨터시스템/운영체제") && hasAny(q, ["운영체제", "분산시스템", "스토리지", "operating system", "distributed system", "storage", "cloud"])) {
        const csSystemCore = hasAny(core, ["operating systems", "operating system", "system software", "embedded real-time operating system", "large-scale systems", "data-intensive computing", "machine learning systems", "computer architecture", "cpu-gpu", "distributed"]);
        const energyStorageNoise = hasAny(core, ["energy conversion and storage systems", "energy storage", "hydrogen storage", "fuel cell", "solid oxide", "semiconductor technologies"]);
        if (!units.includes("cs")) penalty -= 3600;
        if (energyStorageNoise) penalty -= 3600;
        if (!csSystemCore) penalty -= 1800;
      }

      if ((hasDomain("HCI/AR·VR") || hasDomain("HCI/AR·VR/디지털헬스")) && hasAny(q, ["hci", "ar", "vr", "ux", "인터랙션", "사용자 경험", "가상현실", "증강현실"])) {
        const directHumanInterface = hasAny(core, ["human-computer interaction", "human-centered", "interaction lab", "human-ai interaction", "health and human-computer interaction", "xr", "virtual reality", "augmented reality", "user experience", "visual analytics"]);
        const hapticsOnlyHardware = hasAny(core, ["haptics actuator", "smart display", "display technology", "optoelectronics"]) && !directHumanInterface;
        if (!directHumanInterface) penalty -= 1800;
        if (!units.includes("cs") && !directHumanInterface) penalty -= 2600;
        if (hapticsOnlyHardware) penalty -= 2800;
      }

      return penalty;
    }



    // Google 및 POSTECH 공식 공개 페이지 확인 기반 최종 대표교수님 정렬 보정입니다.
    // UI는 바꾸지 않고, 일반 검색어에서 대표성이 높은 교수님이 먼저 보이도록 정렬만 보정합니다.
    function googleVerifiedSortRank(professor, query, activeDomains) {
      const q = normalize(query);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      const rankBy = (names) => finalBetaNameRank(professor, names);

      if (hasDomain("반도체 소자/공정") && hasAny(q, ["반도체", "소자", "공정", "박막", "증착", "트랜지스터", "semiconductor", "device", "process", "thin film", "transistor"])) {
        const packagingQuery = hasAny(q, ["패키징", "이종집적", "chiplet", "packaging", "interconnect"]);
        const displayQuery = hasAny(q, ["디스플레이", "oled", "micro led", "display"]);
        if (!packagingQuery && !displayQuery) {
          const coreHit = hasAny(core, ["semiconductor device", "semiconductor process", "silicon semiconductor", "memory device", "reram", "dram", "nanowire fet", "finfet", "gaa", "nano devices and processing", "2d semiconductor", "반도체", "메모리", "소자", "공정"]);
          if (!coreHit) return 999;
          const named = rankBy(["황현상", "백창기", "이정수", "이병훈", "조문호", "오명철", "정성웅", "노용영"]);
          return named < 999 ? named : 70;
        }
      }

      if (hasDomain("배터리/에너지") && hasAny(q, ["배터리", "리튬", "이차전지", "전고체", "전기화학", "battery", "lithium", "solid-state"])) {
        const hydrogenMainQuery = hasAny(q, ["수소", "연료전지", "수전해", "hydrogen", "fuel cell", "electrolysis"]) && !hasAny(q, ["배터리", "리튬", "전고체", "battery", "lithium"]);
        if (!hydrogenMainQuery) {
          const batteryCore = hasAny(core, ["battery", "batteries", "lithium", "lithium-ion", "lithium battery", "solid-state battery", "sodium-ion battery", "next-generation rechargeable", "anode", "cathode", "electrolyte", "전고체", "리튬", "이차전지", "배터리", "전극", "전해질"]);
          if (!batteryCore) return 999;
          const named = rankBy(["강병우", "조창신", "박수진", "김원배", "조길원"]);
          return named < 999 ? named : 80;
        }
      }

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "멀티모달", "computer vision", "object detection", "visual recognition"])) {
        const medicalQuery = hasAny(q, ["의료영상", "medical", "mri", "초음파", "광음향", "neuroimaging"]);
        if (!medicalQuery) {
          const visionCore = hasAny(core, ["computer vision lab", "computer vision", "machine learning and vision", "visual tracking", "robust vision", "object detection", "segmentation", "visual recognition", "visual matching", "object discovery", "action recognition", "컴퓨터비전", "영상인식"]);
          if (!visionCore) return 999;
          const named = rankBy(["조민수", "손진희", "곽수하", "김광인"]);
          return named < 999 ? named : 65;
        }
      }

      if (hasDomain("정보보안/암호") && hasAny(q, ["정보보안", "보안", "암호", "프라이버시", "시스템 보안", "security", "cryptography", "privacy"])) {
        const entropyQuery = hasAny(q, ["난수", "엔트로피", "nist", "random number", "entropy"]);
        if (!entropyQuery) {
          const securityCore = hasAny(core, ["computer security", "system security", "software security", "operating system security", "cyber-physical security", "security lab", "fuzzing", "cryptography", "privacy", "secure systems", "컴퓨터 보안", "시스템 보안"]);
          if (!securityCore) return 999;
          const named = rankBy(["김슬배", "박찬익", "박지성", "박상돈"]);
          return named < 999 ? named : 60;
        }
      }

      if (hasDomain("실험 뇌과학/신경공학") && hasAny(q, ["실험", "뇌과학", "신경과학", "bci", "brain-machine", "brain machine", "신경공학", "신경전극", "neuroscience", "neuroengineering", "neural"])) {
        const medicalImagingOnly = hasAny(core, ["ultrasound engineering", "ultrasound imaging", "photoacoustic", "medical image analysis", "medical imaging"]) && !hasAny(core, ["brain-machine", "bmi", "bci", "neural engineering", "neural circuits", "neurobiology", "neuroepigenetics", "neuroimmunology", "neurogenetics"]);
        if (medicalImagingOnly) return 999;
        const neuroCore = hasAny(core, ["brain-machine", "bmi", "bci", "neural engineering", "brain probe", "neurobiology", "neural circuits", "neuroepigenetics", "neuroimmunology", "neurogenetics", "neuroscience", "신경", "뇌"]);
        if (!neuroCore) return 999;
        const named = rankBy(["강대식", "김태경", "김종신", "백승태", "김형함"]);
        return named < 999 ? named : 70;
      }

      if ((hasDomain("환경/기후/지속가능에너지") || hasDomain("환경/기후/지속가능")) && hasAny(q, ["환경", "기후", "지속가능", "탄소중립", "대기오염", "수처리", "environment", "climate", "sustainable", "carbon", "water treatment"])) {
        const environmentCore = hasAny(core, ["환경공학부", "hydroclimatology", "climate change", "climate modeling", "air pollution", "environmental health", "ocean acidification", "carbon cycle", "membrane separations", "water treatment", "wastewater", "electrocatalyst", "기후", "환경", "대기오염", "탄소", "수처리", "폐수"]);
        if (!environmentCore) return 999;
        const named = rankBy(["감종훈", "민승기", "이형주", "이기택", "송우철", "조강우"]);
        return named < 999 ? named : 70;
      }

      return 999;
    }



    // 최종 베타 테스트 V2: 상단 대표 분야 버튼과 일반 검색어에서 공식 페이지 기준 대표 교수님을 먼저 정렬합니다.
    // UI, 모바일 CSS는 건드리지 않고 기존 DB 교수님만 대상으로 작동합니다.
    function officialBetaSortRankV2(professor, query, activeDomains) {
      const q = normalize(query);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      const rankBy = (names) => finalBetaNameRank(professor, names);
      const isMedical = hasAny(q, ["의료", "medical", "mri", "초음파", "광음향", "neuroimaging"]);
      const isHydrogen = hasAny(q, ["수소", "연료전지", "수전해", "hydrogen", "fuel cell", "electrolysis"]);
      const isBattery = hasAny(q, ["배터리", "리튬", "이차전지", "전고체", "battery", "lithium", "solid-state"]);

      const rules = [
        { domains:["반도체 소자/공정"], terms:["반도체","소자","공정","박막","증착","트랜지스터","semiconductor","device","process","thin film","transistor"],
          exclude:()=>hasAny(q,["패키징","이종집적","chiplet","packaging","interconnect","디스플레이","oled","micro led","display"]),
          core:["semiconductor device","semiconductor process","silicon semiconductor","memory device","reram","dram","nanowire fet","finfet","gaa","nano devices and processing","2d semiconductor","oxide thin films","반도체","메모리","소자","공정","박막"],
          names:["황현상","백창기","이정수","이병훈","조문호","오명철","최시영","한현","노용영"] },
        { domains:["AI 반도체/VLSI"], terms:["ai 반도체","vlsi","soc","하드웨어 가속기","집적회로","회로설계","반도체 회로","integrated circuit","asic","fpga"],
          core:["vlsi","soc","integrated circuits","mixed-signal","analog ic","semiconductor circuits","circuit design","eda","hardware accelerator","power management ic","pmic","memory circuits","집적회로","회로","반도체 회로"],
          names:["강석형","이선규","김병섭","신세운","심재윤","정성웅","백창기","황현상"] },
        { domains:["반도체 패키징/이종집적","패키징/이종집적"], terms:["패키징","이종집적","chiplet","3d ic","interconnect","advanced packaging","heterogeneous integration"],
          core:["semiconductor packaging","advanced packaging","beol interconnect","chiplet","electronic packaging","heterogeneous integration","micro-led transfer","transfer printing","microassembly","die-to-die","high-speed interconnect","interconnect","인터커넥트","이종집적","패키징"],
          names:["송재용","김석","이선규","이병훈","김광선"] },
        { domains:["디스플레이"], terms:["디스플레이","display","oled","micro led","발광소자","플렉서블"],
          core:["display engineering","smart display","future display","display technology","oled","micro led","leds for illumination and display","light emitting","organic electronics","printed electronics","organic field-effect transistor","oxide semiconductor","soft electronics","디스플레이","발광"],
          names:["최수석","김욱성","노용영","김종규","조창순","노준석","정운룡"] },
        { domains:["포토닉스/광전소자"], terms:["포토닉스","광전","나노광학","레이저","광검출기","photonics","optoelectronic","photodetector","laser"],
          core:["photonics","nanophotonics","metaphotonics","metasurface","plasmonics","photodetector","photodetectors","laser","optical metamaterials","flat optics","biophotonics","thz photonics","terahertz","광센서","레이저","나노광학"],
          names:["노준석","조창순","김종환","한해욱","김기현","김윤호","신희득","최수석"] },
        { domains:["배터리/에너지","배터리/전기화학"], terms:["배터리","리튬","이차전지","전고체","전기화학","battery","lithium","solid-state"], exclude:()=>isHydrogen && !isBattery,
          core:["battery","batteries","lithium","lithium-ion","lithium battery","solid-state battery","sodium-ion battery","next-generation rechargeable","anode","cathode","electrolyte","전고체","리튬","이차전지","배터리","전극","전해질"],
          names:["강병우","조창신","박수진","최시영","김원배","조길원"] },
        { domains:["수소/연료전지/에너지변환","수소/연료전지"], terms:["수소","연료전지","수전해","hydrogen","fuel cell","electrolysis"],
          core:["hydrogen","fuel cell","electrolysis","hydrogen evolution","hydrogen storage","lohc","ammonia","p2g","water electrolysis","수소","연료전지","수전해","수소저장"],
          names:["김용태","김원배","윤창원","천동원","최창혁","조강우","홍석봉","안지환"] },
        { domains:["AI/머신러닝"], terms:["머신러닝","딥러닝","강화학습","생성형 ai","machine learning","deep learning","reinforcement learning","generative ai"],
          core:["machine learning lab","machine learning","deep learning","reinforcement learning","trustworthy ai","interactive machine learning","model compression","optimization for machine learning","large language model"],
          names:["박상돈","옥정슬","김동우","이남훈","전광성","박은혁","김형훈","유환조"] },
        { domains:["AI/컴퓨터비전","컴퓨터비전/영상인식"], terms:["컴퓨터 비전","컴퓨터비전","영상인식","객체검출","멀티모달","computer vision","object detection","visual recognition"], exclude:()=>isMedical,
          core:["computer vision lab","computer vision","machine learning and vision","visual tracking","robust vision","object detection","segmentation","visual recognition","visual matching","object discovery","action recognition","컴퓨터비전","영상인식"],
          names:["조민수","손진희","곽수하","김광인","류일우","김진태"] },
        { domains:["바이오센서/생체전자"], terms:["바이오센서","생체전자","웨어러블 센서","임플란터블","biosensor","bioelectronics","wearable","implantable"],
          core:["biosensor","bio sensor","bioelectronics","wearable","implantable","bio-medical","biomems","micro/nano devices","smart contact lens","soft wearable","hmi","bio-inspired sensors","바이오센서","웨어러블","임플란터블"],
          names:["한세광","임근배","강대식","박재성","김준원","박성민","정운룡"] },
        { domains:["실험 뇌과학/신경공학","뇌과학/BCI"], terms:["실험","뇌과학","bci","신경공학","신경전극","뇌영상","neuroscience","brain-machine","neural"],
          core:["brain-machine","bmi","bci","neural engineering","brain probe","neurobiology","neural circuits","neuroepigenetics","neuroimmunology","neurogenetics","neuroscience","신경","뇌"],
          names:["강대식","김태경","김종신","백승태","김형함"] },
        { domains:["의료영상/디지털헬스"], terms:["의료영상","디지털헬스","헬스케어","mri","medical imaging","healthcare","photoacoustic","ultrasound"],
          core:["medical image","medical imaging","medical ai","mri","diffusion mri","digital healthcare","photoacoustic","ultrasound","biomedical optics","healthcare","implantable medical device","의료영상"],
          names:["김원화","김철홍","류일우","박성민","김기현","김형함"] },
        { domains:["로봇/자율주행"], terms:["로봇","자율주행","slam","드론","모빌리티","robot","autonomous","uav","auv"],
          core:["robotics","robot learning","field robotics","auv","autonomous","bionic","exoskeleton","haptics","robot control","robotic manipulation","soft robotics","unmanned aerial vehicles","로봇","자율주행"],
          names:["유선철","안혜민","김기훈","김정훈","한수희","강대식","고제성","김진태"] },
        { domains:["HCI/AR·VR","HCI/AR·VR/디지털헬스"], terms:["hci","ar","vr","ux","인터랙션","사용자 경험","human-computer","xr"],
          core:["human-computer interaction","human-centered","interaction lab","human-ai interaction","health and human-computer interaction","xr","virtual reality","augmented reality","user experience","visual analytics","haptics"],
          names:["조은경","최승문","황인석","고성안"] },
        { domains:["양자컴퓨팅/양자정보"], terms:["양자컴퓨팅","양자정보","양자알고리즘","양자시뮬레이션","quantum computing","quantum information"],
          core:["quantum information","quantum computing","quantum algorithm","quantum communication","photonic quantum","quantum simulation","neutral atoms","ion trap","quantum network","양자컴퓨팅","양자정보"],
          names:["이승우","이문주","박지우","김윤호","신희득","박기복","박경덕"] },
        { domains:["나노소재/신소재"], terms:["나노소재","신소재","2d 소재","그래핀","표면 분석","nanomaterials","graphene","2d materials","surface analysis"],
          core:["2d materials","graphene","nanomaterials","van der waals","surface science","stem","in-situ tem","atomic scale imaging","nanophotonics","nanoelectronics","나노소재","그래핀","전자현미경","표면"],
          names:["김철주","조문호","최시영","정운룡","김종환","박형규","한현"] },
        { domains:["고분자/유기소재/소프트머터","고분자/유기소재"], terms:["고분자","유기소재","소프트머터","스마트 폴리머","polymer","soft matter"],
          core:["polymer","soft matter","organic electronics","colloids","liquid crystals","stimuli-responsive","hydrogel","biopolymer","soft materials","고분자","소프트"],
          names:["김영기","조길원","이효민","이기라","김동성","정운룡","정대성","황동수"] },
        { domains:["촉매/화학공정/유기합성","촉매/화학공정"], terms:["촉매","유기합성","반응공학","화학공정","catalysis","reaction engineering"],
          core:["catalysis","catalyst","organic synthesis","transition-metal-catalyzed","electrocatalysis","zeolite","reaction engineering","chemical process","heterogeneous catalysts","촉매","유기합성","반응공학"],
          names:["김현우","조승환","지형민","최창혁","김원배","홍석봉","조강우"] },
        { domains:["단백질/신약개발/바이오분자공학","단백질/신약개발"], terms:["단백질","신약개발","약물전달","바이오분자","protein","drug delivery","antibody"],
          core:["protein engineering","antibody","drug delivery","biomolecular","chemical biology","structural biology","nanomedicine","bioadhesive","protein design","단백질","항체","약물전달"],
          names:["차형준","이지오","권도훈","임현석","김원종","한세광","이준구"] },
        { domains:["세포/면역/분자생물학"], terms:["세포생물학","면역학","분자생물학","질병 기전","cell biology","immunology","molecular biology"],
          core:["immunology","cell biology","molecular biology","immune","microbiome","stem cell","organelle","neuroimmunology","disease","세포","면역","분자생물"],
          names:["임신혁","김광순","유주연","최세규","허윤하","김종신","백승태"] },
        { domains:["자연어처리/LLM"], terms:["자연어처리","llm","언어모델","생성형 ai","natural language","large language model"],
          core:["natural language processing","large language model","conversational ai","statistical nlp","korean language processing","spoken language processing","text mining","자연어처리","언어모델"],
          names:["김형훈","이근배","유환조"] },
        { domains:["DB/빅데이터/데이터마이닝","DB/빅데이터"], terms:["데이터베이스","빅데이터","데이터마이닝","추천시스템","database","big data","data mining","recommender"],
          core:["data intelligence","data mining","recommender systems","database systems","big data infrastructure","query processing","large-scale data","bigdata system","데이터마이닝","추천시스템"],
          names:["유환조","한욱신","전명재","이근배","김형훈"] },
        { domains:["컴퓨터시스템/운영체제","시스템/운영체제"], terms:["운영체제","분산시스템","스토리지","클라우드","operating system","distributed system","storage","cloud"],
          core:["operating systems","operating system","system software","storage system","embedded real-time operating system","large-scale systems","data-intensive computing","machine learning systems","computer architecture","cpu-gpu","distributed","cloud"],
          names:["이성진","박찬익","박지성","전명재","한욱신"] },
        { domains:["정보보안/암호"], terms:["정보보안","보안","암호","프라이버시","시스템 보안","security","cryptography","privacy"],
          core:["computer security","system security","software security","operating system security","cyber-physical security","security lab","fuzzing","cryptography","privacy","secure systems"],
          names:["김슬배","박찬익","박지성","박상돈"] },
        { domains:["전력전자/인버터"], terms:["전력전자","인버터","컨버터","전력변환","전원회로","power electronics","inverter","converter","power conversion"],
          core:["power electronics","power conversion","power management ic","pmic","inverter","converter","power integrated circuit","전력전자","전력변환","전원회로"],
          names:["채수용","신세운","김영진"] },
        { domains:["그래픽스/3D 비전"], terms:["컴퓨터 그래픽스","3d 비전","렌더링","비주얼 컴퓨팅","computer graphics","rendering","visual computing"],
          core:["computer graphics lab","computer graphics","computational imaging","computational photography","rendering","image processing","video processing","3d shape","visual computing"],
          names:["이승용","조성현","백승환","류일우"] },
        { domains:["항공우주/추진","항공우주/추진/유체"], terms:["항공우주","추진","로켓","위성","열유체","aerospace","propulsion","turbine","uav","satellite"],
          core:["gas turbine","steam turbine","jet engine","computational flow physics","fluid mechanics","aerospace","unmanned aerial vehicles","satellite communication","sar","rocket","propulsion","터빈","항공","위성"],
          names:["유동현","김진태","이상준","홍원빈","이남윤"] },
        { domains:["환경/기후/지속가능에너지","환경/기후/지속가능"], terms:["환경","기후","지속가능","탄소중립","대기오염","수처리","environment","climate","sustainable","carbon","water treatment"],
          core:["환경공학부","hydroclimatology","climate change","climate modeling","air pollution","environmental health","ocean acidification","carbon cycle","membrane separations","water treatment","wastewater","electrocatalyst","기후","환경","대기오염","탄소","수처리","폐수"],
          names:["감종훈","민승기","이형주","이기택","송우철","조강우"] }
      ];

      for (const rule of rules) {
        const active = rule.domains.some((domain) => hasDomain(domain));
        if (!active || !hasAny(q, rule.terms)) continue;
        if (rule.exclude && rule.exclude()) continue;
        if (!hasAny(core, rule.core)) return 999;
        const named = rankBy(rule.names);
        return named < 999 ? named : 80;
      }
      return 999;
    }

    function officialBetaPenaltyV2(professor, fullQuery, activeDomains) {
      const q = normalize(fullQuery);
      const core = finalBetaCoreText(professor);
      const rank = officialBetaSortRankV2(professor, fullQuery, activeDomains);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      let penalty = 0;
      const strictQueries = [
        ["디스플레이", ["디스플레이","display","oled","micro led","발광소자"]],
        ["포토닉스/광전소자", ["포토닉스","광전","나노광학","레이저","광검출기","photonics","laser"]],
        ["AI 반도체/VLSI", ["vlsi","soc","하드웨어 가속기","집적회로","회로설계"]],
        ["반도체 패키징/이종집적", ["패키징","이종집적","chiplet","interconnect"]],
        ["수소/연료전지/에너지변환", ["수소","연료전지","수전해","hydrogen","fuel cell"]],
        ["AI/머신러닝", ["머신러닝","딥러닝","강화학습","machine learning"]],
        ["자연어처리/LLM", ["자연어처리","llm","언어모델","natural language"]],
        ["전력전자/인버터", ["전력전자","인버터","전력변환","power electronics"]],
        ["그래픽스/3D 비전", ["그래픽스","렌더링","computer graphics"]]
      ];
      strictQueries.forEach(([domain, terms]) => {
        if (hasDomain(domain) && hasAny(q, terms) && rank >= 999) penalty -= 2200;
      });
      if (hasDomain("디스플레이") && hasAny(core, ["thz photonics", "terahertz", "image sensor", "pixel"]) && rank >= 999) penalty -= 1800;
      if (hasDomain("AI 반도체/VLSI") && hasAny(core, ["semiconductor device", "memory device", "2d semiconductor"]) && !hasAny(core, ["circuit", "vlsi", "soc", "integrated circuits", "pmic"])) penalty -= 700;
      if (hasDomain("배터리/에너지") && hasAny(q,["배터리","리튬","전고체"]) && hasAny(core,["fuel cell","hydrogen","photonic crystal","colloid"]) && rank >= 999) penalty -= 2300;
      if (hasDomain("단백질/신약개발/바이오분자공학") && hasAny(q,["단백질","신약","약물전달"]) && rank >= 999) penalty -= 1800;
      return penalty;
    }



    // 최종 베타 테스트 V3: 실제 상단 배너명과 내부 도메인명을 모두 고려한 대표 교수님 정렬입니다.
    function officialBetaSortRankV3(professor, query, activeDomains) {
      const q = normalize(query);
      const core = finalBetaCoreText(professor);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      const rankBy = (names) => finalBetaNameRank(professor, names);
      const direct = (terms) => hasAny(q, terms);
      const coreHit = (terms) => hasAny(core, terms);
      const rankIf = (names, terms) => {
        if (!coreHit(terms)) return 999;
        const named = rankBy(names);
        return named < 999 ? named : 80;
      };

      // Broad semiconductor must not override VLSI, packaging, display, or photonics intents.
      if ((hasDomain("AI 반도체/회로설계") || hasDomain("AI 반도체/VLSI")) && direct(["vlsi","soc","asic","fpga","하드웨어 가속기","집적회로","회로설계","반도체 회로","circuit","integrated circuit"])) {
        return rankIf(["강석형","이선규","김병섭","신세운","심재윤","정성웅","백창기","황현상"], ["vlsi","soc","integrated circuits","mixed-signal","analog ic","semiconductor circuits","circuit design","eda","hardware accelerator","power management ic","pmic","memory circuits","집적회로","회로","반도체 회로"]);
      }
      if ((hasDomain("패키징/이종집적") || hasDomain("반도체 패키징/이종집적")) && direct(["패키징","이종집적","chiplet","3d ic","interconnect","advanced packaging","heterogeneous integration"])) {
        return rankIf(["송재용","김석","이선규","이병훈","김병섭"], ["semiconductor packaging","advanced packaging","beol interconnect","chiplet","electronic packaging","heterogeneous integration","micro-led transfer","transfer printing","microassembly","die-to-die","high-speed interconnect","interconnect","인터커넥트","이종집적","패키징"]);
      }
      if ((hasDomain("디스플레이") || hasDomain("디스플레이/포토닉스/광전소자")) && direct(["디스플레이","display","oled","micro led","발광소자","플렉서블"])) {
        return rankIf(["최수석","김욱성","노용영","김종규","조창순","노준석","정운룡"], ["display engineering","smart display","future display","display technology","oled","micro led","leds for illumination and display","light emitting","organic electronics","printed electronics","organic field-effect transistor","oxide semiconductor","soft electronics","디스플레이","발광"]);
      }
      if ((hasDomain("포토닉스/광전소자") || hasDomain("디스플레이/포토닉스/광전소자")) && direct(["포토닉스","광전","나노광학","레이저","광검출기","photonics","optoelectronic","photodetector","laser"])) {
        return rankIf(["노준석","조창순","김종환","한해욱","김기현","김윤호","신희득","최수석"], ["photonics","nanophotonics","metaphotonics","metasurface","plasmonics","photodetector","photodetectors","laser","optical metamaterials","flat optics","biophotonics","thz photonics","terahertz","광센서","레이저","나노광학"]);
      }
      if (hasDomain("반도체 소자/공정") && direct(["반도체","소자","공정","박막","증착","트랜지스터","semiconductor","device","process","thin film","transistor"]) && !direct(["패키징","이종집적","chiplet","packaging","interconnect","디스플레이","oled","micro led","display","vlsi","soc","집적회로","회로설계"])) {
        return rankIf(["황현상","백창기","이정수","이병훈","조문호","오명철","최시영","한현","노용영"], ["semiconductor device","semiconductor process","silicon semiconductor","memory device","reram","dram","nanowire fet","finfet","gaa","nano devices and processing","2d semiconductor","oxide thin films","반도체","메모리","소자","공정","박막"]);
      }

      if (hasDomain("배터리/에너지") && direct(["배터리","리튬","이차전지","전고체","전기화학","battery","lithium","solid-state"]) && !(direct(["수소","연료전지","수전해","hydrogen","fuel cell"]) && !direct(["배터리","리튬","전고체","battery","lithium"]))) {
        return rankIf(["강병우","조창신","박수진","최시영","김원배","조길원"], ["battery","batteries","lithium","lithium-ion","lithium battery","solid-state battery","sodium-ion battery","next-generation rechargeable","anode","cathode","electrolyte","전고체","리튬","이차전지","배터리","전극","전해질"]);
      }
      if ((hasDomain("수소/연료전지/에너지변환") || hasDomain("수소/연료전지")) && direct(["수소","연료전지","수전해","hydrogen","fuel cell","electrolysis"])) {
        return rankIf(["김용태","김원배","윤창원","천동원","최창혁","조강우","홍석봉","안지환"], ["hydrogen","fuel cell","electrolysis","hydrogen evolution","hydrogen storage","lohc","ammonia","p2g","water electrolysis","수소","연료전지","수전해","수소저장"]);
      }

      // Generic ML banner should stay ML-focused even when the phrase includes 생성형 AI.
      if (direct(["머신러닝","딥러닝","강화학습","machine learning","deep learning","reinforcement learning"]) && !direct(["자연어처리","llm","언어모델","natural language processing","language model"]) && !direct(["의료영상","디지털헬스","헬스케어","medical","mri","healthcare","광음향","초음파"])) {
        return rankIf(["박상돈","옥정슬","김동우","이남훈","전광성","박은혁","김형훈","유환조"], ["machine learning lab","machine learning","deep learning","reinforcement learning","trustworthy ai","interactive machine learning","model compression","optimization for machine learning","large language model"]);
      }
      if ((hasDomain("AI/컴퓨터비전") || hasDomain("컴퓨터비전/영상인식")) && direct(["컴퓨터 비전","컴퓨터비전","영상인식","객체검출","멀티모달","computer vision","object detection","visual recognition"]) && !direct(["의료영상","medical","mri","초음파","광음향","neuroimaging"])) {
        return rankIf(["조민수","손진희","곽수하","김광인","류일우","김진태"], ["computer vision lab","computer vision","machine learning and vision","visual tracking","robust vision","object detection","segmentation","visual recognition","visual matching","object discovery","action recognition","컴퓨터비전","영상인식"]);
      }
      if (hasDomain("자연어처리/LLM") && direct(["자연어처리","llm","언어모델","생성형 ai","natural language","large language model"])) {
        return rankIf(["김형훈","이근배","유환조"], ["natural language processing","large language model","conversational ai","statistical nlp","korean language processing","spoken language processing","text mining","자연어처리","언어모델"]);
      }
      if ((hasDomain("데이터베이스/빅데이터") || hasDomain("DB/빅데이터/데이터마이닝") || hasDomain("DB/빅데이터")) && direct(["데이터베이스","빅데이터","데이터마이닝","추천시스템","database","big data","data mining","recommender"])) {
        return rankIf(["유환조","한욱신","전명재","이근배","김형훈"], ["data intelligence","data mining","recommender systems","database systems","big data infrastructure","query processing","large-scale data","bigdata system","데이터마이닝","추천시스템"]);
      }
      if (hasDomain("컴퓨터시스템/운영체제") && direct(["운영체제","분산시스템","스토리지","클라우드","operating system","distributed system","storage","cloud"])) {
        return rankIf(["이성진","박찬익","박지성","전명재","한욱신"], ["operating systems","operating system","system software","storage system","embedded real-time operating system","large-scale systems","data-intensive computing","machine learning systems","computer architecture","cpu-gpu","distributed","cloud"]);
      }
      if (hasDomain("정보보안/암호") && direct(["정보보안","보안","암호","프라이버시","시스템 보안","security","cryptography","privacy"])) {
        return rankIf(["김슬배","박찬익","박지성","박상돈"], ["computer security","system security","software security","operating system security","cyber-physical security","security lab","fuzzing","cryptography","privacy","secure systems"]);
      }
      if ((hasDomain("전력전자/전력변환") || hasDomain("전력전자/인버터")) && direct(["전력전자","인버터","컨버터","전력변환","전원회로","power electronics","inverter","converter","power conversion"])) {
        return rankIf(["채수용","신세운","김영진"], ["power electronics","power conversion","power management ic","pmic","inverter","converter","power integrated circuit","전력전자","전력변환","전원회로"]);
      }
      if ((hasDomain("컴퓨터그래픽스/비주얼컴퓨팅") || hasDomain("그래픽스/3D 비전")) && direct(["컴퓨터 그래픽스","그래픽스","3d 비전","렌더링","비주얼 컴퓨팅","computer graphics","rendering","visual computing"])) {
        return rankIf(["이승용","조성현","백승환","류일우"], ["computer graphics lab","computer graphics","computational imaging","computational photography","rendering","image processing","video processing","3d shape","visual computing"]);
      }

      if ((hasDomain("생체 소자/바이오센서") || hasDomain("바이오센서/생체전자")) && direct(["바이오센서","생체전자","웨어러블 센서","임플란터블","biosensor","bioelectronics","wearable","implantable"])) {
        return rankIf(["한세광","임근배","강대식","박재성","김준원","박성민","정운룡"], ["biosensor","bio sensor","bioelectronics","wearable","implantable","bio-medical","biomems","micro/nano devices","smart contact lens","soft wearable","hmi","bio-inspired sensors","바이오센서","웨어러블","임플란터블"]);
      }
      if (hasDomain("실험 뇌과학/신경공학") && direct(["실험","뇌과학","bci","신경공학","신경전극","뇌영상","neuroscience","brain-machine","neural"])) {
        return rankIf(["강대식","김태경","김종신","백승태","김형함"], ["brain-machine","bmi","bci","neural engineering","brain probe","neurobiology","neural circuits","neuroepigenetics","neuroimmunology","neurogenetics","neuroscience","신경","뇌"]);
      }
      if (hasDomain("의료영상/디지털헬스") && direct(["의료영상","디지털헬스","헬스케어","mri","medical imaging","healthcare","photoacoustic","ultrasound"])) {
        return rankIf(["김원화","김철홍","류일우","박성민","김기현","김형함"], ["medical image","medical imaging","medical ai","mri","diffusion mri","digital healthcare","photoacoustic","ultrasound","biomedical optics","healthcare","implantable medical device","의료영상"]);
      }
      if (hasDomain("로봇/제어/자율주행") && direct(["로봇","자율주행","slam","드론","모빌리티","robot","autonomous","uav","auv"])) {
        return rankIf(["유선철","안혜민","김기훈","김정훈","한수희","강대식","고제성","김진태"], ["robotics","robot learning","field robotics","auv","autonomous","bionic","exoskeleton","haptics","robot control","robotic manipulation","soft robotics","unmanned aerial vehicles","로봇","자율주행"]);
      }
      if (hasDomain("HCI/AR·VR/디지털헬스") && direct(["hci","ar","vr","ux","인터랙션","사용자 경험","human-computer","xr"])) {
        return rankIf(["조은경","최승문","황인석","고성안"], ["human-computer interaction","human-centered","interaction lab","human-ai interaction","health and human-computer interaction","xr","virtual reality","augmented reality","user experience","visual analytics","haptics"]);
      }
      if (hasDomain("양자컴퓨팅/양자정보") && direct(["양자컴퓨팅","양자정보","양자알고리즘","양자시뮬레이션","quantum computing","quantum information"])) {
        return rankIf(["이승우","이문주","박지우","김윤호","신희득","박기복","박경덕"], ["quantum information","quantum computing","quantum algorithm","quantum communication","photonic quantum","quantum simulation","neutral atoms","ion trap","quantum network","양자컴퓨팅","양자정보"]);
      }
      if (hasDomain("나노소재/신소재") && direct(["나노소재","신소재","2d 소재","그래핀","표면 분석","nanomaterials","graphene","2d materials","surface analysis"])) {
        return rankIf(["김철주","조문호","최시영","정운룡","김종환","박형규","한현"], ["2d materials","graphene","nanomaterials","van der waals","surface science","stem","in-situ tem","atomic scale imaging","nanophotonics","nanoelectronics","나노소재","그래핀","전자현미경","표면"]);
      }
      if (hasDomain("고분자/유기소재/소프트머터") && direct(["고분자","유기소재","소프트머터","스마트 폴리머","polymer","soft matter"])) {
        return rankIf(["김영기","조길원","이효민","이기라","김동성","정운룡","정대성","황동수"], ["polymer","soft matter","organic electronics","colloids","liquid crystals","stimuli-responsive","hydrogel","biopolymer","soft materials","고분자","소프트"]);
      }
      if (hasDomain("화학/촉매/유기합성") && direct(["촉매","유기합성","반응공학","화학공정","catalysis","reaction engineering"])) {
        return rankIf(["김현우","조승환","지형민","최창혁","김원배","홍석봉","조강우"], ["catalysis","catalyst","organic synthesis","transition-metal-catalyzed","electrocatalysis","zeolite","reaction engineering","chemical process","heterogeneous catalysts","촉매","유기합성","반응공학"]);
      }
      if (hasDomain("단백질/신약개발/약물전달") && direct(["단백질","신약개발","약물전달","바이오분자","protein","drug delivery","antibody"])) {
        return rankIf(["차형준","이지오","권도훈","임현석","김원종","한세광","이준구"], ["protein engineering","antibody","drug delivery","biomolecular","chemical biology","structural biology","nanomedicine","bioadhesive","protein design","단백질","항체","약물전달"]);
      }
      if (hasDomain("세포/분자생물학") && direct(["세포생물학","면역학","분자생물학","질병 기전","cell biology","immunology","molecular biology"])) {
        return rankIf(["임신혁","김광순","유주연","최세규","허윤하","김종신","백승태"], ["immunology","cell biology","molecular biology","immune","microbiome","stem cell","organelle","neuroimmunology","disease","세포","면역","분자생물"]);
      }
      if (hasDomain("항공우주/추진/위성") && direct(["항공우주","추진","로켓","위성","열유체","aerospace","propulsion","turbine","uav","satellite"])) {
        return rankIf(["유동현","김진태","이상준","홍원빈","이남윤"], ["gas turbine","steam turbine","jet engine","computational flow physics","fluid mechanics","aerospace","unmanned aerial vehicles","satellite communication","sar","rocket","propulsion","터빈","항공","위성"]);
      }
      if (hasDomain("환경/기후/지속가능에너지") && direct(["환경","기후","지속가능","탄소중립","대기오염","수처리","environment","climate","sustainable","carbon","water treatment"])) {
        return rankIf(["감종훈","민승기","이형주","이기택","송우철","조강우"], ["환경공학부","hydroclimatology","climate change","climate modeling","air pollution","environmental health","ocean acidification","carbon cycle","membrane separations","water treatment","wastewater","electrocatalyst","기후","환경","대기오염","탄소","수처리","폐수"]);
      }
      return 999;
    }

    function officialBetaPenaltyV3(professor, fullQuery, activeDomains) {
      const q = normalize(fullQuery);
      const rank = officialBetaSortRankV3(professor, fullQuery, activeDomains);
      const hasDomain = (name) => activeDomains.some((domain) => domain.name === name || String(domain.name || "").includes(name));
      let penalty = 0;
      if (hasDomain("AI 반도체/회로설계") && hasAny(q,["vlsi","soc","회로설계","집적회로"]) && rank >= 999) penalty -= 2600;
      if (hasDomain("컴퓨터그래픽스/비주얼컴퓨팅") && hasAny(q,["그래픽스","렌더링","computer graphics"]) && rank >= 999) penalty -= 2200;
      if (hasDomain("전력전자/전력변환") && hasAny(q,["전력전자","인버터","전력변환"]) && rank >= 999) penalty -= 2600;

      if ((hasDomain("패키징/이종집적") || hasDomain("반도체 패키징/이종집적")) && hasAny(q,["패키징","이종집적","chiplet","interconnect","advanced packaging","die-to-die"]) && rank >= 999) penalty -= 2600;
      if ((hasDomain("패키징/이종집적") || hasDomain("반도체 패키징/이종집적")) && hasAny(q,["패키징","이종집적","chiplet","interconnect","advanced packaging","die-to-die"]) && hasAny(finalBetaCoreText(professor),["organic electronics","perovskite transistor","organic field-effect transistor","printed electronics"]) && !hasAny(finalBetaCoreText(professor),["heterogeneous integration","packaging","interconnect","die-to-die","micro-led transfer"])) penalty -= 3200;
      if (hasDomain("디스플레이") && hasAny(q,["디스플레이","oled","micro led"]) && rank >= 999) penalty -= 1800;
      if (hasDomain("화학/촉매/유기합성") && hasAny(q,["촉매","유기합성"]) && rank >= 999) penalty -= 1600;
      if (hasDomain("단백질/신약개발/약물전달") && hasAny(q,["단백질","신약","약물전달"]) && rank >= 999) penalty -= 1800;
      return penalty;
    }

    function recommend(query, limit = 8, mode = "precise") {
      const filters = getCurrentFilters();
      const fullQueryForIntent = combinedQuery(query);
      const activeDomains = getActiveDomains(fullQueryForIntent);
      const preciseIntentRule = detectPostechPreciseIntent(query);
      let minScore = activeDomains.length ? 420 : 1;
      if (activeDomains.some((domain) => domain.name === "통신/RF/무선" || domain.name === "통신/RF")) minScore = Math.min(minScore, 300);
      if (activeDomains.some((domain) => domain.name === "배터리/에너지")) minScore = Math.min(minScore, 300);
      if (preciseIntentRule) minScore = 1;
      const base = shouldUseContext(query) && state.lastResults.length
        ? state.lastResults.map((item) => item.professor)
        : professors;

      let scored = base
        .map((professor) => scoreProfessor(professor, query, filters))
        .map((item) => applyPostechPreciseIntent(item, preciseIntentRule, query))
        .filter((item) => item.score >= minScore);

      if (preciseIntentRule) {
        // 세부 intent가 잡히면 결과를 직접 관련(Tier A/B)과 인접 분야(Tier C)로 분리한다.
        // 기본 화면에는 Tier A/B만 보여 주고, Tier C는 사용자가 별도 버튼을 눌렀을 때만 보여 준다.
        return postechBuildTieredResults(scored, preciseIntentRule, query, limit, mode);
      }

      scored = scored.sort((a, b) => {
          const officialBetaRankV3A = officialBetaSortRankV3(a.professor, query, activeDomains);
          const officialBetaRankV3B = officialBetaSortRankV3(b.professor, query, activeDomains);
          if (officialBetaRankV3A !== officialBetaRankV3B && Math.min(officialBetaRankV3A, officialBetaRankV3B) < 999) {
            return officialBetaRankV3A - officialBetaRankV3B;
          }
          const officialBetaRankV2A = officialBetaSortRankV2(a.professor, query, activeDomains);
          const officialBetaRankV2B = officialBetaSortRankV2(b.professor, query, activeDomains);
          if (officialBetaRankV2A !== officialBetaRankV2B && Math.min(officialBetaRankV2A, officialBetaRankV2B) < 999) {
            return officialBetaRankV2A - officialBetaRankV2B;
          }
          const googleVerifiedRankA = googleVerifiedSortRank(a.professor, query, activeDomains);
          const googleVerifiedRankB = googleVerifiedSortRank(b.professor, query, activeDomains);
          if (googleVerifiedRankA !== googleVerifiedRankB && Math.min(googleVerifiedRankA, googleVerifiedRankB) < 999) {
            return googleVerifiedRankA - googleVerifiedRankB;
          }
          const bookletRankA = bookletEvidenceSortRank(a.professor, query, activeDomains);
          const bookletRankB = bookletEvidenceSortRank(b.professor, query, activeDomains);
          if (bookletRankA !== bookletRankB && Math.min(bookletRankA, bookletRankB) < 999) {
            return bookletRankA - bookletRankB;
          }
          const finalBetaRankV3A = finalBetaSortRankV3(a.professor, query, activeDomains);
          const finalBetaRankV3B = finalBetaSortRankV3(b.professor, query, activeDomains);
          if (finalBetaRankV3A !== finalBetaRankV3B && Math.min(finalBetaRankV3A, finalBetaRankV3B) < 999) {
            return finalBetaRankV3A - finalBetaRankV3B;
          }
          const finalBetaRankV2A = finalBetaSortRankV2(a.professor, query, activeDomains);
          const finalBetaRankV2B = finalBetaSortRankV2(b.professor, query, activeDomains);
          if (finalBetaRankV2A !== finalBetaRankV2B && Math.min(finalBetaRankV2A, finalBetaRankV2B) < 999) {
            return finalBetaRankV2A - finalBetaRankV2B;
          }
          const finalBetaRankA = finalBetaSortRank(a.professor, query, activeDomains);
          const finalBetaRankB = finalBetaSortRank(b.professor, query, activeDomains);
          if (finalBetaRankA !== finalBetaRankB && Math.min(finalBetaRankA, finalBetaRankB) < 999) {
            return finalBetaRankA - finalBetaRankB;
          }
          const hydrogenRankA = hydrogenSortRank(a.professor, query, activeDomains);
          const hydrogenRankB = hydrogenSortRank(b.professor, query, activeDomains);
          if (hydrogenRankA !== hydrogenRankB && Math.min(hydrogenRankA, hydrogenRankB) < 999) {
            return hydrogenRankA - hydrogenRankB;
          }
          const controlRankA = controlSortRank(a.professor, query, activeDomains);
          const controlRankB = controlSortRank(b.professor, query, activeDomains);
          if (controlRankA !== controlRankB && Math.min(controlRankA, controlRankB) < 999) {
            return controlRankA - controlRankB;
          }
          const hciRankA = hciSortRank(a.professor, query, activeDomains);
          const hciRankB = hciSortRank(b.professor, query, activeDomains);
          if (hciRankA !== hciRankB && Math.min(hciRankA, hciRankB) < 999) {
            return hciRankA - hciRankB;
          }
          const batteryRankA = batterySortRank(a.professor, query, activeDomains);
          const batteryRankB = batterySortRank(b.professor, query, activeDomains);
          if (batteryRankA !== batteryRankB && Math.min(batteryRankA, batteryRankB) < 999) {
            return batteryRankA - batteryRankB;
          }
          const commRankA = communicationSortRank(a.professor, query, activeDomains);
          const commRankB = communicationSortRank(b.professor, query, activeDomains);
          if (commRankA !== commRankB && Math.min(commRankA, commRankB) < 999) {
            return commRankA - commRankB;
          }
          const precisionRankA = precisionSortRank(a.professor, query, activeDomains);
          const precisionRankB = precisionSortRank(b.professor, query, activeDomains);
          if (precisionRankA !== precisionRankB && Math.min(precisionRankA, precisionRankB) < 999) {
            return precisionRankA - precisionRankB;
          }
          const homepagePriority = resultSortPriority(b) - resultSortPriority(a);
          if (homepagePriority) return homepagePriority;
          const representativeRankA = representativeSortRank(a.professor, query);
          const representativeRankB = representativeSortRank(b.professor, query);
          if (representativeRankA !== representativeRankB && Math.min(representativeRankA, representativeRankB) < 999) {
            return representativeRankA - representativeRankB;
          }
          return b.score - a.score || a.professor.professor.localeCompare(b.professor.professor, "ko");
        });

      const tightened = tightenResultsByInternalIntent(scored, query, minScore);
      return attachPostechTieredMetadata(tightened.slice(0, limit), [], null, mode);
    }

    function shouldUseContext(query) {
      const q = normalize(query);
      if (!state.lastResults.length) return false;
      return ["그중", "그 중", "이 중", "비교", "누가 더", "취업", "실험", "이론", "가까운"].some((word) => q.includes(normalize(word)));
    }

    function bestFor(item) {
      const tags = item.professor.intentTags || [];
      const fieldText = normalize((item.professor.fields || []).join(" "));
      if (tags.includes("반도체 소자/공정/박막")) return "반도체 소자, 공정, 박막, 소재 분야를 희망하는 학생";
      if (tags.includes("반도체 회로/SoC/AI하드웨어")) return "회로설계, SoC, AI 하드웨어 분야를 희망하는 학생";
      if (tags.includes("전력전자/전력변환/전력무결성")) return "전력전자, 인버터, 전원회로 분야를 희망하는 학생";
      if (tags.includes("신호처리/음성/영상/멀티미디어")) return "신호처리, 음성, 영상, 멀티미디어 분야를 희망하는 학생";
      if (tags.includes("HCI/UX/ARVR/디지털헬스")) return "HCI, UX, AR/VR, 디지털 헬스 분야를 희망하는 학생";
      if (tags.includes("유전체/계산생물학/바이오정보학")) return "유전체, 오믹스, 계산생물학 분석을 원하는 학생";
      if (tags.includes("뇌/신경/인지/BCI")) return "뇌공학, 신경공학, BCI 분야를 희망하는 학생";
      if (tags.includes("양자/물리/광학/천문")) return "양자, 물리, 광학 기반 연구를 원하는 학생";
      if (fieldText.includes("machine learning") || fieldText.includes("인공지능")) return "AI와 데이터 기반 연구를 원하는 학생";
      return "입력한 연구분야와 세부전공 적합도가 높은 학생";
    }

    function cautionFor(item) {
      const p = item.professor;
      const notes = [];
      if ((p.units || []).length > 1) notes.push("여러 소속에 함께 등록되어 있으므로 지원 가능 학과와 지도 가능 여부를 확인해야 합니다.");
      if (!p.homepage) notes.push("홈페이지 링크가 미등록되어 있으므로 학과 공식 페이지를 추가로 확인해야 합니다.");
      if (item.matched.length <= 2) notes.push("매칭 키워드가 적으므로 세부 분야를 더 구체화해 다시 검색하는 것을 권장합니다.");
      return notes[0] || "최종 지원 전 공식 홈페이지에서 최근 연구주제와 학생 모집 여부를 확인해야 합니다.";
    }

    const KOREAN_NAME_MAP = {
      "Song Ih Ahn": "안송이",
      "Choongsik Bae": "배중면",
      "Gi-Dong Sim": "심기동",
      "Inkyu Park": "박인규",
      "Ki-Uk Kyung": "경기욱",
      "Hae-Won Park": "박해원",
      "Miso Kim": "김미소",
      "Kuk-Jin Yoon": "윤국진",
      "Sanha Kim": "김산하",
      "Youngsuk Nam": "남영석",
      "Taek-Soo Kim": "김택수",
      "Hyoungsoo Kim": "김형수",
      "Seong Su Kim": "김성수",
      "Wonju Jeon": "전원주",
      "Hongki Yoo": "유홍기",
      "Jung Kim": "김정",
      "Minkyun Noh": "노민균",
      "Kyung-Soo Kim": "김경수",
      "HyungSoon Park": "박형순",
      "Ilkwon Oh": "오일권",
      "Je Min Hwangbo": "황보제민",
      "Donguk Nam": "남동욱",
      "Jitae Kim": "김지태",
      "Seunghwa Ryu": "류승화",
      "Seungbum Koo": "구승범",
      "Kyoungchul Kong": "공경철",
      "Sukyung Park": "박수경",
      "Doo Yong Lee": "이두용",
      "IkJin Lee": "이익진",
      "Hyun Jin Kim": "김현진",
      "Seungchul Lee": "이승철",
      "Nam Il Kim": "김남일",
      "Seibum Choi": "최세범",
      "Jungchul Lee": "이정철",
      "Yong Jin Yoon": "윤용진",
      "Joonsik Hwang": "황준식",
      "WangYuhl Oh": "오왕열",
      "Joonsang Kang": "강준상",
      "Yeunwoo Cho": "조연우",
      "Daegyoum Kim": "김대겸",
      "Yong-Hwa Park": "박용화",
      "Young-Jin Kim": "김영진",
      "Christopher D. Fiorillo": "크리스토퍼 피오릴로",
      "Rajib Schubert": "라집 슈베르트"
    };

    function displayProfessorName(name) {
      const raw = String(name || "").trim();
      const mapped = KOREAN_NAME_MAP[raw] || raw;
      const text = mapped.replace(/\s*\([^)]*\)\s*$/g, "").trim();
      if (!text) return "교수님 정보 미기재";
      return /교수님$/.test(text) ? text : `${text.replace(/\s*교수$/, "")} 교수님`;
    }

    function fitLabel(score) {
      if (score >= 800) return "대표 연구실";
      if (score >= 420) return "강한 관련 후보";
      if (score >= 180) return "관련 후보";
      return "세부 확인 필요";
    }


    function hasKorean(text) {
      return /[가-힣]/.test(String(text || ""));
    }

    function stripDisplayParentheses(text) {
      let value = String(text || "").replace(/…/g, "").replace(/\.\.\./g, "").trim();
      if (hasKorean(value)) {
        value = value.replace(/\s*\([^)]*\)?\s*$/g, "");
      }
      return value.replace(/\(([^)]*)\)/g, (match, inside) => {
        const outside = value.replace(match, "");
        return hasKorean(outside) ? "" : ` ${inside}`;
      }).replace(/\s+/g, " ").trim();
    }

    function splitDisplayPhrases(value) {
      const cleaned = stripDisplayParentheses(value);
      if (!cleaned) return [];
      return cleaned
        .split(/[,;，、]+/)
        .map((part) => part.trim().replace(/\s+/g, " "))
        .filter((part) => part.length >= 2);
    }

    function displayCanonicalKey(text) {
      let key = normalize(stripDisplayParentheses(text))
        .replace(/\bdevices\b/g, "device")
        .replace(/\btransistors\b/g, "transistor")
        .replace(/\bmemories\b/g, "memory")
        .replace(/\bmaterials\b/g, "material")
        .replace(/\band\b/g, " ")
        .replace(/및|와|과|의/g, " ")
        .replace(/[()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const replacements = [
        [/semiconductor process|semiconductor fabrication|fabrication process|반도체 공정|공정 기술/g, "반도체 공정"],
        [/semiconductor device|반도체 소자/g, "반도체 소자"],
        [/2d semiconductor|two dimensional semiconductor|2차원 반도체/g, "2d 반도체"],
        [/graphene|그래핀/g, "그래핀"],
        [/2d device|2d 소자/g, "2d 소자"],
        [/optoelectronic device|optoelectronics|photodetector|광전기 소자|광전자 소자/g, "광전기 소자"],
        [/neuromorphic device|neuromorphic|뉴로모픽 소자|뉴로모픽/g, "뉴로모픽 소자"],
        [/flexible electronics|flexible electronic|플렉서블 일렉트로닉스/g, "플렉서블 일렉트로닉스"],
        [/memory device|memory|메모리 소자|메모리/g, "메모리"],
        [/transistor technologies|transistor technology|transistor|트랜지스터/g, "트랜지스터"],
        [/thin film|박막/g, "박막"],
        [/vlsi|very large scale integration/g, "vlsi"],
        [/soc|system on chip/g, "soc"],
        [/power electronics|전력전자/g, "전력전자"],
        [/power converter|전력변환/g, "전력변환"],
        [/inverter|인버터/g, "인버터"],
        [/photonics|포토닉스/g, "포토닉스"],
        [/display|디스플레이/g, "디스플레이"],
        [/quantum computing|양자컴퓨팅/g, "양자컴퓨팅"],
      ];
      replacements.forEach(([pattern, replacement]) => {
        key = key.replace(pattern, replacement);
      });
      return key.replace(/\s+/g, " ").trim();
    }

    function displayDuplicateScore(keyA, keyB) {
      if (!keyA || !keyB) return 0;
      if (keyA === keyB) return 1;
      const [shorter, longer] = keyA.length <= keyB.length ? [keyA, keyB] : [keyB, keyA];
      if (shorter.length >= 4 && longer.includes(shorter) && shorter.length / longer.length >= 0.62) return 0.9;
      const tokensA = new Set(keyA.split(" ").filter((token) => token.length >= 2));
      const tokensB = new Set(keyB.split(" ").filter((token) => token.length >= 2));
      if (!tokensA.size || !tokensB.size) return 0;
      let overlap = 0;
      tokensA.forEach((token) => {
        if (tokensB.has(token)) overlap += 1;
      });
      return overlap / Math.min(tokensA.size, tokensB.size);
    }

    function preferDisplayText(current, next) {
      const currentHasKorean = hasKorean(current);
      const nextHasKorean = hasKorean(next);
      if (nextHasKorean && !currentHasKorean) return next;
      if (next.length < current.length * 0.75) return next;
      return current;
    }

    function dedupeDisplayItems(items, maxItems = 9) {
      const values = [];
      (items || []).forEach((item) => {
        splitDisplayPhrases(item).forEach((part) => values.push(part));
      });

      const selected = [];
      const keys = [];
      values.forEach((value) => {
        const key = displayCanonicalKey(value);
        if (!key || key.length < 2) return;
        const duplicateIndex = keys.findIndex((existingKey) => displayDuplicateScore(key, existingKey) >= 0.8);
        if (duplicateIndex >= 0) {
          selected[duplicateIndex] = preferDisplayText(selected[duplicateIndex], value);
          keys[duplicateIndex] = displayCanonicalKey(selected[duplicateIndex]);
          return;
        }
        selected.push(value);
        keys.push(key);
      });
      return selected.slice(0, maxItems);
    }

    function displayListText(items, fallback, maxItems = 4) {
      const values = dedupeDisplayItems(items, maxItems);
      return values.length ? values.join(", ") : fallback;
    }

    function displayFieldText(lab) {
      return displayListText(lab.fields || [], "연구분야 미기재", 9);
    }


    function cleanPublicSummarySource(text) {
      let value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value) return "";
      value = value.replace(/\.\.\./g, "…");
      value = value.replace(/,?\s*추천\s*매칭에서는.*$/g, "");
      value = value.replace(/,?\s*추천\s*결과에서는.*$/g, "");
      value = value.replace(/\s*관심\s*학생에게\s*우선\s*연결.*$/g, "");
      value = value.replace(/\s*우선\s*연결.*$/g, "");
      value = value.replace(/분야를\s*중심으로\s*연구하며\s*$/g, "분야를 중심으로 연구합니다");
      value = value.replace(/분야를\s*중심으로\s*연구하며\s*,?\s*$/g, "분야를 중심으로 연구합니다");
      value = value.replace(/연구와\s*직접\s*연결된다\.?$/g, "연구를 수행합니다.");
      value = value.replace(/연구와\s*연결된다\.?$/g, "연구를 수행합니다.");
      value = value.replace(/와\s*직접\s*연결된다\.?$/g, "와 관련됩니다.");
      value = value.replace(/와\s*연결된다\.?$/g, "와 관련됩니다.");
      value = value.replace(/….*$/g, "").replace(/\s+/g, " ").trim();
      value = value.replace(/[,.，、;:]+$/g, "").trim();
      if (value && !/[.!?。다]$/.test(value)) value += ".";
      return value;
    }

    function buildPublicDetailSummary(lab, fieldText) {
      const rawField = cleanPublicSummarySource(fieldText || (lab.fields || []).join(", ") || "");
      if (!rawField || rawField === "연구분야 미기재") {
        const rawSummary = cleanPublicSummarySource(lab.summary || (lab.summaries || [])[0] || "");
        return rawSummary;
      }
      const professorLabel = String(displayProfessorName(lab.professor || "해당 교수님")).replace(/\s*교수님\s*$/g, "").replace(/\s*교수\s*$/g, "").trim();
      return `${professorLabel} 교수님은 ${rawField} 분야를 중심으로 연구합니다.`;
    }

    function primaryReason(item) {
      const matched = (item.matched || []).slice(0, 2).join(", ");
      if (item.reasons && item.reasons.length) {
        return item.reasons[0]
          .replace("분야와 직접 연결됨", "분야와 직접적으로 연결됩니다")
          .replace("연구 성향에 적합함", "선택한 연구 스타일과 잘 맞습니다");
      }
      if (matched) return `${matched} 키워드와 연구 분야가 연결됩니다.`;
      return "입력한 관심 분야와 연구 키워드가 연결됩니다.";
    }

    function renderLabCard(item, index, compact = false) {
      const lab = item.professor;
      const homepageUrl = getPrimaryHomepage(lab);
      const homepage = homepageUrl ? `<a class="action-link primary-link" href="${escapeHtml(homepageUrl)}" target="_blank" rel="noreferrer">홈페이지 보기</a>` : `<span class="action-link disabled-link">홈페이지 미등록</span>`;
      const profile = lab.profileUrl ? `<a class="action-link" href="${escapeHtml(lab.profileUrl)}" target="_blank" rel="noreferrer">공식 프로필</a>` : "";
      const unitText = displayListText(lab.unitLabels || [], "소속 미기재", 4);
      const labNameText = displayListText(lab.labNames || [], "", 3);
      const metaText = labNameText ? `${unitText} · ${labNameText}` : unitText;
      const fieldText = displayFieldText(lab);
      const tags = (lab.intentTags || []).slice(0, 3).map((tag) => `<span class="small-tag">${escapeHtml(tag)}</span>`).join("");
      const matched = (item.matched || []).slice(0, 6).map((tag) => `<span class="small-tag matched-tag-visible">${escapeHtml(tag)}</span>`).join("");
      const matchEvidence = buildMatchEvidenceText(item);
      const summary = buildPublicDetailSummary(lab, fieldText);
      const detailId = `detail-${escapeHtml(lab.id || index)}`;
      return `
        <article class="lab-card" data-lab-id="${escapeHtml(lab.id)}">
          <div class="lab-top">
            <div>
              <h3>${index + 1}. ${escapeHtml(displayProfessorName(lab.professor))}</h3>
              <div class="lab-meta">${escapeHtml(metaText)}</div>
            </div>

          </div>
          <p class="note core-field"><strong>핵심 연구분야</strong> ${escapeHtml(fieldText)}</p>
          ${matchEvidence ? `<p class="note match-evidence"><strong>매칭 근거</strong> ${escapeHtml(matchEvidence)}</p>` : ""}
          <div class="tag-list compact-tags">${tags}</div>
          <div class="card-actions">${homepage}${profile}</div>
          ${compact ? "" : `
            <details class="card-details" id="${detailId}">
              <summary>자세히 보기</summary>
              ${summary ? `<p class="note">${escapeHtml(summary).slice(0, 260)}</p>` : ""}
              <p class="note"><strong>적합한 학생</strong> ${escapeHtml(bestFor(item))}</p>
              <p class="note"><strong>확인 필요 사항</strong> ${escapeHtml(cautionFor(item))}</p>
              ${matched ? `<div class="tag-list matched-tags"><span class="detail-label">매칭 키워드</span>${matched}</div>` : ""}
            </details>
          `}
        </article>
      `;
    }

    function renderComparison(results) {
      const top = results.slice(0, 3);
      if (top.length < 2) return "";
      const rows = top.map((item, index) => {
        const p = item.professor;
        return `
          <tr>
            <td>${index + 1}. ${escapeHtml(displayProfessorName(p.professor))}</td>
            <td>${escapeHtml((p.fields || []).slice(0, 2).join(" / "))}</td>
            <td>${escapeHtml(bestFor(item))}</td>
            <td>${escapeHtml(cautionFor(item))}</td>
          </tr>
        `;
      }).join("");
      return `
        <table class="compare-table">
          <thead><tr><th>후보</th><th>핵심 연구분야</th><th>적합한 학생</th><th>확인 필요 사항</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    function buildAnswer(query, results, visibleCount = INITIAL_RESULT_COUNT) {
      if (!results.length) {
        const adjacentWhenEmpty = (results && results._adjacentResults) || [];
        const metaWhenEmpty = (results && results._tieredMeta) || {};
        const adjacentButton = adjacentWhenEmpty.length ? `
          <div class="result-count-note">직접 관련 후보는 찾지 못했습니다. 다만 ${escapeHtml(metaWhenEmpty.intentLabel || "입력 분야")}와 가까운 인접 분야 후보 ${adjacentWhenEmpty.length}명을 따로 확인할 수 있습니다.</div>
          <div class="load-more-wrap">
            <button class="load-more-button" id="showAdjacentResults" type="button">인접 분야 교수님 보기</button>
          </div>
          ${state.showAdjacentResults ? renderAdjacentSection(adjacentWhenEmpty, metaWhenEmpty) : ""}
        ` : "";
        return `
          <h3>조건에 적합한 후보를 찾지 못했습니다.</h3>
          <p>검색어를 조금 넓혀 다시 입력해 주세요. 예를 들어 “반도체 공정” 대신 “반도체 소자, 박막, 공정”처럼 관련 키워드를 함께 입력하면 추천 정확도가 높아집니다.</p>
          ${adjacentButton}
        `;
      }

      const meta = (results && results._tieredMeta) || {};
      const adjacentResults = (results && results._adjacentResults) || [];
      const safeVisibleCount = Math.max(INITIAL_RESULT_COUNT, Math.min(visibleCount, results.length));
      const visible = results.slice(0, safeVisibleCount);
      const remaining = Math.max(results.length - safeVisibleCount, 0);
      const nextCount = Math.min(LOAD_MORE_RESULT_COUNT, remaining);
      const activeDomains = getActiveDomains(combinedQuery(query));
      const activeDomainTags = activeDomains.flatMap((domain) => domain.tags || []);
      const tagSummarySource = activeDomainTags.length
        ? activeDomainTags
        : visible.slice(0, INITIAL_RESULT_COUNT).flatMap((item) => item.professor.intentTags || []);
      const tagSummary = Array.from(new Set(tagSummarySource)).slice(0, 4);
      const directCount = results.length;
      let countNote = `관련 교수님 ${Math.min(visible.length, directCount)}명을 표시했습니다.`;
      if (remaining > 0) {
        countNote = `직접 관련 후보가 ${directCount}명 있습니다. 현재 ${visible.length}명을 표시했습니다.`;
      } else if (directCount <= 3) {
        countNote = `직접 관련도가 높은 교수님은 ${directCount}명입니다. 아래 결과는 검색어와 직접 연결되는 교수님만 우선 표시한 것입니다.`;
      }
      const showAdjacentOption = adjacentResults.length > 0 && directCount <= 3;
      return `
        <h3>추천 결과</h3>
        <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 우선 확인할 만한 교수님입니다.</p>
        <p class="result-tags">주요 적합 분야: ${tagSummary.map(escapeHtml).join(", ") || "입력 키워드 기반"}</p>
        <div class="result-count-note">${escapeHtml(countNote)}${adjacentResults.length ? ` 인접 분야 후보 ${adjacentResults.length}명은 기본 결과와 섞지 않았습니다.` : ""}</div>
        <div class="card-list top-results">${visible.map((item, index) => renderLabCard(item, index, false)).join("")}</div>
        ${remaining ? `
          <div class="load-more-wrap">
            <button class="load-more-button" id="loadMoreResults" type="button" data-next-count="${safeVisibleCount + nextCount}">
              관련 교수님 ${nextCount}분 더보기
            </button>
          </div>
        ` : ""}
        ${showAdjacentOption && !state.showAdjacentResults ? `
          <div class="load-more-wrap">
            <button class="load-more-button" id="showAdjacentResults" type="button">인접 분야 교수님 보기</button>
          </div>
        ` : ""}
        ${state.showAdjacentResults ? renderAdjacentSection(adjacentResults, meta) : ""}
      `;
    }

    function renderAdjacentSection(adjacentResults, meta = {}) {
      if (!adjacentResults || !adjacentResults.length) return "";
      return `
        <section class="adjacent-section">
          <h4>함께 살펴볼 만한 인접 분야 교수님</h4>
          <p class="section-help">아래 후보는 ${escapeHtml(meta.intentLabel || "입력 분야")}와 직접 일치하기보다는 weak query, 관련 응용 분야, 넓은 연구 도메인으로 연결되는 참고 후보입니다.</p>
          <div class="card-list adjacent-results">${adjacentResults.map((item, index) => renderLabCard(item, index, false)).join("")}</div>
        </section>
      `;
    }

    function refreshAnswerResults(nextVisibleCount) {
      if (!state.lastResults.length && !(state.lastResults && state.lastResults._adjacentResults && state.lastResults._adjacentResults.length)) return;
      state.visibleResultCount = Math.max(INITIAL_RESULT_COUNT, Math.min(nextVisibleCount, Math.max(state.lastResults.length, INITIAL_RESULT_COUNT)));
      const assistantMessage = document.querySelector("#chatStream .message.assistant");
      if (!assistantMessage) return;
      assistantMessage.innerHTML = buildAnswer(state.lastQuery, state.lastResults, state.visibleResultCount);
    }

    function appendMessage(role, htmlText) {
      const stream = document.getElementById("chatStream");
      const message = document.createElement("div");
      message.className = `message ${role}`;
      message.innerHTML = htmlText;
      stream.appendChild(message);
      stream.scrollTop = stream.scrollHeight;
    }

    function runQuery() {
      const input = document.getElementById("goalInput");
      const query = input.value.trim();
      if (!query) {
        input.focus();
        return;
      }

      // 새 질문을 실행할 때마다 이전 질문과 답변을 지워서
      // 현재 질문의 추천 결과만 화면에 보이도록 한다.
      const stream = document.getElementById("chatStream");
      stream.innerHTML = "";

      appendMessage("user", escapeHtml(query));
      const overrideQuery = state.algorithmQueryOverride || "";
      const rankingQueryBase = overrideQuery || query;
      const queryAssist = (!overrideQuery && window.LMQueryAssist) ? window.LMQueryAssist.expand(rankingQueryBase) : { query: rankingQueryBase, applied: false, intent: "other" };
      let rankingQuery = rankingQueryBase;
      const queryMode = state.queryModeOverride || "precise";
      state.algorithmQueryOverride = "";
      state.queryModeOverride = "";
      state.showAdjacentResults = false;
      let results = recommend(rankingQuery, RECOMMEND_RESULT_LIMIT, queryMode);
      if (!overrideQuery && !results.length && queryAssist.applied) {
        rankingQuery = queryAssist.query || rankingQueryBase;
        results = recommend(rankingQuery, RECOMMEND_RESULT_LIMIT, queryMode);
        if (window.LMQueryAssist && typeof window.LMQueryAssist.markApplied === "function") {
          window.LMQueryAssist.markApplied(queryAssist.intent);
        }
      }
      state.lastResults = results;
      state.lastQuery = query;
      state.visibleResultCount = INITIAL_RESULT_COUNT;
      appendMessage("assistant", buildAnswer(query, results, state.visibleResultCount));
      renderCandidates(results);
    }

    function renderCandidates(results) {
      const list = document.getElementById("candidateList");
      const summary = document.getElementById("resultSummary");
      if (!results.length) {
        summary.textContent = "적합 후보 0명";
        list.innerHTML = `<div class="empty">조건에 적합한 후보가 없습니다.</div>`;
        return;
      }
      const meta = (results && results._tieredMeta) || {};
      summary.textContent = meta.intentLabel ? `직접 관련 후보 ${results.length}명 표시` : `적합도 상위 ${Math.min(results.length, RECOMMEND_RESULT_LIMIT)}명 중 일부 표시`;
      list.innerHTML = `<div class="card-list">${results.map((item, index) => renderLabCard(item, index, true)).join("")}</div>`;
    }

    function applyPassiveSearch() {
      const query = document.getElementById("goalInput").value.trim() || state.keyword || state.selectedTag || "";
      const results = recommend(query, RECOMMEND_RESULT_LIMIT);
      state.lastResults = results;
      renderCandidates(results);
    }



    function initFilters() {
      const unitSelect = document.getElementById("unitFilter");
      unitSelect.innerHTML = `<option value="all">전체 학과 및 대학원</option>` + DATA.units
        .filter((unit) => unit.count > 0)
        .map((unit) => `<option value="${escapeHtml(unit.code)}">${escapeHtml(unit.label)} (${unit.count})</option>`)
        .join("");

      const tagCounts = DATA.meta.tagCounts || {};
      const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 28);
      document.getElementById("tagFilter").innerHTML = tags
        .map(([tag, count]) => `<button class="chip" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)} ${count}</button>`)
        .join("");

      document.getElementById("tagFilter").addEventListener("click", (event) => {
        const button = event.target.closest("[data-tag]");
        if (!button) return;
        state.selectedTag = state.selectedTag === button.dataset.tag ? "" : button.dataset.tag;
        document.querySelectorAll("#tagFilter .chip").forEach((chip) => {
          chip.classList.toggle("active", chip.dataset.tag === state.selectedTag);
        });
        applyPassiveSearch();
      });

      unitSelect.addEventListener("change", (event) => {
        state.unit = event.target.value;
        applyPassiveSearch();
      });

      document.getElementById("keywordFilter").addEventListener("input", (event) => {
        state.keyword = event.target.value.trim();
        applyPassiveSearch();
      });

      document.getElementById("resetButton").addEventListener("click", () => {
        state.selectedTag = "";
        state.unit = "all";
        state.keyword = "";
        unitSelect.value = "all";
        document.getElementById("keywordFilter").value = "";
        document.querySelectorAll("#tagFilter .chip").forEach((chip) => chip.classList.remove("active"));
        applyPassiveSearch();
      });
    }

    document.addEventListener("click", (event) => {
      const moreButton = event.target.closest("#loadMoreResults");
      if (moreButton) {
        const nextVisibleCount = Number(moreButton.dataset.nextCount || 0);
        refreshAnswerResults(nextVisibleCount);
        return;
      }
      const adjacentButton = event.target.closest("#showAdjacentResults");
      if (adjacentButton) {
        state.showAdjacentResults = true;
        refreshAnswerResults(state.visibleResultCount || INITIAL_RESULT_COUNT);
      }
    });

    function initExamples() {
      const row = document.getElementById("exampleChips");
      const primaryCount = 12;
      let expanded = false;

      function renderExampleButtons() {
        const buttons = examples.map((item, index) => {
          const hiddenClass = !expanded && index >= primaryCount ? " extra-hidden" : "";
          return `<button class="chip example-chip${hiddenClass}" type="button" data-query="${escapeHtml(item.query)}" data-algorithm-query="${escapeHtml(item.algorithmQuery || item.query)}" data-intent="${escapeHtml(item.intent || "")}" data-mode="${escapeHtml(item.mode || "banner_explore")}">${escapeHtml(item.label)}</button>`;
        }).join("");
        const toggleText = expanded ? "주요 분야만 보기" : "전체 분야 보기";
        row.innerHTML = buttons + `<button class="chip chip-toggle" type="button" data-toggle-examples="true">${toggleText}</button>`;
      }

      renderExampleButtons();
      row.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        if (button.dataset.toggleExamples) {
          expanded = !expanded;
          renderExampleButtons();
          return;
        }
        clearHiddenFiltersForDirectQuery();
        document.getElementById("goalInput").value = button.dataset.query || button.textContent;
        state.algorithmQueryOverride = button.dataset.algorithmQuery || "";
        state.queryModeOverride = button.dataset.mode || "banner_explore";
        runQuery();
      });
    }

    function initChat() {
      document.getElementById("askButton").addEventListener("click", runQuery);
      document.getElementById("goalInput").addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          runQuery();
        }
      });
      document.getElementById("goalInput").addEventListener("input", () => {
        state.algorithmQueryOverride = "";
        state.queryModeOverride = "";
      });
      document.getElementById("clearChatButton").addEventListener("click", () => {
        document.getElementById("chatStream").innerHTML = "";
        document.getElementById("goalInput").value = "";
        document.getElementById("areaSelect").value = "";
        document.getElementById("goalSelect").value = "";
        document.getElementById("styleSelect").value = "";
        state.lastResults = [];
        state.lastQuery = "";
        state.visibleResultCount = INITIAL_RESULT_COUNT;
        renderCandidates([]);
        showWelcome();
      });

      ["areaSelect", "goalSelect", "styleSelect"].forEach((id) => {
        document.getElementById(id).addEventListener("change", applyPassiveSearch);
      });
    }

    function showWelcome() {
      appendMessage("assistant", `
        <h3>관심 분야를 입력해 주세요</h3>
        <p>대표 분야를 선택하거나, 세부 연구 키워드를 직접 입력해 주세요.</p>
      `);
    }

    function init() {
      const recordStat = document.getElementById("recordStat");
      if (recordStat) {
        recordStat.textContent = `${DATA.meta.professorCount}분 교수님 / ${DATA.meta.recordCount}개 소속 DB`;
      }
      initFilters();
      initExamples();
      initChat();
      showWelcome();
    }


    /* Algorithm5: diverse precise-query regression layer.
       Purpose: keep banner_explore broad, while making direct search phrases across
       bio, mechanical/robotics, AI, computing, security, communications, chemistry,
       materials, optics/display, energy, and environment narrow to query-specific evidence. */
    (function() {
      const POSTECH_DIVERSE_PRECISE_PROFILES = [
      {
            "label": "반도체 소자/공정",
            "query": "CMOS 트랜지스터 교수님 추천해줘",
            "intent": "CMOS, MOSFET, 트랜지스터 소자",
            "triggers": [
                  "cmos",
                  "CMOS 트랜지스터",
                  "mosfet",
                  "트랜지스터",
                  "fet"
            ],
            "terms": [
                  "cmos",
                  "mosfet",
                  "transistor",
                  "트랜지스터",
                  "field effect transistor",
                  "fet"
            ],
            "contextTerms": [
                  "semiconductor device",
                  "semiconductor process",
                  "반도체 소자",
                  "반도체 공정",
                  "oxide",
                  "thin film",
                  "nanofabrication"
            ],
            "priorityNames": [
                  "강대환",
                  "최희철",
                  "이정수",
                  "이장식",
                  "이병훈",
                  "황현상",
                  "노용영",
                  "최양규",
                  "김상현",
                  "김경민",
                  "전상훈",
                  "조병진"
            ]
      },
      {
            "label": "반도체 소자/공정",
            "query": "리소그래피 공정 연구실 추천해줘",
            "intent": "노광, 리소그래피, 미세공정",
            "triggers": [
                  "리소그래피",
                  "노광",
                  "lithography",
                  "euv"
            ],
            "terms": [
                  "lithography",
                  "리소그래피",
                  "노광",
                  "euv",
                  "photo lithography"
            ],
            "contextTerms": [
                  "semiconductor process",
                  "nanofabrication",
                  "fabrication",
                  "etch",
                  "deposition",
                  "반도체 공정"
            ],
            "priorityNames": [
                  "강대환",
                  "최희철",
                  "이정수",
                  "이장식",
                  "이병훈",
                  "황현상",
                  "노용영",
                  "권지민",
                  "김상현",
                  "최양규",
                  "전상훈"
            ]
      },
      {
            "label": "반도체 소자/공정",
            "query": "원자층 증착 ALD 연구실 추천해줘",
            "intent": "ALD, 박막 증착",
            "triggers": [
                  "ald",
                  "원자층 증착",
                  "박막 증착",
                  "atomic layer deposition"
            ],
            "terms": [
                  "ald",
                  "atomic layer deposition",
                  "원자층 증착",
                  "박막 증착",
                  "thin film deposition"
            ],
            "contextTerms": [
                  "thin film",
                  "semiconductor process",
                  "deposition",
                  "oxide",
                  "반도체 공정",
                  "박막"
            ],
            "priorityNames": [
                  "강대환",
                  "최희철",
                  "이정수",
                  "이장식",
                  "이병훈",
                  "황현상",
                  "노용영",
                  "김경민",
                  "임성갑",
                  "권지민",
                  "최양규"
            ]
      },
      {
            "label": "반도체 소자/공정",
            "query": "메모리 소자 교수님 추천해줘",
            "intent": "메모리 소자, 비휘발성 메모리",
            "triggers": [
                  "메모리 소자",
                  "memory device",
                  "rram",
                  "mram",
                  "dram",
                  "nand"
            ],
            "terms": [
                  "memory device",
                  "메모리 소자",
                  "nonvolatile memory",
                  "rram",
                  "mram",
                  "dram",
                  "nand",
                  "memristor"
            ],
            "contextTerms": [
                  "semiconductor device",
                  "transistor",
                  "spintronics",
                  "반도체 소자",
                  "memory"
            ],
            "priorityNames": [
                  "강대환",
                  "최희철",
                  "이정수",
                  "이장식",
                  "이병훈",
                  "황현상",
                  "노용영",
                  "김경민",
                  "유승협",
                  "정연식",
                  "윤용진"
            ]
      },
      {
            "label": "반도체 소자/공정",
            "query": "나노소자 제작 교수님 추천해줘",
            "intent": "나노소자, 나노공정, 소자 제작",
            "triggers": [
                  "나노소자",
                  "나노공정",
                  "nanodevice",
                  "nanofabrication"
            ],
            "terms": [
                  "nanodevice",
                  "nanoscale device",
                  "나노소자",
                  "nanofabrication",
                  "나노공정",
                  "device fabrication"
            ],
            "contextTerms": [
                  "semiconductor",
                  "thin film",
                  "transistor",
                  "fabrication",
                  "반도체 소자",
                  "소자 제작"
            ],
            "priorityNames": [
                  "강대환",
                  "최희철",
                  "이정수",
                  "이장식",
                  "이병훈",
                  "황현상",
                  "노용영",
                  "최양규",
                  "김상현",
                  "권지민",
                  "조병진"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "전고체전지 교수님 추천해줘",
            "intent": "전고체전지, 고체전해질",
            "triggers": [
                  "전고체전지",
                  "전고체",
                  "solid-state battery",
                  "solid state battery",
                  "고체전해질"
            ],
            "terms": [
                  "solid-state battery",
                  "solid state battery",
                  "all-solid-state battery",
                  "전고체전지",
                  "전고체",
                  "solid electrolyte",
                  "고체전해질"
            ],
            "contextTerms": [
                  "battery",
                  "batteries",
                  "electrolyte",
                  "lithium",
                  "배터리",
                  "전기화학"
            ],
            "priorityNames": [
                  "박수진",
                  "강병우",
                  "조창신",
                  "김원배",
                  "박문정",
                  "서동화",
                  "최남순",
                  "김희탁",
                  "이진우"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "양극재 연구실 추천해줘",
            "intent": "양극재, cathode materials",
            "triggers": [
                  "양극재",
                  "양극 소재",
                  "cathode"
            ],
            "terms": [
                  "cathode",
                  "cathode material",
                  "cathode materials",
                  "positive electrode",
                  "양극재",
                  "양극 소재",
                  "양극활물질",
                  "battery materials",
                  "electrode",
                  "양극",
                  "전극"
            ],
            "contextTerms": [
                  "battery",
                  "lithium",
                  "electrode",
                  "배터리",
                  "전극"
            ],
            "priorityNames": [
                  "박수진",
                  "강병우",
                  "조창신",
                  "김원배",
                  "박문정",
                  "정성윤",
                  "서동화",
                  "최남순"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "배터리 계면 SEI 연구하는 교수님 추천해줘",
            "intent": "SEI, 전극 계면, 계면 안정화",
            "triggers": [
                  "sei",
                  "계면",
                  "interphase",
                  "electrode interface"
            ],
            "terms": [
                  "sei",
                  "solid electrolyte interphase",
                  "interphase",
                  "electrode interface",
                  "계면",
                  "전극 계면",
                  "계면 안정화"
            ],
            "contextTerms": [
                  "battery",
                  "electrolyte",
                  "electrochemical",
                  "surface",
                  "배터리",
                  "전해질"
            ],
            "priorityNames": [
                  "박수진",
                  "강병우",
                  "조창신",
                  "김원배",
                  "박문정",
                  "김희탁",
                  "최남순",
                  "서동화",
                  "홍승범"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "리튬금속 음극 연구실 추천해줘",
            "intent": "리튬금속 음극, anode",
            "triggers": [
                  "리튬금속",
                  "음극",
                  "anode",
                  "lithium metal"
            ],
            "terms": [
                  "lithium metal anode",
                  "lithium metal",
                  "리튬금속",
                  "음극",
                  "anode",
                  "anode material",
                  "negative electrode"
            ],
            "contextTerms": [
                  "battery",
                  "lithium",
                  "electrode",
                  "전지",
                  "배터리"
            ],
            "priorityNames": [
                  "박수진",
                  "강병우",
                  "조창신",
                  "김원배",
                  "박문정",
                  "김희탁",
                  "최남순",
                  "서동화",
                  "변혜령"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "이온전도 전해질 연구실 추천해줘",
            "intent": "전해질, 이온전도, electrolyte",
            "triggers": [
                  "이온전도",
                  "전해질",
                  "electrolyte",
                  "ion transport"
            ],
            "terms": [
                  "electrolyte",
                  "electrolytes",
                  "ion transport",
                  "ionic conduction",
                  "이온전도",
                  "전해질",
                  "전해액"
            ],
            "contextTerms": [
                  "battery",
                  "solid electrolyte",
                  "electrochemical",
                  "배터리",
                  "고체전해질"
            ],
            "priorityNames": [
                  "박수진",
                  "강병우",
                  "조창신",
                  "김원배",
                  "박문정",
                  "최남순",
                  "서동화",
                  "김희탁",
                  "이현주"
            ]
      },
      {
            "label": "디스플레이",
            "query": "OLED 발광소자 교수님 추천해줘",
            "intent": "OLED, 유기발광소자",
            "triggers": [
                  "oled",
                  "발광소자",
                  "유기발광"
            ],
            "terms": [
                  "oled",
                  "organic light emitting",
                  "organic light-emitting",
                  "유기발광",
                  "발광소자",
                  "light emitting diode"
            ],
            "contextTerms": [
                  "display",
                  "디스플레이",
                  "optoelectronic",
                  "led",
                  "quantum dot"
            ],
            "priorityNames": [
                  "김석",
                  "최수석",
                  "정성준",
                  "김욱성",
                  "조창순",
                  "유승협",
                  "최경철"
            ]
      },
      {
            "label": "디스플레이",
            "query": "마이크로 LED 연구실 추천해줘",
            "intent": "Micro LED, 차세대 디스플레이",
            "triggers": [
                  "micro led",
                  "micro-led",
                  "마이크로 led",
                  "마이크로LED"
            ],
            "terms": [
                  "micro led",
                  "micro-led",
                  "마이크로 led",
                  "마이크로LED",
                  "led display"
            ],
            "contextTerms": [
                  "display",
                  "optoelectronic",
                  "semiconductor",
                  "디스플레이"
            ],
            "priorityNames": [
                  "김석",
                  "최수석",
                  "정성준",
                  "김욱성",
                  "조창순",
                  "최경철",
                  "유승협"
            ]
      },
      {
            "label": "디스플레이",
            "query": "양자점 디스플레이 교수님 추천해줘",
            "intent": "Quantum dot, QLED, 디스플레이",
            "triggers": [
                  "양자점 디스플레이",
                  "qled",
                  "quantum dot display",
                  "quantum dot led"
            ],
            "terms": [
                  "quantum dot display",
                  "quantum dot led",
                  "qled",
                  "양자점 디스플레이",
                  "양자점발광"
            ],
            "contextTerms": [
                  "display",
                  "optoelectronics",
                  "nanocrystal",
                  "디스플레이"
            ],
            "priorityNames": [
                  "김석",
                  "최수석",
                  "정성준",
                  "김욱성",
                  "조창순",
                  "정성윤",
                  "최경철"
            ]
      },
      {
            "label": "디스플레이",
            "query": "플렉서블 디스플레이 연구실 추천해줘",
            "intent": "Flexible display, stretchable electronics",
            "triggers": [
                  "플렉서블 디스플레이",
                  "flexible display",
                  "stretchable display"
            ],
            "terms": [
                  "flexible display",
                  "stretchable display",
                  "플렉서블 디스플레이",
                  "flexible electronics",
                  "stretchable electronics"
            ],
            "contextTerms": [
                  "display",
                  "wearable",
                  "soft electronics",
                  "디스플레이"
            ],
            "priorityNames": [
                  "김석",
                  "최수석",
                  "정성준",
                  "김욱성",
                  "조창순",
                  "최경철",
                  "정재웅",
                  "유승협"
            ]
      },
      {
            "label": "디스플레이",
            "query": "페로브스카이트 발광소자 교수님 추천해줘",
            "intent": "Perovskite LED, 광전자 발광소자",
            "triggers": [
                  "페로브스카이트 발광",
                  "perovskite led",
                  "perovskite light"
            ],
            "terms": [
                  "perovskite led",
                  "perovskite light emitting",
                  "페로브스카이트 발광",
                  "perovskite"
            ],
            "contextTerms": [
                  "display",
                  "optoelectronic",
                  "led",
                  "solar cell",
                  "photovoltaic"
            ],
            "priorityNames": [
                  "김석",
                  "최수석",
                  "정성준",
                  "김욱성",
                  "조창순",
                  "정성윤",
                  "서장원",
                  "오지훈"
            ]
      },
      {
            "label": "포토닉스/광전소자",
            "query": "메타표면 광학 교수님 추천해줘",
            "intent": "Metasurface, 나노광학",
            "triggers": [
                  "메타표면",
                  "metasurface",
                  "metamaterial"
            ],
            "terms": [
                  "metasurface",
                  "meta surface",
                  "metamaterial",
                  "메타표면",
                  "메타물질"
            ],
            "contextTerms": [
                  "photonics",
                  "nanophotonics",
                  "optical",
                  "광학",
                  "나노광학"
            ],
            "priorityNames": [
                  "조창순",
                  "김종규",
                  "김성지",
                  "노준석",
                  "한해욱",
                  "박용근",
                  "함자 쿠르트"
            ]
      },
      {
            "label": "포토닉스/광전소자",
            "query": "실리콘 포토닉스 연구실 추천해줘",
            "intent": "Silicon photonics, 광집적",
            "triggers": [
                  "실리콘 포토닉스",
                  "silicon photonics",
                  "photonic integrated"
            ],
            "terms": [
                  "silicon photonics",
                  "실리콘 포토닉스",
                  "photonic integrated",
                  "optical interconnect",
                  "photonics",
                  "optical",
                  "optics",
                  "광학",
                  "광소자"
            ],
            "contextTerms": [
                  "photonics",
                  "optical",
                  "semiconductor",
                  "광학"
            ],
            "priorityNames": [
                  "조창순",
                  "김종규",
                  "김성지",
                  "노준석",
                  "한해욱",
                  "함자 쿠르트"
            ]
      },
      {
            "label": "포토닉스/광전소자",
            "query": "광검출기 photodetector 교수님 추천해줘",
            "intent": "Photodetector, 광센서",
            "triggers": [
                  "광검출기",
                  "photodetector",
                  "photo detector"
            ],
            "terms": [
                  "photodetector",
                  "photo detector",
                  "광검출기",
                  "phototransistor",
                  "photo sensor"
            ],
            "contextTerms": [
                  "optoelectronic",
                  "photonics",
                  "sensor",
                  "광전소자"
            ],
            "priorityNames": [
                  "조창순",
                  "김종규",
                  "김성지",
                  "노준석",
                  "한해욱",
                  "김상현",
                  "최경철",
                  "정성윤"
            ]
      },
      {
            "label": "포토닉스/광전소자",
            "query": "플라즈모닉스 연구실 추천해줘",
            "intent": "Plasmonics, 나노광학",
            "triggers": [
                  "플라즈모닉스",
                  "plasmonics",
                  "plasmon"
            ],
            "terms": [
                  "plasmonics",
                  "plasmon",
                  "플라즈모닉스",
                  "surface plasmon"
            ],
            "contextTerms": [
                  "nanophotonics",
                  "optical",
                  "metamaterial",
                  "광학"
            ],
            "priorityNames": [
                  "조창순",
                  "김종규",
                  "김성지",
                  "노준석",
                  "한해욱",
                  "박용근"
            ]
      },
      {
            "label": "포토닉스/광전소자",
            "query": "홀로그래피 이미징 교수님 추천해줘",
            "intent": "Holography, 광학 이미징",
            "triggers": [
                  "홀로그래피",
                  "holography",
                  "holographic"
            ],
            "terms": [
                  "holography",
                  "holographic",
                  "홀로그래피",
                  "digital holography"
            ],
            "contextTerms": [
                  "optical imaging",
                  "photonics",
                  "microscopy",
                  "이미징",
                  "광학"
            ],
            "priorityNames": [
                  "조창순",
                  "김종규",
                  "김성지",
                  "노준석",
                  "한해욱",
                  "박용근"
            ]
      },
      {
            "label": "AI/머신러닝",
            "query": "강화학습 연구실 추천해줘",
            "intent": "Reinforcement learning",
            "triggers": [
                  "강화학습",
                  "reinforcement learning",
                  "rl"
            ],
            "terms": [
                  "reinforcement learning",
                  "강화학습",
                  "rl",
                  "policy learning"
            ],
            "contextTerms": [
                  "machine learning",
                  "ai",
                  "artificial intelligence",
                  "optimization",
                  "robot learning"
            ],
            "priorityNames": [
                  "김광인",
                  "김동우",
                  "이재호",
                  "이남훈",
                  "박은혁",
                  "최윤재",
                  "문일철",
                  "정재승"
            ]
      },
      {
            "label": "AI/머신러닝",
            "query": "그래프 신경망 교수님 추천해줘",
            "intent": "Graph neural network, 그래프 ML",
            "triggers": [
                  "그래프 신경망",
                  "graph neural",
                  "gnn",
                  "graph learning"
            ],
            "terms": [
                  "graph neural network",
                  "graph neural",
                  "gnn",
                  "graph learning",
                  "그래프 신경망",
                  "graph",
                  "deep learning",
                  "machine learning",
                  "neural network",
                  "그래프",
                  "딥러닝"
            ],
            "contextTerms": [
                  "machine learning",
                  "deep learning",
                  "그래프",
                  "ai"
            ],
            "priorityNames": [
                  "김광인",
                  "김동우",
                  "이재호",
                  "이남훈",
                  "박은혁",
                  "최윤재",
                  "강완모"
            ]
      },
      {
            "label": "AI/머신러닝",
            "query": "생성모델 연구실 추천해줘",
            "intent": "Generative model, diffusion, foundation model",
            "triggers": [
                  "생성모델",
                  "generative model",
                  "diffusion",
                  "생성형 ai"
            ],
            "terms": [
                  "generative model",
                  "generative ai",
                  "diffusion model",
                  "diffusion",
                  "foundation model",
                  "생성모델",
                  "생성형 ai"
            ],
            "contextTerms": [
                  "deep learning",
                  "machine learning",
                  "ai",
                  "neural network"
            ],
            "priorityNames": [
                  "김광인",
                  "김동우",
                  "이재호",
                  "이남훈",
                  "박은혁",
                  "최윤재",
                  "오혜연",
                  "오성준"
            ]
      },
      {
            "label": "AI/머신러닝",
            "query": "추천시스템 교수님 추천해줘",
            "intent": "Recommender system, 데이터마이닝",
            "triggers": [
                  "추천시스템",
                  "recommender",
                  "recommendation system"
            ],
            "terms": [
                  "recommender system",
                  "recommendation system",
                  "추천시스템",
                  "collaborative filtering"
            ],
            "contextTerms": [
                  "data mining",
                  "machine learning",
                  "database",
                  "big data"
            ],
            "priorityNames": [
                  "김광인",
                  "김동우",
                  "이재호",
                  "이남훈",
                  "박은혁",
                  "강완모",
                  "김민수",
                  "오혜연"
            ]
      },
      {
            "label": "AI/머신러닝",
            "query": "베이지안 최적화 연구실 추천해줘",
            "intent": "Bayesian optimization, AI 최적화",
            "triggers": [
                  "베이지안 최적화",
                  "bayesian optimization",
                  "probabilistic model"
            ],
            "terms": [
                  "bayesian optimization",
                  "베이지안 최적화",
                  "probabilistic model",
                  "uncertainty quantification",
                  "optimization",
                  "probabilistic",
                  "statistics",
                  "statistical",
                  "최적화",
                  "확률"
            ],
            "contextTerms": [
                  "machine learning",
                  "optimization",
                  "statistics",
                  "ai"
            ],
            "priorityNames": [
                  "김광인",
                  "김동우",
                  "이재호",
                  "이남훈",
                  "박은혁",
                  "문일철",
                  "최윤재"
            ]
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "객체검출 교수님 추천해줘",
            "intent": "Object detection, visual recognition",
            "triggers": [
                  "객체검출",
                  "object detection",
                  "object recognition"
            ],
            "terms": [
                  "object detection",
                  "object recognition",
                  "객체검출",
                  "visual recognition",
                  "영상인식"
            ],
            "contextTerms": [
                  "computer vision",
                  "deep learning",
                  "image processing",
                  "컴퓨터비전"
            ],
            "priorityNames": [
                  "김광인",
                  "곽수하",
                  "손진희",
                  "김철홍",
                  "박주홍",
                  "윤국진",
                  "박진아",
                  "이성주"
            ]
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "이미지 세그멘테이션 연구실 추천해줘",
            "intent": "Image segmentation",
            "triggers": [
                  "세그멘테이션",
                  "segmentation",
                  "image segmentation"
            ],
            "terms": [
                  "image segmentation",
                  "segmentation",
                  "semantic segmentation",
                  "세그멘테이션",
                  "분할"
            ],
            "contextTerms": [
                  "computer vision",
                  "image processing",
                  "deep learning"
            ],
            "priorityNames": [
                  "김광인",
                  "곽수하",
                  "손진희",
                  "김철홍",
                  "박주홍",
                  "윤국진",
                  "박진아"
            ]
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "멀티모달 비전 교수님 추천해줘",
            "intent": "Multimodal vision, vision-language",
            "triggers": [
                  "멀티모달 비전",
                  "multimodal vision",
                  "vision language",
                  "vision-language"
            ],
            "terms": [
                  "multimodal",
                  "vision-language",
                  "vision language",
                  "멀티모달",
                  "멀티모달 비전"
            ],
            "contextTerms": [
                  "computer vision",
                  "deep learning",
                  "language model",
                  "ai"
            ],
            "priorityNames": [
                  "김광인",
                  "곽수하",
                  "손진희",
                  "김철홍",
                  "박주홍",
                  "최윤재",
                  "오혜연"
            ]
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "비디오 이해 연구실 추천해줘",
            "intent": "Video understanding, action recognition",
            "triggers": [
                  "비디오 이해",
                  "video understanding",
                  "action recognition"
            ],
            "terms": [
                  "video understanding",
                  "video analysis",
                  "action recognition",
                  "비디오",
                  "동작인식",
                  "video",
                  "image",
                  "computer vision",
                  "visual recognition",
                  "영상",
                  "비전"
            ],
            "contextTerms": [
                  "computer vision",
                  "image processing",
                  "deep learning"
            ],
            "priorityNames": [
                  "김광인",
                  "곽수하",
                  "손진희",
                  "김철홍",
                  "박주홍",
                  "윤국진",
                  "박진아"
            ]
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "자율주행 perception 교수님 추천해줘",
            "intent": "Autonomous driving perception",
            "triggers": [
                  "perception",
                  "인지",
                  "자율주행 인지",
                  "autonomous perception"
            ],
            "terms": [
                  "perception",
                  "autonomous driving perception",
                  "인지",
                  "자율주행 인지",
                  "object detection"
            ],
            "contextTerms": [
                  "computer vision",
                  "autonomous driving",
                  "robotics",
                  "sensor fusion"
            ],
            "priorityNames": [
                  "김광인",
                  "곽수하",
                  "손진희",
                  "김철홍",
                  "박주홍",
                  "명현",
                  "윤국진"
            ]
      },
      {
            "label": "바이오센서/생체전자",
            "query": "웨어러블 헬스케어 센서 교수님 추천해줘",
            "intent": "Wearable healthcare sensor",
            "triggers": [
                  "웨어러블 센서",
                  "wearable sensor",
                  "healthcare sensor"
            ],
            "terms": [
                  "wearable sensor",
                  "wearable sensors",
                  "웨어러블 센서",
                  "healthcare sensor",
                  "wearable electronics"
            ],
            "contextTerms": [
                  "biosensor",
                  "bioelectronics",
                  "sensor",
                  "healthcare",
                  "biomedical"
            ],
            "priorityNames": [
                  "정재웅",
                  "윤준보",
                  "박인규"
            ]
      },
      {
            "label": "바이오센서/생체전자",
            "query": "임플란터블 생체전자 연구실 추천해줘",
            "intent": "Implantable bioelectronics",
            "triggers": [
                  "임플란터블",
                  "implantable",
                  "bioelectronics"
            ],
            "terms": [
                  "implantable",
                  "implantable device",
                  "implantable electronics",
                  "임플란터블",
                  "이식형",
                  "bioelectronics",
                  "생체전자"
            ],
            "contextTerms": [
                  "biosensor",
                  "biomedical",
                  "neural interface",
                  "bio-integrated"
            ],
            "priorityNames": [
                  "정재웅",
                  "최한림"
            ]
      },
      {
            "label": "바이오센서/생체전자",
            "query": "랩온어칩 진단기기 교수님 추천해줘",
            "intent": "Lab-on-a-chip, microfluidic diagnostics",
            "triggers": [
                  "랩온어칩",
                  "lab-on-a-chip",
                  "microfluidic",
                  "마이크로유체"
            ],
            "terms": [
                  "lab-on-a-chip",
                  "lab on a chip",
                  "microfluidics",
                  "microfluidic",
                  "랩온어칩",
                  "마이크로유체",
                  "diagnostic"
            ],
            "contextTerms": [
                  "biosensor",
                  "biochip",
                  "biomedical",
                  "sensor"
            ],
            "priorityNames": [
                  "윤준보",
                  "박인규",
                  "정기훈"
            ]
      },
      {
            "label": "바이오센서/생체전자",
            "query": "전자피부 e-skin 연구실 추천해줘",
            "intent": "Electronic skin, soft bioelectronics",
            "triggers": [
                  "전자피부",
                  "e-skin",
                  "electronic skin"
            ],
            "terms": [
                  "electronic skin",
                  "e-skin",
                  "전자피부",
                  "soft electronics",
                  "stretchable sensor"
            ],
            "contextTerms": [
                  "wearable",
                  "bioelectronics",
                  "sensor",
                  "flexible electronics"
            ],
            "priorityNames": [
                  "정재웅",
                  "박인규"
            ]
      },
      {
            "label": "바이오센서/생체전자",
            "query": "나노바이오센서 교수님 추천해줘",
            "intent": "Nanobiosensor, biosensing",
            "triggers": [
                  "나노바이오센서",
                  "nanobiosensor",
                  "biosensor"
            ],
            "terms": [
                  "nanobiosensor",
                  "biosensor",
                  "biosensors",
                  "나노바이오센서",
                  "바이오센서"
            ],
            "contextTerms": [
                  "sensor",
                  "biomedical",
                  "microfluidic",
                  "nanomaterial"
            ],
            "priorityNames": [
                  "윤준보",
                  "박인규",
                  "정기훈"
            ]
      },
      {
            "label": "뇌과학/BCI",
            "query": "신경전극 연구실 추천해줘",
            "intent": "Neural electrode, neural interface",
            "triggers": [
                  "신경전극",
                  "neural electrode",
                  "neural interface"
            ],
            "terms": [
                  "neural electrode",
                  "neural interface",
                  "신경전극",
                  "신경 인터페이스",
                  "brain-computer interface"
            ],
            "contextTerms": [
                  "neuroscience",
                  "brain",
                  "bci",
                  "bioelectronics",
                  "뇌"
            ],
            "priorityNames": [
                  "정재웅",
                  "최형진",
                  "김대수"
            ]
      },
      {
            "label": "뇌과학/BCI",
            "query": "뇌컴퓨터인터페이스 교수님 추천해줘",
            "intent": "BCI, brain-computer interface",
            "triggers": [
                  "bci",
                  "뇌컴퓨터인터페이스",
                  "brain-computer interface"
            ],
            "terms": [
                  "brain-computer interface",
                  "bci",
                  "뇌컴퓨터인터페이스",
                  "뇌-컴퓨터 인터페이스"
            ],
            "contextTerms": [
                  "neural interface",
                  "brain",
                  "neuroscience",
                  "signal processing"
            ],
            "priorityNames": [
                  "정재웅",
                  "김대식"
            ]
      },
      {
            "label": "뇌과학/BCI",
            "query": "시냅스 가소성 연구실 추천해줘",
            "intent": "Synapse, neural circuit",
            "triggers": [
                  "시냅스",
                  "synapse",
                  "synaptic plasticity"
            ],
            "terms": [
                  "synapse",
                  "synaptic",
                  "synaptic plasticity",
                  "시냅스",
                  "신경회로"
            ],
            "contextTerms": [
                  "neuroscience",
                  "neuron",
                  "brain",
                  "neural circuit"
            ],
            "priorityNames": [
                  "김대수",
                  "최형진"
            ]
      },
      {
            "label": "뇌과학/BCI",
            "query": "뇌영상 fMRI 교수님 추천해줘",
            "intent": "fMRI, brain imaging",
            "triggers": [
                  "fmri",
                  "뇌영상",
                  "brain imaging"
            ],
            "terms": [
                  "fmri",
                  "brain imaging",
                  "뇌영상",
                  "functional mri",
                  "neuroimaging"
            ],
            "contextTerms": [
                  "medical imaging",
                  "brain",
                  "neuroscience",
                  "mri"
            ],
            "priorityNames": [
                  "김대식",
                  "예종철",
                  "박성홍"
            ]
      },
      {
            "label": "뇌과학/BCI",
            "query": "신경조절 neuromodulation 연구실 추천해줘",
            "intent": "Neuromodulation, brain stimulation",
            "triggers": [
                  "신경조절",
                  "neuromodulation",
                  "brain stimulation"
            ],
            "terms": [
                  "neuromodulation",
                  "brain stimulation",
                  "신경조절",
                  "neural stimulation",
                  "neural",
                  "brain",
                  "stimulation",
                  "neuroscience",
                  "신경",
                  "뇌"
            ],
            "contextTerms": [
                  "neuroscience",
                  "neural interface",
                  "brain",
                  "bci"
            ],
            "priorityNames": [
                  "최형진",
                  "김대수"
            ]
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "MRI 영상 재구성 교수님 추천해줘",
            "intent": "MRI reconstruction, inverse problem",
            "triggers": [
                  "mri",
                  "영상 재구성",
                  "image reconstruction"
            ],
            "terms": [
                  "mri",
                  "magnetic resonance imaging",
                  "image reconstruction",
                  "영상 재구성",
                  "inverse problem"
            ],
            "contextTerms": [
                  "medical imaging",
                  "biomedical imaging",
                  "deep learning",
                  "의료영상"
            ],
            "priorityNames": [
                  "김철홍",
                  "김원화",
                  "김형함",
                  "박성민",
                  "박상현",
                  "예종철",
                  "박성홍"
            ]
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "초음파 의료영상 연구실 추천해줘",
            "intent": "Ultrasound imaging",
            "triggers": [
                  "초음파",
                  "ultrasound"
            ],
            "terms": [
                  "ultrasound",
                  "초음파",
                  "ultrasonic imaging",
                  "photoacoustic"
            ],
            "contextTerms": [
                  "medical imaging",
                  "biomedical imaging",
                  "healthcare",
                  "imaging"
            ],
            "priorityNames": [
                  "김철홍",
                  "김원화",
                  "김형함",
                  "박성민",
                  "박상현",
                  "박성홍",
                  "예종철"
            ]
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "디지털 헬스케어 AI 교수님 추천해줘",
            "intent": "Digital health, healthcare AI",
            "triggers": [
                  "디지털 헬스",
                  "헬스케어 ai",
                  "healthcare ai",
                  "digital health"
            ],
            "terms": [
                  "digital health",
                  "healthcare ai",
                  "헬스케어 ai",
                  "디지털 헬스",
                  "healthcare"
            ],
            "contextTerms": [
                  "medical imaging",
                  "machine learning",
                  "hci",
                  "wearable",
                  "biomedical"
            ],
            "priorityNames": [
                  "김철홍",
                  "김원화",
                  "김형함",
                  "박성민",
                  "박상현",
                  "이의진",
                  "예종철",
                  "문일철"
            ]
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "CT reconstruction 연구실 추천해줘",
            "intent": "CT, computed tomography reconstruction",
            "triggers": [
                  "ct reconstruction",
                  "computed tomography",
                  "ct 영상"
            ],
            "terms": [
                  "computed tomography",
                  "ct reconstruction",
                  "ct",
                  "컴퓨터단층촬영",
                  "ct 영상"
            ],
            "contextTerms": [
                  "medical imaging",
                  "image reconstruction",
                  "x-ray",
                  "biomedical imaging"
            ],
            "priorityNames": [
                  "김철홍",
                  "김원화",
                  "김형함",
                  "박성민",
                  "박상현",
                  "예종철",
                  "박성홍"
            ]
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "생체신호 분석 교수님 추천해줘",
            "intent": "Biomedical signal, physiological signal",
            "triggers": [
                  "생체신호",
                  "physiological signal",
                  "biomedical signal"
            ],
            "terms": [
                  "biomedical signal",
                  "physiological signal",
                  "생체신호",
                  "biosignal",
                  "signal processing"
            ],
            "contextTerms": [
                  "healthcare",
                  "medical",
                  "wearable",
                  "biomedical engineering"
            ],
            "priorityNames": [
                  "김철홍",
                  "김원화",
                  "김형함",
                  "박성민",
                  "박상현",
                  "김대식",
                  "이의진"
            ]
      },
      {
            "label": "로봇/자율주행",
            "query": "보행로봇 제어 교수님 추천해줘",
            "intent": "Legged robot, locomotion control",
            "triggers": [
                  "보행로봇",
                  "legged robot",
                  "quadruped",
                  "locomotion"
            ],
            "terms": [
                  "legged robot",
                  "quadruped",
                  "locomotion",
                  "보행로봇",
                  "humanoid",
                  "robot control"
            ],
            "contextTerms": [
                  "robotics",
                  "control",
                  "reinforcement learning",
                  "mobile robot"
            ],
            "priorityNames": [
                  "김정훈",
                  "안혜민",
                  "김기훈",
                  "유선철",
                  "김석",
                  "황보제민",
                  "공경철",
                  "박해원"
            ]
      },
      {
            "label": "로봇/자율주행",
            "query": "매니퓰레이터 연구실 추천해줘",
            "intent": "Robot manipulator, manipulation",
            "triggers": [
                  "매니퓰레이터",
                  "manipulator",
                  "manipulation"
            ],
            "terms": [
                  "manipulator",
                  "manipulation",
                  "robot manipulation",
                  "매니퓰레이터",
                  "로봇팔"
            ],
            "contextTerms": [
                  "robotics",
                  "robot control",
                  "motion planning",
                  "제어"
            ],
            "priorityNames": [
                  "김정훈",
                  "안혜민",
                  "김기훈",
                  "유선철",
                  "김석",
                  "김정",
                  "박대형"
            ]
      },
      {
            "label": "로봇/자율주행",
            "query": "자율주행 SLAM 교수님 추천해줘",
            "intent": "SLAM, autonomous navigation",
            "triggers": [
                  "slam",
                  "자율주행 slam",
                  "navigation"
            ],
            "terms": [
                  "slam",
                  "simultaneous localization",
                  "navigation",
                  "자율주행",
                  "localization",
                  "mapping"
            ],
            "contextTerms": [
                  "robotics",
                  "autonomous driving",
                  "mobile robot",
                  "computer vision"
            ],
            "priorityNames": [
                  "김정훈",
                  "안혜민",
                  "김기훈",
                  "유선철",
                  "김석",
                  "명현",
                  "윤국진"
            ]
      },
      {
            "label": "로봇/자율주행",
            "query": "소프트로봇 연구실 추천해줘",
            "intent": "Soft robot, wearable robot",
            "triggers": [
                  "소프트로봇",
                  "soft robot",
                  "soft robotics"
            ],
            "terms": [
                  "soft robot",
                  "soft robotics",
                  "소프트로봇",
                  "wearable robot",
                  "soft actuator"
            ],
            "contextTerms": [
                  "robotics",
                  "actuator",
                  "mechanics",
                  "bio-inspired"
            ],
            "priorityNames": [
                  "김정훈",
                  "안혜민",
                  "김기훈",
                  "유선철",
                  "김석",
                  "오일권",
                  "공경철"
            ]
      },
      {
            "label": "로봇/자율주행",
            "query": "드론 경로계획 교수님 추천해줘",
            "intent": "Drone, UAV path planning",
            "triggers": [
                  "드론",
                  "uav",
                  "경로계획",
                  "path planning"
            ],
            "terms": [
                  "drone",
                  "uav",
                  "path planning",
                  "trajectory planning",
                  "경로계획",
                  "무인항공기"
            ],
            "contextTerms": [
                  "autonomous",
                  "robotics",
                  "aerospace",
                  "control",
                  "navigation"
            ],
            "priorityNames": [
                  "김정훈",
                  "안혜민",
                  "김기훈",
                  "유선철",
                  "김석",
                  "명현",
                  "김현진"
            ]
      },
      {
            "label": "HCI/AR·VR",
            "query": "사용자 경험 UX 연구실 추천해줘",
            "intent": "UX, user experience",
            "triggers": [
                  "ux",
                  "사용자 경험",
                  "user experience"
            ],
            "terms": [
                  "user experience",
                  "ux",
                  "사용자 경험",
                  "사용자 인터페이스",
                  "user interface"
            ],
            "contextTerms": [
                  "hci",
                  "human-computer interaction",
                  "interaction",
                  "인터랙션"
            ],
            "priorityNames": [
                  "이기혁",
                  "이의진",
                  "이안 오클리"
            ]
      },
      {
            "label": "HCI/AR·VR",
            "query": "햅틱 인터랙션 교수님 추천해줘",
            "intent": "Haptics, interaction",
            "triggers": [
                  "햅틱",
                  "haptic",
                  "haptics"
            ],
            "terms": [
                  "haptic",
                  "haptics",
                  "햅틱",
                  "tactile",
                  "force feedback"
            ],
            "contextTerms": [
                  "hci",
                  "interaction",
                  "virtual reality",
                  "human-computer"
            ],
            "priorityNames": [
                  "최승문",
                  "이안 오클리"
            ]
      },
      {
            "label": "HCI/AR·VR",
            "query": "AR 인터페이스 연구실 추천해줘",
            "intent": "Augmented reality interface",
            "triggers": [
                  "ar 인터페이스",
                  "augmented reality",
                  "증강현실"
            ],
            "terms": [
                  "augmented reality",
                  "증강현실",
                  "ar",
                  "mixed reality",
                  "xr"
            ],
            "contextTerms": [
                  "hci",
                  "interaction",
                  "interface",
                  "virtual reality"
            ],
            "priorityNames": [
                  "이기혁",
                  "이안 오클리"
            ]
      },
      {
            "label": "HCI/AR·VR",
            "query": "VR 가상현실 교수님 추천해줘",
            "intent": "Virtual reality, VR",
            "triggers": [
                  "vr",
                  "가상현실",
                  "virtual reality"
            ],
            "terms": [
                  "virtual reality",
                  "vr",
                  "가상현실",
                  "immersive"
            ],
            "contextTerms": [
                  "hci",
                  "interaction",
                  "haptic",
                  "interface"
            ],
            "priorityNames": [
                  "최승문",
                  "이안 오클리"
            ]
      },
      {
            "label": "HCI/AR·VR",
            "query": "소셜컴퓨팅 연구실 추천해줘",
            "intent": "Social computing, human-centered computing",
            "triggers": [
                  "소셜컴퓨팅",
                  "social computing"
            ],
            "terms": [
                  "social computing",
                  "소셜 컴퓨팅",
                  "소셜컴퓨팅",
                  "crowdsourcing",
                  "human-centered",
                  "hci",
                  "ux",
                  "interaction",
                  "user experience",
                  "social",
                  "사용자",
                  "인터랙션"
            ],
            "contextTerms": [
                  "hci",
                  "interactive computing",
                  "user",
                  "computing"
            ],
            "priorityNames": [
                  "시어링 조셉",
                  "김주호"
            ]
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "리드버그 원자 양자컴퓨터 교수님 추천해줘",
            "intent": "Rydberg atom quantum computing",
            "triggers": [
                  "리드버그",
                  "rydberg",
                  "neutral atom"
            ],
            "terms": [
                  "rydberg",
                  "neutral atom",
                  "리드버그",
                  "atom arrays",
                  "atomic physics",
                  "quantum",
                  "atom",
                  "atomic",
                  "quantum optics",
                  "양자",
                  "원자"
            ],
            "contextTerms": [
                  "quantum computing",
                  "quantum simulation",
                  "qubit",
                  "양자컴퓨팅"
            ],
            "priorityNames": [
                  "안재욱"
            ]
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "초전도 큐비트 연구실 추천해줘",
            "intent": "Superconducting qubit",
            "triggers": [
                  "초전도 큐비트",
                  "superconducting qubit",
                  "qubit"
            ],
            "terms": [
                  "superconducting qubit",
                  "qubit",
                  "초전도 큐비트",
                  "양자소자"
            ],
            "contextTerms": [
                  "quantum computing",
                  "quantum device",
                  "quantum information"
            ],
            "priorityNames": [
                  "이준구",
                  "배준우"
            ]
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자알고리즘 교수님 추천해줘",
            "intent": "Quantum algorithm",
            "triggers": [
                  "양자알고리즘",
                  "quantum algorithm"
            ],
            "terms": [
                  "quantum algorithm",
                  "quantum algorithms",
                  "양자알고리즘",
                  "quantum optimization"
            ],
            "contextTerms": [
                  "quantum computing",
                  "quantum information",
                  "algorithm"
            ],
            "priorityNames": [
                  "안재욱",
                  "배준우"
            ]
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자통신 연구실 추천해줘",
            "intent": "Quantum communication, quantum information",
            "triggers": [
                  "양자통신",
                  "quantum communication",
                  "quantum network"
            ],
            "terms": [
                  "quantum communication",
                  "quantum network",
                  "quantum cryptography",
                  "양자통신",
                  "양자네트워크"
            ],
            "contextTerms": [
                  "quantum information",
                  "communication",
                  "photonics"
            ],
            "priorityNames": [
                  "정연식",
                  "안재욱"
            ]
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자시뮬레이션 교수님 추천해줘",
            "intent": "Quantum simulation",
            "triggers": [
                  "양자시뮬레이션",
                  "quantum simulation"
            ],
            "terms": [
                  "quantum simulation",
                  "양자시뮬레이션",
                  "quantum simulator",
                  "rydberg"
            ],
            "contextTerms": [
                  "quantum computing",
                  "quantum physics",
                  "양자"
            ],
            "priorityNames": [
                  "안재욱",
                  "라영식"
            ]
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "SoC 설계 교수님 추천해줘",
            "intent": "SoC, system-on-chip design",
            "triggers": [
                  "soc",
                  "system on chip",
                  "SoC 설계"
            ],
            "terms": [
                  "soc",
                  "system-on-chip",
                  "system on chip",
                  "SoC",
                  "집적회로",
                  "회로설계"
            ],
            "contextTerms": [
                  "vlsi",
                  "integrated circuit",
                  "circuit design",
                  "ai hardware",
                  "반도체 회로"
            ],
            "priorityNames": [
                  "김봉진",
                  "조성환",
                  "류승탁",
                  "유민수",
                  "김주영"
            ]
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "하드웨어 가속기 연구실 추천해줘",
            "intent": "Hardware accelerator, AI accelerator",
            "triggers": [
                  "하드웨어 가속기",
                  "hardware accelerator",
                  "ai accelerator"
            ],
            "terms": [
                  "hardware accelerator",
                  "ai accelerator",
                  "하드웨어 가속기",
                  "accelerator",
                  "컴퓨터 구조"
            ],
            "contextTerms": [
                  "vlsi",
                  "soc",
                  "fpga",
                  "asic",
                  "ai hardware"
            ],
            "priorityNames": [
                  "유민수",
                  "김주영",
                  "신영수"
            ]
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "FPGA 기반 AI 칩 교수님 추천해줘",
            "intent": "FPGA, AI chip prototyping",
            "triggers": [
                  "fpga",
                  "ai 칩",
                  "AI 칩"
            ],
            "terms": [
                  "fpga",
                  "field programmable gate array",
                  "ai chip",
                  "AI 칩",
                  "hardware accelerator"
            ],
            "contextTerms": [
                  "vlsi",
                  "soc",
                  "circuit design",
                  "computer architecture"
            ],
            "priorityNames": [
                  "김주영",
                  "유민수",
                  "신영수"
            ]
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "혼성신호 회로설계 연구실 추천해줘",
            "intent": "Mixed-signal circuit design",
            "triggers": [
                  "혼성신호",
                  "mixed-signal",
                  "mixed signal"
            ],
            "terms": [
                  "mixed-signal",
                  "mixed signal",
                  "혼성신호",
                  "analog circuit",
                  "digital circuit",
                  "회로설계"
            ],
            "contextTerms": [
                  "integrated circuit",
                  "vlsi",
                  "circuit design",
                  "soc"
            ],
            "priorityNames": [
                  "조성환",
                  "류승탁",
                  "김봉진"
            ]
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "뉴로모픽 칩 교수님 추천해줘",
            "intent": "Neuromorphic chip, AI hardware",
            "triggers": [
                  "뉴로모픽",
                  "neuromorphic"
            ],
            "terms": [
                  "neuromorphic",
                  "뉴로모픽",
                  "neuromorphic chip",
                  "in-memory computing",
                  "pim"
            ],
            "contextTerms": [
                  "ai hardware",
                  "vlsi",
                  "memory",
                  "hardware accelerator"
            ],
            "priorityNames": [
                  "김경민",
                  "유민수",
                  "김주영"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "칩렛 인터커넥트 교수님 추천해줘",
            "intent": "Chiplet interconnect",
            "triggers": [
                  "칩렛",
                  "chiplet",
                  "interconnect"
            ],
            "terms": [
                  "chiplet",
                  "칩렛",
                  "interconnect",
                  "인터커넥트",
                  "advanced packaging"
            ],
            "contextTerms": [
                  "packaging",
                  "heterogeneous integration",
                  "3d ic",
                  "semiconductor"
            ],
            "priorityNames": [
                  "권지민",
                  "김정호",
                  "이상호"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "3D IC 패키징 연구실 추천해줘",
            "intent": "3D IC, advanced packaging",
            "triggers": [
                  "3d ic",
                  "3D IC",
                  "3차원 집적"
            ],
            "terms": [
                  "3d ic",
                  "3D IC",
                  "3차원 집적",
                  "through silicon via",
                  "tsv"
            ],
            "contextTerms": [
                  "packaging",
                  "chiplet",
                  "interconnect",
                  "heterogeneous integration"
            ],
            "priorityNames": [
                  "권지민",
                  "김상현",
                  "이상호"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "TSV 공정 교수님 추천해줘",
            "intent": "TSV, through-silicon via",
            "triggers": [
                  "tsv",
                  "through silicon via",
                  "실리콘관통전극"
            ],
            "terms": [
                  "tsv",
                  "through silicon via",
                  "실리콘관통전극",
                  "via"
            ],
            "contextTerms": [
                  "3d ic",
                  "packaging",
                  "interconnect",
                  "semiconductor process"
            ],
            "priorityNames": [
                  "권지민",
                  "김정호"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "하이브리드 본딩 연구실 추천해줘",
            "intent": "Hybrid bonding, bonding process",
            "triggers": [
                  "하이브리드 본딩",
                  "hybrid bonding",
                  "bonding"
            ],
            "terms": [
                  "hybrid bonding",
                  "하이브리드 본딩",
                  "bonding",
                  "wafer bonding",
                  "advanced packaging",
                  "packaging",
                  "heterogeneous integration",
                  "interconnect",
                  "3d ic",
                  "반도체 패키징",
                  "패키징",
                  "이종집적",
                  "인터커넥트"
            ],
            "contextTerms": [
                  "advanced packaging",
                  "heterogeneous integration",
                  "interconnect"
            ],
            "priorityNames": [
                  "권지민",
                  "이상호"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "패키지 신뢰성 교수님 추천해줘",
            "intent": "Packaging reliability",
            "triggers": [
                  "패키지 신뢰성",
                  "packaging reliability",
                  "reliability"
            ],
            "terms": [
                  "packaging reliability",
                  "패키지 신뢰성",
                  "reliability",
                  "interconnect reliability",
                  "thermal reliability"
            ],
            "contextTerms": [
                  "packaging",
                  "semiconductor",
                  "mechanics",
                  "thermal"
            ],
            "priorityNames": [
                  "김정호",
                  "권지민"
            ]
      },
      {
            "label": "수소/연료전지",
            "query": "수전해 촉매 교수님 추천해줘",
            "intent": "Water electrolysis catalyst",
            "triggers": [
                  "수전해",
                  "water electrolysis",
                  "electrolysis"
            ],
            "terms": [
                  "water electrolysis",
                  "electrolysis",
                  "수전해",
                  "water splitting",
                  "hydrogen evolution",
                  "oxygen evolution"
            ],
            "contextTerms": [
                  "hydrogen",
                  "fuel cell",
                  "electrocatalysis",
                  "catalyst"
            ],
            "priorityNames": [
                  "이진우",
                  "이강택",
                  "오지훈",
                  "조은애"
            ]
      },
      {
            "label": "수소/연료전지",
            "query": "연료전지 전극 연구실 추천해줘",
            "intent": "Fuel cell electrode",
            "triggers": [
                  "연료전지 전극",
                  "fuel cell electrode",
                  "fuel cell"
            ],
            "terms": [
                  "fuel cell",
                  "fuel cells",
                  "연료전지",
                  "fuel cell electrode",
                  "전극"
            ],
            "contextTerms": [
                  "hydrogen",
                  "electrocatalysis",
                  "energy conversion"
            ],
            "priorityNames": [
                  "조은애",
                  "배중면",
                  "이강택"
            ]
      },
      {
            "label": "수소/연료전지",
            "query": "그린수소 생산 교수님 추천해줘",
            "intent": "Green hydrogen production",
            "triggers": [
                  "그린수소",
                  "green hydrogen",
                  "수소 생산"
            ],
            "terms": [
                  "green hydrogen",
                  "수소 생산",
                  "hydrogen production",
                  "water electrolysis",
                  "hydrogen evolution"
            ],
            "contextTerms": [
                  "hydrogen",
                  "electrocatalysis",
                  "renewable energy"
            ],
            "priorityNames": [
                  "이진우",
                  "이강택",
                  "오지훈"
            ]
      },
      {
            "label": "수소/연료전지",
            "query": "수소 저장 인프라 연구실 추천해줘",
            "intent": "Hydrogen storage and infrastructure",
            "triggers": [
                  "수소 저장",
                  "hydrogen storage",
                  "액체수소"
            ],
            "terms": [
                  "hydrogen storage",
                  "수소 저장",
                  "액체수소",
                  "liquid hydrogen",
                  "hydrogen infrastructure"
            ],
            "contextTerms": [
                  "hydrogen",
                  "energy system",
                  "storage",
                  "fuel cell"
            ],
            "priorityNames": [
                  "장대준",
                  "배중면"
            ]
      },
      {
            "label": "수소/연료전지",
            "query": "산소발생반응 OER 촉매 교수님 추천해줘",
            "intent": "OER catalyst, electrocatalysis",
            "triggers": [
                  "oer",
                  "산소발생반응",
                  "oxygen evolution"
            ],
            "terms": [
                  "oxygen evolution",
                  "oer",
                  "산소발생반응",
                  "electrocatalyst",
                  "electrocatalysis"
            ],
            "contextTerms": [
                  "water electrolysis",
                  "hydrogen",
                  "catalyst",
                  "fuel cell"
            ],
            "priorityNames": [
                  "오지훈",
                  "이진우",
                  "이현주"
            ]
      },
      {
            "label": "나노소재/신소재",
            "query": "2D 소재 그래핀 교수님 추천해줘",
            "intent": "2D materials, graphene",
            "triggers": [
                  "2d 소재",
                  "그래핀",
                  "graphene",
                  "2d materials"
            ],
            "terms": [
                  "2d materials",
                  "2d material",
                  "graphene",
                  "그래핀",
                  "2d 소재",
                  "two-dimensional"
            ],
            "contextTerms": [
                  "nanomaterials",
                  "materials",
                  "surface",
                  "박막",
                  "semiconductor"
            ],
            "priorityNames": [
                  "조문호",
                  "양용수",
                  "정연식"
            ]
      },
      {
            "label": "나노소재/신소재",
            "query": "나노입자 합성 연구실 추천해줘",
            "intent": "Nanoparticle synthesis",
            "triggers": [
                  "나노입자",
                  "nanoparticle",
                  "nanoparticles"
            ],
            "terms": [
                  "nanoparticle",
                  "nanoparticles",
                  "나노입자",
                  "nanocrystal",
                  "colloid"
            ],
            "contextTerms": [
                  "nanomaterial",
                  "synthesis",
                  "materials chemistry",
                  "surface"
            ],
            "priorityNames": [
                  "이현주",
                  "정성윤"
            ]
      },
      {
            "label": "나노소재/신소재",
            "query": "전자현미경 분석 교수님 추천해줘",
            "intent": "TEM, electron microscopy, characterization",
            "triggers": [
                  "전자현미경",
                  "electron microscopy",
                  "tem"
            ],
            "terms": [
                  "electron microscopy",
                  "tem",
                  "transmission electron microscopy",
                  "전자현미경",
                  "현미경 분석",
                  "characterization"
            ],
            "contextTerms": [
                  "materials",
                  "nanomaterials",
                  "structure",
                  "surface analysis"
            ],
            "priorityNames": [
                  "양용수",
                  "정연식"
            ]
      },
      {
            "label": "나노소재/신소재",
            "query": "표면개질 소재 연구실 추천해줘",
            "intent": "Surface modification, interface engineering",
            "triggers": [
                  "표면개질",
                  "surface modification",
                  "surface engineering"
            ],
            "terms": [
                  "surface modification",
                  "surface engineering",
                  "표면개질",
                  "surface chemistry",
                  "interface engineering"
            ],
            "contextTerms": [
                  "materials",
                  "nanomaterial",
                  "surface",
                  "interface"
            ],
            "priorityNames": [
                  "정연식",
                  "이현주"
            ]
      },
      {
            "label": "나노소재/신소재",
            "query": "금속유기골격체 MOF 교수님 추천해줘",
            "intent": "MOF, porous material",
            "triggers": [
                  "mof",
                  "금속유기골격체",
                  "metal-organic framework"
            ],
            "terms": [
                  "mof",
                  "metal-organic framework",
                  "metal organic framework",
                  "금속유기골격체",
                  "porous material"
            ],
            "contextTerms": [
                  "materials",
                  "chemistry",
                  "nanomaterial",
                  "porous"
            ],
            "priorityNames": [
                  "윤동기",
                  "이희승"
            ]
      },
      {
            "label": "고분자/유기소재",
            "query": "고분자 자기조립 연구실 추천해줘",
            "intent": "Polymer self-assembly",
            "triggers": [
                  "고분자 자기조립",
                  "polymer self-assembly",
                  "self-assembly"
            ],
            "terms": [
                  "polymer self-assembly",
                  "self-assembly",
                  "self assembly",
                  "고분자 자기조립",
                  "블록공중합체"
            ],
            "contextTerms": [
                  "polymer",
                  "soft matter",
                  "organic materials",
                  "고분자"
            ],
            "priorityNames": [
                  "김범준",
                  "박수진"
            ]
      },
      {
            "label": "고분자/유기소재",
            "query": "유기반도체 교수님 추천해줘",
            "intent": "Organic semiconductor",
            "triggers": [
                  "유기반도체",
                  "organic semiconductor"
            ],
            "terms": [
                  "organic semiconductor",
                  "organic semiconductors",
                  "유기반도체",
                  "organic electronics"
            ],
            "contextTerms": [
                  "polymer",
                  "display",
                  "optoelectronic",
                  "organic materials"
            ],
            "priorityNames": [
                  "김범준",
                  "유승협"
            ]
      },
      {
            "label": "고분자/유기소재",
            "query": "소프트머터 콜로이드 연구실 추천해줘",
            "intent": "Soft matter, colloids",
            "triggers": [
                  "소프트머터",
                  "soft matter",
                  "colloid"
            ],
            "terms": [
                  "soft matter",
                  "소프트머터",
                  "colloid",
                  "colloids",
                  "complex fluid"
            ],
            "contextTerms": [
                  "polymer",
                  "self-assembly",
                  "materials",
                  "고분자"
            ],
            "priorityNames": [
                  "김범준",
                  "박수진"
            ]
      },
      {
            "label": "고분자/유기소재",
            "query": "스마트 폴리머 교수님 추천해줘",
            "intent": "Smart polymer, responsive polymer",
            "triggers": [
                  "스마트 폴리머",
                  "smart polymer",
                  "responsive polymer"
            ],
            "terms": [
                  "smart polymer",
                  "responsive polymer",
                  "스마트 폴리머",
                  "functional polymer",
                  "polymer",
                  "soft material",
                  "고분자",
                  "소프트"
            ],
            "contextTerms": [
                  "polymer",
                  "soft materials",
                  "hydrogel",
                  "고분자"
            ],
            "priorityNames": [
                  "박수진",
                  "김범준"
            ]
      },
      {
            "label": "고분자/유기소재",
            "query": "고분자 전해질 연구실 추천해줘",
            "intent": "Polymer electrolyte",
            "triggers": [
                  "고분자 전해질",
                  "polymer electrolyte"
            ],
            "terms": [
                  "polymer electrolyte",
                  "고분자 전해질",
                  "ion conducting polymer",
                  "solid polymer electrolyte",
                  "electrolyte",
                  "electrolytes",
                  "ion conduction",
                  "ionic conductivity",
                  "ion transport",
                  "전해질",
                  "이온전도"
            ],
            "contextTerms": [
                  "polymer",
                  "electrolyte",
                  "battery",
                  "fuel cell"
            ],
            "priorityNames": [
                  "최남순",
                  "김희탁",
                  "박수진"
            ]
      },
      {
            "label": "촉매/화학공정",
            "query": "전기촉매 반응 메커니즘 교수님 추천해줘",
            "intent": "Electrocatalysis mechanism",
            "triggers": [
                  "전기촉매",
                  "electrocatalysis",
                  "electrocatalyst"
            ],
            "terms": [
                  "electrocatalysis",
                  "electrocatalyst",
                  "전기촉매",
                  "hydrogen evolution",
                  "oxygen evolution"
            ],
            "contextTerms": [
                  "catalysis",
                  "reaction mechanism",
                  "chemical engineering",
                  "energy conversion"
            ],
            "priorityNames": [
                  "이현주",
                  "오지훈",
                  "조은애"
            ]
      },
      {
            "label": "촉매/화학공정",
            "query": "유기금속 촉매 연구실 추천해줘",
            "intent": "Organometallic catalysis",
            "triggers": [
                  "유기금속",
                  "organometallic"
            ],
            "terms": [
                  "organometallic",
                  "유기금속",
                  "transition metal catalysis",
                  "metal catalyst"
            ],
            "contextTerms": [
                  "organic synthesis",
                  "catalysis",
                  "chemistry"
            ],
            "priorityNames": [
                  "홍승우",
                  "이희승"
            ]
      },
      {
            "label": "촉매/화학공정",
            "query": "반응공학 교수님 추천해줘",
            "intent": "Reaction engineering",
            "triggers": [
                  "반응공학",
                  "reaction engineering",
                  "reactor"
            ],
            "terms": [
                  "reaction engineering",
                  "reactor",
                  "반응공학",
                  "reaction kinetics",
                  "chemical reactor"
            ],
            "contextTerms": [
                  "chemical process",
                  "chemical engineering",
                  "catalysis",
                  "process"
            ],
            "priorityNames": [
                  "박승빈",
                  "이현주"
            ]
      },
      {
            "label": "촉매/화학공정",
            "query": "광촉매 CO2 전환 연구실 추천해줘",
            "intent": "Photocatalysis, CO2 conversion",
            "triggers": [
                  "광촉매",
                  "photocatalysis",
                  "co2 전환"
            ],
            "terms": [
                  "photocatalysis",
                  "photocatalyst",
                  "광촉매",
                  "co2 conversion",
                  "carbon dioxide conversion"
            ],
            "contextTerms": [
                  "catalysis",
                  "chemical process",
                  "energy",
                  "materials"
            ],
            "priorityNames": [
                  "오지훈",
                  "이현주"
            ]
      },
      {
            "label": "촉매/화학공정",
            "query": "공정시스템 최적화 교수님 추천해줘",
            "intent": "Process systems engineering",
            "triggers": [
                  "공정시스템",
                  "process system",
                  "process optimization"
            ],
            "terms": [
                  "process systems",
                  "process system",
                  "process optimization",
                  "공정시스템",
                  "공정 최적화"
            ],
            "contextTerms": [
                  "chemical process",
                  "optimization",
                  "reaction engineering",
                  "manufacturing"
            ],
            "priorityNames": [
                  "문일철",
                  "박승빈"
            ]
      },
      {
            "label": "단백질/신약개발",
            "query": "단백질 구조 예측 교수님 추천해줘",
            "intent": "Protein structure prediction",
            "triggers": [
                  "단백질 구조",
                  "protein structure",
                  "protein folding"
            ],
            "terms": [
                  "protein structure",
                  "protein folding",
                  "단백질 구조",
                  "structural biology",
                  "protein design"
            ],
            "contextTerms": [
                  "protein",
                  "bioinformatics",
                  "drug discovery",
                  "computational biology"
            ],
            "priorityNames": [
                  "김학성",
                  "이상엽"
            ]
      },
      {
            "label": "단백질/신약개발",
            "query": "항체공학 연구실 추천해줘",
            "intent": "Antibody engineering",
            "triggers": [
                  "항체공학",
                  "antibody engineering",
                  "antibody"
            ],
            "terms": [
                  "antibody",
                  "antibody engineering",
                  "항체",
                  "항체공학",
                  "biologics"
            ],
            "contextTerms": [
                  "protein engineering",
                  "therapeutics",
                  "drug discovery"
            ],
            "priorityNames": [
                  "김학성"
            ]
      },
      {
            "label": "단백질/신약개발",
            "query": "약물전달 DDS 교수님 추천해줘",
            "intent": "Drug delivery system",
            "triggers": [
                  "약물전달",
                  "drug delivery",
                  "dds"
            ],
            "terms": [
                  "drug delivery",
                  "약물전달",
                  "dds",
                  "therapeutic delivery",
                  "nanomedicine"
            ],
            "contextTerms": [
                  "drug discovery",
                  "biomaterials",
                  "protein",
                  "biomedical"
            ],
            "priorityNames": [
                  "전상용",
                  "이상엽"
            ]
      },
      {
            "label": "단백질/신약개발",
            "query": "펩타이드 치료제 연구실 추천해줘",
            "intent": "Peptide therapeutics",
            "triggers": [
                  "펩타이드",
                  "peptide"
            ],
            "terms": [
                  "peptide",
                  "peptides",
                  "펩타이드",
                  "peptide therapeutics"
            ],
            "contextTerms": [
                  "protein",
                  "drug discovery",
                  "therapeutics",
                  "biologics"
            ],
            "priorityNames": [
                  "김학성",
                  "이희승"
            ]
      },
      {
            "label": "단백질/신약개발",
            "query": "신약 스크리닝 교수님 추천해줘",
            "intent": "Drug screening, discovery",
            "triggers": [
                  "신약 스크리닝",
                  "drug screening",
                  "drug discovery"
            ],
            "terms": [
                  "drug screening",
                  "drug discovery",
                  "신약개발",
                  "신약 스크리닝",
                  "screening"
            ],
            "contextTerms": [
                  "protein",
                  "therapeutics",
                  "medicinal chemistry",
                  "bioengineering"
            ],
            "priorityNames": [
                  "이상엽",
                  "김학성"
            ]
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "면역세포 연구실 추천해줘",
            "intent": "Immune cell, immunology",
            "triggers": [
                  "면역세포",
                  "immune cell",
                  "immunology"
            ],
            "terms": [
                  "immune cell",
                  "immune cells",
                  "immunology",
                  "면역세포",
                  "면역학",
                  "immune response"
            ],
            "contextTerms": [
                  "cell biology",
                  "molecular biology",
                  "disease",
                  "biology"
            ],
            "priorityNames": [
                  "신의철",
                  "최정균"
            ]
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "유전자 발현 조절 교수님 추천해줘",
            "intent": "Gene expression regulation",
            "triggers": [
                  "유전자 발현",
                  "gene expression",
                  "transcription"
            ],
            "terms": [
                  "gene expression",
                  "유전자 발현",
                  "transcription",
                  "gene regulation",
                  "전사 조절"
            ],
            "contextTerms": [
                  "molecular biology",
                  "cell biology",
                  "genomics",
                  "rna"
            ],
            "priorityNames": [
                  "최정균",
                  "김재경"
            ]
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "줄기세포 분화 연구실 추천해줘",
            "intent": "Stem cell differentiation",
            "triggers": [
                  "줄기세포",
                  "stem cell",
                  "differentiation"
            ],
            "terms": [
                  "stem cell",
                  "stem cells",
                  "줄기세포",
                  "differentiation",
                  "분화"
            ],
            "contextTerms": [
                  "cell biology",
                  "regeneration",
                  "developmental biology",
                  "biomaterials"
            ],
            "priorityNames": [
                  "김필남",
                  "전상용"
            ]
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "암세포 신호전달 교수님 추천해줘",
            "intent": "Cancer cell signaling",
            "triggers": [
                  "암세포",
                  "cancer cell",
                  "cell signaling"
            ],
            "terms": [
                  "cancer cell",
                  "cancer biology",
                  "cell signaling",
                  "암세포",
                  "세포신호",
                  "signal transduction"
            ],
            "contextTerms": [
                  "cell biology",
                  "molecular biology",
                  "disease",
                  "biology"
            ],
            "priorityNames": [
                  "김준",
                  "최정균"
            ]
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "RNA 생물학 연구실 추천해줘",
            "intent": "RNA biology",
            "triggers": [
                  "rna 생물학",
                  "rna biology",
                  "rna"
            ],
            "terms": [
                  "rna biology",
                  "rna",
                  "RNA 생물학",
                  "noncoding rna",
                  "rna regulation"
            ],
            "contextTerms": [
                  "molecular biology",
                  "gene expression",
                  "cell biology",
                  "genomics"
            ],
            "priorityNames": [
                  "최정균",
                  "김재경"
            ]
      },
      {
            "label": "자연어처리/LLM",
            "query": "RAG 검색증강생성 연구실 추천해줘",
            "intent": "Retrieval augmented generation",
            "triggers": [
                  "rag",
                  "검색증강생성",
                  "retrieval augmented"
            ],
            "terms": [
                  "retrieval augmented generation",
                  "rag",
                  "검색증강생성",
                  "retrieval-augmented",
                  "information retrieval",
                  "retrieval",
                  "search",
                  "nlp",
                  "language model",
                  "llm",
                  "검색",
                  "자연어처리"
            ],
            "contextTerms": [
                  "natural language processing",
                  "llm",
                  "language model",
                  "nlp"
            ],
            "priorityNames": [
                  "오혜연",
                  "최윤재"
            ]
      },
      {
            "label": "자연어처리/LLM",
            "query": "대규모 언어모델 교수님 추천해줘",
            "intent": "Large language model",
            "triggers": [
                  "대규모 언어모델",
                  "large language model",
                  "llm"
            ],
            "terms": [
                  "large language model",
                  "llm",
                  "language model",
                  "대규모 언어모델",
                  "언어모델"
            ],
            "contextTerms": [
                  "natural language processing",
                  "generative ai",
                  "foundation model",
                  "nlp"
            ],
            "priorityNames": [
                  "오혜연",
                  "최윤재"
            ]
      },
      {
            "label": "자연어처리/LLM",
            "query": "기계번역 연구실 추천해줘",
            "intent": "Machine translation",
            "triggers": [
                  "기계번역",
                  "machine translation"
            ],
            "terms": [
                  "machine translation",
                  "기계번역",
                  "translation",
                  "neural machine translation"
            ],
            "contextTerms": [
                  "natural language processing",
                  "language model",
                  "nlp"
            ],
            "priorityNames": [
                  "오혜연"
            ]
      },
      {
            "label": "자연어처리/LLM",
            "query": "문서 요약 교수님 추천해줘",
            "intent": "Text summarization",
            "triggers": [
                  "문서 요약",
                  "text summarization",
                  "summarization"
            ],
            "terms": [
                  "text summarization",
                  "summarization",
                  "문서 요약",
                  "요약",
                  "natural language processing",
                  "nlp",
                  "language model",
                  "large language model",
                  "llm",
                  "text mining",
                  "text",
                  "document",
                  "summary",
                  "문서",
                  "언어모델",
                  "자연어처리",
                  "텍스트"
            ],
            "contextTerms": [
                  "natural language processing",
                  "language model",
                  "nlp"
            ],
            "priorityNames": [
                  "오혜연"
            ]
      },
      {
            "label": "자연어처리/LLM",
            "query": "멀티모달 LLM 연구실 추천해줘",
            "intent": "Multimodal LLM",
            "triggers": [
                  "멀티모달 llm",
                  "multimodal llm",
                  "vision-language"
            ],
            "terms": [
                  "multimodal llm",
                  "multimodal",
                  "vision-language",
                  "멀티모달",
                  "large language model"
            ],
            "contextTerms": [
                  "llm",
                  "natural language processing",
                  "computer vision",
                  "generative ai"
            ],
            "priorityNames": [
                  "최윤재",
                  "오혜연"
            ]
      },
      {
            "label": "DB/빅데이터",
            "query": "데이터베이스 인덱싱 연구실 추천해줘",
            "intent": "Database indexing",
            "triggers": [
                  "인덱싱",
                  "database indexing",
                  "indexing"
            ],
            "terms": [
                  "database indexing",
                  "indexing",
                  "인덱싱",
                  "query processing",
                  "database"
            ],
            "contextTerms": [
                  "data management",
                  "big data",
                  "data engineering",
                  "데이터베이스"
            ],
            "priorityNames": [
                  "강완모"
            ]
      },
      {
            "label": "DB/빅데이터",
            "query": "데이터마이닝 교수님 추천해줘",
            "intent": "Data mining",
            "triggers": [
                  "데이터마이닝",
                  "data mining"
            ],
            "terms": [
                  "data mining",
                  "데이터마이닝",
                  "pattern mining",
                  "knowledge discovery"
            ],
            "contextTerms": [
                  "database",
                  "big data",
                  "machine learning",
                  "data science"
            ],
            "priorityNames": [
                  "강완모",
                  "오혜연"
            ]
      },
      {
            "label": "DB/빅데이터",
            "query": "그래프 데이터 분석 연구실 추천해줘",
            "intent": "Graph data analysis",
            "triggers": [
                  "그래프 데이터",
                  "graph data",
                  "graph mining"
            ],
            "terms": [
                  "graph mining",
                  "graph data",
                  "그래프 데이터",
                  "network analysis",
                  "graph analytics"
            ],
            "contextTerms": [
                  "data mining",
                  "database",
                  "machine learning",
                  "graph"
            ],
            "priorityNames": [
                  "강완모"
            ]
      },
      {
            "label": "DB/빅데이터",
            "query": "데이터 엔지니어링 교수님 추천해줘",
            "intent": "Data engineering",
            "triggers": [
                  "데이터 엔지니어링",
                  "data engineering"
            ],
            "terms": [
                  "data engineering",
                  "데이터 엔지니어링",
                  "data management",
                  "data system",
                  "database",
                  "big data",
                  "data mining",
                  "data",
                  "데이터베이스",
                  "빅데이터"
            ],
            "contextTerms": [
                  "database",
                  "big data",
                  "distributed system"
            ],
            "priorityNames": [
                  "강완모"
            ]
      },
      {
            "label": "DB/빅데이터",
            "query": "시계열 데이터 분석 연구실 추천해줘",
            "intent": "Time-series data analysis",
            "triggers": [
                  "시계열",
                  "time series",
                  "time-series"
            ],
            "terms": [
                  "time series",
                  "time-series",
                  "시계열",
                  "temporal data",
                  "sequence data",
                  "data analysis",
                  "데이터 분석",
                  "statistical learning",
                  "machine learning",
                  "big data"
            ],
            "contextTerms": [
                  "data mining",
                  "machine learning",
                  "statistics",
                  "big data"
            ],
            "priorityNames": [
                  "문일철",
                  "김재경"
            ]
      },
      {
            "label": "시스템/운영체제",
            "query": "운영체제 연구실 추천해줘",
            "intent": "Operating system",
            "triggers": [
                  "운영체제",
                  "operating system",
                  "os"
            ],
            "terms": [
                  "operating system",
                  "operating systems",
                  "운영체제",
                  "os kernel",
                  "kernel"
            ],
            "contextTerms": [
                  "computer system",
                  "distributed system",
                  "storage system",
                  "systems software"
            ],
            "priorityNames": [
                  "허재혁",
                  "신승원"
            ]
      },
      {
            "label": "시스템/운영체제",
            "query": "분산시스템 교수님 추천해줘",
            "intent": "Distributed system",
            "triggers": [
                  "분산시스템",
                  "distributed system"
            ],
            "terms": [
                  "distributed system",
                  "distributed systems",
                  "분산시스템",
                  "distributed computing"
            ],
            "contextTerms": [
                  "computer system",
                  "cloud",
                  "networked system",
                  "operating system"
            ],
            "priorityNames": [
                  "허재혁",
                  "신승원"
            ]
      },
      {
            "label": "시스템/운영체제",
            "query": "스토리지 시스템 연구실 추천해줘",
            "intent": "Storage system",
            "triggers": [
                  "스토리지",
                  "storage system",
                  "file system"
            ],
            "terms": [
                  "storage system",
                  "file system",
                  "스토리지",
                  "파일시스템",
                  "storage"
            ],
            "contextTerms": [
                  "computer system",
                  "operating system",
                  "distributed system"
            ],
            "priorityNames": [
                  "허재혁"
            ]
      },
      {
            "label": "시스템/운영체제",
            "query": "클라우드 컴퓨팅 교수님 추천해줘",
            "intent": "Cloud computing",
            "triggers": [
                  "클라우드",
                  "cloud computing",
                  "cloud"
            ],
            "terms": [
                  "cloud computing",
                  "cloud",
                  "클라우드",
                  "datacenter",
                  "data center"
            ],
            "contextTerms": [
                  "distributed system",
                  "computer system",
                  "network"
            ],
            "priorityNames": [
                  "허재혁",
                  "신승원"
            ]
      },
      {
            "label": "시스템/운영체제",
            "query": "엣지컴퓨팅 시스템 연구실 추천해줘",
            "intent": "Edge computing system",
            "triggers": [
                  "엣지컴퓨팅",
                  "edge computing"
            ],
            "terms": [
                  "edge computing",
                  "엣지컴퓨팅",
                  "edge system",
                  "mobile computing",
                  "edge",
                  "mobile",
                  "iot",
                  "embedded",
                  "system",
                  "엣지",
                  "모바일",
                  "임베디드"
            ],
            "contextTerms": [
                  "computer system",
                  "iot",
                  "embedded system",
                  "network"
            ],
            "priorityNames": [
                  "이성주",
                  "이의진"
            ]
      },
      {
            "label": "정보보안/암호",
            "query": "암호 프로토콜 교수님 추천해줘",
            "intent": "Cryptographic protocol",
            "triggers": [
                  "암호 프로토콜",
                  "cryptographic protocol",
                  "cryptography"
            ],
            "terms": [
                  "cryptographic protocol",
                  "cryptography",
                  "암호 프로토콜",
                  "암호학",
                  "secure computation"
            ],
            "contextTerms": [
                  "security",
                  "privacy",
                  "information security"
            ],
            "priorityNames": [
                  "신승원",
                  "서창호"
            ]
      },
      {
            "label": "정보보안/암호",
            "query": "네트워크 보안 연구실 추천해줘",
            "intent": "Network security",
            "triggers": [
                  "네트워크 보안",
                  "network security"
            ],
            "terms": [
                  "network security",
                  "네트워크 보안",
                  "security",
                  "intrusion detection"
            ],
            "contextTerms": [
                  "network",
                  "privacy",
                  "system security",
                  "information security"
            ],
            "priorityNames": [
                  "신승원"
            ]
      },
      {
            "label": "정보보안/암호",
            "query": "프라이버시 보호 AI 교수님 추천해줘",
            "intent": "Privacy-preserving AI",
            "triggers": [
                  "프라이버시",
                  "privacy preserving",
                  "privacy"
            ],
            "terms": [
                  "privacy",
                  "privacy-preserving",
                  "privacy preserving",
                  "프라이버시",
                  "differential privacy"
            ],
            "contextTerms": [
                  "security",
                  "machine learning",
                  "data",
                  "cryptography"
            ],
            "priorityNames": [
                  "신승원",
                  "문일철"
            ]
      },
      {
            "label": "정보보안/암호",
            "query": "하드웨어 보안 연구실 추천해줘",
            "intent": "Hardware security",
            "triggers": [
                  "하드웨어 보안",
                  "hardware security"
            ],
            "terms": [
                  "hardware security",
                  "하드웨어 보안",
                  "side channel",
                  "secure hardware",
                  "security",
                  "secure",
                  "cryptography",
                  "circuit",
                  "vlsi",
                  "하드웨어",
                  "보안"
            ],
            "contextTerms": [
                  "security",
                  "integrated circuit",
                  "vlsi",
                  "semiconductor"
            ],
            "priorityNames": [
                  "김주영",
                  "신영수"
            ]
      },
      {
            "label": "정보보안/암호",
            "query": "블록체인 보안 교수님 추천해줘",
            "intent": "Blockchain security",
            "triggers": [
                  "블록체인",
                  "blockchain"
            ],
            "terms": [
                  "blockchain",
                  "블록체인",
                  "distributed ledger",
                  "smart contract",
                  "security",
                  "cryptography",
                  "distributed system",
                  "secure",
                  "보안"
            ],
            "contextTerms": [
                  "security",
                  "cryptography",
                  "distributed system"
            ],
            "priorityNames": [
                  "신승원"
            ]
      },
      {
            "label": "전력전자/인버터",
            "query": "DC-DC 컨버터 교수님 추천해줘",
            "intent": "DC-DC converter",
            "triggers": [
                  "dc-dc",
                  "컨버터",
                  "converter"
            ],
            "terms": [
                  "dc-dc",
                  "dc dc",
                  "converter",
                  "power converter",
                  "컨버터",
                  "전력변환"
            ],
            "contextTerms": [
                  "power electronics",
                  "inverter",
                  "power management",
                  "전력전자"
            ],
            "priorityNames": [
                  "문건우",
                  "백재일"
            ]
      },
      {
            "label": "전력전자/인버터",
            "query": "모터 드라이브 인버터 연구실 추천해줘",
            "intent": "Motor drive inverter",
            "triggers": [
                  "모터 드라이브",
                  "motor drive",
                  "inverter"
            ],
            "terms": [
                  "motor drive",
                  "inverter",
                  "모터 드라이브",
                  "인버터",
                  "power electronics"
            ],
            "contextTerms": [
                  "power conversion",
                  "control",
                  "electric machine"
            ],
            "priorityNames": [
                  "문건우",
                  "김현식"
            ]
      },
      {
            "label": "전력전자/인버터",
            "query": "전력무결성 PI 교수님 추천해줘",
            "intent": "Power integrity",
            "triggers": [
                  "전력무결성",
                  "power integrity"
            ],
            "terms": [
                  "power integrity",
                  "전력무결성",
                  "pi",
                  "power delivery"
            ],
            "contextTerms": [
                  "power electronics",
                  "circuit",
                  "semiconductor",
                  "package"
            ],
            "priorityNames": [
                  "김정호"
            ]
      },
      {
            "label": "전력전자/인버터",
            "query": "무선전력전송 연구실 추천해줘",
            "intent": "Wireless power transfer",
            "triggers": [
                  "무선전력전송",
                  "wireless power"
            ],
            "terms": [
                  "wireless power",
                  "wireless power transfer",
                  "무선전력전송",
                  "전력전송",
                  "wireless",
                  "power electronics",
                  "electromagnetic",
                  "power transfer",
                  "전력",
                  "무선"
            ],
            "contextTerms": [
                  "power electronics",
                  "converter",
                  "inverter",
                  "전자기"
            ],
            "priorityNames": [
                  "문건우",
                  "백재일"
            ]
      },
      {
            "label": "전력전자/인버터",
            "query": "전원회로 설계 교수님 추천해줘",
            "intent": "Power management circuit",
            "triggers": [
                  "전원회로",
                  "power management",
                  "power circuit"
            ],
            "terms": [
                  "power management",
                  "power circuit",
                  "전원회로",
                  "pmic",
                  "power electronics"
            ],
            "contextTerms": [
                  "circuit design",
                  "converter",
                  "integrated circuit"
            ],
            "priorityNames": [
                  "문건우",
                  "김봉진"
            ]
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "렌더링 그래픽스 교수님 추천해줘",
            "intent": "Rendering, computer graphics",
            "triggers": [
                  "렌더링",
                  "rendering",
                  "computer graphics"
            ],
            "terms": [
                  "rendering",
                  "computer graphics",
                  "렌더링",
                  "그래픽스",
                  "visual computing"
            ],
            "contextTerms": [
                  "3d vision",
                  "image processing",
                  "computer vision"
            ],
            "priorityNames": [
                  "박진아",
                  "김광인",
                  "윤국진",
                  "손진희",
                  "노준석",
                  "이성주"
            ]
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "포인트클라우드 처리 연구실 추천해줘",
            "intent": "Point cloud processing",
            "triggers": [
                  "포인트클라우드",
                  "point cloud"
            ],
            "terms": [
                  "point cloud",
                  "point clouds",
                  "포인트클라우드",
                  "3d point",
                  "3d vision",
                  "3d",
                  "geometry",
                  "geometric",
                  "computer vision",
                  "컴퓨터비전",
                  "비전",
                  "3차원"
            ],
            "contextTerms": [
                  "3d vision",
                  "computer vision",
                  "geometry",
                  "graphics"
            ],
            "priorityNames": [
                  "박진아",
                  "김광인",
                  "윤국진",
                  "손진희",
                  "노준석"
            ]
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "3D reconstruction 교수님 추천해줘",
            "intent": "3D reconstruction",
            "triggers": [
                  "3d reconstruction",
                  "3D reconstruction",
                  "3차원 재구성"
            ],
            "terms": [
                  "3d reconstruction",
                  "3D reconstruction",
                  "3차원 재구성",
                  "3d vision",
                  "structure from motion"
            ],
            "contextTerms": [
                  "computer vision",
                  "graphics",
                  "visual computing"
            ],
            "priorityNames": [
                  "박진아",
                  "김광인",
                  "윤국진",
                  "손진희",
                  "노준석"
            ]
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "가상인간 애니메이션 연구실 추천해줘",
            "intent": "Virtual human, animation",
            "triggers": [
                  "가상인간",
                  "animation",
                  "virtual human"
            ],
            "terms": [
                  "virtual human",
                  "animation",
                  "가상인간",
                  "character animation",
                  "motion capture",
                  "virtual reality",
                  "vr",
                  "hci",
                  "human computer interaction",
                  "interaction",
                  "visual computing",
                  "graphics",
                  "애니메이션"
            ],
            "contextTerms": [
                  "computer graphics",
                  "hci",
                  "visual computing",
                  "vr"
            ],
            "priorityNames": [
                  "박진아",
                  "김광인",
                  "윤국진",
                  "손진희",
                  "노준석",
                  "최승문"
            ]
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "비주얼 컴퓨팅 교수님 추천해줘",
            "intent": "Visual computing",
            "triggers": [
                  "비주얼 컴퓨팅",
                  "visual computing"
            ],
            "terms": [
                  "visual computing",
                  "비주얼 컴퓨팅",
                  "computer graphics",
                  "3d vision"
            ],
            "contextTerms": [
                  "computer vision",
                  "rendering",
                  "image processing"
            ],
            "priorityNames": [
                  "박진아",
                  "김광인",
                  "윤국진",
                  "손진희",
                  "노준석"
            ]
      },
      {
            "label": "항공우주/추진",
            "query": "위성 궤도제어 교수님 추천해줘",
            "intent": "Satellite orbit control",
            "triggers": [
                  "위성",
                  "궤도",
                  "satellite",
                  "orbit"
            ],
            "terms": [
                  "satellite",
                  "orbit",
                  "orbital",
                  "위성",
                  "궤도",
                  "spacecraft"
            ],
            "contextTerms": [
                  "aerospace",
                  "control",
                  "guidance",
                  "space"
            ],
            "priorityNames": [
                  "유선철",
                  "김정훈",
                  "김형섭",
                  "심재윤",
                  "김동식",
                  "방효충",
                  "김유단"
            ]
      },
      {
            "label": "항공우주/추진",
            "query": "로켓 추진 연구실 추천해줘",
            "intent": "Rocket propulsion",
            "triggers": [
                  "로켓",
                  "추진",
                  "rocket",
                  "propulsion"
            ],
            "terms": [
                  "rocket",
                  "propulsion",
                  "로켓",
                  "추진",
                  "thruster",
                  "combustion"
            ],
            "contextTerms": [
                  "aerospace",
                  "engine",
                  "fluid",
                  "thermal"
            ],
            "priorityNames": [
                  "유선철",
                  "김정훈",
                  "김형섭",
                  "심재윤",
                  "김동식",
                  "윤성기",
                  "최해천"
            ]
      },
      {
            "label": "항공우주/추진",
            "query": "UAV 비행제어 교수님 추천해줘",
            "intent": "UAV flight control",
            "triggers": [
                  "uav",
                  "비행제어",
                  "flight control"
            ],
            "terms": [
                  "uav",
                  "flight control",
                  "비행제어",
                  "unmanned aerial",
                  "drone"
            ],
            "contextTerms": [
                  "aerospace",
                  "control",
                  "guidance",
                  "trajectory"
            ],
            "priorityNames": [
                  "유선철",
                  "김정훈",
                  "김형섭",
                  "심재윤",
                  "김동식",
                  "김현진",
                  "방효충"
            ]
      },
      {
            "label": "항공우주/추진",
            "query": "열유체 항공엔진 연구실 추천해줘",
            "intent": "Thermofluid, aircraft engine",
            "triggers": [
                  "열유체",
                  "aircraft engine",
                  "engine"
            ],
            "terms": [
                  "thermal fluid",
                  "thermofluid",
                  "열유체",
                  "aircraft engine",
                  "engine",
                  "combustion"
            ],
            "contextTerms": [
                  "aerospace",
                  "propulsion",
                  "fluid dynamics"
            ],
            "priorityNames": [
                  "유선철",
                  "김정훈",
                  "김형섭",
                  "심재윤",
                  "김동식",
                  "최해천",
                  "윤성기"
            ]
      },
      {
            "label": "항공우주/추진",
            "query": "우주 구조물 교수님 추천해줘",
            "intent": "Space structure",
            "triggers": [
                  "우주 구조물",
                  "space structure",
                  "space structures"
            ],
            "terms": [
                  "space structure",
                  "space structures",
                  "우주 구조물",
                  "spacecraft structure",
                  "space",
                  "structure",
                  "structures",
                  "mechanics",
                  "aerospace",
                  "satellite",
                  "우주",
                  "구조물",
                  "위성"
            ],
            "contextTerms": [
                  "aerospace",
                  "satellite",
                  "mechanics",
                  "structures"
            ],
            "priorityNames": [
                  "유선철",
                  "김정훈",
                  "김형섭",
                  "심재윤",
                  "김동식",
                  "방효충",
                  "김유단"
            ]
      },
      {
            "label": "환경/기후/지속가능",
            "query": "탄소포집 CO2 전환 교수님 추천해줘",
            "intent": "Carbon capture, CO2 conversion",
            "triggers": [
                  "탄소포집",
                  "co2 전환",
                  "carbon capture",
                  "co2 conversion"
            ],
            "terms": [
                  "carbon capture",
                  "co2 conversion",
                  "co2 capture",
                  "탄소포집",
                  "이산화탄소 전환",
                  "carbon dioxide"
            ],
            "contextTerms": [
                  "environment",
                  "sustainability",
                  "catalysis",
                  "climate"
            ],
            "priorityNames": [
                  "최원용",
                  "박현규",
                  "정성준",
                  "김원배",
                  "조창신",
                  "권태혁",
                  "이재우"
            ]
      },
      {
            "label": "환경/기후/지속가능",
            "query": "수처리 분리막 연구실 추천해줘",
            "intent": "Water treatment membrane",
            "triggers": [
                  "수처리",
                  "water treatment",
                  "membrane"
            ],
            "terms": [
                  "water treatment",
                  "membrane",
                  "수처리",
                  "분리막",
                  "desalination",
                  "water purification"
            ],
            "contextTerms": [
                  "environmental engineering",
                  "separation",
                  "sustainability"
            ],
            "priorityNames": [
                  "최원용",
                  "박현규",
                  "정성준",
                  "김원배",
                  "조창신",
                  "최희철",
                  "김일두"
            ]
      },
      {
            "label": "환경/기후/지속가능",
            "query": "대기오염 저감 교수님 추천해줘",
            "intent": "Air pollution control",
            "triggers": [
                  "대기오염",
                  "air pollution",
                  "emission"
            ],
            "terms": [
                  "air pollution",
                  "emission",
                  "대기오염",
                  "air quality",
                  "pollutant"
            ],
            "contextTerms": [
                  "environment",
                  "climate",
                  "sustainability",
                  "chemical engineering"
            ],
            "priorityNames": [
                  "최원용",
                  "박현규",
                  "정성준",
                  "김원배",
                  "조창신",
                  "박승빈",
                  "권태혁"
            ]
      },
      {
            "label": "환경/기후/지속가능",
            "query": "기후모델링 연구실 추천해줘",
            "intent": "Climate modeling",
            "triggers": [
                  "기후모델링",
                  "climate modeling",
                  "climate model"
            ],
            "terms": [
                  "climate modeling",
                  "climate model",
                  "기후모델링",
                  "climate",
                  "earth system"
            ],
            "contextTerms": [
                  "environment",
                  "sustainability",
                  "data",
                  "simulation"
            ],
            "priorityNames": [
                  "최원용",
                  "박현규",
                  "정성준",
                  "김원배",
                  "조창신",
                  "권태혁"
            ]
      },
      {
            "label": "환경/기후/지속가능",
            "query": "지속가능 에너지 시스템 교수님 추천해줘",
            "intent": "Sustainable energy system",
            "triggers": [
                  "지속가능 에너지",
                  "sustainable energy",
                  "energy system"
            ],
            "terms": [
                  "sustainable energy",
                  "energy system",
                  "지속가능 에너지",
                  "renewable energy",
                  "sustainability"
            ],
            "contextTerms": [
                  "environment",
                  "hydrogen",
                  "fuel cell",
                  "battery",
                  "climate"
            ],
            "priorityNames": [
                  "최원용",
                  "박현규",
                  "정성준",
                  "김원배",
                  "조창신",
                  "권태혁",
                  "배중면",
                  "김희탁"
            ]
      }
];

      function postechDiverseNorm(value) {
        return normalize(String(value || ""));
      }
      function postechDiverseProfessorText(professor) {
        if (!professor) return "";
        if (professor._postechDiverseTextCache) return professor._postechDiverseTextCache;
        const chunks = [];
        function collect(value) {
          if (!value) return;
          if (typeof value === "string" || typeof value === "number") chunks.push(String(value));
          else if (Array.isArray(value)) value.forEach(collect);
          else if (typeof value === "object") Object.values(value).forEach(collect);
        }
        ["professor","professorEn","title","unitLabels","labNames","fields","summary","summaries","intentTags","keywords","searchText","representativeSignals","structuredProfile","_internalPositiveQueries","_internalWeakQueries","_internalRecommendationRecords"].forEach((key) => collect(professor[key]));
        professor._postechDiverseTextCache = postechDiverseNorm(chunks.join(" "));
        return professor._postechDiverseTextCache;
      }
      function postechDiverseTermHit(text, rawTerm) {
        const term = postechDiverseNorm(rawTerm);
        if (!term || term.length < 2) return false;
        if (/^[a-z0-9+#./-]{2,3}$/.test(term)) {
          return new RegExp("(^|[^a-z0-9])" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])").test(text);
        }
        return text.includes(term);
      }
      function postechDiverseHits(text, terms, limit) {
        const out = [];
        const seen = new Set();
        (terms || []).forEach((term) => {
          if (out.length >= (limit || 8)) return;
          const n = postechDiverseNorm(term);
          if (!n || seen.has(n)) return;
          if (postechDiverseTermHit(text, term)) {
            out.push(term);
            seen.add(n);
          }
        });
        return out.slice(0, limit || 8);
      }
      function postechDiverseProfileFor(query, mode) {
        const safeMode = mode || "precise";
        if (safeMode === "banner_explore" || safeMode === "explore") return null;
        const q = postechDiverseNorm(query || "");
        if (!q) return null;
        return POSTECH_DIVERSE_PRECISE_PROFILES.find((profile) => (profile.triggers || []).some((trigger) => postechDiverseTermHit(q, trigger)));
      }
      function postechDiverseNameRank(professor, names) {
        const n = postechDiverseNorm([professor && professor.professor, professor && professor.professorEn].join(" "));
        const idx = (names || []).findIndex((name) => n.includes(postechDiverseNorm(name)));
        return idx < 0 ? 9999 : idx;
      }
      const postechDiversePreviousRecommend = recommend;
      recommend = function(query, limit = 8, mode = "precise") {
        const profile = postechDiverseProfileFor(query, mode);
        if (!profile) return postechDiversePreviousRecommend(query, limit, mode);
        const maxDirect = Math.max(limit || RECOMMEND_RESULT_LIMIT || 120, 80);
        const direct = [];
        const adjacent = [];
        professors.forEach((professor) => {
          const text = postechDiverseProfessorText(professor);
          const exactHits = postechDiverseHits(text, profile.terms || [], 8);
          const contextHits = postechDiverseHits(text, profile.contextTerms || [], 6);
          if (exactHits.length) {
            const rank = postechDiverseNameRank(professor, profile.priorityNames || []);
            const priorityBoost = rank < 9999 ? Math.max(0, 240 - rank * 24) : 0;
            const item = { professor, score: 0, matched: [], reasons: [] };
            item.score = Math.round(1450 + exactHits.length * 520 + Math.min(240, contextHits.length * 40) + priorityBoost + Math.min(Number((professor || {}).qualityScore || 0) / 15, 8));
            item.matched = Array.from(new Set([...(exactHits || []), ...(contextHits || [])])).slice(0, 8);
            item.relevanceTier = item.score >= 2100 ? "A" : "B";
            item._postechTier = "direct";
            item._postechPrecisionIntent = profile.label;
            item._postechPrecisionEvidence = exactHits.slice(0, 6);
            item.reasons = [`${profile.label} 직접 검색어와 연결됩니다`];
            direct.push(item);
          } else if (contextHits.length) {
            const item = { professor, score: 0, matched: [], reasons: [] };
            item.score = Math.round(260 + Math.min(360, contextHits.length * 60) + Math.min(Number((professor || {}).qualityScore || 0) / 40, 5));
            item.matched = contextHits.slice(0, 6);
            item.relevanceTier = "C";
            item._postechTier = "adjacent";
            item._postechPrecisionIntent = profile.label;
            item._postechAdjacentEvidence = contextHits.slice(0, 5);
            item.reasons = [`${profile.label} 인접 분야와 연결됩니다`];
            adjacent.push(item);
          }
        });
        direct.sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String((a.professor || {}).professor || "").localeCompare(String((b.professor || {}).professor || ""), "ko"));
        adjacent.sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String((a.professor || {}).professor || "").localeCompare(String((b.professor || {}).professor || ""), "ko"));
        const out = direct.length ? direct.slice(0, maxDirect) : [];
        out._adjacentResults = adjacent.slice(0, 40);
        out._tieredMeta = {
          mode: "precise",
          intentId: "algorithm5_diverse_precise",
          intentLabel: profile.label,
          preciseIntent: profile.intent,
          directCount: direct.length,
          adjacentCount: adjacent.length,
          diversityRegression: true,
          bannerQuerySeparated: true
        };
        return out;
      };

      const postechDiversePreviousBuildMatchEvidenceText = buildMatchEvidenceText;
      buildMatchEvidenceText = function(item) {
        if (item && item._postechPrecisionEvidence && item._postechPrecisionEvidence.length) {
          return `${item._postechPrecisionEvidence.slice(0, 5).join(", ")} 키워드가 직접 검색어와 직접 연결됩니다.`;
        }
        if (item && item._postechTier === "adjacent" && item._postechAdjacentEvidence && item._postechAdjacentEvidence.length) {
          return `인접 분야 근거: ${item._postechAdjacentEvidence.slice(0, 4).join(", ")} 키워드가 입력 분야와 가까운 연구 주제입니다.`;
        }
        return postechDiversePreviousBuildMatchEvidenceText(item);
      };
    })();


    init();
