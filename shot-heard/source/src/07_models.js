// Shot Heard — low-poly models: the instanced soldier kit (one draw call per body part for every man on the field),
// weapons, horses, field guns, gunboats and flag cloths.

// ---------- weapons ----------
// Origin at the wrist of the stock where the right hand grips; barrel along +Z. Returns geometry plus grip points.
const WOOD = col(0x6a4428), WOOD2 = col(0x9a6438), IRON = col(0x8c8c8a), DARKI = col(0x3c3a38), BRASS = col(0xc8a050), STEEL = col(0xb4b6b8);
function weaponGeo(model, fine) {
  const P = [], seg = fine ? 8 : 5;
  const stock = (len, butt, wood) => {
    P.push(part(GEO.box(0.042, 0.12, 0.3), wood, [0, -0.045, -0.26], [0.18, 0, 0]));                 // butt
    P.push(part(GEO.box(0.036, 0.05, 0.16), wood, [0, -0.005, -0.06], [0.1, 0, 0]));                 // wrist
    P.push(part(GEO.box(0.04, 0.045, len), wood, [0, 0.005, len / 2 + 0.02]));                        // forestock
    if (butt) P.push(part(GEO.box(0.046, 0.13, 0.012), BRASS, [0, -0.07, -0.41], [0.18, 0, 0]));
  };
  const barrel = (len, r, c, y = 0.03, z0 = -0.02) => P.push(part(GEO.cyl(r, r * 1.15, len, seg), c, [0, y, z0 + len / 2], [Math.PI / 2, 0, 0]));
  const lock = () => {
    P.push(part(GEO.box(0.012, 0.03, 0.11), IRON, [-0.024, 0.02, 0.06]));
    P.push(part(GEO.box(0.01, 0.045, 0.012), IRON, [-0.03, 0.05, 0.03], [-0.4, 0, 0]));                // cock
    P.push(part(GEO.box(0.01, 0.035, 0.01), IRON, [-0.026, 0.05, 0.1], [0.3, 0, 0]));                  // frizzen
    P.push(part(GEO.box(0.006, 0.03, 0.07), BRASS, [0, -0.045, 0.0]));                                 // trigger guard
  };
  let muzzle = 1, left = 0.42, len = 1.4;
  if (model === 'musket' || model === 'fowler' || model === 'carbine') {
    const L = model === 'carbine' ? 0.62 : model === 'fowler' ? 0.92 : 0.86;
    const bl = model === 'carbine' ? 0.72 : model === 'fowler' ? 1.08 : 1.0;
    stock(L, true, model === 'fowler' ? WOOD2 : WOOD); barrel(bl, 0.0115, IRON); lock();
    if (fine) { for (const z of [0.3, 0.55, 0.8].filter((z) => z < L)) P.push(part(GEO.cyl(0.014, 0.014, 0.025, 6), BRASS, [0, 0.0, z], [Math.PI / 2, 0, 0])); P.push(part(GEO.box(0.006, 0.012, 0.012), IRON, [0, 0.045, bl - 0.06])); }
    muzzle = bl - 0.02; left = Math.min(0.45, L - 0.1); len = bl + 0.42;
    if (model !== 'fowler') {
      const bz = model === 'carbine' ? 0.32 : 0.43;
      P.push(part(GEO.cyl(0.013, 0.013, 0.06, 6), STEEL, [0, 0.03, muzzle - 0.02], [Math.PI / 2, 0, 0]));
      P.push(part(GEO.box(0.01, 0.022, 0.05), STEEL, [0, 0.01, muzzle + 0.02]));
      P.push(part(GEO.cone(0.012, bz, 3), STEEL, [0, -0.005, muzzle + 0.04 + bz / 2], [Math.PI / 2, 0, 0], [1, 1, 0.6]));
    }
  } else if (model === 'rifle' || model === 'jaeger') {
    const long = model === 'rifle';
    const L = long ? 1.02 : 0.68, bl = long ? 1.12 : 0.74;
    stock(L, true, long ? WOOD2 : WOOD);
    P.push(part(GEO.cyl(0.014, 0.015, bl, 8), DARKI, [0, 0.03, -0.02 + bl / 2], [Math.PI / 2, 0, 0]));
    lock();
    P.push(part(GEO.box(0.044, 0.05, 0.11), BRASS, [-0.002, -0.05, -0.25], [0.18, 0, 0]));          // patchbox
    if (fine) P.push(part(GEO.box(0.006, 0.014, 0.012), BRASS, [0, 0.05, bl - 0.06]), part(GEO.box(0.016, 0.012, 0.01), IRON, [0, 0.048, 0.12]));
    muzzle = bl - 0.02; left = Math.min(0.48, L - 0.12); len = bl + 0.42;
  } else if (model === 'blunder') {
    stock(0.42, true, WOOD);
    P.push(part(GEO.cyl(0.02, 0.016, 0.55, seg), BRASS, [0, 0.03, 0.26], [Math.PI / 2, 0, 0]));
    P.push(part(GEO.cyl(0.045, 0.02, 0.12, seg), BRASS, [0, 0.03, 0.58], [Math.PI / 2, 0, 0]));
    lock(); muzzle = 0.62; left = 0.3; len = 1.0;
  } else if (model === 'pistol') {
    P.push(part(GEO.box(0.032, 0.11, 0.06), WOOD, [0, -0.055, -0.02], [0.5, 0, 0]));
    P.push(part(GEO.box(0.036, 0.04, 0.05), BRASS, [0, -0.11, -0.05], [0.5, 0, 0]));
    P.push(part(GEO.box(0.03, 0.03, 0.26), WOOD, [0, 0.0, 0.12]));
    P.push(part(GEO.cyl(0.011, 0.012, 0.3, seg), IRON, [0, 0.02, 0.13], [Math.PI / 2, 0, 0]));
    P.push(part(GEO.box(0.01, 0.025, 0.06), IRON, [-0.02, 0.012, 0.02]), part(GEO.box(0.008, 0.035, 0.01), IRON, [-0.024, 0.04, 0.0], [-0.4, 0, 0]));
    muzzle = 0.28; left = 0; len = 0.42;
  } else if (model === 'sword') {
    P.push(part(GEO.cyl(0.016, 0.018, 0.11, 6), col(0x2a2018), [0, 0, -0.03], [Math.PI / 2, 0, 0]));
    P.push(part(GEO.box(0.12, 0.012, 0.02), BRASS, [0, 0, 0.03]), part(GEO.sph(0.022, 6, 4), BRASS, [0, 0, -0.09]));
    P.push(part(GEO.box(0.006, 0.026, 0.8), STEEL, [0, 0, 0.44]));
    P.push(part(GEO.cone(0.013, 0.07, 3), STEEL, [0, 0, 0.87], [Math.PI / 2, 0, 0], [0.4, 1, 1]));
    muzzle = 0.9; left = 0; len = 0.95;
  } else if (model === 'hatchet') {
    P.push(part(GEO.box(0.025, 0.03, 0.46), WOOD2, [0, 0, 0.16]));
    P.push(part(GEO.box(0.012, 0.11, 0.06), IRON, [0, 0.05, 0.38]), part(GEO.box(0.03, 0.03, 0.04), IRON, [0, -0.02, 0.38]));
    muzzle = 0.4; left = 0; len = 0.5;
  } else if (model === 'knife') {
    P.push(part(GEO.box(0.022, 0.026, 0.1), col(0x3a2a1c), [0, 0, -0.02]), part(GEO.box(0.006, 0.026, 0.2), STEEL, [0, 0, 0.13]));
    muzzle = 0.22; left = 0; len = 0.25;
  } else if (model === 'spyglass') {
    P.push(part(GEO.cyl(0.02, 0.022, 0.2, 8), BRASS, [0, 0, 0.0], [Math.PI / 2, 0, 0]), part(GEO.cyl(0.025, 0.025, 0.18, 8), col(0x3a2a1c), [0, 0, 0.17], [Math.PI / 2, 0, 0]), part(GEO.cyl(0.03, 0.03, 0.06, 8), BRASS, [0, 0, 0.28], [Math.PI / 2, 0, 0]));
    muzzle = 0.3; left = 0.2; len = 0.32;
  } else if (model === 'grenade') {
    P.push(part(GEO.sph(0.055, 8, 6), col(0x2a2826)), part(GEO.cyl(0.012, 0.012, 0.04, 5), col(0x6a5a3a), [0, 0.06, 0]));
    muzzle = 0; left = 0; len = 0.1;
  } else if (model === 'keg') {
    P.push(part(GEO.cyl(0.17, 0.15, 0.36, 9), col(0x6a4a2c)), part(GEO.cyl(0.175, 0.175, 0.03, 9), DARKI, [0, 0.12, 0]), part(GEO.cyl(0.175, 0.175, 0.03, 9), DARKI, [0, -0.12, 0]));
    muzzle = 0; left = 0; len = 0.4;
  }
  const out = { geo: mergeParts(P), muzzle, left, len };
  // first-person copies split off the butt, which is hidden while aiming (it would sit against the eye)
  if (fine) {
    const stock = P.filter((pt) => pt.p && pt.p[2] < -0.03), front = P.filter((pt) => !(pt.p && pt.p[2] < -0.03));
    if (stock.length && front.length) { out.front = mergeParts(front); out.stock = mergeParts(stock); }
  }
  return out;
}
const WEAPON_MODEL_FOR = (wid) => {
  const d = WEAPONS[wid]; if (!d) return 'musket';
  return d.model;
};

// ---------- soldier kit ----------
const KIT = { slots: 0, corpse0: 0, ncorpse: 0, parts: {}, wm: {} };
const MAXS = 72, NCORPSE = 44;
const KIT_W_MODELS = ['musket', 'fowler', 'carbine', 'rifle', 'jaeger', 'blunder', 'pistol', 'sword', 'hatchet', 'knife'];
const BODY = { hip: 0.94, thigh: 0.45, shin: 0.45, uarm: 0.29, farm: 0.27, neck: 0.56, shoulderX: 0.19, shoulderY: 0.5 };
function soldierGeos() {
  const W = [1, 1, 1];
  const coat = mergeParts([
    part(GEO.box(0.34, 0.3, 0.22), W, [0, 0.4, 0], null, [1, 1, 1]),
    part(GEO.box(0.32, 0.24, 0.2), W, [0, 0.15, -0.005]),
    part(GEO.box(0.37, 0.1, 0.23), W, [0, 0.5, 0]),
    part(GEO.box(0.3, 0.44, 0.04), W, [0, -0.17, -0.1], [-0.08, 0, 0]),                    // back skirt
    part(GEO.box(0.04, 0.42, 0.18), W, [0.155, -0.16, -0.02], [0, 0, 0.06]),
    part(GEO.box(0.04, 0.42, 0.18), W, [-0.155, -0.16, -0.02], [0, 0, -0.06]),
  ]);
  const trim = mergeParts([
    part(GEO.box(0.07, 0.3, 0.02), W, [0.06, 0.36, 0.115], [0, 0, -0.06]),
    part(GEO.box(0.07, 0.3, 0.02), W, [-0.06, 0.36, 0.115], [0, 0, 0.06]),
    part(GEO.box(0.2, 0.06, 0.18), W, [0, 0.56, -0.01]),
    part(GEO.box(0.12, 0.16, 0.03), W, [0.09, -0.3, -0.12], [-0.1, 0, 0]),
    part(GEO.box(0.12, 0.16, 0.03), W, [-0.09, -0.3, -0.12], [-0.1, 0, 0]),
  ]);
  const gear = mergeParts([
    part(GEO.box(0.11, 0.48, 0.04), W, [0, 0.24, 0.1]),                                    // waistcoat
    part(GEO.box(0.05, 0.62, 0.012), W, [0, 0.27, 0.118], [0, 0, 0.6]),                    // crossbelts front
    part(GEO.box(0.05, 0.62, 0.012), W, [0, 0.27, 0.118], [0, 0, -0.6]),
    part(GEO.box(0.05, 0.62, 0.012), W, [0, 0.27, -0.118], [0, 0, 0.6]),
    part(GEO.box(0.05, 0.62, 0.012), W, [0, 0.27, -0.118], [0, 0, -0.6]),
    part(GEO.box(0.2, 0.14, 0.08), [0.16, 0.14, 0.12], [-0.12, 0.02, -0.12]),               // cartridge box (dark)
    part(GEO.box(0.16, 0.16, 0.06), [0.85, 0.8, 0.7], [0.15, 0.02, 0.06], [0, 0.6, 0]),     // haversack
    part(GEO.box(0.26, 0.26, 0.1), [0.72, 0.62, 0.48], [0, 0.34, -0.16]),                   // knapsack
    part(GEO.cyl(0.08, 0.08, 0.3, 6), [0.55, 0.3, 0.25], [0, 0.5, -0.18], [0, 0, Math.PI / 2]), // blanket roll
  ]);
  const head = mergeParts([
    part(GEO.cyl(0.05, 0.055, 0.1, 6), W, [0, 0.04, 0]),
    part(wobble(GEO.ico(0.105, 1), 0.012, 9), W, [0, 0.17, 0.01], null, [0.92, 1.08, 1]),
    part(GEO.box(0.03, 0.04, 0.04), W, [0, 0.15, 0.11]),                                    // nose
    part(GEO.box(0.18, 0.1, 0.1), [0.42, 0.32, 0.24], [0, 0.22, -0.05]),                    // hair
    part(GEO.box(0.04, 0.12, 0.04), [0.3, 0.24, 0.18], [0, 0.11, -0.11]),                   // queue
  ]);
  const tricorn = mergeParts([
    part(GEO.cyl(0.24, 0.24, 0.04, 3), W, [0, 0.0, 0], [0, Math.PI / 6 + Math.PI, 0], [1, 1, 1]),
    part(GEO.cyl(0.11, 0.115, 0.1, 8), W, [0, 0.06, 0]),
    part(GEO.cyl(0.2, 0.22, 0.05, 3), W, [0, 0.04, 0], [0, Math.PI / 6 + Math.PI, 0]),
    part(GEO.cyl(0.025, 0.025, 0.012, 6), [0.08, 0.08, 0.08], [0.11, 0.06, 0.1], [Math.PI / 2, 0, 0.8]),
  ]);
  const round = mergeParts([part(GEO.cyl(0.22, 0.23, 0.02, 10), W, [0, 0, 0]), part(GEO.cyl(0.1, 0.115, 0.14, 8), W, [0, 0.08, 0]), part(GEO.cyl(0.118, 0.118, 0.03, 8), [0.4, 0.4, 0.4], [0, 0.03, 0])]);
  const mitre = mergeParts([
    part(GEO.cyl(0.08, 0.115, 0.26, 8), col(0xa83028), [0, 0.11, -0.01]),
    part(GEO.box(0.2, 0.3, 0.02), col(0xc8a040), [0, 0.13, 0.08], [-0.12, 0, 0]),
    part(GEO.sph(0.035, 6, 4), col(0xe0d8c0), [0, 0.27, 0]),
  ]);
  const uarm = mergeParts([part(GEO.cyl(0.062, 0.054, BODY.uarm + 0.04, 6), W, [0, -BODY.uarm / 2, 0])]);
  const farm = mergeParts([part(GEO.cyl(0.054, 0.046, BODY.farm - 0.04, 6), W, [0, -BODY.farm / 2 + 0.03, 0]), part(GEO.cyl(0.062, 0.058, 0.08, 6), [0.78, 0.78, 0.78], [0, -BODY.farm + 0.05, 0])]);
  const hand = mergeParts([part(GEO.box(0.07, 0.09, 0.045), W, [0, -0.04, 0.01]), part(GEO.box(0.025, 0.05, 0.025), W, [0.035, -0.025, 0.03])]);
  const thigh = mergeParts([part(GEO.cyl(0.085, 0.066, BODY.thigh, 6), W, [0, -BODY.thigh / 2, 0])]);
  const shin = mergeParts([part(GEO.cyl(0.062, 0.05, BODY.shin - 0.04, 6), W, [0, -BODY.shin / 2 + 0.02, 0]), part(GEO.box(0.1, 0.07, 0.25), [0.08, 0.07, 0.06], [0, -BODY.shin + 0.02, 0.055]), part(GEO.box(0.03, 0.03, 0.04), [0.75, 0.65, 0.35], [0, -BODY.shin + 0.06, 0.12])]);
  const sash = mergeParts([part(GEO.cyl(0.18, 0.175, 0.08, 8), W, [0, 0.08, 0]), part(GEO.box(0.06, 0.24, 0.02), W, [0.14, -0.06, 0.04], [0, 0, 0.15])]);
  return { coat, trim, gear, head, tricorn, round, mitre, uarm, farm, hand, thigh, shin, sash };
}
function initKit() {
  const G = soldierGeos();
  const total = MAXS + NCORPSE;
  KIT.slots = total; KIT.corpse0 = MAXS;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mk = (name, geo, per) => {
    const m = new THREE.InstancedMesh(geo, mat, total * per);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < total * per; i++) { m.setMatrixAt(i, ZERO_M); m.setColorAt(i, _ic.setRGB(1, 1, 1)); }
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    scene.add(m);
    KIT.parts[name] = { m, per };
  };
  for (const n of ['coat', 'trim', 'gear', 'head', 'tricorn', 'round', 'mitre', 'sash']) mk(n, G[n], 1);
  for (const n of ['uarm', 'farm', 'hand', 'thigh', 'shin']) mk(n, G[n], 2);
  for (const wm of KIT_W_MODELS) {
    const W = weaponGeo(wm, false);
    const m = new THREE.InstancedMesh(W.geo, mat, total);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // r128 shares one program per material, so every instanced mesh on it needs instance colours too
    for (let i = 0; i < total; i++) { m.setMatrixAt(i, ZERO_M); m.setColorAt(i, _ic.setRGB(1, 1, 1)); }
    m.castShadow = true; m.frustumCulled = false;
    scene.add(m);
    KIT.wm[wm] = { m, info: W };
  }
}
function kitColor(name, i, c) { const p = KIT.parts[name]; p.m.setColorAt(i, _ic.setRGB(c[0], c[1], c[2])); p.m.instanceColor.needsUpdate = true; }
function dressSlot(slot, d) {
  kitColor('coat', slot, d.coat); kitColor('trim', slot, d.facing); kitColor('gear', slot, d.belt); kitColor('head', slot, d.skin);
  kitColor('sash', slot, d.sash || [1, 1, 1]);
  for (const h of ['tricorn', 'round', 'mitre']) kitColor(h, slot, h === 'mitre' ? [1, 1, 1] : d.hatC);
  for (let k = 0; k < 2; k++) {
    kitColor('uarm', slot * 2 + k, d.coat); kitColor('farm', slot * 2 + k, d.coat); kitColor('hand', slot * 2 + k, d.skin);
    kitColor('thigh', slot * 2 + k, d.breech); kitColor('shin', slot * 2 + k, d.hose);
  }
}
function hideSlot(slot) {
  for (const n in KIT.parts) { const p = KIT.parts[n]; for (let k = 0; k < p.per; k++) p.m.setMatrixAt(slot * p.per + k, ZERO_M); }
  for (const wm in KIT.wm) KIT.wm[wm].m.setMatrixAt(slot, ZERO_M);
}
// Copy a soldier's current pose and colours into a corpse slot.
function copySlot(from, to) {
  for (const n in KIT.parts) {
    const p = KIT.parts[n];
    for (let k = 0; k < p.per; k++) {
      p.m.getMatrixAt(from * p.per + k, _m1); p.m.setMatrixAt(to * p.per + k, _m1);
      p.m.getColorAt(from * p.per + k, _ic); p.m.setColorAt(to * p.per + k, _ic);
    }
    p.m.instanceColor.needsUpdate = true;
  }
  for (const wm in KIT.wm) { const m = KIT.wm[wm].m; m.getMatrixAt(from, _m1); m.setMatrixAt(to, _m1); }
}
function sinkSlot(slot, dy) {
  for (const n in KIT.parts) {
    const p = KIT.parts[n];
    for (let k = 0; k < p.per; k++) { p.m.getMatrixAt(slot * p.per + k, _m1); _m1.elements[13] -= dy; p.m.setMatrixAt(slot * p.per + k, _m1); }
  }
  for (const wm in KIT.wm) { const m = KIT.wm[wm].m; m.getMatrixAt(slot, _m1); _m1.elements[13] -= dy; m.setMatrixAt(slot, _m1); }
}
function flushKit() {
  for (const n in KIT.parts) KIT.parts[n].m.instanceMatrix.needsUpdate = true;
  for (const wm in KIT.wm) KIT.wm[wm].m.instanceMatrix.needsUpdate = true;
}

// Two-bone IK: shoulder S to target T with limb lengths a, b; bends toward pole. Writes two matrices (local frames).
const _ik = { d: new V3(), dir: new V3(), bend: new V3(), E: new V3(), X: new V3(), Y: new V3(), Z: new V3() };
function solveIK(S, T, a, b, pole, mU, mF, hand = 0) {
  const { d, dir, bend, E, X, Y, Z } = _ik;
  d.subVectors(T, S);
  // aim the wrist short of the grip so the hand closes around it instead of reaching past
  if (hand) { const l = d.length(); if (l > hand * 2) d.multiplyScalar((l - hand) / l); }
  let L = d.length();
  L = clamp(L, Math.abs(a - b) + 0.01, a + b - 0.002);
  dir.copy(d).normalize();
  const cosA = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  bend.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (bend.lengthSq() < 1e-6) bend.set(0, 0, 1).addScaledVector(dir, -dir.z);
  bend.normalize();
  E.copy(S).addScaledVector(dir, a * cosA).addScaledVector(bend, a * sinA);
  Y.subVectors(S, E).normalize(); X.crossVectors(Y, bend).normalize(); Z.crossVectors(X, Y);
  mU.makeBasis(X, Y, Z).setPosition(S);
  const Tc = _v8.copy(S).addScaledVector(dir, L);
  Y.subVectors(E, Tc).normalize(); X.crossVectors(Y, bend).normalize(); Z.crossVectors(X, Y);
  mF.makeBasis(X, Y, Z).setPosition(E);
  return Tc;
}

// ---------- pose → instance matrices ----------
// pose: { x, y, z, yaw, bodyPitch, bodyRoll, hipY, lean, twist, headYaw, headPitch, thigh:[l, r], knee:[l, r], splay,
//         wPos (V3 torso space), wQuat (Quaternion torso space), wModel, wWorld (Matrix4 if dropped), rh (V3) / lh (V3) hand targets
//         or null to hang, hat }
const _M = { root: new THREE.Matrix4(), hips: new THREE.Matrix4(), torso: new THREE.Matrix4(), head: new THREE.Matrix4(), tmp: new THREE.Matrix4(), w: new THREE.Matrix4(), u: new THREE.Matrix4(), f: new THREE.Matrix4(), h: new THREE.Matrix4() };
const _S = new V3(), _T = new V3(), _pole = new V3(), _wr = new V3(), _wl = new V3();
function setPart(name, idx, m) { KIT.parts[name].m.setMatrixAt(idx, m); }
function poseSoldier(slot, P) {
  const M = _M;
  _e1.set(P.bodyPitch || 0, P.yaw, P.bodyRoll || 0, 'YXZ');
  M.root.compose(_v1.set(P.x, P.y, P.z), _q1.setFromEuler(_e1), _v2.set(1, 1, 1));
  M.hips.copy(M.root).multiply(M.tmp.makeTranslation(0, P.hipY, 0));
  _e1.set(P.lean || 0, P.twist || 0, 0, 'YXZ');
  M.torso.copy(M.hips).multiply(M.tmp.makeRotationFromEuler(_e1));
  setPart('coat', slot, M.torso); setPart('trim', slot, M.torso); setPart('gear', slot, M.torso);
  setPart('sash', slot, P.sash ? M.torso : ZERO_M);
  _e1.set(P.headPitch || 0, P.headYaw || 0, P.headRoll || 0, 'YXZ');
  M.head.copy(M.torso).multiply(M.tmp.makeTranslation(0, BODY.neck, 0)).multiply(M.tmp.makeRotationFromEuler(_e1));
  setPart('head', slot, M.head);
  M.h.copy(M.head).multiply(M.tmp.makeTranslation(0, 0.25, 0.0));
  for (const h of ['tricorn', 'round', 'mitre']) setPart(h, slot, P.hat === h ? M.h : ZERO_M);
  // weapon in torso space (or world when dropped)
  let wi = null;
  for (const wm in KIT.wm) KIT.wm[wm].m.setMatrixAt(slot, ZERO_M);
  if (P.wModel && KIT.wm[P.wModel]) {
    wi = KIT.wm[P.wModel].info;
    if (P.wWorld) KIT.wm[P.wModel].m.setMatrixAt(slot, P.wWorld);
    else {
      M.w.compose(P.wPos, P.wQuat, _v2.set(1, 1, 1));
      KIT.wm[P.wModel].m.setMatrixAt(slot, M.tmp.multiplyMatrices(M.torso, M.w));
    }
  }
  // arms: IK in torso space to hand targets (default: hang by the sides)
  for (let side = 0; side < 2; side++) {
    const sx = side === 0 ? BODY.shoulderX : -BODY.shoulderX;          // 0 = left (+x), 1 = right (-x)
    _S.set(sx, BODY.shoulderY, 0);
    let tgt = side === 0 ? P.lh : P.rh;
    if (!tgt) tgt = _T.set(sx * 1.25, BODY.shoulderY - 0.52, 0.06 + (side ? -1 : 1) * (P.armSwing || 0));
    _pole.set(sx * 1.6, -0.4, -1.0);
    solveIK(_S, tgt, BODY.uarm, BODY.farm, _pole, M.u, M.f, side === 1 || (side === 0 && P.lh) ? 0.05 : 0);
    setPart('uarm', slot * 2 + side, M.tmp.multiplyMatrices(M.torso, M.u));
    setPart('farm', slot * 2 + side, M.tmp.multiplyMatrices(M.torso, M.f));
    M.h.copy(M.f).multiply(_m2.makeTranslation(0, -BODY.farm, 0));
    setPart('hand', slot * 2 + side, M.tmp.multiplyMatrices(M.torso, M.h));
  }
  // legs (forward kinematics from the hips)
  for (let side = 0; side < 2; side++) {
    const sx = side === 0 ? 0.1 : -0.1;
    _e1.set(P.thigh[side], 0, (side === 0 ? 1 : -1) * (P.splay || 0), 'XYZ');
    M.u.copy(M.hips).multiply(M.tmp.makeTranslation(sx, 0, 0)).multiply(M.tmp.makeRotationFromEuler(_e1));
    setPart('thigh', slot * 2 + side, M.u);
    M.f.copy(M.u).multiply(M.tmp.makeTranslation(0, -BODY.thigh, 0)).multiply(M.tmp.makeRotationX(P.knee[side]));
    setPart('shin', slot * 2 + side, M.f);
  }
  return wi;
}

// ---------- horse ----------
const HORSE_COATS = [0x6a3e22, 0x4a2c1a, 0x8a5a32, 0x2a2420, 0x9a948a, 0x7a4a2a];
function buildHorse(team) {
  const coat = col(fpick(HORSE_COATS)), dark = shadeC(coat, 0.45), cloth = team === GB ? col(0xa02a24) : col(0x283a64), leather = col(0x3a2618);
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const body = new THREE.Mesh(mergeParts([
    part(wobble(GEO.cyl(0.36, 0.34, 1.5, 8), 0.03, 4), coat, [0, 1.3, 0], [Math.PI / 2, 0, 0], [1, 1, 1.15]),
    part(GEO.sph(0.4, 8, 6), coat, [0, 1.36, 0.68], null, [0.9, 1.05, 0.9]),
    part(GEO.sph(0.4, 8, 6), coat, [0, 1.34, -0.7], null, [0.95, 1.0, 0.9]),
    part(GEO.box(0.78, 0.06, 0.8), cloth, [0, 1.66, 0.05], [0.04, 0, 0]),
    part(GEO.box(0.5, 0.14, 0.55), leather, [0, 1.73, 0.08]),
    part(GEO.box(0.52, 0.1, 0.12), leather, [0, 1.8, 0.32]),
    part(GEO.box(0.04, 0.4, 0.04), leather, [0.27, 1.45, 0.1]), part(GEO.box(0.04, 0.4, 0.04), leather, [-0.27, 1.45, 0.1]),
  ]), mat);
  body.castShadow = true; g.add(body);
  const neck = new THREE.Group(); neck.position.set(0, 1.5, 0.85); g.add(neck);
  const nm = new THREE.Mesh(mergeParts([
    part(GEO.cyl(0.17, 0.26, 0.8, 7), coat, [0, 0.3, 0.18], [0.7, 0, 0]),
    part(GEO.box(0.06, 0.5, 0.16), dark, [0, 0.45, 0.02], [0.7, 0, 0]),
    part(GEO.box(0.2, 0.22, 0.56), coat, [0, 0.62, 0.55], [0.5, 0, 0]),
    part(GEO.box(0.16, 0.16, 0.22), dark, [0, 0.47, 0.8], [0.5, 0, 0]),
    part(GEO.box(0.05, 0.12, 0.05), coat, [0.07, 0.86, 0.36], [-0.2, 0, 0]), part(GEO.box(0.05, 0.12, 0.05), coat, [-0.07, 0.86, 0.36], [-0.2, 0, 0]),
    part(GEO.box(0.22, 0.03, 0.03), leather, [0, 0.6, 0.7], [0.5, 0, 0]),
  ]), mat);
  nm.castShadow = true; neck.add(nm);
  const legs = [];
  for (const [x, z] of [[0.2, 0.62], [-0.2, 0.62], [0.2, -0.66], [-0.2, -0.66]]) {
    const up = new THREE.Group(); up.position.set(x, 1.12, z); g.add(up);
    const um = new THREE.Mesh(mergeParts([part(GEO.cyl(0.09, 0.07, 0.55, 6), coat, [0, -0.27, 0])]), mat); um.castShadow = true; up.add(um);
    const lo = new THREE.Group(); lo.position.set(0, -0.55, 0); up.add(lo);
    const lm = new THREE.Mesh(mergeParts([part(GEO.cyl(0.055, 0.05, 0.48, 6), coat, [0, -0.24, 0]), part(GEO.cyl(0.07, 0.08, 0.1, 6), dark, [0, -0.5, 0.02])]), mat); lm.castShadow = true; lo.add(lm);
    legs.push({ up, lo });
  }
  const tail = new THREE.Group(); tail.position.set(0, 1.42, -1.02); g.add(tail);
  tail.add(new THREE.Mesh(mergeParts([part(GEO.cone(0.1, 0.8, 5), dark, [0, -0.38, -0.05], [Math.PI + 0.25, 0, 0])]), mat));
  return { group: g, neck, legs, tail };
}

// ---------- field gun ----------
function buildCannon(team) {
  const carC = team === GB ? col(0x5a6a72) : team === US ? col(0x5e4a2e) : col(0x6a5a40), iron = col(0x2a2a2a), bronze = col(0x9a7a3a);
  const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const parts = [
    part(GEO.box(0.1, 0.36, 1.5), carC, [0.25, 0.75, -0.25], [-0.32, 0, 0]),
    part(GEO.box(0.1, 0.36, 1.5), carC, [-0.25, 0.75, -0.25], [-0.32, 0, 0]),
    part(GEO.box(0.3, 0.16, 1.9), carC, [0, 0.42, -1.25], [-0.2, 0, 0]),
    part(GEO.cyl(0.06, 0.06, 1.3, 6), iron, [0, 0.62, 0.05], [0, 0, Math.PI / 2]),
    part(GEO.box(0.5, 0.1, 0.4), carC, [0, 0.6, 0.15]),
  ];
  const wheelP = [];
  for (const sx of [-1, 1]) {
    wheelP.push(part(GEO.cyl(0.62, 0.62, 0.07, 14), shadeC(carC, 0.8), [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], { cv: () => 1 }));
    for (let k = 0; k < 6; k++) wheelP.push(part(GEO.box(0.04, 1.14, 0.05), shadeC(carC, 0.9), [0, 0, 0], [k * Math.PI / 6, 0, 0]));
    wheelP.push(part(GEO.cyl(0.12, 0.12, 0.2, 8), iron, [0, 0, 0], [0, 0, Math.PI / 2]));
  }
  const body = new THREE.Mesh(mergeParts(parts), mat); body.castShadow = true; g.add(body);
  const wheels = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(mergeParts(wheelP.slice(0, wheelP.length / 2)), mat); w.position.set(sx * 0.68, 0.62, 0.05); w.castShadow = true; g.add(w); wheels.push(w);
  }
  const barrel = new THREE.Group(); barrel.position.set(0, 0.98, 0.0); g.add(barrel);
  const prof = [[0.001, -0.62], [0.06, -0.62], [0.08, -0.56], [0.15, -0.52], [0.16, -0.4], [0.145, 0.1], [0.125, 0.6], [0.13, 0.98], [0.15, 1.04], [0.11, 1.12], [0.06, 1.12], [0.06, 1.06]];
  const bm = new THREE.Mesh(mergeParts([part(GEO.lathe(prof, 12), team === US ? bronze : iron, [0, 0, 0], [Math.PI / 2, 0, 0]), part(GEO.cyl(0.04, 0.04, 0.44, 6), team === US ? bronze : iron, [0, 0, 0.05], [0, 0, Math.PI / 2])]), mat);
  bm.castShadow = true; barrel.add(bm);
  return { group: g, barrel, wheels, muzzle: 1.1 };
}

// ---------- gunboat ----------
function shipGeometry(team, wreck) {
  const hull = team === GB ? col(0x4a3a2a) : col(0x3c3428), stripe = team === GB ? col(0xc8a050) : col(0x8a2a22), deck = col(0x9a8264), dark = col(0x2a2018);
  const P = [];
  const L = 16, B = 4.4;
  // hull from stacked tapered boxes
  for (let k = 0; k < 7; k++) {
    const z = -L / 2 + (k + 0.5) * (L / 7), t = (k + 0.5) / 7;
    const w = B * Math.sin(Math.PI * clamp(t * 0.92 + 0.06, 0, 1)) ** 0.6, d = L / 7 + 0.05;
    P.push(part(GEO.box(w, 1.6, d), hull, [0, 0.2, z]));
    P.push(part(GEO.box(w * 0.8, 0.8, d), shadeC(hull, 0.8), [0, -0.8, z]));
    P.push(part(GEO.box(w + 0.04, 0.16, d), stripe, [0, 0.75, z]));
    P.push(part(GEO.box(w * 0.94, 0.08, d), deck, [0, 1.0, z]));
    P.push(part(GEO.box(0.1, 0.5, d), hull, [w / 2 - 0.05, 1.25, z]), part(GEO.box(0.1, 0.5, d), hull, [-w / 2 + 0.05, 1.25, z]));
  }
  P.push(part(GEO.cone(1.8, 3.6, 4), hull, [0, 0.4, L / 2 + 1.4], [Math.PI / 2, Math.PI / 4, 0], [1, 1, 0.6]));
  P.push(part(GEO.box(0.18, 0.18, 4.5), dark, [0, 1.3, L / 2 + 2.6], [-0.25, 0, 0]));       // bowsprit
  P.push(part(GEO.box(B * 0.7, 0.6, 2.2), shadeC(hull, 1.1), [0, 1.4, -L / 2 + 1.4]));        // quarterdeck
  if (!wreck) P.push(part(GEO.box(0.14, 2.4, 0.14), dark, [0, 2.0, -L / 2 - 0.3], [0.2, 0, 0])); // rudder post
  return mergeParts(P);
}
function buildShip(team) {
  const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const hull = new THREE.Mesh(shipGeometry(team), mat); hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
  const dark = col(0x2a2018);
  const mast = new THREE.Mesh(mergeParts([part(GEO.cyl(0.13, 0.18, 13, 7), dark, [0, 7.2, 1.0]), part(GEO.cyl(0.07, 0.07, 6.5, 6), dark, [0, 2.4, -2.0], [Math.PI / 2 - 0.1, 0, 0]), part(GEO.cyl(0.06, 0.06, 5, 6), dark, [0, 9.6, -1.2], [Math.PI / 2 - 0.55, 0, 0])]), mat);
  mast.castShadow = true; g.add(mast);
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xe8e0cc, side: THREE.DoubleSide });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.8, 0.9, 0, 1.8, -5.0, 0, 11.6, 0.9, 0, 1.8, -5.0, 0, 8.4, -3.6, 0, 11.6, 0.9], 3));
  sg.computeVertexNormals();
  const sail = new THREE.Mesh(sg, sailMat); sail.castShadow = true; g.add(sail);
  const jg = new THREE.BufferGeometry();
  jg.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.6, 1.4, 0, 11.4, 1.2, 0, 2.4, 10.4], 3)); jg.computeVertexNormals();
  const jib = new THREE.Mesh(jg, sailMat); g.add(jib);
  const guns = [];
  for (const side of [-1, 1]) for (const z of [-2.5, 2.0]) {
    const b = new THREE.Mesh(mergeParts([part(GEO.cyl(0.11, 0.15, 1.6, 8), col(0x2a2a2a), [0, 0, 0.6], [Math.PI / 2, 0, 0]), part(GEO.box(0.5, 0.3, 0.8), col(0x5a4a34), [0, -0.25, 0])]), mat);
    b.position.set(side * 1.6, 1.35, z); b.rotation.y = side * Math.PI / 2; g.add(b);
    guns.push({ side, z, mesh: b });
  }
  return { group: g, sail, jib, guns };
}

// ---------- flags ----------
const FLAG_TEX = {};
function flagTexture(style) {
  if (FLAG_TEX[style]) return FLAG_TEX[style];
  const W = 240, H = 160, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const union = (x, y, w, h) => {
    g.fillStyle = '#1f2f6e'; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = '#f2efe6'; g.lineWidth = h * 0.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke();
    g.fillStyle = '#f2efe6'; g.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h); g.fillRect(x, y + h * 0.33, w, h * 0.34);
    g.fillStyle = '#c4202a'; g.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h); g.fillRect(x, y + h * 0.4, w, h * 0.2);
    g.restore();
  };
  if (style === 'union') union(0, 0, W, H);
  else if (style === 'stars' || style === 'grandunion') {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f2efe6' : '#b8262c'; g.fillRect(0, (i * H) / 13, W, H / 13 + 1); }
    if (style === 'grandunion') union(0, 0, W * 0.42, H * 7 / 13);
    else {
      const cw = W * 0.42, ch = H * 7 / 13; g.fillStyle = '#1f2f6e'; g.fillRect(0, 0, cw, ch);
      g.fillStyle = '#f2efe6';
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * TAU, sx = cw / 2 + Math.cos(a) * ch * 0.32, sy = ch / 2 + Math.sin(a) * ch * 0.32;
        g.beginPath(); for (let k = 0; k < 10; k++) { const rr2 = k % 2 ? 2.4 : 6, aa = (k / 10) * TAU - Math.PI / 2; g.lineTo(sx + Math.cos(aa) * rr2, sy + Math.sin(aa) * rr2); } g.fill();
      }
    }
  } else if (style === 'pine') {
    g.fillStyle = '#f0ede2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#3a6a32';
    for (let k = 0; k < 5; k++) { const y = 26 + k * 18, w = 18 + k * 12; g.beginPath(); g.moveTo(W / 2, y - 14); g.lineTo(W / 2 + w / 2, y + 16); g.lineTo(W / 2 - w / 2, y + 16); g.fill(); }
    g.fillStyle = '#5a3a20'; g.fillRect(W / 2 - 5, 110, 10, 18);
    g.fillStyle = '#2a2a2a'; g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.fillText('AN APPEAL TO HEAVEN', W / 2, 150);
  } else {
    g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 40, 0); g.lineTo(i * 40 + 20, H); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv);
  FLAG_TEX[style] = t;
  return t;
}
function makeFlagCloth(w = 2.2, h = 1.45) {
  const geo = new THREE.PlaneGeometry(w, h, 12, 6);
  geo.translate(w / 2, -h / 2, 0);
  const mat = new THREE.MeshLambertMaterial({ map: flagTexture('neutral'), side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.userData.base = Float32Array.from(geo.attributes.position.array);
  m.userData.w = w;
  return m;
}
function waveFlag(m, t, wind = 1) {
  const P = m.geometry.attributes.position, B = m.userData.base, w = m.userData.w;
  for (let i = 0; i < P.count; i++) {
    const x = B[i * 3], y = B[i * 3 + 1], k = x / w;
    P.array[i * 3 + 2] = Math.sin(x * 2.6 - t * 5.2 + y * 0.8) * 0.16 * k * wind + Math.sin(x * 5.1 - t * 8.3) * 0.04 * k;
    P.array[i * 3 + 1] = y - k * k * 0.12 * (1.2 - wind * 0.5);
  }
  P.needsUpdate = true;
  m.geometry.computeVertexNormals();
}
