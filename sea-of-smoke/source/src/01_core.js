// ---- 01_core: math helpers, noise, global state, settings ----
// World units are metres. Y is up. A ship's heading h points its bow along (sin h, 0, cos h);
// starboard is (-cos h, 0, sin h). Increasing h turns the bow to port.
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angNorm = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const dist2 = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
const fwdX = (h) => Math.sin(h), fwdZ = (h) => Math.cos(h);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rand = Math.random;
const rnd = (a, b) => a + (b - a) * rand();
const rndi = (a, b) => Math.floor(a + (b - a + 1) * rand());
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
function gauss() { let u = 0, v = 0; while (u === 0) u = rand(); v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Value noise for terrain and clouds (seeded through noiseSeed).
let noiseSeed = 1;
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(noiseSeed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, oct) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < (oct || 4); i++) { s += amp * vnoise(x * f, y * f); n += amp; amp *= 0.5; f *= 2.03; }
  return s / n;
}

const $ = (id) => document.getElementById(id);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const DEBUG = /debug/.test(location.hash);
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

const SAVE_KEY = 'sea-of-smoke.settings';
const settings = Object.assign({ sens: 1, invert: false, lead: true, vol: 0.8, quality: 'auto', ship: 'frigate', map: 0, shake: true },
  (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(settings)); } catch (e) { /* private mode */ } }

// Shared game state. G.ships holds every ship in the current match (sunk ones too, until cleanup).
const G = {
  state: 'title',   // title | port | play | over
  paused: false,
  ships: [],
  player: null,
  t: 0,             // real seconds since boot
  simming: false,   // true while sim() fast-forwards: skips audio and some effects
};
