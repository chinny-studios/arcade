// Roma Aeterna — people, animals and vehicles as instanced parts. Each part is one InstancedMesh; every frame the
// visible agents write their part matrices (and colours) into them. Models face +z; a person's left is +x.

const O0 = new Frame(0, 0, 0, 0);
// apply a matrix to everything a builder function adds to gb (for tilted parts: necks, wheels, spears)
function xf(gb, m, fn) {
  const n0 = gb.n; fn();
  const e = m.elements, P = gb.pos, N = gb.nor;
  for (let i = n0; i < gb.n; i++) {
    const o = i * 3, x = P[o], y = P[o + 1], z = P[o + 2];
    P[o] = e[0] * x + e[4] * y + e[8] * z + e[12]; P[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; P[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    const nx = N[o] / 127, ny = N[o + 1] / 127, nz = N[o + 2] / 127;
    let a = e[0] * nx + e[4] * ny + e[8] * nz, b = e[1] * nx + e[5] * ny + e[9] * nz, c = e[2] * nx + e[6] * ny + e[10] * nz;
    const l = Math.hypot(a, b, c) || 1; N[o] = Math.round(a / l * 127); N[o + 1] = Math.round(b / l * 127); N[o + 2] = Math.round(c / l * 127);
  }
}
const _rm = new THREE.Matrix4(), _rt = new THREE.Matrix4();
// rotation (Euler YXZ) about a pivot
function rotAt(px, py, pz, rx, ry = 0, rz = 0) {
  _rm.makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  _rt.makeTranslation(px, py, pz); const m = _rt.clone().multiply(_rm); _rt.makeTranslation(-px, -py, -pz); return m.multiply(_rt);
}
const W1 = 0xffffff;
function makeGeo(build) { const gb = new GB(512); gb.jit = 0.04; build(gb); return gb.geometry(); }

// ---------- part geometries ----------
const PG = {};
function buildPartGeos() {
  const O = O0;
  const skinDark = 0xbbbbbb;
  // legs: thigh pivots at the hip, shin at the knee
  PG.thigh = makeGeo((g) => K.tbox(g, O, 0, -0.44, 0, 0.12, 0.13, 0.16, 0.17, 0.44, W1));
  PG.shin = makeGeo((g) => { K.tbox(g, O, 0, -0.4, 0, 0.085, 0.09, 0.12, 0.13, 0.4, W1); K.box(g, O, 0, -0.46, 0.05, 0.1, 0.07, 0.25, 0x6a4a36); });
  PG.boot = makeGeo((g) => { K.tbox(g, O, 0, -0.4, 0, 0.1, 0.1, 0.125, 0.135, 0.3, 0x5a4030); K.tbox(g, O, 0, -0.1, 0, 0.12, 0.13, 0.12, 0.13, 0.1, W1); K.box(g, O, 0, -0.46, 0.05, 0.11, 0.08, 0.26, 0x4a3226); });
  PG.arm = makeGeo((g) => { K.tbox(g, O, 0, -0.3, 0, 0.085, 0.09, 0.1, 0.1, 0.3, W1); K.tbox(g, O, 0, -0.56, 0, 0.065, 0.07, 0.08, 0.085, 0.26, W1); K.box(g, O, 0, -0.66, 0.01, 0.075, 0.1, 0.05, W1); });
  // bodies (origin at the feet)
  PG.tunic = makeGeo((g) => {
    K.tbox(g, O, 0, 0.55, 0, 0.5, 0.3, 0.44, 0.24, 0.89, W1);
    for (const s of [-1, 1]) K.box(g, O, s * 0.255, 1.22, 0, 0.15, 0.2, 0.22, W1);
    K.box(g, O, 0, 0.97, 0, 0.48, 0.06, 0.29, 0x8a7a66);
  });
  PG.tunicClavus = makeGeo((g) => { // white tunic with the broad purple stripes of a senator
    K.tbox(g, O, 0, 0.55, 0, 0.5, 0.3, 0.44, 0.24, 0.89, W1);
    for (const s of [-1, 1]) { K.box(g, O, s * 0.255, 1.22, 0, 0.15, 0.2, 0.22, W1); K.box(g, O, s * 0.09, 0.56, 0.14, 0.07, 0.88, 0.02, 0x6a2a56); }
  });
  PG.dress = makeGeo((g) => {
    K.tbox(g, O, 0, 0.05, 0, 0.58, 0.44, 0.42, 0.25, 1.39, W1);
    for (const s of [-1, 1]) K.box(g, O, s * 0.255, 1.06, 0, 0.15, 0.36, 0.22, W1);
    K.box(g, O, 0, 1.12, 0, 0.44, 0.05, 0.27, 0xd8cfbc);
  });
  const toga = (g, border) => {
    K.tbox(g, O, 0, 0.07, 0, 0.62, 0.46, 0.5, 0.29, 1.34, W1);
    xf(g, rotAt(0, 1.08, 0.15, 0, 0, 0.62), () => K.box(g, O, 0.02, 1.0, 0.15, 0.56, 0.14, 0.08, border ? 0x7a2a5a : 0xe0dccf));
    K.box(g, O, 0.27, 0.86, 0, 0.17, 0.58, 0.3, W1);
    K.box(g, O, 0, 0.62, 0.21, 0.36, 0.3, 0.06, 0xe8e4da);
    if (border) K.box(g, O, -0.1, 0.07, 0.23, 0.42, 0.06, 0.02, 0x7a2a5a);
  };
  PG.toga = makeGeo((g) => toga(g, false));
  PG.togaP = makeGeo((g) => toga(g, true));
  PG.cloak = makeGeo((g) => { K.tbox(g, O, 0, 0.62, -0.12, 0.52, 0.12, 0.46, 0.08, 0.82, W1); K.tbox(g, O, 0, 1.28, 0, 0.56, 0.36, 0.46, 0.3, 0.18, W1); });
  PG.paenula = makeGeo((g) => { K.tbox(g, O, 0, 0.6, 0, 0.66, 0.46, 0.38, 0.28, 0.86, W1); K.box(g, O, 0, 1.26, -0.12, 0.24, 0.22, 0.12, W1); });
  PG.lorica = makeGeo((g) => {
    for (let i = 0; i < 6; i++) K.tbox(g, O, 0, 0.98 + i * 0.075, 0, 0.5, 0.3, 0.48, 0.28, 0.072, i % 2 ? 0xd8d8d8 : W1);
    for (const s of [-1, 1]) K.box(g, O, s * 0.25, 1.32, 0, 0.18, 0.12, 0.28, W1);
    for (let i = 0; i < 4; i++) K.box(g, O, -0.09 + i * 0.06, 0.7, 0.16, 0.03, 0.28, 0.02, 0x8a6a3a);
    K.box(g, O, 0, 0.96, 0, 0.5, 0.05, 0.31, 0x8a6a3a);
  });
  // head and hair (origin at the base of the neck, 1.45 m up)
  PG.head = makeGeo((g) => {
    K.cyl(g, O, 0, 0, 0, 0.056, 0.05, 0.09, 6, W1, { top: false });
    K.box(g, O, 0, 0.06, 0, 0.19, 0.23, 0.21, W1);
    K.tbox(g, O, 0, 0.13, 0.115, 0.04, 0.03, 0.025, 0.02, 0.07, W1);
    for (const s of [-1, 1]) { K.box(g, O, s * 0.1, 0.13, -0.01, 0.025, 0.06, 0.04, W1); K.box(g, O, s * 0.045, 0.19, 0.105, 0.035, 0.022, 0.01, 0x222222); }
    K.box(g, O, 0, 0.1, 0.105, 0.06, 0.012, 0.01, 0x9a6a5a);
  });
  PG.hairShort = makeGeo((g) => { K.box(g, O, 0, 0.255, -0.005, 0.205, 0.06, 0.225, W1); K.box(g, O, 0, 0.13, -0.095, 0.205, 0.15, 0.05, W1); K.box(g, O, 0, 0.255, 0.1, 0.19, 0.035, 0.03, W1); });
  PG.hairCurly = makeGeo((g) => {
    K.box(g, O, 0, 0.25, -0.005, 0.21, 0.07, 0.23, W1); K.box(g, O, 0, 0.12, -0.1, 0.21, 0.18, 0.05, W1);
    for (let i = 0; i < 7; i++) K.box(g, O, -0.09 + i * 0.03, 0.26 + (i % 2) * 0.02, 0.1, 0.035, 0.04, 0.035, W1);
    for (let i = 0; i < 6; i++) K.box(g, O, -0.08 + i * 0.032, 0.31, -0.06 + (i % 3) * 0.06, 0.04, 0.03, 0.04, W1);
  });
  PG.hairLong = makeGeo((g) => {
    K.box(g, O, 0, 0.25, -0.01, 0.21, 0.07, 0.23, W1); K.box(g, O, 0, 0.1, -0.1, 0.2, 0.19, 0.05, W1);
    K.box(g, O, 0, 0.22, -0.15, 0.11, 0.1, 0.09, W1);
    for (const s of [-1, 1]) K.box(g, O, s * 0.1, 0.13, 0.02, 0.03, 0.14, 0.14, W1);
    K.box(g, O, 0, 0.29, 0.06, 0.18, 0.03, 0.08, W1);
  });
  PG.beard = makeGeo((g) => { K.tbox(g, O, 0, 0.04, 0.05, 0.16, 0.1, 0.2, 0.13, 0.11, W1); K.box(g, O, 0, 0.115, 0.108, 0.08, 0.02, 0.012, W1); });
  PG.palla = makeGeo((g) => {
    K.box(g, O, 0, 0.0, -0.13, 0.27, 0.36, 0.05, W1); K.box(g, O, 0, 0.3, -0.01, 0.25, 0.04, 0.26, W1);
    for (const s of [-1, 1]) K.box(g, O, s * 0.125, 0.0, -0.01, 0.03, 0.32, 0.24, W1);
    K.tbox(g, O, 0, -0.22, -0.02, 0.56, 0.34, 0.38, 0.27, 0.24, W1);
  });
  PG.pileus = makeGeo((g) => K.cyl(g, O, 0, 0.24, -0.01, 0.112, 0.07, 0.13, 8, W1));
  PG.petasus = makeGeo((g) => { K.cyl(g, O, 0, 0.27, 0, 0.24, 0.22, 0.025, 10, W1); K.cyl(g, O, 0, 0.29, 0, 0.11, 0.09, 0.08, 8, W1); });
  PG.helmet = makeGeo((g) => {
    K.dome(g, O.sub(0, 0, 0, 0.2), 0, 0, 0, 0.13, 8, 3, W1, { squash: 0.9 });
    K.box(g, O, 0, 0.12, -0.12, 0.2, 0.1, 0.06, W1);
    for (const s of [-1, 1]) K.box(g, O, s * 0.11, 0.06, 0.03, 0.02, 0.13, 0.1, W1);
    K.box(g, O, 0, 0.32, -0.02, 0.03, 0.08, 0.24, 0xb02a1e);
    K.box(g, O, 0, 0.21, 0.12, 0.2, 0.02, 0.05, W1);
  });
  // carried things (origin: at the feet; placed relative to the body)
  PG.amphora = makeGeo((g) => { K.cyl(g, O, 0, 0, 0, 0.04, 0.17, 0.22, 8, 0xb8724a); K.cyl(g, O, 0, 0.22, 0, 0.17, 0.11, 0.3, 8, 0xb8724a); K.cyl(g, O, 0, 0.52, 0, 0.05, 0.05, 0.18, 6, 0xb8724a); for (const s of [-1, 1]) K.box(g, O, s * 0.07, 0.55, 0, 0.02, 0.13, 0.03, 0xa8643a); });
  PG.basket = makeGeo((g) => { K.cyl(g, O, 0, 0, 0, 0.18, 0.25, 0.2, 8, 0xb8935a); for (let i = 0; i < 5; i++) K.box(g, O, -0.12 + i * 0.06, 0.16, (i % 2) * 0.06 - 0.03, 0.08, 0.09, 0.08, [0xa83a2a, 0x6a8a3a, 0xd28a32, 0xd8c060, 0x8a5a9a][i]); });
  PG.sack = makeGeo((g) => { K.tbox(g, O, 0, 0, 0, 0.32, 0.22, 0.24, 0.16, 0.5, 0xb8a888); K.box(g, O, 0, 0.5, 0, 0.1, 0.06, 0.1, 0x8a7a5a); });
  PG.jar = makeGeo((g) => { K.cyl(g, O, 0, 0, 0, 0.1, 0.16, 0.12, 8, 0xc08a5a); K.cyl(g, O, 0, 0.12, 0, 0.16, 0.08, 0.16, 8, 0xc08a5a); K.cyl(g, O, 0, 0.28, 0, 0.05, 0.06, 0.06, 6, 0xc08a5a); });
  PG.torch = makeGeo((g) => { K.box(g, O, 0, -0.1, 0, 0.04, 0.7, 0.04, 0x5a4030); K.cyl(g, O, 0, 0.55, 0, 0.05, 0.06, 0.12, 6, 0x3a2a1a); });
  PG.flame = makeGeo((g) => { g.jit = 0; K.cyl(g, O, 0, 0, 0, 0.09, 0.0, 0.32, 5, 0xffb040); K.cyl(g, O, 0, 0, 0, 0.05, 0.0, 0.2, 5, 0xfff0a0); K.cyl(g, O, 0, -0.05, 0, 0.03, 0.08, 0.05, 5, 0xff7020); });
  PG.bucket = makeGeo((g) => { K.cyl(g, O, 0, 0, 0, 0.11, 0.13, 0.22, 7, 0x6a5a3a); K.box(g, O, 0, 0.26, 0, 0.24, 0.015, 0.015, 0x3a3a3a); });
  PG.fasces = makeGeo((g) => { K.cyl(g, O, 0, 0, 0, 0.06, 0.06, 1.2, 6, 0x9a7a4a); K.box(g, O, 0, 0.3, 0, 0.13, 0.05, 0.13, 0x8a2a20); K.box(g, O, 0.08, 1.05, 0, 0.12, 0.16, 0.02, 0xbbbbbb); });
  PG.staff = makeGeo((g) => K.box(g, O, 0, -0.9, 0, 0.035, 1.75, 0.035, 0x6a5038));
  PG.spear = makeGeo((g) => { K.box(g, O, 0, -0.9, 0, 0.03, 1.7, 0.03, 0x7a5a38); K.tbox(g, O, 0, 0.8, 0, 0.02, 0.02, 0.005, 0.005, 0.5, 0x9a9a9a); });
  PG.sword = makeGeo((g) => { K.box(g, O, 0, -0.55, 0, 0.05, 0.55, 0.012, 0xc0c0c0); K.box(g, O, 0, 0, 0, 0.12, 0.03, 0.04, 0x8a6a3a); K.box(g, O, 0, 0.0, 0, 0.03, 0.1, 0.03, 0x5a4030); });
  PG.shield = makeGeo((g) => { // a curved red scutum with a bronze boss
    for (let i = 0; i < 4; i++) { const a = -0.45 + i * 0.3; K.box(g, O, Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4 - 0.4, 0.17, 1.0, 0.03, i === 1 || i === 2 ? 0xa82a20 : 0x9a2620, { ra: -a }); }
    K.cyl(g, O.sub(0, 0, 0, 0.5), 0, -0.07, 0.02, 0.08, 0.05, 0.06, 8, 0xc8a050);
    K.box(g, O, 0, 0.47, -0.02, 0.62, 0.05, 0.04, 0xc8a050);
  });
  PG.parma = makeGeo((g) => { K.cyl(g, O, 0, -0.03, 0, 0.3, 0.3, 0.05, 10, 0x9a6a3a); }); // round gladiator shield (rotated in use)
  PG.tablet = makeGeo((g) => { K.box(g, O, 0, 0, 0, 0.2, 0.02, 0.14, 0x6a4a2a); K.box(g, O, 0, 0.02, 0, 0.17, 0.005, 0.11, 0x3a3a2a); });
  PG.scroll = makeGeo((g) => { xf(g, rotAt(0, 0, 0, 0, 0, Math.PI / 2), () => K.cyl(g, O, 0, -0.12, 0, 0.03, 0.03, 0.24, 6, 0xe8dcbc)); });
  // ---- animals ----
  const horse = (g, donkey) => {
    K.tbox(g, O, 0, 0.82, 0, 0.42, 1.25, 0.5, 1.45, 0.58, W1);
    K.box(g, O, 0, 0.95, 0.62, 0.46, 0.5, 0.3, W1);
    K.box(g, O, 0, 0.92, -0.62, 0.46, 0.48, 0.3, W1);
  };
  PG.horseBody = makeGeo((g) => horse(g));
  PG.saddle = makeGeo((g) => { K.box(g, O, 0, 1.38, 0.05, 0.56, 0.08, 0.6, W1); K.box(g, O, 0, 1.0, 0.05, 0.6, 0.38, 0.5, W1); });
  PG.horseHead = makeGeo((g) => { // pivot at the withers
    xf(g, rotAt(0, 0, 0, -0.75), () => { K.tbox(g, O, 0, 0, 0, 0.26, 0.42, 0.2, 0.28, 0.72, W1); K.box(g, O, 0, 0.1, -0.16, 0.06, 0.7, 0.1, 0x3a2a1e); });
    xf(g, rotAt(0, 0.62, 0.48, 0.55), () => { K.tbox(g, O, 0, 0.42, 0.48, 0.2, 0.26, 0.15, 0.6, 0.18, W1); K.box(g, O, 0, 0.52, 0.22, 0.2, 0.22, 0.26, W1); for (const s of [-1, 1]) K.box(g, O, s * 0.07, 0.66, 0.16, 0.05, 0.13, 0.04, W1); });
  });
  PG.donkeyHead = makeGeo((g) => {
    xf(g, rotAt(0, 0, 0, -0.55), () => { K.tbox(g, O, 0, 0, 0, 0.24, 0.36, 0.18, 0.26, 0.55, W1); K.box(g, O, 0, 0.08, -0.12, 0.05, 0.5, 0.08, 0x3a3430); });
    xf(g, rotAt(0, 0.48, 0.36, 0.7), () => { K.tbox(g, O, 0, 0.3, 0.4, 0.2, 0.24, 0.15, 0.55, 0.18, W1); K.box(g, O, 0, 0.4, 0.15, 0.2, 0.22, 0.24, W1); for (const s of [-1, 1]) K.box(g, O, s * 0.07, 0.58, 0.08, 0.05, 0.3, 0.05, W1); K.box(g, O, 0, 0.33, 0.68, 0.16, 0.12, 0.05, 0xd8d0c8); });
  });
  PG.horseLeg = makeGeo((g) => { K.tbox(g, O, 0, -0.8, 0, 0.075, 0.085, 0.13, 0.15, 0.78, W1); K.box(g, O, 0, -0.86, 0.01, 0.1, 0.08, 0.12, 0x2a2420); });
  PG.horseTail = makeGeo((g) => xf(g, rotAt(0, 0, 0, 0.25), () => K.tbox(g, O, 0, -0.75, -0.04, 0.07, 0.07, 0.11, 0.11, 0.75, 0x3a2a1e)));
  PG.oxBody = makeGeo((g) => { K.tbox(g, O, 0, 0.62, 0, 0.6, 1.7, 0.7, 1.8, 0.66, W1); K.box(g, O, 0, 1.1, 0.55, 0.3, 0.16, 0.3, W1); K.box(g, O, 0, 0.5, 0.65, 0.2, 0.3, 0.2, W1); });
  PG.oxHead = makeGeo((g) => { K.tbox(g, O, 0, -0.3, 0.2, 0.26, 0.36, 0.3, 0.32, 0.44, W1); K.box(g, O, 0, -0.32, 0.4, 0.22, 0.16, 0.12, 0xd8c8b8); for (const s of [-1, 1]) xf(g, rotAt(0, 0, 0, 0, 0, s * 0.9), () => K.tbox(g, O, s * 0.2, 0.0, 0.2, 0.06, 0.06, 0.02, 0.02, 0.3, 0xe8e0c8)); });
  PG.oxLeg = makeGeo((g) => { K.tbox(g, O, 0, -0.62, 0, 0.1, 0.1, 0.15, 0.16, 0.6, W1); K.box(g, O, 0, -0.66, 0.02, 0.12, 0.06, 0.13, 0x2a2420); });
  PG.sheep = makeGeo((g) => { blob(g, O, 0, 0.55, 0, 0.32, 0.26, 0xf0ece0, 6, 2); K.box(g, O, 0, 0.55, 0.38, 0.14, 0.18, 0.2, 0x3a3430); for (const [a, b] of [[-0.12, -0.18], [0.12, -0.18], [-0.12, 0.18], [0.12, 0.18]]) K.box(g, O, a, 0, b, 0.06, 0.38, 0.06, 0x3a3430); });
  PG.dog = makeGeo((g) => { K.box(g, O, 0, 0.32, 0, 0.18, 0.2, 0.55, W1); K.box(g, O, 0, 0.42, 0.34, 0.15, 0.17, 0.2, W1); K.box(g, O, 0, 0.44, -0.33, 0.05, 0.05, 0.22, W1); for (const [a, b] of [[-0.06, -0.2], [0.06, -0.2], [-0.06, 0.2], [0.06, 0.2]]) K.box(g, O, a, 0, b, 0.05, 0.32, 0.05, W1); });
  // ---- vehicles ----
  PG.cartBed = makeGeo((g) => {
    K.box(g, O, 0, 0.72, 0, 1.3, 0.1, 2.6, 0x8a6a44);
    for (const s of [-1, 1]) { K.box(g, O, s * 0.62, 0.82, 0, 0.06, 0.4, 2.6, 0x7a5a38); for (let i = 0; i < 4; i++) K.box(g, O, s * 0.62, 0.82, -1.1 + i * 0.73, 0.08, 0.5, 0.08, 0x5a3c24); }
    K.box(g, O, 0, 0.82, -1.28, 1.3, 0.4, 0.06, 0x7a5a38);
    K.box(g, O, 0, 0.62, 2.4, 0.1, 0.1, 2.6, 0x6a4a2e); // the pole
    K.box(g, O, 0, 0.62, 0.0, 1.6, 0.1, 0.12, 0x5a3c24); // axle
    K.box(g, O, 0, 0.95, 3.6, 1.5, 0.1, 0.12, 0x6a4a2e); // the yoke
  });
  PG.wheelSolid = makeGeo((g) => xf(g, rotAt(0, 0, 0, 0, 0, Math.PI / 2), () => { K.cyl(g, O, 0, -0.06, 0, 0.55, 0.55, 0.12, 10, 0x6a4a2e, { bot: true }); K.cyl(g, O, 0, -0.1, 0, 0.12, 0.12, 0.2, 6, 0x4a3426); K.box(g, O, 0, -0.07, 0, 0.9, 0.14, 0.08, 0x5a3c24); }));
  PG.wheelSpoke = makeGeo((g) => xf(g, rotAt(0, 0, 0, 0, 0, Math.PI / 2), () => { K.ring(g, O, 0, -0.04, 0, 0.5, 0.58, 0.08, 14, 0x5a3c24); K.cyl(g, O, 0, -0.08, 0, 0.09, 0.09, 0.16, 6, 0x4a3426); for (let i = 0; i < 4; i++) K.box(g, O, 0, -0.03, 0, 1.0, 0.06, 0.05, 0x6a4a2e, { ra: i * Math.PI / 4 }); }));
  PG.loadAmph = makeGeo((g) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) xf(g, rotAt(-0.4 + i * 0.4, 1.0, -0.9 + j * 0.6, Math.PI / 2), () => { K.cyl(g, O, -0.4 + i * 0.4, 0.7, -0.9 + j * 0.6, 0.04, 0.16, 0.2, 7, 0xb8724a); K.cyl(g, O, -0.4 + i * 0.4, 0.9, -0.9 + j * 0.6, 0.16, 0.08, 0.3, 7, 0xb8724a); }); K.box(g, O, 0, 0.78, 0, 1.15, 0.2, 2.4, 0xc8b070); });
  PG.loadBlock = makeGeo((g) => K.box(g, O, 0, 0.78, 0, 1.0, 0.85, 1.6, 0xece6da));
  PG.loadHay = makeGeo((g) => { K.tbox(g, O, 0, 0.78, 0, 1.3, 2.5, 0.9, 1.9, 0.9, 0xd8c070); });
  PG.loadSacks = makeGeo((g) => { for (let i = 0; i < 6; i++) K.tbox(g, O, -0.3 + (i % 2) * 0.6, 0.78 + Math.floor(i / 4) * 0.35, -0.8 + (i % 3) * 0.8, 0.5, 0.6, 0.4, 0.5, 0.35, 0xb8a888); });
  PG.loadBarrels = makeGeo((g) => { for (let i = 0; i < 4; i++) xf(g, rotAt(0, 1.05, -0.8 + i * 0.55, Math.PI / 2), () => K.cyl(g, O, 0, 0.8, -0.8 + i * 0.55, 0.26, 0.26, 0.5, 8, 0x8a6a44)); });
  PG.raeda = makeGeo((g) => { // a four-wheeled travelling carriage with a cloth hood
    K.box(g, O, 0, 0.9, 0, 1.4, 0.12, 3.0, 0x6a4a2e);
    for (const s of [-1, 1]) K.box(g, O, s * 0.66, 1.02, 0, 0.06, 0.55, 3.0, 0x7a5a38);
    for (let i = 0; i < 4; i++) K.box(g, O, 0, 1.02, -1.2 + i * 0.8, 1.3, 0.35, 0.1, 0x5a3c24);
    K.tbox(g, O, 0, 1.55, -0.3, 1.45, 2.1, 1.2, 1.9, 0.7, W1);
    K.box(g, O, 0, 0.7, 2.6, 0.1, 0.1, 2.4, 0x6a4a2e); K.box(g, O, 0, 0.72, 0, 1.6, 0.1, 0.12, 0x5a3c24); K.box(g, O, 0, 0.72, 1.4, 1.6, 0.1, 0.12, 0x5a3c24);
  });
  PG.chariot = makeGeo((g) => { K.box(g, O, 0, 0.5, 0, 0.9, 0.08, 0.7, 0x6a4a2e); xf(g, rotAt(0, 0.55, 0.35, -0.1), () => K.tbox(g, O, 0, 0.55, 0.32, 0.95, 0.08, 0.8, 0.08, 0.6, W1)); for (const s of [-1, 1]) K.box(g, O, s * 0.43, 0.55, 0, 0.05, 0.45, 0.6, W1); K.box(g, O, 0, 0.5, 1.6, 0.08, 0.08, 2.4, 0x6a4a2e); K.box(g, O, 0, 0.4, 0, 1.3, 0.07, 0.07, 0x4a3426); K.box(g, O, 0, 1.0, 2.7, 1.9, 0.06, 0.08, 0x6a4a2e); });
  PG.litter = makeGeo((g) => { // lectica: a curtained bed carried on poles
    K.box(g, O, 0, 0.0, 0, 0.9, 0.4, 2.0, 0x6a3a2a);
    for (const s of [-1, 1]) for (const t of [-1, 1]) K.box(g, O, s * 0.42, 0.4, t * 0.92, 0.06, 0.9, 0.06, C.gilt);
    K.box(g, O, 0, 1.3, 0, 1.0, 0.1, 2.1, W1);
    for (const s of [-1, 1]) K.box(g, O, s * 0.47, 0.42, 0, 0.03, 0.8, 1.6, W1);
    for (const s of [-1, 1]) K.box(g, O, s * 0.52, 0.12, 0, 0.07, 0.07, 4.2, 0x5a3c24);
    K.box(g, O, 0, 0.42, -0.2, 0.7, 0.18, 1.4, 0xe8dcc4);
  });
}

// ---------- instanced part registry ----------
const IP = {};
const _col = new THREE.Color();
class IPart {
  constructor(geo, max, mat, shadow = true) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, _col.setHex(0xffffff));
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.castShadow = shadow; this.mesh.receiveShadow = true;
    this.mesh.count = 0; this.n = 0; this.max = max;
    this.M = this.mesh.instanceMatrix.array; this.Cc = this.mesh.instanceColor.array;
    R.scene.add(this.mesh);
  }
  // world position p, root yaw, uniform scale s; local offset o (in the root's frame, before scale);
  // local rotation (rx pitch, ry yaw, rz roll); colour; non-uniform part scale
  put(px, py, pz, yaw, s, ox, oy, oz, rx, ry, rz, hex, sx = 1, sy = 1, sz = 1) {
    if (this.n >= this.max) return;
    const i = this.n++, m = this.M, o = i * 16;
    const y = yaw + ry, a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(y), d = Math.sin(y), e = Math.cos(rz), f = Math.sin(rz);
    const ce = c * e, cf = c * f, de = d * e, df = d * f;
    const k0 = s * sx, k1 = s * sy, k2 = s * sz;
    m[o] = (ce + df * b) * k0; m[o + 1] = a * f * k0; m[o + 2] = (cf * b - de) * k0; m[o + 3] = 0;
    m[o + 4] = (de * b - cf) * k1; m[o + 5] = a * e * k1; m[o + 6] = (df + ce * b) * k1; m[o + 7] = 0;
    m[o + 8] = a * d * k2; m[o + 9] = -b * k2; m[o + 10] = a * c * k2; m[o + 11] = 0;
    const cy = Math.cos(yaw), sy2 = Math.sin(yaw);
    m[o + 12] = px + (ox * cy + oz * sy2) * s; m[o + 13] = py + oy * s; m[o + 14] = pz + (-ox * sy2 + oz * cy) * s; m[o + 15] = 1;
    const cc = this.Cc, q = i * 3; cc[q] = ((hex >> 16) & 255) / 255; cc[q + 1] = ((hex >> 8) & 255) / 255; cc[q + 2] = (hex & 255) / 255;
  }
  begin() { this.n = 0; }
  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; }
}
// the knee/hand: where a limb of length L hanging from a joint at (ox, oy, oz) ends when pitched by rx (root yaw yaw)
function limbEnd(oy, L, rx) { return [oy - Math.cos(rx) * L, Math.sin(rx) * L]; } // [y, z] in the root frame
function initParts() {
  buildPartGeos();
  const m = R.mat.person, glow = R.mat.flame;
  const N = { thigh: 1400, shin: 1400, boot: 400, arm: 1400, tunic: 600, tunicClavus: 60, dress: 300, toga: 120, togaP: 40, cloak: 200, paenula: 120, lorica: 120, head: 700, hairShort: 500, hairCurly: 300, hairLong: 300, beard: 300, palla: 200, pileus: 150, petasus: 150, helmet: 150, amphora: 80, basket: 80, sack: 80, jar: 60, torch: 80, bucket: 60, fasces: 40, staff: 120, spear: 120, sword: 60, shield: 120, parma: 20, tablet: 30, scroll: 30,
    horseBody: 90, saddle: 60, horseHead: 70, donkeyHead: 50, horseLeg: 480, horseTail: 120, oxBody: 60, oxHead: 60, oxLeg: 240, sheep: 120, dog: 20,
    cartBed: 40, wheelSolid: 80, wheelSpoke: 120, loadAmph: 20, loadBlock: 20, loadHay: 20, loadSacks: 20, loadBarrels: 20, raeda: 20, chariot: 16, litter: 12 };
  for (const k in N) IP[k] = new IPart(PG[k], N[k], m, !['tablet', 'scroll', 'beard', 'jar'].includes(k));
  IP.flame = new IPart(PG.flame, 120, glow, false);
  IP.spect = new IPart(makeGeo((g) => { K.tbox(g, O0, 0, 0, 0, 0.42, 0.3, 0.36, 0.24, 0.7, W1); K.box(g, O0, 0, 0.7, 0, 0.18, 0.22, 0.2, 0xd8b090); }), 4000, m, false);
}
function partsBegin() { for (const k in IP) IP[k].begin(); }
function partsEnd() { for (const k in IP) IP[k].end(); }

// ---------- appearance ----------
const SKIN = [0xe8c0a0, 0xd8a888, 0xc89878, 0xb88a68, 0xa87858, 0x8a6048, 0x6a4838, 0xf0d0b8];
const HAIR = [0x1a1410, 0x2a1e16, 0x3a2a1e, 0x4a3424, 0x6a4a2e, 0x8a6a3e, 0xa88a5a, 0x5a5a5a, 0x9a9a98];
const CLOTH = {
  plain: [0xb8a888, 0xa89878, 0x9a8a6a, 0xc8b898, 0x8a7a62, 0xd0c4a8, 0x8a6a4a, 0x7a6a58],
  bright: [0xa83a2a, 0x3d5a80, 0xc89a3a, 0x55703a, 0x8a4a6a, 0xd8c8a8, 0xb86a3a, 0x4a6a7a, 0xe0d8c8],
  white: [0xece6d8, 0xe4dccb, 0xf0ece0],
  dark: [0x5a4a3a, 0x4a4038, 0x6a5a48, 0x3a3430],
};
// look: everything needed to draw a person
function makeLook(role, rng = Math.random) {
  const R0 = ROLES[role] || ROLES.citizen;
  const p = (a) => a[Math.floor(rng() * a.length)];
  const g = R0.g === 'f' ? 'f' : R0.g === 'm' ? 'm' : rng() < 0.5 ? 'm' : 'f';
  const age = R0.child ? 'child' : rng() < 0.12 ? 'old' : 'adult';
  const L = {
    g, age, skin: p(SKIN), hair: age === 'old' ? p([0x9a9a98, 0xc8c8c4, 0x7a7a78]) : p(HAIR),
    s: (age === 'child' ? 0.62 + rng() * 0.12 : g === 'f' ? 0.92 + rng() * 0.07 : 0.97 + rng() * 0.08) * (R0.scale || 1),
    body: g === 'f' ? 'dress' : 'tunic', cloth: p(CLOTH[R0.cloth || (g === 'f' ? 'bright' : 'plain')]),
    over: null, overCol: 0xffffff, hairT: g === 'f' ? 'hairLong' : rng() < 0.35 ? 'hairCurly' : 'hairShort',
    beard: g === 'm' && age !== 'child' && rng() < (R0.beard != null ? R0.beard : 0.4), hat: null, hatCol: 0xffffff, boots: false,
    item: null, item2: null, armor: false,
  };
  if (R0.dress) Object.assign(L, R0.dress(L, rng, p));
  return L;
}
