// Roma Aeterna — boot, world build, the main loop, discovery, travel, saving, adaptive quality and the #debug hook

const G = { state: 'title', time: 0, hour: 7.5, day: 1, frame: 0, readCount: 0, ff: false, touchFF: false, autoQ: true, noPause: false, placeT: 0, here: null };
const clock = { last: performance.now(), fpsT: 0, fpsN: 0, fps: 60, lowT: 0, startT: 0 };
const START = { u: 40, v: 9, yaw: 60 * D2R };

const SAVE = {
  key: 'roma-aeterna.save',
  save() {
    if (G.state !== 'play') return;
    const d = { v: 1, x: PL.x, y: PL.y, z: PL.z, yaw: PL.yaw, hour: G.hour, day: G.day,
      found: W.places.filter((p) => p.found).map((p) => p.id), read: W.placards.filter((p) => p.read).map((p) => p.id) };
    try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e) { /* ignore */ }
  },
  load() { try { const d = JSON.parse(localStorage.getItem(this.key) || 'null'); return d && d.v === 1 ? d : null; } catch (e) { return null; } },
  wipe() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } },
};

function boot() {
  if (!initRender()) { $('#nogl').hidden = false; $('#title').hidden = true; return; }
  G.autoQ = SETTINGS.quality === 'auto';
  if (!G.autoQ) applyQuality(SETTINGS.quality);
  HUD.init();
  AU.init();
  const save = SAVE.load();
  $('#bContinue').hidden = !save;
  $('#bBegin').onclick = () => startGame({ cont: false });
  $('#bContinue').onclick = () => startGame({ cont: true });
  document.body.dataset.state = 'title';
  requestAnimationFrame(frame);
  if (DEBUG) setupDebug();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let WORLD_BUILT = false;
async function buildWorld(step) {
  if (WORLD_BUILT) return;
  await step(0.03, 'Surveying the seven hills…');
  initHeights();
  K.closeRaised = true;
  await step(0.12, 'Raising the Forum…');
  buildForum();
  await step(0.22, 'Raising the temples of the Capitol and the Palatine…');
  buildCapitolPalatine();
  await step(0.32, 'Raising the Colosseum and the Circus…');
  buildArenas();
  await step(0.42, 'Raising the imperial fora…');
  buildFora();
  await step(0.5, 'Raising the Campus Martius…');
  buildCampus();
  buildRiver();
  buildGates();
  await step(0.58, 'Building the Subura…');
  buildSubura();
  await step(0.64, 'Building the neighbourhoods…');
  buildCity();
  await step(0.74, 'Laying the Via Appia…');
  buildAppia();
  await step(0.8, 'Founding Bovillae…');
  buildTown();
  await step(0.85, 'Planting pines and cypresses…');
  buildNature();
  await step(0.9, 'Firing the roof tiles…');
  K.closeRaised = false;
  W.navOff = pruneNav();
  finalizeWorld();
  buildTerrain();
  HUD.buildMap();
  NPC.init();
  WORLD_BUILT = true;
}

async function startGame(opts) {
  const $l = $('#loading'), bar = $l.querySelector('i'), txt = $l.querySelector('.t');
  $('#menu').hidden = true; $l.hidden = false;
  const step = async (p, t) => { bar.style.width = (p * 100) + '%'; txt.textContent = t; await wait(20); };
  await buildWorld(step);
  const save = opts.cont ? SAVE.load() : null;
  if (save) {
    for (const p of W.places) p.found = save.found.includes(p.id);
    for (const p of W.placards) p.read = save.read.includes(p.id);
    G.hour = save.hour; G.day = save.day || 1;
    placePlayer(save.x, save.z, save.yaw, save.y);
  } else {
    for (const p of W.places) p.found = false;
    for (const p of W.placards) p.read = false;
    G.hour = 7.6; G.day = 1;
    placePlayer(FF.wx(START.u, START.v), FF.wz(START.u, START.v), START.yaw);
    SAVE.wipe();
  }
  await step(0.95, 'Filling the streets…');
  NPC.reset(); NPC.fill();
  updateSky(0); updateCamera(); updateCells(PL.x, PL.z);
  try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* ignore */ }
  await step(1, 'Ave!');
  $('#title').hidden = true;
  G.state = 'play'; document.body.dataset.state = 'play';
  clock.startT = performance.now();
  AU.resume();
  Input.lock();
  HUD.where('Forum Romanum', 'The Roman Forum');
  if (!save) {
    setTimeout(() => HUD.banner('Roma', 'Rome, in the ninth year of Hadrian', 'AD 125 · the second hour of the day'), 600);
    setTimeout(() => HUD.msg(Input.touch.on ? 'Left thumb to walk, drag right to look. ✦ talks to people and reads placards.' : 'WASD to walk, Shift to run, E to talk or read, M for the map. Hold T to let time pass.'), 2500);
  }
  if (DEBUG && window.RA) window.RA.ready = true;
}

// where to put the player when travelling to a place: its spawn point, or a clear spot on its edge looking in
function spawnFor(p) {
  const s = p.spawn || [p.x, p.z + p.r * 0.55];
  const [x, z] = clearNear(s[0], s[1]);
  return [x, z, p.spawnYaw != null ? p.spawnYaw : Math.atan2(-(p.x - x), -(p.z - z))];
}
function travelTo(p) {
  const fade = $('#fade'); fade.classList.add('on');
  setTimeout(() => {
    const [x, z, yaw] = spawnFor(p);
    placePlayer(x, z, yaw);
    G.hour = (G.hour + 0.4) % 24;
    NPC.reset(); NPC.fill();
    fade.classList.remove('on');
  }, 450);
}

// ---------- discovery ----------
function updatePlaces() {
  let here = null, hd = 1e9, district = null, dd = 1e9;
  for (const p of W.places) {
    const d = Math.hypot(PL.x - p.x, PL.z - p.z);
    if (d > p.r) continue;
    if (p.kind === 'district') { if (d / p.r < dd) { dd = d / p.r; district = p; } continue; }
    if (d / p.r < hd) { hd = d / p.r; here = p; }
    if (!p.found) {
      p.found = true;
      const total = W.places.filter((q) => q.kind !== 'district').length, n = W.places.filter((q) => q.found && q.kind !== 'district').length;
      HUD.banner(p.latin || p.name, p.name, `Found ${n} of ${total}`);
      AU.ui('found');
      SAVE.save();
    }
  }
  const show = here || district;
  if (show) HUD.where(show.name, show.latin);
  else if (G.here) HUD.where(urbanAt(PL.x, PL.z) > 0.5 ? 'Roma' : 'The Campagna', urbanAt(PL.x, PL.z) > 0.5 ? 'The city' : 'Ager Romanus');
  G.here = show || G.here;
}

// ---------- main loop ----------
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - clock.last) / 1000; clock.last = now;
  if (dt > 0.1) dt = 0.1;
  clock.fpsT += dt; clock.fpsN++;
  if (clock.fpsT >= 1) {
    clock.fps = clock.fpsN / clock.fpsT; clock.fpsT = 0; clock.fpsN = 0;
    if (DEBUG || SETTINGS.fps) $('#fps').textContent = Math.round(clock.fps) + ' fps · ' + R.renderer.info.render.calls + ' calls · ' + Math.round(R.renderer.info.render.triangles / 1000) + 'k tris · ' + NPC.count() + ' people';
    adaptQuality();
  }
  if (G.state === 'play') step(dt, true);
  Input.endFrame();
}
function step(dt, render) {
  G.frame++;
  Input.pollPad();
  const paused = HUD.open === 'pause' || HUD.open === 'map';
  if (!paused) {
    G.ff = (Input.down('KeyT') || G.touchFF) && !HUD.open;
    const rate = (G.ff ? 40 : 1) * SETTINGS.daySpeed / 60;
    G.hour += dt * rate;
    if (G.hour >= 24) { G.hour -= 24; G.day++; }
    HUD.key();
    updatePlayer(dt);
    NPC.update(G.ff ? Math.min(dt * 4, 0.25) : dt);
    G.placeT -= dt; if (G.placeT <= 0) { G.placeT = 0.4; updatePlaces(); }
    if (!HUD.open) findTarget(); else if (HUD.open !== 'dlg') PL.target = null;
    if (G.frame % 1800 === 0) SAVE.save();
  } else HUD.key();
  updateCamera();
  updateSky(dt);
  updateCells(PL.x, PL.z);
  updateMarkers(performance.now() / 1000);
  NPC.draw();
  AU.update(dt);
  HUD.update(dt);
  if (render) R.renderer.render(R.scene, R.camera);
}
function adaptQuality() {
  if (!G.autoQ || G.state !== 'play' || DEBUG) return;
  if (performance.now() - clock.startT < 8000) return;
  if (clock.fps < 26) { clock.lowT++; if (clock.lowT >= 3) { clock.lowT = 0; if (R.qname === 'high') applyQuality('med'); else if (R.qname === 'med') applyQuality('low'); } }
  else clock.lowT = 0;
}
addEventListener('beforeunload', () => SAVE.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) SAVE.save(); });

// ---------- debug hook ----------
function setupDebug() {
  G.noPause = true;
  const RA = window.RA = {
    G, PL, W, R, NPC, HUD, SKY, FF,
    f: { groundAt, surfaceAt, collideCircle, clearAt, nearestNode, urbanAt, FFw, updateSky, updateCells, step, travelTo, PLACARD_TEXT, LINES, JOBS, DIALOG, makePerson },
    async start(o = {}) {
      await startGame({ cont: !!o.cont });
      if (o.hour != null) G.hour = o.hour;
      return true;
    },
    sim(sec, dt = 1 / 30) { const n = Math.round(sec / dt); for (let i = 0; i < n; i++) { step(dt, false); Input.endFrame(); } },
    render() { updateCamera(); updateSky(0); updateCells(PL.x, PL.z); NPC.draw(); R.renderer.render(R.scene, R.camera); },
    tp(x, z, yaw) { placePlayer(x, z, yaw == null ? PL.yaw : yaw); NPC.reset(); NPC.fill(); },
    tpFF(u, v, yaw) { RA.tp(FF.wx(u, v), FF.wz(u, v), yaw); },
    go(id) { const p = W.places.find((q) => q.id === id); if (!p) return 'no place ' + id; const [x, z, yaw] = spawnFor(p); RA.tp(x, z, yaw); return [PL.x, PL.z]; },
    look(yaw, pitch = 0) { PL.yaw = yaw; PL.pitch = pitch; },
    lookAt(x, y, z) { const dx = x - PL.x, dy = y - (PL.y + PL.eye), dz = z - PL.z; PL.yaw = Math.atan2(-dx, -dz); PL.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
    cam(x, y, z, tx, ty, tz) { PL.free = true; PL.x = x; PL.y = y - PL.eye; PL.z = z; RA.lookAt(tx, ty, tz); },
    time(h) { G.hour = h; },
    free(on = true) { PL.free = on; },
    press(code) { Input.press(code); },
    async hold(code, s) { Input.press(code); RA.sim(s); Input.release(code); },
    places() { return W.places.map((p) => p.id); },
    audio() { AU.resume(); AU.update(0.1); AU.ui('found'); AU.step(1); AU.hoof(PL.x + 3, PL.z, 1); AU.bird(); return !!AU.ctx; },
    stats() { return { tris: R.renderer.info.render.triangles, calls: R.renderer.info.render.calls, solids: W.solids.length, nodes: W.nodes.length, edges: W.edges.length, navOff: W.navOff, meshes: W.meshes.length, npcs: NPC.count(), pos: [PL.x, PL.y, PL.z], hour: G.hour }; },
  };
}

boot();
