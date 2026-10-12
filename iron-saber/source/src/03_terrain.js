// Iron Saber — one seamless map: city in the middle, mountains north, desert east, forest west,
// plains, lake and the Coalition base south. Heightfield, terrain shading, water, trees and boulders.

const HALF = 2600, TN = 400, TS = (HALF * 2) / TN, TW = TN + 1;
const CITY_HALF = 700, BLOCK = 140, ROAD_HW = 14, WALK_W = 5;
const WATER_Y = 1.2;
const LAKE = { x: 820, z: 1560, r: 320 };
const BASE = { x: 0, z: 1180, hx: 250, hz: 150 };
const SITES = {
  base: { x: 0, z: 1180, r: 270 },
  outpost: { x: 1720, z: 120, r: 190 },
  relay: { x: 430, z: -1640, r: 95 },
  clearing: { x: -1560, z: -260, r: 130 },
  depot: { x: 1080, z: 640, r: 90 },
  yard: { x: -1050, z: 480, r: 90 },
};
const PADS = Object.values(SITES);

const BW_TMP = {};
// Biome weights: a warped compass so the regions meet along ragged, organic borders.
function biomeW(x, z, o) {
  const wx = x + (vnoise(x * 0.0011 + 3.1, z * 0.0011) - 0.5) * 1100;
  const wz = z + (vnoise(x * 0.0011, z * 0.0011 + 8.7) - 0.5) * 1100;
  const L = Math.hypot(wx, wz) || 1, cx = wx / L, cz = wz / L;
  let d = Math.max(0, cx), f = Math.max(0, -cx), m = Math.max(0, -cz), p = Math.max(0, cz);
  d *= d; d *= d; f *= f; f *= f; m *= m; m *= m; p *= p; p *= p;
  const s = d + f + m + p || 1;
  o.desert = d / s; o.forest = f / s; o.mtn = m / s; o.plains = p / s;
  const dc = Math.max(Math.abs(x), Math.abs(z));
  o.city = 1 - smooth(CITY_HALF + 20, CITY_HALF + 300, dc);
  o.dc = dc;
  return o;
}
const regionName = (x, z) => {
  const W = biomeW(x, z, BW_TMP);
  if (Math.abs(x - BASE.x) < BASE.hx + 60 && Math.abs(z - BASE.z) < BASE.hz + 60) return 'COALITION BASE';
  if (W.city > 0.5) return 'NEW HAVEN CITY';
  const m = Math.max(W.desert, W.forest, W.mtn, W.plains);
  return m === W.desert ? 'KESRA DESERT' : m === W.forest ? 'ELDWOOD FOREST' : m === W.mtn ? 'GREYSPINE MOUNTAINS' : 'MERIDIAN PLAINS';
};

function hDesert(x, z, dc) {
  const n = fbm(x * 0.0035, z * 0.0035, 3);
  const dune = Math.pow(Math.abs(Math.sin(x * 0.0105 + z * 0.0045 + n * 7)), 1.6) * 14 * (0.4 + n);
  const m = fbm(x * 0.0014 + 40, z * 0.0014 - 10, 3);
  const mesa = (smooth(0.6, 0.625, m) * 70 + smooth(0.68, 0.7, m) * 45) * smooth(CITY_HALF + 300, CITY_HALF + 700, dc);
  return 4 + dune + mesa;
}
function hMtn(x, z, dc) {
  const k = smooth(CITY_HALF + 120, 1900, dc);
  return 10 + k * (60 + 660 * Math.pow(ridged(x * 0.0013, z * 0.0013, 5), 1.8)) + fbm(x * 0.01, z * 0.01, 2) * 8;
}
function hForest(x, z, dc) {
  return 6 + 75 * fbm(x * 0.0022 + 7, z * 0.0022, 4) * smooth(CITY_HALF, CITY_HALF + 500, dc) + 5 * vnoise(x * 0.02, z * 0.02);
}
function hPlains(x, z) { return 4 + 11 * fbm(x * 0.0025, z * 0.0025, 3); }

function rawH(x, z) {
  const W = biomeW(x, z, BW_TMP), dc = W.dc;
  let h = W.desert * hDesert(x, z, dc) + W.mtn * hMtn(x, z, dc) + W.forest * hForest(x, z, dc) + W.plains * hPlains(x, z);
  h *= 1 - W.city;
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z) + (vnoise(x * 0.01, z * 0.01) - 0.5) * 80;
  h = lerp(h, -9, 1 - smooth(LAKE.r * 0.45, LAKE.r, ld));
  h += smooth(2050, 2550, dc) * (220 + 420 * ridged(x * 0.002 + 5, z * 0.002, 3));
  return h;
}
for (const p of PADS) p.h = rawH(p.x, p.z);
function genH(x, z) {
  let h = rawH(x, z);
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r + 120) h = lerp(h, p.h, 1 - smooth(p.r, p.r + 120, d));
  }
  return h;
}

// ---------- heightfield grid (collision matches the rendered triangles exactly) ----------
const HGT = new Float32Array(TW * TW);
for (let j = 0; j < TW; j++) for (let i = 0; i < TW; i++) HGT[j * TW + i] = genH(-HALF + i * TS, -HALF + j * TS);
function terrainH(x, z) {
  let fx = (x + HALF) / TS, fz = (z + HALF) / TS;
  fx = clamp(fx, 0, TN - 1e-4); fz = clamp(fz, 0, TN - 1e-4);
  const ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, k = iz * TW + ix;
  const h00 = HGT[k], h10 = HGT[k + 1], h01 = HGT[k + TW], h11 = HGT[k + TW + 1];
  return u > v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h01 - h00) * v + (h11 - h01) * u;
}
function terrainN(x, z, out) {
  return out.set(terrainH(x - 2, z) - terrainH(x + 2, z), 4, terrainH(x, z - 2) - terrainH(x, z + 2)).normalize();
}
const groundY = (x, z) => Math.max(terrainH(x, z), lakeAt(x, z) ? WATER_Y : -1e9);
const lakeAt = (x, z) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 120 && terrainH(x, z) < WATER_Y;
const inCity = (x, z) => Math.abs(x) < CITY_HALF && Math.abs(z) < CITY_HALF;
const inBase = (x, z) => Math.abs(x - BASE.x) < BASE.hx && Math.abs(z - BASE.z) < BASE.hz;

// ---------- terrain mesh ----------
const terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
terrainMat.onBeforeCompile = (sh) => {
  sh.uniforms.uBase = { value: new THREE.Vector4(BASE.x, BASE.z, BASE.hx, BASE.hz) };
  sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
    vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
  sh.fragmentShader = `varying vec3 vWP; uniform vec4 uBase;
  float th_(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float tn_(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(th_(i), th_(i + vec2(1.0, 0.0)), f.x), mix(th_(i + vec2(0.0, 1.0)), th_(i + vec2(1.0, 1.0)), f.x), f.y); }
  float band_(float d, float c, float w, float fw){ return 1.0 - smoothstep(w - fw, w + fw, abs(d - c)); }
  ` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
  {
    vec2 p = vWP.xz;
    float n = tn_(p * 0.11) * 0.5 + tn_(p * 0.43) * 0.3 + tn_(p * 1.7) * 0.2;
    diffuseColor.rgb *= 0.86 + 0.28 * n;
    float ci = max(abs(p.x), abs(p.y));
    if (ci < 714.0) {
      vec2 q = p + 700.0;
      vec2 cell = floor(q / 140.0);
      vec2 m = q - cell * 140.0;
      vec2 dr = min(m, 140.0 - m);
      float d = min(dr.x, dr.y);
      float fw = fwidth(d) + 0.03;
      vec3 col = vec3(0.6, 0.59, 0.56) * (0.92 + 0.1 * n);
      vec2 g = fract(q / 6.0);
      col *= 1.0 - step(0.965, max(g.x, g.y)) * 0.1 * (1.0 - clamp(fw * 4.0, 0.0, 1.0));
      if ((cell.x == 3.0 && cell.y == 5.0) || (cell.x == 6.0 && cell.y == 7.0)) {
        col = vec3(0.33, 0.47, 0.22) * (0.85 + 0.3 * n);
        vec2 pc = m - 70.0;
        float path = min(abs(pc.x - pc.y), abs(pc.x + pc.y)) / 1.414;
        col = mix(col, vec3(0.72, 0.66, 0.52), 1.0 - smoothstep(2.5 - fw, 2.5 + fw, path));
      }
      col = mix(col, vec3(0.7, 0.69, 0.66) * (0.95 + 0.05 * n), 1.0 - smoothstep(19.0 - fw, 19.0 + fw, d));
      float road = 1.0 - smoothstep(14.0 - fw, 14.0 + fw, d);
      vec3 asp = vec3(0.19, 0.195, 0.205) * (0.88 + 0.24 * n);
      bool alongZ = dr.x < dr.y;
      float across = alongZ ? dr.x : dr.y;
      float other = alongZ ? dr.y : dr.x;
      float along = alongZ ? q.y : q.x;
      float sharp = 1.0 - clamp(fw * 3.0, 0.0, 1.0);
      if (other > 14.0) {
        float yl = band_(across, 0.35, 0.12, fw);
        asp = mix(asp, vec3(0.85, 0.7, 0.2), yl * sharp);
        float wl = band_(across, 7.0, 0.12, fw) * step(0.5, fract(along / 9.0));
        asp = mix(asp, vec3(0.85), wl * sharp);
        float zb = step(15.5, other) * (1.0 - step(20.0, other)) * step(0.5, fract(across / 1.6));
        asp = mix(asp, vec3(0.8), zb * sharp * 0.9);
      }
      col = mix(col, asp, road);
      diffuseColor.rgb = mix(diffuseColor.rgb, col, 1.0 - smoothstep(706.0, 714.0, ci));
    }
    vec2 bq = p - uBase.xy;
    if (abs(bq.x) < uBase.z && abs(bq.y) < uBase.w) {
      float fw = fwidth(bq.x) + 0.03;
      vec2 g = fract(bq / 10.0);
      vec3 col = vec3(0.58, 0.58, 0.56) * (0.9 + 0.12 * n);
      col *= 1.0 - step(0.97, max(g.x, g.y)) * 0.15;
      float taxi = band_(bq.y, 20.0, 0.4, fw) + band_(bq.y, -95.0, 0.4, fw);
      for (int i = 0; i < 4; i++) {
        vec2 c = vec2(-150.0 + float(i) * 100.0, -40.0);
        float r = length(bq - c);
        taxi += band_(r, 17.0, 0.5, fw);
        taxi += band_(bq.x, c.x, 0.4, fw) * step(-40.0, bq.y) * step(bq.y, 20.0);
      }
      col = mix(col, vec3(0.92, 0.75, 0.18), clamp(taxi, 0.0, 1.0));
      float edge = smoothstep(uBase.z - 4.0, uBase.z, abs(bq.x)) + smoothstep(uBase.w - 4.0, uBase.w, abs(bq.y));
      diffuseColor.rgb = mix(col, diffuseColor.rgb, clamp(edge, 0.0, 1.0));
    }
  }`);
};
terrainMat.customProgramCacheKey = () => 'is-terrain';

const TCOL = {
  sand: hex(0xd6b384), sand2: hex(0xc79c68), red: hex(0xa8603e), rock: hex(0x77706a), rockD: hex(0x5d5752),
  grass: hex(0x6f8a42), forest: hex(0x3d5a2a), plains: hex(0x7e9446), snow: hex(0xf2f4f8), city: hex(0x8e8c86), mud: hex(0x6d5f45),
};
function terrainColor(x, y, z, ny, out) {
  const W = biomeW(x, z, BW_TMP);
  const n = vnoise(x * 0.02, z * 0.02);
  const c = [0, 0, 0];
  const add = (col, w) => { c[0] += col[0] * w; c[1] += col[1] * w; c[2] += col[2] * w; };
  const steep = 1 - smooth(0.62, 0.86, ny);
  // desert: sand, with banded red rock on mesa cliffs
  const dc = steep > 0.3 ? (Math.sin(y * 0.35) > 0 ? TCOL.red : TCOL.sand2) : (n > 0.5 ? TCOL.sand : TCOL.sand2);
  add(dc, W.desert);
  // mountains: meadow, rock, snow
  let mc = lerpC(TCOL.grass, TCOL.rock, clamp(smooth(120, 300, y) + steep, 0, 1));
  if (y > 420 + n * 90 && ny > 0.55) mc = TCOL.snow;
  add(mc, W.mtn);
  add(steep > 0.4 ? TCOL.rockD : TCOL.forest, W.forest);
  add(steep > 0.5 ? TCOL.rock : TCOL.plains, W.plains);
  let r = c[0], g = c[1], b = c[2];
  const cw = W.city;
  r = lerp(r, TCOL.city[0], cw); g = lerp(g, TCOL.city[1], cw); b = lerp(b, TCOL.city[2], cw);
  if (y < WATER_Y + 2.5 && Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 80) { r = TCOL.mud[0]; g = TCOL.mud[1]; b = TCOL.mud[2]; }
  if (W.dc > 2000 && y > 300 + n * 120 && ny > 0.6) { r = TCOL.snow[0]; g = TCOL.snow[1]; b = TCOL.snow[2]; }
  const j = 0.93 + hash2(x | 0, z | 0) * 0.14;
  return out.setRGB(r * j, g * j, b * j);
}
function lerpC(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

const TCHUNK = 40;
function buildTerrain() {
  const c = new THREE.Color(), nrm = new V3();
  for (let cz = 0; cz < TN / TCHUNK; cz++) for (let cx = 0; cx < TN / TCHUNK; cx++) {
    const n = TCHUNK + 1, pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const gi = cx * TCHUNK + i, gj = cz * TCHUNK + j, k = (j * n + i) * 3;
      const x = -HALF + gi * TS, z = -HALF + gj * TS, y = HGT[gj * TW + gi];
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      const hl = HGT[gj * TW + Math.max(gi - 1, 0)], hr = HGT[gj * TW + Math.min(gi + 1, TN)];
      const hd = HGT[Math.max(gj - 1, 0) * TW + gi], hu = HGT[Math.min(gj + 1, TN) * TW + gi];
      nrm.set(hl - hr, 2 * TS, hd - hu).normalize();
      nor[k] = nrm.x; nor[k + 1] = nrm.y; nor[k + 2] = nrm.z;
      terrainColor(x, y, z, nrm.y, c);
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
    const idx = [];
    for (let j = 0; j < TCHUNK; j++) for (let i = 0; i < TCHUNK; i++) {
      const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
      idx.push(a, e, b, a, d, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, terrainMat);
    m.receiveShadow = true;
    scene.add(m);
  }
  // the lake
  const wg = new THREE.CircleGeometry(LAKE.r + 130, 48).rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({ color: 0x2c6684, specular: 0x8899aa, shininess: 90, transparent: true, opacity: 0.86 }));
  water.position.set(LAKE.x, WATER_Y, LAKE.z);
  water.receiveShadow = true;
  scene.add(water);
}

// ---------- trees (chunked instancing so off-screen forest is culled) ----------
const TREES = [];
const TREE_GRID = new Map();
const TFALL = [];
const tKey = (x, z) => (Math.floor(x / 20) + 200) * 1000 + (Math.floor(z / 20) + 200);
const TREE_CH = 520;
const treeChunks = new Map();
function addTree(x, z, kind, h) {
  const y = terrainH(x, z);
  const t = { x, y, z, h, kind, yaw: hash2(x * 7 | 0, z * 3 | 0) * TAU, alive: true, fall: 0, fv: 0, fx: 0, fz: 0, mesh: null, slot: -1 };
  TREES.push(t);
  const k = tKey(x, z);
  let l = TREE_GRID.get(k);
  if (!l) TREE_GRID.set(k, l = []);
  l.push(t);
  return t;
}
function treeGeos() {
  const bark = hex(0x5a4330), cact = hex(0x5d7d3c);
  const pine = mergeParts([
    { geo: new THREE.CylinderGeometry(0.018, 0.03, 0.3, 5, 1, true), p: [0, 0.15, 0], c: bark },
    { geo: new THREE.ConeGeometry(0.19, 0.42, 7, 1, true), p: [0, 0.42, 0], c: [0.2, 0.33, 0.2] },
    { geo: new THREE.ConeGeometry(0.15, 0.36, 7, 1, true), p: [0, 0.62, 0], c: [0.22, 0.37, 0.22] },
    { geo: new THREE.ConeGeometry(0.1, 0.3, 6, 1, true), p: [0, 0.84, 0], c: [0.25, 0.41, 0.24] },
  ]);
  const leaf = mergeParts([
    { geo: new THREE.CylinderGeometry(0.03, 0.05, 0.5, 5, 1, true), p: [0, 0.25, 0], c: bark },
    { geo: new THREE.IcosahedronGeometry(0.28, 0), p: [0, 0.66, 0], s: [1, 0.85, 1], c: [0.34, 0.5, 0.22] },
    { geo: new THREE.IcosahedronGeometry(0.19, 0), p: [0.15, 0.8, 0.08], c: [0.38, 0.55, 0.25] },
  ]);
  const cactus = mergeParts([
    { geo: new THREE.CylinderGeometry(0.07, 0.08, 1, 6), p: [0, 0.5, 0], c: cact },
    { geo: new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), p: [0.15, 0.5, 0], r: [0, 0, Math.PI / 2], c: cact },
    { geo: new THREE.CylinderGeometry(0.05, 0.05, 0.35, 6), p: [0.28, 0.68, 0], c: cact },
    { geo: new THREE.CylinderGeometry(0.045, 0.045, 0.22, 6), p: [-0.12, 0.38, 0], r: [0, 0, Math.PI / 2], c: cact },
    { geo: new THREE.CylinderGeometry(0.045, 0.045, 0.28, 6), p: [-0.22, 0.52, 0], c: cact },
  ]);
  return [pine, leaf, cactus];
}
function plantTrees() {
  const W = {};
  const STEP = 17;
  for (let z = -HALF + 40; z < HALF - 40; z += STEP) for (let x = -HALF + 40; x < HALF - 40; x += STEP) {
    const px = x + (hash2(x, z) - 0.5) * STEP * 0.9, pz = z + (hash2(z, x + 7) - 0.5) * STEP * 0.9;
    biomeW(px, pz, W);
    if (W.city > 0.02) continue;
    if (PADS.some((p) => Math.hypot(px - p.x, pz - p.z) < p.r + 25)) continue;
    const h = terrainH(px, pz);
    if (h < WATER_Y + 1.5 && Math.hypot(px - LAKE.x, pz - LAKE.z) < LAKE.r + 100) continue;
    const slope = Math.abs(terrainH(px + 5, pz) - h) + Math.abs(terrainH(px, pz + 5) - h);
    if (slope > 6) continue;
    const clump = vnoise(px * 0.006 + 2, pz * 0.006);
    const r = hash2(px * 13 | 0, pz * 17 | 0);
    if (r < W.forest * 0.85 * smooth(0.25, 0.4, clump)) addTree(px, pz, hash2(px | 0, 99) < 0.55 ? 0 : 1, 14 + hash2(px | 0, pz | 0) * 16);
    else if (r < W.mtn * 0.45 * smooth(0.35, 0.5, clump) * (1 - smooth(260, 380, h))) addTree(px, pz, 0, 15 + hash2(pz | 0, px | 0) * 14);
    else if (r < W.plains * 0.05 * smooth(0.4, 0.55, clump)) addTree(px, pz, 1, 10 + hash2(pz | 0, 3) * 10);
    else if (r < W.desert * 0.025 && h < 40) addTree(px, pz, 2, 4 + hash2(pz | 0, 5) * 4);
  }
}
function finishTrees() {
  const geos = treeGeos();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const groups = new Map();
  for (const t of TREES) {
    const ck = Math.floor((t.x + HALF) / TREE_CH) * 100 + Math.floor((t.z + HALF) / TREE_CH);
    const key = ck * 4 + t.kind;
    let g = groups.get(key);
    if (!g) groups.set(key, g = { kind: t.kind, ck, list: [] });
    g.list.push(t);
  }
  const c = new THREE.Color();
  for (const g of groups.values()) {
    const geo = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'color']) geo.setAttribute(k, geos[g.kind].attributes[k]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const t of g.list) { x0 = Math.min(x0, t.x); x1 = Math.max(x1, t.x); z0 = Math.min(z0, t.z); z1 = Math.max(z1, t.z); y0 = Math.min(y0, t.y); y1 = Math.max(y1, t.y + t.h); }
    const ctr = new V3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    geo.boundingSphere = new THREE.Sphere(ctr, Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 30);
    const m = new THREE.InstancedMesh(geo, mat, g.list.length);
    m.castShadow = true;
    g.list.forEach((t, i) => {
      t.mesh = m; t.slot = i;
      writeTree(t);
      const j = 0.82 + hash2(t.x | 0, t.z | 0) * 0.32;
      m.setColorAt(i, c.setRGB(j * (0.94 + hash2(i, 2) * 0.14), j, j * 0.92));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    scene.add(m);
    TREE_MESHES.push(m);
  }
}
const TREE_MESHES = [];
// Far-off forest chunks melt into the haze anyway; skip drawing them.
function cullTrees() {
  const far = Math.min(scene.fog.far * 0.6, 3000);
  for (const m of TREE_MESHES) m.visible = m.geometry.boundingSphere.center.distanceTo(camera.position) - m.geometry.boundingSphere.radius < far;
}
function writeTree(t) {
  _q1.setFromAxisAngle(UP, t.yaw);
  if (t.fall > 0) { _v3.set(t.fz, 0, -t.fx); _q2.setFromAxisAngle(_v3, t.fall); _q1.premultiply(_q2); }
  _m4.compose(_v1.set(t.x, t.y - (t.fall > 0 ? 0.4 : 0), t.z), _q1, _v2.set(t.h, t.h, t.h));
  t.mesh.setMatrixAt(t.slot, _m4);
  t.mesh.instanceMatrix.needsUpdate = true;
}
// Something heavy pushed through (x,z): trees within r topple away from it.
function knockTrees(x, z, r, fromX, fromZ, power = 1) {
  let n = 0;
  const g0x = Math.floor((x - r) / 20), g1x = Math.floor((x + r) / 20), g0z = Math.floor((z - r) / 20), g1z = Math.floor((z + r) / 20);
  for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
    const l = TREE_GRID.get((gx + 200) * 1000 + gz + 200);
    if (!l) continue;
    for (const t of l) {
      if (!t.alive || t.fall > 0) continue;
      const dx = t.x - x, dz = t.z - z;
      if (dx * dx + dz * dz > r * r) continue;
      let ax = t.x - fromX, az = t.z - fromZ;
      const L = Math.hypot(ax, az) || 1;
      t.fx = ax / L; t.fz = az / L; t.fall = 0.02; t.fv = 0.3 + power * 0.4;
      TFALL.push(t);
      leafBurst(t.x, t.y + t.h * 0.7, t.z, t.kind === 0 ? 1 : 0, null);
      n++;
    }
  }
  if (n) treeCrack(_v5.set(x, terrainH(x, z) + 5, z), n);
  return n;
}
function updateTrees(dt) {
  for (let i = TFALL.length - 1; i >= 0; i--) {
    const t = TFALL[i];
    t.fv += dt * 2.6 * Math.sin(t.fall + 0.15);
    t.fall += t.fv * dt;
    if (t.fall >= 1.45) {
      t.fall = 1.45; t.alive = false;
      dustAt(t.x + t.fx * t.h * 0.6, t.y + 1, t.z + t.fz * t.h * 0.6, t.h * 0.25, 2);
      TFALL.splice(i, 1);
    }
    writeTree(t);
  }
}

// ---------- boulders ----------
const ROCKS = [];
const ROCK_GRID = new Map();
function placeRocks() {
  const W = {};
  for (let i = 0; i < 2600 && ROCKS.length < 900; i++) {
    const x = rr(-HALF + 60, HALF - 60), z = rr(-HALF + 60, HALF - 60);
    biomeW(x, z, W);
    if (W.city > 0.05 || PADS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 20)) continue;
    const want = W.desert * 0.7 + W.mtn * 0.8 + W.forest * 0.15 + W.plains * 0.1;
    if (rand() > want) continue;
    const r = rr(1.5, 4) * (rand() < 0.15 ? 3 : 1);
    const y = terrainH(x, z);
    if (y < WATER_Y) continue;
    const o = { x, y, z, r, col: W.desert > 0.5 ? hex(0xa0704c) : hex(0x7a756e) };
    ROCKS.push(o);
    const k = tKey(x, z);
    let l = ROCK_GRID.get(k);
    if (!l) ROCK_GRID.set(k, l = []);
    l.push(o);
  }
  const m = new THREE.InstancedMesh(flatGeo(new THREE.DodecahedronGeometry(1, 0)), new THREE.MeshLambertMaterial({ color: 0xffffff }), ROCKS.length);
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  const c = new THREE.Color();
  ROCKS.forEach((o, i) => {
    _e1.set(rand() * 3, rand() * 3, rand() * 3);
    _m4.compose(_v1.set(o.x, o.y + o.r * 0.25, o.z), _q1.setFromEuler(_e1), _v2.set(o.r * rr(1, 1.4), o.r * rr(0.6, 0.9), o.r * rr(1, 1.3)));
    m.setMatrixAt(i, _m4);
    m.setColorAt(i, c.setRGB(o.col[0] * rr(0.85, 1.1), o.col[1] * rr(0.85, 1.1), o.col[2] * rr(0.85, 1.1)));
  });
  scene.add(m);
}
function rocksNear(x, z, r, fn) {
  const g0x = Math.floor((x - r - 12) / 20), g1x = Math.floor((x + r + 12) / 20), g0z = Math.floor((z - r - 12) / 20), g1z = Math.floor((z + r + 12) / 20);
  for (let gx = g0x; gx <= g1x; gx++) for (let gz = g0z; gz <= g1z; gz++) {
    const l = ROCK_GRID.get((gx + 200) * 1000 + gz + 200);
    if (l) for (const o of l) fn(o);
  }
}
