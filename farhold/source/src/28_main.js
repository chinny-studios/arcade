// Farhold — boot, title screen, new game (the crash), main loop, adaptive quality, #debug hook

const G = { state: 'boot', time: 0, frame: 0, paused: false, seedText: '', god: false, free: false, noSave: false, titleSys: null };
const clock = { last: performance.now(), fpsT: 0, fpsN: 0, fps: 60, lowT: 0, playT: 0 };

function boot() {
  if (!initRender()) { document.getElementById('nogl').hidden = false; document.getElementById('title').hidden = true; return; }
  TERRAIN_POOL.init();
  HUD.init(); FX.init(); initTool(); makeIcons();
  PLAYER.rig = makeSuitRig(); PLAYER.rig.root.visible = false;
  GALAXY.visited = new Set(); GALAXY.stationsVisited = new Set();
  initTitle();
  requestAnimationFrame(frame);
  if (DEBUG) setupDebug();
  bus.on('lock', (locked) => { const c = document.getElementById('clickToPlay'); if (c) c.hidden = locked || G.state !== 'play' || !!UI.cur; });
  document.getElementById('clickToPlay').onclick = () => { AU.resume(); Input.lock(); };
  addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') SAVE.save('auto'); });
}

// ---------- title: a planet turning slowly behind the menu ----------
function initTitle() {
  G.state = 'title'; document.body.dataset.state = 'title';
  const seed = (Math.random() * 1e9) | 0;
  genGalaxy(seed);
  const star = GALAXY.stars[1 + (seed % (GALAXY.stars.length - 1))];
  const S = loadSystem(star);
  G.titleSys = S;
  const pl = S.planets.find((p) => p.atmo && p.P.sea != null) || S.planets[0];
  G.titlePl = pl;
  const $t = document.getElementById('title');
  $t.hidden = false;
  const cont = document.getElementById('btnContinue');
  const sv = SAVE.load();
  cont.hidden = !sv;
  if (sv) cont.querySelector('small').textContent = (sv.player.name || 'Traveller') + ' · ' + new Date(sv.t).toLocaleString();
  cont.onclick = () => { AU.init(); AU.resume(); startGame({ cont: true }); };
  document.getElementById('btnNew').onclick = () => { AU.init(); AU.resume(); document.getElementById('mainMenu').hidden = true; document.getElementById('newPanel').hidden = false; document.getElementById('seedIn').value = NAMEGEN.word(RNG(Math.random() * 1e9 | 0), 2) + '-' + ((Math.random() * 900 | 0) + 100); };
  document.getElementById('btnBegin').onclick = () => startGame({ cont: false, name: document.getElementById('nameIn').value.trim() || 'Traveller', seed: document.getElementById('seedIn').value.trim() || 'farhold' });
  document.getElementById('btnBack').onclick = () => { document.getElementById('newPanel').hidden = true; document.getElementById('mainMenu').hidden = false; };
  document.getElementById('btnSettings').onclick = () => { const p = document.getElementById('titlePanel'); p.innerHTML = '<h3>Settings</h3>' + settingsHtml() + '<button class="btn" id="tpClose">Close</button>'; p.hidden = false; for (const r of p.querySelectorAll('input, select')) r.oninput = r.onchange = () => UI.setting(r.dataset.k, r); document.getElementById('tpClose').onclick = () => (p.hidden = true); };
  document.getElementById('btnControls').onclick = () => { const p = document.getElementById('titlePanel'); p.innerHTML = '<h3>Controls</h3>' + controlsHtml() + '<button class="btn" id="tpClose">Close</button>'; p.hidden = false; document.getElementById('tpClose').onclick = () => (p.hidden = true); };
  for (const i of document.querySelectorAll('#title input')) { i.onfocus = () => Input.setTyping(true); i.onblur = () => Input.setTyping(false); }
}
function titleCamera(dt) {
  const pl = G.titlePl; if (!pl) return;
  G.time += dt;
  updatePlanetSpin(pl, dt);
  const a = G.time * 0.02;
  const toStar = pl.pos.clone().negate().normalize();
  const side = new V3().crossVectors(toStar, UP).normalize();
  const cam = pl.pos.clone().addScaledVector(toStar.clone().applyAxisAngle(UP, 0.9 + Math.sin(a) * 0.2), pl.R * 2.6).addScaledVector(UP, pl.R * 0.4);
  R.camera.position.copy(cam);
  R.camera.up.set(0, 1, 0);
  R.camera.lookAt(pl.pos.clone().addScaledVector(side, pl.R * 0.9));
  void side;
  const camLocal = toLocal(planetFrame(pl), cam);
  updatePlanetLOD(pl, camLocal, 4);
  updateEnvironment(dt, cam);
  WATER_T.value += dt;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function startGame(opts) {
  const $l = document.getElementById('loading'), bar = $l.querySelector('i'), txt = $l.querySelector('.t');
  document.getElementById('mainMenu').hidden = true; document.getElementById('newPanel').hidden = true;
  $l.hidden = false;
  const step = async (p, t) => { bar.style.width = (p * 100) + '%'; txt.textContent = t; await wait(30); };
  const save = opts.cont ? SAVE.load() : null;
  if (opts.cont && !save) opts.cont = false;
  await step(0.1, 'Charting the galaxy…');
  unloadSystem();
  resetWorldState();
  if (save) {
    await step(0.3, 'Restoring your journey…');
    try { applySave(save); } catch (e) { console.error(e); alert('That save could not be loaded; starting a new journey.'); opts.cont = false; resetWorldState(); newGame({ name: 'Traveller', seed: 'farhold' }); }
  } else newGame(opts);
  await step(0.5, 'Raising the land…');
  // stream the surroundings in before the first frame
  TERRAIN_POOL.forceSync = true;
  for (let i = 0; i < 40; i++) { if (!streamWorld(1 / 30, 60)) break; if (i % 5 === 0) await step(0.5 + i / 90, 'Raising the land…'); }
  TERRAIN_POOL.forceSync = false;
  await step(1, 'Waking up…');
  document.getElementById('title').hidden = true;
  $l.hidden = true;
  G.state = 'play'; document.body.dataset.state = 'play';
  clock.playT = 0;
  AU.resume();
  Input.lock();
  if (!save) {
    HUD.banner(planetDisplayName(PLAYER.frame.pl), '');
    setTimeout(() => SOLA_say('wake'), 1800);
  } else { HUD.banner(SYS.cur.name, ''); }
  setTimeout(() => { if (!Input.locked && !UI.cur) document.getElementById('clickToPlay').hidden = false; }, 600);
  if (window.FH) window.FH.ready = true;
}
function resetWorldState() {
  natReset(); faunaReset(); POIS_reset(); SENT.clear(); PIRATES.clear(); clearShots(); clearProjectiles(); clearTraffic(); clearAsteroids(); clearStation();
  COLL.clear();
  for (const g of GRAVES.markers) g.m.parent && g.m.parent.remove(g.m);
  GRAVES.markers = [];
  WEATHER.reset();
}
function newGame(opts) {
  G.seedText = opts.seed; G.time = 0;
  genGalaxy(strSeed(opts.seed));
  GALAXY.visited = new Set(); GALAXY.stationsVisited = new Set(); GALAXY.target = null;
  const P = PLAYER;
  P.name = opts.name; P.units = 1200; P.nanites = 0;
  P.suit = new Inv(24, 1, 'Exosuit');
  P.stats = { life: 45, haz: 70, shield: 100, hp: 100, jet: 100, stam: 100 };
  techInit();
  P.known = new Set(Object.keys(TECH).filter((id) => TECH[id].nan === 0));
  P.lore = []; P.graves = []; P.alive = true;
  P.suit.add('carbon', 25);
  QUEST.step = 0; QUEST.flags = { jumps: 0 };
  DISC.planets = {}; NAT.removed = new Map(); POIS.done = new Set(); BASES.list = [];
  const ship = makeShipData('shuttle', strSeed(opts.seed) + 5);
  ship.lift = 0; ship.pulse = 40; ship.cargo.add('tritium', 50);
  setShip(ship);
  const star = GALAXY.start;
  arriveSystem(star);
  const pl = SYS.cur.planets[0], f = planetFrame(pl), crash = pl.crash;
  // the ship sits on the crash site, a bit tilted
  const sUp = crash.dir.clone();
  const sPos = sUp.clone().multiplyScalar(pl.R + surfaceH(pl, sUp));
  const sQ = basisQuat(sUp, perpOf(sUp).applyAxisAngle(sUp, crash.yaw), new Q4());
  placeShip(f, sPos, sQ, 'landed');
  // and we wake up a short walk away
  const away = perpOf(sUp).applyAxisAngle(sUp, crash.yaw + 2.2);
  let pDir = sUp.clone().addScaledVector(away, 130 / pl.R).normalize();
  for (let t = 0; t < 12 && pl.P.sea != null && surfaceH(pl, pDir) < pl.P.sea + 1; t++) pDir = sUp.clone().addScaledVector(away.applyAxisAngle(sUp, 0.5), 130 / pl.R).normalize();
  const pPos = pDir.clone().multiplyScalar(pl.R + surfaceH(pl, pDir) + 0.1);
  P.inShip = false;
  placePlayer(f, pPos, sPos.clone().sub(pPos));
  discEntry(pl).visited = true;
  SAVE.wipe();
}
// terrain, flora and POIs around the focus; returns work remaining
function streamWorld(dt, budget) {
  const f = PLAYER.inShip ? SHIP.frame : PLAYER.frame;
  const camW = PLAYER.inShip ? shipWorldPos(new V3()) : toWorld(PLAYER.frame, PLAYER.pos, new V3());
  let work = 0;
  for (const pl of PLANETS.list) {
    const camL = toLocal(planetFrame(pl), camW, new V3());
    const d = camL.length();
    work += updatePlanetLOD(pl, camL, d < pl.R * 6 ? budget : 2);
  }
  if (f && f.kind === 'planet') {
    const loc = PLAYER.inShip ? SHIP.pos : PLAYER.pos;
    work += updateNature(f.pl, loc, Math.max(1, budget / 10), true);
    POIS.t = 0; updatePOIs(dt, f.pl, loc);
  }
  return work + TERRAIN_POOL.busy;
}

// ---------- main loop ----------
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - clock.last) / 1000; clock.last = now;
  if (dt > 0.1) dt = 0.1;
  clock.fpsT += dt; clock.fpsN++;
  if (clock.fpsT >= 1) { clock.fps = clock.fpsN / clock.fpsT; clock.fpsT = 0; clock.fpsN = 0; if (DEBUG) HUD.fps(Math.round(clock.fps) + ' fps · ' + R.renderer.info.render.calls + ' calls · ' + Math.round(R.renderer.info.render.triangles / 1000) + 'k tris'); adaptQuality(); }
  Input.poll();
  if (G.state === 'title') { titleCamera(dt); R.renderer.render(R.scene, R.camera); }
  else if (G.state === 'play') step(dt, true);
  Input.endFrame();
}
const _camW = new V3();
function step(dt, render) {
  G.frame++;
  const P = PLAYER;
  UI.tick(dt);
  const paused = UI.cur === 'pause';
  if (!paused) {
    G.time += dt;
    WIND.t.value += dt; WATER_T.value += dt;
    for (const pl of PLANETS.list) updatePlanetSpin(pl, dt);
    const warping = updateWarp(dt);
    if (!warping) {
      updatePlayer(dt);
      updateShip(dt);
      updateWarpInput(dt);
      updateTool(dt);
      updateBuild(dt);
      updateInteract(dt);
      updateShots(dt);
      updatePirates(dt);
      updateTraffic(dt);
      updateSentinels(dt);
      const f = P.inShip ? SHIP.frame : P.frame;
      const pl = f && f.kind === 'planet' ? f.pl : null;
      updateFauna(dt, pl, P.inShip ? SHIP.pos : P.pos, !P.inShip);
      updateSurvival(dt);
      updateBases(dt);
      QUEST.update();
      if (STATION.refiner) refinerTick(STATION.refiner, dt);
      if (G.time - SAVE.last > 240) SAVE.save('auto');
    }
    if (!WARP.active || WARP.t < 1.6) { if (P.inShip) updateShipCamera(dt); else if (P.alive || !P.inShip) updateFootCamera(dt); }
  }
  R.camera.updateMatrixWorld();
  _camW.copy(R.camera.position);
  // world streaming
  if (!WARP.active) {
    for (const pl of PLANETS.list) {
      const camL = toLocal(planetFrame(pl), _camW, new V3());
      updatePlanetLOD(pl, camL, camL.length() < pl.R * 6 ? 6 : 1);
    }
    const f = P.inShip ? SHIP.frame : P.frame;
    const pl = f && f.kind === 'planet' ? f.pl : null;
    const loc = P.inShip ? SHIP.pos : P.pos;
    updateNature(pl, pl ? loc : new V3(), 1);
    updatePOIs(dt, pl, loc);
  }
  updateEnvironment(dt, P.inShip ? shipWorldPos(new V3()) : _camW);
  FX.setFrame(P.inShip ? SHIP.frame : P.frame);
  FX.update(dt);
  updateLights();
  AU.update(dt);
  const ic = INTERACT.cur;
  HUD.setPrompt(!UI.cur && ic && ic.prompt ? fillKeys(ic.prompt) : BUILD.active ? buildPrompt() : '', ic && ic.hold ? INTERACT.holdT / ic.hold : 0);
  HUD.update(dt);
  if (render) R.renderer.render(R.scene, R.camera);
}
function buildPrompt() { return '<b>' + PARTS[BUILD.part].name + '</b>' + (BUILD.why ? ' · <span class="bad">' + BUILD.why + '</span>' : '') + ' · <kbd>' + keyLabel('fire') + '</kbd> place · <kbd>' + keyLabel('rotate') + '</kbd> rotate · <kbd>' + keyLabel('cancel') + '</kbd> done' + (BUILD.target ? ' · <kbd>' + keyLabel('dismantle') + '</kbd> dismantle ' + PARTS[BUILD.target.part.id].name : ''); }
function updateLights() {
  const P = PLAYER;
  R.torch.intensity = P.torch && !P.inShip ? 1.6 : 0;
  const src = [];
  for (const l of baseLightSources()) src.push({ p: toWorld(planetFrame(l.pl), l.local), i: l.i * (0.4 + ENV.night), c: l.c, r: 18 });
  for (const l of poiLightSources()) src.push({ p: toWorld(planetFrame(l.pl), l.local), i: 0.9 * (0.3 + ENV.night), c: 0xffe0b0, r: 16 });
  if (STATION.obj) for (const l of STATION.lights) src.push({ p: toWorld(STATION.frame, l), i: 1.2, c: 0xfff0e0, r: 60 });
  updateLightPool(src);
}
function adaptQuality() {
  if (!SETTINGS.autoQ || G.state !== 'play' || UI.cur || document.hidden || WARP.active) return;
  clock.playT++;
  if (clock.playT < 15) return;
  if (clock.fps < 26) clock.lowT++; else clock.lowT = 0;
  if (clock.lowT >= 5 && SETTINGS.quality > 0) {
    clock.lowT = 0; SETTINGS.quality--; applyQuality(); saveSettings();
    HUD.msg('Lowering graphics quality for smoother play.');
  }
}
// start over in a fresh galaxy, keeping inventory, ship, technology and discoveries
function newGalaxy() {
  const seed = G.seedText + '+';
  G.seedText = seed;
  genGalaxy(strSeed(seed));
  GALAXY.visited = new Set(); GALAXY.stationsVisited = new Set(); GALAXY.target = null;
  BASES.list = [];
  QUEST.step = QUEST.steps.length - 1; QUEST.flags.jumps = 0;
  resetWorldState();
  arriveSystem(GALAXY.start);
  HUD.banner('A new galaxy', 'win');
  SAVE.save('galaxy');
}

// ---------- debug hook ----------
function setupDebug() {
  window.FH = {
    ready: false, G, P: PLAYER, SHIP, SYS, PLANETS, GALAXY, NAT, FAUNA, SENT, WANTED, QUEST, INV, R, Input, UI, SAVE, STATION, PIRATES, BASES, BUILD, TOOL, HUD, DISC, ENV, COLL, K,
    start(o = {}) { return startGame(Object.assign({ cont: false, name: 'Tester', seed: 'test' }, o)); },
    sim(seconds, dt = 1 / 30) { const n = Math.round(seconds / dt); for (let i = 0; i < n; i++) { Input.poll(); step(dt, false); Input.endFrame(); } },
    stream(n = 30) { TERRAIN_POOL.forceSync = true; for (let i = 0; i < n; i++) if (!streamWorld(1 / 30, 80)) break; TERRAIN_POOL.forceSync = false; },
    render() { R.renderer.render(R.scene, R.camera); },
    give(id, n = 1) { return giveItem(id, n); },
    god(v = true) { G.god = v; }, free(v = true) { G.free = v; },
    press(code, frames = 1) { Input.press(code); for (let i = 0; i < frames; i++) { step(1 / 30, false); Input.endFrame(); } Input.release(code); step(1 / 30, false); Input.endFrame(); },
    hold(code, seconds) { Input.press(code); const n = Math.round(seconds * 30); for (let i = 0; i < n; i++) { step(1 / 30, false); Input.endFrame(); } Input.release(code); step(1 / 30, false); Input.endFrame(); },
    click(btn = 0, seconds = 0.1) { Input.m.b[btn] = true; Input.m.hit[btn] = true; const n = Math.max(1, Math.round(seconds * 30)); for (let i = 0; i < n; i++) { step(1 / 30, false); Input.m.hit[btn] = false; } Input.m.b[btn] = false; Input.m.up[btn] = true; step(1 / 30, false); Input.endFrame(); },
    look(dx, dy) { Input.m.dx = dx; Input.m.dy = dy; },
    // face a planet-local point on foot
    aimAt(local) { const P = PLAYER; const up = playerUp(new V3()); const eye = P.pos.clone().addScaledVector(up, P.eye); const d = local.clone().sub(eye); const h = d.clone().addScaledVector(up, -d.dot(up)); basisQuat(up, h.normalize(), P.q); P.pitch = Math.asin(clamp(d.normalize().dot(up), -1, 1)); updateFootCamera(0); },
    tpPlanet(i, lat, lon) { const pl = SYS.cur.planets[i]; const d = new V3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)); PLAYER.inShip = false; placePlayer(planetFrame(pl), d.clone().multiplyScalar(pl.R + surfaceH(pl, d) + 0.2), null); this.stream(); },
    nearest(kind) { let b = null, bd = 1e9; for (const o of NAT.near) { if (!o.alive || o.sp.kind !== kind) continue; const d = o.pos.distanceTo(PLAYER.pos); if (d < bd) { bd = d; b = o; } } return b; },
    PROJ, CAM, f: { makeShipObject, makeStation, shipChangeFrame, updateFootCamera, updateShipCamera, boardShip, exitShip, tryTakeoff, tryLand, startDock, dockInstant, arriveSystem, engageWarp, spawnPirates, spawnSentinel, discover, craft, recharge, repairTech, buildTech, placePart, startPlacing, natDamage, natPick, toolRaycast, terrainRaycast, surfaceH, planetFrame, toWorld, toLocal, shipWorldPos, damagePlayer, killPlayer, teleportTo, warpCheck, bestHopToward, newGalaxy, applySave, streamWorld, planetFlora, planetFauna, spawnCreature, WEATHER, POIS, claimWreck },
    stats() { const i = R.renderer.info.render; return { calls: i.calls, tris: i.triangles, fps: clock.fps, chunks: PLANETS.list.map(planetChunkCount), cells: NAT.cells.size, fauna: FAUNA.live.length }; },
    mute() { if (!AU.muted) AU.toggleMute(); },
  };
}

boot();
