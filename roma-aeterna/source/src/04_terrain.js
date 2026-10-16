// Roma Aeterna — terrain: the seven hills, the Tiber, the Campagna rising toward the Alban Hills.
// Heights are sampled once onto a 12 m grid; groundAt() interpolates the same triangles the mesh draws, so feet
// and pavements always sit exactly on the ground you see.

// The Forum frame: +u runs down the Forum from the Capitoline (WNW) toward the Arch of Titus (ESE),
// +v runs toward the Palatine (SSW). Most of the centre is laid out in it.
const FF = new Frame(0, 0, 30 * D2R);
const FFw = (u, v) => [FF.wx(u, v), FF.wz(u, v)];

const HILLS = [
  { name: 'Capitoline', F: FF.sub(-215, -10), au: 60, av: 115, fall: 45, h: 26 },
  { name: 'Palatine', F: FF.sub(70, 250), au: 165, av: 105, fall: 50, h: 27 },
  { name: 'Aventine', F: FF.sub(-90, 700), au: 190, av: 110, fall: 55, h: 24 },
  { name: 'Caelian', F: FF.sub(560, 260), au: 120, av: 140, fall: 55, h: 22 },
  { name: 'Oppian', F: FF.sub(470, -250), au: 130, av: 100, fall: 45, h: 17 },
  { name: 'Cispian', F: FF.sub(380, -480), au: 110, av: 90, fall: 50, h: 18 },
  { name: 'Viminal', F: FF.sub(170, -560), au: 120, av: 60, fall: 55, h: 16 },
  { name: 'Quirinal', F: FF.sub(-170, -380), au: 130, av: 75, fall: 50, h: 20 },
  { name: 'Velia', F: FF.sub(230, 30), au: 60, av: 40, fall: 40, h: 6 },
  { name: 'Pincian', F: new Frame(-250, -1250, 0.1), au: 420, av: 150, fall: 140, h: 30 },
  { name: 'Janiculum', F: new Frame(-1260, 250, 0.2), au: 120, av: 520, fall: 160, h: 46 },
  { name: 'Vatican', F: new Frame(-1350, -700, 0), au: 180, av: 160, fall: 140, h: 24 },
];
// sites cut level by the builders (y is the target height)
const FLATS = [
  { F: FF.sub(0, 0), au: 150, av: 52, fall: 30, y: 0 },
  { F: FF.sub(400, 0), au: 125, av: 108, fall: 30, y: 0 },
  { F: FF.sub(110, 480), au: 300, av: 72, fall: 25, y: 0 },
  { F: FF.sub(-170, -160), au: 125, av: 62, fall: 20, y: 0 },
  { F: FF.sub(-40, -170), au: 80, av: 55, fall: 20, y: 0 },
];
// Tiber centreline, north to south (world x, z)
const RIVER = [[-700, -1500], [-760, -950], [-930, -700], [-1010, -450], [-960, -250], [-800, -60], [-620, 120], [-560, 330], [-600, 650], [-680, 1000], [-760, 1400], [-840, 1900], [-900, 2900]];
const RIVER_HW = 42, WATER_Y = -2.4;
const ISLAND = { F: new Frame(-605, 135, Math.atan2(180, 160)), au: 105, av: 26 };

// The Via Appia leaves Porta Capena and runs out to Bovillae
const APPIA = [[130, 675], [380, 1100], [1723, 2443], [1900, 2620]];
const TOWN = { x: 1760, z: 2480 };

const T = { X0: -1450, Z0: -1450, X1: 2150, Z1: 2850, S: 12 };
T.NX = Math.round((T.X1 - T.X0) / T.S); T.NZ = Math.round((T.Z1 - T.Z0) / T.S);

function ellDist(F, au, av, x, z) {
  const u = F.lu(x, z), v = F.lv(x, z), e = Math.sqrt((u / au) * (u / au) + (v / av) * (v / av));
  if (e <= 1) return (e - 1) * Math.min(au, av);
  return (e - 1) * Math.hypot(u, v) / e;
}
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = clamp(t, 0, 1);
  const qx = ax + dx * t, qz = az + dz * t;
  return { d: Math.hypot(px - qx, pz - qz), t, qx, qz };
}
function polyDist(pts, x, z) {
  let best = 1e9, bi = 0, bt = 0;
  for (let i = 0; i < pts.length - 1; i++) { const r = segDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (r.d < best) { best = r.d; bi = i; bt = r.t; } }
  return { d: best, i: bi, t: bt };
}
const riverDist = (x, z) => polyDist(RIVER, x, z).d;
function urbanAt(x, z) {
  const a = 1 - smooth(-60, 160, ellDist(new Frame(-200, -150, 0), 1050, 950, x, z));
  const b = 1 - smooth(-60, 160, ellDist(new Frame(-980, 280, 0.2), 230, 430, x, z));
  const c = 1 - smooth(0, 120, polyDist(APPIA.slice(0, 2), x, z).d - 30);
  return Math.max(a, b, c * 0.8);
}

function rawHeight(x, z) {
  let h = Noise.fbm(x * 0.004, z * 0.004, 3) * 1.2;
  const camp = smooth(800, 1800, Math.hypot(x + 150, z - 100));
  h += camp * (Noise.fbm(x * 0.0018 + 40, z * 0.0018, 3) * 7 + 3);
  h += smooth(900, 3000, x * 0.6 + z * 0.8) * 24;
  let hill = 0;
  for (const H of HILLS) {
    const s = ellDist(H.F, H.au, H.av, x, z);
    if (s > H.fall) continue;
    const k = s <= 0 ? 1 : 1 - smooth(0, H.fall, s);
    const bump = s <= 0 ? Noise.s2(x * 0.01, z * 0.01) * 1.2 : 0;
    hill = Math.max(hill, H.h * k + bump * k);
  }
  h += hill;
  for (const L of FLATS) {
    const s = ellDist(L.F, L.au, L.av, x, z);
    if (s < L.fall) h = lerp(h, L.y, s <= 0 ? 1 : 1 - smooth(0, L.fall, s));
  }
  // the Tiber: cut a channel, then raise the island back out of it
  const rd = riverDist(x, z);
  if (rd < RIVER_HW + 26) {
    const bed = -6.5 + Math.pow(clamp(rd / RIVER_HW, 0, 1), 2) * 3.2;
    const k = rd < RIVER_HW ? 1 : 1 - smooth(RIVER_HW, RIVER_HW + 26, rd);
    h = lerp(h, Math.min(h, rd < RIVER_HW ? bed : -3.2), k);
    const is = ellDist(ISLAND.F, ISLAND.au, ISLAND.av, x, z);
    if (is < 14) h = Math.max(h, lerp(-0.6, bed, smooth(-6, 14, is)));
  }
  return h;
}

const HGRID = new Float32Array((T.NX + 1) * (T.NZ + 1));
function initHeights() {
  for (let j = 0; j <= T.NZ; j++) for (let i = 0; i <= T.NX; i++) HGRID[j * (T.NX + 1) + i] = rawHeight(T.X0 + i * T.S, T.Z0 + j * T.S);
}
function groundAt(x, z) {
  const fx = (x - T.X0) / T.S, fz = (z - T.Z0) / T.S;
  let i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0) i = 0; if (j < 0) j = 0; if (i >= T.NX) i = T.NX - 1; if (j >= T.NZ) j = T.NZ - 1;
  const ax = clamp(fx - i, 0, 1), az = clamp(fz - j, 0, 1), W = T.NX + 1;
  const h00 = HGRID[j * W + i], h10 = HGRID[j * W + i + 1], h01 = HGRID[(j + 1) * W + i], h11 = HGRID[(j + 1) * W + i + 1];
  return ax > az ? h00 + ax * (h10 - h00) + az * (h11 - h10) : h00 + az * (h01 - h00) + ax * (h11 - h01);
}
const inWater = (x, z) => groundAt(x, z) < WATER_Y - 0.4;
// highest and lowest ground under a footprint (for foundations)
function groundRange(F, u, v, w, d) {
  let lo = 1e9, hi = -1e9;
  for (let a = -0.5; a <= 0.5; a += 0.25) for (let b = -0.5; b <= 0.5; b += 0.25) {
    const g = groundAt(F.wx(u + a * w, v + b * d), F.wz(u + a * w, v + b * d)); if (g < lo) lo = g; if (g > hi) hi = g;
  }
  return [lo, hi];
}

// ---------- terrain mesh ----------
function terrainColor(x, z, h, slope) {
  if (h < WATER_Y - 0.2) return 0x6e6248;
  const n = Noise.fbm(x * 0.02, z * 0.02, 2), n2 = Noise.s2(x * 0.006 + 9, z * 0.006);
  const urb = urbanAt(x, z);
  let c;
  if (h < WATER_Y + 1.2) c = 0x7d6e50;
  else {
    const green = mixHex(0x6f8a45, 0x8f9a52, clamp(n2 * 0.5 + 0.5, 0, 1));
    const dry = mixHex(green, 0xa79a62, clamp(n * 0.8 + 0.2, 0, 0.7));
    c = mixHex(dry, mixHex(0x9c8866, 0x8a7a5c, clamp(n + 0.5, 0, 1)), urb * 0.85);
    if (slope > 0.45) c = mixHex(c, 0x8c7a5a, clamp((slope - 0.45) * 2, 0, 0.6));
  }
  return c;
}
function buildTerrain() {
  const TILE = 24, grp = new THREE.Group();
  const W = T.NX + 1;
  for (let tj = 0; tj < T.NZ; tj += TILE) for (let ti = 0; ti < T.NX; ti += TILE) {
    const gb = new GB(TILE * TILE * 6); gb.jit = 0.035;
    for (let j = tj; j < Math.min(T.NZ, tj + TILE); j++) for (let i = ti; i < Math.min(T.NX, ti + TILE); i++) {
      const x0 = T.X0 + i * T.S, z0 = T.Z0 + j * T.S, x1 = x0 + T.S, z1 = z0 + T.S;
      const h00 = HGRID[j * W + i], h10 = HGRID[j * W + i + 1], h01 = HGRID[(j + 1) * W + i], h11 = HGRID[(j + 1) * W + i + 1];
      const sl = Math.max(Math.abs(h10 - h00), Math.abs(h01 - h00), Math.abs(h11 - h10), Math.abs(h11 - h01)) / T.S;
      // same diagonal as groundAt: (00, 10, 11) and (00, 11, 01), wound to face up
      gb.tri(x0, h00, z0, x1, h11, z1, x1, h10, z0, terrainColor(x0 + 8, z0 + 4, (h00 + h10 + h11) / 3, sl));
      gb.tri(x0, h00, z0, x0, h01, z1, x1, h11, z1, terrainColor(x0 + 4, z0 + 8, (h00 + h01 + h11) / 3, sl));
    }
    const mesh = new THREE.Mesh(gb.geometry(), R.mat.vc);
    mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
    grp.add(mesh);
  }
  R.scene.add(grp); R.terrain = grp;
  buildApron(); buildWater(); buildHorizon();
}
// Beyond the grid the land runs on, flattening out toward the distant hills: an apron round all four edges.
function buildApron() {
  const gb = new GB(12000); gb.jit = 0.03;
  const W1 = T.NX + 1, ring = [];
  for (let i = 0; i < T.NX; i++) ring.push([i, 0, 0, -1]);
  for (let j = 0; j < T.NZ; j++) ring.push([T.NX, j, 1, 0]);
  for (let i = T.NX; i > 0; i--) ring.push([i, T.NZ, 0, 1]);
  for (let j = T.NZ; j > 0; j--) ring.push([0, j, -1, 0]);
  const pts = ring.map(([i, j, nx, nz]) => {
    const x = T.X0 + i * T.S, z = T.Z0 + j * T.S, h = HGRID[j * W1 + i];
    // corners push out diagonally
    const cx = (i === 0 ? -1 : i === T.NX ? 1 : 0) || nx, cz = (j === 0 ? -1 : j === T.NZ ? 1 : 0) || nz;
    return { p: [x, h, z], m: [x + cx * 700, h * 0.6 + 4, z + cz * 700], q: [x + cx * 7000, -10, z + cz * 7000] };
  });
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    const c1 = terrainColor(a.m[0], a.m[2], a.m[1], 0), c2 = mixHex(c1, 0x8a9a6a, 0.3);
    _upQuad(gb, a.p, b.p, b.m, a.m, c1);
    _upQuad(gb, a.m, b.m, b.q, a.q, c2);
  }
  const mesh = new THREE.Mesh(gb.geometry(), R.mat.vc); mesh.receiveShadow = true;
  R.scene.add(mesh); R.apron = mesh;
}
function buildWater() {
  // a ribbon down the river, a little wider than the channel so the banks clip it
  const pos = [], idx = [];
  const pts = []; // resample the centreline every ~20 m
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 20);
    for (let k = 0; k < n; k++) pts.push([lerp(ax, bx, k / n), lerp(az, bz, k / n)]);
  }
  pts.push(RIVER[RIVER.length - 1]);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)];
    let dx = q[0] - p[0], dz = q[1] - p[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const w = RIVER_HW + 14;
    pos.push(pts[i][0] - dz * w, WATER_Y, pts[i][1] + dx * w, pts[i][0] + dz * w, WATER_Y, pts[i][1] - dx * w);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // make sure all normals point up
  const N = g.attributes.normal; for (let i = 0; i < N.count; i++) N.setXYZ(i, 0, 1, 0);
  const mesh = new THREE.Mesh(g, R.mat.water); mesh.receiveShadow = true; mesh.renderOrder = 1;
  R.scene.add(mesh); R.water = mesh;
}
// Ring of distant hills: the Sabines to the north-east, the Alban Hills to the south-east, the coast plain to the west.
function buildHorizon() {
  const gb = new GB(20000); gb.jit = 0;
  const cx = 300, cz = 700, N = 160;
  const prof = (a) => { // a: bearing in radians from north, clockwise
    const deg = ((a / D2R) % 360 + 360) % 360;
    let h = 60 + Noise.fbm(deg * 0.05, 3, 3) * 50;
    h += 520 * Math.exp(-Math.pow((deg - 55) / 28, 2)) * (0.7 + 0.5 * Noise.s2(deg * 0.12, 1));   // Sabine & Tiburtine hills
    h += 360 * Math.exp(-Math.pow((deg - 140) / 16, 2));  // Alban Hills
    h += 140 * Math.exp(-Math.pow((deg - 10) / 20, 2));   // Soracte / north
    h *= deg > 200 && deg < 330 ? 0.25 : 1;              // the coastal plain toward Ostia
    return Math.max(h, 30);
  };
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    for (const [r, k] of [[6200, 1], [7600, 1.35]]) {
      const h0 = prof(a0) * k, h1 = prof(a1) * k;
      const p0 = [cx + Math.sin(a0) * r, -30, cz - Math.cos(a0) * r], p1 = [cx + Math.sin(a1) * r, -30, cz - Math.cos(a1) * r];
      const t0 = [p0[0], h0, p0[2]], t1 = [p1[0], h1, p1[2]];
      const col = k > 1 ? 0x8a9db0 : 0x7d9095;
      gb.quad(p0, p1, t1, t0, col, [cx, 0, cz], -1);
    }
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, color: 0xffffff });
  const mesh = new THREE.Mesh(gb.geometry(), mat); mesh.renderOrder = -5;
  R.scene.add(mesh); R.horizon = mesh;
}
