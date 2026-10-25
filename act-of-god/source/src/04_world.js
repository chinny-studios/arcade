// Act of God — the world: the terrain function (hills, mountains, sea, rivers, lakes), the heightmap, urban intensity,
// districts, the road grid and its graph, blocks, parcels, buildings and trees as records, and the ground texture.
//
// x grows east, z grows south, y up, metres. The world is a square of W.M metres; the terrain grid has W.V vertices a side,
// W.cs metres apart. The road grid lives on TILE-metre tiles.

const TILE = 10;
const SIZES = {
  mega: { label: 'Megacity', world: 4000, cs: 20, pop: [11e6, 24e6], hmax: 460, block: 10, centers: 4, core: 0.62, spread: 0.62, hosp: 9, fire: 14, police: 8, churches: 10, stadiums: 2, desc: 'Endless towers to the horizon. Tens of millions of lives.' },
  metro: { label: 'Metropolis', world: 3200, cs: 16, pop: [2.5e6, 7e6], hmax: 320, block: 10, centers: 3, core: 0.66, spread: 0.5, hosp: 6, fire: 9, police: 5, churches: 7, stadiums: 1, desc: 'A great city of skyscrapers, bridges and boroughs.' },
  city: { label: 'City', world: 2400, cs: 12, pop: [350e3, 1.2e6], hmax: 190, block: 9, centers: 2, core: 0.7, spread: 0.36, hosp: 4, fire: 5, police: 3, churches: 5, stadiums: 1, desc: 'A downtown of towers ringed by neighbourhoods.' },
  town: { label: 'Town', world: 1600, cs: 10, pop: [22e3, 90e3], hmax: 42, block: 8, centers: 2, core: 0.8, spread: 0.3, hosp: 1, fire: 2, police: 1, churches: 3, stadiums: 0, desc: 'Main street, a few apartment blocks and the suburbs.' },
  small: { label: 'Small town', world: 1200, cs: 8, pop: [1400, 7500], hmax: 16, block: 7, centers: 1, core: 0.95, spread: 0.22, hosp: 1, fire: 1, police: 1, churches: 2, stadiums: 0, desc: 'A crossroads, a church, farms all around.' },
};
const WATER_KINDS = ['coast', 'bay', 'river', 'lake', 'delta', 'island', 'none'];
const BIOMES = {
  temperate: { grass: [0.36, 0.47, 0.22], grass2: [0.3, 0.42, 0.2], forest: [0.22, 0.34, 0.15], rock: [0.46, 0.44, 0.4], sand: [0.82, 0.76, 0.58], snow: 330, trees: 0.7, conifer: 0.3, fields: ['#b9a65a', '#7e9a46', '#8a6a44', '#a8b060', '#c8b46a', '#6a8a3a'] },
  desert: { grass: [0.66, 0.55, 0.4], grass2: [0.61, 0.5, 0.35], forest: [0.5, 0.45, 0.3], rock: [0.56, 0.42, 0.32], sand: [0.78, 0.69, 0.52], snow: 9999, trees: 0.12, conifer: 0, fields: ['#5a7a36', '#73883e', '#9a8452', '#687f3c'] },
  northern: { grass: [0.33, 0.42, 0.28], grass2: [0.28, 0.38, 0.26], forest: [0.16, 0.26, 0.16], rock: [0.42, 0.42, 0.42], sand: [0.7, 0.68, 0.6], snow: 190, trees: 0.9, conifer: 0.85, fields: ['#8a9a50', '#a89a5a', '#6a7a40', '#7a6044'] },
  tropical: { grass: [0.32, 0.44, 0.22], grass2: [0.28, 0.4, 0.2], forest: [0.15, 0.3, 0.13], rock: [0.44, 0.42, 0.36], sand: [0.9, 0.84, 0.66], snow: 9999, trees: 0.95, conifer: 0, fields: ['#6aa040', '#8ab04a', '#a0a050', '#5a9038'] },
};
// tile classes painted on the ground and used by Grow and Bloom
const T_GRASS = 0, T_ROAD = 1, T_LOT = 2, T_PARK = 3, T_FIELD = 4, T_FOREST = 5, T_WATER = 6, T_YARD = 7, T_PLAZA = 8;

const W = {
  sizeKey: 'city', def: null, seed: 0, gen: null, M: 2400, cs: 12, N: 200, V: 201, h: null, h0: null,
  TN: 240, tile: null, name: '', districts: [], buildings: [], trees: [], nodes: [], edges: [], hospitals: [], fireSt: [], police: [], churches: [],
  ov: null, ovTex: null, ovDirty: false, groundTex: null, roadTex: null, terrain: null, skirt: null, popCap: 0, wealth: 0,
};

// ---------- the terrain function ----------
// Signed distance to each water feature (negative inside the water) with its depth profile.
function waterFeatures(x, z, out) {
  const g = W.gen, M = W.M;
  out.length = 0;
  const wob = (fbm(x / 420, z / 420, g.s + 11, 3) - 0.5) * 160;
  if (g.coast) {
    const d = g.coastDir, t = d === 0 ? z : d === 1 ? M - x : d === 2 ? M - z : x;
    let sd = t - (g.coastPos + wob);
    if (g.bay) { const bd = Math.hypot((x - g.bay.x) / g.bay.rx, (z - g.bay.z) / g.bay.rz) - 1; sd = Math.min(sd, bd * Math.min(g.bay.rx, g.bay.rz) + wob * 0.3); }
    out.push(sd, 70, 0.1, 34);
  }
  if (g.island) { const sd = g.island.r + wob * 1.4 - Math.hypot(x - M / 2, z - M / 2); out.push(sd, 80, 0.1, 34); }
  if (g.river) {
    const rv = g.river, u = rv.axis === 'x' ? x : z, v = rv.axis === 'x' ? z : x;
    const c = rv.base + rv.a1 * Math.sin(u * rv.f1 + rv.p1) + rv.a2 * Math.sin(u * rv.f2 + rv.p2);
    const dc = rv.a1 * rv.f1 * Math.cos(u * rv.f1 + rv.p1) + rv.a2 * rv.f2 * Math.cos(u * rv.f2 + rv.p2);
    let sd = Math.abs(v - c) / Math.sqrt(1 + dc * dc) - rv.w * (0.85 + 0.3 * vnoise(u / 300, 0, g.s + 3));
    // a delta river stops where it meets the sea
    if (rv.end !== undefined && (rv.endSign > 0 ? u > rv.end : u < rv.end)) sd = 1e9;
    out.push(sd, 14, 0.3, 9);
  }
  if (g.lake) { const L = g.lake; const sd = (Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz) - 1) * Math.min(L.rx, L.rz) + wob * 0.5; out.push(sd, 50, 0.12, 22); }
  return out;
}
function urbanDist(x, z) { // distance to the nearest city centre in units of that centre's radius
  let best = 1e9;
  for (const c of W.gen.centers) best = Math.min(best, Math.hypot(x - c.x, z - c.z) / c.r);
  return best;
}
function baseLand(x, z) {
  const g = W.gen;
  const n1 = fbm(x / 900 + 3.1, z / 900 - 7.7, g.s, 4);
  const amp = g.relief === 'flat' ? 10 : g.relief === 'hills' ? 46 : 60;
  let h = 3.5 + Math.max(0, n1 - 0.32) * amp;
  const du = urbanDist(x, z);
  if (g.relief === 'mountains') {
    const rd = ridged(x / 1500 + 9, z / 1500 - 4, g.s + 5, 4);
    h += Math.pow(rd, 2.3) * g.mtn * smooth(0.55, 1.6, du);
  } else if (g.relief === 'hills') {
    h += Math.pow(fbm(x / 600, z / 600, g.s + 9, 3), 2) * 60 * smooth(0.5, 1.4, du);
  }
  // cities sit on flatter ground
  const flat = 1 - smooth(0.25, 1.05, du);
  return lerp(h, 3.5 + Math.max(0, n1 - 0.32) * amp * 0.3, flat * 0.85);
}
const _wf = [];
function terrainFn(x, z) {
  let h = baseLand(x, z);
  const f = waterFeatures(x, z, _wf);
  for (let i = 0; i < f.length; i += 4) {
    const sd = f[i], shore = f[i + 1], slope = f[i + 2], maxD = f[i + 3];
    if (sd >= shore) continue;
    const hf = sd < 0 ? -Math.min(maxD, 1.4 + -sd * slope) : lerp(1.1, h, smooth(0, shore, sd));
    h = Math.min(h, hf);
  }
  return h;
}

// ---------- heightmap queries ----------
const hIdx = (i, j) => j * W.V + i;
function heightAt(x, z) {
  const f = clamp(x / W.cs, 0, W.N - 0.001), g = clamp(z / W.cs, 0, W.N - 0.001);
  const i = Math.floor(f), j = Math.floor(g), u = f - i, v = g - j, V = W.V, h = W.h;
  const a = h[j * V + i], b = h[j * V + i + 1], c = h[(j + 1) * V + i], d = h[(j + 1) * V + i + 1];
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function inWorld(x, z, m = 0) { return x >= m && z >= m && x <= W.M - m && z <= W.M - m; }
function slopeAt(x, z) { const e = W.cs; return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e); }

// urban intensity 0..1: how built-up the land is
function urbanI(x, z) {
  const g = W.gen;
  let v = 0;
  for (const c of g.centers) { const d = Math.hypot(x - c.x, z - c.z) / c.r; v = Math.max(v, c.w * Math.exp(-d * d * 1.5)); }
  v += (fbm(x / 520, z / 520, g.s + 21, 3) - 0.5) * 0.3;
  return clamp(v, 0, 1);
}

// ---------- generation ----------
function makeGen(sizeKey, seed) {
  const r = RNG(seed), def = SIZES[sizeKey], M = def.world;
  const g = { s: seed % 100000, relief: r.pick(['flat', 'hills', 'hills', 'mountains']), biome: r.pick(['temperate', 'temperate', 'temperate', 'desert', 'northern', 'tropical']), centers: [], mtn: r.range(160, 420) };
  let water = r.pick(WATER_KINDS);
  if (water === 'island' && sizeKey === 'mega') water = 'coast';
  g.water = water;
  if (water === 'coast' || water === 'bay' || water === 'delta') { g.coast = true; g.coastDir = r.int(0, 3); g.coastPos = M * r.range(0.12, 0.2); }
  if (water === 'bay') {
    const along = r.range(0.35, 0.65) * M, d = g.coastDir;
    const bx = d === 0 ? along : d === 1 ? M - g.coastPos : d === 2 ? along : g.coastPos, bz = d === 0 ? g.coastPos : d === 1 ? along : d === 2 ? M - g.coastPos : along;
    g.bay = { x: bx, z: bz, rx: M * r.range(0.14, 0.24), rz: M * r.range(0.14, 0.24) };
  }
  if (water === 'island') g.island = { r: M * r.range(0.4, 0.46) };
  if (water === 'river' || water === 'delta' || (water === 'none' && r.chance(0.35)) || (water === 'lake' && r.chance(0.3))) {
    const axis = r.chance(0.5) ? 'x' : 'z';
    let ax = axis;
    if (water === 'delta') ax = g.coastDir === 0 || g.coastDir === 2 ? 'z' : 'x'; // runs into the sea
    const wide = water === 'none' ? 0.5 : 1;
    g.river = { axis: ax, base: M * r.range(0.38, 0.62), a1: M * r.range(0.04, 0.1), f1: TAU / (M * r.range(0.7, 1.3)), p1: r.range(0, TAU), a2: M * r.range(0.01, 0.03), f2: TAU / (M * r.range(0.2, 0.35)), p2: r.range(0, TAU), w: Math.max(18, M * r.range(0.012, 0.022)) * wide };
  }
  if (water === 'lake') { const a = r.range(0, TAU); g.lake = { x: M / 2 + Math.cos(a) * M * 0.24, z: M / 2 + Math.sin(a) * M * 0.24, rx: M * r.range(0.12, 0.2), rz: M * r.range(0.1, 0.18) }; }
  // city centres: the main one near the middle (pushed inland), smaller boroughs around
  const mainR = M * def.spread;
  let cx = M / 2 + r.range(-0.06, 0.06) * M, cz = M / 2 + r.range(-0.06, 0.06) * M;
  if (g.coast) { const k = 0.08 * M; if (g.coastDir === 0) cz += k; if (g.coastDir === 1) cx -= k; if (g.coastDir === 2) cz -= k; if (g.coastDir === 3) cx += k; }
  g.centers.push({ x: cx, z: cz, r: mainR, w: 1 });
  for (let i = 1; i < def.centers; i++) {
    const a = r.range(0, TAU), d = M * r.range(0.18, 0.32);
    g.centers.push({ x: clamp(cx + Math.cos(a) * d, M * 0.15, M * 0.85), z: clamp(cz + Math.sin(a) * d, M * 0.15, M * 0.85), r: mainR * r.range(0.4, 0.6), w: r.range(0.72, 0.9) });
  }
  return g;
}

function generateWorld(sizeKey, seed) {
  const def = SIZES[sizeKey], r = RNG(seed * 7 + 1);
  Object.assign(W, { sizeKey, def, seed, M: def.world, cs: def.cs, N: def.world / def.cs, V: def.world / def.cs + 1, TN: def.world / TILE,
    districts: [], buildings: [], trees: [], nodes: [], edges: [], hospitals: [], fireSt: [], police: [], churches: [], blocks: [], parcels: [] });
  W.gen = makeGen(sizeKey, seed);
  W.biome = BIOMES[W.gen.biome];
  // a delta river ends at the coast
  if (W.gen.water === 'delta' && W.gen.river) { const rv = W.gen.river, d = W.gen.coastDir; rv.end = d === 0 || d === 3 ? W.gen.coastPos * 0.5 : W.M - W.gen.coastPos * 0.5; rv.endSign = d === 0 || d === 3 ? -1 : 1; }
  // heightmap
  const V = W.V;
  W.h = new Float32Array(V * V);
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) W.h[j * V + i] = terrainFn(i * W.cs, j * W.cs);
  W.h0 = W.h.slice();
  W.name = cityName(r, sizeKey, W.gen.water);
  W.tile = new Uint8Array(W.TN * W.TN);
  for (let j = 0; j < W.TN; j++) for (let i = 0; i < W.TN; i++) if (heightAt((i + 0.5) * TILE, (j + 0.5) * TILE) < 0.2) W.tile[j * W.TN + i] = T_WATER;
  buildRoads(r);
  buildBlocks(r);
  placeSpecials(r);
  makeDistricts(r);
  assignPopulation(r);
  W.ov = new Uint8Array(V * V * 4);
  for (let k = 0; k < V * V; k++) { W.ov[k * 4 + 2] = 255; W.ov[k * 4 + 3] = 128; }
}

// ---------- roads ----------
// Grid lines at about one block apart. Lines carry a class: 0 street, 1 avenue, 2 highway. Segments exist where the city
// is built up (or on highways and the country roads), and major lines bridge narrow water.
function buildRoads(r) {
  const def = W.def, TN = W.TN, B = def.block;
  const lines = (axis) => {
    const out = [];
    let p = r.int(2, B);
    let k = 0;
    while (p < TN - 3) { out.push({ p, cls: 0, k: k++, axis }); p += B + (r.chance(0.25) ? r.int(-1, 2) : 0); }
    for (const L of out) if (L.k % 4 === 2) L.cls = 1;
    return out;
  };
  const xs = lines('z'), zs = lines('x'); // xs: lines of constant x (roads running along z)
  const mid = (arr, frac) => arr.reduce((b, L) => (Math.abs(L.p - TN * frac) < Math.abs(b.p - TN * frac) ? L : b), arr[0]);
  const c0 = W.gen.centers[0];
  // highways through the main centre (cities and up); country roads in towns
  const hx = mid(xs, c0.x / W.M), hz = mid(zs, c0.z / W.M);
  if (W.sizeKey === 'mega' || W.sizeKey === 'metro' || W.sizeKey === 'city') {
    hx.cls = 2; hz.cls = 2;
    if (W.sizeKey !== 'city') { mid(xs, 0.22).cls = 2; mid(zs, 0.78).cls = 2; }
  } else { hx.cls = 1; hz.cls = 1; hx.rural = hz.rural = true; mid(xs, 0.2).rural = true; mid(zs, 0.8).rural = true; }
  W.xs = xs; W.zs = zs;
  const width = (L) => (L.cls === 2 ? 3 : L.cls === 1 ? 2 : 1);
  const nodeMap = new Map();
  const node = (i, j) => {
    const k = i * 1000 + j; let n = nodeMap.get(k);
    if (!n) { n = { id: W.nodes.length, i, j, x: (xs[i].p + width(xs[i]) / 2) * TILE, z: (zs[j].p + width(zs[j]) / 2) * TILE, edges: [], wx: width(xs[i]), wz: width(zs[j]) }; W.nodes.push(n); nodeMap.set(k, n); }
    return n;
  };
  const segOK = (ax, az, bx, bz, L) => {
    let water = 0, steep = 0;
    for (let k = 0; k <= 6; k++) { const x = lerp(ax, bx, k / 6), z = lerp(az, bz, k / 6); const h = heightAt(x, z); if (h < 0.4) water++; if (slopeAt(x, z) > 0.22) steep++; }
    const I = urbanI((ax + bx) / 2, (az + bz) / 2);
    return { water, steep, built: I > 0.1 || L.cls === 2 || L.rural };
  };
  const tryLine = (L, others, isX) => {
    // collect segments along the line, then bridge short water runs on major lines
    const segs = [];
    for (let k = 0; k < others.length - 1; k++) {
      const a = isX ? node(L.idx, k) : node(k, L.idx), bn = isX ? node(L.idx, k + 1) : node(k + 1, L.idx);
      const s = segOK(a.x, a.z, bn.x, bn.z, L);
      segs.push({ a, b: bn, ...s });
    }
    for (let k = 0; k < segs.length; k++) {
      const s = segs[k];
      if (s.water) {
        let e = k; while (e < segs.length && segs[e].water) e++;
        const run = e - k, ok = L.cls >= 1 && run <= (L.cls === 2 ? 5 : 3) && k > 0 && e < segs.length && segs[k - 1].built && segs[e].built && !segs[k - 1].water;
        for (let q = k; q < e; q++) segs[q].bridge = ok;
        k = e - 1;
      }
    }
    for (const s of segs) {
      if (s.water && !s.bridge) continue;
      if (!s.built || s.steep > 2) continue;
      addEdge(s.a, s.b, isX ? 'z' : 'x', L.cls, !!s.bridge);
    }
  };
  xs.forEach((L, i) => { L.idx = i; }); zs.forEach((L, j) => { L.idx = j; });
  for (const L of xs) tryLine(L, zs, true);
  for (const L of zs) tryLine(L, xs, false);
  function addEdge(a, b, axis, cls, bridge) {
    const e = { id: W.edges.length, a, b, axis, cls, bridge, len: dist(a.x, a.z, b.x, b.z), w: (cls === 2 ? 3 : cls === 1 ? 2 : 1) * TILE, open: true, cars: 0 };
    W.edges.push(e); a.edges.push(e); b.edges.push(e);
  }
  // keep the largest connected network only so every car can reach every other road
  const comp = new Map(); let best = null, bestN = 0;
  for (const n of W.nodes) {
    if (comp.has(n) || !n.edges.length) continue;
    const q = [n], c = []; comp.set(n, c);
    while (q.length) { const m = q.pop(); c.push(m); for (const e of m.edges) { const o = e.a === m ? e.b : e.a; if (!comp.has(o)) { comp.set(o, c); q.push(o); } } }
    if (c.length > bestN) { bestN = c.length; best = c; }
  }
  const keep = new Set(best || []);
  W.edges = W.edges.filter((e) => keep.has(e.a));
  W.nodes = W.nodes.filter((n) => keep.has(n));
  W.nodes.forEach((n, i) => { n.id = i; n.edges = n.edges.filter((e) => keep.has(e.a)); });
  W.edges.forEach((e, i) => { e.id = i; e.dx = (e.b.x - e.a.x) / e.len; e.dz = (e.b.z - e.a.z) / e.len; });
  // mark road tiles
  for (const e of W.edges) {
    const hw = e.w / 2;
    const x0 = Math.min(e.a.x, e.b.x) - (e.axis === 'z' ? hw : 0), x1 = Math.max(e.a.x, e.b.x) + (e.axis === 'z' ? hw : 0);
    const z0 = Math.min(e.a.z, e.b.z) - (e.axis === 'x' ? hw : 0), z1 = Math.max(e.a.z, e.b.z) + (e.axis === 'x' ? hw : 0);
    for (let tj = Math.floor(z0 / TILE); tj < Math.ceil(z1 / TILE); tj++) for (let ti = Math.floor(x0 / TILE); ti < Math.ceil(x1 / TILE); ti++) if (ti >= 0 && tj >= 0 && ti < W.TN && tj < W.TN) W.tile[tj * W.TN + ti] = T_ROAD;
  }
  // bridges become buildings so they can fall
  for (const e of W.edges) if (e.bridge) makeBridge(e);
}

// ---------- buildings ----------
// A building is a record with parts in local space (metres, origin at the centre of its base, rotated by rot):
// { g: 'box'|'roof'|'cyl'|'cone'|'dome', x, y, z, sx, sy, sz, col, st } where st is the facade style.
// Styles: 0 glass office, 1 concrete office, 2 apartments, 3 brick, 4 house, 5 industrial, 6 plain (no windows), 7 stone
const COLS = {
  glass: [0x6f8796, 0x5d7484, 0x7c8f9a, 0x4f6878, 0x8aa0aa, 0x6a7a70, 0x9aa4a8],
  concrete: [0xb8b4aa, 0xa8a49a, 0xc8c2b4, 0x9a968e, 0xd0c8b8, 0xb0a898],
  apt: [0xc8b89c, 0xd8ccb4, 0xb8a890, 0xc0b4a4, 0xa89888, 0xd4c4a4, 0xbcae98],
  brick: [0x9a4a34, 0x8a4430, 0xa85a40, 0x7a3a2a, 0x9a5a44],
  house: [0xe8e0d0, 0xd8c8a8, 0xc8d4dc, 0xe0d0c0, 0xb8c8b0, 0xf0e8d8, 0xd8b8a0, 0xc0b8d0, 0xe8d8b0],
  roof: [0x8a3a2a, 0x5a5a60, 0x6a4a3a, 0x3a4a5a, 0x7a6a5a, 0x4a4040, 0x9a5a3a],
  ind: [0xa8aaa4, 0x9a9c94, 0xb4aa98, 0x8a948c, 0xa49a8a],
};
function newBuilding(kind, x, z, w, d, rot, o = {}) {
  const b = Object.assign({ id: W.buildings.length, kind, x, z, w, d, h: 0, rot, y: 0, parts: [], pop: 0, pop0: 0, value: 0, hp: 1, dmg: 0, fire: 0, state: 0, c: 0, cv: 0, tilt: 0, tiltA: 0, sink: 0,
    inf: 0, rec: 0, power: 1, snow: 0, gold: 0, evac: 0, panic: 0, fuel: 1, district: 0, seed: Math.random() * 1000, special: '' }, o);
  // base height: the lowest corner so the building never floats
  const hw = w / 2, hd = d / 2, c = Math.cos(rot), s = Math.sin(rot);
  let lo = 1e9, hi = -1e9;
  for (const [a, e] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd], [0, 0]]) { const hh = heightAt(x + a * c + e * s, z - a * s + e * c); lo = Math.min(lo, hh); hi = Math.max(hi, hh); }
  b.y = lo - 0.3; b.relief = hi - lo;
  W.buildings.push(b);
  return b;
}
function part(b, g, x, y, z, sx, sy, sz, col, st) { b.parts.push({ g, x, y, z, sx, sy, sz, col, st: st === undefined ? 6 : st }); b.h = Math.max(b.h, y + sy); return b; }

function makeTower(x, z, w, d, I, r) {
  const def = W.def;
  const big = W.sizeKey === 'mega' || W.sizeKey === 'metro';
  let h = lerp(30, def.hmax, Math.pow(clamp((I - 0.55) / 0.45, 0, 1), 1.4) * Math.pow(r(), 1.7));
  if (big && r.chance(0.025) && I > 0.8) h = def.hmax * r.range(0.95, 1.2); // supertalls
  // no needles: height is limited by the footprint
  h = Math.min(h, Math.min(w, d) * 7.5);
  h = Math.max(24, h);
  const glass = r.chance(0.6);
  const col = glass ? r.pick(COLS.glass) : r.pick(COLS.concrete), st = glass ? 0 : 1;
  const b = newBuilding('tower', x, z, w, d, 0);
  const shape = r();
  if (shape < 0.35 && h > 70) { // setbacks
    const h1 = h * r.range(0.45, 0.6), h2 = h * r.range(0.25, 0.35);
    part(b, 'box', 0, 0, 0, w, h1, d, col, st);
    part(b, 'box', 0, h1, 0, w * 0.78, h2, d * 0.78, col, st);
    part(b, 'box', 0, h1 + h2, 0, w * 0.55, h - h1 - h2, d * 0.55, col, st);
  } else if (shape < 0.5 && h > 60) { // a podium and a slab
    const hp = r.range(12, 22);
    part(b, 'box', 0, 0, 0, w, hp, d, r.pick(COLS.concrete), 1);
    part(b, 'box', r.range(-0.1, 0.1) * w, hp, 0, w * 0.6, h - hp, d * 0.85, col, st);
  } else if (shape < 0.6 && h > 80) { // a round tower
    part(b, 'box', 0, 0, 0, w, 10, d, r.pick(COLS.concrete), 1);
    part(b, 'cyl', 0, 10, 0, Math.min(w, d) * 0.92, h - 10, Math.min(w, d) * 0.92, col, st);
  } else part(b, 'box', 0, 0, 0, w, h, d, col, st);
  const top = b.h;
  if (h > 120 && r.chance(0.45)) part(b, 'cyl', 0, top, 0, 1.2, r.range(15, 45), 1.2, 0x9aa0a4, 6); // a spire
  else if (r.chance(0.6)) part(b, 'box', r.range(-0.2, 0.2) * w, top, r.range(-0.2, 0.2) * d, w * 0.3, 4, d * 0.25, 0x8a8a86, 6); // rooftop plant
  return b;
}
function makeMidrise(x, z, w, d, I, r) {
  const h = lerp(12, Math.min(70, W.def.hmax * 0.5), clamp((I - 0.35) / 0.45, 0, 1) * r.range(0.4, 1.1));
  const office = r.chance(0.35);
  const col = office ? r.pick(COLS.concrete) : r.chance(0.3) ? r.pick(COLS.brick) : r.pick(COLS.apt), st = office ? 1 : COLS.brick.includes(col) ? 3 : 2;
  const b = newBuilding('apt', x, z, w, d, 0);
  part(b, 'box', 0, 0, 0, w, Math.max(9, h), d, col, st);
  if (r.chance(0.5)) part(b, 'box', r.range(-0.25, 0.25) * w, b.h, r.range(-0.25, 0.25) * d, 3, 3, 3, 0x8a8a86, 6);
  return b;
}
function makeHouse(x, z, rot, r, big) {
  const w = r.range(8, 11) * (big ? 1.25 : 1), d = r.range(7.5, 9.5) * (big ? 1.15 : 1), hw = r.chance(0.35) ? 6 : 3.2;
  const b = newBuilding('house', x, z, w, d, rot);
  part(b, 'box', 0, 0, 0, w, hw, d, r.pick(COLS.house), 4);
  part(b, 'roof', 0, hw, 0, w + 0.8, r.range(2.4, 3.6), d + 0.8, r.pick(COLS.roof), 6);
  return b;
}
function makeShop(x, z, w, d, rot, r) {
  const h = r.range(6.5, W.sizeKey === 'small' ? 9 : 13);
  const b = newBuilding('shop', x, z, w, d, rot);
  const brick = r.chance(0.55);
  part(b, 'box', 0, 0, 0, w, h, d, brick ? r.pick(COLS.brick) : r.pick(COLS.apt), brick ? 3 : 2);
  return b;
}
function makeIndustrial(x, z, w, d, r) {
  const b = newBuilding('ind', x, z, w, d, 0);
  const h = r.range(7, 15);
  part(b, 'box', 0, 0, 0, w, h, d, r.pick(COLS.ind), 5);
  if (r.chance(0.35)) part(b, 'cyl', w * 0.3, h, -d * 0.2, 2.2, r.range(14, 34), 2.2, 0x8a7a6a, 6);
  if (r.chance(0.3)) { const tr = Math.min(w, d) * 0.22; part(b, 'cyl', -w * 0.25, h, d * 0.2, tr * 2, tr * 1.2, tr * 2, 0xc8c8c0, 6); }
  return b;
}
function makeTank(x, z, rad, r) {
  const b = newBuilding('ind', x, z, rad * 2, rad * 2, 0, { special: 'tank' });
  part(b, 'cyl', 0, 0, 0, rad * 2, r.range(8, 14), rad * 2, r.pick([0xd8d8d0, 0xc8c0b0, 0xb0b8b8]), 6);
  part(b, 'dome', 0, b.h, 0, rad * 2, rad * 0.4, rad * 2, 0xc8c8c0, 6);
  return b;
}
function makeBridge(e) {
  const len = e.len, mx = (e.a.x + e.b.x) / 2, mz = (e.a.z + e.b.z) / 2;
  const rot = e.axis === 'x' ? 0 : Math.PI / 2;
  const b = newBuilding('bridge', mx, mz, len, e.w, rot, { edge: e });
  b.y = 0;
  const deckY = 7;
  part(b, 'box', 0, deckY, 0, len + 2, 1.6, e.w, 0x8a8a84, 6);
  part(b, 'box', 0, deckY + 1.6, e.w / 2 - 0.4, len + 2, 1.1, 0.5, 0x6a6a64, 6);
  part(b, 'box', 0, deckY + 1.6, -e.w / 2 + 0.4, len + 2, 1.1, 0.5, 0x6a6a64, 6);
  part(b, 'box', 0, -8, 0, 4, deckY + 8, e.w * 0.7, 0x7a7a74, 6);
  e.deckY = deckY + 1.6;
  e.bridgeB = b;
  return b;
}

// ---------- blocks and parcels ----------
function buildBlocks(r) {
  const xs = W.xs, zs = W.zs, wd = (L) => (L.cls === 2 ? 3 : L.cls === 1 ? 2 : 1);
  const big = W.sizeKey === 'mega' || W.sizeKey === 'metro' || W.sizeKey === 'city';
  const bounds = (arr, k) => [k < 0 ? 0 : (arr[k].p + wd(arr[k])) * TILE, k + 1 >= arr.length ? W.M : arr[k + 1].p * TILE];
  for (let bj = -1; bj < zs.length; bj++) for (let bi = -1; bi < xs.length; bi++) {
    const [x0, x1] = bounds(xs, bi), [z0, z1] = bounds(zs, bj);
    if (x1 - x0 < 20 || z1 - z0 < 20) continue;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const I = urbanI(cx, cz);
    // does any road touch this block?
    const roadNear = W.tile[clamp(Math.floor(z0 / TILE) - 1, 0, W.TN - 1) * W.TN + clamp(Math.floor(cx / TILE), 0, W.TN - 1)] === T_ROAD
      || W.tile[clamp(Math.floor(z1 / TILE), 0, W.TN - 1) * W.TN + clamp(Math.floor(cx / TILE), 0, W.TN - 1)] === T_ROAD
      || W.tile[clamp(Math.floor(cz / TILE), 0, W.TN - 1) * W.TN + clamp(Math.floor(x0 / TILE) - 1, 0, W.TN - 1)] === T_ROAD
      || W.tile[clamp(Math.floor(cz / TILE), 0, W.TN - 1) * W.TN + clamp(Math.floor(x1 / TILE), 0, W.TN - 1)] === T_ROAD;
    const blk = { x0, z0, x1, z1, cx, cz, I, zone: 'rural', road: roadNear };
    const sw = 3; // sidewalk
    const ix0 = x0 + sw, ix1 = x1 - sw, iz0 = z0 + sw, iz1 = z1 - sw;
    const indN = fbm(cx / 700, cz / 700, W.gen.s + 41, 2);
    if (!roadNear || I < 0.12) blk.zone = 'rural';
    else if (r.chance(0.07) && I > 0.2) blk.zone = 'park';
    else if (indN > 0.62 && I > 0.22 && I < 0.75 && big) blk.zone = 'ind';
    else if (I > W.def.core && big) blk.zone = 'core';
    else if (I > (big ? 0.48 : 0.62)) blk.zone = big ? 'mid' : 'main';
    else if (I > 0.27) blk.zone = 'res';
    else blk.zone = 'sub';
    W.blocks.push(blk);
    const z = blk.zone;
    if (z === 'rural') { ruralBlock(blk, r); continue; }
    if (z === 'park') { parkBlock(blk, r); continue; }
    if (z === 'core' || z === 'mid' || z === 'ind') {
      const maxS = z === 'core' ? (W.sizeKey === 'mega' || W.sizeKey === 'metro' ? r.range(40, 66) : r.range(32, 52)) : z === 'mid' ? r.range(26, 40) : r.range(40, 70);
      splitRect(ix0, iz0, ix1, iz1, maxS, r, (a, b, c, d) => {
        const w = c - a, dd = d - b, px = (a + c) / 2, pz = (b + d) / 2;
        if (!buildable(px, pz, w, dd)) return;
        const Ip = urbanI(px, pz);
        if (z === 'core' && r.chance(0.07)) { W.parcels.push({ x: px, z: pz, w, d: dd, zone: 'plaza' }); return; }
        const m = z === 'ind' ? 4 : 2.5;
        if (z === 'core') makeTower(px, pz, w - m * 2, dd - m * 2, Ip, r);
        else if (z === 'mid') makeMidrise(px, pz, w - m * 2, dd - m * 2, Ip, r);
        else if (r.chance(0.18) && w > 24 && dd > 24) { makeTank(px - w * 0.2, pz, Math.min(w, dd) * 0.22, r); makeTank(px + w * 0.22, pz + dd * 0.1, Math.min(w, dd) * 0.18, r); }
        else makeIndustrial(px, pz, w - m * 2, dd - m * 2, r);
        W.parcels.push({ x: px, z: pz, w, d: dd, zone: z });
      });
      continue;
    }
    // perimeter lots: shops on main street, houses in the neighbourhoods
    const frontage = z === 'main' ? r.range(11, 17) : z === 'res' ? r.range(14, 19) : r.range(20, 28);
    const depth = Math.min(z === 'main' ? 22 : z === 'res' ? 28 : 36, (Math.min(ix1 - ix0, iz1 - iz0)) / 2);
    perimeterLots(ix0, iz0, ix1, iz1, frontage, depth, r, (px, pz, fw, dep, rot) => {
      if (!buildable(px, pz, fw, dep)) return;
      if (z === 'main') {
        if (r.chance(0.12)) return;
        makeShop(px, pz, rot === 0 || rot === Math.PI ? fw - 1 : dep - 4, rot === 0 || rot === Math.PI ? dep - 4 : fw - 1, 0, r);
      } else if (z === 'res' && r.chance(0.12) && W.sizeKey !== 'small') {
        makeMidrise(px, pz, rot === 0 || rot === Math.PI ? fw - 2 : dep - 6, rot === 0 || rot === Math.PI ? dep - 6 : fw - 2, 0.42, r);
      } else {
        // the house sits toward the street with a yard behind
        const fx = -Math.sin(rot), fz = -Math.cos(rot); // front direction (rot 0 faces -z)
        const off = dep * 0.5 - 7.5;
        const hb = makeHouse(px + fx * off, pz + fz * off, rot, r, z === 'sub');
        hb.yard = { x: px, z: pz, w: fw, d: dep };
        if (r.chance(z === 'sub' ? 0.8 : 0.55)) addTree(px - fx * dep * 0.28 + r.range(-fw / 3, fw / 3) * Math.abs(fz), pz - fz * dep * 0.28 + r.range(-fw / 3, fw / 3) * Math.abs(fx), r, 0.9);
      }
    });
    W.parcels.push({ x: cx, z: cz, w: ix1 - ix0, d: iz1 - iz0, zone: z, lots: true });
  }
}
function buildable(x, z, w, d) {
  const hw = w / 2, hd = d / 2;
  for (const [a, b] of [[0, 0], [-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) if (heightAt(x + a, z + b) < 0.5) return false;
  let lo = 1e9, hi = -1e9;
  for (const [a, b] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) { const h = heightAt(x + a, z + b); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  return hi - lo < Math.max(5, Math.min(w, d) * 0.3);
}
function splitRect(x0, z0, x1, z1, maxS, r, cb, depth = 0) {
  const w = x1 - x0, d = z1 - z0;
  if ((w <= maxS && d <= maxS) || depth > 8 || (w < 18 && d < 18)) { cb(x0, z0, x1, z1); return; }
  if (w >= d) { const s = x0 + w * r.range(0.38, 0.62); splitRect(x0, z0, s, z1, maxS, r, cb, depth + 1); splitRect(s, z0, x1, z1, maxS, r, cb, depth + 1); }
  else { const s = z0 + d * r.range(0.38, 0.62); splitRect(x0, z0, x1, s, maxS, r, cb, depth + 1); splitRect(x0, s, x1, z1, maxS, r, cb, depth + 1); }
}
// lots along the four sides of a block; cb(centre x, centre z, frontage, depth, rot) with rot facing the street
function perimeterLots(x0, z0, x1, z1, f, D, r, cb) {
  const W2 = x1 - x0;
  const nX = Math.max(1, Math.round(W2 / f)), fx = W2 / nX;
  for (let k = 0; k < nX; k++) { const cx = x0 + (k + 0.5) * fx; cb(cx, z0 + D / 2, fx, D, 0); cb(cx, z1 - D / 2, fx, D, Math.PI); }
  const zz0 = z0 + D, zz1 = z1 - D, L = zz1 - zz0;
  if (L > f * 0.8) {
    const nZ = Math.max(1, Math.round(L / f)), fz = L / nZ;
    for (let k = 0; k < nZ; k++) { const cz = zz0 + (k + 0.5) * fz; cb(x0 + D / 2, cz, fz, D, Math.PI / 2); cb(x1 - D / 2, cz, fz, D, -Math.PI / 2); }
  }
}
function parkBlock(blk, r) {
  blk.trees = [];
  const n = Math.floor((blk.x1 - blk.x0) * (blk.z1 - blk.z0) / 260);
  for (let k = 0; k < n; k++) {
    const x = r.range(blk.x0 + 6, blk.x1 - 6), z = r.range(blk.z0 + 6, blk.z1 - 6);
    if (heightAt(x, z) > 0.6) addTree(x, z, r, 1.1);
  }
  W.parcels.push({ x: blk.cx, z: blk.cz, w: blk.x1 - blk.x0, d: blk.z1 - blk.z0, zone: 'park' });
}
function ruralBlock(blk, r) {
  // fields, forests and a farm or two near the roads
  const bio = W.biome;
  const area = (blk.x1 - blk.x0) * (blk.z1 - blk.z0);
  const forestN = fbm(blk.cx / 500, blk.cz / 500, W.gen.s + 51, 3);
  const slope = slopeAt(blk.cx, blk.cz), hh = heightAt(blk.cx, blk.cz);
  const wild = slope > 0.12 || hh > 80;
  if (forestN > 0.52 - bio.trees * 0.12 || wild) {
    blk.zone = 'forest';
    const dens = (wild ? 0.5 : 1) * bio.trees;
    const n = Math.min(400, Math.floor(area / 340 * dens));
    for (let k = 0; k < n; k++) {
      const x = r.range(blk.x0 + 4, blk.x1 - 4), z = r.range(blk.z0 + 4, blk.z1 - 4), h = heightAt(x, z);
      if (h > 0.8 && h < bio.snow - 20 && slopeAt(x, z) < 0.6) addTree(x, z, r, 1.0);
    }
  } else {
    blk.zone = 'field';
    blk.fields = [];
    splitRect(blk.x0 + 2, blk.z0 + 2, blk.x1 - 2, blk.z1 - 2, r.range(60, 140), r, (a, b, c, d) => blk.fields.push({ x0: a, z0: b, x1: c, z1: d, col: r.pick(bio.fields), rows: r.chance(0.5) }));
    if (blk.road && r.chance(W.sizeKey === 'small' || W.sizeKey === 'town' ? 0.4 : 0.15)) {
      const x = blk.x0 + 22, z = blk.z0 + 22;
      if (buildable(x, z, 24, 24)) {
        const fh = makeHouse(x, z, 0, r, true); fh.special = 'farm';
        const barn = newBuilding('ind', x + 18, z + 6, 12, 16, 0, { special: 'barn' });
        part(barn, 'box', 0, 0, 0, 12, 6, 16, 0x8a2a20, 3); part(barn, 'roof', 0, 6, 0, 12.6, 4, 16.6, 0x4a4a4a, 6);
        const silo = newBuilding('ind', x + 30, z - 4, 5, 5, 0, { special: 'silo' });
        part(silo, 'cyl', 0, 0, 0, 5, 14, 5, 0xb8b8b0, 6); part(silo, 'dome', 0, 14, 0, 5, 2.5, 5, 0x9a9a94, 6);
      }
    }
  }
  if (blk.zone === 'field') W.parcels.push({ x: blk.cx, z: blk.cz, w: blk.x1 - blk.x0, d: blk.z1 - blk.z0, zone: 'field', blk });
  else W.parcels.push({ x: blk.cx, z: blk.cz, w: blk.x1 - blk.x0, d: blk.z1 - blk.z0, zone: 'forest', blk });
}

// ---------- trees ----------
function addTree(x, z, r, s = 1) {
  if (W.trees.length > 26000) return null;
  const bio = W.biome;
  const t = { id: W.trees.length, x, z, y: heightAt(x, z), s: s * (r ? r.range(0.75, 1.35) : rr(0.75, 1.35)), con: (r ? r() : Math.random()) < bio.conifer, state: 0, burn: 0, leaf: 1, fall: 0, fallA: 0, snow: 0, gold: 0 };
  if (W.gen.biome === 'desert') t.s *= 0.6;
  W.trees.push(t);
  return t;
}

// ---------- special buildings ----------
// Hospitals, fire and police stations, churches and a cathedral, city hall and stadiums replace ordinary buildings
// spread across the city.
function placeSpecials(r) {
  const def = W.def;
  const spread = (cands, n, minD) => {
    const out = [];
    r.shuffle(cands);
    for (const b of cands) {
      if (out.length >= n) break;
      if (out.some((o) => dist(o.x, o.z, b.x, b.z) < minD)) continue;
      out.push(b);
    }
    return out;
  };
  const mids = W.buildings.filter((b) => (b.kind === 'apt' || b.kind === 'shop' || b.kind === 'tower') && b.w > 14 && b.d > 12);
  const houses = W.buildings.filter((b) => b.kind === 'house' && !b.special);
  const minD = W.M / Math.sqrt(def.fire + 1) * 0.6;
  const convert = (b, kind, label, build) => { b.parts.length = 0; b.h = 0; b.kind = kind; b.special = label; build(b); return b; };
  // hospitals: white blocks with a red cross on the roof
  for (const b of spread(mids.slice(), def.hosp, minD)) {
    convert(b, 'hospital', 'hospital', (b) => {
      const h = W.sizeKey === 'small' ? 8 : clamp(b.w * 0.9, 12, 40);
      part(b, 'box', 0, 0, 0, b.w, h, b.d, 0xe8ecee, 1);
      part(b, 'box', 0, h, 0, Math.min(b.w, b.d) * 0.5, 0.4, Math.min(b.w, b.d) * 0.14, 0xd02020, 6);
      part(b, 'box', 0, h, 0, Math.min(b.w, b.d) * 0.14, 0.4, Math.min(b.w, b.d) * 0.5, 0xd02020, 6);
    });
    W.hospitals.push(b);
  }
  const pool = mids.filter((b) => !b.special).concat(houses.filter(() => r.chance(0.2)));
  for (const b of spread(pool.slice(), def.fire, minD * 0.8)) {
    convert(b, 'station', 'fire', (b) => {
      const w = Math.min(b.w, 22), d = Math.min(b.d, 18);
      b.w = w; b.d = d; b.rot = 0;
      part(b, 'box', 0, 0, 0, w, 8, d, 0xa83a2a, 3);
      part(b, 'box', w * 0.35, 8, 0, 4, 7, 4, 0xa83a2a, 3);
    });
    W.fireSt.push(b);
  }
  for (const b of spread(pool.filter((b) => !b.special), def.police, minD)) {
    convert(b, 'station', 'police', (b) => { const w = Math.min(b.w, 22), d = Math.min(b.d, 18); b.w = w; b.d = d; b.rot = 0; part(b, 'box', 0, 0, 0, w, 10, d, 0x5a6a80, 1); });
    W.police.push(b);
  }
  // churches: a nave with a gable roof, a tower and a spire
  const cc = houses.filter((b) => !b.special).concat(mids.filter((b) => !b.special));
  const churches = spread(cc, def.churches, minD * 0.7);
  churches.forEach((b, i) => {
    const cath = i === 0 && (W.sizeKey !== 'small' && W.sizeKey !== 'town');
    convert(b, 'church', cath ? 'cathedral' : 'church', (b) => {
      const k = cath ? 2.4 : 1;
      const L = 18 * k, Wd = 9 * k, h = 9 * k;
      b.w = Wd; b.d = L;
      part(b, 'box', 0, 0, 0, Wd, h, L, cath ? 0xb8b0a0 : 0xc8c0b0, 7);
      part(b, 'roof', 0, h, 0, Wd + 0.6, 5 * k, L + 0.4, 0x5a5048, 6);
      part(b, 'box', 0, 0, -L / 2 - 2.5 * k, 5 * k, h * 2.1, 5 * k, cath ? 0xb8b0a0 : 0xc8c0b0, 7);
      part(b, 'cone', 0, h * 2.1, -L / 2 - 2.5 * k, 5.4 * k, 9 * k, 5.4 * k, 0x4a5058, 6);
      b.rot = b.rot || 0;
    });
    W.churches.push(b);
  });
  // city hall with a dome near the main centre
  const c0 = W.gen.centers[0];
  const hallC = mids.filter((b) => !b.special && b.w > 20 && b.d > 20).sort((a, b) => dist(a.x, a.z, c0.x, c0.z) - dist(b.x, b.z, c0.x, c0.z))[0];
  if (hallC) convert(hallC, 'hall', 'cityhall', (b) => {
    const h = 16;
    part(b, 'box', 0, 0, 0, b.w, h, b.d, 0xd8d0c0, 7);
    part(b, 'cyl', 0, h, 0, Math.min(b.w, b.d) * 0.5, 6, Math.min(b.w, b.d) * 0.5, 0xd8d0c0, 7);
    part(b, 'dome', 0, h + 6, 0, Math.min(b.w, b.d) * 0.5, Math.min(b.w, b.d) * 0.3, Math.min(b.w, b.d) * 0.5, 0x7a9a8a, 6);
  });
  W.hall = hallC || null;
  // stadiums take a whole park block
  const parks = W.parcels.filter((p) => p.zone === 'park' && p.w > 90 && p.d > 90);
  for (let k = 0; k < def.stadiums && parks.length; k++) {
    const p = parks.splice(r.int(0, parks.length - 1), 1)[0];
    p.zone = 'stadium';
    // drop the park's trees
    for (const t of W.trees) if (Math.abs(t.x - p.x) < p.w / 2 && Math.abs(t.z - p.z) < p.d / 2) t.state = 9;
    const b = newBuilding('stadium', p.x, p.z, p.w - 12, p.d - 12, 0, { special: 'stadium' });
    const rx = (p.w - 14) / 2, rz = (p.d - 14) / 2, n = 20;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, x = Math.cos(a) * rx * 0.86, z = Math.sin(a) * rz * 0.86;
      const seg = Math.max(rx, rz) * TAU / n * 1.02;
      // a ring of stands: boxes rotated around the bowl (encoded as cyl parts would not tilt, so use boxes)
      b.parts.push({ g: 'box', x, y: 0, z, sx: seg, sy: 18, sz: 12, col: 0xb8b8b4, st: 6, ry: -a + Math.PI / 2 });
    }
    part(b, 'box', 0, 0, 0, rx * 1.2, 0.5, rz * 1.2, 0x3a8a3a, 6);
    b.h = 18;
  }
  W.trees = W.trees.filter((t) => t.state !== 9);
  W.trees.forEach((t, i) => { t.id = i; });
}

// ---------- districts ----------
function makeDistricts(r) {
  const n = { mega: 26, metro: 18, city: 11, town: 6, small: 3 }[W.sizeKey];
  const used = new Set();
  const pts = [];
  for (let tries = 0; pts.length < n && tries < 2000; tries++) {
    const x = r.range(0.06, 0.94) * W.M, z = r.range(0.06, 0.94) * W.M;
    if (heightAt(x, z) < 0.5) continue;
    if (pts.some((p) => dist(p.x, p.z, x, z) < W.M / Math.sqrt(n) * 0.75)) continue;
    pts.push({ x, z });
  }
  const c0 = W.gen.centers[0];
  pts.sort((a, b) => dist(a.x, a.z, c0.x, c0.z) - dist(b.x, b.z, c0.x, c0.z));
  pts.forEach((p, i) => {
    const I = urbanI(p.x, p.z);
    let near = false;
    for (let a = 0; a < 8 && !near; a++) if (heightAt(p.x + Math.cos(a) * 150, p.z + Math.sin(a) * 150) < 0.3) near = true;
    const kind = i === 0 ? 'core' : near && r.chance(0.6) ? 'water' : I > 0.7 && r.chance(0.5) ? 'core' : I < 0.15 ? 'edge' : fbm(p.x / 700, p.z / 700, W.gen.s + 41, 2) > 0.62 ? 'ind' : r.chance(0.2) ? 'old' : 'res';
    W.districts.push({ name: W.sizeKey === 'small' && i === 0 ? 'the town centre' : districtName(r, kind, used), x: p.x, z: p.z, kind });
  });
  for (const b of W.buildings) b.district = districtAt(b.x, b.z);
}
function districtAt(x, z) {
  let best = 0, bd = 1e18;
  W.districts.forEach((d, i) => { const q = dist2(d.x, d.z, x, z); if (q < bd) { bd = q; best = i; } });
  return best;
}
const districtName_ = (x, z) => (W.districts.length ? W.districts[districtAt(x, z)].name : W.name);

// ---------- population and value ----------
function capacityOf(b, r = Math.random) {
  const fl = Math.max(1, b.h / 3.6), area = b.w * b.d;
  let c = 0, v = 0;
  switch (b.kind) {
    case 'tower': c = area * Math.pow(fl, 0.75) / 90; v = area * fl * 5200; break;
    case 'apt': c = area * fl / 40; v = area * fl * 3200; break;
    case 'shop': c = area * fl / 70; v = area * fl * 2600; break;
    case 'house': c = b.special === 'farm' ? 4 : 2.5 + r() * 3.5; v = area * 2 * 2400; break;
    default: c = area / 300; v = area * 1400;
  }
  return [c, v];
}
function assignPopulation(r) {
  let cap = 0;
  for (const b of W.buildings) {
    const fl = Math.max(1, b.h / 3.6), area = b.w * b.d;
    let c = 0, v = 0;
    switch (b.kind) {
      case 'tower': c = area * Math.pow(fl, 0.75) / 90; v = area * fl * 5200; break;
      case 'apt': c = area * fl / 40; v = area * fl * 3200; break;
      case 'shop': c = area * fl / 70; v = area * fl * 2600; break;
      case 'house': c = b.special === 'farm' ? 4 : r.range(2.5, 6); v = area * 2 * 2400; break;
      case 'ind': c = b.special ? 0.5 : area / 300; v = area * 1400; break;
      case 'hospital': c = area * fl / 40; v = area * fl * 6500; break;
      case 'station': c = 20; v = area * 3000; break;
      case 'church': c = 30; v = area * 9000; break;
      case 'hall': c = 200; v = area * fl * 8000; break;
      case 'stadium': c = 2000; v = 4e8; break;
      case 'bridge': c = 0; v = b.w * b.d * 30000; break;
    }
    b.pop = c; b.value = v; cap += c;
  }
  const target = r.range(W.def.pop[0], W.def.pop[1]);
  const k = target / Math.max(1, cap);
  let sum = 0, wealth = 0;
  for (const b of W.buildings) { b.pop = b.pop0 = Math.round(b.pop * k); sum += b.pop; wealth += b.value; }
  W.popCap = sum; W.wealth = wealth; W.popK = k;
}

// ---------- the ground texture ----------
function groundColor(x, z, h, s, out, coarse) {
  const bio = W.biome, n = coarse ? 0 : vnoise(x / 60, z / 60, 3) * 0.08 - 0.04, n2 = coarse ? 0.5 + (fbm(x / 1500, z / 1500, 7, 2) - 0.5) * 0.4 : fbm(x / 300, z / 300, 7, 2);
  if (h < 0.3) { const k = clamp(-h / 14, 0, 1); out[0] = lerp(bio.sand[0], 0.16, k); out[1] = lerp(bio.sand[1], 0.2, k); out[2] = lerp(bio.sand[2], 0.2, k); return out; }
  let c = n2 > 0.5 ? bio.grass : bio.grass2;
  out[0] = c[0] + n; out[1] = c[1] + n; out[2] = c[2] + n * 0.5;
  if (h < 2.0) { const k = smooth(2.0, 1.1, h); out[0] = lerp(out[0], bio.sand[0], k); out[1] = lerp(out[1], bio.sand[1], k); out[2] = lerp(out[2], bio.sand[2], k); }
  const rk = smooth(0.25, 0.6, s);
  out[0] = lerp(out[0], bio.rock[0], rk); out[1] = lerp(out[1], bio.rock[1], rk); out[2] = lerp(out[2], bio.rock[2], rk);
  return out;
}
const GROUND_PX = 2048;
function paintGround() {
  const V = W.V, M = W.M, S = GROUND_PX, k = S / M;
  // base colour at the terrain grid, scaled up smoothly
  const base = document.createElement('canvas'); base.width = base.height = V;
  const bg = base.getContext('2d'), id = bg.createImageData(V, V), col = [0, 0, 0];
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const x = i * W.cs, z = j * W.cs, h = W.h[j * V + i];
    groundColor(x, z, h, slopeAt(x, z), col);
    const o = (j * V + i) * 4;
    id.data[o] = clamp(col[0] * 255, 0, 255); id.data[o + 1] = clamp(col[1] * 255, 0, 255); id.data[o + 2] = clamp(col[2] * 255, 0, 255); id.data[o + 3] = 255;
  }
  bg.putImageData(id, 0, 0);
  const cv = W.groundCanvas || (W.groundCanvas = document.createElement('canvas'));
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.drawImage(base, 0, 0, V, V, -k * W.cs / 2 + 0, -k * W.cs / 2 + 0, S + k * W.cs, S + k * W.cs);
  const R_ = (x0, z0, x1, z1, c) => { g.fillStyle = c; g.fillRect(x0 * k, z0 * k, (x1 - x0) * k, (z1 - z0) * k); };
  const bio = W.biome;
  const rgb = (a, m = 1) => `rgb(${a[0] * 255 * m | 0},${a[1] * 255 * m | 0},${a[2] * 255 * m | 0})`;
  // blocks
  for (const blk of W.blocks) {
    const z = blk.zone;
    if (z === 'field' && blk.fields) {
      for (const f of blk.fields) {
        if (heightAt((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2) < 0.6) continue;
        g.globalAlpha = 0.85; R_(f.x0 + 1, f.z0 + 1, f.x1 - 1, f.z1 - 1, f.col);
        if (f.rows) { g.globalAlpha = 0.18; g.fillStyle = '#000'; for (let y = f.z0 + 2; y < f.z1 - 1; y += 4) g.fillRect(f.x0 * k, y * k, (f.x1 - f.x0) * k, Math.max(1, k)); }
        g.globalAlpha = 1;
        for (let tj = Math.floor(f.z0 / TILE); tj < f.z1 / TILE; tj++) for (let ti = Math.floor(f.x0 / TILE); ti < f.x1 / TILE; ti++) setTile(ti, tj, T_FIELD, true);
      }
    } else if (z === 'forest') {
      g.globalAlpha = 0.55; R_(blk.x0, blk.z0, blk.x1, blk.z1, rgb(bio.forest)); g.globalAlpha = 1;
      fillTiles(blk, T_FOREST, true);
    } else if (z === 'park' || z === 'stadium') {
      R_(blk.x0, blk.z0, blk.x1, blk.z1, '#a8a49a');
      R_(blk.x0 + 3, blk.z0 + 3, blk.x1 - 3, blk.z1 - 3, rgb(bio.grass, 1.08));
      g.strokeStyle = '#c8bca0'; g.lineWidth = 2.5 * k; g.beginPath(); g.moveTo(blk.x0 * k, blk.z0 * k); g.lineTo(blk.x1 * k, blk.z1 * k); g.moveTo(blk.x1 * k, blk.z0 * k); g.lineTo(blk.x0 * k, blk.z1 * k); g.stroke();
      fillTiles(blk, T_PARK, true);
    } else if (z === 'core' || z === 'mid' || z === 'ind' || z === 'main') {
      R_(blk.x0, blk.z0, blk.x1, blk.z1, z === 'ind' ? '#8a8880' : '#a6a39c');
      R_(blk.x0 + 3, blk.z0 + 3, blk.x1 - 3, blk.z1 - 3, z === 'ind' ? '#76746c' : z === 'main' ? '#8a8478' : '#7c7a76');
      fillTiles(blk, T_LOT, true);
    } else if (z === 'res' || z === 'sub') {
      R_(blk.x0, blk.z0, blk.x1, blk.z1, '#a8a49a');
      R_(blk.x0 + 3, blk.z0 + 3, blk.x1 - 3, blk.z1 - 3, rgb(bio.grass, 1.05));
      fillTiles(blk, T_YARD, true);
    }
  }
  for (const p of W.parcels) if (p.zone === 'plaza') { R_(p.x - p.w / 2 + 2, p.z - p.d / 2 + 2, p.x + p.w / 2 - 2, p.z + p.d / 2 - 2, '#b8b0a0'); }
  // building footprints: a soft shadow and the lot under them
  for (const b of W.buildings) {
    if (b.kind === 'bridge') continue;
    g.save(); g.translate(b.x * k, b.z * k); g.rotate(-b.rot);
    const m = b.kind === 'house' ? 2 : 3;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect((-b.w / 2 - m) * k, (-b.d / 2 - m) * k, (b.w + m * 2) * k, (b.d + m * 2) * k);
    if (b.kind === 'house') { g.fillStyle = '#9a968c'; g.fillRect((-1.5) * k, (-b.d / 2 - 7) * k, 3 * k, 7 * k); } // driveway
    g.restore();
  }
  // roads
  const rc = W.roadCanvas || (W.roadCanvas = document.createElement('canvas'));
  const RS = 1024, rk = RS / M;
  rc.width = rc.height = RS;
  const rg = rc.getContext('2d'); rg.fillStyle = '#000'; rg.fillRect(0, 0, RS, RS); rg.fillStyle = '#fff';
  const rect = (e, pad) => {
    const hw = e.w / 2 + pad;
    const x0 = Math.min(e.a.x, e.b.x) - (e.axis === 'z' ? hw : e.a.wx * TILE / 2 * 0), x1 = Math.max(e.a.x, e.b.x) + (e.axis === 'z' ? hw : 0);
    const z0 = Math.min(e.a.z, e.b.z) - (e.axis === 'x' ? hw : 0), z1 = Math.max(e.a.z, e.b.z) + (e.axis === 'x' ? hw : 0);
    return [x0, z0, x1, z1];
  };
  for (const e of W.edges) { const [a, b, c, d] = rect(e, 3); if (!e.bridge) R_(a, b, c, d, '#a8a49c'); }
  for (const e of W.edges) {
    const [a, b, c, d] = rect(e, 0);
    if (!e.bridge) R_(a, b, c, d, e.cls === 2 ? '#3e3e42' : '#4a4a4e');
    rg.fillRect(a * rk, b * rk, (c - a) * rk, (d - b) * rk);
  }
  // markings
  g.setLineDash([3 * k, 4 * k]);
  for (const e of W.edges) {
    if (e.bridge) continue;
    const ax = e.a.x + e.dx * e.a.wx * 5, az = e.a.z + e.dz * e.a.wz * 5, bx = e.b.x - e.dx * e.b.wx * 5, bz = e.b.z - e.dz * e.b.wz * 5;
    const nx = -e.dz, nz = e.dx;
    if (e.cls === 0) { g.strokeStyle = 'rgba(230,230,220,.55)'; g.lineWidth = 0.35 * k; line(ax, az, bx, bz, 0); }
    else if (e.cls === 1) { g.setLineDash([]); g.strokeStyle = 'rgba(230,200,60,.75)'; g.lineWidth = 0.4 * k; line(ax, az, bx, bz, -0.4); line(ax, az, bx, bz, 0.4); g.setLineDash([3 * k, 4 * k]); g.strokeStyle = 'rgba(230,230,220,.5)'; g.lineWidth = 0.3 * k; line(ax, az, bx, bz, 5); line(ax, az, bx, bz, -5); }
    else { g.setLineDash([]); g.strokeStyle = '#7a7a70'; g.lineWidth = 1.2 * k; line(ax, az, bx, bz, 0); g.setLineDash([3 * k, 5 * k]); g.strokeStyle = 'rgba(230,230,220,.6)'; g.lineWidth = 0.3 * k; for (const o of [-10, -5, 5, 10]) line(ax, az, bx, bz, o); }
    function line(ax, az, bx, bz, o) { g.beginPath(); g.moveTo((ax + nx * o) * k, (az + nz * o) * k); g.lineTo((bx + nx * o) * k, (bz + nz * o) * k); g.stroke(); }
  }
  g.setLineDash([]);
  // intersections
  for (const n of W.nodes) { R_(n.x - n.wx * 5, n.z - n.wz * 5, n.x + n.wx * 5, n.z + n.wz * 5, '#4a4a4e'); rg.fillRect((n.x - n.wx * 5) * rk, (n.z - n.wz * 5) * rk, n.wx * 10 * rk, n.wz * 10 * rk); }
  W.groundDirty = true;
}
function setTile(ti, tj, t, onlyLand) { if (ti < 0 || tj < 0 || ti >= W.TN || tj >= W.TN) return; const k = tj * W.TN + ti; if (W.tile[k] === T_ROAD) return; if (onlyLand && W.tile[k] === T_WATER) return; W.tile[k] = t; }
function fillTiles(blk, t, onlyLand) { for (let tj = Math.floor(blk.z0 / TILE); tj < blk.z1 / TILE; tj++) for (let ti = Math.floor(blk.x0 / TILE); ti < blk.x1 / TILE; ti++) setTile(ti, tj, t, onlyLand); }
const tileAt = (x, z) => { const ti = Math.floor(x / TILE), tj = Math.floor(z / TILE); return ti < 0 || tj < 0 || ti >= W.TN || tj >= W.TN ? T_GRASS : W.tile[tj * W.TN + ti]; };
