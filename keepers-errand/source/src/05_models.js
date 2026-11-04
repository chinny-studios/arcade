// ---- models: shared materials, a geometry batcher for static scenery, props and animated characters ----
const MAT = {
  vc: null, cache: {},
  init() { this.vc = new THREE.MeshLambertMaterial({ vertexColors: true }); },
  col(hex) { return this.cache[hex] || (this.cache[hex] = new THREE.MeshLambertMaterial({ color: hex })); },
  glow(hex) { const k = 'g' + hex; return this.cache[k] || (this.cache[k] = new THREE.MeshBasicMaterial({ color: hex })); },
};
const GEO = {};
function initGeo() {
  GEO.box = new THREE.BoxGeometry(1, 1, 1);
  GEO.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  GEO.cyl6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
  GEO.cyl12 = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  GEO.cone = new THREE.ConeGeometry(0.5, 1, 8);
  GEO.cone6 = new THREE.ConeGeometry(0.5, 1, 6);
  GEO.ico = new THREE.IcosahedronGeometry(0.5, 0);
  GEO.ico1 = new THREE.IcosahedronGeometry(0.5, 1);
  GEO.dodo = new THREE.DodecahedronGeometry(0.5, 0);
  GEO.sph = new THREE.SphereGeometry(0.5, 10, 8);
  GEO.torus = new THREE.TorusGeometry(0.5, 0.12, 6, 14);
  // a unit triangular prism: ridge along z at the top, base 1x1 at y=0
  const p = new THREE.BufferGeometry();
  const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, 0.5];
  const idx = [0, 2, 1, 3, 5, 4, 0, 3, 4, 0, 4, 2, 1, 2, 4, 1, 4, 5, 0, 1, 5, 0, 5, 3];
  p.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); p.setIndex(idx); p.computeVertexNormals();
  GEO.prism = p;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function M4(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return _m4.clone().compose(_p, _q, _s);
}
// Merges many coloured primitives into one flat-shaded mesh (one draw call for a whole village).
class Batch {
  constructor() { this.pos = []; this.col = []; }
  add(geo, color, m) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    g.applyMatrix4(m);
    const a = g.attributes.position.array;
    const c = new THREE.Color(color);
    const jitter = 0.04;
    for (let i = 0; i < a.length; i += 9) {
      const k = 1 + (Math.random() - 0.5) * jitter;
      for (let j = 0; j < 9; j++) this.pos.push(a[i + j]);
      for (let j = 0; j < 3; j++) this.col.push(c.r * k, c.g * k, c.b * k);
    }
    g.dispose();
    return this;
  }
  // convenience: box/cyl/etc by name with transform params
  p(name, color, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { return this.add(GEO[name], color, M4(x, y, z, ry, sx, sy, sz, rx, rz)); }
  build(mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat || MAT.vc);
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
  get empty() { return this.pos.length === 0; }
}
function mesh(geo, hex, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, typeof hex === 'number' ? MAT.col(hex) : hex);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  return m;
}

// ---------- props (added to a Batch at a world transform; ry rotates around the prop's origin) ----------
// Every prop function takes (b, x, y, z, ry, ...) and adds primitives positioned relative to that origin.
function rot(x, z, ry) { const c = Math.cos(ry), s = Math.sin(ry); return [x * c + z * s, -x * s + z * c]; }
function partAt(b, name, color, ox, oy, oz, sx, sy, sz, base, ryLocal = 0, rx = 0, rz = 0) {
  const [x, y, z, ry] = base; const [dx, dz] = rot(ox, oz, ry);
  b.p(name, color, x + dx, y + oy, z + dz, sx, sy, sz, ry + ryLocal, rx, rz);
}
const PROPS = {
  house(b, x, y, z, ry, o = {}) {
    const w = o.w || 6, d = o.d || 5, h = o.h || 3.2, base = [x, y, z, ry];
    const wall = o.wall || 0xefe2c8, roof = o.roof || 0xc0573e, trim = o.trim || 0x7a5232;
    partAt(b, 'box', 0x8f8574, 0, 0.15, 0, w + 0.3, 0.3, d + 0.3, base);
    partAt(b, 'box', wall, 0, h / 2, 0, w, h, d, base);
    // timber corners
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) partAt(b, 'box', trim, sx * w / 2, h / 2, sz * d / 2, 0.22, h, 0.22, base);
    partAt(b, 'box', trim, 0, h, 0, w + 0.2, 0.2, d + 0.2, base);
    // roof: prism, ridge along local x
    partAt(b, 'prism', roof, 0, h + 0.1, 0, d + 0.9, o.rh || 2.2, w + 0.8, base, Math.PI / 2);
    // door on +z face, windows
    partAt(b, 'box', o.door || 0x6b3f26, o.doorX || 0, 1.0, d / 2 + 0.03, 1.0, 2.0, 0.1, base);
    partAt(b, 'box', 0xd6b25a, (o.doorX || 0) + 0.3, 1.0, d / 2 + 0.1, 0.1, 0.1, 0.1, base);
    for (const wx of [-w / 2 + 1.1, w / 2 - 1.1]) if (Math.abs(wx - (o.doorX || 0)) > 1.2) {
      partAt(b, 'box', 0x3f6d8e, wx, h * 0.58, d / 2 + 0.03, 0.9, 0.8, 0.08, base);
      partAt(b, 'box', 0xf4f0e0, wx, h * 0.58, d / 2 + 0.06, 1.1, 0.1, 0.06, base);
      partAt(b, 'box', o.shutter || 0x4f8a6a, wx - 0.62, h * 0.58, d / 2 + 0.05, 0.3, 0.85, 0.06, base);
      partAt(b, 'box', o.shutter || 0x4f8a6a, wx + 0.62, h * 0.58, d / 2 + 0.05, 0.3, 0.85, 0.06, base);
    }
    for (const wx of [-w / 4, w / 4]) partAt(b, 'box', 0x3f6d8e, wx, h * 0.58, -d / 2 - 0.03, 0.9, 0.8, 0.08, base);
    if (o.chimney !== false) partAt(b, 'box', 0x9a8c7c, w / 4, h + 1.6, -d / 4, 0.6, 1.8, 0.6, base);
  },
  tree(b, x, y, z, s = 1, kind = 0) {
    const g = [0x4f8f3a, 0x5c9c42, 0x3f7f3c, 0x6aa84a][kind % 4];
    b.p('cyl', 0x6e4a2e, x, y + 1.0 * s, z, 0.35 * s, 2.0 * s, 0.35 * s);
    b.p('ico', g, x, y + 2.6 * s, z, 2.6 * s, 2.2 * s, 2.6 * s, kind);
    b.p('ico', g, x + 0.5 * s, y + 3.4 * s, z - 0.3 * s, 1.7 * s, 1.5 * s, 1.7 * s, kind + 1);
  },
  pine(b, x, y, z, s = 1) {
    b.p('cyl', 0x5e3f28, x, y + 0.6 * s, z, 0.3 * s, 1.2 * s, 0.3 * s);
    b.p('cone', 0x2f6d46, x, y + 2.0 * s, z, 2.4 * s, 2.2 * s, 2.4 * s);
    b.p('cone', 0x37794e, x, y + 3.2 * s, z, 1.8 * s, 1.8 * s, 1.8 * s, 0.4);
    b.p('cone', 0x3f855a, x, y + 4.2 * s, z, 1.1 * s, 1.4 * s, 1.1 * s, 0.2);
  },
  palm(b, x, y, z, s = 1, ry = 0) {
    let px = x, py = y, pz = z; const lean = 0.18;
    for (let i = 0; i < 5; i++) {
      const [dx, dz] = rot(0, lean * i * 0.5, ry);
      b.p('cyl6', 0x8a6a42, px + dx, py + 0.45 * s, pz + dz, 0.32 * s * (1 - i * 0.08), 0.95 * s, 0.32 * s * (1 - i * 0.08), 0, lean * i * 0.3);
      py += 0.9 * s; px += dx * 0.6; pz += dz * 0.6;
    }
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + ry;
      b.add(GEO.box, k % 2 ? 0x3f9a46 : 0x4caa52, M4(px + Math.sin(a) * 1.1 * s, py - 0.2 * s, pz + Math.cos(a) * 1.1 * s, a, 0.5 * s, 0.08 * s, 2.4 * s, 0.35));
    }
    b.p('sph', 0x6b4a2a, px, py - 0.25 * s, pz, 0.4 * s, 0.4 * s, 0.4 * s);
  },
  rock(b, x, y, z, s = 1, ry = 0, color = 0x8c867c) { b.p('dodo', color, x, y + s * 0.3, z, s * 1.6, s * 1.1, s * 1.3, ry, 0.2); },
  bush(b, x, y, z, s = 1) { b.p('ico', 0x4e8e3e, x, y + 0.4 * s, z, 1.4 * s, 1.0 * s, 1.4 * s); b.p('ico', 0x5aa046, x + 0.4 * s, y + 0.5 * s, z + 0.2 * s, 0.9 * s, 0.8 * s, 0.9 * s); },
  flowers(b, x, y, z) { for (let i = 0; i < 5; i++) b.p('ico', pick([0xf06a8a, 0xf6d04a, 0xffffff, 0xb07ae0]), x + rnd(-0.7, 0.7), y + 0.15, z + rnd(-0.7, 0.7), 0.25, 0.25, 0.25); },
  fence(b, x0, z0, x1, z1, yAt) {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.6));
    const a = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), z = lerp(z0, z1, i / n); b.p('box', 0x8a6a48, x, yAt(x, z) + 0.5, z, 0.15, 1.0, 0.15); }
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, (i + 0.5) / n), z = lerp(z0, z1, (i + 0.5) / n), y = yAt(x, z), L = Math.hypot(x1 - x0, z1 - z0) / n;
      b.p('box', 0xa07d55, x, y + 0.75, z, 0.08, 0.12, L, a); b.p('box', 0xa07d55, x, y + 0.4, z, 0.08, 0.12, L, a);
    }
  },
  lamp(b, x, y, z) {
    b.p('cyl', 0x2e3338, x, y + 1.4, z, 0.14, 2.8, 0.14);
    b.p('box', 0x2e3338, x, y + 2.9, z, 0.5, 0.1, 0.5);
    b.p('box', 0xffe28a, x, y + 3.15, z, 0.36, 0.4, 0.36);
    b.p('cone', 0x2e3338, x, y + 3.5, z, 0.6, 0.35, 0.6);
  },
  crate(b, x, y, z, s = 1, ry = 0) { b.p('box', 0xb08350, x, y + s / 2, z, s, s, s, ry); b.p('box', 0x8a6238, x, y + s / 2, z, s * 1.02, s * 0.16, s * 1.02, ry); },
  barrel(b, x, y, z, s = 1) { b.p('cyl', 0x9a6a3c, x, y + 0.5 * s, z, 0.8 * s, 1.0 * s, 0.8 * s); b.p('cyl', 0x50504c, x, y + 0.25 * s, z, 0.84 * s, 0.08, 0.84 * s); b.p('cyl', 0x50504c, x, y + 0.78 * s, z, 0.84 * s, 0.08, 0.84 * s); },
  sign(b, x, y, z, ry = 0) { const base = [x, y, z, ry]; partAt(b, 'box', 0x6e4a2e, 0, 0.6, 0, 0.14, 1.2, 0.14, base); partAt(b, 'box', 0xd9b98a, 0, 1.25, 0, 1.2, 0.6, 0.1, base); },
  boat(b, x, y, z, ry = 0, color = 0xc85040) {
    const base = [x, y, z, ry];
    partAt(b, 'box', color, 0, 0.35, 0, 1.6, 0.7, 4.2, base);
    partAt(b, 'box', 0xf2ead8, 0, 0.72, 0, 1.7, 0.12, 4.3, base);
    partAt(b, 'prism', color, 0, 0.0, 2.5, 1.6, 0.7, 0.9, base, 0, -Math.PI / 2);
    partAt(b, 'box', 0x8a6238, 0, 0.6, -0.4, 1.4, 0.08, 0.6, base);
    partAt(b, 'cyl', 0x8a6238, 0, 2.2, 0.6, 0.12, 3.2, 0.12, base);
  },
  stall(b, x, y, z, ry = 0, color = 0xd04848) {
    const base = [x, y, z, ry];
    partAt(b, 'box', 0x9a7350, 0, 0.5, 0, 3, 1, 1.4, base);
    for (const sx of [-1.4, 1.4]) partAt(b, 'box', 0x6e4a2e, sx, 1.3, -0.5, 0.12, 2.6, 0.12, base);
    for (let i = 0; i < 5; i++) partAt(b, 'box', i % 2 ? 0xf6efe0 : color, -1.2 + i * 0.6, 2.6, 0, 0.6, 0.12, 2.0, base, 0, 0.18);
    for (let i = 0; i < 6; i++) partAt(b, 'sph', pick([0xe8603c, 0xf2c94a, 0x8fc04a, 0x7a4ab0]), -1 + i * 0.4, 1.1, 0.2, 0.35, 0.35, 0.35, base);
  },
};

// ---------- characters ----------
// A rig is a tree of groups: root (feet, faces +z) > hips > legL/legR, torso > head, armL/armR.
// spec: { skin, coat, coat2, pants, boots, hair, hat, scale, girth, ears, beard, nose, kind }
function makeChar(spec) {
  const s = Object.assign({ skin: 0xf0c49a, coat: 0x5a7fbf, pants: 0x4a3a2e, boots: 0x2e2a26, hair: 0x5a3a22, scale: 1, girth: 1, head: 1 }, spec);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(s.scale);
  const P = { root, body };
  if (s.kind === 'ticker' || s.kind === 'heavy' || s.kind === 'clerk' || s.kind === 'foreman') return makeTicker(s, P);
  const hips = new THREE.Group(); hips.position.y = 0.68; body.add(hips); P.hips = hips;
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.12, 0, 0); hips.add(leg);
    leg.add(mesh(GEO.box, s.pants, 0, -0.26, 0, 0.17 * s.girth, 0.52, 0.18));
    leg.add(mesh(GEO.box, s.boots, 0, -0.6, 0.05, 0.2, 0.18, 0.3));
    P[side < 0 ? 'legL' : 'legR'] = leg;
  }
  const torso = new THREE.Group(); hips.add(torso); P.torso = torso;
  const g = s.girth;
  torso.add(mesh(GEO.cyl, s.coat, 0, 0.3, 0, 0.5 * g, 0.62, 0.42 * g));
  if (s.skirt) torso.add(mesh(GEO.cone, s.coat2 || s.coat, 0, 0.05, 0, 0.75 * g, 0.55, 0.65 * g));
  else torso.add(mesh(GEO.cyl, s.coat2 || s.coat, 0, 0.02, 0, 0.54 * g, 0.16, 0.46 * g));
  if (s.belt) torso.add(mesh(GEO.cyl, s.belt, 0, 0.12, 0, 0.53 * g, 0.07, 0.45 * g));
  if (s.scarf) { const sc = mesh(GEO.torus, s.scarf, 0, 0.6, 0, 0.42, 0.42, 0.5); sc.rotation.x = Math.PI / 2; torso.add(sc); torso.add(mesh(GEO.box, s.scarf, 0.1, 0.42, 0.2, 0.1, 0.3, 0.05)); }
  if (s.apron) torso.add(mesh(GEO.box, s.apron, 0, 0.18, 0.2 * g, 0.36 * g, 0.55, 0.04));
  if (s.sash) { const m = torso.add(mesh(GEO.box, s.sash, 0, 0.3, 0, 0.52 * g, 0.08, 0.45 * g)); m.children[m.children.length - 1].rotation.z = 0.7; }
  if (s.buttons) for (let i = 0; i < 3; i++) torso.add(mesh(GEO.sph, s.buttons, 0, 0.45 - i * 0.14, 0.21 * g, 0.05, 0.05, 0.03));
  const head = new THREE.Group(); head.position.y = 0.62; torso.add(head); P.head = head;
  const hs = s.head;
  head.add(mesh(GEO.sph, s.skin, 0, 0.26 * hs, 0, 0.56 * hs, 0.52 * hs, 0.52 * hs));
  head.add(mesh(GEO.sph, s.skin, 0, 0.22 * hs, 0.27 * hs, 0.12 * hs * (s.nose || 1), 0.12 * hs * (s.nose || 1), 0.14 * hs * (s.nose || 1)));
  for (const sx of [-1, 1]) {
    head.add(mesh(GEO.sph, 0xffffff, sx * 0.1 * hs, 0.32 * hs, 0.22 * hs, 0.1 * hs, 0.12 * hs, 0.05));
    head.add(mesh(GEO.sph, 0x1a1a1a, sx * 0.1 * hs, 0.32 * hs, 0.245 * hs, 0.05 * hs, 0.07 * hs, 0.03));
    if (s.ears) head.add(mesh(GEO.sph, s.skin, sx * 0.29 * hs, 0.28 * hs, 0, 0.08, 0.14, 0.1));
  }
  if (s.hair) {
    head.add(mesh(GEO.sph, s.hair, 0, 0.36 * hs, -0.04, 0.58 * hs, 0.38 * hs, 0.54 * hs));
    if (s.tuft) head.add(mesh(GEO.cone, s.hair, 0.05, 0.58 * hs, 0.08, 0.16, 0.22, 0.16)).children.slice(-1)[0].rotation.z = -0.5;
    if (s.bun) head.add(mesh(GEO.sph, s.hair, 0, 0.5 * hs, -0.22 * hs, 0.26, 0.26, 0.26));
  }
  if (s.cloud) for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; head.add(mesh(GEO.ico, s.cloud, Math.sin(a) * 0.24 * hs, 0.46 * hs + (i % 2) * 0.08, Math.cos(a) * 0.2 * hs - 0.05, 0.3, 0.26, 0.3)); }
  if (s.beard) head.add(mesh(GEO.ico, s.beard, 0, 0.08 * hs, 0.17 * hs, 0.42 * hs, 0.34 * hs, 0.3 * hs));
  if (s.mustache) head.add(mesh(GEO.box, s.mustache, 0, 0.16 * hs, 0.28 * hs, 0.32 * hs, 0.06, 0.06));
  if (s.specs) for (const sx of [-1, 1]) head.add(mesh(GEO.torus, s.specs, sx * 0.1 * hs, 0.32 * hs, 0.27 * hs, 0.14, 0.14, 0.14));
  // hats
  const hat = s.hat;
  if (hat === 'keeper') {
    head.add(mesh(GEO.cyl12, 0x23314f, 0, 0.5 * hs, 0, 0.5 * hs, 0.16, 0.5 * hs));
    head.add(mesh(GEO.cyl12, 0x23314f, 0, 0.6 * hs, -0.02, 0.56 * hs, 0.12, 0.6 * hs));
    head.add(mesh(GEO.box, 0x1b1b1b, 0, 0.45 * hs, 0.25 * hs, 0.36 * hs, 0.04, 0.16));
    head.add(mesh(GEO.sph, 0xe6c04a, 0, 0.55 * hs, 0.25 * hs, 0.09, 0.09, 0.04));
  } else if (hat === 'top') {
    head.add(mesh(GEO.cyl12, 0x2a2228, 0, 0.5 * hs, 0, 0.7 * hs, 0.05, 0.7 * hs));
    head.add(mesh(GEO.cyl12, 0x2a2228, 0, 0.75 * hs, 0, 0.42 * hs, 0.5, 0.42 * hs));
    head.add(mesh(GEO.cyl12, s.hatBand || 0x8a2a4a, 0, 0.58 * hs, 0, 0.43 * hs, 0.08, 0.43 * hs));
  } else if (hat === 'souwester') {
    head.add(mesh(GEO.sph, s.hatColor || 0x3f7a4a, 0, 0.44 * hs, 0, 0.6 * hs, 0.36 * hs, 0.6 * hs));
    head.add(mesh(GEO.cyl12, s.hatColor || 0x3f7a4a, 0, 0.4 * hs, -0.05, 0.85 * hs, 0.04, 0.85 * hs));
  } else if (hat === 'cap') {
    head.add(mesh(GEO.sph, s.hatColor || 0x6a5a48, 0, 0.44 * hs, 0, 0.58 * hs, 0.3 * hs, 0.56 * hs));
    head.add(mesh(GEO.box, s.hatColor || 0x6a5a48, 0, 0.42 * hs, 0.26 * hs, 0.4 * hs, 0.04, 0.18));
  } else if (hat === 'wizard') {
    head.add(mesh(GEO.cyl12, s.hatColor || 0x4a6ab0, 0, 0.62 * hs, 0, 0.7 * hs, 0.05, 0.7 * hs));
    head.add(mesh(GEO.cone, s.hatColor || 0x4a6ab0, 0, 0.98 * hs, 0, 0.4 * hs, 0.75, 0.4 * hs));
  } else if (hat === 'bonnet') {
    head.add(mesh(GEO.sph, s.hatColor || 0xf4e6c8, 0, 0.42 * hs, -0.06, 0.62 * hs, 0.44 * hs, 0.56 * hs));
  }
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.28 * g, 0.52, 0); torso.add(arm);
    arm.add(mesh(GEO.box, s.sleeve || s.coat, 0, -0.2, 0, 0.13, 0.42, 0.14));
    arm.add(mesh(GEO.sph, s.glove || s.skin, 0, -0.45, 0.02, 0.14, 0.14, 0.14));
    P[side < 0 ? 'armL' : 'armR'] = arm;
  }
  if (s.staff) { const st = new THREE.Group(); st.position.set(0, -0.45, 0.05); P.armR.add(st); st.add(mesh(GEO.cyl, 0x7a5a38, 0, 0.3, 0, 0.06, 1.6, 0.06)); st.add(mesh(GEO.box, 0xd6b25a, 0, 1.15, 0, 0.5, 0.06, 0.06)); st.add(mesh(GEO.cone, 0xd6b25a, 0.25, 1.15, 0, 0.12, 0.2, 0.12)).children.slice(-1)[0].rotation.z = -Math.PI / 2; }
  // blob shadow
  const sh = new THREE.Mesh(SHADOW.geo, SHADOW.mat); sh.rotation.x = -Math.PI / 2; sh.scale.setScalar(0.9 * s.scale * g); root.add(sh); P.shadow = sh;
  P.spec = s;
  return P;
}
// clockwork bailiffs: barrel body, stubby legs, top hat, one eye, a rubber-stamp arm, a wind-up key
function makeTicker(s, P) {
  const body = P.body;
  const metal = s.kind === 'heavy' ? 0x6e7680 : s.kind === 'foreman' ? 0x8a6a3a : 0xc49a4a;
  const dark = 0x3a3430;
  const hips = new THREE.Group(); hips.position.y = 0.5; body.add(hips); P.hips = hips;
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.2, 0, 0); hips.add(leg);
    leg.add(mesh(GEO.cyl, dark, 0, -0.2, 0, 0.12, 0.4, 0.12));
    leg.add(mesh(GEO.box, metal, 0, -0.45, 0.06, 0.24, 0.12, 0.36));
    P[side < 0 ? 'legL' : 'legR'] = leg;
  }
  const torso = new THREE.Group(); hips.add(torso); P.torso = torso;
  torso.add(mesh(GEO.cyl12, metal, 0, 0.42, 0, 0.8, 0.85, 0.75));
  torso.add(mesh(GEO.cyl12, dark, 0, 0.08, 0, 0.84, 0.08, 0.79));
  torso.add(mesh(GEO.cyl12, dark, 0, 0.78, 0, 0.84, 0.08, 0.79));
  for (let i = 0; i < 4; i++) torso.add(mesh(GEO.sph, 0xe8d08a, Math.sin(i * 1.6 - 2.4) * 0.38, 0.45, Math.cos(i * 1.6 - 2.4) * 0.36, 0.06, 0.06, 0.06));
  const head = new THREE.Group(); head.position.y = 0.85; torso.add(head); P.head = head;
  if (s.kind === 'foreman') {
    head.add(mesh(GEO.cyl12, 0x2a2228, 0, 0.12, 0, 0.9, 0.06, 0.9));
    head.add(mesh(GEO.cyl12, 0x2a2228, 0, 0.32, 0, 0.6, 0.4, 0.6));
  } else if (s.kind === 'heavy') {
    head.add(mesh(GEO.sph, 0x2a2228, 0, 0.1, 0, 0.75, 0.42, 0.75));
    head.add(mesh(GEO.cyl12, 0x2a2228, 0, 0.02, 0, 1.0, 0.04, 1.0));
  } else {
    head.add(mesh(GEO.cyl12, 0x2a2228, 0, 0.04, 0, 0.75, 0.05, 0.75));
    head.add(mesh(GEO.cyl12, 0x2a2228, 0, 0.3, 0, 0.48, 0.5, 0.48));
    head.add(mesh(GEO.cyl12, 0x9a2a2a, 0, 0.1, 0, 0.5, 0.08, 0.5));
  }
  const eye = mesh(GEO.sph, MAT.glow(0x9fe8ff), 0, -0.4, 0.37, 0.24, 0.24, 0.1); head.add(eye); P.eye = eye;
  head.add(mesh(GEO.torus, 0x2a2a2a, 0, -0.4, 0.38, 0.26, 0.26, 0.26));
  if (s.kind === 'clerk') for (const sx of [-1, 1]) head.add(mesh(GEO.torus, 0xd6b25a, sx * 0.14, -0.15, 0.4, 0.14, 0.14, 0.14));
  // wind-up key
  const key = new THREE.Group(); key.position.set(0, 0.45, -0.4); torso.add(key); P.key = key;
  key.add(mesh(GEO.cyl, 0xd6b25a, 0, 0, -0.1, 0.06, 0.06, 0.25)).children[0].rotation.x = Math.PI / 2;
  key.add(mesh(GEO.torus, 0xd6b25a, 0.15, 0, -0.22, 0.3, 0.3, 0.3)); key.add(mesh(GEO.torus, 0xd6b25a, -0.15, 0, -0.22, 0.3, 0.3, 0.3));
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.46, 0.55, 0); torso.add(arm);
    arm.add(mesh(GEO.cyl, dark, 0, -0.2, 0, 0.09, 0.42, 0.09));
    if (side > 0) { arm.add(mesh(GEO.cyl, 0x6b3f26, 0, -0.48, 0, 0.1, 0.2, 0.1)); arm.add(mesh(GEO.box, 0xa83a3a, 0, -0.62, 0, 0.32, 0.1, 0.22)); }
    else arm.add(mesh(GEO.sph, metal, 0, -0.45, 0, 0.18, 0.18, 0.18));
    P[side < 0 ? 'armL' : 'armR'] = arm;
  }
  const sh = new THREE.Mesh(SHADOW.geo, SHADOW.mat); sh.rotation.x = -Math.PI / 2; sh.scale.setScalar(1.1 * s.scale); P.root.add(sh); P.shadow = sh;
  P.spec = s; P.ticker = true;
  return P;
}
const SHADOW = {
  init() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 4, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  },
};

// Procedural animation. a = { move: 0..1 speed, phase, pose: 'idle'|'walk'|'run'|'sneak'|'fight'|'jump'|'hurt'|'sleep'|'talk'|'swim',
//   punch: 0..1, kick: 0..1, throwT: 0..1, t }
function animChar(P, a) {
  const t = a.t, m = a.move || 0;
  const sw = Math.sin(a.phase || 0);
  let legAmp = 0.7 * m, armAmp = 0.6 * m, hipsY = P.ticker ? 0.5 : 0.68, lean = 0, bob = Math.abs(Math.cos(a.phase || 0)) * 0.05 * m;
  let armLx = -sw * armAmp, armRx = sw * armAmp, armLz = 0.08, armRz = -0.08;
  let headX = 0, headY = 0, crouch = 0;
  switch (a.pose) {
    case 'run': legAmp = 1.0 * m; armAmp = 0.9 * m; lean = 0.18 * m; armLx = -sw * armAmp; armRx = sw * armAmp; bob *= 2; break;
    case 'sneak': crouch = 0.2; lean = 0.38; legAmp = 0.5 * m; armLx = -0.9 + sw * 0.2 * m; armRx = -0.9 - sw * 0.2 * m; armLz = 0.35; armRz = -0.35; headX = -0.3; break;
    case 'fight': armLx = -1.3 + sw * 0.15 * m; armRx = -1.0 - sw * 0.15 * m; armLz = 0.4; armRz = -0.4; lean = 0.12; crouch = 0.05; legAmp = 0.5 * m; break;
    case 'jump': legAmp = 0; armLx = -2.6; armRx = -2.6; armLz = 0.5; armRz = -0.5; break;
    case 'fall': legAmp = 0; armLx = -2.8 + Math.sin(t * 20) * 0.4; armRx = -2.8 - Math.sin(t * 20) * 0.4; break;
    case 'hurt': lean = -0.35; armLx = -0.6; armRx = -0.6; armLz = 0.9; armRz = -0.9; break;
    case 'sleep': lean = 0.25; crouch = 0.1; headX = 0.45; armLx = 0.1; armRx = 0.1; break;
    case 'talk': headY = Math.sin(t * 6) * 0.08; armRx = -0.5 + Math.sin(t * 5) * 0.3; armRz = -0.3; break;
    case 'wave': armRx = -2.6; armRz = -0.4 + Math.sin(t * 9) * 0.4; break;
    case 'cheer': armLx = -2.8; armRx = -2.8; armLz = 0.4 + Math.sin(t * 8) * 0.2; armRz = -0.4 - Math.sin(t * 8) * 0.2; bob = Math.abs(Math.sin(t * 8)) * 0.15; break;
    case 'swim': lean = 1.1; legAmp = 0.4; armLx = -2.6 + sw * 0.8; armRx = -2.6 - sw * 0.8; crouch = 0.5; break;
    case 'valve': armLx = -1.4; armRx = -1.4; armLz = 0.3 + Math.sin(t * 6) * 0.3; armRz = -0.3 + Math.sin(t * 6) * 0.3; break;
    case 'push': lean = 0.4; armLx = -1.5; armRx = -1.5; legAmp = 0.6 * m; break;
    default: { const br = Math.sin(t * 2.2) * 0.02; armLz = 0.08 + br; armRz = -0.08 - br; }
  }
  if (a.punch > 0) { const p = Math.sin(a.punch * Math.PI); (a.punchSide ? (armLx = -1.6 * p - 0.3 * (1 - p)) : (armRx = -1.6 * p - 0.3 * (1 - p))); lean += 0.15 * p; }
  if (a.kick > 0) { const p = Math.sin(a.kick * Math.PI); P.legR.rotation.x = -1.5 * p; lean -= 0.2 * p; }
  if (a.throwT > 0) { const p = a.throwT; armRx = p < 0.4 ? lerp(0, 2.6, p / 0.4) * -1 : lerp(-2.6, -0.4, (p - 0.4) / 0.6); armRz = -0.2; }
  if (P.legL) {
    P.legL.rotation.x = sw * legAmp;
    if (!(a.kick > 0)) P.legR.rotation.x = -sw * legAmp;
    if (a.pose === 'jump') { P.legL.rotation.x = -0.6; P.legR.rotation.x = 0.3; }
    if (a.pose === 'sleep' && P.ticker) { P.legL.rotation.x = -1.2; P.legR.rotation.x = -1.2; }
  }
  P.hips.position.y = hipsY - crouch + bob - (a.pose === 'sleep' && P.ticker ? 0.3 : 0);
  P.torso.rotation.x = lean;
  P.armL.rotation.x = armLx; P.armR.rotation.x = armRx; P.armL.rotation.z = armLz; P.armR.rotation.z = armRz;
  P.head.rotation.x = headX; P.head.rotation.y = headY;
  if (P.key) P.key.rotation.z = t * (a.pose === 'sleep' ? 0.5 : 4);
}
