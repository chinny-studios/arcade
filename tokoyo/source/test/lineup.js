// Creature model sheet. node test/smoke.mjs --steps test/lineup.js
TK.peace(true); TK.god(true); TK.mute();
TK.time(TK.G.time + 300);
const sh = TK.poi('shrine');
const bx = sh.x, bz = sh.z + 4;
TK.tp(bx, bz - 7);
const types = ['deer', 'boar', 'gaki', 'kappa', 'gaki_f', 'gaki_shaman', 'gaki_brute', 'ochimusha', 'ochimusha_archer'];
window.lineup = types.map((t, i) => spawnMob(t, bx - 9.6 + i * 2.4, bz, { stars: 0, y: heightAt(bx, bz) + 0.05 }));
for (const m of window.lineup) { m.def = Object.assign({}, m.def, { sight: 0, hear: 0, speed: 0, run: 0 }); m.yaw = Math.PI; m.goal = null; m.wanderT = 999; }
TK.sim(0.2);
for (const m of window.lineup) m.yaw = Math.PI;
TK.sim(0.1);
aimAt(bx, heightAt(bx, bz) + 1.0, bz); CAM.wantDist = 1.6; TK.sim(0.5); aimAt(bx, heightAt(bx, bz) + 1.0, bz);
out.pos = window.lineup.map((m) => m.type + '@' + m.pos.toArray().map((v) => v.toFixed(1)).join(','));
out.cam = TK.R.camera.position.toArray().map((v) => v.toFixed(1));
return out;
//--- shot l_small
for (const m of window.lineup) m.dead = true, m.deathT = 99;
TK.sim(0.2);
const sh = TK.poi('shrine'), bx = sh.x, bz = sh.z + 4;
window.big = [spawnMob('oni', bx - 5, bz + 4, { stars: 0 }), spawnMob('shirokiba', bx + 4, bz + 4, { stars: 0 })];
for (const m of window.big) { m.def = Object.assign({}, m.def, { sight: 0, hear: 0, speed: 0, run: 0 }); m.yaw = Math.PI; m.invuln = 0; }
TK.sim(0.3);
for (const m of window.big) m.yaw = Math.PI + (m.type === 'oni' ? 0.4 : -0.5);
TK.sim(0.1);
TK.tp(bx, bz - 9); aimAt(bx, heightAt(bx, bz) + 2.5, bz + 4); CAM.wantDist = 2; TK.sim(0.3); aimAt(bx, heightAt(bx, bz) + 2.5, bz + 4);
//--- shot l_big
