// Revenant Protocol — shared helpers: math, settings, input state, game state

const TAU = Math.PI * 2;
const CELL = 2;          // one map cell is 2 m square
const GRAV = 18;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rr = (a, b) => a + (b - a) * Math.random();
const pick = (a) => a[(Math.random() * a.length) | 0];
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
function angNorm(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
const DEBUG = location.hash.includes('debug');
const isTouch = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0;

function hash2(x, z) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Tiling value noise (lattice wraps every p cells), used for seamless textures.
function vnoiseW(x, y, p) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (a) => ((a % p) + p) % p;
  const h = (a, b) => hash2(m(a), m(b));
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function fbmW(x, y, p, oct) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoiseW(x * f, y * f, p * f); n += a; a *= 0.5; f *= 2; }
  return s / n;
}

function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
const SETTINGS = Object.assign({ sens: 1, invert: false, scale: 'classic', vol: 0.8, music: 0.55, aim: isTouch }, loadJSON('rp-settings'));
const PROGRESS = Object.assign({ unlocked: 1, last: 0, diff: 1 }, loadJSON('rp-progress'));

// Input. keys[code] holds the current state; hit[code] latches a press until it is consumed.
const keys = {};
const hit = {};
const mouse = { dx: 0, dy: 0, b0: false, b2: false, wheel: 0 };
const VI = { mx: 0, mz: 0, fire: false, alt: false, jump: false, crouch: false }; // touch controls
function take(code) { if (hit[code]) { hit[code] = false; return true; } return false; }
function clearInput() { for (const k in keys) keys[k] = false; for (const k in hit) hit[k] = false; mouse.b0 = mouse.b2 = false; mouse.dx = mouse.dy = 0; VI.fire = VI.alt = VI.jump = VI.crouch = false; VI.mx = VI.mz = 0; }

// Global game state, filled in by later modules.
const G = {
  state: 'loading', mission: 0, diff: 1, time: 0, lv: null, paused: false,
  stats: { kills: 0, total: 0, secrets: 0, secretsTotal: 0, time: 0 },
  combatT: 0, mapOn: false, mapZoom: 1,
};
function setState(s) { G.state = s; document.body.dataset.state = s; }
