const r = {};
const aimAt = (e) => { const cp = RP.R.camera.position; const dx = e.x - cp.x, dz = e.z - cp.z, dy = e.y + e.h * 0.6 - cp.y; RP.look(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); };
// combat: stand in the courtyard and let the troopers come
RP.tp(16, 20, Math.PI);
let s = RP.sim(4);
r.afterExposure = { hp: s.hp, alerted: RP.ENEMIES.filter(e => e.alert).length, proj: RP.PROJ.length };
RP.god();
// shoot nearest enemies with the sidearm
for (let k = 0; k < 6; k++) {
  const live = RP.ENEMIES.filter(e => !e.dead && Math.hypot(e.x - RP.P.x, e.z - RP.P.z) < 30).sort((a, b) => Math.hypot(a.x - RP.P.x, a.z - RP.P.z) - Math.hypot(b.x - RP.P.x, b.z - RP.P.z));
  if (!live.length) break;
  for (let i = 0; i < 60 && !live[0].dead; i++) { aimAt(live[0]); RP.fire(true); RP.sim(1 / 30); }
  RP.fire(false);
}
r.kills = RP.state().kills; r.ammo = RP.P.ammo.energy; r.weapons = [...RP.P.weapons]; r.items = RP.ITEMS.map(i => i.id).filter(i => i.startsWith('w_') || i.startsWith('energy')).length;
// door
RP.tp(25, 14, -Math.PI / 2); RP.press('KeyE'); RP.sim(1.2);
r.door = RP.LV.cells[14 * RP.LV.w + 26].door.open;
// red door needs key
RP.tp(36, 8, 0); RP.press('KeyE'); RP.sim(0.5);
r.redLocked = RP.LV.cells[7 * RP.LV.w + 36].door.open;
RP.give('key_r'); RP.press('KeyE'); RP.sim(1.2);
r.redOpen = RP.LV.cells[7 * RP.LV.w + 36].door.open;
// lift
RP.tp(52, 6, 0); RP.press('KeyE'); RP.sim(2.5);
r.liftY = RP.P.y;
// switch on the balcony
RP.tp(56, 4, -Math.PI / 2); RP.press('KeyE'); RP.sim(0.2);
r.field = RP.LV.groups.find(g => g.id === 'vaultfield').on;
// plans and ambush
const before = RP.ENEMIES.length;
RP.tp(36, 38, 0); RP.sim(5);
r.obj = RP.G.obj.map(o => o.done); r.ambush = RP.ENEMIES.length - before;
RP.tp(55, 41, 0); RP.sim(0.5);
r.state = RP.G.state;
return r;
