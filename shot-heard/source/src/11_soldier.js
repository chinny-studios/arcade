// Shot Heard — soldiers: movement physics shared by the player and the bots, the loading drill, firing, melee,
// wounds, revives and deaths, corpses, and the procedural animation that poses each man's instanced body.

const SOLDIERS = [];
let clock = 0;
const STATS = { shots: 0, hits: 0, melee: 0, charges: 0, misfires: 0 };
const SPEED = { walk: 3.1, run: 5.9, crouch: 1.6, aim: 1.5, reload: 1.7, swim: 1.5 };
const EYE = { stand: 1.62, crouch: 1.08 };
function createSoldier(team, cls, isPlayer) {
  const s = {
    id: SOLDIERS.length, slot: SOLDIERS.length, team, cls, isPlayer: !!isPlayer, bot: null, dress: null, name: '',
    pos: new V3(0, -100, 0), vel: new V3(), yaw: 0, pitch: 0, onGround: true, crouch: 0, crouching: false, sprint: false, stamina: 1, wish: new V3(),
    hp: 100, alive: false, state: 'dead', downT: 0, deadT: 99, respawnT: 0, downBy: null, god: false,
    load: null, wp: null, hand: 'primary', gad: [0, 0],
    meleeCd: 0, meleeT: -1, meleeDef: null, meleeHit: false, meleeCharge: false,
    fireT: 9, fireCd: 0, aimT: 0, wantAim: false, lastFireT: -99, lastHurtT: -99, hurtDir: 0, volleyT: -99,
    mount: null, mantle: null,
    anim: { phase: 0, fall: 0, fallDir: 1, ram: 0, stepPh: 0, swing: 0, look: 0 },
    hb: { hx: 0, hy: 0, hz: 0, nx: 0, ny: 0, nz: 0, px: 0, py: 0, pz: 0, fx: 0, fy: 0, fz: 0 },
    muzzle: new V3(), wq: new THREE.Quaternion(),
    sc: { kills: 0, deaths: 0, caps: 0, revives: 0, score: 0, assists: 0 }, dmgBy: new Map(),
    spotT: 0, colours: null, squad: null, healCd: 0, lastStage: -1,
  };
  SOLDIERS.push(s);
  return s;
}
function wdef(s) { return s.wp.def; }
function meleeFor(s) {
  if (s.hand === 'melee') return MELEE[s.load.melee];
  const w = s.wp.def;
  if (w.bayonet) return w.model === 'carbine' ? MELEE.shortbay : MELEE.bayonet;
  if (w.model === 'pistol') return MELEE[s.load.melee];
  return MELEE.butt;
}
function setLoadout(s, cls, primary) {
  s.cls = cls;
  const C = CLASSES[cls], list = C.primary[TEAMS[s.team].key];
  if (!list.includes(primary)) primary = list[0];
  s.load = { primary, melee: C.melee, gadgets: C.gadgets.slice() };
}

// ---------- spawning ----------
function spawnSoldier(s, x, z, yaw, opt = {}) {
  if (s.state === 'dead' && s.deadT < 60 && s.pos.y > -50) stashCorpse(s);
  s.dress = dressFor(s.team, s.cls, TER.map);
  if (!s.name || opt.rename) s.name = s.dress.rank + ' ' + s.dress.name;
  dressSlot(s.slot, s.dress);
  const g = groundBelow(x, z, heightAt(x, z) + 3);
  s.pos.set(x, g, z); s.vel.set(0, 0, 0); s.yaw = yaw; s.pitch = 0;
  s.state = 'up'; s.alive = true; s.hp = 100; s.downT = 0; s.deadT = 0; s.downBy = null; s.dmgBy.clear();
  const def = WEAPONS[s.load.primary];
  s.wp = { id: s.load.primary, def, loaded: def.shots || 1, ammo: def.ammo, reloading: false, rt: 0 };
  s.gad = s.load.gadgets.map((g2) => GADGETS[g2].n);
  s.hand = 'primary'; s.meleeT = -1; s.meleeCd = 0; s.fireCd = 0; s.aimT = 0; s.mount = null; s.mantle = null; s.crouching = false; s.crouch = 0; s.stamina = 1;
  s.anim.fall = 0; s.lastHurtT = -99; s.spotT = 0; s.lastStage = -1;
  if (s.bot) botSpawned(s);
}
function groundBelow(x, z, from) {
  const t = topAt(x, z, from - 6, from + 0.5, 0.3);
  return Math.max(heightAt(x, z), t);
}
// corpses: copy the dead man's pose into a pool slot that sinks away after a while
const CORPSES = { i: 0, age: new Float32Array(NCORPSE).fill(999) };
function stashCorpse(s) {
  const k = CORPSES.i; CORPSES.i = (CORPSES.i + 1) % NCORPSE;
  copySlot(s.slot, KIT.corpse0 + k);
  CORPSES.age[k] = s.deadT;
}
function updateCorpses(dt) {
  for (let k = 0; k < NCORPSE; k++) {
    const a = CORPSES.age[k]; if (a > 200) continue;
    CORPSES.age[k] += dt;
    if (CORPSES.age[k] > 70) { sinkSlot(KIT.corpse0 + k, dt * 0.25); if (CORPSES.age[k] > 76) { hideSlot(KIT.corpse0 + k); CORPSES.age[k] = 999; } }
  }
}

// ---------- spatial grid of soldiers ----------
const SG = new Map(), SG_CELL = 8;
function rebuildSoldierGrid() {
  for (const a of SG.values()) a.length = 0;
  for (const s of SOLDIERS) {
    if (!s.alive) continue;
    const k = cgKey(Math.floor(s.pos.x / SG_CELL), Math.floor(s.pos.z / SG_CELL));
    let a = SG.get(k); if (!a) SG.set(k, (a = [])); a.push(s);
  }
}
function forSoldiersIn(x0, z0, x1, z1, fn) {
  const i0 = Math.floor(x0 / SG_CELL), i1 = Math.floor(x1 / SG_CELL), j0 = Math.floor(z0 / SG_CELL), j1 = Math.floor(z1 / SG_CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const a = SG.get(cgKey(i, j)); if (a) for (const s of a) fn(s); }
}

// ---------- movement ----------
function eyeHeight(s) { return lerp(EYE.stand, EYE.crouch, s.crouch); }
function soldierEye(s, out) {
  if (s.mount && s.mount.type === 'horse') { const h = s.mount.h; return out.set(h.pos.x, h.pos.y + 2.55, h.pos.z); }
  return out.set(s.pos.x, s.pos.y + eyeHeight(s), s.pos.z);
}
function moveSoldier(s, wx, wz, speed, jump, dt) {
  const swim = waterDepth(s.pos.x, s.pos.z) > 1.25;
  if (s.mantle) {
    const M = s.mantle; M.t += dt / 0.55;
    const k = ease(Math.min(1, M.t));
    s.pos.set(lerp(M.ax, M.bx, k), lerp(M.ay, M.by, Math.min(1, k * 1.6)) + Math.sin(k * Math.PI) * 0.25, lerp(M.az, M.bz, k));
    s.vel.set(0, 0, 0);
    if (M.t >= 1) s.mantle = null;
    return;
  }
  if (swim) speed = Math.min(speed, SPEED.swim);
  const ax = wx * speed, az = wz * speed;
  const acc = s.onGround || swim ? 26 : 3;
  const k = 1 - Math.exp(-acc * dt);
  s.vel.x += (ax - s.vel.x) * k; s.vel.z += (az - s.vel.z) * k;
  if (jump && s.onGround && !swim) {
    if (!tryMantle(s)) { s.vel.y = 4.2; s.onGround = false; }
  }
  s.vel.y -= G_ACC * dt;
  const ox = s.pos.x, oz = s.pos.z;
  s.pos.x += s.vel.x * dt; s.pos.y += s.vel.y * dt; s.pos.z += s.vel.z * dt;
  const h = s.crouch > 0.5 ? 1.2 : 1.75;
  const floor = collideBody(s.pos, 0.32, h, 0.55);
  // keep out of horses and guns
  for (const c of CANNONS) if (c.alive) { const dx = s.pos.x - c.pos.x, dz = s.pos.z - c.pos.z, d = Math.hypot(dx, dz); if (d < 1.1 && d > 0.01) { s.pos.x = c.pos.x + dx / d * 1.1; s.pos.z = c.pos.z + dz / d * 1.1; } }
  const g = Math.max(heightAt(s.pos.x, s.pos.z), floor);
  if (swim) { s.pos.y = Math.max(g, TER.water - 1.3); s.vel.y = 0; s.onGround = true; }
  else if (s.pos.y <= g) { s.pos.y = g; if (s.vel.y < 0) s.vel.y = 0; s.onGround = true; }
  else if (s.onGround && s.pos.y - g < 0.45 && s.vel.y <= 0) { s.pos.y = g; s.vel.y = 0; }
  else s.onGround = false;
  // the edge of the world
  const lim = TER.half + 25;
  s.pos.x = clamp(s.pos.x, -lim, lim); s.pos.z = clamp(s.pos.z, -lim, lim);
  s.moved = Math.hypot(s.pos.x - ox, s.pos.z - oz) / Math.max(dt, 1e-4);
}
// Vault a wall, fence or parapet up to chest height in front.
function tryMantle(s) {
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  const feet = s.pos.y;
  const t = topAt(s.pos.x + fx * 0.7, s.pos.z + fz * 0.7, feet + 0.4, feet + 1.45, 0.25);
  if (t < -1e8) return false;
  // land on the far side unless the top is wide enough to stand on
  let bx = s.pos.x + fx * 1.4, bz = s.pos.z + fz * 1.4;
  const far = Math.max(heightAt(bx, bz), topAt(bx, bz, feet - 2, t + 0.1, 0.25));
  if (rayCols(s.pos.x, t + 0.6, s.pos.z, fx, 0, fz, 1.6, CF_MOVE)) return false;
  s.mantle = { t: 0, ax: s.pos.x, ay: s.pos.y, az: s.pos.z, bx, by: Math.max(far, heightAt(bx, bz)), bz };
  if (s.isPlayer) sStep(null, 'wood', true);
  return true;
}

// ---------- weapons ----------
function reloadRate(s) {
  let r = SET.reload === 'brisk' ? 1.6 : 1;
  if (s.bot && !(PL.s && s.team === PL.s.team)) r *= 1 + (MATCH.diff - 1) * 0.08;
  for (const c of COLOURS) if (c.alive && c.team === s.team && Math.hypot(c.x - s.pos.x, c.z - s.pos.z) < 14) { r *= 1.15; break; }
  return r;
}
function drillOf(s) { return DRILLS[s.wp.def.drill]; }
function drillStage(s) {
  const D = drillOf(s), f = s.wp.rt / s.wp.def.reload;
  let acc = 0;
  for (let i = 0; i < D.length; i++) { acc += D[i][2]; if (f < acc) return i; }
  return D.length - 1;
}
function startReload(s) {
  const w = s.wp;
  if (!w || w.reloading || w.loaded >= (w.def.shots || 1) || w.ammo <= 0 || s.state !== 'up') return false;
  w.reloading = true;
  s.hand = 'primary';
  return true;
}
function reloadPaused(s) { return s.sprint || s.meleeT >= 0 || s.mantle || (s.mount && s.mount.type !== 'horse') || waterDepth(s.pos.x, s.pos.z) > 1.0 || s.hand !== 'primary'; }
function updateReload(s, dt) {
  const w = s.wp;
  if (!w || !w.reloading) return;
  if (reloadPaused(s)) return;
  w.rt += dt * reloadRate(s);
  const st = drillStage(s);
  if (st !== s.lastStage) {
    s.lastStage = st;
    const id = drillOf(s)[st][0];
    if (s.isPlayer || camera.position.distanceTo(s.pos) < 18) sDrill(id, s.isPlayer ? null : s.pos);
  }
  if (id_ram(s) && Math.floor(w.rt * 2.4) !== s.anim.ramN) { s.anim.ramN = Math.floor(w.rt * 2.4); if (s.isPlayer) sDrill('ram'); }
  if (w.rt >= w.def.reload) {
    const n = Math.min((w.def.shots || 1) - w.loaded, w.ammo);
    w.loaded += n; w.ammo -= n; w.reloading = false; w.rt = 0; s.lastStage = -1;
  }
}
function id_ram(s) { const st = drillStage(s); return drillOf(s)[st][0] === 'ram'; }
function canFire(s) { return s.state === 'up' && s.wp.loaded > 0 && !s.wp.reloading && s.hand === 'primary' && s.fireCd <= 0 && s.meleeT < 0 && !s.mantle && waterDepth(s.pos.x, s.pos.z) < 1.0; }
// Fire the loaded piece from origin o along d; muzzle m for the smoke. spreadMul folds in stance and skill.
function fireWeapon(s, ox, oy, oz, dx, dy, dz, mx, my, mz, spreadMul) {
  const w = s.wp.def;
  s.fireCd = w.shots > 1 ? 0.35 : 0.25;
  // a flash in the pan: the priming burns but the charge does not take
  if (Math.random() < (w.drill === 'breech' ? 0.02 : 0.035)) {
    sMisfire(s.isPlayer ? null : s.pos);
    emit(smokePS, mx, my, mz, 0, 0.6, 0, 0.3, 0.4, 5, 0.95, 0.95, 0.93, 0.4, 1, -0.05);
    s.fireCd = 1.4;
    STATS.misfires++;
    if (s.isPlayer) hudMsg('Flash in the pan!', 'bad');
    return false;
  }
  s.wp.loaded--; STATS.shots++;
  let spread = lerp(w.hip, w.spread, s.aimT) * spreadMul;
  if (s.crouch > 0.5) spread *= 0.75;
  const sp = Math.hypot(s.vel.x, s.vel.z);
  if (sp > 0.6) spread *= 1 + Math.min(1.5, sp / 3);
  // volley: line infantry firing together shoot closer
  if (s.cls === 'line') {
    let n = 0;
    for (const o of SOLDIERS) if (o !== s && o.alive && o.team === s.team && clock - o.lastFireT < 1.4 && Math.abs(o.pos.x - s.pos.x) < 18 && Math.abs(o.pos.z - s.pos.z) < 18) n++;
    if (n >= 2) { spread *= 0.62; s.volleyT = clock; if (s.isPlayer) PL.volley = 1.2; }
  }
  for (let k = 0; k < (w.pellets || 1); k++) fireBall(s, ox, oy, oz, dx, dy, dz, w, spread);
  fxMusket(mx, my, mz, dx, dy, dz, w.model === 'pistol' ? 0.6 : w.model === 'blunder' ? 1.2 : 1);
  sMusket(s.isPlayer ? null : _v4.set(mx, my, mz), w.model === 'pistol' ? 'pistol' : w.model === 'rifle' || w.model === 'jaeger' ? 'rifle' : w.model === 'blunder' ? 'blunder' : 'musket', s.isPlayer);
  s.lastFireT = clock; s.fireT = 0;
  heardShot(s);
  return true;
}
function startMelee(s) {
  if (s.meleeCd > 0 || s.state !== 'up' || s.mantle) return false;
  const def = meleeFor(s);
  s.meleeDef = def; s.meleeT = 0; s.meleeHit = false; s.meleeCd = def.cd;
  s.meleeCharge = Math.hypot(s.vel.x, s.vel.z) > 4.5;
  sMelee(s.isPlayer ? null : s.pos, false, false);
  return true;
}
function updateMelee(s, dt) {
  s.meleeCd -= dt;
  if (s.meleeT < 0) return;
  s.meleeT += dt;
  const def = s.meleeDef;
  if (!s.meleeHit && s.meleeT >= def.wind) {
    s.meleeHit = true;
    const v = meleeStrike(s, def, s.meleeCharge);
    if (v && s.isPlayer) hitMarker(false);
  }
  if (s.meleeT >= def.cd * 0.85) s.meleeT = -1;
}

// ---------- wounds and death ----------
function hurtSoldier(v, dmg, att, how, part, dx, dz) {
  if (!v.alive || v.state === 'dead') return;
  if (att && att.team === v.team && att !== v) return;
  if (v.state === 'down') {
    if (part === 'finish' || part === 'blast' || dmg >= 60) killSoldier(v, att, how, false);
    return;
  }
  if (v.god) dmg = 0;
  if (part !== 'melee' && part !== 'blast') STATS.hits++; else if (part === 'melee') STATS.melee++;
  v.hp -= dmg;
  v.lastHurtT = clock;
  if (dx || dz) v.hurtDir = Math.atan2(-dx, -dz);
  if (att && att !== v) v.dmgBy.set(att, (v.dmgBy.get(att) || 0) + dmg);
  if (att && att.isPlayer && att !== v && dmg > 0) hitMarker(part === 'head');
  if (v.isPlayer && dmg > 0) playerHurt(dmg, v.hurtDir);
  if (v.bot && att) botShotAt(v, att, true);
  if (v.hp <= 0) {
    v.anim.fallDir = (Math.sin(v.yaw) * dx + Math.cos(v.yaw) * dz) > 0 ? -1 : 1;
    const outright = part === 'head' || dmg >= 150 || (v.mount && v.mount.type === 'ship');
    if (outright) killSoldier(v, att, how, part === 'head');
    else downSoldier(v, att, how);
  } else if (Math.random() < 0.3) sGroan(v.pos);
}
function downSoldier(v, att, how) {
  dismount(v);
  v.state = 'down'; v.hp = 0; v.downT = 12; v.downBy = att || null; v.anim.fall = 0;
  v.wp.reloading = false;
  sGroan(v.pos);
  matchOnKill(att, v, how, false);
}
function killSoldier(v, att, how, head) {
  if (v.state === 'dead') return;
  const wasDown = v.state === 'down';
  dismount(v);
  v.state = 'dead'; v.alive = false; v.deadT = 0; v.hp = 0;
  if (!wasDown) { v.anim.fall = 0; matchOnKill(att, v, how, head); }
  matchOnDeath(v);
  if (v.colours && v.cls !== 'officer') v.colours = null;
}
function reviveSoldier(v, by) {
  if (v.state !== 'down') return;
  v.state = 'up'; v.hp = 45; v.downT = 0; v.downBy = null; v.anim.fall = 0; v.lastHurtT = clock;
  if (by) { by.sc.revives++; addScore(by, 50, 'Revived ' + shortName(v)); }
  if (v.isPlayer) hudMsg('Revived by ' + shortName(by), 'good');
  if (v.bot) botSpawned(v, true);
}
function dismount(s) {
  if (!s.mount) return;
  const m = s.mount;
  if (m.type === 'horse') { m.h.rider = null; s.pos.copy(m.h.pos).add(_v4.set(Math.cos(m.h.yaw) * 1.1, 0, -Math.sin(m.h.yaw) * 1.1)); s.pos.y = heightAt(s.pos.x, s.pos.z); }
  else if (m.type === 'cannon') m.c.crew = null;
  else if (m.type === 'ship') { m.s.crew = null; }
  s.mount = null;
}

// ---------- per-frame update ----------
function updateSoldier(s, dt) {
  if (s.state === 'dead') { s.deadT += dt; s.anim.fall = Math.min(1, s.anim.fall + dt / 0.75); return; }
  if (s.state === 'down') {
    s.anim.fall = Math.min(1, s.anim.fall + dt / 0.75);
    s.downT -= dt;
    if (s.downT <= 0) killSoldier(s, s.downBy, '', false);
    return;
  }
  s.fireT += dt; s.fireCd -= dt; s.healCd -= dt;
  s.crouch = lerp(s.crouch, s.crouching && !s.sprint ? 1 : 0, 1 - Math.exp(-dt * 10));
  const ads = s.wantAim && s.hand === 'primary' && !s.wp.reloading && !s.sprint && s.meleeT < 0 && !s.mantle;
  s.aimT = clamp(s.aimT + (ads ? dt * 3.2 : -dt * 4), 0, 1);
  if (s.sprint) s.stamina = Math.max(0, s.stamina - dt * 0.09); else s.stamina = Math.min(1, s.stamina + dt * 0.14);
  if (s.stamina <= 0) s.sprint = false;
  // slow regeneration out of the fight
  if (clock - s.lastHurtT > 14 && s.hp < 100) s.hp = Math.min(100, s.hp + dt * 4);
  updateReload(s, dt);
  updateMelee(s, dt);
  // resupply at ammunition points
  if (s.wp.ammo < s.wp.def.ammo) {
    for (const a of AMMO_POINTS) {
      if (Math.abs(a.x - s.pos.x) > 4 || Math.abs(a.z - s.pos.z) > 4) continue;
      const own = a.flag ? flagOwner(a.flag) === s.team : a.team === s.team;
      if (own) { s.ammoAcc = (s.ammoAcc || 0) + dt; if (s.ammoAcc > 1) { s.ammoAcc = 0; s.wp.ammo++; s.gad = s.gad.map((n, i) => Math.min(GADGETS[s.load.gadgets[i]].n, n + (Math.random() < 0.1 ? 1 : 0))); } }
    }
  }
}
function updateSoldiers(dt) {
  rebuildSoldierGrid();
  for (const s of SOLDIERS) updateSoldier(s, dt);
  updateCorpses(dt);
}

// ---------- animation ----------
const POSE = { x: 0, y: 0, z: 0, yaw: 0, bodyPitch: 0, bodyRoll: 0, hipY: BODY.hip, lean: 0, twist: 0, headYaw: 0, headPitch: 0, headRoll: 0, thigh: [0, 0], knee: [0, 0], splay: 0,
  wPos: new V3(), wQuat: new THREE.Quaternion(), wModel: null, wWorld: null, rh: null, lh: null, hat: 'tricorn', sash: false, armSwing: 0 };
const _wd = new V3(), _wx = new V3(), _rh = new V3(), _lh = new V3(), _wm = new THREE.Matrix4(), _fwd = new V3(0, 0, 1);
// orient a weapon so its barrel points along dir (torso space), with a roll
function aimQuat(q, dx, dy, dz, roll = 0) {
  _wd.set(dx, dy, dz).normalize();
  q.setFromUnitVectors(_fwd, _wd);
  if (roll) q.multiply(_q2.setFromAxisAngle(_fwd, roll));
  return q;
}
function gripPoint(out, P, z, y = 0) { return out.set(0, y, z).applyQuaternion(P.wQuat).add(P.wPos); }
function weaponModelOf(s) {
  if (s.hand === 'melee') { const m = MELEE[s.load.melee].model; return m === 'hanger' ? 'sword' : m; }
  return s.wp.def.model;
}
function animSoldier(s, dt) {
  const P = POSE, A = s.anim;
  if (s.isPlayer && PL.firstPerson && s.state !== 'dead' && !(s.mount && s.mount.type !== 'horse')) { hideSlot(s.slot); return; }
  if (s.pos.y < -50) { hideSlot(s.slot); return; }
  P.wWorld = null; P.rh = null; P.lh = null; P.bodyPitch = 0; P.bodyRoll = 0; P.twist = 0; P.headYaw = 0; P.headRoll = 0; P.splay = 0; P.armSwing = 0;
  P.hat = s.dress.hat; P.sash = !!s.dress.sash;
  P.x = s.pos.x; P.y = s.pos.y; P.z = s.pos.z; P.yaw = s.yaw;
  P.wModel = weaponModelOf(s);
  const long = !['pistol', 'sword', 'hatchet', 'knife'].includes(P.wModel);
  const sp = Math.hypot(s.vel.x, s.vel.z) * (s.mantle ? 0 : 1);
  A.phase += sp * dt * 2.4;
  const amp = clamp(sp / 5.5, 0, 1);
  const sw = Math.sin(A.phase);
  const pitchRel = clamp(s.pitch, -0.9, 0.9);
  // ----- lying (wounded or dead) -----
  if (s.state !== 'up') {
    const f = ease(A.fall), dir = A.fallDir;
    P.bodyPitch = -1.52 * f * dir; P.y = s.pos.y + 0.13 * f;
    P.hipY = BODY.hip * lerp(1, 0.95, f) - 0.25 * Math.sin(f * Math.PI) * 0.6;
    P.lean = 0.2 * f * dir; P.headPitch = -0.3 * f * dir; P.headYaw = 0.4 * f;
    const wr = s.state === 'down' ? Math.sin(clock * 2.2 + s.id) * 0.12 : 0;
    P.thigh[0] = -0.25 * f + wr; P.thigh[1] = 0.1 * f; P.knee[0] = 0.5 * f + wr; P.knee[1] = 0.15 * f; P.splay = 0.15 * f;
    P.lh = _lh.set(0.45, 0.35 + 0.1 * f, 0.05 * dir); P.rh = s.state === 'down' ? _rh.set(-0.05, 0.32, 0.15) : _rh.set(-0.5, 0.45, -0.05);
    // the weapon lies on the ground beside him
    const gx = s.pos.x + Math.cos(s.yaw) * 0.7, gz = s.pos.z - Math.sin(s.yaw) * 0.7;
    _e1.set(Math.PI / 2 * 0.0, s.yaw + 0.5, Math.PI / 2, 'YXZ');
    P.wWorld = _wm.compose(_v3.set(gx, heightAt(gx, gz) + 0.05, gz), _q1.setFromEuler(_e1), _v2.set(1, 1, 1));
    if (!long) P.wWorld = null;
    poseSoldier(s.slot, P);
    return;
  }
  // ----- riding -----
  if (s.mount && s.mount.type === 'horse') {
    const h = s.mount.h;
    P.x = h.pos.x; P.y = h.pos.y + 0.82; P.z = h.pos.z; P.yaw = s.yaw;
    P.hipY = BODY.hip + h.bob * 0.6; P.lean = 0.1 + h.speed * 0.012; P.thigh[0] = P.thigh[1] = -1.25; P.knee[0] = P.knee[1] = 1.45; P.splay = 0.42;
    P.twist = clamp(angWrap(s.yaw - h.yaw), -0.5, 0.5);
    P.yaw = h.yaw; P.headYaw = clamp(angWrap(s.yaw - h.yaw) - P.twist, -0.8, 0.8); P.headPitch = -pitchRel * 0.6;
    stanceWeapon(s, P, long, pitchRel, true);
    poseSoldier(s.slot, P);
    computeHitbox(s, P);
    return;
  }
  // ----- crewing a gun or ship -----
  if (s.mount) {
    P.hipY = BODY.hip - s.crouch * 0.1; P.lean = 0.3; P.thigh[0] = -0.3; P.thigh[1] = 0.25; P.knee[0] = 0.35; P.knee[1] = 0.2;
    P.wModel = long ? P.wModel : null;
    aimQuat(P.wQuat, -0.3, 0.95, -0.05); P.wPos.set(0.12, 0.06, -0.17);
    P.rh = _rh.set(-0.16, 0.12, 0.42); P.lh = _lh.set(0.16, 0.12, 0.42);
    if (s.mount.type === 'ship') { P.rh = _rh.set(-0.12, 0.38, 0.4); P.lh = _lh.set(0.12, 0.38, 0.4); P.lean = 0.05; }
    poseSoldier(s.slot, P);
    computeHitbox(s, P);
    return;
  }
  // ----- on foot -----
  const crouch = s.crouch;
  P.hipY = BODY.hip - Math.abs(sw) * 0.04 * amp - crouch * 0.36;
  const legAmp = (0.55 + amp * 0.35) * amp * (1 - crouch * 0.5);
  P.thigh[0] = lerp(-sw * legAmp, -1.35, crouch); P.thigh[1] = lerp(sw * legAmp, 0.3, crouch);
  P.knee[0] = lerp(Math.max(0, Math.sin(A.phase + 1.6)) * legAmp * 1.4 + 0.04, 1.45, crouch);
  P.knee[1] = lerp(Math.max(0, Math.sin(A.phase + 1.6 + Math.PI)) * legAmp * 1.4 + 0.04, 1.85, crouch);
  if (s.mantle) { P.thigh[0] = -1.1; P.knee[0] = 1.6; P.thigh[1] = -0.3; P.knee[1] = 0.9; }
  if (!s.onGround && !s.mantle) { P.thigh[0] = -0.6; P.knee[0] = 1.0; P.thigh[1] = 0.2; P.knee[1] = 0.6; }
  P.lean = (s.sprint ? 0.22 : 0.04) + crouch * 0.12;
  P.headPitch = -pitchRel * 0.75; P.headYaw = 0;
  P.armSwing = sw * 0.12 * amp;
  stanceWeapon(s, P, long, pitchRel, false);
  // footsteps near the listener
  const ph = Math.floor(A.phase / Math.PI);
  if (ph !== A.stepPh) { A.stepPh = ph; if (!s.isPlayer && sp > 1 && camera.position.distanceTo(s.pos) < 26) sStep(s.pos, roadAt(s.pos.x, s.pos.z) > 0.3 ? 'road' : waterDepth(s.pos.x, s.pos.z) > 0.1 ? 'water' : 'grass', s.sprint); }
  poseSoldier(s.slot, P);
  computeHitbox(s, P);
}
// Place the weapon and hands for the current action (torso space).
function stanceWeapon(s, P, long, pitchRel, riding) {
  const w = s.wp.def, A = s.anim;
  const info = KIT.wm[P.wModel] ? KIT.wm[P.wModel].info : null;
  const leftZ = info ? info.left : 0.4;
  const melee = s.meleeT >= 0 ? s.meleeT / (s.meleeDef.cd * 0.85) : -1;
  const recoil = Math.max(0, 1 - s.fireT * 5);
  if (P.wModel === 'sword' || P.wModel === 'hatchet' || P.wModel === 'knife') {
    if (melee >= 0) {
      const k = melee < 0.25 ? melee / 0.25 : 1 - (melee - 0.25) / 0.75;
      const a = lerp(-1.2, 1.4, smooth(0.15, 0.45, melee));
      P.wPos.set(-0.25 - Math.sin(a) * 0.2 * k, 0.35 + Math.cos(a) * 0.15, 0.3 + k * 0.25);
      aimQuat(P.wQuat, Math.sin(a) * 0.8, Math.cos(a), 0.6);
      P.twist = -0.3 + a * 0.2;
    } else if (riding) { P.wPos.set(-0.28, 0.2, 0.3); aimQuat(P.wQuat, 0.05, 0.95, 0.5); }
    else { P.wPos.set(-0.22, 0.14, 0.28); aimQuat(P.wQuat, 0.08, 0.92, 0.38); }
    P.rh = _rh.copy(P.wPos);
    return;
  }
  if (P.wModel === 'pistol') {
    if (s.wp.reloading) {
      P.wPos.set(-0.02, 0.32, 0.32); aimQuat(P.wQuat, 0, 1, 0.1);
      P.lh = gripPoint(_lh, P, 0.05, 0);
      const ph = Math.sin(s.wp.rt * 6) * 0.06;
      P.rh = _rh.copy(P.wPos).add(_v3.set(-0.02, 0.32 + ph, 0.02));
      P.headPitch = 0.5;
    } else if (s.aimT > 0.3 || s.fireT < 0.4) {
      P.wPos.set(-0.24, 0.47 + recoil * 0.06, 0.52); aimQuat(P.wQuat, 0, Math.tan(pitchRel) + recoil * 0.5, 1);
      P.rh = _rh.copy(P.wPos); P.twist = 0.2;
    } else { P.wPos.set(-0.2, 0.15, 0.25); aimQuat(P.wQuat, 0, 0.55, 0.85); P.rh = _rh.copy(P.wPos); }
    return;
  }
  // long arms
  if (melee >= 0 && s.hand === 'primary') {
    const k = Math.sin(clamp(melee * 1.3, 0, 1) * Math.PI);
    P.wPos.set(-0.12, 0.2, 0.12 + k * 0.6); aimQuat(P.wQuat, 0.04, 0.12, 1);
    P.lean = 0.25 + k * 0.25; P.thigh[0] = Math.min(P.thigh[0], -0.5 * k); P.knee[0] = Math.max(P.knee[0], 0.3 * k);
    P.rh = gripPoint(_rh, P, 0, -0.03); P.lh = gripPoint(_lh, P, leftZ);
    return;
  }
  if (s.wp.reloading && !reloadPaused(s)) {
    const st = drillOf(s)[drillStage(s)][0];
    if (st === 'half' || st === 'bite' || st === 'prime' || st === 'shut' || st === 'open' || st === 'close') {
      P.wPos.set(-0.06, 0.22, 0.3); aimQuat(P.wQuat, 0.55, 0.35, 0.75, -0.4);
      P.lh = gripPoint(_lh, P, leftZ * 0.9);
      if (st === 'bite') P.rh = _rh.set(-0.02, 0.62, 0.2);
      else P.rh = gripPoint(_rh, P, 0.08, 0.02);
      P.headPitch = st === 'bite' ? 0.1 : 0.45;
    } else {
      // musket upright, butt on the ground before him
      P.wPos.set(0.03, -0.5, 0.36); aimQuat(P.wQuat, -0.04, 1, 0.08);
      P.lh = gripPoint(_lh, P, 0.85);
      const muz = info ? info.muzzle : 1;
      let ry = muz + 0.08;
      if (st === 'ram') ry = muz + 0.2 + Math.abs(Math.sin(s.wp.rt * 7.5)) * 0.32;
      else if (st === 'draw' || st === 'return') ry = muz + 0.15 + 0.35 * Math.abs(Math.sin(s.wp.rt * 2));
      else if (st === 'ready') ry = 0.1;
      P.rh = gripPoint(_rh, P, ry, 0.02);
      P.headPitch = 0.3;
    }
    if (s.crouch > 0.5) { P.wPos.y += 0.25; }
    return;
  }
  if (s.aimT > 0.05 || s.fireT < 0.3) {
    const a = Math.max(s.aimT, s.fireT < 0.3 ? 1 : 0);
    const dy = Math.tan(pitchRel - P.lean) + recoil * 0.25;
    P.wPos.set(lerp(-0.1, -0.08, a), lerp(0.25, 0.45, a) + recoil * 0.03, lerp(0.22, 0.18, a) - recoil * 0.08);
    aimQuat(P.wQuat, lerp(0.4, 0.03, a), lerp(0.6, dy, a), 1);
    P.rh = gripPoint(_rh, P, 0, -0.03); P.lh = gripPoint(_lh, P, leftZ);
    P.headRoll = 0.15 * a; P.headPitch = lerp(P.headPitch, -(pitchRel - P.lean) + 0.12, a); P.twist = 0.12 * a;
    return;
  }
  if (s.sprint && w.bayonet && s.bot && s.bot.charge) {
    P.wPos.set(-0.14, 0.14, 0.18); aimQuat(P.wQuat, 0.05, 0.15, 1);
    P.rh = gripPoint(_rh, P, 0, -0.03); P.lh = gripPoint(_lh, P, leftZ);
    return;
  }
  // port arms: across the chest, muzzle up and to the left
  const bob = s.sprint ? Math.sin(A.phase * 2) * 0.03 : 0;
  P.wPos.set(-0.1, 0.2 + bob, 0.2); aimQuat(P.wQuat, 0.42, 0.85, 0.28, 0.3);
  P.rh = gripPoint(_rh, P, 0, -0.03); P.lh = gripPoint(_lh, P, Math.min(leftZ, 0.4));
}
// capsules for hit tests, from the pose
function computeHitbox(s, P) {
  const H = s.hb, c = Math.cos(P.yaw), sn = Math.sin(P.yaw);
  const hipY = P.y + P.hipY, ln = P.lean;
  H.fx = P.x; H.fy = P.y + 0.1; H.fz = P.z;
  H.px = P.x; H.py = hipY; H.pz = P.z;
  const up = BODY.neck;
  H.nx = P.x + sn * Math.sin(ln) * up; H.ny = hipY + Math.cos(ln) * up; H.nz = P.z + c * Math.sin(ln) * up;
  H.hx = H.nx + sn * 0.03; H.hy = H.ny + 0.17; H.hz = H.nz + c * 0.03;
  if (s.mount && s.mount.type === 'horse') { H.fy = hipY - 0.3; }
  // the muzzle, for the bots' smoke
  if (P.wModel && KIT.wm[P.wModel]) {
    const info = KIT.wm[P.wModel].info;
    _e1.set(P.lean, P.twist, 0, 'YXZ');
    _q1.setFromEuler(_e1);
    _v3.set(0, 0, info.muzzle).applyQuaternion(P.wQuat).add(P.wPos).applyQuaternion(_q1);
    _v3.y += P.hipY;
    _v3.applyAxisAngle(UP, P.yaw);
    s.muzzle.set(P.x + _v3.x, P.y + _v3.y, P.z + _v3.z);
  }
}
function animAll(dt) {
  for (const s of SOLDIERS) animSoldier(s, dt);
  flushKit();
}
const shortName = (s) => (s ? s.name.split(' ').slice(-1)[0] : '');
