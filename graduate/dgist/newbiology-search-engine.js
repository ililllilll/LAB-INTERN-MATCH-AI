(function (root, factory) {
  const api = factory(root && root.DGIST_NEWBIOLOGY_CURATED_DB);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DGISTNewBiologySearchEngine = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (db) {
  "use strict";
  db = db || { profiles: [], fields: [], bannerMap: {}, intentDefinitions: [] };
  const STOP = new Set(["교수","교수님","연구","연구실","랩","랩실","추천","소개","찾아줘","관련","분야","하는","하시는","하고","싶어","싶습니다","dgist","디지스트","뉴바이올로지학과","뉴바이올로지","생명과학"]);
  const BROAD = new Set(["cancer","immunity","aging-human","protein-structure","protein-engineering","omics","metabolism","physiology","drug-discovery","epigenetics"]);
  function normalize(v){return String(v||"").normalize("NFKC").toLowerCase().replace(/[·•,/()\[\]{}:;_|]+/g," ").replace(/[-–—]+/g," ").replace(/\s+/g," ").trim();}
  function esc(v){return String(v).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
  function contains(text,term){const s=normalize(text),n=normalize(term);if(!s||!n)return false;if(/^[a-z0-9+.#]+$/i.test(n)&&n.length<=4)return new RegExp(`(^|[^a-z0-9])${esc(n)}([^a-z0-9]|$)`,`i`).test(s);return s.includes(n);}
  function unique(a){const seen=new Set(),out=[];(a||[]).forEach(x=>{const k=normalize(x);if(k&&!seen.has(k)){seen.add(k);out.push(x);}});return out;}
  const profiles=(db.profiles||[]).map((p,index)=>{const strong=unique([...(p.directTerms||[]),...(p.officialFields||[])]),related=unique(p.relatedTerms||[]);return {...p,index,strongTerms:strong,relatedTerms:related,searchText:normalize([p.professor,p.labName,...strong,...related].join(" "))};});
  function detectIntents(query){const q=normalize(query),plant=/(식물|plant|에코플랜트)/.test(q),found=[];(db.intentDefinitions||[]).forEach(i=>{if(plant&&i.id==="aging-human")return;const hits=(i.aliases||[]).filter(a=>contains(q,a));if(hits.length)found.push({id:i.id,hits});});return found;}
  function tokens(q){return unique(normalize(q).split(/\s+/).filter(t=>t&&!STOP.has(t)&&( /^[a-z0-9]+$/i.test(t)?t.length>=2:t.length>=2)));}
  function hitIntent(p,id){return (p.intents||[]).includes(id);}
  function termHits(p,q){return {strong:unique((p.strongTerms||[]).filter(t=>contains(q,t)||contains(t,q))),related:unique((p.relatedTerms||[]).filter(t=>contains(q,t)||contains(t,q)))};}
  function scoreProfile(p,query){const q=normalize(query);if(!q)return null;if(contains(q,p.professor))return {profile:p,score:100000,evidence:[p.professor,...(p.officialFields||[]).slice(0,3)],coverage:1,intentIds:[]};
    const intents=detectIntents(q),specific=intents.filter(x=>!BROAD.has(x.id)),broad=intents.filter(x=>BROAD.has(x.id)),sm=specific.filter(x=>hitIntent(p,x.id)),bm=broad.filter(x=>hitIntent(p,x.id)),hits=termHits(p,q),exact=hits.strong.some(t=>normalize(t)===q),ts=tokens(q),th=ts.filter(t=>contains(p.searchText,t));
    if(!exact&&specific.length&&sm.length<specific.length)return null;
    // 복합 검색은 서로 다른 핵심 개념을 모두 만족해야 한다. 예: 식물 면역, 노화 대사, 단백질 분해.
    if(!exact&&intents.length>=2&&intents.filter(x=>hitIntent(p,x.id)).length<intents.length)return null;
    if(!specific.length&&!broad.length){const required=ts.length<=2?ts.length:Math.ceil(ts.length*.67);if(required&&th.length<required&&!hits.strong.length)return null;if(!hits.strong.length&&!th.length)return null;}
    if(!specific.length&&broad.length&&!bm.length&&!exact)return null;
    let score=sm.length*2000+bm.length*420+hits.strong.length*560+hits.related.length*60+th.length*140;
    if(specific.length&&sm.length===specific.length)score+=900;
    [...sm,...bm].forEach(x=>{const order=(db.intentPriority||{})[x.id]||[],r=order.indexOf(p.professor);if(r>=0)score+=Math.max(180,1400-r*150);});
    if(contains(p.labName,q))score+=500;if(exact)score+=1800;if(score<(specific.length?900:260))return null;
    const evidence=unique([...sm.flatMap(x=>x.hits),...bm.flatMap(x=>x.hits),...hits.strong,...th,...hits.related]).slice(0,5);
    return {profile:p,score,evidence:evidence.length?evidence:(p.officialFields||[]).slice(0,3),coverage:ts.length?th.length/ts.length:1,intentIds:intents.map(x=>x.id)};}
  function search(q,opt){opt=opt||{};const limit=Number.isFinite(opt.limit)?opt.limit:10;return profiles.map(p=>scoreProfile(p,q)).filter(Boolean).sort((a,b)=>b.score-a.score||b.coverage-a.coverage||a.profile.index-b.profile.index).slice(0,Math.max(1,limit));}
  function banner(key){const order=(db.bannerMap||{})[key]||[],map=new Map(profiles.map(p=>[p.professor,p])),label=((db.fields||[]).find(f=>f[2]===key)||[])[0]||key;return order.map((n,i)=>({profile:map.get(n),score:100000-i*1000,evidence:[label],coverage:1,intentIds:[key]})).filter(x=>x.profile);}
  function evidenceForProfessor(q,n){const x=search(q,{limit:40}).find(r=>r.profile.professor===n);return x?x.evidence:[];}
  return {version:db.version,db,normalize,contains,profiles:()=>profiles,detectIntents,search,banner,evidenceForProfessor};
});
