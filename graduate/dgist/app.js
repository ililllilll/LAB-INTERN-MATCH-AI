(function () {
  const data = window.DGIST_CAREER_DATA;
  const fieldProfiles = data.fieldProfiles || [];
  const excludedProfessorNames = new Set();
  const storageKey = "dgist-career-chatbot-state-v1";
  const noteKey = "dgist-career-plan-note-v1";

  const tracks = [
    "물리학트랙",
    "화학트랙",
    "생명과학트랙",
    "뇌과학트랙",
    "기계공학트랙",
    "재료공학트랙",
    "전자공학트랙",
    "컴퓨터공학트랙",
    "화학공학트랙",
  ];

  const examples = [
    { label: "반도체 소자/공정", query: "반도체 소자, 반도체 공정 연구 관련 교수님을 추천해 주세요" },
    { label: "메모리/스핀트로닉스", query: "메모리, 스핀트로닉스 연구 관련 교수님을 추천해 주세요" },
    { label: "AI/머신러닝", query: "AI, 머신러닝 연구 관련 교수님을 추천해 주세요" },
    { label: "컴퓨터비전", query: "컴퓨터비전 연구 관련 교수님을 추천해 주세요" },
    { label: "로봇 제어/자율주행", query: "로봇 제어, 자율주행 연구 관련 교수님을 추천해 주세요" },
    { label: "배터리", query: "배터리 연구 관련 교수님을 추천해 주세요" },
    { label: "바이오센서/의료기기", query: "바이오센서, 의료기기 연구 관련 교수님을 추천해 주세요" },
    { label: "뇌과학/신경회로", query: "뇌과학, 신경회로 연구 관련 교수님을 추천해 주세요" },
    { label: "광학/디스플레이", query: "광학, 디스플레이 연구 관련 교수님을 추천해 주세요" },
    { label: "통신/보안", query: "통신, 정보보안 연구 관련 교수님을 추천해 주세요" },
    { label: "양자/시뮬레이션", query: "양자소자, 계산과학 시뮬레이션 연구 관련 교수님을 추천해 주세요" },
  ];

  const synonymMap = {
    반도체: ["semiconductor", "소자", "공정", "박막", "전자소자", "나노소자", "메모리", "센서", "fab", "fabrication"],
    공정: ["fabrication", "process", "리소그래피", "식각", "박막", "증착", "반도체공정개론", "반도체공정실습"],
    센서: ["sensor", "바이오센서", "헬스케어", "웨어러블", "sensing"],
    양자: ["quantum", "qubit", "큐비트", "초전도", "양자컴퓨팅", "양자정보", "quantum computing"],
    로봇: ["robot", "robotics", "제어", "자율", "메카트로닉스", "기계"],
    ai: ["인공지능", "머신러닝", "딥러닝", "llm", "computer vision", "컴퓨터비전"],
    인공지능: ["ai", "머신러닝", "딥러닝", "llm", "컴퓨터비전", "computer vision"],
    배터리: ["battery", "전지", "에너지저장", "전고체", "나노배터리", "energy storage"],
    전해질: ["electrolyte", "electrolytes", "battery electrolyte", "solid electrolyte", "polymer electrolyte", "sulfide electrolyte", "전해액", "고체전해질", "이온전도", "이온수송"],
    전해액: ["electrolyte", "liquid electrolyte", "battery electrolyte", "전해질"],
    고체전해질: ["solid electrolyte", "solid-state electrolyte", "sulfide electrolyte", "oxide electrolyte", "전고체전지", "전해질"],
    양극재: ["cathode", "cathode material", "positive electrode", "양극", "양극 소재"],
    음극재: ["anode", "anode material", "negative electrode", "lithium metal anode", "silicon anode", "음극", "음극 소재"],
    분리막: ["separator", "battery separator", "membrane"],
    계면: ["interface", "interphase", "sei", "cei", "solid electrolyte interphase", "전극 계면", "전해질 계면"],

    에너지: ["energy", "배터리", "태양전지", "수소", "촉매", "water harvesting"],
    바이오: ["bio", "생체", "단백질", "뇌", "의생명", "헬스케어", "바이오센서"],
    뇌과학: ["brain", "neuro", "neuroscience", "신경과학", "신경회로", "시냅스", "인지", "행동"],
    신경회로: ["뇌과학", "brain", "neuro", "neuroscience", "시냅스", "neural circuit"],
    화학공학: ["화학공학개론", "촉매", "고분자", "공정", "분리", "반응"],
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

  function dgistGlossaryContainsTerm(source, term) {
    const text = normalize(source || "");
    const needle = normalize(term || "");
    if (!text || !needle) return false;
    if (/^[a-z0-9]+$/i.test(needle) && needle.length <= 3) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
    }
    return text.includes(needle);
  }

  function hiddenBilingualSearchText(rawText) {
    const source = normalize(rawText);
    const out = new Set();
    if (!source) return "";
    bilingualSearchGlossary.forEach((group) => {
    const normalizedGroup = group.map((term) => normalize(term)).filter(Boolean);
    if (normalizedGroup.some((term) => dgistGlossaryContainsTerm(source, term))) {
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
    const textHitCount = normalizedGroup.reduce((acc, term) => acc + (dgistGlossaryContainsTerm(t, term) ? 1 : 0), 0);
    if (textHitCount > 0) boost += Math.min(44, 18 + textHitCount * 4);
    });
    return boost;
  }


  const stopTokens = new Set([
    "어떤", "교수", "교수님", "연구실", "연구", "분야", "분야로", "기반", "가고", "싶은데", "보면", "좋을까", "추천", "적합", "진로",
    "대학원", "취업", "하고", "싶어", "희망", "관련", "먼저", "정도", "기준", "있는", "없는", "어디", "dgist",
  ]);

  const fieldEvidenceTerms = {
    computational_science_simulation: [
      "시뮬레이션", "simulation", "simulations", "computational", "computational materials", "계산과학", "계산물질", "계산물질과학",
      "dft", "density functional", "first-principles", "first principles", "제일원리", "ab initio", "molecular dynamics", "분자동력학",
      "modeling", "modelling", "모델링", "theoretical model", "theoretical models", "이론모델", "물질이론",
    ],
    ai_machine_learning: ["인공지능", "머신러닝", "딥러닝", "machine learning", "deep learning", "ai", "neural network", "classification", "prediction", "trustworthy ai", "multi-modal", "multimodal", "federated learning", "on-device ai"],
    computer_vision: ["computer vision", "컴퓨터비전", "영상처리", "image", "vision", "slam", "object detection", "3d vision", "3d scene", "visual ai", "robot vision", "medical imaging", "segmentation", "holography"],
    nlp_generative_ai: ["nlp", "자연어처리", "llm", "large language model", "생성형", "generative", "language model", "multimodal modeling", "trustworthy ai"],
    semiconductor_process: ["fabrication", "semiconductor fabrication", "공정", "박막", "증착", "식각", "lithography", "리소그래피", "process"],
    semiconductor_device: ["semiconductor device", "반도체 소자", "전자소자", "nanodevice", "나노소자", "fet", "transistor"],
    ai_system_semiconductor: ["ai semiconductor", "시스템반도체", "in-memory", "pim", "rram", "accelerator", "neuromorphic", "compute-in-memory"],
    memory_semiconductor: ["memory", "메모리", "메모리 반도체", "memory technologies", "computer architecture", "in-memory", "rram", "mram", "memristor", "비휘발성", "차세대 메모리"],
    display_optoelectronic_device: ["display", "디스플레이", "optoelectronic", "photodetector", "광전자", "qled", "transparent", "flexible"],
    secondary_battery: ["battery", "배터리", "전지", "리튬", "li-ion", "electrode", "전극", "electrolyte", "electrolytes", "전해질", "전해액", "cathode", "anode", "separator", "양극재", "음극재", "분리막", "interface", "계면", "energy storage"],
    solid_state_battery: ["solid-state battery", "solid state battery", "전고체", "고체전해질", "고체 전해질", "solid electrolyte", "solid-state electrolyte", "sulfide electrolyte", "oxide electrolyte", "전해질", "전해액", "ion transport", "이온전도"],
    hydrogen_fuel_cell: ["hydrogen", "수소", "fuel cell", "연료전지", "water splitting", "수전해"],
    solar_renewable_energy: ["solar cell", "태양전지", "photovoltaic", "perovskite", "renewable", "신재생"],
    biosensor: ["biosensor", "바이오센서", "bio sensor", "생체 센서", "healthcare sensor", "sensing"],
    brain_engineering_bci: ["bci", "brain-computer", "brain computer", "neural interface", "신경 인터페이스", "뇌공학"],
    basic_neuroscience: ["neuroscience", "신경과학", "neural circuit", "synapse", "neuron", "brain"],
    brain_disease_neural_circuit: ["brain disease", "뇌질환", "neural circuit", "신경회로", "neuromodulation", "신경조절"],
    general_robotics: ["robot", "robots", "robotics", "로봇", "로보틱스", "mobile robotics", "macro robots", "surgical robots", "wearable robots", "soft robotics", "physical ai"],
    robot_control: ["robot control", "로봇 제어", "control", "robotics", "manipulation", "actuator", "modeling and control", "control theory"],
    autonomous_robot_mobility: ["autonomous", "자율주행", "mobility", "slam", "localization", "navigation", "path planning"],
    humanoid_robot_mechanism: ["humanoid", "휴머노이드", "mechanism", "메커니즘", "robot platform", "robot design"],
    medical_rehabilitation_robot: ["medical robot", "의료로봇", "rehabilitation", "재활", "wearable robot", "exoskeleton"],
    embedded_iot: ["embedded", "임베디드", "iot", "sensor network", "edge device", "low-power"],
    communication_network_6g: ["communication", "wireless", "6g", "network", "transceiver", "antenna", "signal processing"],
    security_cryptography: ["security", "cryptography", "암호", "보안", "privacy", "blockchain", "post-quantum"],
    quantum_computing_device: ["quantum computing", "양자컴퓨팅", "quantum device", "양자소자", "qubit", "큐비트", "quantum transport"],
    spintronics_next_generation_memory: ["spintronics", "스핀트로닉스", "mram", "mtj", "skyrmion", "spin", "자성"],
    biomedical_engineering: ["biomedical", "바이오메디컬", "의공학", "medical", "bioelectronics", "neural recording"],
  };

  const els = {
    profileButton: byId("profileButton"),
    resetButton: byId("resetButton"),
    profileGrade: byId("profileGrade"),
    profileTracks: byId("profileTracks"),
    goalInput: byId("goalInput"),
    exampleChips: byId("exampleChips"),
    askButton: byId("askButton"),
    evidenceOnlyButton: byId("evidenceOnlyButton"),
    pdfOnlyToggle: byId("pdfOnlyToggle"),
    clearFiltersButton: byId("clearFiltersButton"),
    labList: byId("labList"),
    labCount: byId("labCount"),
    chatFeed: byId("chatFeed"),
    copyAnswerButton: byId("copyAnswerButton"),
    candidateList: byId("candidateList"),
    candidateCount: byId("candidateCount"),
    evidenceList: byId("evidenceList"),
    evidenceCount: byId("evidenceCount"),
    planNote: byId("planNote"),
    saveNoteButton: byId("saveNoteButton"),
    profileDialog: byId("profileDialog"),
    profileForm: byId("profileForm"),
    gradeSelect: byId("gradeSelect"),
    trackOptions: byId("trackOptions"),
    interestInput: byId("interestInput"),
  };

  const state = loadState();
  let lastAnswerText = "";
  let lastResults = [];

  init();

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    renderExamples();
    renderTrackOptions();
    restoreProfileForm();
    renderProfile();
    els.planNote.value = localStorage.getItem(noteKey) || "";
    bindEvents();
    els.chatFeed.innerHTML = initialMessage();
    // KAIST-style page: do not open the old DGIST profile dialog automatically.
    state.profileSeen = true;
    persist();
  }

  function bindEvents() {
    els.profileButton.addEventListener("click", () => els.profileDialog.showModal());
    els.resetButton.addEventListener("click", resetAll);
    els.askButton.addEventListener("click", () => answerQuestion("full"));
    els.evidenceOnlyButton.addEventListener("click", () => answerQuestion("evidence"));
    els.goalInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") answerQuestion("full");
    });
    els.pdfOnlyToggle.addEventListener("change", () => {
      renderProfile();
      if (els.goalInput.value.trim()) answerQuestion("full", true);
    });
    els.profileForm.addEventListener("submit", saveProfile);
    els.copyAnswerButton.addEventListener("click", copyAnswer);
    els.saveNoteButton.addEventListener("click", () => {
      localStorage.setItem(noteKey, els.planNote.value);
      toast("메모를 저장했어.");
    });
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || defaultState();
    } catch (_) {
      return defaultState();
    }
  }

  function defaultState() {
    return {
      profileSeen: false,
      grade: "2",
      tracks: [],
      interest: "",
      history: [],
    };
  }

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function resetAll() {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(noteKey);
    state.profileSeen = true;
    state.grade = "2";
    state.tracks = [];
    state.interest = "";
    state.history = [];
    els.goalInput.value = "";
    els.exampleChips.querySelectorAll(".chip").forEach((node) => node.classList.remove("active"));
    els.planNote.value = "";
    restoreProfileForm();
    renderProfile();
    els.candidateList.innerHTML = "";
    els.evidenceList.innerHTML = "";
    els.candidateCount.textContent = "-";
    els.evidenceCount.textContent = "-";
    lastAnswerText = "";
    lastResults = [];
    els.chatFeed.innerHTML = initialMessage();
  }

  function renderExamples() {
    els.exampleChips.innerHTML = "";
    examples.forEach((item) => {
      const example = typeof item === "string" ? { label: item, query: item } : item;
      const button = document.createElement("button");
      button.className = "chip field-chip";
      button.type = "button";
      button.textContent = example.label || example.query;
      button.title = example.query || example.label;
      button.addEventListener("click", () => {
        els.exampleChips.querySelectorAll(".chip").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        els.goalInput.value = example.query || example.label;
        answerQuestion("full");
      });
      els.exampleChips.appendChild(button);
    });
  }

  function renderTrackOptions() {
    els.trackOptions.innerHTML = "";
    tracks.forEach((track) => {
      const id = "track-" + track;
      const label = document.createElement("label");
      label.className = "track-option";
      label.setAttribute("for", id);
      label.innerHTML = `<input id="${id}" type="checkbox" value="${escapeHtml(track)}"><span>${escapeHtml(track)}</span>`;
      els.trackOptions.appendChild(label);
    });
    els.trackOptions.addEventListener("change", () => {
      const checked = [...els.trackOptions.querySelectorAll("input:checked")];
      if (checked.length > 2) {
        checked[checked.length - 1].checked = false;
        toast("관심 트랙은 최대 2개까지 선택할 수 있어.");
      }
    });
  }

  function restoreProfileForm() {
    els.gradeSelect.value = state.grade;
    els.interestInput.value = state.interest;
    [...els.trackOptions.querySelectorAll("input")].forEach((input) => {
      input.checked = state.tracks.includes(input.value);
    });
  }

  function saveProfile(event) {
    event.preventDefault();
    if (event.submitter && event.submitter.value === "cancel") {
      state.profileSeen = true;
      persist();
      els.profileDialog.close();
      return;
    }
    state.grade = els.gradeSelect.value;
    state.interest = els.interestInput.value.trim();
    state.tracks = [...els.trackOptions.querySelectorAll("input:checked")].map((input) => input.value).slice(0, 2);
    state.profileSeen = true;
    persist();
    renderProfile();
    els.profileDialog.close();
    if (state.interest && !els.goalInput.value.trim()) {
      els.goalInput.value = state.interest + " 분야로 가려면 어떤 연구실, 과목, 인턴이 좋을까?";
    }
  }

  function renderProfile() {
    const gradeLabel = state.grade === "graduate" ? "대학원 관심" : `${state.grade}학년`;
    els.profileGrade.textContent = gradeLabel;
    els.profileTracks.textContent = state.tracks.length ? state.tracks.join(", ") : "미설정";
  }


  function answerQuestion(mode, silent) {
    const query = els.goalInput.value.trim();
    if (!query) {
      toast("분야 버튼을 누르거나 관심 연구 키워드를 입력해 주세요.");
      els.goalInput.focus();
      return;
    }
    const userProfileText = [state.grade, state.tracks.join(" "), state.interest].filter(Boolean).join(" ");
    const queryAssist = window.LMQueryAssist ? window.LMQueryAssist.expand(query) : { query, applied: false };
    const rankingQuery = queryAssist.query || query;
    const matchedProfiles = detectFieldProfiles(rankingQuery);
    const results = rankLabs(`${rankingQuery} ${userProfileText}`, rankingQuery).slice(0, 5);
    lastResults = results;
    const answer = matchedProfiles.length === 1 && !(matchedProfiles[0].recommended_professors || []).length
      ? buildUnsupportedFieldAnswer(query, matchedProfiles[0])
      : buildAnswer(query, results, mode, matchedProfiles, rankingQuery);
    renderSidePanels(results, answer.evidence);
    // KAIST-style page: each new query replaces the previous visible result.
    els.chatFeed.innerHTML = "";
    appendUserMessage(query);
    appendAssistantMessage(answer.html);
    lastAnswerText = answer.text;
    state.history.push({ query, at: new Date().toISOString() });
    state.history = state.history.slice(-20);
    persist();
  }



  function compactProfessorNameText(value) {
    return normalize(String(value || ""))
      .replace(/교수님/g, "")
      .replace(/교수/g, "")
      .replace(/professor/g, "")
      .replace(/[^0-9a-z가-힣]/g, "");
  }

  function dgistProfessorNameDirectMatchScore(lab, query) {
    const compactQuery = compactProfessorNameText(query);
    if (compactQuery.length < 2) return 0;
    const candidates = [lab.professor, lab.professorEn].filter(Boolean);
    for (const rawName of candidates) {
      const compactName = compactProfessorNameText(rawName);
      if (!compactName || compactName.length < 2) continue;
      if (compactQuery === compactName) return 6000;
      if (compactQuery.includes(compactName)) return 5800;
      if (compactName.includes(compactQuery) && compactQuery.length >= 2) return 5600;
    }
    return 0;
  }



  // DGIST_INTEGRATED_INTERNAL_RECOMMENDER_BEGIN
  // 화면 표시용 DB와 UI는 유지하고, 사용자에게 보이지 않는 내부 추천 DB를 점수 계산에 반영합니다.
  function dgistInternalDbObject() {
    return window.DGIST_INTERNAL_RECOMMENDATION_DB || {};
  }

  function dgistInternalRecords() {
    const db = dgistInternalDbObject();
    if (Array.isArray(db)) return db;
    if (Array.isArray(db._merged)) return db._merged;
    return Object.keys(db)
      .filter((key) => key && key[0] !== "_")
      .flatMap((key) => Array.isArray(db[key]) ? db[key] : []);
  }

  function dgistInternalNorm(value) {
    return normalize(String(value || "").replace(/[·]/g, " "));
  }

  function dgistInternalArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
    return [String(value).trim()].filter(Boolean);
  }

  function dgistInternalRecordKey(rec) {
    return dgistInternalNorm(rec.professor || "").replace(/\s+/g, "");
  }

  function dgistInternalRecordsForLab(lab) {
    const professorKey = dgistInternalNorm(lab.professor || "").replace(/\s+/g, "");
    if (!professorKey) return [];
    return dgistInternalRecords().filter((rec) => dgistInternalRecordKey(rec) === professorKey);
  }

  function dgistInternalTermHits(query, terms, options = {}) {
    const q = dgistInternalNorm(query || "");
    const qTokens = expandTokens(tokenize(q)).filter((token) => token && token.length >= 2);
    const hits = [];
    const allowReverse = !!options.allowReverse;
    const allowToken = !!options.allowToken;
    dgistInternalArray(terms).forEach((term) => {
      const raw = String(term || "").trim();
      const t = dgistInternalNorm(raw);
      if (!t || t.length < 2) return;
      const isShortEnglish = /^[a-z0-9\-+/. ]+$/.test(t) && t.length <= 3;
      const direct = q.includes(t);
      const reverse = allowReverse && q.length >= 3 && !dgistInternalIsBroadQuery(q) && t.includes(q);
      const token = allowToken && !isShortEnglish && qTokens.some((qt) => qt.length >= 2 && (t === qt || t.includes(qt)));
      if (direct || reverse || token) hits.push(raw);
    });
    return unique(hits).slice(0, 20);
  }

  function dgistInternalIsBroadQuery(query) {
    const q = dgistInternalNorm(query || "");
    const broad = new Set(((window.DGIST_INTERNAL_INTENT_CLASSIFIER || {}).broad_terms || [
      "ai", "인공지능", "데이터", "data", "연구", "분야", "소재", "materials", "chemistry", "화학", "합성", "synthesis",
      "에너지", "energy", "배터리", "battery", "전지", "device", "소자", "공정", "process", "interface", "계면",
      "membrane", "막", "control", "제어", "robot", "로봇", "bio", "바이오", "뇌", "뇌과학", "neuroscience",
      "medical", "의료", "영상", "imaging", "semiconductor", "반도체", "quantum", "양자"
    ]).map(dgistInternalNorm));
    const tokens = tokenize(q).filter((token) => token && !["교수", "교수님", "추천", "연구실", "랩실", "찾아줘", "소개"].includes(token));
    if (!tokens.length) return false;
    return tokens.every((token) => broad.has(token));
  }

  function dgistInternalDetectIntent(query) {
    const q = dgistInternalNorm(query || "");
    const records = dgistInternalRecords();
    const positives = [];
    const weaks = [];
    const negatives = [];
    records.forEach((rec) => {
      const positiveTerms = [
        ...dgistInternalArray(rec.positive_queries),
        ...dgistInternalArray(rec.aliases_ko),
        ...dgistInternalArray(rec.aliases_en),
        ...dgistInternalArray(rec.subfields)
      ];
      const weakTerms = dgistInternalArray(rec.weak_queries);
      const negativeTerms = dgistInternalArray(rec.negative_queries);
      dgistInternalTermHits(q, positiveTerms, { allowReverse: true }).forEach((term) => positives.push(term));
      dgistInternalTermHits(q, weakTerms, { allowReverse: false }).forEach((term) => weaks.push(term));
      dgistInternalTermHits(q, negativeTerms, { allowReverse: false }).forEach((term) => negatives.push(term));
    });
    const strongTerms = unique(positives).filter((term) => !dgistInternalIsBroadQuery(term));
    const specificity = Math.min(5, strongTerms.length + Math.max(0, tokenize(q).length - 1));
    return {
      query: q,
      strongTerms,
      weakTerms: unique(weaks),
      negativeTerms: unique(negatives),
      hasStrong: strongTerms.length > 0,
      isBroad: dgistInternalIsBroadQuery(q),
      specificity
    };
  }

  function dgistInternalScoreLab(lab, query) {
    const records = dgistInternalRecordsForLab(lab);
    const q = dgistInternalNorm(query || "");
    if (!records.length || !q) return { score: 0, positiveHits: [], weakHits: [], negativeHits: [], strongHitCount: 0, blocked: false, specificity: 0 };
    let score = 0;
    let positiveHits = [];
    let weakHits = [];
    let negativeHits = [];
    let subfieldHits = [];
    let methodHits = [];
    let materialHits = [];
    let applicationHits = [];
    records.forEach((rec) => {
      const pos = dgistInternalTermHits(q, rec.positive_queries, { allowReverse: true });
      const aliases = dgistInternalTermHits(q, [...dgistInternalArray(rec.aliases_ko), ...dgistInternalArray(rec.aliases_en)], { allowReverse: true });
      const subs = dgistInternalTermHits(q, rec.subfields, { allowReverse: true });
      const methods = dgistInternalTermHits(q, rec.methods, { allowReverse: false });
      const mats = dgistInternalTermHits(q, rec.materials_or_targets, { allowReverse: false });
      const apps = dgistInternalTermHits(q, rec.applications, { allowReverse: false });
      const weak = dgistInternalTermHits(q, rec.weak_queries, { allowReverse: false });
      const neg = dgistInternalTermHits(q, rec.negative_queries, { allowReverse: false });
      positiveHits.push(...pos, ...aliases, ...subs);
      subfieldHits.push(...subs);
      methodHits.push(...methods);
      materialHits.push(...mats);
      applicationHits.push(...apps);
      weakHits.push(...weak);
      negativeHits.push(...neg);
    });
    positiveHits = unique(positiveHits);
    weakHits = unique(weakHits);
    negativeHits = unique(negativeHits);
    subfieldHits = unique(subfieldHits);
    methodHits = unique(methodHits);
    materialHits = unique(materialHits);
    applicationHits = unique(applicationHits);

    score += positiveHits.length * 760;
    score += subfieldHits.length * 520;
    score += methodHits.length * 180;
    score += materialHits.length * 160;
    score += applicationHits.length * 120;
    score += weakHits.length * 65;

    const hasPositive = positiveHits.length || subfieldHits.length || methodHits.length || materialHits.length || applicationHits.length;
    const onlyBroad = dgistInternalIsBroadQuery(q);
    if (onlyBroad && !hasPositive) score -= 220;
    if (onlyBroad && hasPositive) score = Math.round(score * 0.55);
    if (negativeHits.length && !hasPositive) score -= 1600;
    else if (negativeHits.length) score -= 350;

    const strongHitCount = positiveHits.length + subfieldHits.length;
    const specificity = Math.min(5, strongHitCount + methodHits.length + materialHits.length + applicationHits.length);
    return {
      score,
      positiveHits,
      weakHits,
      negativeHits,
      subfieldHits,
      methodHits,
      materialHits,
      applicationHits,
      strongHitCount,
      specificity,
      blocked: negativeHits.length > 0 && !hasPositive
    };
  }

  function dgistInternalVisibleResult(item, query, profiles, maxScore) {
    const match = item.internalMatch || dgistInternalScoreLab(item.lab, query);
    if (dgistProfessorNameDirectMatchScore(item.lab, query) > 0) return true;
    if (match.blocked) return false;
    const intent = dgistInternalDetectIntent(query || "");
    if (intent.hasStrong) {
      return match.strongHitCount >= 1 || match.score >= Math.max(260, maxScore * 0.18);
    }
    if (intent.isBroad) {
      return match.strongHitCount >= 1 || (profiles || []).some((profile) => (profile.recommended_professors || []).includes(item.lab.professor));
    }
    return true;
  }

  function dgistInternalEvidenceTerms(lab, query) {
    const match = dgistInternalScoreLab(lab, query);
    const terms = unique([
      ...(match.positiveHits || []),
      ...(match.subfieldHits || []),
      ...(match.methodHits || []),
      ...(match.materialHits || []),
      ...(match.applicationHits || []),
      ...(match.weakHits || [])
    ]).filter((term) => !dgistInternalIsBroadQuery(term));
    return terms.slice(0, 5);
  }

  // DGIST_INTEGRATED_INTERNAL_RECOMMENDER_END

  function rankLabs(query, profileQuery) {
    const tokens = expandTokens(tokenize(query));
    const phrase = normalize(query);
    const matchedProfiles = detectFieldProfiles(profileQuery || query);
    const profileBoosts = buildProfileBoosts(matchedProfiles);
    window.__lastDgistQueryForScoring = query || "";
    return data.labs
      .filter(isRecommendableFaculty)
      .map((lab) => {
        const rawEvidenceText = [
          lab.retrievalText,
          lab.summary,
          (lab.topics || []).join(" "),
          (lab.keywords || []).join(" "),
          lab.pdfCourses.map((course) => course.evidence).join(" "),
          lab.pdfInternships.map((item) => item.evidence).join(" "),
        ].join(" ");
        const hiddenSearchRaw = hiddenBilingualSearchText(rawEvidenceText);
        const evidenceSearchText = normalize([rawEvidenceText, hiddenSearchRaw].join(" "));
        const searchText = normalize([
          evidenceSearchText,
          lab.domainTags.join(" "),
          lab.topKeywords.join(" "),
        ].join(" "));
        let score = 0;
        const internalMatch = dgistInternalScoreLab(lab, query);
        tokens.forEach((token) => {
          if (!token || token.length < 2) return;
          const count = countIncludes(evidenceSearchText, token);
          score += count;
          if (normalize(lab.professor).includes(token)) score += 14;
          if (normalize(displayLabName(lab)).includes(token)) score += 12;
          if (lab.keywords.some((keyword) => normalize(keyword).includes(token))) score += 5;
          if (lab.pdfCourses.some((course) => normalize(course.evidence).includes(token))) score += 3;
          if (lab.pdfInternships.some((item) => normalize(item.evidence).includes(token))) score += 3;
        });
        if (phrase && evidenceSearchText.includes(phrase)) score += 20;
        const fit = profileFitScore(lab, matchedProfiles, evidenceSearchText);
        score += fit.score;
        score += hiddenBilingualFocusBoost(query, rawEvidenceText);
        const focusedCoreText = normalize([
          lab.summary,
          (lab.topics || []).join(" "),
          (lab.keywords || []).join(" "),
          lab.topKeywords.join(" "),
        ].join(" "));
        const normalizedQueryForFocus = normalize(query || "");
        if (dgistHas(normalizedQueryForFocus, ["전해질", "전해액", "고체전해질", "고체 전해질", "electrolyte", "electrolytes", "solid electrolyte", "ion transport", "ionic conduction"])) {
          const hasCoreElectrolyte = hasAnyTerm(focusedCoreText, ["electrolyte", "electrolytes", "li-ion battery electrolytes", "battery electrolyte", "solid electrolyte", "polymer electrolyte", "sulfide electrolyte", "전해질", "전해액", "고체전해질", "이온전도", "ionics", "ionic conduction", "ion transport"]);
          const hasOnlyBroadBattery = hasAnyTerm(focusedCoreText, ["battery", "batteries", "배터리", "전지", "lithium", "li-ion"]);
          const summaryTopicText = normalize([lab.summary, (lab.topics || []).join(" ")].join(" "));
          const exactBatteryElectrolyte = hasAnyTerm(summaryTopicText, ["li-ion battery electrolytes", "li ion battery electrolytes", "battery electrolyte", "battery electrolytes", "electrochemistry battery electrolyte", "전지 전해질", "배터리 전해질"]);
          const electrolyteWithBattery = hasAnyTerm(summaryTopicText, ["electrolyte", "electrolytes", "전해질", "전해액", "ionics", "ionic conduction", "ion transport"]) && hasAnyTerm(summaryTopicText, ["battery", "batteries", "li-ion", "lithium", "전지", "배터리", "리튬"]);
          const fuelCellElectrolyteOnly = hasAnyTerm(summaryTopicText, ["polymer electrolyte membrane fuel", "fuel cell", "연료전지"]);
          if (exactBatteryElectrolyte) score += 900;
          else if (electrolyteWithBattery) score += 650;
          else if (hasCoreElectrolyte && !fuelCellElectrolyteOnly) score += 520;
          else if (hasCoreElectrolyte) score += 180;
          else if (hasOnlyBroadBattery) score -= 230;
        }
        const rawBoost = profileBoosts.get(lab.professor) || 0;
        if (rawBoost) {
          const gatedBoost = Math.round(rawBoost * fit.confidence);
          score += gatedBoost;
          if (matchedProfiles.length && fit.confidence < 0.25) score -= Math.min(240, Math.round(rawBoost * 0.55));
        }
        score += domainAdjustment(lab, matchedProfiles, evidenceSearchText, profileBoosts, fit);
        score += strictFieldPenalty(lab, matchedProfiles, evidenceSearchText, profileBoosts, fit);
        score += internalMatch.score;
        if (lab.pdfCourses.length) score += 2;
        if (lab.pdfInternships.length) score += 2;
        const directNameScore = dgistProfessorNameDirectMatchScore(lab, query);
        if (directNameScore > 0) score = Math.max(score, directNameScore);
        if (lab.category.includes("퇴임")) score -= 25;
        if (lab.category.includes("석좌")) score -= 8;
        return { lab, score: Math.max(0, score), internalMatch };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(a.lab.professor).localeCompare(String(b.lab.professor), "ko"));
  }

  function buildAnswer(query, results, mode, matchedProfiles, scoringQuery) {
    const relevanceQuery = scoringQuery || query;
    if (!results.length) {
      const html = `<h3>조건에 적합한 후보를 찾지 못했습니다.</h3><p>검색어를 조금 넓혀 다시 입력해 주세요. 예를 들어 “배터리”처럼 짧게 입력하거나 “전고체전지, 고체전해질, 리튬금속전지”처럼 관련 키워드를 함께 입력하면 추천 정확도가 높아집니다.</p>`;
      return { html, text: stripHtml(html), evidence: [] };
    }

    const visibleResults = applyVisibleRelevanceFilter(results, relevanceQuery, matchedProfiles || []);
    if (!visibleResults.length) {
      const html = `<h3>조건에 적합한 후보를 찾지 못했습니다.</h3><p><strong>${escapeHtml(query)}</strong>와 직접 연결되는 내부 추천 근거가 부족합니다. 더 넓은 분야명 또는 관련 세부 키워드를 함께 입력해 주세요.</p>`;
      return { html, text: stripHtml(html), evidence: [] };
    }
    const top = visibleResults.slice(0, 5);
    const evidence = collectEvidence(top);
    const quality = buildQualitySummary(query, top, matchedProfiles || []);

    if (mode === "evidence") {
      const html = `
        <p>아래는 답변에 사용할 수 있는 핵심 근거야.</p>
        ${renderEvidenceCards(evidence)}
      `;
      return { html, text: stripHtml(html), evidence };
    }

    const tagSummary = summarizeResultTags(top, query, matchedProfiles || []);
    const maxScore = Math.max(...top.map((item) => item.score), 1);
    const labCards = top.map((item, index) => renderDgistLabCard(item, index, relevanceQuery, matchedProfiles || [], maxScore)).join("");
    const limitations = quality.limitations.length
      ? `<div class="result-note">${quality.limitations.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`
      : "";
    const html = `
      <h3>추천 결과</h3>
      <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 우선 확인할 만한 교수님입니다.</p>
      <p class="result-tags">주요 적합 분야: ${tagSummary.map(escapeHtml).join(", ") || "입력 키워드 기반"}</p>
      ${limitations}
      <div class="card-list top-results">${labCards}</div>
    `;
    return { html, text: stripHtml(html), evidence };
  }

  function buildMultiProfileAnswer(query, profiles, mode) {
    const collected = [];
    const shownProfessorKeys = new Set();
    const sections = profiles
      .map((profile) => {
        if (!(profile.recommended_professors || []).length) {
          return `
            <div class="answer-card">
              <h3>${escapeHtml(profile.field)}</h3>
              <p>현재 저장된 피드백 DB에서는 조교수, 부교수, 정교수 기준의 명확한 추천 교수님을 확인하지 못했습니다.</p>
              <p class="muted">${escapeHtml(profile.note || "")}</p>
            </div>
          `;
        }
        const rankedResults = rankLabs(`${profile.field} ${(profile.aliases || []).join(" ")}`, profile.field);
        const results = applyVisibleRelevanceFilter(rankedResults, profile.field, [profile])
          .filter((item) => {
            const key = professorDedupKey(item);
            return !shownProfessorKeys.has(key);
          })
          .slice(0, 3);
        results.forEach((item) => shownProfessorKeys.add(professorDedupKey(item)));
        collected.push(...results);
        if (!results.length) {
          return `
            <div class="answer-card">
              <h3>${escapeHtml(profile.field)}</h3>
              <p>현재 후보에서 명확한 추천 결과를 찾지 못했습니다.</p>
              <p class="muted">${escapeHtml(profile.note || "")}</p>
            </div>
          `;
        }
        return `
          <section class="profile-result-block">
            <h4>${escapeHtml(profile.field)}</h4>
            <div class="card-list top-results">${results.map((item, index) => renderDgistLabCard(item, index, profile.field, [profile], Math.max(...results.map((result) => result.score), 1))).join("")}</div>
          </section>
        `;
      })
      .join("");

    const evidence = collectEvidence(uniqueResultLabs(collected).slice(0, 5));
    const html = `
      <h3>추천 결과</h3>
      <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 관련 분야별 후보를 정리했습니다.</p>
      ${sections}
    `;
    return { html, text: stripHtml(html), evidence };
  }

  function buildUnsupportedFieldAnswer(query, profile) {
    const html = `
      <p><strong>${escapeHtml(query)}</strong> 질문은 <strong>${escapeHtml(profile.field)}</strong> 분야로 인식했어.</p>
      ${renderQualitySummary(buildQualitySummary(query, [], [profile]))}
      <div class="answer-card">
        <h3>추천 보류</h3>
        <p>현재 저장된 데이터에서는 이 분야의 명확한 추천 교수님을 확인하지 못했어.</p>
        <p class="muted">${escapeHtml(profile.note || "")}</p>
      </div>
    `;
    return { html, text: stripHtml(html), evidence: [] };
  }

  function buildProfileNote(profiles) {
    return "";
  }

  function buildQualitySummary(query, results, profiles) {
    const recommended = getProfileRecommendedSet(profiles);
    const topLabs = results.map((item) => item.lab);
    const verifiedCount = topLabs.filter((lab) => recommended.has(lab.professor)).length;
    const profileNames = profiles.map((profile) => profile.field);
    const courseCount = topLabs.filter((lab) => lab.pdfCourses.length).length;
    const internshipCount = topLabs.filter((lab) => lab.pdfInternships.length).length;
    const isUnsupported = profiles.length === 1 && !(profiles[0].recommended_professors || []).length;
    let level = "낮음";
    let tone = "low";
    if (isUnsupported) {
      level = "추천 보류";
      tone = "hold";
    } else if (profiles.length && verifiedCount >= Math.min(2, topLabs.length)) {
      level = "높음";
      tone = "high";
    } else if (profiles.length || topLabs.length) {
      level = "중간";
      tone = "medium";
    }
    const limitations = [];
    if (topLabs.length && internshipCount < topLabs.length) limitations.push("일부 연구실은 인턴 자료가 없어 인턴 활동을 추측하지 않았어.");
    if (topLabs.some((lab) => (lab.chatbotQualityFlags || []).includes("representative_publications_need_review"))) {
      limitations.push("일부 연구실은 대표 논문 근거가 약해 논문 정보는 추가 확인이 필요해.");
    }
    return {
      query,
      level,
      tone,
      profileNames,
      verifiedCount,
      totalCount: topLabs.length,
      courseCount,
      internshipCount,
      limitations,
    };
  }


  function professorDedupKey(item) {
    const lab = item && item.lab ? item.lab : {};
    const name = normalize(lab.professor || "").replace(/\s+/g, "");
    return name || String(lab.id || displayLabName(lab) || Math.random());
  }

  function dedupeResultsByProfessor(results) {
    const groups = new Map();
    (results || []).forEach((item) => {
      const key = professorDedupKey(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    const merged = [];
    groups.forEach((items) => {
      const labs = items.map((item) => item.lab).filter(Boolean);
      const best = items.slice().sort((a, b) => (b.score || 0) - (a.score || 0))[0];
      const mergedLab = labs.length > 1 && typeof dgistMergeLabsForProfessor === "function" ? dgistMergeLabsForProfessor(labs) : best.lab;
      merged.push({ ...best, lab: mergedLab, score: Math.max(...items.map((item) => item.score || 0)) });
    });
    return merged.sort((a, b) => b.score - a.score || String(a.lab.professor).localeCompare(String(b.lab.professor), "ko"));
  }

  function applyVisibleRelevanceFilter(results, query, profiles) {
    if (!results.length) return [];
    const maxScore = Math.max(...results.map((item) => item.score), 1);
    const intent = dgistInternalDetectIntent(query || "");
    let baseResults = results.filter((item) => dgistInternalVisibleResult(item, query || "", profiles || [], maxScore));

    if (!baseResults.length && (profiles || []).length && !intent.hasStrong) {
      baseResults = results.filter((item) => isVisibleRelevantResult(item, profiles || [], maxScore));
    }
    if (!baseResults.length && !intent.hasStrong && !intent.isBroad) {
      baseResults = !(profiles || []).length ? results.slice(0, 8) : results.slice(0, Math.min(4, results.length));
    }

    const cap = intent.hasStrong && intent.specificity >= 2 ? 3 : 5;
    return dedupeResultsByProfessor(baseResults).slice(0, cap);
  }

  function isVisibleRelevantResult(item, profiles, maxScore) {
    const lab = item.lab;
    const text = getConciseLabResearchText(lab);
    const isSeed = profiles.some((profile) => (profile.recommended_professors || []).includes(lab.professor));
    const score = item.score || 0;
    const ids = new Set(profiles.map((profile) => profile.id));
    const dept = normalize(lab.department || "");
    const strongHits = profiles.reduce((count, profile) => count + fieldSpecificHitCount(profile.id, text), 0);

    if (ids.has("security_cryptography")) {
      return (isSeed && strongHits >= 1 && score >= 120) || (strongHits >= 3 && dept.includes("전기전자컴퓨터") && score >= 180);
    }
    if (ids.has("nlp_generative_ai")) {
      if (!dept.includes("전기전자컴퓨터") && strongHits < 3) return false;
      return (isSeed && strongHits >= 1 && score >= 130) || (strongHits >= 3 && score >= 180);
    }
    if (ids.has("semiconductor_device")) {
      return (isSeed && strongHits >= 1 && score >= 110) || (strongHits >= 3 && score >= Math.max(190, maxScore * 0.26));
    }
    if (ids.has("memory_semiconductor")) {
      return (isSeed && strongHits >= 1 && score >= 110) || (strongHits >= 2 && score >= Math.max(160, maxScore * 0.22));
    }
    if (ids.has("general_robotics")) {
      return (isSeed && strongHits >= 1 && score >= 110) || (strongHits >= 2 && dept.includes("로봇") && score >= Math.max(150, maxScore * 0.18));
    }
    if (ids.has("semiconductor_process")) {
      return (isSeed && strongHits >= 1) || (strongHits >= 4 && score >= Math.max(180, maxScore * 0.22));
    }
    if (ids.has("display_optoelectronic_device")) {
      return (isSeed && strongHits >= 2) || (strongHits >= 3 && score >= Math.max(160, maxScore * 0.2));
    }
    if (ids.has("biosensor") || ids.has("biomedical_engineering")) {
      return (isSeed && strongHits >= 2) || (strongHits >= 4 && score >= Math.max(160, maxScore * 0.2));
    }
    if (ids.has("computer_vision")) {
      if (lab.professor === "김기섭" && dept.includes("전기전자컴퓨터") && strongHits < 4) return false;
      return (isSeed && strongHits >= 2) || (strongHits >= 3 && score >= Math.max(170, maxScore * 0.22));
    }
    if (ids.has("communication_network_6g")) {
      return (isSeed && strongHits >= 1) || (strongHits >= 4 && dept.includes("전기전자컴퓨터") && score >= Math.max(160, maxScore * 0.2));
    }
    if (ids.has("ai_machine_learning")) {
      return (isSeed && strongHits >= 1) || (strongHits >= 3 && score >= Math.max(180, maxScore * 0.23));
    }
    if (ids.has("basic_neuroscience") || ids.has("brain_disease_neural_circuit") || ids.has("brain_engineering_bci")) {
      if (ids.has("brain_engineering_bci")) return (isSeed && strongHits >= 1) || (strongHits >= 3 && score >= 160);
      return (dept.includes("뇌과학과") && strongHits >= 2) || (isSeed && strongHits >= 2);
    }

    if (isSeed && strongHits >= 1 && score >= Math.max(120, maxScore * 0.16)) return true;
    if (strongHits >= 2 && score >= Math.max(150, maxScore * 0.22)) return true;
    if (strongHits >= 1 && score >= Math.max(210, maxScore * 0.32)) return true;
    return false;
  }

  function getConciseLabResearchText(lab) {
    return normalize([
      lab.summary,
      (lab.topics || []).join(" "),
      (lab.pdfInternships || []).map((item) => [item.evidence, ...(item.subjects || [])].join(" ")).join(" "),
      (lab.pdfCourses || []).map((course) => [course.researchFields, course.raw].join(" ")).join(" "),
    ].join(" "));
  }

  function getEvidenceOnlySearchText(lab) {
    return normalize([
      lab.retrievalText,
      lab.summary,
      (lab.topics || []).join(" "),
      (lab.keywords || []).join(" "),
      lab.pdfCourses.map((course) => course.evidence).join(" "),
      lab.pdfInternships.map((item) => item.evidence).join(" "),
    ].join(" "));
  }

  function fieldSpecificHitCount(profileId, searchText) {
    const strictTerms = {
      ai_machine_learning: ["artificial intelligence", "machine learning", "deep learning", "federated learning", "on-device ai", "multi-modal learning", "multimodal", "computer vision", "robot vision", "generative ai", "large language model", "trustworthy ai", "AI for Software Engineering", "인공지능", "머신러닝", "딥러닝"],
      computer_vision: ["computer vision", "robot vision", "vision", "visual", "image", "imaging", "영상", "slam", "segmentation", "holography", "virtual staining", "3d vision", "3d scene", "scene understanding", "medical imaging"],
      nlp_generative_ai: ["nlp", "natural language", "자연어처리", "language model", "large language model", "llm", "generative ai", "생성형", "multimodal modeling", "trustworthy ai"],
      semiconductor_process: ["semiconductor fabrication", "fabrication", "fab", "process", "공정", "thin film", "박막", "deposition", "증착", "etch", "식각", "lithography", "micro/nano", "mems"],
      semiconductor_device: ["semiconductor device", "전자소자", "반도체 소자", "transistor", "fet", "nanodevice", "neuromorphic"],
      ai_system_semiconductor: ["ai semiconductor", "시스템반도체", "accelerator", "pim", "compute-in-memory", "neuromorphic", "rram"],
      memory_semiconductor: ["memory", "메모리", "memory technologies", "computer architecture", "in-memory", "rram", "mram", "memristor", "비휘발성", "spintronics"],
      display_optoelectronic_device: ["display", "디스플레이", "optoelectronic", "photodetector", "qled", "oled", "quantum dot", "transparent", "flexible transparent", "organic light-emitting", "광전자"],
      secondary_battery: ["battery", "배터리", "전지", "lithium", "리튬", "electrode", "전극", "electrolyte", "electrolytes", "전해질", "전해액", "cathode", "anode", "separator", "양극재", "음극재", "분리막", "interface", "계면", "energy storage"],
      solid_state_battery: ["solid-state", "solid state", "전고체", "solid electrolyte", "solid-state electrolyte", "고체전해질", "고체 전해질", "sulfide electrolyte", "oxide electrolyte", "전해질", "전해액", "ion transport", "이온전도"],
      security_cryptography: ["cryptography", "암호", "security", "보안", "privacy enhancing", "post-quantum", "homomorphic", "blockchain", "secure", "critical infrastructure", "정보보호"],
      communication_network_6g: ["communication", "communications", "wireless", "network", "6g", "signal processing", "transceiver", "antenna", "radio", "ofdm", "pam-4", "통신", "네트워크"],
      biosensor: ["biosensor", "bio sensor", "바이오센서", "bio sensors", "healthcare sensor", "bioelectronics", "wearable", "implantable", "sensing", "생체", "헬스케어"],
      biomedical_engineering: ["biomedical", "bioelectronics", "medical", "healthcare", "neural recording", "implantable", "의공학", "의료"],
      brain_engineering_bci: ["bci", "brain-computer", "brain computer", "neural interface", "신경 인터페이스", "뇌공학"],
      basic_neuroscience: ["neuroscience", "신경과학", "brain", "neural circuit", "synapse", "neuron", "neuromodulation", "behavior", "cognitive", "in-vivo", "mouse", "non-human primate", "뇌", "신경회로"],
      brain_disease_neural_circuit: ["brain disease", "뇌질환", "neural circuit", "신경회로", "neuromodulation", "신경조절", "synapse", "neuron"],
      general_robotics: ["robot", "robots", "robotics", "mobile robotics", "macro robots", "surgical robots", "wearable robots", "soft robotics", "physical ai", "로봇", "로보틱스"],
      robot_control: ["robot", "robotics", "robot control", "manipulation", "actuator", "gripper", "humanoid", "로봇", "제어", "modeling and control", "control theory"],
      autonomous_robot_mobility: ["autonomous", "mobility", "slam", "localization", "navigation", "path planning", "mobile robot", "자율주행", "모빌리티"],
      medical_rehabilitation_robot: ["medical robot", "surgical robotics", "rehabilitation", "exoskeleton", "wearable robot", "의료로봇", "재활"],
      embedded_iot: ["embedded", "iot", "sensor network", "edge device", "low-power", "임베디드"],
      quantum_computing_device: ["quantum computing", "quantum device", "qubit", "quantum transport", "topological quantum", "양자컴퓨팅", "양자소자"],
      computational_science_simulation: ["simulation", "computational", "dft", "density functional", "first-principles", "molecular dynamics", "modeling", "시뮬레이션", "계산과학"],
    };
    const terms = strictTerms[profileId] || fieldEvidenceTerms[profileId] || [];
    return hitCount(searchText, terms);
  }

  function renderHomepageSummary(lab, text) {
    const summary = escapeHtml(polishProfessorWord(text || "연구 요약 없음"));
    const homepage = lab.homepage || "";
    if (!homepage) return summary;
    return `<a class="summary-link" href="${escapeHtml(homepage)}" target="_blank" rel="noopener noreferrer">${summary}</a>`;
  }

  function renderQualitySummary(summary) {
    const fields = summary.profileNames.length ? summary.profileNames.join(", ") : "미등록 분야";
    const limitations = summary.limitations.length ? summary.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "";
    return `
      <div class="quality-panel ${escapeHtml(summary.tone)}">
        <div>
          <span class="quality-label">추천 신뢰도</span>
          <strong>${escapeHtml(summary.level)}</strong>
        </div>
        <div>
          <span class="quality-label">인식한 분야</span>
          <strong>${escapeHtml(fields)}</strong>
        </div>
        ${limitations ? `<ul>${limitations}</ul>` : ""}
      </div>
    `;
  }

  function renderCounselingFit(lab, profiles) {
    return "";
  }

  function renderDataQualityFlags(lab) {
    const flags = lab.chatbotQualityFlags || [];
    if (!flags.length) return "";
    const labels = {
      representative_publications_need_review: "대표 논문 추가 확인",
      not_listed_in_2026_summer_intern_pdf: "인턴 자료 미등재",
      research_interests_missing: "연구 분야 결측",
      homepage_missing: "홈페이지 결측",
    };
    const badges = flags
      .map((flag) => `<span class="source-badge caution">${escapeHtml(labels[flag] || flag)}</span>`)
      .join("");
    return `<div class="quality-flags">${badges}</div>`;
  }

  function getProfileRecommendedSet(profiles) {
    const names = new Set();
    profiles.forEach((profile) => {
      (profile.recommended_professors || []).forEach((name) => names.add(name));
    });
    return names;
  }

  function uniqueResultLabs(results) {
    const seen = new Set();
    return results.filter(({ lab }) => {
      const key = lab.id || lab.professor || displayLabName(lab);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }


  function getLabSearchText(lab) {
    return normalize([
      lab.summary,
      (lab.topics || []).join(" "),
      (lab.keywords || []).join(" "),
      (lab.domainTags || []).join(" "),
      (lab.topKeywords || []).join(" "),
      (lab.pdfCourses || []).map((course) => course.evidence).join(" "),
      (lab.pdfInternships || []).map((item) => item.evidence).join(" "),
    ].join(" "));
  }

  function isGenericTag(tag) {
    return ["AI/머신러닝", "반도체/전자소자", "로봇/제어", "광학/이미징", "바이오/의생명", "화학/소재합성"].includes(String(tag || ""));
  }

  function shouldShowGenericTag(tag, query) {
    const q = normalize(query || "");
    const rules = {
      "AI/머신러닝": ["ai", "인공지능", "머신러닝", "딥러닝", "데이터", "컴퓨터비전", "생성형"],
      "반도체/전자소자": ["반도체", "소자", "전자", "공정", "메모리", "시스템반도체"],
      "로봇/제어": ["로봇", "제어", "모빌리티", "자율주행", "휴머노이드"],
      "광학/이미징": ["광학", "이미징", "영상", "디스플레이", "포토닉스", "광전"],
      "바이오/의생명": ["바이오", "의료", "헬스케어", "생체", "신경", "뇌"],
      "화학/소재합성": ["화학", "소재", "나노", "고분자", "합성", "촉매"],
    };
    return (rules[tag] || []).some((term) => q.includes(normalize(term)));
  }

  function getRelevantEvidenceTerms(lab, query, profiles) {
    const internalEvidenceTerms = dgistInternalEvidenceTerms(lab, query);
    if (internalEvidenceTerms.length) return internalEvidenceTerms;
    const rawTokens = expandTokens(tokenize(query || ""));
    const labText = getLabSearchText(lab);
    const terms = [];
    // 내부 seed 매칭 여부와 너무 넓은 대분류 태그는 사용자에게 노출하지 않습니다.
    const profileIds = new Set((profiles || []).map((profile) => profile.id));
    const evidenceStopTokens = new Set(["연구", "분야", "교수", "교수님", "추천", "적합", "검색", "science"]);
    const qTokens = rawTokens.filter((token) => token && !evidenceStopTokens.has(token));
    const genericEvidenceLabels = new Set([
      "AI/머신러닝", "반도체/전자소자", "로봇/제어", "광학/이미징", "바이오/의생명", "화학/소재합성",
      "배터리/에너지저장", "뇌/신경과학", "보안/암호/소프트웨어", "촉매/전기화학/CO2",
    ]);
    const brainOnlyEvidenceLabels = new Set(["신경과학", "뇌과학", "행동", "행동실험", "신경회로"]);
    const isBrainProfile = profileIds.has("basic_neuroscience") || profileIds.has("brain_disease_neural_circuit") || profileIds.has("brain_engineering_bci");

    const candidateTerms = unique([
      ...(lab.topics || []),
      ...(lab.keywords || []),
      ...(lab.topKeywords || []),
      ...((lab.pdfCourses || [])[0]?.courses || []),
      ...((lab.pdfInternships || [])[0]?.subjects || []),
    ]
      .map((item) => compact(cleanCoreResearchFieldText(lab, String(item || "")), 64))
      .filter((item) => item && !genericEvidenceLabels.has(item))
      .filter((item) => isBrainProfile || !brainOnlyEvidenceLabels.has(item)));

    qTokens.forEach((token) => {
      if (!token || token.length < 2) return;
      const readable = candidateTerms.find((term) => {
        const norm = normalize(term);
        return norm && (norm.includes(token) || token.includes(norm));
      });
      if (readable) terms.push(readable);
      else if (labText.includes(token)) terms.push(token);
    });

    const fieldEvidence = (profiles || []).flatMap((profile) => fieldEvidenceTerms[profile.id] || []);
    fieldEvidence.forEach((term) => {
      if (terms.length >= 6) return;
      const norm = normalize(term);
      if (norm && labText.includes(norm)) terms.push(term);
    });

    if (!terms.length) {
      terms.push(...unique((lab.topics || []).map((item) => compact(cleanCoreResearchFieldText(lab, item), 64))).slice(0, 3));
    }
    const finalStopTerms = new Set(["연구", "분야", "교수", "교수님", "추천", "적합"]);
    const finalTerms = unique(terms)
      .filter((term) => term && !finalStopTerms.has(term))
      .filter((term) => isBrainProfile || !brainOnlyEvidenceLabels.has(term));
    return finalTerms.slice(0, 5);
  }

  function getRelevantTags(lab, query) {
    const tags = [];
    (lab.domainTags || []).forEach((tag) => {
      if (!isGenericTag(tag) || shouldShowGenericTag(tag, query)) tags.push(tag);
    });
    (lab.topics || []).forEach((topic) => tags.push(cleanCoreResearchFieldText(lab, topic)));
    return unique(tags.map((tag) => compact(tag, 34)).filter(Boolean)).slice(0, 4);
  }

  function summarizeResultTags(results, query, profiles) {
    const q = normalize(query || "");
    const fromProfiles = unique((profiles || []).map((profile) => profile.field).filter(Boolean));
    if (fromProfiles.length) return fromProfiles.slice(0, 5);
    const tags = unique(results.flatMap(({ lab }) => getRelevantTags(lab, q))).slice(0, 5);
    return tags;
  }

  function renderDgistLabCard(item, index, query = "", profiles = [], maxScore = 1) {
    const lab = item.lab;
    const homepageUrl = lab.homepage || (lab.sourceUrls || []).find((url) => /^https?:\/\//i.test(url));
    const homepage = homepageUrl
      ? `<a class="action-link primary-link" href="${escapeHtml(homepageUrl)}" target="_blank" rel="noopener noreferrer">홈페이지 보기</a>`
      : `<span class="action-link disabled-link">홈페이지 없음</span>`;
    const rawFieldText = compact(lab.summary || (lab.topics || []).slice(0, 5).join(", ") || "연구분야 미기재", 260);
    const fieldText = compact(cleanCoreResearchFieldText(lab, rawFieldText), 240);
    const evidenceTerms = getRelevantEvidenceTerms(lab, query, profiles);
    const matchEvidence = evidenceTerms.join(", ");
    const tags = getRelevantTags(lab, query).map((tag) => `<span class="small-tag">${escapeHtml(tag)}</span>`).join("");
    const pubs = (lab.publications || []).slice(0, 2).map((title) => `<li>${escapeHtml(title)}</li>`).join("");
    return `
      <article class="lab-card dgist-result-card" data-lab-id="${escapeHtml(lab.id || "")}">
        <div class="lab-top">
          <div>
            <h3>${index + 1}. ${escapeHtml(formatProfessorName(lab.professor))}</h3>
            <div class="lab-meta">${escapeHtml(lab.department || "소속 미기재")} · ${escapeHtml(displayLabName(lab))}</div>
          </div>
        </div>
        <p class="note core-field"><strong>핵심 연구분야</strong> ${escapeHtml(fieldText)}</p>
        ${matchEvidence ? `<p class="note match-evidence"><strong>매칭 근거</strong> ${escapeHtml(compact(matchEvidence, 180))}</p>` : ""}
        <div class="tag-list compact-tags">${tags}</div>
        <div class="card-actions">
          ${homepage}
          ${renderInternshipAction(lab)}
          ${renderCourseAction(lab, index)}
        </div>
        ${pubs ? `
          <details class="card-details">
            <summary>관련 논문 보기</summary>
            <ul>${pubs}</ul>
          </details>
        ` : ""}
      </article>
    `;
  }

  function renderInternshipAction(lab) {
    if (!lab.pdfInternships.length) {
      return `<span class="action-link disabled-link">2026년 인턴 자료 기준 업무 데이터 없음</span>`;
    }
    const item = lab.pdfInternships[0];
    const bullets = internshipSubjects(item).slice(0, 8);
    const list = bullets.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const source = item.sourceTitle || item.sourceFile || "DGIST 인턴 자료";
    return `
      <details class="action-detail">
        <summary class="action-link">인턴 업무</summary>
        <div class="detail-panel">
          <p class="detail-title">이 연구실 인턴에서 할 수 있는 일</p>
          <p class="intern-caution"><strong>참고</strong> 아래 내용은 인턴 PDF 기반 안내입니다. 실제 인턴 업무는 연구실 상황, 모집 시기, 프로젝트 진행 상황에 따라 달라질 수 있으므로, 지원 전 교수님과 면담하거나 오픈랩에 참석해 실제 참여 가능 업무를 확인하는 것을 추천합니다.</p>
          <ul>${list || `<li>${escapeHtml(compact(repairInternshipText(item.evidence), 220))}</li>`}</ul>
          <p class="source-line">출처: ${escapeHtml(displaySourceFile(source))}${item.page ? `, p.${escapeHtml(item.page)}` : ""}</p>
        </div>
      </details>
    `;
  }

  function renderCourseAction(lab, index) {
    if (!lab.pdfCourses.length) {
      return `<span class="action-link disabled-link">2025년 추천 코스트리 기준 과목 데이터 없음</span>`;
    }
    const course = lab.pdfCourses[0];
    const fallbackCourse = cleanCourseName(compact(course.raw || course.evidence || "원문은 있으나 과목명이 구조화되지 않았음", 220));
    const cleanCourses = unique((course.courses || []).map(cleanCourseName).filter(Boolean));
    const items = cleanCourses.slice(0, 16).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const source = course.sourceTitle || course.sourceFile || "DGIST 추천과목 자료";
    return `
      <details class="action-detail">
        <summary class="action-link">추천 과목</summary>
        <div class="detail-panel">
          <ul class="course-chip-list">${items || `<li>${escapeHtml(fallbackCourse)}</li>`}</ul>
          <p class="source-line">출처: ${escapeHtml(displaySourceFile(source))}${course.page ? `, p.${escapeHtml(course.page)}` : ""}</p>
        </div>
      </details>
    `;
  }

  function buildCourseBlocks(results) {
    const blocks = results.map(({ lab }, index) => {
      if (!lab.pdfCourses.length) {
        return `
          <div class="course-card">
            <h4>${index + 1}. ${escapeHtml(displayLabName(lab))}</h4>
            <p><strong>${escapeHtml(formatProfessorName(lab.professor))}</strong> · ${escapeHtml(lab.department)}</p>
            <p class="muted">2025년 추천 코스트리 기준 추천 과목 데이터가 확인되지 않았습니다.</p>
          </div>
        `;
      }
      const course = lab.pdfCourses[0];
      const fallbackCourse = cleanCourseName(compact(course.raw || course.evidence || "원문은 있으나 과목명이 구조화되지 않았음", 220));
      const cleanCourses = unique(course.courses.map(cleanCourseName).filter(Boolean));
      const items = cleanCourses.slice(0, 14).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      return `
        <div class="course-card">
          <h4>${index + 1}. ${escapeHtml(displayLabName(lab))}</h4>
          <p><strong>${escapeHtml(formatProfessorName(lab.professor))}</strong> · ${escapeHtml(lab.department)}</p>
          <ul class="course-chip-list">${items || `<li>${escapeHtml(fallbackCourse)}</li>`}</ul>
        </div>
      `;
    });
    return `<div class="course-grid">${blocks.join("")}</div>`;
  }

  function renderInlineInternship(lab) {
    if (!lab.pdfInternships.length) {
      return `
        <p class="muted"><strong>이 연구실 인턴에서 할 수 있는 일</strong></p>
        <p class="muted">2026년 인턴 프로그램 PDF 기준 업무 데이터가 확인되지 않았습니다.</p>
      `;
    }
    const item = lab.pdfInternships[0];
    const bullets = internshipSubjects(item).slice(0, 5);
    const list = bullets.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    return `
      <p class="muted"><strong>이 연구실 인턴에서 할 수 있는 일</strong></p>
      <ul>${list || `<li>${escapeHtml(compact(repairInternshipText(item.evidence), 180))}</li>`}</ul>
    `;
  }

  function buildContactMail(query, lab) {
    const courseLine = lab.pdfCourses[0] ? unique(lab.pdfCourses[0].courses).slice(0, 4).join(", ") : "2025년 추천 코스트리 기준 과목 데이터가 확인되지 않았습니다";
    const internshipLine = lab.pdfInternships[0] ? compact(internshipSubjects(lab.pdfInternships[0]).slice(0, 2).join(" / "), 120) : "2026년 인턴 프로그램 PDF 기준 업무 데이터가 확인되지 않았습니다";
    return `제목: ${lab.labNameKo || lab.labNameEn} 연구실 인턴 및 진로 상담 문의드립니다.

교수님 안녕하세요.
저는 DGIST 학부생입니다. 현재 "${query}" 방향의 진로를 고민하고 있어 교수님 연구실에 관심을 갖게 되었습니다.

공개 자료를 확인해보니 ${lab.labNameKo || lab.labNameEn}에서는 ${compact(lab.summary || lab.topics.join(", "), 130)}와 관련된 연구를 수행하고 있었습니다. 또한 연구실별 추천 코스트리에서는 ${courseLine} 등을 확인했고, 인턴 자료에서는 ${internshipLine} 내용을 확인했습니다.

가능하다면 학부생이 준비하면 좋은 과목, 필요한 기초 역량, 인턴 또는 학부연구생 참여 가능성에 대해 짧게 조언을 구하고 싶습니다.

읽어주셔서 감사합니다.`;
  }

  function collectEvidence(results) {
    const evidence = [];
    results.forEach(({ lab }) => {
      lab.pdfCourses.slice(0, 2).forEach((item) => {
        evidence.push({
          kind: "추천과목",
          title: `${displayLabName(lab)} 추천수강과목`,
          sourceFile: item.sourceFile,
          page: item.page,
          text: item.raw || item.evidence,
        });
      });
      lab.pdfInternships.slice(0, 2).forEach((item) => {
        evidence.push({
          kind: "인턴 활동",
          title: `${displayLabName(lab)} 인턴 활동`,
          sourceFile: item.sourceFile,
          page: item.page,
          text: item.evidence,
        });
      });
      lab.sourceUrls.slice(0, 2).forEach((url) => {
        evidence.push({
          kind: "연구실/Scholar",
          title: `${displayLabName(lab)} 연구실 정보`,
          sourceFile: url,
          page: "",
          text: lab.summary || lab.topics.join(", "),
        });
      });
    });
    return evidence;
  }

  function renderSidePanels(results, evidence) {
    els.candidateCount.textContent = `${results.length}개`;
    els.candidateList.innerHTML = "";
    results.forEach(({ lab, score }) => {
      const max = Math.max(1, results[0].score);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "candidate-card";
      card.innerHTML = `
        <strong>${escapeHtml(displayLabName(lab))}</strong>
        <span>${escapeHtml(formatProfessorName(lab.professor))} · ${escapeHtml(lab.department)}</span>
        <div class="score-bar"><span style="width:${Math.min(100, Math.round((score / max) * 100))}%"></span></div>
        <span>과목근거 ${lab.pdfCourses.length} · 인턴근거 ${lab.pdfInternships.length}</span>
      `;
      card.addEventListener("click", () => showLabDetail(lab));
      els.candidateList.appendChild(card);
    });

    els.evidenceCount.textContent = `${evidence.length}개`;
    els.evidenceList.innerHTML = "";
    evidence.slice(0, 10).forEach((item) => {
      const card = document.createElement("div");
      card.className = "evidence-card";
      card.innerHTML = `
        <span class="source-badge">${escapeHtml(item.kind)}</span>
        <p><strong>${escapeHtml(item.title)}</strong></p>
        <p>${escapeHtml(polishProfessorWord(compact(item.text, 130)))}</p>
      `;
      els.evidenceList.appendChild(card);
    });
  }

  function renderEvidenceCards(evidence) {
    if (!evidence.length) return `<div class="empty-state">확인된 근거가 없어.</div>`;
    return evidence
      .map((item) => `
        <div class="evidence-card">
          <span class="source-badge">${escapeHtml(item.kind)}</span>
          <p><strong>${escapeHtml(item.title)}</strong></p>
          <p>${escapeHtml(polishProfessorWord(compact(item.text, 220)))}</p>
        </div>
      `)
      .join("");
  }

  function showLabDetail(lab) {
    els.goalInput.value = `${displayLabName(lab)} (${formatProfessorName(lab.professor)}) 연구실에 가려면 어떤 과목과 인턴 활동을 준비하면 좋을까?`;
    const result = [{ lab, score: 99 }];
    const answer = buildAnswer(els.goalInput.value, result, "full");
    renderSidePanels(result, answer.evidence);
    els.chatFeed.innerHTML = "";
    appendAssistantMessage(answer.html);
    lastAnswerText = answer.text;
  }

  function appendUserMessage(text) {
    const article = document.createElement("div");
    article.className = "message user";
    article.innerHTML = escapeHtml(text);
    els.chatFeed.appendChild(article);
    scrollChat();
  }

  function appendAssistantMessage(html) {
    const article = document.createElement("div");
    article.className = "message assistant";
    article.innerHTML = html;
    els.chatFeed.appendChild(article);
    scrollChat();
  }

  function replaceLastAssistantMessage(html) {
    const messages = [...els.chatFeed.querySelectorAll(".message.assistant")];
    const last = messages[messages.length - 1];
    if (last) last.innerHTML = html;
  }

  function scrollChat() {
    els.chatFeed.scrollTop = els.chatFeed.scrollHeight;
  }

  function copyAnswer() {
    if (!lastAnswerText) {
      toast("복사할 답변이 아직 없어.");
      return;
    }
    navigator.clipboard.writeText(lastAnswerText).then(() => toast("답변을 복사했어."));
  }

  function initialMessage() {
    return `
      <div class="message assistant">
        <h3>관심 분야를 입력해 주세요</h3>
        <p>대표 분야를 선택하거나, 세부 연구 키워드를 직접 입력해 주세요.</p>
      </div>
    `;
  }

  function tokenize(text) {
    return normalize(text)
      .split(/[^0-9a-zA-Z가-힣]+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 2 && !stopTokens.has(x));
  }

  function expandTokens(tokens) {
    const out = new Set(tokens);
    tokens.forEach((token) => {
      Object.entries(synonymMap).forEach(([key, values]) => {
        const hay = [key, ...values].map(normalize);
        if (hay.some((item) => item.includes(token) || token.includes(item))) {
          hay.forEach((item) => out.add(item));
        }
      });
    });
    return [...out];
  }

  function detectFieldProfiles(query) {
    const phrase = normalize(query);
    const matches = fieldProfiles.filter((profile) => {
      const aliases = [profile.field, ...(profile.aliases || [])].map(normalize).filter(Boolean);
      return aliases.some((alias) => profileAliasMatches(phrase, alias));
    });
    return suppressProfileConflicts(matches);
  }

  function suppressProfileConflicts(matches) {
    const ids = new Set(matches.map((profile) => profile.id));
    const suppressed = new Set();
    const rules = [
      ["solid_state_battery", "secondary_battery"],
      ["ai_system_semiconductor", "ai_machine_learning"],
      ["nlp_generative_ai", "ai_machine_learning"],
      /* beta: do not suppress broad memory_semiconductor for generic “차세대 메모리”. */
      ["display_optoelectronic_device", "semiconductor_device"],
    ];
    rules.forEach(([specific, generic]) => {
      if (ids.has(specific)) suppressed.add(generic);
    });
    if (ids.has("broad_electrical_electronics_research") && matches.some((profile) => profile.id !== "broad_electrical_electronics_research")) {
      suppressed.add("broad_electrical_electronics_research");
    }
    return matches.filter((profile) => !suppressed.has(profile.id));
  }

  function profileAliasMatches(phrase, alias) {
    if (!phrase || !alias || alias.length < 2) return false;
    if (phrase.includes(alias)) return true;
    const parts = alias.split(/\s+/).filter((part) => part.length >= 2);
    return parts.length >= 2 && parts.every((part) => phrase.includes(part));
  }

  function profileFitScore(lab, profiles, searchText) {
    if (!profiles.length) return { score: 0, confidence: 1, matchedTerms: 0 };
    let score = 0;
    let bestConfidence = 0;
    let matchedTerms = 0;
    profiles.forEach((profile) => {
      const terms = profileTerms(profile);
      const hits = terms.filter((term) => searchText.includes(term));
      matchedTerms += hits.length;
      const confidence = profileConfidence(profile, hits, searchText);
      bestConfidence = Math.max(bestConfidence, confidence);
      score += Math.min(180, hits.length * 34);
      if (confidence >= 1) score += 80;
      else if (confidence >= 0.65) score += 40;
    });
    if (matchedTerms === 0) score -= 70;
    return { score, confidence: bestConfidence, matchedTerms };
  }

  function profileTerms(profile) {
    const custom = fieldEvidenceTerms[profile.id] || [];
    const base = [profile.field, ...(profile.aliases || [])];
    return unique([...custom, ...base]
      .map(normalize)
      .filter((term) => term.length >= 3)
      .filter((term) => !stopTokens.has(term))
      .filter((term) => !/^(연구|분야|기반|교수|교수님|대학원|취업)$/.test(term)));
  }

  function profileConfidence(profile, hits, searchText) {
    if (!hits.length) return 0;
    if (profile.id === "computational_science_simulation") {
      const strong = [
        "시뮬레이션", "simulation", "simulations", "computational", "dft", "density functional", "first-principles", "first principles",
        "제일원리", "ab initio", "molecular dynamics", "분자동력학", "modeling", "modelling", "모델링", "theoretical model", "물질이론",
      ];
      const strongHits = hits.filter((hit) => strong.some((term) => hit.includes(normalize(term)) || searchText.includes(normalize(term))));
      if (strongHits.length >= 2) return 1;
      if (strongHits.length === 1) return 0.75;
      return 0.15;
    }
    if (hits.length >= 3) return 1;
    if (hits.length === 2) return 0.75;
    return 0.45;
  }

  function buildProfileBoosts(profiles) {
    const boosts = new Map();
    profiles.forEach((profile) => {
      (profile.recommended_professors || []).forEach((name, index) => {
        const boost = [420, 300, 220][index] || 120;
        boosts.set(name, (boosts.get(name) || 0) + boost);
      });
    });
    return boosts;
  }


  function hasAnyTerm(searchText, terms) {
    return terms.some((term) => searchText.includes(normalize(term)));
  }

  function hitCount(searchText, terms) {
    return terms.reduce((count, term) => count + (searchText.includes(normalize(term)) ? 1 : 0), 0);
  }

  function strictFieldPenalty(lab, profiles, searchText, profileBoosts, fit) {
    if (!profiles.length) return 0;
    const ids = new Set(profiles.map((profile) => profile.id));
    const dept = normalize(lab.department || "");
    const isSeed = profileBoosts.has(lab.professor);
    let penalty = 0;

    const requireTerms = (idsToCheck, terms, amount = 260) => {
      if (!idsToCheck.some((id) => ids.has(id))) return;
      if (!hasAnyTerm(searchText, terms) && !isSeed) penalty -= amount;
    };

    const requireStrongOrSeed = (idsToCheck, terms, amount = 220) => {
      if (!idsToCheck.some((id) => ids.has(id))) return;
      const hits = hitCount(searchText, terms);
      if (hits === 0) penalty -= amount;
      else if (hits === 1 && !isSeed) penalty -= Math.round(amount * 0.45);
    };

    requireStrongOrSeed(["ai_machine_learning"], [
      "artificial intelligence", "인공지능", "machine learning", "머신러닝", "deep learning", "딥러닝", "neural network", "federated learning", "on-device ai", "multi-modal learning", "prediction-planning", "computer vision", "robot vision", "generative ai", "large language model", "AI for Software Engineering",
    ], 300);
    if (ids.has("ai_machine_learning") && dept.includes("뇌과학과") && !isSeed) penalty -= 260;

    requireStrongOrSeed(["computer_vision"], [
      "computer vision", "컴퓨터비전", "vision", "image", "imaging", "영상", "slam", "visual", "object detection", "segmentation", "robot vision", "holography", "virtual staining", "3d vision", "3d scene", "scene understanding",
    ], 250);

    requireStrongOrSeed(["nlp_generative_ai"], [
      "nlp", "자연어처리", "large language model", "language model", "llm", "generative ai", "생성형", "multimodal modeling", "trustworthy ai",
    ], 320);
    if (ids.has("nlp_generative_ai") && !dept.includes("전기전자컴퓨터") && !isSeed) penalty -= 180;

    requireStrongOrSeed(["semiconductor_process"], [
      "semiconductor fabrication", "fabrication", "fab", "process", "공정", "박막", "thin film", "증착", "deposition", "식각", "etch", "lithography", "리소그래피", "micro/nano", "mems",
    ], 260);

    requireStrongOrSeed(["semiconductor_device", "ai_system_semiconductor", "memory_semiconductor"], [
      "semiconductor device", "전자소자", "반도체 소자", "transistor", "fet", "nanodevice", "neuromorphic", "rram", "mram", "memristor", "memory", "memory technologies", "in-memory", "computer architecture", "accelerator", "compute-in-memory", "pim",
    ], 240);

    if (ids.has("memory_semiconductor") && hasAnyTerm(searchText, ["learning and memory", "synaptic plasticity", "emotional memory"]) && !isSeed) penalty -= 360;

    requireStrongOrSeed(["display_optoelectronic_device"], [
      "display", "디스플레이", "optoelectronic", "광전자", "photodetector", "photo detector", "qled", "oled", "quantum dot", "transparent", "flexible", "photovoltaic", "solar cell",
    ], 260);

    requireStrongOrSeed(["secondary_battery", "solid_state_battery"], [
      "battery", "배터리", "전지", "리튬", "li-ion", "li metal", "전극", "electrode", "전해질", "electrolyte", "전고체", "solid-state", "solid state", "고체전해질", "energy storage",
    ], 300);

    requireStrongOrSeed(["security_cryptography"], [
      "cryptography", "암호", "security", "보안", "privacy enhancing", "post-quantum", "homomorphic", "blockchain", "secure", "critical infrastructure", "정보보호",
    ], 320);
    if (ids.has("security_cryptography") && !dept.includes("전기전자컴퓨터") && !isSeed) penalty -= 180;

    requireStrongOrSeed(["communication_network_6g"], [
      "communication", "communications", "wireless", "network", "6g", "signal processing", "transceiver", "antenna", "radio", "ofdm", "pam-4", "이더넷", "통신", "네트워크",
    ], 280);
    if (ids.has("communication_network_6g") && !dept.includes("전기전자컴퓨터") && !isSeed) penalty -= 240;

    requireStrongOrSeed(["biosensor", "biomedical_engineering"], [
      "biosensor", "bio sensor", "바이오센서", "bioelectronics", "biomedical", "의공학", "healthcare", "헬스케어", "wearable", "implantable", "sensing", "sensor", "neural recording", "medical", "의료",
    ], 260);

    requireStrongOrSeed(["general_robotics"], [
      "robot", "robots", "robotics", "로봇", "mobile robotics", "macro robots", "surgical robots", "wearable robots", "soft robotics", "physical ai", "manipulation", "autonomous navigation",
    ], 220);
    if (ids.has("general_robotics") && !dept.includes("로봇") && !isSeed) penalty -= 130;

    if (ids.has("basic_neuroscience") || ids.has("brain_disease_neural_circuit") || ids.has("brain_engineering_bci")) {
      const brainTerms = ["neuroscience", "신경과학", "brain", "뇌", "neural circuit", "신경회로", "synapse", "neuron", "neuromodulation", "cognitive", "behavior", "in-vivo", "mouse", "non-human primate", "bci", "brain-computer"];
      if (!hasAnyTerm(searchText, brainTerms) && !isSeed) penalty -= 300;
      if (!dept.includes("뇌과학과") && !isSeed && !ids.has("brain_engineering_bci")) penalty -= 180;
      if (ids.has("basic_neuroscience") && hasAnyTerm(searchText, ["simulation", "시뮬레이션", "computational", "dft"]) && !dept.includes("뇌과학과")) penalty -= 260;
    }

    return penalty;
  }

  function domainAdjustment(lab, profiles, searchText, profileBoosts, fit) {
    let score = 0;
    const profileIds = new Set(profiles.map((profile) => profile.id));
    if (profiles.length && fit && fit.matchedTerms === 0 && !profileBoosts.has(lab.professor)) {
      score -= 45;
    }
    const isBrainQuestion = profileIds.has("basic_neuroscience") || profileIds.has("brain_disease_neural_circuit") || searchText.includes("뇌과학");
    if (isBrainQuestion) {
      const isBrainDepartment = normalize(lab.department).includes("뇌과학과");
      if (isBrainDepartment) score += 140;
      if (!isBrainDepartment && !profileBoosts.has(lab.professor)) score -= 80;
    }
    const isBatteryQuestion = profileIds.has("secondary_battery") || profileIds.has("solid_state_battery");
    if (isBatteryQuestion) {
      const batteryTerms = ["배터리", "전지", "battery", "리튬", "li-ion", "li/na", "전극", "전해질", "전고체", "고체전해질", "energy storage"];
      const hasBatteryText = batteryTerms.some((term) => searchText.includes(normalize(term)));
      const isEnergyDepartment = normalize(lab.department).includes("에너지공학과");
      if (isEnergyDepartment && hasBatteryText) score += 120;
      if (!isEnergyDepartment && !profileBoosts.has(lab.professor)) score -= 160;
      const lastQuery = normalize(window.__lastDgistQueryForScoring || "");
      const isElectrolyteQuestion = dgistHas(lastQuery, ["전해질", "전해액", "고체전해질", "고체 전해질", "electrolyte", "solid electrolyte", "ion transport", "ionic conduction"]);
      if (isElectrolyteQuestion) {
        if (hasAnyTerm(searchText, ["electrolyte", "electrolytes", "solid electrolyte", "battery electrolyte", "전해질", "전해액", "고체전해질", "ion transport", "ionic conduction", "이온전도"])) score += 210;
        if (!hasAnyTerm(searchText, ["electrolyte", "electrolytes", "solid electrolyte", "battery electrolyte", "전해질", "전해액", "고체전해질", "ion transport", "ionic conduction", "이온전도"]) && !profileBoosts.has(lab.professor)) score -= 120;
      }
      if (profileIds.has("solid_state_battery")) {
        const solidStatePriority = {"김영규": 180, "김운혁": 135, "김진수": 90, "홍승태": 65, "이호춘": 30};
        score += solidStatePriority[lab.professor] || 0;
      }
    }
    if (profileIds.has("general_robotics")) {
      if (normalize(lab.department).includes("로봇")) score += 90;
      if (!normalize(lab.department).includes("로봇") && !profileBoosts.has(lab.professor)) score -= 100;
    }
    if (profileIds.has("memory_semiconductor")) {
      const memoryPriority = {"윤종혁": 150, "이효근": 130, "유천열": 95, "홍정일": 70, "박기성": 35};
      score += memoryPriority[lab.professor] || 0;
    }
    if (profileIds.has("computer_vision")) {
      const visionPriority = {"박대희": 120, "임성훈": 110, "배인환": 300, "문인규": 55, "김기섭": 55, "장진호": 40, "이병권": 35};
      score += visionPriority[lab.professor] || 0;
      if (lab.professor === "김기섭" && normalize(lab.department).includes("전기전자컴퓨터")) score -= 140;
    }
    return score;
  }

  function isRecommendableFaculty(lab) {
    if (excludedProfessorNames.has(lab.professor)) return false;
    const title = normalize(`${lab.title || ""} ${lab.category || ""}`);
    const hasProfessorTitle = /(교수|professor)/i.test(title);
    const isResearchStaff = /(책임연구원|선임연구원|수석연구원|연구원|researcher|principal researcher|senior researcher)/i.test(title);
    if (isResearchStaff && !hasProfessorTitle) return false;
    if (/(퇴임|명예)/.test(title)) return false;
    return true;
  }

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function searchableLabText(lab) {
    return normalize([
      lab.retrievalText,
      lab.summary,
      lab.topics.join(" "),
      lab.keywords.join(" "),
      (lab.domainTags || []).join(" "),
      (lab.topKeywords || []).join(" "),
      lab.pdfCourses.map((course) => course.evidence).join(" "),
      lab.pdfInternships.map((item) => item.evidence).join(" "),
    ].join(" "));
  }

  function countIncludes(text, token) {
    if (!token) return 0;
    const source = String(text || "");
    const needle = String(token || "");
    if (/^[a-z0-9]+$/i.test(needle) && needle.length <= 3) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return (source.match(new RegExp(`(^|[^a-z0-9])${escaped}(?=[^a-z0-9]|$)`, "gi")) || []).length;
    }
    let count = 0;
    let index = source.indexOf(needle);
    while (index !== -1) {
      count += 1;
      index = source.indexOf(needle, index + needle.length);
    }
    return count;
  }

  function extractPdfBullets(text) {
    const bullets = [];
    String(text || "")
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .forEach((line) => {
        if (/순번|연구실명|붙임|내용\(subject\)/.test(line)) return;
        if (/^\([가-힣]{2,5}\s*교수\)$/.test(line)) return;
        if (/(연구실|실험실|그룹)$/.test(line)) return;
        const startsBullet = /^[•\-]/.test(line);
        const cleaned = cleanInternshipSubjectLine(line);
        if (cleaned.length <= 5) {
          if (bullets.length && shouldMergeInternshipFragments(bullets[bullets.length - 1], cleaned)) {
            bullets[bullets.length - 1] = mergeInternshipFragments(bullets[bullets.length - 1], cleaned);
          }
          return;
        }
        if (startsBullet || bullets.length === 0) {
          bullets.push(cleaned);
        } else {
          bullets[bullets.length - 1] = mergeInternshipFragments(bullets[bullets.length - 1], cleaned);
        }
      });
    return normalizeInternshipSubjectLines(bullets).slice(0, 10);
  }

  function repairInternshipText(value) {
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      .replace(/^[•\-]\s*/gm, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\s+\)/g, ")")
      .replace(/\(\s+/g, "(")
      .replace(/([A-Za-z0-9\)])\s+(의|을|를|은|는|이|가|와|과|에서|에게|로|으로|에)(?=\s|$|[가-힣])/g, "$1$2")
      .replace(/(LLM|MLLM|VLM|VLA)\s+의/g, "$1의")
      .replace(/ability\s+를/g, "ability를")
      .replace(/application\s+에서/g, "application에서")
      .replace(/메모리\s*관\s*리/g, "메모리 관리")
      .replace(/의사결\s*정/g, "의사결정")
      .replace(/보\s*존/g, "보존")
      .replace(/검증\s*기\s*법/g, "검증 기법")
      .replace(/특성측\s*정/g, "특성측정")
      .replace(/연구n\b/g, "연구")
      .replace(/생성\/검증\s*에/g, "생성/검증에")
      .replace(/데이터셋\s*및\s*평가/g, "데이터셋 및 평가")
      .replace(/실시간\s+동작을\s+위한\s+Dual\s+system/g, "실시간 동작을 위한 Dual system")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function cleanInternshipSubjectLine(line) {
    return repairInternshipText(line);
  }

  function shouldMergeInternshipFragments(prev, next) {
    const previous = cleanInternshipSubjectLine(prev);
    const current = cleanInternshipSubjectLine(next);
    if (!previous || !current) return false;
    if (/[.!?。]$/.test(previous)) return false;
    const continuationStart = /^(정(?:\s|$|\s*시스템)|리(?:\s|$|\s*기법)|존(?:\s|$|과)|법(?:\s|$|\s*개발)|평가(?:\s|$|\s*프로토콜)|에\s*기반|Dual\s+system|프로토콜|기법|제작\s*및|실험|분석|메커니즘|셀평가|시스템\s*연구|개발|활용)/i.test(current);
    const previousIncomplete = /(의사결|메모리\s*관|데이터셋\s*및|검증\s*기|생성\/검증|위한|및|기반|에서\s*보|관|보|의|생리학적|전사체|행동학적|디지털|특성측|셀\s*조립,?|[,/]\s*)$/.test(previous);
    if (/^제작\s*및/i.test(current)) return true;
    if (continuationStart && (previousIncomplete || current.length <= 12)) return true;
    if (previousIncomplete && current.length <= 18) return true;
    return false;
  }

  function mergeInternshipFragments(prev, next) {
    return repairInternshipText(`${prev} ${next}`);
  }

  function normalizeInternshipSubjectLines(lines) {
    const merged = [];
    (lines || []).forEach((line) => {
      String(line || "")
        .split(/\n+/)
        .map((fragment) => fragment.trim())
        .filter(Boolean)
        .forEach((fragment) => {
          const cleaned = cleanInternshipSubjectLine(fragment);
          if (!cleaned) return;
          if (merged.length && shouldMergeInternshipFragments(merged[merged.length - 1], cleaned)) {
            merged[merged.length - 1] = mergeInternshipFragments(merged[merged.length - 1], cleaned);
          } else {
            merged.push(cleaned);
          }
        });
    });
    return unique(merged.map(repairInternshipText).filter(Boolean));
  }

  function internshipSubjects(item) {
    const subjects = normalizeInternshipSubjectLines(item.subjects || []);
    return subjects.length ? subjects : extractPdfBullets(item.evidence);
  }

  function formatProfessorName(name) {
    const value = String(name || "").trim();
    if (!value || value === "교수명 없음") return "교수님 정보 없음";
    if (/교수님$/.test(value)) return value;
    return `${value} 교수님`;
  }

  function polishProfessorWord(text) {
    return String(text || "")
      .replace(/([가-힣]{2,5})\s*교수(?!님)/g, "$1 교수님")
      .replace(/추천\s*교수(?!님)/g, "추천 교수님");
  }


  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function cleanCoreResearchFieldText(lab, text) {
    let value = polishProfessorWord(text || "연구분야 미기재").trim();
    const patterns = [];
    if (lab && lab.department && lab.professor) {
      patterns.push(new RegExp("^\\s*" + escapeRegExp(lab.department) + "\\s*" + escapeRegExp(lab.professor) + "\\s*교수(?:님)?\\s*연구실\\s*[:：-]\\s*", "i"));
    }
    if (lab && lab.professor) {
      patterns.push(new RegExp("^\\s*" + escapeRegExp(lab.professor) + "\\s*교수(?:님)?\\s*연구실\\s*[:：-]\\s*", "i"));
    }
    patterns.push(/^\s*[^:：]{0,90}(?:교수님?|연구실)\s*[:：-]\s*/);
    patterns.forEach((pattern) => {
      value = value.replace(pattern, "").trim();
    });
    return value || polishProfessorWord(text || "연구분야 미기재");
  }

  const dgistLabNameOverrides = {
    "physchem-002": "미래 반도체 나노포토닉스 연구실",
    "physchem-005": "극저온 원자 및 양자 시스템 설계 연구실",
    "physchem-007": "비대칭 유기합성 및 의약품 합성 연구실",
    "physchem-010": "반응 메커니즘 및 구조동역학 연구실",
    "physchem-013": "위상 양자소자 연구실",
    "physchem-016": "반도체 에너지 센서 연구실",
    "eecs-004": "지능형 로봇 제어 연구실(ARC Lab)",
    "eecs-029": "컴퓨터 비전 연구실(CV Lab)",
    "brain-006": "화학감각신경계 연구실",
    "brain-009": "뇌신호조절 연구실",
    "brain-015": "환경생명공학 연구실",
    "brain-018": "막단백질 구조세포생물학 연구실",
    "robot-004": "로봇 설계 및 제조 연구실",
    "robot-006": "신경인터페이스 및 마이크로시스템 연구실",
    "robot-010": "지능형 이미징 및 비전 시스템 연구실",
    "energy-001": "첨단 촉매 및 에너지 시스템 연구실(ACES Lab)"
  };

  function dgistIncompleteLabName(value, professor) {
    const name = String(value || "").replace(/\s+/g, " ").trim();
    const prof = String(professor || "").replace(/\s+/g, " ").trim();
    if (!name) return true;
    if (name === prof || name === `${prof} 교수님` || name === `${prof} 교수`) return true;
    if (/(?:및|and|&|·|\/)$/i.test(name)) return true;
    if (name === "반도체 에너지 컴퓨터 센서") return true;
    return false;
  }

  function dgistInternshipLabName(lab) {
    const item = (lab.pdfInternships || []).find((entry) => entry && entry.labNameRaw);
    if (!item) return "";
    return String(item.labNameRaw || "")
      .replace(/\([^)]*교수[^)]*\)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayLabName(lab) {
    if (!lab) return "연구실명 미등록";
    if (dgistLabNameOverrides[lab.id]) return dgistLabNameOverrides[lab.id];
    const courseKo = (lab.pdfCourses || []).map((item) => item && item.labNameKo).find((value) => !dgistIncompleteLabName(value, lab.professor));
    const internshipName = dgistInternshipLabName(lab);
    const candidates = [lab.labNameKo, courseKo, internshipName, lab.labNameEn]
      .map((value) => String(value || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const complete = candidates.find((value) => !dgistIncompleteLabName(value, lab.professor));
    return complete || "연구실명 미등록";
  }

  function cleanCourseName(value) {
    return String(value || "")
      .replace(/\s*\((?:이\s*,\s*공|공\s*,\s*이|이|공)\)\s*/g, " ")
      .replace(/\s*\(?\b[A-Z]{2,5}\s*-?\s*\d{3,4}\b\)?/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,/)])/g, "$1")
      .replace(/[(]\s*[)]/g, "")
      .trim();
  }

  function unique(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = normalize(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function compact(text, length) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    if (value.length <= length) return value;
    return value.slice(0, length - 1) + "…";
  }

  function displaySourceFile(value) {
    return String(value || "").replace(/하계\s*인턴/g, "인턴");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent.replace(/\n{3,}/g, "\n\n").trim();
  }

  function toast(text) {
    const node = document.createElement("div");
    node.textContent = text;
    node.style.position = "fixed";
    node.style.left = "50%";
    node.style.bottom = "20px";
    node.style.transform = "translateX(-50%)";
    node.style.background = "#172033";
    node.style.color = "#fff";
    node.style.padding = "10px 14px";
    node.style.borderRadius = "8px";
    node.style.boxShadow = "0 14px 40px rgba(23,32,51,.18)";
    node.style.zIndex = "99";
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1800);
  }


  // DGIST_FINAL_BETA_FIX_START: service reliability fixes without UI layout changes.
  const dgistProfileLabelMap = {
    semiconductor_process: "반도체/전자소자",
    semiconductor_device: "반도체/전자소자",
    ai_system_semiconductor: "AI/시스템반도체",
    memory_semiconductor: "메모리/반도체",
    spintronics_next_generation_memory: "메모리/스핀트로닉스",
    display_optoelectronic_device: "광학/디스플레이",
    secondary_battery: "배터리/에너지",
    solid_state_battery: "전고체전지",
    hydrogen_fuel_cell: "수소/연료전지",
    solar_renewable_energy: "태양전지/신재생에너지",
    nano_advanced_materials: "화학/소재/나노",
    wearable_flexible_electronics: "웨어러블/유연전자",
    biosensor: "바이오센서",
    biomedical_engineering: "바이오/의료/헬스케어",
    brain_engineering_bci: "뇌공학/BCI",
    basic_neuroscience: "뇌과학/신경과학",
    brain_disease_neural_circuit: "뇌질환/신경회로",
    ai_machine_learning: "AI/머신러닝",
    computer_vision: "컴퓨터비전",
    nlp_generative_ai: "생성형 AI/NLP",
    robot_control: "로봇 제어",
    autonomous_robot_mobility: "자율주행/모빌리티",
    humanoid_robot_mechanism: "휴머노이드/로봇 메커니즘",
    medical_rehabilitation_robot: "의료/재활로봇",
    embedded_iot: "임베디드/IoT",
    communication_network_6g: "통신/네트워크",
    security_cryptography: "보안/암호",
    quantum_computing_device: "양자컴퓨팅/양자소자",
    computational_science_simulation: "계산과학/시뮬레이션",
    broad_electrical_electronics_research: "전기전자 기반 연구",
    general_robotics: "로봇/로보틱스",
  };
  const dgistProfileById = new Map(fieldProfiles.map((profile) => [profile.id, profile]));

  function dgistProfilesByIds(ids) {
    return suppressProfileConflicts(unique(ids).map((id) => dgistProfileById.get(id)).filter(Boolean));
  }

  function dgistHas(q, terms) {
    return terms.some((term) => q.includes(normalize(term)));
  }

  function dgistManualFieldProfiles(query) {
    const q = normalize(query || "");
    if (!q) return [];
    const ids = [];

    if (dgistHas(q, ["전고체", "고체전해질", "고체 전해질", "solid-state", "solid state", "solid electrolyte", "sulfide electrolyte"])) ids.push("solid_state_battery");
    if (dgistHas(q, ["전해질", "전해액", "electrolyte", "electrolytes", "battery electrolyte", "양극재", "음극재", "분리막", "cathode", "anode", "separator", "interface", "계면"])) ids.push("secondary_battery");
    else if (dgistHas(q, ["배터리", "이차전지", "2차전지", "전지", "리튬", "lithium", "battery"])) ids.push("secondary_battery");
    if (dgistHas(q, ["수소", "연료전지", "수전해", "hydrogen", "fuel cell", "water splitting"])) ids.push("hydrogen_fuel_cell");
    if (dgistHas(q, ["태양전지", "신재생", "solar", "photovoltaic", "perovskite solar"])) ids.push("solar_renewable_energy");

    if (dgistHas(q, ["ai 반도체", "ai반도체", "시스템반도체", "시스템 반도체", "pim", "compute-in-memory", "neuromorphic", "가속기", "accelerator"])) ids.push("ai_system_semiconductor");
    if (dgistHas(q, ["메모리", "memory", "mram", "rram", "memristor", "비휘발성", "차세대 메모리"])) ids.push("memory_semiconductor");
    if (dgistHas(q, ["스핀트로닉스", "spintronics", "skyrmion", "자성 메모리"])) ids.push("spintronics_next_generation_memory");
    if (dgistHas(q, ["반도체 공정", "공정", "fab", "fabrication", "박막", "증착", "식각", "etch", "deposition", "lithography"])) ids.push("semiconductor_process");
    if (dgistHas(q, ["반도체 소자", "전자소자", "소자", "transistor", "fet", "nanodevice", "반도체"])) ids.push("semiconductor_device");
    if (q === "반도체" || q === "semiconductor") ids.push("semiconductor_process", "semiconductor_device");

    if (dgistHas(q, ["디스플레이", "광전자", "광전소자", "optoelectronic", "photodetector", "oled", "qled", "양자점", "quantum dot", "투명", "flexible display"])) ids.push("display_optoelectronic_device");
    if (dgistHas(q, ["양자컴퓨팅", "양자 컴퓨팅", "양자소자", "양자 소자", "큐비트", "qubit", "quantum computing", "quantum device"]) || q === "양자" || q === "quantum") ids.push("quantum_computing_device");
    if (dgistHas(q, ["계산과학", "시뮬레이션", "dft", "제일원리", "분자동역학", "분자동력학", "molecular dynamics", "computational", "modeling", "모델링"])) ids.push("computational_science_simulation");
    if (dgistHas(q, ["화학 소재", "신소재", "나노소재", "소재", "화학", "고분자", "합성", "촉매", "mof", "금속유기"])) ids.push("nano_advanced_materials");

    if (dgistHas(q, ["정보보안", "보안", "암호", "cryptography", "security", "privacy", "blockchain", "post-quantum", "정보보호"])) ids.push("security_cryptography");
    if (dgistHas(q, ["통신", "네트워크", "6g", "wireless", "antenna", "안테나", "communication"])) ids.push("communication_network_6g");
    if (dgistHas(q, ["임베디드", "iot", "embedded", "edge device", "저전력", "센서 네트워크"])) ids.push("embedded_iot");

    if (dgistHas(q, ["컴퓨터비전", "컴퓨터 비전", "3d 비전", "3d vision", "영상처리", "영상 인식", "이미지", "computer vision", "robot vision", "vision ai"])) ids.push("computer_vision");
    if (dgistHas(q, ["생성형 ai", "생성형", "llm", "large language model", "언어모델", "자연어", "nlp", "chatgpt"])) ids.push("nlp_generative_ai");
    if (dgistHas(q, ["인공지능", "머신러닝", "딥러닝", "데이터사이언스", "ai", "machine learning", "deep learning", "data science"])) ids.push("ai_machine_learning");

    if (dgistHas(q, ["바이오센서", "생체센서", "bio sensor", "biosensor"])) ids.push("biosensor");
    if (dgistHas(q, ["바이오", "의료", "헬스케어", "의생명", "biomedical", "medical", "healthcare"])) ids.push("biomedical_engineering");
    if (dgistHas(q, ["뇌공학", "bci", "brain-computer", "신경인터페이스", "neural interface"])) ids.push("brain_engineering_bci");
    if (dgistHas(q, ["뇌질환", "신경회로", "신경조절", "neuromodulation"])) ids.push("brain_disease_neural_circuit");
    if (dgistHas(q, ["뇌과학", "신경과학", "neuroscience", "neuron", "synapse"])) ids.push("basic_neuroscience");

    if (dgistHas(q, ["로봇 제어", "제어", "control", "manipulation", "actuator"])) ids.push("robot_control");
    if (dgistHas(q, ["자율주행", "모빌리티", "slam", "navigation", "localization", "autonomous", "mobility"])) ids.push("autonomous_robot_mobility");
    if (dgistHas(q, ["휴머노이드", "humanoid", "로봇 메커니즘", "robot mechanism", "로봇 설계"])) ids.push("humanoid_robot_mechanism");
    if (dgistHas(q, ["의료로봇", "재활로봇", "수술로봇", "wearable robot", "exoskeleton", "rehabilitation"])) ids.push("medical_rehabilitation_robot");
    if (dgistHas(q, ["로봇", "로보틱스", "robot", "robotics"])) ids.push("general_robotics");

    return dgistProfilesByIds(ids);
  }

  const dgistOriginalDetectFieldProfiles = detectFieldProfiles;
  detectFieldProfiles = function(query) {
    const manual = dgistManualFieldProfiles(query);
    if (manual.length) return manual;
    return suppressProfileConflicts(dgistOriginalDetectFieldProfiles(query));
  };

  function dgistDirectProfessorMatches(query) {
    const compactQuery = compactProfessorNameText(query);
    if (compactQuery.length < 2) return [];
    const exact = [];
    data.labs.filter(isRecommendableFaculty).forEach((lab) => {
      const names = [lab.professor, lab.professorEn].filter(Boolean);
      const hit = names.some((name) => {
        const compactName = compactProfessorNameText(name);
        return compactName.length >= 2 && (compactQuery === compactName || compactQuery.includes(compactName));
      });
      if (hit) exact.push({ lab, score: 7000 });
    });
    return dedupeResultsByProfessor(exact).slice(0, 5);
  }

  function dgistNoResultHtml(query) {
    return `<h3>조건에 적합한 후보를 찾지 못했습니다.</h3><p>현재 DGIST DB에서 <strong>${escapeHtml(query)}</strong>에 직접 연결되는 연구실을 찾지 못했습니다. 검색어를 조금 넓히거나 빠른 탐색용 대표 분야 버튼을 선택해 주세요.</p>`;
  }

  const dgistOriginalAnswerQuestion = answerQuestion;
  answerQuestion = function(mode, silent) {
    const query = els.goalInput.value.trim();
    if (!query) {
      toast("분야 버튼을 누르거나 관심 연구 키워드를 입력해 주세요.");
      els.goalInput.focus();
      return;
    }
    const nameMatches = dgistDirectProfessorMatches(query);
    const matchedProfiles = nameMatches.length ? [] : detectFieldProfiles(query);
    let results = [];
    if (nameMatches.length) {
      results = nameMatches;
    } else if (matchedProfiles.length) {
      const userProfileText = [state.grade, state.tracks.join(" "), state.interest].filter(Boolean).join(" ");
      results = rankLabs(`${query} ${userProfileText}`, query).slice(0, 40);
    }
    lastResults = results;
    const answer = buildAnswer(query, results, mode, matchedProfiles);
    renderSidePanels(results, answer.evidence);
    els.chatFeed.innerHTML = "";
    appendUserMessage(query);
    appendAssistantMessage(answer.html);
    lastAnswerText = answer.text;
    state.history.push({ query, at: new Date().toISOString() });
    state.history = state.history.slice(-20);
    persist();
  };


  function dgistVisibleByProfile(profile, item, maxScore) {
    const lab = item.lab;
    const labText = getConciseLabResearchText(lab);
    const dept = normalize(lab.department || "");
    const isSeed = (profile.recommended_professors || []).includes(lab.professor);
    const hits = fieldSpecificHitCount(profile.id, labText);
    if (isSeed && item.score >= 80) return true;
    const inEecs = dept.includes("전기전자컴퓨터");
    const inRobot = dept.includes("로봇");
    const inBrain = dept.includes("뇌과학");
    const inEnergy = dept.includes("에너지");
    const inPhysChem = dept.includes("화학물리");
    const inBioContext = inEecs || inRobot || inBrain;
    switch (profile.id) {
      case "semiconductor_process":
      case "semiconductor_device":
      case "memory_semiconductor":
      case "ai_system_semiconductor":
        return hits >= 3 && (inEecs || inRobot || inPhysChem) && item.score >= Math.max(130, maxScore * 0.12);
      case "communication_network_6g":
        return hits >= 3 && inEecs && item.score >= Math.max(120, maxScore * 0.12);
      case "embedded_iot":
        return hits >= 2 && inEecs && item.score >= Math.max(120, maxScore * 0.12);
      case "security_cryptography":
        return hits >= 2 && inEecs && item.score >= Math.max(120, maxScore * 0.12);
      case "ai_machine_learning":
      case "computer_vision":
      case "nlp_generative_ai":
        return hits >= 2 && (inEecs || inRobot) && item.score >= Math.max(130, maxScore * 0.12);
      case "general_robotics":
      case "robot_control":
      case "autonomous_robot_mobility":
      case "humanoid_robot_mechanism":
      case "medical_rehabilitation_robot":
        return hits >= 2 && inRobot && item.score >= Math.max(110, maxScore * 0.10);
      case "basic_neuroscience":
      case "brain_disease_neural_circuit":
      case "brain_engineering_bci":
        return hits >= 1 && (inBrain || inEecs) && item.score >= Math.max(110, maxScore * 0.10);
      case "secondary_battery":
      case "solid_state_battery":
      case "hydrogen_fuel_cell":
      case "solar_renewable_energy":
      case "nano_advanced_materials":
        return hits >= 2 && (inEnergy || inPhysChem) && item.score >= Math.max(100, maxScore * 0.10);
      case "biosensor":
      case "biomedical_engineering":
      case "wearable_flexible_electronics":
        return hits >= 2 && inBioContext && item.score >= Math.max(110, maxScore * 0.10);
      case "quantum_computing_device":
      case "computational_science_simulation":
        return hits >= 2 && item.score >= Math.max(110, maxScore * 0.10);
      default:
        return hits >= 2 && item.score >= Math.max(120, maxScore * 0.12);
    }
  }

  const dgistOriginalApplyVisibleRelevanceFilter = applyVisibleRelevanceFilter;
  applyVisibleRelevanceFilter = function(results, query, profiles) {
    if (!results.length) return [];
    const nameMatches = dgistDirectProfessorMatches(query);
    if (nameMatches.length) return nameMatches;
    if (!profiles.length) return [];
    const maxScore = Math.max(...results.map((item) => item.score), 1);
    const filtered = results.filter((item) => (profiles || []).some((profile) => dgistVisibleByProfile(profile, item, maxScore)));
    // 첫 화면은 TOP 5만 보여주되, 관련 후보가 더 있으면 관련도 순서대로 더 볼 수 있게 보관합니다.
    return dedupeResultsByProfessor(filtered).slice(0, 15);
  };

  buildAnswer = function(query, results, mode, matchedProfiles) {
    const nameMatches = dgistDirectProfessorMatches(query);
    const visibleResults = nameMatches.length ? nameMatches : applyVisibleRelevanceFilter(results, query, matchedProfiles || []);
    const top = visibleResults.slice(0, 5);
    if (!top.length) {
      const html = dgistNoResultHtml(query);
      return { html, text: stripHtml(html), evidence: [] };
    }
    const evidence = collectEvidence(top);
    if (mode === "evidence") {
      const html = `<p>아래는 답변에 사용할 수 있는 핵심 근거야.</p>${renderEvidenceCards(evidence)}`;
      return { html, text: stripHtml(html), evidence };
    }
    const tagSummary = summarizeResultTags(top, query, matchedProfiles || []);
    const maxScore = Math.max(...visibleResults.map((item) => item.score), 1);
    const labCards = visibleResults.map((item, index) => {
      const card = renderDgistLabCard(item, index, query, matchedProfiles || [], maxScore);
      return index < 5 ? card : `<div class="dgist-extra-result is-hidden">${card}</div>`;
    }).join("");
    const extraCount = Math.max(0, visibleResults.length - 5);
    const moreButton = extraCount
      ? `<div class="dgist-more-results-wrap"><button type="button" class="ghost-button dgist-more-results-button">관련 교수님 ${Math.min(5, extraCount)}분 더보기</button></div>`
      : "";
    const html = `
      <h3>추천 결과</h3>
      <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 우선 확인할 만한 교수님입니다.</p>
      <p class="result-tags">주요 적합 분야: ${tagSummary.map(escapeHtml).join(", ") || "입력 키워드 기반"}</p>
      <div class="card-list top-results">${labCards}</div>
      ${moreButton}
    `;
    return { html, text: stripHtml(html), evidence };
  };

  function dgistFriendlyProfileLabel(profile) {
    return dgistProfileLabelMap[profile.id] || profile.field || "입력 키워드 기반";
  }

  summarizeResultTags = function(results, query, profiles) {
    const labels = unique((profiles || []).map(dgistFriendlyProfileLabel).filter(Boolean));
    if (labels.length) return labels.slice(0, 3);
    return ["입력 키워드 기반"];
  };

  function dgistProfileAppliesToLab(profile, lab, labText) {
    const isSeed = (profile.recommended_professors || []).includes(lab.professor);
    const hits = fieldSpecificHitCount(profile.id, labText);
    return isSeed || hits >= 1;
  }

  getRelevantTags = function(lab, query) {
    const profiles = detectFieldProfiles(query || "");
    const labText = getConciseLabResearchText(lab);
    const tags = [];
    profiles.forEach((profile) => {
      if (dgistProfileAppliesToLab(profile, lab, labText)) tags.push(dgistFriendlyProfileLabel(profile));
    });
    if (!tags.length) {
      (lab.topics || []).slice(0, 4).forEach((topic) => tags.push(cleanCoreResearchFieldText(lab, topic)));
    }
    return unique(tags.map((tag) => compact(tag, 34)).filter(Boolean)).slice(0, 4);
  };

  getRelevantEvidenceTerms = function(lab, query, profiles) {
    const activeProfiles = (profiles && profiles.length) ? profiles : detectFieldProfiles(query || "");
    const labText = getLabSearchText(lab);
    const terms = [];
    const stop = new Set(["연구", "분야", "교수", "교수님", "추천", "적합", "검색", "science", "ai"]);

    activeProfiles.forEach((profile) => {
      const evidenceTerms = fieldEvidenceTerms[profile.id] || [];
      evidenceTerms.forEach((term) => {
        if (terms.length >= 5) return;
        const norm = normalize(term);
        if (!norm || norm.length < 2 || stop.has(norm)) return;
        if (dgistGlossaryContainsTerm(labText, norm)) terms.push(term);
      });
    });

    const qTokens = expandTokens(tokenize(query || "")).filter((token) => token.length >= 2 && !stopTokens.has(token));
    const candidateTerms = unique([
      ...(lab.topics || []),
      ...((lab.pdfInternships || [])[0]?.subjects || []),
      ...(lab.keywords || []).slice(0, 16),
    ].map((item) => compact(cleanCoreResearchFieldText(lab, String(item || "")), 72)).filter(Boolean));

    qTokens.forEach((token) => {
      if (terms.length >= 5) return;
      const matched = candidateTerms.find((term) => {
        const norm = normalize(term);
        return norm && norm.length >= 2 && (dgistGlossaryContainsTerm(norm, token) || dgistGlossaryContainsTerm(token, norm));
      });
      if (matched) terms.push(matched);
    });

    if (!terms.length) {
      terms.push(...candidateTerms.slice(0, 3));
    }
    const normalizedQuery = normalize(query || "");
    return unique(terms)
      .filter((term) => term && !/개론|과목|실험|일반|기초|수업/.test(term))
      .filter((term) => {
        const normalizedTerm = normalize(term);
        if (normalizedTerm === "ct" && !dgistGlossaryContainsTerm(normalizedQuery, "ct")) return false;
        return true;
      })
      .filter((term) => term.length > 1)
      .slice(0, 5);
  };




  // DGIST_DETAILED_QA_FIX_BEGIN
  // 세부 한글 키워드가 넓은 배터리, 에너지 키워드에 묻히지 않도록 검색용 보정만 추가합니다.
  const dgistFineQueryGroups = {
    electrolyte: {
      query: ["전해질", "전해액", "고체전해질", "고체 전해질", "electrolyte", "electrolytes", "solid electrolyte", "ion transport", "ionic conduction"],
      evidence: ["전해질", "전해액", "electrolyte", "electrolytes", "battery electrolyte", "li-ion battery electrolytes", "solid electrolyte", "solid-state electrolyte", "polymer electrolyte", "sulfide electrolyte", "oxide electrolyte", "ionics", "ion transport", "ionic conduction", "이온전도", "이온수송"],
      priorities: {"이호춘": 900, "홍승태": 260, "김영규": 170, "김운혁": 120},
      label: "전해질"
    },
    cathode: {
      query: ["양극재", "양극 소재", "양극활물질", "양극", "cathode", "cathode material", "positive electrode"],
      evidence: ["양극재", "양극 소재", "양극소재", "양극활물질", "cathode", "cathode material", "cathode materials", "positive electrode", "cathode composite", "층상계 양극", "양극", "전고체 전지 용 양극소재"],
      priorities: {"김운혁": 520, "김진수": 430, "홍승태": 300, "김영규": 120},
      label: "양극재"
    },
    anode: {
      query: ["음극재", "음극 소재", "음극", "anode", "anode material", "negative electrode", "리튬금속 음극", "실리콘 음극"],
      evidence: ["음극재", "음극 소재", "음극소재", "음극", "anode", "anode material", "negative electrode", "li metal", "lithium metal", "lithium metal anode", "silicon anode", "전고체 전지 용 양극소재, 음극소재", "신규 전극"],
      priorities: {"김운혁": 420, "이호춘": 230, "홍승태": 180},
      label: "음극재"
    },
    separator: {
      query: ["분리막", "separator", "battery separator", "membrane", "멤브레인"],
      evidence: ["분리막", "separator", "separators", "battery separator", "membrane", "membranes", "멤브레인", "분리막 기술", "에너지 절감형 분리막"],
      priorities: {"박치영": 520, "상가라쥬 샨무감": 220},
      label: "분리막"
    },
    interface: {
      query: ["계면", "계면반응", "계면 안정화", "interface", "interphase", "sei", "cei"],
      evidence: ["계면", "계면반응", "계면 안정화", "interface", "interfaces", "interfacial", "interphase", "solid electrolyte interphase", "sei", "cei", "unstable interfaces", "전극 계면", "전해질 계면", "electrochemical interfaces"],
      priorities: {"김영규": 650, "이태훈": 330, "김운혁": 230, "김진수": 140},
      label: "계면"
    },
    quantum: {
      query: ["양자", "양자컴퓨팅", "양자 컴퓨팅", "양자소자", "양자 소자", "quantum", "quantum computing", "quantum device", "qubit"],
      evidence: ["양자", "양자컴퓨팅", "양자소자", "quantum", "quantum computing", "quantum device", "quantum devices", "quantum transport", "quantum optics", "qubit", "양자수송", "양자광학"],
      priorities: {"김영욱": 440, "권상일": 360, "김아람": 260, "한상윤": 210},
      label: "양자"
    },
    medicalImaging: {
      query: ["의료영상", "의료 영상", "medical imaging", "biomedical imaging", "초음파", "ultrasound", "mri", "ct", "x-ray"],
      evidence: ["의료영상", "medical imaging", "biomedical imaging", "ultrasound", "초음파", "mri", "fmri", "ct", "computed tomography", "x-ray", "imaging"],
      priorities: {"장진호": 460, "문인규": 300, "이병권": 180},
      label: "의료영상"
    },
    hydrogen: {
      query: ["수소", "수전해", "연료전지", "hydrogen", "water electrolysis", "fuel cell", "water splitting"],
      evidence: ["수소", "수전해", "연료전지", "hydrogen", "water electrolysis", "fuel cell", "fuel cells", "water splitting", "hydrogen production", "pemfc", "electrolyser", "전기촉매"],
      priorities: {"상가라쥬 샨무감": 580, "위태웅": 260},
      label: "수소"
    },
    solar: {
      query: ["태양전지", "solar cell", "photovoltaic", "perovskite solar", "페로브스카이트 태양전지", "광전변환"],
      evidence: ["태양전지", "solar cell", "solar cells", "photovoltaic", "perovskite", "perovskite solar", "광전변환", "신재생에너지"],
      priorities: {"고서진": 420, "이종수": 320, "이윤구": 260},
      label: "태양전지"
    }
  };

  function dgistQueryMatchesGroup(query, group) {
    const q = normalize(query || "");
    return (group.query || []).some((term) => q.includes(normalize(term)));
  }

  function dgistActiveFineGroups(query) {
    return Object.entries(dgistFineQueryGroups)
      .filter(([, group]) => dgistQueryMatchesGroup(query, group))
      .map(([id, group]) => ({ id, ...group }));
  }

  function dgistFineHitCount(text, group) {
    const source = normalize(text || "");
    return (group.evidence || []).reduce((count, term) => count + (source.includes(normalize(term)) ? 1 : 0), 0);
  }

  function dgistFineReadableTerms(lab, query) {
    const labText = getLabSearchText(lab);
    const groups = dgistActiveFineGroups(query);
    const terms = [];
    groups.forEach((group) => {
      const preferred = [group.label, ...group.evidence];
      const hasEvidence = preferred.some((term) => labText.includes(normalize(term)));
      if (hasEvidence) terms.push(group.label);
      preferred.forEach((term) => {
        if (terms.length >= 6) return;
        const norm = normalize(term);
        if (norm && labText.includes(norm)) terms.push(term);
      });
    });
    return unique(terms).slice(0, 6);
  }

  const dgistDetailedOriginalRankLabs = rankLabs;
  rankLabs = function(query, profileQuery) {
    const groups = dgistActiveFineGroups(query || "");
    const ranked = dgistDetailedOriginalRankLabs(query, profileQuery);
    if (!groups.length) return ranked;
    return ranked.map((item) => {
      const labText = getLabSearchText(item.lab);
      let extra = 0;
      groups.forEach((group) => {
        const hits = dgistFineHitCount(labText, group);
        const priority = (group.priorities || {})[item.lab.professor] || 0;
        if (hits > 0) extra += Math.min(520, hits * 95) + priority;
        else if (priority > 0) extra += Math.round(priority * 0.45);
        // 세부 질문에서 넓은 배터리 키워드만 가진 연구실이 앞서는 것을 방지합니다.
        if (["electrolyte", "cathode", "anode", "separator", "interface"].includes(group.id)) {
          const broadOnly = hasAnyTerm(labText, ["battery", "batteries", "배터리", "전지", "리튬", "li-ion", "energy storage"]);
          if (broadOnly && hits === 0 && !priority) extra -= 260;
          if (broadOnly && hits <= 1 && !priority) extra -= 120;
        }
        if (group.id === "quantum" && hits === 0 && !priority) extra -= 220;
        if ((group.id === "hydrogen" || group.id === "solar") && hits === 0 && !priority) extra -= 220;
      });
      return { ...item, score: item.score + extra };
    }).sort((a, b) => b.score - a.score);
  };

  const dgistDetailedOriginalApplyVisibleRelevanceFilter = applyVisibleRelevanceFilter;
  applyVisibleRelevanceFilter = function(results, query, profiles) {
    const nameMatches = dgistDirectProfessorMatches(query);
    if (nameMatches.length) return nameMatches;
    const groups = dgistActiveFineGroups(query || "");
    let visible = dgistDetailedOriginalApplyVisibleRelevanceFilter(results, query, profiles);
    if (groups.length) {
      visible = visible.filter((item) => {
        const text = getLabSearchText(item.lab);
        return groups.some((group) => dgistFineHitCount(text, group) > 0 || (group.priorities || {})[item.lab.professor]);
      });
    }
    const maxScore = Math.max(...visible.map((item) => item.score), 1);
    // 더보기 결과가 너무 느슨해지지 않도록 점수 차이가 큰 후보는 제거합니다.
    return visible.filter((item, index) => index < 5 || item.score >= Math.max(140, maxScore * 0.22)).slice(0, 10);
  };

  const dgistDetailedOriginalEvidenceTerms = getRelevantEvidenceTerms;
  getRelevantEvidenceTerms = function(lab, query, profiles) {
    const fineTerms = dgistFineReadableTerms(lab, query || "");
    const base = dgistDetailedOriginalEvidenceTerms(lab, query, profiles);
    return unique([...fineTerms, ...base])
      .filter((term) => term && !/개론|과목|실험|일반|기초|수업/.test(term))
      .slice(0, 5);
  };

  function dgistMergeLabsForProfessor(labs) {
    if (!labs.length) return null;
    const base = { ...labs[0] };
    const all = (field) => unique(labs.flatMap((lab) => Array.isArray(lab[field]) ? lab[field] : (lab[field] ? [lab[field]] : [])));
    base.department = unique(labs.map((lab) => lab.department).filter(Boolean)).join(", ");
    base.labNameKo = unique(labs.map((lab) => lab.labNameKo).filter(Boolean)).join(", ") || base.labNameKo;
    base.labNameEn = unique(labs.map((lab) => lab.labNameEn).filter(Boolean)).join(", ") || base.labNameEn;
    base.topics = all("topics");
    base.keywords = all("keywords");
    base.topKeywords = all("topKeywords");
    base.domainTags = all("domainTags");
    base.publications = all("publications");
    base.pdfCourses = labs.flatMap((lab) => lab.pdfCourses || []);
    base.pdfInternships = labs.flatMap((lab) => lab.pdfInternships || []);
    base.sourceUrls = unique(labs.flatMap((lab) => [lab.homepage, ...(lab.sourceUrls || [])].filter(Boolean)));
    const homeCandidates = base.sourceUrls.filter((url) => /^https?:\/\//i.test(url));
    base.homepage = homeCandidates.find((url) => /sites\.google|base\.dgist|lab|github|kaist|postech|snu/i.test(url)) || homeCandidates[0] || base.homepage;
    const topicSummary = base.topics.slice(0, 6).join(", ");
    base.summary = `${base.professor} 교수 연구실: ${topicSummary || labs.map((lab) => lab.summary).filter(Boolean).join(" / ")}`;
    base.retrievalText = labs.map((lab) => lab.retrievalText || lab.summary || "").join("\n");
    return base;
  }

  dgistDirectProfessorMatches = function(query) {
    const compactQuery = compactProfessorNameText(query);
    if (compactQuery.length < 2) return [];
    const groups = new Map();
    data.labs.filter(isRecommendableFaculty).forEach((lab) => {
      const names = [lab.professor, lab.professorEn].filter(Boolean);
      const hit = names.some((name) => {
        const compactName = compactProfessorNameText(name);
        return compactName.length >= 2 && (compactQuery === compactName || compactQuery.includes(compactName));
      });
      if (!hit) return;
      if (!groups.has(lab.professor)) groups.set(lab.professor, []);
      groups.get(lab.professor).push(lab);
    });
    return [...groups.values()].map((labs) => ({ lab: dgistMergeLabsForProfessor(labs), score: 7000 })).slice(0, 5);
  };

  function dgistMergeCourses(courses) {
    const merged = [];
    (courses || []).forEach((raw) => {
      const item = cleanCourseName(raw);
      if (!item) return;
      if (/^\(.+\)$/.test(item) && merged.length) {
        merged[merged.length - 1] = `${merged[merged.length - 1]}${item}`;
      } else if (/^(?:이론|실습|이론\/실습|실습\/이론)$/.test(item) && merged.length) {
        merged[merged.length - 1] = `${merged[merged.length - 1]}(${item})`;
      } else {
        merged.push(item);
      }
    });
    return unique(merged.map((item) => item.replace(/\s+\(/g, "(").replace(/\)\s+$/g, ")")));
  }

  const dgistDetailedOriginalRenderCourseAction = renderCourseAction;
  renderCourseAction = function(lab, index) {
    if (!lab.pdfCourses.length) {
      return `<span class="action-link disabled-link">2025년 추천 코스트리 기준 과목 데이터 없음</span>`;
    }
    const course = lab.pdfCourses[0];
    const rawList = course.courses || [];
    const cleanCourses = dgistMergeCourses(rawList);
    const fallbackCourse = cleanCourseName(compact(course.raw || course.evidence || "원문은 있으나 과목명이 구조화되지 않았음", 220));
    const items = cleanCourses.slice(0, 16).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const source = course.sourceTitle || course.sourceFile || "DGIST 추천과목 자료";
    return `
      <details class="action-detail">
        <summary class="action-link">추천 과목</summary>
        <div class="detail-panel">
          <ul class="course-chip-list">${items || `<li>${escapeHtml(fallbackCourse)}</li>`}</ul>
          <p class="source-line">출처: ${escapeHtml(displaySourceFile(source))}${course.page ? `, p.${escapeHtml(course.page)}` : ""}</p>
        </div>
      </details>
    `;
  };

  function dgistMergeContinuationLines(lines) {
    const result = [];
    (lines || []).forEach((raw) => {
      let line = String(raw || "").replace(/^[•\-]\s*/, "").trim();
      if (!line) return;
      const shouldAppend = result.length && (
        /^[),및와과가-힣A-Za-z0-9]/.test(line) && /[,/·및와과]$/.test(result[result.length - 1]) ||
        /^(?:셀평가|분리|개발|화|분석|제작|평가|최적화|개선|연구|기술|폼 기술|시스템|플랫폼)/.test(line)
      );
      if (shouldAppend) result[result.length - 1] = `${result[result.length - 1]} ${line}`;
      else result.push(line);
    });
    return unique(result.map((line) => line.replace(/\s{2,}/g, " ").trim())).slice(0, 10);
  }

  const dgistDetailedOriginalInternshipSubjects = internshipSubjects;
  internshipSubjects = function(item) {
    const subjects = dgistMergeContinuationLines((item.subjects || []).map((line) => String(line || "")));
    return subjects.length ? subjects : dgistMergeContinuationLines(extractPdfBullets(item.evidence));
  };

  function dgistIsLikelyPublication(title) {
    const t = String(title || "").toLowerCase();
    if (!t.trim()) return false;
    if (/dgist scholar|recent submission|submission|patent|research submission|홈페이지|목록|latest publications/.test(t)) return false;
    return /\b(19|20)\d{2}\b|journal|nature|science|acs|adv\.|angew|chem|phys|nano|mater|energy|cell|ieee|acm|robot|conference|neurips|cvpr|icml|iclr|aaai|siggraph|acl|emnlp|j\. |doi|proceedings|transactions/i.test(title);
  }

  const dgistDetailedOriginalRenderCard = renderDgistLabCard;
  renderDgistLabCard = function(item, index, query = "", profiles = [], maxScore = 1) {
    const oldPublications = item.lab.publications;
    item.lab.publications = (oldPublications || []).filter(dgistIsLikelyPublication);
    const html = dgistDetailedOriginalRenderCard(item, index, query, profiles, maxScore);
    item.lab.publications = oldPublications;
    return html;
  };

  const dgistDetailedOriginalSummarizeTags = summarizeResultTags;
  summarizeResultTags = function(results, query, profiles) {
    const groups = dgistActiveFineGroups(query || "");
    if (groups.length) return unique(groups.map((group) => group.label)).slice(0, 3);
    const q = normalize(query || "");
    if (dgistHas(q, ["수소", "연료전지", "수전해", "hydrogen", "fuel cell"])) return ["수소/연료전지"];
    if (dgistHas(q, ["태양전지", "solar cell", "photovoltaic"])) return ["태양전지"];
    if (dgistHas(q, ["양자", "quantum"])) return ["양자컴퓨팅/양자소자"];
    return dgistDetailedOriginalSummarizeTags(results, query, profiles).slice(0, 2);
  };

  // DGIST_DETAILED_QA_FIX_END



  // DGIST_DETAILED_QA_POST_FIX_BEGIN
  // 대표 버튼에는 양자가 있으므로 사용자가 짧게 "양자"라고 입력해도 같은 분야로 인식되게 보정합니다.
  const dgistDetailedPreviousDetectFieldProfiles = detectFieldProfiles;
  detectFieldProfiles = function(query) {
    let profiles = dgistDetailedPreviousDetectFieldProfiles(query);
    const q = normalize(query || "");
    const active = dgistActiveFineGroups(q);
    const activeIds = new Set(active.map((group) => group.id));
    if (activeIds.has("quantum") && !profiles.some((profile) => profile.id === "quantum_computing_device")) {
      const quantumProfile = dgistProfileById.get("quantum_computing_device");
      if (quantumProfile) profiles = [...profiles, quantumProfile];
    }
    // 태양전지, 수소처럼 "전지"나 "에너지" 단어가 포함된 분야에서 배터리 태그가 같이 뜨는 것을 줄입니다.
    if (activeIds.has("solar") || activeIds.has("hydrogen")) {
      profiles = profiles.filter((profile) => !["secondary_battery", "solid_state_battery"].includes(profile.id));
      if (activeIds.has("solar") && !profiles.some((profile) => profile.id === "solar_renewable_energy")) {
        const solarProfile = dgistProfileById.get("solar_renewable_energy");
        if (solarProfile) profiles = [...profiles, solarProfile];
      }
      if (activeIds.has("hydrogen") && !profiles.some((profile) => profile.id === "hydrogen_fuel_cell")) {
        const hydrogenProfile = dgistProfileById.get("hydrogen_fuel_cell");
        if (hydrogenProfile) profiles = [...profiles, hydrogenProfile];
      }
    }
    return suppressProfileConflicts(profiles);
  };

  const dgistDetailedPreviousGetRelevantTags = getRelevantTags;
  getRelevantTags = function(lab, query) {
    const groups = dgistActiveFineGroups(query || "");
    if (groups.length) {
      const labText = getLabSearchText(lab);
      const labels = groups
        .filter((group) => dgistFineHitCount(labText, group) > 0 || (group.priorities || {})[lab.professor])
        .map((group) => {
          if (group.id === "electrolyte") return "전해질";
          if (group.id === "cathode") return "양극재";
          if (group.id === "anode") return "음극재";
          if (group.id === "separator") return "분리막";
          if (group.id === "interface") return "계면";
          if (group.id === "quantum") return "양자컴퓨팅/양자소자";
          if (group.id === "hydrogen") return "수소/연료전지";
          if (group.id === "solar") return "태양전지";
          if (group.id === "medicalImaging") return "의료영상";
          return group.label;
        });
      if (labels.length) return unique(labels).slice(0, 3);
    }
    return dgistDetailedPreviousGetRelevantTags(lab, query).slice(0, 3);
  };

  const dgistDetailedPreviousSummarizeTags2 = summarizeResultTags;
  summarizeResultTags = function(results, query, profiles) {
    const groups = dgistActiveFineGroups(query || "");
    if (groups.length) {
      return unique(groups.map((group) => {
        if (group.id === "quantum") return "양자컴퓨팅/양자소자";
        if (group.id === "hydrogen") return "수소/연료전지";
        if (group.id === "solar") return "태양전지";
        if (group.id === "medicalImaging") return "의료영상";
        return group.label;
      })).slice(0, 3);
    }
    return dgistDetailedPreviousSummarizeTags2(results, query, profiles).slice(0, 2);
  };
  // DGIST_DETAILED_QA_POST_FIX_END



  // DGIST_INTENT_FIRST_ENGINE_PATCH_BEGIN
  // 새 내부 추천 DB가 실제 추천 결과를 지배하도록 연결부를 보강합니다.
  // 세부 intent가 감지되면 기존 fieldProfile, raw-text 점수보다 내부 positive/subfield/domain hit를 우선합니다.
  function dgistIntentFirstRecordTerms(rec) {
    const confidenceKeys = rec && rec.confidence_by_subfield && typeof rec.confidence_by_subfield === "object"
      ? Object.keys(rec.confidence_by_subfield).filter((key) => !/^(?:low|negative)$/i.test(String(rec.confidence_by_subfield[key] || "")))
      : [];
    return unique([
      ...dgistInternalArray(rec.primary_domains),
      ...dgistInternalArray(rec.secondary_domains),
      ...dgistInternalArray(rec.subfields),
      ...dgistInternalArray(rec.positive_queries),
      ...dgistInternalArray(rec.aliases_ko),
      ...dgistInternalArray(rec.aliases_en),
      ...dgistInternalArray(rec.query_intents),
      ...confidenceKeys
    ]);
  }

  function dgistIntentFirstDomainHits(lab, query) {
    const q = dgistInternalNorm(query || "");
    if (!q) return [];
    const records = dgistInternalRecordsForLab(lab);
    let hits = [];
    records.forEach((rec) => {
      hits.push(...dgistInternalTermHits(q, [
        ...dgistInternalArray(rec.primary_domains),
        ...dgistInternalArray(rec.secondary_domains),
        ...dgistInternalArray(rec.query_intents)
      ], { allowReverse: true }));
      const confidenceKeys = rec && rec.confidence_by_subfield && typeof rec.confidence_by_subfield === "object"
        ? Object.keys(rec.confidence_by_subfield).filter((key) => !/^(?:low|negative)$/i.test(String(rec.confidence_by_subfield[key] || "")))
        : [];
      hits.push(...dgistInternalTermHits(q, confidenceKeys, { allowReverse: true }));
    });
    return unique(hits).filter((term) => term && !dgistInternalIsBroadQuery(term));
  }

  function dgistIntentFirstQueryTerms(query) {
    const q = dgistInternalNorm(query || "");
    if (!q) return [];
    let hits = [];
    dgistInternalRecords().forEach((rec) => {
      hits.push(...dgistInternalTermHits(q, dgistIntentFirstRecordTerms(rec), { allowReverse: true }));
    });
    return unique(hits).filter((term) => term && !dgistInternalIsBroadQuery(term));
  }

  const dgistIntentFirstOriginalInternalScoreLab = dgistInternalScoreLab;
  dgistInternalScoreLab = function(lab, query) {
    const base = dgistIntentFirstOriginalInternalScoreLab(lab, query);
    const domainHits = dgistIntentFirstDomainHits(lab, query);
    if (domainHits.length) {
      base.positiveHits = unique([...domainHits, ...(base.positiveHits || [])]);
      base.strongHitCount = (base.strongHitCount || 0) + domainHits.length;
      base.specificity = Math.max(base.specificity || 0, Math.min(5, domainHits.length + 1));
      base.score = (base.score || 0) + domainHits.length * 980;
      base.blocked = false;
    }
    return base;
  };

  function dgistIntentFirstHasSpecificQuery(query) {
    const q = dgistInternalNorm(query || "");
    if (!q) return false;
    const fineGroups = (typeof dgistActiveFineGroups === "function") ? dgistActiveFineGroups(q) : [];
    if (fineGroups.length) return true;
    const terms = dgistIntentFirstQueryTerms(q);
    return terms.length > 0;
  }

  function dgistIntentFirstFineMatch(lab, query) {
    const groups = (typeof dgistActiveFineGroups === "function") ? dgistActiveFineGroups(query || "") : [];
    const text = getLabSearchText(lab);
    let score = 0;
    let hits = [];
    groups.forEach((group) => {
      const hitCount = dgistFineHitCount(text, group);
      const priority = (group.priorities || {})[lab.professor] || 0;
      if (hitCount > 0 || priority > 0) {
        hits.push(group.label);
        score += Math.min(1400, hitCount * 520) + Math.round(priority * 1.8);
      } else {
        score -= 520;
      }
    });
    return { score, hits: unique(hits), activeCount: groups.length };
  }

  function dgistIntentFirstSpecificScore(item, query) {
    const match = dgistInternalScoreLab(item.lab, query);
    const fine = dgistIntentFirstFineMatch(item.lab, query);
    const directName = dgistProfessorNameDirectMatchScore(item.lab, query);
    const strongInternal = (match.strongHitCount || 0) > 0 || (match.positiveHits || []).length > 0 || (match.subfieldHits || []).length > 0;
    const strongFine = fine.hits.length > 0;
    const specificHit = directName > 0 || strongInternal || strongFine;
    let score = directName > 0
      ? directName
      : (match.score || 0) * 3 + fine.score + Math.min(item.score || 0, 180);
    if (match.blocked) score -= 7200;
    if (!specificHit) score -= 8200;
    return { score, match, specificHit, fineHits: fine.hits };
  }

  const dgistIntentFirstPreviousRankLabs = rankLabs;
  rankLabs = function(query, profileQuery) {
    const ranked = dgistIntentFirstPreviousRankLabs(query, profileQuery);
    if (!dgistIntentFirstHasSpecificQuery(query || "")) return ranked;
    return ranked
      .map((item) => {
        const specific = dgistIntentFirstSpecificScore(item, query || "");
        return {
          ...item,
          score: specific.score,
          internalMatch: specific.match,
          _dgistIntentFirstSpecificHit: specific.specificHit,
          _dgistIntentFirstFineHits: specific.fineHits
        };
      })
      .filter((item) => item.score > 0 && item._dgistIntentFirstSpecificHit)
      .sort((a, b) => b.score - a.score || String(a.lab.professor).localeCompare(String(b.lab.professor), "ko"));
  };

  const dgistIntentFirstPreviousApplyVisibleRelevanceFilter = applyVisibleRelevanceFilter;
  applyVisibleRelevanceFilter = function(results, query, profiles) {
    const nameMatches = dgistDirectProfessorMatches(query);
    if (nameMatches.length) return nameMatches;
    if (dgistIntentFirstHasSpecificQuery(query || "")) {
      const specificResults = (results || [])
        .map((item) => {
          if (item._dgistIntentFirstSpecificHit) return item;
          const specific = dgistIntentFirstSpecificScore(item, query || "");
          return {
            ...item,
            score: specific.score,
            internalMatch: specific.match,
            _dgistIntentFirstSpecificHit: specific.specificHit,
            _dgistIntentFirstFineHits: specific.fineHits
          };
        })
        .filter((item) => item.score > 0 && item._dgistIntentFirstSpecificHit)
        .sort((a, b) => b.score - a.score || String(a.lab.professor).localeCompare(String(b.lab.professor), "ko"));
      return dedupeResultsByProfessor(specificResults).slice(0, 10);
    }
    return dgistIntentFirstPreviousApplyVisibleRelevanceFilter(results, query, profiles);
  };

  const dgistIntentFirstPreviousRelevantEvidenceTerms = getRelevantEvidenceTerms;
  getRelevantEvidenceTerms = function(lab, query, profiles) {
    const internalTerms = dgistInternalEvidenceTerms(lab, query || "");
    const fineTerms = (typeof dgistFineReadableTerms === "function") ? dgistFineReadableTerms(lab, query || "") : [];
    const base = dgistIntentFirstPreviousRelevantEvidenceTerms(lab, query, profiles);
    const normalizedQuery = normalize(query || "");
    return unique([...internalTerms, ...fineTerms, ...base])
      .filter((term) => term && !/개론|과목|실험|일반|기초|수업/.test(term))
      .filter((term) => {
        const normalizedTerm = normalize(term);
        if (normalizedTerm === "ct" && !dgistGlossaryContainsTerm(normalizedQuery, "ct")) return false;
        return !dgistInternalIsBroadQuery(term);
      })
      .slice(0, 5);
  };

  const dgistIntentFirstPreviousSummarizeTags = summarizeResultTags;
  summarizeResultTags = function(results, query, profiles) {
    if (dgistIntentFirstHasSpecificQuery(query || "")) {
      const tags = unique((results || []).flatMap((item) => {
        const terms = dgistInternalEvidenceTerms(item.lab, query || "");
        const fine = item._dgistIntentFirstFineHits || [];
        return [...fine, ...terms].filter((term) => term && !dgistInternalIsBroadQuery(term));
      }));
      if (tags.length) return tags.slice(0, 3);
    }
    return dgistIntentFirstPreviousSummarizeTags(results, query, profiles);
  };
  // DGIST_INTENT_FIRST_ENGINE_PATCH_END

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".dgist-more-results-button");
    if (!button) return;
    const scope = button.closest(".message.assistant") || document;
    const hiddenCards = [...scope.querySelectorAll(".dgist-extra-result.is-hidden")];
    const batch = hiddenCards.slice(0, 5);
    batch.forEach((node) => node.classList.remove("is-hidden"));
    const remaining = [...scope.querySelectorAll(".dgist-extra-result.is-hidden")].length;
    if (remaining > 0) {
      button.textContent = `관련 교수님 ${Math.min(5, remaining)}분 더보기`;
    } else {
      const wrap = button.closest(".dgist-more-results-wrap");
      if (wrap) wrap.remove();
    }
    if (batch[0]) batch[0].scrollIntoView({ behavior: "smooth", block: "start" });
  });



  // DGIST_TIERED_RESULT_DISPLAY_PATCH_START
  // 기본 결과는 직접 관련 교수만 표시하고, 직접 관련 더보기와 인접 분야 보기를 분리합니다.
  function dgistTieredQueryHasBioSensorIntent(query) {
    const q = normalize(query || "");
    return dgistHas(q, ["바이오센서", "생체센서", "생체전자", "생체 전자", "웨어러블 센서", "임플란터블", "이식형", "biosensor", "biosensors", "bioelectronics", "wearable sensor", "implantable", "electronic skin", "e-skin", "neural interface"]);
  }

  const dgistTieredPreviousDetectFieldProfiles = detectFieldProfiles;
  detectFieldProfiles = function(query) {
    let profiles = dgistTieredPreviousDetectFieldProfiles(query || "");
    if (dgistTieredQueryHasBioSensorIntent(query || "")) {
      const addIds = ["biosensor", "biomedical_engineering", "wearable_flexible_electronics"];
      addIds.forEach((id) => {
        const p = dgistProfileById.get(id);
        if (p && !profiles.some((profile) => profile.id === id)) profiles = [...profiles, p];
      });
    }
    return suppressProfileConflicts(profiles);
  };

  function dgistTieredProfessorKey(item) {
    return professorDedupKey(item);
  }

  function dgistTieredLabel(query, profiles) {
    const groups = (typeof dgistActiveFineGroups === "function") ? dgistActiveFineGroups(query || "") : [];
    if (groups.length) return unique(groups.map((group) => group.label)).slice(0, 2).join("/");
    const labels = unique((profiles || []).map(dgistFriendlyProfileLabel).filter(Boolean));
    if (labels.length) return labels.slice(0, 2).join("/");
    return "입력 분야";
  }

  function dgistTieredEnsureSpecificScore(item, query) {
    if (item && item._dgistIntentFirstSpecificHit !== undefined) return item;
    if (typeof dgistIntentFirstSpecificScore !== "function") return item;
    const specific = dgistIntentFirstSpecificScore(item, query || "");
    return {
      ...item,
      score: specific.score,
      internalMatch: specific.match,
      _dgistIntentFirstSpecificHit: specific.specificHit,
      _dgistIntentFirstFineHits: specific.fineHits
    };
  }

  function dgistTieredIsDirectByProfile(item, query, profiles, maxScore) {
    if (!(profiles || []).length) return false;
    return (profiles || []).some((profile) => dgistVisibleByProfile(profile, item, maxScore));
  }

  function dgistTieredDirectResults(results, query, profiles) {
    const nameMatches = dgistDirectProfessorMatches(query);
    if (nameMatches.length) {
      return nameMatches.map((item) => ({ ...item, relevanceTier: "A", _dgistTierReason: "교수명 직접 검색" }));
    }
    if (!(results || []).length) return [];
    const maxScore = Math.max(...(results || []).map((item) => item.score || 0), 1);
    let direct = [];
    if (dgistIntentFirstHasSpecificQuery(query || "")) {
      direct = (results || [])
        .map((item) => dgistTieredEnsureSpecificScore(item, query || ""))
        .filter((item) => item.score > 0 && item._dgistIntentFirstSpecificHit)
        .map((item) => {
          const match = item.internalMatch || dgistInternalScoreLab(item.lab, query || "");
          const isCore = (match.strongHitCount || 0) > 0 || (match.positiveHits || []).length > 0 || (item._dgistIntentFirstFineHits || []).length > 0;
          return { ...item, relevanceTier: isCore ? "A" : "B", _dgistTierReason: isCore ? "세부 키워드 직접 일치" : "같은 의도 내 직접 후보" };
        });
    } else if ((profiles || []).length) {
      direct = (results || [])
        .filter((item) => dgistTieredIsDirectByProfile(item, query, profiles || [], maxScore))
        .map((item) => ({ ...item, relevanceTier: "B", _dgistTierReason: "대표 분야 직접 후보" }));
    }
    const isBannerExploreInternalQuery = (typeof dgistIsBannerExploreInternalQuery === "function") && dgistIsBannerExploreInternalQuery(query || "");
    if ((isBannerExploreInternalQuery || !dgistIntentFirstHasSpecificQuery(query || "")) && (profiles || []).length) {
      const existingDirectKeys = new Set((direct || []).map(dgistTieredProfessorKey));
      (profiles || []).forEach((profile) => {
        (profile.recommended_professors || []).forEach((name, index) => {
          const lab = data.labs.find((candidate) => candidate && candidate.professor === name && isRecommendableFaculty(candidate));
          if (!lab) return;
          const key = dgistTieredProfessorKey({ lab });
          if (existingDirectKeys.has(key)) return;
          existingDirectKeys.add(key);
          const internalMatch = dgistInternalScoreLab(lab, query || "");
          const seedScore = Math.max(90, 230 - index * 16, internalMatch.score || 0);
          direct.push({ lab, score: seedScore, internalMatch, relevanceTier: "B", _dgistTierReason: "대표 분야 seed 후보" });
        });
      });
    }

    return dedupeResultsByProfessor(direct)
      .sort((a, b) => {
        const tierRank = { A: 2, B: 1, C: 0 };
        return (tierRank[b.relevanceTier || ""] || 0) - (tierRank[a.relevanceTier || ""] || 0)
          || (b.score || 0) - (a.score || 0)
          || String(a.lab.professor).localeCompare(String(b.lab.professor), "ko");
      })
      .slice(0, 25);
  }

  function dgistTieredAdjacentResults(results, directResults, query, profiles) {
    const directKeys = new Set((directResults || []).map(dgistTieredProfessorKey));
    if (!(results || []).length) return [];
    const maxScore = Math.max(...(results || []).map((item) => item.score || 0), 1);
    const groups = (typeof dgistActiveFineGroups === "function") ? dgistActiveFineGroups(query || "") : [];
    const adjacent = (results || [])
      .map((item) => dgistTieredEnsureSpecificScore(item, query || ""))
      .filter((item) => !directKeys.has(dgistTieredProfessorKey(item)))
      .filter((item) => {
        const lab = item.lab;
        const labText = getLabSearchText(lab);
        const conciseText = getConciseLabResearchText(lab);
        const internal = item.internalMatch || dgistInternalScoreLab(lab, query || "");
        const weakInternal = (internal.weakHits || []).length > 0 || (internal.positiveHits || []).length > 0 || (internal.subfieldHits || []).length > 0;
        const weakProfile = (profiles || []).some((profile) => {
          const isSeed = (profile.recommended_professors || []).includes(lab.professor);
          const hits = fieldSpecificHitCount(profile.id, conciseText);
          return isSeed || hits >= 1;
        });
        const weakFine = groups.some((group) => dgistFineHitCount(labText, group) > 0 || (group.priorities || {})[lab.professor]);
        const scoreOk = (item.score || 0) >= Math.max(80, maxScore * 0.045);
        return scoreOk && (weakInternal || weakProfile || weakFine || (item.score || 0) >= Math.max(180, maxScore * 0.12));
      })
      .map((item) => ({ ...item, relevanceTier: "C", _dgistTierReason: "인접 분야 후보" }))
      .sort((a, b) => (b.score || 0) - (a.score || 0) || String(a.lab.professor).localeCompare(String(b.lab.professor), "ko"));
    return dedupeResultsByProfessor(adjacent).slice(0, 24);
  }

  function dgistTieredResultNote(query, directResults, adjacentResults, visibleCount) {
    const count = directResults.length;
    if (count === 0 && adjacentResults.length) {
      return `<div class="dgist-tier-note">직접 관련 후보는 찾지 못했습니다. 다만 인접 분야 후보 ${adjacentResults.length}명을 따로 확인할 수 있습니다.</div>`;
    }
    if (count <= 3) {
      return `<div class="dgist-tier-note">직접 관련도가 높은 교수님은 ${count}명입니다. 아래 결과는 검색어와 직접 연결되는 교수님만 우선 표시한 것입니다.</div>`;
    }
    if (count > visibleCount) {
      return `<div class="dgist-tier-note">관련 교수님 ${visibleCount}명을 표시했습니다. 직접 관련 후보가 ${count}명 있습니다. 더 보려면 아래 버튼을 눌러주세요.</div>`;
    }
    return `<div class="dgist-tier-note">관련 교수님 ${count}명을 표시했습니다.</div>`;
  }

  function dgistRenderAdjacentSection(adjacentResults, query, profiles) {
    if (!adjacentResults.length) return "";
    const label = dgistTieredLabel(query, profiles || []);
    const maxScore = Math.max(...adjacentResults.map((item) => item.score || 0), 1);
    const cards = adjacentResults.map((item, index) => {
      const card = renderDgistLabCard(item, index, query, profiles || [], maxScore);
      return index < 5 ? card : `<div class="dgist-adjacent-extra is-hidden">${card}</div>`;
    }).join("");
    const remain = Math.max(0, adjacentResults.length - 5);
    const more = remain ? `<div class="dgist-more-results-wrap"><button type="button" class="ghost-button dgist-adjacent-more-button">인접 분야 교수님 ${Math.min(5, remain)}분 더보기</button></div>` : "";
    return `
      <section class="dgist-adjacent-section is-hidden" data-dgist-adjacent-section="true">
        <h4>함께 살펴볼 만한 인접 분야 교수님</h4>
        <p class="section-help">직접 일치보다는 ${escapeHtml(label)}와 가까운 인접 연구 키워드, 방법론, 응용 분야를 기준으로 분리해 표시했습니다.</p>
        <div class="card-list top-results">${cards}</div>
        ${more}
      </section>
    `;
  }


  const DGIST_NO_RESULT_FALLBACK_PROFILES = [
    {
      id: "immunology_adjacent",
      triggers: ["면역세포", "면역학", "면역", "immunology", "immune cell", "immune cells", "immune", "세포생물학", "세포 생물학", "cell biology", "유전자 발현", "gene expression"],
      notice: "DGIST DB에서 면역세포 또는 면역학 자체를 직접 연구하는 교수님은 명확하지 않습니다. 대신 바이오센서, 의료기기, 뇌과학, 생체신호, 세포 이미징과 가까운 인접 분야를 확인해볼 수 있습니다.",
      searchQuery: "바이오센서 의료기기 뇌과학 신경회로 생체신호 바이오이미징 세포 이미징 biomedical biosensor medical device neuroscience bioimaging",
      seedProfiles: ["biosensor", "biomedical_engineering", "basic_neuroscience", "brain_engineering_bci", "brain_disease_neural_circuit", "computer_vision"],
      examples: ["바이오센서 연구실 추천해줘", "의료기기 교수님 추천해줘", "세포 이미징 연구실 추천해줘", "뇌과학 신경회로 교수님 추천해줘"]
    },
    {
      id: "protein_structure_adjacent",
      triggers: ["단백질 구조 예측", "단백질구조예측", "protein structure prediction", "단백질", "구조생물학", "구조 생물학", "structural biology", "신약개발", "신약 개발", "drug discovery", "drug development"],
      notice: "DGIST DB에서 단백질 구조 예측 또는 구조생물학 자체를 직접 연구하는 교수님은 명확하지 않습니다. 대신 AI 기반 생명정보, 분자 시뮬레이션, 바이오센서, 의료기기, 뇌과학 인접 분야를 확인해볼 수 있습니다.",
      searchQuery: "AI 머신러닝 생명정보 분자 시뮬레이션 바이오센서 의료기기 뇌과학 신경회로 computational biology molecular simulation biosensor biomedical",
      seedProfiles: ["ai_machine_learning", "computational_science_simulation", "biosensor", "biomedical_engineering", "basic_neuroscience", "brain_disease_neural_circuit", "nano_advanced_materials"],
      examples: ["AI 바이오 연구실 추천해줘", "바이오센서 교수님 추천해줘", "분자 시뮬레이션 연구실 추천해줘", "의료기기 연구실 추천해줘"]
    },
    {
      id: "system_software_adjacent",
      triggers: ["운영체제", "os", "operating system", "operating systems", "시스템 소프트웨어", "system software", "컴퓨터 시스템", "computer system", "computer systems", "분산시스템", "분산 시스템", "distributed system", "distributed systems", "컴파일러", "compiler", "compilers", "런타임", "runtime", "runtime system", "네트워크 보안", "network security"],
      notice: "DGIST DB에서 운영체제 자체를 직접 연구하는 교수님은 명확하지 않습니다. 대신 컴파일러, 런타임 시스템, 보안, 통신, 임베디드 시스템과 가까운 인접 분야를 확인해볼 수 있습니다.",
      searchQuery: "통신 정보보안 컴파일러 런타임 시스템 소프트웨어 임베디드 시스템 네트워크 communication network security cryptography embedded system compiler runtime",
      seedProfiles: ["security_cryptography", "communication_network_6g", "embedded_iot", "broad_electrical_electronics_research"],
      examples: ["컴파일러 연구실 추천해줘", "런타임 시스템 교수님 추천해줘", "보안 연구실 추천해줘", "통신 네트워크 교수님 추천해줘", "임베디드 시스템 연구실 추천해줘"]
    }
  ];

  function dgistDetectNoResultFallbackProfile(query) {
    const q = normalize(query || "");
    if (!q) return null;
    const unrelatedTerms = ["맛집", "축구", "연애", "연애상담", "상담", "카페", "밥집", "식당", "동아리", "기숙사", "학식"];
    if (dgistHas(q, unrelatedTerms)) return null;
    return DGIST_NO_RESULT_FALLBACK_PROFILES.find((profile) => dgistHas(q, profile.triggers || [])) || null;
  }

  function dgistFallbackSeedItems(profile, query) {
    const items = [];
    const seen = new Set();
    const profileIds = new Set(profile.seedProfiles || []);
    (data.fieldProfiles || [])
      .filter((fieldProfile) => profileIds.has(fieldProfile.id))
      .forEach((fieldProfile) => {
        (fieldProfile.recommended_professors || []).forEach((name, index) => {
          const lab = data.labs.find((candidate) => candidate && candidate.professor === name && isRecommendableFaculty(candidate));
          if (!lab) return;
          const key = dgistTieredProfessorKey({ lab });
          if (seen.has(key)) return;
          seen.add(key);
          const internalMatch = dgistInternalScoreLab(lab, query || "");
          items.push({
            lab,
            score: Math.max(120, 240 - index * 10, internalMatch.score || 0),
            internalMatch,
            relevanceTier: "C",
            _dgistTierReason: "직접 연구자가 명확하지 않을 때의 인접 분야 후보"
          });
        });
      });
    return items;
  }

  function dgistBuildFallbackAdjacentResults(profile, existingAdjacent, query, profiles) {
    if (!profile) return existingAdjacent || [];
    const seen = new Set();
    const merged = [];
    function add(item, indexBoost) {
      if (!item || !item.lab) return;
      const key = dgistTieredProfessorKey(item);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({
        ...item,
        score: Math.max(90, (item.score || 0) + (indexBoost || 0)),
        relevanceTier: "C",
        _dgistTierReason: "직접 연구자가 명확하지 않을 때의 인접 분야 후보"
      });
    }
    (existingAdjacent || []).forEach((item) => add(item, 20));
    dgistFallbackSeedItems(profile, query || "").forEach((item) => add(item, 120));
    try {
      const generated = rankLabs(profile.searchQuery || query || "", profile.searchQuery || query || "");
      (generated || []).slice(0, 20).forEach((item, index) => add(item, Math.max(0, 60 - index * 3)));
    } catch (error) {
      console.warn("DGIST fallback candidate generation skipped", error);
    }
    return dedupeResultsByProfessor(merged)
      .sort((a, b) => (b.score || 0) - (a.score || 0) || String(a.lab.professor).localeCompare(String(b.lab.professor), "ko"))
      .slice(0, 12);
  }

  function dgistRenderFallbackNotice(profile, query) {
    if (!profile) return "";
    const suggestions = (profile.examples || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
    return `
      <h3>직접 일치 후보는 명확하지 않습니다</h3>
      <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 DGIST DB에서 직접 연구자가 명확한 후보는 찾지 못했습니다.</p>
      <div class="result-note"><span>${escapeHtml(profile.notice)}</span></div>
      <p class="section-help">아래 버튼을 누르면 직접 일치가 아니라 인접 연구 키워드, 방법론, 응용 분야 기준의 후보를 확인할 수 있습니다.</p>
      <div class="result-note"><span>다시 검색해볼 만한 표현: ${suggestions ? `<ul>${suggestions}</ul>` : "관련 대표 분야명을 함께 입력해 보세요."}</span></div>
    `;
  }

  const dgistTieredPreviousBuildAnswer = buildAnswer;
  buildAnswer = function(query, results, mode, matchedProfiles) {
    const directResults = dgistTieredDirectResults(results || [], query || "", matchedProfiles || []);
    const adjacentResults = dgistTieredAdjacentResults(results || [], directResults, query || "", matchedProfiles || []);
    const visibleCount = Math.min(5, directResults.length);
    const top = directResults.slice(0, visibleCount);

    if (!top.length) {
      const fallbackProfile = dgistDetectNoResultFallbackProfile(query || "");
      const fallbackAdjacentResults = fallbackProfile
        ? dgistBuildFallbackAdjacentResults(fallbackProfile, adjacentResults, query || "", matchedProfiles || [])
        : adjacentResults;
      const fallbackNotice = fallbackProfile ? dgistRenderFallbackNotice(fallbackProfile, query || "") : "";
      const adjacentBlock = fallbackAdjacentResults.length ? `
        ${fallbackNotice}
        ${dgistTieredResultNote(query, directResults, fallbackAdjacentResults, visibleCount)}
        <div class="dgist-more-results-wrap"><button type="button" class="ghost-button dgist-show-adjacent-button">인접 분야 교수님 보기</button></div>
        ${dgistRenderAdjacentSection(fallbackAdjacentResults, query, matchedProfiles || [])}
      ` : "";
      const html = adjacentBlock || fallbackNotice || dgistNoResultHtml(query);
      return { html, text: stripHtml(html), evidence: [] };
    }

    const evidence = collectEvidence(top);
    if (mode === "evidence") {
      const html = `<p>아래는 답변에 사용할 수 있는 핵심 근거야.</p>${renderEvidenceCards(evidence)}`;
      return { html, text: stripHtml(html), evidence };
    }

    const tagSummary = summarizeResultTags(top, query, matchedProfiles || []);
    const maxScore = Math.max(...directResults.map((item) => item.score || 0), 1);
    const labCards = directResults.map((item, index) => {
      const card = renderDgistLabCard(item, index, query, matchedProfiles || [], maxScore);
      return index < 5 ? card : `<div class="dgist-extra-direct is-hidden">${card}</div>`;
    }).join("");
    const extraCount = Math.max(0, directResults.length - 5);
    const directMoreButton = extraCount
      ? `<div class="dgist-more-results-wrap"><button type="button" class="ghost-button dgist-direct-more-button">관련 교수님 ${Math.min(10, extraCount)}분 더보기</button></div>`
      : "";
    const adjacentButton = directResults.length <= 3 && adjacentResults.length
      ? `<div class="dgist-more-results-wrap"><button type="button" class="ghost-button dgist-show-adjacent-button">인접 분야 교수님 보기</button></div>`
      : "";
    const html = `
      <h3>추천 결과</h3>
      <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 우선 확인할 만한 교수님입니다.</p>
      <p class="result-tags">주요 적합 분야: ${tagSummary.map(escapeHtml).join(", ") || "입력 키워드 기반"}</p>
      ${dgistTieredResultNote(query, directResults, adjacentResults, visibleCount)}
      <div class="card-list top-results">${labCards}</div>
      ${directMoreButton}
      ${adjacentButton}
      ${dgistRenderAdjacentSection(adjacentResults, query, matchedProfiles || [])}
    `;
    return { html, text: stripHtml(html), evidence };
  };

  document.addEventListener("click", (event) => {
    const directButton = event.target.closest(".dgist-direct-more-button");
    if (directButton) {
      const scope = directButton.closest(".message.assistant") || document;
      const hiddenCards = [...scope.querySelectorAll(".dgist-extra-direct.is-hidden")];
      const batch = hiddenCards.slice(0, 10);
      batch.forEach((node) => node.classList.remove("is-hidden"));
      const remaining = [...scope.querySelectorAll(".dgist-extra-direct.is-hidden")].length;
      if (remaining > 0) {
        directButton.textContent = `관련 교수님 ${Math.min(10, remaining)}분 더보기`;
      } else {
        const wrap = directButton.closest(".dgist-more-results-wrap");
        if (wrap) wrap.remove();
      }
      if (batch[0]) batch[0].scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const adjacentToggle = event.target.closest(".dgist-show-adjacent-button");
    if (adjacentToggle) {
      const scope = adjacentToggle.closest(".message.assistant") || document;
      const section = scope.querySelector(".dgist-adjacent-section");
      if (section) {
        section.classList.remove("is-hidden");
        const wrap = adjacentToggle.closest(".dgist-more-results-wrap");
        if (wrap) wrap.remove();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const adjacentMore = event.target.closest(".dgist-adjacent-more-button");
    if (adjacentMore) {
      const section = adjacentMore.closest(".dgist-adjacent-section") || document;
      const hiddenCards = [...section.querySelectorAll(".dgist-adjacent-extra.is-hidden")];
      const batch = hiddenCards.slice(0, 5);
      batch.forEach((node) => node.classList.remove("is-hidden"));
      const remaining = [...section.querySelectorAll(".dgist-adjacent-extra.is-hidden")].length;
      if (remaining > 0) {
        adjacentMore.textContent = `인접 분야 교수님 ${Math.min(5, remaining)}분 더보기`;
      } else {
        const wrap = adjacentMore.closest(".dgist-more-results-wrap");
        if (wrap) wrap.remove();
      }
      if (batch[0]) batch[0].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  // DGIST_TIERED_RESULT_DISPLAY_PATCH_END


  // DGIST_BANNER_EXPLORE_QUERY_PATCH_START
  // 상단 대표 분야 버튼은 화면 표시 문구와 실제 검색 알고리즘 입력값을 분리합니다.
  // 버튼 클릭: banner_explore 모드, 직접 입력: precise 모드.
  const dgistBannerExploreContextByLabel = {
    "반도체 소자/공정": {
      internalQuery: "반도체 소자 공정",
      intent: "semiconductor_device_process_general",
      displayPrompt: "반도체 소자, 반도체 공정 연구 관련 교수님을 추천해 주세요"
    },
    "메모리/스핀트로닉스": {
      internalQuery: "메모리 스핀트로닉스",
      intent: "memory_spintronics_general",
      displayPrompt: "메모리, 스핀트로닉스 연구 관련 교수님을 추천해 주세요"
    },
    "AI/머신러닝": {
      internalQuery: "AI 머신러닝",
      intent: "ai_general",
      displayPrompt: "AI, 머신러닝 연구 관련 교수님을 추천해 주세요"
    },
    "컴퓨터비전": {
      internalQuery: "컴퓨터비전",
      intent: "computer_vision_general",
      displayPrompt: "컴퓨터비전 연구 관련 교수님을 추천해 주세요"
    },
    "로봇 제어/자율주행": {
      internalQuery: "로봇 제어 자율주행",
      intent: "robotics_control_autonomous_general",
      displayPrompt: "로봇 제어, 자율주행 연구 관련 교수님을 추천해 주세요"
    },
    "배터리": {
      internalQuery: "배터리",
      intent: "battery_general",
      displayPrompt: "배터리 연구 관련 교수님을 추천해 주세요"
    },
    "바이오센서/의료기기": {
      internalQuery: "바이오센서 의료기기",
      intent: "biosensor_biomedical_device_general",
      displayPrompt: "바이오센서, 의료기기 연구 관련 교수님을 추천해 주세요"
    },
    "뇌과학/신경회로": {
      internalQuery: "뇌과학 신경회로",
      intent: "neuroscience_neural_circuit_general",
      displayPrompt: "뇌과학, 신경회로 연구 관련 교수님을 추천해 주세요"
    },
    "광학/디스플레이": {
      internalQuery: "광학 디스플레이",
      intent: "optics_display_general",
      displayPrompt: "광학, 디스플레이 연구 관련 교수님을 추천해 주세요"
    },
    "통신/보안": {
      internalQuery: "통신 보안",
      intent: "communication_security_general",
      displayPrompt: "통신, 정보보안 연구 관련 교수님을 추천해 주세요"
    },
    "양자/시뮬레이션": {
      internalQuery: "양자 시뮬레이션",
      intent: "quantum_simulation_general",
      displayPrompt: "양자소자, 계산과학 시뮬레이션 연구 관련 교수님을 추천해 주세요"
    }
  };

  function dgistBannerContextFromExample(example) {
    const label = String((example && example.label) || example || "").trim();
    const fallbackQuery = String((example && example.query) || label).trim();
    const context = dgistBannerExploreContextByLabel[label] || {
      internalQuery: label || fallbackQuery,
      intent: "representative_field_general",
      displayPrompt: fallbackQuery
    };
    return {
      label,
      displayPrompt: context.displayPrompt || fallbackQuery || label,
      internalQuery: context.internalQuery || label || fallbackQuery,
      intent: context.intent || "representative_field_general",
      mode: "banner_explore"
    };
  }

  function dgistClearBannerDataset() {
    if (!els || !els.goalInput) return;
    delete els.goalInput.dataset.searchMode;
    delete els.goalInput.dataset.internalQuery;
    delete els.goalInput.dataset.intent;
    delete els.goalInput.dataset.displayPrompt;
  }

  // 대표 분야 버튼은 화면 prompt와 내부 검색 query를 분리합니다.
  renderExamples = function() {
    els.exampleChips.innerHTML = "";
    examples.forEach((item) => {
      const context = dgistBannerContextFromExample(typeof item === "string" ? { label: item, query: item } : item);
      const button = document.createElement("button");
      button.className = "chip field-chip";
      button.type = "button";
      button.textContent = context.label || context.internalQuery;
      button.title = context.displayPrompt;
      button.dataset.query = context.internalQuery;
      button.dataset.intent = context.intent;
      button.dataset.mode = context.mode;
      button.addEventListener("click", () => {
        els.exampleChips.querySelectorAll(".chip").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        els.goalInput.value = context.displayPrompt;
        els.goalInput.dataset.searchMode = context.mode;
        els.goalInput.dataset.internalQuery = context.internalQuery;
        els.goalInput.dataset.intent = context.intent;
        els.goalInput.dataset.displayPrompt = context.displayPrompt;
        answerQuestion("full");
      });
      els.exampleChips.appendChild(button);
    });
  };

  // 직접 타이핑을 시작하면 배너 클릭 context를 지워 precise mode로 복귀합니다.
  els.goalInput.addEventListener("input", () => {
    const mode = els.goalInput.dataset.searchMode;
    if (mode === "banner_explore") dgistClearBannerDataset();
  });

  function dgistBannerSearchContext() {
    const displayQuery = els.goalInput.value.trim();
    const mode = els.goalInput.dataset.searchMode === "banner_explore" ? "banner_explore" : "precise";
    const internalQuery = mode === "banner_explore"
      ? String(els.goalInput.dataset.internalQuery || displayQuery).trim()
      : displayQuery;
    return {
      mode,
      displayQuery,
      internalQuery: internalQuery || displayQuery,
      intent: els.goalInput.dataset.intent || "",
      isBanner: mode === "banner_explore"
    };
  }

  const dgistBannerPreviousAnswerQuestion = answerQuestion;
  answerQuestion = function(mode, silent) {
    const context = dgistBannerSearchContext();
    const displayQuery = context.displayQuery;
    const query = context.internalQuery;
    if (!displayQuery) {
      toast("분야 버튼을 누르거나 관심 연구 키워드를 입력해 주세요.");
      els.goalInput.focus();
      return;
    }

    const nameMatches = context.isBanner ? [] : dgistDirectProfessorMatches(query);
    const matchedProfiles = nameMatches.length ? [] : detectFieldProfiles(query);
    let results = [];
    if (nameMatches.length) {
      results = nameMatches;
    } else if (matchedProfiles.length) {
      const userProfileText = [state.grade, state.tracks.join(" "), state.interest].filter(Boolean).join(" ");
      results = rankLabs(`${query} ${userProfileText}`, query).slice(0, 40);
    }
    lastResults = results;

    const answer = buildAnswer(query, results, mode, matchedProfiles);
    renderSidePanels(results, answer.evidence);
    els.chatFeed.innerHTML = "";
    appendUserMessage(displayQuery);
    appendAssistantMessage(answer.html);
    lastAnswerText = answer.text;
    state.history.push({
      query: displayQuery,
      internalQuery: context.isBanner ? query : undefined,
      intent: context.intent || undefined,
      mode: context.mode,
      at: new Date().toISOString()
    });
    state.history = state.history.slice(-20);
    persist();
  };

  // 상단 대표 배너는 짧은 internalQuery만으로 학교 전체 대표 분야를 넓게 탐색합니다.
  // 긴 displayPrompt는 화면 표시용이며, 점수 계산에는 사용하지 않습니다.
  const dgistBannerExploreProfileIdsByQuery = {
    "반도체 소자 공정": ["semiconductor_process", "semiconductor_device", "memory_semiconductor", "ai_system_semiconductor"],
    "반도체": ["semiconductor_process", "semiconductor_device", "memory_semiconductor", "ai_system_semiconductor"],
    "semiconductor": ["semiconductor_process", "semiconductor_device", "memory_semiconductor", "ai_system_semiconductor"],
    "메모리 스핀트로닉스": ["memory_semiconductor", "spintronics_next_generation_memory"],
    "AI 머신러닝": ["ai_machine_learning"],
    "ai 머신러닝": ["ai_machine_learning"],
    "컴퓨터비전": ["computer_vision"],
    "로봇 제어 자율주행": ["robot_control", "autonomous_robot_mobility", "general_robotics"],
    "배터리": ["secondary_battery", "solid_state_battery"],
    "battery": ["secondary_battery", "solid_state_battery"],
    "바이오센서 의료기기": ["biosensor", "biomedical_engineering", "wearable_flexible_electronics"],
    "뇌과학 신경회로": ["basic_neuroscience", "brain_disease_neural_circuit", "brain_engineering_bci"],
    "광학 디스플레이": ["display_optoelectronic_device"],
    "통신 보안": ["communication_network_6g", "security_cryptography"],
    "양자 시뮬레이션": ["quantum_computing_device", "computational_science_simulation"]
  };

  function dgistIsBannerExploreInternalQuery(query) {
    const q = normalize(String(query || "").trim());
    return Object.keys(dgistBannerExploreProfileIdsByQuery).some((key) => normalize(key) === q);
  }

  const dgistBannerPreviousDetectFieldProfiles = detectFieldProfiles;
  detectFieldProfiles = function(query) {
    const raw = String(query || "").trim();
    const q = normalize(raw);
    const normalizedMap = Object.keys(dgistBannerExploreProfileIdsByQuery).reduce((acc, key) => {
      acc[normalize(key)] = dgistBannerExploreProfileIdsByQuery[key];
      return acc;
    }, {});
    const ids = normalizedMap[q];
    if (ids && ids.length) {
      const profiles = ids.map((id) => dgistProfileById.get(id)).filter(Boolean);
      if (profiles.length) return profiles;
    }
    return dgistBannerPreviousDetectFieldProfiles(query);
  };

  // 대표 버튼 렌더링이 이미 한 번 실행된 뒤 patch가 적용되므로 다시 렌더링합니다.
  renderExamples();
  // DGIST_BANNER_EXPLORE_QUERY_PATCH_END




  // DGIST_ALGORITHM5_DIVERSE_PRECISE_QUERY_PATCH_START
  // 직접 검색어 다양성 회귀 테스트 보정층입니다.
  // 상단 배너 클릭(banner_explore)에는 개입하지 않고, 사용자가 직접 입력한 precise 검색어에만 작동합니다.
  const dgistAlgorithm5DiverseProfiles = [
  {
    "id": "alg5__1",
    "banner": "반도체 소자/공정",
    "query": "CMOS 소자 교수님 추천해줘",
    "intent": "트랜지스터, 전자소자, CMOS 소자 중심",
    "profileIds": [
      "semiconductor_device"
    ],
    "triggers": [
      "CMOS 소자",
      "cmos",
      "transistor",
      "트랜지스터",
      "전자소자"
    ],
    "expansion": "트랜지스터, 전자소자, CMOS 소자 중심 cmos transistor 트랜지스터 전자소자 semiconductor device 소자"
  },
  {
    "id": "alg5__2",
    "banner": "반도체 소자/공정",
    "query": "리소그래피 공정 연구실 추천해줘",
    "intent": "반도체 공정 중 리소그래피, 식각, 증착 중심",
    "profileIds": [
      "semiconductor_process"
    ],
    "triggers": [
      "리소그래피 공정",
      "lithography",
      "리소그래피",
      "etching",
      "식각"
    ],
    "expansion": "반도체 공정 중 리소그래피, 식각, 증착 중심 lithography 리소그래피 etching 식각 deposition 증착 fabrication 공정"
  },
  {
    "id": "alg5__3",
    "banner": "반도체 소자/공정",
    "query": "박막 증착 교수님 추천해줘",
    "intent": "박막, 증착, 나노공정 기반 반도체 제조",
    "profileIds": [
      "semiconductor_process",
      "semiconductor_device"
    ],
    "triggers": [
      "박막 증착",
      "thin film",
      "박막",
      "deposition",
      "증착"
    ],
    "expansion": "박막, 증착, 나노공정 기반 반도체 제조 thin film 박막 deposition 증착 ALD CVD fabrication"
  },
  {
    "id": "alg5__4",
    "banner": "반도체 소자/공정",
    "query": "뉴로모픽 칩 연구실 추천해줘",
    "intent": "AI 반도체, 뉴로모픽, 시스템 반도체",
    "profileIds": [
      "ai_system_semiconductor",
      "semiconductor_device"
    ],
    "triggers": [
      "뉴로모픽 칩",
      "neuromorphic",
      "뉴로모픽",
      "ai semiconductor",
      "AI 반도체"
    ],
    "expansion": "AI 반도체, 뉴로모픽, 시스템 반도체 neuromorphic 뉴로모픽 ai semiconductor AI 반도체 chip system semiconductor"
  },
  {
    "id": "alg5__5",
    "banner": "반도체 소자/공정",
    "query": "나노전자소자 교수님 추천해줘",
    "intent": "나노전자소자, 반도체 소자 물성",
    "profileIds": [
      "semiconductor_device"
    ],
    "triggers": [
      "나노전자소자",
      "nanoelectronic",
      "나노전자",
      "nanodevice",
      "나노소자"
    ],
    "expansion": "나노전자소자, 반도체 소자 물성 nanoelectronic 나노전자 nanodevice 나노소자 semiconductor device 전자소자"
  },
  {
    "id": "alg5__1",
    "banner": "메모리/스핀트로닉스",
    "query": "MRAM 연구실 추천해줘",
    "intent": "자성 메모리, MRAM, 스핀 기반 메모리",
    "profileIds": [
      "spintronics_next_generation_memory",
      "memory_semiconductor"
    ],
    "triggers": [
      "MRAM",
      "mram",
      "magnetic memory",
      "자성 메모리",
      "spintronics"
    ],
    "expansion": "자성 메모리, MRAM, 스핀 기반 메모리 mram magnetic memory 자성 메모리 spintronics 스핀트로닉스"
  },
  {
    "id": "alg5__2",
    "banner": "메모리/스핀트로닉스",
    "query": "스핀오비트 토크 교수님 추천해줘",
    "intent": "스핀전달, 스핀오비트 토크, 스핀소자",
    "profileIds": [
      "spintronics_next_generation_memory"
    ],
    "triggers": [
      "스핀오비트 토크",
      "spin orbit torque",
      "spin-orbit torque",
      "스핀오비트",
      "spin torque"
    ],
    "expansion": "스핀전달, 스핀오비트 토크, 스핀소자 spin orbit torque spin-orbit torque 스핀오비트 spin torque 스핀 토크 spintronics"
  },
  {
    "id": "alg5__3",
    "banner": "메모리/스핀트로닉스",
    "query": "비휘발성 메모리 연구실 추천해줘",
    "intent": "차세대 비휘발성 메모리 소자",
    "profileIds": [
      "memory_semiconductor",
      "spintronics_next_generation_memory"
    ],
    "triggers": [
      "비휘발성 메모리",
      "nonvolatile memory",
      "비휘발성",
      "next-generation memory",
      "차세대 메모리"
    ],
    "expansion": "차세대 비휘발성 메모리 소자 nonvolatile memory 비휘발성 next-generation memory 차세대 메모리 memory device"
  },
  {
    "id": "alg5__4",
    "banner": "메모리/스핀트로닉스",
    "query": "자성박막 교수님 추천해줘",
    "intent": "자성 박막, 스핀트로닉스 소재",
    "profileIds": [
      "spintronics_next_generation_memory"
    ],
    "triggers": [
      "자성박막",
      "magnetic thin film",
      "자성박막",
      "magnetic material",
      "spintronics"
    ],
    "expansion": "자성 박막, 스핀트로닉스 소재 magnetic thin film 자성박막 magnetic material spintronics 스핀"
  },
  {
    "id": "alg5__5",
    "banner": "메모리/스핀트로닉스",
    "query": "차세대 메모리 소자 추천해줘",
    "intent": "메모리 반도체 및 차세대 소자",
    "profileIds": [
      "memory_semiconductor"
    ],
    "triggers": [
      "차세대 메모리 소자",
      "next-generation memory",
      "차세대 메모리",
      "memory semiconductor",
      "메모리 반도체"
    ],
    "expansion": "메모리 반도체 및 차세대 소자 next-generation memory 차세대 메모리 memory semiconductor 메모리 반도체 memory device"
  },
  {
    "id": "alg5_AI_1",
    "banner": "AI/머신러닝",
    "query": "강화학습 연구실 추천해줘",
    "intent": "강화학습, 의사결정, 제어 AI",
    "profileIds": [
      "ai_machine_learning",
      "robot_control"
    ],
    "triggers": [
      "강화학습",
      "reinforcement learning",
      "강화학습",
      "decision making",
      "planning"
    ],
    "expansion": "강화학습, 의사결정, 제어 AI reinforcement learning 강화학습 decision making planning policy learning"
  },
  {
    "id": "alg5_AI_2",
    "banner": "AI/머신러닝",
    "query": "그래프 신경망 교수님 추천해줘",
    "intent": "GNN, 그래프 데이터 기반 학습",
    "profileIds": [
      "ai_machine_learning"
    ],
    "triggers": [
      "그래프 신경망",
      "graph neural network",
      "GNN",
      "그래프 신경망",
      "graph learning"
    ],
    "expansion": "GNN, 그래프 데이터 기반 학습 graph neural network GNN 그래프 신경망 graph learning graph"
  },
  {
    "id": "alg5_AI_3",
    "banner": "AI/머신러닝",
    "query": "생성모델 연구실 추천해줘",
    "intent": "생성형 AI, 딥러닝 모델링",
    "profileIds": [
      "ai_machine_learning",
      "nlp_generative_ai"
    ],
    "triggers": [
      "생성모델",
      "generative model",
      "생성모델",
      "generative ai",
      "diffusion"
    ],
    "expansion": "생성형 AI, 딥러닝 모델링 generative model 생성모델 generative ai diffusion vae gan"
  },
  {
    "id": "alg5_AI_4",
    "banner": "AI/머신러닝",
    "query": "추천시스템 교수님 추천해줘",
    "intent": "추천시스템, 개인화, 데이터 기반 예측",
    "profileIds": [
      "ai_machine_learning"
    ],
    "triggers": [
      "추천시스템",
      "recommender system",
      "추천시스템",
      "personalization",
      "ranking"
    ],
    "expansion": "추천시스템, 개인화, 데이터 기반 예측 recommender system 추천시스템 personalization ranking collaborative filtering"
  },
  {
    "id": "alg5_AI_5",
    "banner": "AI/머신러닝",
    "query": "연합학습 연구실 추천해줘",
    "intent": "분산 AI, federated learning, 온디바이스 AI",
    "profileIds": [
      "ai_machine_learning",
      "embedded_iot"
    ],
    "triggers": [
      "연합학습",
      "federated learning",
      "연합학습",
      "on-device ai",
      "distributed learning"
    ],
    "expansion": "분산 AI, federated learning, 온디바이스 AI federated learning 연합학습 on-device ai distributed learning privacy-preserving learning"
  },
  {
    "id": "alg5__1",
    "banner": "컴퓨터비전",
    "query": "객체검출 연구실 추천해줘",
    "intent": "object detection, segmentation 등 영상인식",
    "profileIds": [
      "computer_vision"
    ],
    "triggers": [
      "객체검출",
      "object detection",
      "객체검출",
      "segmentation",
      "image recognition"
    ],
    "expansion": "object detection, segmentation 등 영상인식 object detection 객체검출 segmentation image recognition 영상인식"
  },
  {
    "id": "alg5__2",
    "banner": "컴퓨터비전",
    "query": "의료영상 딥러닝 교수님 추천해줘",
    "intent": "의료영상, image reconstruction, AI 기반 진단",
    "profileIds": [
      "computer_vision",
      "biomedical_engineering",
      "ai_machine_learning"
    ],
    "triggers": [
      "의료영상 딥러닝",
      "medical imaging",
      "의료영상",
      "deep learning",
      "딥러닝"
    ],
    "expansion": "의료영상, image reconstruction, AI 기반 진단 medical imaging 의료영상 deep learning 딥러닝 image reconstruction biomedical imaging"
  },
  {
    "id": "alg5__3",
    "banner": "컴퓨터비전",
    "query": "SLAM 연구실 추천해줘",
    "intent": "로봇 비전, 위치추정, 지도작성",
    "profileIds": [
      "computer_vision",
      "autonomous_robot_mobility"
    ],
    "triggers": [
      "SLAM",
      "SLAM",
      "simultaneous localization",
      "visual slam",
      "로봇 비전"
    ],
    "expansion": "로봇 비전, 위치추정, 지도작성 SLAM simultaneous localization visual slam 로봇 비전 localization mapping"
  },
  {
    "id": "alg5__4",
    "banner": "컴퓨터비전",
    "query": "3D 비전 교수님 추천해줘",
    "intent": "3D scene, depth, point cloud 기반 비전",
    "profileIds": [
      "computer_vision"
    ],
    "triggers": [
      "3D 비전",
      "3d vision",
      "3D 비전",
      "point cloud",
      "포인트클라우드"
    ],
    "expansion": "3D scene, depth, point cloud 기반 비전 3d vision 3D 비전 point cloud 포인트클라우드 depth scene understanding"
  },
  {
    "id": "alg5__5",
    "banner": "컴퓨터비전",
    "query": "이미지 복원 연구실 추천해줘",
    "intent": "image restoration, enhancement, reconstruction",
    "profileIds": [
      "computer_vision"
    ],
    "triggers": [
      "이미지 복원",
      "image restoration",
      "이미지 복원",
      "image enhancement",
      "denoising"
    ],
    "expansion": "image restoration, enhancement, reconstruction image restoration 이미지 복원 image enhancement denoising super-resolution reconstruction"
  },
  {
    "id": "alg5__1",
    "banner": "로봇 제어/자율주행",
    "query": "보행로봇 제어 교수님 추천해줘",
    "intent": "legged robot, locomotion, 동역학 제어",
    "profileIds": [
      "robot_control",
      "general_robotics"
    ],
    "triggers": [
      "보행로봇 제어",
      "legged robot",
      "보행로봇",
      "locomotion",
      "walking robot"
    ],
    "expansion": "legged robot, locomotion, 동역학 제어 legged robot 보행로봇 locomotion walking robot 동역학 제어"
  },
  {
    "id": "alg5__2",
    "banner": "로봇 제어/자율주행",
    "query": "매니퓰레이터 연구실 추천해줘",
    "intent": "로봇팔, manipulation, grasping",
    "profileIds": [
      "robot_control",
      "general_robotics"
    ],
    "triggers": [
      "매니퓰레이터",
      "manipulator",
      "매니퓰레이터",
      "robot arm",
      "로봇팔"
    ],
    "expansion": "로봇팔, manipulation, grasping manipulator 매니퓰레이터 robot arm 로봇팔 manipulation grasping"
  },
  {
    "id": "alg5__3",
    "banner": "로봇 제어/자율주행",
    "query": "자율주행 경로계획 교수님 추천해줘",
    "intent": "path planning, autonomous navigation",
    "profileIds": [
      "autonomous_robot_mobility",
      "robot_control"
    ],
    "triggers": [
      "자율주행 경로계획",
      "path planning",
      "경로계획",
      "autonomous navigation",
      "자율주행"
    ],
    "expansion": "path planning, autonomous navigation path planning 경로계획 autonomous navigation 자율주행 mobility planning"
  },
  {
    "id": "alg5__4",
    "banner": "로봇 제어/자율주행",
    "query": "소프트로봇 연구실 추천해줘",
    "intent": "soft robotics, compliant mechanism",
    "profileIds": [
      "general_robotics",
      "medical_rehabilitation_robot"
    ],
    "triggers": [
      "소프트로봇",
      "soft robot",
      "소프트로봇",
      "soft robotics",
      "compliant"
    ],
    "expansion": "soft robotics, compliant mechanism soft robot 소프트로봇 soft robotics compliant flexible robot bio-inspired robot"
  },
  {
    "id": "alg5__5",
    "banner": "로봇 제어/자율주행",
    "query": "동역학 기반 제어 교수님 추천해줘",
    "intent": "robot dynamics, model predictive control",
    "profileIds": [
      "robot_control"
    ],
    "triggers": [
      "동역학 기반 제어",
      "dynamics",
      "동역학",
      "model predictive control",
      "MPC"
    ],
    "expansion": "robot dynamics, model predictive control dynamics 동역학 model predictive control MPC control 제어"
  },
  {
    "id": "alg5__1",
    "banner": "배터리",
    "query": "전고체전지 교수님 추천해줘",
    "intent": "solid-state battery, 고체전해질",
    "profileIds": [
      "solid_state_battery"
    ],
    "triggers": [
      "전고체전지",
      "solid-state battery",
      "전고체전지",
      "고체전해질",
      "solid electrolyte"
    ],
    "expansion": "solid-state battery, 고체전해질 solid-state battery 전고체전지 고체전해질 solid electrolyte all-solid-state battery"
  },
  {
    "id": "alg5__2",
    "banner": "배터리",
    "query": "양극재 연구실 추천해줘",
    "intent": "cathode, 양극 소재",
    "profileIds": [
      "secondary_battery",
      "solid_state_battery"
    ],
    "triggers": [
      "양극재",
      "cathode",
      "양극재",
      "positive electrode",
      "양극 소재"
    ],
    "expansion": "cathode, 양극 소재 cathode 양극재 positive electrode 양극 소재 battery material"
  },
  {
    "id": "alg5__3",
    "banner": "배터리",
    "query": "전해질 교수님 추천해줘",
    "intent": "전해질, 이온전도, 전해액",
    "profileIds": [
      "secondary_battery",
      "solid_state_battery"
    ],
    "triggers": [
      "전해질",
      "electrolyte",
      "전해질",
      "전해액",
      "ion transport"
    ],
    "expansion": "전해질, 이온전도, 전해액 electrolyte 전해질 전해액 ion transport 이온전도 solid electrolyte"
  },
  {
    "id": "alg5__4",
    "banner": "배터리",
    "query": "리튬금속전지 연구실 추천해줘",
    "intent": "lithium metal anode, 리튬금속 배터리",
    "profileIds": [
      "secondary_battery",
      "solid_state_battery"
    ],
    "triggers": [
      "리튬금속전지",
      "lithium metal",
      "리튬금속",
      "lithium metal anode",
      "anode"
    ],
    "expansion": "lithium metal anode, 리튬금속 배터리 lithium metal 리튬금속 lithium metal anode anode 음극 battery"
  },
  {
    "id": "alg5__5",
    "banner": "배터리",
    "query": "SEI 계면 연구하는 교수님 추천해줘",
    "intent": "배터리 계면, SEI, CEI",
    "profileIds": [
      "secondary_battery",
      "solid_state_battery"
    ],
    "triggers": [
      "SEI 계면 연구하는",
      "SEI",
      "solid electrolyte interphase",
      "계면",
      "interphase"
    ],
    "expansion": "배터리 계면, SEI, CEI SEI solid electrolyte interphase 계면 interphase interface CEI"
  },
  {
    "id": "alg5__1",
    "banner": "바이오센서/의료기기",
    "query": "웨어러블 생체신호 센서 교수님 추천해줘",
    "intent": "wearable biosensor, 생체신호 측정",
    "profileIds": [
      "biosensor",
      "wearable_flexible_electronics"
    ],
    "triggers": [
      "웨어러블 생체신호 센서",
      "wearable",
      "웨어러블",
      "biosensor",
      "바이오센서"
    ],
    "expansion": "wearable biosensor, 생체신호 측정 wearable 웨어러블 biosensor 바이오센서 bio-signal 생체신호 flexible electronics"
  },
  {
    "id": "alg5__2",
    "banner": "바이오센서/의료기기",
    "query": "미세유체칩 연구실 추천해줘",
    "intent": "microfluidics, lab-on-a-chip",
    "profileIds": [
      "biosensor",
      "biomedical_engineering"
    ],
    "triggers": [
      "미세유체칩",
      "microfluidic",
      "미세유체",
      "lab-on-a-chip",
      "랩온어칩"
    ],
    "expansion": "microfluidics, lab-on-a-chip microfluidic 미세유체 lab-on-a-chip 랩온어칩 biochip chip"
  },
  {
    "id": "alg5__3",
    "banner": "바이오센서/의료기기",
    "query": "의료초음파 교수님 추천해줘",
    "intent": "ultrasound imaging, biomedical device",
    "profileIds": [
      "biomedical_engineering"
    ],
    "triggers": [
      "의료초음파",
      "ultrasound",
      "초음파",
      "medical imaging",
      "biomedical"
    ],
    "expansion": "ultrasound imaging, biomedical device ultrasound 초음파 medical imaging biomedical imaging 의료기기"
  },
  {
    "id": "alg5__4",
    "banner": "바이오센서/의료기기",
    "query": "재활로봇 연구실 추천해줘",
    "intent": "의료로봇, 재활공학, assistive robot",
    "profileIds": [
      "medical_rehabilitation_robot",
      "biomedical_engineering"
    ],
    "triggers": [
      "재활로봇",
      "rehabilitation robot",
      "재활로봇",
      "medical robot",
      "의료로봇"
    ],
    "expansion": "의료로봇, 재활공학, assistive robot rehabilitation robot 재활로봇 medical robot 의료로봇 assistive biomedical"
  },
  {
    "id": "alg5__5",
    "banner": "바이오센서/의료기기",
    "query": "신경전극 인터페이스 교수님 추천해줘",
    "intent": "neural electrode, bioelectronic interface",
    "profileIds": [
      "brain_engineering_bci",
      "biosensor",
      "biomedical_engineering"
    ],
    "triggers": [
      "신경전극 인터페이스",
      "neural electrode",
      "신경전극",
      "interface",
      "bioelectronics"
    ],
    "expansion": "neural electrode, bioelectronic interface neural electrode 신경전극 interface bioelectronics BCI brain-computer interface"
  },
  {
    "id": "alg5__1",
    "banner": "뇌과학/신경회로",
    "query": "시냅스 가소성 연구실 추천해줘",
    "intent": "synapse, plasticity, neural circuit",
    "profileIds": [
      "basic_neuroscience",
      "brain_disease_neural_circuit"
    ],
    "triggers": [
      "시냅스 가소성",
      "synapse",
      "시냅스",
      "plasticity",
      "가소성"
    ],
    "expansion": "synapse, plasticity, neural circuit synapse 시냅스 plasticity 가소성 neural circuit 신경회로"
  },
  {
    "id": "alg5__2",
    "banner": "뇌과학/신경회로",
    "query": "파킨슨병 신경회로 교수님 추천해줘",
    "intent": "brain disease, neural circuit, Parkinson",
    "profileIds": [
      "brain_disease_neural_circuit"
    ],
    "triggers": [
      "파킨슨병 신경회로",
      "Parkinson",
      "파킨슨",
      "brain disease",
      "뇌질환"
    ],
    "expansion": "brain disease, neural circuit, Parkinson Parkinson 파킨슨 brain disease 뇌질환 neural circuit 신경회로"
  },
  {
    "id": "alg5__3",
    "banner": "뇌과학/신경회로",
    "query": "뇌-컴퓨터 인터페이스 연구실 추천해줘",
    "intent": "BCI, brain-computer interface",
    "profileIds": [
      "brain_engineering_bci"
    ],
    "triggers": [
      "뇌-컴퓨터 인터페이스",
      "BCI",
      "brain-computer interface",
      "뇌-컴퓨터 인터페이스",
      "뇌공학"
    ],
    "expansion": "BCI, brain-computer interface BCI brain-computer interface 뇌-컴퓨터 인터페이스 뇌공학 neural interface"
  },
  {
    "id": "alg5__4",
    "banner": "뇌과학/신경회로",
    "query": "신경이미징 교수님 추천해줘",
    "intent": "neural imaging, brain imaging",
    "profileIds": [
      "basic_neuroscience",
      "brain_engineering_bci"
    ],
    "triggers": [
      "신경이미징",
      "neural imaging",
      "신경이미징",
      "brain imaging",
      "뇌영상"
    ],
    "expansion": "neural imaging, brain imaging neural imaging 신경이미징 brain imaging 뇌영상 imaging neuroscience"
  },
  {
    "id": "alg5__5",
    "banner": "뇌과학/신경회로",
    "query": "행동신경과학 연구실 추천해줘",
    "intent": "behavioral neuroscience, cognition",
    "profileIds": [
      "basic_neuroscience"
    ],
    "triggers": [
      "행동신경과학",
      "behavioral neuroscience",
      "행동신경과학",
      "behavior",
      "행동"
    ],
    "expansion": "behavioral neuroscience, cognition behavioral neuroscience 행동신경과학 behavior 행동 cognition 인지"
  },
  {
    "id": "alg5__1",
    "banner": "광학/디스플레이",
    "query": "OLED 디스플레이 교수님 추천해줘",
    "intent": "OLED, 유기발광, display device",
    "profileIds": [
      "display_optoelectronic_device"
    ],
    "triggers": [
      "OLED 디스플레이",
      "OLED",
      "display",
      "디스플레이",
      "organic light emitting"
    ],
    "expansion": "OLED, 유기발광, display device OLED display 디스플레이 organic light emitting 발광 optoelectronic"
  },
  {
    "id": "alg5__2",
    "banner": "광학/디스플레이",
    "query": "나노포토닉스 연구실 추천해줘",
    "intent": "nanophotonics, optical device",
    "profileIds": [
      "display_optoelectronic_device",
      "quantum_computing_device"
    ],
    "triggers": [
      "나노포토닉스",
      "nanophotonics",
      "나노포토닉스",
      "photonics",
      "광소자"
    ],
    "expansion": "nanophotonics, optical device nanophotonics 나노포토닉스 photonics 광소자 optical device light-matter"
  },
  {
    "id": "alg5__3",
    "banner": "광학/디스플레이",
    "query": "광전소자 교수님 추천해줘",
    "intent": "optoelectronic device, photodetector",
    "profileIds": [
      "display_optoelectronic_device"
    ],
    "triggers": [
      "광전소자",
      "optoelectronic",
      "광전소자",
      "photodetector",
      "LED"
    ],
    "expansion": "optoelectronic device, photodetector optoelectronic 광전소자 photodetector LED 광소자 semiconductor photonics"
  },
  {
    "id": "alg5__4",
    "banner": "광학/디스플레이",
    "query": "페로브스카이트 태양전지 연구실 추천해줘",
    "intent": "perovskite, solar cell",
    "profileIds": [
      "solar_renewable_energy",
      "display_optoelectronic_device"
    ],
    "triggers": [
      "페로브스카이트 태양전지",
      "perovskite",
      "페로브스카이트",
      "solar cell",
      "태양전지"
    ],
    "expansion": "perovskite, solar cell perovskite 페로브스카이트 solar cell 태양전지 photovoltaic optoelectronic"
  },
  {
    "id": "alg5__5",
    "banner": "광학/디스플레이",
    "query": "홀로그래피 영상 연구실 추천해줘",
    "intent": "holography, optical imaging",
    "profileIds": [
      "display_optoelectronic_device",
      "computer_vision"
    ],
    "triggers": [
      "홀로그래피 영상",
      "holography",
      "홀로그래피",
      "optical imaging",
      "광학 영상"
    ],
    "expansion": "holography, optical imaging holography 홀로그래피 optical imaging 광학 영상 holographic imaging"
  },
  {
    "id": "alg5__1",
    "banner": "통신/보안",
    "query": "6G 무선통신 교수님 추천해줘",
    "intent": "6G, wireless communication, 네트워크",
    "profileIds": [
      "communication_network_6g"
    ],
    "triggers": [
      "6G 무선통신",
      "6G",
      "wireless communication",
      "무선통신",
      "network"
    ],
    "expansion": "6G, wireless communication, 네트워크 6G wireless communication 무선통신 network communication 통신"
  },
  {
    "id": "alg5__2",
    "banner": "통신/보안",
    "query": "암호 프로토콜 연구실 추천해줘",
    "intent": "cryptography, protocol security",
    "profileIds": [
      "security_cryptography"
    ],
    "triggers": [
      "암호 프로토콜",
      "cryptography",
      "암호",
      "protocol",
      "프로토콜"
    ],
    "expansion": "cryptography, protocol security cryptography 암호 protocol 프로토콜 security 보안"
  },
  {
    "id": "alg5__3",
    "banner": "통신/보안",
    "query": "사이버보안 교수님 추천해줘",
    "intent": "system security, cybersecurity",
    "profileIds": [
      "security_cryptography"
    ],
    "triggers": [
      "사이버보안",
      "cybersecurity",
      "사이버보안",
      "system security",
      "보안"
    ],
    "expansion": "system security, cybersecurity cybersecurity 사이버보안 system security 보안 attack privacy"
  },
  {
    "id": "alg5__4",
    "banner": "통신/보안",
    "query": "IoT 네트워크 연구실 추천해줘",
    "intent": "IoT, embedded system, network",
    "profileIds": [
      "embedded_iot",
      "communication_network_6g"
    ],
    "triggers": [
      "IoT 네트워크",
      "IoT",
      "internet of things",
      "embedded",
      "임베디드"
    ],
    "expansion": "IoT, embedded system, network IoT internet of things embedded 임베디드 network sensor network"
  },
  {
    "id": "alg5__5",
    "banner": "통신/보안",
    "query": "프라이버시 보존 AI 교수님 추천해줘",
    "intent": "privacy, secure learning, federated learning",
    "profileIds": [
      "security_cryptography",
      "ai_machine_learning"
    ],
    "triggers": [
      "프라이버시 보존 AI",
      "privacy",
      "프라이버시",
      "secure learning",
      "federated learning"
    ],
    "expansion": "privacy, secure learning, federated learning privacy 프라이버시 secure learning federated learning privacy-preserving 보안"
  },
  {
    "id": "alg5__1",
    "banner": "양자/시뮬레이션",
    "query": "큐비트 소자 교수님 추천해줘",
    "intent": "qubit, quantum device",
    "profileIds": [
      "quantum_computing_device"
    ],
    "triggers": [
      "큐비트 소자",
      "qubit",
      "큐비트",
      "quantum device",
      "양자소자"
    ],
    "expansion": "qubit, quantum device qubit 큐비트 quantum device 양자소자 quantum computing"
  },
  {
    "id": "alg5__2",
    "banner": "양자/시뮬레이션",
    "query": "양자점 연구실 추천해줘",
    "intent": "quantum dot, 양자 나노소자",
    "profileIds": [
      "quantum_computing_device",
      "display_optoelectronic_device"
    ],
    "triggers": [
      "양자점",
      "quantum dot",
      "양자점",
      "quantum",
      "nanostructure"
    ],
    "expansion": "quantum dot, 양자 나노소자 quantum dot 양자점 quantum nanostructure quantum device"
  },
  {
    "id": "alg5__3",
    "banner": "양자/시뮬레이션",
    "query": "DFT 계산 연구실 추천해줘",
    "intent": "density functional theory, first-principles",
    "profileIds": [
      "computational_science_simulation"
    ],
    "triggers": [
      "DFT 계산",
      "DFT",
      "density functional theory",
      "제일원리",
      "first-principles"
    ],
    "expansion": "density functional theory, first-principles DFT density functional theory 제일원리 first-principles ab initio 계산과학"
  },
  {
    "id": "alg5__4",
    "banner": "양자/시뮬레이션",
    "query": "분자동역학 시뮬레이션 교수님 추천해줘",
    "intent": "molecular dynamics, simulation",
    "profileIds": [
      "computational_science_simulation"
    ],
    "triggers": [
      "분자동역학 시뮬레이션",
      "molecular dynamics",
      "분자동역학",
      "MD simulation",
      "simulation"
    ],
    "expansion": "molecular dynamics, simulation molecular dynamics 분자동역학 MD simulation simulation 시뮬레이션 modeling"
  },
  {
    "id": "alg5__5",
    "banner": "양자/시뮬레이션",
    "query": "초전도 양자소자 연구실 추천해줘",
    "intent": "superconducting quantum device",
    "profileIds": [
      "quantum_computing_device"
    ],
    "triggers": [
      "초전도 양자소자",
      "superconducting",
      "초전도",
      "quantum device",
      "양자소자"
    ],
    "expansion": "superconducting quantum device superconducting 초전도 quantum device 양자소자 qubit 양자컴퓨팅"
  }
];

  function dgistAlgorithm5TermMatches(query, term) {
    const q = normalize(String(query || ""));
    const t = normalize(String(term || ""));
    if (!q || !t || t.length < 2) return false;
    if (/^[a-z0-9]{1,3}$/i.test(t)) {
      const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
      return re.test(String(query || ""));
    }
    if (q.includes(t)) return true;
    const parts = t.split(/\s+/).filter((part) => part.length >= 2);
    return parts.length >= 2 && parts.every((part) => q.includes(part));
  }

  function dgistAlgorithm5PreciseContext(query) {
    const raw = String(query || "").trim();
    if (!raw) return null;
    const normalizedRaw = normalize(raw);
    if (["자율주행", "자율주행차", "autonomous driving", "autonomous vehicle"].includes(normalizedRaw)) {
      return {
        id: "dgist_direct_autonomous_driving",
        intent: "자율주행·모빌리티·SLAM",
        profileIds: ["autonomous_robot_mobility", "robot_control", "general_robotics"],
        expansion: "자율주행 모빌리티 SLAM localization navigation path planning autonomous driving autonomous vehicle 차량제어"
      };
    }
    return dgistAlgorithm5DiverseProfiles.find((profile) =>
      (profile.triggers || []).some((term) => dgistAlgorithm5TermMatches(raw, term))
    ) || null;
  }

  function dgistAlgorithm5ProfilesByIds(ids) {
    return unique(ids || []).map((id) => dgistProfileById.get(id)).filter(Boolean);
  }

  const dgistAlgorithm5PreviousDetectFieldProfiles = detectFieldProfiles;
  detectFieldProfiles = function(query) {
    const precise = dgistAlgorithm5PreciseContext(query);
    if (precise && precise.profileIds && precise.profileIds.length) {
      const direct = dgistAlgorithm5ProfilesByIds(precise.profileIds);
      const base = dgistAlgorithm5PreviousDetectFieldProfiles(query);
      const seen = new Set();
      return [...direct, ...base].filter((profile) => {
        if (!profile || seen.has(profile.id)) return false;
        seen.add(profile.id);
        return true;
      });
    }
    return dgistAlgorithm5PreviousDetectFieldProfiles(query);
  };

  const dgistAlgorithm5PreviousAnswerQuestion = answerQuestion;
  answerQuestion = function(mode, silent) {
    const context = typeof dgistBannerSearchContext === "function" ? dgistBannerSearchContext() : {
      mode: "precise",
      displayQuery: els.goalInput.value.trim(),
      internalQuery: els.goalInput.value.trim(),
      intent: "",
      isBanner: false
    };
    const displayQuery = context.displayQuery;
    const rawQuery = context.internalQuery;
    if (!displayQuery) {
      toast("분야 버튼을 누르거나 관심 연구 키워드를 입력해 주세요.");
      els.goalInput.focus();
      return;
    }

    const precise = context.isBanner ? null : dgistAlgorithm5PreciseContext(rawQuery);
    const localAssist = (!context.isBanner && !precise && window.LMQueryAssist)
      ? window.LMQueryAssist.expand(rawQuery)
      : { query: rawQuery, applied: false, intent: "other" };
    let rankingQuery = precise
      ? `${rawQuery} ${precise.expansion || ""}`.trim()
      : rawQuery;
    const nameMatches = context.isBanner ? [] : dgistDirectProfessorMatches(rawQuery);
    let matchedProfiles = nameMatches.length ? [] : (precise ? dgistAlgorithm5ProfilesByIds(precise.profileIds) : detectFieldProfiles(rankingQuery));
    let results = [];
    const userProfileText = [state.grade, state.tracks.join(" "), state.interest].filter(Boolean).join(" ");
    if (nameMatches.length) {
      results = nameMatches;
    } else if (matchedProfiles.length) {
      results = rankLabs(`${rankingQuery} ${userProfileText}`, rankingQuery).slice(0, 40);
    }
    if (!context.isBanner && !precise && !nameMatches.length && !results.length && localAssist.applied) {
      rankingQuery = localAssist.query || rawQuery;
      matchedProfiles = detectFieldProfiles(rankingQuery);
      if (matchedProfiles.length) {
        results = rankLabs(`${rankingQuery} ${userProfileText}`, rankingQuery).slice(0, 40);
      }
      if (window.LMQueryAssist && typeof window.LMQueryAssist.markApplied === "function") {
        window.LMQueryAssist.markApplied(localAssist.intent);
      }
    }
    lastResults = results;

    const answer = buildAnswer(displayQuery, results, mode, matchedProfiles, rankingQuery);
    renderSidePanels(results, answer.evidence);
    els.chatFeed.innerHTML = "";
    appendUserMessage(displayQuery);
    appendAssistantMessage(answer.html);
    lastAnswerText = answer.text;
    state.history.push({
      query: displayQuery,
      internalQuery: context.isBanner ? rawQuery : undefined,
      preciseExpandedQuery: precise ? rankingQuery : undefined,
      preciseProfile: precise ? precise.id : undefined,
      intent: context.intent || (precise ? precise.intent : undefined),
      mode: context.mode,
      at: new Date().toISOString()
    });
    state.history = state.history.slice(-20);
    persist();
  };
  // DGIST_ALGORITHM5_DIVERSE_PRECISE_QUERY_PATCH_END



  // DGIST_DEPARTMENT_FIRST_BROWSER_PATCH_START
  // 사용자는 학과를 먼저 선택하고, 그 학과 안의 세부 분야 또는 직접 입력으로 탐색합니다.
  // 선택한 학과는 브라우저 내부 필터에만 쓰이며 서버나 GoatCounter로 전송하지 않습니다.
  const dgistDepartmentCatalog = [
    {
      key: "physchem", label: "화학물리학과", note: "물리·화학·양자·소재",
      fields: [
        ["양자·응집물질", "양자 응집물질 위상물질 초전도", "quantum-matter"],
        ["나노광학·포토닉스", "나노포토닉스 반도체 포토닉스 광물질 상호작용", "nanophotonics"],
        ["스핀트로닉스·자성", "스핀트로닉스 자성 박막 스커미온", "spintronics"],
        ["계산물질·시뮬레이션", "계산물질과학 DFT 제일원리 시뮬레이션", "computational-materials"],
        ["유기합성·촉매", "유기합성 비대칭 합성 촉매 반응", "organic-catalysis"],
        ["MOF·다공성 소재", "MOF 금속유기구조체 다공성 소재", "mof-porous"],
        ["분광·반응동역학", "초고속 분광 시분해 X선 반응동역학", "spectroscopy-dynamics"],
        ["바이오소재·화학생물학", "바이오소재 화학생물학 단백질화학", "chemical-biology"],
        ["지속가능 화학·수처리", "폐플라스틱 수처리 업사이클링 지속가능 화학", "sustainable-chemistry"]
      ]
    },
    {
      key: "eecs", label: "전기전자컴퓨터공학과", note: "전자·컴퓨터·AI·통신",
      fields: [
        ["반도체 소자·공정", "반도체 소자 공정 나노전자소자", "semiconductor-device"],
        ["메모리·뉴로모픽", "메모리 반도체 인메모리 뉴로모픽", "memory-neuromorphic"],
        ["집적회로·시스템반도체", "집적회로 아날로그 혼성신호 시스템반도체", "integrated-circuit"],
        ["AI·머신러닝", "AI 머신러닝 딥러닝 데이터", "ai-ml"],
        ["컴퓨터비전·멀티모달", "컴퓨터비전 멀티모달 생성형 AI", "vision-multimodal"],
        ["컴퓨터시스템·컴파일러", "컴파일러 운영체제 컴퓨터구조 분산시스템", "computer-systems"],
        ["통신·신호처리", "무선통신 네트워크 신호처리 6G", "communications"],
        ["보안·암호", "정보보안 암호 보안 프라이버시 cryptography security", "security"],
        ["임베디드·IoT", "임베디드 시스템 IoT 에지컴퓨팅", "embedded-iot"],
        ["바이오전자·의료영상", "바이오전자 의료영상 초음파 광학영상", "bioelectronics-imaging"],
        ["HCI·인터랙션", "HCI 사용자경험 멀티센서리 인터랙션", "hci"]
      ]
    },
    {
      key: "brain", label: "뇌과학과", note: "신경회로·행동·뇌질환",
      fields: [
        ["신경회로·행동", "신경회로 행동 신경과학", "neural-circuit"],
        ["학습·기억·시냅스", "학습 기억 시냅스 가소성", "learning-memory"],
        ["뇌질환·신경퇴행", "알츠하이머 뇌질환 신경퇴행", "brain-disease"],
        ["감각·후각", "감각정보처리 후각 화학감각", "sensory-olfaction"],
        ["신경조절·정신질환", "신경조절 도파민 세로토닌 정신질환", "neuromodulation"],
        ["뇌대사·생체리듬", "뇌대사 생체리듬 일주기 행동", "metabolism-circadian"],
        ["계산신경과학·BMI", "계산신경과학 뇌기계인터페이스 신경신호", "computational-bmi"],
        ["구조생물학·이온채널", "구조생물학 이온채널 막단백질 cryo-EM", "structural-ion-channel"],
        ["축삭재생·신경손상", "축삭 재생 신경손상 신경퇴행", "axon-regeneration"],
        ["환경생명·생분해", "플라스틱 생분해 환경미생물", "environmental-biology"]
      ]
    },
    {
      key: "robot", label: "로봇및기계전자공학과", note: "로봇·제어·의료·센서",
      fields: [
        ["로봇 제어·Physical AI", "로봇 제어 Physical AI 강화학습", "robot-control"],
        ["자율주행·모빌리티", "자율주행 모빌리티 SLAM 로봇비전", "autonomous-mobility"],
        ["휴머노이드·매니퓰레이션", "휴머노이드 매니퓰레이터 텔레오퍼레이션", "humanoid-manipulation"],
        ["의료·재활로봇", "의료로봇 수술로봇 재활로봇", "medical-rehab-robot"],
        ["소프트·웨어러블로봇", "소프트로봇 웨어러블로봇 바이오인스파이어드", "soft-wearable-robot"],
        ["마이크로·나노로봇", "마이크로로봇 나노로봇 MEMS NEMS", "micro-nano-robot"],
        ["생체전자·신경인터페이스", "생체전자 신경인터페이스 BMI 임플란트", "neural-interface"],
        ["의료영상·광학영상", "의료영상 초음파 광학영상 홀로그래피", "medical-imaging"],
        ["MEMS·센서", "MEMS 센서 촉각센서 자가발전", "mems-sensor"],
        ["제조·메커니즘", "로봇 설계 제조 메커니즘 액추에이터", "design-manufacturing"],
        ["드론·비행로봇", "드론 UAV 비행로봇 제어", "aerial-robot"]
      ]
    },
    {
      key: "energy", label: "에너지공학과", note: "배터리·수소·태양전지·촉매",
      fields: [
        ["이차전지 소재", "이차전지 양극재 음극재 배터리 소재", "battery-materials"],
        ["전고체전지·계면", "전고체전지 고체전해질 전극 계면", "solid-state-battery"],
        ["전해질·이온전도", "배터리 전해질 이온전도 리튬금속", "electrolyte-ion"],
        ["배터리 공정·진단", "배터리 제조 공정 열화 진단 operando", "battery-process"],
        ["수소·연료전지", "수소 연료전지 수전해 전기촉매", "hydrogen-fuel-cell"],
        ["CO2 전환·촉매", "CO2 전환 CO2 환원 이산화탄소 전환 전기촉매 carbon dioxide conversion", "co2-catalysis"],
        ["태양전지·광전소자", "태양전지 페로브스카이트 광전소자", "solar-optoelectronics"],
        ["양자점·발광소자", "양자점 QLED 발광소자 디스플레이", "quantum-dot"],
        ["에너지 하베스팅·웨어러블", "에너지 하베스팅 자가발전 웨어러블 소자", "energy-harvesting"],
        ["계산·AI 에너지소재", "계산화학 DFT AI 에너지 소재", "computational-energy"],
        ["고분자·지속가능 소재", "고분자 polymer 고분자 광촉매 지속가능 화학 배터리 재활용", "sustainable-materials"]
      ]
    },
    {
      key: "newbiology", label: "뉴바이올로지학과", note: "New Biology·정밀의학·노화·면역",
      fields: [
        ["유전체·DNA 복구", "유전체 DNA 손상 복구 크로마틴 후성유전", "genome-dna-repair"],
        ["암생물학·정밀의학", "암생물학 암 정밀의학 바이오마커", "cancer-precision"],
        ["면역·면역치료", "면역학 T세포 면역치료 뇌면역", "immunity-therapy"],
        ["노화·대사·생리", "노화 대사 생리 면역노화 세포노화", "aging-metabolism"],
        ["줄기세포·재생의학", "줄기세포 재생의학 세포치료 오가노이드", "stem-cell"],
        ["단백질 구조·공학", "단백질 구조 단백질공학 항체공학 NMR", "protein-engineering"],
        ["화학생물학·신약", "화학생물학 신약개발 단백질 분해", "chemical-biology-drug"],
        ["정밀의학·프로테오믹스", "정밀의학 프로테오믹스 질량분석 오믹스", "proteomics-omics"],
        ["단분자·세포 이미징", "단분자 생물물리 초고해상도 현미경 세포 동역학", "single-molecule-imaging"],
        ["나노바이오·전자약", "나노바이오의학 전자약 바이오의료기기", "nanobiomedicine"],
        ["식물생명·환경응답", "식물발달 식물노화 식물 신호전달 환경응답", "plant-biology"],
        ["동물생태·행동", "동물생태 행동생태 감각생태", "animal-ecology"]
      ]
    }
  ];

  const dgistDepartmentByKey = new Map(dgistDepartmentCatalog.map((item) => [item.key, item]));
  let dgistActiveDepartmentKey = "";

  function dgistCurrentDepartment() {
    return dgistDepartmentByKey.get(dgistActiveDepartmentKey) || null;
  }

  function dgistLabInActiveDepartment(lab) {
    const department = dgistCurrentDepartment();
    if (!department) return true;
    const raw = normalize((lab && lab.department) || "");
    return raw.includes(normalize(department.label));
  }

  // 모든 추천·인접 후보·교수명 검색을 선택한 학과 내부로 제한합니다.
  const dgistDepartmentPreviousRankLabs = rankLabs;
  rankLabs = function(query, profileQuery) {
    const ranked = dgistDepartmentPreviousRankLabs(query, profileQuery) || [];
    return dgistCurrentDepartment() ? ranked.filter((item) => item && dgistLabInActiveDepartment(item.lab)) : ranked;
  };
  const dgistDepartmentPreviousProfessorMatches = dgistDirectProfessorMatches;
  dgistDirectProfessorMatches = function(query) {
    const matches = dgistDepartmentPreviousProfessorMatches(query) || [];
    return dgistCurrentDepartment() ? matches.filter((item) => item && dgistLabInActiveDepartment(item.lab)) : matches;
  };

  els.departmentChips = byId("departmentChips");
  els.subfieldPanel = byId("subfieldPanel");
  els.subfieldTitle = byId("subfieldTitle");
  els.subfieldNote = byId("subfieldNote");
  els.departmentSearchHint = byId("departmentSearchHint");

  initialMessage = function() {
    const department = dgistCurrentDepartment();
    return `
      <div class="message assistant">
        <h3>${department ? escapeHtml(department.label) + " 세부 분야를 선택해 주세요" : "먼저 학과를 선택해 주세요"}</h3>
        <p>${department ? "위의 세부 분야 배너를 누르거나, 해당 학과 안에서 연구 키워드를 직접 입력할 수 있습니다." : "학과를 선택하면 해당 학과의 세부 분야 배너와 검색창이 활성화됩니다."}</p>
      </div>
    `;
  };

  function dgistClearSearchContext() {
    if (!els.goalInput) return;
    delete els.goalInput.dataset.searchMode;
    delete els.goalInput.dataset.internalQuery;
    delete els.goalInput.dataset.intent;
    delete els.goalInput.dataset.displayPrompt;
    delete els.goalInput.dataset.department;
    delete els.goalInput.dataset.subfield;
  }

  function dgistSelectDepartment(key, options) {
    const department = dgistDepartmentByKey.get(key);
    if (!department) return;
    dgistActiveDepartmentKey = department.key;
    els.departmentChips.querySelectorAll(".dgist-department-chip").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.lmDepartment === department.key);
      button.setAttribute("aria-pressed", button.dataset.lmDepartment === department.key ? "true" : "false");
    });
    els.goalInput.disabled = false;
    els.goalInput.value = "";
    els.goalInput.placeholder = `${department.label} 안에서 세부 연구 키워드를 입력해 주세요`;
    els.departmentSearchHint.textContent = `${department.label} 안에서 배너에 없는 연구 주제도 직접 검색할 수 있습니다.`;
    els.subfieldTitle.textContent = `${department.label} 세부 연구 분야`;
    els.subfieldNote.textContent = "서로 다른 연구 주제를 나누어 표시했습니다. 원하는 분야를 누르면 해당 학과 교수님만 보여줍니다.";
    els.subfieldPanel.hidden = false;
    dgistClearSearchContext();
    renderExamples();
    lastAnswerText = "";
    lastResults = [];
    els.chatFeed.innerHTML = initialMessage();
    if (!options || !options.silent) els.subfieldPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function dgistRenderDepartments() {
    els.departmentChips.innerHTML = "";
    dgistDepartmentCatalog.forEach((department) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dgist-department-chip";
      button.dataset.lmDepartment = department.key;
      button.dataset.departmentLabel = department.label;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `<strong>${escapeHtml(department.label)}</strong><span>${escapeHtml(department.note)}</span>`;
      button.addEventListener("click", () => dgistSelectDepartment(department.key));
      els.departmentChips.appendChild(button);
    });
  }

  renderExamples = function() {
    const department = dgistCurrentDepartment();
    els.exampleChips.innerHTML = "";
    if (!department) return;
    department.fields.forEach((field) => {
      const [label, internalQuery, fieldKey] = field;
      const displayPrompt = `${department.label}에서 ${label} 연구 관련 교수님을 추천해 주세요`;
      const button = document.createElement("button");
      button.className = "chip field-chip";
      button.type = "button";
      button.textContent = label;
      button.title = displayPrompt;
      button.dataset.query = internalQuery;
      button.dataset.intent = fieldKey;
      button.dataset.mode = "banner_explore";
      button.dataset.lmSubfield = fieldKey;
      button.dataset.lmDepartment = department.key;
      button.addEventListener("click", () => {
        els.exampleChips.querySelectorAll(".field-chip").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        els.goalInput.value = displayPrompt;
        els.goalInput.dataset.searchMode = "banner_explore";
        els.goalInput.dataset.internalQuery = internalQuery;
        els.goalInput.dataset.intent = fieldKey;
        els.goalInput.dataset.displayPrompt = displayPrompt;
        els.goalInput.dataset.department = department.key;
        els.goalInput.dataset.subfield = fieldKey;
        answerQuestion("full");
      });
      els.exampleChips.appendChild(button);
    });
  };

  // 기존 배너 검색 문맥에 학과·세부 분야를 포함합니다.
  dgistBannerSearchContext = function() {
    const displayQuery = els.goalInput.value.trim();
    const mode = els.goalInput.dataset.searchMode === "banner_explore" ? "banner_explore" : "precise";
    const internalQuery = mode === "banner_explore"
      ? String(els.goalInput.dataset.internalQuery || displayQuery).trim()
      : displayQuery;
    return {
      mode,
      displayQuery,
      internalQuery: internalQuery || displayQuery,
      intent: els.goalInput.dataset.intent || "",
      department: dgistActiveDepartmentKey,
      subfield: els.goalInput.dataset.subfield || "",
      isBanner: mode === "banner_explore"
    };
  };

  // 직접 입력을 시작해도 선택한 학과는 유지하되 배너 문맥만 해제합니다.
  els.goalInput.addEventListener("input", () => {
    if (els.goalInput.dataset.searchMode === "banner_explore") {
      const department = dgistActiveDepartmentKey;
      dgistClearSearchContext();
      els.goalInput.dataset.department = department;
      els.exampleChips.querySelectorAll(".field-chip").forEach((node) => node.classList.remove("active"));
    }
  });

  const dgistSubfieldSearchRules = {
    "co2-catalysis": {
      query: "CO2 전환 CO2 환원 이산화탄소 전환 전기촉매 carbon dioxide conversion",
      professors: ["김찬연", "위태웅", "인수일"],
      evidenceLabel: "CO2 전환·촉매"
    },
    "sustainable-materials": {
      query: "고분자 polymer 고분자 광촉매 지속가능 화학 배터리 재활용",
      professors: ["김승현", "허수미", "박치영", "김운혁", "김진수", "김찬연"],
      evidenceLabel: "고분자·지속가능 소재"
    },
    "bioelectronics-imaging": {
      query: "바이오전자 의료영상 초음파 광학영상 bioelectronics biomedical imaging",
      professors: ["이병문", "장재은", "장진호", "황재윤", "이병권", "이민선", "이경태", "이기준", "윤성훈"],
      evidenceLabel: "바이오전자·의료영상"
    },
    "security": {
      query: "정보보안 암호 보안 프라이버시 cryptography security",
      professors: ["김영식", "최원석", "신동훈", "최지웅"],
      evidenceLabel: "보안·암호"
    },
    "plant-biology": {
      query: "식물발달 식물 신호전달 환경응답 plant development plant signaling",
      professors: ["우혜련", "곽준명"],
      evidenceLabel: "식물생명·환경응답"
    },
    "computational-energy": {
      query: "계산화학 DFT 분자동역학 AI 에너지 소재 computational materials",
      professors: ["이태훈", "허수미", "장윤희", "강준구", "최승호"],
      evidenceLabel: "계산·AI 에너지소재"
    },
    "autonomous-mobility": {
      query: "자율주행 모빌리티 SLAM localization navigation path planning autonomous driving",
      professors: ["김기섭", "남강현", "임용섭", "김동욱", "김경대", "박대희", "임성훈"],
      evidenceLabel: "자율주행·모빌리티"
    }
  };

  function dgistDirectSearchRule(query) {
    const q = normalize(query || "");
    if (["자율주행", "자율주행차", "autonomous driving", "autonomous vehicle"].includes(q)) {
      return dgistSubfieldSearchRules["autonomous-mobility"];
    }
    return null;
  }

  function dgistCuratedResults(results, rule, rankingQuery) {
    if (!rule || !(rule.professors || []).length) return results || [];
    const existingByProfessor = new Map();
    (results || []).forEach((item) => {
      const name = item && item.lab && item.lab.professor;
      if (name && !existingByProfessor.has(name)) existingByProfessor.set(name, item);
    });
    return rule.professors.map((name, index) => {
      let item = existingByProfessor.get(name);
      if (!item) {
        const lab = data.labs.find((candidate) => candidate && candidate.professor === name && isRecommendableFaculty(candidate));
        if (!lab) return null;
        item = { lab, score: 0, internalMatch: dgistInternalScoreLab(lab, rankingQuery || "") };
      }
      return {
        ...item,
        score: 1000000 - index * 10000,
        internalMatch: item.internalMatch || dgistInternalScoreLab(item.lab, rankingQuery || ""),
        _dgistIntentFirstSpecificHit: true,
        _dgistIntentFirstFineHits: [rule.evidenceLabel || "세부 분야 직접 일치"]
      };
    }).filter(Boolean);
  }

  const dgistDepartmentPreviousAnswerQuestion = answerQuestion;
  answerQuestion = function(mode, silent) {
    const department = dgistCurrentDepartment();
    if (!department) {
      toast("먼저 학과를 선택해 주세요.");
      els.departmentChips.querySelector(".dgist-department-chip")?.focus();
      return;
    }
    const context = dgistBannerSearchContext();
    const displayQuery = context.displayQuery;
    const rawQuery = context.internalQuery;
    if (!displayQuery) {
      toast("세부 분야 배너를 누르거나 연구 키워드를 입력해 주세요.");
      els.goalInput.focus();
      return;
    }

    const subfieldRule = context.isBanner ? dgistSubfieldSearchRules[context.subfield] : null;
    const directRule = context.isBanner ? null : dgistDirectSearchRule(rawQuery);
    const activeSearchRule = subfieldRule || directRule;
    const precise = context.isBanner ? null : dgistAlgorithm5PreciseContext(rawQuery);
    const localAssist = (!context.isBanner && !precise && !activeSearchRule && window.LMQueryAssist)
      ? window.LMQueryAssist.expand(rawQuery)
      : { query: rawQuery, applied: false, intent: "other" };
    let rankingQuery = activeSearchRule && activeSearchRule.query
      ? activeSearchRule.query
      : (precise ? `${rawQuery} ${precise.expansion || ""}`.trim() : rawQuery);
    const nameMatches = context.isBanner ? [] : dgistDirectProfessorMatches(rawQuery);
    let matchedProfiles = nameMatches.length ? [] : (precise ? dgistAlgorithm5ProfilesByIds(precise.profileIds) : detectFieldProfiles(rankingQuery));
    let results = [];
    const userProfileText = [state.grade, state.tracks.join(" "), state.interest].filter(Boolean).join(" ");
    if (nameMatches.length) {
      results = nameMatches;
    } else if (matchedProfiles.length || context.isBanner || dgistIntentFirstHasSpecificQuery(rankingQuery)) {
      results = rankLabs(`${rankingQuery} ${userProfileText}`, rankingQuery).slice(0, 40);
    }
    if (!context.isBanner && !precise && !activeSearchRule && !nameMatches.length && !results.length && localAssist.applied) {
      rankingQuery = localAssist.query || rawQuery;
      matchedProfiles = detectFieldProfiles(rankingQuery);
      results = rankLabs(`${rankingQuery} ${userProfileText}`, rankingQuery).slice(0, 40);
      if (window.LMQueryAssist && typeof window.LMQueryAssist.markApplied === "function") {
        window.LMQueryAssist.markApplied(localAssist.intent);
      }
    }
    if (activeSearchRule) {
      results = dgistCuratedResults(results, activeSearchRule, rankingQuery);
      matchedProfiles = [];
    }
    lastResults = results;

    const answer = buildAnswer(displayQuery, results, mode, matchedProfiles, rankingQuery);
    renderSidePanels(results, answer.evidence);
    els.chatFeed.innerHTML = "";
    appendUserMessage(displayQuery);
    appendAssistantMessage(answer.html);
    lastAnswerText = answer.text;
    state.history.push({
      query: displayQuery,
      internalQuery: context.isBanner ? rawQuery : undefined,
      department: department.key,
      subfield: context.subfield || undefined,
      intent: context.intent || (precise ? precise.intent : undefined),
      mode: context.mode,
      at: new Date().toISOString()
    });
    state.history = state.history.slice(-20);
    persist();
  };

  // 초기화 시 학과 선택 단계로 돌아갑니다.
  els.resetButton.addEventListener("click", () => {
    dgistActiveDepartmentKey = "";
    dgistClearSearchContext();
    els.goalInput.disabled = true;
    els.goalInput.placeholder = "먼저 학과를 선택해 주세요";
    els.departmentSearchHint.textContent = "먼저 학과를 선택해 주세요. 선택한 학과 안에서 배너에 없는 연구 주제도 직접 검색할 수 있습니다.";
    els.subfieldPanel.hidden = true;
    els.departmentChips.querySelectorAll(".dgist-department-chip").forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    });
    els.exampleChips.innerHTML = "";
    els.chatFeed.innerHTML = initialMessage();
  });

  dgistRenderDepartments();
  renderExamples();
  els.goalInput.disabled = true;
  els.chatFeed.innerHTML = initialMessage();
  // DGIST_DEPARTMENT_FIRST_BROWSER_PATCH_END



  // DGIST_RME_OFFICIAL_CURATED_SEARCH_PATCH_START
  // 로봇및기계전자공학과에서만 공식 교수·연구실 정보를 이용한 정밀 검색을 사용합니다.
  // 원본 data.js는 수정하지 않으며 다른 DGIST 학과의 검색 로직도 그대로 유지합니다.
  (function installDgistRmeCuratedSearch() {
    const engine = window.DGISTRobotSearchEngine;
    if (!engine || !engine.db) return;

    const robotDepartment = dgistDepartmentCatalog.find((item) => item.key === "robot");
    if (robotDepartment) robotDepartment.fields = (engine.db.fields || []).map((field) => field.slice());

    Object.keys(engine.db.bannerMap || {}).forEach((fieldKey) => {
      const field = (engine.db.fields || []).find((item) => item[2] === fieldKey);
      dgistSubfieldSearchRules[fieldKey] = {
        query: field ? field[1] : fieldKey,
        professors: (engine.db.bannerMap || {})[fieldKey].slice(),
        evidenceLabel: field ? field[0] : fieldKey
      };
    });

    // 공식 연구실명과 핵심 분야를 표시용 오버레이로 적용합니다. data.js 파일은 변경하지 않습니다.
    const curatedByProfessor = new Map(engine.profiles().map((profile) => [profile.professor, profile]));
    data.labs.filter((lab) => normalize(lab.department || "").includes("로봇및기계전자공학과")).forEach((lab) => {
      const profile = curatedByProfessor.get(lab.professor);
      if (!profile) return;
      dgistLabNameOverrides[lab.id] = profile.labName;
      lab.summary = `${formatProfessorName(lab.professor)}은 ${profile.officialFields.slice(0, 4).join(", ")} 분야를 연구합니다.`;
      lab.topics = profile.officialFields.slice();
    });

    const previousRobotRankLabs = rankLabs;
    rankLabs = function(query, profileQuery) {
      if (dgistActiveDepartmentKey !== "robot") return previousRobotRankLabs(query, profileQuery);
      const actualQuery = String(profileQuery || query || "").trim();
      return engine.search(actualQuery, { limit: 10 }).map((result) => {
        const lab = data.labs.find((candidate) => candidate && candidate.professor === result.profile.professor && dgistLabInActiveDepartment(candidate));
        if (!lab) return null;
        const evidence = unique(result.evidence || []).slice(0, 5);
        return {
          lab,
          score: result.score,
          internalMatch: {
            score: result.score,
            positiveHits: evidence,
            subfieldHits: evidence,
            methodHits: [],
            materialHits: [],
            applicationHits: [],
            weakHits: [],
            negativeHits: [],
            strongHitCount: Math.max(1, evidence.length),
            specificity: Math.min(5, evidence.length),
            blocked: false
          },
          _dgistIntentFirstSpecificHit: true,
          _dgistIntentFirstFineHits: evidence,
          _dgistRmeCurated: true
        };
      }).filter(Boolean);
    };

    const previousRobotEvidenceTerms = dgistInternalEvidenceTerms;
    dgistInternalEvidenceTerms = function(lab, query) {
      if (dgistActiveDepartmentKey === "robot" && lab && curatedByProfessor.has(lab.professor)) {
        const terms = engine.evidenceForProfessor(query, lab.professor);
        if (terms.length) return terms.slice(0, 5);
        return curatedByProfessor.get(lab.professor).officialFields.slice(0, 3);
      }
      return previousRobotEvidenceTerms(lab, query);
    };

    // 직접 입력은 기존 단일 자율주행 화이트리스트를 우회하고 전용 검색기가 처리합니다.
    const previousRobotDirectSearchRule = dgistDirectSearchRule;
    dgistDirectSearchRule = function(query) {
      if (dgistActiveDepartmentKey === "robot") return null;
      return previousRobotDirectSearchRule(query);
    };

    // 학과가 이미 선택된 상태에서 코드가 갱신된 경우에도 새로운 배너를 즉시 표시합니다.
    if (dgistActiveDepartmentKey === "robot") renderExamples();
  })();
  // DGIST_RME_OFFICIAL_CURATED_SEARCH_PATCH_END


  // DGIST_EECS_OFFICIAL_CURATED_SEARCH_PATCH_START
  // 전기전자컴퓨터공학과에서만 공식 교수진 페이지와 연구실 정보를 이용한 정밀 검색을 사용합니다.
  // 원본 data.js는 수정하지 않으며 로봇기계학과 및 다른 학과의 전용/기존 검색은 그대로 유지합니다.
  (function installDgistEecsCuratedSearch() {
    const engine = window.DGISTEecsSearchEngine;
    if (!engine || !engine.db) return;

    const eecsDepartment = dgistDepartmentCatalog.find((item) => item.key === "eecs");
    if (eecsDepartment) eecsDepartment.fields = (engine.db.fields || []).map((field) => field.slice());

    Object.keys(engine.db.bannerMap || {}).forEach((fieldKey) => {
      const field = (engine.db.fields || []).find((item) => item[2] === fieldKey);
      dgistSubfieldSearchRules[fieldKey] = {
        query: field ? field[1] : fieldKey,
        professors: (engine.db.bannerMap || {})[fieldKey].slice(),
        evidenceLabel: field ? field[0] : fieldKey
      };
    });

    // 공식 교수진 페이지에 현재 전임교원으로 등록된 최상현 교수를 런타임 카드 데이터에 추가합니다.
    // 기존 data.js 파일은 그대로 두며, 추천/표시용 객체만 브라우저에서 보완합니다.
    const choiProfile = engine.profiles().find((profile) => profile.professor === "최상현");
    if (choiProfile && !data.labs.some((lab) => lab && lab.professor === "최상현" && normalize(lab.department || "").includes("전기전자컴퓨터공학과"))) {
      data.labs.push({
        id: "eecs-curated-choi-sanghyeon",
        deptKey: "eecs",
        department: "전기전자컴퓨터공학과",
        category: "전임교원",
        professor: "최상현",
        professorEn: "Choi, Sanghyeon",
        title: "조교수",
        homepage: "https://tkdgus299.wixsite.com/mysite",
        labNameKo: choiProfile.labName,
        labNameEn: "Emerging Semiconductor Device Technology Laboratory",
        summary: `${formatProfessorName("최상현")}은 ${choiProfile.officialFields.slice(0, 4).join(", ")} 분야를 연구합니다.`,
        topics: choiProfile.officialFields.slice(),
        keywords: choiProfile.directTerms.slice(),
        domainTags: [], topKeywords: choiProfile.directTerms.slice(), publications: [], publicationCount: 0,
        pdfCourses: [], pdfInternships: [], sourceUrls: choiProfile.sourceUrls.slice(),
        retrievalText: ["최상현", "Choi, Sanghyeon", ...choiProfile.officialFields, ...choiProfile.directTerms].join("\n")
      });
    }

    const curatedByProfessor = new Map(engine.profiles().map((profile) => [profile.professor, profile]));
    data.labs.filter((lab) => normalize(lab.department || "").includes("전기전자컴퓨터공학과")).forEach((lab) => {
      const profile = curatedByProfessor.get(lab.professor);
      if (!profile) return;
      dgistLabNameOverrides[lab.id] = profile.labName;
      lab.summary = `${formatProfessorName(lab.professor)}은 ${profile.officialFields.slice(0, 4).join(", ")} 분야를 연구합니다.`;
      lab.topics = profile.officialFields.slice();
    });

    const previousEecsRankLabs = rankLabs;
    rankLabs = function(query, profileQuery) {
      if (dgistActiveDepartmentKey !== "eecs") return previousEecsRankLabs(query, profileQuery);
      const actualQuery = String(profileQuery || query || "").trim();
      return engine.search(actualQuery, { limit: 10 }).map((result) => {
        const lab = data.labs.find((candidate) => candidate && candidate.professor === result.profile.professor && dgistLabInActiveDepartment(candidate));
        if (!lab) return null;
        const evidence = unique(result.evidence || []).slice(0, 5);
        return {
          lab,
          score: result.score,
          internalMatch: {
            score: result.score, positiveHits: evidence, subfieldHits: evidence,
            methodHits: [], materialHits: [], applicationHits: [], weakHits: [], negativeHits: [],
            strongHitCount: Math.max(1, evidence.length), specificity: Math.min(5, evidence.length), blocked: false
          },
          _dgistIntentFirstSpecificHit: true,
          _dgistIntentFirstFineHits: evidence,
          _dgistEecsCurated: true
        };
      }).filter(Boolean);
    };

    const previousEecsEvidenceTerms = dgistInternalEvidenceTerms;
    dgistInternalEvidenceTerms = function(lab, query) {
      if (dgistActiveDepartmentKey === "eecs" && lab && curatedByProfessor.has(lab.professor)) {
        const terms = engine.evidenceForProfessor(query, lab.professor);
        if (terms.length) return terms.slice(0, 5);
        return curatedByProfessor.get(lab.professor).officialFields.slice(0, 3);
      }
      return previousEecsEvidenceTerms(lab, query);
    };

    // 전전컴 직접 검색은 기존의 넓은 자동 태그 및 단일 화이트리스트를 우회하고 전용 검색기가 처리합니다.
    const previousEecsDirectSearchRule = dgistDirectSearchRule;
    dgistDirectSearchRule = function(query) {
      if (dgistActiveDepartmentKey === "eecs") return null;
      return previousEecsDirectSearchRule(query);
    };

    if (dgistActiveDepartmentKey === "eecs") renderExamples();
  })();
  // DGIST_EECS_OFFICIAL_CURATED_SEARCH_PATCH_END


  // DGIST_BRAIN_OFFICIAL_CURATED_SEARCH_PATCH_START
  // 뇌과학과에서만 공식 교수진·연구실 정보를 이용한 정밀 검색을 사용합니다.
  // 원본 data.js는 수정하지 않으며 로봇기계학과·전전컴 및 다른 학과 검색은 그대로 유지합니다.
  (function installDgistBrainCuratedSearch() {
    const engine = window.DGISTBrainSearchEngine;
    if (!engine || !engine.db) return;

    const brainDepartment = dgistDepartmentCatalog.find((item) => item.key === "brain");
    if (brainDepartment) brainDepartment.fields = (engine.db.fields || []).map((field) => field.slice());

    Object.keys(engine.db.bannerMap || {}).forEach((fieldKey) => {
      const field = (engine.db.fields || []).find((item) => item[2] === fieldKey);
      dgistSubfieldSearchRules[fieldKey] = {
        query: field ? field[1] : fieldKey,
        professors: (engine.db.bannerMap || {})[fieldKey].slice(),
        evidenceLabel: field ? field[0] : fieldKey
      };
    });

    // 잘려 있던 연구실명과 표시용 연구 분야를 공식 자료 기반 오버레이로 교체합니다.
    const curatedByProfessor = new Map(engine.profiles().map((profile) => [profile.professor, profile]));
    data.labs.filter((lab) => normalize(lab.department || "").includes("뇌과학과")).forEach((lab) => {
      const profile = curatedByProfessor.get(lab.professor);
      if (!profile) return;
      dgistLabNameOverrides[lab.id] = profile.labName;
      lab.summary = `${formatProfessorName(lab.professor)}은 ${profile.officialFields.slice(0, 4).join(", ")} 분야를 연구합니다.`;
      lab.topics = profile.officialFields.slice();
    });

    const previousBrainRankLabs = rankLabs;
    rankLabs = function(query, profileQuery) {
      if (dgistActiveDepartmentKey !== "brain") return previousBrainRankLabs(query, profileQuery);
      const actualQuery = String(profileQuery || query || "").trim();
      return engine.search(actualQuery, { limit: 10 }).map((result) => {
        const lab = data.labs.find((candidate) =>
          candidate && candidate.professor === result.profile.professor && dgistLabInActiveDepartment(candidate)
        );
        if (!lab) return null;
        const evidence = unique(result.evidence || []).slice(0, 5);
        return {
          lab,
          score: result.score,
          internalMatch: {
            score: result.score,
            positiveHits: evidence,
            subfieldHits: evidence,
            methodHits: [],
            materialHits: [],
            applicationHits: [],
            weakHits: [],
            negativeHits: [],
            strongHitCount: Math.max(1, evidence.length),
            specificity: Math.min(5, evidence.length),
            blocked: false
          },
          _dgistIntentFirstSpecificHit: true,
          _dgistIntentFirstFineHits: evidence,
          _dgistBrainCurated: true
        };
      }).filter(Boolean);
    };

    const previousBrainEvidenceTerms = dgistInternalEvidenceTerms;
    dgistInternalEvidenceTerms = function(lab, query) {
      if (dgistActiveDepartmentKey === "brain" && lab && curatedByProfessor.has(lab.professor)) {
        const terms = engine.evidenceForProfessor(query, lab.professor);
        if (terms.length) return terms.slice(0, 5);
        return curatedByProfessor.get(lab.professor).officialFields.slice(0, 3);
      }
      return previousBrainEvidenceTerms(lab, query);
    };

    // 뇌과학과 직접 검색은 기존 넓은 자동 태그를 우회하고 전용 검색기가 처리합니다.
    const previousBrainDirectSearchRule = dgistDirectSearchRule;
    dgistDirectSearchRule = function(query) {
      if (dgistActiveDepartmentKey === "brain") return null;
      return previousBrainDirectSearchRule(query);
    };

    if (dgistActiveDepartmentKey === "brain") renderExamples();
  })();
  // DGIST_BRAIN_OFFICIAL_CURATED_SEARCH_PATCH_END


  // DGIST_ENERGY_OFFICIAL_CURATED_SEARCH_PATCH_START
  // 에너지공학과에서만 공식 교수진·연구실 정보를 이용한 정밀 검색을 사용합니다.
  // 원본 data.js는 수정하지 않으며 로봇기계·전전컴·뇌과학과 및 다른 학과 검색은 그대로 유지합니다.
  (function installDgistEnergyCuratedSearch() {
    const engine = window.DGISTEnergySearchEngine;
    if (!engine || !engine.db) return;

    const energyDepartment = dgistDepartmentCatalog.find((item) => item.key === "energy");
    if (energyDepartment) energyDepartment.fields = (engine.db.fields || []).map((field) => field.slice());

    Object.keys(engine.db.bannerMap || {}).forEach((fieldKey) => {
      const field = (engine.db.fields || []).find((item) => item[2] === fieldKey);
      dgistSubfieldSearchRules[fieldKey] = {
        query: field ? field[1] : fieldKey,
        professors: (engine.db.bannerMap || {})[fieldKey].slice(),
        evidenceLabel: field ? field[0] : fieldKey
      };
    });

    // 표시용 연구실명과 핵심 분야를 공식 자료 기반 오버레이로 교체합니다.
    const curatedByProfessor = new Map(engine.profiles().map((profile) => [profile.professor, profile]));
    data.labs.filter((lab) => normalize(lab.department || "").includes("에너지공학과")).forEach((lab) => {
      const profile = curatedByProfessor.get(lab.professor);
      if (!profile) return;
      dgistLabNameOverrides[lab.id] = profile.labName;
      lab.summary = `${formatProfessorName(lab.professor)}은 ${profile.officialFields.slice(0, 4).join(", ")} 분야를 연구합니다.`;
      lab.topics = profile.officialFields.slice();
    });

    const previousEnergyRankLabs = rankLabs;
    rankLabs = function(query, profileQuery) {
      if (dgistActiveDepartmentKey !== "energy") return previousEnergyRankLabs(query, profileQuery);
      const actualQuery = String(profileQuery || query || "").trim();
      return engine.search(actualQuery, { limit: 10 }).map((result) => {
        const lab = data.labs.find((candidate) =>
          candidate && candidate.professor === result.profile.professor && dgistLabInActiveDepartment(candidate)
        );
        if (!lab) return null;
        const evidence = unique(result.evidence || []).slice(0, 5);
        return {
          lab,
          score: result.score,
          internalMatch: {
            score: result.score,
            positiveHits: evidence,
            subfieldHits: evidence,
            methodHits: [],
            materialHits: [],
            applicationHits: [],
            weakHits: [],
            negativeHits: [],
            strongHitCount: Math.max(1, evidence.length),
            specificity: Math.min(5, evidence.length),
            blocked: false
          },
          _dgistIntentFirstSpecificHit: true,
          _dgistIntentFirstFineHits: evidence,
          _dgistEnergyCurated: true
        };
      }).filter(Boolean);
    };

    const previousEnergyEvidenceTerms = dgistInternalEvidenceTerms;
    dgistInternalEvidenceTerms = function(lab, query) {
      if (dgistActiveDepartmentKey === "energy" && lab && curatedByProfessor.has(lab.professor)) {
        const terms = engine.evidenceForProfessor(query, lab.professor);
        if (terms.length) return terms.slice(0, 5);
        return curatedByProfessor.get(lab.professor).officialFields.slice(0, 3);
      }
      return previousEnergyEvidenceTerms(lab, query);
    };

    // 에너지공학과 직접 검색은 기존 넓은 자동 태그를 우회하고 전용 검색기가 처리합니다.
    const previousEnergyDirectSearchRule = dgistDirectSearchRule;
    dgistDirectSearchRule = function(query) {
      if (dgistActiveDepartmentKey === "energy") return null;
      return previousEnergyDirectSearchRule(query);
    };

    if (dgistActiveDepartmentKey === "energy") renderExamples();
  })();
  // DGIST_ENERGY_OFFICIAL_CURATED_SEARCH_PATCH_END



  // DGIST_NEWBIOLOGY_OFFICIAL_CURATED_SEARCH_PATCH_START
  // 뉴바이올로지학과에서만 공식 교수진·연구 클러스터 기반 정밀 검색을 사용합니다.
  // 원본 data.js와 기존 로봇기계·전전컴·뇌과학·에너지 검색기는 유지합니다.
  (function installDgistNewBiologyCuratedSearch() {
    const engine = window.DGISTNewBiologySearchEngine;
    if (!engine || !engine.db) return;

    const department = dgistDepartmentCatalog.find((item) => item.key === "newbiology");
    if (department) department.fields = (engine.db.fields || []).map((field) => field.slice());

    Object.keys(engine.db.bannerMap || {}).forEach((fieldKey) => {
      const field = (engine.db.fields || []).find((item) => item[2] === fieldKey);
      dgistSubfieldSearchRules[fieldKey] = {
        query: field ? field[1] : fieldKey,
        professors: (engine.db.bannerMap || {})[fieldKey].slice(),
        evidenceLabel: field ? field[0] : fieldKey
      };
    });

    const curatedByProfessor = new Map(engine.profiles().map((profile) => [profile.professor, profile]));
    data.labs.filter((lab) => normalize(lab.department || "").includes("뉴바이올로지학과")).forEach((lab) => {
      const profile = curatedByProfessor.get(lab.professor);
      if (!profile) return;
      dgistLabNameOverrides[lab.id] = profile.labName;
      lab.summary = `${formatProfessorName(lab.professor)}은 ${profile.officialFields.slice(0, 4).join(", ")} 분야를 연구합니다.`;
      lab.topics = profile.officialFields.slice();
    });

    const previousRankLabs = rankLabs;
    rankLabs = function(query, profileQuery) {
      if (dgistActiveDepartmentKey !== "newbiology") return previousRankLabs(query, profileQuery);
      const actualQuery = String(profileQuery || query || "").trim();
      return engine.search(actualQuery, { limit: 10 }).map((result) => {
        const lab = data.labs.find((candidate) => candidate && candidate.professor === result.profile.professor && dgistLabInActiveDepartment(candidate));
        if (!lab) return null;
        const evidence = unique(result.evidence || []).slice(0, 5);
        return {lab,score:result.score,internalMatch:{score:result.score,positiveHits:evidence,subfieldHits:evidence,methodHits:[],materialHits:[],applicationHits:[],weakHits:[],negativeHits:[],strongHitCount:Math.max(1,evidence.length),specificity:Math.min(5,evidence.length),blocked:false},_dgistIntentFirstSpecificHit:true,_dgistIntentFirstFineHits:evidence,_dgistNewBiologyCurated:true};
      }).filter(Boolean);
    };

    const previousEvidenceTerms = dgistInternalEvidenceTerms;
    dgistInternalEvidenceTerms = function(lab, query) {
      if (dgistActiveDepartmentKey === "newbiology" && lab && curatedByProfessor.has(lab.professor)) {
        const terms = engine.evidenceForProfessor(query, lab.professor);
        if (terms.length) return terms.slice(0, 5);
        return curatedByProfessor.get(lab.professor).officialFields.slice(0, 3);
      }
      return previousEvidenceTerms(lab, query);
    };

    const previousDirectSearchRule = dgistDirectSearchRule;
    dgistDirectSearchRule = function(query) {
      if (dgistActiveDepartmentKey === "newbiology") return null;
      return previousDirectSearchRule(query);
    };

    if (dgistActiveDepartmentKey === "newbiology") renderExamples();
  })();
  // DGIST_NEWBIOLOGY_OFFICIAL_CURATED_SEARCH_PATCH_END



  // DGIST_PHYSCHEM_OFFICIAL_CURATED_SEARCH_PATCH_START
  // 화학물리학과에서만 현재 공식 교수진과 연구 영역 기반 정밀 검색을 사용합니다.
  // 원본 data.js는 유지하며 기존 로봇기계·전전컴·뇌과학·에너지·뉴바이올로지 정제 검색기도 유지합니다.
  (function installDgistPhysChemCuratedSearch() {
    const engine = window.DGISTPhysChemSearchEngine;
    if (!engine || !engine.db) return;

    const department = dgistDepartmentCatalog.find((item) => item.key === "physchem");
    if (department) department.fields = (engine.db.fields || []).map((field) => field.slice());

    Object.keys(engine.db.bannerMap || {}).forEach((fieldKey) => {
      const field = (engine.db.fields || []).find((item) => item[2] === fieldKey);
      dgistSubfieldSearchRules[fieldKey] = {
        query: field ? field[1] : fieldKey,
        professors: (engine.db.bannerMap || {})[fieldKey].slice(),
        evidenceLabel: field ? field[0] : fieldKey
      };
    });

    const curatedByProfessor = new Map(engine.profiles().map((profile) => [profile.professor, profile]));
    const currentFaculty = new Set(curatedByProfessor.keys());

    // 현재 공식 교수진에 있으나 원본 정적 DB에는 없는 교수 카드를 런타임에 보완합니다.
    engine.profiles().forEach((profile) => {
      const exists = data.labs.some((lab) => lab && lab.professor === profile.professor && normalize(lab.department || "").includes("화학물리학과"));
      if (exists) return;
      data.labs.push({
        id: `physchem-curated-${normalize(profile.professorEn || profile.professor).replace(/[^a-z0-9가-힣]+/g, "-")}`,
        deptKey: "physchem", department: "화학물리학과", category: "전임교원",
        professor: profile.professor, professorEn: profile.professorEn || "", title: profile.title || "교수",
        homepage: profile.homepage || (profile.sourceUrls || [])[0] || "",
        labNameKo: profile.labName, labNameEn: "",
        summary: `${formatProfessorName(profile.professor)}은 ${profile.officialFields.slice(0,4).join(", ")} 분야를 연구합니다.`,
        topics: profile.officialFields.slice(), keywords: profile.directTerms.slice(), domainTags: [],
        topKeywords: profile.directTerms.slice(), publications: [], publicationCount: 0,
        pdfCourses: [], pdfInternships: [], sourceUrls: (profile.sourceUrls || []).slice(),
        retrievalText: [profile.professor, profile.professorEn || "", profile.labName, ...profile.officialFields, ...profile.directTerms].join("\n")
      });
    });

    // 현재 공식 교수진의 연구실명과 핵심 분야만 표시용 오버레이로 적용합니다.
    data.labs.filter((lab) => normalize(lab.department || "").includes("화학물리학과")).forEach((lab) => {
      const profile = curatedByProfessor.get(lab.professor);
      if (!profile) return;
      dgistLabNameOverrides[lab.id] = profile.labName;
      lab.summary = `${formatProfessorName(lab.professor)}은 ${profile.officialFields.slice(0,4).join(", ")} 분야를 연구합니다.`;
      lab.topics = profile.officialFields.slice();
    });

    const previousProfessorMatches = dgistDirectProfessorMatches;
    dgistDirectProfessorMatches = function(query) {
      const matches = previousProfessorMatches(query) || [];
      if (dgistActiveDepartmentKey !== "physchem") return matches;
      return matches.filter((item) => item && item.lab && currentFaculty.has(item.lab.professor));
    };

    const previousHasSpecificQuery = dgistIntentFirstHasSpecificQuery;
    dgistIntentFirstHasSpecificQuery = function(query) {
      if (dgistActiveDepartmentKey === "physchem" && engine.search(String(query || ""), { limit: 1 }).length) return true;
      return previousHasSpecificQuery(query);
    };

    const previousRankLabs = rankLabs;
    rankLabs = function(query, profileQuery) {
      if (dgistActiveDepartmentKey !== "physchem") return previousRankLabs(query, profileQuery);
      const actualQuery = String(profileQuery || query || "").trim();
      return engine.search(actualQuery, { limit: 10 }).map((result) => {
        const lab = data.labs.find((candidate) => candidate && candidate.professor === result.profile.professor && dgistLabInActiveDepartment(candidate));
        if (!lab) return null;
        const evidence = unique(result.evidence || []).slice(0,5);
        return { lab, score: result.score, internalMatch: { score: result.score, positiveHits:evidence, subfieldHits:evidence, methodHits:[], materialHits:[], applicationHits:[], weakHits:[], negativeHits:[], strongHitCount:Math.max(1,evidence.length), specificity:Math.min(5,evidence.length), blocked:false }, _dgistIntentFirstSpecificHit:true, _dgistIntentFirstFineHits:evidence, _dgistPhysChemCurated:true };
      }).filter(Boolean);
    };

    const previousEvidenceTerms = dgistInternalEvidenceTerms;
    dgistInternalEvidenceTerms = function(lab, query) {
      if (dgistActiveDepartmentKey === "physchem" && lab && curatedByProfessor.has(lab.professor)) {
        const terms = engine.evidenceForProfessor(query, lab.professor);
        if (terms.length) return terms.slice(0,5);
        return curatedByProfessor.get(lab.professor).officialFields.slice(0,3);
      }
      return previousEvidenceTerms(lab, query);
    };

    const previousDirectSearchRule = dgistDirectSearchRule;
    dgistDirectSearchRule = function(query) {
      if (dgistActiveDepartmentKey === "physchem") return null;
      return previousDirectSearchRule(query);
    };

    if (dgistActiveDepartmentKey === "physchem") renderExamples();
  })();
  // DGIST_PHYSCHEM_OFFICIAL_CURATED_SEARCH_PATCH_END

  // DGIST_FINAL_BETA_FIX_END

})();
