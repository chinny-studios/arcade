// Creature Feature — models built from boxes and cylinders: the townsfolk (jointed so they can walk, run, flail,
// cower and come apart), the four monsters and the bat, and 1950s cars with fins and whitewalls.
// Everything faces -z. Limbs are merged per joint into one vertex-coloured mesh each.

const GEO_CACHE = new Map();
function cachedGeo(key, f) { let g = GEO_CACHE.get(key); if (!g) GEO_CACHE.set(key, (g = f())); return g; }
const meshOf = (g, m = MATS.vc) => new THREE.Mesh(g, m);
function group(x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); return g; }

// ---------- people ----------
function folkLook(type, rnd) {
  const F = FOLK[type];
  const v = (c) => (Array.isArray(c) ? rnd.pick(c) : c);
  const look = { type, f: !!F.f, skin: rnd.pick(SKIN), hair: F.hairC || v(F.hair || HAIR), top: v(F.top), jacket: F.jacket ? v(F.jacket) : 0, legs: 0, shoes: F.shoes, hat: F.hat || 0 };
  look.legs = F.legs === 'jacket' ? look.jacket : v(F.legs);
  if (F.f) look.legs = look.skin;
  look.skirt = F.skirt === 'top' ? look.top : F.skirt ? v(F.skirt) : 0;
  look.key = [type, look.skin, look.hair, look.top, look.jacket, look.legs, look.skirt].join('|');
  return look;
}
function buildHuman(look) {
  const F = FOLK[look.type];
  const root = group(), hips = group(0, 0.92, 0), torso = group(), head = group(0, 0.56, 0);
  root.rotation.order = 'YXZ';
  const armL = group(-0.25, 0.5, 0), armR = group(0.25, 0.5, 0), legL = group(-0.1, 0.92, 0), legR = group(0.1, 0.92, 0);
  root.add(hips, legL, legR); hips.add(torso); torso.add(head, armL, armR);
  const k = look.key;
  const gTorso = cachedGeo('t' + k, () => {
    const m = new Mesher();
    m.box(0, 0.28, 0, 0.4, 0.56, 0.22, look.top);
    if (look.jacket) {
      m.box(-0.13, 0.29, 0, 0.16, 0.58, 0.25, look.jacket); m.box(0.13, 0.29, 0, 0.16, 0.58, 0.25, look.jacket); m.box(0, 0.29, 0.06, 0.42, 0.58, 0.14, look.jacket);
      if (F.coat) m.box(0, -0.22, 0.01, 0.44, 0.5, 0.25, look.jacket);
    }
    if (F.tie) m.box(0, 0.32, -0.115, 0.06, 0.34, 0.02, F.tie);
    if (F.badge) m.box(-0.12, 0.42, -0.118, 0.07, 0.07, 0.02, 0xe8c040);
    if (F.apron) m.box(0, 0.05, -0.12, 0.3, 0.55, 0.03, F.apron);
    if (look.skirt) m.geo(P_TAPER(0.58, 10), look.skirt, 0, -0.24, 0, 0, 0, 0, 0.72, 0.5, 0.62);
    else m.box(0, -0.02, 0, 0.38, 0.1, 0.22, 0x2a2420);
    m.box(0, 0.6, 0, 0.12, 0.08, 0.12, look.skin);
    return m.build();
  });
  const gHead = cachedGeo('h' + k, () => {
    const m = new Mesher();
    m.box(0, 0.15, 0, 0.22, 0.26, 0.24, look.skin);
    m.box(-0.055, 0.17, -0.121, 0.04, 0.03, 0.01, 0x1a1a1a); m.box(0.055, 0.17, -0.121, 0.04, 0.03, 0.01, 0x1a1a1a);
    m.box(0, 0.06, -0.121, 0.07, 0.025, 0.01, 0x8a3a3a);
    m.box(0, 0.24, 0.02, 0.24, 0.1, 0.25, look.hair); m.box(0, 0.16, 0.11, 0.24, 0.2, 0.05, look.hair);
    if (F.quiff) m.box(0, 0.3, -0.08, 0.18, 0.08, 0.12, look.hair);
    if (F.ponytail || (look.f && !F.ponytail)) m.box(0, 0.1, 0.15, 0.1, 0.24, 0.08, look.hair);
    if (F.glasses) { m.box(0, 0.17, -0.125, 0.2, 0.05, 0.01, 0x101010); }
    if (F.cap) { m.box(0, 0.31, 0.01, 0.25, 0.08, 0.26, look.hat); m.box(0, 0.28, -0.16, 0.22, 0.03, 0.12, look.hat); }
    if (F.fedora) { m.geo(P_CYL(10), look.hat, 0, 0.29, 0, 0, 0, 0, 0.42, 0.03, 0.42); m.geo(P_TAPER(0.85, 8), look.hat, 0, 0.36, 0, 0, 0, 0, 0.26, 0.13, 0.26); }
    if (F.stetson) { m.geo(P_CYL(10), look.hat, 0, 0.29, 0, 0, 0, 0, 0.55, 0.03, 0.55); m.geo(P_TAPER(0.8, 8), look.hat, 0, 0.37, 0, 0, 0, 0, 0.26, 0.16, 0.26); }
    if (F.beret) m.geo(P_SPH(8, 4), look.hat, 0.03, 0.3, 0, 0, 0, 0.2, 0.3, 0.1, 0.3);
    return m.build();
  });
  const sleeve = look.jacket && !FOLK[look.type].sleeves ? look.jacket : FOLK[look.type].sleeves || look.top;
  const gArm = cachedGeo('a' + k, () => {
    const m = new Mesher();
    m.box(0, -0.25, 0, 0.11, 0.5, 0.12, sleeve);
    m.box(0, -0.56, 0, 0.09, 0.13, 0.1, look.skin);
    return m.build();
  });
  const gLeg = cachedGeo('l' + k, () => {
    const m = new Mesher();
    m.box(0, -0.42, 0, 0.15, 0.84, 0.16, look.skirt ? look.skin : look.legs);
    m.box(0, -0.87, -0.04, 0.15, 0.09, 0.26, look.shoes);
    return m.build();
  });
  const parts = {
    torso: meshOf(gTorso), head: meshOf(gHead), armL: meshOf(gArm), armR: meshOf(gArm), legL: meshOf(gLeg), legR: meshOf(gLeg),
  };
  torso.add(parts.torso); head.add(parts.head); armL.add(parts.armL); armR.add(parts.armR); legL.add(parts.legL); legR.add(parts.legR);
  return { root, hips, torso, head, armL, armR, legL, legR, parts, look };
}
// pose a person. a: { phase, speed (m/s), mode: 'walk' | 'run' | 'panic' | 'idle' | 'cower' | 'trance' | 'sit' | 'talk' | 'drag' }
function poseHuman(M, mode, phase, speed, t) {
  const s = Math.sin(phase), c = Math.cos(phase);
  let hy = 0.92, lean = 0, aL = 0, aR = 0, azL = 0.06, azR = -0.06, lL = 0, lR = 0, hx = 0, hry = 0, ty = 0;
  if (mode === 'walk') { const a = clamp(speed / 1.6, 0, 1) * 0.5; lL = s * a; lR = -s * a; aL = -s * a * 0.8; aR = s * a * 0.8; hy = 0.92 + Math.abs(c) * 0.02; }
  else if (mode === 'run') { const a = 0.85; lL = s * a; lR = -s * a; aL = -s * 1.1; aR = s * 1.1; lean = 0.25; hy = 0.9 + Math.abs(c) * 0.06; azL = 0.15; azR = -0.15; }
  else if (mode === 'panic') { const a = 0.8; lL = s * a; lR = -s * a; aL = -2.7 + Math.sin(t * 13) * 0.35; aR = -2.7 + Math.cos(t * 12) * 0.35; azL = 0.4; azR = -0.4; lean = 0.12; hy = 0.9 + Math.abs(c) * 0.06; hx = -0.25; }
  else if (mode === 'cower') { hy = 0.55; lL = -1.3; lR = -1.1; lean = 0.6; aL = -2.4; aR = -2.4; azL = 0.9; azR = -0.9; hx = 0.4; }
  else if (mode === 'trance') { const a = clamp(speed / 1.6, 0, 1) * 0.35; lL = s * a; lR = -s * a; aL = -1.45; aR = -1.45; hx = 0.25; hry = Math.sin(t * 1.3) * 0.1; }
  else if (mode === 'sit') { hy = 0.5; lL = -1.45; lR = -1.4; aL = -0.3; aR = -0.25; }
  else if (mode === 'talk') { aR = -0.4 + Math.sin(t * 3) * 0.3; azR = -0.3; hry = Math.sin(t * 0.9) * 0.3; }
  else if (mode === 'drag') { lL = 0.3; lR = 0.25; aL = -2.9; aR = -2.9; hx = -0.3; }
  else if (mode === 'held') { lL = Math.sin(t * 14) * 0.6; lR = -Math.sin(t * 14) * 0.6; aL = -1 + Math.sin(t * 11) * 0.8; aR = -1 + Math.cos(t * 12) * 0.8; azL = 0.5; azR = -0.5; }
  else { aL = Math.sin(t * 1.1) * 0.04; aR = -aL; hry = Math.sin(t * 0.4) * 0.25; }
  M.hips.position.y = hy; M.legL.position.y = M.legR.position.y = hy;
  M.torso.rotation.x = -lean; M.legL.rotation.x = lL; M.legR.rotation.x = lR;
  M.armL.rotation.x = aL; M.armR.rotation.x = aR; M.armL.rotation.z = azL; M.armR.rotation.z = azR;
  M.head.rotation.x = hx; M.head.rotation.y = hry; M.torso.position.y = ty;
}

// ---------- monsters ----------
// shared rig: { root, hips, torso, head, armL, armR, legL, legR } plus extras; poseMonster() animates them
function buildMonster(id) {
  const B = { vampire: buildVampire, werewolf: buildWerewolf, frank: buildFrank, mummy: buildMummy }[id];
  const M = B();
  M.id = id;
  M.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return M;
}
function rig(hipY, shoulderX, shoulderY, neckY, hipX) {
  const root = group(), hips = group(0, hipY, 0), torso = group(), head = group(0, neckY, 0);
  root.rotation.order = 'YXZ';
  const armL = group(-shoulderX, shoulderY, 0), armR = group(shoulderX, shoulderY, 0), legL = group(-hipX, hipY, 0), legR = group(hipX, hipY, 0);
  root.add(hips, legL, legR); hips.add(torso); torso.add(head, armL, armR);
  return { root, hips, torso, head, armL, armR, legL, legR, hipY };
}
function glowBits(list) { const m = new Mesher(); for (const b of list) m.box(...b); return new THREE.Mesh(m.build(), MATS.glow); }

function buildVampire() {
  const M = rig(1.0, 0.27, 0.6, 0.66, 0.11);
  const suit = 0x141418, skin = 0xd8dcc8;
  const t = new Mesher();
  t.box(0, 0.33, 0, 0.44, 0.66, 0.24, suit); t.box(0, 0.38, -0.115, 0.14, 0.5, 0.02, 0xf0f0ea);
  t.box(0, 0.6, -0.12, 0.12, 0.05, 0.02, 0x101010); t.box(0, 0.5, -0.125, 0.07, 0.07, 0.02, 0xc02020);
  t.box(0, -0.02, 0, 0.42, 0.12, 0.24, suit); t.box(0, 0.7, 0, 0.13, 0.1, 0.13, skin);
  M.torso.add(meshOf(t.build()));
  const h = new Mesher();
  h.box(0, 0.16, 0, 0.22, 0.29, 0.24, skin); h.box(0, 0.06, -0.03, 0.2, 0.08, 0.2, 0xc8ccb8);
  h.box(0, 0.27, 0.02, 0.24, 0.07, 0.26, 0x0a0a0a); h.box(0, 0.25, -0.11, 0.06, 0.07, 0.04, 0x0a0a0a); h.box(0, 0.18, 0.12, 0.24, 0.2, 0.04, 0x0a0a0a);
  h.box(-0.11, 0.16, 0.0, 0.03, 0.08, 0.1, skin); h.box(0.11, 0.16, 0.0, 0.03, 0.08, 0.1, skin);
  h.box(0, 0.08, -0.122, 0.09, 0.015, 0.01, 0x5a1010); h.box(-0.03, 0.06, -0.122, 0.015, 0.03, 0.01, 0xffffff); h.box(0.03, 0.06, -0.122, 0.015, 0.03, 0.01, 0xffffff);
  M.head.add(meshOf(h.build()));
  M.head.add(glowBits([[-0.055, 0.17, -0.122, 0.045, 0.025, 0.01, 0xff2020], [0.055, 0.17, -0.122, 0.045, 0.025, 0.01, 0xff2020]]));
  // the high collar of the cape
  const col = new Mesher(); col.box(-0.17, 0.2, 0.08, 0.04, 0.42, 0.22, 0x101012, 0.5); col.box(0.17, 0.2, 0.08, 0.04, 0.42, 0.22, 0x101012, -0.5); col.box(-0.16, 0.2, 0.07, 0.03, 0.38, 0.2, 0x9a1018, 0.5); col.box(0.16, 0.2, 0.07, 0.03, 0.38, 0.2, 0x9a1018, -0.5);
  const collar = meshOf(col.build()); collar.position.y = 0.52; M.torso.add(collar);
  const arm = new Mesher(); arm.box(0, -0.29, 0, 0.12, 0.58, 0.13, suit); arm.box(0, -0.61, 0, 0.1, 0.14, 0.11, skin); arm.box(0, -0.53, 0, 0.13, 0.04, 0.14, 0xf0f0ea);
  const ga = arm.build(); M.armL.add(meshOf(ga)); M.armR.add(meshOf(ga));
  const leg = new Mesher(); leg.box(0, -0.48, 0, 0.16, 0.92, 0.17, suit); leg.box(0, -0.96, -0.05, 0.15, 0.08, 0.3, 0x050505);
  const gl = leg.build(); M.legL.add(meshOf(gl)); M.legR.add(meshOf(gl));
  // the cape: two panels hinged at the shoulders, black outside and red inside
  M.capes = [];
  for (const s of [-1, 1]) {
    const p = group(s * 0.14, 0.64, 0.13);
    const c = new Mesher(); c.box(s * 0.15, -0.72, 0.02, 0.4, 1.45, 0.025, 0x0c0c10); c.box(s * 0.15, -0.72, -0.004, 0.38, 1.42, 0.02, 0x8a0a14);
    p.add(meshOf(c.build())); M.torso.add(p); M.capes.push(p);
  }
  // the bat
  const bat = group(); const bm = new Mesher();
  bm.geo(P_SPH(8, 6), 0x1a1418, 0, 0, 0, 0, 0, 0, 0.3, 0.26, 0.5); bm.geo(P_SPH(6, 5), 0x1a1418, 0, 0.08, -0.3, 0, 0, 0, 0.2, 0.18, 0.2);
  bm.geo(P_CONE(4), 0x1a1418, -0.06, 0.2, -0.32, 0, 0, 0.3, 0.06, 0.14, 0.06); bm.geo(P_CONE(4), 0x1a1418, 0.06, 0.2, -0.32, 0, 0, -0.3, 0.06, 0.14, 0.06);
  bat.add(meshOf(bm.build()));
  bat.add(glowBits([[-0.04, 0.1, -0.4, 0.03, 0.03, 0.01, 0xff2020], [0.04, 0.1, -0.4, 0.03, 0.03, 0.01, 0xff2020]]));
  M.wings = [];
  for (const s of [-1, 1]) {
    const w = group(s * 0.12, 0.04, 0); const wm = new Mesher();
    wm.tri([0, 0, -0.2], [s * 1.0, 0.05, -0.1], [0, 0, 0.25], 0x2a1a20); wm.tri([0, 0, 0.25], [s * 1.0, 0.05, -0.1], [s * 0.9, 0, 0.3], 0x2a1a20);
    wm.tri([0, 0, 0.25], [s * 1.0, 0.05, -0.1], [0, 0, -0.2], 0x2a1a20); wm.tri([s * 0.9, 0, 0.3], [s * 1.0, 0.05, -0.1], [0, 0, 0.25], 0x2a1a20);
    w.add(meshOf(wm.build())); bat.add(w); M.wings.push(w);
  }
  bat.scale.setScalar(1.6); bat.visible = false; M.bat = bat; M.root.add(bat);
  return M;
}
function buildWerewolf() {
  const M = rig(0.98, 0.33, 0.6, 0.62, 0.13);
  const fur = 0x5a4430, fur2 = 0x3e2e20, shirt = 0x3a3046, pants = 0x2a3550;
  const t = new Mesher();
  t.box(0, 0.32, 0, 0.56, 0.66, 0.34, shirt); t.box(0, 0.42, -0.16, 0.24, 0.42, 0.06, fur);
  t.box(-0.16, 0.2, -0.17, 0.12, 0.2, 0.03, fur2); t.box(0.2, 0.05, -0.16, 0.1, 0.16, 0.04, fur);
  t.box(0, 0.62, 0.04, 0.5, 0.2, 0.4, fur); t.box(0, 0.72, 0.08, 0.32, 0.2, 0.3, fur2);
  t.box(0, -0.03, 0, 0.5, 0.14, 0.3, pants);
  M.torso.add(meshOf(t.build()));
  const h = new Mesher();
  h.box(0, 0.14, 0.02, 0.3, 0.3, 0.32, fur); h.box(0, 0.08, -0.22, 0.17, 0.15, 0.22, fur); h.box(0, 0.13, -0.335, 0.08, 0.06, 0.04, 0x0a0a0a);
  h.box(0, 0.0, -0.2, 0.15, 0.05, 0.2, 0x6a1a1a); for (const s of [-0.05, 0.05]) h.box(s, 0.035, -0.29, 0.02, 0.05, 0.02, 0xf0f0e0);
  h.box(0, 0.24, -0.12, 0.28, 0.06, 0.08, fur2); h.box(0, 0.08, 0.15, 0.36, 0.34, 0.12, fur2);
  for (const s of [-1, 1]) { h.geo(P_CONE(4), fur2, s * 0.11, 0.36, 0.06, 0, 0, s * -0.25, 0.1, 0.2, 0.08); h.box(s * 0.16, 0.06, -0.02, 0.06, 0.18, 0.2, fur2); }
  M.head.add(meshOf(h.build()));
  M.head.add(glowBits([[-0.07, 0.18, -0.145, 0.05, 0.03, 0.01, 0xffd020], [0.07, 0.18, -0.145, 0.05, 0.03, 0.01, 0xffd020]]));
  const arm = new Mesher(); arm.box(0, -0.18, 0, 0.16, 0.36, 0.17, shirt); arm.box(0, -0.48, 0, 0.13, 0.32, 0.14, fur); arm.box(0, -0.7, -0.02, 0.15, 0.14, 0.16, fur2);
  for (const s of [-0.05, 0, 0.05]) arm.geo(P_CONE(4), 0xf0ead8, s, -0.82, -0.06, 0.4, 0, 0, 0.03, 0.14, 0.03);
  const ga = arm.build(); M.armL.add(meshOf(ga)); M.armR.add(meshOf(ga));
  const leg = new Mesher(); leg.box(0, -0.25, 0, 0.19, 0.5, 0.2, pants); leg.box(0, -0.56, 0.02, 0.16, 0.12, 0.18, fur2); leg.box(0, -0.74, 0.04, 0.15, 0.3, 0.16, fur); leg.box(0, -0.93, -0.08, 0.18, 0.08, 0.32, fur2);
  for (const s of [-0.05, 0.05]) leg.geo(P_CONE(4), 0xf0ead8, s, -0.94, -0.26, -Math.PI / 2, 0, 0, 0.03, 0.08, 0.03);
  const gl = leg.build(); M.legL.add(meshOf(gl)); M.legR.add(meshOf(gl));
  const tail = group(0, 0.0, 0.17); const tm = new Mesher(); tm.geo(P_TAPER(0.3, 6), fur, 0, -0.25, 0, 0, 0, 0, 0.16, 0.55, 0.16);
  tail.add(meshOf(tm.build())); tail.rotation.x = 0.6; M.hips.add(tail); M.tail = tail;
  M.root.scale.setScalar(1.05);
  return M;
}
function buildFrank() {
  const M = rig(1.12, 0.42, 0.78, 0.86, 0.17);
  const coat = 0x22242a, pants = 0x3a3a40, skin = 0x98b090, boots = 0x0a0a0a;
  const t = new Mesher();
  t.box(0, 0.42, 0, 0.78, 0.86, 0.42, coat); t.box(0, 0.48, -0.2, 0.22, 0.6, 0.04, 0x4a4a52);
  t.box(0, -0.02, 0, 0.66, 0.16, 0.38, pants); t.box(0, 0.88, 0, 0.24, 0.12, 0.24, skin);
  for (const k of [0.25, 0.45, 0.65]) t.box(-0.06, k, -0.22, 0.05, 0.05, 0.02, 0x1a1a1a);
  M.torso.add(meshOf(t.build()));
  const h = new Mesher();
  h.box(0, 0.22, 0, 0.34, 0.4, 0.34, skin); h.box(0, 0.43, 0.0, 0.36, 0.06, 0.36, 0x0a0a0a); h.box(0, 0.33, 0.17, 0.36, 0.2, 0.04, 0x0a0a0a);
  h.box(0, 0.3, -0.17, 0.34, 0.07, 0.06, 0x7a9474); h.box(-0.08, 0.24, -0.172, 0.07, 0.035, 0.01, 0x101010); h.box(0.08, 0.24, -0.172, 0.07, 0.035, 0.01, 0x101010);
  h.box(0, 0.08, -0.172, 0.14, 0.025, 0.01, 0x3a2a2a); h.box(0.06, 0.37, -0.172, 0.16, 0.012, 0.01, 0x1a1a1a);
  for (const x of [0, 0.04, 0.08, 0.12]) h.box(x, 0.37, -0.174, 0.008, 0.04, 0.01, 0x1a1a1a);
  for (const s of [-1, 1]) h.geo(P_CYL(6), 0x8a8a90, s * 0.2, 0.03, 0, 0, 0, Math.PI / 2, 0.06, 0.14, 0.06);
  M.head.add(meshOf(h.build()));
  const arm = new Mesher(); arm.box(0, -0.3, 0, 0.22, 0.62, 0.24, coat); arm.box(0, -0.72, 0, 0.17, 0.24, 0.18, skin); arm.box(0, -0.92, -0.02, 0.2, 0.18, 0.22, skin);
  const ga = arm.build(); M.armL.add(meshOf(ga)); M.armR.add(meshOf(ga));
  const leg = new Mesher(); leg.box(0, -0.42, 0, 0.26, 0.84, 0.27, pants); leg.box(0, -0.98, -0.04, 0.3, 0.28, 0.42, boots);
  const gl = leg.build(); M.legL.add(meshOf(gl)); M.legR.add(meshOf(gl));
  return M;
}
function buildMummy() {
  const M = rig(0.98, 0.26, 0.6, 0.64, 0.11);
  const b1 = 0xc4b48c, b2 = 0xa89870, b3 = 0xd6c8a0;
  const wrap = (m, x, y, z, sx, sy, sz, n) => { m.box(x, y, z, sx, sy, sz, b1); for (let i = 0; i < n; i++) m.box(x, y - sy / 2 + (i + 0.5) * sy / n, z, sx + 0.015, sy / n * 0.35, sz + 0.015, i % 2 ? b2 : b3, (i % 3 - 1) * 0.06); };
  const t = new Mesher(); wrap(t, 0, 0.32, 0, 0.42, 0.64, 0.24, 6); t.box(0, -0.02, 0, 0.4, 0.12, 0.24, b2); t.box(0, 0.68, 0, 0.13, 0.1, 0.13, b1);
  M.torso.add(meshOf(t.build()));
  const h = new Mesher(); wrap(h, 0, 0.15, 0, 0.23, 0.28, 0.25, 4);
  h.box(0, 0.17, -0.125, 0.18, 0.06, 0.01, 0x1a140c); h.box(0.02, 0.06, -0.126, 0.08, 0.02, 0.01, 0x2a2018);
  M.head.add(meshOf(h.build()));
  M.head.add(glowBits([[-0.05, 0.17, -0.128, 0.035, 0.02, 0.01, 0xd8ff6a], [0.05, 0.17, -0.128, 0.035, 0.02, 0.01, 0xd8ff6a]]));
  const arm = new Mesher(); wrap(arm, 0, -0.3, 0, 0.12, 0.6, 0.13, 5); arm.box(0, -0.66, 0, 0.1, 0.13, 0.11, b2);
  const ga = arm.build(); M.armL.add(meshOf(ga)); M.armR.add(meshOf(ga));
  const leg = new Mesher(); wrap(leg, 0, -0.45, 0, 0.16, 0.9, 0.17, 6); leg.box(0, -0.93, -0.05, 0.15, 0.08, 0.27, b2);
  const gl = leg.build(); M.legL.add(meshOf(gl)); M.legR.add(meshOf(gl));
  // loose bandages trailing from the arms and waist
  M.strips = [];
  for (const [parent, x, y, z, l] of [[M.armL, 0, -0.5, 0.05, 0.6], [M.armR, 0.02, -0.35, 0.05, 0.45], [M.torso, 0.12, 0.02, 0.12, 0.7], [M.torso, -0.15, 0.3, 0.12, 0.5]]) {
    const p = group(x, y, z); const sm = new Mesher(); sm.box(0, -l / 2, 0, 0.07, l, 0.01, b3); sm.box(0, -l / 2, 0.006, 0.07, l, 0.01, b2);
    p.add(meshOf(sm.build())); parent.add(p); M.strips.push(p);
  }
  return M;
}
// pose a monster: mode 'idle' | 'walk' | 'run' | 'stalk' | 'air' | 'attack' | 'grab' | 'feed' | 'howl' | 'hold' | 'throw' | 'stomp' | 'cast' | 'dead'
function poseMonster(M, mode, phase, speed, t, k = 0) {
  const id = M.id, s = Math.sin(phase), c = Math.cos(phase);
  let hy = M.hipY, lean = 0, aL = 0, aR = 0, azL = 0.08, azR = -0.08, lL = 0, lR = 0, hx = 0, hry = 0, hz = 0;
  const stiff = id === 'frank', shuffle = id === 'mummy';
  if (mode === 'walk' || mode === 'stalk') {
    const a = (mode === 'stalk' ? 0.3 : 0.5) * clamp(speed / 3, 0.3, 1.2);
    lL = s * a; lR = -s * a; aL = -s * a * 0.7; aR = s * a * 0.7;
    if (stiff) { aL = -1.3 + s * 0.12; aR = -1.3 - s * 0.12; azL = 0.15; azR = -0.15; hry = s * 0.12; }
    if (shuffle) { aL = -1.4 + s * 0.1; aR = -0.2 + s * 0.2; lL = s * a * 0.6; lR = -s * a * 0.6; hz = s * 0.06; hx = 0.1; }
    if (mode === 'stalk') { hy -= 0.18; lean = 0.35; lL -= 0.35; lR -= 0.35; }
    hy += Math.abs(c) * (stiff ? 0.06 : 0.03);
  } else if (mode === 'run') {
    if (id === 'werewolf') {
      // on all fours
      lean = 1.15; hy -= 0.22; lL = s * 1.1 - 0.3; lR = -s * 1.1 - 0.3; aL = -1.25 - s * 1.0; aR = -1.25 + s * 1.0; hx = -0.9; azL = 0.1; azR = -0.1;
      hy += Math.abs(c) * 0.12;
    } else {
      const a = 0.85; lL = s * a; lR = -s * a; aL = -s * 1.0; aR = s * 1.0; lean = 0.22; hy += Math.abs(c) * 0.07;
      if (stiff) { aL = -1.4 + s * 0.2; aR = -1.4 - s * 0.2; lean = 0.1; }
      if (shuffle) { aL = -1.5; aR = -1.3; lean = 0.18; }
    }
  } else if (mode === 'air') { lL = -0.6; lR = 0.2; aL = -2.2; aR = -2.2; lean = 0.3; azL = 0.5; azR = -0.5; }
  else if (mode === 'attack') {
    // k: 0 → 1 through the swing
    const w = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6;
    if (id === 'werewolf') { const right = Math.floor(t * 0) % 2 === 0; aR = lerp(-0.5, -2.6, w); azR = lerp(-0.1, -1.0, w); aL = lerp(-2.4, -0.3, w); lean = 0.3 + w * 0.2; hy -= 0.1; void right; }
    else if (id === 'frank') { aL = aR = k < 0.5 ? lerp(0, -3.0, k / 0.5) : lerp(-3.0, -0.8, (k - 0.5) / 0.5); lean = k < 0.5 ? -0.15 : 0.4; azL = 0.25; azR = -0.25; }
    else { aL = aR = -1.5; lean = 0.25 + w * 0.2; }
  } else if (mode === 'grab') { aL = -1.3; aR = -1.3; azL = 0.5; azR = -0.5; lean = 0.35; hx = 0.4; }
  else if (mode === 'feed') { hy -= 0.3; lean = 0.9; lL = -1.0; lR = -0.8; aL = -1.3; aR = -1.1; hx = 0.4 + Math.sin(t * 9) * 0.08; }
  else if (mode === 'howl') { lean = -0.35; hx = -0.9; aL = -0.6; aR = -0.6; azL = 0.6; azR = -0.6; }
  else if (mode === 'hold') { aL = aR = -3.0; azL = 0.15; azR = -0.15; lean = -0.1; const a = 0.3 * clamp(speed / 3, 0, 1); lL = s * a; lR = -s * a; }
  else if (mode === 'throw') { aL = aR = lerp(-3.0, -0.6, k); lean = lerp(-0.2, 0.45, k); }
  else if (mode === 'stomp') { lR = k < 0.5 ? -1.3 * (k / 0.5) : -1.3 * (1 - (k - 0.5) / 0.5); aL = aR = -1.0 - k; azL = 0.6; azR = -0.6; lean = 0.15; }
  else if (mode === 'cast') { aL = -2.0 + Math.sin(t * 10) * 0.2; aR = -2.0 - Math.sin(t * 10) * 0.2; azL = 0.7; azR = -0.7; hx = -0.3; }
  else if (mode === 'lash') { aR = lerp(-2.8, -1.5, k); aL = -0.3; lean = 0.15; }
  else if (mode === 'stare') { aL = -1.2; aR = -1.6; azL = 0.4; azR = -0.2; lean = 0.15; hx = -0.05; }
  else if (mode === 'dead') { hy = 0.25; lean = 1.4; lL = -1.5; lR = -1.4; aL = -2.5; aR = -2.3; azL = 0.9; azR = -0.9; hx = 0.4; }
  else { aL = Math.sin(t * 1.4) * 0.05; aR = -aL; if (stiff) { aL = -0.2; aR = -0.2; } if (shuffle) { aL = -1.2; aR = -0.1; } hy += Math.sin(t * 1.6) * 0.012; if (id === 'werewolf') { lean = 0.25; hy -= 0.06; } }
  M.hips.position.y = hy; M.legL.position.y = M.legR.position.y = hy;
  M.torso.rotation.x = -lean; M.torso.rotation.z = hz; M.legL.rotation.x = lL; M.legR.rotation.x = lR;
  M.armL.rotation.x = aL; M.armR.rotation.x = aR; M.armL.rotation.z = azL; M.armR.rotation.z = azR;
  M.head.rotation.x = hx; M.head.rotation.y = hry;
  if (M.capes) { const flare = mode === 'run' ? 0.9 : mode === 'air' ? 1.2 : mode === 'walk' ? 0.25 : mode === 'stare' ? 0.5 : 0.08; M.capes.forEach((p, i) => { p.rotation.x = flare * (0.8 + Math.sin(t * 7 + i) * 0.2) + lean * 0.4; p.rotation.z = (i ? -1 : 1) * (flare * 0.35); }); }
  if (M.tail) M.tail.rotation.set(0.6 + (mode === 'run' ? 0.7 : 0) + Math.sin(t * 6) * 0.1, Math.sin(t * 3) * 0.3, 0);
  if (M.strips) M.strips.forEach((p, i) => { p.rotation.x = 0.3 + Math.sin(t * 2.3 + i * 1.7) * 0.25 + (mode === 'run' ? 0.6 : 0); p.rotation.z = Math.sin(t * 1.7 + i) * 0.2; });
}

// ---------- cars ----------
const CAR_SCHEMES = [[0x48c0b8, 0xf2f0e6], [0xd83a3a, 0xf2f0e6], [0xf0a8c0, 0xf2f0e6], [0x1a1a1e, 0x1a1a1e], [0xf0d048, 0xf2f0e6], [0x3a6ac8, 0xf2f0e6], [0x8ad0a0, 0x2a7a5a], [0xf2f0e6, 0x3a3a3a], [0xc86a2a, 0xf2e8d0], [0x6a4a8a, 0xe8e0f0]];
function carGeo(scheme, police) {
  return cachedGeo('car' + scheme.join() + police, () => {
    const [body, top] = scheme, chrome = 0xd8dce4, glass = 0x1a2430, m = new Mesher();
    m.box(0, 0.62, 0, 2.0, 0.55, 5.3, body);
    m.box(0, 0.98, 0.1, 1.96, 0.2, 5.1, police ? 0x101010 : body);
    m.box(0, 1.38, 0.35, 1.7, 0.62, 2.3, top);
    m.box(0, 1.38, -0.81, 1.62, 0.5, 0.04, glass, 0); m.box(0, 1.38, 1.51, 1.6, 0.5, 0.04, glass);
    m.box(-0.851, 1.38, 0.35, 0.02, 0.48, 2.1, glass); m.box(0.851, 1.38, 0.35, 0.02, 0.48, 2.1, glass);
    if (police) { m.box(-1.0, 0.75, 0.2, 0.02, 0.5, 1.6, 0xf0f0f0); m.box(1.0, 0.75, 0.2, 0.02, 0.5, 1.6, 0xf0f0f0); }
    // fins and chrome
    for (const s of [-1, 1]) { m.box(s * 0.85, 1.15, 2.2, 0.12, 0.35, 0.9, body); m.box(s * 0.85, 1.32, 2.55, 0.1, 0.2, 0.3, body); m.box(s * 1.01, 0.82, 0, 0.02, 0.05, 5.0, chrome); }
    m.box(0, 0.5, -2.68, 2.1, 0.22, 0.12, chrome); m.box(0, 0.5, 2.68, 2.1, 0.22, 0.12, chrome);
    m.box(0, 0.75, -2.66, 1.2, 0.25, 0.04, 0x3a3a3a);
    // wheels with whitewalls
    for (const [x, z] of [[-0.95, -1.7], [0.95, -1.7], [-0.95, 1.65], [0.95, 1.65]]) { m.geo(P_CYL(10), 0x101010, x, 0.38, z, 0, 0, Math.PI / 2, 0.76, 0.28, 0.76); m.geo(P_CYL(10), 0xf0f0f0, x + Math.sign(x) * 0.02, 0.38, z, 0, 0, Math.PI / 2, 0.44, 0.28, 0.44); }
    if (police) m.box(0, 1.74, 0.35, 0.5, 0.14, 0.3, 0xd02020);
    return m.build();
  });
}
function carLightsGeo() {
  return cachedGeo('carLights', () => {
    const m = new Mesher();
    for (const s of [-0.7, 0.7]) { m.box(s, 0.78, -2.68, 0.3, 0.2, 0.04, 0xfff4d0); m.box(s * 1.21, 1.2, 2.69, 0.1, 0.16, 0.04, 0xff2020); }
    return m.build();
  });
}
