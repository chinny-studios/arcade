// Willow Lane — start-up, the simulation step, the frame loop, input (mouse, keyboard, touch) and the #debug hook

function init() {
  initRender();
  R.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshLambertMaterial({ color: 0x40e060, emissive: 0x40e060, emissiveIntensity: 0.45 }));
  R.gem.scale.y = 1.7; R.scene.add(R.gem);
  initUI(); initMenu(); initInput();
  const unlock = () => { audioInit(); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !DEBUG) saveGame(true); });
  toMenu();
  $('#loading').remove();
  requestAnimationFrame(frame);
  if (DEBUG) setupDebug();
}

// ---------- new game ----------
function newGame(family, members, lotKind, price) {
  resetWorld();
  G.t = 8 * 60 + 30; G.money = START_FUNDS - (lotKind === 'starter' ? price : 0); G.nextId = 1;
  buildLot(lotKind);
  makeTownies();
  const sims = createHousehold(family, members);
  const [dx] = frontDoorTile();
  sims.forEach((s, i) => { s.x = dx + 0.5 + (i - (sims.length - 1) / 2) * 0.9; s.z = LOT_D - 1.5; s.dir = Math.PI; s.onLot = true; makeSimModel(s); });
  for (const s of G.sims) if (!s.household) makeSimModel(s);
  R.cam.tx = LOT_W / 2 - 1; R.cam.tz = LOT_D / 2 + 2; R.cam.yawT = R.cam.yaw = Math.PI / 4; R.cam.distT = 27;
  startPlay(sims[0]);
  notify(`Welcome to Willow Lane, ${family} family! Click objects and people to see what your sims can do.`, '🏡', null, true);
  setTimeout(() => notify('Tip: an adult should find a job soon — try the computer or the job ads at the mailbox.', '💡'), 2500);
  if (lotKind === 'empty') setTimeout(() => notify('Tip: open build mode (F3) to put up walls, then buy mode (F2) for a fridge, a bed, a toilet and a shower.', '🔨'), 5000);
}
function startPlay(sel) {
  G.state = 'play'; G.mode = 'live';
  document.body.dataset.state = 'play'; document.body.dataset.mode = 'live';
  $('#menu').hidden = true; $('#cas').hidden = true; $('#hud').hidden = false;
  showGrid(false); clearGhost(); BUILD.tool = null;
  for (const b of $$('#modes [data-mode]')) b.classList.toggle('on', b.dataset.mode === 'live');
  $('#wallsBtn').dataset.w = G.walls;
  G.userSpeed = 1;
  for (const s of G.sims) if (s.model) s.model.visible = s.onLot && !s.away && s.alive;
  for (const s of household()) calcMood(s);
  updateRoomScores();
  selectSim(sel && sel.household ? sel : household().find((h) => h.onLot && h.age !== 'baby') || household()[0]);
  renderMoney(); renderSpeed(); renderCatalog();
  updateCutaway(true);
  music.mode('live');
}

// ---------- simulation ----------
let simMinute = 0;
function simulate(dtMin) {
  const steps = Math.max(1, Math.ceil(dtMin / 0.75));
  const dt = dtMin / steps;
  for (let k = 0; k < steps; k++) {
    G.t += dt;
    if (NAV.dirty) NAV.dirty = false;
    for (const s of G.sims) {
      if (!s.alive) continue;
      if (s.away) { decayAway(s, dt); continue; }
      if (!s.onLot) continue;
      decayNeeds(s, dt);
      s.animT += dt;
      if (s.dying) { s.dying += dt / 4; s.y = s.dying * 1.2; if (s.dying >= 1) finishPassing(s); continue; }
      if (s.age === 'baby') { tickBaby(s, dt); continue; }
      tickActions(s, dt);
      if (!s.cur && !s.queue.length) {
        s.idleT += dt;
        if (s.idleT > (s.household ? 1.2 : 0.8) + R01() * 0.5) {
          s.idleT = 0;
          if (!s.household || G.options.freeWill) { if (!autonomy(s)) idleWander(s); }
        }
      }
      checkEmergencies(s);
    }
    tickVehicles(dt);
    simMinute += dt;
    while (simMinute >= 1) {
      simMinute -= 1;
      everyMinute();
    }
  }
}
function everyMinute() {
  tickObjects(1);
  for (const s of G.sims) if (s.alive) { expireMoodlets(s); if (s.household) { tickPregnancy(s); calcMood(s); } if (s.onLot) calcMood(s); }
  checkSchedules(); tickReturns(); tickVisitors(); tickServices(); tickBills(); tickFires(); tickDaily();
  if (Math.floor(G.t) % 10 === 0) updateRoomScores();
  // lone thoughts about whatever's bothering a sim
  for (const s of household()) if (s.onLot && !s.away && s.age !== 'baby' && chance(0.02)) { const n = lowestNeed(s); if (n && s.needs[n.id] < 30) thought(s, n.icon, 2.5); }
}
function tickBaby(s, dt) {
  const crib = objById(s.crib);
  if (crib) { const [x, z] = objCenter(crib); s.x = x; s.z = z; s.y = 0.5; s.dir = worldAngle(crib, 0); }
  if (s.sleeping) { addNeeds(s, { energy: 14 }, dt); if (s.needs.energy > 96) s.sleeping = false; }
  else if (s.needs.energy < 25) s.sleeping = true;
  const low = ['hunger', 'social', 'hygiene', 'fun'].some((k) => s.needs[k] < 25);
  s.anim = low && !s.sleeping ? 'cry' : 'idle';
  if (low && !s.sleeping && chance(dt * 0.06)) { const n = ['hunger', 'social', 'hygiene', 'fun'].reduce((a, k) => (s.needs[k] < s.needs[a] ? k : a), 'hunger'); thought(s, { hunger: '🍼', social: '🤱', hygiene: '🧷', fun: '🧸' }[n], 2.5); if (chance(0.5)) babble(s, -0.7); }
}

// ---------- the frame ----------
let lastT = performance.now(), menuT = 0, stereoT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  let dtReal = Math.min(0.1, (t - lastT) / 1000); lastT = t;
  if (!(dtReal > 0)) dtReal = 0.001; // the first rAF timestamp can predate performance.now()
  if (G.state === 'cas') { renderCasScene(dtReal); return; }
  if (G.state === 'menu') {
    menuT += dtReal;
    const c = R.cam; c.tx = LOT_W / 2; c.tz = LOT_D / 2 + 1; c.yawT = c.yaw = Math.PI / 4 + menuT * 0.05; c.distT = c.dist = 36;
    updateCamera(dtReal); updateSky(); updateCutaway(); updateObjectVisuals(menuT, dtReal);
    R.renderer.render(R.scene, R.camera);
    return;
  }
  keyPan(dtReal);
  // pick the running speed: paused in build/buy, ultra when everyone is asleep or away
  let sp = G.mode === 'live' && G.state === 'play' ? G.userSpeed : 0;
  if (sp > 0) {
    const hh = household().filter((s) => s.age !== 'baby');
    if (hh.length && hh.every((s) => s.away || s.sleeping) && !G.sims.some((s) => s.onLot && !s.household && s.visit)) sp = 4;
  }
  if (sp !== G.speed) { G.speed = sp; renderSpeed(); }
  if (G.state === 'play' && G.speed > 0) simulate(dtReal * SPEEDS[G.speed]);
  for (const s of G.sims) if (s.model) syncSimModel(s);
  for (const o of G.objects) if (o.model && o.model.userData.wiggle) o.model.position.y = Math.abs(Math.sin(t / 90)) * 0.03;
  updateCamera(dtReal); updateSky(); updateCutaway(); updateDoors(dtReal * Math.max(1, SPEEDS[G.speed]));
  updateObjectVisuals(t / 1000, dtReal);
  stereoT += dtReal; if (stereoT > 1) { stereoT = 0; music.stereo(G.objects.some((o) => o.type === 'stereo' && o.on)); }
  updateHUD(dtReal);
  R.renderer.render(R.scene, R.camera);
}

// ---------- input ----------
const KEYS = {};
const PTR = { down: null, pts: new Map(), pinch: null };
function initInput() {
  const cv = $('#c');
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', (e) => { PTR.pts.delete(e.pointerId); PTR.down = null; PTR.pinch = null; });
  cv.addEventListener('wheel', (e) => { if (G.state !== 'play') return; e.preventDefault(); R.cam.distT = clamp(R.cam.distT * Math.pow(1.0018, e.deltaY), 7, 60); }, { passive: false });
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', (e) => { KEYS[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });
}
function onDown(e) {
  if (G.state !== 'play') return;
  PTR.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (PTR.pts.size === 2) { // pinch & twist
    const [a, b] = [...PTR.pts.values()];
    PTR.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), dist: R.cam.distT, yaw: R.cam.yawT };
    PTR.down = null; return;
  }
  PTR.down = { x: e.clientX, y: e.clientY, btn: e.button, moved: false, type: e.pointerType, tx: R.cam.tx, tz: R.cam.tz, g: screenToGround(e.clientX, e.clientY) };
  if (e.button === 0 && G.mode !== 'live' && BUILD.tool && BUILD.tool !== 'hand') { buildPointer('down', screenToGround(e.clientX, e.clientY), e); PTR.down.build = true; }
  else if (e.button === 0 && G.mode === 'buy' && BUILD.tool === 'hand') { buildPointer('down', screenToGround(e.clientX, e.clientY), e); if (BUILD.tool === 'place') PTR.down.build = true; }
}
function onMove(e) {
  if (G.state !== 'play') return;
  if (PTR.pts.has(e.pointerId)) PTR.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (PTR.pinch && PTR.pts.size >= 2) {
    const [a, b] = [...PTR.pts.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
    R.cam.distT = clamp(PTR.pinch.dist * PTR.pinch.d / Math.max(20, d), 7, 60);
    R.cam.yawT = PTR.pinch.yaw - angWrap(ang - PTR.pinch.ang); R.cam.yaw = R.cam.yawT;
    return;
  }
  const D = PTR.down;
  if (D) {
    const dx = e.clientX - D.x, dy = e.clientY - D.y;
    if (!D.moved && Math.hypot(dx, dy) > (D.type === 'touch' ? 10 : 5)) D.moved = true;
    if (D.moved && (D.btn === 2 || D.btn === 1)) { // rotate & tilt
      R.cam.yawT -= (e.movementX || 0) * 0.006; R.cam.yaw = R.cam.yawT;
      R.cam.pitch = clamp(R.cam.pitch + (e.movementY || 0) * 0.003, 0.55, 1.15);
      return;
    }
    if (D.moved && D.btn === 0 && !D.build && D.g) { // drag the ground to pan
      R.cam.tx = D.tx; R.cam.tz = D.tz; updateCamera(0);
      const g = screenToGround(e.clientX, e.clientY);
      if (g) { R.cam.tx = D.tx - (g.x - D.g.x); R.cam.tz = D.tz - (g.z - D.g.z); R.cam.follow = null; }
      return;
    }
  }
  if (G.mode !== 'live' && BUILD.tool && e.target === $('#c')) buildPointer('move', screenToGround(e.clientX, e.clientY), e);
  else if (G.mode !== 'live') hideTip();
  // edge pan
  PTR.edge = G.options.edgePan && e.pointerType === 'mouse' ? [e.clientX < 8 ? -1 : e.clientX > window.innerWidth - 8 ? 1 : 0, e.clientY < 8 ? 1 : e.clientY > window.innerHeight - 8 ? -1 : 0] : null;
}
function onUp(e) {
  PTR.pts.delete(e.pointerId);
  if (PTR.pinch) { if (PTR.pts.size < 2) PTR.pinch = null; return; }
  const D = PTR.down; PTR.down = null;
  if (!D || G.state !== 'play') return;
  if (D.build) { buildPointer('up', screenToGround(e.clientX, e.clientY), e); return; }
  if (D.moved) return;
  if (D.btn === 2) { // right click: cancel the tool / close menus
    if (UI.pie) closePie();
    else if (G.mode !== 'live' && (BUILD.tool === 'place')) { clearGhost(); BUILD.tool = G.mode === 'buy' ? 'hand' : BUILD.tool; BUILD.item = null; renderCatalog(); }
    return;
  }
  if (D.btn !== 0) return;
  if (G.mode === 'live') liveClick(e);
}
function liveClick(e) {
  if (UI.pie) { closePie(); return; }
  const list = [];
  for (const s of G.sims) if (s.model && s.model.visible) list.push(s.model);
  for (const o of G.objects) if (o.model && o.model.visible) list.push(o.model);
  for (const it of G.items) if (it.model) list.push(it.model);
  const hit = pickAt(e.clientX, e.clientY, list);
  if (hit) { pieFor(e, hit.pick); return; }
  const g = screenToGround(e.clientX, e.clientY);
  const s = G.selected;
  if (g && s && s.onLot && !s.away && s.age !== 'baby') {
    const tx = Math.floor(g.x), tz = Math.floor(g.z);
    if (NAV.walk(tx, tz)) { queueAct(s, 'goHere', { x: g.x, z: g.z }, null, true); footMarker(g.x, g.z); sfx('click'); }
  }
}
function footMarker(x, z) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.28, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); R.scene.add(m);
  let k = 0; const iv = setInterval(() => { k += 0.08; m.scale.setScalar(1 + k); m.material.opacity = 0.8 * (1 - k); if (k >= 1) { clearInterval(iv); R.scene.remove(m); } }, 30);
}
function keyPan(dt) {
  if (G.state !== 'play' || document.activeElement && document.activeElement.tagName === 'INPUT') return;
  const sp = R.cam.dist * 0.9 * dt;
  let x = 0, z = 0;
  if (KEYS.KeyW || KEYS.ArrowUp) z += 1; if (KEYS.KeyS || KEYS.ArrowDown) z -= 1;
  if (KEYS.KeyA || KEYS.ArrowLeft) x -= 1; if (KEYS.KeyD || KEYS.ArrowRight) x += 1;
  if (PTR.edge) { x += PTR.edge[0]; z += PTR.edge[1]; }
  if (x || z) camPan(x * sp, z * sp);
  if (KEYS.KeyZ) R.cam.distT = clamp(R.cam.distT * (1 - dt * 1.5), 7, 60);
  if (KEYS.KeyX) R.cam.distT = clamp(R.cam.distT * (1 + dt * 1.5), 7, 60);
}
function onKey(e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  KEYS[e.code] = true;
  if (G.state !== 'play') { if (e.code === 'Escape' && !$('#dialog').hidden) closeDialog(); return; }
  if (!$('#dialog').hidden) { if (e.code === 'Escape') closeDialog(); return; }
  const k = e.code;
  if ((e.ctrlKey || e.metaKey) && k === 'KeyZ') { e.preventDefault(); if (G.mode !== 'live') e.shiftKey ? redoBuild() : undoBuild(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'KeyY') { e.preventDefault(); if (G.mode !== 'live') redoBuild(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'KeyS') { e.preventDefault(); saveGame(); return; }
  if (k === 'Space') { e.preventDefault(); if (G.userSpeed === 0) setSpeed(G.prevSpeed || 1); else { G.prevSpeed = G.userSpeed; setSpeed(0); } }
  else if (k === 'Digit1' || k === 'Numpad1') setSpeed(1);
  else if (k === 'Digit2' || k === 'Numpad2') setSpeed(2);
  else if (k === 'Digit3' || k === 'Numpad3') setSpeed(3);
  else if (k === 'Digit0' || k === 'Backquote') setSpeed(0);
  else if (k === 'F1') { e.preventDefault(); setMode('live'); }
  else if (k === 'F2') { e.preventDefault(); setMode('buy'); }
  else if (k === 'F3') { e.preventDefault(); setMode('build'); }
  else if (k === 'KeyV') cycleWalls();
  else if (k === 'KeyQ') { R.cam.yawT = Math.round((R.cam.yawT - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4 - Math.PI / 2; }
  else if (k === 'KeyE') { R.cam.yawT = Math.round((R.cam.yawT - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4 + Math.PI / 2; }
  else if (k === 'KeyC' && G.selected) focusSim(G.selected);
  else if (k === 'Tab') { e.preventDefault(); const hh = household().filter((s) => !s.away && s.onLot); if (hh.length) { const i = hh.indexOf(G.selected); selectSim(hh[(i + 1) % hh.length]); focusSim(G.selected); } }
  else if (k === 'KeyR' && G.mode === 'buy') rotateTool(e.shiftKey ? -1 : 1);
  else if (k === 'Comma' && G.mode === 'buy') rotateTool(-1);
  else if (k === 'Period' && G.mode === 'buy') rotateTool(1);
  else if ((k === 'Delete' || k === 'Backspace') && G.mode === 'buy') sellHeld();
  else if (k === 'Escape') {
    if (UI.pie) closePie();
    else if (G.mode !== 'live' && BUILD.tool === 'place') { clearGhost(); BUILD.tool = G.mode === 'buy' ? 'hand' : 'wall'; BUILD.item = null; renderCatalog(); }
    else if (G.mode !== 'live') setMode('live');
    else optionsDialog();
  }
}

// ---------- #debug hook ----------
function setupDebug() {
  window.WL = {
    G, R, LOT, CAT, IX, SOCIAL, NAV, BUILD, PRESETS,
    f: { pickAt, pieFor, closePie, openCAS, toMenu, findPath, standSpots, seatSpots, lieSpots, canPlace, placeObject, removeObject, objById, simById, household, autonomy, queueAct, addItem, ageUp, passAway, startPregnancy, giveBirth, wedding, moveIn, startVisit, takeJob, startFire, buildLot, lotValue, updateRoomScores, roomScore, frontDoorTile, setMode, setTool, buildPointer, saveGame, loadGame, simulate, VEH },
    // start a game: preset index or 'cas' members, lot 'starter' | 'empty'
    start(opts = {}) {
      seedRandom(opts.seed || 'test');
      const p = PRESETS[opts.preset || 0];
      const members = opts.members || p.members.map((m) => Object.assign({}, m, { look: Object.assign({ body: m.body }, m.look) }));
      buildLot('starter');
      const price = Math.round(lotValue() * STARTER_PRICE_FACTOR / 100) * 100;
      newGame(opts.family || p.name, members, opts.lot || 'starter', price);
      if (opts.hour != null) G.t = Math.floor(G.t / 1440) * 1440 + opts.hour * 60;
      G.options.sound = false; G.options.music = false; G.options.voices = false;
      return { money: G.money, sims: household().map((s) => s.first) };
    },
    // fast-forward game minutes without rendering
    sim(minutes, step = 1) { let m = 0; const oldSpeed = G.speed; while (m < minutes) { simulate(Math.min(step, minutes - m)); m += step; } return { t: G.t, day: dayNum(), clock: fmtClock() }; },
    render() { if (G.state === 'cas') { renderCasScene(0.016); return; } for (const s of G.sims) if (s.model) syncSimModel(s); updateCamera(0.016); updateSky(); updateCutaway(true); updateObjectVisuals(performance.now() / 1000, 0.016); updateHUD(0.6); R.renderer.render(R.scene, R.camera); },
    sel(i = 0) { const s = household()[i]; selectSim(s); return s; },
    sims() { return household(); },
    act(i, type, id, arg) { const s = household()[i]; const o = typeof type === 'object' ? type : G.objects.find((x) => x.type === type); return queueAct(s, id, o, arg, true); },
    social(i, j, id) { const a = household()[i], b = typeof j === 'object' ? j : household()[j]; return queueAct(a, 'social', b, id, true); },
    give(n) { G.money += n; bus.emit('money'); },
    time(day, hour) { G.t = (day - 1) * 1440 + hour * 60; },
    cam(tx, tz, dist, yaw) { Object.assign(R.cam, { tx, tz, dist, distT: dist, follow: null }); if (yaw != null) { R.cam.yaw = R.cam.yawT = yaw; } updateCamera(0); },
    needs(i, v) { const s = household()[i]; for (const n of NEEDS) s.needs[n.id] = typeof v === 'object' ? (v[n.id] != null ? v[n.id] : s.needs[n.id]) : v; },
    place(type, x, z, r = 0) { const why = canPlace(CAT[type], x, z, r); if (why) return why; return placeObject(type, x, z, r); },
    visitor() { const p = G.sims.find((s) => !s.household && !s.service && !s.onLot && s.alive); if (p) startVisit(p, 'visit', true); return p; },
    stats() { return { t: fmtClock() + ' day ' + dayNum(), money: G.money, sims: household().map((s) => ({ n: s.first, age: s.age, mood: Math.round(s.mood), cur: s.cur && s.cur.id, q: s.queue.length, x: +s.x.toFixed(1), z: +s.z.toFixed(1), away: s.away && s.away.kind, needs: Object.fromEntries(Object.entries(s.needs).map(([k, v]) => [k, Math.round(v)])) })), objects: G.objects.length, items: G.items.length, onLot: G.sims.filter((s) => s.onLot).length, calls: R.renderer.info.render.calls }; },
    hideUI(on = true) { $('#hud').style.visibility = on ? 'hidden' : ''; $('#bubbles').style.visibility = on ? 'hidden' : ''; },
    ready: true,
  };
}

init();
