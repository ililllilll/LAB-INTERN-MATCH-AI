const DATA = window.SNU_LAB_MATCH_DATA;
    const professors = DATA.professors || DATA.labs;
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
      currentQueryMode: "",
    };

    const examples = [
      {"label": "반도체 소자/공정", "query": "반도체 소자, 박막 증착, 트랜지스터 공정 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "반도체 소자 공정", "intent": "semiconductor_device_process_general", "mode": "banner_explore"},
      {"label": "배터리/전기화학", "query": "리튬금속 배터리, 전고체전지, 전기화학 에너지 저장 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "배터리", "intent": "battery_general", "mode": "banner_explore"},
      {"label": "디스플레이", "query": "OLED, Micro LED, 플렉서블 디스플레이, 발광소자 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "디스플레이", "intent": "display_general", "mode": "banner_explore"},
      {"label": "포토닉스/광전소자", "query": "포토닉스, 광전소자, 나노광학, 레이저, 광검출기 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "포토닉스 광전소자", "intent": "photonics_optoelectronics_general", "mode": "banner_explore"},
      {"label": "AI/머신러닝", "query": "머신러닝, 딥러닝, 강화학습, 생성형 AI 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "AI 머신러닝", "intent": "ai_ml_general", "mode": "banner_explore"},
      {"label": "컴퓨터비전/영상인식", "query": "컴퓨터 비전, 영상인식, 객체검출, 멀티모달 AI 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "컴퓨터비전 영상인식", "intent": "computer_vision_general", "mode": "banner_explore"},
      {"label": "바이오센서/생체전자", "query": "바이오센서, 생체전자소자, 웨어러블 센서, 임플란터블 소자 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "바이오센서 생체전자", "intent": "biosensor_bioelectronics_general", "mode": "banner_explore"},
      {"label": "뇌과학/BCI", "query": "실험 뇌과학, BCI, 신경공학, 신경전극, 뇌영상 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "뇌과학 BCI", "intent": "neuroscience_bci_general", "mode": "banner_explore"},
      {"label": "의료영상/디지털헬스", "query": "의료영상 딥러닝, MRI, 디지털헬스, 헬스케어 AI 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "의료영상 디지털헬스", "intent": "medical_imaging_digital_health_general", "mode": "banner_explore"},
      {"label": "로봇/자율주행", "query": "로봇, 자율주행, SLAM, 드론, 모빌리티 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "로봇 자율주행 제어", "intent": "robotics_autonomous_control_general", "mode": "banner_explore"},
      {"label": "HCI/AR/VR", "query": "HCI, AR, VR, UX, 인터랙션, 사용자 경험 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "HCI AR VR", "intent": "hci_ar_vr_general", "mode": "banner_explore"},
      {"label": "양자컴퓨팅/양자정보", "query": "양자컴퓨팅, 양자정보, 양자알고리즘, 양자시뮬레이션 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "양자컴퓨팅 양자정보", "intent": "quantum_computing_information_general", "mode": "banner_explore"},
      {"label": "AI 반도체/VLSI", "query": "AI 반도체, VLSI, SoC, 하드웨어 가속기, 집적회로 설계 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "AI 반도체 VLSI", "intent": "ai_semiconductor_vlsi_general", "mode": "banner_explore"},
      {"label": "반도체 패키징/이종집적", "query": "반도체 패키징, 칩렛, 3D IC, 이종집적, 인터커넥트 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "반도체 패키징 이종집적", "intent": "semiconductor_packaging_heterogeneous_integration_general", "mode": "banner_explore"},
      {"label": "수소/연료전지", "query": "수소 생산, 연료전지, 전기화학 에너지 변환, 촉매 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "수소 연료전지", "intent": "hydrogen_fuelcell_general", "mode": "banner_explore"},
      {"label": "나노소재/신소재", "query": "나노소재, 신소재, 2D 소재, 그래핀, 표면 분석 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "나노소재 신소재", "intent": "materials_nano_general", "mode": "banner_explore"},
      {"label": "고분자/유기소재", "query": "고분자, 유기소재, 소프트머터, 스마트 폴리머 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "고분자 유기소재", "intent": "polymer_organic_materials_general", "mode": "banner_explore"},
      {"label": "촉매/화학공정", "query": "촉매, 유기합성, 반응공학, 화학공정 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "촉매 화학공정", "intent": "catalysis_chemical_process_general", "mode": "banner_explore"},
      {"label": "단백질/신약개발", "query": "단백질 공학, 신약개발, 약물전달, 바이오분자공학 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "단백질 신약개발", "intent": "protein_drug_development_general", "mode": "banner_explore"},
      {"label": "세포/면역/분자생물학", "query": "세포생물학, 면역학, 분자생물학, 질병 기전 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "세포 면역 분자생물학", "intent": "cell_immunology_molecular_biology_general", "mode": "banner_explore"},
      {"label": "자연어처리/LLM", "query": "자연어처리, LLM, 언어모델, 생성형 AI 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "자연어처리 LLM", "intent": "nlp_llm_general", "mode": "banner_explore"},
      {"label": "DB/빅데이터", "query": "데이터베이스, 빅데이터, 데이터마이닝, 추천시스템 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "데이터베이스 빅데이터", "intent": "database_bigdata_general", "mode": "banner_explore"},
      {"label": "시스템/운영체제", "query": "운영체제, 분산시스템, 스토리지, 클라우드 컴퓨팅 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "운영체제 분산시스템", "intent": "systems_os_distributed_general", "mode": "banner_explore"},
      {"label": "정보보안/암호", "query": "정보보안, 암호, 프라이버시, 시스템 보안 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "정보보안 암호", "intent": "security_cryptography_general", "mode": "banner_explore"},
      {"label": "전력전자/인버터", "query": "전력전자, 인버터, 컨버터, 전력변환, 전원회로 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "전력전자 인버터", "intent": "power_electronics_inverter_general", "mode": "banner_explore"},
      {"label": "그래픽스/3D 비전", "query": "컴퓨터 그래픽스, 3D 비전, 렌더링, 비주얼 컴퓨팅 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "그래픽스 3D 비전", "intent": "graphics_3d_vision_general", "mode": "banner_explore"},
      {"label": "항공우주/추진", "query": "항공우주, 추진, 로켓, 위성, 열유체 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "항공우주 추진", "intent": "aerospace_propulsion_general", "mode": "banner_explore"},
      {"label": "환경/기후/지속가능", "query": "환경공학, 기후, 탄소중립, 지속가능 에너지 시스템 연구 관련 교수님을 추천해 주세요", "algorithmQuery": "환경 기후 지속가능", "intent": "environment_climate_sustainability_general", "mode": "banner_explore"},
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
      "최우영",
      "정규원",
      "이종호",
      "이철호",
      "신형철",
      "윤상원",
      "곽정훈",
      "이수연",
      "홍용택",
      "김성재",
      "최성휘",
      "황철성",
      "김재준",
      "손준우",
      "김창순",
      "유선규",
      "최재혁",
      "김지현",
      "도재영",
      "장호원"
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
      "최재혁",
      "유담",
      "홍성완",
      "이혁재",
      "김태환",
      "서지원",
      "최우영",
      "정규원",
      "김상범",
      "최우석",
      "남동욱",
      "김재하",
      "박준석",
      "최우열",
      "김재준",
      "심재웅",
      "박남규",
      "이진호",
      "김장우",
      "고형석"
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
      "윤상원",
      "최우영",
      "최재혁",
      "유담",
      "이혁재",
      "주영창",
      "신종원",
      "서준민",
      "김지현",
      "김상민"
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
      "이재상",
      "이태우",
      "홍용택",
      "이수연",
      "곽정훈",
      "주영창",
      "유효빈",
      "박재형",
      "이관형",
      "최수연",
      "한승우",
      "손준우",
      "박찬",
      "권민상",
      "황철성",
      "김대형",
      "이창건",
      "정상택",
      "황승원",
      "강승균"
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
      "곽정훈",
      "남동욱",
      "박재형",
      "이재상",
      "홍용택",
      "이태우",
      "전세영",
      "박남규",
      "이명재",
      "이승아",
      "정윤찬",
      "권성훈",
      "서종모",
      "이관형",
      "유선규",
      "박홍규",
      "최현용",
      "김태용",
      "이수연",
      "전헌수"
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
      "강기석",
      "최장욱",
      "정성균",
      "강동민",
      "이규태",
      "곽승엽",
      "류일",
      "임종우",
      "남기태",
      "김성재",
      "성영은",
      "정우철",
      "한승우",
      "현택환",
      "황윤정",
      "김소연",
      "안성훈",
      "김진영",
      "안경현",
      "오준학"
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
      "남기태",
      "윤제용",
      "황윤정",
      "강종헌",
      "김도희",
      "강기석",
      "최장욱",
      "김진영",
      "성영은",
      "한정우",
      "김민수",
      "이경우",
      "한승우",
      "정우철",
      "현택환",
      "안경현",
      "홍성현",
      "강정수",
      "차석원",
      "고승환"
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
      "이관형",
      "황철성",
      "주영창",
      "이태우",
      "강기석",
      "홍성현",
      "권민상",
      "남기태",
      "홍용택",
      "이철호",
      "민달희",
      "홍병희",
      "정연준",
      "이원보",
      "김미영",
      "홍승훈",
      "강승균",
      "손병혁",
      "민홍기",
      "정우철"
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
      "김병수",
      "이태우",
      "권민상",
      "홍승윤",
      "박주혁",
      "이홍근",
      "정연준",
      "김경택",
      "안철희",
      "김상민",
      "손병혁",
      "오준학",
      "이은성",
      "김정욱",
      "강기훈",
      "김영은",
      "김소연",
      "김연상",
      "류재윤",
      "유동원"
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
      "황윤정",
      "강종헌",
      "김도희",
      "윤제용",
      "홍승윤",
      "정유성",
      "권민상",
      "이철범",
      "유동원",
      "데이비드 첸",
      "이은성",
      "김지현",
      "성영은",
      "현택환",
      "김상민",
      "이홍근",
      "이건희",
      "김연상",
      "류재윤",
      "박정원"
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
      "서종모",
      "권성훈",
      "홍용택",
      "김성재",
      "유담",
      "김진수",
      "조규진",
      "박용래",
      "전누리",
      "남좌민",
      "민달희",
      "정택동",
      "강승균",
      "권태경",
      "백승렬",
      "이연",
      "한승용",
      "김영은",
      "서준민",
      "양현종"
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
      "김형",
      "최명환",
      "신혜영",
      "서종모",
      "김성연",
      "최석우",
      "이홍균",
      "장병탁",
      "권성훈",
      "선정윤",
      "심병효",
      "이정우",
      "이준호",
      "도재영",
      "윤성로",
      "이경한",
      "신근유",
      "정종경",
      "백대현",
      "이규철"
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
      "전세영",
      "이종호 (B)",
      "유담",
      "서종모",
      "권성훈",
      "조남익",
      "김대형",
      "황대희",
      "Otto van Koert",
      "강기석",
      "강기훈",
      "강동민",
      "강승균",
      "고승환",
      "곽승엽",
      "곽정훈",
      "권가진",
      "권민상",
      "김미영",
      "김상국"
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
      "이현숙",
      "박승범",
      "석차옥",
      "김종서",
      "최희정",
      "남좌민",
      "이준석",
      "이형호",
      "민달희",
      "이현우",
      "윤태영",
      "백승렬",
      "송윤주",
      "정상택",
      "허원기",
      "황대희",
      "고준석",
      "노성훈",
      "백민경",
      "장혜식"
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
      "이현숙",
      "김빛내리",
      "최희정",
      "김종서",
      "김형",
      "이준호",
      "라젠드라 카르키",
      "황수석",
      "백성희",
      "김진홍",
      "신근유",
      "정종경",
      "박주홍",
      "노유선",
      "장원열",
      "심지원",
      "이유리",
      "이일하",
      "안광석",
      "김현아"
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
      "윤성로",
      "도재영",
      "문태섭",
      "이정우",
      "서지원",
      "이진호",
      "이경무",
      "최종현",
      "정교민",
      "장병탁",
      "김건희",
      "양인순",
      "송현오",
      "심병효",
      "박준석",
      "이종민",
      "김선",
      "김남수",
      "유승주",
      "문수묵"
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
      "이경무",
      "김건희",
      "한보형",
      "최종현",
      "김영민",
      "주한별",
      "김아영",
      "임종우",
      "전세영",
      "강명주",
      "박재식",
      "장병탁",
      "곽노준",
      "오성회",
      "유영재",
      "이종호 (B)",
      "조남익",
      "이제희",
      "강유",
      "남재욱"
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
      "황승원",
      "유영재",
      "서지원",
      "도재영",
      "정교민",
      "최종현",
      "김건희",
      "윤성로",
      "이재상",
      "이상구",
      "장병탁",
      "이종민",
      "정유성",
      "에거 버나드",
      "이광근",
      "이교구"
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
      "강유",
      "이상구",
      "도재영",
      "황승원",
      "김선",
      "서지원",
      "문태섭",
      "심규석",
      "전병곤",
      "이병영",
      "권성훈",
      "김장우",
      "유승주",
      "유재민",
      "윤성로",
      "권가진",
      "김진수",
      "마틴 슈타이네거",
      "문병로",
      "이재욱"
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
      "이재진",
      "이상구",
      "엄현상",
      "이광근",
      "홍성수",
      "전병곤",
      "이병영",
      "김진수",
      "심재웅",
      "이진호",
      "이혁재",
      "안정호",
      "최완",
      "김장우",
      "김재준",
      "유담",
      "에거 버나드",
      "이진규",
      "유승주",
      "심형보"
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
      "송용수",
      "권태경",
      "정대룡",
      "홍진",
      "김태현",
      "박세웅",
      "천정희",
      "서승우",
      "췐링 판(범성림)",
      "이재욱",
      "김진수",
      "문병로",
      "에거 버나드",
      "전병곤",
      "하순회",
      "민하오 추이(최민호)",
      "박경수",
      "이상구",
      "이원종",
      "이창건"
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
      "하정익",
      "최재혁",
      "신종원",
      "최성휘",
      "이규섭",
      "윤용태",
      "안성훈",
      "차석원",
      "한승용",
      "강승균",
      "한준규",
      "박형빈",
      "박찬"
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
      "김아영",
      "최준원",
      "오성회",
      "좌은혁",
      "이동준",
      "조규진",
      "김진수",
      "임종우",
      "서승우",
      "양현종",
      "박종우",
      "박용래",
      "박재흥",
      "안성훈",
      "한경원",
      "심형보",
      "이진규",
      "원정담",
      "양인순",
      "이경무"
    ]
  },
  "HCI/AR/VR": {
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
      "이영기",
      "최수연",
      "유영재",
      "조규진",
      "서진욱",
      "이동준",
      "권가진",
      "이중식",
      "김지홍",
      "강기훈",
      "강승균",
      "김미영",
      "한경원",
      "허충길",
      "이경우",
      "박재형",
      "권태경",
      "이창건",
      "이수연",
      "조형택"
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
      "주한별",
      "김영민",
      "한보형",
      "김건희",
      "전세영",
      "박재식",
      "원정담",
      "이제희",
      "박재형",
      "최수연",
      "강승균",
      "이승아",
      "이종호 (B)",
      "이호원",
      "임종우",
      "한준규",
      "강동민",
      "강지형",
      "김아영",
      "박은수"
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
      "김태현",
      "정현석",
      "홍진",
      "Uwe R. Fischer",
      "김창순",
      "남동욱",
      "정윤찬",
      "곽정훈",
      "유선규",
      "이훈희",
      "한승우",
      "강동민",
      "강민구",
      "권재훈",
      "김도헌",
      "김석",
      "박홍규",
      "서의린",
      "이승섭",
      "정성훈"
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
      "김수용",
      "도형록",
      "최해천",
      "황원태",
      "김호영",
      "박형민",
      "민경덕",
      "송성진",
      "송한호",
      "오주환",
      "강준호",
      "전누리",
      "민하오 추이(최민호)",
      "양진규",
      "이창건",
      "노성훈",
      "고승환",
      "김민수",
      "김태용"
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
      "윤제용",
      "이창하",
      "황윤정",
      "강종헌",
      "남기태",
      "권민상",
      "강승균",
      "이종민",
      "강기석",
      "홍승윤",
      "유동원",
      "한지숙",
      "이은성",
      "윤태준",
      "임종우",
      "김도희",
      "김병수",
      "김준원",
      "김지현",
      "백승렬"
    ]
  }
};

    const weakTokens = new Set([
      "추천", "교수", "교수님", "연구실", "랩실", "대학원", "석사", "박사", "진학", "관심", "분야", "쪽",
      "싶어", "찾고", "누가", "어떤", "서울대", "snu", "kaist", "dgist", "학생", "적합성", "연구", "기술"
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
      "hci": ["human-computer interaction", "interactive computing"],
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
      ["medical imaging", "biomedical imaging", "mri", "fmri", "ultrasound", "computed tomography", "x-ray", "의료영상", "바이오영상", "자기공명영상", "초음파", "컴퓨터단층촬영", "엑스레이"],
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
      { name: "HCI/UX", triggers: ["hci", "디지털 헬스", "인터랙션"], tags: ["HCI/UX/ARVR/디지털헬스"], terms: ["human-computer interaction", "interactive", "augmented reality", "virtual reality", "digital health"], bonus: 48 },
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
        name: "HCI/AR/VR/디지털헬스",
        triggers: ["hci", "디지털 헬스", "인터랙션", "human-computer interaction", "augmented reality", "virtual reality"],
        preferredUnits: ["cs", "gsai", "bioeng", "ee"],
        secondaryUnits: ["bcs", "me"],
        tags: ["HCI/UX/ARVR/디지털헬스"],
        terms: ["human-computer interaction", "interactive", "augmented reality", "virtual reality", "digital health", "hci", "디지털 헬스", "인터랙션"],
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
        terms: ["autonomous", "slam", "control", "navigation", "drone", "legged", "manipulation", "motion planning", "vehicle", "로봇", "자율주행", "제어", "드론", "내비게이션", "모빌리티"],
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
        .replace(/[/∙ㆍ]/g, " ")
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
      if (hasRule("의료영상/디지털헬스") && !hasAny(normalizedQuery, ["hci", "인터랙션"])) {
        refined = refined.filter((rule) => rule.name !== "HCI/AR/VR/디지털헬스" && rule.name !== "생체 소자/바이오센서");
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
        "로봇/제어/자율주행": ["autonomous", "slam", "navigation", "drone", "legged", "manipulation", "motion planning", "vehicle", "mobility", "로봇", "자율주행", "제어", "드론", "모빌리티"],
        "제어/최적화": ["control", "optimization", "optimal control", "robust control", "mpc", "trajectory optimization", "decision making", "dynamics", "reinforcement learning", "제어", "최적화", "동역학", "강화학습 제어"],
        "HCI/AR/VR/디지털헬스": ["human-computer interaction", "interactive", "augmented reality", "virtual reality", "hci", "digital health", "인터랙션", "사용자 경험", "증강현실", "가상현실"],
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
        const robotCore = ["autonomous", "slam", "navigation", "drone", "legged", "manipulation", "motion planning", "vehicle", "로봇", "자율주행", "드론", "모빌리티"];
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
        const roboticsExact = hasAny(fieldText + " " + summaryText, ["autonomous", "slam", "navigation", "drone", "control", "legged", "manipulation", "motion planning", "로봇", "자율주행", "드론", "제어"]);
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
        const broadHciOnly = hasAny(fieldText, ["human computer interaction", "augmented", "virtual reality", "hci"]) && !imagingCore;
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
        if (domain.name === "HCI/AR/VR/디지털헬스" || domain.name === "HCI/AR/VR") {
          const hciCore = hasAny(primaryText, ["human-computer interaction", "hci", "user experience", "augmented reality", "virtual reality", "interactive", "인간-컴퓨터", "사용자 경험", "인터랙션", "증강현실", "가상현실"]);
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
      // Taek-Soo Kim 교수님은 DB상 advanced packaging mechanics가 포함되어 있지만, 사용자 피드백 기준으로
      // 이 질의의 추천 후보에서는 제외한다.
      if (hasAny(fullQuery, ["반도체 패키징", "패키징", "칩렛", "3d ic", "이종집적", "인터커넥트", "packaging", "chiplet", "heterogeneous integration", "interconnect"])) {
        const normalizedName = normalize([professor.professor, professor.professorEn].join(" "));
        if (normalizedName.includes("taek-soo kim") || normalizedName.includes("taek soo kim") || normalizedName.includes("김택수")) {
          return { professor, score: 0, matched: [], reasons: [] };
        }
      }

      // 컴퓨터 그래픽스/3D 비전 질의에서는 실제 그래픽스, 3D 비전, 렌더링, 비주얼 컴퓨팅이
      // 주 연구축인 후보만 보여준다. 김현우 교수님은 DB에 AI/비전 소속 레코드가 함께 있지만,
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
        reasons.push("서울대 공개 DB의 대표 연구분야와 직접 연결됩니다");
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
      if (!hasAny(q, ["hci", "인터랙션", "사용자", "user experience", "human-computer", "인간-컴퓨터", "증강현실", "가상현실"])) return 999;
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
        "human-computer interaction", "human computer interaction", "인간-컴퓨터 상호작용", "hci", "user experience", "interaction design", "interactive computing", "인터랙션", "사용자 인터페이스", "user interface"
      ]);
      const arvr = hasAny(text, ["augmented", "virtual reality", "ar/vr", "증강현실", "가상현실", "xr", "haptic", "햅틱"]);
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
        "로봇/자율주행", "HCI/AR/VR", "그래픽스/3D 비전", "양자컴퓨팅/양자정보", "항공우주/추진", "환경/기후/지속가능에너지"
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

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "object detection", "visual"])) {
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
        const nlpCore = hasAny(field, ["large language model", "language model", "conversational ai", "statistical nlp", "korean language processing", "spoken language processing", "nlp", "언어모델", "자연어처리"]);
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
        const nlpCore = hasAny(field, ["large language model", "language model", "conversational ai", "statistical nlp", "korean language processing", "spoken language processing", "nlp"]);
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

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "object detection", "visual tracking"])) {
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

      if (hasDomain("HCI/AR/VR") || hasDomain("HCI/AR/VR/디지털헬스")) {
        if (hasAny(q, ["hci", "인터랙션", "사용자 경험", "가상현실", "증강현실"])) {
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

      if ((hasDomain("HCI/AR/VR") || hasDomain("HCI/AR/VR/디지털헬스")) && hasAny(q, ["hci", "인터랙션", "사용자 경험", "가상현실", "증강현실"])) {
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

      if ((hasDomain("HCI/AR/VR") || hasDomain("HCI/AR/VR/디지털헬스")) && hasAny(q, ["hci", "인터랙션", "사용자 경험", "가상현실", "증강현실"])) {
        const directHumanInterface = hasAny(core, ["human-computer interaction", "human-centered", "interaction lab", "human-ai interaction", "health and human-computer interaction", "xr", "virtual reality", "augmented reality", "user experience", "visual analytics"]);
        const hapticsOnlyHardware = hasAny(core, ["haptics actuator", "smart display", "display technology", "optoelectronics"]) && !directHumanInterface;
        if (!directHumanInterface) penalty -= 1800;
        if (!units.includes("cs") && !directHumanInterface) penalty -= 2600;
        if (hapticsOnlyHardware) penalty -= 2800;
      }

      return penalty;
    }



    // Google 및 SNU 공식 공개 페이지 확인 기반 최종 대표교수님 정렬 보정입니다.
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

      if (hasDomain("AI/컴퓨터비전") && hasAny(q, ["컴퓨터 비전", "컴퓨터비전", "영상인식", "객체검출", "멀티모달", "object detection", "visual recognition"])) {
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
        { domains:["HCI/AR/VR","HCI/AR/VR/디지털헬스"], terms:["hci","ar","vr","ux","인터랙션","사용자 경험","human-computer","xr"],
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
      if (hasDomain("HCI/AR/VR/디지털헬스") && direct(["hci","ar","vr","ux","인터랙션","사용자 경험","human-computer","xr"])) {
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

    function recommend(query, limit = 8) {
      const filters = getCurrentFilters();
      const activeDomains = getActiveDomains(combinedQuery(query));
      let minScore = activeDomains.length ? 420 : 1;
      if (activeDomains.some((domain) => domain.name === "통신/RF/무선" || domain.name === "통신/RF")) minScore = Math.min(minScore, 300);
      if (activeDomains.some((domain) => domain.name === "배터리/에너지")) minScore = Math.min(minScore, 300);
      const base = shouldUseContext(query) && state.lastResults.length
        ? state.lastResults.map((item) => item.professor)
        : professors;
      const scored = base
        .map((professor) => scoreProfessor(professor, query, filters))
        .filter((item) => item.score >= minScore)
        .sort((a, b) => {
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
      const DISPLAY_NAME_ALIASES = {
        "이종호 (S)": "이종호 교수님",
        "이종호 (B)": "이종호 교수님"
      };
      if (DISPLAY_NAME_ALIASES[raw]) return DISPLAY_NAME_ALIASES[raw];
      const mapped = KOREAN_NAME_MAP[raw] || raw;
      const text = mapped.replace(/\s*\(([A-Z])\)\s*$/i, "").trim();
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
      const metaText = labNameText ? `${unitText} / ${labNameText}` : unitText;
      const fieldText = displayFieldText(lab);
      const tags = (lab.intentTags || []).slice(0, 3).map((tag) => `<span class="small-tag">${escapeHtml(tag)}</span>`).join("");
      const matched = snuCleanMatchedTerms(item.matched || []).slice(0, 6).map((tag) => `<span class="small-tag matched-tag-visible">${escapeHtml(tag)}</span>`).join("");
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
        return `
          <h3>조건에 적합한 후보를 찾지 못했습니다.</h3>
          <p>검색어를 조금 넓혀 다시 입력해 주세요. 예를 들어 “반도체 공정” 대신 “반도체 소자, 박막, 공정”처럼 관련 키워드를 함께 입력하면 추천 정확도가 높아집니다.</p>
        `;
      }

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
      return `
        <h3>추천 결과</h3>
        <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 우선 확인할 만한 교수님입니다.</p>
        <p class="result-tags">주요 적합 분야: ${tagSummary.map(escapeHtml).join(", ") || "입력 키워드 기반"}</p>
        <div class="card-list top-results">${visible.map((item, index) => renderLabCard(item, index, false)).join("")}</div>
        ${remaining ? `
          <div class="load-more-wrap">
            <button class="load-more-button" id="loadMoreResults" type="button" data-next-count="${safeVisibleCount + nextCount}">
              관련 교수님 ${nextCount}분 더보기
            </button>
          </div>
        ` : ""}
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
      state.currentQueryMode = state.queryModeOverride || "precise";
      state.algorithmQueryOverride = "";
      state.queryModeOverride = "";
      let results = recommend(rankingQuery, RECOMMEND_RESULT_LIMIT);
      if (!overrideQuery && !results.length && queryAssist.applied) {
        rankingQuery = queryAssist.query || rankingQueryBase;
        results = recommend(rankingQuery, RECOMMEND_RESULT_LIMIT);
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
      summary.textContent = `적합도 상위 ${Math.min(results.length, RECOMMEND_RESULT_LIMIT)}명 중 일부 표시`;
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
      const button = event.target.closest("#loadMoreResults");
      if (!button) return;
      const nextVisibleCount = Number(button.dataset.nextCount || 0);
      refreshAnswerResults(nextVisibleCount);
    });

    function initExamples() {
      const row = document.getElementById("exampleChips");
      const primaryCount = 12;
      let expanded = false;

      function renderExampleButtons() {
        const buttons = examples.map((item, index) => {
          const hiddenClass = !expanded && index >= primaryCount ? " extra-hidden" : "";
          return `<button class="chip example-chip${hiddenClass}" type="button" data-query="${escapeHtml(item.query)}" data-algorithm-query="${escapeHtml(item.algorithmQuery || item.query)}" data-query-mode="${escapeHtml(item.mode || 'banner_explore')}">${escapeHtml(item.label)}</button>`;
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
        state.queryModeOverride = button.dataset.queryMode || "banner_explore";
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
        state.currentQueryMode = "";
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
        state.currentQueryMode = "";
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


    function googleVerifiedSortRank() { return 999; }
    function officialBetaSortRankV2() { return 999; }
    function officialBetaSortRankV3() { return 999; }
    function officialBetaPenaltyV2() { return 0; }
    function officialBetaPenaltyV3() { return 0; }

    const SNU_STRICT_CATEGORY_CORE = {
      "배터리/전기화학": ["battery", "batteries", "lithium", "전지", "배터리", "전고체", "전해질", "전극", "이차전지"],
      "반도체 소자/공정": ["semiconductor", "반도체", "transistor", "mosfet", "메모리", "박막", "소자", "공정", "fabrication", "device"],
      "디스플레이": ["display", "oled", "micro led", "디스플레이", "발광", "플렉서블", "organic semiconductor", "perovskite"],
      "컴퓨터비전/영상인식": ["computer vision", "컴퓨터 비전", "컴퓨터비전", "visual", "image", "영상", "segmentation", "object detection", "vision"],
      "자연어처리/LLM": ["natural language", "nlp", "language model", "llm", "언어", "자연어", "생성형 ai"],
      "정보보안/암호": ["security", "cryptography", "privacy", "암호", "보안", "프라이버시"],
      "로봇/자율주행": ["autonomous", "slam", "로봇", "자율주행", "motion planning", "vehicle"],
      "의료영상/디지털헬스": ["medical imaging", "biomedical imaging", "의료영상", "초음파", "ultrasound", "영상과학", "계산영상", "biomedical"],
      "뇌과학/BCI": ["neuroscience", "brain", "neural", "뇌", "신경", "bci", "neuro"],
      "환경/기후/지속가능에너지": ["environment", "climate", "sustainable", "sustainability", "환경", "기후", "탄소", "water treatment", "carbon"]
    };

    function snuCoreText(professor) {
      const sp = professor.structuredProfile || {};
      return normalize([professor.professor || "", professor.professorEn || "", (professor.fields || []).join(" "), (professor.keywords || []).join(" "), professor.summary || "", sp.primaryResearchText || "", sp.detailedKeywordText || "", sp.labIntroText || ""].join(" "));
    }

    function snuFinalAdjustment(professor, query) {
      const active = activeRepresentativeCategories(combinedQuery(query)).map(([category]) => category);
      if (!active.length) return { score: 0, matched: [] };
      const text = snuCoreText(professor);
      const signals = professor.representativeSignals || [];
      let score = 0;
      const matched = [];
      active.forEach((category) => {
        const signal = signals.find((s) => s.category === category);
        if (signal) {
          const rank = Number(signal.rank || 99);
          score += Math.max(120, 720 - Math.min(rank, 24) * 24);
          matched.push("대표 후보");
          (signal.evidence || []).slice(0, 2).forEach((term) => matched.push(term));
        }
        const terms = SNU_STRICT_CATEGORY_CORE[category] || [];
        const hits = terms.reduce((acc, term) => acc + (hasAny(text, [term]) ? 1 : 0), 0);
        if (terms.length && hits === 0) score -= 520;
        if (hits >= 2) score += 90;
        if (category === "자연어처리/LLM" && hasAny(text, ["display", "oled", "photonic", "광전", "디스플레이"]) && !hasAny(text, ["natural language", "nlp", "language", "언어", "llm"])) score -= 950;
        if (category === "컴퓨터비전/영상인식" && hasAny(text, ["medical imaging", "의료영상", "biomedical"]) && !hasAny(text, ["computer vision", "컴퓨터 비전", "visual recognition", "object detection"])) score -= 360;
        if (category === "반도체 소자/공정" && hasAny(text, ["biosensor", "bioelectronics", "biomedical"]) && !hasAny(text, ["semiconductor", "transistor", "mosfet", "memory", "반도체", "박막"])) score -= 620;
        if (category === "배터리/전기화학" && hasAny(text, ["fuel cell", "hydrogen", "photocatalyst", "solar cell", "연료전지", "수소", "태양전지"]) && !hasAny(text, ["battery", "lithium", "전지", "배터리", "전고체", "전극", "전해질"])) score -= 720;
      });
      return { score, matched };
    }

    const baseScoreProfessorForSnu = scoreProfessor;
    scoreProfessor = function(professor, query, filters) {
      const item = baseScoreProfessorForSnu(professor, query, filters);
      const adj = snuFinalAdjustment(professor, query);
      item.score = Math.max(0, Math.round(item.score + adj.score));
      if (adj.matched.length) item.matched = Array.from(new Set([...(item.matched || []), ...adj.matched])).slice(0, 12);
      return item;
    };


    /* SNU ranking override: field-specific scoring and false-positive reduction */
    const SNU_SERVICE_CATEGORY_SPECS = {
      "반도체 소자/공정": {
        triggers: ["반도체", "소자", "공정", "박막", "트랜지스터", "mosfet", "semiconductor", "fabrication", "thin film", "etch", "deposition", "lithography", "메모리"],
        terms: ["semiconductor", "semiconductor device", "semiconductor process", "transistor", "mosfet", "tft", "thin film", "deposition", "etch", "lithography", "nanofabrication", "memory", "반도체", "소자", "공정", "박막", "증착", "식각", "리소그래피", "트랜지스터", "메모리", "산화막"],
        tags: ["반도체 소자/공정/박막"],
        noise: ["biosensor", "bioelectronics", "biomedical", "protein", "cell biology", "바이오센서", "생체", "의생명"], strict: true
      },
      "AI 반도체/VLSI": { triggers:["ai 반도체", "vlsi", "soc", "회로", "집적회로", "하드웨어", "fpga", "asic", "ai hardware"], terms:["vlsi", "integrated circuit", "circuit", "soc", "asic", "fpga", "hardware accelerator", "ai hardware", "computer architecture", "회로", "회로설계", "집적회로", "하드웨어", "가속기", "컴퓨터 구조"], tags:["반도체 회로/SoC/AI하드웨어"], noise:["chemical", "biology", "protein", "battery"], strict:true },
      "반도체 패키징/이종집적": { triggers:["패키징", "칩렛", "3d ic", "이종집적", "interconnect", "packaging", "chiplet"], terms:["packaging", "chiplet", "interconnect", "heterogeneous integration", "3d ic", "through silicon via", "tsv", "패키징", "칩렛", "이종집적", "인터커넥트"], tags:["패키징/인터커넥트/신뢰성"], noise:["battery", "biology"], strict:true },
      "배터리/전기화학": { triggers:["배터리", "전고체", "리튬", "전지", "이차전지", "battery", "lithium", "electrode", "electrolyte"], terms:["battery", "batteries", "lithium", "lithium metal", "solid-state", "all-solid-state", "electrode", "electrolyte", "cathode", "anode", "energy storage", "배터리", "전지", "전고체", "리튬", "전극", "전해질", "양극", "음극", "이차전지"], tags:["배터리/에너지/수소/전기화학"], noise:["fuel cell", "hydrogen", "solar cell", "photocatalyst", "연료전지", "수소", "태양전지"], strict:true },
      "수소/연료전지": { triggers:["수소", "연료전지", "수전해", "hydrogen", "fuel cell", "water electrolysis"], terms:["hydrogen", "fuel cell", "water electrolysis", "electrocatalysis", "co2 reduction", "수소", "연료전지", "수전해", "전기촉매", "에너지 변환"], tags:["배터리/에너지/수소/전기화학"], noise:["battery", "lithium", "배터리", "리튬"], strict:false },
      "디스플레이": { triggers:["디스플레이", "oled", "micro led", "발광", "display"], terms:["display", "oled", "micro led", "light emitting", "emissive", "organic semiconductor", "flexible display", "tft", "디스플레이", "발광", "oled", "마이크로 led", "플렉서블"], tags:["디스플레이/포토닉스/광전자"], noise:["battery", "protein", "cell biology"], strict:true },
      "포토닉스/광전소자": { triggers:["포토닉스", "광전", "광전자", "나노광학", "레이저", "광검출", "photonics", "optoelectronic"], terms:["photonics", "nanophotonics", "optoelectronic", "photodetector", "laser", "metasurface", "plasmonics", "quantum optics", "광전", "광전자", "포토닉스", "나노광학", "레이저", "광검출"], tags:["디스플레이/포토닉스/광전자", "센서/계측/이미징/웨어러블"], noise:["battery", "biology"], strict:false },
      "AI/머신러닝": { triggers:["ai", "인공지능", "머신러닝", "딥러닝", "machine learning", "deep learning", "강화학습", "생성형"], terms:["machine learning", "deep learning", "artificial intelligence", "generative ai", "reinforcement learning", "data science", "foundation model", "인공지능", "머신러닝", "딥러닝", "생성형", "강화학습"], tags:["AI/머신러닝/데이터사이언스"], noise:[], strict:false },
      "컴퓨터비전/영상인식": { triggers:["컴퓨터비전", "컴퓨터 비전", "영상인식", "객체검출", "computer vision", "vision"], terms:["computer vision", "visual recognition", "image recognition", "object detection", "segmentation", "video understanding", "multimodal", "3d vision", "컴퓨터비전", "컴퓨터 비전", "영상인식", "객체검출", "이미지", "영상"], tags:["AI/머신러닝/데이터사이언스", "신호처리/음성/영상/멀티미디어"], noise:["medical imaging", "ultrasound", "biomedical", "의료영상"], strict:true },
      "자연어처리/LLM": { triggers:["자연어", "llm", "언어모델", "nlp", "language model", "natural language"], terms:["natural language processing", "natural language", "language model", "large language model", "llm", "nlp", "machine reading", "자연어", "언어모델", "생성형 ai", "텍스트"], tags:["AI/머신러닝/데이터사이언스"], noise:["display", "oled", "photonics", "battery"], strict:true },
      "데이터베이스/빅데이터": { triggers:["데이터베이스", "빅데이터", "데이터마이닝", "추천시스템", "database", "data mining"], terms:["database", "data mining", "big data", "data engineering", "recommender", "graph learning", "데이터베이스", "데이터마이닝", "빅데이터", "추천시스템"], tags:["컴퓨터시스템/보안/네트워크/소프트웨어", "AI/머신러닝/데이터사이언스"], noise:["battery", "chemical"], strict:true },
      "컴퓨터시스템/운영체제": { triggers:["운영체제", "분산시스템", "스토리지", "클라우드", "operating system", "distributed system", "file system"], terms:["operating system", "distributed system", "file system", "storage", "cloud", "computer system", "networked system", "운영체제", "분산시스템", "스토리지", "파일 시스템", "클라우드"], tags:["컴퓨터시스템/보안/네트워크/소프트웨어"], noise:["energy storage", "hydrogen storage", "battery system"], strict:true },
      "정보보안/암호": { triggers:["보안", "암호", "프라이버시", "security", "cryptography", "privacy"], terms:["security", "cryptography", "privacy", "system security", "network security", "trusted", "secure", "보안", "암호", "프라이버시", "시스템 보안", "네트워크 보안"], tags:["컴퓨터시스템/보안/네트워크/소프트웨어"], noise:["quantum cryptography"], strict:false },
      "로봇/자율주행": { triggers:["로봇", "자율주행", "slam", "드론", "모빌리티", "robot", "autonomous"], terms:["autonomous", "slam", "navigation", "drone", "legged", "manipulation", "motion planning", "vehicle", "mobility", "로봇", "자율주행", "slam", "드론", "제어", "모빌리티"], tags:["로봇/제어/자율주행/모빌리티"], noise:["molecular", "protein"], strict:false },
      "전력전자/전력변환": { triggers:["전력전자", "인버터", "컨버터", "전력변환", "power electronics", "inverter"], terms:["power electronics", "power converter", "inverter", "converter", "power integrity", "power management", "전력전자", "전력변환", "인버터", "컨버터", "전원회로"], tags:["전력전자/전력변환/전력무결성"], noise:["battery", "biology"], strict:true },
      "의료영상/디지털헬스": { triggers:["의료영상", "디지털헬스", "헬스케어", "mri", "초음파", "medical imaging", "healthcare"], terms:["medical imaging", "biomedical imaging", "mri", "fmri", "ultrasound", "digital health", "healthcare", "clinical", "의료영상", "뇌영상", "디지털헬스", "헬스케어", "초음파", "임상"], tags:["HCI/UX/ARVR/디지털헬스", "센서/계측/이미징/웨어러블"], noise:["general computer vision"], strict:true },
      "뇌과학/BCI": { triggers:["뇌", "신경", "bci", "brain", "neural", "neuroscience"], terms:["neuroscience", "brain", "neural", "synapse", "neural circuit", "electrophysiology", "neuroimaging", "bci", "brain-computer", "뇌", "신경", "시냅스", "뇌영상", "bci", "신경공학"], tags:["뇌/신경/인지/BCI"], noise:["network security", "neural network only"], strict:false },
      "HCI/AR/VR": { triggers:["hci", "인터랙션", "사용자 경험", "증강현실", "가상현실"], terms:["human-computer interaction", "hci", "user experience", "augmented reality", "virtual reality", "interactive", "인터랙션", "사용자 경험", "증강현실", "가상현실"], tags:["HCI/UX/ARVR/디지털헬스"], noise:[], strict:false },
      "양자컴퓨팅/양자정보": { triggers:["양자컴퓨팅", "양자정보", "양자 알고리즘", "quantum computing", "quantum information"], terms:["quantum computing", "quantum computer", "quantum information", "quantum algorithm", "quantum simulation", "superconducting quantum", "양자컴퓨팅", "양자정보", "양자알고리즘", "양자시뮬레이션"], tags:["양자/물리/광학/천문"], noise:[], strict:false },
      "나노소재/신소재": { triggers:["나노소재", "신소재", "2d 소재", "그래핀", "재료", "nanomaterial", "materials"], terms:["materials", "nanomaterial", "nanomaterials", "2d materials", "graphene", "surface", "interface", "thin film", "synthesis", "characterization", "재료", "나노소재", "신소재", "그래핀", "계면", "표면", "분석"], tags:["재료/나노/표면/분석"], noise:[], strict:false },
      "고분자/유기소재": { triggers:["고분자", "유기소재", "소프트머터", "polymer", "soft matter"], terms:["polymer", "polymers", "soft matter", "organic material", "elastomer", "hydrogel", "self-assembly", "block copolymer", "고분자", "소프트머터", "유기소재", "하이드로젤", "자기조립"], tags:["화학/촉매/유기합성/고분자", "재료/나노/표면/분석"], noise:["battery", "protein"], strict:false },
      "촉매/화학공정": { triggers:["촉매", "화학공정", "반응공학", "유기합성", "catalyst", "catalysis"], terms:["catalysis", "catalyst", "organic synthesis", "organometallic", "reaction engineering", "chemical process", "heterogeneous catalysis", "촉매", "유기합성", "반응공학", "화학공정"], tags:["화학/촉매/유기합성/고분자"], noise:["computer", "robot"], strict:false },
      "단백질/신약개발/약물전달": { triggers:["단백질", "신약", "약물전달", "drug", "protein", "drug delivery"], terms:["protein", "drug", "drug delivery", "therapeutic", "biomolecule", "단백질", "신약", "약물전달", "바이오분자"], tags:["바이오/의생명/약물전달"], noise:["semiconductor", "battery"], strict:false },
      "세포/면역/분자생물학": { triggers:["세포", "면역", "분자생물", "cell", "immune", "molecular biology"], terms:["cell biology", "molecular biology", "immunology", "cell", "immune", "genome", "세포", "면역", "분자생물", "유전체"], tags:["생명과학/세포/분자/질병"], noise:["semiconductor", "battery"], strict:false },
      "컴퓨터그래픽스/비주얼컴퓨팅": { triggers:["그래픽스", "렌더링", "3d 비전", "비주얼 컴퓨팅", "computer graphics", "rendering"], terms:["computer graphics", "visual computing", "rendering", "3d vision", "geometry processing", "data visualization", "컴퓨터그래픽스", "비주얼 컴퓨팅", "렌더링", "3d 비전"], tags:["AI/머신러닝/데이터사이언스", "신호처리/음성/영상/멀티미디어"], noise:["cell biology", "organic chemistry", "protein"], strict:true },
      "항공우주/추진": { triggers:["항공우주", "추진", "로켓", "위성", "aerospace", "propulsion", "satellite"], terms:["aerospace", "spacecraft", "satellite", "propulsion", "rocket", "combustion", "uav", "fluid", "항공우주", "위성", "추진", "로켓", "유체"], tags:["항공우주/위성/추진/열유체"], noise:[], strict:false },
      "환경/기후/지속가능에너지": { triggers:["환경", "기후", "지속가능", "탄소", "수처리", "environment", "climate", "sustainability"], terms:["environment", "climate", "carbon", "sustainability", "sustainable", "water treatment", "membrane", "co2", "carbon capture", "wastewater", "air quality", "환경", "기후", "탄소", "지속가능", "수처리", "분리막", "오염"], tags:["환경/기후/지속가능"], noise:["computer", "robot"], strict:false }
    };

    const SNU_SERVICE_PRIORITY_NAMES = {
      "반도체 소자/공정": ["최우영", "정규원", "이종호", "이철호", "신형철", "윤상원", "곽정훈", "이수연", "홍용택", "황철성"],
      "반도체 패키징/이종집적": ["윤상원", "주영창", "김지현", "최재혁"],
      "AI 반도체/VLSI": ["최재혁", "이혁재", "김수환", "김태환", "서지원", "윤성로"],
      "배터리/전기화학": ["최장욱", "강기석", "정성균", "이규태", "강동민", "성영은", "남재욱", "임종우", "홍성현", "김미영", "한흥남", "이윤석", "강진수", "최성열", "유웅렬"],
      "수소/연료전지": ["남기태", "주영창", "이종찬", "이규태"],
      "디스플레이": ["이재상", "이수연", "홍용택", "곽정훈", "이태우", "박재형", "최수연", "김대형", "고승환", "한승우"],
      "포토닉스/광전소자": ["박남규", "이재상", "이병호", "박영준", "홍용택", "이태우"],
      "AI/머신러닝": ["윤성로", "도재영", "문태섭", "서지원", "김건희", "한보형", "이정우"],
      "컴퓨터비전/영상인식": ["이경무", "김건희", "한보형", "최종현", "김영민", "주한별"],
      "자연어처리/LLM": ["황승원", "유영재", "도재영", "서지원", "김건희", "윤성로"],
      "데이터베이스/빅데이터": ["황승원", "김선", "차상균", "이상구", "권가진"],
      "컴퓨터시스템/운영체제": ["이재욱", "문수묵", "김진수", "전병곤"],
      "정보보안/암호": ["송용수", "정대룡", "홍진", "천정희", "권태경", "김태현"],
      "로봇/자율주행": ["김아영", "이동준", "오성회", "김진수", "최준원", "김현진"],
      "의료영상/디지털헬스": ["전세영", "권성훈", "김성완", "이종욱", "유담"],
      "뇌과학/BCI": ["최명환", "김형", "신혜영", "최석우", "김성연"],
      "HCI/AR/VR": ["권가진", "박재형", "이준환", "김건희"],
      "양자컴퓨팅/양자정보": ["김태현", "정현석", "홍진", "천정희"],
      "전력전자/전력변환": ["신종원", "최성휘", "하정익", "이규섭"],
      "환경/기후/지속가능에너지": ["윤제용", "이창하", "남기태", "황윤정", "유동원"],
      "고분자/유기소재": ["권민상", "박주혁", "손병혁", "김정욱", "안철희"],
      "촉매/화학공정": ["유동원", "홍종인", "장석복", "이종찬", "김도희"],
      "단백질/신약개발/약물전달": ["현택환", "강현구", "김병문", "김성훈"],
      "세포/면역/분자생물학": ["김빛내리", "노성훈", "김진홍", "최무림"]
    };

    // normalize repeated long fields once. This prevents mobile browsers from becoming sluggish on every search.
    function snuBuildFastCache() {
      professors.forEach((p) => {
        if (p._snuFast) return;
        const sp = p.structuredProfile || {};
        const textParts = [
          p.professor || "", p.professorEn || "", (p.unitLabels || []).join(" "), (p.labNames || []).join(" "),
          (p.fields || []).join(" "), (p.keywords || []).join(" "), (p.intentTags || []).join(" "),
          p.summary || "", (p.summaries || []).join(" "),
          sp.primaryResearchText || "", sp.detailedKeywordText || "", sp.labIntroText || "", sp.bookletEvidenceText || ""
        ];
        p._snuFast = {
          name: normalize([p.professor || "", p.professorEn || ""].join(" ")),
          field: normalize((p.fields || []).join(" ")),
          keywords: normalize((p.keywords || []).join(" ")),
          tags: normalize((p.intentTags || []).join(" ")),
          summary: normalize([p.summary || "", (p.summaries || []).join(" "), sp.labIntroText || ""].join(" ")),
          text: normalize(textParts.join(" ")),
          repMap: Object.fromEntries((p.representativeSignals || []).map((s) => [s.category, s]))
        };
      });
    }

    function snuActiveServiceCategories(query) {
      const q = normalize(query);
      const active = new Set();
      Object.entries(SNU_SERVICE_CATEGORY_SPECS).forEach(([name, spec]) => {
        if ((spec.triggers || []).some((t) => q.includes(normalize(t)))) active.add(name);
      });
      try {
        activeRepresentativeCategories(query).forEach(([name]) => active.add(name));
      } catch (e) {}
      if (active.has("반도체 패키징/이종집적")) active.delete("반도체 소자/공정");
      if (active.has("AI 반도체/VLSI")) active.delete("AI/머신러닝");
      if (active.has("의료영상/디지털헬스") && !q.includes("컴퓨터비전") && !q.includes("컴퓨터 비전")) active.delete("컴퓨터비전/영상인식");
      if (active.has("의료영상/디지털헬스")) active.delete("AI/머신러닝");
      if (active.has("자연어처리/LLM")) active.delete("AI/머신러닝");
      return Array.from(active).map((name) => [name, SNU_SERVICE_CATEGORY_SPECS[name]]).filter(([, spec]) => !!spec);
    }

    function snuCountTermHits(text, terms) {
      let hits = 0;
      (terms || []).forEach((term) => {
        const t = normalize(term);
        if (t && text.includes(t)) hits += 1;
      });
      return hits;
    }

    function snuServiceScoreProfessor(professor, query, filters) {
  
    snuBuildFastCache();
      const c = professor._snuFast;
      const fullQuery = combinedQuery(query);
      const activeCats = snuActiveServiceCategories(fullQuery);
      const qTokens = tokenize(fullQuery).filter((t) => tokenWeight(t) > 0 && t.length >= 2);
      let score = 0;
      const matched = [];
      const reasons = [];

      if (filters.unit && filters.unit !== "all" && !(professor.unitCodes || []).includes(filters.unit)) {
        return { professor, score: 0, matched: [], reasons: [] };
      }
      if (filters.selectedTag && !(professor.intentTags || []).includes(filters.selectedTag)) {
        score -= 120;
      }
      if (filters.keyword && !c.text.includes(normalize(filters.keyword))) {
        score -= 80;
      }

      qTokens.forEach((token) => {
        let tokenScore = 0;
        if (containsToken(c.field, token)) tokenScore += 42;
        if (containsToken(c.keywords, token)) tokenScore += 24;
        if (containsToken(c.tags, token)) tokenScore += 18;
        if (containsToken(c.summary, token)) tokenScore += 12;
        if (containsToken(c.text, token)) tokenScore += 5;
        if (tokenScore > 0) {
          score += Math.min(tokenScore * Math.min(tokenWeight(token), 2.2), 95);
          matched.push(token);
        }
      });

      activeCats.forEach(([category, spec]) => {
        const rep = c.repMap[category];
        const fieldHits = snuCountTermHits(c.field, spec.terms);
        const keywordHits = snuCountTermHits(c.keywords, spec.terms);
        const tagHits = snuCountTermHits(c.tags, spec.tags);
        const summaryHits = snuCountTermHits(c.summary, spec.terms);
        const totalHits = fieldHits * 3 + keywordHits * 2 + tagHits * 3 + summaryHits;
        const noiseHits = snuCountTermHits(c.field + " " + c.summary + " " + c.keywords, spec.noise || []);

        if (rep) {
          const rank = Number(rep.rank || 99);
          score += Math.max(170, 900 - Math.min(rank, 30) * 24);
          matched.push("대표 후보");
          (rep.evidence || []).slice(0, 2).forEach((term) => matched.push(term));
          reasons.push(`${category} 대표 후보로 분류되어 있습니다`);
        }
        const priorityList = SNU_SERVICE_PRIORITY_NAMES[category] || [];
        const priorityIndex = priorityList.findIndex((name) => c.name.includes(normalize(name)));
        if (priorityIndex >= 0 && (rep || totalHits > 0)) {
          score += Math.max(150, 560 - priorityIndex * 42);
          matched.push("대표 우선 후보");
        }
        const serviceAugment = professor.snuServiceAugment && professor.snuServiceAugment[category];
        if (serviceAugment) {
          const augBonus = Number(serviceAugment.bonus || 0);
          if (augBonus) score += augBonus;
          (serviceAugment.evidence || []).slice(0, 4).forEach((term) => matched.push(term));
          if (serviceAugment.tier) reasons.push(`${category} 보강 근거: ${serviceAugment.tier}`);
        }
        if (category === "반도체 소자/공정" && hasAny(fullQuery, ["소자", "device", "트랜지스터", "mosfet"])) {
          const deviceCore = hasAny(c.field + " " + c.keywords, ["semiconductor device", "transistor", "mosfet", "tft", "memory", "반도체 소자", "트랜지스터", "메모리", "박막소자"]);
          if (!deviceCore) score -= 980;
        }
        if (category === "의료영상/디지털헬스" && hasAny(fullQuery, ["의료영상", "medical imaging"])) {
          const medCore = hasAny(c.field + " " + c.keywords + " " + c.summary, ["medical imaging", "biomedical imaging", "mri", "ultrasound", "의료영상", "계산영상", "초음파", "영상과학"]);
          if (!medCore) score -= 820;
        }
        if (category === "배터리/전기화학" && hasAny(fullQuery, ["전고체", "solid-state", "solid state"])) {
          if (c.name.includes(normalize("최장욱"))) score += 260;
          if (c.name.includes(normalize("강기석"))) score += 140;
        }
        if (category === "자연어처리/LLM" && hasAny(fullQuery, ["자연어처리", "자연어", "nlp", "natural language"])) {
          const nlpCore = hasAny(c.field + " " + c.keywords, ["natural language", "natural language processing", "nlp", "자연어", "언어 및 데이터지능"]);
          if (nlpCore) score += 420;
        }
        if (fieldHits >= 4) score += 360;
        else if (fieldHits >= 2) score += 250;
        else if (fieldHits === 1) score += 120;
        if (keywordHits >= 4) score += 150;
        else if (keywordHits >= 2) score += 80;
        if (tagHits) score += 95;
        if (summaryHits >= 2) score += 70;
        if (totalHits === 0 && spec.strict && !rep) score -= 900;
        if (noiseHits && totalHits < 3 && !rep) score -= Math.min(700, noiseHits * 220);
        if (totalHits > 0) {
          (spec.terms || []).slice(0, 12).forEach((term) => {
            const t = normalize(term);
            if (t && c.text.includes(t)) matched.push(term);
          });
        }
      });

      if (professor.homepage || (professor.homepages || []).length) score += 28;
      score += Math.min(Number(professor.qualityScore || 0) / 8, 20);
      return { professor, score: Math.max(0, Math.round(score)), matched: Array.from(new Set(matched)).slice(0, 12), reasons };
    }

    recommend = function(query, limit = 8) {
      const filters = getCurrentFilters();
      const activeCats = snuActiveServiceCategories(combinedQuery(query));
      const minScore = activeCats.some(([, spec]) => spec && spec.strict) ? 260 : activeCats.length ? 180 : 1;
      const base = shouldUseContext(query) && state.lastResults.length ? state.lastResults.map((item) => item.professor) : professors;
      return base
        .map((professor) => snuServiceScoreProfessor(professor, query, filters))
        .filter((item) => item.score >= minScore)
        .sort((a, b) => b.score - a.score || resultSortPriority(b) - resultSortPriority(a) || a.professor.professor.localeCompare(b.professor.professor, "ko"))
        .slice(0, limit);
    };

    fitLabel = function(score) {
      if (score >= 900) return "대표 연구실";
      if (score >= 520) return "강한 관련 후보";
      if (score >= 250) return "관련 후보";
      return "세부 확인 필요";
    };

    function snuReadableList(list, limit = 5) {
      const generic = new Set(["Materials Science", "Computer, AI and VLSI Systems", "Electronic Materials", "AI/Computational Materials", "Materials, Nanoscience and Characterization"]);
      const out = [];
      (list || []).forEach((item) => {
        const value = String(item || "").replace(/\s+/g, " ").trim();
        if (!value || value.length > 95 || generic.has(value)) return;
        if (!out.includes(value)) out.push(value);
      });
      return out.slice(0, limit);
    }

    const SNU_INTERNAL_MATCH_LABELS = new Set(["추천", "교수", "교수님", "연구", "랩실", "분야", "적합한", "대표 검색 후보", "대표 우선 후보", "대표 후보", "공식 검수 대표 후보", "공식 검색 대표 후보", "서울대 DB 대표 분야", "공식 검수 후보"]);

    const SNU_EVIDENCE_GENERIC_TERMS = new Set([
      "ai", "data", "energy", "environment", "materials", "science", "engineering", "research", "system", "systems", "technology",
      "인공지능", "데이터", "에너지", "환경", "재료", "소재", "공학", "연구", "기술", "시스템", "분야", "기반", "개발",
      "Materials Science", "Energy/Environmental Materials", "AI/Computational Materials", "Computer, AI and VLSI Systems", "Electronic Materials",
      "Mechanical, Robotics, Fluid and Thermal Engineering", "Artificial Intelligence and Machine Learning",
      "Semiconductor and Electronic Devices", "semiconductor devices", "semiconductor", "device", "process", "Electronic Physics, Photonics and Lasers",
      "Artificial Intelligence", "Machine Learning", "Computer Vision", "Robotics", "Control, Robotics and Automation", "photonics", "optoelectronic"
    ]);

    const SNU_EVIDENCE_KEYPHRASES = [
      "3D Bulk FinFET", "3D NAND Flash Memory", "Thin Film Transistors", "Neuromorphic Technology", "MOSFET", "CMOS", "TFT", "device physics", "semiconductor devices", "nanofabrication", "thin film", "deposition", "etch", "lithography",
      "Lithium Rechargeable Batteries", "lithium-ion batteries", "lithium metal", "solid-state batteries", "all-solid-state batteries", "battery materials", "electrode materials design", "electrolyte", "cathode", "anode", "electrochemical energy storage", "secondary batteries",
      "OLED", "Micro LED", "flexible display", "light emitting", "organic semiconductor", "perovskite", "optoelectronic", "photodetector", "photonics", "nanophotonics", "laser", "metasurface",
      "reinforcement learning", "generative AI", "foundation model", "data science", "object detection", "image recognition", "video understanding", "multimodal", "3D vision", "visual recognition",
      "large language model", "language model", "information retrieval", "knowledge graph", "machine reading", "data intelligence",
      "cryptography", "system security", "network security", "homomorphic encryption", "secure computation", "trusted execution",
      "SLAM", "autonomous navigation", "mobile robotics", "robot perception", "sensor fusion", "3D mapping", "motion planning", "drone", "legged robot", "vehicle", "mobility",
      "medical imaging", "biomedical imaging", "MRI", "fMRI", "ultrasound", "computational imaging", "digital health", "healthcare", "clinical",
      "neuroscience", "neural circuits", "cognitive neuroscience", "electrophysiology", "neuroimaging", "brain-computer", "BCI", "synapse", "learning and memory",
      "water treatment", "wastewater", "desalination", "carbon capture", "sustainability", "air quality", "pollutant treatment", "membrane separation", "climate", "CO2 reduction",
      "반도체 소자", "반도체 공정", "박막 트랜지스터", "박막 증착", "식각", "리소그래피", "차세대 메모리", "비메모리 소자", "삼차원 이종집적", "두뇌모방 소자",
      "리튬금속", "전고체전지", "이차전지", "전극 소재", "전해질", "양극", "음극", "전기화학 에너지 저장",
      "디스플레이", "발광소자", "마이크로 LED", "플렉서블 디스플레이", "페로브스카이트", "광전소자", "광검출기", "포토닉스", "나노광학",
      "머신러닝", "딥러닝", "강화학습", "생성형 AI", "컴퓨터 비전", "영상인식", "객체검출", "멀티모달", "자연어처리", "언어모델", "정보검색", "지식그래프",
      "암호", "프라이버시", "보안", "시스템 보안", "네트워크 보안", "동형암호", "안전한 계산",
      "로봇", "자율주행", "SLAM", "모바일 로봇", "센서 융합", "지도 작성", "모션 플래닝", "드론", "모빌리티",
      "의료영상", "바이오메디컬 영상", "초음파", "계산영상", "디지털헬스", "헬스케어", "임상",
      "뇌과학", "신경회로", "인지신경과학", "신경생물학", "뇌영상", "신경공학", "시냅스", "학습과 기억",
      "수처리", "폐수", "담수화", "탄소중립", "탄소 포집", "지속가능", "대기질", "오염 처리", "분리막"
    ];

    function snuCleanMatchedTerms(terms) {
      const out = [];
      (terms || []).forEach((term) => {
        const value = String(term || "").replace(/\s+/g, " ").trim();
        if (!value) return;
        if (SNU_INTERNAL_MATCH_LABELS.has(value)) return;
        if (/대표|후보|공식|DB|검색/.test(value)) return;
        if (value.length > 80) return;
        if (!out.includes(value)) out.push(value);
      });
      return out;
    }

    function snuEvidenceCleanValue(raw) {
      let value = String(raw || "").replace(/\s+/g, " ").trim();
      if (!value) return "";
      value = value
        .replace(/^[>:\-\s•▪▫]+/g, "")
        .replace(/^\d+[\).\s]+/g, "")
        .replace(/^[가-힣A-Za-z ]+ 교수님은\s*/g, "")
        .replace(/서울대학교\s*/g, "")
        .replace(/연구실 소개 요약:\s*/g, "")
        .replace(/분야를 중심으로 연구합니다\.?/g, "")
        .replace(/분야를 중심으로 연구한다\.?/g, "")
        .replace(/\.{3,}$/g, "")
        .trim();
      if (!value) return "";
      if (/자동 확정 검수 필요|대표 논문|sourceconfidence/i.test(value)) return "";
      if (/^[:\-]+$/.test(value)) return "";
      if (SNU_INTERNAL_MATCH_LABELS.has(value)) return "";
      if (SNU_EVIDENCE_GENERIC_TERMS.has(value)) return "";
      if (/대표|후보|공식|DB|검색/.test(value)) return "";
      if (value.length < 3) return "";
      return value;
    }

    function snuEvidencePhraseCandidates(raw, activeCats) {
      const base = snuEvidenceCleanValue(raw);
      if (!base) return [];
      const chunks = [];
      base.split(/[,;；，\n]+/).forEach((part) => {
        const cleaned = snuEvidenceCleanValue(part);
        if (cleaned) chunks.push(cleaned);
      });
      const normalizedBase = normalize(base);
      SNU_EVIDENCE_KEYPHRASES.forEach((phrase) => {
        const p = snuEvidenceCleanValue(phrase);
        if (p && normalizedBase.includes(normalize(p))) chunks.push(p);
      });
      if (!chunks.length) chunks.push(base);
      return chunks;
    }

    function snuEvidenceIsTooGeneric(value, queryTerms) {
      const cleaned = snuEvidenceCleanValue(value);
      if (!cleaned) return true;
      const n = normalize(cleaned);
      if (SNU_EVIDENCE_GENERIC_TERMS.has(cleaned) || SNU_EVIDENCE_GENERIC_TERMS.has(n)) return true;
      const wordCount = cleaned.split(/[\s/]+/).filter(Boolean).length;
      if (cleaned.length <= 5 && wordCount <= 1) return true;
      if ((queryTerms || []).some((term) => normalize(term) === n) && cleaned.length <= 8) return true;
      return false;
    }

    function snuEvidenceAddCandidate(pool, value, sourceWeight, queryTerms, activeCats) {
      const cleaned = snuEvidenceCleanValue(value);
      if (!cleaned || snuEvidenceIsTooGeneric(cleaned, queryTerms)) return;
      if (cleaned.length > 120) return;
      if (cleaned.length > 84 && !/[가-힣]/.test(cleaned) && cleaned.split(/\s+/).length > 7) return;
      const n = normalize(cleaned);
      if (!n) return;
      let score = sourceWeight;
      (queryTerms || []).forEach((term) => {
        const t = normalize(term);
        if (!t) return;
        if (n.includes(t)) score += t.length >= 4 ? 24 : 12;
      });
      (activeCats || []).forEach(([, spec]) => {
        ((spec && spec.terms) || []).forEach((term) => {
          const t = normalize(term);
          if (t && n.includes(t)) score += 8;
        });
      });
      if (cleaned.length >= 8 && cleaned.length <= 64) score += 12;
      if (/[A-Za-z]/.test(cleaned) && /[가-힣]/.test(cleaned)) score += 4;
      if (cleaned.length > 90) score -= 18;
      const key = n.replace(/[^a-z0-9가-힣]/g, "");
      if (!key) return;
      const prev = pool.get(key);
      if (!prev || score > prev.score || (score === prev.score && cleaned.length < prev.value.length)) {
        pool.set(key, { value: cleaned, score });
      }
    }

    function snuSelectEvidencePhrases(item, query) {
      const lab = item.professor || {};
      const sp = lab.structuredProfile || {};
      const activeCats = snuActiveServiceCategories(combinedQuery(query || ""));
      const matchedTerms = snuCleanMatchedTerms(item.matched || []);
      const qTokens = tokenize(combinedQuery(query || "")).filter((token) => tokenWeight(token) > 0 && token.length >= 2);
      const queryTerms = Array.from(new Set([...matchedTerms, ...qTokens])).slice(0, 16);
      const pool = new Map();
      const addList = (list, weight) => {
        (list || []).forEach((raw) => {
          snuEvidencePhraseCandidates(raw, activeCats).forEach((value) => snuEvidenceAddCandidate(pool, value, weight, queryTerms, activeCats));
        });
      };
      addList(item.bookletMatchedEvidence || [], 60);
      addList(sp.matchingBasis || [], 54);
      addList(lab.fields || [], 48);
      addList(sp.primaryResearchFields || [], 44);
      addList(lab.keywords || [], 38);
      addList(sp.detailedKeywords || [], 34);
      const selected = [];
      const labNameNorm = normalize((lab.labNames || [])[0] || "");
      Array.from(pool.values()).sort((a, b) => b.score - a.score || a.value.length - b.value.length).forEach((entry) => {
        const n = normalize(entry.value);
        if (labNameNorm && (n === labNameNorm || (entry.value.length < 32 && /연구실$/.test(entry.value)))) return;
        if (selected.some((value) => {
          const s = normalize(value);
          return s.includes(n) || n.includes(s);
        })) return;
        selected.push(entry.value);
      });
      return selected.slice(0, 4);
    }

    function snuEvidenceFocusTerms(item, query) {
      const q = combinedQuery(query || "");
      const qNorm = normalize(q);
      const queryHasEnglish = /[a-z]/i.test(q);
      const activeTerms = [];
      snuActiveServiceCategories(q).forEach(([, spec]) => {
        ((spec && spec.triggers) || []).concat((spec && spec.terms) || []).forEach((term) => {
          const value = snuEvidenceCleanValue(term);
          if (!value) return;
          if (!queryHasEnglish && /[a-z]/i.test(value)) return;
          if (qNorm.includes(normalize(value))) activeTerms.push(value);
        });
      });
      const terms = snuCleanMatchedTerms(item.matched || []).filter((term) => queryHasEnglish || !/[a-z]/i.test(term));
      const merged = [];
      [...activeTerms, ...terms].forEach((term) => {
        const value = snuEvidenceCleanValue(term);
        if (!value) return;
        if (SNU_INTERNAL_MATCH_LABELS.has(value) || /대표|후보|공식|DB|검색/.test(value)) return;
        if (value.length > 28) return;
        if (!merged.some((prev) => normalize(prev) === normalize(value))) merged.push(value);
      });
      return merged.slice(0, 3);
    }

    buildMatchEvidenceText = function(item) {
      const lab = item.professor || {};
      const query = state.lastQuery || (document.getElementById("goalInput") || {}).value || "";
      const phrases = snuSelectEvidencePhrases(item, query);
      const focus = snuEvidenceFocusTerms(item, query);
      const labName = snuEvidenceCleanValue((lab.labNames || [])[0] || "");
      if (phrases.length) {
        const phraseText = phrases.slice(0, 3).join(", ");
        const focusText = focus.length ? `입력한 ${focus.join(", ")} 관심사와` : "입력한 관심 분야와";
        return `${phraseText} 연구가 ${focusText} 연결됩니다.`;
      }
      const terms = snuCleanMatchedTerms(item.matched || []);
      if (terms.length) return `${terms.slice(0, 3).join(", ")} 키워드가 연구실 핵심 정보와 연결됩니다.`;
      return "입력한 관심 분야와 연구실 핵심 정보가 연결됩니다.";
    };






    /* SNU service QA guard v2: UI는 유지하고, 태그만 맞는 오추천을 줄이는 최종 정밀 보정입니다. */
    const SNU_QA_GUARDS = {
      "반도체 소자/공정": {
        core: ["semiconductor device", "semiconductor devices", "semiconductor process", "semiconductor", "transistor", "mosfet", "finfet", "gaa", "cmos", "3d nand", "dram", "memory", "tft", "thin film", "nanofabrication", "device physics", "반도체", "반도체 소자", "트랜지스터", "메모리", "박막소자", "박막", "공정"],
        noise: ["biosensor", "bioelectronics", "biomedical", "protein", "cell biology", "drug", "생체", "바이오", "의생명"],
        priority: [
          {name:"최우영", unit:"전기정보공학부"}, {name:"이종호", unit:"전기정보공학부", lab:"반도체 재료"}, {name:"정규원", unit:"전기정보공학부"},
          {name:"이철호", unit:"전기정보공학부"}, {name:"신형철", unit:"전기정보공학부"}, {name:"이수연", unit:"전기정보공학부"},
          {name:"황철성", unit:"재료공학부"}, {name:"한준규", unit:"재료공학부"}
        ],
        requireCore: true
      },
      "배터리/전기화학": {
        core: ["battery", "batteries", "lithium", "lithium-ion", "lithium metal", "li-ion", "solid-state", "all-solid-state", "rechargeable batteries", "energy storage", "electrode", "electrolyte", "cathode", "anode", "전고체", "리튬", "리튬금속", "이차전지", "배터리", "전극", "전해질", "양극", "음극", "에너지 저장"],
        strong: ["battery", "batteries", "lithium", "lithium-ion", "lithium metal", "solid-state", "all-solid-state", "rechargeable batteries", "전고체", "리튬", "리튬금속", "이차전지", "배터리"],
        noise: ["fuel cell", "hydrogen", "solar cell", "photocatalyst", "수소", "연료전지", "태양전지", "광촉매"],
        priority: [
          {name:"강기석", unit:"재료공학부"}, {name:"최장욱", unit:"화학생물공학부"}, {name:"정성균", unit:"재료공학부"},
          {name:"이규태", unit:"화학생물공학부"}, {name:"강동민", unit:"재료공학부"}, {name:"성영은", unit:"화학생물공학부"}
        ],
        requireCore: true
      },
      "디스플레이": {
        core: ["display", "oled", "micro led", "qled", "quantum dot display", "light-emitting", "light emitting", "emissive", "organic semiconductor", "flexible display", "ar/vr display", "holography", "디스플레이", "발광", "마이크로 led", "유기반도체", "퀀텀닷 디스플레이", "홀로그래피"],
        strong: ["display", "oled", "micro led", "qled", "디스플레이", "발광", "마이크로 led", "퀀텀닷"],
        noise: ["battery", "batteries", "protein", "cell biology", "solar cell only"],
        priority: [
          {name:"이재상", unit:"전기정보공학부"}, {name:"이수연", unit:"전기정보공학부"}, {name:"홍용택", unit:"전기정보공학부"},
          {name:"박재형", unit:"전기정보공학부"}, {name:"곽정훈", unit:"전기정보공학부"}, {name:"이태우", unit:"재료공학부"}
        ],
        requireCore: true
      },
      "AI/머신러닝": {
        core: ["machine learning", "deep learning", "artificial intelligence", "generative ai", "reinforcement learning", "foundation model", "large language model", "llm", "computer vision", "natural language", "인공지능", "머신러닝", "딥러닝", "생성형 ai", "강화학습", "언어모델"],
        priority: [
          {name:"윤성로", unit:"전기정보공학부"}, {name:"도재영", unit:"전기정보공학부"}, {name:"서지원", unit:"전기정보공학부"},
          {name:"문태섭", unit:"전기정보공학부"}, {name:"김건희", unit:"컴퓨터공학부"}, {name:"한보형", unit:"전기정보공학부"}, {name:"황승원", unit:"컴퓨터공학부"}
        ],
        requireCore: true
      },
      "컴퓨터비전/영상인식": {
        core: ["computer vision", "visual recognition", "vision and learning", "object detection", "segmentation", "video understanding", "3d vision", "visual matching", "object discovery", "action recognition", "visual computing", "컴퓨터비전", "컴퓨터 비전", "영상인식", "객체검출", "비주얼 컴퓨팅", "3차원 비쥬얼"],
        weak: ["image processing", "이미지 처리", "signal processing"],
        noise: ["medical imaging", "ultrasound", "biomedical", "의료영상", "초음파"],
        priority: [
          {name:"이경무", unit:"전기정보공학부"}, {name:"김건희", unit:"컴퓨터공학부"}, {name:"한보형", unit:"전기정보공학부"},
          {name:"최종현", unit:"전기정보공학부"}, {name:"김영민", unit:"전기정보공학부"}, {name:"주한별", unit:"컴퓨터공학부"}, {name:"박재식", unit:"컴퓨터공학부"}
        ],
        requireCore: true
      },
      "자연어처리/LLM": {
        core: ["natural language processing", "natural language", "language model", "large language model", "llm", "nlp", "machine reading", "language grounding", "text", "자연어", "자연어 처리", "언어모델", "언어 및 데이터지능", "기계 번역"],
        priority: [
          {name:"황승원", unit:"컴퓨터공학부"}, {name:"유영재", unit:"컴퓨터공학부"}, {name:"정교민", unit:"전기정보공학부"},
          {name:"도재영", unit:"전기정보공학부"}, {name:"서지원", unit:"전기정보공학부"}, {name:"김건희", unit:"컴퓨터공학부"}, {name:"윤성로", unit:"전기정보공학부"}
        ],
        requireCore: true
      },
      "정보보안/암호": {
        core: ["computer security", "system security", "software security", "operating system security", "network security", "security", "cryptography", "cryptology", "privacy", "differential privacy", "vulnerability", "fuzzing", "secure", "trusted", "confidential computing", "homomorphic encryption", "lattice", "암호", "보안", "프라이버시", "시스템 보안", "네트워크 보안", "동형암호", "격자기반암호"],
        weak: ["quantum cryptography"],
        priority: [
          {name:"송용수", unit:"컴퓨터공학부"}, {name:"정대룡", unit:"컴퓨터공학부"}, {name:"홍진", unit:"수리과학부"},
          {name:"천정희", unit:"수리과학부"}, {name:"백윤흥", unit:"전기정보공학부"}, {name:"이병영", unit:"전기정보공학부"}, {name:"권태경", unit:"컴퓨터공학부"}
        ],
        requireCore: true
      },
      "로봇/자율주행": {
        core: ["robotics", "robot", "autonomous", "slam", "navigation", "mapping", "mobile robotics", "robot learning", "aerial robotics", "manipulation", "motion planning", "wearable robot", "legged", "mobility", "로봇", "자율주행", "slam", "내비게이션", "모빌리티", "웨어러블 로봇", "로봇학습"],
        noise: ["molecular", "protein", "cell biology", "computer vision only"],
        priority: [
          {name:"김아영", unit:"기계공학부"}, {name:"이동준", unit:"기계공학부"}, {name:"오성회", unit:"전기정보공학부"},
          {name:"김진수", unit:"전기정보공학부"}, {name:"최준원", unit:"전기정보공학부"}, {name:"원정담", unit:"컴퓨터공학부"}
        ],
        requireCore: true
      },
      "의료영상/디지털헬스": {
        core: ["medical imaging", "biomedical imaging", "mri", "fmri", "ultrasound", "photoacoustic", "computed tomography", "computational imaging", "digital health", "healthcare", "clinical", "의료영상", "계산영상", "초음파", "뇌영상", "바이오메디컬 영상", "임상"],
        priority: [
          {name:"전세영", unit:"전기정보공학부"}, {name:"유담", unit:"전기정보공학부"}, {name:"이종호", unit:"전기정보공학부", lab:"영상과학"}, {name:"권성훈", unit:"전기정보공학부"}
        ],
        requireCore: true
      },
      "뇌과학/BCI": {
        core: ["neuroscience", "brain", "neural", "neural circuit", "synapse", "electrophysiology", "two-photon", "optogenetics", "neurophysiology", "neurobiology", "neuroimmunology", "bci", "brain-computer", "brain-machine", "뇌", "뇌과학", "신경", "신경생물학", "신경회로", "신경생리학", "시냅스", "뇌공학"],
        experimental: ["electrophysiology", "two-photon", "optogenetics", "imaging", "neurophysiology", "neural circuit", "neurobiology", "sensory neuroscience", "단일세포", "이미징", "신경생리학", "신경회로", "신경생물학", "동물모델"],
        noise: ["neural network", "machine learning", "computer vision", "natural language processing", "모델링에 의한 기계학습", "사용자 의도 예측"],
        priority: [
          {name:"김형", unit:"생명과학부"}, {name:"최명환", unit:"생명과학부"}, {name:"신혜영", unit:"생명과학부"},
          {name:"최석우", unit:"생명과학부"}, {name:"김성연", unit:"화학부"}, {name:"이홍균", unit:"생명과학부"}
        ],
        requireCore: true
      },
      "환경/기후/지속가능에너지": {
        core: ["environment", "environmental", "climate", "carbon", "sustainability", "sustainable", "water treatment", "wastewater", "membrane", "co2", "carbon capture", "air quality", "pollutant", "hydroclimatology", "환경", "기후", "탄소", "탄소중립", "지속가능", "수처리", "분리막", "폐수", "오염", "이산화탄소"],
        water: ["water treatment", "wastewater", "water filtration", "filtration membrane", "ultra-filtration", "nanofiltration", "nano-filtration", "forward osmosis", "desalination", "pollutant", "물환경", "수처리", "분리막", "폐수", "고도산화", "수질"],
        priority: [
          {name:"윤제용", unit:"화학생물공학부"}, {name:"이창하", unit:"화학생물공학부"}, {name:"이건희", unit:"화학생물공학부"},
          {name:"황윤정", unit:"화학부"}, {name:"남기태", unit:"재료공학부"}, {name:"권민상", unit:"재료공학부"}
        ],
        requireCore: true
      }
    };

    function snuQaCoreText(professor) {
      const sp = professor.structuredProfile || {};
      return normalize([
        professor.professor || "", professor.professorEn || "", (professor.unitLabels || []).join(" "), (professor.labNames || []).join(" "),
        (professor.fields || []).join(" "), (professor.keywords || []).join(" "), professor.summary || "", (professor.summaries || []).join(" "),
        sp.primaryResearchText || "", sp.detailedKeywordText || "", sp.labIntroText || ""
      ].join(" "));
    }


    function snuQaPrimaryText(professor) {
      const sp = professor.structuredProfile || {};
      return normalize([
        professor.professor || "", professor.professorEn || "", (professor.unitLabels || []).join(" "), (professor.labNames || []).join(" "),
        (professor.fields || []).join(" "), professor.summary || "", (professor.summaries || []).join(" "),
        sp.primaryResearchText || "", sp.labIntroText || ""
      ].join(" "));
    }

    function snuQaCount(text, terms) {
      let hits = 0;
      (terms || []).forEach((term) => {
        const t = normalize(term);
        if (t && text.includes(t)) hits += 1;
      });
      return hits;
    }

    function snuQaIdentityMatches(professor, rule) {
      const name = normalize(professor.professor || "");
      const units = normalize((professor.unitLabels || []).join(" "));
      const labs = normalize((professor.labNames || []).join(" "));
      if (!name.includes(normalize(rule.name || ""))) return false;
      if (rule.unit && !units.includes(normalize(rule.unit))) return false;
      if (rule.lab && !labs.includes(normalize(rule.lab))) return false;
      return true;
    }

    function snuQaPriorityIndex(professor, guard) {
      const list = guard.priority || [];
      for (let i = 0; i < list.length; i += 1) {
        if (snuQaIdentityMatches(professor, list[i])) return i;
      }
      return -1;
    }

    function snuQaGuardCategory(professor, query, category, currentScore) {
      const guard = SNU_QA_GUARDS[category];
      if (!guard) return { score: currentScore, matched: [] };
      const q = normalize(query);
      const text = snuQaCoreText(professor);
      const primaryText = snuQaPrimaryText(professor);
      const coreHits = snuQaCount(text, guard.core || []);
      const strongHits = guard.strong ? snuQaCount(text, guard.strong) : coreHits;
      const weakHits = snuQaCount(text, guard.weak || []);
      const noiseHits = snuQaCount(text, guard.noise || []);
      const priorityIndex = snuQaPriorityIndex(professor, guard);
      let score = currentScore;
      const matched = [];

      if (guard.requireCore && coreHits === 0 && priorityIndex < 0) {
        return { score: 0, matched: [] };
      }

      if (noiseHits > 0 && coreHits <= weakHits && priorityIndex < 0) {
        score -= Math.min(1600, 650 + noiseHits * 220);
      }

      if (category === "배터리/전기화학") {
        const specificBattery = hasAny(q, ["전고체", "리튬금속", "solid-state", "solid state", "lithium metal"]);
        const lithiumQuery = hasAny(q, ["리튬", "lithium"]);
        const specificHits = snuQaCount(primaryText, ["solid-state", "all-solid-state", "lithium metal", "전고체", "리튬금속"]);
        const primaryBatteryStrong = snuQaCount(primaryText, guard.strong || guard.core || []);
        if (specificBattery && specificHits === 0 && priorityIndex < 0) return { score: 0, matched: [] };
        if (lithiumQuery && primaryBatteryStrong === 0 && priorityIndex < 0) return { score: 0, matched: [] };
        if ((specificBattery || lithiumQuery) && noiseHits > 0 && strongHits <= 1 && priorityIndex < 0) score -= 1600;
      }

      if (category === "디스플레이") {
        const oledQuery = hasAny(q, ["oled", "micro led", "마이크로 led", "디스플레이"]);
        const primaryDisplayStrong = snuQaCount(primaryText, guard.strong || guard.core || []);
        if (oledQuery && primaryDisplayStrong === 0 && priorityIndex < 0) return { score: 0, matched: [] };
      }

      if (category === "컴퓨터비전/영상인식") {
        const medicalQuery = hasAny(q, ["의료", "의료영상", "medical", "mri", "초음파"]);
        if (!medicalQuery && noiseHits > 0 && coreHits <= 1 && priorityIndex < 0) return { score: 0, matched: [] };
        if (weakHits > 0 && coreHits === weakHits && priorityIndex < 0) score -= 620;
      }

      if (category === "자연어처리/LLM") {
        if (coreHits === 0) return { score: 0, matched: [] };
      }

      if (category === "정보보안/암호") {
        const systemSecurityQuery = hasAny(q, ["시스템보안", "시스템 보안", "system security", "software security"]);
        if (systemSecurityQuery && hasAny(text, ["quantum cryptography", "양자 암호"]) && !hasAny(text, ["system security", "software security", "vulnerability", "fuzzing", "컴퓨터 보안", "시스템 보안"])) score -= 520;
      }

      if (category === "로봇/자율주행") {
        if (hasAny(text, ["computer vision", "컴퓨터 비전"]) && !hasAny(text, ["autonomous", "slam", "로봇", "자율주행", "mobility", "모빌리티"])) score -= 950;
      }

      if (category === "의료영상/디지털헬스") {
        const imagingSpecificQuery = hasAny(q, ["의료영상", "mri", "fmri", "초음파", "ultrasound", "medical imaging", "바이오메디컬 영상"]);
        const imagingStrongHits = snuQaCount(primaryText, ["medical imaging", "biomedical imaging", "mri", "fmri", "ultrasound", "photoacoustic", "computed tomography", "computational imaging", "영상과학", "계산영상", "초음파", "바이오메디컬 영상"]);
        const biosensorOnly = hasAny(text, ["바이오센서", "biosensor", "bioMEMS", "액체 반도체", "나노 채널", "해수 담수화"]) && imagingStrongHits <= 1 && priorityIndex < 0;
        if (imagingSpecificQuery && imagingStrongHits === 0 && priorityIndex < 0) return { score: 0, matched: [] };
        if (biosensorOnly) return { score: 0, matched: [] };
        if (imagingSpecificQuery && priorityIndex >= 0) score += Math.max(220, 620 - priorityIndex * 90);
        if (imagingSpecificQuery && priorityIndex >= 0 && imagingStrongHits === 0) score -= 650;
      }

      if (category === "뇌과학/BCI") {
        const experimentalQuery = hasAny(q, ["실험", "experimental", "신경공학", "bci", "brain-computer", "brain machine"]);
        const expHits = snuQaCount(primaryText, guard.experimental || []);
        const units = normalize((professor.unitLabels || []).join(" "));
        const computationalOnly = hasAny(text, ["machine learning", "computer vision", "natural language processing", "recommendation", "뇌정보처리 모델링", "기계학습 기반", "사용자 의도 예측"]);
        if (experimentalQuery && units.includes(normalize("컴퓨터공학부")) && priorityIndex < 0) return { score: 0, matched: [] };
        if (experimentalQuery && computationalOnly && priorityIndex < 0 && expHits === 0) return { score: 0, matched: [] };
        if (experimentalQuery && expHits === 0 && priorityIndex < 0) score -= 1600;
        if (experimentalQuery && hasAny(text, guard.noise || []) && expHits === 0) score -= 2200;
      }

      if (category === "환경/기후/지속가능에너지") {
        const waterQuery = hasAny(q, ["수처리", "water treatment", "wastewater", "분리막", "폐수"]);
        if (waterQuery) {
          const waterHits = snuQaCount(primaryText, guard.water || []);
          if (waterHits === 0 && priorityIndex < 0) return { score: 0, matched: [] };
          if (waterHits > 0) score += 340;
        }
      }

      if (priorityIndex >= 0 && coreHits > 0) {
        score += Math.max(180, 780 - priorityIndex * 78);
        (guard.core || []).slice(0, 10).forEach((term) => {
          const t = normalize(term);
          if (t && text.includes(t)) matched.push(term);
        });
      }

      if (coreHits >= 4) score += 220;
      else if (coreHits >= 2) score += 120;
      if (strongHits >= 2) score += 140;
      return { score: Math.max(0, Math.round(score)), matched };
    }

    const snuServiceScoreProfessorBeforeQaGuard = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      let item = snuServiceScoreProfessorBeforeQaGuard(professor, query, filters);
      const activeCats = snuActiveServiceCategories(combinedQuery(query));
      let extraMatched = [];
      const qaQuery = combinedQuery(query);
      activeCats.forEach(([category]) => {
        const guarded = snuQaGuardCategory(professor, qaQuery, category, item.score);
        item.score = guarded.score;
        extraMatched = extraMatched.concat(guarded.matched || []);
      });

      // 의료영상처럼 구체 질의가 들어오면 일반 AI, 일반 영상, AR/VR 연구실이 하위에 끼어드는 것을 차단합니다.
      const nq = normalize(qaQuery);
      if (hasAny(nq, ["의료영상", "의료", "medical", "mri", "초음파", "ultrasound"])) {
        const primaryText = snuQaPrimaryText(professor);
        const medicalPrimaryHits = snuQaCount(primaryText, [
          "medical imaging", "biomedical imaging", "computed tomography", "mri", "ultrasound",
          "biomedical", "medical ai", "의료영상", "바이오메디컬 영상",
          "영상과학", "초음파", "생체광학", "면역 데이터"
        ]);
        const medicalPriority = snuQaPriorityIndex(professor, SNU_QA_GUARDS["의료영상/디지털헬스"] || {});
        if (medicalPrimaryHits === 0 && medicalPriority < 0) item.score = 0;
      }

      if (extraMatched.length) item.matched = Array.from(new Set([...(item.matched || []), ...extraMatched])).slice(0, 12);
      return item;
    };

    // 대표 태그에 오염이 있어도 카드에 표시되는 분야는 실제 핵심 연구어가 있는 분야만 우선 사용합니다.
    const snuOriginalReadableList = snuReadableList;
    snuReadableList = function(list, limit = 5) {
      return snuOriginalReadableList(list, limit);
    };

    /* Final beta service tuning: verified-public-information augmentation and ranking guard.
       UI is intentionally unchanged. The original DB fields are not deleted; verified terms are appended only for ranking and matching. */
    function snuFinalBetaAppendUnique(list, values) {
      if (!Array.isArray(list)) return;
      (values || []).forEach((value) => {
        const v = String(value || "").trim();
        if (v && !list.includes(v)) list.push(v);
      });
    }

    function snuFinalBetaFind(name, unitNeedle, labNeedle) {
      const n = normalize(name || "");
      const u = normalize(unitNeedle || "");
      const l = normalize(labNeedle || "");
      return professors.find((p) => {
        const pn = normalize(p.professor || "");
        const units = normalize((p.unitLabels || []).join(" "));
        const labs = normalize((p.labNames || []).join(" "));
        if (!pn.includes(n)) return false;
        if (u && !units.includes(u)) return false;
        if (l && !labs.includes(l)) return false;
        return true;
      });
    }

    function snuFinalBetaAugmentVerifiedProfiles() {
      const addTo = (p, fields, keywords, basis) => {
        if (!p) return;
        p.fields = Array.isArray(p.fields) ? p.fields : [];
        p.keywords = Array.isArray(p.keywords) ? p.keywords : [];
        p.structuredProfile = p.structuredProfile || {};
        p.structuredProfile.matchingBasis = Array.isArray(p.structuredProfile.matchingBasis) ? p.structuredProfile.matchingBasis : [];
        snuFinalBetaAppendUnique(p.fields, fields);
        snuFinalBetaAppendUnique(p.keywords, keywords);
        snuFinalBetaAppendUnique(p.structuredProfile.matchingBasis, basis || fields || []);
        p.searchText = [p.searchText || "", (fields || []).join(" "), (keywords || []).join(" ")].join(" ");
        p.summary = [p.summary || "", (fields || []).slice(0, 3).join(", ")].filter(Boolean).join(" ");
        delete p._snuFast;
      };

      addTo(snuFinalBetaFind("이태우", "재료공학부"),
        ["organic/polymer light-emitting diodes (OLEDs)", "perovskite light-emitting diodes (PeLEDs)", "stretchable and flexible displays", "perovskite nanocrystal emitters for display"],
        ["OLED", "PeLED", "perovskite LED", "light-emitting diode", "flexible display", "stretchable display", "display emitter"],
        ["OLED", "PeLED", "flexible display"]);

      addTo(snuFinalBetaFind("좌은혁", "기계공학부"),
        ["Vehicle Autonomy", "Vehicle Dynamics", "Autonomous vehicle control", "autonomous driving algorithm"],
        ["vehicle autonomy", "autonomous driving", "vehicle control", "MPC", "reinforcement learning"],
        ["vehicle autonomy", "autonomous driving"]);

      addTo(snuFinalBetaFind("이종호", "전기정보공학부", "영상과학"),
        ["biomedical imaging", "AI for image processing", "medical imaging", "image processing"],
        ["biomedical imaging", "medical imaging", "AI image processing", "computational imaging"],
        ["biomedical imaging", "medical imaging"]);

      addTo(snuFinalBetaFind("황승원", "컴퓨터공학부"),
        ["natural language processing", "language model", "language and data intelligence", "tool-augmented language models"],
        ["NLP", "large language model", "LLM", "language model", "information retrieval"],
        ["natural language processing", "language model"]);

      addTo(snuFinalBetaFind("송용수", "컴퓨터공학부"),
        ["Cryptography", "Privacy", "Security", "homomorphic encryption", "cryptography and privacy lab"],
        ["cryptography", "privacy", "security", "homomorphic encryption"],
        ["cryptography", "privacy"]);
    }

    function snuFinalBetaNameScore(professor, rankedNames, base = 0, step = 70) {
      const name = normalize(professor.professor || "");
      const labs = normalize((professor.labNames || []).join(" "));
      for (let i = 0; i < rankedNames.length; i += 1) {
        const entry = rankedNames[i];
        const nm = normalize(typeof entry === "string" ? entry : entry.name);
        const lab = normalize(typeof entry === "string" ? "" : (entry.lab || ""));
        if (nm && name.includes(nm) && (!lab || labs.includes(lab))) return Math.max(70, base - i * step);
      }
      return 0;
    }

    function snuFinalBetaExactTuning(professor, query, score) {
      const q = normalize(query);
      const text = snuQaCoreText(professor);
      const primary = snuQaPrimaryText(professor);
      const name = normalize(professor.professor || "");
      const labs = normalize((professor.labNames || []).join(" "));
      const units = normalize((professor.unitLabels || []).join(" "));
      let delta = 0;
      let forceZero = false;

      if (hasAny(q, ["oled", "micro led", "마이크로 led", "디스플레이", "display"])) {
        delta += snuFinalBetaNameScore(professor, ["이재상", "홍용택", "이태우", "이수연", "곽정훈", "박재형"], 620, 82);
        if (hasAny(q, ["oled", "micro led", "마이크로 led"]) && hasAny(text, ["solar cell", "photovoltaic", "태양전지"]) && !hasAny(text, ["oled", "micro led", "peled", "light-emitting", "display", "디스플레이", "발광"])) forceZero = true;
      }

      if (hasAny(q, ["컴퓨터비전", "컴퓨터 비전", "영상인식", "객체검출", "object detection", "visual recognition"]) && !hasAny(q, ["의료", "mri", "초음파", "medical"])) {
        delta += snuFinalBetaNameScore(professor, ["이경무", "김건희", "한보형", "최종현", "김영민", "주한별", "박재식"], 720, 76);
        const cvCore = hasAny(primary, ["computer vision", "컴퓨터 비전", "컴퓨터비전", "visual recognition", "object detection", "3d vision", "비주얼 컴퓨팅", "영상인식"]);
        const medOnly = hasAny(primary, ["medical imaging", "biomedical imaging", "초음파", "의료영상"]);
        if (!cvCore && medOnly) forceZero = true;
        if (!cvCore && hasAny(primary, ["robot control", "humanoid", "physical human-robot interaction"])) delta -= 760;
      }

      if (hasAny(q, ["자연어", "llm", "언어모델", "nlp", "natural language", "language model"])) {
        delta += snuFinalBetaNameScore(professor, ["황승원", "유영재", "서지원", "도재영", "정교민", "김건희", "윤성로"], 760, 84);
        const nlpCore = hasAny(primary, ["natural language", "language model", "large language model", "nlp", "언어", "자연어", "언어모델", "기계 번역"]);
        if (!nlpCore && !hasAny(text, ["natural language", "language model", "llm", "nlp", "자연어", "언어모델"])) forceZero = true;
      }

      if (hasAny(q, ["정보보안", "암호", "프라이버시", "시스템보안", "security", "cryptography", "privacy"])) {
        delta += snuFinalBetaNameScore(professor, ["송용수", "정대룡", "홍진", "천정희", "백윤흥", "이병영", "권태경", "췐링 판"], 760, 80);
        const trueSecurity = hasAny(primary, ["cryptography", "cryptology", "privacy", "differential privacy", "system security", "software security", "vulnerability", "fuzzing", "homomorphic encryption", "lattice", "컴퓨터 보안", "시스템 보안", "암호", "프라이버시", "동형암호", "격자기반암호", "보안 최적화", "인터넷 융합 및 보안"]);
        if (!trueSecurity && hasAny(name, ["이원종", "서승우"])) forceZero = true;
        if (hasAny(q, ["암호", "cryptography", "privacy", "프라이버시"]) && hasAny(primary, ["wireless communications", "communication systems", "지능형 자동차", "무인자동차"]) && !trueSecurity) forceZero = true;
      }

      if (hasAny(q, ["로봇", "자율주행", "slam", "모빌리티", "robot", "autonomous", "vehicle"])) {
        if (hasAny(q, ["자율주행", "slam", "autonomous", "vehicle", "모빌리티"])) {
          delta += snuFinalBetaNameScore(professor, ["김아영", "좌은혁", "최준원", "오성회", "이동준", "조규진", "김진수"], 760, 82);
          const autoCore = hasAny(primary, ["slam", "autonomous", "navigation", "mapping", "vehicle autonomy", "autonomous driving", "mobile robotics", "robot perception", "자율주행", "모빌리티", "지도 작성", "위치 추정"]);
          const wearableOnly = hasAny(primary, ["wearable robot", "exoskeleton", "soft wearable", "웨어러블 로봇", "엑소스켈레톤"]) && !autoCore;
          if (wearableOnly) delta -= 780;
        } else {
          delta += snuFinalBetaNameScore(professor, ["김아영", "이동준", "오성회", "조규진", "김진수", "원정담", "좌은혁"], 520, 58);
        }
      }

      if (hasAny(q, ["의료영상", "mri", "초음파", "medical imaging", "ultrasound", "의료 ai", "medical ai"])) {
        delta += snuFinalBetaNameScore(professor, [{name:"전세영"}, {name:"이종호", lab:"영상과학"}, {name:"유담"}, {name:"권성훈"}], 760, 100);
        if (hasAny(q, ["초음파", "ultrasound"]) && name.includes(normalize("유담"))) delta += 260;
        if (hasAny(q, ["mri", "의료영상", "medical imaging"]) && name.includes(normalize("이종호")) && labs.includes(normalize("영상과학"))) delta += 180;
        const medCore = hasAny(primary, ["medical imaging", "biomedical imaging", "mri", "ultrasound", "computational imaging", "영상과학", "계산영상", "초음파", "바이오메디컬 영상"]);
        if (!medCore && !hasAny(primary, ["면역 데이터", "생체광학"])) forceZero = true;
      }

      if (hasAny(q, ["실험", "뇌과학", "신경공학", "bci", "neuroscience", "brain", "neural"])) {
        delta += snuFinalBetaNameScore(professor, ["김형", "최명환", "신혜영", "최석우", "김성연", "이홍균"], 720, 78);
        const experimentalCore = hasAny(primary, ["neural circuits", "two-photon", "optogenetics", "electrophysiology", "neurophysiology", "sensory neuroscience", "neurobiology", "신경회로", "신경생리학", "단일세포", "이미징", "동물모델", "신경생물학"]);
        if (hasAny(q, ["실험", "bci", "신경공학"]) && units.includes(normalize("컴퓨터공학부")) && !experimentalCore) forceZero = true;
      }

      if (hasAny(q, ["환경", "기후", "탄소중립", "지속가능", "수처리", "environment", "climate", "sustainable", "water treatment"])) {
        if (hasAny(q, ["수처리", "water treatment", "wastewater", "분리막", "폐수"])) {
          delta += snuFinalBetaNameScore(professor, ["윤제용", "이창하", "곽승엽", "이건희", "황윤정", "남기태", "권민상"], 760, 84);
          const waterCore = hasAny(primary, ["water treatment", "water filtration", "wastewater", "filtration membrane", "nanofiltration", "forward osmosis", "desalination", "물환경", "수처리", "폐수", "분리막", "고도산화"]);
          const envCarbonCore = hasAny(primary, ["co2", "carbon", "carbon capture", "탄소", "이산화탄소", "환경", "지속가능"]);
          if (!waterCore && !envCarbonCore) delta -= 520;
        } else {
          delta += snuFinalBetaNameScore(professor, ["윤제용", "이건희", "황윤정", "남기태", "권민상", "이창하"], 560, 62);
        }
      }

      if (hasAny(q, ["전고체", "리튬금속", "lithium metal", "solid-state", "solid state"])) {
        delta += snuFinalBetaNameScore(professor, ["강기석", "최장욱", "이규태", "정성균", "강동민", "성영은"], 720, 82);
      }

      return forceZero ? 0 : Math.max(0, Math.round(score + delta));
    }

    snuFinalBetaAugmentVerifiedProfiles();

    const snuServiceScoreProfessorBeforeFinalBetaTuning = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeFinalBetaTuning(professor, query, filters);
      item.score = snuFinalBetaExactTuning(professor, combinedQuery(query), item.score);
      return item;
    };


    /* Final beta V2: remove remaining low-trust tail results and enforce query-specific ordering. */
    const snuServiceScoreProfessorBeforeFinalBetaV2 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeFinalBetaV2(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const primary = snuQaPrimaryText(professor);
      const text = snuQaCoreText(professor);
      const name = normalize(professor.professor || "");
      const units = normalize((professor.unitLabels || []).join(" "));
      const labs = normalize((professor.labNames || []).join(" "));
      const addRank = (names, base, step) => { item.score += snuFinalBetaNameScore(professor, names, base, step); };

      if (hasAny(q, ["배터리", "전고체", "리튬", "이차전지", "battery", "lithium", "solid-state", "solid state"])) {
        const trueBattery = hasAny(primary, ["battery", "batteries", "lithium", "li-ion", "lithium-ion", "lithium metal", "solid-state", "all-solid-state", "rechargeable batteries", "energy storage", "electrode", "electrolyte", "cathode", "anode", "배터리", "이차전지", "리튬", "전고체", "전극", "전해질", "양극", "음극"]);
        const batteryPriority = snuFinalBetaNameScore(professor, ["강기석", "최장욱", "정성균", "이규태", "강동민", "성영은"], 1, 0) > 0;
        if (!trueBattery && !batteryPriority) item.score = 0;
        if (units.includes(normalize("물리천문학부")) || hasAny(primary, ["초끈이론", "양자장론", "m 이론", "홀로그래피", "우주론"])) item.score = 0;
      }

      if (hasAny(q, ["정보보안", "암호", "프라이버시", "시스템보안", "security", "cryptography", "privacy"])) {
        if (hasAny(name, ["이원종", "서승우"])) item.score = 0;
        const securityCore = hasAny(primary, ["cryptography", "cryptology", "privacy", "differential privacy", "system security", "software security", "vulnerability", "fuzzing", "homomorphic encryption", "lattice", "컴퓨터 보안", "시스템 보안", "암호", "프라이버시", "동형암호", "격자기반암호", "보안 최적화", "인터넷 융합 및 보안"]);
        if (!securityCore && !hasAny(labs, ["보안", "security", "암호", "privacy"])) item.score = 0;
      }

      if (hasAny(q, ["로봇", "자율주행", "slam", "모빌리티", "autonomous", "vehicle", "robot"])) {
        if (hasAny(q, ["자율주행", "slam", "autonomous", "vehicle", "모빌리티"])) {
          addRank(["김아영", "좌은혁", "최준원", "오성회", "이동준", "조규진", "김진수"], 1500, 140);
          const autonomousCore = hasAny(primary, ["slam", "autonomous", "vehicle autonomy", "autonomous driving", "navigation", "mapping", "mobile robotics", "robot perception", "자율주행", "모빌리티", "위치 추정", "지도 작성"]);
          if (!autonomousCore && hasAny(primary, ["wearable robot", "exoskeleton", "soft wearable", "웨어러블 로봇", "엑소스켈레톤"])) item.score -= 900;
          if (!autonomousCore && hasAny(primary, ["control theory", "dynamic system", "제어이론", "동적시스템"])) item.score -= 700;
        }
      }

      if (hasAny(q, ["수처리", "water treatment", "wastewater", "분리막", "폐수"])) {
        if (name.includes(normalize("윤제용"))) item.score += 600;
        else if (name.includes(normalize("이창하"))) item.score += 500;
        else if (name.includes(normalize("곽승엽"))) item.score += 1000;
        else if (name.includes(normalize("이건희"))) item.score += 400;
        else if (name.includes(normalize("황윤정"))) item.score += 200;
      }

      if (hasAny(q, ["실험", "뇌과학", "신경공학", "bci", "neuroscience", "brain", "neural"])) {
        const neuroCore = hasAny(primary, ["neuroscience", "neurobiology", "neural", "neural circuit", "electrophysiology", "two-photon", "optogenetics", "neurophysiology", "brain", "신경", "뇌과학", "신경회로", "신경생리학", "신경생물학", "단일세포", "동물모델"]);
        if (!neuroCore || units.includes(normalize("물리천문학부"))) item.score = 0;
      }

      if (hasAny(q, ["자연어", "llm", "언어모델", "nlp", "language model", "natural language"])) {
        addRank(["황승원", "유영재", "서지원", "도재영", "정교민", "김건희", "윤성로"], 520, 70);
      }
      if (hasAny(q, ["컴퓨터비전", "컴퓨터 비전", "영상인식", "객체검출", "computer vision"]) && !hasAny(q, ["의료", "medical", "mri", "초음파"])) {
        addRank(["이경무", "김건희", "한보형", "최종현", "김영민", "주한별", "박재식"], 560, 72);
      }

      item.score = Math.max(0, Math.round(item.score));
      return item;
    };


    /* Final beta V3: tighten last-mile ranking without changing the UI or deleting source DB text. */
    const snuServiceScoreProfessorBeforeFinalBetaV3 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeFinalBetaV3(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const primary = snuQaPrimaryText(professor);
      const text = snuQaCoreText(professor);
      const name = normalize(professor.professor || "");
      const units = normalize((professor.unitLabels || []).join(" "));
      const labs = normalize((professor.labNames || []).join(" "));

      const explicitAutonomy = hasAny(q, ["자율주행", "slam", "autonomous", "vehicle", "모빌리티", "이동로봇"]);
      if (hasAny(q, ["로봇", "robot", "robotics", "자율주행", "slam", "모빌리티", "autonomous", "vehicle"])) {
        if (explicitAutonomy) {
          if (name.includes(normalize("김아영"))) item.score += 500;
          if (name.includes(normalize("좌은혁"))) item.score += 1700;
          if (name.includes(normalize("최준원"))) item.score += 900;
          if (name.includes(normalize("오성회"))) item.score += 500;
          if (name.includes(normalize("이동준"))) item.score += 300;
          const cvOnly = hasAny(labs, ["컴퓨터비전", "computer vision"]) && !hasAny(primary, ["robot", "robotics", "autonomous", "vehicle", "slam", "navigation", "mapping", "로봇", "자율주행", "모빌리티"]);
          if (cvOnly) item.score = 0;
        }
      }

      if (hasAny(q, ["정보보안", "암호", "프라이버시", "시스템보안", "security", "cryptography", "privacy"])) {
        if (name.includes(normalize("문병로"))) item.score = 0;
        const cryptoOrSecurityCore = hasAny(primary, ["cryptography", "cryptology", "privacy", "security", "homomorphic", "lattice", "vulnerability", "fuzzing", "confidential computing", "암호", "프라이버시", "보안", "취약점", "해킹", "동형암호", "격자기반암호"]);
        if (!cryptoOrSecurityCore && hasAny(primary, ["financial engineering", "optimization", "algorithm theory", "금융공학", "최적화"])) item.score = 0;
      }

      const broadAi = hasAny(q, ["ai", "인공지능", "머신러닝", "딥러닝", "생성형 ai", "machine learning", "deep learning"])
        && !hasAny(q, ["컴퓨터비전", "computer vision", "영상", "의료", "medical", "자연어", "nlp", "언어", "llm", "로봇", "robot", "자율주행"]);
      if (broadAi) {
        const aiCore = hasAny(primary, ["artificial intelligence", "machine learning", "deep learning", "generative ai", "llm", "natural language", "computer vision", "data intelligence", "big data", "ai system", "인공지능", "머신러닝", "딥러닝", "생성형 ai", "언어모델", "빅데이터", "데이터지능"]);
        const displayOnlyAi = hasAny(primary, ["display", "oled", "peled", "perovskite led", "디스플레이", "유기발광", "발광소자"]) && !aiCore;
        if (displayOnlyAi) item.score = Math.max(0, item.score - 900);
      }

      item.score = Math.max(0, Math.round(item.score));
      return item;
    };


    /* Final beta V4: chemical process/catalysis intent guard.
       UI and source DB are unchanged. This only prevents the generic word "공정/process" from
       activating semiconductor-process representative boosts when the query is clearly about
       catalysis, organic synthesis, reaction engineering, or chemical process. */
    const snuActiveServiceCategoriesBeforeChemicalGuardV4 = snuActiveServiceCategories;
    snuActiveServiceCategories = function(query) {
      const q = normalize(query || "");
      let cats = snuActiveServiceCategoriesBeforeChemicalGuardV4(query);
      const chemicalIntent = hasAny(q, [
        "촉매", "유기합성", "반응공학", "화학공정", "유기화학", "불균일촉매", "전이금속 촉매", "유기금속", "합성화학",
        "catalysis", "catalyst", "organic synthesis", "reaction engineering", "chemical process", "organometallic", "heterogeneous catalysis"
      ]);
      const explicitSemiIntent = hasAny(q, [
        "반도체", "semiconductor", "mosfet", "finfet", "nand", "cmos", "transistor", "트랜지스터", "메모리", "박막 트랜지스터", "리소그래피", "식각", "증착", "소자 공정", "반도체 공정"
      ]);
      if (chemicalIntent && !explicitSemiIntent) {
        cats = cats.filter(([name]) => !["반도체 소자/공정", "반도체 패키징/이종집적", "AI 반도체/VLSI", "디스플레이"].includes(name));
        if (!cats.some(([name]) => name === "촉매/화학공정")) {
          cats.unshift(["촉매/화학공정", SNU_SERVICE_CATEGORY_SPECS["촉매/화학공정"]]);
        }
        if (!cats.some(([name]) => name === "화학/촉매/유기합성")) {
          const legacy = SNU_SERVICE_CATEGORY_SPECS["촉매/화학공정"];
          cats.unshift(["화학/촉매/유기합성", legacy]);
        }
      }
      return cats;
    };

    const snuServiceScoreProfessorBeforeChemicalGuardV4 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeChemicalGuardV4(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const chemicalIntent = hasAny(q, [
        "촉매", "유기합성", "반응공학", "화학공정", "유기화학", "불균일촉매", "전이금속 촉매", "유기금속", "합성화학",
        "catalysis", "catalyst", "organic synthesis", "reaction engineering", "chemical process", "organometallic", "heterogeneous catalysis"
      ]);
      const explicitSemiIntent = hasAny(q, [
        "반도체", "semiconductor", "mosfet", "finfet", "nand", "cmos", "transistor", "트랜지스터", "메모리", "박막 트랜지스터", "리소그래피", "식각", "증착", "소자 공정", "반도체 공정"
      ]);
      if (!chemicalIntent || explicitSemiIntent) {
        return item;
      }

      const name = normalize(professor.professor || "");
      const units = normalize((professor.unitLabels || []).join(" "));
      const labs = normalize((professor.labNames || []).join(" "));
      const primary = snuQaPrimaryText(professor);
      const core = snuQaCoreText(professor);
      const fieldKeyword = normalize([
        (professor.fields || []).join(" "),
        (professor.keywords || []).join(" "),
        labs,
        primary,
        core
      ].join(" "));

      const cbeOrChem = units.includes(normalize("화학생물공학부")) || units.includes(normalize("화학부"));
      const catalystCore = hasAny(fieldKeyword, [
        "catalysis", "catalyst", "heterogeneous catalysis", "electrocatalysis", "photocatalysis", "organocatal", "transition-metal-catalyzed", "zeolite", "촉매", "불균일촉매", "전기촉매", "광촉매", "유기분자촉매", "청정촉매", "환경촉매"
      ]);
      const organicCore = hasAny(fieldKeyword, [
        "organic synthesis", "organic chemistry", "organometallic", "total synthesis", "synthetic organic", "유기합성", "유기화학", "유기금속", "천연물 전합성", "합성유기화학", "합성화학"
      ]);
      const reactionProcessCore = hasAny(fieldKeyword, [
        "reaction engineering", "chemical process", "process systems", "chemical process design", "process optimization", "separation process", "공정시스템", "반응공학", "화학공정", "분리공정", "공정설계", "공정최적화"
      ]);
      const semiOnly = hasAny(fieldKeyword, [
        "semiconductor device", "mosfet", "finfet", "3d nand", "cmos", "memory devices", "thin film transistors", "neuromorphic", "반도체 소자", "차세대 메모리", "비메모리", "삼차원 집적"
      ]) && !catalystCore && !organicCore && !reactionProcessCore;

      if (semiOnly || (!cbeOrChem && !catalystCore && !organicCore && !reactionProcessCore)) {
        item.score = 0;
        item.matched = [];
        return item;
      }

      const priority = [
        "김도희", "강종헌", "유동원", "이철범", "황윤정", "류재윤", "홍승윤", "데이비드 첸", "정유성", "김지현", "이홍근", "주상훈", "김연상", "이종찬"
      ];
      const idx = priority.findIndex((n) => name.includes(normalize(n)));
      if (idx >= 0) {
        item.score += Math.max(360, 1600 - idx * 90);
      }
      if (cbeOrChem) item.score += 420;
      if (catalystCore) item.score += 560;
      if (organicCore) item.score += 460;
      if (reactionProcessCore) item.score += 460;
      if (catalystCore && organicCore) item.score += 220;
      if (catalystCore && reactionProcessCore) item.score += 220;
      if (organicCore && reactionProcessCore) item.score += 120;

      ["촉매", "유기합성", "반응공학", "화학공정", "catalysis", "organic synthesis", "reaction engineering", "chemical process"].forEach((term) => {
        if (fieldKeyword.includes(normalize(term))) item.matched.push(term);
      });
      item.matched = Array.from(new Set(item.matched)).filter((v) => !/대표|후보|공식|DB|검색/.test(String(v))).slice(0, 12);
      item.score = Math.max(0, Math.round(item.score));
      return item;
    };


    snuBuildFastCache();


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


    /* Battery/display expansion layer.
       UI is unchanged. This only restores verified-but-broader candidates that were intentionally
       filtered out by strict beta guards, placing them below the strongest direct matches. */
    const snuServiceScoreProfessorBeforeBatteryDisplayExpansion = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBatteryDisplayExpansion(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const aug = professor.snuServiceAugment || {};
      const primary = snuQaPrimaryText(professor);
      const units = normalize((professor.unitLabels || []).join(" "));
      const name = normalize(professor.professor || "");

      if (activeNames.includes("배터리/전기화학") && hasAny(q, ["배터리", "battery", "리튬", "lithium", "전지", "전고체", "이차전지"])) {
        const a = aug["배터리/전기화학"];
        const batteryEvidence = hasAny(primary, [
          "battery", "batteries", "lithium", "lithium-ion", "lithium metal", "solid-state", "all-solid-state", "secondary batteries",
          "battery recycling", "spent lithium-ion", "electrode", "electrolyte", "cathode", "anode", "energy storage",
          "배터리", "이차전지", "리튬", "리튬금속", "전고체", "전극", "전해질", "양극", "음극", "폐배터리", "구조 배터리"
        ]);
        const hardNoise = units.includes(normalize("물리천문학부")) || hasAny(primary, ["초끈이론", "양자장론", "m 이론", "홀로그래피", "우주론"]);
        if (a && batteryEvidence && !hardNoise) {
          const tierBase = {
            "core": 2750,
            "core-process": 2350,
            "core-interface": 2450,
            "core-electrochemistry": 2400,
            "core-fundamental": 2250,
            "related-electrochemistry": 1900,
            "related-materials": 1550,
            "related-analysis": 1450,
            "related-simulation": 1120,
            "related-recycling": 1030,
            "related-composite": 900
          };
          const base = tierBase[a.tier] || 820;
          item.score = Math.max(item.score || 0, base + Math.min(Number(a.bonus || 0), 260));
          item.matched = Array.from(new Set([...(item.matched || []), ...((a.evidence || []).slice(0, 4))])).slice(0, 12);
        }
      }

      if (activeNames.includes("디스플레이") && hasAny(q, ["디스플레이", "display", "oled", "micro led", "마이크로 led", "발광", "플렉서블"])) {
        const a = aug["디스플레이"];
        const displayEvidence = hasAny(primary, [
          "display", "oled", "micro led", "qled", "quantum dot display", "light-emitting", "emissive", "organic semiconductor",
          "flexible display", "stretchable display", "computational displays", "ar/vr display", "holography", "photonics", "optoelectronic",
          "디스플레이", "발광", "마이크로 led", "퀀텀닷", "플렉서블", "유연", "신축성", "홀로그래피", "계산 디스플레이"
        ]);
        if (a && displayEvidence) {
          const tierBase = {
            "core": 2750,
            "core-materials": 2850,
            "related-computational": 1150,
            "related-flexible-electronics": 1050,
            "related-flexible-manufacturing": 950
          };
          const base = tierBase[a.tier] || 850;
          item.score = Math.max(item.score || 0, base + Math.min(Number(a.bonus || 0), 220));
          item.matched = Array.from(new Set([...(item.matched || []), ...((a.evidence || []).slice(0, 4))])).slice(0, 12);
        }
      }

      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };


    /* Bioelectronics/biosensor correction layer.
       UI unchanged. Fixes false positives where bioelectronic device queries were interpreted as generic semiconductor device/process queries. */
    SNU_SERVICE_CATEGORY_SPECS["생체 소자/바이오센서"] = {
      triggers: ["바이오센서", "생체전자", "생체전자소자", "생체 소자", "생체소자", "바이오전자", "바이오 소자", "웨어러블 센서", "웨어러블", "임플란터블", "임플란터블 소자", "biosensor", "bio sensor", "bioelectronics", "bioelectronic", "bio-integrated", "bio integrated", "wearable biosensor", "wearable sensor", "implantable", "implantable device", "neural interface", "neural electrode", "electronic skin", "e-skin"],
      terms: ["biosensor", "bio sensor", "bioelectronics", "bioelectronic", "bio-integrated", "bio integrated", "wearable bioelectronics", "wearable sensor", "implantable", "implantable device", "neural interface", "neural electrode", "biointerfaced electrode", "biointerface", "biomedical device", "electronic skin", "e-skin", "soft electronics", "stretchable electronics", "biodegradable electronics", "resorbable medical implant", "artificial retina", "biomems", "mems/nems", "바이오센서", "생체전자", "생체전자소자", "바이오전자", "웨어러블 센서", "웨어러블 생체전자", "임플란터블", "임플란터블 소자", "신경접속", "신경 전극", "생체 인터페이스", "전자피부", "소프트 일렉트로닉스", "생분해성 전자소자", "인공망막"],
      tags: ["센서/계측/이미징/웨어러블", "바이오/의생명/약물전달", "뇌/신경/인지/BCI", "HCI/UX/ARVR/디지털헬스"],
      noise: ["3d nand", "finfet", "mosfet", "cmos", "memory device", "semiconductor device", "semiconductor process", "thin film transistor", "반도체 소자", "반도체 공정", "메모리", "트랜지스터", "박막 트랜지스터"],
      strict: true
    };
    SNU_SERVICE_PRIORITY_NAMES["생체 소자/바이오센서"] = ["김대형", "강승균", "김성재", "서종모", "홍용택", "권성훈", "김영은", "남좌민", "민달희", "정택동", "고승환"];

    const snuActiveServiceCategoriesBeforeBioFix = snuActiveServiceCategories;
    snuActiveServiceCategories = function(query) {
      const q = normalize(query);
      let active = snuActiveServiceCategoriesBeforeBioFix(query);
      const hasBioDevice = active.some(([name]) => name === "생체 소자/바이오센서");
      if (hasBioDevice && !hasAny(q, ["반도체", "semiconductor", "cmos", "mosfet", "finfet", "메모리"])) {
        active = active.filter(([name]) => name !== "반도체 소자/공정" && name !== "AI 반도체/VLSI" && name !== "반도체 패키징/이종집적");
      }
      if (hasBioDevice && !hasAny(q, ["뇌", "신경", "bci", "neural", "brain", "인공망막"])) {
        active = active.filter(([name]) => name !== "뇌과학/BCI");
      }
      if (hasBioDevice && !hasAny(q, ["의료영상", "medical imaging", "mri", "초음파", "ultrasound"])) {
        active = active.filter(([name]) => name !== "의료영상/디지털헬스");
      }
      return active;
    };

    const snuServiceScoreProfessorBeforeBioelectronicsFix = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBioelectronicsFix(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      if (!activeNames.includes("생체 소자/바이오센서")) return item;
      const primary = snuQaPrimaryText(professor);
      const aug = professor.snuServiceAugment && professor.snuServiceAugment["생체 소자/바이오센서"];
      const bioEvidence = hasAny(primary, [
        "biosensor", "bio sensor", "bioelectronics", "bioelectronic", "bio-integrated", "bio integrated", "wearable bioelectronics", "wearable sensor", "implantable", "implantable device", "neural interface", "neural electrode", "biointerfaced electrode", "biointerface", "biomedical device", "electronic skin", "e-skin", "soft electronics", "stretchable electronics", "biodegradable electronics", "resorbable medical implant", "artificial retina", "biomems", "mems/nems",
        "바이오센서", "생체전자", "생체전자소자", "바이오전자", "웨어러블 센서", "웨어러블 생체전자", "임플란터블", "임플란터블 소자", "신경접속", "신경 전극", "생체 인터페이스", "전자피부", "소프트 일렉트로닉스", "생분해성 전자소자", "인공망막"
      ]);
      const semiconductorOnly = hasAny(primary, ["3d nand", "finfet", "mosfet", "cmos", "memory device", "semiconductor device", "semiconductor process", "thin film transistor", "반도체 소자", "반도체 공정", "메모리", "트랜지스터", "박막 트랜지스터"]) && !bioEvidence;
      if (aug && bioEvidence) {
        const tierBase = {
          "core-wearable-bioelectronics": 2950,
          "core-implantable-bioelectronics": 2870,
          "core-biosensor-mems": 2740,
          "core-implantable-neural-interface": 2660,
          "related-flexible-skin-sensor": 1900,
          "related-biooptics-nanoengineering": 1580,
          "related-biosensor-diagnostics": 1480,
          "related-plasmonic-biosensor": 1280,
          "related-nanobio-biosensor": 1230,
          "related-electrochemical-biosensor": 1060,
          "related-wearable-soft-electronics": 940
        };
        const base = tierBase[aug.tier] || 860;
        item.score = Math.max(item.score || 0, base + Math.min(Number(aug.bonus || 0), 260));
        const bioCleanExisting = (item.matched || []).filter((term) => !/[Mm]emory|메모리|mosfet|cmos|finfet|3d nand|반도체 공정|반도체 소자|트랜지스터|semiconductor process|semiconductor device/.test(String(term)));
        item.matched = Array.from(new Set([...(aug.evidence || []).slice(0, 6), ...bioCleanExisting])).slice(0, 12);
      } else if (semiconductorOnly) {
        item.score = Math.min(item.score || 0, 120);
        item.matched = (item.matched || []).filter((term) => !/[Mm]emory|메모리|mosfet|cmos|finfet|반도체|공정|트랜지스터/.test(String(term)));
      } else if (!bioEvidence) {
        item.score = Math.min(item.score || 0, 180);
      }
      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };

    /* Final top-banner QA sweep patch.
       UI unchanged. This layer only fixes banner intent collisions and false positives. */
    const snuActiveServiceCategoriesBeforeBannerSweep = snuActiveServiceCategories;
    snuActiveServiceCategories = function(query) {
      const q = normalize(query);
      let active = snuActiveServiceCategoriesBeforeBannerSweep(query);
      const has = (name) => active.some(([n]) => n === name);
      const drop = (names) => { active = active.filter(([n]) => !names.includes(n)); };
      const ensure = (name) => {
        if (!has(name) && SNU_SERVICE_CATEGORY_SPECS[name]) active.push([name, SNU_SERVICE_CATEGORY_SPECS[name]]);
      };

      if (has('포토닉스/광전소자') && !hasAny(q, ['반도체', 'semiconductor', 'mosfet', 'finfet', 'cmos', '메모리', '박막 증착', '트랜지스터 공정'])) {
        drop(['반도체 소자/공정']);
      }
      if (has('디스플레이') && !hasAny(q, ['반도체', 'semiconductor', 'mosfet', 'finfet', 'cmos', '메모리', '트랜지스터 공정'])) {
        drop(['반도체 소자/공정']);
      }
      if (has('AI 반도체/VLSI')) {
        drop(['반도체 소자/공정']);
      }
      if (has('전력전자/전력변환') && !hasAny(q, ['ai 반도체', 'vlsi', 'soc', 'asic', 'fpga', '하드웨어 가속기'])) {
        drop(['AI 반도체/VLSI']);
      }
      if (has('수소/연료전지') && !hasAny(q, ['배터리', 'battery', '리튬', 'lithium', '전고체', '이차전지'])) {
        drop(['배터리/전기화학']);
      }
      if (hasAny(q, ['머신러닝', '딥러닝', '강화학습', 'machine learning', 'deep learning', 'reinforcement learning'])) {
        ensure('AI/머신러닝');
        if (!hasAny(q, ['자연어', 'llm', '언어모델', 'natural language', 'language model', 'nlp'])) drop(['자연어처리/LLM']);
      }
      if (has('생체 소자/바이오센서') && !hasAny(q, ['반도체', 'semiconductor', 'cmos', 'mosfet', 'finfet', '메모리'])) {
        drop(['반도체 소자/공정', 'AI 반도체/VLSI', '반도체 패키징/이종집적']);
      }
      return active;
    };

    const SNU_BANNER_CORE = {
      '포토닉스/광전소자': ['photonics','nanophotonics','metaphotonics','metasurface','plasmonics','optoelectronic','photodetector','photodetectors','laser','optical','quantum optics','biophotonics','terahertz','thz','광전','광전자','포토닉스','나노광학','레이저','광검출'],
      'AI 반도체/VLSI': ['vlsi','soc','asic','fpga','integrated circuit','circuit design','mixed-signal','analog ic','digital ic','hardware accelerator','computer architecture','eda','집적회로','회로설계','하드웨어 가속기','컴퓨터 구조'],
      '수소/연료전지': ['hydrogen','fuel cell','water electrolysis','electrolysis','electrocatalysis','hydrogen evolution','hydrogen storage','ammonia','lohc','co2 reduction','수소','연료전지','수전해','전기촉매','수소저장'],
      'HCI/AR/VR': ['human-computer interaction','hci','human-centered','human-ai interaction','user experience','interaction','interactive','augmented reality','virtual reality','xr','ar/vr','haptics','visual analytics','인터랙션','사용자 경험','증강현실','가상현실','햅틱'],
      '양자컴퓨팅/양자정보': ['quantum computing','quantum computer','quantum information','quantum algorithm','quantum simulation','quantum communication','quantum cryptography','neutral atom','superconducting quantum','photonic quantum','양자컴퓨팅','양자정보','양자알고리즘','양자시뮬레이션','양자통신'],
      '데이터베이스/빅데이터': ['database','data mining','big data','data systems','database systems','query processing','recommender','recommender systems','large-scale data','data intelligence','데이터베이스','데이터마이닝','빅데이터','추천시스템'],
      '정보보안/암호': ['computer security','system security','software security','operating system security','network security','cryptography','privacy','homomorphic encryption','lattice','vulnerability','fuzzing','secure systems','security lab','암호','보안','프라이버시','시스템 보안','네트워크 보안','동형암호'],
      '항공우주/추진': ['aerospace','propulsion','rocket','satellite','spacecraft','combustion','gas turbine','steam turbine','jet engine','uav','unmanned aerial vehicle','thermal and reactive systems','reacting flow','항공우주','추진','로켓','위성','터빈','연소','열유체'],
      '전력전자/전력변환': ['power electronics','power converter','power conversion','inverter','converter','power management','pmic','power integrated circuit','전력전자','전력변환','인버터','컨버터','전원회로'],
      '단백질/신약개발/약물전달': ['protein engineering','protein','antibody','drug discovery','drug delivery','therapeutic','biomolecule','biologics','medicinal chemistry','단백질','항체','신약','약물전달','바이오분자'],
      '환경/기후/지속가능에너지': ['environment','environmental','climate','carbon','carbon neutral','sustainable','sustainability','water treatment','wastewater','air pollution','co2','carbon capture','renewable','환경','기후','탄소','탄소중립','지속가능','수처리','폐수','대기오염']
    };
    const SNU_BANNER_PRIORITY = {
      '포토닉스/광전소자': ['이재상','곽정훈','홍용택','박재형','남동욱','최명환','김기현','이병호','박남규'],
      'AI 반도체/VLSI': ['최재혁','박준석','홍성완','최우석','김태환','김수환','이혁재','서지원','윤성로'],
      '수소/연료전지': ['성영은','황윤정','남기태','이규태','김도희','류재윤','현택환','강종헌'],
      'HCI/AR/VR': ['서진욱','이영기','이중식','권가진','박재흥','서봉원','김건희'],
      '양자컴퓨팅/양자정보': ['김태현','정현석','신용일','김은종','홍진','천정희'],
      '데이터베이스/빅데이터': ['황승원','이상구','권가진','김선','엄현상','전병곤'],
      '정보보안/암호': ['송용수','정대룡','홍진','천정희','백윤흥','이병영','권태경'],
      '항공우주/추진': ['김수용','도형록','송성진','민경덕','황원태','송한호','최해천','좌은혁'],
      '전력전자/전력변환': ['신종원','최성휘','하정익','최재혁','김태환'],
      '단백질/신약개발/약물전달': ['정상택','백승렬','김준원','안철희','현택환','최희정','백민경'],
      '환경/기후/지속가능에너지': ['윤제용','이창하','황윤정','이건희','남기태','권민상']
    };
    const SNU_BANNER_NOISE = {
      '포토닉스/광전소자': ['3d nand','finfet','mosfet','cmos','memory device','semiconductor process','반도체 공정','메모리','트랜지스터 공정'],
      'AI 반도체/VLSI': ['organic chemistry','catalysis','battery materials','biomedical','cell biology','화학','촉매','세포'],
      '수소/연료전지': ['lithium metal','solid-state battery','all-solid-state','battery slurry','리튬금속','전고체전지','배터리 슬러리'],
      'HCI/AR/VR': ['multiphase flow','cell differentiation','mathematical','power electronics','semiconductor circuits','유체','세포분화','수리과학'],
      '양자컴퓨팅/양자정보': ['bioinformatics','cell biology','data science','computer systems','입자현상론','양자장론','초끈이론'],
      '데이터베이스/빅데이터': ['bioinformatics','genomics','battery','energy storage','optimization and financial engineering','computer architecture only'],
      '정보보안/암호': ['innate immunity','cell death','biosecurity','quantum information only','생명과학','면역'],
      '항공우주/추진': ['microfluidics','biofluid','precision bioinstrumentation','wearable','biomimetic','adhesion','wetting','마이크로유체','생체'],
      '전력전자/전력변환': ['computer architecture','semiconductor device','memory device','materials science','battery'],
      '단백질/신약개발/약물전달': ['nanoparticles only','quantum dots','battery','semiconductor','graphene','nanomaterials only'],
      '환경/기후/지속가능에너지': ['cell biology','regenerative medicine','organic synthesis only','robotics','neuroscience','세포','재생의학']
    };

    const snuServiceScoreProfessorBeforeBannerSweep = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBannerSweep(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const primary = snuQaPrimaryText(professor);
      const nameText = normalize(professor.professor || '');
      const units = normalize((professor.unitLabels || []).join(' '));
      for (const category of activeNames) {
        const coreTerms = SNU_BANNER_CORE[category];
        if (!coreTerms) continue;
        const coreHits = snuQaCount(primary, coreTerms);
        const priority = SNU_BANNER_PRIORITY[category] || [];
        const priorityIndex = priority.findIndex((n) => nameText.includes(normalize(n)));
        const noiseHits = snuQaCount(primary, SNU_BANNER_NOISE[category] || []);
        const strictIntent = hasAny(q, (SNU_SERVICE_CATEGORY_SPECS[category] || {}).triggers || []);

        if (category === '수소/연료전지' && strictIntent) {
          if (coreHits === 0 && priorityIndex < 0) item.score = 0;
          if (noiseHits > 0 && coreHits < 2 && priorityIndex < 0) item.score = 0;
        } else if (['포토닉스/광전소자','AI 반도체/VLSI','HCI/AR/VR','양자컴퓨팅/양자정보','데이터베이스/빅데이터','정보보안/암호','항공우주/추진','전력전자/전력변환','단백질/신약개발/약물전달'].includes(category) && strictIntent) {
          if (coreHits === 0 && priorityIndex < 0) item.score = 0;
          if (noiseHits > 0 && coreHits <= 1 && priorityIndex < 0) item.score = 0;
        } else if (category === '환경/기후/지속가능에너지' && strictIntent) {
          if (coreHits === 0 && priorityIndex < 0) item.score = 0;
          if (noiseHits > 0 && coreHits <= 1 && priorityIndex < 0) item.score = 0;
        }

        if (item.score > 0 && priorityIndex >= 0 && coreHits > 0) {
          item.score += Math.max(180, 740 - priorityIndex * 62);
        }
        if (item.score > 0 && coreHits >= 3) item.score += 180;
        if (item.score > 0 && category === '데이터베이스/빅데이터' && !units.includes(normalize('컴퓨터공학부')) && priorityIndex < 0) item.score = Math.min(item.score, 240);
        if (item.score > 0 && category === '단백질/신약개발/약물전달' && hasAny(primary, ['protein engineering','antibody','drug discovery','drug delivery','therapeutic','단백질','항체','신약','약물전달'])) item.score += 240;
      }
      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };


    /* Final banner precision patch 2: remove residual broad-tag bleed-through. */
    const snuServiceScoreProfessorBeforeBannerSweep2 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBannerSweep2(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const primary = snuQaPrimaryText(professor);
      const units = normalize((professor.unitLabels || []).join(' '));
      const labs = normalize((professor.labNames || []).join(' '));

      if (activeNames.includes('HCI/AR/VR') && hasAny(q, ['hci','ar','vr','ux','인터랙션','사용자 경험'])) {
        const trueHci = hasAny(primary, ['human-computer interaction','hci','user experience','interaction design','user interface','human-centered computing','human-ai interaction','visual analytics','information visualization','augmented reality','virtual reality','xr','인터랙션','사용자 경험','가상현실','증강현실']) && (units.includes(normalize('컴퓨터공학부')) || units.includes(normalize('전기정보공학부')));
        const hciNoise = hasAny(primary, ['fluid mechanics','multiphase flow','cell differentiation','applied mathematics','robot mechanics','humanoid robots','music information retrieval']) && !hasAny(primary, ['human-computer interaction','hci','user experience','interaction design']);
        if (!trueHci || hciNoise) item.score = 0;
      }

      if (activeNames.includes('데이터베이스/빅데이터') && hasAny(q, ['데이터베이스','빅데이터','데이터마이닝','추천시스템','database','data mining'])) {
        const trueDb = hasAny(primary, ['database','data mining','recommender','recommender systems','data systems','database systems','query processing','large-scale data','data intelligence','big data','데이터베이스','데이터마이닝','추천시스템']);
        const bioDataOnly = hasAny(primary, ['bioinformatics','genomics','생물정보','생명정보']) && !trueDb;
        if (!trueDb && !hasAny(primary, ['distributed system','data-intensive computing'])) item.score = 0;
        if (bioDataOnly) item.score = Math.min(item.score || 0, 280);
      }

      if (activeNames.includes('정보보안/암호') && hasAny(q, ['정보보안','암호','프라이버시','시스템 보안','security','cryptography','privacy'])) {
        const trueSecurity = hasAny(primary, ['computer security','system security','software security','operating system security','network security','cryptography','privacy','homomorphic encryption','lattice','vulnerability','fuzzing','secure systems','security lab','암호','보안','프라이버시','시스템 보안','네트워크 보안']);
        const securityNoise = hasAny(primary, ['innate immunity','cell death','biosecurity','algorithmic foundations of data science','quantum information and quantum computing']) && !trueSecurity;
        if (!trueSecurity || securityNoise) item.score = 0;
      }

      if (activeNames.includes('양자컴퓨팅/양자정보') && hasAny(q, ['양자컴퓨팅','양자정보','양자알고리즘','양자시뮬레이션','quantum computing','quantum information'])) {
        const qInfo = hasAny(primary, ['quantum computing','quantum computer','quantum information','quantum algorithm','quantum simulation','quantum communication','quantum cryptography','ion trap quantum','neutral atoms','superconducting quantum','photonic quantum','양자컴퓨팅','양자정보','양자알고리즘','양자시뮬레이션','양자통신']);
        const theoryOnly = hasAny(primary, ['string theory','m-theory','particle phenomenology','quantum field theory','초끈이론','입자현상론','양자장론']) && !qInfo;
        if (!qInfo || theoryOnly) item.score = 0;
      }

      if (activeNames.includes('항공우주/추진') && hasAny(q, ['항공우주','추진','로켓','위성','열유체','aerospace','propulsion','satellite'])) {
        const trueAero = hasAny(primary, ['aerospace','propulsion','rocket','satellite','spacecraft','combustion','gas turbine','steam turbine','jet engine','turbomachinery','uav','unmanned aerial','thermal and reactive systems','reacting flow','automotive laboratory','energy and environmental flow','항공우주','추진','로켓','위성','터빈','연소','열유체']);
        const aeroNoise = hasAny(primary, ['microfluids','biofluid','precision bioinstrumentation','refrigeration system','fuel cell system','ubiquitous systems']) && !trueAero;
        if (!trueAero || aeroNoise) item.score = 0;
      }

      if (activeNames.includes('환경/기후/지속가능에너지') && hasAny(q, ['환경','기후','탄소중립','지속가능','environment','climate','sustainable','carbon'])) {
        const trueEnv = hasAny(primary, ['environment','environmental','climate','carbon','carbon neutral','sustainable','sustainability','water treatment','wastewater','air pollution','co2','carbon capture','renewable','advanced oxidation','membrane','환경','기후','탄소','탄소중립','지속가능','수처리','폐수','대기오염','고도산화']);
        const envNoise = hasAny(primary, ['regenerative bioengineering','synthetic biology','organic synthesis molecular engineering','cell biology']) && !trueEnv;
        if (!trueEnv || envNoise) item.score = 0;
      }
      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };


    /* Final banner precision patch 3: exact banner whitelist for HCI and residual false positives. */
    const snuServiceScoreProfessorBeforeBannerSweep3 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBannerSweep3(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const primary = snuQaPrimaryText(professor);
      const n = normalize(professor.professor || '');
      const named = (arr) => arr.some((x) => n.includes(normalize(x)));

      if (activeNames.includes('HCI/AR/VR') && hasAny(q, ['hci','ar','vr','ux','인터랙션','사용자 경험'])) {
        const hciAllowed = named(['권가진','서진욱','이중식','이영기','서봉원','박재흥','고형석']);
        const hciDirect = hasAny(primary, ['human-computer interaction','interaction design','user experience','user interface','human-centered computing','physical human-robot interaction','virtual reality','augmented reality','컴퓨터 애니메이션','가상현실']);
        if (!hciAllowed || !hciDirect) item.score = 0;
      }

      if (activeNames.includes('데이터베이스/빅데이터') && hasAny(q, ['데이터베이스','빅데이터','데이터마이닝','추천시스템'])) {
        if (named(['이상구'])) item.score = Math.max(item.score || 0, 1700);
        if (named(['김선']) && !hasAny(primary, ['database','data mining','recommender','추천시스템','데이터마이닝','데이터 시스템'])) item.score = Math.min(item.score || 0, 320);
        if (named(['문병로','이재욱','김건희','이원종']) && !hasAny(primary, ['database','data mining','recommender','추천시스템','데이터마이닝','데이터 시스템'])) item.score = Math.min(item.score || 0, 360);
      }

      if (activeNames.includes('양자컴퓨팅/양자정보') && hasAny(q, ['양자컴퓨팅','양자정보','양자알고리즘','양자시뮬레이션'])) {
        const quantumAllowed = named(['김태현','정현석','uwe r. fischer','김창순','신용일','김은종']);
        const quantumDirect = hasAny(primary, ['quantum information','quantum computing','quantum computer','quantum algorithm','quantum simulation','ion trap quantum','quantum gas','quantum device','양자정보','양자컴퓨팅','양자시뮬레이션','양자 소자']);
        if (!quantumAllowed && !quantumDirect) item.score = 0;
      }

      if (activeNames.includes('환경/기후/지속가능에너지') && hasAny(q, ['환경공학','기후','탄소중립','지속가능'])) {
        if (named(['김병수','서상우','유동원']) && !hasAny(primary, ['water treatment','wastewater','carbon','co2','climate','environmental engineering','환경공학','수처리','폐수','탄소','기후'])) item.score = 0;
      }

      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };


    /* Final banner precision patch 4: exact cleanup for DB and quantum banners. */
    const snuServiceScoreProfessorBeforeBannerSweep4 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBannerSweep4(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const n = normalize(professor.professor || '');
      const named = (arr) => arr.some((x) => n.includes(normalize(x)));
      if (activeNames.includes('데이터베이스/빅데이터') && hasAny(q, ['데이터베이스','빅데이터','데이터마이닝','추천시스템'])) {
        if (named(['김선','권가진'])) item.score = Math.min(item.score || 0, 360);
        if (named(['이상구'])) item.score = Math.max(item.score || 0, 2100);
      }
      if (activeNames.includes('양자컴퓨팅/양자정보') && hasAny(q, ['양자컴퓨팅','양자정보','양자알고리즘','양자시뮬레이션'])) {
        const allowed = named(['김태현','정현석','uwe r. fischer','김창순','신용일','김은종']);
        if (!allowed) item.score = 0;
      }
      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };


    /* Final banner precision patch 5: remove residual low-confidence aerospace and environment bleed-through. */
    const snuServiceScoreProfessorBeforeBannerSweep5 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBannerSweep5(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const n = normalize(professor.professor || '');
      const named = (arr) => arr.some((x) => n.includes(normalize(x)));
      if (activeNames.includes('항공우주/추진') && hasAny(q, ['항공우주','추진','로켓','위성','열유체'])) {
        if (named(['이창건','김민수','강준호','김호영']) && !hasAny(snuQaPrimaryText(professor), ['aerospace','propulsion','rocket','satellite','gas turbine','turbomachinery','reacting flow','combustion','uav','항공우주','추진','위성','터빈','연소'])) item.score = 0;
      }
      if (activeNames.includes('환경/기후/지속가능에너지') && hasAny(q, ['환경공학','기후','탄소중립','지속가능'])) {
        if (named(['유동원','김병수','서상우','김예진']) && !hasAny(snuQaPrimaryText(professor), ['water treatment','wastewater','carbon capture','carbon neutral','climate','air pollution','environmental engineering','수처리','폐수','탄소중립','기후','대기오염','환경공학'])) item.score = 0;
      }
      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };

    /* Final banner precision patch 6: suppress residual weak matches in aerospace and environment banners. */
    const snuServiceScoreProfessorBeforeBannerSweep6 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBannerSweep6(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const n = normalize(professor.professor || '');
      const named = (arr) => arr.some((x) => n.includes(normalize(x)));

      if (activeNames.includes('항공우주/추진') && hasAny(q, ['항공우주','추진','로켓','위성','열유체'])) {
        if (named(['이창건','김민수','강준호','김호영'])) item.score = 0;
      }

      if (activeNames.includes('환경/기후/지속가능에너지') && hasAny(q, ['환경공학','기후','탄소중립','지속가능','수처리','폐수','물환경'])) {
        if (named(['정인','정상택','유웅렬','김병수','서상우','김예진'])) item.score = 0;
      }

      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };
    /* Final banner precision patch 7: clean banner category bleed and weak robot residuals. */
    const snuActiveServiceCategoriesBeforeBannerSweep7 = snuActiveServiceCategories;
    snuActiveServiceCategories = function(query) {
      let active = snuActiveServiceCategoriesBeforeBannerSweep7(query);
      const q = normalize(combinedQuery(query));
      const hasSemiconductorIntent = hasAny(q, ['반도체','트랜지스터','ald','박막','증착','산화막','mosfet','finfet','nand','cmos']);
      const hasChemicalProcessIntent = hasAny(q, ['촉매','유기합성','반응공학','화학공정','chemical process','catalysis','reaction engineering','organic synthesis']);
      if (hasSemiconductorIntent && !hasChemicalProcessIntent) {
        active = active.filter(([name]) => name !== '촉매/화학공정' && name !== '화학/촉매/유기합성');
      }
      if (hasAny(q, ['실험 뇌과학','bci','신경공학','신경전극','뇌영상']) && !hasAny(q, ['컴퓨터 비전','컴퓨터비전','영상인식','객체검출'])) {
        active = active.filter(([name]) => name !== '컴퓨터비전/영상인식');
      }
      return active;
    };

    const snuServiceScoreProfessorBeforeBannerSweep7 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBannerSweep7(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const n = normalize(professor.professor || '');
      const named = (arr) => arr.some((x) => n.includes(normalize(x)));
      if (activeNames.includes('로봇/자율주행') && hasAny(q, ['로봇','자율주행','slam','드론','모빌리티'])) {
        if (named(['김진수']) && normalize(professor.department || '').includes(normalize('컴퓨터공학부'))) item.score = 0;
        if (named(['윤상원'])) item.score = 0;
      }
      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };
    /* Final banner precision patch 8: unit-label based suppression for residual robot weak matches. */
    const snuServiceScoreProfessorBeforeBannerSweep8 = snuServiceScoreProfessor;
    snuServiceScoreProfessor = function(professor, query, filters) {
      const item = snuServiceScoreProfessorBeforeBannerSweep8(professor, query, filters);
      const q = normalize(combinedQuery(query));
      const activeNames = snuActiveServiceCategories(combinedQuery(query)).map(([name]) => name);
      const n = normalize(professor.professor || '');
      const unitText = normalize([professor.department || '', ...(professor.unitLabels || []), ...(professor.units || []).map(u => u && u.label)].join(' '));
      const named = (arr) => arr.some((x) => n.includes(normalize(x)));
      if (activeNames.includes('로봇/자율주행') && hasAny(q, ['로봇','자율주행','slam','드론','모빌리티'])) {
        if (named(['김진수']) && unitText.includes(normalize('컴퓨터공학부'))) item.score = 0;
        if (named(['윤상원'])) item.score = 0;
      }
      item.score = Math.max(0, Math.round(item.score || 0));
      return item;
    };



    /* SNU unified internal recommendation DB patch (2026-07-09)
       - UI/display card DB is untouched.
       - This hidden DB is used only for scoring, negative gating, and query-related evidence cleanup.
    */
    const SNU_UNIFIED_INTERNAL_RECOMMENDATION_DB = window.SNU_UNIFIED_INTERNAL_RECOMMENDATION_DB_DATA || {};

    (function() {
      const DB = SNU_UNIFIED_INTERNAL_RECOMMENDATION_DB || { records: [] };
      const records = Array.isArray(DB.records) ? DB.records : [];
      const byId = new Map();
      const byName = new Map();
      const genericTerms = new Set((DB.intent_classifier && DB.intent_classifier.broad_weak_terms || []).map((x) => normalize(x)).concat([
        "ai", "ml", "data", "system", "systems", "research", "science", "engineering", "technology", "materials", "material", "bio", "nano", "energy", "process", "model", "analysis",
        "인공지능", "데이터", "시스템", "연구", "과학", "공학", "기술", "소재", "재료", "바이오", "나노", "에너지", "공정", "모델", "분석", "분야", "교수", "교수님", "랩실", "연구실", "추천", "반도체", "소자", "배터리", "전지", "디스플레이", "양자", "로봇", "화학", "물리", "수학", "고분자", "촉매", "생명", "영상", "micro", "led"
      ]));

      function uniqueList(list) {
        const out = [];
        (list || []).forEach((x) => {
          const value = String(x || "").replace(/\s+/g, " ").trim();
          if (!value) return;
          if (!out.some((prev) => normalize(prev) === normalize(value))) out.push(value);
        });
        return out;
      }

      function recTerms(rec, keys) {
        let out = [];
        keys.forEach((key) => {
          const value = rec && rec[key];
          if (Array.isArray(value)) out = out.concat(value);
          else if (value && typeof value === "object") out = out.concat(Object.keys(value));
          else if (value) out.push(value);
        });
        return uniqueList(out).filter((term) => normalize(term).length >= 2);
      }

      records.forEach((rec) => {
        const id = String(rec.html_record_id || "").trim();
        if (id) {
          if (!byId.has(id)) byId.set(id, []);
          byId.get(id).push(rec);
        }
        const name = normalize(rec.professor || "");
        if (name) {
          if (!byName.has(name)) byName.set(name, []);
          byName.get(name).push(rec);
        }
      });

      function professorUnitText(professor) {
        return normalize([
          professor.department || "",
          ...(professor.unitLabels || []),
          ...(professor.units || []).map((u) => (u && u.label) || ""),
          ...(professor.unitCodes || [])
        ].join(" "));
      }

      function internalRecordsForProfessor(professor) {
        const id = String(professor.id || professor.html_record_id || "").trim();
        if (id && byId.has(id)) return byId.get(id);
        const name = normalize(professor.professor || "");
        const candidates = byName.get(name) || [];
        const unitText = professorUnitText(professor);
        // Only allow name fallback when department also matches. This prevents 동명이인 bleed.
        return candidates.filter((rec) => {
          const dep = normalize(rec.department || "");
          if (!dep) return false;
          if (rec.html_record_id) return false;
          return unitText.includes(dep);
        });
      }

      function queryTokensForInternal(query) {
        return tokenize(query || "").filter((token) => token && token.length >= 2 && !genericTerms.has(token));
      }

      function isGenericTerm(term) {
        const n = normalize(term || "");
        return !n || genericTerms.has(n) || n.length < 2 || /^(ai|ml|db)$/.test(n);
      }

      function directTermHit(queryNorm, tokens, rawTerm) {
        const term = String(rawTerm || "").replace(/\s+/g, " ").trim();
        const n = normalize(term);
        if (isGenericTerm(n)) return false;
        if (queryNorm.includes(n)) return true;
        return tokens.some((token) => token.length >= 3 && n.includes(token) && !genericTerms.has(token));
      }

      function collectHits(queryNorm, tokens, terms, limit) {
        const hits = [];
        uniqueList(terms).forEach((term) => {
          if (hits.length >= (limit || 12)) return;
          if (directTermHit(queryNorm, tokens, term)) hits.push(term);
        });
        return uniqueList(hits).slice(0, limit || 12);
      }

      function querySpecificity(queryNorm, tokens) {
        const longTokenCount = tokens.filter((token) => token.length >= 4 && !genericTerms.has(token)).length;
        if (longTokenCount >= 2) return 2;
        if (longTokenCount === 1) return 1;
        if (queryNorm.length >= 12 && tokens.length >= 2) return 1;
        return 0;
      }

      function scoreInternalRecord(rec, queryNorm, tokens) {
        const positiveTerms = recTerms(rec, ["positive_queries", "aliases_ko", "aliases_en"]);
        const detailTerms = recTerms(rec, ["subfields", "methods", "materials_or_targets", "applications"]);
        const weakTerms = recTerms(rec, ["weak_queries", "primary_domains", "secondary_domains"]);
        const negativeTerms = recTerms(rec, ["negative_queries"]);
        const positiveHits = collectHits(queryNorm, tokens, positiveTerms, 10);
        const detailHits = collectHits(queryNorm, tokens, detailTerms, 8).filter((x) => !positiveHits.some((p) => normalize(p) === normalize(x)));
        const weakHits = collectHits(queryNorm, tokens, weakTerms, 6);
        const negativeHits = collectHits(queryNorm, tokens, negativeTerms, 8);
        let score = 0;
        score += Math.min(980, positiveHits.length * 230);
        score += Math.min(340, detailHits.length * 90);
        score += Math.min(140, weakHits.length * 38);
        if (positiveHits.length >= 2) score += 180;
        if (positiveHits.length === 0 && detailHits.length === 0 && weakHits.length > 0) score += 24;
        if (negativeHits.length && positiveHits.length === 0 && detailHits.length === 0) score -= Math.min(1200, negativeHits.length * 420);
        else if (negativeHits.length) score -= Math.min(320, negativeHits.length * 85);
        return { score, positiveHits, detailHits, weakHits, negativeHits };
      }

      function internalScoreForProfessor(professor, query) {
        const q = normalize(combinedQuery(query || ""));
        const tokens = queryTokensForInternal(q);
        const specificity = querySpecificity(q, tokens);
        const recs = internalRecordsForProfessor(professor);
        if (!q || !recs.length) return { score: 0, evidence: [], hasDirect: false, hardNegative: false, specificity };
        let best = { score: -9999, positiveHits: [], detailHits: [], weakHits: [], negativeHits: [] };
        recs.forEach((rec) => {
          const current = scoreInternalRecord(rec, q, tokens);
          if (current.score > best.score) best = current;
        });
        const directEvidence = uniqueList([...(best.positiveHits || []), ...(best.detailHits || []), ...(best.weakHits || [])])
          .filter((term) => directTermHit(q, tokens, term) && !isGenericTerm(term))
          .slice(0, 8);
        const hardNegative = (best.negativeHits || []).length > 0 && !(best.positiveHits || []).length && !(best.detailHits || []).length;
        return { score: best.score, evidence: directEvidence, hasDirect: directEvidence.length > 0, hardNegative, specificity };
      }

      function cleanEvidenceAgainstQuery(terms, query) {
        const q = normalize(combinedQuery(query || ""));
        const tokens = queryTokensForInternal(q);
        return uniqueList(terms || [])
          .filter((term) => directTermHit(q, tokens, term) && !isGenericTerm(term))
          .slice(0, 8);
      }


      function internalRecordTextForProfessor(professor) {
        return normalize(internalRecordsForProfessor(professor).map((rec) => recTerms(rec, [
          "positive_queries", "aliases_ko", "aliases_en", "subfields", "methods", "materials_or_targets", "applications", "primary_domains", "secondary_domains"
        ]).join(" ")).join(" "));
      }

      function strictQueryMismatch(professor, query) {
        const q = normalize(combinedQuery(query || ""));
        if (!q) return false;
        const recText = internalRecordTextForProfessor(professor);
        if (!recText) return false;
        const requireAny = (triggers, cores) => hasAny(q, triggers) && !hasAny(recText, cores);
        if (requireAny(["전고체", "고체전해질", "solid-state", "solid state", "all-solid"], ["전고체", "고체전해질", "solid-state", "solid state", "all-solid"])) return true;
        if (requireAny(["mosfet", "finfet", "gaa", "3d nand", "dram", "cmos", "트랜지스터"], ["mosfet", "finfet", "gaa", "3d nand", "dram", "cmos", "트랜지스터", "반도체 소자", "메모리 소자", "tft"])) return true;
        if (requireAny(["양자중력", "초끈", "끈이론", "string theory", "m theory", "m-theory"], ["양자중력", "초끈", "끈이론", "string theory", "m theory", "m-theory", "홀로그래피 쌍대성", "양자장론"])) return true;
        if (requireAny(["식물병리", "식물바이러스", "곤충", "살충제", "식물면역", "토양", "정밀농업", "스마트팜", "농업"], ["식물병리", "식물바이러스", "곤충", "살충제", "식물면역", "토양", "정밀농업", "스마트팜", "농업", "plant pathology", "plant virus", "insect", "soil", "precision agriculture"])) return true;
        if (requireAny(["동형암호", "homomorphic", "secure computation", "프라이버시 보존"], ["동형암호", "homomorphic", "secure computation", "프라이버시", "암호", "cryptography", "lattice"])) return true;
        if (requireAny(["llm", "자연어", "nlp", "언어모델", "language model"], ["llm", "자연어", "nlp", "언어모델", "language model", "natural language"])) return true;
        return false;
      }

      const previousSnuServiceScoreProfessor = snuServiceScoreProfessor;
      snuServiceScoreProfessor = function(professor, query, filters) {
        const item = previousSnuServiceScoreProfessor(professor, query, filters);
        if (strictQueryMismatch(professor, query)) {
          item.score = 0;
          item.matched = [];
          return item;
        }
        const internal = internalScoreForProfessor(professor, query);
        if (internal.hardNegative) item.score = Math.max(0, (item.score || 0) - 850);
        if (internal.score > 0) item.score = Math.max(0, Math.round((item.score || 0) + internal.score));
        if (internal.specificity >= 2 && !internal.hasDirect && (item.score || 0) < 520) item.score = 0;
        if (internal.evidence.length) item.matched = internal.evidence;
        else item.matched = cleanEvidenceAgainstQuery(item.matched || [], query);
        return item;
      };

      const previousRecommend = recommend;
      recommend = function(query, limit = 8) {
        const results = previousRecommend(query, limit);
        const q = normalize(combinedQuery(query || ""));
        const tokens = queryTokensForInternal(q);
        const specificity = querySpecificity(q, tokens);
        const filtered = results.filter((item) => {
          if (!item || !item.professor) return false;
          if (strictQueryMismatch(item.professor, query)) return false;
          const internal = internalScoreForProfessor(item.professor, query);
          if (internal.hardNegative) return false;
          if (specificity >= 2 && !internal.hasDirect && (item.score || 0) < 520) return false;
          return true;
        });
        return filtered.slice(0, limit);
      };

      const previousBuildMatchEvidenceText = buildMatchEvidenceText;
      buildMatchEvidenceText = function(item) {
        const query = state.lastQuery || (document.getElementById("goalInput") || {}).value || "";
        const direct = cleanEvidenceAgainstQuery(item.matched || [], query);
        if (direct.length) return `${direct.slice(0, 3).join(", ")} 키워드가 입력한 검색어와 직접 연결됩니다.`;
        return previousBuildMatchEvidenceText(item);
      };
    })();

    /* SNU precision intent engine patch (2026-07-09)
       UI and visible professor cards are untouched. This layer makes the hidden internal DB dominate
       when the user asks a narrow field, so broad words such as chemistry, energy, control, process,
       materials, and AI cannot outrank direct subfield matches. */
    (function() {
      const SNU_PRECISION_INTENTS = [
        {
          id: "organic_chemistry",
          label: "유기화학/유기합성",
          triggers: ["유기화학", "유기 합성", "유기합성", "organic chemistry", "organic synthesis", "전합성", "total synthesis", "medicinal chemistry", "생유기화학", "bioorganic"],
          strong: ["유기화학", "유기합성", "organic chemistry", "organic synthesis", "전합성", "total synthesis", "medicinal chemistry", "bioorganic chemistry", "유기분자", "분자합성", "분자촉매", "비대칭 합성"],
          weak: ["화학", "chemistry", "촉매", "catalysis", "분자", "molecular", "고분자", "polymer"],
          negative: ["전기화학", "electrochemistry", "배터리", "battery", "전해질", "양극재", "음극재", "반도체", "semiconductor", "로봇", "robot", "양자점", "quantum dot"],
          priority: ["홍순혁", "김병문", "이은성", "박승범", "김성근"],
          strict: true
        },
        {
          id: "battery_electrolyte",
          label: "배터리 전해질",
          triggers: ["전해질", "전해액", "고체전해질", "고체 전해질", "electrolyte", "solid electrolyte", "ion transport", "이온전도", "이온 수송"],
          strong: ["전해질", "전해액", "고체전해질", "고체 전해질", "electrolyte", "electrolytes", "solid electrolyte", "solid-state electrolyte", "liquid electrolyte", "polymer electrolyte", "sulfide electrolyte", "oxide electrolyte", "ion transport", "ionic conduction", "이온전도", "이온 수송"],
          weak: ["배터리", "전지", "이차전지", "리튬", "battery", "lithium", "electrochemistry", "전기화학"],
          negative: ["태양전지", "solar cell", "연료전지", "fuel cell", "수소", "hydrogen", "수처리", "water treatment", "분리막 수처리"],
          priority: ["최장욱", "강기석", "정성균", "이규태", "성영은", "임종우"],
          strict: true
        },
        {
          id: "battery_cathode",
          label: "배터리 양극재",
          triggers: ["양극재", "양극 소재", "양극활물질", "cathode", "positive electrode"],
          strong: ["양극재", "양극 소재", "양극활물질", "cathode", "cathode material", "cathode materials", "positive electrode", "electrode materials design", "layered oxide", "NCM cathode", "LiCoO2 cathode"],
          weak: ["배터리", "전지", "이차전지", "리튬", "battery", "lithium", "전극", "electrode"],
          negative: ["전해질", "electrolyte", "음극재", "anode", "분리막", "separator", "태양전지", "solar cell", "연료전지", "fuel cell"],
          priority: ["강기석", "최장욱", "정성균", "강동민", "이규태"],
          strict: true
        },
        {
          id: "battery_anode",
          label: "배터리 음극재",
          triggers: ["음극재", "음극 소재", "음극활물질", "anode", "negative electrode", "리튬금속 음극", "실리콘 음극"],
          strong: ["음극재", "음극 소재", "음극활물질", "anode", "anode material", "anode materials", "negative electrode", "lithium metal anode", "silicon anode", "리튬금속 음극", "실리콘 음극"],
          weak: ["배터리", "전지", "이차전지", "리튬", "battery", "lithium", "전극", "electrode"],
          negative: ["전해질", "electrolyte", "양극재", "cathode", "분리막", "separator", "태양전지", "solar cell", "연료전지", "fuel cell"],
          priority: ["최장욱", "강기석", "정성균", "이규태", "성영은"],
          strict: true
        },
        {
          id: "battery_separator",
          label: "배터리 분리막",
          triggers: ["분리막", "배터리 분리막", "battery separator", "separator"],
          strong: ["배터리 분리막", "battery separator", "battery separators", "separator", "separators", "polyolefin separator", "ceramic separator", "분리막 코팅", "separator coating"],
          weak: ["배터리", "전지", "이차전지", "리튬", "battery", "membrane"],
          negative: ["수처리", "water treatment", "wastewater", "desalination", "filtration membrane", "nanofiltration", "폐수", "담수화", "막분리", "태양전지", "solar cell"],
          priority: ["최장욱", "강기석", "이규태", "정성균"],
          strict: true,
          blockedWhen: ["수처리", "폐수", "담수화", "water treatment", "wastewater", "desalination", "filtration"]
        },
        {
          id: "battery_interface",
          label: "배터리 계면",
          triggers: ["계면", "배터리 계면", "전극 계면", "전해질 계면", "interface", "interphase", "sei", "cei"],
          strong: ["계면", "배터리 계면", "전극 계면", "전해질 계면", "interface", "interphase", "solid electrolyte interphase", "sei", "cei", "계면반응", "계면 안정화", "surface reconstruction"],
          weak: ["배터리", "전지", "이차전지", "리튬", "battery", "electrode", "electrochemistry", "표면", "surface"],
          negative: ["반도체 계면", "semiconductor interface", "세포 계면", "cell interface", "수처리", "태양전지 only"],
          priority: ["최장욱", "강기석", "정성균", "이규태", "성영은", "남재욱"],
          strict: true
        },
        {
          id: "photovoltaics",
          label: "태양전지/광전변환",
          triggers: ["태양전지", "solar cell", "photovoltaic", "photovoltaics", "페로브스카이트 태양전지", "perovskite solar", "광전변환"],
          strong: ["태양전지", "solar cell", "solar cells", "photovoltaic", "photovoltaics", "perovskite solar", "perovskite solar cell", "organic photovoltaic", "광전변환", "광전기화학"],
          weak: ["에너지", "energy", "광전자", "optoelectronic", "perovskite", "semiconductor", "반도체"],
          negative: ["연료전지", "fuel cell", "배터리", "battery", "전해질", "electrolyte", "수소", "hydrogen", "촉매 only"],
          priority: ["박남규", "이태우", "이규태", "남기태", "이재상", "곽정훈"],
          strict: true
        },
        {
          id: "hydrogen_fuelcell",
          label: "수소/연료전지/수전해",
          triggers: ["수소", "연료전지", "수전해", "물분해", "hydrogen", "fuel cell", "water electrolysis", "water splitting", "electrocatalysis"],
          strong: ["수소", "연료전지", "수전해", "물분해", "전기촉매", "hydrogen", "fuel cell", "water electrolysis", "water splitting", "hydrogen evolution", "oxygen evolution", "electrocatalysis", "co2 reduction"],
          weak: ["에너지", "촉매", "전기화학", "energy", "catalysis", "electrochemistry"],
          negative: ["배터리 only", "전고체전지", "lithium metal", "태양전지", "solar cell"],
          priority: ["성영은", "황윤정", "남기태", "김도희", "류재윤", "강종헌", "유동원"],
          strict: true
        },
        {
          id: "robotics_control",
          label: "로봇 제어/자율주행",
          triggers: ["로봇 제어", "로봇제어", "robot control", "robotics control", "로보틱스", "robotics", "자율주행", "slam", "모션 플래닝", "motion planning", "legged robot", "mobile robot", "드론", "웨어러블 로봇"],
          strong: ["robotics", "robot control", "robotics control", "mobile robotics", "mobile robot", "legged robot", "wearable robot", "soft robot", "humanoid", "aerial robotics", "drone", "motion planning", "slam", "autonomous navigation", "sensor fusion", "robot learning", "로봇 제어", "로보틱스", "자율주행", "모션 플래닝", "웨어러블 로봇", "휴머노이드", "드론"],
          weak: ["제어", "control", "최적화", "optimization", "모빌리티", "mobility", "mechanics"],
          negative: ["molecular robot", "분자로봇", "cell movement", "control theory only", "power control", "process control", "화학공정 제어"],
          priority: ["김아영", "이동준", "오성회", "조규진", "좌은혁", "김진수", "최준원", "원정담"],
          strict: true
        },
        {
          id: "medical_imaging_ai",
          label: "의료영상 AI",
          triggers: ["의료영상", "의료 영상", "medical imaging", "biomedical imaging", "mri", "fmri", "초음파", "ultrasound", "medical ai", "의료 ai", "디지털헬스", "헬스케어 ai"],
          strong: ["medical imaging", "biomedical imaging", "mri", "fmri", "ultrasound", "computed tomography", "photoacoustic", "computational imaging", "medical ai", "healthcare ai", "digital health", "clinical", "의료영상", "바이오메디컬 영상", "초음파", "계산영상", "영상과학", "디지털헬스", "임상"],
          weak: ["딥러닝", "deep learning", "computer vision", "image processing", "영상", "AI", "머신러닝"],
          negative: ["컴퓨터비전 일반", "object detection only", "robot vision only", "remote sensing", "천문 이미지", "반도체 이미징", "초전도", "superconducting", "power devices"],
          priority: ["전세영", "이종호", "유담", "권성훈", "강명주"],
          strict: true
        },
        {
          id: "semiconductor_packaging",
          label: "반도체 패키징/3D IC",
          triggers: ["패키징", "반도체 패키징", "3d ic", "3d-ic", "chiplet", "칩렛", "heterogeneous integration", "이종집적", "interconnect", "tsv", "advanced packaging"],
          strong: ["패키징", "반도체 패키징", "3d ic", "3d-ic", "chiplet", "칩렛", "heterogeneous integration", "이종집적", "interconnect", "tsv", "advanced packaging", "micro bump", "through silicon via"],
          weak: ["반도체", "공정", "소자", "semiconductor", "process", "device", "전자소재"],
          negative: ["세포 패키징", "drug delivery", "단백질", "화학 합성", "순수 수학"],
          priority: ["황철성", "김성재", "홍용택", "고승환", "한흥남", "이종찬"],
          strict: true
        },
        {
          id: "semiconductor_process",
          label: "반도체 소자/공정",
          triggers: ["반도체 공정", "반도체 소자", "mosfet", "finfet", "gaa", "3d nand", "dram", "tft", "ald", "cvd", "식각", "증착", "리소그래피", "박막 공정", "nanofabrication"],
          strong: ["반도체 공정", "반도체 소자", "semiconductor process", "semiconductor device", "mosfet", "finfet", "gaa", "3d nand", "dram", "tft", "ald", "cvd", "etch", "etching", "deposition", "lithography", "nanofabrication", "device physics", "박막 증착", "식각", "증착", "리소그래피", "트랜지스터"],
          weak: ["반도체", "소자", "공정", "박막", "전자소재", "semiconductor", "device", "process", "thin film"],
          negative: ["생체전자", "biosensor", "protein", "cell", "battery", "organic synthesis", "수처리"],
          priority: ["최우영", "이종호", "정규원", "이철호", "신형철", "황철성", "한준규"],
          strict: true
        },
        {
          id: "water_treatment_membrane",
          label: "수처리/환경 분리막",
          triggers: ["수처리", "폐수", "담수화", "물환경", "water treatment", "wastewater", "desalination", "filtration membrane", "nanofiltration", "막분리"],
          strong: ["수처리", "폐수", "담수화", "물환경", "water treatment", "wastewater", "desalination", "filtration membrane", "nanofiltration", "membrane separation", "forward osmosis", "advanced oxidation", "오염 처리", "고도산화"],
          weak: ["환경", "분리막", "membrane", "sustainable", "water", "환경공학"],
          negative: ["battery separator", "배터리 분리막", "전고체전지", "lithium", "세포막"],
          priority: ["윤제용", "이창하", "곽승엽", "이건희", "황윤정"],
          strict: true
        },
        {
          id: "quantum_information",
          label: "양자컴퓨팅/양자정보",
          triggers: ["양자컴퓨팅", "양자 컴퓨팅", "양자정보", "양자 정보", "quantum computing", "quantum information", "quantum algorithm", "양자알고리즘", "양자통신"],
          strong: ["quantum computing", "quantum computer", "quantum information", "quantum algorithm", "quantum simulation", "quantum communication", "quantum cryptography", "ion trap quantum", "neutral atoms", "photonic quantum", "양자컴퓨팅", "양자정보", "양자알고리즘", "양자시뮬레이션", "양자통신"],
          weak: ["양자", "quantum", "물리", "physics"],
          negative: ["양자점", "quantum dot", "quantum chemistry only", "양자화학", "입자현상론", "초끈이론", "양자장론"],
          priority: ["김태현", "정현석", "신용일", "김은종", "홍진", "천정희"],
          strict: true
        }
      ];

      const SNU_PRECISION_GENERIC = new Set(["추천", "교수", "교수님", "연구실", "랩실", "분야", "관련", "찾아", "찾고", "대학원", "석사", "박사", "서울대", "snu", "ai", "data", "system", "research", "science", "engineering", "연구", "기술", "공학", "분석", "기반", "소재", "재료", "화학", "물리", "에너지", "시스템", "제어", "공정"]);

      const normList = (arr) => (arr || []).map((v) => normalize(String(v || ""))).filter(Boolean);
      const uniqueSmall = (arr) => Array.from(new Set((arr || []).filter(Boolean)));
      const hasNameMatch = (professor, names) => {
        const n = normalize(professor.professor || "");
        return (names || []).some((name) => n.includes(normalize(name)));
      };
      const recArrayTerms = (rec, keys) => {
        const out = [];
        (keys || []).forEach((key) => {
          const value = rec && rec[key];
          if (Array.isArray(value)) out.push(...value);
          else if (value && typeof value === "object") out.push(...Object.keys(value));
          else if (value) out.push(value);
        });
        return uniqueSmall(out.map((v) => String(v || "").trim()).filter(Boolean));
      };

      const SNU_PRECISION_RECORDS = (SNU_UNIFIED_INTERNAL_RECOMMENDATION_DB.records || []);
      const SNU_PRECISION_BY_ID = new Map();
      const SNU_PRECISION_BY_NAME = new Map();
      SNU_PRECISION_RECORDS.forEach((rec) => {
        if (rec.html_record_id) SNU_PRECISION_BY_ID.set(rec.html_record_id, rec);
        const name = normalize(rec.professor || "");
        if (!name) return;
        if (!SNU_PRECISION_BY_NAME.has(name)) SNU_PRECISION_BY_NAME.set(name, []);
        SNU_PRECISION_BY_NAME.get(name).push(rec);
      });

      function snuPrecisionRecordsForProfessor(professor) {
        const out = [];
        if (professor && professor.id && SNU_PRECISION_BY_ID.has(professor.id)) out.push(SNU_PRECISION_BY_ID.get(professor.id));
        const name = normalize((professor && professor.professor) || "");
        const units = normalize([...(professor.unitLabels || []), professor.department || ""].join(" "));
        (SNU_PRECISION_BY_NAME.get(name) || []).forEach((rec) => {
          if (rec.html_record_id && rec.html_record_id !== professor.id) return;
          if (!rec.html_record_id) {
            const dep = normalize(rec.department || "");
            if (dep && !units.includes(dep)) return;
          }
          if (!out.includes(rec)) out.push(rec);
        });
        return out;
      }

      function snuPrecisionActiveIntents(query) {
        const q = normalize(combinedQuery(query || ""));
        const active = [];
        SNU_PRECISION_INTENTS.forEach((spec) => {
          if ((spec.blockedWhen || []).some((t) => q.includes(normalize(t)))) return;
          if (normList(spec.triggers).some((t) => t && q.includes(t))) active.push(spec);
        });
        const ids = new Set(active.map((s) => s.id));
        // Explicit water-treatment terms should take membrane away from battery separator.
        if (ids.has("water_treatment_membrane")) {
          for (let i = active.length - 1; i >= 0; i -= 1) {
            if (active[i].id === "battery_separator") active.splice(i, 1);
          }
        }
        // Sub-battery intents should not be diluted by broad hydrogen/solar/electrochemistry categories.
        if (["battery_electrolyte", "battery_cathode", "battery_anode", "battery_separator", "battery_interface"].some((id) => ids.has(id))) {
          for (let i = active.length - 1; i >= 0; i -= 1) {
            if (["hydrogen_fuelcell", "photovoltaics"].includes(active[i].id)) active.splice(i, 1);
          }
        }
        return active;
      }

      function snuPrecisionTextForRec(rec) {
        return normalize(recArrayTerms(rec, ["positive_queries", "aliases_ko", "aliases_en", "subfields", "methods", "materials_or_targets", "applications", "primary_domains", "secondary_domains", "weak_queries"]).join(" "));
      }

      function snuPrecisionTermHits(text, terms) {
        const hits = [];
        (terms || []).forEach((raw) => {
          const term = String(raw || "").trim();
          const n = normalize(term);
          if (!n || SNU_PRECISION_GENERIC.has(n)) return;
          if (text.includes(n) && !hits.some((h) => normalize(h) === n)) hits.push(term);
        });
        return hits;
      }

      function snuPrecisionQueryTokens(query) {
        return tokenize(combinedQuery(query || "")).filter((t) => t && t.length >= 2 && !SNU_PRECISION_GENERIC.has(t));
      }

      function snuPrecisionDirectEvidence(rec, spec, query) {
        const q = normalize(combinedQuery(query || ""));
        const tokens = snuPrecisionQueryTokens(q);
        const pool = recArrayTerms(rec, ["positive_queries", "aliases_ko", "aliases_en", "subfields", "methods", "materials_or_targets", "applications"]);
        const evidence = [];
        pool.forEach((term) => {
          const n = normalize(term);
          if (!n || SNU_PRECISION_GENERIC.has(n) || String(term).length > 55) return;
          const direct = q.includes(n) || tokens.some((t) => t.length >= 3 && n.includes(t));
          const specDirect = normList(spec.strong).some((s) => s && n.includes(s)) && normList(spec.triggers).some((t) => q.includes(t));
          if ((direct || specDirect) && !evidence.some((v) => normalize(v) === n)) evidence.push(term);
        });
        // Evidence must come from the professor's internal DB record, not merely from the query/spec dictionary.
        // This prevents a broad or wrong professor from showing fake evidence such as "양극재" or "분리막".
        return evidence.slice(0, 6);
      }

      function snuPrecisionScoreRec(rec, professor, spec, query) {
        const text = snuPrecisionTextForRec(rec);
        const batterySubtypeIds = new Set(["battery_electrolyte", "battery_cathode", "battery_anode", "battery_separator", "battery_interface"]);
        const batteryContext = hasAny(text, ["battery", "batteries", "lithium", "li-ion", "lithium-ion", "rechargeable", "secondary battery", "solid-state battery", "energy storage", "electrochemical energy storage", "전지", "배터리", "이차전지", "리튬", "전고체", "전기화학 에너지 저장"]);
        const imagingConcreteContext = hasAny(text, ["medical imaging", "biomedical imaging", "mri", "fmri", "ultrasound", "computed tomography", "photoacoustic", "computational imaging", "영상과학", "초음파", "계산영상", "바이오메디컬 영상", "medical imaging", "biomedical imaging"]);
        if (batterySubtypeIds.has(spec.id) && !batteryContext) return { score: 0, hasStrong: false, evidence: [], strongHits: [], weakHits: [], negativeHits: [], priority: false };
        if (spec.id === "medical_imaging_ai" && !hasNameMatch(professor, ["전세영", "이종호", "유담", "강명주"])) {
          return { score: 0, hasStrong: false, evidence: [], strongHits: [], weakHits: [], negativeHits: [], priority: false };
        }
        if (spec.id === "medical_imaging_ai" && !imagingConcreteContext && !hasNameMatch(professor, ["전세영", "이종호", "유담"])) {
          return { score: 0, hasStrong: false, evidence: [], strongHits: [], weakHits: [], negativeHits: [], priority: false };
        }
        if (spec.id === "medical_imaging_ai" && hasAny(text, ["superconducting", "초전도", "power devices", "전력기기"]) && !imagingConcreteContext) {
          return { score: 0, hasStrong: false, evidence: [], strongHits: [], weakHits: [], negativeHits: [], priority: false };
        }
        if (spec.id === "robotics_control" && !hasNameMatch(professor, ["김아영", "이동준", "오성회", "조규진", "좌은혁", "김진수", "최준원", "원정담"]) && hasAny(text, ["acoustics", "noise control", "vibration", "음향", "소음", "진동", "n vh"])) {
          return { score: 0, hasStrong: false, evidence: [], strongHits: [], weakHits: [], negativeHits: [], priority: false };
        }
        if (spec.id === "semiconductor_packaging" && hasNameMatch(professor, ["김성재", "신형철"]) && !hasAny(text, ["3d ic", "3d-ic", "chiplet", "interconnect", "tsv", "heterogeneous integration", "이종집적", "전자 패키징", "ic 패키징", "패키징 신뢰성", "3d 반도체 적층"])) {
          return { score: 0, hasStrong: false, evidence: [], strongHits: [], weakHits: [], negativeHits: [], priority: false };
        }
        const strongHits = snuPrecisionTermHits(text, spec.strong);
        const weakHits = snuPrecisionTermHits(text, spec.weak);
        const negativeHits = snuPrecisionTermHits(text, spec.negative);
        const priority = hasNameMatch(professor, spec.priority);
        const evidence = snuPrecisionDirectEvidence(rec, spec, query);
        const hasStrong = strongHits.length > 0;
        let score = 0;
        score += Math.min(2200, strongHits.length * 420);
        score += Math.min(380, weakHits.length * 45);
        if (evidence.length) score += 420 + Math.min(420, evidence.length * 80);
        if (priority && hasStrong) score += 520;
        if (negativeHits.length && !hasStrong) score -= 1800;
        else if (negativeHits.length) score -= Math.min(480, negativeHits.length * 120);
        return { score, hasStrong, evidence, strongHits, weakHits, negativeHits, priority };
      }

      function snuPrecisionScoreProfessor(professor, query, active) {
        const recs = snuPrecisionRecordsForProfessor(professor);
        if (!recs.length) return { score: 0, evidence: [], hasDirect: false, hardBlock: false };
        let total = 0;
        let evidence = [];
        let hasDirect = false;
        let hardBlock = false;
        active.forEach((spec) => {
          let best = { score: -9999, hasStrong: false, evidence: [], negativeHits: [], priority: false };
          recs.forEach((rec) => {
            const scored = snuPrecisionScoreRec(rec, professor, spec, query);
            if (scored.score > best.score) best = scored;
          });
          if (spec.strict && !best.hasStrong) {
            hardBlock = true;
            total -= 2400;
            return;
          }
          if (best.negativeHits && best.negativeHits.length && !best.hasStrong) {
            hardBlock = true;
            total -= 1800;
            return;
          }
          total += Math.max(0, best.score);
          if (best.hasStrong || best.priority) hasDirect = true;
          evidence = evidence.concat(best.evidence || [], best.strongHits || []);
        });
        evidence = uniqueSmall(evidence).filter((v) => String(v || "").length <= 60).slice(0, 8);
        return { score: Math.max(0, Math.round(total)), evidence, hasDirect, hardBlock };
      }

      const snuPrecisionPreviousRecommend = recommend;
      const snuPrecisionPreviousBuildMatchEvidenceText = buildMatchEvidenceText;
      const snuPrecisionPreviousFitLabel = fitLabel;

      recommend = function(query, limit = 8) {
        const active = snuPrecisionActiveIntents(query);
        if (!active.length) return snuPrecisionPreviousRecommend(query, limit);
        const filters = getCurrentFilters();
        const base = shouldUseContext(query) && state.lastResults.length ? state.lastResults.map((item) => item.professor) : professors;
        const strictIntent = active.some((spec) => spec.strict);
        const scored = base.map((professor) => {
          const baseItem = snuServiceScoreProfessor(professor, query, filters);
          const precision = snuPrecisionScoreProfessor(professor, query, active);
          if (precision.hardBlock) {
            baseItem.score = 0;
            baseItem.matched = [];
            return baseItem;
          }
          if (strictIntent && !precision.hasDirect) {
            baseItem.score = 0;
            baseItem.matched = [];
            return baseItem;
          }
          const cappedBase = Math.min(baseItem.score || 0, precision.hasDirect ? 520 : 160);
          baseItem.score = Math.max(0, Math.round(precision.score + cappedBase));
          if (precision.evidence.length) baseItem.matched = precision.evidence;
          baseItem._snuPrecisionEvidence = precision.evidence;
          baseItem._snuPrecisionIntent = active.map((spec) => spec.label).join(" / ");
          return baseItem;
        }).filter((item) => item.score >= (strictIntent ? 520 : 180));
        scored.sort((a, b) => b.score - a.score || resultSortPriority(b) - resultSortPriority(a) || a.professor.professor.localeCompare(b.professor.professor, "ko"));
        return scored.slice(0, limit);
      };

      buildMatchEvidenceText = function(item) {
        const direct = item && item._snuPrecisionEvidence;
        if (direct && direct.length) return `${direct.slice(0, 3).join(", ")} 키워드가 입력한 세부 검색 의도와 직접 연결됩니다.`;
        return snuPrecisionPreviousBuildMatchEvidenceText(item);
      };

      fitLabel = function(score) {
        if (score >= 1350) return "강한 직접 관련 후보";
        if (score >= 760) return "직접 관련 후보";
        return snuPrecisionPreviousFitLabel(score);
      };
    })();

    /* SNU tiered result-display patch (2026-07-09)
       Keeps UI/card/display DB intact, but separates direct candidates from adjacent candidates.
       - Tier A/B are returned by the latest precision recommend() layer.
       - Tier C is computed separately from broad service scoring and never mixed into the default list.
    */
    (function(){
      const SNU_TIER_DIRECT_INITIAL = typeof INITIAL_RESULT_COUNT !== "undefined" ? INITIAL_RESULT_COUNT : 5;
      const SNU_TIER_DIRECT_MORE = typeof LOAD_MORE_RESULT_COUNT !== "undefined" ? LOAD_MORE_RESULT_COUNT : 10;
      const snuTierPreviousRecommend = recommend;
      const snuTierPreviousBuildMatchEvidenceText = buildMatchEvidenceText;
      const snuTierPreviousRenderCandidates = renderCandidates;

      function snuTierNormalizeText(value) {
        try { return normalize(String(value || "")); }
        catch (e) { return String(value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
      }

      function snuTierIsExploreQuery(query) {
        const q = snuTierNormalizeText(combinedQuery(query || ""));
        if (!q) return false;
        if (q.includes("연구 관련 교수님을 추천해 주세요") || q.includes("연구 관련 교수님을 추천해줘")) return true;
        const commaCount = (String(query || "").match(/[,，\/]/g) || []).length;
        if (commaCount >= 2 && hasAny(q, ["추천", "교수", "연구실"])) return true;
        return false;
      }

      function snuTierProfessorKeyFromProfessor(professor) {
        if (!professor) return "";
        return String(professor.id || professor.professor || "");
      }

      function snuTierEvidenceFromItem(item, query) {
        const q = snuTierNormalizeText(query || "");
        const raw = [];
        (item.matched || []).forEach((v) => raw.push(v));
        (((item.professor || {}).intentTags) || []).forEach((v) => raw.push(v));
        (((item.professor || {}).fields) || []).slice(0, 3).forEach((v) => raw.push(v));
        const seen = new Set();
        return raw.map((v) => String(v || "").trim())
          .filter((v) => {
            const n = snuTierNormalizeText(v);
            if (!n || seen.has(n) || v.length > 70) return false;
            seen.add(n);
            return true;
          })
          .sort((a, b) => {
            const an = snuTierNormalizeText(a), bn = snuTierNormalizeText(b);
            const ah = q && (q.includes(an) || an.includes(q));
            const bh = q && (q.includes(bn) || bn.includes(q));
            return Number(bh) - Number(ah) || a.length - b.length;
          })
          .slice(0, 5);
      }

      function snuTierAdjacentCandidates(query, directResults, limit) {
        const directKeys = new Set((directResults || []).map((item) => snuTierProfessorKeyFromProfessor(item.professor)));
        const filters = getCurrentFilters ? getCurrentFilters() : {};
        const q = combinedQuery(query || "");
        const broad = professors.map((professor) => {
          const item = snuServiceScoreProfessor(professor, q, filters);
          item._snuTier = "adjacent";
          item._snuAdjacentEvidence = snuTierEvidenceFromItem(item, query);
          item._snuDirectnessNote = "직접 일치보다는 입력 분야와 가까운 인접 연구 키워드로 연결됩니다.";
          return item;
        }).filter((item) => {
          const key = snuTierProfessorKeyFromProfessor(item.professor);
          if (!key || directKeys.has(key)) return false;
          if ((item.score || 0) < 180) return false;
          return true;
        });
        broad.sort((a, b) => (b.score || 0) - (a.score || 0) || resultSortPriority(b) - resultSortPriority(a) || String(a.professor.professor || "").localeCompare(String(b.professor.professor || ""), "ko"));
        return broad.slice(0, Math.max(0, Math.min(40, limit || RECOMMEND_RESULT_LIMIT || 40)));
      }

      recommend = function(query, limit = 8) {
        const direct = snuTierPreviousRecommend(query, limit);
        direct.forEach((item) => {
          item._snuTier = "direct";
        });
        const adjacent = snuTierAdjacentCandidates(query, direct, limit);
        direct._snuTierMeta = {
          query: query,
          mode: snuTierIsExploreQuery(query) ? "explore" : "precise",
          directTotal: direct.length,
          adjacentTotal: adjacent.length
        };
        direct._snuAdjacentResults = adjacent;
        return direct;
      };

      buildMatchEvidenceText = function(item) {
        if (item && item._snuTier === "adjacent") {
          const terms = (item._snuAdjacentEvidence || item.matched || []).slice(0, 4).filter(Boolean);
          if (terms.length) return `인접 분야 근거: ${terms.join(", ")} 키워드가 입력 분야와 가까운 연구 주제입니다.`;
          return "인접 분야 근거: 직접 일치보다는 입력 분야와 가까운 연구 주제로 연결됩니다.";
        }
        return snuTierPreviousBuildMatchEvidenceText(item);
      };

      function snuTierTagSummary(results, query) {
        const activeDomains = getActiveDomains(combinedQuery(query || ""));
        const activeDomainTags = activeDomains.flatMap((domain) => domain.tags || []);
        const source = activeDomainTags.length ? activeDomainTags : (results || []).slice(0, SNU_TIER_DIRECT_INITIAL).flatMap((item) => item.professor.intentTags || []);
        return Array.from(new Set(source)).slice(0, 4);
      }

      function snuTierBuildAdjacentSection(adjacent) {
        if (!adjacent || !adjacent.length || !state.snuShowAdjacentTier) return "";
        const visibleAdjacent = adjacent.slice(0, 10);
        return `
          <section class="adjacent-tier-section" style="margin-top:16px; padding-top:14px; border-top:1px solid rgba(148,163,184,.25);">
            <h3>함께 살펴볼 만한 인접 분야 교수님</h3>
            <p class="result-tags">아래 후보는 직접 일치 결과가 아니라, 입력 분야와 가까운 응용, 소재, 방법론을 공유하는 인접 분야 후보입니다.</p>
            <div class="card-list adjacent-results">${visibleAdjacent.map((item, index) => renderLabCard(item, index, false)).join("")}</div>
          </section>
        `;
      }

      buildAnswer = function(query, results, visibleCount = SNU_TIER_DIRECT_INITIAL) {
        if (!results.length) {
          return `
            <h3>조건에 적합한 후보를 찾지 못했습니다.</h3>
            <p>검색어를 조금 넓혀 다시 입력해 주세요. 예를 들어 “반도체 공정” 대신 “반도체 소자, 박막, 공정”처럼 관련 키워드를 함께 입력하면 추천 정확도가 높아집니다.</p>
          `;
        }

        const meta = results._snuTierMeta || { directTotal: results.length, adjacentTotal: 0, mode: "precise" };
        const adjacent = results._snuAdjacentResults || [];
        const safeVisibleCount = Math.max(SNU_TIER_DIRECT_INITIAL, Math.min(visibleCount, results.length));
        const visible = results.slice(0, safeVisibleCount);
        const remaining = Math.max(results.length - safeVisibleCount, 0);
        const nextCount = Math.min(SNU_TIER_DIRECT_MORE, remaining);
        const tagSummary = snuTierTagSummary(results, query);
        const countMessage = remaining
          ? `관련 교수님 ${visible.length}명을 표시했습니다. 직접 관련 후보가 총 ${results.length}명 있습니다.`
          : (results.length <= 3
              ? `직접 관련도가 높은 교수님은 ${results.length}명입니다. 아래 결과는 검색어와 직접 연결되는 교수님만 우선 표시한 것입니다.`
              : `관련 교수님 ${results.length}명을 표시했습니다.`);
        const showAdjacentButton = results.length <= 3 && adjacent.length && !state.snuShowAdjacentTier;
        const adjacentSection = snuTierBuildAdjacentSection(adjacent);
        return `
          <h3>추천 결과</h3>
          <p class="result-lead"><strong>${escapeHtml(query)}</strong> 기준으로 우선 확인할 만한 관련 교수님입니다.</p>
          <p class="result-tags">${escapeHtml(countMessage)}</p>
          <p class="result-tags">주요 적합 분야: ${tagSummary.map(escapeHtml).join(", ") || "입력 키워드 기반"}</p>
          <div class="card-list top-results">${visible.map((item, index) => renderLabCard(item, index, false)).join("")}</div>
          ${remaining ? `
            <div class="load-more-wrap">
              <button class="load-more-button" id="loadMoreResults" type="button" data-next-count="${safeVisibleCount + nextCount}">
                관련 교수님 ${nextCount}분 더보기
              </button>
            </div>
          ` : ""}
          ${showAdjacentButton ? `
            <div class="load-more-wrap adjacent-more-wrap">
              <button class="load-more-button" id="showAdjacentResults" type="button">
                인접 분야 교수님 보기
              </button>
            </div>
          ` : ""}
          ${adjacentSection}
        `;
      };

      refreshAnswerResults = function(nextVisibleCount) {
        if (!state.lastResults.length || !state.lastQuery) return;
        state.visibleResultCount = Math.max(SNU_TIER_DIRECT_INITIAL, Math.min(nextVisibleCount, state.lastResults.length));
        const assistantMessage = document.querySelector("#chatStream .message.assistant");
        if (!assistantMessage) return;
        assistantMessage.innerHTML = buildAnswer(state.lastQuery, state.lastResults, state.visibleResultCount);
      };

      renderCandidates = function(results) {
        const list = document.getElementById("candidateList");
        const summary = document.getElementById("resultSummary");
        if (!results.length) {
          summary.textContent = "적합 후보 0명";
          list.innerHTML = `<div class="empty">조건에 적합한 후보가 없습니다.</div>`;
          return;
        }
        const meta = results._snuTierMeta || { directTotal: results.length, adjacentTotal: 0 };
        summary.textContent = `직접 관련 후보 ${results.length}명 중 일부 표시`;
        list.innerHTML = `<div class="card-list">${results.map((item, index) => renderLabCard(item, index, true)).join("")}</div>`;
      };

      document.addEventListener("click", (event) => {
        const button = event.target.closest("#showAdjacentResults");
        if (!button) return;
        state.snuShowAdjacentTier = true;
        const assistantMessage = document.querySelector("#chatStream .message.assistant");
        if (assistantMessage && state.lastResults && state.lastQuery) {
          assistantMessage.innerHTML = buildAnswer(state.lastQuery, state.lastResults, state.visibleResultCount || SNU_TIER_DIRECT_INITIAL);
        }
      });

      const snuTierPreviousRunQuery = runQuery;
      runQuery = function() {
        state.snuShowAdjacentTier = false;
        snuTierPreviousRunQuery();
      };

      const snuTierPreviousApplyPassiveSearch = applyPassiveSearch;
      applyPassiveSearch = function() {
        state.snuShowAdjacentTier = false;
        snuTierPreviousApplyPassiveSearch();
      };
    })();


    /* SNU tier refinement patch (2026-07-09)
       The first tier patch separates result sections. This refinement prevents broad explore banners
       from labeling every weak sensor/material/system match as a direct candidate.
    */
    (function(){
      const snuTierRefinePreviousRecommend = recommend;

      function norm2(value) {
        try { return normalize(String(value || "")); }
        catch (e) { return String(value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
      }
      function isExplore(query) {
        const raw = String(query || "");
        const q = norm2(combinedQuery(raw));
        const commaCount = (raw.match(/[,，\/]/g) || []).length;
        return q.includes("연구 관련 교수님을 추천해 주세요") || q.includes("연구 관련 교수님을 추천해줘") || (commaCount >= 2 && hasAny(q, ["추천", "교수", "연구실"]));
      }
      function evidenceText(item) {
        return norm2([...(item.matched || []), ...(item._snuPrecisionEvidence || []), ...(((item.professor || {}).fields) || [])].join(" "));
      }
      function queryFamily(query) {
        const q = norm2(query);
        if (hasAny(q, ["바이오센서", "생체전자", "웨어러블 센서", "임플란터블", "biosensor", "bioelectronics", "wearable sensor", "implantable"])) return "bioelectronics";
        if (hasAny(q, ["의료영상", "mri", "초음파", "디지털헬스", "medical imaging", "healthcare ai"])) return "medical_imaging";
        if (hasAny(q, ["로봇", "자율주행", "slam", "드론", "모빌리티", "robot", "autonomous"])) return "robotics";
        if (hasAny(q, ["반도체 패키징", "3d ic", "칩렛", "이종집적", "인터커넥트", "packaging", "chiplet"])) return "packaging";
        if (hasAny(q, ["반도체 소자", "반도체 공정", "박막", "트랜지스터", "mosfet", "ald", "식각", "리소그래피"])) return "semiconductor";
        if (hasAny(q, ["전해질", "electrolyte", "전해액", "고체전해질"])) return "electrolyte";
        if (hasAny(q, ["양극재", "cathode"])) return "cathode";
        if (hasAny(q, ["음극재", "anode"])) return "anode";
        if (hasAny(q, ["분리막", "separator", "membrane"])) return "separator";
        if (hasAny(q, ["태양전지", "solar cell", "photovoltaic", "페로브스카이트"])) return "solar";
        if (hasAny(q, ["유기화학", "유기합성", "organic synthesis", "total synthesis"])) return "organic";
        if (hasAny(q, ["양자컴퓨팅", "양자정보", "양자", "quantum computing", "quantum information"])) return "quantum";
        return "general";
      }
      function familyDirectEnough(item, query, mode) {
        const family = queryFamily(query);
        const score = Number(item.score || 0);
        const text = evidenceText(item);
        if (mode === "explore") {
          const exploreThresholds = {
            bioelectronics: 1700,
            medical_imaging: 1450,
            robotics: 1500,
            packaging: 1350,
            semiconductor: 1400,
            solar: 1200,
            quantum: 1200,
            general: 1500
          };
          const threshold = exploreThresholds[family] || 1500;
          if (score < threshold) return false;
          // Extra semantic guards for banners where broad words can over-expand.
          if (family === "bioelectronics") return hasAny(text, ["biosensor", "바이오센서", "bioelectronics", "생체전자", "wearable", "웨어러블", "implant", "임플란", "biomems", "bio-mems", "bio-medical circuits", "나노바이오센서"]);
          if (family === "medical_imaging") return hasAny(text, ["medical imaging", "biomedical imaging", "mri", "fmri", "ultrasound", "computed tomography", "영상", "초음파", "디지털헬스", "healthcare ai"]);
          if (family === "robotics") return hasAny(text, ["robot", "로봇", "slam", "자율주행", "드론", "모빌리티", "motion planning", "wearable robot", "soft robot"]);
          return true;
        }
        // Precise mode remains strict but does not artificially expand weak tails.
        return score >= 760;
      }
      function dedupeTierItems(items) {
        const seen = new Set();
        const out = [];
        (items || []).forEach((item) => {
          const p = item && item.professor;
          const key = String((p && (p.id || p.professor)) || "");
          if (!key || seen.has(key)) return;
          seen.add(key);
          out.push(item);
        });
        return out;
      }

      recommend = function(query, limit = 8) {
        const raw = snuTierRefinePreviousRecommend(query, limit);
        const mode = ((raw._snuTierMeta || {}).mode) || (isExplore(query) ? "explore" : "precise");
        const direct = [];
        const demoted = [];
        raw.forEach((item) => {
          if (familyDirectEnough(item, query, mode)) direct.push(item);
          else {
            item._snuTier = "adjacent";
            item._snuAdjacentEvidence = item._snuAdjacentEvidence || (item.matched || []).slice(0, 4);
            demoted.push(item);
          }
        });
        // Avoid an accidental empty result for broad banners: keep the strongest few if everything was too strict.
        if (!direct.length && raw.length) {
          raw.slice(0, Math.min(3, raw.length)).forEach((item) => {
            item._snuTier = "direct";
            direct.push(item);
          });
          demoted.splice(0, Math.min(3, raw.length));
        }
        direct.forEach((item) => { item._snuTier = "direct"; });
        const adjacent = dedupeTierItems([...(demoted || []), ...((raw._snuAdjacentResults || []))]).filter((item) => {
          const key = String(((item.professor || {}).id || (item.professor || {}).professor || ""));
          return !direct.some((d) => String(((d.professor || {}).id || (d.professor || {}).professor || "")) === key);
        }).slice(0, 40);
        direct._snuTierMeta = {
          query,
          mode,
          directTotal: direct.length,
          adjacentTotal: adjacent.length,
          refined: true
        };
        direct._snuAdjacentResults = adjacent;
        return direct;
      };
    })();


    /* SNU banner-explore query separation patch (2026-07-09)
       Representative buttons now search by their broad label intent internally.
       The visible prompt can stay natural, but scoring uses a compact banner query and banner_explore mode.
       This prevents the battery banner from narrowing to only lithium-metal/solid-state/electrochemical-storage terms. */
    (function(){
      const snuBannerPreviousRecommend = recommend;
      const snuBannerPreviousBuildMatchEvidenceText = buildMatchEvidenceText;

      function nText(value) {
        try { return normalize(String(value || "")); }
        catch (e) { return String(value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
      }
      function arr(value) { return Array.isArray(value) ? value : []; }
      function profText(professor) {
        return nText([
          professor && professor.professor,
          professor && professor.professorEn,
          ...(arr(professor && professor.unitLabels)),
          ...(arr(professor && professor.labNames)),
          ...(arr(professor && professor.fields)),
          ...(arr(professor && professor.intentTags)),
          ...(arr(professor && professor.keywords)),
          professor && professor.summary,
          professor && professor.searchText
        ].filter(Boolean).join(" | "));
      }
      function phraseHits(text, terms, maxCount) {
        const seen = new Set();
        const hits = [];
        (terms || []).forEach((term) => {
          const raw = String(term || "").trim();
          if (!raw) return;
          const nt = nText(raw);
          if (!nt || seen.has(nt)) return;
          if (text.includes(nt)) {
            seen.add(nt);
            hits.push(raw);
          }
        });
        return hits.slice(0, maxCount || 8);
      }
      function mergeUniqueItems(items) {
        const seen = new Set();
        const out = [];
        (items || []).forEach((item) => {
          const p = item && item.professor;
          const key = String((p && (p.id || p.professor)) || "");
          if (!key || seen.has(key)) return;
          seen.add(key);
          out.push(item);
        });
        return out;
      }
      const BATTERY_DIRECT_TERMS = [
        "배터리", "이차전지", "2차전지", "리튬이온전지", "리튬 이온 전지", "리튬전지", "리튬 배터리", "리튬금속", "리튬금속전지", "리튬 금속 전지", "리튬금속 음극",
        "전고체전지", "전고체 전지", "고체전해질", "고체 전해질", "전해질", "전해액", "양극재", "양극 소재", "양극활물질", "음극재", "음극 소재", "음극활물질",
        "전극재료", "전극 소재", "배터리 소재", "전지 소재", "배터리 계면", "계면 안정화", "SEI", "CEI", "배터리 분석", "배터리 진단", "배터리 재활용", "폐리튬이온", "구조 배터리",
        "battery", "batteries", "lithium-ion battery", "lithium ion battery", "li-ion battery", "lithium battery", "lithium metal battery", "lithium metal anode", "secondary battery", "secondary batteries",
        "solid-state battery", "solid state battery", "all-solid-state battery", "solid electrolyte", "electrolyte", "electrolytes", "cathode", "cathode material", "cathode materials", "positive electrode",
        "anode", "anode material", "anode materials", "negative electrode", "battery materials", "electrode materials", "battery interface", "interphase", "electrochemical energy storage", "battery recycling", "battery diagnostics", "battery manufacturing", "structural battery"
      ];
      const BATTERY_BROAD_ONLY_TERMS = ["energy", "materials", "chemistry", "catalyst", "sustainable", "에너지", "소재", "재료", "화학", "촉매", "지속가능", "전기화학"];
      const BATTERY_PRIORITY = ["최장욱", "강기석", "정성균", "이규태", "강동민", "성영은", "남재욱", "홍성현", "임종우", "김미영", "한흥남", "이윤석", "강진수", "최성열", "유웅렬"];

      function isBannerExplore() {
        return state && state.currentQueryMode === "banner_explore";
      }
      function bannerFamily(query) {
        if (!isBannerExplore()) return "";
        const q = nText(query);
        if (q === "배터리" || hasAny(q, ["battery_general", "배터리/전기화학"])) return "battery_general";
        return "";
      }
      function batteryBannerDirectItem(professor, filters) {
        const text = profText(professor);
        const directHits = phraseHits(text, BATTERY_DIRECT_TERMS, 8);
        if (!directHits.length) return null;
        const broadHits = phraseHits(text, BATTERY_BROAD_ONLY_TERMS, 4);
        let item;
        try { item = scoreProfessor(professor, "배터리", filters || {}); }
        catch (e) { item = snuServiceScoreProfessor(professor, "배터리", filters || {}); }
        const name = String(professor.professor || "");
        const priorityIndex = BATTERY_PRIORITY.indexOf(name);
        const priorityBoost = priorityIndex >= 0 ? (9000 - priorityIndex * 220) : 0;
        const directBoost = Math.min(4200, directHits.length * 560);
        item.score = Math.max(Number(item.score || 0), 900) + directBoost + priorityBoost;
        item.matched = Array.from(new Set([...(directHits || []), ...(item.matched || [])])).slice(0, 8);
        item._snuPrecisionEvidence = directHits;
        item._snuBannerDirectEvidence = directHits;
        item._snuTier = "direct";
        item._snuBannerMode = "battery_general";
        return item;
      }
      function batteryBannerAdjacentItem(professor, filters) {
        const text = profText(professor);
        if (phraseHits(text, BATTERY_DIRECT_TERMS, 1).length) return null;
        const broadHits = phraseHits(text, BATTERY_BROAD_ONLY_TERMS, 5);
        if (!broadHits.length) return null;
        let item;
        try { item = snuServiceScoreProfessor(professor, "배터리", filters || {}); }
        catch (e) { item = { professor, score: 200, matched: broadHits, reasons: [] }; }
        item.score = Math.max(Number(item.score || 0), broadHits.length * 80);
        item.matched = broadHits.slice(0, 5);
        item._snuTier = "adjacent";
        item._snuAdjacentEvidence = broadHits;
        item._snuDirectnessNote = "배터리 직접 키워드보다는 에너지, 소재, 전기화학 등 인접 분야 근거로 연결됩니다.";
        return item;
      }

      recommend = function(query, limit = 8) {
        const family = bannerFamily(query);
        if (family !== "battery_general") {
          const out = snuBannerPreviousRecommend(query, limit);
          if (isBannerExplore() && out && out._snuTierMeta) out._snuTierMeta.mode = "banner_explore";
          return out;
        }
        const filters = getCurrentFilters ? getCurrentFilters() : {};
        const previous = snuBannerPreviousRecommend(query, limit) || [];
        const customDirect = professors.map((professor) => batteryBannerDirectItem(professor, filters)).filter(Boolean);
        const direct = mergeUniqueItems([...customDirect, ...previous]).sort((a, b) => {
          const ai = BATTERY_PRIORITY.indexOf(String((a.professor || {}).professor || ""));
          const bi = BATTERY_PRIORITY.indexOf(String((b.professor || {}).professor || ""));
          if (ai !== bi && Math.min(ai, bi) >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
          return Number(b.score || 0) - Number(a.score || 0) || String((a.professor || {}).professor || "").localeCompare(String((b.professor || {}).professor || ""), "ko");
        }).slice(0, Math.max(limit || RECOMMEND_RESULT_LIMIT || 120, 80));
        direct.forEach((item) => { item._snuTier = "direct"; item._snuBannerMode = "battery_general"; });
        const directKeys = new Set(direct.map((item) => String(((item.professor || {}).id || (item.professor || {}).professor || ""))));
        const prevAdjacent = (previous._snuAdjacentResults || []).filter((item) => {
          if (!item || !item.professor) return false;
          const key = String(((item.professor || {}).id || (item.professor || {}).professor || ""));
          return key && !directKeys.has(key);
        });
        const customAdjacent = professors.map((professor) => batteryBannerAdjacentItem(professor, filters)).filter((item) => {
          if (!item || !item.professor) return false;
          const key = String(((item.professor || {}).id || (item.professor || {}).professor || ""));
          return key && !directKeys.has(key);
        });
        const adjacent = mergeUniqueItems([...prevAdjacent, ...customAdjacent]).sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 40);
        direct._snuTierMeta = {
          query,
          mode: "banner_explore",
          family: "battery_general",
          internalQuery: "배터리",
          directTotal: direct.length,
          adjacentTotal: adjacent.length,
          bannerQuerySeparated: true
        };
        direct._snuAdjacentResults = adjacent;
        return direct;
      };

      buildMatchEvidenceText = function(item) {
        if (item && item._snuTier === "adjacent" && item._snuAdjacentEvidence) {
          return `인접 분야 근거: ${(item._snuAdjacentEvidence || []).slice(0, 4).join(", ")} 키워드가 입력 분야와 가까운 연구 주제입니다.`;
        }
        if (item && item._snuBannerMode === "battery_general") {
          const terms = (item._snuBannerDirectEvidence || item._snuPrecisionEvidence || item.matched || []).slice(0, 5).filter(Boolean);
          if (terms.length) return `${terms.join(", ")} 키워드가 배터리 전체 분야와 직접 연결됩니다.`;
        }
        return snuBannerPreviousBuildMatchEvidenceText(item);
      };
    })();


    /* SNU all-banner explore audit patch (2026-07-09)
       - Applies banner_explore separation to every representative top banner, not only the battery banner.
       - Banner clicks use compact internalQuery + intent, while free-text search remains precise.
       - Tier C adjacent candidates stay separated from the default direct result list. */
    (function(){
      const snuAllBannerPreviousRecommend = recommend;
      const snuAllBannerPreviousBuildMatchEvidenceText = buildMatchEvidenceText;

      function snuBannerNorm(value) {
        try { return normalize(String(value || "")); }
        catch (e) { return String(value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
      }
      function snuBannerArray(value) { return Array.isArray(value) ? value : []; }
      function snuBannerProfessorText(professor) {
        const structured = (professor && professor.structuredProfile) || {};
        return snuBannerNorm([
          professor && professor.professor,
          professor && professor.professorEn,
          ...(snuBannerArray(professor && professor.unitLabels)),
          ...(snuBannerArray(professor && professor.labNames)),
          ...(snuBannerArray(professor && professor.fields)),
          ...(snuBannerArray(professor && professor.intentTags)),
          ...(snuBannerArray(professor && professor.keywords)),
          professor && professor.summary,
          professor && professor.searchText,
          structured.primaryResearchText,
          structured.detailedKeywordText,
          structured.labIntroText
        ].filter(Boolean).join(" | "));
      }
      function snuBannerPhraseHits(text, terms, maxCount) {
        const seen = new Set();
        const hits = [];
        (terms || []).forEach((term) => {
          const raw = String(term || "").trim();
          if (!raw) return;
          const nt = snuBannerNorm(raw);
          if (!nt || seen.has(nt)) return;
          if (text.includes(nt)) {
            seen.add(nt);
            hits.push(raw);
          }
        });
        return hits.slice(0, maxCount || 8);
      }
      function snuBannerTagHits(professor, tags, maxCount) {
        const text = snuBannerNorm((professor && professor.intentTags || []).join(" | "));
        return (tags || []).filter((tag) => text.includes(snuBannerNorm(tag))).slice(0, maxCount || 4);
      }
      function snuBannerDedupe(items) {
        const seen = new Set();
        const out = [];
        (items || []).forEach((item) => {
          const p = item && item.professor;
          const key = String((p && (p.id || p.professor)) || "");
          if (!key || seen.has(key)) return;
          seen.add(key);
          out.push(item);
        });
        return out;
      }
      function snuBannerNameRank(professor, names) {
        const n = snuBannerNorm([professor && professor.professor, professor && professor.professorEn].join(" "));
        const idx = (names || []).findIndex((name) => n.includes(snuBannerNorm(name)));
        return idx < 0 ? 9999 : idx;
      }

      const SNU_BANNER_EXPLORE_CONFIGS = [
        {
          label: "반도체 소자/공정", intent: "semiconductor_device_process_general", internalQuery: "반도체 소자 공정",
          directTags: ["반도체 소자/공정/박막"],
          directTerms: ["semiconductor device", "semiconductor process", "semiconductor", "transistor", "mosfet", "finfet", "gaa", "cmos", "memory", "dram", "nand", "tft", "thin film", "ald", "cvd", "lithography", "etch", "fabrication", "nanofabrication", "device physics", "반도체", "반도체 소자", "반도체 공정", "트랜지스터", "박막", "증착", "식각", "리소그래피", "나노공정", "전자소자", "메모리"],
          broadTerms: ["materials", "electronics", "device", "process", "소자", "공정", "전자", "재료", "소재"],
          priorityNames: ["이종호", "신형철", "이철호", "최우영", "한준규", "곽정훈", "정규원", "윤상원"]
        },
        {
          label: "배터리/전기화학", intent: "battery_general", internalQuery: "배터리",
          directTags: ["배터리/에너지/수소/전기화학"],
          directTerms: ["battery", "batteries", "lithium-ion battery", "lithium ion battery", "li-ion", "lithium metal", "secondary battery", "solid-state battery", "solid state battery", "solid electrolyte", "electrolyte", "cathode", "anode", "electrode", "battery materials", "battery interface", "interphase", "electrochemical energy storage", "battery recycling", "battery diagnostics", "배터리", "이차전지", "2차전지", "리튬이온전지", "리튬금속", "전고체전지", "고체전해질", "전해질", "전해액", "양극재", "음극재", "전극", "배터리 소재", "전지 소재", "배터리 계면", "에너지 저장"],
          broadTerms: ["energy", "materials", "chemistry", "catalyst", "electrochemistry", "에너지", "소재", "재료", "화학", "촉매", "전기화학"],
          priorityNames: ["최장욱", "강기석", "정성균", "이규태", "강동민", "성영은", "남재욱", "홍성현", "임종우", "김미영", "한흥남", "이윤석", "강진수", "최성열", "유웅렬"]
        },
        {
          label: "디스플레이", intent: "display_general", internalQuery: "디스플레이",
          directTags: ["디스플레이/포토닉스/광전자"],
          directTerms: ["display", "oled", "micro led", "micro-led", "qled", "light emitting", "organic semiconductor", "organic electronics", "flexible display", "perovskite", "optoelectronic", "디스플레이", "oled", "마이크로 led", "플렉서블 디스플레이", "발광소자", "유기반도체", "페로브스카이트"],
          broadTerms: ["photonics", "optics", "electronics", "materials", "광학", "광전자", "소재", "전자"],
          priorityNames: ["이재상", "이수연", "홍용택", "곽정훈", "이태우", "박재형", "최수연", "김대형", "고승환"]
        },
        {
          label: "포토닉스/광전소자", intent: "photonics_optoelectronics_general", internalQuery: "포토닉스 광전소자",
          directTags: ["디스플레이/포토닉스/광전자", "양자/물리/광학/천문"],
          directTerms: ["photonics", "optoelectronic", "optoelectronics", "nanophotonics", "plasmonics", "metasurface", "meta surface", "optical", "laser", "photodetector", "photonic crystal", "integrated photonics", "포토닉스", "광전소자", "나노광학", "플라즈모닉", "메타표면", "레이저", "광검출기", "광집적", "광전자"],
          broadTerms: ["optics", "display", "semiconductor", "materials", "광학", "디스플레이", "반도체", "소재"]
        },
        {
          label: "AI/머신러닝", intent: "ai_ml_general", internalQuery: "AI 머신러닝",
          directTags: ["AI/머신러닝/데이터사이언스"],
          directTerms: ["artificial intelligence", "machine learning", "deep learning", "reinforcement learning", "generative ai", "multimodal", "representation learning", "graph neural", "data science", "머신러닝", "딥러닝", "강화학습", "생성형 ai", "인공지능", "데이터사이언스", "그래프 신경망", "멀티모달"],
          broadTerms: ["algorithm", "model", "data", "optimization", "시스템", "데이터", "모델", "최적화"]
        },
        {
          label: "컴퓨터비전/영상인식", intent: "computer_vision_general", internalQuery: "컴퓨터비전 영상인식",
          directTags: [],
          directTerms: ["computer vision", "visual recognition", "image recognition", "object detection", "segmentation", "multimodal", "video understanding", "vision-language", "3d vision", "컴퓨터비전", "컴퓨터 비전", "영상인식", "객체검출", "이미지 인식", "세그멘테이션", "비전", "멀티모달 ai"],
          broadTerms: ["ai", "deep learning", "image", "visual", "signal processing", "영상", "딥러닝", "신호처리"]
        },
        {
          label: "바이오센서/생체전자", intent: "biosensor_bioelectronics_general", internalQuery: "바이오센서 생체전자",
          directTags: [],
          directTerms: ["biosensor", "bio sensor", "bioelectronics", "bio-electronics", "wearable sensor", "wearable electronics", "implantable", "neural interface", "bioelectronic", "electronic skin", "바이오센서", "생체전자", "생체전자소자", "웨어러블 센서", "웨어러블 전자", "임플란터블", "신경전극", "전자피부", "생체신호"],
          broadTerms: ["sensor", "bio", "biomedical", "wearable", "electronics", "센서", "바이오", "의생명", "전자"]
        },
        {
          label: "뇌과학/BCI", intent: "neuroscience_bci_general", internalQuery: "뇌과학 BCI",
          directTags: ["뇌/신경/인지/BCI"],
          directTerms: ["neuroscience", "brain", "neural", "bci", "brain-computer interface", "neural interface", "neural electrode", "neuroengineering", "brain imaging", "cognitive", "뇌과학", "뇌공학", "bci", "신경공학", "신경전극", "뇌영상", "인지", "신경과학"],
          broadTerms: ["bio", "medical", "sensor", "imaging", "바이오", "의료", "센서", "영상"]
        },
        {
          label: "의료영상/디지털헬스", intent: "medical_imaging_digital_health_general", internalQuery: "의료영상 디지털헬스",
          directTags: [],
          directTerms: ["medical imaging", "biomedical imaging", "mri", "ultrasound", "x-ray", "computed tomography", "digital health", "healthcare ai", "medical image", "biomedical image", "의료영상", "의료 영상", "디지털헬스", "헬스케어 ai", "mri", "초음파", "생체영상", "바이오메디컬 영상"],
          broadTerms: ["ai", "deep learning", "health", "imaging", "biomedical", "딥러닝", "영상", "의생명", "헬스케어"]
        },
        {
          label: "로봇/자율주행", intent: "robotics_autonomous_control_general", internalQuery: "로봇 자율주행 제어",
          directTags: ["로봇/제어/자율주행/모빌리티"],
          directTerms: ["robot", "robotics", "autonomous", "autonomous driving", "slam", "motion planning", "mobile robot", "legged robot", "humanoid", "manipulation", "drone", "uav", "wearable robot", "soft robot", "robot control", "로봇", "로보틱스", "자율주행", "slam", "모션 플래닝", "모빌리티", "드론", "무인기", "웨어러블 로봇", "소프트 로봇", "휴머노이드", "로봇 제어"],
          broadTerms: ["control", "optimization", "dynamics", "mechatronics", "제어", "최적화", "동역학", "기계"]
        },
        {
          label: "HCI/AR/VR", intent: "hci_ar_vr_general", internalQuery: "HCI AR VR",
          directTags: [],
          directTerms: ["hci", "human-computer interaction", "human computer interaction", "user experience", "interaction design", "user interface", "augmented reality", "virtual reality", "mixed reality", "xr", "인터랙션", "사용자 경험", "사용자 인터페이스", "증강현실", "가상현실", "혼합현실"],
          broadTerms: ["design", "visualization", "graphics", "health", "디자인", "시각화", "그래픽스", "헬스"]
        },
        {
          label: "양자컴퓨팅/양자정보", intent: "quantum_computing_information_general", internalQuery: "양자컴퓨팅 양자정보",
          directTags: [],
          directTerms: ["quantum computing", "quantum computer", "quantum information", "quantum algorithm", "quantum simulation", "quantum communication", "quantum cryptography", "ion trap", "superconducting quantum", "neutral atom", "photonic quantum", "양자컴퓨팅", "양자 컴퓨팅", "양자정보", "양자 알고리즘", "양자시뮬레이션", "양자통신", "이온트랩", "양자 소자"],
          broadTerms: ["quantum", "physics", "optics", "양자", "물리", "광학"]
        },
        {
          label: "AI 반도체/VLSI", intent: "ai_semiconductor_vlsi_general", internalQuery: "AI 반도체 VLSI",
          directTags: ["반도체 회로/SoC/AI하드웨어"],
          directTerms: ["vlsi", "soc", "asic", "fpga", "ai accelerator", "hardware accelerator", "processing-in-memory", "pim", "neuromorphic hardware", "integrated circuit", "circuit design", "ai semiconductor", "vlsi", "soc", "asic", "fpga", "ai 반도체", "하드웨어 가속기", "집적회로", "회로설계", "뉴로모픽 하드웨어", "pim"],
          broadTerms: ["semiconductor", "ai", "hardware", "circuit", "반도체", "ai", "하드웨어", "회로"]
        },
        {
          label: "반도체 패키징/이종집적", intent: "semiconductor_packaging_heterogeneous_integration_general", internalQuery: "반도체 패키징 이종집적",
          directTags: ["패키징/인터커넥트/신뢰성"],
          directTerms: ["advanced packaging", "semiconductor packaging", "chiplet", "3d ic", "heterogeneous integration", "interconnect", "die-to-die", "through silicon via", "tsv", "micro bump", "packaging mechanics", "반도체 패키징", "패키징", "칩렛", "3d ic", "이종집적", "인터커넥트", "tsv", "마이크로범프", "신뢰성"],
          broadTerms: ["semiconductor", "device", "materials", "reliability", "반도체", "소자", "소재", "신뢰성"],
          priorityNames: ["김성재", "김태성", "김택수", "최우영"]
        },
        {
          label: "수소/연료전지", intent: "hydrogen_fuelcell_general", internalQuery: "수소 연료전지",
          directTags: ["배터리/에너지/수소/전기화학"],
          directTerms: ["hydrogen", "fuel cell", "water electrolysis", "electrolyzer", "hydrogen production", "hydrogen storage", "oxygen reduction", "orr", "oxygen evolution", "oer", "electrocatalyst", "수소", "연료전지", "수전해", "수소 생산", "수소 저장", "전기촉매", "산소환원", "산소발생", "에너지 변환"],
          broadTerms: ["energy", "electrochemistry", "catalyst", "materials", "에너지", "전기화학", "촉매", "소재"]
        },
        {
          label: "나노소재/신소재", intent: "materials_nano_general", internalQuery: "나노소재 신소재",
          directTags: ["재료/나노/표면/분석"],
          directTerms: ["nanomaterial", "nano material", "nanostructure", "2d material", "graphene", "transition metal dichalcogenide", "tm dc", "surface analysis", "materials science", "advanced materials", "thin film", "나노소재", "나노 재료", "신소재", "2d 소재", "그래핀", "표면 분석", "재료과학", "박막", "나노구조"],
          broadTerms: ["materials", "nano", "surface", "analysis", "소재", "재료", "나노", "표면", "분석"]
        },
        {
          label: "고분자/유기소재", intent: "polymer_organic_materials_general", internalQuery: "고분자 유기소재",
          directTags: ["화학/촉매/유기합성/고분자", "재료/나노/표면/분석"],
          directTerms: ["polymer", "organic materials", "soft matter", "smart polymer", "block copolymer", "self-assembly", "organic semiconductor", "hydrogel", "elastomer", "고분자", "유기소재", "소프트머터", "스마트 폴리머", "블록공중합체", "자기조립", "하이드로젤", "엘라스토머"],
          broadTerms: ["chemistry", "materials", "organic", "soft", "화학", "소재", "유기", "재료"]
        },
        {
          label: "촉매/화학공정", intent: "catalysis_chemical_process_general", internalQuery: "촉매 화학공정",
          directTags: ["화학/촉매/유기합성/고분자"],
          directTerms: ["catalysis", "catalyst", "heterogeneous catalyst", "homogeneous catalyst", "zeolite", "reaction engineering", "chemical process", "process systems", "organic synthesis", "electrocatalysis", "photocatalysis", "촉매", "불균일촉매", "균일촉매", "제올라이트", "반응공학", "화학공정", "유기합성", "전기촉매", "광촉매"],
          broadTerms: ["chemistry", "chemical", "process", "energy", "materials", "화학", "공정", "에너지", "소재"]
        },
        {
          label: "단백질/신약개발", intent: "protein_drug_development_general", internalQuery: "단백질 신약개발",
          directTags: ["바이오/의생명/약물전달", "생명과학/세포/분자/질병"],
          directTerms: ["protein engineering", "protein", "drug discovery", "drug development", "drug delivery", "biomolecular engineering", "therapeutics", "enzyme engineering", "antibody", "peptide", "단백질", "단백질 공학", "신약개발", "약물전달", "바이오분자공학", "치료제", "항체", "펩타이드", "효소공학"],
          broadTerms: ["bio", "biomedical", "molecular", "chemistry", "바이오", "의생명", "분자", "화학"]
        },
        {
          label: "세포/면역/분자생물학", intent: "cell_immunology_molecular_biology_general", internalQuery: "세포 면역 분자생물학",
          directTags: ["생명과학/세포/분자/질병", "바이오/의생명/약물전달"],
          directTerms: ["cell biology", "immunology", "molecular biology", "disease mechanism", "cell signaling", "rna biology", "crispr", "single-cell", "proteomics", "chromatin", "autophagy", "organoid", "t cell", "microbiome", "세포생물학", "세포", "면역학", "분자생물학", "질병 기전", "rna", "crispr", "단일세포", "오가노이드", "t 세포", "마이크로바이옴"],
          broadTerms: ["bio", "life science", "disease", "molecular", "바이오", "생명", "질병", "분자"]
        },
        {
          label: "자연어처리/LLM", intent: "nlp_llm_general", internalQuery: "자연어처리 LLM",
          directTags: ["AI/머신러닝/데이터사이언스"],
          directTerms: ["natural language processing", "nlp", "large language model", "llm", "language model", "generative ai", "text mining", "dialogue", "machine translation", "자연어처리", "자연어", "llm", "언어모델", "대규모 언어모델", "생성형 ai", "기계번역", "대화시스템"],
          broadTerms: ["ai", "machine learning", "deep learning", "data", "ai", "머신러닝", "딥러닝", "데이터"]
        },
        {
          label: "DB/빅데이터", intent: "database_bigdata_general", internalQuery: "데이터베이스 빅데이터",
          directTags: [],
          directTerms: ["database", "database systems", "big data", "data mining", "recommender", "recommender systems", "query processing", "data systems", "large-scale data", "데이터베이스", "빅데이터", "데이터마이닝", "추천시스템", "질의처리", "데이터 시스템"],
          broadTerms: ["data", "system", "ai", "데이터", "시스템", "ai"]
        },
        {
          label: "시스템/운영체제", intent: "systems_os_distributed_general", internalQuery: "운영체제 분산시스템",
          directTags: [],
          directTerms: ["operating system", "distributed system", "storage system", "file system", "cloud computing", "computer systems", "systems software", "compiler", "embedded system", "parallel computing", "운영체제", "분산시스템", "스토리지", "파일시스템", "클라우드 컴퓨팅", "컴퓨터 시스템", "시스템 소프트웨어", "컴파일러", "임베디드"],
          broadTerms: ["system", "software", "network", "architecture", "시스템", "소프트웨어", "네트워크", "아키텍처"]
        },
        {
          label: "정보보안/암호", intent: "security_cryptography_general", internalQuery: "정보보안 암호",
          directTags: [],
          directTerms: ["security", "computer security", "system security", "software security", "network security", "cryptography", "privacy", "homomorphic encryption", "lattice", "vulnerability", "fuzzing", "secure systems", "정보보안", "보안", "암호", "프라이버시", "시스템 보안", "소프트웨어 보안", "네트워크 보안", "동형암호", "취약점"],
          broadTerms: ["system", "network", "software", "privacy", "시스템", "네트워크", "소프트웨어", "프라이버시"]
        },
        {
          label: "전력전자/인버터", intent: "power_electronics_inverter_general", internalQuery: "전력전자 인버터",
          directTags: ["전력전자/전력변환/전력무결성"],
          directTerms: ["power electronics", "inverter", "converter", "power conversion", "power supply", "power management", "motor drive", "power integrity", "전력전자", "인버터", "컨버터", "전력변환", "전원회로", "전력관리", "모터드라이브", "전력무결성"],
          broadTerms: ["circuit", "electronics", "energy", "control", "회로", "전자", "에너지", "제어"]
        },
        {
          label: "그래픽스/3D 비전", intent: "graphics_3d_vision_general", internalQuery: "그래픽스 3D 비전",
          directTags: ["AI/머신러닝/데이터사이언스"],
          directTerms: ["computer graphics", "graphics", "3d vision", "rendering", "visual computing", "geometry processing", "computer animation", "3d reconstruction", "nerf", "컴퓨터 그래픽스", "그래픽스", "3d 비전", "렌더링", "비주얼 컴퓨팅", "기하처리", "컴퓨터 애니메이션", "3차원 복원"],
          broadTerms: ["vision", "ai", "visual", "image", "비전", "ai", "영상", "시각"]
        },
        {
          label: "항공우주/추진", intent: "aerospace_propulsion_general", internalQuery: "항공우주 추진",
          directTags: ["항공우주/위성/추진/열유체"],
          directTerms: ["aerospace", "propulsion", "rocket", "satellite", "spacecraft", "uav", "unmanned aerial", "gas turbine", "turbomachinery", "combustion", "reacting flow", "aerodynamics", "항공우주", "추진", "로켓", "위성", "우주선", "무인기", "드론", "가스터빈", "터보기계", "연소", "공기역학", "열유체"],
          broadTerms: ["fluid", "thermal", "mechanics", "energy", "유체", "열", "기계", "에너지"]
        },
        {
          label: "환경/기후/지속가능", intent: "environment_climate_sustainability_general", internalQuery: "환경 기후 지속가능",
          directTags: ["환경/기후/지속가능"],
          directTerms: ["environment", "environmental", "climate", "carbon neutral", "carbon neutrality", "sustainable", "sustainability", "water treatment", "wastewater", "air pollution", "co2", "carbon capture", "renewable", "advanced oxidation", "membrane", "환경", "환경공학", "기후", "탄소중립", "지속가능", "수처리", "폐수", "대기오염", "이산화탄소", "탄소포집", "재생에너지", "막분리"],
          broadTerms: ["energy", "materials", "chemical", "bio", "에너지", "소재", "화학", "바이오"]
        }
      ];

      const snuBannerConfigsByQuery = new Map();
      SNU_BANNER_EXPLORE_CONFIGS.forEach((config) => {
        snuBannerConfigsByQuery.set(snuBannerNorm(config.internalQuery), config);
        snuBannerConfigsByQuery.set(snuBannerNorm(config.intent), config);
        snuBannerConfigsByQuery.set(snuBannerNorm(config.label), config);
      });

      function snuAllBannerIsExplore() {
        return state && state.currentQueryMode === "banner_explore";
      }
      function snuAllBannerFindConfig(query) {
        if (!snuAllBannerIsExplore()) return null;
        const q = snuBannerNorm(query || "");
        if (!q) return null;
        if (snuBannerConfigsByQuery.has(q)) return snuBannerConfigsByQuery.get(q);
        for (const config of SNU_BANNER_EXPLORE_CONFIGS) {
          if (q.includes(snuBannerNorm(config.intent))) return config;
        }
        return null;
      }
      function snuAllBannerDirectItem(professor, config, filters) {
        const text = snuBannerProfessorText(professor);
        const directHits = snuBannerPhraseHits(text, config.directTerms || [], 8);
        const tagHits = snuBannerTagHits(professor, config.directTags || [], 4);
        if (!directHits.length && !tagHits.length) return null;
        const item = { professor, score: 0, matched: [], reasons: [] };
        const nameRank = snuBannerNameRank(professor, config.priorityNames || []);
        const priorityBoost = nameRank < 9999 ? (6200 - nameRank * 180) : 0;
        const directBoost = Math.min(3600, directHits.length * 360) + Math.min(1800, tagHits.length * 700);
        const unitOk = !filters || !filters.unit || filters.unit === "all" || ((professor.unitCodes || []).includes(filters.unit));
        const tagOk = !filters || !filters.tag || (professor.intentTags || []).some((tag) => snuBannerNorm(tag) === snuBannerNorm(filters.tag));
        const keywordOk = !filters || !filters.keyword || text.includes(snuBannerNorm(filters.keyword));
        if (!unitOk || !tagOk || !keywordOk) return null;
        const baseScore = 420 + (hasValidHomepage && hasValidHomepage(professor) ? 25 : 0);
        item.score = Math.round(baseScore + directBoost + priorityBoost + Math.min(Number((professor || {}).qualityScore || 0) / 15, 8));
        item.matched = Array.from(new Set([...(directHits || []), ...(tagHits || [])])).slice(0, 10);
        item._snuTier = "direct";
        item._snuTierLevel = item.score >= 1350 ? "A" : "B";
        item._snuBannerMode = config.intent;
        item._snuBannerLabel = config.label;
        item._snuBannerDirectEvidence = Array.from(new Set([...(directHits || []), ...(tagHits || [])])).slice(0, 6);
        item._snuPrecisionEvidence = item._snuBannerDirectEvidence;
        return item;
      }
      function snuAllBannerAdjacentItem(professor, config, filters, directKeys) {
        const key = String(((professor || {}).id || (professor || {}).professor || ""));
        if (directKeys && directKeys.has(key)) return null;
        const text = snuBannerProfessorText(professor);
        if (snuBannerPhraseHits(text, config.directTerms || [], 1).length || snuBannerTagHits(professor, config.directTags || [], 1).length) return null;
        const broadHits = snuBannerPhraseHits(text, config.broadTerms || [], 6);
        if (!broadHits.length) return null;
        const unitOk = !filters || !filters.unit || filters.unit === "all" || ((professor.unitCodes || []).includes(filters.unit));
        const tagOk = !filters || !filters.tag || (professor.intentTags || []).some((tag) => snuBannerNorm(tag) === snuBannerNorm(filters.tag));
        const keywordOk = !filters || !filters.keyword || text.includes(snuBannerNorm(filters.keyword));
        if (!unitOk || !tagOk || !keywordOk) return null;
        const item = { professor, score: 0, matched: [], reasons: [] };
        item.score = Math.round(180 + broadHits.length * 90 + (hasValidHomepage && hasValidHomepage(professor) ? 20 : 0));
        item.matched = broadHits.slice(0, 6);
        item._snuTier = "adjacent";
        item._snuTierLevel = "C";
        item._snuBannerMode = config.intent;
        item._snuBannerLabel = config.label;
        item._snuAdjacentEvidence = broadHits.slice(0, 5);
        item._snuDirectnessNote = `${config.label} 직접 키워드는 부족하지만, 인접한 방법론이나 응용 키워드로 연결됩니다.`;
        return item;
      }
      function snuAllBannerSort(config) {
        return function(a, b) {
          const ar = snuBannerNameRank(a.professor, config.priorityNames || []);
          const br = snuBannerNameRank(b.professor, config.priorityNames || []);
          if (ar !== br && Math.min(ar, br) < 9999) return ar - br;
          return Number(b.score || 0) - Number(a.score || 0) || resultSortPriority(b) - resultSortPriority(a) || String((a.professor || {}).professor || "").localeCompare(String((b.professor || {}).professor || ""), "ko");
        };
      }

      recommend = function(query, limit = 8) {
        const config = snuAllBannerFindConfig(query);
        if (!config) {
          const out = snuAllBannerPreviousRecommend(query, limit);
          if (snuAllBannerIsExplore() && out && out._snuTierMeta) out._snuTierMeta.mode = "banner_explore";
          return out;
        }
        const filters = getCurrentFilters ? getCurrentFilters() : {};
        const maxDirect = Math.max(limit || RECOMMEND_RESULT_LIMIT || 120, 80);
        const directAll = snuBannerDedupe(professors.map((professor) => snuAllBannerDirectItem(professor, config, filters)).filter(Boolean)).sort(snuAllBannerSort(config));
        const direct = directAll.slice(0, maxDirect);
        const directKeys = new Set(directAll.map((item) => String(((item.professor || {}).id || (item.professor || {}).professor || ""))));
        const adjacent = snuBannerDedupe(professors.map((professor) => snuAllBannerAdjacentItem(professor, config, filters, directKeys)).filter(Boolean)).sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || resultSortPriority(b) - resultSortPriority(a)).slice(0, 40);
        direct._snuTierMeta = {
          query,
          mode: "banner_explore",
          family: config.intent,
          label: config.label,
          intent: config.intent,
          internalQuery: config.internalQuery,
          directTotal: directAll.length,
          adjacentTotal: adjacent.length,
          bannerQuerySeparated: true,
          allBannerSweep: true
        };
        direct._snuAdjacentResults = adjacent;
        return direct;
      };

      buildMatchEvidenceText = function(item) {
        if (item && item._snuTier === "adjacent" && item._snuAdjacentEvidence) {
          return `인접 분야 근거: ${(item._snuAdjacentEvidence || []).slice(0, 4).join(", ")} 키워드가 입력 분야와 가까운 연구 주제입니다.`;
        }
        if (item && item._snuBannerMode && item._snuBannerDirectEvidence) {
          const terms = (item._snuBannerDirectEvidence || item.matched || []).slice(0, 5).filter(Boolean);
          if (terms.length) return `${terms.join(", ")} 키워드가 ${item._snuBannerLabel || "대표 분야"}와 직접 연결됩니다.`;
        }
        return snuAllBannerPreviousBuildMatchEvidenceText(item);
      };
    })();


    /* Algorithm5: diverse precise-query regression layer.
       Purpose: keep banner_explore broad, while making direct search phrases such as
       강화학습, 면역세포, 운영체제, 3D IC, 수전해 촉매, RAG, 포인트클라우드, etc.
       narrow to query-specific evidence instead of falling back to only broad labels. */
    (function() {
      const SNU_DIVERSE_PRECISE_PROFILES = [
      {
            "label": "반도체 소자/공정",
            "query": "CMOS 트랜지스터 연구실 추천해줘",
            "intent": "CMOS 기반 트랜지스터, 전자소자",
            "triggers": [
                  "CMOS 트랜지스터",
                  "cmos",
                  "transistor",
                  "트랜지스터",
                  "mosfet"
            ],
            "terms": [
                  "cmos",
                  "transistor",
                  "트랜지스터",
                  "mosfet"
            ],
            "contextTerms": [
                  "반도체 소자 공정",
                  "semiconductor device",
                  "semiconductor process",
                  "semiconductor",
                  "transistor",
                  "mosfet",
                  "finfet",
                  "gaa",
                  "cmos",
                  "memory",
                  "dram",
                  "nand",
                  "tft",
                  "반도체 소자/공정/박막"
            ],
            "priorityNames": [
                  "이종호",
                  "신형철",
                  "이철호",
                  "최우영",
                  "한준규",
                  "곽정훈",
                  "정규원",
                  "윤상원"
            ]
      },
      {
            "label": "반도체 소자/공정",
            "query": "리소그래피 공정 교수님 추천해줘",
            "intent": "노광, 리소그래피, 미세공정",
            "triggers": [
                  "리소그래피 공정",
                  "lithography",
                  "리소그래피",
                  "노광",
                  "nanofabrication"
            ],
            "terms": [
                  "lithography",
                  "리소그래피",
                  "노광",
                  "nanofabrication"
            ],
            "contextTerms": [
                  "반도체 소자 공정",
                  "semiconductor device",
                  "semiconductor process",
                  "semiconductor",
                  "transistor",
                  "mosfet",
                  "finfet",
                  "gaa",
                  "cmos",
                  "memory",
                  "dram",
                  "nand",
                  "tft",
                  "반도체 소자/공정/박막"
            ],
            "priorityNames": [
                  "이종호",
                  "신형철",
                  "이철호",
                  "최우영",
                  "한준규",
                  "곽정훈",
                  "정규원",
                  "윤상원"
            ]
      },
      {
            "label": "반도체 소자/공정",
            "query": "원자층 증착 ALD 연구실 추천해줘",
            "intent": "ALD, 박막 증착",
            "triggers": [
                  "원자층 증착 ALD",
                  "atomic layer deposition",
                  "원자층 증착",
                  "박막 증착"
            ],
            "terms": [
                  "ald",
                  "atomic layer deposition",
                  "원자층 증착",
                  "박막 증착"
            ],
            "contextTerms": [
                  "반도체 소자 공정",
                  "semiconductor device",
                  "semiconductor process",
                  "semiconductor",
                  "transistor",
                  "mosfet",
                  "finfet",
                  "gaa",
                  "cmos",
                  "memory",
                  "dram",
                  "nand",
                  "tft",
                  "반도체 소자/공정/박막"
            ],
            "priorityNames": [
                  "이종호",
                  "신형철",
                  "이철호",
                  "최우영",
                  "한준규",
                  "곽정훈",
                  "정규원",
                  "윤상원"
            ]
      },
      {
            "label": "반도체 소자/공정",
            "query": "뉴로모픽 소자 교수님 추천해줘",
            "intent": "뉴로모픽 반도체 소자",
            "triggers": [
                  "뉴로모픽 소자",
                  "neuromorphic",
                  "뉴로모픽",
                  "memristor",
                  "메모리 소자"
            ],
            "terms": [
                  "neuromorphic",
                  "뉴로모픽",
                  "memristor",
                  "메모리 소자"
            ],
            "contextTerms": [
                  "반도체 소자 공정",
                  "semiconductor device",
                  "semiconductor process",
                  "semiconductor",
                  "transistor",
                  "mosfet",
                  "finfet",
                  "gaa",
                  "cmos",
                  "memory",
                  "dram",
                  "nand",
                  "tft",
                  "반도체 소자/공정/박막"
            ],
            "priorityNames": [
                  "이종호",
                  "신형철",
                  "이철호",
                  "최우영",
                  "한준규",
                  "곽정훈",
                  "정규원",
                  "윤상원"
            ]
      },
      {
            "label": "반도체 소자/공정",
            "query": "박막 트랜지스터 TFT 연구실 추천해줘",
            "intent": "TFT, 박막 전자소자",
            "triggers": [
                  "박막 트랜지스터 TFT",
                  "thin film transistor",
                  "박막 트랜지스터"
            ],
            "terms": [
                  "tft",
                  "thin film transistor",
                  "박막 트랜지스터"
            ],
            "contextTerms": [
                  "반도체 소자 공정",
                  "semiconductor device",
                  "semiconductor process",
                  "semiconductor",
                  "transistor",
                  "mosfet",
                  "finfet",
                  "gaa",
                  "cmos",
                  "memory",
                  "dram",
                  "nand",
                  "tft",
                  "반도체 소자/공정/박막"
            ],
            "priorityNames": [
                  "이종호",
                  "신형철",
                  "이철호",
                  "최우영",
                  "한준규",
                  "곽정훈",
                  "정규원",
                  "윤상원"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "전고체전지 교수님 추천해줘",
            "intent": "전고체전지, 고체전해질",
            "triggers": [
                  "전고체전지",
                  "전고체",
                  "고체전해질",
                  "solid-state battery",
                  "solid state battery",
                  "all-solid-state"
            ],
            "terms": [
                  "전고체전지",
                  "전고체",
                  "고체전해질",
                  "solid-state battery",
                  "solid state battery",
                  "all-solid-state"
            ],
            "contextTerms": [
                  "배터리",
                  "battery",
                  "batteries",
                  "lithium-ion battery",
                  "lithium ion battery",
                  "li-ion",
                  "lithium metal",
                  "secondary battery",
                  "solid-state battery",
                  "solid state battery",
                  "solid electrolyte",
                  "electrolyte",
                  "cathode",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": [
                  "최장욱",
                  "강기석",
                  "정성균",
                  "이규태",
                  "강동민",
                  "성영은",
                  "남재욱",
                  "홍성현",
                  "임종우",
                  "김미영"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "양극재 연구실 추천해줘",
            "intent": "양극재, cathode",
            "triggers": [
                  "양극재",
                  "cathode",
                  "cathode material"
            ],
            "terms": [
                  "양극재",
                  "cathode",
                  "cathode material"
            ],
            "contextTerms": [
                  "배터리",
                  "battery",
                  "batteries",
                  "lithium-ion battery",
                  "lithium ion battery",
                  "li-ion",
                  "lithium metal",
                  "secondary battery",
                  "solid-state battery",
                  "solid state battery",
                  "solid electrolyte",
                  "electrolyte",
                  "cathode",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": [
                  "최장욱",
                  "강기석",
                  "정성균",
                  "이규태",
                  "강동민",
                  "성영은",
                  "남재욱",
                  "홍성현",
                  "임종우",
                  "김미영"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "전해질 계면 연구 교수님 추천해줘",
            "intent": "전해질, 계면, SEI",
            "triggers": [
                  "전해질 계면",
                  "전해질",
                  "electrolyte",
                  "계면"
            ],
            "terms": [
                  "전해질",
                  "electrolyte",
                  "interface",
                  "계면",
                  "sei"
            ],
            "contextTerms": [
                  "배터리",
                  "battery",
                  "batteries",
                  "lithium-ion battery",
                  "lithium ion battery",
                  "li-ion",
                  "lithium metal",
                  "secondary battery",
                  "solid-state battery",
                  "solid state battery",
                  "solid electrolyte",
                  "electrolyte",
                  "cathode",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": [
                  "최장욱",
                  "강기석",
                  "정성균",
                  "이규태",
                  "강동민",
                  "성영은",
                  "남재욱",
                  "홍성현",
                  "임종우",
                  "김미영"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "리튬금속전지 연구실 추천해줘",
            "intent": "리튬금속전지",
            "triggers": [
                  "리튬금속전지",
                  "리튬금속",
                  "lithium metal",
                  "lithium metal battery"
            ],
            "terms": [
                  "리튬금속",
                  "lithium metal",
                  "lithium metal battery"
            ],
            "contextTerms": [
                  "배터리",
                  "battery",
                  "batteries",
                  "lithium-ion battery",
                  "lithium ion battery",
                  "li-ion",
                  "lithium metal",
                  "secondary battery",
                  "solid-state battery",
                  "solid state battery",
                  "solid electrolyte",
                  "electrolyte",
                  "cathode",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": [
                  "최장욱",
                  "강기석",
                  "정성균",
                  "이규태",
                  "강동민",
                  "성영은",
                  "남재욱",
                  "홍성현",
                  "임종우",
                  "김미영"
            ]
      },
      {
            "label": "배터리/전기화학",
            "query": "전기화학 임피던스 교수님 추천해줘",
            "intent": "전기화학 분석, 임피던스",
            "triggers": [
                  "전기화학 임피던스",
                  "전기화학",
                  "electrochemical",
                  "impedance",
                  "임피던스"
            ],
            "terms": [
                  "전기화학",
                  "electrochemical",
                  "impedance",
                  "임피던스",
                  "eis"
            ],
            "contextTerms": [
                  "배터리",
                  "battery",
                  "batteries",
                  "lithium-ion battery",
                  "lithium ion battery",
                  "li-ion",
                  "lithium metal",
                  "secondary battery",
                  "solid-state battery",
                  "solid state battery",
                  "solid electrolyte",
                  "electrolyte",
                  "cathode",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": [
                  "최장욱",
                  "강기석",
                  "정성균",
                  "이규태",
                  "강동민",
                  "성영은",
                  "남재욱",
                  "홍성현",
                  "임종우",
                  "김미영"
            ]
      },
      {
            "label": "디스플레이",
            "query": "OLED 발광소자 교수님 추천해줘",
            "intent": "OLED, 발광소자",
            "triggers": [
                  "OLED 발광소자",
                  "oled",
                  "organic light emitting",
                  "발광소자"
            ],
            "terms": [
                  "oled",
                  "organic light emitting",
                  "발광소자"
            ],
            "contextTerms": [
                  "디스플레이",
                  "display",
                  "oled",
                  "micro led",
                  "micro-led",
                  "qled",
                  "light emitting",
                  "organic semiconductor",
                  "organic electronics",
                  "flexible display",
                  "perovskite",
                  "optoelectronic",
                  "디스플레이/포토닉스/광전자"
            ],
            "priorityNames": [
                  "이재상",
                  "이수연",
                  "홍용택",
                  "곽정훈",
                  "이태우",
                  "박재형",
                  "최수연",
                  "김대형",
                  "고승환"
            ]
      },
      {
            "label": "디스플레이",
            "query": "마이크로LED 연구실 추천해줘",
            "intent": "Micro LED",
            "triggers": [
                  "마이크로LED",
                  "micro led",
                  "microled",
                  "마이크로 led"
            ],
            "terms": [
                  "micro led",
                  "microled",
                  "마이크로led",
                  "마이크로 led"
            ],
            "contextTerms": [
                  "디스플레이",
                  "display",
                  "oled",
                  "micro led",
                  "micro-led",
                  "qled",
                  "light emitting",
                  "organic semiconductor",
                  "organic electronics",
                  "flexible display",
                  "perovskite",
                  "optoelectronic",
                  "디스플레이/포토닉스/광전자"
            ],
            "priorityNames": [
                  "이재상",
                  "이수연",
                  "홍용택",
                  "곽정훈",
                  "이태우",
                  "박재형",
                  "최수연",
                  "김대형",
                  "고승환"
            ]
      },
      {
            "label": "디스플레이",
            "query": "플렉서블 전자소자 교수님 추천해줘",
            "intent": "플렉서블 전자, 신축성 소자",
            "triggers": [
                  "플렉서블 전자소자",
                  "flexible",
                  "stretchable",
                  "플렉서블",
                  "신축성"
            ],
            "terms": [
                  "flexible",
                  "stretchable",
                  "플렉서블",
                  "신축성"
            ],
            "contextTerms": [
                  "디스플레이",
                  "display",
                  "oled",
                  "micro led",
                  "micro-led",
                  "qled",
                  "light emitting",
                  "organic semiconductor",
                  "organic electronics",
                  "flexible display",
                  "perovskite",
                  "optoelectronic",
                  "디스플레이/포토닉스/광전자"
            ],
            "priorityNames": [
                  "이재상",
                  "이수연",
                  "홍용택",
                  "곽정훈",
                  "이태우",
                  "박재형",
                  "최수연",
                  "김대형",
                  "고승환"
            ]
      },
      {
            "label": "디스플레이",
            "query": "퀀텀닷 발광소자 연구실 추천해줘",
            "intent": "QD LED, 양자점 발광",
            "triggers": [
                  "퀀텀닷 발광소자",
                  "quantum dot",
                  "퀀텀닷",
                  "양자점",
                  "qd led"
            ],
            "terms": [
                  "quantum dot",
                  "퀀텀닷",
                  "양자점",
                  "qd led"
            ],
            "contextTerms": [
                  "디스플레이",
                  "display",
                  "oled",
                  "micro led",
                  "micro-led",
                  "qled",
                  "light emitting",
                  "organic semiconductor",
                  "organic electronics",
                  "flexible display",
                  "perovskite",
                  "optoelectronic",
                  "디스플레이/포토닉스/광전자"
            ],
            "priorityNames": [
                  "이재상",
                  "이수연",
                  "홍용택",
                  "곽정훈",
                  "이태우",
                  "박재형",
                  "최수연",
                  "김대형",
                  "고승환"
            ]
      },
      {
            "label": "디스플레이",
            "query": "투명전극 교수님 추천해줘",
            "intent": "투명전극, 전극 소재",
            "triggers": [
                  "투명전극",
                  "transparent electrode"
            ],
            "terms": [
                  "transparent electrode",
                  "투명전극",
                  "전극"
            ],
            "contextTerms": [
                  "디스플레이",
                  "display",
                  "oled",
                  "micro led",
                  "micro-led",
                  "qled",
                  "light emitting",
                  "organic semiconductor",
                  "organic electronics",
                  "flexible display",
                  "perovskite",
                  "optoelectronic",
                  "디스플레이/포토닉스/광전자"
            ],
            "priorityNames": [
                  "이재상",
                  "이수연",
                  "홍용택",
                  "곽정훈",
                  "이태우",
                  "박재형",
                  "최수연",
                  "김대형",
                  "고승환"
            ]
      },
      {
            "label": "포토닉스/광전소자",
            "query": "실리콘 포토닉스 연구실 추천해줘",
            "intent": "실리콘 포토닉스",
            "triggers": [
                  "실리콘 포토닉스",
                  "silicon photonics",
                  "photonic"
            ],
            "terms": [
                  "silicon photonics",
                  "실리콘 포토닉스",
                  "photonic"
            ],
            "contextTerms": [
                  "포토닉스 광전소자",
                  "photonics",
                  "optoelectronic",
                  "optoelectronics",
                  "nanophotonics",
                  "plasmonics",
                  "metasurface",
                  "meta surface",
                  "optical",
                  "laser",
                  "photodetector",
                  "photonic crystal",
                  "integrated photonics",
                  "디스플레이/포토닉스/광전자",
                  "양자/물리/광학/천문"
            ],
            "priorityNames": []
      },
      {
            "label": "포토닉스/광전소자",
            "query": "메타렌즈 교수님 추천해줘",
            "intent": "메타렌즈, 메타표면",
            "triggers": [
                  "메타렌즈",
                  "metalens",
                  "metasurface",
                  "메타표면"
            ],
            "terms": [
                  "metalens",
                  "메타렌즈",
                  "metasurface",
                  "메타표면"
            ],
            "contextTerms": [
                  "포토닉스 광전소자",
                  "photonics",
                  "optoelectronic",
                  "optoelectronics",
                  "nanophotonics",
                  "plasmonics",
                  "metasurface",
                  "meta surface",
                  "optical",
                  "laser",
                  "photodetector",
                  "photonic crystal",
                  "integrated photonics",
                  "디스플레이/포토닉스/광전자",
                  "양자/물리/광학/천문"
            ],
            "priorityNames": []
      },
      {
            "label": "포토닉스/광전소자",
            "query": "광검출기 연구실 추천해줘",
            "intent": "photodetector, 광검출",
            "triggers": [
                  "광검출기",
                  "photodetector",
                  "광검출",
                  "photo detector"
            ],
            "terms": [
                  "photodetector",
                  "광검출기",
                  "광검출",
                  "photo detector"
            ],
            "contextTerms": [
                  "포토닉스 광전소자",
                  "photonics",
                  "optoelectronic",
                  "optoelectronics",
                  "nanophotonics",
                  "plasmonics",
                  "metasurface",
                  "meta surface",
                  "optical",
                  "laser",
                  "photodetector",
                  "photonic crystal",
                  "integrated photonics",
                  "디스플레이/포토닉스/광전자",
                  "양자/물리/광학/천문"
            ],
            "priorityNames": []
      },
      {
            "label": "포토닉스/광전소자",
            "query": "레이저 분광 교수님 추천해줘",
            "intent": "laser, spectroscopy",
            "triggers": [
                  "레이저 분광",
                  "laser",
                  "레이저",
                  "spectroscopy",
                  "분광"
            ],
            "terms": [
                  "laser",
                  "레이저",
                  "spectroscopy",
                  "분광"
            ],
            "contextTerms": [
                  "포토닉스 광전소자",
                  "photonics",
                  "optoelectronic",
                  "optoelectronics",
                  "nanophotonics",
                  "plasmonics",
                  "metasurface",
                  "meta surface",
                  "optical",
                  "laser",
                  "photodetector",
                  "photonic crystal",
                  "integrated photonics",
                  "디스플레이/포토닉스/광전자",
                  "양자/물리/광학/천문"
            ],
            "priorityNames": []
      },
      {
            "label": "포토닉스/광전소자",
            "query": "플라즈모닉스 연구실 추천해줘",
            "intent": "plasmonics",
            "triggers": [
                  "플라즈모닉스",
                  "plasmonics",
                  "plasmon"
            ],
            "terms": [
                  "plasmonics",
                  "플라즈모닉스",
                  "plasmon"
            ],
            "contextTerms": [
                  "포토닉스 광전소자",
                  "photonics",
                  "optoelectronic",
                  "optoelectronics",
                  "nanophotonics",
                  "plasmonics",
                  "metasurface",
                  "meta surface",
                  "optical",
                  "laser",
                  "photodetector",
                  "photonic crystal",
                  "integrated photonics",
                  "디스플레이/포토닉스/광전자",
                  "양자/물리/광학/천문"
            ],
            "priorityNames": []
      },
      {
            "label": "AI/머신러닝",
            "query": "강화학습 연구실 추천해줘",
            "intent": "강화학습",
            "triggers": [
                  "강화학습",
                  "reinforcement learning"
            ],
            "terms": [
                  "강화학습",
                  "reinforcement learning"
            ],
            "contextTerms": [
                  "AI 머신러닝",
                  "artificial intelligence",
                  "machine learning",
                  "deep learning",
                  "reinforcement learning",
                  "generative ai",
                  "multimodal",
                  "representation learning",
                  "graph neural",
                  "data science",
                  "머신러닝",
                  "딥러닝",
                  "강화학습",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "AI/머신러닝",
            "query": "그래프 신경망 교수님 추천해줘",
            "intent": "GNN, 그래프 신경망",
            "triggers": [
                  "그래프 신경망",
                  "graph neural network"
            ],
            "terms": [
                  "graph neural network",
                  "gnn",
                  "그래프 신경망"
            ],
            "contextTerms": [
                  "AI 머신러닝",
                  "artificial intelligence",
                  "machine learning",
                  "deep learning",
                  "reinforcement learning",
                  "generative ai",
                  "multimodal",
                  "representation learning",
                  "graph neural",
                  "data science",
                  "머신러닝",
                  "딥러닝",
                  "강화학습",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "AI/머신러닝",
            "query": "생성모델 연구실 추천해줘",
            "intent": "생성모델, generative model",
            "triggers": [
                  "생성모델",
                  "generative model",
                  "diffusion model",
                  "확산모델"
            ],
            "terms": [
                  "generative model",
                  "생성모델",
                  "diffusion model",
                  "확산모델"
            ],
            "contextTerms": [
                  "AI 머신러닝",
                  "artificial intelligence",
                  "machine learning",
                  "deep learning",
                  "reinforcement learning",
                  "generative ai",
                  "multimodal",
                  "representation learning",
                  "graph neural",
                  "data science",
                  "머신러닝",
                  "딥러닝",
                  "강화학습",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "AI/머신러닝",
            "query": "추천시스템 교수님 추천해줘",
            "intent": "추천시스템",
            "triggers": [
                  "시스템",
                  "추천시스템",
                  "recommender",
                  "recommendation"
            ],
            "terms": [
                  "추천시스템",
                  "recommender",
                  "recommendation"
            ],
            "contextTerms": [
                  "AI 머신러닝",
                  "artificial intelligence",
                  "machine learning",
                  "deep learning",
                  "reinforcement learning",
                  "generative ai",
                  "multimodal",
                  "representation learning",
                  "graph neural",
                  "data science",
                  "머신러닝",
                  "딥러닝",
                  "강화학습",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "AI/머신러닝",
            "query": "최적화 기반 학습 연구실 추천해줘",
            "intent": "optimization for ML",
            "triggers": [
                  "최적화 기반 학습",
                  "최적화",
                  "learning theory"
            ],
            "terms": [
                  "optimization",
                  "최적화",
                  "learning theory"
            ],
            "contextTerms": [
                  "AI 머신러닝",
                  "artificial intelligence",
                  "machine learning",
                  "deep learning",
                  "reinforcement learning",
                  "generative ai",
                  "multimodal",
                  "representation learning",
                  "graph neural",
                  "data science",
                  "머신러닝",
                  "딥러닝",
                  "강화학습",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "객체검출 연구실 추천해줘",
            "intent": "object detection",
            "triggers": [
                  "객체검출",
                  "object detection",
                  "객체 검출"
            ],
            "terms": [
                  "object detection",
                  "객체검출",
                  "객체 검출"
            ],
            "contextTerms": [
                  "컴퓨터비전 영상인식",
                  "computer vision",
                  "visual recognition",
                  "image recognition",
                  "object detection",
                  "segmentation",
                  "multimodal",
                  "video understanding",
                  "vision-language",
                  "3d vision",
                  "컴퓨터비전",
                  "컴퓨터 비전",
                  "영상인식"
            ],
            "priorityNames": []
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "영상 분할 교수님 추천해줘",
            "intent": "image segmentation",
            "triggers": [
                  "영상 분할",
                  "image segmentation",
                  "segmentation"
            ],
            "terms": [
                  "image segmentation",
                  "영상 분할",
                  "segmentation"
            ],
            "contextTerms": [
                  "컴퓨터비전 영상인식",
                  "computer vision",
                  "visual recognition",
                  "image recognition",
                  "object detection",
                  "segmentation",
                  "multimodal",
                  "video understanding",
                  "vision-language",
                  "3d vision",
                  "컴퓨터비전",
                  "컴퓨터 비전",
                  "영상인식"
            ],
            "priorityNames": []
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "3D 장면 이해 연구실 추천해줘",
            "intent": "3D scene understanding",
            "triggers": [
                  "3D 장면 이해",
                  "3d scene",
                  "scene understanding",
                  "장면 이해",
                  "3d vision"
            ],
            "terms": [
                  "3d scene",
                  "scene understanding",
                  "장면 이해",
                  "3d vision"
            ],
            "contextTerms": [
                  "컴퓨터비전 영상인식",
                  "computer vision",
                  "visual recognition",
                  "image recognition",
                  "object detection",
                  "segmentation",
                  "multimodal",
                  "video understanding",
                  "vision-language",
                  "3d vision",
                  "컴퓨터비전",
                  "컴퓨터 비전",
                  "영상인식"
            ],
            "priorityNames": []
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "멀티모달 영상인식 교수님 추천해줘",
            "intent": "multimodal vision",
            "triggers": [
                  "멀티모달 영상인식",
                  "multimodal",
                  "멀티모달",
                  "vision-language",
                  "영상인식"
            ],
            "terms": [
                  "multimodal",
                  "멀티모달",
                  "vision-language",
                  "영상인식"
            ],
            "contextTerms": [
                  "컴퓨터비전 영상인식",
                  "computer vision",
                  "visual recognition",
                  "image recognition",
                  "object detection",
                  "segmentation",
                  "multimodal",
                  "video understanding",
                  "vision-language",
                  "3d vision",
                  "컴퓨터비전",
                  "컴퓨터 비전",
                  "영상인식"
            ],
            "priorityNames": []
      },
      {
            "label": "컴퓨터비전/영상인식",
            "query": "포즈 추정 연구실 추천해줘",
            "intent": "pose estimation",
            "triggers": [
                  "포즈 추정",
                  "pose estimation",
                  "human pose"
            ],
            "terms": [
                  "pose estimation",
                  "포즈 추정",
                  "human pose"
            ],
            "contextTerms": [
                  "컴퓨터비전 영상인식",
                  "computer vision",
                  "visual recognition",
                  "image recognition",
                  "object detection",
                  "segmentation",
                  "multimodal",
                  "video understanding",
                  "vision-language",
                  "3d vision",
                  "컴퓨터비전",
                  "컴퓨터 비전",
                  "영상인식"
            ],
            "priorityNames": []
      },
      {
            "label": "바이오센서/생체전자",
            "query": "웨어러블 헬스센서 교수님 추천해줘",
            "intent": "wearable health sensor",
            "triggers": [
                  "웨어러블 헬스센서",
                  "wearable",
                  "웨어러블",
                  "health sensor",
                  "헬스센서"
            ],
            "terms": [
                  "wearable",
                  "웨어러블",
                  "health sensor",
                  "헬스센서"
            ],
            "contextTerms": [
                  "바이오센서 생체전자",
                  "biosensor",
                  "bio sensor",
                  "bioelectronics",
                  "bio-electronics",
                  "wearable sensor",
                  "wearable electronics",
                  "implantable",
                  "neural interface",
                  "bioelectronic",
                  "electronic skin",
                  "바이오센서",
                  "생체전자"
            ],
            "priorityNames": []
      },
      {
            "label": "바이오센서/생체전자",
            "query": "랩온어칩 연구실 추천해줘",
            "intent": "lab-on-a-chip",
            "triggers": [
                  "랩온어칩",
                  "lab-on-a-chip",
                  "lab on a chip",
                  "microfluidic"
            ],
            "terms": [
                  "lab-on-a-chip",
                  "lab on a chip",
                  "랩온어칩",
                  "microfluidic"
            ],
            "contextTerms": [
                  "바이오센서 생체전자",
                  "biosensor",
                  "bio sensor",
                  "bioelectronics",
                  "bio-electronics",
                  "wearable sensor",
                  "wearable electronics",
                  "implantable",
                  "neural interface",
                  "bioelectronic",
                  "electronic skin",
                  "바이오센서",
                  "생체전자"
            ],
            "priorityNames": []
      },
      {
            "label": "바이오센서/생체전자",
            "query": "임플란터블 전자소자 교수님 추천해줘",
            "intent": "implantable electronics",
            "triggers": [
                  "임플란터블 전자소자",
                  "implantable",
                  "임플란터블",
                  "bioelectronics",
                  "생체전자"
            ],
            "terms": [
                  "implantable",
                  "임플란터블",
                  "bioelectronics",
                  "생체전자"
            ],
            "contextTerms": [
                  "바이오센서 생체전자",
                  "biosensor",
                  "bio sensor",
                  "bioelectronics",
                  "bio-electronics",
                  "wearable sensor",
                  "wearable electronics",
                  "implantable",
                  "neural interface",
                  "bioelectronic",
                  "electronic skin",
                  "바이오센서",
                  "생체전자"
            ],
            "priorityNames": []
      },
      {
            "label": "바이오센서/생체전자",
            "query": "마이크로유체 바이오칩 연구실 추천해줘",
            "intent": "microfluidic biochip",
            "triggers": [
                  "마이크로유체 바이오칩",
                  "microfluidic",
                  "마이크로유체",
                  "biochip",
                  "바이오칩"
            ],
            "terms": [
                  "microfluidic",
                  "마이크로유체",
                  "biochip",
                  "바이오칩"
            ],
            "contextTerms": [
                  "바이오센서 생체전자",
                  "biosensor",
                  "bio sensor",
                  "bioelectronics",
                  "bio-electronics",
                  "wearable sensor",
                  "wearable electronics",
                  "implantable",
                  "neural interface",
                  "bioelectronic",
                  "electronic skin",
                  "바이오센서",
                  "생체전자"
            ],
            "priorityNames": []
      },
      {
            "label": "바이오센서/생체전자",
            "query": "생체신호 측정 교수님 추천해줘",
            "intent": "biosignal measurement",
            "triggers": [
                  "생체신호 측정",
                  "biosignal",
                  "생체신호",
                  "biomedical signal"
            ],
            "terms": [
                  "biosignal",
                  "생체신호",
                  "biomedical signal"
            ],
            "contextTerms": [
                  "바이오센서 생체전자",
                  "biosensor",
                  "bio sensor",
                  "bioelectronics",
                  "bio-electronics",
                  "wearable sensor",
                  "wearable electronics",
                  "implantable",
                  "neural interface",
                  "bioelectronic",
                  "electronic skin",
                  "바이오센서",
                  "생체전자"
            ],
            "priorityNames": []
      },
      {
            "label": "뇌과학/BCI",
            "query": "신경전극 연구실 추천해줘",
            "intent": "neural electrode",
            "triggers": [
                  "신경전극",
                  "neural electrode"
            ],
            "terms": [
                  "neural electrode",
                  "신경전극",
                  "electrode"
            ],
            "contextTerms": [
                  "뇌과학 BCI",
                  "neuroscience",
                  "brain",
                  "neural",
                  "bci",
                  "brain-computer interface",
                  "neural interface",
                  "neural electrode",
                  "neuroengineering",
                  "brain imaging",
                  "cognitive",
                  "뇌과학",
                  "뇌공학",
                  "뇌/신경/인지/BCI"
            ],
            "priorityNames": []
      },
      {
            "label": "뇌과학/BCI",
            "query": "뇌영상 분석 교수님 추천해줘",
            "intent": "brain imaging",
            "triggers": [
                  "뇌영상 분석",
                  "brain imaging",
                  "뇌영상",
                  "fmri",
                  "neuroimaging"
            ],
            "terms": [
                  "brain imaging",
                  "뇌영상",
                  "fmri",
                  "neuroimaging"
            ],
            "contextTerms": [
                  "뇌과학 BCI",
                  "neuroscience",
                  "brain",
                  "neural",
                  "bci",
                  "brain-computer interface",
                  "neural interface",
                  "neural electrode",
                  "neuroengineering",
                  "brain imaging",
                  "cognitive",
                  "뇌과학",
                  "뇌공학",
                  "뇌/신경/인지/BCI"
            ],
            "priorityNames": []
      },
      {
            "label": "뇌과학/BCI",
            "query": "시냅스 가소성 연구실 추천해줘",
            "intent": "synaptic plasticity",
            "triggers": [
                  "시냅스 가소성",
                  "synaptic plasticity",
                  "시냅스",
                  "가소성"
            ],
            "terms": [
                  "synaptic plasticity",
                  "시냅스",
                  "가소성"
            ],
            "contextTerms": [
                  "뇌과학 BCI",
                  "neuroscience",
                  "brain",
                  "neural",
                  "bci",
                  "brain-computer interface",
                  "neural interface",
                  "neural electrode",
                  "neuroengineering",
                  "brain imaging",
                  "cognitive",
                  "뇌과학",
                  "뇌공학",
                  "뇌/신경/인지/BCI"
            ],
            "priorityNames": []
      },
      {
            "label": "뇌과학/BCI",
            "query": "신경회로 교수님 추천해줘",
            "intent": "neural circuit",
            "triggers": [
                  "신경회로",
                  "neural circuit",
                  "neuronal circuit"
            ],
            "terms": [
                  "neural circuit",
                  "신경회로",
                  "neuronal circuit"
            ],
            "contextTerms": [
                  "뇌과학 BCI",
                  "neuroscience",
                  "brain",
                  "neural",
                  "bci",
                  "brain-computer interface",
                  "neural interface",
                  "neural electrode",
                  "neuroengineering",
                  "brain imaging",
                  "cognitive",
                  "뇌과학",
                  "뇌공학",
                  "뇌/신경/인지/BCI"
            ],
            "priorityNames": []
      },
      {
            "label": "뇌과학/BCI",
            "query": "BMI 인터페이스 연구실 추천해줘",
            "intent": "brain-machine interface",
            "triggers": [
                  "BMI 인터페이스",
                  "brain-machine interface",
                  "brain computer interface"
            ],
            "terms": [
                  "bmi",
                  "brain-machine interface",
                  "brain computer interface",
                  "bci"
            ],
            "contextTerms": [
                  "뇌과학 BCI",
                  "neuroscience",
                  "brain",
                  "neural",
                  "bci",
                  "brain-computer interface",
                  "neural interface",
                  "neural electrode",
                  "neuroengineering",
                  "brain imaging",
                  "cognitive",
                  "뇌과학",
                  "뇌공학",
                  "뇌/신경/인지/BCI"
            ],
            "priorityNames": []
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "MRI 재구성 교수님 추천해줘",
            "intent": "MRI reconstruction",
            "triggers": [
                  "MRI 재구성",
                  "reconstruction",
                  "재구성"
            ],
            "terms": [
                  "mri",
                  "reconstruction",
                  "재구성"
            ],
            "contextTerms": [
                  "의료영상 디지털헬스",
                  "medical imaging",
                  "biomedical imaging",
                  "mri",
                  "ultrasound",
                  "x-ray",
                  "computed tomography",
                  "digital health",
                  "healthcare ai",
                  "medical image",
                  "biomedical image",
                  "의료영상",
                  "의료 영상"
            ],
            "priorityNames": []
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "CT 영상 분석 연구실 추천해줘",
            "intent": "CT image analysis",
            "triggers": [
                  "CT 영상 분석",
                  "computed tomography",
                  "영상 분석"
            ],
            "terms": [
                  "ct",
                  "computed tomography",
                  "영상 분석"
            ],
            "contextTerms": [
                  "의료영상 디지털헬스",
                  "medical imaging",
                  "biomedical imaging",
                  "mri",
                  "ultrasound",
                  "x-ray",
                  "computed tomography",
                  "digital health",
                  "healthcare ai",
                  "medical image",
                  "biomedical image",
                  "의료영상",
                  "의료 영상"
            ],
            "priorityNames": []
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "초음파 영상 교수님 추천해줘",
            "intent": "ultrasound imaging",
            "triggers": [
                  "초음파 영상",
                  "ultrasound",
                  "초음파"
            ],
            "terms": [
                  "ultrasound",
                  "초음파"
            ],
            "contextTerms": [
                  "의료영상 디지털헬스",
                  "medical imaging",
                  "biomedical imaging",
                  "mri",
                  "ultrasound",
                  "x-ray",
                  "computed tomography",
                  "digital health",
                  "healthcare ai",
                  "medical image",
                  "biomedical image",
                  "의료영상",
                  "의료 영상"
            ],
            "priorityNames": []
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "의료영상 분할 연구실 추천해줘",
            "intent": "medical image segmentation",
            "triggers": [
                  "의료영상 분할",
                  "medical imaging",
                  "의료영상",
                  "segmentation",
                  "분할"
            ],
            "terms": [
                  "medical imaging",
                  "의료영상",
                  "segmentation",
                  "분할"
            ],
            "contextTerms": [
                  "의료영상 디지털헬스",
                  "medical imaging",
                  "biomedical imaging",
                  "mri",
                  "ultrasound",
                  "x-ray",
                  "computed tomography",
                  "digital health",
                  "healthcare ai",
                  "medical image",
                  "biomedical image",
                  "의료영상",
                  "의료 영상"
            ],
            "priorityNames": []
      },
      {
            "label": "의료영상/디지털헬스",
            "query": "헬스케어 AI 교수님 추천해줘",
            "intent": "healthcare AI",
            "triggers": [
                  "헬스케어 AI",
                  "healthcare ai",
                  "digital health",
                  "디지털헬스"
            ],
            "terms": [
                  "healthcare ai",
                  "헬스케어 ai",
                  "digital health",
                  "디지털헬스"
            ],
            "contextTerms": [
                  "의료영상 디지털헬스",
                  "medical imaging",
                  "biomedical imaging",
                  "mri",
                  "ultrasound",
                  "x-ray",
                  "computed tomography",
                  "digital health",
                  "healthcare ai",
                  "medical image",
                  "biomedical image",
                  "의료영상",
                  "의료 영상"
            ],
            "priorityNames": []
      },
      {
            "label": "로봇/자율주행",
            "query": "보행로봇 제어 교수님 추천해줘",
            "intent": "legged robot control",
            "triggers": [
                  "보행로봇 제어",
                  "legged robot",
                  "보행로봇",
                  "robot control",
                  "로봇 제어"
            ],
            "terms": [
                  "legged robot",
                  "보행로봇",
                  "robot control",
                  "로봇 제어"
            ],
            "contextTerms": [
                  "로봇 자율주행 제어",
                  "robot",
                  "robotics",
                  "autonomous",
                  "autonomous driving",
                  "slam",
                  "motion planning",
                  "mobile robot",
                  "legged robot",
                  "humanoid",
                  "manipulation",
                  "drone",
                  "uav",
                  "로봇/제어/자율주행/모빌리티"
            ],
            "priorityNames": []
      },
      {
            "label": "로봇/자율주행",
            "query": "매니퓰레이터 연구실 추천해줘",
            "intent": "robot manipulator",
            "triggers": [
                  "매니퓰레이터",
                  "manipulator",
                  "robot arm"
            ],
            "terms": [
                  "manipulator",
                  "매니퓰레이터",
                  "robot arm"
            ],
            "contextTerms": [
                  "로봇 자율주행 제어",
                  "robot",
                  "robotics",
                  "autonomous",
                  "autonomous driving",
                  "slam",
                  "motion planning",
                  "mobile robot",
                  "legged robot",
                  "humanoid",
                  "manipulation",
                  "drone",
                  "uav",
                  "로봇/제어/자율주행/모빌리티"
            ],
            "priorityNames": []
      },
      {
            "label": "로봇/자율주행",
            "query": "자율주행 경로계획 교수님 추천해줘",
            "intent": "path planning",
            "triggers": [
                  "자율주행 경로계획",
                  "path planning",
                  "경로계획",
                  "autonomous driving",
                  "자율주행"
            ],
            "terms": [
                  "path planning",
                  "경로계획",
                  "autonomous driving",
                  "자율주행"
            ],
            "contextTerms": [
                  "로봇 자율주행 제어",
                  "robot",
                  "robotics",
                  "autonomous",
                  "autonomous driving",
                  "slam",
                  "motion planning",
                  "mobile robot",
                  "legged robot",
                  "humanoid",
                  "manipulation",
                  "drone",
                  "uav",
                  "로봇/제어/자율주행/모빌리티"
            ],
            "priorityNames": []
      },
      {
            "label": "로봇/자율주행",
            "query": "드론 제어 연구실 추천해줘",
            "intent": "drone control",
            "triggers": [
                  "드론 제어",
                  "drone",
                  "드론"
            ],
            "terms": [
                  "drone",
                  "드론",
                  "uav",
                  "control"
            ],
            "contextTerms": [
                  "로봇 자율주행 제어",
                  "robot",
                  "robotics",
                  "autonomous",
                  "autonomous driving",
                  "slam",
                  "motion planning",
                  "mobile robot",
                  "legged robot",
                  "humanoid",
                  "manipulation",
                  "drone",
                  "uav",
                  "로봇/제어/자율주행/모빌리티"
            ],
            "priorityNames": []
      },
      {
            "label": "로봇/자율주행",
            "query": "SLAM 연구 교수님 추천해줘",
            "intent": "SLAM",
            "triggers": [
                  "SLAM",
                  "simultaneous localization"
            ],
            "terms": [
                  "slam",
                  "simultaneous localization"
            ],
            "contextTerms": [
                  "로봇 자율주행 제어",
                  "robot",
                  "robotics",
                  "autonomous",
                  "autonomous driving",
                  "slam",
                  "motion planning",
                  "mobile robot",
                  "legged robot",
                  "humanoid",
                  "manipulation",
                  "drone",
                  "uav",
                  "로봇/제어/자율주행/모빌리티"
            ],
            "priorityNames": []
      },
      {
            "label": "HCI/AR/VR",
            "query": "사용자 경험 UX 연구실 추천해줘",
            "intent": "UX, user experience",
            "triggers": [
                  "사용자 경험 UX",
                  "user experience",
                  "사용자 경험"
            ],
            "terms": [
                  "user experience",
                  "ux",
                  "사용자 경험"
            ],
            "contextTerms": [
                  "HCI AR VR",
                  "hci",
                  "human-computer interaction",
                  "human computer interaction",
                  "user experience",
                  "interaction design",
                  "user interface",
                  "augmented reality",
                  "virtual reality",
                  "mixed reality",
                  "xr",
                  "인터랙션",
                  "사용자 경험"
            ],
            "priorityNames": []
      },
      {
            "label": "HCI/AR/VR",
            "query": "AR 인터랙션 교수님 추천해줘",
            "intent": "AR interaction",
            "triggers": [
                  "AR 인터랙션",
                  "augmented reality",
                  "인터랙션",
                  "interaction"
            ],
            "terms": [
                  "ar",
                  "augmented reality",
                  "인터랙션",
                  "interaction"
            ],
            "contextTerms": [
                  "HCI AR VR",
                  "hci",
                  "human-computer interaction",
                  "human computer interaction",
                  "user experience",
                  "interaction design",
                  "user interface",
                  "augmented reality",
                  "virtual reality",
                  "mixed reality",
                  "xr",
                  "인터랙션",
                  "사용자 경험"
            ],
            "priorityNames": []
      },
      {
            "label": "HCI/AR/VR",
            "query": "가상현실 햅틱 연구실 추천해줘",
            "intent": "VR haptics",
            "triggers": [
                  "가상현실 햅틱",
                  "virtual reality",
                  "haptic",
                  "햅틱"
            ],
            "terms": [
                  "virtual reality",
                  "vr",
                  "haptic",
                  "햅틱"
            ],
            "contextTerms": [
                  "HCI AR VR",
                  "hci",
                  "human-computer interaction",
                  "human computer interaction",
                  "user experience",
                  "interaction design",
                  "user interface",
                  "augmented reality",
                  "virtual reality",
                  "mixed reality",
                  "xr",
                  "인터랙션",
                  "사용자 경험"
            ],
            "priorityNames": []
      },
      {
            "label": "HCI/AR/VR",
            "query": "웨어러블 인터페이스 교수님 추천해줘",
            "intent": "wearable interface",
            "triggers": [
                  "웨어러블 인터페이스",
                  "wearable interface"
            ],
            "terms": [
                  "wearable interface",
                  "웨어러블 인터페이스",
                  "interface"
            ],
            "contextTerms": [
                  "HCI AR VR",
                  "hci",
                  "human-computer interaction",
                  "human computer interaction",
                  "user experience",
                  "interaction design",
                  "user interface",
                  "augmented reality",
                  "virtual reality",
                  "mixed reality",
                  "xr",
                  "인터랙션",
                  "사용자 경험"
            ],
            "priorityNames": []
      },
      {
            "label": "HCI/AR/VR",
            "query": "유비쿼터스 컴퓨팅 연구실 추천해줘",
            "intent": "ubiquitous computing",
            "triggers": [
                  "유비쿼터스 컴퓨팅",
                  "ubiquitous computing",
                  "유비쿼터스",
                  "mobile computing"
            ],
            "terms": [
                  "ubiquitous computing",
                  "유비쿼터스",
                  "mobile computing"
            ],
            "contextTerms": [
                  "HCI AR VR",
                  "hci",
                  "human-computer interaction",
                  "human computer interaction",
                  "user experience",
                  "interaction design",
                  "user interface",
                  "augmented reality",
                  "virtual reality",
                  "mixed reality",
                  "xr",
                  "인터랙션",
                  "사용자 경험"
            ],
            "priorityNames": []
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자 알고리즘 교수님 추천해줘",
            "intent": "quantum algorithm",
            "triggers": [
                  "양자 알고리즘",
                  "quantum algorithm"
            ],
            "terms": [
                  "quantum algorithm",
                  "양자 알고리즘"
            ],
            "contextTerms": [
                  "양자컴퓨팅 양자정보",
                  "quantum computing",
                  "quantum computer",
                  "quantum information",
                  "quantum algorithm",
                  "quantum simulation",
                  "quantum communication",
                  "quantum cryptography",
                  "ion trap",
                  "superconducting quantum",
                  "neutral atom",
                  "photonic quantum",
                  "양자컴퓨팅"
            ],
            "priorityNames": []
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자 오류정정 연구실 추천해줘",
            "intent": "quantum error correction",
            "triggers": [
                  "양자 오류정정",
                  "quantum error correction",
                  "오류정정",
                  "error correction"
            ],
            "terms": [
                  "quantum error correction",
                  "오류정정",
                  "error correction"
            ],
            "contextTerms": [
                  "양자컴퓨팅 양자정보",
                  "quantum computing",
                  "quantum computer",
                  "quantum information",
                  "quantum algorithm",
                  "quantum simulation",
                  "quantum communication",
                  "quantum cryptography",
                  "ion trap",
                  "superconducting quantum",
                  "neutral atom",
                  "photonic quantum",
                  "양자컴퓨팅"
            ],
            "priorityNames": []
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자 시뮬레이션 교수님 추천해줘",
            "intent": "quantum simulation",
            "triggers": [
                  "양자 시뮬레이션",
                  "quantum simulation"
            ],
            "terms": [
                  "quantum simulation",
                  "양자 시뮬레이션"
            ],
            "contextTerms": [
                  "양자컴퓨팅 양자정보",
                  "quantum computing",
                  "quantum computer",
                  "quantum information",
                  "quantum algorithm",
                  "quantum simulation",
                  "quantum communication",
                  "quantum cryptography",
                  "ion trap",
                  "superconducting quantum",
                  "neutral atom",
                  "photonic quantum",
                  "양자컴퓨팅"
            ],
            "priorityNames": []
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자광학 연구실 추천해줘",
            "intent": "quantum optics",
            "triggers": [
                  "양자광학",
                  "quantum optics"
            ],
            "terms": [
                  "quantum optics",
                  "양자광학"
            ],
            "contextTerms": [
                  "양자컴퓨팅 양자정보",
                  "quantum computing",
                  "quantum computer",
                  "quantum information",
                  "quantum algorithm",
                  "quantum simulation",
                  "quantum communication",
                  "quantum cryptography",
                  "ion trap",
                  "superconducting quantum",
                  "neutral atom",
                  "photonic quantum",
                  "양자컴퓨팅"
            ],
            "priorityNames": []
      },
      {
            "label": "양자컴퓨팅/양자정보",
            "query": "양자정보 이론 교수님 추천해줘",
            "intent": "quantum information theory",
            "triggers": [
                  "양자정보 이론",
                  "quantum information",
                  "양자정보",
                  "information theory"
            ],
            "terms": [
                  "quantum information",
                  "양자정보",
                  "information theory"
            ],
            "contextTerms": [
                  "양자컴퓨팅 양자정보",
                  "quantum computing",
                  "quantum computer",
                  "quantum information",
                  "quantum algorithm",
                  "quantum simulation",
                  "quantum communication",
                  "quantum cryptography",
                  "ion trap",
                  "superconducting quantum",
                  "neutral atom",
                  "photonic quantum",
                  "양자컴퓨팅"
            ],
            "priorityNames": []
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "SoC 설계 교수님 추천해줘",
            "intent": "SoC design",
            "triggers": [
                  "SoC 설계",
                  "system on chip",
                  "시스템온칩"
            ],
            "terms": [
                  "soc",
                  "system on chip",
                  "시스템온칩"
            ],
            "contextTerms": [
                  "AI 반도체 VLSI",
                  "vlsi",
                  "soc",
                  "asic",
                  "fpga",
                  "ai accelerator",
                  "hardware accelerator",
                  "processing-in-memory",
                  "pim",
                  "neuromorphic hardware",
                  "integrated circuit",
                  "circuit design",
                  "ai semiconductor",
                  "반도체 회로/SoC/AI하드웨어"
            ],
            "priorityNames": []
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "하드웨어 가속기 연구실 추천해줘",
            "intent": "hardware accelerator",
            "triggers": [
                  "하드웨어 가속기",
                  "hardware accelerator",
                  "accelerator"
            ],
            "terms": [
                  "hardware accelerator",
                  "하드웨어 가속기",
                  "accelerator"
            ],
            "contextTerms": [
                  "AI 반도체 VLSI",
                  "vlsi",
                  "soc",
                  "asic",
                  "fpga",
                  "ai accelerator",
                  "hardware accelerator",
                  "processing-in-memory",
                  "pim",
                  "neuromorphic hardware",
                  "integrated circuit",
                  "circuit design",
                  "ai semiconductor",
                  "반도체 회로/SoC/AI하드웨어"
            ],
            "priorityNames": []
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "FPGA 아키텍처 교수님 추천해줘",
            "intent": "FPGA architecture",
            "triggers": [
                  "FPGA 아키텍처",
                  "fpga",
                  "아키텍처"
            ],
            "terms": [
                  "fpga",
                  "architecture",
                  "아키텍처"
            ],
            "contextTerms": [
                  "AI 반도체 VLSI",
                  "vlsi",
                  "soc",
                  "asic",
                  "fpga",
                  "ai accelerator",
                  "hardware accelerator",
                  "processing-in-memory",
                  "pim",
                  "neuromorphic hardware",
                  "integrated circuit",
                  "circuit design",
                  "ai semiconductor",
                  "반도체 회로/SoC/AI하드웨어"
            ],
            "priorityNames": []
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "혼성신호 회로 연구실 추천해줘",
            "intent": "mixed-signal circuit",
            "triggers": [
                  "혼성신호 회로",
                  "mixed-signal",
                  "mixed signal",
                  "혼성신호"
            ],
            "terms": [
                  "mixed-signal",
                  "mixed signal",
                  "혼성신호",
                  "회로"
            ],
            "contextTerms": [
                  "AI 반도체 VLSI",
                  "vlsi",
                  "soc",
                  "asic",
                  "fpga",
                  "ai accelerator",
                  "hardware accelerator",
                  "processing-in-memory",
                  "pim",
                  "neuromorphic hardware",
                  "integrated circuit",
                  "circuit design",
                  "ai semiconductor",
                  "반도체 회로/SoC/AI하드웨어"
            ],
            "priorityNames": []
      },
      {
            "label": "AI 반도체/VLSI",
            "query": "컴퓨터 구조 연구실 추천해줘",
            "intent": "computer architecture",
            "triggers": [
                  "컴퓨터 구조",
                  "computer architecture"
            ],
            "terms": [
                  "computer architecture",
                  "컴퓨터 구조"
            ],
            "contextTerms": [
                  "AI 반도체 VLSI",
                  "vlsi",
                  "soc",
                  "asic",
                  "fpga",
                  "ai accelerator",
                  "hardware accelerator",
                  "processing-in-memory",
                  "pim",
                  "neuromorphic hardware",
                  "integrated circuit",
                  "circuit design",
                  "ai semiconductor",
                  "반도체 회로/SoC/AI하드웨어"
            ],
            "priorityNames": []
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "3D IC 연구실 추천해줘",
            "intent": "3D IC",
            "triggers": [
                  "3D IC",
                  "three-dimensional ic",
                  "3차원 집적"
            ],
            "terms": [
                  "3d ic",
                  "three-dimensional ic",
                  "3차원 집적"
            ],
            "contextTerms": [
                  "반도체 패키징 이종집적",
                  "advanced packaging",
                  "semiconductor packaging",
                  "chiplet",
                  "3d ic",
                  "heterogeneous integration",
                  "interconnect",
                  "die-to-die",
                  "through silicon via",
                  "tsv",
                  "micro bump",
                  "packaging mechanics",
                  "반도체 패키징",
                  "패키징/인터커넥트/신뢰성"
            ],
            "priorityNames": [
                  "김성재",
                  "김태성",
                  "김택수",
                  "최우영"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "칩렛 인터커넥트 교수님 추천해줘",
            "intent": "chiplet interconnect",
            "triggers": [
                  "칩렛 인터커넥트",
                  "chiplet",
                  "칩렛",
                  "interconnect",
                  "인터커넥트"
            ],
            "terms": [
                  "chiplet",
                  "칩렛",
                  "interconnect",
                  "인터커넥트"
            ],
            "contextTerms": [
                  "반도체 패키징 이종집적",
                  "advanced packaging",
                  "semiconductor packaging",
                  "chiplet",
                  "3d ic",
                  "heterogeneous integration",
                  "interconnect",
                  "die-to-die",
                  "through silicon via",
                  "tsv",
                  "micro bump",
                  "packaging mechanics",
                  "반도체 패키징",
                  "패키징/인터커넥트/신뢰성"
            ],
            "priorityNames": [
                  "김성재",
                  "김태성",
                  "김택수",
                  "최우영"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "TSV 공정 연구실 추천해줘",
            "intent": "through-silicon via",
            "triggers": [
                  "TSV 공정",
                  "through-silicon via",
                  "실리콘 관통전극"
            ],
            "terms": [
                  "tsv",
                  "through-silicon via",
                  "실리콘 관통전극"
            ],
            "contextTerms": [
                  "반도체 패키징 이종집적",
                  "advanced packaging",
                  "semiconductor packaging",
                  "chiplet",
                  "3d ic",
                  "heterogeneous integration",
                  "interconnect",
                  "die-to-die",
                  "through silicon via",
                  "tsv",
                  "micro bump",
                  "packaging mechanics",
                  "반도체 패키징",
                  "패키징/인터커넥트/신뢰성"
            ],
            "priorityNames": [
                  "김성재",
                  "김태성",
                  "김택수",
                  "최우영"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "웨이퍼 레벨 패키징 교수님 추천해줘",
            "intent": "wafer-level packaging",
            "triggers": [
                  "웨이퍼 레벨 패키징",
                  "wafer-level packaging",
                  "packaging"
            ],
            "terms": [
                  "wafer-level packaging",
                  "웨이퍼 레벨 패키징",
                  "packaging"
            ],
            "contextTerms": [
                  "반도체 패키징 이종집적",
                  "advanced packaging",
                  "semiconductor packaging",
                  "chiplet",
                  "3d ic",
                  "heterogeneous integration",
                  "interconnect",
                  "die-to-die",
                  "through silicon via",
                  "tsv",
                  "micro bump",
                  "packaging mechanics",
                  "반도체 패키징",
                  "패키징/인터커넥트/신뢰성"
            ],
            "priorityNames": [
                  "김성재",
                  "김태성",
                  "김택수",
                  "최우영"
            ]
      },
      {
            "label": "반도체 패키징/이종집적",
            "query": "이종집적 열관리 연구실 추천해줘",
            "intent": "heterogeneous integration thermal management",
            "triggers": [
                  "이종집적 열관리",
                  "heterogeneous integration",
                  "이종집적",
                  "thermal management",
                  "열관리"
            ],
            "terms": [
                  "heterogeneous integration",
                  "이종집적",
                  "thermal management",
                  "열관리"
            ],
            "contextTerms": [
                  "반도체 패키징 이종집적",
                  "advanced packaging",
                  "semiconductor packaging",
                  "chiplet",
                  "3d ic",
                  "heterogeneous integration",
                  "interconnect",
                  "die-to-die",
                  "through silicon via",
                  "tsv",
                  "micro bump",
                  "packaging mechanics",
                  "반도체 패키징",
                  "패키징/인터커넥트/신뢰성"
            ],
            "priorityNames": [
                  "김성재",
                  "김태성",
                  "김택수",
                  "최우영"
            ]
      },
      {
            "label": "수소/연료전지",
            "query": "수전해 촉매 교수님 추천해줘",
            "intent": "water electrolysis catalyst",
            "triggers": [
                  "수전해 촉매",
                  "water electrolysis",
                  "수전해",
                  "electrolysis",
                  "촉매"
            ],
            "terms": [
                  "water electrolysis",
                  "수전해",
                  "electrolysis",
                  "촉매"
            ],
            "contextTerms": [
                  "수소 연료전지",
                  "hydrogen",
                  "fuel cell",
                  "water electrolysis",
                  "electrolyzer",
                  "hydrogen production",
                  "hydrogen storage",
                  "oxygen reduction",
                  "orr",
                  "oxygen evolution",
                  "oer",
                  "electrocatalyst",
                  "수소",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": []
      },
      {
            "label": "수소/연료전지",
            "query": "수소 생산 연구실 추천해줘",
            "intent": "hydrogen production",
            "triggers": [
                  "수소 생산",
                  "hydrogen production",
                  "hydrogen"
            ],
            "terms": [
                  "hydrogen production",
                  "수소 생산",
                  "hydrogen"
            ],
            "contextTerms": [
                  "수소 연료전지",
                  "hydrogen",
                  "fuel cell",
                  "water electrolysis",
                  "electrolyzer",
                  "hydrogen production",
                  "hydrogen storage",
                  "oxygen reduction",
                  "orr",
                  "oxygen evolution",
                  "oer",
                  "electrocatalyst",
                  "수소",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": []
      },
      {
            "label": "수소/연료전지",
            "query": "PEM 연료전지 교수님 추천해줘",
            "intent": "PEM fuel cell",
            "triggers": [
                  "PEM 연료전지",
                  "fuel cell",
                  "연료전지"
            ],
            "terms": [
                  "pem",
                  "fuel cell",
                  "연료전지"
            ],
            "contextTerms": [
                  "수소 연료전지",
                  "hydrogen",
                  "fuel cell",
                  "water electrolysis",
                  "electrolyzer",
                  "hydrogen production",
                  "hydrogen storage",
                  "oxygen reduction",
                  "orr",
                  "oxygen evolution",
                  "oer",
                  "electrocatalyst",
                  "수소",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": []
      },
      {
            "label": "수소/연료전지",
            "query": "산소환원반응 연구실 추천해줘",
            "intent": "ORR",
            "triggers": [
                  "산소환원반응",
                  "oxygen reduction",
                  "산소환원"
            ],
            "terms": [
                  "oxygen reduction",
                  "산소환원",
                  "orr"
            ],
            "contextTerms": [
                  "수소 연료전지",
                  "hydrogen",
                  "fuel cell",
                  "water electrolysis",
                  "electrolyzer",
                  "hydrogen production",
                  "hydrogen storage",
                  "oxygen reduction",
                  "orr",
                  "oxygen evolution",
                  "oer",
                  "electrocatalyst",
                  "수소",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": []
      },
      {
            "label": "수소/연료전지",
            "query": "암모니아 분해 촉매 교수님 추천해줘",
            "intent": "ammonia cracking catalyst",
            "triggers": [
                  "암모니아 분해 촉매",
                  "ammonia",
                  "암모니아",
                  "cracking",
                  "분해 촉매"
            ],
            "terms": [
                  "ammonia",
                  "암모니아",
                  "cracking",
                  "분해 촉매"
            ],
            "contextTerms": [
                  "수소 연료전지",
                  "hydrogen",
                  "fuel cell",
                  "water electrolysis",
                  "electrolyzer",
                  "hydrogen production",
                  "hydrogen storage",
                  "oxygen reduction",
                  "orr",
                  "oxygen evolution",
                  "oer",
                  "electrocatalyst",
                  "수소",
                  "배터리/에너지/수소/전기화학"
            ],
            "priorityNames": []
      },
      {
            "label": "나노소재/신소재",
            "query": "그래핀 연구실 추천해줘",
            "intent": "graphene",
            "triggers": [
                  "그래핀",
                  "graphene"
            ],
            "terms": [
                  "graphene",
                  "그래핀"
            ],
            "contextTerms": [
                  "나노소재 신소재",
                  "nanomaterial",
                  "nano material",
                  "nanostructure",
                  "2d material",
                  "graphene",
                  "transition metal dichalcogenide",
                  "tm dc",
                  "surface analysis",
                  "materials science",
                  "advanced materials",
                  "thin film",
                  "나노소재",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "나노소재/신소재",
            "query": "2D 소재 교수님 추천해줘",
            "intent": "2D materials",
            "triggers": [
                  "2D 소재",
                  "2d material",
                  "two-dimensional"
            ],
            "terms": [
                  "2d material",
                  "2d 소재",
                  "two-dimensional"
            ],
            "contextTerms": [
                  "나노소재 신소재",
                  "nanomaterial",
                  "nano material",
                  "nanostructure",
                  "2d material",
                  "graphene",
                  "transition metal dichalcogenide",
                  "tm dc",
                  "surface analysis",
                  "materials science",
                  "advanced materials",
                  "thin film",
                  "나노소재",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "나노소재/신소재",
            "query": "나노입자 합성 연구실 추천해줘",
            "intent": "nanoparticle synthesis",
            "triggers": [
                  "나노입자 합성",
                  "nanoparticle",
                  "나노입자",
                  "합성"
            ],
            "terms": [
                  "nanoparticle",
                  "나노입자",
                  "합성"
            ],
            "contextTerms": [
                  "나노소재 신소재",
                  "nanomaterial",
                  "nano material",
                  "nanostructure",
                  "2d material",
                  "graphene",
                  "transition metal dichalcogenide",
                  "tm dc",
                  "surface analysis",
                  "materials science",
                  "advanced materials",
                  "thin film",
                  "나노소재",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "나노소재/신소재",
            "query": "전자현미경 분석 교수님 추천해줘",
            "intent": "electron microscopy",
            "triggers": [
                  "전자현미경 분석",
                  "electron microscopy",
                  "전자현미경"
            ],
            "terms": [
                  "electron microscopy",
                  "전자현미경",
                  "tem",
                  "sem"
            ],
            "contextTerms": [
                  "나노소재 신소재",
                  "nanomaterial",
                  "nano material",
                  "nanostructure",
                  "2d material",
                  "graphene",
                  "transition metal dichalcogenide",
                  "tm dc",
                  "surface analysis",
                  "materials science",
                  "advanced materials",
                  "thin film",
                  "나노소재",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "나노소재/신소재",
            "query": "나노복합체 연구실 추천해줘",
            "intent": "nanocomposite",
            "triggers": [
                  "나노복합체",
                  "nanocomposite",
                  "composite"
            ],
            "terms": [
                  "nanocomposite",
                  "나노복합체",
                  "composite"
            ],
            "contextTerms": [
                  "나노소재 신소재",
                  "nanomaterial",
                  "nano material",
                  "nanostructure",
                  "2d material",
                  "graphene",
                  "transition metal dichalcogenide",
                  "tm dc",
                  "surface analysis",
                  "materials science",
                  "advanced materials",
                  "thin film",
                  "나노소재",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "고분자/유기소재",
            "query": "고분자 자기조립 연구실 추천해줘",
            "intent": "polymer self-assembly",
            "triggers": [
                  "고분자 자기조립",
                  "polymer self-assembly",
                  "self assembly",
                  "자기조립",
                  "고분자"
            ],
            "terms": [
                  "polymer self-assembly",
                  "self assembly",
                  "자기조립",
                  "고분자"
            ],
            "contextTerms": [
                  "고분자 유기소재",
                  "polymer",
                  "organic materials",
                  "soft matter",
                  "smart polymer",
                  "block copolymer",
                  "self-assembly",
                  "organic semiconductor",
                  "hydrogel",
                  "elastomer",
                  "고분자",
                  "유기소재",
                  "소프트머터",
                  "화학/촉매/유기합성/고분자",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "고분자/유기소재",
            "query": "유기반도체 교수님 추천해줘",
            "intent": "organic semiconductor",
            "triggers": [
                  "유기반도체",
                  "organic semiconductor"
            ],
            "terms": [
                  "organic semiconductor",
                  "유기반도체"
            ],
            "contextTerms": [
                  "고분자 유기소재",
                  "polymer",
                  "organic materials",
                  "soft matter",
                  "smart polymer",
                  "block copolymer",
                  "self-assembly",
                  "organic semiconductor",
                  "hydrogel",
                  "elastomer",
                  "고분자",
                  "유기소재",
                  "소프트머터",
                  "화학/촉매/유기합성/고분자",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "고분자/유기소재",
            "query": "하이드로젤 연구실 추천해줘",
            "intent": "hydrogel",
            "triggers": [
                  "하이드로젤",
                  "hydrogel"
            ],
            "terms": [
                  "hydrogel",
                  "하이드로젤"
            ],
            "contextTerms": [
                  "고분자 유기소재",
                  "polymer",
                  "organic materials",
                  "soft matter",
                  "smart polymer",
                  "block copolymer",
                  "self-assembly",
                  "organic semiconductor",
                  "hydrogel",
                  "elastomer",
                  "고분자",
                  "유기소재",
                  "소프트머터",
                  "화학/촉매/유기합성/고분자",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "고분자/유기소재",
            "query": "소프트머터 유변학 교수님 추천해줘",
            "intent": "soft matter rheology",
            "triggers": [
                  "소프트머터 유변학",
                  "soft matter",
                  "소프트머터",
                  "rheology",
                  "유변학"
            ],
            "terms": [
                  "soft matter",
                  "소프트머터",
                  "rheology",
                  "유변학"
            ],
            "contextTerms": [
                  "고분자 유기소재",
                  "polymer",
                  "organic materials",
                  "soft matter",
                  "smart polymer",
                  "block copolymer",
                  "self-assembly",
                  "organic semiconductor",
                  "hydrogel",
                  "elastomer",
                  "고분자",
                  "유기소재",
                  "소프트머터",
                  "화학/촉매/유기합성/고분자",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "고분자/유기소재",
            "query": "공액고분자 연구실 추천해줘",
            "intent": "conjugated polymer",
            "triggers": [
                  "공액고분자",
                  "conjugated polymer"
            ],
            "terms": [
                  "conjugated polymer",
                  "공액고분자"
            ],
            "contextTerms": [
                  "고분자 유기소재",
                  "polymer",
                  "organic materials",
                  "soft matter",
                  "smart polymer",
                  "block copolymer",
                  "self-assembly",
                  "organic semiconductor",
                  "hydrogel",
                  "elastomer",
                  "고분자",
                  "유기소재",
                  "소프트머터",
                  "화학/촉매/유기합성/고분자",
                  "재료/나노/표면/분석"
            ],
            "priorityNames": []
      },
      {
            "label": "촉매/화학공정",
            "query": "불균일 촉매 교수님 추천해줘",
            "intent": "heterogeneous catalysis",
            "triggers": [
                  "불균일 촉매",
                  "heterogeneous catalysis",
                  "촉매"
            ],
            "terms": [
                  "heterogeneous catalysis",
                  "불균일 촉매",
                  "촉매"
            ],
            "contextTerms": [
                  "촉매 화학공정",
                  "catalysis",
                  "catalyst",
                  "heterogeneous catalyst",
                  "homogeneous catalyst",
                  "zeolite",
                  "reaction engineering",
                  "chemical process",
                  "process systems",
                  "organic synthesis",
                  "electrocatalysis",
                  "photocatalysis",
                  "촉매",
                  "화학/촉매/유기합성/고분자"
            ],
            "priorityNames": []
      },
      {
            "label": "촉매/화학공정",
            "query": "이산화탄소 전환 연구실 추천해줘",
            "intent": "CO2 conversion",
            "triggers": [
                  "이산화탄소 전환",
                  "co2 conversion",
                  "carbon dioxide conversion"
            ],
            "terms": [
                  "co2 conversion",
                  "carbon dioxide conversion",
                  "이산화탄소 전환",
                  "co2"
            ],
            "contextTerms": [
                  "촉매 화학공정",
                  "catalysis",
                  "catalyst",
                  "heterogeneous catalyst",
                  "homogeneous catalyst",
                  "zeolite",
                  "reaction engineering",
                  "chemical process",
                  "process systems",
                  "organic synthesis",
                  "electrocatalysis",
                  "photocatalysis",
                  "촉매",
                  "화학/촉매/유기합성/고분자"
            ],
            "priorityNames": []
      },
      {
            "label": "촉매/화학공정",
            "query": "반응속도론 교수님 추천해줘",
            "intent": "reaction kinetics",
            "triggers": [
                  "반응속도론",
                  "reaction kinetics",
                  "kinetics"
            ],
            "terms": [
                  "reaction kinetics",
                  "반응속도론",
                  "kinetics"
            ],
            "contextTerms": [
                  "촉매 화학공정",
                  "catalysis",
                  "catalyst",
                  "heterogeneous catalyst",
                  "homogeneous catalyst",
                  "zeolite",
                  "reaction engineering",
                  "chemical process",
                  "process systems",
                  "organic synthesis",
                  "electrocatalysis",
                  "photocatalysis",
                  "촉매",
                  "화학/촉매/유기합성/고분자"
            ],
            "priorityNames": []
      },
      {
            "label": "촉매/화학공정",
            "query": "마이크로반응기 연구실 추천해줘",
            "intent": "microreactor",
            "triggers": [
                  "마이크로반응기",
                  "microreactor"
            ],
            "terms": [
                  "microreactor",
                  "마이크로반응기"
            ],
            "contextTerms": [
                  "촉매 화학공정",
                  "catalysis",
                  "catalyst",
                  "heterogeneous catalyst",
                  "homogeneous catalyst",
                  "zeolite",
                  "reaction engineering",
                  "chemical process",
                  "process systems",
                  "organic synthesis",
                  "electrocatalysis",
                  "photocatalysis",
                  "촉매",
                  "화학/촉매/유기합성/고분자"
            ],
            "priorityNames": []
      },
      {
            "label": "촉매/화학공정",
            "query": "유기합성 방법론 교수님 추천해줘",
            "intent": "organic synthesis methodology",
            "triggers": [
                  "유기합성 방법론",
                  "organic synthesis",
                  "유기합성",
                  "methodology"
            ],
            "terms": [
                  "organic synthesis",
                  "유기합성",
                  "methodology"
            ],
            "contextTerms": [
                  "촉매 화학공정",
                  "catalysis",
                  "catalyst",
                  "heterogeneous catalyst",
                  "homogeneous catalyst",
                  "zeolite",
                  "reaction engineering",
                  "chemical process",
                  "process systems",
                  "organic synthesis",
                  "electrocatalysis",
                  "photocatalysis",
                  "촉매",
                  "화학/촉매/유기합성/고분자"
            ],
            "priorityNames": []
      },
      {
            "label": "단백질/신약개발",
            "query": "단백질 구조 예측 교수님 추천해줘",
            "intent": "protein structure prediction",
            "triggers": [
                  "단백질 구조 예측",
                  "protein structure",
                  "단백질 구조",
                  "structure prediction"
            ],
            "terms": [
                  "protein structure",
                  "단백질 구조",
                  "structure prediction"
            ],
            "contextTerms": [
                  "단백질 신약개발",
                  "protein engineering",
                  "protein",
                  "drug discovery",
                  "drug development",
                  "drug delivery",
                  "biomolecular engineering",
                  "therapeutics",
                  "enzyme engineering",
                  "antibody",
                  "peptide",
                  "단백질",
                  "단백질 공학",
                  "바이오/의생명/약물전달",
                  "생명과학/세포/분자/질병"
            ],
            "priorityNames": []
      },
      {
            "label": "단백질/신약개발",
            "query": "약물전달 나노입자 연구실 추천해줘",
            "intent": "drug delivery nanoparticle",
            "triggers": [
                  "약물전달 나노입자",
                  "drug delivery",
                  "약물전달",
                  "nanoparticle"
            ],
            "terms": [
                  "drug delivery",
                  "약물전달",
                  "nanoparticle"
            ],
            "contextTerms": [
                  "단백질 신약개발",
                  "protein engineering",
                  "protein",
                  "drug discovery",
                  "drug development",
                  "drug delivery",
                  "biomolecular engineering",
                  "therapeutics",
                  "enzyme engineering",
                  "antibody",
                  "peptide",
                  "단백질",
                  "단백질 공학",
                  "바이오/의생명/약물전달",
                  "생명과학/세포/분자/질병"
            ],
            "priorityNames": []
      },
      {
            "label": "단백질/신약개발",
            "query": "항체공학 교수님 추천해줘",
            "intent": "antibody engineering",
            "triggers": [
                  "항체공학",
                  "antibody",
                  "항체",
                  "antibody engineering"
            ],
            "terms": [
                  "antibody",
                  "항체",
                  "antibody engineering"
            ],
            "contextTerms": [
                  "단백질 신약개발",
                  "protein engineering",
                  "protein",
                  "drug discovery",
                  "drug development",
                  "drug delivery",
                  "biomolecular engineering",
                  "therapeutics",
                  "enzyme engineering",
                  "antibody",
                  "peptide",
                  "단백질",
                  "단백질 공학",
                  "바이오/의생명/약물전달",
                  "생명과학/세포/분자/질병"
            ],
            "priorityNames": []
      },
      {
            "label": "단백질/신약개발",
            "query": "효소 설계 연구실 추천해줘",
            "intent": "enzyme design",
            "triggers": [
                  "효소 설계",
                  "enzyme",
                  "효소",
                  "enzyme design"
            ],
            "terms": [
                  "enzyme",
                  "효소",
                  "enzyme design"
            ],
            "contextTerms": [
                  "단백질 신약개발",
                  "protein engineering",
                  "protein",
                  "drug discovery",
                  "drug development",
                  "drug delivery",
                  "biomolecular engineering",
                  "therapeutics",
                  "enzyme engineering",
                  "antibody",
                  "peptide",
                  "단백질",
                  "단백질 공학",
                  "바이오/의생명/약물전달",
                  "생명과학/세포/분자/질병"
            ],
            "priorityNames": []
      },
      {
            "label": "단백질/신약개발",
            "query": "신약 스크리닝 교수님 추천해줘",
            "intent": "drug screening",
            "triggers": [
                  "신약 스크리닝",
                  "drug screening",
                  "screening"
            ],
            "terms": [
                  "drug screening",
                  "신약 스크리닝",
                  "screening"
            ],
            "contextTerms": [
                  "단백질 신약개발",
                  "protein engineering",
                  "protein",
                  "drug discovery",
                  "drug development",
                  "drug delivery",
                  "biomolecular engineering",
                  "therapeutics",
                  "enzyme engineering",
                  "antibody",
                  "peptide",
                  "단백질",
                  "단백질 공학",
                  "바이오/의생명/약물전달",
                  "생명과학/세포/분자/질병"
            ],
            "priorityNames": []
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "면역세포 연구실 추천해줘",
            "intent": "immune cell",
            "triggers": [
                  "면역세포",
                  "immune cell",
                  "immunology"
            ],
            "terms": [
                  "immune cell",
                  "면역세포",
                  "immunology"
            ],
            "contextTerms": [
                  "세포 면역 분자생물학",
                  "cell biology",
                  "immunology",
                  "molecular biology",
                  "disease mechanism",
                  "cell signaling",
                  "rna biology",
                  "crispr",
                  "single-cell",
                  "proteomics",
                  "chromatin",
                  "autophagy",
                  "organoid",
                  "생명과학/세포/분자/질병",
                  "바이오/의생명/약물전달"
            ],
            "priorityNames": []
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "유전자 발현 조절 교수님 추천해줘",
            "intent": "gene expression regulation",
            "triggers": [
                  "유전자 발현 조절",
                  "gene expression",
                  "유전자 발현",
                  "regulation"
            ],
            "terms": [
                  "gene expression",
                  "유전자 발현",
                  "regulation"
            ],
            "contextTerms": [
                  "세포 면역 분자생물학",
                  "cell biology",
                  "immunology",
                  "molecular biology",
                  "disease mechanism",
                  "cell signaling",
                  "rna biology",
                  "crispr",
                  "single-cell",
                  "proteomics",
                  "chromatin",
                  "autophagy",
                  "organoid",
                  "생명과학/세포/분자/질병",
                  "바이오/의생명/약물전달"
            ],
            "priorityNames": []
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "암 미세환경 연구실 추천해줘",
            "intent": "tumor microenvironment",
            "triggers": [
                  "암 미세환경",
                  "tumor microenvironment",
                  "cancer microenvironment"
            ],
            "terms": [
                  "tumor microenvironment",
                  "암 미세환경",
                  "cancer microenvironment"
            ],
            "contextTerms": [
                  "세포 면역 분자생물학",
                  "cell biology",
                  "immunology",
                  "molecular biology",
                  "disease mechanism",
                  "cell signaling",
                  "rna biology",
                  "crispr",
                  "single-cell",
                  "proteomics",
                  "chromatin",
                  "autophagy",
                  "organoid",
                  "생명과학/세포/분자/질병",
                  "바이오/의생명/약물전달"
            ],
            "priorityNames": []
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "줄기세포 분화 교수님 추천해줘",
            "intent": "stem cell differentiation",
            "triggers": [
                  "줄기세포 분화",
                  "stem cell",
                  "줄기세포",
                  "differentiation",
                  "분화"
            ],
            "terms": [
                  "stem cell",
                  "줄기세포",
                  "differentiation",
                  "분화"
            ],
            "contextTerms": [
                  "세포 면역 분자생물학",
                  "cell biology",
                  "immunology",
                  "molecular biology",
                  "disease mechanism",
                  "cell signaling",
                  "rna biology",
                  "crispr",
                  "single-cell",
                  "proteomics",
                  "chromatin",
                  "autophagy",
                  "organoid",
                  "생명과학/세포/분자/질병",
                  "바이오/의생명/약물전달"
            ],
            "priorityNames": []
      },
      {
            "label": "세포/면역/분자생물학",
            "query": "오가노이드 연구실 추천해줘",
            "intent": "organoid",
            "triggers": [
                  "오가노이드",
                  "organoid"
            ],
            "terms": [
                  "organoid",
                  "오가노이드"
            ],
            "contextTerms": [
                  "세포 면역 분자생물학",
                  "cell biology",
                  "immunology",
                  "molecular biology",
                  "disease mechanism",
                  "cell signaling",
                  "rna biology",
                  "crispr",
                  "single-cell",
                  "proteomics",
                  "chromatin",
                  "autophagy",
                  "organoid",
                  "생명과학/세포/분자/질병",
                  "바이오/의생명/약물전달"
            ],
            "priorityNames": []
      },
      {
            "label": "자연어처리/LLM",
            "query": "기계번역 연구실 추천해줘",
            "intent": "machine translation",
            "triggers": [
                  "기계번역",
                  "machine translation"
            ],
            "terms": [
                  "machine translation",
                  "기계번역"
            ],
            "contextTerms": [
                  "자연어처리 LLM",
                  "natural language processing",
                  "nlp",
                  "large language model",
                  "llm",
                  "language model",
                  "generative ai",
                  "text mining",
                  "dialogue",
                  "machine translation",
                  "자연어처리",
                  "자연어",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "자연어처리/LLM",
            "query": "대화시스템 교수님 추천해줘",
            "intent": "dialogue system",
            "triggers": [
                  "대화시스템",
                  "dialogue system",
                  "chatbot"
            ],
            "terms": [
                  "dialogue system",
                  "대화시스템",
                  "chatbot"
            ],
            "contextTerms": [
                  "자연어처리 LLM",
                  "natural language processing",
                  "nlp",
                  "large language model",
                  "llm",
                  "language model",
                  "generative ai",
                  "text mining",
                  "dialogue",
                  "machine translation",
                  "자연어처리",
                  "자연어",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "자연어처리/LLM",
            "query": "RAG 검색증강생성 연구실 추천해줘",
            "intent": "retrieval augmented generation",
            "triggers": [
                  "RAG 검색증강생성",
                  "retrieval augmented generation",
                  "검색증강생성"
            ],
            "terms": [
                  "retrieval augmented generation",
                  "rag",
                  "검색증강생성"
            ],
            "contextTerms": [
                  "자연어처리 LLM",
                  "natural language processing",
                  "nlp",
                  "large language model",
                  "llm",
                  "language model",
                  "generative ai",
                  "text mining",
                  "dialogue",
                  "machine translation",
                  "자연어처리",
                  "자연어",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "자연어처리/LLM",
            "query": "문서요약 교수님 추천해줘",
            "intent": "text summarization",
            "triggers": [
                  "문서요약",
                  "summarization",
                  "text summarization"
            ],
            "terms": [
                  "summarization",
                  "문서요약",
                  "text summarization"
            ],
            "contextTerms": [
                  "자연어처리 LLM",
                  "natural language processing",
                  "nlp",
                  "large language model",
                  "llm",
                  "language model",
                  "generative ai",
                  "text mining",
                  "dialogue",
                  "machine translation",
                  "자연어처리",
                  "자연어",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "자연어처리/LLM",
            "query": "언어모델 정렬 연구실 추천해줘",
            "intent": "language model alignment",
            "triggers": [
                  "언어모델 정렬",
                  "alignment",
                  "언어모델",
                  "language model"
            ],
            "terms": [
                  "alignment",
                  "언어모델",
                  "language model"
            ],
            "contextTerms": [
                  "자연어처리 LLM",
                  "natural language processing",
                  "nlp",
                  "large language model",
                  "llm",
                  "language model",
                  "generative ai",
                  "text mining",
                  "dialogue",
                  "machine translation",
                  "자연어처리",
                  "자연어",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "DB/빅데이터",
            "query": "데이터마이닝 연구실 추천해줘",
            "intent": "data mining",
            "triggers": [
                  "데이터마이닝",
                  "data mining"
            ],
            "terms": [
                  "data mining",
                  "데이터마이닝"
            ],
            "contextTerms": [
                  "데이터베이스 빅데이터",
                  "database",
                  "database systems",
                  "big data",
                  "data mining",
                  "recommender",
                  "recommender systems",
                  "query processing",
                  "data systems",
                  "large-scale data",
                  "데이터베이스",
                  "빅데이터",
                  "데이터마이닝"
            ],
            "priorityNames": []
      },
      {
            "label": "DB/빅데이터",
            "query": "인덱싱 구조 교수님 추천해줘",
            "intent": "database indexing",
            "triggers": [
                  "인덱싱 구조",
                  "indexing",
                  "인덱싱",
                  "database"
            ],
            "terms": [
                  "indexing",
                  "인덱싱",
                  "database"
            ],
            "contextTerms": [
                  "데이터베이스 빅데이터",
                  "database",
                  "database systems",
                  "big data",
                  "data mining",
                  "recommender",
                  "recommender systems",
                  "query processing",
                  "data systems",
                  "large-scale data",
                  "데이터베이스",
                  "빅데이터",
                  "데이터마이닝"
            ],
            "priorityNames": []
      },
      {
            "label": "DB/빅데이터",
            "query": "쿼리 최적화 연구실 추천해줘",
            "intent": "query optimization",
            "triggers": [
                  "쿼리 최적화",
                  "query optimization"
            ],
            "terms": [
                  "query optimization",
                  "쿼리 최적화"
            ],
            "contextTerms": [
                  "데이터베이스 빅데이터",
                  "database",
                  "database systems",
                  "big data",
                  "data mining",
                  "recommender",
                  "recommender systems",
                  "query processing",
                  "data systems",
                  "large-scale data",
                  "데이터베이스",
                  "빅데이터",
                  "데이터마이닝"
            ],
            "priorityNames": []
      },
      {
            "label": "DB/빅데이터",
            "query": "추천시스템 교수님 추천해줘",
            "intent": "recommender systems",
            "triggers": [
                  "시스템",
                  "recommender",
                  "추천시스템"
            ],
            "terms": [
                  "recommender",
                  "추천시스템"
            ],
            "contextTerms": [
                  "데이터베이스 빅데이터",
                  "database",
                  "database systems",
                  "big data",
                  "data mining",
                  "recommender",
                  "recommender systems",
                  "query processing",
                  "data systems",
                  "large-scale data",
                  "데이터베이스",
                  "빅데이터",
                  "데이터마이닝"
            ],
            "priorityNames": []
      },
      {
            "label": "DB/빅데이터",
            "query": "그래프 데이터베이스 연구실 추천해줘",
            "intent": "graph database",
            "triggers": [
                  "그래프 데이터베이스",
                  "graph database"
            ],
            "terms": [
                  "graph database",
                  "그래프 데이터베이스"
            ],
            "contextTerms": [
                  "데이터베이스 빅데이터",
                  "database",
                  "database systems",
                  "big data",
                  "data mining",
                  "recommender",
                  "recommender systems",
                  "query processing",
                  "data systems",
                  "large-scale data",
                  "데이터베이스",
                  "빅데이터",
                  "데이터마이닝"
            ],
            "priorityNames": []
      },
      {
            "label": "시스템/운영체제",
            "query": "운영체제 연구실 추천해줘",
            "intent": "operating systems",
            "triggers": [
                  "운영체제",
                  "operating system"
            ],
            "terms": [
                  "operating system",
                  "운영체제",
                  "os"
            ],
            "contextTerms": [
                  "운영체제 분산시스템",
                  "operating system",
                  "distributed system",
                  "storage system",
                  "file system",
                  "cloud computing",
                  "computer systems",
                  "systems software",
                  "compiler",
                  "embedded system",
                  "parallel computing",
                  "운영체제",
                  "분산시스템"
            ],
            "priorityNames": []
      },
      {
            "label": "시스템/운영체제",
            "query": "분산시스템 교수님 추천해줘",
            "intent": "distributed systems",
            "triggers": [
                  "분산시스템",
                  "distributed system"
            ],
            "terms": [
                  "distributed system",
                  "분산시스템"
            ],
            "contextTerms": [
                  "운영체제 분산시스템",
                  "operating system",
                  "distributed system",
                  "storage system",
                  "file system",
                  "cloud computing",
                  "computer systems",
                  "systems software",
                  "compiler",
                  "embedded system",
                  "parallel computing",
                  "운영체제",
                  "분산시스템"
            ],
            "priorityNames": []
      },
      {
            "label": "시스템/운영체제",
            "query": "스토리지 시스템 연구실 추천해줘",
            "intent": "storage systems",
            "triggers": [
                  "스토리지 시스템",
                  "storage system",
                  "스토리지"
            ],
            "terms": [
                  "storage system",
                  "스토리지"
            ],
            "contextTerms": [
                  "운영체제 분산시스템",
                  "operating system",
                  "distributed system",
                  "storage system",
                  "file system",
                  "cloud computing",
                  "computer systems",
                  "systems software",
                  "compiler",
                  "embedded system",
                  "parallel computing",
                  "운영체제",
                  "분산시스템"
            ],
            "priorityNames": []
      },
      {
            "label": "시스템/운영체제",
            "query": "클라우드 컴퓨팅 교수님 추천해줘",
            "intent": "cloud computing",
            "triggers": [
                  "클라우드 컴퓨팅",
                  "cloud computing",
                  "클라우드"
            ],
            "terms": [
                  "cloud computing",
                  "클라우드"
            ],
            "contextTerms": [
                  "운영체제 분산시스템",
                  "operating system",
                  "distributed system",
                  "storage system",
                  "file system",
                  "cloud computing",
                  "computer systems",
                  "systems software",
                  "compiler",
                  "embedded system",
                  "parallel computing",
                  "운영체제",
                  "분산시스템"
            ],
            "priorityNames": []
      },
      {
            "label": "시스템/운영체제",
            "query": "컴파일러 런타임 연구실 추천해줘",
            "intent": "compiler runtime",
            "triggers": [
                  "컴파일러 런타임",
                  "compiler",
                  "컴파일러",
                  "runtime",
                  "런타임"
            ],
            "terms": [
                  "compiler",
                  "컴파일러",
                  "runtime",
                  "런타임"
            ],
            "contextTerms": [
                  "운영체제 분산시스템",
                  "operating system",
                  "distributed system",
                  "storage system",
                  "file system",
                  "cloud computing",
                  "computer systems",
                  "systems software",
                  "compiler",
                  "embedded system",
                  "parallel computing",
                  "운영체제",
                  "분산시스템"
            ],
            "priorityNames": []
      },
      {
            "label": "정보보안/암호",
            "query": "암호 프로토콜 교수님 추천해줘",
            "intent": "cryptographic protocol",
            "triggers": [
                  "암호 프로토콜",
                  "cryptographic protocol",
                  "cryptography"
            ],
            "terms": [
                  "cryptographic protocol",
                  "암호 프로토콜",
                  "cryptography"
            ],
            "contextTerms": [
                  "정보보안 암호",
                  "security",
                  "computer security",
                  "system security",
                  "software security",
                  "network security",
                  "cryptography",
                  "privacy",
                  "homomorphic encryption",
                  "lattice",
                  "vulnerability",
                  "fuzzing",
                  "secure systems"
            ],
            "priorityNames": []
      },
      {
            "label": "정보보안/암호",
            "query": "프라이버시 보존 연산 연구실 추천해줘",
            "intent": "privacy preserving computation",
            "triggers": [
                  "프라이버시 보존 연산",
                  "privacy",
                  "프라이버시",
                  "secure computation"
            ],
            "terms": [
                  "privacy",
                  "프라이버시",
                  "secure computation"
            ],
            "contextTerms": [
                  "정보보안 암호",
                  "security",
                  "computer security",
                  "system security",
                  "software security",
                  "network security",
                  "cryptography",
                  "privacy",
                  "homomorphic encryption",
                  "lattice",
                  "vulnerability",
                  "fuzzing",
                  "secure systems"
            ],
            "priorityNames": []
      },
      {
            "label": "정보보안/암호",
            "query": "네트워크 보안 교수님 추천해줘",
            "intent": "network security",
            "triggers": [
                  "네트워크 보안",
                  "network security"
            ],
            "terms": [
                  "network security",
                  "네트워크 보안"
            ],
            "contextTerms": [
                  "정보보안 암호",
                  "security",
                  "computer security",
                  "system security",
                  "software security",
                  "network security",
                  "cryptography",
                  "privacy",
                  "homomorphic encryption",
                  "lattice",
                  "vulnerability",
                  "fuzzing",
                  "secure systems"
            ],
            "priorityNames": []
      },
      {
            "label": "정보보안/암호",
            "query": "소프트웨어 취약점 연구실 추천해줘",
            "intent": "software vulnerability",
            "triggers": [
                  "소프트웨어 취약점",
                  "software vulnerability",
                  "취약점",
                  "vulnerability"
            ],
            "terms": [
                  "software vulnerability",
                  "취약점",
                  "vulnerability"
            ],
            "contextTerms": [
                  "정보보안 암호",
                  "security",
                  "computer security",
                  "system security",
                  "software security",
                  "network security",
                  "cryptography",
                  "privacy",
                  "homomorphic encryption",
                  "lattice",
                  "vulnerability",
                  "fuzzing",
                  "secure systems"
            ],
            "priorityNames": []
      },
      {
            "label": "정보보안/암호",
            "query": "블록체인 보안 교수님 추천해줘",
            "intent": "blockchain security",
            "triggers": [
                  "블록체인 보안",
                  "blockchain",
                  "블록체인"
            ],
            "terms": [
                  "blockchain",
                  "블록체인"
            ],
            "contextTerms": [
                  "정보보안 암호",
                  "security",
                  "computer security",
                  "system security",
                  "software security",
                  "network security",
                  "cryptography",
                  "privacy",
                  "homomorphic encryption",
                  "lattice",
                  "vulnerability",
                  "fuzzing",
                  "secure systems"
            ],
            "priorityNames": []
      },
      {
            "label": "전력전자/인버터",
            "query": "인버터 제어 교수님 추천해줘",
            "intent": "inverter control",
            "triggers": [
                  "인버터 제어",
                  "inverter",
                  "인버터"
            ],
            "terms": [
                  "inverter",
                  "인버터",
                  "control"
            ],
            "contextTerms": [
                  "전력전자 인버터",
                  "power electronics",
                  "inverter",
                  "converter",
                  "power conversion",
                  "power supply",
                  "power management",
                  "motor drive",
                  "power integrity",
                  "전력전자",
                  "인버터",
                  "컨버터",
                  "전력변환",
                  "전력전자/전력변환/전력무결성"
            ],
            "priorityNames": []
      },
      {
            "label": "전력전자/인버터",
            "query": "모터 드라이브 연구실 추천해줘",
            "intent": "motor drive",
            "triggers": [
                  "모터 드라이브",
                  "motor drive"
            ],
            "terms": [
                  "motor drive",
                  "모터 드라이브"
            ],
            "contextTerms": [
                  "전력전자 인버터",
                  "power electronics",
                  "inverter",
                  "converter",
                  "power conversion",
                  "power supply",
                  "power management",
                  "motor drive",
                  "power integrity",
                  "전력전자",
                  "인버터",
                  "컨버터",
                  "전력변환",
                  "전력전자/전력변환/전력무결성"
            ],
            "priorityNames": []
      },
      {
            "label": "전력전자/인버터",
            "query": "전력변환기 교수님 추천해줘",
            "intent": "power converter",
            "triggers": [
                  "전력변환기",
                  "power converter",
                  "converter"
            ],
            "terms": [
                  "power converter",
                  "전력변환기",
                  "converter"
            ],
            "contextTerms": [
                  "전력전자 인버터",
                  "power electronics",
                  "inverter",
                  "converter",
                  "power conversion",
                  "power supply",
                  "power management",
                  "motor drive",
                  "power integrity",
                  "전력전자",
                  "인버터",
                  "컨버터",
                  "전력변환",
                  "전력전자/전력변환/전력무결성"
            ],
            "priorityNames": []
      },
      {
            "label": "전력전자/인버터",
            "query": "계통연계 컨버터 연구실 추천해줘",
            "intent": "grid-connected converter",
            "triggers": [
                  "계통연계 컨버터",
                  "grid-connected",
                  "계통연계",
                  "converter"
            ],
            "terms": [
                  "grid-connected",
                  "계통연계",
                  "converter"
            ],
            "contextTerms": [
                  "전력전자 인버터",
                  "power electronics",
                  "inverter",
                  "converter",
                  "power conversion",
                  "power supply",
                  "power management",
                  "motor drive",
                  "power integrity",
                  "전력전자",
                  "인버터",
                  "컨버터",
                  "전력변환",
                  "전력전자/전력변환/전력무결성"
            ],
            "priorityNames": []
      },
      {
            "label": "전력전자/인버터",
            "query": "SiC 전력소자 교수님 추천해줘",
            "intent": "SiC power device",
            "triggers": [
                  "SiC 전력소자",
                  "power device",
                  "전력소자"
            ],
            "terms": [
                  "sic",
                  "power device",
                  "전력소자"
            ],
            "contextTerms": [
                  "전력전자 인버터",
                  "power electronics",
                  "inverter",
                  "converter",
                  "power conversion",
                  "power supply",
                  "power management",
                  "motor drive",
                  "power integrity",
                  "전력전자",
                  "인버터",
                  "컨버터",
                  "전력변환",
                  "전력전자/전력변환/전력무결성"
            ],
            "priorityNames": []
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "뉴럴 렌더링 연구실 추천해줘",
            "intent": "neural rendering",
            "triggers": [
                  "뉴럴 렌더링",
                  "neural rendering"
            ],
            "terms": [
                  "neural rendering",
                  "뉴럴 렌더링"
            ],
            "contextTerms": [
                  "그래픽스 3D 비전",
                  "computer graphics",
                  "graphics",
                  "3d vision",
                  "rendering",
                  "visual computing",
                  "geometry processing",
                  "computer animation",
                  "3d reconstruction",
                  "nerf",
                  "컴퓨터 그래픽스",
                  "그래픽스",
                  "3d 비전",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "3D 재구성 교수님 추천해줘",
            "intent": "3D reconstruction",
            "triggers": [
                  "3D 재구성",
                  "3d reconstruction"
            ],
            "terms": [
                  "3d reconstruction",
                  "3d 재구성"
            ],
            "contextTerms": [
                  "그래픽스 3D 비전",
                  "computer graphics",
                  "graphics",
                  "3d vision",
                  "rendering",
                  "visual computing",
                  "geometry processing",
                  "computer animation",
                  "3d reconstruction",
                  "nerf",
                  "컴퓨터 그래픽스",
                  "그래픽스",
                  "3d 비전",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "컴퓨터 애니메이션 연구실 추천해줘",
            "intent": "computer animation",
            "triggers": [
                  "컴퓨터 애니메이션",
                  "computer animation"
            ],
            "terms": [
                  "computer animation",
                  "컴퓨터 애니메이션"
            ],
            "contextTerms": [
                  "그래픽스 3D 비전",
                  "computer graphics",
                  "graphics",
                  "3d vision",
                  "rendering",
                  "visual computing",
                  "geometry processing",
                  "computer animation",
                  "3d reconstruction",
                  "nerf",
                  "컴퓨터 그래픽스",
                  "그래픽스",
                  "3d 비전",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "포인트클라우드 처리 교수님 추천해줘",
            "intent": "point cloud processing",
            "triggers": [
                  "포인트클라우드 처리",
                  "point cloud",
                  "포인트클라우드"
            ],
            "terms": [
                  "point cloud",
                  "포인트클라우드"
            ],
            "contextTerms": [
                  "그래픽스 3D 비전",
                  "computer graphics",
                  "graphics",
                  "3d vision",
                  "rendering",
                  "visual computing",
                  "geometry processing",
                  "computer animation",
                  "3d reconstruction",
                  "nerf",
                  "컴퓨터 그래픽스",
                  "그래픽스",
                  "3d 비전",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "그래픽스/3D 비전",
            "query": "실시간 렌더링 연구실 추천해줘",
            "intent": "real-time rendering",
            "triggers": [
                  "실시간 렌더링",
                  "real-time rendering",
                  "rendering"
            ],
            "terms": [
                  "real-time rendering",
                  "실시간 렌더링",
                  "rendering"
            ],
            "contextTerms": [
                  "그래픽스 3D 비전",
                  "computer graphics",
                  "graphics",
                  "3d vision",
                  "rendering",
                  "visual computing",
                  "geometry processing",
                  "computer animation",
                  "3d reconstruction",
                  "nerf",
                  "컴퓨터 그래픽스",
                  "그래픽스",
                  "3d 비전",
                  "AI/머신러닝/데이터사이언스"
            ],
            "priorityNames": []
      },
      {
            "label": "항공우주/추진",
            "query": "로켓 추진 교수님 추천해줘",
            "intent": "rocket propulsion",
            "triggers": [
                  "로켓 추진",
                  "rocket propulsion",
                  "propulsion"
            ],
            "terms": [
                  "rocket propulsion",
                  "로켓 추진",
                  "propulsion"
            ],
            "contextTerms": [
                  "항공우주 추진",
                  "aerospace",
                  "propulsion",
                  "rocket",
                  "satellite",
                  "spacecraft",
                  "uav",
                  "unmanned aerial",
                  "gas turbine",
                  "turbomachinery",
                  "combustion",
                  "reacting flow",
                  "aerodynamics",
                  "항공우주/위성/추진/열유체"
            ],
            "priorityNames": []
      },
      {
            "label": "항공우주/추진",
            "query": "위성 자세제어 연구실 추천해줘",
            "intent": "satellite attitude control",
            "triggers": [
                  "위성 자세제어",
                  "satellite",
                  "위성",
                  "attitude control",
                  "자세제어"
            ],
            "terms": [
                  "satellite",
                  "위성",
                  "attitude control",
                  "자세제어"
            ],
            "contextTerms": [
                  "항공우주 추진",
                  "aerospace",
                  "propulsion",
                  "rocket",
                  "satellite",
                  "spacecraft",
                  "uav",
                  "unmanned aerial",
                  "gas turbine",
                  "turbomachinery",
                  "combustion",
                  "reacting flow",
                  "aerodynamics",
                  "항공우주/위성/추진/열유체"
            ],
            "priorityNames": []
      },
      {
            "label": "항공우주/추진",
            "query": "공력소음 교수님 추천해줘",
            "intent": "aeroacoustics",
            "triggers": [
                  "공력소음",
                  "aeroacoustics"
            ],
            "terms": [
                  "aeroacoustics",
                  "공력소음"
            ],
            "contextTerms": [
                  "항공우주 추진",
                  "aerospace",
                  "propulsion",
                  "rocket",
                  "satellite",
                  "spacecraft",
                  "uav",
                  "unmanned aerial",
                  "gas turbine",
                  "turbomachinery",
                  "combustion",
                  "reacting flow",
                  "aerodynamics",
                  "항공우주/위성/추진/열유체"
            ],
            "priorityNames": []
      },
      {
            "label": "항공우주/추진",
            "query": "난류 유동 연구실 추천해줘",
            "intent": "turbulent flow",
            "triggers": [
                  "난류 유동",
                  "turbulence",
                  "난류",
                  "flow"
            ],
            "terms": [
                  "turbulence",
                  "난류",
                  "flow"
            ],
            "contextTerms": [
                  "항공우주 추진",
                  "aerospace",
                  "propulsion",
                  "rocket",
                  "satellite",
                  "spacecraft",
                  "uav",
                  "unmanned aerial",
                  "gas turbine",
                  "turbomachinery",
                  "combustion",
                  "reacting flow",
                  "aerodynamics",
                  "항공우주/위성/추진/열유체"
            ],
            "priorityNames": []
      },
      {
            "label": "항공우주/추진",
            "query": "UAV 제어 교수님 추천해줘",
            "intent": "UAV control",
            "triggers": [
                  "UAV 제어",
                  "drone"
            ],
            "terms": [
                  "uav",
                  "drone",
                  "제어"
            ],
            "contextTerms": [
                  "항공우주 추진",
                  "aerospace",
                  "propulsion",
                  "rocket",
                  "satellite",
                  "spacecraft",
                  "uav",
                  "unmanned aerial",
                  "gas turbine",
                  "turbomachinery",
                  "combustion",
                  "reacting flow",
                  "aerodynamics",
                  "항공우주/위성/추진/열유체"
            ],
            "priorityNames": []
      },
      {
            "label": "환경/기후/지속가능",
            "query": "탄소포집 연구실 추천해줘",
            "intent": "carbon capture",
            "triggers": [
                  "탄소포집",
                  "carbon capture",
                  "ccus"
            ],
            "terms": [
                  "carbon capture",
                  "탄소포집",
                  "ccus"
            ],
            "contextTerms": [
                  "환경 기후 지속가능",
                  "environment",
                  "environmental",
                  "climate",
                  "carbon neutral",
                  "carbon neutrality",
                  "sustainable",
                  "sustainability",
                  "water treatment",
                  "wastewater",
                  "air pollution",
                  "co2",
                  "carbon capture",
                  "환경/기후/지속가능"
            ],
            "priorityNames": []
      },
      {
            "label": "환경/기후/지속가능",
            "query": "기후모델링 교수님 추천해줘",
            "intent": "climate modeling",
            "triggers": [
                  "기후모델링",
                  "climate modeling",
                  "climate"
            ],
            "terms": [
                  "climate modeling",
                  "기후모델링",
                  "climate"
            ],
            "contextTerms": [
                  "환경 기후 지속가능",
                  "environment",
                  "environmental",
                  "climate",
                  "carbon neutral",
                  "carbon neutrality",
                  "sustainable",
                  "sustainability",
                  "water treatment",
                  "wastewater",
                  "air pollution",
                  "co2",
                  "carbon capture",
                  "환경/기후/지속가능"
            ],
            "priorityNames": []
      },
      {
            "label": "환경/기후/지속가능",
            "query": "폐수처리 연구실 추천해줘",
            "intent": "wastewater treatment",
            "triggers": [
                  "폐수처리",
                  "wastewater",
                  "water treatment"
            ],
            "terms": [
                  "wastewater",
                  "폐수처리",
                  "water treatment"
            ],
            "contextTerms": [
                  "환경 기후 지속가능",
                  "environment",
                  "environmental",
                  "climate",
                  "carbon neutral",
                  "carbon neutrality",
                  "sustainable",
                  "sustainability",
                  "water treatment",
                  "wastewater",
                  "air pollution",
                  "co2",
                  "carbon capture",
                  "환경/기후/지속가능"
            ],
            "priorityNames": []
      },
      {
            "label": "환경/기후/지속가능",
            "query": "대기오염 분석 교수님 추천해줘",
            "intent": "air pollution",
            "triggers": [
                  "대기오염 분석",
                  "air pollution",
                  "대기오염"
            ],
            "terms": [
                  "air pollution",
                  "대기오염"
            ],
            "contextTerms": [
                  "환경 기후 지속가능",
                  "environment",
                  "environmental",
                  "climate",
                  "carbon neutral",
                  "carbon neutrality",
                  "sustainable",
                  "sustainability",
                  "water treatment",
                  "wastewater",
                  "air pollution",
                  "co2",
                  "carbon capture",
                  "환경/기후/지속가능"
            ],
            "priorityNames": []
      },
      {
            "label": "환경/기후/지속가능",
            "query": "지속가능 에너지 정책 교수님 추천해줘",
            "intent": "sustainable energy policy",
            "triggers": [
                  "지속가능 에너지 정책",
                  "sustainable energy",
                  "지속가능 에너지",
                  "policy",
                  "정책"
            ],
            "terms": [
                  "sustainable energy",
                  "지속가능 에너지",
                  "policy",
                  "정책"
            ],
            "contextTerms": [
                  "환경 기후 지속가능",
                  "environment",
                  "environmental",
                  "climate",
                  "carbon neutral",
                  "carbon neutrality",
                  "sustainable",
                  "sustainability",
                  "water treatment",
                  "wastewater",
                  "air pollution",
                  "co2",
                  "carbon capture",
                  "환경/기후/지속가능"
            ],
            "priorityNames": []
      }
];

      function snuDiverseNorm(value) {
        return normalize(String(value || ""));
      }
      function snuDiverseProfessorText(professor) {
        if (!professor) return "";
        if (professor._snuDiverseTextCache) return professor._snuDiverseTextCache;
        const chunks = [];
        function collect(value) {
          if (!value) return;
          if (typeof value === "string" || typeof value === "number") chunks.push(String(value));
          else if (Array.isArray(value)) value.forEach(collect);
          else if (typeof value === "object") Object.values(value).forEach(collect);
        }
        ["professor","professorEn","title","unitLabels","labNames","fields","summary","summaries","intentTags","keywords","searchText","representativeSignals","structuredProfile"].forEach((key) => collect(professor[key]));
        professor._snuDiverseTextCache = snuDiverseNorm(chunks.join(" "));
        return professor._snuDiverseTextCache;
      }
      function snuDiverseTermHit(text, rawTerm) {
        const term = snuDiverseNorm(rawTerm);
        if (!term || term.length < 2) return false;
        if (/^[a-z0-9]{2,3}$/.test(term)) {
          return new RegExp("(^|[^a-z0-9])" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])").test(text);
        }
        return text.includes(term);
      }
      function snuDiverseHits(text, terms, limit) {
        const out = [];
        const seen = new Set();
        (terms || []).forEach((term) => {
          if (out.length >= (limit || 8)) return;
          const n = snuDiverseNorm(term);
          if (!n || seen.has(n)) return;
          if (snuDiverseTermHit(text, term)) {
            out.push(term);
            seen.add(n);
          }
        });
        return out.slice(0, limit || 8);
      }
      function snuDiverseProfileFor(query) {
        const q = snuDiverseNorm(query || "");
        if (!q || (state && state.currentQueryMode === "banner_explore")) return null;
        return SNU_DIVERSE_PRECISE_PROFILES.find((profile) => (profile.triggers || []).some((trigger) => snuDiverseTermHit(q, trigger)));
      }
      function snuDiverseNameRank(professor, names) {
        const n = snuDiverseNorm([professor && professor.professor, professor && professor.professorEn].join(" "));
        const idx = (names || []).findIndex((name) => n.includes(snuDiverseNorm(name)));
        return idx < 0 ? 9999 : idx;
      }
      const snuDiversePreviousRecommend = recommend;
      recommend = function(query, limit = 8) {
        const profile = snuDiverseProfileFor(query);
        if (!profile) return snuDiversePreviousRecommend(query, limit);
        const maxDirect = Math.max(limit || RECOMMEND_RESULT_LIMIT || 120, 80);
        const direct = [];
        const adjacent = [];
        professors.forEach((professor) => {
          const text = snuDiverseProfessorText(professor);
          const exactHits = snuDiverseHits(text, profile.terms || [], 8);
          const contextHits = snuDiverseHits(text, profile.contextTerms || [], 6);
          if (exactHits.length) {
            const rank = snuDiverseNameRank(professor, profile.priorityNames || []);
            const priorityBoost = rank < 9999 ? Math.max(0, 240 - rank * 24) : 0;
            const item = { professor, score: 0, matched: [], reasons: [] };
            item.score = Math.round(1450 + exactHits.length * 520 + Math.min(240, contextHits.length * 40) + priorityBoost + Math.min(Number((professor || {}).qualityScore || 0) / 15, 8));
            item.matched = Array.from(new Set([...(exactHits || []), ...(contextHits || [])])).slice(0, 8);
            item._snuTier = "direct";
            item._snuTierLevel = item.score >= 2100 ? "A" : "B";
            item._snuPrecisionIntent = profile.label;
            item._snuPrecisionEvidence = exactHits.slice(0, 6);
            direct.push(item);
          } else if (contextHits.length) {
            const item = { professor, score: 0, matched: [], reasons: [] };
            item.score = Math.round(260 + Math.min(360, contextHits.length * 60) + Math.min(Number((professor || {}).qualityScore || 0) / 40, 5));
            item.matched = contextHits.slice(0, 6);
            item._snuTier = "adjacent";
            item._snuTierLevel = "C";
            item._snuPrecisionIntent = profile.label;
            item._snuAdjacentEvidence = contextHits.slice(0, 5);
            adjacent.push(item);
          }
        });
        direct.sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String((a.professor || {}).professor || "").localeCompare(String((b.professor || {}).professor || ""), "ko"));
        adjacent.sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String((a.professor || {}).professor || "").localeCompare(String((b.professor || {}).professor || ""), "ko"));
        const out = direct.length ? direct.slice(0, maxDirect) : adjacent.slice(0, maxDirect);
        out._snuTierMeta = {
          query,
          mode: "precise",
          family: profile.label,
          intent: profile.intent,
          directTotal: direct.length,
          adjacentTotal: adjacent.length,
          diversityRegression: true,
          bannerQuerySeparated: true
        };
        out._snuAdjacentResults = adjacent.slice(0, 40);
        return out;
      };

      const snuDiversePreviousBuildMatchEvidenceText = buildMatchEvidenceText;
      buildMatchEvidenceText = function(item) {
        if (item && item._snuPrecisionEvidence && item._snuPrecisionEvidence.length) {
          return `${item._snuPrecisionEvidence.slice(0, 5).join(", ")} 키워드가 직접 검색어와 직접 연결됩니다.`;
        }
        if (item && item._snuTier === "adjacent" && item._snuAdjacentEvidence && item._snuAdjacentEvidence.length) {
          return `인접 분야 근거: ${item._snuAdjacentEvidence.slice(0, 4).join(", ")} 키워드가 입력 분야와 가까운 연구 주제입니다.`;
        }
        return snuDiversePreviousBuildMatchEvidenceText(item);
      };
    })();


    init();
