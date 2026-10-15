// Revenant Protocol — HUD, messages, automap overlay, PDA

const HUD = { msgs: [], last: {} };
function msg(text) {
  const el = document.createElement('div');
  el.textContent = text;
  $('#msgs').appendChild(el);
  HUD.msgs.push({ el, t: 3.2 });
  while (HUD.msgs.length > 4) HUD.msgs.shift().el.remove();
}
let tintT = 0;
function tint(color) { const t = $('#tint'); t.style.background = color; t.style.opacity = 1; tintT = 0.25; }
let popT = 0;
function popObj(text) { const p = $('#objpop'); p.textContent = text; p.classList.add('on'); popT = 2.6; }
function setText(id, v) { if (HUD.last[id] !== v) { HUD.last[id] = v; $(id).textContent = v; } }
function setCls(id, cls, on) { const k = id + cls; if (HUD.last[k] !== on) { HUD.last[k] = on; $(id).classList.toggle(cls, on); } }

function updateHud(dt) {
  for (let i = HUD.msgs.length - 1; i >= 0; i--) { const m = HUD.msgs[i]; m.t -= dt; if (m.t < 0.6) m.el.style.opacity = Math.max(0, m.t / 0.6); if (m.t <= 0) { m.el.remove(); HUD.msgs.splice(i, 1); } }
  if (tintT > 0) { tintT -= dt; $('#tint').style.opacity = Math.max(0, tintT / 0.25); }
  if (popT > 0) { popT -= dt; if (popT <= 0) $('#objpop').classList.remove('on'); }
  const sh = Math.ceil(P.shield), hp = Math.max(0, Math.ceil(P.health));
  setText('#shNum', sh); setText('#hpNum', hp);
  const sw = Math.min(100, sh / 2) + '%', hw = hp + '%';
  if (HUD.last.sw !== sw) { HUD.last.sw = sw; $('#shBar i').style.width = sw; }
  if (HUD.last.hw !== hw) { HUD.last.hw = hw; $('#hpBar i').style.width = hw; }
  $('#lowhp').style.opacity = hp < 30 && !P.dead ? (0.4 + 0.3 * Math.sin(G.time * 5)) * (1 - hp / 30) : 0;
  setText('#lives', 'LIVES ' + P.lives);
  setCls('#kr', 'on', P.keys.has('r')); setCls('#kb', 'on', P.keys.has('b')); setCls('#ky', 'on', P.keys.has('y'));
  const w = WEAPON[P.cur];
  setText('#wname', w.name);
  setText('#wammo', w.ammo ? String(P.ammo[w.ammo]) : '--');
  setText('#walt', w.alt && w.alt.ammo ? 'ALT ' + AMMO_NAME[w.alt.ammo] + ' ' + P.ammo[w.alt.ammo] : w.ammo ? AMMO_NAME[w.ammo] : '');
  setCls('#gLamp', 'on', P.lampOn); setCls('#gLamp', 'have', true);
  setCls('#gMask', 'have', P.gear.has('mask')); setCls('#gMask', 'on', P.maskOn);
  setCls('#gCleat', 'have', P.gear.has('cleats')); setCls('#gCleat', 'on', P.cleatsOn);
  setText('#batt', 'BATT ' + Math.ceil(P.battery) + '%');
  const b = [];
  if (P.boostW > 0) b.push('WEAPON SUPERCHARGE ' + Math.ceil(P.boostW));
  if (P.boostS > 0) b.push('SHIELD SUPERCHARGE ' + Math.ceil(P.boostS));
  if (G.god) b.push('GOD');
  setText('#boost', b.join('\n'));
  // context prompt
  let pr = '';
  if (!isTouch) {
    const [fx, fz] = playerForward();
    for (const u of USABLES) { if (u.usable && !u.done && Math.hypot(u.x - P.x, u.z - P.z) < 2.4 && ((u.x - P.x) * fx + (u.z - P.z) * fz) > 0.3) { pr = 'E  ' + (u.t === 'pump' ? 'PLANT CHARGE' : u.t === 'console' ? 'ACCESS CONSOLE' : 'USE SWITCH'); break; } }
    if (!pr) for (let t = 0.5; t <= 2.3; t += 0.3) { const c = cellAt(P.x + fx * t, P.z + fz * t); if (c.solid) break; if (c.door && c.door.open < 0.5 && !c.door.secret) { pr = 'E  OPEN'; break; } }
  }
  setText('#prompt', pr);
  if (G.mapOn) drawMap();
}

// ---------- automap ----------
const MAP = { cv: $('#map'), ctx: null };
MAP.ctx = MAP.cv.getContext('2d');
function resizeMap() { const d = Math.min(devicePixelRatio || 1, 2); MAP.cv.width = innerWidth * d; MAP.cv.height = innerHeight * d; MAP.dpr = d; }
function toggleMap(on) { G.mapOn = on === undefined ? !G.mapOn : on; document.body.classList.toggle('map', G.mapOn); }
function drawMap() {
  const g = MAP.ctx, W = MAP.cv.width, H = MAP.cv.height, d = MAP.dpr;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, 0, W, H);
  const s = (14 * G.mapZoom * d) / CELL; // px per metre
  const ox = W / 2 - P.x * s, oz = H / 2 - P.z * s;
  const X = (x) => ox + x * s, Z = (z) => oz + z * s;
  const py = P.y;
  g.lineCap = 'round';
  // floors: faint fill by height relative to the player
  for (const c of LV.cells) {
    if (c.solid || !c.seen) continue;
    const dh = floorOf(c) - py;
    const a = clamp(0.22 - Math.abs(dh) * 0.03, 0.04, 0.22);
    g.fillStyle = c.d.liq === 'lava' ? 'rgba(255,90,20,.35)' : c.d.liq ? 'rgba(60,160,200,' + (a + 0.08) + ')' : c.d.gas ? 'rgba(120,200,60,' + (a + 0.06) + ')' : 'rgba(255,190,90,' + a + ')';
    g.fillRect(X(c.x * CELL), Z(c.z * CELL), CELL * s + 0.5, CELL * s + 0.5);
  }
  const line = (x0, z0, x1, z1, col, w) => { g.strokeStyle = col; g.lineWidth = w * d; g.beginPath(); g.moveTo(X(x0), Z(z0)); g.lineTo(X(x1), Z(z1)); g.stroke(); };
  for (const c of LV.cells) {
    if (c.solid || !c.seen) continue;
    const x0 = c.x * CELL, z0 = c.z * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
    const near = Math.abs(floorOf(c) - py) < 2.5;
    const wallC = near ? '#ffbf4a' : 'rgba(255,191,74,.4)';
    const edges = [[1, 0, x1, z0, x1, z1], [-1, 0, x0, z0, x0, z1], [0, 1, x0, z1, x1, z1], [0, -1, x0, z0, x1, z0]];
    for (const [di, dj, ax, az, bx, bz] of edges) {
      const n = cellIJ(c.x + di, c.z + dj);
      if (n.solid) line(ax, az, bx, bz, wallC, 1.6);
      else if (n.door !== c.door && (n.door || c.door)) { const dr = n.door || c.door; if (dr.secret && !dr.open) line(ax, az, bx, bz, wallC, 1.6); else line(ax, az, bx, bz, dr.key ? { r: '#ff4a3a', b: '#4a90ff', y: '#ffd83a' }[dr.key] : '#6fd6ff', 2.4); }
      else if (n.lift !== c.lift && (n.lift || c.lift)) line(ax, az, bx, bz, '#c58cff', 1.4);
      else if (Math.abs(floorOf(n) - floorOf(c)) > 0.3 && (di > 0 || dj > 0)) line(ax, az, bx, bz, near ? 'rgba(255,191,74,.45)' : 'rgba(255,191,74,.2)', 1);
      if (c.d.tag === 'exit') { g.fillStyle = 'rgba(80,255,120,.35)'; g.fillRect(X(x0), Z(z0), CELL * s, CELL * s); }
    }
  }
  // player arrow
  const [fx, fz] = playerForward();
  const px = X(P.x), pz = Z(P.z), L = 12 * d;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(px + fx * L, pz + fz * L); g.lineTo(px - fx * L * 0.6 + fz * L * 0.5, pz - fz * L * 0.6 - fx * L * 0.5); g.lineTo(px - fx * L * 0.6 - fz * L * 0.5, pz - fz * L * 0.6 + fx * L * 0.5); g.closePath(); g.fill();
  g.font = (14 * d) + 'px "Share Tech Mono", monospace'; g.fillStyle = '#8c8c94';
  g.textAlign = 'right';
  g.fillText(MISSIONS[G.mission].name + '   ' + (isTouch ? 'MAP to close' : 'TAB close · +/- zoom'), W - 16 * d, 24 * d);
  g.textAlign = 'left';
}

// ---------- PDA ----------
let pdaTab = 'obj';
function openPda() {
  if (G.state !== 'play') return;
  setState('pda'); releasePointer();
  $('#pda').hidden = false;
  renderPda();
}
function closePda() { $('#pda').hidden = true; setState('play'); grabPointer(); }
function renderPda() {
  const M = MISSIONS[G.mission];
  $('#pdaNum').textContent = 'MISSION ' + (G.mission + 1) + ' · ' + M.planet.toUpperCase();
  $('#pdaName').textContent = M.name;
  $$('#pda .tabs button').forEach((b) => b.classList.toggle('sel', b.dataset.tab === pdaTab));
  const body = $('#pdaBody');
  if (pdaTab === 'obj') {
    body.innerHTML = '<ul>' + G.obj.map((o) => `<li class="${o.done ? 'done' : ''}">${o.text}</li>`).join('') + '</ul>' +
      `<div class="stats"><span>Enemies</span><span>${G.stats.kills} / ${G.stats.total}</span><span>Secrets</span><span>${G.stats.secrets} / ${G.stats.secretsTotal}</span><span>Time</span><span>${fmtTime(G.stats.time)}</span><span>Difficulty</span><span>${DIFF[G.diff].name}</span></div>`;
  } else if (pdaTab === 'inv') {
    const ws = WEAPONS.map((w) => `<div class="${P.weapons.has(w.id) ? '' : 'no'}">${w.key.slice(-1)} ${w.name}${w.ammo && P.weapons.has(w.id) ? ' · ' + P.ammo[w.ammo] : ''}</div>`).join('');
    const items = [['Shield', Math.ceil(P.shield)], ['Health', Math.ceil(P.health)], ['Battery', Math.ceil(P.battery) + '%'], ['Lives', P.lives],
      ['Gas mask [G]', P.gear.has('mask') ? (P.maskOn ? 'ON' : 'off') : '-'], ['Ice cleats [V]', P.gear.has('cleats') ? (P.cleatsOn ? 'ON' : 'off') : '-'],
      ['Keys', [...P.keys].map((k) => ({ r: 'red', b: 'blue', y: 'yellow' }[k])).join(', ') || '-'],
      ['Ammo', Object.entries(P.ammo).filter(([, v]) => v > 0).map(([k, v]) => AMMO_NAME[k].toLowerCase() + ' ' + v).join(', ') || '-']];
    body.innerHTML = '<h3 style="margin-top:12px">WEAPONS</h3><div class="inv">' + ws + '</div><h3>STATUS</h3><div class="inv">' + items.map(([k, v]) => `<div>${k}: ${v}</div>`).join('') + '</div>';
  } else body.innerHTML = '<p>' + M.brief + '</p>';
}
function fmtTime(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
$$('#pda .tabs button').forEach((b) => b.addEventListener('click', () => { pdaTab = b.dataset.tab; renderPda(); }));
