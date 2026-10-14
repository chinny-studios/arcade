// Ashreach — world runtime: zone registry and loading, heightfield terrain, batched static geometry, colliders, props, map

// Zone definitions live in ZONE_DEFS (filled by 09_zones, 10_city, 11_interior and registerZone).
// A def may carry a private `build(def)` that adds the zone's geometry using the wd* builders below.
const ZONE_DEFS = {};
let ZONE = null;
const zoneRoot = new THREE.Group();
zoneRoot.name = 'zoneRoot';
scene.add(zoneRoot);

// ---------- shared materials (never disposed) ----------
const WD_MAT = {
  lit: new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 10, specular: 0x101010 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  prop: new THREE.MeshLambertMaterial({ vertexColors: true }),
  propGlow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  terrain: new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 0, specular: 0 }),
  water: new THREE.MeshPhongMaterial({ color: 0x2c6684, specular: 0x8899aa, shininess: 70, transparent: true, opacity: 0.8, depthWrite: false }),
};
WD_MAT.lit.name = 'wd-lit'; WD_MAT.glow.name = 'wd-glow';
// Terrain: subtle world-space grain plus a per-vertex glow channel (lumen veins).
WD_MAT.terrain.onBeforeCompile = (sh) => {
  sh.vertexShader = 'attribute float aGlow;\nvarying float vGlow;\nvarying vec3 vWP_;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vGlow = aGlow; vWP_ = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
  sh.fragmentShader = `varying float vGlow; varying vec3 vWP_;
  float wh_(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wn_(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(wh_(i), wh_(i + vec2(1.0, 0.0)), f.x), mix(wh_(i + vec2(0.0, 1.0)), wh_(i + vec2(1.0, 1.0)), f.x), f.y); }
  ` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
    { vec2 p = vWP_.xz; float n = wn_(p * 0.21) * 0.55 + wn_(p * 0.9) * 0.3 + wn_(p * 3.1) * 0.15; diffuseColor.rgb *= 0.9 + 0.2 * n; }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    totalEmissiveRadiance += diffuseColor.rgb * vGlow * 1.6;`);
};
WD_MAT.terrain.customProgramCacheKey = () => 'wd-terrain';

// A small pool of point lights lives in the scene permanently (so shader programs never change);
// updateZone hands them to the light spots nearest the camera.
const WD_LIGHTS = [];
for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 20, 2); scene.add(l); WD_LIGHTS.push(l); }

// ---------- per-zone state ----------
const WD = {
  t: 0, def: null, hf: null, tiles: null, cols: [], grid: new Map(), floors: [], bat: new Map(), anims: [], spots: [],
  bounds: { x0: -100, z0: -100, x1: 100, z1: 100 }, waterY: -1e9, deepY: -1e9, roads: [], clear: [], motes: null, stamp: 0,
  mapCache: {}, lightT: 0, maxSlope: 1.25,
};
const WD_CELL = 16, WD_CH = 320;

// ---------- colours ----------
const wd_cc = new Map();
// sRGB hex -> linear [r,g,b] (vertex colours are linear).
function wdC(h) {
  if (typeof h !== 'number') return h;
  let c = wd_cc.get(h);
  if (!c) { const k = new THREE.Color(h).convertSRGBToLinear(); c = [k.r, k.g, k.b]; wd_cc.set(h, c); }
  return c;
}
const wdMix = (a, b, t) => { a = wdC(a); b = wdC(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
const wdMul = (a, k) => { a = wdC(a); return [a[0] * k, a[1] * k, a[2] * k]; };
const wdYaw = (dx, dz) => Math.atan2(dx, dz);   // yaw that faces direction (dx, dz)

// (Shared by 09-11.) Local -> world helper for a structure at (cx, cz) facing yaw (its front is local +z).
function ctFrame(cx, cz, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
}
// Door record for a building whose front faces `frontYaw`, depth d: a point just outside the door, yaw pointing
// away from the building (so x + sin(yaw) * k is further out in the street).
function ctDoorRec(id, cx, cz, frontYaw, d = 10) {
  const k = d / 2 + 1.2;
  return { id, x: cx + Math.sin(frontYaw) * k, z: cz + Math.cos(frontYaw) * k, yaw: angWrap(frontYaw), bx: cx, bz: cz, by: frontYaw, bd: d };
}

// ---------- batched static geometry ----------
// Everything static is merged into one mesh per (material, 200 m chunk): few draw calls, still culled.
function wd_bat(mat, x, z) {
  const k = mat + ':' + Math.floor(x / WD_CH) + ',' + Math.floor(z / WD_CH);
  let b = WD.bat.get(k);
  if (!b) WD.bat.set(k, b = { mat, p: [], n: [], c: [] });
  return b;
}
function wd_tri(b, a, c, d, C, nx, ny, nz) {
  b.p.push(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  b.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  b.c.push(C[0], C[1], C[2], C[0], C[1], C[2], C[0], C[1], C[2]);
}
// Convex polygon (array of [x,y,z]); `ctr` (optional) fixes the winding so the face points away from it.
function wdPoly(mat, pts, col, ctr) {
  const C = wdC(col);
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  let L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
  let flip = false;
  if (ctr) {
    let cx = 0, cy = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
    cx = cx / pts.length - ctr[0]; cy = cy / pts.length - ctr[1]; cz = cz / pts.length - ctr[2];
    if (nx * cx + ny * cy + nz * cz < 0) { flip = true; nx = -nx; ny = -ny; nz = -nz; }
  }
  const b = wd_bat(mat, pts[0][0], pts[0][2]);
  for (let i = 1; i < pts.length - 1; i++) {
    if (flip) wd_tri(b, pts[0], pts[i + 1], pts[i], C, nx, ny, nz);
    else wd_tri(b, pts[0], pts[i], pts[i + 1], C, nx, ny, nz);
  }
}
const WD_BOXF = [[4, 7, 6, 5], [0, 1, 2, 3], [3, 2, 6, 7], [1, 0, 4, 5], [2, 1, 5, 6], [0, 3, 7, 4]];
// Box: centre x/z, bottom y, size w (x) h d (z), rotated by yaw. topCol tints the lid; bottom face skipped.
function wdBox(x, y, z, w, h, d, col, yaw = 0, mat = 'lit', topCol, skipBottom = true) {
  const c = Math.cos(yaw), s = Math.sin(yaw), hw = w / 2, hd = d / 2;
  const P = [];
  for (const [lx, ly, lz] of [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd], [-hw, h, -hd], [hw, h, -hd], [hw, h, hd], [-hw, h, hd]])
    P.push([x + lx * c + lz * s, y + ly, z - lx * s + lz * c]);
  const C = wdC(col), T = topCol !== undefined ? wdC(topCol) : C;
  const b = wd_bat(mat, x, z);
  for (let f = 0; f < 6; f++) {
    if (f === 1 && skipBottom) continue;
    const q = WD_BOXF[f], A = P[q[0]], B = P[q[1]], D = P[q[2]];
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = D[0] - A[0], vy = D[1] - A[1], vz = D[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1;
    const cc = f === 0 ? T : C;
    wd_tri(b, A, B, D, cc, nx / L, ny / L, nz / L);
    wd_tri(b, A, D, P[q[3]], cc, nx / L, ny / L, nz / L);
  }
}
// n-sided prism / frustum / cone (rt = 0), bottom at y.
function wdPrism(x, y, z, rb, rt, h, n, col, yaw = 0, mat = 'lit', topCol, caps = true) {
  const B = [], T = [];
  for (let i = 0; i < n; i++) {
    const a = yaw + (i / n) * TAU;
    B.push([x + Math.cos(a) * rb, y, z + Math.sin(a) * rb]);
    T.push([x + Math.cos(a) * rt, y + h, z + Math.sin(a) * rt]);
  }
  const ctr = [x, y + h / 2, z];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (rt < 0.001) wdPoly(mat, [B[i], B[j], T[i]], col, ctr);
    else wdPoly(mat, [B[i], B[j], T[j], T[i]], col, ctr);
  }
  if (caps && rt >= 0.001) wdPoly(mat, T, topCol !== undefined ? topCol : col, ctr);
}
// Gabled roof over a w x d footprint (ridge along x before yaw).
function wdGable(x, y, z, w, d, h, col, yaw = 0, mat = 'lit', endCol) {
  const c = Math.cos(yaw), s = Math.sin(yaw), hw = w / 2, hd = d / 2;
  const P = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  const ctr = [x, y + h * 0.3, z];
  wdPoly(mat, [P(-hw, 0, -hd), P(hw, 0, -hd), P(hw, h, 0), P(-hw, h, 0)], col, ctr);
  wdPoly(mat, [P(-hw, 0, hd), P(hw, 0, hd), P(hw, h, 0), P(-hw, h, 0)], col, ctr);
  wdPoly(mat, [P(-hw, 0, -hd), P(-hw, 0, hd), P(-hw, h, 0)], endCol !== undefined ? endCol : col, ctr);
  wdPoly(mat, [P(hw, 0, -hd), P(hw, 0, hd), P(hw, h, 0)], endCol !== undefined ? endCol : col, ctr);
}
// A beam between two 3D points with square section t.
function wdBeam(a, b, t, col, mat = 'lit') {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
  if (L < 1e-4) return;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromUnitVectors(UP, _v1.set(dx / L, dy / L, dz / L));
  m.compose(_v2.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, _v3.set(t, L, t));
  wdGeo(wd_unitBox(), m, col, mat);
}
// Rotated box about its centre (yaw, then pitch about local x, then roll about local z): wrecks, rubble, ribs.
function wdTBox(cx, cy, cz, w, h, d, col, yaw = 0, pitch = 0, roll = 0, mat = 'lit') {
  _e1.set(pitch, yaw, roll, 'YXZ');
  const m = new THREE.Matrix4().compose(_v2.set(cx, cy, cz), _q1.setFromEuler(_e1), _v3.set(w, h, d));
  _e1.order = 'XYZ';
  wdGeo(wd_unitBox(), m, col, mat);
}
let wd_ub = null;
function wd_unitBox() { return wd_ub || (wd_ub = new THREE.BoxGeometry(1, 1, 1).toNonIndexed()); }
// Append any (non-indexed) THREE geometry, transformed by a Matrix4.
function wdGeo(geo, m, col, mat = 'lit') {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const P = g.attributes.position, C = wdC(col), VC = g.attributes.color;
  const e = m.elements;
  const b = wd_bat(mat, e[12], e[14]);
  const a = [0, 0, 0], bb = [0, 0, 0], d = [0, 0, 0];
  for (let i = 0; i < P.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      _v4.set(P.getX(i + k), P.getY(i + k), P.getZ(i + k)).applyMatrix4(m);
      const o = k === 0 ? a : k === 1 ? bb : d; o[0] = _v4.x; o[1] = _v4.y; o[2] = _v4.z;
    }
    _v5.set(bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]).cross(_v6.set(d[0] - a[0], d[1] - a[1], d[2] - a[2])).normalize();
    const cc = VC ? [VC.getX(i) * C[0], VC.getY(i) * C[1], VC.getZ(i) * C[2]] : C;
    wd_tri(b, a.slice(), bb.slice(), d.slice(), cc, _v5.x, _v5.y, _v5.z);
  }
}
function wdFinishBatches() {
  for (const b of WD.bat.values()) {
    if (!b.p.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, b.mat === 'glow' ? WD_MAT.glow : WD_MAT.lit);
    m.castShadow = b.mat === 'lit';   // 'flat' = lit but casts no shadow (paving, decals, floors)
    m.receiveShadow = b.mat !== 'glow';
    m.matrixAutoUpdate = false;
    zoneRoot.add(m);
  }
  WD.bat.clear();
}

// ---------- colliders ----------
// box: axis-aligned {x0,z0,x1,z1}; obb: centre, half extents, yaw; cyl: circle. y0/y1 for line of sight.
function wd_addCol(c) {
  WD.cols.push(c);
  for (let gx = Math.floor(c.bx0 / WD_CELL); gx <= Math.floor(c.bx1 / WD_CELL); gx++)
    for (let gz = Math.floor(c.bz0 / WD_CELL); gz <= Math.floor(c.bz1 / WD_CELL); gz++) {
      const k = (gx + 2048) * 4096 + gz + 2048;
      let l = WD.grid.get(k);
      if (!l) WD.grid.set(k, l = []);
      l.push(c);
    }
  return c;
}
function wdColBox(x0, z0, x1, z1, y0 = -5, y1 = 50) {
  return wd_addCol({ t: 0, x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y0, y1, bx0: Math.min(x0, x1), bz0: Math.min(z0, z1), bx1: Math.max(x0, x1), bz1: Math.max(z0, z1), s: 0 });
}
function wdColObb(cx, cz, w, d, yaw, y0 = -5, y1 = 50) {
  const q = ((yaw % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
  if (q < 0.01 || q > Math.PI / 2 - 0.01) {
    const sw = Math.abs(Math.round(Math.cos(yaw))) ? w : d, sd = sw === w ? d : w;
    return wdColBox(cx - sw / 2, cz - sd / 2, cx + sw / 2, cz + sd / 2, y0, y1);
  }
  const c = Math.cos(yaw), s = Math.sin(yaw), ex = Math.abs(c) * w / 2 + Math.abs(s) * d / 2, ez = Math.abs(s) * w / 2 + Math.abs(c) * d / 2;
  return wd_addCol({ t: 1, cx, cz, hx: w / 2, hz: d / 2, c, s, y0, y1, bx0: cx - ex, bz0: cz - ez, bx1: cx + ex, bz1: cz + ez, st: 0 });
}
function wdColCyl(x, z, r, y0 = -5, y1 = 50) {
  return wd_addCol({ t: 2, x, z, r, y0, y1, bx0: x - r, bz0: z - r, bx1: x + r, bz1: z + r, st: 0 });
}
// Solid box: visual + collider.
function wdSolid(x, y, z, w, h, d, col, yaw = 0, topCol, mat = 'lit') {
  wdBox(x, y, z, w, h, d, col, yaw, mat, topCol);
  wdColObb(x, z, w, d, yaw, y, y + h);
}
// Raised walkable rectangle (pads, decks): groundY returns at least y inside it.
function wdFloor(x0, z0, x1, z1, y) { WD.floors.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y }); }
// Point light spot (the shared pool picks the nearest few each frame).
function wdLight(x, y, z, color = 0xffd8a0, int = 1.2, dist = 18) { const s = { x, y, z, color: new THREE.Color(color), int, dist }; WD.spots.push(s); return s; }
// Keep props off a circle (roads and POIs are cleared automatically).
function wdKeepClear(x, z, r) { WD.clear.push({ x, z, r }); }
function wdIsClear(x, z, pad = 0) {
  for (const c of WD.clear) { const dx = x - c.x, dz = z - c.z, r = c.r + pad; if (dx * dx + dz * dz < r * r) return false; }
  return true;
}

// ---------- roads ----------
// def.roads: [{ pts: [[x,z],...], w }]
function wdRoadDist(x, z, roads = WD.roads) {
  let best = 1e9;
  for (const R of roads) {
    const P = R.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], az = P[i][1], bx = P[i + 1][0], bz = P[i + 1][1];
      const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
      const t = clamp(((x - ax) * vx + (z - az) * vz) / L2, 0, 1);
      const d = Math.hypot(x - ax - vx * t, z - az - vz * t) - (R.w || 8) / 2;
      if (d < best) best = d;
    }
  }
  return best;
}

// ---------- heightfield terrain ----------
// o: { cell, margin, height(x,z), color(x,y,z,ny,out[4]), flats: [{x,z,r,h?,fall?}], edge: {h, w}, roadCol, roadFlat }
function wdTerrain(o) {
  const def = WD.def, half = def.size / 2 + (o.margin ?? 160);
  const N = Math.ceil((half * 2) / (o.cell || 8)), cell = (half * 2) / N, W = N + 1;
  const H = new Float32Array(W * W), RD = new Float32Array(W * W);
  const flats = o.flats || [];
  for (const f of flats) if (f.h === undefined) f.h = o.height(f.x, f.z);
  const exits = def.exits || [], ed = o.edge, hs = def.size / 2;
  const roads = WD.roads;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const x = -half + i * cell, z = -half + j * cell, k = j * W + i;
    let h = o.height(x, z);
    for (const f of flats) {
      const d = Math.hypot(x - f.x, z - f.z), fall = f.fall ?? 40;
      if (d < f.r + fall) h = lerp(h, f.h, 1 - smooth(f.r, f.r + fall, d));
    }
    if (ed) {
      const e = hs - Math.max(Math.abs(x), Math.abs(z));
      let k2 = 1 - smooth(0, ed.w, e);
      if (k2 > 0) {
        let g = 0;
        for (const x2 of exits) g = Math.max(g, 1 - smooth(ed.gap || 40, (ed.gap || 40) + 70, Math.hypot(x - x2.x, z - x2.z)));
        h += ed.h * k2 * (0.55 + 0.9 * ridged(x * 0.008, z * 0.008, 3)) * (1 - g) + Math.max(0, -e) * 0.6 * (1 - g);
      }
    }
    H[k] = h;
    RD[k] = roads.length ? wdRoadDist(x, z) : 1e9;
  }
  // roads: smooth the bumps away
  if (roads.length && o.roadFlat !== false) {
    for (let pass = 0; pass < 2; pass++) {
      const H2 = H.slice();
      for (let j = 2; j < W - 2; j++) for (let i = 2; i < W - 2; i++) {
        const k = j * W + i;
        if (RD[k] > 6) continue;
        let s = 0;
        for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) s += H2[k + b * W + a];
        H[k] = lerp(s / 25, H2[k], smooth(0, 6, RD[k]));
      }
    }
  }
  const hf = WD.hf = { x0: -half, cell, N, W, H, half, C: new Float32Array(W * W * 3) };
  // colours and mesh
  const NOR = new Float32Array(W * W * 3), COL = hf.C, GLW = new Float32Array(W * W);
  const out = [0, 0, 0, 0], rc = wdC(o.roadCol || 0x9a8466);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, x = -half + i * cell, z = -half + j * cell, y = H[k];
    const hl = H[j * W + Math.max(i - 1, 0)], hr = H[j * W + Math.min(i + 1, N)];
    const hd = H[Math.max(j - 1, 0) * W + i], hu = H[Math.min(j + 1, N) * W + i];
    let nx = hl - hr, ny = 2 * cell, nz = hd - hu; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    NOR[k * 3] = nx; NOR[k * 3 + 1] = ny; NOR[k * 3 + 2] = nz;
    out[3] = 0;
    o.color(x, y, z, ny, out);
    let r = out[0], g = out[1], b = out[2];
    if (RD[k] < 2) {
      const t = (1 - smooth(-2, 2, RD[k])) * (0.75 + 0.25 * vnoise(x * 0.3, z * 0.3));
      r = lerp(r, rc[0], t); g = lerp(g, rc[1], t); b = lerp(b, rc[2], t);
    }
    const jt = 0.94 + hash2(i * 7 + 3, j * 13 + 1) * 0.12;
    COL[k * 3] = r * jt; COL[k * 3 + 1] = g * jt; COL[k * 3 + 2] = b * jt;
    GLW[k] = out[3];
  }
  const CS = Math.max(8, Math.round((o.chunk || 320) / cell));
  for (let cz = 0; cz < N; cz += CS) for (let cx = 0; cx < N; cx += CS) {
    const nx = Math.min(CS, N - cx), nz = Math.min(CS, N - cz), vx = nx + 1, vz = nz + 1;
    const pos = new Float32Array(vx * vz * 3), nor = new Float32Array(vx * vz * 3), col = new Float32Array(vx * vz * 3), glw = new Float32Array(vx * vz);
    for (let j = 0; j < vz; j++) for (let i = 0; i < vx; i++) {
      const gi = cx + i, gj = cz + j, k = gj * W + gi, q = j * vx + i;
      pos[q * 3] = -half + gi * cell; pos[q * 3 + 1] = H[k]; pos[q * 3 + 2] = -half + gj * cell;
      for (let c = 0; c < 3; c++) { nor[q * 3 + c] = NOR[k * 3 + c]; col[q * 3 + c] = COL[k * 3 + c]; }
      glw[q] = GLW[k];
    }
    const idx = new (vx * vz > 65535 ? Uint32Array : Uint16Array)(nx * nz * 6);
    let n = 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = j * vx + i, b = a + 1, d = a + vx, e = d + 1;
      idx[n++] = a; idx[n++] = e; idx[n++] = b; idx[n++] = a; idx[n++] = d; idx[n++] = e;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aGlow', new THREE.BufferAttribute(glw, 1));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, WD_MAT.terrain);
    m.receiveShadow = true; m.matrixAutoUpdate = false;
    zoneRoot.add(m);
  }
  return hf;
}
// Exact height of the rendered triangles.
function wdTerrainH(x, z) {
  const hf = WD.hf;
  let fx = (x - hf.x0) / hf.cell, fz = (z - hf.x0) / hf.cell;
  fx = fx < 0 ? 0 : fx > hf.N - 1e-4 ? hf.N - 1e-4 : fx;
  fz = fz < 0 ? 0 : fz > hf.N - 1e-4 ? hf.N - 1e-4 : fz;
  const ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, W = hf.W, k = iz * W + ix, H = hf.H;
  const h00 = H[k], h10 = H[k + 1], h01 = H[k + W], h11 = H[k + W + 1];
  return u > v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h01 - h00) * v + (h11 - h01) * u;
}
function wdWater(y, color, size = 6000, x = 0, z = 0, opacity = 0.8, level = true) {
  const g = typeof size === 'number' ? new THREE.PlaneGeometry(size, size, 1, 1).rotateX(-Math.PI / 2) : size;
  const mat = WD_MAT.water.clone();
  mat.color.set(color); mat.opacity = opacity;
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z); m.receiveShadow = true; m.renderOrder = 2;
  m.userData.ownMat = true;
  zoneRoot.add(m);
  if (level) WD.waterY = Math.max(WD.waterY, y);
  WD.anims.push((t) => { m.position.y = y + Math.sin(t * 0.7) * 0.06; });
  return m;
}

// ---------- instanced props ----------
const WD_PROPS = {};
// Prop prototypes are unit-sized and shared by every zone (registered by 09/10/11 with wdDefProp).
const WD_PROTO = {};
function wdDefProp(kind, fn) { WD_PROTO[kind] = fn; }
function wdProp(kind) {
  let p = WD_PROPS[kind];
  if (!p) {
    const r = WD_PROTO[kind]();
    p = WD_PROPS[kind] = Object.assign({ glow: false, cast: true, col: 0, sink: 0 }, r);
  }
  return p;
}
// items: [{ x, z, y?, s, sx?, sy?, sz?, yaw?, tilt?, tint?, glowTint?, col: 0 (no collider) }].
// Chunked so off-screen instances are culled. Protos with `geoGlow` get a second, unlit instanced mesh.
function wdScatter(kind, items, o = {}) {
  if (!items.length) return;
  const P = wdProp(kind), CH = 640;
  const groups = new Map();
  for (const it of items) {
    it.gy = it.y ?? groundY(it.x, it.z);
    const k = Math.floor(it.x / CH) * 1000 + Math.floor(it.z / CH);
    let l = groups.get(k);
    if (!l) groups.set(k, l = []);
    l.push(it);
    const s = it.s || 1;
    if (P.col && it.col !== 0 && (o.collide ?? true)) wdColCyl(it.x, it.z, P.col * s * (it.cs ?? 1), it.gy - 1, it.gy + (P.colH ?? P.h ?? 2) * (it.sy ?? s)).nomap = !P.map;
  }
  const c = new THREE.Color();
  const mk = (geo0, mat, list, glow) => {
    const geo = new THREE.BufferGeometry();
    for (const a in geo0.attributes) geo.setAttribute(a, geo0.attributes[a]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      const s = it.s || 1, sy = it.sy ?? s;
      const y = it.gy - (P.sink || 0) * sy;
      _e1.set(it.tilt ? (hash2(i, 3) - 0.5) * it.tilt : 0, it.yaw ?? hash2(it.x * 13 | 0, it.z * 7 | 0) * TAU, it.tilt ? (hash2(i, 5) - 0.5) * it.tilt : 0);
      _m4.compose(_v1.set(it.x, y, it.z), _q1.setFromEuler(_e1), _v2.set(it.sx ?? s, sy, it.sz ?? s));
      m.setMatrixAt(i, _m4);
      const tn = glow ? (it.glowTint ?? null) : (it.tint ?? null);
      const tc = tn !== null ? wdC(tn) : null, j = glow ? 1 : it.j ?? (0.86 + hash2(i * 3 + 1, it.x | 0) * 0.28);
      m.setColorAt(i, tc ? c.setRGB(tc[0] * j, tc[1] * j, tc[2] * j) : c.setRGB(j, j, j));
      const ss = Math.max(s, it.sx || 0, it.sz || 0);
      x0 = Math.min(x0, it.x - ss * 2); x1 = Math.max(x1, it.x + ss * 2); z0 = Math.min(z0, it.z - ss * 2); z1 = Math.max(z1, it.z + ss * 2);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y + sy * (P.h || 2));
    });
    geo.boundingSphere = new THREE.Sphere(new V3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 4);
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = !glow && (o.cast ?? P.cast); m.receiveShadow = !glow;
    zoneRoot.add(m);
  };
  for (const list of groups.values()) {
    if (P.geo) mk(P.geo, P.glow ? WD_MAT.propGlow : WD_MAT.prop, list, P.glow);
    if (P.geoGlow) mk(P.geoGlow, WD_MAT.propGlow, list, true);
  }
}
// Random scatter helper: n attempts in a rect (or circle), keeping off roads/clear zones; fn(x,z,rng) returns an item or null.
function wdSpread(rng, n, area, fn, pad = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let x, z;
    if (area.r) { const a = rng.f() * TAU, r = Math.sqrt(rng.f()) * area.r; x = area.x + Math.sin(a) * r; z = area.z + Math.cos(a) * r; }
    else { x = rng.r(area.x0, area.x1); z = rng.r(area.z0, area.z1); }
    if (!wdIsClear(x, z, pad) || (WD.roads.length && wdRoadDist(x, z) < pad + 1)) continue;
    const it = fn(x, z, rng);
    if (it) out.push(it);
  }
  return out;
}

// ---------- ambient motes (dust, spores, embers) ----------
let wd_dot = null;
function wd_dotTex() {
  if (wd_dot) return wd_dot;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (wd_dot = new THREE.CanvasTexture(c));
}
function wdMotes(o) {
  const n = o.n || 400, R = o.r || 60;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * R * 2; pos[i * 3 + 1] = Math.random() * (o.h || 20); pos[i * 3 + 2] = (Math.random() - 0.5) * R * 2; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: o.color || 0xffffff, size: o.size || 0.25, map: wd_dotTex(), alphaTest: 0.01, transparent: true, opacity: o.opacity ?? 0.6, depthWrite: false, sizeAttenuation: true, fog: true });
  if (o.glow) mat.blending = THREE.AdditiveBlending;
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.userData.ownMat = true;
  zoneRoot.add(pts);
  WD.motes = { pts, R, H: o.h || 20, vy: o.vy ?? 0.1, drift: o.drift ?? 0.6, base: pos.slice() };
}
function wd_updMotes(t) {
  const M = WD.motes; if (!M) return;
  const P = M.pts.geometry.attributes.position, B = M.base, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, R = M.R, D = R * 2;
  for (let i = 0; i < P.count; i++) {
    const bx = B[i * 3] + Math.sin(t * 0.3 + i) * M.drift * 3 + t * M.drift, bz = B[i * 3 + 2] + Math.cos(t * 0.27 + i * 1.7) * M.drift * 3;
    let x = ((bx - cx) % D + D * 1.5) % D - R, z = ((bz - cz) % D + D * 1.5) % D - R;
    let y = ((B[i * 3 + 1] + t * M.vy - cy + M.H * 0.3) % M.H + M.H) % M.H - M.H * 0.3;
    P.setXYZ(i, cx + x, cy + y, cz + z);
  }
  P.needsUpdate = true;
}

// ---------- zone lifecycle ----------
function registerZone(def) {
  def.pois = def.pois || []; def.spawns = def.spawns || []; def.exits = def.exits || [];
  ZONE_DEFS[def.id] = def;
  delete WD.mapCache[def.id]; delete WD.mapCache[def.id + ':nolabel'];
  return def;
}
function wdClearZone() {
  for (let i = zoneRoot.children.length - 1; i >= 0; i--) {
    const o = zoneRoot.children[i];
    o.traverse((m) => {
      if (m.geometry && !(m.geometry.userData && m.geometry.userData.keep)) m.geometry.dispose();
      if (m.userData.ownMat && m.material) m.material.dispose();
      if (m.isInstancedMesh && m.dispose) m.dispose();
    });
    zoneRoot.remove(o);
  }
  Object.assign(WD, { hf: null, tiles: null, cols: [], grid: new Map(), floors: [], bat: new Map(), anims: [], spots: [], waterY: -1e9, deepY: -1e9, roads: [], clear: [], motes: null, maxSlope: 1.25 });
  for (const l of WD_LIGHTS) l.intensity = 0;
}
// at: poi id, {x,z,yaw}, or nothing (the def's entry poi).
function loadZone(id, at) {
  const def = ZONE_DEFS[id];
  if (!def) throw new Error('unknown zone ' + id);
  const t0 = performance.now();
  wdClearZone();
  WD.def = def;
  const hs = def.size / 2 - 4;
  WD.bounds = def.bounds || { x0: -hs, z0: -hs, x1: hs, z1: hs };
  WD.roads = def.roads || [];
  for (const p of def.pois) if (p.clear !== 0) wdKeepClear(p.x, p.z, p.clear || 5);
  for (const d of def.doors || []) { wdKeepClear(d.bx ?? d.x, d.bz ?? d.z, 10); wdKeepClear(d.x + Math.sin(d.yaw) * 3, d.z + Math.cos(d.yaw) * 3, 4); }
  for (const s of def.spawns) if (s.camp) wdKeepClear(s.x, s.z, Math.min(s.r, 22));
  setAtmosphere(def.atmos);
  if (def.build) def.build(def);
  // generic POI furniture (kiosks, counters, consoles) unless the zone built its own
  for (const p of def.pois) if (!p.noProp && typeof ctPoiProp === 'function') ctPoiProp(p, def);
  if (def.kind !== 'interior' && typeof ctCamp === 'function') def.spawns.forEach((s, i) => { if (s.camp) ctCamp(s, def, i); });
  wdFinishBatches();
  ZONE = { id, def, root: zoneRoot, buildMs: 0 };
  let pos = null;
  if (typeof at === 'string') { const p = def.pois.find((q) => q.id === at); if (p) pos = { x: p.x, z: p.z, yaw: p.yaw || 0 }; }
  else if (at && typeof at === 'object' && at.x !== undefined) pos = { x: at.x, z: at.z, yaw: at.yaw || 0 };
  if (!pos) {
    const p = def.pois.find((q) => q.id === def.entry) || def.pois.find((q) => q.type === 'arrive' || q.type === 'start') || def.pois[0];
    pos = p ? { x: p.x, z: p.z, yaw: p.yaw || 0 } : { x: 0, z: 0, yaw: 0 };
  }
  pos.y = groundY(pos.x, pos.z);
  WD.lightT = 0; updateZone(0);
  ZONE.buildMs = performance.now() - t0;
  EV.emit('zone', id);
  return pos;
}

// ---------- queries ----------
function groundY(x, z) {
  let h = WD.hf ? wdTerrainH(x, z) : 0;
  const F = WD.floors;
  for (let i = 0; i < F.length; i++) { const f = F[i]; if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && f.y > h) h = f.y; }
  return h;
}
// Region name under a point (landmarks), or the zone name.
function zoneAreaName(x, z) {
  const def = WD.def; if (!def) return '';
  let best = null, bd = 1e9;
  for (const a of def.areas || []) { const d = Math.hypot(x - a.x, z - a.z); if (d < a.r && d < bd) { bd = d; best = a.name; } }
  return best || def.name;
}
let wd_px = 0, wd_pz = 0;
function wd_resolve(px, pz, r) {
  const T = WD.tiles;
  for (let it = 0; it < 3; it++) {
    let moved = false;
    if (T) {
      const c = T.cell, i0 = Math.floor((px - r - T.x0) / c), i1 = Math.floor((px + r - T.x0) / c), j0 = Math.floor((pz - r - T.z0) / c), j1 = Math.floor((pz + r - T.z0) / c);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (i >= 0 && j >= 0 && i < T.nx && j < T.nz && !T.solid[j * T.nx + i]) continue;
        const x0 = T.x0 + i * c, z0 = T.z0 + j * c;
        if (wd_pushBox(px, pz, r, x0, z0, x0 + c, z0 + c)) { px = wd_px; pz = wd_pz; moved = true; }
      }
    }
    const g0x = Math.floor((px - r) / WD_CELL), g1x = Math.floor((px + r) / WD_CELL), g0z = Math.floor((pz - r) / WD_CELL), g1z = Math.floor((pz + r) / WD_CELL);
    for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
      const l = WD.grid.get((gx + 2048) * 4096 + gz + 2048);
      if (!l) continue;
      for (let q = 0; q < l.length; q++) {
        const C = l[q];
        if (px + r < C.bx0 || px - r > C.bx1 || pz + r < C.bz0 || pz - r > C.bz1) continue;
        if (C.t === 0) { if (wd_pushBox(px, pz, r, C.x0, C.z0, C.x1, C.z1)) { px = wd_px; pz = wd_pz; moved = true; } }
        else if (C.t === 2) {
          const dx = px - C.x, dz = pz - C.z, d2 = dx * dx + dz * dz, R = C.r + r;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1e-4; px = C.x + (dx / d) * R; pz = C.z + (dz / d) * R; moved = true; }
        } else {
          const dx = px - C.cx, dz = pz - C.cz;
          const lx = dx * C.c - dz * C.s, lz = dx * C.s + dz * C.c;
          if (wd_pushBox(lx, lz, r, -C.hx, -C.hz, C.hx, C.hz)) {
            px = C.cx + wd_px * C.c + wd_pz * C.s; pz = C.cz - wd_px * C.s + wd_pz * C.c; moved = true;
          }
        }
      }
    }
    if (!moved) break;
  }
  wd_px = px; wd_pz = pz;
}
function wd_pushBox(px, pz, r, x0, z0, x1, z1) {
  const cx = px < x0 ? x0 : px > x1 ? x1 : px, cz = pz < z0 ? z0 : pz > z1 ? z1 : pz;
  const dx = px - cx, dz = pz - cz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-10) { const d = Math.sqrt(d2), k = (r - d) / d; wd_px = px + dx * k; wd_pz = pz + dz * k; return true; }
  const l = px - x0, rr2 = x1 - px, t = pz - z0, b = z1 - pz, m = Math.min(l, rr2, t, b);
  wd_px = px; wd_pz = pz;
  if (m === l) wd_px = x0 - r; else if (m === rr2) wd_px = x1 + r; else if (m === t) wd_pz = z0 - r; else wd_pz = z1 + r;
  return true;
}
// Steep uphill and deep water block movement.
function wd_walkable(ox, oz, px, pz) {
  if (!WD.hf) return true;
  const h0 = wdTerrainH(ox, oz), h1 = wdTerrainH(px, pz);
  if (h1 < WD.deepY && h1 < h0 + 0.01) return false;
  const d = Math.hypot(px - ox, pz - oz);
  if (d < 1e-5) return true;
  return h1 - h0 <= WD.maxSlope * d + 0.02;
}
function collideMove(x, z, nx, nz, r = 0.5) {
  const dx = nx - x, dz = nz - z, L = Math.hypot(dx, dz);
  const steps = L < 1e-6 ? 1 : Math.min(16, Math.max(1, Math.ceil(L / Math.max(0.25, r * 0.7))));
  let px = x, pz = z;
  for (let s = 0; s < steps; s++) {
    const ox = px, oz = pz;
    px += dx / steps; pz += dz / steps;
    wd_resolve(px, pz, r); px = wd_px; pz = wd_pz;
    if (!wd_walkable(ox, oz, px, pz)) {
      if (wd_walkable(ox, oz, px, oz)) pz = oz;
      else if (wd_walkable(ox, oz, ox, pz)) px = ox;
      else { px = ox; pz = oz; break; }
      wd_resolve(px, pz, r); px = wd_px; pz = wd_pz;
      if (!wd_walkable(ox, oz, px, pz)) { px = ox; pz = oz; break; }
    }
  }
  const B = WD.bounds;
  px = px < B.x0 + r ? B.x0 + r : px > B.x1 - r ? B.x1 - r : px;
  pz = pz < B.z0 + r ? B.z0 + r : pz > B.z1 - r ? B.z1 - r : pz;
  return { x: px, z: pz };
}
function losClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dz);
  // terrain / tiles
  if (WD.hf || WD.tiles) {
    const n = Math.max(1, Math.ceil(L / (WD.tiles ? 0.6 : 2.5)));
    const T = WD.tiles;
    for (let i = 1; i <= n; i++) {   // include the far end: a camera spot inside a wall must fail
      const t = i / n, x = ax + dx * t, z = az + dz * t, y = ay + dy * t;
      if (WD.hf && y < wdTerrainH(x, z) - 0.15) return false;
      if (T) {
        const ti = Math.floor((x - T.x0) / T.cell), tj = Math.floor((z - T.z0) / T.cell);
        if (ti < 0 || tj < 0 || ti >= T.nx || tj >= T.nz || T.solid[tj * T.nx + ti]) return false;
      }
    }
  }
  // colliders (slab test on the 2D segment, then the height band)
  const st = ++WD.stamp;
  const n = Math.max(1, Math.ceil(L / (WD_CELL * 0.5)));
  let lgx = 1e9, lgz = 1e9;
  for (let i = 0; i <= n; i++) {
    const t = i / n, gx = Math.floor((ax + dx * t) / WD_CELL), gz = Math.floor((az + dz * t) / WD_CELL);
    if (gx === lgx && gz === lgz) continue;
    lgx = gx; lgz = gz;
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
      const l = WD.grid.get((gx + ox + 2048) * 4096 + gz + oz + 2048);
      if (!l) continue;
      for (const C of l) {
        if (C.st === st) continue;
        C.st = st;
        if (wd_segHit(C, ax, ay, az, dx, dy, dz)) return false;
      }
    }
  }
  return true;
}
function wd_segHit(C, ax, ay, az, dx, dy, dz) {
  let t0 = 0, t1 = 1;
  if (C.t === 2) {
    const fx = ax - C.x, fz = az - C.z, a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - C.r * C.r * 0.8;
    if (a < 1e-9) { if (c > 0) return false; }
    else {
      const disc = b * b - 4 * a * c; if (disc < 0) return false;
      const sq = Math.sqrt(disc); t0 = Math.max(0, (-b - sq) / (2 * a)); t1 = Math.min(1, (-b + sq) / (2 * a));
      if (t0 > t1) return false;
    }
  } else {
    let px = ax, pz = az, vx = dx, vz = dz, x0, z0, x1, z1;
    if (C.t === 0) { x0 = C.x0; z0 = C.z0; x1 = C.x1; z1 = C.z1; }
    else {
      const rx = ax - C.cx, rz = az - C.cz;
      px = rx * C.c - rz * C.s; pz = rx * C.s + rz * C.c; vx = dx * C.c - dz * C.s; vz = dx * C.s + dz * C.c;
      x0 = -C.hx; z0 = -C.hz; x1 = C.hx; z1 = C.hz;
    }
    if (Math.abs(vx) < 1e-9) { if (px < x0 || px > x1) return false; }
    else { let a = (x0 - px) / vx, b = (x1 - px) / vx; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return false; }
    if (Math.abs(vz) < 1e-9) { if (pz < z0 || pz > z1) return false; }
    else { let a = (z0 - pz) / vz, b = (z1 - pz) / vz; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return false; }
  }
  const ya = ay + dy * t0, yb = ay + dy * t1;
  return Math.max(ya, yb) > C.y0 && Math.min(ya, yb) < C.y1;
}

// ---------- per-frame ----------
function updateZone(dt) {
  WD.t += dt;
  const t = WD.t;
  for (const f of WD.anims) f(t, dt);
  WD_MAT.propGlow.color.setScalar(0.92 + Math.sin(t * 1.3) * 0.08);
  wd_updMotes(t);
  WD.lightT -= dt;
  if (WD.lightT <= 0) {
    WD.lightT = 0.25;
    const cx = camera.position.x, cz = camera.position.z;
    const S = WD.spots.length > 4 ? WD.spots.slice().sort((a, b) => ((a.x - cx) ** 2 + (a.z - cz) ** 2) - ((b.x - cx) ** 2 + (b.z - cz) ** 2)) : WD.spots;
    for (let i = 0; i < WD_LIGHTS.length; i++) {
      const L = WD_LIGHTS[i], s = S[i];
      if (!s) { L.intensity = 0; continue; }
      L.position.set(s.x, s.y, s.z); L.color.copy(s.color); L.distance = s.dist; L.userData.base = s.int; L.userData.flick = s.flicker;
      L.intensity = s.int * DN.lampMul;
    }
  }
  for (const L of WD_LIGHTS) if (L.userData.flick && L.intensity > 0) L.intensity = L.userData.base * DN.lampMul * (0.8 + 0.2 * Math.sin(t * 13 + L.position.x) * Math.sin(t * 7.3));
}

// ---------- map ----------
const WD_POICOL = { start: '#7dff9a', arrive: '#9fb0bb', clonebay: '#5fe0d0', terminal: '#ffb347', vendor: '#ffd27a', hopper: '#8fc8ff', shuttle: '#8fc8ff', npc: '#e6ecef', door: '#ff7a5a', pylon: '#c080ff', bank: '#ffe08a', trainer: '#e6ecef' };
// opts.labels === false returns a cached variant without area names (for the zoomed minimap).
function zoneMapCanvas(opts) {
  const def = WD.def;
  if (!def) return null;
  const labels = !(opts && opts.labels === false), key = def.id + (labels ? '' : ':nolabel');
  if (WD.mapCache[key]) return WD.mapCache[key];
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const half = def.size / 2, toP = (v) => ((v + half) / def.size) * S;
  g.fillStyle = '#0b0d10'; g.fillRect(0, 0, S, S);
  const lin2s = (v) => Math.round(255 * Math.pow(clamp(v, 0, 1), 1 / 2.2));
  if (WD.hf) {
    const hf = WD.hf, W = hf.W, img = new ImageData(W, W), D = img.data;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, h = hf.H[k];
      const sh = clamp(1 + ((hf.H[j * W + Math.max(i - 1, 0)] - hf.H[j * W + Math.min(i + 1, hf.N)]) * 0.6 + (hf.H[Math.max(j - 1, 0) * W + i] - hf.H[Math.min(j + 1, hf.N) * W + i]) * 0.6) / hf.cell * 0.5, 0.45, 1.5);
      let r = hf.C[k * 3] * sh, gg = hf.C[k * 3 + 1] * sh, b = hf.C[k * 3 + 2] * sh;
      if (h < WD.waterY - 0.05 && def.mapWater !== false) {
        const wc = wdC(def.waterCol || 0x2c6684), dd = clamp((WD.waterY - h) / 6, 0.4, 0.9);
        r = lerp(r, wc[0], dd); gg = lerp(gg, wc[1], dd); b = lerp(b, wc[2], dd);
      }
      D[k * 4] = lin2s(r); D[k * 4 + 1] = lin2s(gg); D[k * 4 + 2] = lin2s(b); D[k * 4 + 3] = 255;
    }
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = W;
    tmp.getContext('2d').putImageData(img, 0, 0);
    const s0 = (-half - hf.x0) / hf.cell, sl = def.size / hf.cell;
    g.imageSmoothingEnabled = true;
    g.drawImage(tmp, s0, s0, sl, sl, 0, 0, S, S);
  }
  if (WD.tiles) {
    const T = WD.tiles;
    for (let j = 0; j < T.nz; j++) for (let i = 0; i < T.nx; i++) {
      if (T.solid[j * T.nx + i]) continue;
      g.fillStyle = T.mapCol ? T.mapCol(i, j) : '#58626a';
      const x = toP(T.x0 + i * T.cell), z = toP(T.z0 + j * T.cell), w = (T.cell / def.size) * S;
      g.fillRect(x, z, w + 0.6, w + 0.6);
    }
  }
  // roads
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const R of WD.roads) {
    g.strokeStyle = 'rgba(230,214,170,0.35)'; g.lineWidth = Math.max(2, (R.w / def.size) * S);
    g.beginPath(); R.pts.forEach((p, i) => (i ? g.lineTo(toP(p[0]), toP(p[1])) : g.moveTo(toP(p[0]), toP(p[1])))); g.stroke();
  }
  // buildings
  for (const C of WD.cols) {
    if (C.y1 - C.y0 < 1.6 || C.nomap) continue;
    g.fillStyle = C.mapCol || 'rgba(26,30,34,0.78)';
    if (C.t === 0) g.fillRect(toP(C.x0), toP(C.z0), Math.max(1, toP(C.x1) - toP(C.x0)), Math.max(1, toP(C.z1) - toP(C.z0)));
    else if (C.t === 1) {
      g.save(); g.translate(toP(C.cx), toP(C.cz)); g.rotate(Math.atan2(-C.s, C.c)); const k = S / def.size;
      g.fillRect(-C.hx * k, -C.hz * k, C.hx * 2 * k, C.hz * 2 * k); g.restore();
    } else if (C.r > 2.5) { g.beginPath(); g.arc(toP(C.x), toP(C.z), (C.r / def.size) * S, 0, TAU); g.fill(); }
  }
  // exits
  for (const x of def.exits) {
    g.fillStyle = '#ffb347'; g.beginPath(); g.arc(toP(x.x), toP(x.z), 5, 0, TAU); g.fill();
    g.strokeStyle = '#1a1003'; g.lineWidth = 1.5; g.stroke();
  }
  // POIs
  for (const p of def.pois) {
    const c = WD_POICOL[p.type]; if (!c || p.type === 'arrive') continue;
    g.fillStyle = c; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 1.5;
    g.beginPath();
    if (p.type === 'door' || p.type === 'pylon') { const x = toP(p.x), z = toP(p.z); g.moveTo(x, z - 5); g.lineTo(x + 5, z); g.lineTo(x, z + 5); g.lineTo(x - 5, z); g.closePath(); }
    else g.arc(toP(p.x), toP(p.z), p.type === 'npc' ? 2.5 : 3.5, 0, TAU);
    g.fill(); g.stroke();
  }
  // labels
  g.font = '600 11px "Exo 2", sans-serif'; g.textAlign = 'center';
  for (const a of labels ? def.areas || [] : []) {
    if (!a.label) continue;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(a.name, toP(a.x) + 1, toP(a.z) + 1);
    g.fillStyle = 'rgba(240,236,220,0.9)'; g.fillText(a.name, toP(a.x), toP(a.z));
  }
  WD.mapCache[key] = cv;
  return cv;
}
// World <-> map pixel helpers for the UI overlay.
function zoneMapXY(x, z) { const s = ZONE ? ZONE.def.size : 1000; return { x: ((x + s / 2) / s) * 512, y: ((z + s / 2) / s) * 512 }; }

// ---------- mission doors ----------
function randomDoorIn(zoneId, rng) {
  const def = ZONE_DEFS[zoneId];
  const D = def && def.doors;
  if (!D || !D.length) return null;
  const f = typeof rng === 'function' ? rng() : rng && rng.f ? rng.f() : Math.random();
  const d = D[Math.floor(f * D.length) % D.length];
  return { x: d.x, z: d.z, yaw: d.yaw, id: d.id };
}
