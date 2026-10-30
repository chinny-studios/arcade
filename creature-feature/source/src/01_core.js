// Creature Feature — shared helpers: math, seeded RNG, events, DOM, options and the game state

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DEBUG = location.hash.startsWith('#debug');
const V3 = THREE.Vector3;
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3();
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function angTo(a, b, step) { const d = angWrap(b - a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; }
// yaw convention: yaw 0 faces -z, yaw grows counter-clockwise seen from above (like three.js rotation.y)
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);
const fwdX = (yaw) => -Math.sin(yaw), fwdZ = (yaw) => -Math.cos(yaw);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const rr = (a, b) => a + Math.random() * (b - a);
const fmtTime = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtNum = (n) => Math.round(n).toLocaleString('en-US');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// a seeded random source with helpers
function RNG(seed) {
  const f = mulberry32(seed >>> 0);
  const r = () => f();
  r.range = (a, b) => a + (b - a) * f();
  r.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  r.pick = (arr) => arr[Math.floor(f() * arr.length)];
  r.chance = (p) => f() < p;
  return r;
}
function hash2(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z, s = 0) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

// ---------- events ----------
const bus = (() => {
  const m = {};
  return {
    on(n, f) { (m[n] = m[n] || []).push(f); },
    emit(n, ...a) { const l = m[n]; if (l) for (const f of l) f(...a); },
  };
})();

// ---------- DOM ----------
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

// ---------- options and save ----------
const SAVE_KEY = 'creature-feature.v1';
const OPTS = { quality: 'med', sens: 1, invert: false, vol: 0.8, music: 0.55, gore: 'full', grain: true, fov: 70, tips: true };
const SAVE = { best: {}, kills: {}, nights: 0 };
function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (d.opts) Object.assign(OPTS, d.opts);
    if (d.best) SAVE.best = d.best;
    if (d.kills) SAVE.kills = d.kills;
    SAVE.nights = d.nights || 0;
  } catch (e) { /* private mode or bad data */ }
}
function writeSave() {
  if (G.noSave) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ opts: OPTS, best: SAVE.best, kills: SAVE.kills, nights: SAVE.nights })); } catch (e) { /* ignore */ }
}

// the whole run's state
const G = {
  monster: null, t: 0, score: 0, hunger: 100, combo: 1, comboT: 0, bestCombo: 1, kills: 0, escaped: 0, panic: 0,
  over: false, god: false, noSave: false, frame: 0, sense: false, feed: null,
};
