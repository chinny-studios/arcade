// Ricky Rescue — the city: a 12×12 block grid with the Beltway around it, avenues every third line, four districts,
// three hospitals, Station 12, addresses, collision solids and the static meshes.
//
// x grows east, z grows south. Road line i sits at i·CP on its axis. "x-lines" run north–south (constant x),
// "z-lines" run east–west (constant z). Blocks (bi, bj) sit between lines bi..bi+1 and bj..bj+1.

const CN = 12, CP = 80, CW = CN * CP; // blocks per side, block pitch, city width
const SWK = 3.5;      // sidewalk width
const CURB = 0.15;    // curb height
const lineAt = (i) => i * CP;
const isArt = (i) => i % 3 === 0;
const lanesOf = (i) => (isArt(i) ? 2 : 1);
const halfOf = (i) => (isArt(i) ? 8 : 5.5);
const speedOf = (i) => (i === 0 || i === CN ? 22 : isArt(i) ? 15.5 : 11.5);
const laneOff = (k) => 1.75 + 3.5 * k;        // lane k's centre from the road centre (k = 0 inner)
const parkOff = (i) => halfOf(i) - 1.25;      // the curb-side parking position
function districtAt(x, z) { const e = x >= CW / 2, s = z >= CW / 2; return s ? (e ? 'eastgate' : 'maple') : (e ? 'downtown' : 'harbor'); }
function streetName(axis, i) { return axis === 'x' ? STREETS_X[i] : STREETS_Z[i]; }

const CITY = {
  nodes: [], edges: [], blocks: [], solids: [], trees: [], places: [], lamps: [], signals: [], parked: [],
  hospitals: {}, station: null, grid: new Map(), meshes: [], mats: {},
};
const nodeId = (i, j) => j * (CN + 1) + i;

// ---------- spatial grid for solids ----------
const GCELL = 20;
function gridAdd(s) {
  const x0 = s.r ? s.x - s.r : s.x0, x1 = s.r ? s.x + s.r : s.x1, z0 = s.r ? s.z - s.r : s.z0, z1 = s.r ? s.z + s.r : s.z1;
  for (let cx = Math.floor(x0 / GCELL); cx <= Math.floor(x1 / GCELL); cx++) for (let cz = Math.floor(z0 / GCELL); cz <= Math.floor(z1 / GCELL); cz++) {
    const k = cx * 4096 + cz; let l = CITY.grid.get(k); if (!l) CITY.grid.set(k, (l = [])); l.push(s);
  }
}
function addSolid(x0, z0, x1, z1, h = 10, tag) { const s = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h, tag }; CITY.solids.push(s); gridAdd(s); return s; }
function addPost(x, z, r, h = 3) { const s = { x, z, r, h }; CITY.solids.push(s); gridAdd(s); return s; }
const _near = [];
function solidsNear(x, z, r) {
  _near.length = 0;
  const seen = solidsNear.seen || (solidsNear.seen = new Set()); seen.clear();
  for (let cx = Math.floor((x - r) / GCELL); cx <= Math.floor((x + r) / GCELL); cx++) for (let cz = Math.floor((z - r) / GCELL); cz <= Math.floor((z + r) / GCELL); cz++) {
    const l = CITY.grid.get(cx * 4096 + cz); if (!l) continue;
    for (const s of l) if (!seen.has(s)) { seen.add(s); _near.push(s); }
  }
  return _near;
}
// push a circle out of every solid it overlaps; returns the summed push and the deepest normal
function collideCircle(x, z, r, minH = 0.5) {
  let px = 0, pz = 0, hit = false, nx = 0, nz = 0, depth = 0;
  for (const s of solidsNear(x + px, z + pz, r)) {
    if (s.h < minH) continue;
    const cx = x + px, cz = z + pz;
    if (s.r) {
      const dx = cx - s.x, dz = cz - s.z, d = Math.hypot(dx, dz), m = r + s.r;
      if (d < m && d > 1e-6) { const k = m - d; px += dx / d * k; pz += dz / d * k; hit = true; if (k > depth) { depth = k; nx = dx / d; nz = dz / d; } }
      continue;
    }
    const qx = clamp(cx, s.x0, s.x1), qz = clamp(cz, s.z0, s.z1);
    let dx = cx - qx, dz = cz - qz, d = Math.hypot(dx, dz);
    if (d >= r) continue;
    let k;
    if (d < 1e-6) { // centre inside: leave along the shortest axis
      const l = cx - s.x0, rr = s.x1 - cx, t = cz - s.z0, b = s.z1 - cz, m = Math.min(l, rr, t, b);
      if (m === l) { dx = -1; dz = 0; k = l + r; } else if (m === rr) { dx = 1; dz = 0; k = rr + r; } else if (m === t) { dx = 0; dz = -1; k = t + r; } else { dx = 0; dz = 1; k = b + r; }
    } else { dx /= d; dz /= d; k = r - d; }
    px += dx * k; pz += dz * k; hit = true;
    if (k > depth) { depth = k; nx = dx; nz = dz; }
  }
  return { x: x + px, z: z + pz, hit, nx, nz, depth };
}
function insideSolid(x, z, pad = 0) {
  for (const s of solidsNear(x, z, pad + 1)) {
    if (s.r) { if (dist2(x, z, s.x, s.z) < (s.r + pad) ** 2) return s; }
    else if (x > s.x0 - pad && x < s.x1 + pad && z > s.z0 - pad && z < s.z1 + pad) return s;
  }
  return null;
}

// ---------- geometry queries ----------
function blockAt(x, z) {
  const bi = Math.floor(x / CP), bj = Math.floor(z / CP);
  if (bi < 0 || bj < 0 || bi >= CN || bj >= CN) return null;
  const b = CITY.blocks[bj * CN + bi];
  return x >= b.sx0 && x <= b.sx1 && z >= b.sz0 && z <= b.sz1 ? b : null;
}
function groundY(x, z) {
  if (CITY.interior && x < -2000) return CITY.interior.floorY;
  return blockAt(x, z) ? CURB : 0;
}
// which roads a point is on: { xl: line index or -1 (north–south road), zl: … }
function roadAt(x, z) {
  const i = Math.round(x / CP), j = Math.round(z / CP);
  const onX = i >= 0 && i <= CN && Math.abs(x - lineAt(i)) < halfOf(i) && z > -halfOf(0) && z < CW + halfOf(CN);
  const onZ = j >= 0 && j <= CN && Math.abs(z - lineAt(j)) < halfOf(j) && x > -halfOf(0) && x < CW + halfOf(CN);
  return { xl: onX ? i : -1, zl: onZ ? j : -1 };
}
function inCity(x, z, pad = 0) { return x > -8 - pad && z > -8 - pad && x < CW + 8 + pad && z < CW + 8 + pad; }

// ---------- generation ----------
function buildCity() {
  const cr = RNG('ricky-city-7');
  // nodes
  for (let j = 0; j <= CN; j++) for (let i = 0; i <= CN; i++) {
    const art = isArt(i) || isArt(j);
    CITY.nodes.push({ id: nodeId(i, j), i, j, x: lineAt(i), z: lineAt(j), signal: art, off: (i * 7 + j * 11) % 26, edges: [] });
  }
  // edges: axis 'x' runs along x on z-line j; axis 'z' runs along z on x-line i
  const addEdge = (a, b, axis, line) => {
    const e = { id: CITY.edges.length, a, b, axis, line, lanes: lanesOf(line), half: halfOf(line), speed: speedOf(line), len: CP, name: streetName(axis === 'x' ? 'z' : 'x', line) };
    CITY.edges.push(e); CITY.nodes[a].edges.push(e); CITY.nodes[b].edges.push(e); return e;
  };
  for (let j = 0; j <= CN; j++) for (let i = 0; i < CN; i++) addEdge(nodeId(i, j), nodeId(i + 1, j), 'x', j);
  for (let i = 0; i <= CN; i++) for (let j = 0; j < CN; j++) addEdge(nodeId(i, j), nodeId(i, j + 1), 'z', i);
  // blocks
  const special = {
    '2,8': 'station', '4,10': 'hosp:brigid', '8,7': 'hosp:mercy', '7,4': 'hosp:general',
    '1,10': 'park', '4,7': 'park', '10,10': 'park', '9,1': 'plaza', '3,1': 'park', '7,10': 'gas', '11,6': 'park',
  };
  for (let bj = 0; bj < CN; bj++) for (let bi = 0; bi < CN; bi++) {
    const sx0 = lineAt(bi) + halfOf(bi), sx1 = lineAt(bi + 1) - halfOf(bi + 1), sz0 = lineAt(bj) + halfOf(bj), sz1 = lineAt(bj + 1) - halfOf(bj + 1);
    const b = { bi, bj, sx0, sx1, sz0, sz1, x0: sx0 + SWK, x1: sx1 - SWK, z0: sz0 + SWK, z1: sz1 - SWK, district: districtAt((sx0 + sx1) / 2, (sz0 + sz1) / 2), kind: special[bi + ',' + bj] || null, lawn: [], paved: [] };
    b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2;
    if (!b.kind) b.kind = { maple: 'houses', eastgate: cr.chance(0.4) ? 'mall' : cr.chance(0.5) ? 'apts' : 'houses', downtown: cr.chance(0.85) ? 'towers' : 'apts', harbor: cr.chance(0.75) ? 'ware' : 'apts' }[b.district];
    CITY.blocks.push(b);
  }
  // meshes
  const M = {
    road2: new Merger(), road4: new Merger(), inter: new Merger(), mark: new Merger(), walk: new Merger(), grass: new Merger(), lot: new Merger(),
    office: new Merger(), apt: new Merger(), brick: new Merger(), ware: new Merger(), house: new Merger(), shop: new Merger(), roof: new Merger(),
    solid: new Merger(), glass: new Merger(), lampHead: new Merger(),
  };
  CITY.M = M;
  buildRoads(M);
  for (const b of CITY.blocks) buildBlock(b, M, cr);
  buildLamps(M, cr);
  buildSignals(M);
  buildOutskirts(M);
  // finished meshes
  TEX.walk.repeat.set(1, 1);
  const lambert = (opts) => new THREE.MeshLambertMaterial(opts);
  const facadeMat = (k) => lambert({ map: TEX[k], vertexColors: true, emissive: 0xffffff, emissiveMap: TEX[k + 'Lit'], emissiveIntensity: 0 });
  const mats = CITY.mats = {
    road2: lambert({ map: TEX.road2 }), road4: lambert({ map: TEX.road4 }), inter: lambert({ map: TEX.asphalt }), mark: lambert({ color: 0xe8e8e8 }),
    walk: lambert({ map: TEX.walk, vertexColors: true }), grass: lambert({ map: TEX.grass, vertexColors: true }), lot: lambert({ map: TEX.lot }),
    office: facadeMat('office'), apt: facadeMat('apt'), brick: facadeMat('brick'), ware: facadeMat('ware'), house: facadeMat('house'), shop: facadeMat('shop'),
    roof: lambert({ map: TEX.roof, vertexColors: true }), solid: lambert({ vertexColors: true }), glass: lambert({ color: 0x9ab8d0, emissive: 0xffe0a0, emissiveIntensity: 0, vertexColors: true }),
    lampHead: lambert({ color: 0xfff4d8, emissive: 0xffe8b0, emissiveIntensity: 0 }),
  };
  for (const [k, m] of Object.entries(M)) {
    if (m.empty) continue;
    const o = new THREE.Mesh(m.build(), mats[k]);
    const flat = ['road2', 'road4', 'inter', 'mark', 'walk', 'grass', 'lot'].includes(k);
    o.receiveShadow = true; o.castShadow = !flat;
    o.matrixAutoUpdate = false; o.updateMatrix();
    R.scene.add(o); CITY.meshes.push(o);
  }
  buildTrees(cr);
  bus.on('tod', (h, n) => {
    for (const k of ['office', 'apt', 'brick', 'ware', 'house', 'shop']) mats[k].emissiveIntensity = n * 0.85;
    mats.glass.emissiveIntensity = n * 0.6; mats.lampHead.emissiveIntensity = n * 1.2;
    if (CITY.lampGlow) CITY.lampGlow.material.opacity = n * 0.5;
  });
}

function buildRoads(M) {
  // straight segments between intersection boxes
  for (const e of CITY.edges) {
    const A = CITY.nodes[e.a], B = CITY.nodes[e.b];
    const h = e.half, m = e.lanes === 2 ? M.road4 : M.road2;
    const y = 0.01;
    if (e.axis === 'x') {
      const x0 = A.x + halfOf(A.i === undefined ? 0 : A.i), x1 = B.x - halfOf(B.i);
      const z = A.z, vlen = (x1 - x0) / 12;
      // u across (north edge → south edge), v along
      m.quad([x0, y, z + h], [x1, y, z + h], [x1, y, z - h], [x0, y, z - h], [1, 0, 1, vlen, 0, vlen, 0, 0], 0xffffff, [0, 1, 0]);
    } else {
      const z0 = A.z + halfOf(A.j), z1 = B.z - halfOf(B.j);
      const x = A.x, vlen = (z1 - z0) / 12;
      m.quad([x - h, y, z1], [x + h, y, z1], [x + h, y, z0], [x - h, y, z0], [0, vlen, 1, vlen, 1, 0, 0, 0], 0xffffff, [0, 1, 0]);
    }
  }
  // intersections with crosswalks and stop lines
  for (const n of CITY.nodes) {
    const hx = halfOf(n.i), hz = halfOf(n.j), y = 0.012;
    M.inter.quad([n.x - hx, y, n.z + hz], [n.x + hx, y, n.z + hz], [n.x + hx, y, n.z - hz], [n.x - hx, y, n.z - hz], [0, 0, hx / 6, 0, hx / 6, hz / 6, 0, hz / 6], 0xffffff, [0, 1, 0]);
    const ym = 0.02;
    const stripes = (x0, z0, alongX, len, across) => { // zebra across a road mouth
      for (let s = -across + 0.6; s < across - 0.4; s += 1.2) {
        if (alongX) M.mark.flat(x0 + s, ym - 0.01, z0, 0.6, 0.012, len, 0xe8e8e8);
        else M.mark.flat(x0, ym - 0.01, z0 + s, len, 0.012, 0.6, 0xe8e8e8);
      }
    };
    if (n.signal) {
      // crosswalks on each mouth that has a road
      if (n.j > 0) stripes(n.x, n.z - hz - 1.6, true, 2.6, hx);
      if (n.j < CN) stripes(n.x, n.z + hz + 1.6, true, 2.6, hx);
      if (n.i > 0) stripes(n.x - hx - 1.6, n.z, false, 2.6, hz);
      if (n.i < CN) stripes(n.x + hx + 1.6, n.z, false, 2.6, hz);
    }
    // stop lines on the approach lanes (right-hand traffic)
    const sl = n.signal ? 3.4 : 0.8;
    if (n.i > 0) M.mark.flat(n.x - hx - sl, ym - 0.01, n.z + hz / 2, 0.45, 0.012, hz, 0xf0f0f0); // eastbound approach (from west), on the south half
    if (n.i < CN) M.mark.flat(n.x + hx + sl, ym - 0.01, n.z - hz / 2, 0.45, 0.012, hz, 0xf0f0f0);
    if (n.j > 0) M.mark.flat(n.x - hx / 2, ym - 0.01, n.z - hz - sl, hx, 0.012, 0.45, 0xf0f0f0); // southbound approach (from north), on the west half
    if (n.j < CN) M.mark.flat(n.x + hx / 2, ym - 0.01, n.z + hz + sl, hx, 0.012, 0.45, 0xf0f0f0);
  }
}

// ---------- blocks ----------
const HOUSE_COLS = [0xe8e0d0, 0xd8e4ec, 0xf0e2c8, 0xdce8d4, 0xece0e4, 0xc8d4dc, 0xf2ecdc, 0xe0d0c0, 0xbcc8b8, 0xd8c8b8];
const ROOF_COLS = [0x5a4a42, 0x4a4e58, 0x6a3a30, 0x3e4a3e, 0x585048, 0x7a6858];
const TOWER_COLS = [0xd8dce4, 0xc8d0dc, 0xe4e0d8, 0xb8c4d0, 0xd0d4cc, 0xa8b4c4, 0xe0d8cc];
const APT_COLS = [0xd8c8b4, 0xc8b0a0, 0xe0d4c0, 0xb89a88, 0xd0c0b0, 0xc4ccd0];
const WARE_COLS = [0xb8bcc0, 0xa8b0b8, 0xc8c0b0, 0x9aa4a8, 0xb0a898, 0x8c9aa0];

function lawn(M, b, x0, z0, x1, z1, tint = 0xffffff) { M.grass.quad([x0, CURB + 0.004, z1], [x1, CURB + 0.004, z1], [x1, CURB + 0.004, z0], [x0, CURB + 0.004, z0], [x0 / 16, z1 / 16, x1 / 16, z1 / 16, x1 / 16, z0 / 16, x0 / 16, z0 / 16], tint, [0, 1, 0]); }
function paved(M, x0, z0, x1, z1) { M.lot.quad([x0, CURB + 0.006, z1], [x1, CURB + 0.006, z1], [x1, CURB + 0.006, z0], [x0, CURB + 0.006, z0], [x0 / 20, z1 / 20, x1 / 20, z1 / 20, x1 / 20, z0 / 20, x0 / 20, z0 / 20], 0xffffff, [0, 1, 0]); }
// a door facing outward normal (nx, nz) at (x, z) on a building face: registers a call place
function addPlace(b, kind, x, z, nx, nz, o = {}) {
  // the road this face fronts, and where a rig parks against its curb
  let line, axis;
  if (nz) { line = nz > 0 ? b.bj + 1 : b.bj; axis = 'z'; } else { line = nx > 0 ? b.bi + 1 : b.bi; axis = 'x'; }
  const L = lineAt(line), po = parkOff(line);
  const curb = axis === 'z' ? { x: clamp(x, b.sx0 + 4, b.sx1 - 4), z: L - Math.sign(nz) * po } : { x: L - Math.sign(nx) * po, z: clamp(z, b.sz0 + 4, b.sz1 - 4) };
  const dx = -nz, dz = nx; curb.yaw = Math.atan2(dx, dz);
  const street = streetName(axis, line);
  const along = axis === 'z' ? x : z;
  const num = (Math.floor(along / CP) + 1) * 100 + Math.floor((along % CP) / 4) * 2 + ((nz > 0 || nx > 0) ? 0 : 1);
  const p = Object.assign({ id: CITY.places.length, kind, district: b.district, x, z, yaw: Math.atan2(nx, nz), nx, nz, curb, street, num, addr: num + ' ' + street, block: b }, o);
  CITY.places.push(p); return p;
}
function buildBlock(b, M, cr) {
  // slab with sidewalk ring (raised by CURB), then contents
  const { sx0, sx1, sz0, sz1 } = b;
  const top = (m, x0, z0, x1, z1, y, col) => m.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [x0 / 3, z1 / 3, x1 / 3, z1 / 3, x1 / 3, z0 / 3, x0 / 3, z0 / 3], col, [0, 1, 0]);
  top(M.walk, sx0, sz0, sx1, sz1, CURB, 0xffffff);
  // curb faces
  M.walk.quad([sx0, 0, sz1], [sx1, 0, sz1], [sx1, CURB, sz1], [sx0, CURB, sz1], [0, 0, (sx1 - sx0) / 3, 0, (sx1 - sx0) / 3, 0.05, 0, 0.05], 0xd8d8d8, [0, 0, 1]);
  M.walk.quad([sx1, 0, sz0], [sx0, 0, sz0], [sx0, CURB, sz0], [sx1, CURB, sz0], [0, 0, (sx1 - sx0) / 3, 0, (sx1 - sx0) / 3, 0.05, 0, 0.05], 0xd8d8d8, [0, 0, -1]);
  M.walk.quad([sx1, 0, sz1], [sx1, 0, sz0], [sx1, CURB, sz0], [sx1, CURB, sz1], [0, 0, (sz1 - sz0) / 3, 0, (sz1 - sz0) / 3, 0.05, 0, 0.05], 0xd8d8d8, [1, 0, 0]);
  M.walk.quad([sx0, 0, sz0], [sx0, 0, sz1], [sx0, CURB, sz1], [sx0, CURB, sz0], [0, 0, (sz1 - sz0) / 3, 0, (sz1 - sz0) / 3, 0.05, 0, 0.05], 0xd8d8d8, [-1, 0, 0]);
  const k = b.kind;
  if (k === 'houses') buildHouses(b, M, cr);
  else if (k === 'apts') buildApts(b, M, cr);
  else if (k === 'mall') buildMall(b, M, cr);
  else if (k === 'towers') buildTowers(b, M, cr);
  else if (k === 'ware') buildWare(b, M, cr);
  else if (k === 'park' || k === 'plaza') buildPark(b, M, cr);
  else if (k === 'gas') buildGas(b, M, cr);
  else if (k === 'station') buildStation(b, M, cr);
  else if (k.startsWith('hosp:')) buildHospital(b, M, cr, k.slice(5));
}
function gable(m, x0, z0, x1, z1, y, rise, col, over = 0.5) {
  x0 -= over; z0 -= over; x1 += over; z1 += over;
  const alongX = x1 - x0 >= z1 - z0;
  if (alongX) {
    const zm = (z0 + z1) / 2, yt = y + rise;
    m.quad([x0, y, z1], [x1, y, z1], [x1, yt, zm], [x0, yt, zm], [0, 0, 1, 0, 1, 1, 0, 1], col);
    m.quad([x1, y, z0], [x0, y, z0], [x0, yt, zm], [x1, yt, zm], [0, 0, 1, 0, 1, 1, 0, 1], col);
    m.quad([x0 + over, y, z0 + over], [x0 + over, y, z1 - over], [x0 + over, yt, zm], [x0 + over, yt, zm], [0, 0, 1, 0, 0.5, 1, 0.5, 1], 0xe8e4dc, [-1, 0, 0]);
    m.quad([x1 - over, y, z1 - over], [x1 - over, y, z0 + over], [x1 - over, yt, zm], [x1 - over, yt, zm], [0, 0, 1, 0, 0.5, 1, 0.5, 1], 0xe8e4dc, [1, 0, 0]);
  } else {
    const xm = (x0 + x1) / 2, yt = y + rise;
    m.quad([x1, y, z1], [x1, y, z0], [xm, yt, z0], [xm, yt, z1], [0, 0, 1, 0, 1, 1, 0, 1], col);
    m.quad([x0, y, z0], [x0, y, z1], [xm, yt, z1], [xm, yt, z0], [0, 0, 1, 0, 1, 1, 0, 1], col);
    m.quad([x0 + over, y, z1 - over], [x1 - over, y, z1 - over], [xm, yt, z1 - over], [xm, yt, z1 - over], [0, 0, 1, 0, 0.5, 1, 0.5, 1], 0xe8e4dc, [0, 0, 1]);
    m.quad([x1 - over, y, z0 + over], [x0 + over, y, z0 + over], [xm, yt, z0 + over], [xm, yt, z0 + over], [0, 0, 1, 0, 0.5, 1, 0.5, 1], 0xe8e4dc, [0, 0, -1]);
  }
}
// a front door slab on a face
function doorSlab(M, x, z, nx, nz, w = 1.1, h = 2.2, col = 0x6a4a34) {
  const t = 0.12;
  if (nz) M.solid.box(x, CURB, z + nz * t / 2, w, h, t, col); else M.solid.box(x + nx * t / 2, CURB, z, t, h, w, col);
}
function buildHouses(b, M, cr) {
  const { x0, x1, z0, z1 } = b;
  lawn(M, b, x0, z0, x1, z1);
  const W = x1 - x0, H = z1 - z0, D = Math.min(23, H / 2 - 2);
  const sides = [
    { from: x0, to: x1, axis: 'x', front: z1, nz: 1, nx: 0 }, // south side, faces +z
    { from: x0, to: x1, axis: 'x', front: z0, nz: -1, nx: 0 },
    { from: z0 + D, to: z1 - D, axis: 'z', front: x1, nz: 0, nx: 1 },
    { from: z0 + D, to: z1 - D, axis: 'z', front: x0, nz: 0, nx: -1 },
  ];
  for (const s of sides) {
    const span = s.to - s.from; if (span < 13) continue;
    const n = Math.max(1, Math.floor(span / 15.5)), pw = span / n;
    for (let k = 0; k < n; k++) {
      const c = s.from + pw * (k + 0.5);
      const hw = Math.min(12, pw * 0.66) * cr.range(0.85, 1), hd = cr.range(8, 10), set = cr.range(5.5, 7.5);
      const two = cr.chance(0.45), hh = two ? 5.8 : 3.2;
      const col = cr.pick(HOUSE_COLS), rcol = cr.pick(ROOF_COLS);
      let bx0, bz0, bx1, bz1, dx, dz;
      if (s.axis === 'x') { bx0 = c - hw / 2; bx1 = c + hw / 2; if (s.nz > 0) { bz1 = s.front - set; bz0 = bz1 - hd; } else { bz0 = s.front + set; bz1 = bz0 + hd; } dx = c + cr.range(-hw * 0.25, hw * 0.25); dz = s.nz > 0 ? bz1 : bz0; }
      else { bz0 = c - hw / 2; bz1 = c + hw / 2; if (s.nx > 0) { bx1 = s.front - set; bx0 = bx1 - hd; } else { bx0 = s.front + set; bx1 = bx0 + hd; } dz = c + cr.range(-hw * 0.25, hw * 0.25); dx = s.nx > 0 ? bx1 : bx0; }
      facadeBox(M.house, null, bx0, bz0, bx1, bz1, CURB, CURB + hh, col, 0, 4, 3);
      gable(M.roof, bx0, bz0, bx1, bz1, CURB + hh, cr.range(2.2, 3.2), rcol);
      addSolid(bx0, bz0, bx1, bz1, hh + 2, 'house');
      doorSlab(M, dx, dz, s.nx, s.nz, 1.1, 2.2, cr.pick([0x6a4a34, 0x8a2a2a, 0x2a4a6a, 0x3a5a3a, 0xf0f0e8]));
      // porch step
      M.solid.box(dx + s.nx * 0.8, CURB, dz + s.nz * 0.8, s.nz ? 2 : 1.4, 0.2, s.nz ? 1.4 : 2, 0xb8b0a4);
      // path to the sidewalk
      if (s.axis === 'x') { const pz0 = Math.min(dz, s.front), pz1 = Math.max(dz, s.front); M.walk.quad([dx - 0.7, CURB + 0.01, pz1], [dx + 0.7, CURB + 0.01, pz1], [dx + 0.7, CURB + 0.01, pz0], [dx - 0.7, CURB + 0.01, pz0], [0, 0, 0.4, 0, 0.4, 1, 0, 1], 0xe0dcd4, [0, 1, 0]); }
      else { const px0 = Math.min(dx, s.front), px1 = Math.max(dx, s.front); M.walk.quad([px0, CURB + 0.01, dz + 0.7], [px1, CURB + 0.01, dz + 0.7], [px1, CURB + 0.01, dz - 0.7], [px0, CURB + 0.01, dz - 0.7], [0, 0, 1, 0, 1, 0.4, 0, 0.4], 0xe0dcd4, [0, 1, 0]); }
      addPlace(b, 'house', dx + s.nx * 1.6, dz + s.nz * 1.6, s.nx, s.nz, { floors: two ? 2 : 1, access: 'stairs', bld: { x0: bx0, z0: bz0, x1: bx1, z1: bz1 } });
      // trees and the odd mailbox
      if (cr.chance(0.6)) { const t = s.axis === 'x' ? { x: c + (dx < c ? 1 : -1) * hw * 0.42, z: s.front - s.nz * set * 0.45 } : { x: s.front - s.nx * set * 0.45, z: c + (dz < c ? 1 : -1) * hw * 0.42 }; CITY.trees.push({ x: t.x, z: t.z, s: cr.range(0.8, 1.2), type: cr.int(0, 2) }); }
      if (cr.chance(0.5)) { const t = s.axis === 'x' ? { x: c + cr.range(-4, 4), z: s.nz > 0 ? bz0 - 4 : bz1 + 4 } : { x: s.nx > 0 ? bx0 - 4 : bx1 + 4, z: c + cr.range(-4, 4) }; if (t.x > x0 + 2 && t.x < x1 - 2 && t.z > z0 + 2 && t.z < z1 - 2 && !insideSolid(t.x, t.z, 1.5)) CITY.trees.push({ x: t.x, z: t.z, s: cr.range(0.9, 1.4), type: cr.int(0, 2) }); }
      if (cr.chance(0.5)) { const mx = s.axis === 'x' ? dx + 1.6 : s.front - s.nx * 0.6, mz = s.axis === 'x' ? s.front - s.nz * 0.6 : dz + 1.6; M.solid.box(mx, CURB, mz, 0.12, 1.0, 0.12, 0x404040); M.solid.box(mx, CURB + 1.0, mz, 0.3, 0.25, 0.45, cr.pick([0x2a2a2a, 0x2a4a8a, 0xd8d8d0])); }
    }
  }
}
function towerBox(M, kind, x0, z0, x1, z1, h, col, bayW, floorH, roofCol = 0x8a8c90) {
  facadeBox(M[kind], M.roof, x0, z0, x1, z1, CURB, CURB + h, col, roofCol, bayW, floorH);
  addSolid(x0, z0, x1, z1, h, kind);
}
function frontFace(b, x0, z0, x1, z1) {
  // which side of a parcel faces a street most directly
  const dS = b.z1 - z1, dN = z0 - b.z0, dE = b.x1 - x1, dW = x0 - b.x0, m = Math.min(dS, dN, dE, dW);
  if (m === dS) return { nx: 0, nz: 1, x: (x0 + x1) / 2, z: z1 };
  if (m === dN) return { nx: 0, nz: -1, x: (x0 + x1) / 2, z: z0 };
  if (m === dE) return { nx: 1, nz: 0, x: x1, z: (z0 + z1) / 2 };
  return { nx: -1, nz: 0, x: x0, z: (z0 + z1) / 2 };
}
function entrance(M, f, w = 3) { // a glass entrance with a canopy
  if (f.nz) { M.glass.box(f.x, CURB, f.z + f.nz * 0.05, w, 2.8, 0.12, 0x90a8c0); M.solid.box(f.x, CURB + 3.0, f.z + f.nz * 1.2, w + 1.6, 0.25, 2.4, 0x50545a); }
  else { M.glass.box(f.x + f.nx * 0.05, CURB, f.z, 0.12, 2.8, w, 0x90a8c0); M.solid.box(f.x + f.nx * 1.2, CURB + 3.0, f.z, 2.4, 0.25, w + 1.6, 0x50545a); }
}
function buildTowers(b, M, cr) {
  const { x0, x1, z0, z1 } = b;
  paved(M, x0, z0, x1, z1);
  const mx = (x0 + x1) / 2 + cr.range(-4, 4), mz = (z0 + z1) / 2 + cr.range(-4, 4);
  const core = Math.hypot(b.cx - 760, b.cz - 220) < 260 ? 1 : 0.55;
  const parcels = cr.chance(0.3) ? [[x0, z0, x1, mz], [x0, mz, x1, z1]] : [[x0, z0, mx, mz], [mx, z0, x1, mz], [x0, mz, mx, z1], [mx, mz, x1, z1]];
  for (const [px0, pz0, px1, pz1] of parcels) {
    if (cr.chance(0.12)) { // a small plaza with a tree
      CITY.trees.push({ x: (px0 + px1) / 2, z: (pz0 + pz1) / 2, s: 1.2, type: 1 });
      continue;
    }
    const inset = cr.range(1.5, 3);
    const tx0 = px0 + inset, tz0 = pz0 + inset, tx1 = px1 - inset, tz1 = pz1 - inset;
    const h = cr.range(26, 70) * core + cr.range(0, 60) * core * core;
    const glass = cr.chance(0.7);
    const col = cr.pick(TOWER_COLS);
    towerBox(M, glass ? 'office' : 'apt', tx0, tz0, tx1, tz1, h, col, 3, 3.6);
    if (h > 60 && cr.chance(0.6)) { // setback crown
      const s = Math.min(tx1 - tx0, tz1 - tz0) * 0.18;
      facadeBox(M.office, M.roof, tx0 + s, tz0 + s, tx1 - s, tz1 - s, CURB + h, CURB + h + cr.range(8, 18), col, 0x7a7c80, 3, 3.6);
    }
    M.solid.box((tx0 + tx1) / 2, CURB + h, (tz0 + tz1) / 2, 3, 2.5, 3, 0x6a6c70); // rooftop plant
    const f = frontFace(b, tx0, tz0, tx1, tz1);
    entrance(M, f, 4);
    addPlace(b, 'office', f.x + f.nx * 1.8, f.z + f.nz * 1.8, f.nx, f.nz, { floors: Math.max(2, Math.floor(h / 3.6)), access: 'elevator', bld: { x0: tx0, z0: tz0, x1: tx1, z1: tz1 } });
  }
}
function buildApts(b, M, cr) {
  const { x0, x1, z0, z1 } = b;
  paved(M, x0, z0, x1, z1);
  const d = 15, fl = cr.int(3, 6);
  for (const s of [{ nz: 1, zz0: z1 - 3 - d, zz1: z1 - 3 }, { nz: -1, zz0: z0 + 3, zz1: z0 + 3 + d }]) {
    const bx0 = x0 + 4, bx1 = x1 - 4, h = fl * 3.2 + 0.6, col = cr.pick(APT_COLS);
    towerBox(M, cr.chance(0.5) ? 'brick' : 'apt', bx0, s.zz0, bx1, s.zz1, h, col, 3.2, 3.2, 0x6a6a6a);
    const fz = s.nz > 0 ? s.zz1 : s.zz0;
    const doors = (bx1 - bx0) > 40 ? [bx0 + (bx1 - bx0) * 0.27, bx0 + (bx1 - bx0) * 0.73] : [(bx0 + bx1) / 2];
    for (const dx of doors) {
      const f = { nx: 0, nz: s.nz, x: dx, z: fz };
      entrance(M, f, 2.2);
      addPlace(b, 'apt', dx, fz + s.nz * 1.8, 0, s.nz, { floors: fl, access: fl > 4 ? 'elevator' : 'stairs', bld: { x0: bx0, z0: s.zz0, x1: bx1, z1: s.zz1 } });
    }
    for (let x = bx0 + 3; x < bx1 - 2; x += cr.range(9, 14)) CITY.trees.push({ x, z: s.nz > 0 ? s.zz1 + 1.6 : s.zz0 - 1.6, s: cr.range(0.6, 0.85), type: 0 });
  }
  // dumpsters in the middle lot
  for (let n = 0; n < 2; n++) { const x = cr.range(x0 + 6, x1 - 6), z = (z0 + z1) / 2 + cr.range(-3, 3); M.solid.box(x, CURB, z, 2.2, 1.4, 1.4, cr.pick([0x2a5a3a, 0x3a4a6a])); addSolid(x - 1.1, z - 0.7, x + 1.1, z + 0.7, 1.4); }
}
function buildMall(b, M, cr) {
  const { x0, x1, z0, z1 } = b;
  paved(M, x0, z0, x1, z1);
  const d = 14, h = 5.5, bz0 = z0 + 2, bz1 = z0 + 2 + d;
  const n = cr.int(3, 5), w = (x1 - x0 - 4) / n;
  for (let k = 0; k < n; k++) {
    const sx0 = x0 + 2 + w * k, sx1 = sx0 + w - 0.2;
    towerBox(M, 'shop', sx0, bz0, sx1, bz1, h, cr.pick([0xece4d8, 0xe0d8cc, 0xd8e0e4, 0xf0e8dc]), 3, h, 0x7a7a7a);
    // awning
    M.solid.box((sx0 + sx1) / 2, CURB + 3.2, bz1 + 0.8, w - 0.6, 0.18, 1.6, cr.pick([0xc83a3a, 0x3a7ac8, 0x3aa86a, 0xe8a830, 0x8a4ac8]));
    addPlace(b, 'shop', (sx0 + sx1) / 2, bz1 + 2, 0, 1, { floors: 1, access: 'ground', bld: { x0: sx0, z0: bz0, x1: sx1, z1: bz1 } });
  }
  // parking stall stripes
  for (let x = x0 + 4; x < x1 - 4; x += 3) M.mark.flat(x, CURB + 0.005, bz1 + 9, 0.12, 0.012, 5, 0xe8e8e8);
  for (let x = x0 + 4; x < x1 - 4; x += 3) M.mark.flat(x, CURB + 0.005, z1 - 6, 0.12, 0.012, 5, 0xe8e8e8);
  CITY.parkingLots = CITY.parkingLots || []; CITY.parkingLots.push({ x0: x0 + 4, x1: x1 - 4, rows: [bz1 + 9, z1 - 6] });
}
function buildWare(b, M, cr) {
  const { x0, x1, z0, z1 } = b;
  paved(M, x0, z0, x1, z1);
  const two = cr.chance(0.55);
  const parts = two ? [[x0 + 3, z0 + 3, x1 - 3, (z0 + z1) / 2 - 3, -1], [x0 + 3, (z0 + z1) / 2 + 3, x1 - 3, z1 - 3, 1]] : [[x0 + 4, z0 + 4, x1 - 4, z1 - 16, -1]];
  for (const [wx0, wz0, wx1, wz1, side] of parts) {
    const h = cr.range(8, 13);
    towerBox(M, 'ware', wx0, wz0, wx1, wz1, h, cr.pick(WARE_COLS), 6, h, 0x9a9ca0);
    const nz = side, fz = side > 0 ? wz1 : wz0;
    // loading doors
    for (let x = wx0 + 5; x < wx1 - 4; x += 8) M.solid.box(x, CURB, fz + nz * 0.06, 4, 4.2, 0.1, 0x6a7078);
    const dx = wx0 + 2.5;
    doorSlab(M, dx, fz, 0, nz, 1.1, 2.2, 0x40464c);
    addPlace(b, 'ware', dx, fz + nz * 1.8, 0, nz, { floors: 1, access: 'ground', bld: { x0: wx0, z0: wz0, x1: wx1, z1: wz1 } });
  }
  if (!two) { // container stacks in the yard
    for (let x = x0 + 5; x < x1 - 8; x += 6.5) for (let l = 0; l < cr.int(1, 3); l++) { M.solid.box(x + 1.2, CURB + l * 2.6, z1 - 9, 2.4, 2.6, 6.1, cr.pick([0xc84a3a, 0x3a6ab0, 0x3a9a5a, 0xd8a03a, 0x7a7a80, 0xb05a2a])); }
    addSolid(x0 + 5, z1 - 12.1, x1 - 6, z1 - 5.9, 3);
  }
}
function buildPark(b, M, cr) {
  const { x0, x1, z0, z1 } = b;
  const plaza = b.kind === 'plaza';
  if (plaza) paved(M, x0, z0, x1, z1); else lawn(M, b, x0, z0, x1, z1, 0xf0fff0);
  const cx = b.cx, cz = b.cz;
  // cross paths
  M.walk.quad([x0, CURB + 0.012, cz + 1.5], [x1, CURB + 0.012, cz + 1.5], [x1, CURB + 0.012, cz - 1.5], [x0, CURB + 0.012, cz - 1.5], [0, 0, 20, 0, 20, 1, 0, 1], 0xe8e0d0, [0, 1, 0]);
  M.walk.quad([cx - 1.5, CURB + 0.012, z1], [cx + 1.5, CURB + 0.012, z1], [cx + 1.5, CURB + 0.012, z0], [cx - 1.5, CURB + 0.012, z0], [0, 0, 1, 0, 1, 20, 0, 20], 0xe8e0d0, [0, 1, 0]);
  if (plaza) { // fountain
    M.solid.box(cx, CURB, cz, 9, 0.6, 9, 0xb8b4ac); M.glass.box(cx, CURB + 0.5, cz, 8, 0.12, 8, 0x5a8ab0); M.solid.box(cx, CURB, cz, 1.2, 2.4, 1.2, 0xc8c4bc);
    addSolid(cx - 4.5, cz - 4.5, cx + 4.5, cz + 4.5, 0.6);
  } else if (cr.chance(0.6)) { // pond
    const px = cx + (x1 - x0) * 0.22, pz = cz + (z1 - z0) * 0.22;
    M.glass.box(px, CURB - 0.05, pz, 14, 0.1, 10, 0x4a7a9a);
    addSolid(px - 7, pz - 5, px + 7, pz + 5, 0.6, 'pond');
  }
  for (let n = 0; n < (plaza ? 8 : 26); n++) {
    const x = cr.range(x0 + 2, x1 - 2), z = cr.range(z0 + 2, z1 - 2);
    if (Math.abs(x - cx) < 3 || Math.abs(z - cz) < 3 || insideSolid(x, z, 1.5)) continue;
    CITY.trees.push({ x, z, s: cr.range(0.9, 1.5), type: cr.int(0, 2) });
  }
  // benches
  for (const [bx, bz, r] of [[cx + 5, cz - 3, 0], [cx - 5, cz + 3, 0], [cx - 3, cz - 6, 1], [cx + 3, cz + 6, 1]]) {
    if (r) M.solid.box(bx, CURB + 0.4, bz, 0.5, 0.1, 1.8, 0x7a5a3a); else M.solid.box(bx, CURB + 0.4, bz, 1.8, 0.1, 0.5, 0x7a5a3a);
  }
  b.parkSpots = [];
  for (let n = 0; n < 4; n++) {
    const x = cx + cr.range(-12, 12), z = cz + cr.range(-12, 12);
    if (insideSolid(x, z, 2)) continue;
    const f = frontFace(b, x - 0.1, z - 0.1, x + 0.1, z + 0.1);
    addPlace(b, 'park', x, z, f.nx, f.nz, { floors: 0, access: 'ground', outdoor: true, parkName: b.kind === 'plaza' ? 'Civic Plaza' : ['Linden Park', 'Orchard Green', 'Founders Park', 'Wharf Park', 'Eastgate Commons'][(b.bi + b.bj) % 5] });
  }
}
function buildGas(b, M, cr) {
  const { x0, x1, z0, z1 } = b;
  paved(M, x0, z0, x1, z1);
  towerBox(M, 'shop', x0 + 4, z0 + 4, x0 + 22, z0 + 16, 4.5, 0xf0ece4, 3, 4.5, 0x6a6a6a);
  addPlace(b, 'shop', x0 + 13, z0 + 17.8, 0, 1, { floors: 1, access: 'ground', storeName: 'Gas & Go' });
  const cx = (x0 + x1) / 2 + 6, cz = (z0 + z1) / 2 + 6;
  M.solid.box(cx, CURB + 5, cz, 22, 0.8, 14, 0xe8e8e8); M.solid.box(cx, CURB + 5.5, cz, 22.2, 0.5, 14.2, 0xc82a2a);
  for (const [px, pz] of [[-9, -5], [9, -5], [-9, 5], [9, 5]]) { M.solid.box(cx + px, CURB, cz + pz, 0.5, 5, 0.5, 0xd8d8d8); addPost(cx + px, cz + pz, 0.4, 5); }
  for (const px of [-4, 4]) for (const pz of [-2.5, 2.5]) { M.solid.box(cx + px, CURB, cz + pz, 0.9, 1.6, 0.6, 0x3a3a40); addSolid(cx + px - 0.5, cz + pz - 0.35, cx + px + 0.5, cz + pz + 0.35, 1.6); }
}
function buildStation(b, M, cr) {
  const { x0, x1, z0, z1 } = b;
  lawn(M, b, x0, z0, x1, z1);
  // apron to the avenue on the south side
  const bx0 = b.cx - 15, bx1 = b.cx + 15, bz1 = z1 - 14, bz0 = bz1 - 18;
  paved(M, bx0 - 2, bz1, bx1 + 2, b.sz1);
  towerBox(M, 'brick', bx0, bz0, bx1, bz1, 8.5, 0xb05a48, 4, 4.25, 0x5a5a5a);
  for (const dx of [-7, 7]) { M.solid.box(b.cx + dx, CURB, bz1 + 0.06, 5.2, 5.2, 0.12, 0xd8d8d8); for (let y = 0.6; y < 5; y += 0.65) M.solid.box(b.cx + dx, CURB + y, bz1 + 0.14, 5.2, 0.05, 0.05, 0x9a9a9a); }
  M.solid.box(b.cx, CURB + 6.2, bz1 + 0.1, 12, 1.4, 0.2, 0x1a2040);
  sign(b.cx, CURB + 6.9, bz1 + 0.22, 0, 'STATION 12', 11.5, 1.2, '#ffffff', '#1a2040');
  // flag pole
  M.solid.box(bx1 + 4, CURB, bz1 + 6, 0.15, 9, 0.15, 0xd0d0d0);
  M.solid.box(bx1 + 4.9, CURB + 7.6, bz1 + 6, 1.6, 1.0, 0.04, 0x2a4ac0);
  addPost(bx1 + 4, bz1 + 6, 0.3, 9);
  // the rig waits on the apron side-on to the doors, so the chase camera has room behind it
  CITY.station = { x: b.cx - 4, z: bz1 + 8.5, yaw: Math.PI / 2, door: { x: b.cx, z: bz1 + 1 }, bayX: b.cx - 7, bayZ: bz1 + 6, block: b, addr: '900 Lincoln Ave' };
  CITY.trees.push({ x: x0 + 6, z: z1 - 6, s: 1.2, type: 1 }, { x: x1 - 6, z: z1 - 6, s: 1.2, type: 1 }, { x: x0 + 8, z: z0 + 8, s: 1.3, type: 0 });
}
function buildHospital(b, M, cr, id) {
  const H = HOSPITALS[id];
  const { x0, x1, z0, z1 } = b;
  paved(M, x0, z0, x1, z1);
  // the face with the ambulance bay: south for St. Brigid and Harbor General, west for Mercy
  const face = id === 'mercy' ? 'W' : id === 'brigid' ? 'N' : 'S';
  let hx0 = x0 + 6, hx1 = x1 - 6, hz0 = z0 + 6, hz1 = z1 - 6;
  if (face === 'S') hz1 = z1 - 20; else if (face === 'N') hz0 = z0 + 20; else hx0 = x0 + 20;
  const h = id === 'general' ? 34 : id === 'mercy' ? 26 : 16;
  towerBox(M, 'office', hx0, hz0, hx1, hz1, h, H.color, 3, 3.6, 0x8a8a8a);
  // a tall wing
  const wx0 = (hx0 + hx1) / 2 - 8, wz0 = (hz0 + hz1) / 2 - 8;
  facadeBox(M.apt, M.roof, wx0, wz0, wx0 + 16, wz0 + 16, CURB + h, CURB + h + (id === 'general' ? 22 : 12), 0xe8ecf0, 0x7a7a7a, 3, 3.6);
  // helipad on Harbor General
  if (id === 'general') { M.solid.box(wx0 + 8, CURB + h + 22, wz0 + 8, 13, 0.3, 13, 0x5a5a5a); M.mark.flat(wx0 + 8, CURB + h + 22.3, wz0 + 8, 1, 0.02, 6, 0xffffff); M.mark.flat(wx0 + 6, CURB + h + 22.3, wz0 + 8, 1, 0.02, 6, 0xffffff); M.mark.flat(wx0 + 10, CURB + h + 22.3, wz0 + 8, 1, 0.02, 6, 0xffffff); M.mark.flat(wx0 + 8, CURB + h + 22.3, wz0 + 8, 4, 0.02, 1, 0xffffff); }
  // canopy over the bay, ER doors, the sign
  let bay, door, nx = 0, nz = 0, cx, cz;
  if (face === 'S') { nz = 1; cx = (hx0 + hx1) / 2 + 6; cz = hz1; bay = { x: cx, z: hz1 + 7, yaw: 0 }; }
  else if (face === 'N') { nz = -1; cx = (hx0 + hx1) / 2 - 6; cz = hz0; bay = { x: cx, z: hz0 - 7, yaw: Math.PI }; }
  else { nx = -1; cx = hx0; cz = (hz0 + hz1) / 2 + 6; bay = { x: hx0 - 7, z: cz, yaw: -Math.PI / 2 }; }
  // bay.yaw points the rig's nose away from the doors, so its back doors open toward them
  door = { x: cx + nx * 1.5, z: cz + nz * 1.5 };
  const cw = 14, cd = 12;
  if (nz) {
    M.solid.box(cx, CURB + 4.6, cz + nz * cd / 2, cw, 0.5, cd, 0xd8dce0); M.solid.box(cx, CURB + 5.1, cz + nz * cd / 2, cw + 0.2, 0.3, cd + 0.2, 0xc82a2a);
    for (const px of [-cw / 2 + 0.4, cw / 2 - 0.4]) { M.solid.box(cx + px, CURB, cz + nz * (cd - 0.5), 0.5, 4.6, 0.5, 0xd8d8d8); addPost(cx + px, cz + nz * (cd - 0.5), 0.4, 4.6); }
    M.glass.box(cx, CURB, cz + nz * 0.06, 5, 3, 0.12, 0xa0c0d8);
    for (let k = -1; k <= 1; k++) M.mark.flat(cx + k * 4.2, CURB + 0.008, cz + nz * 7, 0.18, 0.012, 9, 0xe8d040);
    sign(cx, CURB + 5.9, cz + nz * (cd + 0.12), nz > 0 ? 0 : Math.PI, 'EMERGENCY', 10, 1.2, '#ffffff', '#c82a2a');
  } else {
    M.solid.box(cx + nx * cd / 2, CURB + 4.6, cz, cd, 0.5, cw, 0xd8dce0); M.solid.box(cx + nx * cd / 2, CURB + 5.1, cz, cd + 0.2, 0.3, cw + 0.2, 0xc82a2a);
    for (const pz of [-cw / 2 + 0.4, cw / 2 - 0.4]) { M.solid.box(cx + nx * (cd - 0.5), CURB, cz + pz, 0.5, 4.6, 0.5, 0xd8d8d8); addPost(cx + nx * (cd - 0.5), cz + pz, 0.4, 4.6); }
    M.glass.box(cx + nx * 0.06, CURB, cz, 0.12, 3, 5, 0xa0c0d8);
    for (let k = -1; k <= 1; k++) M.mark.flat(cx + nx * 7, CURB + 0.008, cz + k * 4.2, 9, 0.012, 0.18, 0xe8d040);
    sign(cx + nx * (cd + 0.12), CURB + 5.9, cz, -Math.PI / 2, 'EMERGENCY', 10, 1.2, '#ffffff', '#c82a2a');
  }
  // the hospital's name high on the main building
  const nf = frontFace(b, hx0, hz0, hx1, hz1);
  sign(nf.x + nf.nx * 0.15, CURB + h - 3, nf.z + nf.nz * 0.15, Math.atan2(nf.nx, nf.nz), H.short.toUpperCase(), Math.min(22, H.short.length * 1.6), 2.2, '#c82a2a', 'rgba(255,255,255,0.0)');
  // a red cross
  CITY.hospitals[id] = { id, bay, door, face, block: b, x: b.cx, z: b.cz, name: H.name, short: H.short };
  for (let n = 0; n < 6; n++) { const x = cr.range(x0 + 2, x1 - 2), z = cr.range(z0 + 2, z1 - 2); if (!insideSolid(x, z, 3) && dist(x, z, bay.x, bay.z) > 14) CITY.trees.push({ x, z, s: cr.range(0.7, 1), type: 1 }); }
}

// a flat text sign (canvas texture on a plane) facing yaw
const SIGN_CACHE = {};
function sign(x, y, z, yaw, text, w, h, fg, bg) {
  const key = text + fg + bg;
  let t = SIGN_CACHE[key];
  if (!t) {
    t = SIGN_CACHE[key] = canvasTex(512, Math.round(512 * h / w), (g, W, Hh) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
      g.fillStyle = fg; g.font = `800 ${Math.round(Hh * 0.72)}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, W / 2, Hh * 0.55, W * 0.96);
    }, { clamp: true });
  }
  const m = new THREE.Mesh(GM.planeV(), new THREE.MeshLambertMaterial({ map: t, transparent: true, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 }));
  m.position.set(x, y, z); m.rotation.y = yaw; m.scale.set(w, h, 1);
  R.scene.add(m);
  return m;
}

function buildLamps(M, cr) {
  // street lamps along the curb on both sides of each edge, every ~34 m
  const pts = [];
  for (const e of CITY.edges) {
    const A = CITY.nodes[e.a], B = CITY.nodes[e.b];
    for (const side of [-1, 1]) {
      for (let t = 18; t < CP - 12; t += 34) {
        let x, z, ox, oz;
        if (e.axis === 'x') { x = A.x + t; z = A.z + side * (e.half + 0.6); ox = 0; oz = -side; }
        else { z = A.z + t; x = A.x + side * (e.half + 0.6); ox = -side; oz = 0; }
        pts.push({ x, z, ox, oz });
      }
    }
  }
  for (const p of pts) {
    M.solid.box(p.x, CURB, p.z, 0.18, 7.2, 0.18, 0x4a4e54);
    M.solid.box(p.x + p.ox * 1.0, CURB + 7.1, p.z + p.oz * 1.0, p.ox ? 2.2 : 0.16, 0.14, p.oz ? 2.2 : 0.16, 0x4a4e54);
    M.lampHead.box(p.x + p.ox * 1.9, CURB + 6.9, p.z + p.oz * 1.9, p.ox ? 0.9 : 0.4, 0.2, p.oz ? 0.9 : 0.4, 0xffffff);
    addPost(p.x, p.z, 0.2, 7);
    CITY.lamps.push({ x: p.x + p.ox * 1.9, z: p.z + p.oz * 1.9 });
  }
  // ground glow decals, one instanced draw
  const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const im = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0xffd8a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), CITY.lamps.length);
  const m4 = new THREE.Matrix4();
  CITY.lamps.forEach((l, i) => { m4.makeScale(13, 1, 13); m4.setPosition(l.x, 0.06, l.z); im.setMatrixAt(i, m4); });
  im.renderOrder = 2; im.frustumCulled = false;
  R.scene.add(im); CITY.lampGlow = im;
}

function buildSignals(M) {
  // a pole on each corner of a signalled intersection with one head facing the approach on its right
  const heads = [];
  for (const n of CITY.nodes) {
    if (!n.signal) continue;
    const hx = halfOf(n.i), hz = halfOf(n.j);
    // approach from the west (eastbound) is controlled by the x-phase; its head sits on the far-right corner (NE?)
    const corners = [
      { x: n.x + hx + 1, z: n.z + hz + 1, face: Math.PI / 2 + Math.PI, axis: 'x', dir: 1 },   // SE corner faces westward traffic? see note
      { x: n.x - hx - 1, z: n.z - hz - 1, face: Math.PI / 2, axis: 'x', dir: -1 },
      { x: n.x - hx - 1, z: n.z + hz + 1, face: Math.PI, axis: 'z', dir: -1 },
      { x: n.x + hx + 1, z: n.z - hz - 1, face: 0, axis: 'z', dir: 1 },
    ];
    for (const c of corners) {
      if (c.x < -2 || c.z < -2 || c.x > CW + 2 || c.z > CW + 2) continue;
      M.solid.box(c.x, CURB, c.z, 0.22, 5.6, 0.22, 0x3a3e44);
      addPost(c.x, c.z, 0.25, 5);
      heads.push({ x: c.x, z: c.z, yaw: c.face, node: n, axis: c.axis });
    }
  }
  // lamp instances: three per head (red, amber, green), coloured on/off each tick
  const lampG = new THREE.BoxGeometry(0.34, 0.34, 0.12);
  const bodyG = new THREE.BoxGeometry(0.5, 1.3, 0.35);
  const body = new THREE.InstancedMesh(bodyG, new THREE.MeshLambertMaterial({ color: 0x2a2c30 }), heads.length);
  const lamps = new THREE.InstancedMesh(lampG, new THREE.MeshBasicMaterial({ color: 0xffffff }), heads.length * 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(1, 1, 1), p = new V3();
  heads.forEach((h, i) => {
    q.setFromAxisAngle(_up, h.yaw);
    p.set(h.x, CURB + 5.2, h.z); m4.compose(p, q, s); body.setMatrixAt(i, m4);
    for (let k = 0; k < 3; k++) {
      const off = new V3(0, 0.4 - k * 0.4, 0.2).applyQuaternion(q);
      p.set(h.x + off.x, CURB + 5.2 + off.y, h.z + off.z); m4.compose(p, q, s); lamps.setMatrixAt(i * 3 + k, m4);
      lamps.setColorAt(i * 3 + k, new THREE.Color(0x222222));
    }
  });
  R.scene.add(body, lamps);
  CITY.signalHeads = heads; CITY.signalLamps = lamps;
}
// signal state for traffic on an axis at a node: 'g', 'y' or 'r'
const SIG_PERIOD = 26;
function signalState(n, axis, t) {
  if (!n.signal) return 'g';
  const p = (t + n.off) % SIG_PERIOD;
  if (axis === 'x') return p < 10 ? 'g' : p < 13 ? 'y' : 'r';
  return p < 13 ? 'r' : p < 23 ? 'g' : p < 26 ? 'y' : 'r';
}
const _sigCols = { g: [new THREE.Color(0x103010), new THREE.Color(0x40ff70)], y: [new THREE.Color(0x302808), new THREE.Color(0xffc030)], r: [new THREE.Color(0x300c0c), new THREE.Color(0xff3030)] };
function updateSignalLamps(t) {
  const L = CITY.signalLamps; if (!L) return;
  CITY.signalHeads.forEach((h, i) => {
    const st = signalState(h.node, h.axis, t);
    L.setColorAt(i * 3, _sigCols.r[st === 'r' ? 1 : 0]); L.setColorAt(i * 3 + 1, _sigCols.y[st === 'y' ? 1 : 0]); L.setColorAt(i * 3 + 2, _sigCols.g[st === 'g' ? 1 : 0]);
  });
  L.instanceColor.needsUpdate = true;
}

function buildTrees(cr) {
  const T = CITY.trees;
  for (const t of T) addPost(t.x, t.z, 0.35 * t.s, 4);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1, 6).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x5a4030 }), T.length);
  const crownG = [new THREE.IcosahedronGeometry(1, 1), new THREE.DodecahedronGeometry(1, 0), new THREE.ConeGeometry(1, 2.2, 7)];
  const crowns = crownG.map((g, k) => new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), T.filter((t) => t.type === k).length));
  const cnt = [0, 0, 0];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(), p = new V3(), c = new THREE.Color();
  T.forEach((t, i) => {
    const h = 2.4 * t.s;
    m4.compose(p.set(t.x, CURB, t.z), q.identity(), s.set(t.s, h, t.s)); trunk.setMatrixAt(i, m4);
    const k = t.type, r = (k === 2 ? 1.6 : 2.2) * t.s;
    q.setFromAxisAngle(_up, hash2(t.x, t.z) * TAU);
    m4.compose(p.set(t.x, CURB + h + r * (k === 2 ? 0.9 : 0.6), t.z), q, s.set(r, r * (k === 2 ? 1 : 0.85), r));
    crowns[k].setMatrixAt(cnt[k], m4);
    c.setHSL(0.22 + hash2(t.x, t.z, 3) * 0.1, 0.45, 0.28 + hash2(t.x, t.z, 5) * 0.12);
    crowns[k].setColorAt(cnt[k], c);
    cnt[k]++;
  });
  trunk.castShadow = true;
  R.scene.add(trunk);
  for (const cm of crowns) { cm.castShadow = true; cm.receiveShadow = true; if (cm.instanceColor) cm.instanceColor.needsUpdate = true; R.scene.add(cm); }
}

function buildOutskirts(M) {
  // grass all round, the harbour water to the north-west, a pier with cranes along it
  // subdivided: two 3 km triangles lose depth precision close to the camera and show through the roads
  const g = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 60, 60).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: TEX.grass, color: 0xd8e8c8 }));
  TEX.grass.repeat.set(1, 1);
  g.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 120; });
  g.position.set(CW / 2, -0.08, CW / 2); g.receiveShadow = true; R.scene.add(g);
  // the harbour: west of the pier, north of the middle of the city
  const w = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1300, 28, 26).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: TEX.water, color: 0xffffff }));
  w.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 40; });
  w.position.set(-30 - 700, -0.005, CW / 2 - 650); R.scene.add(w);
  CITY.water = w;
  // pier along the west side of the north half
  M.walk.quad([-30, CURB, CW / 2], [-9, CURB, CW / 2], [-9, CURB, -40], [-30, CURB, -40], [0, 0, 4, 0, 4, 100, 0, 100], 0xc8c4bc, [0, 1, 0]);
  M.walk.quad([-30, -0.6, -40], [-30, -0.6, CW / 2], [-30, CURB, CW / 2], [-30, CURB, -40], [0, 0, 100, 0, 100, 0.2, 0, 0.2], 0xa8a49c, [-1, 0, 0]);
  addSolid(-1000, -1000, -31, CW / 2, 2, 'water');
  for (let z = 30; z < CW / 2 - 20; z += 90) {
    // a container crane
    const x = -22;
    for (const dz of [-4, 4]) for (const dx of [-5, 5]) { M.solid.box(x + dx, CURB, z + dz, 0.8, 22, 0.8, 0xd06a20); addPost(x + dx, z + dz, 0.6, 22); }
    M.solid.box(x - 6, CURB + 22, z, 34, 1.6, 2.4, 0xd06a20); M.solid.box(x + 2, CURB + 23.6, z, 6, 4, 5, 0xe8e8e0);
    for (let k = 0; k < 3; k++) M.solid.box(x + 3, CURB, z + 14 + k * 2.6, 6.1, 2.6, 2.4, [0xc84a3a, 0x3a6ab0, 0x3a9a5a][k]);
  }
  // beltway guard rails
}

// The nearest point on the road network to (x, z): { edge, t (0..1 from node a), dir (+1 a→b, -1 b→a) suggested by yaw }
function nearestEdge(x, z, yaw) {
  let best = null, bd = 1e9;
  for (const e of CITY.edges) {
    const A = CITY.nodes[e.a], B = CITY.nodes[e.b];
    let t, d;
    if (e.axis === 'x') { t = clamp((x - A.x) / CP, 0, 1); d = Math.hypot(x - (A.x + t * CP), z - A.z); }
    else { t = clamp((z - A.z) / CP, 0, 1); d = Math.hypot(x - A.x, z - (A.z + t * CP)); }
    if (d < bd) { bd = d; best = { edge: e, t, d }; }
  }
  if (best && yaw !== undefined) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    best.dir = (best.edge.axis === 'x' ? fx : fz) >= 0 ? 1 : -1;
  }
  return best;
}
