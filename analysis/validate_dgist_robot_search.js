const fs = require("fs"), vm = require("vm"), path = require("path");
const root = process.argv[2];
const context = { window: {} }; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "graduate/dgist/data.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "graduate/dgist/robot-curated-db.js"), "utf8"), context);
global.window = context.window;
const engine = require(path.join(root, "graduate/dgist/robot-search-engine.js"));
const names = new Set(context.window.DGIST_CAREER_DATA.labs.filter(x => (x.department||"").includes("로봇및기계전자공학과")).map(x=>x.professor));
const failures = [];
function check(query, include, exclude, top1) {
  const got = engine.search(query, {limit:10}).map(x=>x.profile.professor);
  if (top1 && got[0] !== top1) failures.push(`${query}: top1 ${got[0]} != ${top1}`);
  (include||[]).forEach(n=>{if(!got.includes(n)) failures.push(`${query}: missing ${n}; got ${got.join(",")}`)});
  (exclude||[]).forEach(n=>{if(got.includes(n)) failures.push(`${query}: should exclude ${n}; got ${got.join(",")}`)});
  if (got.length > 10) failures.push(`${query}: too many ${got.length}`);
  console.log(query, "=>", got.join(", "));
}
if (engine.profiles().length !== 28) failures.push(`profiles ${engine.profiles().length}`);
engine.profiles().forEach(p=>{if(!names.has(p.professor)) failures.push(`missing lab ${p.professor}`)});
Object.entries(engine.db.bannerMap).forEach(([k,list])=>list.forEach(n=>{if(!names.has(n)) failures.push(`banner ${k} unknown ${n}`)}));
check("드론", ["이성민","임용섭"], ["박준혁","유재석"], "이성민");
check("UAV", ["이성민"], ["박준혁"], "이성민");
check("웨어러블 로봇", ["박준혁","노어진"], ["문인규","유재석"], "박준혁");
check("웨어러블 센서", ["김소희","이재홍","장경인"], ["박준혁","유재석"], null);
check("자율주행", ["김기섭","남강현","임용섭"], ["노어진","박석호"], null);
check("SLAM", ["김기섭"], ["남강현","유재석"], "김기섭");
check("수술로봇", ["황민호","박석호","송철"], ["김기섭","한상윤"], null);
check("의료영상", ["유재석","이옥균","문인규"], ["박준혁","남강현"], null);
check("신경 인터페이스", ["김소희","이상훈","이아형"], ["김기섭","남강현"], null);
check("드론 제어", ["이성민","임용섭"], ["오세훈","박준혁"], "이성민");
check("웨어러블 로봇 센서", ["윤동원","이재홍"], ["박준혁"], null);
check("라이다", ["한상윤"], ["유재석"], "한상윤");
for (const [key] of Object.entries(engine.db.bannerMap)) {
  const got=engine.banner(key); if(!got.length) failures.push(`empty banner ${key}`);
}
if (failures.length) { console.error("FAILURES\n"+failures.join("\n")); process.exit(1); }
console.log("ALL VALIDATIONS PASSED");
