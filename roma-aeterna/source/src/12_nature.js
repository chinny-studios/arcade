// Roma Aeterna — trees and fields: umbrella pines, cypresses, olives, planes, laurels, figs, vines and roses;
// wheat, beans, vineyards and olive groves in the Campagna.

function blob(gb, F, u, y, v, rx, ry, hex, seg = 6, rings = 2) {
  const S = F.sub(u, v, 0, F.y + y);
  K.dome(gb, S, 0, 0, 0, rx, seg, rings, hex, { squash: ry / rx });
  K.dome(gb, S, 0, 0, 0, rx, seg, rings, shadeHex(hex, 0.82), { squash: -ry / rx * 0.7 });
}
const TREE_COL = { pine: 0x3f5a2c, cypress: 0x2e4a2a, olive: 0x7d8a5e, oak: 0x4a6a32, plane: 0x5a7a38, laurel: 0x3e5e30, fig: 0x5a7a34, poplar: 0x5f7f3a, rose: 0x4a6a34 };
// one tree; trunk solid for the larger kinds. y: base height override (roof gardens, the mausoleum mound)
function treeAt(x, z, type = 'pine', s = 1, y = null) {
  const gy = y == null ? groundAt(x, z) : y;
  if (y == null && gy < WATER_Y + 0.3) return;
  const F = new Frame(x, z, hash2(x | 0, z | 0, 9) * TAU, gy);
  const gb = gbAt('tree', x, z); gb.jit = 0.1;
  const h = hash2(x | 0, z | 0, 4), k = s * (0.8 + h * 0.45);
  const col = shadeHex(TREE_COL[type] || 0x4a6a32, 0.9 + hash2(z | 0, x | 0, 2) * 0.22);
  const bark = 0x5e4a36;
  switch (type) {
    case 'pine': { // Pinus pinea: a tall bare trunk with a flat parasol crown
      const th = 9 * k;
      K.cyl(gb, F, 0, 0, 0, 0.32 * k, 0.22 * k, th, 5, 0x6a5440, { top: false });
      K.cyl(gb, F, 0.5 * k, th * 0.8, 0, 0.14 * k, 0.1 * k, 2.4 * k, 4, 0x6a5440, { top: false });
      blob(gb, F, 0, th, 0, 4.6 * k, 1.5 * k, col, 7, 2);
      blob(gb, F, 1.6 * k, th + 0.8 * k, 0.8 * k, 3.0 * k, 1.1 * k, shadeHex(col, 1.08), 6, 2);
      blob(gb, F, -1.8 * k, th + 0.4 * k, -0.6 * k, 2.6 * k, 1.0 * k, shadeHex(col, 0.95), 6, 2);
      solidCircle(x, z, 0.35 * k, gy, gy + th, true);
      break;
    }
    case 'cypress': {
      const th = 11 * k;
      K.cyl(gb, F, 0, 0, 0, 0.25 * k, 0.2 * k, 1.2 * k, 5, bark, { top: false });
      K.cyl(gb, F, 0, 0.8 * k, 0, 1.0 * k, 1.25 * k, th * 0.35, 6, col, { top: false });
      K.cyl(gb, F, 0, 0.8 * k + th * 0.35, 0, 1.25 * k, 0.05, th * 0.65, 6, col, { top: false });
      solidCircle(x, z, 0.6 * k, gy, gy + th, true);
      break;
    }
    case 'olive': {
      K.cyl(gb, F, 0, 0, 0, 0.32 * k, 0.24 * k, 1.6 * k, 5, 0x6a5a48, { top: false });
      K.box(gb, F, 0.3 * k, 1.4 * k, 0, 0.22 * k, 1.1 * k, 0.22 * k, 0x6a5a48, { ra: 0.6 });
      blob(gb, F, 0.2 * k, 2.2 * k, 0, 2.3 * k, 1.4 * k, col, 6, 2);
      blob(gb, F, -0.9 * k, 2.8 * k, 0.6 * k, 1.5 * k, 1.0 * k, shadeHex(col, 1.08), 5, 2);
      solidCircle(x, z, 0.3 * k, gy, gy + 2, true);
      break;
    }
    case 'plane': case 'oak': case 'poplar': {
      const tall = type === 'poplar';
      const th = (tall ? 4 : 3.4) * k;
      K.cyl(gb, F, 0, 0, 0, 0.4 * k, 0.3 * k, th, 5, type === 'plane' ? 0x8a7a62 : bark, { top: false });
      if (tall) { blob(gb, F, 0, th + 3 * k, 0, 2.0 * k, 5 * k, col, 6, 2); }
      else {
        blob(gb, F, 0, th + 2.2 * k, 0, 4.2 * k, 3.0 * k, col, 7, 2);
        blob(gb, F, 1.8 * k, th + 3.6 * k, 1.0 * k, 2.8 * k, 2.0 * k, shadeHex(col, 1.08), 6, 2);
      }
      solidCircle(x, z, 0.42 * k, gy, gy + th, true);
      break;
    }
    case 'laurel': case 'fig': {
      K.cyl(gb, F, 0, 0, 0, 0.18 * k, 0.14 * k, 1.2 * k, 5, bark, { top: false });
      blob(gb, F, 0, 2.0 * k, 0, (type === 'fig' ? 2.6 : 1.9) * k, 1.6 * k, col, 6, 2);
      solidCircle(x, z, 0.25 * k, gy, gy + 1.5, true);
      break;
    }
    case 'rose': {
      blob(gb, F, 0, 0.35 * k, 0, 0.6 * k, 0.45 * k, col, 5, 1);
      for (let i = 0; i < 4; i++) K.box(gb, F, Math.cos(i * 1.7) * 0.4 * k, 0.6 * k, Math.sin(i * 1.7) * 0.4 * k, 0.14, 0.14, 0.14, 0xd8607a);
      break;
    }
    case 'vine': { // a vine trained on a stake, with a little crossbar
      K.box(gb, F, 0, 0, 0, 0.1, 1.9, 0.1, C.wood);
      K.box(gb, F, 0, 1.7, 0, 1.6, 0.08, 0.08, C.wood);
      blob(gb, F, 0, 1.4, 0, 0.9, 0.6, 0x5a7a2e, 5, 1);
      break;
    }
  }
}

// a cultivated plot following the ground: kinds 'wheat', 'green', 'plough', 'vines', 'olives', 'garden'
function field(F, u, v, w, d, kind) {
  const gb = gbF('city', F);
  const n = Math.max(1, Math.round(w / 8)), m = Math.max(1, Math.round(d / 8));
  const base = { wheat: 0xc9b062, green: 0x7f9a46, plough: 0x8a6a48, vines: 0x8a7a50, olives: 0x9a8a5c, garden: 0x6f8a40, fallow: 0x9fa060 }[kind] || 0x8a9a50;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const u0 = u - w / 2 + i * w / n, u1 = u0 + w / n, v0 = v - d / 2 + j * d / m, v1 = v0 + d / m;
    const P = (a, b) => { const x = F.wx(a, b), z = F.wz(a, b); return [x, groundAt(x, z) + 0.05, z]; };
    const stripe = kind === 'plough' || kind === 'garden' ? (j % 2 ? 0.88 : 1.04) : 0.95 + hash2(i, j, 13) * 0.1;
    _upQuad(gb, P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), shadeHex(base, stripe));
  }
  if (kind === 'vines') for (let a = -w / 2 + 1.5; a < w / 2; a += 2.6) for (let b = -d / 2 + 1.5; b < d / 2; b += 2.2) treeAt(F.wx(u + a, v + b), F.wz(u + a, v + b), 'vine');
  if (kind === 'olives') for (let a = -w / 2 + 4; a < w / 2; a += 9) for (let b = -d / 2 + 4; b < d / 2; b += 9) treeAt(F.wx(u + a + rnd(-1, 1), v + b + rnd(-1, 1)), F.wz(u + a + rnd(-1, 1), v + b + rnd(-1, 1)), 'olive');
  if (kind === 'wheat') { // standing stalks: a few low ridges catch the light
    for (let b = -d / 2 + 1; b < d / 2; b += 3) {
      const P = (a, h) => { const x = F.wx(u + a, v + b), z = F.wz(u + a, v + b); return [x, groundAt(x, z) + h, z]; };
      gbF('ds', F).quad(P(-w / 2 + 1, 0.05), P(w / 2 - 1, 0.05), P(w / 2 - 1, 0.7), P(-w / 2 + 1, 0.7), 0xd2b86a, null); // seen from both sides
    }
  }
  reserve(F, u, v, w, d, 0);
  mapRect(F, u, v, w, d, { wheat: '#d8c88a', green: '#a8b878', plough: '#b09a78', vines: '#a8a070', olives: '#a8aa80', garden: '#98b070' }[kind] || '#b0b888');
}
// a dry-stone field wall along local points
function fieldWall(F, u0, v0, u1, v1) {
  const gb = gbF('prop', F), L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(L / 6));
  for (let i = 0; i < n; i++) {
    const a = lerp(u0, u1, (i + 0.5) / n), b = lerp(v0, v1, (i + 0.5) / n);
    const S = site(F, a, b, Math.atan2(v1 - v0, u1 - u0));
    K.box(gb, S, 0, -0.2, 0, L / n + 0.1, 1.1, 0.7, 0x9a9080, { solid: true });
  }
}

function buildNature() {
  rseed('nature');
  // the Campagna: copses of pines and oaks, solitary trees, scattered where nothing is built
  for (let i = 0; i < 2600; i++) {
    const x = rnd(T.X0 + 60, T.X1 - 60), z = rnd(T.Z0 + 60, T.Z1 - 60);
    if (urbanAt(x, z) > 0.25 || reservedAt(x, z) || inWater(x, z)) continue;
    const n = Noise.fbm(x * 0.004 + 3, z * 0.004, 2);
    if (n < 0.05 && !chance(0.15)) continue;
    const rd = riverDist(x, z);
    const type = rd < 80 ? rpick(['poplar', 'poplar', 'plane', 'laurel']) : n > 0.35 ? rpick(['oak', 'oak', 'pine']) : rpick(['pine', 'pine', 'oak', 'cypress', 'olive']);
    treeAt(x, z, type, rnd(0.85, 1.2));
  }
  // garden hills: the Pincian (Gardens of Lucullus), the Janiculum, the Esquiline gardens of Maecenas
  for (const [cx, cz, r, n] of [[-250, -1200, 300, 160], [-1250, 250, 280, 150], [760, -240, 220, 90], [-1300, -650, 200, 80]]) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), d = Math.sqrt(RNG()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (reservedAt(x, z) || inWater(x, z)) continue;
      treeAt(x, z, rpick(['pine', 'cypress', 'plane', 'laurel', 'pine', 'cypress']), rnd(0.9, 1.2));
    }
  }
  // farms on the Campagna away from the road
  for (let i = 0; i < 70; i++) {
    const x = rnd(-200, 2100), z = rnd(900, 2800);
    if (urbanAt(x, z) > 0.2) continue;
    const pd = polyDist(APPIA, x, z).d;
    if (pd < 30 || pd > 700) continue;
    const F = new Frame(x, z, rnd(-0.4, 0.4) + Math.PI / 4, 0);
    const w = rnd(40, 110), d = rnd(30, 90);
    if (!rectFree(F, 0, 0, w + 6, d + 6)) continue;
    const kind = wpick([[3, 'wheat'], [2, 'green'], [1.4, 'plough'], [1.2, 'vines'], [1.2, 'olives'], [0.5, 'fallow']]);
    field(F, 0, 0, w, d, kind);
    if (chance(0.4)) fieldWall(F, -w / 2, -d / 2 - 1, w / 2, -d / 2 - 1);
    if (chance(0.3)) for (let k = 0; k < 6; k++) treeAt(F.wx(-w / 2 + k * w / 5, d / 2 + 3), F.wz(-w / 2 + k * w / 5, d / 2 + 3), 'cypress', 0.9);
    if (chance(0.25) && (kind === 'wheat' || kind === 'plough' || kind === 'green')) W.spots.push({ kind: 'work', x: F.wx(rnd(-w / 3, w / 3), rnd(-d / 3, d / 3)), z: F.wz(rnd(-w / 3, w / 3), rnd(-d / 3, d / 3)), yaw: rnd(0, TAU), role: 'farmer' });
  }
  // flocks of sheep with their shepherds on rough pasture
  for (const [x, z] of [[900, 1700], [1450, 1900], [600, 1500], [1900, 2300], [1200, 1450]]) {
    if (reservedAt(x, z)) continue;
    W.spots.push({ kind: 'flock', x, z, yaw: rnd(0, TAU), role: 'shepherd', n: rint(8, 16) });
  }
}
