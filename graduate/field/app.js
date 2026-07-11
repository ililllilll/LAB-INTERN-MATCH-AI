(function () {
  'use strict';

  const payload = window.FIELD_LAB_MATCH_DATA || { records: [], meta: {} };
  const records = Array.isArray(payload.records) ? payload.records : [];

  const MAJORS = [
    {
      id: 'chemistry', label: '화학', note: '분자 설계, 합성, 분석과 반응',
      fields: [
        ['유기화학', '유기화학 유기합성', ['organic chemistry','organic synthesis','합성 방법론','천연물 합성','의약품 합성']],
        ['무기화학', '무기화학', ['inorganic chemistry','배위화학','금속 착물','무기 소재']],
        ['분석화학', '분석화학', ['analytical chemistry','분광 분석','질량분석','크로마토그래피']],
        ['물리화학', '물리화학', ['physical chemistry','화학열역학','반응동역학','분자분광학']],
        ['고분자화학', '고분자화학', ['polymer chemistry','고분자 합성','중합','기능성 고분자']],
        ['촉매화학', '촉매 화학', ['catalysis','촉매 반응','균일 촉매','불균일 촉매']],
        ['전기화학', '전기화학', ['electrochemistry','전극 반응','전기촉매','이온 전달']],
        ['배터리 화학', '배터리 전기화학', ['battery chemistry','이차전지','전해질','전극 계면','리튬이온전지']],
        ['계산화학', '계산화학', ['computational chemistry','분자 시뮬레이션','양자화학','DFT']],
        ['화학생물학', '화학생물학', ['chemical biology','단백질 화학','생화학','분자 프로브']],
        ['초분자·MOF', '초분자화학 MOF', ['supramolecular chemistry','metal organic framework','금속유기구조체','다공성 소재']]
      ]
    },
    {
      id: 'physics', label: '물리', note: '물질, 양자, 광학과 우주',
      fields: [
        ['응집물질물리', '응집물질물리', ['condensed matter physics','강상관계','고체물리','양자물질']],
        ['양자정보·컴퓨팅', '양자정보 양자컴퓨팅', ['quantum information','quantum computing','큐비트','양자 알고리즘']],
        ['양자광학·원자물리', '양자광학 원자물리', ['quantum optics','atomic physics','초냉각 원자','리드버그 원자']],
        ['광학·포토닉스', '광학 포토닉스', ['optics','photonics','나노광학','레이저']],
        ['입자·핵물리', '입자물리 핵물리', ['particle physics','nuclear physics','고에너지 물리']],
        ['천체·우주물리', '천체물리 우주물리', ['astrophysics','cosmology','은하','우주론']],
        ['플라즈마물리', '플라즈마 물리', ['plasma physics','핵융합','플라즈마 진단']],
        ['계산·이론물리', '계산물리 이론물리', ['computational physics','theoretical physics','수치 시뮬레이션']],
        ['나노물리·2차원물질', '나노물리 2차원물질', ['nanophysics','2D materials','van der Waals','나노구조']],
        ['생물물리', '생물물리', ['biophysics','단분자','생체물리','세포 물리']]
      ]
    },
    {
      id: 'life', label: '생명과학', note: '분자, 세포, 유전체와 생명현상',
      fields: [
        ['분자생물학', '분자생물학', ['molecular biology','유전자 발현','RNA','DNA']],
        ['세포생물학', '세포생물학', ['cell biology','세포 신호','세포주기','세포 소기관']],
        ['유전체학', '유전체학', ['genomics','유전체 분석','후성유전체','single cell genomics']],
        ['구조생물학', '구조생물학', ['structural biology','단백질 구조','cryo EM','X선 결정학']],
        ['면역학', '면역학', ['immunology','T 세포','면역치료','면역 반응']],
        ['암생물학', '암생물학', ['cancer biology','종양 미세환경','암 유전체','전이']],
        ['신경생물학', '신경생물학', ['neurobiology','신경세포','시냅스','신경 발달']],
        ['식물생명과학', '식물 생명과학', ['plant biology','식물 발달','식물 유전학','광합성']],
        ['미생물학', '미생물학', ['microbiology','미생물 대사','세균','바이러스']],
        ['발생·재생생물학', '발생생물학 재생생물학', ['developmental biology','regeneration','줄기세포','조직 재생']],
        ['바이오이미징', '바이오 이미징', ['bioimaging','세포 이미징','형광 이미징','현미경']]
      ]
    },
    {
      id: 'brain', label: '뇌과학', note: '신경회로, 인지, 행동과 뇌질환',
      fields: [
        ['신경회로', '신경회로', ['neural circuit','회로 매핑','신경망 회로','옵토제네틱스']],
        ['인지·행동', '인지과학 행동신경과학', ['cognitive science','behavioral neuroscience','학습 기억','의사결정']],
        ['시냅스', '시냅스 신경전달', ['synapse','synaptic plasticity','신경전달물질']],
        ['감각·지각', '감각 지각', ['sensory neuroscience','perception','시각','청각','후각']],
        ['뇌질환', '뇌질환 신경퇴행', ['brain disease','neurodegeneration','알츠하이머','파킨슨']],
        ['뇌영상', '뇌영상', ['brain imaging','fMRI','MRI','neuroimaging']],
        ['뇌-컴퓨터 인터페이스', '뇌 컴퓨터 인터페이스 BCI', ['brain computer interface','BCI','neural interface']],
        ['계산신경과학', '계산신경과학', ['computational neuroscience','neural modeling','신경 데이터 분석']],
        ['신경공학', '신경공학', ['neuroengineering','신경 자극','신경 보철','neural device']]
      ]
    },
    {
      id: 'electrical', label: '전기전자', note: '소자, 회로, 통신, 신호와 제어',
      fields: [
        ['반도체 공정', '반도체 공정', ['semiconductor process','리소그래피','식각','증착','ALD','CVD','CMP','공정 집적']],
        ['반도체 소자', '반도체 소자', ['semiconductor device','MOSFET','트랜지스터','메모리 소자','나노전자소자']],
        ['집적회로·VLSI', '집적회로 VLSI', ['integrated circuit','VLSI','CMOS circuit','SoC','IC 설계']],
        ['아날로그·혼성신호 회로', '아날로그 회로 혼성신호', ['analog circuit','mixed signal','ADC','DAC','센서 인터페이스']],
        ['디지털 회로·컴퓨터구조', '디지털 회로 컴퓨터구조', ['digital circuit','computer architecture','FPGA','hardware accelerator']],
        ['전력전자·전력시스템', '전력전자 전력시스템', ['power electronics','power system','인버터','전력 변환']],
        ['신호처리', '신호처리', ['signal processing','DSP','영상 신호처리','음성 신호처리']],
        ['통신·네트워크', '통신 네트워크', ['communications','wireless communication','5G','6G','정보이론']],
        ['제어', '제어 시스템', ['control systems','제어이론','최적제어','비선형 제어']],
        ['센서·계측', '센서 계측', ['sensor','instrumentation','센서 소자','측정 시스템']],
        ['광전자·포토닉스', '광전자 포토닉스', ['optoelectronics','photonics','광소자','실리콘 포토닉스']],
        ['디스플레이', '디스플레이', ['display','OLED','micro LED','디스플레이 소자']],
        ['RF·전자파', 'RF 전자파', ['radio frequency','microwave','antenna','전자파']],
        ['임베디드·IoT', '임베디드 시스템 IoT', ['embedded systems','IoT','마이크로컨트롤러','edge device']]
      ]
    },
    {
      id: 'computer', label: '컴퓨터공학·AI', note: 'AI, 소프트웨어, 시스템과 사용자 경험',
      fields: [
        ['인공지능·머신러닝', '인공지능 머신러닝', ['artificial intelligence','machine learning','deep learning']],
        ['컴퓨터비전', '컴퓨터비전', ['computer vision','visual recognition','영상 인식','3D vision']],
        ['자연어처리', '자연어처리', ['natural language processing','NLP','언어모델','대규모 언어모델']],
        ['데이터마이닝·데이터베이스', '데이터마이닝 데이터베이스', ['data mining','database','빅데이터','정보 검색']],
        ['운영체제·분산시스템', '운영체제 분산시스템', ['operating systems','distributed systems','cloud computing']],
        ['네트워크', '컴퓨터 네트워크', ['computer networks','network systems','인터넷','데이터센터 네트워크']],
        ['보안·암호', '컴퓨터 보안 암호', ['cybersecurity','computer security','cryptography','privacy']],
        ['소프트웨어공학', '소프트웨어공학', ['software engineering','program analysis','software testing']],
        ['알고리즘·이론', '알고리즘 이론 전산', ['algorithms','theoretical computer science','그래프 알고리즘','복잡도']],
        ['HCI·UX', 'HCI UX', ['human computer interaction','user experience','인터랙션 디자인']],
        ['그래픽스·VR·AR', '컴퓨터 그래픽스 VR AR', ['computer graphics','virtual reality','augmented reality','메타버스']],
        ['컴파일러·프로그래밍언어', '컴파일러 프로그래밍언어', ['compiler','programming languages','정적 분석']],
        ['AI 반도체·가속기', 'AI 반도체 하드웨어 가속기', ['AI accelerator','neural processing unit','NPU','hardware acceleration']]
      ]
    },
    {
      id: 'mechanical', label: '기계공학', note: '열유체, 구조, 제조와 모빌리티',
      fields: [
        ['열유체', '열유체', ['thermofluids','heat transfer','fluid mechanics','열전달','유체역학']],
        ['고체·구조역학', '고체역학 구조역학', ['solid mechanics','structural mechanics','재료역학']],
        ['설계·최적화', '기계 설계 최적화', ['mechanical design','design optimization','위상최적화']],
        ['제조·가공', '제조 가공', ['manufacturing','machining','적층제조','3D printing']],
        ['로봇', '로봇', ['robotics','manipulator','humanoid robot','산업용 로봇','로봇 제어']],
        ['자율주행', '자율주행', ['autonomous driving','ADAS','vehicle perception','자율주행 차량','모빌리티']],
        ['메카트로닉스', '메카트로닉스', ['mechatronics','actuator','모터','스마트 기계']],
        ['소음·진동', '소음 진동', ['noise vibration','NVH','acoustics','진동 제어']],
        ['바이오메카닉스', '바이오메카닉스', ['biomechanics','인체 운동','재활공학']],
        ['마이크로·나노시스템', '마이크로 나노 시스템', ['MEMS','microfluidics','microsystem','NEMS']],
        ['항공우주·추진', '항공우주 추진', ['aerospace','propulsion','항공기','우주 추진']]
      ]
    },
    {
      id: 'chemical-engineering', label: '화학공학', note: '반응, 분리, 공정과 지속가능 생산',
      fields: [
        ['반응공학', '화학 반응공학', ['reaction engineering','reactor design','반응기']],
        ['분리공정·막', '분리공정 막', ['separation process','membrane','흡착 분리','정제']],
        ['공정시스템·최적화', '화학공정 시스템 최적화', ['process systems engineering','process optimization','공정 제어']],
        ['촉매공정', '촉매 공정', ['catalytic process','heterogeneous catalysis','촉매 반응기']],
        ['고분자공정', '고분자 공정', ['polymer processing','고분자 반응공학','유변학']],
        ['바이오공정', '바이오 공정', ['bioprocess','발효','생물반응기','대사공학']],
        ['전기화학공정', '전기화학 공정', ['electrochemical engineering','전해공정','전극 공정']],
        ['탄소·수소공정', '탄소 수소 공정', ['carbon capture','hydrogen production','CO2 conversion']],
        ['공정안전', '화학 공정 안전', ['process safety','위험성 평가','공정 이상진단']],
        ['공정 데이터·AI', '화학공정 데이터 AI', ['process data analytics','digital twin','공정 머신러닝']]
      ]
    },
    {
      id: 'materials', label: '신소재공학', note: '금속, 세라믹, 전자와 에너지 소재',
      fields: [
        ['반도체 재료', '반도체 재료', ['semiconductor materials','전자재료','웨이퍼','박막 재료']],
        ['배터리 재료', '배터리 재료', ['battery materials','양극재','음극재','고체전해질']],
        ['금속재료', '금속 재료', ['metallurgy','metallic materials','합금','미세조직']],
        ['세라믹재료', '세라믹 재료', ['ceramic materials','산화물','비산화물 세라믹']],
        ['고분자재료', '고분자 재료', ['polymer materials','복합재','엘라스토머']],
        ['나노재료', '나노 재료', ['nanomaterials','nanostructure','나노입자','나노와이어']],
        ['전자·자성재료', '전자재료 자성재료', ['electronic materials','magnetic materials','스핀트로닉스']],
        ['광소재', '광학 재료', ['optical materials','photonic materials','발광 소재']],
        ['구조재료', '구조 재료', ['structural materials','고강도 재료','내열 재료']],
        ['계산재료', '계산 재료과학', ['computational materials science','materials informatics','DFT 재료']],
        ['표면·계면', '재료 표면 계면', ['surface science','interface','박막','코팅']]
      ]
    },
    {
      id: 'energy', label: '에너지·환경', note: '에너지 전환, 저장과 환경 문제',
      fields: [
        ['이차전지', '이차전지 배터리', ['rechargeable battery','리튬이온전지','전고체전지','전극']],
        ['수소·연료전지', '수소 연료전지', ['hydrogen','fuel cell','수전해','프로톤 전도']],
        ['태양전지', '태양전지', ['solar cell','photovoltaics','페로브스카이트 태양전지']],
        ['탄소포집·전환', '탄소 포집 전환', ['carbon capture','CO2 conversion','CCUS']],
        ['수처리·환경', '수처리 환경', ['water treatment','desalination','오염물질 제거','환경 정화']],
        ['에너지저장', '에너지 저장', ['energy storage','supercapacitor','열에너지 저장']],
        ['원자력·핵융합', '원자력 핵융합', ['nuclear energy','fusion energy','원자로']],
        ['열에너지', '열에너지', ['thermal energy','heat storage','열관리']],
        ['지속가능소재', '지속가능 소재', ['sustainable materials','재활용','업사이클링','바이오매스']],
        ['환경촉매', '환경 촉매', ['environmental catalysis','광촉매','대기오염 저감']]
      ]
    },
    {
      id: 'math', label: '수학·통계', note: '순수수학, 응용수학과 데이터 해석',
      fields: [
        ['대수학·정수론', '대수학 정수론', ['algebra','number theory','대수기하']],
        ['해석학', '해석학', ['analysis','functional analysis','편미분방정식']],
        ['기하·위상', '기하학 위상수학', ['geometry','topology','미분기하']],
        ['확률·통계', '확률 통계', ['probability','statistics','statistical inference']],
        ['수치해석', '수치해석', ['numerical analysis','scientific computing','수치 알고리즘']],
        ['최적화', '최적화 수학', ['optimization','operations research','convex optimization']],
        ['데이터과학', '데이터과학 통계', ['data science','statistical learning','고차원 데이터']],
        ['수리생물학', '수리생물학', ['mathematical biology','systems biology','생물 수학 모델']],
        ['금융수학', '금융수학', ['financial mathematics','stochastic process','리스크 모델']]
      ]
    },
    {
      id: 'biomedical', label: '의생명·바이오융합', note: '진단, 치료, 의료기기와 생체공학',
      fields: [
        ['바이오센서', '바이오센서', ['biosensor','bio sensing','진단 센서','랩온어칩']],
        ['의료영상', '의료영상', ['medical imaging','MRI','CT','초음파 영상']],
        ['생체재료', '생체 재료', ['biomaterials','implant','의료용 고분자']],
        ['조직공학·재생의학', '조직공학 재생의학', ['tissue engineering','regenerative medicine','오가노이드']],
        ['약물전달', '약물 전달', ['drug delivery','nanomedicine','약물 방출']],
        ['디지털헬스', '디지털 헬스', ['digital health','wearable healthcare','의료 AI']],
        ['바이오전자', '바이오 전자', ['bioelectronics','electronic skin','생체 신호 센서']],
        ['의료로봇', '의료 로봇', ['medical robotics','surgical robot','재활 로봇']],
        ['정밀의료·유전체', '정밀의료 유전체', ['precision medicine','clinical genomics','맞춤의료']],
        ['진단·치료융합', '진단 치료 융합', ['theranostics','molecular diagnostics','표적 치료']]
      ]
    }
  ];

  const MANUAL_EXPANSIONS = [
    ['반도체 공정', ['리소그래피','식각','증착','ALD','CVD','CMP','공정 집적','semiconductor process']],
    ['반도체 소자', ['MOSFET','트랜지스터','메모리 소자','나노전자소자','semiconductor device']],
    ['자율주행', ['autonomous driving','ADAS','vehicle perception','SLAM','모빌리티']],
    ['로봇', ['robotics','manipulator','humanoid','산업용 로봇','로봇 제어']],
    ['배터리', ['이차전지','리튬이온전지','전고체전지','전극','전해질','battery']],
    ['바이오센서', ['biosensor','진단 센서','랩온어칩','bio sensing']],
    ['의료영상', ['medical imaging','MRI','CT','초음파 영상']],
    ['양자컴퓨팅', ['quantum computing','qubit','큐비트','양자정보']],
    ['인공지능', ['artificial intelligence','machine learning','deep learning','AI']],
    ['머신러닝', ['machine learning','deep learning','인공지능']],
    ['포토닉스', ['photonics','nanophotonics','광소자','실리콘 포토닉스']],
    ['디스플레이', ['display','OLED','micro LED','디스플레이 소자']],
    ['전력전자', ['power electronics','인버터','전력 변환']],
    ['신호처리', ['signal processing','DSP','영상 신호처리']],
    ['통신', ['communications','wireless communication','5G','6G']],
    ['제어', ['control systems','제어이론','최적제어','비선형 제어']],
    ['유기화학', ['organic chemistry','organic synthesis','유기합성']],
    ['무기화학', ['inorganic chemistry','배위화학','금속 착물']],
    ['계산재료', ['computational materials science','materials informatics','DFT']],
    ['촉매', ['catalysis','catalyst','촉매 반응']],
    ['수처리', ['water treatment','desalination','환경 정화']],
    ['HCI', ['human computer interaction','UX','user experience']],
    ['컴퓨터비전', ['computer vision','영상 인식','visual recognition']],
    ['자연어처리', ['natural language processing','NLP','언어모델']],
    ['뇌 컴퓨터 인터페이스', ['brain computer interface','BCI','neural interface']]
  ];

  const STOP_TOKENS = new Set(['연구','연구실','랩실','교수','교수님','추천','소개','찾아줘','찾아주세요','원해','싶어','하는','관련','분야','대학원','대해서','학교','있는','해줘','해주세요','전공']);
  const BROAD_TOKENS = new Set(['ai','인공지능','화학','물리','재료','소재','에너지','바이오','생명','기계','전자','컴퓨터','시스템','데이터','나노','연구']);

  const state = { majorId: '', preset: null, results: [], visible: 12, lastQuery: '' };

  const els = {
    majorChips: document.getElementById('majorChips'),
    subfieldPanel: document.getElementById('subfieldPanel'),
    subfieldTitle: document.getElementById('subfieldTitle'),
    subfieldNote: document.getElementById('subfieldNote'),
    exampleChips: document.getElementById('exampleChips'),
    goalInput: document.getElementById('goalInput'),
    askButton: document.getElementById('askButton'),
    resetButton: document.getElementById('resetButton'),
    resultSummary: document.getElementById('resultSummary'),
    resultMeta: document.getElementById('resultMeta'),
    labList: document.getElementById('labList'),
    loadMore: document.getElementById('loadMore'),
    emptyState: document.getElementById('emptyState'),
    dbCount: document.getElementById('dbCount')
  };

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\s_/.,;:()[\]{}+|]+/g, ' ')
      .replace(/[^0-9a-z가-힣\- ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function unique(values) {
    const seen = new Set();
    return values.filter(function (value) {
      const key = normalize(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function tokenize(value) {
    return unique(normalize(value).split(' ').filter(function (token) {
      if (!token || STOP_TOKENS.has(token)) return false;
      if (/^[a-z0-9-]+$/.test(token)) return token.length >= 2;
      return token.length >= 2;
    }));
  }

  function flattenValues(values) {
    const out = [];
    (function walk(value) {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) { value.forEach(walk); return; }
      out.push(value);
    })(values);
    return out;
  }

  function textArray(values) {
    return flattenValues(values).map(normalize).filter(Boolean);
  }

  function prepareRecord(record) {
    const buckets = {
      positive: textArray([record.positiveQueries, record.aliasesKo, record.aliasesEn]),
      primary: textArray([record.primaryDomains, record.subfields]),
      visible: textArray([record.fields, record.labNames]),
      secondary: textArray([record.secondaryDomains]),
      methods: textArray([record.methods]),
      materials: textArray([record.materialsOrTargets]),
      applications: textArray([record.applications]),
      keywords: textArray([record.keywords]),
      weak: textArray([record.weakQueries]),
      negative: textArray([record.negativeQueries]),
      department: textArray([record.departments]),
      school: textArray([record.school])
    };
    return Object.assign({}, record, { _buckets: buckets });
  }

  const prepared = records.map(prepareRecord);

  function includesTerm(items, term) {
    if (!term) return false;
    return items.some(function (item) { return item.includes(term); });
  }

  function matchedDisplayTerms(record, queryTerms) {
    const fields = unique([
      ...(record.primaryDomains || []),
      ...(record.subfields || []),
      ...(record.fields || []),
      ...(record.methods || []),
      ...(record.materialsOrTargets || []),
      ...(record.applications || []),
      ...(record.keywords || [])
    ]);
    const hits = [];
    for (const term of queryTerms) {
      const found = fields.find(function (field) { return normalize(field).includes(term); });
      if (found && !hits.some(function (hit) { return normalize(hit) === normalize(found); })) hits.push(found);
      if (hits.length >= 4) break;
    }
    return hits;
  }

  function expandQuery(query, preset) {
    const original = normalize(query);
    const tokens = tokenize(query);
    const terms = [];
    if (original) terms.push({ value: original, weight: 1.35, original: true });
    tokens.forEach(function (token) { terms.push({ value: token, weight: 1, original: true }); });

    if (preset) {
      (preset.aliases || []).forEach(function (alias) {
        const n = normalize(alias);
        if (n) terms.push({ value: n, weight: .82, original: false });
      });
    } else {
      for (const [trigger, aliases] of MANUAL_EXPANSIONS) {
        if (!original.includes(normalize(trigger))) continue;
        aliases.forEach(function (alias) {
          const n = normalize(alias);
          if (n) terms.push({ value: n, weight: .68, original: false });
        });
      }
    }

    const seen = new Set();
    return terms.filter(function (term) {
      if (!term.value || seen.has(term.value)) return false;
      seen.add(term.value);
      return true;
    }).slice(0, 28);
  }

  function scoreRecord(record, terms) {
    const weights = {
      positive: 24,
      primary: 18,
      visible: 14,
      secondary: 10,
      methods: 8,
      materials: 8,
      applications: 8,
      keywords: 5,
      weak: 2.5,
      department: 1.5,
      school: 12
    };
    let score = 0;
    let strongHits = 0;
    const matchedTerms = [];
    let originalTokenHits = 0;

    for (const term of terms) {
      let factor = term.weight;
      if (BROAD_TOKENS.has(term.value)) factor *= .35;
      let termStrong = false;
      const matchedBuckets = [];
      for (const bucket of ['positive','primary','visible','secondary','methods','materials','applications','keywords','weak','department','school']) {
        if (!includesTerm(record._buckets[bucket], term.value)) continue;
        matchedBuckets.push(bucket);
        if (['positive','primary','visible'].includes(bucket)) termStrong = true;
      }
      if (matchedBuckets.length) {
        const bestWeight = Math.max.apply(null, matchedBuckets.map(function (bucket) { return weights[bucket]; }));
        const corroboration = Math.min(4, Math.max(0, matchedBuckets.length - 1) * 1.1);
        score += (bestWeight + corroboration) * factor;
      }
      if (includesTerm(record._buckets.negative, term.value)) score -= 20 * factor;
      if (termStrong) {
        strongHits += 1;
        if (!matchedTerms.includes(term.value)) matchedTerms.push(term.value);
        if (term.original && term.value.split(' ').length === 1) originalTokenHits += 1;
      }
    }

    const originalTokens = terms.filter(function (t) { return t.original && t.value.split(' ').length === 1; });
    if (originalTokens.length >= 2 && originalTokenHits >= Math.min(2, originalTokens.length)) score += 10;
    if (strongHits === 0) score *= .45;

    return { score, strongHits, matchedTerms };
  }

  function search(query, preset) {
    const terms = expandQuery(query, preset);
    if (!terms.length) return [];
    const queryTerms = terms.map(function (term) { return term.value; });
    const scored = [];

    for (const record of prepared) {
      const result = scoreRecord(record, terms);
      if (result.score < 7) continue;
      const relation = result.strongHits > 0 && result.score >= 15 ? 'direct' : 'adjacent';
      const evidence = matchedDisplayTerms(record, queryTerms);
      scored.push({ record, score: result.score, strongHits: result.strongHits, relation, evidence });
    }

    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.strongHits !== a.strongHits) return b.strongHits - a.strongHits;
      if (a.record.school !== b.record.school) return a.record.school.localeCompare(b.record.school, 'ko');
      return a.record.professor.localeCompare(b.record.professor, 'ko');
    });

    return scored.slice(0, 120);
  }

  function schoolClass(school) {
    if (school === 'DGIST') return 'school-dgist';
    if (school === '서울대학교') return 'school-snu';
    if (school === 'KAIST') return 'school-kaist';
    return 'school-postech';
  }

  function completeSummarySentence(value, record) {
    let text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) {
      const fallback = (record.fields || []).slice(0, 3).join(', ');
      text = fallback ? fallback + ' 관련 연구를 수행합니다.' : '공개된 연구 분야를 바탕으로 관련 연구를 수행합니다.';
    }

    text = text.replace(/[\s,;:·…]+$/g, '').replace(/\.+$/g, '');
    text = text
      .replace(/연구하며$/g, '연구합니다')
      .replace(/연구한다$/g, '연구합니다')
      .replace(/수행한다$/g, '수행합니다')
      .replace(/개발한다$/g, '개발합니다')
      .replace(/분석한다$/g, '분석합니다')
      .replace(/다룬다$/g, '다룹니다')
      .replace(/규명한다$/g, '규명합니다')
      .replace(/이다$/g, '입니다')
      .replace(/있다$/g, '있습니다');

    if (!/(합니다|입니다|됩니다|있습니다|없습니다|다룹니다|규명합니다|목표로 합니다)$/.test(text)) {
      if (text.includes(' 연구실:')) {
        text = text.replace(' 연구실:', ' 연구실은') + ' 분야를 연구합니다';
      } else if (/ 분야$/.test(text)) {
        text += '를 연구합니다';
      } else if (/ 연구$/.test(text)) {
        text += '를 수행합니다';
      } else {
        text += ' 관련 연구를 수행합니다';
      }
    }
    return text + '.';
  }

  function linkButtons(record) {
    const links = [];
    if (record.homepage) links.push('<a class="summary-link" href="' + escapeHtml(record.homepage) + '" target="_blank" rel="noopener noreferrer">연구실 홈페이지</a>');
    if (record.profileUrl && record.profileUrl !== record.homepage) links.push('<a class="profile-link" href="' + escapeHtml(record.profileUrl) + '" target="_blank" rel="noopener noreferrer">공식 프로필</a>');
    if (!links.length && Array.isArray(record.sources) && record.sources[0]) links.push('<a class="profile-link" href="' + escapeHtml(record.sources[0]) + '" target="_blank" rel="noopener noreferrer">공식 페이지</a>');
    return links.join('');
  }

  function cardHtml(item, index) {
    const record = item.record;
    const lab = record.labNames && record.labNames.length ? record.labNames[0] : '연구실명은 공식 프로필에서 확인';
    const departments = (record.departments || []).join(' · ') || '소속 학과 확인 필요';
    const fieldTags = unique([
      ...(item.evidence || []),
      ...(record.primaryDomains || []),
      ...(record.fields || [])
    ]).slice(0, 5);
    const summary = completeSummarySentence(record.summary, record);
    const relationText = item.relation === 'direct' ? '검색어 관련 결과' : '인접 분야 결과';
    const evidenceText = item.evidence.length ? item.evidence.slice(0, 3).join(', ') : fieldTags.slice(0, 3).join(', ');

    return '<article class="lab-card" data-rank="' + (index + 1) + '">' +
      '<div class="card-top">' +
        '<div class="badges"><span class="school-badge ' + schoolClass(record.school) + '">' + escapeHtml(record.school) + '</span><span class="relation-badge">' + relationText + '</span></div>' +
        '<span class="rank" aria-label="검색 결과 순서">' + (index + 1) + '</span>' +
      '</div>' +
      '<h3>' + escapeHtml(record.professor) + ' 교수님</h3>' +
      (record.professorEn ? '<p class="professor-en">' + escapeHtml(record.professorEn) + '</p>' : '') +
      '<p class="lab-name">' + escapeHtml(lab) + '</p>' +
      '<p class="affiliation"><strong>' + escapeHtml(record.school) + '</strong> · ' + escapeHtml(departments) + '</p>' +
      '<p class="summary">' + escapeHtml(summary) + '</p>' +
      (fieldTags.length ? '<div class="tag-row">' + fieldTags.map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('') + '</div>' : '') +
      (evidenceText ? '<div class="match-reason"><strong>매칭 근거</strong><span>' + escapeHtml(evidenceText) + '</span></div>' : '') +
      '<details><summary>세부 연구 정보</summary>' +
        '<dl>' +
          ((record.methods || []).length ? '<div><dt>주요 방법</dt><dd>' + escapeHtml(record.methods.slice(0, 6).join(', ')) + '</dd></div>' : '') +
          ((record.materialsOrTargets || []).length ? '<div><dt>연구 대상</dt><dd>' + escapeHtml(record.materialsOrTargets.slice(0, 6).join(', ')) + '</dd></div>' : '') +
          ((record.applications || []).length ? '<div><dt>응용 분야</dt><dd>' + escapeHtml(record.applications.slice(0, 5).join(', ')) + '</dd></div>' : '') +
        '</dl>' +
      '</details>' +
      '<div class="card-links">' + linkButtons(record) + '</div>' +
    '</article>';
  }

  function renderResults() {
    const total = state.results.length;
    const shown = state.results.slice(0, state.visible);
    els.labList.innerHTML = shown.map(cardHtml).join('');
    els.loadMore.hidden = state.visible >= total;
    els.emptyState.hidden = total > 0;

    if (!total) {
      els.resultSummary.textContent = state.lastQuery ? '검색어와 직접 연결되는 결과를 찾지 못했습니다.' : '분야를 선택하거나 연구 키워드를 검색해 주세요.';
      els.resultMeta.textContent = state.lastQuery ? '표현을 더 구체적으로 바꾸거나 인접한 세부 분야를 선택해 보세요.' : '네 대학의 연구실을 학교 구분 없이 한 번에 비교할 수 있습니다.';
      return;
    }

    const counts = {};
    state.results.forEach(function (item) { counts[item.record.school] = (counts[item.record.school] || 0) + 1; });
    els.resultSummary.textContent = '“' + state.lastQuery + '” 관련 상위 결과 ' + total + '명';
    els.resultMeta.textContent = ['DGIST','서울대학교','KAIST','POSTECH'].filter(function (school) { return counts[school]; }).map(function (school) { return school + ' ' + counts[school] + '명'; }).join(' · ') + ' · 검색어 관련도 순서';
  }

  function executeSearch(query, preset) {
    const value = String(query || '').trim();
    if (!value) {
      els.goalInput.focus();
      return;
    }
    state.lastQuery = value;
    state.preset = preset || null;
    state.results = search(value, preset);
    state.visible = 12;
    renderResults();
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderMajors() {
    els.majorChips.innerHTML = MAJORS.map(function (major) {
      return '<button type="button" class="major-chip" data-major="' + major.id + '"><strong>' + major.label + '</strong><span>' + major.note + '</span></button>';
    }).join('');
  }

  function selectMajor(id) {
    const major = MAJORS.find(function (item) { return item.id === id; });
    if (!major) return;
    state.majorId = id;
    document.querySelectorAll('.major-chip').forEach(function (button) { button.classList.toggle('is-active', button.dataset.major === id); });
    els.subfieldTitle.textContent = major.label + ' 세부 분야';
    els.subfieldNote.textContent = '서로 다른 연구 주제를 묶지 않고 세부 분야별로 나눴습니다. 원하는 분야를 누르면 네 대학을 통합 검색합니다.';
    els.exampleChips.innerHTML = major.fields.map(function (field) {
      const label = field[0], query = field[1];
      return '<button type="button" class="field-chip" data-query="' + escapeHtml(query) + '" data-major="' + major.id + '" data-label="' + escapeHtml(label) + '">' + escapeHtml(label) + '</button>';
    }).join('');
    els.subfieldPanel.hidden = false;
    els.subfieldPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resetAll() {
    state.majorId = '';
    state.preset = null;
    state.results = [];
    state.visible = 12;
    state.lastQuery = '';
    els.goalInput.value = '';
    els.subfieldPanel.hidden = true;
    document.querySelectorAll('.major-chip').forEach(function (button) { button.classList.remove('is-active'); });
    renderResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  els.majorChips.addEventListener('click', function (event) {
    const button = event.target.closest('.major-chip');
    if (!button) return;
    selectMajor(button.dataset.major);
  });

  els.exampleChips.addEventListener('click', function (event) {
    const button = event.target.closest('.field-chip');
    if (!button) return;
    const major = MAJORS.find(function (item) { return item.id === button.dataset.major; });
    const field = major && major.fields.find(function (item) { return item[0] === button.dataset.label; });
    const preset = field ? { label: field[0], aliases: field[2] || [] } : null;
    els.goalInput.value = button.dataset.query || button.textContent.trim();
    executeSearch(els.goalInput.value, preset);
  });

  els.askButton.addEventListener('click', function () { executeSearch(els.goalInput.value, null); });
  els.resetButton.addEventListener('click', resetAll);
  els.loadMore.addEventListener('click', function () { state.visible += 12; renderResults(); });
  els.goalInput.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') executeSearch(els.goalInput.value, null);
  });

  if (els.dbCount) els.dbCount.textContent = Number(payload.meta.totalRecords || records.length).toLocaleString('ko-KR');
  renderMajors();
  renderResults();

  window.FieldLabMatch = Object.freeze({
    search: function (query) { return search(query, null).map(function (item) { return { professor: item.record.professor, school: item.record.school, departments: item.record.departments, score: item.score }; }); },
    searchPreset: function (query, aliases) { return search(query, { label: query, aliases: aliases || [] }).map(function (item) { return { professor: item.record.professor, school: item.record.school, departments: item.record.departments, score: item.score }; }); },
    majors: MAJORS,
    totalRecords: records.length
  });
})();
