const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = process.argv[2];
if (!root) throw new Error('project root required');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'graduate/dgist/brain-curated-db.js'), 'utf8'), context);
global.window = context.window;
const engine = require(path.join(root, 'graduate/dgist/brain-search-engine.js'));
const esc = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const rows=[['professor','query','rank','result_count','top5','top10','results']];
let total=0, top1=0, top3=0, top5=0, top10=0, missing=0;
for (const p of engine.profiles()) {
  for (const term of p.directTerms || []) {
    total++;
    const results=engine.search(term,{limit:10}).map(x=>x.profile.professor);
    const idx=results.indexOf(p.professor);
    const rank=idx<0?'':idx+1;
    if(idx===0)top1++;
    if(idx>=0&&idx<3)top3++;
    if(idx>=0&&idx<5)top5++;
    if(idx>=0&&idx<10)top10++;
    if(idx<0)missing++;
    rows.push([p.professor,term,rank,results.length,idx>=0&&idx<5?'PASS':'FAIL',idx>=0&&idx<10?'PASS':'FAIL',results.join('|')]);
  }
}
const summary={total,top1,top3,top5,top10,missing,top1Rate:top1/total,top3Rate:top3/total,top5Rate:top5/total,top10Rate:top10/total};
fs.writeFileSync(path.join(root,'DGIST_BRAIN_SEARCH_REGRESSION.csv'),'\ufeff'+rows.map(r=>r.map(esc).join(',')).join('\n'));
fs.writeFileSync(path.join(root,'DGIST_BRAIN_SEARCH_REGRESSION_SUMMARY.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));
if(missing>0)process.exit(1);
