// Ashreach — shared helpers: math, seeded RNG, noise, low-poly geometry builders, input state, event bus

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => t * t * (3 - 2 * t);
const $ = (s) => document.querySelector(s);
const DEBUG = location.hash === '#debug';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// The world is generated from a fixed seed so it is the same every visit.
const rand = mulberry32(790318);
const rr = (a, b) => a + (b - a) * rand();
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const frand = (a, b) => a + (b - a) * Math.random();

function hash2(x, z) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
function fbm(x, z, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f + i * 17.3, z * f - i * 9.1) * a; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
// Sharp-crested noise for mountain ranges.
function ridged(x, z, oct = 5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    let v = 1 - Math.abs(vnoise(x * f + i * 31.7, z * f - i * 13.3) * 2 - 1);
    v *= v; s += v * a; n += a; a *= 0.5; f *= 2.1;
  }
  return s / n;
}
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
// Move angle a toward b by at most step radians.
function angTo(a, b, step) { const d = angWrap(b - a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; }

const V3 = THREE.Vector3;
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _v5 = new V3(), _v6 = new V3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m4 = new THREE.Matrix4(), _e1 = new THREE.Euler();
const UP = new V3(0, 1, 0);
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

// ---------- low-poly geometry ----------
// Convex solid from polygon loops; each loop's winding is fixed so its face points away from `c`.
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
  g.computeVertexNormals();
  return g;
}
// Box with chamfered edges and corners: the staple of mecha armour.
function chamferBox(w, h, d, b) {
  b = Math.min(b, w * 0.45, h * 0.45, d * 0.45);
  const X = w / 2, Y = h / 2, Z = d / 2;
  const pt = (sx, sy, sz, ax) => ax === 0 ? [sx * X, sy * (Y - b), sz * (Z - b)] : ax === 1 ? [sx * (X - b), sy * Y, sz * (Z - b)] : [sx * (X - b), sy * (Y - b), sz * Z];
  const F = [];
  for (const s of [-1, 1]) {
    F.push([pt(s, -1, -1, 0), pt(s, 1, -1, 0), pt(s, 1, 1, 0), pt(s, -1, 1, 0)]);
    F.push([pt(-1, s, -1, 1), pt(1, s, -1, 1), pt(1, s, 1, 1), pt(-1, s, 1, 1)]);
    F.push([pt(-1, -1, s, 2), pt(1, -1, s, 2), pt(1, 1, s, 2), pt(-1, 1, s, 2)]);
  }
  for (const a of [-1, 1]) for (const c of [-1, 1]) {
    F.push([pt(a, c, -1, 0), pt(a, c, 1, 0), pt(a, c, 1, 1), pt(a, c, -1, 1)]);
    F.push([pt(a, -1, c, 0), pt(a, 1, c, 0), pt(a, 1, c, 2), pt(a, -1, c, 2)]);
    F.push([pt(-1, a, c, 1), pt(1, a, c, 1), pt(1, a, c, 2), pt(-1, a, c, 2)]);
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) F.push([pt(sx, sy, sz, 0), pt(sx, sy, sz, 1), pt(sx, sy, sz, 2)]);
  return polyGeo(F);
}
// Box whose top face differs from its bottom face (and may be offset): wedges, tapered limbs, skirts.
function taperBox(wb, db, wt, dt, h, ox = 0, oz = 0) {
  wt = Math.max(wt, 0.02); dt = Math.max(dt, 0.02);
  const y0 = -h / 2, y1 = h / 2;
  const B = [[-wb / 2, y0, -db / 2], [wb / 2, y0, -db / 2], [wb / 2, y0, db / 2], [-wb / 2, y0, db / 2]];
  const T = [[-wt / 2 + ox, y1, -dt / 2 + oz], [wt / 2 + ox, y1, -dt / 2 + oz], [wt / 2 + ox, y1, dt / 2 + oz], [-wt / 2 + ox, y1, dt / 2 + oz]];
  const F = [B, T];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; F.push([B[i], B[j], T[j], T[i]]); }
  return polyGeo(F, [ox / 2, 0, oz / 2]);
}

// Merge several (geometry, transform, vertex colour) parts into one flat-shaded, non-indexed geometry.
function mergeParts(parts) {
  const pos = [], nor = [], col = [];
  const m = new THREE.Matrix4();
  for (const pt of parts) {
    const g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
    m.compose(new V3(...(pt.p || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(pt.r || [0, 0, 0]))), new V3(...(pt.s || [1, 1, 1])));
    g.applyMatrix4(m);
    g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal, c = pt.c || [1, 1, 1];
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      col.push(c[0], c[1], c[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}
function flatGeo(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; }

// Independent seeded generator for content that must be reproducible from a seed (zones, missions, loot rolls).
function makeRng(seed) {
  const f = mulberry32(seed >>> 0);
  return {
    f, r: (a, b) => a + (b - a) * f(), i: (a, b) => Math.floor(a + (b - a + 1) * f()),
    pick: (arr) => arr[Math.floor(f() * arr.length)], chance: (p) => f() < p,
  };
}
function strSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let _uid = 1;
const uid = () => _uid++;
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- event bus ----------
// EV.on('dmg', fn) / EV.emit('dmg', ...args). Event names and payloads are listed in API.md.
const EV = {
  h: {},
  on(n, fn) { (this.h[n] || (this.h[n] = [])).push(fn); return fn; },
  off(n, fn) { const a = this.h[n]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
  emit(n, ...a) { const l = this.h[n]; if (l) for (const fn of l.slice()) fn(...a); },
};

// ---------- input ----------
const keys = {};
const mouse = { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, l: false, r: false };
const pressed = new Set();   // key codes pressed since the last frame
