(function () {
  'use strict';

  // Privacy-preserving local query assistance.
  // The original query and expanded query stay in the browser and are never
  // included in analytics event names or titles.
  const RULES = [
    {
      intent: 'semiconductor',
      label: '반도체·전자',
      aliases: ['반도체', 'cmos', 'mosfet', '트랜지스터', '패키징', '칩렛', 'chiplet', 'vlsi', 'soc', '집적회로'],
      canonical: '반도체 소자 공정 박막 트랜지스터 집적회로'
    },
    {
      intent: 'battery',
      label: '배터리·전기화학',
      aliases: ['배터리', '이차전지', '전고체', '리튬전지', '리튬이온', '고체전해질'],
      canonical: '배터리 이차전지 전기화학 전극 전해질 에너지저장'
    },
    {
      intent: 'ai-data',
      label: 'AI·데이터',
      aliases: ['ai', '인공지능', '머신러닝', '딥러닝', '컴퓨터비전', 'computer vision', 'nlp', 'llm', '자연어처리'],
      canonical: '인공지능 머신러닝 딥러닝 데이터 컴퓨터비전 알고리즘'
    },
    {
      intent: 'bio-medical',
      label: '바이오·의료',
      aliases: ['바이오', '생명과학', '의료영상', '뇌과학', '신경공학', '바이오센서', '헬스케어', '세포생물학'],
      canonical: '바이오 생명과학 의료 신경공학 바이오센서 세포 분자'
    },
    {
      intent: 'photonics-display',
      label: '광학·디스플레이',
      aliases: ['광학', '포토닉스', '광전소자', '디스플레이', 'oled', '레이저', 'photonics'],
      canonical: '광학 포토닉스 광전소자 레이저 디스플레이 이미징'
    },
    {
      intent: 'robotics-control',
      label: '로봇·제어',
      aliases: ['로봇', '자율주행', '드론', '모빌리티', '매니퓰레이터', 'robotics'],
      canonical: '로봇 제어 자율주행 센서 모션 메카트로닉스'
    },
    {
      intent: 'hci-ux',
      label: 'HCI·UX',
      aliases: ['hci', 'ux', 'ui', 'vr', 'ar', '인터랙션', '사용자경험'],
      canonical: 'HCI UX 인터랙션 사용자경험 가상현실 증강현실'
    },
    {
      intent: 'quantum',
      label: '양자',
      aliases: ['양자', 'quantum', '큐비트', 'qubit'],
      canonical: '양자컴퓨팅 양자정보 양자소자 양자광학 양자시뮬레이션'
    },
    {
      intent: 'computer-systems',
      label: '컴퓨터·시스템',
      aliases: ['컴퓨터', '전산', '소프트웨어', '정보보안', '컴파일러', '운영체제', '임베디드', '통신', '네트워크'],
      canonical: '컴퓨터 시스템 소프트웨어 알고리즘 네트워크 임베디드 보안'
    },
    {
      intent: 'materials-chemistry',
      label: '소재·화학',
      aliases: ['소재', '재료', '화학', '고분자', '촉매', '나노소재', '세라믹'],
      canonical: '소재 재료 화학 나노소재 고분자 촉매 합성 분석'
    },
    {
      intent: 'energy-environment',
      label: '에너지·환경',
      aliases: ['에너지', '환경', '수소', '연료전지', '태양전지', '탄소중립', '전기화학'],
      canonical: '에너지 환경 수소 연료전지 태양전지 전기화학 탄소'
    },
    {
      intent: 'mechanical-aerospace',
      label: '기계·항공우주',
      aliases: ['기계', '항공우주', '열유체', '유체역학', '로켓', '추진', 'aerospace'],
      canonical: '기계 로봇 제어 열유체 구조 설계 제조 항공우주 추진'
    }
  ];

  const BY_INTENT = Object.fromEntries(RULES.map(function (rule) { return [rule.intent, rule]; }));
  let lastApplied = null;

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\s_/.,;:()[\]{}+]+/g, ' ')
      .trim();
  }

  function termMatches(text, term) {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return false;
    const shortAscii = /^[a-z0-9]+$/.test(normalizedTerm) && normalizedTerm.length <= 3;
    if (shortAscii) {
      const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[^a-z0-9])' + escaped + '([^a-z0-9]|$)').test(text);
    }
    return text === normalizedTerm || text.includes(normalizedTerm);
  }

  function matchingRules(query) {
    const text = normalize(query);
    if (!text) return [];
    return RULES.filter(function (rule) {
      return rule.aliases.some(function (alias) { return termMatches(text, alias); });
    });
  }

  function queryLengthBucket(value) {
    const length = String(value || '').trim().length;
    if (!length) return 'empty';
    if (length <= 10) return 'short';
    if (length <= 30) return 'medium';
    return 'long';
  }

  function preview(query) {
    const raw = String(query || '').trim();
    const bucket = queryLengthBucket(raw);
    const matches = matchingRules(raw);
    // Only one high-confidence field and a short query are automatically expanded.
    // Multi-field and longer natural-language queries are left untouched.
    const applied = bucket === 'short' && matches.length === 1;
    const rule = applied ? matches[0] : null;
    return {
      original: raw,
      query: applied ? (raw + ' ' + rule.canonical).trim() : raw,
      applied: applied,
      intent: rule ? rule.intent : 'other',
      label: rule ? rule.label : '',
      bucket: bucket
    };
  }

  function expand(query) {
    return preview(query);
  }

  function canonical(intent) {
    return BY_INTENT[intent] ? BY_INTENT[intent].canonical : '';
  }

  function label(intent) {
    return BY_INTENT[intent] ? BY_INTENT[intent].label : intent;
  }

  function recoveryOptions(intent) {
    const common = ['semiconductor', 'ai-data', 'bio-medical', 'robotics-control', 'materials-chemistry', 'energy-environment'];
    const adjacent = {
      semiconductor: ['semiconductor', 'materials-chemistry', 'photonics-display', 'computer-systems'],
      battery: ['battery', 'materials-chemistry', 'energy-environment', 'semiconductor'],
      'ai-data': ['ai-data', 'computer-systems', 'robotics-control', 'hci-ux'],
      'bio-medical': ['bio-medical', 'ai-data', 'materials-chemistry', 'robotics-control'],
      'photonics-display': ['photonics-display', 'semiconductor', 'materials-chemistry', 'quantum'],
      'robotics-control': ['robotics-control', 'mechanical-aerospace', 'ai-data', 'computer-systems'],
      'hci-ux': ['hci-ux', 'ai-data', 'computer-systems', 'robotics-control'],
      quantum: ['quantum', 'photonics-display', 'semiconductor', 'materials-chemistry'],
      'computer-systems': ['computer-systems', 'ai-data', 'semiconductor', 'robotics-control'],
      'materials-chemistry': ['materials-chemistry', 'energy-environment', 'battery', 'semiconductor'],
      'energy-environment': ['energy-environment', 'battery', 'materials-chemistry', 'mechanical-aerospace'],
      'mechanical-aerospace': ['mechanical-aerospace', 'robotics-control', 'energy-environment', 'materials-chemistry']
    };
    const intents = adjacent[intent] || common;
    return intents.filter(function (name) { return BY_INTENT[name]; }).map(function (name) {
      return { intent: name, label: BY_INTENT[name].label, query: BY_INTENT[name].canonical };
    });
  }

  function markApplied(intent) {
    lastApplied = { intent: String(intent || 'other'), at: Date.now() };
  }

  function clearApplied() {
    lastApplied = null;
  }

  function consumeApplied(since) {
    if (!lastApplied) return null;
    const item = lastApplied;
    if (Number(since || 0) && item.at + 100 < Number(since)) { lastApplied = null; return null; }
    if (Date.now() - item.at > 5000) { lastApplied = null; return null; }
    lastApplied = null;
    return item;
  }

  window.LMQueryAssist = Object.freeze({
    preview: preview,
    expand: expand,
    canonical: canonical,
    label: label,
    recoveryOptions: recoveryOptions,
    queryLengthBucket: queryLengthBucket,
    markApplied: markApplied,
    clearApplied: clearApplied,
    consumeApplied: consumeApplied
  });
})();
