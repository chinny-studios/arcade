// Valor Bay — shared helpers: math, seeded RNG, events, DOM, options and save, and the session state

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
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
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
const SAVE_KEY = 'valor-bay.v1';
const OPTS = { quality: 'med', sens: 1, invert: false, vol: 0.8, music: 0.5, fov: 70, tips: true, time: 'cycle', outline: true, shake: true };
const SAVE = { best: {}, arrests: {}, bosses: {}, hero: 'spindle' };
function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (d.opts) Object.assign(OPTS, d.opts);
    for (const k of ['best', 'arrests', 'bosses']) if (d[k]) SAVE[k] = d[k];
    if (d.hero) SAVE.hero = d.hero;
  } catch (e) { /* private mode or bad data */ }
}
function writeSave() {
  if (G.noSave) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ opts: OPTS, best: SAVE.best, arrests: SAVE.arrests, bosses: SAVE.bosses, hero: SAVE.hero })); } catch (e) { /* ignore */ }
}

// the session: one patrol with one hero (switching hero keeps the city but starts a new score)
const G = {
  hero: null, t: 0, score: 0, combo: 0, comboT: 0, bestCombo: 0, arrests: 0, saves: 0, bosses: 0, wave: 20,
  god: false, noSave: false, frame: 0, slow: 0, tod: 10.5, freeze: 0,
};
