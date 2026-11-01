// The effects layer (#fx canvas): confetti/achievement sparkle, the "melt" virus, the runaway cursor and mouse
// trails; the toast popups; and the screen savers (pipes, starfield, flying toasters, mystify, marquee).
const FX = { cv: null, x: null, parts: [], melt: null, raf: 0, running: false, cursor: { x: -99, y: -99, has: false } };
function fxInit() {
  FX.cv = $('#fx'); FX.x = FX.cv.getContext('2d');
  const size = () => { FX.cv.width = APP().clientWidth; FX.cv.height = APP().clientHeight; };
  size(); addEventListener('resize', size);
  addEventListener('pointermove', (e) => { const a = APP().getBoundingClientRect(); FX.cursor.x = e.clientX - a.left; FX.cursor.y = e.clientY - a.top; FX.cursor.has = true; updateFakeCursor(e); });
}
function fxLoop() {
  if (FX.running) return; FX.running = true;
  const step = () => {
    FX.raf = requestAnimationFrame(step);
    const x = FX.x, W = FX.cv.width, H = FX.cv.height;
    x.clearRect(0, 0, W, H);
    for (const p of FX.parts) { p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); x.restore(); }
    FX.parts = FX.parts.filter((p) => p.life > 0 && p.y < H + 20);
    if (FX.melt) meltStep();
    if (!FX.parts.length && !FX.melt) { FX.running = false; cancelAnimationFrame(FX.raf); x.clearRect(0, 0, W, H); return; }
  };
  step();
}
function confetti(cx, cy, n = 60) {
  const a = APP().getBoundingClientRect();
  cx = cx == null ? a.width / 2 : cx; cy = cy == null ? a.height / 3 : cy;
  const cols = ['#ff4a4a', '#ffd400', '#3ad03a', '#3a8aff', '#ff40c0', '#40e0e0'];
  for (let i = 0; i < n; i++) FX.parts.push({ x: cx, y: cy, vx: rnd(-6, 6), vy: rnd(-11, -3), r: rnd(0, 6), vr: rnd(-0.3, 0.3), s: rnd(4, 9), c: pick(cols), life: irnd(60, 110) });
  fxLoop();
}
function fxMelt() { if (FX.melt) return; try { FX.melt = { cols: [], started: performance.now() }; const W = FX.cv.width; for (let i = 0; i < W; i += 4) FX.melt.cols.push(0); fxLoop(); unlock('melt'); } catch (e) { /* ignore */ } }
function meltStep() {
  const x = FX.x, W = FX.cv.width, H = FX.cv.height, m = FX.melt;
  // grab a strip from the desktop occasionally — cheap fake: draw translucent drips
  for (let i = 0; i < m.cols.length; i++) { if (chance(0.25)) m.cols[i] += rnd(0, 4); const dy = m.cols[i]; if (dy > 0) { x.fillStyle = `hsl(${(i * 2) % 360},40%,${30 + (i % 20)}%)`; x.globalAlpha = 0.5; x.fillRect(i * 4, 0, 4, Math.min(dy, H)); x.globalAlpha = 1; } }
}
function fxClear() { FX.parts = []; FX.melt = null; FX.x && FX.x.clearRect(0, 0, FX.cv.width, FX.cv.height); }
// runaway cursor + fake cursor rendering
function updateFakeCursor(e) {
  const cur = $('#cursor'); if (!cur) return;
  let x = FX.cursor.x, y = FX.cursor.y;
  if (VX.runaway) {
    // push the drawn cursor away from where the user actually is, toward a jittered offset
    const a = APP().getBoundingClientRect();
    const dx = Math.sin(performance.now() / 300) * 40 + 30, dy = Math.cos(performance.now() / 250) * 40 + 30;
    x = clamp(x + dx, 2, a.width - 14); y = clamp(y + dy, 2, a.height - 20);
  }
  cur.style.transform = `translate(${x}px,${y}px)`;
  if (S.trails || WM.trails) {
    const t = h('div', { class: 'trailc' }); t.innerHTML = cur.innerHTML; t.style.transform = cur.style.transform; APP().append(t);
    setTimeout(() => t.remove(), 220);
    const all = $$('.trailc'); if (all.length > 14) all.slice(0, all.length - 14).forEach((e) => e.remove());
  }
}

// ---- toast ----
let _toastQ = [];
function toast(title, msg, iconName) {
  const t = h('div', { class: 'toast' }, h('div', { class: 'tb' }, h('div', { class: 'ttl', style: 'flex:1;padding:0 3px', text: title }), h('button', { class: 'tbtn x', onclick: () => hide() })),
    h('div', { class: 'bd' }, img(iconName || 'info', 32), h('div', { class: 'grow', html: msg })));
  APP().append(t);
  const hide = () => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); };
  requestAnimationFrame(() => t.classList.add('on'));
  SFX.pop();
  setTimeout(hide, 4600);
  return t;
}

// ---- screen savers ----
const SAVERS = {
  pipes: { name: '3D Pipes', run: pipesSaver }, starfield: { name: 'Starfield Simulation', run: starfieldSaver }, toasters: { name: 'Flying Toasterz', run: toasterSaver }, mystify: { name: 'Mystify', run: mystifySaver }, marquee: { name: 'Scrolling Marquee', run: marqueeSaver }, blank: { name: 'Blank Screen', run: (c) => { c.getContext('2d').fillRect(0, 0, c.width, c.height); } },
};
const SAV = { on: false, raf: 0, idle: 0, preview: false };
function startSaver(id, preview) {
  const host = $('#saver'); const cv = host.firstChild;
  cv.width = APP().clientWidth; cv.height = APP().clientHeight;
  host.classList.add('on'); SAV.on = true; SAV.preview = preview;
  const saver = SAVERS[id] || SAVERS.pipes;
  const state = {};
  const ctx = cv.getContext('2d');
  cancelAnimationFrame(SAV.raf);
  const loop = () => { SAV.raf = requestAnimationFrame(loop); saver.run(cv, ctx, state); };
  loop();
  if (id === 'pipes') unlock('pipes');
  const stop = (e) => { if (preview && e && e.type === 'pointermove' && !state.ready) return; endSaver(); removeEventListener('pointermove', stop, true); removeEventListener('pointerdown', stop, true); removeEventListener('keydown', stop, true); };
  setTimeout(() => { addEventListener('pointermove', stop, true); addEventListener('pointerdown', stop, true); addEventListener('keydown', stop, true); state.ready = true; }, preview ? 400 : 50);
}
function endSaver() { if (!SAV.on) return; SAV.on = false; cancelAnimationFrame(SAV.raf); $('#saver').classList.remove('on'); SAV.idle = 0; }
function pipesSaver(cv, x, s) {
  if (!s.init) { s.init = 1; x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height); s.px = cv.width / 2; s.py = cv.height / 2; s.dir = 0; s.col = '#f00'; s.len = 0; }
  for (let k = 0; k < 2; k++) {
    if (s.len <= 0 || chance(0.04)) { s.dir = irnd(0, 3); s.len = irnd(8, 40); s.col = `hsl(${irnd(0, 360)},80%,55%)`; }
    const d = [[12, 0], [-12, 0], [0, 12], [0, -12]][s.dir]; s.px += d[0]; s.py += d[1]; s.len--;
    if (s.px < 10 || s.px > cv.width - 10 || s.py < 10 || s.py > cv.height - 10) { s.px = cv.width / 2; s.py = cv.height / 2; }
    const g = x.createRadialGradient(s.px - 3, s.py - 3, 1, s.px, s.py, 9); g.addColorStop(0, '#fff'); g.addColorStop(0.4, s.col); g.addColorStop(1, 'rgba(0,0,0,.3)');
    x.fillStyle = g; x.beginPath(); x.arc(s.px, s.py, 9, 0, 7); x.fill();
  }
}
function starfieldSaver(cv, x, s) {
  if (!s.stars) { s.stars = []; for (let i = 0; i < 260; i++) s.stars.push({ x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(0.01, 1) }); }
  x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height);
  const cx = cv.width / 2, cy = cv.height / 2;
  for (const st of s.stars) { st.z -= 0.006; if (st.z <= 0.01) { st.x = rnd(-1, 1); st.y = rnd(-1, 1); st.z = 1; } const sx = cx + st.x / st.z * cx, sy = cy + st.y / st.z * cy, r = (1 - st.z) * 2.6; if (sx < 0 || sx > cv.width || sy < 0 || sy > cv.height) continue; x.fillStyle = `rgba(255,255,255,${1 - st.z})`; x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill(); }
}
function toasterSaver(cv, x, s) {
  if (!s.t) { s.t = []; for (let i = 0; i < 12; i++) s.t.push({ x: rnd(0, cv.width), y: rnd(0, cv.height), toast: chance(0.3), ph: rnd(0, 7) }); s.sl = []; for (let i = 0; i < 6; i++) s.sl.push({ x: rnd(0, cv.width), y: rnd(0, cv.height) }); }
  x.fillStyle = '#2a2a4a'; x.fillRect(0, 0, cv.width, cv.height);
  const t = performance.now() / 1000;
  for (const o of s.t) { o.x -= 1.6; o.y += 1.1; if (o.x < -40) { o.x = cv.width + 20; o.y = rnd(-20, cv.height - 40); } if (o.y > cv.height + 40) { o.y = -30; o.x = rnd(0, cv.width); } x.save(); x.translate(o.x, o.y); o.toast ? drawToastSlice(x) : drawToaster(x, t + o.ph); x.restore(); }
}
function drawToaster(x, ph) {
  R_(x, 0, 6, 40, 24, '#c0c4cc', '#606570'); R_(x, 3, 2, 34, 8, '#d8dce4', '#606570'); R_(x, 10, 4, 8, 3, '#303040'); R_(x, 22, 4, 8, 3, '#303040');
  C_(x, 40, 18, 3, '#808088'); // wing
  x.save(); x.translate(-2, 14); const f = Math.sin(ph * 8); x.rotate(-0.3 + f * 0.5); P_(x, [[0, 0], [-22, -8], [-22, 8]], '#fff', '#888'); for (let i = 1; i < 4; i++) P_(x, [[-i * 6, -3], [-22, -6], [-22, 2]], null, '#aaa', 1, true); x.restore();
}
function drawToastSlice(x) { P_(x, [[2, 8], [2, 2], [8, -2], [24, -2], [30, 2], [30, 24], [2, 24]], '#e0a040', '#8a5a10', 2); R_(x, 6, 4, 20, 14, 'rgba(120,70,10,.3)'); }
function mystifySaver(cv, x, s) {
  if (!s.pts) { s.pts = []; for (let j = 0; j < 2; j++) { const poly = []; for (let i = 0; i < 4; i++) poly.push({ x: rnd(0, cv.width), y: rnd(0, cv.height), vx: rnd(-3, 3), vy: rnd(-3, 3) }); s.pts.push({ poly, hue: j * 180, trail: [] }); } }
  x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, 0, cv.width, cv.height);
  for (const P of s.pts) { for (const p of P.poly) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > cv.width) p.vx *= -1; if (p.y < 0 || p.y > cv.height) p.vy *= -1; } P.hue = (P.hue + 0.5) % 360; P.trail.push(P.poly.map((p) => ({ x: p.x, y: p.y }))); if (P.trail.length > 12) P.trail.shift(); P.trail.forEach((poly, i) => { x.strokeStyle = `hsla(${P.hue},90%,60%,${i / P.trail.length})`; x.lineWidth = 2; x.beginPath(); poly.forEach((p, k) => (k ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.closePath(); x.stroke(); }); }
}
function marqueeSaver(cv, x, s) {
  if (s.px == null) { s.px = cv.width; s.py = rnd(60, cv.height - 60); }
  x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height);
  x.font = 'bold 48px Arial'; x.textBaseline = 'middle';
  const txt = (S.sn ? S.sn + ' rules!!!' : 'Windoze Me') + '   •   ';
  const w = x.measureText(txt).width;
  s.px -= 4; if (s.px < -w) s.px = cv.width;
  x.fillStyle = `hsl(${(performance.now() / 20) % 360},90%,60%)`;
  for (let xx = s.px; xx < cv.width; xx += w) x.fillText(txt, xx, s.py);
}
