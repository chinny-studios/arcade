// 09c_metro: the MTR. Four stations, each under its real spot: Tsim Sha Tsui and Jordan on the Tsuen Wan Line,
// East Tsim Sha Tsui and Austin on the Tuen Ma Line, with the Mody Road subway linking the unpaid concourses of TST and
// East TST. Walk down a street exit, tap an Octopus card at the gates, take the escalator to the island platform, wait
// behind the platform screen doors, and ride a carriage to the next station. Trains to stations not on the map yet
// bring you back on the next train. Exits and their streets are the real ones we could confirm (see DESIGN.md);
// their spots on the pavement, and the station interiors, are approximate.
const LINES = {
  TWL: { en: 'Tsuen Wan Line', zh: '荃灣綫', col: '#e2231a' },
  TML: { en: 'Tuen Ma Line', zh: '屯馬綫', col: '#923011' },
};
// concourse z range (cz +/- len/2) and gates; dirs[0] is platform 1 on the west track, dirs[1] platform 2 on the east
const STATIONS = {
  TST: { en: 'Tsim Sha Tsui', zh: '尖沙咀', line: 'TWL', cx: -13, cz: 255, len: 150, gates: [215, 300],
    dirs: [{ to: 'Tsuen Wan', toZh: '荃灣', next: 'JOR' }, { to: 'Central', toZh: '中環', next: null, via: ['Admiralty', '金鐘'] }] },
  JOR: { en: 'Jordan', zh: '佐敦', line: 'TWL', cx: -62, cz: -592, len: 90, gates: [-612, -570],
    dirs: [{ to: 'Tsuen Wan', toZh: '荃灣', next: null, via: ['Yau Ma Tei', '油麻地'] }, { to: 'Central', toZh: '中環', next: 'TST' }] },
  ETS: { en: 'East Tsim Sha Tsui', zh: '尖東', line: 'TML', cx: 300, cz: 350, len: 200, gates: [285, 420],
    dirs: [{ to: 'Tuen Mun', toZh: '屯門', next: 'AUS' }, { to: 'Wu Kai Sha', toZh: '烏溪沙', next: null, via: ['Hung Hom', '紅磡'] }] },
  AUS: { en: 'Austin', zh: '柯士甸', line: 'TML', cx: -588, cz: -529, len: 90, gates: [-559, -515],
    dirs: [{ to: 'Tuen Mun', toZh: '屯門', next: null, via: ['Nam Cheong', '南昌'] }, { to: 'Wu Kai Sha', toZh: '烏溪沙', next: 'ETS' }] },
};
// exits: street spot (approximate, snapped to the pavement), the street it serves, and where it opens in the concourse
// ('n'/'s' end wall at an x offset, or 'w'/'e' side wall at a z)
const EXITS = [
  { st: 'TST', id: 'A1', street: 'Kowloon Park', x: -43, z: 129, wall: 'n', at: -6 },
  { st: 'TST', id: 'A2', street: 'Humphreys Avenue', x: 0, z: 150, wall: 'n', at: 6 },
  { st: 'TST', id: 'B1', street: 'Nathan Road', x: -42, z: 95, wall: 'w', at: 196 },
  { st: 'TST', id: 'B2', street: 'Cameron Road', x: -3, z: 88, wall: 'e', at: 196 },
  { st: 'TST', id: 'C1', street: 'Nathan Road', x: -30, z: 275, wall: 'w', at: 318 },
  { st: 'TST', id: 'C2', street: 'Peking Road', x: -40, z: 338, wall: 's', at: -6 },
  { st: 'TST', id: 'D1', street: 'Nathan Road', x: 5, z: 265, wall: 'e', at: 324 },
  { st: 'TST', id: 'D2', street: 'Carnarvon Road', x: 8, z: 205, wall: 's', at: 6 },
  { st: 'JOR', id: 'C1', street: 'Nathan Road', x: -85, z: -552, wall: 's', at: -5 },
  { st: 'JOR', id: 'E', street: 'Prudential Hotel', x: -40, z: -560, wall: 'e', at: -625, zh: '恆豐酒店' },
  { st: 'ETS', id: 'K', street: 'Middle Road', x: 250, z: 422, wall: 's', at: 0 },
  { st: 'ETS', id: 'P1', street: 'Mody Road', x: 300, z: 250, wall: 'n', at: -5 },
  { st: 'ETS', id: 'P3', street: 'Chatham Road South', x: 342, z: 255, wall: 'n', at: 5 },
  { st: 'AUS', id: 'F', street: 'Austin Road West', x: -462, z: -398, wall: 's', at: 0 },
];
// Octopus fares (adult, approximate)
const FARES = { 'TST-JOR': 5.4, 'ETS-AUS': 5.9, same: 4.6 };
const fareOf = (a, b) => (a === b ? FARES.same : FARES[[a, b].sort().join('-')] || FARES[a + '-' + b] || 6.5);
const Y_C = -10, Y_P = -20, PLAT_HALF = 66, DOOR_GAP = 4.4;
const MET = { scene: null, level: 'c', segs: { c: [], p: [] }, rampSegs: [], ramps: [], trains: [], ride: null, people: null, peopleN: 0, sayT: 0 };

// street names in Chinese, from the map data's road names
function streetZh(en) {
  for (const E of W.edges) if (E.name && enName(E.name) === en) return zhName(E.name);
  return { 'Kowloon Park': '九龍公園', 'Humphreys Avenue': '堪富利士道', 'Prudential Hotel': '恆豐酒店' }[en] || '';
}

// ---------------------------------------------------------------- street exits
function buildMetroExits() {
  const g = new Geo(), mk = new Geo();
  for (const X of EXITS) {
    const S = STATIONS[X.st];
    // a clear spot on the pavement near the given point, the canopy's long side along the road
    let [px, pz] = findClass(X.x, X.z, G.PAVE, 25);
    const [E] = nearestEdge(px, pz, 40);
    let ax = 0, az = 1;
    if (E) { const q = nearestOnEdge(E, px, pz); const dx = q[0] - px, dz = q[1] - pz, L = Math.hypot(dx, dz) || 1; ax = -dz / L; az = dx / L; }
    const clear = (x, z) => [[0, 0], [ax * 3, az * 3], [-ax * 3, -az * 3], [az * 1.5, -ax * 1.5], [-az * 1.5, ax * 1.5]].every(([a, b]) => gclass(x + a, z + b) === G.PAVE);
    for (let k = 0; k < 60 && !clear(px, pz); k++) { const t = k * 0.7; [px, pz] = [px + Math.cos(k * 2.4) * t * 0.3, pz + Math.sin(k * 2.4) * t * 0.3]; }
    X.sx = px; X.sz = pz; X.ax = ax; X.az = az; X.zh = X.zh || streetZh(X.street);
    // canopy: low walls on three sides, a roof, the opening at one end with stairs going down
    const yaw = Math.atan2(ax, az);
    g.setXf(new THREE.Matrix4().makeTranslation(px, KERB, pz).multiply(new THREE.Matrix4().makeRotationY(yaw)));
    g.col = [0.92, 0.92, 0.9];
    g.box(-1.35, 0, -2.8, -1.15, 2.6, 2.8, T.tiles, 2); g.box(1.15, 0, -2.8, 1.35, 2.6, 2.8, T.tiles, 2); g.box(-1.35, 0, 2.6, 1.35, 2.6, 2.8, T.tiles, 2);
    g.col = [0.75, 0.12, 0.1]; g.box(-1.5, 2.6, -3.0, 1.5, 2.95, 3.0, T.white);
    mk.setXf(g.xf);
    // the stairs go down below the pavement, so they're painted on it: darker as they go, with yellow nosings
    for (let k = 0; k < 8; k++) {
      const z = -2.6 + k * 0.65, v = 0.5 * Math.pow(0.72, k);
      mk.col = [v, v, v * 1.05]; mk.quad([-1.15, 0.04, z + 0.65], [1.15, 0.04, z + 0.65], [1.15, 0.04, z + 0.1], [-1.15, 0.04, z + 0.1], [0, 0, 1, 0, 1, 1, 0, 1], T.concrete, [0, 1, 0]);
      mk.col = [0.85 * v * 1.6, 0.7 * v * 1.6, 0.1]; mk.quad([-1.15, 0.04, z + 0.1], [1.15, 0.04, z + 0.1], [1.15, 0.04, z], [-1.15, 0.04, z], [0, 0, 1, 0, 1, 1, 0, 1], T.white, [0, 1, 0]);
    }
    g.setXf(null); mk.setXf(null); g.col = [1, 1, 1];
    addBox(px, pz, 1.4, 2.9, -yaw, 7);
    // the sign over the opening and along the road side
    const name = `${S.zh} ${X.id}|MTR ${S.en.toUpperCase()} ${X.id}`;
    const sh = signH(name, 'mtr');
    const ox = px - ax * 3.05, oz = pz - az * 3.05;      // the open end
    board(W.signGeo, ox, KERB + 2.78, oz, -az, ax, 2.9, 0.34, sh.uv, 1.0);
    board(W.signGeo, px + az * 1.55, KERB + 2.78, pz - ax * 1.55, -ax, -az, 5.8, 0.34, sh.uv, 1.0);
    board(W.signGeo, px - az * 1.55, KERB + 2.78, pz + ax * 1.55, ax, az, 5.8, 0.34, sh.uv, 1.0);
    lmGlow(px, pz, 7, '#ffe0d0', 0.5);
    X.door = [ox - ax * 0.6, oz - az * 0.6];
  }
  const m = g.mesh(MAT.world); m.name = 'mtrExits'; scene.add(m);
  const m2 = mk.mesh(MAT.mark); m2.name = 'mtrStairs'; scene.add(m2);
}

// ---------------------------------------------------------------- the underground
function metroMat() { return makeMat({ nolm: true }); }
function buildMetro() {
  const sc = MET.scene = new THREE.Scene();
  const g = new Geo(), sg = new Geo();
  const segC = (ax, az, bx, bz) => MET.segs.c.push([ax, az, bx, bz]);
  const segP = (ax, az, bx, bz) => MET.segs.p.push([ax, az, bx, bz]);
  const floor = (x0, z0, x1, z1, y, t, s = 2) => g.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [x0 / s, z1 / s, x1 / s, z1 / s, x1 / s, z0 / s, x0 / s, z0 / s], t, [0, 1, 0]);
  const ceil = (x0, z0, x1, z1, y, t) => g.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 0, (x1 - x0) / 3, 0, (x1 - x0) / 3, (z1 - z0) / 3, 0, (z1 - z0) / 3], t, [0, -1, 0]);
  const tube = (x, z0, z1, y) => { g.aux = [1.5, 0]; g.col = [1, 1, 0.97]; g.box(x - 0.12, y - 0.06, z0, x + 0.12, y, z1, T.lamp); g.aux = [0, 0]; g.col = [1, 1, 1]; };
  const sign = (name, cat, x, y, z, rx, rz, w, h, light = 1) => board(sg, x, y, z, rx, rz, w, h, signH(name, cat).uv, light);
  for (const id in STATIONS) {
    const S = STATIONS[id], L = LINES[S.line], cx = S.cx, cz = S.cz, z0 = cz - S.len / 2, z1 = cz + S.len / 2;
    S.id = id; S.z0 = z0; S.z1 = z1;
    const W2 = 11, x0 = cx - W2, x1 = cx + W2, H = 4;
    const line = hex3(parseInt(L.col.slice(1), 16));
    // ---- concourse: floor with the escalator well, ceiling, walls with openings for exits and the subway
    const rz0 = cz - 10, rz1 = cz + 10, rx0 = cx - 2.5, rx1 = cx + 2.5;
    S.ramp = { x0: rx0, x1: rx1, z0: rz0, z1: rz1 };
    MET.ramps.push(S.ramp);
    floor(x0, z0, x1, rz0, Y_C, T.terrazzo); floor(x0, rz1, x1, z1, Y_C, T.terrazzo);
    floor(x0, rz0, rx0, rz1, Y_C, T.terrazzo); floor(rx1, rz0, x1, rz1, Y_C, T.terrazzo);
    ceil(x0, z0, x1, z1, Y_C + H, T.whiteRender);
    for (let z = z0 + 4; z < z1 - 3; z += 6) { tube(cx - 6, z, z + 2.4, Y_C + H); tube(cx + 6, z, z + 2.4, Y_C + H); }
    // openings: exits and the subway, by wall
    const open = { n: [], s: [], w: [], e: [] };
    for (const X of EXITS) if (X.st === id) {
      if (X.wall === 'n' || X.wall === 's') open[X.wall].push([cx + X.at - 1.6, cx + X.at + 1.6]);
      else open[X.wall].push([X.at - 1.6, X.at + 1.6]);
    }
    if (id === 'TST') open.e.push([309.5, 314.5]);
    if (id === 'ETS') open.w.push([259.5, 264.5]);
    const wallRun = (side) => {
      // walls along a side, skipping openings; also the collision for the concourse level
      const ops = open[side].slice().sort((a, b) => a[0] - b[0]);
      const span = side === 'n' || side === 's' ? [x0, x1] : [z0, z1];
      let t = span[0];
      const piece = (a, b) => {
        if (b - a < 0.05) return;
        g.col = [0.96, 0.96, 0.94];
        if (side === 'n') { g.wall(b, z0, a, z0, Y_C, Y_C + H, T.tiles, 2, 2); segC(a, z0, b, z0); }
        if (side === 's') { g.wall(a, z1, b, z1, Y_C, Y_C + H, T.tiles, 2, 2); segC(a, z1, b, z1); }
        if (side === 'w') { g.wall(x0, a, x0, b, Y_C, Y_C + H, T.tiles, 2, 2); segC(x0, a, x0, b); }
        if (side === 'e') { g.wall(x1, b, x1, a, Y_C, Y_C + H, T.tiles, 2, 2); segC(x1, a, x1, b); }
        // a stripe in the line's colour at head height
        g.col = line;
        if (side === 'n') g.wall(b, z0 + 0.02, a, z0 + 0.02, Y_C + 2.6, Y_C + 2.9, T.white, 2, 1);
        if (side === 's') g.wall(a, z1 - 0.02, b, z1 - 0.02, Y_C + 2.6, Y_C + 2.9, T.white, 2, 1);
        if (side === 'w') g.wall(x0 + 0.02, a, x0 + 0.02, b, Y_C + 2.6, Y_C + 2.9, T.white, 2, 1);
        if (side === 'e') g.wall(x1 - 0.02, b, x1 - 0.02, a, Y_C + 2.6, Y_C + 2.9, T.white, 2, 1);
        g.col = [1, 1, 1];
      };
      for (const [a, b] of ops) { piece(t, a); t = b; }
      piece(t, span[1]);
      // the passages beyond each opening: a short dark tunnel with its exit sign above
      for (const [a, b] of ops) {
        const m = (a + b) / 2;
        const X = EXITS.find((q) => q.st === id && q.wall === side && Math.abs((side === 'n' || side === 's' ? cx + q.at : q.at) - m) < 0.1);
        if (!X) continue;
        let px, pz, nx, nz;
        if (side === 'n') { px = m; pz = z0; nx = 0; nz = -1; }
        if (side === 's') { px = m; pz = z1; nx = 0; nz = 1; }
        if (side === 'w') { px = x0; pz = m; nx = -1; nz = 0; }
        if (side === 'e') { px = x1; pz = m; nx = 1; nz = 0; }
        // recess: floor, walls and a lit end so it reads as a passage
        const ex = px + nx * 4, ez = pz + nz * 4, ux = -nz, uz = nx;
        g.col = [0.85, 0.85, 0.83];
        g.quad([px + ux * 1.6, Y_C, pz + uz * 1.6], [ex + ux * 1.6, Y_C, ez + uz * 1.6], [ex - ux * 1.6, Y_C, ez - uz * 1.6], [px - ux * 1.6, Y_C, pz - uz * 1.6], [0, 0, 1, 0, 1, 1, 0, 1], T.terrazzo);
        g.wall(px + ux * 1.6, pz + uz * 1.6, ex + ux * 1.6, ez + uz * 1.6, Y_C, Y_C + 3, T.tiles, 2, 2);
        g.wall(ex - ux * 1.6, ez - uz * 1.6, px - ux * 1.6, pz - uz * 1.6, Y_C, Y_C + 3, T.tiles, 2, 2);
        g.aux = [0.9, 0]; g.wall(ex + ux * 1.6, ez + uz * 1.6, ex - ux * 1.6, ez - uz * 1.6, Y_C, Y_C + 3, T.concrete, 3.2, 3); g.aux = [0, 0];
        g.col = [1, 1, 1];
        segC(px + ux * 1.6, pz + uz * 1.6, ex + ux * 1.6, ez + uz * 1.6); segC(px - ux * 1.6, pz - uz * 1.6, ex - ux * 1.6, ez - uz * 1.6); segC(ex + ux * 1.6, ez + uz * 1.6, ex - ux * 1.6, ez - uz * 1.6);
        sign(`${X.id} ${X.zh}|EXIT ${X.id} ${X.street.toUpperCase()}`, 'exit', px - nx * 0.05, Y_C + 3.3, pz - nz * 0.05, -uz === 0 ? -ux : -ux, -uz, 3.2, 0.8, 1.1);
        X.portal = [px - nx * 1.2, pz - nz * 1.2]; X.portalYaw = Math.atan2(-nx, -nz) + Math.PI;
        X.cs = [px + nx * 3, pz + nz * 3];
      }
    };
    for (const s of ['n', 's', 'w', 'e']) wallRun(s);
    // gate lines: barriers across the concourse; you pass by tapping
    for (const gz of S.gates) {
      g.col = [0.7, 0.72, 0.75];
      for (let x = x0 + 1; x < x1 - 0.5; x += 1.6) g.box(x - 0.15, Y_C, gz - 0.6, x + 0.15, Y_C + 1.0, gz + 0.6, T.metal);
      g.col = [0.2, 0.7, 0.3]; g.aux = [1, 0];
      for (let x = x0 + 1; x < x1 - 0.5; x += 1.6) g.box(x - 0.1, Y_C + 1.0, gz - 0.2, x + 0.1, Y_C + 1.05, gz + 0.2, T.white);
      g.aux = [0, 0]; g.col = [1, 1, 1];
      segC(x0, gz, x1, gz);
      sign(`${S.zh}|${S.en}`, 'line' + S.line, cx, Y_C + 3.3, gz - 0.7, -1, 0, 6, 1.5, 1);
      sign(`${S.zh}|${S.en}`, 'line' + S.line, cx, Y_C + 3.3, gz + 0.7, 1, 0, 6, 1.5, 1);
    }
    // the Customer Service Centre and add value machines, in the first unpaid end
    const csz = S.gates[0] - 6;
    g.col = [0.92, 0.92, 0.9]; g.box(x1 - 3.4, Y_C, csz - 2.5, x1, Y_C + 2.6, csz + 2.5, T.whiteRender, 2);
    g.aux = [0.8, 0]; g.wall(x1 - 3.42, csz + 2, x1 - 3.42, csz - 2, Y_C + 0.9, Y_C + 2.0, T.shopGlass, 4, 1.1); g.aux = [0, 0];
    sign('客務中心|CUSTOMER SERVICE', 'mtr', x1 - 3.45, Y_C + 2.35, csz, 0, 1, 3.6, 0.5, 1);
    segC(x1 - 3.4, csz - 2.5, x1 - 3.4, csz + 2.5); segC(x1 - 3.4, csz - 2.5, x1, csz - 2.5); segC(x1 - 3.4, csz + 2.5, x1, csz + 2.5);
    S.csc = [x1 - 4.6, csz];
    g.col = [0.3, 0.6, 0.85]; g.box(x0, Y_C, csz - 1, x0 + 0.8, Y_C + 1.8, csz + 1, T.white); g.col = [1, 1, 1];
    g.aux = [0.9, 0]; g.wall(x0 + 0.81, csz - 0.7, x0 + 0.81, csz + 0.7, Y_C + 0.9, Y_C + 1.6, T.carWin, 1.4, 0.7); g.aux = [0, 0];
    sign('增值機|ADD VALUE', 'tech', x0 + 0.85, Y_C + 2.1, csz, 0, -1, 1.8, 0.45, 1);
    segC(x0 + 0.8, csz - 1, x0 + 0.8, csz + 1);
    S.avm = [x0 + 1.8, csz];
    // the escalator well: balustrades around the hole, steps down
    g.col = [0.65, 0.66, 0.68];
    g.box(rx0 - 0.15, Y_C, rz0, rx0, Y_C + 1.0, rz1, T.metal); g.box(rx1, Y_C, rz0, rx1 + 0.15, Y_C + 1.0, rz1, T.metal); g.box(rx0, Y_C, rz1 - 0.15, rx1, Y_C + 1.0, rz1, T.metal);
    segC(rx0, rz0, rx0, rz1); segC(rx1, rz0, rx1, rz1); segC(rx0, rz1, rx1, rz1);
    g.col = [0.4, 0.4, 0.42];
    for (let k = 0; k < 25; k++) { const za = rz0 + k * 0.8, ya = Y_C - k * 0.4; g.box(rx0, ya - 0.4, za, rx1, ya, za + 0.8, T.metal); }
    g.col = [0.2, 0.2, 0.22]; g.box(cx - 0.15, Y_C - 10, rz0, cx + 0.15, Y_C + 0.9, rz1, T.metalDark);     // centre divider
    g.col = [1, 1, 1];
    sign('往月台|TO PLATFORMS', 'line' + S.line, cx, Y_C + 3.4, rz0 - 0.5, -1, 0, 4.4, 1.1, 1);
    // ---- platform level: island platform, screen doors, tracks, tunnel walls with the station name
    const px0 = cx - 6, px1 = cx + 6, pz0 = cz - PLAT_HALF, pz1 = cz + PLAT_HALF, T1 = -21.1, CY = -14.5;
    floor(px0, pz0, px1, pz1, Y_P, T.terrazzo);
    g.col = [0.85, 0.75, 0.2]; g.quad([px0 + 0.3, Y_P + 0.01, pz1], [px0 + 0.8, Y_P + 0.01, pz1], [px0 + 0.8, Y_P + 0.01, pz0], [px0 + 0.3, Y_P + 0.01, pz0], [0, 0, 1, 0, 1, 1, 0, 1], T.tactile, [0, 1, 0]);
    g.quad([px1 - 0.8, Y_P + 0.01, pz1], [px1 - 0.3, Y_P + 0.01, pz1], [px1 - 0.3, Y_P + 0.01, pz0], [px1 - 0.8, Y_P + 0.01, pz0], [0, 0, 1, 0, 1, 1, 0, 1], T.tactile, [0, 1, 0]);
    g.col = [0.3, 0.28, 0.26]; floor(cx - 10.5, pz0 - 30, px0, pz1 + 30, T1, T.concrete); floor(px1, pz0 - 30, cx + 10.5, pz1 + 30, T1, T.concrete);
    g.col = [0.92, 0.92, 0.9];
    ceil(cx - 10.5, pz0, rx0, pz1, CY, T.whiteRender); ceil(rx1, pz0, cx + 10.5, pz1, CY, T.whiteRender);
    ceil(rx0, pz0, rx1, rz0, CY, T.whiteRender); ceil(rx0, rz1, rx1, pz1, CY, T.whiteRender);
    for (let z = pz0 + 3; z < pz1 - 3; z += 6) tube(cx, z, z + 2.4, CY);
    // tunnel walls along both tracks, with the station's name in the line colour
    g.col = [0.82, 0.82, 0.8];
    g.wall(cx - 10.5, pz0 - 30, cx - 10.5, pz1 + 30, T1, CY, T.tiles, 2, 2);
    g.wall(cx + 10.5, pz1 + 30, cx + 10.5, pz0 - 30, T1, CY, T.tiles, 2, 2);
    g.col = line; g.wall(cx - 10.45, pz0, cx - 10.45, pz1, -18.6, -17.4, T.white, 4, 1); g.wall(cx + 10.45, pz1, cx + 10.45, pz0, -18.6, -17.4, T.white, 4, 1);
    g.col = [1, 1, 1];
    for (let z = pz0 + 8; z < pz1 - 4; z += 22) {
      sign(`${S.zh}|${S.en}`, 'line' + S.line, cx - 10.4, -17.0, z, 0, 1, 7, 1.75, 0.9);
      sign(`${S.zh}|${S.en}`, 'line' + S.line, cx + 10.4, -17.0, z, 0, -1, 7, 1.75, 0.9);
    }
    // tunnel mouths at the platform ends
    g.col = [0.05, 0.05, 0.06]; g.wall(cx - 10.5, pz0 - 30, cx + 10.5, pz0 - 30, T1, CY, T.white, 4, 4); g.wall(cx + 10.5, pz1 + 30, cx - 10.5, pz1 + 30, T1, CY, T.white, 4, 4); g.col = [1, 1, 1];
    // platform screen doors: glass with a door every 4.4 m; door leaves are separate meshes so they can open
    const doors = [new Geo(), new Geo()];
    S.doorZ = [];
    for (let z = pz0 + 2.6; z < pz1 - 1; z += DOOR_GAP) S.doorZ.push(z);
    for (const [si, xs] of [[0, px0], [1, px1]]) {
      const face = si === 0 ? 1 : -1;
      let prev = pz0;
      for (const dz of S.doorZ) {
        const a = prev, b = dz - 0.9;
        if (b > a) {
          g.col = [0.75, 0.85, 0.9]; g.aux = [0.2, 0];
          if (face > 0) g.wall(xs, a, xs, b, Y_P, Y_P + 2.3, T.carWin, 2, 2.3); else g.wall(xs, b, xs, a, Y_P, Y_P + 2.3, T.carWin, 2, 2.3);
          g.aux = [0, 0];
        }
        prev = dz + 0.9;
        const D = doors[si]; D.col = [0.7, 0.82, 0.88];
        if (face > 0) D.wall(xs + 0.02, dz - 0.9, xs + 0.02, dz + 0.9, Y_P, Y_P + 2.2, T.carWin, 1.8, 2.2); else D.wall(xs - 0.02, dz + 0.9, xs - 0.02, dz - 0.9, Y_P, Y_P + 2.2, T.carWin, 1.8, 2.2);
      }
      if (face > 0) g.wall(xs, prev, xs, pz1, Y_P, Y_P + 2.3, T.carWin, 2, 2.3); else g.wall(xs, pz1, xs, prev, Y_P, Y_P + 2.3, T.carWin, 2, 2.3);
      g.col = line;
      if (face > 0) g.wall(xs + 0.01, pz0, xs + 0.01, pz1, Y_P + 2.3, Y_P + 2.9, T.white, 4, 1); else g.wall(xs - 0.01, pz1, xs - 0.01, pz0, Y_P + 2.3, Y_P + 2.9, T.white, 4, 1);
      g.col = [1, 1, 1];
      segP(xs, pz0, xs, pz1);
      // platform number and direction, hanging over the platform edge
      const d = S.dirs[si];
      for (let z = pz0 + 18; z < pz1 - 10; z += 36) {
        sign(`${si + 1} 往${d.toZh}|${si + 1} TO ${d.to.toUpperCase()}`, 'line' + S.line, xs + face * 1.5, Y_P + 3.2, z, 0, -face, 3.4, 0.85, 1.1);
      }
    }
    for (const si of [0, 1]) { const m = doors[si].mesh(metroMat()); sc.add(m); MET[id + 'psd' + si] = m; }
    segP(px0, pz0, px1, pz0); segP(px0, pz1, px1, pz1);
    // under the escalator, the landing at the platform's south side of the well
    segP(rx0, rz0, rx0, rz1); segP(rx1, rz0, rx1, rz1); segP(rx0, rz0, rx1, rz0);
    MET.rampSegs.push([rx0, rz0, rx0, rz1], [rx1, rz0, rx1, rz1]);
    // a train on each track
    for (const si of [0, 1]) MET.trains.push(makeStationTrain(S, si));
  }
  // ---- the Mody Road subway between TST's and East TST's unpaid concourses
  const path = [[STATIONS.TST.cx + 11, 312], [110, 300], [210, 272], [STATIONS.ETS.cx - 11, 262]];
  const hw = 2.5, off = (s) => {
    const out = [];
    for (let i = 0; i < path.length; i++) {
      const p = path[i], a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      out.push([p[0] - dz / L * hw * s, p[1] + dx / L * hw * s]);
    }
    return out;
  };
  const L1 = off(1), L2 = off(-1);
  for (let i = 1; i < path.length; i++) {
    const a1 = L1[i - 1], b1 = L1[i], a2 = L2[i - 1], b2 = L2[i];
    g.col = [1, 1, 1];
    g.quad([a1[0], Y_C, a1[1]], [b1[0], Y_C, b1[1]], [b2[0], Y_C, b2[1]], [a2[0], Y_C, a2[1]], [0, 0, 3, 0, 3, 1, 0, 1], T.terrazzo);
    g.quad([a2[0], Y_C + 3, a2[1]], [b2[0], Y_C + 3, b2[1]], [b1[0], Y_C + 3, b1[1]], [a1[0], Y_C + 3, a1[1]], [0, 0, 3, 0, 3, 1, 0, 1], T.whiteRender);
    g.col = [0.95, 0.95, 0.93];
    g.wall(a1[0], a1[1], b1[0], b1[1], Y_C, Y_C + 3, T.tiles, 2, 2); g.wall(b2[0], b2[1], a2[0], a2[1], Y_C, Y_C + 3, T.tiles, 2, 2);
    segC(a1[0], a1[1], b1[0], b1[1]); segC(a2[0], a2[1], b2[0], b2[1]);
    const n = Math.floor(Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) / 8);
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, x = lerp(path[i - 1][0], path[i][0], t), z = lerp(path[i - 1][1], path[i][1], t); g.aux = [1.5, 0]; g.col = [1, 1, 0.97]; g.box(x - 0.6, Y_C + 2.94, z - 0.12, x + 0.6, Y_C + 3, z + 0.12, T.lamp); g.aux = [0, 0]; }
  }
  g.col = [1, 1, 1];
  sign('往尖東站|TO EAST TSIM SHA TSUI', 'lineTML', path[0][0] + 2, Y_C + 2.6, path[0][1], 0, 1, 4, 0.8, 1);
  sign('往尖沙咀站|TO TSIM SHA TSUI', 'lineTWL', path[3][0] - 2, Y_C + 2.6, path[3][1], 0, -1, 4, 0.8, 1);
  MET.subway = { path, L1, L2 };
  sc.add(g.mesh(metroMat()));
  MET.signMesh = sg.mesh(makeMat({ span: true, nolm: true, uniforms: { uA0: { value: SIGNS.tex } } })); sc.add(MET.signMesh);
  buildCarriage();
  initMetroPeople();
}

// ---------------------------------------------------------------- trains
const TRAIN_LEN = 130, HEADWAY = 150;
function trainGeo(lineId, interiorLit) {
  const g = new Geo(), L = TRAIN_LEN / 2, line = hex3(parseInt(LINES[lineId].col.slice(1), 16));
  g.col = [0.86, 0.87, 0.88];
  g.box(-1.55, 0, -L, 1.55, 3.6, L, { side: T.metal, top: T.roof, front: T.carWin, back: T.carWin }, 4);
  g.col = line; g.box(-1.57, 0.95, -L, 1.57, 1.25, L, T.white, 0, 'tufb');
  g.col = [1, 1, 1]; g.aux = [interiorLit ? 1.2 : 0.5, 0];
  for (const s of [-1, 1]) for (let z = -L + 1; z < L - 1; z += 3.2) {
    const x = s * 1.58;
    if (s > 0) g.wall(x, z, x, z + 2.4, 1.5, 2.6, T.carWin, 2.4, 1.1); else g.wall(x, z + 2.4, x, z, 1.5, 2.6, T.carWin, 2.4, 1.1);
  }
  g.aux = [0, 0];
  // car joints
  g.col = [0.2, 0.2, 0.22]; for (let z = -L + 22; z < L; z += 22) g.box(-1.6, 0.3, z - 0.1, 1.6, 3.5, z + 0.1, T.white);
  // headlights
  g.aux = [1.4, 0]; g.col = [1, 1, 0.9]; for (const z of [-L - 0.02, L + 0.01]) { g.box(-1.2, 0.6, z, -0.8, 0.9, z + 0.01, T.white); g.box(0.8, 0.6, z, 1.2, 0.9, z + 0.01, T.white); }
  g.aux = [0, 0];
  return g.build();
}
function trainDoorGeo(S, open) {
  const g = new Geo(); g.col = open ? [0.95, 0.95, 0.9] : [0.7, 0.72, 0.74]; if (open) g.aux = [0.9, 0];
  const tile = open ? T.whiteRender : T.doorMetal;
  for (const dz of S.doorZ) for (const s of [-1, 1]) { const x = s * 1.6, z = dz - S.cz; if (s > 0) g.wall(x, z - 0.8, x, z + 0.8, 0.1, 2.9, tile, 1.6, 2.8); else g.wall(x, z + 0.8, x, z - 0.8, 0.1, 2.9, tile, 1.6, 2.8); }
  if (open) { g.col = [0.55, 0.56, 0.58]; g.aux = [0.4, 0]; for (const dz of S.doorZ) for (const s of [-1, 1]) { const x = s * 1.605, z = dz - S.cz; if (s > 0) g.wall(x, z - 0.8, x, z + 0.8, 0.1, 0.35, T.terrazzo, 1.6, 0.3); else g.wall(x, z + 0.8, x, z - 0.8, 0.1, 0.35, T.terrazzo, 1.6, 0.3); } }
  return g.build();
}
let _trainGeos = {};
function makeStationTrain(S, si) {
  const k = S.line;
  if (!_trainGeos[k]) _trainGeos[k] = trainGeo(k);
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(_trainGeos[k], MET.trainMat || (MET.trainMat = metroMat())));
  const doors = new THREE.Mesh(trainDoorGeo(S), MET.trainMat); grp.add(doors);
  const inside = new THREE.Mesh(trainDoorGeo(S, true), MET.trainMat); inside.visible = false; grp.add(inside);
  const x = S.cx + (si === 0 ? -8.25 : 8.25);
  grp.position.set(x, -21.1 + 0.95, S.cz);
  MET.scene.add(grp);
  return { S, si, grp, doors, inside, phase: Math.random() * HEADWAY, state: 'away', dir: si === 0 ? -1 : 1 };
}
// one train per track: arrives, dwells 30 s with doors open for 25, departs; every HEADWAY seconds
function trainState(t) {
  const tt = ((t % HEADWAY) + HEADWAY) % HEADWAY;
  if (tt < 10) return { st: 'arriving', k: tt / 10 };
  if (tt < 40) return { st: 'dwell', k: (tt - 10) / 30, open: tt > 12 && tt < 36, closing: tt >= 33 && tt < 36 };
  if (tt < 50) return { st: 'leaving', k: (tt - 40) / 10 };
  return { st: 'away', k: 0 };
}
function metroOpen() { const h = CLOCK.t; return h >= 6 || h < 1; }
function updateMetro(dt) {
  if (!MET.scene) return;
  const now = UNI.uTime.value, here = PL.space === METRO_SPACE;
  for (const T2 of MET.trains) {
    const s = metroOpen() ? trainState(now + T2.phase) : { st: 'away' };
    const prev = T2.state; T2.state = s.st; T2.open = !!s.open; T2.closing = !!s.closing;
    // southbound trains (platform 2 on the Tsuen Wan Line, platform 1 on the Tuen Ma here) come from the north
    const from = T2.dir;      // -1 arrives from the north end (z-), +1 from the south
    let z = T2.S.cz;
    if (s.st === 'arriving') z = T2.S.cz + from * 200 * Math.pow(1 - s.k, 2);
    else if (s.st === 'leaving') z = T2.S.cz - from * 200 * s.k * s.k;
    else if (s.st === 'away') z = T2.S.cz + 1e4;
    T2.grp.position.z = z;
    T2.grp.visible = s.st !== 'away';
    T2.doors.visible = !s.open; T2.inside.visible = !!s.open;
    const psd = MET[T2.S.id + 'psd' + T2.si]; if (psd) psd.visible = !s.open;
    if (here && T2.S.id === MET.station && Math.abs(PL.y - Y_P) < 2) {
      if (prev !== s.st && s.st === 'arriving') bus.emit('sfx', 'trainIn');
      if (s.closing && !T2.chimed) { T2.chimed = true; bus.emit('sfx', 'doorChime'); say('請勿靠近車門。Please stand back from the doors.'); }
      if (!s.closing) T2.chimed = false;
    }
  }
  updateRide(dt);
  updateMetroPeople(dt);
}

// ---------------------------------------------------------------- announcements: captions, and speech where the browser has it
function say(text, langs) {
  toast('🔊 ' + text);
  if (!window.speechSynthesis || OPT.volume < 0.05 || DEBUG) return;
  try {
    const parts = langs || [[text.replace(/[A-Za-z].*$/, ''), 'zh-HK'], [text.replace(/^[^A-Za-z]*/, ''), 'en-GB']];
    for (const [t, lang] of parts) { if (!t.trim()) continue; const u = new SpeechSynthesisUtterance(t); u.lang = lang; u.rate = 0.95; u.volume = OPT.volume; speechSynthesis.speak(u); }
  } catch (e) { /* no speech here */ }
}

// ---------------------------------------------------------------- inside a carriage
const CAR = { x: 4000, z: 0, y: -20, len: 44 };
function buildCarriage() {
  const g = new Geo(), sg = new Geo(), X = CAR.x, Z = CAR.z, Y = CAR.y, L = CAR.len / 2;
  g.col = [0.8, 0.8, 0.82];
  g.quad([X - 1.45, Y, Z + L], [X + 1.45, Y, Z + L], [X + 1.45, Y, Z - L], [X - 1.45, Y, Z - L], [0, 0, 1, 0, 1, 10, 0, 10], T.terrazzo, [0, 1, 0]);
  g.col = [0.95, 0.95, 0.95];
  g.quad([X - 1.45, Y + 2.25, Z - L], [X + 1.45, Y + 2.25, Z - L], [X + 1.45, Y + 2.25, Z + L], [X - 1.45, Y + 2.25, Z + L], [0, 0, 1, 0, 1, 10, 0, 10], T.whiteRender, [0, -1, 0]);
  for (const s of [-1, 1]) {
    const x = X + s * 1.45;
    // walls: panels below and above the windows, and the windows onto the tunnel
    g.col = [0.88, 0.88, 0.9];
    if (s < 0) { g.wall(x, Z - L, x, Z + L, Y, Y + 0.95, T.metal, 2, 1); g.wall(x, Z - L, x, Z + L, Y + 1.85, Y + 2.25, T.metal, 2, 0.4); }
    else { g.wall(x, Z + L, x, Z - L, Y, Y + 0.95, T.metal, 2, 1); g.wall(x, Z + L, x, Z - L, Y + 1.85, Y + 2.25, T.metal, 2, 0.4); }
    g.col = [0.15, 0.17, 0.2];
    if (s < 0) g.wall(x + 0.01, Z - L, x + 0.01, Z + L, Y + 0.95, Y + 1.85, T.white, 2, 1); else g.wall(x - 0.01, Z + L, x - 0.01, Z - L, Y + 0.95, Y + 1.85, T.white, 2, 1);
    // long metal benches
    g.col = [0.72, 0.74, 0.76];
    g.box(Math.min(x, x - s * 0.55), Y, Z - L + 3, Math.max(x, x - s * 0.55), Y + 0.45, Z - 3, T.metal);
    g.box(Math.min(x, x - s * 0.55), Y, Z + 3, Math.max(x, x - s * 0.55), Y + 0.45, Z + L - 3, T.metal);
    // doors, dark grey with a window
    g.col = [0.55, 0.57, 0.6];
    for (const dz of [-L + 1.5, -2, 2 - 1.6, L - 3.1]) { if (s < 0) g.wall(x + 0.02, Z + dz, x + 0.02, Z + dz + 1.6, Y, Y + 2.0, T.doorMetal, 1.6, 2); else g.wall(x - 0.02, Z + dz + 1.6, x - 0.02, Z + dz, Y, Y + 2.0, T.doorMetal, 1.6, 2); }
  }
  // grab poles and the overhead light strips
  g.col = [0.85, 0.85, 0.85];
  for (let z = Z - L + 2; z < Z + L; z += 4) g.cyl(X, Y, z, 0.03, 2.25, 4, T.metal, null);
  g.aux = [1.6, 0]; g.col = [1, 1, 0.97]; g.box(X - 0.75, Y + 2.2, Z - L + 1, X - 0.6, Y + 2.25, Z + L - 1, T.lamp); g.box(X + 0.6, Y + 2.2, Z - L + 1, X + 0.75, Y + 2.25, Z + L - 1, T.lamp); g.aux = [0, 0];
  g.col = [0.9, 0.9, 0.9]; g.wall(X - 1.45, Z - L, X + 1.45, Z - L, Y, Y + 2.25, T.doorMetal, 2.9, 2.25); g.wall(X + 1.45, Z + L, X - 1.45, Z + L, Y, Y + 2.25, T.doorMetal, 2.9, 2.25);
  g.col = [1, 1, 1];
  MET.carMesh = g.mesh(metroMat()); MET.scene.add(MET.carMesh);
  // tunnel lights streaming past the windows
  const lg = new Geo();
  for (let k = 0; k < 14; k++) for (const s of [-1, 1]) glowQuad(lg, X + s * 2.4, Y + 1.4, Z - 60 + k * 9, 1.2, 0.5, '#ffe8c8');
  MET.tunnelLights = lg.mesh(MAT.glow); MET.tunnelLights.renderOrder = 5; MET.scene.add(MET.tunnelLights);
  MET.carSigns = new THREE.Group(); MET.scene.add(MET.carSigns);
}
// the line strip over the doors: this line's stations, the next one marked
function carSignsFor(line, toName) {
  MET.carSigns.clear();
  const sg = new Geo(), X = CAR.x, Z = CAR.z, Y = CAR.y, L = CAR.len / 2;
  const sh = signH(`往${toName[1]}|TO ${toName[0].toUpperCase()}`, 'line' + line);
  for (const s of [-1, 1]) for (const dz of [-L + 2.3, 0, L - 2.3]) board(sg, X + s * 1.43, Y + 2.05, Z + dz, 0, s, 1.6, 0.35, sh.uv, 1.1);
  MET.carSigns.add(sg.mesh(makeMat({ span: true, nolm: true, uniforms: { uA0: { value: SIGNS.tex } } })));
}
function boardTrain(T2) {
  const S = T2.S, d = S.dirs[T2.si];
  const next = d.next ? STATIONS[d.next] : null;
  const dur = next ? (S.line === 'TWL' ? 45 : 70) : 30;
  MET.ride = { from: S.id, si: T2.si, to: d.next, via: d.via, t: 0, dur, line: S.line, d, said: {} };
  carSignsFor(S.line, [d.to, d.toZh]);
  PL.space = RIDE_SPACE; PL.x = CAR.x; PL.z = CAR.z + 4; PL.y = CAR.y; PL.yaw = Math.PI / 2;
  bus.emit('sfx', 'doorChime');
}
function updateRide(dt) {
  const R = MET.ride; if (!R || PL.space !== RIDE_SPACE) return;
  R.t += dt;
  const sp = R.t < 6 ? R.t / 6 : R.t > R.dur - 8 ? Math.max(0.05, (R.dur - R.t) / 8) : 1;
  if (MET.tunnelLights) { MET.tunnelLights.position.z = ((MET.tunnelLights.position.z - dt * 18 * sp) % 9 + 9) % 9 - 4.5; }
  const nm = R.to ? [STATIONS[R.to].en, STATIONS[R.to].zh] : R.via;
  if (R.t > 2 && !R.said.a) { R.said.a = 1; say(`下一站：${nm[1]}。Next station: ${nm[0]}.`, [[`下一站，${nm[1]}`, 'zh-HK'], [`下一站，${nm[1]}`, 'zh-CN'], [`Next station, ${nm[0]}`, 'en-GB']]); }
  if (R.t > R.dur - 10 && !R.said.b) {
    R.said.b = 1;
    if (R.to) say('請小心月台空隙。Please mind the gap.', [['請小心月台空隙', 'zh-HK'], ['请小心月台空隙', 'zh-CN'], ['Please mind the gap', 'en-GB']]);
    else toast(`${nm[0]} isn't on the map yet. You'll cross the platform there and come straight back.`);
  }
  if (R.t >= R.dur && !R.done) {
    R.done = true;
    fadeOut(() => {
      let S, si;
      if (R.to) { S = STATIONS[R.to]; si = STATIONS[R.to].dirs.findIndex((q) => q.next === R.from); si = si < 0 ? 0 : 1 - si; }
      else { S = STATIONS[R.from]; si = 1 - R.si; CLOCK.t = (CLOCK.t + 0.12) % 24; toast(`You rode to ${R.via[0]} and back. It's ${clockStr()}.`); }
      // the train you're on is now standing at the platform with its doors open
      const T2 = MET.trains.find((q) => q.S === S && q.si === si);
      T2.phase = ((15 - UNI.uTime.value) % HEADWAY + HEADWAY) % HEADWAY;
      MET.ride = null;
      enterMetroAt(S, 'platform', si);
      fadeIn();
    }, 500);
  }
}
const RIDE_SPACE = {
  name: 'ride', speed: 0.6,
  ground: () => CAR.y,
  collide(x, z) { return [clamp(x, CAR.x - 0.85, CAR.x + 0.85), clamp(z, CAR.z - CAR.len / 2 + 0.4, CAR.z + CAR.len / 2 - 0.4)]; },
  allowed: () => true,
  scene: () => MET.scene,
  camOffset(p) { p.y += Math.sin(UNI.uTime.value * 7) * 0.012; },
  light() { metroLight(); },
};

// ---------------------------------------------------------------- moving about underground
function metroLight() {
  UNI.uAmb.value.setRGB(0.82, 0.84, 0.84); UNI.uSunCol.value.setRGB(0.15, 0.15, 0.15); UNI.uSunDir.value.set(0.1, 1, 0.2).normalize();
  UNI.uFogCol.value.setRGB(0.06, 0.06, 0.07); UNI.uFogNear.value = 40; UNI.uFogFar.value = 160;
}
function inRamp(x, z) { for (const R of MET.ramps) if (x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1) return R; return null; }
const METRO_SPACE = {
  name: 'metro', speed: 0.7,
  ground(x, z) {
    const R = inRamp(x, z);
    if (R) return lerp(Y_C, Y_P, clamp((z - R.z0) / (R.z1 - R.z0), 0, 1));
    return MET.level === 'c' ? Y_C : Y_P;
  },
  collide(x, z, r) {
    const R = inRamp(PL.x, PL.z);
    if (!R) { const R2 = inRamp(x, z); if (R2) MET.level = PL.z < R2.z0 + 0.5 ? 'c' : MET.level; }
    const segs = R ? MET.rampSegs : MET.segs[MET.level];
    for (let it = 0; it < 2; it++) for (const s of segs) {
      if (Math.abs(s[0] - x) > 300 && Math.abs(s[2] - x) > 300) continue;
      const d2 = segDist2(x, z, s[0], s[1], s[2], s[3]);
      if (d2 < r * r) {
        const dx = s[2] - s[0], dz = s[3] - s[1], l = dx * dx + dz * dz, t = l ? clamp(((x - s[0]) * dx + (z - s[1]) * dz) / l, 0, 1) : 0;
        const nx = x - (s[0] + dx * t), nz = z - (s[1] + dz * t), d = Math.sqrt(d2) || 1e-4;
        x += nx / d * (r - d); z += nz / d * (r - d);
      }
    }
    // leaving the ramp at either end sets the level
    if (R && !inRamp(x, z)) MET.level = z <= R.z0 ? 'c' : 'p';
    return [x, z];
  },
  allowed(x, z) {
    if (inRamp(x, z)) return true;
    if (MET.level === 'p') { for (const id in STATIONS) { const S = STATIONS[id]; if (x > S.cx - 6 && x < S.cx + 6 && z > S.cz - PLAT_HALF && z < S.cz + PLAT_HALF) return true; } return false; }
    for (const id in STATIONS) { const S = STATIONS[id]; if (x > S.cx - 11.2 && x < S.cx + 11.2 && z > S.z0 - 4.2 && z < S.z1 + 4.2) return true; if ((x < S.cx - 11 || x > S.cx + 11) && Math.abs(x - S.cx) < 15.2 && z > S.z0 && z < S.z1) return true; }
    const P = MET.subway.path;
    for (let i = 1; i < P.length; i++) if (segDist2(x, z, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]) < 2.6 * 2.6) return true;
    return false;
  },
  scene: () => MET.scene,
  light() { metroLight(); },
};
function stationAt(x, z) { for (const id in STATIONS) { const S = STATIONS[id]; if (Math.abs(x - S.cx) < 16 && z > S.z0 - 6 && z < S.z1 + 6) return id; } return null; }
// arrive in a station: at a street exit's passage, or on a platform by the train
function enterMetroAt(S, where, si) {
  PL.space = METRO_SPACE;
  if (where === 'platform') {
    MET.level = 'p';
    PL.x = S.cx + (si === 0 ? -4.8 : 4.8); PL.z = S.cz + 20; PL.y = Y_P; PL.yaw = si === 0 ? Math.PI / 2 : -Math.PI / 2;
    ST.metroIn = ST.metroIn || { st: S.id, t: CLOCK.t };
  } else {
    const X = where;
    MET.level = 'c'; PL.x = X.portal[0]; PL.z = X.portal[1]; PL.y = Y_C; PL.yaw = X.portalYaw;
  }
  PL.pitch = 0; MET.station = S.id;
}
// back where you saved: on the concourse or platform you were on, or on the platform if you were riding
function resumeMetro(p) {
  const id = stationAt(p.x, p.z) || (ST.metroIn && ST.metroIn.st) || 'TST', S = STATIONS[id];
  if (p.space === 'metro') {
    MET.level = p.level === 'p' ? 'p' : 'c';
    if (METRO_SPACE.allowed(p.x, p.z)) { PL.space = METRO_SPACE; PL.x = p.x; PL.z = p.z; PL.yaw = p.yaw || 0; PL.y = METRO_SPACE.ground(p.x, p.z); PL.pitch = 0; MET.station = id; return; }
  }
  enterMetroAt(S, 'platform', 0);
}
function paidSide(S, z) { return z > S.gates[0] && z < S.gates[1]; }

// ---------------------------------------------------------------- Octopus
function octoPay(n, what) {
  if (!ST.octopus) return false;
  if (ST.octopus.balance - n < -35) { toast('Octopus: insufficient value. Add value at a machine.'); return null; }
  ST.octopus.balance = +(ST.octopus.balance - n).toFixed(1);
  bus.emit('sfx', 'octopus');
  toast(`Octopus ✓ ${what ? what + ': ' : ''}HK$${n.toFixed(1)} · remaining HK$${ST.octopus.balance.toFixed(1)}`);
  return true;
}
function tapGate(S, gz) {
  if (!metroOpen()) { toast('The station is closed. Trains run from 6 am to 1 am.'); return; }
  if (!ST.octopus) { toast('The gates take Octopus. Buy one at the Customer Service Centre.'); return; }
  const inside = paidSide(S, PL.z);
  if (!inside) {
    if (ST.octopus.balance < 0) { toast('Octopus balance is negative. Add value first.'); return; }
    ST.metroIn = { st: S.id, t: CLOCK.t }; bus.emit('sfx', 'octopus');
    toast(`Octopus ✓ entry · balance HK$${ST.octopus.balance.toFixed(1)}`);
  } else {
    const from = ST.metroIn ? ST.metroIn.st : S.id;
    if (octoPay(fareOf(from, S.id), `${STATIONS[from].en} to ${S.en}`) === null) return;
    ST.metroIn = null;
  }
  // through the gate
  const dir = PL.z < gz ? 1 : -1;
  PL.z = gz + dir * 1.2; save();
}

// ---------------------------------------------------------------- interactions
function metroInteractions() {
  for (const X of EXITS) {
    const S = STATIONS[X.st];
    addInteract({ id: 'mtr_' + X.st + X.id, x: X.door[0], z: X.door[1], r: 3.2, label: () => `MTR ${S.en}, exit ${X.id}`, use: () => {
      if (!metroOpen()) { toast(`${S.en} station is closed. Trains run from 6 am to 1 am.`); return; }
      fadeOut(() => { enterMetroAt(S, X); fadeIn(); banner(`EXIT ${X.id}`, S.en, S.zh); save(); });
    } });
    addInteract({ id: 'mtrx_' + X.st + X.id, space: 'metro', x: 0, z: 0, r: 2.4, near() { const d = dist2(PL.x, PL.z, X.cs[0], X.cs[1]); return MET.level === 'c' && d < 2.4 * 2.4; }, label: () => `Exit ${X.id}: ${X.street}`, use: () => fadeOut(() => {
      placePlayer(X.door[0] - X.ax * 0.6, X.door[1] - X.az * 0.6, Math.atan2(X.ax, X.az), STREET);
      if (ST.metroIn) ST.metroIn = null;
      fadeIn();
    }) });
  }
  for (const id in STATIONS) {
    const S = STATIONS[id];
    for (const gz of S.gates) addInteract({ id: 'gate_' + id + gz, space: 'metro', x: 0, z: 0, r: 2, near() { return MET.level === 'c' && Math.abs(PL.z - gz) < 1.6 && Math.abs(PL.x - S.cx) < 11; }, label: () => (paidSide(S, PL.z) ? 'Tap Octopus to exit' : 'Tap Octopus to enter'), use: () => tapGate(S, gz) });
    addInteract({ id: 'csc_' + id, space: 'metro', x: S.csc[0], z: S.csc[1], r: 2.4, label: () => 'Customer Service Centre', use: () => {
      if (!ST.octopus) openDialog('Customer Service Centre', '客務中心', 'An Octopus card is HK$150: HK$100 to spend and a HK$50 deposit. It works on the MTR, the Star Ferry, buses and in most shops.', [['Buy an Octopus (HK$150)', () => { if (ST.money < 150) return toast('Not enough money.'); ST.money -= 150; ST.octopus = { balance: 100 }; bus.emit('sfx', 'coins'); toast('You have an Octopus card. Tap it at the gates.'); save(); }], ['No thanks.', null]]);
      else openDialog('Customer Service Centre', '客務中心', `Your Octopus has HK$${ST.octopus.balance.toFixed(1)} on it. The add value machines are across the concourse.`);
    } });
    addInteract({ id: 'avm_' + id, space: 'metro', x: S.avm[0], z: S.avm[1], r: 2.2, label: () => 'Add Value Machine', use: () => {
      if (!ST.octopus) return toast('Insert Octopus card. (You don\'t have one yet: the Customer Service Centre sells them.)');
      openDialog('Add Value Machine', '增值機', `Balance HK$${ST.octopus.balance.toFixed(1)}. Insert notes.`, [50, 100].map((n) => [`Add HK$${n}`, () => { if (ST.money < n) return toast('Not enough money.'); ST.money -= n; ST.octopus.balance += n; bus.emit('sfx', 'octopus'); toast(`Added HK$${n}. Balance HK$${ST.octopus.balance.toFixed(1)}.`); save(); }]).concat([['Done', null]]));
    } });
  }
  addInteract({ id: 'board', space: 'metro', x: 0, z: 0, r: 99, near() { return !!boardable(); }, label: () => { const T2 = boardable(); const d = T2.S.dirs[T2.si]; return `Board: 往${d.toZh} To ${d.to}`; }, use: () => boardTrain(boardable()) });
}
// a train with its doors open beside you on the platform
function boardable() {
  if (PL.space !== METRO_SPACE || MET.level !== 'p') return null;
  for (const T2 of MET.trains) {
    if (!T2.open || T2.S.id !== MET.station) continue;
    const xs = T2.S.cx + (T2.si === 0 ? -6 : 6);
    if (Math.abs(PL.x - xs) > 1.4) continue;
    if (T2.S.doorZ.some((dz) => Math.abs(dz - PL.z) < 1.1)) return T2;
  }
  return null;
}

// ---------------------------------------------------------------- people underground
function initMetroPeople() {
  const N = 140 + 18, g = personGeo();
  const at = (n, k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(N * k), k); g.setAttribute(n, a); return a; };
  const aS = at('iShirt', 3), aP = at('iPants', 3), aH = at('iHair', 3), aM = at('iMisc', 4);
  const m = new THREE.InstancedMesh(g, peopleMat(), N); m.frustumCulled = false; MET.scene.add(m);
  MET.people = { m, aM, list: [] };
  const r = mulberry32(31);
  MET.people.car = [];
  for (let i = 0; i < N; i++) {
    const look = randomLook(r);
    aS.setXYZ(i, ...look.shirt); aP.setXYZ(i, ...look.pants); aH.setXYZ(i, ...look.hair); aM.setXYZW(i, look.skin, r() * 6, 0, look.h);
    if (i >= 140) { const s = r() < 0.5 ? -1 : 1, seat = r() < 0.55; MET.people.car.push({ i, x: CAR.x + (seat ? s * 0.72 : (r() - 0.5) * 1.2), z: CAR.z + (r() - 0.5) * (CAR.len - 8), yaw: seat ? (s < 0 ? -Math.PI / 2 : Math.PI / 2) : r() * TAU, k: r(), seat }); continue; }
    const ids = Object.keys(STATIONS), S = STATIONS[ids[i % ids.length]];
    const walker = r() < 0.5;
    const p = { S, walker, x: S.cx + (r() - 0.5) * (walker ? 18 : 9), z: walker ? lerp(S.z0 + 3, S.z1 - 3, r()) : S.cz + (r() - 0.5) * 120, level: walker ? 'c' : 'p', yaw: r() * TAU, speed: 1.1 + r() * 0.4, phase: r() * 6, k: r() };
    p.tz = p.z; p.tx = p.x;
    MET.people.list.push(p);
  }
}
function updateMetroPeople(dt) {
  const P = MET.people; if (!P || (PL.space !== METRO_SPACE && PL.space !== RIDE_SPACE)) return;
  const h = CLOCK.t, busy = h >= 1 && h < 6 ? 0 : h < 1 ? 0.3 : h < 7 ? 0.4 : h < 10 ? 1 : h < 17 ? 0.6 : h < 21 ? 1 : 0.5;
  const M = new THREE.Matrix4();
  // on board: some lean by the benches facing across, some stand in the aisle and sway
  for (const c of P.car) {
    const on = PL.space === RIDE_SPACE && c.k < 0.25 + busy * 0.75 * OPT.crowd;
    if (!on) { P.m.setMatrixAt(c.i, M.makeScale(0, 0, 0)); continue; }
    M.makeRotationY(c.yaw + (c.seat ? 0 : Math.sin(UNI.uTime.value * 0.8 + c.i) * 0.05)); M.setPosition(c.x, CAR.y, c.z);
    P.m.setMatrixAt(c.i, M); P.aM.setZ(c.i, 0);
  }
  P.list.forEach((p, i) => {
    if (PL.space === RIDE_SPACE) { P.m.setMatrixAt(i, M.makeScale(0, 0, 0)); return; }
    const show = p.k < busy * OPT.crowd;
    if (!show) { P.m.setMatrixAt(i, M.makeScale(0, 0, 0)); return; }
    const S = p.S;
    if (p.walker) {
      // up and down the concourse, keeping to the unpaid ends and the paid middle as they please
      if (Math.abs(p.z - p.tz) < 0.5) { p.tz = lerp(S.z0 + 3, S.z1 - 3, Math.random()); p.tx = S.cx + (Math.random() - 0.5) * 16; }
      const dx = p.tx - p.x, dz = p.tz - p.z, L = Math.hypot(dx, dz) || 1;
      p.x += dx / L * p.speed * dt; p.z += dz / L * p.speed * dt; p.yaw = Math.atan2(-dx, -dz); p.phase += dt * p.speed * 5.2;
      if (S.ramp && p.x > S.ramp.x0 - 0.4 && p.x < S.ramp.x1 + 0.4 && p.z > S.ramp.z0 && p.z < S.ramp.z1) p.x = p.x < S.cx ? S.ramp.x0 - 0.5 : S.ramp.x1 + 0.5;
      P.aM.setY(i, p.phase); P.aM.setZ(i, 1);
    } else {
      // waiting by the screen doors; when a train's doors open, they board and someone new comes down
      const T2 = MET.trains.find((q) => q.S === S && q.si === (p.x < S.cx ? 0 : 1));
      if (T2 && T2.open && Math.random() < dt * 0.15) { p.z = S.cz + (Math.random() - 0.5) * 120; }
      p.yaw = p.x < S.cx ? Math.PI / 2 : -Math.PI / 2;
      P.aM.setZ(i, 0);
    }
    M.makeRotationY(p.yaw).setPosition(p.x, p.walker ? Y_C : Y_P, p.z);
    P.m.setMatrixAt(i, M);
  });
  P.m.instanceMatrix.needsUpdate = true; P.aM.needsUpdate = true;
}
