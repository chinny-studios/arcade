RP.god(); RP.peace();
RP.tp(20, 30, 0); RP.look(0.3, 0.05); RP.sim(0.3);
//--- shot m4_hangar
RP.tp(26, 7, -Math.PI / 2); RP.sim(0.5);
//--- shot m4_assembly
RP.tp(55, 11, 0); RP.sim(0.3);
//--- shot m4_bridge
RP.peace(false); RP.all();
const boss = RP.ENEMIES.find(e => e.type === 'boss');
RP.tp(46, 28, Math.PI); RP.sim(2);
const aimAt = (e) => { const cp = RP.R.camera.position; const dx = e.x - cp.x, dz = e.z - cp.z, dy = e.y + e.h * 0.6 - cp.y; RP.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); };
aimAt(boss); RP.sim(0.05);
//--- shot m4_boss
const boss = RP.ENEMIES.find(e => e.type === 'boss'); const aimAt = (e) => { const cp = RP.R.camera.position; const dx = e.x - cp.x, dz = e.z - cp.z, dy = e.y + e.h * 0.6 - cp.y; RP.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); };
RP.give('cannon');
let t = 0; const hp0 = boss.hp;
while (!boss.dead && t < 900) { aimAt(boss); RP.fire(true); RP.sim(1 / 30); t++; }
RP.fire(false);
out.boss = { dead: boss.dead, hp0, hp: boss.hp, frames: t, alert: boss.alert, flying: boss.flying, y: boss.y };
RP.sim(1);
out.obj = RP.G.obj.map(o => o.done);
out.pods = RP.LV.groups.find(g => g.id === 'pods').open;
return out;
