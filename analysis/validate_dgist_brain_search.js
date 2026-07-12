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

const cases = [
  ['학습 기억',['박포정','현정호'],[],5],
  ['BMI',['이광'],['유우경','현정호'],2],
  ['계산신경과학',['유우경','이광'],[],5],
  ['축삭재생',['조용철'],[],2],
  ['신경회로',['고재원','이광','김규형','김민환'],[],10],
  ['후각',['문제일'],['최한경','이효상'],3],
  ['생체리듬',['최한경'],[],2],
  ['뇌대사',['김은경'],['이석규'],2],
  ['이온채널',['서병창','정한빈'],[],4],
  ['전기생리',['서병창','김민환','박포정'],[],5],
  ['구조생물학',['정한빈','유우경'],[],4],
  ['미세플라스틱',['이석규'],[],2],
  ['우울증',['오용석'],[],5],
  ['시냅스',['박포정','고재원','엄지원'],[],7],
  ['운동회로',['백명인'],[],3]
];
const rows = [['query','count','results','must','missing','forbidden','max','pass']];
let pass = 0;
for (const [query, must, forbidden, max] of cases) {
  const results = engine.search(query, {limit: 10}).map(item => item.profile.professor);
  const missing = must.filter(name => !results.includes(name));
  const bad = forbidden.filter(name => results.includes(name));
  const ok = missing.length === 0 && bad.length === 0 && results.length <= max && results.length > 0;
  if (ok) pass += 1;
  rows.push([query,results.length,results.join('|'),must.join('|'),missing.join('|'),bad.join('|'),max,ok?'PASS':'FAIL']);
}
const bannerFailures = [];
for (const [key] of Object.entries(engine.db.bannerMap || {})) {
  const results = engine.banner(key);
  if (!results.length) bannerFailures.push(key);
  if (results.length > 10) bannerFailures.push(`${key}:too-many:${results.length}`);
}
const summary = {pass,total:cases.length,banners:Object.keys(engine.db.bannerMap||{}).length,bannerFailures};
fs.writeFileSync(path.join(root,'DGIST_BRAIN_CRITICAL_QUERY_VALIDATION.csv'), '\ufeff' + rows.map(row=>row.map(esc).join(',')).join('\n'));
fs.writeFileSync(path.join(root,'DGIST_BRAIN_CRITICAL_QUERY_VALIDATION_SUMMARY.json'), JSON.stringify(summary,null,2));
if (pass !== cases.length || bannerFailures.length) {
  console.error(JSON.stringify(summary,null,2));
  process.exit(1);
}
console.log(JSON.stringify(summary));
