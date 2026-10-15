// Every objective prop, item, named target, alarm and exit is reachable on foot in all three missions.
//   node test/smoke.mjs --no-start --steps test/reach.js
const res = [];
for (let m = 0; m < 3; m++) { AP.start(m, 2); AP.freeze(); res.push(AP.reach()); }
if (res.some((r) => r.bad.length)) throw new Error('unreachable: ' + JSON.stringify(res));
return res;
