// Roma Aeterna — the imperial fora, the Campus Martius, the river front (Tiber Island, the bridges, the cattle market),
// Porta Capena and the aqueducts.

function buildFora() {
  rseed('fora');
  // ---- Forum of Caesar, with the Temple of Venus Genetrix, mother of the Julian family ----
  {
    const F = site(FF, -88, -81, 0);
    pavement(F, 0, 0, 64, 38, C.trav, { layer: 'mon' });
    porticus(F, { w: 64, d: 38, depth: 5.5, colH: 7, sides: 'fk', noRes: false });
    temple(site(FF, -108, -81, FACE['+u']), { w: 22, d: 30, podH: 5, cols: 8, peri: 8, back: false, colH: 13, order: 'c', stairs: 'none', marble: C.marbleW, noRes: true });
    const S = site(FF, -78, -81); K.statue(gbF('mon', S), S, 0, 0, 0, C.bronze, 'horse', FACE['-u'], 1.3);
    fountain(FF, -96, -70, { r: 1.6, a: FACE['+u'] });
    place('caesar', 'The Forum of Caesar', 'Forum Iulium', F.x, F.z, 30, 'landmark', { area: 'The Imperial Fora' });
    placard('caesar', ...fw(FF, -70, -76));
    navGrid(FF, -84, -60, -92, -70, 2, 2, { zone: 'forum' });
    fpath(FF, [[-60, -81], [-49, -81]], { hw: 3, kind: 'plaza', zone: 'forum' });
  }
  // ---- Forum of Nerva: the narrow "passage forum" built over the Argiletum ----
  {
    const F = site(FF, -41, -116, 0); const g = gbF('mon', F);
    reserve(F, 0, 0, 22, 110, 1);
    pavement(F, 0, 4, 20, 100, C.trav, { layer: 'mon' });
    for (const s of [-1, 1]) {
      wall(g, F, s * 11, -55, s * 11, 55, 0, 16, 1.2, C.peperino);
      for (let i = 0; i < 13; i++) { const v = -48 + i * 8; K.column(g, F, s * 9.6, 0, v, 11, 0.45, 'c', C.marble); K.box(g, F, s * 10.2, 11, v, 2.4, 3.4, 2.4, C.marble); }
      K.box(g, F, s * 10.2, 11, 0, 1.6, 3.2, 104, C.marble);
    }
    temple(site(FF, -41, -156, FACE['+v']), { w: 16, d: 24, podH: 3.6, cols: 6, colH: 12, order: 'c', pron: 3, stairW: 10, noRes: true });
    place('nerva', 'The Forum of Nerva', 'Forum Transitorium', F.x, F.z, 26, 'landmark', { area: 'The Imperial Fora', big: false });
    fpath(FF, [[-43, -64], [-42, -100], [-38, -140], [-30, -168]], { hw: 4, kind: 'plaza', zone: 'forum', dens: 1.4 });
  }
  // ---- Forum of Augustus: Mars the Avenger, and the firewall that shut out the Subura ----
  {
    const F = site(FF, -88, -152, 0); const g = gbF('mon', F);
    pavement(F, 0, 0, 64, 92, C.trav, { layer: 'mon' });
    porticus(F, { w: 64, d: 92, depth: 6, colH: 9, sides: 'lr', exedra: 'lr', exR: 18, gaps: [{ side: 'k', w: 20 }] });
    const T1 = temple(site(FF, -88, -178, FACE['+v']), { w: 34, d: 40, podH: 3.6, cols: 8, peri: 8, back: false, colH: 17.5, order: 'c', stairW: 22, noRes: true });
    // the firewall of peperino, 33 m high, its line deliberately irregular
    for (const [u0, v0, u1, v1] of [[-120, -200, -100, -206], [-100, -206, -76, -206], [-76, -206, -56, -198], [-56, -198, -54, -150]]) wall(g, FF, u0, v0, u1, v1, 0, 33, 2, C.peperino);
    const S = site(FF, -88, -130); K.box(g, S, 0, 0, 0, 5, 3, 8, C.marble, { solid: true }); for (let i = 0; i < 4; i++) K.box(g, S, -1.5 + i, 3, -2.2, 0.5, 1.8, 2.6, C.gilt); K.box(g, S, 0, 3, 1.2, 3, 1.6, 2, C.gilt); K.box(g, S, 0, 4.6, 1.4, 0.7, 1.8, 0.7, C.gilt);
    place('augustus', 'The Forum of Augustus', 'Forum Augustum', F.x, F.z, 40, 'landmark', { area: 'The Imperial Fora' });
    placard('augustus', ...fw(FF, -88, -122));
    navGrid(FF, -110, -66, -150, -112, 3, 2, { zone: 'forum' });
    fpath(FF, [[-66, -130], [-52, -130], [-42, -130]], { hw: 3, kind: 'plaza', zone: 'forum' });
  }
  // ---- Forum of Peace: Vespasian's garden square with its pink granite porticoes ----
  {
    const F = site(FF, 40, -115, 0); const g = gbF('mon', F);
    porticus(F, { w: 80, d: 100, depth: 6, colH: 8, sides: 'flr', marble: 0xb27c6c, gaps: [{ side: 'r', w: 10 }] });
    for (let i = 0; i < 6; i++) {
      const u = -27 + i * 10.8; K.box(g, F, u, 0, 6, 6, 0.5, 70, C.trav);
      K.box(g, F, u, 0.5, 6, 5.4, 0.12, 69, 0x6f7d3e);
      for (let k = 0; k < 7; k++) treeAt(F.wx(u, -24 + k * 10), F.wz(u, -24 + k * 10), 'rose', 0.8);
      if (i < 5) K.box(g, F, u + 5.4, 0, 6, 1.2, 0.35, 70, C.water);
    }
    const H = F.sub(0, -44, 0, F.y); K.box(g, H, 0, 0, 0, 32, 16, 12, C.marble2, { solid: true }); K.gable(g, H, 0, 16, 0, 33, 13, 4, C.tile, { side: C.marble });
    K.colonnade(g, H, -12, 7, 12, 7, 6, 0, 12, 0.5, 'c', 0xb27c6c);
    place('peace', 'The Forum of Peace', 'Templum Pacis', F.x, F.z, 45, 'landmark', { area: 'The Imperial Fora' });
    placard('peace', ...fw(FF, 40, -68));
    navGrid(FF, 8, 72, -150, -72, 3, 4, { zone: 'forum', dens: 0.7 });
    fpath(FF, [[40, -72], [40, -66], [40, -60]], { hw: 3, kind: 'plaza', zone: 'forum' });
    fpath(FF, [[72, -110], [84, -110], [100, -112]], { hw: 3, kind: 'plaza', zone: 'forum' });
  }
  // ---- Forum of Trajan, the Basilica Ulpia, the libraries and the Column ----
  {
    const F = site(FF, -195, -150, 0); const g = gbF('mon', F);
    pavement(F, 0, 0, 140, 100, C.marbleW, { layer: 'mon', slab: 4 });
    porticus(F, { w: 140, d: 100, depth: 7, colH: 9, sides: 'fkr', exedra: 'fk', exR: 22, marble: 0xc9b8a4, gaps: [{ side: 'r', w: 18, prop: true }] });
    // the great triumphal entrance on the side facing the Forum of Augustus
    { const A = site(FF, -124, -150, FACE['+u'] - Math.PI / 2); triArch(A, { w: 24, d: 6, h: 17, pw: 7, ph: 11, attic: 5, three: true, spw: 3.6, sph: 7.5, quadriga: true }); }
    // the bronze equestrian statue of Trajan
    { const S = site(FF, -190, -150); K.box(g, S, 0, 0, 0, 6, 4, 10, C.marble, { solid: true }); K.statue(g, S, 0, 4, 0, C.gilt, 'horse', FACE['+u'], 2.2); }
    // Basilica Ulpia across the far end
    basilica(site(FF, -292, -150, FACE['+u'] - Math.PI / 2 + Math.PI / 2), { w: 46, d: 120, nu: 7, nv: 18, base: 1.4, h1: 11, h2: 8, aisle: 9, col: 0xd8ccb8 });
    for (const s of [-1, 1]) { const A = site(FF, -292, -150 + s * 66); K.cyl(gbF('mon', A), A, 0, 0, 0, 22, 22, 26, 16, C.marble2, { solid: true }); K.dome(gbF('mon', A), A.sub(0, 0, 0, A.y + 26), 0, 0, 0, 22, 16, 3, C.tile, { squash: 0.3 }); }
    // the court of the Column between the two libraries (Greek and Latin)
    for (const s of [-1, 1]) {
      const L = site(FF, -334, -150 + s * 20, s > 0 ? FACE['-v'] : FACE['+v']); const gl = gbF('mon', L);
      K.box(gl, L, 0, 0, 0, 26, 18, 16, C.brick, { solid: true }); K.gable(gl, L, 0, 18, 0, 27, 17, 4, C.tile, { side: C.marble });
      K.colonnade(gl, L, -10, -9, 10, -9, 5, 0, 10, 0.4, 'c', C.marble); K.box(gl, L, 0, 10, -9, 23, 1.4, 1.6, C.marble);
    }
    trajanColumn(site(FF, -334, -150));
    temple(site(FF, -378, -150, FACE['+u']), { w: 34, d: 48, podH: 4, cols: 8, peri: 10, colH: 16, order: 'c', stairW: 22, noRes: false });
    place('trajan', 'The Forum of Trajan', 'Forum Traiani', F.x, F.z, 60, 'landmark', { area: 'The Imperial Fora', major: true, spawn: fw(FF, -140, -150), spawnYaw: FF.yaw + Math.PI / 2 });
    place('column', 'Trajan\'s Column', 'Columna Traiani', ...fw(FF, -334, -150), 22, 'landmark', { area: 'The Imperial Fora', far: 1500 });
    place('ulpia', 'Basilica Ulpia', 'Basilica Ulpia', ...fw(FF, -292, -150), 40, 'landmark', { area: 'The Imperial Fora', big: false });
    placard('trajan', ...fw(FF, -160, -140));
    placard('column', ...fw(FF, -328, -146));
    navGrid(FF, -255, -132, -185, -115, 5, 3, { zone: 'forum' });
    fpath(FF, [[-132, -150], [-118, -150], [-110, -140]], { hw: 4, kind: 'plaza', zone: 'forum' });
    fpath(FF, [[-255, -150], [-275, -150], [-310, -150], [-322, -142], [-345, -142], [-360, -150]], { hw: 3, kind: 'plaza', zone: 'forum', dens: 0.6 });
  }
  // ---- Trajan's Markets: shops in a brick hemicycle climbing the Quirinal ----
  {
    const F = site(FF, -195, -214, 0); const g = gbF('mon', F);
    reserve(F, 0, -20, 110, 70, 2);
    const ring = (r0, r1, y, h, n, col, shops) => {
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI;
        const B = F.sub(Math.cos((a0 + a1) / 2) * (r0 + r1) / 2, Math.sin((a0 + a1) / 2) * (r0 + r1) / 2, (a0 + a1) / 2 + Math.PI / 2, F.y);
        const L = (a1 - a0) * r1;
        K.box(g, B, 0, y, 0, L + 0.2, h, r1 - r0, col, { solid: y < 1 });
        if (shops) { K.panel(g, B, 0, y + 0.3, (r1 - r0) / 2 + 0.03, 3, h * 0.6, 0x2a2018, 1); K.box(g, B, 0, y + h * 0.66, (r1 - r0) / 2 + 0.1, 3.4, 0.4, 0.4, C.trav); }
        else K.panel(g, B, 0, y + h * 0.35, (r1 - r0) / 2 + 0.03, 2.2, h * 0.4, 0x2a2018, 1);
      }
    };
    ring(40, 46, 0, 6, 14, C.brick, true);
    ring(46, 50, 6, 6, 14, C.brick2, false);
    ring(52, 58, 0, 18, 16, C.brick, false);
    K.box(g, F, 0, 18, -54, 70, 1, 10, C.tile2);
    const H = F.sub(30, -66, 0.2, F.y); K.box(g, H, 0, 0, 0, 30, 18, 12, C.brick, { solid: true }); K.gable(g, H, 0, 18, 0, 31, 13, 4, C.tile, { side: C.brick });
    for (let i = 0; i < 6; i++) W.spots.push({ kind: 'shop', x: F.wx(Math.cos(Math.PI + (i + 4) / 14 * Math.PI) * 38, Math.sin(Math.PI + (i + 4) / 14 * Math.PI) * 38), z: F.wz(Math.cos(Math.PI + (i + 4) / 14 * Math.PI) * 38, Math.sin(Math.PI + (i + 4) / 14 * Math.PI) * 38), yaw: F.yawOf(-Math.cos(Math.PI + (i + 4) / 14 * Math.PI), -Math.sin(Math.PI + (i + 4) / 14 * Math.PI)), role: rpick(['fishmonger', 'spicer', 'vendor', 'vendor']) });
    place('markets', 'Trajan\'s Markets', 'Mercatus Traiani', F.x, F.z, 40, 'landmark', { area: 'The Imperial Fora' });
    placard('markets', F.wx(0, -32), F.wz(0, -32));
    const arc = []; for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; arc.push(fw(F, Math.cos(a) * 36, Math.sin(a) * 36)); }
    addPath(arc, { hw: 3, kind: 'plaza', zone: 'forum', dens: 1.1 });
    fpath(F, [[0, -36], [0, -10], [0, 20]], { hw: 3, kind: 'plaza', zone: 'forum' });
  }
}

function trajanColumn(S) {
  const g = gbF('mon', S);
  reserve(S, 0, 0, 10, 10, 1);
  K.box(g, S, 0, 0, 0, 6.2, 1.2, 6.2, C.marbleW, { solid: true });
  K.box(g, S, 0, 1.2, 0, 5.6, 4.6, 5.6, C.marbleW, { solid: true });
  K.panel(g, S, 0, 2.2, -2.83, 2.2, 1.6, 0x3a2e24, -1);
  decal(S, 0, 3.9, -2.84, 3.6, 0.8, ['SENATVS · POPVLVSQVE · ROMANVS', 'IMP · CAESARI · DIVI · NERVAE · F · NERVAE', 'TRAIANO · AVG · GERM · DACICO'], { pw: 512, ph: 120, bg: '#ece6d8', ink: '#4a3a2a', size: 0.62 });
  K.box(g, S, 0, 5.8, 0, 6, 0.6, 6, C.marbleW);
  K.cyl(g, S, 0, 6.4, 0, 2.3, 2.1, 0.8, 16, C.marbleW);
  // the shaft with the spiral frieze of the Dacian wars: stripes turning 23 times
  const r = 1.85, h = 27, rings = 46, seg = 16, y0 = S.y + 7.2;
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU, yA = y0 + (j / rings) * h, yB = y0 + ((j + 1) / rings) * h;
    const rr = r * (1 - 0.06 * j / rings);
    const turn = ((i / seg) + (j / rings) * 23) % 1;
    const col = turn < 0.12 ? 0xcfc6b4 : (hash2(i, j, 3) < 0.5 ? 0xe6dfd0 : 0xd9d0bf);
    g.quad([S.x + Math.cos(a0) * rr, yA, S.z + Math.sin(a0) * rr], [S.x + Math.cos(a1) * rr, yA, S.z + Math.sin(a1) * rr], [S.x + Math.cos(a1) * rr, yB, S.z + Math.sin(a1) * rr], [S.x + Math.cos(a0) * rr, yB, S.z + Math.sin(a0) * rr], col, [S.x, yA, S.z]);
  }
  solidCircle(S.x, S.z, 2.2, S.y, S.y + 34, true);
  K.cyl(g, S, 0, 34.2, 0, 1.9, 2.4, 0.9, 16, C.marbleW);
  K.box(g, S, 0, 35.1, 0, 4.6, 0.7, 4.6, C.marbleW);
  K.cyl(g, S, 0, 35.8, 0, 1.2, 1.2, 1.4, 10, C.marbleW);
  K.statue(g, S, 0, 35.8, 0, C.gilt, 'god', 0, 1.6);
}

// ======================= the Campus Martius =======================
function buildCampus() {
  rseed('campus');
  // ---- the Pantheon, rebuilt by Hadrian with Agrippa's name kept on the front ----
  {
    const P = siteW(-650, -420, 0, 0); const g = gbF('mon', P);
    reserve(P, 0, -10, 64, 120, 2);
    const ri = 21.65, ro = 27.9, cy = 9; // rotunda centre is 9 m behind the frame origin
    const R0 = P.sub(0, cy, 0, P.y);
    // the drum: the door gap faces north (-v); world angle of local -v is ang - PI/2
    const doorA = P.ang - Math.PI / 2;
    K.ring(g, R0, 0, 0, 0, ri, ro, 30, 40, C.brick, { solid: true, gaps: [[doorA - 0.16, doorA + 0.16]], inHex: 0xe4dccb, outHex: 0xd8c6a6 });
    for (const y of [12, 22, 30]) K.ring(g, R0, 0, y - 0.6, 0, ro - 0.2, ro + 0.5, 0.8, 40, C.marble2, { gaps: [[doorA - 0.16, doorA + 0.16]] });
    // the dome: stepped rings outside, coffers inside, the oculus open to the sky
    for (let k = 0; k < 6; k++) K.cyl(g, R0, 0, 30 + k * 1.6, 0, ro - k * 1.6, ro - (k + 1) * 1.6, 1.6, 40, k < 3 ? C.marble2 : 0x9aa6a6, { top: false });
    K.dome(g, R0, 0, 39.6, 0, ri - 1.6, 36, 6, 0x9aa6a6, { oculus: 4.6, squash: 0.48 });
    K.dome(g, R0, 0, ri, 0, ri, 28, 8, 0xd6cdb9, { inside: true, oculus: 4.4, coffer: true });
    K.ring(g, R0, 0, 43.0, 0, 4.4, 5, 0.8, 24, C.bronze);
    // inside: the floor of porphyry and granite squares, niches with columns
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      const u = i * 4, v = j * 4; if (u * u + v * v > (ri - 1.5) * (ri - 1.5)) continue;
      K.box(g, R0, u, 0, v, 3.9, 0.08, 3.9, (i + j) % 2 ? 0x8a5a5a : 0xa8a49a);
    }
    for (let i = 0; i < 8; i++) {
      const a = doorA + Math.PI + (i - 3.5) * (TAU / 8) * 0.9 + 0.0001;
      if (i === 0 || i === 7) continue;
      const nu = Math.cos(a - P.ang) * (ri - 0.1), nv = Math.sin(a - P.ang) * (ri - 0.1);
      const N = R0.sub(nu, nv, Math.atan2(nv, nu) + Math.PI / 2, R0.y);
      K.box(g, N, 0, 0, 0.3, 9, 9, 0.4, 0x3a3028);
      for (const s of [-1, 1]) K.column(g, N, s * 3, 0, -0.6, 9, 0.45, 'c', 0xc9a88a, { solid: false });
      K.box(g, N, 0, 9, -0.2, 11, 1.2, 1.6, C.marble);
      K.statue(g, N, 0, 0, 0.8, C.marble, 'god', Math.PI, 1.3);
    }
    // the intermediate block and the portico of sixteen granite columns
    for (const s of [-1, 1]) K.box(g, P, s * 11, 0, -18, 12, 31, 8, C.brick, { solid: true });
    K.box(g, P, 0, 12, -18, 10, 19, 8, C.brick, { skip: '' }); // the lintel block over the great door
    for (const s of [-1, 1]) K.box(g, P, s * 4.6, 0.5, -23, 0.2, 11.5, 3.4, C.bronze, { ra: s * 0.5 }); // bronze leaves, open
    K.box(g, P, 0, 0, -30, 34.5, 0.5, 16, C.trav, { solid: true, top: C.marble });
    K.stairs(g, P, 0, 0, -38, 34.5, 2, 0.25, 0.42, -1, C.marble);
    const gr = 0x8a8a8a, pr = 0xa86a5a;
    K.colonnade(g, P, -15.4, -36.5, 15.4, -36.5, 8, 0.5, 13.2, 0.75, 'c', C.marble, { shaftHex: gr });
    for (const v of [-31, -25.5]) for (const u of [-15.4, -6.6, 6.6, 15.4]) K.column(g, P, u, 0.5, v, 13.2, 0.75, 'c', C.marble, { shaftHex: pr });
    K.box(g, P, 0, 13.7, -30.5, 34, 2.4, 13.6, C.marble, { skip: '' });
    K.gable(g, P, 0, 16.1, -30.5, 34.6, 14.2, 7.0, C.bronze, { alongV: true, side: C.marble });
    decal(P, 0, 14.0, -37.45, 22, 1.6, ['M · AGRIPPA · L · F · COS · TERTIVM · FECIT'], { pw: 1024, ph: 72, bg: '#e8e0d0', ink: '#3a2e22', size: 0.86 });
    // the forecourt: a long colonnaded square
    pavement(site(P, 0, -95), 0, 0, 62, 110, C.trav, { layer: 'mon', slab: 4 });
    porticus(site(P, 0, -95), { w: 62, d: 110, depth: 6, colH: 8, sides: 'lr', noRes: true });
    fountain(P, 0, -70, { round: true, r: 3, big: true });
    navGrid(P, -24, 24, -146, -42, 3, 5, { zone: 'forum', dens: 1.0 });
    // inside, people stand looking up at the oculus
    addPath([fw(P, 0, -42), fw(P, 0, -32), fw(P, 0, -20), fw(P, 0, 0), fw(P, 0, 9), fw(P, -8, 14), fw(P, 0, 20)], { hw: 2.5, kind: 'plaza', zone: 'forum', dens: 1.2 });
    place('pantheon', 'The Pantheon', 'Pantheum', R0.x, R0.z, 40, 'landmark', { area: 'The Campus Martius', major: true, far: 2000, spawn: fw(P, 0, -84), spawnYaw: Math.PI });
    placard('pantheon', ...fw(P, 8, -42));
    placard('oculus', ...fw(P, 3, 9 + 6));
    mapCircle(R0.x, R0.z, ro, '#d9cdb8'); mapRect(P, 0, -30, 34, 16, '#d9cdb8');
  }
  // ---- the Baths of Agrippa and their pool (stagnum) and canal ----
  {
    const B = siteW(-650, -330, 0); const g = gbF('mon', B);
    reserve(B, 0, 0, 100, 60, 2);
    K.box(g, B, 0, 0, 0, 90, 14, 46, C.brick, { solid: true }); K.hip(g, B, 0, 14, 0, 91, 47, 4, C.tile);
    K.cyl(g, B.sub(0, 0, 0, B.y + 14), 0, 0, 0, 14, 14, 6, 18, C.brick); K.dome(g, B.sub(0, 0, 0, B.y + 20), 0, 0, 0, 14, 18, 4, C.brick);
    for (let i = 0; i < 8; i++) K.panel(g, B, -35 + i * 10, 4, -23.03, 3, 5, 0x2a2018, -1);
    const St = siteW(-760, -330, 0);
    K.box(g, St, 0, -0.6, 0, 70, 0.6, 50, C.trav); K.box(g, St, 0, -0.05, 0, 66, 0.05, 46, C.water);
    K.box(g, St, -100, -0.6, 0, 130, 0.6, 8, C.trav); K.box(g, St, -100, -0.05, 0, 130, 0.05, 6, C.water);
    reserve(St, -40, 0, 210, 50, 1);
    place('agrippa', 'The Baths of Agrippa', 'Thermae Agrippae', B.x, B.z, 50, 'landmark', { area: 'The Campus Martius', big: false });
    mapRect(B, 0, 0, 90, 46, '#b08868'); mapRect(St, 0, 0, 70, 50, '#7a9696');
  }
  // ---- the Saepta Julia: the old voting enclosure, now a shopping arcade ----
  {
    const S = siteW(-560, -440, 0); const g = gbF('mon', S);
    porticus(S, { w: 48, d: 220, depth: 7, colH: 10, sides: 'lr', gaps: [], wall: C.trav2 });
    for (let i = 0; i < 10; i++) W.spots.push({ kind: 'shop', x: S.wx(i % 2 ? 19 : -19, -90 + i * 20), z: S.wz(i % 2 ? 19 : -19, -90 + i * 20), yaw: S.yawOf(i % 2 ? -1 : 1, 0), role: rpick(['jeweller', 'vendor', 'slavetrader', 'vendor', 'perfumer']) });
    navGrid(S, -12, 12, -100, 100, 1, 6, { zone: 'forum', dens: 1.1 });
    place('saepta', 'The Saepta Julia', 'Saepta Iulia', S.x, S.z, 60, 'landmark', { area: 'The Campus Martius', big: false });
    placard('saepta', S.wx(0, -112), S.wz(0, -112));
  }
  // ---- the Stadium of Domitian, for athletic games in the Greek manner ----
  {
    const S = siteW(-840, -420, 0); const g = gbF('mon', S);
    reserve(S, 0, 0, 66, 250, 2);
    const W2 = 31, L2 = 120;
    for (const s of [-1, 1]) { K.arcade(g, S.sub(s * W2, 0, s * Math.PI / 2, S.y), -L2 + W2, L2, 0, 0, 22, 1.6, 6, 9.5, 1.4, C.trav, { halfCol: C.trav2 }); K.box(g, S, s * W2, 9.5, (W2) / 2, 1.4, 9, L2 * 2 - W2, C.trav); }
    K.ring(g, S.sub(0, -L2 + W2, 0, S.y), 0, 0, 0, W2 - 1.2, W2 + 0.2, 18.5, 18, C.trav, { solid: true, gaps: [[S.ang + 0.01, S.ang + Math.PI - 0.01]] });
    K.box(g, S, 0, 0, L2, W2 * 2, 18.5, 2, C.trav, { solid: true });
    // track and seats
    K.box(g, S, 0, 0, 10, 32, 0.08, 200, 0xc8b48a);
    for (const s of [-1, 1]) for (let k = 0; k < 8; k++) K.box(g, S, s * (17 + k * 1.6), k * 1.2, 15, 1.6, 1.2, 200, k % 2 ? 0xd9cfb8 : 0xcabf9f, { solid: true });
    for (let i = 0; i < 3; i++) W.spots.push({ kind: 'run', x: S.wx(rnd(-8, 8), rnd(-60, 60)), z: S.wz(rnd(-8, 8), rnd(-60, 60)), yaw: 0, role: 'athlete' });
    addPath([fw(S, 0, L2 + 8), fw(S, 0, L2 - 4), fw(S, 0, 40), fw(S, 0, -40), fw(S, 0, -80)], { hw: 6, kind: 'plaza', zone: 'city', dens: 0.25 });
    place('stadium', 'The Stadium of Domitian', 'Stadium Domitiani', S.x, S.z, 70, 'landmark', { area: 'The Campus Martius' });
    placard('stadium', S.wx(0, L2 + 8), S.wz(0, L2 + 8));
    mapRect(S, 0, 0, W2 * 2, L2 * 2, '#d7c7a2');
  }
  // ---- the Theatre of Pompey, its temple of Venus atop the seats, and the portico where Caesar died ----
  {
    const T2 = siteW(-760, -225, Math.PI / 2); // facing east
    theatre(T2, 72, 30, 'Pompey');
    porticus(siteW(-610, -225, Math.PI / 2), { w: 135, d: 165, depth: 7, colH: 8, gaps: [{ side: 'l', w: 12 }, { side: 'r', w: 12 }] });
    const G = siteW(-610, -225, 0);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) treeAt(G.wx(-45 + i * 30, -60 + k * 24), G.wz(-45 + i * 30, -60 + k * 24), k % 2 ? 'plane' : 'laurel');
    for (let i = 0; i < 3; i++) fountain(G, -30 + i * 30, 0, { round: true, r: 2.4 });
    const Cu = siteW(-532, -225, -Math.PI / 2); const g = gbF('mon', Cu);
    K.box(g, Cu, 0, 0, 0, 22, 14, 18, C.trav2, { solid: true }); K.gable(g, Cu, 0, 14, 0, 23, 19, 4, C.tile, { alongV: true, side: C.trav2 });
    K.panel(g, Cu, 0, 0, -9.03, 3, 5, 0x2a1d14, -1);
    navGrid(G, -60, 60, -75, 75, 4, 5, { zone: 'city', dens: 0.6 });
    place('pompey', 'The Theatre of Pompey', 'Theatrum Pompeii', T2.x, T2.z, 70, 'landmark', { area: 'The Campus Martius' });
    place('curiapompey', 'The Curia of Pompey', 'Curia Pompeia', Cu.x, Cu.z, 16, 'landmark', { area: 'The Campus Martius', big: false });
    placard('curiapompey', Cu.wx(0, -14), Cu.wz(0, -14));
    placard('pompey', T2.wx(0, -8), T2.wz(0, -8));
  }
  // ---- Porticus of Octavia with its two temples ----
  {
    const S = siteW(-480, -40, 0);
    porticus(S, { w: 120, d: 100, depth: 6, colH: 8, gaps: [{ side: 'k', w: 16, prop: true }] });
    temple(site(S, -24, -6, 0), { w: 18, d: 30, podH: 3, cols: 6, peri: 9, colH: 10, order: 'i', noRes: true });
    temple(site(S, 24, -6, 0), { w: 18, d: 30, podH: 3, cols: 6, peri: 9, colH: 10, order: 'i', noRes: true });
    navGrid(S, -50, 50, 18, 42, 4, 1, { zone: 'city', dens: 0.6 });
    place('octavia', 'Porticus of Octavia', 'Porticus Octaviae', S.x, S.z, 50, 'landmark', { area: 'The Campus Martius', big: false });
  }
  // ---- the Theatre of Marcellus beside the river ----
  { const T2 = siteW(-430, 112, -2.3); theatre(T2, 64, 32, 'Marcellus'); place('marcellus', 'The Theatre of Marcellus', 'Theatrum Marcelli', T2.x, T2.z, 65, 'landmark', { area: 'The River', spawn: [T2.wx(30, 60), T2.wz(30, 60)] }); placard('marcellus', T2.wx(40, 72), T2.wz(40, 72)); }
  // ---- the Mausoleum of Augustus, the obelisk sundial and the Altar of Peace ----
  {
    const M = siteW(-640, -880, 0); const g = gbF('mon', M);
    reserve(M, 0, 0, 100, 110, 2);
    K.cyl(g, M, 0, 0, 0, 44, 44, 12, 40, C.trav, { solid: true, topHex: 0x6f8a45 });
    K.cyl(g, M, 0, 12, 0, 30, 30, 10, 36, C.trav, { topHex: 0x6f8a45 });
    K.cyl(g, M, 0, 22, 0, 30, 9, 16, 36, 0x6f8a45, { top: false });
    K.cyl(g, M, 0, 38, 0, 9, 7, 6, 18, C.trav);
    K.statue(g, M, 0, 44, 0, C.bronze, 'god', 0, 2.2);
    for (let k = 0; k < 2; k++) for (let i = 0; i < 18 + k * 10; i++) { const a = i / (18 + k * 10) * TAU, r = k ? 37 : 22; treeAt(M.x + Math.cos(a) * r, M.z + Math.sin(a) * r, 'cypress', 0.9, M.y + (k ? 12 : 22) + 1); }
    K.panel(g, M, 0, 0, -44.05, 4, 6, 0x2a1d14, -1);
    for (const s of [-1, 1]) { obelisk(g, M, s * 9, -50, 14, { col: 0xc9876a }); K.box(g, M, s * 4, 0, -44.3, 2.4, 5, 0.3, C.bronze); }
    place('mausoleum', 'The Mausoleum of Augustus', 'Mausoleum Augusti', M.x, M.z, 60, 'landmark', { area: 'The Campus Martius', spawn: [M.x, M.z - 70], spawnYaw: Math.PI });
    placard('mausoleum', M.x + 8, M.z - 56);
    mapCircle(M.x, M.z, 44, '#9fae7c');
    // the sundial of Augustus: an Egyptian obelisk as the pointer over a pavement of bronze lines
    const H = siteW(-560, -760, 0); const gh = gbF('mon', H);
    reserve(H, 0, 10, 80, 100, 1);
    pavement(H, 0, 16, 76, 90, C.trav, { layer: 'mon', slab: 4 });
    for (let i = -6; i <= 6; i++) K.box(gh, H, i * 5, 0.07, 22, 0.15, 0.03, 70, C.bronze, { ra: i * 0.06 });
    for (let k = 0; k < 5; k++) K.box(gh, H, 0, 0.07, 6 + k * 12, 60, 0.03, 0.15, C.bronze);
    obelisk(gh, H, 0, -10, 30, { col: 0xb8705a });
    place('horologium', 'The Sundial of Augustus', 'Horologium Augusti', H.x, H.z, 30, 'landmark', { area: 'The Campus Martius', big: false });
    placard('horologium', H.wx(6, 4), H.wz(6, 4));
    const A = siteW(-500, -790, -Math.PI / 2); const ga = gbF('mon', A);
    reserve(A, 0, 0, 16, 16, 2);
    K.box(ga, A, 0, 0, 0, 11.6, 1.2, 10.6, C.marbleW, { solid: true });
    for (const [u0, v0, u1, v1] of [[-5.5, -5, -1.8, -5], [1.8, -5, 5.5, -5], [-5.5, 5, -1.8, 5], [1.8, 5, 5.5, 5], [-5.5, -5, -5.5, 5], [5.5, -5, 5.5, 5]]) wall(ga, A, u0, v0, u1, v1, 1.2, 5.4, 0.6, C.marbleW);
    K.stairs(ga, A, 0, 0, -5.3, 4, 4, 0.3, 0.4, -1, C.marbleW);
    altar(ga, A, 0, 1.5, 1.1);
    place('arapacis', 'The Altar of Augustan Peace', 'Ara Pacis Augustae', A.x, A.z, 16, 'landmark', { area: 'The Campus Martius', big: false });
    placard('arapacis', A.wx(0, -8), A.wz(0, -8));
  }
}

// a Roman theatre: semicircular cavea with an arcaded outer wall, a stage building across the diameter. Faces -v.
function theatre(F, R, H, kind) {
  const g = gbF('mon', F);
  reserve(F, 0, R * 0.25, R * 2.1, R * 1.3, 2);
  const nb = Math.round(R * Math.PI / 6.5);
  // facade bays round the back (the half at +v)
  for (let i = 0; i < nb; i++) {
    const a0 = (i / nb) * Math.PI, a1 = ((i + 1) / nb) * Math.PI; // 0..PI covers +v side (u = cos, v = sin)
    const P = (a) => [Math.cos(a) * R, Math.sin(a) * R];
    const [u0, v0] = P(a0), [u1, v1] = P(a1), L = Math.hypot(u1 - u0, v1 - v0);
    const B = F.sub((u0 + u1) / 2, (v0 + v1) / 2, Math.atan2(v1 - v0, u1 - u0), F.y);
    let y = 0;
    for (let s = 0; s < 3; s++) {
      const h = H / 3; K.box(g, B, -L / 2, y, 0, 1.8, h, 2, C.trav, { solid: s === 0, skip: 'b' });
      K.archTop(g, B, 0, 0, y + h * 0.62, (L - 1.8) / 2, y + h - 0.8, 2, C.trav, 6); K.box(g, B, 0, y + h - 0.8, -0.2, L, 0.8, 2.4, C.trav2); y += h;
    }
    K.box(g, B.sub(0, 4, 0, B.y), 0, 0, 0, L + 0.1, H, 0.6, 0x7a6a52);
  }
  // seats
  const ranks = 16;
  for (let k = 0; k < ranks; k++) {
    const r0 = lerp(14, R - 5, k / ranks), r1 = lerp(14, R - 5, (k + 1) / ranks), y = 1 + (k + 1) * (H - 4) / ranks, y0 = 1 + k * (H - 4) / ranks;
    for (let i = 0; i < 20; i++) {
      const a0 = (i / 20) * Math.PI, a1 = ((i + 1) / 20) * Math.PI;
      const Q = (r, a, yy) => [F.wx(Math.cos(a) * r, Math.sin(a) * r), F.y + yy, F.wz(Math.cos(a) * r, Math.sin(a) * r)];
      g.quad(Q(r0, a0, y), Q(r0, a1, y), Q(r1, a1, y), Q(r1, a0, y), k % 5 === 0 ? 0xbfb196 : 0xd9cfb8, [F.x, F.y - 50, F.z]);
      g.quad(Q(r0, a0, y0), Q(r0, a1, y0), Q(r0, a1, y), Q(r0, a0, y), 0xb5a98c, [F.x, F.y + y, F.z], -1);
    }
  }
  for (let i = 0; i < 18; i++) { const a = ((i + 0.5) / 18) * Math.PI; const r = (14 + R) / 2; solidBox(F, Math.cos(a) * r, Math.sin(a) * r, 8, R - 13, 0, H, a + Math.PI / 2, true); }
  // orchestra and stage
  K.cyl(g, F, 0, 0, 0, 13, 13, 0.1, 16, C.marble);
  K.box(g, F, 0, 0, -4, R * 1.5, 1.6, 8, C.wood, { solid: true });
  K.box(g, F, 0, 0, -12, R * 1.6, H * 0.85, 6, C.trav2, { solid: true });
  for (let i = 0; i < 9; i++) K.column(g, F, -R * 0.6 + i * R * 0.15, 1.6, -8.4, 7, 0.32, 'c', i % 2 ? C.marble : 0xb27c6c, { solid: false });
  K.box(g, F, 0, 8.6, -8.6, R * 1.4, 1, 1.2, C.marble);
  for (const s of [-1, 1]) K.box(g, F, s * (R * 0.8 + 3), 0, -6, 8, H * 0.7, 14, C.trav2, { solid: true });
  if (kind === 'Pompey') temple(F.sub(0, R - 3, 0, F.y), { w: 20, d: 24, podH: H * 0.8, cols: 6, colH: 10, order: 'c', pron: 2, stairs: 'none', noRes: true });
  mapCircle(F.x, F.z, R, '#d7c7a2');
}

// ======================= the river front =======================
function buildRiver() {
  rseed('river');
  // ---- Tiber Island: the Temple of Aesculapius and the travertine prow that makes the island a ship ----
  {
    const I = new Frame(ISLAND.F.x, ISLAND.F.z, ISLAND.F.ang - Math.PI / 2, groundAt(ISLAND.F.x, ISLAND.F.z));
    temple(site(I, 0, -10, 0), { w: 14, d: 24, podH: 2.4, cols: 4, colH: 8, order: 'i', pron: 2, stairW: 8 });
    const g = gbF('mon', I);
    const P = site(I, 0, 84, 0);
    K.tbox(g, P, 0, -2.6, 0, 22, 30, 0.6, 30, 4.4, C.trav, { ov: 15 });
    obelisk(g, I, 0, 70, 10, { col: 0xc9876a });
    for (let i = 0; i < 6; i++) treeAt(I.wx(rnd(-12, 12), rnd(-60, 50)), I.wz(rnd(-12, 12), rnd(-60, 50)), rpick(['plane', 'laurel']));
    for (let i = 0; i < 3; i++) W.spots.push({ kind: 'sit', x: I.wx(-6 + i * 5, 6), z: I.wz(-6 + i * 5, 6), y: groundAt(I.wx(-6 + i * 5, 6), I.wz(-6 + i * 5, 6)), yaw: I.yaw, role: 'sick' });
    addPath([fw(I, 0, -60), fw(I, 0, -24), fw(I, 0, 10), fw(I, 0, 50)], { hw: 4, kind: 'plaza', zone: 'city', dens: 0.6 });
    place('island', 'Tiber Island', 'Insula Tiberina', I.x, I.z, 60, 'landmark', { area: 'The River' });
    placard('island', I.wx(4, 14), I.wz(4, 14));
    // bridges: Fabricius to the city, Cestius to Trastevere
    const Iu = (u, v) => [ISLAND.F.wx(u, v), ISLAND.F.wz(u, v)];
    const [ax, az] = Iu(-12, -18), [bx, bz] = Iu(-12, -76);
    bridge(ax, az, bx, bz, 7, { rise: 3.4, arches: 2 });
    addPath([[ax, az], fw(I, 0, -24)], { hw: 3, kind: 'plaza', zone: 'city' });
    const [cx, cz] = Iu(-12, 18), [dx, dz] = Iu(-12, 78);
    bridge(cx, cz, dx, dz, 7, { rise: 3.4, arches: 3 });
    addPath([[cx, cz], fw(I, 0, -24)], { hw: 3, kind: 'plaza', zone: 'city' });
    place('fabricius', 'Pons Fabricius', 'Pons Fabricius', (ax + bx) / 2, (az + bz) / 2, 20, 'landmark', { area: 'The River', big: false });
    placard('fabricius', bx + (ax - bx) * 0.12, bz + (az - bz) * 0.12, null);
  }
  // Pons Aemilius and the old wooden Pons Sublicius
  bridge(-649, 280, -511, 240, 9, { rise: 4, arches: 6 });
  place('aemilius', 'Pons Aemilius', 'Pons Aemilius', -580, 260, 30, 'landmark', { area: 'The River', big: false });
  {
    const F2 = bridge(-651, 471, -508, 489, 7, { rise: 1.4, arches: 8, col: C.wood });
    place('sublicius', 'The Wooden Bridge', 'Pons Sublicius', -580, 480, 30, 'landmark', { area: 'The River', big: false });
    placard('sublicius', -505, 495);
  }
  // ---- the cattle market (Forum Boarium), the round Temple of Hercules, the Temple of Portunus ----
  {
    const B = siteW(-465, 255, 0.5); const g = gbF('city', B);
    reserve(B, 0, 0, 80, 70, 2);
    pavement(B, 0, 0, 76, 64, 0xb8a888, { slab: 4 });
    tholos(site(B, -22, 20, 0), { r: 8.6, podH: 1.8, colH: 10.6, n: 20, rc: 5.4, roof: C.tile, marble: C.marbleW });
    temple(site(B, -26, -18, -Math.PI / 2), { w: 12, d: 26, podH: 2.4, cols: 4, colH: 9, order: 'i', pron: 2, side: true, pod: C.tuff, marble: C.trav2, cella: C.trav2 });
    altar(gbF('city', B), B, 10, 22, 1.6);
    // pens of cattle and the butchers' stalls
    for (let i = 0; i < 4; i++) {
      const P = site(B, 8 + i * 8, -14, 0), gp = gbF('prop', P);
      for (const [u0, v0, u1, v1] of [[-3.5, -3, 3.5, -3], [-3.5, 3, 3.5, 3], [-3.5, -3, -3.5, 3], [3.5, -3, 3.5, 3]]) wall(gp, P, u0, v0, u1, v1, 0, 1.2, 0.15, C.wood);
      W.spots.push({ kind: 'animal', x: P.wx(-1, 0), z: P.wz(-1, 0), yaw: rnd(0, TAU), role: 'ox' }); W.spots.push({ kind: 'animal', x: P.wx(1.5, 1), z: P.wz(1.5, 1), yaw: rnd(0, TAU), role: 'ox' });
    }
    for (let i = 0; i < 3; i++) { stall(site(B, 6 + i * 10, 6, 0), rpick(['meat', 'meat', 'veg'])); W.spots.push({ kind: 'shop', x: B.wx(6 + i * 10, 7.6), z: B.wz(6 + i * 10, 7.6), yaw: B.yawOf(0, -1), role: 'butcher' }); }
    W.spots.push({ kind: 'stand', x: B.wx(16, -4), z: B.wz(16, -4), yaw: B.yawOf(0, 1), role: 'drover' });
    navGrid(B, -30, 32, -28, 28, 4, 3, { zone: 'city', dens: 1.2 });
    place('boarium', 'The Cattle Market', 'Forum Boarium', B.x, B.z, 40, 'landmark', { area: 'The River' });
    placard('boarium', B.wx(-4, 4), B.wz(-4, 4));
    placard('hercules', B.wx(-22, 8), B.wz(-22, 8));
    // the outlet of the Great Drain
    const Cl = siteW(-528, 268, 0.5); K.archTop(gbF('city', Cl), Cl, 0, 0, -2.6, 2.4, 0.4, 2, C.peperino, 6);
    placard('cloaca', -520, 262);
    W.fountains.push({ x: -528, z: 268 });
  }
  // the vegetable market (Forum Holitorium) and its three temples in a row
  {
    const H = siteW(-470, 175, 0.5);
    reserve(H, 0, 0, 70, 46, 2);
    pavement(H, 0, 0, 66, 40, 0xb8a888, { slab: 4 });
    for (let i = 0; i < 3; i++) temple(site(H, -22 + i * 22, -10, 0), { w: 13, d: 22, podH: 2.6, cols: 4, colH: 8, order: i === 1 ? 'i' : 'd', pron: 2, noRes: true });
    for (let i = 0; i < 5; i++) { stall(site(H, -26 + i * 13, 12, 0), 'veg'); W.spots.push({ kind: 'shop', x: H.wx(-26 + i * 13, 13.6), z: H.wz(-26 + i * 13, 13.6), yaw: H.yawOf(0, -1), role: 'greengrocer' }); }
    navGrid(H, -28, 28, 4, 20, 3, 1, { zone: 'city', dens: 1.2 });
    place('holitorium', 'The Vegetable Market', 'Forum Holitorium', H.x, H.z, 30, 'landmark', { area: 'The River', big: false });
  }
  // the Emporium docks below the Aventine, with the hill of broken oil jars behind
  {
    const E = siteW(-560, 760, 0.12); const g = gbF('city', E);
    reserve(E, 16, 0, 84, 300, 1);
    K.box(g, E, -18, -2.6, 0, 8, 2.6, 300, C.trav, { solid: true });
    for (let i = 0; i < 6; i++) { const S = site(E, 40, -120 + i * 48, 0); K.box(gbF('city', S), S, 0, 0, 0, 34, 9, 40, C.brick, { solid: true }); K.hip(gbF('city', S), S, 0, 9, 0, 35, 41, 2.4, C.tile); reserve(S, 0, 0, 34, 40, 2); }
    for (let i = 0; i < 4; i++) { const S = site(E, -27, -100 + i * 60, 0); K.box(gbF('prop', S), S, 0, WATER_Y - S.y - 0.6, 0, 4, 1.4, 16, C.wood); K.box(gbF('prop', S), S, 0, WATER_Y - S.y + 0.8, 0, 0.3, 9, 0.3, C.woodD); }
    for (let i = 0; i < 12; i++) { const u = rnd(-14, -4), v = rnd(-130, 130); W.spots.push({ kind: 'work', x: E.wx(u, v), z: E.wz(u, v), yaw: rnd(0, TAU), role: 'docker' }); }
    fstreet(E, [[12, -150], [12, -50], [12, 50], [12, 150]], { w: 7, side: 0, kind: 'road', cart: true, zone: 'city', pave: 'earth' });
    const T3 = siteW(-430, 980, 0), gt = gbF('city', T3);
    reserveC(T3.x, T3.z, 80);
    for (let k = 0; k < 6; k++) K.cyl(gt, T3, 0, k * 4, 0, 75 - k * 12, 63 - k * 12, 4, 20, mixHex(0xb06a48, 0xc58a62, k / 6), { solid: k === 0 });
    place('emporium', 'The Emporium and Monte Testaccio', 'Emporium', E.x + 40, E.z, 90, 'landmark', { area: 'The River', big: false });
    placard('testaccio', T3.wx(0, -80), T3.wz(0, -80));
  }
}

// a market stall: a table under an awning, with goods
function stall(S, kind) {
  const g = gbF('prop', S), d = gbF('ds', S);
  K.box(g, S, 0, 0, 0, 3, 0.9, 1.3, C.wood, { solid: true });
  for (const [a, b] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) K.box(g, S, a, 0, b, 0.08, 2.2, 0.08, C.woodD);
  K.box(d, S, 0, 2.2, 0, 3.2, 0.04, 1.6, rpick([0xc9a46a, 0xb85a3a, 0xd8cfb4, 0x8a6a9a]));
  if (kind === 'meat') for (let i = 0; i < 4; i++) K.box(g, S, -1 + i * 0.65, 1.3, 0.3, 0.3, 0.6, 0.2, 0x9a3a32);
  else for (let i = 0; i < 8; i++) K.box(g, S, -1.2 + i * 0.34, 0.9, -0.2 + (i % 2) * 0.3, 0.28, 0.2, 0.28, rpick([0x6a8a3a, 0xd28a32, 0xa83a2a, 0x8a6a2a, 0x5a7a3a]));
}

// ======================= Porta Capena and the aqueducts =======================
function buildGates() {
  rseed('gates');
  const [x0, z0] = APPIA[0], [x1, z1] = APPIA[1];
  const bearing = Math.atan2(x1 - x0, -(z1 - z0));
  const G = siteW(x0, z0, bearing); const g = gbF('mon', G);
  reserve(G, 0, 0, 150, 14, 2);
  // the old Servian wall of grey tufa blocks, and the single gate
  for (const s of [-1, 1]) wall(g, G, s * 5, 0, s * 72, 0, -1, 10, 4, C.tuff);
  for (const s of [-1, 1]) { K.box(g, G, s * 7.5, 0, 0, 5, 13, 7, C.tuff, { solid: true }); K.box(g, G, s * 7.5, 13, 0, 5.4, 0.8, 7.4, C.trav2); }
  K.archTop(g, G.sub(0, 0, 0, G.y), 0, 0, 6.5, 5, 13, 7, C.tuff, 8);
  // the aqueduct channel that runs over the gate and drips on everyone (Juvenal's "wet Capena")
  K.box(g, G, 0, 13.8, 2, 30, 2.2, 2.4, C.peperino);
  for (const s of [-1, 1]) { K.box(g, G, s * 14, 0, 2, 2.2, 14, 2.2, C.peperino, { solid: true }); }
  W.fountains.push({ x: G.x, z: G.z, drip: true });
  place('capena', 'Porta Capena', 'Porta Capena', G.x, G.z, 22, 'landmark', { area: 'The Via Appia', spawn: [G.wx(0, 28), G.wz(0, 28)], spawnYaw: G.yawOf(0, -1) + Math.PI });
  placard('capena', G.wx(10, 6), G.wz(10, 6));
  // the Aqua Claudia striding across the Campagna, then Nero's branch over the Caelian
  aqueduct([[1950, 2100], [1500, 1520], [950, 300]], 50, 31.5);
  aqueduct([[950, 300], [700, 380], [470, 470]], 31.5, 30.5);
  place('aqueduct', 'The Aqueduct of Claudius', 'Aqua Claudia', 1300, 1100, 90, 'landmark', { area: 'The Campagna', far: 2600 });
  placard('aqueduct', 1290, 1135);
}
// arches every ~6.5 m along a polyline, the water channel falling gently from yA to yB (absolute heights)
function aqueduct(pts, yA, yB) {
  let total = 0; const seg = [];
  for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(L); total += L; }
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = seg[i], n = Math.round(L / 6.6), bay = L / n;
    const F = new Frame(ax, az, Math.atan2(bz - az, bx - ax), 0);
    for (let k = 0; k < n; k++) {
      const uc = (k + 0.5) * bay, t = (acc + uc) / total, top = lerp(yA, yB, t);
      const x = F.wx(uc, 0), z = F.wz(uc, 0), gy = groundAt(x, z);
      if (gy > top - 4) continue;
      const gb = gbAt('mon', x, z);
      const S = new Frame(x, z, F.ang, 0);
      const gl = Math.min(gy, groundAt(F.wx(uc - bay / 2, 0), F.wz(uc - bay / 2, 0))) - 0.5;
      K.box(gb, S, -bay / 2, gl, 0, 2.2, top - 2.6 - gl, 3, 0xa58a68, { solid: top - 2.6 - gl > 0 });
      const r = (bay - 2.2) / 2, ys = top - 2.6 - r - 1.2;
      K.archTop(gb, S, 0, 0, ys, r, top - 2.6, 3, 0xa58a68, 6, 0x8a7458);
      if (top - gl > 22) { K.box(gb, S, 0, lerp(gl, ys, 0.48), 0, bay - 2.2, 1.2, 1.4, 0x9a8060); }
      K.box(gb, S, 0, top - 2.6, 0, bay + 0.02, 2.6, 3.4, 0x9a8060);
      K.box(gb, S, 0, top, 0, bay + 0.02, 0.4, 3.8, C.peperino);
      reserve(S, 0, 0, bay, 4, 1);
    }
    acc += L;
    mapLine([[ax, az], [bx, bz]], 4, '#8a6a4a');
  }
}
