// Roma Aeterna — the Via Appia from Porta Capena to Bovillae: suburbs, tombs, milestones, villas, a posting station,
// farms, and the little town at the twelfth milestone. (The real distance is about 19 km; here it's a walk of a few minutes.)

const EPITAPHS = [
  ['D · M', 'L · VALERIO · FELICI', 'VIX · ANN · XXXV'],
  ['SISTE · VIATOR', 'ET · LEGE'],
  ['NON · FVI · FVI', 'NON · SVM · NON · CVRO'],
  ['S · T · T · L', 'SIT · TIBI · TERRA · LEVIS'],
  ['D · M', 'CLAVDIAE · HOMONOEAE', 'CONIVGI · SANCTISSIMAE'],
  ['HOSPES · QVOD · DEICO', 'PAVLLVM · EST · ASTA · AC · PELLEGE'],
  ['C · IVLIVS · PHILARGVRVS', 'LIBERTVS · SIBI · ET · SVIS'],
  ['D · M', 'TI · CLAVDIO · SECVNDO', 'FILIO · PIISSIMO'],
  ['QVOD · TV · ES · EGO · FVI', 'QVOD · NVNC · SVM · ET · TV · ERIS'],
  ['H · M · H · N · S', 'HOC · MONVMENTVM', 'HEREDEM · NON · SEQVETVR'],
];
let ROAD = [];   // { F, L, s0 } segments of the Appia with their cumulative distance
function appiaAt(s) { // point and frame at distance s along the road
  for (const r of ROAD) if (s <= r.s0 + r.L || r === ROAD[ROAD.length - 1]) { const u = clamp(s - r.s0, 0, r.L); return { x: r.F.wx(u, 0), z: r.F.wz(u, 0), F: r.F, u }; }
}
// frame at distance s, offset v to the side (v < 0: left going out, toward the aqueduct), facing the road
function roadside(s, v, extraA = 0) {
  const p = appiaAt(s), F = p.F;
  const x = F.wx(p.u, v), z = F.wz(p.u, v);
  return new Frame(x, z, F.ang + (v < 0 ? Math.PI : 0) + extraA, groundAt(x, z));
}

function tomb(S, kind, k = 1) {
  const g = gbF('city', S);
  const [lo] = groundRange(S, 0, 0, 8 * k, 8 * k);
  const b = lo - S.y - 0.3;
  const stone = rpick([C.trav, C.trav2, C.tuff, C.peperino, 0xd0c4a8]);
  const ep = () => { const e = rpick(EPITAPHS); return e; };
  switch (kind) {
    case 'tower': {
      const w = rnd(4, 6) * k, h1 = rnd(4, 6), h2 = rnd(3, 5);
      K.box(g, S, 0, b, 0, w + 1, -b + 1.2, w + 1, C.tuff, { solid: true });
      K.box(g, S, 0, 1.2, 0, w, h1, w, chance(0.5) ? C.brick : stone, { solid: true });
      K.box(g, S, 0, 1.2 + h1, 0, w + 0.4, 0.5, w + 0.4, C.trav);
      K.box(g, S, 0, 1.7 + h1, 0, w * 0.8, h2, w * 0.8, stone);
      K.panel(g, S, 0, 1.9 + h1, -w * 0.4 - 0.03, w * 0.35, h2 * 0.6, 0x3a3028, -1);
      K.statue(g, S.sub(0, -w * 0.35, 0, S.y), 0, 1.75 + h1, 0, C.marble, 'man', 0, 0.55);
      K.tbox(g, S, 0, 1.7 + h1 + h2, 0, w * 0.86, w * 0.86, 0.1, 0.1, w * 0.4, C.tile);
      decal(S, 0, 2.2, -w / 2 - 0.03, w * 0.8, 1.0, ep(), { pw: 384, ph: 128, bg: '#ddd2bc', ink: '#3a2a1a', size: 0.62 });
      break;
    }
    case 'drum': { // a round drum tomb on a square base, earth and a cypress on top
      const r = rnd(4, 7) * k;
      K.box(g, S, 0, b, 0, r * 2 + 1, -b + 2, r * 2 + 1, stone, { solid: true });
      const dh = rnd(3, 5), top = 2 + dh; // the earth mound sits on the drum, whatever its height
      K.cyl(g, S, 0, 2, 0, r, r, dh, 18, C.trav, { solid: true, topHex: 0x6f8a45 });
      K.cyl(g, S, 0, top - 0.05, 0, r * 0.95, 0.6, r * 0.5, 14, 0x6f8a45, { top: false });
      treeAt(S.x, S.z, 'cypress', 0.8, S.y + top + r * 0.4);
      decal(S, 0, 2.6, -r - 0.05, r * 0.9, 1.0, ep(), { pw: 384, ph: 128, bg: '#ddd2bc', ink: '#3a2a1a', size: 0.62 });
      break;
    }
    case 'altar': {
      const w = rnd(2.4, 4) * k;
      K.box(g, S, 0, b, 0, w + 0.8, -b + 0.6, w * 0.8 + 0.8, C.trav2, { solid: true });
      K.box(g, S, 0, 0.6, 0, w, 2.4, w * 0.8, C.marble, { solid: true });
      K.box(g, S, 0, 3.0, 0, w + 0.3, 0.3, w * 0.8 + 0.3, C.marble);
      for (const s of [-1, 1]) K.cyl(g, S, s * w / 2, 3.4, 0, 0.3, 0.3, w * 0.8, 8, C.marble);
      decal(S, 0, 1.0, -w * 0.4 - 0.03, w * 0.85, 1.4, ep(), { pw: 320, ph: 160, bg: '#e8e0d0', ink: '#3a2a1a', size: 0.6 });
      break;
    }
    case 'temple': {
      const w = rnd(5, 7) * k, d = w * 1.3;
      K.box(g, S, 0, b, 0, w, -b + 1.6, d, C.tuff, { solid: true });
      K.box(g, S, 0, 1.6, 0, w, 5, d, C.brick, { solid: true });
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) K.box(g, S, s * (w / 2 + 0.05), 1.6, -d / 2 + 0.5 + i * (d - 1) / 2, 0.3, 5, 0.5, C.brickD);
      K.box(g, S, 0, 6.6, 0, w + 0.3, 0.6, d + 0.3, C.trav);
      K.gable(g, S, 0, 7.2, 0, w + 0.4, d + 0.4, 1.6, C.tile, { alongV: true, side: C.brick });
      K.panel(g, S, 0, 1.6, -d / 2 - 0.03, 1.2, 2.2, 0x2a2018, -1);
      decal(S, 0, 4.2, -d / 2 - 0.04, w * 0.7, 0.9, ep(), { pw: 384, ph: 110, bg: '#d8ccb4', ink: '#3a2a1a', size: 0.62 });
      break;
    }
    case 'relief': { // a freedman family looking out of a niche of portrait busts
      const w = rnd(3, 4.5) * k;
      K.box(g, S, 0, b, 0, w, -b + 4.2, 2, stone, { solid: true });
      K.panel(g, S, 0, 2.2, -1.03, w * 0.8, 1.3, 0x4a4036, -1);
      for (let i = 0; i < 3; i++) { K.box(g, S, -w * 0.25 + i * w * 0.25, 2.3, -1.2, 0.36, 0.5, 0.3, C.marble); K.box(g, S, -w * 0.25 + i * w * 0.25, 2.8, -1.2, 0.26, 0.32, 0.28, C.marble); }
      K.box(g, S, 0, 4.2, 0, w + 0.2, 0.4, 2.2, C.trav);
      decal(S, 0, 0.8, -1.04, w * 0.8, 1.0, ep(), { pw: 384, ph: 128, bg: '#ddd2bc', ink: '#3a2a1a', size: 0.62 });
      break;
    }
    case 'stelae': // a family plot of gravestones behind a low wall
      for (const [u0, v0, u1, v1] of [[-4, -3, 4, -3], [-4, 3, 4, 3], [-4, -3, -4, 3], [4, -3, 4, 3]]) wall(g, S, u0, v0, u1, v1, -0.3, 1.0, 0.4, stone);
      for (let i = 0; i < 6; i++) K.box(g, S, -3 + (i % 3) * 3, 0, -1 + Math.floor(i / 3) * 2, 0.7, rnd(0.9, 1.5), 0.15, C.marble);
      break;
    case 'columbarium': { // a brick dovecote of urn niches for freedmen and slaves of a great house
      const w = rnd(6, 9) * k, d = w * 0.8;
      K.box(g, S, 0, b, 0, w, -b + 5, d, C.brick, { solid: true });
      K.hip(g, S, 0, 5, 0, w + 0.4, d + 0.4, 1.2, C.tile);
      K.panel(g, S, 0, 0, -d / 2 - 0.03, 1, 2, 0x2a2018, -1);
      K.box(g, S, 0, 2.3, -d / 2 - 0.05, 2, 0.6, 0.1, C.marble);
      break;
    }
    case 'exedra': { // a semicircular stone bench where travellers can sit
      const r = 3 * k;
      for (let i = 0; i < 8; i++) { const a = Math.PI + (i / 7) * Math.PI; K.box(g, S, Math.cos(a) * r, 0, Math.sin(a) * r * -1 + 0.5, 1.3, 0.5, 0.7, C.trav, { ra: a + Math.PI / 2, solid: true }); }
      K.cyl(g, S, 0, 0, 1.5, 0.5, 0.4, 2.2, 8, C.marble);
      W.spots.push({ kind: 'sit', x: S.wx(0, r - 0.2), z: S.wz(0, r - 0.2), y: S.y + 0.5, yaw: S.yaw + Math.PI, role: 'traveller', h: [7, 18] });
      break;
    }
  }
}
function milestone(s, n) {
  const S = roadside(s, 4.6);
  const g = gbF('city', S);
  K.box(g, S, 0, -0.2, 0, 0.9, 0.5, 0.9, C.trav2, { solid: true });
  K.cyl(g, S, 0, 0.3, 0, 0.35, 0.33, 1.8, 10, 0xc8bca0, { solid: true });
  decal(S, 0, 1.2, -0.37, 0.5, 0.42, ['M · P', romanNumeral(n)], { pw: 96, ph: 80, bg: '#c8bca0', ink: '#3a2a1a', size: 0.8 });
  if (n === 1 || n === 6) placard('milestone' + (n === 1 ? '' : '6'), S.wx(-1.2, -1.4), S.wz(-1.2, -1.4));
}

function buildAppia() {
  rseed('appia');
  ROAD = []; let s0 = 0;
  for (let i = 0; i < APPIA.length - 1; i++) {
    const [ax, az] = APPIA[i], [bx, bz] = APPIA[i + 1], L = Math.hypot(bx - ax, bz - az);
    ROAD.push({ F: new Frame(ax, az, Math.atan2(bz - az, bx - ax), 0), L, s0 }); s0 += L;
  }
  const total = s0;
  // the road: basalt carriageway four metres wide with raised footways and kerbs
  street(APPIA.slice(0, 3), { w: 4.4, side: 1.6, kind: 'road', cart: true, zone: 'appia', dens: 0.5 });
  place('appia', 'The Via Appia', 'Via Appia', ...[APPIA[1][0] + 200, APPIA[1][1] + 200], 260, 'district', { major: true });
  placard('appia', ...(() => { const S = roadside(70, 4.4); return [S.x, S.z]; })());
  // the suburb outside the gate: shops, inns and houses along the first stretch
  for (let s = 30; s < 300; s += rnd(14, 24)) for (const sgn of [-1, 1]) {
    if (chance(0.25)) continue;
    const w = rnd(10, 18), d = rnd(10, 14), S = roadside(s, sgn * (4.2 + d / 2 + 0.6));
    if (!rectFree(S, 0, 0, w, d)) continue;
    reserve(S, 0, 0, w, d, 0.3);
    insula(S, w, d, { floors: rint(2, 3), portico: chance(0.3), shopP: 0.3 });
  }
  // Temple of Mars outside the gate, where armies mustered
  { const S = roadside(120, 30, 0); if (rectFree(S, 0, 0, 22, 32)) temple(S, { w: 16, d: 26, podH: 2.6, cols: 4, colH: 9, order: 'd', pron: 2, pod: C.tuff }); }
  // the tomb of the Scipios, cut into the bank on the left
  {
    const S = roadside(330, -16); const g = gbF('mon', S);
    reserve(S, 0, 0, 18, 10, 1);
    K.box(g, S, 0, -0.4, 2, 16, 3.6, 6, C.tuff, { solid: true });
    K.box(g, S, 0, 3.2, 3, 16, 5, 4, C.tuff, { solid: true });
    for (let i = 0; i < 5; i++) K.column(g, S, -6 + i * 3, 3.2, 0.8, 4.4, 0.25, 'i', 0xd8ccb0, { solid: false });
    K.box(g, S, 0, 7.6, 1.4, 16.4, 0.6, 7, C.trav);
    K.panel(g, S, 0, 0, -1.03, 1.6, 2.4, 0x1a1410, -1);
    for (let i = 0; i < 3; i++) K.statue(g, S.sub(-5 + i * 5, 2.5, 0, S.y), 0, 3.0, 0, C.marble, 'man', 0, 0.6);
    place('scipios', 'Tomb of the Scipios', 'Sepulcrum Scipionum', S.x, S.z, 18, 'landmark', { area: 'The Via Appia', big: false });
    placard('scipios', ...(() => { const T2 = roadside(330, -4.6); return [T2.x, T2.z]; })());
  }
  // the Arch of Drusus, carrying an aqueduct branch over the road
  {
    const p = appiaAt(420);
    const A2 = new Frame(p.x, p.z, p.F.ang - Math.PI / 2, groundAt(p.x, p.z)); // passage (local v) along the road
    triArch(A2, { w: 14, d: 6, h: 13, pw: 6.4, ph: 8.4, attic: 3, marble: C.trav });
    place('drusus', 'Arch of Drusus', 'Arcus Drusi', p.x, p.z, 14, 'landmark', { area: 'The Via Appia', big: false });
  }
  // tombs on both sides, thick near the city and thinning out
  const kinds = [[3, 'tower'], [2.4, 'drum'], [2, 'altar'], [2, 'temple'], [2.2, 'relief'], [1.6, 'stelae'], [1.2, 'columbarium'], [0.6, 'exedra']];
  for (let s = 360; s < total - 280; ) {
    const t = (s - 360) / (total - 640);
    s += lerp(9, 42, Math.pow(t, 0.6)) * rnd(0.7, 1.4);
    if (s > 640 && s < 760) continue; // Caecilia Metella's plot
    for (const sgn of [-1, 1]) {
      if (chance(lerp(0.15, 0.55, t))) continue;
      const kind = wpick(kinds);
      const off = rnd(10, 13.5);
      const S = roadside(s, sgn * off);
      if (!rectFree(S, 0, 0, 8, 8)) continue;
      reserve(S, 0, 0, 8, 8, 0.5);
      tomb(S, kind, rnd(0.85, 1.25));
      if (chance(0.35)) treeAt(S.wx(rnd(-6, 6), 7), S.wz(rnd(-6, 6), 7), chance(0.6) ? 'cypress' : 'pine');
    }
  }
  // umbrella pines and cypresses lining the road further out
  for (let s = 500; s < total - 200; s += rnd(20, 46)) for (const sgn of [-1, 1]) {
    if (chance(0.45)) continue;
    const p = appiaAt(s), off = sgn * rnd(13, 22), x = p.F.wx(p.u, off), z = p.F.wz(p.u, off);
    if (!reservedAt(x, z)) treeAt(x, z, chance(0.65) ? 'pine' : 'cypress', rnd(0.9, 1.25));
  }
  // milestones every (compressed) mile: Bovillae is at the twelfth
  const mileLen = (total - 120) / 12;
  for (let n = 1; n <= 11; n++) milestone(n * mileLen, n);
  // the Tomb of Caecilia Metella, at the third milestone
  {
    const S = roadside(700, -22); const g = gbF('mon', S);
    reserve(S, 0, 0, 34, 34, 2);
    const [lo] = groundRange(S, 0, 0, 30, 30);
    K.box(g, S, 0, lo - S.y - 0.3, 0, 30, S.y - lo + 7.3, 30, C.peperino, { solid: true });
    K.cyl(g, S, 0, 7, 0, 14.6, 14.6, 11, 32, 0xe2d8c2, { solid: true, topHex: 0x7a8a50 });
    K.cyl(g, S, 0, 16.2, 0, 14.8, 14.8, 1.8, 32, 0xd8ccb2, { top: false });
    for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; K.box(g, S, Math.cos(a) * 14.85, 16.6, Math.sin(a) * 14.85, 0.6, 0.6, 0.6, 0xf0e8d8, { ra: -a }); }
    K.cyl(g, S, 0, 18, 0, 14.2, 2, 6, 24, 0x6f8a45, { top: false });
    K.box(g, S, 0, 12, -14.7, 7, 1.6, 0.3, C.marble);
    decal(S, 0, 12.1, -14.88, 6.6, 1.4, ['CAECILIAE', 'Q · CRETICI · F', 'METELLAE · CRASSI'], { pw: 512, ph: 110, bg: '#ece4d4', ink: '#3a2a1a', size: 0.7 });
    const sp = roadside(660, -3);
    place('metella', 'Tomb of Caecilia Metella', 'Sepulcrum Caeciliae Metellae', S.x, S.z, 34, 'landmark', { area: 'The Via Appia', far: 1500, spawn: [sp.x, sp.z] });
    placard('metella', ...(() => { const T2 = roadside(700, -4.6); return [T2.x, T2.z]; })());
    mapCircle(S.x, S.z, 15, '#d7c7a2');
  }
  // a roadside fountain for travellers and their animals
  { const S = roadside(980, 5.6); fountain(S, 0, 0, { r: 1.6 }); const T2 = roadside(980, 5.6); W.spots.push({ kind: 'animal', x: T2.wx(1.5, 2), z: T2.wz(1.5, 2), yaw: T2.yaw, role: 'mule' }); }
  // the Villa of the Quintilii at the fifth milestone
  buildVilla(roadside(1260, -60), 'quintilii');
  // a posting station of the imperial post (mansio) halfway to Bovillae
  buildMansio(roadside(1650, 34));
  // farms set back from the road
  for (const [s, v] of [[900, 130], [1450, -170], [1900, 160], [2150, -120]]) buildFarm(roadside(s, v, rnd(-0.3, 0.3)));
  // the walk out is long: a few paths branch off to the farms
  for (const [s, v] of [[900, 130], [1450, -170], [1900, 160], [2150, -120]]) { const a = appiaAt(s), S = roadside(s, v); addPath([[a.x, a.z], [lerp(a.x, S.x, 0.5), lerp(a.z, S.z, 0.5)], [S.x, S.z]], { hw: 1.6, kind: 'path', zone: 'appia', dens: 0.15 }); mapLine([[a.x, a.z], [S.x, S.z]], 3, '#b8a888'); }
}

function buildVilla(S, name) {
  rseed('villa:' + name);
  const g = gbF('mon', S);
  reserve(S, 0, 0, 130, 110, 2);
  const [lo] = groundRange(S, 0, 0, 120, 100);
  K.box(g, S, 0, lo - S.y - 0.3, 6, 120, S.y - lo + 1.3, 80, C.brick, { solid: true, top: 0x7a8a50 });
  // the nymphaeum facing the road: a curved fountain wall with niches
  const N = S.sub(0, -48, 0, S.y);
  K.box(g, N, 0, lo - S.y, 2, 46, S.y - lo + 8, 4, C.brick, { solid: true });
  for (let i = 0; i < 7; i++) { K.panel(g, N, -18 + i * 6, 2.2, -0.03, 2.4, 3.8, 0x2a3a3a, -1); K.statue(g, N.sub(-18 + i * 6, -0.8, 0, N.y), 0, 2.2, 0, C.marble, 'god', 0, 0.55); }
  K.box(g, N, 0, -0.2, -3, 40, 0.8, 4, C.marble, { solid: true }); K.box(g, N, 0, 0.55, -3, 39, 0.02, 3.4, C.water);
  W.fountains.push({ x: N.x, z: N.z, big: true });
  // the residence: halls, a bath suite with domes, porticoes round a great garden
  K.box(g, S, -30, 1, 20, 40, 10, 28, C.plaster, { solid: true }); K.hip(g, S, -30, 11, 20, 41, 29, 3, C.tile);
  K.box(g, S, 30, 1, 22, 36, 12, 30, C.brick, { solid: true });
  K.dome(g, S.sub(30, 22, 0, S.y + 13), 0, 0, 0, 9, 14, 4, C.brick); K.cyl(g, S, 30, 1, 22, 9, 9, 12, 14, C.brick);
  porticus(S.sub(0, -10, 0, S.y + 1), { w: 90, d: 40, depth: 4.5, colH: 5.5, colR: 0.26, noRes: true, floor: false, sides: 'flr' });
  field(S, 0, -10, 80, 30, 'garden');
  for (let i = 0; i < 10; i++) treeAt(S.wx(-36 + i * 8, -10 + (i % 2 ? 6 : -6)), S.wz(-36 + i * 8, -10 + (i % 2 ? 6 : -6)), rpick(['cypress', 'laurel', 'pine']), 1, S.y + 1);
  K.box(g, S, 0, 1, -10, 24, 0.5, 6, C.marble); K.box(g, S, 0, 1.5, -10, 23, 0.02, 5, C.water);
  W.spots.push({ kind: 'work', x: S.wx(-20, -14), z: S.wz(-20, -14), y: S.y + 1, yaw: 0, role: 'gardener' });
  W.spots.push({ kind: 'stand', x: S.wx(0, -52), z: S.wz(0, -52), yaw: S.yaw + Math.PI, role: 'vilicus', h: [6, 19] });
  place('quintilii', 'Villa of the Quintilii', 'Villa Quintiliorum', S.x, S.z, 70, 'landmark', { area: 'The Via Appia', far: 1400 });
  placard('quintilii', N.wx(6, -6), N.wz(6, -6));
  mapRect(S, 0, 6, 120, 80, '#b8a080');
  const a = [S.wx(0, -60), S.wz(0, -60)], r = appiaAt(1260);
  addPath([[r.x, r.z], a, [N.wx(0, -6), N.wz(0, -6)]], { hw: 2.5, kind: 'path', zone: 'appia', dens: 0.3 });
  mapLine([[r.x, r.z], a], 4, '#b8a888');
}

function buildMansio(S) {
  rseed('mansio');
  const g = gbF('city', S);
  reserve(S, 0, 0, 50, 40, 2);
  // an inn round a yard: rooms on two sides, stables at the back, a gate to the road
  for (const [u0, v0, u1, v1] of [[-22, -18, -4, -18], [4, -18, 22, -18], [-22, 18, 22, 18], [-22, -18, -22, 18], [22, -18, 22, 18]]) wall(g, S, u0, v0, u1, v1, -0.3, 3.2, 0.6, C.plaster);
  K.box(g, S, -14, 0, -12, 16, 7, 10, C.plaster, { solid: true }); K.hip(g, S, -14, 7, -12, 17, 11, 2, C.tile);
  windowRows(gbF('glow', S), g, S, 'f', 16, 5, 3.6, 1, 3, { shutters: true });
  K.box(g, S, 14, 0, -12, 16, 7, 10, C.plaster, { solid: true }); K.hip(g, S, 14, 7, -12, 17, 11, 2, C.tile);
  K.box(g, S, 0, 0, 14, 40, 4.5, 7, C.wood, { solid: true }); K.tbox(g, S, 0, 4.5, 14, 41, 8, 41, 1, 1.2, C.tile2, { ov: 3 });
  for (let i = 0; i < 6; i++) K.panel(gbF('glow', S), S, -17 + i * 7, 0, 10.47, 3, 3, 0x1e1812, -1);
  K.box(g, S, 0, 3.2, -18, 8, 1, 0.8, C.wood);
  decal(S, 0, 3.3, -18.45, 6, 0.7, ['MANSIO · AD · MVTATIONEM'], { pw: 512, ph: 60, bg: '#e8dcc0', ink: '#7a1a14', size: 0.75 });
  fountain(S, 0, 2, { r: 1.4 });
  for (let i = 0; i < 3; i++) W.spots.push({ kind: 'animal', x: S.wx(-14 + i * 5, 8), z: S.wz(-14 + i * 5, 8), yaw: S.yaw, role: 'horse' });
  W.spots.push({ kind: 'cart', x: S.wx(12, 4), z: S.wz(12, 4), yaw: S.yaw + 0.5, role: 'parkedcart' });
  W.spots.push({ kind: 'stand', x: S.wx(-2, -15), z: S.wz(-2, -15), yaw: S.yaw + Math.PI, role: 'innkeeper', h: [5, 23] });
  W.spots.push({ kind: 'work', x: S.wx(-10, 9), z: S.wz(-10, 9), yaw: S.yaw, role: 'groom' });
  W.spots.push({ kind: 'sit', x: S.wx(8, -14), z: S.wz(8, -14), y: S.y + 0.4, yaw: S.yaw, role: 'traveller', h: [7, 22] });
  K.box(g, S, 8, 0, -14.6, 3, 0.4, 0.5, C.wood, { solid: true });
  const r = appiaAt(1650);
  addPath([[r.x, r.z], [S.wx(0, -24), S.wz(0, -24)], [S.wx(0, -10), S.wz(0, -10)], [S.wx(0, 6), S.wz(0, 6)]], { hw: 2.5, kind: 'path', zone: 'appia', dens: 0.4 });
  place('mansio', 'The Posting Station', 'Mansio', S.x, S.z, 30, 'landmark', { area: 'The Via Appia' });
  placard('mansio', S.wx(5, -21), S.wz(5, -21));
  mapRect(S, 0, 0, 44, 36, '#c8a882');
}

// a working farm (villa rustica): house, barn, the olive press, a yard with animals, fields round about
function buildFarm(S) {
  rseed('farm:' + Math.round(S.x));
  const g = gbF('city', S);
  if (!rectFree(S, 0, 0, 40, 34)) return;
  reserve(S, 0, 0, 40, 34, 2);
  K.box(g, S, -8, -0.3, -6, 16, 6.3, 10, C.plaster, { solid: true }); K.hip(g, S, -8, 6, -6, 17, 11, 2.2, C.tile);
  K.box(g, S, 10, -0.3, -4, 12, 5.3, 14, C.wood, { solid: true }); K.gable(g, S, 10, 5, -4, 13, 15, 2.4, C.tile2, { alongV: true });
  K.panel(gbF('glow', S), S, -8, 0, -11.05, 1.4, 2.2, 0x2a1d14, -1);
  for (const [u0, v0, u1, v1] of [[-16, 2, 16, 2], [-16, 14, 16, 14], [-16, 2, -16, 14], [16, 2, 16, 14]]) wall(g, S, u0, v0, u1, v1, -0.3, 1.4, 0.4, 0x9a9080);
  // the olive press: a stone basin and a long beam
  K.cyl(g, S, -10, 0, 8, 1.4, 1.4, 0.8, 10, 0x8a8478, { solid: true }); K.box(g, S, -6, 1.2, 8, 8, 0.3, 0.3, C.woodD);
  for (let i = 0; i < 3; i++) K.cyl(gbF('prop', S), S, 4 + i * 1.2, 0, 6, 0.4, 0.3, 1.2, 7, 0xb8724a);
  W.spots.push({ kind: 'animal', x: S.wx(6, 10), z: S.wz(6, 10), yaw: rnd(0, TAU), role: 'ox' });
  W.spots.push({ kind: 'animal', x: S.wx(9, 9), z: S.wz(9, 9), yaw: rnd(0, TAU), role: 'mule' });
  W.spots.push({ kind: 'work', x: S.wx(-4, 6), z: S.wz(-4, 6), yaw: rnd(0, TAU), role: 'farmwife', h: [5, 20] });
  for (const [u, v, w, d, k] of [[0, 36, 60, 30, 'vines'], [-50, 8, 40, 50, 'olives'], [50, 10, 46, 50, 'wheat'], [0, -38, 50, 26, 'green']]) { const F = site(S, u, v, 0); if (rectFree(F, 0, 0, w, d)) field(F, 0, 0, w, d, k); }
  place('farm' + Math.round(S.x), 'A farm on the Campagna', 'Villa rustica', S.x, S.z, 30, 'scene', { area: 'The Via Appia', big: false });
  if (!W._farmPlacard) { W._farmPlacard = 1; placard('farm', S.wx(0, -14), S.wz(0, -14)); }
  mapRect(S, 0, 0, 34, 28, '#c8a882');
}

// ======================= Bovillae =======================
function buildTown() {
  rseed('bovillae');
  const r = ROAD[1];
  const TF = new Frame(TOWN.x, TOWN.z, r.F.ang, groundAt(TOWN.x, TOWN.z)); // u along the Appia through the town
  // the forum on the south-west side of the road
  {
    const F = site(TF, 0, 42, 0); const g = gbF('mon', F);
    reserve(F, 0, 0, 74, 52, 2);
    pavement(F, 0, 0, 64, 40, 0xd0c4a6, { slab: 3.5, layer: 'mon' });
    // the temple of the Julian family's ancestral cult, at the head of the forum
    temple(site(TF, 0, 72, Math.PI), { w: 14, d: 22, podH: 2.6, cols: 4, colH: 8, order: 'c', pron: 2, stairW: 9, pod: C.peperino, marble: C.trav });
    // shops down both sides, the curia and a small basilica
    for (const s of [-1, 1]) {
      const A = site(F, s * 37, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      insula(A, 36, 10, { floors: 1, portico: true, shopP: 0.6 });
    }
    { const B = site(F, 0, -26, Math.PI); K.box(gbF('mon', B), B, 0, 0, 0, 12, 7, 8, C.trav2, { solid: true }); K.gable(gbF('mon', B), B, 0, 7, 0, 13, 9, 2.4, C.tile, { side: C.trav2 }); }
    altar(g, F, 0, 10, 1.1);
    fountain(F, -18, -8, { r: 1.5 });
    for (let i = 0; i < 4; i++) { stall(site(F, -16 + i * 10, 6, 0), rpick(['veg', 'veg', 'meat'])); W.spots.push({ kind: 'shop', x: F.wx(-16 + i * 10, 7.6), z: F.wz(-16 + i * 10, 7.6), yaw: F.yawOf(0, -1), role: rpick(['greengrocer', 'farmer', 'vendor']), h: [6, 14] }); }
    K.statue(g, F, 12, 0, -6, C.bronze, 'man', 0, 1.0);
    navGrid(F, -26, 26, -16, 16, 4, 2, { zone: 'town', dens: 1.4 });
    place('bovillae', 'Bovillae', 'Bovillae', TF.x, TF.z, 150, 'landmark', { area: 'Bovillae', major: true, far: 2600, spawn: [TF.wx(-60, 0), TF.wz(-60, 0)], spawnYaw: TF.yawOf(1, 0) + Math.PI });
    place('bovforum', 'The Forum of Bovillae', 'Forum Bovillarum', F.x, F.z, 30, 'landmark', { area: 'Bovillae', big: false });
    place('sacrarium', 'Shrine of the Julian family', 'Sacrarium gentis Iuliae', TF.wx(0, 72), TF.wz(0, 72), 16, 'landmark', { area: 'Bovillae', big: false });
    placard('bovillae', F.wx(-6, -18), F.wz(-6, -18));
    placard('sacrarium', TF.wx(5, 58), TF.wz(5, 58));
    fpath(TF, [[0, 5], [0, 22], [0, 30]], { hw: 3, kind: 'plaza', zone: 'town', dens: 1 });
  }
  // the inn at the Rome end of the town, with its stable yard and a carriage at rest
  {
    const S = site(TF, -70, -24, Math.PI); const g = gbF('city', S);
    reserve(S, 0, 0, 30, 24, 1);
    insula(S, 22, 12, { floors: 1, portico: true, shopP: 0 });
    for (const [u0, v0, u1, v1] of [[-11, 6, -11, 18], [11, 6, 11, 18], [-11, 18, 11, 18]]) wall(g, S, u0, v0, u1, v1, -0.3, 2.6, 0.5, C.plaster);
    decal(S, 0, 3.0, -8.4, 6, 0.6, ['CAVPONA · AD · GALLINAS'], { pw: 512, ph: 56, bg: '#e8dcc0', ink: '#7a1a14', size: 0.75 });
    W.spots.push({ kind: 'stand', x: S.wx(-3, -8.2), z: S.wz(-3, -8.2), yaw: S.yaw + Math.PI, role: 'innkeeper', h: [6, 23] });
    W.spots.push({ kind: 'animal', x: S.wx(-4, 12), z: S.wz(-4, 12), yaw: S.yaw, role: 'horse' });
    W.spots.push({ kind: 'cart', x: S.wx(4, 12), z: S.wz(4, 12), yaw: S.yaw + 1.2, role: 'parkedcart' });
    W.spots.push({ kind: 'sit', x: S.wx(3, -8.0), z: S.wz(3, -8.0), y: S.y + 0.4, yaw: S.yaw + Math.PI, role: 'traveller', h: [8, 22] });
    K.box(g, S, 3, 0, -7.4, 3, 0.4, 0.5, C.wood, { solid: true });
    place('caupona', 'The Inn', 'Caupona', S.x, S.z, 18, 'landmark', { area: 'Bovillae', big: false });
    placard('caupona', S.wx(-6, -10), S.wz(-6, -10));
  }
  // the little theatre and the baths
  { const T2 = site(TF, -40, 110, Math.PI + 0.2); theatre(T2, 30, 14, 'Bovillae'); place('bovtheatre', 'The Theatre of Bovillae', 'Theatrum', T2.x, T2.z, 34, 'landmark', { area: 'Bovillae', big: false }); }
  {
    const S = site(TF, 55, 46, Math.PI / 2); const g = gbF('city', S);
    reserve(S, 0, 0, 30, 24, 1);
    K.box(g, S, 0, -0.3, 0, 26, 7.3, 18, C.brick, { solid: true }); K.hip(g, S, 0, 7, 0, 27, 19, 2, C.tile);
    K.cyl(g, S, 6, 7, 2, 5, 5, 2, 12, C.brick); K.dome(g, S.sub(6, 2, 0, S.y + 9), 0, 0, 0, 5, 10, 3, C.brick);
    K.panel(gbF('glow', S), S, -4, 0, -9.05, 1.8, 2.6, 0x2a1d14, -1);
    decal(S, -4, 2.9, -9.06, 5, 0.55, ['BALNEVM'], { pw: 256, ph: 40, bg: '#e8dcc0', ink: '#7a1a14', size: 0.8 });
    K.cyl(g, S, -10, 7, 6, 0.5, 0.4, 3, 6, C.brick);
    place('bovbaths', 'The Town Baths', 'Balneum', S.x, S.z, 18, 'landmark', { area: 'Bovillae', big: false });
  }
  // houses, shops and workshops: the rest of the town, along the road and two side streets
  street([[APPIA[2][0], APPIA[2][1]], [TF.wx(130, 0), TF.wz(130, 0)]], { w: 4.4, side: 1.6, kind: 'road', cart: true, zone: 'town', dens: 1.2, nav: true, res: true });
  STYLES.town = { bu: [24, 34], bv: [20, 28], sw: [4, 5], side: 0.9, floors: [1, 2], mix: [[4, 'insula'], [3, 'domus'], [1, 'horrea'], [1.5, 'garden']], dens: 0.9, portico: 0.2 };
  district(TF.sub(0, 0, 0.0), -140, 150, -150, 150, 'town', 'bovillae');
  // a potter's kiln and a smithy on the edge of town
  { const S = site(TF, 120, -40, 0); if (rectFree(S, 0, 0, 10, 10)) { const g = gbF('city', S); reserve(S, 0, 0, 10, 10, 1); K.cyl(g, S, 0, -0.3, 0, 2.6, 2.2, 3, 10, C.brick, { solid: true }); K.dome(g, S.sub(0, 0, 0, S.y + 2.7), 0, 0, 0, 2.2, 10, 3, C.brick); K.panel(gbF('glow', S), S, 0, 0, -2.62, 0.9, 1.0, 0xff7a30, -1); W.spots.push({ kind: 'work', x: S.wx(2, -3), z: S.wz(2, -3), yaw: S.yaw + 1, role: 'potter' }); } }
  // fields round the town
  for (let i = 0; i < 26; i++) {
    const a = rnd(0, TAU), d = rnd(180, 360), u = Math.cos(a) * d, v = Math.sin(a) * d;
    const F = site(TF, u, v, rnd(-0.2, 0.2)), w = rnd(40, 80), dd = rnd(30, 70);
    if (!rectFree(F, 0, 0, w, dd)) continue;
    field(F, 0, 0, w, dd, wpick([[3, 'vines'], [2, 'olives'], [3, 'wheat'], [1.5, 'green'], [1, 'plough']]));
    if (chance(0.3)) W.spots.push({ kind: 'work', x: F.x, z: F.z, yaw: rnd(0, TAU), role: 'farmer', h: [6, 18] });
  }
  for (let i = 0; i < 60; i++) { const a = rnd(0, TAU), d = rnd(150, 420), x = TF.wx(Math.cos(a) * d, Math.sin(a) * d), z = TF.wz(Math.cos(a) * d, Math.sin(a) * d); if (!reservedAt(x, z)) treeAt(x, z, rpick(['olive', 'pine', 'cypress', 'oak', 'olive'])); }
  W.spots.push({ kind: 'play', x: TF.wx(10, 30), z: TF.wz(10, 30), yaw: 0, role: 'child', h: [8, 18] });
  W.spots.push({ kind: 'play', x: TF.wx(11, 31), z: TF.wz(11, 31), yaw: 2, role: 'child', h: [8, 18] });
}
