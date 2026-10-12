// Iron Saber — the pilot on foot: a 1.75 m person in a normal suit. Walking, boarding and leaving suits
// by the winch cable, ejecting from a dying suit, calling a parked suit over, getting hurt.

const PILOT = {
  pos: new V3(), vel: new V3(), yaw: 0, onFoot: true, onGround: true, dead: false, hp: 100, hurtT: 0,
  state: 'foot', t: 0, inSuit: null, lastSuit: null, walkPh: 0, from: new V3(), board: null, chute: false, deadT: 0, cause: '',
};
const pilotRig = (() => {
  const W = hex(0xe9ecef), B = hex(0x2f55a8), Gk = hex(0x3a3d44), O = hex(0xf09030), V = hex(0x1c2a3a);
  const root = new THREE.Group();
  const mk = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const mesh = (parts, parent) => { const m = new THREE.Mesh(mergeParts(parts), mechMat); m.castShadow = true; parent.add(m); return m; };
  const hips = mk(root, 0, 0.92, 0);
  mesh([{ geo: chamferBox(0.34, 0.2, 0.22, 0.05), c: W }], hips);
  const torso = mk(hips, 0, 0.08, 0);
  mesh([{ geo: chamferBox(0.38, 0.5, 0.25, 0.07), p: [0, 0.27, 0], c: W }, { geo: chamferBox(0.3, 0.18, 0.05, 0.02), p: [0, 0.36, 0.13], c: B },
    { geo: chamferBox(0.32, 0.36, 0.16, 0.05), p: [0, 0.3, -0.18], c: Gk }, { geo: chamferBox(0.06, 0.06, 0.03, 0.01), p: [0.1, 0.4, 0.15], c: O }], torso);
  const head = mk(torso, 0, 0.55, 0);
  mesh([{ geo: new THREE.IcosahedronGeometry(0.15, 1), p: [0, 0.1, 0], c: W }, { geo: chamferBox(0.2, 0.1, 0.06, 0.02), p: [0, 0.11, 0.12], c: V }], head);
  const arms = [], legs = [];
  for (const sg of [1, -1]) {
    const sh = mk(torso, sg * 0.24, 0.47, 0);
    mesh([{ geo: chamferBox(0.11, 0.3, 0.11, 0.03), p: [0, -0.14, 0], c: W }, { geo: chamferBox(0.12, 0.06, 0.12, 0.02), p: [0, -0.02, 0], c: B }], sh);
    const el = mk(sh, 0, -0.29, 0);
    mesh([{ geo: chamferBox(0.1, 0.28, 0.1, 0.03), p: [0, -0.13, 0], c: W }, { geo: chamferBox(0.09, 0.09, 0.09, 0.02), p: [0, -0.3, 0], c: Gk }], el);
    arms.push({ sh, el });
    const th = mk(hips, sg * 0.1, -0.04, 0);
    mesh([{ geo: chamferBox(0.14, 0.42, 0.14, 0.04), p: [0, -0.2, 0], c: W }], th);
    const kn = mk(th, 0, -0.42, 0);
    mesh([{ geo: chamferBox(0.13, 0.4, 0.13, 0.04), p: [0, -0.19, 0], c: W }, { geo: chamferBox(0.13, 0.08, 0.24, 0.03), p: [0, -0.42, 0.04], c: Gk }], kn);
    legs.push({ th, kn });
  }
  // parachute canopy for ejections
  const chute = new THREE.Group();
  const can = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 6, 0, TAU, 0, Math.PI / 2.6), new THREE.MeshLambertMaterial({ color: 0xf06a20, side: THREE.DoubleSide }));
  can.position.y = 5.2; can.scale.y = 0.5;
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([0, 1, 2, 3, 4, 5].flatMap((i) => [new V3(0, 1.4, 0), new V3(Math.cos(i * TAU / 6) * 3, 5.3, Math.sin(i * TAU / 6) * 3)])), new THREE.LineBasicMaterial({ color: 0x333333 }));
  chute.add(can, lines); chute.visible = false;
  root.add(chute);
  scene.add(root);
  return { root, hips, torso, head, arms, legs, chute };
})();
// the winch cable hanging from an open hatch
const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 4).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: 0x222222 }));
const cableHook = new THREE.Mesh(chamferBox(0.5, 0.25, 0.5, 0.06), new THREE.MeshLambertMaterial({ color: 0xd8b020 }));
scene.add(cable, cableHook);
cable.visible = cableHook.visible = false;

function hatchWorld(s, out) { out.set(0, 0.8, 0.5); return s.rig.J.hatch.localToWorld(out); }
function cockpitWorld(s, out) { const c = BASE_DIMS.cockpit; out.set(c[0], c[1], c[2]); return s.rig.J.torso.localToWorld(out); }
// The spot on the ground under a parked suit's cable.
function cableFoot(s, out) { hatchWorld(s, out); suitFwd(s.hipYaw, _v6); out.addScaledVector(_v6, 1.2); out.y = groundY(out.x, out.z); return out; }

function spawnPilot(x, z, yaw) {
  PILOT.pos.set(x, groundY(x, z), z); PILOT.vel.set(0, 0, 0);
  PILOT.yaw = yaw; PILOT.onFoot = true; PILOT.dead = false; PILOT.hp = 100; PILOT.state = 'foot'; PILOT.inSuit = null; PILOT.chute = false;
  pilotRig.root.visible = true;
}

// ---------- on-foot movement ----------
function updatePilot(dt, inp) {
  const P = PILOT;
  P.hurtT -= dt;
  if (P.hurtT < -4 && P.hp < 100 && !P.dead) P.hp = Math.min(100, P.hp + dt * 6);
  if (P.state === 'dead') { P.deadT += dt; if (P.deadT > 3.5) respawnPlayer(); return; }
  if (P.state === 'boarding') { updateBoarding(dt); return; }
  if (P.state === 'exiting') { updateExiting(dt); return; }
  if (P.state === 'suit') return;
  const eject = P.state === 'eject';
  // movement
  const fwdX = Math.sin(CAM.yaw), fwdZ = Math.cos(CAM.yaw);
  let mx = fwdX * inp.f - fwdZ * inp.s, mz = fwdZ * inp.f + fwdX * inp.s;
  const L = Math.hypot(mx, mz);
  if (L > 1) { mx /= L; mz /= L; }
  const wet = lakeAt(P.pos.x, P.pos.z) && P.pos.y < WATER_Y;
  const sp = (inp.run ? 8 : 4.6) * (wet ? 0.5 : 1);
  if (P.onGround && !eject) {
    const k = 1 - Math.exp(-dt * 12);
    P.vel.x = lerp(P.vel.x, mx * sp, k); P.vel.z = lerp(P.vel.z, mz * sp, k);
    if (inp.jumpP) { P.vel.y = 4.6; P.onGround = false; }
  } else {
    const k = 1 - Math.exp(-dt * (eject ? 0.6 : 1.5));
    P.vel.x = lerp(P.vel.x, mx * sp * (eject ? 0.8 : 1), k); P.vel.z = lerp(P.vel.z, mz * sp * (eject ? 0.8 : 1), k);
    P.vel.y -= 9.8 * dt;
    if (eject && P.t > 0.9) { P.chute = true; P.vel.y = Math.max(P.vel.y, -5.5); }
  }
  P.t += dt;
  const vyBefore = P.vel.y;
  P.pos.addScaledVector(P.vel, dt);
  collidePilot(dt);
  if (P.onGround) {
    if (vyBefore < -13 && !eject) damagePilot((-vyBefore - 13) * 14, null, 'FELL');
    if (eject) { P.state = 'foot'; P.chute = false; say('PILOT LANDED SAFELY', 2.2); }
  }
  const hsp = Math.hypot(P.vel.x, P.vel.z);
  if (hsp > 0.3) P.yaw = angTo(P.yaw, Math.atan2(P.vel.x, P.vel.z), dt * 10);
  if (P.onGround && hsp > 0.5) {
    const prev = Math.sin(P.walkPh);
    P.walkPh += hsp * dt * 2.2;
    if ((prev > 0) !== (Math.sin(P.walkPh) > 0)) footSound(inp.run);
  }
  posePilot(dt, hsp);
}
function collidePilot(dt) {
  const P = PILOT, p = P.pos, R = 0.35, step = 0.55, H = 1.75;
  let ground = groundY(p.x, p.z);
  if (lakeAt(p.x, p.z)) ground = Math.max(terrainH(p.x, p.z), WATER_Y - 1.1);
  blocksInBox(p.x - R, p.y - 40, p.z - R, p.x + R, p.y + H, p.z + R, (id) => {
    const B = BLK_[id], top = B.y + B.hy, bot = B.y - B.hy;
    const cx = clamp(p.x, B.x - B.hx, B.x + B.hx), cz = clamp(p.z, B.z - B.hz, B.z + B.hz);
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (top <= p.y + step) { if (d < R && top > ground) ground = top; return; }
    if (bot > p.y + H || d >= R) return;
    if (d > 1e-4) { p.x += dx / d * (R - d); p.z += dz / d * (R - d); }
    else {
      const ex = B.hx - Math.abs(p.x - B.x), ez = B.hz - Math.abs(p.z - B.z);
      if (ex < ez) p.x += (Math.sign(p.x - B.x) || 1) * (ex + R); else p.z += (Math.sign(p.z - B.z) || 1) * (ez + R);
    }
  });
  rocksNear(p.x, p.z, R, (o) => {
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), rr2 = o.r * 0.95 + R;
    const top = o.y + o.r * 0.7;
    if (d < rr2) {
      if (top <= p.y + step) { if (top > ground) ground = top; return; }
      if (d > 1e-3) { p.x += dx / d * (rr2 - d); p.z += dz / d * (rr2 - d); }
    }
  });
  // suits are solid legs and feet
  for (const s of SUITS) {
    if (s.dead || s.gone) continue;
    for (const side of ['L', 'R']) {
      s.rig.J['an' + side].getWorldPosition(_v1);
      const dx = p.x - _v1.x, dz = p.z - _v1.z, d = Math.hypot(dx, dz), rr2 = 1.6 * s.sc + R;
      if (d < rr2 && p.y < _v1.y + 1.5 && d > 1e-3) {
        if (p.y > _v1.y + 0.4) { if (_v1.y + 0.5 > ground) ground = _v1.y + 0.5; continue; }
        p.x += dx / d * (rr2 - d); p.z += dz / d * (rr2 - d);
      }
    }
  }
  const lim = HALF - 80;
  p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim);
  if (p.y <= ground + 0.02 && P.vel.y <= 0) {
    p.y = P.onGround ? lerp(p.y, ground, 1 - Math.exp(-dt * 20)) : ground;
    if (p.y < ground) p.y = ground;
    P.vel.y = 0; P.onGround = true;
  } else if (p.y > ground + 0.4 || P.vel.y > 0) P.onGround = false;
  else p.y = lerp(p.y, ground, 1 - Math.exp(-dt * 16));
}
function posePilot(dt, hsp) {
  const R = pilotRig, P = PILOT;
  R.root.position.copy(P.pos);
  R.root.rotation.y = P.yaw;
  const g = clamp(hsp / 5, 0, 1.2), s = Math.sin(P.walkPh);
  const air = P.onGround ? 0 : 1;
  R.legs[0].th.rotation.x = lerp(-0.6 * s * g, -0.5, air); R.legs[1].th.rotation.x = lerp(0.6 * s * g, 0.1, air);
  R.legs[0].kn.rotation.x = lerp(0.1 + 0.8 * Math.max(0, Math.cos(P.walkPh)) * g, 0.8, air);
  R.legs[1].kn.rotation.x = lerp(0.1 + 0.8 * Math.max(0, -Math.cos(P.walkPh)) * g, 0.4, air);
  const climb = P.state === 'boarding' || P.state === 'exiting' ? 1 : 0, ch = P.chute ? 1 : 0;
  R.arms[0].sh.rotation.set(lerp(0.5 * s * g, -2.9, Math.max(climb, ch)), 0, 0.1 + ch * 0.3);
  R.arms[1].sh.rotation.set(lerp(-0.5 * s * g, -2.9, Math.max(climb, ch)), 0, -0.1 - ch * 0.3);
  R.arms[0].el.rotation.x = R.arms[1].el.rotation.x = -0.3;
  R.torso.rotation.x = clamp(g * 0.12, 0, 0.2);
  R.hips.position.y = 0.92 - Math.abs(Math.cos(P.walkPh)) * 0.04 * g;
  R.chute.visible = P.chute;
  R.root.visible = P.onFoot && !P.dead && (camMode === 'tp' || P.state === 'boarding' || P.state === 'exiting');
}

// ---------- boarding and leaving ----------
function boardableSuit() {
  let best = null, bd = 9;
  for (const s of SUITS) {
    if (s.team !== 0 || s.dead || s.gone || s.mode !== 'parked' || s.pilot || s.hatch < 0.9) continue;
    cableFoot(s, _v1);
    const d = Math.hypot(_v1.x - PILOT.pos.x, _v1.z - PILOT.pos.z);
    if (d < bd * s.sc) { bd = d; best = s; }
  }
  return best;
}
function startBoarding(s) {
  const P = PILOT;
  P.state = 'boarding'; P.t = 0; P.board = s; P.from.copy(P.pos);
  P.vel.set(0, 0, 0);
  winchSound();
  say('BOARDING ' + s.T.name, 2);
}
function updateBoarding(dt) {
  const P = PILOT, s = P.board;
  P.t += dt;
  const dur = 2.6;
  cableFoot(s, _v1);
  hatchWorld(s, _v2);
  if (P.t < 0.5) P.pos.lerp(_v1, 1 - Math.exp(-dt * 8));
  else { const k = ease(clamp((P.t - 0.5) / (dur - 0.7), 0, 1)); P.pos.lerpVectors(_v1, _v2, k); P.pos.y -= 1.6 * (1 - k); }
  P.yaw = s.hipYaw + Math.PI;
  P.walkPh += dt * 3;
  posePilot(dt, 0);
  if (P.t >= dur) enterSuit(s);
}
function enterSuit(s) {
  const P = PILOT;
  P.state = 'suit'; P.onFoot = false; P.inSuit = s; P.lastSuit = s; P.board = null;
  s.pilot = true; s.mode = 'standup'; s.modeT = 0; s.auto = null;
  pilotRig.root.visible = false;
  CAM.yaw = s.aimYaw = s.hipYaw; CAM.pitch = 0; CAM.tpFresh = true;
  hatchSound(s.pos);
  startBoot(s);
  if (s.home && !s.everBoarded) { s.everBoarded = true; onFirstBoard(s); }
}
function canExit(s) { return s.mode === 'active' && s.onGround && Math.hypot(s.vel.x, s.vel.z) < 4 && s.slash < 0; }
function exitSuit() {
  const s = PILOT.inSuit;
  if (!s || !canExit(s)) { if (s) hudWarn('STOP AND LAND TO DISEMBARK'); return; }
  s.mode = 'kneeldown'; s.modeT = 0;
  s.ctl = newCtl(); s.ctl.aim.copy(s.spheres[0].p).addScaledVector(suitFwd(s.hipYaw, _v1), 50);
  s.onParked = () => {
    const P = PILOT;
    P.state = 'exiting'; P.t = 0; P.onFoot = true;
    hatchWorld(s, P.pos);
    s.pilot = false;
    hatchSound(s.pos); winchSound();
    pilotRig.root.visible = true;
  };
  hatchSound(s.pos);
}
function updateExiting(dt) {
  const P = PILOT, s = P.inSuit;
  P.t += dt;
  const dur = 2.2;
  hatchWorld(s, _v2); cableFoot(s, _v1);
  const k = ease(clamp(P.t / dur, 0, 1));
  P.pos.lerpVectors(_v2, _v1, k);
  P.yaw = s.hipYaw + Math.PI;
  posePilot(dt, 0);
  if (P.t >= dur) {
    P.state = 'foot'; P.inSuit = null; P.onGround = true;
    suitFwd(s.hipYaw, _v1);
    P.pos.addScaledVector(_v1, 1.5);
    CAM.yaw = s.hipYaw + Math.PI; CAM.pitch = 0.25; CAM.tpFresh = true;
    say('DISEMBARKED · [C] CALLS YOUR SUIT', 2.5);
  }
}
function ejectPilot(s) {
  const P = PILOT;
  cockpitWorld(s, P.pos);
  suitFwd(s.hipYaw, _v1);
  P.vel.set(_v1.x * 8, 26, _v1.z * 8);
  P.state = 'eject'; P.t = 0; P.onFoot = true; P.onGround = false; P.inSuit = null; P.chute = false;
  s.pilot = false;
  pilotRig.root.visible = true;
  say('EJECT! EJECT!', 2.5, 'warn');
  hudFlash(1);
}
// Bring the last suit you rode over to you.
function callSuit() {
  const s = PILOT.lastSuit;
  if (!s || s.dead || s.gone) { say('NO SUIT TO CALL', 1.6); return; }
  if (s.pilot) return;
  const d = Math.hypot(s.pos.x - PILOT.pos.x, s.pos.z - PILOT.pos.z);
  if (d < 45) { say(s.T.name + ' IS RIGHT HERE', 1.6); return; }
  s.auto = { t: 0 };
  if (s.mode === 'parked') { s.mode = 'standup'; s.modeT = 0; }
  say(s.T.name + ' ON ITS WAY', 2);
  beep(900, 0.08, 0.08); beep(1300, 0.08, 0.08, 0.1);
}

// ---------- harm ----------
function damagePilot(d, from, cause) {
  const P = PILOT;
  if (P.dead || !P.onFoot || P.state === 'boarding' || P.state === 'exiting') return;
  P.hp -= d; P.hurtT = 0;
  hudFlash(Math.min(1, d / 50));
  hurtSound();
  if (P.hp <= 0) killPilot(cause || 'KILLED IN ACTION');
}
function stompPilot(x, y, z, r, s) {
  const P = PILOT;
  if (!P.onFoot || P.dead || s.team === 0) return;
  if (Math.hypot(P.pos.x - x, P.pos.z - z) < r && Math.abs(P.pos.y - y) < 3) killPilot('CRUSHED UNDERFOOT');
}
function nearMissPilot(p, a, b) {
  const P = PILOT;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
  const cx = P.pos.x, cy = P.pos.y + 1, cz = P.pos.z;
  const t = clamp(((cx - a.x) * dx + (cy - a.y) * dy + (cz - a.z) * dz) / L2, 0, 1);
  const d = Math.hypot(a.x + dx * t - cx, a.y + dy * t - cy, a.z + dz * t - cz);
  if (d < 1.2) damagePilot(p.kind === 'vulcan' ? 45 : 200, p.pos);
  else if (d < 5 && p.kind !== 'vulcan') damagePilot(14, p.pos);
}
function killPilot(cause) {
  const P = PILOT;
  P.dead = true; P.state = 'dead'; P.deadT = 0; P.cause = cause; P.hp = 0;
  pilotRig.root.visible = false;
  say(cause, 3, 'warn');
  $('#fade').style.opacity = 1;
}
function respawnPlayer() {
  $('#fade').style.opacity = 0;
  const v = SUITS.find((s) => s.type === 'valiant' && !s.dead && !s.gone && !s.pilot);
  if (!v) respawnSuitAtHome(HOME_SUITS.valiant);
  spawnPilot(BAYS[1].x + 6, BAYS[1].z + 26, Math.PI);
  CAM.yaw = Math.PI; CAM.pitch = 0.1;
  say('REDEPLOYED AT COALITION BASE', 2.5);
}

// ---------- cable ----------
function updateCable() {
  let s = null;
  if (PILOT.state === 'boarding') s = PILOT.board;
  else if (PILOT.state === 'exiting') s = PILOT.inSuit;
  else {
    let bd = 220;
    for (const o of SUITS) {
      if (o.team !== 0 || o.dead || o.gone || o.mode !== 'parked' || o.hatch < 0.95) continue;
      const d = o.pos.distanceTo(camera.position);
      if (d < bd) { bd = d; s = o; }
    }
  }
  cable.visible = cableHook.visible = !!s;
  if (!s) return;
  hatchWorld(s, _v1);
  const bottom = PILOT.state === 'boarding' || PILOT.state === 'exiting' ? _v2.copy(PILOT.pos).setY(PILOT.pos.y + 1.9) : cableFoot(s, _v2).setY(_v2.y + 0.6);
  const top = _v1;
  cable.position.copy(top);
  const L = Math.max(0.1, top.distanceTo(bottom));
  cable.scale.set(1, L, 1);
  _v3.copy(bottom).sub(top).normalize();
  cable.quaternion.setFromUnitVectors(DOWN, _v3);
  cableHook.position.copy(bottom);
}
