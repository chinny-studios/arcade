// Act of God — shared helpers: math, seeded RNG, noise, events, DOM, formatting, the game state

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
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const rr = (a, b) => a + Math.random() * (b - a);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// a seeded random source with helpers; RNG() without a seed uses Math.random
function RNG(seed) {
  const f = seed === undefined ? Math.random : mulberry32(typeof seed === 'number' ? seed : strSeed(seed));
  const r = () => f();
  r.range = (a, b) => a + (b - a) * f();
  r.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  r.pick = (arr) => arr[Math.floor(f() * arr.length)];
  r.chance = (p) => f() < p;
  r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return r;
}
function hash2(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// smooth value noise in 0..1
function vnoise(x, z, s = 0) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
// fractal noise in roughly 0..1
function fbm(x, z, s = 0, oct = 4) {
  let a = 0.5, f = 1, t = 0, n = 0;
  for (let i = 0; i < oct; i++) { t += a * vnoise(x * f, z * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return t / n;
}
// ridged noise for mountain ranges, 0..1
function ridged(x, z, s = 0, oct = 4) {
  let a = 0.5, f = 1, t = 0, n = 0;
  for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(vnoise(x * f, z * f, s + i * 31) * 2 - 1); t += a * v * v; n += a; a *= 0.5; f *= 2.1; }
  return t / n;
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

// ---------- formatting ----------
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
function fmtBig(n) {
  n = Math.round(n);
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + ' billion';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' million';
  return fmtInt(n);
}
function fmtShort(n) {
  n = Math.round(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(0) + 'k';
  return fmtInt(n);
}
function fmtMoney(n) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + ' trillion';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + ' billion';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + ' million';
  return '$' + fmtInt(n);
}
function fmtMoneyShort(n) {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'k';
  return '$' + Math.round(n);
}
const fmtClock = (hour) => { const m = Math.floor(((hour % 24) + 24) % 24 * 60); const h = Math.floor(m / 60), mm = m % 60; return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };

// ---------- the game state ----------
// G.t is simulated seconds since the city was made; G.hour is the time of day (a game hour lasts HOUR_SEC seconds).
const HOUR_SEC = 40;
const G = {
  state: 'title', t: 0, hour: 9, timeFlow: true, speed: 1, paused: false,
  stats: null, power: null, radius: 1, side: 'wrath', cursor: { x: 0, z: 0, ok: false, b: null },
  effects: [], threats: [], deaths: [], incidents: [],
};
function newStats() {
  return { pop0: 0, pop: 0, dead: 0, injured: 0, treated: 0, saved: 0, destroyed: 0, damaged: 0, damage: 0, infected: 0, revived: 0, grown: 0, panic: 0, dark: 0, burning: 0, flooded: 0, mood: 68 };
}
