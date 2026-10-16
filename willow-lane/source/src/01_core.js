// Willow Lane — shared helpers: math, RNG, events, DOM, game clock and the global game state G

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const DEBUG = location.hash.startsWith('#debug');
const V3 = THREE.Vector3;
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3();
function angWrap(a) { if (!isFinite(a)) return 0; while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtMoney = (n) => '$' + Math.round(n).toLocaleString('en-US');
const cssHex = (h) => '#' + (h >>> 0).toString(16).padStart(6, '0');
const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
function mixHex(a, b, t) { const A = hex3(a), B = hex3(b); return (Math.round(lerp(A[0], B[0], t) * 255) << 16) | (Math.round(lerp(A[1], B[1], t) * 255) << 8) | Math.round(lerp(A[2], B[2], t) * 255); }
function shadeHex(a, k) { const A = hex3(a); return (Math.round(clamp(A[0] * k, 0, 1) * 255) << 16) | (Math.round(clamp(A[1] * k, 0, 1) * 255) << 8) | Math.round(clamp(A[2] * k, 0, 1) * 255); }

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// The game uses one seedable random source so tests can be repeated
let rnd = mulberry32(strSeed('willow'));
const seedRandom = (s) => { rnd = mulberry32(strSeed(s)); };
const R01 = () => rnd();
const rrange = (a, b) => a + (b - a) * rnd();
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const rpick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
function rshuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function rweighted(items, wf) { let s = 0; for (const a of items) s += Math.max(0, wf(a)); let x = rnd() * s; for (const a of items) { x -= Math.max(0, wf(a)); if (x <= 0) return a; } return items[items.length - 1]; }

// ---------- events ----------
const bus = (() => {
  const m = {};
  return {
    on(n, f) { (m[n] = m[n] || []).push(f); },
    emit(n, ...a) { const l = m[n]; if (l) for (const f of l) f(...a); },
  };
})();

// ---------- DOM ----------
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

// ---------- game state ----------
// G.t is game time in minutes since the start of day 1 (a Monday) at midnight.
// One game minute passes per real second at speed 1, as in the classic life sims.
const SPEEDS = [0, 1, 3, 10, 40];
const G = {
  state: 'menu',          // menu | cas | play | over
  mode: 'live',           // live | buy | build
  speed: 1, userSpeed: 1, // userSpeed is what the player picked; speed may be forced (4 = everyone asleep or away)
  t: 8 * 60,
  money: 20000,
  family: 'Alder',
  sims: [],               // every sim in the neighbourhood: household, townies, service NPCs
  objects: [],
  items: [],              // plates, puddles, fires, pizza boxes, gifts
  bills: [],
  selected: null,
  nextId: 1,
  walls: 'cut',           // up | cut | down
  options: { freeWill: true, aging: true, lifespan: 'normal', sound: true, music: true, voices: true, edgePan: false },
  log: [],
  stats: { births: 0, weddings: 0, promotions: 0 },
  flags: {},
  lotName: 'Willow Lane',
};
const newId = () => G.nextId++;

// ---------- clock ----------
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayNum = (t = G.t) => Math.floor(t / 1440) + 1;            // 1-based day count
const minOfDay = (t = G.t) => ((t % 1440) + 1440) % 1440;
const hourF = (t = G.t) => minOfDay(t) / 60;
const weekday = (t = G.t) => (dayNum(t) - 1) % 7;                // 0 Monday … 6 Sunday
const isWeekend = (t = G.t) => weekday(t) >= 5;
function fmtClock(t = G.t) {
  const m = Math.floor(minOfDay(t)), h = Math.floor(m / 60), mm = m % 60;
  const h12 = ((h + 11) % 12) + 1;
  return h12 + ':' + String(mm).padStart(2, '0') + (h < 12 ? ' am' : ' pm');
}
// the next game time (>= now) at a given hour of day
function nextAt(hour, t = G.t) { const d = Math.floor(t / 1440) * 1440 + hour * 60; return d >= t ? d : d + 1440; }
// is hour of day h within [a, b) on a circular clock
function hourIn(h, a, b) { return a <= b ? h >= a && h < b : h >= a || h < b; }

const pluralS = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
