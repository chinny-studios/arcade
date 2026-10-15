// Tokoyo — low-poly models: trees, rocks, plants, items, building pieces, structures, creature & character rigs

const COL = {
  bark: 0x5a3f2c, cedarBark: 0x6b3b27, pineBark: 0x5b4636, wood: 0x8a6440, wood2: 0x7a5636, darkwood: 0x4e3523, hinoki: 0xc9a774,
  leaf: 0x55823a, leaf2: 0x6a963f, pine: 0x2e5532, cedar: 0x2b4528, cedar2: 0x355230, hinokiLeaf: 0x3f6b35,
  stone: 0x86857d, stone2: 0x6d6d68, moss: 0x55703a, thatch: 0xb59c5c, thatch2: 0x9c8448, red: 0xb8322a, vermilion: 0xd2452c,
  paper: 0xf1ead6, iron: 0x3b3b3e, bronze: 0xb07a3a, copper: 0xb8683a, tin: 0xa7adb0, gold: 0xd8a940, bone: 0xddd6c0, black: 0x1d1d20,
};
const MODELS = {};
const model = (key, fn) => MODELS[key] || (MODELS[key] = fn());

// ---------- trees ----------
function treeParts(type, seed) {
  const r = mulberry32(seed * 7919 + type.length * 31);
  const rr = (a, b) => a + (b - a) * r();
  const P = [];
  const cpick = (arr) => arr[Math.floor(r() * arr.length)];
  if (type === 'keyaki') {
    P.push(P_.cyl(0.24, 0.42, 4.4, 7, COL.bark, [0, 2.2, 0]));
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + rr(0, 1); P.push(P_.cyl(0.1, 0.2, 3, 5, COL.bark, [Math.cos(a) * 0.7, 5.0, Math.sin(a) * 0.7], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5])); }
    const n = 7;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rr(0, 0.6), d = i === 0 ? 0 : rr(1.2, 2.4); P.push(P_.ico(rr(1.6, 2.4), 0, cpick([COL.leaf, COL.leaf2, 0x4f7a33]), [Math.cos(a) * d, rr(6.2, 8.2) - d * 0.3, Math.sin(a) * d], [rr(0, 3), rr(0, 3), 0], [1, 0.8, 1])); }
  } else if (type === 'momiji') {
    P.push(P_.cyl(0.13, 0.24, 3.2, 6, 0x4b3a2f, [0, 1.6, 0], [0.05, 0, 0.04]));
    for (let i = 0; i < 2; i++) { const a = i * 3 + rr(0, 1); P.push(P_.cyl(0.07, 0.13, 2.2, 5, 0x4b3a2f, [Math.cos(a) * 0.5, 3.6, Math.sin(a) * 0.5], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6])); }
    const pal = r() < 0.75 ? [0xc63d22, 0xdd5a26, 0xb02a24, 0xe07b2c] : [0xd99a2b, 0xe0b23a, 0xc9822a, 0xd86a26];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + rr(0, 0.8), d = i === 0 ? 0 : rr(0.8, 1.7); P.push(P_.ico(rr(1.1, 1.7), 0, cpick(pal), [Math.cos(a) * d, rr(4.3, 5.6) - d * 0.2, Math.sin(a) * d], [rr(0, 3), rr(0, 3), 0], [1, 0.75, 1])); }
  } else if (type === 'bamboo') {
    const n = 6 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = rr(0, 0.9), h = rr(7, 10.5), x = Math.cos(a) * d, z = Math.sin(a) * d, tx = rr(-0.06, 0.06), tz = rr(-0.06, 0.06);
      P.push(P_.cyl(0.055, 0.07, h, 5, cpick([0x7ea74a, 0x8bb352, 0x6d9640]), [x + tx * h / 2, h / 2, z - tz * h / 2], [tz, 0, tx]));
      for (let k = 1; k < 5; k++) P.push(P_.cyl(0.08, 0.08, 0.06, 5, 0x5f8a3a, [x + tx * h * k / 5, h * k / 5, z - tz * h * k / 5], [tz, 0, tx]));
      for (let k = 0; k < 3; k++) P.push(P_.ico(rr(0.5, 0.9), 0, cpick([0x6f9d45, 0x5f8f3d, 0x83ad4e]), [x + tx * h + rr(-0.5, 0.5), h - rr(0, 2.2), z - tz * h + rr(-0.5, 0.5)], [rr(0, 3), rr(0, 3), 0], [1, 0.45, 1]));
    }
  } else if (type === 'matsu') {
    let x = 0, z = 0, y = 0;
    const segs = 3;
    for (let i = 0; i < segs; i++) {
      const h = rr(2, 2.8), dx = rr(-0.6, 0.6), dz = rr(-0.6, 0.6);
      P.push(P_.cyl(0.18 - i * 0.03, 0.3 - i * 0.05, h, 6, COL.pineBark, [x + dx / 2, y + h / 2, z + dz / 2], [dz / h, 0, -dx / h]));
      x += dx; z += dz; y += h;
    }
    const pads = 5 + Math.floor(r() * 3);
    for (let i = 0; i < pads; i++) {
      const a = r() * TAU, d = rr(0.6, 2.4), py = rr(3.5, y + 0.6);
      P.push(P_.cyl(0.06, 0.1, d, 4, COL.pineBark, [x * py / y + Math.cos(a) * d / 2, py - 0.3, z * py / y + Math.sin(a) * d / 2], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]));
      P.push(P_.ico(rr(1.1, 1.8), 0, cpick([COL.pine, 0x355f38, 0x284b2c]), [x * py / y + Math.cos(a) * d, py, z * py / y + Math.sin(a) * d], [0, rr(0, 3), 0], [1.2, 0.38, 1.2]));
    }
  } else if (type === 'sugi') {
    const h = rr(15, 19);
    P.push(P_.cyl(0.25, 0.6, h, 7, COL.cedarBark, [0, h / 2, 0]));
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers, y = 5 + t * (h - 4.5), rad = lerp(2.8, 0.8, t) * rr(0.9, 1.1);
      P.push(P_.cone(rad, 3.4 - t * 0.8, 7, i % 2 ? COL.cedar : COL.cedar2, [rr(-0.15, 0.15), y + 1.4, rr(-0.15, 0.15)], [0, rr(0, 3), 0]));
    }
  } else if (type === 'hinoki') {
    const h = rr(11, 13);
    P.push(P_.cyl(0.22, 0.45, h, 7, 0x80583c, [0, h / 2, 0]));
    for (let i = 0; i < 5; i++) { const t = i / 5; P.push(P_.ico(lerp(2.4, 1.0, t) * rr(0.9, 1.1), 0, cpick([COL.hinokiLeaf, 0x4a7a3c, 0x3a6331]), [rr(-0.3, 0.3), 4.5 + t * (h - 4), rr(-0.3, 0.3)], [rr(0, 3), rr(0, 3), 0], [1, 0.7, 1])); }
  }
  return P;
}
function treeFar(type, seed) {
  const P = [];
  if (type === 'keyaki') { P.push(P_.cyl(0.25, 0.4, 5, 4, COL.bark, [0, 2.5, 0])); P.push(P_.ico(3.4, 0, COL.leaf, [0, 7, 0], 0, [1, 0.75, 1])); }
  else if (type === 'momiji') { P.push(P_.cyl(0.15, 0.25, 3.5, 4, 0x4b3a2f, [0, 1.7, 0])); P.push(P_.ico(2.4, 0, seed % 3 ? 0xc94a24 : 0xd99a2b, [0, 4.8, 0], 0, [1, 0.7, 1])); }
  else if (type === 'bamboo') { P.push(P_.cyl(0.6, 0.5, 9, 4, 0x78a248, [0, 4.5, 0])); P.push(P_.ico(1.6, 0, 0x6f9d45, [0, 8.5, 0], 0, [1, 0.6, 1])); }
  else if (type === 'matsu') { P.push(P_.cyl(0.2, 0.3, 7, 4, COL.pineBark, [0, 3.5, 0])); P.push(P_.ico(3, 0, COL.pine, [0, 6.4, 0], 0, [1.2, 0.45, 1.2])); }
  else if (type === 'sugi') { P.push(P_.cyl(0.3, 0.5, 16, 4, COL.cedarBark, [0, 8, 0])); P.push(P_.cone(2.8, 13, 5, COL.cedar, [0, 11, 0])); }
  else if (type === 'hinoki') { P.push(P_.cyl(0.25, 0.4, 11, 4, 0x80583c, [0, 5.5, 0])); P.push(P_.cone(2.4, 9, 5, COL.hinokiLeaf, [0, 8.5, 0])); }
  return P;
}
const TREE_TYPES = {
  keyaki: { name: 'Keyaki', hp: 60, tier: 0, drops: [['wood', 6, 9]], log: 2, logLen: 6, logR: 0.35, stump: 0.4, trunkR: 0.42, h: 9 },
  momiji: { name: 'Momiji', hp: 40, tier: 0, drops: [['wood', 4, 6], ['resin', 0, 1]], log: 1, logLen: 4, logR: 0.24, stump: 0.25, trunkR: 0.26, h: 6 },
  bamboo: { name: 'Bamboo', hp: 30, tier: 0, drops: [['bamboo', 5, 8]], log: 0, stump: 0, trunkR: 0.7, h: 9 },
  matsu: { name: 'Matsu', hp: 70, tier: 0, drops: [['wood', 6, 9], ['resin', 1, 2]], log: 2, logLen: 6, logR: 0.3, stump: 0.32, trunkR: 0.32, h: 8 },
  sugi: { name: 'Sugi', hp: 110, tier: 0, drops: [['wood', 8, 12], ['heartwood', 1, 3]], log: 3, logLen: 12, logR: 0.5, stump: 0.6, trunkR: 0.6, h: 17 },
  hinoki: { name: 'Hinoki', hp: 140, tier: 2, drops: [['hinoki', 8, 12], ['wood', 2, 4]], log: 2, logLen: 9, logR: 0.42, stump: 0.45, trunkR: 0.46, h: 12 },
};
function treeGeo(type, v) { return model('tree:' + type + v, () => buildModel(treeParts(type, v + 1), { jitter: 0.12, seed: v + 3 })); }
function treeFarGeo(type, v) { return model('treefar:' + type + v, () => buildModel(treeFar(type, v), { jitter: 0.1 })); }
function stumpGeo(type) {
  return model('stump:' + type, () => {
    const t = TREE_TYPES[type], rad = t.stump || 0.3;
    const bark = type === 'sugi' ? COL.cedarBark : type === 'momiji' ? 0x4b3a2f : COL.bark;
    return buildModel([P_.cyl(rad * 0.9, rad * 1.1, 0.7, 7, bark, [0, 0.35, 0]), P_.cyl(rad * 0.82, rad * 0.82, 0.04, 7, 0xc9a576, [0, 0.71, 0])]);
  });
}
function logGeo(type) {
  return model('log:' + type, () => {
    const t = TREE_TYPES[type];
    const bark = type === 'sugi' ? COL.cedarBark : type === 'hinoki' ? 0x80583c : COL.bark;
    return buildModel([P_.cyl(t.logR, t.logR, t.logLen, 7, bark, [0, 0, 0], [0, 0, Math.PI / 2]),
      P_.cyl(t.logR * 0.85, t.logR * 0.85, 0.02, 7, 0xc9a576, [t.logLen / 2 + 0.005, 0, 0], [0, 0, Math.PI / 2]),
      P_.cyl(t.logR * 0.85, t.logR * 0.85, 0.02, 7, 0xc9a576, [-t.logLen / 2 - 0.005, 0, 0], [0, 0, Math.PI / 2])], { jitter: 0.1 });
  });
}

// ---------- rocks, ore, plants ----------
const ROCK_TYPES = {
  boulder: { name: 'Boulder', hp: 120, tier: 1, drops: [['stone', 8, 12]], r: 1.6, h: 1.8, chunks: 4 },
  copper: { name: 'Copper deposit', hp: 400, tier: 1, drops: [['copper_ore', 10, 14], ['stone', 4, 8]], r: 2.2, h: 2.2, chunks: 8 },
  tin: { name: 'Tin deposit', hp: 90, tier: 1, drops: [['tin_ore', 3, 5]], r: 0.9, h: 0.8, chunks: 3 },
};
function rockGeo(type, v) {
  return model('rock:' + type + v, () => {
    const r = mulberry32(v * 131 + type.length);
    const P = [];
    if (type === 'boulder') {
      P.push(P_.dod(1.3, COL.stone, [0, 0.7, 0], [r(), r(), r()], [1.4, 0.95, 1.2]));
      P.push(P_.dod(0.9, COL.stone2, [0.8, 0.4, 0.5], [r(), r(), r()], [1, 0.8, 1]));
      P.push(P_.dod(1.05, COL.moss, [0, 1.15, 0], [r(), r(), r()], [1.3, 0.35, 1.1]));
    } else if (type === 'copper') {
      P.push(P_.dod(1.8, 0x7d7a70, [0, 0.9, 0], [r(), r(), r()], [1.3, 0.9, 1.2]));
      P.push(P_.dod(1.2, 0x6c6a62, [1.2, 0.5, -0.6], [r(), r(), r()], [1, 0.8, 1]));
      for (let i = 0; i < 9; i++) { const a = r() * TAU, y = 0.4 + r() * 1.6; P.push(P_.ico(0.32, 0, i % 3 ? 0x4f9a76 : 0xc0703a, [Math.cos(a) * 1.9 * (1 - y / 4), y, Math.sin(a) * 1.7 * (1 - y / 4)], [r(), r(), 0], [1, 0.6, 1])); }
    } else if (type === 'tin') {
      P.push(P_.dod(0.7, 0x77776f, [0, 0.35, 0], [r(), r(), r()], [1.3, 0.7, 1.1]));
      for (let i = 0; i < 5; i++) { const a = r() * TAU; P.push(P_.ico(0.18, 0, 0xc8ccd0, [Math.cos(a) * 0.75, 0.3 + r() * 0.3, Math.sin(a) * 0.65], [r(), r(), 0])); }
    }
    return buildModel(P, { jitter: 0.14, seed: v });
  });
}
const PICK_TYPES = {
  branch: { name: 'Branch', item: 'wood', n: 1, regrow: 1500 },
  stone: { name: 'Stone', item: 'stone', n: 1, regrow: 0 },
  flint: { name: 'Flint', item: 'flint', n: 1, regrow: 0 },
  susuki: { name: 'Susuki grass', item: 'straw', n: 2, regrow: 1200 },
  strawberry: { name: 'Wild strawberries', item: 'strawberry', n: 1, regrow: 1500 },
  kokemomo: { name: 'Kokemomo', item: 'kokemomo', n: 1, regrow: 1500 },
  matsutake: { name: 'Matsutake', item: 'matsutake', n: 1, regrow: 1800 },
  yomogi: { name: 'Yomogi', item: 'yomogi', n: 1, regrow: 1500 },
};
function pickGeo(type) {
  return model('pick:' + type, () => {
    const r = mulberry32(type.length * 977);
    const P = [];
    if (type === 'branch') { P.push(P_.cyl(0.04, 0.05, 1.3, 4, COL.bark, [0, 0.05, 0], [0, 0.3, Math.PI / 2])); P.push(P_.cyl(0.025, 0.03, 0.5, 4, COL.bark, [0.2, 0.06, 0.15], [0, -0.6, Math.PI / 2])); }
    else if (type === 'stone') P.push(P_.dod(0.18, COL.stone, [0, 0.1, 0], [0.4, 0.2, 0], [1.3, 0.8, 1]));
    else if (type === 'flint') { P.push(P_.tbox(0.25, 0.12, 0.02, 0.02, 0.22, 0x3e4046, [0, 0.1, 0], [0.3, 0.5, 0.4])); P.push(P_.tbox(0.18, 0.1, 0.02, 0.02, 0.16, 0x50535a, [0.15, 0.07, 0.1], [0.2, 1.5, 0.6])); }
    else if (type === 'susuki') {
      for (let i = 0; i < 9; i++) { const a = r() * TAU, d = r() * 0.3, h = 1.2 + r() * 0.6, tx = (r() - 0.5) * 0.4, tz = (r() - 0.5) * 0.4;
        P.push(P_.cyl(0.012, 0.02, h, 3, 0x9a9d5a, [Math.cos(a) * d, h / 2, Math.sin(a) * d], [tz, 0, tx]));
        P.push(P_.cone(0.07, 0.45, 4, 0xe6dfcc, [Math.cos(a) * d - tx * h / 2, h + 0.1, Math.sin(a) * d + tz * h / 2], [tz, 0, tx])); }
    } else if (type === 'strawberry' || type === 'kokemomo') {
      const leaf = type === 'strawberry' ? 0x4e7d34 : 0x355d2e, berry = type === 'strawberry' ? 0xe0332a : 0xb8182c;
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P.push(P_.ico(0.24, 0, leaf, [Math.cos(a) * 0.22, 0.18, Math.sin(a) * 0.22], [r(), r(), 0], [1, 0.5, 1])); }
      P.push(P_.ico(0.3, 0, leaf, [0, 0.28, 0], 0, [1, 0.6, 1]));
      for (let i = 0; i < 7; i++) { const a = r() * TAU; P.push(P_.ico(0.06, 0, berry, [Math.cos(a) * 0.3, 0.2 + r() * 0.2, Math.sin(a) * 0.3])); }
    } else if (type === 'matsutake') {
      for (let i = 0; i < 3; i++) { const x = (r() - 0.5) * 0.25, z = (r() - 0.5) * 0.25, h = 0.12 + r() * 0.08;
        P.push(P_.cyl(0.035, 0.045, h, 5, 0xe6dccb, [x, h / 2, z])); P.push(P_.cyl(0.03, 0.09, 0.07, 6, 0x7a5232, [x, h + 0.03, z])); }
    } else if (type === 'yomogi') {
      for (let i = 0; i < 8; i++) { const a = r() * TAU, h = 0.3 + r() * 0.25; P.push(P_.tbox(0.12, 0.02, 0.02, 0.01, h, i % 2 ? 0x8aa86a : 0x6f8f55, [Math.cos(a) * 0.1, h / 2, Math.sin(a) * 0.1], [Math.sin(a) * 0.4, a, -Math.cos(a) * 0.4])); }
    }
    return buildModel(P, { jitter: 0.1 });
  });
}
function bushGeo(v, forest) {
  return model('bush:' + v + forest, () => {
    const r = mulberry32(v * 71 + (forest ? 5 : 0));
    const P = [];
    if (forest && v % 2) { // fern
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + r() * 0.3; P.push(P_.tbox(0.18, 0.02, 0.02, 0.01, 1.0, i % 2 ? 0x3d6a33 : 0x4a7a3a, [Math.cos(a) * 0.35, 0.35, Math.sin(a) * 0.35], [Math.sin(a) * 1.0, -a, -Math.cos(a) * 1.0])); }
    } else {
      const n = 3 + Math.floor(r() * 3), g = forest ? [0x3a5f2e, 0x2f5228] : [0x5a8a3a, 0x4d7c33, 0x6a9442];
      for (let i = 0; i < n; i++) P.push(P_.ico(0.4 + r() * 0.4, 0, g[i % g.length], [(r() - 0.5) * 0.9, 0.35 + r() * 0.3, (r() - 0.5) * 0.9], [r(), r(), 0], [1, 0.75, 1]));
    }
    return buildModel(P, { jitter: 0.15, seed: v });
  });
}
function grassGeo() {
  return model('grass', () => {
    const r = mulberry32(42), P = [];
    for (let i = 0; i < 9; i++) {
      const a = r() * TAU, d = r() * 0.5, h = 0.22 + r() * 0.3;
      P.push(P_.tbox(0.08, 0.012, 0.004, 0.004, h, [0x4e7a30, 0x5c8636, 0x46702a][i % 3], [Math.cos(a) * d, h / 2, Math.sin(a) * d], [(r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5]));
    }
    return buildModel(P);
  });
}

// ---------- items (drops & icons) ----------
function itemParts(id) {
  const it = ITEMS[id] || {};
  const box = P_.box, cyl = P_.cyl;
  switch (id) {
    case 'wood': return [cyl(0.09, 0.09, 0.8, 6, COL.bark, [0, 0.09, -0.1], [0, 0, Math.PI / 2]), cyl(0.09, 0.09, 0.8, 6, COL.wood2, [0, 0.09, 0.1], [0, 0, Math.PI / 2]), cyl(0.09, 0.09, 0.8, 6, COL.bark, [0, 0.25, 0], [0, 0, Math.PI / 2])];
    case 'hinoki': return [box(0.8, 0.12, 0.2, COL.hinoki, [0, 0.06, -0.12]), box(0.8, 0.12, 0.2, 0xd8b98a, [0, 0.06, 0.12]), box(0.8, 0.12, 0.2, COL.hinoki, [0, 0.18, 0])];
    case 'heartwood': return [box(0.7, 0.14, 0.22, 0x9a3f26, [0, 0.07, -0.1]), box(0.7, 0.14, 0.22, 0x86361f, [0, 0.07, 0.13]), box(0.7, 0.14, 0.22, 0xa44a2c, [0, 0.21, 0])];
    case 'stone': return [P_.dod(0.22, COL.stone, [0, 0.15, 0], [0.4, 0.2, 0], [1.3, 0.8, 1])];
    case 'flint': return [P_.tbox(0.3, 0.14, 0.02, 0.02, 0.26, 0x3e4046, [0, 0.13, 0], [0.3, 0.5, 0.4])];
    case 'resin': return [P_.ico(0.12, 0, 0xd88a1e, [0, 0.1, 0]), P_.ico(0.08, 0, 0xe8a43a, [0.1, 0.07, 0.05])];
    case 'bamboo': return [cyl(0.05, 0.05, 1.0, 5, 0x7ea74a, [0, 0.05, -0.08], [0, 0, Math.PI / 2]), cyl(0.05, 0.05, 1.0, 5, 0x8bb352, [0, 0.05, 0.05], [0, 0, Math.PI / 2]), cyl(0.05, 0.05, 1.0, 5, 0x7ea74a, [0, 0.14, 0], [0, 0, Math.PI / 2])];
    case 'straw': return [cyl(0.1, 0.12, 0.7, 6, COL.thatch, [0, 0.1, 0], [0, 0, Math.PI / 2]), cyl(0.125, 0.125, 0.05, 6, 0x8a6a3a, [0, 0.1, 0], [0, 0, Math.PI / 2])];
    case 'leather_scraps': return [box(0.3, 0.03, 0.25, 0x7a5a3a, [0, 0.02, 0], [0, 0.4, 0]), box(0.25, 0.03, 0.2, 0x6a4a2e, [0.05, 0.05, 0.05], [0, -0.3, 0])];
    case 'deer_hide': return [box(0.55, 0.03, 0.4, 0xa3754a, [0, 0.02, 0]), box(0.2, 0.03, 0.15, 0xa3754a, [0.3, 0.02, 0.2]), box(0.2, 0.03, 0.15, 0xa3754a, [-0.3, 0.02, 0.2])];
    case 'oni_hide': return [box(0.6, 0.05, 0.45, 0xa8322a, [0, 0.03, 0]), box(0.6, 0.02, 0.1, 0xd4a03a, [0, 0.065, 0])];
    case 'boar_tusk': case 'great_tusk': { const s = id === 'great_tusk' ? 1.8 : 1; return [P_.tor(0.18 * s, 0.035 * s, 4, 8, Math.PI * 0.9, 0xeee6d0, [0, 0.15 * s, 0], [0, 0, 0.3])]; }
    case 'gaki_eye': return [P_.sph(0.1, 8, 6, 0xf2ecd0, [0, 0.1, 0]), P_.sph(0.05, 6, 4, 0xc8a020, [0, 0.12, 0.07])];
    case 'kappa_shell': return [P_.sph(0.25, 7, 4, 0x4d6e3a, [0, 0.05, 0], 0, [1, 0.4, 1.2]), box(0.1, 0.02, 0.4, 0x3a5a2c, [0, 0.12, 0])];
    case 'bone_fragments': return [cyl(0.03, 0.03, 0.3, 4, COL.bone, [0, 0.03, 0], [0, 0.4, Math.PI / 2]), cyl(0.03, 0.03, 0.25, 4, COL.bone, [0, 0.06, 0.08], [0, -0.6, Math.PI / 2]), P_.sph(0.05, 5, 4, COL.bone, [0.15, 0.04, 0])];
    case 'kami_seed': return [P_.ico(0.12, 1, 0x7a5a2a, [0, 0.12, 0], 0, [0.8, 1.2, 0.8]), P_.ico(0.06, 0, 0x9cff9a, [0, 0.24, 0])];
    case 'fire_orb': return [P_.ico(0.14, 1, 0x7fd6ff, [0, 0.16, 0]), P_.cone(0.1, 0.22, 6, 0xbfeaff, [0, 0.32, 0])];
    case 'copper_ore': return [P_.dod(0.2, 0x6f6c63, [0, 0.14, 0]), P_.ico(0.09, 0, 0x4f9a76, [0.1, 0.2, 0.05]), P_.ico(0.08, 0, 0xc0703a, [-0.1, 0.18, -0.05])];
    case 'tin_ore': return [P_.dod(0.2, 0x77776f, [0, 0.14, 0]), P_.ico(0.09, 0, 0xc8ccd0, [0.1, 0.2, 0.05])];
    case 'copper': case 'tin': case 'bronze': { const c = id === 'copper' ? COL.copper : id === 'tin' ? COL.tin : COL.bronze; return [P_.tbox(0.4, 0.18, 0.32, 0.12, 0.1, c, [0, 0.05, 0])]; }
    case 'coal': return [P_.dod(0.12, 0x222224, [0, 0.1, 0]), P_.dod(0.09, 0x2b2b2e, [0.12, 0.07, 0.05]), P_.dod(0.08, 0x1a1a1c, [-0.08, 0.06, 0.1])];
    case 'yomogi': return [P_.tbox(0.12, 0.02, 0.02, 0.01, 0.35, 0x8aa86a, [0, 0.05, 0], [Math.PI / 2, 0, 0.2]), P_.tbox(0.12, 0.02, 0.02, 0.01, 0.35, 0x6f8f55, [0.05, 0.06, 0], [Math.PI / 2, 0, -0.3])];
    case 'raw_boar': case 'raw_venison': return [P_.ico(0.18, 0, id === 'raw_boar' ? 0xc0504a : 0xa83a3a, [0, 0.1, 0], 0, [1.3, 0.6, 1]), P_.cyl(0.03, 0.03, 0.25, 4, COL.bone, [0.2, 0.1, 0], [0, 0, Math.PI / 2])];
    case 'cooked_boar': case 'cooked_venison': return [P_.ico(0.18, 0, 0x7a4426, [0, 0.1, 0], 0, [1.3, 0.6, 1]), P_.cyl(0.03, 0.03, 0.25, 4, COL.bone, [0.2, 0.1, 0], [0, 0, Math.PI / 2])];
    case 'burnt_meat': return [P_.ico(0.16, 0, 0x2a2420, [0, 0.09, 0], 0, [1.3, 0.6, 1])];
    case 'strawberry': return [P_.ico(0.09, 0, 0xe0332a, [0, 0.08, 0]), P_.ico(0.08, 0, 0xd02a24, [0.1, 0.07, 0.04]), P_.ico(0.08, 0, 0xe0332a, [-0.06, 0.07, 0.08])];
    case 'kokemomo': return [P_.ico(0.06, 0, 0xb8182c, [0, 0.06, 0]), P_.ico(0.06, 0, 0xc8202c, [0.08, 0.06, 0.03]), P_.ico(0.06, 0, 0xa8142a, [-0.05, 0.06, 0.07]), P_.ico(0.06, 0, 0xc8202c, [0.02, 0.13, 0.03])];
    case 'matsutake': return [cyl(0.04, 0.05, 0.18, 5, 0xe6dccb, [0, 0.09, 0]), cyl(0.03, 0.11, 0.08, 6, 0x7a5232, [0, 0.2, 0])];
    case 'cucumber': return [cyl(0.05, 0.05, 0.35, 6, 0x3f7a2a, [0, 0.06, 0], [0, 0.3, Math.PI / 2])];
    case 'jam': case 'nabe': case 'matsutake_soup': case 'boar_skewers': {
      const f = { jam: 0x9a1a2c, nabe: 0x8a5a32, matsutake_soup: 0xc89a5a, boar_skewers: 0x7a4426 }[id];
      if (id === 'boar_skewers') return [cyl(0.01, 0.01, 0.5, 3, COL.wood, [0, 0.06, 0], [0, 0, Math.PI / 2]), P_.ico(0.06, 0, f, [-0.1, 0.06, 0]), P_.ico(0.06, 0, f, [0.02, 0.06, 0]), P_.ico(0.06, 0, 0x5a7a3a, [0.12, 0.06, 0])];
      return [cyl(0.16, 0.1, 0.1, 8, 0x3a2a24, [0, 0.05, 0]), cyl(0.14, 0.14, 0.02, 8, f, [0, 0.1, 0])];
    }
    case 'tonic': return [cyl(0.06, 0.09, 0.2, 6, 0xd8cfb6, [0, 0.1, 0]), cyl(0.03, 0.03, 0.08, 5, 0xd8cfb6, [0, 0.24, 0]), cyl(0.035, 0.035, 0.04, 5, 0x7a4a2a, [0, 0.29, 0]), box(0.11, 0.06, 0.005, 0x7aa84a, [0, 0.1, 0.075])];
    case 'shirokiba_trophy': return [P_.box(0.4, 0.35, 0.5, 0xeeeeee, [0, 0.2, 0]), P_.box(0.3, 0.25, 0.3, 0xf4f4f4, [0, 0.2, 0.35]), P_.tor(0.18, 0.04, 4, 8, Math.PI * 0.9, 0xeee6d0, [0.15, 0.25, 0.45], [0, 0, 0.3]), P_.tor(0.18, 0.04, 4, 8, Math.PI * 0.9, 0xeee6d0, [-0.15, 0.25, 0.45], [0, Math.PI, 0.3]), P_.sph(0.04, 4, 3, 0x7fd6ff, [0.1, 0.3, 0.5]), P_.sph(0.04, 4, 3, 0x7fd6ff, [-0.1, 0.3, 0.5])];
    case 'osugi_trophy': return [P_.cyl(0.25, 0.3, 0.5, 7, COL.cedarBark, [0, 0.25, 0]), P_.cone(0.4, 0.6, 7, COL.cedar, [0, 0.75, 0]), P_.sph(0.05, 4, 3, 0x9cff9a, [0.1, 0.35, 0.25]), P_.sph(0.05, 4, 3, 0x9cff9a, [-0.1, 0.35, 0.25]), P_.tor(0.3, 0.03, 4, 10, TAU, 0xe8dcb0, [0, 0.45, 0], [Math.PI / 2, 0, 0])];
    case 'sacred_rope': return [P_.tor(0.22, 0.05, 5, 12, TAU, 0xe8dcb0, [0, 0.05, 0], [Math.PI / 2, 0, 0]), P_.box(0.06, 0.18, 0.01, 0xffffff, [0, -0.05, 0.22]), P_.box(0.06, 0.18, 0.01, 0xffffff, [0.18, -0.05, 0.1], [0, 1, 0])];
  }
  if (it.type === 'weapon' || it.type === 'tool') return heldParts(id);
  if (it.type === 'shield') return shieldParts(id);
  if (it.type === 'armor') return armorIconParts(id);
  if (it.type === 'ammo') { const tip = { arrow_bamboo: 0x7ea74a, arrow_flint: 0x3e4046, arrow_fire: 0xd88a1e, arrow_bronze: COL.bronze }[id];
    return [0, 1, 2].map((k) => [cyl(0.012, 0.012, 0.8, 3, 0x9ab25a, [0, 0.03 + k * 0.03, (k - 1) * 0.05], [0, 0, Math.PI / 2]), P_.cone(0.03, 0.08, 4, tip, [0.43, 0.03 + k * 0.03, (k - 1) * 0.05], [0, 0, -Math.PI / 2])]).flat(); }
  return [P_.box(0.3, 0.3, 0.3, 0x998866, [0, 0.15, 0])];
}
// Weapons/tools are modelled along +Y from the grip (origin at the hand).
function heldParts(id) {
  const H = (len, c = COL.wood) => P_.cyl(0.025, 0.03, len, 5, c, [0, len / 2 - 0.15, 0]);
  switch (id) {
    case 'club': return [P_.cyl(0.03, 0.04, 0.5, 5, COL.wood, [0, 0.1, 0]), P_.cyl(0.09, 0.05, 0.5, 6, COL.wood2, [0, 0.55, 0])];
    case 'torch': return [H(0.6), P_.cyl(0.05, 0.04, 0.12, 5, 0x3a2a1a, [0, 0.48, 0])];
    case 'stone_axe': case 'flint_axe': case 'bronze_axe': {
      const c = id === 'stone_axe' ? COL.stone : id === 'flint_axe' ? 0x3e4046 : COL.bronze;
      return [H(0.8), P_.tbox(0.06, 0.05, 0.3, 0.02, 0.18, c, [0.14, 0.55, 0], [0, 0, -Math.PI / 2]), P_.box(0.08, 0.08, 0.07, 0x6a4a2e, [0, 0.55, 0])];
    }
    case 'flint_knife': return [P_.cyl(0.02, 0.025, 0.14, 5, 0x3a2a1a, [0, 0, 0]), P_.tbox(0.06, 0.02, 0.01, 0.005, 0.28, 0x3e4046, [0, 0.2, 0])];
    case 'bamboo_spear': case 'bronze_spear': return [P_.cyl(0.025, 0.025, 2.0, 5, id === 'bamboo_spear' ? 0x8bb352 : COL.darkwood, [0, 0.6, 0]), P_.tbox(0.07, 0.03, 0.005, 0.005, 0.32, id === 'bamboo_spear' ? 0x3e4046 : COL.bronze, [0, 1.75, 0])];
    case 'bronze_sword': return [P_.cyl(0.02, 0.02, 0.24, 5, 0x2a1e18, [0, 0, 0]), P_.cyl(0.07, 0.07, 0.02, 8, COL.gold, [0, 0.13, 0]), P_.box(0.045, 0.85, 0.012, COL.bronze, [0, 0.56, 0], [0, 0, 0.04]), P_.tbox(0.045, 0.012, 0.005, 0.005, 0.1, COL.bronze, [0.017, 1.03, 0], [0, 0, 0.08])];
    case 'bronze_mace': return [H(0.75, COL.darkwood), P_.cyl(0.1, 0.07, 0.35, 6, COL.bronze, [0, 0.6, 0]), P_.cone(0.04, 0.08, 4, COL.bronze, [0.11, 0.6, 0], [0, 0, -Math.PI / 2]), P_.cone(0.04, 0.08, 4, COL.bronze, [-0.11, 0.6, 0], [0, 0, Math.PI / 2])];
    case 'crude_bow': case 'hinoki_bow': {
      const c = id === 'crude_bow' ? COL.wood : COL.hinoki, P = [];
      for (let i = -3; i <= 3; i++) { if (i === 0) continue; const y = i * 0.2, x = -Math.abs(i) * Math.abs(i) * 0.012; P.push(P_.box(0.03, 0.21, 0.03, c, [x, y, 0], [0, 0, i * 0.06])); }
      P.push(P_.box(0.045, 0.16, 0.045, 0x3a2a1a, [0, 0, 0]));
      P.push(P_.box(0.005, 1.25, 0.005, 0xeeeeee, [-0.15, 0, 0]));
      return P;
    }
    case 'tusk_pick': return [H(0.8), P_.tor(0.28, 0.035, 4, 8, Math.PI * 0.75, 0xeee6d0, [0, 0.42, 0], [0, 0, Math.PI * 0.13])];
    case 'bronze_pick': return [H(0.8), P_.tbox(0.04, 0.04, 0.01, 0.01, 0.55, COL.bronze, [0, 0.6, 0], [0, 0, Math.PI / 2])];
    case 'hammer': return [H(0.5), P_.box(0.22, 0.1, 0.1, COL.stone, [0, 0.38, 0])];
    case 'hoe': return [H(1.0), P_.box(0.16, 0.03, 0.2, COL.stone, [0, 0.82, 0.08], [0.6, 0, 0])];
  }
  return [P_.box(0.1, 0.5, 0.1, 0x888888, [0, 0.2, 0])];
}
function shieldParts(id) {
  if (id === 'kappa_buckler') return [P_.sph(0.3, 8, 4, 0x4d6e3a, [0, 0, 0.04], [Math.PI / 2, 0, 0], [1, 0.35, 1]), P_.box(0.08, 0.5, 0.02, 0x3a5a2c, [0, 0, 0.1])];
  if (id === 'bronze_shield') return [P_.box(0.6, 0.85, 0.05, COL.wood2, [0, 0, 0.03]), P_.box(0.62, 0.06, 0.06, COL.bronze, [0, 0.3, 0.04]), P_.box(0.62, 0.06, 0.06, COL.bronze, [0, -0.3, 0.04]), P_.cyl(0.1, 0.1, 0.05, 8, COL.bronze, [0, 0, 0.07], [Math.PI / 2, 0, 0])];
  return [P_.box(0.55, 0.8, 0.05, COL.wood, [0, 0, 0.03]), P_.box(0.06, 0.8, 0.06, COL.darkwood, [-0.15, 0, 0.04]), P_.box(0.06, 0.8, 0.06, COL.darkwood, [0.15, 0, 0.04])];
}
function armorIconParts(id) {
  const it = ITEMS[id];
  const c = armorColor(id);
  if (it.slot === 'head') {
    if (id === 'straw_hat') return [P_.cone(0.4, 0.22, 10, COL.thatch, [0, 0.11, 0])];
    if (id === 'bronze_helm') return [P_.sph(0.2, 8, 5, COL.bronze, [0, 0.1, 0], 0, [1, 0.9, 1]), P_.cyl(0.32, 0.3, 0.06, 8, COL.bronze, [0, 0.03, 0]), P_.tbox(0.03, 0.03, 0.12, 0.01, 0.2, COL.gold, [0, 0.3, 0.12])];
    return [P_.sph(0.2, 8, 5, c, [0, 0.1, 0], 0, [1, 1, 1])];
  }
  if (it.slot === 'cape') return [P_.tbox(0.3, 0.06, 0.6, 0.1, 0.7, COL.thatch, [0, 0.35, 0])];
  if (it.slot === 'chest') return [P_.box(0.45, 0.45, 0.2, c, [0, 0.25, 0]), P_.box(0.15, 0.3, 0.16, c, [0.3, 0.3, 0]), P_.box(0.15, 0.3, 0.16, c, [-0.3, 0.3, 0])];
  return [P_.box(0.18, 0.5, 0.18, c, [0.11, 0.25, 0]), P_.box(0.18, 0.5, 0.18, c, [-0.11, 0.25, 0]), P_.box(0.42, 0.1, 0.2, c, [0, 0.5, 0])];
}
function armorColor(id) {
  if (id.startsWith('rag')) return 0x6e6655;
  if (id.startsWith('leather')) return 0x8a5e3a;
  if (id.startsWith('oni')) return 0x9a2e26;
  if (id.startsWith('bronze')) return COL.bronze;
  return 0x888888;
}
function itemGeo(id) { return model('item:' + id, () => buildModel(itemParts(id), { jitter: 0.06 })); }

// ---------- building pieces ----------
function pieceParts(id) {
  const d = PIECES[id], s = d.size || [1, 1, 1], [w, h, dd] = s;
  const look = d.look || 'wood';
  const wc = look === 'hinoki' ? COL.hinoki : COL.wood, wc2 = look === 'hinoki' ? 0xb8955e : COL.wood2;
  const P = [];
  switch (d.kind) {
    case 'floor': {
      if (look === 'stone') { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) P.push(P_.box(w / 2 - 0.03, h, dd / 2 - 0.03, (i + j) % 2 ? COL.stone : COL.stone2, [(i - 0.5) * w / 2, -h / 2, (j - 0.5) * dd / 2])); break; }
      const n = Math.round(w * 3);
      for (let i = 0; i < n; i++) P.push(P_.box(w / n - 0.02, h, dd, i % 2 ? wc : wc2, [(i + 0.5) * w / n - w / 2, -h / 2, 0]));
      break;
    }
    case 'wall': case 'door': {
      if (look === 'stone') { for (let r = 0; r < h / 0.5; r++) for (let c = 0; c < 2; c++) { const off = r % 2 ? 0.25 : 0; P.push(P_.box(w / 2 - 0.03, 0.47, dd, (r + c) % 2 ? COL.stone : COL.stone2, [clamp((c - 0.5) * w / 2 + off, -w / 2 + w / 4, w / 2 - w / 4), r * 0.5 + 0.25, 0])); } break; }
      if (look === 'shoji') {
        P.push(P_.box(w, 0.08, dd, COL.darkwood, [0, 0.04, 0]), P_.box(w, 0.08, dd, COL.darkwood, [0, h - 0.04, 0]), P_.box(0.08, h, dd, COL.darkwood, [-w / 2 + 0.04, h / 2, 0]), P_.box(0.08, h, dd, COL.darkwood, [w / 2 - 0.04, h / 2, 0]));
        P.push(P_.box(w - 0.16, h - 0.16, 0.02, COL.paper, [0, h / 2, 0]));
        for (let i = 1; i < 4; i++) P.push(P_.box(0.03, h - 0.16, dd * 0.6, COL.darkwood, [-w / 2 + i * w / 4, h / 2, 0]));
        for (let i = 1; i < 4; i++) P.push(P_.box(w - 0.16, 0.03, dd * 0.6, COL.darkwood, [0, i * h / 4, 0]));
        break;
      }
      if (look === 'fence') {
        const n = Math.round(w * 6);
        for (let i = 0; i < n; i++) P.push(P_.cyl(0.05, 0.05, h + (i % 2) * 0.1, 5, i % 3 ? 0x8bb352 : 0x7ea74a, [(i + 0.5) * w / n - w / 2, (h + (i % 2) * 0.1) / 2, 0]));
        P.push(P_.box(w, 0.06, 0.16, COL.darkwood, [0, h * 0.75, 0]), P_.box(w, 0.06, 0.16, COL.darkwood, [0, h * 0.3, 0]));
        break;
      }
      if (d.kind === 'door') {
        // hinged at -x; modelled around the hinge so it can swing
        P.push(P_.box(w - 0.1, h - 0.05, dd, wc2, [w / 2, h / 2, 0]));
        for (let i = 0; i < 3; i++) P.push(P_.box(w - 0.1, 0.08, dd + 0.04, COL.darkwood, [w / 2, 0.25 + i * 0.75, 0]));
        P.push(P_.box(0.06, 0.25, 0.06, COL.iron, [w - 0.35, 1.0, dd / 2 + 0.03]));
        break;
      }
      const n = Math.max(2, Math.round(h * 3));
      for (let i = 0; i < n; i++) P.push(P_.box(w - 0.04, h / n - 0.02, dd * 0.8, i % 2 ? wc : wc2, [0, (i + 0.5) * h / n, 0]));
      P.push(P_.box(0.16, h, dd, COL.darkwood, [-w / 2 + 0.08, h / 2, 0]), P_.box(0.16, h, dd, COL.darkwood, [w / 2 - 0.08, h / 2, 0]));
      break;
    }
    case 'beam': P.push(P_.box(w, h, dd, wc2, [0, 0, 0])); P.push(P_.box(w, 0.03, dd + 0.01, look === 'hinoki' ? 0xd8b98a : COL.wood, [0, h / 2 - 0.015, 0])); break;
    case 'pole': if (look === 'stone') { P.push(P_.box(w, h, dd, COL.stone, [0, h / 2, 0]), P_.box(w + 0.1, 0.15, dd + 0.1, COL.stone2, [0, 0.075, 0]), P_.box(w + 0.1, 0.15, dd + 0.1, COL.stone2, [0, h - 0.075, 0])); } else P.push(P_.box(w, h, dd, wc2, [0, h / 2, 0])); break;
    case 'roof': {
      // footprint w (x) by dd (z); low edge at +z (y=0), high edge at -z (y=rise)
      const rise = d.rise, len = Math.hypot(dd, rise), ang = Math.atan2(rise, dd);
      const rows = 4;
      for (let i = 0; i < rows; i++) {
        const t = (i + 0.5) / rows, z = lerp(dd / 2, -dd / 2, t), y = lerp(0, rise, t);
        P.push(P_.box(w + 0.04, 0.18, len / rows + 0.08, i % 2 ? COL.thatch : COL.thatch2, [0, y + 0.06, z], [ang, 0, 0]));
      }
      P.push(P_.box(w, 0.06, len, COL.darkwood, [0, rise / 2 - 0.06, 0], [ang, 0, 0]));
      break;
    }
    case 'ridge': {
      const rise = d.rise, half = dd / 2, len = Math.hypot(half, rise), ang = Math.atan2(rise, half);
      for (const sgn of [-1, 1]) for (let i = 0; i < 2; i++) {
        const t = (i + 0.5) / 2, z = sgn * lerp(half, 0, t), y = lerp(0, rise, t);
        P.push(P_.box(w + 0.04, 0.18, len / 2 + 0.08, i % 2 ? COL.thatch : COL.thatch2, [0, y + 0.06, z], [-sgn * ang, 0, 0]));
      }
      P.push(P_.box(w + 0.1, 0.22, 0.3, COL.thatch2, [0, rise + 0.08, 0]));
      P.push(P_.cyl(0.1, 0.1, w + 0.2, 6, COL.darkwood, [0, rise + 0.2, 0], [0, 0, Math.PI / 2]));
      break;
    }
    case 'stairs': {
      const steps = look === 'stone' ? 4 : 8, sh = h / steps, sd = dd / steps;
      for (let i = 0; i < steps; i++) P.push(P_.box(w, sh, sd + 0.02, look === 'stone' ? (i % 2 ? COL.stone : COL.stone2) : (i % 2 ? wc : wc2), [0, (i + 0.5) * sh, dd / 2 - (i + 0.5) * sd]));
      if (look !== 'stone') { const len = Math.hypot(h, dd), ang = Math.atan2(h, dd); P.push(P_.box(0.08, 0.2, len, COL.darkwood, [-w / 2 + 0.04, h / 2 - 0.1, 0], [ang, 0, 0]), P_.box(0.08, 0.2, len, COL.darkwood, [w / 2 - 0.04, h / 2 - 0.1, 0], [ang, 0, 0])); }
      else for (let i = 0; i < steps; i++) P.push(P_.box(w, (i + 0.5) * sh, sd, COL.stone2, [0, (i + 0.5) * sh / 2, dd / 2 - (i + 0.5) * sd]));
      break;
    }
    case 'stakes': {
      for (let i = 0; i < 6; i++) { const x = (i + 0.5) / 6 * w - w / 2; P.push(P_.cyl(0.0, 0.06, 1.5, 5, 0x8bb352, [x, 0.6, 0.15 * (i % 2 ? 1 : -1)], [i % 2 ? 0.6 : -0.6, 0, 0])); }
      P.push(P_.box(w, 0.08, 0.1, COL.darkwood, [0, 0.35, 0]));
      break;
    }
    case 'raft': {
      for (let i = 0; i < 6; i++) P.push(P_.cyl(0.24, 0.24, 4.6, 7, i % 2 ? COL.bark : COL.wood2, [(i - 2.5) * 0.5, 0.2, 0], [Math.PI / 2, 0, 0]));
      P.push(P_.box(3.0, 0.08, 0.2, COL.darkwood, [0, 0.45, 1.7]), P_.box(3.0, 0.08, 0.2, COL.darkwood, [0, 0.45, -1.7]), P_.box(3.0, 0.08, 0.2, COL.darkwood, [0, 0.45, 0]));
      P.push(P_.cyl(0.07, 0.08, 4.2, 6, COL.darkwood, [0, 2.5, 0.4]));
      P.push(P_.cyl(0.04, 0.04, 2.6, 5, COL.darkwood, [0, 4.2, 0.4], [0, 0, Math.PI / 2]));
      P.push(P_.box(0.1, 0.9, 0.1, COL.darkwood, [0, 0.9, -2.2]), P_.box(0.06, 0.06, 1.2, COL.darkwood, [0, 1.3, -2.6]));
      break;
    }
    default: return objParts(id);
  }
  return P;
}
function objParts(id) {
  const box = P_.box, cyl = P_.cyl;
  switch (id) {
    case 'workbench': return [box(2, 0.12, 1, COL.wood, [0, 0.85, 0]), box(0.12, 0.85, 0.12, COL.darkwood, [-0.9, 0.42, -0.4]), box(0.12, 0.85, 0.12, COL.darkwood, [0.9, 0.42, -0.4]), box(0.12, 0.85, 0.12, COL.darkwood, [-0.9, 0.42, 0.4]), box(0.12, 0.85, 0.12, COL.darkwood, [0.9, 0.42, 0.4]),
      box(1.8, 0.06, 0.8, COL.wood2, [0, 0.3, 0]), box(0.3, 0.08, 0.12, COL.stone, [0.4, 0.95, 0.1]), cyl(0.02, 0.02, 0.4, 4, COL.wood2, [0.4, 0.95, 0.1], [0, 0, Math.PI / 2]), box(0.6, 0.04, 0.2, 0xc9a576, [-0.5, 0.93, -0.1], [0, 0.3, 0]), box(0.05, 0.05, 0.4, COL.iron, [-0.1, 0.94, 0.2], [0, 0.8, 0])];
    case 'chopping_block': return [cyl(0.35, 0.4, 0.7, 7, COL.bark, [0, 0.35, 0]), cyl(0.33, 0.33, 0.02, 7, 0xc9a576, [0, 0.71, 0]), cyl(0.025, 0.03, 0.7, 5, COL.wood, [0.1, 0.95, 0], [0, 0, 0.5]), P_.tbox(0.05, 0.04, 0.24, 0.02, 0.16, COL.stone, [0, 0.72, 0], [0, 0, 0.5 - Math.PI / 2])];
    case 'tanning_rack': return [box(0.1, 1.8, 0.1, COL.darkwood, [-0.9, 0.9, 0]), box(0.1, 1.8, 0.1, COL.darkwood, [0.9, 0.9, 0]), box(1.9, 0.08, 0.08, COL.darkwood, [0, 1.7, 0]), box(1.9, 0.08, 0.08, COL.darkwood, [0, 0.25, 0]), box(1.3, 1.2, 0.03, 0xa3754a, [0, 1.0, 0])];
    case 'forge': return [box(1.8, 0.9, 1.4, COL.stone, [0, 0.45, 0]), box(1.4, 0.15, 1.0, 0x2a2420, [0, 0.95, 0]), P_.ico(0.18, 0, 0xff6a20, [0.2, 1.05, 0.1]), P_.ico(0.15, 0, 0xffa030, [-0.25, 1.03, -0.1]), P_.ico(0.12, 0, 0xff4a10, [0, 1.04, 0.25]),
      box(0.6, 1.6, 0.6, COL.stone2, [0, 1.6, -0.5]), cyl(0.18, 0.2, 1.4, 6, 0x5a5a58, [0, 2.9, -0.5]), box(0.6, 0.5, 0.4, 0x7a5a3a, [1.1, 0.6, 0]), box(0.1, 0.1, 0.5, COL.darkwood, [1.1, 0.9, 0.3])];
    case 'anvil': return [box(0.35, 0.5, 0.3, COL.bark, [0, 0.25, 0]), P_.tbox(0.45, 0.22, 0.65, 0.22, 0.25, COL.iron, [0, 0.62, 0]), P_.cone(0.1, 0.25, 4, COL.iron, [0.42, 0.68, 0], [0, 0, -Math.PI / 2])];
    case 'kiln': return [cyl(0.65, 0.8, 1.6, 8, COL.stone, [0, 0.8, 0]), cyl(0.2, 0.65, 0.6, 8, COL.stone2, [0, 1.9, 0]), box(0.5, 0.5, 0.1, 0x1a1210, [0, 0.4, 0.78]), P_.ico(0.12, 0, 0xff6a20, [0, 0.35, 0.7])];
    case 'tatara': return [box(1.4, 1.5, 1.4, 0x9a7458, [0, 0.75, 0]), P_.tbox(1.4, 1.4, 0.9, 0.9, 1.0, 0x8a664c, [0, 2.0, 0]), box(0.5, 0.4, 0.12, 0x140c08, [0, 0.4, 0.72]), P_.ico(0.18, 0, 0xff7a20, [0, 0.4, 0.66]),
      box(0.5, 0.5, 1.2, 0x6a4a2e, [-1.0, 0.45, 0]), box(0.15, 0.6, 0.15, COL.darkwood, [-1.0, 1.0, 0.4]), cyl(0.2, 0.2, 0.1, 6, 0x2a1a10, [0, 2.55, 0])];
    case 'cauldron': return [cyl(0.42, 0.32, 0.55, 9, COL.black, [0, 0.55, 0]), P_.tor(0.42, 0.04, 4, 10, TAU, COL.iron, [0, 0.82, 0], [Math.PI / 2, 0, 0]), cyl(0.38, 0.38, 0.02, 9, 0x6a5a3a, [0, 0.78, 0]),
      cyl(0.03, 0.03, 0.4, 4, COL.iron, [0.3, 0.15, 0.2]), cyl(0.03, 0.03, 0.4, 4, COL.iron, [-0.3, 0.15, 0.2]), cyl(0.03, 0.03, 0.4, 4, COL.iron, [0, 0.15, -0.35])];
    case 'spit': return [cyl(0.035, 0.04, 1.1, 5, COL.wood, [-0.7, 0.55, 0]), cyl(0.035, 0.04, 1.1, 5, COL.wood, [0.7, 0.55, 0]), cyl(0.02, 0.02, 1.6, 4, COL.iron, [0, 1.0, 0], [0, 0, Math.PI / 2]), box(0.1, 0.1, 0.06, COL.wood, [-0.7, 1.05, 0], [0, 0, 0.6]), box(0.1, 0.1, 0.06, COL.wood, [0.7, 1.05, 0], [0, 0, -0.6])];
    case 'stonecutter': return [box(1.2, 0.6, 0.9, COL.wood, [0, 0.3, 0]), box(0.8, 0.4, 0.6, COL.stone, [0, 0.8, 0]), cyl(0.3, 0.3, 0.04, 10, COL.iron, [0.3, 1.0, 0], [Math.PI / 2, 0, 0])];
    case 'campfire': { const P = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; P.push(P_.dod(0.16, i % 2 ? COL.stone : COL.stone2, [Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55], [i, i * 2, 0], [1.2, 0.7, 1])); }
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; P.push(cyl(0.06, 0.06, 0.7, 5, COL.bark, [Math.cos(a) * 0.15, 0.12, Math.sin(a) * 0.15], [0, -a, 1.3])); } P.push(cyl(0.3, 0.32, 0.04, 8, 0x2a2420, [0, 0.02, 0])); return P; }
    case 'irori': { const P = [box(2, 0.12, 0.2, COL.darkwood, [0, 0.06, 0.9]), box(2, 0.12, 0.2, COL.darkwood, [0, 0.06, -0.9]), box(0.2, 0.12, 1.6, COL.darkwood, [0.9, 0.06, 0]), box(0.2, 0.12, 1.6, COL.darkwood, [-0.9, 0.06, 0]), box(1.6, 0.04, 1.6, 0x8a8478, [0, 0.03, 0])];
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; P.push(cyl(0.05, 0.05, 0.6, 5, COL.bark, [Math.cos(a) * 0.12, 0.1, Math.sin(a) * 0.12], [0, -a, 1.35])); }
      P.push(cyl(0.015, 0.015, 1.8, 4, COL.darkwood, [0, 1.6, 0]), cyl(0.2, 0.15, 0.25, 8, COL.black, [0, 0.62, 0]), box(0.3, 0.05, 0.08, COL.darkwood, [0, 0.9, 0])); return P; }
    case 'futon': return [box(1.0, 0.1, 2.0, 0xe8e0cc, [0, 0.05, 0]), box(1.02, 0.12, 1.3, 0x3a4f7a, [0, 0.14, 0.3]), box(0.5, 0.1, 0.25, 0xcfc4a8, [0, 0.15, -0.8])];
    case 'chest': return [box(1.2, 0.7, 0.7, COL.wood2, [0, 0.35, 0]), box(1.22, 0.04, 0.72, COL.darkwood, [0, 0.72, 0]), box(1.1, 0.02, 0.02, COL.darkwood, [0, 0.35, 0.36]), box(0.14, 0.06, 0.03, COL.iron, [-0.28, 0.52, 0.36]), box(0.14, 0.06, 0.03, COL.iron, [0.28, 0.52, 0.36]), box(0.14, 0.06, 0.03, COL.iron, [0, 0.18, 0.36]),
      box(0.06, 0.7, 0.06, COL.iron, [-0.6, 0.35, 0.35]), box(0.06, 0.7, 0.06, COL.iron, [0.6, 0.35, 0.35])];
    case 'chabudai': return [cyl(0.6, 0.6, 0.06, 10, COL.wood, [0, 0.36, 0]), box(0.08, 0.33, 0.08, COL.darkwood, [0.35, 0.165, 0.35]), box(0.08, 0.33, 0.08, COL.darkwood, [-0.35, 0.165, 0.35]), box(0.08, 0.33, 0.08, COL.darkwood, [0.35, 0.165, -0.35]), box(0.08, 0.33, 0.08, COL.darkwood, [-0.35, 0.165, -0.35]), cyl(0.06, 0.05, 0.08, 6, 0xe8e0cc, [0.15, 0.43, 0.1])];
    case 'zabuton': return [box(0.65, 0.1, 0.65, 0x8a2a3a, [0, 0.05, 0]), box(0.08, 0.04, 0.08, 0xe0c060, [0, 0.11, 0])];
    case 'tatami': return [box(0.98, 0.05, 1.98, 0xb5b06a, [0, 0.025, 0]), box(0.06, 0.055, 1.98, 0x2a3a2a, [-0.46, 0.028, 0]), box(0.06, 0.055, 1.98, 0x2a3a2a, [0.46, 0.028, 0])];
    case 'noren': return [box(1.5, 0.05, 0.05, COL.darkwood, [0, 1.17, 0]), box(0.45, 1.0, 0.02, 0x2a3d6a, [-0.47, 0.65, 0]), box(0.45, 1.0, 0.02, 0x2a3d6a, [0, 0.65, 0]), box(0.45, 1.0, 0.02, 0x2a3d6a, [0.47, 0.65, 0]), P_.tor(0.12, 0.02, 3, 8, TAU, 0xf0f0f0, [0, 0.75, 0.02])];
    case 'andon': return [box(0.42, 0.06, 0.42, COL.darkwood, [0, 0.12, 0]), box(0.05, 1.0, 0.05, COL.darkwood, [0.2, 0.5, 0.2]), box(0.05, 1.0, 0.05, COL.darkwood, [-0.2, 0.5, 0.2]), box(0.05, 1.0, 0.05, COL.darkwood, [0.2, 0.5, -0.2]), box(0.05, 1.0, 0.05, COL.darkwood, [-0.2, 0.5, -0.2]), box(0.38, 0.5, 0.38, COL.paper, [0, 0.65, 0])];
    case 'toro': return [box(0.7, 0.2, 0.7, COL.stone2, [0, 0.1, 0]), cyl(0.12, 0.15, 0.8, 6, COL.stone, [0, 0.6, 0]), box(0.6, 0.12, 0.6, COL.stone2, [0, 1.06, 0]), box(0.45, 0.4, 0.45, COL.stone, [0, 1.32, 0]), box(0.2, 0.22, 0.47, 0x2a2420, [0, 1.32, 0]), P_.tbox(0.9, 0.9, 0.1, 0.1, 0.35, COL.stone2, [0, 1.7, 0]), P_.sph(0.08, 5, 4, COL.stone, [0, 1.9, 0])];
    case 'torii': case 'portal': {
      const red = COL.vermilion, P = [];
      const w = id === 'portal' ? 3.2 : 4.6, h = id === 'portal' ? 3.6 : 4.4;
      P.push(cyl(0.16, 0.2, h, 8, red, [-w / 2 + 0.5, h / 2, 0]), cyl(0.16, 0.2, h, 8, red, [w / 2 - 0.5, h / 2, 0]));
      P.push(cyl(0.22, 0.22, 0.4, 8, COL.black, [-w / 2 + 0.5, 0.2, 0]), cyl(0.22, 0.22, 0.4, 8, COL.black, [w / 2 - 0.5, 0.2, 0]));
      P.push(box(w + 0.6, 0.3, 0.4, COL.black, [0, h + 0.15, 0]), box(w + 0.2, 0.22, 0.3, red, [0, h - 0.15, 0]), box(w - 0.6, 0.18, 0.2, red, [0, h - 0.75, 0]), box(0.2, 0.5, 0.15, red, [0, h - 0.42, 0]));
      P.push(box(0.3, 0.12, 0.42, COL.black, [w / 2 + 0.3, h + 0.25, 0], [0, 0, 0.25]), box(0.3, 0.12, 0.42, COL.black, [-w / 2 - 0.3, h + 0.25, 0], [0, 0, -0.25]));
      return P;
    }
  }
  return [box(1, 1, 1, 0x888888, [0, 0.5, 0])];
}
function pieceGeo(id) { return model('piece:' + id, () => buildModel(pieceParts(id), { jitter: 0.08, seed: id.length })); }

// ---------- structures at points of interest ----------
function poiParts(type, seed) {
  const r = mulberry32(seed), box = P_.box, cyl = P_.cyl, P = [];
  if (type === 'shrine') {
    // a raised stone platform, five pedestals in an arc, a torii and a crow on a post
    P.push(cyl(9, 9.5, 0.6, 16, COL.stone2, [0, 0.0, 0]));
    P.push(cyl(8.6, 8.6, 0.1, 16, 0x76736a, [0, 0.33, 0]));
    for (let i = 0; i < 5; i++) { const a = Math.PI + (i - 2) * 0.42 - Math.PI / 2; const x = Math.cos(a) * 6.5, z = Math.sin(a) * 6.5;
      P.push(box(0.9, 1.1, 0.9, COL.stone, [x, 0.9, z], [0, -a, 0]), box(1.1, 0.15, 1.1, COL.stone2, [x, 1.5, z], [0, -a, 0])); }
    P.push(...objParts('torii').map((p) => Object.assign({}, p, { p: [p.p[0], p.p[1] + 0.3, p.p[2] + 9.5] })));
    const cx = 0, cz = -7.6;
    P.push(cyl(0.12, 0.15, 2.4, 6, COL.darkwood, [cx, 1.5, cz]));
    P.push(P_.sph(0.3, 6, 5, COL.black, [cx, 2.95, cz], 0, [1, 0.85, 1.3]), P_.sph(0.18, 6, 4, COL.black, [cx, 3.25, cz + 0.28]), P_.cone(0.07, 0.25, 4, 0x3a3a3a, [cx, 3.22, cz + 0.5], [Math.PI / 2, 0, 0]), box(0.5, 0.06, 0.6, COL.black, [cx, 2.95, cz - 0.35], [0.3, 0, 0]));
    for (let k = 0; k < 3; k++) P.push(cyl(0.02, 0.02, 0.35, 3, 0x3a3a3a, [cx + (k - 1) * 0.1, 2.55, cz + 0.05]));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; P.push(...objParts('toro').map((p) => Object.assign({}, p, { p: [p.p[0] + Math.cos(a) * 8, p.p[1] + 0.3, p.p[2] + Math.sin(a) * 8] }))); }
  } else if (type === 'altar1') {
    P.push(cyl(5, 5.4, 0.5, 12, COL.stone2, [0, 0, 0]));
    P.push(box(2.2, 1.0, 1.4, COL.stone, [0, 0.75, 0]), box(2.5, 0.15, 1.7, COL.stone2, [0, 1.3, 0]));
    // boar statue
    P.push(box(1.0, 0.7, 1.6, 0xb8b6ae, [0, 2.0, -0.1]), box(0.7, 0.55, 0.6, 0xc4c2ba, [0, 2.05, 0.9]), P_.tor(0.25, 0.05, 4, 8, Math.PI * 0.9, 0xeee6d0, [0.25, 2.0, 1.15], [0, 0, 0.3]), P_.tor(0.25, 0.05, 4, 8, Math.PI * 0.9, 0xeee6d0, [-0.25, 2.0, 1.15], [0, Math.PI, 0.3]));
    for (let i = 0; i < 4; i++) P.push(box(0.2, 0.35, 0.2, 0xb0aea6, [i % 2 ? 0.35 : -0.35, 1.55, i < 2 ? 0.45 : -0.6]));
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P.push(box(0.6, 1.8 + r() * 1.2, 0.5, COL.stone, [Math.cos(a) * 4.4, 0.9, Math.sin(a) * 4.4], [r() * 0.2, -a, r() * 0.2])); }
  } else if (type === 'altar2') {
    P.push(cyl(8, 8.5, 0.5, 14, COL.moss, [0, 0, 0]));
    // the old cedar's stump with its rope, an offering stone in front, roots fanning across the grove
    P.push(cyl(1.1, 1.5, 1.3, 10, COL.cedarBark, [0, 0.65, -1]), cyl(1.0, 1.0, 0.05, 10, 0xb98a5a, [0, 1.31, -1]));
    P.push(P_.tor(1.35, 0.12, 5, 14, TAU, 0xe8dcb0, [0, 0.9, -1], [Math.PI / 2, 0, 0]));
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; P.push(box(0.2, 0.5, 0.02, 0xffffff, [Math.cos(a) * 1.45, 0.6, Math.sin(a) * 1.45 - 1], [0, -a + Math.PI / 2, 0])); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; P.push(cyl(0.12, 0.3, 3.5, 5, COL.cedarBark, [Math.cos(a) * 2.6, 0.1, Math.sin(a) * 2.6 - 1], [Math.sin(a) * 1.45, 0, -Math.cos(a) * 1.45])); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; P.push(P_.dod(0.5 + r() * 0.4, COL.stone2, [Math.cos(a) * 8.2, 0.2, Math.sin(a) * 8.2], [r(), r(), r()], [1, 0.7, 1])); }
    P.push(box(1.4, 0.8, 0.9, COL.stone, [0, 0.4, 4.6]), box(1.6, 0.12, 1.1, COL.stone2, [0, 0.86, 4.6]));
  } else if (type === 'ema') {
    P.push(box(0.15, 2.0, 0.15, COL.darkwood, [-0.8, 1.0, 0]), box(0.15, 2.0, 0.15, COL.darkwood, [0.8, 1.0, 0]), box(2.0, 0.1, 0.4, COL.darkwood, [0, 2.0, 0]), box(1.8, 0.06, 0.06, COL.darkwood, [0, 1.6, 0]));
    for (let i = 0; i < 5; i++) P.push(P_.tbox(0.3, 0.03, 0.3, 0.03, 0.2, COL.hinoki, [-0.6 + i * 0.3, 1.45, 0.04], [0, 0, 0]), P_.cone(0.15, 0.08, 4, COL.hinoki, [-0.6 + i * 0.3, 1.59, 0.04], [0, Math.PI / 4, 0], [1, 1, 0.12]));
  } else if (type === 'haunted') {
    // ruined compound: broken walls, toppled torii, stone lanterns
    const wallc = 0x8a8478;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU, x = Math.cos(a) * 9, z = Math.sin(a) * 9;
      for (let k = -2; k <= 2; k++) { if (i === 0 && Math.abs(k) < 1) continue; if (r() < 0.25) continue;
        const hh = 1.2 + r() * 1.4; const ox = -Math.sin(a) * k * 2, oz = Math.cos(a) * k * 2;
        P.push(box(2, hh, 0.6, r() < 0.5 ? wallc : COL.stone2, [x + ox, hh / 2, z + oz], [0, -a + Math.PI / 2, 0])); }
    }
    P.push(cyl(0.18, 0.2, 3.6, 8, 0x7a3a2a, [10.5, 1.8, -2.2]), cyl(0.18, 0.2, 1.4, 8, 0x7a3a2a, [10.5, 0.7, 2.2]), box(0.4, 0.3, 5.4, 0x2a2420, [11.2, 0.15, 0.6], [0.1, 0.2, 0.05]));
    P.push(box(4, 0.4, 3, COL.stone2, [-3, 0.2, 0]), box(3, 2.2, 2, 0x4e3a2a, [-3, 1.5, 0]), P_.tbox(3.8, 3, 0.4, 2.6, 1.2, 0x2e2a26, [-3, 3.2, 0]));
    for (let i = 0; i < 4; i++) { const x = i < 2 ? 4 : -7, z = i % 2 ? 4 : -4; P.push(...objParts('toro').map((p) => Object.assign({}, p, { p: [p.p[0] + x, p.p[1], p.p[2] + z], r: [0.05 * i, 0, 0.08 * (i - 1)] }))); }
  } else if (type === 'nest') {
    P.push(box(1.6, 0.4, 1.4, 0x5a554c, [0, 0.2, 0]), box(1.0, 1.0, 0.9, 0x3a2c22, [0, 0.9, 0]), P_.tbox(1.6, 1.4, 0.1, 1.2, 0.6, 0x24201c, [0, 1.7, 0]),
      box(0.5, 0.6, 0.05, 0x150a18, [0, 0.85, 0.46]), cyl(0.05, 0.05, 0.6, 4, 0xe8dcb0, [0, 1.35, 0.5], [0, 0, Math.PI / 2]));
    for (let i = 0; i < 5; i++) { const a = r() * TAU; P.push(P_.dod(0.3 + r() * 0.3, COL.stone2, [Math.cos(a) * 1.5, 0.15, Math.sin(a) * 1.5])); }
  } else if (type === 'ruin') {
    for (let i = 0; i < 6; i++) { const hh = 0.6 + r() * 1.6; P.push(box(2, hh, 0.24, i % 2 ? COL.wood2 : 0x6b5236, [(i % 3 - 1) * 2, hh / 2, i < 3 ? -3 : 3], [0, 0, (r() - 0.5) * 0.2])); }
    P.push(box(0.26, 2.4, 0.26, COL.darkwood, [-3, 1.2, -3]), box(0.26, 1.8, 0.26, COL.darkwood, [3, 0.9, 3]), box(6, 0.2, 0.26, COL.darkwood, [0, 2.3, -3], [0, 0, 0.12]));
    P.push(P_.tbox(4, 3, 0.2, 2.6, 1.4, COL.thatch2, [1.5, 0.6, 0.5], [0.3, 0.4, 0.5]));
  }
  return P;
}
function poiGeo(type, seed) { return model('poi:' + type + seed, () => buildModel(poiParts(type, seed), { jitter: 0.1, seed })); }

// ---------- character & creature rigs ----------
// A rig is a Group with named pivots; animation code rotates the pivots.
function pivot(parent, parts, x = 0, y = 0, z = 0, mat = R.mat.vc) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  if (parts && parts.length) { const m = new THREE.Mesh(buildModel(parts, { jitter: 0.06 }), mat); m.castShadow = true; o.add(m); o.userData.mesh = m; }
  parent.add(o);
  return o;
}
// Biped: hip height hh, proportions scale; colours { skin, shirt, pants, hair, ... }
function makeBiped(o) {
  const s = o.scale || 1, c = o.colors;
  const root = new THREE.Group(), rig = { root, type: 'biped' };
  const legL = 0.45 * s * (o.leg || 1), shinL = 0.45 * s * (o.leg || 1), torsoH = 0.55 * s * (o.torso || 1), armL = 0.32 * s * (o.arm || 1), foreL = 0.3 * s * (o.arm || 1);
  const bw = 0.36 * s * (o.width || 1), bd = 0.22 * s * (o.depth || 1);
  rig.hipY = legL + shinL;
  rig.hips = pivot(root, o.hipsParts ? o.hipsParts(s) : [P_.box(bw * 0.95, 0.16 * s, bd, c.pants, [0, 0, 0])], 0, rig.hipY, 0);
  rig.torso = pivot(rig.hips, o.torsoParts ? o.torsoParts(s, torsoH, bw, bd) : [P_.tbox(bw * 0.9, bd, bw, bd * 1.05, torsoH, c.shirt, [0, torsoH / 2, 0])], 0, 0.05 * s, 0);
  rig.head = pivot(rig.torso, o.headParts ? o.headParts(s) : [P_.box(0.22 * s, 0.26 * s, 0.24 * s, c.skin, [0, 0.13 * s, 0])], 0, torsoH + 0.02 * s, 0);
  const sh = torsoH - 0.06 * s;
  for (const side of [-1, 1]) {
    const k = side < 0 ? 'L' : 'R';
    const arm = pivot(rig.torso, o.armParts ? o.armParts(s, armL, side) : [P_.box(0.1 * s * (o.limb || 1), armL, 0.1 * s * (o.limb || 1), c.arm || c.shirt, [0, -armL / 2, 0])], side * (bw / 2 + 0.06 * s), sh, 0);
    const fore = pivot(arm, o.foreParts ? o.foreParts(s, foreL, side) : [P_.box(0.085 * s * (o.limb || 1), foreL, 0.085 * s * (o.limb || 1), c.fore || c.skin, [0, -foreL / 2, 0])], 0, -armL, 0);
    const hand = pivot(fore, [P_.box(0.08 * s * (o.limb || 1), 0.09 * s, 0.09 * s, c.hand || c.skin, [0, -0.04 * s, 0])], 0, -foreL, 0);
    rig['arm' + k] = arm; rig['fore' + k] = fore; rig['hand' + k] = hand;
    const leg = pivot(rig.hips, o.legParts ? o.legParts(s, legL, side) : [P_.box(0.13 * s * (o.limb || 1), legL, 0.14 * s * (o.limb || 1), c.pants, [0, -legL / 2, 0])], side * bw * 0.27, 0, 0);
    const shin = pivot(leg, o.shinParts ? o.shinParts(s, shinL, side) : [P_.box(0.11 * s * (o.limb || 1), shinL, 0.12 * s * (o.limb || 1), c.shin || c.pants, [0, -shinL / 2, 0]), P_.box(0.12 * s, 0.07 * s, 0.22 * s, c.foot || 0x3a2a1e, [0, -shinL + 0.035 * s, 0.04 * s])], 0, -legL, 0);
    rig['leg' + k] = leg; rig['shin' + k] = shin;
  }
  rig.s = s; rig.armLen = armL; rig.legLen = legL;
  return rig;
}
function makeQuad(o) {
  const s = o.scale || 1, c = o.colors, root = new THREE.Group(), rig = { root, type: 'quad' };
  const bl = o.bodyLen * s, bh = o.legH * s;
  rig.hipY = bh;
  rig.body = pivot(root, o.bodyParts(s), 0, bh, 0);
  rig.head = pivot(rig.body, o.headParts(s), 0, o.neckY * s, bl / 2);
  rig.legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = pivot(rig.body, [P_.box(o.legW * s, bh, o.legW * s, c.leg, [0, -bh / 2, 0]), P_.box(o.legW * s * 1.05, 0.06 * s, o.legW * s * 1.1, c.hoof || 0x2a2420, [0, -bh + 0.03 * s, 0])], x * o.bodyW * s * 0.36, 0, z * bl * 0.38);
    rig.legs.push(leg);
  }
  if (o.tailParts) rig.tail = pivot(rig.body, o.tailParts(s), 0, 0.1 * s, -bl / 2);
  rig.s = s;
  return rig;
}

function mobRig(type, stars = 0) {
  let rig;
  switch (type) {
    case 'deer': rig = makeQuad({ scale: 1, bodyLen: 1.1, legH: 0.85, legW: 0.08, bodyW: 0.42, neckY: 0.25, colors: { leg: 0x9a6a40, hoof: 0x2a2420 },
      bodyParts: (s) => [P_.box(0.42 * s, 0.45 * s, 1.1 * s, 0xa8743f, [0, 0.12 * s, 0]), P_.box(0.3 * s, 0.1 * s, 0.7 * s, 0xe8dcc0, [0, -0.1 * s, 0]), ...[[0.1, 0.3, 0.2], [-0.12, 0.32, -0.1], [0.08, 0.3, -0.3]].map((p) => P_.box(0.07 * s, 0.03 * s, 0.07 * s, 0xf0e6d0, [p[0] * s, p[1] * s, p[2] * s]))],
      headParts: (s) => [P_.box(0.16 * s, 0.5 * s, 0.18 * s, 0xa8743f, [0, 0.25 * s, 0.06 * s], [0.4, 0, 0]), P_.box(0.2 * s, 0.2 * s, 0.36 * s, 0xa8743f, [0, 0.55 * s, 0.26 * s]), P_.box(0.08 * s, 0.08 * s, 0.06 * s, 0x1a1a1a, [0, 0.55 * s, 0.45 * s]),
        P_.box(0.05 * s, 0.14 * s, 0.03 * s, 0x8a5a30, [0.12 * s, 0.7 * s, 0.15 * s], [0, 0, -0.6]), P_.box(0.05 * s, 0.14 * s, 0.03 * s, 0x8a5a30, [-0.12 * s, 0.7 * s, 0.15 * s], [0, 0, 0.6]),
        P_.cyl(0.015 * s, 0.025 * s, 0.4 * s, 3, 0xd8c8a0, [0.1 * s, 0.85 * s, 0.2 * s], [0, 0, -0.4]), P_.cyl(0.015 * s, 0.025 * s, 0.4 * s, 3, 0xd8c8a0, [-0.1 * s, 0.85 * s, 0.2 * s], [0, 0, 0.4]),
        P_.cyl(0.01 * s, 0.015 * s, 0.2 * s, 3, 0xd8c8a0, [0.2 * s, 0.95 * s, 0.25 * s], [0.5, 0, -1.0]), P_.cyl(0.01 * s, 0.015 * s, 0.2 * s, 3, 0xd8c8a0, [-0.2 * s, 0.95 * s, 0.25 * s], [0.5, 0, 1.0])],
      tailParts: (s) => [P_.box(0.1 * s, 0.14 * s, 0.06 * s, 0xf0e6d0, [0, 0.05 * s, -0.03 * s])] }); break;
    case 'boar': case 'shirokiba': {
      const big = type === 'shirokiba', fur = big ? 0xe8e6de : 0x4e3a2c, fur2 = big ? 0xc8c4b8 : 0x3a2c22, belly = big ? 0xb8b2a4 : 0x5a4636, sc = big ? 2.6 : 1;
      const eye = big ? 0x7fd6ff : 0x111111;
      rig = makeQuad({ scale: sc, bodyLen: 1.0, legH: 0.38, legW: 0.11, bodyW: 0.5, neckY: 0.12, colors: { leg: fur2, hoof: 0x1a1612 },
        bodyParts: (s) => {
          const P = [
            P_.tbox(0.5 * s, 0.62 * s, 0.4 * s, 0.5 * s, 0.5 * s, fur, [0, 0.2 * s, 0.18 * s]),     // chest & shoulders
            P_.tbox(0.42 * s, 0.5 * s, 0.34 * s, 0.4 * s, 0.4 * s, fur2, [0, 0.16 * s, -0.32 * s]),  // rump
            P_.box(0.36 * s, 0.12 * s, 0.8 * s, belly, [0, -0.06 * s, -0.02 * s]),
          ];
          // bristly crest along the spine
          for (let i = 0; i < 7; i++) { const z = 0.4 - i * 0.12; P.push(P_.tbox(0.12 * s, 0.1 * s, 0.01, 0.06 * s, (0.22 - i * 0.02) * s, i % 2 ? fur2 : fur, [0, (0.52 - i * 0.025) * s, z * s], [-0.3, 0, 0])); }
          if (big) {
            P.push(P_.tor(0.34 * s, 0.035 * s, 4, 14, TAU, 0xe8dcb0, [0, 0.2 * s, 0.12 * s], [0, 0, 0], [1, 1.25, 1]));
            for (let i = 0; i < 3; i++) P.push(P_.box(0.08 * s, 0.2 * s, 0.01 * s, 0xffffff, [(i - 1) * 0.15 * s, -0.17 * s, 0.33 * s]));
            for (let i = 0; i < 5; i++) P.push(P_.box(0.05 * s, 0.03 * s, 0.25 * s, 0x9fe0ff, [(i - 2) * 0.09 * s, 0.38 * s, -0.1 * s], [0.2, 0, 0]));
          }
          return P;
        },
        headParts: (s) => [
          P_.tbox(0.4 * s, 0.36 * s, 0.22 * s, 0.2 * s, 0.46 * s, fur, [0, 0.0, 0.2 * s], [Math.PI / 2 - 0.35, 0, 0]),
          P_.cyl(0.08 * s, 0.09 * s, 0.06 * s, 7, big ? 0xd8a8a0 : 0x6a4a3e, [0, -0.1 * s, 0.44 * s], [Math.PI / 2 - 0.35, 0, 0]),
          P_.tor(0.12 * s, 0.022 * s, 3, 7, Math.PI * 0.85, 0xf2ead4, [0.11 * s, -0.08 * s, 0.34 * s], [0, -0.35, 0.9]),
          P_.tor(0.12 * s, 0.022 * s, 3, 7, Math.PI * 0.85, 0xf2ead4, [-0.11 * s, -0.08 * s, 0.34 * s], [0, Math.PI + 0.35, 0.9]),
          P_.box(0.045 * s, 0.035 * s, 0.02 * s, eye, [0.12 * s, 0.08 * s, 0.22 * s]), P_.box(0.045 * s, 0.035 * s, 0.02 * s, eye, [-0.12 * s, 0.08 * s, 0.22 * s]),
          P_.tbox(0.1 * s, 0.03 * s, 0.03 * s, 0.01 * s, 0.14 * s, fur2, [0.16 * s, 0.2 * s, 0.04 * s], [0, 0, -0.5]), P_.tbox(0.1 * s, 0.03 * s, 0.03 * s, 0.01 * s, 0.14 * s, fur2, [-0.16 * s, 0.2 * s, 0.04 * s], [0, 0, 0.5]),
        ],
        tailParts: (s) => [P_.cyl(0.015 * s, 0.02 * s, 0.2 * s, 3, fur2, [0, -0.08 * s, -0.04 * s], [0.4, 0, 0]), P_.cone(0.04 * s, 0.08 * s, 4, fur2, [0, -0.2 * s, -0.06 * s], [Math.PI, 0, 0])] });
      break;
    }
    case 'gaki': case 'gaki_f': case 'gaki_brute': case 'gaki_shaman': {
      const brute = type === 'gaki_brute', sham = type === 'gaki_shaman', lesser = type === 'gaki';
      const skin = brute ? 0x8a8a7a : sham ? 0x9a8a9a : lesser ? 0xb8b0a0 : 0xa59d8c;
      const sc = brute ? 1.35 : lesser ? 0.7 : 0.88;
      rig = makeBiped({ scale: sc, colors: { skin, shirt: skin, pants: 0x5a4a3a, arm: skin, shin: skin, foot: skin }, leg: 0.8, arm: 1.35, limb: brute ? 1.5 : 0.75, width: brute ? 1.5 : 0.9,
        torsoParts: (s, th, bw, bd) => [P_.tbox(bw * 0.7, bd * 0.8, bw * 0.95, bd, th, skin, [0, th / 2, 0]), P_.sph(bw * 0.62, 7, 5, skin, [0, th * 0.3, bd * 0.35], 0, [1, 0.9, 1]), ...[0.25, 0.45, 0.62].map((y) => P_.box(bw * 0.9, 0.025 * s, bd * 0.2, 0x7a7262, [0, th * y + th * 0.3, -bd * 0.5]))],
        hipsParts: (s) => [P_.box(0.34 * s, 0.18 * s, 0.24 * s, sham ? 0x4a2a4a : 0x5a4a3a, [0, -0.03 * s, 0])],
        headParts: (s) => { const P = [P_.box(0.26 * s, 0.28 * s, 0.26 * s, skin, [0, 0.12 * s, 0.04 * s]), P_.box(0.24 * s, 0.08 * s, 0.1 * s, 0x2a1a14, [0, 0.0, 0.17 * s]),
          P_.box(0.06 * s, 0.05 * s, 0.02 * s, 0xffe060, [0.07 * s, 0.17 * s, 0.17 * s]), P_.box(0.06 * s, 0.05 * s, 0.02 * s, 0xffe060, [-0.07 * s, 0.17 * s, 0.17 * s])];
          for (let i = 0; i < 4; i++) P.push(P_.cone(0.015 * s, 0.05 * s, 3, 0xeeeeee, [(i - 1.5) * 0.05 * s, 0.02 * s, 0.22 * s], [Math.PI, 0, 0]));
          if (sham) P.push(P_.cone(0.18 * s, 0.2 * s, 6, 0x4a2a4a, [0, 0.34 * s, 0]), P_.box(0.24 * s, 0.24 * s, 0.03 * s, 0xe8dcc0, [0, 0.14 * s, 0.19 * s]), P_.box(0.04 * s, 0.04 * s, 0.01 * s, 0x111111, [0.06 * s, 0.17 * s, 0.205 * s]), P_.box(0.04 * s, 0.04 * s, 0.01 * s, 0x111111, [-0.06 * s, 0.17 * s, 0.205 * s]));
          else P.push(P_.box(0.03 * s, 0.1 * s, 0.03 * s, 0x2a2a2a, [0.06 * s, 0.3 * s, 0]), P_.box(0.03 * s, 0.12 * s, 0.03 * s, 0x2a2a2a, [-0.05 * s, 0.31 * s, 0.02 * s]));
          return P; } });
      if (brute) rig.weapon = attachHeld(rig.handR, [P_.cyl(0.05, 0.09, 1.0, 5, COL.bark, [0, 0.35, 0]), P_.ico(0.14, 0, COL.bark, [0, 0.9, 0])]);
      if (sham) rig.weapon = attachHeld(rig.handR, [P_.cyl(0.02, 0.02, 1.4, 4, COL.darkwood, [0, 0.4, 0]), P_.ico(0.08, 0, 0xa070ff, [0, 1.15, 0])]);
      break;
    }
    case 'kappa': {
      const g = 0x5f8a3a;
      rig = makeBiped({ scale: 0.75, colors: { skin: g, shirt: g, pants: g, arm: g, shin: g, foot: 0x4a6a2a, hand: 0x4a6a2a }, leg: 0.75, arm: 1.1, limb: 0.9,
        torsoParts: (s, th, bw, bd) => [P_.tbox(bw * 0.9, bd, bw, bd * 1.1, th, g, [0, th / 2, 0]), P_.sph(bw * 0.75, 8, 5, 0x6a5232, [0, th * 0.55, -bd * 0.5], 0, [1, 1.1, 0.6]), ...[-1, 0, 1].map((k) => P_.box(bw * 0.25, 0.03 * s, 0.03 * s, 0x4a3a22, [k * bw * 0.25, th * 0.55, -bd * 0.95])), P_.box(bw * 0.7, th * 0.7, 0.02 * s, 0xd8c87a, [0, th * 0.45, bd * 0.56])],
        headParts: (s) => [P_.sph(0.16 * s, 7, 5, g, [0, 0.14 * s, 0.02 * s]), P_.cone(0.06 * s, 0.14 * s, 4, 0xd8b030, [0, 0.1 * s, 0.2 * s], [Math.PI / 2, 0, 0], [1, 1, 0.6]), P_.cyl(0.11 * s, 0.11 * s, 0.03 * s, 8, 0xd0e8f0, [0, 0.29 * s, 0]),
          ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => P_.box(0.04 * s, 0.08 * s, 0.02 * s, 0x2a3a1a, [Math.cos(i / 8 * TAU) * 0.15 * s, 0.25 * s, Math.sin(i / 8 * TAU) * 0.15 * s], [0, -i / 8 * TAU, 0.4])),
          P_.box(0.05 * s, 0.05 * s, 0.02 * s, 0xffffff, [0.07 * s, 0.18 * s, 0.15 * s]), P_.box(0.05 * s, 0.05 * s, 0.02 * s, 0xffffff, [-0.07 * s, 0.18 * s, 0.15 * s])] });
      break;
    }
    case 'oni': {
      const red = 0xb8342a;
      rig = makeBiped({ scale: 2.4, colors: { skin: red, shirt: red, pants: 0xd4a03a, arm: red, fore: red, hand: red, shin: red, foot: red }, width: 1.35, depth: 1.2, limb: 1.5, arm: 1.15,
        hipsParts: (s) => [P_.box(0.5 * s, 0.24 * s, 0.32 * s, 0xd4a03a, [0, -0.02 * s, 0]), ...[-1, 0, 1].map((k) => P_.box(0.06 * s, 0.25 * s, 0.33 * s, 0x1a1a1a, [k * 0.15 * s, -0.02 * s, 0], [0, 0, 0.3]))],
        torsoParts: (s, th, bw, bd) => [P_.tbox(bw * 0.95, bd, bw * 1.15, bd * 1.1, th, red, [0, th / 2, 0]), P_.box(bw * 0.4, th * 0.3, 0.02 * s, 0xa02a22, [bw * 0.22, th * 0.65, bd * 0.56]), P_.box(bw * 0.4, th * 0.3, 0.02 * s, 0xa02a22, [-bw * 0.22, th * 0.65, bd * 0.56])],
        headParts: (s) => [P_.box(0.3 * s, 0.32 * s, 0.3 * s, red, [0, 0.16 * s, 0]), P_.box(0.3 * s, 0.08 * s, 0.06 * s, 0x8a2a20, [0, 0.24 * s, 0.15 * s]), P_.box(0.06 * s, 0.04 * s, 0.02 * s, 0xffe060, [0.07 * s, 0.2 * s, 0.155 * s]), P_.box(0.06 * s, 0.04 * s, 0.02 * s, 0xffe060, [-0.07 * s, 0.2 * s, 0.155 * s]),
          P_.cone(0.04 * s, 0.16 * s, 4, 0xf0e6c8, [0.09 * s, 0.38 * s, 0.02 * s], [0, 0, -0.3]), P_.cone(0.04 * s, 0.16 * s, 4, 0xf0e6c8, [-0.09 * s, 0.38 * s, 0.02 * s], [0, 0, 0.3]), P_.box(0.2 * s, 0.05 * s, 0.04 * s, 0xffffff, [0, 0.04 * s, 0.15 * s]),
          P_.cone(0.02 * s, 0.06 * s, 3, 0xffffff, [0.07 * s, 0.09 * s, 0.155 * s]), P_.cone(0.02 * s, 0.06 * s, 3, 0xffffff, [-0.07 * s, 0.09 * s, 0.155 * s]), P_.box(0.34 * s, 0.12 * s, 0.32 * s, 0x1a1a1a, [0, 0.31 * s, -0.04 * s])] });
      rig.weapon = attachHeld(rig.handR, [P_.cyl(0.06, 0.08, 0.5, 6, COL.darkwood, [0, 0.0, 0]), P_.cyl(0.16, 0.1, 1.5, 8, COL.iron, [0, 0.95, 0]), ...[0, 1, 2, 3, 4, 5].map((i) => P_.cone(0.04, 0.1, 4, 0x5a5a5a, [Math.cos(i) * 0.15, 0.7 + i * 0.12, Math.sin(i) * 0.15], [0, 0, Math.PI / 2 - i]))]);
      rig.weapon.scale.setScalar(1.6);
      break;
    }
    case 'ochimusha': case 'ochimusha_archer': {
      const bone = COL.bone, arm = 0x3a2a2a;
      rig = makeBiped({ scale: 1, colors: { skin: bone, shirt: arm, pants: 0x2a2424, arm: bone, fore: bone, hand: bone, shin: bone, foot: bone }, limb: 0.55,
        torsoParts: (s, th, bw, bd) => [P_.tbox(bw * 0.5, bd * 0.6, bw * 0.7, bd * 0.7, th, bone, [0, th / 2, 0]), ...[0, 1, 2, 3].map((i) => P_.box(bw * 1.05, 0.08, bd * 1.1, i % 2 ? 0x5a2a24 : 0x2a2424, [0, th * 0.35 + i * 0.09, 0])), P_.box(bw * 0.5, 0.06, bd * 1.2, 0x5a2a24, [bw * 0.55, th - 0.05, 0], [0, 0, -0.5]), P_.box(bw * 0.5, 0.06, bd * 1.2, 0x5a2a24, [-bw * 0.55, th - 0.05, 0], [0, 0, 0.5])],
        headParts: (s) => [P_.box(0.2, 0.22, 0.22, bone, [0, 0.11, 0]), P_.box(0.05, 0.05, 0.02, 0x7fd6ff, [0.05, 0.13, 0.11]), P_.box(0.05, 0.05, 0.02, 0x7fd6ff, [-0.05, 0.13, 0.11]), P_.box(0.14, 0.04, 0.02, 0x222222, [0, 0.04, 0.11]),
          P_.sph(0.16, 7, 4, 0x2a2424, [0, 0.2, -0.02], 0, [1, 0.7, 1]), P_.box(0.4, 0.04, 0.2, 0x2a2424, [0, 0.12, -0.12], [0.4, 0, 0]), P_.cone(0.03, 0.2, 3, COL.gold, [0.07, 0.34, 0.08], [0.2, 0, -0.5]), P_.cone(0.03, 0.2, 3, COL.gold, [-0.07, 0.34, 0.08], [0.2, 0, 0.5])] });
      if (type === 'ochimusha') rig.weapon = attachHeld(rig.handR, [P_.cyl(0.02, 0.02, 0.24, 4, 0x1a1a1a, [0, 0, 0]), P_.box(0.04, 0.85, 0.012, 0x8a8a7a, [0, 0.55, 0], [0, 0, 0.05])]);
      else rig.weapon = attachHeld(rig.handL, heldParts('crude_bow'));
      break;
    }
    case 'osugi': {
      const bark = COL.cedarBark;
      rig = makeBiped({ scale: 4.6, colors: { skin: bark, shirt: bark, pants: bark, arm: bark, fore: bark, hand: 0x4a2a1a, shin: bark, foot: 0x4a2a1a }, width: 1.5, depth: 1.4, limb: 1.6, arm: 1.4, leg: 0.9,
        torsoParts: (s, th, bw, bd) => { const P = [P_.tbox(bw * 0.9, bd, bw * 1.1, bd * 1.1, th, bark, [0, th / 2, 0]), P_.tor(bw * 0.62, 0.03 * s, 5, 12, TAU, 0xe8dcb0, [0, th * 0.55, 0], [Math.PI / 2, 0, 0], [1, 0.8, 1])];
          for (let i = 0; i < 5; i++) P.push(P_.box(0.06 * s, 0.15 * s, 0.005 * s, 0xffffff, [(i - 2) * 0.09 * s, th * 0.45, bd * 0.58]));
          P.push(P_.cone(0.2 * s, 0.4 * s, 6, COL.cedar, [0.18 * s, th + 0.05 * s, 0], [0, 0, -0.6]), P_.cone(0.2 * s, 0.4 * s, 6, COL.cedar2, [-0.18 * s, th + 0.05 * s, 0], [0, 0, 0.6]));
          return P; },
        headParts: (s) => [P_.box(0.26 * s, 0.24 * s, 0.24 * s, bark, [0, 0.12 * s, 0]), P_.box(0.05 * s, 0.03 * s, 0.01 * s, 0x9cff9a, [0.06 * s, 0.15 * s, 0.125 * s]), P_.box(0.05 * s, 0.03 * s, 0.01 * s, 0x9cff9a, [-0.06 * s, 0.15 * s, 0.125 * s]),
          P_.cone(0.3 * s, 0.6 * s, 7, COL.cedar, [0, 0.5 * s, 0]), P_.cone(0.22 * s, 0.5 * s, 7, COL.cedar2, [0, 0.8 * s, 0]), P_.cone(0.13 * s, 0.4 * s, 7, COL.cedar, [0, 1.05 * s, 0])] });
      break;
    }
    case 'root': {
      const root = new THREE.Group();
      rig = { root, type: 'root', hipY: 0 };
      rig.seg = [];
      let parent = root;
      for (let i = 0; i < 4; i++) { const p = pivot(parent, [P_.cyl(0.12 - i * 0.025, 0.18 - i * 0.03, 0.6, 5, COL.cedarBark, [0, 0.3, 0])], 0, i ? 0.6 : 0, 0); rig.seg.push(p); parent = p; }
      pivot(parent, [P_.cone(0.06, 0.3, 4, 0x4a7a3a, [0, 0.15, 0])], 0, 0.6, 0);
      break;
    }
  }
  if (stars) rig.root.scale.multiplyScalar(1 + stars * 0.1);
  return rig;
}
function attachHeld(hand, parts) {
  const o = new THREE.Object3D();
  const m = new THREE.Mesh(buildModel(parts), R.mat.vc); m.castShadow = true;
  o.add(m); o.rotation.x = Math.PI / 2; hand.add(o);
  return o;
}

// The player character: hair/skin/build options from character creation.
const SKIN_TONES = [0xf1d0b0, 0xdcae88, 0xc08a62, 0x9a6844, 0x6e4a32, 0x4e3424];
const HAIR_COLS = [0x1a1512, 0x3a2618, 0x6a4628, 0x9a7a4a, 0xb8b2a8, 0x8a2a1a];
const HAIR_STYLES = ['Topknot', 'Long tied', 'Short', 'Shaved'];
function makePlayerRig(look) {
  const skin = SKIN_TONES[look.skin || 0], hair = HAIR_COLS[look.hairCol || 0];
  const rig = makeBiped({ scale: look.build === 1 ? 1.03 : 0.98, width: look.build === 1 ? 1.05 : 0.95, colors: { skin, shirt: 0xd6cbb0, pants: 0xb8ad94, arm: 0xd6cbb0, fore: skin, foot: 0x6a5238 },
    headParts: (s) => {
      const P = [P_.box(0.21 * s, 0.25 * s, 0.23 * s, skin, [0, 0.13 * s, 0.01 * s]), P_.box(0.04 * s, 0.03 * s, 0.01 * s, 0x1a1a1a, [0.05 * s, 0.15 * s, 0.125 * s]), P_.box(0.04 * s, 0.03 * s, 0.01 * s, 0x1a1a1a, [-0.05 * s, 0.15 * s, 0.125 * s])];
      const st = look.hair || 0;
      if (st !== 3) P.push(P_.box(0.23 * s, 0.08 * s, 0.25 * s, hair, [0, 0.27 * s, 0]), P_.box(0.23 * s, 0.18 * s, 0.06 * s, hair, [0, 0.18 * s, -0.11 * s]), P_.box(0.03 * s, 0.12 * s, 0.2 * s, hair, [0.11 * s, 0.2 * s, -0.02 * s]), P_.box(0.03 * s, 0.12 * s, 0.2 * s, hair, [-0.11 * s, 0.2 * s, -0.02 * s]));
      if (st === 0) P.push(P_.cyl(0.04 * s, 0.05 * s, 0.14 * s, 5, hair, [0, 0.34 * s, -0.04 * s], [0.6, 0, 0]));
      if (st === 1) P.push(P_.box(0.08 * s, 0.35 * s, 0.05 * s, hair, [0, 0.05 * s, -0.15 * s]));
      if (look.beard) P.push(P_.box(0.17 * s, 0.1 * s, 0.05 * s, hair, [0, 0.02 * s, 0.11 * s]));
      return P;
    },
  });
  rig.capeMount = new THREE.Object3D(); rig.capeMount.position.set(0, 0.5, -0.13); rig.torso.add(rig.capeMount);
  rig.hatMount = new THREE.Object3D(); rig.hatMount.position.set(0, 0.25, 0); rig.head.add(rig.hatMount);
  return rig;
}
// equipment visuals on the player rig
function dressRig(rig, eq) {
  // colours for torso/legs from armour
  const tint = (pivotObj, col) => { const m = pivotObj.userData.mesh; if (!m) return; if (!m.userData.base) m.userData.base = m.geometry; m.geometry = recolor(m.userData.base, col); };
  const chest = eq.chest && eq.chest.id, legs = eq.legs && eq.legs.id;
  const cc = chest ? armorColor(chest) : 0xd6cbb0, lc = legs ? armorColor(legs) : 0xb8ad94;
  tint(rig.torso, cc); tint(rig.armL, cc); tint(rig.armR, cc); tint(rig.hips, lc); tint(rig.legL, lc); tint(rig.legR, lc);
  const swap = (mount, key, parts) => {
    if (rig[key]) { mount.remove(rig[key]); rig[key] = null; }
    if (!parts) return;
    const m = new THREE.Mesh(buildModel(parts), R.mat.vc); m.castShadow = true; mount.add(m); rig[key] = m;
  };
  const head = eq.head && eq.head.id;
  swap(rig.hatMount, 'hat', head === 'straw_hat' ? [P_.cone(0.38, 0.2, 10, COL.thatch, [0, 0.05, 0]), P_.cyl(0.38, 0.38, 0.02, 10, COL.thatch2, [0, -0.05, 0])]
    : head === 'bronze_helm' ? [P_.sph(0.16, 8, 5, COL.bronze, [0, -0.04, 0], 0, [1, 0.8, 1.05]), P_.cyl(0.26, 0.24, 0.05, 8, COL.bronze, [0, -0.08, -0.03], [-0.2, 0, 0]), P_.tbox(0.03, 0.03, 0.14, 0.01, 0.16, COL.gold, [0, 0.12, 0.12])]
      : head ? [P_.sph(0.15, 8, 5, armorColor(head), [0, -0.05, 0], 0, [1.05, 0.85, 1.1])] : null);
  const cape = eq.cape && eq.cape.id;
  swap(rig.capeMount, 'cape', cape === 'mino' ? [P_.tbox(0.42, 0.08, 0.58, 0.16, 0.85, COL.thatch, [0, -0.42, -0.03]), P_.tbox(0.46, 0.1, 0.6, 0.18, 0.4, COL.thatch2, [0, -0.15, -0.02])] : null);
}
const _recolorCache = new Map();
function recolor(geo, col) {
  const k = geo.uuid + col;
  if (_recolorCache.has(k)) return _recolorCache.get(k);
  const g = geo.clone(), c = hex3(col), a = g.attributes.color;
  // keep relative shading: scale to the new colour by the per-face jitter ratio
  const base = geo.attributes.color;
  let br = 0, bg = 0, bb = 0; for (let i = 0; i < base.count; i++) { br += base.getX(i); bg += base.getY(i); bb += base.getZ(i); }
  br /= base.count; bg /= base.count; bb /= base.count;
  for (let i = 0; i < a.count; i++) { const f = (base.getX(i) / br + base.getY(i) / bg + base.getZ(i) / bb) / 3; a.setXYZ(i, c[0] * f, c[1] * f, c[2] * f); }
  _recolorCache.set(k, g);
  return g;
}
// The guide crow, Yatagarasu (three legs)
function makeCrow() {
  const root = new THREE.Group(), body = pivot(root, [P_.sph(0.16, 6, 5, COL.black, [0, 0, 0], 0, [1, 0.9, 1.5]), P_.sph(0.1, 6, 4, COL.black, [0, 0.12, 0.2]), P_.cone(0.04, 0.14, 4, 0x2a2a2a, [0, 0.11, 0.34], [Math.PI / 2, 0, 0]),
    P_.box(0.15, 0.03, 0.22, COL.black, [0, 0.0, -0.3]), P_.box(0.02, 0.02, 0.01, 0xffd040, [0.05, 0.15, 0.27]), P_.box(0.02, 0.02, 0.01, 0xffd040, [-0.05, 0.15, 0.27]),
    ...[-1, 0, 1].map((k) => P_.cyl(0.01, 0.01, 0.16, 3, 0x2a2a2a, [k * 0.05, -0.18, 0.02]))], 0, 0.26, 0);
  const wl = pivot(body, [P_.box(0.5, 0.02, 0.22, COL.black, [-0.25, 0, -0.03])], -0.1, 0.05, 0);
  const wr = pivot(body, [P_.box(0.5, 0.02, 0.22, COL.black, [0.25, 0, -0.03])], 0.1, 0.05, 0);
  return { root, body, wl, wr };
}
