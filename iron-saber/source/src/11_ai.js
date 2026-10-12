// Iron Saber — Dominion AI pilots (patrol, engage, strafe, burst fire, lunge), autopilot for a called suit,
// and the patrol zones that keep the map populated.

function makeAI(s, o = {}) {
  s.ai = {
    zone: o.zone || { x: s.pos.x, z: s.pos.z, r: 300 }, wp: null, t: 0, target: null, los: false, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rr(2, 4),
    burst: 0, burstT: rr(0.5, 2), jumpT: rr(3, 8), mslT: rr(6, 14), spread: o.ace ? 0.012 : 0.03, pref: o.ace ? rr(90, 160) : rr(170, 300),
    aggro: 0, alertR: o.alertR || 700, ace: !!o.ace, stuckT: 0, hold: o.hold || false, dodgeT: 0, mission: o.mission || null, err: new V3(), errT: 0,
  };
  return s.ai;
}
function aiOnHit(s, src) {
  const A = s.ai;
  A.aggro = 20;
  if (src && src.team !== s.team) A.target = src;
  if (Math.random() < (A.ace ? 0.6 : 0.25) && A.dodgeT <= 0) A.dodgeT = 0.6;
}
function pickTarget(s) {
  const A = s.ai, me = s.pos;
  let best = null, bd = A.aggro > 0 ? 1600 : A.alertR;
  for (const o of SUITS) {
    if (o.team === s.team || o.dead || o.gone || o.mode !== 'active') continue;
    const d = o.pos.distanceTo(me);
    if (d < bd) { bd = d; best = o; }
  }
  if (!best && PILOT.onFoot && !PILOT.dead && PILOT.state === 'foot' && PILOT.pos.distanceTo(me) < 110) best = PILOT;
  return best;
}
const targetPos = (t, out) => (t === PILOT ? out.copy(PILOT.pos).setY(PILOT.pos.y + 1) : out.copy(t.spheres[0].p));
function losTo(s, tp) {
  _v1.copy(s.spheres[2].p);
  const h = traceSegment(_v1, tp, s, s.team, 0);
  return !h || h.kind === 'suit';
}
// Steer around buildings: returns a clear heading near the wanted one, or null if boxed in.
function steer(s, dx, dz) {
  const base = Math.atan2(dx, dz);
  const y = s.pos.y + 7 * s.sc;
  for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) {
    const a = base + off * (s.id % 2 ? 1 : -1);
    const ox = Math.sin(a), oz = Math.cos(a);
    let ok = true;
    for (const d of [12, 26]) {
      if (staticAt(s.pos.x + ox * d, y, s.pos.z + oz * d) >= 0 || staticAt(s.pos.x + ox * d, y + 6, s.pos.z + oz * d) >= 0) { ok = false; break; }
    }
    if (ok) return a;
  }
  return null;
}
function aiUpdate(s, dt) {
  const A = s.ai, c = s.ctl;
  c.mx = c.mz = 0; c.boost = c.jump = c.jumpP = c.fire = c.vulcan = c.missileP = c.slashP = c.block = false; c.lock = null;
  if (s.mode !== 'active') return;
  A.t -= dt; A.aggro -= dt; A.dodgeT -= dt; A.errT -= dt;
  if (A.t <= 0) {
    A.t = 0.45 + Math.random() * 0.2;
    A.target = pickTarget(s);
    A.los = A.target ? losTo(s, targetPos(A.target, _v2)) : false;
  }
  const tgt = A.target;
  if (tgt && (tgt === PILOT ? PILOT.dead || !PILOT.onFoot : tgt.dead || tgt.gone)) { A.target = null; return; }
  let wantX = 0, wantZ = 0, speed = 0.6;
  if (!tgt) {
    // patrol
    if (A.hold) { s.aimYaw = angTo(s.aimYaw, s.home.yaw, dt); c.aim.copy(s.pos).addScaledVector(suitFwd(s.aimYaw, _v1), 100).setY(s.pos.y + 12); return; }
    if (!A.wp || Math.hypot(A.wp.x - s.pos.x, A.wp.z - s.pos.z) < 30) {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * A.zone.r;
      A.wp = { x: clamp(A.zone.x + Math.cos(a) * r, -HALF + 150, HALF - 150), z: clamp(A.zone.z + Math.sin(a) * r, -HALF + 150, HALF - 150) };
    }
    wantX = A.wp.x - s.pos.x; wantZ = A.wp.z - s.pos.z;
    s.aimYaw = angTo(s.aimYaw, Math.atan2(wantX, wantZ), dt * 1.5);
    s.aimPitch = 0;
    c.aim.copy(s.pos).addScaledVector(suitFwd(s.aimYaw, _v1), 100).setY(s.pos.y + 12);
  } else {
    const tp = targetPos(tgt, _v2);
    const dx = tp.x - s.pos.x, dz = tp.z - s.pos.z, d = Math.hypot(dx, dz) || 1;
    // keep at the preferred range and circle
    A.strafeT -= dt;
    if (A.strafeT <= 0) { A.strafeT = rr(1.5, 4); if (Math.random() < 0.6) A.strafe *= -1; }
    const radial = d > A.pref + 60 ? 1 : d < A.pref - 60 ? -0.8 : 0;
    wantX = dx / d * radial + (-dz / d) * A.strafe * 0.8;
    wantZ = dz / d * radial + (dx / d) * A.strafe * 0.8;
    speed = 1;
    // aim with lead and a wandering error
    if (A.errT <= 0) { A.errT = 0.6; const e = (A.ace ? 1.5 : 5) * (0.5 + d / 300); A.err.set(frand(-e, e), frand(-e * 0.5, e * 0.5), frand(-e, e)); }
    const lead = tgt === PILOT ? 0 : d / 650;
    c.aim.copy(tp).addScaledVector(tgt === PILOT ? PILOT.vel : tgt.vel, lead).add(A.err);
    s.aimYaw = angTo(s.aimYaw, Math.atan2(c.aim.x - s.pos.x, c.aim.z - s.pos.z), dt * (A.ace ? 4 : 2.4));
    s.aimPitch = Math.atan2(c.aim.y - (s.pos.y + 12 * s.sc), d);
    const facing = Math.abs(angWrap(Math.atan2(dx, dz) - s.aimYaw)) < 0.35;
    if (tgt !== PILOT) c.lock = tgt;
    // bursts
    A.burstT -= dt;
    if (A.los && facing && d < 950) {
      if (A.burst > 0) { c.fire = true; A.burst -= dt; }
      else if (A.burstT <= 0) { A.burst = s.T.primary.kind === 'beam' ? rr(0.4, 1.4) : rr(0.6, 1.5); A.burstT = rr(1.6, 3.6) / (A.ace ? 1.6 : 1); }
    }
    A.mslT -= dt;
    if (A.mslT <= 0 && A.los && d > 120 && tgt !== PILOT) { c.missileP = true; A.mslT = rr(10, 18); }
    if (d < (A.ace ? 110 : 40) * s.sc && facing && s.meleeCD <= 0 && tgt !== PILOT) c.slashP = true;
    if (A.dodgeT > 0) { c.boost = true; wantX = -dz / d * A.strafe; wantZ = dx / d * A.strafe; }
    A.jumpT -= dt;
    if (A.jumpT <= 0) { A.jumpT = rr(4, 10) / (A.ace ? 2 : 1); A.jumpHold = rr(0.4, 1.4); c.jumpP = s.onGround; }
    if (A.jumpHold > 0) { A.jumpHold -= dt; c.jump = true; }
    if (A.ace && d > 260) c.boost = true;
  }
  // obstacle avoidance and unsticking
  const L = Math.hypot(wantX, wantZ);
  if (L > 0.05) {
    const a = steer(s, wantX, wantZ);
    if (a === null) { c.jumpP = s.onGround; c.jump = true; c.mx = wantX / L * speed; c.mz = wantZ / L * speed; }
    else { c.mx = Math.sin(a) * speed; c.mz = Math.cos(a) * speed; }
    const sp = Math.hypot(s.vel.x, s.vel.z);
    if (sp < 1.5) { A.stuckT += dt; if (A.stuckT > 2.5) { c.jumpP = s.onGround; c.jump = true; c.boost = true; if (A.stuckT > 4) { A.stuckT = 0; A.wp = null; } } }
    else A.stuckT = 0;
  }
}

// ---------- a called suit walks (or flies) itself over ----------
function autoUpdate(s, dt) {
  const c = s.ctl, P = PILOT;
  c.mx = c.mz = 0; c.boost = c.jump = c.jumpP = c.fire = c.vulcan = c.missileP = c.slashP = c.block = false; c.lock = null;
  if (s.mode !== 'active') return;
  s.auto.t += dt;
  const dx = P.pos.x - s.pos.x, dz = P.pos.z - s.pos.z, d = Math.hypot(dx, dz);
  if (d < 32 || s.auto.t > 90) {
    s.auto = null;
    if (s.onGround) { s.mode = 'kneeldown'; s.modeT = 0; s.onParked = null; }
    return;
  }
  const a = steer(s, dx, dz);
  const head = a === null ? Math.atan2(dx, dz) : a;
  c.mx = Math.sin(head); c.mz = Math.cos(head);
  s.aimYaw = angTo(s.aimYaw, head, dt * 2);
  c.aim.copy(s.pos).addScaledVector(suitFwd(s.aimYaw, _v1), 100).setY(s.pos.y + 12);
  const far = d > 140;
  c.boost = far && s.boost > 15;
  const ground = terrainH(s.pos.x, s.pos.z);
  if (a === null || (d > 400 && s.pos.y < ground + 25 && s.boost > 30)) { c.jumpP = s.onGround; c.jump = true; }
  if (!s.onGround && d < 140) c.jump = false;
}

// ---------- patrol zones ----------
const ZONES = [
  { name: 'desert', x: 1500, z: -350, r: 480, n: 3, cd: 0, list: [] },
  { name: 'forest', x: -1550, z: 650, r: 420, n: 2, cd: 0, list: [] },
  { name: 'mtn', x: -450, z: -1500, r: 420, n: 2, cd: 0, list: [] },
  { name: 'plains', x: 1400, z: 1450, r: 380, n: 2, cd: 0, list: [] },
  { name: 'city', x: 200, z: -250, r: 420, n: 2, cd: 0, list: [] },
];
const MAX_ENEMIES = 12;
function enemyCount() { let n = 0; for (const s of SUITS) if (s.team === 1 && !s.dead && !s.gone) n++; return n; }
function spawnEnemy(x, z, o = {}) {
  const s = createSuit(o.ace ? 'ace' : 'grunt', x, z, o.yaw !== undefined ? o.yaw : Math.random() * TAU, { name: o.name });
  makeAI(s, o);
  if (o.drop) { s.pos.y += o.drop; s.onGround = false; s.vel.set(0, -10, 0); }
  return s;
}
function updateZones(dt) {
  if (!ZONES_ON) return;
  const me = playerPos(_v3);
  for (const Z of ZONES) {
    Z.list = Z.list.filter((s) => !s.gone);
    Z.cd -= dt;
    if (Z.list.filter((s) => !s.dead).length >= Z.n || Z.cd > 0 || enemyCount() >= MAX_ENEMIES) continue;
    // find a spawn spot out of the player's sight line
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * Z.r;
      const x = Z.x + Math.cos(a) * r, z = Z.z + Math.sin(a) * r;
      if (Math.hypot(x - me.x, z - me.z) < 650 || inBase(x, z) || hasBuildings(x, z) || lakeAt(x, z)) continue;
      Z.list.push(spawnEnemy(x, z, { zone: Z }));
      Z.cd = Z.list.length < Z.n ? rr(4, 10) : rr(45, 80);
      break;
    }
  }
}
let ZONES_ON = true;
