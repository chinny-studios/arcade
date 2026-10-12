// Ashreach — boot, game flow, zone changes, death and respawn, main loop, debug hook

let state = 'boot', clock = 0, last = performance.now(), fpsAcc = 0, fpsN = 0, autosaveT = 0, respawnT = 0;
function setState(s) { state = s; document.body.dataset.state = s; }
const MUSIC_FOR = { city: 'city', dungeon: 'dungeon', tense: 'tense', calm: 'calm' };
const AMB_FOR = { landfall: 'ocean', halden: 'city', dustbowl: 'desert', greenhollow: 'forest', broken_mesa: 'desert', lumen_scar: 'scar', smugglers_den: 'cave', sunken_foundry: 'interior' };

// ---------- zones ----------
function changeZone(id, at) {
  // everything but the player, their pets and travelling teammates is left behind
  const keep = new Set([PLAYER, ...(PLAYER ? PLAYER.pets : [])]);
  if (typeof simTravellers === 'function') for (const e of simTravellers()) { keep.add(e); for (const p of e.pets) keep.add(p); }
  for (const e of ENTS.slice()) if (!keep.has(e)) removeEnt(e);
  const prevZone = ZONE ? ZONE.id : null;
  const spot = loadZone(id, at);
  setupSpawners(ZONE.def);
  for (const poi of ZONE.def.pois || []) spawnNpc(poi);
  if (PLAYER) {
    PLAYER.pos.set(spot.x, groundY(spot.x, spot.z), spot.z);
    PLAYER.yaw = spot.yaw || 0; CAM.yaw = PLAYER.yaw; CAM.cur = undefined;
    PLAYER.vy = 0; PLAYER.attacking = false; setTarget(null);
    PC.exitLock = true; PC.autorun = false;
    let i = 0;
    for (const e of keep) {
      if (e === PLAYER) continue;
      const a = PLAYER.yaw + Math.PI + (i++ - 1) * 0.6;
      e.pos.set(spot.x + Math.sin(a) * 2.5, 0, spot.z + Math.cos(a) * 2.5);
      e.pos.y = groundY(e.pos.x, e.pos.z);
      e.attacking = false; e.target = null; e.hate.clear();
      if (e.rig) e.rig.root.position.copy(e.pos);
    }
  }
  if (typeof simZoneChanged === 'function') simZoneChanged(id, prevZone);
  if (typeof missionZoneChanged === 'function') missionZoneChanged(id, prevZone);
  if (typeof setMusic === 'function') setMusic(MUSIC_FOR[ZONE.def.music] || 'calm');
  if (typeof setAmbience === 'function') setAmbience(AMB_FOR[id] || (ZONE.def.kind === 'interior' ? 'interior' : 'desert'));
  if (typeof uiMessage === 'function' && state === 'play') uiMessage(ZONE.def.name, 'zone');
  if (state === 'play') { EV.emit('chat', 'system', '', 'Entering ' + ZONE.def.name + (ZONE.def.lvl ? ' (levels ' + ZONE.def.lvl[0] + '–' + ZONE.def.lvl[1] + ')' : '') + '.'); saveGame(true); }
}

// ---------- start / quit ----------
function startGame(char, save) {
  if (typeof audioInit === 'function') audioInit();
  for (const e of ENTS.slice()) removeEnt(e);
  if (SAVE_SLOT === null || !save) SAVE_SLOT = save ? SAVE_SLOT : freeSlot();
  char.flags = char.flags || {};
  if (!char.flags.clone) char.flags.clone = { zone: 'landfall', poi: null };
  const P = makeEnt('player', { name: char.name, level: char.level, char, faction: char.faction });
  PLAYER = P;
  addEnt(P);
  TEAM.members = [P]; TEAM.leader = P; P.team = TEAM;
  if (typeof hideTitle === 'function') hideTitle();
  setState('play');
  if (typeof simStart === 'function') simStart(save && save.sim);
  if (save && save.zone && ZONE_DEFS[save.zone]) changeZone(save.zone, save.pos ? { x: save.pos.x, z: save.pos.z, yaw: save.pos.yaw } : save.poi);
  else changeZone('landfall', startPoi('landfall'));
  if (save) {
    refreshStats(P);
    P.hp = Math.max(1, Math.round((save.hp ?? 1) * P.S.maxHp)); P.np = Math.round((save.np ?? 1) * P.S.maxNp);
    for (const b of save.buffs || []) { const n = NANOS[b.nano]; if (n) { applyNano(P, P, n, b.nano); const bb = P.buffs.find((x) => x.nano === b.nano); if (bb) bb.t = b.t; } }
    EV.emit('chat', 'system', '', 'Welcome back to Ashreach, ' + char.name + '.');
  } else {
    char.flags.clone = { zone: 'landfall', poi: clonePoi('landfall') };
    EV.emit('chat', 'system', '', 'Welcome to Ashreach, ' + char.name + '. The Concord shuttle has set you down on Landfall Isle.');
    EV.emit('chat', 'system', '', 'Press F1 for help. Talk to people with F or right-click. Tab targets enemies, ` (backquote) toggles your attack.');
    saveGame(true);
  }
  EV.emit('stats', P); EV.emit('inv', P);
  if (typeof uiMessage === 'function') uiMessage(ZONE.def.name, 'zone');
}
function startPoi(zone) { const p = (ZONE_DEFS[zone].pois || []).find((p) => p.type === 'start'); return p ? p.id : null; }
function clonePoi(zone) { const p = (ZONE_DEFS[zone].pois || []).find((p) => p.type === 'clonebay'); return p ? p.id : null; }
function quitToTitle() {
  saveGame(true);
  for (const e of ENTS.slice()) removeEnt(e);
  PLAYER = null;
  if (typeof simStop === 'function') simStop();
  setState('title');
  loadZone('halden', null);
  if (typeof setMusic === 'function') setMusic('title');
  if (typeof showTitle === 'function') showTitle();
}

// ---------- death ----------
EV.on('death', (e) => { if (e === PLAYER) respawnT = 6; });
function respawnPlayer() {
  const P = PLAYER, cl = P.char.flags.clone || { zone: 'landfall' };
  P.dead = false; P.deadT = 0; P.buffs = []; P.attacking = false; P.cast = null; P.sitting = false;
  // clone sickness: a few minutes of weakness, like waking up in a fresh body
  refreshStats(P);
  P.hp = Math.round(P.S.maxHp * 0.5); P.np = Math.round(P.S.maxNp * 0.5);
  applyBuffRaw(null, P, { id: 'clone_sickness', name: 'Clone Sickness', line: 'clone_sickness', str: 1, dur: 120, mods: { str: -10, agi: -10, sta: -10, int: -10, sen: -10, psy: -10 }, icon: { glyph: '☣', color: '#9fd06a' }, hostile: true });
  if (cl.zone === ZONE.id && cl.x !== undefined) { P.pos.set(cl.x + 2, 0, cl.z + 2); P.pos.y = groundY(P.pos.x, P.pos.z); setTarget(null); }
  else changeZone(cl.zone, cl.poi || clonePoi(cl.zone) || startPoi(cl.zone));
  EV.emit('log', 'You wake up in a fresh clone body.', 'info');
  EV.emit('stats', P);
}

// ---------- chat commands (the sim module extends this) ----------
function chatCommand(cmd, args) {
  cmd = cmd.toLowerCase();
  if (typeof simChatCommand === 'function' && simChatCommand(cmd, args)) return true;
  switch (cmd) {
    case 'sit': PLAYER.sitting = !PLAYER.sitting; return true;
    case 'stuck': { const s = startPoi(ZONE.id) || clonePoi(ZONE.id); changeZone(ZONE.id, s); return true; }
    case 'save': saveGame(); return true;
    case 'loc': EV.emit('chat', 'system', '', ZONE.def.name + ' ' + PLAYER.pos.x.toFixed(0) + ', ' + PLAYER.pos.z.toFixed(0)); return true;
  }
  return false;
}

// ---------- loop ----------
let titleT = 0;
function titleCamera(dt) {
  titleT += dt;
  const a = titleT * 0.05;
  const x = Math.sin(a) * 60, z = Math.cos(a) * 60;
  camera.position.set(x, groundY(x, z) + 22, z);
  camera.lookAt(0, groundY(0, 0) + 8, 0);
  camera.updateMatrixWorld();
}
function tick(dt) {
  clock += dt;
  if (state === 'title' || state === 'boot') { titleCamera(dt); if (typeof updateZone === 'function') updateZone(dt); return; }
  if (!PLAYER) return;
  updatePlayer(dt);
  updateEnts(dt);
  updateSpawners(dt);
  if (typeof simTick === 'function') simTick(dt);
  if (typeof missionTick === 'function') missionTick(dt);
  updateFx(dt);
  if (typeof updateZone === 'function') updateZone(dt);
  updateCamera(dt);
  placeSun(PLAYER.pos.x, PLAYER.pos.y, PLAYER.pos.z);
  if (PLAYER.dead && respawnT > 0) { respawnT -= dt; if (respawnT <= 0) respawnPlayer(); }
  autosaveT += dt;
  if (autosaveT > 60) { autosaveT = 0; saveGame(true); }
}
function render() {
  sky.position.copy(camera.position);
  skyMat.uniforms.uTime.value = clock;
  renderer.render(scene, camera);
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw);
  last = now;
  fpsAcc += raw; fpsN++;
  if (fpsAcc > 0.5) {
    const el = $('#fps');
    if (DEBUG || showFps) { el.hidden = false; el.textContent = Math.round(fpsN / fpsAcc) + ' fps · ' + ENTS.length + ' ents · ' + renderer.info.render.calls + ' calls · ' + Math.round(renderer.info.render.triangles / 1000) + 'k tris'; }
    else el.hidden = true;
    fpsAcc = 0; fpsN = 0;
  }
  if (MANUAL) return;
  try { tick(dt); } catch (err) { console.error(err); }
  render();
  if (typeof audioUpdate === 'function' && PLAYER) audioUpdate(dt, PLAYER.pos, CAM.yaw);
  if (typeof uiUpdate === 'function') { try { uiUpdate(dt); } catch (err) { console.error(err); } }
  pressed.clear();
}
let showFps = false, MANUAL = false;
function setQuality(q) {
  renderer.setPixelRatio(q === 'low' ? 1 : Math.min(devicePixelRatio || 1, 1.5));
  sun.castShadow = q !== 'low';
  resize();
}

// ---------- global keys ----------
addEventListener('keydown', (e) => {
  if (typeof uiIsTyping === 'function' && uiIsTyping()) return;
  if (e.code === 'Tab' || e.code === 'Space' || e.code === 'F1') e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true; pressed.add(e.code);
  if (e.code === 'Escape' && state === 'play') {
    if (typeof uiEscape === 'function' && uiEscape()) return;
    if (PLAYER && PLAYER.target) { setTarget(null); return; }
    if (typeof uiToggle === 'function') uiToggle('options');
    return;
  }
  playerKeyDown(e.code, e);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; CAM.look = CAM.orbit = false; });
addEventListener('resize', resize);

// ---------- boot ----------
setState('boot');
resize();
if (!renderer.getContext()) document.body.innerHTML = '<p style="color:#fff;padding:2em;font-family:sans-serif">Ashreach needs WebGL. Try a recent desktop browser.</p>';
requestAnimationFrame(() => setTimeout(() => {
  if (typeof uiInit === 'function') uiInit();
  loadZone('halden', null);
  setState('title');
  if (typeof showTitle === 'function') showTitle();
  if (typeof setMusic === 'function') setMusic('title');
  if (DEBUG) window.AR.ready = true;
  requestAnimationFrame(frame);
}, 20));

// Test hook: open with #debug to drive the game from the console or test/smoke.mjs.
if (DEBUG) window.AR = {
  ready: false, ENTS, TEAM, CAM, PC, ZONE_DEFS, NANOS, ITEM_T, MOB_T, PROFS, BREEDS, EV, camera, scene, renderer, keys, mouse,
  get PLAYER() { return PLAYER; }, get ZONE() { return ZONE; }, get state() { return state; },
  startGame, newCharacter, changeZone, spawnMob, castNano, useSpecial, startAttack, stopAttack, setTarget, interact, travel, giveXp, makeItem, addItem, equip, useItem, refreshStats, tabTarget, saveGame, listSaves, quitToTitle,
  ipAtLevel, raiseSkill, raiseAbility, itemReqsMet, attackStats, specialsFor, mobStats, applyNano, heal, dealDamage,
  manual(on) { MANUAL = on; }, tick, render,
  sim(sec, dt = 1 / 30) { const t0 = performance.now(); for (let t = 0; t < sec; t += dt) tick(dt); render(); if (typeof uiUpdate === 'function') uiUpdate(dt); return performance.now() - t0; },
  quick(prof = 'trooper', breed = 'baseline', faction = 'unaligned', name = 'Tester') { SAVE_SLOT = 7; startGame(newCharacter({ name, breed, prof, faction, sex: 'f' })); return PLAYER; },
  tp(x, z) { PLAYER.pos.set(x, groundY(x, z), z); },
  ents(kind) { return ENTS.filter((e) => !kind || e.kind === kind).map((e) => ({ id: e.id, kind: e.kind, name: e.name, lvl: e.level, hp: Math.round(e.hp), max: Math.round(e.S.maxHp), x: Math.round(e.pos.x), z: Math.round(e.pos.z), dead: e.dead })); },
};
