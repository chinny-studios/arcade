// Patina: shared helpers, CPU noise and game state. All src files share one scope (see build.py).
const TAU = Math.PI * 2;
const DEBUG = /debug/.test(location.hash);
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// colours given in linear RGB (the working space), so metal F0 values can be typed in directly
const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const srgb = (hex) => new THREE.Color(hex);

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// integer lattice hash -> [0,1)
function hash3(x, y, z, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// smooth 3D value noise in [0,1], used for the starting dirt and wear layouts
function vnoise(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let u = x - xi, v = y - yi, w = z - zi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
  const c = (a, b, c2) => hash3(xi + a, yi + b, zi + c2, s);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}
function fbm(x, y, z, s = 0, oct = 4) {
  let a = 0, amp = 0.5, tot = 0;
  for (let i = 0; i < oct; i++) { a += vnoise(x, y, z, s + i * 17) * amp; tot += amp; x *= 2.03; y *= 2.03; z *= 2.03; amp *= 0.5; }
  return a / tot;
}

const SAVE_KEY = 'patina.v1';
function loadSave() {
  try { return Object.assign({ done: [], sound: true, best: {} }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch (e) { return { done: [], sound: true, best: {} }; }
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* private mode */ } }
const SAVE = loadSave();

// G holds the live game state
const G = {
  state: 'boot',       // boot | title | loading | play | reveal | ba | photo
  t: 0,
  piece: null,         // the piece on the turntable
  tool: 'solvent',
  size: 0.45,          // brush size slider 0..1, mapped to the piece's brush range
  lamp: false,         // inspection lamp highlights unfinished work
  open: false,         // hinged parts (watch bezel) open
  workTime: 0,         // seconds spent with a tool on the piece
  quality: 1,          // 0 low, 1 normal
};
