// Valor Bay — boot, the frame loop, the cameras (over the shoulder, the title flyover, the hero close-up on the
// select screen) and the #debug hook (window.VB)

let lastT = 0;
function boot() {
  loadSave();
  try { initRender(); } catch (e) { console.error(e); return; }
  initMats();
  makeTextures(); makeClouds();
  initFX();
  buildCity();
  initPeople(); initCars();
  Input.init(); HUD.init(); UI.wire();
  applyOptions();
  setTimeOfDay(G.tod);
  if (DEBUG) installDebug();
  UI.toTitle();
  try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* not essential */ }
  $('#loading').hidden = true;
  lastT = performance.now();
  requestAnimationFrame(loop);
}
function loop(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
  try { frame(dt, true); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function frame(dt, draw) {
  G.frame++;
  Input.update();
  if (Input.mode === 'pad') UI.update();
  const state = document.body.dataset.state;
  if (Input.pressed('menu')) {
    if (HUD.mapOpen) HUD.toggleMap(false);
    else if (UI.top()) UI.back();
    else if (state === 'play') UI.show('pause');
    else if (state === 'select') UI.toTitle();
  }
  if (state === 'play' && !UI.top()) {
    if (Input.pressed('map')) HUD.toggleMap();
    if (Input.pressed('hero')) UI.show('heroes');
    if (Input.pressed('help')) UI.show('help');
  }
  const paused = UI.paused();
  // slow motion for big moments; Blitz's Speed Force slows everyone but him
  let sdt = dt;
  if (G.slow > 0) { G.slow -= dt; sdt = dt * 0.3; }
  const wdt = sdt * (G.speedForce > 0 ? 0.15 : 1);
  if (!paused) {
    if (state === 'play') { updateHero(sdt); updateRules(sdt); }
    updateFoes(wdt);
    updatePeople(wdt);
    updateCars(wdt);
    updateProj(sdt);
    updateFX(sdt);
    flushShadows();
  }
  // camera
  if (state === 'play' && P) followCam(dt, paused);
  else if (state === 'select') selectCam(dt);
  else titleCam(dt);
  if (G.frame % 3 === 0 || paused) setTimeOfDay(G.tod);
  updateSky();
  if (state === 'play') HUD.update(dt);
  AUDIO.update(dt);
  if (draw) renderFrame();
  Input.endFrame();
}
// over the right shoulder, further back the faster you go, pulled in when a wall is in the way
function followCam(dt, paused) {
  const look = Input.lookDelta();
  if (!paused) { CAM.yaw -= look.x; CAM.pitch = clamp(CAM.pitch + look.y, -0.95, 1.35); }
  if (Input.mouse.wheel) CAM.zoom = clamp(CAM.zoom + Input.mouse.wheel * 0.1, 0.55, 2.2);
  const sp = Math.hypot(P.vx, P.vy, P.vz), big = P.h / 1.8 * (P.rampage > 0 ? 1.35 : 1);
  const tx = P.x, ty = P.y + P.h * 0.85 * (P.downed ? 0.3 : 1), tz = P.z;
  const d = (3.6 * Math.pow(big, 0.8) + Math.min(sp, 60) * 0.07 + (P.mode === 'fly' ? 1.5 : 0)) * CAM.zoom;
  const cp = Math.cos(CAM.pitch), spn = Math.sin(CAM.pitch);
  const fx = fwdX(CAM.yaw), fz = fwdZ(CAM.yaw), rx = -fz, rz = fx, sh = 0.65 * big;
  let cx = tx - fx * cp * d + rx * sh, cy = ty + spn * d, cz = tz - fz * cp * d + rz * sh;
  // keep the camera out of buildings
  const ox = tx + rx * sh * 0.4, oz = tz + rz * sh * 0.4;
  const dx = cx - ox, dy = cy - ty, dz = cz - oz, dl = Math.hypot(dx, dy, dz);
  const hit = raycast(ox, ty, oz, dx / dl, dy / dl, dz / dl, dl + 0.3);
  if (hit < dl + 0.3) { const k = Math.max(0.1, (hit - 0.35) / dl); cx = ox + dx * k; cy = ty + dy * k; cz = oz + dz * k; }
  cy = Math.max(cy, (onLand(cx, cz) ? 0 : CITY.WATER_Y) + 0.4);
  const k = CAM.snap ? 1 : 1 - Math.exp(-dt * 20);
  CAM.x = lerp(CAM.x, cx, k); CAM.y = lerp(CAM.y, cy, k); CAM.z = lerp(CAM.z, cz, k);
  CAM.snap = false;
  const s = FX.shake * 0.22;
  R.camera.position.set(CAM.x + rr(-s, s), CAM.y + rr(-s, s), CAM.z + rr(-s, s));
  R.camera.lookAt(tx + rx * sh * 0.75 + fx * 2, ty + 0.15 - spn * 0.6, tz + rz * sh * 0.75 + fz * 2);
  // the faster you go, the wider the view
  const fov = OPTS.fov + clamp((sp - 12) * 0.35, 0, 20) + (G.speedForce > 0 ? 6 : 0);
  if (Math.abs(R.camera.fov - fov) > 0.05) { R.camera.fov = damp(R.camera.fov, fov, 4, dt); R.camera.updateProjectionMatrix(); }
}
function titleCam(dt) {
  G.tt = (G.tt || 0) + dt;
  const T = CITY.landmarks.find((l) => l.name === 'Valor Tower');
  const a = G.tt * 0.04 + 2.2, r = 230;
  R.camera.position.set(T.x + Math.cos(a) * r, 110 + Math.sin(G.tt * 0.07) * 15, T.z + Math.sin(a) * r);
  R.camera.lookAt(T.x, 90, T.z);
  if (R.camera.fov !== OPTS.fov) { R.camera.fov = OPTS.fov; R.camera.updateProjectionMatrix(); }
  if (OPTS.time === 'cycle') G.tod = (G.tod + dt * 0.05) % 24;
}
function selectCam(dt) {
  G.tt = (G.tt || 0) + dt;
  const M = PREVIEW.M; if (!M) return titleCam(dt);
  PREVIEW.t += dt;
  poseReset(M); poseHero(M, PREVIEW.t);
  if (M.bones[B.cape1]) poseCape(M, 6, PREVIEW.t);
  poseApply(M, dt, 6);
  const p = M.root.position, h = HEROES[PREVIEW.id].build.h;
  M.root.rotation.y = Math.PI + Math.sin(PREVIEW.t * 0.5) * 0.25;
  // a low angle from in front and to one side, the hero in the upper half of the screen above the cards
  const d = h * 1.75 + (innerWidth < innerHeight * 1.2 ? 2 : 0);
  R.camera.position.set(p.x + h * 0.9, p.y - h * 0.25, p.z + d);
  R.camera.lookAt(p.x + h * 0.25, p.y - h * 0.55, p.z);
}

// ---------- the debug hook ----------
function installDebug() {
  const step = 1 / 30;
  const VB = {
    G, R, CAM, CITY, PEOPLE, CARS, FOES, CRIME, PROJ, FX, UI, HUD, Input, OPTS, HEROES, VILLAINS, AUDIO,
    get P() { return P; },
    f: { startPatrol, switchHero, startCrime, spawnFoe, spawnBoss, damageFoe, bindFoe, freezeFoe, hurtHero, knock, raycast, supportY, collide, losClear, aimTarget, aimPoint, findAnchor, startSwing, enterWall, startFly, heroQuake, hitCar, launchCar, grabCar, placeCar, setTimeOfDay, districtOf, sidewalkSpot, melee, ranged, powerQ, powerE, ultimate, addScore, renderFrame },
    // start({ hero, at: { x, z }, god, crimes, tod }) — a patrol that's never saved; crimes off unless asked
    start(o = {}) {
      G.noSave = true; OPTS.tips = false;
      UI.toTitle();
      startPatrol(o.hero || 'spindle', { quiet: true, at: o.at ? { x: o.at.x, z: o.at.z, y: supportY(o.at.x, o.at.z, 999), yaw: o.at.yaw || 0 } : null });
      if (!o.crimes) { CRIME.next = 1e9; CRIME.villainT = 1e9; }
      if (o.god) G.god = true;
      if (o.tod !== undefined) { G.tod = o.tod; OPTS.time = 'day'; setTimeOfDay(o.tod); OPTS.time = 'cycle'; G.tod = o.tod; }
      VB.sim(0.2);
      return VB.stats();
    },
    sim(sec, s = step) { const n = Math.round(sec / s); for (let i = 0; i < n; i++) frame(s, false); return VB.stats(); },
    render() { renderFrame(); },
    press(a) { Input.acts.add(a); frame(step, false); return VB.stats(); },
    // hold actions for some seconds; move: { x, y } like a stick (y -1 is forward)
    hold(acts, sec, move) {
      const saved = Input.move;
      if (move) Input.move = () => move;
      const list = [].concat(acts || []);
      for (const a of list) { Input.held2.add(a); Input.acts.add(a); }
      VB.sim(sec);
      for (const a of list) Input.held2.delete(a);
      Input.move = saved;
      return VB.stats();
    },
    tp(x, z, y) { P.x = x; P.z = z; P.y = y === undefined ? supportY(x, z, 999) : y; P.vx = P.vy = P.vz = 0; P.mode = 'ground'; P.anchor = null; P.wall = null; CAM.snap = true; frame(step, false); return VB.stats(); },
    face(yaw, pitch) { P.yaw = yaw; CAM.yaw = yaw; if (pitch !== undefined) CAM.pitch = pitch; CAM.snap = true; frame(step, false); },
    aimAt(t) { const x = t.x, z = t.z, y = (t.y || 0) + (t.h ? t.h * 0.5 : 1); const yaw = yawOf(x - P.x, z - P.z); P.yaw = CAM.yaw = yaw; const d = dist(x, z, P.x, P.z); CAM.pitch = clamp(Math.atan2(P.y + P.h - y, d) + 0.12, -0.9, 1.3); CAM.snap = true; frame(step, false); },
    spawn(type, gang, x, z, o) { const f = spawnFoe(type, gang || 'jackals', x, z, o || {}); return f; },
    boss(id, x, z) { return spawnBoss(id, x, z, null); },
    crime(type, at) { return startCrime(type, at ? Object.assign(sidewalkSpot(at.x, at.z, 0, 30), at) : null); },
    hero(id) { switchHero(id); return VB.stats(); },
    god(on = true) { G.god = on; },
    tod(h) { G.tod = h; setTimeOfDay(h); },
    hideHUD(on = true) { document.body.classList.toggle('nohud', on); },
    counts() { const c = {}; for (const f of FOES.list) { const k = f.ko ? 'ko' : f.state; c[k] = (c[k] || 0) + 1; } return c; },
    stats() {
      if (!P) return { state: document.body.dataset.state };
      return { hero: P.id, mode: P.mode, x: +P.x.toFixed(1), y: +P.y.toFixed(1), z: +P.z.toFixed(1), v: +Math.hypot(P.vx, P.vy, P.vz).toFixed(1), hp: Math.round(P.hp), meter: Math.round(P.meter), ground: P.onGround,
        score: G.score, combo: G.combo, arrests: G.arrests, wave: Math.round(G.wave), foes: VB.counts(), crimes: CRIME.list.filter((c) => c.state === 'active').map((c) => c.type), cars: CARS.list.filter((c) => c.state !== 'gone').length, calls: R.renderer.info.render.calls, tris: R.renderer.info.render.triangles };
    },
  };
  window.VB = VB;
}

boot();
