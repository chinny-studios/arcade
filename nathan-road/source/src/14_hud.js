// 14_hud: everything drawn in HTML: clock and money, the street you're on, the compass with errand and landmark
// markers, prompts, toasts and banners, dialogue, the map, the notebook (places, errands, famous views, photos),
// pause and settings, the title menu and the touch controls.
function toast(s) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = s;
  const box = $('#toasts'); box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 900); }, 4200);
}
bus.on('toast', toast);
let bannerT = 0;
function banner(k, l, z) {
  $('#bk').textContent = k; $('#bl').textContent = l; $('#bz').textContent = z || '';
  $('#banner').classList.add('on'); clearTimeout(bannerT);
  bannerT = setTimeout(() => $('#banner').classList.remove('on'), 3600);
}
function fadeOut(fn, ms = 450) { const f = $('#fade'); f.style.opacity = 1; setTimeout(() => { fn && fn(); }, ms); }
function fadeIn() { setTimeout(() => { $('#fade').style.opacity = 0; }, 80); }

// ---------------------------------------------------------------- dialogue
function openDialog(who, zh, text, opts = []) {
  DLG = { opts: (opts || []).filter(Boolean) };
  $('#dWho').innerHTML = esc(who || '') + (zh ? `<i>${esc(zh)}</i>` : '');
  $('#dSay').textContent = text;
  const box = $('#dOpts'); box.innerHTML = '';
  DLG.opts.forEach(([label], i) => { const b = document.createElement('button'); b.textContent = `${i + 1}. ${label}`; b.onclick = (e) => { e.stopPropagation(); chooseOpt(i); }; box.appendChild(b); });
  $('#dMore').textContent = DLG.opts.length ? '' : (document.body.classList.contains('touch') ? 'Tap to close' : 'E to close');
  $('#dlg').hidden = false;
  document.body.classList.add('modal');
  bus.emit('sfx', 'blip');
  if (DLG.opts.length && Input.locked && !document.body.classList.contains('touch')) { DLG.relock = true; Input.unlock(); }
}
function chooseOpt(i) {
  const o = DLG && DLG.opts[i]; if (!o) return;
  const keep = DLG; closeDialog();
  if (o[1]) o[1]();
  if (keep.relock && !DLG) relock();
}
function closeDialog() {
  if (!DLG) return;
  const relockAfter = DLG.relock;
  DLG = null; $('#dlg').hidden = true; document.body.classList.remove('modal');
  if (relockAfter) relock();
}
$('#dlg').addEventListener('click', () => { if (DLG && !DLG.opts.length) closeDialog(); });
function relock() { if (!document.body.classList.contains('touch') && GAME.state === 'play') Input.lock($('#c')); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- panels
const PANELS = ['journal', 'pause', 'settings', 'help', 'credits', 'lift', 'map'];
let panelOpen = null;
function openPanel(id) {
  for (const p of PANELS) $('#' + p).hidden = p !== id;
  panelOpen = id;
  document.body.classList.add('modal');
  Input.unlock();
}
function closePanel(id, back) {
  $('#' + id).hidden = true; panelOpen = null;
  if (back) { openPanel(back); return; }
  document.body.classList.remove('modal');
  if (GAME.state === 'play') relock();
}
function openPause() { if (GAME.state === 'play') openPanel('pause'); }
bus.on('lock', (on) => {
  if (!on && GAME.state === 'play' && !panelOpen && !DLG && !document.body.classList.contains('touch')) openPause();
});
addEventListener('keydown', (e) => {
  if (panelOpen) Input.pressed.delete(e.code);       // keys that close a panel don't also act in the game
  if (e.code === 'Escape' && panelOpen && panelOpen !== 'pause') { const back = ['settings', 'help'].includes(panelOpen) && GAME.state === 'play' ? 'pause' : null; closePanel(panelOpen, GAME.state === 'title' ? null : back); }
  else if (e.code === 'Escape' && panelOpen === 'pause') closePanel('pause');
  else if ((e.code === 'KeyM' && panelOpen === 'map') || (e.code === 'KeyJ' && panelOpen === 'journal')) closePanel(panelOpen);
});
$('#c').addEventListener('click', () => { if (GAME.state === 'play' && !panelOpen && !DLG && !Input.locked) relock(); });

// ---------------------------------------------------------------- the notebook
let jTab = 'lm', jSel = null;
function openJournal(tab) { if (tab) jTab = tab; renderJournal(); openPanel('journal'); }
function renderJournal() {
  document.querySelectorAll('#jTabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === jTab));
  const el = $('#jBody');
  if (jTab === 'lm') {
    const n = Object.keys(ST.found).length;
    let h = `<p>${n} of ${LANDMARKS.length} places found. Walk near a landmark to add it here.</p><div class="lmlist">`;
    for (const L of LANDMARKS) { const f = ST.found[L.id]; h += `<div class="lm ${f ? 'found' : 'locked'}" data-id="${L.id}"><b>${f ? esc(L.en) : '???'}</b>${f ? `<i>${esc(L.zh)}</i>` : ''}</div>`; }
    h += '</div>';
    const L = jSel && LM_BY[jSel];
    if (L && ST.found[L.id]) h += `<div class="plaque"><b style="font-weight:400;color:var(--gold);font-size:24px">${esc(L.en)}</b> <span class="zh" style="color:var(--teal)">${esc(L.zh)}</span><br>${esc(L.text)}</div>`;
    el.innerHTML = h;
    el.querySelectorAll('.lm').forEach((d) => d.onclick = () => { jSel = d.dataset.id; renderJournal(); });
  } else if (jTab === 'er') {
    let h = `<p>Money: <span style="color:var(--teal)">HK$${ST.money.toFixed(1)}</span>${ST.octopus ? `, and HK$${ST.octopus.balance.toFixed(1)} on your Octopus card` : ''}. Carrying: ${Object.keys(ST.items).map((k) => esc(ITEM_NAMES[k] || k)).join(', ') || 'nothing'}.</p>`;
    let any = false;
    for (const e of ERRANDS) {
      const s = erStage(e.id); if (!s) continue; any = true;
      const done = s === 'done';
      h += `<div class="vp ${done ? 'done' : ''}" style="margin:6px 0"><b>${done ? '✓' : '•'} ${esc(e.title)}</b></div><p style="color:var(--dim);margin-left:18px">${done ? 'Done.' : esc(e.steps[Math.min(s, e.steps.length) - 1])}${!done ? ` <button data-track="${e.id}" style="font-size:16px;padding:0 8px">${ST.track === e.id ? 'tracking' : 'track'}</button>` : ''}</p>`;
    }
    if (!any) h += '<p style="color:var(--dim)">No errands yet. Talk to people: the guard in Milton Mansion, the tailor in its arcade, someone in Kowloon Park, a visitor at the Clock Tower, a café on Peking Road, a photographer on the Avenue of Stars.</p>';
    h += `<h3>Keys and favours</h3><p style="color:var(--dim)">${ST.roofKey ? 'Roof key for Milton Mansion. ' : ''}${ST.zoom ? 'Kit\'s zoom lens. ' : ''}${ST.freeRide ? 'A free Star Ferry crossing. ' : ''}${!ST.roofKey && !ST.zoom && !ST.freeRide ? 'None yet.' : ''}</p>`;
    el.innerHTML = h;
    el.querySelectorAll('[data-track]').forEach((b) => b.onclick = () => { ST.track = b.dataset.track; renderJournal(); });
  } else if (jTab === 'vp') {
    const n = Object.keys(ST.vps).length;
    let h = `<p>${n} of ${VIEWPOINTS.length} famous views photographed. Press C for the camera; the viewfinder shows ★ when you've framed one.</p>`;
    for (const v of VIEWPOINTS) h += `<div class="vp ${ST.vps[v.id] ? 'done' : ''}"><b>${ST.vps[v.id] ? '★' : '☆'} ${esc(v.label)}</b></div>`;
    el.innerHTML = h;
  } else {
    if (!ST.photos.length) { el.innerHTML = '<p style="color:var(--dim)">No photos yet. Press C (or CAM on touch) to raise the camera.</p>'; return; }
    el.innerHTML = '<div class="photos">' + ST.photos.slice().reverse().map((p) => `<figure><img src="${p.img}" alt=""><figcaption>${esc(p.label)} · ${esc(p.t)}</figcaption></figure>`).join('') + '</div>';
  }
}
document.querySelectorAll('#jTabs button').forEach((b) => b.onclick = () => { jTab = b.dataset.t; renderJournal(); });
$('#jClose').onclick = () => closePanel('journal');

// ---------------------------------------------------------------- the map
const MAPV = { cx: 0, cz: 0, s: 0.6, img: null, drag: null, labels: null };
function mapImage() {
  if (MAPV.img) return MAPV.img;
  const c = document.createElement('canvas'); c.width = W.rw; c.height = W.rh;
  const x = c.getContext('2d'), id = x.createImageData(W.rw, W.rh);
  const pal = [[52, 54, 62], [118, 114, 108], [176, 120, 98], [22, 46, 70], [70, 112, 66], [0, 0, 0]];
  for (let i = 0; i < W.rw * W.rh; i++) { const p = pal[W.raster[i]] || pal[0]; id.data.set([p[0], p[1], p[2], 255], i * 4); }
  x.putImageData(id, 0, 0);
  MAPV.img = c;
  // street labels: the longest stretch of each named road
  // street labels: every named stretch over 50 m, but not within 160 m of the same name
  MAPV.labels = [];
  const edges = W.edges.filter((E) => E.name && E.cls !== 'service' && E.len > 50).sort((a, b) => b.len - a.len);
  for (const E of edges) {
    const n = enName(E.name);
    const [x2, z2, dx, dz] = polyAt(E.pts, E.len / 2);
    if (MAPV.labels.some((L) => L.n === n && dist2(L.x, L.z, x2, z2) < 160 * 160)) continue;
    let a = Math.atan2(dz, dx); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
    MAPV.labels.push({ n, x: x2, z: z2, a, main: E.cls === 'primary' || E.cls === 'secondary' || E.cls === 'trunk' });
  }
  return c;
}
function openMap() { MAPV.cx = PL.space === STREET || PL.space === ROOF ? PL.x : W.LP.milton[0]; MAPV.cz = PL.space === STREET || PL.space === ROOF ? PL.z : W.LP.milton[1]; openPanel('map'); drawMap(); }
function drawMap() {
  const cv = $('#mapc'), w = cv.width = cv.clientWidth, h = cv.height = cv.clientHeight, x = cv.getContext('2d');
  x.fillStyle = '#16304a'; x.fillRect(0, 0, w, h);
  const s = MAPV.s, ox = w / 2 - MAPV.cx * s, oz = h / 2 - MAPV.cz * s;
  const P = (px, pz) => [ox + px * s, oz + pz * s];
  x.imageSmoothingEnabled = s < 1;
  const [ix, iz] = P(W.rx0, W.rz0);
  x.drawImage(mapImage(), ix, iz, W.rw * s, W.rh * s);
  // walkable limit
  const [a0, b0] = P(W.walk[0], W.walk[1]), [a1, b1] = P(W.walk[2], W.walk[3]);
  x.strokeStyle = 'rgba(255,210,90,.35)'; x.setLineDash([6, 6]); x.strokeRect(a0, b0, a1 - a0, b1 - b0); x.setLineDash([]);
  // street names
  x.font = `${Math.round(clamp(16 * s * 1.3, 13, 24))}px VT323, monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const L of MAPV.labels) {
    if (!L.main && s < 0.45) continue;
    const [px, pz] = P(L.x, L.z); x.save(); x.translate(px, pz); x.rotate(L.a);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillText(L.n, 1, 1); x.fillStyle = L.main ? '#ffe9a8' : '#d8d2c4'; x.fillText(L.n, 0, 0); x.restore();
  }
  // landmarks, views, errands
  for (const L of LANDMARKS) {
    const [px, pz] = P(L.x, L.z), f = ST.found[L.id];
    x.fillStyle = f ? '#3ee6d8' : 'rgba(255,255,255,.35)';
    x.save(); x.translate(px, pz); x.rotate(Math.PI / 4); x.fillRect(-4, -4, 8, 8); x.restore();
    if (f && s > 0.45) { x.font = '16px VT323, monospace'; x.fillStyle = '#000'; x.fillText(L.en, px + 1, pz - 11); x.fillStyle = '#bff'; x.fillText(L.en, px, pz - 12); }
  }
  for (const e of ERRANDS) {
    const st = erStage(e.id); if (!st || st === 'done') continue;
    const [sp, tx, tz] = e.target(st);
    const [px, pz] = sp === 'street' ? P(tx, tz) : P(W.LP.milton[0], W.LP.milton[1]);
    x.font = '26px VT323, monospace'; x.fillStyle = '#000'; x.fillText('!', px + 1, pz + 1); x.fillStyle = '#ffd25a'; x.fillText('!', px, pz);
  }
  // MTR exits
  for (const X of EXITS) {
    if (X.sx === undefined) continue;
    const [px, pz] = P(X.sx, X.sz);
    x.fillStyle = '#b3141b'; x.fillRect(px - 5, pz - 5, 10, 10); x.fillStyle = '#fff'; x.fillRect(px - 3, pz - 1, 6, 2);
    if (s > 0.7) { x.font = '15px VT323, monospace'; x.fillStyle = '#000'; x.fillText(X.id, px + 1, pz - 10); x.fillStyle = '#ffb0b0'; x.fillText(X.id, px, pz - 11); }
  }
  // you
  const pp = PL.space === STREET || PL.space === ROOF || PL.space === FERRY_SPACE || PL.space === METRO_SPACE ? [PL.x, PL.z] : PL.space === RIDE_SPACE ? [STATIONS[MET.ride ? MET.ride.from : 'TST'].cx, STATIONS[MET.ride ? MET.ride.from : 'TST'].cz] : W.LP.milton;
  const [px, pz] = P(pp[0], pp[1]);
  x.save(); x.translate(px, pz); x.rotate(-PL.yaw);
  x.fillStyle = '#ff4f7a'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -11); x.lineTo(7, 8); x.lineTo(0, 4); x.lineTo(-7, 8); x.closePath(); x.stroke(); x.fill(); x.restore();
  // scale bar: true scale
  const m100 = 100 * s; x.fillStyle = '#fff'; x.fillRect(w - 30 - m100, h - 30, m100, 3); x.font = '18px VT323, monospace'; x.textAlign = 'right'; x.fillText('100 m', w - 30, h - 40);
}
(() => {
  const cv = $('#mapc'); const pts = new Map();
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); });
  cv.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const [ox, oy] = pts.get(e.pointerId);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()]; const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const [c, d] = [...pts.values()]; const d1 = Math.hypot(c[0] - d[0], c[1] - d[1]);
      MAPV.s = clamp(MAPV.s * d1 / (d0 || 1), 0.15, 4);
    } else { MAPV.cx -= (e.clientX - ox) / MAPV.s; MAPV.cz -= (e.clientY - oy) / MAPV.s; pts.set(e.pointerId, [e.clientX, e.clientY]); }
    drawMap();
  });
  const up = (e) => pts.delete(e.pointerId);
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { MAPV.s = clamp(MAPV.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.15, 4); drawMap(); }, { passive: true });
  $('#mapClose').onclick = () => closePanel('map');
  addEventListener('resize', () => { if (panelOpen === 'map') drawMap(); });
})();

// ---------------------------------------------------------------- in-play HUD
const CDIR = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
let hudT = 0, lastStreet = '';
function updateHUD() {
  $('#time').textContent = clockStr();
  $('#money').textContent = 'HK$ ' + ST.money.toFixed(1) + (ST.octopus ? ` · 八達通 ${ST.octopus.balance.toFixed(1)}` : '');
  // prompt
  const pr = $('#prompt');
  if (IFOCUS && !PHOTO.on && !DLG) { pr.hidden = false; const k = document.body.classList.contains('touch') ? 'USE' : padMode ? 'A' : 'E'; pr.innerHTML = `<b>${k}</b>${esc(IFOCUS.label())}`; }
  else pr.hidden = true;
  if ((hudT -= 1) > 0) return;
  hudT = 6;
  // where am I
  let st = '', zh = '';
  if (PL.space === STREET) { const [E] = nearestEdge(PL.x, PL.z, 30); if (E && E.name) { st = enName(E.name); zh = zhName(E.name); } else st = 'Tsim Sha Tsui'; }
  else if (PL.space === MILTON_SPACE) { st = MILTON.floor === 'G' ? 'Milton Mansion lobby' : `Milton Mansion, floor ${MILTON.floor}`; zh = '美敦大廈'; }
  else if (PL.space === ROOF) { st = 'Roof of Milton Mansion'; zh = '天台'; }
  else if (PL.space === FERRY_SPACE) { const b = FERRY_SPACE.boat; st = `${b.name[0]}, ${b.state === 'tst' ? 'at Tsim Sha Tsui' : b.state === 'central' ? 'at Central' : b.state === 'toCentral' ? 'to Central' : 'to Tsim Sha Tsui'}`; zh = b.name[1]; }
  else if (PL.space === METRO_SPACE) { const S = STATIONS[stationAt(PL.x, PL.z)]; if (S) { st = `MTR ${S.en}, ${MET.level === 'p' ? 'platform' : 'concourse'}`; zh = S.zh; } else { st = 'Mody Road subway'; zh = '麼地道隧道'; } }
  else if (PL.space === RIDE_SPACE && MET.ride) { const R = MET.ride, d = R.d; st = `${LINES[R.line].en} to ${d.to}`; zh = `${LINES[R.line].zh} 往${d.toZh}`; }
  if (st !== lastStreet) { lastStreet = st; $('#street').textContent = st; $('#streetZh').textContent = zh; }
  // errand tracker
  const e = activeErrand(), tk = $('#task');
  if (e && !PHOTO.on) { tk.hidden = false; tk.innerHTML = `<b>${esc(e.title)}</b><span>${esc(e.steps[Math.min(erStage(e.id), e.steps.length) - 1])}</span>`; }
  else tk.hidden = true;
  // compass
  const tr = $('#ctrack'), wpx = tr.clientWidth || 500, fovDeg = 140;
  const heading = ((-PL.yaw / D2R) % 360 + 360) % 360;
  let h = '';
  const put = (deg, txt, cls) => { let d = ((deg - heading + 540) % 360) - 180; if (Math.abs(d) > fovDeg / 2) return; h += `<i class="${cls}" style="left:${(0.5 + d / fovDeg) * wpx}px">${txt}</i>`; };
  for (const [n, a] of CDIR) put(a, n, n.length === 1 ? 'cd' : '');
  const bearing = (x, z) => ((Math.atan2(x - PL.x, -(z - PL.z)) / D2R) + 360) % 360;
  if (e && (PL.space === STREET || PL.space === ROOF)) { const [sp, tx, tz] = e.target(erStage(e.id)); const p = sp === 'street' ? [tx, tz] : W.LP.milton; put(bearing(p[0], p[1]), '!', 'mk'); }
  if (PL.space === STREET) for (const L of LANDMARKS) if (!ST.found[L.id] && dist2(L.x, L.z, PL.x, PL.z) < 260 * 260) put(bearing(L.x, L.z), '◆', 'mk lm');
  tr.innerHTML = h;
}
let padMode = false;
bus.on('padUsed', () => { padMode = true; });
addEventListener('keydown', () => { padMode = false; });

// ---------------------------------------------------------------- settings
function initSettings() {
  const hs = $('#sHour'); hs.innerHTML = '<option value="">(leave it)</option>' + Array.from({ length: 24 }, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}:00</option>`).join('');
  const bind = (id, key, conv = Number, after) => {
    const el = $(id); el.value = String(OPT[key]);
    el.oninput = el.onchange = () => { OPT[key] = conv(el.value); if (after) after(); saveOpts(); };
  };
  bind('#sLines', 'lines', Number, () => setLines(OPT.lines));
  bind('#sWob', 'wobble', Number, () => { VIEW.wobble = OPT.wobble; onResize(); });
  bind('#sFov', 'fov'); bind('#sSens', 'sens'); bind('#sInv', 'invert', (v) => v === '1' || v === 'true', null);
  $('#sInv').value = OPT.invert ? '1' : '0';
  bind('#sCrowd', 'crowd'); bind('#sTime', 'timeSpeed', Number, () => { CLOCK.speed = OPT.timeSpeed; });
  bind('#sVol', 'volume', Number, () => bus.emit('volume'));
  hs.onchange = () => { if (hs.value !== '') { CLOCK.t = +hs.value; toast(`The clock jumps to ${clockStr()}.`); } };
  $('#sClose').onclick = () => closePanel('settings', GAME.state === 'play' ? 'pause' : null);
}
function saveOpts() { try { localStorage.setItem('nathan-road-options', JSON.stringify(OPT)); } catch (e) { /* ignore */ } }
function loadOpts() {
  try { Object.assign(OPT, JSON.parse(localStorage.getItem('nathan-road-options') || '{}')); } catch (e) { /* ignore */ }
  VIEW.lines = OPT.lines; VIEW.wobble = OPT.wobble; CLOCK.speed = OPT.timeSpeed;
}

// ---------------------------------------------------------------- title and pause menus
function initMenus() {
  const go = (fresh) => { bus.emit('audioStart'); startGame({ fresh }); relock(); };
  $('#bStart').onclick = () => go(false);
  $('#bNew').onclick = () => { if (confirm('Start a new walk? Your notebook, money and photos will be reset.')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } go(true); } };
  $('#bSettings').onclick = () => openPanel('settings');
  $('#bHelp').onclick = () => openPanel('help');
  $('#bCredits').onclick = () => openPanel('credits');
  $('#pResume').onclick = () => closePanel('pause');
  $('#pMap').onclick = () => { closePanel('pause'); openMap(); };
  $('#pJournal').onclick = () => { closePanel('pause'); openJournal(); };
  $('#pSettings').onclick = () => openPanel('settings');
  $('#pHelp').onclick = () => openPanel('help');
  $('#pTitle').onclick = () => { save(); location.reload(); };
  $('#hClose').onclick = () => closePanel('help', GAME.state === 'play' ? 'pause' : null);
  $('#cClose').onclick = () => closePanel('credits');
  $('#liftClose').onclick = () => closePanel('lift');
  bus.on('ready', () => {
    $('#tmenuMain').hidden = false;
    if (hasSave()) { $('#bStart').textContent = 'Continue walking'; $('#bNew').hidden = false; }
  });
}

// ---------------------------------------------------------------- touch
function initTouch() {
  const stick = $('#stick'), knob = $('#knob'), T2 = Input.touch;
  let sid = null, sx = 0, sy = 0;
  stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; move(e); });
  const move = (e) => {
    if (e.pointerId !== sid) return;
    let dx = (e.clientX - sx) / 55, dy = (e.clientY - sy) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    T2.mx = dx; T2.my = dy; knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
  };
  stick.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; T2.mx = T2.my = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  // drag anywhere else to look
  const cv = $('#c'); const looks = new Map();
  cv.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; looks.set(e.pointerId, [e.clientX, e.clientY, performance.now()]); });
  cv.addEventListener('pointermove', (e) => { const p = looks.get(e.pointerId); if (!p) return; T2.lx += (e.clientX - p[0]) * 0.9; T2.ly += (e.clientY - p[1]) * 0.9; p[0] = e.clientX; p[1] = e.clientY; });
  const lend = (e) => { const p = looks.get(e.pointerId); if (!p) return; looks.delete(e.pointerId); if (PHOTO.on && performance.now() - p[2] < 250) takePhoto(); };
  cv.addEventListener('pointerup', lend); cv.addEventListener('pointercancel', lend);
  const tap = (id, fn) => $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  tap('#tUse', () => { if (DLG) { if (!DLG.opts.length) closeDialog(); } else if (PHOTO.on) takePhoto(); else if (IFOCUS) IFOCUS.use(); });
  tap('#tCam', () => togglePhoto());
  tap('#tRun', () => { T2.run = !T2.run; $('#tRun').style.borderColor = T2.run ? 'var(--gold)' : ''; });
  tap('#tMap', () => openMap());
  tap('#tJ', () => openJournal());
  tap('#tMenu', () => openPause());
}
loadOpts(); initSettings(); initMenus(); initTouch();
