// 30_main: boot, the frame loop, and the #debug hook (window.NR).
const GAME = { state: 'title', started: false, t: 0, frame: 0, fps: 0, ready: false };
const START = { x: -6.5, z: 2, yaw: 1.62 };    // on the pavement outside Milton Mansion, facing north up Nathan Road... set in boot

async function boot() {
  if (DEBUG) document.body.classList.add('debug');
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
  const status = (s) => { const el = $('#loading'); if (el) el.textContent = s; };
  status('Loading the city…');
  await new Promise((r) => setTimeout(r, 30));
  await loadSignFont();
  buildAtlas();
  buildSigns();
  initRenderer($('#c'));
  status('Building Tsim Sha Tsui…');
  await new Promise((r) => setTimeout(r, 20));
  buildCity();
  buildLandmarks();
  buildSky();
  initGame();
  finishSigns();
  lmDone();
  SIGNS.tex.needsUpdate = true;
  setStartPos();
  updateSky(0);
  GAME.ready = true;
  status('');
  bus.emit('ready');
  if (DEBUG) installDebug();
  requestAnimationFrame(loop);
}
function setStartPos() {
  // on the pavement outside Milton Mansion's door, looking south down Nathan Road towards the harbour
  const d = W.LP && W.LP.miltonDoor;
  let x = -16.5, z = 6;
  if (d) { x = d[0] - 1.2; z = d[1] + 4; }
  for (let k = 0; k < 40 && !STREET.allowed(x, z); k++) x -= 0.5;
  placePlayer(x, z, Math.PI);
}

let lastT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
  lastT = now;
  GAME.fps = lerp(GAME.fps, 1 / Math.max(dt, 1e-3), 0.05);
  Input.poll();
  step(dt, true);
  renderNow();
  Input.endFrame();
}
function step(dt, live) {
  UNI.uTime.value += dt;
  GAME.t += dt;
  if (GAME.state === 'play') {
    if (!panelOpen) updateGameInput(dt);
    if (!document.body.classList.contains('modal')) updatePlayer(dt);
  }
  updateSky(GAME.state === 'title' ? 0 : dt);
  if (typeof updateWorldLife === 'function') updateWorldLife(dt);
  if (typeof updateGame === 'function') updateGame(dt);
  if (typeof updateAudio === 'function') updateAudio(dt);
}
function renderNow() {
  if (GAME.state === 'title' && !GAME.started) titleCam();
  else updateCamera();
  if (typeof updateHUD === 'function' && GAME.state === 'play') updateHUD();
  if (PL.space && PL.space.light && GAME.state === 'play') PL.space.light();
  renderFrame(PL.space && PL.space.scene ? PL.space.scene() : scene);
  if (DEBUG && GAME.frame++ % 15 === 0) { const el = $('#fps'); if (el) el.textContent = GAME.fps.toFixed(0) + ' fps ' + renderer.info.render.calls + ' calls ' + (renderer.info.render.triangles / 1000 | 0) + 'k tris'; }
}
// slow drift over the harbour behind the title
function titleCam() {
  const t = GAME.t * 0.02;
  camera.position.set(-260 + Math.sin(t) * 60, 30, 760 + Math.cos(t) * 20);
  camera.rotation.order = 'YXZ'; camera.rotation.set(-0.05, 0.25 + Math.sin(t * 0.7) * 0.15, 0);
}

function installDebug() {
  const NR = window.NR = {
    W, MAP, PL, CLOCK, SKY, UNI, T, G,
    start(o = {}) { if (o.hour !== undefined) CLOCK.t = o.hour; if (typeof startGame === 'function') startGame(o); else { GAME.state = 'play'; GAME.started = true; document.body.dataset.state = 'play'; $('#title').hidden = true; } return NR.state(); },
    sim(s, dt = 1 / 30) { for (let t = 0; t < s; t += dt) step(dt, false); return NR.state(); },
    tp(x, z, yaw) { placePlayer(x, z, yaw === undefined ? PL.yaw : yaw, STREET); return NR.state(); },
    look(yaw, pitch = 0) { PL.yaw = yaw; PL.pitch = pitch; },
    lookAt(x, y, z) { const dx = x - PL.x, dy = y - (PL.y + PL.eye), dz = z - PL.z; PL.yaw = Math.atan2(-dx, -dz); PL.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
    cam(x, y, z, tx, ty, tz) { PL.free = true; PL.x = x; PL.y = y - PL.eye; PL.z = z; NR.lookAt(tx, ty, tz); },
    time(h) { CLOCK.t = h; updateSky(0); return clockStr(); },
    press(c) { Input.press(c); },
    hold(c, s) { Input.press(c); NR.sim(s); Input.release(c); return NR.state(); },
    render() { renderNow(); return true; },
    state() { return { x: +PL.x.toFixed(2), z: +PL.z.toFixed(2), y: +PL.y.toFixed(2), yaw: +PL.yaw.toFixed(2), space: PL.space && PL.space.name, time: clockStr(), state: GAME.state }; },
    stats() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, fps: GAME.fps | 0 }; },
    gclass, groundAt, ST, NPC, MILTON, FERRY, TRAFFIC, CROWD, LANDMARKS, INTERACT,
    talk(id) { talk(id); return DLG ? { who: $('#dWho').textContent, say: $('#dSay').textContent, opts: DLG.opts.map((o) => o[0]) } : null; },
    choose(i) { chooseOpt(i); return DLG ? { say: $('#dSay').textContent, opts: DLG.opts.map((o) => o[0]) } : null; },
    close() { closeDialog(); },
    focus() { IFOCUS = findInteract(); return IFOCUS ? IFOCUS.label() : null; },
    use() { IFOCUS = findInteract(); if (IFOCUS) { const l = IFOCUS.label(); IFOCUS.use(); return l; } return null; },
    go(id) { const L = LM_BY[id]; if (!L) return 'no ' + id; const [x, z] = findClass(L.x, L.z, G.PAVE, 60); placePlayer(x, z, PL.yaw, STREET); NR.lookAt(L.x, 8, L.z); return NR.state(); },
    toNPC(id, back = 2) { const n = NPC[id]; const fx = -Math.sin(n.yaw), fz = -Math.cos(n.yaw); placePlayer(n.x + fx * back, n.z + fz * back, Math.atan2(fx, fz), STREET); return NR.state(); },
    photo() { takePhoto(); return ST.photos.length; },
    camera(on = true) { togglePhoto(on); },
    lift(f) { rideLift(f); },
    enterMilton(f = 'G') { enterMilton(f); return NR.state(); },
    roof() { enterRoof(); return NR.state(); },
    board() { const [t, b] = nextFerryAtTST(); boardFerry(b); return NR.state(); },
    ferryState() { return FERRY.boats.map((b) => [b.state, b.left | 0, b.x | 0, b.z | 0]); },
    map() { openMap(); }, journal(t) { openJournal(t); }, closePanels() { if (panelOpen) closePanel(panelOpen); },
    vps() { return VIEWPOINTS.filter((v) => v.test()).map((v) => v.id); },
    MET, STATIONS, EXITS,
    // into a station at an exit's passage ('A1'), or onto a platform ('platform', track 0 or 1)
    metro(st = 'TST', where = 'platform', si = 0) { const S = STATIONS[st]; enterMetroAt(S, where === 'platform' ? 'platform' : EXITS.find((X) => X.st === st && X.id === where), si); return NR.state(); },
    // make the train on a track stand at the platform with its doors open in `in` seconds
    trainIn(st, si, inS = 0) { const T2 = MET.trains.find((q) => q.S.id === st && q.si === si); T2.phase = ((15 - inS - UNI.uTime.value) % HEADWAY + HEADWAY) % HEADWAY; return T2.phase; },
    trains() { return MET.trains.map((q) => [q.S.id, q.si, q.state, q.open, q.grp.position.z | 0]); },
    ride() { return MET.ride && { from: MET.ride.from, to: MET.ride.to, t: +MET.ride.t.toFixed(1), dur: MET.ride.dur }; },
  };
  NR.ready = true;
}
boot();
