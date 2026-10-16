// Nullwake — shared helpers, the run state G and the save file. All src files share one scope.
const DEBUG = /^#debug/.test(location.hash);
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const RUN_LEN = 900; // the final boss arrives at 15:00
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fmtTime = (t) => { t = Math.max(0, Math.floor(t)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
const fmtNum = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Seeded RNG for the simulation, so #debug runs repeat. Visual-only effects use Math.random.
let rngA = 1;
function seedRng(s) {
  let h = 2166136261 >>> 0; s = String(s);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  rngA = h >>> 0 || 1;
}
function R() {
  rngA = (rngA + 0x6D2B79F5) | 0;
  let t = Math.imul(rngA ^ (rngA >>> 15), 1 | rngA);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rr = (a, b) => a + R() * (b - a);
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (a) => a[Math.floor(R() * a.length)];
function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Small deterministic generator for sprite and tile art (independent of the sim RNG).
function artRng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// The run. startRun() in 10_director.js resets the per-run fields.
const G = {
  state: 'boot', // boot | title | play | levelup | chest | pause | over
  t: 0, stageId: 's1', stage: null, pilotId: 'ryn', seed: '',
  kills: 0, gold: 0, shake: 0, hurtFlash: 0,
  cam: { x: 0, y: 0 }, view: { w: 1140, h: 640, k: 1, W: 1140, H: 640 },
  spawnT: 0, evIdx: 0, boss: null, finalBoss: null, won: false, over: false,
  pendingLv: 0, invDirty: true, god: false, bot: false, frame: 0, nextId: 1,
};

// Save data: gold, hangar levels, unlocked pilots and stages, best times and options.
const SAVE_KEY = 'nullwake.save.v1';
function defaultSave() {
  return { gold: 0, meta: {}, pilots: { ryn: 1, sable: 1 }, cleared: {}, best: {}, seen: {},
    opts: { sfx: 0.8, music: 0.55, shake: 1, nums: 1 }, totals: { runs: 0, kills: 0, wins: 0, gold: 0 } };
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s === 'object') { const d = defaultSave(); return Object.assign(d, s, { opts: Object.assign(d.opts, s.opts), totals: Object.assign(d.totals, s.totals) }); }
  } catch (e) { /* private mode or corrupt save: start fresh */ }
  return defaultSave();
}
let SAVE = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* storage blocked */ } }
