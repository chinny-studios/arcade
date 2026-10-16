// Roma Aeterna — the Forum Romanum and the Velia, laid out in the Forum frame FF (+u toward the Arch of Titus,
// +v toward the Palatine). Positions follow the real plan, squeezed a little.

// a lattice of walkways across an open square (people cross it every which way)
function navGrid(F, u0, u1, v0, v1, nu, nv, o = {}) {
  const id = [];
  for (let j = 0; j <= nv; j++) { id.push([]); for (let i = 0; i <= nu; i++) { const u = lerp(u0, u1, i / nu) + (j % 2 ? (u1 - u0) / nu * 0.3 : 0), v = lerp(v0, v1, j / nv); id[j].push(addNode(F.wx(u, v), F.wz(u, v))); } }
  const e = Object.assign({ hw: Math.min((u1 - u0) / nu, (v1 - v0) / nv) * 0.45, kind: 'plaza', dens: 1.2 }, o);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    if (i < nu) addEdge(id[j][i], id[j][i + 1], e);
    if (j < nv) addEdge(id[j][i], id[j + 1][i], e);
    if (i < nu && j < nv && (i + j) % 2 === 0) addEdge(id[j][i], id[j + 1][i + 1], e);
  }
  return id;
}
// streets given in a frame's (u, v) coordinates
const fstreet = (F, pts, o) => street(pts.map(([u, v]) => [F.wx(u, v), F.wz(u, v)]), o);
const fpath = (F, pts, o) => addPath(pts.map(([u, v]) => [F.wx(u, v), F.wz(u, v)]), o);
const fw = (F, u, v) => [F.wx(u, v), F.wz(u, v)];

function buildForum() {
  rseed('forum');
  const gbm = gbF('mon', FF);
  // ---- the paved square ----
  pavement(site(FF, -15, 0), 0, 0, 140, 54, C.trav, { slab: 3.2, layer: 'mon' });
  pavement(site(FF, 30, 18), 0, 0, 50, 14, C.trav, { slab: 3.2, layer: 'mon' });
  navGrid(FF, -76, 46, -22, 22, 6, 3);
  place('forum', 'The Roman Forum', 'Forum Romanum', FF.wx(-15, 0), FF.wz(-15, 0), 70, 'landmark', { area: 'The Forum', major: true, spawn: fw(FF, 30, 6), spawnYaw: 60 * D2R });
  placard('forum', ...fw(FF, -10, 6));

  // ---- Rostra: the speakers' platform with the bronze prows of captured warships ----
  {
    const S = site(FF, -82, 0, FACE['+u']);
    const g = gbF('mon', S);
    K.box(g, S, 0, 0, 0, 24, 3.4, 12, C.tuff, { solid: true, top: C.trav });
    K.box(g, S, 0, 3.4, -5.6, 24, 1, 0.5, C.marble, { solid: true });
    for (let i = 0; i < 6; i++) { const u = -10 + i * 4; K.tbox(g, S, u, 1.4, -6.4, 0.8, 1.4, 0.2, 0.2, 1.0, C.bronze, { ov: -0.6 }); K.box(g, S, u, 1.2, -6.15, 1.0, 0.5, 0.3, C.bronze); }
    K.stairs(g, S, 0, 0, 6, 8, 11, 3.4 / 11, 0.4, 1, C.trav);
    for (const u of [-9, -3, 3, 9]) K.statue(g, S, u, 3.4, 2, C.bronze, 'man', 0, 0.9);
    K.column(g, S, -11, 3.4, 4, 9, 0.4, 'd', C.marble);
    K.column(g, S, 11, 3.4, 4, 9, 0.4, 'd', C.marble);
    placard('rostra', ...fw(FF, -72, 6));
    W.spots.push({ kind: 'orator', x: S.wx(0, -4.3), z: S.wz(0, -4.3), y: S.y + 3.4, yaw: S.yaw + Math.PI, crowd: fw(FF, -62, 0), h: [7.5, 13] });
  }
  // the Golden Milestone and the Navel of the City
  {
    const S = site(FF, -86, 22);
    K.cyl(gbm, S, 0, 0, 0, 0.8, 0.8, 0.6, 10, C.marble, { solid: true });
    K.cyl(gbm, S, 0, 0.6, 0, 0.45, 0.42, 2.4, 10, C.gilt, { solid: true });
    placard('milliarium', S.wx(0, 2.5) , S.wz(0, 2.5));
    const U = site(FF, -86, -16);
    K.cyl(gbm, U, 0, 0, 0, 2.2, 2.2, 0.5, 14, C.trav2, { solid: true }); K.cyl(gbm, U, 0, 0.5, 0, 1.6, 1.4, 1.6, 14, C.brick, { solid: true });
  }
  // the Lacus Curtius, and the sacred fig, olive and vine
  {
    const S = site(FF, -22, 4);
    K.cyl(gbm, S, 0, 0.06, 0, 4, 4, 0.06, 16, 0xbdb39c, { top: true });
    K.ring(gbm, S, 0, 0, 0, 3.6, 4.0, 0.55, 16, C.trav, { solid: true });
    const T2 = site(FF, -8, 8);
    K.ring(gbm, T2, 0, 0, 0, 2.4, 2.7, 0.5, 12, C.trav, { solid: true });
    treeAt(T2.x - 1, T2.z, 'fig'); treeAt(T2.x + 1.4, T2.z + 0.8, 'olive', 0.7); treeAt(T2.x + 0.4, T2.z - 1.6, 'vine');
  }
  // honorific statues on bases along the square
  for (let i = 0; i < 7; i++) { const S = site(FF, -60 + i * 16, 23); K.statue(gbF('mon', S), S, 0, 0, 0, i % 3 === 0 ? C.bronze : C.marble, i === 3 ? 'horse' : 'man', FACE['-v'], 1.1); }
  for (let i = 0; i < 5; i++) { const S = site(FF, -50 + i * 20, -24); K.statue(gbF('mon', S), S, 0, 0, 0, i % 2 ? C.bronze : C.marble, 'man', FACE['+v'], 1.0); }

  // ---- Temple of Saturn: the state treasury in its podium ----
  {
    const S = site(FF, -104, 40, FACE['+u']);
    temple(S, { w: 22, d: 40, podH: 7.5, cols: 6, colH: 11, order: 'i', pron: 3, stairW: 14, roof: C.tile, pod: C.trav2 });
    K.panel(gbF('mon', S), S, 0, 1.2, -20.03, 3, 3, 0x2a1d14, -1);
    place('saturn', 'Temple of Saturn', 'Aedes Saturni', S.x, S.z, 26, 'landmark', { area: 'The Forum' });
    placard('saturn', ...fw(FF, -78, 34));
  }
  // ---- Temple of Vespasian and Titus ----
  {
    const S = site(FF, -118, 8, FACE['+u']);
    temple(S, { w: 22, d: 30, podH: 5.5, cols: 6, colH: 14, order: 'c', pron: 2, stairW: 12, stairs: 'front' });
  }
  // ---- Temple of Concord: wider than it is deep ----
  {
    const S = site(FF, -124, -25, FACE['+u']);
    const g = gbF('mon', S);
    K.box(g, S, 0, 0, 2, 44, 5, 22, C.trav2, { solid: true, top: C.trav });
    temple(S.sub(0, -11, 0, S.y), { w: 30, d: 12, podH: 5, cols: 6, colH: 13, order: 'c', pron: 1, stairW: 20, cellaW: 1, margin: 1.4 });
    K.box(g, S, 0, 5, 3, 44, 13, 18, C.marble, { solid: true });
    K.box(g, S, 0, 18, 3, 45, 2.6, 19, C.marble);
    K.gable(g, S, 0, 20.6, 3, 45.5, 19.5, 4, C.tile, { side: C.marble });
    place('concord', 'Temple of Concord', 'Aedes Concordiae', S.x, S.z, 20, 'landmark', { area: 'The Forum', big: false });
  }
  // ---- Tabularium: the record office closing the Forum under the Capitol ----
  {
    const S = site(FF, -150, -8, FACE['+u']);
    const [lo, hi] = groundRange(S, 0, 0, 66, 26);
    const g = gbF('mon', S); const y0 = lo - S.y;
    K.box(g, S, 0, y0, 0, 66, 15 - y0, 26, C.peperino, { solid: true });
    K.arcade(g, S.sub(0, -13.4, 0, S.y), -31, 31, 0, 15, 11, 1.6, 15 + 4.2, 15 + 8.4, 1.6, C.peperino, { halfCol: C.trav2 });
    K.box(g, S, 0, 15, 0.8, 66, 8.4, 24, C.peperino, { solid: true });
    K.box(g, S, 0, 23.4, 0.8, 66.4, 1.2, 24.4, C.trav2);
    K.box(g, S, 0, 24.6, 4, 60, 7, 16, C.peperino, { solid: true });
    K.hip(g, S, 0, 31.6, 4, 61, 17, 3.4, C.tile);
    for (let i = 0; i < 9; i++) K.panel(g, S, -26 + i * 6.5, 4, -13.03, 1.2, 1.8, 0x2a2018, -1);
    place('tabularium', 'Tabularium', 'Tabularium', S.x, S.z, 30, 'landmark', { area: 'The Forum', big: false });
    placard('tabularium', ...fw(FF, -128, -6));
  }

  // ---- Curia Julia: the Senate house ----
  {
    const S = site(FF, -62, -44, FACE['+v']);
    const g = gbF('mon', S);
    K.box(g, S, 0, 0, 0, 20, 1.2, 29, C.trav, { solid: true });
    K.stairs(g, S, 0, 0, -14.5, 9, 4, 0.3, 0.45, -1, C.trav);
    K.box(g, S, 0, 1.2, 1, 18, 19.5, 27, C.brick, { solid: true });
    K.box(g, S, 0, 9, -12.55, 18.05, 10.5, 0.1, C.plaster); // stucco upper front, scored to look like marble
    K.box(g, S, 0, 20.7, 1, 18.6, 1.4, 27.6, C.marble);
    K.gable(g, S, 0, 22.1, 1, 19, 28, 4.2, C.tile, { alongV: true, side: C.plaster });
    K.box(g, S, 0, 1.2, -12.6, 5.6, 7.4, 0.3, C.bronze); // the bronze doors
    K.box(g, S, 0, 8.6, -12.65, 6.6, 0.5, 0.4, C.marble);
    for (const u of [-5.5, 0, 5.5]) K.panel(g, S, u, 13, -12.66, 2.4, 4.4, 0x2a2018, -1);
    K.box(g, S, 0, 1.2, -13.6, 18, 0.4, 2, C.marble); // porch
    for (const u of [-8, -4, 4, 8]) K.column(g, S, u, 1.6, -13.8, 6, 0.32, 'd', C.marble);
    place('curia', 'The Senate House', 'Curia Iulia', S.x, S.z, 22, 'landmark', { area: 'The Forum' });
    placard('curia', ...fw(FF, -52, -27));
  }
  // ---- Basilica Aemilia with the shops of its portico ----
  {
    const S = site(FF, 5, -47, FACE['+v']);
    basilica(S, { w: 96, d: 30, nu: 16, nv: 5, base: 1.0, h1: 9, h2: 7, aisle: 7, col: C.marble2 });
    // a row of shops (tabernae) inside the front portico
    const g = gbF('mon', S);
    for (let i = 0; i < 12; i++) { const u = -40 + i * 7.3; K.box(g, S, u, 1, -9, 6.6, 0.9, 1.2, C.wood, { solid: true }); }
    place('aemilia', 'Basilica Aemilia', 'Basilica Paulli', S.x, S.z, 40, 'landmark', { area: 'The Forum' });
    placard('aemilia', ...fw(FF, 10, -25));
    W.spots.push({ kind: 'shop', x: S.wx(-18, -10.5), z: S.wz(-18, -10.5), yaw: S.yaw + Math.PI, role: 'banker' });
    W.spots.push({ kind: 'shop', x: S.wx(8, -10.5), z: S.wz(8, -10.5), yaw: S.yaw + Math.PI, role: 'banker' });
  }
  // ---- Basilica Julia: the law courts, with gaming boards scratched into its steps ----
  {
    const S = site(FF, -27, 50, FACE['-v']);
    basilica(S, { w: 90, d: 44, nu: 15, nv: 7, base: 1.6, h1: 9.5, h2: 7.5, aisle: 9, col: C.marble2 });
    place('julia', 'Basilica Julia', 'Basilica Iulia', S.x, S.z, 40, 'landmark', { area: 'The Forum' });
    placard('julia', ...fw(FF, -27, 25));
    W.spots.push({ kind: 'sit', x: S.wx(-20, -23.4), z: S.wz(-20, -23.4), y: S.y + 0.85, yaw: S.yaw + Math.PI, role: 'gamer' });
    W.spots.push({ kind: 'sit', x: S.wx(-18.8, -23.4), z: S.wz(-18.8, -23.4), y: S.y + 0.85, yaw: S.yaw + Math.PI, role: 'gamer' });
    W.spots.push({ kind: 'stand', x: S.wx(5, -10), z: S.wz(5, -10), y: S.y + 1.6, yaw: S.yaw, role: 'advocate' });
  }
  // ---- Temple of Castor and Pollux ----
  {
    const S = site(FF, 42, 48, FACE['-v']);
    temple(S, { w: 32, d: 50, podH: 7, cols: 8, peri: 11, colH: 12.5, order: 'c', stairW: 18, roof: C.tile });
    place('castor', 'Temple of Castor and Pollux', 'Aedes Castoris', S.x, S.z, 30, 'landmark', { area: 'The Forum' });
    placard('castor', ...fw(FF, 30, 18));
  }
  // the spring of Juturna, where the Twins watered their horses
  {
    const S = fountain(FF, 66, 38, { big: true, r: 2.6, a: FACE['-v'] });
    K.statue(gbF('mon', S), S, -1.8, 0.8, 0.4, C.marble, 'horse', 0, 0.6); K.statue(gbF('mon', S), S, 1.8, 0.8, 0.4, C.marble, 'horse', 0, 0.6);
  }
  // ---- Temple of the Deified Julius, on the spot where Caesar's body was burned ----
  {
    const S = site(FF, 66, -4, FACE['-u']);
    temple(S, { w: 24, d: 30, podH: 5.5, cols: 6, colH: 11, order: 'i', pron: 2, stairs: 'none', roof: C.tile });
    const g = gbF('mon', S);
    K.box(g, S, 0, 0, -16.5, 26, 3.4, 3, C.tuff, { solid: true, top: C.trav }); // its own rostra
    K.box(g, S, 0, 0, -15.2, 7, 3.4, 1.2, 0x302620); // the niche with the altar
    altar(g, S, 0, -16.6, 0.6);
    for (let i = 0; i < 2; i++) K.stairs(g, S, (i ? 1 : -1) * 11.5, 0, -18, 3, 12, 3.4 / 12, 0.36, -1, C.trav);
    place('divusjulius', 'Temple of the Deified Julius', 'Aedes Divi Iulii', S.x, S.z, 22, 'landmark', { area: 'The Forum' });
    placard('divusjulius', ...fw(FF, 46, 0));
  }
  // ---- Arch of Augustus between the temples ----
  { const S = site(FF, 54, 16, FACE['+u'] - Math.PI / 2); triArch(S, { w: 13, d: 5, h: 13, pw: 5.6, ph: 9, attic: 3.2, quadriga: true }); }
  // ---- the Regia ----
  {
    const S = site(FF, 92, 12, 0.08); const g = gbF('mon', S);
    K.box(g, S, 0, 0, 0, 13, 7, 18, C.tuff, { solid: true }); K.gable(g, S, 0, 7, 0, 14, 19, 2.6, C.tile, { alongV: true, side: C.tuff });
    K.panel(g, S, 0, 0, -9.03, 2.2, 3.8, 0x2a1d14, -1);
  }
  // ---- Temple of Vesta: the round shrine of the sacred fire ----
  {
    const S = site(FF, 80, 41, FACE['+u']);
    tholos(S, { r: 7.6, podH: 3.4, colH: 9.5, n: 20, rc: 4.8, roof: C.bronze, smoke: true });
    W.lamps.push({ x: S.x, y: S.y + 4, z: S.z, fire: true });
    place('vesta', 'Temple of Vesta', 'Aedes Vestae', S.x, S.z, 16, 'landmark', { area: 'The Forum' });
    placard('vesta', ...fw(FF, 70, 28));
  }
  // ---- House of the Vestal Virgins: rooms round a long court with pools ----
  {
    const S = site(FF, 120, 52, 0); const g = gbF('mon', S);
    const w = 56, d = 34;
    for (const [u0, v0, u1, v1] of [[-w / 2, -d / 2, w / 2, -d / 2], [-w / 2, d / 2, w / 2, d / 2], [-w / 2, -d / 2, -w / 2, d / 2], [w / 2, -d / 2, w / 2, d / 2]]) wall(g, S, u0, v0, u1, v1, 0, 12, 1, C.brick, { ext: 1 });
    for (const [u, v, ww, dd] of [[0, -d / 2 + 4, w, 8], [0, d / 2 - 4, w, 8], [-w / 2 + 4, 0, 8, d - 16], [w / 2 - 4, 0, 8, d - 16]]) { K.box(g, S, u, 0, v, ww, 11, dd, C.plaster2); K.box(g, S, u, 11, v, ww + 0.4, 0.2, dd + 0.4, C.tile2); }
    K.colonnade(g, S, -w / 2 + 9, -d / 2 + 9, w / 2 - 9, -d / 2 + 9, 9, 0, 6, 0.28, 'i', C.marble);
    K.colonnade(g, S, -w / 2 + 9, d / 2 - 9, w / 2 - 9, d / 2 - 9, 9, 0, 6, 0.28, 'i', C.marble);
    K.box(g, S, -9, 0, 0, 14, 0.5, 5, C.marble); K.box(g, S, -9, 0.5, 0, 13, 0.02, 4, C.water);
    K.box(g, S, 9, 0, 0, 14, 0.5, 5, C.marble); K.box(g, S, 9, 0.5, 0, 13, 0.02, 4, C.water);
    for (let i = 0; i < 6; i++) K.statue(g, S, -20 + i * 8, 0, (i % 2 ? 1 : -1) * 6, C.marble, 'man', i % 2 ? Math.PI : 0, 0.8);
    K.box(g, S, -w / 2 - 0.1, 0, 0, 0.3, 4, 3, C.bronze);
    place('vestals', 'House of the Vestals', 'Atrium Vestae', S.x, S.z, 30, 'landmark', { area: 'The Forum', big: false });
    placard('vestals', ...fw(FF, 90, 31));
    mapRect(S, 0, 0, w, d, '#cfae94');
  }

  // ---- streets of the Forum ----
  fstreet(FF, [[200, 18], [150, 20], [124, 24], [100, 28], [74, 27], [62, 19], [46, 15], [30, 12]], { w: 6, side: 0, kind: 'road', zone: 'forum', dens: 1.3 });
  fstreet(FF, [[-48, -26], [-46, -45], [-43, -64]], { w: 6, side: 0.8, kind: 'street', zone: 'forum', dens: 1.4 });     // Argiletum
  fstreet(FF, [[22, 26], [22, 78], [6, 100], [-40, 135], [-110, 190]], { w: 6, side: 1.2, kind: 'road', cart: true, zone: 'city' }); // Vicus Tuscus
  fstreet(FF, [[-78, 26], [-79, 76], [-100, 112], [-128, 170]], { w: 5, side: 1.0, kind: 'street', zone: 'city' });   // Vicus Iugarius
  // Clivus Capitolinus, climbing to the Capitol
  fstreet(FF, [[-78, 24], [-100, 24], [-128, 25], [-140, 28], [-152, 58], [-170, 86], [-185, 92], [-196, 80], [-192, 52]], { w: 5, side: 0, kind: 'street', zone: 'forum' });
  fpath(FF, [[-76, 22], [-78, 24]], { hw: 3, kind: 'plaza' }); fpath(FF, [[-76, -22], [-48, -26]], { hw: 3, kind: 'plaza' });
  fpath(FF, [[46, 22], [30, 12], [22, 26]], { hw: 3, kind: 'plaza' });
  // Nova Via along the foot of the Palatine behind the Vestals
  fstreet(FF, [[22, 82], [60, 86], [100, 84], [150, 78], [180, 52], [196, 24]], { w: 4.5, side: 0, kind: 'street', zone: 'city' });

  // ---- the Velia: Arch of Titus and the building site of Hadrian's new temple ----
  {
    const S = site(FF, 192, 20, FACE['+u'] - Math.PI / 2);
    const A = triArch(S, { w: 15.4, d: 4.8, h: 15, pw: 5.4, ph: 8.4, attic: 4.4, quadriga: true });
    decal(S, 0, A.body + 0.8, -2.45, 11, 2.6, ['SENATVS', 'POPVLVSQVE · ROMANVS', 'DIVO · TITO · DIVI · VESPASIANI · F', 'VESPASIANO · AVGVSTO'], { pw: 768, ph: 200, bg: '#e4dccb', ink: '#4a3a2a', size: 0.7 });
    decal(S, 0, A.body + 0.8, 2.45, 11, 2.6, ['SENATVS', 'POPVLVSQVE · ROMANVS', 'DIVO · TITO · DIVI · VESPASIANI · F', 'VESPASIANO · AVGVSTO'], { pw: 768, ph: 200, bg: '#e4dccb', ink: '#4a3a2a', size: 0.7, face: 1 });
    place('titus', 'Arch of Titus', 'Arcus Titi', S.x, S.z, 16, 'landmark', { area: 'The Forum' });
    placard('titus', ...fw(FF, 184, 30));
  }
  fstreet(FF, [[196, 24], [230, 36], [270, 44], [300, 46], [318, 40]], { w: 6, side: 0, kind: 'road', cart: true, zone: 'forum', dens: 1.2 });
}

// Hadrian's Temple of Venus and Rome, begun in 121 and still a building site: the platform, half the columns,
// scaffolding, a treadwheel crane, marble blocks and the carts that bring them (carts may enter by day for public works).
function buildVenusRoma() {
  rseed('venusroma');
  const S = site(FF, 252, -4, FACE['+u']);
  const g = gbF('mon', S), w = 56, d = 78;
  // the great stepped platform
  K.box(g, S, 0, 0, 0, w + 14, 1.6, d + 14, C.trav2, { solid: true, top: C.trav });
  K.stairs(g, S, 0, 0, -(d + 14) / 2, w + 14, 5, 0.32, 0.45, -1, C.trav);
  K.box(g, S, 0, 1.6, 0, w, 3.2, d, C.trav, { solid: true });
  K.stairs(g, S, 0, 1.6, -d / 2, w - 6, 10, 0.32, 0.4, -1, C.marble);
  // the twin cellae back to back, walls half built
  K.box(g, S, 0, 4.8, -11, 28, 11, 20, C.brick, { solid: true });
  K.box(g, S, 0, 4.8, 11, 28, 7, 20, C.brick, { solid: true });
  for (let i = 0; i < 4; i++) K.box(g, S, -10.5 + i * 7, 15.8, -11, 4, 1.4 + (i % 2) * 2, 20, C.brick);
  // columns: the front ten standing with their architrave, the sides partly up
  const r = 1.0, ch = 17;
  K.colonnade(g, S, -24, -35, 24, -35, 10, 4.8, ch, r, 'c', C.marble);
  K.box(g, S, -5, 4.8 + ch, -35, 40, 2.4, 2.6, C.marble);
  for (let k = 0; k < 7; k++) for (const s of [-1, 1]) {
    const v = -29.5 + k * 9, hh = k < 5 ? ch : k < 7 ? ch * 0.55 : ch * 0.25;
    if (hh === ch) K.column(g, S, s * 24, 4.8, v, ch, r, 'c', C.marble); else K.cyl(g, S, s * 24, 4.8, v, r, r, hh, 8, C.marble, { solid: true });
  }
  scaffold(g, S, 0, -35.5, 44, 2.4, ch + 4);
  scaffold(g, S, 24, 8, 3, 26, 14);
  // treadwheel crane (polyspastos) beside the platform
  const Cr = S.sub(-36, -14, 0.3, S.y);
  K.box(g, Cr, 0, 0, 0, 7, 0.6, 5, C.wood, { solid: true });
  for (const s of [-1, 1]) K.box(g, Cr, s * 1.4, 0.6, 0, 0.35, 5.5, 0.35, C.wood);
  K.cyl(gbF('prop', Cr), Cr.sub(0, 0, 0, Cr.y + 3.6), 0, 0, 0, 3, 3, 0.25, 12, 0x8a6a44, { a0: 0 });
  K.box(g, Cr, 0, 0.6, 1.5, 0.4, 16, 0.4, C.wood, { ra: 0 });
  K.box(g, Cr, 0, 16, 4, 0.3, 0.3, 7, C.wood);
  K.box(g, Cr, 0, 7, 7.5, 0.05, 9, 0.05, 0x3a3a3a);
  K.box(g, Cr, 0, 6, 7.5, 1.6, 1, 1.2, C.marbleW);
  W.crane = { F: Cr };
  // marble blocks and column drums lying about
  for (let i = 0; i < 26; i++) {
    const u = rnd(-45, 45), v = rnd(-58, 58);
    if (Math.abs(u) < w / 2 + 8 && Math.abs(v) < d / 2 + 8) continue;
    const B = site(S, u, v, rnd(0, 3));
    if (chance(0.5)) K.box(gbF('prop', B), B, 0, 0, 0, rnd(1.4, 3), rnd(0.8, 1.4), rnd(1, 2), chance(0.7) ? C.marbleW : C.trav, { solid: true });
    else K.cyl(gbF('prop', B), B, 0, 0, 0, 1.0, 1.0, rnd(1, 1.8), 8, C.marbleW, { solid: true });
  }
  for (let i = 0; i < 8; i++) { const u = rnd(-36, 36), v = rnd(-30, 30); W.spots.push({ kind: 'work', x: S.wx(u, v), z: S.wz(u, v), y: S.y + 4.8, yaw: rnd(0, TAU), role: 'mason' }); }
  W.spots.push({ kind: 'stand', x: S.wx(-10, -52), z: S.wz(-10, -52), yaw: S.yaw, role: 'architect' });
  place('venusroma', 'Temple of Venus and Rome', 'Templum Veneris et Romae', S.x, S.z, 50, 'landmark', { area: 'The Forum', spawn: fw(FF, 230, 40) });
  placard('venusroma', ...fw(FF, 218, 34));
  mapRect(S, 0, 0, w + 14, d + 14, '#e0d4c0');
  // the Colossus, the bronze sun god that was Nero, moved here by Hadrian
  {
    const C2 = site(FF, 300, -44, FACE['+v']), g2 = gbF('mon', C2);
    K.box(g2, C2, 0, 0, 0, 14, 7, 14, C.trav2, { solid: true });
    K.box(g2, C2, 0, 7, 0, 11, 1, 11, C.marble);
    const b = C2.sub(0, 0, 0, C2.y + 8);
    for (const s of [-1, 1]) K.tbox(g2, b, s * 1.6, 0, 0, 1.6, 1.8, 1.4, 1.5, 12, C.bronze);
    K.tbox(g2, b, 0, 12, 0, 5.2, 3, 5.6, 2.8, 9, C.bronze);
    K.box(g2, b, 0, 21, 0, 2.2, 3, 2.4, C.bronze);
    for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; K.box(g2, b, Math.sin(a) * 1.6, 23.4 + Math.cos(a) * 1.4, -0.2, 0.3, 2.2, 0.3, C.gilt, { ra: 0 }); }
    K.box(g2, b, 3.4, 15, 0, 1, 7, 1, C.bronze); K.box(g2, b, -3.4, 18, 0, 1, 6, 1, C.bronze);
    K.box(g2, b, -3.4, 24, 0, 0.4, 7, 0.4, C.bronze);
    place('colossus', 'The Colossus', 'Colossus Solis', C2.x, C2.z, 18, 'landmark', { area: 'The Colosseum valley' });
    placard('colossus', C2.wx(0, -10), C2.wz(0, -10));
  }
  // the Meta Sudans, the "sweating turning post" fountain
  {
    const M = site(FF, 306, 52), g3 = gbF('mon', M);
    K.ring(g3, M, 0, 0, 0, 7.5, 8.2, 0.9, 20, C.trav, { solid: true });
    K.cyl(g3, M, 0, 0, 0, 7.5, 7.5, 0.6, 20, C.water);
    K.cyl(g3, M, 0, 0, 0, 3.4, 2.4, 9, 16, C.brick, { solid: true });
    K.cyl(g3, M, 0, 9, 0, 2.4, 0.4, 8, 16, C.marble2);
    W.fountains.push({ x: M.x, z: M.z, big: true });
    place('metasudans', 'Meta Sudans', 'Meta Sudans', M.x, M.z, 14, 'landmark', { area: 'The Colosseum valley', big: false });
    placard('metasudans', M.wx(0, -11), M.wz(0, -11));
  }
}
