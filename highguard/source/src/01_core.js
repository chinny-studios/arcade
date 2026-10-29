// ---- 01_core: math helpers, random numbers, settings, shared state ----
// World units are metres, Y is up. A ship's local frame has +Z forward (bow), +Y up and +X to port,
// so -X is starboard. Ship yaw turns the bow toward +X as it increases; pitch is nose-up positive.
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angNorm = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);

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
// A deterministic generator for models, so a class always looks the same whatever the battle seed.
function modelRng(seed) { return mulberry32(seed * 7919 + 13); }

const V3 = THREE.Vector3, Q4 = THREE.Quaternion, M4 = THREE.Matrix4;
// Scratch objects. Functions that use one never call another function that uses the same one.
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _q1 = new Q4(), _m1 = new M4();
const UP = new V3(0, 1, 0);
// Direction from yaw and nose-up pitch, matching Euler order 'YXZ' with x = -pitch.
function dirFrom(yaw, pitch, out) { const c = Math.cos(pitch); return (out || new V3()).set(Math.sin(yaw) * c, Math.sin(pitch), Math.cos(yaw) * c); }
function yawOf(d) { return Math.atan2(d.x, d.z); }
function pitchOf(d) { return Math.atan2(d.y, Math.hypot(d.x, d.z)); }
// Intercept point for a projectile of speed s fired from p at a target at q moving with velocity v.
function leadPoint(p, q, v, s, out) {
  out = out || new V3();
  const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
  const a = v.x * v.x + v.y * v.y + v.z * v.z - s * s, b = 2 * (dx * v.x + dy * v.y + dz * v.z), c = dx * dx + dy * dy + dz * dz;
  let t;
  if (Math.abs(a) < 1e-6) t = -c / b;
  else { const disc = b * b - 4 * a * c; if (disc < 0) t = Math.sqrt(c) / s; else { const r = Math.sqrt(disc); const t1 = (-b - r) / (2 * a), t2 = (-b + r) / (2 * a); t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2); } }
  if (!(t > 0)) t = Math.sqrt(c) / s;
  t = Math.min(t, 6);
  return out.set(q.x + v.x * t, q.y + v.y * t, q.z + v.z * t);
}

const $ = (id) => document.getElementById(id);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const DEBUG = /debug/.test(location.hash);
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

const SAVE_KEY = 'highguard.settings', PROG_KEY = 'highguard.progress';
const settings = Object.assign({ sens: 1, invert: false, lead: true, vol: 0.8, quality: 'auto', shake: true },
  (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(settings)); } catch (e) { /* private mode */ } }
// Campaign progress: how many missions are open, and the best grade per mission id.
const progress = Object.assign({ open: 1, best: {} },
  (() => { try { return JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); } catch (e) { return {}; } })());
function saveProgress() { try { localStorage.setItem(PROG_KEY, JSON.stringify(progress)); } catch (e) { /* private mode */ } }

// Shared game state. G.ships holds every capital ship in the battle (wrecks too, until they are cleared).
const G = {
  state: 'title',   // title | menu | play | over
  paused: false,
  ships: [],
  craft: [],        // fighters, bombers and shuttles in flight
  player: null,
  t: 0,             // real seconds since boot
  simming: false,   // true while sim() fast-forwards: skips audio and most effects
  manual: false,
  god: false,
};
const TEAM_COL = ['#7fd4ff', '#ff7a4a'];
