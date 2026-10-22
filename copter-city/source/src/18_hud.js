// Copter City — the HUD: a low-res instrument panel (radar, gauges, gear), the call card and arrow, the radio log,
// toasts and speech, the big city map, and context prompts.

const HUD = { mapImg: null, mapScale: 1, cashT: 0, cashV: 0, log: [], np: null, npT: 0 };
const DASH_W = 480, DASH_H = 100;

function msg(text, kind = 'radio') {
  const box = $('#log');
  const e = el('div', 'rm ' + kind, (kind === 'radio' || kind === 'dispatch' ? '<b>DISPATCH</b> ' : kind === 'person' ? '' : '') + esc(text));
  box.appendChild(e);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => e.classList.add('old'), 7000);
  setTimeout(() => { if (e.parentNode) e.parentNode.removeChild(e); }, 12000);
}
function dispatch(text, c) {
  msg(text, 'dispatch');
  AUDIO.say(text);
}
let toastLast = '', toastLastT = 0;
function toast(text, kind = '') {
  if (text === toastLast && performance.now() - toastLastT < 1500) return;
  toastLast = text; toastLastT = performance.now();
  const box = $('#toasts');
  const e = el('div', 'toast ' + kind, esc(text));
  box.appendChild(e);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => e.classList.add('out'), 2600);
  setTimeout(() => { if (e.parentNode) e.parentNode.removeChild(e); }, 3300);
}
function bubble(text) {
  const b = $('#bubble'); b.textContent = '"' + text + '"'; b.hidden = false;
  clearTimeout(bubble.t); bubble.t = setTimeout(() => { b.hidden = true; }, 3200);
}

HUD.init = function () {
  const cv = $('#dash'); cv.width = DASH_W; cv.height = DASH_H;
  HUD.ctx = cv.getContext('2d');
  const mc = $('#bigMap');
  mc.addEventListener('pointerdown', (e) => {
    const r = mc.getBoundingClientRect(), s = HUD.bigS;
    const wx = (e.clientX - r.left) * (mc.width / r.width) / s + HUD.bigX0, wz = (e.clientY - r.top) * (mc.height / r.height) / s + HUD.bigX0;
    let best = null, bd = 60 * 60;
    for (const c of G.calls) { const p = c.markerPos ? c.markerPos() : c; const d = dist2(p.x, p.z, wx, wz); if (d < bd) { bd = d; best = c; } }
    if (best) { G.target = best; toast('Target: ' + best.title); drawBigMap(); }
  });
};
HUD.cash = function (n) { HUD.cashV += n; HUD.cashT = 2.5; };
HUD.nowPlaying = function (st, title) { HUD.np = { st, title }; HUD.npT = 6; };

// the city drawn once to an offscreen canvas, 1 px per 2 m
function buildMapImage() {
  const c = CITY, ext = c.size + 2 * 3 * P, x0 = -3 * P, s = 0.5;
  const cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(ext * s);
  const g = cv.getContext('2d');
  g.fillStyle = '#2a5a3a'; g.fillRect(0, 0, cv.width, cv.height);
  const X = (x) => (x - x0) * s;
  for (let bj = -3; bj < c.nb + 3; bj++) for (let bi = -3; bi < c.nb + 3; bi++) {
    if (waterBlock(bi, bj)) { g.fillStyle = '#1e4a78'; g.fillRect(X(bi * P) - 0.5, X(bj * P) - 0.5, P * s + 1, P * s + 1); continue; }
    const hgt = terrainH((bi + 0.5) * P, (bj + 0.5) * P);
    if (!inCityBlocks(bi, bj)) { g.fillStyle = hgt > 30 ? '#4a6a3a' : '#3a6a3a'; g.fillRect(X(bi * P), X(bj * P), P * s, P * s); }
  }
  g.fillStyle = '#4a4a50';
  for (const e of c.edges) { if (e.axis === 'x') g.fillRect(X(e.a.x), X(e.a.z - RH), P * s, RH * 2 * s); else g.fillRect(X(e.a.x - RH), X(e.a.z), RH * 2 * s, P * s); }
  for (const b of c.blocks) {
    if (b.water) continue;
    const col = { downtown: '#8a8a94', commercial: '#9a8a7a', apartments: '#a08a78', houses: '#5a8a4a', industrial: '#7a7a6a', park: '#3a8a3a', farm: '#8a8a3a', hangar: '#b89a3a', hospital: '#d8d8d8', fire: '#b84a3a', police: '#4a5aa8', landmark: '#a89ab8' }[b.kind] || '#777';
    g.fillStyle = col; g.fillRect(X(b.sx0), X(b.sz0), (b.sx1 - b.sx0) * s, (b.sz1 - b.sz0) * s);
  }
  g.fillStyle = 'rgba(0,0,0,.35)';
  for (const B of c.buildings) g.fillRect(X(B.x0), X(B.z0), (B.x1 - B.x0) * s, (B.z1 - B.z0) * s);
  HUD.mapImg = cv; HUD.mapX0 = x0; HUD.mapS = s;
}

// ---------- the instrument panel ----------
function drawDash() {
  const g = HUD.ctx, H = HELI, st = H.st, W = DASH_W, Hh = DASH_H;
  g.clearRect(0, 0, W, Hh);
  // panel
  g.fillStyle = '#1a1c1e'; g.fillRect(0, 8, W, Hh - 8);
  g.fillStyle = '#2a2d30'; g.fillRect(0, 8, W, 2);
  g.fillStyle = '#101112'; g.fillRect(0, Hh - 2, W, 2);
  g.font = '12px VT323, monospace'; g.textBaseline = 'middle';
  // radar
  const rx = 50, ry = 54, rr0 = 42;
  g.save(); g.beginPath(); g.arc(rx, ry, rr0, 0, TAU); g.clip();
  g.fillStyle = '#0a1a10'; g.fillRect(rx - rr0, ry - rr0, rr0 * 2, rr0 * 2);
  const range = OPTS.radar || 420, ks = rr0 / range;
  if (HUD.mapImg) {
    g.translate(rx, ry); g.rotate(H.yaw); g.scale(ks / HUD.mapS, ks / HUD.mapS);
    g.globalAlpha = 0.85; g.imageSmoothingEnabled = false;
    g.drawImage(HUD.mapImg, -(H.x - HUD.mapX0) * HUD.mapS, -(H.z - HUD.mapX0) * HUD.mapS);
    g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  const toR = (x, z) => { const dx = (x - H.x) * ks, dz = (z - H.z) * ks; const c = Math.cos(H.yaw), s = Math.sin(H.yaw); return [rx + dx * c - dz * s, ry + dx * s + dz * c]; };
  for (const p of CITY.pads) { if (p.dead) continue; const [x, y] = toR(p.x, p.z); g.fillStyle = p.kind === 'hospital' ? '#ff4a4a' : p.kind === 'home' ? '#ffd23a' : '#c8c8c8'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); }
  for (const f of FIRE.list) { const [x, y] = toR(f.x, f.z); g.fillStyle = (G.t * 4) % 1 < 0.5 ? '#ff7a2a' : '#ffd040'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); }
  g.restore();
  // calls on the rim when out of range
  for (const c of G.calls) {
    const p = c.markerPos ? c.markerPos() : c;
    if (!p) continue;
    let [x, y] = toR(p.x, p.z);
    const d = Math.hypot(x - rx, y - ry);
    if (d > rr0 - 3) { x = rx + (x - rx) / d * (rr0 - 3); y = ry + (y - ry) / d * (rr0 - 3); }
    g.fillStyle = c.def.color; const big = c === G.target ? 3 : 2;
    g.fillRect(Math.round(x) - big, Math.round(y) - big, big * 2, big * 2);
    if (c === G.target && (G.t * 3) % 1 < 0.5) { g.strokeStyle = '#fff'; g.strokeRect(Math.round(x) - 4.5, Math.round(y) - 4.5, 9, 9); }
  }
  g.strokeStyle = '#4a5a4a'; g.lineWidth = 2; g.beginPath(); g.arc(rx, ry, rr0, 0, TAU); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(rx, ry - 5); g.lineTo(rx + 3.5, ry + 4); g.lineTo(rx - 3.5, ry + 4); g.fill();
  // heading north mark
  g.fillStyle = '#ff5a5a'; g.fillText('N', rx + Math.sin(H.yaw) * (rr0 - 6) - 3, ry - Math.cos(H.yaw) * (rr0 - 6));
  // gauges
  const gauge = (x, label, v, max, unit, warn) => {
    g.fillStyle = '#0c0d0e'; g.fillRect(x, 16, 62, 46);
    g.strokeStyle = '#3a3e42'; g.lineWidth = 1; g.strokeRect(x + 0.5, 16.5, 61, 45);
    g.fillStyle = '#8a9a8a'; g.fillText(label, x + 4, 23);
    g.fillStyle = warn ? ((G.t * 3) % 1 < 0.5 ? '#ff4a4a' : '#802020') : '#9aff7a';
    g.font = '22px VT323, monospace'; g.fillText(String(Math.round(v)), x + 4, 41); g.font = '12px VT323, monospace';
    g.fillStyle = '#6a7a6a'; g.fillText(unit, x + 44, 41);
    g.fillStyle = '#2a2e2a'; g.fillRect(x + 4, 54, 54, 4);
    g.fillStyle = warn ? '#ff4a4a' : '#5ac83a'; g.fillRect(x + 4, 54, 54 * clamp(v / max, 0, 1), 4);
  };
  const agl = Math.max(0, altAGL()), kmh = speedH() * 3.6;
  gauge(100, 'SPEED', kmh, st.speed * 3.6, 'km/h', false);
  gauge(166, 'ALT', agl, 200, 'm', agl < 6 && !H.landed && speedH() > 10);
  // vertical speed and compass tape
  g.fillStyle = '#0c0d0e'; g.fillRect(100, 66, 128, 26); g.strokeStyle = '#3a3e42'; g.strokeRect(100.5, 66.5, 127, 25);
  const hd = ((-H.yaw * 180 / Math.PI) % 360 + 360) % 360;
  g.save(); g.beginPath(); g.rect(101, 67, 126, 24); g.clip();
  for (let a = -60; a <= 60; a += 15) {
    const deg = Math.round((hd + a) / 15) * 15, x = 164 + (deg - hd) * 1.0;
    g.fillStyle = '#6a7a6a'; g.fillRect(Math.round(x), 70, 1, deg % 45 === 0 ? 6 : 3);
    if (deg % 45 === 0) { const lbl = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[((deg % 360) + 360) % 360]; g.fillStyle = '#9aff7a'; g.fillText(lbl, Math.round(x) - lbl.length * 3, 83); }
  }
  g.restore();
  g.fillStyle = '#ffd23a'; g.fillRect(163, 67, 2, 5);
  // vsi
  g.fillStyle = '#0c0d0e'; g.fillRect(232, 16, 16, 76); g.strokeStyle = '#3a3e42'; g.strokeRect(232.5, 16.5, 15, 75);
  const vs = clamp(H.vy / 12, -1, 1); g.fillStyle = vs > 0 ? '#5ac83a' : '#e8a03a';
  g.fillRect(235, 54 - Math.max(0, vs) * 36, 10, Math.abs(vs) * 36);
  g.fillStyle = '#6a7a6a'; g.fillRect(234, 54, 12, 1);
  // fuel and hull
  const bar = (x, y, label, f, col) => {
    g.fillStyle = '#8a9a8a'; g.fillText(label, x, y + 4);
    g.fillStyle = '#0c0d0e'; g.fillRect(x + 30, y, 70, 8);
    const low = f < 0.2;
    g.fillStyle = low && (G.t * 3) % 1 < 0.5 ? '#ff4a4a' : col; g.fillRect(x + 31, y + 1, 68 * clamp(f, 0, 1), 6);
  };
  bar(254, 18, 'FUEL', H.fuel / st.fuel, '#e8c83a');
  bar(254, 32, 'HULL', H.hp / st.hp, '#5ac83a');
  g.fillStyle = '#8a9a8a'; g.fillText('RPM', 254, 50);
  g.fillStyle = H.engine ? '#9aff7a' : '#ff6a3a'; g.fillText(H.engine ? Math.round(H.rpm * 100) + '%' : 'OFF', 284, 50);
  // seats
  for (let i = 0; i < st.seats; i++) {
    const s = H.seats[i];
    g.fillStyle = s ? (s.kind === 'patient' ? '#ff4a6a' : s.kind === 'passenger' ? '#4ad8ff' : '#ffd23a') : '#2a2e2a';
    g.fillRect(320 + (i % 5) * 7, 44 + Math.floor(i / 5) * 8, 5, 6);
  }
  // equipment slots
  const ex = 254;
  EQUIP_ORDER.forEach((id, i) => {
    const has = st.equip.includes(id), sel = H.equip === id, x = ex + i * 45, y = 62;
    g.fillStyle = sel ? '#3a4a2a' : '#0c0d0e'; g.fillRect(x, y, 42, 30);
    g.strokeStyle = sel ? '#9aff7a' : '#3a3e42'; g.strokeRect(x + 0.5, y + 0.5, 41, 29);
    g.fillStyle = has ? (sel ? '#ffffff' : '#9aa89a') : '#3a3e3a';
    g.fillText(EQUIP[id].key + ' ' + EQUIP[id].short, x + 3, y + 8);
    let info = '';
    if (id === 'bucket' && has) info = Math.round(H.bucket.water) + 'L';
    if (id === 'gas' && has) info = 'x' + H.gas;
    if (id === 'spot' && has) info = H.spot ? 'ON' : 'off';
    if (id === 'ladder' && has) info = H.ladder.len > 6 ? 'DOWN' : H.ladder.len > 0.3 ? '...' : 'up';
    if (id === 'mega' && has) info = GEAR.megaT > 0 ? '...' : 'ready';
    if (info) { g.fillStyle = sel ? '#9aff7a' : '#6a7a6a'; g.fillText(info, x + 3, y + 21); }
    if (id === 'bucket' && has) { g.fillStyle = '#1a2a3a'; g.fillRect(x + 28, y + 14, 10, 12); g.fillStyle = '#4a8ac8'; const f = H.bucket.water / st.bucket; g.fillRect(x + 28, y + 26 - 12 * f, 10, 12 * f); }
  });
  // warnings
  const warns = [];
  if (H.fuel / st.fuel < 0.15) warns.push('LOW FUEL');
  if (H.hp / st.hp < 0.25) warns.push('HULL');
  if (!H.engine && !H.landed) warns.push('ENGINE OUT');
  if (agl < 4 && !H.landed && speedH() > 15) warns.push('PULL UP');
  if (warns.length && (G.t * 2.5) % 1 < 0.6) { g.fillStyle = '#ff3a3a'; g.font = '16px VT323, monospace'; g.fillText(warns.join('  '), 360, 22); g.font = '12px VT323, monospace'; }
  // the flight model, money
  g.fillStyle = '#6a7a6a'; g.fillText(OPTS.flight === 'sim' ? 'SIM  COLL ' + Math.round(H.coll * 100) + '%' : 'ARCADE', 360, 50);
  g.fillStyle = '#8a9a8a'; g.fillText(st.name.toUpperCase(), 360, 38);
}

// ---------- each frame ----------
HUD.update = function (dt) {
  const H = HELI;
  if (G.where === 'heli') drawDash();
  $('#dash').hidden = G.where !== 'heli';
  // the call card
  const c = G.target, card = $('#call');
  if (c) {
    card.hidden = false;
    const p = c.markerPos ? c.markerPos() : c;
    const fx = G.where === 'foot' ? PILOT.x : H.x, fz = G.where === 'foot' ? PILOT.z : H.z;
    const d = p ? dist(fx, fz, p.x, p.z) : 0;
    $('#callTag').textContent = c.def.tag; $('#callTag').style.background = c.def.color;
    $('#callTitle').textContent = c.title;
    $('#callStage').textContent = c.stage || '';
    const tl = c.def.time && !c.picked && c.timed !== false ? '  ·  ' + fmtSec(c.def.time - c.t) + ' left' : '';
    $('#callDist').textContent = (d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m') + tl;
    // arrow relative to where we're facing
    const yaw = G.where === 'foot' ? CAM.yaw + CAM.userYaw : H.yaw;
    const a = p ? Math.atan2(p.x - fx, p.z - fz) : 0;
    const rel = -(a - (yaw + Math.PI));
    $('#callArrow').style.transform = `rotate(${rel}rad)`;
    $('#callArrow').style.borderBottomColor = c.def.color;
  } else card.hidden = true;
  // the other calls, small
  const others = G.calls.filter((k) => k !== c && k.state === 'open');
  $('#calls').innerHTML = others.slice(0, 4).map((k) => `<div><i style="background:${k.def.color}">${k.def.tag}</i> ${esc(k.title)}</div>`).join('') + (others.length ? '<div class="dim">Tab: next call</div>' : '');
  // top right
  $('#money').textContent = G.free ? 'FREE FLIGHT' : fmtMoney(G.career.money);
  $('#clock').textContent = fmtClock(G.hour);
  const cs = cityStat();
  $('#goal').textContent = G.free ? CITY.def.name : `${CITY.def.name}  ·  ${cs.passed ? 'Goal met' : `Calls ${cs.done}/${CITY.def.goal}`}`;
  if (HUD.cashT > 0) { HUD.cashT -= dt; const e = $('#cash'); e.hidden = false; e.textContent = (HUD.cashV >= 0 ? '+' : '') + fmtMoney(HUD.cashV); e.className = HUD.cashV >= 0 ? 'good' : 'bad'; if (HUD.cashT <= 0) { e.hidden = true; HUD.cashV = 0; } }
  // now playing
  if (HUD.npT > 0) { HUD.npT -= dt; const e = $('#np'); e.hidden = false; e.innerHTML = `<b>${esc(HUD.np.st)}</b>${HUD.np.title ? '<br>' + esc(HUD.np.title) : ''}`; if (HUD.npT <= 0) e.hidden = true; }
  // prompts
  const pr = [];
  if (G.where === 'heli') {
    if (H.landed && !H.crashing) pr.push(['E', 'Get out']);
    if (H.landed && H.pad && H.pad.kind === 'home') pr.push(['Enter', 'Hangar']);
    if (!H.engine && H.landed && H.fuel > 0) pr.push(['Space', 'Start up and lift']);
  } else {
    if (dist(PILOT.x, PILOT.z, H.x, H.z) < H.model.r * 0.6 + 3) pr.push(['E', 'Get in']);
    else if (pedsNear(PILOT.x, PILOT.z, 3).length) pr.push(['E', 'Chat']);
  }
  const ptxt = pr.map(([k, t]) => `<span class="pp"><span class="k">${Input.mode === 'pad' ? ({ E: 'Y', Enter: 'A', Space: 'RT' }[k] || k) : k}</span>${t}</span>`).join('');
  if (ptxt !== HUD.lastPr) { $('#prompt').innerHTML = ptxt; HUD.lastPr = ptxt; }
  if (UI.isOpen('mapBig')) drawBigMap();
};

// ---------- the big map ----------
function drawBigMap() {
  const cv = $('#bigMap'), g = cv.getContext('2d');
  const ext = CITY.size + 2 * 3 * P, S = Math.min(innerWidth * 0.9, innerHeight * 0.82);
  cv.width = cv.height = Math.round(S);
  const s = S / ext, x0 = -3 * P; HUD.bigS = s; HUD.bigX0 = x0;
  const X = (x) => (x - x0) * s;
  g.imageSmoothingEnabled = false;
  g.drawImage(HUD.mapImg, 0, 0, S, S);
  g.font = '15px VT323, monospace'; g.textBaseline = 'middle';
  for (const l of CITY.landmarks) { g.fillStyle = 'rgba(0,0,0,.6)'; const w = g.measureText(l.name).width; g.fillRect(X(l.x) - w / 2 - 3, X(l.z) - 8, w + 6, 15); g.fillStyle = '#e8e0ff'; g.fillText(l.name, X(l.x) - w / 2, X(l.z)); }
  for (const p of CITY.pads) {
    if (p.dead) continue;
    g.fillStyle = p.kind === 'hospital' ? '#ff4a4a' : p.kind === 'home' ? '#ffd23a' : '#d8d8d8';
    g.fillRect(X(p.x) - 4, X(p.z) - 4, 8, 8);
    if (p.kind === 'hospital' || p.kind === 'home') { g.fillStyle = '#fff'; g.fillText(p.kind === 'home' ? 'HANGAR' : p.name, X(p.x) + 7, X(p.z)); }
  }
  for (const f of FIRE.list) { g.fillStyle = '#ff7a2a'; g.beginPath(); g.arc(X(f.x), X(f.z), 5, 0, TAU); g.fill(); }
  for (const t of CITY.tokens) if (!t.got && OPTS.showTokens) { g.fillStyle = '#e8b820'; g.fillRect(X(t.x) - 2, X(t.z) - 2, 4, 4); }
  for (const c of G.calls) {
    const p = c.markerPos ? c.markerPos() : c;
    if (!p) continue;
    g.fillStyle = c.def.color; g.fillRect(X(p.x) - 6, X(p.z) - 6, 12, 12);
    g.strokeStyle = c === G.target ? '#fff' : '#000'; g.lineWidth = 2; g.strokeRect(X(p.x) - 7, X(p.z) - 7, 14, 14);
    g.fillStyle = '#000'; const w = g.measureText(c.def.tag).width; g.fillRect(X(p.x) + 9, X(p.z) - 8, w + 6, 15); g.fillStyle = c.def.color; g.fillText(c.def.tag, X(p.x) + 12, X(p.z));
  }
  const hx = G.where === 'foot' ? PILOT.x : HELI.x, hz = G.where === 'foot' ? PILOT.z : HELI.z;
  g.save(); g.translate(X(hx), X(hz)); g.rotate(-HELI.yaw);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.stroke();
  g.restore();
}
