const fs=require('fs'),vm=require('vm');
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2],"utf8"),ctx);
vm.runInContext(fs.readFileSync(process.argv[3],"utf8"),ctx);
const e=ctx.window.DGISTNewBiologySearchEngine;
const critical=["환경응답","크로마틴","단백질 분해","노화","세포노화","식물 노화","노화 대사","면역노화","DNA 복구","암 후성유전학","프로테오믹스","단분자 생물물리","전자약","식물 면역","단백질공학","줄기세포","오가노이드","뇌면역","행동생태","피부생물학"];
const c=critical.map(q=>({query:q,results:e.search(q,{limit:20}).map(x=>x.profile.professor),evidence:e.search(q,{limit:20}).map(x=>x.evidence)}));
const r=[];for(const p of e.profiles()){for(const q of p.directTerms){const x=e.search(q,{limit:30}),rank=x.findIndex(z=>z.profile.professor===p.professor)+1;r.push({professor:p.professor,query:q,rank:rank||null,result_count:x.length,top5:x.slice(0,5).map(z=>z.profile.professor)});}}
const b=(e.db.fields||[]).map(f=>({label:f[0],key:f[2],results:e.banner(f[2]).map(x=>x.profile.professor)}));
console.log(JSON.stringify({critical:c,regression:r,banners:b}));