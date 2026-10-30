// Creature Feature — renderer, night sky and moon, the pool of point lights that follows the camera, materials,
// and Mesher: a vertex-coloured geometry builder used for the town, the people, the monsters and the cars

const R = {
  renderer: null, scene: null, camera: null, hemi: null, moon: null, sky: null, lights: [], w: 1, h: 1,
  moonDir: new V3(-0.45, 0.5, -0.74).normalize(), ratio: 1,
};
const NIGHT_FOG = 0x0d1428;

function initRender() {
  const canvas = $('#c');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
  if (!renderer) { $('#nogl').hidden = false; throw new Error('WebGL unavailable'); }
  R.renderer = renderer;
  renderer.setClearColor(NIGHT_FOG);
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(OPTS.fov, 16 / 9, 0.15, 900);
  R.hemi = new THREE.HemisphereLight(0x7080c0, 0x1c1a26, 0.62);
  R.moon = new THREE.DirectionalLight(0xa8b8ff, 0.5);
  R.moon.position.copy(R.moonDir).multiplyScalar(100);
  R.scene.add(R.hemi, R.moon);
  // a fixed pool of point lights moved onto the light sources nearest the camera (a fixed count, so shaders never recompile)
  for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffd8a0, 0, 16, 2); R.scene.add(l); R.lights.push(l); }
  R.scene.fog = new THREE.Fog(NIGHT_FOG, 30, 230);
  makeSky();
  addEventListener('resize', resize);
  resize();
}
function quality() { return OPTS.quality; }
function resize() {
  const w = innerWidth, h = innerHeight, q = quality();
  const dpr = devicePixelRatio || 1;
  R.ratio = q === 'low' ? Math.min(dpr, 1) * 0.6 : q === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.25);
  R.renderer.setPixelRatio(R.ratio);
  R.renderer.setSize(w, h, false);
  R.w = w; R.h = h;
  R.camera.aspect = w / h;
  R.camera.fov = w / h < 1 ? OPTS.fov + 14 : OPTS.fov;
  R.camera.updateProjectionMatrix();
  bus.emit('resize', w, h);
}

// ---------- sky: a gradient dome, stars and a big moon ----------
function makeSky() {
  const g = new THREE.SphereGeometry(800, 24, 12);
  const pos = g.attributes.position, col = [];
  const top = new THREE.Color(0x02030a), mid = new THREE.Color(0x0a1230), hor = new THREE.Color(NIGHT_FOG), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 800;
    if (y > 0.25) c.copy(mid).lerp(top, smooth(0.25, 0.9, y)); else c.copy(hor).lerp(mid, smooth(-0.05, 0.25, y));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  R.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  R.sky.renderOrder = -10;
  R.scene.add(R.sky);
  // stars
  const sp = [], rnd = RNG(7);
  for (let i = 0; i < 900; i++) {
    const u = rnd.range(0.08, 1), a = rnd() * TAU, r = Math.sqrt(1 - u * u);
    sp.push(Math.cos(a) * r * 760, u * 760, Math.sin(a) * r * 760);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  R.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc8d4ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8, depthWrite: false }));
  R.sky.add(R.stars);
}
function makeMoon() {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.moon, fog: false, depthWrite: false, transparent: true }));
  m.scale.set(190, 190, 1);
  m.position.copy(R.moonDir).multiplyScalar(700);
  m.renderOrder = -9;
  R.sky.add(m);
  R.moonSprite = m;
}
// the sky dome follows the camera
function updateSky() { R.sky.position.copy(R.camera.position); }

// ---------- the light pool ----------
// LIGHTS.src is filled by the town: { x, y, z, color, i (intensity), r (range), on }
const LIGHTS = { src: [], t: 0, extra: [] };
function updateLightPool(dt, cx, cz) {
  LIGHTS.t -= dt;
  if (LIGHTS.t > 0) return;
  LIGHTS.t = 0.2;
  const n = quality() === 'low' ? 4 : R.lights.length;
  const cand = [];
  for (const s of LIGHTS.extra) if (s.on) cand.push([dist2(s.x, s.z, cx, cz) * 0.25, s]);
  for (const s of LIGHTS.src) {
    if (!s.on) continue;
    const d = dist2(s.x, s.z, cx, cz);
    if (d < 75 * 75) cand.push([d / (s.i * s.i), s]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < R.lights.length; i++) {
    const L = R.lights[i], c = i < n ? cand[i] : null;
    if (!c) { L.intensity = 0; continue; }
    const s = c[1];
    L.position.set(s.x, s.y, s.z); L.color.setHex(s.color); L.intensity = s.i; L.distance = s.r;
  }
}

// ---------- materials ----------
const MATS = {};
function initMats() {
  MATS.vc = new THREE.MeshLambertMaterial({ vertexColors: true });
  MATS.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MATS.flat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
}
const _mc = new Map();
function mat(color, o = {}) {
  const k = color + '|' + JSON.stringify(o);
  let m = _mc.get(k);
  if (m) return m;
  if (o.basic) m = new THREE.MeshBasicMaterial({ color, transparent: !!o.t, opacity: o.o === undefined ? 1 : o.o, depthWrite: !o.t, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, fog: o.fog !== false, map: o.map || null });
  else m = new THREE.MeshLambertMaterial({ color, emissive: o.e || 0, transparent: !!o.t, opacity: o.o === undefined ? 1 : o.o, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, map: o.map || null });
  _mc.set(k, m);
  return m;
}

// ---------- Mesher: builds one vertex-coloured BufferGeometry from many primitives ----------
const _col = new THREE.Color();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s3 = new V3(), _p3 = new V3();
class Mesher {
  constructor() { this.p = []; this.n = []; this.c = []; }
  get empty() { return this.p.length === 0; }
  _rgb(col) { if (typeof col === 'number') _col.setHex(col); else _col.copy(col); return _col; }
  // one triangle with a flat normal
  tri(a, b, c, col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const k = this._rgb(col);
    for (const v of [a, b, c]) { this.p.push(v[0], v[1], v[2]); this.n.push(nx, ny, nz); this.c.push(k.r, k.g, k.b); }
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  // an axis-aligned box rotated by ry about its centre; nb: skip the bottom face
  box(cx, cy, cz, sx, sy, sz, col, ry = 0, nb = true) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (x, y, z) => [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(-hx, hy, hz)];
    this.quad(v[3], v[2], v[6], v[7], col); // +z
    this.quad(v[1], v[0], v[4], v[5], col); // -z
    this.quad(v[2], v[1], v[5], v[6], col); // +x
    this.quad(v[0], v[3], v[7], v[4], col); // -x
    this.quad(v[7], v[6], v[5], v[4], col); // top
    if (!nb) this.quad(v[0], v[1], v[2], v[3], col);
  }
  // any three.js geometry, transformed by position / rotation (euler) / scale
  geo(g, col, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _m4.compose(_p3.set(px, py, pz), _q.setFromEuler(_e.set(rx, ry, rz)), _s3.set(sx, sy, sz));
    this.geoM(g, col, _m4);
  }
  geoM(g, col, m4) {
    const src = g.index ? g.toNonIndexed() : g;
    const pos = src.attributes.position, nor = src.attributes.normal;
    const nm = new THREE.Matrix3().getNormalMatrix(m4), k = this._rgb(col);
    for (let i = 0; i < pos.count; i++) {
      _v1.fromBufferAttribute(pos, i).applyMatrix4(m4);
      _v2.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      this.p.push(_v1.x, _v1.y, _v1.z); this.n.push(_v2.x, _v2.y, _v2.z); this.c.push(k.r, k.g, k.b);
    }
  }
  // a gable roof: footprint w (x) by d (z) at height y0, ridge h above, overhang o, ridge along x unless alongZ
  gable(cx, y0, cz, w, d, h, col, ry = 0, o = 0.4, alongZ = false, gableCol) {
    if (alongZ) { ry += Math.PI / 2; const t = w; w = d; d = t; }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (x, y, z) => [cx + x * cs + z * sn, y0 + y, cz - x * sn + z * cs];
    const W = w / 2 + o, D = d / 2 + o, iw = w / 2, id = d / 2;
    const a = P(-W, -0.15, -D), b = P(W, -0.15, -D), c = P(W, -0.15, D), e = P(-W, -0.15, D), r1 = P(-W, h, 0), r2 = P(W, h, 0);
    this.quad(a, r1, r2, b, col); this.quad(c, r2, r1, e, col);
    // the triangular gable ends
    const gc = gableCol === undefined ? col : gableCol;
    this.tri(P(-iw, 0, id), P(-iw, h, 0), P(-iw, 0, -id), gc);
    this.tri(P(iw, 0, -id), P(iw, h, 0), P(iw, 0, id), gc);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    return g;
  }
}
// cached unit primitives for Mesher.geo
const PRIM = {};
const prim = (k, f) => PRIM[k] || (PRIM[k] = f());
const P_CYL = (n = 8) => prim('cyl' + n, () => new THREE.CylinderGeometry(0.5, 0.5, 1, n));
const P_CONE = (n = 8) => prim('cone' + n, () => new THREE.ConeGeometry(0.5, 1, n));
const P_SPH = (a = 8, b = 6) => prim('sph' + a + '_' + b, () => new THREE.SphereGeometry(0.5, a, b));
const P_TAPER = (t, n = 8) => prim('tap' + t + '_' + n, () => new THREE.CylinderGeometry(0.5 * t, 0.5, 1, n));
