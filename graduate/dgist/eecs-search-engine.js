(function (root, factory) {
  const api = factory(root && root.DGIST_EECS_CURATED_DB);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DGISTEecsSearchEngine = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (db) {
  "use strict";
  db = db || { profiles: [], fields: [], bannerMap: {}, intentDefinitions: [] };

  const STOP = new Set(["교수","교수님","연구","연구실","랩","랩실","추천","소개","찾아줘","관련","분야","하는","하시는","하고","싶어","싶습니다","dgist","디지스트","전기전자컴퓨터공학과","전전컴"]);
  const BROAD_INTENTS = new Set(["ai-ml","signal-processing","communication-network","bioelectronics","autonomous-control"]);

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
    const seen = new Set(), out = [];
    (items || []).forEach((item) => { const key = normalize(item); if (key && !seen.has(key)) { seen.add(key); out.push(item); } });
    return out;
  }
  function profiles() {
    return (db.profiles || []).map((profile, index) => {
      const strongTerms = unique([...(profile.directTerms || []), ...(profile.officialFields || [])]);
      const relatedTerms = unique(profile.relatedTerms || []);
      return { ...profile, index, strongTerms, relatedTerms, searchText: normalize([profile.professor, profile.labName, ...strongTerms, ...relatedTerms].join(" ")) };
    });
  }
  const profileCache = profiles();
  function detectIntents(query) {
    const found=[];
    (db.intentDefinitions || []).forEach((intent) => {
      const hits=(intent.aliases || []).filter((alias)=>contains(query,alias));
      if (hits.length) found.push({id:intent.id,hits});
    });
    return found;
  }
  function meaningfulTokens(query) {
    return unique(normalize(query).split(/\s+/).filter((t)=>{
      if (!t || STOP.has(t)) return false;
      if (/^[a-z0-9]+$/i.test(t)) return t.length >= 3;
      return t.length >= 2;
    }));
  }
  function intentMatch(profile,id){ return (profile.intents || []).includes(id); }
  function termHits(profile,query){
    return {
      strong: unique((profile.strongTerms || []).filter((term)=>contains(query,term)||contains(term,query))),
      related: unique((profile.relatedTerms || []).filter((term)=>contains(query,term)||contains(term,query)))
    };
  }
  function scoreProfile(profile, query) {
    const q=normalize(query); if(!q) return null;
    const intents=detectIntents(q);
    const specific=intents.filter((x)=>!BROAD_INTENTS.has(x.id));
    const broad=intents.filter((x)=>BROAD_INTENTS.has(x.id));
    const specificMatched=specific.filter((x)=>intentMatch(profile,x.id));
    const broadMatched=broad.filter((x)=>intentMatch(profile,x.id));
    const hits=termHits(profile,q);
    const exactStrong = hits.strong.some((term) => normalize(term) === q);
    const tokens=meaningfulTokens(q);
    const tokenHits=tokens.filter((token)=>contains(profile.searchText,token));

    if (contains(q,profile.professor)) return {profile,score:100000,evidence:[profile.professor,...(profile.officialFields||[]).slice(0,3)],coverage:1,intentIds:intents.map(x=>x.id)};

    // 두 개 이상의 인식된 개념을 함께 입력한 경우 모두 만족해야 합니다.
    // 예: "초음파 신호처리", "의료영상 AI"는 한쪽 단어만 맞는 연구실을 제외합니다.
    const allMatched = intents.filter((x) => intentMatch(profile, x.id));
    if (!exactStrong && intents.length >= 2 && allMatched.length < intents.length) return null;
    if (!exactStrong && specific.length && specificMatched.length < specific.length) return null;

    if (!specific.length && !broad.length) {
      const required=tokens.length <= 2 ? tokens.length : Math.ceil(tokens.length*0.67);
      if (required && tokenHits.length < required && !hits.strong.length) return null;
      if (!hits.strong.length && !tokenHits.length) return null;
    }
    if (!specific.length && broad.length && !broadMatched.length && !hits.strong.length) return null;

    let score=0;
    score += specificMatched.length*1800;
    score += broadMatched.length*420;
    score += hits.strong.length*420;
    score += hits.related.length*90;
    score += tokenHits.length*140;
    if (specific.length && specificMatched.length===specific.length) score += 800;
    [...specificMatched,...broadMatched].forEach((item)=>{
      const order=((db.intentPriority||{})[item.id]||[]);
      const rank=order.indexOf(profile.professor);
      if(rank>=0) score += Math.max(160,1100-rank*140);
    });
    if (contains(profile.labName,q)) score += 500;
    if (exactStrong) score += 1200;
    if (score < (specific.length ? 900 : 220)) return null;

    const evidence=unique([...specificMatched.flatMap(x=>x.hits),...hits.strong,...tokenHits,...hits.related]).slice(0,5);
    return {profile,score,evidence:evidence.length?evidence:(profile.officialFields||[]).slice(0,3),coverage:tokens.length?tokenHits.length/tokens.length:1,intentIds:intents.map(x=>x.id)};
  }
  function search(query,options){
    options=options||{};
    const scored=profileCache.map((p)=>scoreProfile(p,query)).filter(Boolean)
      .sort((a,b)=>b.score-a.score||b.coverage-a.coverage||a.profile.index-b.profile.index);
    const limit=Number.isFinite(options.limit)?options.limit:10;
    return scored.slice(0,Math.max(1,limit));
  }
  function banner(fieldKey){
    const order=(db.bannerMap||{})[fieldKey]||[];
    const byName=new Map(profileCache.map((p)=>[p.professor,p]));
    const label=((db.fields||[]).find((f)=>f[2]===fieldKey)||[])[0]||fieldKey;
    return order.map((name,index)=>({profile:byName.get(name),score:100000-index*1000,evidence:[label],coverage:1,intentIds:[fieldKey]})).filter(x=>x.profile);
  }
  function evidenceForProfessor(query,professor){
    const item=search(query,{limit:38}).find((r)=>r.profile.professor===professor);
    return item?item.evidence:[];
  }
  return {version:db.version,db,normalize,contains,profiles:()=>profileCache,detectIntents,search,banner,evidenceForProfessor};
});
