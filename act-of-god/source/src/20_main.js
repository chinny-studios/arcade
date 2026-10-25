// Act of God — start-up, making a city, the frame loop and the #debug hook (window.AG)

let LAST = 0;
G.frame = 0;

function newCity(seed) {
  $('#gen').hidden = false;
  // let the overlay paint before the work starts
  setTimeout(() => { makeCity(G.sizeKey, seed === undefined ? (Math.random() * 1e9) | 0 : seed); $('#gen').hidden = true; }, 30);
}
function makeCity(sizeKey, seed) {
  cleanupEffects();
  generateWorld(sizeKey, seed);
  paintGround();
  buildTerrain();
  buildWater();
  buildRenderables();
  buildHash();
  resetSim();
  buildTraffic();
  if (FX.add) clearFx();
  camReset();
  G.hour = 7 + Math.random() * 8; G.t = 0;
  initNews();
  if (G.state === 'title') { CAM.orbit = true; titleInfo(); }
  flushBatches();
}
function cleanupEffects() {
  for (const e of G.effects) for (const k of ['funnel', 'dome', 'm', 'glow']) if (e[k] && e[k].isObject3D) { R.scene.remove(e[k]); if (e[k].material) e[k].material.dispose(); }
  G.effects = [];
}
function beginPlay() {
  G.state = 'play';
  document.body.dataset.state = 'play';
  CAM.orbit = false;
  $('#title').hidden = true;
  G.stats.mood = 68;
  if (!G.seenHelp && !DEBUG) { G.seenHelp = true; $('#help').hidden = false; G.state = 'menu'; }
  push([`${NEWS.outlet}: a quiet ${G.hour < 12 ? 'morning' : G.hour < 18 ? 'afternoon' : 'evening'} in ${W.name}`, 'Nothing out of the ordinary to report'], 'filler');
}
function toTitle() {
  G.state = 'title';
  document.body.dataset.state = 'title';
  $('#title').hidden = false;
  selectPower(null);
  newCity();
}

// ---------- the frame ----------
function step(dt, real) {
  const sdt = G.paused ? 0 : dt * G.speed;
  G.frame++;
  if (sdt > 0) {
    G.t += sdt;
    G.hour += sdt / HOUR_SEC;
    G.day = Math.floor(G.hour / 24);
    U.uTime.value += sdt;
    G.quake = 0;
    holdCast(sdt);
    G.effects = G.effects.filter((e) => { e.t += sdt; return e.update(sdt) !== false; });
    simUpdate(sdt);
    waterUpdate(sdt);
    G.hzT = (G.hzT || 0) + sdt;
    if (G.hzT >= 0.25) { hazardPass(G.hzT); G.hzT = 0; }
    G.newsT = (G.newsT || 0) + sdt;
    if (G.newsT >= 1) { G.newsT = 0; if (G.state === 'play' || G.state === 'menu') newsTick(); }
    updateTraffic(sdt);
    updateDebris(sdt);
    FX.add.update(sdt); FX.smoke.update(sdt); FX.fine.update(sdt);
    updateFxMeshes(sdt);
  }
  const [storm, rain, snow] = stormCover();
  G.storm = damp(G.storm || 0, storm, 0.8, real);
  updateRain(sdt, G.paused ? 0 : rain);
  updateSky(G.hour, G.storm, W.gen.biome);
  camUpdate(real);
  if (!INP.touches.size || G.power) updateCursorPick();
  const p = G.power && PW[G.power];
  const showCur = G.state === 'play' && !!p && G.cursor.ok && (!document.body.classList.contains('touch') || INP.touches.size > 0);
  if (p) {
    const r = p.ring ? p.ring(brushR(p)) : brushR(p);
    if (p.mode === 'line' && INP.lineA) {
      const L = dist(INP.lineA.x, INP.lineA.z, G.cursor.x, G.cursor.z);
      updateCursor((INP.lineA.x + G.cursor.x) / 2, (INP.lineA.z + G.cursor.z) / 2, Math.max(r, L / 2), 0xe8c46a, showCur);
    } else updateCursor(G.cursor.x, G.cursor.z, r, p.side === 'wrath' ? 0xff5a40 : 0xffd878, showCur);
  } else updateCursor(0, 0, 1, 0, false);
  G.flushT = (G.flushT || 0) + real;
  if (G.flushT > 0.2) { G.flushT = 0; terrainFlush(); }
  ovFlush(real);
  flushBatches();
  AUDIO.update(real);
  if (G.state === 'play' || G.state === 'menu') hudUpdate(real);
}
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.min(0.05, (now - LAST) / 1000 || 0.016);
  LAST = now;
  if (!W.def) return;
  step(real, real);
  R.renderer.render(R.scene, R.camera);
}

function boot() {
  try { initRender(); } catch (e) { console.error(e); return; }
  makeShapes();
  initFx();
  initUI();
  initInput();
  document.body.dataset.state = 'title';
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  makeCity(G.sizeKey, (Math.random() * 1e9) | 0);
  requestAnimationFrame(frame);
  if (DEBUG) window.AG = debugHook();
}

// ---------- #debug ----------
function debugHook() {
  return {
    G, W, SIM, CAM, WATER, PW, POWERS, R, U, TR, NEWS, FX, BAT,
    // start({ size, seed, hour }) makes a city and starts play
    start(o = {}) {
      G.state = 'title';
      makeCity(o.size || 'city', o.seed === undefined ? 1234 : o.seed);
      beginPlay();
      $('#help').hidden = true; G.state = 'play';
      if (o.hour !== undefined) G.hour = o.hour;
      return { name: W.name, pop: W.popCap, buildings: W.buildings.length, trees: W.trees.length, edges: W.edges.length, water: W.gen.water, relief: W.gen.relief, biome: W.gen.biome };
    },
    // fast-forward without drawing
    sim(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) step(dt, dt); return this.stats(); },
    render() { R.renderer.render(R.scene, R.camera); },
    cast(id, x, z, size = 0.5, o = {}) { const p = PW[id]; G.size = size; p.cast(x, z, brushR(p, size), o); return brushR(p, size); },
    look(x, z, d = 600, pitch = 0.7, yaw) { CAM.tx = x; CAM.tz = z; CAM.dist = d; CAM.pitch = pitch; if (yaw !== undefined) CAM.yaw = yaw; CAM.ty = heightAt(x, z); camUpdate(0.016); },
    centre() { const c = W.gen.centers[0]; return { x: c.x, z: c.z }; },
    stats() { const S = G.stats; return { pop: S.pop, dead: S.dead, injured: Math.round(S.injured), destroyed: S.destroyed, burning: S.burning, damage: Math.round(S.damage), mood: Math.round(S.mood), infected: Math.round(S.infected), fx: FX.add.alive + FX.smoke.alive + FX.fine.alive, effects: G.effects.map((e) => e.type) }; },
    select: (id) => selectPower(id), side: (s) => setSide(s), hideHUD: () => document.body.classList.add('nohud'),
    pick: (sx, sy) => pickGround(sx, sy, true),
    news: () => NEWS.items.map((i) => i.h + ' — ' + i.s),
  };
}
boot();
