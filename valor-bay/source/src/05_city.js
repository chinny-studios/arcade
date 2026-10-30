// Valor Bay — the city: a 12 × 12 grid of blocks on a square island (downtown towers in the middle, Valor Tower,
// a plaza with a statue, Liberty Park, brownstones toward the edges, the docks with a freighter in the south),
// its ground, props, the collision boxes and their grid, ray casts, the road graph for traffic and the sidewalk
// graph for people, and the top-down map image

const CITY = {
  N: 12, PITCH: 64, HALF: 384, EDGE: 400, WATER_Y: -1.2, ROAD: 5, WALK: 8,
  boxes: [], grid: new Map(), cell: 32, stamp: 0,
  nodes: [], walk: [], shops: [], lots: [], piers: [], lamps: [], parks: [], map: null, landmarks: [],
};
const L = (i) => -CITY.HALF + i * CITY.PITCH;
const PARK = { i0: 3, i1: 5, j0: 6, j1: 8 }; // blocks 3..4 × 6..7, road lines 3..5 × 6..8
const inParkCell = (i, j) => i >= PARK.i0 && i < PARK.i1 && j >= PARK.j0 && j < PARK.j1;
const TOWER = { i: 6, j: 5 }, PLAZA = { i: 5, j: 6 };
const isDockCell = (i, j) => j === 11 && i >= 6;

function districtOf(x, z) {
  if (x > L(PARK.i0) && x < L(PARK.i1) && z > L(PARK.j0) && z < L(PARK.j1)) return 'Liberty Park';
  if (z > L(11) && x > L(6) - 8) return 'Dockside';
  if (Math.max(Math.abs(x), Math.abs(z)) < 140) return 'Downtown';
  if (x < 0 && z < 0) return 'Ironhill';
  if (x >= 0 && z < 0) return 'Northshore';
  if (x < 0) return 'Old Town';
  return 'Southside';
}
const onLand = (x, z) => (Math.abs(x) <= CITY.EDGE && Math.abs(z) <= CITY.EDGE) || CITY.piers.some((p) => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1);

// ---------- collision boxes and their grid ----------
function addBox(x0, y0, z0, x1, y1, z1, kind = 'bld') {
  const b = { x0: Math.min(x0, x1), y0, z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1, z1: Math.max(z0, z1), kind, id: CITY.boxes.length, s: 0 };
  CITY.boxes.push(b);
  const c = CITY.cell;
  for (let ix = Math.floor(b.x0 / c); ix <= Math.floor(b.x1 / c); ix++) for (let iz = Math.floor(b.z0 / c); iz <= Math.floor(b.z1 / c); iz++) {
    const k = ix * 4096 + iz; let a = CITY.grid.get(k); if (!a) CITY.grid.set(k, a = []); a.push(b);
  }
  return b;
}
// every box overlapping the rectangle, each once
function queryBoxes(x0, z0, x1, z1, out = []) {
  out.length = 0;
  const c = CITY.cell, st = ++CITY.stamp;
  for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++) for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
    const a = CITY.grid.get(ix * 4096 + iz); if (!a) continue;
    for (const b of a) if (b.s !== st) { b.s = st; if (b.x1 >= x0 && b.x0 <= x1 && b.z1 >= z0 && b.z0 <= z1) out.push(b); }
  }
  return out;
}
const _qb = [];
// the floor under (x, z) for something whose feet are at y: the highest box top no more than `step` above y, or the ground
function groundY(x, z) { return onLand(x, z) ? 0 : -60; }
function supportY(x, z, y, r = 0.3, step = 0.7) {
  let best = groundY(x, z);
  for (const b of queryBoxes(x - r, z - r, x + r, z + r, _qb)) if (b.y1 <= y + step && b.y1 > best && x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) best = b.y1;
  return best;
}
// push a vertical cylinder (feet at e.y, height h) out of the boxes; returns the wall it touched last (or null)
const _hit = { nx: 0, nz: 0, box: null };
function collide(e, r, h, step = 0.7) {
  let touched = null;
  for (const b of queryBoxes(e.x - r, e.z - r, e.x + r, e.z + r, _qb)) {
    if (e.y >= b.y1 - 0.02 || e.y + h <= b.y0) continue;
    if (b.y1 - e.y <= step && e.onGround) { e.y = b.y1; continue; }
    const cx = clamp(e.x, b.x0, b.x1), cz = clamp(e.z, b.z0, b.z1);
    let dx = e.x - cx, dz = e.z - cz, d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d < 1e-4) {
      // inside: leave by the nearest side
      const pl = e.x - b.x0, pr = b.x1 - e.x, pb = e.z - b.z0, pf = b.z1 - e.z, m = Math.min(pl, pr, pb, pf);
      if (m === pl) { dx = -1; dz = 0; e.x = b.x0 - r; } else if (m === pr) { dx = 1; dz = 0; e.x = b.x1 + r; } else if (m === pb) { dx = 0; dz = -1; e.z = b.z0 - r; } else { dx = 0; dz = 1; e.z = b.z1 + r; }
      d = 1;
    } else { e.x = cx + dx / d * r; e.z = cz + dz / d * r; }
    _hit.nx = dx / d; _hit.nz = dz / d; _hit.box = b; touched = _hit;
  }
  return touched;
}
// ray against the boxes (and the ground if `ground`): returns the distance along the unit direction, or Infinity
const RAY = { t: Infinity, nx: 0, ny: 0, nz: 0, box: null };
function raycast(ox, oy, oz, dx, dy, dz, maxd, ground = true) {
  RAY.t = Infinity; RAY.box = null;
  const st = ++CITY.stamp, c = CITY.cell, steps = Math.ceil(maxd / 8) + 1;
  const ix_ = 1 / (dx || 1e-9), iy_ = 1 / (dy || 1e-9), iz_ = 1 / (dz || 1e-9);
  for (let s = 0; s <= steps; s++) {
    const t = Math.min(maxd, s * 8);
    if (t > RAY.t + 16) break;
    const px = ox + dx * t, pz = oz + dz * t;
    const gx = Math.floor(px / c), gz = Math.floor(pz / c);
    for (let ax = gx - 1; ax <= gx + 1; ax++) for (let az = gz - 1; az <= gz + 1; az++) {
      const a = CITY.grid.get(ax * 4096 + az); if (!a) continue;
      for (const b of a) {
        if (b.s === st) continue; b.s = st;
        let t0 = ((dx >= 0 ? b.x0 : b.x1) - ox) * ix_, t1 = ((dx >= 0 ? b.x1 : b.x0) - ox) * ix_, n = 0;
        const ty0 = ((dy >= 0 ? b.y0 : b.y1) - oy) * iy_, ty1 = ((dy >= 0 ? b.y1 : b.y0) - oy) * iy_;
        if (ty0 > t0) { t0 = ty0; n = 1; } if (ty1 < t1) t1 = ty1;
        const tz0 = ((dz >= 0 ? b.z0 : b.z1) - oz) * iz_, tz1 = ((dz >= 0 ? b.z1 : b.z0) - oz) * iz_;
        if (tz0 > t0) { t0 = tz0; n = 2; } if (tz1 < t1) t1 = tz1;
        if (t0 <= t1 && t1 >= 0 && t0 < RAY.t && t0 <= maxd) {
          RAY.t = Math.max(0, t0); RAY.box = b;
          RAY.nx = n === 0 ? -Math.sign(dx) : 0; RAY.ny = n === 1 ? -Math.sign(dy) : 0; RAY.nz = n === 2 ? -Math.sign(dz) : 0;
        }
      }
    }
  }
  if (ground && dy < 0) {
    const tg = (0 - oy) / dy;
    if (tg >= 0 && tg < RAY.t && tg <= maxd && onLand(ox + dx * tg, oz + dz * tg)) { RAY.t = tg; RAY.box = null; RAY.nx = 0; RAY.ny = 1; RAY.nz = 0; }
  }
  return RAY.t;
}
function losClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz);
  if (d < 0.01) return true;
  return raycast(ax, ay, az, dx / d, dy / d, dz / d, d, false) >= d - 0.3;
}

// ---------- building ----------
const WALLS = [0xe8d8b8, 0xc85a4a, 0x5a9ac8, 0x7ac8b8, 0xe8b860, 0xd88a8a, 0xa8b8c8, 0x9a7ac8, 0x8ac87a, 0xf0ece4, 0x6a7a9a, 0xd8a070, 0x4a8a9a];
const TRIMS = [0x3a3a48, 0xf0ece4, 0x2a4a6a, 0x6a3a2a, 0x8a8a90];
const ROOFS = [0x5a5a62, 0x6a6460, 0x4a4e58, 0x7a7068];
const C = {
  asphalt: 0x4a4e58, walk: 0xc8c4bc, block: 0xa8a49c, grass: 0x6ac04a, path: 0xd8c8a0, prom: 0xc8a878, lot: 0x5a5e66,
  dash: 0xf0c020, white: 0xf4f4f4, dock: 0x8a8478, wood: 0x8a6a48,
};
const FLOOR = 3.6;
// chunked meshes so the frustum culls them: walls (city material), props (toon) and glowing bits
const CHUNK = 128;
function chunkOf(x, z) {
  const k = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
  let c = CITY.chunks.get(k);
  if (!c) CITY.chunks.set(k, c = { w: new Mesher(true), p: new Mesher(), g: new Mesher() });
  return c;
}
// a tier of a building: walls with windows, a cornice and a parapet, and its collision box
function tier(x0, z0, x1, z1, y0, y1, col, trim, roof, style, off, parapet = true) {
  const ch = chunkOf((x0 + x1) / 2, (z0 + z1) / 2), M = ch.w;
  const w = x1 - x0, d = z1 - z0, nx = Math.max(1, Math.round(w / 3.2)), nz = Math.max(1, Math.round(d / 3.2));
  M.win = style ? { style, x0, z0, cwx: w / nx, cwz: d / nz, ch: FLOOR, base: 0, off } : null;
  M.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, w, y1 - y0, d, col, 0, true, roof);
  M.win = null;
  ch.p.box((x0 + x1) / 2, y1 - 0.35, (z0 + z1) / 2, w + 0.5, 0.7, d + 0.5, trim);
  if (parapet) {
    const t = 0.35, h = 0.8, y = y1 + h / 2;
    ch.p.box((x0 + x1) / 2, y, z0 + t / 2, w, h, t, trim); ch.p.box((x0 + x1) / 2, y, z1 - t / 2, w, h, t, trim);
    ch.p.box(x0 + t / 2, y, (z0 + z1) / 2, t, h, d - 2 * t, trim); ch.p.box(x1 - t / 2, y, (z0 + z1) / 2, t, h, d - 2 * t, trim);
  }
  return addBox(x0, y0, z0, x1, y1, z1);
}
function roofProps(rnd, x0, z0, x1, z1, y, tall) {
  const ch = chunkOf((x0 + x1) / 2, (z0 + z1) / 2), P = ch.p;
  const w = x1 - x0, d = z1 - z0;
  // stair hut
  if (w > 10 && d > 10) {
    const hx = lerp(x0 + 3, x1 - 3, rnd()), hz = lerp(z0 + 3, z1 - 3, rnd());
    P.box(hx, y + 1.5, hz, 3, 3, 3.5, 0x9a948a, 0, true, 0x5a5a62); P.box(hx, y + 1.1, hz + 1.76, 1.1, 2.2, 0.05, 0x6a3a2a);
    addBox(hx - 1.5, y, hz - 1.75, hx + 1.5, y + 3, hz + 1.75, 'prop');
  }
  // air conditioners
  for (let i = 0, n = rnd.int(1, 4); i < n; i++) {
    const ax = lerp(x0 + 2, x1 - 2, rnd()), az = lerp(z0 + 2, z1 - 2, rnd());
    P.box(ax, y + 0.6, az, 2, 1.2, 1.4, 0xc8ccd4); P.geo(P_CYL(10), 0x404048, ax, y + 1.22, az, 0, 0, 0, 1.1, 0.05, 1.1);
  }
  // a wooden water tower on older buildings
  if (!tall && rnd() < 0.45 && w > 9 && d > 9) {
    const tx = lerp(x0 + 4, x1 - 4, rnd()), tz = lerp(z0 + 4, z1 - 4, rnd());
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.box(tx + a * 1.3, y + 2, tz + b * 1.3, 0.25, 4, 0.25, 0x4a3a30);
    P.geo(P_CYL(12), 0x8a5a38, tx, y + 5.6, tz, 0, 0, 0, 3.6, 3.2, 3.6); P.geo(P_CONE(12), 0x5a3a28, tx, y + 7.8, tz, 0, 0, 0, 3.9, 1.3, 3.9);
    addBox(tx - 1.8, y, tz - 1.8, tx + 1.8, y + 7.2, tz + 1.8, 'prop');
  }
  // antenna with a red light
  if (tall && rnd() < 0.6) {
    const ax = lerp(x0 + 2, x1 - 2, rnd()), az = lerp(z0 + 2, z1 - 2, rnd()), ah = rnd.range(6, 16);
    P.geo(P_CYL(6), 0xa0a0a8, ax, y + ah / 2, az, 0, 0, 0, 0.25, ah, 0.25);
    ch.g.geo(P_SPH(6, 4), 0xff3030, ax, y + ah, az, 0, 0, 0, 0.5, 0.5, 0.5);
  }
  // helipad
  if (tall && rnd() < 0.3 && w > 18 && d > 18) {
    const hx = (x0 + x1) / 2, hz = (z0 + z1) / 2;
    P.geo(P_CYL(20), 0x3a3a40, hx, y + 0.05, hz, 0, 0, 0, 13, 0.1, 13);
    P.box(hx - 1.6, y + 0.12, hz, 0.7, 0.04, 5, 0xf0d020); P.box(hx + 1.6, y + 0.12, hz, 0.7, 0.04, 5, 0xf0d020); P.box(hx, y + 0.12, hz, 3, 0.04, 0.7, 0xf0d020);
  }
}
// a billboard on a roof facing the street: frame and a bold two-colour board
function billboard(rnd, x, z, y, yaw) {
  const ch = chunkOf(x, z), P = ch.p, cols = [[0xff4a3a, 0xffe040], [0x3a8aff, 0xffffff], [0x3ac86a, 0xffe040], [0xc040e0, 0x40e0e0], [0xffa020, 0x2a2a40]];
  const [a, b] = rnd.pick(cols);
  for (const s of [-1, 1]) P.box(x + Math.cos(yaw) * s * 3.5, y + 2.5, z - Math.sin(yaw) * s * 3.5, 0.3, 5, 0.3, 0x5a5a62, yaw);
  P.box(x, y + 6.5, z, 10, 4, 0.3, a, yaw);
  const fx = Math.sin(yaw) * 0.2, fz = Math.cos(yaw) * 0.2;
  P.box(x + fx, y + 6.9, z + fz, 6, 1.2, 0.1, b, yaw); P.box(x + fx - Math.cos(yaw) * 2.6, y + 5.6, z + fz + Math.sin(yaw) * 2.6, 3, 0.7, 0.1, b, yaw);
  P.box(x + fx * 1.4 + Math.cos(yaw) * 3, y + 5.6, z + fz * 1.4 - Math.sin(yaw) * 3, 1.4, 1.4, 0.1, 0xffffff, yaw);
}
// one building on a lot: tiers stepping back as it rises
function building(rnd, x0, z0, x1, z1, h, dn) {
  const col = rnd.pick(WALLS), trim = rnd.pick(TRIMS), roof = rnd.pick(ROOFS);
  const style = dn < 0.35 ? rnd.pick([3, 2, 1, 4, 2, 1]) : dn < 0.7 ? rnd.pick([1, 2, 4, 1, 3]) : rnd.pick([1, 1, 4]);
  const off = rnd.int(0, 400);
  const floors = Math.max(2, Math.round(h / FLOOR));
  let top = floors * FLOOR + 0.4;
  let tiers = top > 70 ? rnd.int(1, 3) : top > 35 && rnd() < 0.4 ? 1 : 0;
  let y = 0, ax0 = x0, az0 = z0, ax1 = x1, az1 = z1;
  const parts = [];
  for (let t = 0; t <= tiers; t++) {
    const yTop = t === tiers ? top : Math.round(lerp(y, top, rnd.range(0.45, 0.7)) / FLOOR) * FLOOR + 0.4;
    const b = tier(ax0, az0, ax1, az1, y, yTop, col, trim, roof, style, off, t === tiers);
    parts.push(b);
    y = yTop;
    const ins = rnd.range(2.5, 5.5);
    if (ax1 - ax0 - 2 * ins < 10 || az1 - az0 - 2 * ins < 10) { top = y; break; }
    ax0 += ins; az0 += ins; ax1 -= ins; az1 -= ins;
  }
  const last = parts[parts.length - 1];
  roofProps(rnd, last.x0, last.z0, last.x1, last.z1, last.y1, last.y1 > 60);
  return parts;
}

// ---------- the build ----------
function buildCity() {
  CITY.chunks = new Map();
  const rnd = RNG(1971);
  const N = CITY.N;
  const G0 = new Mesher(), MK = new Mesher();
  const rect = (M, x0, z0, x1, z1, col, y = 0) => M.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], col);
  // ground of every block cell, split into non-overlapping strips: asphalt (0..5 m from the road centre), sidewalk
  // (5..8) and the block interior. Park cells turn their inner roads into lawn with a path where the sidewalk was.
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const a = L(i), b = L(i + 1), c = L(j), d = L(j + 1), park = inParkCell(i, j), dock = isDockCell(i, j);
    const sideInPark = (s) => park && ((s === 'w' && inParkCell(i - 1, j)) || (s === 'e' && inParkCell(i + 1, j)) || (s === 'n' && inParkCell(i, j - 1)) || (s === 's' && inParkCell(i, j + 1)));
    const R5 = CITY.ROAD, W8 = CITY.WALK;
    // corners belong to the intersections: asphalt square corners, sidewalk corners
    for (const [x0, x1, side] of [[a, a + R5, 'w'], [b - R5, b, 'e']]) rect(G0, x0, c + R5, x1, d - R5, sideInPark(side) ? C.grass : C.asphalt);
    for (const [z0, z1, side] of [[c, c + R5, 'n'], [d - R5, d, 's']]) rect(G0, a, z0, b, z1, sideInPark(side) ? C.grass : C.asphalt);
    for (const [x0, x1, side] of [[a + R5, a + W8, 'w'], [b - W8, b - R5, 'e']]) rect(G0, x0, c + W8, x1, d - W8, sideInPark(side) ? C.path : C.walk);
    for (const [z0, z1, side] of [[c + R5, c + W8, 'n'], [d - W8, d - R5, 's']]) rect(G0, a + R5, z0, b - R5, z1, sideInPark(side) ? C.path : C.walk);
    rect(G0, a + W8, c + W8, b - W8, d - W8, park ? C.grass : dock ? C.dock : C.block);
  }
  // the promenade around the island and the sea wall
  const H = CITY.HALF, E = CITY.EDGE;
  rect(G0, -E, -E, E, -H, C.prom); rect(G0, -E, H, E, E, C.prom); rect(G0, -E, -H, -H, H, C.prom); rect(G0, H, -H, E, H, C.prom);
  for (const [x0, z0, x1, z1] of [[-E, -E, E, -E], [E, -E, E, E], [E, E, -E, E], [-E, E, -E, -E]]) {
    G0.quad([x0, -4, z0], [x1, -4, z1], [x1, 0, z1], [x0, 0, z0], 0x8a8a90);
  }
  // road markings: dashed centre lines and zebra crossings (drawn with a polygon offset over the asphalt)
  const roadOK = (i, j, di, dj) => {
    const i2 = i + di, j2 = j + dj;
    if (i2 < 0 || j2 < 0 || i2 > N || j2 > N) return false;
    // a road segment is gone when it runs between two park cells
    if (di) return !(inParkCell(Math.min(i, i2), j - 1) && inParkCell(Math.min(i, i2), j));
    return !(inParkCell(i - 1, Math.min(j, j2)) && inParkCell(i, Math.min(j, j2)));
  };
  CITY.roadOK = roadOK;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = L(i), z = L(j);
    if (roadOK(i, j, 1, 0)) for (let s = x + 10; s < L(i + 1) - 10; s += 6) rect(MK, s, z - 0.12, s + 3, z + 0.12, C.dash);
    if (roadOK(i, j, 0, 1)) for (let s = z + 10; s < L(j + 1) - 10; s += 6) rect(MK, x - 0.12, s, x + 0.12, s + 3, C.dash);
    // crossings on each arm of the intersection that has a road
    const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([di, dj]) => roadOK(i, j, di, dj));
    if (arms.length < 2) continue;
    for (const [di, dj] of arms) for (let k = -4.2; k <= 4.2; k += 1.4) {
      if (di) rect(MK, x + di * 5.6 - 0.9 + (di < 0 ? 0 : 0), z + k - 0.45, x + di * 5.6 + 0.9, z + k + 0.45, C.white);
      else rect(MK, x + k - 0.45, z + dj * 5.6 - 0.9, x + k + 0.45, z + dj * 5.6 + 0.9, C.white);
    }
  }
  const ground = new THREE.Mesh(G0.build(), MATS.vc); ground.matrixAutoUpdate = false; R.scene.add(ground);
  const mkMat = MATS.vc.clone(); mkMat.polygonOffset = true; mkMat.polygonOffsetFactor = -2; mkMat.polygonOffsetUnits = -4;
  const marks = new Mesh2(MK.build(), mkMat); R.scene.add(marks);
  // water
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), MATS.water);
  water.rotation.x = -Math.PI / 2; water.position.y = CITY.WATER_Y; R.scene.add(water);
  CITY.water = water;

  // ---------- blocks ----------
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = L(i) + CITY.WALK, z0 = L(j) + CITY.WALK, x1 = L(i + 1) - CITY.WALK, z1 = L(j + 1) - CITY.WALK;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, dn = Math.max(Math.abs(cx), Math.abs(cz)) / CITY.HALF;
    if (inParkCell(i, j)) continue;
    if (i === TOWER.i && j === TOWER.j) { valorTower(x0, z0, x1, z1); continue; }
    if (i === PLAZA.i && j === PLAZA.j) { plaza(rnd, x0, z0, x1, z1); continue; }
    if (isDockCell(i, j)) { docks(rnd, x0, z0, x1, z1, i); continue; }
    // a few parking lots break up the outer blocks
    if (dn > 0.5 && rnd() < 0.07) { parkingLot(rnd, x0, z0, x1, z1); continue; }
    // lots: downtown blocks hold one to four towers; further out, rows of narrower buildings
    const lots = [];
    const split = (ax0, az0, ax1, az1, depth) => {
      const w = ax1 - ax0, d = az1 - az0;
      const want = dn < 0.35 ? 0.5 : dn < 0.7 ? 0.7 : 0.9;
      if (depth < 3 && (w > 20 || d > 20) && rnd() < want) {
        const gap = rnd() < 0.5 ? 0 : 2;
        if (w >= d) { const m = ax0 + w * rnd.range(0.38, 0.62); split(ax0, az0, m - gap / 2, az1, depth + 1); split(m + gap / 2, az0, ax1, az1, depth + 1); }
        else { const m = az0 + d * rnd.range(0.38, 0.62); split(ax0, az0, ax1, m - gap / 2, depth + 1); split(ax0, m + gap / 2, ax1, az1, depth + 1); }
      } else lots.push([ax0, az0, ax1, az1]);
    };
    split(x0, z0, x1, z1, 0);
    for (const [a0, b0, a1, b1] of lots) {
      const base = dn < 0.35 ? lerp(150, 70, dn / 0.35) : dn < 0.7 ? lerp(70, 30, (dn - 0.35) / 0.35) : lerp(34, 16, (dn - 0.7) / 0.3);
      const h = Math.max(8, base * rnd.range(0.55, 1.35));
      const parts = building(rnd, a0, b0, a1, b1, h, dn);
      CITY.lots.push({ x0: a0, z0: b0, x1: a1, z1: b1, h: parts[parts.length - 1].y1 });
      // shopfronts face the sidewalk where the lot touches the block edge
      for (const [fx, fz, yaw, on] of [[(a0 + a1) / 2, b0 - 0.5, 0, Math.abs(b0 - z0) < 0.5], [(a0 + a1) / 2, b1 + 0.5, Math.PI, Math.abs(b1 - z1) < 0.5], [a0 - 0.5, (b0 + b1) / 2, Math.PI / 2, Math.abs(a0 - x0) < 0.5], [a1 + 0.5, (b0 + b1) / 2, -Math.PI / 2, Math.abs(a1 - x1) < 0.5]]) {
        if (on) CITY.shops.push({ x: fx, z: fz, yaw, d: districtOf(fx, fz) });
      }
      if (parts[parts.length - 1].y1 > 18 && parts[parts.length - 1].y1 < 60 && rnd() < 0.18) {
        const t = parts[parts.length - 1], onX = rnd() < 0.5;
        billboard(rnd, onX ? (t.x0 + t.x1) / 2 : t.x0 + 1.5, onX ? t.z0 + 1.5 : (t.z0 + t.z1) / 2, t.y1, onX ? 0 : Math.PI / 2);
      }
    }
  }
  liberty(rnd);
  freighter();
  streetProps(rnd);
  // turn the chunk meshers into meshes
  for (const ch of CITY.chunks.values()) {
    if (!ch.w.empty) R.scene.add(new Mesh2(ch.w.build(), MATS.city));
    if (!ch.p.empty) R.scene.add(new Mesh2(ch.p.build(), MATS.vc));
    if (!ch.g.empty) R.scene.add(new Mesh2(ch.g.build(), MATS.glowLamp));
  }
  CITY.chunks = null;
  // pools of lamplight on the sidewalks at night: one instanced, additive disc per lamp
  const pm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.soft, color: 0xffc070, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }), CITY.lamps.length);
  const m4 = new THREE.Matrix4();
  CITY.lamps.forEach((l, i) => { m4.makeScale(9, 1, 9); m4.setPosition(l.x, 0.04, l.z); pm.setMatrixAt(i, m4); });
  pm.frustumCulled = false; pm.renderOrder = 2;
  R.scene.add(pm); CITY.pools = pm;
  buildGraphs();
  drawMap();
}
// a static mesh that never moves
class Mesh2 extends THREE.Mesh { constructor(g, m) { super(g, m); this.matrixAutoUpdate = false; this.updateMatrix(); } }

// Valor Tower: the tallest building in the city, headquarters of the heroes, with a glowing V near the top
function valorTower(x0, z0, x1, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  tier(x0 + 2, z0 + 2, x1 - 2, z1 - 2, 0, 18.4, 0xd8dce8, 0x2a3a5a, 0x5a5a62, 3, 11, false);
  tier(cx - 15, cz - 15, cx + 15, cz + 15, 18.4, 151.6, 0x6a8ac8, 0xe8ecf4, 0x5a5a62, 3, 47, false);
  tier(cx - 11, cz - 11, cx + 11, cz + 11, 151.6, 212.8, 0x6a8ac8, 0xe8ecf4, 0x5a5a62, 3, 91, false);
  const top = tier(cx - 7, cz - 7, cx + 7, cz + 7, 212.8, 241.6, 0xe8ecf4, 0xffc020, 0x3a3a48, 0, 0, true);
  const ch = chunkOf(cx, cz);
  ch.p.geo(P_CYL(8), 0xc0c4cc, cx, top.y1 + 30, cz, 0, 0, 0, 0.8, 60, 0.8);
  ch.g.geo(P_SPH(8, 6), 0xff3030, cx, top.y1 + 60, cz, 0, 0, 0, 1.4, 1.4, 1.4);
  // the gold V on all four faces
  for (let k = 0; k < 4; k++) {
    const yaw = k * Math.PI / 2, fx = Math.sin(yaw), fz = Math.cos(yaw), y = 226;
    for (const s of [-1, 1]) {
      const px = cx + fx * 7.1 + Math.cos(yaw) * s * 2.2, pz = cz + fz * 7.1 - Math.sin(yaw) * s * 2.2;
      ch.g.geo(new THREE.BoxGeometry(1.4, 11, 0.3), 0xffc020, px, y, pz, 0, yaw, s * 0.38);
    }
  }
  // a ring deck at the setback to land on
  ch.p.box(cx, 151.6 + 0.2, cz, 34, 0.4, 34, 0xe8ecf4);
  CITY.landmarks.push({ name: 'Valor Tower', x: cx, z: cz, y: top.y1 });
}
// the plaza: open paving, a fountain and a bronze hero statue
function plaza(rnd, x0, z0, x1, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ch = chunkOf(cx, cz), P = ch.p;
  P.geo(P_CYL(24), 0xb8a890, cx, 0.05, cz, 0, 0, 0, 40, 0.1, 40);
  P.geo(P_CYL(20), 0x9a968e, cx, 0.5, cz, 0, 0, 0, 14, 1, 14); P.geo(P_CYL(20), 0x4aa8e8, cx, 0.9, cz, 0, 0, 0, 13, 0.2, 13);
  P.box(cx, 2, cz, 3, 3, 3, 0x8a867e); addBox(cx - 7, 0, cz - 7, cx + 7, 1, cz + 7, 'prop'); addBox(cx - 1.5, 0, cz - 1.5, cx + 1.5, 3.5, cz + 1.5, 'prop');
  // the statue: a caped figure with a fist raised, on the plinth
  const bz = 0x4a8a6a, y = 3.5;
  P.box(cx - 0.3, y + 1, cz, 0.45, 2, 0.5, bz); P.box(cx + 0.3, y + 1, cz, 0.45, 2, 0.5, bz);
  P.box(cx, y + 2.9, cz, 1.4, 1.9, 0.8, bz); P.geo(P_SPH(10, 8), bz, cx, y + 4.2, cz, 0, 0, 0, 0.7, 0.8, 0.7);
  P.box(cx - 0.9, y + 3.8, cz, 0.4, 2.2, 0.4, bz, 0); P.box(cx + 0.9, y + 2.6, cz + 0.2, 0.4, 1.6, 0.4, bz);
  P.box(cx, y + 2.3, cz + 0.6, 1.8, 3.2, 0.15, bz);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, r = 19;
    P.box(cx + Math.cos(a) * r, 0.25, cz + Math.sin(a) * r, 3, 0.5, 0.9, 0x8a5a38, -a + Math.PI / 2);
    tree(ch, cx + Math.cos(a + 0.4) * 21, cz + Math.sin(a + 0.4) * 21, 1);
  }
  CITY.landmarks.push({ name: 'Heroes Plaza', x: cx, z: cz, y: 0 });
  CITY.parks.push({ x0, z0, x1, z1 });
}
function tree(ch, x, z, s = 1, collide = true) {
  ch.p.geo(P_CYL(6), 0x6a4a30, x, 1.5 * s, z, 0, 0, 0, 0.45 * s, 3 * s, 0.45 * s);
  ch.p.geo(P_SPH(9, 7), hash2(x | 0, z | 0) < 0.5 ? 0x4aa040 : 0x3a9048, x, 4.2 * s, z, 0, 0, 0, 4.2 * s, 3.8 * s, 4.2 * s);
  if (collide) addBox(x - 0.3, 0, z - 0.3, x + 0.3, 2.4 * s, z + 0.3, 'tree');
}
// Liberty Park: lawns, paths, a pond with a footbridge, trees, a bandstand
function liberty(rnd) {
  const x0 = L(PARK.i0) + CITY.WALK, z0 = L(PARK.j0) + CITY.WALK, x1 = L(PARK.i1) - CITY.WALK, z1 = L(PARK.j1) - CITY.WALK;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  CITY.parks.push({ x0, z0, x1, z1 });
  CITY.landmarks.push({ name: 'Liberty Park', x: cx, z: cz, y: 0 });
  const ch = chunkOf(cx - 30, cz + 30), P = ch.p;
  // the pond, west of the centre
  P.geo(P_CYL(28), 0x9a8a6a, cx - 30, 0.04, cz + 26, 0, 0, 0, 34, 0.08, 26); P.geo(P_CYL(28), 0x3a9ae0, cx - 30, 0.08, cz + 26, 0, 0, 0, 31, 0.08, 23);
  P.box(cx - 30, 0.5, cz + 26, 3, 0.3, 26, 0x8a6a48);
  // the bandstand east of the centre
  const bx = cx + 28, bz = cz - 26;
  P.geo(P_CYL(8), 0xf0ece4, bx, 0.6, bz, 0, 0, 0, 12, 1.2, 12); addBox(bx - 5, 0, bz - 5, bx + 5, 1.2, bz + 5, 'prop');
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; P.geo(P_CYL(6), 0xf0ece4, bx + Math.cos(a) * 5.2, 3.4, bz + Math.sin(a) * 5.2, 0, 0, 0, 0.35, 4.6, 0.35); }
  P.geo(P_CONE(8), 0xc84a3a, bx, 7.2, bz, 0, Math.PI / 8, 0, 13.5, 3, 13.5); addBox(bx - 5.5, 5.7, bz - 5.5, bx + 5.5, 6.5, bz + 5.5, 'prop');
  // trees everywhere off the paths
  for (let k = 0; k < 90; k++) {
    const x = rnd.range(x0 + 3, x1 - 3), z = rnd.range(z0 + 3, z1 - 3);
    if (Math.abs(x - L(4)) < 6 || Math.abs(z - L(7)) < 6) continue;
    if (dist(x, z, cx - 30, cz + 26) < 19 || dist(x, z, bx, bz) < 9) continue;
    tree(chunkOf(x, z), x, z, rnd.range(0.9, 1.5));
  }
}
function parkingLot(rnd, x0, z0, x1, z1) {
  const ch = chunkOf((x0 + x1) / 2, (z0 + z1) / 2), P = ch.p;
  P.box((x0 + x1) / 2, 0.02, (z0 + z1) / 2, x1 - x0, 0.04, z1 - z0, C.lot);
  for (let x = x0 + 3; x < x1 - 2; x += 3) { P.box(x, 0.05, z0 + 6, 0.12, 0.02, 5, C.white); P.box(x, 0.05, z1 - 6, 0.12, 0.02, 5, C.white); }
  CITY.parks.push({ x0, z0, x1, z1, lot: true });
}
// the docks: warehouses, stacked containers, gantry cranes and piers out into the bay
function docks(rnd, x0, z0, x1, z1, i) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (i % 2 === 0) {
    // a warehouse with a saw-tooth roof
    const ch = chunkOf(cx, cz);
    tier(x0 + 3, z0 + 3, x1 - 3, z0 + 26, 0, 11, 0xa86a4a, 0x5a3a2a, 0x7a7a80, 0, 0, false);
    for (let k = 0; k < 4; k++) ch.p.box(x0 + 8 + k * 10.5, 4, z0 + 26.05, 7, 8, 0.1, 0x4a5a6a);
    ch.p.box(cx, 0.6, z0 + 28, 40, 1.2, 3, 0x9a968e); addBox(x0 + 4, 0, z0 + 26.5, x1 - 4, 1.2, z0 + 29.5, 'prop');
  } else {
    const ch = chunkOf(cx, cz), cols = [0xd83a2a, 0x2a6ad8, 0x2aa85a, 0xe8a020, 0xe8e8e8, 0x8a3ac8, 0x2ab8c8];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
      const h = rnd.int(1, 3), x = x0 + 5 + k * 13.5 + 6, z = z0 + 6 + r * 8;
      for (let s = 0; s < h; s++) ch.p.box(x, 1.3 + s * 2.6, z, 12, 2.6, 2.5, rnd.pick(cols));
      addBox(x - 6, 0, z - 1.25, x + 6, h * 2.6, z + 1.25, 'prop');
    }
  }
  // a crane straddling the quay
  const qx = cx, qz = CITY.HALF + 8, ch = chunkOf(qx, qz);
  for (const [a, b] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { ch.p.box(qx + a, 14, qz + b, 1.2, 28, 1.2, 0xf0c020); }
  ch.p.box(qx, 28.5, qz, 14, 2, 14, 0xf0c020); ch.p.box(qx, 30.5, qz + 14, 3, 2.4, 46, 0xe8b018); ch.p.box(qx, 32.5, qz - 4, 5, 4, 6, 0xd8d8d8);
  for (const [a, b] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) addBox(qx + a - 0.6, 0, qz + b - 0.6, qx + a + 0.6, 28, qz + b + 0.6, 'prop');
  addBox(qx - 7, 27.5, qz - 7, qx + 7, 29.5, qz + 7, 'prop'); addBox(qx - 1.5, 29.3, qz - 9, qx + 1.5, 31.7, qz + 37, 'prop');
  // a pier out into the bay
  if (i % 2 === 1) {
    const p = { x0: cx - 8, x1: cx + 8, z0: CITY.EDGE, z1: CITY.EDGE + 70 };
    CITY.piers.push(p);
    const pc = chunkOf(cx, p.z0 + 35);
    pc.p.box(cx, -0.6, (p.z0 + p.z1) / 2, 16, 1.2, 70, C.wood, 0, true, 0x9a7a58);
    for (let z = p.z0 + 5; z < p.z1; z += 10) for (const s of [-1, 1]) pc.p.geo(P_CYL(6), 0x4a3a2a, cx + s * 7.5, -2, z, 0, 0, 0, 0.8, 4, 0.8);
  }
}
// a freighter tied up off the docks
function freighter() {
  const x = L(9) + 24, z0 = CITY.EDGE + 6, z1 = z0 + 96;
  const ch = chunkOf(x, z0 + 48), P = ch.p;
  P.box(x, 1.5, (z0 + z1) / 2, 20, 9, 96, 0x2a4a7a, 0, true, 0xa04030);
  P.box(x, 5.2, (z0 + z1) / 2, 20.4, 1.2, 96.4, 0xe8e8e8);
  addBox(x - 10, -3, z0, x + 10, 6, z1, 'ship');
  // bridge tower aft
  tier(x - 8, z1 - 16, x + 8, z1 - 4, 6, 20.4, 0xf0f0f0, 0x2a4a7a, 0x5a5a62, 1, 5, true);
  P.geo(P_CYL(10), 0xd83a2a, x, 25, z1 - 10, 0, 0, 0, 3, 8, 3);
  const cols = [0xd83a2a, 0x2a6ad8, 0x2aa85a, 0xe8a020, 0x8a3ac8];
  for (let k = 0; k < 6; k++) { const z = z0 + 8 + k * 11; for (let s = 0; s < 2; s++) P.box(x, 7.3 + s * 2.6, z, 16, 2.6, 9, cols[(k + s) % cols.length]); addBox(x - 8, 6, z - 4.5, x + 8, 11.2, z + 4.5, 'prop'); }
  CITY.piers.push({ x0: x - 10, x1: x + 10, z0, z1, ship: true });
  CITY.landmarks.push({ name: 'The freighter', x, z: (z0 + z1) / 2, y: 6 });
}
// lamps, traffic lights, trees, hydrants, benches along every sidewalk
function streetProps(rnd) {
  const N = CITY.N;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = L(i), z = L(j);
    // a traffic light on two corners of every real intersection
    const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([di, dj]) => CITY.roadOK(i, j, di, dj)).length;
    if (arms >= 3) for (const [sx, sz] of [[1, 1], [-1, -1]]) {
      const px = x + sx * 5.6, pz = z + sz * 5.6, ch = chunkOf(px, pz);
      ch.p.geo(P_CYL(6), 0x3a3a40, px, 2.6, pz, 0, 0, 0, 0.22, 5.2, 0.22);
      ch.p.box(px - sx * 2, 5.1, pz, 4, 0.2, 0.2, 0x3a3a40); ch.p.box(px - sx * 3.5, 4.6, pz, 0.5, 1.3, 0.5, 0x2a2a30);
      ch.g.box(px - sx * 3.5, 4.95, pz + 0.26 * sz, 0.3, 0.3, 0.05, 0xff3020); ch.g.box(px - sx * 3.5, 4.35, pz + 0.26 * sz, 0.3, 0.3, 0.05, 0x30ff60);
    }
  }
  // along each block edge: lamps every 24 m on the curb, trees between them in the outer districts
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (inParkCell(i, j)) continue;
    const x0 = L(i), x1 = L(i + 1), z0 = L(j), z1 = L(j + 1);
    const dn = Math.max(Math.abs((x0 + x1) / 2), Math.abs((z0 + z1) / 2)) / CITY.HALF;
    const edges = [[x0 + 12, z0 + 5.6, x1 - 12, z0 + 5.6], [x0 + 12, z1 - 5.6, x1 - 12, z1 - 5.6], [x0 + 5.6, z0 + 12, x0 + 5.6, z1 - 12], [x1 - 5.6, z0 + 12, x1 - 5.6, z1 - 12]];
    for (const [ax, az, bx, bz] of edges) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 12);
      for (let k = 0; k <= n; k++) {
        const t = k / n, px = lerp(ax, bx, t), pz = lerp(az, bz, t), ch = chunkOf(px, pz);
        const toRoadX = Math.abs(az - bz) < 0.1 ? 0 : (Math.abs(ax - x0) < 6 ? -1 : 1), toRoadZ = Math.abs(az - bz) < 0.1 ? (Math.abs(az - z0) < 6 ? -1 : 1) : 0;
        if (k % 2 === 0) {
          ch.p.geo(P_CYL(6), 0x3a4a5a, px, 3.5, pz, 0, 0, 0, 0.2, 7, 0.2);
          ch.p.box(px + toRoadX * 0.8, 7, pz + toRoadZ * 0.8, toRoadX ? 1.8 : 0.15, 0.15, toRoadZ ? 1.8 : 0.15, 0x3a4a5a);
          ch.g.box(px + toRoadX * 1.5, 6.85, pz + toRoadZ * 1.5, 0.7, 0.25, 0.7, 0xfff0c0);
          CITY.lamps.push({ x: px + toRoadX * 1.5, z: pz + toRoadZ * 1.5 });
        } else if (dn > 0.4 && rnd() < 0.7) {
          tree(ch, px - toRoadX * 0.6, pz - toRoadZ * 0.6, rnd.range(0.75, 1), true);
        } else if (rnd() < 0.25) {
          ch.p.geo(P_CYL(8), 0xd83030, px, 0.4, pz, 0, 0, 0, 0.35, 0.8, 0.35);
        } else if (rnd() < 0.3) {
          ch.p.box(px - toRoadX * 1.2, 0.25, pz - toRoadZ * 1.2, toRoadX ? 0.6 : 2.2, 0.5, toRoadZ ? 0.6 : 2.2, 0x8a5a38);
        }
      }
    }
  }
}

// ---------- graphs ----------
// road nodes sit on the intersections; traffic keeps right, 2.5 m off the centre line
function buildGraphs() {
  const N = CITY.N, id = (i, j) => i * (N + 1) + j;
  CITY.nodes = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) CITY.nodes.push({ i, j, x: L(i), z: L(j), nb: [] });
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    for (const [di, dj] of [[1, 0], [0, 1]]) if (CITY.roadOK(i, j, di, dj)) {
      const a = CITY.nodes[id(i, j)], b = CITY.nodes[id(i + di, j + dj)];
      a.nb.push(b); b.nb.push(a);
    }
  }
  CITY.nodes = CITY.nodes.filter((n) => n.nb.length);
  // sidewalk corners: four per intersection, linked along the block edges and by crossings
  const wk = new Map(), key = (i, j, sx, sz) => i + ',' + j + ',' + sx + ',' + sz;
  const node = (i, j, sx, sz) => { const k = key(i, j, sx, sz); let n = wk.get(k); if (!n) wk.set(k, n = { x: L(i) + sx * 6.5, z: L(j) + sz * 6.5, nb: [], cross: [] }); return n; };
  const link = (a, b, cross) => { (cross ? a.cross : a.nb).push(b); (cross ? b.cross : b.nb).push(a); };
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const n = node(i, j, sx, sz);
    if (Math.abs(n.x) > CITY.EDGE - 1 || Math.abs(n.z) > CITY.EDGE - 1) continue;
    if (sx === 1 && i < N) link(n, node(i + 1, j, -1, sz));
    if (sz === 1 && j < N) link(n, node(i, j + 1, sx, -1));
    if (sx === 1) link(n, node(i, j, -1, sz), true);
    if (sz === 1) link(n, node(i, j, sx, -1), true);
  }
  CITY.walk = [...wk.values()].filter((n) => n.nb.length && Math.abs(n.x) < CITY.EDGE - 1 && Math.abs(n.z) < CITY.EDGE - 1);
}
function nearestNode(list, x, z) { let b = null, bd = Infinity; for (const n of list) { const d = dist2(n.x, n.z, x, z); if (d < bd) { bd = d; b = n; } } return b; }
// a random spot on a sidewalk between radius r0 and r1 of (x, z)
function sidewalkSpot(x, z, r0, r1) {
  for (let k = 0; k < 40; k++) {
    const n = pick(CITY.walk), m = pick(n.nb), t = Math.random(), px = lerp(n.x, m.x, t), pz = lerp(n.z, m.z, t);
    const d = dist(px, pz, x, z);
    if (d >= r0 && d <= r1) return { x: px, z: pz, n, m };
  }
  const n = nearestNode(CITY.walk, x + rr(-r1, r1), z + rr(-r1, r1));
  return { x: n.x, z: n.z, n, m: n.nb[0] };
}

// ---------- the map image (also used by the radar) ----------
function drawMap() {
  const S = 1024, E = 520, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), k = S / (2 * E), X = (x) => (x + E) * k;
  g.fillStyle = '#2a6ab0'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#c8b890'; g.fillRect(X(-CITY.EDGE), X(-CITY.EDGE), 2 * CITY.EDGE * k, 2 * CITY.EDGE * k);
  g.fillStyle = '#9a968e'; g.fillRect(X(-CITY.HALF), X(-CITY.HALF), 2 * CITY.HALF * k, 2 * CITY.HALF * k);
  for (const p of CITY.piers) { g.fillStyle = p.ship ? '#2a4a7a' : '#8a6a48'; g.fillRect(X(p.x0), X(p.z0), (p.x1 - p.x0) * k, (p.z1 - p.z0) * k); }
  for (const p of CITY.parks) { g.fillStyle = p.lot ? '#5a5e66' : '#5aa848'; g.fillRect(X(p.x0), X(p.z0), (p.x1 - p.x0) * k, (p.z1 - p.z0) * k); }
  g.fillStyle = '#5aa848'; g.fillRect(X(L(PARK.i0) + 8), X(L(PARK.j0) + 8), (L(PARK.i1) - L(PARK.i0) - 16) * k, (L(PARK.j1) - L(PARK.j0) - 16) * k);
  g.fillStyle = '#3a9ae0'; g.beginPath(); g.ellipse(X((L(3) + L(5)) / 2 - 30), X((L(6) + L(8)) / 2 + 26), 15 * k, 11 * k, 0, 0, TAU); g.fill();
  g.strokeStyle = '#3e424c'; g.lineWidth = 10 * k; g.lineCap = 'square';
  for (const n of CITY.nodes) for (const m of n.nb) if (m.x > n.x || m.z > n.z) { g.beginPath(); g.moveTo(X(n.x), X(n.z)); g.lineTo(X(m.x), X(m.z)); g.stroke(); }
  for (const b of CITY.boxes) {
    if (b.kind !== 'bld' || b.y0 > 1) continue;
    const t = clamp(b.y1 / 160, 0, 1);
    g.fillStyle = `rgb(${Math.round(lerp(220, 120, t))},${Math.round(lerp(214, 132, t))},${Math.round(lerp(200, 170, t))})`;
    g.fillRect(X(b.x0), X(b.z0), (b.x1 - b.x0) * k, (b.z1 - b.z0) * k);
  }
  for (const b of CITY.boxes) if (b.kind === 'bld' && b.y1 > 200) { g.fillStyle = '#ffc020'; g.fillRect(X(b.x0), X(b.z0), (b.x1 - b.x0) * k, (b.z1 - b.z0) * k); }
  CITY.map = { canvas: c, S, E, k };
}
