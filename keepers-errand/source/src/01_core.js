// ---- core: helpers, noise, shared game state, save/load ----
const DEBUG = /(^|[#&])debug\b/.test(location.hash);
const SAVE_KEY = 'keepers-errand-save-v1';
const OPT_KEY = 'keepers-errand-options';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const $ = (s) => document.querySelector(s);

// deterministic hash noise (value noise, 2 octaves is plenty for this island)
function hash2(x, z) { let h = (x | 0) * 374761393 + (z | 0) * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, z) { return vnoise(x, z) * 0.6 + vnoise(x * 2.1 + 17, z * 2.1 - 9) * 0.28 + vnoise(x * 4.3 - 3, z * 4.3 + 5) * 0.12; }
let _seed = 1234567;
function srand(s) { _seed = s >>> 0 || 1; }
function srnd(a = 0, b = 1) { _seed = (_seed * 1664525 + 1013904223) >>> 0; return a + (_seed / 4294967296) * (b - a); }

// tiny event bus
const Bus = { h: {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); }, emit(e, a) { (this.h[e] || []).forEach((f) => f(a)); } };

// the one shared game state. Everything that is saved lives in G.save.
const G = {
  state: 'boot',        // boot | title | play | dialog | cutscene | pause | map | end
  t: 0,                 // game time in seconds (simulation)
  area: null,           // current area id
  weather: 'storm',     // storm | sun
  save: null,
  paused: false,
  lockInput: 0,         // > 0 while a cutscene drives the hero
};
function freshSave() {
  return {
    v: 1,
    area: 'cottage', x: 0, z: 1.2, ry: Math.PI,
    life: 10, maxLife: 10, clams: 0, tonics: 0,
    mode: 'normal',
    flags: {},           // story flags
    items: {},           // quest items: pebble, stamp, hat, glass_quarry, glass_stack, glass_cove
    dead: {},            // ids of one-shot things (smashed crates, collected pickups, beaten guards)
    played: 0,
  };
}
G.save = freshSave();
const F = (k) => !!G.save.flags[k];
function setFlag(k, v = true) { G.save.flags[k] = v; Bus.emit('flag', k); }
const hasItem = (k) => (G.save.items[k] || 0) > 0;
function giveItem(k, n = 1) { G.save.items[k] = (G.save.items[k] || 0) + n; Bus.emit('item', k); }
function takeItem(k, n = 1) { G.save.items[k] = Math.max(0, (G.save.items[k] || 0) - n); Bus.emit('item', k); }

function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function writeSave() {
  if (G.noSave) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { /* private mode */ }
}
function readSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) return Object.assign(freshSave(), s); } catch (e) { /* ignore */ }
  return null;
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

const OPTS = { music: 0.7, sfx: 0.9, shake: true, hints: true };
try { Object.assign(OPTS, JSON.parse(localStorage.getItem(OPT_KEY)) || {}); } catch (e) { /* ignore */ }
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } catch (e) { /* ignore */ } }

// scheduled callbacks on simulation time (so cutscenes fast-forward with sim())
const Timers = {
  list: [],
  after(sec, fn) { this.list.push({ at: G.t + sec, fn }); },
  update() {
    for (let i = 0; i < this.list.length; i++) {
      const t = this.list[i];
      if (G.t >= t.at) { this.list.splice(i--, 1); t.fn(); }
    }
  },
  clear() { this.list.length = 0; },
};
const wait = (sec) => new Promise((r) => Timers.after(sec, r));

// the area registry (areas are defined by 07_outdoor and 08_interiors, managed by 09_world)
const AREAS = {};
function defArea(id, def) { AREAS[id] = Object.assign({ id, built: false, colliders: [], doors: [], triggers: [], interacts: [], water: null, killY: -6 }, def); }
