// Valor Bay — characters: one skinned mesh per person (rigid parts weighted to 15 bones), built from a look and a
// build, with an optional glowing overlay sharing the skeleton. Poses are set as target angles per bone and eased
// toward, so every animation blends into the next.

// bone indices
const B = { hips: 0, spine: 1, chest: 2, head: 3, armL: 4, foreL: 5, armR: 6, foreR: 7, thighL: 8, shinL: 9, thighR: 10, shinR: 11, cape1: 12, cape2: 13, prop: 14 };
const NB = 15;

// the colours of each part, from a hero's or villain's look (or a civilian's clothes)
function partsOf(kind, look) {
  const p = {
    torso: look.c1, abdomen: look.c1, pelvis: look.c2, upperArm: look.c1, foreArm: look.c1, hand: look.c2,
    thigh: look.c2, shin: look.c2, boot: look.c1, head: look.skin, hair: look.hair === undefined ? -1 : look.hair,
    eye: look.eye || 0, mask: !!look.mask, emblem: look.emblem || null, emblemCol: look.c3, belt: look.c3, cape: look.cape || -1,
    lens: look.mask && look.eye ? look.eye : 0, robot: !!look.robot, skin: look.skin, glove: look.c2,
  };
  switch (kind) {
    case 'spindle': Object.assign(p, { upperArm: look.c2, foreArm: look.c1, hand: look.c1, thigh: look.c2, shin: look.c2, boot: look.c1, head: look.c1, belt: look.c1, pelvis: look.c2 }); break;
    case 'skylark': Object.assign(p, { pelvis: look.c2, thigh: look.c2, shin: look.c2, boot: look.c3, hand: look.c2, belt: look.c3 }); break;
    case 'blitz': Object.assign(p, { abdomen: look.c2, pelvis: look.c2, thigh: look.c2, shin: look.c2, boot: look.c1, hand: look.c2, belt: look.c3, head: look.c1, emblemCol: look.c2 }); break;
    case 'bulwark': Object.assign(p, { upperArm: look.skin, foreArm: look.skin, hand: look.c3, boot: look.c1, belt: look.c3 }); break;
    case 'equinox': Object.assign(p, { foreArm: look.c1, hand: look.c2, handR: look.c3, boot: look.c2, bootR: look.c3, belt: look.c2, upperArmR: look.c3, upperArm: look.c2, thigh: look.c1, shin: look.c1 }); break;
    case 'mauler': Object.assign(p, { torso: look.skin, abdomen: look.skin, upperArm: look.skin, foreArm: look.skin, hand: look.skin, pelvis: look.c1, thigh: look.c1, shin: look.c1, boot: look.c3, belt: look.c2 }); break;
    case 'kilowatt': Object.assign(p, { abdomen: look.c2, hand: look.c2, boot: look.c2, belt: look.c2, thigh: look.c1, shin: look.c1, head: look.skin }); break;
    case 'overclock': Object.assign(p, { torso: look.c1, abdomen: look.c2, pelvis: look.c1, upperArm: look.c2, foreArm: look.c1, hand: look.c2, thigh: look.c1, shin: look.c2, boot: look.c1, head: look.c1, belt: look.c2 }); break;
  }
  return p;
}

// look for a civilian or crook
function civLook(rnd = Math.random) {
  const pk = (a) => a[Math.floor(rnd() * a.length)];
  const shirt = pk(SHIRTS), pants = pk(PANTS), skin = pk(SKINS);
  return { torso: shirt, abdomen: shirt, pelvis: pants, upperArm: rnd() < 0.5 ? shirt : skin, foreArm: skin, hand: skin, thigh: pants, shin: pants,
    boot: pk([0x2a2a2a, 0x5a3a2a, 0xf0f0f0, 0x8a2a2a]), head: skin, hair: pk(HAIRS), eye: 0, belt: pants, cape: -1, skin, longHair: rnd() < 0.35, hat: rnd() < 0.12 ? pk([0x2a2a3a, 0xc83a2a, 0x3a5aa8]) : -1, bag: rnd() < 0.2 };
}
function crookLook(gang, type) {
  const G2 = GANGS[gang], skin = pick(SKINS);
  const L0 = { torso: G2.c1, abdomen: G2.c1, pelvis: G2.c3, upperArm: G2.c1, foreArm: skin, hand: skin, thigh: G2.c3, shin: G2.c3, boot: 0x1a1a1a,
    head: skin, hair: pick(HAIRS), eye: 0, belt: G2.c2, cape: -1, skin, beanie: -1, bandana: -1 };
  if (gang === 'jackals') { L0.hair = G2.c2; L0.mohawk = true; L0.bandana = chance(0.5) ? G2.c2 : -1; }
  if (gang === 'gearheads') { L0.thigh = L0.shin = L0.pelvis = G2.c1; L0.torso = L0.abdomen = G2.c2; L0.upperArm = G2.c2; L0.beanie = G2.c1; }
  if (gang === 'suits') { L0.abdomen = G2.c2; L0.tie = G2.c3; L0.upperArm = L0.foreArm = G2.c1; L0.shades = true; }
  if (type === 'brute') { L0.upperArm = L0.foreArm = skin; L0.torso = G2.c3; L0.abdomen = G2.c3; L0.hair = -1; L0.beanie = -1; L0.mohawk = false; }
  return L0;
}

// ---------- building a rig ----------
function buildRig(parts, build, o = {}) {
  const h = build.h, bulk = build.bulk, legs = h * (build.legs || 0.5);
  const D = {
    h, legs, torso: h * 0.3, hr: h * 0.066, sw: h * 0.115 * Math.sqrt(bulk), hipW: h * 0.055 * Math.sqrt(bulk),
    ua: h * 0.17, fa: h * 0.16, armR: h * 0.034 * bulk, legR: h * 0.045 * bulk, depth: h * 0.1 * bulk,
  };
  D.chestY = legs + D.torso * 0.5; D.shY = legs + D.torso; D.headY = D.shY + h * 0.05 + D.hr;
  const M = new Mesher(); M.sk = [];
  const Gm = new Mesher(); Gm.sk = [];
  const at = (b) => { M.bone = b; Gm.bone = b; };
  const cyl = (col, x, y0, y1, r0, r1, z = 0, n = 8) => M.geo(P_TAPER(r1 / r0, n), col, x, (y0 + y1) / 2, z, 0, 0, 0, r0 * 2, Math.abs(y1 - y0), r0 * 2);
  const sph = (col, x, y, z, sx, sy, sz, n = 10) => M.geo(P_SPH(n, Math.max(6, n - 2)), col, x, y, z, 0, 0, 0, sx, sy, sz);
  const bulky = bulk;
  // hips and abdomen
  at(B.hips);
  M.geo(P_SPH(10, 6), parts.pelvis, 0, legs + 0.02, 0, 0, 0, 0, D.hipW * 2 + D.legR * 2.2, h * 0.11, D.depth * 1.8);
  cyl(parts.belt, 0, legs + 0.02, legs + h * 0.04, D.hipW + D.legR * 1.15, D.hipW + D.legR * 1.15, 0, 10);
  at(B.spine);
  cyl(parts.abdomen, 0, legs + h * 0.03, D.chestY, D.hipW + D.legR * 0.95, D.sw * 0.82, 0, 10);
  // chest: a wide tapered barrel
  at(B.chest);
  M.geo(P_TAPER(1.35, 10), parts.torso, 0, (D.chestY + D.shY) / 2, 0, 0, 0, 0, D.sw * 1.75, D.shY - D.chestY + 0.04, D.depth * 2.1 * (bulky > 1.3 ? 1.2 : 1));
  sph(parts.torso, 0, D.shY - 0.02, 0, D.sw * 2.3, h * 0.07, D.depth * 2);
  // emblem on the chest
  const ez = -D.depth * 1.08 - 0.01, ey = D.shY - D.torso * 0.28, es = h * 0.055;
  const em = parts.emblem, ec = parts.emblemCol;
  if (em === 'spider') { M.geo(P_SPH(6, 4), ec, 0, ey, ez, 0, 0, 0, es * 0.6, es * 1.1, 0.04); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) M.box(s * es * 0.6, ey + (k - 1) * es * 0.35, ez, es * 0.9, 0.02, 0.03, ec, 0, true); }
  if (em === 'star') { for (let k = 0; k < 5; k++) M.geo(new THREE.BoxGeometry(es * 0.32, es * 1.3, 0.03), ec, Math.sin(k / 5 * TAU) * es * 0.35, ey + Math.cos(k / 5 * TAU) * es * 0.35, ez, 0, 0, -k / 5 * TAU); }
  if (em === 'bolt') { M.geo(P_CYL(14), 0xffffff, 0, ey, ez + 0.01, Math.PI / 2, 0, 0, es * 2.1, 0.03, es * 2.1); M.geo(new THREE.BoxGeometry(es * 0.3, es * 1.6, 0.04), ec, 0, ey, ez - 0.01, 0, 0, 0.5); }
  if (em === 'fist') { M.box(0, ey, ez, es * 1.2, es * 1.1, 0.04, ec); M.box(0, ey - es * 0.9, ez, es * 0.6, es * 0.9, 0.04, ec); }
  if (em === 'yinyang') { M.geo(P_CYL(14), 0xff6a18, -es * 0.25, ey, ez, Math.PI / 2, 0, 0, es * 1.0, 0.03, es * 2); M.geo(P_CYL(14), 0x5ad8ff, es * 0.25, ey, ez, Math.PI / 2, 0, 0, es * 1.0, 0.03, es * 2); }
  if (parts.tie) { M.box(0, ey - es * 0.4, ez, es * 0.35, es * 3, 0.03, parts.tie); }
  if (parts.robot) { at(B.chest); Gm.geo(P_CYL(12), 0x40ff60, 0, ey, ez - 0.02, Math.PI / 2, 0, 0, es * 1.6, 0.05, es * 1.6); }
  // head
  at(B.head);
  const hy = D.headY, hr = D.hr;
  cyl(parts.skin === undefined ? parts.head : (parts.mask ? parts.head : parts.skin), 0, D.shY, hy - hr * 0.5, hr * 0.42, hr * 0.42);
  if (parts.robot) {
    M.box(0, hy, 0, hr * 1.9, hr * 2.1, hr * 2, parts.head); M.box(0, hy + hr * 1.05, 0, hr * 0.5, hr * 0.4, hr * 1.6, parts.belt);
    Gm.box(0, hy + hr * 0.15, -hr * 1.01, hr * 1.5, hr * 0.35, 0.03, parts.eye || 0xff2020);
  } else {
    sph(parts.head, 0, hy, 0, hr * 2, hr * 2.2, hr * 2.05, 12);
    if (parts.mask && parts.lens) {
      for (const s of [-1, 1]) {
        M.geo(P_SPH(8, 6), 0x101018, s * hr * 0.42, hy + hr * 0.12, -hr * 0.82, 0, s * 0.35, s * 0.45, hr * 0.62, hr * 0.48, hr * 0.3);
        M.geo(P_SPH(8, 6), parts.lens, s * hr * 0.42, hy + hr * 0.12, -hr * 0.88, 0, s * 0.35, s * 0.45, hr * 0.5, hr * 0.36, hr * 0.25);
      }
      if (parts.lens === 0x40d0ff) for (const s of [-1, 1]) Gm.geo(P_SPH(8, 6), parts.lens, s * hr * 0.42, hy + hr * 0.12, -hr * 0.92, 0, s * 0.35, s * 0.45, hr * 0.48, hr * 0.34, hr * 0.2);
    } else if (parts.mask) {
      // a cowl over the top half with eye holes and lightning ears (Blitz)
      sph(parts.skin, 0, hy - hr * 0.45, -hr * 0.12, hr * 1.7, hr * 1.1, hr * 1.85);
      for (const s of [-1, 1]) M.geo(P_SPH(6, 4), 0xffffff, s * hr * 0.36, hy + hr * 0.12, -hr * 0.93, 0, 0, 0, hr * 0.42, hr * 0.26, hr * 0.12);
      for (const s of [-1, 1]) M.geo(new THREE.BoxGeometry(hr * 0.2, hr * 1.1, hr * 0.15), 0xffffff, s * hr * 1.0, hy + hr * 0.5, 0, 0, 0, -s * 0.6);
    } else {
      for (const s of [-1, 1]) M.geo(P_SPH(6, 4), 0x18141a, s * hr * 0.36, hy + hr * 0.1, -hr * 0.93, 0, 0, 0, hr * 0.2, hr * 0.26, hr * 0.12);
      if (parts.shades) M.box(0, hy + hr * 0.12, -hr * 0.98, hr * 1.5, hr * 0.32, 0.03, 0x101014);
      if (parts.bandana >= 0 && parts.bandana !== undefined) M.geo(P_SPH(8, 6), parts.bandana, 0, hy - hr * 0.5, -hr * 0.25, 0, 0, 0, hr * 1.95, hr * 0.9, hr * 1.9);
    }
    if (parts.eye && !parts.mask && parts.eye !== 0) for (const s of [-1, 1]) Gm.geo(P_SPH(6, 4), parts.eye, s * hr * 0.36, hy + hr * 0.1, -hr * 0.95, 0, 0, 0, hr * 0.22, hr * 0.22, hr * 0.12);
    if (parts.hair >= 0) {
      if (parts.mohawk) M.box(0, hy + hr * 1.0, hr * 0.1, hr * 0.35, hr * 0.8, hr * 1.9, parts.hair);
      else {
        sph(parts.hair, 0, hy + hr * 0.35, hr * 0.12, hr * 2.15, hr * 1.7, hr * 2.15);
        if (parts.longHair) M.box(0, hy - hr * 0.6, hr * 0.75, hr * 1.9, hr * 2.4, hr * 0.6, parts.hair);
      }
    }
    if (parts.beanie >= 0 && parts.beanie !== undefined) sph(parts.beanie, 0, hy + hr * 0.5, 0.02, hr * 2.2, hr * 1.5, hr * 2.2);
    if (parts.hat >= 0 && parts.hat !== undefined) { cyl(parts.hat, 0, hy + hr * 0.6, hy + hr * 1.5, hr * 1.05, hr * 1.0, 0, 10); M.geo(P_CYL(12), parts.hat, 0, hy + hr * 0.6, 0, 0, 0, 0, hr * 3.2, 0.02, hr * 3.2); }
  }
  // arms (bones at the shoulders, pointing down)
  for (const s of [-1, 1]) {
    const sx = s * D.sw, R_ = s > 0;
    at(R_ ? B.armR : B.armL);
    sph(R_ && parts.upperArmR ? parts.upperArmR : parts.upperArm, sx, D.shY - D.armR * 0.6, 0, D.armR * 2.7, D.armR * 2.6, D.armR * 2.5);
    cyl(R_ && parts.upperArmR ? parts.upperArmR : parts.upperArm, sx, D.shY - D.ua, D.shY - D.armR, D.armR * 0.9, D.armR * 1.15);
    at(R_ ? B.foreR : B.foreL);
    const ey2 = D.shY - D.ua;
    cyl(parts.foreArm === parts.upperArm && R_ && parts.upperArmR ? parts.upperArmR : parts.foreArm, sx, ey2 - D.fa, ey2, D.armR * 0.75, D.armR * 0.95);
    const hc = R_ && parts.handR ? parts.handR : parts.hand;
    sph(hc, sx, ey2 - D.fa - D.armR * 0.5, -D.armR * 0.1, D.armR * 2.2, D.armR * 2.6, D.armR * 2.1);
    if (hc !== parts.skin && parts.glove !== undefined && !parts.robot) cyl(hc, sx, ey2 - D.fa * 0.55, ey2 - D.fa * 0.98, D.armR * 0.95, D.armR * 1.05);
    if (o.glowHands) Gm.geo(P_SPH(8, 6), R_ ? 0x80e8ff : 0xffa040, sx, ey2 - D.fa - D.armR * 0.5, -D.armR * 0.1, 0, 0, 0, D.armR * 2.6, D.armR * 3, D.armR * 2.5);
  }
  // legs
  for (const s of [-1, 1]) {
    const lx = s * D.hipW, R_ = s > 0;
    at(R_ ? B.thighR : B.thighL);
    cyl(parts.thigh, lx, legs * 0.5, legs, D.legR * 0.85, D.legR * 1.1);
    at(R_ ? B.shinR : B.shinL);
    cyl(parts.shin, lx, h * 0.05, legs * 0.5, D.legR * 0.65, D.legR * 0.85);
    const bc = R_ && parts.bootR ? parts.bootR : parts.boot;
    if (bc !== parts.shin) cyl(bc, lx, h * 0.04, legs * 0.27, D.legR * 0.72, D.legR * 0.8);
    M.box(lx, h * 0.03, -D.legR * 0.45, D.legR * 1.5, h * 0.06, D.legR * 2.9, bc);
  }
  if (parts.bag) { at(B.chest); M.box(D.sw * 0.4, D.chestY, D.depth * 1.2, D.sw * 1.1, D.torso * 0.6, D.depth * 0.7, 0x8a5a3a); }
  // cape: two panels hanging from the shoulders
  if (parts.cape >= 0) {
    // tapered panels: narrow at the collar, flaring toward the hem
    const cz = D.depth * 1.25, y0 = D.shY, y1 = legs, y2 = legs - h * 0.34;
    const w0 = D.sw * 1.1, w1 = D.sw * 1.6, w2 = D.sw * 1.9;
    at(B.cape1); M.quad([-w0, y0, cz], [-w1, y1, cz], [w1, y1, cz], [w0, y0, cz], parts.cape); M.quad([w0, y0, cz], [w1, y1, cz], [-w1, y1, cz], [-w0, y0, cz], parts.cape);
    at(B.cape2); M.quad([-w1, y1, cz], [-w2, y2, cz], [w2, y2, cz], [w1, y1, cz], parts.cape); M.quad([w1, y1, cz], [w2, y2, cz], [-w2, y2, cz], [-w1, y1, cz], parts.cape);
  }
  // a weapon in the right hand
  if (o.weapon) {
    at(B.prop);
    const hx = D.sw, hy2 = D.shY - D.ua - D.fa - D.armR * 0.5;
    if (o.weapon === 'bat') M.geo(P_TAPER(0.55, 8), 0xb8864a, hx, hy2 - 0.05, -0.38, Math.PI / 2 + 0.2, 0, 0, 0.09, 0.85, 0.09);
    if (o.weapon === 'pipe') M.geo(P_CYL(8), 0x8a8a90, hx, hy2 - 0.05, -0.5, Math.PI / 2 + 0.2, 0, 0, 0.09, 1.2, 0.09);
    if (o.weapon === 'gun') { M.box(hx, hy2 + 0.02, -0.14, 0.06, 0.08, 0.26, 0x2a2a30); M.box(hx, hy2 - 0.06, -0.06, 0.05, 0.12, 0.06, 0x3a2a20); }
  }
  // the skeleton
  const bones = []; for (let i = 0; i < NB; i++) bones.push(new THREE.Bone());
  const P = (i, parent, x, y, z) => { bones[i].position.set(x, y, z); if (parent >= 0) bones[parent].add(bones[i]); };
  P(B.hips, -1, 0, legs, 0); P(B.spine, B.hips, 0, 0.02, 0); P(B.chest, B.spine, 0, D.chestY - legs - 0.02, 0); P(B.head, B.chest, 0, D.shY - D.chestY, 0);
  P(B.armL, B.chest, -D.sw, D.shY - D.chestY - 0.02, 0); P(B.foreL, B.armL, 0, -D.ua + 0.02, 0);
  P(B.armR, B.chest, D.sw, D.shY - D.chestY - 0.02, 0); P(B.foreR, B.armR, 0, -D.ua + 0.02, 0);
  P(B.thighL, B.hips, -D.hipW, 0, 0); P(B.shinL, B.thighL, 0, -legs * 0.5, 0);
  P(B.thighR, B.hips, D.hipW, 0, 0); P(B.shinR, B.thighR, 0, -legs * 0.5, 0);
  P(B.cape1, B.chest, 0, D.shY - D.chestY, D.depth * 1.2); P(B.cape2, B.cape1, 0, legs - D.shY, 0);
  P(B.prop, B.foreR, 0, -D.fa, 0);
  const mat = o.mat || MATS.skin;
  const mesh = new THREE.SkinnedMesh(M.build(), mat);
  mesh.add(bones[0]);
  mesh.updateMatrixWorld(true);
  const skel = new THREE.Skeleton(bones);
  mesh.bind(skel);
  mesh.frustumCulled = false;
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  mesh.position.y = -h * 0.55;
  root.add(mesh);
  let glow = null;
  if (!Gm.empty) {
    glow = new THREE.SkinnedMesh(Gm.build(), MATS.glowSkin || (MATS.glowSkin = new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true })));
    glow.bind(skel, mesh.bindMatrix); glow.position.copy(mesh.position); glow.frustumCulled = false;
    root.add(glow);
  }
  const rig = { root, mesh, glow, bones, D, tgt: [], t: 0, mat };
  for (let i = 0; i < NB; i++) rig.tgt.push([0, 0, 0]);
  return rig;
}
function disposeRig(M) {
  if (M.root.parent) M.root.parent.remove(M.root);
  M.mesh.geometry.dispose(); if (M.glow) M.glow.geometry.dispose();
  if (M.mat && M.mat !== MATS.skin) M.mat.dispose();
}

// ---------- poses ----------
// set every target to zero, then the pose functions add to them
function poseReset(M) { for (const t of M.tgt) { t[0] = 0; t[1] = 0; t[2] = 0; } }
function setT(M, b, x, y, z) { const t = M.tgt[b]; t[0] = x; t[1] = y; t[2] = z; }
function addT(M, b, x, y = 0, z = 0) { const t = M.tgt[b]; t[0] += x; t[1] += y; t[2] += z; }
// ease the bones toward the targets (rate 0 snaps)
function poseApply(M, dt, rate = 14) {
  const k = rate ? 1 - Math.exp(-rate * dt) : 1;
  for (let i = 0; i < NB; i++) {
    const r = M.bones[i].rotation, t = M.tgt[i];
    r.x += (t[0] - r.x) * k; r.y += (t[1] - r.y) * k; r.z += (t[2] - r.z) * k;
  }
}
// arms resting a little out from the body
function armsRest(M, out = 0.12) { setT(M, B.armL, 0, 0, -out); setT(M, B.armR, 0, 0, out); setT(M, B.foreL, 0.15, 0, 0); setT(M, B.foreR, 0.15, 0, 0); }
// walking and running, phase ph in radians, amount a (0 walk .. 1 sprint)
function poseRun(M, ph, a, lean = 0) {
  const sw = lerp(0.5, 1.1, a), s = Math.sin(ph), c = Math.cos(ph);
  setT(M, B.thighL, s * sw, 0, 0); setT(M, B.thighR, -s * sw, 0, 0);
  setT(M, B.shinL, -Math.max(0, -c) * sw * 1.4 - 0.1, 0, 0); setT(M, B.shinR, -Math.max(0, c) * sw * 1.4 - 0.1, 0, 0);
  setT(M, B.armL, -s * sw * 0.8, 0, -0.1); setT(M, B.armR, s * sw * 0.8, 0, 0.1);
  setT(M, B.foreL, 0.3 + a * 1.1, 0, 0); setT(M, B.foreR, 0.3 + a * 1.1, 0, 0);
  setT(M, B.spine, -lean - a * 0.15, Math.sin(ph) * 0.12 * a, 0); setT(M, B.chest, -a * 0.08, -Math.sin(ph) * 0.1, 0);
  setT(M, B.hips, 0, -s * 0.12, 0);
}
function poseIdle(M, t, cape = 0) {
  armsRest(M);
  setT(M, B.chest, Math.sin(t * 1.6) * 0.03, 0, 0); setT(M, B.head, 0, Math.sin(t * 0.4) * 0.15, 0);
  setT(M, B.thighL, 0, 0, -0.05); setT(M, B.thighR, 0, 0, 0.05);
}
// heroic stance: fists on hips
function poseHero(M, t) {
  setT(M, B.armL, 0.1, 0, -0.55); setT(M, B.foreL, 1.6, -0.6, 0.6); setT(M, B.armR, 0.1, 0, 0.55); setT(M, B.foreR, 1.6, 0.6, -0.6);
  setT(M, B.chest, -0.05 + Math.sin(t * 1.6) * 0.03, 0, 0); setT(M, B.thighL, 0, 0, -0.18); setT(M, B.thighR, 0, 0, 0.18); setT(M, B.head, -0.08, Math.sin(t * 0.5) * 0.2, 0);
}
function poseAir(M, vy, t) {
  const up = clamp(vy / 10, -1, 1);
  setT(M, B.thighL, 0.6 + up * 0.3, 0, -0.1); setT(M, B.shinL, -1.0, 0, 0); setT(M, B.thighR, 0.1 - up * 0.2, 0, 0.1); setT(M, B.shinR, -0.5, 0, 0);
  setT(M, B.armL, 0.4, 0, -0.8 - up * 0.3); setT(M, B.armR, 0.4, 0, 0.8 + up * 0.3); setT(M, B.foreL, 0.6, 0, 0); setT(M, B.foreR, 0.6, 0, 0);
}
// hanging from a line held in the right hand
function poseSwing(M, t, tuck) {
  setT(M, B.armR, Math.PI * 0.95, 0, 0.15); setT(M, B.foreR, 0.1, 0, 0);
  setT(M, B.armL, 0.3, 0, -0.9); setT(M, B.foreL, 0.9, 0, 0);
  setT(M, B.thighL, 0.4 + tuck * 0.8, 0, -0.05); setT(M, B.shinL, -0.6 - tuck, 0, 0); setT(M, B.thighR, 0.2 + tuck * 0.6, 0, 0.05); setT(M, B.shinR, -0.3 - tuck * 0.8, 0, 0);
}
// flying: body horizontal (the root pitches), one fist forward
function poseFly(M, t, fast) {
  setT(M, B.armR, Math.PI * 0.98, 0, 0.08); setT(M, B.foreR, 0, 0, 0);
  setT(M, B.armL, fast ? 0.2 : Math.PI * 0.9, 0, fast ? -0.2 : -0.15); setT(M, B.foreL, fast ? 0.2 : 0.1, 0, 0);
  setT(M, B.thighL, -0.05, 0, -0.04); setT(M, B.thighR, 0.2 + Math.sin(t * 3) * 0.05, 0, 0.04); setT(M, B.shinR, -0.5, 0, 0);
  setT(M, B.head, -0.9, 0, 0);
}
function poseHover(M, t) {
  setT(M, B.armL, 0.1, 0, -0.45); setT(M, B.armR, 0.1, 0, 0.45); setT(M, B.foreL, 0.3, 0, 0); setT(M, B.foreR, 0.3, 0, 0);
  setT(M, B.thighL, 0.15 + Math.sin(t * 2) * 0.08, 0, -0.05); setT(M, B.shinL, -0.3, 0, 0); setT(M, B.thighR, 0.05 - Math.sin(t * 2) * 0.08, 0, 0.05); setT(M, B.shinR, -0.5, 0, 0);
}
// clinging to a wall like a spider (the root is tilted onto the wall)
function poseCrawl(M, ph, moving) {
  const s = moving ? Math.sin(ph) : 0;
  setT(M, B.armL, 2.4 + s * 0.4, 0, -0.7); setT(M, B.foreL, 0.9, 0, 0); setT(M, B.armR, 2.4 - s * 0.4, 0, 0.7); setT(M, B.foreR, 0.9, 0, 0);
  setT(M, B.thighL, 1.0 - s * 0.4, 0, -0.6); setT(M, B.shinL, -1.6, 0, 0); setT(M, B.thighR, 1.0 + s * 0.4, 0, 0.6); setT(M, B.shinR, -1.6, 0, 0);
  setT(M, B.spine, 0.1, 0, 0); setT(M, B.head, -0.6, 0, 0);
}
// melee: n picks the move, p is progress 0..1 (wind up, strike, recover)
function posePunch(M, n, p) {
  const k = p < 0.3 ? p / 0.3 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
  const wind = p < 0.3 ? 1 - p / 0.3 : 0;
  switch (n % 4) {
    case 0: setT(M, B.armR, 1.5 * k - 0.4 * wind, 0, 0.15); setT(M, B.foreR, 0.2 + wind * 1.6, 0, 0); setT(M, B.armL, 0.4, 0, -0.3); setT(M, B.foreL, 1.8, 0, 0); setT(M, B.spine, -0.1, -0.5 * k + 0.3 * wind, 0); break;
    case 1: setT(M, B.armL, 1.5 * k - 0.4 * wind, 0, -0.15); setT(M, B.foreL, 0.2 + wind * 1.6, 0, 0); setT(M, B.armR, 0.4, 0, 0.3); setT(M, B.foreR, 1.8, 0, 0); setT(M, B.spine, -0.1, 0.5 * k - 0.3 * wind, 0); break;
    case 2: setT(M, B.thighR, 1.5 * k - 0.3 * wind, 0, 0.1); setT(M, B.shinR, -1.4 * (1 - k) - 0.1, 0, 0); setT(M, B.spine, 0.25 * k, 0, 0); setT(M, B.armL, 0.3, 0, -0.9); setT(M, B.armR, 0.3, 0, 0.9); setT(M, B.thighL, -0.1, 0, 0); break;
    case 3: setT(M, B.armR, 2.6 * k - 0.3 * wind, 0, 0.1); setT(M, B.foreR, 0.6 * (1 - k) + 1.2 * wind, 0, 0); setT(M, B.spine, -0.35 * wind + 0.15 * k, -0.3 * k, 0); setT(M, B.thighL, 0.4 * wind, 0, 0); setT(M, B.shinL, -0.7 * wind, 0, 0); setT(M, B.armL, 0.3, 0, -0.4); setT(M, B.foreL, 1.5, 0, 0); break;
  }
}
// arm(s) out toward an aim pitch
function poseCast(M, pitch, both = false, left = false) {
  const a = Math.PI / 2 - pitch;
  if (both || !left) { setT(M, B.armR, a, 0.1, 0.05); setT(M, B.foreR, 0.05, 0, 0); }
  if (both || left) { setT(M, B.armL, a, -0.1, -0.05); setT(M, B.foreL, 0.05, 0, 0); }
  setT(M, B.chest, 0, both ? 0 : left ? 0.35 : -0.35, 0);
}
function poseLift(M) { setT(M, B.armL, Math.PI * 0.95, 0, -0.35); setT(M, B.armR, Math.PI * 0.95, 0, 0.35); setT(M, B.foreL, 0.4, 0, 0); setT(M, B.foreR, 0.4, 0, 0); setT(M, B.thighL, 0, 0, -0.2); setT(M, B.thighR, 0, 0, 0.2); }
function poseCrouch(M, k) {
  setT(M, B.thighL, 1.1 * k, 0, -0.25 * k); setT(M, B.thighR, 1.1 * k, 0, 0.25 * k); setT(M, B.shinL, -2.0 * k, 0, 0); setT(M, B.shinR, -2.0 * k, 0, 0);
  setT(M, B.spine, -0.5 * k, 0, 0); setT(M, B.armL, -0.4 * k, 0, -0.3); setT(M, B.armR, -0.4 * k, 0, 0.3); setT(M, B.foreL, 0.5, 0, 0); setT(M, B.foreR, 0.5, 0, 0);
}
function poseSlam(M, k) { poseCrouch(M, 0.7 * k); setT(M, B.armL, 1.4 - 1.2 * k, 0, -0.2); setT(M, B.armR, 1.4 - 1.2 * k, 0, 0.2); setT(M, B.foreL, 0.2, 0, 0); setT(M, B.foreR, 0.2, 0, 0); }
function poseClap(M, k) { setT(M, B.armL, 1.5, -0.9 * k + 0.6 * (1 - k), 0); setT(M, B.armR, 1.5, 0.9 * k - 0.6 * (1 - k), 0); setT(M, B.foreL, 0.1, 0, 0); setT(M, B.foreR, 0.1, 0, 0); setT(M, B.spine, -0.2 * k, 0, 0); }
function poseCower(M, t) {
  poseCrouch(M, 0.8);
  setT(M, B.armL, 2.4, 0, -0.4); setT(M, B.armR, 2.4, 0, 0.4); setT(M, B.foreL, 1.9, 0, 0); setT(M, B.foreR, 1.9, 0, 0); setT(M, B.head, 0.4 + Math.sin(t * 20) * 0.04, 0, 0);
}
function poseCheer(M, t) {
  setT(M, B.armL, Math.PI * 0.9 + Math.sin(t * 9) * 0.25, 0, -0.4); setT(M, B.armR, Math.PI * 0.9 - Math.sin(t * 9) * 0.25, 0, 0.4); setT(M, B.foreL, 0.3, 0, 0); setT(M, B.foreR, 0.3, 0, 0);
  setT(M, B.head, -0.2, 0, 0);
}
function poseHurt(M, k) { setT(M, B.spine, 0.35 * k, 0, 0); setT(M, B.head, 0.4 * k, 0, 0); setT(M, B.armL, 0.6 * k, 0, -0.6 * k); setT(M, B.armR, 0.6 * k, 0, 0.6 * k); }
function poseTumble(M, t) {
  setT(M, B.armL, 2.2 + Math.sin(t * 8) * 0.5, 0, -0.8); setT(M, B.armR, 2.0 - Math.sin(t * 8) * 0.5, 0, 0.8);
  setT(M, B.thighL, 0.8 + Math.sin(t * 7) * 0.5, 0, -0.4); setT(M, B.thighR, 0.4 - Math.sin(t * 7) * 0.5, 0, 0.4); setT(M, B.shinL, -1, 0, 0); setT(M, B.shinR, -0.6, 0, 0);
}
// flat on the back (the root lies down), limbs splayed
function poseKO(M) {
  setT(M, B.armL, 1.4, 0, -1.2); setT(M, B.armR, 0.6, 0, 1.3); setT(M, B.foreL, 0.6, 0, 0); setT(M, B.foreR, 0.3, 0, 0);
  setT(M, B.thighL, 0.25, 0, -0.25); setT(M, B.thighR, 0.05, 0, 0.3); setT(M, B.shinL, -0.5, 0, 0); setT(M, B.head, 0, 0.6, 0);
}
function poseBound(M) { setT(M, B.armL, 0, 0, -0.03); setT(M, B.armR, 0, 0, 0.03); setT(M, B.foreL, 0.05, 0, 0); setT(M, B.foreR, 0.05, 0, 0); setT(M, B.thighL, 0, 0, 0.02); setT(M, B.thighR, 0, 0, -0.02); }
function poseSpin(M) { setT(M, B.armL, 0.2, 0, -1.5); setT(M, B.armR, 0.2, 0, 1.5); setT(M, B.foreL, 0.1, 0, 0); setT(M, B.foreR, 0.1, 0, 0); }
function poseAimGun(M, pitch) { setT(M, B.armR, Math.PI / 2 - pitch, 0.25, 0); setT(M, B.foreR, 0, 0, 0); setT(M, B.armL, Math.PI / 2 - pitch - 0.1, -0.5, 0); setT(M, B.foreL, 0.4, 0, 0); setT(M, B.chest, 0, 0.2, 0); }
function poseCape(M, speed, t) {
  const fl = clamp(speed / 30, 0, 1);
  setT(M, B.cape1, -0.12 - fl * 1.1 + Math.sin(t * 9) * 0.06 * (0.3 + fl), 0, 0);
  setT(M, B.cape2, -0.1 - fl * 0.35 + Math.sin(t * 9 + 1.2) * 0.15 * (0.3 + fl), 0, 0);
}
