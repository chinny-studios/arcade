// Shot Heard — field guns, horses and gunboats: crewing, riding and sailing them, and how the bots use them.

const CANNONS = [], HORSES = [], SHIPS = [];
const SHOT_V = 165;     // round shot muzzle velocity (m/s), slow enough to see it arc
function initVehicles(map) {
  for (const c of CANNONS) scene.remove(c.model.group);
  for (const h of HORSES) scene.remove(h.model.group);
  for (const s of SHIPS) scene.remove(s.model.group);
  CANNONS.length = 0; HORSES.length = 0; SHIPS.length = 0;
  for (const d of map.cannons) {
    const team = d.team !== undefined ? d.team : -1;
    const model = buildCannon(d.flag ? (map.flags.find((f) => f.id === d.flag) ? -1 : team) : team);
    scene.add(model.group);
    const c = { home: d, pos: new V3(d.x, heightAt(d.x, d.z), d.z), yaw: d.yaw, elev: 0.04, team, flag: d.flag || null, model, crew: null, claim: null,
      loaded: true, ammo: 'round', rt: 0, hp: 320, max: 320, alive: true, respawnT: 0, recoil: 0, aimPoint: new V3(), idle: 0, wheelA: 0 };
    CANNONS.push(c);
  }
  for (const d of map.horses) {
    const model = buildHorse(d.team);
    scene.add(model.group);
    HORSES.push({ home: d, pos: new V3(d.x, heightAt(d.x, d.z), d.z), yaw: Math.atan2(-d.x, -d.z), speed: 0, vy: 0, team: d.team, rider: null, claim: null, hp: 170, max: 170, alive: true,
      model, phase: Math.random() * 6, bob: 0, respawnT: 0, jump: 0, trample: new Map(), neighT: 5 + Math.random() * 20, deadT: 0 });
  }
  for (const d of map.ships) {
    const model = buildShip(d.team);
    scene.add(model.group);
    SHIPS.push({ home: d, pos: new V3(d.x, TER.water, d.z), yaw: d.yaw, speed: 0, throttle: 0, rudder: 0, team: d.team, crew: null, hp: 700, max: 700, alive: true, model,
      loaded: [true, true], rt: [0, 0], pending: [], pi: 1, sinkT: 0, respawnT: 0, roll: 0, scanT: 0 });
  }
}
function cannonOwner(c) { return c.flag ? flagOwner(c.flag) : c.team; }

// ---------- field guns ----------
function crewCannon(c, s) {
  if (c.crew || !c.alive) return;
  c.crew = s; c.claim = null; s.mount = { type: 'cannon', c }; s.wp.reloading = false;
  if (s.isPlayer) { PL.yaw = c.yaw; PL.pitch = 0; hudMsg('Gun crewed. Mouse to lay the gun, LMB fire, R load, 1 round shot, 2 canister, W/S push.', 'gold'); }
}
function cannonReloadTime(s) { return (s && s.cls === 'arty' ? 9 : 16) / (SET.reload === 'brisk' ? 1.5 : 1); }
function muzzleOf(c, out) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), ce = Math.cos(c.elev), se = Math.sin(c.elev);
  return out.set(c.pos.x + fx * 1.1 * ce, c.pos.y + 0.98 + se * 1.1, c.pos.z + fz * 1.1 * ce);
}
function fireCannon(c, s) {
  if (!c.loaded) return;
  const m = muzzleOf(c, _v1);
  const ce = Math.cos(c.elev), dx = Math.sin(c.yaw) * ce, dy = Math.sin(c.elev), dz = Math.cos(c.yaw) * ce;
  if (c.ammo === 'canister') fireCanister(s, m.x, m.y, m.z, dx, dy, dz);
  else { fireRound(s, m.x, m.y, m.z, dx + frand(-0.004, 0.004), dy + frand(-0.003, 0.003), dz + frand(-0.004, 0.004), SHOT_V, s ? s.team : cannonOwner(c)); ROUNDS[ROUNDS.length - 1].src = c; }
  fxCannon(m.x, m.y, m.z, dx, dy, dz); sCannon(s && s.isPlayer ? null : m.clone());
  c.loaded = false; c.rt = 0; c.recoil = 1;
  if (s && s.isPlayer) { SHAKE.a = Math.max(SHAKE.a, 0.9); }
  if (s) heardShot(s);
}
function updateCannonReload(c, dt) {
  if (c.loaded || !c.crew) return;
  if (c.reloading) {
    c.rt += dt;
    if (c.rt >= cannonReloadTime(c.crew)) { c.loaded = true; c.reloading = false; sDrill('gunload', c.pos); }
  }
}
function controlCannon(c, s, dt, I) {
  if (!c.alive) { dismount(s); return; }
  c.yaw += -I.look[0] * 0.35 + (I.mx ? -I.mx * dt * 0.5 : 0);
  c.elev = clamp(c.elev - I.look[1] * 0.25, -0.1, 0.24);
  PL.yaw = c.yaw; PL.pitch = c.elev;
  if (I.mz) {
    const sp = I.mz * 1.1 * dt;
    const nx = c.pos.x + Math.sin(c.yaw) * sp, nz = c.pos.z + Math.cos(c.yaw) * sp;
    queryCols(nx, nz, 1.2, _cq);
    if (!_cq.some((C) => C.alive && (C.f & CF_MOVE) && C.y1 - heightAt(nx, nz) > 0.6 && colContains(C, nx, nz, 0.7)) && waterDepth(nx, nz) < 0.3) { c.pos.x = nx; c.pos.z = nz; c.wheelA += sp / 0.62; }
  }
  if (I.slot === 0) { c.ammo = 'round'; hudMsg('Round shot', 'gold'); }
  if (I.slot === 1) { c.ammo = 'canister'; hudMsg('Canister', 'gold'); }
  if (I.reload && !c.loaded && !c.reloading) { c.reloading = true; c.rt = 0; sDrill('cast', c.pos); }
  if (I.fire) { if (c.loaded) fireCannon(c, s); else { sClick(null); if (!c.reloading) { c.reloading = true; c.rt = 0; } } }
  if (I.use) { dismount(s); PL.yaw = c.yaw; return; }
  placeCrew(c, s);
}
// the gunner stands beside the trail, to the right of the gun
function placeCrew(c, s) {
  const x = c.pos.x - Math.sin(c.yaw) * 1.3 - Math.cos(c.yaw) * 1.0, z = c.pos.z - Math.cos(c.yaw) * 1.3 + Math.sin(c.yaw) * 1.0;
  s.pos.set(x, heightAt(x, z), z);
  s.yaw = c.yaw; s.vel.set(0, 0, 0);
}
// predicted fall of shot, for the gunner's marker
function predictShot(c, out) {
  const m = muzzleOf(c, _v2);
  const ce = Math.cos(c.elev);
  let x = m.x, y = m.y, z = m.z, vx = Math.sin(c.yaw) * ce * SHOT_V, vy = Math.sin(c.elev) * SHOT_V, vz = Math.cos(c.yaw) * ce * SHOT_V;
  const dt = 0.04;
  for (let t = 0; t < 10; t += dt) {
    vy -= G_ACC * dt; x += vx * dt; y += vy * dt; z += vz * dt;
    if (y < heightAt(x, z)) break;
  }
  return out.set(x, heightAt(x, z), z);
}
// elevation to hit a point at horizontal distance d and height h with speed v (flat trajectory)
function ballisticElev(d, h, v) {
  const g = G_ACC, v2 = v * v, disc = v2 * v2 - g * (g * d * d + 2 * h * v2);
  if (disc < 0) return 0.24;
  return Math.atan((v2 - Math.sqrt(disc)) / (g * d));
}
function botCannon(c, s, dt) {
  if (!c.alive) { dismount(s); return; }
  const B = s.bot;
  if (!c.loaded && !c.reloading) { c.reloading = true; c.rt = 0; }
  c.scanT = (c.scanT || 0) - dt;
  if (c.scanT <= 0) {
    c.scanT = 1.2;
    // aim at the thickest knot of enemies in front, within the gun's reach
    let best = null, bs = 0;
    const m = muzzleOf(c, _v1);
    for (const o of SOLDIERS) {
      if (!o.alive || o.state !== 'up' || o.team === s.team) continue;
      const dx = o.pos.x - c.pos.x, dz = o.pos.z - c.pos.z, d = Math.hypot(dx, dz);
      if (d < 25 || d > 520) continue;
      if (Math.abs(angWrap(Math.atan2(dx, dz) - c.home.yaw)) > 1.25) continue;
      let n = 1;
      for (const p of SOLDIERS) if (p !== o && p.alive && p.team === o.team && Math.abs(p.pos.x - o.pos.x) < 9 && Math.abs(p.pos.z - o.pos.z) < 9) n++;
      const sc = n * 10 - d / 40 + (o.mount ? 6 : 0);
      if (sc > bs && losClear(m.x, m.y + 0.3, m.z, o.pos.x, o.pos.y + 1.4, o.pos.z)) { bs = sc; best = o; }
    }
    B.gunTarget = best;
    if (best) c.idle = 0;
  }
  // enemies on top of the gun: leave it and fight
  for (const o of SOLDIERS) if (o.alive && o.state === 'up' && o.team !== s.team && Math.abs(o.pos.x - c.pos.x) < 10 && Math.abs(o.pos.z - c.pos.z) < 10) { dismount(s); B.state = 'fight'; B.target = o; return; }
  const t = B.gunTarget;
  if (!t || t.state !== 'up') {
    c.idle += dt;
    c.yaw = angTo(c.yaw, c.home.yaw, dt * 0.3);
    if (c.idle > 30) { dismount(s); B.state = 'move'; c.idle = 0; }
    placeCrew(c, s);
    return;
  }
  const dx = t.pos.x - c.pos.x, dz = t.pos.z - c.pos.z, d = Math.hypot(dx, dz);
  c.ammo = d < 95 ? 'canister' : 'round';
  const wantYaw = Math.atan2(dx, dz) + frand(-0.01, 0.01);
  const want = c.ammo === 'canister' ? Math.atan2(t.pos.y + 1 - (c.pos.y + 1), d) : ballisticElev(d, t.pos.y + 0.6 - (c.pos.y + 0.98), SHOT_V) + (MATCH.diff < 2 ? frand(-0.006, 0.01) : 0);
  c.yaw = angTo(c.yaw, wantYaw, dt * 0.45);
  c.elev += clamp(want - c.elev, -dt * 0.2, dt * 0.2);
  if (c.loaded && Math.abs(angWrap(wantYaw - c.yaw)) < 0.012 && Math.abs(want - c.elev) < 0.006) fireCannon(c, s);
  placeCrew(c, s);
}
function hurtCannon(c, dmg, att) {
  if (!c.alive) return;
  c.hp -= dmg;
  if (c.hp > 0) return;
  c.alive = false; c.respawnT = 60;
  fxExplosion(c.pos.x, c.pos.y + 0.6, c.pos.z, 1.5); sBreak(c.pos, 'wood');
  for (let k = 0; k < 6; k++) spawnDebris(c.pos.x, c.pos.y + 0.8, c.pos.z, 0.3, 0.15, 0.6, col(0x5a4a34), frand(-4, 4), frand(3, 7), frand(-4, 4));
  if (c.crew) { const s = c.crew; dismount(s); hurtSoldier(s, 80, att, 'Gun burst', 'blast', 0, 0); }
  c.model.group.rotation.z = 0.5; c.model.barrel.rotation.x = 0.3;
  if (att && att.team !== cannonOwner(c)) addScore(att, 100, 'Gun destroyed');
}
function repairCannon(c, s, dt) { if (c.hp < c.max) { c.hp = Math.min(c.max, c.hp + dt * 70); if (c.hp >= c.max) addScore(s, 20, 'Gun repaired'); } }

// ---------- horses ----------
function mountHorse(h, s) {
  if (h.rider || !h.alive) return;
  h.rider = s; h.claim = null; s.mount = { type: 'horse', h }; s.wp.reloading = false; s.hand = 'melee';
  if (s.isPlayer) { PL.yaw = h.yaw; hudMsg('Mounted. W to ride, Shift to gallop, LMB sabre, Space jump, E dismount.', 'gold'); sNeigh(h.pos); }
}
const HORSE_SP = { walk: 2.4, trot: 6, canter: 9, gallop: 13.5 };
function moveHorse(h, want, turn, jump, dt) {
  const a = want > h.speed ? 4.5 : 9;
  h.speed += clamp(want - h.speed, -a * dt, a * dt);
  h.yaw += turn * dt * (1.9 - Math.min(1, h.speed / 14) * 0.9);
  if (jump && h.jump <= 0 && h.pos.y <= heightAt(h.pos.x, h.pos.z) + 0.05 && h.speed > 3) { h.vy = 5.2; h.jump = 0.8; sHoof(h.pos, true); }
  h.jump -= dt;
  const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
  const nx = h.pos.x + fx * h.speed * dt, nz = h.pos.z + fz * h.speed * dt;
  // deep water turns a horse back
  if (waterDepth(nx + fx * 1.2, nz + fz * 1.2) > 1.5) { h.speed *= 0.2; }
  else { h.pos.x = nx; h.pos.z = nz; }
  // body collisions, at the chest and the rump
  const ry = h.pos.y + 0.6;
  for (const k of [0.8, -0.8]) {
    _v3.set(h.pos.x + fx * k, h.pos.y + (h.vy > 0 || h.pos.y > heightAt(h.pos.x, h.pos.z) + 0.6 ? 1.0 : 0.3), h.pos.z + fz * k);
    const bx = _v3.x, bz = _v3.z;
    collideBody(_v3, 0.55, 1.4, 0.6);
    if (_v3.x !== bx || _v3.z !== bz) { h.pos.x += _v3.x - bx; h.pos.z += _v3.z - bz; if (k > 0) h.speed *= 0.8; }
  }
  h.vy -= G_ACC * dt;
  h.pos.y += h.vy * dt;
  const g = Math.max(heightAt(h.pos.x, h.pos.z), topAt(h.pos.x, h.pos.z, h.pos.y - 0.5, h.pos.y + 0.4, 0.4));
  if (h.pos.y < g) { h.pos.y = g; h.vy = 0; }
  else if (h.pos.y - g < 0.5 && h.vy <= 0) { h.pos.y = g; h.vy = 0; }
  const lim = TER.half + 20; h.pos.x = clamp(h.pos.x, -lim, lim); h.pos.z = clamp(h.pos.z, -lim, lim);
  // trample men in the way
  if (h.speed > 6 && h.rider) {
    for (const o of SOLDIERS) {
      if (!o.alive || o.state !== 'up' || o.team === h.rider.team || o.mount) continue;
      const dx = o.pos.x - (h.pos.x + fx * 1.0), dz = o.pos.z - (h.pos.z + fz * 1.0);
      if (dx * dx + dz * dz < 1.0 && clock - (h.trample.get(o) || -9) > 1.5) { h.trample.set(o, clock); hurtSoldier(o, 60, h.rider, 'Trampled', 'body', fx, fz); }
    }
  }
}
function controlHorse(h, s, dt, I) {
  if (!h.alive) { dismount(s); return; }
  let want = 0;
  if (I.mz > 0.2) want = I.sprint ? HORSE_SP.gallop : HORSE_SP.canter * (I.mz > 0.8 ? 1 : 0.7);
  else if (I.mz < -0.2) want = -1.5;
  let turn = -I.mx * 1.2;
  // the horse follows where the rider looks while moving
  if (h.speed > 1.5) turn += clamp(angWrap(PL.yaw - h.yaw) * 1.6, -1.4, 1.4);
  moveHorse(h, want, turn, I.jump, dt);
  s.pos.copy(h.pos); s.vel.set(Math.sin(h.yaw) * h.speed, 0, Math.cos(h.yaw) * h.speed);
  // the rider can only twist so far in the saddle
  const rel = angWrap(PL.yaw - h.yaw);
  if (Math.abs(rel) > 1.9) PL.yaw = h.yaw + Math.sign(rel) * 1.9;
  s.yaw = PL.yaw;
}
function horseSlash(s) {
  if (s.meleeCd > 0) return;
  s.meleeDef = MELEE.sabre; s.meleeT = 0; s.meleeHit = false; s.meleeCd = MELEE.sabre.cd; s.meleeCharge = s.mount && s.mount.h.speed > 8;
  sMelee(s.isPlayer ? null : s.pos, false, false);
  s.hand = 'melee';
}
function botHorse(h, s, dt) {
  if (!h.alive) { dismount(s); return; }
  const B = s.bot;
  let tx, tz, want = HORSE_SP.canter, flow = null;
  const t = B.target && B.target.state === 'up' ? B.target : null;
  if (t && t.pos.distanceTo(h.pos) < 90) {
    // ride past him on the sword side and cut
    const rx = -Math.cos(h.yaw), rz = Math.sin(h.yaw);
    tx = t.pos.x - rx * 1.3; tz = t.pos.z - rz * 1.3; want = HORSE_SP.gallop;
    const d = Math.hypot(t.pos.x - h.pos.x, t.pos.z - h.pos.z);
    if (d < 3.4) horseSlash(s);
    if (d < 8 && Math.abs(angWrap(Math.atan2(t.pos.x - h.pos.x, t.pos.z - h.pos.z) - h.yaw)) > 1.6) { B.passT = clock; }
    if (clock - (B.passT || -99) < 2.5) { tx = h.pos.x + Math.sin(h.yaw) * 20; tz = h.pos.z + Math.cos(h.yaw) * 20; }
  } else {
    const f = B.obj || (s.squad && s.squad.obj);
    if (f) {
      const d = Math.hypot(f.x - h.pos.x, f.z - h.pos.z);
      if (d < f.r) { const a = clock * 0.3 + s.id; tx = f.x + Math.cos(a) * f.r * 0.7; tz = f.z + Math.sin(a) * f.r * 0.7; want = HORSE_SP.trot; }
      else { tx = f.x; tz = f.z; flow = 'F' + f.id; want = d > 60 ? HORSE_SP.gallop : HORSE_SP.canter; }
    } else { tx = h.pos.x; tz = h.pos.z; want = 0; }
  }
  let dx = tx - h.pos.x, dz = tz - h.pos.z;
  if (flow && NAV.flows[flow] && Math.hypot(dx, dz) > 10) { flowDir(NAV.flows[flow], h.pos.x, h.pos.z, tx, tz, _af); dx = _af.x; dz = _af.z; }
  const wy = Math.atan2(dx, dz);
  const turn = clamp(angWrap(wy - h.yaw) * 2.2, -1.6, 1.6);
  if (Math.abs(angWrap(wy - h.yaw)) > 1.2) want = Math.min(want, HORSE_SP.trot);
  // jump low fences ahead
  const ahead = topAt(h.pos.x + Math.sin(h.yaw) * 2.5, h.pos.z + Math.cos(h.yaw) * 2.5, h.pos.y + 0.3, h.pos.y + 1.4, 0.4) > -1e8;
  moveHorse(h, want, turn, ahead, dt);
  s.pos.copy(h.pos); s.yaw = h.yaw + (t ? clamp(angWrap(Math.atan2(t.pos.x - h.pos.x, t.pos.z - h.pos.z) - h.yaw), -1.2, 1.2) : 0);
  s.vel.set(Math.sin(h.yaw) * h.speed, 0, Math.cos(h.yaw) * h.speed);
}
function hurtHorse(h, dmg, att) {
  if (!h.alive) return;
  if (att && h.rider && att.team === h.rider.team) return;
  h.hp -= dmg;
  if (Math.random() < 0.3) sNeigh(h.pos);
  if (h.hp > 0) return;
  h.alive = false; h.deadT = 0; h.respawnT = 50; h.speed = 0;
  sNeigh(h.pos);
  if (h.rider) { const s = h.rider; dismount(s); hurtSoldier(s, 25, att, 'Fall', 'body', 0, 0); }
}

// ---------- gunboats ----------
function boardShip(sh, s) {
  if (sh.crew || !sh.alive) return;
  sh.crew = s; s.mount = { type: 'ship', s: sh }; s.wp.reloading = false;
  if (s.isPlayer) { PL.yaw = sh.yaw; PL.pitch = -0.1; hudMsg('At the helm. W/S set sail, A/D rudder, look port or starboard and LMB for a broadside.', 'gold'); }
}
function shipContains(sh, x, z, pad = 0) {
  const dx = x - sh.pos.x, dz = z - sh.pos.z, c = Math.cos(sh.yaw), s = Math.sin(sh.yaw);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) < 2.4 + pad && Math.abs(lz) < 9 + pad;
}
function moveShip(sh, dt) {
  const want = sh.throttle * 2.6;
  sh.speed += clamp(want - sh.speed, -dt * 0.8, dt * 0.5);
  sh.yaw -= sh.rudder * dt * 0.22 * clamp(sh.speed / 3, 0.25, 1.2);
  const fx = Math.sin(sh.yaw), fz = Math.cos(sh.yaw);
  const nx = sh.pos.x + fx * sh.speed * dt, nz = sh.pos.z + fz * sh.speed * dt;
  const bowDepth = waterDepth(nx + fx * 9, nz + fz * 9), lim = TER.half - 12;
  if (bowDepth < 1.6 || Math.abs(nx) > lim || Math.abs(nz) > lim) { sh.speed = Math.min(sh.speed, 0) * 0.5 - 0.3; }
  else { sh.pos.x = nx; sh.pos.z = nz; }
  for (const o of SHIPS) if (o !== sh && o.alive) { const dx = sh.pos.x - o.pos.x, dz = sh.pos.z - o.pos.z, d = Math.hypot(dx, dz); if (d < 12 && d > 0.1) { sh.pos.x += dx / d * (12 - d) * 0.05; sh.pos.z += dz / d * (12 - d) * 0.05; } }
  sh.roll = Math.sin(clock * 0.7 + sh.pos.x) * 0.04 - sh.rudder * sh.speed * 0.01;
}
function shipGunWorld(sh, g, out) {
  const c = Math.cos(sh.yaw), s = Math.sin(sh.yaw), lx = g.side * 2.6, lz = g.z;
  return out.set(sh.pos.x + lx * c + lz * s, TER.water + 1.4, sh.pos.z - lx * s + lz * c);
}
function broadside(sh, side, crew, elev = 0.03) {
  const i = side < 0 ? 0 : 1;
  if (!sh.loaded[i]) return false;
  sh.loaded[i] = false; sh.rt[i] = 0;
  let k = 0;
  for (const g of sh.model.guns) if (g.side === side) sh.pending.push({ t: k++ * 0.35, g, crew, elev });
  return true;
}
function updateShipGuns(sh, dt) {
  for (let i = 0; i < 2; i++) if (!sh.loaded[i]) { sh.rt[i] += dt; if (sh.rt[i] > 20 / (SET.reload === 'brisk' ? 1.5 : 1)) { sh.loaded[i] = true; if (sh.crew && sh.crew.isPlayer) hudMsg((i ? 'Larboard' : 'Starboard') + ' guns loaded', 'good'); } }
  for (let k = sh.pending.length - 1; k >= 0; k--) {
    const p = sh.pending[k]; p.t -= dt;
    if (p.t > 0) continue;
    sh.pending.splice(k, 1);
    const m = shipGunWorld(sh, p.g, _v1);
    // a gun's right-angle to the hull
    const c = Math.cos(sh.yaw), s = Math.sin(sh.yaw);
    const dx = p.g.side * c, dz = -p.g.side * s, ce = Math.cos(p.elev);
    fireRound(p.crew, m.x, m.y, m.z, dx * ce + frand(-0.02, 0.02), Math.sin(p.elev) + frand(-0.004, 0.006), dz * ce + frand(-0.02, 0.02), SHOT_V, sh.team);
    ROUNDS[ROUNDS.length - 1].hitShips.add(sh);
    fxCannon(m.x, m.y, m.z, dx, 0.05, dz); sCannon(m.clone());
  }
}
function controlShip(sh, s, dt, I) {
  if (!sh.alive) { dismount(s); return; }
  if (I.mz > 0 && !PL.thrHeld) sh.throttle = Math.min(3, sh.throttle + 1);
  if (I.mz < 0 && !PL.thrHeld) sh.throttle = Math.max(-1, sh.throttle - 1);
  PL.thrHeld = I.mz !== 0;
  sh.rudder = I.mx;
  moveShip(sh, dt);
  if (I.fire) {
    const rel = angWrap(PL.yaw - sh.yaw);
    const side = rel < 0 ? -1 : 1;   // looking to starboard (right, local -x) is a negative yaw offset
    if (!broadside(sh, side, s, clamp(PL.pitch + 0.08, -0.05, 0.2))) hudMsg('Those guns are not loaded yet.', 'bad');
  }
  if (I.use) { dismount(s); s.pos.set(sh.pos.x + Math.cos(sh.yaw) * 3, TER.water - 1.2, sh.pos.z - Math.sin(sh.yaw) * 3); return; }
  s.pos.set(sh.pos.x - Math.sin(sh.yaw) * 6, TER.water + 1.45, sh.pos.z - Math.cos(sh.yaw) * 6); s.yaw = sh.yaw; s.vel.set(0, 0, 0);
}
function botShip(sh, s, dt) {
  if (!sh.alive) { dismount(s); return; }
  const path = sh.home.path, wp = path[sh.pi % path.length];
  const dx = wp[0] - sh.pos.x, dz = wp[1] - sh.pos.z, d = Math.hypot(dx, dz);
  if (d < 22) sh.pi = (sh.pi + 1) % path.length;
  const rel = angWrap(Math.atan2(dx, dz) - sh.yaw);
  sh.rudder = clamp(-rel * 2, -1, 1); sh.throttle = Math.abs(rel) > 1.2 ? 1 : 2;
  moveShip(sh, dt);
  sh.scanT -= dt;
  if (sh.scanT <= 0) {
    sh.scanT = 1.5;
    const c = Math.cos(sh.yaw), sn = Math.sin(sh.yaw);
    for (const side of [-1, 1]) {
      if (!sh.loaded[side < 0 ? 0 : 1]) continue;
      const rx = side * c, rz = -side * sn;
      let best = null, bd = 1e9;
      const consider = (x, y, z, w) => {
        const ox = x - sh.pos.x, oz = z - sh.pos.z, od = Math.hypot(ox, oz);
        if (od < 30 || od > 330) return;
        if ((ox * rx + oz * rz) / od < 0.9) return;
        if (od / w < bd) { bd = od / w; best = { x, y, z, d: od }; }
      };
      for (const o of SOLDIERS) if (o.alive && o.state === 'up' && o.team !== sh.team) consider(o.pos.x, o.pos.y, o.pos.z, 1);
      for (const o of SHIPS) if (o.alive && o.team !== sh.team) consider(o.pos.x, TER.water + 1, o.pos.z, 4);
      for (const o of CANNONS) if (o.alive && cannonOwner(o) !== sh.team && cannonOwner(o) !== -1) consider(o.pos.x, o.pos.y, o.pos.z, 2);
      if (best) broadside(sh, side, s, ballisticElev(best.d, best.y + 0.8 - (TER.water + 1.4), SHOT_V) + frand(-0.004, 0.008));
    }
  }
  s.pos.set(sh.pos.x - Math.sin(sh.yaw) * 6, TER.water + 1.45, sh.pos.z - Math.cos(sh.yaw) * 6); s.yaw = sh.yaw;
}
function hurtShip(sh, dmg, att) {
  if (!sh.alive) return;
  if (att && att.team === sh.team) return;
  sh.hp -= dmg;
  if (sh.hp > 0) return;
  sh.alive = false; sh.sinkT = 0; sh.respawnT = 90;
  fxExplosion(sh.pos.x, TER.water + 1.5, sh.pos.z, 2.5); addFire(sh.pos.x, TER.water + 1.5, sh.pos.z, 2, true); sh.fire = FIRES[FIRES.length - 1];
  if (sh.crew) { const s = sh.crew; dismount(s); hurtSoldier(s, 300, att, 'Sunk', 'blast', 0, 0); }
  if (att) addScore(att, 200, 'Gunboat sunk');
  hudFeedText((att ? shortName(att) : 'Gunfire') + ' sank the ' + (sh.team === GB ? 'British' : 'Patriot') + ' gunboat');
}

// ---------- per frame ----------
function updateVehicles(dt) {
  for (const c of CANNONS) {
    if (!c.alive) {
      c.respawnT -= dt;
      if (c.respawnT <= 0) { c.alive = true; c.hp = c.max; c.loaded = true; c.pos.set(c.home.x, heightAt(c.home.x, c.home.z), c.home.z); c.yaw = c.home.yaw; c.model.group.rotation.z = 0; c.model.barrel.rotation.x = 0; }
    }
    if (c.crew && (c.crew.state !== 'up' || !c.crew.mount || c.crew.mount.c !== c)) c.crew = null;
    if (c.claim && (c.claim.state !== 'up' || c.claim.bot.task !== c)) c.claim = null;
    updateCannonReload(c, dt);
    c.recoil = Math.max(0, c.recoil - dt * 1.5);
    c.pos.y = heightAt(c.pos.x, c.pos.z);
    const g = c.model.group, back = Math.sin(Math.min(1, c.recoil) * Math.PI) * 0.6;
    g.position.set(c.pos.x - Math.sin(c.yaw) * back, c.pos.y, c.pos.z - Math.cos(c.yaw) * back);
    g.rotation.y = c.yaw;
    normalAt(c.pos.x, c.pos.z, _v4); g.rotation.x = -Math.asin(clamp(_v4.z * Math.cos(c.yaw) + _v4.x * Math.sin(c.yaw), -0.4, 0.4)) * 0.8;
    if (c.alive) c.model.barrel.rotation.x = -c.elev;
    for (const w of c.model.wheels) w.rotation.x = c.wheelA + back;
    if (c.crew && c.crew.isPlayer) predictShot(c, c.aimPoint);
  }
  for (const h of HORSES) {
    const g = h.model.group;
    if (!h.alive) {
      h.deadT += dt;
      g.rotation.z = lerp(g.rotation.z, 1.45, 1 - Math.exp(-dt * 4)); g.position.y = h.pos.y + 0.25;
      h.respawnT -= dt;
      if (h.respawnT <= 0) { h.alive = true; h.hp = h.max; h.pos.set(h.home.x, heightAt(h.home.x, h.home.z), h.home.z); h.speed = 0; g.rotation.z = 0; h.trample.clear(); }
      continue;
    }
    if (h.rider && (h.rider.state !== 'up' || !h.rider.mount || h.rider.mount.h !== h)) h.rider = null;
    if (h.claim && (h.claim.state !== 'up' || !h.claim.bot || h.claim.bot.task !== h)) h.claim = null;
    if (!h.rider) { moveHorse(h, 0, 0, false, dt); h.neighT -= dt; if (h.neighT < 0) { h.neighT = frand(15, 40); if (camera.position.distanceTo(h.pos) < 60) sNeigh(h.pos); } }
    // gait
    const sp = Math.abs(h.speed);
    h.phase += dt * (sp < 0.2 ? 0 : sp < 4 ? 4 : sp < 10 ? 7.5 : 9.5);
    const gallop = sp > 10, trot = sp >= 4 && !gallop;
    const amp = clamp(sp / 6, 0, 1) * (gallop ? 0.75 : 0.55);
    const offs = gallop ? [0, 0.35, Math.PI, Math.PI + 0.35] : trot ? [0, Math.PI, Math.PI, 0] : [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
    h.model.legs.forEach((L, i) => {
      const a = Math.sin(h.phase + offs[i]);
      L.up.rotation.x = a * amp * (i < 2 ? 1 : 0.9);
      L.lo.rotation.x = (i < 2 ? -1 : 1) * Math.max(0, Math.cos(h.phase + offs[i])) * amp * 1.3;
    });
    const prevBob = h.bob;
    h.bob = (gallop ? Math.sin(h.phase * 1) : Math.abs(Math.sin(h.phase))) * amp * 0.07;
    if (sp > 1 && Math.sign(h.bob - prevBob) !== Math.sign(h.lastDb || 0) && camera.position.distanceTo(h.pos) < 70) sHoof(h.pos, gallop);
    h.lastDb = h.bob - prevBob;
    h.model.neck.rotation.x = Math.sin(h.phase) * amp * 0.12 + (sp < 0.2 ? 0.25 + Math.sin(clock * 0.4 + h.home.x) * 0.15 : 0);
    h.model.tail.rotation.x = 0.3 + Math.sin(clock * 3 + h.home.z) * 0.1 + amp * 0.4;
    g.position.set(h.pos.x, h.pos.y + h.bob, h.pos.z);
    g.rotation.set(h.jump > 0.4 ? -0.25 : h.jump > 0 ? 0.15 : 0, h.yaw, 0);
  }
  for (const sh of SHIPS) {
    const g = sh.model.group;
    if (!sh.alive) {
      sh.sinkT += dt;
      g.position.y = TER.water - Math.min(6, sh.sinkT * 0.6); g.rotation.z = Math.min(0.6, sh.sinkT * 0.08);
      if (sh.fire) sh.fire.y = g.position.y + 1.5;
      sh.respawnT -= dt;
      if (sh.respawnT <= 0) {
        if (sh.fire) { const i = FIRES.indexOf(sh.fire); if (i >= 0) FIRES.splice(i, 1); sh.fire = null; }
        sh.alive = true; sh.hp = sh.max; sh.pos.set(sh.home.x, TER.water, sh.home.z); sh.yaw = sh.home.yaw; sh.speed = 0; sh.throttle = 0; sh.loaded = [true, true]; sh.pi = 1; g.rotation.set(0, sh.yaw, 0);
      }
      continue;
    }
    if (sh.crew && (sh.crew.state !== 'up' || !sh.crew.mount || sh.crew.mount.s !== sh)) sh.crew = null;
    if (!sh.crew) { sh.throttle = 0; sh.rudder = 0; moveShip(sh, dt); }
    updateShipGuns(sh, dt);
    g.position.set(sh.pos.x, TER.water - 0.3 + Math.sin(clock * 0.9 + sh.pos.z) * 0.08, sh.pos.z);
    g.rotation.set(Math.sin(clock * 0.6) * 0.02, sh.yaw, sh.roll, 'YXZ');
    sh.model.sail.scale.x = 1 + Math.abs(sh.throttle) * 0.25 * (Math.sin(clock * 2) * 0.1 + 1);
    if (Math.random() < dt * Math.abs(sh.speed) * 2) emit(dirtPS, sh.pos.x + Math.sin(sh.yaw) * 9, TER.water + 0.1, sh.pos.z + Math.cos(sh.yaw) * 9, frand(-1, 1), frand(0.5, 1.5), frand(-1, 1), 0.4, 0.8, 1.2, 0.88, 0.9, 0.9, 0.6, 1, 2, 0);
  }
}
