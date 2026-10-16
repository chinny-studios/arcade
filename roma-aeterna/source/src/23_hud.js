// Roma Aeterna — HUD: compass, clock, location, prompts, discovery banners, dialogue, placards, the map & journal,
// the pause menu with settings, and the touch controls.

const HUD = {
  open: null, // 'dlg' | 'placard' | 'map' | 'pause' | null
  blocking() { return !!this.open; },
  mapCanvas: null, mapView: { x: 0, z: 0, zoom: 1 },
  bannerT: 0, whereText: '',
};

HUD.init = function () {
  this.$compass = $('#compass'); this.$ctrack = $('#ctrack'); this.$where = $('#where'); this.$clock = $('#clock');
  this.$prompt = $('#prompt'); this.$banner = $('#banner'); this.$msgs = $('#msgs');
  this.$dlg = $('#dlg'); this.$placard = $('#placard'); this.$map = $('#mapView'); this.$pause = $('#pause');
  // compass ticks
  let h = '';
  for (let d = 0; d < 360; d += 15) {
    const lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W', 45: 'NE', 135: 'SE', 225: 'SW', 315: 'NW' }[d];
    h += `<i data-d="${d}" class="${lab ? (lab.length === 1 ? 'cd' : 'ic') : ''}">${lab || '·'}</i>`;
  }
  this.$ctrack.innerHTML = h;
  this.$ticks = [...this.$ctrack.children];
  this.$marks = [];
  // dialogue / placard / map clicks
  this.$dlg.addEventListener('click', () => DIALOG.next());
  $('#placard .close').addEventListener('click', () => HUD.close());
  $('#mapClose').addEventListener('click', () => HUD.close());
  $('#pResume').addEventListener('click', () => HUD.close());
  $('#pTitle').addEventListener('click', () => { SAVE.save(); location.hash = DEBUG ? '#debug' : ''; location.reload(); });
  $('#pMap').addEventListener('click', () => { HUD.close(); HUD.openMap(); });
  this.initSettings();
  this.initTouch();
  this.initMapInput();
  bus.on('lock', (locked) => {
    if (G.state !== 'play') return;
    if (!locked && !HUD.open && !Input.touch.on && !(DEBUG && G.noPause)) HUD.openPause();
  });
  document.getElementById('c').addEventListener('click', () => { if (G.state === 'play' && !HUD.open) Input.lock(); });
};

// ---------- per-frame HUD ----------
HUD.update = function (dt) {
  // compass: centre = facing bearing (0 = north = -z)
  const bearing = ((-PL.yaw / D2R) % 360 + 360) % 360;
  const pxPerDeg = 3.2, half = this.$compass.clientWidth / 2;
  for (const t of this.$ticks) {
    const d = +t.dataset.d; let off = ((d - bearing + 540) % 360) - 180;
    t.style.transform = `translateX(${half + off * pxPerDeg}px)`; t.style.opacity = Math.abs(off) > 75 ? 0 : 1 - Math.abs(off) / 95;
  }
  // landmark markers: discovered ones and big monuments within 2 km
  if (!this.$marks.length) {
    for (const p of W.places) if (p.kind === 'landmark' && p.big !== false) {
      const el = document.createElement('b'); el.className = 'mk'; el.innerHTML = '<s></s><span>' + p.name + '</span>'; this.$ctrack.appendChild(el); this.$marks.push({ el, p });
    }
  }
  let labI = null, labO = 7;
  for (const m of this.$marks) {
    const p = m.p, dx = p.x - PL.x, dz = p.z - PL.z, d = Math.hypot(dx, dz);
    m.off = 999; if (d <= p.r * 0.6 || d >= (p.found ? 2400 : (p.far || 900))) continue;
    const off = ((((Math.atan2(dx, -dz) / D2R + 360) % 360) - bearing + 540) % 360) - 180;
    m.off = off; m.d = d; if (Math.abs(off) < labO) { labO = Math.abs(off); labI = m; }
  }
  for (const m of this.$marks) {
    const p = m.p, d = m.d;
    const off = m.off;
    if (off === 999) { m.el.style.opacity = 0; continue; }
    const vis = Math.abs(off) < 70;
    m.el.style.opacity = vis ? (m === labI ? 1 : 0.75) : 0;
    m.el.classList.toggle('lab', m === labI);
    m.el.classList.toggle('found', p.found);
    m.el.style.transform = `translateX(${half + off * pxPerDeg}px)`;
    if (m === labI) m.el.querySelector('span').textContent = p.name + ' · ' + (d > 950 ? (d / 1000).toFixed(1) + ' km' : Math.round(d / 10) * 10 + ' m');
  }
  // clock
  const rh = romanHour(G.hour);
  const ff = G.ff ? ' <em>»</em>' : '';
  this.$clock.innerHTML = `<b>${rh.text}</b><span>${clockText(G.hour)} · ${rh.day ? 'day' : 'night'} ${G.day}${ff}</span>`;
  // prompt
  const t = PL.target;
  if (t && !this.open) {
    let txt;
    if (t.kind === 'placard') txt = `<b>${Input.touch.on ? 'Tap ✦' : Input.pad.on ? 'Ⓐ' : 'E'}</b> Read · ${PLACARD_TEXT[t.p.id] ? PLACARD_TEXT[t.p.id].t : t.p.id}`;
    else txt = `<b>${Input.touch.on ? 'Tap ✦' : Input.pad.on ? 'Ⓐ' : 'E'}</b> Talk · ${t.a.who.title}`;
    if (this.$prompt.innerHTML !== txt) this.$prompt.innerHTML = txt;
    this.$prompt.hidden = false;
  } else this.$prompt.hidden = true;
  $('#tE').classList.toggle('on', !!t);
  if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.$banner.classList.remove('on'); }
};
HUD.where = function (name, latin) {
  const t = latin ? `<b>${name}</b><span>${latin}</span>` : `<b>${name}</b>`;
  if (t !== this.whereText) { this.whereText = t; this.$where.innerHTML = t; this.$where.classList.remove('fade'); void this.$where.offsetWidth; this.$where.classList.add('fade'); }
};
HUD.banner = function (latin, name, sub, dur = 5) {
  this.$banner.innerHTML = `<div class="l">${latin}</div><div class="n">${name}</div>${sub ? `<div class="s">${sub}</div>` : ''}`;
  this.$banner.classList.add('on'); this.bannerT = dur;
};
HUD.msg = function (text, cls = '') {
  const el = document.createElement('div'); el.className = 'msg ' + cls; el.innerHTML = text; this.$msgs.appendChild(el);
  setTimeout(() => { el.style.opacity = 0; }, 4200); setTimeout(() => el.remove(), 5000);
  while (this.$msgs.children.length > 5) this.$msgs.firstChild.remove();
};

// ---------- modal panels ----------
HUD.close = function () {
  const was = this.open; this.open = null;
  this.$dlg.hidden = true; this.$placard.hidden = true; this.$map.hidden = true; this.$pause.hidden = true;
  document.body.classList.remove('modal');
  if (was === 'dlg') DIALOG.end();
  if (G.state === 'play' && !Input.touch.on) Input.lock();
};
HUD.openPlacard = function (p) {
  const T = PLACARD_TEXT[p.id] || { t: p.id, l: '', b: '' };
  this.open = 'placard';
  this.$placard.querySelector('.t').textContent = T.t;
  this.$placard.querySelector('.l').textContent = T.l || '';
  this.$placard.querySelector('.b').innerHTML = T.b.split('\n\n').map((s) => '<p>' + s + '</p>').join('');
  this.$placard.hidden = false;
  if (!p.read) { p.read = true; G.readCount++; }
  AU.ui('page');
};
HUD.openPause = function () {
  this.open = 'pause'; this.$pause.hidden = false; document.body.classList.add('modal'); Input.unlock();
  const found = W.places.filter((p) => p.found && p.kind !== 'district').length, total = W.places.filter((p) => p.kind !== 'district').length;
  $('#pStats').textContent = `${found} of ${total} places found · ${W.placards.filter((p) => p.read).length} of ${W.placards.length} placards read`;
};
HUD.key = function () {
  if (this.open === 'dlg') { if (Input.hit('KeyE') || Input.hit('Space') || Input.hit('Enter') || Input.m.hit[0]) DIALOG.next(); if (Input.hit('Escape')) this.close(); return; }
  if (this.open === 'placard') { if (Input.hit('KeyE') || Input.hit('Escape') || Input.hit('Enter') || Input.m.hit[0]) this.close(); return; }
  if (this.open === 'map') { if (Input.hit('KeyM') || Input.hit('Tab') || Input.hit('Escape')) this.close(); return; }
  if (this.open === 'pause') { if (Input.hit('Escape') && Input.pad.on) this.close(); return; }
  if (Input.hit('KeyM') || Input.hit('Tab')) { this.openMap(); return; }
  if (Input.hit('Escape') && (Input.pad.on || Input.touch.on)) { this.openPause(); return; }
  if (Input.hit('KeyE') || Input.m.hit[0]) this.interact();
};
HUD.interact = function () {
  const t = PL.target; if (!t) return;
  if (t.kind === 'placard') this.openPlacard(t.p);
  else { this.open = 'dlg'; this.$dlg.hidden = false; DIALOG.start(t.a); }
};

// ---------- the map & journal ----------
HUD.buildMap = function () {
  const S = 2.0; // metres per pixel
  const Wd = Math.round((T.X1 - T.X0) / S), Hd = Math.round((T.Z1 - T.Z0) / S);
  const cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hd;
  const g = cv.getContext('2d');
  const img = g.createImageData(Wd, Hd), D = img.data;
  for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
    const wx = T.X0 + x * S, wz = T.Z0 + y * S, h = groundAt(wx, wz);
    const hx = groundAt(wx + 6, wz) - groundAt(wx - 6, wz), hz = groundAt(wx, wz + 6) - groundAt(wx, wz - 6);
    const shade = clamp(1 - (hx * 0.6 + hz * 0.4) * 0.035, 0.86, 1.1);
    const urb = urbanAt(wx, wz);
    let r = lerp(196, 214, urb), gg = lerp(196, 196, urb), b = lerp(150, 168, urb);
    r += h * 0.6; gg += h * 0.5; b += h * 0.2;
    if (h < WATER_Y) { r = 120; gg = 150; b = 150; }
    const o = (y * Wd + x) * 4; D[o] = clamp(r * shade, 0, 255); D[o + 1] = clamp(gg * shade, 0, 255); D[o + 2] = clamp(b * shade, 0, 255); D[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const P = (x, z) => [(x - T.X0) / S, (z - T.Z0) / S];
  g.lineCap = 'round';
  for (const l of W.mapLines) {
    g.strokeStyle = l.col; g.lineWidth = l.w / S; g.beginPath();
    l.pts.forEach((p, i) => { const [a, b] = P(p[0], p[1]); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.stroke();
  }
  for (const r of W.mapRects) {
    g.fillStyle = r.col; g.beginPath();
    r.pts.forEach((p, i) => { const [a, b] = P(p[0], p[1]); if (i) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); g.fill();
  }
  for (const c of W.mapCircles) { const [a, b] = P(c.x, c.z); g.fillStyle = c.col; g.beginPath(); g.arc(a, b, c.r / S, 0, TAU); g.fill(); }
  this.mapCanvas = cv; this.mapS = S;
};
HUD.openMap = function () {
  this.open = 'map'; this.$map.hidden = false; document.body.classList.add('modal'); Input.unlock();
  this.mapView.x = PL.x; this.mapView.z = PL.z; this.mapView.zoom = this.mapView.zoom || 1;
  this.renderJournal(); this.drawMap();
  AU.ui('page');
};
HUD.renderJournal = function () {
  const groups = {};
  for (const p of W.places) if (p.kind !== 'district') (groups[p.area || 'Rome'] = groups[p.area || 'Rome'] || []).push(p);
  let h = '';
  const total = W.places.filter((p) => p.kind !== 'district'), found = total.filter((p) => p.found);
  h += `<div class="jh">${found.length} of ${total.length} places found</div>`;
  for (const a in groups) {
    h += `<div class="jg">${a}</div>`;
    for (const p of groups[a]) h += p.found ? `<div class="je f" data-id="${p.id}"><b>${p.name}</b><span>${p.latin || ''}</span></div>` : `<div class="je">? ? ?</div>`;
  }
  $('#journal').innerHTML = h;
  for (const el of document.querySelectorAll('#journal .je.f')) {
    el.addEventListener('click', () => { const p = W.places.find((q) => q.id === el.dataset.id); this.mapView.x = p.x; this.mapView.z = p.z; this.mapSel = p; this.drawMap(); });
  }
};
HUD.drawMap = function () {
  const cv = $('#mapCv'), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext('2d'), V = this.mapView, S = this.mapS;
  const scale = V.zoom / S; // px per metre
  const sx = (x) => w / 2 + (x - V.x) * scale, sz = (z) => h / 2 + (z - V.z) * scale;
  g.fillStyle = '#b9ae8e'; g.fillRect(0, 0, w, h);
  g.imageSmoothingEnabled = true;
  g.drawImage(this.mapCanvas, sx(T.X0), sz(T.Z0), this.mapCanvas.width * V.zoom, this.mapCanvas.height * V.zoom);
  // places
  g.textAlign = 'center'; g.textBaseline = 'bottom';
  this.mapHits = [];
  for (const p of W.places) {
    if (p.kind === 'district') {
      if (V.zoom < 0.7 && !p.major) continue;
      g.font = `italic ${V.zoom > 1.5 ? 15 : 12}px "EB Garamond", Georgia, serif`; g.fillStyle = 'rgba(70,50,30,.55)'; g.fillText(p.name, sx(p.x), sz(p.z)); continue;
    }
    const x = sx(p.x), y = sz(p.z);
    if (x < -50 || y < -50 || x > w + 50 || y > h + 50) continue;
    g.beginPath(); g.arc(x, y, p.found ? 5 : 3.5, 0, TAU);
    g.fillStyle = p.found ? '#9c2a22' : 'rgba(80,60,40,.45)'; g.fill();
    if (p.found) { g.strokeStyle = '#f2e6c8'; g.lineWidth = 1.5; g.stroke(); }
    if (p.found && (V.zoom >= 0.8 || p.major || p === this.mapSel)) {
      g.font = `600 ${p === this.mapSel ? 15 : 12}px "Cinzel", Georgia, serif`;
      g.lineWidth = 3; g.strokeStyle = 'rgba(242,230,200,.85)'; g.strokeText(p.name, x, y - 6); g.fillStyle = '#2a1a10'; g.fillText(p.name, x, y - 6);
    }
    this.mapHits.push({ p, x, y });
  }
  // player
  const px = sx(PL.x), py = sz(PL.z), a = -PL.yaw;
  g.save(); g.translate(px, py); g.rotate(a);
  g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath();
  g.fillStyle = '#d6aa48'; g.fill(); g.strokeStyle = '#2a1a10'; g.lineWidth = 2; g.stroke(); g.restore();
  // selection / travel
  const sel = this.mapSel, $t = $('#mapTravel');
  if (sel && sel.found) {
    $t.hidden = false;
    $t.innerHTML = `<b>${sel.name}</b> <i>${sel.latin || ''}</i> <button id="goBtn">Travel there</button>`;
    $('#goBtn').onclick = () => { HUD.close(); travelTo(sel); };
  } else $t.hidden = true;
};
HUD.initMapInput = function () {
  const cv = $('#mapCv'); let drag = null, pinch = null;
  cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomMap(e.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, mx: this.mapView.x, mz: this.mapView.z, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag || pinch) return; const s = this.mapS / this.mapView.zoom;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    this.mapView.x = drag.mx - dx * s; this.mapView.z = drag.mz - dy * s; this.drawMap();
  });
  cv.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved) {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 22 * 22;
      for (const h of this.mapHits || []) { const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd) { bd = d; best = h.p; } }
      this.mapSel = best; this.drawMap();
    }
    drag = null;
  });
  cv.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = { d: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY), z: this.mapView.zoom }; }, { passive: true });
  cv.addEventListener('touchmove', (e) => { if (pinch && e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); this.mapView.zoom = clamp(pinch.z * d / pinch.d, 0.35, 5); this.drawMap(); } }, { passive: true });
  cv.addEventListener('touchend', () => { pinch = null; });
  $('#mapIn').onclick = () => this.zoomMap(1.4); $('#mapOut').onclick = () => this.zoomMap(1 / 1.4);
  $('#mapMe').onclick = () => { this.mapView.x = PL.x; this.mapView.z = PL.z; this.drawMap(); };
  addEventListener('resize', () => { if (this.open === 'map') this.drawMap(); });
};
HUD.zoomMap = function (k) { this.mapView.zoom = clamp(this.mapView.zoom * k, 0.35, 5); this.drawMap(); };

// ---------- settings ----------
HUD.initSettings = function () {
  const root = $('#settings');
  const rows = [
    ['sens', 'Look sensitivity', 'range', 0.3, 2.5, 0.05],
    ['fov', 'Field of view', 'range', 55, 95, 1],
    ['daySpeed', 'Pace of the day', 'select', [[0.5, 'Slow (48 min)'], [1, 'Normal (24 min)'], [2, 'Fast (12 min)'], [0, 'Stopped']]],
    ['quality', 'Graphics', 'select', [['auto', 'Automatic'], ['low', 'Low'], ['med', 'Medium'], ['high', 'High']]],
    ['vol', 'Volume', 'range', 0, 1, 0.05],
    ['invertY', 'Invert look', 'check'],
    ['bob', 'Head bob', 'check'],
  ];
  let h = '';
  for (const r of rows) {
    const [k, lab, type] = r;
    if (type === 'range') h += `<label><span>${lab}</span><input type="range" data-k="${k}" min="${r[3]}" max="${r[4]}" step="${r[5]}" value="${SETTINGS[k]}"></label>`;
    else if (type === 'check') h += `<label><span>${lab}</span><input type="checkbox" data-k="${k}" ${SETTINGS[k] ? 'checked' : ''}></label>`;
    else h += `<label><span>${lab}</span><select data-k="${k}">${r[3].map(([v, t]) => `<option value="${v}" ${String(SETTINGS[k]) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
  }
  root.innerHTML = h;
  root.addEventListener('input', (e) => {
    const el = e.target, k = el.dataset.k; if (!k) return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'range' || k === 'daySpeed') v = parseFloat(v);
    SETTINGS[k] = v; saveSettings();
    if (k === 'fov') resize();
    if (k === 'quality') { G.autoQ = v === 'auto'; applyQuality(v === 'auto' ? R.qname : v); }
    if (k === 'vol') AU.setVol(v);
  });
};

// ---------- touch ----------
HUD.initTouch = function () {
  const on = () => { document.body.classList.add('touch'); };
  bus.on('touchmode', on);
  const stick = $('#stick'), knob = $('#stick i');
  bus.on('stick', (s) => {
    if (!s) { stick.style.opacity = 0.35; knob.style.transform = ''; stick.style.left = ''; stick.style.top = ''; stick.style.bottom = ''; return; }
    stick.style.opacity = 0.9; stick.style.left = (s.x0 - 60) + 'px'; stick.style.top = (s.y0 - 60) + 'px'; stick.style.bottom = 'auto';
    const dx = s.x - s.x0, dy = s.y - s.y0, l = Math.hypot(dx, dy), k = l > 56 ? 56 / l : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  });
  const btn = (id, f, up) => {
    const el = $(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); f(); el.classList.add('down'); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); el.classList.remove('down'); if (up) up(); }, { passive: false });
  };
  btn('#tE', () => { if (HUD.open === 'dlg') DIALOG.next(); else if (HUD.open === 'placard') HUD.close(); else HUD.interact(); });
  btn('#tRun', () => { PL.runToggle = !PL.runToggle; $('#tRun').classList.toggle('on', PL.runToggle); });
  btn('#tMap', () => { if (HUD.open === 'map') HUD.close(); else if (!HUD.open) HUD.openMap(); });
  btn('#tMenu', () => { if (HUD.open) HUD.close(); else HUD.openPause(); });
  btn('#tTime', () => { G.touchFF = true; }, () => { G.touchFF = false; });
};
