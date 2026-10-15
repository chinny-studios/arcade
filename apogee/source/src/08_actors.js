// 08_actors: people are rigid box parts on a small joint hierarchy, lit per vertex in the shader. Poses are plain
// objects of joint angles, mixed each frame from the base action (idle, walk, run, aim, kneel, surrender) plus an
// additive hit reaction that depends on where the bullet landed. Deaths are short scripted falls, picked from the
// hit location and direction. Model forward is -z; the right hand is +x.
const FACE_HAIR = { face_a: [0.23, 0.17, 0.11], face_b: [0.54, 0.42, 0.23], face_c: [0.07, 0.07, 0.07], face_d: [0.16, 0.13, 0.09], face_e: [0.07, 0.07, 0.07], face_f: [0.7, 0.58, 0.38], face_sci: [0.8, 0.8, 0.8], face_sci2: [0.35, 0.19, 0.09], face_boss: [0.75, 0.75, 0.72], face_visor: [0.15, 0.15, 0.16] };
const SKIN = { face_c: [0.9, 0.82, 0.78], face_e: [0.7, 0.58, 0.5] };

// ---------------------------------------------------------------- weapon models (shared with view models and pickups)
// Built in local space with the barrel along -z and the grip near the origin.
function gunGeo(g, id, vm) {
  const T = TILE;
  // in first person the stock would sit inside the camera: leave out anything behind the grip
  if (vm) { const box = g.box.bind(g); g = Object.create(g); g.box = (x0, y0, z0, x1, y1, z1, t, s) => { if (z0 < 0.05) box(x0, y0, z0, x1, y1, z1, t, s); }; }
  switch (id) {
    case 'pk9': case 'tk33': {
      const L0 = id === 'tk33' ? 0.22 : 0.19;
      g.box(-0.018, 0.03, -L0 + 0.03, 0.018, 0.075, 0.04, { side: T.gunblue, top: T.gunmetal }, 0);
      g.box(-0.016, -0.1, -0.01, 0.016, 0.035, 0.05, T.gungrip, 0);
      g.box(-0.012, 0.0, -0.06, 0.012, 0.03, -0.005, T.gunmetal, 0);
      if (id === 'pk9') g.box(-0.016, 0.034, -L0 - 0.13, 0.016, 0.068, -L0 + 0.03, T.gunmetal, 0);
      break;
    }
    case 'vektor':
      g.box(-0.025, 0.0, -0.3, 0.025, 0.07, 0.05, { side: T.gunmetal, top: T.gunblue }, 0);
      g.box(-0.012, 0.02, -0.38, 0.012, 0.045, -0.3, T.gunmetal, 0);
      g.box(-0.016, -0.2, -0.17, 0.016, 0.0, -0.11, T.gunblue, 0);
      g.box(-0.016, -0.1, -0.02, 0.016, 0.0, 0.03, T.gungrip, 0);
      g.box(-0.01, 0.01, 0.05, 0.01, 0.05, 0.22, T.gunmetal, 0);
      break;
    case 'ar62':
      g.box(-0.028, 0.0, -0.32, 0.028, 0.08, 0.06, { side: T.gunmetal, top: T.gunblue }, 0);
      g.box(-0.03, -0.03, -0.55, 0.03, 0.05, -0.32, T.wood, 0);
      g.box(-0.012, 0.03, -0.82, 0.012, 0.055, -0.55, T.gunmetal, 0);
      g.box(-0.008, 0.055, -0.8, 0.008, 0.09, -0.77, T.gunmetal, 0);
      g.box(-0.018, -0.2, -0.27, 0.018, 0.0, -0.18, T.gunblue, 0);
      g.box(-0.018, -0.22, -0.3, 0.018, -0.15, -0.22, T.gunblue, 0);
      g.box(-0.016, -0.11, -0.04, 0.016, 0.0, 0.02, T.gungrip, 0);
      g.box(-0.03, -0.06, 0.06, 0.03, 0.07, 0.36, T.wood, 0);
      break;
    case 'sturm':
      g.box(-0.03, 0.0, -0.25, 0.03, 0.08, 0.05, T.gunmetal, 0);
      g.box(-0.016, 0.05, -0.8, 0.016, 0.08, -0.25, T.gunblue, 0);
      g.box(-0.02, 0.0, -0.6, 0.02, 0.045, -0.3, T.wood, 0);
      g.box(-0.016, -0.11, -0.03, 0.016, 0.0, 0.03, T.wood, 0);
      g.box(-0.03, -0.05, 0.05, 0.03, 0.07, 0.36, T.wood, 0);
      break;
    case 'zeus':
      g.box(-0.035, -0.01, -0.3, 0.035, 0.09, 0.08, { side: T.chrome, top: T.chrome }, 0);
      for (let k = 0; k < 4; k++) g.box(-0.05, 0.0, -0.36 - k * 0.07, 0.05, 0.08, -0.33 - k * 0.07, T.gold, 0);
      g.box(-0.02, 0.02, -0.66, 0.02, 0.06, -0.3, T.chrome, 0);
      g.box(-0.045, -0.005, -0.74, 0.045, 0.085, -0.66, T.gunblue, 0);
      g.box(-0.005, 0.09, -0.28, 0.005, 0.16, -0.06, T.steel_red, 0);
      g.box(-0.016, -0.12, -0.04, 0.016, 0.0, 0.02, T.gungrip, 0);
      g.box(-0.03, -0.04, 0.08, 0.03, 0.06, 0.3, T.chrome, 0);
      break;
    case 'camera':
      g.box(-0.07, -0.04, -0.03, 0.07, 0.05, 0.03, { front: T.camera_t, side: T.black, top: T.metal }, 0);
      g.box(-0.025, -0.02, -0.07, 0.025, 0.03, -0.03, T.black, 0);
      break;
    case 'bug':
      g.box(-0.03, -0.02, -0.05, 0.03, 0.02, 0.0, T.device, 0);
      break;
    case 'mines':
      g.cyl(0, -0.02, 0, 0.07, 0.04, 8, T.mine, T.mine, 1);
      break;
    case 'detonator':
      g.box(-0.03, -0.06, -0.03, 0.03, 0.06, 0.03, T.device, 0);
      break;
    default: break;
  }
}

// ---------------------------------------------------------------- building a person
function partMesh(mat, tint, build, hit, box) {
  const g = new Geo(); g.tint = tint; build(g);
  const m = new THREE.Mesh(g.build(), mat);
  m.userData.hit = hit; m.userData.box = box;
  return m;
}
function buildPerson(typeName, seed = 0) {
  const T = ACTOR_TYPES[typeName], R = mulberry32(seed * 977 + 5);
  const mat = makeMat({ dyn: true });
  const face = T.faces[Math.floor(R() * T.faces.length)];
  const hairT = FACE_HAIR[face] || [0.2, 0.15, 0.1], skin = SKIN[face] || [1, 1, 1];
  const cloth = T.cloth, legs = T.legs;
  const P = {};
  P.root = new THREE.Group(); P.fall = new THREE.Group(); P.root.add(P.fall);
  P.hips = new THREE.Group(); P.hips.position.y = 0.95; P.fall.add(P.hips);
  const parts = [];
  const add = (parent, m) => { parent.add(m); parts.push(m); return m; };
  add(P.hips, partMesh(mat, legs, (g) => g.box(-0.18, -0.08, -0.12, 0.18, 0.12, 0.12, TILE.cloth, 0), 'groin', [-0.18, -0.08, -0.12, 0.18, 0.12, 0.12]));
  P.torso = new THREE.Group(); P.torso.position.y = 0.1; P.hips.add(P.torso);
  const big = T.boss ? 1.08 : 1;
  add(P.torso, partMesh(mat, cloth, (g) => g.box(-0.22 * big, 0, -0.13, 0.22 * big, 0.56, 0.13, { front: TILE[T.body], side: TILE.cloth, top: TILE.cloth }, 0), 'torso', [-0.22 * big, 0, -0.13, 0.22 * big, 0.56, 0.13]));
  P.neck = new THREE.Group(); P.neck.position.y = 0.58; P.torso.add(P.neck);
  add(P.neck, partMesh(mat, skin, (g) => {
    g.box(-0.05, -0.04, -0.05, 0.05, 0.03, 0.05, TILE.skin, 0);
    g.box(-0.13, 0.02, -0.14, 0.13, 0.3, 0.13, { front: TILE[face], side: TILE[face === 'face_visor' ? 'metal_dk' : 'face_side'], back: TILE[face === 'face_visor' ? 'metal_dk' : 'face_back'], top: TILE.hair, bottom: TILE.skin }, 0);
  }, 'head', [-0.13, -0.04, -0.14, 0.13, 0.3, 0.13]));
  // hair tint on top: a thin cap of hair so the tint can differ from skin
  if (face !== 'face_visor' && !T.hat) add(P.neck, partMesh(mat, hairT, (g) => g.box(-0.135, 0.27, -0.12, 0.135, 0.32, 0.135, TILE.hair, 0), 'head', [-0.135, 0.27, -0.12, 0.135, 0.32, 0.135]));
  if (T.hat) {
    const ht = T.hatTint;
    let hb;
    if (T.hat === 'ushanka') hb = (g) => { g.box(-0.16, 0.24, -0.16, 0.16, 0.42, 0.16, { front: TILE.ushanka_f, side: TILE.fur, top: TILE.fur }, 0); g.box(-0.165, 0.12, -0.03, -0.135, 0.26, 0.11, TILE.fur, 0); g.box(0.135, 0.12, -0.03, 0.165, 0.26, 0.11, TILE.fur, 0); };
    else if (T.hat === 'helmet') hb = (g) => { g.box(-0.155, 0.2, -0.16, 0.155, 0.38, 0.16, TILE.helmet, 0); g.box(-0.12, 0.38, -0.12, 0.12, 0.41, 0.12, TILE.helmet, 0); };
    else hb = (g) => { g.box(-0.145, 0.27, -0.14, 0.145, 0.39, 0.145, { side: TILE.cloth, front: TILE.cloth, top: TILE.cloth }, 0); g.box(-0.14, 0.27, -0.25, 0.14, 0.29, -0.13, TILE.black, 0); g.box(-0.145, 0.33, -0.15, 0.145, 0.35, -0.13, TILE.gold, 0); };
    P.hat = partMesh(mat, ht, hb, 'hat', [-0.17, 0.2, -0.25, 0.17, 0.42, 0.17]);
    add(P.neck, P.hat);
  }
  const arm = (side) => {
    const sh = new THREE.Group(); sh.position.set(0.28 * side * big, 0.5, 0); P.torso.add(sh);
    add(sh, partMesh(mat, cloth, (g) => g.box(-0.065, -0.3, -0.065, 0.065, 0.05, 0.065, TILE.cloth, 0), side > 0 ? 'armR' : 'armL', [-0.065, -0.3, -0.065, 0.065, 0.05, 0.065]));
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    add(el, partMesh(mat, cloth, (g) => g.box(-0.055, -0.27, -0.055, 0.055, 0.0, 0.055, TILE.cloth, 0), side > 0 ? 'armR' : 'armL', [-0.055, -0.27, -0.055, 0.055, 0, 0.055]));
    const hand = new THREE.Group(); hand.position.y = -0.27; el.add(hand);
    add(hand, partMesh(mat, skin, (g) => g.box(-0.045, -0.11, -0.05, 0.045, 0.0, 0.05, TILE.hand, 0), side > 0 ? 'armR' : 'armL', [-0.045, -0.11, -0.05, 0.045, 0, 0.05]));
    return [sh, el, hand];
  };
  [P.shR, P.elR, P.handR] = arm(1);
  [P.shL, P.elL, P.handL] = arm(-1);
  const leg = (side) => {
    const hp = new THREE.Group(); hp.position.set(0.1 * side, 0, 0); P.hips.add(hp);
    add(hp, partMesh(mat, legs, (g) => g.box(-0.085, -0.46, -0.09, 0.085, 0.02, 0.09, TILE.cloth, 0), side > 0 ? 'legR' : 'legL', [-0.085, -0.46, -0.09, 0.085, 0.02, 0.09]));
    const kn = new THREE.Group(); kn.position.y = -0.46; hp.add(kn);
    add(kn, partMesh(mat, legs, (g) => { g.box(-0.075, -0.38, -0.08, 0.075, 0.0, 0.08, TILE.cloth, 0); }, side > 0 ? 'legR' : 'legL', [-0.075, -0.38, -0.08, 0.075, 0, 0.08]));
    add(kn, partMesh(mat, [1, 1, 1], (g) => g.box(-0.08, -0.49, -0.15, 0.08, -0.36, 0.09, TILE.boot, 0), side > 0 ? 'legR' : 'legL', [-0.08, -0.49, -0.15, 0.08, -0.36, 0.09]));
    return [hp, kn];
  };
  [P.hipR, P.knR] = leg(1);
  [P.hipL, P.knL] = leg(-1);
  P.parts = parts; P.mat = mat; P.face = face;
  if (T.weapon) attachGun(P, T.weapon);
  return P;
}
function attachGun(P, id) {
  if (P.gun) { P.handR.remove(P.gun); P.gun = null; }
  const g = new Geo(); gunGeo(g, id);
  const m = new THREE.Mesh(g.build(), P.mat);
  const holder = new THREE.Group();
  holder.rotation.x = -Math.PI / 2;
  holder.position.set(0, -0.07, -0.02);
  holder.add(m);
  P.handR.add(holder);
  P.gun = holder;
  P.muzzle = new THREE.Object3D();
  P.muzzle.position.set(0, 0.05, { pk9: -0.36, tk33: -0.22, vektor: -0.38, ar62: -0.82, sturm: -0.8, zeus: -0.74 }[id] || -0.3);
  m.add(P.muzzle);
}

// ---------------------------------------------------------------- poses
const POSE_KEYS = ['hipsY', 'hipsX', 'hipsZ', 'hipsYaw', 'torsoX', 'torsoY', 'torsoZ', 'neckX', 'neckY', 'shLX', 'shLY', 'shLZ', 'elL', 'shRX', 'shRY', 'shRZ', 'elR', 'hipLX', 'hipLZ', 'knL', 'hipRX', 'hipRZ', 'knR', 'fallX', 'fallZ', 'fallY'];
function newPose() { const p = {}; for (const k of POSE_KEYS) p[k] = 0; return p; }
function applyPose(P, p) {
  P.hips.position.y = 0.95 + p.hipsY;
  P.hips.rotation.set(p.hipsX, p.hipsYaw, p.hipsZ);
  P.torso.rotation.set(p.torsoX, p.torsoY, p.torsoZ);
  P.neck.rotation.set(p.neckX, p.neckY, 0);
  P.shL.rotation.set(p.shLX, p.shLY, p.shLZ); P.elL.rotation.x = p.elL;
  P.shR.rotation.set(p.shRX, p.shRY, p.shRZ); P.elR.rotation.x = p.elR;
  P.hipL.rotation.set(p.hipLX, 0, p.hipLZ); P.knL.rotation.x = p.knL;
  P.hipR.rotation.set(p.hipRX, 0, p.hipRZ); P.knR.rotation.x = p.knR;
  P.fall.rotation.set(p.fallX, p.fallY, p.fallZ);
}
// Base actions. a = actor (anim phase, aim pitch, weapon kind), k = blend weight already handled by caller.
function basePose(a, out) {
  for (const k of POSE_KEYS) out[k] = 0;
  const ph = a.phase, sp = a.animSpeed;           // sp: 0 idle .. 1 walk .. 2 run
  const walk = clamp(sp, 0, 1), run = clamp(sp - 1, 0, 1);
  const amp = 0.5 * walk + 0.35 * run;
  // legs
  out.hipLX = Math.sin(ph) * amp; out.hipRX = -Math.sin(ph) * amp;
  out.knL = -(0.08 + (0.5 + 0.5 * run) * Math.max(0, Math.sin(ph + 1.6))) * walk;
  out.knR = -(0.08 + (0.5 + 0.5 * run) * Math.max(0, Math.sin(ph + 1.6 + Math.PI))) * walk;
  out.hipsY = -Math.abs(Math.cos(ph)) * 0.035 * walk - 0.03 * run;
  out.torsoX = -0.18 * run;
  out.torsoY = Math.sin(ph) * 0.08 * walk;
  // idle breathing
  out.torsoX += Math.sin(a.t * 1.7 + a.seed) * 0.015;
  const twoHand = a.weapon === 'ar62' || a.weapon === 'zeus' || a.weapon === 'sturm' || a.weapon === 'vektor';
  if (a.action === 'surrender') {
    out.shLX = 2.9; out.shRX = 2.9; out.shLZ = -0.2; out.shRZ = 0.2; out.elL = 0.5; out.elR = 0.5; out.neckX = 0.1;
  } else if (a.action === 'cower') {
    out.hipsY = -0.42; out.knL = -1.9; out.knR = -1.9; out.hipLX = 1.0; out.hipRX = 1.0; out.torsoX = -0.5;
    out.shLX = 2.4; out.shRX = 2.4; out.elL = 2.2; out.elR = 2.2; out.shLZ = 0.4; out.shRZ = -0.4; out.neckX = -0.3;
  } else if (a.aiming && a.weapon) {
    const pitch = a.aimPitch || 0;
    if (twoHand) {
      out.shRX = 1.25 + pitch; out.shRY = 0.25; out.elR = 0.45; out.shRZ = 0.1;
      out.shLX = 1.45 + pitch; out.shLY = 0.6; out.elL = 0.35; out.shLZ = 0.25;
      out.torsoY = -0.25; out.neckY = 0.2;
    } else {
      out.shRX = 1.52 + pitch; out.shRY = 0.1; out.elR = 0.0;
      out.shLX = 0.2; out.elL = 0.3;
      out.torsoY = -0.15; out.neckY = 0.1;
    }
    out.neckX = -pitch * 0.5;
    if (a.kneel) {
      out.hipsY = -0.42; out.hipRX = 1.4; out.knR = -1.5; out.hipLX = 0.05; out.knL = -1.55; out.torsoX = -0.05;
    }
    // recoil
    if (a.recoil > 0) { out.shRX += a.recoil * 0.25; out.shLX += a.recoil * 0.2; out.torsoX += a.recoil * 0.06; }
  } else if (a.weapon) {
    // carry: gun held low across the body
    if (twoHand) { out.shRX = 0.5; out.elR = 0.9; out.shRY = 0.3; out.shLX = 0.8; out.elL = 1.1; out.shLY = 0.6; }
    else { out.shRX = 0.15 + Math.sin(ph) * 0.3 * walk; out.elR = 0.4; out.shLX = -Math.sin(ph) * 0.4 * walk; out.elL = 0.2; }
  } else {
    out.shLX = -Math.sin(ph) * 0.45 * walk; out.shRX = Math.sin(ph) * 0.45 * walk; out.elL = 0.2 + 0.4 * run; out.elR = 0.2 + 0.4 * run;
    out.shLZ = -0.06; out.shRZ = 0.06;
  }
}
// Additive hit reactions. e = envelope 0..1
function hitPose(where, e, side, out) {
  switch (where) {
    case 'head': out.neckX += 0.8 * e; out.torsoX += 0.25 * e; out.shLX += 0.6 * e; out.elL += 1.4 * e; break;
    case 'torso': out.torsoX += -0.55 * e; out.hipsY -= 0.08 * e; out.shLX += 0.7 * e; out.elL += 1.2 * e; out.shRX += 0.3 * e; out.knL -= 0.3 * e; out.knR -= 0.3 * e; out.hipLX += 0.15 * e; out.hipRX += 0.15 * e; break;
    case 'groin': out.torsoX += -0.75 * e; out.hipsY -= 0.12 * e; out.hipLX += 0.35 * e; out.hipRX += 0.35 * e; out.knL -= 0.6 * e; out.knR -= 0.6 * e; out.shLX += 0.9 * e; out.shRX += 0.6 * e; break;
    case 'armL': out.shLX -= 1.0 * e; out.shLZ -= 0.7 * e; out.torsoY += 0.6 * e; out.torsoZ += 0.15 * e; break;
    case 'armR': out.shRX -= 1.0 * e; out.shRZ += 0.7 * e; out.torsoY -= 0.6 * e; out.torsoZ -= 0.15 * e; break;
    case 'legL': out.hipLX += 1.0 * e; out.knL -= 1.5 * e; out.hipsY -= 0.12 * e; out.torsoX -= 0.35 * e; out.shLX += 0.9 * e; out.elL += 0.4 * e; out.hipsZ += 0.12 * e; break;
    case 'legR': out.hipRX += 1.0 * e; out.knR -= 1.5 * e; out.hipsY -= 0.12 * e; out.torsoX -= 0.35 * e; out.shRX += 0.6 * e; out.hipsZ -= 0.12 * e; break;
    case 'hat': out.neckX += 0.35 * e; break;
    default: out.torsoX += 0.3 * e * side; break;
  }
}
// Deaths: t in seconds since death. kind picks the fall.
function deathPose(kind, t, out) {
  const e = (x) => clamp(x, 0, 1);
  const lim = () => { out.shLZ = -0.5; out.shRZ = 0.5; out.elL = 0.3; out.elR = 0.3; };
  switch (kind) {
    case 'back': {   // snapped backwards, arms thrown up
      const f = e(t / 0.75);
      out.fallX = (Math.PI / 2 - 0.05) * f * f; out.knL = -0.4 * Math.sin(f * Math.PI); out.knR = -0.3 * Math.sin(f * Math.PI);
      out.shLX = 2.2 * Math.sin(f * 2) * (1 - f) + 2.6 * f; out.shRX = out.shLX; out.shLZ = -0.4; out.shRZ = 0.4; out.neckX = 0.3 * f;
      break;
    }
    case 'front': {  // to the knees, then face first
      const k = e(t / 0.45), f = e((t - 0.4) / 0.6);
      out.hipsY = -0.44 * smooth(k); out.knL = -1.6 * smooth(k); out.knR = -1.5 * smooth(k);
      out.hipLX = 0.05; out.hipRX = 0.0; out.torsoX = -0.3 * k;
      out.shLX = 0.5 * k; out.shRX = 0.3 * k; out.elL = 0.6; out.elR = 0.6;
      out.fallX = -(Math.PI / 2 - 0.25) * f * f; out.hipsY -= 0.0; out.neckY = 0.6 * f;
      if (f > 0) { out.knL = lerp(out.knL, -0.2, f); out.knR = lerp(out.knR, -0.2, f); out.hipsY = lerp(out.hipsY, -0.1, f); out.shLX = lerp(out.shLX, 2.8, f); out.shRX = lerp(out.shRX, 2.6, f); }
      break;
    }
    case 'spin': {   // spun round by a shoulder hit
      const f = e(t / 0.9);
      out.fallY = 3.6 * (1 - (1 - f) * (1 - f)); out.fallZ = (Math.PI / 2 - 0.05) * e((t - 0.3) / 0.6) ** 2;
      out.shRX = -0.6; out.shRZ = 1.2 * f; out.shLZ = -0.6; lim();
      out.knL = -0.4 * f; out.hipRX = 0.4 * f;
      break;
    }
    case 'crumple': { // legs give way
      const f = e(t / 0.5), g2 = e((t - 0.45) / 0.55);
      out.hipsY = -0.5 * f; out.knL = -1.8 * f; out.knR = -1.7 * f; out.hipLX = 0.3 * f; out.hipRX = 0.2 * f;
      out.torsoX = -0.4 * f; out.neckX = -0.4 * f; out.shLX = 0.3; out.shRX = 0.4;
      out.fallZ = (Math.PI / 2 - 0.1) * g2 * g2 * 0.95; out.fallX = 0.2 * g2;
      if (g2 > 0) { out.knL = lerp(out.knL, -0.9, g2); out.hipsY = lerp(out.hipsY, -0.3, g2); }
      break;
    }
    default: { // 'side'
      const f = e(t / 0.8);
      out.fallZ = -(Math.PI / 2 - 0.05) * f * f; out.knL = -0.6 * Math.sin(f * Math.PI); out.shLX = 1.0 * f; lim();
    }
  }
}
// Hit test a ray against a person's parts. Returns {t, part, x,y,z}
const _m4 = new THREE.Matrix4(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
function rayPerson(P, ox, oy, oz, dx, dy, dz, maxT) {
  let best = null;
  for (const m of P.parts) {
    if (!m.visible || !m.userData.box || !m.parent) continue;
    _m4.copy(m.matrixWorld).invert();
    _o.set(ox, oy, oz).applyMatrix4(_m4);
    _d.set(dx, dy, dz).transformDirection(_m4);
    // transformDirection normalises; recover the scale (parts have unit scale, so t carries over)
    const h = rayBox(_o.x, _o.y, _o.z, _d.x, _d.y, _d.z, m.userData.box);
    if (h && h.t <= maxT && (!best || h.t < best.t)) best = { t: h.t, part: m.userData.hit, mesh: m };
  }
  if (best) { best.x = ox + dx * best.t; best.y = oy + dy * best.t; best.z = oz + dz * best.t; }
  return best;
}
