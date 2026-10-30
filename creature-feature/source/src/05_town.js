// Creature Feature — Pine Hollow, 1957: a grid of streets around Main Street, houses with porches and picket fences,
// downtown shops, the diner, the Rialto, the motel, the gas station, the sheriff, the church and its graveyard, the
// park, the school and water tower, the Starlite Drive-In up the north road, lovers' lane on the south hill, the
// cornfield and the woods. Static geometry is merged per 100 m chunk; doors, lamp heads and props are instanced.

const AVES = [-150, -90, -30, 30, 90, 150], STS = [-120, -60, 0, 60, 120];
const TOWN = {
  chunks: new Map(), refuges: [], pois: [], props: [], lamps: [], doors: [], signs: [], spawn: { x: -120, z: -76, yaw: Math.PI },
  arrive: [], built: false, carSpecs: [],
};
const PASTELS = [0xa8dcc8, 0xf4c0c8, 0xf4e4a0, 0xa8c8ec, 0xf2efe6, 0xf0b89a, 0xc8b8e0, 0xd8e8b0, 0xf6d8a8];
const ROOFS = [0x4a4a52, 0x6a3a2a, 0x3a4a3a, 0x5a5048, 0x2a3a5a, 0x7a3030];
const DOOR_COLS = [0xb02828, 0xf4f0e6, 0x2a5a3a, 0x2a3a6a, 0x6a4028, 0xe8b830, 0x40a0a0];
const C = {
  asphalt: 0x2c2c32, walk: 0x8c887e, curb: 0xa8a49a, lawn: 0x3f6e34, trim: 0xf4f0e6, brick: 0x8a3a2a, brick2: 0x9a5a3a, stone: 0x8a8a84,
  lit: 0xffd890, tv: 0xa8d0ff, dark: 0x182032, shopLit: 0xfff0c8, metal: 0x9aa0a8, wood: 0x6a4a2e, pole: 0x2a302a, line: 0xe8e0c0, yellow: 0xe8c040,
};

function chunk(x, z) {
  const k = Math.floor((x + 500) / 100) * 64 + Math.floor((z + 500) / 100);
  let c = TOWN.chunks.get(k);
  if (!c) TOWN.chunks.set(k, (c = { vc: new Mesher(), glow: new Mesher(), x, z }));
  return c;
}
const VB = (x, y, z, sx, sy, sz, col, ry = 0) => chunk(x, z).vc.box(x, y, z, sx, sy, sz, col, ry);
const GB = (x, y, z, sx, sy, sz, col, ry = 0) => chunk(x, z).glow.box(x, y, z, sx, sy, sz, col, ry);
// a local frame: (lx, lz) in a building's space to world, front is +z locally
function lframe(cx, cz, ry) { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c]; }
// a flat quad on the ground (or at height y), axis-aligned
function groundQuad(x0, z0, x1, z1, y, col, glow = false) {
  const m = glow ? chunk((x0 + x1) / 2, (z0 + z1) / 2).glow : chunk((x0 + x1) / 2, (z0 + z1) / 2).vc;
  m.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], col);
}
// a road strip from a to b following the terrain
function roadStrip(ax, az, bx, bz, w, col, yo = 0.03, step = 4) {
  const l = dist(ax, az, bx, bz), n = Math.max(1, Math.ceil(l / step)), dx = (bx - ax) / l, dz = (bz - az) / l, nx = -dz * w / 2, nz = dx * w / 2;
  for (let i = 0; i < n; i++) {
    const t0 = i / n * l, t1 = (i + 1) / n * l;
    const p0x = ax + dx * t0, p0z = az + dz * t0, p1x = ax + dx * t1, p1z = az + dz * t1;
    const y = (x, z) => terrainH(x, z) + yo;
    const a = [p0x - nx, y(p0x - nx, p0z - nz), p0z - nz], b = [p0x + nx, y(p0x + nx, p0z + nz), p0z + nz], c = [p1x + nx, y(p1x + nx, p1z + nz), p1z + nz], d = [p1x - nx, y(p1x - nx, p1z - nz), p1z - nz];
    const m = chunk((p0x + p1x) / 2, (p0z + p1z) / 2).vc;
    // wind so the face points up whichever way the strip runs
    const cr = (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
    if (cr < 0) m.quad(a, b, c, d, col); else m.quad(a, d, c, b, col);
  }
}

// ---------- instanced things: doors, lamp heads and light pools, props ----------
const INST = { doors: [], heads: [], pools: [], props: { can: [], bench: [], mailbox: [], dumpster: [] } };
function addDoor(x, y, z, w, h, ry, col) {
  const d = { x, y, z, w, h, ry, col, i: INST.doors.length, broken: false };
  INST.doors.push(d);
  return d;
}
function addPool(x, z, r, col, y = 0.06) { const p = { x, z, r, col, y: terrainH(x, z) + y, i: INST.pools.length }; INST.pools.push(p); return p; }
// a light source the pool of point lights can pick, with an optional glow on the ground
function addLight(x, y, z, color, i, r, pool = 0) {
  const s = { x, y, z, color, i, r, on: true };
  LIGHTS.src.push(s);
  if (pool) s.pool = addPool(x, z, pool, color);
  return s;
}
function addProp(kind, x, z, ry) {
  const p = { kind, x, z, y: terrainH(x, z), ry, i: INST.props[kind].length, alive: true };
  INST.props[kind].push(p);
  const r = { can: 0.4, bench: 0.7, mailbox: 0.3, dumpster: 1.1 }[kind];
  p.col = addCircle(x, z, r, kind === 'dumpster' ? 1.4 : 1.0, 'prop');
  TOWN.props.push(p);
  return p;
}
// refuges: anywhere people can run inside and bolt the door
function addRefuge(o) {
  const r = Object.assign({ occ: [], hp: 1, broken: false, i: TOWN.refuges.length, lastSeen: -99 }, o);
  TOWN.refuges.push(r);
  return r;
}
function addPoi(kind, x, z, face = 0, o = {}) { const p = Object.assign({ kind, x, z, face }, o); TOWN.pois.push(p); return p; }

// ---------- street furniture ----------
function lamp(x, z, ax, az) {
  // pole at (x, z), arm reaching (ax, az) toward the road
  const y0 = terrainH(x, z);
  const m = chunk(x, z).vc;
  m.geo(P_CYL(6), C.pole, x, y0 + 3.2, z, 0, 0, 0, 0.16, 6.4, 0.16);
  const hx = x + ax * 1.6, hz = z + az * 1.6;
  m.box((x + hx) / 2, y0 + 6.3, (z + hz) / 2, Math.abs(ax) * 1.6 + 0.1, 0.1, Math.abs(az) * 1.6 + 0.1, C.pole);
  m.box(hx, y0 + 6.15, hz, 0.5, 0.18, 0.5, 0x3a403a);
  const L = addLight(hx, y0 + 5.9, hz, 0xffd08a, 1.5, 17, 7);
  const lp = { x, z, hx, hz, y: y0 + 5.95, light: L, on: true, i: INST.heads.length };
  INST.heads.push(lp);
  lp.col = addCircle(x, z, 0.18, 6.4, 'pole');
  TOWN.lamps.push(lp);
  return lp;
}
function tree(x, z, rnd, s = 1) {
  const y = terrainH(x, z), m = chunk(x, z).vc;
  const h = rnd.range(2.4, 3.6) * s;
  m.geo(P_CYL(5), 0x4a3424, x, y + h / 2, z, 0, 0, 0, 0.35 * s, h, 0.35 * s);
  const g = [0x2a4a24, 0x30522a, 0x264020, 0x3a5a2a][rnd.int(0, 3)];
  m.geo(P_SPH(7, 5), g, x, y + h + 1.2 * s, z, 0, rnd() * 3, 0, 3.6 * s, 3 * s, 3.6 * s);
  m.geo(P_SPH(6, 4), g + 0x060806, x + rnd.range(-0.8, 0.8) * s, y + h + 2.4 * s, z + rnd.range(-0.8, 0.8) * s, 0, rnd() * 3, 0, 2.6 * s, 2.2 * s, 2.6 * s);
  addCircle(x, z, 0.3 * s, h + 3, 'tree');
}
function fenceLine(ax, az, bx, bz, col, gapC = null, gapW = 0) {
  const l = dist(ax, az, bx, bz), dx = (bx - ax) / l, dz = (bz - az) / l, ry = Math.atan2(dx, dz);
  const m = chunk((ax + bx) / 2, (az + bz) / 2).vc;
  for (let t = 0.15; t < l; t += 0.32) {
    const x = ax + dx * t, z = az + dz * t;
    if (gapC && dist(x, z, gapC[0], gapC[1]) < gapW) continue;
    m.box(x, 0.5, z, 0.09, 1.0, 0.09, col, ry);
  }
  // rails, split around the gate
  const rail = (s0, s1) => { if (s1 - s0 < 0.2) return; const cx = ax + dx * (s0 + s1) / 2, cz = az + dz * (s0 + s1) / 2; m.box(cx, 0.75, cz, 0.05, 0.08, s1 - s0, col, ry); m.box(cx, 0.35, cz, 0.05, 0.08, s1 - s0, col, ry); };
  if (gapC) { const tg = (gapC[0] - ax) * dx + (gapC[1] - az) * dz; rail(0, tg - gapW); rail(tg + gapW, l); } else rail(0, l);
}

// ---------- a house ----------
function house(cx, cz, ry, rnd, lot) {
  const w = rnd.range(7.6, 9.6), d = rnd.range(7.4, 9), two = rnd.chance(0.35), h = two ? 5.8 : 3.3, rh = rnd.range(1.8, 2.6);
  const body = rnd.pick(PASTELS), roof = rnd.pick(ROOFS), P = lframe(cx, cz, ry), m = chunk(cx, cz).vc, g = chunk(cx, cz).glow;
  m.box(cx, h / 2, cz, w, h, d, body, ry);
  m.box(cx, 0.25, cz, w + 0.25, 0.5, d + 0.25, 0x6a645a, ry);
  m.gable(cx, h, cz, w, d, rh, roof, ry, 0.55, false, body);
  addBox(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h, { ridge: rh, rx: true, kind: 'house' });
  // chimney
  const [chx, chz] = P(w * 0.28, -d * 0.12); m.box(chx, h + rh * 0.55, chz, 0.8, rh + 1.2, 0.8, C.brick, ry);
  // porch and door
  const pdx = rnd.pick([-1, 1]) * w * 0.2;
  const [px, pz] = P(pdx, d / 2 + 1.0); m.box(px, 0.25, pz, 3.6, 0.5, 2.0, 0x8a8478, ry);
  const [sx, sz] = P(pdx, d / 2 + 2.25); m.box(sx, 0.12, sz, 1.6, 0.25, 0.5, 0x8a8478, ry);
  for (const k of [-1.6, 1.6]) { const [ox, oz] = P(pdx + k, d / 2 + 1.85); m.box(ox, 1.55, oz, 0.16, 2.1, 0.16, C.trim, ry); }
  const [rx, rz] = P(pdx, d / 2 + 1.05); m.box(rx, 2.65, rz, 4.0, 0.16, 2.3, roof, ry);
  const [dx, dz] = P(pdx, d / 2 + 0.05);
  const door = addDoor(dx, 1.55, dz, 1.0, 2.1, ry, rnd.pick(DOOR_COLS));
  const occupied = rnd.chance(0.75);
  // windows: lit ones glow
  const win = (lx, ly, lz, face) => {
    const lit = occupied && rnd.chance(0.55), col = lit ? (rnd.chance(0.15) ? C.tv : C.lit) : C.dark;
    const fr = lframe(cx, cz, ry + face);
    const [wx, wz] = fr(lx, lz);
    (lit ? g : m).box(wx, ly, wz, 1.15, 1.25, 0.06, col, ry + face);
    const [ax, az] = fr(lx - 0.8, lz), [bx, bz] = fr(lx + 0.8, lz);
    m.box(ax, ly, az, 0.32, 1.35, 0.08, 0x2a4a3a, ry + face); m.box(bx, ly, bz, 0.32, 1.35, 0.08, 0x2a4a3a, ry + face);
  };
  const floors = two ? [1.6, 4.3] : [1.6];
  for (const fy of floors) {
    for (const lx of [-w * 0.33, w * 0.33]) if (fy > 2 || Math.abs(lx - pdx) > 1.7) win(lx, fy, d / 2 + 0.03, 0);
    if (fy > 2) win(pdx, fy, d / 2 + 0.03, 0);
    win(0, fy, w / 2 + 0.03, Math.PI / 2); win(0, fy, w / 2 + 0.03, -Math.PI / 2);
    win(-w * 0.25, fy, d / 2 + 0.03, Math.PI); win(w * 0.25, fy, d / 2 + 0.03, Math.PI);
  }
  // porch light
  const [lx, lz] = P(pdx + 0.85, d / 2 + 0.12);
  let light = null;
  if (occupied && rnd.chance(0.7)) { g.box(lx, 2.2, lz, 0.18, 0.26, 0.18, 0xffe0a0, ry); light = addLight(lx, 2.3, lz, 0xffc070, 0.9, 9, 3.2); }
  else m.box(lx, 2.2, lz, 0.18, 0.26, 0.18, 0x6a6458, ry);
  // the lot: walk, fence, mailbox, tree, bins
  const front = lot.front; // local z of the lot's street edge
  const [wa, wza] = P(pdx, d / 2 + 2.5), [wb, wzb] = P(pdx, front);
  groundQuad(Math.min(wa, wb) - 0.6, Math.min(wza, wzb), Math.max(wa, wb) + 0.6, Math.max(wza, wzb), 0.035, 0x9a968c);
  if (rnd.chance(0.7)) {
    const fc = rnd.chance(0.75) ? C.trim : 0x6a4a2e;
    const [fa, fza] = P(-lot.hw + 0.2, front - 0.4), [fb, fzb] = P(lot.hw - 0.2, front - 0.4);
    fenceLine(fa, fza, fb, fzb, fc, P(pdx, front - 0.4), 0.8);
  }
  const [mx, mz] = P(pdx + 1.4, front - 0.2);
  m.box(mx, 0.6, mz, 0.1, 1.2, 0.1, C.wood, ry); m.box(mx, 1.25, mz, 0.3, 0.3, 0.5, rnd.pick([0x2a2a2a, 0x8a8a90, 0xb02828]), ry);
  if (rnd.chance(0.65)) { const s = rnd.pick([-1, 1]); const [tx, tz] = P(s * rnd.range(4.8, 6.6), front - rnd.range(2.5, 4.5)); tree(tx, tz, rnd, rnd.range(0.85, 1.15)); }
  if (rnd.chance(0.3)) { const [cx2, cz2] = P(-pdx * 1.8, front - 0.9); addProp('can', cx2, cz2, rnd() * 3); }
  // where you stand to knock, and where you come from the street
  const [ax2, az2] = P(pdx, front + 1.2), [nx, nz] = [Math.sin(ry), Math.cos(ry)];
  const [ix, iz] = P(pdx, d / 2 - 1.2);
  addRefuge({ kind: 'house', x: dx, z: dz, ax: ax2, az: az2, nx, nz, ix, iz, door, light, cap: 6, name: 'house' });
  if (rnd.chance(0.35)) addPoi('porch', px + nx * 0.3, pz + nz * 0.3, Math.atan2(nx, nz));
}

// ---------- a downtown shop ----------
function shop(x0, x1, frontZ, face, name, rnd, o = {}) {
  // face +1: the front looks toward +z (north side of Main St)
  const w = x1 - x0, d = o.d || 16, h = o.h || rnd.range(5, 8), cx = (x0 + x1) / 2, cz = frontZ - face * d / 2, ry = face > 0 ? 0 : Math.PI;
  const body = o.col || rnd.pick([C.brick, C.brick2, 0xc8b898, 0xd8d0b8, 0x6a8a8a, 0xb8a080]);
  const m = chunk(cx, cz).vc, g = chunk(cx, cz).glow, P = lframe(cx, cz, ry);
  m.box(cx, h / 2, cz, w - 0.1, h, d, body, ry);
  const [ppx, ppz] = P(0, d / 2 - 0.25); m.box(ppx, h + 0.35, ppz, w, 0.7, 0.5, 0xe8e0d0, ry);
  addBox(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h, { kind: 'shop' });
  // display windows, a door to one side, an awning and the sign
  const doorX = (rnd.chance(0.5) ? -1 : 1) * (w / 2 - 1.6);
  const winW = w - 4.2, winX = -Math.sign(doorX) * 0.9;
  const [wx, wz] = P(winX, d / 2 + 0.03); g.box(wx, 1.6, wz, winW, 2.2, 0.06, o.lit || C.shopLit, ry);
  const [kx, kz] = P(winX, d / 2 + 0.12); m.box(kx, 0.35, kz, winW + 0.2, 0.7, 0.2, 0x4a4040, ry);
  const [dx, dz] = P(doorX, d / 2 + 0.05);
  const door = addDoor(dx, 1.55, dz, 1.1, 2.2, ry, o.door || 0x3a2a1a);
  const aw = o.awning || rnd.pick([[0xc03030, 0xf0f0f0], [0x2a7a4a, 0xf0f0f0], [0x2a4a9a, 0xf0e8d0], [0xe8b030, 0x6a3a1a]]);
  for (let i = 0; i < Math.floor(w / 1.2); i++) {
    const lx = -w / 2 + 0.6 + i * 1.2, [ax, az] = P(lx, d / 2 + 0.9);
    m.box(ax, 3.1, az, 1.2, 0.12, 1.9, aw[i % 2], ry + 0);
  }
  if (h > 6.5) for (const lx of [-w * 0.3, 0, w * 0.3]) { const lit = rnd.chance(0.4); const [ux, uz] = P(lx, d / 2 + 0.03); (lit ? g : m).box(ux, h - 2, uz, 1.3, 1.5, 0.06, lit ? C.lit : C.dark, ry); }
  if (name) {
    const sw = Math.min(w - 1, name.length * 0.75 + 1.5);
    const tex = boardTex([name], { w: 512, h: 96, bg: o.signBg || '#f2ead2', ink: o.ink || '#2a1a10', bulbs: !!o.bulbs });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(sw, 1.05), new THREE.MeshBasicMaterial({ map: tex }));
    const [sx, sz] = P(0, d / 2 + 0.06); sm.position.set(sx, 4.15, sz); sm.rotation.y = ry;
    R.scene.add(sm); TOWN.signs.push(sm);
  }
  const [lx, lz] = P(winX, d / 2 + 2.2);
  addLight(lx, 2.8, lz, o.lit === C.tv ? 0xa0c8ff : 0xffe8b0, 0.8, 10, 4.5);
  const [ax2, az2] = P(doorX, d / 2 + 2), [ix, iz] = P(doorX, d / 2 - 2);
  addRefuge({ kind: 'shop', x: dx, z: dz, ax: ax2, az: az2, nx: 0, nz: face, ix, iz, door, cap: 8, name: name || 'shop' });
  addPoi('shop', ax2 + rnd.range(-2, 2), az2 + face * 0.6, face > 0 ? Math.PI : 0);
  return { cx, cz, w, d, h };
}
function neon(text, color, x, y, z, ry, hgt, o = {}) {
  const { tex, aspect } = neonTex(text, color, o);
  const mat2 = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
  const mm = new THREE.Mesh(new THREE.PlaneGeometry(hgt * aspect, hgt), mat2);
  mm.position.set(x, y, z); mm.rotation.y = ry;
  // two-sided signs are two planes back to back, so neither side reads mirrored
  if (o.ds) { const b = new THREE.Mesh(mm.geometry, mat2); b.rotation.y = Math.PI; b.position.z = -0.02; mm.add(b); }
  R.scene.add(mm); TOWN.signs.push(mm);
  return mm;
}

// ---------- blocks ----------
function residentialBlock(bx0, bz0, bx1, bz1, rnd) {
  const lots = 3, lw = (bx1 - bx0) / lots;
  for (const side of [-1, 1]) {
    for (let k = 0; k < lots; k++) {
      if (rnd.chance(0.06)) continue; // an empty lot
      const cx = bx0 + lw * (k + 0.5) + rnd.range(-0.8, 0.8);
      const d = 8.4, setback = rnd.range(6.5, 8);
      // side -1: north row, front faces the street at bz0 (ry = PI)
      const front = side < 0 ? bz0 + 2.5 : bz1 - 2.5;
      const cz = front - side * (setback + d / 2);
      const ry = side < 0 ? Math.PI : 0;
      house(cx, cz, ry, rnd, { front: setback + d / 2, hw: lw / 2 });
      // a car parked at the kerb
      if (rnd.chance(0.3)) parkCar(cx + rnd.range(-4, 4), side < 0 ? bz0 - 3.4 : bz1 + 3.4, side < 0 ? -Math.PI / 2 : Math.PI / 2);
    }
  }
  // backyard trees
  for (let i = 0; i < 4; i++) if (rnd.chance(0.6)) tree(rnd.range(bx0 + 4, bx1 - 4), (bz0 + bz1) / 2 + rnd.range(-4, 4), rnd, rnd.range(0.9, 1.3));
}
function lotPaint(x0, z0, x1, z1, rows) {
  groundQuad(x0, z0, x1, z1, 0.03, 0x34343a);
  for (const r of rows) for (let x = x0 + 2; x < x1 - 1; x += 3) groundQuad(x - 0.06, r - 2.5, x + 0.06, r + 2.5, 0.04, 0xc8c4b0);
}

function buildTown() {
  const rnd = RNG(1957);
  LIGHTS.src.length = 0;
  // ground
  {
    const S = 1000, N = 200;
    const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, col = [], c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = terrainH(x, z);
      pos.setY(i, y);
      const n = vnoise(x / 9, z / 9, 11), inTown = Math.abs(x) < TOWN_HX && Math.abs(z) < TOWN_HZ;
      if (inTown) c.setHex(C.lawn).offsetHSL(0, 0, (n - 0.5) * 0.05);
      else c.setHex(0x34502a).lerp(new THREE.Color(0x4a4230), clamp(vnoise(x / 30, z / 30, 4) * 1.4 - 0.5, 0, 1)).offsetHSL(0, 0, (n - 0.5) * 0.06);
      if (inCorn(x, z)) c.setHex(0x4a3e2a);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, MATS.vc);
    R.scene.add(ground); TOWN.ground = ground;
  }
  // streets: asphalt, kerbs and pavements, a yellow line down Main Street
  for (const z of STS) groundQuad(AVES[0] - 5, z - 5, AVES[5] + 5, z + 5, 0.02, C.asphalt);
  for (const x of AVES) groundQuad(x - 5, STS[0] - 5, x + 5, STS[4] + 5, 0.021, C.asphalt);
  for (let x = AVES[0] + 8; x < AVES[5] - 4; x += 6) if (AVES.every((a) => Math.abs(x - a) > 6)) groundQuad(x - 1.5, -0.1, x + 1.5, 0.1, 0.03, C.yellow);
  // roads out of town
  roadStrip(-AVES[5] - 5, 0, -420, 0, 10, C.asphalt); roadStrip(AVES[5] + 5, 0, 420, 0, 10, C.asphalt);
  roadStrip(-30, STS[0] - 5, -30, -420, 10, C.asphalt);
  roadStrip(90, STS[4] + 5, 90, 236, 7, 0x3a3630);
  // nodes: every intersection, then the roads out
  const node = {};
  for (const x of AVES) for (const z of STS) node[x + ',' + z] = addNode(x, z);
  for (let i = 0; i < AVES.length - 1; i++) for (const z of STS) linkNodes(node[AVES[i] + ',' + z], node[AVES[i + 1] + ',' + z]);
  for (const x of AVES) for (let j = 0; j < STS.length - 1; j++) linkNodes(node[x + ',' + STS[j]], node[x + ',' + STS[j + 1]]);
  const W1 = addNode(-240, 0), W = addNode(-400, 0, { exit: 'west' }), E1 = addNode(240, 0), E = addNode(400, 0, { exit: 'east' });
  const N1 = addNode(-30, -200), N = addNode(-30, -400, { exit: 'north' }), S1 = addNode(90, 180), S2 = addNode(90, 228);
  linkNodes(node['-150,0'], W1); linkNodes(W1, W); linkNodes(node['150,0'], E1); linkNodes(E1, E);
  linkNodes(node['-30,-120'], N1); linkNodes(N1, N); linkNodes(node['90,120'], S1); linkNodes(S1, S2);
  WORLD.exits = [W, E, N];
  TOWN.arrive = [W1, E1, N1];
  TOWN.nodeLovers = S2; TOWN.nodeDriveIn = N1;
  buildPaths();

  // ---------- blocks ----------
  const special = {};
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
    const bx0 = AVES[i] + 5, bx1 = AVES[i + 1] - 5, bz0 = STS[j] + 5, bz1 = STS[j + 1] - 5;
    const key = (AVES[i] + AVES[i + 1]) / 2 + ',' + (STS[j] + STS[j + 1]) / 2;
    // pavement around every block
    const m = chunk((bx0 + bx1) / 2, (bz0 + bz1) / 2).vc;
    m.box((bx0 + bx1) / 2, 0.06, bz0 + 1.25, bx1 - bx0, 0.12, 2.5, C.walk); m.box((bx0 + bx1) / 2, 0.06, bz1 - 1.25, bx1 - bx0, 0.12, 2.5, C.walk);
    m.box(bx0 + 1.25, 0.06, (bz0 + bz1) / 2, 2.5, 0.12, bz1 - bz0 - 5, C.walk); m.box(bx1 - 1.25, 0.06, (bz0 + bz1) / 2, 2.5, 0.12, bz1 - bz0 - 5, C.walk);
    special[key] = [bx0, bz0, bx1, bz1];
  }
  const B = (k) => special[k];
  for (const k of ['-120,-30', '120,-30', '-60,-90', '0,-90', '60,-90', '-60,90', '60,90', '-120,90', '120,90']) residentialBlock(...B(k), rnd);
  downtown(rnd);
  churchBlock(...B('-120,-90'), rnd);
  schoolBlock(...B('120,-90'), rnd);
  parkBlock(...B('0,90'), rnd);
  motelBlock(...B('-120,30'), rnd);
  gasBlock(...B('120,30'), rnd);
  // street lamps: one per residential stretch, alternating sides; Main Street gets a row each side
  for (let i = 0; i < AVES.length - 1; i++) for (let j = 0; j < STS.length; j++) {
    const z = STS[j], x0 = AVES[i], x1 = AVES[i + 1];
    if (z === 0) { if (x0 >= -90 && x1 <= 90) for (let x = x0 + 9; x < x1 - 4; x += 14) { lamp(x, -6.2, 0, 1); lamp(x + 7, 6.2, 0, -1); } else lamp((x0 + x1) / 2, 6.2, 0, -1); continue; }
    const s = (i + j) % 2 ? 1 : -1;
    lamp((x0 + x1) / 2 + rnd.range(-6, 6), z + s * 6.2, 0, -s);
  }
  for (let i = 0; i < AVES.length; i++) for (let j = 0; j < STS.length - 1; j++) {
    if ((i + j) % 2) continue;
    const x = AVES[i], z0 = STS[j], z1 = STS[j + 1], s = j % 2 ? 1 : -1;
    lamp(x + s * 6.2, (z0 + z1) / 2, -s, 0);
  }
  driveIn(rnd);
  loversLane(rnd);
  outskirts(rnd);
  finishTown();
}

function downtown(rnd) {
  // north side of Main Street (fronts face +z at z = -9), south side (fronts face -z at z = 9)
  const rowN = [[-85, -71, 'RECORDS'], [-71, -49, null, 'rialto'], [-49, -35, 'BARBER'],
    [-25, -11, 'BANK'], [-11, 6, 'FIVE & DIME'], [6, 25, 'HARDWARE'],
    [35, 60, null, 'bowl'], [60, 72, 'TV & RADIO'], [72, 85, 'SODA SHOP']];
  const rowS = [[-85, -66, 'HOTEL', 'hotel'], [-66, -50, 'POST OFFICE'], [-50, -35, 'PHARMACY'],
    [-25, -10, 'BEAUTY PARLOR'], [-10, 10, null, 'sheriff'], [10, 25, 'DRY CLEANING']];
  for (const [x0, x1, name, kind] of rowN) {
    if (kind === 'rialto') {
      const s = shop(x0, x1, -9, 1, null, rnd, { h: 10.5, d: 24, col: 0x7a2a3a, lit: 0xffe0a0, door: 0x8a1a1a, awning: [0x8a1a1a, 0x8a1a1a] });
      // the marquee and the vertical sign
      const mm = chunk(s.cx, -9).vc; mm.box(s.cx, 4.4, -7.4, x1 - x0 - 2, 1.6, 3.4, 0x2a2a2a);
      const tex = boardTex(['TONIGHT', 'BEAST FROM PLANET X'], { w: 512, h: 128, bg: '#fff4d0', bulbs: true });
      for (const [z, ry] of [[-5.68, 0]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 2.4, 1.5), new THREE.MeshBasicMaterial({ map: tex })); p.position.set(s.cx, 4.4, z); p.rotation.y = ry; R.scene.add(p); TOWN.signs.push(p); }
      neon('RIALTO', '#ff3a5a', s.cx, 8.2, -8.6, 0, 2.2);
      addLight(s.cx, 3.4, -4.5, 0xffe0a0, 1.7, 18, 8);
      addPoi('crowd', s.cx - 2, -4.2, Math.PI); addPoi('crowd', s.cx + 2, -4.2, Math.PI);
    } else if (kind === 'bowl') {
      const s = shop(x0, x1, -9, 1, null, rnd, { h: 7, d: 22, col: 0x3a6a8a, lit: 0xd8f0ff });
      neon('BOWL-O-RAMA', '#3ae0ff', s.cx, 6.1, -8.7, 0, 1.8);
      addPoi('crowd', s.cx, -5, Math.PI);
    } else shop(x0, x1, -9, 1, name, rnd, { lit: name === 'TV & RADIO' ? C.tv : undefined });
  }
  for (const [x0, x1, name, kind] of rowS) {
    if (kind === 'hotel') shop(x0, x1, 9, -1, name, rnd, { h: 11, d: 18, col: 0xa89070, bulbs: true });
    else if (kind === 'sheriff') {
      const s = shop(x0, x1, 9, -1, 'SHERIFF', rnd, { h: 6, d: 14, col: C.brick, signBg: '#d8d0b8', door: 0x2a2a2a, awning: [0x2a2a2a, 0x2a2a2a] });
      GB(s.cx - 3, 3, 8.2, 0.3, 0.3, 0.3, 0x3a7aff); GB(s.cx + 3, 3, 8.2, 0.3, 0.3, 0.3, 0x3a7aff);
      parkCar(s.cx + 4, 14 + 13, Math.PI / 2, { police: true });
    } else shop(x0, x1, 9, -1, name, rnd);
  }
  // the diner on its own lot
  {
    const cx = 62, cz = 22, w = 22, d = 7.5, h = 3.6;
    const m = chunk(cx, cz).vc, g = chunk(cx, cz).glow;
    lotPaint(35, 9, 85, 50, [34, 46]);
    m.box(cx, 0.4, cz, w + 0.4, 0.8, d + 0.4, 0x3a3a40);
    m.box(cx, h / 2 + 0.4, cz, w, h, d, 0xc8ccd4);
    m.geo(new THREE.CylinderGeometry(d / 2, d / 2, w, 12, 1, false, 0, Math.PI), 0xb8bcc4, cx, h + 0.4, cz, 0, 0, Math.PI / 2, 0.5, 1, 1);
    m.box(cx, 1.4, cz - d / 2 - 0.02, w, 0.35, 0.06, 0xd02a3a); m.box(cx, 3.6, cz - d / 2 - 0.02, w, 0.25, 0.06, 0xd02a3a);
    g.box(cx, 2.4, cz - d / 2 - 0.04, w - 3, 1.5, 0.06, 0xfff0c0);
    addBox(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h + 0.4, { ridge: d * 0.25, rx: true, kind: 'diner' });
    const door = addDoor(cx, 1.55, cz - d / 2 - 0.08, 1.2, 2.2, Math.PI, 0xc8ccd4);
    m.box(cx, 0.3, cz - d / 2 - 1.2, 3, 0.6, 2, 0x8a8478);
    addRefuge({ kind: 'diner', x: cx, z: cz - d / 2 - 0.08, ax: cx, az: cz - d / 2 - 3, nx: 0, nz: -1, ix: cx, iz: cz, door, cap: 12, name: 'the diner' });
    const pole = chunk(44, 12).vc; pole.geo(P_CYL(6), C.pole, 44, 4, 12, 0, 0, 0, 0.3, 8, 0.3);
    neon('DINER', '#ff4a8a', 44, 7.6, 12.2, 0, 2.4, { ds: true }); neon('EAT', '#5affd0', cx, h + 3.2, cz - 1, 0, 1.6, { ds: true });
    addLight(cx, 3, cz - d / 2 - 3, 0xffe0c0, 1.5, 18, 8); addLight(44, 7, 12, 0xff4a8a, 1.0, 14);
    for (const [x, z] of [[cx - 4, cz - d / 2 - 3.2], [cx - 2, cz - d / 2 - 4.5], [cx + 3, cz - d / 2 - 3.5], [cx + 5, cz - d / 2 - 4.6]]) addPoi('diner', x, z, rnd() * TAU);
    for (const [x, ry] of [[42, 0], [50, 0], [74, Math.PI], [80, 0]]) if (rnd.chance(0.8)) parkCar(x, 34 + (ry ? 0 : 0), ry, {});
    parkCar(66, 46, Math.PI, {}); parkCar(54, 46, 0, {});
  }
  // parking behind the north row
  lotPaint(-85, -55, -35, -35, [-45]); lotPaint(35, -55, 85, -35, [-45]);
  for (let i = 0; i < 4; i++) parkCar(rnd.range(-82, -40), -45 + rnd.pick([-2.5, 2.5]) * 0 + rnd.pick([-3, 3]), rnd.pick([0, Math.PI]), {});
  for (let i = 0; i < 4; i++) parkCar(rnd.range(40, 82), -45 + rnd.pick([-3, 3]), rnd.pick([0, Math.PI]), {});
  addProp('dumpster', -60, -50, 0); addProp('dumpster', 0, -50, 0); addProp('dumpster', 50, -50, 0); addProp('dumpster', -30 + 18, 40, 0);
  for (const x of [-80, -42, -18, 12, 40, 78]) { addProp('can', x, -6.6, 0); addProp('bench', x + 4, 6.8, Math.PI); }
  for (let i = 0; i < 4; i++) parkCar(rnd.range(-80, 80), rnd.pick([-3.4, 3.4]), rnd.pick([Math.PI / 2, -Math.PI / 2]), {});
  // window shoppers and loiterers
  for (let i = 0; i < 6; i++) addPoi('street', rnd.range(-80, 80), rnd.pick([-7, 7]), rnd() * TAU);
  // behind the south row
  for (const k of [[-60, 40], [0, 40]]) for (let i = 0; i < 2; i++) tree(k[0] + rnd.range(-15, 15), k[1] + rnd.range(-8, 8), rnd);
}

function churchBlock(bx0, bz0, bx1, bz1, rnd) {
  const cx = (bx0 + bx1) / 2;
  // the church faces the street to the north
  const w = 12, d = 22, h = 8, cz = bz0 + 6 + d / 2;
  const m = chunk(cx, cz).vc, g = chunk(cx, cz).glow;
  m.box(cx, h / 2, cz, w, h, d, 0xe8e4da);
  m.gable(cx, h, cz, w, d, 5, 0x3a3a44, 0, 0.6, true, 0xe8e4da);
  addBox(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h, { ridge: 5, rx: false, kind: 'church' });
  m.box(cx, 7, cz - d / 2 - 1.6, 4.2, 14, 3.4, 0xe8e4da);
  m.geo(P_CONE(4), 0x3a3a44, cx, 18.5, cz - d / 2 - 1.6, 0, Math.PI / 4, 0, 4.4, 9, 4.4);
  m.box(cx, 24, cz - d / 2 - 1.6, 0.2, 2, 0.2, 0xd8d0b0); m.box(cx, 24.4, cz - d / 2 - 1.6, 1, 0.2, 0.2, 0xd8d0b0);
  addBox(cx - 2.1, cz - d / 2 - 3.3, cx + 2.1, cz - d / 2 + 0.1, 14, { kind: 'church' });
  for (const z of [-6, 0, 6]) for (const s of [-1, 1]) g.box(cx + s * (w / 2 + 0.03), 4, cz + z, 0.06, 3.2, 1.3, [0xd04a4a, 0x4a7ad0, 0xd0b040][(z / 6 + 1) % 3]);
  g.box(cx, 9.5, cz - d / 2 - 3.32, 1.4, 1.4, 0.06, 0xd04a8a);
  const door = addDoor(cx, 1.7, cz - d / 2 - 3.35, 1.8, 2.8, Math.PI, 0x5a2a1a);
  addRefuge({ kind: 'church', x: cx, z: cz - d / 2 - 3.35, ax: cx, az: bz0 + 1, nx: 0, nz: -1, ix: cx, iz: cz, door, cap: 12, name: 'the church' });
  addLight(cx, 3.2, cz - d / 2 - 4.2, 0xffe0b0, 0.9, 10, 4);
  // the graveyard around it, behind an iron fence
  const gz0 = cz + d / 2 + 2;
  groundQuad(bx0 + 2.5, gz0 - 2, bx1 - 2.5, bz1 - 2.5, 0.025, 0x2a3a24);
  for (let x = bx0 + 6; x < bx1 - 4; x += 3.2) for (let z = gz0 + 2; z < bz1 - 5; z += 3.6) {
    if (Math.abs(x - cx) < 3 && z < gz0 + 12) continue;
    if (rnd.chance(0.25)) continue;
    const t = rnd.int(0, 3), xx = x + rnd.range(-0.4, 0.4), zz = z + rnd.range(-0.4, 0.4), tilt = rnd.range(-0.12, 0.12), st = rnd.pick([0x7a7a78, 0x8a8a84, 0x6a6a68, 0x9a968c]);
    const mm = chunk(xx, zz).vc;
    if (t === 0) { mm.box(xx, 0.55, zz, 0.9, 1.1, 0.22, st, tilt); mm.geo(P_CYL(8), st, xx, 1.1, zz, Math.PI / 2, tilt, 0, 0.9, 0.22, 0.9); }
    else if (t === 1) { mm.box(xx, 0.8, zz, 0.18, 1.6, 0.18, st, tilt); mm.box(xx, 1.15, zz, 0.8, 0.16, 0.18, st, tilt); }
    else if (t === 2) { mm.box(xx, 0.35, zz, 1.0, 0.7, 0.5, st, tilt); }
    else { mm.box(xx, 1.0, zz, 0.45, 2.0, 0.45, st); mm.geo(P_CONE(4), st, xx, 2.4, zz, 0, Math.PI / 4, 0, 0.6, 0.8, 0.6); }
  }
  // the crypt: where you rise
  const kx = cx, kz = bz1 - 9;
  m.box(kx, 2, kz, 6, 4, 5, 0x6a6a64); m.gable(kx, 4, kz, 6, 5, 1.4, 0x4a4a48, 0, 0.3, false, 0x6a6a64);
  for (const s of [-2.2, -0.8, 0.8, 2.2]) m.geo(P_CYL(6), 0x8a8a84, kx + s, 1.8, kz - 2.8, 0, 0, 0, 0.4, 3.6, 0.4);
  m.box(kx, 1.3, kz - 2.52, 1.6, 2.6, 0.06, 0x0a0a0a);
  addBox(kx - 3, kz - 2.5, kx + 3, kz + 2.5, 4, { ridge: 1.4, kind: 'crypt' });
  TOWN.spawn = { x: kx, z: kz - 5.5, yaw: 0 };
  TOWN.crypt = { x: kx, z: kz };
  addLight(kx, 2.5, kz - 4, 0x6aff9a, 0.7, 9, 3);
  // dead trees
  for (const [x, z] of [[bx0 + 5, bz1 - 6], [bx1 - 5, gz0 + 4], [bx0 + 6, gz0 + 3]]) {
    const mm = chunk(x, z).vc;
    mm.geo(P_TAPER(0.4, 5), 0x2a2420, x, 3, z, 0, 0, 0, 0.6, 6, 0.6);
    for (let k = 0; k < 5; k++) { const a = rnd() * TAU, l = rnd.range(1.6, 2.8); mm.geo(P_TAPER(0.3, 4), 0x2a2420, x + Math.cos(a) * l * 0.4, rnd.range(3.5, 5.5), z + Math.sin(a) * l * 0.4, Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9, 0.18, l, 0.18); }
    addCircle(x, z, 0.35, 6);
  }
  // iron fence on three sides of the graveyard, with a gate on the east avenue
  const fence = (ax, az, bx, bz, gate) => {
    const l = dist(ax, az, bx, bz), dx = (bx - ax) / l, dz = (bz - az) / l, mm = chunk((ax + bx) / 2, (az + bz) / 2).vc;
    for (let t = 0; t < l; t += 0.45) { const x = ax + dx * t, z = az + dz * t; if (gate && dist(x, z, gate[0], gate[1]) < 2) continue; mm.box(x, 0.85, z, 0.06, 1.7, 0.06, 0x1a1a1c); }
    mm.box((ax + bx) / 2, 1.55, (az + bz) / 2, Math.abs(bx - ax) + 0.06, 0.06, Math.abs(bz - az) + 0.06, 0x1a1a1c);
  };
  fence(bx0 + 2.6, gz0 - 2, bx0 + 2.6, bz1 - 2.6); fence(bx0 + 2.6, bz1 - 2.6, bx1 - 2.6, bz1 - 2.6, [cx, bz1 - 2.6]); fence(bx1 - 2.6, gz0 - 2, bx1 - 2.6, bz1 - 2.6, [bx1 - 2.6, (gz0 + bz1) / 2]);
  addPoi('grave', cx + 8, gz0 + 8, 0); addPoi('grave', cx - 10, bz1 - 12, 0.5);
}

function schoolBlock(bx0, bz0, bx1, bz1, rnd) {
  const cx = (bx0 + bx1) / 2, w = 40, d = 14, h = 7.5, cz = bz1 - 6 - d / 2;
  const m = chunk(cx, cz).vc, g = chunk(cx, cz).glow;
  m.box(cx, h / 2, cz, w, h, d, C.brick);
  m.box(cx, h + 0.3, cz, w + 0.3, 0.6, d + 0.3, 0xd8d0c0);
  addBox(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h, { kind: 'school' });
  for (let x = -w / 2 + 3; x < w / 2 - 2; x += 3.4) for (const y of [2, 5.4]) {
    if (Math.abs(x) < 2.5 && y < 3) continue;
    const lit = rnd.chance(0.12); (lit ? g : m).box(cx + x, y, cz + d / 2 + 0.03, 2.2, 1.8, 0.06, lit ? 0xd8f0ff : C.dark);
  }
  const door = addDoor(cx, 1.6, cz + d / 2 + 0.05, 2.2, 2.4, 0, 0x6a3a2a);
  addRefuge({ kind: 'school', x: cx, z: cz + d / 2 + 0.05, ax: cx, az: bz1 - 1, nx: 0, nz: 1, ix: cx, iz: cz, door, cap: 10, name: 'the school' });
  const sb = boardTex(['PINE HOLLOW HIGH'], { w: 512, h: 80, bg: '#e8e0c8' });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.6), new THREE.MeshBasicMaterial({ map: sb })); sp.position.set(cx, h - 1, cz + d / 2 + 0.05); R.scene.add(sp); TOWN.signs.push(sp);
  addLight(cx, 3.2, cz + d / 2 + 2, 0xffe8c0, 0.9, 10, 4);
  m.geo(P_CYL(6), 0xb8b8b8, cx + 14, 5, bz1 - 3, 0, 0, 0, 0.12, 10, 0.12);
  m.box(cx + 14.9, 9.2, bz1 - 3, 1.6, 1, 0.04, 0xc03030);
  // the football field and bleachers behind
  groundQuad(bx0 + 4, bz0 + 4, bx1 - 4, cz - d / 2 - 3, 0.025, 0x3a6a2e);
  for (let x = bx0 + 8; x < bx1 - 4; x += 8) groundQuad(x - 0.1, bz0 + 4, x + 0.1, cz - d / 2 - 3, 0.03, 0xd8d8c8);
  for (let k = 0; k < 4; k++) m.box(cx, 0.4 + k * 0.5, bz0 + 5 + k * 0.8, 24, 0.12, 0.6, 0x9a8a6a);
  // the water tower
  const tx = bx1 - 2, tz = bz0 + 2;
  for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { m.geo(P_CYL(5), 0x8a8a90, tx + a * 0.8, 11, tz + b * 0.8, -b * 0.04, 0, a * 0.04, 0.4, 22, 0.4); addCircle(tx + a * 0.8, tz + b * 0.8, 0.3, 22, 'pole'); }
  m.geo(P_CYL(14), 0xa8acb4, tx, 26, tz, 0, 0, 0, 10, 7, 10);
  m.geo(P_CONE(14), 0x8a8e96, tx, 31.2, tz, 0, 0, 0, 10.6, 3.4, 10.6);
  addBox(tx - 5, tz - 5, tx + 5, tz + 5, 29.5, { y0: 22.5, kind: 'tower', noSight: true });
  const wt = boardTex(['PINE HOLLOW'], { w: 512, h: 96, bg: '#a8acb4', ink: '#2a2a6a' });
  const wp = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.6), new THREE.MeshBasicMaterial({ map: wt })); wp.position.set(tx - 3.6, 26.5, tz + 3.6); wp.rotation.y = -Math.PI / 4; R.scene.add(wp); TOWN.signs.push(wp);
  GB(tx, 33, tz, 0.4, 0.4, 0.4, 0xff2020);
}

function parkBlock(bx0, bz0, bx1, bz1, rnd) {
  const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
  groundQuad(cx - 1.2, bz0 + 2.5, cx + 1.2, bz1 - 2.5, 0.03, 0x9a8a70); groundQuad(bx0 + 2.5, cz - 1.2, bx1 - 2.5, cz + 1.2, 0.03, 0x9a8a70);
  // pond
  const px = cx + 12, pz = cz + 12;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(7.5, 20).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x0a1a2a }));
  pond.position.set(px, 0.04, pz); R.scene.add(pond);
  const pm = chunk(px, pz).vc; pm.geo(new THREE.TorusGeometry(7.7, 0.3, 4, 24).rotateX(Math.PI / 2), 0x6a6a60, px, 0.05, pz);
  // bandstand
  const bx = cx - 10, bz = cz - 10, m = chunk(bx, bz).vc;
  m.geo(P_CYL(8), 0xe8e4da, bx, 0.4, bz, 0, 0, 0, 9, 0.8, 9);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; m.geo(P_CYL(5), 0xf4f0e6, bx + Math.cos(a) * 4.2, 2.2, bz + Math.sin(a) * 4.2, 0, 0, 0, 0.2, 3, 0.2); }
  m.geo(P_CONE(8), 0xb83030, bx, 4.6, bz, 0, 0, 0, 10, 2.4, 10);
  addBox(bx - 4.5, bz - 4.5, bx + 4.5, bz + 4.5, 0.8, { kind: 'stand', noSight: true, noCam: true });
  addLight(bx, 3.4, bz, 0xffe0a0, 1.0, 12, 6);
  for (let i = 0; i < 4; i++) addPoi('park', bx + rnd.range(-3, 3), bz + rnd.range(-3, 3), rnd() * TAU, { y: 0.8 });
  addPoi('park', px - 8, pz, 0); addPoi('park', px, pz - 9, 0);
  for (const [x, z, r] of [[cx - 6, cz + 3, 0], [cx + 3, cz - 6, Math.PI / 2], [cx + 3, cz + 6, -Math.PI / 2]]) addProp('bench', x, z, r);
  for (let i = 0; i < 9; i++) { const x = rnd.range(bx0 + 4, bx1 - 4), z = rnd.range(bz0 + 4, bz1 - 4); if (dist(x, z, px, pz) > 10 && dist(x, z, bx, bz) > 7 && Math.abs(x - cx) > 2.5 && Math.abs(z - cz) > 2.5) tree(x, z, rnd, rnd.range(1, 1.4)); }
  lamp(cx + 2, cz + 2, 0, 0); lamp(cx - 2, bz1 - 6, 0, 0);
}

function motelBlock(bx0, bz0, bx1, bz1, rnd) {
  lotPaint(bx0 + 3, bz0 + 3, bx1 - 3, bz1 - 14, [bz0 + 22]);
  // a row of rooms along the back, doors facing the lot
  const z0 = bz1 - 13, d = 9, h = 3.4, m = chunk((bx0 + bx1) / 2, z0).vc, g = chunk((bx0 + bx1) / 2, z0).glow;
  const x0 = bx0 + 3, x1 = bx1 - 3;
  m.box((x0 + x1) / 2, h / 2, z0 + d / 2, x1 - x0, h, d, 0xe8c8a0);
  m.box((x0 + x1) / 2, h + 0.15, z0 + d / 2 - 0.6, x1 - x0 + 0.6, 0.3, d + 1.4, 0x5a3a2a);
  addBox(x0, z0, x1, z0 + d, h, { kind: 'motel' });
  const n = 9, rw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const x = x0 + rw * (i + 0.5);
    const door = addDoor(x - 1, 1.15, z0 - 0.05, 0.95, 2.1, Math.PI, [0x2a7a8a, 0xd06a3a][i % 2]);
    const lit = rnd.chance(0.5);
    (lit ? g : m).box(x + 1.2, 1.5, z0 - 0.03, 1.6, 1.1, 0.06, lit ? C.lit : C.dark);
    addRefuge({ kind: 'motel', x: x - 1, z: z0 - 0.05, ax: x - 1, az: z0 - 3, nx: 0, nz: -1, ix: x - 1, iz: z0 + 3, door, cap: 3, name: 'room ' + (i + 1) });
    if (i % 3 === 1) addLight(x, 2.8, z0 - 1.2, 0xffd890, 0.7, 8, 3.5);
  }
  // the office and its sign
  const ox = bx1 - 9, oz = bz0 + 9;
  m.box(ox, 1.8, oz, 8, 3.6, 6, 0xe8c8a0); m.box(ox, 3.75, oz, 9, 0.3, 7, 0x5a3a2a);
  addBox(ox - 4, oz - 3, ox + 4, oz + 3, 3.6, { kind: 'motel' });
  g.box(ox + 1.5, 1.6, oz - 3.03, 3, 1.4, 0.06, C.shopLit);
  const door = addDoor(ox - 2, 1.15, oz - 3.05, 1.0, 2.1, Math.PI, 0x5a3a2a);
  addRefuge({ kind: 'motel', x: ox - 2, z: oz - 3.05, ax: ox - 2, az: bz0 + 1, nx: 0, nz: -1, ix: ox, iz: oz, door, cap: 4, name: 'the motel office' });
  m.geo(P_CYL(6), C.pole, bx1 - 3, 4, bz0 + 3, 0, 0, 0, 0.3, 8, 0.3);
  neon('MOTEL', '#ff7a2a', bx1 - 3, 7.4, bz0 + 3, -Math.PI / 4, 2.2, { ds: true });
  neon('VACANCY', '#ff2a4a', bx1 - 3, 5.7, bz0 + 3, -Math.PI / 4, 1.1, { ds: true });
  addLight(bx1 - 3, 6, bz0 + 4, 0xff7a3a, 1.0, 14);
  addLight((x0 + x1) / 2, 4, bz0 + 18, 0xffe0b0, 0.8, 16, 7);
  for (let i = 0; i < 3; i++) parkCar(x0 + 6 + i * 12 + rnd.range(-2, 2), z0 - 5.5, 0, {});
  addPoi('motel', ox - 2, oz - 5, 0); addPoi('motel', x0 + 10, z0 - 2.5, Math.PI);
}

function gasBlock(bx0, bz0, bx1, bz1, rnd) {
  groundQuad(bx0 + 2.5, bz0 + 2.5, bx1 - 2.5, bz0 + 30, 0.03, 0x3a3a40);
  const cx = bx0 + 18, cz = bz0 + 14, m = chunk(cx, cz).vc, g = chunk(cx, cz).glow;
  // canopy and pumps
  for (const [a, b] of [[-6, -3], [6, -3], [-6, 3], [6, 3]]) { m.box(cx + a, 2.3, cz + b, 0.4, 4.6, 0.4, 0xf0f0f0); addCircle(cx + a, cz + b, 0.3, 4.6, 'pole'); }
  m.box(cx, 4.8, cz, 15, 0.5, 9, 0xf0f0f0); m.box(cx, 4.5, cz, 15.2, 0.25, 9.2, 0xd02a2a);
  g.box(cx, 4.53, cz, 13, 0.06, 7, 0xf8fff0);
  addBox(cx - 7.5, cz - 4.5, cx + 7.5, cz + 4.5, 5.05, { y0: 4.5, kind: 'canopy', noSight: true, noCam: true });
  for (const a of [-3, 3]) { m.box(cx + a, 0.12, cz, 1.4, 0.24, 6, 0x8a8478); for (const b of [-1.5, 1.5]) { m.box(cx + a, 0.95, cz + b, 0.7, 1.5, 0.5, 0xd02a2a); g.box(cx + a, 1.95, cz + b, 0.5, 0.5, 0.52, 0xfff0d0); addCircle(cx + a, cz + b, 0.4, 2, 'pump'); } }
  addLight(cx, 4.2, cz, 0xf0f4ff, 1.8, 22, 10);
  // the garage
  const gx = bx1 - 13, gz = bz0 + 12, w = 14, d = 10, h = 4.6;
  m.box(gx, h / 2, gz, w, h, d, 0xf0ece0); m.box(gx, h + 0.25, gz, w + 0.2, 0.5, d + 0.2, 0xd02a2a);
  addBox(gx - w / 2, gz - d / 2, gx + w / 2, gz + d / 2, h, { kind: 'garage' });
  for (const a of [-4, 0.5]) g.box(gx + a, 1.7, gz - d / 2 - 0.03, 3.6, 3.2, 0.06, 0xe0e8ff);
  const door = addDoor(gx + 4.8, 1.15, gz - d / 2 - 0.05, 1.0, 2.1, Math.PI, 0x2a4a6a);
  addRefuge({ kind: 'garage', x: gx + 4.8, z: gz - d / 2 - 0.05, ax: gx + 4.8, az: gz - d / 2 - 3, nx: 0, nz: -1, ix: gx + 4.8, iz: gz, door, cap: 4, name: 'the garage' });
  m.geo(P_CYL(6), C.pole, bx1 - 3, 4.5, bz0 + 3, 0, 0, 0, 0.3, 9, 0.3);
  neon('GAS', '#ff3030', bx1 - 3, 8.2, bz0 + 3, 0, 2.6, { ds: true, bg: 'rgba(250,250,240,0.92)', core: '#ff3030' });
  addPoi('gas', cx - 3, cz + 2, 0); addPoi('gas', cx + 3, cz - 2, 0); addPoi('gas', gx - 2, gz - d / 2 - 2, Math.PI);
  parkCar(cx - 3, cz, 0, {}); parkCar(gx - 4, gz - d / 2 - 4, Math.PI, {});
  addProp('can', bx1 - 6, bz0 + 4, 0);
  // trees out back
  for (let i = 0; i < 4; i++) tree(rnd.range(bx0 + 5, bx1 - 5), rnd.range(bz0 + 34, bz1 - 4), rnd);
}

function driveIn(rnd) {
  const r = DRIVEIN, cx = (r.x0 + r.x1) / 2;
  groundQuad(r.x0, r.z0, r.x1, r.z1, 0.03, 0x3a362e);
  groundQuad(-25, -202, r.x0, -194, 0.03, C.asphalt);
  // the screen at the north end, facing the cars
  const sw = 36, sh = 16, sy = 4, sz = r.z0 + 4, m = chunk(cx, sz).vc;
  m.box(cx, sy + sh / 2, sz - 0.6, sw + 2, sh + 2, 1, 0x4a4a50);
  for (const a of [-14, -5, 5, 14]) m.box(cx + a, (sy + sh) / 2, sz - 1.6, 0.6, sy + sh, 0.6, 0x3a3a40);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: TEX.movie, fog: false }));
  screen.position.set(cx, sy + sh / 2, sz - 0.05); R.scene.add(screen);
  TOWN.screen = screen;
  addBox(cx - sw / 2 - 1, sz - 2, cx + sw / 2 + 1, sz, sy + sh + 1, { kind: 'screen' });
  addLight(cx, 8, sz + 14, 0xc8d8ff, 1.4, 50);
  // rows of cars facing the screen, with speaker posts
  let n = 0;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
    const x = r.x0 + 12 + i * 12, z = sz + 26 + row * 14;
    m.box(x - 2.4, 0.6, z - 1.6, 0.12, 1.2, 0.12, 0x6a6a70);
    if (rnd.chance(0.6)) { parkCar(x, z, 0, { lot: 'drivein', occ: rnd.int(1, 2) }); n++; }
  }
  // snack bar and projection booth
  const bx = cx, bz = r.z1 - 14;
  m.box(bx, 1.9, bz, 12, 3.8, 7, 0xe8e0c8); m.box(bx, 4, bz, 12.6, 0.4, 7.6, 0xd03a3a);
  addBox(bx - 6, bz - 3.5, bx + 6, bz + 3.5, 3.8, { kind: 'snack' });
  chunk(bx, bz).glow.box(bx - 1.5, 1.8, bz - 3.53, 6, 1.4, 0.06, 0xfff0c0); chunk(bx, bz).glow.box(bx, 3, bz - 3.53, 1, 0.6, 0.06, 0xffffff);
  const door = addDoor(bx + 4, 1.15, bz - 3.55, 1.0, 2.1, Math.PI, 0x8a2a2a);
  addRefuge({ kind: 'snack', x: bx + 4, z: bz - 3.55, ax: bx + 4, az: bz - 6, nx: 0, nz: -1, ix: bx + 2, iz: bz, door, cap: 6, name: 'the snack bar' });
  addLight(bx, 3, bz - 5, 0xffe0b0, 1.0, 12, 6);
  for (let i = 0; i < 3; i++) addPoi('drivein', bx - 3 + i * 2, bz - 5.5, Math.PI);
  // the sign by the road
  const sx = -24, szz = -186, mm = chunk(sx, szz).vc;
  mm.geo(P_CYL(6), C.pole, sx, 3.5, szz, 0, 0, 0, 0.4, 7, 0.4);
  neon('STARLITE', '#ffd040', sx, 8.2, szz, Math.PI / 2, 2.6, { ds: true }); neon('DRIVE-IN', '#40d0ff', sx, 6.4, szz, Math.PI / 2, 1.5, { ds: true });
  addLight(sx, 7, szz, 0xffd040, 1.0, 16);
}

function loversLane(rnd) {
  // a gravel turnout at the top of the south hill, three cars parked looking back at the town
  const cx = 90, cz = 228;
  for (const [x, z] of [[82, 230], [90, 233], [98, 230]]) parkCar(x, z, Math.PI, { lot: 'lovers', occ: 2, y: terrainH(x, z) });
  const m = chunk(cx, cz).vc;
  m.box(cx, terrainH(cx, cz + 7) + 0.5, cz + 7, 18, 0.2, 0.2, C.wood);
  for (const a of [-8, 0, 8]) m.box(cx + a, terrainH(cx + a, cz + 7) + 0.35, cz + 7, 0.2, 0.7, 0.2, C.wood);
  const sb = boardTex(['LOOKOUT POINT'], { w: 512, h: 96, bg: '#6a4a2e', ink: '#f0e0b0' });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8), new THREE.MeshBasicMaterial({ map: sb })); sp.position.set(84, terrainH(84, 220) + 1.8, 220); sp.rotation.y = Math.PI / 2; R.scene.add(sp); TOWN.signs.push(sp);
  m.box(84, terrainH(84, 220) + 0.8, 220, 0.15, 1.6, 0.15, C.wood);
}

function outskirts(rnd) {
  // woods: pines and oaks, kept off the roads and lots
  const pine = new Mesher(), oak = new Mesher();
  pine.geo(P_CYL(5), 0x3a2a1c, 0, 1, 0, 0, 0, 0, 0.35, 2, 0.35);
  pine.geo(P_CONE(7), 0x1e3a24, 0, 3.6, 0, 0, 0, 0, 4.2, 4.4, 4.2); pine.geo(P_CONE(7), 0x24442a, 0, 5.8, 0, 0, 0.4, 0, 3.2, 3.6, 3.2); pine.geo(P_CONE(6), 0x2a4a2e, 0, 7.6, 0, 0, 0.2, 0, 2, 2.6, 2);
  oak.geo(P_CYL(5), 0x3a2a1c, 0, 1.5, 0, 0, 0, 0, 0.45, 3, 0.45);
  oak.geo(P_SPH(7, 5), 0x2a4422, 0, 4.4, 0, 0, 0, 0, 5, 4, 5); oak.geo(P_SPH(6, 4), 0x30502a, 0.8, 5.8, 0.4, 0, 0, 0, 3.4, 2.8, 3.4);
  const pts = { pine: [], oak: [] };
  for (let x = -380; x < 380; x += 8.5) for (let z = -380; z < 380; z += 8.5) {
    const px = x + rnd.range(-3.5, 3.5), pz = z + rnd.range(-3.5, 3.5);
    const ox = Math.abs(px) - TOWN_HX, oz = Math.abs(pz) - TOWN_HZ;
    if (ox < 10 && oz < 10) continue;
    if (rectDist(px, pz, DRIVEIN) < 8 || inCorn(px, pz) || rectDist(px, pz, CORN) < 4) continue;
    const dr = Math.min(segDist(px, pz, -480, 0, 480, 0), segDist(px, pz, -30, -480, -30, -TOWN_HZ), segDist(px, pz, 90, TOWN_HZ, 90, 245));
    if (dr < 9) continue;
    if (dist(px, pz, HILL.x, HILL.z - 4) < 22) continue;
    if (!rnd.chance(0.5 + vnoise(px / 50, pz / 50, 9) * 0.4)) continue;
    pts[rnd.chance(0.65) ? 'pine' : 'oak'].push([px, pz, rnd.range(0.8, 1.35), rnd() * TAU]);
  }
  for (const l of [pts.pine, pts.oak]) for (const [x, z, s] of l) if (dist(x, z, 0, 0) < 330) addCircle(x, z, 0.4 * s, 9 * s);
  TOWN.pines = instChunks(pine.build(), pts.pine, 120, -0.2); TOWN.oaks = instChunks(oak.build(), pts.oak, 120, -0.2);
  // the cornfield: clumps of stalks
  const corn = new Mesher();
  for (let k = 0; k < 2; k++) {
    const a = k * 1.9, ox = Math.cos(a) * 0.4, oz = Math.sin(a) * 0.4;
    corn.box(ox, 1.2, oz, 0.1, 2.4, 0.1, 0x6a7a3a, a);
    corn.box(ox, 1.5, oz, 1.2, 0.04, 0.18, 0x5a6a30, a); corn.box(ox, 2.0, oz, 0.18, 0.04, 1.0, 0x6a7a34, a);
  }
  const cl = [];
  for (let x = CORN.x0 + 1; x < CORN.x1 - 1; x += 1.9) for (let z = CORN.z0 + 1; z < CORN.z1 - 1; z += 1.5) cl.push([x + rnd.range(-0.3, 0.3), z + rnd.range(-0.25, 0.25), rnd.range(0.85, 1.15), rnd() * TAU]);
  TOWN.corn = instChunks(corn.build(), cl, 50, 0);
  // a scarecrow and a farmhouse by the corn
  const fx = -246, fz = 162, m = chunk(fx, fz).vc;
  m.box(fx, 3, fz, 10, 6, 8, 0xc8b8a0); m.gable(fx, 6, fz, 10, 8, 2.6, 0x5a3a2a, 0, 0.5, false, 0xc8b8a0);
  addBox(fx - 5, fz - 4, fx + 5, fz + 4, 6, { ridge: 2.6, kind: 'farm' });
  const door = addDoor(fx, 1.15, fz - 4.05, 1.0, 2.1, Math.PI, 0x6a2a1a);
  chunk(fx, fz).glow.box(fx + 2.8, 1.8, fz - 4.03, 1.2, 1.2, 0.06, C.lit);
  addRefuge({ kind: 'house', x: fx, z: fz - 4.05, ax: fx, az: fz - 7, nx: 0, nz: -1, ix: fx, iz: fz, door, cap: 5, name: 'the farmhouse' });
  addLight(fx + 1, 2.3, fz - 4.4, 0xffc070, 0.9, 9, 3.2);
  addPoi('farm', fx - 3, fz - 7, Math.PI);
  roadStrip(fx, fz - 7, fx, 0, 4, 0x4a4030);
  const sc = chunk(-240, 100).vc; sc.box(-240, 1.5, 100, 0.12, 3, 0.12, C.wood); sc.box(-240, 2.3, 100, 1.8, 0.12, 0.12, C.wood); sc.box(-240, 2.1, 100, 0.6, 0.9, 0.3, 0x6a5a8a); sc.geo(P_SPH(6, 4), 0xc8a860, -240, 2.85, 100, 0, 0, 0, 0.45, 0.45, 0.45); sc.geo(P_CONE(6), 0x6a4a2a, -240, 3.2, 100, 0, 0, 0, 0.9, 0.4, 0.9);
}

// instanced copies of one geometry, split into square tiles so each tile can be culled on its own
function instChunks(geom, list, tile, yo) {
  const groups = new Map(), o = new THREE.Object3D(), out = [];
  for (const it of list) { const k = Math.floor(it[0] / tile) + ',' + Math.floor(it[1] / tile); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
  for (const g of groups.values()) {
    const im = new THREE.InstancedMesh(geom, MATS.vc, g.length);
    g.forEach(([x, z, s, r], i) => { o.position.set(x, terrainH(x, z) + yo, z); o.rotation.set(0, r, 0); o.scale.set(s, s * (0.9 + ((i * 7919) % 13) / 40), s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    // a bounding sphere around just this tile
    let cx = 0, cz = 0; for (const it of g) { cx += it[0]; cz += it[1]; } cx /= g.length; cz /= g.length;
    let r = 0; for (const it of g) r = Math.max(r, dist(it[0], it[1], cx, cz));
    im.geometry = geom.clone(); im.geometry.boundingSphere = new THREE.Sphere(new V3(cx, terrainH(cx, cz) + 4, cz), r + 12);
    im.frustumCulled = true;
    R.scene.add(im); out.push(im);
  }
  return out;
}
function finishTown() {
  for (const c of TOWN.chunks.values()) {
    if (!c.vc.empty) R.scene.add(new THREE.Mesh(c.vc.build(), MATS.vc));
    if (!c.glow.empty) R.scene.add(new THREE.Mesh(c.glow.build(), MATS.glow));
  }
  // doors
  {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff }), INST.doors.length);
    INST.doors.forEach((d) => { setDoorMatrix(im, d); im.setColorAt(d.i, _col.setHex(d.col)); });
    im.instanceColor.needsUpdate = true;
    R.scene.add(im); TOWN.doorIM = im;
  }
  // lamp heads and light pools
  {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), INST.heads.length), o = new THREE.Object3D();
    INST.heads.forEach((h) => { o.position.set(h.hx, h.y, h.hz); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); im.setMatrixAt(h.i, o.matrix); });
    R.scene.add(im); TOWN.headIM = im;
    const pm = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.glow, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }), INST.pools.length);
    INST.pools.forEach((p) => { o.position.set(p.x, p.y, p.z); o.scale.set(p.r, 1, p.r); o.updateMatrix(); pm.setMatrixAt(p.i, o.matrix); pm.setColorAt(p.i, _col.setHex(p.col)); });
    if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
    pm.renderOrder = 1;
    R.scene.add(pm); TOWN.poolIM = pm;
  }
  // props
  TOWN.propIM = {};
  for (const kind of Object.keys(INST.props)) {
    const list = INST.props[kind]; if (!list.length) continue;
    const im = new THREE.InstancedMesh(propGeo(kind), MATS.vc, list.length), o = new THREE.Object3D();
    list.forEach((p) => { o.position.set(p.x, p.y, p.z); o.rotation.set(0, p.ry, 0); o.scale.set(1, 1, 1); o.updateMatrix(); im.setMatrixAt(p.i, o.matrix); });
    R.scene.add(im); TOWN.propIM[kind] = im;
  }
  indexLights();
  TOWN.built = true;
}
function setDoorMatrix(im, d) {
  const o = new THREE.Object3D();
  o.position.set(d.x, d.y, d.z); o.rotation.set(0, d.ry, 0); o.scale.set(d.broken ? 0.001 : d.w, d.broken ? 0.001 : d.h, 0.12); o.updateMatrix();
  im.setMatrixAt(d.i, o.matrix); im.instanceMatrix.needsUpdate = true;
}
const _propGeo = {};
function propGeo(kind) {
  if (_propGeo[kind]) return _propGeo[kind];
  const m = new Mesher();
  if (kind === 'can') { m.geo(P_CYL(8), 0x8a9098, 0, 0.45, 0, 0, 0, 0, 0.6, 0.9, 0.6); m.geo(P_CYL(8), 0x9aa0a8, 0, 0.94, 0, 0, 0, 0, 0.66, 0.08, 0.66); m.box(0, 1.0, 0, 0.2, 0.06, 0.06, 0x6a7078); }
  else if (kind === 'bench') { m.box(0, 0.45, 0, 1.8, 0.08, 0.5, C.wood); m.box(0, 0.8, 0.24, 1.8, 0.4, 0.06, C.wood); for (const s of [-0.8, 0.8]) m.box(s, 0.22, 0, 0.08, 0.45, 0.5, 0x2a2a2a); }
  else if (kind === 'mailbox') { m.box(0, 0.5, 0, 0.5, 1.0, 0.5, 0x2a4a9a); m.geo(P_CYL(8), 0x2a4a9a, 0, 1.0, 0, Math.PI / 2, 0, 0, 0.5, 0.5, 0.5); }
  else { m.box(0, 0.7, 0, 2.2, 1.3, 1.3, 0x2a5a3a); m.box(0, 1.4, 0, 2.3, 0.1, 1.4, 0x1a3a2a); }
  return (_propGeo[kind] = m.build());
}
