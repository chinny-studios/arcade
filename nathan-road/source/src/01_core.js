// Nathan Road: shared helpers (math, seeded RNG, events, geometry), and input from keyboard, mouse, touch and gamepad.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (s) => document.querySelector(s);
const DEBUG = location.hash.startsWith('#debug');
const V3 = THREE.Vector3;
const D2R = Math.PI / 180;
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// The city is built the same way every time: each part reseeds the world RNG by name.
let RNG = mulberry32(852);
const rseed = (s) => { RNG = mulberry32(strSeed(s)); };
const rnd = (a = 0, b = 1) => a + (b - a) * RNG();
const rint = (a, b) => Math.floor(a + (b - a + 1) * RNG());
const rpick = (arr) => arr[Math.floor(RNG() * arr.length)];
const chance = (p) => RNG() < p;
const frand = (a, b) => a + (b - a) * Math.random();
const fpick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function hash2(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function wpick(list, r = RNG()) {
  let s = 0; for (const e of list) s += e[0];
  let t = r * s; for (const e of list) { t -= e[0]; if (t <= 0) return e[1]; }
  return list[list.length - 1][1];
}

// ---------- events ----------
const bus = (() => {
  const m = {};
  return {
    on(k, f) { (m[k] = m[k] || []).push(f); },
    emit(k, ...a) { for (const f of m[k] || []) f(...a); },
  };
})();

// ---------- 2D geometry (x east, z south) ----------
// rings are flat arrays [x0, z0, x1, z1, ...] in metres
function ringArea(r) { let a = 0; for (let i = 0, n = r.length; i < n; i += 2) { const j = (i + 2) % n; a += r[i] * r[j + 1] - r[j] * r[i + 1]; } return a / 2; }
function pointInRing(x, z, r) {
  let inside = false;
  for (let i = 0, n = r.length, j = n - 2; i < n; j = i, i += 2) {
    const xi = r[i], zi = r[i + 1], xj = r[j], zj = r[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function ringCentroid(r) { let x = 0, z = 0; const n = r.length / 2; for (let i = 0; i < r.length; i += 2) { x += r[i]; z += r[i + 1]; } return [x / n, z / n]; }
function segDist2(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
  let t = l > 0 ? ((px - ax) * dx + (pz - az) * dz) / l : 0; t = clamp(t, 0, 1);
  const qx = ax + dx * t - px, qz = az + dz * t - pz; return qx * qx + qz * qz;
}
// triangulate a polygon with holes: rings[0] outer, rest holes. returns {pts:[[x,z]...], tris:[i,j,k,...]}
function triangulate(rings) {
  const toV = (r) => { const a = []; for (let i = 0; i < r.length; i += 2) a.push(new THREE.Vector2(r[i], r[i + 1])); return a; };
  const outer = toV(rings[0]), holes = rings.slice(1).map(toV);
  let tris;
  try { tris = THREE.ShapeUtils.triangulateShape(outer, holes); } catch (e) { tris = []; }
  const pts = outer.concat(...holes).map((v) => [v.x, v.y]);
  const idx = []; for (const t of tris) idx.push(t[0], t[1], t[2]);
  return { pts, tris: idx };
}
// decode a baked polygon list [[ring dm], [hole dm]...] into metres
const dmRing = (r) => { const o = new Float32Array(r.length); for (let i = 0; i < r.length; i++) o[i] = r[i] / 10; return o; };
const dmPoly = (p) => p.map(dmRing);

// ---------- input ----------
const Input = (() => {
  const down = new Set(), pressed = new Set();
  let mdx = 0, mdy = 0, locked = false, wheel = 0;
  const touch = { on: false, mx: 0, my: 0, lx: 0, ly: 0, run: false };
  const pad = { mx: 0, my: 0, lx: 0, ly: 0, prev: [], btn: [] };
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && document.body.dataset.state === 'play') e.preventDefault();
  });
  addEventListener('keyup', (e) => down.delete(e.code));
  addEventListener('blur', () => down.clear());
  addEventListener('mousemove', (e) => { if (locked) { mdx += e.movementX; mdy += e.movementY; } });
  addEventListener('wheel', (e) => { wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement != null; bus.emit('lock', locked); });
  addEventListener('mousedown', (e) => { if (locked) pressed.add('Mouse' + e.button); });
  return {
    down, pressed, touch, pad,
    key: (c) => down.has(c),
    hit: (c) => pressed.has(c),
    any: (...cs) => cs.some((c) => pressed.has(c)),
    press(c) { pressed.add(c); down.add(c); },
    release(c) { down.delete(c); },
    get locked() { return locked; },
    mouse() { const r = [mdx, mdy]; mdx = 0; mdy = 0; return r; },
    wheel() { const w = wheel; wheel = 0; return w; },
    lock(el) { try { const p = el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed here */ } },
    unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
    poll() {
      const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g && g.connected) : null;
      pad.mx = pad.my = pad.lx = pad.ly = 0;
      if (!gp) return;
      const dz = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
      pad.mx = dz(gp.axes[0] || 0); pad.my = dz(gp.axes[1] || 0); pad.lx = dz(gp.axes[2] || 0); pad.ly = dz(gp.axes[3] || 0);
      const b = gp.buttons.map((x) => x.pressed);
      const map = { 0: 'PadA', 1: 'PadB', 2: 'PadX', 3: 'PadY', 4: 'PadLB', 5: 'PadRB', 6: 'PadLT', 7: 'PadRT', 8: 'PadBack', 9: 'PadStart', 10: 'PadLS', 11: 'PadRS', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
      for (const k in map) {
        if (b[k] && !pad.prev[k]) { pressed.add(map[k]); bus.emit('padUsed'); }
        if (b[k]) down.add(map[k]); else if (pad.prev[k]) down.delete(map[k]);
      }
      pad.prev = b;
    },
    endFrame() { pressed.clear(); },
  };
})();
