// Act of God — drawing buildings, rubble and trees: instanced unit shapes with one shader that draws procedural windows
// (lit at night where the power is on), fire glow, scorch, snow on top faces, and golden or sickly tints.
//
// Per instance: aCol (rgb), aSt (damage, power, snow, fire), aSt2 (style, seed, base y, tint: + gold / - disease).

const BMAT = new THREE.ShaderMaterial({
  uniforms: U,
  extensions: { derivatives: true },
  vertexShader: `
    attribute vec3 aCol; attribute vec4 aSt; attribute vec4 aSt2;
    varying vec3 vCol; varying vec4 vSt; varying vec4 vSt2; varying vec3 vW; varying vec3 vN;
    void main() {
      mat4 mm = modelMatrix * instanceMatrix;
      vec4 wp = mm * vec4(position, 1.0);
      mat3 m = mat3(mm);
      vec3 s = vec3(dot(m[0], m[0]), dot(m[1], m[1]), dot(m[2], m[2])) + 1e-6;
      vN = normalize(m * (normal / s));
      vW = wp.xyz; vCol = aCol; vSt = aSt; vSt2 = aSt2;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: GLSL_COMMON + `
    varying vec3 vCol; varying vec4 vSt; varying vec4 vSt2; varying vec3 vW; varying vec3 vN;
    void main() {
      vec3 n = normalize(vN);
      if (!gl_FrontFacing) n = -n;
      float style = floor(vSt2.x + 0.5);
      vec3 col = vCol;
      float side = 1.0 - step(0.55, abs(n.y));
      float v = vW.y - vSt2.z;
      float win = 0.0, glow = 0.0; vec2 id = vec2(0.0);
      if (side > 0.5 && style < 5.5 || style > 6.5 && side > 0.5) {
        vec2 t = normalize(vec2(-n.z, n.x));
        float u = dot(vW.xz, t);
        vec4 P = style < 0.5 ? vec4(3.0, 3.8, 0.04, 0.12) : style < 1.5 ? vec4(3.2, 3.6, 0.16, 0.3) : style < 2.5 ? vec4(3.6, 3.0, 0.25, 0.35)
               : style < 3.5 ? vec4(3.4, 3.4, 0.3, 0.3) : style < 4.5 ? vec4(3.6, 3.0, 0.3, 0.35) : style < 5.5 ? vec4(7.0, 9.0, 0.1, 0.72) : vec4(4.0, 7.0, 0.38, 0.2);
        vec2 cell = vec2(u / P.x, v / P.y);
        vec2 f = fract(cell); id = floor(cell);
        float top = style > 4.5 && style < 5.5 ? 0.86 : 0.9;
        win = step(P.z, f.x) * step(f.x, 1.0 - P.z) * step(P.w, f.y) * step(f.y, top);
        // far away the windows blur into their average instead of shimmering
        float fw = max(fwidth(cell.x), fwidth(cell.y));
        float aa = 1.0 - smoothstep(0.6, 1.5, fw);
        float winAvg = (1.0 - 2.0 * P.z) * (top - P.w);
        win = mix(winAvg, win, aa);
        if (v < 0.6) win = 0.0;
        vec3 glass = mix(vec3(0.1, 0.13, 0.17), uSky * 0.75 + vec3(0.04), 0.35 + 0.3 * h21(id + vSt2.y));
        float ga = style < 0.5 ? 0.85 : 0.92;
        col = mix(col, glass, win * ga);
        if (style < 0.5) col = mix(col, vCol * 0.55, (1.0 - win) * 0.4);
        float lr = h21(id * 1.37 + vSt2.y);
        float frac = (style < 1.5 ? 0.42 : 0.55) * (0.45 + 0.9 * h21(vec2(vSt2.y, 7.0)));
        float on = mix(frac * 0.55, step(1.0 - frac, lr), aa) * vSt.y;
        glow = win * on;
      }
      // top faces: roofs read a little darker, snow settles
      float up = step(0.55, n.y);
      col *= mix(1.0, 0.86, up * step(style, 5.5));
      // ground-contact darkening
      col *= 0.62 + 0.38 * smoothstep(0.0, 10.0, v);
      // damage: scorch streaks and broken windows
      float dm = vSt.x;
      float ptch = side > 0.5 && style < 5.5 ? h21(floor(id * vec2(0.25, 0.2)) + vSt2.y * 1.7) : h21(vec2(floor((vW.x + vW.z) * 0.12), floor(v * 0.1)) + vSt2.y);
      float soot = step(ptch, smoothstep(0.32, 1.0, dm)) * 0.85 + smoothstep(0.6, 1.0, dm) * 0.5;
      col = mix(col, vec3(0.06, 0.055, 0.05), clamp(soot, 0.0, 0.95));
      glow *= 1.0 - smoothstep(0.3, 0.6, dm);
      // tints
      float tint = vSt2.w;
      if (tint > 0.0) col = mix(col, vec3(1.0, 0.82, 0.36), tint * 0.45);
      if (tint < 0.0) col = mix(col, vec3(0.42, 0.55, 0.22), -tint * 0.5);
      col = mix(col, vec3(0.93, 0.95, 0.98), vSt.z * (up * 0.95 + side * 0.18));
      vec3 c = lit(col, n);
      // night lights
      vec3 lc = mix(vec3(1.0, 0.78, 0.45), vec3(0.75, 0.85, 1.0), step(0.7, h21(id + 3.1 + vSt2.y)));
      c += glow * lc * uNight * 0.95;
      // fire
      float fi = vSt.w;
      if (fi > 0.0) {
        float fl = 0.65 + 0.35 * sin(uTime * 13.0 + id.x * 2.1 + id.y * 3.7 + vW.y * 0.3);
        c += vec3(1.0, 0.42, 0.08) * fi * fl * (0.15 + 1.4 * win + 0.3 * (1.0 - side)) * (0.25 + 0.95 * uNight);
      }
      if (tint > 0.0) c += vec3(0.9, 0.7, 0.25) * tint * (0.12 + 0.3 * glow);
      gl_FragColor = vec4(fogit(c, vW), 1.0);
    }`,
});

// ---------- unit shapes (base at y = 0, 1 m wide) ----------
function roofGeo() {
  const p = [], n = [];
  const tri = (a, b, c) => { p.push(...a, ...b, ...c); const u = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), w = new V3(c[0] - a[0], c[1] - a[1], c[2] - a[2]); const nn = u.cross(w).normalize(); for (let k = 0; k < 3; k++) n.push(nn.x, nn.y, nn.z); };
  const A = [-0.5, 0, -0.5], B = [-0.5, 0, 0.5], C = [-0.5, 1, 0], D = [0.5, 0, -0.5], E = [0.5, 0, 0.5], F = [0.5, 1, 0];
  tri(A, B, C); tri(E, D, F); // gable ends
  tri(B, E, F); tri(B, F, C); // south slope
  tri(D, A, C); tri(D, C, F); // north slope
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  return g;
}
function rubbleGeo() {
  const g = new THREE.SphereGeometry(0.5, 9, 4, 0, TAU, 0, Math.PI / 2).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.75 + 0.5 * hash2(Math.round(x * 40), Math.round(z * 40), Math.round(y * 40));
    p.setXYZ(i, x * (y > 0.01 ? k : 1), y * 2 * k, z * (y > 0.01 ? k : 1));
  }
  g.computeVertexNormals();
  return g;
}
const SHAPES = {};
function makeShapes() {
  SHAPES.box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  SHAPES.roof = roofGeo();
  SHAPES.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14).translate(0, 0.5, 0);
  SHAPES.cone = new THREE.ConeGeometry(0.5, 1, 8).translate(0, 0.5, 0);
  SHAPES.dome = new THREE.SphereGeometry(0.5, 14, 6, 0, TAU, 0, Math.PI / 2).scale(1, 2, 1);
  SHAPES.rubble = rubbleGeo();
  SHAPES.blob = new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0);
  SHAPES.trunk = new THREE.CylinderGeometry(0.35, 0.5, 1, 5).translate(0, 0.5, 0);
}

// ---------- instanced batches ----------
const _m = new THREE.Matrix4(), _mb = new THREE.Matrix4(), _mt = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _s4 = new V3(), _p4 = new V3(), _ax = new V3();
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
class Batch {
  constructor(geo, cap) {
    this.geo = geo.clone(); this.cap = cap; this.n = 0;
    const mk = (k, sz) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * sz), sz); a.setUsage(THREE.DynamicDrawUsage); this.geo.setAttribute(k, a); return a; };
    this.aCol = mk('aCol', 3); this.aSt = mk('aSt', 4); this.aSt2 = mk('aSt2', 4);
    this.mesh = new THREE.InstancedMesh(this.geo, BMAT, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.frustumCulled = false;
    this.lo = 1e9; this.hi = -1;
  }
  alloc() { if (this.n >= this.cap) return -1; const i = this.n++; this.mesh.count = this.n; this.mesh.setMatrixAt(i, ZERO_M); this.touch(i); return i; }
  touch(i) { if (i < this.lo) this.lo = i; if (i > this.hi) this.hi = i; }
  flush() {
    if (this.hi < 0) return;
    const lo = this.lo, cnt = this.hi - lo + 1;
    const up = (a, sz) => { a.updateRange.offset = lo * sz; a.updateRange.count = cnt * sz; a.needsUpdate = true; };
    up(this.mesh.instanceMatrix, 16); up(this.aCol, 3); up(this.aSt, 4); up(this.aSt2, 4);
    this.lo = 1e9; this.hi = -1;
  }
  dispose() { this.geo.dispose(); }
}
const BAT = {};
const _col = new THREE.Color();
function buildRenderables() {
  for (const k in BAT) { R.scene.remove(BAT[k].mesh); BAT[k].dispose(); delete BAT[k]; }
  const count = { box: 0, roof: 0, cyl: 0, cone: 0, dome: 0 };
  for (const b of W.buildings) for (const p of b.parts) count[p.g]++;
  const extra = { box: 2000 + W.buildings.length * 0.6 | 0, roof: 1500 + count.roof * 0.3 | 0, cyl: 200, cone: 100, dome: 100 };
  for (const k in count) BAT[k] = new Batch(SHAPES[k], count[k] + extra[k]);
  BAT.rubble = new Batch(SHAPES.rubble, W.buildings.length + 2500);
  const nCon = W.trees.filter((t) => t.con).length;
  BAT.trunk = new Batch(SHAPES.trunk, W.trees.length + 8000);
  BAT.blob = new Batch(SHAPES.blob, W.trees.length - nCon + 8000);
  BAT.cone2 = new Batch(SHAPES.cone, nCon + 4000);
  for (const k in BAT) R.scene.add(BAT[k].mesh);
  for (const b of W.buildings) registerBuilding(b);
  for (const t of W.trees) registerTree(t);
}
function registerBuilding(b) {
  for (const p of b.parts) {
    p.i = BAT[p.g].alloc();
    p.m = new THREE.Matrix4().compose(_p4.set(p.x, p.y, p.z), _q4.setFromAxisAngle(_ax.set(0, 1, 0), p.ry || 0), _s4.set(p.sx, p.sy, p.sz));
  }
  b.ri = BAT.rubble.alloc();
  b.rubCol = _col.setHex(b.parts[0] ? b.parts[0].col : 0x888888).lerp(new THREE.Color(0x6a645c), 0.6).getHex();
  bUpdate(b);
}
// writes every part of a building: its matrix (with collapse, tilt and sinking) and its state attributes
function bUpdate(b) {
  const c = b.c, k = 1 - 0.94 * c;
  _q4.setFromAxisAngle(_ax.set(0, 1, 0), b.rot);
  if (b.tilt > 0 && c > 0) { _mt.makeRotationAxis(_ax.set(Math.cos(b.tiltA), 0, Math.sin(b.tiltA)), b.tilt * Math.min(1, c * 1.6)); } else _mt.identity();
  _mb.compose(_p4.set(b.x, b.y - b.sink, b.z), _q4, _s4.set(1, 1, 1)).multiply(_mt).multiply(_m.makeScale(1, k, 1));
  const hidden = b.state >= 2 || b.vis === false;
  const tint = b.gold > 0.01 ? b.gold : b.inf > 0.01 ? -Math.min(1, b.inf * 1.6) : 0;
  for (const p of b.parts) {
    const B = BAT[p.g];
    if (p.i < 0) continue;
    if (hidden) B.mesh.setMatrixAt(p.i, ZERO_M);
    else { _m.multiplyMatrices(_mb, p.m); B.mesh.setMatrixAt(p.i, _m); }
    _col.setHex(p.col);
    B.aCol.setXYZ(p.i, _col.r, _col.g, _col.b);
    B.aSt.setXYZW(p.i, b.dmg, b.power, b.snow, b.fire);
    B.aSt2.setXYZW(p.i, p.st, b.seed, b.y, tint);
    B.touch(p.i);
  }
  // rubble mound
  const RB = BAT.rubble;
  if (b.ri >= 0) {
    if (b.state === 2 || (b.state === 1 && c > 0.3)) {
      const g = b.state === 2 ? 1 : smooth(0.3, 1, c);
      const rh = Math.min(b.h * 0.22, 2.5 + b.h * 0.07) * g + 0.3;
      _m.compose(_p4.set(b.x, b.y - b.sink * 0.8, b.z), _q4, _s4.set(b.w * 1.15 * (b.kind === 'bridge' ? 0.3 : 1), rh, b.d * 1.15));
      RB.mesh.setMatrixAt(b.ri, _m);
    } else RB.mesh.setMatrixAt(b.ri, ZERO_M);
    _col.setHex(b.rubCol);
    RB.aCol.setXYZ(b.ri, _col.r, _col.g, _col.b);
    RB.aSt.setXYZW(b.ri, Math.max(b.dmg * 0.6, b.burnt ? 0.7 : 0), 0, b.snow, b.fire * 0.6);
    RB.aSt2.setXYZW(b.ri, 6, b.seed, b.y, 0);
    RB.touch(b.ri);
  }
}
function registerTree(t) {
  t.ti = BAT.trunk.alloc();
  t.ci = (t.con ? BAT.cone2 : BAT.blob).alloc();
  tUpdate(t);
}
const TREE_GREEN = new THREE.Color(), TREE_BROWN = new THREE.Color(0x7a5a2a), TREE_BLACK = new THREE.Color(0x141210), TREE_GOLD = new THREE.Color(0xd8b040);
function tUpdate(t) {
  if (t.ti < 0 || t.ci < 0) return;
  const s = t.s, burnt = t.state === 2, gone = t.state === 3;
  _q4.setFromAxisAngle(_ax.set(Math.cos(t.fallA), 0, Math.sin(t.fallA)), t.fall * Math.PI * 0.48);
  const TB = BAT.trunk, CB = t.con ? BAT.cone2 : BAT.blob;
  if (gone) { TB.mesh.setMatrixAt(t.ti, ZERO_M); CB.mesh.setMatrixAt(t.ci, ZERO_M); }
  else {
    const th = (t.con ? 1.6 : 2.4) * s;
    _mb.compose(_p4.set(t.x, t.y - 0.2, t.z), _q4, _s4.set(1, 1, 1));
    _m.multiplyMatrices(_mb, _mt.makeScale(0.45 * s, th + (burnt ? 1.2 * s : 0), 0.45 * s)); TB.mesh.setMatrixAt(t.ti, _m);
    const leaf = burnt ? 0 : 0.35 + 0.65 * t.leaf;
    if (leaf <= 0.01) CB.mesh.setMatrixAt(t.ci, ZERO_M);
    else {
      _mt.compose(_p4.set(0, th * 0.82, 0), _q4.identity(), t.con ? _s4.set(3.6 * s * leaf, 8 * s * (0.6 + 0.4 * leaf), 3.6 * s * leaf) : _s4.set(4.6 * s * leaf, 4.2 * s * leaf, 4.6 * s * leaf));
      _m.multiplyMatrices(_mb, _mt); CB.mesh.setMatrixAt(t.ci, _m);
    }
  }
  const bio = W.biome;
  TREE_GREEN.setRGB(bio.forest[0] * (t.con ? 0.9 : 1.15), bio.forest[1] * (t.con ? 1.0 : 1.2), bio.forest[2] * (t.con ? 1.0 : 1.05));
  TREE_GREEN.offsetHSL((hash2(t.id, 3) - 0.5) * 0.04, 0, (hash2(t.id, 5) - 0.5) * 0.1);
  _col.copy(TREE_GREEN).lerp(TREE_BROWN, 1 - t.leaf).lerp(TREE_GOLD, t.gold * 0.6);
  if (burnt) _col.copy(TREE_BLACK);
  CB.aCol.setXYZ(t.ci, _col.r, _col.g, _col.b);
  CB.aSt.setXYZW(t.ci, 0, 0, t.snow, t.burn);
  CB.aSt2.setXYZW(t.ci, 6, t.id, t.y, 0);
  CB.touch(t.ci);
  _col.setHex(burnt ? 0x141210 : 0x5a4030);
  TB.aCol.setXYZ(t.ti, _col.r, _col.g, _col.b);
  TB.aSt.setXYZW(t.ti, 0, 0, t.snow * 0.5, t.burn);
  TB.aSt2.setXYZW(t.ti, 6, t.id, t.y, 0);
  TB.touch(t.ti);
}
// every instanced batch uploads what changed this frame: buildings and trees (BAT), traffic and flying debris
function flushBatches() {
  for (const k in BAT) BAT[k].flush();
  for (const b of [TR.body, TR.cab, TR.ped, FX.deb]) if (b) b.flush();
}

// ---------- spatial hash for buildings and trees ----------
const SH = { cell: 50, n: 0, b: null, t: null };
function buildHash() {
  SH.n = Math.ceil(W.M / SH.cell) + 1;
  SH.b = Array.from({ length: SH.n * SH.n }, () => []);
  SH.t = Array.from({ length: SH.n * SH.n }, () => []);
  for (const b of W.buildings) hashAddB(b);
  for (const t of W.trees) hashAddT(t);
}
const shk = (x, z) => clamp(Math.floor(z / SH.cell), 0, SH.n - 1) * SH.n + clamp(Math.floor(x / SH.cell), 0, SH.n - 1);
function hashAddB(b) { SH.b[shk(b.x, b.z)].push(b); }
function hashAddT(t) { SH.t[shk(t.x, t.z)].push(t); }
// calls fn(b, d) for every building whose centre is within r of (x, z)
function forBuildings(x, z, r, fn) {
  const c = SH.cell, i0 = clamp(Math.floor((x - r - 40) / c), 0, SH.n - 1), i1 = clamp(Math.floor((x + r + 40) / c), 0, SH.n - 1);
  const j0 = clamp(Math.floor((z - r - 40) / c), 0, SH.n - 1), j1 = clamp(Math.floor((z + r + 40) / c), 0, SH.n - 1);
  const r2 = r * r;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const b of SH.b[j * SH.n + i]) {
    const pad = Math.max(b.w, b.d) * 0.5;
    const d2 = dist2(b.x, b.z, x, z);
    if (d2 <= (r + pad) * (r + pad)) fn(b, Math.max(0, Math.sqrt(d2) - pad * 0.5));
  }
}
function forTrees(x, z, r, fn) {
  const c = SH.cell, i0 = clamp(Math.floor((x - r) / c), 0, SH.n - 1), i1 = clamp(Math.floor((x + r) / c), 0, SH.n - 1);
  const j0 = clamp(Math.floor((z - r) / c), 0, SH.n - 1), j1 = clamp(Math.floor((z + r) / c), 0, SH.n - 1);
  const r2 = r * r;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const t of SH.t[j * SH.n + i]) { const d2 = dist2(t.x, t.z, x, z); if (d2 <= r2) fn(t, Math.sqrt(d2)); }
}
// the building whose footprint contains (x, z), or null
function buildingAt(x, z) {
  let best = null;
  forBuildings(x, z, 30, (b) => {
    if (b.state >= 2 || b.kind === 'bridge') return;
    const c = Math.cos(b.rot), s = Math.sin(b.rot), dx = x - b.x, dz = z - b.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) <= b.w / 2 + 1 && Math.abs(lz) <= b.d / 2 + 1 && (!best || b.h > best.h)) best = b;
  });
  return best;
}
// re-seat a building on the terrain after the ground moved under it
function reseat(b) {
  const hw = b.w / 2, hd = b.d / 2, c = Math.cos(b.rot), s = Math.sin(b.rot);
  let lo = 1e9, hi = -1e9;
  for (const [a, e] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd], [0, 0]]) { const hh = heightAt(b.x + a * c + e * s, b.z - a * s + e * c); lo = Math.min(lo, hh); hi = Math.max(hi, hh); }
  const oldY = b.y;
  b.y = lo - 0.3;
  return { dy: b.y - oldY, relief: hi - lo };
}
