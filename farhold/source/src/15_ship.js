// Farhold — the starship: boarding, take-off, flight (atmosphere and space), pulse drive, landing, cannon,
// damage, and seamless hand-over between planet frames and open space.

const SHIP = {
  cur: null, obj: null, frame: null, pos: new V3(), q: new Q4(), vel: new V3(), speed: 0, state: 'landed', t: 0,
  stick: new THREE.Vector2(), pulseK: 0, heat: 0, over: 0, fireT: 0, gunSide: 1, onPad: false, path: null, alt: 1e9, inAtmo: false,
  camQ: new Q4(), camInit: false, cockpit: false, landHold: 0, hitT: 0, jammed: 0, lowWarn: 0, boostK: 0,
};
function makeShipData(type, seed, name) {
  const T = SHIP_TYPES[type];
  return { type, seed, name: name || NAMEGEN.word(RNG(seed), 2) + ' ' + RNG(seed + 1).pick(['Wanderer', 'Lantern', 'Vigil', 'Ember', 'Drifter', 'Heron', 'Comet', 'Tern', 'Promise']), cargo: new Inv(T.slots, 2, 'Starship'), lift: 100, pulse: 100, shield: 100 * T.shield, hull: 100 };
}
const shipStats = () => SHIP_TYPES[SHIP.cur.type];
const shipMaxShield = () => 100 * shipStats().shield * techFx('dshield');
function setShip(data) {
  if (SHIP.dash) { R.camera.remove(SHIP.dash); SHIP.dash = null; }
  if (SHIP.obj) { SHIP.obj.root.parent && SHIP.obj.root.parent.remove(SHIP.obj.root); }
  SHIP.cur = data;
  SHIP.obj = makeShipObject(data.type, data.seed);
  R.scene.add(SHIP.obj.root);
  bus.emit('shipChanged', data);
}
// put the ship somewhere (landed), local to frame f
function placeShip(f, pos, q, state = 'landed') {
  SHIP.frame = f; SHIP.pos.copy(pos); SHIP.q.copy(q); SHIP.vel.set(0, 0, 0); SHIP.speed = 0; SHIP.state = state; SHIP.t = 0; SHIP.pulseK = 0;
  if (SHIP.obj) (frameGroup(f) || R.scene).add(SHIP.obj.root);
  syncShipModel();
}
function syncShipModel() {
  if (!SHIP.obj) return;
  const g = frameGroup(SHIP.frame) || R.scene;
  if (SHIP.obj.root.parent !== g) g.add(SHIP.obj.root);
  SHIP.obj.root.position.copy(SHIP.pos);
  SHIP.obj.root.quaternion.copy(SHIP.q);
  const th = SHIP.state === 'landed' ? 0 : clamp(SHIP.speed / 200, 0.15, 1) + SHIP.pulseK * 1.5 + SHIP.boostK * 0.6;
  for (const fl of SHIP.obj.flames) { const k = th * (0.85 + Math.random() * 0.3); fl.scale.set(1 + th * 0.3, 1 + th * 0.3, Math.max(0.01, k * 1.6)); fl.visible = th > 0.01; }
}
function shipUp(out = new V3()) { return frameUp(SHIP.frame, SHIP.pos, out); }
function shipWorldPos(out = new V3()) { return toWorld(SHIP.frame, SHIP.pos, out); }
// switch the ship (and a seated player) to a new frame, keeping world position and orientation
function shipChangeFrame(nf) {
  const of = SHIP.frame;
  const wp = toWorld(of, SHIP.pos, new V3()), wq = quatToWorld(of, SHIP.q, new Q4()), wv = dirToWorld(of, SHIP.vel, new V3());
  const cq = quatToWorld(of, SHIP.camQ, new Q4());
  SHIP.frame = nf;
  toLocal(nf, wp, SHIP.pos); quatToLocal(nf, wq, SHIP.q); dirToLocal(nf, wv, SHIP.vel); quatToLocal(nf, cq, SHIP.camQ);
  syncShipModel();
  if (PLAYER.inShip) PLAYER.frame = nf;
  bus.emit('shipFrame', nf, of);
}
function shipGroundR() { const f = SHIP.frame; return f && f.kind === 'planet' ? groundHeightAt(f, SHIP.pos) : -Infinity; }

// ---------- boarding ----------
addInteractProvider((f, p) => {
  if (!SHIP.cur || SHIP.state !== 'landed' || SHIP.frame !== f || PLAYER.inShip) return null;
  const up = shipUp(new V3());
  const c = SHIP.pos.clone().addScaledVector(up, SHIP.obj.S.gearH + 1.2);
  return [{ key: 'ship', pos: c, r: 5.5, prompt: '[interact] Board ' + esc(SHIP.cur.name), act: boardShip }];
});
function boardShip() {
  PLAYER.inShip = true; PLAYER.frame = SHIP.frame;
  if (PLAYER.rig) PLAYER.rig.root.visible = false;
  SHIP.camInit = false;
  AU.sfx('board');
  bus.emit('boarded');
}
function exitShip() {
  const f = SHIP.frame;
  const up = shipUp(new V3());
  const side = new V3(-1, 0, 0).applyQuaternion(SHIP.q);
  let p = SHIP.pos.clone().addScaledVector(side, 6.5).addScaledVector(up, 0.6);
  PLAYER.inShip = false;
  placePlayer(f, p, new V3(0, 0, -1).applyQuaternion(SHIP.q));
  if (f && f.kind === 'planet') snapToGround(PLAYER);
  PLAYER.vel.set(0, 0, 0);
  AU.sfx('board');
  bus.emit('exitShip');
  SAVE.save('exit');
}

// ---------- update ----------
function updateShip(dt) {
  if (!SHIP.cur) return;
  const S = SHIP;
  S.hitT = Math.max(0, S.hitT - dt);
  S.fireT = Math.max(0, S.fireT - dt);
  S.heat = Math.max(0, S.heat - dt * (S.over > 0 ? 30 : 22));
  if (S.over > 0) S.over = Math.max(0, S.over - dt);
  // shields recharge slowly when not hit
  if (S.hitT <= 0 && S.state !== 'landed') S.cur.shield = Math.min(shipMaxShield(), S.cur.shield + dt * 2.5);
  const pilot = PLAYER.inShip && PLAYER.alive && !UI.blocking();
  S.alt = S.frame && S.frame.kind === 'planet' ? S.pos.length() - shipGroundR() : 1e9;
  switch (S.state) {
    case 'landed': {
      S.speed = 0; S.vel.set(0, 0, 0);
      if (pilot) {
        if (Act.down('interact')) { S.landHold += dt; if (S.landHold > 0.45) { S.landHold = 0; exitShip(); } } else S.landHold = 0;
        if (Act.hit('jump') || Act.analog('thrust') > 0.5 && Act.hit('thrust')) tryTakeoff();
      }
      break;
    }
    case 'takeoff': {
      S.t += dt;
      const up = shipUp(new V3());
      const k = S.t / 2.4;
      S.speed = 0;
      S.pos.addScaledVector(up, dt * (6 + k * 26));
      if (S.frame && S.frame.kind === 'planet') { const fw = new V3(0, 0, -1).applyQuaternion(S.q); _q1.setFromAxisAngle(new V3(1, 0, 0).applyQuaternion(S.q), dt * 0.12 * (k > 0.5 ? 1 : 0)); S.q.premultiply(_q1); S.pos.addScaledVector(fw, dt * k * 15); }
      if (S.t > 2.4) { S.state = 'flight'; S.speed = 45; S.vel.copy(new V3(0, 0, -1).applyQuaternion(S.q).multiplyScalar(45)); bus.emit('tookOff'); }
      break;
    }
    case 'flight': flyShip(dt, pilot); break;
    case 'landing': {
      S.t += dt;
      const L = S.path, k = smooth(0, 1, S.t / L.dur);
      S.pos.copy(L.p0).lerp(L.p1, k);
      const hump = Math.sin(k * Math.PI) * 0;
      S.pos.addScaledVector(L.up, hump);
      S.q.copy(L.q0).slerp(L.q1, Math.min(1, k * 1.4));
      S.speed = (1 - k) * 20;
      if (S.t >= L.dur) { S.state = 'landed'; S.onPad = !!L.pad; S.pos.copy(L.p1); S.q.copy(L.q1); AU.sfx('touchdown'); bus.emit('landed', S.frame); }
      break;
    }
    case 'dock': case 'undock': followPath(dt); break;
  }
  syncShipModel();
  if (S.state !== 'landed') AU.loop('engine', clamp(0.25 + S.speed / 400, 0, 1), 0.6 + S.speed / 500 + S.pulseK);
  else AU.loop('engine', 0);
  AU.loop('pulse', S.pulseK * 0.7);
}
function tryTakeoff() {
  const S = SHIP;
  if (!hasTech('thrusters')) { HUD.msg('Lift Thrusters are damaged. Repair them in the ship’s technology panel.', 'bad'); AU.sfx('deny'); bus.emit('takeoffBlocked', 'broken'); return; }
  const free = S.onPad || (S.frame && S.frame.kind === 'station');
  if (!free && S.cur.lift < 25) { HUD.msg('Lift Thrusters need fuel (Di-hydrogen). Open the quick menu to recharge.', 'bad'); AU.sfx('deny'); bus.emit('takeoffBlocked', 'fuel'); return; }
  if (!free) S.cur.lift -= 25;
  if (S.frame && S.frame.kind === 'station') { startUndock(); return; }
  S.state = 'takeoff'; S.t = 0; S.onPad = false;
  AU.sfx('takeoff');
}
function flyShip(dt, pilot) {
  const S = SHIP, f = S.frame;
  const st = shipStats();
  const fwd = new V3(0, 0, -1).applyQuaternion(S.q), right = new V3(1, 0, 0).applyQuaternion(S.q), sup = new V3(0, 1, 0).applyQuaternion(S.q);
  let pl = f && f.kind === 'planet' ? f.pl : null;
  const up = pl ? S.pos.clone().normalize() : null;
  S.alt = pl ? S.pos.length() - shipGroundR() : 1e9;
  S.inAtmo = pl ? S.pos.length() < pl.atmoR + 500 : false;
  // stick: mouse accumulates deflection that springs back; pad sets it directly
  if (pilot) {
    const lk = { x: Input.m.dx * SETTINGS.sens * 0.004, y: Input.m.dy * SETTINGS.sens * 0.004 * (SETTINGS.invertY ? -1 : 1) };
    S.stick.x += lk.x; S.stick.y += lk.y;
    if (Input.gp.axes[0] || Input.gp.axes[1]) { S.stick.x = Input.gp.axes[0]; S.stick.y = Input.gp.axes[1] * (SETTINGS.invertY ? -1 : 1); }
  }
  if (S.stick.length() > 1) S.stick.normalize();
  S.stick.multiplyScalar(Math.max(0, 1 - dt * (Input.gp.active ? 12 : 2.2)));
  const turn = st.turn * (S.pulseK > 0.1 ? 0.3 : 1) * (S.speed > 400 ? 0.7 : 1);
  const yawR = -S.stick.x * 1.35 * turn, pitchR = -S.stick.y * 1.5 * turn;
  let rollR = 0;
  // positive roll drops the right wing
  if (pilot) rollR = (Act.down('rollR') ? 1 : 0) - (Act.down('rollL') ? 1 : 0) + (Input.gp.axes[2] || 0);
  rollR *= 1.9;
  // auto-level in atmosphere
  if (S.inAtmo && Math.abs(rollR) < 0.05) {
    const side = right.dot(up);
    rollR += side * 1.6;
    rollR += S.stick.x * 0.6; // bank into turns
  }
  _q1.setFromAxisAngle(sup, yawR * dt); S.q.premultiply(_q1);
  _q1.setFromAxisAngle(right, pitchR * dt); S.q.premultiply(_q1);
  _q1.setFromAxisAngle(fwd, rollR * dt); S.q.premultiply(_q1);
  S.q.normalize();
  // throttle
  const atm = S.inAtmo;
  const cruise = atm ? 60 : 140, maxS = (atm ? 170 : 330) * st.speed, minS = atm ? 0 : 20, boostS = (atm ? 300 : 800) * st.speed;
  let target = cruise;
  const th = pilot ? Act.analog('thrust') : 0, br = pilot ? Act.analog('brake') : 0;
  if (th > 0.05) target = lerp(cruise, maxS, th);
  if (br > 0.05) target = lerp(cruise, minS, br);
  const boosting = pilot && Act.down('boost') && S.pulseK < 0.1;
  S.boostK = lerp(S.boostK, boosting ? 1 : 0, Math.min(1, dt * 4));
  if (boosting) target = boostS;
  // hovering near the ground keeps whatever speed you leave it at
  if (atm && S.alt < 60 && th < 0.05 && br < 0.05) target = Math.min(S.speed, cruise);
  // pulse drive
  S.jammed = Math.max(0, S.jammed - dt);
  const pulseHeld = pilot && Act.down('pulse');
  let pulseOK = !atm && hasTech('pulse') && S.cur.pulse > 0 && S.jammed <= 0;
  const near = nearestBody(shipWorldPos(new V3()));
  if (pulseHeld && !pulseOK && S.pulseK < 0.05 && Act.hit('pulse')) {
    if (atm) HUD.msg('Pulse drive unavailable in an atmosphere.', 'bad');
    else if (!hasTech('pulse')) HUD.msg('Pulse Drive is damaged. Repair it in the ship’s technology panel.', 'bad');
    else if (S.cur.pulse <= 0) HUD.msg('Pulse Drive needs Tritium. Mine asteroids with the cannon.', 'bad');
    else if (S.jammed > 0) HUD.msg('Pulse drive jammed by hostile ships.', 'bad');
    AU.sfx('deny');
  }
  if (pulseHeld && pulseOK && near.d > 1600) { S.pulseK = Math.min(1, S.pulseK + dt / 1.6); S.cur.pulse = Math.max(0, S.cur.pulse - dt * 1.4 / techFx('pulse')); }
  else S.pulseK = Math.max(0, S.pulseK - dt * (near.d < 1600 ? 2.5 : 1.4));
  if (S.pulseK > 0) { const pS = 7000 * techFx('pulse') * clamp(near.d / 20000, 0.25, 1); target = lerp(target, pS, S.pulseK); }
  const acc = target > S.speed ? (boosting ? 160 : 70) + S.pulseK * 4000 : 110 + S.pulseK * 6000;
  S.speed += clamp(target - S.speed, -acc * dt, acc * dt);
  S.vel.lerp(fwd.clone().multiplyScalar(S.speed), Math.min(1, dt * 5));
  // slow hover sinks gently toward the ground
  S.pos.addScaledVector(S.vel, dt);
  if (pl) {
    const gr = shipGroundR(), r = S.pos.length();
    const seaR = pl.P.sea != null ? pl.R + pl.P.sea : -Infinity;
    const floor = Math.max(gr, seaR) + S.obj.S.gearH + 1.5;
    if (r < floor) {
      S.pos.multiplyScalar(floor / r);
      if (S.speed > 60) { damageShip(4, 'ground'); S.speed *= 0.6; CAM.shake = 0.4; AU.sfx('scrape', 0.7); }
      // nose up
      if (fwd.dot(up) < 0.1) { _q1.setFromAxisAngle(right, dt * 1.5); S.q.premultiply(_q1); }
    }
    // atmosphere entry heat
    S.entry = r < pl.atmoR + 200 && r > pl.atmoR - 600 && S.speed > 250 ? 1 : 0;
  } else S.entry = 0;
  // pull a fast ship out of the pulse before it reaches the surface
  if (near.d < 1600 && S.speed > 900) S.speed = lerp(S.speed, 600, Math.min(1, dt * 3));
  // frame hand-over
  if (pl && S.pos.length() > pl.soi) shipChangeFrame(null);
  else if (!pl) { const wp = shipWorldPos(new V3()); const np = planetAt(wp); if (np && wp.distanceTo(np.pos) < np.soi * 0.95) shipChangeFrame(planetFrame(np)); }
  // space collisions
  if (!S.frame) { stationCollideShip(); asteroidCollideShip(); starHeat(dt); }
  // weapons
  if (pilot && Act.down('shipFire') && S.fireT <= 0 && S.over <= 0 && S.pulseK < 0.05) fireShipCannon();
  // land
  if (pilot && atm) {
    if (Act.down('interact')) { S.landHold += dt; if (S.landHold > 0.4) { S.landHold = 0; tryLand(); } } else S.landHold = 0;
  }
  // docking trigger
  if (!S.frame && STATION.obj) checkDocking();
}
function nearestBody(wp) {
  let d = Infinity;
  for (const p of PLANETS.list) { const dd = wp.distanceTo(p.pos) - (p.atmoR || p.R); if (dd < d) d = dd; }
  if (STATION.obj) d = Math.min(d, wp.distanceTo(STATION.pos) - 400);
  d = Math.min(d, wp.length() - (SYS.cur ? SYS.cur.starR * 2 : 0));
  return { d };
}
function starHeat(dt) { const wp = shipWorldPos(new V3()); const d = wp.length(); if (SYS.cur && d < SYS.cur.starR * 1.6) { damageShip(dt * 25, 'star'); SHIP.speed *= 0.98; if (d < SYS.cur.starR * 1.1) { SHIP.pos.multiplyScalar(SYS.cur.starR * 1.1 / d); } HUD.warn('Hull temperature critical'); } }

function padsIn(f) {
  const out = [];
  if (!f) return out;
  if (f.kind === 'planet') {
    for (const b of BASES.list) if (b.pl === f.pl.id) for (const pt of b.parts) if (pt.id === 'pad') out.push({ pos: pt.pos.clone().addScaledVector(pt.pos.clone().normalize(), 0.45), q: pt.q, base: b });
    for (const ps of POIS.live) if (ps.pl === f.pl) for (const s of ps.spots) if (s.kind === 'pad') out.push({ pos: s.world.clone(), q: ps.q });
  }
  return out;
}
function tryLand() {
  const S = SHIP, f = S.frame;
  if (!f || f.kind !== 'planet') return;
  const pl = f.pl;
  if (S.alt > 180) { HUD.msg('Too high to land — get within 180 m of the ground.', 'bad'); return; }
  if (S.speed > 150) { HUD.msg('Slow down to land.', 'bad'); return; }
  let p1 = null, pad = null;
  for (const p of padsIn(f)) { if (p.pos.distanceTo(S.pos) < 160) { pad = p; p1 = p.pos.clone(); break; } }
  const up = new V3();
  if (!p1) {
    const fwd = new V3(0, 0, -1).applyQuaternion(S.q);
    const dir = S.pos.clone().addScaledVector(fwd, Math.min(40, S.speed * 0.5)).normalize();
    const h = surfaceH(pl, dir);
    if (pl.P.sea != null && h < pl.P.sea + 0.3) { HUD.msg('Cannot land on water.', 'bad'); AU.sfx('deny'); return; }
    p1 = dir.clone().multiplyScalar(pl.R + h);
    // keep clear of POI buildings
    const poi = nearPOI(pl, dir, 6);
    if (poi && poi.type !== 'post') { HUD.msg('Too close to a structure to land.', 'bad'); return; }
  }
  up.copy(p1).normalize();
  const fw = new V3(0, 0, -1).applyQuaternion(S.q);
  const q1 = basisQuat(up, fw, new Q4());
  S.path = { p0: S.pos.clone(), p1, q0: S.q.clone(), q1, dur: clamp(S.pos.distanceTo(p1) / 22, 2.2, 6), up, pad };
  S.state = 'landing'; S.t = 0;
  AU.sfx('landing');
}

// ---------- weapons and damage ----------
const SHOTS = [];
const _sd = new V3(), _sp = new V3();
const _shotGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 5); _shotGeo.rotateX(Math.PI / 2);
function fireShipCannon() {
  const S = SHIP;
  S.fireT = 0.09; S.heat += 2.6;
  if (S.heat >= 100) { S.over = 2.5; S.heat = 100; AU.sfx('overheat'); }
  S.gunSide = -S.gunSide;
  const fwd = new V3(0, 0, -1).applyQuaternion(S.q);
  const start = S.pos.clone().addScaledVector(new V3(S.gunSide * 1.8, S.obj.S.gearH + 0.8, -3).applyQuaternion(S.q), 1);
  // aim assist toward the target under the reticle
  let dir = fwd.clone();
  const tgt = shipAimTarget();
  if (tgt) { const lead = tgt.pos.clone().addScaledVector(tgt.vel || new V3(), start.distanceTo(tgt.pos) / 1000); const d2 = lead.sub(start).normalize(); if (d2.dot(fwd) > 0.985) dir = d2; }
  const m = new THREE.Mesh(_shotGeo, R.mat.bolt); m.frustumCulled = false;
  (frameGroup(S.frame) || R.scene).add(m);
  m.position.copy(start); m.lookAt(start.clone().add(dir));
  SHOTS.push({ f: S.frame, pos: start, vel: dir.multiplyScalar(1000).add(S.vel), life: 1.6, dmg: 10 * shipStats().dmg * techFx('gun'), owner: 'player', m });
  AU.sfx('cannon', 0.35);
}
function shipAimTarget() {
  if (SHIP.frame) return null;
  const fwd = new V3(0, 0, -1).applyQuaternion(SHIP.q);
  let best = null, bd = 0.97;
  for (const p of PIRATES.list) { if (!p.alive) continue; const d = p.pos.clone().sub(SHIP.pos); const l = d.length(); if (l > 2500) continue; const c = d.divideScalar(l).dot(fwd); if (c > bd) { bd = c; best = p; } }
  return best;
}
function updateShots(dt) {
  for (let i = SHOTS.length - 1; i >= 0; i--) {
    const s = SHOTS[i];
    s.life -= dt;
    const step = s.vel.length() * dt, d = _sd.copy(s.vel).normalize();
    let hitT = step, what = null;
    if (!s.f) {
      if (s.owner === 'player') {
        for (const p of PIRATES.list) { if (!p.alive) continue; _sp.copy(p.pos).sub(s.pos); const tc = _sp.dot(d); if (tc > 0 && tc < hitT && _sp.lengthSq() - tc * tc < 36) { hitT = tc; what = { k: 'pirate', o: p }; } }
        const a = asteroidRaycast(s.pos, d, hitT); if (a) { hitT = a.t; what = { k: 'ast', o: a }; }
      } else if (PLAYER.inShip && !SHIP.frame) {
        _sp.copy(SHIP.pos).sub(s.pos); const tc = _sp.dot(d); if (tc > 0 && tc < hitT && _sp.lengthSq() - tc * tc < 49) { hitT = tc; what = { k: 'ship' }; }
      }
    } else if (s.f.kind === 'planet') {
      const gr = groundHeightAt(s.f, _sp.copy(s.pos).addScaledVector(d, step)); if (_sp.length() < gr) { hitT = step; what = { k: 'ground' }; }
      if (s.owner === 'player') { const c = faunaRaycast(s.pos, d, hitT); if (c) { hitT = c.t; what = { k: 'fauna', o: c.c }; } const se = sentinelRaycast(s.f, s.pos, d, hitT); if (se) { hitT = se.t; what = { k: 'sentinel', o: se.s }; } }
      else if (PLAYER.inShip && SHIP.frame === s.f) { _sp.copy(SHIP.pos).sub(s.pos); const tc = _sp.dot(d); if (tc > 0 && tc < hitT && _sp.lengthSq() - tc * tc < 49) { hitT = tc; what = { k: 'ship' }; } }
    }
    s.pos.addScaledVector(d, Math.min(step, hitT));
    s.m.position.copy(s.pos);
    if (what) {
      const wp = toWorld(s.f, s.pos);
      if (what.k === 'pirate') damagePirate(what.o, s.dmg);
      else if (what.k === 'ast') damageAsteroid(what.o, s.dmg);
      else if (what.k === 'ship') damageShip(s.dmg, 'pirate');
      else if (what.k === 'fauna') damageCreature(what.o, s.dmg * 2);
      else if (what.k === 'sentinel') damageSentinel(what.o, s.dmg * 2);
      FX.sparks(wp, s.owner === 'player' ? 0xffd080 : 0xff5040, 4, 6);
      s.life = 0;
    }
    if (s.life <= 0) { s.m.parent && s.m.parent.remove(s.m); SHOTS.splice(i, 1); }
  }
}
function clearShots() { for (const s of SHOTS) s.m.parent && s.m.parent.remove(s.m); SHOTS.length = 0; }
function damageShip(amount, src) {
  const S = SHIP;
  if (!S.cur || G.god) return;
  S.hitT = 3;
  const s = Math.min(S.cur.shield, amount);
  S.cur.shield -= s; amount -= s;
  if (amount > 0) S.cur.hull = Math.max(0, S.cur.hull - amount * 0.6);
  CAM.shake = Math.max(CAM.shake, 0.3);
  HUD.hurt(s > 0 && amount <= 0 ? 'shield' : 'hp');
  AU.sfx(s > 0 && amount <= 0 ? 'shieldhit' : 'hullhit', 0.7);
  if (S.cur.hull <= 0) destroyShip();
}
function destroyShip() {
  const S = SHIP;
  FX.explosion(shipWorldPos(new V3()), 30);
  AU.sfx('explode');
  HUD.banner('Starship destroyed', 'warn');
  // lose some cargo
  for (const sl of S.cur.cargo.slots) if (sl) sl.n = Math.floor(sl.n * 0.6);
  S.cur.cargo.slots = S.cur.cargo.slots.map((sl) => (sl && sl.n > 0 ? sl : null));
  S.cur.hull = 100; S.cur.shield = shipMaxShield();
  PLAYER.alive = false;
  setTimeout(() => {
    PLAYER.alive = true; PLAYER.stats.hp = 100;
    PIRATES.clear();
    if (STATION.obj) { dockInstant(); }
    HUD.msg('Your ship was recovered and repaired at the station. Some cargo was lost.', 'bad');
  }, 3000);
}

// ---------- camera in the ship ----------
function updateShipCamera(dt) {
  const S = SHIP, f = S.frame;
  if (Act.hit('view') && !UI.blocking()) S.cockpit = !S.cockpit;
  if (!S.camInit) { S.camQ.copy(S.q); S.camInit = true; }
  S.camQ.slerp(S.q, Math.min(1, dt * (S.state === 'flight' ? 5 : 3)));
  let local, q;
  if (!S.dash) {
    const C = S.obj.S.colors, dk = C ? C.dark : 0x202428, hl = C ? C.hull2 : 0x606870;
    S.dash = meshOf(buildModel([P_.box(1.6, 0.35, 0.5, dk, [0, -0.62, -0.9], [-0.35, 0, 0]), glowPart(P_.box(0.5, 0.22, 0.03, 0x2a6a88, [-0.35, -0.5, -1.06], [-0.35, 0, 0]), 0.35), glowPart(P_.box(0.3, 0.22, 0.03, 0x886030, [0.4, -0.5, -1.06], [-0.35, 0, 0]), 0.35),
      P_.box(0.035, 1.6, 0.035, dk, [-1.05, 0.05, -1.0], [0.25, 0, -0.35]), P_.box(0.035, 1.6, 0.035, dk, [1.05, 0.05, -1.0], [0.25, 0, 0.35]), P_.box(2.1, 0.035, 0.035, dk, [0, 0.75, -0.8])]), R.mat.vc, false);
    S.dash.renderOrder = 10; R.camera.add(S.dash);
  }
  const ck = S.cockpit && PLAYER.inShip;
  S.dash.visible = ck; S.obj.body.visible = !ck;
  if (S.cockpit) {
    local = S.pos.clone().add(S.obj.S.cockpit.clone().add(new V3(0, 0.25, 0)).applyQuaternion(S.q));
    q = S.q.clone();
  } else {
    const back = S.state === 'landed' ? new V3(0, 7, 20) : new V3(0, 5.5 + S.obj.S.len * 0.1, 15 + S.obj.S.len + S.pulseK * 6 + S.boostK * 4);
    local = S.pos.clone().add(back.applyQuaternion(S.camQ));
    const look = S.pos.clone().add(new V3(0, 3, -30).applyQuaternion(S.camQ));
    _m4.lookAt(local, look, new V3(0, 1, 0).applyQuaternion(S.camQ));
    q = new Q4().setFromRotationMatrix(_m4);
    if (f && f.kind === 'planet') { const gr = groundHeightAt(f, local); const r = local.length(); if (r < gr + 1.5) local.multiplyScalar((gr + 1.5) / r); }
  }
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - dt); local.addScaledVector(new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5), CAM.shake * 1.2); }
  CAM.pos.copy(local); CAM.q.copy(q);
  toWorld(f, local, R.camera.position);
  quatToWorld(f, q, R.camera.quaternion);
  const fov = SETTINGS.fov + S.pulseK * 22 + S.boostK * 8 + Math.min(10, S.speed / 60);
  if (Math.abs(R.camera.fov - fov) > 0.1) { R.camera.fov = lerp(R.camera.fov, fov, Math.min(1, dt * 4)); R.camera.updateProjectionMatrix(); }
}
// the landed ship blocks the walking player
function shipCollidePlayer() {
  const P = PLAYER, S = SHIP;
  if (S.state !== 'landed') return;
  const l = P.pos.clone().sub(S.pos).applyQuaternion(S.q.clone().invert());
  const hx = 3.2, hz = S.obj.S.len / 2, y0 = S.obj.S.gearH, y1 = y0 + 3.2;
  if (l.y > y1 + 0.2 || l.y + 1.8 < y0) return;
  const cx = clamp(l.x, -hx, hx), cz = clamp(l.z, -hz, hz);
  const dx = l.x - cx, dz = l.z - cz, d = Math.hypot(dx, dz);
  if (d < 0.5) {
    if (d < 1e-4) { l.x = Math.sign(l.x || 1) * (hx + 0.5); } else { l.x = cx + dx / d * 0.5; l.z = cz + dz / d * 0.5; }
    P.pos.copy(l.applyQuaternion(S.q).add(S.pos));
  }
}
