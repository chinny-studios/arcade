// Tokoyo — boot, world start-up, the arrival, the main loop, adaptive quality and the #debug hook

const G = { state: 'title', time: 0, frame: 0, paused: false, seedText: '', intro: null, lastSave: 0, noCost: false, god: false, peaceful: false, forceWeather: null, sleeping: false };
const clock = { last: performance.now(), fpsT: 0, fpsN: 0, fps: 60, lowT: 0 };

function boot() {
  if (!initRender()) { document.getElementById('nogl').hidden = false; document.getElementById('title').hidden = true; return; }
  AU.init();
  HUD.init();
  FX.init();
  makeIcons();
  UI.initTitle(startGame);
  document.body.dataset.state = 'title';
  requestAnimationFrame(frame);
  if (DEBUG) setupDebug();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function startGame(opts) {
  const $l = document.getElementById('loading'), bar = $l.querySelector('i'), txt = $l.querySelector('.t');
  document.getElementById('mainMenu').hidden = true; document.getElementById('newPanel').hidden = true;
  $l.hidden = false;
  const step = async (p, t) => { bar.style.width = (p * 100) + '%'; txt.textContent = t; await wait(30); };
  const save = opts.cont ? SAVE.load() : null;
  if (opts.cont && !save) { opts.cont = false; }
  const seedText = save ? (save.seedText || String(save.seed)) : opts.seed;
  G.seedText = seedText;
  const seed = save ? save.seed : strSeed(seedText);
  await step(0.05, 'Shaping the islands…');
  genWorld(seed);
  await step(0.45, 'Growing the forests…');
  if (save) SAVE.applyWorld(save); else { EVENTS.reset(); HUD.explored = null; }
  initTerrain(); initNature(); initWater(); initSky();
  await step(0.6, 'Waking the kami…');
  EVENTS.init();
  HUD.buildMap();
  resetPlayer();
  const shrine = W.pois[0];
  if (save) SAVE.applyRest(save);
  else {
    PLAYER.name = opts.name; PLAYER.look = opts.look;
    G.time = DAY_LEN * 0.03;
    PLAYER.pos.set(shrine.x + 1.5, shrine.y + 0.1, shrine.z - 2.5);
    PLAYER.yaw = CAM.yaw = Math.PI;
    SAVE.wipe();
  }
  makePlayerModel();
  await step(0.75, 'Raising the land…');
  for (let i = 0; i < 60; i++) { const a = updateTerrain(PLAYER.pos.x, PLAYER.pos.z, 12), b = updateNature(PLAYER.pos.x, PLAYER.pos.z, 8); if (!a && !b) break; if (i % 6 === 0) await step(0.75 + i / 240, 'Raising the land…'); }
  updateGrass(PLAYER.pos.x, PLAYER.pos.z, true);
  warmShaders();
  PLAYER.pos.y = Math.max(PLAYER.pos.y, groundY(PLAYER.pos.x, PLAYER.pos.z, PLAYER.pos.y + 2));
  await step(1, 'Arriving…');
  document.getElementById('title').hidden = true;
  G.state = 'play';
  document.body.dataset.state = 'play';
  AU.resume();
  Input.lock();
  if (!save) startIntro();
  else { HUD.banner('Day ' + dayIndex(G.time)); setTimeout(() => { if (!Input.locked) HUD.msg('Click to take control.'); }, 600); }
  window.TK && (window.TK.ready = true);
}

// compile every material up front so the first hit, ghost or fire doesn't stall a frame
function warmShaders() {
  const g = new THREE.Group(), geo = itemGeo('stone');
  const mats = [R.mat.vc, R.mat.vcDS, R.mat.ghost, R.mat.ghostBad, R.mat.glow, R.mat.hurt, R.mat.vcWind, R.mat.foliage, ...R.mat.integ];
  for (const m of mats) { const mesh = new THREE.Mesh(geo, m); mesh.position.set(R.camera.position.x, R.camera.position.y - 50, R.camera.position.z); g.add(mesh); }
  const crow = makeCrow(); g.add(crow.root);
  R.scene.add(g);
  try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* ignore */ }
  R.scene.remove(g);
}

// ---------- the arrival: the crow carries you down to the shrine ----------
function startIntro() {
  const P = PLAYER;
  const end = P.pos.clone();
  const crow = makeCrow(); crow.root.scale.setScalar(4); R.scene.add(crow.root);
  G.intro = { t: 0, dur: 7, end, start: end.clone().add(new V3(-40, 45, 60)), crow };
  P.sit = false;
}
function updateIntro(dt) {
  const I = G.intro, P = PLAYER;
  I.t += dt;
  const k = Math.min(1, I.t / I.dur), e = 1 - Math.pow(1 - k, 2.2);
  const pos = I.start.clone().lerp(I.end, e);
  pos.y = lerp(I.start.y, I.end.y, 1 - Math.pow(1 - k, 1.5));
  I.crow.root.position.copy(pos).add(new V3(0, 3.6, 0));
  I.crow.root.rotation.y = Math.atan2(I.end.x - I.start.x, I.end.z - I.start.z);
  I.crow.wl.rotation.z = Math.sin(I.t * 9) * 0.9; I.crow.wr.rotation.z = -I.crow.wl.rotation.z;
  P.pos.copy(pos);
  P.rig.root.position.copy(pos); P.rig.root.rotation.y = I.crow.root.rotation.y;
  animBiped(P.rig, dt, { phase: I.t * 3, speed: 0, air: true });
  // the camera swings around the descent
  const cam = R.camera, ang = lerp(2.2, Math.PI + 0.4, e);
  cam.position.set(pos.x + Math.sin(ang) * lerp(18, 7, e), pos.y + lerp(4, 2.5, e), pos.z + Math.cos(ang) * lerp(18, 7, e));
  cam.lookAt(pos.x, pos.y + 1.2, pos.z);
  CAM.yaw = Math.atan2(pos.x - cam.position.x, pos.z - cam.position.z); CAM.pitch = -0.15;
  if (I.t > 1 && Math.random() < dt * 0.6) AU.play('crow', pos.x, pos.y + 3, pos.z, 0.6);
  if (k >= 1) {
    // let go and fly off
    R.scene.remove(I.crow.root);
    G.intro = null;
    P.pos.copy(I.end); P.vel.set(0, -2, 0); P.yaw = CAM.yaw;
    HUD.banner('常世 · Tokoyo');
    setTimeout(() => EVENTS.hint('arrive'), 1500);
    setTimeout(() => { if (!Input.locked) HUD.msg('Click to take control.'); }, 800);
  }
}

// ---------- main loop ----------
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - clock.last) / 1000; clock.last = now;
  if (dt > 0.1) dt = 0.1;
  clock.fpsT += dt; clock.fpsN++;
  if (clock.fpsT >= 1) { clock.fps = clock.fpsN / clock.fpsT; clock.fpsT = 0; clock.fpsN = 0; if (DEBUG) HUD.fps(Math.round(clock.fps) + ' fps · ' + R.renderer.info.render.calls + ' calls · ' + Math.round(R.renderer.info.render.triangles / 1000) + 'k tris'); adaptQuality(); }
  if (G.state === 'play') step(dt, true);
  Input.endFrame();
}
function step(dt, render) {
  G.frame++;
  const P = PLAYER;
  const prof = G.prof, T = prof ? (k, f) => { const t = performance.now(); f(); prof[k] = (prof[k] || 0) + performance.now() - t; } : (k, f) => f();
  if (!G.paused) {
    if (!G.sleeping) G.time += dt;
    WIND.t.value += dt; WAVE.t.value += dt;
    if (G.intro) updateIntro(dt);
    else {
      T('player', () => updatePlayer(dt));
      if (!(P.eq.right && ITEMS[P.eq.right.id].build) || !P.alive || UI.blocking()) BUILD.toolIdle();
    }
    T('mobs', () => updateMobs(dt));
    T('proj', () => updateProjectiles(dt));
    T('drops', () => updateDrops(dt));
    T('falling', () => updateFalling(dt));
    T('surv', () => SURV.update(dt));
    T('events', () => EVENTS.update(dt));
    T('build', () => BUILD.update(dt));
    T('rafts', () => { BUILD.updateRafts(dt); BUILD.portalCheck(); });
    if (G.frame % 60 === 0) natRegrow();
    if (G.time - G.lastSave > 120) T('save', () => SAVE.save());
  }
  const cp = R.camera.position;
  T('sky', () => updateSky(dt, P.pos.x, P.pos.z));
  T('terrain', () => updateTerrain(cp.x, cp.z, 2));
  T('nature', () => updateNature(cp.x, cp.z, 1));
  T('grass', () => updateGrass(P.pos.x, P.pos.z, false));
  updateWater(cp);
  T('fx', () => FX.update(dt));
  T('audio', () => AU.update(dt, SURV.env));
  T('prompt', () => HUD.setPrompt(!G.paused && !UI.blocking() && !G.intro ? promptText() : ''));
  T('hud', () => HUD.update(dt));
  T('ui', () => UI.tick());
  if (render) T('render', () => R.renderer.render(R.scene, R.camera));
}
function promptText() {
  const P = PLAYER;
  if (!P.alive) return '';
  if (P.steer) { const D = P.steer.data; return 'Raft · ' + ['Paddle back', 'Stop', 'Paddle', 'Half sail', 'Full sail'][(D.mode || 0) + 1] + ' · <b>W/S</b> sail · <b>A/D</b> steer · <b>E</b> let go'; }
  const t = interactTarget();
  return t && t.prompt ? t.prompt.replace(/\[(.+?)\]/g, '<b>[$1]</b>') : '';
}
function adaptQuality() {
  if (!SETTINGS.autoQ || G.state !== 'play' || G.paused || document.hidden) return;
  if (clock.fps < 28) clock.lowT++; else clock.lowT = 0;
  if (clock.lowT >= 4) {
    clock.lowT = 0;
    if (SETTINGS.view > 180) { SETTINGS.view -= 40; HUD.msg('Lowering view distance for smoother play.'); }
    else if (SETTINGS.grass > 0) { SETTINGS.grass = 0; updateGrass(PLAYER.pos.x, PLAYER.pos.z, true); HUD.msg('Turning grass off for smoother play.'); }
    else if (R.sun.castShadow) { R.sun.castShadow = false; HUD.msg('Turning shadows off for smoother play.'); }
    saveSettings();
  }
}

// ---------- debug hook ----------
function setupDebug() {
  const TK = window.TK = {
    ready: false, G, P: PLAYER, W, BUILD, MOBS_LIVE, NAT, SKY, EVENTS, ITEMS, PIECES, R, Input, UI, SAVE, SURV, DROPS, HUD,
    start(o = {}) { return startGame(Object.assign({ cont: false, name: 'Tester', look: { skin: 1, hair: 0, hairCol: 0, build: 0 }, seed: 'test' }, o)).then(() => { if (G.intro) { G.intro.t = G.intro.dur; updateIntro(0); } }); },
    sim(seconds, dt = 1 / 30) { const n = Math.round(seconds / dt); for (let i = 0; i < n; i++) { step(dt, false); Input.endFrame(); } },
    give(id, n = 1, q = 1) { return PLAYER.inv.add(id, n, q); },
    tp(x, z, y) { PLAYER.pos.set(x, y != null ? y : groundY(x, z, 200), z); PLAYER.vel.set(0, 0, 0); for (let i = 0; i < 40; i++) { if (!updateTerrain(x, z, 10) && !updateNature(x, z, 8)) break; } updateGrass(x, z, true); },
    spawn(type, dx = 6, dz = 6, o) { return spawnMob(type, PLAYER.pos.x + dx, PLAYER.pos.z + dz, o); },
    god(v = true) { G.god = v; }, free(v = true) { G.noCost = v; }, peace(v = true) { G.peaceful = v; for (const m of MOBS_LIVE.slice()) if (!m.boss) removeMob(m); },
    time(t) { G.time = t; }, weather(w) { G.forceWeather = w; },
    equip(id) { const st = PLAYER.inv.slots.find((s) => s && s.id === id); if (st && !st.eq) equip(st); return !!st; },
    place(id, x, y, z, yaw = 0) { const p = BUILD.add(id, x, y, z, yaw, { fresh: true }); BUILD.updateSupport(); return p; },
    look(yaw, pitch) { CAM.yaw = yaw; CAM.pitch = pitch; PLAYER.yaw = yaw; },
    press(code, frames = 1) { Input.press(code); for (let i = 0; i < frames; i++) { step(1 / 30, false); Input.endFrame(); } Input.release(code); Input.endFrame(); },
    click(btn = 0, frames = 2) { Input.m.b[btn] = true; Input.m.hit[btn] = true; for (let i = 0; i < frames; i++) { step(1 / 30, false); Input.m.hit[btn] = false; } Input.m.b[btn] = false; Input.m.up[btn] = true; step(1 / 30, false); Input.endFrame(); },
    hold(code, seconds) { Input.press(code); this.sim(seconds); Input.release(code); },
    render() { R.renderer.render(R.scene, R.camera); },
    interact: () => interact(), target: () => { const t = interactTarget(); return t && t.prompt; },
    poi: (type) => W.pois.find((p) => p.type === type),
    f: { craft, recipeFor, natQuery, heightAt, groundY, useItem, maxHp, maxSt, CAM, NAT, SAVE, DROPS, MOBS_LIVE, damageMob, killMob, spawnMob, interact, interactTarget, biomeAt, forestAt, EVENTS, SURV, BUILD, PROJ, natPick, natPickNear, dropItems, equip, itemDamage, skillLv, raiseSkill, waveH, SKY, startGame, step, updateSky, coarse, FX, HUD },
    mute() { if (!AU.muted) AU.toggleMute(); },
    stats() { const i = R.renderer.info.render; return { calls: i.calls, tris: i.triangles, mobs: MOBS_LIVE.length, pieces: BUILD.pieces.length, drops: DROPS.length, fps: clock.fps }; },
  };
  return TK;
}

boot();
