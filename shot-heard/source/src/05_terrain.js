// Shot Heard — heightfield terrain: base shape, rivers, ravines, earthworks, trenches and building pads; painted ground
// colours, water, the far country, craters, a 2 m nav grid and Dijkstra flow fields for the bots.

const WORLD = new THREE.Group();   // everything belonging to the current map; disposed on rebuild
scene.add(WORLD);
const TER = { map: null, half: 300, ext: 400, N: 0, step: 2, h: null, earth: null, road: null, water: 0, mesh: null, geo: null, colors: null };
const LAYOUT = { buildings: [], burning: [] };

function terrainMaterial() { return new THREE.MeshLambertMaterial({ vertexColors: true }); }

// ---------- layout (buildings must be known before the pads are flattened) ----------
function layoutMap(map) {
  LAYOUT.buildings = map.buildings.map((b) => Object.assign({}, b));
  LAYOUT.burning = [];
  for (const v of map.villages || []) {
    let placed = 0, tries = 0;
    while (placed < v.n && tries++ < v.n * 40) {
      const x = rr(v.x0, v.x1), z = rr(v.z0, v.z1);
      let w = rr(7.5, 11.5), d = rr(6, 8.5);
      let yaw = v.yaw + (rand() < 0.35 ? Math.PI / 2 : 0);
      // face the nearest road
      let best = 1e9, by = yaw;
      for (const r of map.roads) {
        const dd = distPolyline(x, z, r.pts);
        if (dd < best) {
          best = dd;
          for (let i = 0; i < r.pts.length - 1; i++) {
            if (Math.abs(distSeg(x, z, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) - dd) < 0.01) by = Math.atan2(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]) + Math.PI / 2;
          }
        }
      }
      if (best < 30) yaw = by;
      if (best < Math.max(w, d) / 2 + 4.5) continue;
      let ok = true;
      for (const o of LAYOUT.buildings) if (Math.hypot(o.x - x, o.z - z) < (Math.max(w, d) + Math.max(o.w, o.d)) * 0.62 + 3) { ok = false; break; }
      for (const f of map.flags) if (Math.hypot(f.x - x, f.z - z) < 7) ok = false;
      if (!ok) continue;
      const style = pick(v.styles);
      const b = { x, z, yaw, w, d, floors: rand() < 0.6 ? 2 : 1, style, burn: rand() < (v.burn || 0) };
      LAYOUT.buildings.push(b);
      if (b.burn) LAYOUT.burning.push(b);
      placed++;
    }
  }
}

// ---------- heights ----------
function buildTerrain(map) {
  TER.map = map; TER.half = map.size / 2; TER.water = map.water || 0;
  TER.ext = TER.half + 110;
  TER.step = 2;
  TER.N = Math.ceil((TER.ext * 2) / TER.step) + 1;
  const N = TER.N, S = TER.step, E = TER.ext;
  const H = (TER.h = new Float32Array(N * N));
  const EARTH = (TER.earth = new Float32Array(N * N));
  const ROAD = (TER.road = new Float32Array(N * N));
  const W = TER.water;
  const works = (map.works || []).map((w) => Object.assign({ bb: polyBounds(w.pts, 9) }, w));
  const trenches = (map.trenches || []).map((t) => Object.assign({ bb: polyBounds(t.pts, 6) }, t));
  const rivers = (map.rivers || []).map((r) => Object.assign({ bb: polyBounds(r.pts, r.w / 2 + r.bank + 2) }, r));
  const ravines = (map.ravines || []).map((r) => Object.assign({ bb: polyBounds(r.pts, r.w / 2 + 2) }, r));
  const roads = map.roads.map((r) => Object.assign({ bb: polyBounds(r.pts, r.w + 3) }, r));
  const inBB = (bb, x, z) => x > bb[0] && x < bb[2] && z > bb[1] && z < bb[3];
  for (let j = 0; j < N; j++) {
    const z = -E + j * S;
    for (let i = 0; i < N; i++) {
      const x = -E + i * S, k = j * N + i;
      let h = map.height(x, z);
      const land = map.coast ? map.coast(x, z) > 6 : true;
      if (land) h = Math.max(h, W + 0.8);
      for (const r of ravines) if (inBB(r.bb, x, z)) {
        const d = distPolyline(x, z, r.pts);
        if (d < r.w / 2) h -= r.depth * (1 - smooth(r.w * 0.12, r.w / 2, d));
      }
      for (const r of rivers) if (inBB(r.bb, x, z)) {
        const d = distPolyline(x, z, r.pts), hw = r.w / 2;
        if (d < hw) h = Math.min(h, W - r.depth * (1 - (d / hw) * (d / hw)) - 0.05);
        else if (d < hw + r.bank) h = lerp(Math.min(h, W + 0.35), h, smooth(hw, hw + r.bank, d));
      }
      for (const w of works) if (inBB(w.bb, x, z)) {
        const p = workProfile(w, x, z);
        if (p.e < 7) { h += p.dh; EARTH[k] = Math.max(EARTH[k], 1 - smooth(5, 7, p.e)); }
      }
      for (const t of trenches) if (inBB(t.bb, x, z)) {
        const p = trenchProfile(t, x, z);
        if (p.e < 5) { h += p.dh; EARTH[k] = Math.max(EARTH[k], 1 - smooth(3.5, 5, p.e)); }
      }
      for (const r of roads) if (inBB(r.bb, x, z)) {
        const d = distPolyline(x, z, r.pts);
        if (d < r.w / 2 + 1.5) { ROAD[k] = Math.max(ROAD[k], 1 - smooth(r.w / 2 - 0.6, r.w / 2 + 1.5, d)); h -= 0.12 * ROAD[k]; }
      }
      H[k] = h;
    }
  }
  // building pads
  for (const b of LAYOUT.buildings) {
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw), hw = b.w / 2 + 1.2, hd = b.d / 2 + 1.2;
    let sum = 0, n = 0, mx = -1e9;
    for (const [lx, lz] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [0, 0]]) { const hh = heightAt(b.x + lx * c + lz * s, b.z - lx * s + lz * c); sum += hh; n++; mx = Math.max(mx, hh); }
    const pad = Math.max(sum / n, W + 0.6);
    b.y = pad;
    const R = Math.hypot(hw, hd) + 4;
    const i0 = Math.max(0, Math.floor((b.x - R + E) / S)), i1 = Math.min(N - 1, Math.ceil((b.x + R + E) / S));
    const j0 = Math.max(0, Math.floor((b.z - R + E) / S)), j1 = Math.min(N - 1, Math.ceil((b.z + R + E) / S));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = -E + i * S - b.x, dz = -E + j * S - b.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      const ox = Math.max(0, Math.abs(lx) - hw), oz = Math.max(0, Math.abs(lz) - hd), o = Math.hypot(ox, oz);
      if (o < 3.5) { const k = j * N + i; H[k] = lerp(pad, H[k], smooth(0, 3.5, o)); }
    }
  }
}
// Earthwork cross-section: crest at the line; inside a firing step 1.3 m below the crest; outside a slope, ditch and counterscarp.
function workProfile(w, x, z) {
  let best = 1e9, bi = 0;
  for (let i = 0; i < w.pts.length - 1; i++) {
    const d = distSeg(x, z, w.pts[i][0], w.pts[i][1], w.pts[i + 1][0], w.pts[i + 1][1]);
    if (d < best) { best = d; bi = i; }
  }
  const a = w.pts[bi], b = w.pts[bi + 1];
  const sx = b[0] - a[0], sz = b[1] - a[1];
  const sideP = sx * (z - a[1]) - sz * (x - a[0]), sideI = sx * (w.inside[1] - a[1]) - sz * (w.inside[0] - a[0]);
  const inside = sideP * sideI > 0;
  const e = best, H = w.h, D = w.ditch;
  let dh;
  if (inside) dh = e < 0.7 ? H : e < 2.1 ? lerp(H, H - 1.3, smooth(0.7, 1.0, e)) : e < 3.6 ? lerp(H - 1.3, 0, smooth(2.1, 3.6, e)) : 0;
  else dh = e < 0.5 ? H : e < 2.6 ? lerp(H, 0, smooth(0.5, 2.6, e)) : e < 3.4 ? lerp(0, -D, smooth(2.6, 3.4, e)) : e < 5 ? -D : e < 6.4 ? lerp(-D, 0, smooth(5, 6.4, e)) : 0;
  let g = 1;
  for (const gp of w.gaps || []) g = Math.min(g, smooth(3.5, 7, Math.hypot(x - gp[0], z - gp[1])));
  return { e, dh: dh * g, inside };
}
// Siege trench: floor 1.4 m down (covered), a step on the enemy side to fire from, spoil bank toward the enemy.
function trenchProfile(t, x, z) {
  let best = 1e9, bi = 0;
  for (let i = 0; i < t.pts.length - 1; i++) {
    const d = distSeg(x, z, t.pts[i][0], t.pts[i][1], t.pts[i + 1][0], t.pts[i + 1][1]);
    if (d < best) { best = d; bi = i; }
  }
  const a = t.pts[bi], b = t.pts[bi + 1], sx = b[0] - a[0], sz = b[1] - a[1];
  const sideP = sx * (z - a[1]) - sz * (x - a[0]), sideE = sx * (t.enemy[1] - a[1]) - sz * (t.enemy[0] - a[0]);
  const enemySide = sideP * sideE > 0;
  const hw = t.w / 2, D = 1.4, bank = 0.75, e = best;
  let dh = 0;
  if (enemySide) dh = e < hw - 1.1 ? -D : e < hw - 0.9 ? lerp(-D, -D + 0.8, smooth(hw - 1.1, hw - 0.9, e)) : e < hw ? -D + 0.8 : e < hw + 2.6 ? bank * Math.sin(Math.PI * (e - hw) / 2.6) : 0;
  else dh = e < hw - 0.3 ? -D : e < hw + 0.2 ? lerp(-D, 0, smooth(hw - 0.3, hw + 0.2, e)) : 0;
  return { e, dh };
}

function heightAt(x, z) {
  const N = TER.N, S = TER.step, E = TER.ext;
  let fx = (x + E) / S, fz = (z + E) / S;
  fx = clamp(fx, 0, N - 1.001); fz = clamp(fz, 0, N - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * N + i, H = TER.h;
  return (H[k] * (1 - u) + H[k + 1] * u) * (1 - v) + (H[k + N] * (1 - u) + H[k + N + 1] * u) * v;
}
function normalAt(x, z, out) {
  const e = 1.0;
  return out.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
}
const waterDepth = (x, z) => TER.water - heightAt(x, z);
function earthAt(x, z) { const N = TER.N, i = clamp(Math.round((x + TER.ext) / TER.step), 0, N - 1), j = clamp(Math.round((z + TER.ext) / TER.step), 0, N - 1); return TER.earth[j * N + i]; }
function roadAt(x, z) { const N = TER.N, i = clamp(Math.round((x + TER.ext) / TER.step), 0, N - 1), j = clamp(Math.round((z + TER.ext) / TER.step), 0, N - 1); return TER.road[j * N + i]; }

// ---------- forest density (4 m cells) ----------
const FOREST = { n: 0, cell: 4, d: null };
function buildForestMask(map) {
  const cell = FOREST.cell, n = (FOREST.n = Math.ceil((TER.ext * 2) / cell));
  const d = (FOREST.d = new Float32Array(n * n));
  const forests = map.forests.map((f) => Object.assign({ bb: polyBounds(f.poly, 8) }, f));
  const fields = map.fields.map((f) => Object.assign({ bb: polyBounds(f.poly, 2) }, f));
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -TER.ext + (i + 0.5) * cell, z = -TER.ext + (j + 0.5) * cell;
    let v = 0;
    for (const f of forests) if (x > f.bb[0] && x < f.bb[2] && z > f.bb[1] && z < f.bb[3]) {
      if (pointInPoly(x, z, f.poly)) v = Math.max(v, f.d * smooth(0, 10, distPolyEdge(x, z, f.poly)));
    }
    if (v <= 0) continue;
    for (const c of map.clearings || []) v *= smooth(c[2] - 10, c[2] + 14, Math.hypot(x - c[0], z - c[1]));
    for (const f of fields) if (x > f.bb[0] && x < f.bb[2] && z > f.bb[1] && z < f.bb[3] && pointInPoly(x, z, f.poly)) v *= f.kind === 'orchard' ? 0 : 0.0;
    if (roadAt(x, z) > 0.05 || earthAt(x, z) > 0.05 || waterDepth(x, z) > -0.6) v = 0;
    v *= 0.75 + 0.5 * fbm(x * 0.02, z * 0.02, 2);
    d[j * n + i] = clamp(v, 0, 1);
  }
}
function forestAt(x, z) {
  const n = FOREST.n; if (!n) return 0;
  const i = Math.floor((x + TER.ext) / FOREST.cell), j = Math.floor((z + TER.ext) / FOREST.cell);
  if (i < 0 || j < 0 || i >= n || j >= n) return 0;
  return FOREST.d[j * n + i];
}

// ---------- mesh and colours ----------
const FIELD_C = { plow: 0x6e5236, wheat: 0xc4a450, hay: 0xa6a052, pasture: 0x7c9a46, stubble: 0xb49a5a, trampled: 0x80704c, orchard: 0x7f9a48, clear: 0x8e9a50 };
function fieldAt(x, z, fields) {
  for (const f of fields) if (x > f.bb[0] && x < f.bb[2] && z > f.bb[1] && z < f.bb[3] && pointInPoly(x, z, f.poly)) return f;
  return null;
}
function groundColor(map, x, z, h, ny, fields, out) {
  const g = map.grass.map(col);
  const n1 = fbm(x * 0.018 + 5, z * 0.018, 3), n2 = fbm(x * 0.09, z * 0.09, 2), n3 = vnoise(x * 0.35, z * 0.35);
  let c = mixC(mixC(g[0], g[1], smooth(0.35, 0.7, n1)), g[2], smooth(0.45, 0.8, n2) * 0.6);
  c = shadeC(c, 0.92 + n3 * 0.14);
  const f = fieldAt(x, z, fields);
  if (f && f.kind !== 'orchard') {
    let fc = col(FIELD_C[f.kind] || 0x8a8a50);
    if (f.kind === 'plow' || f.kind === 'wheat' || f.kind === 'hay' || f.kind === 'stubble') {
      const a = (f.ang = f.ang ?? rand() * Math.PI), u = x * Math.cos(a) + z * Math.sin(a);
      const row = 0.5 + 0.5 * Math.sin(u * 2.2);
      fc = shadeC(fc, 0.86 + row * 0.22);
    }
    if (f.kind === 'trampled') fc = mixC(fc, c, smooth(0.4, 0.75, n2));
    c = mixC(c, fc, smooth(0, 3, distPolyEdge(x, z, f.poly)) * 0.92);
  }
  const fo = forestAt(x, z);
  if (fo > 0) c = mixC(c, shadeC(col(map.forestFloor), 0.9 + n3 * 0.2), smooth(0.05, 0.5, fo));
  const steep = 1 - smooth(0.72, 0.92, ny);
  if (steep > 0) c = mixC(c, shadeC(col(0x7a6646), 0.9 + n2 * 0.2), steep * 0.85);
  const k = Math.round((x + TER.ext) / TER.step) + Math.round((z + TER.ext) / TER.step) * TER.N;
  const ea = TER.earth[k] || 0, ro = TER.road[k] || 0;
  if (ea > 0) {
    // raw earth, darker and wetter low in the ditches, sod still clinging in patches
    const lowK = clamp((map.height(x, z) - h) / 2, 0, 1);
    let ec = mixC(col(0x86694a), col(0x5a4632), lowK);
    ec = mixC(ec, c, smooth(0.55, 0.8, fbm(x * 0.25, z * 0.25, 2)) * 0.6);
    c = mixC(c, shadeC(ec, 0.86 + n3 * 0.24), ea * 0.92);
  }
  if (ro > 0) c = mixC(c, shadeC(col(0x9a8460), 0.9 + n3 * 0.16 - (Math.abs(Math.sin(n2 * 40)) < 0.2 ? 0.08 : 0)), ro * 0.92);
  const W = TER.water;
  if (h < W + 0.9) c = mixC(c, shadeC(col(0x8e8064), 0.95 + n3 * 0.1), smooth(W + 0.9, W + 0.2, h));
  if (h < W) c = mixC(c, col(0x4a4434), smooth(W, W - 2, h));
  out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
}
function buildTerrainMesh(map) {
  const N = TER.N, S = TER.step, E = TER.ext, H = TER.h;
  const pos = new Float32Array(N * N * 3), nor = new Float32Array(N * N * 3), colA = new Float32Array(N * N * 3);
  const fields = map.fields.map((f) => Object.assign({ bb: polyBounds(f.poly, 3) }, f));
  const tmp = [0, 0, 0];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, x = -E + i * S, z = -E + j * S;
    pos[k * 3] = x; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = z;
    const hl = H[j * N + Math.max(0, i - 1)], hr = H[j * N + Math.min(N - 1, i + 1)], hu = H[Math.max(0, j - 1) * N + i], hd = H[Math.min(N - 1, j + 1) * N + i];
    let nx = hl - hr, ny = 2 * S, nz = hu - hd; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
    groundColor(map, x, z, H[k], ny, fields, tmp);
    colA[k * 3] = tmp[0]; colA[k * 3 + 1] = tmp[1]; colA[k * 3 + 2] = tmp[2];
  }
  const idx = new Uint32Array((N - 1) * (N - 1) * 6);
  let o = 0;
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
    if ((i + j) & 1) { idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d; }
    else { idx[o++] = a; idx[o++] = c; idx[o++] = d; idx[o++] = a; idx[o++] = d; idx[o++] = b; }
  }
  // one set of vertex buffers, drawn as a 4 × 4 grid of meshes so the parts out of view are culled
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  TER.geo = geo; TER.meshes = [];
  const K = 4, mat = terrainMaterial();
  for (let bj = 0; bj < K; bj++) for (let bi = 0; bi < K; bi++) {
    const i0 = Math.floor((N - 1) * bi / K), i1 = Math.floor((N - 1) * (bi + 1) / K), j0 = Math.floor((N - 1) * bj / K), j1 = Math.floor((N - 1) * (bj + 1) / K);
    const sub = new Uint32Array((i1 - i0) * (j1 - j0) * 6);
    let q = 0, lo = 1e9, hi = -1e9;
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      const c = (j * (N - 1) + i) * 6;
      for (let t = 0; t < 6; t++) sub[q++] = idx[c + t];
      lo = Math.min(lo, H[j * N + i]); hi = Math.max(hi, H[j * N + i]);
    }
    const g = new THREE.BufferGeometry();
    for (const k in geo.attributes) g.setAttribute(k, geo.attributes[k]);
    g.setIndex(new THREE.BufferAttribute(sub, 1));
    const cx = -E + (i0 + i1) / 2 * S, cz = -E + (j0 + j1) / 2 * S, w = (i1 - i0) * S, d = (j1 - j0) * S;
    g.boundingSphere = new THREE.Sphere(new V3(cx, (lo + hi) / 2, cz), Math.hypot(w / 2, d / 2, (hi - lo) / 2 + 3));
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    WORLD.add(m); TER.meshes.push(m);
  }
  TER.mesh = TER.meshes[0];
  buildFarCountry(map);
  buildWater(map);
}
// Coarse land and water out to the horizon, sunk under the fine terrain inside the field.
function buildFarCountry(map) {
  const R = 1500, n = 150, st = (R * 2) / n, E = TER.ext;
  const g = new THREE.PlaneGeometry(R * 2, R * 2, n, n); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, cA = new Float32Array(P.count * 3), tmp = [0, 0, 0];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z);
    let h = map.height(x, z);
    const land = map.coast ? map.coast(x, z) > 6 : true;
    if (land) h = Math.max(h, TER.water + 0.8);
    h += smooth(900, 1350, r) * (30 + 80 * fbm(x * 0.002 + 9, z * 0.002, 3));
    if (map.coast && smooth(900, 1350, r) > 0.2) h = Math.max(h, (smooth(900, 1350, r) - 0.2) * 60);
    const inside = Math.max(Math.abs(x), Math.abs(z)) < E - st * 1.5;
    if (inside) h -= 6;
    P.setY(i, h);
    const fo = r > E ? 0.4 + 0.4 * fbm(x * 0.01, z * 0.01, 2) : 0;
    const gc = col(map.grass[0]), fc = col(map.leaf[0]);
    let c = mixC(gc, shadeC(fc, 0.6), fo);
    if (h < TER.water + 0.5) c = col(0x7a6e56);
    tmp[0] = c[0]; tmp[1] = c[1]; tmp[2] = c[2];
    cA[i * 3] = tmp[0]; cA[i * 3 + 1] = tmp[1]; cA[i * 3 + 2] = tmp[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(cA, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  WORLD.add(m);
}
const WATER = { mat: null, mesh: null };
function buildWater(map) {
  let any = !!map.coast || (map.rivers && map.rivers.length);
  if (!any) return;
  const R = map.coast ? 1500 : TER.ext, n = map.coast ? 220 : 160;
  const g = new THREE.PlaneGeometry(R * 2, R * 2, n, n); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, dep = new Float32Array(P.count);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i);
    const inF = Math.abs(x) < TER.ext - 2 && Math.abs(z) < TER.ext - 2;
    let h = inF ? heightAt(x, z) : map.height(x, z);
    if (!inF && map.coast && map.coast(x, z) > 6) h = Math.max(h, TER.water + 0.8);
    dep[i] = TER.water - h;
    P.setY(i, TER.water);
  }
  g.setAttribute('aDepth', new THREE.BufferAttribute(dep, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: SUN_DIR }, uSunC: { value: sun.color }, uSky: { value: hemi.color }, uFogC: { value: scene.fog.color }, uFogN: { value: 100 }, uFogF: { value: 900 },
      uDeep: { value: new THREE.Color(map.id === 'saratoga' ? 0x34483e : 0x2c4452) }, uShal: { value: new THREE.Color(0x6a7a62) } },
    vertexShader: `attribute float aDepth; varying float vD; varying vec3 vW; varying float vF; uniform float uFogN; uniform float uFogF;
      void main(){ vD = aDepth; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vF = smoothstep(uFogN, uFogF, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uSun; uniform vec3 uSunC; uniform vec3 uSky; uniform vec3 uFogC; uniform vec3 uDeep; uniform vec3 uShal; varying float vD; varying vec3 vW; varying float vF;
      void main(){
        if (vD < -0.05) discard;
        float w1 = sin(vW.x * 0.35 + uTime * 1.3) * cos(vW.z * 0.28 - uTime * 1.1);
        float w2 = sin((vW.x + vW.z) * 0.9 - uTime * 2.1) * 0.5;
        vec3 n = normalize(vec3(w1 * 0.12 + w2 * 0.06, 1.0, w2 * 0.1 - w1 * 0.05));
        vec3 v = normalize(cameraPosition - vW);
        float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 c = mix(uShal, uDeep, smoothstep(0.0, 3.5, vD));
        c = mix(c, uSky * 0.95, fr * 0.6);
        vec3 h = normalize(uSun + v);
        c += uSunC * pow(max(dot(n, h), 0.0), 120.0) * 0.9;
        float foam = smoothstep(0.35, 0.0, vD) * (0.6 + 0.4 * sin(uTime * 2.0 + vW.x * 2.0 + vW.z * 1.3));
        c = mix(c, vec3(0.86, 0.85, 0.8), foam * 0.45);
        float a = mix(0.55, 0.92, smoothstep(0.0, 1.5, vD));
        c = mix(c, uFogC, vF);
        gl_FragColor = vec4(c, a);
      }`,
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 2;
  WORLD.add(m);
  WATER.mat = mat; WATER.mesh = m;
}
function updateWater(t) {
  if (!WATER.mat) return;
  const u = WATER.mat.uniforms; u.uTime.value = t; u.uFogN.value = scene.fog.near; u.uFogF.value = scene.fog.far;
}

// Dig a crater: lower and scorch the ground in a disc, update only the touched rows of the mesh.
function craterAt(x, z, r, depth) {
  const N = TER.N, S = TER.step, E = TER.ext, H = TER.h;
  const i0 = Math.max(1, Math.floor((x - r + E) / S)), i1 = Math.min(N - 2, Math.ceil((x + r + E) / S));
  const j0 = Math.max(1, Math.floor((z - r + E) / S)), j1 = Math.min(N - 2, Math.ceil((z + r + E) / S));
  if (i1 < i0 || j1 < j0) return;
  const pos = TER.geo.attributes.position, nor = TER.geo.attributes.normal, colA = TER.geo.attributes.color;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dx = -E + i * S - x, dz = -E + j * S - z, d = Math.hypot(dx, dz);
    if (d > r) continue;
    const k = j * N + i, f = 1 - d / r;
    H[k] -= depth * f * f * (3 - 2 * f) - (d > r * 0.7 ? depth * 0.25 * (1 - Math.abs(d - r * 0.85) / (r * 0.15)) : 0);
    pos.array[k * 3 + 1] = H[k];
    const sc = lerp(1, 0.55, f);
    colA.array[k * 3] = colA.array[k * 3] * sc + 0.16 * (1 - sc); colA.array[k * 3 + 1] = colA.array[k * 3 + 1] * sc + 0.12 * (1 - sc); colA.array[k * 3 + 2] = colA.array[k * 3 + 2] * sc + 0.08 * (1 - sc);
  }
  for (let j = j0 - 1; j <= j1 + 1; j++) for (let i = i0 - 1; i <= i1 + 1; i++) {
    const k = j * N + i;
    let nx = H[k - 1] - H[k + 1], ny = 2 * S, nz = H[k - N] - H[k + N]; const l = Math.hypot(nx, ny, nz);
    nor.array[k * 3] = nx / l; nor.array[k * 3 + 1] = ny / l; nor.array[k * 3 + 2] = nz / l;
  }
  const off = (j0 - 1) * N * 3, cnt = (j1 - j0 + 3) * N * 3;
  for (const a of [pos, nor, colA]) { a.updateRange.offset = off; a.updateRange.count = cnt; a.needsUpdate = true; }
}

// ---------- nav grid and flow fields ----------
const NAV = { n: 0, cell: 2, half: 0, cost: null, flows: {} };
function navIndex(x, z) {
  const i = Math.floor((x + NAV.half) / NAV.cell), j = Math.floor((z + NAV.half) / NAV.cell);
  if (i < 0 || j < 0 || i >= NAV.n || j >= NAV.n) return -1;
  return j * NAV.n + i;
}
// cost: 0 = blocked, 1 = open, higher = slow (vaulting walls, wading)
function buildNav() {
  const half = (NAV.half = TER.half), cell = NAV.cell, n = (NAV.n = Math.ceil((half * 2) / cell));
  const cost = (NAV.cost = new Uint8Array(n * n));
  NAV.flows = {};
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + (i + 0.5) * cell, z = -half + (j + 0.5) * cell;
    const wd = waterDepth(x, z);
    let c = 1;
    if (wd > 1.1) c = 0; else if (wd > 0.3) c = 4;
    const h = heightAt(x, z);
    const sl = Math.max(Math.abs(heightAt(x + 1, z) - heightAt(x - 1, z)), Math.abs(heightAt(x, z + 1) - heightAt(x, z - 1))) / 2;
    if (sl > 1.3) c = 0; else if (sl > 0.7) c = Math.max(c, 3);
    cost[j * n + i] = c;
  }
  // colliders: tall walls block, low walls and fences cost a vault, bridge decks open the river
  for (const C of COL) {
    if (!C.alive || !(C.f & 1)) continue;
    const r = C.k === 1 ? C.r : Math.hypot(C.hx, C.hz);
    const i0 = Math.max(0, Math.floor((C.x - r + half) / cell)), i1 = Math.min(n - 1, Math.floor((C.x + r + half) / cell));
    const j0 = Math.max(0, Math.floor((C.z - r + half) / cell)), j1 = Math.min(n - 1, Math.floor((C.z + r + half) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -half + (i + 0.5) * cell, z = -half + (j + 0.5) * cell;
      if (!colContains(C, x, z, 0.55)) continue;
      const k = j * n + i, g = heightAt(x, z);
      if (C.deck) { cost[k] = 1; continue; }
      if (C.k === 1 && C.r < 0.8) { if (cost[k]) cost[k] = Math.max(cost[k], 2); continue; }
      const tall = C.y1 - g;
      if (tall > 1.45) cost[k] = 0; else if (cost[k]) cost[k] = Math.max(cost[k], 7);
    }
  }
}
function colContains(C, x, z, pad) {
  if (C.k === 1) return Math.hypot(x - C.x, z - C.z) < C.r + pad;
  const dx = x - C.x, dz = z - C.z, lx = dx * C.c - dz * C.s, lz = dx * C.s + dz * C.c;
  return Math.abs(lx) < C.hx + pad && Math.abs(lz) < C.hz + pad;
}
// Dijkstra from every cell within r of the target; dist in metres (Infinity where unreachable).
// The binary heap grows as needed and is reused between calls.
const HEAP = { d: new Float64Array(1 << 16), k: new Int32Array(1 << 16) };
function computeFlow(key, tx, tz, r) {
  const n = NAV.n, cell = NAV.cell, cost = NAV.cost;
  // Float64 on purpose: float32 rounding makes equal paths look shorter and re-relaxes them without end
  const dist = new Float64Array(n * n).fill(Infinity);
  let hd = HEAP.d, hk = HEAP.k, hn = 0;
  const push = (k, d) => {
    if (hn >= hd.length) {
      const nd = new Float64Array(hd.length * 2), nk = new Int32Array(hk.length * 2);
      nd.set(hd); nk.set(hk); HEAP.d = hd = nd; HEAP.k = hk = nk;
    }
    let i = hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (hd[p] <= d) break; hd[i] = hd[p]; hk[i] = hk[p]; i = p; }
    hd[i] = d; hk[i] = k;
  };
  const pop = () => {
    const top = hk[0]; hn--;
    const d = hd[hn], k = hk[hn];
    let i = 0;
    for (;;) {
      const l = i * 2 + 1; if (l >= hn) break;
      const m = l + 1 < hn && hd[l + 1] < hd[l] ? l + 1 : l;
      if (hd[m] >= d) break;
      hd[i] = hd[m]; hk[i] = hk[m]; i = m;
    }
    hd[i] = d; hk[i] = k;
    return top;
  };
  const ci = Math.floor((tx + NAV.half) / cell), cj = Math.floor((tz + NAV.half) / cell), cr = Math.ceil(r / cell);
  for (let j = cj - cr; j <= cj + cr; j++) for (let i = ci - cr; i <= ci + cr; i++) {
    if (i < 0 || j < 0 || i >= n || j >= n) continue;
    if ((i - ci) * (i - ci) + (j - cj) * (j - cj) > cr * cr) continue;
    const k = j * n + i; if (!cost[k]) continue;
    dist[k] = 0; push(k, 0);
  }
  const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (hn > 0) {
    const d0 = hd[0], k = pop();
    if (d0 > dist[k]) continue;
    const i = k % n, j = (k - i) / n;
    for (let q = 0; q < 8; q++) {
      const di = D8[q][0], dj = D8[q][1];
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= n || b >= n) continue;
      const kk = b * n + a, c = cost[kk];
      if (!c) continue;
      if (di && dj && (!cost[j * n + a] || !cost[b * n + i])) continue;   // no corner cutting
      const nd = d0 + D8[q][2] * cell * c;
      if (nd < dist[kk]) { dist[kk] = nd; push(kk, nd); }
    }
  }
  NAV.flows[key] = dist;
  return dist;
}
// Direction down the flow field from (x, z); falls back to a straight line. Returns remaining distance or -1.
function flowDir(dist, x, z, tx, tz, out) {
  const n = NAV.n, cell = NAV.cell;
  const i = Math.floor((x + NAV.half) / cell), j = Math.floor((z + NAV.half) / cell);
  const k = j * n + i;
  if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1 || !isFinite(dist[k])) {
    const dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz) || 1; out.x = dx / l; out.z = dz / l; return -1;
  }
  let best = dist[k], bi = 0, bj = 0;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    if (!di && !dj) continue;
    const d = dist[(j + dj) * n + i + di];
    if (d < best) { best = d; bi = di; bj = dj; }
  }
  if (!bi && !bj) { const dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz) || 1; out.x = dx / l; out.z = dz / l; return dist[k]; }
  // aim at the centre of the next-but-one cell for smoother paths
  const nx = -NAV.half + (i + bi + 0.5) * cell, nz = -NAV.half + (j + bj + 0.5) * cell;
  const dx = nx - x + bi * cell * 0.5, dz = nz - z + bj * cell * 0.5, l = Math.hypot(dx, dz) || 1;
  out.x = dx / l; out.z = dz / l;
  return dist[k];
}
