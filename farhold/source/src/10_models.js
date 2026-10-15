// Farhold — procedural low-poly models: starships, the space station, planet structures, sentinels, aliens,
// the player's exosuit and multitool, base parts. All are +Y up, -Z forward, origin at the ground contact point.

const MODEL_CACHE = {};
function meshOf(geo, mat = R.mat.vc, shadow = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; }

// ---------- starships ----------
function shipColors(seed) {
  const r = RNG(seed);
  const h = r();
  return { hull: hsl(h, r.range(0.05, 0.3), r.range(0.62, 0.78)), hull2: hsl(r() < 0.5 ? h : h + r.range(0.3, 0.6), r.range(0.45, 0.8), r.range(0.38, 0.52)), dark: hsl(h, 0.1, 0.2), glass: 0x5ad0ff, eng: r.pick([0x7cd8ff, 0xffa040, 0xff60c0, 0x80ff9a]), r };
}
// returns { geo, glow: [V3 engine nozzles], cockpit: V3, len, wing }
function shipGeometry(type, seed, wreck) {
  const C = shipColors(seed), r = C.r;
  const p = [];
  const hull = C.hull, h2 = C.hull2, dk = C.dark;
  const glow = [];
  let cockpit, len = 12;
  const G = 1.6;
  // hull section: front (nose, -z) and rear sizes, length along z
  const hullBox = (wF, hF, wR, hR, L, c, pos) => P_.tbox(wF, hF, wR, hR, L, c, pos, [Math.PI / 2, 0, 0]);
  // wing on side s (-1 left, +1 right): root at the fuselage, span outward, optional sweep and dihedral
  const wing = (s, thickR, chordR, thickT, chordT, span, c, root, sweep = 0, dihedral = 0) => P_.tbox(thickR, chordR, thickT, chordT, span, c, [root[0] + s * span / 2, root[1] + span / 2 * Math.sin(dihedral), root[2] + span / 2 * Math.sin(sweep)], [0, -s * sweep, -s * (Math.PI / 2 - dihedral)]);
  const engine = (x, y, z, rad, L) => { p.push(P_.cyl(rad * 0.85, rad, L, 10, dk, [x, y, z], [Math.PI / 2, 0, 0])); glow.push(new V3(x, y, z + L / 2 + 0.05)); };
  if (type === 'fighter') {
    len = 13;
    p.push(hullBox(0.5, 0.5, 2.0, 1.5, 6, hull, [0, G + 1.3, -3.2]));
    p.push(hullBox(2.0, 1.5, 2.2, 1.6, 5, h2, [0, G + 1.3, 2.3]));
    p.push(P_.sph(0.8, 10, 6, C.glass, [0, G + 2.05, -1.4], null, [0.9, 0.6, 1.9]));
    const sw = r.range(0.3, 0.6);
    for (const s of [-1, 1]) {
      p.push(wing(s, 0.3, 3.6, 0.12, 1.2, 4.2, h2, [s * 0.9, G + 1.1, 1.6], sw, -0.05));
      p.push(P_.box(0.2, 1.6, 1.8, hull, [s * 4.9, G + 1.5, 2.7], [0, 0, s * 0.25]));
      engine(s * 0.75, G + 1.25, 5.2, 0.55, 1.6);
    }
    p.push(P_.tbox(0.15, 2.0, 0.08, 0.9, 1.6, hull, [0, G + 2.6, 3.4]));
    cockpit = new V3(0, G + 2.05, -1.2);
  } else if (type === 'explorer') {
    len = 14;
    p.push(hullBox(0.4, 0.4, 1.4, 1.3, 4, h2, [0, G + 1.5, -5]));
    p.push(hullBox(1.4, 1.3, 1.6, 1.4, 8, hull, [0, G + 1.5, 1]));
    p.push(P_.sph(0.75, 10, 6, C.glass, [0, G + 2.15, -2.6], null, [0.9, 0.6, 1.8]));
    for (const s of [-1, 1]) {
      p.push(wing(s, 0.15, 1.8, 0.1, 1.2, 5.2, h2, [s * 0.7, G + 1.9, 0.5], -0.25, 0.08));
      p.push(P_.box(0.6, 0.6, 4.6, dk, [s * 5.8, G + 2.3, -0.2]));
      p.push(P_.box(0.15, 1.8, 1.4, hull, [s * 5.8, G + 3.1, 1.0]));
      glow.push(new V3(s * 5.8, G + 2.3, 2.15));
    }
    engine(0, G + 1.5, 5.6, 1.0, 1.6);
    cockpit = new V3(0, G + 2.15, -2.4);
  } else if (type === 'hauler') {
    len = 16;
    p.push(P_.box(4.6, 3.2, 10, hull, [0, G + 1.9, 0.5]));
    p.push(hullBox(2.4, 1.8, 4.6, 3.2, 3, h2, [0, G + 1.9, -6]));
    p.push(P_.box(2.6, 0.9, 2.0, C.glass, [0, G + 3.2, -4.6], [0.25, 0, 0]));
    for (const s of [-1, 1]) {
      p.push(wing(s, 0.4, 5.5, 0.2, 2.6, 3.4, h2, [s * 2.3, G + 1.0, 1.2], 0, -0.35));
      for (const y of [1.0, 2.8]) engine(s * 1.4, G + y, 6.4, 0.65, 1.6);
    }
    p.push(P_.box(5, 0.4, 3, dk, [0, G + 3.7, 2]));
    p.push(P_.box(0.8, 0.8, 6, dk, [0, G + 3.9, 1]));
    cockpit = new V3(0, G + 3.2, -4.4);
  } else {
    // shuttle
    len = 11;
    p.push(hullBox(2.0, 1.6, 3.2, 2.4, 3, h2, [0, G + 1.4, -3.2]));
    p.push(hullBox(3.2, 2.4, 3.0, 2.2, 6, hull, [0, G + 1.4, 1.3]));
    p.push(P_.box(2.4, 0.9, 1.6, C.glass, [0, G + 2.6, -2.4], [0.35, 0, 0]));
    p.push(P_.box(1.6, 0.35, 3.2, h2, [0, G + 2.65, 1.4]));
    for (const s of [-1, 1]) {
      p.push(wing(s, 0.35, 3.0, 0.15, 1.6, 3.0, h2, [s * 1.5, G + 0.9, 1.6], 0.2, -0.08));
      engine(s * 1.0, G + 1.25, 4.9, 0.6, 1.4);
      p.push(glowPart(P_.box(0.2, 0.2, 0.2, s < 0 ? 0xff3030 : 0x30ff60, [s * 4.45, G + 0.75, 2.0]), 1));
    }
    cockpit = new V3(0, G + 2.6, -2.2);
  }
  if (!wreck) for (const [x, z] of [[0, -len * 0.28], [-2.0, len * 0.18], [2.0, len * 0.18]]) { p.push(P_.cyl(0.12, 0.15, G + 0.4, 5, dk, [x, G / 2 + 0.2, z])); p.push(P_.cyl(0.42, 0.42, 0.15, 8, dk, [x, 0.08, z])); }
  p.push(glowPart(P_.box(0.15, 0.15, 0.15, 0xffffff, [0, G + 0.4, -len * 0.3]), 1));
  for (const g of glow) p.push(glowPart(P_.cyl(0.4, 0.4, 0.06, 10, C.eng, [g.x, g.y, g.z - 0.02], [Math.PI / 2, 0, 0]), 0.9));
  const geo = buildModel(p, { jitter: 0.05, seed });
  return { geo, glow, cockpit, len, gearH: G, eng: C.eng, colors: C };
}
function makeShipObject(type, seed, opts = {}) {
  const S = shipGeometry(type, seed, opts.wreck);
  const root = new THREE.Group();
  const body = meshOf(S.geo, opts.wreck ? R.mat.hurt : R.mat.vc);
  root.add(body);
  // engine flames: additive cones, scaled by throttle
  const flames = [];
  const fg = new THREE.ConeGeometry(0.4, 2.6, 8, 1, true); fg.translate(0, -1.3, 0); fg.rotateX(-Math.PI / 2);
  const fm = new THREE.MeshBasicMaterial({ color: S.eng, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const g of S.glow) { const f = new THREE.Mesh(fg, fm); f.position.copy(g); f.rotation.y = Math.PI; f.scale.set(1, 1, 0.01); root.add(f); flames.push(f); }
  return { root, body, flames, S, type, seed };
}

// ---------- the space station ----------
// Hangar interior (station local): x ±60, y 0..36, z -75 (mouth) .. 50 (back wall)
function makeStation(seed) {
  const r = RNG(seed);
  const hue = r(), hull = hsl(hue, 0.18, 0.55), hull2 = hsl(hue + 0.5, 0.2, 0.38), dk = hsl(hue, 0.15, 0.2), lit = hsl(r.range(0.05, 0.6), 0.8, 0.65);
  const p = [];
  // outer shell
  p.push(P_.box(150, 12, 140, hull, [0, -9, -5]));
  p.push(P_.box(150, 12, 140, hull, [0, 44, -5]));
  p.push(P_.box(14, 46, 140, hull2, [-70, 17.5, -5]));
  p.push(P_.box(14, 46, 140, hull2, [70, 17.5, -5]));
  p.push(P_.box(150, 62, 14, hull, [0, 17, 58]));
  // front face around the mouth
  p.push(P_.box(32, 62, 8, hull, [-58, 17, -76]));
  p.push(P_.box(32, 62, 8, hull, [58, 17, -76]));
  p.push(P_.box(90, 16, 8, hull, [0, 42, -76]));
  p.push(P_.box(90, 14, 8, hull, [0, -5, -76]));
  // mouth frame lights
  p.push(glowPart(P_.box(84, 1, 1, lit, [0, 33.5, -80.5]), 1.2));
  p.push(glowPart(P_.box(84, 1, 1, lit, [0, 2.5, -80.5]), 1.2));
  p.push(glowPart(P_.box(1, 31, 1, lit, [-42.5, 18, -80.5]), 1.2));
  p.push(glowPart(P_.box(1, 31, 1, lit, [42.5, 18, -80.5]), 1.2));
  // superstructure: tapered prow, towers, antennae, a ring
  p.push(P_.tbox(150, 62, 90, 30, 70, hull2, [0, 17, 128], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 6; i++) { const x = r.range(-55, 55), z = r.range(-60, 50), h = r.range(20, 60); p.push(P_.box(r.range(8, 18), h, r.range(8, 18), i % 2 ? hull : hull2, [x, 50 + h / 2, z])); p.push(glowPart(P_.box(2, 2, 2, lit, [x, 52 + h, z]), 1)); }
  for (let i = 0; i < 4; i++) p.push(P_.cyl(0.8, 1.2, r.range(40, 90), 5, dk, [r.range(-50, 50), 90, r.range(-40, 40)]));
  const ringR = 190;
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; p.push(P_.box(78, 10, 14, i % 2 ? hull : dk, [Math.cos(a) * ringR, 17 + Math.sin(a) * ringR, 60], [0, 0, a + Math.PI / 2])); }
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; p.push(P_.box(6, ringR - 60, 6, dk, [Math.cos(a) * (ringR / 2 + 30), 17 + Math.sin(a) * (ringR / 2 + 30), 60], [0, 0, a - Math.PI / 2])); }
  // windows on the outside
  for (let i = 0; i < 40; i++) { const side = r() < 0.5 ? -1 : 1; p.push(glowPart(P_.box(0.6, 1.4, 3, lit, [side * 77.2, r.range(0, 36), r.range(-70, 55)]), 0.9)); }
  // interior: floor tiles, pads, walkway, trade deck
  p.push(P_.box(118, 0.4, 124, dk, [0, 0.2, -12]));
  const pads = [[-34, -42], [34, -42], [-34, -6], [34, -6]];
  for (const [x, z] of pads) { p.push(P_.cyl(11, 11.5, 0.6, 16, hull2, [x, 0.5, z])); p.push(glowPart(P_.tor(9, 0.25, 4, 24, TAU, lit, [x, 0.85, z], [Math.PI / 2, 0, 0]), 1)); }
  p.push(P_.box(118, 3, 22, hull, [0, 1.5, 38]));
  p.push(P_.box(16, 0.4, 10, hull2, [0, 1.6, 22], [-0.3, 0, 0]));
  for (let i = -5; i <= 5; i++) p.push(glowPart(P_.box(0.4, 0.3, 120, lit, [i * 11, 0.45, -12]), 0.35));
  // interior wall panels & ceiling lights
  for (let i = 0; i < 10; i++) { p.push(glowPart(P_.box(8, 0.5, 2, 0xfff0d8, [r.range(-50, 50), 37.5, -70 + i * 12]), 1.3)); }
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) p.push(P_.box(1, 30, 6, hull2, [s * 62.6, 15, -66 + i * 18]));
  // cargo stacks, pipes, deck railing and holo-signs over the terminals
  for (let i = 0; i < 14; i++) { const s = r() < 0.5 ? -1 : 1, x = s * r.range(50, 58), z = r.range(-68, 25), w = r.range(2.5, 4.5), hgt = r.range(2, 6); p.push(P_.box(w, hgt, w, hsl(r(), r.range(0.2, 0.6), r.range(0.3, 0.5)), [x, hgt / 2 + 0.4, z])); p.push(P_.box(w * 0.8, 0.2, w * 1.02, dk, [x, hgt * 0.6 + 0.4, z])); }
  for (const z of [-60, -30, 0, 26]) { p.push(P_.cyl(0.7, 0.7, 118, 6, dk, [0, 34, z], [0, 0, Math.PI / 2])); p.push(glowPart(P_.box(118, 0.15, 0.15, lit, [0, 33.2, z]), 0.6)); }
  for (let x = -56; x <= 56; x += 4) p.push(P_.box(0.15, 1.1, 0.15, dk, [x, 3.55, 27.2]));
  p.push(P_.box(116, 0.12, 0.2, lit, [0, 4.1, 27.2]));
  const signs = [[-14, 0x5ad0ff], [0, 0xc080ff], [14, 0x80ffb0], [28, 0xffc060], [-28, 0xff8050], [-42, 0x60ff90]];
  for (const [x, c] of signs) { p.push(glowPart(P_.box(5, 1.2, 0.2, c, [x, 9, 47]), 0.9)); p.push(P_.box(5.6, 1.6, 0.3, dk, [x, 9, 47.2])); }
  const geo = buildModel(p, { jitter: 0.04, seed });
  // colliders (station local)
  const boxes = [
    [0, -5, -5, 75, 5, 75], [0, 46, -5, 75, 8, 75], [-70, 18, -5, 7, 30, 75], [70, 18, -5, 7, 30, 75], [0, 18, 58, 75, 34, 7],
    [-58, 17, -76, 16, 31, 4], [58, 17, -76, 16, 31, 4], [0, 42, -76, 45, 8, 4], [0, -5, -76, 45, 7, 4],
    [0, 1.5, 38, 59, 1.5, 11], [0, 17, 128, 50, 25, 35],
    [0, 1.6, 22, 8, 0.2, 5, { rot: [-0.3, 0, 0] }],
  ];
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; boxes.push([Math.cos(a) * ringR, 17 + Math.sin(a) * ringR, 60, 39, 5, 7, { rot: [0, 0, a + Math.PI / 2] }]); }
  const terminals = [
    { kind: 'trade', pos: new V3(-14, 3, 44), name: 'Trade Terminal' },
    { kind: 'tech', pos: new V3(0, 3, 44), name: 'Technology Merchant' },
    { kind: 'suit', pos: new V3(14, 3, 44), name: 'Exosuit Outfitter' },
    { kind: 'ships', pos: new V3(28, 3, 44), name: 'Starship Broker' },
    { kind: 'refine', pos: new V3(-28, 3, 44), name: 'Refinery' },
    { kind: 'save', pos: new V3(-42, 3, 44), name: 'Save Point' },
  ];
  return { geo, boxes, pads: pads.map(([x, z]) => new V3(x, 0.8, z)), terminals, lit, hull };
}
function terminalGeo(kind, lit) {
  const k = 'term:' + kind;
  if (MODEL_CACHE[k]) return MODEL_CACHE[k];
  const col = { trade: 0x5ad0ff, tech: 0xc080ff, suit: 0x80ffb0, ships: 0xffc060, refine: 0xff8050, save: 0x60ff90, post: 0x5ad0ff, shelter: 0xa0e0ff }[kind] || 0x5ad0ff;
  const p = [P_.box(1.4, 1.1, 0.8, 0x3a4048, [0, 0.55, 0]), P_.tbox(1.2, 0.6, 1.0, 0.3, 0.9, 0x4a5058, [0, 1.45, 0.05]), glowPart(P_.box(1.0, 0.7, 0.06, col, [0, 1.55, -0.22], [-0.25, 0, 0]), 0.55), glowPart(P_.box(1.3, 0.06, 0.06, col, [0, 1.12, -0.42]), 0.8)];
  if (kind === 'save') { p.length = 0; p.push(P_.cyl(0.3, 0.5, 1.2, 8, 0x3a4048, [0, 0.6, 0]), glowPart(P_.oct(0.45, col, [0, 1.7, 0]), 1.3)); }
  return (MODEL_CACHE[k] = buildModel(p));
}

// ---------- aliens ----------
const SPECIES = {
  tessari: { name: 'Tessari', greet: ['The Tessari offer their regards, traveller.', 'Your course is noted. Trade, then.', 'We have charted many stars. Few as interesting as you.'] },
  morrow: { name: 'Morrow', greet: ['HRAH. You smell of engine grease and courage.', 'Trade, or fight. Morrow prefer trade today.', 'A pilot! Sit. Drink. Then buy something.'] },
  unit: { name: 'Unit', greet: ['GREETING PROTOCOL: COMPLETE.', 'This unit computes a 74% probability of mutually beneficial exchange.', 'Organic. Welcome. Please do not touch the console.'] },
};
function alienGeo(species, seed) {
  const k = 'alien:' + species + ':' + (seed % 5);
  if (MODEL_CACHE[k]) return MODEL_CACHE[k];
  const r = RNG(seed % 5 + 11);
  const robe = hsl(r(), r.range(0.3, 0.7), r.range(0.3, 0.5)), trim = hsl(r(), 0.6, 0.55), skin = species === 'unit' ? 0x9aa4b0 : species === 'morrow' ? hsl(r.range(0.0, 0.1), 0.4, 0.4) : hsl(r.range(0.45, 0.6), 0.3, 0.6);
  const p = [];
  if (species === 'morrow') {
    p.push(P_.tbox(1.1, 0.7, 1.4, 0.8, 1.3, robe, [0, 1.25, 0]));
    p.push(P_.box(0.5, 0.9, 0.5, robe, [-0.32, 0.45, 0])); p.push(P_.box(0.5, 0.9, 0.5, robe, [0.32, 0.45, 0]));
    p.push(P_.box(0.75, 0.6, 0.7, skin, [0, 2.15, 0])); p.push(P_.cone(0.12, 0.5, 5, 0xe8e0c8, [-0.35, 2.5, 0], [0, 0, 0.6])); p.push(P_.cone(0.12, 0.5, 5, 0xe8e0c8, [0.35, 2.5, 0], [0, 0, -0.6]));
    p.push(glowPart(P_.box(0.5, 0.1, 0.05, 0xffb040, [0, 2.2, -0.36]), 1));
    p.push(P_.box(0.3, 1, 0.3, robe, [-0.85, 1.4, 0], [0, 0, 0.15])); p.push(P_.box(0.3, 1, 0.3, robe, [0.85, 1.4, 0], [0, 0, -0.15]));
  } else if (species === 'unit') {
    p.push(P_.box(0.8, 1.1, 0.5, skin, [0, 1.35, 0])); p.push(P_.cyl(0.1, 0.12, 0.9, 6, 0x50565e, [-0.2, 0.45, 0])); p.push(P_.cyl(0.1, 0.12, 0.9, 6, 0x50565e, [0.2, 0.45, 0]));
    p.push(P_.box(0.7, 0.55, 0.5, 0x50565e, [0, 2.2, 0])); p.push(glowPart(P_.box(0.6, 0.4, 0.05, 0x40d0ff, [0, 2.2, -0.26]), 1.4));
    p.push(P_.cyl(0.07, 0.08, 0.9, 5, 0x50565e, [-0.55, 1.35, 0], [0, 0, 0.2])); p.push(P_.cyl(0.07, 0.08, 0.9, 5, 0x50565e, [0.55, 1.35, 0], [0, 0, -0.2]));
    p.push(glowPart(P_.sph(0.08, 5, 4, 0xff4040, [0, 2.6, 0]), 1));
  } else {
    p.push(P_.tbox(0.9, 0.6, 0.5, 0.4, 1.9, robe, [0, 1.0, 0])); p.push(P_.box(0.95, 0.12, 0.65, trim, [0, 1.3, 0]));
    p.push(P_.cyl(0.1, 0.12, 0.5, 6, skin, [0, 2.15, 0]));
    p.push(P_.sph(0.32, 8, 6, skin, [0, 2.55, 0], null, [1, 1.25, 1])); p.push(P_.cone(0.12, 0.55, 5, trim, [0, 2.5, -0.45], [-Math.PI / 2, 0, 0]));
    p.push(glowPart(P_.sph(0.07, 5, 4, 0xffe060, [-0.14, 2.65, -0.25]), 1)); p.push(glowPart(P_.sph(0.07, 5, 4, 0xffe060, [0.14, 2.65, -0.25]), 1));
    p.push(P_.cone(0.06, 0.6, 4, trim, [0, 3.0, 0.1], [0.4, 0, 0]));
    p.push(P_.box(0.18, 0.9, 0.18, robe, [-0.5, 1.5, 0], [0, 0, 0.15])); p.push(P_.box(0.18, 0.9, 0.18, robe, [0.5, 1.5, 0], [0, 0, -0.15]));
  }
  return (MODEL_CACHE[k] = buildModel(p));
}

// ---------- the player's exosuit (third person) ----------
function makeSuitRig() {
  const suit = 0xe8e2d0, trim = 0xd06a30, dk = 0x3a4048;
  const root = new THREE.Group();
  const torso = meshOf(buildModel([P_.tbox(0.62, 0.36, 0.7, 0.4, 0.75, suit, [0, 0, 0]), P_.box(0.5, 0.1, 0.42, trim, [0, -0.3, 0]), P_.box(0.5, 0.65, 0.3, dk, [0, 0.05, 0.3]), glowPart(P_.box(0.1, 0.4, 0.05, 0x60e0ff, [-0.15, 0.05, 0.46]), 1), glowPart(P_.box(0.1, 0.4, 0.05, 0x60e0ff, [0.15, 0.05, 0.46]), 1)]));
  torso.position.y = 1.2; root.add(torso);
  const head = meshOf(buildModel([P_.sph(0.24, 10, 8, suit, [0, 0, 0]), glowPart(P_.box(0.34, 0.14, 0.12, 0xffa040, [0, 0.0, -0.17]), 1), P_.cyl(0.02, 0.02, 0.25, 4, dk, [0.15, 0.2, 0.05])]));
  head.position.y = 0.58; torso.add(head);
  const limb = (len, w, c) => { const g = new THREE.Group(); const m = meshOf(buildModel([P_.box(w, len, w, c, [0, -len / 2, 0]), P_.box(w * 1.1, 0.12, w * 1.1, trim, [0, -len * 0.55, 0])])); g.add(m); return g; };
  const armL = limb(0.62, 0.15, suit), armR = limb(0.62, 0.15, suit), legL = limb(0.82, 0.19, suit), legR = limb(0.82, 0.19, suit);
  armL.position.set(-0.4, 0.28, 0); armR.position.set(0.4, 0.28, 0); torso.add(armL); torso.add(armR);
  legL.position.set(-0.15, 0.85, 0); legR.position.set(0.15, 0.85, 0); root.add(legL); root.add(legR);
  // jetpack flame
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0x80c8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  fl.rotation.x = Math.PI; fl.position.set(0, -0.6, 0.35); torso.add(fl); fl.visible = false;
  return { root, torso, head, armL, armR, legL, legR, flame: fl };
}
function animSuit(rig, t, speed, air) {
  const s = Math.min(1, speed / 6), w = Math.sin(t * 9) * 0.7 * s;
  rig.legL.rotation.x = air ? 0.3 : w; rig.legR.rotation.x = air ? -0.2 : -w;
  rig.armL.rotation.x = -w * 0.8; rig.armR.rotation.x = w * 0.8 - (air ? 0.3 : 0);
  rig.torso.position.y = 1.2 + Math.abs(Math.sin(t * 9)) * 0.05 * s;
}

// ---------- multitool (first person) ----------
function multitoolGeo(seed) {
  const r = RNG(seed);
  const a = hsl(r(), r.range(0.3, 0.7), 0.5), b = 0x2a2e36, g = r.pick([0xff9a30, 0x60e0ff, 0xc060ff]);
  return buildModel([
    P_.box(0.07, 0.11, 0.42, a, [0, 0, 0]), P_.box(0.05, 0.16, 0.08, b, [0, -0.11, 0.14], [-0.3, 0, 0]),
    P_.cyl(0.03, 0.045, 0.22, 8, b, [0, 0.02, -0.28], [Math.PI / 2, 0, 0]), glowPart(P_.cyl(0.032, 0.032, 0.02, 8, g, [0, 0.02, -0.4], [Math.PI / 2, 0, 0]), 1.5),
    P_.box(0.1, 0.03, 0.2, b, [0, 0.07, -0.02]), glowPart(P_.box(0.02, 0.02, 0.18, g, [0.04, 0.03, 0.02]), 1), glowPart(P_.box(0.02, 0.02, 0.18, g, [-0.04, 0.03, 0.02]), 1),
    P_.tor(0.05, 0.012, 4, 10, TAU, a, [0, 0.02, -0.18], [0, 0, 0]),
  ], { seed });
}

// ---------- sentinels ----------
function droneGeo() {
  if (MODEL_CACHE.drone) return MODEL_CACHE.drone;
  const m = 0xc8b898, d = 0x4a4438;
  return (MODEL_CACHE.drone = buildModel([
    P_.sph(0.55, 10, 8, m, [0, 0, 0], null, [1, 0.8, 1.1]), P_.box(1.6, 0.12, 0.5, d, [0, 0, 0.1]),
    P_.tbox(0.3, 0.6, 0.05, 0.4, 0.5, m, [-0.85, 0, 0.1], [0, 0, Math.PI / 2]), P_.tbox(0.3, 0.6, 0.05, 0.4, 0.5, m, [0.85, 0, 0.1], [0, 0, -Math.PI / 2]),
    P_.cyl(0.22, 0.25, 0.15, 10, d, [0, 0, -0.5], [Math.PI / 2, 0, 0]), glowPart(P_.cyl(0.16, 0.16, 0.05, 10, 0xffd040, [0, 0, -0.58], [Math.PI / 2, 0, 0]), 1.5),
    P_.cone(0.15, 0.4, 5, d, [0, -0.55, 0.1], [Math.PI, 0, 0]),
  ]));
}
function quadGeo() {
  if (MODEL_CACHE.quad) return MODEL_CACHE.quad;
  const m = 0xc8b898, d = 0x4a4438;
  const p = [P_.box(1.4, 0.8, 2.6, m, [0, 1.6, 0]), P_.box(0.9, 0.7, 0.9, d, [0, 1.9, -1.5]), glowPart(P_.box(0.6, 0.15, 0.1, 0xff4020, [0, 1.95, -1.98]), 1.5), P_.box(0.2, 0.6, 0.2, d, [0, 2.3, 0.6])];
  for (const [x, z] of [[-0.8, -1], [0.8, -1], [-0.8, 1], [0.8, 1]]) { p.push(P_.box(0.3, 1.1, 0.3, d, [x, 0.75, z], [z * 0.15, 0, 0])); p.push(P_.box(0.4, 0.2, 0.5, m, [x, 0.1, z - 0.1])); }
  return (MODEL_CACHE.quad = buildModel(p));
}

// ---------- asteroids ----------
function asteroidGeos() {
  if (MODEL_CACHE.ast) return MODEL_CACHE.ast;
  const out = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed();
    const P = g.attributes.position, r = mulberry32(i + 5);
    const map = new Map();
    for (let k = 0; k < P.count; k++) { const key = P.getX(k).toFixed(3) + P.getY(k).toFixed(3) + P.getZ(k).toFixed(3); if (!map.has(key)) map.set(key, 0.7 + r() * 0.55); const s = map.get(key); P.setXYZ(k, P.getX(k) * s, P.getY(k) * s * 0.8, P.getZ(k) * s); }
    g.computeVertexNormals();
    const col = new Float32Array(P.count * 3);
    for (let k = 0; k < P.count; k++) { const v = 0.32 + r() * 0.08; col[k * 3] = v * 1.05; col[k * 3 + 1] = v; col[k * 3 + 2] = v * 0.95; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // flat normals
    const ng = buildModel([{ geo: g, c: 0xffffff }]);
    ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.push(ng);
  }
  return (MODEL_CACHE.ast = out);
}

// ---------- planet structures ----------
// returns { geo, boxes: [[cx,cy,cz,hx,hy,hz,opts]], spots: [{ kind, pos: V3, r }], lights: [V3] }
function poiModel(type, seed) {
  const r = RNG(seed);
  const metal = hsl(r.range(0.05, 0.6), 0.12, 0.55), metal2 = hsl(r.range(0.05, 0.6), 0.15, 0.35), lit = hsl(r.range(0.05, 0.6), 0.8, 0.62), dk = 0x2e3238;
  const p = [], boxes = [], spots = [], lights = [];
  const wallBox = (cx, cy, cz, hx, hy, hz, c, o) => { p.push(P_.box(hx * 2, hy * 2, hz * 2, c, [cx, cy, cz])); boxes.push([cx, cy, cz, hx, hy, hz, o || { shelter: true }]); };
  switch (type) {
    case 'shelter': {
      // 7 x 7 hut, door on -Z
      p.push(P_.box(8, 0.3, 8, dk, [0, 0.15, 0])); boxes.push([0, 0.15, 0, 4, 0.15, 4]);
      wallBox(0, 2, 3.8, 4, 2, 0.2, metal); wallBox(-3.8, 2, 0, 0.2, 2, 4, metal); wallBox(3.8, 2, 0, 0.2, 2, 4, metal);
      wallBox(-2.6, 2, -3.8, 1.4, 2, 0.2, metal); wallBox(2.6, 2, -3.8, 1.4, 2, 0.2, metal); wallBox(0, 3.5, -3.8, 1.2, 0.5, 0.2, metal);
      p.push(P_.tbox(9, 9, 2, 2, 1.8, metal2, [0, 4.9, 0])); boxes.push([0, 4.2, 0, 4.4, 0.2, 4.4, { roof: true, shelter: true }]);
      p.push(glowPart(P_.box(2.4, 0.15, 0.15, lit, [0, 4.05, -3.95]), 1));
      p.push(P_.box(0.8, 0.8, 0.8, dk, [2.6, 0.7, 2.6])); p.push(P_.box(1.4, 0.6, 0.6, metal2, [-2.5, 0.6, 2.9]));
      lights.push(new V3(0, 3.6, 0));
      spots.push({ kind: 'terminal', pos: new V3(0, 0.3, 2.4), r: 2.2 });
      break;
    }
    case 'post': {
      // platform with three pads and a trade building
      p.push(P_.box(46, 1.0, 22, dk, [0, 0.5, 0])); boxes.push([0, 0.5, 0, 23, 0.5, 11]);
      for (const x of [-15, 0, 15]) { p.push(P_.cyl(6.5, 6.5, 0.3, 14, metal2, [x, 1.15, -4])); p.push(glowPart(P_.tor(5.6, 0.18, 4, 20, TAU, lit, [x, 1.32, -4], [Math.PI / 2, 0, 0]), 1)); spots.push({ kind: 'pad', pos: new V3(x, 1.3, -4), r: 6 }); }
      // building at the back
      wallBox(0, 4, 10.6, 9, 3, 0.3, metal); wallBox(-8.7, 4, 7, 0.3, 3, 3.6, metal); wallBox(8.7, 4, 7, 0.3, 3, 3.6, metal);
      p.push(P_.box(19, 0.5, 8.5, metal2, [0, 7.25, 7])); boxes.push([0, 7.25, 7, 9.5, 0.25, 4.25, { roof: true, shelter: true }]);
      p.push(glowPart(P_.box(17, 0.3, 0.3, lit, [0, 6.9, 3]), 1));
      p.push(P_.cyl(0.4, 0.6, 14, 6, metal2, [-20, 8, 8])); p.push(glowPart(P_.sph(0.6, 6, 4, 0xff4040, [-20, 15.2, 8]), 1.5));
      p.push(P_.box(3, 4, 3, metal2, [19, 3, 7])); p.push(P_.box(3, 2.5, 3, metal, [19, 6.2, 7]));
      lights.push(new V3(0, 6, 7), new V3(-15, 2.5, -4), new V3(15, 2.5, -4));
      spots.push({ kind: 'terminal', pos: new V3(-3, 1, 8.5), r: 2.4 }, { kind: 'npc', pos: new V3(3, 1, 8.2), r: 2.5 });
      break;
    }
    case 'pod': {
      p.push(P_.cyl(0.9, 1.2, 2.6, 10, 0xe8e8f0, [0, 1.3, 0], [0.15, 0, 0.1])); p.push(P_.sph(0.9, 10, 5, 0xe8e8f0, [0, 2.65, 0.2], null, [1, 0.6, 1]));
      p.push(glowPart(P_.box(0.8, 1.2, 0.1, 0x80d0ff, [0, 1.6, -0.95], [0.15, 0, 0]), 1.2)); p.push(P_.box(3, 0.2, 3, 0x3a3020, [0, 0.05, 0]));
      boxes.push([0, 1.3, 0, 1, 1.4, 1, {}]);
      spots.push({ kind: 'pod', pos: new V3(0, 0.3, -1.4), r: 2.2 });
      break;
    }
    case 'machine': {
      p.push(P_.box(2.4, 1.6, 1.6, metal2, [0, 0.8, 0], [0, 0, 0.1])); p.push(P_.cyl(0.3, 0.3, 2.2, 6, dk, [0.9, 1.8, 0.3])); p.push(P_.box(1, 0.5, 1.2, metal, [-0.6, 1.8, 0]));
      p.push(glowPart(P_.box(0.6, 0.3, 0.05, 0xff6030, [-0.3, 1.0, -0.82]), 1.2)); p.push(P_.box(1.2, 0.6, 1.2, dk, [1.8, 0.3, 0.6], [0.2, 0.4, 0.3]));
      boxes.push([0, 0.8, 0, 1.2, 0.8, 0.8, {}]);
      spots.push({ kind: 'machine', pos: new V3(0, 0.2, -1.6), r: 2.2 });
      break;
    }
    case 'ruin': {
      const stone = hsl(r.range(0.05, 0.15), 0.15, 0.55);
      p.push(P_.tbox(1.6, 1.2, 1.0, 0.7, 8, stone, [0, 4, 0])); p.push(P_.cone(0.55, 1.2, 4, stone, [0, 8.6, 0]));
      for (let i = 0; i < 6; i++) p.push(glowPart(P_.box(0.6, 0.35, 0.05, 0xffb050, [0, 1.5 + i * 1.05, -0.58 + i * 0.03]), 1));
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, h = r.range(1, 4); p.push(P_.box(0.9, h, 0.9, shadeHex(stone, 0.85), [Math.cos(a) * 7, h / 2, Math.sin(a) * 7], [r.range(-0.15, 0.15), a, r.range(-0.15, 0.15)])); boxes.push([Math.cos(a) * 7, h / 2, Math.sin(a) * 7, 0.45, h / 2, 0.45, {}]); }
      p.push(P_.cyl(9, 9, 0.3, 14, shadeHex(stone, 0.7), [0, 0.15, 0]));
      boxes.push([0, 4, 0, 0.8, 4, 0.6, {}]);
      spots.push({ kind: 'ruin', pos: new V3(0, 0.3, -1.6), r: 2.4 });
      break;
    }
    case 'cache': {
      p.push(P_.box(1.4, 0.9, 1, metal2, [0, 0.45, 0])); p.push(P_.box(1.5, 0.15, 1.1, metal, [0, 0.95, 0])); p.push(glowPart(P_.box(0.3, 0.12, 0.05, 0x60ff90, [0, 0.6, -0.51]), 1.4));
      boxes.push([0, 0.5, 0, 0.75, 0.5, 0.55, {}]);
      spots.push({ kind: 'cache', pos: new V3(0, 0.2, -1.2), r: 2 });
      break;
    }
    case 'wreck': case 'crash': {
      p.push(P_.cyl(type === 'crash' ? 9 : 12, type === 'crash' ? 10 : 13, 0.2, 14, 0x24201c, [0, 0.05, 0]));
      for (let i = 0; i < 8; i++) { const a = r() * TAU, d = r.range(5, 14); p.push(P_.box(r.range(0.4, 1.5), r.range(0.1, 0.4), r.range(0.4, 2), metal2, [Math.cos(a) * d, 0.15, Math.sin(a) * d], [r() * 0.5, r() * 3, r() * 0.5])); }
      spots.push({ kind: type, pos: new V3(0, 0, -6.5), r: 5 });
      break;
    }
  }
  return { geo: p.length ? buildModel(p, { jitter: 0.06, seed }) : null, boxes, spots, lights, lit };
}

// ---------- base parts ----------
function partGeo(id) {
  const k = 'part:' + id;
  if (MODEL_CACHE[k]) return MODEL_CACHE[k];
  const m = 0xb8bcc4, m2 = 0x6a707a, dk = 0x2e3238, lit = 0xffd8a0;
  let p = [];
  switch (id) {
    case 'floor': p = [P_.box(4, 0.25, 4, m2, [0, 0.125, 0]), P_.box(3.6, 0.04, 3.6, m, [0, 0.26, 0])]; break;
    case 'roof': p = [P_.box(4, 0.25, 4, m2, [0, 0, 0]), P_.box(4.1, 0.08, 0.2, dk, [0, 0.16, 1.95])]; break;
    case 'wall': p = [P_.box(4, 3, 0.25, m, [0, 1.5, 0]), P_.box(4, 0.2, 0.3, m2, [0, 0.1, 0]), P_.box(4, 0.2, 0.3, m2, [0, 2.9, 0])]; break;
    case 'door': p = [P_.box(1.2, 3, 0.25, m, [-1.4, 1.5, 0]), P_.box(1.2, 3, 0.25, m, [1.4, 1.5, 0]), P_.box(1.6, 0.6, 0.25, m, [0, 2.7, 0]), glowPart(P_.box(1.6, 0.08, 0.3, lit, [0, 2.38, 0]), 1)]; break;
    case 'window': p = [P_.box(4, 1, 0.25, m, [0, 0.5, 0]), P_.box(4, 0.5, 0.25, m, [0, 2.75, 0]), P_.box(0.3, 1.5, 0.25, m, [-1.85, 1.75, 0]), P_.box(0.3, 1.5, 0.25, m, [1.85, 1.75, 0]), P_.box(0.15, 1.5, 0.2, m2, [0, 1.75, 0])]; break;
    case 'ramp': p = [P_.box(3.6, 0.2, 5, m2, [0, 1.5, 0], [Math.atan2(3, 4), 0, 0])]; break;
    case 'light': p = [P_.cyl(0.06, 0.1, 2.6, 6, dk, [0, 1.3, 0]), glowPart(P_.sph(0.25, 8, 6, lit, [0, 2.7, 0]), 1.5), P_.cyl(0.3, 0.3, 0.1, 8, dk, [0, 0.05, 0])]; break;
    case 'crate': p = [P_.box(1.2, 0.9, 0.9, m2, [0, 0.45, 0]), P_.box(1.25, 0.1, 0.95, m, [0, 0.9, 0]), glowPart(P_.box(0.3, 0.1, 0.05, 0x60ff90, [0, 0.6, -0.46]), 1)]; break;
    case 'refiner': p = [P_.cyl(0.55, 0.7, 1.4, 8, m2, [0, 0.7, 0]), P_.cyl(0.3, 0.45, 0.6, 8, m, [0, 1.7, 0]), glowPart(P_.tor(0.56, 0.06, 4, 12, TAU, 0xff8040, [0, 1.0, 0], [Math.PI / 2, 0, 0]), 1.3), P_.box(0.5, 0.3, 0.3, dk, [0, 0.5, -0.65])]; break;
    case 'pad': p = [P_.cyl(6, 6.2, 0.4, 16, m2, [0, 0.2, 0]), glowPart(P_.tor(5.2, 0.15, 4, 24, TAU, 0x60d0ff, [0, 0.42, 0], [Math.PI / 2, 0, 0]), 1), P_.box(2, 0.05, 8, m, [0, 0.42, 0]), P_.box(8, 0.05, 2, m, [0, 0.42, 0])]; break;
    case 'beacon': p = [P_.cyl(0.25, 0.4, 1.4, 8, dk, [0, 0.7, 0]), glowPart(P_.oct(0.4, 0x60ff90, [0, 1.8, 0]), 1.4)]; break;
    case 'teleport': p = [P_.cyl(1.6, 1.8, 0.3, 14, m2, [0, 0.15, 0]), P_.box(0.3, 3, 0.3, dk, [-1.5, 1.5, 0]), P_.box(0.3, 3, 0.3, dk, [1.5, 1.5, 0]), P_.box(3.3, 0.3, 0.3, dk, [0, 3.1, 0]), glowPart(P_.tor(1.3, 0.08, 4, 20, TAU, 0x9a7aff, [0, 0.35, 0], [Math.PI / 2, 0, 0]), 1.5)]; break;
    case 'planter': p = [P_.box(2.4, 0.6, 1.2, m2, [0, 0.3, 0]), P_.box(2.2, 0.1, 1.0, 0x4a3020, [0, 0.62, 0]), glowPart(P_.box(2.4, 0.06, 0.06, 0xff60ff, [0, 1.6, 0]), 1.2), P_.box(0.06, 1.0, 0.06, dk, [-1.15, 1.1, 0]), P_.box(0.06, 1.0, 0.06, dk, [1.15, 1.1, 0])]; break;
    case 'flag': p = [P_.cyl(0.04, 0.05, 3.2, 5, dk, [0, 1.6, 0]), P_.box(1.2, 0.7, 0.03, 0xd04040, [0.62, 2.8, 0]), P_.box(1.2, 0.15, 0.04, 0xffe060, [0.62, 2.8, 0])]; break;
    case 'basecomp': p = [P_.box(1.2, 1.0, 0.8, m2, [0, 0.5, 0]), P_.tbox(1.0, 0.5, 0.8, 0.3, 0.8, m, [0, 1.4, 0.05]), glowPart(P_.box(0.8, 0.55, 0.05, 0x60d0ff, [0, 1.5, -0.18], [-0.25, 0, 0]), 1.3), P_.cyl(0.03, 0.03, 1.6, 4, dk, [0.45, 2.1, 0.2]), glowPart(P_.sph(0.08, 5, 4, 0xff4040, [0.45, 2.95, 0.2]), 1.5)]; break;
  }
  return (MODEL_CACHE[k] = buildModel(p, { jitter: 0.04, seed: 3 }));
}
// part colliders (local) and attachment info
const PART_BOXES = {
  floor: [[0, 0.125, 0, 2, 0.125, 2]],
  roof: [[0, 0, 0, 2, 0.125, 2, { roof: true, shelter: true }]],
  wall: [[0, 1.5, 0, 2, 1.5, 0.125, { shelter: true }]],
  door: [[-1.4, 1.5, 0, 0.6, 1.5, 0.125, { shelter: true }], [1.4, 1.5, 0, 0.6, 1.5, 0.125, { shelter: true }], [0, 2.7, 0, 0.8, 0.3, 0.125, { shelter: true }]],
  window: [[0, 1.5, 0, 2, 1.5, 0.125, { shelter: true }]],
  ramp: [[0, 1.5, 0, 1.8, 0.1, 2.5, { rot: [Math.atan2(3, 4), 0, 0] }]],
  crate: [[0, 0.45, 0, 0.6, 0.45, 0.45]],
  refiner: [[0, 0.8, 0, 0.6, 0.8, 0.6]],
  pad: [[0, 0.2, 0, 6, 0.2, 6]],
  beacon: [[0, 0.7, 0, 0.35, 0.7, 0.35]],
  teleport: [[-1.5, 1.5, 0, 0.15, 1.5, 0.15], [1.5, 1.5, 0, 0.15, 1.5, 0.15], [0, 0.15, 0, 1.7, 0.15, 1.7]],
  planter: [[0, 0.3, 0, 1.2, 0.3, 0.6]],
  basecomp: [[0, 0.7, 0, 0.6, 0.7, 0.4]],
  light: [], flag: [],
};
