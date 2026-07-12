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
const cases = [
  ['회로설계',['이정협','김가인'],[],6],
  ['컴퓨터구조',['이효근'],[],4],
  ['임베디드',['김백규','좌훈승'],[],7],
  ['IoT',['김백규','송민영'],[],7],
  ['메모리 반도체',['최상현','윤종혁'],['장진호','황재윤','길현재'],6],
  ['뉴로모픽',['최상현','윤종혁','장재은'],['장진호','황재윤','이병권'],5],
  ['머신러닝',['목지수','박대희','배인환'],[],10],
  ['AI',['목지수','소진현'],[],10],
  ['멀티모달',['목지수','윤성훈','박대희'],[],8],
  ['신호처리',['최지웅','최재호'],[],10],
  ['운영체제',['좌훈승'],[],6],
  ['초음파',['장진호','황재윤'],['권혁준','윤종혁','김경대'],2],
  ['정보보안',['김영식','최원석'],['장진호','황재윤'],7],
  ['컴퓨터비전',['배인환','박대희'],[],3],
  ['HCI',['길현재','김선준'],[],2],
  ['UX',['길현재','김선준'],[],2],
  ['의료영상',['장진호','황재윤','이민선'],[],8],
  ['초음파 신호처리',['장진호','황재윤'],[],2],
  ['의료영상 AI',['장진호','황재윤','이민선'],[],6],
  ['IoT 회로설계',['송민영'],[],3],
  ['메모리 반도체 회로설계',['윤종혁'],['장진호','황재윤'],3]
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
fs.writeFileSync(path.join(root,'DGIST_EECS_CRITICAL_QUERY_VALIDATION.csv'), '\ufeff' + rows.map(row=>row.map(esc).join(',')).join('\n'));
fs.writeFileSync(path.join(root,'DGIST_EECS_CRITICAL_QUERY_VALIDATION_SUMMARY.json'), JSON.stringify(summary,null,2));
if (pass !== cases.length || bannerFailures.length) {
  console.error(JSON.stringify(summary,null,2));
  process.exit(1);
}
console.log(JSON.stringify(summary));
