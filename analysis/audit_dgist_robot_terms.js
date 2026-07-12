const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = process.argv[2];
if (!root) throw new Error('project root required');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'graduate/dgist/data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'graduate/dgist/robot-curated-db.js'), 'utf8'), context);
global.window = context.window;
const engine = require(path.join(root, 'graduate/dgist/robot-search-engine.js'));
const esc = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const rows = [['교수명','직접 검색어','해당 교수 순위','상위 5명','결과 수','포함 여부']];
let total = 0, top1 = 0, top5 = 0, top10 = 0;
for (const profile of engine.profiles()) {
  for (const query of profile.directTerms || []) {
    if (String(query).trim().length < 2) continue;
    const got = engine.search(query, { limit: 10 }).map(item => item.profile.professor);
    const index = got.indexOf(profile.professor);
    total += 1;
    if (index === 0) top1 += 1;
    if (index >= 0 && index < 5) top5 += 1;
    if (index >= 0 && index < 10) top10 += 1;
    rows.push([profile.professor, query, index >= 0 ? index + 1 : '', got.slice(0,5).join(' | '), got.length, index >= 0 ? 'Y' : 'N']);
  }
}
fs.writeFileSync(path.join(root, 'DGIST_RME_SEARCH_REGRESSION.csv'), '\ufeff' + rows.map(row => row.map(esc).join(',')).join('\n'));
const summary = { total, top1, top5, top10, top1Rate: top1 / total, top5Rate: top5 / total, top10Rate: top10 / total };
fs.writeFileSync(path.join(root, 'DGIST_RME_SEARCH_REGRESSION_SUMMARY.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
