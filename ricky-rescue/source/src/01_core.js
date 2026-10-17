// Ricky Rescue — shared helpers: math, seeded RNG, events, DOM, the game clock

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DEBUG = location.hash.startsWith('#debug');
const V3 = THREE.Vector3;
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3();
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function angTo(a, b, step) { const d = angWrap(b - a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtMoney = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
  r.wpick = (arr, wf) => { let t = 0; for (const a of arr) t += wf(a); let x = f() * t; for (const a of arr) { x -= wf(a); if (x <= 0) return a; } return arr[arr.length - 1]; };
  r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return r;
}
const rnd = RNG();
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
function hexCss(h) { return '#' + (h >>> 0).toString(16).padStart(6, '0'); }

// ---------- the clock ----------
// Everything medical (vitals, action timers, response times) runs on game seconds. One real second is
// TIME_SCALE game seconds, so a one-minute drive is a six-minute response and a 12-hour shift is two hours of play
// (the dispatcher skips the quiet time between calls).
const TIME_SCALE = 6;
const fmtClock = (gameSec) => { const m = Math.floor(gameSec / 60) % 1440; const h = Math.floor(m / 60); return String(h).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const fmtDur = (gameSec) => { gameSec = Math.max(0, Math.round(gameSec)); const m = Math.floor(gameSec / 60), s = gameSec % 60; return m + ':' + String(s).padStart(2, '0'); };
const fmtMin = (gameSec) => { const m = Math.round(gameSec / 60); return m + ' min'; };
