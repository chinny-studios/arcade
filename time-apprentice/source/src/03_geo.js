// The Time Apprentice — geometry batches: primitives written into one flat-shaded, vertex-coloured mesh

const _o3 = new THREE.Object3D(), _p3 = new V3(), _c3 = new THREE.Color(), _q3 = new THREE.Quaternion();
const GEO = (() => {
  const cache = {};
  const ni = (g) => (g.index ? g.toNonIndexed() : g);
  return {
    box: ni(new THREE.BoxGeometry(1, 1, 1)),
    cyl(seg, rt = 1) { const k = 'c' + seg + '_' + rt; return cache[k] || (cache[k] = ni(new THREE.CylinderGeometry(rt, 1, 1, seg, 1))); },
    ball(det) { const k = 'b' + det; return cache[k] || (cache[k] = ni(new THREE.IcosahedronGeometry(1, det))); },
    // unit square frustum (base 1 × 1 at y = -0.5, top k × k at y = 0.5)
    frustum(k) {
      const key = 'f' + k; if (cache[key]) return cache[key];
      const b = 0.5, t = 0.5 * k;
      const P = [[-b, -0.5, -b], [b, -0.5, -b], [b, -0.5, b], [-b, -0.5, b], [-t, 0.5, -t], [t, 0.5, -t], [t, 0.5, t], [-t, 0.5, t]];
      const F = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0]];
      const pos = []; for (const f of F) for (const i of f) pos.push(...P[i]);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      return (cache[key] = g);
    },
    ni,
  };
})();

class GB {
  constructor() { this.pos = []; this.col = []; }
  get empty() { return this.pos.length === 0; }
  // append a geometry transformed by the current _o3 matrix, in one colour (with optional brightness jitter)
  put(geo, color, j = 0) {
    _o3.updateMatrix();
    const m = _o3.matrix, p = geo.attributes.position.array;
    _c3.set(color);
    let r = _c3.r, g = _c3.g, b = _c3.b;
    if (j) { const k = 1 + (RNG() * 2 - 1) * j; r = clamp(r * k, 0, 1); g = clamp(g * k, 0, 1); b = clamp(b * k, 0, 1); }
    const vc = geo.attributes.color ? geo.attributes.color.array : null;
    for (let i = 0; i < p.length; i += 3) {
      _p3.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m);
      this.pos.push(_p3.x, _p3.y, _p3.z);
      if (vc) this.col.push(vc[i] * r, vc[i + 1] * g, vc[i + 2] * b); else this.col.push(r, g, b);
    }
    return this;
  }
  _t(x, y, z, sx, sy, sz, o) {
    _o3.position.set(x, y, z);
    _o3.rotation.set(o && o.rx || 0, o && o.ry || 0, o && o.rz || 0, 'YXZ');
    _o3.scale.set(sx, sy, sz);
  }
  // box standing on y (its base), rotated about its centre
  box(x, y, z, w, h, d, c, o) { this._t(x, y + h / 2, z, w, h, d, o); return this.put(GEO.box, c, o && o.j); }
  // box centred on (x, y, z)
  cbox(x, y, z, w, h, d, c, o) { this._t(x, y, z, w, h, d, o); return this.put(GEO.box, c, o && o.j); }
  // cylinder standing on y; o.rt = top radius as a fraction of r, o.seg = sides
  cyl(x, y, z, r, h, c, o) { this._t(x, y + h / 2, z, r, h, r, o); return this.put(GEO.cyl(o && o.seg || 10, o && o.rt != null ? o.rt : 1), c, o && o.j); }
  ccyl(x, y, z, r, h, c, o) { this._t(x, y, z, r, h, r, o); return this.put(GEO.cyl(o && o.seg || 10, o && o.rt != null ? o.rt : 1), c, o && o.j); }
  cone(x, y, z, r, h, c, o) { return this.cyl(x, y, z, r, h, c, Object.assign({ rt: 0 }, o)); }
  // ellipsoid centred on (x, y, z); o.sy / o.sz stretch it, o.det = detail
  ball(x, y, z, r, c, o) { this._t(x, y, z, r * (o && o.sx || 1), r * (o && o.sy || 1), r * (o && o.sz || 1), o); return this.put(GEO.ball(o && o.det != null ? o.det : 1), c, o && o.j); }
  // square frustum standing on y: bottom w × d, top scaled by k (0 = pyramid)
  frustum(x, y, z, w, h, d, k, c, o) { this._t(x, y + h / 2, z, w, h, d, o); return this.put(GEO.frustum(k), c, o && o.j); }
  putM(geo, m, color, j) {
    const p = geo.attributes.position.array;
    _c3.set(color);
    let r = _c3.r, g = _c3.g, b = _c3.b;
    if (j) { const k = 1 + (RNG() * 2 - 1) * j; r = clamp(r * k, 0, 1); g = clamp(g * k, 0, 1); b = clamp(b * k, 0, 1); }
    for (let i = 0; i < p.length; i += 3) {
      _p3.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m);
      this.pos.push(_p3.x, _p3.y, _p3.z); this.col.push(r, g, b);
    }
    return this;
  }
  // a rod from a to b (arrays [x, y, z]) of radius r: ropes, struts, wires
  rod(a, b, r, c, seg = 5) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz) || 1e-6;
    _q3.setFromUnitVectors(new V3(0, 1, 0), new V3(dx / l, dy / l, dz / l));
    const m = new THREE.Matrix4().compose(new V3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q3, new V3(r, l, r));
    return this.putM(GEO.cyl(seg), m, c);
  }
  // a flat 2D shape (array of [x, y]) extruded by depth along z, placed with o (x, y, z, rx, ry, rz)
  shape(pts, depth, c, o = {}) {
    const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    const g = GEO.ni(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }));
    g.translate(0, 0, -depth / 2);
    this._t(o.x || 0, o.y || 0, o.z || 0, o.sx || 1, o.sy || 1, o.sz || 1, o);
    return this.put(g, c, o.j);
  }
  // a lathe (profile array of [r, y]) for jars, pots, bells
  lathe(x, y, z, prof, c, seg = 12, o) {
    const g = GEO.ni(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), seg));
    this._t(x, y, z, o && o.s || 1, o && o.s || 1, o && o.s || 1, o);
    return this.put(g, c, o && o.j);
  }
  // any THREE geometry at a transform
  geo(g, x, y, z, c, o) { this._t(x, y, z, o && o.sx || 1, o && o.sy || 1, o && o.sz || 1, o); return this.put(GEO.ni(g), c, o && o.j); }
  // merge another batch in
  addGB(gb) { for (const v of gb.pos) this.pos.push(v); for (const v of gb.col) this.col.push(v); return this; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
  mesh(mat, o = {}) {
    const m = new THREE.Mesh(this.geometry(), mat || R.mat.vc);
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    return m;
  }
}

// A ground grid from a height function and a colour function, flat-shaded.
function terrainMesh(x0, z0, x1, z1, step, hf, cf) {
  const nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step);
  const pos = [], col = [];
  const H = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i * step, z = z0 + j * step; H.push(hf(x, z)); }
  const c = new THREE.Color();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const xa = x0 + i * step, za = z0 + j * step, xb = xa + step, zb = za + step;
    const h00 = H[j * (nx + 1) + i], h10 = H[j * (nx + 1) + i + 1], h01 = H[(j + 1) * (nx + 1) + i], h11 = H[(j + 1) * (nx + 1) + i + 1];
    const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      c.set(cf((ax + bx + cx) / 3, (az + bz + cz) / 3, (ay + by + cy) / 3));
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    };
    tri(xa, h00, za, xa, h01, zb, xb, h10, za);
    tri(xb, h10, za, xa, h01, zb, xb, h11, zb);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, R.mat.vc);
  m.receiveShadow = true;
  return m;
}
// mix two hex colours
function mixHex(a, b, t) { const ca = new THREE.Color(a), cb = new THREE.Color(b); return ca.lerp(cb, clamp(t, 0, 1)).getHex(); }

// A canvas texture with text or a drawing, for signs, screens and papers.
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4;
  t.userData = { cv, ctx, draw };
  return t;
}
function texPlane(tex, w, h, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !!o.transparent, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, fog: o.fog !== false }));
  if (o.lit) m.material = new THREE.MeshLambertMaterial({ map: tex, transparent: !!o.transparent, side: o.ds ? THREE.DoubleSide : THREE.FrontSide });
  return m;
}
