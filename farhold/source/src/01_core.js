// Farhold — shared helpers: math, seeded RNG, events, low-poly model builder, input (keyboard, mouse, gamepad)

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (s) => document.querySelector(s);
const DEBUG = location.hash.startsWith('#debug');
const V3 = THREE.Vector3, Q4 = THREE.Quaternion;
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _v5 = new V3(), _v6 = new V3();
const _q1 = new Q4(), _q2 = new Q4(), _m4 = new THREE.Matrix4(), _e1 = new THREE.Euler();
const UP = new V3(0, 1, 0), FWD = new V3(0, 0, -1), RIGHT = new V3(1, 0, 0);
const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function hashN(...n) { let h = 2166136261; for (const x of n) { h ^= x | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return h >>> 0; }
// A seeded random source with helpers
function RNG(seed) {
  const r = mulberry32(seed >>> 0);
  r.range = (a, b) => a + (b - a) * r();
  r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.weighted = (arr, wkey = 'w') => { let s = 0; for (const a of arr) s += a[wkey]; let x = r() * s; for (const a of arr) { x -= a[wkey]; if (x <= 0) return a; } return arr[arr.length - 1]; };
  r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return r;
}
const frand = (a, b) => a + (b - a) * Math.random();
const fpick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// HSL helpers for the procedural palettes (h 0..1, s 0..1, l 0..1) -> 0xRRGGBB
function hsl(h, s, l) { const c = new THREE.Color(); c.setHSL(((h % 1) + 1) % 1, clamp(s, 0, 1), clamp(l, 0, 1)); return c.getHex(); }
function mixHex(a, b, t) { const A = hex3(a), B = hex3(b); return (Math.round(lerp(A[0], B[0], t) * 255) << 16) | (Math.round(lerp(A[1], B[1], t) * 255) << 8) | Math.round(lerp(A[2], B[2], t) * 255); }
function shadeHex(a, k) { const A = hex3(a); return (Math.round(clamp(A[0] * k, 0, 1) * 255) << 16) | (Math.round(clamp(A[1] * k, 0, 1) * 255) << 8) | Math.round(clamp(A[2] * k, 0, 1) * 255); }
const cssHex = (h) => '#' + h.toString(16).padStart(6, '0');

// ---------- events ----------
const bus = (() => {
  const m = {};
  return {
    on(n, f) { (m[n] = m[n] || []).push(f); },
    emit(n, ...a) { const l = m[n]; if (l) for (const f of l) f(...a); },
  };
})();

// ---------- names ----------
const NAMEGEN = (() => {
  const on = ['b', 'c', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z', 'th', 'sh', 'kr', 'dr', 'gr', 'vr', 'tr', 'ch', 'qu', 'x', 'y', 'br', 'st', 'sk'];
  const nu = ['a', 'e', 'i', 'o', 'u', 'ae', 'ai', 'ei', 'ou', 'ia', 'io', 'y', 'oo', 'ee', 'au'];
  const co = ['', '', '', 'n', 'r', 's', 'l', 'th', 'x', 'm', 'k', 'nd', 'rn', 'sk', 'st', 'ck', 'z'];
  const suf = ['', '', '', ' Prime', ' IV', ' VII', ' Minor', ' Major', '-9', ' Beta', ' XI', ' Tau'];
  const latin = ['ius', 'us', 'ae', 'is', 'ora', 'ium', 'alis', 'ensis', 'oides', 'atus', 'ix', 'ida'];
  function word(r, syl) {
    let s = '';
    for (let i = 0; i < syl; i++) s += (i === 0 || r() < 0.7 ? r.pick(on) : '') + r.pick(nu) + (r() < 0.4 || i === syl - 1 ? r.pick(co) : '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return {
    word,
    system(seed) { const r = RNG(seed); return word(r, r.int(2, 3)) + (r() < 0.25 ? r.pick(suf) : ''); },
    planet(seed) { const r = RNG(seed); return word(r, r.int(2, 3)) + (r() < 0.35 ? ' ' + r.pick(['Prime', 'Minor', 'IX', 'Delta', 'Omega', 'V', 'Sigma', 'Major']) : ''); },
    species(seed) { const r = RNG(seed); return word(r, r.int(1, 2)) + ' ' + word(r, 2).toLowerCase().replace(/[aeiou]+$/, '') + r.pick(latin); },
    person(seed) { const r = RNG(seed); return word(r, r.int(1, 2)) + '-' + word(r, 1); },
  };
})();

// ---------- low-poly model builder ----------
// A model is a list of parts merged into one vertex-coloured geometry.
// part: { g: 'box'|'cyl'|'cone'|'sph'|'ico'|'dod'|'tor'|'tbox', a: [...args], c: 0xRRGGBB, p: [x,y,z], r: [rx,ry,rz], s: [sx,sy,sz], e: emissive 0..1, flat: true }
const _geoCache = {};
function baseGeo(g, a) {
  const k = g + ':' + a.join(',');
  if (_geoCache[k]) return _geoCache[k];
  let geo;
  switch (g) {
    case 'box': geo = new THREE.BoxGeometry(a[0], a[1], a[2]); break;
    case 'cyl': geo = new THREE.CylinderGeometry(a[0], a[1], a[2], a[3] || 8, 1, !!a[4]); break;
    case 'cone': geo = new THREE.ConeGeometry(a[0], a[1], a[2] || 8); break;
    case 'sph': geo = new THREE.SphereGeometry(a[0], a[1] || 8, a[2] || 6); break;
    case 'ico': geo = new THREE.IcosahedronGeometry(a[0], a[1] || 0); break;
    case 'dod': geo = new THREE.DodecahedronGeometry(a[0], 0); break;
    case 'oct': geo = new THREE.OctahedronGeometry(a[0], a[1] || 0); break;
    case 'tor': geo = new THREE.TorusGeometry(a[0], a[1], a[2] || 6, a[3] || 12, a[4] || TAU); break;
    case 'tbox': geo = taperBox(...a); break;
    case 'lathe': geo = new THREE.LatheGeometry(a[0].map((p) => new THREE.Vector2(p[0], p[1])), a[1] || 8); break;
    default: throw new Error('geo ' + g);
  }
  geo = geo.index ? geo.toNonIndexed() : geo;
  return (_geoCache[k] = geo);
}
// Box whose top differs from bottom (wedges, tapered hulls, roofs).
function taperBox(wb, db, wt, dt, h, ox = 0, oz = 0) {
  wt = Math.max(wt, 0.001); dt = Math.max(dt, 0.001);
  const y0 = -h / 2, y1 = h / 2;
  const B = [[-wb / 2, y0, -db / 2], [wb / 2, y0, -db / 2], [wb / 2, y0, db / 2], [-wb / 2, y0, db / 2]];
  const T = [[-wt / 2 + ox, y1, -dt / 2 + oz], [wt / 2 + ox, y1, -dt / 2 + oz], [wt / 2 + ox, y1, dt / 2 + oz], [-wt / 2 + ox, y1, dt / 2 + oz]];
  const F = [B, T];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; F.push([B[i], B[j], T[j], T[i]]); }
  return polyGeo(F, [ox / 2, 0, oz / 2]);
}
// Convex solid from polygon loops; winding fixed so faces point away from c.
function polyGeo(faces, c = [0, 0, 0]) {
  const pos = [];
  for (const f of faces) {
    for (let i = 1; i < f.length - 1; i++) {
      const a = f[0]; let b = f[i], d = f[i + 1];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const cx = (a[0] + b[0] + d[0]) / 3 - c[0], cy = (a[1] + b[1] + d[1]) / 3 - c[1], cz = (a[2] + b[2] + d[2]) / 3 - c[2];
      if (nx * cx + ny * cy + nz * cz < 0) { const t = b; b = d; d = t; }
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], d[0], d[1], d[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
const _mm = new THREE.Matrix4(), _mq = new Q4(), _me = new THREE.Euler(), _mp = new V3(), _ms = new V3(), _nm = new THREE.Matrix3();
// Build one geometry from parts. Flat-shaded by default; opts.smooth uses the source normals.
// Adds a 'glow' attribute (emissive weight) when any part has e > 0.
function buildModel(parts, opts = {}) {
  let n = 0;
  const geos = parts.map((pt) => { const g = pt.geo || baseGeo(pt.g, pt.a); n += g.attributes.position.count; return g; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const anyGlow = parts.some((p) => p.e), glow = anyGlow ? new Float32Array(n) : null;
  let o = 0;
  const jit = opts.jitter || 0, rnd = mulberry32(opts.seed || 7);
  for (let k = 0; k < parts.length; k++) {
    const pt = parts[k], g = geos[k];
    _mp.set(...(pt.p || [0, 0, 0])); _me.set(...(pt.r || [0, 0, 0])); _mq.setFromEuler(_me);
    const s = pt.s || [1, 1, 1]; _ms.set(s[0], s[1], s[2]);
    _mm.compose(_mp, _mq, _ms); _nm.getNormalMatrix(_mm);
    const P = g.attributes.position, N = g.attributes.normal, cnt = P.count;
    const c = hex3(pt.c == null ? 0xffffff : pt.c);
    const smoothN = (opts.smooth || pt.smooth) && N;
    for (let i = 0; i < cnt; i += 3) {
      const tri = [];
      for (let j = 0; j < 3; j++) { _v1.set(P.getX(i + j), P.getY(i + j), P.getZ(i + j)).applyMatrix4(_mm); tri.push(_v1.x, _v1.y, _v1.z); }
      const ux = tri[3] - tri[0], uy = tri[4] - tri[1], uz = tri[5] - tri[2], vx = tri[6] - tri[0], vy = tri[7] - tri[1], vz = tri[8] - tri[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const sh = jit ? 1 + (rnd() - 0.5) * jit : 1;
      for (let j = 0; j < 3; j++) {
        pos[o] = tri[j * 3]; pos[o + 1] = tri[j * 3 + 1]; pos[o + 2] = tri[j * 3 + 2];
        if (smoothN) { _v2.set(N.getX(i + j), N.getY(i + j), N.getZ(i + j)).applyMatrix3(_nm).normalize(); nor[o] = _v2.x; nor[o + 1] = _v2.y; nor[o + 2] = _v2.z; }
        else { nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; }
        col[o] = c[0] * sh; col[o + 1] = c[1] * sh; col[o + 2] = c[2] * sh;
        if (glow) glow[o / 3] = pt.e || 0;
        o += 3;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (glow) g.setAttribute('glow', new THREE.BufferAttribute(glow, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
// Shorthand part constructors
const P_ = {
  box: (w, h, d, c, p, r, s) => ({ g: 'box', a: [w, h, d], c, p, r, s }),
  cyl: (rt, rb, h, seg, c, p, r, s) => ({ g: 'cyl', a: [rt, rb, h, seg], c, p, r, s }),
  cone: (rad, h, seg, c, p, r, s) => ({ g: 'cone', a: [rad, h, seg], c, p, r, s }),
  sph: (rad, ws, hs, c, p, r, s) => ({ g: 'sph', a: [rad, ws, hs], c, p, r, s }),
  ico: (rad, d, c, p, r, s) => ({ g: 'ico', a: [rad, d], c, p, r, s }),
  dod: (rad, c, p, r, s) => ({ g: 'dod', a: [rad], c, p, r, s }),
  oct: (rad, c, p, r, s) => ({ g: 'oct', a: [rad], c, p, r, s }),
  tbox: (wb, db, wt, dt, h, c, p, r, s) => ({ g: 'tbox', a: [wb, db, wt, dt, h], c, p, r, s }),
  tor: (R, t, rs, ts, arc, c, p, r, s) => ({ g: 'tor', a: [R, t, rs, ts, arc], c, p, r, s }),
};
const glowPart = (pt, e = 1) => Object.assign(pt, { e });

// Merge several BufferGeometries (non-indexed, same attributes) into one.
function mergeGeos(list) {
  const names = Object.keys(list[0].attributes);
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const nm of names) {
    const is = list[0].attributes[nm].itemSize;
    const arr = new Float32Array(n * is); let o = 0;
    for (const g of list) { const a = g.attributes[nm]; if (a) arr.set(a.array, o); o += g.attributes.position.count * is; }
    out.setAttribute(nm, new THREE.BufferAttribute(arr, is));
  }
  out.computeBoundingSphere();
  return out;
}

// Build a basis quaternion whose +Y is `up` and whose -Z points as close as possible to `fwd`.
function basisQuat(up, fwd, out = new Q4()) {
  const y = _v4.copy(up).normalize();
  const z = _v5.copy(fwd).multiplyScalar(-1);
  z.addScaledVector(y, -z.dot(y));
  if (z.lengthSq() < 1e-8) { z.set(1, 0, 0).addScaledVector(y, -y.x); if (z.lengthSq() < 1e-6) z.set(0, 0, 1).addScaledVector(y, -y.z); }
  z.normalize();
  const x = _v6.crossVectors(y, z);
  _m4.makeBasis(x, y, z);
  return out.setFromRotationMatrix(_m4);
}
// Any unit vector perpendicular to v
function perpOf(v, out = new V3()) { if (Math.abs(v.y) < 0.9) out.set(0, 1, 0); else out.set(1, 0, 0); return out.cross(v).normalize(); }

// ---------- input: keyboard, mouse and the standard Gamepad API ----------
const Input = (() => {
  const down = {}, hit = new Set(), up = new Set();
  const m = { dx: 0, dy: 0, wheel: 0, b: [false, false, false], hit: [false, false, false], up: [false, false, false], x: 0, y: 0 };
  let locked = false, typing = false;
  const gp = { connected: false, axes: [0, 0, 0, 0], b: new Array(17).fill(0), prev: new Array(17).fill(0), hit: new Array(17).fill(false), up: new Array(17).fill(false), last: 0, active: false };
  const canvas = () => document.getElementById('c');
  addEventListener('keydown', (e) => {
    if (typing || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) return;
    if (!down[e.code]) hit.add(e.code);
    down[e.code] = true; gp.active = false;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'AltLeft', 'AltRight', 'F1'].includes(e.code) || (e.ctrlKey && e.code !== 'KeyC' && e.code !== 'KeyV')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { down[e.code] = false; up.add(e.code); });
  addEventListener('blur', () => { for (const k in down) down[k] = false; m.b[0] = m.b[1] = m.b[2] = false; });
  addEventListener('mousemove', (e) => { if (locked) { m.dx += e.movementX; m.dy += e.movementY; } m.x = e.clientX; m.y = e.clientY; if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) gp.active = false; });
  addEventListener('mousedown', (e) => { if (!locked) return; m.b[e.button] = true; m.hit[e.button] = true; e.preventDefault(); });
  addEventListener('mouseup', (e) => { if (m.b[e.button]) m.up[e.button] = true; m.b[e.button] = false; });
  addEventListener('wheel', (e) => { if (locked) { m.wheel += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });
  addEventListener('contextmenu', (e) => { if (locked || e.target === canvas()) e.preventDefault(); });
  document.addEventListener('pointerlockchange', () => {
    const was = locked; locked = document.pointerLockElement === canvas();
    if (!locked) { m.b[0] = m.b[1] = m.b[2] = false; }
    bus.emit('lock', locked, was);
  });
  addEventListener('gamepadconnected', () => { gp.connected = true; bus.emit('gamepad', true); });
  addEventListener('gamepaddisconnected', () => { gp.connected = !!(navigator.getGamepads && [...navigator.getGamepads()].some((g) => g)); bus.emit('gamepad', gp.connected); });
  const dz = (v) => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84);
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null; for (const g of pads) if (g && g.connected) { p = g; break; }
    gp.connected = !!p;
    for (let i = 0; i < 17; i++) { gp.prev[i] = gp.b[i]; }
    if (!p) { gp.b.fill(0); gp.axes.fill(0); }
    else {
      for (let i = 0; i < 4; i++) gp.axes[i] = dz(p.axes[i] || 0);
      for (let i = 0; i < 17; i++) { const bt = p.buttons[i]; gp.b[i] = bt ? (typeof bt === 'object' ? bt.value : bt) : 0; }
    }
    for (let i = 0; i < 17; i++) { gp.hit[i] = gp.b[i] > 0.5 && gp.prev[i] <= 0.5; gp.up[i] = gp.b[i] <= 0.5 && gp.prev[i] > 0.5; if (gp.hit[i]) gp.active = true; }
    if (Math.abs(gp.axes[0]) + Math.abs(gp.axes[1]) + Math.abs(gp.axes[2]) + Math.abs(gp.axes[3]) > 0.3) gp.active = true;
  }
  return {
    m, gp,
    down: (c) => !!down[c],
    hit: (c) => hit.has(c),
    up: (c) => up.has(c),
    get locked() { return locked; },
    lock() { const c = canvas(); if (c && c.requestPointerLock) { try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } } },
    unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
    setTyping(v) { typing = v; },
    poll: pollPad,
    endFrame() { hit.clear(); up.clear(); m.dx = m.dy = 0; m.wheel = 0; m.hit[0] = m.hit[1] = m.hit[2] = false; m.up[0] = m.up[1] = m.up[2] = false; },
    press(c) { hit.add(c); down[c] = true; },
    release(c) { down[c] = false; up.add(c); },
  };
})();

// Logical actions over both devices. Gamepad buttons (standard mapping):
// 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 View, 9 Menu, 10 L3, 11 R3, 12 up, 13 down, 14 left, 15 right
const ACT = {
  jump: { k: ['Space'], b: [0] },
  sprint: { k: ['ShiftLeft', 'ShiftRight'], b: [10] },
  interact: { k: ['KeyE'], b: [2] },
  fire: { m: 0, b: [7] },
  aim: { m: 2, b: [] },
  visor: { k: ['KeyF'], b: [6] },
  scan: { k: ['KeyC'], b: [4] },
  mode: { k: ['KeyG'], b: [5] },
  reload: { k: ['KeyR'], b: [3] },
  melee: { k: ['KeyV'], b: [1] },
  torch: { k: ['KeyT'], b: [] },
  view: { k: ['KeyP'], b: [11] },
  inventory: { k: ['Tab', 'KeyI'], b: [8] },
  pause: { k: ['Escape'], b: [9] },
  map: { k: ['KeyM'], b: [12] },
  build: { k: ['KeyB'], b: [13] },
  quick: { k: ['KeyX'], b: [14] },
  log: { k: ['KeyN', 'KeyL'], b: [15] },
  // ship
  boost: { k: ['ShiftLeft', 'ShiftRight'], b: [0] },
  pulse: { k: ['Space'], b: [4] },
  shipFire: { m: 0, b: [5] },
  warp: { k: ['KeyH'], b: [3] },
  rollL: { k: ['KeyA'], b: [] },
  rollR: { k: ['KeyD'], b: [] },
  thrust: { k: ['KeyW'], b: [7] },
  brake: { k: ['KeyS'], b: [6] },
  // build mode
  rotate: { k: ['KeyR'], b: [3] },
  cancel: { k: ['KeyQ'], b: [1] },
};
const Act = {
  down(a) {
    const d = ACT[a]; if (!d) return false;
    if (d.k) for (const k of d.k) if (Input.down(k)) return true;
    if (d.m != null && Input.m.b[d.m]) return true;
    if (d.b) for (const b of d.b) if (Input.gp.b[b] > 0.5) return true;
    return false;
  },
  hit(a) {
    const d = ACT[a]; if (!d) return false;
    if (d.k) for (const k of d.k) if (Input.hit(k)) return true;
    if (d.m != null && Input.m.hit[d.m]) return true;
    if (d.b) for (const b of d.b) if (Input.gp.hit[b]) return true;
    return false;
  },
  up(a) {
    const d = ACT[a]; if (!d) return false;
    if (d.k) for (const k of d.k) if (Input.up(k)) return true;
    if (d.m != null && Input.m.up[d.m]) return true;
    if (d.b) for (const b of d.b) if (Input.gp.up[b]) return true;
    return false;
  },
  analog(a) { const d = ACT[a]; if (d && d.b && d.b.length) { let v = 0; for (const b of d.b) v = Math.max(v, Input.gp.b[b]); if (v > 0.05) return v; } return Act.down(a) ? 1 : 0; },
  // movement vector (x right, y forward), keyboard or left stick
  move() {
    let x = (Input.down('KeyD') ? 1 : 0) - (Input.down('KeyA') ? 1 : 0), y = (Input.down('KeyW') ? 1 : 0) - (Input.down('KeyS') ? 1 : 0);
    if (Input.gp.axes[0] || Input.gp.axes[1]) { x = Input.gp.axes[0]; y = -Input.gp.axes[1]; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  },
  // look delta in radians this frame
  look(dt) {
    const s = SETTINGS.sens * 0.0022;
    let x = Input.m.dx * s, y = Input.m.dy * s * (SETTINGS.invertY ? -1 : 1);
    const ax = Input.gp.axes[2], ay = Input.gp.axes[3];
    if (ax || ay) { const k = 2.8 * SETTINGS.sens * dt; x += Math.sign(ax) * ax * ax * k; y += Math.sign(ay) * ay * ay * k * (SETTINGS.invertY ? -1 : 1); }
    return { x, y };
  },
  get pad() { return Input.gp.active; },
};
// Label for the current device: key name or pad glyph
function keyLabel(a) {
  const d = ACT[a]; if (!d) return '?';
  if (Input.gp.active && d.b && d.b.length) return ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', '↑', '↓', '←', '→'][d.b[0]];
  if (d.m != null && !d.k) return ['LMB', 'MMB', 'RMB'][d.m];
  return (d.k[0] || '').replace(/^Key/, '').replace(/^Digit/, '').replace('Left', '').replace('Escape', 'Esc');
}
