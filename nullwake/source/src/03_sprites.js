// Nullwake — art drawn in code: enemy and pickup sprites (pre-rendered, with flipped and white-flash copies),
// glow textures, final bosses (drawn live), the player, pilot portraits and HUD icons.
const SPR = 2.5; // sprite pixels per world unit
const SPRITES = {}, GLOWS = {}, ICONS = {}, PICK = {};

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`; }
const light = (h, t = 0.45) => mix(h, '#ffffff', t), dark = (h, t = 0.45) => mix(h, '#000000', t);
function rgba(h, a) { const A = hexRgb(h); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; }
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
function ball(c, x, y, r, col) { // shaded sphere fill for the current path
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
  g.addColorStop(0, light(col, 0.4)); g.addColorStop(0.55, col); g.addColorStop(1, dark(col, 0.5)); return g;
}
function eye(c, x, y, r, col) { c.fillStyle = rgba(col, 0.35); circ(c, x, y, r * 1.9); c.fill(); c.fillStyle = col; circ(c, x, y, r); c.fill(); c.fillStyle = '#fff'; circ(c, x - r * 0.3, y - r * 0.3, r * 0.35); c.fill(); }
function mirror(src) { const c = makeCanvas(src.width, src.height), x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
function tinted(src, col) { const c = makeCanvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; }
function outlined(src, px, col) {
  const c = makeCanvas(src.width, src.height), x = c.getContext('2d'), sil = tinted(src, col);
  for (let a = 0; a < 8; a++) x.drawImage(sil, Math.cos(a * TAU / 8) * px, Math.sin(a * TAU / 8) * px);
  x.drawImage(src, 0, 0); return c;
}

// ---- enemy shapes: drawn facing right (+x) around the origin, top-down, in world units ----
const SHAPES = {
  bug(c, r, f, d) {
    c.lineCap = 'round'; c.lineWidth = r * 0.14; c.strokeStyle = dark(d.c2, 0.2);
    const sw = f ? 1 : -1;
    for (let i = -1; i <= 1; i++) {
      const x = i * r * 0.42, o = (i === 0 ? -sw : sw) * r * 0.24;
      c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + o * 0.5, -r * 0.7, x + o, -r * 1.05); c.stroke();
      c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x - o * 0.5, r * 0.7, x - o, r * 1.05); c.stroke();
    }
    ell(c, -r * 0.22, 0, r * 0.72, r * 0.6); c.fillStyle = ball(c, -r * 0.22, 0, r * 0.7, d.c1); c.fill();
    c.strokeStyle = d.c2; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(-r * 0.92, 0); c.lineTo(r * 0.12, 0); c.stroke();
    ell(c, r * 0.5, 0, r * 0.4, r * 0.38); c.fillStyle = ball(c, r * 0.5, 0, r * 0.4, d.c2); c.fill();
    c.strokeStyle = d.c2; c.lineWidth = r * 0.07;
    c.beginPath(); c.moveTo(r * 0.8, -r * 0.15); c.quadraticCurveTo(r * 1.2, -r * 0.3, r * 1.3, -r * 0.6 - sw * r * 0.05); c.stroke();
    c.beginPath(); c.moveTo(r * 0.8, r * 0.15); c.quadraticCurveTo(r * 1.2, r * 0.3, r * 1.3, r * 0.6 - sw * r * 0.05); c.stroke();
    eye(c, r * 0.7, -r * 0.17, r * 0.1, d.c3); eye(c, r * 0.7, r * 0.17, r * 0.1, d.c3);
  },
  grub(c, r, f, d) {
    const w = f ? 1 : -1;
    for (let i = 4; i >= 0; i--) {
      const x = -r * 0.95 + i * r * 0.42, y = Math.sin(i * 1.3) * r * 0.12 * w, s = r * (0.36 + i * 0.07);
      circ(c, x, y, s); c.fillStyle = ball(c, x, y, s, i === 4 ? d.c2 : d.c1); c.fill();
      if (i < 4) { c.strokeStyle = rgba('#000000', 0.25); c.lineWidth = r * 0.05; c.beginPath(); c.arc(x, y, s * 0.7, -1, 1); c.stroke(); }
    }
    c.strokeStyle = d.c3; c.lineWidth = r * 0.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(r * 1.05, -r * 0.2); c.lineTo(r * 1.35, -r * 0.05 * w - r * 0.1); c.moveTo(r * 1.05, r * 0.2); c.lineTo(r * 1.35, r * 0.1 - r * 0.05 * w); c.stroke();
    c.fillStyle = '#ff6a3d'; circ(c, r * 0.95, -r * 0.18, r * 0.07); c.fill(); circ(c, r * 0.95, r * 0.18, r * 0.07); c.fill();
  },
  flyer(c, r, f, d) {
    const span = f ? 1.15 : 0.75, sweep = f ? -0.35 : -0.6;
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(r * 0.3, 0); c.quadraticCurveTo(r * 0.2, s * r * span * 0.9, r * sweep, s * r * span * 1.1);
      c.quadraticCurveTo(-r * 0.2, s * r * span * 0.5, -r * 0.55, s * r * 0.15); c.closePath();
      const g = c.createLinearGradient(0, 0, 0, s * r * span); g.addColorStop(0, d.c1); g.addColorStop(1, rgba(d.c2, 0.85)); c.fillStyle = g; c.fill();
      c.strokeStyle = light(d.c1, 0.3); c.lineWidth = r * 0.05; c.beginPath(); c.moveTo(r * 0.1, 0); c.lineTo(r * sweep * 0.8, s * r * span * 0.95); c.stroke();
    }
    ell(c, 0, 0, r * 0.7, r * 0.3); c.fillStyle = ball(c, 0, 0, r * 0.6, d.c2); c.fill();
    c.beginPath(); c.moveTo(-r * 0.6, 0); c.lineTo(-r * 1.25, -r * 0.08); c.lineTo(-r * 1.25, r * 0.08); c.closePath(); c.fillStyle = d.c2; c.fill();
    eye(c, r * 0.45, -r * 0.11, r * 0.09, d.c3); eye(c, r * 0.45, r * 0.11, r * 0.09, d.c3);
  },
  jelly(c, r, f, d) {
    c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = (i - 2) * r * 0.28, ph = f ? 0 : Math.PI;
      c.strokeStyle = rgba(d.c1, 0.75); c.lineWidth = r * 0.09;
      c.beginPath(); c.moveTo(-r * 0.2, y * 0.8);
      for (let k = 1; k <= 6; k++) { const x = -r * 0.2 - k * r * 0.22; c.lineTo(x, y + Math.sin(k * 1.2 + ph + i) * r * 0.12); }
      c.stroke();
    }
    circ(c, r * 0.15, 0, r * 0.82); const g = c.createRadialGradient(r * 0.05, -r * 0.2, r * 0.1, r * 0.15, 0, r * 0.85);
    g.addColorStop(0, rgba('#ffffff', 0.9)); g.addColorStop(0.35, rgba(d.c1, 0.85)); g.addColorStop(1, rgba(d.c2, 0.9)); c.fillStyle = g; c.fill();
    c.strokeStyle = rgba('#ffffff', 0.35); c.lineWidth = r * 0.05;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + (f ? 0.2 : 0); c.beginPath(); c.moveTo(r * 0.15, 0); c.lineTo(r * 0.15 + Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); c.stroke(); }
    circ(c, r * 0.15, 0, r * 0.28); c.fillStyle = rgba(d.c3, 0.9); c.fill();
  },
  pod(c, r, f, d) {
    const s = f ? 1.04 : 0.96, pts = [[0, 0, 0.55], [-0.5, -0.42, 0.42], [-0.5, 0.42, 0.42], [0.42, -0.5, 0.38], [0.42, 0.5, 0.38], [-0.85, 0, 0.32]];
    for (const [x, y, k] of pts.slice().reverse()) {
      const R0 = r * k * s; circ(c, x * r, y * r, R0); c.fillStyle = ball(c, x * r, y * r, R0, d.c1); c.fill();
      c.strokeStyle = rgba(d.c2, 0.8); c.lineWidth = r * 0.05; c.stroke();
      c.fillStyle = rgba(d.c3, 0.75); circ(c, x * r + R0 * 0.15, y * r + R0 * 0.1, R0 * 0.28); c.fill();
    }
  },
  drone(c, r, f, d) {
    c.lineCap = 'round';
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = sx * r * 0.72, y = sy * r * 0.72;
      c.strokeStyle = d.c2; c.lineWidth = r * 0.14; c.beginPath(); c.moveTo(0, 0); c.lineTo(x, y); c.stroke();
      circ(c, x, y, r * 0.34); c.fillStyle = rgba(d.c2, 0.6); c.fill(); c.strokeStyle = rgba(d.c1, 0.6); c.lineWidth = r * 0.04; c.stroke();
      const a = (f ? 0 : Math.PI / 4) + sx * 0.3; c.strokeStyle = rgba('#ffffff', 0.55); c.lineWidth = r * 0.07;
      c.beginPath(); c.moveTo(x - Math.cos(a) * r * 0.3, y - Math.sin(a) * r * 0.3); c.lineTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); c.stroke();
    }
    const hx = []; for (let i = 0; i < 6; i++) hx.push(Math.cos(i * TAU / 6) * r * 0.62, Math.sin(i * TAU / 6) * r * 0.62);
    poly(c, hx); c.fillStyle = ball(c, 0, 0, r * 0.62, d.c1); c.fill(); c.strokeStyle = d.c2; c.lineWidth = r * 0.06; c.stroke();
    c.strokeStyle = rgba(d.c2, 0.7); c.lineWidth = r * 0.04; c.beginPath(); c.moveTo(-r * 0.5, -r * 0.2); c.lineTo(-r * 0.1, -r * 0.2); c.moveTo(-r * 0.5, r * 0.2); c.lineTo(-r * 0.1, r * 0.2); c.stroke();
    circ(c, r * 0.22, 0, r * 0.24); c.fillStyle = '#111'; c.fill(); eye(c, r * 0.24, 0, r * 0.14, d.c3);
  },
  ship(c, r, f, d) {
    c.fillStyle = rgba(d.c3, f ? 0.9 : 0.55); ell(c, -r * 0.75, 0, r * (f ? 0.55 : 0.4), r * 0.2); c.fill();
    poly(c, [r * 1.05, 0, -r * 0.7, -r * 0.82, -r * 0.42, 0, -r * 0.7, r * 0.82]);
    const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, light(d.c1, 0.2)); g.addColorStop(0.5, d.c1); g.addColorStop(1, dark(d.c1, 0.35)); c.fillStyle = g; c.fill();
    c.strokeStyle = d.c2; c.lineWidth = r * 0.07; c.stroke();
    c.strokeStyle = rgba(d.c2, 0.8); c.lineWidth = r * 0.05; c.beginPath(); c.moveTo(-r * 0.5, -r * 0.5); c.lineTo(r * 0.3, -r * 0.1); c.moveTo(-r * 0.5, r * 0.5); c.lineTo(r * 0.3, r * 0.1); c.stroke();
    c.strokeStyle = '#333'; c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(r * 0.5, 0); c.lineTo(r * 1.3, 0); c.stroke();
    ell(c, r * 0.1, 0, r * 0.32, r * 0.18); c.fillStyle = ball(c, r * 0.1, 0, r * 0.3, '#4a8acc'); c.fill();
  },
  rock(c, r, f, d) {
    const rnd = artRng(Math.round(r * 97)), pts = [];
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, k = 0.82 + rnd() * 0.2; pts.push(Math.cos(a) * r * k, Math.sin(a) * r * k); }
    poly(c, pts); c.fillStyle = ball(c, 0, 0, r, d.c1); c.fill(); c.strokeStyle = d.c2; c.lineWidth = r * 0.06; c.stroke();
    for (let i = 0; i < 4; i++) { const x = (rnd() - 0.6) * r * 1.1, y = (rnd() - 0.5) * r * 1.2, s = r * (0.1 + rnd() * 0.12); circ(c, x, y, s); c.fillStyle = rgba(d.c2, 0.5); c.fill(); }
    c.strokeStyle = rgba(d.c3, f ? 0.95 : 0.6); c.lineWidth = r * 0.07; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-r * 0.7, -r * 0.3); c.lineTo(-r * 0.3, -r * 0.1); c.lineTo(-r * 0.1, -r * 0.4); c.lineTo(r * 0.2, -r * 0.25);
    c.moveTo(-r * 0.5, r * 0.45); c.lineTo(-r * 0.1, r * 0.25); c.lineTo(r * 0.15, r * 0.5); c.stroke();
    c.fillStyle = d.c3; ell(c, r * 0.55, -r * 0.2, r * 0.14, r * 0.07, 0.3); c.fill(); ell(c, r * 0.55, r * 0.2, r * 0.14, r * 0.07, -0.3); c.fill();
  },
  spider(c, r, f, d) {
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = d.c2; c.lineWidth = r * 0.11; const sw = f ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      const x = r * (0.35 - i * 0.28), o = ((i % 2) ? sw : -sw) * r * 0.15;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x * 0.5, 0); c.lineTo(x + o + r * 0.1, s * r * 0.75); c.lineTo(x + o - r * 0.15 + (i < 2 ? r * 0.3 : -r * 0.2), s * r * 1.15); c.stroke(); }
    }
    ell(c, -r * 0.35, 0, r * 0.62, r * 0.55); c.fillStyle = ball(c, -r * 0.35, 0, r * 0.6, d.c1); c.fill();
    c.fillStyle = rgba(d.c3, 0.7); poly(c, [-r * 0.6, 0, -r * 0.35, -r * 0.2, -r * 0.1, 0, -r * 0.35, r * 0.2]); c.fill();
    circ(c, r * 0.4, 0, r * 0.36); c.fillStyle = ball(c, r * 0.4, 0, r * 0.36, d.c2); c.fill();
    for (const [x, y, s] of [[0.6, -0.12, 0.08], [0.6, 0.12, 0.08], [0.5, -0.24, 0.05], [0.5, 0.24, 0.05]]) eye(c, x * r, y * r, s * r, d.c3);
  },
  mantis(c, r, f, d) {
    c.lineCap = 'round'; c.strokeStyle = d.c2; c.lineWidth = r * 0.1;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-r * 0.3, 0); c.lineTo(-r * 0.6, s * r * 0.8); c.lineTo(-r * 0.9, s * r * 0.95); c.moveTo(0, 0); c.lineTo(-r * 0.05, s * r * 0.85); c.stroke(); }
    ell(c, -r * 0.55, 0, r * 0.65, r * 0.32); c.fillStyle = ball(c, -r * 0.55, 0, r * 0.6, d.c1); c.fill();
    c.strokeStyle = rgba(d.c2, 0.6); c.lineWidth = r * 0.05; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-r * (0.3 + i * 0.25), -r * 0.28); c.lineTo(-r * (0.3 + i * 0.25), r * 0.28); c.stroke(); }
    ell(c, r * 0.2, 0, r * 0.4, r * 0.2); c.fillStyle = d.c1; c.fill();
    const reach = f ? 1 : 0.7;
    c.strokeStyle = light(d.c1, 0.2); c.lineWidth = r * 0.12;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(r * 0.3, s * r * 0.12); c.lineTo(r * (0.55 + 0.25 * reach), s * r * 0.55); c.quadraticCurveTo(r * (0.95 + 0.3 * reach), s * r * 0.5, r * (1.05 + 0.25 * reach), s * r * 0.15); c.stroke(); }
    poly(c, [r * 1.05, 0, r * 0.6, -r * 0.3, r * 0.55, r * 0.3]); c.fillStyle = ball(c, r * 0.75, 0, r * 0.35, d.c2); c.fill();
    eye(c, r * 0.68, -r * 0.2, r * 0.1, d.c3); eye(c, r * 0.68, r * 0.2, r * 0.1, d.c3);
  },
  sac(c, r, f, d) {
    c.strokeStyle = d.c2; c.lineWidth = r * 0.1; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = -r * 0.4 + i * r * 0.35; c.beginPath(); c.moveTo(x, s * r * 0.5); c.lineTo(x + (f ? 0.1 : -0.1) * r * s, s * r * 1.0); c.stroke(); }
    const k = f ? 1.04 : 0.97; circ(c, -r * 0.1, 0, r * 0.8 * k); c.fillStyle = ball(c, -r * 0.1, 0, r * 0.8, d.c1); c.fill();
    c.strokeStyle = rgba(d.c2, 0.55); c.lineWidth = r * 0.05;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-r * 0.75, (i - 1.5) * r * 0.3); c.quadraticCurveTo(-r * 0.3, (i - 1.5) * r * 0.5, r * 0.3, (i - 1.5) * r * 0.15); c.stroke(); }
    circ(c, r * 0.55, 0, r * 0.3); c.fillStyle = '#1a0a10'; c.fill();
    c.fillStyle = d.c3; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; circ(c, r * 0.55 + Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22, r * 0.05); c.fill(); }
  },
  shell(c, r, f, d) {
    c.strokeStyle = d.c2; c.lineWidth = r * 0.1; c.lineCap = 'round'; const sw = f ? 1 : -1;
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = -r * 0.45 + i * r * 0.45 + sw * s * r * 0.08; c.beginPath(); c.moveTo(x, s * r * 0.6); c.lineTo(x + r * 0.1, s * r * 0.98); c.stroke(); }
    ell(c, r * 0.75, 0, r * 0.3, r * 0.32); c.fillStyle = ball(c, r * 0.75, 0, r * 0.3, d.c2); c.fill();
    c.strokeStyle = d.c3; c.lineWidth = r * 0.06; c.beginPath(); c.moveTo(r * 0.95, -r * 0.15); c.lineTo(r * 1.2, -r * 0.3); c.moveTo(r * 0.95, r * 0.15); c.lineTo(r * 1.2, r * 0.3); c.stroke();
    ell(c, -r * 0.08, 0, r * 0.9, r * 0.74); c.fillStyle = ball(c, -r * 0.08, 0, r * 0.85, d.c1); c.fill(); c.strokeStyle = d.c2; c.lineWidth = r * 0.06; c.stroke();
    c.lineWidth = r * 0.05; c.strokeStyle = rgba(d.c2, 0.75); c.beginPath(); c.moveTo(-r * 0.95, 0); c.lineTo(r * 0.8, 0); c.stroke();
    for (const x of [-0.5, 0, 0.45]) { c.beginPath(); c.ellipse(-r * 0.08, 0, r * 0.9 * Math.abs(x + 0.08) + 0.01, r * 0.74, 0, -Math.PI / 2, Math.PI / 2, x < -0.08); c.stroke(); }
    c.fillStyle = rgba(d.c3, 0.85); circ(c, r * 0.9, -r * 0.12, r * 0.06); c.fill(); circ(c, r * 0.9, r * 0.12, r * 0.06); c.fill();
  },
  orb(c, r, f, d) {
    const a0 = f ? 0 : Math.PI / 8;
    c.strokeStyle = rgba(d.c1, 0.85); c.lineWidth = r * 0.12; c.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = a0 + i * TAU / 8, l = i % 2 ? 1.0 : 1.25; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); c.lineTo(Math.cos(a) * r * l, Math.sin(a) * r * l); c.stroke(); }
    circ(c, 0, 0, r * 0.95); c.fillStyle = rgba(d.c1, 0.18); c.fill();
    circ(c, 0, 0, r * 0.62); const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.62); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, d.c1); g.addColorStop(1, d.c2); c.fillStyle = g; c.fill();
  },
  ghost(c, r, f, d) {
    const w = f ? 1 : -1;
    c.beginPath(); c.moveTo(r * 0.75, 0); c.bezierCurveTo(r * 0.7, -r * 0.9, -r * 0.3, -r * 0.8, -r * 0.7, -r * 0.45);
    c.quadraticCurveTo(-r * 1.1, -r * 0.3 + w * r * 0.15, -r * 1.45, -r * 0.35 + w * r * 0.2); c.quadraticCurveTo(-r * 1.0, 0, -r * 1.45, r * 0.35 + w * r * 0.2);
    c.quadraticCurveTo(-r * 1.1, r * 0.3 + w * r * 0.15, -r * 0.7, r * 0.45); c.bezierCurveTo(-r * 0.3, r * 0.8, r * 0.7, r * 0.9, r * 0.75, 0); c.closePath();
    const g = c.createLinearGradient(r, 0, -r * 1.4, 0); g.addColorStop(0, rgba(d.c1, 0.95)); g.addColorStop(0.6, rgba(d.c2, 0.85)); g.addColorStop(1, rgba(d.c2, 0)); c.fillStyle = g; c.fill();
    circ(c, r * 0.3, 0, r * 0.45); c.fillStyle = rgba('#0a0a1a', 0.9); c.fill();
    eye(c, r * 0.45, -r * 0.15, r * 0.08, d.c3); eye(c, r * 0.45, r * 0.15, r * 0.08, d.c3);
  },
  husk(c, r, f, d) {
    c.lineCap = 'round'; c.strokeStyle = d.c1; c.lineWidth = r * 0.24; const sw = f ? 1 : -1;
    c.beginPath(); c.moveTo(0, -r * 0.5); c.lineTo(r * (0.75 + 0.15 * sw), -r * 0.42); c.moveTo(0, r * 0.5); c.lineTo(r * (0.75 - 0.15 * sw), r * 0.42); c.stroke();
    c.fillStyle = d.c2; circ(c, r * (0.85 + 0.15 * sw), -r * 0.42, r * 0.13); c.fill(); circ(c, r * (0.85 - 0.15 * sw), r * 0.42, r * 0.13); c.fill();
    c.fillStyle = dark(d.c1, 0.3); c.fillRect(-r * 0.95, -r * 0.35, r * 0.4, r * 0.7);
    ell(c, -r * 0.1, 0, r * 0.5, r * 0.75); c.fillStyle = ball(c, -r * 0.1, 0, r * 0.7, d.c1); c.fill(); c.strokeStyle = d.c2; c.lineWidth = r * 0.05; c.stroke();
    circ(c, r * 0.15, 0, r * 0.42); c.fillStyle = ball(c, r * 0.15, 0, r * 0.42, '#c8ccd4'); c.fill();
    c.beginPath(); c.ellipse(r * 0.28, 0, r * 0.25, r * 0.32, 0, -1.2, 1.2); c.fillStyle = rgba(d.c3, 0.85); c.fill();
    c.strokeStyle = '#102010'; c.lineWidth = r * 0.04; c.beginPath(); c.moveTo(r * 0.3, -r * 0.25); c.lineTo(r * 0.38, -r * 0.02); c.lineTo(r * 0.3, r * 0.12); c.stroke();
  },
  mech(c, r, f, d) {
    const st = f ? 1 : -1;
    c.fillStyle = dark(d.c2, 0.2);
    for (const s of [-1, 1]) { c.fillRect(-r * 0.35 + st * s * r * 0.25, s * r * 0.55 - r * 0.18, r * 0.6, r * 0.36); }
    c.strokeStyle = '#2a2a2a'; c.lineWidth = r * 0.16; c.beginPath(); c.moveTo(r * 0.3, -r * 0.48); c.lineTo(r * 1.2, -r * 0.48); c.moveTo(r * 0.3, r * 0.48); c.lineTo(r * 1.2, r * 0.48); c.stroke();
    for (const s of [-1, 1]) { ell(c, r * 0.05, s * r * 0.55, r * 0.38, r * 0.3); c.fillStyle = ball(c, r * 0.05, s * r * 0.55, r * 0.38, d.c1); c.fill(); c.strokeStyle = d.c2; c.lineWidth = r * 0.05; c.stroke(); }
    c.beginPath(); c.roundRect(-r * 0.55, -r * 0.45, r * 1.05, r * 0.9, r * 0.18);
    const g = c.createLinearGradient(0, -r * 0.5, 0, r * 0.5); g.addColorStop(0, light(d.c1, 0.25)); g.addColorStop(1, dark(d.c1, 0.3)); c.fillStyle = g; c.fill(); c.strokeStyle = d.c2; c.lineWidth = r * 0.06; c.stroke();
    c.strokeStyle = rgba(d.c2, 0.7); c.lineWidth = r * 0.04; c.beginPath(); c.moveTo(-r * 0.4, -r * 0.2); c.lineTo(r * 0.0, -r * 0.2); c.moveTo(-r * 0.4, r * 0.2); c.lineTo(r * 0.0, r * 0.2); c.stroke();
    c.fillStyle = '#111'; c.fillRect(r * 0.18, -r * 0.18, r * 0.3, r * 0.36); eye(c, r * 0.36, 0, r * 0.1, d.c3);
  },
};

// ---- final bosses, drawn live (t = seconds, a = aim angle) ----
const BOSS_DRAW = {
  maw(c, r, t, d, a) {
    for (let i = 0; i < 6; i++) { // orbiting debris
      const k = t * 0.6 + i * TAU / 6, x = Math.cos(k) * r * 1.35, y = Math.sin(k) * r * 1.35;
      c.fillStyle = d.c2; poly(c, [x - 6, y - 4, x + 2, y - 7, x + 7, y + 1, x + 1, y + 6, x - 5, y + 4]); c.fill();
    }
    const rnd = artRng(77), pts = [];
    for (let i = 0; i < 16; i++) { const k = i / 16 * TAU, m = 0.85 + rnd() * 0.17; pts.push(Math.cos(k) * r * m, Math.sin(k) * r * m); }
    c.save(); c.rotate(a);
    poly(c, pts); c.fillStyle = ball(c, 0, 0, r, d.c1); c.fill(); c.strokeStyle = d.c2; c.lineWidth = 3; c.stroke();
    const glow = 0.55 + 0.45 * Math.sin(t * 3);
    c.strokeStyle = rgba(d.c3, glow); c.lineWidth = 4; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-r * 0.8, -r * 0.2); c.lineTo(-r * 0.4, -r * 0.05); c.lineTo(-r * 0.2, -r * 0.45); c.lineTo(r * 0.1, -r * 0.6);
    c.moveTo(-r * 0.7, r * 0.4); c.lineTo(-r * 0.3, r * 0.3); c.lineTo(-r * 0.05, r * 0.65); c.stroke();
    const open = 0.32 + 0.12 * Math.sin(t * 4);
    c.beginPath(); c.moveTo(r * 0.05, 0); c.lineTo(r * 1.0, -r * open * 1.6); c.lineTo(r * 1.0, r * open * 1.6); c.closePath();
    const g = c.createRadialGradient(r * 0.3, 0, 2, r * 0.4, 0, r * 0.8); g.addColorStop(0, '#ffcf6b'); g.addColorStop(0.3, d.c3); g.addColorStop(1, '#1a0500'); c.fillStyle = g; c.fill();
    c.fillStyle = '#e8e0d0';
    for (let i = 0; i < 5; i++) { const x = r * (0.25 + i * 0.16), y = r * open * 1.6 * (x / r - 0.05); poly(c, [x, -y, x + 6, -y, x + 3, -y + 9]); c.fill(); poly(c, [x, y, x + 6, y, x + 3, y - 9]); c.fill(); }
    c.fillStyle = d.c3; ell(c, r * 0.35, -r * 0.55, 7, 4, 0.4); c.fill(); ell(c, r * 0.35, r * 0.55, 7, 4, -0.4); c.fill();
    c.restore();
  },
  queen(c, r, t, d, a) {
    c.save(); c.rotate(a);
    const fl = Math.sin(t * 22);
    for (const s of [-1, 1]) { // wings
      c.beginPath(); c.ellipse(-r * 0.05, s * r * 0.7, r * 0.75, r * (0.28 + 0.06 * fl), s * (0.5 + 0.08 * fl), 0, TAU); c.fillStyle = rgba('#e0f0ff', 0.28); c.fill(); c.strokeStyle = rgba('#ffffff', 0.4); c.lineWidth = 1.5; c.stroke();
    }
    c.strokeStyle = d.c2; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = r * (0.1 + i * 0.22), k = Math.sin(t * 6 + i * 2 + s) * 6; c.beginPath(); c.moveTo(x, s * r * 0.2); c.lineTo(x + 6, s * r * 0.55 + k); c.lineTo(x + 18, s * r * 0.75 + k); c.stroke(); }
    const pul = 1 + 0.03 * Math.sin(t * 3);
    ell(c, -r * 0.55, 0, r * 0.72 * pul, r * 0.52 * pul); c.fillStyle = ball(c, -r * 0.55, 0, r * 0.7, d.c1); c.fill();
    c.strokeStyle = rgba(d.c2, 0.8); c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(-r * 0.55, 0, r * (0.2 + i * 0.14), r * 0.5, 0, -1.1, 1.1); c.stroke(); }
    for (let i = 0; i < 7; i++) { const x = -r * 0.9 + (i % 4) * r * 0.2, y = (i < 4 ? -1 : 1) * r * 0.22 + Math.sin(i * 3) * 6; c.fillStyle = rgba(d.c3, 0.5 + 0.5 * Math.sin(t * 4 + i)); circ(c, x, y, 5); c.fill(); }
    ell(c, r * 0.25, 0, r * 0.36, r * 0.3); c.fillStyle = ball(c, r * 0.25, 0, r * 0.35, d.c2); c.fill();
    circ(c, r * 0.68, 0, r * 0.24); c.fillStyle = ball(c, r * 0.68, 0, r * 0.24, d.c1); c.fill();
    c.fillStyle = d.c3; for (let i = -2; i <= 2; i++) { const y = i * r * 0.1; poly(c, [r * 0.6, y - 4, r * 0.6, y + 4, r * 0.45, y * 1.8]); c.fill(); }
    eye(c, r * 0.8, -r * 0.1, 5, '#ff3d6a'); eye(c, r * 0.8, r * 0.1, 5, '#ff3d6a');
    c.strokeStyle = d.c3; c.lineWidth = 4; c.beginPath(); c.moveTo(r * 0.88, -r * 0.08); c.lineTo(r * 1.05, -r * 0.18); c.moveTo(r * 0.88, r * 0.08); c.lineTo(r * 1.05, r * 0.18); c.stroke();
    c.restore();
  },
  core(c, r, t, d, a) {
    c.lineCap = 'round';
    for (let k = 0; k < 2; k++) { // rings
      const rr2 = r * (1.05 + k * 0.22), sp = (k ? -0.5 : 0.8) * t;
      c.strokeStyle = rgba(k ? d.c3 : '#5ef0ff', 0.75); c.lineWidth = k ? 3 : 5;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(0, 0, rr2, sp + i * TAU / 6, sp + i * TAU / 6 + 0.7); c.stroke(); }
    }
    const open = 0.15 + 0.1 * Math.sin(t * 1.5);
    for (let i = 0; i < 6; i++) { // petals
      const k = i * TAU / 6 + t * 0.2;
      c.save(); c.rotate(k); c.translate(r * open, 0);
      poly(c, [r * 0.3, -r * 0.42, r * 0.85, -r * 0.2, r * 0.85, r * 0.2, r * 0.3, r * 0.42]);
      const g = c.createLinearGradient(r * 0.3, 0, r * 0.85, 0); g.addColorStop(0, d.c2); g.addColorStop(1, d.c1); c.fillStyle = g; c.fill();
      c.strokeStyle = rgba('#000000', 0.5); c.lineWidth = 2; c.stroke(); c.fillStyle = rgba(d.c3, 0.8); c.fillRect(r * 0.7, -2, r * 0.1, 4);
      c.restore();
    }
    circ(c, 0, 0, r * 0.5); c.fillStyle = ball(c, 0, 0, r * 0.5, '#2a3040'); c.fill();
    const ex = Math.cos(a) * r * 0.14, ey = Math.sin(a) * r * 0.14;
    circ(c, ex, ey, r * 0.3); const g2 = c.createRadialGradient(ex, ey, 0, ex, ey, r * 0.3); g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.3, d.c3); g2.addColorStop(1, dark(d.c3, 0.6)); c.fillStyle = g2; c.fill();
    circ(c, ex * 1.3, ey * 1.3, r * 0.1); c.fillStyle = '#100008'; c.fill();
  },
};

// ---- the player: a suited pilot, top-down, facing right ----
function drawPilot(c, r, f, p) {
  const sw = f ? 1 : -1;
  c.fillStyle = rgba('#5ef0ff', f ? 0.8 : 0.5); ell(c, -r * 1.05, 0, r * 0.35, r * 0.28); c.fill();
  c.fillStyle = dark(p.suit, 0.35); c.beginPath(); c.roundRect(-r * 0.95, -r * 0.5, r * 0.5, r * 1.0, r * 0.15); c.fill();
  c.fillStyle = rgba('#5ef0ff', 0.9); c.fillRect(-r * 0.85, -r * 0.3, r * 0.12, r * 0.18); c.fillRect(-r * 0.85, r * 0.12, r * 0.12, r * 0.18);
  c.lineCap = 'round'; c.strokeStyle = p.suit; c.lineWidth = r * 0.3;
  c.beginPath(); c.moveTo(0, -r * 0.55); c.lineTo(r * (0.55 + 0.12 * sw), -r * 0.6); c.moveTo(0, r * 0.55); c.lineTo(r * (0.55 - 0.12 * sw), r * 0.6); c.stroke();
  c.fillStyle = p.trim; circ(c, r * (0.6 + 0.12 * sw), -r * 0.6, r * 0.15); c.fill(); circ(c, r * (0.6 - 0.12 * sw), r * 0.6, r * 0.15); c.fill();
  ell(c, -r * 0.1, 0, r * 0.52, r * 0.75); c.fillStyle = ball(c, -r * 0.1, 0, r * 0.7, p.suit); c.fill(); c.strokeStyle = dark(p.suit, 0.5); c.lineWidth = r * 0.06; c.stroke();
  c.strokeStyle = p.trim; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(-r * 0.35, -r * 0.6); c.lineTo(-r * 0.35, r * 0.6); c.stroke();
  circ(c, r * 0.22, 0, r * 0.46); c.fillStyle = ball(c, r * 0.22, 0, r * 0.46, p.trim); c.fill(); c.strokeStyle = dark(p.trim, 0.5); c.lineWidth = r * 0.05; c.stroke();
  c.beginPath(); c.ellipse(r * 0.38, 0, r * 0.26, r * 0.34, 0, -1.25, 1.25); const g = c.createLinearGradient(r * 0.2, -r * 0.3, r * 0.6, r * 0.3); g.addColorStop(0, light(p.visor, 0.5)); g.addColorStop(1, dark(p.visor, 0.2)); c.fillStyle = g; c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; ell(c, r * 0.45, -r * 0.14, r * 0.06, r * 0.1, 0.3); c.fill();
}
function buildPlayerSprite(pilotId) {
  const p = PILOTS[pilotId], r = 12, pad = r * 1.7, size = pad * 2 * SPR, frames = [];
  for (let f = 0; f < 2; f++) {
    const cv = makeCanvas(size, size), x = cv.getContext('2d'); x.translate(size / 2, size / 2); x.scale(SPR, SPR); drawPilot(x, r, f, p);
    const n = outlined(cv, 2, 'rgba(0,0,0,.75)'); frames.push({ n, f: mirror(n), w: tinted(n, '#ff4050'), wf: mirror(tinted(n, '#ff4050')) });
  }
  return { frames, half: pad };
}
function portrait(pilotId, size = 96) {
  const p = PILOTS[pilotId], c = makeCanvas(size, size), x = c.getContext('2d'), s = size / 96;
  const g = x.createLinearGradient(0, 0, 0, size); g.addColorStop(0, dark(p.suit, 0.55)); g.addColorStop(1, '#060a18'); x.fillStyle = g; x.fillRect(0, 0, size, size);
  x.scale(s, s);
  x.fillStyle = p.suit; x.beginPath(); x.ellipse(48, 104, 44, 34, 0, 0, TAU); x.fill();
  x.fillStyle = p.trim; x.fillRect(30, 74, 36, 8);
  circ(x, 48, 46, 30); x.fillStyle = ball(x, 48, 46, 30, p.trim); x.fill(); x.strokeStyle = dark(p.trim, 0.5); x.lineWidth = 2; x.stroke();
  x.beginPath(); x.ellipse(48, 48, 22, 17, 0, 0, TAU); const v = x.createLinearGradient(30, 32, 66, 66); v.addColorStop(0, light(p.visor, 0.55)); v.addColorStop(0.5, p.visor); v.addColorStop(1, dark(p.visor, 0.5)); x.fillStyle = v; x.fill();
  x.fillStyle = 'rgba(255,255,255,.65)'; x.beginPath(); x.ellipse(40, 41, 7, 3.5, -0.5, 0, TAU); x.fill();
  x.fillStyle = rgba('#5ef0ff', 0.9); x.fillRect(73, 40, 6, 10);
  return c;
}

// ---- enemy sprite sheets ----
function buildEnemySprite(id, scale = 1) {
  const d = ENEMIES[id], r = d.r * scale, pad = r * 1.6, size = pad * 2 * SPR, frames = [];
  for (let f = 0; f < 2; f++) {
    const cv = makeCanvas(size, size), x = cv.getContext('2d'); x.translate(size / 2, size / 2); x.scale(SPR, SPR);
    SHAPES[d.shape](x, r, f, d);
    const n = outlined(cv, Math.max(1.5, r * 0.09), 'rgba(0,0,0,.7)'), w = tinted(n, '#ffffff');
    frames.push({ n, f: mirror(n), w, wf: mirror(w) });
  }
  return { frames, half: pad };
}
function enemySprite(id, elite) {
  const key = elite ? id + '*' : id;
  if (!SPRITES[key]) SPRITES[key] = elite ? buildEnemySprite(id, 1.6) : buildEnemySprite(id);
  return SPRITES[key];
}

// ---- glows (additive blobs) ----
function glow(col) {
  if (GLOWS[col]) return GLOWS[col];
  const c = makeCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.25, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (GLOWS[col] = c);
}
function softDisc(col, a = 0.5) { // filled pool texture with a brighter rim
  const key = 'disc' + col + a; if (GLOWS[key]) return GLOWS[key];
  const c = makeCanvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, rgba(col, a * 0.5)); g.addColorStop(0.8, rgba(col, a * 0.8)); g.addColorStop(0.93, rgba(col, a * 1.4 > 1 ? 1 : a * 1.4)); g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (GLOWS[key] = c);
}

// ---- pickups ----
function buildPickups() {
  const mk = (r, fn) => { const pad = r * 1.8, cv = makeCanvas(pad * 2 * SPR, pad * 2 * SPR), x = cv.getContext('2d'); x.translate(cv.width / 2, cv.height / 2); x.scale(SPR, SPR); fn(x, r); return { img: outlined(cv, 1.5, 'rgba(0,0,0,.6)'), half: pad }; };
  const gem = (col) => (x, r) => {
    poly(x, [0, -r * 1.25, r * 0.8, 0, 0, r * 1.25, -r * 0.8, 0]); const g = x.createLinearGradient(-r, -r, r, r); g.addColorStop(0, light(col, 0.6)); g.addColorStop(0.5, col); g.addColorStop(1, dark(col, 0.4)); x.fillStyle = g; x.fill();
    x.fillStyle = 'rgba(255,255,255,.6)'; poly(x, [0, -r * 1.25, r * 0.25, -r * 0.2, -r * 0.4, -r * 0.1]); x.fill();
  };
  PICK.gem0 = mk(4.5, gem('#4fb4ff')); PICK.gem1 = mk(5.5, gem('#5effa0')); PICK.gem2 = mk(7, gem('#ff4f6a')); PICK.gem3 = mk(9, gem('#d08bff'));
  PICK.coin = mk(5.5, (x, r) => { circ(x, 0, 0, r); x.fillStyle = ball(x, 0, 0, r, '#ffc43d'); x.fill(); x.strokeStyle = '#a06a10'; x.lineWidth = 1; x.stroke(); x.fillStyle = '#fff2b0'; poly(x, [0, -r * 0.5, r * 0.43, -r * 0.25, r * 0.43, r * 0.25, 0, r * 0.5, -r * 0.43, r * 0.25, -r * 0.43, -r * 0.25]); x.globalAlpha = 0.6; x.fill(); x.globalAlpha = 1; });
  PICK.bag = mk(8, (x, r) => { for (const [dx, dy] of [[-4, 3], [4, 3], [0, -2], [-3, -6], [3, -7]]) { circ(x, dx, dy, r * 0.55); x.fillStyle = ball(x, dx, dy, r * 0.55, '#ffc43d'); x.fill(); x.strokeStyle = '#a06a10'; x.lineWidth = 0.8; x.stroke(); } });
  PICK.heal = mk(8, (x, r) => { x.beginPath(); x.roundRect(-r, -r * 0.75, r * 2, r * 1.5, 2); x.fillStyle = ball(x, 0, 0, r, '#e8f4ff'); x.fill(); x.fillStyle = '#28c870'; x.fillRect(-r * 0.18, -r * 0.55, r * 0.36, r * 1.1); x.fillRect(-r * 0.55, -r * 0.18, r * 1.1, r * 0.36); x.fillStyle = '#555'; x.fillRect(-r * 0.3, -r * 0.95, r * 0.6, r * 0.2); });
  PICK.magnet = mk(8, (x, r) => { x.lineWidth = r * 0.55; x.strokeStyle = '#e83c4c'; x.beginPath(); x.arc(0, -r * 0.05, r * 0.7, Math.PI * 0.05, Math.PI * 0.95, true); x.stroke(); x.strokeStyle = '#e83c4c'; x.beginPath(); x.moveTo(-r * 0.7, 0); x.lineTo(-r * 0.7, r * 0.6); x.moveTo(r * 0.7, 0); x.lineTo(r * 0.7, r * 0.6); x.stroke(); x.fillStyle = '#e8eef8'; x.fillRect(-r * 0.98, r * 0.5, r * 0.56, r * 0.4); x.fillRect(r * 0.42, r * 0.5, r * 0.56, r * 0.4); });
  PICK.emp = mk(8, (x, r) => { circ(x, 0, 0, r); x.fillStyle = ball(x, 0, 0, r, '#3d8bff'); x.fill(); x.strokeStyle = '#bfe8ff'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(0, 0, r * 1.25, r * 0.4, -0.4, 0, TAU); x.stroke(); x.fillStyle = '#fff6a0'; poly(x, [r * 0.15, -r * 0.7, -r * 0.35, r * 0.1, -r * 0.02, r * 0.1, -r * 0.2, r * 0.7, r * 0.35, -r * 0.1, r * 0.02, -r * 0.1]); x.fill(); });
  PICK.chest = mk(11, (x, r) => {
    x.beginPath(); x.roundRect(-r, -r * 0.7, r * 2, r * 1.4, 2); const g = x.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#6a7890'); g.addColorStop(1, '#2a3040'); x.fillStyle = g; x.fill();
    x.strokeStyle = '#ffd25e'; x.lineWidth = 1.6; x.stroke(); x.beginPath(); x.moveTo(-r, -r * 0.15); x.lineTo(r, -r * 0.15); x.stroke();
    x.fillStyle = '#ffd25e'; x.fillRect(-r * 0.2, -r * 0.35, r * 0.4, r * 0.45); x.fillStyle = '#fff'; x.fillRect(-r * 0.07, -r * 0.2, r * 0.14, r * 0.18);
    x.fillStyle = rgba('#5ef0ff', 0.9); x.fillRect(-r * 0.85, -r * 0.2, r * 0.5, r * 0.1); x.fillRect(r * 0.35, -r * 0.2, r * 0.5, r * 0.1);
  });
  PICK.pod = mk(12, (x, r) => {
    x.fillStyle = 'rgba(0,0,0,.35)'; ell(x, 2, r * 0.7, r * 0.9, r * 0.3); x.fill();
    x.beginPath(); x.roundRect(-r * 0.62, -r, r * 1.24, r * 1.8, r * 0.5); const g = x.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, '#5a6478'); g.addColorStop(0.4, '#c8d0e0'); g.addColorStop(1, '#3a4254'); x.fillStyle = g; x.fill();
    x.strokeStyle = '#1a2030'; x.lineWidth = 1.2; x.stroke(); x.fillStyle = '#ff8a3d'; x.fillRect(-r * 0.62, -r * 0.15, r * 1.24, r * 0.22);
    x.fillStyle = '#5ef0ff'; circ(x, 0, -r * 0.55, r * 0.17); x.fill();
  });
  PICK.mine = mk(5, (x, r) => { const p = []; for (let i = 0; i < 6; i++) p.push(Math.cos(i * TAU / 6) * r, Math.sin(i * TAU / 6) * r); poly(x, p); x.fillStyle = ball(x, 0, 0, r, '#6a5040'); x.fill(); circ(x, 0, 0, r * 0.4); x.fillStyle = '#ffb36b'; x.fill(); });
  PICK.missile = mk(5, (x, r) => { x.fillStyle = '#e8eef8'; x.beginPath(); x.moveTo(r * 1.4, 0); x.lineTo(r * 0.6, -r * 0.4); x.lineTo(-r * 1.1, -r * 0.4); x.lineTo(-r * 1.1, r * 0.4); x.lineTo(r * 0.6, r * 0.4); x.closePath(); x.fill(); x.fillStyle = '#ff5e6c'; x.fillRect(-r * 1.2, -r * 0.75, r * 0.5, r * 1.5); x.fillStyle = '#ff5e6c'; x.fillRect(r * 0.4, -r * 0.4, r * 0.3, r * 0.8); });
}

// ---- icons (64 px, used in the HUD and menus) ----
function iconFrame(x, col, gold) {
  const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#16203c'); g.addColorStop(1, '#070b18');
  x.fillStyle = g; x.beginPath(); x.roundRect(1, 1, 62, 62, 9); x.fill();
  x.strokeStyle = gold ? '#ffd25e' : rgba(col, 0.6); x.lineWidth = gold ? 3 : 2; x.stroke();
  const h = x.createRadialGradient(32, 32, 2, 32, 32, 30); h.addColorStop(0, rgba(col, 0.25)); h.addColorStop(1, rgba(col, 0)); x.fillStyle = h; x.fillRect(0, 0, 64, 64);
}
const GLYPH = {
  blaster(x, c) { x.fillStyle = c; for (const [px, py, s] of [[18, 44, 6], [32, 32, 8], [47, 18, 6]]) { x.save(); x.translate(px, py); x.rotate(-0.78); x.beginPath(); x.ellipse(0, 0, s * 1.6, s * 0.6, 0, 0, TAU); x.fill(); x.restore(); } },
  lash(x, c) { x.strokeStyle = c; x.lineCap = 'round'; x.lineWidth = 7; x.beginPath(); x.arc(32, 44, 24, -2.6, -0.4); x.stroke(); x.lineWidth = 3; x.strokeStyle = '#fff'; x.beginPath(); x.arc(32, 44, 24, -2.2, -0.9); x.stroke(); x.fillStyle = c; circ(x, 12, 50, 5); x.fill(); },
  drones(x, c) { x.strokeStyle = rgba(c, 0.5); x.lineWidth = 2; circ(x, 32, 32, 18); x.stroke(); x.fillStyle = c; for (let i = 0; i < 3; i++) { const a = i * TAU / 3 - 0.5; circ(x, 32 + Math.cos(a) * 18, 32 + Math.sin(a) * 18, 6); x.fill(); } x.fillStyle = '#fff'; circ(x, 32, 32, 5); x.fill(); },
  rail(x, c) { x.strokeStyle = c; x.lineCap = 'round'; x.lineWidth = 9; x.globalAlpha = 0.45; x.beginPath(); x.moveTo(10, 54); x.lineTo(54, 10); x.stroke(); x.globalAlpha = 1; x.lineWidth = 4; x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(10, 54); x.lineTo(54, 10); x.stroke(); },
  mines(x, c) { const p = []; for (let i = 0; i < 6; i++) p.push(32 + Math.cos(i * TAU / 6) * 16, 32 + Math.sin(i * TAU / 6) * 16); x.fillStyle = rgba(c, 0.3); circ(x, 32, 32, 26); x.fill(); poly(x, p); x.fillStyle = '#5a4436'; x.fill(); x.strokeStyle = c; x.lineWidth = 3; x.stroke(); x.fillStyle = c; circ(x, 32, 32, 6); x.fill(); },
  missiles(x, c) { x.save(); x.translate(32, 32); x.rotate(-0.78); x.fillStyle = '#e8eef8'; x.beginPath(); x.moveTo(22, 0); x.lineTo(10, -7); x.lineTo(-14, -7); x.lineTo(-14, 7); x.lineTo(10, 7); x.closePath(); x.fill(); x.fillStyle = c; x.fillRect(-18, -12, 8, 24); x.fillRect(6, -7, 4, 14); x.fillStyle = '#ffd25e'; x.beginPath(); x.moveTo(-14, -4); x.lineTo(-26, 0); x.lineTo(-14, 4); x.fill(); x.restore(); },
  tesla(x, c) { x.fillStyle = c; poly(x, [36, 6, 16, 34, 30, 34, 24, 58, 48, 26, 34, 26, 42, 6]); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke(); },
  gravity(x, c) { x.strokeStyle = c; x.lineWidth = 3.5; x.lineCap = 'round'; x.beginPath(); for (let i = 0; i < 70; i++) { const a = i * 0.19, r = 3 + i * 0.36; const px = 32 + Math.cos(a) * r, py = 32 + Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.fillStyle = '#fff'; circ(x, 32, 32, 4); x.fill(); },
  plating(x, c) { x.beginPath(); x.moveTo(32, 8); x.lineTo(52, 16); x.quadraticCurveTo(52, 44, 32, 56); x.quadraticCurveTo(12, 44, 12, 16); x.closePath(); x.fillStyle = rgba(c, 0.85); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); x.strokeStyle = rgba('#ffffff', 0.5); x.beginPath(); x.moveTo(32, 14); x.lineTo(32, 50); x.moveTo(17, 28); x.lineTo(47, 28); x.stroke(); },
  nanite(x, c) { x.fillStyle = c; x.fillRect(26, 12, 12, 40); x.fillRect(12, 26, 40, 12); x.fillStyle = '#fff'; for (const [a, b] of [[14, 14], [48, 16], [50, 48], [16, 50]]) { circ(x, a, b, 3); x.fill(); } },
  amp(x, c) { x.fillStyle = c; poly(x, [32, 6, 50, 30, 38, 30, 38, 56, 26, 56, 26, 30, 14, 30]); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); },
  capacitor(x, c) { x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.strokeRect(14, 18, 34, 28); x.fillStyle = '#fff'; x.fillRect(48, 26, 5, 12); x.fillStyle = c; x.fillRect(18, 22, 9, 20); x.fillRect(29, 22, 9, 20); x.fillStyle = rgba(c, 0.35); x.fillRect(40, 22, 5, 20); },
  emitter(x, c) { x.strokeStyle = c; x.lineWidth = 3; for (const r of [8, 16, 24]) { x.globalAlpha = 1 - r / 34; circ(x, 32, 32, r); x.stroke(); } x.globalAlpha = 1; x.fillStyle = '#fff'; circ(x, 32, 32, 4); x.fill(); },
  thrusters(x, c) { x.fillStyle = '#c8d0e0'; x.beginPath(); x.roundRect(22, 10, 20, 26, 4); x.fill(); x.fillStyle = c; poly(x, [22, 38, 42, 38, 36, 58, 32, 50, 28, 58]); x.fill(); x.fillStyle = '#fff6a0'; poly(x, [27, 38, 37, 38, 32, 50]); x.fill(); },
  feed(x, c) { for (let i = 0; i < 3; i++) { const px = 16 + i * 14; x.fillStyle = '#ffd25e'; x.beginPath(); x.moveTo(px, 14); x.quadraticCurveTo(px + 6, 18, px + 6, 26); x.lineTo(px - 6, 26); x.quadraticCurveTo(px - 6, 18, px, 14); x.fill(); x.fillStyle = c; x.fillRect(px - 6, 26, 12, 24); } },
  tractor(x, c) { x.lineWidth = 9; x.strokeStyle = c; x.beginPath(); x.arc(32, 28, 15, Math.PI, 0); x.stroke(); x.beginPath(); x.moveTo(17, 28); x.lineTo(17, 46); x.moveTo(47, 28); x.lineTo(47, 46); x.stroke(); x.fillStyle = '#e8eef8'; x.fillRect(12, 42, 10, 9); x.fillRect(42, 42, 10, 9); },
  armor(x, c) { x.fillStyle = rgba(c, 0.85); for (let i = 0; i < 3; i++) { x.beginPath(); x.roundRect(14, 12 + i * 14, 36, 11, 3); x.fill(); } x.strokeStyle = '#fff'; x.lineWidth = 1.5; for (let i = 0; i < 3; i++) { x.beginPath(); x.roundRect(14, 12 + i * 14, 36, 11, 3); x.stroke(); } },
  duration(x, c) { x.strokeStyle = c; x.lineWidth = 3; circ(x, 32, 34, 20); x.stroke(); x.lineCap = 'round'; x.beginPath(); x.moveTo(32, 34); x.lineTo(32, 20); x.moveTo(32, 34); x.lineTo(42, 40); x.stroke(); x.fillStyle = c; x.fillRect(27, 8, 10, 6); },
  velocity(x, c) { x.strokeStyle = c; x.lineWidth = 4; x.lineCap = 'round'; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(10 + i * 4, 20 + i * 12); x.lineTo(34 + i * 4, 20 + i * 12); x.stroke(); } x.fillStyle = '#fff'; circ(x, 46, 32, 9); x.fill(); },
  growth(x, c) { x.strokeStyle = c; x.lineWidth = 3; x.beginPath(); x.moveTo(10, 52); x.lineTo(24, 38); x.lineTo(34, 44); x.lineTo(52, 16); x.stroke(); x.fillStyle = c; poly(x, [52, 10, 56, 24, 44, 18]); x.fill(); x.fillStyle = '#4fb4ff'; poly(x, [18, 14, 24, 22, 18, 30, 12, 22]); x.fill(); },
  greed(x, c) { for (const [px, py] of [[24, 40], [40, 40], [32, 26]]) { circ(x, px, py, 11); x.fillStyle = ball(x, px, py, 11, '#ffc43d'); x.fill(); x.strokeStyle = '#a06a10'; x.lineWidth = 1.5; x.stroke(); } },
  reroll(x, c) { x.strokeStyle = c; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.arc(32, 32, 18, 0.3, 5.5); x.stroke(); x.fillStyle = c; poly(x, [50, 18, 52, 32, 40, 26]); x.fill(); },
  skip(x, c) { x.fillStyle = c; poly(x, [14, 16, 32, 32, 14, 48]); x.fill(); poly(x, [30, 16, 48, 32, 30, 48]); x.fill(); x.fillRect(48, 16, 5, 32); },
  revival(x, c) { x.fillStyle = c; x.beginPath(); x.moveTo(32, 52); x.bezierCurveTo(6, 34, 14, 10, 32, 22); x.bezierCurveTo(50, 10, 58, 34, 32, 52); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(14, 32); x.lineTo(24, 32); x.lineTo(28, 24); x.lineTo(34, 40); x.lineTo(38, 30); x.lineTo(50, 30); x.stroke(); },
  kill(x, c) { x.fillStyle = c; circ(x, 32, 28, 18); x.fill(); x.fillRect(22, 38, 20, 14); x.fillStyle = '#070b18'; circ(x, 25, 28, 5); x.fill(); circ(x, 39, 28, 5); x.fill(); x.fillRect(27, 44, 3, 8); x.fillRect(34, 44, 3, 8); },
  gold(x) { circ(x, 32, 32, 22); x.fillStyle = ball(x, 32, 32, 22, '#ffc43d'); x.fill(); x.strokeStyle = '#a06a10'; x.lineWidth = 2.5; x.stroke(); x.fillStyle = '#fff2b0'; x.globalAlpha = 0.65; poly(x, [32, 20, 42, 26, 42, 38, 32, 44, 22, 38, 22, 26]); x.fill(); x.globalAlpha = 1; },
  repair(x, c) { GLYPH.nanite(x, c); },
  cache(x) { GLYPH.greed(x); },
};
const EVO_GLYPH = { storm: 'blaster', siphon: 'lash', halo: 'drones', sunspear: 'rail', nullwake: 'mines', barrage: 'missiles', thunder: 'tesla', horizon: 'gravity' };
function icon(id) {
  if (ICONS[id]) return ICONS[id];
  const c = makeCanvas(64, 64), x = c.getContext('2d'), w = WEAPONS[id], p = PASSIVES[id];
  const col = (w && w.color) || (p && p.color) || ({ armor: '#c8d0e0', duration: '#7dffa8', velocity: '#5ef0ff', growth: '#7dffa8', greed: '#ffd25e', reroll: '#5ef0ff', skip: '#ff8a3d', revival: '#ff5e6c', kill: '#e8eef8', gold: '#ffd25e', repair: '#7dffa8', cache: '#ffd25e' })[id] || '#ffffff';
  const bare = id === 'kill' || id === 'gold';
  if (!bare) iconFrame(x, col, w && w.from);
  const g = GLYPH[EVO_GLYPH[id] || id];
  if (g) { if (w && w.from) { x.shadowColor = col; x.shadowBlur = 10; } g(x, col); }
  return (ICONS[id] = c.toDataURL());
}
