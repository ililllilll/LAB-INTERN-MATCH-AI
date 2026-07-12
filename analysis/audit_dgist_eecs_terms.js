const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = process.argv[2];
if (!root) throw new Error('project root required');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'graduate/dgist/eecs-curated-db.js'), 'utf8'), context);
global.window = context.window;
const engine = require(path.join(root, 'graduate/dgist/eecs-search-engine.js'));
const esc = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const regression = [['교수명','직접 검색어','해당 교수 순위','상위 3명','상위 5명','결과 수','포함 여부']];
let total=0, top1=0, top3=0, top5=0, top10=0, missing=0;
for (const profile of engine.profiles()) {
  for (const term of profile.directTerms || []) {
    if (String(term).trim().length < 2) continue;
    const results = engine.search(term, {limit:10}).map(item=>item.profile.professor);
    const index = results.indexOf(profile.professor);
    total += 1;
    if (index === 0) top1 += 1;
    if (index >= 0 && index < 3) top3 += 1;
    if (index >= 0 && index < 5) top5 += 1;
    if (index >= 0 && index < 10) top10 += 1;
    if (index < 0) missing += 1;
    regression.push([profile.professor,term,index>=0?index+1:'',results.slice(0,3).join(' | '),results.slice(0,5).join(' | '),results.length,index>=0?'Y':'N']);
  }
}
const summary={total,top1,top3,top5,top10,missing,top1Rate:top1/total,top3Rate:top3/total,top5Rate:top5/total,top10Rate:top10/total};
fs.writeFileSync(path.join(root,'DGIST_EECS_SEARCH_REGRESSION.csv'),'\ufeff'+regression.map(row=>row.map(esc).join(',')).join('\n'));
fs.writeFileSync(path.join(root,'DGIST_EECS_SEARCH_REGRESSION_SUMMARY.json'),JSON.stringify(summary,null,2));

const audit=[['교수명','연구실명','공식 핵심 분야','의도 분류','직접 검색어','관련 검색어','공식 근거 URL']];
for(const p of engine.profiles()) audit.push([p.professor,p.labName,(p.officialFields||[]).join(' | '),(p.intents||[]).join(' | '),(p.directTerms||[]).join(' | '),(p.relatedTerms||[]).join(' | '),(p.sourceUrls||[]).join(' | ')]);
fs.writeFileSync(path.join(root,'DGIST_EECS_CURATED_DB_AUDIT.csv'),'\ufeff'+audit.map(row=>row.map(esc).join(',')).join('\n'));
console.log(JSON.stringify(summary));
if(missing) process.exit(1);
