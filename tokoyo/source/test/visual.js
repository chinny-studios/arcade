// Visual tour. node test/smoke.mjs --steps test/visual.js  → test/out/v_*.png
TK.peace(true); TK.god(true); TK.mute();
// creature lineup on flat meadow ground
TK.time(TK.G.time + 200);
let bx = 0, bz = 0, bestS = 1e9;
for (let k = 0; k < 400; k++) { const x = (Math.random() - 0.5) * 500, z = (Math.random() - 0.5) * 500; const h = heightAt(x, z); if (h < 3 || TK.f.forestAt(x, z) > 0.2) continue; let sl = 0; for (let i = -15; i <= 15; i += 5) sl += Math.abs(heightAt(x + i, z) - h) + Math.abs(heightAt(x + i, z - 9) - h); if (sl < bestS) { bestS = sl; bx = x; bz = z; } }
TK.tp(bx, bz - 10);
const types = ['deer', 'boar', 'gaki', 'kappa', 'gaki_f', 'gaki_shaman', 'gaki_brute', 'ochimusha', 'ochimusha_archer', 'oni'];
window.lineup = types.map((t, i) => { const m = spawnMob(t, bx - 13 + i * 2.9, bz, { stars: 0 }); m.yaw = Math.PI; return m; });
TK.f.MOBS_LIVE.forEach((m) => { m.def = Object.assign({}, m.def, { sight: 0, hear: 0 }); m.wanderT = 999; m.goal = null; });
TK.sim(0.3);
aimAt(bx, heightAt(bx, bz) + 1.5, bz);
TK.sim(0.6);
//--- shot v_lineup
for (const m of window.lineup) TK.f.MOBS_LIVE.includes(m) && (m.dead = true, m.deathT = 99);
TK.sim(0.2);
// haunted shrine in the forest
window.hs = TK.poi('haunted');
TK.tp(hs.x + 18, hs.z + 12); aimAt(hs.x, hs.y + 1.5, hs.z); CAM.wantDist = 4.2; TK.sim(0.5);
out.forest = { biome: TK.f.biomeAt(P.pos.x, P.pos.z), weather: SKY.wname };
//--- shot v_haunted
// night at the spirit shrine with a torch
const sh = TK.poi('shrine'), hs = window.hs;
TK.give('torch', 1); TK.equip('torch');
TK.time(Math.ceil(TK.G.time / 1200) * 1200 + 1200 * 0.82);
TK.tp(sh.x + 6, sh.z - 6); aimAt(sh.x, sh.y + 2, sh.z); TK.sim(1);
out.night = { tod: +SKY.tod.toFixed(2), night: SKY.isNight };
//--- shot v_night
// a storm in the forest
const hs = window.hs;
TK.weather('storm');
TK.time(Math.ceil(TK.G.time / 1200) * 1200 + 1200 * 0.25);
TK.tp(hs.x - 30, hs.z + 25); aimAt(hs.x, hs.y + 6, hs.z); TK.sim(12);
out.storm = { rain: +SKY.rain.toFixed(2), w: SKY.wname };
//--- shot v_storm
TK.weather(null); TK.sim(30);
// Shirokiba at its shrine
const a1 = TK.poi('altar1');
TK.tp(a1.x + 10, a1.z + 10);
TK.give('boar_tusk', 2);
EVENTS.summonBoss(EVENTS.S.pois.find((o) => o.p.type === 'altar1'));
await wait(1500); TK.sim(3);
const boss = TK.f.MOBS_LIVE.find((m) => m.type === 'shirokiba');
out.boss1 = !!boss;
if (boss) { aimAt(boss.pos.x, boss.pos.y + 2, boss.pos.z); TK.sim(0.5); aimAt(boss.pos.x, boss.pos.y + 2, boss.pos.z); }
//--- shot v_shirokiba
const a2 = TK.poi('altar2');
for (const m of TK.f.MOBS_LIVE) m.dead = true;
TK.sim(4);
TK.tp(a2.x + 14, a2.z + 14);
EVENTS.summonBoss(EVENTS.S.pois.find((o) => o.p.type === 'altar2'));
await wait(1500); TK.sim(3);
const boss2 = TK.f.MOBS_LIVE.find((m) => m.type === 'osugi');
out.boss2 = !!boss2;
if (boss2) { aimAt(boss2.pos.x, boss2.pos.y + 5, boss2.pos.z); TK.sim(0.5); aimAt(boss2.pos.x, boss2.pos.y + 5, boss2.pos.z); }
//--- shot v_osugi
for (const m of TK.f.MOBS_LIVE) m.dead = true;
TK.sim(4);
// a raft out on the water
let wx = 0, wz = 0;
for (let r = 560; r < 760; r += 10) { const x = Math.cos(1.2) * r, z = Math.sin(1.2) * r; if (heightAt(x, z) < -3) { wx = x; wz = z; break; } }
const raft = TK.place('raft', wx, -0.1, wz, 1.2);
raft.data.mode = 3;
TK.BUILD.interact(raft);
TK.sim(3);
out.raft = { steer: !!P.steer, speed: +raft.data.speed.toFixed(2), pos: [Math.round(raft.x), Math.round(raft.z)] };
//--- shot v_raft
return out;
