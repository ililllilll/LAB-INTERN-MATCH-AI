const DATA = window.KAIST_LAB_MATCH_DATA;
    const KAIST_FINAL_INTERNAL_DB = window.KAIST_FINAL_INTERNAL_RECOMMENDATION_DB_DATA || {};

    function internalNormForMerge(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
    }

    function internalUniqueAppend(current, additions, maxItems) {
      const out = Array.isArray(current) ? current.slice() : [];
      const seen = new Set(out.map((item) => String(item || "").toLowerCase().trim()).filter(Boolean));
      (Array.isArray(additions) ? additions : [additions]).forEach((item) => {
        const value = String(item || "").trim();
        const key = value.toLowerCase();
        if (!value || seen.has(key)) return;
        seen.add(key);
        out.push(value);
      });
      return maxItems ? out.slice(0, maxItems) : out;
    }

    function internalUrlKey(value) {
      try {
        const url = new URL(String(value || ""));
        return (url.hostname || "").replace(/^www\./, "") + (url.pathname || "").replace(/\/$/, "");
      } catch (_) {
        return "";
      }
    }

    function chooseInternalRecordsForProfessor(professor, internalRecordsByName) {
      const name = String(professor.professor || "").trim();
      const candidates = internalRecordsByName.get(name) || [];
      if (candidates.length <= 1) return candidates;
      const visibleText = [
        professor.professor, professor.professorEn,
        ...(professor.unitLabels || []), ...(professor.unitCodes || []),
        ...(professor.labNames || []), ...(professor.fields || []),
        professor.summary, ...(professor.summaries || []), professor.homepage, ...(professor.homepages || [])
      ].join(" ").toLowerCase();
      const visibleUrls = new Set([professor.homepage, ...(professor.homepages || [])].map(internalUrlKey).filter(Boolean));
      const scored = candidates.map((record) => {
        let score = 0;
        (record.department_codes || []).forEach((code) => { if ((professor.unitCodes || []).includes(code)) score += 80; });
        (record.departments || []).forEach((dept) => { if (visibleText.includes(String(dept || "").toLowerCase())) score += 40; });
        (record.homepages || []).map(internalUrlKey).filter(Boolean).forEach((urlKey) => { if (visibleUrls.has(urlKey)) score += 120; });
        (record.lab_names || []).forEach((lab) => { const k = String(lab || "").toLowerCase(); if (k.length > 5 && visibleText.includes(k)) score += 90; });
        (record.primary_domains || []).concat(record.subfields || [], record.positive_queries || []).forEach((term) => { const k = String(term || "").toLowerCase(); if (k.length > 3 && visibleText.includes(k)) score += 10; });
        return { record, score };
      }).sort((a, b) => b.score - a.score);
      const bestScore = scored[0] ? scored[0].score : 0;
      if (bestScore <= 0) return candidates;
      return scored.filter((item) => item.score >= Math.max(40, bestScore * 0.55)).map((item) => item.record);
    }

    function applyInternalRecommendationLayer(baseProfessors, internalDb) {
      const records = (internalDb && Array.isArray(internalDb.records)) ? internalDb.records : [];
      const byName = new Map();
      records.forEach((record) => {
        const name = String(record.professor || "").trim();
        if (!name) return;
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push(record);
      });
      return (baseProfessors || []).map((professor) => {
        const internalRecords = chooseInternalRecordsForProfessor(professor, byName);
        if (!internalRecords.length) return professor;
        const positive = internalRecords.flatMap((r) => [].concat(r.positive_queries || [], r.aliases_ko || [], r.aliases_en || [], r.subfields || [], r.primary_domains || []));
        const weak = internalRecords.flatMap((r) => [].concat(r.weak_queries || [], r.secondary_domains || []));
        const negative = internalRecords.flatMap((r) => [].concat(r.negative_queries || []));
        const methods = internalRecords.flatMap((r) => r.methods || []);
        const targets = internalRecords.flatMap((r) => r.materials_or_targets || []);
        const apps = internalRecords.flatMap((r) => r.applications || []);
        const labNames = internalRecords.flatMap((r) => r.lab_names || []);
        const homepages = internalRecords.flatMap((r) => r.homepages || []);
        const departments = internalRecords.flatMap((r) => r.departments || []);
        const departmentCodes = internalRecords.flatMap((r) => r.department_codes || []);
        const internalText = [].concat(positive, weak, methods, targets, apps, labNames, departments).join(" ");
        return {
          ...professor,
          unitCodes: internalUniqueAppend(professor.unitCodes || [], departmentCodes, 30),
          unitLabels: internalUniqueAppend(professor.unitLabels || [], departments, 30),
          labNames: internalUniqueAppend(professor.labNames || [], labNames, 12),
          homepages: internalUniqueAppend([professor.homepage, ...(professor.homepages || [])].filter(Boolean), homepages, 20),
          keywords: internalUniqueAppend(professor.keywords || [], [].concat(positive, methods, targets, apps), 800),
          searchText: [professor.searchText || "", internalText].join("\n"),
          _internalRecommendationRecords: internalRecords,
          _internalPositiveQueries: internalUniqueAppend([], positive, 500),
          _internalWeakQueries: internalUniqueAppend([], weak, 300),
          _internalNegativeQueries: internalUniqueAppend([], negative, 300)
        };
      });
    }

    const professors = applyInternalRecommendationLayer(DATA.professors || DATA.labs, KAIST_FINAL_INTERNAL_DB);
    const INITIAL_RESULT_COUNT = 5;
    const LOAD_MORE_RESULT_COUNT = 10;
    const RECOMMEND_RESULT_LIMIT = 120;

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

    const examples = [
      { label: "반도체 소자/공정", query: "반도체 소자, 박막 증착, 트랜지스터 공정 연구 관련 교수님을 추천해 주세요", algorithmQuery: "반도체 소자 공정", intent: "semiconductor_device_process_general", mode: "banner_explore" },
      { label: "배터리/전기화학", query: "리튬금속 배터리, 전고체전지, 전기화학 에너지 저장 연구 관련 교수님을 추천해 주세요", algorithmQuery: "배터리", intent: "battery_general", mode: "banner_explore" },
      { label: "디스플레이", query: "OLED, Micro LED, 플렉서블 디스플레이, 발광소자 연구 관련 교수님을 추천해 주세요", algorithmQuery: "디스플레이", intent: "display_general", mode: "banner_explore" },
      { label: "포토닉스/광전소자", query: "포토닉스, 광전소자, 나노광학, 레이저, 광검출기 연구 관련 교수님을 추천해 주세요", algorithmQuery: "포토닉스 광전소자", intent: "photonics_optoelectronics_general", mode: "banner_explore" },
      { label: "AI/머신러닝", query: "머신러닝, 딥러닝, 강화학습, 생성형 AI 연구 관련 교수님을 추천해 주세요", algorithmQuery: "AI 머신러닝", intent: "ai_ml_general", mode: "banner_explore" },
      { label: "컴퓨터비전/영상인식", query: "컴퓨터 비전, 영상인식, 객체검출, 멀티모달 AI 연구 관련 교수님을 추천해 주세요", algorithmQuery: "컴퓨터비전 영상인식", intent: "computer_vision_general", mode: "banner_explore" },
      { label: "바이오센서/생체전자", query: "바이오센서, 생체전자소자, 웨어러블 센서, 임플란터블 소자 연구 관련 교수님을 추천해 주세요", algorithmQuery: "바이오센서 생체전자", intent: "biosensor_bioelectronics_general", mode: "banner_explore" },
      { label: "뇌과학/BCI", query: "실험 뇌과학, BCI, 신경공학, 신경전극, 뇌영상 연구 관련 교수님을 추천해 주세요", algorithmQuery: "뇌과학 BCI", intent: "neuroscience_bci_general", mode: "banner_explore" },
      { label: "의료영상/디지털헬스", query: "의료영상 딥러닝, MRI, 디지털헬스, 헬스케어 AI 연구 관련 교수님을 추천해 주세요", algorithmQuery: "의료영상 디지털헬스", intent: "medical_imaging_digital_health_general", mode: "banner_explore" },
      { label: "로봇/자율주행", query: "로봇, 자율주행, SLAM, 드론, 모빌리티 연구 관련 교수님을 추천해 주세요", algorithmQuery: "로봇 자율주행 제어", intent: "robotics_autonomous_control_general", mode: "banner_explore" },
      { label: "HCI/AR·VR", query: "HCI, AR, VR, UX, 인터랙션, 사용자 경험 연구 관련 교수님을 추천해 주세요", algorithmQuery: "HCI AR VR", intent: "hci_ar_vr_general", mode: "banner_explore" },
      { label: "양자컴퓨팅/양자정보", query: "양자컴퓨팅, 양자정보, 양자알고리즘, 양자시뮬레이션 연구 관련 교수님을 추천해 주세요", algorithmQuery: "양자컴퓨팅 양자정보", intent: "quantum_computing_information_general", mode: "banner_explore" },
      { label: "AI 반도체/VLSI", query: "AI 반도체, VLSI, SoC, 하드웨어 가속기, 집적회로 설계 연구 관련 교수님을 추천해 주세요", algorithmQuery: "AI 반도체 VLSI", intent: "ai_semiconductor_vlsi_general", mode: "banner_explore" },
      { label: "반도체 패키징/이종집적", query: "반도체 패키징, 칩렛, 3D IC, 이종집적, 인터커넥트 연구 관련 교수님을 추천해 주세요", algorithmQuery: "반도체 패키징 이종집적", intent: "semiconductor_packaging_heterogeneous_integration_general", mode: "banner_explore" },
      { label: "수소/연료전지", query: "수소 생산, 연료전지, 전기화학 에너지 변환, 촉매 연구 관련 교수님을 추천해 주세요", algorithmQuery: "수소 연료전지", intent: "hydrogen_fuelcell_general", mode: "banner_explore" },
      { label: "나노소재/신소재", query: "나노소재, 신소재, 2D 소재, 그래핀, 표면 분석 연구 관련 교수님을 추천해 주세요", algorithmQuery: "나노소재 신소재", intent: "materials_nano_general", mode: "banner_explore" },
      { label: "고분자/유기소재", query: "고분자, 유기소재, 소프트머터, 스마트 폴리머 연구 관련 교수님을 추천해 주세요", algorithmQuery: "고분자 유기소재", intent: "polymer_organic_materials_general", mode: "banner_explore" },
      { label: "촉매/화학공정", query: "촉매, 유기합성, 반응공학, 화학공정 연구 관련 교수님을 추천해 주세요", algorithmQuery: "촉매 화학공정", intent: "catalysis_chemical_process_general", mode: "banner_explore" },
      { label: "단백질/신약개발", query: "단백질 공학, 신약개발, 약물전달, 바이오분자공학 연구 관련 교수님을 추천해 주세요", algorithmQuery: "단백질 신약개발", intent: "protein_drug_development_general", mode: "banner_explore" },
      { label: "세포/면역/분자생물학", query: "세포생물학, 면역학, 분자생물학, 질병 기전 연구 관련 교수님을 추천해 주세요", algorithmQuery: "세포 면역 분자생물학", intent: "cell_immunology_molecular_biology_general", mode: "banner_explore" },
      { label: "자연어처리/LLM", query: "자연어처리, LLM, 언어모델, 생성형 AI 연구 관련 교수님을 추천해 주세요", algorithmQuery: "자연어처리 LLM", intent: "nlp_llm_general", mode: "banner_explore" },
      { label: "DB/빅데이터", query: "데이터베이스, 빅데이터, 데이터마이닝, 추천시스템 연구 관련 교수님을 추천해 주세요", algorithmQuery: "데이터베이스 빅데이터", intent: "database_bigdata_general", mode: "banner_explore" },
      { label: "시스템/운영체제", query: "운영체제, 분산시스템, 스토리지, 클라우드 컴퓨팅 연구 관련 교수님을 추천해 주세요", algorithmQuery: "운영체제 분산시스템", intent: "systems_os_distributed_general", mode: "banner_explore" },
      { label: "정보보안/암호", query: "정보보안, 암호, 프라이버시, 시스템 보안 연구 관련 교수님을 추천해 주세요", algorithmQuery: "정보보안 암호", intent: "security_cryptography_general", mode: "banner_explore" },
      { label: "전력전자/인버터", query: "전력전자, 인버터, 컨버터, 전력변환, 전원회로 연구 관련 교수님을 추천해 주세요", algorithmQuery: "전력전자 인버터", intent: "power_electronics_inverter_general", mode: "banner_explore" },
      { label: "그래픽스/3D 비전", query: "컴퓨터 그래픽스, 3D 비전, 렌더링, 비주얼 컴퓨팅 연구 관련 교수님을 추천해 주세요", algorithmQuery: "그래픽스 3D 비전", intent: "graphics_3d_vision_general", mode: "banner_explore" },
      { label: "항공우주/추진", query: "항공우주, 추진, 로켓, 위성, 열유체 연구 관련 교수님을 추천해 주세요", algorithmQuery: "항공우주 추진", intent: "aerospace_propulsion_general", mode: "banner_explore" },
      { label: "환경/기후/지속가능", query: "환경공학, 기후, 탄소중립, 지속가능 에너지 시스템 연구 관련 교수님을 추천해 주세요", algorithmQuery: "환경 기후 지속가능", intent: "environment_climate_sustainability_general", mode: "banner_explore" },
    ];



    // 외부 검색 및 STAR Library 기반 대표 후보 보정표입니다.
    // 기존 DB 필드를 삭제하지 않고, 상단 대표 분야 또는 동일한 질의가 들어왔을 때 대표성이 높은 교수님을 정렬에서 우선 고려합니다.
    const representativeCategorySignals = {
      "반도체 소자/공정": {
            "triggers": [
                  "반도체 소자",
                  "반도체 공정",
                  "산화막",
                  "ald",
                  "박막",
                  "트랜지스터",
                  "semiconductor process",
                  "semiconductor device"
            ],
            "names": [
                  "김경민",
                  "권지민",
                  "최양규",
                  "김상현",
                  "전상훈",
                  "조병진",
                  "최성율",
                  "박병국",
                  "정재웅"
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
                  "회로설계"
            ],
            "names": [
                  "김봉진",
                  "조성환",
                  "류승탁",
                  "유민수",
                  "신영수",
                  "정완영",
                  "제민규",
                  "조병학",
                  "김주영"
            ]
      },
      "반도체 패키징/이종집적": {
            "triggers": [
                  "반도체 패키징",
                  "패키징",
                  "칩렛",
                  "chiplet",
                  "3d ic",
                  "이종집적",
                  "interconnect",
                  "인터커넥트"
            ],
            "names": [
                  "권지민",
                  "김정호",
                  "이상호",
                  "임성갑",
                  "김상현"
            ]
      },
      "디스플레이": {
            "triggers": [
                  "디스플레이",
                  "oled",
                  "micro led",
                  "마이크로 led",
                  "발광소자",
                  "display"
            ],
            "names": [
                  "박상희",
                  "유승협",
                  "최경철",
                  "김상현",
                  "신종화",
                  "전상훈"
            ]
      },
      "포토닉스/광전소자": {
            "triggers": [
                  "포토닉스",
                  "광전소자",
                  "나노광학",
                  "광검출기",
                  "레이저",
                  "photonics",
                  "optoelectronic",
                  "nanophotonics"
            ],
            "names": [
                  "김상식",
                  "송영민",
                  "함자 쿠르트",
                  "유경식",
                  "신종화",
                  "장민석",
                  "김상현",
                  "유승협",
                  "최성율"
            ]
      },
      "배터리/전기화학": {
            "triggers": [
                  "배터리",
                  "전기화학",
                  "리튬",
                  "전고체",
                  "이차전지",
                  "리튬이온전지",
                  "양극재",
                  "음극재",
                  "전해질",
                  "고체전해질",
                  "전고체전지",
                  "리튬금속전지",
                  "배터리 소재",
                  "배터리 계면",
                  "에너지 저장",
                  "battery",
                  "batteries",
                  "lithium",
                  "lithium-ion battery",
                  "cathode",
                  "anode",
                  "electrolyte",
                  "solid-state battery",
                  "battery materials",
                  "energy storage"
            ],
            "names": [
                  "김희탁",
                  "최남순",
                  "서동화",
                  "강정구",
                  "변혜령",
                  "이윤구",
                  "김성수",
                  "조은애",
                  "황승준",
                  "홍승범",
                  "김일두",
                  "정성윤",
                  "박선아",
                  "이진우",
                  "조은선"
            ]
      },
      "수소/연료전지": {
            "triggers": [
                  "수소",
                  "연료전지",
                  "수전해",
                  "그린수소",
                  "fuel cell",
                  "hydrogen",
                  "electrolysis"
            ],
            "names": [
                  "조은애",
                  "배중면",
                  "이강택",
                  "김희탁",
                  "이진우",
                  "이현주",
                  "정우철",
                  "오지훈",
                  "김일두",
                  "황승준",
                  "박승빈",
                  "장대준"
            ]
      },
      "나노소재/신소재": {
            "triggers": [
                  "나노소재",
                  "신소재",
                  "2d 소재",
                  "그래핀",
                  "표면 분석",
                  "nanomaterial",
                  "materials"
            ],
            "names": [
                  "김일두",
                  "변혜령",
                  "정성윤",
                  "이창환",
                  "염지현",
                  "김상현",
                  "최성율",
                  "이상호",
                  "박찬범"
            ]
      },
      "고분자/유기소재": {
            "triggers": [
                  "고분자",
                  "유기소재",
                  "소프트머터",
                  "폴리머",
                  "polymer",
                  "soft matter"
            ],
            "names": [
                  "리섕",
                  "문홍철",
                  "정연식",
                  "김유천",
                  "최남순",
                  "임성갑",
                  "김범준",
                  "김신현"
            ]
      },
      "촉매/화학공정": {
            "triggers": [
                  "촉매",
                  "화학공정",
                  "유기합성",
                  "반응공학",
                  "catalysis",
                  "catalyst",
                  "reaction engineering"
            ],
            "names": [
                  "황승준",
                  "이현주",
                  "박승빈",
                  "이윤미",
                  "정민주",
                  "이진우",
                  "오지훈",
                  "정우철",
                  "최민기"
            ]
      },
      "바이오센서/생체전자": {
            "triggers": [
                  "바이오센서",
                  "생체전자",
                  "웨어러블 센서",
                  "임플란터블",
                  "bioelectronics",
                  "biosensor"
            ],
            "names": [
                  "Song Ih Ahn",
                  "정재웅",
                  "제민규",
                  "Jungchul Lee",
                  "이영준",
                  "최양규",
                  "정용"
            ]
      },
      "뇌과학/BCI": {
            "triggers": [
                  "뇌과학",
                  "bci",
                  "신경공학",
                  "신경전극",
                  "뇌영상",
                  "brain",
                  "neuro"
            ],
            "names": [
                  "이영준",
                  "이승우",
                  "정용",
                  "정아인",
                  "권정태",
                  "김대식",
                  "박성홍",
                  "이상완"
            ]
      },
      "의료영상/디지털헬스": {
            "triggers": [
                  "의료영상",
                  "디지털헬스",
                  "헬스케어 ai",
                  "mri",
                  "medical imaging",
                  "digital health"
            ],
            "names": [
                  "예종철",
                  "박성홍",
                  "김대식",
                  "정용",
                  "최윤재",
                  "이의진"
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
                  "drug delivery"
            ],
            "names": [
                  "정기준",
                  "김유천",
                  "남윤성",
                  "조성익",
                  "전상용",
                  "김학성"
            ]
      },
      "세포/면역/분자생물학": {
            "triggers": [
                  "세포",
                  "면역",
                  "분자생물학",
                  "질병 기전",
                  "cell biology",
                  "immunology",
                  "molecular biology"
            ],
            "names": [
                  "강석조",
                  "이규리",
                  "정현정",
                  "박민희",
                  "이소현",
                  "김유식",
                  "오병하"
            ]
      },
      "AI/머신러닝": {
            "triggers": [
                  "머신러닝",
                  "딥러닝",
                  "강화학습",
                  "생성형 ai",
                  "인공지능",
                  "machine learning",
                  "deep learning"
            ],
            "names": [
                  "서민준",
                  "김세훈",
                  "황성주",
                  "양은호",
                  "최윤재",
                  "신기정",
                  "주재걸",
                  "오성준",
                  "정 송"
            ]
      },
      "컴퓨터비전/영상인식": {
            "triggers": [
                  "컴퓨터 비전",
                  "영상인식",
                  "객체검출",
                  "멀티모달",
                  "computer vision",
                  "object detection"
            ],
            "names": [
                  "김승룡",
                  "심현정",
                  "김민혁",
                  "성민혁",
                  "오태현",
                  "노용만",
                  "김창익",
                  "유창동"
            ]
      },
      "자연어처리/LLM": {
            "triggers": [
                  "자연어처리",
                  "llm",
                  "언어모델",
                  "생성형 ai",
                  "nlp",
                  "large language model"
            ],
            "names": [
                  "서민준",
                  "김세훈",
                  "황성주",
                  "최윤재",
                  "주재걸",
                  "오혜연",
                  "양은호"
            ]
      },
      "DB/빅데이터": {
            "triggers": [
                  "데이터베이스",
                  "빅데이터",
                  "데이터마이닝",
                  "추천시스템",
                  "database",
                  "data mining",
                  "big data"
            ],
            "names": [
                  "황의종",
                  "신기정",
                  "김명호",
                  "박노성",
                  "주재걸",
                  "한동수",
                  "오혜연"
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
                  "cloud"
            ],
            "names": [
                  "원유집",
                  "정명수",
                  "권영진",
                  "허재혁",
                  "박종세",
                  "한동수",
                  "문수복"
            ]
      },
      "정보보안/암호": {
            "triggers": [
                  "정보보안",
                  "암호",
                  "프라이버시",
                  "시스템 보안",
                  "security",
                  "cryptography",
                  "privacy"
            ],
            "names": [
                  "김용대",
                  "신승원",
                  "강민석",
                  "강병훈",
                  "권영진",
                  "허재혁",
                  "한민기",
                  "윤인수",
                  "오성준"
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
                  "inverter"
            ],
            "names": [
                  "문건우",
                  "백재일",
                  "김현식",
                  "정완영"
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
                  "autonomous",
                  "navigation"
            ],
            "names": [
                  "명현",
                  "심현철",
                  "안희진",
                  "Hae-Won Park",
                  "Je Min Hwangbo",
                  "Kyoungchul Kong",
                  "박대형",
                  "임재환",
                  "장동의"
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
                  "human-computer",
                  "augmented reality",
                  "virtual reality"
            ],
            "names": [
                  "이안 오클리",
                  "이기혁",
                  "김주호",
                  "이의진",
                  "시어링 조셉",
                  "이성주",
                  "우운택"
            ]
      },
      "그래픽스/3D 비전": {
            "triggers": [
                  "그래픽스",
                  "3d 비전",
                  "렌더링",
                  "비주얼 컴퓨팅",
                  "computer graphics",
                  "3d vision",
                  "visual computing",
                  "rendering"
            ],
            "names": [
                  "김민혁",
                  "성민혁",
                  "오태현",
                  "김승룡",
                  "심현정",
                  "우운택"
            ]
      },
      "양자컴퓨팅/양자정보": {
            "triggers": [
                  "양자컴퓨팅",
                  "양자정보",
                  "양자알고리즘",
                  "양자시뮬레이션",
                  "quantum computing",
                  "quantum information"
            ],
            "names": [
                  "안재욱",
                  "조길영",
                  "이준구",
                  "신중훈",
                  "배준우",
                  "심흥선",
                  "한민기"
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
                  "satellite"
            ],
            "names": [
                  "김규태",
                  "신동혁",
                  "심형섭",
                  "이동호",
                  "진정근",
                  "방효충",
                  "이지윤",
                  "안재명",
                  "이정률"
            ]
      },
      "환경/기후/지속가능에너지": {
            "triggers": [
                  "환경공학",
                  "기후",
                  "탄소중립",
                  "지속가능 에너지",
                  "water treatment",
                  "carbon neutral",
                  "sustainability",
                  "environment"
            ],
            "names": [
                  "정동영",
                  "이재우",
                  "조은선",
                  "최민기",
                  "박선아",
                  "김범준",
                  "문홍철",
                  "이진우"
            ]
      }
};

    const weakTokens = new Set([
      "추천", "교수", "교수님", "연구실", "랩실", "대학원", "석사", "박사", "진학", "관심", "분야", "쪽",
      "싶어", "찾고", "누가", "어떤", "카이스트", "kaist", "dgist", "학생", "적합성", "연구", "기술"
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

    function escapeRegExp(value) {
      return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function isShortLatinTerm(value) {
      const term = normalize(value);
      return /^[a-z0-9+#./-]{1,3}$/.test(term) && /[a-z]/.test(term);
    }

    function normalizedIncludesTerm(normalizedText, normalizedTerm) {
      if (!normalizedText || !normalizedTerm) return false;
      if (isShortLatinTerm(normalizedTerm)) {
        const escaped = escapeRegExp(normalizedTerm);
        return new RegExp(`(^|[^0-9a-z가-힣])${escaped}($|[^0-9a-z가-힣])`, "i").test(normalizedText);
      }
      return normalizedText.includes(normalizedTerm);
    }

    function hasAny(text, needles) {
      const normalized = normalize(text);
      return needles.some((needle) => normalizedIncludesTerm(normalized, normalize(needle)));
    }

    function containsToken(text, token) {
      if (!token) return false;
      return normalizedIncludesTerm(normalize(text), normalize(token));
    }

    function getActiveDomains(fullQuery) {
      const normalizedQuery = normalize(fullQuery);
      const active = domainRules.filter((rule) => rule.triggers.some((trigger) => normalizedIncludesTerm(normalizedQuery, normalize(trigger))));
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
          if (energyNoise && !batteryCore) penalty -= 420;
        }
        if (domain.name === "컴퓨터그래픽스/비주얼컴퓨팅") {
          const graphicsCore = hasAny(primaryText, ["computer graphics", "visual computing", "rendering", "3d vision", "computational imaging", "컴퓨터 그래픽", "비주얼 컴퓨팅", "렌더링"]);
          const bioChemNoise = hasAny(primaryText, ["cell biology", "molecular biology", "organic chemistry", "drug", "protein", "세포", "분자생물학", "유기화학", "단백질"]);
          if (bioChemNoise && !graphicsCore) penalty -= 520;
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


    function expandInternalQueryForScoring(query) {
      const raw = String(query || "");
      const expansions = [
        [["유기화학"], "유기합성 organic chemistry organic synthesis organometallic catalysis C-H activation 의약화학"],
        [["무기화학"], "inorganic chemistry coordination chemistry metal complex organometallic"],
        [["분석화학"], "analytical chemistry spectroscopy mass spectrometry electrochemistry sensor"],
        [["물리화학"], "physical chemistry spectroscopy photodynamics computational chemistry ultrafast dynamics"],
        [["고분자"], "polymer macromolecule soft matter block copolymer polymerization"],
        [["반도체 공정"], "semiconductor process CMOS ALD etch lithography thin film transistor device fabrication"],
        [["패키징", "칩렛", "이종집적"], "advanced packaging chiplet 3D IC heterogeneous integration interconnect"],
        [["전고체", "고체전해질"], "solid-state battery solid electrolyte all-solid-state battery battery interface"],
        [["의료영상"], "medical imaging MRI image reconstruction ultrasound photoacoustic imaging"],
        [["오가노이드"], "organoid stem cell iPSC disease model tissue engineering"],
        [["유전자교정"], "gene editing CRISPR genome editing"],
        [["뇌과학", "뇌공학"], "neuroscience neural engineering BCI brain-machine interface neuroimaging"],
        [["양자컴퓨팅"], "quantum computing neutral atom Rydberg superconducting qubit quantum algorithm"],
        [["메타버스"], "XR AR VR digital twin avatar immersive audio spatial computing"],
        [["AX", "AI 전환"], "AI transformation domain AI physics-informed AI manufacturing AI applied AI"],
        [["자연어처리", "언어모델"], "NLP natural language processing LLM large language model RAG reasoning"],
        [["컴퓨터비전"], "computer vision visual AI 3D vision image recognition multimodal"],
        [["로봇"], "robotics robot learning manipulation humanoid legged robot SLAM"],
        [["항공우주"], "aerospace spacecraft UAV propulsion aerodynamics GNC satellite"]
      ];
      let expanded = raw;
      const nRaw = normalize(raw);
      expansions.forEach(([triggers, addition]) => {
        if (triggers.some((trigger) => nRaw.includes(normalize(trigger)))) expanded += " " + addition;
      });
      return expanded;
    }

    function internalRecommendationScore(professor, fullQuery, matched, reasons) {
      const records = professor._internalRecommendationRecords || [];
      if (!records.length) return { score: 0, directMatches: 0, negativeHits: 0 };
      const q = normalize(expandInternalQueryForScoring(fullQuery));
      let total = 0;
      let directMatches = 0;
      let negativeHits = 0;
      const internalTermMatchesQuery = (normalizedQuery, normalizedTerm) => {
        if (!normalizedTerm || normalizedTerm.length < 2) return false;
        const englishOnly = /^[a-z0-9+#./-]+$/.test(normalizedTerm);
        if (englishOnly) {
          const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp(`(^|\\s)${escaped}($|\\s)`, "i").test(normalizedQuery);
        }
        return normalizedQuery.includes(normalizedTerm);
      };
      const addMatch = (term, points, reasonText) => {
        const value = String(term || "").trim();
        const n = normalize(value);
        if (!n || n.length < 2) return;
        if (internalTermMatchesQuery(q, n)) {
          total += points;
          directMatches += 1;
          matched.push(value.length > 32 ? value.slice(0, 32) + "…" : value);
          if (reasonText) reasons.push(reasonText);
        }
      };
      records.forEach((record) => {
        const positives = []
          .concat(record.positive_queries || [], record.aliases_ko || [], record.aliases_en || [], record.subfields || []);
        const highDomains = [].concat(record.primary_domains || []);
        const weakTerms = [].concat(record.weak_queries || [], record.secondary_domains || []);
        const negatives = [].concat(record.negative_queries || []);

        positives.forEach((term) => addMatch(term, 70, "내부 DB의 세부 연구 키워드와 직접 연결됩니다"));
        highDomains.forEach((term) => addMatch(term, 34, "내부 DB의 주 연구분야와 직접 연결됩니다"));
        weakTerms.forEach((term) => {
          const n = normalize(term);
          if (n && internalTermMatchesQuery(q, n)) total += 5;
        });
        negatives.forEach((term) => {
          const n = normalize(term);
          if (n && n.length >= 3 && internalTermMatchesQuery(q, n)) {
            total -= directMatches > 0 ? 55 : 140;
            negativeHits += 1;
          }
        });
      });
      return { score: Math.max(-260, Math.min(total, 900)), directMatches, negativeHits };
    }


    // 세부 분야 우선 추천 엔진입니다.
    // 기존 화면 DB는 그대로 두고, 내부 추천용 DB의 positive/subfield/alias를 먼저 확인합니다.
    // 넓은 단어(chemistry, battery, energy, control 등)는 보조 점수로만 쓰고,
    // 유기화학, 전해질, 양극재처럼 세부 intent가 잡히면 직접 근거가 있는 교수님만 우선 통과시킵니다.
    const KAIST_STRICT_INTENT_RULES = [
      {
        id: "organic_chemistry",
        label: "유기화학/유기합성",
        strict: true,
        triggers: ["유기화학", "유기 합성", "유기합성", "분자합성", "organic chemistry", "organic synthesis", "synthetic organic", "medicinal chemistry", "의약화학"],
        strongTerms: ["유기화학", "유기합성", "분자합성", "비대칭 촉매", "입체선택성", "천연물 전합성", "의약화학", "organic chemistry", "organic synthesis", "synthetic organic chemistry", "asymmetric catalysis", "stereoselective synthesis", "total synthesis", "medicinal chemistry", "organocatalysis", "c-h activation", "transition-metal catalysis"],
        weakTerms: ["chemistry", "synthesis", "catalysis", "화학", "합성", "촉매", "molecular"],
        negativeTerms: ["electrochemistry", "electrocatalysis", "photocatalysis", "battery", "fuel cell", "quantum dot", "perovskite", "surface chemistry", "materials chemistry", "전기화학", "전기촉매", "광촉매", "배터리", "전지", "연료전지", "양자점", "페로브스카이트", "표면화학"]
      },
      {
        id: "battery_electrolyte",
        label: "전해질/전해액",
        strict: true,
        triggers: ["전해질", "전해액", "고체전해질", "고체 전해질", "electrolyte", "electrolytes", "solid electrolyte", "polymer electrolyte", "ion transport", "ionic conduction"],
        strongTerms: ["전해질", "전해액", "고체전해질", "고체 전해질", "황화물계 전해질", "산화물계 전해질", "고분자 전해질", "이온전도", "이온 수송", "electrolyte", "electrolytes", "solid electrolyte", "sulfide electrolyte", "oxide electrolyte", "polymer electrolyte", "ionic liquid", "ion transport", "ionic conduction", "solid-state ionics"],
        weakTerms: ["battery", "batteries", "배터리", "전지", "리튬", "electrochemical", "전기화학"],
        negativeTerms: ["cathode", "anode", "separator", "fuel cell", "hydrogen", "photovoltaic", "양극재", "음극재", "분리막", "연료전지", "수소", "태양전지"]
      },
      {
        id: "battery_cathode",
        label: "양극재",
        strict: true,
        triggers: ["양극재", "양극 소재", "양극활물질", "cathode", "cathode material", "positive electrode"],
        strongTerms: ["양극재", "양극 소재", "양극활물질", "양극", "cathode", "cathode material", "cathode materials", "positive electrode", "layered oxide", "lini", "ncm", "nca", "lithium-rich", "high-nickel"],
        weakTerms: ["battery", "batteries", "electrode", "배터리", "전지", "전극", "리튬"],
        negativeTerms: ["fuel cell", "hydrogen", "water electrolysis", "catalyst", "anode", "separator", "electrolyte", "연료전지", "수소", "수전해", "촉매", "음극재", "분리막", "전해질"]
      },
      {
        id: "battery_anode",
        label: "음극재",
        strict: true,
        triggers: ["음극재", "음극 소재", "리튬금속 음극", "실리콘 음극", "anode", "anode material", "negative electrode", "lithium metal anode", "silicon anode"],
        strongTerms: ["음극재", "음극 소재", "음극", "리튬금속 음극", "실리콘 음극", "anode", "anode material", "anode materials", "negative electrode", "lithium metal anode", "silicon anode", "lithium metal", "si anode"],
        weakTerms: ["battery", "batteries", "electrode", "배터리", "전지", "전극", "리튬"],
        negativeTerms: ["fuel cell", "hydrogen", "water electrolysis", "catalyst", "cathode", "separator", "electrolyte", "연료전지", "수소", "수전해", "촉매", "양극재", "분리막", "전해질"]
      },
      {
        id: "battery_separator",
        label: "배터리 분리막",
        strict: true,
        triggers: ["분리막", "배터리 분리막", "separator", "battery separator", "separators"],
        strongTerms: ["배터리 분리막", "전지 분리막", "battery separator", "separator", "separators", "ion-selective membrane", "polymer separator", "porous separator", "separator membrane"],
        weakTerms: ["membrane", "멤브레인", "polymer", "고분자", "battery", "배터리"],
        negativeTerms: ["water treatment", "desalination", "fuel cell membrane", "gas separation", "수처리", "담수화", "연료전지 막", "기체분리"]
      },
      {
        id: "battery_interface",
        label: "배터리 계면/SEI",
        strict: true,
        triggers: ["계면", "계면반응", "계면 안정화", "sei", "cei", "interphase", "interface", "electrode interface"],
        strongTerms: ["전극 계면", "전해질 계면", "배터리 계면", "계면반응", "계면 안정화", "solid electrolyte interphase", "sei", "cei", "interphase", "electrode interface", "electrolyte interface", "interface stability", "interfacial analysis"],
        weakTerms: ["interface", "surface", "계면", "표면", "battery", "배터리", "electrochemical"],
        negativeTerms: ["semiconductor interface", "bio interface", "surface chemistry only", "반도체 계면", "생체계면", "표면화학만"]
      },
      {
        id: "battery_solid_state",
        label: "전고체전지/고체전해질",
        strict: true,
        triggers: ["전고체전지", "전고체 전지", "전고체", "고체전해질", "고체 전해질", "solid-state battery", "solid state battery", "all-solid-state battery", "assb", "solid electrolyte"],
        strongTerms: ["전고체전지", "전고체 전지", "고체전해질", "고체 전해질", "황화물계 전해질", "산화물계 전해질", "고분자 고체전해질", "전고체 배터리", "solid-state battery", "solid state battery", "all-solid-state battery", "all solid state battery", "assb", "solid electrolyte", "sulfide electrolyte", "oxide electrolyte", "polymer solid electrolyte", "solid-state ionics", "lithium metal"],
        weakTerms: ["battery", "batteries", "배터리", "전지", "리튬", "electrochemical", "전기화학", "electrolyte", "전해질"],
        negativeTerms: ["fuel cell", "hydrogen", "photovoltaic", "solar cell", "water electrolysis", "cathode only", "anode only", "연료전지", "수소", "태양전지", "수전해", "양극재 단독", "음극재 단독"]
      },
      {
        id: "photovoltaics",
        label: "태양전지/광전변환",
        strict: true,
        triggers: ["태양전지", "페로브스카이트 태양전지", "solar cell", "photovoltaic", "photovoltaics", "perovskite solar", "광전변환"],
        strongTerms: ["태양전지", "페로브스카이트 태양전지", "유기 태양전지", "solar cell", "solar cells", "photovoltaic", "photovoltaics", "perovskite solar", "organic photovoltaic", "pv device", "광전변환", "photoabsorber"],
        weakTerms: ["energy", "renewable", "perovskite", "semiconductor", "에너지", "재생에너지", "페로브스카이트", "반도체"],
        negativeTerms: ["fuel cell", "battery", "water electrolysis", "hydrogen", "연료전지", "배터리", "수전해", "수소"]
      },
      {
        id: "hydrogen_fuelcell",
        label: "수소/연료전지/수전해",
        strict: true,
        triggers: ["수소", "연료전지", "수전해", "물분해", "hydrogen", "fuel cell", "water electrolysis", "water splitting"],
        strongTerms: ["수소", "연료전지", "수전해", "물분해", "수소발생반응", "산소발생반응", "hydrogen", "fuel cell", "fuel cells", "water electrolysis", "water splitting", "hydrogen evolution", "oxygen evolution", "electrocatalysis"],
        weakTerms: ["energy", "catalyst", "electrochemical", "에너지", "촉매", "전기화학"],
        negativeTerms: ["battery", "solar cell", "photovoltaic", "lithium", "배터리", "전지", "태양전지", "리튬"]
      },
      {
        id: "robotics_control",
        label: "로봇 제어",
        strict: true,
        triggers: ["로봇 제어", "로보틱스 제어", "robot control", "robotics control", "motion control", "humanoid", "legged robot", "quadruped", "manipulator", "mobile robot"],
        strongTerms: ["로봇 제어", "로보틱스", "robot control", "robotics control", "motion control", "humanoid", "legged robot", "quadruped", "mobile robot", "manipulator", "robotics", "wearable robot", "robot learning", "locomotion", "slam", "path planning", "model predictive control"],
        weakTerms: ["control", "optimization", "제어", "최적화", "reinforcement learning", "강화학습"],
        negativeTerms: ["process control", "emission control", "traffic control", "thermal control", "motor control only", "공정 제어", "배출 제어", "교통 제어", "열 제어"]
      },

      {
        id: "bio_sensor_bioelectronics",
        label: "바이오센서/생체전자",
        strict: false,
        triggers: ["바이오센서", "생체전자", "생체 전자", "웨어러블 센서", "임플란터블", "implantable", "bioelectronics", "biosensor", "biosensors", "wearable sensor", "wearable sensors", "electronic skin", "e-skin", "neural interface"],
        strongTerms: ["바이오센서", "생체전자", "생체 전자", "웨어러블 센서", "임플란터블", "이식형 소자", "생체신호", "bioelectronics", "biosensor", "biosensors", "wearable sensor", "wearable sensors", "implantable device", "implantable electronics", "electronic skin", "e-skin", "neural interface", "bio-integrated electronics", "flexible bioelectronics", "healthcare sensor"],
        weakTerms: ["sensor", "sensors", "wearable", "flexible electronics", "soft electronics", "healthcare", "biomedical", "microfluidic", "nanobiosensor", "센서", "웨어러블", "플렉서블 전자", "소프트 전자", "헬스케어", "의공학", "마이크로유체", "나노센서"],
        negativeTerms: ["gas sensor only", "chemical sensor only", "environmental sensor only", "image sensor only", "display only", "rf sensor only", "가스센서만", "환경센서만", "이미지센서만", "디스플레이만"]
      },
      {
        id: "medical_imaging_ai",
        label: "의료영상 AI",
        strict: true,
        triggers: ["의료영상", "의료 영상", "medical imaging", "mri", "ct", "초음파", "ultrasound", "영상 재구성", "image reconstruction", "medical ai"],
        strongTerms: ["의료영상", "의료 영상", "자기공명영상", "초음파", "computed tomography", "ct", "mri", "fmri", "ultrasound", "medical imaging", "biomedical imaging", "image reconstruction", "영상 재구성", "medical ai", "healthcare ai", "deep learning for medical imaging", "inverse problem"],
        weakTerms: ["딥러닝", "deep learning", "computer vision", "영상처리", "healthcare", "헬스케어", "이미징"],
        negativeTerms: ["cell imaging", "bio-optics only", "display imaging", "graphics rendering", "세포 이미징", "바이오광학만", "디스플레이", "렌더링"]
      },
      {
        id: "semiconductor_packaging",
        label: "반도체 패키징/3D IC",
        strict: true,
        triggers: ["반도체 패키징", "패키징", "칩렛", "3d ic", "이종집적", "인터커넥트", "advanced packaging", "chiplet", "heterogeneous integration", "interconnect", "tsv"],
        strongTerms: ["반도체 패키징", "첨단 패키징", "칩렛", "이종집적", "인터커넥트", "3d ic", "3차원 집적", "advanced packaging", "chiplet", "heterogeneous integration", "interconnect", "interposer", "through silicon via", "tsv", "hybrid bonding"],
        weakTerms: ["semiconductor", "반도체", "integration", "집적", "reliability", "신뢰성"],
        negativeTerms: ["general mechanics", "adhesion only", "biopackaging", "일반 기계", "접착만", "바이오 패키징"]
      },
      {
        id: "semiconductor_process_device",
        label: "반도체 소자/공정",
        strict: false,
        triggers: ["반도체 소자", "반도체 공정", "트랜지스터", "박막 증착", "식각", "리소그래피", "semiconductor device", "semiconductor process", "fabrication", "transistor", "ald", "etch"],
        strongTerms: ["반도체 소자", "반도체 공정", "소자 제작", "트랜지스터", "산화막", "박막", "식각", "증착", "리소그래피", "semiconductor device", "semiconductor process", "semiconductor fabrication", "transistor", "mosfet", "tft", "thin film", "oxide", "ald", "etch", "lithography", "nanofabrication"],
        weakTerms: ["semiconductor", "device", "process", "materials", "반도체", "소자", "공정", "재료"],
        negativeTerms: ["chemical process", "bioprocess", "reaction process", "화학공정", "바이오공정", "반응공정"]
      },

      {
        id: "ambiguous_process",
        label: "공정/제조/프로세스",
        strict: false,
        triggers: ["공정", "제조", "프로세스", "process", "fabrication", "manufacturing", "processing"],
        strongTerms: ["반도체 공정", "소자 제작", "박막 공정", "증착", "식각", "리소그래피", "나노공정", "화학공정", "공정시스템", "반응공학", "semiconductor process", "semiconductor fabrication", "device fabrication", "thin film processing", "nanofabrication", "deposition", "etch", "lithography", "chemical process", "process engineering", "reaction engineering", "manufacturing process"],
        weakTerms: ["공정", "제조", "process", "fabrication", "processing", "manufacturing", "synthesis"],
        negativeTerms: ["biological process only", "stochastic process only", "business process only", "process mining only", "생물학적 과정만", "확률과정만", "비즈니스 프로세스만"]
      },
      {
        id: "quantum_specific",
        label: "양자 세부 분야",
        strict: false,
        triggers: ["양자", "양자컴퓨팅", "양자정보", "양자소자", "양자광학", "quantum", "quantum computing", "quantum information", "qubit"],
        strongTerms: ["양자컴퓨팅", "양자정보", "양자알고리즘", "양자시뮬레이션", "양자소자", "큐비트", "양자광학", "quantum computing", "quantum information", "quantum algorithms", "quantum simulation", "qubit", "quantum device", "quantum optics", "rydberg", "superconducting qubit"],
        weakTerms: ["quantum", "양자", "physics", "물리"],
        negativeTerms: ["quantum dot display", "quantum dot led", "양자점 디스플레이", "qled"]
      }
    ];

    function kaistNormTerms(terms) {
      return (Array.isArray(terms) ? terms : [terms]).map((term) => normalize(term)).filter((term) => term && term.length >= 2);
    }

    function kaistTermMatch(normalizedText, normalizedTerm) {
      if (!normalizedText || !normalizedTerm) return false;
      const englishOnly = /^[a-z0-9+#./-]+$/.test(normalizedTerm);
      if (englishOnly) {
        const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|\\s)${escaped}($|\\s)`, "i").test(normalizedText);
      }
      return normalizedText.includes(normalizedTerm);
    }

    function kaistCollectHits(normalizedText, terms, maxItems = 8) {
      const hits = [];
      const seen = new Set();
      (Array.isArray(terms) ? terms : []).forEach((term) => {
        const display = String(term || "").trim();
        const normalizedTerm = normalize(display);
        if (!display || seen.has(normalizedTerm)) return;
        if (kaistTermMatch(normalizedText, normalizedTerm)) {
          seen.add(normalizedTerm);
          hits.push(display);
        }
      });
      return hits.slice(0, maxItems);
    }

    function getKaistActiveStrictIntents(query) {
      const q = normalize(query);
      if (!q) return [];
      let active = KAIST_STRICT_INTENT_RULES.filter((rule) => kaistNormTerms(rule.triggers).some((trigger) => kaistTermMatch(q, trigger)));
      if (active.some((rule) => rule.id === "semiconductor_packaging")) {
        active = active.filter((rule) => rule.id !== "semiconductor_process_device" || hasAny(q, ["소자", "공정", "트랜지스터", "박막", "산화막", "식각", "증착"]));
      }
      if (active.some((rule) => rule.id === "battery_electrolyte" || rule.id === "battery_cathode" || rule.id === "battery_anode" || rule.id === "battery_separator" || rule.id === "battery_interface" || rule.id === "battery_solid_state")) {
        active = active.filter((rule) => rule.id !== "hydrogen_fuelcell" && rule.id !== "photovoltaics");
      }
      if (active.some((rule) => rule.id === "robotics_control")) {
        active = active.filter((rule) => rule.id !== "semiconductor_process_device");
      }
      return active;
    }

    function kaistInternalPrimaryText(professor) {
      return normalize([
        ...(professor.fields || []),
        professor.summary || "",
        ...(professor.summaries || []),
        ...(professor.labNames || []),
        ...((professor._internalPositiveQueries || [])),
        ...((professor._internalRecommendationRecords || []).flatMap((record) => [].concat(record.primary_domains || [], record.subfields || [], record.methods || [], record.materials_or_targets || [], record.applications || [], record.aliases_ko || [], record.aliases_en || [], record.positive_queries || [])))
      ].join(" "));
    }

    function kaistInternalWeakText(professor) {
      return normalize([
        ...(professor.unitLabels || []),
        ...(professor.intentTags || []),
        ...((professor._internalWeakQueries || [])),
        ...((professor._internalRecommendationRecords || []).flatMap((record) => [].concat(record.secondary_domains || [], record.weak_queries || [])))
      ].join(" "));
    }

    function kaistInternalNegativeText(professor) {
      return normalize([
        ...((professor._internalNegativeQueries || [])),
        ...((professor._internalRecommendationRecords || []).flatMap((record) => record.negative_queries || []))
      ].join(" "));
    }

    function kaistStrictIntentScore(professor, fullQuery, matched, reasons) {
      const active = getKaistActiveStrictIntents(fullQuery);
      if (!active.length) return { score: 0, directMatches: 0, weakMatches: 0, negativeHits: 0, strictIntentCount: 0 };
      const primaryText = kaistInternalPrimaryText(professor);
      const weakText = kaistInternalWeakText(professor);
      const negativeText = kaistInternalNegativeText(professor) + " " + primaryText;
      let score = 0;
      let directMatches = 0;
      let weakMatches = 0;
      let negativeHits = 0;
      active.forEach((rule) => {
        const strongHits = kaistCollectHits(primaryText, rule.strongTerms, 8);
        const weakHits = strongHits.length ? [] : kaistCollectHits(primaryText + " " + weakText, rule.weakTerms, 6);
        const badHits = kaistCollectHits(negativeText, rule.negativeTerms, 6);
        if (strongHits.length) {
          const strongScore = (rule.strict ? 760 : 470) + Math.min(260, strongHits.length * 70);
          score += strongScore;
          directMatches += strongHits.length;
          strongHits.slice(0, 5).forEach((hit) => matched.push(hit.length > 32 ? hit.slice(0, 32) + "…" : hit));
          reasons.push(`${rule.label} 세부 키워드와 직접 연결됩니다`);
          if (badHits.length) score -= Math.min(120, badHits.length * 28);
        } else if (weakHits.length) {
          score += rule.strict ? Math.min(120, weakHits.length * 22) : Math.min(200, weakHits.length * 40);
          weakMatches += weakHits.length;
          if (rule.strict) score -= 120;
        } else if (rule.strict) {
          score -= 230;
        }
        if (!strongHits.length && badHits.length) {
          score -= rule.strict ? 260 : 120;
          negativeHits += badHits.length;
        }
      });
      return {
        score: Math.max(-520, Math.min(score, 1500)),
        directMatches,
        weakMatches,
        negativeHits,
        strictIntentCount: active.filter((rule) => rule.strict).length,
        activeIntentLabels: active.map((rule) => rule.label),
        activeIntentIds: active.map((rule) => rule.id)
      };
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
        const packagingEvidenceText = normalize([
          ...(professor.fields || []), ...(professor.keywords || []), professor.searchText || "",
          ...((professor._internalPositiveQueries || [])), ...((professor._internalWeakQueries || []))
        ].join(" "));
        const truePackagingEvidence = hasAny(packagingEvidenceText, [
          "advanced packaging", "chiplet", "3d ic", "heterogeneous integration", "interconnect", "interposer", "through silicon via", "tsv",
          "반도체 패키징", "칩렛", "이종집적", "인터커넥트", "패키징 역학"
        ]);
        if (!truePackagingEvidence) {
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
      const internalEvidence = internalRecommendationScore(professor, fullQuery, matched, reasons);
      score += internalEvidence.score;
      const strictIntentEvidence = kaistStrictIntentScore(professor, fullQuery, matched, reasons);
      score += strictIntentEvidence.score;

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
      score += structuredNoisePenalty(professor, fullQuery, activeDomainsForStructured);

      const representativeBoost = Math.max(representativeSignalScore(professor, fullQuery), categoryWhitelistBoost(professor, fullQuery));
      if (representativeBoost > 0) {
        score += representativeBoost;
        // 대표 후보 보정은 정렬에만 사용하고, 매칭 근거에는 사용자 질의와 직접 관련된 키워드만 표시한다.
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
        internalDirectMatchCount: internalEvidence.directMatches || 0,
        internalNegativeHitCount: internalEvidence.negativeHits || 0,
        strictDirectMatchCount: strictIntentEvidence.directMatches || 0,
        strictWeakMatchCount: strictIntentEvidence.weakMatches || 0,
        strictNegativeHitCount: strictIntentEvidence.negativeHits || 0,
        strictIntentCount: strictIntentEvidence.strictIntentCount || 0,
        preciseIntentScore: strictIntentEvidence.score || 0,
        activeIntentLabels: strictIntentEvidence.activeIntentLabels || [],
        activeIntentIds: strictIntentEvidence.activeIntentIds || [],
        nameDirect: directNameScore > 0,
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
        return (spec.triggers || []).some((trigger) => normalizedIncludesTerm(q, normalize(trigger)));
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
      ["areaSelect", "goalSelect", "styleSelect"].forEach((id) => {
        const select = document.getElementById(id);
        if (select) select.value = "";
      });
      document.querySelectorAll("#tagFilter .chip").forEach((chip) => chip.classList.remove("active"));
    }



    function getKaistTierIntentRules(fullQuery) {
      const strictRules = getKaistActiveStrictIntents(fullQuery);
      if (strictRules.length) return strictRules;
      const categoryRules = activeRepresentativeCategories(fullQuery).map(([category, spec]) => ({
        id: `representative_${normalize(category).replace(/\s+/g, "_")}`,
        label: category,
        strict: false,
        triggers: spec.triggers || [],
        strongTerms: [].concat([category], spec.triggers || []),
        weakTerms: [],
        negativeTerms: [],
        representativeCategory: category,
        representativeNames: spec.names || []
      }));
      return categoryRules;
    }

    function attachKaistTieredMetadata(directResults, adjacentResults, rules, mode) {
      const direct = directResults || [];
      const labels = Array.from(new Set((rules || []).map((rule) => rule.label).filter(Boolean)));
      direct._adjacentResults = adjacentResults || [];
      direct._tieredMeta = {
        mode: mode || "precise",
        intentId: (rules || []).map((rule) => rule.id).filter(Boolean).join(","),
        intentLabel: labels.join(" / "),
        directCount: direct.length,
        adjacentCount: (adjacentResults || []).length
      };
      return direct;
    }

    function kaistProfessorStableKey(item) {
      const p = item && item.professor ? item.professor : {};
      return [p.id || "", p.professor || "", (p.unitLabels || []).join("|")].join("::");
    }

    function kaistRepresentativeDirect(item, query, rules) {
      const p = item && item.professor ? item.professor : {};
      const categories = (rules || []).filter((rule) => rule.representativeCategory);
      if (!categories.length) return false;
      const signals = p.representativeSignals || [];
      const name = normalize([p.professor, p.professorEn].join(" "));
      return categories.some((rule) => {
        if (signals.some((signal) => signal.category === rule.representativeCategory)) return true;
        return (rule.representativeNames || []).some((candidate) => {
          const c = normalize(candidate);
          return c && name.includes(c);
        });
      });
    }

    function kaistRuleStrongHit(item, rules) {
      const p = item && item.professor ? item.professor : {};
      const text = kaistInternalPrimaryText(p);
      return (rules || []).some((rule) => kaistCollectHits(text, rule.strongTerms || [], 2).length > 0);
    }

    function kaistBatteryGeneralDirect(item, query, rules) {
      const q = normalize(query);
      const isBatteryGeneral = (rules || []).some((rule) => rule.representativeCategory === "배터리/전기화학") ||
        (q === normalize("배터리") || q === normalize("battery") || q.includes(normalize("배터리 교수")) || q.includes(normalize("battery professor")));
      if (!isBatteryGeneral) return false;
      const p = item && item.professor ? item.professor : {};
      const primaryText = kaistInternalPrimaryText(p);
      const weakText = kaistInternalWeakText(p);
      const allText = [primaryText, weakText, normalize((p.keywords || []).join(" ")), normalize(p.searchText || "")].join(" ");
      const directTerms = [
        "배터리", "이차전지", "리튬이온전지", "리튬 전지", "리튬금속전지", "리튬금속", "전고체전지", "전고체", "고체전해질",
        "양극재", "양극", "음극재", "음극", "전해질", "전해액", "전극", "배터리 계면", "에너지 저장", "전기화학 에너지 저장",
        "battery", "batteries", "lithium-ion battery", "lithium ion battery", "lithium metal", "solid-state battery", "solid state battery",
        "solid electrolyte", "cathode", "anode", "electrolyte", "electrode", "energy storage", "battery materials", "battery system"
      ];
      const adjacentOnlyTerms = ["fuel cell", "hydrogen", "water electrolysis", "photovoltaic", "solar cell", "연료전지", "수소", "수전해", "태양전지"];
      const hasDirect = kaistCollectHits(allText, directTerms, 4).length > 0;
      const adjacentOnly = kaistCollectHits(allText, adjacentOnlyTerms, 2).length > 0 && !hasDirect;
      return hasDirect && !adjacentOnly;
    }

    function kaistIsSpecificSearchQuery(query) {
      const q = normalize(query);
      const tokens = q.split(" ").filter((token) => token && !weakTokens.has(token) && !mediumTokens.has(token));
      return tokens.length >= 1;
    }

    function kaistBuildTieredResults(scored, rules, query, limit, mode) {
      const safeMode = mode || "precise";
      const directPool = scored
        .map((item) => {
          const nameDirect = Boolean(item.nameDirect || (item.reasons || []).some((reason) => String(reason).includes("성함")));
          const repDirect = kaistRepresentativeDirect(item, query, rules);
          const batteryGeneralDirect = kaistBatteryGeneralDirect(item, query, rules);
          const strongByRule = kaistRuleStrongHit(item, rules) || batteryGeneralDirect;
          const strictDirect = Number(item.strictDirectMatchCount || 0) > 0 || strongByRule;
          const internalDirect = Number(item.internalDirectMatchCount || 0) > 0;
          const exploreHighScore = safeMode === "explore" && Number(item.score || 0) >= 540 && (repDirect || internalDirect || Number(item.strictWeakMatchCount || 0) > 0);
          const direct = nameDirect || strictDirect || repDirect || exploreHighScore;
          item.relevanceTier = nameDirect || strictDirect || repDirect ? "A" : (direct ? "B" : "C");
          if (direct) {
            item.matched = Array.from(new Set([...(item.matched || [])])).slice(0, 12);
            item.reasons = Array.from(new Set([`${(rules[0] && rules[0].label) || "입력 분야"}와 직접 연결됩니다`, ...(item.reasons || [])])).slice(0, 4);
          }
          return item;
        })
        .filter((item) => item.relevanceTier === "A" || item.relevanceTier === "B")
        .sort((a, b) => {
          const tierRank = { A: 2, B: 1, C: 0 };
          return (tierRank[b.relevanceTier || ""] || 0) - (tierRank[a.relevanceTier || ""] || 0)
            || Number(b.preciseIntentScore || 0) - Number(a.preciseIntentScore || 0)
            || Number(b.strictDirectMatchCount || 0) - Number(a.strictDirectMatchCount || 0)
            || Number(b.internalDirectMatchCount || 0) - Number(a.internalDirectMatchCount || 0)
            || Number(b.score || 0) - Number(a.score || 0)
            || a.professor.professor.localeCompare(b.professor.professor, "ko");
        });

      let directResults = [];
      if (directPool.length) {
        const topScore = Number(directPool[0].score || 0);
        const floorRatio = safeMode === "explore" ? 0.28 : 0.34;
        const strictFloor = Math.max(safeMode === "explore" ? 220 : 220, Math.round(topScore * floorRatio));
        directResults = directPool
          .filter((item) => Number(item.score || 0) >= strictFloor || item.nameDirect)
          .slice(0, Math.min(limit, 40));
      }

      const directKeys = new Set(directResults.map(kaistProfessorStableKey));
      const adjacentResults = scored
        .filter((item) => !directKeys.has(kaistProfessorStableKey(item)))
        .filter((item) => Number(item.score || 0) >= (safeMode === "explore" ? 120 : 180))
        .filter((item) => {
          if (Number(item.strictWeakMatchCount || 0) > 0) return true;
          if (Number(item.internalDirectMatchCount || 0) > 0) return true;
          if (Number(item.preciseIntentScore || 0) > 0) return true;
          if (kaistRepresentativeDirect(item, query, rules)) return true;
          return safeMode === "explore" && Number(item.score || 0) >= 360;
        })
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || a.professor.professor.localeCompare(b.professor.professor, "ko"))
        .slice(0, 24)
        .map((item) => {
          item.relevanceTier = "C";
          item.reasons = Array.from(new Set([`${(rules[0] && rules[0].label) || "입력 분야"} 인접 분야와 연결됩니다`, ...(item.reasons || [])])).slice(0, 4);
          const priorMatched = item.matched || [];
          const weakLabels = Array.from(new Set([...(item.activeIntentLabels || []), ...priorMatched])).slice(0, 12);
          item.matched = weakLabels;
          return item;
        });

      if (!directResults.length && (rules || []).some((rule) => rule.strict) && kaistIsSpecificSearchQuery(query)) {
        return attachKaistTieredMetadata([], adjacentResults, rules, safeMode);
      }
      return attachKaistTieredMetadata(directResults, adjacentResults, rules, safeMode);
    }

    function recommend(query, limit = 8, mode = "precise") {
      if (mode === "banner_explore") mode = "explore";
      const filters = getCurrentFilters();
      const fullCombinedQuery = combinedQuery(query);
      const activeDomains = getActiveDomains(fullCombinedQuery);
      const tierIntentRules = getKaistTierIntentRules(fullCombinedQuery);
      const activeStrictIntents = getKaistActiveStrictIntents(fullCombinedQuery);
      const hasStrictIntent = activeStrictIntents.some((intent) => intent.strict);
      const hasTierIntent = tierIntentRules.length > 0;
      let minScore = activeDomains.length ? 420 : 80;
      if (hasStrictIntent) minScore = Math.min(minScore, 80);
      if (hasTierIntent && mode === "explore") minScore = Math.min(minScore, 80);
      if (activeDomains.some((domain) => domain.name === "통신/RF/무선" || domain.name === "통신/RF")) minScore = Math.min(minScore, 300);
      if (activeDomains.some((domain) => domain.name === "배터리/에너지")) minScore = Math.min(minScore, 300);
      const base = shouldUseContext(query) && state.lastResults.length
        ? state.lastResults.map((item) => item.professor)
        : professors;
      let scored = base
        .map((professor) => scoreProfessor(professor, query, filters))
        .filter((item) => item.score >= minScore);

      if (!hasTierIntent) {
        scored = scored.filter((item, _, all) => {
          const directInternalCount = all.filter((candidate) => (candidate.internalDirectMatchCount || 0) > 0).length;
          if (directInternalCount === 0) return true;
          if ((item.internalDirectMatchCount || 0) > 0) return true;
          return item.score >= 720;
        });
      }

      scored = scored
        .sort((a, b) => {
          if (hasStrictIntent) {
            const strictDelta = (b.strictDirectMatchCount || 0) - (a.strictDirectMatchCount || 0);
            if (strictDelta) return strictDelta;
            const weakDelta = (b.strictWeakMatchCount || 0) - (a.strictWeakMatchCount || 0);
            if (weakDelta && Math.max(b.strictWeakMatchCount || 0, a.strictWeakMatchCount || 0) > 0) return weakDelta;
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
          const homepagePriority = resultSortPriority(b) - resultSortPriority(a);
          if (homepagePriority) return homepagePriority;
          const representativeRankA = representativeSortRank(a.professor, query);
          const representativeRankB = representativeSortRank(b.professor, query);
          if (representativeRankA !== representativeRankB && Math.min(representativeRankA, representativeRankB) < 999) {
            return representativeRankA - representativeRankB;
          }
          return b.score - a.score || a.professor.professor.localeCompare(b.professor.professor, "ko");
        })

      if (hasTierIntent) {
        return kaistBuildTieredResults(scored, tierIntentRules, query, limit, mode);
      }
      return scored.slice(0, limit);
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
      const matchEvidence = (item.matched || []).slice(0, 3).filter(Boolean).join(", ");
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
      if (!meta.intentLabel) {
        countNote = `적합도 상위 ${Math.min(visible.length, directCount)}명을 표시했습니다.`;
      } else if (remaining > 0) {
        countNote = `직접 관련 후보가 ${directCount}명 있습니다. 현재 ${visible.length}명을 표시했습니다.`;
      } else if (directCount <= 3) {
        countNote = `직접 관련도가 높은 교수님은 ${directCount}명입니다. 아래 결과는 검색어와 직접 연결되는 교수님만 우선 표시한 것입니다.`;
      }
      const showAdjacentOption = Boolean(meta.intentLabel) && adjacentResults.length > 0 && directCount <= 3;
      return `
        <h3>추천 결과</h3>
        <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 우선 확인할 만한 교수님입니다.</p>
        <p class="result-tags">주요 적합 분야: ${tagSummary.map(escapeHtml).join(", ") || meta.intentLabel || "입력 키워드 기반"}</p>
        <div class="result-count-note">${escapeHtml(countNote)}${adjacentResults.length && meta.intentLabel ? ` 인접 분야 후보 ${adjacentResults.length}명은 기본 결과와 섞지 않았습니다.` : ""}</div>
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
          <div class="card-list top-results">${adjacentResults.map((item, index) => renderLabCard(item, index, false)).join("")}</div>
        </section>
      `;
    }

    function refreshAnswerResults(nextVisibleCount) {
      if (!state.lastResults.length || !state.lastQuery) return;
      state.visibleResultCount = Math.max(INITIAL_RESULT_COUNT, Math.min(nextVisibleCount, state.lastResults.length));
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
      const results = recommend(query, RECOMMEND_RESULT_LIMIT, "precise");
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
      const button = event.target.closest("#loadMoreResults");
      if (button) {
        const nextVisibleCount = Number(button.dataset.nextCount || 0);
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
          return `<button class="chip example-chip${hiddenClass}" type="button" data-query="${escapeHtml(item.query)}" data-algorithm-query="${escapeHtml(item.algorithmQuery || item.label)}" data-intent="${escapeHtml(item.intent || "")}" data-query-mode="${escapeHtml(item.mode || "banner_explore")}">${escapeHtml(item.label)}</button>`;
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
        state.queryModeOverride = button.dataset.queryMode || "explore";
        state.showAdjacentResults = false;
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
        state.showAdjacentResults = false;
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
        state.queryModeOverride = "";
        state.showAdjacentResults = false;
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
      const KAIST_DIVERSE_PRECISE_PROFILES = [
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
                  "양극활물질"
            ],
            "contextTerms": [
                  "battery",
                  "lithium",
                  "electrode",
                  "배터리",
                  "전극"
            ],
            "priorityNames": [
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
                  "유승협",
                  "최경철",
                  "정성준"
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
                  "노준석",
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
                  "optical interconnect"
            ],
            "contextTerms": [
                  "photonics",
                  "optical",
                  "semiconductor",
                  "광학"
            ],
            "priorityNames": [
                  "함자 쿠르트",
                  "노준석"
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
                  "노준석",
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
                  "박용근",
                  "노준석"
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
                  "그래프 신경망"
            ],
            "contextTerms": [
                  "machine learning",
                  "deep learning",
                  "그래프",
                  "ai"
            ],
            "priorityNames": [
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
                  "uncertainty quantification"
            ],
            "contextTerms": [
                  "machine learning",
                  "optimization",
                  "statistics",
                  "ai"
            ],
            "priorityNames": [
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
                  "동작인식"
            ],
            "contextTerms": [
                  "computer vision",
                  "image processing",
                  "deep learning"
            ],
            "priorityNames": [
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
                  "neural stimulation"
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
                  "human-centered"
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
                  "atomic physics"
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
                  "wafer bonding"
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
                  "functional polymer"
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
                  "solid polymer electrolyte"
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
                  "information retrieval"
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
                  "language model",
                  "nlp",
                  "large language model"
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
                  "data system"
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
                  "sequence data"
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
                  "mobile computing"
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
                  "secure hardware"
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
                  "smart contract"
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
                  "전력전송"
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
                  "3d point"
            ],
            "contextTerms": [
                  "3d vision",
                  "computer vision",
                  "geometry",
                  "graphics"
            ],
            "priorityNames": [
                  "윤국진",
                  "박진아"
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
                  "윤국진",
                  "박진아"
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
                  "computer graphics",
                  "visual computing",
                  "3d vision",
                  "virtual reality",
                  "vr"
            ],
            "contextTerms": [
                  "computer graphics",
                  "hci",
                  "visual computing",
                  "vr"
            ],
            "priorityNames": [
                  "박진아",
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
                  "윤국진"
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
                  "spacecraft structure"
            ],
            "contextTerms": [
                  "aerospace",
                  "satellite",
                  "mechanics",
                  "structures"
            ],
            "priorityNames": [
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
                  "권태혁",
                  "배중면",
                  "김희탁"
            ]
      }
];

      function kaistDiverseNorm(value) {
        return normalize(String(value || ""));
      }
      function kaistDiverseProfessorText(professor) {
        if (!professor) return "";
        if (professor._kaistDiverseTextCache) return professor._kaistDiverseTextCache;
        const chunks = [];
        function collect(value) {
          if (!value) return;
          if (typeof value === "string" || typeof value === "number") chunks.push(String(value));
          else if (Array.isArray(value)) value.forEach(collect);
          else if (typeof value === "object") Object.values(value).forEach(collect);
        }
        ["professor","professorEn","title","unitLabels","labNames","fields","summary","summaries","intentTags","keywords","searchText","representativeSignals","structuredProfile","_internalPositiveQueries","_internalWeakQueries"].forEach((key) => collect(professor[key]));
        professor._kaistDiverseTextCache = kaistDiverseNorm(chunks.join(" "));
        return professor._kaistDiverseTextCache;
      }
      function kaistDiverseTermHit(text, rawTerm) {
        const term = kaistDiverseNorm(rawTerm);
        if (!term || term.length < 2) return false;
        if (/^[a-z0-9+#./-]{2,3}$/.test(term)) {
          return new RegExp("(^|[^a-z0-9])" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])").test(text);
        }
        return text.includes(term);
      }
      function kaistDiverseHits(text, terms, limit) {
        const out = [];
        const seen = new Set();
        (terms || []).forEach((term) => {
          if (out.length >= (limit || 8)) return;
          const n = kaistDiverseNorm(term);
          if (!n || seen.has(n)) return;
          if (kaistDiverseTermHit(text, term)) {
            out.push(term);
            seen.add(n);
          }
        });
        return out.slice(0, limit || 8);
      }
      function kaistDiverseProfileFor(query, mode) {
        const safeMode = mode || "precise";
        if (safeMode === "banner_explore" || safeMode === "explore") return null;
        const q = kaistDiverseNorm(query || "");
        if (!q) return null;
        return KAIST_DIVERSE_PRECISE_PROFILES.find((profile) => (profile.triggers || []).some((trigger) => kaistDiverseTermHit(q, trigger)));
      }
      function kaistDiverseNameRank(professor, names) {
        const n = kaistDiverseNorm([professor && professor.professor, professor && professor.professorEn].join(" "));
        const idx = (names || []).findIndex((name) => n.includes(kaistDiverseNorm(name)));
        return idx < 0 ? 9999 : idx;
      }
      const kaistDiversePreviousRecommend = recommend;
      recommend = function(query, limit = 8, mode = "precise") {
        const profile = kaistDiverseProfileFor(query, mode);
        if (!profile) return kaistDiversePreviousRecommend(query, limit, mode);
        const maxDirect = Math.max(limit || RECOMMEND_RESULT_LIMIT || 120, 80);
        const direct = [];
        const adjacent = [];
        professors.forEach((professor) => {
          const text = kaistDiverseProfessorText(professor);
          const exactHits = kaistDiverseHits(text, profile.terms || [], 8);
          const contextHits = kaistDiverseHits(text, profile.contextTerms || [], 6);
          if (exactHits.length) {
            const rank = kaistDiverseNameRank(professor, profile.priorityNames || []);
            const priorityBoost = rank < 9999 ? Math.max(0, 240 - rank * 24) : 0;
            const item = { professor, score: 0, matched: [], reasons: [] };
            item.score = Math.round(1450 + exactHits.length * 520 + Math.min(240, contextHits.length * 40) + priorityBoost + Math.min(Number((professor || {}).qualityScore || 0) / 15, 8));
            item.matched = Array.from(new Set([...(exactHits || []), ...(contextHits || [])])).slice(0, 8);
            item.relevanceTier = item.score >= 2100 ? "A" : "B";
            item._kaistTier = "direct";
            item._kaistPrecisionIntent = profile.label;
            item._kaistPrecisionEvidence = exactHits.slice(0, 6);
            item.reasons = [`${profile.label} 직접 검색어와 연결됩니다`];
            direct.push(item);
          } else if (contextHits.length) {
            const item = { professor, score: 0, matched: [], reasons: [] };
            item.score = Math.round(260 + Math.min(360, contextHits.length * 60) + Math.min(Number((professor || {}).qualityScore || 0) / 40, 5));
            item.matched = contextHits.slice(0, 6);
            item.relevanceTier = "C";
            item._kaistTier = "adjacent";
            item._kaistPrecisionIntent = profile.label;
            item._kaistAdjacentEvidence = contextHits.slice(0, 5);
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
    })();


    init();
