// Copter City — low-poly models built from boxes: helicopters, people, cars, a cargo ship, the tornado funnel.
// Helicopters face -z with the skids' bottom at y = 0.

function part(g, color, x, y, z, sx, sy, sz, o = {}) { return mesh(g, mat(color, Object.assign({ flat: true }, o)), x, y, z, sx, sy, sz); }

// the shape of each model: fuselage, cabin glass, boom, rotor size, skids or wheels
const HELI_SHAPES = {
  light: { body: [2.0, 1.8, 3.4], nose: 1.3, boom: 4.2, rotor: 4.6, tail: 0.9, skid: 1.0, finH: 1.0 },
  police: { body: [2.2, 1.9, 4.0], nose: 1.4, boom: 4.8, rotor: 5.2, tail: 1.0, skid: 1.0, finH: 1.2 },
  medevac: { body: [2.4, 2.1, 4.6], nose: 1.4, boom: 5.0, rotor: 5.6, tail: 1.0, skid: 1.0, finH: 1.3 },
  medium: { body: [2.6, 2.3, 5.2], nose: 1.5, boom: 5.4, rotor: 6.2, tail: 1.1, skid: 1.1, finH: 1.5 },
  tandem: { body: [3.0, 2.8, 11], nose: 1.4, boom: 0, rotor: 7.0, tail: 0, skid: 0, finH: 0, tandem: true },
  raptor: { body: [1.8, 1.7, 5.0], nose: 1.8, boom: 5.2, rotor: 5.6, tail: 1.0, skid: 0.8, finH: 1.6, wings: true },
};
function buildHeli(type) {
  const H = HELIS[type], S = HELI_SHAPES[H.model], [c1, c2, c3] = H.colors;
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const [bw, bh, bl] = S.body, base = S.skid + 0.35;
  const out = { group: g, body, rotors: [], discs: [], tail: null, eye: new V3(0, base + bh * 0.62, -bl * 0.25), r: Math.max(S.rotor * 0.75, bl * 0.55), skid: base, bodyH: bh };
  // fuselage
  body.add(part(GM.box(), c1, 0, base + bh / 2, 0, bw, bh, bl));
  body.add(part(GM.box(), c2, 0, base + bh * 0.15, 0, bw + 0.05, bh * 0.3, bl + 0.05)); // belly stripe
  // nose and glass
  const glass = mat(0x6a9ac0, { flat: true, e: 0x0a1420 });
  body.add(part(GM.box(), c1, 0, base + bh * 0.4, -bl / 2 - S.nose / 2, bw * 0.9, bh * 0.8, S.nose));
  body.add(mesh(GM.box(), glass, 0, base + bh * 0.62, -bl / 2 - S.nose * 0.35, bw * 0.86, bh * 0.5, S.nose * 0.9));
  body.add(mesh(GM.box(), glass, 0, base + bh * 0.62, -bl * 0.18, bw + 0.04, bh * 0.4, bl * 0.4));
  // the engine hump and mast
  body.add(part(GM.box(), c3, 0, base + bh + 0.25, S.tandem ? 0 : bl * 0.05, bw * 0.6, 0.5, bl * (S.tandem ? 0.9 : 0.5)));
  const mkRotor = (z, y, rad, blades) => {
    const hub = new THREE.Group(); hub.position.set(0, y, z);
    for (let i = 0; i < blades; i++) { const bl1 = part(GM.box(), 0x202022, 0, 0, 0, 0.35, 0.06, rad * 2); bl1.rotation.y = (i / blades) * Math.PI; hub.add(bl1); }
    hub.add(part(GM.cyl(), 0x404044, 0, 0, 0, 0.5, 0.4, 0.5));
    const disc = mesh(GM.disc(), mat(0xffffff, { basic: true, t: true, o: 0.6, map: TEX.rotor, dw: false, ds: true }), 0, y + 0.05, z, rad * 2, 1, rad * 2);
    disc.visible = false;
    g.add(hub); g.add(disc); out.rotors.push(hub); out.discs.push(disc);
    body.add(part(GM.cyl(), 0x404044, 0, y - 0.35, z, 0.25, 0.7, 0.25));
  };
  if (S.tandem) {
    // twin rotors on pylons, the rear one higher
    body.add(part(GM.box(), c1, 0, base + bh + 0.7, bl / 2 - 1.2, bw * 0.7, 1.4, 2.4));
    mkRotor(-bl / 2 + 1.2, base + bh + 0.9, S.rotor, 3);
    mkRotor(bl / 2 - 1.2, base + bh + 1.8, S.rotor, 3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) body.add(part(GM.cyl(), 0x202020, sx * bw * 0.45, 0.4, sz * bl * 0.35, 0.8, 0.8, 0.8));
    body.add(part(GM.box(), c2, 0, base + 0.4, bl / 2 + 0.3, bw * 0.8, 0.3, 1.2)); // ramp
    out.eye.set(0, base + bh * 0.62, -bl / 2 - 0.6);
    out.r = bl * 0.55;
  } else {
    mkRotor(S.tandem ? 0 : bl * 0.05, base + bh + 0.8, S.rotor, H.model === 'medium' || H.model === 'medevac' ? 4 : 2);
    // tail boom, fin and tail rotor
    const bz = bl / 2 + S.boom / 2;
    body.add(part(GM.box(), c1, 0, base + bh * 0.68, bz, 0.5, 0.55, S.boom));
    body.add(part(GM.box(), c3, 0, base + bh * 0.68 + S.finH / 2, bl / 2 + S.boom - 0.3, 0.15, S.finH, 0.9));
    body.add(part(GM.box(), c2, 0, base + bh * 0.68, bl / 2 + S.boom - 0.9, 1.6, 0.1, 0.5));
    const tr = new THREE.Group(); tr.position.set(0.28, base + bh * 0.68 + S.finH * 0.4, bl / 2 + S.boom - 0.3);
    for (let i = 0; i < 2; i++) { const b1 = part(GM.box(), 0x202022, 0, 0, 0, 0.06, S.tail * 2, 0.18); b1.rotation.x = i * Math.PI / 2; tr.add(b1); }
    body.add(tr); out.tail = tr;
    // skids
    for (const sx of [-1, 1]) {
      body.add(part(GM.box(), 0x2a2a2c, sx * (bw / 2 + 0.1), 0.08, 0, 0.14, 0.14, bl * 0.95));
      for (const sz of [-0.3, 0.3]) body.add(part(GM.box(), 0x2a2a2c, sx * (bw / 2), base * 0.5, sz * bl, 0.1, base, 0.1));
    }
    if (S.wings) for (const sx of [-1, 1]) { body.add(part(GM.box(), c2, sx * (bw / 2 + 0.9), base + bh * 0.45, 0.2, 1.8, 0.15, 1)); body.add(part(GM.cyl(), c3, sx * (bw / 2 + 1.6), base + bh * 0.3, 0.2, 0.35, 1.2, 0.35)); }
  }
  // role markings
  if (H.model === 'medevac') { for (const sx of [-1, 1]) { body.add(part(GM.box(), 0xd42828, sx * (bw / 2 + 0.02), base + bh * 0.55, 0.5, 0.05, 0.9, 0.3)); body.add(part(GM.box(), 0xd42828, sx * (bw / 2 + 0.02), base + bh * 0.55, 0.5, 0.05, 0.3, 0.9)); } }
  if (H.model === 'police') for (const sx of [-1, 1]) body.add(part(GM.box(), 0xf0f0f0, sx * (bw / 2 + 0.02), base + bh * 0.5, 0.3, 0.05, 0.35, bl * 0.8));
  // beacon lights
  out.beacons = [];
  const bc = mesh(GM.box(), mat(0xff2020, { basic: true }), 0, base - 0.05, 0, 0.3, 0.15, 0.3); body.add(bc); out.beacons.push(bc);
  if (H.siren) for (const sx of [-1, 1]) { const b = mesh(GM.box(), mat(sx < 0 ? 0xff2020 : 0x2060ff, { basic: true }), sx * 0.6, base + bh + 0.05, -bl * 0.3, 0.4, 0.15, 0.25); body.add(b); out.beacons.push(b); }
  // anchors for the gear that hangs off it
  out.hook = new V3(0, base, 0);
  out.spotAt = new V3(0, base + 0.1, -bl / 2 - S.nose * 0.5);
  out.hull = heliHull(S, base);
  g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return out;
}

// The collision shape in model space: spheres along the cabin, the tail boom and fin, the skids, and a ring of
// small spheres around each rotor disc (rotor: true). Fed to collideHeli every step.
function heliHull(S, base) {
  const [bw, bh, bl] = S.body, hull = [];
  const sph = (x, y, z, r, rotor = false) => hull.push({ p: new V3(x, y, z), r, rotor });
  const rb = Math.max(bw, bh) * 0.55, yc = base + bh * 0.5;
  const z0 = -bl / 2 - S.nose * 0.6, z1 = bl / 2 - rb * 0.5, n = Math.max(2, Math.ceil((z1 - z0) / (rb * 1.1)));
  for (let i = 0; i <= n; i++) sph(0, yc, lerp(z0, z1, i / n), rb);
  if (!S.tandem) {
    const yb = base + bh * 0.68;
    for (let z = bl / 2 + 0.8; z < bl / 2 + S.boom; z += 1.1) sph(0, yb, z, 0.6);
    sph(0, yb + S.finH * 0.5, bl / 2 + S.boom - 0.3, Math.max(0.7, S.finH * 0.6));
  }
  for (const sz of [-0.35, 0.35]) sph(0, 0.4, sz * bl, Math.min(0.9, bw * 0.4));
  const rotors = S.tandem ? [[-bl / 2 + 1.2, base + bh + 0.9], [bl / 2 - 1.2, base + bh + 1.8]] : [[bl * 0.05, base + bh + 0.8]];
  for (const [rz, ry] of rotors) {
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; sph(Math.cos(a) * S.rotor * 0.93, ry, rz + Math.sin(a) * S.rotor * 0.93, 0.5, true); }
    for (let i = 0; i < 7; i++) { const a = (i + 0.5) / 7 * TAU; sph(Math.cos(a) * S.rotor * 0.55, ry, rz + Math.sin(a) * S.rotor * 0.55, 0.5, true); }
  }
  return hull;
}

// ---------- people ----------
const SKIN = [0xf0c8a0, 0xd8a878, 0xa87450, 0x7a5030, 0xf8d8c0];
const CLOTHES = [0x3a5a9a, 0xc83a2a, 0x3a8a4a, 0xe8c040, 0x6a3a8a, 0x2a2a2a, 0xe0e0e0, 0x8a5a3a, 0xd87aa0, 0x4ab0c0];
function buildPerson(o = {}) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const shirt = o.shirt !== undefined ? o.shirt : pick(CLOTHES), pants = o.pants !== undefined ? o.pants : pick([0x2a3a5a, 0x3a3a3a, 0x5a4a3a, 0x2a2a2a]), skin = o.skin !== undefined ? o.skin : pick(SKIN);
  const P = { group: g, legs: [], arms: [], pose: 'stand', t: Math.random() * 10 };
  for (const sx of [-1, 1]) { const l = new THREE.Group(); l.position.set(sx * 0.14, 0.85, 0); l.add(part(GM.box(), pants, 0, -0.42, 0, 0.2, 0.85, 0.22)); g.add(l); P.legs.push(l); }
  const torso = part(GM.box(), shirt, 0, 1.18, 0, 0.5, 0.66, 0.28); g.add(torso); P.torso = torso;
  for (const sx of [-1, 1]) { const a = new THREE.Group(); a.position.set(sx * 0.33, 1.46, 0); a.add(part(GM.box(), shirt, 0, -0.3, 0, 0.14, 0.62, 0.16)); a.add(part(GM.box(), skin, 0, -0.66, 0, 0.12, 0.12, 0.12)); g.add(a); P.arms.push(a); }
  const head = part(GM.box(), skin, 0, 1.68, 0, 0.3, 0.32, 0.3); g.add(head); P.head = head;
  if (o.hat !== undefined) g.add(part(GM.box(), o.hat, 0, 1.88, -0.02, 0.36, 0.1, 0.4));
  else g.add(part(GM.box(), pick([0x2a1a10, 0x5a3a20, 0xd8b060, 0x1a1a1a, 0x8a8a8a]), 0, 1.84, 0.02, 0.32, 0.08, 0.32));
  g.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
  return P;
}
// pose: 'stand' | 'walk' | 'run' | 'wave' | 'lie' | 'sit' | 'climb' | 'riot' | 'cower'
function posePerson(P, dt) {
  P.t += dt;
  const t = P.t, g = P.group;
  let la = 0, ra = 0, ll = 0, rl = 0, lift = 0, lie = 0;
  if (P.pose === 'walk' || P.pose === 'run') { const s = P.pose === 'run' ? 11 : 7, a = P.pose === 'run' ? 0.9 : 0.5; ll = Math.sin(t * s) * a; rl = -ll; la = -ll * 0.8; ra = ll * 0.8; }
  else if (P.pose === 'wave') { ra = Math.PI - 0.3 + Math.sin(t * 9) * 0.4; la = Math.PI - 0.3 + Math.sin(t * 9 + 1.5) * 0.4; lift = Math.abs(Math.sin(t * 4.5)) * 0.08; }
  else if (P.pose === 'riot') { ra = Math.PI * 0.8 + Math.sin(t * 7) * 0.6; la = Math.sin(t * 5) * 0.4; lift = Math.abs(Math.sin(t * 6)) * 0.12; }
  else if (P.pose === 'climb') { ra = Math.PI * 0.9 + Math.sin(t * 8) * 0.3; la = Math.PI * 0.9 - Math.sin(t * 8) * 0.3; ll = Math.sin(t * 8) * 0.4; rl = -ll; }
  else if (P.pose === 'cower') { ra = la = 2.2; ll = rl = -0.5; lift = -0.3; }
  else if (P.pose === 'sit') { ll = rl = -1.5; lift = -0.42; }
  else if (P.pose === 'lie') lie = 1;
  P.legs[0].rotation.x = ll; P.legs[1].rotation.x = rl; P.arms[0].rotation.x = la; P.arms[1].rotation.x = ra;
  P.arms[0].rotation.z = P.pose === 'wave' ? -0.3 : 0; P.arms[1].rotation.z = P.pose === 'wave' ? 0.3 : 0;
  g.rotation.x = lie ? -Math.PI / 2 : 0;
  P.lift = lie ? 0.16 : lift;
}
// place a person at a spot, facing yaw, with the pose's lift
function placePerson(P, x, y, z, yaw) { P.group.position.set(x, y + (P.lift || 0), z); P.group.rotation.y = yaw; }

// ---------- cars ----------
const CAR_COLS = [0xc83a2a, 0x2a5ac8, 0xe8e8e8, 0x2a2a2a, 0xe8c040, 0x3a8a4a, 0x8a8a8a, 0x6a2a6a, 0xd87a30, 0x5a7a9a];
function buildCar(kind = 'car', color) {
  const g = new THREE.Group();
  const c = color !== undefined ? color : pick(CAR_COLS);
  const out = { group: g, kind, lights: [] };
  if (kind === 'truck' || kind === 'tanker' || kind === 'firetruck') {
    const cab = kind === 'firetruck' ? 0xc82820 : c;
    g.add(part(GM.boxB(), cab, 0, 0.5, -3, 2.3, 2.2, 2));
    g.add(part(GM.box(), 0x6a9ac0, 0, 2.0, -4.0, 2.1, 0.7, 0.05));
    if (kind === 'tanker') { const t = part(GM.cyl(), 0xd8d8d0, 0, 1.8, 1.4, 2.2, 6.4, 2.2); t.rotation.x = Math.PI / 2; g.add(t); g.add(part(GM.box(), 0xff8a20, 0, 2.2, 1.4, 0.1, 0.8, 1.6)); }
    else if (kind === 'firetruck') { g.add(part(GM.boxB(), 0xc82820, 0, 0.5, 1.2, 2.3, 2.0, 6)); g.add(part(GM.box(), 0xd8d8d8, 0, 2.7, 1.2, 0.5, 0.3, 6)); }
    else g.add(part(GM.boxB(), 0xe0e0e0, 0, 0.5, 1.2, 2.4, 2.8, 6));
    for (const sz of [-3, 0, 3]) for (const sx of [-1, 1]) g.add(part(GM.cyl(), 0x1a1a1a, sx * 1.1, 0.5, sz, 0.9, 0.35, 0.9).rotateZ(Math.PI / 2));
    out.len = 9;
  } else {
    const police = kind === 'police', amb = kind === 'ambulance';
    const body = police ? 0xf0f0f0 : amb ? 0xf4f4f0 : c;
    g.add(part(GM.boxB(), body, 0, 0.3, 0, 1.8, 0.75, 4.2));
    if (amb) g.add(part(GM.boxB(), body, 0, 1.05, 0.7, 1.9, 1.3, 2.8));
    else g.add(part(GM.boxB(), police ? 0x1e2c5a : lerpHex(body, 0x000000, 0.15), 0, 1.05, 0.2, 1.6, 0.6, 2.2));
    g.add(part(GM.box(), 0x3a5a78, 0, 1.3, -0.92, 1.5, 0.45, 0.05));
    for (const sz of [-1.35, 1.35]) for (const sx of [-1, 1]) { const w = part(GM.cyl(), 0x1a1a1a, sx * 0.86, 0.33, sz, 0.66, 0.22, 0.66); w.rotation.z = Math.PI / 2; g.add(w); }
    if (police || amb) for (const sx of [-1, 1]) { const l = mesh(GM.box(), mat(sx < 0 ? 0xff2020 : (police ? 0x2060ff : 0xff2020), { basic: true }), sx * 0.4, amb ? 2.4 : 1.7, amb ? -0.6 : 0.2, 0.5, 0.15, 0.3); g.add(l); out.lights.push(l); }
    if (amb) { g.add(part(GM.box(), 0xd42828, 0.96, 1.6, 0.7, 0.03, 0.3, 1)); g.add(part(GM.box(), 0xd42828, -0.96, 1.6, 0.7, 0.03, 0.3, 1)); }
    out.len = 4.4;
  }
  g.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
  return out;
}
function wreckCar(car) { car.group.traverse((m) => { if (m.isMesh && m.material.color) m.material = mat(lerpHex(m.material.color.getHex(), 0x1a1a1a, 0.7), { flat: true }); }); car.group.rotation.z = 0.2; }

// ---------- a small cargo ship ----------
function buildShip() {
  const g = new THREE.Group();
  g.add(part(GM.box(), 0x8a2a20, 0, 0.2, 0, 6, 2.4, 24));
  g.add(part(GM.box(), 0x2a2a30, 0, 1.6, 0, 6.2, 0.6, 24.2));
  g.add(part(GM.box(), 0xe8e8e0, 0, 3.2, 8, 5, 3.2, 5));
  g.add(part(GM.box(), 0x3a5a78, 0, 4.2, 5.45, 4.6, 0.8, 0.1));
  g.add(part(GM.cyl(), 0xd8a020, 0, 6, 9.5, 1.4, 3, 1.4));
  for (let i = 0; i < 6; i++) g.add(part(GM.box(), pick([0xc83a2a, 0x2a6ac8, 0x3a9a4a, 0xe8a020]), (i % 2 ? 1.3 : -1.3), 2.6, -8 + Math.floor(i / 2) * 4.5, 2.4, 2.4, 4));
  g.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
  return g;
}

// ---------- the tornado funnel ----------
function buildTwister() {
  const g = new THREE.Group(), rings = [];
  const m = new THREE.MeshBasicMaterial({ color: 0x8a8a90, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const r0 = 3 + i * i * 0.55, r1 = 3 + (i + 1) * (i + 1) * 0.55;
    const cg = new THREE.CylinderGeometry(r1, r0, 12, 10, 1, true);
    const c = new THREE.Mesh(cg, m); c.position.y = i * 12 + 6; g.add(c); rings.push(c);
  }
  g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return { group: g, rings };
}
