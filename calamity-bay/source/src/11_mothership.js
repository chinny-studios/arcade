// Calamity Bay — Umbra, the mothership: saucer rig, hover flight, shield, plasma cannons, tractor beam, fighter swarm, destroyer beam

const SHIP_R = 150, SHIP_ALT = 255, SHIP_START = 330;  // hull radius, hover height of the hull's centre, where the intro leaves it
const SHIP_PITCH = 0.58; // default camera pitch in flight
const DT_FIRE = 3.2, DT_BLAST = 4.8, DT_END = 9, STORM_R = 170;  // destroyer beam timeline (s) and firestorm reach (m)
const SHIP = {
  vx: 0, vz: 0, shieldA: 0, cannonT: 0, cannonQ: false, wingT: 0, launchQ: 0, launchT: 0, bay: 0, wingTgt: new V3(),
  lift: 0, liftFrom: new V3(), dest: null, open: 0, crash: null, sweepT: 0, flash: 0,
};
const WING = [], BOLTS = [];
const BAYS = [0.785, 2.356, 3.927, 5.498].map((a) => [Math.sin(a) * 104, -10, Math.cos(a) * 104]);
const sA = new V3(), sB = new V3(), sC = new V3(), sD = new V3();
let wingMesh = null, tractorFx = null;

// ---------- rig ----------
// hull cross-section as (radius, height): flat underside, thin rim, a gentle rise to the crown
const HULL_PROFILE = [[0, -14], [34, -14], [70, -12.5], [112, -9], [140, -4.5], [150, -1], [150.5, 1.5], [142, 4.5], [118, 8.5], [84, 13], [52, 17.5], [26, 22], [0, 24]];
function hullY(r, top) {
  const P = top ? HULL_PROFILE.slice(6).reverse() : HULL_PROFILE.slice(0, 7);
  for (let i = 1; i < P.length; i++) if (r <= P[i][0]) return lerp(P[i - 1][1], P[i][1], (r - P[i - 1][0]) / (P[i][0] - P[i - 1][0]));
  return P[P.length - 1][1];
}
function buildMothership() {
  const hull = mmat([0.34, 0.36, 0.38]), dark = mmat([0.1, 0.11, 0.13]);
  hull.metalness = 0.3; dark.metalness = 0.3;
  const glow = mmat([1, 0.86, 0.6], [1, 0.6, 0.22]);
  const R = { mats: { skin: hull, belly: dark, dark }, glow, root: new THREE.Group(), legs: [], arms: [], tail: [], mouthGlow: new THREE.Object3D() };
  R.body = joint(R.root, 0, 0, 0);
  part(R.body, new THREE.LatheGeometry(HULL_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 48), hull);
  part(R.body, new THREE.CylinderGeometry(151, 151, 3, 48, 1, true), dark, [0, 0.2, 0]);
  // the upper hull is a city of its own: blocks, trenches and a crown
  const rng = mulberry32(77), top = [];
  for (let r = 34; r < 140; r += 9) {
    const n = Math.floor(TAU * r / 11);
    for (let i = 0; i < n; i++) {
      if (rng() < 0.45) continue;
      const a = (i + rng() * 0.5) / n * TAU, h = 0.8 + rng() * (r < 70 ? 6 : 3), v = 0.24 + rng() * 0.22;
      top.push({ geo: new THREE.BoxGeometry(3 + rng() * 6, h, 3 + rng() * 6), p: [Math.sin(a) * r, hullY(r, true) + h / 2 - 0.6, Math.cos(a) * r], r: [0, a, 0], c: [v, v * 1.02, v * 1.05] });
    }
  }
  for (let s = 0; s < 6; s++) {
    const a = s / 6 * TAU + 0.26;
    for (let r = 30; r < 142; r += 10) top.push({ geo: new THREE.BoxGeometry(4, 3, 10.5), p: [Math.sin(a) * r, hullY(r, true) + 0.9, Math.cos(a) * r], r: [0, a, 0], c: [0.17, 0.18, 0.19] });
  }
  top.push({ geo: new THREE.CylinderGeometry(20, 26, 9, 12), p: [0, 28.5, 0], c: [0.36, 0.37, 0.39] });
  top.push({ geo: new THREE.CylinderGeometry(9, 14, 8, 12), p: [0, 37, 0], c: [0.3, 0.31, 0.33] });
  part(R.body, mergeParts(top), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7, metalness: 0.25 }));
  // underside: radial ribs, panels and the four hangar bays
  const under = [];
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * TAU, r0 = 36, r1 = 138, rm = (r0 + r1) / 2, tilt = Math.atan2(hullY(r1) - hullY(r0), r1 - r0);
    under.push({ geo: new THREE.BoxGeometry(r1 - r0, 2.2, 3.4), p: [Math.cos(a) * rm, hullY(rm) - 0.9, -Math.sin(a) * rm], r: [0, a, tilt], c: [0.1, 0.1, 0.12] });
  }
  for (let r = 46; r < 132; r += 14) {
    const n = Math.floor(TAU * r / 22);
    for (let i = 0; i < n; i++) {
      if (rng() < 0.4) continue;
      const a = (i + rng()) / n * TAU, v = 0.14 + rng() * 0.12;
      under.push({ geo: new THREE.BoxGeometry(5 + rng() * 8, 1.4, 5 + rng() * 8), p: [Math.sin(a) * r, hullY(r) - 0.5, Math.cos(a) * r], r: [0, a, 0], c: [v, v, v * 1.08] });
    }
  }
  for (const [x, y, z] of BAYS) under.push({ geo: new THREE.BoxGeometry(20, 2.4, 12), p: [x, y - 0.8, z], r: [0, Math.atan2(x, z), 0], c: [0.03, 0.03, 0.04] });
  part(R.body, mergeParts(under), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0.2 }));
  // rings of lights on the underside and the rim, a band of windows on the crown
  const lights = [];
  for (const [r, n, s] of [[136, 72, 1.6], [96, 40, 1.4], [58, 24, 1.2]]) for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * TAU;
    lights.push({ geo: new THREE.BoxGeometry(s, 0.8, s), p: [Math.sin(a) * r, hullY(r) - 0.5, Math.cos(a) * r] });
  }
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; lights.push({ geo: new THREE.BoxGeometry(2.2, 1, 2.2), p: [Math.sin(a) * 151.2, 0.2, Math.cos(a) * 151.2], r: [0, a, 0] }); }
  for (const [x, y, z] of BAYS) lights.push({ geo: new THREE.BoxGeometry(15, 0.6, 1.2), p: [x, y - 2.1, z], r: [0, Math.atan2(x, z) + Math.PI / 2, 0] });
  lights.push({ geo: new THREE.CylinderGeometry(23.6, 23.6, 1.4, 24, 1, true), p: [0, 29, 0] });
  part(R.body, mergeParts(lights), glow).castShadow = false;
  // the dish: eight petals over a core that charges the destroyer beam
  part(R.body, new THREE.CylinderGeometry(31, 31, 1, 24), dark, [0, -13.6, 0]);
  R.core = part(R.body, new THREE.SphereGeometry(17, 16, 10), new THREE.MeshBasicMaterial({ color: 0x223040 }), [0, -13, 0], [0, 0, 0], [1, 0.42, 1]);
  R.core.castShadow = false;
  R.petals = [];
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, g = joint(R.body, Math.sin(a) * 31, -14.6, Math.cos(a) * 31);
    g.rotation.order = 'YXZ'; g.rotation.y = a + Math.PI;
    part(g, new THREE.BoxGeometry(25, 1.5, 31), dark, [0, 0, 15.5]);
    R.petals.push(g);
  }
  // the shield: a fresnel shell that lights up where it is hit
  R.shield = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 }, uCol: { value: new THREE.Color(0x7dffb0) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(uCol * (0.04 + f * f * 1.4) * uA, 1.0); }`,
  }));
  R.shield.scale.set(170, 44, 170); R.shield.position.y = 3; R.shield.renderOrder = 5;
  R.body.add(R.shield);
  return R;
}
function initShip() {
  Object.assign(SHIP, { vx: 0, vz: 0, shieldA: 0, cannonT: 0, cannonQ: false, wingT: 0, launchQ: 0, lift: 0, dest: null, open: 0, crash: null, flash: 0 });
  if (!wingMesh) initFleet();
  setShadowRange(340);
}
function initFleet() {
  const hc = [0.2, 0.22, 0.24], dc = [0.08, 0.08, 0.09];
  const geo = mergeParts([
    { geo: new THREE.BoxGeometry(2.6, 1.3, 5.5), c: hc },
    { geo: new THREE.ConeGeometry(1.4, 2.6, 6), p: [0, 0, 3.9], r: [Math.PI / 2, 0, 0], c: hc },
    { geo: new THREE.BoxGeometry(4.6, 0.45, 3.2), p: [-3.2, -0.1, -0.6], r: [0, -0.45, 0.12], c: hc },
    { geo: new THREE.BoxGeometry(4.6, 0.45, 3.2), p: [3.2, -0.1, -0.6], r: [0, 0.45, -0.12], c: hc },
    { geo: new THREE.BoxGeometry(0.5, 1.4, 4), p: [-5.2, 0.2, 0.6], c: dc },
    { geo: new THREE.BoxGeometry(0.5, 1.4, 4), p: [5.2, 0.2, 0.6], c: dc },
    { geo: new THREE.BoxGeometry(1.6, 0.6, 0.4), p: [0, 0, -2.85], c: [1, 0.7, 0.35] },
  ]);
  wingMesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), 24);
  wingMesh.frustumCulled = false; wingMesh.castShadow = true;
  for (let i = 0; i < 24; i++) wingMesh.setMatrixAt(i, ZERO_M);
  scene.add(wingMesh);
  const tg = new THREE.CylinderGeometry(1, 0.6, 1, 16, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  tractorFx = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0x9cffc0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  tractorFx.visible = false; tractorFx.renderOrder = 6;
  scene.add(tractorFx);
}

// ---------- flight ----------
function groundUnderShip(x, z) {
  let gy = WATER_Y;
  for (let i = 0; i < 7; i++) { const a = i / 6 * TAU, r = i ? 120 : 0; gy = Math.max(gy, terrainH(x + Math.sin(a) * r, z + Math.cos(a) * r)); }
  return gy;
}
function updateShip(dt, input) {
  const d = MON.def, R = MON.rig;
  SHIP.cannonT -= dt;
  if (SHIP.cannonQ && SHIP.cannonT <= 0) { SHIP.cannonQ = false; shipFire(); }
  // drift relative to the camera, with a great deal of inertia
  let wx = 0, wz = 0;
  if (MON.ctl && input) {
    const fy = AIM.yaw;
    const mx = Math.sin(fy) * input.f + -Math.cos(fy) * input.s, mz = Math.cos(fy) * input.f + Math.sin(fy) * input.s;
    const mag = Math.hypot(mx, mz);
    if (mag > 0.1) { const top = (MON.run ? d.run : d.walk) * (SHIP.dest ? 0.35 : 1) / Math.max(1, mag); wx = mx * top; wz = mz * top; }
  }
  const k = 1 - Math.exp(-dt * 0.7);
  SHIP.vx += (wx - SHIP.vx) * k; SHIP.vz += (wz - SHIP.vz) * k;
  const nx = clamp(MON.x + SHIP.vx * dt, MAP.x0, MAP.x1), nz = clamp(MON.z + SHIP.vz * dt, MAP.z0, MAP.z1);
  if (nx !== MON.x + SHIP.vx * dt) SHIP.vx = 0;
  if (nz !== MON.z + SHIP.vz * dt) SHIP.vz = 0;
  MON.x = nx; MON.z = nz;
  MON.speed = Math.hypot(SHIP.vx, SHIP.vz);
  // hover over the highest ground beneath the hull
  const ty = groundUnderShip(MON.x, MON.z) + SHIP_ALT + Math.sin(clock * 0.45) * 2;
  MON.y += (ty - MON.y) * (1 - Math.exp(-dt * 0.5));
  // lean into the drift
  R.body.rotation.x = SHIP.vz / d.run * 0.04;
  R.body.rotation.z = -SHIP.vx / d.run * 0.04;
  SHIP.sweepT -= dt;
  if (SHIP.sweepT <= 0) { SHIP.sweepT = 0.25; hullSweep(); }
  if (SHIP.dest) updateDestroyer(dt);
  // repairs while nothing is shooting at it
  MON.calm += dt;
  MON.home = false;
  if (MON.calm > 6) MON.hp = Math.min(d.hp, MON.hp + 8 * dt);
  shipLooks(dt);
  placeRig();
  updateTractor(dt);
  if (AC) aSet(loops.ship.g.gain, 0.16, 0.5);
}
// Lights, dish, shield and flashes: shared by flight and the arrival.
function shipLooks(dt) {
  const R = MON.rig, D = SHIP.dest;
  SHIP.open += clamp((D && D.t < DT_END - 1.2 ? 1 : 0) - SHIP.open, -dt * 0.8, dt * 0.9);
  const op = ease(clamp(SHIP.open, 0, 1));
  for (const g of R.petals) g.rotation.x = op * 1.2;
  const c = D ? clamp(D.t / DT_FIRE, 0, 1) * (D.t < DT_BLAST + 0.6 ? 1 : 0.3) : 0, fl = 0.9 + Math.random() * 0.1;
  R.core.material.color.setRGB((0.13 + c * 0.8) * fl, (0.19 + c * 0.81) * fl, (0.25 + c * 0.75) * fl);
  R.core.scale.y = 0.42 + op * 0.5;
  if (D) R.glow.emissiveIntensity += c * 2;
  SHIP.shieldA = Math.max(0, SHIP.shieldA - dt * 1.8);
  R.shield.visible = !D || D.t < 0.5;
  R.shield.material.uniforms.uA.value = D ? (Math.random() < 0.5 ? 0.8 : 0) * (1 - D.t / 0.5) : 0.06 + SHIP.shieldA;
  MON.hurtT -= dt;
  const hf = Math.max(0, MON.hurtT) * 4;
  R.mats.skin.emissive.setRGB(hf * 0.6, hf * 0.05, 0);
  SHIP.flash = Math.max(0, SHIP.flash - dt * 1.4);
  skyMat.uniforms.uFlash.value = SHIP.flash * 0.5;
  hemi.intensity = 0.72 + SHIP.flash * 1.4;
}
function skyFlash(a) { SHIP.flash = Math.min(1.2, SHIP.flash + a); }
// Anything tall the hull drifts into is sheared off.
function hullSweep() {
  const y = MON.y - 14;
  for (let i = 0; i < 13; i++) {
    const a = i / 12 * TAU, r = i ? 125 : 0;
    blocksInSphere(MON.x + Math.sin(a) * r, y, MON.z + Math.cos(a) * r, 32, (id) => {
      const B = BLK_[id];
      if (B.y + B.hy > y - 2) detachBlock(id, SHIP.vx + frand(-2, 2), -2, SHIP.vz + frand(-2, 2));
    });
  }
}

// ---------- shield ----------
function shipArmor() { return SHIP.dest ? 1.25 : 0.2; }
function shipHit(dmg, pos) {
  if (SHIP.dest) return;
  SHIP.shieldA = Math.min(0.7, SHIP.shieldA + 0.04 + dmg * 0.02);
  if (pos) emit(glowPS, pos.x, pos.y, pos.z, 0, 0, 0, 6 + Math.min(dmg, 20) * 0.6, 8, 0.25, 0.5, 1, 0.7, 1, 0, 0);
}
// Signed distance (roughly) to the shield, or to the bare hull while the beam is out.
function shipDist(x, y, z) {
  const sx = SHIP.dest ? SHIP_R : 170, sy = SHIP.dest ? 22 : 44;
  const dx = (x - MON.x) / sx, dy = (y - MON.y - 3) / sy, dz = (z - MON.z) / sx;
  return (Math.sqrt(dx * dx + dy * dy + dz * dz) - 1) * sy;
}

// ---------- plasma cannons ----------
function shipFire() {
  if (SHIP.cannonT > 0) { SHIP.cannonQ = true; return; }
  SHIP.cannonT = 0.4;
  const a0 = Math.atan2(AIM.p.x - MON.x, AIM.p.z - MON.z);
  for (let k = -1; k <= 1; k++) {
    const a = a0 + k * 0.22;
    sA.set(MON.x + Math.sin(a) * 140, MON.y - 5, MON.z + Math.cos(a) * 140);
    sB.set(AIM.p.x + frand(-5, 5) - sA.x, AIM.p.y - sA.y, AIM.p.z + frand(-5, 5) - sA.z).normalize();
    shipBolt(sA, sB, 300, true);
    emit(glowPS, sA.x, sA.y, sA.z, 0, 0, 0, 9, 4, 0.12, 0.6, 1, 0.6, 1, 0, 0);
  }
  zapSound(sA, 1);
}
function shipBolt(o, d, speed, big) {
  BOLTS.push({ x: o.x, y: o.y, z: o.z, vx: d.x * speed, vy: d.y * speed, vz: d.z * speed, life: 3.5, big });
}
function updateBolts(dt) {
  for (let i = BOLTS.length - 1; i >= 0; i--) {
    const p = BOLTS[i];
    p.life -= dt;
    let hit = false;
    for (let s = 0; s < 3 && !hit; s++) {
      p.x += p.vx * dt / 3; p.y += p.vy * dt / 3; p.z += p.vz * dt / 3;
      if (p.y < WATER_Y || p.y < terrainH(p.x, p.z) || staticAt(p.x, p.y, p.z) >= 0) hit = true;
      else for (const u of UNITS) if (u.alive && (u.type === 'heli' || u.type === 'jet') && Math.hypot(u.x - p.x, u.y - p.y, u.z - p.z) < 8) { hit = true; break; }
    }
    if (hit) { boltImpact(p); BOLTS.splice(i, 1); continue; }
    if (p.life <= 0) { BOLTS.splice(i, 1); continue; }
    const s = p.big ? 4.5 : 2.4;
    emit(glowPS, p.x, p.y, p.z, 0, 0, 0, s, -s, 0.1, 0.65, 1, 0.6, 1, 0, 0);
    emit(glowPS, p.x - p.vx * 0.015, p.y - p.vy * 0.015, p.z - p.vz * 0.015, 0, 0, 0, s * 0.7, -s, 0.08, 0.4, 1, 0.5, 0.8, 0, 0);
  }
}
function boltImpact(p) {
  const L = Math.hypot(p.vx, p.vy, p.vz) || 1, big = p.big;
  if (p.y < WATER_Y + 1 && terrainH(p.x, p.z) < WATER_Y) splashAt(p.x, p.z, big ? 3 : 1.5);
  hitSphere(p.x, p.y, p.z, big ? 6 : 4.5, big ? 115 : 75, p.vx / L, 0.15, p.vz / L, big ? 8 : 5, null);
  explosionFx(p.x, p.y, p.z, big ? 1.3 : 0.6);
  emit(glowPS, p.x, p.y, p.z, 0, 0, 0, big ? 14 : 7, 10, 0.18, 0.6, 1, 0.6, 1, 0, 0);
  if (big || Math.random() < 0.3) boom(sC.set(p.x, p.y, p.z), big ? 0.55 : 0.3);
}

// ---------- tractor beam ----------
function tractorGrab() {
  const px = AIM.p.x, pz = AIM.p.z;
  if (Math.hypot(px - MON.x, pz - MON.z) > 430) { showHint('Too far for the tractor beam', 1.5); return; }
  let best = null, bd = 26;
  for (const u of UNITS) {
    if (!u.alive || u.type === 'heli' || u.type === 'jet') continue;
    const d = Math.hypot(u.x - px, u.z - pz);
    if (d < bd) { bd = d; best = { u }; }
  }
  agentsNear(px, pz, 26, (o) => {
    if (o.vmax === undefined) return;
    const d = Math.hypot(o.x - px, o.z - pz) + 2;
    if (d < bd) { bd = d; best = { c: o }; }
  });
  bodiesNear(px, AIM.p.y, pz, 22, (b) => {
    if (b.members || b.hinge || b.held || b.m > 8000) return;
    const d = Math.hypot(b.p.x - px, b.p.z - pz) + 4;
    if (d < bd) { bd = d; best = { b }; }
  });
  let body = null;
  if (best && best.u) body = wreckUnit(best.u, true);
  else if (best && best.c) body = wreckCar(best.c, 0, 0, 0, false);
  else if (best && best.b) { body = best.b; if (body.fade) { body.fade = 0; body.s.copy(body.h).multiplyScalar(2); } }
  else if (AIM.id >= 0 && BLK_[AIM.id].alive) {
    // pull a piece out of the building under the crosshair
    const B = BLK_[AIM.id];
    removeStatic(AIM.id);
    body = spawnBlockBody(B, [0, 0, 0], [B.hx, B.hy, B.hz], 0, 0, 0, 0);
    crumbleSound(B.vol, sC.set(B.x, B.y, B.z));
    dustAt(B.x, B.y, B.z, 6, 4);
  }
  if (body && !body.dead) {
    MON.held = body; body.held = true; body.asleep = false;
    SHIP.lift = 0; SHIP.liftFrom.copy(body.p);
    tractorSound();
    showHint(isTouch ? 'Tap LIFT again to hurl it' : 'Click or press E to hurl it', 2.5);
  } else showHint('Nothing there to lift', 1.5);
}
function updateTractor(dt) {
  if (MON.held && MON.held.dead) MON.held = null;
  const b = MON.held;
  if (AC) aSet(loops.tractor.g.gain, b ? 0.12 : 0, 0.2);
  if (!b) { tractorFx.visible = false; return; }
  SHIP.lift = Math.min(1, SHIP.lift + dt / 2.4);
  handPos(sA, 1);
  prevHeld.copy(b.p);
  sB.copy(sA); sB.y -= b.h.y + 4;
  b.p.lerpVectors(SHIP.liftFrom, sB, ease(SHIP.lift));
  b.q.setFromEuler(_e1.set(clock * 0.3, clock * 0.5, 0));
  b.v.copy(b.p).sub(prevHeld).divideScalar(Math.max(dt, 1e-3));
  b.age = 0;
  const w = Math.max(6, b.r * 1.8);
  tractorFx.visible = true;
  tractorFx.position.copy(sA);
  tractorFx.lookAt(b.p);
  tractorFx.scale.set(w, w, sA.distanceTo(b.p) + b.r);
  tractorFx.material.opacity = 0.16 + Math.sin(clock * 9) * 0.03;
  for (let i = 0; i < 2; i++) {
    const t = Math.random();
    emit(glowPS, lerp(b.p.x, sA.x, t) + frand(-w, w) * 0.5, lerp(b.p.y, sA.y, t), lerp(b.p.z, sA.z, t) + frand(-w, w) * 0.5, 0, 18, 0, 1.4, 0, 0.6, 0.6, 1, 0.75, 0.7, 0, 0);
  }
}

// ---------- fighter swarm ----------
function launchFighters() {
  if (SHIP.wingT > 0) { showHint(`Fighters rearming · ${Math.ceil(SHIP.wingT)}s`, 1.5); return; }
  SHIP.wingT = 14; SHIP.launchQ = 12; SHIP.launchT = 0;
  SHIP.wingTgt.copy(AIM.p);
  ring(AIM.p.x, AIM.p.y + 1, AIM.p.z, 40, 0.8, 0x9cff7a);
  say('FIGHTERS AWAY', 1.2, 'sp');
}
function spawnFighter() {
  const bi = SHIP.bay++ % BAYS.length, b = BAYS[bi];
  jointPos(MON.rig.body, sA, b[0], b[1] - 3, b[2]);
  WING.push({
    x: sA.x, y: sA.y, z: sA.z, vx: SHIP.vx + b[0] / 104 * 25, vy: -32, vz: SHIP.vz + b[2] / 104 * 25, st: 'launch', t: 0, bay: bi, bank: 0,
    life: rr(17, 21), fireT: rr(0.5, 1.2), u: null, scanT: 0, pull: 0, ox: frand(-50, 50), oz: frand(-50, 50),
  });
  fighterSound(sA);
}
function pickFighterTarget(f) {
  if (Math.random() < 0.3) return null; // some keep strafing the city
  let best = null, bd = 1e9;
  for (const u of UNITS) {
    if (!u.alive) continue;
    const air = u.type === 'heli' || u.type === 'jet';
    const d = air ? Math.hypot(u.x - f.x, u.y - f.y, u.z - f.z) * 0.6 : Math.hypot(u.x - SHIP.wingTgt.x, u.z - SHIP.wingTgt.z);
    if (d < (air ? 420 : 170) && d < bd) { bd = d; best = u; }
  }
  return best;
}
const ZAX = new V3(0, 0, 1), _qb = new THREE.Quaternion();
function updateFleet(dt) {
  SHIP.wingT -= dt;
  if (SHIP.launchQ > 0 && !MON.dead) {
    SHIP.launchT -= dt;
    if (SHIP.launchT <= 0) { SHIP.launchT = 0.11; SHIP.launchQ--; if (WING.length < 24) spawnFighter(); }
  }
  for (let i = WING.length - 1; i >= 0; i--) if (!updateFighter(WING[i], dt)) WING.splice(i, 1);
  for (let i = 0; i < 24; i++) {
    const f = WING[i];
    if (!f) { wingMesh.setMatrixAt(i, ZERO_M); continue; }
    sA.set(f.vx, f.vy, f.vz).normalize();
    _m4.lookAt(sA, sD.set(0, 0, 0), UP);
    _q1.setFromRotationMatrix(_m4).multiply(_qb.setFromAxisAngle(ZAX, f.bank));
    _m4.compose(sB.set(f.x, f.y, f.z), _q1, sC.set(1.3, 1.3, 1.3));
    wingMesh.setMatrixAt(i, _m4);
  }
  wingMesh.instanceMatrix.needsUpdate = true;
  updateBolts(dt);
}
function updateFighter(f, dt) {
  f.t += dt; f.life -= dt; f.fireT -= dt; f.scanT -= dt;
  const v = sA.set(f.vx, f.vy, f.vz), sp0 = v.length() || 1;
  v.divideScalar(sp0);
  const gy = Math.max(terrainH(f.x, f.z), WATER_Y);
  if (f.st === 'fall') {
    f.vy -= G * 2 * dt;
    f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    if (Math.random() < 0.5) smokePuff(f.x, f.y, f.z, 2.5, 0.15);
    if (f.y < gy + 1 || staticAt(f.x, f.y, f.z) >= 0) { fighterDown(f); return false; }
    return true;
  }
  const want = sB;
  let speed = 95, turn = 2.1;
  if (f.st === 'launch') {
    speed = lerp(35, 95, clamp(f.t, 0, 1)); turn = 1;
    want.set(f.vx, -5, f.vz);
    if (f.t > 1) f.st = 'attack';
  } else if (f.st === 'attack') {
    if (MON.dead) { f.st = 'fall'; return true; }
    if (f.life <= 0) f.st = 'home';
    if (f.scanT <= 0) { f.scanT = rr(0.6, 1); f.u = pickFighterTarget(f); }
    if (f.u && !f.u.alive) f.u = null;
    let tx, ty, tz;
    if (f.u) { tx = f.u.x; ty = (f.u.y || 0) + 1.5; tz = f.u.z; }
    else { tx = SHIP.wingTgt.x + f.ox; ty = SHIP.wingTgt.y + 2; tz = SHIP.wingTgt.z + f.oz; }
    want.set(tx - f.x, ty - f.y, tz - f.z);
    const dist = want.length();
    want.divideScalar(dist || 1);
    const dot = v.dot(want);
    if (f.pull > 0) { f.pull -= dt; want.set(v.x, 0.55, v.z); }
    else if (dist < 45 || (dist < 90 && dot < 0.2)) f.pull = rr(1, 1.6); // overshot: climb out and come round again
    else if (dot > 0.95 && dist < 240 && f.fireT <= 0) { f.fireT = rr(0.22, 0.38); fighterShot(f, v, tx, ty, tz); }
  } else {
    // home to the bay it came from
    const b = BAYS[f.bay];
    jointPos(MON.rig.body, sC, b[0], b[1] - 6, b[2]);
    want.set(sC.x - f.x, sC.y - f.y, sC.z - f.z);
    const d = want.length();
    want.divideScalar(d || 1);
    speed = d < 80 ? lerp(30, 95, d / 80) : 95; turn = 3;
    if (d < 10 || f.t > 60) return false;
  }
  // keep off the ground and out of the towers
  if (f.y < gy + 22) want.y = Math.max(want.y, 0.6);
  if (staticAt(f.x + v.x * 30, f.y + v.y * 30, f.z + v.z * 30) >= 0 || staticAt(f.x + v.x * 15, f.y + v.y * 15 - 4, f.z + v.z * 15) >= 0) { want.y = Math.max(want.y, 0.9); f.pull = Math.max(f.pull, 0.4); }
  want.normalize();
  const yaw0 = Math.atan2(v.x, v.z);
  v.lerp(want, Math.min(1, turn * dt)).normalize();
  f.bank = lerp(f.bank, clamp(-angWrap(Math.atan2(v.x, v.z) - yaw0) / Math.max(dt, 1e-3) * 0.35, -1.1, 1.1), Math.min(1, dt * 5));
  const sp = lerp(sp0, speed, Math.min(1, dt * 2));
  f.vx = v.x * sp; f.vy = v.y * sp; f.vz = v.z * sp;
  f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
  if (staticAt(f.x, f.y, f.z) >= 0 || f.y < gy + 1) { fighterDown(f); return false; }
  emit(glowPS, f.x - v.x * 3.8, f.y - v.y * 3.8, f.z - v.z * 3.8, 0, 0, 0, 2.2, -2, 0.12, 1, 0.7, 0.35, 0.9, 0, 0);
  return true;
}
function fighterShot(f, v, tx, ty, tz) {
  const sl = Math.hypot(v.x, v.z) || 1;
  for (const s of [-1, 1]) {
    sC.set(f.x + v.z / sl * s * 2.5 + v.x * 4, f.y + v.y * 4, f.z - v.x / sl * s * 2.5 + v.z * 4);
    sD.set(tx + frand(-3, 3) - sC.x, ty - sC.y, tz + frand(-3, 3) - sC.z).normalize();
    shipBolt(sC, sD, 260, false);
  }
  zapSound(sC, 0.4);
}
function fighterDown(f) {
  explosionFx(f.x, f.y, f.z, 1.1);
  boom(sC.set(f.x, f.y, f.z), 0.5);
  hitSphere(f.x, f.y, f.z, 5, 120, 0, 0.2, 0, 5, null);
}

// ---------- destroyer beam ----------
function startDestroyer() {
  SHIP.dest = { t: 0, x: MON.x, z: MON.z, fired: false, blown: false, list: null, li: 0, r: 0, ringT: 0, fxT: 0, boomT: 0 };
  aimDestroyer(1);
  say('DESTROYER BEAM', 1.8, 'sp');
  destroyerCharge();
  showHint('Shield down while the destroyer fires', 2.5);
}
// The target follows the crosshair, kept within reach of the dish.
function aimDestroyer(k) {
  const D = SHIP.dest;
  let dx = AIM.p.x - MON.x, dz = AIM.p.z - MON.z;
  const l = Math.hypot(dx, dz);
  if (l > 300) { dx *= 300 / l; dz *= 300 / l; }
  D.x += (MON.x + dx - D.x) * k; D.z += (MON.z + dz - D.z) * k;
}
function updateDestroyer(dt) {
  const D = SHIP.dest;
  D.t += dt;
  if (D.t < DT_FIRE - 0.6) aimDestroyer(1 - Math.exp(-dt * 4));
  const gy = Math.max(terrainH(D.x, D.z), WATER_Y);
  MON.rage = Math.max(0, 100 * (1 - D.t / DT_FIRE));
  const from = sA.set(MON.x, MON.y - 16, MON.z);
  if (D.t < DT_FIRE) {
    // charge: light gathers in the dish while a pilot beam reaches down to the target
    const c = D.t / DT_FIRE;
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * TAU, r = frand(30, 70);
      emit(glowPS, from.x + Math.cos(a) * r, from.y - frand(0, 10), from.z + Math.sin(a) * r, -Math.cos(a) * r * 1.6, 4, -Math.sin(a) * r * 1.6, 3 + c * 3, -2, 0.55, 0.7, 0.95, 1, 0.9, 0, 0);
    }
    D.ringT -= dt;
    if (D.ringT <= 0) { D.ringT = 0.45; ring(D.x, gy + 1, D.z, 34, 0.6, 0x9cff7a); }
    if (D.t > 1.2) setBeam(from, sB.set(D.x, gy, D.z).sub(from).multiplyScalar(ease(clamp((D.t - 1.2) / 1.4, 0, 1))).add(from), 0.18 + c * 0.15);
    else beam.visible = false;
  } else if (D.t < DT_BLAST) {
    // the beam: a column of light that bores down through whatever is under it
    if (!D.fired) { D.fired = true; boom(sC.set(D.x, gy, D.z), 1.4); skyFlash(0.3); }
    sB.set(D.x - from.x, gy - from.y, D.z - from.z);
    const L = sB.length();
    sB.divideScalar(L);
    const hit = raycastCity(from.x, from.y, from.z, sB.x, sB.y, sB.z, L + 5, 3);
    const to = hit ? sC.set(hit.x, hit.y, hit.z) : sC.set(D.x, gy, D.z);
    setBeam(from, to, 3.2 + Math.sin(D.t * 60) * 0.3);
    hitSphere(to.x, to.y, to.z, 16, 4000 * dt, 0, -0.4, 0, 6, null);
    beamUnits(from, to);
    for (let i = 0; i < 3; i++) fireAt(to.x + frand(-8, 8), to.y + frand(-4, 6), to.z + frand(-8, 8), 6);
    D.boomT -= dt;
    if (D.boomT <= 0) { D.boomT = 0.08; explosionFx(to.x, to.y, to.z, 2.4); }
    addShake(0.05, to);
    if (AC) { aSet(loops.beam.g.gain, 0.35, 0.05); aSet(loops.beamTone.g.gain, 0.16, 0.05); loops.beamTone.o.frequency.value = 38 + Math.sin(D.t * 9) * 4; }
  } else {
    if (!D.blown) detonate(D, gy);
    const fk = clamp((D.t - DT_BLAST) / 0.5, 0, 1);
    if (fk < 1) setBeam(from, sB.set(D.x, gy, D.z), 4.5 * (1 - fk) + 0.01); else beam.visible = false;
    updateFirestorm(D, dt, gy);
    if (D.t >= DT_END) endDestroyer();
  }
}
function detonate(D, gy) {
  D.blown = true;
  // every block the firestorm will reach, nearest first
  const L = [];
  for (let id = 0; id < BLK_.length; id++) {
    const B = BLK_[id];
    if (!B.alive) continue;
    const d = Math.hypot(B.x - D.x, B.z - D.z) - Math.max(B.hx, B.hz);
    if (d < STORM_R) L.push([Math.max(0, d), id]);
  }
  L.sort((a, b) => a[0] - b[0]);
  D.list = L; D.li = 0;
  skyFlash(1);
  for (let i = 0; i < 6; i++) explosionFx(D.x + frand(-20, 20), gy + frand(2, 40), D.z + frand(-20, 20), 4);
  sC.set(D.x, gy, D.z);
  boom(sC, 3); stompSound(sC, 1.6);
  addShake(1.6, sC);
  ring(D.x, gy + 1, D.z, 120, 1.2, 0xffe2b0);
  if (AC) { aSet(loops.beam.g.gain, 0, 0.3); aSet(loops.beamTone.g.gain, 0, 0.3); }
}
// A wall of fire rolls outward from the blast: the core is erased, the middle collapses, the edge burns.
function updateFirestorm(D, dt, gy) {
  const k = clamp((D.t - DT_BLAST) / 3.4, 0, 1), r = STORM_R * (1 - (1 - k) * (1 - k));
  D.r = r;
  const L = D.list;
  let n = 0;
  while (D.li < L.length && L[D.li][0] <= r && n < 500) {
    const dd = L[D.li][0], id = L[D.li][1];
    D.li++; n++;
    const B = BLK_[id];
    if (!B.alive) continue;
    const u = dd / STORM_R, ox = B.x - D.x, oz = B.z - D.z, ol = Math.hypot(ox, oz) || 1, out = (1 - u) * 18;
    if (u < 0.3) {
      if (Math.random() < 0.85) { removeStatic(id); if (n % 6 === 0) fireAt(B.x, B.y, B.z, Math.max(B.hx, B.hy) * 2); }
      else detachBlock(id, ox / ol * out, 6, oz / ol * out, false);
    } else if (u < 0.7) {
      // weakened low down, so some of what stands here comes down on its own
      const f = 1 - (u - 0.3) / 0.4, dmg = B.max * (0.3 + 0.9 * f) * (B.y < 30 ? 1.2 : 0.8);
      if (dmg >= B.hp && Math.random() < 0.6) removeStatic(id);
      else damageBlock(id, dmg, ox / ol * out, 4, oz / ol * out, false);
    } else damageBlock(id, B.max * 0.4 * (1 - (u - 0.7) / 0.3), 0, 0, 0, false);
    if (u > 0.4 && B.alive && Math.random() < 0.012 && EMIT.length < 60) addEmitter({ kind: 'fire', x: B.x, y: B.y + B.hy, z: B.z, life: rr(12, 25), block: id, size: Math.max(B.hx, B.hz) });
  }
  if (k >= 1) return;
  // the wall of fire itself
  const N = Math.min(isTouch ? 22 : 44, Math.ceil(r / 4)), fade = 1 - k * 0.6;
  for (let i = 0; i < N; i++) {
    const a = Math.random() * TAU, ra = r * frand(0.88, 1.02);
    const x = D.x + Math.cos(a) * ra, z = D.z + Math.sin(a) * ra, y = Math.max(terrainH(x, z), WATER_Y);
    emit(glowPS, x, y + frand(2, 70) * fade, z, Math.cos(a) * 25, frand(10, 30), Math.sin(a) * 25, frand(16, 30) * fade, 10, frand(0.7, 1.3), 1, 0.7, 0.3, 0.9, 1.2, -4, 0.85, 0.2, 0.04);
    if (i % 2 === 0) emit(smokePS, x, y + frand(20, 100) * fade, z, Math.cos(a) * 14, frand(10, 24), Math.sin(a) * 14, frand(24, 40), 14, frand(3, 5), 0.2, 0.17, 0.15, 0.75, 0.6, -1, 0.35, 0.32, 0.3);
  }
  // fireballs rolling up out of the front
  for (let i = 0; i < (isTouch ? 1 : 2); i++) {
    const a = Math.random() * TAU, x = D.x + Math.cos(a) * r, z = D.z + Math.sin(a) * r;
    explosionFx(x, Math.max(terrainH(x, z), WATER_Y) + frand(5, 50) * fade, z, 3 * fade + 1);
  }
  if (Math.random() < dt * 6) boom(sC.set(D.x + frand(-r, r), gy, D.z + frand(-r, r)), 0.8);
  D.fxT -= dt;
  if (D.fxT <= 0) {
    D.fxT = 0.15;
    agentsNear(D.x, D.z, r, (o) => {
      const dx = o.x - D.x, dz = o.z - D.z, dl = Math.hypot(dx, dz) || 1;
      if (o.vmax !== undefined) wreckCar(o, dx / dl * 25, 14, dz / dl * 25, false);
      else killPerson(o);
    });
    crushTrees(D.x, D.z, r, null);
    for (const u of UNITS) {
      if (!u.alive || Math.hypot(u.x - D.x, u.z - D.z) > r || (u.y || 0) > 160) continue;
      if (u.type === 'heli' || u.type === 'jet') downAir(u, 0, 0);
      else { const b = wreckUnit(u, false); if (b) b.v.set((u.x - D.x) / r * 20, 12, (u.z - D.z) / r * 20); }
    }
    ring(D.x, gy + 1, D.z, r, 0.5, 0xff9a40);
  }
}
function endDestroyer() {
  SHIP.dest = null;
  beam.visible = false;
  if (AC) { aSet(loops.beam.g.gain, 0, 0.2); aSet(loops.beamTone.g.gain, 0, 0.2); }
}

// ---------- arrival ----------
function shipIntroStart() {
  MON.x = 0; MON.z = 1500; MON.y = 1400; MON.yaw = 0;
  CAM.pos.set(50, 6, 120);
}
// It comes down out of a burning cloud over the bay while you watch from the street.
function shipIntro(dt, t) {
  const R = MON.rig, c = clamp(t / 8.5, 0, 1), k = 1 - Math.pow(1 - c, 3);
  const px = MON.x, pz = MON.z;
  MON.z = lerp(1500, SHIP_START, k); MON.y = lerp(1400, SHIP_ALT, k);
  SHIP.vx = (MON.x - px) / Math.max(dt, 1e-3); SHIP.vz = (MON.z - pz) / Math.max(dt, 1e-3);
  R.body.rotation.x = -0.1 * (1 - k);
  if (t < 7) {
    const n = Math.round((isTouch ? 3 : 6) * (1 - t / 7)) + 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = frand(60, 200);
      const x = MON.x + Math.sin(a) * r, y = MON.y + frand(-30, 25), z = MON.z + Math.cos(a) * r;
      emit(smokePS, x, y, z, SHIP.vx * 0.3 + Math.sin(a) * 10, frand(-4, 6), SHIP.vz * 0.3 + Math.cos(a) * 10, frand(50, 90), 20, frand(3, 4.5), 0.95, 0.55, 0.28, 0.85, 0.5, 0, 0.32, 0.27, 0.26);
      if (i % 2 === 0) emit(glowPS, x, MON.y - frand(10, 30), z, SHIP.vx * 0.2, 0, SHIP.vz * 0.2, frand(25, 45), 10, frand(0.6, 1.2), 1, 0.65, 0.3, 0.7, 0.5, 0, 0.9, 0.3, 0.05);
    }
  }
  if (t > 0.2 && !MON.rumbled) { MON.rumbled = true; arrivalRumble(); }
  if (t > 7.4 && !MON.roared) { MON.roared = true; doRoar(); }
  shipLooks(dt);
  placeRig();
  // street level looking up, then climb clear of the rim and swing round behind the ship
  const dist = shipCamPose(Math.PI, SHIP_PITCH, 1, sA, sB);
  const ky = smooth(7.6, 9.4, t), kz = smooth(9, 11.4, t);
  CAM.pos.set(lerp(50, sA.x, kz), lerp(6, sA.y, ky), lerp(120, sA.z, kz));
  sC.set(MON.x, MON.y - 10, MON.z).lerp(sB, kz);
  camera.position.copy(CAM.pos);
  applyShake(dt);
  camera.lookAt(sC);
  CAM.dist = dist;
  shipSun();
  if (AC) aSet(loops.ship.g.gain, 0.16 * k, 0.5);
  if (t > 11.5) endIntro();
}
function skipShipIntro() {
  MON.x = 0; MON.z = SHIP_START; MON.y = SHIP_ALT;
  SHIP.vx = SHIP.vz = 0;
  MON.rig.body.rotation.x = 0;
  placeRig();
}

// ---------- camera ----------
// The camera orbits a point just beyond the far rim, so the crosshair always looks past the hull.
function shipCamPose(yaw, pitch, distT, pos, tgt) {
  const cp = Math.cos(pitch), dist = 470 * distT;
  tgt.set(MON.x + Math.sin(yaw) * 165, MON.y + 45, MON.z + Math.cos(yaw) * 165);
  pos.set(tgt.x - Math.sin(yaw) * cp * dist, tgt.y + Math.sin(pitch) * dist, tgt.z - Math.cos(yaw) * cp * dist);
  return dist;
}
function shipCamera(dt) {
  CAM.yaw -= mouse.dx * 0.0024;
  CAM.pitch = clamp(CAM.pitch + mouse.dy * 0.002, 0.12, 1.1);
  mouse.dx = mouse.dy = 0;
  if (mouse.wheel) { CAM.distT = clamp(CAM.distT * (1 + mouse.wheel * 0.0012), 0.6, 1.8); mouse.wheel = 0; }
  CAM.dist = shipCamPose(CAM.yaw, CAM.pitch, CAM.distT, sA, sB);
  const D = SHIP.dest;
  if (D) {
    // while the beam fires, swing out to the side so the hull doesn't hide it
    const w = smooth(DT_FIRE - 0.3, DT_FIRE + 0.5, D.t) * (1 - smooth(DT_END - 1.4, DT_END, D.t));
    if (w > 0) {
      const mx = (MON.x + D.x) / 2, mz = (MON.z + D.z) / 2;
      let px = -(D.z - MON.z), pz = D.x - MON.x;
      const pl = Math.hypot(px, pz) || 1;
      px /= pl; pz /= pl;
      if (px * (CAM.pos.x - mx) + pz * (CAM.pos.z - mz) < 0) { px = -px; pz = -pz; }
      const gy = Math.max(terrainH(mx, mz), WATER_Y);
      sA.lerp(sC.set(mx + px * 420 + (MON.x - D.x) * 0.3, gy + 270, mz + pz * 420 + (MON.z - D.z) * 0.3), w);
      sB.lerp(sC.set(lerp(mx, D.x, 0.4), gy + 50, lerp(mz, D.z, 0.4)), w);
    }
  }
  sA.y = Math.max(sA.y, Math.max(terrainH(sA.x, sA.z), WATER_Y) + 20);
  if (!CAM.init) { CAM.pos.copy(sA); CAM.tgt.copy(sB); CAM.init = true; }
  CAM.pos.lerp(sA, 1 - Math.exp(-dt * 10));
  CAM.tgt.lerp(sB, 1 - Math.exp(-dt * 10));
  camera.position.copy(CAM.pos);
  camera.lookAt(CAM.tgt);
  camera.getWorldDirection(AIM.d);
  AIM.o.copy(camera.position);
  AIM.yaw = CAM.yaw;
  AIM.pitch = Math.asin(clamp(AIM.d.y, -1, 1));
  const t0 = CAM.pos.distanceTo(CAM.tgt);
  const ah = raycastCity(AIM.o.x + AIM.d.x * t0, AIM.o.y + AIM.d.y * t0, AIM.o.z + AIM.d.z * t0, AIM.d.x, AIM.d.y, AIM.d.z, 1100, 3);
  AIM.id = ah ? ah.id : -1;
  if (ah) AIM.p.set(ah.x, ah.y, ah.z); else AIM.p.copy(AIM.o).addScaledVector(AIM.d, t0 + 1100);
  applyShake(dt);
  shipSun();
}
// Centre the shadow map between the hull and the ground it shades.
function shipSun() {
  const h = MON.y - groundUnderShip(MON.x, MON.z);
  placeSun(MON.x - SUN_DIR.x / SUN_DIR.y * h * 0.5, MON.z - SUN_DIR.z / SUN_DIR.y * h * 0.5);
}

// ---------- going down ----------
function shipDies() {
  if (SHIP.dest) endDestroyer();
  SHIP.launchQ = 0;
  SHIP.crash = { t: 0, vy: 0, landed: false, tilt: Math.random() < 0.5 ? -1 : 1, boomT: 0 };
  for (const f of WING) f.st = 'fall';
  if (tractorFx) tractorFx.visible = false;
  if (AC) { aSet(loops.ship.g.gain, 0, 2); aSet(loops.tractor.g.gain, 0, 0.2); }
}
function updateShipDeath(dt) {
  const C = SHIP.crash, R = MON.rig;
  C.t += dt;
  R.shield.visible = false;
  R.glow.emissiveIntensity = C.t < 1.5 ? (Math.random() < 0.4 ? 0.1 : 1.4) : Math.max(0, 0.6 - (C.t - 1.5) * 0.3);
  SHIP.flash = Math.max(0, SHIP.flash - dt * 1.4);
  skyMat.uniforms.uFlash.value = SHIP.flash * 0.5;
  hemi.intensity = 0.72 + SHIP.flash * 1.4;
  C.boomT -= dt;
  if (C.boomT <= 0) {
    C.boomT = C.landed ? rr(0.6, 1.4) : rr(0.12, 0.3);
    const a = Math.random() * TAU, r = frand(40, 148);
    jointPos(R.body, sA, Math.sin(a) * r, frand(-10, 15), Math.cos(a) * r);
    explosionFx(sA.x, sA.y, sA.z, C.landed ? 2 : 3.5);
    boom(sA, C.landed ? 0.6 : 1.1);
  }
  if (!C.landed && C.t > 0.8) {
    C.vy -= 30 * dt;
    MON.y += C.vy * dt;
    MON.x += SHIP.vx * dt; MON.z += SHIP.vz * dt;
    const tk = Math.min(1, (C.t - 0.8) / 2.5);
    R.body.rotation.z = C.tilt * 0.16 * tk; R.body.rotation.x = 0.05 * tk;
    if (Math.random() < 0.6) { const a = Math.random() * TAU; smokePuff(MON.x + Math.sin(a) * 140, MON.y + 4, MON.z + Math.cos(a) * 140, 22, 0.2); }
    // the hull crushes whatever it sinks onto
    const y = MON.y - 16;
    for (let gx = -2; gx <= 2; gx++) for (let gz = -2; gz <= 2; gz++) {
      if (gx * gx + gz * gz > 6) continue;
      blocksInSphere(MON.x + gx * 55, y, MON.z + gz * 55, 34, (id) => { if (Math.random() < 0.75) removeStatic(id); else detachBlock(id, frand(-6, 6), -8, frand(-6, 6)); });
    }
    const gy = Math.max(terrainH(MON.x, MON.z), WATER_Y);
    if (MON.y - 12 <= gy) {
      C.landed = true; MON.landed = true; MON.y = gy + 10;
      shockwave(MON.x, MON.z, 150, 420, 45);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; groundImpact(MON.x + Math.sin(a) * 120, MON.z + Math.cos(a) * 120, 22, 400, 20, 0.6); }
      for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, r = frand(20, 150); explosionFx(MON.x + Math.sin(a) * r, gy + frand(5, 30), MON.z + Math.cos(a) * r, 4); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; addEmitter({ kind: 'fire', x: MON.x + Math.sin(a) * 100, y: gy + 14, z: MON.z + Math.cos(a) * 100, life: 60, size: 12 }); }
      sA.set(MON.x, gy, MON.z);
      boom(sA, 3);
      skyFlash(0.6); addShake(1.6, sA);
    }
  }
  placeRig();
}
