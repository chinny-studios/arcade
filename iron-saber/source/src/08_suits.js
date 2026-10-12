// Iron Saber — mobile suits: procedural low-poly models (four designs), skeleton, animation,
// movement physics, collision with the city and terrain, footfalls, damage and destruction.

const mechMat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 38, specular: 0x2a2a30 });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const flameMat = new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
const saberMat = new THREE.MeshBasicMaterial({ color: 0xff7ac8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
const saberCoreMat = new THREE.MeshBasicMaterial({ color: 0xffeaf6 });
const axeMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });

// ---------- part helpers (left-side parts are mirrored to the right) ----------
const pB = (w, h, d, ch, x, y, z, c, r) => ({ k: 'B', a: [w, h, d, ch], p: [x, y, z], r, c });
const pT = (wb, db, wt, dt, h, x, y, z, c, r, ox = 0, oz = 0) => ({ k: 'T', a: [wb, db, wt, dt, h, ox, oz], p: [x, y, z], r, c });
const pC = (rt, rb, h, seg, x, y, z, c, r) => ({ k: 'C', a: [rt, rb, h, seg], p: [x, y, z], r, c });
const pS = (rad, x, y, z, c, s) => ({ k: 'S', a: [rad], p: [x, y, z], s, c });
const pK = (rad, h, seg, x, y, z, c, r) => ({ k: 'K', a: [rad, h, seg], p: [x, y, z], r, c });
function realize(pt) {
  const a = pt.a;
  const geo = pt.k === 'B' ? chamferBox(a[0], a[1], a[2], a[3]) : pt.k === 'T' ? taperBox(a[0], a[1], a[2], a[3], a[4], a[5], a[6])
    : pt.k === 'C' ? new THREE.CylinderGeometry(a[0], a[1], a[2], a[3]) : pt.k === 'K' ? new THREE.ConeGeometry(a[0], a[1], a[2]) : new THREE.IcosahedronGeometry(a[0], 1);
  return { geo, p: pt.p, r: pt.r, s: pt.s, c: pt.c };
}
function mirrorPart(pt) {
  const m = { ...pt, p: [-pt.p[0], pt.p[1], pt.p[2]] };
  if (pt.r) m.r = [pt.r[0], -pt.r[1], -pt.r[2]];
  if (pt.k === 'T') { m.a = pt.a.slice(); m.a[5] = -m.a[5]; }
  return m;
}
const JOINTS = ['hips', 'torso', 'head', 'hatch', 'shL', 'shR', 'elL', 'elR', 'handL', 'handR', 'thL', 'thR', 'knL', 'knR', 'anL', 'anR', 'rifle', 'shield', 'cannon'];
function partSet() { const P = { glow: {} }; for (const j of JOINTS) { P[j] = []; P.glow[j] = []; } return P; }
// Mirror every left-side list onto its right twin.
function symm(P) {
  for (const [l, r] of [['shL', 'shR'], ['elL', 'elR'], ['handL', 'handR'], ['thL', 'thR'], ['knL', 'knR'], ['anL', 'anR']]) {
    for (const pt of P[l]) P[r].push(mirrorPart(pt));
    for (const pt of P.glow[l]) P.glow[r].push(mirrorPart(pt));
  }
}
const both = (list, pt) => { list.push(pt, mirrorPart(pt)); };

const BASE_DIMS = { thigh: 4.3, shin: 4.2, ankle: 0.9, hipW: 1.35, waist: 1.0, shY: 4.5, shW: 3.1, neckY: 5.6, upper: 3.1, fore: 3.0, hatch: [0, 1.55, 1.62], cockpit: [0, 2.6, 0.9] };

// ---------- GX-01 Valiant: the white hero suit ----------
function buildValiant(P) {
  const W = hex(0xeceef2), Wd = hex(0xc6cbd3), B = hex(0x2a4fae), Bd = hex(0x1d3a85), R = hex(0xc8262a), Y = hex(0xf2c21c), G = hex(0x5b5f68), D = hex(0x2a2c31), E = hex(0x7dffb0);
  // legs
  P.anL.push(pB(2.0, 0.75, 3.8, 0.25, 0, -0.52, 0.5, R), pB(1.85, 0.55, 1.2, 0.2, 0, -0.35, 2.1, R), pB(1.6, 1.2, 1.8, 0.3, 0, 0.0, 0.1, W), pB(1.4, 0.6, 1.0, 0.2, 0, -0.55, -1.2, G));
  P.knL.push(pT(1.9, 2.0, 2.4, 2.5, 3.9, 0, -2.2, 0, W), pB(1.7, 3.0, 0.5, 0.15, 0, -2.0, 1.15, W), pB(1.6, 2.0, 0.8, 0.2, 0, -1.6, -1.15, Wd),
    pT(1.8, 1.0, 1.3, 0.7, 1.6, 0, 0.1, 1.1, W, [0.2, 0, 0]), pC(0.8, 0.8, 1.6, 8, 0, 0, 0, G, [0, 0, Math.PI / 2]), pC(0.32, 0.45, 0.6, 8, 0, -2.9, -1.45, D));
  P.thL.push(pS(0.9, 0, 0, 0, G), pB(1.7, 3.6, 1.9, 0.35, 0, -2.2, 0, W), pB(1.5, 2.4, 0.3, 0.1, 0, -2.4, 1.0, Wd));
  // pelvis and skirts
  P.hips.push(pB(2.6, 1.4, 2.0, 0.3, 0, 0.2, 0, G), pT(1.0, 1.5, 1.5, 1.9, 1.3, 0, -0.5, 0.35, B), pB(0.7, 0.5, 0.15, 0.05, 0, -0.35, 1.32, Y),
    pB(2.8, 1.9, 0.35, 0.12, 0, -0.5, -1.2, W, [0.15, 0, 0]), pB(3.2, 0.7, 2.3, 0.25, 0, 0.85, 0.05, R));
  both(P.hips, pB(1.55, 2.0, 0.32, 0.1, 0.95, -0.55, 1.25, W, [-0.18, 0, 0.05]));
  both(P.hips, pB(1.2, 0.3, 0.34, 0.06, 0.95, -1.4, 1.42, Y, [-0.18, 0, 0.05]));
  both(P.hips, pB(0.35, 2.1, 1.9, 0.12, 2.0, -0.4, 0, W, [0, 0, 0.12]));
  // torso
  P.torso.push(pB(2.4, 1.6, 2.0, 0.35, 0, 0.6, 0.2, R), pB(2.8, 1.2, 1.6, 0.3, 0, 0.7, -0.1, G), pB(4.4, 2.8, 2.9, 0.5, 0, 2.55, 0.15, B),
    pT(4.6, 3.0, 3.8, 2.2, 1.2, 0, 4.5, 0, B), pC(0.75, 0.85, 0.8, 8, 0, 5.3, 0, G));
  both(P.torso, pB(1.0, 0.75, 0.2, 0.06, 1.3, 3.15, 1.6, Y));
  for (const y of [2.95, 3.15, 3.35]) both(P.torso, pB(0.82, 0.07, 0.05, 0.01, 1.3, y, 1.71, D));
  both(P.torso, pB(1.2, 1.6, 1.8, 0.2, 2.4, 4.2, 0, W));
  // backpack, thrusters, saber hilts
  P.torso.push(pB(2.8, 2.8, 1.4, 0.35, 0, 3.0, -2.0, G), pB(2.4, 0.5, 1.1, 0.15, 0, 4.55, -2.0, W));
  both(P.torso, pC(0.55, 0.75, 1.2, 8, 0.75, 1.4, -2.3, D, [0.4, 0, 0]));
  both(P.torso, pC(0.18, 0.18, 1.7, 6, 0.9, 4.9, -2.45, W, [-0.35, 0, -0.1]));
  P.hatch.push(pB(1.7, 1.7, 0.22, 0.12, 0, 0.85, 0, Bd));
  // head
  P.head.push(pC(0.5, 0.6, 0.6, 8, 0, 0.2, 0, G), pB(1.5, 1.3, 1.6, 0.25, 0, 0.95, 0.05, W), pT(1.75, 1.85, 1.35, 1.4, 0.7, 0, 1.85, -0.05, W),
    pB(0.55, 0.32, 0.3, 0.08, 0, 0.38, 0.85, R), pB(1.0, 0.45, 0.15, 0.05, 0, 0.7, 0.87, D), pB(0.4, 0.5, 0.25, 0.08, 0, 1.45, 0.9, R));
  both(P.head, pB(0.25, 0.9, 1.2, 0.08, 0.82, 0.85, 0.1, Wd));
  both(P.head, pT(0.38, 0.14, 0.06, 0.08, 2.1, 0.85, 2.11, 0.88, Y, [0, 0, -0.95]));
  both(P.head, pC(0.13, 0.13, 0.5, 6, 0.72, 1.55, 0.6, G, [Math.PI / 2, 0, 0]));
  both(P.glow.head, pB(0.42, 0.17, 0.08, 0.03, 0.33, 0.98, 0.86, E, [0, 0, 0.12]));
  // arms
  P.shL.push(pB(2.0, 2.1, 2.6, 0.4, 0.55, 0.25, 0, W), pB(1.6, 0.4, 2.2, 0.12, 0.65, 1.35, 0, Wd), pS(0.85, 0, 0, 0, G),
    pB(1.25, 2.4, 1.35, 0.25, 0, -1.7, 0, W), pC(0.6, 0.6, 1.3, 8, 0, -3.1, 0, G, [0, 0, Math.PI / 2]));
  P.elL.push(pT(1.4, 1.55, 1.6, 1.75, 2.6, 0, -1.55, 0, W), pB(1.5, 0.45, 1.65, 0.12, 0, -2.75, 0, Wd));
  P.handL.push(pB(0.95, 1.05, 1.15, 0.2, 0, -0.55, 0.05, G), pB(0.3, 0.6, 0.35, 0.1, -0.45, -0.35, 0.4, G));
  // beam rifle in the right hand, shield on the left forearm
  const RF = hex(0x3a4250);
  P.rifle.push(pB(0.6, 5.0, 0.95, 0.15, 0, -1.6, 0.6, RF), pC(0.17, 0.2, 2.0, 8, 0, -5.0, 0.7, G), pB(0.35, 1.6, 0.42, 0.1, 0, -0.9, 1.25, D),
    pB(0.45, 1.8, 0.8, 0.12, 0, 0.9, 0.55, RF), pB(0.7, 1.0, 0.3, 0.06, 0, -2.6, 1.05, W));
  P.glow.rifle.push(pB(0.2, 0.2, 0.1, 0.02, 0, -0.25, 1.48, hex(0xff6ab0)));
  P.shield.push(pT(0.4, 1.4, 0.4, 3.2, 6.8, 1.15, -1.4, 0, R), pT(0.16, 1.0, 0.16, 2.7, 6.0, 1.38, -1.3, 0, W),
    pB(0.1, 0.35, 1.7, 0.03, 1.48, 0.2, 0, Y), pB(0.1, 1.7, 0.35, 0.03, 1.48, 0.2, 0, Y));
}

// ---------- SX-03 Swift: light scout with wing binders ----------
function buildSwift(P) {
  const W = hex(0xe8e8e4), O = hex(0xf07a1e), Od = hex(0xb9520e), G = hex(0x50555e), D = hex(0x26282d), C = hex(0x6ff2ff);
  P.anL.push(pT(1.5, 3.4, 1.2, 2.6, 0.7, 0, -0.55, 0.5, O), pB(1.3, 1.1, 1.5, 0.25, 0, 0.0, 0.0, W), pB(1.1, 0.5, 0.9, 0.15, 0, -0.6, -1.2, G));
  P.knL.push(pT(1.5, 1.6, 2.0, 2.2, 4.0, 0, -2.2, 0, W), pB(1.3, 2.6, 0.4, 0.1, 0, -2.0, 1.0, O), pT(1.4, 0.9, 1.0, 0.5, 1.8, 0, 0.3, 0.9, W, [0.25, 0, 0]),
    pC(0.65, 0.65, 1.3, 8, 0, 0, 0, G, [0, 0, Math.PI / 2]), pB(1.2, 2.2, 0.8, 0.2, 0, -1.8, -1.0, G));
  P.thL.push(pS(0.75, 0, 0, 0, G), pB(1.35, 3.6, 1.55, 0.3, 0, -2.2, 0, W), pB(1.1, 1.6, 0.25, 0.08, 0, -2.0, 0.85, O));
  P.hips.push(pB(2.2, 1.3, 1.8, 0.3, 0, 0.2, 0, G), pT(0.9, 1.3, 1.3, 1.6, 1.2, 0, -0.5, 0.3, O), pB(2.8, 0.6, 2.0, 0.2, 0, 0.8, 0, W));
  both(P.hips, pB(1.3, 1.7, 0.28, 0.08, 0.85, -0.5, 1.05, W, [-0.2, 0, 0.06]));
  both(P.hips, pB(0.3, 1.8, 1.5, 0.1, 1.75, -0.35, 0, O, [0, 0, 0.14]));
  P.torso.push(pB(2.0, 1.6, 1.7, 0.3, 0, 0.6, 0.15, G), pT(3.6, 2.4, 4.0, 2.7, 2.6, 0, 2.4, 0.1, W), pT(4.0, 2.7, 3.0, 2.0, 1.2, 0, 4.25, 0, O),
    pC(0.6, 0.7, 0.8, 8, 0, 5.1, 0, G), pB(2.4, 0.5, 0.2, 0.06, 0, 2.6, 1.42, Od));
  both(P.torso, pB(0.9, 1.4, 1.5, 0.2, 2.1, 4.0, 0, W));
  // wing binders
  P.torso.push(pB(2.2, 2.4, 1.2, 0.3, 0, 3.0, -1.8, G));
  both(P.torso, pT(0.4, 1.6, 0.2, 0.6, 5.5, 1.9, 4.5, -2.5, O, [0.35, 0, -0.75]));
  both(P.torso, pT(0.3, 1.2, 0.15, 0.4, 4.0, 2.2, 2.4, -2.6, W, [-0.2, 0, -1.2]));
  both(P.torso, pC(0.5, 0.7, 1.0, 8, 0.6, 1.6, -2.1, D, [0.4, 0, 0]));
  P.hatch.push(pB(1.5, 1.5, 0.2, 0.1, 0, 0.75, 0, Od));
  P.head.push(pC(0.45, 0.55, 0.6, 8, 0, 0.2, 0, G), pB(1.3, 1.2, 1.5, 0.3, 0, 0.9, 0.0, W), pT(1.4, 1.55, 0.9, 1.1, 0.6, 0, 1.75, -0.1, O),
    pB(1.32, 0.4, 0.3, 0.08, 0, 0.95, 0.7, D), pT(0.12, 0.3, 0.04, 0.08, 2.0, 0.3, 2.4, -0.1, W, [-0.3, 0, -0.4]));
  P.glow.head.push(pB(1.2, 0.18, 0.1, 0.03, 0, 0.97, 0.84, C));
  P.shL.push(pB(1.6, 1.7, 2.0, 0.35, 0.45, 0.2, 0, O), pS(0.7, 0, 0, 0, G), pB(1.05, 2.4, 1.15, 0.2, 0, -1.7, 0, W), pC(0.5, 0.5, 1.1, 8, 0, -3.1, 0, G, [0, 0, Math.PI / 2]));
  P.elL.push(pT(1.15, 1.3, 1.35, 1.5, 2.6, 0, -1.55, 0, W), pB(1.25, 0.4, 1.4, 0.1, 0, -2.75, 0, O));
  P.handL.push(pB(0.8, 0.95, 1.0, 0.18, 0, -0.5, 0.05, G));
  const RF = hex(0x2f343c);
  P.rifle.push(pB(0.5, 4.2, 0.8, 0.12, 0, -1.3, 0.55, RF), pC(0.14, 0.17, 1.6, 8, 0, -4.2, 0.6, G), pB(0.3, 1.2, 0.36, 0.08, 0, -0.6, 1.1, O));
  P.glow.rifle.push(pB(0.18, 0.18, 0.1, 0.02, 0, -0.2, 1.3, hex(0xff6ab0)));
  P.shield.push(pT(0.3, 1.0, 0.3, 2.0, 4.2, 1.0, -1.6, 0, O), pT(0.12, 0.7, 0.12, 1.6, 3.6, 1.18, -1.5, 0, W));
}

// ---------- HX-09 Bastion: heavy artillery with twin shoulder cannons ----------
function buildBastion(P) {
  const R = hex(0x9a2420), Rd = hex(0x6c1814), S = hex(0xd8c79c), G = hex(0x585a5c), D = hex(0x2b2c2e), E = hex(0xc8ff6a);
  P.anL.push(pB(2.5, 0.9, 4.0, 0.3, 0, -0.45, 0.45, Rd), pB(2.0, 1.3, 2.1, 0.35, 0, 0.1, 0, S), pB(1.8, 0.7, 1.2, 0.2, 0, -0.5, -1.4, G));
  P.knL.push(pT(2.4, 2.5, 2.9, 3.0, 4.0, 0, -2.2, 0, R), pB(2.2, 2.8, 0.6, 0.2, 0, -2.2, 1.45, Rd), pT(2.2, 1.1, 1.6, 0.8, 1.6, 0, 0.1, 1.35, S, [0.15, 0, 0]),
    pC(0.95, 0.95, 2.0, 8, 0, 0, 0, G, [0, 0, Math.PI / 2]), pB(2.0, 2.2, 1.0, 0.25, 0, -1.9, -1.5, G));
  // missile pods on the shins
  P.knL.push(pB(0.8, 2.0, 1.6, 0.15, 1.45, -2.0, 0.2, S));
  for (let i = 0; i < 3; i++) P.knL.push(pC(0.18, 0.18, 0.15, 6, 1.86, -1.4 - i * 0.55, 0.2, D, [0, 0, Math.PI / 2]));
  P.thL.push(pS(1.05, 0, 0, 0, G), pB(2.1, 3.6, 2.2, 0.4, 0, -2.2, 0, S), pB(1.9, 2.6, 0.35, 0.12, 0, -2.4, 1.15, R));
  P.hips.push(pB(3.2, 1.6, 2.4, 0.35, 0, 0.2, 0, G), pT(1.3, 1.8, 1.8, 2.2, 1.4, 0, -0.5, 0.35, Rd), pB(3.8, 0.9, 2.6, 0.3, 0, 0.95, 0.05, S),
    pB(3.2, 2.0, 0.45, 0.14, 0, -0.55, -1.35, R, [0.15, 0, 0]));
  both(P.hips, pB(1.8, 2.2, 0.4, 0.12, 1.1, -0.6, 1.4, R, [-0.2, 0, 0.06]));
  both(P.hips, pB(0.45, 2.3, 2.2, 0.14, 2.3, -0.4, 0, R, [0, 0, 0.14]));
  P.torso.push(pB(2.9, 1.7, 2.3, 0.35, 0, 0.6, 0.2, G), pB(5.2, 3.2, 3.4, 0.55, 0, 2.7, 0.15, R), pT(5.4, 3.5, 4.4, 2.6, 1.3, 0, 4.9, 0, R),
    pB(3.0, 1.4, 0.3, 0.1, 0, 2.4, 1.85, S), pC(0.85, 0.95, 0.8, 8, 0, 5.75, 0, G), pB(3.2, 3.2, 1.6, 0.35, 0, 3.2, -2.3, G));
  both(P.torso, pB(1.4, 1.8, 2.1, 0.25, 2.8, 4.4, 0, S));
  both(P.torso, pC(0.65, 0.9, 1.2, 8, 0.9, 1.5, -2.6, D, [0.4, 0, 0]));
  P.hatch.push(pB(1.9, 1.7, 0.24, 0.1, 0, 0.85, 0, Rd));
  // twin cannons riding over the shoulders
  both(P.cannon, pB(1.3, 1.6, 3.4, 0.25, 1.9, 0.0, -0.6, S));
  both(P.cannon, pC(0.36, 0.44, 7.5, 10, 1.9, 0.15, 3.5, D, [Math.PI / 2, 0, 0]));
  both(P.cannon, pC(0.5, 0.5, 0.9, 10, 1.9, 0.15, 7.1, G, [Math.PI / 2, 0, 0]));
  // goggle head
  P.head.push(pC(0.6, 0.7, 0.6, 8, 0, 0.2, 0, G), pB(1.9, 1.5, 1.9, 0.45, 0, 1.0, 0, R), pB(1.7, 0.5, 0.4, 0.1, 0, 1.05, 0.85, D),
    pT(1.9, 1.9, 1.3, 1.4, 0.5, 0, 1.95, -0.05, Rd), pB(0.18, 1.2, 0.18, 0.05, 0.7, 2.5, -0.5, G));
  both(P.glow.head, pC(0.24, 0.24, 0.1, 10, 0.45, 1.05, 1.06, E, [Math.PI / 2, 0, 0]));
  P.shL.push(pB(2.2, 2.0, 2.6, 0.45, 0.6, 0.15, 0, S), pS(0.95, 0, 0, 0, G), pB(1.5, 2.4, 1.6, 0.3, 0, -1.7, 0, R), pC(0.7, 0.7, 1.5, 8, 0, -3.1, 0, G, [0, 0, Math.PI / 2]));
  P.elL.push(pT(1.7, 1.8, 1.9, 2.0, 2.6, 0, -1.55, 0, R), pB(1.8, 0.5, 1.95, 0.15, 0, -2.75, 0, S));
  P.handL.push(pB(1.15, 1.2, 1.3, 0.22, 0, -0.6, 0.05, G));
}

// ---------- DM-06 Ogre: the Dominion's mono-eye workhorse ----------
function buildOgre(P, cmd) {
  const L = cmd ? hex(0xc73a34) : hex(0x6f8a52), Dk = cmd ? hex(0x6e1a1c) : hex(0x3f5634), G = hex(0x55585a), D = hex(0x262829), E = hex(0xff3c8a);
  P.anL.push(pT(2.3, 3.6, 1.7, 2.6, 0.9, 0, -0.45, 0.4, Dk), pB(1.6, 1.0, 1.6, 0.4, 0, 0.1, 0, G));
  P.knL.push(pT(2.5, 2.7, 1.9, 2.1, 4.0, 0, -2.4, 0, L), pC(0.75, 0.75, 1.5, 8, 0, 0, 0, G, [0, 0, Math.PI / 2]), pT(1.5, 0.9, 1.1, 0.6, 1.5, 0, 0.1, 1.0, L, [0.2, 0, 0]));
  P.thL.push(pS(0.85, 0, 0, 0, G), pC(0.7, 0.7, 3.4, 8, 0, -2.0, 0, G), pB(1.7, 2.2, 1.9, 0.5, 0, -2.4, 0.1, L));
  P.hips.push(pB(2.6, 1.4, 2.0, 0.4, 0, 0.2, 0, G), pT(1.1, 1.5, 1.6, 1.9, 1.3, 0, -0.5, 0.3, Dk), pB(3.4, 0.7, 2.4, 0.3, 0, 0.85, 0, Dk),
    pB(3.0, 1.8, 0.35, 0.15, 0, -0.5, -1.25, L, [0.18, 0, 0]));
  both(P.hips, pB(1.6, 2.0, 0.35, 0.15, 1.0, -0.6, 1.25, L, [-0.2, 0, 0.08]));
  both(P.hips, pB(0.4, 2.0, 1.8, 0.15, 2.05, -0.4, 0, L, [0, 0, 0.16]));
  // the heat axe hangs on the left skirt
  P.hips.push(pB(0.25, 2.6, 0.25, 0.05, 2.35, -0.6, 0.6, G, [0, 0, 0.15]), pB(0.15, 0.9, 1.0, 0.05, 2.5, -1.8, 0.95, D, [0, 0, 0.15]));
  P.torso.push(pB(2.2, 1.5, 1.9, 0.4, 0, 0.6, 0.15, G), pB(4.4, 3.0, 3.2, 0.9, 0, 2.6, 0.1, Dk), pT(4.3, 3.2, 3.4, 2.4, 1.3, 0, 4.6, 0, Dk),
    pC(0.8, 0.9, 0.7, 8, 0, 5.3, 0.1, G), pB(3.0, 3.0, 1.6, 0.6, 0, 3.0, -2.1, L));
  both(P.torso, pC(0.6, 0.8, 1.0, 8, 0.8, 1.6, -2.4, D, [0.4, 0, 0]));
  // ribbed power pipes from chest to waist
  for (let i = 0; i < 6; i++) both(P.torso, pC(0.3, 0.3, 0.42, 7, 1.5 + i * 0.05, 4.0 - i * 0.48, 1.55 - i * 0.12, G, [0.25, 0, 0.1]));
  P.hatch.push(pB(1.7, 1.6, 0.25, 0.12, 0, 0.8, 0, L));
  // round head with a slit for the mono-eye, face pipes and a crest
  P.head.push(pC(0.55, 0.65, 0.6, 8, 0, 0.2, 0, G), pS(1.15, 0, 1.25, 0, L, [1.0, 1.05, 1.15]), pB(1.8, 0.42, 0.8, 0.12, 0, 1.2, 0.72, D),
    pB(0.18, 0.9, 1.9, 0.05, 0, 2.3, -0.15, Dk));
  for (let i = 0; i < 4; i++) both(P.head, pC(0.16, 0.16, 0.38, 6, 0.42 + i * 0.13, 0.55 - i * 0.04, 1.0 - i * 0.24, G, [1.2, 0, 0.6]));
  if (cmd) P.head.push(pT(0.4, 0.2, 0.05, 0.06, 2.2, 0, 2.4, 0.9, Y_ACC, [0.9, 0, 0]));
  P.glow.head.push(pS(0.24, 0, 1.2, 1.05, E));
  // spiked left pauldron, shield-shaped right one
  P.shL.push(pS(1.4, 0.7, 0.3, 0, Dk, [1.0, 0.9, 1.05]), pS(0.8, 0, 0, 0, G), pC(0.6, 0.6, 2.4, 8, 0, -1.7, 0, G), pB(1.3, 1.4, 1.4, 0.4, 0, -2.3, 0, L),
    pC(0.6, 0.6, 1.3, 8, 0, -3.1, 0, G, [0, 0, Math.PI / 2]));
  for (const [a, b] of [[0, 0], [0.7, 0.6], [-0.6, -0.6]]) P.shL.push(pK(0.28, 1.2, 6, 1.6, 0.6 + a * 0.4, b, G, [0, 0, -1.3]));
  P.shR.push(pB(0.35, 2.8, 2.9, 0.12, -1.75, 0.0, 0, L, [0, 0, -0.2]), pS(0.8, 0, 0, 0, G), pC(0.6, 0.6, 2.4, 8, 0, -1.7, 0, G),
    pB(1.3, 1.4, 1.4, 0.4, 0, -2.3, 0, L), pC(0.6, 0.6, 1.3, 8, 0, -3.1, 0, G, [0, 0, Math.PI / 2]));
  P.elL.push(pT(1.5, 1.6, 1.8, 1.9, 2.6, 0, -1.5, 0, L), pB(1.6, 0.5, 1.7, 0.15, 0, -2.75, 0, Dk));
  P.elR.push(mirrorPart(P.elL[0]), mirrorPart(P.elL[1]));
  P.handL.push(pB(1.0, 1.05, 1.15, 0.22, 0, -0.55, 0.05, G));
  P.handR.push(mirrorPart(P.handL[0]));
  // machine gun with a drum magazine
  P.rifle.push(pB(0.55, 4.4, 0.9, 0.15, 0, -1.4, 0.55, D), pC(0.2, 0.22, 1.8, 8, 0, -4.4, 0.6, G), pC(0.9, 0.9, 0.6, 12, 0, -1.2, 1.4, G, [0, 0, Math.PI / 2]),
    pB(0.4, 1.5, 0.7, 0.1, 0, 0.9, 0.45, D));
}
const Y_ACC = hex(0xe8c24a);

// ---------- suit types ----------
const SUIT_T = {
  valiant: {
    id: 'valiant', name: 'GX-01 VALIANT', role: 'ASSAULT', scale: 1.0, hp: 1000, walk: 9, dash: 72, boostMax: 100, boostUse: 18, boostRegen: 32,
    jump: 15, thrust: 32, R: 3.4, mass: 1, primary: { kind: 'beam', dmg: 120, rate: 0.4, cost: 9 }, melee: 'saber', meleeDmg: 360, vulcan: true,
    missiles: 6, shield: true, cockpit: 'pano', build: buildValiant, team: 0,
    blurb: 'Balanced front-line suit. Beam rifle, beam saber, head vulcans, a six-missile pod and a full shield.',
  },
  swift: {
    id: 'swift', name: 'SX-03 SWIFT', role: 'SCOUT', scale: 0.93, hp: 650, walk: 11, dash: 95, boostMax: 150, boostUse: 16, boostRegen: 40,
    jump: 18, thrust: 40, R: 3.0, mass: 0.75, primary: { kind: 'beam', dmg: 70, rate: 0.2, cost: 5 }, melee: 'saber', meleeDmg: 260, vulcan: true,
    missiles: 8, shield: true, cockpit: 'pano', build: buildSwift, team: 0,
    blurb: 'Light and very fast, with a huge boost reserve. Rapid beam carbine and micro-missiles.',
  },
  bastion: {
    id: 'bastion', name: 'HX-09 BASTION', role: 'ARTILLERY', scale: 1.08, hp: 1700, walk: 7.5, dash: 50, boostMax: 70, boostUse: 24, boostRegen: 22,
    jump: 11, thrust: 26, R: 4.0, mass: 1.5, primary: { kind: 'cannon', dmg: 230, rate: 0.75, cost: 0 }, melee: 'saber', meleeDmg: 300, vulcan: true,
    missiles: 12, shield: false, cockpit: 'classic', build: buildBastion, team: 0,
    blurb: 'Slow, armoured and loud. Twin 240mm shoulder cannons that level buildings, and twelve leg missiles.',
  },
  ogre: {
    id: 'ogre', name: 'DM-06 OGRE', role: 'CAPTURED', scale: 0.98, hp: 800, walk: 8.5, dash: 66, boostMax: 90, boostUse: 20, boostRegen: 30,
    jump: 14, thrust: 30, R: 3.5, mass: 1.05, primary: { kind: 'mg', dmg: 16, rate: 0.1, cost: 0 }, melee: 'axe', meleeDmg: 320, vulcan: false,
    missiles: 4, shield: false, cockpit: 'classic', build: (P) => buildOgre(P, false), team: 0,
    blurb: 'A captured Dominion suit. 120mm machine gun, heat axe and four rockets. Its old cockpit still works.',
  },
  grunt: {
    id: 'grunt', name: 'DM-06 OGRE', role: 'DOMINION', scale: 0.98, hp: 420, walk: 8.5, dash: 60, boostMax: 90, boostUse: 20, boostRegen: 30,
    jump: 14, thrust: 30, R: 3.5, mass: 1.05, primary: { kind: 'mg', dmg: 5, rate: 0.13, cost: 0 }, melee: 'axe', meleeDmg: 160, vulcan: false,
    missiles: 2, shield: false, cockpit: 'classic', build: (P) => buildOgre(P, false), team: 1,
  },
  ace: {
    id: 'ace', name: 'DM-06S OGRE COMMAND', role: 'DOMINION ACE', scale: 0.98, hp: 1500, walk: 10.5, dash: 92, boostMax: 140, boostUse: 16, boostRegen: 40,
    jump: 17, thrust: 38, R: 3.5, mass: 1.05, primary: { kind: 'beam', dmg: 55, rate: 0.55, cost: 0 }, melee: 'axe', meleeDmg: 240, vulcan: false,
    missiles: 4, shield: false, cockpit: 'classic', build: (P) => buildOgre(P, true), team: 1,
  },
};
const PLAYABLE = ['valiant', 'swift', 'bastion', 'ogre'];

// ---------- rig ----------
function buildRig(T) {
  const P = partSet();
  T.build(P);
  if (!P.shR.length) symm(P);
  else { for (const [l, r] of [['elL', 'elR'], ['handL', 'handR'], ['thL', 'thR'], ['knL', 'knR'], ['anL', 'anR']]) if (!P[r].length) { for (const pt of P[l]) P[r].push(mirrorPart(pt)); } }
  const D = BASE_DIMS, J = {};
  const root = new THREE.Group();
  const mk = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  mk('hips', root, 0, D.thigh + D.shin + D.ankle, 0);
  mk('torso', J.hips, 0, D.waist, 0);
  mk('head', J.torso, 0, D.neckY, 0);
  mk('hatch', J.torso, ...D.hatch);
  mk('cannon', J.torso, 0, D.shY + 1.6, -1.0);
  for (const [s, sg] of [['L', 1], ['R', -1]]) {
    mk('sh' + s, J.torso, sg * D.shW, D.shY, 0);
    mk('el' + s, J['sh' + s], 0, -D.upper, 0);
    mk('hand' + s, J['el' + s], 0, -D.fore, 0);
    mk('th' + s, J.hips, sg * D.hipW, 0, 0);
    mk('kn' + s, J['th' + s], 0, -D.thigh, 0);
    mk('an' + s, J['kn' + s], 0, -D.shin, 0);
  }
  mk('rifle', J.handR, 0, -0.3, 0);
  mk('shield', J.elL, 0, 0, 0);
  const meshes = {};
  for (const name of JOINTS) {
    if (P[name].length) {
      const m = new THREE.Mesh(mergeParts(P[name].map(realize)), mechMat);
      m.castShadow = true; m.receiveShadow = true;
      J[name].add(m); meshes[name] = m;
    }
    if (P.glow[name].length) {
      const m = new THREE.Mesh(mergeParts(P.glow[name].map(realize)), glowMat);
      J[name].add(m); meshes[name + 'Glow'] = m;
    }
  }
  // melee weapon blade (hidden until swung)
  const blade = new THREE.Group();
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 6), mechMat);
  const melee = T.melee === 'axe';
  if (melee) {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.3), new THREE.MeshPhongMaterial({ color: 0x4a4c4e, flatShading: true }));
    shaft.position.y = -1.5;
    const head = new THREE.Mesh(taperBox(0.15, 0.6, 0.15, 2.0, 1.6), axeMat);
    head.position.set(0, -3.0, 0.8);
    blade.add(shaft, head);
  } else {
    hilt.geometry.translate(0, -0.3, 0);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 9.5, 8), saberCoreMat);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.36, 10.2, 10), saberMat);
    core.position.y = -5.6; glow.position.y = -5.6;
    blade.add(hilt, core, glow);
  }
  blade.rotation.x = 0.25;
  blade.visible = false;
  J.handR.add(blade);
  // thruster flames on the backpack and calves
  const flames = [];
  const fg = new THREE.ConeGeometry(0.55, 4, 8, 1, true); fg.translate(0, -2, 0);
  for (const [j, x, y, z, rx] of [['torso', 0.75, 0.75, -2.55, 0.4], ['torso', -0.75, 0.75, -2.55, 0.4], ['knL', 0, -3.2, -1.5, 0.15], ['knR', 0, -3.2, -1.5, 0.15]]) {
    const f = new THREE.Mesh(fg, flameMat);
    f.position.set(x, y, z); f.rotation.x = rx; f.visible = false;
    J[j].add(f); flames.push(f);
  }
  // rest pose snapshot
  for (const k in J) { J[k].userData.p0 = J[k].position.clone(); }
  J.root = root;
  root.scale.setScalar(T.scale);
  return { root, J, meshes, blade, flames, hipH: D.thigh + D.shin + D.ankle, D };
}

// ---------- suits ----------
const SUITS = [];
let suitSeq = 0;
function newCtl() { return { mx: 0, mz: 0, boost: false, jump: false, jumpP: false, fire: false, vulcan: false, missileP: false, slashP: false, block: false, aim: new V3(), lock: null }; }
function createSuit(type, x, z, yaw, o = {}) {
  const T = SUIT_T[type];
  const rig = buildRig(T);
  scene.add(rig.root);
  const sc = T.scale;
  const s = {
    id: ++suitSeq, T, type, team: T.team, rig, sc, H: 17.8 * sc, R: T.R * sc,
    pos: new V3(x, terrainH(x, z), z), vel: new V3(), yaw, hipYaw: yaw, aimYaw: yaw, aimPitch: 0, torsoYaw: 0,
    hp: T.hp * (o.hpMul || 1), maxHp: T.hp * (o.hpMul || 1), boost: T.boostMax, boostDelay: 0, energy: 100, heat: 0, overheat: false,
    mslLeft: T.missiles, mslReload: 0, fireCD: 0, vulcCD: 0, meleeCD: 0, cannonSide: 0,
    onGround: true, flying: false, dashing: false, hover: 0, land: 0, walkPh: 0, gait: 0, prevC: 1,
    kneel: o.parked ? 1 : 0, mode: o.parked ? 'parked' : 'active', modeT: 0, hatch: o.parked ? 1 : 0,
    slash: -1, slashHit: false, lunge: 0, block: 0, aimW: 0, fireT: 0, flinch: 0, hitFlash: 0,
    dead: false, deadT: 0, gone: false, pilot: false, ai: null, home: { x, z, yaw }, ctl: newCtl(), name: o.name || T.name,
    spheres: [], shieldPos: new V3(), lastHitBy: null, smokeT: 0, respawnT: 0, mono: 0, auto: null, kills: 0, label: o.label || '',
  };
  for (let i = 0; i < 11; i++) s.spheres.push({ p: new V3(), r: 1 });
  SUITS.push(s);
  poseSuit(s, 0);
  return s;
}
function removeSuit(s) {
  scene.remove(s.rig.root);
  const i = SUITS.indexOf(s);
  if (i >= 0) SUITS.splice(i, 1);
}
const suitFwd = (yaw, out) => out.set(Math.sin(yaw), 0, Math.cos(yaw));

// ---------- per-frame update ----------
function updateSuit(s, dt) {
  if (s.gone) return;
  if (s.dead) { updateDeadSuit(s, dt); return; }
  const T = s.T, c = s.ctl;
  s.modeT += dt;
  s.hitFlash = Math.max(0, s.hitFlash - dt * 3);
  s.flinch = Math.max(0, s.flinch - dt * 3);
  // parked / standing up / kneeling down
  if (s.mode === 'parked') { s.kneel = 1; s.hatch = Math.min(1, s.hatch + dt * 0.8); s.vel.set(0, 0, 0); settleSuit(s, dt); poseSuit(s, dt); return; }
  if (s.mode === 'standup') {
    s.hatch = Math.max(0, s.hatch - dt * 1.4);
    if (s.hatch <= 0) s.kneel = Math.max(0, s.kneel - dt * 0.75);
    if (s.kneel <= 0) { s.mode = 'active'; s.modeT = 0; }
    if (s.kneel < 0.6 && s.kneel + dt * 0.75 >= 0.6) stepSound(s.pos, T.mass);
    settleSuit(s, dt); poseSuit(s, dt); return;
  }
  if (s.mode === 'kneeldown') {
    s.vel.multiplyScalar(Math.exp(-dt * 6));
    s.kneel = Math.min(1, s.kneel + dt * 0.8);
    if (s.kneel >= 1) { s.hatch = Math.min(1, s.hatch + dt * 1.2); if (s.hatch >= 1) { s.mode = 'parked'; s.modeT = 0; if (s.onParked) { const f = s.onParked; s.onParked = null; f(s); } } }
    settleSuit(s, dt); poseSuit(s, dt); return;
  }
  // ---- active ----
  const mv = Math.hypot(c.mx, c.mz);
  const dirX = mv > 0.01 ? c.mx / mv : 0, dirZ = mv > 0.01 ? c.mz / mv : 0;
  const amt = Math.min(1, mv);
  const busy = s.slash >= 0;
  s.block = lerp(s.block, c.block && T.shield && !busy ? 1 : 0, 1 - Math.exp(-dt * 10));
  // boost gauge
  let usingBoost = false;
  s.dashing = false;
  s.flying = false;
  if (s.lunge > 0) {
    s.lunge -= dt;
    usingBoost = true; s.dashing = true;
  } else if (s.onGround) {
    if (c.boost && s.boost > 0 && amt > 0.1 && !busy) {
      s.dashing = true; usingBoost = true;
      const k = 1 - Math.exp(-dt * 4);
      s.vel.x = lerp(s.vel.x, dirX * T.dash, k); s.vel.z = lerp(s.vel.z, dirZ * T.dash, k);
      s.boost -= T.boostUse * dt;
      s.hover = lerp(s.hover, 0.9, 1 - Math.exp(-dt * 8));
    } else {
      const sp = T.walk * amt * (s.block > 0.5 ? 0.55 : 1) * (busy ? 0.3 : 1);
      const k = 1 - Math.exp(-dt * (s.hover > 0.2 ? 1.6 : 3.2));
      s.vel.x = lerp(s.vel.x, dirX * sp, k); s.vel.z = lerp(s.vel.z, dirZ * sp, k);
      s.hover = lerp(s.hover, 0, 1 - Math.exp(-dt * 5));
    }
    if (c.jumpP && !busy && s.land < 0.4) {
      s.vel.y = T.jump; s.onGround = false;
      thudLand(s.pos, 0.4);
      groundDust(s.pos.x, s.pos.z, 10 * s.sc, 6);
    }
  } else {
    s.vel.y -= 21 * dt;
    if (c.jump && s.boost > 0) {
      s.vel.y = Math.min(s.vel.y + (T.thrust) * dt, 26);
      s.boost -= T.boostUse * 0.9 * dt; usingBoost = true; s.flying = true;
    }
    if (c.boost && s.boost > 0 && amt > 0.1) {
      const k = 1 - Math.exp(-dt * 2.5);
      s.vel.x = lerp(s.vel.x, dirX * T.dash, k); s.vel.z = lerp(s.vel.z, dirZ * T.dash, k);
      s.vel.y = Math.max(s.vel.y, -4);
      s.boost -= T.boostUse * dt; usingBoost = true; s.dashing = true;
    } else {
      const k = 1 - Math.exp(-dt * 0.9);
      s.vel.x = lerp(s.vel.x, dirX * T.walk * 1.4 * amt + s.vel.x * (1 - amt), k);
      s.vel.z = lerp(s.vel.z, dirZ * T.walk * 1.4 * amt + s.vel.z * (1 - amt), k);
    }
    s.vel.y = Math.max(s.vel.y, -70);
  }
  if (usingBoost) s.boostDelay = 0.7;
  else if (s.onGround) { s.boostDelay -= dt; if (s.boostDelay <= 0) s.boost = Math.min(T.boostMax, s.boost + T.boostRegen * dt); }
  s.boost = Math.max(0, s.boost);
  s.thrusting = usingBoost;
  // facing: hips toward travel (or walk backwards), torso toward the aim
  const hsp = Math.hypot(s.vel.x, s.vel.z);
  if (hsp > 1.5 && !busy) {
    const travel = Math.atan2(s.vel.x, s.vel.z);
    const back = Math.abs(angWrap(travel - s.aimYaw)) > 1.9 && !s.dashing;
    s.hipYaw = angTo(s.hipYaw, back ? travel + Math.PI : travel, dt * (s.dashing ? 3 : 2.2));
  }
  let rel = angWrap(s.aimYaw - s.hipYaw);
  if (Math.abs(rel) > 1.5) { s.hipYaw = angTo(s.hipYaw, s.aimYaw, Math.max(dt * 2.5, Math.abs(rel) - 1.5)); rel = angWrap(s.aimYaw - s.hipYaw); }
  s.torsoYaw = rel;
  s.yaw = s.hipYaw;
  // integrate and collide
  s.pos.addScaledVector(s.vel, dt);
  collideSuit(s, dt);
  // walk cycle
  const stride = 4.6 * s.sc;
  const walking = s.onGround && s.hover < 0.4;
  s.gait = lerp(s.gait, walking ? clamp(hsp / (T.walk * 0.6), 0, 1) : 0, 1 - Math.exp(-dt * 6));
  if (walking && hsp > 0.3) {
    s.walkPh += (hsp / stride) * Math.PI * dt * (Math.abs(angWrap(Math.atan2(s.vel.x, s.vel.z) - s.hipYaw)) > 1.6 ? -1 : 1);
    const cph = Math.cos(s.walkPh);
    if ((cph > 0) !== (s.prevC > 0)) footfall(s, Math.sin(s.walkPh) > 0 ? 'L' : 'R');
    s.prevC = cph;
  }
  s.land = Math.max(0, s.land - dt * 2.2);
  // weapons
  suitWeapons(s, dt);
  // damaged suits smoke
  if (s.hp < s.maxHp * 0.35) {
    s.smokeT -= dt;
    if (s.smokeT <= 0) { s.smokeT = 0.15; const t = s.spheres[0].p; smokePuff(t.x + frand(-2, 2), t.y + 2, t.z + frand(-2, 2), 3 * s.sc, 0.15); }
  }
  poseSuit(s, dt);
  if (s.thrusting && Math.random() < dt * 30) thrusterParticles(s);
}

// ground contact for parked or transitioning suits
function settleSuit(s, dt) {
  const g = groundUnder(s);
  s.pos.y = g;
  s.onGround = true;
}

// ---------- collision ----------
const _cp = new V3();
function groundUnder(s) {
  let g = terrainH(s.pos.x, s.pos.z);
  const R = s.R, step = s.H * 0.2;
  blocksInBox(s.pos.x - R * 0.6, s.pos.y - 60, s.pos.z - R * 0.6, s.pos.x + R * 0.6, s.pos.y + step, s.pos.z + R * 0.6, (id) => {
    const B = BLK_[id], top = B.y + B.hy;
    if (top <= s.pos.y + step && top > g) g = top;
  });
  return g;
}
function collideSuit(s, dt) {
  const R = s.R, H = s.H, step = H * 0.2, p = s.pos;
  const sp = Math.hypot(s.vel.x, s.vel.z);
  let ground = terrainH(p.x, p.z);
  // buildings: stand on low roofs, push out of walls, plough through flimsy blocks
  blocksInBox(p.x - R, p.y - 60, p.z - R, p.x + R, p.y + H, p.z + R, (id) => {
    const B = BLK_[id];
    if (!B.alive) return;
    const top = B.y + B.hy, bot = B.y - B.hy;
    const cx = clamp(p.x, B.x - B.hx, B.x + B.hx), cz = clamp(p.z, B.z - B.hz, B.z + B.hz);
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (top <= p.y + step) { if (d < R * 0.6 && top > ground) ground = top; return; }
    if (bot > p.y + H || d >= R) return;
    // flimsy structures give way under a walking suit; anything breaks under a boosting one
    const flimsy = B.max <= 90;
    if ((flimsy && sp > 3) || sp > 30) {
      const dmg = flimsy ? 40 + sp * 8 : sp * 4;
      if (damageBlock(id, dmg * s.T.mass, s.vel.x * 0.25, 2, s.vel.z * 0.25, true)) {
        if (!flimsy) { addShake(0.25, p, 300); }
        s.vel.x *= flimsy ? 0.92 : 0.55; s.vel.z *= flimsy ? 0.92 : 0.55;
        return;
      }
    }
    let nx, nz, pen;
    if (d > 1e-4) { nx = dx / d; nz = dz / d; pen = R - d; }
    else {
      const ex = B.hx - Math.abs(p.x - B.x), ez = B.hz - Math.abs(p.z - B.z);
      if (ex < ez) { nx = Math.sign(p.x - B.x) || 1; nz = 0; pen = ex + R; } else { nx = 0; nz = Math.sign(p.z - B.z) || 1; pen = ez + R; }
    }
    p.x += nx * pen; p.z += nz * pen;
    const vn = s.vel.x * nx + s.vel.z * nz;
    if (vn < 0) { s.vel.x -= vn * nx; s.vel.z -= vn * nz; if (vn < -25) { addShake(0.3, p, 300); impactSound(400, -vn, p); } }
  });
  // boulders
  rocksNear(p.x, p.z, R, (o) => {
    if (o.r < 2.2) return;
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), rr2 = R * 0.7 + o.r;
    const top = o.y + o.r * 0.8;
    if (d < rr2) {
      if (top <= p.y + step) { if (d < o.r && top > ground) ground = top; return; }
      if (d > 1e-3) { p.x += dx / d * (rr2 - d); p.z += dz / d * (rr2 - d); }
    }
  });
  // other suits
  for (const o of SUITS) {
    if (o === s || o.dead || o.gone) continue;
    const dx = p.x - o.pos.x, dz = p.z - o.pos.z, d = Math.hypot(dx, dz), rr2 = (R + o.R) * 0.8;
    if (d < rr2 && d > 1e-3 && Math.abs(p.y - o.pos.y) < H * 0.8) {
      const k = (rr2 - d) * 0.5;
      p.x += dx / d * k; p.z += dz / d * k;
      o.pos.x -= dx / d * k; o.pos.z -= dz / d * k;
    }
  }
  // map edge
  const lim = HALF - 80;
  if (Math.abs(p.x) > lim) { p.x = Math.sign(p.x) * lim; s.vel.x = 0; }
  if (Math.abs(p.z) > lim) { p.z = Math.sign(p.z) * lim; s.vel.z = 0; }
  // wading in the lake
  if (lakeAt(p.x, p.z) && p.y < WATER_Y) {
    s.vel.x *= Math.exp(-dt * 0.8); s.vel.z *= Math.exp(-dt * 0.8);
    if (Math.hypot(s.vel.x, s.vel.z) > 4 && Math.random() < dt * 12) splashAt(p.x + frand(-3, 3), p.z + frand(-3, 3), 2);
  }
  // vertical
  const hoverH = s.hover * 1.2 * s.sc;
  if (p.y <= ground + hoverH + 0.05 && s.vel.y <= 0) {
    if (!s.onGround) landSuit(s, -s.vel.y);
    p.y = s.onGround ? lerp(p.y, ground + hoverH, 1 - Math.exp(-dt * 18)) : ground + hoverH;
    if (p.y < ground) p.y = ground;
    s.vel.y = 0;
    s.onGround = true;
  } else if (p.y > ground + hoverH + 1.2 || s.vel.y > 0) {
    s.onGround = false;
  } else {
    p.y = lerp(p.y, ground + hoverH, 1 - Math.exp(-dt * 14));
  }
}
function landSuit(s, vy) {
  s.onGround = true;
  if (vy < 6) return;
  const k = clamp(vy / 30, 0.2, 1);
  s.land = Math.max(s.land, k);
  thudLand(s.pos, k * s.T.mass);
  groundDust(s.pos.x, s.pos.z, 12 * s.sc * (0.5 + k), Math.round(6 + 14 * k));
  addShake(0.5 * k, s.pos, 500);
  knockTrees(s.pos.x, s.pos.z, 9 * s.sc, s.pos.x + 0.01, s.pos.z, 1);
  crushAt(s.pos.x, s.pos.z, 8 * s.sc * (0.6 + k));
  if (vy > 18) blastBuildings(s.pos.x, s.pos.y, s.pos.z, 6 * s.sc, 60 * k);
  if (s.pilot) camKick(k);
}

// ---------- footfalls ----------
function footfall(s, side) {
  const an = s.rig.J['an' + side];
  an.getWorldPosition(_v1);
  const fx = _v1.x, fz = _v1.z, gy = groundY(fx, fz);
  stepSound(_v1, s.T.mass * (s.gait > 0.5 ? 1 : 0.7));
  if (lakeAt(fx, fz)) splashAt(fx, fz, 3);
  else if (s.gait > 0.3) groundDust(fx, fz, 4 * s.sc, 2);
  addShake(0.07 * s.T.mass, _v1, 260);
  if (s.pilot) camKick(0.12 * s.T.mass);
  knockTrees(fx, fz, 3.5 * s.sc, s.pos.x - suitFwd(s.hipYaw, _v2).x * 10, s.pos.z - _v2.z * 10, 0.6);
  crushAt(fx, fz, 3.2 * s.sc);
  stompPilot(fx, gy, fz, 3.2 * s.sc, s);
  bodiesNear(fx, gy + 1, fz, 4 * s.sc, (b) => { if (b.m < 600) { wakeBody(b); b.v.x += frand(-4, 4); b.v.y += frand(3, 7); b.v.z += frand(-4, 4); } });
}
function thrusterParticles(s) {
  const t = s.rig.J.torso;
  for (const sg of [1, -1]) {
    _v1.set(sg * 0.75, 0.5, -2.7);
    t.localToWorld(_v1);
    _v2.set(0, -0.9, -0.45).applyQuaternion(t.getWorldQuaternion(_q1)).multiplyScalar(30);
    thrustFx(_v1.x, _v1.y, _v1.z, _v2.x + s.vel.x, _v2.y + s.vel.y, _v2.z + s.vel.z, 1.2 * s.sc);
  }
  if (s.onGround && s.dashing && Math.random() < 0.4) groundDust(s.pos.x, s.pos.z, 6 * s.sc, 2);
}

// ---------- posing ----------
const DOWN = new V3(0, -1, 0);
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _ma = new THREE.Matrix4();
// Blocking forearm: held upright in front of the chest with its outer face (and the shield) turned forward.
const Q_BLOCK_FORE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3(0, 0, 1), new V3(0, -1, 0), new V3(1, 0, 0)));
const SLASH_KEYS = [
  { t: 0, u: new V3(-0.2, -0.95, 0.25), f: new V3(0.1, -0.6, 0.8) },
  { t: 0.28, u: new V3(-0.75, 0.55, -0.1), f: new V3(-0.35, 0.92, 0.15) },
  { t: 0.5, u: new V3(0.45, -0.2, 0.85), f: new V3(0.85, -0.35, 0.4) },
  { t: 0.7, u: new V3(0.35, -0.7, 0.6), f: new V3(0.5, -0.75, 0.45) },
  { t: 1, u: new V3(-0.2, -0.95, 0.25), f: new V3(0.1, -0.6, 0.8) },
];
for (const k of SLASH_KEYS) { k.u.normalize(); k.f.normalize(); }
function dirQuat(dir, out) { return out.setFromUnitVectors(DOWN, dir); }
// Arm: point the upper arm along u and the forearm along f (both in torso space).
function setArm(sh, el, u, f, w) {
  dirQuat(u, _qa);
  dirQuat(f, _qb);
  _qc.copy(_qa).invert().multiply(_qb);
  sh.quaternion.slerp(_qa, w);
  el.quaternion.slerp(_qc, w);
}

function poseSuit(s, dt) {
  const R = s.rig, J = R.J, D = R.D;
  const ph = s.walkPh, g = s.gait, kn = ease(s.kneel);
  const air = s.onGround ? 0 : 1, dash = s.dashing && s.onGround ? 1 : 0;
  const sn = Math.sin(ph), cs = Math.cos(ph);
  const A = 0.5 * g, K = 0.95 * g;
  // standing / walking leg angles
  let tL = -A * sn, tR = A * sn, kL = 0.08 + K * Math.max(0, cs), kR = 0.08 + K * Math.max(0, -cs);
  let hipDrop = 0.35 * g * Math.abs(sn) + s.land * 1.8;
  tL -= s.land * 0.7; tR -= s.land * 0.7; kL += s.land * 1.3; kR += s.land * 1.3;
  // air and dash poses
  const fl = s.flying ? 1 : 0;
  tL = lerp(tL, -0.35 - fl * 0.1, air); tR = lerp(tR, 0.1, air); kL = lerp(kL, 0.7, air); kR = lerp(kR, 0.45 + fl * 0.3, air);
  tL = lerp(tL, 0.25, dash); tR = lerp(tR, 0.4, dash); kL = lerp(kL, 0.45, dash); kR = lerp(kR, 0.65, dash);
  // kneeling pose: left knee up, right knee down
  tL = lerp(tL, -1.45, kn); kL = lerp(kL, 1.45, kn);
  tR = lerp(tR, 0.12, kn); kR = lerp(kR, 1.6, kn);
  const hipH = R.hipH;
  const kneelH = D.shin + D.ankle;
  J.hips.position.y = lerp(hipH - hipDrop, kneelH, kn);
  J.hips.rotation.z = 0.05 * sn * g * (1 - kn);
  J.thL.rotation.x = tL; J.thR.rotation.x = tR;
  J.knL.rotation.x = kL; J.knR.rotation.x = kR;
  J.anL.rotation.x = lerp(-(tL + kL) * 0.85, -(tL + kL), air * 0.5) ;
  J.anR.rotation.x = lerp(-(tR + kR) * 0.85, -0.55, kn);
  J.thL.rotation.z = J.thR.rotation.z = 0;
  // torso: twist toward the aim, lean into dashes, pitch with the aim
  const sl = s.slash >= 0 ? s.slash : -1;
  let twist = s.torsoYaw + 0.07 * sn * g * (1 - kn);
  if (sl >= 0) twist += sl < 0.3 ? lerp(0, -0.45, sl / 0.3) : sl < 0.6 ? lerp(-0.45, 0.5, (sl - 0.3) / 0.3) : lerp(0.5, 0, (sl - 0.6) / 0.4);
  J.torso.rotation.set(clamp(-s.aimPitch * 0.25, -0.25, 0.3) + dash * 0.28 + air * fl * 0.1 + kn * 0.3 + s.land * 0.2 - s.flinch * 0.15, twist, 0, 'YXZ');
  J.head.rotation.set(clamp(-s.aimPitch * 0.6, -0.5, 0.5) + kn * 0.2, 0, 0, 'YXZ');
  J.root.position.copy(s.pos);
  J.root.rotation.y = s.hipYaw;
  // hatch and flames
  J.hatch.rotation.x = ease(s.hatch) * 1.5;
  for (let i = 0; i < R.flames.length; i++) {
    const f = R.flames[i];
    const on = s.thrusting && (i < 2 || s.flying || !s.onGround);
    f.visible = on;
    if (on) { const k = 0.7 + Math.random() * 0.5; f.scale.set(1, k * (s.dashing ? 1.5 : 1), 1); }
  }
  // arms
  J.root.updateMatrixWorld(true);
  const aimW = s.aimW;
  // left arm: rest, shield block
  J.shL.quaternion.setFromEuler(_e1.set(-0.05 + 0.35 * sn * g * (1 - aimW) - kn * 0.3, 0, 0.12 + dash * 0.3));
  J.elL.quaternion.setFromEuler(_e1.set(-0.35 - kn * 0.4, 0, 0));
  if (s.block > 0.01) setArm(J.shL, J.elL, _v1.set(-0.45, -0.3, 0.84).normalize(), _v2.set(0, 1, 0), s.block);
  if (s.block > 0.01) J.elL.quaternion.slerp(_qc.copy(_qa.copy(J.shL.quaternion).invert()).multiply(Q_BLOCK_FORE), s.block);
  // right arm: rest, aim, or slash
  J.shR.quaternion.setFromEuler(_e1.set(-0.05 - 0.35 * sn * g * (1 - aimW) - kn * 0.3, 0, -0.12 - dash * 0.3));
  J.elR.quaternion.setFromEuler(_e1.set(-0.9 - kn * 0.2, 0, 0));
  if (aimW > 0.01 && sl < 0) {
    // aim direction in torso space from the right shoulder
    _v3.copy(s.ctl.aim);
    J.torso.worldToLocal(_v3);
    _v3.sub(J.shR.position).normalize();
    _v4.copy(_v3).multiplyScalar(0.7).add(_v5.set(-0.25, -0.55, 0)).normalize();
    setArm(J.shR, J.elR, _v4, _v3, aimW);
  }
  if (sl >= 0) {
    let a = SLASH_KEYS[0], b = SLASH_KEYS[1];
    for (let i = 0; i < SLASH_KEYS.length - 1; i++) if (sl >= SLASH_KEYS[i].t && sl <= SLASH_KEYS[i + 1].t) { a = SLASH_KEYS[i]; b = SLASH_KEYS[i + 1]; }
    const t = ease(clamp((sl - a.t) / (b.t - a.t), 0, 1));
    _v1.copy(a.u).lerp(b.u, t).normalize(); _v2.copy(a.f).lerp(b.f, t).normalize();
    setArm(J.shR, J.elR, _v1, _v2, 1);
  }
  // Ogre mono-eye sweeps along its slit
  if (s.T.build && s.rig.meshes.headGlow && (s.type === 'grunt' || s.type === 'ace' || s.type === 'ogre')) {
    s.mono += dt;
    const sweep = s.mode === 'active' ? (s.ai && s.ai.target ? clamp(-s.torsoYaw * 0.4, -0.5, 0.5) : Math.sin(s.mono * 1.4) * 0.5) : 0;
    s.rig.meshes.headGlow.position.x = sweep;
    s.rig.meshes.headGlow.visible = s.mode !== 'parked' || s.pilot;
  }
  J.root.updateMatrixWorld(true);
  updateHitSpheres(s);
}

// ---------- hit volumes ----------
const SPHERE_DEF = [
  ['torso', 0, 2.6, 0.2, 3.0], ['hips', 0, 0, 0, 2.2], ['head', 0, 1.0, 0, 1.3], ['thL', 0, -2.1, 0, 1.4], ['thR', 0, -2.1, 0, 1.4],
  ['knL', 0, -2.0, 0, 1.4], ['knR', 0, -2.0, 0, 1.4], ['shL', 0.4, -0.6, 0, 1.6], ['shR', -0.4, -0.6, 0, 1.6], ['elL', 0, -1.5, 0, 1.1], ['elR', 0, -1.5, 0, 1.1],
];
function updateHitSpheres(s) {
  const J = s.rig.J;
  for (let i = 0; i < SPHERE_DEF.length; i++) {
    const [j, x, y, z, r] = SPHERE_DEF[i];
    const S = s.spheres[i];
    S.p.set(x, y, z); J[j].localToWorld(S.p); S.r = r * s.sc;
  }
  s.shieldPos.set(1.4, -1.4, 0); J.elL.localToWorld(s.shieldPos);
}
// Closest hit of segment a→b against a suit's spheres: returns t in [0,1] or -1.
function segHitSuit(s, a, b, pad = 0) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
  // cheap reject against a bounding sphere
  const c = s.spheres[0].p, br = s.H * 0.75 + pad;
  let t0 = clamp(((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / L2, 0, 1);
  const ex = a.x + dx * t0 - c.x, ey = a.y + dy * t0 - c.y, ez = a.z + dz * t0 - c.z;
  if (ex * ex + ey * ey + ez * ez > br * br) return -1;
  let best = -1;
  for (const S of s.spheres) {
    const t = clamp(((S.p.x - a.x) * dx + (S.p.y - a.y) * dy + (S.p.z - a.z) * dz) / L2, 0, 1);
    const qx = a.x + dx * t - S.p.x, qy = a.y + dy * t - S.p.y, qz = a.z + dz * t - S.p.z;
    const r = S.r + pad;
    if (qx * qx + qy * qy + qz * qz < r * r && (best < 0 || t < best)) best = t;
  }
  return best;
}

// ---------- damage ----------
function damageSuit(s, dmg, from, src, kind) {
  if (s.dead || s.gone) return 0;
  if (s.mode !== 'active' && !s.pilot && s.team === 0 && !src) return 0;
  // the shield takes hits from the front
  if (s.block > 0.6 && from) {
    _v1.copy(from).sub(s.pos); _v1.y = 0; _v1.normalize();
    suitFwd(s.aimYaw, _v2);
    if (_v1.dot(_v2) > 0.35) {
      sparkBurst(s.shieldPos.x, s.shieldPos.y, s.shieldPos.z, 6);
      clangSound(s.shieldPos);
      dmg *= 0.12;
      if (s.pilot) hudFlash(0.15, true);
    }
  }
  s.hp -= dmg;
  s.flinch = Math.min(1, s.flinch + dmg / 120);
  s.hitFlash = 1;
  if (src) s.lastHitBy = src;
  if (s.pilot) { hudFlash(Math.min(1, dmg / 80)); camKick(Math.min(0.6, dmg / 200)); }
  if (s.ai) aiOnHit(s, src);
  if (s.hp <= 0) destroySuit(s);
  return dmg;
}
function destroySuit(s) {
  if (s.dead) return;
  s.dead = true; s.deadT = 0; s.hp = 0;
  s.rig.blade.visible = false;
  for (const f of s.rig.flames) f.visible = false;
  if (s.team === 1) { STATS.kills++; onEnemyDown(s); }
  else STATS.lost++;
  if (s.pilot) ejectPilot(s);
  alarmSound();
}
function updateDeadSuit(s, dt) {
  s.deadT += dt;
  const J = s.rig.J;
  if (s.deadT < 1.6) {
    // stagger to the knees, sparking
    s.kneel = Math.min(1, s.kneel + dt * 1.2);
    s.vel.multiplyScalar(Math.exp(-dt * 3));
    s.pos.addScaledVector(s.vel, dt);
    s.pos.y = Math.max(groundUnder(s), s.pos.y - 20 * dt);
    s.thrusting = false; s.dashing = false; s.flying = false; s.slash = -1; s.aimW *= 0.9;
    poseSuit(s, dt);
    J.torso.rotation.x += s.deadT * 0.3;
    J.root.updateMatrixWorld(true);
    if (Math.random() < dt * 14) { const p = s.spheres[Math.floor(Math.random() * 5)].p; sparkBurst(p.x, p.y, p.z, 4); explosionFx(p.x, p.y, p.z, 0.6); }
    return;
  }
  // final explosion
  const c = s.spheres[0].p.clone();
  explosionFx(c.x, c.y, c.z, 4.5);
  explosionFx(c.x, c.y - 6, c.z, 3);
  ring(c.x, groundY(c.x, c.z) + 1, c.z, 60, 1.2, 0xffd0a0);
  boom(c, 2.2);
  addShake(1.0, c, 900);
  blastBuildings(c.x, c.y, c.z, 16, 160);
  knockTrees(c.x, c.z, 22, c.x, c.z, 2);
  crushAt(c.x, c.z, 14);
  splashDamage(c, 30, 140, s);
  const cols = s.team ? [[0.44, 0.55, 0.35], [0.26, 0.36, 0.24]] : [[0.9, 0.9, 0.92], [0.3, 0.4, 0.7]];
  for (let i = 0; i < 12; i++) spawnRock(c.x + frand(-4, 4), c.y + frand(-4, 4), c.z + frand(-4, 4), rr(1.2, 3), frand(-14, 14), frand(8, 24), frand(-14, 14), cols[i % 2]);
  addEmitter({ kind: 'wreck', x: c.x, y: groundY(c.x, c.z) + 1, z: c.z, life: 30 });
  s.gone = true;
  scene.remove(s.rig.root);
  s.respawnT = s.team === 0 ? 40 : 0;
  onSuitGone(s);
}
