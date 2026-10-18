// Ricky Rescue — models built from primitives: ambulances, traffic cars, people with poses, stretcher and gear

const lam = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
const basic = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o));

// ---------- decals ----------
const DECALS = {};
function decalTex(key, w, h, draw) { return DECALS[key] || (DECALS[key] = canvasTex(w, h, draw, { clamp: true })); }
function starOfLife() {
  return decalTex('star', 128, 128, (g, W) => {
    g.clearRect(0, 0, W, W);
    g.translate(W / 2, W / 2); g.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) { g.save(); g.rotate(k * Math.PI / 3); g.fillRect(-14, -50, 28, 100); g.restore(); }
    g.fillStyle = '#1f5fd0';
    for (let k = 0; k < 3; k++) { g.save(); g.rotate(k * Math.PI / 3); g.fillRect(-11, -47, 22, 94); g.restore(); }
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -36); g.lineTo(0, 36); g.stroke();
    g.beginPath(); for (let y = -30; y <= 30; y += 2) g.lineTo(Math.sin(y * 0.25) * 6, y); g.stroke();
  });
}
function textDecal(text, fg, w = 512, h = 96, font = 800) {
  return decalTex('t:' + text + fg, w, h, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${font} ${Math.round(H * 0.78)}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`; g.fillText(text, W / 2, H * 0.54, W * 0.98);
  });
}
function decal(tex, w, h, x, y, z, yaw, o = 1) {
  const m = new THREE.Mesh(GM.planeV(), new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, y, z); m.rotation.y = yaw; m.scale.set(w, h, 1); return m;
}

// ---------- ambulance ----------
// Cab shapes per rig type, in metres. hood: bumper to windshield foot; nose / cowl: hood height at the bumper and at
// the windshield; ws: windshield top; rake: how far back the windshield top sits; cap: run of the van's high-roof cap.
const RIG_CABS = {
  van: { len: 2.55, hood: 0.95, nose: 1.18, cowl: 1.3, ws: 2.05, rake: 0.72, cap: 0.35, axF: 0.9 },
  cutaway: { len: 2.5, hood: 0.95, nose: 1.12, cowl: 1.3, ws: 1.98, rake: 0.55, h: 2.25, w: 2.02, axF: 0.9 },
  box: { len: 2.7, hood: 1.2, nose: 1.45, cowl: 1.55, ws: 2.28, rake: 0.3, h: 2.5, w: 2.3, axF: 1.0 },
};
// a side profile (points are [z, y]) extruded across the width w, centred on x = 0. Each arch {z, y, r} is a wheel
// arch notched up from the bottom edge (y0) through the whole width.
function profileGeo(pts, y0, arches, w) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  // bottom edge, rear to front (the last point is the rear bottom corner)
  for (const a of arches.slice().sort((p, q) => p.z - q.z)) {
    sh.lineTo(a.z - a.r, y0); sh.lineTo(a.z - a.r, a.y); sh.absarc(a.z, a.y, a.r, Math.PI, 0, true); sh.lineTo(a.z + a.r, y0);
  }
  sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false, curveSegments: 10 }).rotateY(-Math.PI / 2).translate(w / 2, 0, 0);
}
// Built facing +z with the origin on the ground under the middle. The curb (right) side is -x.
function buildRig(type, livId = 'classic', patId = 'alt', colId = 'redwhite', unit = 'MEDIC 12') {
  const S = RIGS[type], L = LIVERIES[livId], LC = LIGHT_COLORS[colId], K = RIG_CABS[type], van = type === 'van';
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const len = S.len, wid = S.wid, hgt = S.hgt;
  const mBody = lam(L.body), mCab = lam(L.cab), mStripe = lam(L.stripe), mStripe2 = lam(L.stripe2);
  const mGlass = lam(0x1a2430, { emissive: 0x101820, emissiveIntensity: 0.3 }), mDark = lam(0x202226), mTire = lam(0x18181a), mRim = lam(0xb8bcc0), mChrome = lam(0xd0d4d8), mGrey = lam(0x8a8e94);
  const add = (m, mat, x, y, z, sx, sy, sz, parent = body) => { const o = mesh(GM.box(), mat, x, y, z, sx, sy, sz); parent.add(o); return o; };
  const zR = -len / 2, zF = len / 2, zB = zF - K.len; // rear, front, box/cab seam
  const cabW = K.w || wid, topY = van ? hgt : K.h, base = 0.42;
  const wsZ = zF - K.hood, wsTopZ = wsZ - K.rake; // windshield foot and top
  const wr = type === 'box' ? 0.46 : 0.38;
  const axF = zF - K.axF, axR = zR + (van ? 1.25 : 1.6);
  const archY = Math.max(wr, base), archR = wr + 0.07, archTop = archY + archR;
  const archF = { z: axF, y: archY, r: archR }, archB = { z: axR, y: archY, r: archR };
  // patient box (on the van it is the back of one shell with the cab)
  const boxW = wid, boxLen = zB - zR;
  body.add(new THREE.Mesh(profileGeo([[zB, base], [zB, hgt], [zR, hgt], [zR, base]], base, [archB], boxW), mBody));
  // cab: bumper, sloped hood, raked windshield, (on the van, the high-roof cap,) roof and back of the cab
  const cabPts = [[zF, base], [zF, K.nose], [wsZ, K.cowl], [wsTopZ, K.ws]];
  cabPts.push(van ? [wsTopZ - K.cap, topY] : [wsTopZ - 0.1, topY]);
  cabPts.push([zB, topY], [zB, base]);
  body.add(new THREE.Mesh(profileGeo(cabPts, base, [archF], cabW), mCab));
  // windshield glass laid on the slope, inset from the sides so the body shows as pillars
  const wsH = K.ws - K.cowl, wsL = Math.hypot(K.rake, wsH);
  const ws = add(GM.box(), mGlass, 0, (K.cowl + K.ws) / 2 + 0.02 * K.rake / wsL, wsZ - K.rake / 2 + 0.02 * wsH / wsL, cabW - 0.18, wsL - 0.06, 0.03);
  ws.rotation.x = -Math.atan2(K.rake, wsH);
  // grille, bumper
  const noseH = K.nose - base;
  add(GM.box(), mDark, 0, base + noseH * 0.5, zF + 0.02, cabW * 0.56, noseH * 0.4, 0.05); // grille
  add(GM.box(), mDark, 0, base + 0.06, zF + 0.06, cabW + 0.02, 0.22, 0.16); // bumper
  // cab door glass, handles and mirrors
  const doorZ0 = zB + (van ? 0.12 : 0.1), doorZ1 = wsTopZ - 0.06;
  for (const sx of [-1, 1]) {
    add(GM.box(), mGlass, sx * (cabW / 2 + 0.005), (K.cowl + K.ws) / 2 + 0.04, (doorZ0 + doorZ1) / 2, 0.02, K.ws - K.cowl - 0.12, doorZ1 - doorZ0);
    add(GM.box(), mDark, sx * (cabW / 2 + 0.01), K.cowl - 0.12, doorZ0 + 0.18, 0.03, 0.05, 0.2);
    add(GM.box(), mDark, sx * (cabW / 2 + 0.2), K.cowl + 0.42, wsTopZ + 0.02, 0.08, 0.35, 0.22);
    add(GM.box(), mDark, sx * (cabW / 2 + 0.1), K.cowl + 0.42, wsTopZ + 0.02, 0.2, 0.04, 0.04);
  }
  // side strips (stripes, checks) are split around the wheel arches they would cross
  const strip = (mat, x, y, h, z0, z1, arches) => {
    let segs = [[z0, z1]];
    for (const a of arches) if (y - h / 2 < a.y + a.r) segs = segs.flatMap(([p, q]) => [[p, Math.min(q, a.z - a.r)], [Math.max(p, a.z + a.r), q]]);
    for (const [p, q] of segs) if (q - p > 0.02) add(GM.box(), mat, x, y, (p + q) / 2, 0.01, h, q - p);
  };
  // stripes along the box and cab (one unbroken stripe on the van's single shell)
  const stripeY = van ? 1.0 : 1.12;
  for (const sx of [-1, 1]) {
    strip(mStripe, sx * (boxW / 2 + 0.006), stripeY, 0.26, zR, zB, [archB]);
    strip(mStripe2, sx * (boxW / 2 + 0.006), stripeY - 0.24, 0.07, zR, zB, [archB]);
    if (van) strip(mStripe, sx * (cabW / 2 + 0.006), stripeY, 0.26, zB, zF, [archF]);
    else strip(mStripe, sx * (cabW / 2 + 0.006), Math.min(stripeY - 0.12, K.nose - 0.16), 0.2, zB, zF, [archF]);
    if (L.check) for (let z = zR + 0.15, k = 0; z < zB - 0.4; z += 0.5, k++) {
      strip(k % 2 ? mStripe : mBody, sx * (boxW / 2 + 0.008), 0.72, 0.42, z, z + 0.5, [archB]);
      strip(k % 2 ? mBody : mStripe, sx * (boxW / 2 + 0.008), 1.14, 0.42, z, z + 0.5, [archB]);
    }
  }
  // rear stripe and chevrons
  add(GM.box(), mStripe, 0, stripeY, zR - 0.006, boxW, 0.26, 0.01);
  // lettering
  const txt = hexCss(L.text), unitW = Math.min(2.2, boxLen * 0.55), nameW = Math.min(1.9, boxLen * 0.5);
  for (const sx of [-1, 1]) {
    body.add(decal(textDecal(unit, txt), unitW, unitW * 0.19, sx * (boxW / 2 + 0.02), stripeY + 0.72, zR + boxLen * 0.38, sx * Math.PI / 2));
    body.add(decal(starOfLife(), 0.95, 0.95, sx * (boxW / 2 + 0.02), hgt - 0.7, zR + boxLen * 0.82, sx * Math.PI / 2));
    body.add(decal(textDecal('RICKY RESCUE EMS', txt, 512, 64, 700), nameW, nameW * 0.125, sx * (boxW / 2 + 0.02), stripeY + 0.3, zR + boxLen * 0.38, sx * Math.PI / 2));
  }
  body.add(decal(starOfLife(), 0.8, 0.8, 0, hgt - 0.65, zR - 0.02, Math.PI));
  // mirror-image lettering on the hood (reads right in the mirror of the car ahead), laid on its slope
  const hoodRise = Math.atan2(K.cowl - K.nose, K.hood);
  const hoodTxt = decal(textDecal('AMBULANCE', hexCss(L.text)), -Math.min(1.2, cabW * 0.6), 0.22, 0, (K.nose + K.cowl) / 2 + 0.01, zF - K.hood / 2, 0);
  hoodTxt.rotation.x = -Math.PI / 2 + hoodRise; body.add(hoodTxt);
  // rear doors (hinged on the outside edges) and the side door on the curb side
  const doorH = hgt - base - 0.25, doorW = boxW / 2 - 0.04;
  const mkDoor = (side) => {
    const piv = new THREE.Group(); piv.position.set(side * (boxW / 2 - 0.02), base + 0.12 + doorH / 2, zR - 0.02); body.add(piv);
    add(GM.box(), mBody, -side * doorW / 2, 0, -0.03, doorW, doorH, 0.06, piv);
    add(GM.box(), mGlass, -side * doorW / 2, doorH * 0.22, -0.065, doorW * 0.6, doorH * 0.28, 0.01, piv);
    add(GM.box(), mStripe, -side * doorW / 2, stripeY - (base + 0.12 + doorH / 2), -0.065, doorW, 0.26, 0.01, piv);
    return piv;
  };
  const doorL = mkDoor(1), doorR = mkDoor(-1);
  add(GM.box(), mDark, 0, base - 0.02, zR - 0.18, boxW - 0.1, 0.12, 0.35); // rear step
  const sideDoor = add(GM.box(), mBody, -(boxW / 2 + 0.01), base + 0.12 + doorH / 2, zB - 0.7, 0.03, doorH, 0.95);
  add(GM.box(), mGlass, -(boxW / 2 + 0.02), base + doorH * 0.75, zB - 0.7, 0.01, doorH * 0.24, 0.55);
  // undercarriage and wheels; each axle has a dark well between its wheels so the arches don't show daylight
  add(GM.box(), mDark, 0, 0.36, 0, wid - 0.75, 0.22, len - 0.6);
  const wheels = [];
  for (const [z, front] of [[axF, true], [axR, false]]) {
    const wx = (front ? cabW : wid) / 2 - 0.17, dual = !front && type === 'box';
    add(GM.box(), mDark, 0, (base + archTop) / 2, z, 2 * (wx - (dual ? 0.46 : 0.16)) - 0.02, archTop - base, archR * 2);
    for (const sx of [-1, 1]) {
      const wg = new THREE.Group(); wg.position.set(sx * wx, wr, z); body.add(wg);
      const spin = new THREE.Group(); wg.add(spin);
      spin.add(mesh(GM.wheel(), mTire, 0, 0, 0, 0.3, wr * 2, wr * 2));
      spin.add(mesh(GM.wheel(), mRim, sx * 0.13, 0, 0, 0.06, wr * 1.1, wr * 1.1));
      if (dual) spin.add(mesh(GM.wheel(), mTire, -sx * 0.3, 0, 0, 0.28, wr * 2, wr * 2));
      wheels.push({ g: wg, spin, front });
    }
  }
  // emergency lights
  const lmA = basic(0x501010), lmB = basic(0x404040);
  const offA = new THREE.Color(LC.a).multiplyScalar(0.28), offB = new THREE.Color(LC.b).multiplyScalar(0.28);
  lmA.color.copy(offA); lmB.color.copy(offB);
  const lightsA = [], lightsB = [];
  const lamp = (side, x, y, z, sx, sy, sz) => { const o = add(GM.box(), side ? lmB : lmA, x, y, z, sx, sy, sz); (side ? lightsB : lightsA).push(o); return o; };
  // light bar on the cab roof (the van's sits just behind the cap)
  const barZ = van ? wsTopZ - K.cap - 0.3 : (zB + wsTopZ - 0.1) / 2;
  add(GM.box(), mDark, 0, topY + 0.06, barZ, cabW * 0.9, 0.1, 0.32);
  lamp(0, cabW * 0.24, topY + 0.17, barZ, cabW * 0.38, 0.14, 0.3);
  lamp(1, -cabW * 0.24, topY + 0.17, barZ, cabW * 0.38, 0.14, 0.3);
  // front corner lights: on the box above the cab, or on the van's cap
  const cornerZ = van ? wsTopZ - K.cap * (1 - 0.15 / (hgt - K.ws)) + 0.03 : zB + 0.03;
  // box corner lights (front and rear), side lights, grille and rear-door lights
  for (const sx of [-1, 1]) {
    const s = sx > 0 ? 0 : 1;
    lamp(s, sx * (boxW / 2 - 0.2), hgt - 0.15, cornerZ, 0.32, 0.2, 0.06);
    lamp(1 - s, sx * (boxW / 2 - 0.2), hgt - 0.15, zR - 0.03, 0.32, 0.2, 0.06);
    lamp(s, sx * (boxW / 2 + 0.03), hgt - 0.18, zR + 0.35, 0.06, 0.2, 0.3);
    lamp(1 - s, sx * (boxW / 2 + 0.03), hgt - 0.18, zR + boxLen * 0.55, 0.06, 0.2, 0.3);
    lamp(s, sx * cabW * 0.17, base + noseH * 0.5, zF + 0.05, 0.16, 0.1, 0.03);
    lamp(1 - s, sx * (boxW / 2 - 0.35), base + 0.55, zR - 0.03, 0.22, 0.12, 0.04);
  }
  // head and tail lights
  const mHead = basic(0xfff4dc), mTail = basic(0x601010);
  for (const sx of [-1, 1]) {
    add(GM.box(), mHead, sx * (cabW / 2 - 0.22), base + noseH * 0.55, zF + 0.03, 0.3, 0.18, 0.04);
    add(GM.box(), mTail, sx * (boxW / 2 - 0.1), base + 0.95, zR - 0.03, 0.14, 0.42, 0.04);
  }
  // glow sprites for the emergency lights (night halos)
  const glow = (col) => new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  const halos = [];
  for (const o of [...lightsA, ...lightsB]) { const s = glow(lightsA.includes(o) ? LC.a : LC.b); s.position.copy(o.position); s.scale.setScalar(1.1); body.add(s); halos.push({ s, a: lightsA.includes(o) }); }
  shadowy(root, true, false);
  for (const h of halos) h.s.castShadow = false;
  return {
    type, root, body, wheels, doorL, doorR, sideDoor, lmA, lmB, offA, offB, onA: new THREE.Color(LC.a), onB: new THREE.Color(LC.b), halos, mTail,
    len, wid, hgt, axF, axR, wr, rearZ: zR, base, pat: LIGHTS[patId],
  };
}
// light-bar animation: on = lights running; t = seconds
function animRigLights(rig, on, t, night) {
  let a = 0, b = 0;
  if (on) {
    const P = rig.pat, ph = (t % P.period) / P.period;
    if (P.sweep) { a = 0.5 + 0.5 * Math.sin(ph * TAU); b = 0.5 + 0.5 * Math.sin(ph * TAU + Math.PI); }
    else { let st = P.steps[0]; for (const s of P.steps) if (ph >= s[0]) st = s; a = st[1]; b = st[2]; }
  }
  rig.lmA.color.copy(rig.offA).lerp(rig.onA, a);
  rig.lmB.color.copy(rig.offB).lerp(rig.onB, b);
  const hk = 0.2 + night * 0.45;
  for (const h of rig.halos) h.s.material.opacity = (h.a ? a : b) * hk * 0.9;
  return { a, b };
}

// a glow sprite for a flashing light; k is which half of the pattern it belongs to
function lightHalo(g, col, x, y, z, k) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  s.position.set(x, y, z); s.scale.setScalar(1.4); g.add(s);
  return { s, k };
}

// ---------- traffic cars (instanced) ----------
// each type: body (tinted per instance), dark trim (glass, tyres, bumpers), lights (always lit)
const CAR_TYPES = { // cab: the cabin's rear and front as fractions of the length (null = one-box van)
  sedan: { len: 4.6, wid: 1.82, h: 1.45, cab: [-0.3, 0.14], w: 0.34 },
  hatch: { len: 4.0, wid: 1.76, h: 1.5, cab: [-0.44, 0.12], w: 0.32 },
  suv: { len: 4.85, wid: 1.95, h: 1.8, cab: [-0.46, 0.14], w: 0.4 },
  pickup: { len: 5.4, wid: 2.0, h: 1.85, cab: [-0.06, 0.2], w: 0.42 },
  van: { len: 5.2, wid: 2.0, h: 2.3, cab: null, w: 0.38 },
};
const CAR_COLORS = [0xe8e8e8, 0x1c1c20, 0x8a9096, 0xb02a2a, 0x2a4a8a, 0x3a5a3a, 0xc8b89a, 0x5a2a3a, 0xd8d0c0, 0x2a2a3a, 0x6a7a8a, 0xe0a030, 0x4a6a8a, 0xf2f2ee];
function carGeoms(type) {
  const T = CAR_TYPES[type], L = T.len, W = T.wid, H = T.h, w = T.w;
  const bm = new Merger(), dm = new Merger(), lm = new Merger();
  const lowH = H * (type === 'van' ? 0.92 : 0.52);
  bm.box(0, w * 0.75, 0, W, lowH - w * 0.75, L, 0xffffff);
  if (T.cab) {
    const cz0 = T.cab[0] * L, cz1 = T.cab[1] * L, cl = cz1 - cz0, cz = (cz0 + cz1) / 2, ch = H - lowH;
    dm.box(0, lowH, cz, W * 0.86, ch * 0.84, cl * 0.96, 0x182028);
    bm.box(0, lowH + ch * 0.82, cz, W * 0.88, ch * 0.18, cl * 0.9, 0xffffff);
    for (const sz of [cz0 + 0.06, cz1 - 0.06]) for (const sx of [-1, 1]) bm.box(sx * W * 0.42, lowH, sz, 0.08, ch * 0.84, 0.1, 0xffffff);
    if (type === 'pickup') { for (const sx of [-1, 1]) bm.box(sx * (W / 2 - 0.05), lowH, -L * 0.3, 0.1, 0.4, L * 0.38, 0xffffff); dm.box(0, lowH, -L * 0.3, W * 0.85, 0.05, L * 0.36, 0x2a2a2c); }
  } else {
    dm.box(0, H * 0.58, L * 0.36, W * 0.94, H * 0.3, L * 0.18, 0x182028);
    for (const sx of [-1, 1]) dm.box(sx * W * 0.5, H * 0.6, L * 0.22, 0.02, H * 0.26, L * 0.2, 0x182028);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    _m4.compose(_v3.set(sx * (W / 2 - 0.2), w, sz * L * 0.33), _q.setFromAxisAngle(_up, 0), _sc.set(0.24, w * 2, w * 2));
    dm.add(GM.wheel(), _m4, 0x141414);
  }
  dm.box(0, w * 0.55, L / 2 + 0.03, W * 1.0, 0.24, 0.1, 0x2a2a2c);
  dm.box(0, w * 0.55, -L / 2 - 0.03, W * 1.0, 0.24, 0.1, 0x2a2a2c);
  const ly = Math.min(lowH - 0.24, 0.85);
  for (const sx of [-1, 1]) {
    lm.box(sx * W * 0.36, ly, L / 2 + 0.01, 0.34, 0.14, 0.04, 0xfff0d0);
    lm.box(sx * W * 0.38, ly + 0.02, -L / 2 - 0.01, 0.3, 0.14, 0.04, 0xc01818);
  }
  return { body: bm.build(), dark: dm.build(), lights: lm.build() };
}
const CAR_GEO = {};
function getCarGeo(type) { return CAR_GEO[type] || (CAR_GEO[type] = carGeoms(type)); }
// a stand-alone car mesh (crash scenes, police)
function buildCar(type, color, o = {}) {
  const G = getCarGeo(type), g = new THREE.Group();
  g.add(new THREE.Mesh(G.body, lam(color, { vertexColors: true })), new THREE.Mesh(G.dark, lam(0xffffff, { vertexColors: true })), new THREE.Mesh(G.lights, basic(0xffffff, { vertexColors: true })));
  if (o.police) {
    const T = CAR_TYPES[type];
    g.add(mesh(GM.box(), lam(0xffffff), 0, T.h * 0.52 - 0.15, 0, T.wid + 0.02, 0.3, T.len * 0.5));
    const bar = mesh(GM.box(), lam(0x202226), 0, T.h + 0.06, -0.1, T.wid * 0.8, 0.1, 0.3); g.add(bar);
    const a = basic(0xff2a2a), b = basic(0x3a6aff);
    g.add(mesh(GM.box(), a, T.wid * 0.2, T.h + 0.16, -0.1, T.wid * 0.36, 0.12, 0.28), mesh(GM.box(), b, -T.wid * 0.2, T.h + 0.16, -0.1, T.wid * 0.36, 0.12, 0.28));
    g.userData.bar = [a, b];
    g.userData.halos = [lightHalo(g, 0xff2a2a, T.wid * 0.2, T.h + 0.2, -0.1, 0), lightHalo(g, 0x3a6aff, -T.wid * 0.2, T.h + 0.2, -0.1, 1)];
    for (const sx of [-1, 1]) g.add(decal(textDecal('POLICE', '#14244a'), 1.6, 0.3, sx * (T.wid / 2 + 0.02), T.h * 0.52 - 0.12, -0.1, sx * Math.PI / 2));
  }
  if (o.wreck) { // crumpled nose: push the front of the body down and tilt
    const T = CAR_TYPES[type];
    g.add(mesh(GM.box(), lam(0x2a2a2c), 0, T.h * 0.4, T.len / 2 - 0.3, T.wid * 0.9, 0.5, 0.6));
    for (let k = 0; k < 6; k++) g.add(mesh(GM.box(), lam(0xc8d4dc, { transparent: true, opacity: 0.8 }), rnd.range(-1, 1), 0.02, T.len / 2 + rnd.range(0, 1.6), rnd.range(0.05, 0.15), 0.02, rnd.range(0.05, 0.15)));
  }
  shadowy(g, true, false);
  return g;
}

// ---------- people ----------
// makePerson(o): o = { skin, hair, shirt, pants, shoes, style: 'short'|'long'|'bun'|'bald'|'cap', h (height scale), w (build), uniform, kid, elder, hat }
function makePerson(o = {}) {
  const sc = o.h || 1, bw = o.w || 1;
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const mSkin = lam(o.skin || 0xe0b48f), mShirt = lam(o.shirt || 0x5a7aa0), mPants = lam(o.pants || 0x3a3a48), mShoe = lam(o.shoes || 0x222226), mHair = lam(o.hair || 0x2a2018);
  const part = (parent, mat, x, y, z, sx, sy, sz) => { const m = mesh(GM.box(), mat, x, y, z, sx, sy, sz); parent.add(m); return m; };
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const legL = 0.88 * sc, torsoH = 0.56 * sc;
  const hips = pivot(inner, 0, legL, 0);
  part(hips, mPants, 0, 0.04, 0, 0.36 * bw, 0.16, 0.22 * bw);
  const torso = pivot(hips, 0, 0.1, 0);
  part(torso, mShirt, 0, torsoH / 2, 0, 0.42 * bw, torsoH, 0.24 * bw);
  if (o.uniform) { // reflective stripes and a patch
    part(torso, lam(0xd8d8c8, { emissive: 0x404038 }), 0, torsoH * 0.35, 0, 0.43 * bw, 0.05, 0.25 * bw);
    part(torso, lam(0x1f5fd0), 0.12 * bw, torsoH * 0.75, 0.125 * bw, 0.07, 0.07, 0.01);
    part(torso, lam(0xd8262e), -0.12 * bw, torsoH * 0.75, 0.125 * bw, 0.07, 0.07, 0.01);
  }
  if (o.vest) part(torso, lam(o.vest, { emissive: 0x303000 }), 0, torsoH * 0.5, 0, 0.44 * bw, torsoH * 0.82, 0.26 * bw);
  const neck = pivot(torso, 0, torsoH, 0);
  const head = pivot(neck, 0, 0.05, 0);
  part(head, mSkin, 0, 0.13 * sc, 0, 0.21, 0.25 * sc, 0.23);
  const st = o.style || 'short';
  if (st !== 'bald') part(head, mHair, 0, 0.25 * sc, -0.015, 0.23, 0.07, 0.25);
  if (st === 'long') part(head, mHair, 0, 0.1 * sc, -0.1, 0.23, 0.3 * sc, 0.06);
  if (st === 'bun') part(head, mHair, 0, 0.26 * sc, -0.13, 0.1, 0.1, 0.1);
  if (st === 'short' || st === 'long' || st === 'bun') part(head, mHair, 0, 0.16 * sc, -0.11, 0.22, 0.16 * sc, 0.04);
  if (st === 'cap' || o.hat) { part(head, lam(o.hat || 0x1f2b4a), 0, 0.27 * sc, 0, 0.24, 0.07, 0.26); part(head, lam(o.hat || 0x1f2b4a), 0, 0.245 * sc, 0.15, 0.22, 0.02, 0.1); }
  if (o.elder) part(head, lam(0xc8c8c8), 0, 0.25 * sc, -0.015, 0.231, 0.05, 0.251);
  // eyes hint
  part(head, lam(0x1a1a1a), 0.05, 0.15 * sc, 0.116, 0.03, 0.025, 0.01); part(head, lam(0x1a1a1a), -0.05, 0.15 * sc, 0.116, 0.03, 0.025, 0.01);
  const arm = (sx) => {
    const sh = pivot(torso, sx * (0.25 * bw), torsoH - 0.06, 0);
    part(sh, mShirt, 0, -0.14 * sc, 0, 0.11, 0.3 * sc, 0.12);
    const el = pivot(sh, 0, -0.29 * sc, 0);
    part(el, o.longSleeve === false ? mSkin : mShirt, 0, -0.12 * sc, 0, 0.1, 0.26 * sc, 0.1);
    part(el, o.gloves ? lam(0x3a5ad8) : mSkin, 0, -0.28 * sc, 0.01, 0.09, 0.1, 0.1);
    return { sh, el };
  };
  const leg = (sx) => {
    const hp = pivot(hips, sx * 0.1 * bw, 0, 0);
    part(hp, mPants, 0, -0.22 * sc, 0, 0.15 * bw, 0.46 * sc, 0.16 * bw);
    const kn = pivot(hp, 0, -0.44 * sc, 0);
    part(kn, mPants, 0, -0.2 * sc, 0, 0.13 * bw, 0.42 * sc, 0.14 * bw);
    part(kn, mShoe, 0, -0.42 * sc, 0.04, 0.13, 0.08, 0.27);
    return { hp, kn };
  };
  const aL = arm(1), aR = arm(-1), lL = leg(1), lR = leg(-1);
  const P = { root, inner, hips, torso, neck, head, aL, aR, lL, lR, legL, sc, pose: 'stand', t: 0, matShirt: mShirt, o };
  shadowy(root, true, false);
  return P;
}
// joint targets for each pose: [hipsY (fraction of leg length), torsoX, headX, shLx, shLz, elL, shRx, shRz, elR, hpL, knL, hpR, knR, lie]
const POSES = {
  stand: [1, 0, 0, 0, 0.05, 0, 0, -0.05, 0, 0, 0, 0, 0],
  sit: [0.55, -0.05, 0, -0.2, 0.08, -0.4, -0.2, -0.08, -0.4, -1.55, 1.55, -1.55, 1.55],
  sitGround: [0.15, -0.25, 0.1, 0.35, 0.2, 0, 0.35, -0.2, 0, -1.45, 0.05, -1.45, 0.05],
  sitKnee: [0.15, 0.25, 0.2, -0.9, 0.1, -0.8, -0.9, -0.1, -0.8, -1.9, 2.1, -1.4, 0.3],
  kneel: [0.58, 0.32, 0.3, -0.9, 0.15, -0.5, -0.9, -0.15, -0.5, 0.05, 1.55, 0.05, 1.55],
  cpr: [0.6, 0.55, 0.3, -1.05, 0.12, 0, -1.05, -0.12, 0, 0.05, 1.55, 0.05, 1.55],
  crouch: [0.62, 0.45, 0.2, -0.7, 0.15, -0.6, -0.7, -0.15, -0.6, -1.1, 1.9, -1.1, 1.9],
  push: [1, 0.12, 0, -1.15, 0.1, -0.3, -1.15, -0.1, -0.3, 0, 0, 0, 0],
  carry: [1, 0.05, 0, -0.55, 0.1, -1.0, -0.55, -0.1, -1.0, 0, 0, 0, 0],
  chest: [1, 0.12, 0.1, -0.4, 0.05, -1.8, -0.2, -0.1, -0.2, 0, 0, 0, 0],
  chestSit: [0.55, 0.15, 0.15, -0.4, 0.05, -1.8, -0.2, -0.1, -0.4, -1.55, 1.55, -1.55, 1.55],
  wave: [1, 0, 0, 0, 0.05, 0, -2.6, -0.3, -0.4, 0, 0, 0, 0],
  phone: [1, 0, 0.1, 0, 0.05, 0, -1.2, -0.2, -2.2, 0, 0, 0, 0],
  arms: [1, 0, 0, -0.5, 0.35, -1.6, -0.5, -0.35, -1.6, 0, 0, 0, 0], // arms folded
  lie: [0.12, 0, 0, 0, 0.08, 0, 0, -0.08, 0, 0, 0, 0, 0, 1],
  lieKnee: [0.12, 0, 0, 0, 0.3, 0, 0, -0.3, 0, -0.6, 1.1, 0, 0, 1],
  recovery: [0.2, 0, 0.3, -1.2, 0.2, -0.6, 0.4, 0, -0.3, -0.9, 1.3, 0, 0.2, 2],
  fetal: [0.25, 0.5, 0.4, -1.0, 0.2, -1.6, -1.0, -0.2, -1.6, -1.4, 2.0, -1.3, 2.1, 2],
  slump: [0.15, 0.6, 0.6, 0.2, 0.25, 0, 0.2, -0.25, 0, -1.45, 0.05, -1.45, 0.05],
  lieSeize: [0.12, 0, 0, -0.8, 0.5, -1.2, -0.8, -0.5, -1.2, -0.3, 0.6, -0.3, 0.6, 1],
};
function posePerson(P, name, dt, move = 0) {
  const T = POSES[name] || POSES.stand;
  P.pose = name; P.t += dt;
  const k = 1 - Math.exp(-dt * 10);
  const L = (o, a, v) => { o.rotation[a] = lerp(o.rotation[a], v, k); };
  const lie = T[13] || 0;
  // lying is handled by tipping the inner group: 1 = on the back, 2 = on the side
  const tipX = lie === 1 ? -Math.PI / 2 : 0, tipZ = lie === 2 ? Math.PI / 2 : 0;
  L(P.inner, 'x', tipX); L(P.inner, 'z', tipZ);
  // a lying body is centred on the root (hips over the origin) so it sits right on a stretcher or the floor
  P.inner.position.y = lerp(P.inner.position.y, lie ? (lie === 2 ? 0.2 : 0.13) : 0, k);
  P.inner.position.z = lerp(P.inner.position.z, lie === 1 ? P.legL : 0, k);
  P.inner.position.x = lerp(P.inner.position.x, lie === 2 ? P.legL : 0, k);
  let hy = P.legL * (lie ? 1 : T[0]);
  let tx = T[1], hx = T[2], shL = T[3], shR = T[6], hpL = T[9], hpR = T[11], knL = T[10], knR = T[12], elL = T[5], elR = T[8];
  if (move > 0.05 && (name === 'stand' || name === 'push' || name === 'carry')) {
    const ph = P.t * (5.5 + move * 2.5), sw = Math.min(1, move) * 0.55;
    hpL = -Math.sin(ph) * sw; hpR = Math.sin(ph) * sw;
    knL = Math.max(0, Math.sin(ph + 1.4)) * sw * 1.4; knR = Math.max(0, -Math.sin(ph + 1.4)) * sw * 1.4;
    if (name === 'stand') { shL = Math.sin(ph) * sw * 0.8; shR = -Math.sin(ph) * sw * 0.8; elL = elR = -0.25; }
    hy += Math.abs(Math.cos(ph)) * 0.03;
  }
  if (name === 'cpr') { const b = Math.sin(P.t * TAU * 1.85); tx += b * 0.08; hy -= b * 0.015; }
  P.hips.position.y = lerp(P.hips.position.y, hy, k);
  if (name === 'lieSeize') { shL += Math.sin(P.t * 31) * 0.25; shR += Math.sin(P.t * 29 + 1) * 0.25; hpL += Math.sin(P.t * 27) * 0.15; hpR += Math.sin(P.t * 33) * 0.15; }
  if (name === 'wave') shR += Math.sin(P.t * 8) * 0.25;
  L(P.torso, 'x', tx); L(P.head, 'x', hx);
  L(P.aL.sh, 'x', shL); L(P.aL.sh, 'z', T[4]); L(P.aL.el, 'x', elL);
  L(P.aR.sh, 'x', shR); L(P.aR.sh, 'z', T[7]); L(P.aR.el, 'x', elR);
  L(P.lL.hp, 'x', hpL); L(P.lL.kn, 'x', knL); L(P.lR.hp, 'x', hpR); L(P.lR.kn, 'x', knR);
}
function snapPose(P, name) { for (let i = 0; i < 30; i++) posePerson(P, name, 0.1); }
// random civilian look
function civilianLook(r, o = {}) {
  const female = o.sex ? o.sex === 'F' : r.chance(0.5);
  const elder = o.age ? o.age >= 65 : r.chance(0.15);
  return {
    skin: r.pick(SKINS), hair: elder ? r.pick([0xb8b8b8, 0xd8d8d8, 0x8a8a8a]) : r.pick(HAIRS),
    shirt: r.pick([0xc84a4a, 0x4a7ac8, 0xe8e0d0, 0x3a8a5a, 0xd8a03a, 0x6a4a8a, 0x2a2a30, 0xf0f0f0, 0x8ab0d8, 0xc87aa0, 0x5a6a3a]),
    pants: r.pick([0x2a3a5a, 0x3a3a40, 0x6a5a48, 0x1c1c22, 0x8a8a90, 0x4a3a2a]), shoes: r.pick([0x222226, 0xe8e8e8, 0x5a3a24]),
    style: female ? r.pick(['long', 'bun', 'short']) : r.pick(['short', 'short', 'bald', 'cap']),
    h: (female ? 0.95 : 1.02) * r.range(0.95, 1.05) * (o.age && o.age < 13 ? 0.68 : 1), w: r.range(0.92, 1.15), elder, female,
  };
}

// ---------- the stretcher and gear ----------
// Stretcher: length along z with the head end at -z. `raise` 0..1 lifts the deck from collapsed to waist height.
function buildStretcher() {
  const g = new THREE.Group(), deck = new THREE.Group(); g.add(deck);
  const mFrame = lam(0xc8ccd0), mPad = lam(0x1f2a44), mDark = lam(0x222224), mStrap = lam(0xe8a020);
  deck.add(mesh(GM.box(), mFrame, 0, 0, 0, 0.62, 0.06, 2.0));
  deck.add(mesh(GM.box(), mPad, 0, 0.08, 0.1, 0.56, 0.1, 1.5));
  const backrest = new THREE.Group(); backrest.position.set(0, 0.08, -0.65); deck.add(backrest);
  backrest.add(mesh(GM.box(), mPad, 0, 0.0, -0.3, 0.56, 0.1, 0.6));
  for (const sx of [-1, 1]) deck.add(mesh(GM.box(), mFrame, sx * 0.3, 0.12, 0.2, 0.03, 0.12, 1.2));
  for (const z of [-0.2, 0.5]) deck.add(mesh(GM.box(), mStrap, 0, 0.17, z, 0.6, 0.02, 0.07));
  deck.add(mesh(GM.box(), mFrame, 0, 0.1, 1.0, 0.6, 0.04, 0.04)); // foot handle
  const legs = new THREE.Group(); g.add(legs);
  const base = mesh(GM.box(), mFrame, 0, 0.16, 0, 0.5, 0.05, 1.6); legs.add(base);
  const X1 = mesh(GM.box(), mFrame, 0, 0, 0, 0.04, 0.04, 1.0), X2 = mesh(GM.box(), mFrame, 0, 0, 0, 0.04, 0.04, 1.0);
  for (const sx of [-1, 1]) { const a = X1.clone(); a.position.x = sx * 0.24; legs.add(a); const b = X2.clone(); b.position.x = sx * 0.24; legs.add(b); }
  const xs = legs.children.slice(1);
  for (const [x, z] of [[-0.22, -0.72], [0.22, -0.72], [-0.22, 0.72], [0.22, 0.72]]) legs.add(mesh(GM.wheel(), mDark, x, 0.08, z, 0.05, 0.16, 0.16));
  // a jump bag and monitor riding on the foot end
  const gear = new THREE.Group(); deck.add(gear);
  gear.add(mesh(GM.box(), lam(0xc8262e), 0, 0.28, 0.6, 0.45, 0.3, 0.32));
  gear.add(mesh(GM.box(), lam(0xe8c020), 0, 0.5, 0.62, 0.36, 0.22, 0.24));
  const S = { g, deck, backrest, legs, xs, gear, raise: 1, back: 0 };
  setStretcher(S, 1, 0);
  shadowy(g, true, false);
  return S;
}
function setStretcher(S, raise, back) {
  S.raise = raise; S.back = back;
  const h = lerp(0.42, 0.9, raise);
  S.deck.position.y = h;
  const span = h - 0.2, ang = Math.asin(clamp(span / 1.0, 0, 1));
  S.xs.forEach((x, i) => { x.position.y = 0.2 + span / 2; x.rotation.x = (i % 2 ? 1 : -1) * ang; });
  S.backrest.rotation.x = back * 0.9;
}
function buildStairChair() {
  const g = new THREE.Group(), m = lam(0x2a2c30), y = lam(0xe8a020), p = lam(0x1f2a44);
  g.add(mesh(GM.box(), p, 0, 0.5, 0, 0.45, 0.06, 0.42), mesh(GM.box(), p, 0, 0.85, -0.2, 0.45, 0.6, 0.06));
  for (const sx of [-1, 1]) { g.add(mesh(GM.box(), m, sx * 0.24, 0.6, -0.22, 0.04, 1.2, 0.04)); g.add(mesh(GM.box(), m, sx * 0.24, 0.3, 0.16, 0.04, 0.6, 0.04)); g.add(mesh(GM.box(), y, sx * 0.24, 0.4, -0.3, 0.06, 0.8, 0.1)); }
  g.add(mesh(GM.wheel(), m, 0, 0.08, -0.25, 0.5, 0.15, 0.15));
  shadowy(g, true, false);
  return { g };
}
function buildBoard(scoop) {
  const g = new THREE.Group(), m = lam(scoop ? 0xd86a20 : 0xe8a020), s = lam(0x1a1a1a);
  if (scoop) { for (const sx of [-1, 1]) g.add(mesh(GM.box(), m, sx * 0.2, 0.03, 0, 0.18, 0.04, 1.9)); g.add(mesh(GM.box(), m, 0, 0.03, -0.9, 0.5, 0.04, 0.1), mesh(GM.box(), m, 0, 0.03, 0.9, 0.5, 0.04, 0.1)); }
  else { g.add(mesh(GM.box(), m, 0, 0.03, 0, 0.42, 0.05, 1.85)); for (const z of [-0.4, 0.1, 0.6]) g.add(mesh(GM.box(), s, 0, 0.06, z, 0.5, 0.02, 0.06)); }
  shadowy(g, true, false);
  return { g };
}
function buildBag(color = 0xc8262e) { const g = new THREE.Group(); g.add(mesh(GM.box(), lam(color), 0, 0.15, 0, 0.5, 0.3, 0.32), mesh(GM.box(), lam(0x1a1a1a), 0, 0.31, 0, 0.3, 0.03, 0.05)); shadowy(g, true, false); return g; }
function buildMonitorBox() { const g = new THREE.Group(); g.add(mesh(GM.box(), lam(0xe8c020), 0, 0.14, 0, 0.38, 0.28, 0.26), mesh(GM.box(), lam(0x102018, { emissive: 0x20a050, emissiveIntensity: 0.4 }), 0, 0.17, 0.131, 0.26, 0.15, 0.01)); shadowy(g, true, false); return g; }
function buildCone() { const g = new THREE.Group(); g.add(mesh(GM.cone(), lam(0xff6a10), 0, 0.36, 0, 0.36, 0.7, 0.36), mesh(GM.box(), lam(0x2a2a2a), 0, 0.02, 0, 0.42, 0.04, 0.42), mesh(GM.cyl(), lam(0xffffff, { emissive: 0x606060 }), 0, 0.42, 0, 0.24, 0.08, 0.24)); return g; }
function buildFireEngine() {
  const g = new THREE.Group(), r = lam(0xc8161e), w = lam(0xe8e8e8), d = lam(0x202226), gl = lam(0x1a2430);
  g.add(mesh(GM.box(), r, 0, 1.6, 0, 2.5, 2.4, 9.5), mesh(GM.box(), gl, 0, 2.3, 4.2, 2.4, 0.9, 0.9), mesh(GM.box(), w, 0, 1.15, 0, 2.52, 0.18, 9.52), mesh(GM.box(), d, 0, 0.45, 0, 2.3, 0.4, 9));
  g.add(mesh(GM.box(), lam(0xc0c4c8), 0, 3.0, -1, 1.2, 0.3, 7));
  for (const z of [3.3, -2.2, -3.6]) for (const sx of [-1, 1]) g.add(mesh(GM.wheel(), d, sx * 1.1, 0.5, z, 0.35, 1.0, 1.0));
  const a = basic(0xff2a2a), b = basic(0xffffff);
  // a light bar over the cab, corner lights on the body and a pair at the back
  g.add(mesh(GM.box(), a, 0.6, 2.9, 4.0, 0.9, 0.15, 0.3), mesh(GM.box(), b, -0.6, 2.9, 4.0, 0.9, 0.15, 0.3));
  g.add(mesh(GM.box(), a, 1.2, 2.6, 4.75, 0.12, 0.2, 0.06), mesh(GM.box(), b, -1.2, 2.6, 4.75, 0.12, 0.2, 0.06));
  g.add(mesh(GM.box(), b, 1.26, 2.6, -4.6, 0.06, 0.25, 0.3), mesh(GM.box(), a, -1.26, 2.6, -4.6, 0.06, 0.25, 0.3));
  g.add(mesh(GM.box(), a, 1.0, 2.75, -4.76, 0.3, 0.25, 0.06), mesh(GM.box(), b, -1.0, 2.75, -4.76, 0.3, 0.25, 0.06));
  g.userData.bar = [a, b];
  g.userData.halos = [lightHalo(g, 0xff2a2a, 0.6, 3.0, 4.0, 0), lightHalo(g, 0xffffff, -0.6, 3.0, 4.0, 1), lightHalo(g, 0xff2a2a, -1.0, 2.75, -4.85, 0), lightHalo(g, 0xffffff, 1.0, 2.75, -4.85, 1)];
  shadowy(g, true, false);
  return g;
}
