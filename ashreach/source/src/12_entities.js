// Ashreach — entities: spawning, rigs, stat refresh, movement, inventory and equipment operations

const ENTS = [];
let PLAYER = null;
const TEAM = { members: [], leader: null };
const CORPSE_T = 25;

function makeEnt(kind, o = {}) {
  const e = {
    id: uid(), kind, name: o.name || '?', level: o.level || 1, faction: o.faction || 'hostile',
    char: o.char || null, tpl: o.tpl || null, mob: null, S: {}, hp: 1, np: 0,
    pos: new V3(o.x || 0, 0, o.z || 0), yaw: o.yaw || 0, vy: 0, onGround: true,
    rig: null, target: null, team: null, owner: null, pets: [], buffs: [], cds: {}, cdMax: {},
    dead: false, deadT: 0, sitting: false, attacking: false, atkT: 0, cast: null, hate: new Map(),
    ai: null, mv: { x: 0, z: 0, speed: 0 }, speedNow: 0, combatT: 99, role: o.role || null,
    spawn: o.spawn || null, home: new V3(o.x || 0, 0, o.z || 0), regenT: 0, stealth: false,
    rooted: 0, snared: 0, stunned: 0, calmed: 0, morph: null,
  };
  e.pos.y = groundY(e.pos.x, e.pos.z);
  e.home.y = e.pos.y;
  return e;
}

// ---------- rigs ----------
// Armour tier and colours follow what the character is wearing.
function lookFor(e) {
  const c = e.char, L = Object.assign({}, c.look || {});
  L.breed = c.breed; L.sex = c.sex;
  const ch = c.equip && c.equip.chest;
  const ql = ch ? ch.ql : 0;
  L.armorTier = !ch ? 0 : ql < 25 ? 1 : ql < 80 ? 2 : 3;
  if (c.equip && c.equip.head) L.helmet = true;
  return L;
}
function weaponModel(item) { return item ? (item.model || 'rifle') : 'fists'; }
function buildRig(e) {
  if (e.rig) { e.rig.root.parent && e.rig.root.parent.remove(e.rig.root); e.rig.dispose && e.rig.dispose(); e.rig = null; }
  let rig = null;
  try {
    if (e.char && typeof makeHumanoid === 'function') {
      rig = makeHumanoid(lookFor(e));
      rig.setWeapon && rig.setWeapon(weaponModel(e.char.equip.rhand || e.char.equip.lhand));
    } else if (e.tpl && typeof makeCreature === 'function') {
      const T = e.tpl;
      if (T.model === 'humanoid' && typeof makeHumanoid === 'function') {
        rig = makeHumanoid(T.look || { breed: T.breed || 'baseline', sex: T.sex || (hash2(e.id, 3) < 0.7 ? 'm' : 'f'), skin: T.skin, primary: T.colors && T.colors[0], secondary: T.colors && T.colors[1], accent: T.colors && T.colors[2], armorTier: T.armorTier ?? 2, height: T.scale || 1, helmet: T.helmet });
        rig.setWeapon && rig.setWeapon(T.weapon || (T.arch === 'ranged' ? 'rifle' : T.arch === 'caster' ? 'none' : 'melee1h'));
      } else rig = makeCreature(T.model, { colors: T.colors, scale: T.scale || 1 });
    }
  } catch (err) { console.error('rig failed for', e.name, err); rig = null; }
  if (!rig) rig = fallbackRig(e);
  e.rig = rig;
  rig.root.position.copy(e.pos);
  rig.root.rotation.y = e.yaw;
  rig.root.traverse((o) => { o.userData.ent = e; });
  scene.add(rig.root);
}
// Placeholder capsule used until/unless the model module provides a rig.
const fbMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
function fallbackRig(e) {
  const g = new THREE.Group();
  const col = e.kind === 'player' ? 0x5fe0d0 : e.kind === 'mob' ? 0xd06040 : e.kind === 'npc' ? 0xe0c070 : 0x8090ff;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.7, 8), fbMat.clone());
  m.material.color.setHex(col); m.position.y = 0.85; m.castShadow = true;
  g.add(m);
  return { root: g, height: 1.8, radius: 0.4, anim() {}, play() {}, setWeapon() {}, setLook() {}, setGlow() {}, dispose() { m.geometry.dispose(); m.material.dispose(); } };
}
// Non-human interactables (terminals, clone bays, doors): the world module draws the prop,
// we keep an invisible pick volume.
function propRig(h = 2.2, r = 0.8) {
  const g = new THREE.Group();
  return { root: g, height: h, radius: r, prop: true, anim() {}, play() {}, setWeapon() {}, setLook() {}, setGlow() {}, dispose() {} };
}

// ---------- stats ----------
function sumMods(into, mods, k = 1) { if (mods) for (const s in mods) into[s] = (into[s] || 0) + mods[s] * k; return into; }
function gearMods(char) {
  const m = {};
  for (const s in char.equip) { const it = char.equip[s]; if (it) sumMods(m, typeof itemMods === 'function' ? itemMods(it) : it.mods); }
  for (const s in char.implants || {}) { const it = char.implants[s]; if (it) sumMods(m, typeof itemMods === 'function' ? itemMods(it) : it.mods); }
  return m;
}
function buffMods(e) {
  const m = {};
  for (const b of e.buffs) if (b.mods) sumMods(m, b.mods);
  return m;
}
// Recompute S from character sheet/template + equipment + buffs, keeping HP/NP proportional.
function refreshStats(e) {
  const hpF = e.S.maxHp ? e.hp / e.S.maxHp : 1, npF = e.S.maxNp ? e.np / e.S.maxNp : 1;
  const bm = buffMods(e);
  if (e.char) {
    const mods = sumMods(gearMods(e.char), bm);
    e.S = computeStats(e.char, mods);
    e.level = e.char.level;
  } else if (e.tpl) {
    const M = e.mob || (e.mob = mobStats(e.tpl, e.level));
    const S = { maxHp: M.maxHp, maxNp: M.maxNp || 0, runSpeed: M.runSpeed || 5, critPct: 3, addDmg: 0, nanoCost: 0, hpRegen: M.maxHp / 400, npRegen: 1, ncu: 9999 };
    for (const t of DMG_TYPES) S['ac_' + t] = (M.ac && M.ac[t]) || 0;
    for (const k in bm) S[k] = (S[k] || 0) + bm[k];
    e.S = S;
  }
  if (e.S.maxHp < 1) e.S.maxHp = 1;
  e.hp = Math.min(e.S.maxHp, Math.max(e.dead ? 0 : 1, Math.round(hpF * e.S.maxHp)));
  e.np = Math.min(e.S.maxNp, Math.round(npF * e.S.maxNp));
  if (e === PLAYER) EV.emit('stats', e);
}
const DMG_TYPES = ['melee', 'proj', 'energy', 'chem', 'rad', 'cold', 'fire', 'poison'];
function ncuUsed(e) { let n = 0; for (const b of e.buffs) n += b.ncu || 0; return n; }

// ---------- spawning ----------
function addEnt(e) {
  ENTS.push(e);
  buildRig(e);
  refreshStats(e);
  e.hp = e.S.maxHp; e.np = e.S.maxNp;
  return e;
}
function spawnMob(tplId, level, x, z, opts = {}) {
  const T = MOB_T[tplId];
  if (!T) { console.warn('unknown mob', tplId); return null; }
  const e = makeEnt('mob', { name: T.name, level, tpl: T, x, z, yaw: opts.yaw ?? Math.random() * TAU, spawn: opts.spawn, faction: 'hostile' });
  e.tplId = tplId;
  e.ai = { mode: 'idle', t: Math.random() * 4, wander: new V3().copy(e.pos), leash: opts.leash || 45, camp: opts.camp };
  return addEnt(e);
}
function spawnPet(owner, petId, level) {
  const P = (typeof PETS !== 'undefined' && PETS[petId]) || { name: 'Pet', model: 'drone', colors: [0x8899aa, 0x445566, 0x5fe0d0], arch: 'melee' };
  const T = Object.assign({ lvl: [level, level], dmgType: 'melee', aggro: false, speed: 1, hpMul: 1, dmgMul: 1, acMul: 1, atk: 2, range: P.arch === 'ranged' ? 18 : 2.5, abilities: [], loot: null, xpMul: 0 }, P);
  const a = owner.yaw + 2.3;
  const e = makeEnt('pet', { name: (owner.name + "'s " + P.name), level, tpl: T, x: owner.pos.x + Math.sin(a) * 2, z: owner.pos.z + Math.cos(a) * 2, faction: owner.faction });
  e.owner = owner; e.petId = petId;
  e.ai = { mode: 'follow', t: 0 };
  addEnt(e);
  owner.pets.push(e);
  return e;
}
const NPC_ROLE = { vendor: 'vendor', terminal: 'terminal', clonebay: 'clonebay', hopper: 'hopper', shuttle: 'shuttle', bank: 'bank', npc: 'npc', trainer: 'trainer', door: 'door', pylon: 'pylon' };
function spawnNpc(poi) {
  const role = NPC_ROLE[poi.type];
  if (!role) return null;
  const human = role === 'vendor' || role === 'npc' || role === 'trainer';
  const e = makeEnt('npc', { name: poi.name || cap1(role), level: 60, x: poi.x, z: poi.z, yaw: poi.yaw || 0, role, faction: 'concord' });
  e.poi = poi;
  e.tpl = { model: 'humanoid', colors: [0x3a4a58, 0xb8b0a0, 0x5fe0d0], scale: 1, arch: 'melee', lvl: [60, 60], dmgType: 'melee', hpMul: 3, dmgMul: 1, acMul: 1, atk: 2, range: 2, abilities: [] };
  if (poi.type === 'vendor') {
    e.stockKind = poi.role || (poi.data && poi.data.kind) || 'general';
    e.tpl.colors = { weapons: [0x6a3a2a, 0xc0a080, 0xffb347], armor: [0x34465a, 0x9aa8b8, 0x5fe0d0], nanos: [0x40306a, 0xb0a0e0, 0xc080ff], implants: [0x2a5a50, 0xa0d0c0, 0x7dff9a], general: [0x5a5040, 0xd0c0a0, 0xffd27a] }[e.stockKind] || e.tpl.colors;
  }
  ENTS.push(e);
  if (human) {
    e.mob = { maxHp: 5000, maxNp: 0, ar: 400, dr: 400, dmg: [30, 60], atk: 2, ac: {}, runSpeed: 4, xp: 0 };
    buildRig(e);
  } else {
    const r = propRig(poi.type === 'door' ? 3 : 2.2, poi.type === 'door' || poi.type === 'clonebay' || poi.type === 'hopper' ? 2 : 0.9);
    e.rig = r; r.root.position.copy(e.pos); scene.add(r.root);
    e.mob = { maxHp: 1, maxNp: 0, ar: 0, dr: 0, dmg: [0, 0], atk: 2, ac: {}, runSpeed: 0, xp: 0 };
  }
  refreshStats(e); e.hp = e.S.maxHp;
  e.invulnerable = true;
  if (role === 'hopper' || role === 'shuttle') e.destinations = (poi.data && poi.data.destinations) || [];
  return e;
}
function removeEnt(e) {
  const i = ENTS.indexOf(e);
  if (i >= 0) ENTS.splice(i, 1);
  if (e.rig) { e.rig.root.parent && e.rig.root.parent.remove(e.rig.root); e.rig.dispose && e.rig.dispose(); }
  for (const o of ENTS) { if (o.target === e) o.target = null; o.hate.delete(e); }
  if (e.owner) { const j = e.owner.pets.indexOf(e); if (j >= 0) e.owner.pets.splice(j, 1); }
  for (const p of e.pets.slice()) removeEnt(p);
  if (PLAYER && PLAYER.target === e) setTarget(null);
  e.removed = true;
}
function entsNear(x, z, r, filter) {
  const out = [];
  for (const e of ENTS) {
    if (e.removed) continue;
    const dx = e.pos.x - x, dz = e.pos.z - z;
    if (dx * dx + dz * dz <= r * r && (!filter || filter(e))) out.push(e);
  }
  return out;
}
function entDist(a, b) { return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z); }
// Edge-to-edge distance, so big monsters can be hit from their skin rather than their centre.
function reachDist(a, b) { return entDist(a, b) - ((a.rig && a.rig.radius) || 0.4) - ((b.rig && b.rig.radius) || 0.4); }
function sideOf(e) {
  if (e.kind === 'pet') return sideOf(e.owner);
  if (e.kind === 'mob') return 'mob';
  if (e.kind === 'npc') return 'npc';
  return 'people';
}
function isHostile(a, b) {
  if (!a || !b || a === b || a.dead || b.dead) return false;
  if (a.kind === 'npc' || b.kind === 'npc') return false;
  const sa = sideOf(a), sb = sideOf(b);
  if (sa === 'mob' || sb === 'mob') return sa !== sb;
  // people vs people: only opposing factions inside contested ground (pylon fields)
  const fa = a.kind === 'pet' ? a.owner.faction : a.faction, fb = b.kind === 'pet' ? b.owner.faction : b.faction;
  return !!(ZONE && ZONE.def && ZONE.def.pvp) && fa !== fb && fa !== 'unaligned' && fb !== 'unaligned';
}
function isFriendly(a, b) { return !!a && !!b && !isHostile(a, b) && sideOf(a) === sideOf(b); }
function sameTeam(a, b) {
  if (a === b) return true;
  const A = a.kind === 'pet' ? a.owner : a, B = b.kind === 'pet' ? b.owner : b;
  return A === B || (!!A.team && A.team === B.team);
}
function teamOf(e) { return e.team ? e.team.members : [e]; }

// ---------- movement ----------
// Apply desired horizontal velocity with collision, gravity and ground snapping.
function moveEnt(e, vx, vz, dt) {
  const r = (e.rig && e.rig.radius) || 0.4;
  if (vx || vz) {
    const res = collideMove(e.pos.x, e.pos.z, e.pos.x + vx * dt, e.pos.z + vz * dt, Math.min(r, 1.2));
    e.pos.x = res.x; e.pos.z = res.z;
  }
  const gy = groundY(e.pos.x, e.pos.z);
  if (e.flying) { e.pos.y = gy; e.onGround = true; return; }
  e.vy -= 22 * dt;
  e.pos.y += e.vy * dt;
  if (e.pos.y <= gy) { e.pos.y = gy; e.vy = 0; e.onGround = true; }
  else if (e.pos.y - gy > 0.05) e.onGround = false;
  if (e.onGround && e.pos.y > gy) e.pos.y = gy;
}
function faceTo(e, x, z, dt, rate = 8) {
  const want = Math.atan2(x - e.pos.x, z - e.pos.z);
  e.yaw = dt ? angTo(e.yaw, want, rate * dt) : want;
}
function syncRig(e, dt) {
  const r = e.rig;
  if (!r) return;
  r.root.position.copy(e.pos);
  r.root.rotation.y = e.yaw;
  let st = 'idle';
  if (e.dead) st = 'dead';
  else if (e.sitting) st = 'sit';
  else if (Math.abs(e.speedNow) > 0.3) st = Math.abs(e.speedNow) > 5.6 ? 'run' : 'walk';
  else if (e.attacking || e.combatT < 4) st = 'combat';
  // far-off rigs animate at a lower rate; ones behind the fog not at all
  e.animAcc = (e.animAcc || 0) + dt;
  const d2 = e === PLAYER ? 0 : r.root.position.distanceToSquared(camera.position);
  if (d2 > 160 * 160) { e.animAcc = 0; return; }
  if (d2 > 60 * 60 && e.animAcc < 0.1) return;
  if (r.anim) r.anim(e.animAcc, st, e.speedNow);
  e.animAcc = 0;
}

// ---------- inventory & equipment ----------
const INV_MAX = 60;
function invOf(e) { return e.char ? e.char.inv : null; }
function addItem(e, item) {
  const inv = invOf(e);
  if (!inv) return false;
  if (item.stack) {
    const same = inv.find((i) => i.t === item.t && i.ql === item.ql && i.stack);
    if (same) { same.stack += item.stack; if (e === PLAYER) EV.emit('inv', e); return true; }
  }
  if (inv.length >= INV_MAX) { if (e === PLAYER) EV.emit('log', 'Your inventory is full.', 'warn'); return false; }
  inv.push(item);
  if (e === PLAYER) EV.emit('inv', e);
  return true;
}
function removeItem(e, item) {
  const inv = invOf(e);
  const i = inv ? inv.indexOf(item) : -1;
  if (i >= 0) { inv.splice(i, 1); if (e === PLAYER) EV.emit('inv', e); return true; }
  return false;
}
function findItem(e, uidv) {
  const c = e.char;
  if (!c) return null;
  return c.inv.find((i) => i.uid === uidv) || Object.values(c.equip).find((i) => i && i.uid === uidv) || null;
}
function slotsFor(item) { return item.slots || []; }
// Equip from the inventory. Requirements are checked against stats *without* the item itself.
function equip(e, item, slot) {
  const c = e.char;
  if (!c) return { ok: false, msg: 'Cannot equip.' };
  const slots = slotsFor(item);
  if (!slot) slot = slots.find((s) => !c.equip[s]) || slots[0];
  if (!slot || !slots.includes(slot)) return { ok: false, msg: 'That does not go there.' };
  if (item.kind === 'implant') return implant(e, item, slot);
  const rq = typeof itemReqsMet === 'function' ? itemReqsMet(e.S, item) : { ok: true, missing: [] };
  if (e.char.level < (item.reqs && item.reqs.level || 0)) return { ok: false, msg: 'You need level ' + item.reqs.level + '.' };
  if (!rq.ok) return { ok: false, msg: 'Requirements not met: ' + rq.missing.map((m) => (typeof STAT_NAMES !== 'undefined' && STAT_NAMES[m.stat] || m.stat) + ' ' + m.need).join(', ') };
  if (e.cast || (e.combatT < 3 && (slot === 'rhand' || slot === 'lhand') && e.attacking)) { /* allowed, swaps break the swing */ e.atkT = Math.max(e.atkT, 1); }
  removeItem(e, item);
  const out = [];
  if (c.equip[slot]) out.push(c.equip[slot]);
  // two-handers occupy both hands
  if (item.twoHand && slot === 'rhand' && c.equip.lhand) { out.push(c.equip.lhand); c.equip.lhand = null; }
  if (slot === 'lhand' && c.equip.rhand && c.equip.rhand.twoHand) { out.push(c.equip.rhand); c.equip.rhand = null; }
  c.equip[slot] = item;
  for (const o of out) c.inv.push(o);
  afterGearChange(e);
  return { ok: true, msg: 'Equipped ' + item.name + '.' };
}
function unequip(e, slot) {
  const c = e.char, it = c && c.equip[slot];
  if (!it) return false;
  if (c.inv.length >= INV_MAX) { EV.emit('log', 'Your inventory is full.', 'warn'); return false; }
  c.equip[slot] = null; c.inv.push(it);
  afterGearChange(e);
  return true;
}
function implant(e, item, slot) {
  const c = e.char;
  if (!(IMPLANT_SLOTS || []).includes(slot)) slot = slotsFor(item).find((s) => IMPLANT_SLOTS.includes(s));
  if (!slot) return { ok: false, msg: 'Not an implant slot.' };
  const rq = typeof itemReqsMet === 'function' ? itemReqsMet(e.S, item) : { ok: true, missing: [] };
  if (!rq.ok) return { ok: false, msg: 'Requirements not met: ' + rq.missing.map((m) => (typeof STAT_NAMES !== 'undefined' && STAT_NAMES[m.stat] || m.stat) + ' ' + m.need).join(', ') };
  removeItem(e, item);
  if (c.implants[slot]) c.inv.push(c.implants[slot]);
  c.implants[slot] = item;
  afterGearChange(e);
  return { ok: true, msg: 'Implanted ' + item.name + '.' };
}
function unimplant(e, slot) {
  const c = e.char, it = c && c.implants[slot];
  if (!it) return false;
  c.implants[slot] = null; c.inv.push(it);
  afterGearChange(e);
  return true;
}
// Gear changes can drop a stat below another item's requirement; AO lets that stand, so do we,
// but buffs whose nano requirements fail are not cancelled either (twinking is part of the fun).
function afterGearChange(e) {
  refreshStats(e);
  if (e.rig && e.char) {
    if (e.rig.setLook) e.rig.setLook(lookFor(e));
    if (e.rig.setWeapon) e.rig.setWeapon(weaponModel(e.char.equip.rhand || e.char.equip.lhand));
  }
  if (e === PLAYER) { EV.emit('inv', e); EV.emit('stats', e); }
}
function learnNano(e, item) {
  const n = item.nano && NANOS[item.nano];
  if (!n) return { ok: false, msg: 'This crystal is blank.' };
  const c = e.char;
  if (c.nanos.includes(item.nano)) return { ok: false, msg: 'You already know ' + n.name + '.' };
  if (n.prof !== 'any' && n.prof !== c.prof) return { ok: false, msg: 'Only a ' + (PROFS[n.prof] ? PROFS[n.prof].name : n.prof) + ' can use ' + n.name + '.' };
  if (c.level < (n.lvl || 1)) return { ok: false, msg: 'You need level ' + n.lvl + ' to learn ' + n.name + '.' };
  if (!nanoReqMet(e.S, n)) return { ok: false, msg: 'Your nano skills are too low for ' + n.name + '.' };
  removeItem(e, item);
  c.nanos.push(item.nano);
  if (e === PLAYER) { EV.emit('log', 'You uploaded ' + n.name + ' into your Nano Memory.', 'nano'); EV.emit('stats', e); if (typeof sfx === 'function') sfx('buff'); }
  return { ok: true, msg: 'Learned ' + n.name + '.' };
}
function useItem(e, item) {
  if (!item) return { ok: false };
  if (item.kind === 'nanocrystal') { const r = learnNano(e, item); if (!r.ok && e === PLAYER) EV.emit('log', r.msg, 'warn'); return r; }
  if (item.kind === 'weapon' || item.kind === 'armor' || item.kind === 'util' || item.kind === 'implant') {
    const r = equip(e, item);
    if (e === PLAYER) EV.emit('log', r.msg, r.ok ? 'info' : 'warn');
    return r;
  }
  if (item.kind !== 'consumable' || !item.use) return { ok: false, msg: 'Nothing happens.' };
  const cd = 'item:' + (item.use.np ? 'np' : item.use.heal ? 'hp' : item.t);
  if (e.cds[cd] > 0) { if (e === PLAYER) EV.emit('log', 'Not ready yet.', 'warn'); return { ok: false }; }
  const rq = typeof itemReqsMet === 'function' ? itemReqsMet(e.S, item) : { ok: true };
  if (!rq.ok) { if (e === PLAYER) EV.emit('log', 'You lack the skill to use ' + item.name + '.', 'warn'); return { ok: false }; }
  const u = item.use;
  if (u.heal) heal(e, e, Math.round(frand(u.heal[0], u.heal[1]) * (1 + (e.S.first_aid || 0) / 400)), { item: true });
  if (u.np) { const a = Math.round(frand(u.np[0], u.np[1])); e.np = Math.min(e.S.maxNp, e.np + a); if (e === PLAYER) EV.emit('log', 'You recover ' + a + ' nano.', 'heal'); }
  if (u.buff) applyBuffRaw(e, e, { id: 'item:' + item.t, name: item.name, line: 'stim_' + item.t, str: item.ql, dur: u.dur || 60, mods: u.buff, icon: item.icon });
  e.cds[cd] = e.cdMax[cd] = u.cd || 15;
  if (item.stack > 1) { item.stack--; if (e === PLAYER) EV.emit('inv', e); } else removeItem(e, item);
  if (typeof sfx === 'function' && e === PLAYER) sfx('heal');
  return { ok: true };
}
