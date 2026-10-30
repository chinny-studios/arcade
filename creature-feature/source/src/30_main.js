// Creature Feature — boot, the frame loop, the cameras (third person, title flyover, monster close-up) and the
// #debug hook (window.CF)

let lastT = 0;
function boot() {
  loadSave();
  try { initRender(); } catch (e) { console.error(e); return; }
  initMats();
  makeTextures(); makeMoon();
  initFX();
  buildTown();
  Input.init(); HUD.init(); UI.wire();
  applyOptions();
  if (DEBUG) installDebug();
  UI.toTitle();
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
  if (Input.pressed('menu') || (Input.pressed('back') && UI.top())) {
    if (UI.top()) { if (UI.top() !== 'over') UI.back(); }
    else if (state === 'play' && !G.over) UI.show('pause');
    else if (state === 'select') UI.toTitle();
  }
  if (Input.pressed('help') && state === 'play' && !UI.top()) UI.show('help');
  const paused = UI.paused() && !G.over;
  // a moment of slow motion on a kill
  let sdt = dt;
  if (G.slow > 0) { G.slow -= dt; sdt = dt * 0.3; }
  if (!paused) {
    if (state === 'play') {
      updateMonster(sdt);
      updateThrown(sdt);
      updateRules(sdt);
    }
    updatePeople(sdt);
    updateCars(sdt);
    if (G.frame % 120 === 0) prunePeople();
    updateFX(sdt);
  }
  // camera
  if (state === 'play' && P) {
    const look = Input.lookDelta();
    if (!paused) { CAM.yaw -= look.x; CAM.pitch = clamp(CAM.pitch + look.y, -0.55, 1.2); }
    if (Input.mouse.wheel) CAM.zoom = clamp(CAM.zoom + Input.mouse.wheel * 0.1, 0.6, 1.8);
    followCam(dt);
  } else if (state === 'select') selectCam(dt);
  else titleCam(dt);
  updateSky();
  updateLightPool(dt, R.camera.position.x, R.camera.position.z);
  if (G.frame % 4 === 0) TEX.movie.tick(dt * 4);
  if (state === 'play') HUD.update(dt);
  AUDIO.update(dt);
  if (draw) R.renderer.render(R.scene, R.camera);
  Input.endFrame();
}
// over the shoulder, pulled in when a wall is in the way
function followCam(dt) {
  const D = P.D;
  const tx = P.x, ty = P.y + D.eye * (P.form === 'bat' ? 0.4 : 0.85), tz = P.z;
  const d = D.cam * CAM.zoom * (P.form === 'bat' ? 1.2 : 1);
  const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
  const [fx, fz] = camFwd(), rx = -fz, rz = fx, sh = 0.55;
  let cx = tx - fx * cp * d + rx * sh, cy = ty + sp * d, cz = tz - fz * cp * d + rz * sh;
  const ox = tx + rx * sh * 0.5, oz = tz + rz * sh * 0.5;
  const hit = rayHit(ox, ty, oz, cx, cy, cz, 0.3);
  if (hit < 1) { const k = Math.max(0.12, hit - 0.04); cx = ox + (cx - ox) * k; cy = ty + (cy - ty) * k; cz = oz + (cz - oz) * k; }
  cy = Math.max(cy, terrainH(cx, cz) + 0.35);
  const k = CAM.snap ? 1 : 1 - Math.exp(-dt * 18);
  CAM.x = lerp(CAM.x, cx, k); CAM.y = lerp(CAM.y, cy, k); CAM.z = lerp(CAM.z, cz, k);
  CAM.snap = false;
  const s = FX.shake * 0.25;
  R.camera.position.set(CAM.x + rr(-s, s), CAM.y + rr(-s, s), CAM.z + rr(-s, s));
  R.camera.lookAt(tx + rx * sh * 0.6 + fx * 2, ty + 0.2 - sp * 0.5, tz + rz * sh * 0.6 + fz * 2);
}
function titleCam(dt) {
  G.tt = (G.tt || 0) + dt;
  const a = G.tt * 0.03 + 0.6, r = 120;
  R.camera.position.set(Math.cos(a) * r, 42 + Math.sin(G.tt * 0.05) * 6, Math.sin(a) * r);
  R.camera.lookAt(0, 0, 0);
}
function selectCam(dt) {
  G.tt = (G.tt || 0) + dt;
  const M = PREVIEW.M; if (!M) return titleCam(dt);
  const p = M.root.position;
  poseMonster(M, 'idle', 0, 0, G.tt);
  M.root.rotation.y = Math.sin(G.tt * 0.4) * 0.4;
  const h = MONSTERS[PREVIEW.id].height;
  const narrow = innerWidth < innerHeight;
  R.camera.position.set(p.x + (narrow ? 0 : -1.4), p.y + h * 0.75, p.z - h * 1.9 - (narrow ? 1.5 : 0));
  R.camera.lookAt(p.x + (narrow ? 0 : -1.2), p.y + h * (narrow ? 0.85 : 0.6), p.z);
}

// ---------- the debug hook ----------
function installDebug() {
  const step = 1 / 30;
  const CF = {
    G, R, CAM, TOWN, WORLD, PEOPLE, CARS, FX, UI, HUD, Input, OPTS, MONSTERS, FOLK, LIGHTS, THROWN, AUDIO,
    get P() { return P; },
    f: { startRun, endRun, killPerson, spawnPerson, spawnMonster, startle, breakRefuge, leaveRefuge, planFlee, route, nearestRoad, terrainH, supportY, collide, losClear, lightAt, aimTarget, hypnotise, smashCar, wreckCar, startDriving, arriveCar, parkCar, resetTown, populate, smashLamp, screenSplat, bloodBurst, showPreview, poseMonster, knockDown, howl, stomp, director, sightRange },
    // start({ monster, empty, people }) — a run that's never saved; the monster is already up
    start(o = {}) {
      G.noSave = true; OPTS.tips = false;
      startRun(o.monster || 'vampire', { noRise: true, quiet: true, empty: !!o.empty });
      if (o.god) G.god = true;
      CF.sim(0.2);
      return CF.stats();
    },
    sim(sec, s = step) { const n = Math.round(sec / s); for (let i = 0; i < n; i++) frame(s, false); return CF.stats(); },
    render() { R.renderer.render(R.scene, R.camera); },
    press(a) { Input.acts.add(a); frame(step, false); return CF.stats(); },
    // hold actions (keys of BIND, or 'atk') for some seconds; move: { x, y } like a stick
    hold(acts, sec, move) {
      const saved = Input.move;
      if (move) Input.move = () => move;
      for (const a of [].concat(acts || [])) Input.touchHeld.add(a);
      CF.sim(sec);
      for (const a of [].concat(acts || [])) Input.touchHeld.delete(a);
      Input.move = saved;
      return CF.stats();
    },
    tp(x, z, y) { P.x = x; P.z = z; P.y = y === undefined ? supportY(x, z, 999) : y; P.vx = P.vy = P.vz = 0; CAM.snap = true; frame(step, false); return CF.stats(); },
    face(yaw) { P.yaw = yaw; CAM.yaw = yaw; CAM.snap = true; },
    // turn the monster and camera toward a point (or a person)
    aimAt(t) { const x = t.x, z = t.z, y = (t.y || 0) + 1.1; const yaw = yawOf(x - P.x, z - P.z); P.yaw = CAM.yaw = yaw; const d = dist(x, z, P.x, P.z); CAM.pitch = clamp(Math.atan2(P.y + P.D.eye - y, d) * 0.8 + 0.08, -0.5, 1.1); CAM.snap = true; frame(step, false); },
    spawn(type, x, z, o) { return spawnPerson(type, x, z, o || {}); },
    nearest(states) { let b = null, bd = 1e9; for (const v of PEOPLE.list) { if (v.state === 'dead' || v.state === 'gone' || (states && !states.includes(v.state))) continue; const d = dist(v.x, v.z, P.x, P.z); if (d < bd) { bd = d; b = v; } } return b; },
    god(on = true) { G.god = on; },
    hideHUD(on = true) { document.body.classList.toggle('nohud', on); },
    counts() { const c = {}; for (const v of PEOPLE.list) c[v.state] = (c[v.state] || 0) + 1; return c; },
    stats() {
      if (!P) return { state: document.body.dataset.state };
      return { m: P.id, x: +P.x.toFixed(1), y: +P.y.toFixed(1), z: +P.z.toFixed(1), act: P.act, form: P.form, score: G.score, kills: G.kills, hunger: +G.hunger.toFixed(1), combo: G.combo, panic: Math.round(G.panic), t: +G.t.toFixed(1), over: G.over, people: CF.counts(), cars: CARS.list.filter((c) => !c.dead).length };
    },
  };
  window.CF = CF;
}

boot();
