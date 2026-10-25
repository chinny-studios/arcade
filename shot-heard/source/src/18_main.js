// Shot Heard — the loop, cameras for the title and deploy screens, the gun and helm cameras, quality, boot,
// and the #debug test hook (window.SH).

// ---------- cameras ----------
const CINE = { t: 0, focus: new V3(), pos: new V3(0, 60, 80), look: new V3(), nextT: 0, a: 0, r: 70, h: 30 };
function pickCineFocus() {
  const M = MATCH;
  // the hottest flag, or a random one
  let best = null, bs = -1;
  for (const f of M.flags) { const sc = f.count[0] + f.count[1] + (f.contested ? 6 : 0) + Math.random() * 3; if (sc > bs) { bs = sc; best = f; } }
  if (!best) return;
  CINE.focus.set(best.x, heightAt(best.x, best.z) + 2, best.z);
  CINE.a = Math.random() * TAU; CINE.r = frand(45, 85); CINE.h = frand(14, 34);
  CINE.nextT = clock + frand(12, 18);
}
function cinematicCamera(dt, snap) {
  if (clock > CINE.nextT || snap) { pickCineFocus(); if (snap) CINE.pos.set(CINE.focus.x + Math.cos(CINE.a) * CINE.r, CINE.focus.y + CINE.h, CINE.focus.z + Math.sin(CINE.a) * CINE.r); }
  CINE.a += dt * 0.045;
  const tx = CINE.focus.x + Math.cos(CINE.a) * CINE.r, tz = CINE.focus.z + Math.sin(CINE.a) * CINE.r;
  const ty = Math.max(heightAt(tx, tz) + 6, CINE.focus.y + CINE.h);
  const k = 1 - Math.exp(-dt * 0.6);
  CINE.pos.x = lerp(CINE.pos.x, tx, k); CINE.pos.y = lerp(CINE.pos.y, ty, k); CINE.pos.z = lerp(CINE.pos.z, tz, k);
  CINE.look.lerp(CINE.focus, 1 - Math.exp(-dt * 1.2));
  camera.position.copy(CINE.pos);
  camera.lookAt(CINE.look);
  camera.fov = SET.fov; camera.updateProjectionMatrix();
}
function gunCamera(c) {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -Math.cos(c.yaw), rz = Math.sin(c.yaw);
  camera.position.set(c.pos.x - fx * 4.6 - rx * 0.5, c.pos.y + 2.6, c.pos.z - fz * 4.6 - rz * 0.5);
  const m = muzzleOf(c, _v3), ce = Math.cos(c.elev);
  camera.lookAt(m.x + fx * ce * 60, m.y + Math.sin(c.elev) * 60 - 2, m.z + fz * ce * 60);
  camera.fov = SET.fov * 0.85; camera.updateProjectionMatrix();
}
function shipCamera(sh) {
  const d = 24, p = clamp(PL.pitch, -0.3, 0.6) + 0.25;
  const fx = Math.sin(PL.yaw) * Math.cos(p), fz = Math.cos(PL.yaw) * Math.cos(p);
  camera.position.set(sh.pos.x - fx * d, TER.water + 4 + Math.sin(p) * d, sh.pos.z - fz * d);
  camera.lookAt(sh.pos.x + Math.sin(PL.yaw) * 20, TER.water + 3, sh.pos.z + Math.cos(PL.yaw) * 20);
  camera.fov = SET.fov; camera.updateProjectionMatrix();
}

// ---------- the loop ----------
const PT = { ai: 0, soldiers: 0, fx: 0, anim: 0, render: 0 };
let READY = false, MANUAL = false, attractOn = false;
function tick(dt) {
  clock += dt;
  const playing = state === 'play';
  const I = playing ? readInput(dt) : (pollPad(), null);
  if (!playing) padMenus();
  else if (PAD.pressed.has(9)) padMenus();
  let t0 = DEBUG ? performance.now() : 0;
  if (playing && PL.s) controlPlayer(dt, I);
  if (MATCH.on) {
    updateAI(dt);
    if (DEBUG) { PT.ai += performance.now() - t0; t0 = performance.now(); }
    updateSoldiers(dt);
    updateVehicles(dt);
    updateProjectiles(dt);
    updateMatch(dt);
    for (const s of SOLDIERS) if (s.spotT > 0) s.spotT -= dt;
    if (DEBUG) { PT.soldiers += performance.now() - t0; t0 = performance.now(); }
  }
  updateDebris(dt);
  updateFx(dt);
  if (DEBUG) { PT.fx += performance.now() - t0; t0 = performance.now(); }
  // cameras
  const s = PL.s;
  if (playing && s) {
    if (s.mount && s.mount.type === 'cannon') { PL.firstPerson = false; gunCamera(s.mount.c); }
    else if (s.mount && s.mount.type === 'ship') { PL.firstPerson = false; shipCamera(s.mount.s); }
    else updatePlayerCamera(dt);
  } else if (state !== 'paused') cinematicCamera(dt);
  if (MATCH.on) animAll(dt);
  updateViewmodel(dt);
  if (DEBUG) PT.anim += performance.now() - t0;
  updateWater(clock);
  skyMat.uniforms.uTime.value = clock;
  postMat.uniforms.uTime.value = clock;
  placeSun(camera.position.x, camera.position.y, camera.position.z);
  if (MATCH.on) updateAmbience(dt, MATCH.map, s && clock - s.lastHurtT < 10);
  updateDomHud(dt);
  // flow between screens
  if (playing && s && s.state === 'dead') { PL.deadT += dt; if (PL.deadT > 2.6) setState('deploy'); }
  if (MATCH.on && MATCH.over && MATCH.overT > 6 && (state === 'play' || state === 'deploy') && !attractOn) setState('end');
  if (attractOn && MATCH.over && MATCH.overT > 8) startAttract();
  // scoreboard and map
  const sb = playing && (keys.Tab || PAD.b[8]);
  $('#scoreboard').hidden = !sb;
  if (sb && Math.floor(clock * 4) !== Math.floor((clock - dt) * 4)) drawScoreboard();
  const bm = playing && keys.KeyM;
  $('#bigmap').hidden = !bm;
  if (bm && Math.floor(clock * 5) !== Math.floor((clock - dt) * 5)) drawBigMap($('#bigmap canvas'));
  clearFrameInput();
}
function render() {
  const withVm = state === 'play' && PL.s && VM.root.visible;
  const t0 = DEBUG ? performance.now() : 0;
  renderFrame(withVm);
  if (DEBUG) PT.render += performance.now() - t0;
  drawHud(state === 'paused' ? 0 : 1 / 60);
}
// step quality down once if the machine cannot keep up
const AQ = { t: 0, slow: 0, done: false };
function autoQuality(fps) {
  if (AQ.done || SET.quality === 'low' || state !== 'play' || DEBUG) return;
  AQ.t += 0.5; if (AQ.t < 8) return;
  AQ.slow = fps < 28 ? AQ.slow + 1 : 0;
  if (AQ.slow < 8) return;
  AQ.done = true; setQuality(true);
  for (const k of ['crown', 'pine', 'trunk']) setSIShadow(k, false);
  hudMsg('Picture set to Fast to keep the frame rate up.', '');
}
let last = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now;
  const dt = Math.min(0.05, raw);
  fpsAcc += raw; fpsN++;
  if (fpsAcc > 0.5) {
    autoQuality(fpsN / fpsAcc);
    if (DEBUG) { const el = $('#fps'); el.hidden = false; el.textContent = Math.round(fpsN / fpsAcc) + ' fps · ' + renderer.info.render.calls + ' calls · ' + Math.round(renderer.info.render.triangles / 1000) + 'k tris · ' + SOLDIERS.filter((s) => s.alive).length + ' men · ' + BALLS.length + ' balls'; }
    fpsAcc = 0; fpsN = 0;
  }
  if (!READY || MANUAL) return;
  if (state !== 'paused') tick(dt);
  render();
}
// a bot battle on the title screen
function startAttract() {
  attractOn = true;
  const map = MAP_BY_ID[CFG.map] || MAPS[0];
  startMatch({ map, mode: 'conquest', side: US, size: QUAL.low ? 10 : 16, tix: 4, diff: 1, player: false });
  makeMapImage();
  for (const s of SOLDIERS) s.respawnT = Math.random() * 2;
  cinematicCamera(0, true);
}
const _beginBattle = beginBattle;
beginBattle = function () { attractOn = false; _beginBattle(); };

// ---------- boot ----------
if (!renderer.getContext()) { $('#nogl').hidden = false; }
initKit();
initViewmodel();
addEventListener('resize', resize);
resize();
setState('title');
requestAnimationFrame(() => setTimeout(() => {
  const t0 = performance.now();
  startAttract();
  READY = true;
  $('#loading').textContent = DEBUG ? 'Field built in ' + Math.round(performance.now() - t0) + ' ms' : '';
  $('#btnPlay').disabled = false;
  requestAnimationFrame(frame);
}, 30));

// ---------- test hook: open with #debug ----------
if (DEBUG) window.SH = {
  get state() { return state; }, STATS, MATCH, SOLDIERS, PL, CANNONS, HORSES, SHIPS, COLOURS, BALLS, ROUNDS, PIECES, BLD, COL, NAV, TER, SQUADS, CFG, SET, PT, camera, scene, renderer, keys, pressed, mouse, mPressed,
  f: { MAPS, PSYS, FIRES, fxMusket, fireWeapon, heightAt, waterDepth, forestAt, losClear, rayCols, hurtSoldier, killSoldier, reviveSoldier, spawnSoldier, deploy, spawnPoints, startReload, fireCannon, crewCannon, mountHorse, boardShip, explode, craterAt, destroyPiece, buildWorld, startMatch, makeMapImage, setState, flagById, sectorFallen, finishMatch, plantColours, cinematicCamera, tick },
  // start a battle and put the player in the field (no pointer lock needed)
  start(o = {}) {
    attractOn = false;
    Object.assign(CFG, { map: o.map || 'lexington', mode: o.mode || 'conquest', side: String(o.side ?? 0), size: o.size || 32, tix: o.tix || 1, diff: o.diff ?? 1 });
    if (o.cls) PL.cls = o.cls;
    if (o.weapon) PL.primary[PL.cls] = o.weapon;
    const T = startMatch({ map: MAP_BY_ID[CFG.map], mode: CFG.mode, side: Number(CFG.side), size: CFG.size, tix: CFG.tix, diff: CFG.diff });
    makeMapImage();
    const s = PL.s;
    setLoadout(s, PL.cls, PL.primary[PL.cls]);
    const pts = spawnPoints(s.team, s);
    deploy(s, pts.find((p) => p.id === o.spawn) || pts[0]);
    setState('play');
    PL.firstDeploy = false;
    return T;
  },
  attract() { startAttract(); setState('title'); },
  sim(sec, dt = 1 / 30) { const t0 = performance.now(); for (let t = 0; t < sec; t += dt) tick(dt); return Math.round(performance.now() - t0); },
  render() { render(); },
  manual(on) { MANUAL = on; },
  tp(x, z, yaw) { const s = PL.s; s.pos.set(x, heightAt(x, z) + 0.1, z); s.vel.set(0, 0, 0); if (yaw !== undefined) PL.yaw = s.yaw = yaw; },
  look(yaw, pitch) { PL.yaw = yaw; PL.pitch = pitch; if (PL.s) { PL.s.yaw = yaw; PL.s.pitch = pitch; } },
  aimAt(x, y, z) { const e = soldierEye(PL.s, _v1); PL.yaw = Math.atan2(x - e.x, z - e.z); PL.pitch = Math.atan2(y - e.y, Math.hypot(x - e.x, z - e.z)); PL.s.yaw = PL.yaw; },
  press(code) { pressed.add(code); keys[code] = true; setTimeout(() => { keys[code] = false; }, 0); },
  hold(code, sec) { keys[code] = true; pressed.add(code); this.sim(sec); keys[code] = false; },
  click(b = 'L') { mPressed.add(b); },
  holdMouse(b, on) { if (b === 'R') mouse.r = on; else mouse.l = on; },
  god(on = true) { if (PL.s) PL.s.god = on; },
  peace(on = true) { for (const s of SOLDIERS) if (s.bot) s.bot.peace = on; },
  mute() { if (AC) master.gain.value = 0; },
  audio() { audioInit(); master.gain.value = 0.0001; return !!AC; },
  free() { for (const s of SOLDIERS) if (s.bot) { s.bot.state = 'move'; } },
  enemy() { return SOLDIERS.filter((s) => PL.s && s.team !== PL.s.team); },
  // put a still enemy foot soldier d metres in front of the player (side metres to the right)
  dummy(d, side = 0, team) {
    const me = PL.s, t = team ?? 1 - me.team;
    const s = SOLDIERS.find((o) => o.bot && o.team === t && !o.mount && !o.bot.rider && !o.bot.sailor && !o.bot.dummy && o.cls === 'line') || SOLDIERS.find((o) => o.bot && o.team === t && !o.mount && !o.bot.dummy);
    const fx = Math.sin(me.yaw), fz = Math.cos(me.yaw), x = me.pos.x + fx * d - fz * side, z = me.pos.z + fz * d + fx * side;
    spawnSoldier(s, x, z, me.yaw + Math.PI);
    s.bot.hold = true; s.bot.peace = true; s.bot.dummy = true;
    this.sim(0.05);
    return s;
  },
  stats() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, men: SOLDIERS.filter((s) => s.alive).length, cols: COL.length, pieces: PIECES.length, boxes: SI.box ? SI.box.count : 0, trees: SI.crown ? SI.crown.count + SI.pine.count : 0, meshes: Object.values(SI).reduce((a, x) => a + x.meshes.length, 0), tickets: MATCH.tickets.slice(), flags: MATCH.flags.map((f) => f.id + ':' + f.owner + ':' + f.ctrl.toFixed(2)).join(' ') }; },
};
