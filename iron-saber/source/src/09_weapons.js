// Iron Saber — weapons: beam rifles, vulcans, machine guns, shoulder cannons, homing missiles, sabers and heat axes.
// Projectiles are swept segments tested against suits, buildings, terrain and the pilot.

// ---------- streak pools (instanced, additive) ----------
const STREAKS = {};
function makeStreak(name, cap, rCore, colCore, rGlow, colGlow, glowOp) {
  const mk = (r, col, op) => {
    const g = new THREE.CylinderGeometry(r, r, 1, 6, 1, true).rotateX(Math.PI / 2);
    const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), cap);
    m.frustumCulled = false; m.renderOrder = 6;
    for (let i = 0; i < cap; i++) m.setMatrixAt(i, ZERO_M);
    scene.add(m);
    return m;
  };
  const free = [];
  for (let i = cap - 1; i >= 0; i--) free.push(i);
  STREAKS[name] = { core: mk(rCore, colCore, 1), glow: rGlow ? mk(rGlow, colGlow, glowOp) : null, free, dirty: true };
}
makeStreak('beam', 160, 0.32, 0xfff0f8, 1.0, 0xff4fa8, 0.55);
makeStreak('beamE', 80, 0.32, 0xfaffe0, 1.0, 0xc8ff40, 0.5);
makeStreak('tracer', 600, 0.1, 0xfff0c0, 0.32, 0xff9a30, 0.45);
makeStreak('shell', 80, 0.35, 0xffe0a0, 0.9, 0xff8a30, 0.5);
const missileMesh = (() => {
  const g = mergeParts([
    { geo: new THREE.CylinderGeometry(0.28, 0.28, 2.2, 6), r: [Math.PI / 2, 0, 0], c: [0.85, 0.85, 0.82] },
    { geo: new THREE.ConeGeometry(0.28, 0.7, 6), p: [0, 0, 1.45], r: [Math.PI / 2, 0, 0], c: [0.8, 0.2, 0.15] },
  ]);
  const m = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }), 200);
  m.frustumCulled = false;
  for (let i = 0; i < 200; i++) m.setMatrixAt(i, ZERO_M);
  scene.add(m);
  const free = [];
  for (let i = 199; i >= 0; i--) free.push(i);
  return { mesh: m, free };
})();
const _fz = new V3(0, 0, 1);
function writeStreak(S, slot, head, dir, len) {
  _q1.setFromUnitVectors(_fz, dir);
  _v6.copy(head).addScaledVector(dir, -len / 2);
  _m4.compose(_v6, _q1, _v2.set(1, 1, len));
  S.core.setMatrixAt(slot, _m4);
  if (S.glow) { _m4.compose(_v6, _q1, _v2.set(1, 1, len * 1.05)); S.glow.setMatrixAt(slot, _m4); }
  S.dirty = true;
}
function freeStreak(S, slot) {
  S.core.setMatrixAt(slot, ZERO_M);
  if (S.glow) S.glow.setMatrixAt(slot, ZERO_M);
  S.free.push(slot); S.dirty = true;
}

// ---------- projectiles ----------
const PROJ = [];
const PK = {
  beam: { streak: 'beam', speed: 900, len: 26, life: 2.6, splash: 5, bdmg: 150 },
  beamE: { streak: 'beamE', speed: 700, len: 22, life: 2.6, splash: 4, bdmg: 110 },
  vulcan: { streak: 'tracer', speed: 520, len: 7, life: 1.3, splash: 0, bdmg: 14 },
  mg: { streak: 'tracer', speed: 430, len: 8, life: 2.4, splash: 2.5, bdmg: 30 },
  shell: { streak: 'shell', speed: 460, len: 5, life: 4.5, splash: 12, bdmg: 260, grav: 4 },
  missile: { speed: 70, len: 0, life: 7, splash: 7, bdmg: 150 },
};
function spawnProj(kind, from, dir, src, dmg, o = {}) {
  const K = PK[kind];
  let slot = -1;
  if (K.streak) { const S = STREAKS[K.streak]; slot = S.free.pop(); if (slot === undefined) return null; }
  else { slot = missileMesh.free.pop(); if (slot === undefined) return null; }
  const p = {
    kind, K, slot, pos: from.clone(), vel: dir.clone().multiplyScalar(o.speed || K.speed), life: K.life, dmg, src, team: src ? src.team : 1,
    target: o.target || null, aimPt: o.aimPt ? o.aimPt.clone() : null, age: 0, trailT: 0, travelled: 0,
  };
  PROJ.push(p);
  return p;
}
const _pa = new V3(), _pb = new V3(), _pd = new V3();
function updateProjectiles(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i], K = p.K;
    p.age += dt; p.life -= dt;
    if (p.kind === 'missile') steerMissile(p, dt);
    if (K.grav) p.vel.y -= K.grav * dt;
    _pa.copy(p.pos);
    _pb.copy(p.pos).addScaledVector(p.vel, dt);
    const hit = traceSegment(_pa, _pb, p.src, p.team, p.kind === 'missile' || p.kind === 'shell' ? 1.2 : p.kind === 'beam' ? 1.0 : 0.4);
    if (hit) { impact(p, hit); killProj(i); continue; }
    p.pos.copy(_pb);
    p.travelled += p.vel.length() * dt;
    // near-miss on the pilot
    if (PILOT.onFoot && p.team === 1 && !PILOT.dead) nearMissPilot(p, _pa, _pb);
    if (p.life <= 0) { if (p.kind === 'missile' || p.kind === 'shell') explode(p.pos, p.K.splash, p.dmg * 0.6, p.src, 1.2); killProj(i); continue; }
    // draw
    if (K.streak) {
      _pd.copy(p.vel).normalize();
      writeStreak(STREAKS[K.streak], p.slot, p.pos, _pd, Math.min(K.len, p.travelled + 0.5));
    } else {
      _pd.copy(p.vel).normalize();
      _q1.setFromUnitVectors(_fz, _pd);
      _m4.compose(p.pos, _q1, _v2.set(1, 1, 1));
      missileMesh.mesh.setMatrixAt(p.slot, _m4);
      p.trailT -= dt;
      if (p.trailT <= 0) {
        p.trailT = 0.025;
        _v1.copy(p.pos).addScaledVector(_pd, -1.6);
        trailPuff(_v1.x, _v1.y, _v1.z, 1.4);
        emit(glowPS, _v1.x, _v1.y, _v1.z, 0, 0, 0, 2.6, -3, 0.08, 1, 0.75, 0.4, 1, 0, 0);
      }
    }
  }
  for (const k in STREAKS) {
    const S = STREAKS[k];
    if (S.dirty) { S.core.instanceMatrix.needsUpdate = true; if (S.glow) S.glow.instanceMatrix.needsUpdate = true; S.dirty = false; }
  }
  missileMesh.mesh.instanceMatrix.needsUpdate = true;
}
function killProj(i) {
  const p = PROJ[i];
  if (p.K.streak) freeStreak(STREAKS[p.K.streak], p.slot);
  else { missileMesh.mesh.setMatrixAt(p.slot, ZERO_M); missileMesh.free.push(p.slot); }
  PROJ.splice(i, 1);
}
function steerMissile(p, dt) {
  const sp = Math.min(260, p.vel.length() + 260 * dt);
  _pd.copy(p.vel).normalize();
  let want = null;
  if (p.target && !p.target.dead && !p.target.gone) {
    const t = p.target.spheres[0].p;
    const d = t.distanceTo(p.pos);
    want = _v1.copy(t).addScaledVector(p.target.vel, d / sp * 0.7).sub(p.pos).normalize();
  } else if (p.aimPt) want = _v1.copy(p.aimPt).sub(p.pos).normalize();
  if (want && p.age > 0.25) {
    const turn = 2.8 * dt;
    const ang = _pd.angleTo(want);
    if (ang > 1e-4) _pd.lerp(want, Math.min(1, turn / ang)).normalize();
  }
  p.vel.copy(_pd).multiplyScalar(sp);
}

// What does the segment a→b hit first? Suits, buildings, terrain.
const HIT = { t: 0, kind: '', suit: null, block: -1, pos: new V3() };
function traceSegment(a, b, src, team, pad = 0.4) {
  let best = 2, kind = '', suit = null, block = -1;
  for (const s of SUITS) {
    if (s === src || s.dead || s.gone || (team !== undefined && s.team === team && s.mode === 'active')) continue;
    const t = segHitSuit(s, a, b, pad);
    if (t >= 0 && t < best) { best = t; kind = 'suit'; suit = s; }
  }
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz);
  if (hasBuildings(a.x, a.z) || hasBuildings(b.x, b.z)) {
    const n = Math.max(1, Math.ceil(L / 1.5));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (t >= best) break;
      const id = staticAt(a.x + dx * t, a.y + dy * t, a.z + dz * t);
      if (id >= 0) { best = t; kind = 'block'; block = id; suit = null; break; }
    }
  }
  const n = Math.max(1, Math.ceil(L / 6));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (t >= best) break;
    const x = a.x + dx * t, y = a.y + dy * t, z = a.z + dz * t;
    if (y < groundY(x, z)) {
      // refine
      let lo = (i - 1) / n, hi = t;
      for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (a.y + dy * m < groundY(a.x + dx * m, a.z + dz * m)) hi = m; else lo = m; }
      best = hi; kind = 'ground'; suit = null; block = -1;
      break;
    }
  }
  if (best > 1) return null;
  HIT.t = best; HIT.kind = kind; HIT.suit = suit; HIT.block = block;
  HIT.pos.set(a.x + dx * best, a.y + dy * best, a.z + dz * best);
  return HIT;
}
function impact(p, h) {
  const pos = h.pos, k = p.kind;
  _pd.copy(p.vel).normalize();
  if (k === 'missile' || k === 'shell') { explode(pos, p.K.splash, p.dmg, p.src, k === 'shell' ? 2.4 : 1.5, h.suit); return; }
  if (h.kind === 'suit') {
    damageSuit(h.suit, p.dmg, p.src ? p.src.pos : pos, p.src, k);
    if (k === 'beam' || k === 'beamE') { beamHitFx(pos.x, pos.y, pos.z, 1); hitSound(pos); }
    else { bulletHitFx(pos.x, pos.y, pos.z, 1.2); if (Math.random() < 0.3) hitSound(pos); }
    if (p.src && p.src.pilot) hitMarker();
    return;
  }
  if (h.kind === 'block') {
    if (k === 'beam' || k === 'beamE') { blastBuildings(pos.x, pos.y, pos.z, p.K.splash, p.K.bdmg); beamHitFx(pos.x, pos.y, pos.z, 0.9); splashDamage(pos, 6, p.dmg * 0.3, p.src); }
    else if (k === 'mg') { damageBlock(h.block, p.K.bdmg, _pd.x * 3, 1, _pd.z * 3, false); bulletHitFx(pos.x, pos.y, pos.z, 1.3); if (Math.random() < 0.3) dustAt(pos.x, pos.y, pos.z, 2, 1); }
    else { damageBlock(h.block, p.K.bdmg, _pd.x * 2, 1, _pd.z * 2, false); bulletHitFx(pos.x, pos.y, pos.z, 0.8); }
    return;
  }
  // ground
  if (k === 'beam' || k === 'beamE') {
    beamHitFx(pos.x, pos.y + 0.5, pos.z, 0.8); groundDust(pos.x, pos.z, 5, 4);
    knockTrees(pos.x, pos.z, 5, pos.x - _pd.x * 5, pos.z - _pd.z * 5, 1); crushAt(pos.x, pos.z, 4);
    splashDamage(pos, 6, p.dmg * 0.3, p.src);
  } else bulletHitFx(pos.x, pos.y + 0.2, pos.z, 1, true);
}
// A blast: buildings, suits, the pilot, trees and cars nearby all feel it.
function explode(pos, r, dmg, src, fx = 1.5, direct) {
  explosionFx(pos.x, pos.y, pos.z, fx);
  boom(pos, fx * 0.5);
  if (fx > 2) ring(pos.x, Math.max(pos.y, groundY(pos.x, pos.z) + 0.5), pos.z, r * 4, 0.8);
  addShake(0.12 * fx, pos, 500);
  if (direct) damageSuit(direct, dmg, src ? src.pos : pos, src, 'blast');
  blastBuildings(pos.x, pos.y, pos.z, r, dmg * 1.1);
  splashDamage(pos, r * 1.6, dmg * 0.6, src, direct);
  knockTrees(pos.x, pos.z, r * 1.2, pos.x, pos.z, 1.5);
  crushAt(pos.x, pos.z, r * 0.8, true);
  if (pos.y - groundY(pos.x, pos.z) < r) groundDust(pos.x, pos.z, r, 6);
}
function splashDamage(pos, r, dmg, src, skip) {
  for (const s of SUITS) {
    if (s === skip || s.dead || s.gone || (src && s === src)) continue;
    const d = s.spheres[0].p.distanceTo(pos) - s.R;
    if (d < r) damageSuit(s, dmg * (1 - Math.max(0, d) / r), pos, src, 'blast');
  }
  if (PILOT.onFoot && !PILOT.dead && !(src && src.team === 0)) {
    const d = PILOT.pos.distanceTo(pos);
    if (d < r * 1.6) damagePilot(120 * (1 - d / (r * 1.6)) + 10, pos);
  }
}

// ---------- firing ----------
const MUZZLE = { valiant: [0, -6.0, 0.7], swift: [0, -5.0, 0.6], ogre: [0, -5.3, 0.6], grunt: [0, -5.3, 0.6], ace: [0, -5.3, 0.6] };
const MSL_FROM = {
  valiant: [['torso', 0.9, 4.9, -2.5], ['torso', -0.9, 4.9, -2.5]], swift: [['torso', 1.6, 4.0, -2.6], ['torso', -1.6, 4.0, -2.6]],
  bastion: [['knL', 1.9, -1.9, 0.2], ['knR', -1.9, -1.9, 0.2]], ogre: [['knL', 1.3, -1.5, 0.3]], grunt: [['knL', 1.3, -1.5, 0.3]], ace: [['torso', 0.8, 4.2, -2.4]],
};
const _mz = new V3(), _md = new V3();
function muzzlePos(s, out) {
  if (s.type === 'bastion') {
    s.cannonSide ^= 1;
    out.set(s.cannonSide ? 1.9 : -1.9, 0.15, 7.7);
    return s.rig.J.cannon.localToWorld(out);
  }
  const m = MUZZLE[s.type];
  out.set(m[0], m[1], m[2]);
  return s.rig.J.rifle.localToWorld(out);
}
// Player shots at a locked target near the reticle are led onto it (mobile suit FCS assist).
function aimDir(from, s, spread, out, speed = 0) {
  out.copy(s.ctl.aim).sub(from).normalize();
  const t = s.pilot ? s.ctl.lock : null;
  if (t && speed && !t.dead && !t.gone) {
    const c = t.spheres[0].p;
    _v6.copy(c).addScaledVector(t.vel, c.distanceTo(from) / speed).sub(from).normalize();
    if (_v6.angleTo(out) < 0.14) out.copy(_v6);
  }
  if (spread) { out.x += frand(-spread, spread); out.y += frand(-spread, spread); out.z += frand(-spread, spread); out.normalize(); }
  return out;
}
function suitWeapons(s, dt) {
  const c = s.ctl, T = s.T;
  s.fireCD -= dt; s.vulcCD -= dt; s.meleeCD -= dt; s.fireT -= dt;
  s.energy = Math.min(100, s.energy + dt * 13);
  s.heat = Math.max(0, s.heat - dt * (s.overheat ? 22 : 34));
  if (s.overheat && s.heat < 35) s.overheat = false;
  if (s.mslReload > 0) { s.mslReload -= dt; if (s.mslReload <= 0) s.mslLeft = T.missiles; }
  const want = c.fire || c.vulcan || s.fireT > 0 || (c.lock && !s.ai) ? 1 : 0;
  s.aimW = lerp(s.aimW, s.type === 'bastion' ? 0 : want, 1 - Math.exp(-dt * 9));
  const busy = s.slash >= 0;
  s.rig.J.rifle.visible = !busy;
  // primary
  if (c.fire && s.fireCD <= 0 && !busy && s.block < 0.5 && s.aimW > 0.6 - (s.type === 'bastion' ? 1 : 0)) {
    const P = T.primary;
    if (P.kind === 'beam') {
      if (s.energy >= P.cost) {
        s.energy -= P.cost; s.fireCD = P.rate;
        muzzlePos(s, _mz); aimDir(_mz, s, s.ai ? s.ai.spread : 0.002, _md, 900);
        spawnProj(s.team ? 'beamE' : 'beam', _mz, _md, s, P.dmg);
        flash(_mz.x, _mz.y, _mz.z, 6 * s.sc, 1, 0.5, 0.8);
        beamSound(_mz, s.type === 'valiant');
        if (s.pilot) camKick(0.08);
      } else if (s.pilot) hudWarn('E-CAP LOW');
    } else if (P.kind === 'mg') {
      s.fireCD = P.rate;
      muzzlePos(s, _mz); aimDir(_mz, s, s.ai ? s.ai.spread : 0.01, _md, 430);
      spawnProj('mg', _mz, _md, s, P.dmg);
      flash(_mz.x, _mz.y, _mz.z, 5 * s.sc, 1, 0.75, 0.35);
      mgSound(_mz);
      if (s.pilot) camKick(0.05);
    } else if (P.kind === 'cannon') {
      s.fireCD = P.rate;
      muzzlePos(s, _mz); aimDir(_mz, s, s.ai ? s.ai.spread : 0.004, _md, 460);
      _md.y += 0.006; _md.normalize();
      spawnProj('shell', _mz, _md, s, P.dmg);
      explosionFx(_mz.x, _mz.y, _mz.z, 0.7);
      cannonSound(_mz);
      if (s.pilot) camKick(0.35);
    }
    s.fireT = 2.5;
  }
  // head vulcans
  if (c.vulcan && T.vulcan && !s.overheat && s.vulcCD <= 0 && !busy) {
    s.vulcCD = 0.055;
    s.heat += 2.6;
    if (s.heat >= 100) { s.overheat = true; if (s.pilot) hudWarn('VULCAN OVERHEAT'); }
    const side = (Math.random() < 0.5 ? 1 : -1);
    _mz.set(side * 0.72, 1.55, 1.0); s.rig.J.head.localToWorld(_mz);
    aimDir(_mz, s, 0.012, _md, 520);
    spawnProj('vulcan', _mz, _md, s, 7);
    flash(_mz.x, _mz.y, _mz.z, 1.8 * s.sc, 1, 0.85, 0.5);
    vulcanSound(_mz);
    s.fireT = Math.max(s.fireT, 1);
  }
  // missiles
  if (c.missileP && s.mslLeft > 0 && s.mslReload <= 0) {
    const n = s.mslLeft;
    s.mslLeft = 0; s.mslReload = s.ai ? 12 : 8;
    s.mslQ = [];
    for (let i = 0; i < n; i++) s.mslQ.push({ t: i * 0.09, i, lock: c.lock });
  }
  if (s.mslQ && s.mslQ.length) {
    const from = MSL_FROM[s.type];
    for (let q = s.mslQ.length - 1; q >= 0; q--) {
      const m = s.mslQ[q];
      m.t -= dt;
      if (m.t > 0) continue;
      s.mslQ.splice(q, 1);
      const [j, x, y, z] = from[m.i % from.length];
      _mz.set(x + frand(-0.3, 0.3), y + frand(-0.3, 0.3), z); s.rig.J[j].localToWorld(_mz);
      suitFwd(s.aimYaw, _md).multiplyScalar(0.5); _md.y = 0.9; _md.x += frand(-0.4, 0.4); _md.z += frand(-0.4, 0.4); _md.normalize();
      spawnProj('missile', _mz, _md, s, s.ai ? 35 : 70, { target: m.lock && !m.lock.dead ? m.lock : null, aimPt: s.ctl.aim, speed: 60 });
      missileSound(_mz);
      flash(_mz.x, _mz.y, _mz.z, 3, 1, 0.8, 0.5);
    }
  }
  // melee
  if (c.slashP && s.meleeCD <= 0 && !busy) startSlash(s, c.lock);
  if (s.slash >= 0) {
    const prev = s.slash;
    s.slash += dt / 0.62;
    s.rig.blade.visible = s.slash < 0.92;
    if (prev < 0.3 && s.slash >= 0.3 && s.swingSnd) { s.swingSnd = false; saberSwing(s.pos); }
    if (prev < 0.42 && s.slash >= 0.42) meleeHit(s);
    if (s.slash > 0.3 && s.slash < 0.62 && Math.random() < 0.9) saberTrail(s);
    if (s.slash >= 1) { s.slash = -1; s.rig.blade.visible = false; }
  }
}
function startSlash(s, target) {
  s.slash = 0; s.meleeCD = 0.85; s.slashHit = false;
  s.rig.blade.visible = true;
  saberIgnite(s.pos);
  s.swingSnd = true;
  // lunge toward a target in reach
  let t = target;
  if (!t || t.dead) t = nearestEnemyInFront(s, 130, 0.5);
  if (t) {
    _v1.copy(t.pos).sub(s.pos);
    const d = Math.hypot(_v1.x, _v1.z);
    if (d < 130 && d > 14 * s.sc) {
      const sp = clamp((d - 12 * s.sc) / 0.35, 20, 160);
      s.vel.set(_v1.x / d * sp, clamp(_v1.y * 2, -20, 30), _v1.z / d * sp);
      s.lunge = 0.35;
      if (!s.pilot) s.aimYaw = Math.atan2(_v1.x, _v1.z);
      s.onGround = false;
    }
  }
}
function nearestEnemyInFront(s, range, cone) {
  let best = null, bd = range;
  suitFwd(s.aimYaw, _v2);
  for (const o of SUITS) {
    if (o.team === s.team || o.dead || o.gone || o.mode !== 'active') continue;
    _v3.copy(o.pos).sub(s.pos);
    const d = _v3.length();
    if (d < bd && _v3.normalize().dot(_v2) > cone) { bd = d; best = o; }
  }
  return best;
}
function meleeHit(s) {
  const reach = 17 * s.sc;
  const c = s.spheres[0].p;
  suitFwd(s.aimYaw, _v2);
  _v1.copy(c).addScaledVector(_v2, reach * 0.6);
  let hitAny = false;
  for (const o of SUITS) {
    if (o === s || o.dead || o.gone || (o.team === s.team && o.mode === 'active')) continue;
    for (const S of o.spheres) {
      if (S.p.distanceTo(_v1) < reach * 0.75 + S.r) {
        damageSuit(o, s.T.meleeDmg, s.pos, s, 'melee');
        _v3.copy(S.p);
        beamHitFx(_v3.x, _v3.y, _v3.z, 1.6);
        sparkBurst(_v3.x, _v3.y, _v3.z, 14);
        boom(_v3, 0.6);
        if (s.pilot) { camKick(0.4); hitMarker(); }
        hitAny = true;
        break;
      }
    }
  }
  const n = blastBuildings(_v1.x, _v1.y, _v1.z, 9 * s.sc, 520);
  if (n && s.pilot) camKick(0.2);
  knockTrees(_v1.x, _v1.z, 12 * s.sc, s.pos.x, s.pos.z, 2);
  crushAt(_v1.x, _v1.z, 8, true);
  if (PILOT.onFoot && !PILOT.dead && PILOT.pos.distanceTo(_v1) < reach) damagePilot(200, _v1);
  return hitAny;
}
function saberTrail(s) {
  const b = s.rig.blade;
  for (let i = 0; i < 4; i++) {
    _v1.set(0, -2 - i * 2.4, 0); b.localToWorld(_v1);
    const axe = s.T.melee === 'axe';
    emit(glowPS, _v1.x, _v1.y, _v1.z, 0, 0, 0, 2.6 * s.sc, -2, 0.22, 1, axe ? 0.55 : 0.45, axe ? 0.2 : 0.8, 0.9, 0, 0, 1, axe ? 0.3 : 0.2, axe ? 0.05 : 0.6);
  }
}
