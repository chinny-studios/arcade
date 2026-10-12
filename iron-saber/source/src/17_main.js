// Iron Saber — game flow, cameras (first person, cockpit, third person), player input, aiming and lock-on,
// world setup and the main loop.

let state = 'title', clock = 0, last = performance.now(), locked = false, fpsAcc = 0, fpsN = 0;
let camMode = 'fp';
const CAM = { yaw: Math.PI, pitch: 0.05, kick: 0, tpDist: 1, tpFresh: true };
const AIM = { point: new V3(), dist: 0 };
let PLAYER_LOCK = null, INCOMING = 0, lockLosT = 0;
function setState(s) { state = s; document.body.dataset.state = s; }
function playerPos(out) { return out.copy(PILOT.state === 'suit' && PILOT.inSuit ? PILOT.inSuit.pos : PILOT.pos); }

// ---------- world setup ----------
function buildWorld() {
  buildTerrain();
  plantTrees();
  genCity();
  finishTrees();
  placeRocks();
  initPools();
  buildTraffic();
  buildMapImage();
  // the four boardable suits, kneeling at their posts
  const at = (type, x, z, yaw) => { const s = createSuit(type, x, z, yaw, { parked: true }); HOME_SUITS[type] = s; return s; };
  at('valiant', BAYS[1].x, BAYS[1].z, 0);
  at('swift', -210, 70, Math.PI / 2);
  at('bastion', SITES.depot.x + 10, SITES.depot.z + 20, -Math.PI / 2);
  at('ogre', SITES.yard.x - 10, SITES.yard.z + 20, Math.PI / 2);
  spawnPilot(BAYS[1].x + 4, BAYS[1].z + 30, Math.PI);
  buildRoster();
  resize();
}

// ---------- start ----------
function startGame() {
  audioInit();
  $('#title').hidden = true;
  setState('play');
  CAM.yaw = Math.PI; CAM.pitch = 0.18;
  camMode = 'fp';
  say('COALITION BASE · NEW HAVEN FRONT', 3);
  hint('Walk up to the GX-01 Valiant and press E to board it.', 7);
  if (!DEBUG) canvas.requestPointerLock();
}
function pause() { if (state === 'play') { setState('paused'); $('#pause').hidden = false; } }
function resume() { if (state !== 'paused') return; $('#pause').hidden = true; setState('play'); if (!DEBUG) canvas.requestPointerLock(); }

// ---------- input ----------
function readInput() {
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1;
  if (keys.KeyA || keys.ArrowLeft) s -= 1;
  return { f, s, run: !!(keys.ShiftLeft || keys.ShiftRight), jump: !!keys.Space, jumpP: pressed.has('Space') };
}
addEventListener('keydown', (e) => {
  if (e.repeat) { if (e.code === 'Space' || e.code === 'Tab') e.preventDefault(); return; }
  keys[e.code] = true; pressed.add(e.code);
  if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
  if (e.code === 'KeyN') setMuted(!muted);
  if (state === 'title' && e.code === 'Enter' && !$('#start').disabled) { startGame(); return; }
  if (state !== 'play') return;
  if (e.code === 'KeyV') { camMode = camMode === 'fp' ? 'tp' : 'fp'; CAM.tpFresh = true; uiClick(); }
  else if (e.code === 'KeyM') { HUD.mapOn = !HUD.mapOn; uiClick(); }
  else if (e.code === 'KeyE') interact();
  else if (e.code === 'KeyC' && PILOT.state === 'foot') callSuit();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; });
addEventListener('mousemove', (e) => {
  if (locked) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
  else if (state === 'play' && DEBUG && (e.buttons & 1)) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('contextmenu', (e) => { if (state === 'play') e.preventDefault(); });
canvas.addEventListener('mousedown', (e) => {
  if (state !== 'play') return;
  if (!locked && !DEBUG) { canvas.requestPointerLock(); return; }
  if (e.button === 0) mouse.l = true;
  if (e.button === 2) mouse.r = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
$('#pause').addEventListener('mousedown', resume);
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && state === 'play' && !DEBUG) { mouse.l = mouse.r = false; pause(); }
});
$('#start').addEventListener('click', startGame);

function interact() {
  const P = PILOT;
  if (P.state === 'suit') { exitSuit(); return; }
  if (P.state !== 'foot') return;
  const s = boardableSuit();
  if (s) startBoarding(s);
}

// ---------- player control ----------
function controlPlayer(dt, inp) {
  const P = PILOT;
  if (P.state === 'suit') {
    const s = P.inSuit, c = s.ctl;
    s.aimYaw = CAM.yaw; s.aimPitch = CAM.pitch;
    c.aim.copy(AIM.point); c.lock = PLAYER_LOCK;
    const live = s.mode === 'active' && BOOT.t > 1.6;
    const fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw);
    c.mx = live ? fx * inp.f - fz * inp.s : 0; c.mz = live ? fz * inp.f + fx * inp.s : 0;
    c.boost = live && inp.run; c.jump = live && inp.jump; c.jumpP = live && inp.jumpP;
    c.fire = live && mouse.l; c.block = live && mouse.r; c.vulcan = live && !!keys.KeyQ;
    c.missileP = live && pressed.has('KeyR'); c.slashP = live && pressed.has('KeyF');
    setPrompt('');
  } else {
    updatePilot(dt, inp);
    if (P.state === 'foot') {
      const s = boardableSuit();
      setPrompt(s ? '[E] BOARD ' + s.T.name : '');
    } else setPrompt('');
  }
}
// Aim ray from the camera; lock-on picks the hostile nearest the reticle.
function updateAim(dt) {
  const s = PILOT.state === 'suit' ? PILOT.inSuit : null;
  _v1.set(Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
  _v2.copy(camera.position);
  if (s && camMode === 'tp') _v2.addScaledVector(_v1, camera.position.distanceTo(s.spheres[0].p));
  _v3.copy(_v2).addScaledVector(_v1, 3000);
  const h = traceSegment(_v2, _v3, s, undefined, 0.5);
  if (h) { AIM.point.copy(h.pos); AIM.dist = h.pos.distanceTo(s ? s.spheres[0].p : camera.position); }
  else { AIM.point.copy(_v3); AIM.dist = 1e9; }
  if (!s) { PLAYER_LOCK = null; INCOMING = 0; return; }
  // lock-on
  lockLosT -= dt;
  let best = null, ba = PLAYER_LOCK && !PLAYER_LOCK.dead && !PLAYER_LOCK.gone ? 0.25 : 0.16;
  for (const o of SUITS) {
    if (o.team !== 1 || o.dead || o.gone) continue;
    _v4.copy(o.spheres[0].p).sub(camera.position);
    const d = _v4.length();
    if (d > 1600) continue;
    const a = _v4.normalize().angleTo(_v1) * (o === PLAYER_LOCK ? 0.6 : 1);
    if (a < ba) { ba = a; best = o; }
  }
  if (best !== PLAYER_LOCK) { PLAYER_LOCK = best; if (best) { lockSound(); HUD.lockT = 0.3; } }
  INCOMING = 0;
  for (const p of PROJ) if (p.kind === 'missile' && p.target === s) INCOMING++;
}

// ---------- cameras ----------
const _cam = new V3(), _tgt = new V3();
function camKick(a) { CAM.kick = Math.min(1, CAM.kick + a); }
function updateCamera(dt) {
  const sens = 0.0022;
  if (!HUD.mapOn) { CAM.yaw -= mouse.dx * sens; CAM.pitch -= mouse.dy * sens; }
  mouse.dx = mouse.dy = 0;
  const P = PILOT, s = P.state === 'suit' ? P.inSuit : null;
  CAM.pitch = clamp(CAM.pitch, -1.35, 1.35);
  CAM.kick = Math.max(0, CAM.kick - dt * 4);
  shake = Math.max(0, shake - dt * 2.2);
  let near = 0.1;
  if (s) {
    if (camMode === 'fp') {
      cockpitWorld(s, _cam);
      camera.position.copy(_cam);
      near = 0.5;
    } else {
      _tgt.copy(s.pos); _tgt.y += s.H * 0.82;
      _v1.set(-Math.cos(CAM.yaw), 0, Math.sin(CAM.yaw)).multiplyScalar(5 * s.sc);
      _tgt.add(_v1);
      const dist = 34 * s.sc;
      _v2.set(-Math.sin(CAM.yaw) * Math.cos(CAM.pitch), -Math.sin(CAM.pitch), -Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
      placeOrbit(_tgt, _v2, dist, dt);
      near = 1;
    }
  } else {
    if (camMode === 'fp' || P.state === 'dead') {
      camera.position.copy(P.pos); camera.position.y += 1.62;
      if (P.onGround && P.state === 'foot') camera.position.y += Math.sin(P.walkPh * 2) * 0.03 * clamp(Math.hypot(P.vel.x, P.vel.z) / 5, 0, 1);
    } else {
      _tgt.copy(P.pos); _tgt.y += 1.55;
      _v1.set(-Math.cos(CAM.yaw), 0, Math.sin(CAM.yaw)).multiplyScalar(0.55);
      _tgt.add(_v1);
      _v2.set(-Math.sin(CAM.yaw) * Math.cos(CAM.pitch), -Math.sin(CAM.pitch), -Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
      placeOrbit(_tgt, _v2, P.chute ? 12 : 3.8, dt);
      near = 0.1;
    }
  }
  if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
  camera.rotation.set(CAM.pitch + CAM.kick * 0.02, CAM.yaw + Math.PI, 0);
  if (shake > 0) {
    camera.position.x += frand(-1, 1) * shake * (s && camMode === 'fp' ? 0.25 : 0.4);
    camera.position.y += frand(-1, 1) * shake * (s && camMode === 'fp' ? 0.25 : 0.4);
  }
  // never dip under the ground
  const gy = groundY(camera.position.x, camera.position.z) + 0.3;
  if (camera.position.y < gy) camera.position.y = gy;
  camera.updateMatrixWorld();
}
// Third-person boom that pulls in when a building or the ground gets in the way.
function placeOrbit(tgt, back, dist, dt) {
  let d = dist;
  const n = 16;
  for (let i = 1; i <= n; i++) {
    const t = dist * i / n;
    const x = tgt.x + back.x * t, y = tgt.y + back.y * t, z = tgt.z + back.z * t;
    if (y < terrainH(x, z) + 0.5 || staticAt(x, y, z) >= 0) { d = Math.max(1.5, t - dist / n); break; }
  }
  if (CAM.tpFresh) { CAM.tpDist = d; CAM.tpFresh = false; }
  CAM.tpDist = d < CAM.tpDist ? d : lerp(CAM.tpDist, d, 1 - Math.exp(-dt * 4));
  camera.position.copy(tgt).addScaledVector(back, CAM.tpDist);
}
let titleT = 0;
function titleCamera(dt) {
  titleT += dt;
  const v = HOME_SUITS.valiant;
  const a = Math.sin(titleT * 0.08) * 0.9 + 0.3;
  _tgt.copy(v ? v.pos : BASE).add(_v1.set(0, 9, 0));
  camera.position.set(_tgt.x + Math.sin(a) * 46, _tgt.y + 4 + Math.sin(titleT * 0.2) * 2, _tgt.z + Math.cos(a) * 46);
  camera.lookAt(_tgt);
  CAM.yaw = Math.atan2(_tgt.x - camera.position.x, _tgt.z - camera.position.z);
  camera.updateMatrixWorld();
}

// ---------- loop ----------
let crumbleT = 0;
const PT = { suits: 0, phys: 0, world: 0, render: 0 };
function tick(dt) {
  clock += dt;
  impactBudget = Math.min(10, impactBudget + dt * 30);
  vulcT -= dt; alarmT -= dt;
  if (state === 'title') { titleCamera(dt); updateTraffic(dt); updateSuitsAll(dt); return; }
  BOOT.t += dt;
  const inp = readInput();
  updateCamera(dt);
  controlPlayer(dt, inp);
  let t0 = DEBUG ? performance.now() : 0;
  updateSuitsAll(dt);
  if (DEBUG) { PT.suits += performance.now() - t0; t0 = performance.now(); }
  updateCamera(0);
  updateAim(dt);
  updateProjectiles(dt);
  const sub = dt > 1 / 45 ? 2 : 1;
  for (let i = 0; i < sub; i++) stepBodies(dt / sub);
  if (DEBUG) { PT.phys += performance.now() - t0; t0 = performance.now(); }
  processDirty();
  updateBuildingFires(dt);
  updateTrees(dt);
  updateTraffic(dt);
  updateEmitters(dt);
  updatePS(smokePS, dt); updatePS(glowPS, dt);
  updateRings(dt);
  renderBodies();
  updateZones(dt);
  updateMissions(dt);
  updateRespawns(dt);
  updateCable();
  updateUI(dt);
  setKeysHelp();
  if (DEBUG) PT.world += performance.now() - t0;
  crumbleT -= dt;
  if (frameCrumble > 0 && crumbleT <= 0) { crumbleSound(frameCrumble, AIM.point); frameCrumble = 0; crumbleT = 0.12; }
  skyMat.uniforms.uTime.value = clock;
  const pp = playerPos(_v6);
  updateAtmosphere(pp.x, pp.z, dt);
  const inSuit = PILOT.state === 'suit';
  setShadowRange(inSuit ? 240 : 90);
  placeSun(pp.x, pp.y, pp.z);
  audioBeds(dt);
  pressed.clear();
}
function updateSuitsAll(dt) {
  for (let i = SUITS.length - 1; i >= 0; i--) {
    const s = SUITS[i];
    if (s.gone) { if (s.team === 1) removeSuit(s); continue; }
    if (s.ai && !s.dead) aiUpdate(s, dt);
    else if (s.auto && !s.dead) autoUpdate(s, dt);
    updateSuit(s, dt);
  }
}
function audioBeds(dt) {
  if (!AC) return;
  const s = PILOT.state === 'suit' ? PILOT.inSuit : null;
  const W = biomeW(camera.position.x, camera.position.z, BW_TMP);
  aSet(loops.wind.g.gain, 0.03 + (W.mtn + W.desert) * 0.05 * (1 - W.city) + (s ? 0 : 0.02), 0.6);
  aSet(loops.boost.g.gain, s && s.thrusting ? 0.22 : 0, 0.08);
  aSet(loops.boost.flt.frequency, s && s.dashing ? 900 : 600, 0.1);
  aSet(loops.hover.g.gain, s && s.flying ? 0.3 : 0, 0.1);
  aSet(loops.saber.g.gain, s && s.rig.blade.visible ? 0.12 : 0, 0.05);
  aSet(loops.cockpit.g.gain, s ? 0.08 : 0, 0.4);
  aSet(loops.servo.g.gain, s ? clamp(Math.hypot(s.vel.x, s.vel.z) / 40, 0, 0.05) : 0, 0.15);
  aSet(loops.servo.o.frequency, s ? 90 + Math.hypot(s.vel.x, s.vel.z) * 2 : 90, 0.2);
  aSet(loops.reactor.g.gain, s ? 0.05 : 0, 0.5);
  let combat = 0;
  const me = playerPos(_v5);
  for (const o of SUITS) if (o.team === 1 && !o.dead && !o.gone && o.ai && o.ai.target && o.pos.distanceTo(me) < 900) { combat = 1; if (o.T.id === 'ace') combat = 2; }
  updateMusic(combat);
}
function render() {
  sky.position.copy(camera.position);
  cullTrees();
  const s = PILOT.state === 'suit' ? PILOT.inSuit : null;
  updateCockpit(s, 1 / 60);
  renderer.clear();
  renderer.render(scene, camera);
  if (cockpitOn) { renderer.clearDepth(); renderer.render(cockScene, cockCam); }
}
// If the machine can't keep up, step quality down once: lower resolution, smaller shadow map, no tree shadows.
const QUAL = { t: 0, slow: 0, low: false };
function autoQuality(fps) {
  if (QUAL.low || state !== 'play' || DEBUG) return;
  QUAL.t += 0.5;
  if (QUAL.t < 6) return;
  QUAL.slow = fps < 36 ? QUAL.slow + 1 : 0;
  if (QUAL.slow < 6) return;
  QUAL.low = true;
  renderer.setPixelRatio(1);
  sun.shadow.mapSize.set(1024, 1024);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  for (const m of TREE_MESHES) m.castShadow = false;
  resize();
}
function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000;
  const dt = Math.min(0.05, rawDt);
  last = now;
  fpsAcc += rawDt; fpsN++;
  if (fpsAcc > 0.5) {
    autoQuality(fpsN / fpsAcc);
    if (DEBUG) { const el = $('#fps'); el.hidden = false; el.textContent = Math.round(fpsN / fpsAcc) + ' fps · ' + bodies.length + ' bodies · ' + SUITS.length + ' suits · ' + renderer.info.render.calls + ' calls · ' + Math.round(renderer.info.render.triangles / 1000) + 'k tris'; }
    fpsAcc = 0; fpsN = 0;
  }
  if (!WORLD_READY || MANUAL) return;
  if (state !== 'paused') tick(dt);
  render();
  drawHud(state === 'paused' ? 0 : dt);
}

// ---------- boot ----------
let WORLD_READY = false, MANUAL = false;
if (!renderer.getContext()) { $('#nogl').hidden = false; }
setState('title');
addEventListener('resize', resize);
resizeHud(innerWidth, innerHeight);
requestAnimationFrame(() => setTimeout(() => {
  const t0 = performance.now();
  buildWorld();
  WORLD_READY = true;
  $('#loading').textContent = DEBUG ? 'WORLD BUILT IN ' + Math.round(performance.now() - t0) + ' ms' : '';
  $('#start').disabled = false;
  requestAnimationFrame(frame);
}, 30));

// Test hook: open the page with #debug to drive the game from the console.
if (DEBUG) window.IS = {
  PILOT, SUITS, HOME_SUITS, CAM, AIM, MISSIONS, BLD, BLK_, PROJ, STATS, camera, scene, renderer, keys, mouse, pressed, startGame, interact, spawnEnemy, startMission,
  terrainH, staticAt, enterSuit, exitSuit, callSuit, damageSuit, PT, ZONES, get state() { return state; }, set camMode(m) { camMode = m; CAM.tpFresh = true; }, get camMode() { return camMode; },
  setZones(on) { ZONES_ON = on; }, manual(on) { MANUAL = on; }, createSuit, BAYS, audioOff() { AC = null; }, tick, render, drawHud,
  sim(sec, dt = 1 / 30) { const t0 = performance.now(); for (let t = 0; t < sec; t += dt) { tick(dt); } return performance.now() - t0; },
  enter(type = 'valiant') { const s = HOME_SUITS[type]; enterSuit(s); s.mode = 'active'; s.kneel = 0; s.hatch = 0; BOOT.t = 99; },
  board(type = 'valiant') { const s = HOME_SUITS[type]; if (!s) return; cableFoot(s, PILOT.pos); startBoarding(s); },
  tp(x, z) { const p = PILOT.state === 'suit' ? PILOT.inSuit.pos : PILOT.pos; p.set(x, groundY(x, z) + 2, z); },
  look(yaw, pitch) { CAM.yaw = yaw; CAM.pitch = pitch; },
  lookAt(x, y, z) { const p = camera.position; CAM.yaw = Math.atan2(x - p.x, z - p.z); CAM.pitch = Math.atan2(y - p.y, Math.hypot(x - p.x, z - p.z)); },
  counts() { return { trees: TREES.length, blocks: BLK_.length, cars: CARS.length, lamps: LAMPS.length, rocks: ROCKS.length, bld: BLD.length }; },
};
