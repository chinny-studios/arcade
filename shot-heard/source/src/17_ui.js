// Shot Heard — screens: title (with a live battle behind it), choosing the field, deployment (class, loadout,
// spawn), pause, the end of the round, settings and the drill and controls.

let state = 'boot';
const CFG = { map: 'lexington', mode: 'conquest', side: '0', size: 32, tix: 1, diff: 1 };
try { Object.assign(CFG, JSON.parse(localStorage.getItem('shot-heard:battle') || '{}')); } catch (e) {}
try { Object.assign(PL, { cls: 'line', primary: {} }, JSON.parse(localStorage.getItem('shot-heard:loadout') || '{}')); } catch (e) {}
const SCREENS = ['title', 'setup', 'deploy', 'pause', 'end', 'settings', 'help'];
function showScreen(id) { for (const s of SCREENS) $('#' + s).hidden = s !== id; }
function setState(st) {
  state = st;
  document.body.dataset.state = st;
  if (st === 'title') showScreen('title');
  else if (st === 'setup') { showScreen('setup'); buildSetup(); }
  else if (st === 'deploy') { showScreen('deploy'); releaseLock(); buildDeploy(); }
  else if (st === 'play') { showScreen(null); requestLock(); }
  else if (st === 'paused') { showScreen('pause'); releaseLock(); }
  else if (st === 'end') { showScreen('end'); releaseLock(); buildEnd(); }
  $('#scoreboard').hidden = true; $('#bigmap').hidden = true;
}
function fade(on, text = '') { const f = $('#fade'); f.textContent = text; f.classList.toggle('on', on); }

// ---------- title ----------
$('#btnPlay').onclick = () => { audioInit(); setState('setup'); };
$('#btnHelp').onclick = () => { audioInit(); openHelp('title'); };
$('#btnSet').onclick = () => { audioInit(); openSettings('title'); };

// ---------- setup ----------
function mapThumb(map, cv) {
  const W = cv.width = 320, H = cv.height = 200, g = cv.getContext('2d'), img = g.createImageData(W, H), D = img.data;
  const half = map.size / 2, sc = (half * 2) / W;
  const forests = map.forests.map((f) => Object.assign({ bb: polyBounds(f.poly, 2) }, f));
  const g0 = col(map.grass[0]), lf = col(map.leaf[0]);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = -half + (i + 0.5) * sc, z = -half * (H / W) + (j + 0.5) * sc;
    let h = map.height(x, z);
    let water = map.coast ? map.coast(x, z) < 0 : false;
    for (const r of map.rivers || []) if (distPolyline(x, z, r.pts) < r.w / 2) water = true;
    let c = shadeC(g0, 0.85 + clamp(h / 40, -0.2, 0.4));
    let fo = 0;
    for (const f of forests) if (x > f.bb[0] && x < f.bb[2] && z > f.bb[1] && z < f.bb[3] && pointInPoly(x, z, f.poly)) fo = f.d;
    for (const cl of map.clearings || []) if (Math.hypot(x - cl[0], z - cl[1]) < cl[2]) fo = 0;
    if (fo) c = mixC(c, shadeC(lf, 0.7), fo * 0.7);
    if (water) c = [0.36, 0.46, 0.52];
    const o = (j * W + i) * 4; D[o] = c[0] * 255; D[o + 1] = c[1] * 255; D[o + 2] = c[2] * 255; D[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const P = (x, z) => [(x + half) / sc, (z + half * (H / W)) / sc];
  g.strokeStyle = 'rgba(150,120,80,.9)'; g.lineWidth = 1.5;
  for (const r of map.roads) { g.beginPath(); r.pts.forEach((p, i) => { const [x, y] = P(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  g.strokeStyle = 'rgba(90,60,30,.9)'; g.lineWidth = 2;
  for (const w of (map.works || []).concat(map.trenches || [])) { g.beginPath(); w.pts.forEach((p, i) => { const [x, y] = P(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  for (const f of map.flags) {
    const [x, y] = P(f.x, f.z);
    g.fillStyle = 'rgba(30,20,10,.75)'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
    g.fillStyle = '#f0e6cc'; g.font = "12px 'IM Fell English SC', Georgia, serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f.id, x, y + 1);
  }
  map.hq.forEach((h, t) => { const [x, y] = P(h.x, h.z); g.fillStyle = t === US ? '#3a5a9a' : '#b03a30'; g.fillRect(x - 5, y - 5, 10, 10); });
}
function buildSetup() {
  const box = $('#maps');
  if (!box.children.length) {
    for (const m of MAPS) {
      const d = document.createElement('div'); d.className = 'mapc'; d.dataset.id = m.id;
      d.innerHTML = `<canvas></canvas><h3>${m.name}</h3><div class="d">${m.date}</div><p>${m.blurb}</p>`;
      d.onclick = () => { CFG.map = m.id; buildSetup(); };
      box.appendChild(d);
      mapThumb(m, d.querySelector('canvas'));
    }
  }
  for (const d of box.children) d.classList.toggle('on', d.dataset.id === CFG.map);
  const seg = (id, key, conv = (v) => v) => {
    for (const b of $(id).children) {
      b.classList.toggle('on', String(CFG[key]) === b.dataset.v);
      b.onclick = () => { CFG[key] = conv(b.dataset.v); buildSetup(); };
    }
  };
  seg('#segMode', 'mode'); seg('#segSide', 'side'); seg('#segSize', 'size', Number); seg('#segTix', 'tix', Number); seg('#segDiff', 'diff', Number);
  const m = MAP_BY_ID[CFG.map];
  const att = TEAMS[m.breakthrough.attacker].name;
  $('#modeDesc').textContent = CFG.mode === 'conquest'
    ? 'Conquest: five flags. Each side starts with the two nearest its headquarters and loses a ticket for every man killed; the side holding fewer flags bleeds tickets until it holds more. First to none loses.'
    : `Breakthrough: ${att} attack the field sector by sector. The attackers have a limited number of tickets, topped up each time a sector falls; take the last sector to win.`;
}
$('#setupBack').onclick = () => setState('title');
$('#setupGo').onclick = () => {
  try { localStorage.setItem('shot-heard:battle', JSON.stringify(CFG)); } catch (e) {}
  beginBattle();
};
function beginBattle() {
  const side = CFG.side === 'r' ? (Math.random() < 0.5 ? US : GB) : Number(CFG.side);
  fade(true, 'The drums beat to arms…');
  stopMusic();
  setTimeout(() => {
    const T = startMatch({ map: MAP_BY_ID[CFG.map], mode: CFG.mode, side, size: CFG.size, tix: CFG.tix, diff: CFG.diff });
    makeMapImage();
    PL.firstDeploy = true;
    if (DEBUG) console.log('world', JSON.stringify(T));
    setState('deploy');
    playTune(TEAMS[side].tune, false, true);
    fade(false);
  }, 60);
}

// ---------- deploy ----------
const DP = { sel: null, pts: [], timer: 0 };
function classIcon(cv, cls, team) {
  const g = cv.getContext('2d'), S = cv.width = cv.height = 88;
  g.clearRect(0, 0, S, S);
  const coat = team === GB ? (cls === 'arty' ? '#253058' : cls === 'rifle' ? '#2f4a2c' : '#b3302a') : cls === 'rifle' ? '#c8bc98' : '#283a64';
  const face = team === GB ? (cls === 'arty' ? '#a82a24' : '#1f3570') : cls === 'rifle' ? '#b8aa80' : '#d2b880';
  g.fillStyle = 'rgba(60,40,20,.12)'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); g.fill();
  g.fillStyle = '#e8e2d0'; g.fillRect(34, 56, 8, 22); g.fillRect(46, 56, 8, 22);
  g.fillStyle = cls === 'surgeon' ? '#2c2a30' : coat; g.fillRect(28, 26, 32, 34); g.fillRect(26, 50, 36, 12);
  if (cls !== 'surgeon' && cls !== 'rifle') { g.fillStyle = face; g.fillRect(37, 27, 5, 20); g.fillRect(46, 27, 5, 20); }
  g.fillStyle = '#e2b89c'; g.beginPath(); g.arc(44, 18, 8, 0, TAU); g.fill();
  g.fillStyle = '#1c1a18';
  if (cls === 'rifle' || cls === 'surgeon') { g.fillRect(31, 10, 26, 3); g.fillRect(37, 4, 14, 7); }
  else { g.beginPath(); g.moveTo(30, 13); g.lineTo(58, 13); g.lineTo(44, 4); g.fill(); }
  g.strokeStyle = '#5a3a20'; g.lineWidth = 3;
  if (cls === 'officer') { g.strokeStyle = '#c8c8c8'; g.lineWidth = 2; g.beginPath(); g.moveTo(62, 60); g.lineTo(76, 22); g.stroke(); g.fillStyle = '#9a1828'; g.fillRect(28, 48, 32, 4); }
  else if (cls === 'surgeon') { g.fillStyle = '#f0ece0'; g.fillRect(62, 40, 16, 12); g.fillStyle = '#c8302a'; g.fillRect(68, 41, 4, 10); g.fillRect(64, 44, 12, 4); }
  else if (cls === 'arty') { g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(70, 66, 8, 0, TAU); g.fill(); g.fillRect(58, 54, 22, 6); }
  else { g.beginPath(); g.moveTo(20, 74); g.lineTo(66, 6); g.stroke(); if (cls === 'line') { g.strokeStyle = '#c0c0c0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(66, 6); g.lineTo(72, -3); g.stroke(); } }
}
function buildDeploy() {
  const s = PL.s, M = MATCH;
  const team = s.team;
  $('#dpTitle').textContent = (PL.firstDeploy ? 'Deploy · ' : 'Redeploy · ') + M.map.name;
  $('#dpTix').innerHTML = `<span style="color:var(--friend)">${TEAMS[team].army} ${isFinite(M.tickets[team]) ? M.tickets[team] : '∞'}</span> &nbsp;·&nbsp; <span style="color:var(--foe)">${TEAMS[1 - team].army} ${isFinite(M.tickets[1 - team]) ? M.tickets[1 - team] : '∞'}</span>`;
  const cl = $('#classes'); cl.innerHTML = '';
  for (const c of CLASS_ORDER) {
    const d = document.createElement('div'); d.className = 'clsc' + (PL.cls === c ? ' on' : '');
    d.innerHTML = `<canvas></canvas><div><b>${CLASSES[c].name}</b><span>${CLASSES[c].desc}</span></div>`;
    classIcon(d.querySelector('canvas'), c, team);
    d.onclick = () => { PL.cls = c; saveLoadout(); buildDeploy(); };
    cl.appendChild(d);
  }
  const list = CLASSES[PL.cls].primary[TEAMS[team].key];
  if (!list.includes(PL.primary[PL.cls])) PL.primary[PL.cls] = list[0];
  const wsel = PL.primary[PL.cls], W = WEAPONS[wsel];
  const C = CLASSES[PL.cls];
  $('#loadout').innerHTML = `<div class="lbl2">Firelock</div><select id="wpSel">${list.map((w) => `<option value="${w}"${w === wsel ? ' selected' : ''}>${WEAPONS[w].name}${WEAPONS[w].nick ? ' ' + WEAPONS[w].nick : ''}</option>`).join('')}</select>
    <div class="wd">${W.desc} Loads in about ${Math.round(W.reload / (SET.reload === 'brisk' ? 1.6 : 1))} s${W.bayonet ? ', bayonet fixed' : ''}.</div>
    <div class="wd" style="margin-top:6px"><b style="font-style:normal">${MELEE[C.melee].name}</b> · ${C.gadgets.map((g) => GADGETS[g].name).join(' · ')}</div>`;
  $('#wpSel').onchange = (e) => { PL.primary[PL.cls] = e.target.value; saveLoadout(); buildDeploy(); };
  DP.pts = spawnPoints(team, s);
  if (!DP.sel || !DP.pts.find((p) => p.id === DP.sel.id && p.ok)) DP.sel = DP.pts.find((p) => p.ok && p.kind === 'flag') || DP.pts[0];
  else DP.sel = DP.pts.find((p) => p.id === DP.sel.id);
  const sp = $('#spawns'); sp.innerHTML = '';
  for (const p of DP.pts) {
    const b = document.createElement('button'); b.className = 'sp' + (p === DP.sel ? ' on' : ''); b.disabled = !p.ok;
    b.innerHTML = p.label + (p.ok ? '' : ' <small>' + p.why + '</small>');
    b.onclick = () => { DP.sel = p; buildDeploy(); };
    sp.appendChild(b);
  }
  drawBigMap($('#dpMap'), { spawns: DP.pts.filter((p) => p.ok), sel: DP.sel });
  updateDeployTimer();
}
function saveLoadout() { try { localStorage.setItem('shot-heard:loadout', JSON.stringify({ cls: PL.cls, primary: PL.primary })); } catch (e) {} }
function updateDeployTimer() {
  const s = PL.s;
  const wait = s.state === 'dead' ? Math.max(0, s.respawnT) : 0;
  $('#dpTimer').textContent = wait > 0 ? 'Reinforcements in ' + Math.ceil(wait) + ' s' : '';
  $('#deployBtn').disabled = wait > 0 || MATCH.over || s.state === 'up' && !PL.redeploy;
  if (s.state === 'up' && !PL.redeploy) $('#dpTimer').textContent = 'You are already in the field.';
}
$('#dpMap').onclick = (e) => {
  const r = e.target.getBoundingClientRect(), S = e.target.width;
  const mx = (e.clientX - r.left) / r.width * S, my = (e.clientY - r.top) / r.height * S;
  let best = null, bd = 1e9;
  for (const p of DP.pts) { if (!p.ok) continue; const [x, y] = mapXY(p.x, p.z, S); const d = Math.hypot(x - mx, y - my); if (d < bd) { bd = d; best = p; } }
  if (best && bd < S / 10) { DP.sel = best; buildDeploy(); }
};
$('#deployBtn').onclick = () => doDeploy();
function doDeploy() {
  const s = PL.s;
  if (!s || $('#deployBtn').disabled) return;
  audioInit();
  if (s.state === 'up') { killSoldier(s, null, 'Redeployed', false); s.respawnT = 0; }
  setLoadout(s, PL.cls, PL.primary[PL.cls]);
  const p = spawnPoints(s.team, s).find((q) => q.id === DP.sel.id && q.ok) || spawnPoints(s.team, s)[0];
  deploy(s, p);
  PL.redeploy = false;
  if (PL.firstDeploy) { PL.firstDeploy = false; showKeyHint(); drumCall(); }
  stopMusic();
  setState('play');
}
$('#dpTeam').onclick = () => {
  const s = PL.s;
  if (s.state === 'up') killSoldier(s, null, 'Changed sides', false);
  const old = s.team;
  s.team = 1 - old;
  // keep the sides even: a bot from the other side swaps over
  const b = SOLDIERS.find((o) => o.bot && o.team === s.team);
  if (b) { if (b.state !== 'dead') killSoldier(b, null, '', false); b.team = old; setLoadout(b, b.cls, botWeapon(b.cls, old)); }
  s.respawnT = 0;
  initAI();
  buildDeploy();
};
$('#dpQuit').onclick = () => quitToMenu();
function quitToMenu() { endMatch(); stopMusic(); startAttract(); setState('setup'); }
setInterval(() => { if (state === 'deploy') { updateDeployTimer(); if (Math.random() < 0.3) { DP.pts = spawnPoints(PL.s.team, PL.s); drawBigMap($('#dpMap'), { spawns: DP.pts.filter((p) => p.ok), sel: DP.sel }); } } }, 250);

// ---------- pause and end ----------
$('#pResume').onclick = () => setState('play');
$('#pDeploy').onclick = () => { PL.redeploy = true; setState('deploy'); };
$('#pSet').onclick = () => openSettings('pause');
$('#pHelp').onclick = () => openHelp('pause');
$('#pQuit').onclick = () => quitToMenu();
function buildEnd() {
  const M = MATCH, s = PL.s, team = s ? s.team : M.side;
  $('#endT').textContent = M.winner === team ? 'Victory' : 'Defeat';
  $('#endT').style.color = M.winner === team ? 'var(--gold)' : '#ff9a80';
  $('#endR').textContent = endLine(M.map, M.winner);
  const st = s ? s.sc : { score: 0, kills: 0, deaths: 0, caps: 0, revives: 0 };
  const rank = s ? SOLDIERS.filter((o) => o.team === team).sort((a, b) => b.sc.score - a.sc.score).indexOf(s) + 1 : 0;
  $('#endStats').innerHTML = [['Score', st.score], ['Enemies down', st.kills], ['Fell', st.deaths], ['Flags', st.caps], ['Revives', st.revives], ['Place', rank + ' of ' + M.size]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
}
$('#endAgain').onclick = () => beginBattle();
$('#endMenu').onclick = () => quitToMenu();

// ---------- settings ----------
let settingsFrom = 'title';
const SETTING_ROWS = [
  ['sens', 'Mouse sensitivity', 0.2, 3, 0.05], ['padSens', 'Stick sensitivity', 0.2, 3, 0.05], ['fov', 'Field of view', 60, 100, 1],
  ['vol', 'Volume', 0, 1, 0.01], ['music', 'Fife and drum', 0, 1, 0.01],
];
function openSettings(from) {
  settingsFrom = from;
  const L = $('#setList'); L.innerHTML = '';
  for (const [k, name, a, b, st] of SETTING_ROWS) {
    const row = document.createElement('div'); row.className = 'set';
    row.innerHTML = `<span>${name}</span><span><input type="range" min="${a}" max="${b}" step="${st}" value="${SET[k]}"> <span class="v">${(+SET[k]).toFixed(st < 1 ? 2 : 0)}</span></span>`;
    const inp = row.querySelector('input');
    inp.oninput = () => { SET[k] = +inp.value; row.querySelector('.v').textContent = (+inp.value).toFixed(st < 1 ? 2 : 0); if (k === 'fov') { camera.fov = SET.fov; camera.updateProjectionMatrix(); } setVolumes(); saveSet(); };
    L.appendChild(row);
  }
  const toggle = (k, name, opts) => {
    const row = document.createElement('div'); row.className = 'set';
    row.innerHTML = `<span>${name}</span><span class="seg">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(SET[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;
    for (const b of row.querySelectorAll('button')) b.onclick = () => { const v = b.dataset.v; SET[k] = v === 'true' ? true : v === 'false' ? false : v; saveSet(); if (k === 'quality') setQuality(SET.quality === 'low'); openSettings(from); };
    L.appendChild(row);
  };
  toggle('reload', 'Reload speed', [['authentic', 'Authentic'], ['brisk', 'Brisk']]);
  toggle('invert', 'Invert look', [[false, 'Off'], [true, 'On']]);
  toggle('quality', 'Picture', [['auto', 'Fine'], ['low', 'Fast']]);
  toggle('hints', 'Hints', [[true, 'On'], [false, 'Off']]);
  showScreen('settings');
}
$('#setDone').onclick = () => { if (settingsFrom === 'pause') showScreen('pause'); else showScreen('title'); };
function openHelp(from) {
  settingsFrom = from;
  const rows = [['Move', 'W A S D'], ['Look', 'Mouse'], ['Present (aim)', 'Right mouse'], ['Fire', 'Left mouse'], ['Load', 'R'], ['Bayonet / strike', 'F'],
    ['Run', 'Shift'], ['Crouch', 'C'], ['Jump / vault a wall', 'Space'], ['Use, revive, crew a gun, mount', 'E'], ['Weapons and gadgets', '1 – 4, wheel'],
    ['Spot an enemy / order squad to a flag', 'Q'], ['Map', 'M'], ['Scores', 'Tab'], ['Pause', 'Esc']];
  $('#helpBody').innerHTML = `<div class="cols">${rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
  <p><b>The drill.</b> Every firelock loads from the muzzle: half-cock, bite the cartridge, prime the pan, cast about, ram down, return the rammer. A musket takes about fourteen seconds, a rifle twenty. You can walk while loading, but running pauses the drill. Fire with the men around you for a volley, which flies truer. When you are empty and the enemy is close, the bayonet is quicker than the ramrod.</p>
  <p><b>Gunsmoke</b> hangs on the field and hides you from the enemy, and them from you. Stone walls, gabions and earthworks stop a ball; rail fences do not. Round shot bounces through ranks and breaks walls and houses.</p>
  <p><b>Gamepad:</b> LT present, RT fire, X load, RB bayonet, LB spot, A jump, B crouch, L3 run, Y sidearm, D-pad up use, D-pad left/right gadgets, Back scores, Start pause.</p>`;
  showScreen('help');
}
$('#helpDone').onclick = () => { if (settingsFrom === 'pause') showScreen('pause'); else showScreen('title'); };

// ---------- keys outside the game loop ----------
onKeyHook = (e) => {
  if (e.code === 'Escape') {
    if (state === 'play') setState('paused');
    else if (state === 'paused') setState('play');
  }
  if (e.code === 'Enter' && state === 'deploy') doDeploy();
};
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && state === 'play' && !DEBUG && !MATCH.over) setState('paused');
});
$('#c').addEventListener('click', () => { if (state === 'play') requestLock(); });
function padMenus() {
  if (!PAD.on) return;
  if (state === 'deploy' && PAD.pressed.has(0)) doDeploy();
  if (state === 'paused' && (PAD.pressed.has(0) || PAD.pressed.has(9))) setState('play');
  else if (state === 'play' && PAD.pressed.has(9)) setState('paused');
  if (state === 'title' && PAD.pressed.has(0)) $('#btnPlay').click();
  if (state === 'setup' && PAD.pressed.has(0)) $('#setupGo').click();
  if (state === 'end' && PAD.pressed.has(0)) $('#endAgain').click();
}
