// Revenant Protocol — pickups, wall switches, interactive objects, objectives and level events

const ITEM_LIST = [];
const USABLES = [];
function spawnItem(id, x, z, y) {
  if (!ITEMS[id]) throw new Error('unknown item ' + id);
  const mat = spriteMat(SPR.items.tex);
  const [c, r] = ITEM_FRAME[id] || ITEM_FRAME.energy;
  sprRect(SPR.items, c, r, mat.uniforms.uRect.value);
  const m = new THREE.Mesh(PLANE, mat);
  m.scale.set(SPR.items.size, SPR.items.size, 1);
  if (y === undefined) y = floorOf(cellAt(x, z));
  m.position.set(x, y, z);
  R.scene.add(m);
  const it = { id, x, z, y, m, mat, t: Math.random() * 6 };
  ITEM_LIST.push(it);
  return it;
}
function clearItems() { for (const it of ITEM_LIST) { R.scene.remove(it.m); it.mat.dispose(); } ITEM_LIST.length = 0; }

function updateItems(dt) {
  const cp = R.camera.position;
  for (let i = ITEM_LIST.length - 1; i >= 0; i--) {
    const it = ITEM_LIST[i];
    it.t += dt;
    const c = cellAt(it.x, it.z);
    // items ride lifts
    if (c.lift) it.y = floorOf(c);
    const glow = ITEMS[it.id].goal || ITEMS[it.id].key || ITEMS[it.id].boost || ITEMS[it.id].life;
    it.m.position.set(it.x, it.y + (glow ? 0.1 + Math.sin(it.t * 3) * 0.06 : 0), it.z);
    it.m.rotation.y = Math.atan2(cp.x - it.x, cp.z - it.z);
    it.mat.uniforms.uLight.value = Math.max(c.solid ? 0.8 : c.d.l, glow ? 0.9 : 0);
    if (glow) addLight(it.x, it.y + 0.4, it.z, 2.2, ITEMS[it.id].key === 'r' ? 0xff4030 : ITEMS[it.id].key === 'b' ? 0x4080ff : 0xffd060, 0.5);
    if (P.dead) continue;
    if (Math.abs(it.x - P.x) < 0.95 && Math.abs(it.z - P.z) < 0.95 && it.y > P.y - 1.2 && it.y < P.y + 1.4) {
      if (takeItem(it.id)) { R.scene.remove(it.m); it.mat.dispose(); ITEM_LIST.splice(i, 1); }
    }
  }
}
// Returns true if the item was used up.
function takeItem(id) {
  const I = ITEMS[id];
  let used = false, sound = 'pickup';
  const label = [];
  if (I.weapon && !P.weapons.has(I.weapon)) {
    P.weapons.add(I.weapon); used = true; sound = 'weapon'; label.push(I.name);
    if (WEAPON[I.weapon].kind !== 'throw' && WEAPON[I.weapon].kind !== 'mine') selectWeapon(I.weapon, true);
  }
  if (I.ammo) {
    const max = AMMO_MAX[I.ammo];
    if (P.ammo[I.ammo] < max) {
      const before = P.ammo[I.ammo];
      P.ammo[I.ammo] = Math.min(max, before + I.n); used = true;
      if (!label.length) label.push(I.name);
      // switching up from fists when ammo appears
      if (P.cur === 'fists' && before === 0) autoSwitch();
    }
  }
  if (I.shield && P.shield < 200) { P.shield = Math.min(200, P.shield + I.shield); used = true; label.push(I.name); sound = 'power'; }
  if (I.health && P.health < 100) { P.health = Math.min(100, P.health + I.health); used = true; label.push(I.name); }
  if (I.battery && P.battery < 100) { P.battery = Math.min(100, P.battery + I.battery); used = true; label.push(I.name); }
  if (I.life) { P.lives++; used = true; label.push(I.name); sound = 'secret'; }
  if (I.key) { P.keys.add(I.key); used = true; label.push(I.name); sound = 'key'; }
  if (I.gear) { P.gear.add(I.gear); used = true; label.push(I.name + (I.gear === 'mask' ? ' [G]' : ' [V]')); sound = 'key'; if (I.gear === 'cleats') P.cleatsOn = true; }
  if (I.boost) { if (I.boost === 'weapon') P.boostW = 30; else P.boostS = 30; used = true; label.push(I.name); sound = 'power'; }
  if (I.goal) { used = true; label.push(I.name); sound = 'key'; levelEvent('goal:' + I.goal); completeObj(I.goal); }
  if (used) { msg(label.join(' + ').toUpperCase()); sfx(sound, 0.7); tint('rgba(255,200,80,.25)'); }
  return used;
}

// ---------- switches and interactive things ----------
// A wall decal on the nearest solid face of its cell; `use` runs the action.
function spawnUsable(th) {
  const c = cellIJ(th.i, th.j);
  const dirs = [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']];
  let d = dirs.find((q) => q[2] === th.dir) || dirs.find((q) => cellIJ(th.i + q[0], th.j + q[1]).solid) || dirs[3];
  const fl = c.solid ? 0 : floorOf(c);
  const y = fl + (th.h || 1.3);
  const size = th.t === 'pump' ? 1.6 : th.t === 'console' ? 1.2 : 0.6;
  const x = (th.i + 0.5 + d[0] * 0.49) * CELL, z = (th.j + 0.5 + d[1] * 0.49) * CELL;
  const texOff = th.t === 'pump' ? 'pump' : th.t === 'console' ? 'screen' : 'switch_off';
  const mat = worldMat(texOff);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  const li = c.solid ? 0.8 : c.d.l;
  m.geometry.setAttribute('aLight', new THREE.Float32BufferAttribute([li, li, li, li], 1));
  m.position.set(x, y, z);
  m.rotation.y = Math.atan2(-d[0], -d[1]);
  R.scene.add(m);
  const u = Object.assign({}, th, { x, y, z, m, usable: th.t !== 'decor', done: false });
  u.use = () => useThing(u);
  USABLES.push(u);
  return u;
}
function useThing(u) {
  if (u.t === 'switch') {
    if (u.need && !LV.flags[u.need]) { msg(u.needMsg || 'NOTHING HAPPENS'); sfx('denied', 0.5); return; }
    u.m.material = worldMat('switch_on'); u.done = !u.repeat;
    sfx('switch', 0.8);
    triggerTarget(u.target);
    if (u.msg) msg(u.msg);
    if (u.event) levelEvent(u.event, u);
  } else if (u.t === 'pump') {
    u.done = true; sfx('beepmine', 0.8); msg('CHARGE PLANTED - GET CLEAR');
    let n = 0;
    const tick = () => { if (!LV || LV !== u.lv) return; n++; sfxAt('beepmine', u.x, u.y, u.z, 1); if (n < 8) setTimeout(tick, 450); };
    u.lv = LV; tick();
    LV.timers.push({ t: 4, fn: () => {
      explode(u.x, u.y, u.z, 5, 140, P);
      u.m.material = worldMat('pumpdead');
      LV.flags.pumps = (LV.flags.pumps || 0) + 1;
      setObjText('pumps', 'Destroy the three coolant pumps (' + LV.flags.pumps + '/3)');
      if (LV.flags.pumps >= 3) completeObj('pumps');
      levelEvent('pump', u);
    } });
  } else if (u.t === 'console') {
    u.done = true; sfx('switch', 0.8);
    triggerTarget(u.target);
    if (u.msg) msg(u.msg);
    if (u.event) levelEvent(u.event, u);
  }
}
function triggerTarget(id) {
  if (!id) return;
  for (const g of LV.groups) {
    if (g.id !== id) continue;
    if (g.type === 'door') { g.locked = false; g.stay = true; openDoor(g); }
    else if (g.type === 'lift') { if (g.locked) { g.locked = false; } activateLift(g); }
    else if (g.type === 'field') { g.on = !g.on; sfxAt('power', g.cells[0].x * CELL, 1, g.cells[0].z * CELL, 0.8); }
  }
}
function clearUsables() { for (const u of USABLES) R.scene.remove(u.m); USABLES.length = 0; }

// ---------- objectives and events ----------
function completeObj(id) {
  const o = G.obj.find((q) => q.id === id);
  if (!o || o.done) return;
  o.done = true;
  if (id !== 'exit') { popObj('OBJECTIVE COMPLETE'); sfx('objective', 0.7); }
}
function setObjText(id, text) { const o = G.obj.find((q) => q.id === id); if (o) o.text = text; }
function objectivesDone() { return G.obj.every((o) => o.done || o.id === 'exit'); }
function levelEvent(name, arg) {
  if (name === 'enter:exit') {
    if (objectivesDone()) { completeObj('exit'); missionComplete(); }
    else if (!LV.flags.exitNag || G.time - LV.flags.exitNag > 4) { LV.flags.exitNag = G.time; msg('OBJECTIVES REMAIN - CHECK YOUR PDA [P]'); P.lastCell = null; }
    else P.lastCell = null;
    return;
  }
  const ev = LV.def.events && LV.def.events[name];
  if (ev && !(LV.fired[name] && !LV.def.repeat?.includes(name))) { LV.fired[name] = true; ev(API, arg); }
}
function updateTimers(dt) {
  for (let i = LV.timers.length - 1; i >= 0; i--) { const t = LV.timers[i]; t.t -= dt; if (t.t <= 0) { LV.timers.splice(i, 1); t.fn(); } }
}

// What level scripts get to call.
const API = {
  msg: (s) => msg(s),
  spawn: (type, i, j, opt) => spawnEnemy(type, (i + 0.5) * CELL, (j + 0.5) * CELL, Object.assign({ alert: true }, opt)),
  item: (id, i, j) => spawnItem(id, (i + 0.5) * CELL, (j + 0.5) * CELL),
  open: (id) => triggerTarget(id),
  unlock: (id) => { const g = groupById(id); if (g) g.locked = false; },
  field: (id, on) => { const g = groupById(id); if (g) g.on = on; },
  obj: (id) => completeObj(id),
  later: (t, fn) => LV.timers.push({ t, fn }),
  sfx: (n) => sfx(n, 0.8),
  flag: (k, v) => { LV.flags[k] = v === undefined ? true : v; },
  pop: (s) => popObj(s),
  light: (tag, l) => { for (const c of LV.cells) if (!c.solid && c.d.tag === tag) c.d.l = l; },
};
