// Revenant Protocol — boot, game flow (title, briefing, play, death, mission complete), input wiring, debug hook

function grabPointer() { if (!isTouch && document.pointerLockElement !== R.canvas && R.canvas.requestPointerLock) { try { const p = R.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed yet */ } } }
function releasePointer() { if (document.pointerLockElement) document.exitPointerLock(); }

function showScreen(id) {
  for (const s of ['#title', '#brief', '#pda', '#pause', '#options', '#dead', '#done', '#end']) $(s).hidden = s !== id;
}

// ---------- level lifecycle ----------
function unloadLevel() {
  if (LV && LV.root) {
    R.scene.remove(LV.root);
    LV.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
  clearEnemies(); clearItems(); clearUsables(); clearProjectiles();
}
function loadLevel(m) {
  unloadLevel();
  const def = LEVELS[MISSIONS[m].level];
  LV = parseLevel(def);
  LV.flags = {}; LV.fired = {}; LV.timers = [];
  LV.root = buildLevelMeshes(LV);
  R.scene.add(LV.root);
  setSky(def.sky || { top: 0x000000, hor: 0x000000 });
  U.uFogCol.value.set(def.fog ? def.fog[0] : 0x000000);
  U.uFogNear.value = def.fog ? def.fog[1] : 60; U.uFogFar.value = def.fog ? def.fog[2] : 200;
  U.uCue.value = def.cue !== undefined ? def.cue : 0.55;
  G.stats = { kills: 0, total: 0, secrets: 0, secretsTotal: new Set(LV.cells.filter((c) => !c.solid && c.d.secret && !c.d.door).map((c) => c.ch)).size, time: 0 };
  let start = null;
  for (const th of LV.things) {
    if ((th.d || 0) > G.diff) continue;
    if (th.t === 'start') start = th;
    else if (ENEMIES[th.t]) { spawnEnemy(th.t, th.x, th.z, th); G.stats.total++; }
    else if (ITEMS[th.t]) spawnItem(th.t, th.x, th.z);
    else if (['switch', 'pump', 'console', 'decor'].includes(th.t)) spawnUsable(th);
    else throw new Error('unknown thing ' + th.t);
  }
  if (!start) throw new Error('level has no start');
  placePlayer(start.x, start.z, start.a || 0);
  P.spawn = { x: start.x, z: start.z, yaw: start.a || 0 };
  P.lastCell = null;
  markSeen(P.x, P.z);
}
function startMission(m, opts = {}) {
  initAudio();
  G.mission = m;
  loadLevel(m);
  const M = MISSIONS[m];
  resetPlayer(M.loadout, false);
  G.obj = M.obj.map((o) => Object.assign({}, o, { done: false }));
  PROGRESS.last = m; PROGRESS.diff = G.diff; saveJSON('rp-progress', PROGRESS);
  G.time = 0;
  for (const m of HUD.msgs) m.el.remove(); HUD.msgs.length = 0;
  VM.cur && (VM.models[VM.cur].visible = false); VM.cur = P.cur; VM.swapTo = null; VM.models[P.cur].visible = true;
  toggleMap(false);
  if (opts.brief === false) beginPlay(); else showBrief();
}
function showBrief() {
  const M = MISSIONS[G.mission];
  setState('brief'); showScreen('#brief'); releasePointer();
  $('#briefNum').textContent = 'MISSION ' + (G.mission + 1) + ' · ' + M.planet.toUpperCase();
  $('#briefName').textContent = M.name;
  $('#briefText').textContent = M.brief;
  $('#briefObj').innerHTML = M.obj.map((o) => '<li>' + o.text + '</li>').join('');
  $('#bLaunch').focus();
}
function beginPlay() {
  showScreen(null); setState('play'); clearInput();
  AU.musicOn = true;
  grabPointer();
  levelEvent('start');
  msg(MISSIONS[G.mission].name);
}
function missionComplete() {
  if (G.state !== 'play') return;
  setState('done'); releasePointer(); showScreen('#done');
  const M = MISSIONS[G.mission];
  PROGRESS.unlocked = Math.max(PROGRESS.unlocked, Math.min(MISSIONS.length, G.mission + 2));
  saveJSON('rp-progress', PROGRESS);
  sfx('objective', 0.8);
  $('#doneNum').textContent = 'MISSION ' + (G.mission + 1) + ' COMPLETE';
  $('#doneName').textContent = M.name;
  $('#doneText').textContent = M.outro;
  const s = G.stats;
  $('#doneStats').innerHTML = `<span>Enemies</span><span>${s.kills} / ${s.total}</span><span>Secrets</span><span>${s.secrets} / ${s.secretsTotal}</span><span>Time</span><span>${fmtTime(s.time)}</span><span>Difficulty</span><span>${DIFF[G.diff].name}</span>`;
  $('#bNext').textContent = G.mission + 1 < MISSIONS.length ? 'NEXT MISSION' : 'FINALE';
  $('#bNext').focus();
}
function showDeath() {
  setState('dead'); releasePointer(); showScreen('#dead');
  const left = P.lives - 1;
  $('#deadTitle').textContent = left > 0 ? 'YOU HAVE FALLEN' : 'MISSION FAILED';
  $('#deadText').textContent = left > 0 ? (left === 1 ? 'One life remaining.' : left + ' lives remaining.') : 'No lives remain. The mission restarts from the beginning.';
  $('#bRespawn').textContent = left > 0 ? 'CONTINUE' : 'RETRY MISSION';
}
function respawn() {
  P.lives--;
  if (P.lives <= 0) { startMission(G.mission, { brief: false }); return; }
  P.dead = false; P.health = 100; P.shield = Math.max(P.shield, 0); P.vx = P.vz = P.vy = 0; P.crouch = false;
  placePlayer(P.spawn.x, P.spawn.z, P.spawn.yaw);
  // clear hostile shots and give a short breather
  for (let i = PROJ.length - 1; i >= 0; i--) if (PROJ[i].owner !== P) removeProj(i);
  P.boostS = 3;
  beginPlay();
}
function pauseGame() {
  if (G.state !== 'play') return;
  setState('pause'); showScreen('#pause'); releasePointer(); toggleMap(false);
  $('#bResume').focus();
}
function resumeGame() { showScreen(null); setState('play'); clearInput(); grabPointer(); }
function quitToTitle() {
  AU.musicOn = false;
  setState('title'); showScreen('#title'); releasePointer(); toggleMap(false);
  showMenu('#mainMenu');
}

// ---------- menus ----------
function showMenu(id) { for (const m of ['#mainMenu', '#diffMenu', '#selMenu']) $(m).hidden = m !== id; const b = $(id + ' button'); if (b) b.focus(); }
let pendingMission = 0;
function buildMenus() {
  $('#bCont').disabled = !(PROGRESS.unlocked > 1 || PROGRESS.last > 0);
  $('#bCont').textContent = 'CONTINUE · MISSION ' + (Math.min(PROGRESS.unlocked, MISSIONS.length));
  const diffs = $('#diffs'); diffs.innerHTML = '';
  DIFF.forEach((d, i) => { const b = document.createElement('button'); b.innerHTML = d.name; b.title = d.note; b.onclick = () => { G.diff = i; startMission(pendingMission); }; diffs.appendChild(b); });
  const ms = $('#missions'); ms.innerHTML = '';
  MISSIONS.forEach((M, i) => { const b = document.createElement('button'); b.textContent = (i + 1) + '. ' + M.name; b.disabled = i >= PROGRESS.unlocked && !DEBUG; b.onclick = () => { pendingMission = i; showMenu('#diffMenu'); }; ms.appendChild(b); });
  $('#help').innerHTML = isTouch
    ? 'Left thumb moves · right thumb looks · FIRE / ALT fire · USE opens doors and lifts<br>MAP shows the automap · PDA shows objectives'
    : '<kbd>WASD</kbd> move · <kbd>Mouse</kbd> look · <kbd>LMB</kbd>/<kbd>RMB</kbd> fire / alt fire · <kbd>Space</kbd> jump · <kbd>C</kbd> crouch · <kbd>Shift</kbd> walk<br>' +
      '<kbd>E</kbd> use · <kbd>1</kbd>–<kbd>0</kbd> weapons · <kbd>Tab</kbd> automap · <kbd>P</kbd> PDA · <kbd>F</kbd> headlamp · <kbd>G</kbd> gas mask · <kbd>V</kbd> ice cleats · <kbd>Esc</kbd> pause';
}
function openOptions(back) {
  optBack = back; showScreen('#options');
  $('#oSens').value = SETTINGS.sens; $('#oInv').value = SETTINGS.invert ? '1' : '0'; $('#oScale').value = SETTINGS.scale;
  $('#oVol').value = SETTINGS.vol; $('#oMus').value = SETTINGS.music; $('#oAim').value = SETTINGS.aim ? '1' : '0';
}
let optBack = '#title';
function readOptions() {
  SETTINGS.sens = +$('#oSens').value; SETTINGS.invert = $('#oInv').value === '1'; SETTINGS.scale = $('#oScale').value;
  SETTINGS.vol = +$('#oVol').value; SETTINGS.music = +$('#oMus').value; SETTINGS.aim = $('#oAim').value === '1';
  saveJSON('rp-settings', SETTINGS); applyVolumes(); resize();
}
function wireMenus() {
  $('#bNew').onclick = () => { initAudio(); pendingMission = 0; showMenu('#diffMenu'); };
  $('#bCont').onclick = () => { initAudio(); G.diff = PROGRESS.diff; startMission(Math.min(PROGRESS.unlocked, MISSIONS.length) - 1); };
  $('#bSelect').onclick = () => { initAudio(); buildMenus(); showMenu('#selMenu'); };
  $('#bOpts').onclick = () => openOptions('#title');
  $('#bBack1').onclick = $('#bBack2').onclick = () => showMenu('#mainMenu');
  $('#bLaunch').onclick = () => beginPlay();
  $('#bResume').onclick = resumeGame;
  $('#bRestart').onclick = () => startMission(G.mission);
  $('#bOpts2').onclick = () => openOptions('#pause');
  $('#bQuit').onclick = $('#bQuit2').onclick = $('#bQuit3').onclick = () => { quitToTitle(); buildMenus(); };
  $('#bOptsDone').onclick = () => { readOptions(); showScreen(optBack); };
  for (const id of ['#oSens', '#oInv', '#oScale', '#oVol', '#oMus', '#oAim']) $(id).addEventListener('change', readOptions);
  $('#bPdaClose').onclick = closePda;
  $('#bRespawn').onclick = respawn;
  $('#bNext').onclick = () => {
    if (G.mission + 1 < MISSIONS.length) startMission(G.mission + 1);
    else { setState('end'); showScreen('#end'); $('#endText').textContent = MISSIONS[G.mission].outro + '\n\nThanks for playing.'; }
  };
  $('#bEnd').onclick = () => { quitToTitle(); buildMenus(); };
}

// ---------- input ----------
function wireInput() {
  addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    if (!e.repeat) hit[e.code] = true;
    keys[e.code] = true;
    if (G.state === 'play') {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'Tab' && !e.repeat) toggleMap();
      if (e.code === 'KeyP' && !e.repeat) openPda();
      if ((e.code === 'Equal' || e.code === 'NumpadAdd') && G.mapOn) G.mapZoom = Math.min(4, G.mapZoom * 1.25);
      if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && G.mapOn) G.mapZoom = Math.max(0.3, G.mapZoom / 1.25);
      if (e.code === 'Escape') pauseGame();
    } else if (G.state === 'pda' && (e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) closePda();
    else if (G.state === 'pause' && e.code === 'Escape' && !e.repeat) resumeGame();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => clearInput());
  addEventListener('mousemove', (e) => { if (document.pointerLockElement === R.canvas) { mouse.dx += e.movementX; mouse.dy += e.movementY; } });
  R.canvas.addEventListener('mousedown', (e) => {
    if (G.state !== 'play') return;
    if (document.pointerLockElement !== R.canvas) { grabPointer(); return; }
    if (e.button === 0) mouse.b0 = true; if (e.button === 2) mouse.b2 = true;
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) mouse.b0 = false; if (e.button === 2) mouse.b2 = false; });
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('wheel', (e) => { if (G.state === 'play') mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && G.state === 'play' && !isTouch && !DEBUG) pauseGame();
  });
}

// ---------- main loop ----------
function step(dt) {
  G.time += dt; G.stats.time += dt;
  U.uTime.value = G.time;
  updatePlayer(dt);
  updateWeapons(dt);
  updateGroups(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateItems(dt);
  updateTimers(dt);
  updateFx(dt);
  for (const l of LV.def.lights || []) addLight((l[0] + 0.5) * CELL, l[1], (l[2] + 0.5) * CELL, l[3], l[4], l[5] * (l[6] ? 0.8 + 0.2 * Math.sin(G.time * l[6] + l[0]) : 1));
  updateCamera(dt);
  updateViewmodel(dt);
}
let lastT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (G.state === 'play') { step(dt); updateHud(dt); }
  else if (G.state === 'title' && LV) titleCam(dt);
  else if (G.state === 'dead') { updatePlayer(dt); updateCamera(dt); for (const e of ENEMY_LIST) drawEnemy(e, dt); }
  if (G.state !== 'loading') renderFrame();
}
// The title screen flies slowly around the first mission's canyon.
function titleCam(dt) {
  G.time += dt; U.uTime.value = G.time;
  const t = G.time * 0.05;
  const def = LEVELS[MISSIONS[0].level].title || [10, 30, 6];
  R.camera.position.set((def[0] + Math.sin(t) * 3) * CELL, def[2], (def[1] + Math.cos(t) * 2) * CELL);
  R.camera.rotation.set(-0.05, t * 0.8 + 0.6, 0);
  updateGroups(dt); updateItems(dt);
  for (const e of ENEMY_LIST) drawEnemy(e, dt);
  if (R.vmRoot) R.vmRoot.visible = false;
}

function boot() {
  buildTextures();
  resize();
  bakeAll(); bakeItems(); bakeFx();
  buildViewmodels();
  setupTouch(); wireMenus(); wireInput(); buildMenus();
  G.diff = PROGRESS.diff;
  loadLevel(0);
  $('#loading').hidden = true;
  setState('title'); showScreen('#title'); showMenu('#mainMenu');
  requestAnimationFrame(frame);
  if (DEBUG) installDebug();
}

function installDebug() {
  window.RP = {
    G, P, R, U, get LV() { return LV; }, ENEMIES: ENEMY_LIST, ITEMS: ITEM_LIST, USABLES, PROJ, SPR, MISSIONS, LEVELS, WEAPON,
    start(m = 0, diff = 1) { G.diff = diff; startMission(m, { brief: false }); return { lv: LV.w + 'x' + LV.h, enemies: ENEMY_LIST.length, items: ITEM_LIST.length }; },
    sim(sec, fn) { const n = Math.round(sec * 30); for (let i = 0; i < n; i++) { if (fn) fn(i); if (G.state === 'play') step(1 / 30); } updateHud(0); return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), hp: P.health, sh: P.shield, state: G.state }; },
    tp(i, j, yaw) { placePlayer((i + 0.5) * CELL, (j + 0.5) * CELL, yaw === undefined ? P.yaw : yaw); P.lastCell = null; updateCamera(0); return [P.x, P.y, P.z]; },
    look(yaw, pitch = 0) { P.yaw = yaw; P.pitch = pitch; updateCamera(0); },
    press(code) { hit[code] = true; },
    hold(code, on = true) { keys[code] = on; },
    fire(on = true, alt = false) { if (alt) mouse.b2 = on; else mouse.b0 = on; },
    give(id, n) { if (ITEMS[id]) return takeItem(id); if (AMMO_MAX[id] !== undefined) { P.ammo[id] = n || AMMO_MAX[id]; return true; } if (WEAPON[id]) { P.weapons.add(id); return selectWeapon(id, true); } return false; },
    all() { for (const w of WEAPONS) P.weapons.add(w.id); for (const k in AMMO_MAX) P.ammo[k] = AMMO_MAX[k]; P.keys = new Set(['r', 'b', 'y']); P.gear = new Set(['mask', 'cleats']); P.shield = 200; },
    god(on = true) { G.god = on; },
    killAll() { for (const e of ENEMY_LIST) if (!e.dead) killEnemy(e); },
    peace(on = true) { G.peace = on; for (const e of ENEMY_LIST) if (on) { e.alert = false; e.state = 'idle'; } },
    shot() { renderFrame(); },
    reach: () => reachability(),
    complete() { missionComplete(); },
    state() { return { state: G.state, mission: G.mission, obj: G.obj, pos: [P.x, P.y, P.z], cell: [Math.floor(P.x / CELL), Math.floor(P.z / CELL)], hp: P.health, sh: P.shield, cur: P.cur, ammo: P.ammo, kills: G.stats.kills, total: G.stats.total }; },
    f: { groundUnder, cellAt, bodyFloor, floorOf, ceilOf, blockedAt, trace },
    groups() { return LV.groups.map((g) => ({ type: g.type, id: g.id, n: g.cells.length, at: [g.cells[0].x, g.cells[0].z], key: g.key, locked: g.locked })); },
  };
}

// Offline check used by tests: can the start reach every key, switch, goal and exit, given keys and switches?
// Treats jumps up to 1.2 m as passable and a lift as standing at any of its stops.
function reachability() {
  const L = LV, n = L.w * L.h;
  const keys = new Set(), opened = new Set(), out = { unreachable: [] };
  const floors = (c) => (c.lift ? c.lift.stops : [c.d.f - (c.d.sink || 0)]);
  const passDoor = (g) => !g || ((!g.key || keys.has(g.key)) && (!g.locked || opened.has(g.id)));
  const passField = (g) => !g || opened.has(g.id) || !g.on;
  const top = (c) => (c.door ? c.door.c : c.d.sky ? 999 : c.d.c);
  const ok = (a, b) => {
    if (b.solid || b.d.kill || (b.d.dmg && !b.d.gas) || !passDoor(b.door) || !passField(b.field)) return false;
    for (const fa of floors(a)) for (const fb of floors(b)) if (fb - fa <= 1.2 && top(b) - Math.max(fa, fb) >= 1.1 && top(a) - fb >= 1.1) return true;
    return false;
  };
  const links = (L.def.links || []).map(([a, b, c, d]) => [b * L.w + a, d * L.w + c]);
  let seen;
  const sw = L.things.filter((t) => t.t === 'switch' || t.t === 'console' || t.t === 'pump');
  for (let pass = 0; pass < 12; pass++) {
    seen = new Uint8Array(n);
    const st = L.things.find((t) => t.t === 'start'); const s0 = st.j * L.w + st.i;
    const q = [s0]; seen[s0] = 1;
    while (q.length) {
      const k = q.pop(), c = L.cells[k];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const i = c.x + di, j = c.z + dj; if (i < 0 || j < 0 || i >= L.w || j >= L.h) continue;
        const m = j * L.w + i; if (seen[m]) continue;
        if (ok(c, L.cells[m])) { seen[m] = 1; q.push(m); }
      }
      for (const [a, b] of links) { if (a === k && !seen[b]) { seen[b] = 1; q.push(b); } }
    }
    let changed = false;
    for (const t of L.things) {
      if (!seen[t.j * L.w + t.i]) continue;
      const I = ITEMS[t.t]; if (I && I.key && !keys.has(I.key)) { keys.add(I.key); changed = true; }
    }
    // keys carried by enemies
    for (const t of L.things) if (t.drop && ITEMS[t.drop] && ITEMS[t.drop].key && seen[t.j * L.w + t.i] && !keys.has(ITEMS[t.drop].key)) { keys.add(ITEMS[t.drop].key); changed = true; }
    for (const t of sw) if (seen[t.j * L.w + t.i] && t.target && !opened.has(t.target)) { opened.add(t.target); changed = true; }
    for (const id of L.def.scriptOpens || []) if (!opened.has(id[1]) && (id[0] === '*' || opened.has(id[0]) || keys.has(id[0]))) { opened.add(id[1]); changed = true; }
    if (!changed) break;
  }
  for (const t of L.things) {
    const need = ITEMS[t.t] ? ITEMS[t.t].key || ITEMS[t.t].goal : t.t === 'switch' || t.t === 'pump' || t.t === 'console';
    if (need && !seen[t.j * L.w + t.i]) out.unreachable.push(t.t + '@' + t.i + ',' + t.j);
    if (t.drop && !seen[t.j * L.w + t.i]) out.unreachable.push('drop ' + t.drop + '@' + t.i + ',' + t.j);
  }
  const exits = L.cells.filter((c) => !c.solid && c.d.tag === 'exit');
  out.exit = exits.some((c) => seen[c.z * L.w + c.x]);
  out.keys = [...keys]; out.opened = [...opened];
  out.reached = seen.reduce((a, b) => a + b, 0);
  out.open = L.cells.filter((c) => !c.solid).length;
  out.unseen = L.cells.filter((c) => !c.solid && !seen[c.z * L.w + c.x]).map((c) => c.x + ',' + c.z);
  return out;
}

boot();
