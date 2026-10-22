// Copter City — boot, the frame loop, global keys, the day clock, the title flyover, and the #debug hook (window.CC)

let lastT = 0;
G.frame = 0;
function boot() {
  loadOpts();
  try { initRender(); } catch (e) { console.error(e); return; }
  makeTextures(); R.sunDisc.material.map = TEX.glow;
  initFX();
  Input.init(); HUD.init(); wireUI();
  applyOptions();
  setTimeOfDay(10, true);
  showTitle();
  if (DEBUG) installDebug();
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
  if (Input.mode === 'pad' && UI.top()) UI.update();
  const state = document.body.dataset.state;
  if (state !== 'play') { titleFrame(dt, draw); Input.endFrame(); return; }
  globalKeys();
  const paused = UI.paused();
  if (!paused) {
    G.t += dt;
    G.hour = (G.hour + dt * TIME_SCALE / 3600) % 24;
    setTimeOfDay(G.hour);
    if (G.where === 'heli') heliControls(dt);
    else { flyHeli(dt, { fwd: 0, turn: 0, strafe: 0, lift: 0, roll: 0, pedal: 0, coll: -1 }); footControls(dt); }
    HELI.roughT = Math.max(0, HELI.roughT - dt);
    updateHeliModel(dt);
    updateGear(dt);
    updateFire(dt);
    updateDispatch(dt);
    updateTraffic(dt);
    updateTokens(dt);
    // the home pad refuels slowly for free when you're parked on it with the engine off
    if (HELI.landed && HELI.pad && HELI.pad.kind === 'home' && !HELI.engine && G.free) { HELI.fuel = HELI.st.fuel; HELI.hp = HELI.st.hp; HELI.gas = HELI.st.gas; }
  }
  updateFX(paused ? 0 : dt);
  // cameras
  const look = Input.lookDelta();
  if (Math.abs(look.x) + Math.abs(look.y) > 0.0001) { CAM.userYaw -= look.x; CAM.userPitch = clamp(CAM.userPitch + look.y * (CAM.mode === 'cockpit' && G.where === 'heli' ? -1 : 1), -0.9, 1.2); CAM.orbitT = 2; }
  if (Input.mouse.wheel) CAM.zoom = clamp(CAM.zoom + Input.mouse.wheel * 0.1, 0.5, 2.2);
  if (G.where === 'heli') updateHeliCam(dt); else updateFootCam(dt);
  updateSky();
  nightLights();
  TEX.water.offset.x = (G.t * 0.01) % 1; TEX.water.offset.y = (G.t * 0.006) % 1;
  HUD.update(dt);
  AUDIO.update(dt);
  if (draw) R.renderer.render(R.scene, R.camera);
  Input.endFrame();
}
function nightLights() {
  const n = R.night, FM = facadeMats();
  for (const f of FACADES) FM[f].emissiveIntensity = n * 0.9;
  if (CITY.lampPts) CITY.lampPts.material.opacity = n;
}
function heliControls(dt) {
  const H = HELI;
  let inp = G.ap ? autopilot(dt) : Input.flight();
  if (G.inp) inp = Object.assign({ fwd: 0, turn: 0, strafe: 0, lift: 0, roll: 0, pedal: 0, coll: 0 }, G.inp);
  flyHeli(dt, inp);
  for (let i = 0; i < 5; i++) if (Input.pressed('e' + (i + 1))) selectEquip(EQUIP_ORDER[i]);
  if (Input.pressed('e0')) selectEquip(null);
  if (Input.pressed('gearNext')) cycleEquip(1);
  if (Input.pressed('gearPrev')) cycleEquip(-1);
  if (Input.pressed('equip') || Input.pressed('t_use')) useEquip();
  if (Input.pressed('t_gear')) cycleEquip(1);
  if (Input.pressed('siren')) toggleSiren();
  if ((Input.pressed('use') || Input.pressed('t_exit')) && H.landed) exitHeli();
  if (Input.pressed('enter') || (Input.pressed('ok') && H.landed && H.pad && H.pad.kind === 'home')) { if (H.landed && H.pad && H.pad.kind === 'home') openHangar(); }
}
function globalKeys() {
  if (Input.pressed('menu') || (Input.pressed('back') && UI.top())) {
    if (UI.top()) UI.back();
    else if (Input.pressed('menu')) UI.show('pause');
    return;
  }
  if (UI.paused() && !UI.isOpen('mapBig')) return;
  if (Input.pressed('map') || Input.pressed('t_map')) { if (UI.isOpen('mapBig')) UI.hide('mapBig'); else UI.show('mapBig'); }
  if (Input.pressed('help')) UI.show('help');
  if (Input.pressed('next') || Input.pressed('t_call')) cycleTarget();
  if ((Input.pressed('cam') && !UI.top()) || Input.pressed('t_cam')) { if (G.where === 'heli') cycleCam(); }
  if (Input.pressed('radio') || Input.pressed('t_radio')) MUSIC.cycle();
  if (G.where === 'foot' && Input.pressed('t_exit')) Input.acts.add('use');
  if (G.where === 'foot' && Input.pressed('t_up')) Input.acts.add('jump');
}

// a simple autopilot (tests and the title flyover): fly to (x, z) at altitude alt; land: true sets it down there
function autopilot(dt) {
  const H = HELI, a = G.ap;
  const dx = a.x - H.x, dz = a.z - H.z, d = Math.hypot(dx, dz);
  const want = Math.atan2(-dx, -dz), err = angWrap(want - H.yaw);
  const surf = surfaceY(H.x, H.z, H.y + 1);
  let alt = a.alt !== undefined ? a.alt : 60;
  // look ahead for tall buildings
  if (!a.exact) for (let k = 20; k < Math.min(Math.max(120, speedH() * 4), d + 10); k += 20) { const x = H.x + (d > 1 ? dx / d : 0) * k, z = H.z + (d > 1 ? dz / d : 0) * k; alt = Math.max(alt, roofBelow(x, z) + 15); }
  if (d < 120 && !a.land && !a.exact) alt = Math.max(alt, roofBelow(a.x, a.z) + 15);
  if (a.land && d < 12) alt = -5;
  const tgtY = (a.land && d < 12 ? surf : surfaceY(a.x, a.z) * 0) + alt;
  const lift = clamp((tgtY - H.y) / 8, -1, 1);
  let fwd = d < 3 ? 0 : clamp(d / 60, 0.15, 1) * (Math.abs(err) < 0.8 ? 1 : 0.1);
  if (H.y < alt - 6 && !(a.land && d < 12)) fwd = speedH() > 8 ? -0.5 : Math.min(fwd, 0.1); // brake and climb over obstacles first
  if (a.land && d < 12) { const f = heliFwd(); const vf = H.vx * f.x + H.vz * f.z; return { fwd: clamp(-vf / 6 + d / 30, -1, 1), turn: 0, strafe: 0, lift, roll: 0, pedal: 0, coll: lift }; }
  return { fwd, turn: clamp(err * 2, -1, 1), strafe: 0, lift, roll: 0, pedal: 0, coll: lift };
}

// ---------- title: a slow orbit over Dover Flats ----------
function titleFrame(dt, draw) {
  G.t += dt;
  setTimeOfDay(17.6 + Math.sin(G.t * 0.01) * 0.2);
  if (CITY.def && TRAFFIC.carMesh) { HELI.x = HELI.x || 0; updateTraffic(dt); }
  const S = CITY.size || 500, a = G.t * 0.05;
  const cx = S / 2 + Math.cos(a) * S * 0.6, cz = S / 2 + Math.sin(a) * S * 0.6;
  placeCam(cx, 110, cz, S / 2, 10, S / 2);
  updateSky(); nightLights(); updateFX(dt);
  AUDIO.update(dt);
  if (draw) R.renderer.render(R.scene, R.camera);
}

// ---------- the debug hook ----------
function installDebug() {
  const step = 1 / 30;
  const CC = {
    G, R, CAM, CITY, HELI, PILOT, GEAR, FIRE, TRAFFIC, UI, HUD, Input, OPTS, CALL, CALLS, HELIS, CITIES, FX, AUDIO, MUSIC,
    get C() { return G.target; },
    f: { startCity, startCall, finishCall, buildCity, spawnHeli, selectEquip, useEquip, exitHeli, enterHeli, igniteBuilding, burnDown, openHangar, hangarTab, buyService, buyHeli, buyUpgrade, switchHeli, setTimeOfDay, setRes, megaphone, dropCanister, damageHeli, surfaceY, roofBelow, terrainH, isWaterAt, nearestPad, cycleCam, collectToken, promote, saveGame, loadCareer, newCareer, showTitle, leaveCity, roadSpot, ladderTip, board, cycleTarget, MUSIC },
    // start({ city, heli, hour, money, free, dispatch, flight }) — a throwaway career (never saved), no calls until asked
    start(o = {}) {
      G.noSave = true; G.live = false;
      G.career = newCareer();
      for (const c of CITIES) G.career.cities[c.id].unlocked = true;
      if (o.money !== undefined) G.career.money = o.money;
      if (o.heli) G.career.owned.push(o.heli);
      OPTS.voice = false; OPTS.tips = false;
      if (o.flight) OPTS.flight = o.flight;
      startCity({ city: o.city || 'dover', heli: o.heli || 'sparrow', free: !!o.free, hour: o.hour !== undefined ? o.hour : 11, dispatch: !!o.dispatch, quiet: true });
      return CC.stats();
    },
    sim(sec, s = step) { const n = Math.round(sec / s); for (let i = 0; i < n; i++) frame(s, false); return CC.stats(); },
    render() { R.renderer.render(R.scene, R.camera); },
    press(a) { Input.acts.add(a); frame(step, false); },
    // put the helicopter at (x, z), alt metres above whatever is below; alt 0 lands it
    tp(x, z, alt = 30, yaw) {
      const s = surfaceY(x, z, alt === 0 ? 1e9 : 1e9);
      Object.assign(HELI, { x, z, y: s + alt, vx: 0, vy: 0, vz: 0, landed: alt === 0, engine: alt > 0, rpm: alt > 0 ? 1 : 0 });
      if (yaw !== undefined) HELI.yaw = yaw;
      HELI.surf = s; HELI.pad = alt === 0 ? padAt(x, s, z) : null;
      updateHeliModel(0); CAM.snap = true; frame(step, false);
      return CC.stats();
    },
    // fly with the autopilot until there, or the time runs out
    fly(x, z, alt = 50, o = {}) { G.ap = { x, z, alt, land: !!o.land }; const max = o.max || 120; let t = 0; while (t < max) { CC.sim(0.5); t += 0.5; if (o.land ? HELI.landed && dist(HELI.x, HELI.z, x, z) < 14 : dist(HELI.x, HELI.z, x, z) < 10) break; } G.ap = null; return CC.stats(); },
    hold(inp, sec) { G.inp = inp; CC.sim(sec); G.inp = null; return CC.stats(); },
    call(type, o = {}) { return startCall(type, Object.assign({ target: true }, o)); },
    hideHUD(on = true) { document.body.classList.toggle('nohud', on); },
    god(on = true) { G.god = on; },
    stats() {
      const H = HELI;
      return { city: CITY.def && CITY.def.id, where: G.where, x: +H.x.toFixed(1), y: +H.y.toFixed(1), z: +H.z.toFixed(1), agl: +(H.y - H.surf).toFixed(1), v: +speedH().toFixed(1), landed: H.landed, pad: H.pad && H.pad.kind, hp: Math.round(H.hp), fuel: Math.round(H.fuel), water: Math.round(H.bucket.water), seats: H.seats.map((s) => s.kind), calls: G.calls.map((c) => c.type + ':' + c.state), target: G.target && G.target.type, stage: G.target && G.target.stage, fires: FIRE.list.length, money: G.career && G.career.money, done: G.stats.done, failed: G.stats.failed, hour: +G.hour.toFixed(2), crashed: H.crashed };
    },
  };
  G.dmgLog = [];
  bus.on('damage', (n, why) => { G.dmgLog.push(why + ':' + n.toFixed(1)); if (G.dmgLog.length > 30) G.dmgLog.shift(); });
  window.CC = CC;
}

boot();
