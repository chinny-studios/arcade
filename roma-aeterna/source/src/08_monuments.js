// Roma Aeterna — the Capitol, the Palatine palaces, the Colosseum and the gladiators' school, the Circus Maximus,
// the Baths of Trajan and the Temple of Claudius.

W.seatPts = [];   // spectator positions for the Circus crowd: { x, y, z, yaw, c }
W.circus = null;  // the chariot track

function buildCapitolPalatine() {
  rseed('capitol');
  reserve(FF, -215, -10, 130, 240, 6);
  // ---- Temple of Jupiter Best and Greatest, with Domitian's gilded roof ----
  {
    const S = site(FF, -226, 52, FACE['+u']);
    const T1 = temple(S, { w: 50, d: 60, podH: 5, cols: 6, peri: 8, back: false, colH: 16, order: 'c', stairW: 26, roof: C.gilt, gilt: true, quadriga: true, tymp: 0xd8cfb8 });
    pavement(site(FF, -205, 40), 0, 0, 120, 110, C.trav, { slab: 4, layer: 'mon', yo: 0.04 });
    porticus(site(FF, -212, 40), { w: 116, d: 108, depth: 6, colH: 7, sides: 'kl', gaps: [{ side: 'l', w: 10 }] });
    for (let i = 0; i < 6; i++) { const P = site(FF, -168, 10 + i * 12); K.statue(gbF('mon', P), P, 0, 0, 0, C.bronze, i === 2 ? 'horse' : 'man', FACE['+u'], 1.1); }
    altar(gbF('mon', S), S, 0, -46, 1.4);
    place('jupiter', 'Temple of Jupiter Optimus Maximus', 'Aedes Iovis Optimi Maximi', S.x, S.z, 45, 'landmark', { area: 'The Capitol', major: true, spawn: fw(FF, -170, 55), spawnYaw: -60 * D2R });
    placard('jupiter', ...fw(FF, -178, 46));
  }
  // ---- the Arx and the Temple of Juno Moneta, where the mint struck the coins ----
  {
    const S = site(FF, -222, -82, FACE['+u']);
    temple(S, { w: 18, d: 28, podH: 3, cols: 4, colH: 9, order: 'i', pron: 2, stairW: 10 });
    const g = gbF('city', S);
    K.box(g, S, -4, 0, 24, 22, 7, 14, C.tuff, { solid: true }); K.hip(g, S, -4, 7, 24, 23, 15, 2.2, C.tile);
    place('moneta', 'Temple of Juno Moneta', 'Aedes Iunonis Monetae', S.x, S.z, 22, 'landmark', { area: 'The Capitol', big: false });
    placard('moneta', ...fw(FF, -200, -82));
  }
  // the Asylum between the two summits: a grove
  for (let i = 0; i < 9; i++) treeAt(...fw(FF, -232 + rnd(-14, 14), -30 + rnd(-10, 10)), chance(0.5) ? 'oak' : 'cypress');
  // the Tarpeian Rock, at the cliff over the Velabrum
  placard('tarpeian', ...fw(FF, -205, 105));
  place('tarpeian', 'The Tarpeian Rock', 'Saxum Tarpeium', ...fw(FF, -205, 112), 14, 'landmark', { area: 'The Capitol', big: false });
  { const S = site(FF, -205, 108); for (let i = -3; i <= 3; i++) K.box(gbF('city', S), S, i * 2, 0, 3, 1.9, 1.0, 0.4, C.tuff, { solid: true }); }
  fpath(FF, [[-192, 52], [-200, 20], [-215, -10], [-212, -60], [-200, -82]], { hw: 2.5, kind: 'path', zone: 'forum' });
  fpath(FF, [[-192, 52], [-180, 40], [-170, 30], [-180, 60], [-192, 52]], { hw: 3, kind: 'plaza', zone: 'forum' });

  // ================= the Palatine =================
  rseed('palatine');
  reserve(FF, 70, 250, 340, 220, 8);
  // Domus Flavia: the state palace (throne hall, peristyle with a maze fountain, banqueting hall)
  {
    const S = site(FF, 125, 212, FACE['-v']); const g = gbF('mon', S);
    const [lo] = groundRange(S, 0, 0, 92, 110);
    K.box(g, S, 0, lo - S.y, 0, 92, S.y - lo + 0.6, 110, C.brick, { solid: true, top: C.trav });
    // Aula Regia
    K.box(g, S, 0, 0.6, -36, 32, 30, 38, C.brick, { solid: true });
    K.box(g, S, 0, 30.6, -36, 33, 1.4, 39, C.marble); K.gable(g, S, 0, 32, -36, 34, 40, 6, C.tile, { alongV: true, side: C.plaster });
    K.colonnade(g, S, -14, -56, 14, -56, 6, 0.6, 12, 0.6, 'c', 0xa88a6a);
    K.box(g, S, 0, 12.6, -56, 32, 1.4, 2.6, C.marble);
    K.panel(g, S, 0, 0.6, -55.03, 6, 9, 0x2a1d14, -1);
    for (const s of [-1, 1]) { K.box(g, S, s * 30, 0.6, -36, 24, 20, 38, C.brick, { solid: true }); K.hip(g, S, s * 30, 20.6, -36, 25, 39, 4, C.tile); }
    // peristyle
    porticus(S.sub(0, 4, 0, S.y + 0.6), { w: 64, d: 42, depth: 5, colH: 7, colR: 0.3, noRes: true, floor: false, wall: C.brick });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; K.box(g, S, Math.cos(a) * 6, 0.6, 4 + Math.sin(a) * 6, 4.6, 0.8, 1, C.marble, { ra: a + Math.PI / 2 }); }
    K.cyl(g, S, 0, 0.6, 4, 6.5, 6.5, 0.15, 8, C.water);
    // Cenatio Iovis (banqueting hall)
    K.box(g, S, 0, 0.6, 42, 32, 20, 26, C.brick, { solid: true }); K.gable(g, S, 0, 20.6, 42, 33, 27, 5, C.tile, { side: C.plaster });
    place('palace', 'The Palace of the Caesars', 'Domus Flavia', S.x, S.z, 60, 'landmark', { area: 'The Palatine', major: true, spawn: fw(FF, 125, 145) });
    placard('palace', ...fw(FF, 120, 150));
    W.spots.push({ kind: 'stand', x: S.wx(-6, -58), z: S.wz(-6, -58), y: S.y + 0.6, yaw: S.yaw + Math.PI, role: 'praetorian' });
    W.spots.push({ kind: 'stand', x: S.wx(6, -58), z: S.wz(6, -58), y: S.y + 0.6, yaw: S.yaw + Math.PI, role: 'praetorian' });
  }
  // Domus Augustana: the private palace, its curved front looking down on the Circus
  {
    const S = site(FF, 132, 312, FACE['+v']); const g = gbF('mon', S);
    const [lo] = groundRange(S, 0, 0, 90, 70);
    K.box(g, S, 0, lo - S.y, 6, 90, S.y - lo + 0.6, 58, C.brick, { solid: true });
    porticus(S.sub(0, 12, 0, S.y + 0.6), { w: 56, d: 30, depth: 4.5, colH: 6, colR: 0.28, noRes: true, floor: false, wall: C.brick });
    K.box(g, S, 0, 0.6, 12, 40, 0.3, 18, C.marble); K.box(g, S, 0, 0.9, 12, 38, 0.02, 16, C.water);
    K.box(g, S, 0, 0.9, 12, 8, 3, 6, C.marble);
    for (const s of [-1, 1]) { K.box(g, S, s * 36, 0.6, 6, 18, 16, 58, C.brick, { solid: true }); K.hip(g, S, s * 36, 16.6, 6, 19, 59, 3.4, C.tile); }
    K.box(g, S, 0, 0.6, 30, 90, 16, 6, C.brick, { solid: true }); K.box(g, S, 0, 16.6, 30, 91, 1, 7, C.tile2);
    // the great exedra facing the Circus, down the slope
    const E = S.sub(0, -30, 0, S.y);
    const [l2] = groundRange(E, 0, -10, 70, 20);
    K.ring(g, E, 0, l2 - E.y, 0, 26, 30, (E.y - l2) + 6, 20, C.brick, { solid: true, gaps: [[E.ang + 0.01, E.ang + Math.PI - 0.01]] });
    place('augustana', 'House of Augustus\' Successors', 'Domus Augustana', S.x, S.z, 45, 'landmark', { area: 'The Palatine', big: false });
  }
  // the Palatine "stadium": a sunken garden in the shape of a racecourse
  {
    const S = site(FF, 222, 282, 0); const g = gbF('mon', S);
    K.box(g, S, 0, -4, 0, 48, 0.4, 150, 0x7a8a50);
    for (const [u0, v0, u1, v1] of [[-24, -75, 24, -75], [-24, 75, 24, 75], [-24, -75, -24, 75], [24, -75, 24, 75]]) wall(g, S, u0, v0, u1, v1, -4, 14, 1.2, C.brick);
    for (const s of [-1, 1]) K.colonnade(g, S, s * 19, -70, s * 19, 70, 22, -3.6, 7, 0.3, 'i', C.marble);
    K.box(g, S, 24, -3.6, 0, 12, 18, 22, C.brick, { solid: true }); K.box(g, S, 24, 14.4, 0, 13, 1, 23, C.tile2);
    for (let i = 0; i < 14; i++) treeAt(S.wx((i % 2 ? 1 : -1) * 8, -60 + i * 9), S.wz((i % 2 ? 1 : -1) * 8, -60 + i * 9), i % 3 ? 'laurel' : 'plane', 0.9, S.y - 4);
    for (const v of [-60, 60]) { K.cyl(g, S, 0, -3.6, v, 6, 6, 0.6, 12, C.marble); }
    place('stadiumpal', 'The Palatine Stadium', 'Hippodromus Palatii', S.x, S.z, 40, 'landmark', { area: 'The Palatine', big: false });
    mapRect(S, 0, 0, 48, 150, '#8fa070');
  }
  // the Temple of Apollo that Augustus built beside his house, with the sun god's gilded chariot on its roof
  {
    const S = site(FF, 20, 300, FACE['+v']);
    temple(S, { w: 24, d: 40, podH: 4.5, cols: 6, peri: 9, back: false, colH: 12, order: 'c', stairW: 14, marble: C.marbleW, roof: C.tile, quadriga: true, gilt: true });
    porticus(site(FF, 20, 296), { w: 70, d: 64, depth: 5, colH: 7, sides: 'fkl', gaps: [{ side: 'f', w: 14 }], marble: 0x8a6a4a });
    place('apollo', 'Temple of Apollo Palatinus', 'Aedes Apollinis Palatini', S.x, S.z, 26, 'landmark', { area: 'The Palatine', big: false });
    placard('apollo', ...fw(FF, 22, 268));
  }
  // the Temple of the Great Mother (Cybele)
  { const S = site(FF, -58, 222, FACE['-u']); temple(S, { w: 18, d: 33, podH: 5, cols: 6, colH: 11, order: 'c', pron: 2, stairW: 12 }); }
  // the Hut of Romulus: a thatched hut kept as a relic of the founder
  {
    const S = site(FF, -46, 272, 0.4); const g = gbF('city', S);
    K.cyl(g, S, 0, 0, 0, 3.0, 3.0, 2.2, 10, 0x8a7356, { solid: true, top: false });
    K.cyl(g, S, 0, 2.2, 0, 3.6, 0.3, 3.4, 10, 0xb39a5e, { top: false });
    K.panel(g, S, 0, 0, -3.02, 1.1, 1.8, 0x2a1d14, -1);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; K.box(g, S, Math.cos(a) * 5, 0, Math.sin(a) * 5, 0.15, 1.1, 0.15, C.wood); }
    place('romulus', 'The Hut of Romulus', 'Casa Romuli', S.x, S.z, 12, 'landmark', { area: 'The Palatine', big: false });
    placard('romulus', S.wx(0, -7), S.wz(0, -7));
  }
  // Domus Tiberiana on the edge above the Forum, on tall arched substructures
  {
    const S = site(FF, 40, 140, FACE['-v']); const g = gbF('mon', S);
    const [lo] = groundRange(S, 0, -6, 120, 50);
    K.box(g, S, 0, lo - S.y, 4, 120, S.y - lo + 16, 50, C.brick, { solid: true });
    K.hip(g, S, 0, 16, 4, 121, 51, 3.4, C.tile);
    for (let i = 0; i < 14; i++) K.panel(g, S, -52 + i * 8, 6, -21.03, 3, 6, 0x2a2018, -1);
    const A = S.sub(0, -21.5, 0, S.y);
    if (S.y - lo > 9) for (let i = 0; i < 12; i++) { const u = -50 + i * 9.1; K.box(g, A, u, lo - S.y, 0, 2.4, S.y - lo - 1, 2, C.brick); if (i < 11) K.archTop(g, A, u + 4.55, 0, lo - S.y + (S.y - lo - 1) * 0.5, 3.35, -1, 2, C.brick, 6); }
    place('tiberiana', 'Domus Tiberiana', 'Domus Tiberiana', S.x, S.z, 40, 'landmark', { area: 'The Palatine', big: false });
  }
  // gardens and pines on the hill
  for (let i = 0; i < 40; i++) { const u = rnd(-90, 230), v = rnd(150, 350); const [x, z] = fw(FF, u, v); if (!reservedAt(x, z) || chance(0.15)) treeAt(x, z, rpick(['pine', 'cypress', 'laurel', 'pine'])); }
  // Clivus Palatinus up from the Arch of Titus
  fstreet(FF, [[188, 30], [178, 70], [164, 112], [146, 150], [125, 158], [90, 160], [40, 172], [0, 200], [-30, 240], [-40, 262]], { w: 5, side: 0, kind: 'street', zone: 'city', dens: 0.6, res: false });
  fpath(FF, [[125, 158], [150, 175], [190, 200], [222, 205], [222, 230]], { hw: 2.5, kind: 'path', zone: 'city', dens: 0.4 });
  // Scalae Caci down to the Circus valley
  fpath(FF, [[-40, 262], [-70, 300], [-110, 360], [-140, 405]], { hw: 2, kind: 'path', zone: 'city', dens: 0.4 });
}

// ======================= the Colosseum =======================
function buildArenas() {
  rseed('colosseum');
  const Cf = site(FF, 415, 0, 0);
  reserve(Cf, 0, 0, 200, 170, 6);
  const g = gbF('mon', Cf);
  const A0 = 94, B0 = 78;           // outer facade semi-axes
  const NB = 80;                    // bays
  const H = [10.5, 11.8, 11.6];     // storey heights (Tuscan, Ionic, Corinthian)
  const atticH = 12.2;
  const ell = (k, th) => [A0 * k * Math.cos(th), B0 * k * Math.sin(th)];
  const travC = 0xd9ccae, travD = 0xc4b693;
  const gates = [0, NB / 4, NB / 2, (3 * NB) / 4];
  for (let i = 0; i < NB; i++) {
    const t0 = (i / NB) * TAU, t1 = ((i + 1) / NB) * TAU;
    const [u0, v0] = ell(1, t0), [u1, v1] = ell(1, t1);
    const L = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(v1 - v0, u1 - u0);
    const B = Cf.sub((u0 + u1) / 2, (v0 + v1) / 2, a, Cf.y);
    let y = 0;
    for (let s = 0; s < 3; s++) {
      const h = H[s], pw = 2.3, r = (L - pw) / 2;
      K.box(g, B, -L / 2, y, 0, pw, h, 2.2, travC, { solid: s === 0, skip: 'b' });
      K.archTop(g, B, 0, 0, y + h * (s === 0 ? 0.66 : 0.62), r, y + h - 1.2, 2.2, travC, 6, travD);
      K.box(g, B, 0, y + h - 1.2, -0.3, L + 0.05, 1.2, 2.8, travD, { skip: 'b' });
      K.box(g, B, -L / 2, y, -1.35, 0.9, h - 1.2, 0.5, travC); // half-column
      y += h;
    }
    // attic: pilasters, small square windows, and corbels for the awning masts
    K.box(g, B, 0, y, 0, L + 0.05, atticH, 2.4, travC);
    K.box(g, B, -L / 2, y, -1.3, 0.8, atticH, 0.4, travC);
    if (i % 2) K.panel(g, B, 0, y + 4, -1.22, 1.4, 1.4, 0x2a2018, -1);
    K.box(g, B, 0, y + atticH, 0, L + 0.3, 0.8, 2.8, travD);
    K.box(g, B, -L / 2 + 1, y + atticH - 2.4, -1.5, 0.3, 4.4, 0.3, C.wood);
    // a dark vault wall behind the upper arches
    K.box(g, B.sub(0, 4.5, 0, B.y), 0, H[0], 0, L + 0.1, H[1] + H[2], 0.6, 0x7a6a52);
    // numbered entrances (the four axial gates were for the emperor, the magistrates and the procession)
    if (i % 4 === 1 && !gates.includes(i)) decal(B, 0, H[0] - 1.6, -1.15, 1.6, 0.7, [String(romanNumeral(i + 1))], { pw: 128, ph: 56, bg: '#d9ccae', ink: '#5a4a38', size: 0.9 });
  }
  // inner ambulatory: a ring of piers and the ceiling slab
  for (let i = 0; i < NB; i++) {
    const t = (i / NB) * TAU; const [u, v] = ell(0.93, t);
    K.box(g, Cf, u, 0, v, 2, H[0], 2, 0xcfc2a2, { solid: true, ra: t });
  }
  // ceiling over the outer ambulatory
  {
    const gb = g;
    for (let i = 0; i < NB; i++) {
      const t0 = (i / NB) * TAU, t1 = ((i + 1) / NB) * TAU;
      const P = (k, t) => { const [u, v] = ell(k, t); return [Cf.wx(u, v), Cf.y + H[0] - 0.2, Cf.wz(u, v)]; };
      gb.quad(P(0.99, t0), P(0.99, t1), P(0.85, t1), P(0.85, t0), 0xa89a7c, [Cf.x, Cf.y + 100, Cf.z], -1);
    }
  }
  // the cavea: stepped seating, four ranks separated by walkways
  const AA = 42, AB = 26; // arena semi-axes
  const podiumH = 4;
  const ranks = 26;
  for (let k = 0; k < ranks; k++) {
    const f0 = k / ranks, f1 = (k + 1) / ranks;
    const y0 = podiumH + 0.6 + f0 * 33, y1 = podiumH + 0.6 + f1 * 33;
    const col = k < 4 ? 0xe9e2d2 : k < 12 ? 0xd9cfb8 : k < 20 ? 0xcbbf9f : 0x9a8a70;
    const P = (f, t, y) => { const u = lerp(AA * 1.16, A0 * 0.86, f) * Math.cos(t), v = lerp(AB * 1.16, B0 * 0.86, f) * Math.sin(t); return [Cf.wx(u, v), Cf.y + y, Cf.wz(u, v)]; };
    for (let i = 0; i < NB; i++) {
      const t0 = (i / NB) * TAU, t1 = ((i + 1) / NB) * TAU;
      const vom = (k % 7 === 3) && (i % 5 === 2);
      g.quad(P(f0, t0, y1), P(f0, t1, y1), P(f1, t1, y1), P(f1, t0, y1), vom ? 0x3a3026 : shadeHex(col, (i + k) % 2 ? 1 : 0.96), [Cf.x, Cf.y - 50, Cf.z]);
      g.quad(P(f0, t0, y0), P(f0, t1, y0), P(f0, t1, y1), P(f0, t0, y1), shadeHex(col, 0.8), [Cf.x, Cf.y + y1, Cf.z], -1);
    }
    if (k % 3 === 1) for (let i = 0; i < NB; i += 2) { const t = (i + Math.random()) / NB * TAU; const p = P((f0 + f1) / 2, t, y1); W.seatPts.push({ x: p[0], y: p[1], z: p[2], yaw: Math.atan2(Cf.x - p[0], Cf.z - p[2]), arena: true }); }
  }
  // the cavea mass as solids (so you can't climb into the seats from the arena), leaving the four gates
  for (let i = 0; i < NB; i++) {
    if (gates.some((gI) => Math.abs(((i - gI + NB + NB / 2) % NB) - NB / 2) <= 1)) continue;
    const t = ((i + 0.5) / NB) * TAU, [u0, v0] = ell(0.5, t), [u1, v1] = ell(0.86, t);
    K.box(g, Cf, (u0 + u1) / 2, -1, (v0 + v1) / 2, Math.hypot(u1 - u0, v1 - v0), 0.01, 7.2, 0x8a7a60, { ra: Math.atan2(v1 - v0, u1 - u0), solid: false });
    solidBox(Cf, (u0 + u1) / 2, (v0 + v1) / 2, Math.hypot(u1 - u0, v1 - v0), 7.4, 0, 40, Math.atan2(v1 - v0, u1 - u0), true);
  }
  // gate passages: walls lining the four axial tunnels and their vaults
  for (const gI of gates) {
    const t = (gI / NB) * TAU, [u0, v0] = ell(0.47, t), [u1, v1] = ell(0.92, t);
    const L = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(v1 - v0, u1 - u0);
    const P = Cf.sub((u0 + u1) / 2, (v0 + v1) / 2, a, Cf.y);
    for (const s of [-1, 1]) K.box(g, P, 0, 0, s * 3.2, L, 7, 0.8, 0xbfb196, { solid: true });
    K.box(g, P, 0, 7, 0, L, 0.8, 7.2, 0xa89a7c, { skip: '' });
  }
  // podium wall round the arena, with the marble balustrade and the imperial box
  for (let i = 0; i < NB; i++) {
    if (gates.some((gI) => i === gI || i === (gI - 1 + NB) % NB)) continue;
    const t0 = (i / NB) * TAU, t1 = ((i + 1) / NB) * TAU;
    const P = (t) => [AA * 1.1 * Math.cos(t), AB * 1.1 * Math.sin(t)];
    const [u0, v0] = P(t0), [u1, v1] = P(t1);
    wall(g, Cf, u0, v0, u1, v1, 0, podiumH, 1.2, 0xe2d9c6, { top: C.marble });
    const [w0, x0] = [lerp(u0, u0 * 1.08, 1), lerp(v0, v0 * 1.08, 1)], [w1, x1] = [u1 * 1.08, v1 * 1.08];
    K.box(g, Cf, (w0 + w1) / 2, podiumH, (x0 + x1) / 2, Math.hypot(w1 - w0, x1 - x0) + 0.1, 0.6, 3.6, 0xb8ac90, { ra: Math.atan2(x1 - x0, w1 - w0) });
    wall(g, Cf, u0, v0, u1, v1, podiumH, 1.1, 0.35, C.marble, { solid: false });
  }
  { const B = Cf.sub(0, -AB * 1.16, 0, Cf.y); K.box(g, B, 0, podiumH, 0, 14, 4, 4, C.marble); K.box(g, B, 0, podiumH + 4, 0, 15, 0.5, 5, C.pomp); }
  // arena floor: sand over the timber floor above the hypogeum
  {
    const gb = g, ref = [Cf.x, Cf.y - 10, Cf.z], j0 = g.jit; g.jit = 0.008;
    for (let i = 0; i < NB; i++) {
      const t0 = (i / NB) * TAU, t1 = ((i + 1) / NB) * TAU;
      const P = (s, t) => [Cf.wx(AA * 1.1 * s * Math.cos(t), AB * 1.1 * s * Math.sin(t)), Cf.y + 0.08, Cf.wz(AA * 1.1 * s * Math.cos(t), AB * 1.1 * s * Math.sin(t))];
      gb.triR([Cf.x, Cf.y + 0.08, Cf.z], P(1, t0), P(1, t1), 0xd6c08e, ref);
    }
    g.jit = j0;
    for (let i = 0; i < 6; i++) K.box(gb, Cf, -25 + i * 10, 0.08, 0, 1.6, 0.02, 1.6, 0x8a7a58);
  }
  // the top colonnade and the awning masts
  for (let i = 0; i < NB; i += 2) { const t = (i / NB) * TAU, [u, v] = ell(0.9, t); K.column(g, Cf, u, 36.5, v, 7, 0.32, 'c', 0xbfb6a0, { solid: false, seg: 6 }); }
  for (let i = 0; i < NB; i++) { const t = ((i + 0.5) / NB) * TAU, [u, v] = ell(1.003, t); K.box(g, Cf, u, H[0] + H[1] + H[2] + atticH, v, 0.3, 9, 0.3, C.wood); }
  mapCircle(Cf.x, Cf.z, 86, '#dcd0b6');
  place('colosseum', 'The Flavian Amphitheatre', 'Amphitheatrum Flavium', Cf.x, Cf.z, 110, 'landmark', { area: 'The Colosseum valley', major: true, far: 2400, spawn: fw(FF, 300, 30), spawnYaw: -90 * D2R + 30 * D2R });
  placard('colosseum', ...fw(FF, 312, 18));
  placard('arena', Cf.wx(0, -10), Cf.wz(0, -10));
  W.colosseum = { F: Cf, AA, AB };
  // a few workers raking the sand and the awning sailors from Misenum on the top
  W.spots.push({ kind: 'work', x: Cf.wx(-10, 6), z: Cf.wz(-10, 6), yaw: 1, role: 'arenaslave' });
  W.spots.push({ kind: 'work', x: Cf.wx(14, -8), z: Cf.wz(14, -8), yaw: 2, role: 'arenaslave' });
  W.spots.push({ kind: 'stand', x: Cf.wx(-AA * 1.2, 0), z: Cf.wz(-AA * 1.2, 0), y: Cf.y + 0.1, yaw: Cf.yaw + Math.PI / 2, role: 'arenaguard' });
  // paved square round the amphitheatre
  {
    const gb = gbF('city', Cf);
    for (let i = 0; i < 64; i++) {
      const t0 = (i / 64) * TAU, t1 = ((i + 1) / 64) * TAU;
      const P = (k, t) => { const u = A0 * k * Math.cos(t), v = B0 * k * Math.sin(t); return [Cf.wx(u, v), groundAt(Cf.wx(u, v), Cf.wz(u, v)) + 0.07, Cf.wz(u, v)]; };
      _upQuad(gb, P(1.0, t0), P(1.0, t1), P(1.22, t1), P(1.22, t0), (i % 2) ? C.trav : 0xd0c4a6);
    }
    // ring of stone bollards
    for (let i = 0; i < 40; i++) { const t = (i / 40) * TAU; K.box(gb, Cf, A0 * 1.2 * Math.cos(t), 0, B0 * 1.2 * Math.sin(t), 0.6, 1.8, 0.6, C.trav, { solid: true }); }
    // people circulate round it and through the gates
    const ring = []; for (let i = 0; i <= 24; i++) { const t = (i / 24) * TAU; ring.push([Cf.wx(A0 * 1.11 * Math.cos(t), B0 * 1.11 * Math.sin(t)), Cf.wz(A0 * 1.11 * Math.cos(t), B0 * 1.11 * Math.sin(t))]); }
    addPath(ring, { hw: 4, kind: 'plaza', zone: 'forum', dens: 1.1 });
    for (const gI of [0, NB / 2]) { const t = (gI / NB) * TAU; addPath([[Cf.wx(A0 * 1.11 * Math.cos(t), B0 * 1.11 * Math.sin(t)), Cf.wz(A0 * 1.11 * Math.cos(t), B0 * 1.11 * Math.sin(t))], [Cf.wx(AA * 0.6 * Math.cos(t), AB * 0.6 * Math.sin(t)), Cf.wz(AA * 0.6 * Math.cos(t), AB * 0.6 * Math.sin(t))]], { hw: 2, kind: 'plaza', zone: 'forum', dens: 0.2 }); }
  }
  buildVenusRoma();
  buildLudus();
  buildCircus();
  buildBathsTrajan();
  buildClaudium();
}
function romanNumeral(n) {
  const m = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = '';
  for (const [v, t] of m) while (n >= v) { s += t; n -= v; }
  return s;
}

// the Ludus Magnus: the gladiators' training school with its own small arena
function buildLudus() {
  rseed('ludus');
  const S = site(FF, 560, 34, 0); const g = gbF('mon', S);
  reserve(S, 0, 0, 104, 80, 4);
  porticus(S, { w: 100, d: 76, depth: 6, colH: 6.5, colR: 0.32, order: 'd', wall: C.brick, gaps: [{ side: 'l', w: 8 }, { side: 'f', w: 8 }], noRes: true });
  for (const [u0, v0, u1, v1] of [[-50, -38, 50, -38], [-50, 38, 50, 38]]) wall(g, S, u0, v0, u1, v1, 7.9, 6, 1, C.brick, { solid: false });
  // the practice arena and its seats
  const a = 30, b = 20;
  for (let i = 0; i < 36; i++) {
    const t0 = (i / 36) * TAU, t1 = ((i + 1) / 36) * TAU;
    const P = (k, t, y) => [S.wx(a * k * Math.cos(t), b * k * Math.sin(t)), S.y + y, S.wz(a * k * Math.cos(t), b * k * Math.sin(t))];
    if (i % 9 !== 0) for (let r = 0; r < 4; r++) {
      const k0 = 1 + r * 0.08, k1 = k0 + 0.08, y = 1.2 + r * 0.6;
      g.quad(P(k0, t0, y), P(k0, t1, y), P(k1, t1, y), P(k1, t0, y), 0xcfc3a6, [S.x, S.y - 10, S.z]);
      g.quad(P(k0, t0, y - 0.6), P(k0, t1, y - 0.6), P(k0, t1, y), P(k0, t0, y), 0xb5a98c, [S.x, S.y + y, S.z], -1);
      g.quad(P(k1, t0, y), P(k1, t1, y), P(k1, t1, y - 0.6 - 1.2), P(k1, t0, y - 0.6 - 1.2), 0xb5a98c, [S.x, S.y + y, S.z]);
    }
    if (i % 9 !== 0) { const [u0, v0] = [a * Math.cos(t0), b * Math.sin(t0)], [u1, v1] = [a * Math.cos(t1), b * Math.sin(t1)]; wall(g, S, u0, v0, u1, v1, 0, 1.2, 0.5, C.plaster); }
    g.triR([S.x, S.y + 0.06, S.z], P(1, t0, 0.06), P(1, t1, 0.06), 0xd2bd8c, [S.x, S.y - 5, S.z]);
  }
  K.box(g, S, -16, 0, 0, 0.3, 1.9, 0.3, C.wood, { solid: true }); K.box(g, S, 16, 0, 0, 0.3, 1.9, 0.3, C.wood, { solid: true }); // the palus, the training post
  for (const [u, v, y] of [[-5, -1, 0], [5, 1, Math.PI]]) W.spots.push({ kind: 'spar', x: S.wx(u, v), z: S.wz(u, v), yaw: S.yaw + Math.PI / 2 + y, role: 'gladiator' });
  for (const [u, v, y] of [[-6, -9, 0], [-1, -10, Math.PI]]) W.spots.push({ kind: 'spar', x: S.wx(u, v), z: S.wz(u, v), yaw: S.yaw + Math.PI / 2 + y, role: 'gladiator' });
  W.spots.push({ kind: 'stand', x: S.wx(0, 14), z: S.wz(0, 14), yaw: S.yaw + Math.PI, role: 'lanista' });
  W.spots.push({ kind: 'work', x: S.wx(-13, 3), z: S.wz(-13, 3), yaw: S.yaw - Math.PI / 2, role: 'gladiator' });
  addPath([fw(S, -54, 0), fw(S, -44, 0), fw(S, -34, 0), fw(S, -28, 6)], { hw: 2, kind: 'plaza', zone: 'city', dens: 0.3 });
  place('ludus', 'The Great Gladiator School', 'Ludus Magnus', S.x, S.z, 40, 'landmark', { area: 'The Colosseum valley' });
  placard('ludus', S.wx(-40, 0), S.wz(-40, 0));
  mapRect(S, 0, 0, 100, 76, '#c9a888');
}

// ======================= the Circus Maximus =======================
function buildCircus() {
  rseed('circus');
  const S = site(FF, 110, 480, 0), g = gbF('mon', S);
  reserve(S, 0, 0, 580, 140, 4);
  const U0 = -268, U1 = 262, Rend = 41, cu = U1 - Rend; // the straight starting end at U0; the round end centred at cu
  const VA = 41, VO = 66; // arena half-width, outer facade
  const facadeH = 28;
  // sand
  const j0 = g.jit; g.jit = 0.008;
  for (let i = 0; i < 24; i++) { const u0 = lerp(U0, cu, i / 24), u1 = lerp(U0, cu, (i + 1) / 24); _upQuad(g, [S.wx(u0, -VA), S.y + 0.05, S.wz(u0, -VA)], [S.wx(u1, -VA), S.y + 0.05, S.wz(u1, -VA)], [S.wx(u1, VA), S.y + 0.05, S.wz(u1, VA)], [S.wx(u0, VA), S.y + 0.05, S.wz(u0, VA)], 0xcdb98a); }
  for (let i = 0; i < 16; i++) { const t0 = -Math.PI / 2 + (i / 16) * Math.PI, t1 = -Math.PI / 2 + ((i + 1) / 16) * Math.PI; _upQuad(g, [S.wx(cu, 0), S.y + 0.05, S.wz(cu, 0)], [S.wx(cu + Math.cos(t0) * VA, Math.sin(t0) * VA), S.y + 0.05, S.wz(cu + Math.cos(t0) * VA, Math.sin(t0) * VA)], [S.wx(cu + Math.cos(t1) * VA, Math.sin(t1) * VA), S.y + 0.05, S.wz(cu + Math.cos(t1) * VA, Math.sin(t1) * VA)], [S.wx(cu, 0), S.y + 0.05, S.wz(cu, 0)], 0xcdb98a); }
  g.jit = j0;
  // seating along a path: straight sides plus the curved end. f(t) gives (u, v, outward nu, nv) at distance t.
  const ranks = 14, rise = (facadeH - 6) / ranks, dep = (VO - VA - 2) / ranks;
  const band = (P0, P1, n0x, n0z) => { // P0, P1: local points on the arena edge; n: outward normal (local)
    for (let k = 0; k < ranks; k++) {
      const y0 = 3 + k * rise, y1 = y0 + rise, d0 = 1 + k * dep, d1 = d0 + dep;
      const Q = (P, d, y) => [S.wx(P[0] + n0x * d, P[1] + n0z * d), S.y + y, S.wz(P[0] + n0x * d, P[1] + n0z * d)];
      const col = k < 3 ? 0xe6dfcf : k < 9 ? 0xd2c7ad : 0xa49274;
      g.quad(Q(P0, d0, y1), Q(P1, d0, y1), Q(P1, d1, y1), Q(P0, d1, y1), col, [S.x, S.y - 100, S.z]);
      g.quad(Q(P0, d0, y0), Q(P1, d0, y0), Q(P1, d0, y1), Q(P0, d0, y1), shadeHex(col, 0.78), [S.wx(P0[0] - n0x * 50, P0[1] - n0z * 50), S.y + y1, S.wz(P0[0] - n0x * 50, P0[1] - n0z * 50)], -1); // riser, facing the track
      if (k % 2 === 0) for (let q = 0; q < 9; q++) {
        const t = Math.random();
        const pu = lerp(P0[0], P1[0], t) + n0x * (d0 + dep * 0.5), pv = lerp(P0[1], P1[1], t) + n0z * (d0 + dep * 0.5);
        W.seatPts.push({ x: S.wx(pu, pv), y: S.y + y1, z: S.wz(pu, pv), yaw: S.yawOf(-n0x, -n0z), circus: true });
      }
    }
    // the outer wall behind the top rank
    const T0 = [P0[0] + n0x * (VO - VA), P0[1] + n0z * (VO - VA)], T1 = [P1[0] + n0x * (VO - VA), P1[1] + n0z * (VO - VA)];
    wall(g, S, T0[0], T0[1], T1[0], T1[1], 0, facadeH + 2, 1.2, C.trav2, { ext: 0.6 });
    // the solid mass under the seats
    const M0 = [P0[0] + n0x * (VO - VA) / 2, P0[1] + n0z * (VO - VA) / 2], M1 = [P1[0] + n0x * (VO - VA) / 2, P1[1] + n0z * (VO - VA) / 2];
    solidBox(S, (M0[0] + M1[0]) / 2, (M0[1] + M1[1]) / 2, Math.hypot(M1[0] - M0[0], M1[1] - M0[1]) + 0.4, VO - VA, 0, 30, Math.atan2(M1[1] - M0[1], M1[0] - M0[0]), true);
  };
  const NS = 22;
  for (const s of [-1, 1]) for (let i = 0; i < NS; i++) { const u0 = lerp(U0 + 8, cu, i / NS), u1 = lerp(U0 + 8, cu, (i + 1) / NS); band([u0, s * VA], [u1, s * VA], 0, s); }
  for (let i = 0; i < 12; i++) { const t0 = -Math.PI / 2 + (i / 12) * Math.PI, t1 = -Math.PI / 2 + ((i + 1) / 12) * Math.PI; const n = (t0 + t1) / 2; band([cu + Math.cos(t0) * VA, Math.sin(t0) * VA], [cu + Math.cos(t1) * VA, Math.sin(t1) * VA], Math.cos(n), Math.sin(n)); }
  // podium wall round the track
  for (const s of [-1, 1]) wall(g, S, U0 + 8, s * VA, cu, s * VA, 0, 3, 0.8, C.marble, { top: C.marble });
  for (let i = 0; i < 12; i++) { const t0 = -Math.PI / 2 + (i / 12) * Math.PI, t1 = -Math.PI / 2 + ((i + 1) / 12) * Math.PI; wall(g, S, cu + Math.cos(t0) * VA, Math.sin(t0) * VA, cu + Math.cos(t1) * VA, Math.sin(t1) * VA, 0, 3, 0.8, C.marble); }
  // outer facade: arcades with shops on the ground floor (two storeys and an attic), along both sides
  for (const s of [-1, 1]) {
    const F2 = S.sub(0, s * (VO + 0.6), s > 0 ? Math.PI : 0, S.y);
    const L = cu - U0 - 8;
    K.arcade(g, F2.sub(s > 0 ? -(U0 + 8 + cu) / 2 : (U0 + 8 + cu) / 2, 0, 0, S.y), -L / 2, L / 2, 0, 0, 44, 1.8, 6.5, 10, 1.4, C.trav, { halfCol: C.trav2, solid: true });
    K.arcade(g, F2.sub(s > 0 ? -(U0 + 8 + cu) / 2 : (U0 + 8 + cu) / 2, 0, 0, S.y), -L / 2, L / 2, 0, 10, 44, 1.8, 15.8, 19, 1.2, C.trav, { halfCol: C.trav2, solid: false });
    K.box(g, F2, s > 0 ? -(U0 + 8 + cu) / 2 : (U0 + 8 + cu) / 2, 19, 0.6, L, 11, 1, C.trav2);
  }
  // the starting gates (carceres): twelve stalls between two towers
  {
    const Cg = S.sub(U0 + 4, 0, Math.PI / 2, S.y);
    for (let i = 0; i <= 12; i++) { const u = -VA + (i / 12) * VA * 2; K.box(g, Cg, u, 0, 0, 1.6, 7, 4, C.marble2, { solid: true }); }
    K.box(g, Cg, 0, 7, 0, VA * 2 + 2, 3, 4.4, C.marble2);
    for (let i = 0; i < 12; i++) K.box(g, Cg, -VA + (i + 0.5) / 12 * VA * 2, 0, -1.4, 5, 5.5, 0.15, 0x6a4a2a);
    for (const s of [-1, 1]) { K.box(g, Cg, s * (VA + 6), 0, 2, 12, 18, 12, C.trav2, { solid: true }); K.hip(g, Cg, s * (VA + 6), 18, 2, 13, 13, 3, C.tile); }
    K.box(g, Cg, 0, 10, 2, 16, 4, 6, C.marble); K.box(g, Cg, 0, 14, 2, 17, 0.6, 7, C.pomp);
  }
  // the triumphal arch of Titus in the round end
  { const A = S.sub(U1 + 0.5, 0, Math.PI / 2, S.y); triArch(A, { w: 22, d: 6, h: 18, pw: 6.5, ph: 11, attic: 5, three: true, spw: 3.6, sph: 7, quadriga: true }); }
  // the spina: the central barrier with its water basins, the obelisk of Augustus, the turning posts and the lap counters
  const SL = 172;
  K.box(g, S, 0, 0, 0, SL * 2, 1.4, 8, C.marble2, { solid: true });
  K.box(g, S, 0, 1.4, 0, SL * 2 - 4, 0.02, 6, C.water);
  for (const s of [-1, 1]) {
    const M = S.sub(s * (SL + 6), 0, 0, S.y);
    K.cyl(g, M, 0, 0, 0, 4.2, 4.2, 1.6, 12, C.marble, { solid: true });
    for (const d of [-2.2, 0, 2.2]) K.cyl(g, M, 0, 1.6, d, 0.9, 0.2, 6, 8, C.gilt);
  }
  obelisk(g, S, 0, 0, 24, { col: 0xb8705a });
  for (const [u, kind] of [[-110, 'eggs'], [110, 'dolphins']]) {
    const P = S.sub(u, 0, 0, S.y + 1.4);
    for (const s of [-1, 1]) K.column(g, P, s * 3, 0, 0, 5, 0.25, 'd', C.marble, { solid: false });
    K.box(g, P, 0, 5, 0, 7, 0.4, 1, C.marble);
    for (let i = 0; i < 7; i++) {
      if (kind === 'eggs') K.cyl(g, P, -2.7 + i * 0.9, 5.4, 0, 0.25, 0.18, 0.6, 6, C.gilt);
      else K.box(g, P, -2.7 + i * 0.9, 5.4, 0, 0.2, 0.3, 0.8, C.bronze);
    }
  }
  for (const u of [-150, -70, 40, 70, 140]) { const P = S.sub(u, 0, 0, S.y + 1.4); K.box(g, P, 0, 0, 0, 3, 2.5, 3, C.marble); K.statue(g, P, 0, 2.5, 0, C.bronze, 'god', 0, 0.8); }
  // the imperial box on the Palatine side
  { const P = S.sub(30, -VO + 2, 0, S.y); temple(P.sub(0, 0, Math.PI, P.y), { w: 18, d: 10, podH: 8, cols: 4, colH: 7, order: 'c', pron: 1, stairs: 'none', noRes: true }); }
  W.circus = { F: S, SL, R: 19, lanes: [14, 18, 22, 26], VA };
  place('circus', 'The Circus Maximus', 'Circus Maximus', S.x, S.z, 150, 'landmark', { area: 'The Circus', major: true, far: 2000, spawn: fw(S, -60, -10), spawnYaw: S.yaw - Math.PI / 2 });
  placard('circus', S.wx(-40, -VA + 3), S.wz(-40, -VA + 3));
  placard('spina', S.wx(10, 6.5), S.wz(10, 6.5));
  mapRect(S, (U0 + U1) / 2, 0, U1 - U0, VO * 2, '#d7c7a2');
  // ways in: through the starting gates and round the outside
  addPath([fw(S, U0 - 20, 0), fw(S, U0 + 2, 0), fw(S, U0 + 30, 20), fw(S, -60, 22), fw(S, 100, 22)], { hw: 4, kind: 'plaza', zone: 'city', dens: 0.25 });
  for (const s of [-1, 1]) fstreet(S, [[U0 - 10, s * (VO + 5)], [-120, s * (VO + 5)], [20, s * (VO + 5)], [160, s * (VO + 5)], [cu, s * (VO + 5)]], { w: 6, side: 1.6, kind: 'road', cart: true, zone: 'city', dens: 1.1 });
  fstreet(S, [[cu, VO + 5], [U1 + 14, 40], [U1 + 20, 0], [U1 + 14, -40], [cu, -VO - 5]], { w: 6, side: 1.4, kind: 'road', cart: true, zone: 'city' });
  fstreet(S, [[U0 - 10, -VO - 5], [U0 - 14, 0], [U0 - 10, VO + 5]], { w: 6, side: 1.4, kind: 'road', cart: true, zone: 'city' });
  // shopkeepers in the arcades (cookshops, fortune tellers and worse: the Circus had a reputation)
  for (let i = 0; i < 6; i++) W.spots.push({ kind: 'shop', x: S.wx(-200 + i * 70, VO + 2.5), z: S.wz(-200 + i * 70, VO + 2.5), yaw: S.yaw, role: rpick(['cook', 'fortune', 'vendor']) });
}

// ======================= the Baths of Trajan on the Oppian =======================
function buildBathsTrajan() {
  rseed('trajanbaths');
  const S = site(FF, 470, -248, FACE['+v']); const g = gbF('mon', S);
  reserve(S, 0, 0, 236, 216, 4);
  // the enclosure with exedrae and gardens
  porticus(S, { w: 230, d: 210, depth: 6, colH: 7, wall: C.brick, gaps: [{ side: 'f', w: 16 }, { side: 'k', w: 16 }], noRes: true, floor: false });
  for (const s of [-1, 1]) { const E = S.sub(s * 115, 0, s * Math.PI / 2, S.y); K.ring(g, E, 0, 0, 0, 30, 32, 14, 20, C.brick, { gaps: [[E.ang + 0.01, E.ang + Math.PI - 0.01]] }); }
  for (let i = 0; i < 30; i++) { const u = rnd(-100, 100), v = rnd(-95, 95); if (Math.abs(u) < 80 && Math.abs(v) < 52) continue; treeAt(S.wx(u, v), S.wz(u, v), rpick(['plane', 'laurel', 'cypress'])); }
  // the bath block: frigidarium hall, tepidarium, the caldarium facing the afternoon sun, palaestrae, a swimming pool
  const by = 0;
  const [lo] = groundRange(S, 0, 0, 170, 100);
  K.box(g, S, 0, lo - S.y, 0, 172, S.y - lo + 0.8, 102, C.brick, { solid: true });
  K.box(g, S, 0, 0.8, -26, 150, 18, 34, C.brick, { solid: true }); K.box(g, S, 0, 18.8, -26, 151, 1, 35, C.tile2); // natatio wing
  K.box(g, S, 0, 0.8, -26, 120, 0.02, 30.2, C.water);
  K.box(g, S, 0, 0.8, 4, 60, 34, 34, C.brick, { solid: true }); // frigidarium, cross-vaulted
  for (const s of [-1, 1]) K.gable(g, S, 0, 34.8, 4, 61, 35, 7, C.tile, { alongV: s > 0, side: C.brick });
  for (const u of [-20, 0, 20]) K.panel(g, S, u, 22, -13.03, 8, 9, 0x2a2018, -1);
  K.box(g, S, 0, 0.8, 32, 34, 22, 22, C.brick, { solid: true }); // tepidarium
  K.dome(g, S.sub(0, 32, 0, S.y + 22.8), 0, 0, 0, 13, 16, 5, C.brick);
  // caldarium with its apse and dome
  K.cyl(g, S.sub(0, 50, 0, S.y), 0, 0.8, 0, 20, 20, 24, 20, C.brick, { solid: true });
  K.dome(g, S.sub(0, 50, 0, S.y + 24.8), 0, 0, 0, 20, 20, 6, C.brick);
  for (let i = 0; i < 10; i++) { const a = Math.PI * 0.15 + (i / 9) * Math.PI * 0.7; K.panel(g, S.sub(Math.cos(a) * 20.1, 50 + Math.sin(a) * 20.1, a + Math.PI / 2, S.y), 0, 8, 0, 3.6, 7, 0x2a2018, 1); }
  for (const s of [-1, 1]) {
    K.box(g, S, s * 60, 0.8, 16, 48, 12, 56, C.brick, { solid: true }); K.hip(g, S, s * 60, 12.8, 16, 49, 57, 3, C.tile);
    K.cyl(g, S.sub(s * 72, 34, 0, S.y), 0, 0.8, 0, 9, 9, 15, 14, C.brick, { solid: true }); K.dome(g, S.sub(s * 72, 34, 0, S.y + 15.8), 0, 0, 0, 9, 12, 4, C.brick);
  }
  place('bathstrajan', 'The Baths of Trajan', 'Thermae Traiani', S.x, S.z, 110, 'landmark', { area: 'The Oppian', spawn: fw(S, 0, -100), spawnYaw: S.yaw + Math.PI });
  placard('bathstrajan', S.wx(0, -109), S.wz(0, -109));
  mapRect(S, 0, 0, 230, 210, '#cdb594'); mapRect(S, 0, 0, 170, 100, '#b08868');
  fstreet(S, [[0, -150], [0, -112], [0, -60]], { w: 6, side: 1.4, kind: 'street', zone: 'city', dens: 1.2 });
  navGrid(S, -90, 90, -95, -60, 4, 1, { zone: 'city', dens: 0.6 });
  // a line of bathers by the door, and attendants
  W.spots.push({ kind: 'stand', x: S.wx(-6, -58), z: S.wz(-6, -58), y: S.y + 0.8, yaw: S.yaw + Math.PI, role: 'bathattendant' });
  W.spots.push({ kind: 'shop', x: S.wx(20, -70), z: S.wz(20, -70), yaw: S.yaw + Math.PI, role: 'oilseller' });
}

// ======================= Temple of the Deified Claudius on the Caelian =======================
function buildClaudium() {
  rseed('claudium');
  const S = site(FF, 545, 240, FACE['-u']); const g = gbF('mon', S);
  reserve(S, 0, 0, 180, 200, 4);
  const [lo] = groundRange(S, 0, 0, 175, 195);
  K.box(g, S, 0, lo - S.y, 0, 176, S.y - lo + 0.5, 196, C.brick, { solid: true, top: 0x7f8f4c });
  // the nymphaeum wall toward the Colosseum
  const N = S.sub(0, -98, 0, S.y);
  for (let i = 0; i < 16; i++) { const u = -84 + i * 11.2; K.box(g, N, u, lo - S.y, 0, 3, S.y - lo + 0.5, 2.4, C.brick); if (i < 15) K.archTop(g, N, u + 5.6, 0, lo - S.y + (S.y - lo) * 0.5, 4.1, 0.5, 2.4, C.brick, 6); }
  porticus(S.sub(0, 0, 0, S.y + 0.5), { w: 170, d: 190, depth: 6, colH: 7, noRes: true, floor: false, wall: C.brick, gaps: [{ side: 'f', w: 12 }] });
  temple(S.sub(0, 20, 0, S.y + 0.5), { w: 26, d: 40, podH: 4, cols: 6, colH: 12, order: 'c', pron: 3, stairW: 16, noRes: true });
  for (let i = 0; i < 50; i++) { const u = rnd(-75, 75), v = rnd(-85, 85); if (Math.abs(u) < 20 && v > -10 && v < 50) continue; treeAt(S.wx(u, v), S.wz(u, v), rpick(['plane', 'laurel', 'pine', 'cypress']), 1, S.y + 0.5); }
  place('claudium', 'Temple of the Deified Claudius', 'Templum Divi Claudii', S.x, S.z, 90, 'landmark', { area: 'The Caelian', big: false });
  mapRect(S, 0, 0, 176, 196, '#a6b088');
}
