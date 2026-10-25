// Shot Heard — shared helpers: math, seeded RNG, noise, polyline maths, low-poly geometry, input, settings

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => t * t * (3 - 2 * t);
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const DEBUG = location.hash === '#debug';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Map building uses a seeded stream so a field looks the same every time; gameplay uses Math.random.
let rand = mulberry32(1775);
function setSeed(s) { rand = mulberry32(s); }
const rr = (a, b) => a + (b - a) * rand();
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const frand = (a, b) => a + (b - a) * Math.random();
const fpick = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function angTo(a, b, step) { const d = angWrap(b - a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; }

const V3 = THREE.Vector3;
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _v5 = new V3(), _v6 = new V3(), _v7 = new V3(), _v8 = new V3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _e1 = new THREE.Euler();
const UP = new V3(0, 1, 0);
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
const col = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const shadeC = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const cssC = (c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
// yaw convention: yaw 0 faces +Z, forward = (sin yaw, cos yaw); north on the compass is -Z
const fwdX = (yaw) => Math.sin(yaw), fwdZ = (yaw) => Math.cos(yaw);
const yawTo = (dx, dz) => Math.atan2(dx, dz);

// ---------- 2D polylines and polygons (maps are authored in x/z metres) ----------
const SEG = { d: 0, t: 0 };
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  const x = ax + dx * t - px, z = az + dz * t - pz;
  SEG.t = t;
  return Math.sqrt(x * x + z * z);
}
function distPolyline(px, pz, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}
function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function distPolyEdge(x, z, poly) {
  let best = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const d = distSeg(x, z, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
    if (d < best) best = d;
  }
  return best;
}
function polyBounds(pts, pad = 0) {
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }
  return [x0 - pad, z0 - pad, x1 + pad, z1 + pad];
}
function polyLength(pts) { let L = 0; for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return L; }
// Walk a polyline at a fixed spacing, calling fn(x, z, yaw along the line, distance).
function walkLine(pts, step, fn, jitter = 0) {
  let carry = 0, dist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    const L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
    let t = carry;
    while (t <= L) {
      const k = L > 0 ? t / L : 0;
      fn(ax + (bx - ax) * k, az + (bz - az) * k, yaw, dist + t);
      t += step * (1 + (jitter ? (rand() - 0.5) * jitter : 0));
    }
    carry = t - L; dist += L;
  }
}
function polyCentroid(poly) { let x = 0, z = 0; for (const p of poly) { x += p[0]; z += p[1]; } return [x / poly.length, z / poly.length]; }

// ---------- low-poly geometry ----------
// Merge parts {geo, p, r, s, c} into one flat-shaded, non-indexed, vertex-coloured geometry.
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _pp = new V3(), _ps = new V3();
function mergeParts(parts) {
  let n = 0;
  const geos = parts.map((pt) => {
    const g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
    _pe.set(...(pt.r || [0, 0, 0]), pt.ro || 'XYZ');
    _pm.compose(_pp.set(...(pt.p || [0, 0, 0])), _pq.setFromEuler(_pe), _ps.set(...(pt.s || [1, 1, 1])));
    g.applyMatrix4(_pm);
    n += g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(n * 3), colA = new Float32Array(n * 3);
  let o = 0;
  geos.forEach((g, gi) => {
    const P = g.attributes.position.array, c = parts[gi].c || [1, 1, 1], cv = parts[gi].cv;
    for (let i = 0; i < P.length; i += 3) {
      pos[o] = P[i]; pos[o + 1] = P[i + 1]; pos[o + 2] = P[i + 2];
      const k = cv ? cv(P[i], P[i + 1], P[i + 2]) : 1;
      colA[o] = c[0] * k; colA[o + 1] = c[1] * k; colA[o + 2] = c[2] * k;
      o += 3;
    }
    g.dispose();
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
const GEO = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg, 1),
  cone: (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg, 1),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  sph: (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h),
  lathe: (pts, seg = 10) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg),
  // triangular prism (gable): base w along x, depth d along z, apex height h
  prism: (w, h, d) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
  },
};
const part = (geo, c, p, r, s, extra) => Object.assign({ geo, c, p, r, s }, extra || {});
// Jitter the vertices of a geometry a little for a hand-made look.
function wobble(g, amt, seed = 1) {
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const h = hash2(Math.round(x * 97 + seed * 13), Math.round(z * 89 + y * 71));
    const h2 = hash2(Math.round(y * 83 + seed), Math.round(x * 61 - z * 37));
    P.setXYZ(i, x + (h - 0.5) * amt, y + (h2 - 0.5) * amt, z + (hash2(i, seed) - 0.5) * amt);
  }
  return g;
}

// ---------- input ----------
const keys = {};
const pressed = new Set();   // key codes pressed since the last frame
const mouse = { dx: 0, dy: 0, wheel: 0, l: false, r: false, m: false };
const mPressed = new Set();  // 'L', 'R', 'M' pressed since the last frame
let lastInput = 'kbm';
addEventListener('keydown', (e) => {
  if (e.code === 'Tab' || e.code === 'Space' || (e.code.startsWith('Arrow') && document.body.dataset.state === 'play')) e.preventDefault();
  if (e.repeat) return;
  if (!keys[e.code]) pressed.add(e.code);
  keys[e.code] = true; lastInput = 'kbm';
  onKeyHook(e);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = mouse.m = false; });
addEventListener('mousedown', (e) => {
  const b = e.button === 0 ? 'L' : e.button === 2 ? 'R' : 'M';
  if (b === 'L') mouse.l = true; else if (b === 'R') mouse.r = true; else mouse.m = true;
  mPressed.add(b); lastInput = 'kbm';
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; else if (e.button === 2) mouse.r = false; else mouse.m = false; });
addEventListener('mousemove', (e) => { if (document.pointerLockElement) { mouse.dx += e.movementX; mouse.dy += e.movementY; } });
addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
addEventListener('contextmenu', (e) => e.preventDefault());
let onKeyHook = () => {};
const isLocked = () => !!document.pointerLockElement;
function requestLock() { const c = $('#c'); if (c.requestPointerLock && !document.pointerLockElement) { try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }
function releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }
function clearFrameInput() { pressed.clear(); mPressed.clear(); mouse.dx = 0; mouse.dy = 0; mouse.wheel = 0; PAD.pressed.clear(); }

// Standard-mapping gamepad: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 10 LS, 11 RS, 12-15 d-pad
const PAD = { on: false, lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, b: [], prev: [], pressed: new Set() };
function dz(v, d = 0.16) { const a = Math.abs(v); return a < d ? 0 : Math.sign(v) * (a - d) / (1 - d); }
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let g = null;
  for (const p of pads) if (p && p.connected) { g = p; break; }
  PAD.on = !!g;
  if (!g) return;
  PAD.lx = dz(g.axes[0] || 0); PAD.ly = dz(g.axes[1] || 0); PAD.rx = dz(g.axes[2] || 0, 0.12); PAD.ry = dz(g.axes[3] || 0, 0.12);
  for (let i = 0; i < 17; i++) {
    const b = g.buttons[i];
    const v = b ? (typeof b === 'object' ? b.pressed || b.value > 0.5 : b > 0.5) : false;
    PAD.prev[i] = PAD.b[i]; PAD.b[i] = v;
    if (v && !PAD.prev[i]) { PAD.pressed.add(i); lastInput = 'pad'; }
  }
  PAD.lt = g.buttons[6] ? g.buttons[6].value : 0; PAD.rt = g.buttons[7] ? g.buttons[7].value : 0;
  if (Math.abs(PAD.lx) + Math.abs(PAD.ly) + Math.abs(PAD.rx) + Math.abs(PAD.ry) > 0.2) lastInput = 'pad';
}

// ---------- settings (saved in localStorage) ----------
const SETTINGS_KEY = 'shot-heard:settings';
const SET = Object.assign({ sens: 1, padSens: 1, invert: false, fov: 75, vol: 0.8, music: 0.5, quality: 'auto', reload: 'authentic', hints: true },
  (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; } })());
function saveSet() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SET)); } catch (e) {} }
