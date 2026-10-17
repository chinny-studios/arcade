// The Time Apprentice — low-poly people: a jointed body built from a "look", and procedural poses
//
// A look is plain data, so a scenario's cast can be dressed in a line or two:
// { skin, hair, hairStyle: 'short'|'long'|'bald'|'balding'|'curly'|'bun'|'flat'|'wig', beard: 'full'|'moustache'|'goatee'|'stubble',
//   top, topStyle: 'bare'|'shirt'|'robe'|'jacket'|'vest'|'tunic'|'suit'|'spacesuit', bottom, bottomStyle: 'kilt'|'trousers'|'robe'|'dress',
//   shoes, hat: 'cap'|'derby'|'flatcap'|'coif'|'beret'|'headcloth'|'headset'|'goggles'|'helmet', hatCol, collar (broad Egyptian collar colour),
//   tie, vest, apron, glasses, h (height m), w (girth), kid }

const SKIN = { light: 0xf1c9a5, fair: 0xe8b996, tan: 0xc99668, olive: 0xb88a5c, brown: 0x9a6a44, dark: 0x6b4529 };

function makePerson(look = {}, opts = {}) {
  const L = Object.assign({ skin: SKIN.tan, hair: 0x2a1d14, hairStyle: 'short', top: 0xe8e2d0, topStyle: 'shirt', bottom: 0x5a4a3a, bottomStyle: 'trousers', shoes: 0x3a2a1c, h: 1.75, w: 1 }, look);
  const mat = R.mat.person;
  const g = new THREE.Group();
  const sc = L.h / 1.75, kid = !!L.kid, W = L.w;
  const parts = {};
  const mk = (build, parent, x, y, z) => {
    const gb = new GB(); build(gb);
    const grp = new THREE.Group(); grp.position.set(x, y, z);
    if (!gb.empty) { const m = gb.mesh(mat); grp.add(m); }
    parent.add(grp); return grp;
  };
  const robe = L.bottomStyle === 'robe' || L.bottomStyle === 'dress' || L.topStyle === 'robe';
  const suit = L.topStyle === 'spacesuit';
  const topC = L.top, botC = L.bottom, legC = L.bottomStyle === 'kilt' ? L.skin : botC;
  const hipY = 0.92;
  const body = new THREE.Group(); body.scale.setScalar(sc); g.add(body);
  // hips (static clothing that doesn't swing with the legs)
  parts.hips = mk((b) => {
    b.cbox(0, 0.02, 0, 0.3 * W, 0.16, 0.18 * W, botC);
    if (L.bottomStyle === 'kilt') b.frustum(0, -0.4, 0, 0.36 * W, 0.46, 0.25 * W, 0.86, botC);
    if (robe) b.frustum(0, -0.86, 0, 0.5 * W, 0.92, 0.38 * W, 0.62, L.bottomStyle === 'robe' || L.bottomStyle === 'dress' ? botC : topC);
    if (L.apron) b.cbox(0, -0.3, 0.115 * W, 0.3 * W, 0.62, 0.02, L.apron);
    if (suit) b.cbox(0, 0, 0, 0.36 * W, 0.2, 0.24 * W, topC);
  }, body, 0, hipY, 0);
  // legs: thigh group → knee group (shin + shoe)
  for (const s of [1, -1]) {
    const leg = mk((b) => { b.cbox(0, -0.22, 0, 0.13 * W, 0.46, 0.15 * W, suit ? topC : legC); }, body, s * 0.085 * W, hipY, 0);
    const knee = mk((b) => {
      b.cbox(0, -0.21, 0, 0.115 * W, 0.42, 0.13 * W, suit ? topC : (L.bottomStyle === 'trousers' ? botC : L.skin));
      b.cbox(0, -0.44, 0.04, 0.13 * W, 0.07, 0.24, suit ? 0xd8d8d0 : L.shoes);
    }, leg, 0, -0.44, 0);
    parts[s > 0 ? 'legL' : 'legR'] = leg; parts[s > 0 ? 'kneeL' : 'kneeR'] = knee;
  }
  // torso
  const bare = L.topStyle === 'bare';
  parts.torso = mk((b) => {
    const tc = bare ? L.skin : topC;
    b.frustum(0, 0.0, 0, 0.36 * W, 0.46, 0.2 * W, 1.12, tc);
    if (L.topStyle === 'jacket' || L.topStyle === 'suit') { b.cbox(0, 0.26, 0.105 * W, 0.12, 0.36, 0.02, L.shirt || 0xf2efe6); }
    if (L.vest) b.frustum(0, 0.02, 0, 0.375 * W, 0.42, 0.215 * W, 1.1, L.vest);
    if (L.tie) b.cbox(0, 0.26, 0.12 * W, 0.04, 0.34, 0.02, L.tie);
    if (L.collar) b.frustum(0, 0.36, 0, 0.44 * W, 0.12, 0.26 * W, 0.7, L.collar);
    if (L.apron) b.cbox(0, 0.14, 0.11 * W, 0.28 * W, 0.36, 0.02, L.apron);
    if (L.topStyle === 'robe' && L.fur) b.frustum(0, 0.36, 0, 0.46 * W, 0.12, 0.28 * W, 0.75, L.fur);
    if (suit) { b.cbox(0, 0.24, -0.17 * W, 0.34 * W, 0.44, 0.16, 0xe6e6e0); b.cbox(0, 0.18, 0.12 * W, 0.16, 0.12, 0.05, 0x9aa0a8); }
    b.cyl(0, 0.44, 0, 0.055, 0.08, suit ? topC : L.skin, { seg: 6 });
  }, parts.hips, 0, 0.08, 0);
  // head
  const hs = kid ? 1.18 : 1;
  parts.head = mk((b) => {
    const hy = 0.13 * hs;
    if (suit) {
      b.ball(0, hy, 0, 0.19, 0xeeeeea, { det: 1 });
      b.ball(0, hy, 0.06, 0.15, 0xc89a3a, { det: 1, sz: 0.9 }); // gold visor
      return;
    }
    b.ball(0, hy, 0, 0.115 * hs, L.skin, { sy: 1.15, sz: 1.02, det: 1 });
    // face
    b.cbox(0.042 * hs, hy + 0.02, 0.105 * hs, 0.024, 0.026, 0.01, 0x1c140e);
    b.cbox(-0.042 * hs, hy + 0.02, 0.105 * hs, 0.024, 0.026, 0.01, 0x1c140e);
    b.cbox(0, hy - 0.01, 0.115 * hs, 0.026, 0.045, 0.03, L.skin);
    b.cbox(0.045 * hs, hy + 0.055, 0.103 * hs, 0.04, 0.012, 0.01, L.brow || L.hair);
    b.cbox(-0.045 * hs, hy + 0.055, 0.103 * hs, 0.04, 0.012, 0.01, L.brow || L.hair);
    b.cbox(0, hy - 0.06, 0.104 * hs, 0.04, 0.01, 0.01, 0x8a4a3a);
    b.ball(0.112 * hs, hy, 0, 0.022, L.skin, { det: 0 }); b.ball(-0.112 * hs, hy, 0, 0.022, L.skin, { det: 0 });
    if (L.glasses) { const gc = L.glasses === true ? 0x1a1a1a : L.glasses; b.cbox(0.042 * hs, hy + 0.02, 0.118 * hs, 0.05, 0.04, 0.008, gc); b.cbox(-0.042 * hs, hy + 0.02, 0.118 * hs, 0.05, 0.04, 0.008, gc); b.cbox(0, hy + 0.03, 0.118 * hs, 0.04, 0.008, 0.008, gc); }
    // hair
    const hc = L.hair, st = L.hairStyle;
    if (st === 'short' || st === 'curly' || st === 'flat' || st === 'bun' || st === 'long') b.ball(0, hy + 0.035, -0.012, 0.122 * hs, hc, { sy: 0.95, det: 1, sz: 1.04 });
    if (st === 'balding') { b.ball(0.07, hy + 0.0, -0.04, 0.07, hc, { det: 0 }); b.ball(-0.07, hy + 0.0, -0.04, 0.07, hc, { det: 0 }); b.ball(0, hy + 0.0, -0.08, 0.08, hc, { det: 0 }); }
    if (st === 'flat') b.cbox(0, hy + 0.13, -0.005, 0.2, 0.05, 0.22, hc);
    if (st === 'curly') for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; b.ball(Math.cos(a) * 0.1, hy + 0.09, Math.sin(a) * 0.1 - 0.01, 0.05, hc, { det: 0 }); }
    if (st === 'bun') b.ball(0, hy + 0.12, -0.1, 0.055, hc, { det: 0 });
    if (st === 'long') b.cbox(0, hy - 0.08, -0.07, 0.24, 0.28, 0.1, hc);
    if (st === 'wig') { b.ball(0, hy + 0.03, -0.015, 0.13, hc, { sy: 0.98, det: 1, sz: 1.05 }); b.cbox(0, hy - 0.06, -0.035, 0.27, 0.2, 0.2, hc); }
    // beards
    if (L.beard === 'full') { b.ball(0, hy - 0.08, 0.06, 0.08, L.beardCol || hc, { sy: 1.1, det: 0 }); b.cbox(0, hy - 0.03, 0.1, 0.16, 0.08, 0.06, L.beardCol || hc); }
    if (L.beard === 'goatee') b.ball(0, hy - 0.095, 0.085, 0.035, L.beardCol || hc, { det: 0 });
    if (L.beard === 'moustache' || L.beard === 'goatee') b.cbox(0, hy - 0.04, 0.115 * hs, 0.08, 0.02, 0.02, L.beardCol || hc);
    if (L.beard === 'stubble') b.ball(0, hy - 0.06, 0.03, 0.098, mixHex(L.skin, hc, 0.35), { det: 1, sy: 0.7 });
    // hats
    const hat = L.hat, hk = L.hatCol || 0x3a3a3a;
    if (hat === 'cap' || hat === 'flatcap') { b.ball(0, hy + 0.07, -0.005, 0.128 * hs, hk, { sy: 0.55, det: 1 }); b.cbox(0, hy + 0.06, 0.11, 0.17, 0.02, 0.09, hk, { rx: -0.15 }); }
    if (hat === 'derby') { b.cyl(0, hy + 0.06, 0, 0.17, 0.02, hk, { seg: 14 }); b.ball(0, hy + 0.1, 0, 0.12, hk, { sy: 0.85, det: 1 }); }
    if (hat === 'beret') b.ball(0, hy + 0.1, 0, 0.15, hk, { sy: 0.4, det: 1 });
    if (hat === 'coif') { b.ball(0, hy + 0.03, -0.01, 0.13, hk, { det: 1 }); }
    if (hat === 'fur') { b.cyl(0, hy + 0.07, 0, 0.14, 0.13, hk, { seg: 12, rt: 1.08 }); b.cyl(0, hy + 0.17, 0, 0.12, 0.05, L.hatTop || 0x6a1a1a, { seg: 12, rt: 0.8 }); }
    if (hat === 'headcloth') { b.ball(0, hy + 0.035, -0.015, 0.128, hk, { sy: 0.98, det: 1 }); b.frustum(0, hy - 0.18, -0.04, 0.27, 0.2, 0.16, 1.2, hk); }
    if (hat === 'headset') { b.cbox(0, hy + 0.11, 0, 0.25, 0.025, 0.03, 0x222222); b.cbox(0.125, hy, 0, 0.02, 0.06, 0.06, 0x222222); b.rod([0.12, hy - 0.02, 0.03], [0.04, hy - 0.06, 0.12], 0.008, 0x222222, 4); }
    if (hat === 'goggles') { b.cbox(0, hy + 0.09, 0.08, 0.22, 0.03, 0.04, 0x5a3a20); b.ccyl(0.05, hy + 0.1, 0.11, 0.035, 0.04, 0xc8a050, { rx: Math.PI / 2, seg: 8 }); b.ccyl(-0.05, hy + 0.1, 0.11, 0.035, 0.04, 0xc8a050, { rx: Math.PI / 2, seg: 8 }); }
  }, parts.torso, 0, 0.5, 0);
  // arms: shoulder group → elbow group (forearm + hand)
  for (const s of [1, -1]) {
    const sleeve = bare ? L.skin : (L.sleeves === false ? L.skin : topC);
    const arm = mk((b) => { b.cbox(0, -0.15, 0, 0.1 * W, 0.32, 0.1 * W, suit ? topC : sleeve); }, parts.torso, s * 0.23 * W, 0.42, 0);
    const elbow = mk((b) => {
      b.cbox(0, -0.13, 0, 0.09 * W, 0.28, 0.09 * W, suit ? topC : (L.shortSleeves || bare ? L.skin : sleeve));
      b.ball(0, -0.3, 0, 0.055, suit ? 0xeeeeea : L.skin, { det: 0 });
    }, arm, 0, -0.3, 0);
    parts[s > 0 ? 'armL' : 'armR'] = arm; parts[s > 0 ? 'elbowL' : 'elbowR'] = elbow;
  }
  // something held in the right hand
  parts.handR = new THREE.Group(); parts.handR.position.set(0, -0.3, 0); parts.elbowR.add(parts.handR);
  parts.handL = new THREE.Group(); parts.handL.position.set(0, -0.3, 0); parts.elbowL.add(parts.handL);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { g, body, parts, look: L, h: L.h };
}

// Poses. Model faces +z; a negative x rotation swings a limb forward; for the left arm (on +x) +z rotation lifts it sideways.
const POSES = {
  idle(p, t) { const b = Math.sin(t * 1.6) * 0.02; p.armL.rotation.set(0.04, 0, 0.06 + b); p.armR.rotation.set(0.04, 0, -0.06 - b); p.elbowL.rotation.x = -0.15; p.elbowR.rotation.x = -0.15; p.torso.rotation.x = b * 0.3; },
  walk(p, t, k = 1) {
    const s = Math.sin(t * 7.5) * 0.55 * k, c = Math.cos(t * 7.5);
    p.legL.rotation.x = s; p.legR.rotation.x = -s;
    p.kneeL.rotation.x = Math.max(0, -c) * 0.8 * k; p.kneeR.rotation.x = Math.max(0, c) * 0.8 * k;
    p.armL.rotation.set(-s * 0.8, 0, 0.06); p.armR.rotation.set(s * 0.8, 0, -0.06);
    p.elbowL.rotation.x = -0.3; p.elbowR.rotation.x = -0.3;
    p.hips.position.y = 0.92 + Math.abs(c) * 0.03 * k;
  },
  talk(p, t) {
    POSES.idle(p, t);
    const a = Math.sin(t * 3.1), b2 = Math.sin(t * 2.3 + 1);
    p.armR.rotation.set(-0.5 - a * 0.25, 0, -0.15); p.elbowR.rotation.x = -0.9 - b2 * 0.3;
    p.armL.rotation.set(-0.2 - b2 * 0.15, 0, 0.12); p.elbowL.rotation.x = -0.5;
    p.head.rotation.x = Math.sin(t * 4.2) * 0.06; p.head.rotation.y = Math.sin(t * 1.3) * 0.1;
  },
  wave(p, t) { POSES.idle(p, t); p.armR.rotation.set(0, 0, -2.6); p.elbowR.rotation.x = -0.3 + Math.sin(t * 8) * 0.35; },
  point(p, t) { POSES.idle(p, t); p.armR.rotation.set(-1.45, 0, -0.1); p.elbowR.rotation.x = -0.05; },
  cheer(p, t) { const j = Math.abs(Math.sin(t * 5)); p.armL.rotation.set(0, 0, 2.7 - j * 0.3); p.armR.rotation.set(0, 0, -2.7 + j * 0.3); p.elbowL.rotation.x = -0.2; p.elbowR.rotation.x = -0.2; p.hips.position.y = 0.92 + j * 0.06; p.legL.rotation.x = p.legR.rotation.x = 0; },
  clap(p, t) { const c = Math.sin(t * 14); p.armL.rotation.set(-1.0, -0.4 - c * 0.2, 0.3); p.armR.rotation.set(-1.0, 0.4 + c * 0.2, -0.3); p.elbowL.rotation.x = -0.9; p.elbowR.rotation.x = -0.9; },
  pull(p, t) {
    // leaning back on a rope held in front, shuffling
    const s = Math.sin(t * 3.2) * 0.3;
    p.torso.rotation.x = -0.35; p.armL.rotation.set(-1.2, 0, 0.05); p.armR.rotation.set(-1.25, 0, -0.05); p.elbowL.rotation.x = -0.2; p.elbowR.rotation.x = -0.2;
    p.legL.rotation.x = -0.4 + s; p.legR.rotation.x = 0.25 - s; p.kneeL.rotation.x = 0.3; p.kneeR.rotation.x = 0.2;
  },
  haul(p, t) {
    // walking bent forward with a rope over the shoulder
    POSES.walk(p, t * 0.6, 0.7);
    p.torso.rotation.x = 0.45; p.head.rotation.x = -0.35;
    p.armL.rotation.set(-0.55, 0, 0.12); p.armR.rotation.set(-0.7, 0, -0.12); p.elbowL.rotation.x = -2.0; p.elbowR.rotation.x = -1.9;
  },
  carry(p, t, k = 0) { if (k) POSES.walk(p, t, k); else POSES.idle(p, t); p.armL.rotation.set(-1.1, 0, 0.25); p.armR.rotation.set(-1.1, 0, -0.25); p.elbowL.rotation.x = -0.8; p.elbowR.rotation.x = -0.8; },
  carryhead(p, t, k = 0) { if (k) POSES.walk(p, t, k); else POSES.idle(p, t); p.armL.rotation.set(0, 0, 2.6); p.elbowL.rotation.x = -1.2; },
  work(p, t) {
    // hammering / chiselling with the right hand
    const a = Math.sin(t * 6); p.torso.rotation.x = 0.35; p.armR.rotation.set(-1.0 - a * 0.6, 0, -0.1); p.elbowR.rotation.x = -0.6 - a * 0.4;
    p.armL.rotation.set(-0.9, 0, 0.15); p.elbowL.rotation.x = -0.6; p.legL.rotation.x = -0.15; p.legR.rotation.x = 0.15;
  },
  kneel(p, t) { POSES.work(p, t); p.hips.position.y = 0.5; p.legL.rotation.x = -1.4; p.kneeL.rotation.x = 1.5; p.legR.rotation.x = 0.1; p.kneeR.rotation.x = 1.55; },
  sit(p, t) {
    p.hips.position.y = 0.5; p.legL.rotation.x = p.legR.rotation.x = -1.5; p.kneeL.rotation.x = p.kneeR.rotation.x = 1.5;
    p.armL.rotation.set(-0.6, 0, 0.1); p.armR.rotation.set(-0.6, 0, -0.1); p.elbowL.rotation.x = -0.7; p.elbowR.rotation.x = -0.7;
    p.head.rotation.x = Math.sin(t * 0.7) * 0.05;
  },
  type(p, t) { POSES.sit(p, t); p.torso.rotation.x = 0.12; p.armL.rotation.set(-0.85, 0, 0.12); p.armR.rotation.set(-0.85 + Math.sin(t * 11) * 0.05, 0, -0.12); p.elbowL.rotation.x = -0.75 + Math.sin(t * 9) * 0.06; p.elbowR.rotation.x = -0.75; },
  write(p, t) { POSES.sit(p, t); p.torso.rotation.x = 0.3; p.head.rotation.x = 0.35; p.armR.rotation.set(-0.95, 0, -0.08); p.elbowR.rotation.x = -0.9 + Math.sin(t * 5) * 0.08; p.armL.rotation.set(-0.8, 0, 0.2); p.elbowL.rotation.x = -0.9; },
  stand(p, t) { POSES.idle(p, t); p.armL.rotation.set(0.1, 0, 0.12); p.armR.rotation.set(0.1, 0, -0.12); },
  hands(p, t) { POSES.idle(p, t); p.armL.rotation.set(-0.3, 0, 0.35); p.armR.rotation.set(-0.3, 0, -0.35); p.elbowL.rotation.x = -1.6; p.elbowR.rotation.x = -1.6; },
  pour(p, t) { POSES.idle(p, t); p.torso.rotation.x = 0.25; p.armL.rotation.set(-1.2, 0, 0.2); p.armR.rotation.set(-1.0, 0, -0.2); p.elbowL.rotation.x = -0.5; p.elbowR.rotation.x = -0.9; },
  lie(p, t) { p.body.rotation.x = Math.PI / 2; p.armL.rotation.set(-2.6, 0, 0.3); p.armR.rotation.set(-2.6, 0, -0.3); p.elbowL.rotation.x = 0; p.elbowR.rotation.x = 0; p.head.rotation.x = -0.9; },
  sleep(p, t) { POSES.sit(p, t); p.head.rotation.x = 0.5 + Math.sin(t * 0.8) * 0.03; p.torso.rotation.x = 0.2; },
  push(p, t) { POSES.walk(p, t, 0.6); p.torso.rotation.x = 0.3; p.armL.rotation.set(-1.5, 0, 0.1); p.armR.rotation.set(-1.5, 0, -0.1); p.elbowL.rotation.x = -0.3; p.elbowR.rotation.x = -0.3; },
};
function resetPose(P) {
  const p = P.parts;
  for (const k of ['legL', 'legR', 'kneeL', 'kneeR', 'armL', 'armR', 'elbowL', 'elbowR', 'torso', 'head']) p[k].rotation.set(0, 0, 0);
  p.hips.position.y = 0.92; P.body.rotation.set(0, 0, 0);
  p.body = P.body;
}
function posePerson(P, name, t, k) {
  resetPose(P);
  (POSES[name] || POSES.idle)(P.parts, t, k);
}
