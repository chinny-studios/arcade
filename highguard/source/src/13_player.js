// ---- 13_player: the player's helm, gunnery, targeting, shields, squadron orders, and the camera ----
// The camera orbits the ship on its own yaw and pitch (the mouse), independent of the hull, as in naval
// games. The centre of the screen is the sight: batteries that bear on the point under it fire there.
const THROTTLE = [-0.25, 0, 0.25, 0.5, 0.75, 1];
const THROTTLE_NAMES = ['Astern', 'All stop', 'One quarter', 'Half ahead', 'Three quarters', 'Full ahead'];
const SQUAD_KEYS = ['KeyZ', 'KeyX', 'KeyC'];
const PC = {
  yaw: 0, pitch: -0.12, dist: 1, zoom: 0, thrIdx: 1, target: null, sub: null,
  camPos: new V3(), camDir: new V3(0, 0, 1), aim: new V3(), range: 0, aimShip: null, lead: null, leadV: new V3(), bears: {}, deadT: 0, recallFired: {},
};
const _pv = new V3(), _pw = new V3(), _px = new V3();
PC.reset = function () {
  const p = G.player;
  PC.target = null; PC.sub = null; PC.zoom = 0; PC.dist = 1; PC.deadT = 0; PC.recallFired = {};
  if (p) { PC.yaw = p.yaw; PC.pitch = -0.12; PC.thrIdx = THROTTLE.indexOf(THROTTLE.reduce((a, b) => Math.abs(b - p.thr) < Math.abs(a - p.thr) ? b : a)); p.thr = THROTTLE[PC.thrIdx]; }
};
PC.update = function (dt) {
  const p = G.player;
  if (!p) return;
  // Look.
  const fovK = R.camera.fov / 55, sens = 0.0022 * settings.sens * fovK;
  PC.yaw = angNorm(PC.yaw - Input.mdx * sens);
  PC.pitch = clamp(PC.pitch - Input.mdy * sens * (settings.invert ? -1 : 1), -1.4, 1.4);
  if (Input.wheel) PC.dist = clamp(PC.dist * Math.pow(1.12, Input.wheel), 0.65, 3.2);
  PC.zoom = approach(PC.zoom, Input.down('M2') && p.alive ? 1 : 0, dt * 5);
  if (!p.alive) { PC.deadT += dt; return; }
  // Helm.
  if (Input.hit('KeyW')) { PC.thrIdx = Math.min(THROTTLE.length - 1, PC.thrIdx + 1); Sfx.ui(); }
  if (Input.hit('KeyS')) { PC.thrIdx = Math.max(0, PC.thrIdx - 1); Sfx.ui(); }
  p.thr = THROTTLE[PC.thrIdx];
  p.yawCmd = (Input.down('KeyA') || Input.down('ArrowLeft') ? 1 : 0) - (Input.down('KeyD') || Input.down('ArrowRight') ? 1 : 0);
  p.pitchCmd = (Input.down('KeyR') || Input.down('ArrowUp') ? 1 : 0) - (Input.down('KeyF') || Input.down('ArrowDown') ? 1 : 0);
  // Outside the battle area for too long: the helm turns you back.
  if (Mission.outT > 6) { _pv.copy(p.pos).negate().normalize(); p.yawCmd = clamp(angNorm(yawOf(_pv) - p.yaw) * 2, -1, 1); p.pitchCmd = clamp((pitchOf(_pv) - p.pitch) * 2, -1, 1); }
  // Shields.
  ['Digit1', 'Digit2', 'Digit3', 'Digit4'].forEach((k, i) => { if (Input.hit(k)) { const f = p.setReinforce(FACINGS[i]); Sfx.ui(); Hud.ribbon(f ? FACING_NAMES[f] + ' shields reinforced' : 'Shields balanced', 'info'); p.shieldMesh.material.uniforms.glow.value = 0.6; } });
  PC.targeting();
  PC.gunnery(dt);
  PC.squads();
};
PC.targetable = (s) => s && s.alive && s.arrived && s.jumpAnim == null && s !== G.player;
PC.setTarget = function (s) {
  if (s === PC.target) return;
  PC.target = s; PC.sub = null; if (s) Sfx.lock();
};
PC.targeting = function () {
  const p = G.player, online = p.ok('bridge');
  if (PC.target && !PC.targetable(PC.target)) PC.setTarget(null);
  if (Input.hit('KeyT') || Input.hit('Tab')) {
    if (!online) { Hud.warn('Targeting computer offline: the bridge is knocked out'); Sfx.deny(); return; }
  }
  if (Input.hit('KeyT')) {
    // The ship whose centre is nearest the sight (allies too, for escort orders).
    let best = null, ba = 0.2;
    for (const s of G.ships) {
      if (!PC.targetable(s)) continue;
      s.centre(_pv).sub(PC.camPos); const d = _pv.length();
      const a = PC.camDir.angleTo(_pv) - Math.atan(s.radius * 0.5 / d);
      if (a < ba) { ba = a; best = s; }
    }
    if (PC.aimShip && PC.targetable(PC.aimShip)) best = PC.aimShip;
    if (best) PC.setTarget(best); else Sfx.deny();
  }
  if (Input.hit('Tab')) {
    const foes = G.ships.filter((s) => PC.targetable(s) && s.team !== p.team).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos));
    if (foes.length) { const i = foes.indexOf(PC.target); PC.setTarget(foes[(i + 1) % foes.length]); }
  }
  if (PC.target && (Input.hit('KeyQ') || Input.hit('KeyE'))) {
    const list = [null].concat(SUB_ORDER.filter((k) => PC.target.subs[k]));
    let i = list.indexOf(PC.sub); i = (i + (Input.hit('KeyE') ? 1 : list.length - 1)) % list.length;
    PC.sub = list[i]; Sfx.ui();
  }
  // Lead marker for the locked target (needs the bridge).
  PC.lead = null;
  if (PC.target && online) {
    const t = PC.target, lp = PC.sub ? t.subs[PC.sub].p : t.model.centre;
    t.toWorld(lp, _pw); leadPoint(p.pos, _pw, t.vel, BOLT_SPEED, PC.leadV); PC.lead = PC.leadV;
  }
};
PC.gunnery = function () {
  const p = G.player;
  // What is under the sight?
  let best = -1; PC.aimShip = null;
  for (const s of G.ships) {
    if (s === p || !s.alive || !s.arrived) continue;
    const t = s.raycast(PC.camPos, PC.camDir, 9000, null);
    if (t >= 0 && (best < 0 || t < best)) { best = t; PC.aimShip = s; }
  }
  let range;
  if (best >= 0) range = best;
  else if (PC.target) range = PC.target.pos.distanceTo(PC.camPos);
  else range = 2600 + p.pos.distanceTo(PC.camPos);
  PC.aim.copy(PC.camPos).addScaledVector(PC.camDir, range);
  PC.range = PC.aim.distanceTo(p.pos);
  for (const side of ['port', 'stbd', 'bow']) PC.bears[side] = !!p.bat[side] && p.bears(side, PC.aim);
  if (Input.down('M0')) {
    let any = false;
    for (const side in p.bat) if (PC.bears[side] && p.bat[side].t <= 0) { p.fireBattery(side, PC.aim, 0.0011); any = true; }
    if (Input.hit('M0') && !any && !Object.values(PC.bears).some(Boolean)) Hud.warn(PC.range > BOLT_RANGE ? 'Out of range' : 'No battery bears: turn side-on to the target');
  }
  if (Input.hit('Space')) {
    if (!p.torpMax) { /* no tubes on this ship */ }
    else if (!PC.target || PC.target.team === p.team) { Hud.warn('Torpedoes need an enemy target'); Sfx.deny(); }
    else if (p.torpCd > 0) { Hud.warn('Tubes reloading · ' + Math.ceil(p.torpCd) + ' s'); Sfx.deny(); }
    else if (!p.fireTorps(PC.target)) { Hud.warn(PC.target.pos.distanceTo(p.pos) > 3600 ? 'Target out of torpedo range' : 'Target must be ahead to fire torpedoes'); Sfx.deny(); }
    else Hud.ribbon('Torpedoes away', 'info');
  }
};
PC.order = function (q, kind) {
  const t = PC.target, p = G.player;
  if (kind === 'recall') { q.command('recall'); Hud.ribbon(q.name + ' squadron · return to the hangar', 'info'); return; }
  if (!p.ok('hangar') && !q.out.length) { Hud.warn('Hangar knocked out: no launches'); Sfx.deny(); return; }
  if (!q.total) { Hud.warn(q.name + ' squadron is rebuilding'); Sfx.deny(); return; }
  if (kind === 'auto') kind = t && t.team !== p.team ? 'attack' : 'escort';
  if (kind === 'attack') { q.command('attack', t, PC.sub); Hud.ribbon(q.name + ' · attack ' + t.name + (PC.sub ? ' (' + SUBSYS[PC.sub].name.toLowerCase() + ')' : ''), 'info'); }
  else { const e = t && t.team === p.team && !Input.shift() ? t : p; q.command('escort', e); Hud.ribbon(q.name + ' · escort ' + (e === p ? 'us' : e.name), 'info'); }
  Sfx.ui();
};
PC.squads = function () {
  const p = G.player;
  SQUAD_KEYS.forEach((k, i) => {
    const q = p.squads[i]; if (!q) return;
    if (Input.down(k) && Input.heldFor(k) > 0.45 && !PC.recallFired[k]) { PC.recallFired[k] = true; PC.order(q, 'recall'); }
    if (Input.up(k)) { if (!PC.recallFired[k]) PC.order(q, Input.shift() ? 'escort' : 'auto'); PC.recallFired[k] = false; }
  });
  if (Input.hit('KeyV')) {
    if (!PC.target || PC.target.team === p.team) { Hud.warn('Target an enemy ship first'); Sfx.deny(); }
    else for (const q of p.squads) if (q.total) PC.order(q, 'attack');
  }
};
// Camera: a chase view orbiting the ship. When the ship is lost it drifts back and watches the wreck.
PC.camera = function (dt) {
  const p = G.player, c = R.camera;
  R.setFov(lerp(55, 20, PC.zoom * PC.zoom * (3 - 2 * PC.zoom)));
  if (G.camOverride) { c.position.copy(G.camOverride[0]); c.up.set(0, 1, 0); c.lookAt(G.camOverride[1]); PC.camPos.copy(c.position); c.getWorldDirection(PC.camDir); return; }
  if (!p) return;
  dirFrom(PC.yaw, PC.pitch, PC.camDir);
  const L = p.len, d = (L * 1.15 + 80) * PC.dist * (p.alive ? 1 : 1.6 + Math.min(PC.deadT * 0.05, 1));
  if (!p.alive) PC.yaw += dt * 0.05;
  _pv.copy(p.alive ? p.pos : p.centre(_px)).addScaledVector(UP, L * 0.2);
  PC.camPos.copy(_pv).addScaledVector(PC.camDir, -d);
  if (R.shake > 0 && settings.shake) { const k = R.shake * L * 0.012; PC.camPos.x += rnd(-k, k); PC.camPos.y += rnd(-k, k); PC.camPos.z += rnd(-k, k); }
  R.shake = Math.max(0, R.shake - dt * 1.6);
  c.position.copy(PC.camPos); c.up.set(0, 1, 0);
  c.lookAt(_pw.copy(PC.camPos).add(PC.camDir));
  Sfx.listen(PC.camPos);
};
// Title-screen camera: slow orbits around a random ship in the demo battle.
const Cine = { t: 0, ship: null, a: 0 };
Cine.update = function (dt) {
  Cine.t -= dt;
  if (!Cine.ship || !Cine.ship.alive || Cine.t <= 0) {
    const live = G.ships.filter((s) => s.alive && s.arrived && s.jumpAnim == null && s.len > 250);
    if (live.length) { Cine.ship = pick(live); Cine.t = 14; Cine.a = rnd(0, TAU); Cine.e = rnd(-0.25, 0.1); }
  }
  const s = Cine.ship; if (!s) return;
  Cine.a += dt * 0.04;
  const d = s.len * 1.5 + 200;
  dirFrom(Cine.a, Cine.e, _pv);
  R.camera.position.copy(s.pos).addScaledVector(_pv, -d).addScaledVector(UP, s.len * 0.15);
  R.camera.up.set(0, 1, 0); R.camera.lookAt(s.pos); R.setFov(50);
};
