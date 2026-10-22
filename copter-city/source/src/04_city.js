// Copter City — the city: a seeded block grid with water, roads and bridges, zones, buildings (merged per chunk so a
// burnt building can be rebuilt), helipads, landmarks, the hills and sea outside town, trees, lamps, and the queries
// the helicopter, traffic and missions use (ground height, solids, landing surfaces, places).
//
// x grows east, z grows south, y up, metres. Road line i sits at i·P on its axis. Block (bi, bj) lies between lines bi..bi+1
// and bj..bj+1. The world extends MARGIN blocks past the city on every side and ends in the sea.

const P = 72, RH = 6, SWK = 3, CURB = 0.15, MARGIN = 6, HS = 12, CHUNK = 4;
const WATER_Y = -0.4, BED_Y = -4;

const CITY = {
  nb: 0, def: null, blocks: [], buildings: [], solids: [], grid: new Map(), nodes: [], edges: [], pads: [], places: [], lamps: [],
  trees: [], tokens: [], landmarks: [], hospitals: [], home: null, chunks: [], group: null, hm: null, hmN: 0, hmX0: 0,
  water: null, walkLoops: [], size: 0,
};

// ---------- water layout ----------
// True if world block (bi, bj) is water. Works inside and outside the city.
function waterBlock(bi, bj) {
  const c = CITY, nb = c.nb, w = c.def.water;
  if (bi < -MARGIN + 1 || bj < -MARGIN + 1 || bi >= nb + MARGIN - 1 || bj >= nb + MARGIN - 1) return true; // the sea all round
  const riverK = Math.floor(nb * (w === 'bayriver' ? 0.62 : 0.45));
  if (w === 'lake') { const cx = nb * 0.3, cz = nb * 0.62; return (bi + 0.5 - cx) ** 2 / 1.9 + (bj + 0.5 - cz) ** 2 / 1.2 < 1; }
  if (w === 'bay') return bi + bj > nb * 1.42 + (bi > nb ? 1 : 0);
  if (w === 'river') return bi === riverK || (bi === riverK + 1 && (bj < -2 || bj > nb + 1));
  if (w === 'coast') return bi < 2 || (bi === 2 && (bj < 1 || bj > nb - 2));
  if (w === 'bayriver') return (bi === riverK && bj < nb - 2) || (bj >= nb - 2 && bi >= 3) || (bj >= nb - 3 && bi >= nb - 3);
  return false;
}
const isRiver = () => CITY.def.water === 'river' || CITY.def.water === 'bayriver';
function inCityBlocks(bi, bj) { return bi >= 0 && bj >= 0 && bi < CITY.nb && bj < CITY.nb; }
const blockOf = (x, z) => [Math.floor(x / P), Math.floor(z / P)];
function isWaterAt(x, z) {
  // water if the point is inside a water block's interior, or below the terrain's water line outside town
  return terrainH(x, z) < WATER_Y - 0.05;
}

// ---------- spatial grid for solids ----------
const GCELL = 24;
function gridAdd(s) {
  const x0 = s.r ? s.x - s.r : s.x0, x1 = s.r ? s.x + s.r : s.x1, z0 = s.r ? s.z - s.r : s.z0, z1 = s.r ? s.z + s.r : s.z1;
  for (let cx = Math.floor(x0 / GCELL); cx <= Math.floor(x1 / GCELL); cx++) for (let cz = Math.floor(z0 / GCELL); cz <= Math.floor(z1 / GCELL); cz++) {
    const k = (cx + 512) * 4096 + cz + 512; let l = CITY.grid.get(k); if (!l) CITY.grid.set(k, (l = [])); l.push(s);
  }
}
function addSolid(x0, z0, x1, z1, y0, y1, b) { const s = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y0, y1, b }; CITY.solids.push(s); gridAdd(s); return s; }
function addPost(x, z, r, y0, y1, b) { const s = { x, z, r, y0, y1, b }; CITY.solids.push(s); gridAdd(s); return s; }
const _near = [];
const _seen = new Set();
function solidsNear(x, z, r) {
  _near.length = 0; _seen.clear();
  for (let cx = Math.floor((x - r) / GCELL); cx <= Math.floor((x + r) / GCELL); cx++) for (let cz = Math.floor((z - r) / GCELL); cz <= Math.floor((z + r) / GCELL); cz++) {
    const l = CITY.grid.get((cx + 512) * 4096 + cz + 512); if (!l) continue;
    for (const s of l) if (!_seen.has(s) && !s.dead) { _seen.add(s); _near.push(s); }
  }
  return _near;
}
// push a sphere (x, y, z, r) out of the solids it overlaps; returns { x, y, z, hit, nx, ny, nz, depth }
function collideSphere(x, y, z, r, minTop = -Infinity) {
  let px = 0, py = 0, pz = 0, hit = false, nx = 0, ny = 0, nz = 0, depth = 0;
  for (const s of solidsNear(x, z, r)) {
    const cx = x + px, cy = y + py, cz = z + pz;
    if (cy - r > s.y1 || cy + r < s.y0 || s.y1 < minTop) continue;
    let qx, qz;
    if (s.r) {
      const dx = cx - s.x, dz = cz - s.z, d = Math.hypot(dx, dz);
      if (d > s.r) { qx = s.x + dx / d * s.r; qz = s.z + dz / d * s.r; } else { qx = cx; qz = cz; }
    } else { qx = clamp(cx, s.x0, s.x1); qz = clamp(cz, s.z0, s.z1); }
    const qy = clamp(cy, s.y0, s.y1);
    let dx = cx - qx, dy = cy - qy, dz = cz - qz, d = Math.hypot(dx, dy, dz);
    if (d >= r) continue;
    let k;
    if (d < 1e-6) { // centre inside: leave upward if near the top, else along the shortest horizontal axis
      if (s.y1 - cy < 2.5) { dx = 0; dy = 1; dz = 0; k = s.y1 - cy + r; }
      else if (s.r) { const a = Math.atan2(cz - s.z, cx - s.x); dx = Math.cos(a); dz = Math.sin(a); dy = 0; k = s.r - Math.hypot(cx - s.x, cz - s.z) + r; }
      else {
        const l = cx - s.x0, rr = s.x1 - cx, t = cz - s.z0, bb = s.z1 - cz, m = Math.min(l, rr, t, bb); dy = 0;
        if (m === l) { dx = -1; dz = 0; k = l + r; } else if (m === rr) { dx = 1; dz = 0; k = rr + r; } else if (m === t) { dx = 0; dz = -1; k = t + r; } else { dx = 0; dz = 1; k = bb + r; }
      }
    } else { dx /= d; dy /= d; dz /= d; k = r - d; }
    px += dx * k; py += dy * k; pz += dz * k; hit = true;
    if (k > depth) { depth = k; nx = dx; ny = dy; nz = dz; hit = s; }
  }
  return { x: x + px, y: y + py, z: z + pz, hit, nx, ny, nz, depth };
}
// the highest solid top under (x, z) at or below height y (roofs, pads); -Infinity if none
function roofBelow(x, z, y = 1e9, pad = 0) {
  let best = -Infinity;
  for (const s of solidsNear(x, z, pad + 1)) {
    const inside = s.r ? dist2(x, z, s.x, s.z) < (s.r + pad) ** 2 : x > s.x0 - pad && x < s.x1 + pad && z > s.z0 - pad && z < s.z1 + pad;
    if (inside && s.y1 <= y + 0.01 && s.y1 > best) best = s.y1;
  }
  return best;
}
// the surface something would land on: a roof, the terrain, or the water
function surfaceY(x, z, y = 1e9) {
  const t = terrainH(x, z), g = Math.max(t, WATER_Y);
  const r = roofBelow(x, z, y);
  return Math.max(g, r, groundExtra(x, z));
}
// sidewalks and lots stand a curb above the road
function groundExtra(x, z) { const b = blockAt(x, z); return b && !b.water ? CURB : -Infinity; }
function blockAt(x, z) {
  const [bi, bj] = blockOf(x, z);
  if (!inCityBlocks(bi, bj)) return null;
  const b = CITY.blocks[bj * CITY.nb + bi];
  return x >= b.sx0 && x <= b.sx1 && z >= b.sz0 && z <= b.sz1 ? b : null;
}
function inAirspace(x, z) { const m = (MARGIN - 1.5) * P; return x > -m && z > -m && x < CITY.size + m && z < CITY.size + m; }

// ---------- heightmap ----------
function terrainH(x, z) {
  const c = CITY, f = (x - c.hmX0) / HS, g = (z - c.hmX0) / HS;
  const i = Math.floor(f), j = Math.floor(g);
  if (i < 0 || j < 0 || i >= c.hmN - 1 || j >= c.hmN - 1) return BED_Y * 2;
  const u = f - i, v = g - j, n = c.hmN, h = c.hm;
  return lerp(lerp(h[j * n + i], h[j * n + i + 1], u), lerp(h[(j + 1) * n + i], h[(j + 1) * n + i + 1], u), v);
}
function buildHeightmap() {
  const c = CITY, nb = c.nb, x0 = -MARGIN * P, x1 = (nb + MARGIN) * P;
  const n = Math.round((x1 - x0) / HS) + 1;
  c.hmN = n; c.hmX0 = x0; c.hm = new Float32Array(n * n);
  const seed = strSeed(c.def.seed) % 1000;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = x0 + i * HS, z = x0 + j * HS;
    // water: a vertex is under water if every block that touches it is water
    const fx = x / P, fz = z / P, onX = Math.abs(fx - Math.round(fx)) < 1e-6, onZ = Math.abs(fz - Math.round(fz)) < 1e-6;
    const bis = onX ? [Math.round(fx) - 1, Math.round(fx)] : [Math.floor(fx)], bjs = onZ ? [Math.round(fz) - 1, Math.round(fz)] : [Math.floor(fz)];
    let allW = true, anyW = false;
    for (const bi of bis) for (const bj of bjs) { const w = waterBlock(bi, bj); allW = allW && w; anyW = anyW || w; }
    if (allW) { c.hm[j * n + i] = BED_Y; continue; }
    // outside town: rolling hills that grow with distance from the city
    const dx = Math.max(0, -x, x - nb * P), dz = Math.max(0, -z, z - nb * P), d = Math.hypot(dx, dz);
    let h = 0;
    if (d > 30) {
      const k = smooth(30, 260, d);
      h = k * (Math.pow(vnoise(x / 190, z / 190, seed), 1.6) * 75 + vnoise(x / 55, z / 55, seed + 7) * 10);
      // the island's coast: hills ease down before the open sea
      const edge = Math.min(x - x0, z - x0, x1 - x, x1 - z) - P;
      h *= smooth(0, 2.2 * P, edge);
      if (anyW) h = Math.min(h, 0.6);
    }
    c.hm[j * n + i] = h;
  }
}

// ---------- generation ----------
function buildCity(def) {
  clearCity();
  const c = CITY;
  c.def = def; c.nb = def.nb; c.size = def.nb * P;
  const cr = RNG(def.seed);
  c.group = new THREE.Group(); R.scene.add(c.group);
  // blocks
  const nb = c.nb;
  for (let bj = 0; bj < nb; bj++) for (let bi = 0; bi < nb; bi++) {
    const sx0 = bi * P + RH, sx1 = (bi + 1) * P - RH, sz0 = bj * P + RH, sz1 = (bj + 1) * P - RH;
    const b = { bi, bj, sx0, sx1, sz0, sz1, x0: sx0 + SWK, x1: sx1 - SWK, z0: sz0 + SWK, z1: sz1 - SWK, water: waterBlock(bi, bj), kind: null, buildings: [] };
    b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2;
    b.d = Math.hypot(b.cx / c.size - 0.5, b.cz / c.size - 0.5) / 0.7071;
    b.shore = !b.water && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, e]) => waterBlock(bi + a, bj + e));
    c.blocks.push(b);
  }
  assignBlocks(cr);
  buildHeightmap();
  buildRoadGraph();
  const S = { road: new Merger(), inter: new Merger(), walk: new Merger(), grass: new Merger(), lot: new Merger(), concrete: new Merger(), sand: new Merger(), field: new Merger(), dirt: new Merger(), solid: new Merger(), wall: new Merger() };
  buildRoads(S);
  for (const b of c.blocks) if (!b.water) buildBlock(b, S, RNG(def.seed + ':' + b.bi + ',' + b.bj));
  buildSeawalls(S);
  buildLamps(S);
  // static meshes
  const add = (m, tex, o = {}) => { if (m.empty) return; const me = new THREE.Mesh(m.build(), new THREE.MeshLambertMaterial(Object.assign({ map: tex || null, vertexColors: true }, o))); me.matrixAutoUpdate = false; me.updateMatrix(); c.group.add(me); return me; };
  add(S.road, TEX.road); add(S.inter, TEX.inter); add(S.walk, TEX.walk); add(S.grass, TEX.grass); add(S.lot, TEX.lot); add(S.concrete, TEX.concrete);
  add(S.sand, TEX.sand); add(S.field, TEX.field); add(S.dirt, TEX.dirt); add(S.solid, null); add(S.wall, TEX.concrete);
  buildTerrainMesh();
  buildWater();
  buildChunks();
  buildPads();
  buildTrees(cr);
  placeTokens(cr);
  buildPlaces();
}
function clearCity() {
  const c = CITY;
  if (c.group) { c.group.traverse((o) => { if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose(); }); R.scene.remove(c.group); }
  Object.assign(c, { blocks: [], buildings: [], solids: [], grid: new Map(), nodes: [], edges: [], pads: [], places: [], lamps: [], trees: [], tokens: [], landmarks: [], hospitals: [], home: null, chunks: [], walkLoops: [], group: null });
}

// pick the special blocks, then zone the rest by distance from the centre
function assignBlocks(cr) {
  const c = CITY, nb = c.nb, def = c.def;
  const land = c.blocks.filter((b) => !b.water);
  const free = () => land.filter((b) => !b.kind);
  const nearest = (fx, fz, filt = () => true) => { let best = null, bd = 1e9; for (const b of free()) { if (!filt(b)) continue; const d = dist(b.bi, b.bj, fx * (nb - 1), fz * (nb - 1)); if (d < bd) { bd = d; best = b; } } return best; };
  // home base near an edge on dry land
  const home = nearest(0.1, 0.9, (b) => !b.shore) || nearest(0.1, 0.9);
  home.kind = 'hangar';
  const hospSpots = [[0.7, 0.3], [0.25, 0.35], [0.75, 0.75]];
  for (let i = 0; i < def.hospitals; i++) { const b = nearest(...hospSpots[i]); b.kind = 'hospital'; b.hname = ['St. Luke\'s Hospital', 'County General', 'Mercy Medical'][i]; }
  nearest(0.5, 0.15).kind = 'fire';
  if (nb >= 9) nearest(0.45, 0.55).kind = 'police';
  // landmarks (passenger destinations)
  const nLand = Math.min(LANDMARKS.length, 3 + Math.floor(nb / 2));
  const names = cr.shuffle(LANDMARKS.slice());
  for (let i = 0; i < nLand; i++) {
    const a = (i / nLand) * TAU + cr() * 0.5, rad = 0.18 + cr() * 0.25;
    const b = nearest(0.5 + Math.cos(a) * rad, 0.5 + Math.sin(a) * rad);
    if (!b) break;
    b.kind = 'landmark'; b.lname = names[i];
    b.lstyle = /Stadium/.test(b.lname) ? 'stadium' : /Park|Garden/.test(b.lname) ? 'garden' : /Mall|Station|Convention/.test(b.lname) ? 'hall' : /University|Museum|Opera|Court/.test(b.lname) ? 'civic' : /Hotel/.test(b.lname) ? 'hotel' : 'dome';
  }
  // parks scattered
  const nParks = Math.max(1, Math.round(land.length * 0.07));
  for (let i = 0; i < nParks; i++) { const b = cr.pick(free()); if (b) b.kind = 'park'; }
  for (const b of free()) {
    const d = b.d;
    if (d < def.downtown * 0.9) b.kind = 'downtown';
    else if (d < def.downtown * 0.9 + 0.22) b.kind = cr.chance(0.5) ? 'commercial' : 'apartments';
    else if (b.shore && cr.chance(0.55)) b.kind = 'industrial';
    else if (d > 0.82 && def.density < 0.45 && cr.chance(0.6)) b.kind = 'farm';
    else if (cr.chance(0.12)) b.kind = 'industrial';
    else b.kind = cr.chance(def.density * 0.35) ? 'apartments' : 'houses';
  }
}

// nodes at road crossings; an edge exists unless it would sit in the water (a few cross as bridges)
function buildRoadGraph() {
  const c = CITY, nb = c.nb;
  const wb = (bi, bj) => (inCityBlocks(bi, bj) ? c.blocks[bj * nb + bi].water : true);
  const nodeAt = new Map();
  const node = (i, j) => { const k = i + ',' + j; let n = nodeAt.get(k); if (!n) { n = { id: c.nodes.length, i, j, x: i * P, z: j * P, edges: [], jam: 0 }; c.nodes.push(n); nodeAt.set(k, n); } return n; };
  const bridgeLine = (j) => j % 3 === 1;
  for (let j = 0; j <= nb; j++) for (let i = 0; i < nb; i++) { // runs along x at z-line j, between blocks (i, j-1) and (i, j)
    const n1 = wb(i, j - 1), n2 = wb(i, j);
    const edgeIn = j === 0 ? n2 : j === nb ? n1 : n1 && n2;
    if (edgeIn && !(bridgeLine(j) && isRiver())) continue;
    addEdge(node(i, j), node(i + 1, j), 'x', edgeIn);
  }
  for (let i = 0; i <= nb; i++) for (let j = 0; j < nb; j++) {
    const n1 = wb(i - 1, j), n2 = wb(i, j);
    const edgeIn = i === 0 ? n2 : i === nb ? n1 : n1 && n2;
    if (edgeIn) continue;
    addEdge(node(i, j), node(i, j + 1), 'z', false);
  }
  // drop bridge stubs that lead nowhere
  for (const e of c.edges.slice()) if (e.bridge && (e.a.edges.length < 2 || e.b.edges.length < 2)) removeEdge(e);
  function addEdge(a, b, axis, bridge) { const e = { id: c.edges.length, a, b, axis, len: P, bridge }; c.edges.push(e); a.edges.push(e); b.edges.push(e); return e; }
  function removeEdge(e) { c.edges.splice(c.edges.indexOf(e), 1); e.a.edges.splice(e.a.edges.indexOf(e), 1); e.b.edges.splice(e.b.edges.indexOf(e), 1); }
  c.edges.forEach((e, i) => { e.id = i; });
}

function buildRoads(S) {
  const c = CITY;
  for (const e of c.edges) {
    const y = 0.03;
    if (e.axis === 'x') {
      const x0 = e.a.x + RH, x1 = e.b.x - RH, z = e.a.z;
      S.road.quad([x0, y, z + RH], [x1, y, z + RH], [x1, y, z - RH], [x0, y, z - RH], [0, 0, 0, (x1 - x0) / 12, 1, (x1 - x0) / 12, 1, 0], 0xffffff, [0, 1, 0]);
      if (e.bridge) bridgeDeck(S, x0, z - RH, x1, z + RH, 'x');
    } else {
      const z0 = e.a.z + RH, z1 = e.b.z - RH, x = e.a.x;
      S.road.quad([x - RH, y, z1], [x + RH, y, z1], [x + RH, y, z0], [x - RH, y, z0], [0, 0, 1, 0, 1, (z1 - z0) / 12, 0, (z1 - z0) / 12], 0xffffff, [0, 1, 0]);
    }
  }
  for (const n of c.nodes) if (n.edges.length) S.inter.flat(n.x - RH, n.z - RH, n.x + RH, n.z + RH, 0.03, 0xffffff, 12);
  // the road out of town: from the hangar side a highway heads into the hills
}
function bridgeDeck(S, x0, z0, x1, z1) {
  // rails and piers under a bridge across the river
  S.solid.box((x0 + x1) / 2, 0.03, z0 + 0.2, x1 - x0, 1.0, 0.4, 0x8a8a86);
  S.solid.box((x0 + x1) / 2, 0.03, z1 - 0.2, x1 - x0, 1.0, 0.4, 0x8a8a86);
  S.solid.box((x0 + x1) / 2, -1.2, (z0 + z1) / 2, x1 - x0, 1.2, z1 - z0, 0x6a6a66);
  for (let x = x0 + 12; x < x1 - 6; x += 16) S.solid.box(x, BED_Y, (z0 + z1) / 2, 2, -BED_Y - 1.2, z1 - z0 - 2, 0x7a7a76);
}
// concrete walls where land meets water inside town, and sand beaches outside
function buildSeawalls(S) {
  const c = CITY, nb = c.nb;
  for (let bj = -1; bj <= nb; bj++) for (let bi = -1; bi <= nb; bi++) {
    if (!waterBlock(bi, bj)) continue;
    const x0 = bi * P, x1 = (bi + 1) * P, z0 = bj * P, z1 = (bj + 1) * P;
    const sides = [[0, -1, [x0, z0], [x1, z0]], [0, 1, [x1, z1], [x0, z1]], [-1, 0, [x0, z1], [x0, z0]], [1, 0, [x1, z0], [x1, z1]]];
    for (const [dx, dz, a, b] of sides) {
      const nbi = bi + dx, nbj = bj + dz;
      if (waterBlock(nbi, nbj)) continue;
      if (!inCityBlocks(nbi, nbj) && !inCityBlocks(bi, bj)) continue;
      // wall face looks into the water block
      S.wall.quad([b[0], BED_Y, b[1]], [a[0], BED_Y, a[1]], [a[0], 0.15, a[1]], [b[0], 0.15, b[1]], [0, 0, P / 8, 0, P / 8, 0.6, 0, 0.6], 0xb0aca0);
    }
  }
}
function buildLamps(S) {
  const c = CITY, pts = [];
  for (const e of c.edges) {
    if (e.bridge) continue;
    for (let t = 18; t < P - 12; t += 36) {
      for (const side of [-1, 1]) {
        const x = e.axis === 'x' ? e.a.x + t : e.a.x + side * (RH + 0.6), z = e.axis === 'x' ? e.a.z + side * (RH + 0.6) : e.a.z + t;
        if (!blockAt(x, z)) continue;
        S.solid.box(x, CURB, z, 0.25, 6, 0.25, 0x505458);
        S.solid.box(x - (e.axis === 'z' ? side * 0.8 : 0), 6, z - (e.axis === 'x' ? side * 0.8 : 0), e.axis === 'z' ? 1.8 : 0.4, 0.25, e.axis === 'x' ? 1.8 : 0.4, 0x505458);
        pts.push(x - (e.axis === 'z' ? side * 1.4 : 0), 5.9, z - (e.axis === 'x' ? side * 1.4 : 0));
      }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  c.lampPts = new THREE.Points(g, new THREE.PointsMaterial({ map: TEX.glow, color: 0xffd890, size: 7, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  c.group.add(c.lampPts);
}

// ---------- blocks ----------
const HOUSE_COLS = [0xe8e0d0, 0xd8c8a8, 0xc8d4dc, 0xe0d0c0, 0xb8c8b0, 0xf0e8d8, 0xd8b8a0];
const ROOF_COLS = [0x8a3a2a, 0x5a5a60, 0x6a4a3a, 0x3a4a5a, 0x7a6a5a];
function newBuilding(b, x0, z0, x1, z1, h, style, o = {}) {
  const B = Object.assign({ id: CITY.buildings.length, block: b, x0, z0, x1, z1, h, style, tiers: [{ x0, z0, x1, z1, h }], color: 0xffffff, roof: 0x9a9a96, fire: 0, burnt: false, solids: [], details: [] }, o);
  B.cx = (x0 + x1) / 2; B.cz = (z0 + z1) / 2;
  CITY.buildings.push(B); b.buildings.push(B);
  return B;
}
function addTier(B, x0, z0, x1, z1, h) { B.tiers.push({ x0, z0, x1, z1, h }); B.h = Math.max(B.h, h); }
function buildBlock(b, S, r) {
  const { x0, x1, z0, z1, sx0, sx1, sz0, sz1 } = b;
  // the sidewalk ring and curb
  S.walk.flat(sx0, sz0, sx1, sz1, CURB, 0xffffff, 4);
  for (const [a, bb] of [[[sx0, sz1], [sx1, sz1]], [[sx1, sz1], [sx1, sz0]], [[sx1, sz0], [sx0, sz0]], [[sx0, sz0], [sx0, sz1]]]) S.solid.quad([a[0], 0, a[1]], [bb[0], 0, bb[1]], [bb[0], CURB, bb[1]], [a[0], CURB, a[1]], [0, 0, 1, 0, 1, 1, 0, 1], 0x9a968e);
  const yL = CURB + 0.01, cx = b.cx, cz = b.cz, W = x1 - x0;
  const k = b.kind;
  b.walk = true;
  CITY.walkLoops.push({ b, x0: sx0 + 1.2, z0: sz0 + 1.2, x1: sx1 - 1.2, z1: sz1 - 1.2 });
  if (k === 'park' || (k === 'landmark' && b.lstyle === 'garden')) {
    S.grass.flat(x0, z0, x1, z1, yL, 0xffffff, 8);
    S.walk.flat(cx - 1.5, z0, cx + 1.5, z1, yL + 0.01, 0xffffff, 4); S.walk.flat(x0, cz - 1.5, x1, cz + 1.5, yL + 0.01, 0xffffff, 4);
    if (k === 'landmark') { // a glasshouse and fountain
      S.solid.box(cx, yL, cz, 7, 0.8, 7, 0xb0aca0); S.solid.box(cx, yL, cz, 1.2, 3, 1.2, 0xc8c4b8);
      const B = newBuilding(b, x0 + 4, z0 + 4, x0 + 22, z0 + 18, 8, 'glass', { color: 0xb8e0d8, roof: 0xa8d0c8, noFire: true });
      B.landmark = b.lname;
    } else {
      // a pond
      if (r.chance(0.5)) S.solid.box(x0 + W * 0.72, yL - 0.12, z0 + W * 0.72, 12, 0.14, 9, 0x3a6a8a);
    }
    b.open = [{ x: cx + 12, z: cz + 12 }, { x: cx - 12, z: cz - 12 }, { x: cx + 12, z: cz - 14 }];
    for (let i = 0; i < 14; i++) { const tx = r.range(x0 + 2, x1 - 2), tz = r.range(z0 + 2, z1 - 2); if (Math.abs(tx - cx) > 3 && Math.abs(tz - cz) > 3 && dist(tx, tz, cx + 12, cz + 12) > 7 && dist(tx, tz, cx - 12, cz - 12) > 7 && dist(tx, tz, cx + 12, cz - 14) > 7) CITY.trees.push({ x: tx, z: tz, y: yL, s: r.range(0.8, 1.3), kind: r.chance(0.3) ? 1 : 0 }); }
    if (k === 'landmark') CITY.landmarks.push({ name: b.lname, x: cx + 12, z: cz + 12, b });
    return;
  }
  if (k === 'hangar') {
    S.concrete.flat(x0, z0, x1, z1, yL, 0xffffff, 8);
    const B = newBuilding(b, x0 + 2, z0 + 2, x0 + 24, z0 + 30, 11, 'ware', { color: 0xc8ccd0, roof: 0x7a8088, noFire: true, hangar: true });
    B.details.push({ t: 'box', x: x0 + 13, y: yL, z: z0 + 30.05, w: 18, h: 9, d: 0.1, c: 0x3a3e44 });
    // fuel tanks and a windsock
    S.solid.geom(GM.cyl(), x1 - 4, yL + 2, z0 + 4, 4, 4, 4, 0xd8d8d0); S.solid.geom(GM.cyl(), x1 - 9, yL + 2, z0 + 4, 4, 4, 4, 0xd8d8d0);
    addPost(x1 - 4, z0 + 4, 2, 0, 4.2); addPost(x1 - 9, z0 + 4, 2, 0, 4.2);
    S.solid.box(x0 + 3, yL, z1 - 3, 0.2, 7, 0.2, 0xd0d0d0); S.solid.geom(GM.cone(), x0 + 4.2, yL + 6.6, z1 - 3, 0.9, 2.5, 0.9, 0xff7a20, 0, 0, Math.PI / 2);
    CITY.pads.push({ x: x1 - 14, z: z1 - 14, y: yL, r: 7, kind: 'home', name: 'Home base' });
    CITY.pads.push({ x: x0 + 13, z: z1 - 10, y: yL, r: 6, kind: 'ground', name: 'Hangar apron' });
    CITY.home = CITY.pads[CITY.pads.length - 2];
    return;
  }
  if (k === 'hospital') {
    S.lot.flat(x0, z0, x1, z1, yL, 0xffffff, 8);
    S.grass.flat(x0, z1 - 10, x1, z1, yL + 0.01, 0xffffff, 8);
    const h = r.range(22, 30);
    const B = newBuilding(b, cx - 14, cz - 12, cx + 14, cz + 8, h, 'apt', { color: 0xf0f0ec, roof: 0xa0a0a0, noFire: true, hospital: b.hname });
    addTier(B, x0 + 2, cz - 6, cx - 14, cz + 6, 12); addTier(B, cx + 14, cz - 6, x1 - 2, cz + 6, 12);
    B.details.push({ t: 'box', x: cx, y: h, z: cz + 8.3, w: 12, h: 2.5, d: 0.4, c: 0xd82828, top: true });
    const pad = { x: cx, z: cz - 2, y: h, r: 7, kind: 'hospital', name: b.hname, b: B };
    CITY.pads.push(pad); CITY.hospitals.push(pad);
    b.open = [{ x: cx, z: z1 - 5 }];
    return;
  }
  if (k === 'fire' || k === 'police') {
    S.lot.flat(x0, z0, x1, z1, yL, 0xffffff, 8);
    const fire = k === 'fire';
    const B = newBuilding(b, x0 + 4, z0 + 4, x1 - 4, cz + 4, fire ? 9 : 16, fire ? 'brick' : 'office', { color: fire ? 0xffffff : 0xd8dce8, roof: 0x8a8a8a, noFire: true, station: k });
    if (fire) { addTier(B, x1 - 12, z0 + 4, x1 - 4, z0 + 12, 18); B.details.push({ t: 'box', x: cx - 4, y: yL, z: cz + 4.05, w: 16, h: 5, d: 0.1, c: 0xc82820 }); }
    else CITY.pads.push({ x: cx, z: (z0 + 4 + cz + 4) / 2, y: 16, r: 6, kind: 'police', name: 'Police HQ', b: B });
    b.open = [{ x: cx, z: z1 - 7 }];
    return;
  }
  if (k === 'landmark') { buildLandmark(b, S, r, yL); return; }
  if (k === 'farm') {
    S.field.flat(x0, z0, x1, z1, yL, 0xffffff, 8);
    S.dirt.flat(x0, z0, x0 + 22, z0 + 22, yL + 0.01, 0xffffff, 8);
    const B = newBuilding(b, x0 + 3, z0 + 3, x0 + 15, z0 + 12, 6, 'barn', { color: 0xa83020, roof: 0x5a2a20 });
    B.gable = true;
    S.solid.geom(GM.cylB(), x0 + 19, yL, z0 + 6, 4, 13, 4, 0xc8c8c0); addPost(x0 + 19, z0 + 6, 2, 0, 13);
    S.solid.geom(GM.sph(), x0 + 19, yL + 13, z0 + 6, 4, 3, 4, 0x8a8a90);
    b.open = [{ x: cx + 10, z: cz + 10 }];
    return;
  }
  if (k === 'houses') {
    S.grass.flat(x0, z0, x1, z1, yL, 0xffffff, 8);
    const n = 3, cell = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === 1 && j === 1) { // the middle lot stays a yard: somewhere to land
        b.open = [{ x: x0 + cell * 1.5, z: z0 + cell * 1.5 }];
        CITY.trees.push({ x: x0 + cell * 1.2, z: z0 + cell * 1.9, y: yL, s: 1, kind: 0 });
        continue;
      }
      const lx = x0 + i * cell, lz = z0 + j * cell, w = r.range(8, 11), d = r.range(7, 9);
      const hx = lx + cell / 2 + r.range(-1, 1), hz = lz + cell / 2 + r.range(-1, 1);
      const B = newBuilding(b, hx - w / 2, hz - d / 2, hx + w / 2, hz + d / 2, r.chance(0.3) ? 6.2 : 3.6, 'house', { color: r.pick(HOUSE_COLS), roof: r.pick(ROOF_COLS) });
      B.gable = true;
      S.concrete.flat(i === 0 ? x0 - 0.01 : hx - 1.5, hz + d / 2, i === 0 ? hx - w / 2 : hx + 1.5, hz + d / 2 + 2.5, yL + 0.01, 0xffffff, 6);
      if (r.chance(0.6)) CITY.trees.push({ x: lx + r.range(1, 3), z: lz + r.range(1, 3), y: yL, s: r.range(0.7, 1.1), kind: r.chance(0.3) ? 1 : 0 });
    }
    return;
  }
  if (k === 'industrial') {
    S.lot.flat(x0, z0, x1, z1, yL, 0xd8d8d8, 8);
    const B = newBuilding(b, x0 + 2, z0 + 2, x0 + 2 + r.range(26, 34), z0 + 2 + r.range(20, 30), r.range(8, 13), 'ware', { color: r.pick([0xd0d0c8, 0xb8c0c8, 0xd8c8b0]), roof: 0x8a8e90 });
    if (r.chance(0.5)) { // a factory chimney
      const chx = x1 - 6, chz = z0 + 6;
      S.solid.geom(GM.cylB(), chx, yL, chz, 3, 28, 3, 0x9a5a4a); addPost(chx, chz, 1.5, 0, 28);
      B.chimney = { x: chx, y: 28, z: chz };
    }
    if (b.shore) { // containers stacked by the water
      for (let i = 0; i < 8; i++) { const cxx = x0 + 4 + (i % 4) * 7, czz = z1 - 6 - Math.floor(i / 4) * 3.2, hh = r.int(1, 3); for (let s = 0; s < hh; s++) S.solid.box(cxx, yL + s * 2.6, czz, 6, 2.6, 2.6, r.pick([0xc83a2a, 0x2a6ac8, 0x3a9a4a, 0xe8a020, 0x8a8a8a])); addSolid(cxx - 3, czz - 1.3, cxx + 3, czz + 1.3, 0, yL + hh * 2.6); }
    } else {
      newBuilding(b, x0 + 4, z1 - 18, x0 + 26, z1 - 3, r.range(6, 9), 'ware', { color: 0xc8c0b0, roof: 0x7a7e80 });
    }
    b.open = [{ x: x1 - 10, z: z1 - 10 }];
    return;
  }
  // city lots: downtown, commercial, apartments
  S.concrete.flat(x0, z0, x1, z1, yL, 0xffffff, 8);
  const tall = k === 'downtown';
  const lots = tall ? (r.chance(0.35) ? [[0, 0, 1, 1]] : [[0, 0, 0.5, 1], [0.5, 0, 1, 1]]) : [[0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5], [0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]];
  const openLot = !tall && r.chance(0.5) ? r.int(0, 3) : -1;
  lots.forEach((L, li) => {
    const lx0 = x0 + L[0] * W + 1.5, lx1 = x0 + L[2] * W - 1.5, lz0 = z0 + L[1] * W + 1.5, lz1 = z0 + L[3] * W - 1.5;
    if (li === openLot) { S.lot.flat(lx0, lz0, lx1, lz1, yL + 0.01, 0xffffff, 8); b.open = [{ x: (lx0 + lx1) / 2, z: (lz0 + lz1) / 2 }]; return; }
    const dt = CITY.def.downtown;
    if (tall) {
      const h = r.range(40, 70 + 70 * dt) * (1.15 - b.d);
      const inset = r.range(0, 3);
      const B = newBuilding(b, lx0 + inset, lz0 + inset, lx1 - inset, lz1 - inset, h, r.chance(0.55) ? 'tower' : 'office', { color: r.pick([0xffffff, 0xd8e0e8, 0xe8e0d0, 0xc8d8d0]), roof: 0x7a7c80 });
      if (r.chance(0.6)) { const s = r.range(3, 6); addTier(B, lx0 + inset + s, lz0 + inset + s, lx1 - inset - s, lz1 - inset - s, h + r.range(10, 30)); }
      if (r.chance(0.3)) B.antenna = r.range(8, 18);
      // a rooftop helipad on some towers
      const top = B.tiers[B.tiers.length - 1];
      if (top.x1 - top.x0 > 14 && top.z1 - top.z0 > 14 && r.chance(0.45)) { B.pad = true; CITY.pads.push({ x: (top.x0 + top.x1) / 2, z: (top.z0 + top.z1) / 2, y: B.h, r: 6, kind: 'roof', name: 'Rooftop pad', b: B }); B.antenna = 0; }
    } else if (k === 'commercial') {
      const h = r.chance(0.5) ? r.range(7, 11) : r.range(14, 30);
      newBuilding(b, lx0, lz0, lx1, lz1, h, h < 12 ? 'shop' : r.chance(0.5) ? 'office' : 'brick', { color: r.pick([0xffffff, 0xf0e0d0, 0xd8e0e8, 0xe0d8c8]), roof: 0x8a8a8a, ac: true });
    } else {
      const h = r.range(10, 24) + (1 - b.d) * 10;
      const B = newBuilding(b, lx0 + 1, lz0 + 1, lx1 - 1, lz1 - 1, h, r.chance(0.5) ? 'apt' : 'brick', { color: r.pick([0xffffff, 0xf0e8d8, 0xe0d0c0, 0xd8d0c8]), roof: 0x8a8a8a });
      if (r.chance(0.4)) B.watertower = true;
    }
  });
}
function buildLandmark(b, S, r, yL) {
  const { x0, x1, z0, z1, cx, cz } = b, st = b.lstyle;
  S.concrete.flat(x0, z0, x1, z1, yL, 0xffffff, 8);
  let B;
  if (st === 'stadium') {
    S.grass.flat(cx - 18, cz - 13, cx + 18, cz + 13, yL + 0.01, 0xffffff, 8);
    B = newBuilding(b, x0, z0, x1, z0 + 6, 12, 'stand', { color: 0xc8c8c0, roof: 0x9a9a96 });
    newBuilding(b, x0, z1 - 6, x1, z1, 12, 'stand', { color: 0xc8c8c0, roof: 0x9a9a96 }).landmark = b.lname;
    newBuilding(b, x0, z0 + 6, x0 + 5, z1 - 6, 9, 'stand', { color: 0xc8c8c0, roof: 0x9a9a96 }).landmark = b.lname;
    newBuilding(b, x1 - 5, z0 + 6, x1, z1 - 6, 9, 'stand', { color: 0xc8c8c0, roof: 0x9a9a96 }).landmark = b.lname;
    for (const [lx, lz] of [[x0 + 2, z0 + 2], [x1 - 2, z0 + 2], [x0 + 2, z1 - 2], [x1 - 2, z1 - 2]]) { S.solid.box(lx, yL, lz, 0.6, 26, 0.6, 0x9a9a9a); S.solid.box(lx, 26, lz, 4, 2, 1, 0xf0f0d0); addPost(lx, lz, 0.6, 0, 28); }
    CITY.landmarks.push({ name: b.lname, x: cx, z: cz, b });
    b.open = [{ x: cx, z: cz }];
  } else if (st === 'dome') {
    B = newBuilding(b, cx - 15, cz - 11, cx + 15, cz + 11, 14, 'civic', { color: 0xf0ece0, roof: 0x9a9890, dome: { r: 8, y: 14, c: 0x7ab0a0 } });
    for (let i = -3; i <= 3; i++) S.solid.box(cx + i * 3.6, yL, cz + 12, 1, 12, 1, 0xf0ece0);
    S.solid.box(cx, 12 + yL, cz + 12.2, 26, 1.5, 3, 0xe0dcd0);
    CITY.landmarks.push({ name: b.lname, x: cx, z: z1 - 6, b });
    b.open = [{ x: cx, z: z1 - 6 }];
  } else if (st === 'hall') {
    B = newBuilding(b, x0 + 2, cz - 14, x1 - 2, cz + 10, 13, 'shop', { color: 0xe8e0d0, roof: 0x6a7a8a, vault: true });
    CITY.landmarks.push({ name: b.lname, x: cx, z: z1 - 6, b });
    b.open = [{ x: cx, z: z1 - 6 }];
  } else if (st === 'hotel') {
    B = newBuilding(b, cx - 12, cz - 12, cx + 12, cz + 4, 48, 'tower', { color: 0xe8d8b0, roof: 0x8a7a5a });
    addTier(B, cx - 8, cz - 8, cx + 8, cz, 58);
    B.pad = true; CITY.pads.push({ x: cx, z: cz - 4, y: 58, r: 6, kind: 'roof', name: b.lname + ' roof', b: B });
    CITY.landmarks.push({ name: b.lname, x: cx, z: z1 - 6, b, pad: CITY.pads[CITY.pads.length - 1] });
    b.open = [{ x: cx, z: z1 - 6 }];
  } else { // civic: columns and a clock tower
    B = newBuilding(b, cx - 16, cz - 12, cx + 16, cz + 6, 12, 'civic', { color: 0xe8e4d8, roof: 0x8a8a84 });
    addTier(B, cx - 4, cz - 8, cx + 4, cz, 30);
    B.clock = { x: cx, y: 26, z: cz + 0.05 };
    for (let i = -4; i <= 4; i++) S.solid.box(cx + i * 3.6, yL, cz + 7, 1, 10, 1, 0xf0ece0);
    CITY.landmarks.push({ name: b.lname, x: cx, z: z1 - 6, b });
    b.open = [{ x: cx, z: z1 - 6 }];
  }
  B.landmark = b.lname; B.noFire = true;
}

// ---------- building meshes, merged per chunk ----------
const FACADES = ['office', 'tower', 'apt', 'brick', 'ware', 'house', 'shop'];
const STYLE_TEX = { office: 'office', tower: 'tower', apt: 'apt', brick: 'brick', ware: 'ware', house: 'house', shop: 'shop', civic: 'apt', glass: 'office', stand: 'ware', barn: 'ware' };
let FACADE_MATS = null;
function facadeMats() {
  if (FACADE_MATS) return FACADE_MATS;
  FACADE_MATS = {};
  for (const f of FACADES) FACADE_MATS[f] = new THREE.MeshLambertMaterial({ map: TEX[f], vertexColors: true, emissive: 0xffffff, emissiveMap: TEX[f + 'Lit'], emissiveIntensity: 0 });
  FACADE_MATS.roof = new THREE.MeshLambertMaterial({ map: TEX.roof, vertexColors: true });
  FACADE_MATS.solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  FACADE_MATS.char = new THREE.MeshLambertMaterial({ map: TEX.rock, vertexColors: true });
  return FACADE_MATS;
}
function buildChunks() {
  const c = CITY, n = Math.ceil(c.nb / CHUNK);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) c.chunks.push({ i, j, meshes: [], buildings: [] });
  for (const B of c.buildings) { const ch = c.chunks[Math.floor(B.block.bj / CHUNK) * n + Math.floor(B.block.bi / CHUNK)]; B.chunk = ch; ch.buildings.push(B); }
  for (const B of c.buildings) makeSolids(B);
  for (const ch of c.chunks) rebuildChunk(ch);
}
function makeSolids(B) {
  for (const s of B.solids) s.dead = true;
  B.solids = [];
  const k = B.burnt ? 0.35 : 1;
  for (const t of B.tiers) B.solids.push(addSolid(t.x0, t.z0, t.x1, t.z1, 0, Math.max(2, t.h * k), B));
  if (B.gable && !B.burnt) B.solids.push(addSolid(B.x0 + 1, B.z0 + 1, B.x1 - 1, B.z1 - 1, B.h, B.h + 2.2, B));
  if (B.antenna && !B.burnt) B.solids.push(addPost((B.tiers[B.tiers.length - 1].x0 + B.tiers[B.tiers.length - 1].x1) / 2, (B.tiers[B.tiers.length - 1].z0 + B.tiers[B.tiers.length - 1].z1) / 2, 0.6, B.h, B.h + B.antenna, B));
}
function rebuildChunk(ch) {
  const FM = facadeMats();
  for (const m of ch.meshes) { m.geometry.dispose(); CITY.group.remove(m); }
  ch.meshes = [];
  const M = {}; for (const k of Object.keys(FM)) M[k] = new Merger();
  for (const B of ch.buildings) emitBuilding(B, M);
  for (const [k, mg] of Object.entries(M)) {
    if (mg.empty) continue;
    const me = new THREE.Mesh(mg.build(), FM[k]); me.matrixAutoUpdate = false; me.updateMatrix();
    CITY.group.add(me); ch.meshes.push(me);
  }
}
function emitBuilding(B, M) {
  const tex = STYLE_TEX[B.style] || 'apt';
  const ou = (B.id * 0.37) % 1;
  if (B.burnt) {
    for (const t of B.tiers) facadeBox(M.char, M.char, t.x0 + 0.3, t.z0 + 0.3, t.x1 - 0.3, t.z1 - 0.3, 0, Math.max(2, t.h * 0.35), 0x5a5450, 0x3a3634);
    const r = RNG(B.id + 99);
    for (let i = 0; i < 6; i++) M.char.box(r.range(B.x0, B.x1), 0, r.range(B.z0, B.z1), r.range(2, 5), r.range(0.5, 2), r.range(2, 5), 0x4a4440, r() * 3);
    return;
  }
  const wm = M[tex];
  for (const t of B.tiers) facadeBox(wm, M.roof, t.x0, t.z0, t.x1, t.z1, 0, t.h, B.color, B.roof, ou);
  const top = B.tiers[B.tiers.length - 1];
  const tx = (top.x0 + top.x1) / 2, tz = (top.z0 + top.z1) / 2;
  if (B.gable) {
    const along = B.x1 - B.x0 >= B.z1 - B.z0, h0 = B.h, h1 = B.h + 2.6, rc = B.roof, o = 0.4;
    const x0 = B.x0 - o, x1 = B.x1 + o, z0 = B.z0 - o, z1 = B.z1 + o;
    if (along) {
      const zm = (z0 + z1) / 2;
      M.solid.quad([x0, h0, z1], [x1, h0, z1], [x1, h1, zm], [x0, h1, zm], [0, 0, 1, 0, 1, 1, 0, 1], rc);
      M.solid.quad([x1, h0, z0], [x0, h0, z0], [x0, h1, zm], [x1, h1, zm], [0, 0, 1, 0, 1, 1, 0, 1], lerpHex(rc, 0, 0.2));
      M.solid.quad([B.x1, h0, z1 - o], [B.x1, h0, z0 + o], [B.x1, h1, zm], [B.x1, h1, zm], [0, 0, 1, 0, 1, 1, 0, 1], B.color);
      M.solid.quad([B.x0, h0, z0 + o], [B.x0, h0, z1 - o], [B.x0, h1, zm], [B.x0, h1, zm], [0, 0, 1, 0, 1, 1, 0, 1], B.color);
    } else {
      const xm = (x0 + x1) / 2;
      M.solid.quad([x1, h0, z1], [x1, h0, z0], [xm, h1, z0], [xm, h1, z1], [0, 0, 1, 0, 1, 1, 0, 1], rc);
      M.solid.quad([x0, h0, z0], [x0, h0, z1], [xm, h1, z1], [xm, h1, z0], [0, 0, 1, 0, 1, 1, 0, 1], lerpHex(rc, 0, 0.2));
      M.solid.quad([x0 + o, h0, B.z1], [x1 - o, h0, B.z1], [xm, h1, B.z1], [xm, h1, B.z1], [0, 0, 1, 0, 1, 1, 0, 1], B.color);
      M.solid.quad([x1 - o, h0, B.z0], [x0 + o, h0, B.z0], [xm, h1, B.z0], [xm, h1, B.z0], [0, 0, 1, 0, 1, 1, 0, 1], B.color);
    }
    if (B.style === 'house' && B.id % 3 === 0) M.solid.box(B.x0 + 1.5, h0, B.cz, 0.8, 3.4, 0.8, 0x7a4a3a);
  } else if (B.vault) {
    const n = 8, x0 = B.x0, x1 = B.x1, rz = (B.z1 - B.z0) / 2, zc = B.cz;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI;
      const y0 = B.h + Math.sin(a0) * 5, y1 = B.h + Math.sin(a1) * 5, za = zc - Math.cos(a0) * rz, zb = zc - Math.cos(a1) * rz;
      M.solid.quad([x0, y0, za], [x0, y1, zb], [x1, y1, zb], [x1, y0, za], [0, 0, 1, 0, 1, 1, 0, 1], i % 2 ? 0x6a7a8a : 0x5a6a7a);
    }
  } else {
    // a parapet, plus roof clutter
    const p = 0.4, pc = lerpHex(B.color, 0x808080, 0.4);
    for (const t of B.tiers) {
      M.solid.box((t.x0 + t.x1) / 2, t.h, t.z0 + p / 2, t.x1 - t.x0, 0.8, p, pc); M.solid.box((t.x0 + t.x1) / 2, t.h, t.z1 - p / 2, t.x1 - t.x0, 0.8, p, pc);
      M.solid.box(t.x0 + p / 2, t.h, (t.z0 + t.z1) / 2, p, 0.8, t.z1 - t.z0, pc); M.solid.box(t.x1 - p / 2, t.h, (t.z0 + t.z1) / 2, p, 0.8, t.z1 - t.z0, pc);
    }
    if (!B.pad && !B.hospital && !B.station && (top.x1 - top.x0) > 8) {
      const r = RNG(B.id);
      const n = r.int(1, 3);
      for (let i = 0; i < n; i++) M.solid.box(lerp(top.x0 + 2, top.x1 - 2, r()), top.h, lerp(top.z0 + 2, top.z1 - 2, r()), r.range(1.5, 3), r.range(1, 2), r.range(1.5, 3), 0x9a9a9a);
    }
    if (B.watertower) { M.solid.geom(GM.cylB(), tx + 2, top.h + 3, tz, 4, 4, 4, 0x8a6a4a); for (const [ax, az] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) M.solid.box(tx + 2 + ax, top.h, tz + az, 0.3, 3, 0.3, 0x5a4a3a); M.solid.geom(GM.cone(), tx + 2, top.h + 7.8, tz, 4.4, 1.6, 4.4, 0x6a4a3a); }
    if (B.antenna) { M.solid.box(tx, top.h, tz, 0.5, B.antenna, 0.5, 0xb0b0b0); M.solid.box(tx, top.h + B.antenna, tz, 0.8, 0.8, 0.8, 0xff2020); }
    if (B.dome) { M.solid.geom(GM.cylB(), B.cx, B.h, B.cz, B.dome.r * 2, 3, B.dome.r * 2, 0xe8e4d8); M.solid.geom(GM.sph(), B.cx, B.h + 3, B.cz, B.dome.r * 2, B.dome.r * 1.5, B.dome.r * 2, B.dome.c); M.solid.box(B.cx, B.h + 3 + B.dome.r * 0.7, B.cz, 0.6, 4, 0.6, 0xe8c040); }
    if (B.clock) { M.solid.box(B.clock.x, B.clock.y - 2, B.clock.z + 4, 4, 4, 0.2, 0xf8f4e0); M.solid.geom(GM.cone(), B.cx, top.h, B.clock.z - 4, 11, 8, 11, 0x5a6a7a, 0, Math.PI / 4, 0); }
  }
  for (const d of B.details) if (d.t === 'box') M.solid.box(d.x, d.y, d.z, d.w, d.h, d.d, d.c);
  if (B.hospital) { M.solid.box(B.cx - 16, 12, B.cz + 6.2, 3, 3, 0.3, 0xffffff); M.solid.box(B.cx - 16, 12.9, B.cz + 6.25, 2, 1, 0.3, 0xd82828); M.solid.box(B.cx - 16, 12.4, B.cz + 6.25, 0.8, 2.2, 0.3, 0xd82828); }
}
// a building's fire is out and it's a shell now: collapse it and rebuild its chunk
function burnDown(B) {
  if (B.burnt) return;
  B.burnt = true; B.fire = 0;
  makeSolids(B);
  rebuildChunk(B.chunk);
  for (const p of CITY.pads) if (p.b === B) p.dead = true;
}

// ---------- helipads ----------
function buildPads() {
  for (const p of CITY.pads) {
    const tex = p.kind === 'hospital' ? TEX.padH : p.kind === 'home' ? TEX.padHome : TEX.pad;
    const m = mesh(GM.plane(), mat(0xffffff, { map: tex }), p.x, p.y + 0.06, p.z, p.r * 2, 1, p.r * 2);
    CITY.group.add(m); p.mesh = m;
    // corner lights
    const lights = [];
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; lights.push(mesh(GM.box(), mat(p.kind === 'hospital' ? 0xff4040 : 0xffe040, { basic: true }), p.x + Math.cos(a) * p.r, p.y + 0.2, p.z + Math.sin(a) * p.r, 0.4, 0.3, 0.4)); }
    for (const l of lights) CITY.group.add(l);
  }
}

// ---------- terrain, water ----------
function buildTerrainMesh() {
  const c = CITY, n = c.hmN, pos = [], col = [], uv = [], idx = [];
  const cc = new THREE.Color();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = c.hmX0 + i * HS, z = c.hmX0 + j * HS, h = c.hm[j * n + i];
    pos.push(x, h, z); uv.push(x / 16, z / 16);
    const v = hash2(i, j, 3) * 0.12;
    if (h < 0.7 && h > BED_Y + 0.1) cc.setRGB(0.95, 0.88, 0.62); // shore
    else if (h <= BED_Y + 0.1) cc.setRGB(0.6, 0.6, 0.5);
    else if (h > 48) cc.setRGB(0.78 + v, 0.78 + v, 0.74 + v);
    else if (h > 30) cc.setRGB(0.72 + v, 0.75, 0.62);
    else cc.setRGB(0.85 + v, 1, 0.8 + v);
    col.push(cc.r, cc.g, cc.b);
  }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, d = a + n, e = d + 1; idx.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(new THREE.Uint32BufferAttribute(idx, 1)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: TEX.grass, vertexColors: true }));
  m.position.y = -0.02; // the city's own ground sits on top
  c.group.add(m);
}
function buildWater() {
  const s = CITY.size + MARGIN * P * 2 + 3000;
  TEX.water.repeat.set(s / 24, s / 24);
  const m = mesh(new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: TEX.water, color: 0xffffff, transparent: true, opacity: 0.92 }), CITY.size / 2, WATER_Y, CITY.size / 2);
  m.renderOrder = 1;
  CITY.group.add(m); CITY.water = m;
}

// ---------- trees ----------
function buildTrees(cr) {
  const c = CITY;
  // forests on the hills outside town
  for (let i = 0; i < 900; i++) {
    const x = cr.range(-MARGIN * P + 60, c.size + MARGIN * P - 60), z = cr.range(-MARGIN * P + 60, c.size + MARGIN * P - 60);
    if (x > -30 && z > -30 && x < c.size + 30 && z < c.size + 30) continue;
    const h = terrainH(x, z);
    if (h < 1.5 || h > 42 || vnoise(x / 120, z / 120, 5) < 0.42) continue;
    c.trees.push({ x, z, y: h, s: cr.range(1, 1.7), kind: cr.chance(0.6) ? 1 : 0 });
  }
  const n = c.trees.length;
  const trunk = new THREE.InstancedMesh(GM.cylB(), mat(0x6a4a30), n);
  const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), n);
  const pine = c.trees.filter((t) => t.kind === 1).length;
  const cone = new THREE.InstancedMesh(GM.cone(), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), Math.max(1, pine));
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  let li = 0, ci = 0;
  c.trees.forEach((t, i) => {
    m4.compose(_v1.set(t.x, t.y, t.z), _q.identity(), _sc.set(0.5 * t.s, 3 * t.s, 0.5 * t.s)); trunk.setMatrixAt(i, m4);
    if (t.kind === 1) { m4.compose(_v1.set(t.x, t.y + 5.5 * t.s, t.z), _q.identity(), _sc.set(4.2 * t.s, 8 * t.s, 4.2 * t.s)); cone.setMatrixAt(ci, m4); cone.setColorAt(ci++, col.setHSL(0.33, 0.45, 0.22 + hash2(i, 1) * 0.08)); }
    else { m4.compose(_v1.set(t.x, t.y + 4.5 * t.s, t.z), _q.setFromAxisAngle(_up, i), _sc.set(5 * t.s, 4.4 * t.s, 5 * t.s)); leaf.setMatrixAt(li, m4); leaf.setColorAt(li++, col.setHSL(0.25 + hash2(i, 2) * 0.08, 0.5, 0.3 + hash2(i, 3) * 0.1)); }
    if (t.y < 1) addPost(t.x, t.z, 1.6 * t.s, 0, t.y + 8 * t.s);
  });
  leaf.count = li; cone.count = ci;
  for (const m of [trunk, leaf, cone]) { if (m.instanceColor) m.instanceColor.needsUpdate = true; c.group.add(m); }
}

// ---------- collectible tokens ----------
function placeTokens(cr) {
  const c = CITY, spots = [];
  const tall = c.buildings.filter((B) => !B.gable && B.h > 15 && !B.pad && !B.hospital && !B.vault && !B.dome);
  cr.shuffle(tall);
  for (const B of tall.slice(0, 7)) { const t = B.tiers[B.tiers.length - 1]; spots.push({ x: (t.x0 + t.x1) / 2, z: (t.z0 + t.z1) / 2, y: t.h + 1.4 }); }
  const opens = c.blocks.filter((b) => b.open && b.kind !== 'hangar');
  cr.shuffle(opens);
  for (const b of opens.slice(0, 5)) spots.push({ x: b.open[0].x + 4, z: b.open[0].z + 4, y: CURB + 1.4 });
  spots.forEach((s, i) => {
    const m = mesh(GM.planeV(), mat(0xffffff, { map: TEX.token, t: true, o: 1, ds: true }), s.x, s.y, s.z, 1.6, 1.6, 1);
    m.material.alphaTest = 0.5;
    c.group.add(m);
    c.tokens.push({ i, x: s.x, y: s.y, z: s.z, mesh: m, got: false });
  });
}

// ---------- places for missions ----------
function buildPlaces() {
  const c = CITY;
  c.places = [];
  for (const b of c.blocks) if (b.open) for (const o of b.open) c.places.push({ x: o.x, z: o.z, y: CURB, b, kind: b.kind });
}
// a random point on a road edge, on the right-hand lane, with its direction
function roadSpot(filter) {
  const es = CITY.edges.filter((e) => !e.bridge && (!filter || filter(e)));
  const e = pick(es), t = rr(20, P - 20);
  const x = e.axis === 'x' ? e.a.x + t : e.a.x, z = e.axis === 'x' ? e.a.z : e.a.z + t;
  return { e, t, x, z, yaw: e.axis === 'x' ? Math.PI / 2 : 0 };
}
function nearestPad(x, z, kinds) {
  let best = null, bd = 1e12;
  for (const p of CITY.pads) { if (p.dead || (kinds && !kinds.includes(p.kind))) continue; const d = dist2(x, z, p.x, p.z); if (d < bd) { bd = d; best = p; } }
  return best;
}
function padAt(x, y, z) {
  for (const p of CITY.pads) if (!p.dead && Math.abs(y - p.y) < 1.5 && dist2(x, z, p.x, p.z) < (p.r + 1) ** 2) return p;
  return null;
}
