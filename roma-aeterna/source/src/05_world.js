// Roma Aeterna — the world registry: batched geometry by layer and cell, collision solids, the navigation graph that
// people and carts walk along, streets, and the named places (landmarks, districts and placards).

const W = {
  cells: new Map(), // key -> { layer, cx, cz, gb }
  solids: [], sgrid: new Map(),
  nodes: [], edges: [], ngrid: new Map(),
  places: [], placards: [], spots: [], fountains: [], lamps: [], scenes: [],
  meshes: [], mapLines: [], mapRects: [], mapCircles: [],
};
// map shapes (drawn once into the map canvas)
function mapRect(F, u, v, w, d, col = '#a0846a', ra = 0) {
  const ca = Math.cos(ra), sa = Math.sin(ra), pts = [];
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const lu = a * w / 2, lv = b * d / 2, uu = u + lu * ca - lv * sa, vv = v + lu * sa + lv * ca; pts.push([F.wx(uu, vv), F.wz(uu, vv)]); }
  W.mapRects.push({ pts, col });
}
const mapCircle = (x, z, r, col = '#a0846a') => W.mapCircles.push({ x, z, r, col });
const mapLine = (pts, w, col = '#8d8170') => W.mapLines.push({ pts, w, col });
const CELL = 192;
// ---------- reserved ground: monuments and streets claim it, the neighbourhood builder fills what's left ----------
const RS = 2, RNX = Math.ceil((T.X1 - T.X0) / RS), RNZ = Math.ceil((T.Z1 - T.Z0) / RS);
const RES = new Uint8Array(RNX * RNZ);
// bit 1: a monument or building, bit 2: a street
function _resMark(x, z, k = 1) { const i = Math.floor((x - T.X0) / RS), j = Math.floor((z - T.Z0) / RS); if (i >= 0 && j >= 0 && i < RNX && j < RNZ) RES[j * RNX + i] |= k; }
// rectangle in frame F (centre u, v; size w x d) plus a margin
function reserve(F, u, v, w, d, pad = 2, ra = 0) {
  const W2 = w / 2 + pad, D2 = d / 2 + pad, ca = Math.cos(ra), sa = Math.sin(ra);
  for (let a = -W2; a <= W2; a += RS * 0.5) for (let b = -D2; b <= D2; b += RS * 0.5) { const uu = u + a * ca - b * sa, vv = v + a * sa + b * ca; _resMark(F.wx(uu, vv), F.wz(uu, vv)); }
}
function reserveC(x, z, r) { for (let a = -r; a <= r; a += RS * 0.5) for (let b = -r; b <= r; b += RS * 0.5) if (a * a + b * b <= r * r) _resMark(x + a, z + b); }
const monAt = (x, z) => reservedAt(x, z) & 1;
function reservedAt(x, z) { const i = Math.floor((x - T.X0) / RS), j = Math.floor((z - T.Z0) / RS); return i < 0 || j < 0 || i >= RNX || j >= RNZ ? 1 : RES[j * RNX + i]; }
// is any part of a rectangle reserved? (sampled)
function rectFree(F, u, v, w, d, ra = 0) {
  const ca = Math.cos(ra), sa = Math.sin(ra);
  for (let a = -0.46; a <= 0.47; a += 0.23) for (let b = -0.46; b <= 0.47; b += 0.23) {
    const uu = u + a * w * ca - b * d * sa, vv = v + a * w * sa + b * d * ca, x = F.wx(uu, vv), z = F.wz(uu, vv);
    if (reservedAt(x, z) || inWater(x, z)) return false;
  }
  return true;
}
// layers: draw distance (multiplier on Q.view, or absolute), material, shadows
const LAYERS = {
  city: { mat: 'vc', dist: () => Q.view, cast: true },
  mon: { mat: 'vc', dist: () => Q.far, cast: true },
  prop: { mat: 'vc', dist: () => Math.min(260, Q.view * 0.5), cast: true },
  ds: { mat: 'vcDS', dist: () => Q.view * 0.6, cast: true },
  glow: { mat: 'glow', dist: () => Q.view, cast: false },
  tree: { mat: 'vc', dist: () => Q.view * 0.85, cast: true },
};
function gbAt(layer, x, z) {
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL), k = layer + ':' + cx + ':' + cz;
  let c = W.cells.get(k);
  if (!c) { c = { layer, cx, cz, gb: new GB(layer === 'mon' ? 32768 : 8192) }; W.cells.set(k, c); }
  return c.gb;
}
// A frame's batch: everything authored in a frame goes to the cell holding its origin
const gbF = (layer, F) => gbAt(layer, F.x, F.z);

// ---------- solids ----------
const SG = 24;
function _sgAdd(i, x0, z0, x1, z1) {
  for (let a = Math.floor(x0 / SG); a <= Math.floor(x1 / SG); a++) for (let b = Math.floor(z0 / SG); b <= Math.floor(z1 / SG); b++) {
    const k = a * 100003 + b; let l = W.sgrid.get(k); if (!l) W.sgrid.set(k, l = []); l.push(i);
  }
}
// box in frame F: centre (u, v), size w × d, vertical range y0..y1 (local to F.y), extra rotation ra
function solidBox(F, u, v, w, d, y0, y1, ra = 0, nowalk = false) {
  const x = F.wx(u, v), z = F.wz(u, v), a = F.ang + ra;
  const s = { t: 0, x, z, c: Math.cos(a), s: Math.sin(a), hw: w / 2, hd: d / 2, y0: F.y + y0, y1: F.y + y1, walk: !nowalk };
  const r = Math.hypot(w, d) / 2;
  W.solids.push(s); _sgAdd(W.solids.length - 1, x - r, z - r, x + r, z + r);
  return s;
}
function solidCircle(x, z, r, y0, y1, nowalk = false) {
  const s = { t: 1, x, z, r, y0, y1, walk: !nowalk };
  W.solids.push(s); _sgAdd(W.solids.length - 1, x - r, z - r, x + r, z + r);
  return s;
}
function solidRing(x, z, r0, r1, y0, y1, gaps = []) {
  const s = { t: 2, x, z, r0, r1, y0, y1, gaps, walk: false };
  W.solids.push(s); _sgAdd(W.solids.length - 1, x - r1, z - r1, x + r1, z + r1);
  return s;
}
const _near = [];
let _qstamp = 1; const _qmark = new Uint32Array(1 << 18);
function solidsNear(x, z, r) {
  _near.length = 0; _qstamp++;
  if (W.solids.length > _qmark.length) return _near;
  for (let a = Math.floor((x - r) / SG); a <= Math.floor((x + r) / SG); a++) for (let b = Math.floor((z - r) / SG); b <= Math.floor((z + r) / SG); b++) {
    const l = W.sgrid.get(a * 100003 + b); if (!l) continue;
    for (const i of l) if (_qmark[i] !== _qstamp) { _qmark[i] = _qstamp; _near.push(W.solids[i]); }
  }
  return _near;
}
const ringGap = (s, a) => s.gaps.some((g) => { const d = angWrap(a - g[0]); return d >= 0 && d <= angWrap(g[1] - g[0]); });
// is (x, z) inside the solid's footprint (expanded by r)?
function insideSolid(s, x, z, r = 0) {
  if (s.t === 0) { const dx = x - s.x, dz = z - s.z, u = dx * s.c + dz * s.s, v = -dx * s.s + dz * s.c; return Math.abs(u) <= s.hw + r && Math.abs(v) <= s.hd + r; }
  if (s.t === 1) return dist2(x, z, s.x, s.z) <= (s.r + r) * (s.r + r);
  const d = Math.hypot(x - s.x, z - s.z); return d >= s.r0 - r && d <= s.r1 + r && !ringGap(s, Math.atan2(z - s.z, x - s.x));
}
// the walkable surface under (x, z) for feet at y: terrain or the highest solid top within a step's reach
const STEP = 0.55;
function surfaceAt(x, z, y, pr = 0.12) {
  let g = groundAt(x, z);
  const L = solidsNear(x, z, 1);
  for (const s of L) if (s.walk && s.y1 > g && s.y1 <= y + STEP && insideSolid(s, x, z, pr)) g = s.y1;
  return g;
}
// push a circle (x, z, r) at feet height y out of every solid it overlaps; returns [x, z]
function collideCircle(x, z, r, y, h = 1.7) {
  for (let it = 0; it < 3; it++) {
    let moved = false;
    const L = solidsNear(x, z, r + 2);
    for (const s of L) {
      if (s.y1 <= y + STEP || s.y0 >= y + h) continue;
      if (s.t === 0) {
        const dx = x - s.x, dz = z - s.z; let u = dx * s.c + dz * s.s, v = -dx * s.s + dz * s.c;
        const cu = clamp(u, -s.hw, s.hw), cv = clamp(v, -s.hd, s.hd);
        let pu = u - cu, pv = v - cv; const d = Math.hypot(pu, pv);
        if (d >= r) continue;
        if (d > 1e-6) { pu = pu / d * (r - d); pv = pv / d * (r - d); }
        else { // centre inside: leave by the nearest side
          const ex = s.hw - Math.abs(u), ez = s.hd - Math.abs(v);
          if (ex < ez) { pu = Math.sign(u || 1) * (ex + r); pv = 0; } else { pv = Math.sign(v || 1) * (ez + r); pu = 0; }
        }
        x += pu * s.c - pv * s.s; z += pu * s.s + pv * s.c; moved = true;
      } else if (s.t === 1) {
        const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), m = s.r + r;
        if (d >= m) continue;
        const k = d > 1e-6 ? (m - d) / d : 0; x += dx * k; z += dz * k; if (!k) x += m; moved = true;
      } else {
        const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz);
        if (d < s.r0 - r || d > s.r1 + r || ringGap(s, Math.atan2(dz, dx))) continue;
        const tgt = (d - (s.r0 - r)) < ((s.r1 + r) - d) ? s.r0 - r : s.r1 + r;
        const k = (tgt - d) / (d || 1); x += dx * k; z += dz * k; moved = true;
      }
    }
    if (!moved) break;
  }
  return [x, z];
}
// is a straight walk from a to b clear of solids at ground level? (sampled; used to place NPC spots and test steps)
function clearAt(x, z, r = 0.4) {
  const y = groundAt(x, z);
  for (const s of solidsNear(x, z, r + 2)) if (s.y1 > y + STEP && s.y0 < y + 1.7 && insideSolid(s, x, z, r)) return false;
  return !inWater(x, z);
}

// ---------- navigation graph ----------
// kind: 'street' (narrow, people only by day), 'road' (carts allowed), 'plaza', 'path' (country)
function addNode(x, z) {
  const gx = Math.floor(x / 8), gz = Math.floor(z / 8);
  for (let a = gx - 1; a <= gx + 1; a++) for (let b = gz - 1; b <= gz + 1; b++) {
    const l = W.ngrid.get(a * 100003 + b); if (!l) continue;
    for (const i of l) { const n = W.nodes[i]; if (dist2(n.x, n.z, x, z) < 3.2 * 3.2) return i; }
  }
  W.nodes.push({ x, z, e: [] });
  const k = gx * 100003 + gz; let l = W.ngrid.get(k); if (!l) W.ngrid.set(k, l = []); l.push(W.nodes.length - 1);
  return W.nodes.length - 1;
}
function addEdge(a, b, o) {
  if (a === b) return -1;
  const A = W.nodes[a], B = W.nodes[b];
  for (const ei of A.e) { const e = W.edges[ei]; if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return ei; }
  const e = { a, b, len: Math.hypot(B.x - A.x, B.z - A.z), hw: o.hw || 2, cw: o.cw, kind: o.kind || 'street', cart: !!o.cart, dens: o.dens == null ? 1 : o.dens, zone: o.zone || 'city', side: o.side == null ? 0.7 : o.side };
  if (e.len < 0.5) return -1;
  W.edges.push(e); const i = W.edges.length - 1; A.e.push(i); B.e.push(i);
  return i;
}
// Is a walk from a to b possible for someone who climbs at most a step at a time, as the player does? Used to take
// out of the graph the edges that would lead people through a wall, a pier, a stair cheek or up a ledge.
function walkable(ax, az, bx, bz) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.4));
  let y = floorAt(ax, az);
  for (let i = 0; i <= n; i++) {
    const x = lerp(ax, bx, i / n), z = lerp(az, bz, i / n);
    y = surfaceAt(x, z, y);
    for (const s of solidsNear(x, z, 0.5)) if (s.y1 > y + STEP && s.y0 < y + 1.7 && insideSolid(s, x, z, 0.2)) return false;
  }
  return true;
}
function pruneNav() {
  // a node inside a wall or a podium moves out to its edge first
  for (const N of W.nodes) if (!clearAt(N.x, N.z, 0.3)) [N.x, N.z] = collideCircle(N.x, N.z, 0.45, floorAt(N.x, N.z));
  for (const e of W.edges) { const A = W.nodes[e.a], B = W.nodes[e.b]; e.len = Math.max(0.5, Math.hypot(B.x - A.x, B.z - A.z)); }
  let n = 0;
  W.edges.forEach((e, i) => {
    const A = W.nodes[e.a], B = W.nodes[e.b];
    if (walkable(A.x, A.z, B.x, B.z) && walkable(B.x, B.z, A.x, A.z)) return;
    e.off = true; A.e = A.e.filter((k) => k !== i); B.e = B.e.filter((k) => k !== i); n++;
  });
  return n;
}
// long segments are split every ~36 m so spawning and route choice work along country roads too
function addPath(pts, o) {
  let prev = addNode(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 36));
    for (let k = 1; k <= n; k++) { const q = addNode(lerp(ax, bx, k / n), lerp(az, bz, k / n)); addEdge(prev, q, o); prev = q; }
  }
}
// nearest node to a point (linear scan of the grid around it, widening)
function nearestNode(x, z, maxR = 80) {
  let best = -1, bd = maxR * maxR;
  const R8 = Math.ceil(maxR / 8), gx = Math.floor(x / 8), gz = Math.floor(z / 8);
  for (let a = gx - R8; a <= gx + R8; a++) for (let b = gz - R8; b <= gz + R8; b++) {
    const l = W.ngrid.get(a * 100003 + b); if (!l) continue;
    for (const i of l) { const n = W.nodes[i], d = dist2(n.x, n.z, x, z); if (d < bd) { bd = d; best = i; } }
  }
  return best;
}

// ---------- streets ----------
// A paved street along a polyline: basalt carriageway, kerbs and raised pavements on both sides.
// o: { w carriageway width, side pavement width, kind, cart, dens, zone, nav (default true), pave ('basalt'|'earth'|'trav'|'gravel'), trim0, trim1 }
function street(pts, o) {
  const w = o.w || 5, sw = o.side == null ? 1.4 : o.side, pave = o.pave || 'basalt';
  const gb = gbAt('city', pts[0][0], pts[0][1]);
  const col = pave === 'basalt' ? C.basalt : pave === 'trav' ? C.trav : pave === 'gravel' ? 0xa89878 : 0x9a8462;
  const yo = o.yo || 0.05;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az); if (L < 0.1) continue;
    const dx = (bx - ax) / L, dz = (bz - az) / L, nx = -dz, nz = dx;
    const t0 = i === 0 ? (o.trim0 || 0) : 0, t1 = i === pts.length - 2 ? (o.trim1 || 0) : 0;
    const n = Math.max(1, Math.ceil(L / 6));
    const gbs = gbAt('city', (ax + bx) / 2, (az + bz) / 2);
    for (let k = 0; k < n; k++) {
      const s0 = (k / n) * L, s1 = ((k + 1) / n) * L;
      const P = (s, off, up) => { const x = ax + dx * s + nx * off, z = az + dz * s + nz * off; return [x, groundAt(x, z) + yo + up, z]; };
      const hw = w / 2;
      _upQuad(gbs, P(s0, -hw, 0), P(s1, -hw, 0), P(s1, hw, 0), P(s0, hw, 0), col);
      if (sw > 0) {
        const a0 = Math.max(s0, t0), a1 = Math.min(s1, L - t1);
        if (a1 > a0) for (const sg of [-1, 1]) {
          const i0 = sg * hw, o0 = sg * (hw + sw);
          _upQuad(gbs, P(a0, i0, 0.16), P(a1, i0, 0.16), P(a1, o0, 0.16), P(a0, o0, 0.16), C.kerb);
          // kerb face, the outer edge, and the ends where the walk stops (at a trim, a bend or the end of the street)
          const kc = shadeHex(C.kerb, 0.8), mid = [ax + dx * (a0 + a1) / 2 + nx * (i0 + o0) / 2, P(a0, i0, 0)[1] + 0.08, az + dz * (a0 + a1) / 2 + nz * (i0 + o0) / 2];
          gbs.quad(P(a0, i0, 0), P(a1, i0, 0), P(a1, i0, 0.16), P(a0, i0, 0.16), kc, mid);
          gbs.quad(P(a0, o0, -0.1), P(a1, o0, -0.1), P(a1, o0, 0.16), P(a0, o0, 0.16), kc, mid);
          if (k === 0 || a0 > s0) gbs.quad(P(a0, i0, 0), P(a0, o0, -0.1), P(a0, o0, 0.16), P(a0, i0, 0.16), kc, mid);
          if (k === n - 1 || a1 < s1) gbs.quad(P(a1, i0, 0), P(a1, o0, -0.1), P(a1, o0, 0.16), P(a1, i0, 0.16), kc, mid);
        }
      }
    }
  }
  mapLine(pts, w + sw * 2, pave === 'basalt' ? '#7d766a' : '#a8956f');
  if (o.res !== false) for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), hw = w / 2 + sw + 0.8;
    for (let s = 0; s <= L; s += RS * 0.5) for (let q = -hw; q <= hw; q += RS * 0.5) { const t = s / (L || 1); _resMark(lerp(ax, bx, t) - (bz - az) / (L || 1) * q, lerp(az, bz, t) + (bx - ax) / (L || 1) * q, 2); }
  }
  if (o.nav !== false) addPath(pts, { cw: sw > 0 ? w / 2 : 99, hw: w / 2 + sw * 0.6, kind: o.kind || 'street', cart: o.cart, dens: o.dens, zone: o.zone, side: o.sideFrac });
}
function _upQuad(gb, a, b, c, d, hex) {
  // wind so the face points up
  const ux = b[0] - a[0], uz = b[2] - a[2], vx = c[0] - a[0], vz = c[2] - a[2];
  if (uz * vx - ux * vz < 0) gb.quad(a, d, c, b, hex); else gb.quad(a, b, c, d, hex);
}
// a flat paved area in frame F (rectangle hu × hv half sizes) with slab jitter
function pavement(F, u, v, w, d, hex, o = {}) {
  const gb = gbF(o.layer || 'city', F), slab = o.slab || 3;
  const nu = Math.max(1, Math.round(w / slab)), nv = Math.max(1, Math.round(d / slab));
  const y = o.y;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u0 = u - w / 2 + (i / nu) * w, u1 = u - w / 2 + ((i + 1) / nu) * w, v0 = v - d / 2 + (j / nv) * d, v1 = v - d / 2 + ((j + 1) / nv) * d;
    const P = (uu, vv) => { const x = F.wx(uu, vv), z = F.wz(uu, vv); return [x, (y != null ? F.y + y : groundAt(x, z)) + (o.yo || 0.06), z]; };
    const c = shadeHex(hex, 0.93 + hash2(i, j, 5) * 0.12);
    _upQuad(gb, P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), c);
  }
}

// ---------- places ----------
// kind: 'landmark' (counts toward the journal), 'district' (banner only), 'scene' (everyday life, counts too)
function place(id, name, latin, x, z, r, kind = 'landmark', o = {}) {
  const p = Object.assign({ id, name, latin, x, z, r, kind, found: false }, o);
  W.places.push(p); return p;
}
// a placard: an information point the player can read with E. The text lives in PLACARD_TEXT (12_text.js).
function placard(id, x, z, y = null, o = {}) {
  const gy = groundAt(x, z);
  const p = Object.assign({ id, x, z, y: y == null ? gy + 1.25 : y, read: false }, o);
  if (y == null) { // a marble post with a bronze plate, like a titulus
    const S = new Frame(x, z, Math.atan2(x - 0, z - 0), gy), g = gbAt('prop', x, z);
    K.box(g, S, 0, 0, 0, 0.32, 1.0, 0.24, C.marble2, { solid: true });
    K.box(g, S, 0, 1.0, 0, 0.5, 0.08, 0.36, C.marble);
    K.box(g, S, 0, 1.08, 0, 0.42, 0.03, 0.3, 0x8a6a3a);
  }
  W.placards.push(p); return p;
}

// ---------- finalize: one mesh per layer and cell ----------
function finalizeWorld() {
  for (const c of W.cells.values()) {
    if (!c.gb.n) continue;
    const L = LAYERS[c.layer];
    const mesh = new THREE.Mesh(c.gb.geometry(), R.mat[L.mat]);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = L.cast; mesh.receiveShadow = c.layer !== 'glow';
    mesh.userData = { layer: c.layer, cx: (c.cx + 0.5) * CELL, cz: (c.cz + 0.5) * CELL, r: mesh.geometry.boundingSphere.radius, ctr: mesh.geometry.boundingSphere.center };
    R.scene.add(mesh); W.meshes.push(mesh);
    c.gb = null;
  }
  W.cells.clear();
  makeMarkers();
  // text decals
  for (const d of DECALS) {
    const tex = new THREE.CanvasTexture(textCanvas(d.lines, d.o));
    tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), new THREE.MeshLambertMaterial({ map: tex, transparent: !!d.o.alpha }));
    const fac = d.o.face == null ? -1 : d.o.face;
    if (d.o.floor) { // lying on the floor, reading as you walk in along +v
      m.position.set(d.F.wx(d.u, d.v), d.F.y + d.y, d.F.wz(d.u, d.v));
      m.rotation.set(-Math.PI / 2, d.F.yaw + Math.PI, 0, 'YXZ');
    } else {
      m.position.set(d.F.wx(d.u, d.v), d.F.y + d.y + d.h / 2, d.F.wz(d.u, d.v));
      m.rotation.y = d.F.yaw + (fac < 0 ? Math.PI : 0) + (d.o.ry || 0);
    }
    m.receiveShadow = true;
    m.userData = { layer: 'prop', cx: m.position.x, cz: m.position.z, r: d.w };
    R.scene.add(m); W.meshes.push(m);
  }
}
// floating marks over the placards you haven't read, when you're near
function makeMarkers() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(20,14,8,0.55)'; g.beginPath(); g.arc(32, 32, 28, 0, TAU); g.fill();
  g.strokeStyle = '#d9b24a'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 25, 0, TAU); g.stroke();
  g.fillStyle = '#f0d890'; g.font = 'bold 38px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('i', 32, 34);
  const tex = new THREE.CanvasTexture(cv);
  W.markMat = [new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }), new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.35 })];
  for (const p of W.placards) {
    const s = new THREE.Sprite(W.markMat[0]); s.position.set(p.x, p.y + 0.85, p.z); s.scale.set(0.42, 0.42, 1); s.visible = false; s.renderOrder = 5;
    R.scene.add(s); p.sprite = s;
  }
}
function updateMarkers(t) {
  for (const p of W.placards) {
    const d = Math.hypot(p.x - PL.x, p.z - PL.z), s = p.sprite;
    s.visible = d < 26 && !(PL.target && PL.target.p === p);
    if (!s.visible) continue;
    s.material = W.markMat[p.read ? 1 : 0];
    s.position.y = p.y + 0.85 + Math.sin(t * 2 + p.x) * 0.06;
  }
}
// distance culling by layer; run each frame
function updateCells(cx, cz) {
  for (const m of W.meshes) {
    const u = m.userData, L = LAYERS[u.layer];
    const c = u.ctr || { x: u.cx, z: u.cz };
    const d = Math.hypot(c.x - cx, c.z - cz) - u.r;
    m.visible = d < L.dist();
  }
}
