// Tokoyo — shared helpers: math, seeded RNG, noise, low-poly model builder, events, input

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (s) => document.querySelector(s);
const DEBUG = location.hash.startsWith('#debug');
const V3 = THREE.Vector3;
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3();
const _q1 = new THREE.Quaternion(), _m4 = new THREE.Matrix4(), _e1 = new THREE.Euler();
const UP = new V3(0, 1, 0);
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function angTo(a, b, step) { const d = angWrap(b - a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; }
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const frand = (a, b) => a + (b - a) * Math.random();
const fpick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Per-thing deterministic randoms
function hash2(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- 2D simplex noise (seeded) ----------
const Noise = (() => {
  const perm = new Uint8Array(512), grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function seed(s) {
    const r = mulberry32(s), p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  function s2(xin, yin) {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, tt;
    tt = 0.5 - x0 * x0 - y0 * y0; if (tt > 0) { const g = grad[perm[ii + perm[jj]] & 7]; tt *= tt; n += tt * tt * (g[0] * x0 + g[1] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1; if (tt > 0) { const g = grad[perm[ii + i1 + perm[jj + j1]] & 7]; tt *= tt; n += tt * tt * (g[0] * x1 + g[1] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2; if (tt > 0) { const g = grad[perm[ii + 1 + perm[jj + 1]] & 7]; tt *= tt; n += tt * tt * (g[0] * x2 + g[1] * y2); }
    return 70 * n; // ~[-1,1]
  }
  function fbm(x, z, oct, lac = 2.03, gain = 0.5) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += s2(x * f + i * 19.1, z * f - i * 7.7) * a; n += a; a *= gain; f *= lac; }
    return s / n;
  }
  function ridged(x, z, oct) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { let v = 1 - Math.abs(s2(x * f + i * 31.7, z * f - i * 13.3)); v *= v; s += v * a; n += a; a *= 0.5; f *= 2.1; }
    return s / n;
  }
  seed(1);
  return { seed, s2, fbm, ridged };
})();

// ---------- events ----------
const bus = (() => {
  const m = {};
  return {
    on(n, f) { (m[n] = m[n] || []).push(f); },
    emit(n, ...a) { const l = m[n]; if (l) for (const f of l) f(...a); },
  };
})();

// ---------- low-poly model builder ----------
// A model is a list of parts merged into one flat-shaded, vertex-coloured geometry.
// part: { g: 'box'|'cyl'|'cone'|'sph'|'ico'|'tbox'|'tor'|'geo', a: [...args], c: 0xRRGGBB, p: [x,y,z], r: [rx,ry,rz], s: [sx,sy,sz] }
const _geoCache = {};
function baseGeo(g, a) {
  const k = g + ':' + a.join(',');
  if (_geoCache[k]) return _geoCache[k];
  let geo;
  switch (g) {
    case 'box': geo = new THREE.BoxGeometry(a[0], a[1], a[2]); break;
    case 'cyl': geo = new THREE.CylinderGeometry(a[0], a[1], a[2], a[3] || 6, 1, !!a[4]); break;
    case 'cone': geo = new THREE.ConeGeometry(a[0], a[1], a[2] || 6); break;
    case 'sph': geo = new THREE.SphereGeometry(a[0], a[1] || 6, a[2] || 4); break;
    case 'ico': geo = new THREE.IcosahedronGeometry(a[0], a[1] || 0); break;
    case 'dod': geo = new THREE.DodecahedronGeometry(a[0], 0); break;
    case 'tor': geo = new THREE.TorusGeometry(a[0], a[1], a[2] || 4, a[3] || 8, a[4] || TAU); break;
    case 'tbox': geo = taperBox(...a); break;
    default: throw new Error('geo ' + g);
  }
  geo = geo.index ? geo.toNonIndexed() : geo;
  return (_geoCache[k] = geo);
}
// Box whose top differs from bottom (wedges, tapered limbs, roofs).
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
const _mm = new THREE.Matrix4(), _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new V3(), _ms = new V3(), _nm = new THREE.Matrix3();
function buildModel(parts, opts = {}) {
  let n = 0;
  const geos = parts.map((pt) => { const g = pt.geo || baseGeo(pt.g, pt.a); n += g.attributes.position.count; return g; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  const jit = opts.jitter || 0, rnd = mulberry32(opts.seed || 7);
  for (let k = 0; k < parts.length; k++) {
    const pt = parts[k], g = geos[k];
    _mp.set(...(pt.p || [0, 0, 0])); _me.set(...(pt.r || [0, 0, 0])); _mq.setFromEuler(_me);
    const s = pt.s || [1, 1, 1]; _ms.set(s[0], s[1], s[2]);
    _mm.compose(_mp, _mq, _ms);
    const P = g.attributes.position, cnt = P.count;
    const c = hex3(pt.c == null ? 0xffffff : pt.c);
    for (let i = 0; i < cnt; i += 3) {
      // transform a triangle, compute its flat normal
      const tri = [];
      for (let j = 0; j < 3; j++) { _v1.set(P.getX(i + j), P.getY(i + j), P.getZ(i + j)).applyMatrix4(_mm); tri.push(_v1.x, _v1.y, _v1.z); }
      const ux = tri[3] - tri[0], uy = tri[4] - tri[1], uz = tri[5] - tri[2], vx = tri[6] - tri[0], vy = tri[7] - tri[1], vz = tri[8] - tri[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const sh = jit ? 1 + (rnd() - 0.5) * jit : 1;
      for (let j = 0; j < 3; j++) {
        pos[o] = tri[j * 3]; pos[o + 1] = tri[j * 3 + 1]; pos[o + 2] = tri[j * 3 + 2];
        nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
        col[o] = c[0] * sh; col[o + 1] = c[1] * sh; col[o + 2] = c[2] * sh;
        o += 3;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
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
  tbox: (wb, db, wt, dt, h, c, p, r, s) => ({ g: 'tbox', a: [wb, db, wt, dt, h], c, p, r, s }),
  tor: (R, t, rs, ts, arc, c, p, r, s) => ({ g: 'tor', a: [R, t, rs, ts, arc], c, p, r, s }),
};

// ---------- input ----------
const Input = (() => {
  const down = {}, hit = new Set(), up = new Set();
  const m = { dx: 0, dy: 0, wheel: 0, b: [false, false, false], hit: [false, false, false], up: [false, false, false], x: 0, y: 0 };
  let locked = false, typing = false;
  const canvas = () => document.getElementById('c');
  addEventListener('keydown', (e) => {
    if (typing || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) return;
    if (!down[e.code]) hit.add(e.code);
    down[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'AltLeft', 'AltRight'].includes(e.code) || (e.ctrlKey && e.code !== 'KeyC' && e.code !== 'KeyV')) e.preventDefault();
  });
  addEventListener('keyup', (e) => { down[e.code] = false; up.add(e.code); });
  addEventListener('blur', () => { for (const k in down) down[k] = false; m.b[0] = m.b[1] = m.b[2] = false; });
  addEventListener('mousemove', (e) => { if (locked) { m.dx += e.movementX; m.dy += e.movementY; } m.x = e.clientX; m.y = e.clientY; });
  addEventListener('mousedown', (e) => {
    if (!locked) return;
    m.b[e.button] = true; m.hit[e.button] = true; e.preventDefault();
  });
  addEventListener('mouseup', (e) => { if (m.b[e.button]) m.up[e.button] = true; m.b[e.button] = false; });
  addEventListener('wheel', (e) => { if (locked) { m.wheel += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });
  addEventListener('contextmenu', (e) => { if (locked || e.target === canvas()) e.preventDefault(); });
  document.addEventListener('pointerlockchange', () => {
    const was = locked; locked = document.pointerLockElement === canvas();
    if (!locked) { m.b[0] = m.b[1] = m.b[2] = false; }
    bus.emit('lock', locked, was);
  });
  return {
    m,
    down: (c) => !!down[c],
    hit: (c) => hit.has(c),
    up: (c) => up.has(c),
    get locked() { return locked; },
    lock() { const c = canvas(); if (c && c.requestPointerLock) { try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } } },
    unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
    setTyping(v) { typing = v; },
    endFrame() { hit.clear(); up.clear(); m.dx = m.dy = 0; m.wheel = 0; m.hit[0] = m.hit[1] = m.hit[2] = false; m.up[0] = m.up[1] = m.up[2] = false; },
    // debug: inject
    press(c) { hit.add(c); down[c] = true; },
    release(c) { down[c] = false; up.add(c); },
  };
})();

// Minimal binary heap (max-heap on .k)
class MaxHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(o) { const a = this.a; a.push(o); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].k >= a[i].k) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].k > a[m].k) m = l; if (r < a.length && a[r].k > a[m].k) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
}
