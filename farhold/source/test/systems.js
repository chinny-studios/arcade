// Base building, POIs, sentinels, fauna scanning, death & graves, save/load
FH.mute(); FH.god(false);
FH.give('ferrite', 500); FH.give('carbon', 200); FH.give('sodium', 100); FH.give('plate', 6);
FH.sim(0.5);
// --- base: computer, floors, walls, roof
const up = P.pos.clone().normalize();
const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(P.q);
FH.UI.open('build'); FH.UI.act('part', { id: 'basecomp' });
FH.aimAt(P.pos.clone().addScaledVector(fw, 5)); FH.sim(0.1);
FH.click(0, 0.05);
const base = FH.BASES.list[0];
F.startPlacing('floor');
FH.aimAt(P.pos.clone().addScaledVector(fw, 8).addScaledVector(up, -1)); FH.sim(0.1); FH.click(0, 0.05);
const fl = base && base.parts.find((p) => p.id === 'floor');
// walls around the floor (aim at each edge)
let walls = 0;
if (fl) {
  const fu = fl.pos.clone().normalize();
  const ax = new THREE.Vector3(1, 0, 0).applyQuaternion(fl.q), az = new THREE.Vector3(0, 0, 1).applyQuaternion(fl.q);
  for (const [a, b] of [[ax, 1], [ax, -1], [az, 1]]) {
    F.startPlacing('wall'); FH.aimAt(fl.pos.clone().addScaledVector(a, 1.9 * b).addScaledVector(fu, 1.2)); FH.sim(0.05); FH.click(0, 0.05); walls++;
  }
  F.startPlacing('door'); FH.aimAt(fl.pos.clone().addScaledVector(az, -1.9).addScaledVector(fu, 1.2)); FH.sim(0.05); FH.click(0, 0.05);
  F.startPlacing('roof'); FH.aimAt(fl.pos.clone().addScaledVector(fu, 3.1)); FH.sim(0.05); FH.click(0, 0.05);
}
FH.BUILD.active && FH.press('KeyQ');
out.base = base;
return { base: !!base, parts: base ? base.parts.map((p) => p.id) : [], ferrite: FH.INV.count('ferrite') };
//--- shot base
// step inside the hut: sheltered?
const b = out.base, fl2 = b.parts.find((p) => p.id === 'floor');
P.pos.copy(fl2.pos).addScaledVector(fl2.pos.clone().normalize(), 0.4); P.vel.set(0, 0, 0);
FH.sim(1);
const roofed = P.pos.clone();
return { sheltered: window.FH && FH.f && null, shelter: FH.P && (FH.P.inShip ? 'ship' : 'foot'), surv: FH.f && null, s: window.FH.HUD && document.querySelector('#env').textContent };
//--- shot inside
// --- POIs: go to the nearest shelter and use its terminal
const pl = FH.SYS.cur.planets[0];
const me = P.pos.clone().normalize();
const sh = pl.pois.filter((p) => p.type === 'shelter').sort((a, c) => a.dir.distanceTo(me) - c.dir.distanceTo(me))[0];
const sp = sh.dir.clone().multiplyScalar(pl.R + sh.h + 0.5);
P.pos.copy(sp).add(new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion()).multiplyScalar(0));
FH.stream(10); FH.F && 0;
F.POIS.t = 0; FH.sim(0.5);
const live = F.POIS.live.find((l) => l.poi === sh);
const term = live && live.spots.find((s) => s.kind === 'terminal');
if (term) { P.pos.copy(term.world).addScaledVector(live.up, 0.3).add(new THREE.Vector3(0, 0, -1.6).applyQuaternion(live.q)); FH.sim(0.3); FH.aimAt(term.world.clone().addScaledVector(live.up, 1.3)); FH.sim(0.1); FH.press('KeyE'); }
const ui = FH.UI.cur, dlg = document.querySelector('.p-dialog') && document.querySelector('.p-dialog').textContent.slice(0, 80);
FH.UI.close();
return { found: !!live, term: !!term, ui, dlg };
//--- shot shelter
const pl = FH.SYS.cur.planets[0];
{ const u = P.pos.clone().normalize(); const d = u.clone().addScaledVector(new THREE.Vector3(1, 0, 0).cross(u).normalize(), 60 / pl.R).normalize(); P.pos.copy(d).multiplyScalar(pl.R + F.surfaceH(pl, d) + 0.3); FH.stream(10); FH.sim(0.5); }
// --- sentinels: spawn a patrol, shoot it, wanted escalates
FH.WANTED.clear();
const s1 = F.spawnSentinel(pl, 'drone', P.pos, false);
FH.sim(1);
FH.TOOL.mode = 'bolt';
for (let i = 0; i < 40; i++) { FH.aimAt(s1.pos); FH.FH = 0; FH.Input.m.b[0] = true; FH.Input.m.hit[0] = i === 0; FH.sim(1 / 30); } FH.Input.m.b[0] = false;
FH.sim(0.5);
return { wanted: FH.WANTED.level, sentinels: FH.SENT.list.length, hp: s1.hp, alive: s1.alive, ammo: FH.TOOL.ammo, last: FH.PROJ.lastHit, ui: FH.UI.cur, build: FH.BUILD.active, alivePl: P.alive, d: s1.pos.distanceTo(P.pos) };
//--- shot sentinels
FH.sim(3);
const hpBefore = P.stats.hp + P.stats.shield;
FH.sim(4);
return { wanted: FH.WANTED.level, hostile: FH.SENT.list.filter((s) => s.state === 'hostile').length, damageTaken: Math.round(hpBefore - P.stats.hp - P.stats.shield) };
//--- shot firefight
const pl = FH.SYS.cur.planets[0];
// --- fauna: scan a creature
FH.SENT.clear();
const sps = F.planetFauna(pl);
const c = F.spawnCreature(pl, sps[0], P.pos.clone().addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(P.q), 8));
FH.sim(0.2);
FH.TOOL.visor = true; FH.TOOL.vProg = 0;
let n = 0; while (!FH.DISC.planets[pl.id] || !FH.DISC.planets[pl.id].sp[sps[0].id]) { FH.aimAt(c.pos.clone().addScaledVector(c.up, c.sp.parts.bodyY * c.sp.size)); FH.sim(1 / 30); if (++n > 200) break; }
return { species: sps.map((s) => s.plan + '/' + s.temper + '/' + s.size.toFixed(1)), discovered: n < 200, frames: n };
//--- shot visor
FH.TOOL.visor = false;
// --- death and grave
const items = P.suit.slots.filter(Boolean).length;
F.killPlayer('test');
FH.sim(4);
return { alive: P.alive, graves: P.graves.length, items, suitNow: P.suit.slots.filter(Boolean).length, frame: P.frame && P.frame.kind };
//--- shot respawn
// --- save and reload
FH.SAVE.save('test');
const raw = localStorage.getItem('farhold.save.v1');
const saveSize = raw.length;
const d = JSON.parse(raw);
F.applySave(d);
FH.stream(20); FH.sim(0.5);
return { saveSize, bases: FH.BASES.list.length, parts: FH.BASES.list[0] && FH.BASES.list[0].parts.length, graves: P.graves.length, units: P.units, frame: P.frame && P.frame.kind, inShip: P.inShip };
//--- shot reloaded
