// ---- 07_models: procedural capital ships and small craft ----
// A model is built once per class and team from boxes, wedges and cylinders, merged into one geometry per
// section (bow and stern, so a dying ship can break in two). The builder also records where the guns,
// engines, subsystems, hangar and beacons are, and a few oriented boxes used for hit tests.
const Models = { cache: {} };
const PALETTE = [
  { base: 0x858c95, dark: 0x535a64, deep: 0x30353c, accent: 0x4a6ea8, stripe: 0x2f4f86, glass: 0xbfe6ff, engine: [0.45, 0.75, 1], win: 0xd8ecff, light: 0x9fd8ff },
  { base: 0xa38d69, dark: 0x6b5944, deep: 0x40362b, accent: 0x9a3a2a, stripe: 0x7a2418, glass: 0xffd9a0, engine: [1, 0.55, 0.25], win: 0xffd8a0, light: 0xffa060 },
];

function panelTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d'), r = modelRng(11);
  x.fillStyle = '#c9c9c9'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const w = 16 + (r() * 6 | 0) * 16, h = 16 + (r() * 4 | 0) * 16, px = (r() * 32 | 0) * 16, py = (r() * 32 | 0) * 16, v = 175 + r() * 60 | 0;
    x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(px, py, w, h);
  }
  x.strokeStyle = 'rgba(60,60,60,.55)'; x.lineWidth = 1.2;
  for (let i = 0; i < 120; i++) { const px = (r() * 32 | 0) * 16 + 0.5, py = (r() * 32 | 0) * 16 + 0.5; x.strokeRect(px, py, 16 + (r() * 5 | 0) * 16, 16 + (r() * 3 | 0) * 16); }
  x.fillStyle = 'rgba(40,40,40,.6)';
  for (let i = 0; i < 60; i++) { const px = r() * 512, py = r() * 512; for (let k = 0; k < 6; k++) x.fillRect(px + k * 5, py, 2, 2); }
  x.fillStyle = 'rgba(255,255,255,.25)';
  for (let i = 0; i < 40; i++) x.fillRect(r() * 512, r() * 512, 30 + r() * 60, 3);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.encoding = THREE.sRGBEncoding;
  return t;
}
function windowTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32; const x = cv.getContext('2d'), r = modelRng(5);
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 32);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 32; i++) {
    if (r() < 0.35) continue; const v = 0.6 + r() * 0.4;
    x.fillStyle = `rgba(255,255,255,${v})`; x.fillRect(i * 8 + 2, row * 16 + 4, 4, 7);
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding;
  return t;
}
Models.init = function () {
  Models.hullMat = new THREE.MeshPhongMaterial({ vertexColors: true, map: panelTexture(), specular: 0x2a2a2a, shininess: 22 });
  Models.lightMat = new THREE.MeshBasicMaterial({ vertexColors: true, map: windowTexture() });
  Models.flatMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  Models.craftMat = new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x333333, shininess: 30 });
};

// ---- Geometry helpers ----
// A box whose front (+z) face is scaled by tx, ty and raised by oy (fraction of height); back face by bx, by.
function boxGeo(sx, sy, sz, o) {
  const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(), p = g.attributes.position;
  if (o && (o.yt != null || o.yb != null)) {
    // Chamfer: narrow the top (yt) or bottom (yb) edge, for slanted hull sides.
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (p.getY(i) > 0 ? (o.yt != null ? o.yt : 1) : (o.yb != null ? o.yb : 1)));
  }
  if (o && (o.tx != null || o.ty != null || o.bx != null || o.by != null || o.oy)) {
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      if (z > 0) { p.setX(i, p.getX(i) * (o.tx != null ? o.tx : 1)); p.setY(i, p.getY(i) * (o.ty != null ? o.ty : 1) + (o.oy || 0) * sy); }
      else { p.setX(i, p.getX(i) * (o.bx != null ? o.bx : 1)); p.setY(i, p.getY(i) * (o.by != null ? o.by : 1) + (o.ob || 0) * sy); }
    }
  }
  g.computeVertexNormals();
  return g;
}
function cylGeo(r1, r2, len, seg) { const g = new THREE.CylinderGeometry(r2, r1, len, seg || 10, 1).toNonIndexed(); g.rotateX(Math.PI / 2); g.computeVertexNormals(); return g; }
function sphereGeo(r, half) { const g = new THREE.SphereGeometry(r, 14, half ? 6 : 10, 0, TAU, 0, half ? Math.PI / 2 : Math.PI).toNonIndexed(); g.computeVertexNormals(); return g; }

// Merge parts into one geometry with vertex colours and box-projected UVs (so the panel texture has the same
// scale on every surface). Positions are recentred on c.
function mergeParts(parts, uvScale, c) {
  let n = 0; for (const q of parts) n += q.geo.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const q of parts) {
    const p = q.geo.attributes.position, nm = q.geo.attributes.normal, cnt = p.count;
    for (let i = 0; i < cnt; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = (o + i) * 3;
      pos[k] = x - c.x; pos[k + 1] = y - c.y; pos[k + 2] = z - c.z;
      const nx = nm.getX(i), ny = nm.getY(i), nz = nm.getZ(i);
      nor[k] = nx; nor[k + 1] = ny; nor[k + 2] = nz;
      col[k] = q.col.r; col[k + 1] = q.col.g; col[k + 2] = q.col.b;
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), u = (o + i) * 2;
      if (ax >= ay && ax >= az) { uv[u] = z / uvScale; uv[u + 1] = y / uvScale; }
      else if (ay >= az) { uv[u] = z / uvScale; uv[u + 1] = x / uvScale; }
      else { uv[u] = x / uvScale; uv[u + 1] = y / uvScale; }
    }
    o += cnt;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

class ShipBuilder {
  constructor(seed, team, L) {
    this.r = modelRng(seed); this.team = team; this.P = PALETTE[team]; this.L = L;
    this.parts = []; this.lit = []; this.colliders = []; this.subs = {}; this.guns = { port: [], stbd: [], bow: [] };
    this.tubes = []; this.nozzles = []; this.beacons = []; this.hangar = null; this.split = 0;
  }
  color(c, j) { const col = new THREE.Color(c); const k = 1 + (this.r() - 0.5) * (j == null ? 0.12 : j); col.r *= k; col.g *= k; col.b *= k; return col; }
  add(geo, col, x, y, z, o) {
    o = o || {};
    if (o.rx || o.ry || o.rz) { const e = new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0); geo.applyMatrix4(new M4().makeRotationFromEuler(e)); }
    geo.translate(x, y, z);
    const sec = o.sec != null ? o.sec : (z >= this.split ? 0 : 1);
    (o.lit ? this.lit : this.parts).push({ geo, col: o.raw ? new THREE.Color(col) : this.color(col, o.j), sec });
    return geo;
  }
  box(x, y, z, sx, sy, sz, col, o) {
    this.add(boxGeo(sx, sy, sz, o), col, x, y, z, o);
    if (o && o.collide) this.colliders.push({ c: new V3(x, y, z), h: new V3(sx / 2, sy / 2, sz / 2) });
  }
  // Mirrored pair across the centreline.
  pair(x, y, z, sx, sy, sz, col, o) { this.box(x, y, z, sx, sy, sz, col, o); this.box(-x, y, z, sx, sy, sz, col, o); }
  cyl(x, y, z, r1, r2, len, col, o) { this.add(cylGeo(r1, r2, len, o && o.seg), col, x, y, z, o); }
  dome(x, y, z, r, col, o) { this.add(sphereGeo(r, true), col, x, y, z, o); }
  win(x, y, z, sx, sy, sz, col) { this.add(boxGeo(sx, sy, sz), col || this.P.win, x, y, z, { lit: true, raw: true }); }
  sub(type, x, y, z, r) { this.subs[type] = { p: new V3(x, y, z), r }; }
  turret(side, x, y, z, s) {
    // A gun house with twin barrels; side is 'port' (+x), 'stbd' (-x) or 'bow'. Guns point outward.
    const P = this.P, sg = side === 'stbd' ? -1 : 1;
    this.box(x, y, z, s * 1.6, s * 0.7, s * 1.8, P.dark);
    this.dome(x, y + s * 0.3, z, s * 0.7, P.base);
    if (side === 'bow') { for (const k of [-1, 1]) this.box(x + k * s * 0.3, y + s * 0.4, z + s * 1.6, s * 0.18, s * 0.18, s * 2.4, P.deep); }
    else for (const k of [-1, 1]) this.box(x + sg * s * 1.4, y + s * 0.4, z + k * s * 0.35, s * 2.2, s * 0.18, s * 0.18, P.deep);
    this.guns[side].push(new V3(side === 'bow' ? x : x + sg * s * 2.2, y + s * 0.4, side === 'bow' ? z + s * 2.6 : z));
  }
  greeble(x0, x1, y, z0, z1, n, sz) {
    const P = this.P;
    for (let i = 0; i < n; i++) {
      const s = sz * (0.4 + this.r() * 1.2), x = lerp(x0, x1, this.r()), z = lerp(z0, z1, this.r()), h = s * (0.25 + this.r() * 0.8);
      this.box(x, y + h / 2, z, s * (0.5 + this.r()), h, s * (0.6 + this.r() * 1.8), this.r() < 0.75 ? P.base : P.dark);
    }
  }
  nozzle(x, y, z, r) {
    const P = this.P;
    this.cyl(x, y, z, r * 1.1, r * 0.85, r * 1.6, P.deep, { seg: 12 });
    this.add(cylGeo(r * 0.8, r * 0.8, 0.4, 12), new THREE.Color(P.engine[0] * 0.8, P.engine[1] * 0.8, P.engine[2] * 0.8), x, y, z - r * 0.82, { lit: true, raw: true });
    this.nozzles.push({ p: new V3(x, y, z - r * 0.9), r });
  }
  beacon(x, y, z, col, blink) { this.beacons.push({ p: new V3(x, y, z), col: new THREE.Color(col), blink: blink || 0 }); }
  finish() {
    const secs = [0, 1].map((s) => {
      const parts = this.parts.filter((q) => q.sec === s), lit = this.lit.filter((q) => q.sec === s);
      const box = new THREE.Box3(); for (const q of parts) { q.geo.computeBoundingBox(); box.union(q.geo.boundingBox); }
      const c = box.isEmpty() ? new V3() : box.getCenter(new V3());
      return { c, geo: parts.length ? mergeParts(parts, 28, c) : null, lit: lit.length ? mergeParts(lit, 16, c) : null };
    });
    const all = new THREE.Box3(); for (const q of this.parts) all.union(q.geo.boundingBox);
    const half = all.getSize(new V3()).multiplyScalar(0.5), centre = all.getCenter(new V3());
    for (const q of this.parts.concat(this.lit)) q.geo.dispose();
    // Every subsystem is also a hit box, so a shot aimed at a bridge tower or a dome lands on it.
    for (const k in this.subs) { const s = this.subs[k]; if (s.r > 2) this.colliders.push({ c: s.p.clone(), h: new V3(s.r * 0.55, s.r * 0.55, s.r * 0.55), sub: k }); }
    return { split: this.split, secs, colliders: this.colliders, subs: this.subs, guns: this.guns, tubes: this.tubes, nozzles: this.nozzles, beacons: this.beacons,
      hangar: this.hangar, half, centre, radius: half.length() };
  }
}

// ---- Concord: long grey daggers with a stepped dorsal superstructure and the bridge aft ----
function buildConcord(cls, L) {
  const C = CLASSES[cls], b = new ShipBuilder(cls.length * 31 + 1, 0, L), P = b.P;
  const pr = { corvette: [0.2, 0.09, 1, 2], frigate: [0.2, 0.082, 1, 3], cruiser: [0.21, 0.08, 2, 3], heavy: [0.22, 0.085, 2, 4],
    battleship: [0.24, 0.09, 3, 5], battlecruiser: [0.19, 0.078, 3, 4], dreadnought: [0.22, 0.09, 3, 6], carrier: [0.3, 0.08, 1, 4] }[cls] || [0.2, 0.08, 2, 3];
  const W = L * pr[0], H = L * pr[1], steps = pr[2];
  b.split = -0.06 * L;
  // Main hull: a wedge that narrows to a blade at the bow.
  b.box(0, H * 0.15, 0, W, H * 0.7, L * 0.86, P.base, { tx: 0.12, ty: 0.5, oy: -0.12, bx: 0.9, yt: 0.86, collide: true });
  b.box(0, -H * 0.42, -0.01 * L, W * 0.98, H * 0.45, L * 0.82, P.dark, { tx: 0.1, bx: 0.88, yb: 0.42, ty: 0.6 });
  b.box(0, -H * 0.78, -0.08 * L, W * 0.36, H * 0.35, L * 0.56, P.deep, { tx: 0.2, ty: 0.4, yb: 0.6, collide: true });
  for (const k of [-1, 1]) b.box(k * W * 0.47, H * 0.08, -0.05 * L, W * 0.05, H * 0.12, L * 0.62, P.deep, { tx: 0.3 });
  b.box(0, H * 0.5 + 0.4, 0.12 * L, W * 0.07, 0.8, L * 0.42, P.stripe, { tx: 0.4, raw: true });
  for (const k of [-1, 1]) b.box(k * W * 0.3, H * 0.5 + 0.3, 0.2 * L, W * 0.04, 0.6, L * 0.22, P.accent, { tx: 0.3 });
  // Stepped superstructure toward the stern.
  let top = H * 0.5;
  for (let s = 0; s < steps; s++) {
    const sw = W * (0.6 - s * 0.14), sh = H * (0.55 - s * 0.08), sl = L * (0.5 - s * 0.12), sz = -0.08 * L - s * 0.06 * L;
    b.box(0, top + sh / 2, sz, sw, sh, sl, s % 2 ? P.dark : P.base, { tx: 0.45, yt: 0.82, collide: true });
    for (let row = 0; row < 2; row++) for (const k of [-1, 1]) b.win(k * (sw / 2 + 0.15), top + sh * (0.3 + row * 0.35), sz - sl * 0.05, 0.3, 1.2, sl * 0.7);
    b.greeble(-sw * 0.4, sw * 0.4, top + sh, sz - sl * 0.4, sz + sl * 0.3, 6 + (L / 60 | 0), L * 0.012);
    top += sh;
  }
  // Bridge tower near the stern.
  const bz = -0.3 * L, neckH = H * 0.7;
  b.box(0, top + neckH / 2, bz, W * 0.1, neckH, L * 0.06, P.dark);
  const bw = W * (cls === 'corvette' ? 0.5 : 0.42), bh = H * 0.28;
  b.box(0, top + neckH + bh / 2, bz, bw, bh, L * 0.055, P.base, { tx: 0.8 });
  b.win(0, top + neckH + bh * 0.5, bz + L * 0.028, bw * 0.8, bh * 0.35, 0.3, P.glass);
  b.sub('bridge', 0, top + neckH + bh / 2, bz, Math.max(W * 0.22, 14));
  b.beacon(0, top + neckH + bh + 3, bz, 0xffffff, 1.3);
  for (const k of [-1, 1]) b.box(k * W * 0.12, top + neckH + bh + L * 0.02, bz - L * 0.01, 1.2, L * 0.04, 1.2, P.deep);
  // Shield generator dome ahead of the bridge.
  const sgR = W * 0.14;
  b.dome(0, top, bz + L * 0.12, sgR, P.base); b.dome(0, top, bz + L * 0.12, sgR * 0.55, P.accent);
  b.sub('shields', 0, top + sgR * 0.4, bz + L * 0.12, sgR * 1.2);
  // Engine block and nozzles.
  b.box(0, 0, -0.47 * L, W * 0.78, H * 1.15, L * 0.08, P.dark, { collide: true });
  const nz = pr[3], nr = Math.min(H * 0.38, W * 0.78 / (nz * 2.3));
  for (let i = 0; i < nz; i++) {
    const x = (i - (nz - 1) / 2) * nr * 2.3, y = (nz > 3 && i % 2) ? -H * 0.2 : H * 0.08;
    b.nozzle(x, y, -0.51 * L - nr * 0.2, nr);
  }
  b.sub('engines', 0, 0, -0.49 * L, Math.max(W * 0.45, 18));
  // Broadside sponsons with the gun houses.
  const sideGuns = C.side ? C.side.guns : 0, sp = W * 0.16;
  if (sideGuns) {
    const rows = sideGuns > 8 ? 2 : 1, perRow = Math.ceil(sideGuns / rows);
    for (const k of [1, -1]) {
      const side = k > 0 ? 'port' : 'stbd';
      b.box(k * (W * 0.47 + sp / 2), -H * 0.05, -0.04 * L, sp, H * 0.5, L * 0.5, P.dark, { tx: 0.5, yb: 0.6, collide: true });
      let placed = 0;
      for (let row = 0; row < rows; row++) for (let i = 0; i < perRow && placed < sideGuns; i++, placed++) {
        const z = lerp(-0.26 * L, 0.18 * L, perRow > 1 ? i / (perRow - 1) : 0.5), gs = Math.max(L * 0.011, 3.2);
        if (row === 0) b.turret(side, k * (W * 0.47 + sp * 0.6), H * 0.2 + gs * 0.35, z, gs);
        else b.turret(side, k * (W * 0.3), top - H * 0.05, z - 0.06 * L, gs);
      }
      b.sub(side, k * (W * 0.5 + sp / 2), 0, -0.04 * L, Math.max(L * 0.13, 20));
      b.beacon(k * (W * 0.5 + sp), 0, 0.2 * L, k > 0 ? 0xff3030 : 0x30ff60, 0);
    }
  }
  if (C.bow) for (let i = 0; i < C.bow.guns; i++) { const gs = Math.max(L * 0.01, 3); b.turret('bow', (i - (C.bow.guns - 1) / 2) * W * 0.12, H * 0.5 + gs * 0.35, 0.14 * L + (i % 2) * 6, gs); }
  if (C.torps) for (let i = 0; i < C.torps; i++) { const x = (i - (C.torps - 1) / 2) * W * 0.045; b.tubes.push(new V3(x, -H * 0.2, 0.36 * L)); b.box(x, -H * 0.2, 0.33 * L, 3, 3, 6, P.deep); }
  // Ventral hangar: a lit mouth under the keel.
  if (C.hangar.length) {
    const hz = 0.06 * L;
    b.box(0, -H * 0.9, hz, W * 0.4, H * 0.12, L * 0.16, P.deep);
    b.win(0, -H * 0.97, hz, W * 0.34, 0.4, L * 0.13, 0x6fa8d8);
    b.hangar = { p: new V3(0, -H * 1.1, hz), dir: new V3(0, -0.6, 0.8).normalize() };
    b.sub('hangar', 0, -H * 0.85, hz, Math.max(W * 0.3, 16));
  }
  if (cls === 'carrier') {
    for (const k of [-1, 1]) { b.box(k * W * 0.52, 0, 0.02 * L, W * 0.06, H * 0.9, L * 0.5, P.dark, { collide: true }); b.win(k * W * 0.555, 0, 0.02 * L, 0.3, H * 0.5, L * 0.42, 0x8ac8ff); }
  }
  b.greeble(-W * 0.25, W * 0.25, H * 0.5, 0.05 * L, 0.3 * L, 10 + (L / 40 | 0), L * 0.01);
  for (const k of [-1, 1]) b.win(k * (W * 0.42), H * 0.1, 0.1 * L, 0.3, 1.2, L * 0.25);
  b.beacon(0, H * 0.2, 0.44 * L, 0xffffff, 0.9);
  return b.finish();
}

// ---- Hegemony: sand-coloured hulls with a broad hammerhead bow, the bridge forward, engines on outriggers ----
function buildHegemony(cls, L) {
  const C = CLASSES[cls], b = new ShipBuilder(cls.length * 47 + 3, 1, L), P = b.P;
  const pr = { corvette: [0.17, 0.1, 1, 1], frigate: [0.17, 0.095, 1, 1], cruiser: [0.18, 0.1, 2, 1], heavy: [0.19, 0.1, 2, 2],
    battleship: [0.2, 0.11, 2, 2], battlecruiser: [0.17, 0.095, 2, 2], dreadnought: [0.19, 0.11, 3, 2], carrier: [0.16, 0.1, 1, 1] }[cls] || [0.18, 0.1, 2, 1];
  const W = L * pr[0], H = L * pr[1], tiers = pr[2], pods = pr[3];
  b.split = 0.02 * L;
  const twin = cls === 'carrier';
  if (twin) {
    for (const k of [-1, 1]) {
      b.box(k * W * 0.85, 0, -0.02 * L, W * 0.9, H, L * 0.86, P.base, { tx: 0.6, ty: 0.7, collide: true });
      b.box(k * W * 0.85, H * 0.55, -0.1 * L, W * 0.5, H * 0.3, L * 0.5, P.dark, { tx: 0.6 });
      b.win(k * (W * 0.85 + W * 0.45 + 0.1), 0, 0, 0.3, 1.4, L * 0.6);
    }
    b.box(0, H * 0.1, -0.05 * L, W * 0.9, H * 0.4, L * 0.55, P.dark, { collide: true });
    b.box(0, -H * 0.1, 0.06 * L, W * 0.75, H * 0.25, L * 0.4, P.deep);
    b.win(0, -H * 0.24, 0.06 * L, W * 0.7, 0.4, L * 0.36, 0xffb070);
  } else {
    b.box(0, 0, -0.06 * L, W, H, L * 0.78, P.base, { bx: 0.85, by: 0.85, yb: 0.72, yt: 0.9, collide: true });
    // Hammerhead: a broad armoured bow block with red bands.
    b.box(0, H * 0.08, 0.38 * L, W * 1.4, H * 1.35, L * 0.15, P.base, { tx: 0.75, ty: 0.65, yt: 0.85, yb: 0.8, collide: true });
    b.box(0, H * 0.08, 0.31 * L + 1, W * 1.42, H * 0.3, L * 0.03, P.stripe, { raw: true });
    for (const k of [-1, 1]) b.box(k * W * 0.6, H * 0.08, 0.42 * L, W * 0.18, H * 1.0, L * 0.08, P.dark, { tx: 0.5 });
    b.box(0, -H * 0.85, -0.12 * L, W * 0.14, H * 0.8, L * 0.5, P.dark, { tx: 0.3, ty: 0.3 });
  }
  // Dorsal tiers.
  let top = H * 0.5;
  for (let s = 0; s < tiers; s++) {
    const sw = (twin ? W * 0.7 : W * 0.55) - s * W * 0.12, sh = H * (0.5 - s * 0.08), sl = L * (0.55 - s * 0.14), sz = -0.06 * L - s * 0.03 * L;
    b.box(0, top + sh / 2, sz, sw, sh, sl, s % 2 ? P.dark : P.base, { tx: 0.7, bx: 0.8, yt: 0.8, collide: true });
    for (const k of [-1, 1]) b.win(k * (sw / 2 + 0.15), top + sh * 0.5, sz, 0.3, 1.2, sl * 0.7);
    b.greeble(-sw * 0.4, sw * 0.4, top + sh, sz - sl * 0.4, sz + sl * 0.35, 5 + (L / 70 | 0), L * 0.012);
    top += sh;
  }
  // Bridge forward on a short neck.
  const bz = 0.16 * L, bw = W * 0.5, bh = H * 0.3;
  b.box(0, top + H * 0.2, bz, W * 0.16, H * 0.4, L * 0.05, P.dark);
  b.box(0, top + H * 0.4 + bh / 2, bz, bw, bh, L * 0.07, P.base, { tx: 0.6, ty: 0.7 });
  b.win(0, top + H * 0.4 + bh * 0.5, bz + L * 0.034, bw * 0.55, bh * 0.3, 0.3, P.glass);
  b.sub('bridge', 0, top + H * 0.4 + bh / 2, bz, Math.max(W * 0.25, 14));
  b.beacon(0, top + H * 0.4 + bh + 3, bz, 0xffffff, 1.1);
  // Twin shield domes aft.
  const sgR = W * 0.13;
  for (const k of [-1, 1]) { b.dome(k * W * 0.2, top, -0.28 * L, sgR, P.dark); b.dome(k * W * 0.2, top, -0.28 * L, sgR * 0.6, P.accent); }
  b.sub('shields', 0, top + sgR * 0.3, -0.28 * L, W * 0.36);
  // Engine outriggers on pylons.
  const podR = H * 0.36, podL = L * 0.26;
  for (let pI = 0; pI < pods; pI++) for (const k of [-1, 1]) {
    const x = k * (twin ? W * 0.85 : W * (0.72 + pI * 0.38)), y = pods > 1 ? (pI ? -H * 0.35 : H * 0.25) : 0, z = -0.36 * L;
    if (!twin) b.box((x + k * W * 0.3) / 2, y, z + podL * 0.15, Math.abs(x) - W * 0.3, H * 0.18, podL * 0.4, P.dark);
    b.cyl(x, y, z, podR, podR * 0.8, podL, P.base, { seg: 10 });
    b.box(x, y + podR * 0.9, z, podR * 0.5, podR * 0.5, podL * 0.7, P.stripe, { raw: true });
    b.nozzle(x, y, z - podL / 2 - podR * 0.4, podR * 0.85);
    b.colliders.push({ c: new V3(x, y, z), h: new V3(podR, podR, podL / 2) });
  }
  b.sub('engines', 0, 0, -0.42 * L, Math.max(W * (pods > 1 ? 1.25 : 0.95), 20));
  // Gun galleries along the flanks.
  const sideGuns = C.side ? C.side.guns : 0, gx = twin ? W * 1.32 : W * 0.5;
  if (sideGuns) {
    const rows = sideGuns > 9 ? 2 : 1, perRow = Math.ceil(sideGuns / rows);
    for (const k of [1, -1]) {
      const side = k > 0 ? 'port' : 'stbd';
      b.box(k * (gx + W * 0.06), H * 0.15, -0.06 * L, W * 0.12, H * 0.42, L * 0.5, P.dark, { tx: 0.6, collide: true });
      let placed = 0;
      for (let row = 0; row < rows; row++) for (let i = 0; i < perRow && placed < sideGuns; i++, placed++) {
        const z = lerp(-0.28 * L, 0.18 * L, perRow > 1 ? i / (perRow - 1) : 0.5), gs = Math.max(L * 0.011, 3.2);
        b.turret(side, k * (gx + W * 0.1), H * (row ? -0.2 : 0.38) + gs * 0.3, z + row * L * 0.03, gs);
      }
      b.sub(side, k * (gx + W * 0.08), H * 0.1, -0.06 * L, Math.max(L * 0.13, 20));
      b.beacon(k * (twin ? W * 1.3 : W * 0.71), H * 0.1, 0.42 * L, k > 0 ? 0xff3030 : 0x30ff60, 0);
    }
  }
  if (C.bow) for (let i = 0; i < C.bow.guns; i++) { const gs = Math.max(L * 0.01, 3); b.turret('bow', (i - (C.bow.guns - 1) / 2) * W * 0.22, H * 0.82, 0.38 * L + (i % 2) * 5, gs); }
  if (C.torps) for (let i = 0; i < C.torps; i++) b.tubes.push(new V3((i - (C.torps - 1) / 2) * W * 0.15, -H * 0.2, 0.45 * L));
  if (C.hangar.length) {
    const hp = twin ? new V3(0, -H * 0.3, 0.06 * L) : new V3(0, -H * 0.55, 0.36 * L);
    if (!twin) { b.box(0, -H * 0.52, 0.38 * L, W * 0.7, H * 0.18, L * 0.1, P.deep); b.win(0, -H * 0.62, 0.38 * L, W * 0.6, 0.4, L * 0.08, 0xffb070); }
    b.hangar = { p: hp.clone().add(new V3(0, -H * 0.3, 0)), dir: new V3(0, -0.5, 0.86).normalize() };
    b.sub('hangar', hp.x, hp.y, hp.z, Math.max(W * 0.35, 16));
  }
  b.greeble(-W * 0.4, W * 0.4, H * 0.5, -0.4 * L, 0.25 * L, 12 + (L / 40 | 0), L * 0.01);
  for (const k of [-1, 1]) b.win(k * (W * 0.5 + 0.1), -H * 0.15, -0.1 * L, 0.3, 1.2, L * 0.4);
  return b.finish();
}

function buildTransport(team, L) {
  const b = new ShipBuilder(77 + team, team, L), P = b.P, W = L * 0.16, H = L * 0.12;
  b.split = 0;
  b.box(0, 0, 0, W * 0.4, H * 0.4, L * 0.9, P.dark, { collide: true });
  for (let i = 0; i < 6; i++) for (const k of [-1, 1]) for (const j of [-1, 1]) {
    const z = lerp(-0.3 * L, 0.25 * L, i / 5);
    b.box(k * W * 0.35, j * H * 0.32, z, W * 0.5, H * 0.5, L * 0.08, i % 2 ? P.base : (team ? 0x8a7a5a : 0x7a8ea8));
  }
  b.colliders.push({ c: new V3(0, 0, 0), h: new V3(W * 0.6, H * 0.6, L * 0.32) });
  b.box(0, H * 0.25, 0.42 * L, W * 0.6, H * 0.5, L * 0.12, P.base, { tx: 0.6, ty: 0.6, collide: true });
  b.win(0, H * 0.35, 0.48 * L, W * 0.4, H * 0.12, 0.3, P.glass);
  b.sub('bridge', 0, H * 0.3, 0.43 * L, W * 0.4);
  b.box(0, 0, -0.44 * L, W * 0.7, H * 0.7, L * 0.1, P.base);
  for (const k of [-1, 1]) b.nozzle(k * W * 0.2, 0, -0.5 * L, H * 0.18);
  b.sub('engines', 0, 0, -0.45 * L, W * 0.6);
  b.sub('shields', 0, H * 0.3, -0.36 * L, W * 0.4); b.dome(0, H * 0.35, -0.36 * L, W * 0.16, P.accent);
  b.beacon(0, H * 0.6, 0.4 * L, 0xffffff, 1);
  return b.finish();
}

function buildStation(team, L) {
  // A hub with a broken ring of gun platforms, slowly turning.
  const b = new ShipBuilder(91, team, L), P = b.P;
  b.split = -1e9;
  const R0 = L * 0.42;
  b.cyl(0, 0, 0, L * 0.1, L * 0.1, L * 0.22, P.base, { rx: Math.PI / 2, seg: 16, sec: 0 });
  b.colliders.push({ c: new V3(0, 0, 0), h: new V3(L * 0.1, L * 0.11, L * 0.1) });
  b.cyl(0, L * 0.14, 0, L * 0.05, L * 0.08, L * 0.06, P.dark, { rx: Math.PI / 2, seg: 16, sec: 0 });
  b.dome(0, L * 0.17, 0, L * 0.05, P.accent, { sec: 0 });
  b.sub('shields', 0, L * 0.17, 0, L * 0.07);
  b.box(0, L * 0.13, 0, L * 0.08, L * 0.03, L * 0.08, P.base, { sec: 0 });
  b.win(0, L * 0.115, 0, L * 0.085, L * 0.008, L * 0.085, P.glass);
  b.sub('bridge', 0, L * 0.12, 0, L * 0.06);
  b.box(0, -L * 0.14, 0, L * 0.12, L * 0.06, L * 0.12, P.dark, { sec: 0 });
  b.hangar = { p: new V3(0, -L * 0.2, 0), dir: new V3(0, -1, 0) };
  b.sub('hangar', 0, -L * 0.15, 0, L * 0.08);
  b.sub('engines', 0, -L * 0.05, 0, 1);
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a = i / segs * TAU, x = Math.sin(a) * R0, z = Math.cos(a) * R0;
    b.box(x, 0, z, L * 0.2, L * 0.035, L * 0.06, i % 2 ? P.base : P.dark, { ry: a + Math.PI / 2, sec: 0 });
    b.colliders.push({ c: new V3(x, 0, z), h: new V3(L * 0.07, L * 0.03, L * 0.07) });
    b.box(Math.sin(a) * R0 * 0.5, 0, Math.cos(a) * R0 * 0.5, L * 0.015, L * 0.015, R0 * 0.75, P.deep, { ry: a, sec: 0 });
    b.win(x, L * 0.02, z, L * 0.16, 0.4, L * 0.02, P.win);
    const side = Math.sin(a) >= 0 ? 'port' : 'stbd', gs = L * 0.012, tx = Math.sin(a) * (R0 + L * 0.02), tz = Math.cos(a) * (R0 + L * 0.02);
    b.box(tx, L * 0.03, tz, gs * 1.6, gs * 0.7, gs * 1.8, P.dark); b.dome(tx, L * 0.03 + gs * 0.3, tz, gs * 0.8, P.base);
    b.box(tx + Math.sin(a) * gs * 1.4, L * 0.03 + gs * 0.4, tz + Math.cos(a) * gs * 1.4, gs * 0.25, gs * 0.25, gs * 2.6, P.deep, { ry: a });
    b.guns[side].push(new V3(tx + Math.sin(a) * gs * 2.6, L * 0.03 + gs * 0.4, tz + Math.cos(a) * gs * 2.6));
    b.beacon(Math.sin(a) * (R0 + L * 0.1), 0, Math.cos(a) * (R0 + L * 0.1), i % 2 ? 0xff3030 : 0xffffff, 1.5);
  }
  b.sub('port', R0 * 0.7, 0, 0, L * 0.2); b.sub('stbd', -R0 * 0.7, 0, 0, L * 0.2);
  return b.finish();
}

Models.ship = function (cls, team) {
  const key = cls + team;
  if (Models.cache[key]) return Models.cache[key];
  const L = CLASSES[cls].len;
  const m = cls === 'station' ? buildStation(team, L) : cls === 'transport' ? buildTransport(team, L) : team === 0 ? buildConcord(cls, L) : buildHegemony(cls, L);
  Models.cache[key] = m;
  return m;
};

// ---- Small craft: tiny merged models drawn as instanced meshes ----
function buildCraft(type, team) {
  const b = new ShipBuilder(type.length + team * 9, team, 10), P = b.P;
  b.split = -1e9;
  const s = CRAFT[type].len / 14;
  if (type === 'shuttle') {
    b.box(0, 0, 0, 6 * s, 4 * s, 18 * s, P.base, { tx: 0.6, ty: 0.6, sec: 0 });
    b.box(0, 2.6 * s, -2 * s, 1 * s, 3 * s, 6 * s, P.dark, { sec: 0 });
    for (const k of [-1, 1]) b.box(k * 4 * s, -1 * s, -3 * s, 3 * s, 0.6 * s, 8 * s, P.dark, { tx: 0.5, sec: 0 });
  } else if (team === 0) {
    const bm = type === 'bmb';
    b.box(0, 0, 0, (bm ? 3 : 2) * s, (bm ? 2.4 : 1.6) * s, 14 * s, P.base, { tx: 0.25, ty: 0.4, sec: 0 });
    b.box(0, 1 * s, 1.5 * s, 1.2 * s, 0.8 * s, 3 * s, P.glass, { tx: 0.5, sec: 0, raw: true });
    for (const k of [-1, 1]) {
      b.box(k * (bm ? 4.5 : 3.6) * s, 0, -2.5 * s, (bm ? 6 : 5) * s, 0.4 * s, (bm ? 6 : 5) * s, k ? P.dark : P.dark, { tx: 0.3, sec: 0 });
      b.box(k * (bm ? 7.5 : 6) * s, 0, -2 * s, 0.6 * s, 1.6 * s, 4 * s, P.accent, { sec: 0, raw: true });
      if (bm) b.box(k * 2.2 * s, -0.6 * s, -1 * s, 1.4 * s, 1.4 * s, 9 * s, P.dark, { sec: 0 });
    }
  } else {
    const bm = type === 'bmb';
    b.box(0, 0, 0, (bm ? 3.4 : 2.2) * s, (bm ? 2.6 : 1.8) * s, (bm ? 13 : 11) * s, P.base, { tx: 0.4, ty: 0.5, sec: 0 });
    b.box(0, 1.1 * s, 2 * s, 1.4 * s, 0.9 * s, 2.6 * s, P.glass, { sec: 0, raw: true });
    for (const k of [-1, 1]) {
      // Split, forward-raked wings: the Hegemony's craft read as claws.
      b.box(k * 3.2 * s, 0.9 * s, 1 * s, 4.5 * s, 0.4 * s, 3 * s, P.dark, { ry: -k * 0.5, sec: 0 });
      b.box(k * 3.2 * s, -0.9 * s, 1 * s, 4.5 * s, 0.4 * s, 3 * s, P.dark, { ry: -k * 0.5, sec: 0 });
      b.box(k * 5.2 * s, 0, 2.4 * s, 0.5 * s, 2.6 * s, 3 * s, P.accent, { sec: 0, raw: true });
    }
  }
  return b.finish().secs[0].geo;
}
Models.craft = function (type, team) {
  const key = 'c' + type + team;
  if (!Models.cache[key]) Models.cache[key] = buildCraft(type, team);
  return Models.cache[key];
};
