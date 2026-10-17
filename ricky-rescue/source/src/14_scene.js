// Ricky Rescue — the scene of a call: the patient and bystanders, wrecked cars, police and the fire engine, and the
// building interiors (a room built far west of the city, entered through the place's front door).

const SCENE = { objs: [], people: [], blockers: [], int: null, cops: [], fire: [], wreck: null };
const INT_X = -5000, INT_Z = 0; // interiors live here, out of sight of the city

function clearScene() {
  for (const o of SCENE.objs) R.scene.remove(o);
  for (const s of SCENE.solids || []) { const i = CITY.solids.indexOf(s); if (i >= 0) CITY.solids.splice(i, 1); for (const l of CITY.grid.values()) { const k = l.indexOf(s); if (k >= 0) l.splice(k, 1); } }
  Object.assign(SCENE, { objs: [], people: [], blockers: [], int: null, cops: [], fire: [], wreck: null, solids: [], bys: null });
  CITY.interior = null;
}
function sceneAdd(o) { R.scene.add(o); SCENE.objs.push(o); return o; }
function sceneSolid(x0, z0, x1, z1, h) { const s = addSolid(x0, z0, x1, z1, h, 'scene'); SCENE.solids.push(s); return s; }
// a person placed in the world: { m (rig), x, z, yaw, pose, role, inside }
function scenePerson(look, x, z, yaw, pose, role, o = {}) {
  const m = makePerson(look);
  m.root.position.set(x, o.y !== undefined ? o.y : groundY(x, z), z); m.root.rotation.y = yaw;
  snapPose(m, pose);
  sceneAdd(m.root);
  const p = Object.assign({ m, x, z, yaw, pose, role }, o);
  SCENE.people.push(p);
  return p;
}
const FIREFIGHTER = { shirt: 0xc8a050, pants: 0xb89040, shoes: 0x1a1a1a, hat: 0xd8a020, style: 'cap', vest: 0xd8c040 };
const COP = { shirt: 0x1c2848, pants: 0x1c2234, shoes: 0x111111, hat: 0x1c2848, style: 'cap' };

function buildScene(C, r) {
  clearScene();
  const p = C.place, P = C.P;
  const indoor = !p.outdoor;
  C.indoor = indoor;
  // the patient's spot
  let px = p.x, pz = p.z, pyaw = p.yaw + Math.PI;
  if (C.mvc) {
    // a wreck in the lane and the patient on the road beside it, toward the curb
    const e = p.edge, dir = p.dir;
    const w1 = edgePos(e, dir, CP / 2, laneOff(e.lanes - 1));
    const car1 = buildCar(r.pick(['sedan', 'hatch', 'suv']), r.pick(CAR_COLORS), { wreck: true });
    car1.position.set(w1.x, 0, w1.z); car1.rotation.y = w1.yaw + r.range(-0.5, 0.5); sceneAdd(car1);
    const w2 = edgePos(e, dir, CP / 2 + 6.5, laneOff(0) - 1.2);
    const car2 = buildCar(r.pick(['sedan', 'pickup', 'van', 'suv']), r.pick(CAR_COLORS), { wreck: true });
    car2.position.set(w2.x, 0, w2.z); car2.rotation.y = w2.yaw + Math.PI / 2 + r.range(-0.4, 0.4); sceneAdd(car2);
    for (const w of [w1, w2]) { sceneSolid(w.x - 2, w.z - 2, w.x + 2, w.z + 2, 1.5); SCENE.blockers.push({ x: w.x, z: w.z, len: 5 }); }
    const side = edgePos(e, dir, CP / 2 - 3.5, parkOff(e.line) - 0.6);
    px = side.x; pz = side.z; pyaw = side.yaw + Math.PI / 2;
    // glass and fluid on the road
    const d = mesh(GM.disc(), mat(0x1a1a1c, { t: true, o: 0.6 }), w1.x + 1, 0.02, w1.z, 4, 1, 3); sceneAdd(d);
    SCENE.wreck = { x: w1.x, z: w1.z };
  } else if (indoor) {
    buildInterior(C, r);
  }
  // the patient
  const look = P.look; look.uniform = false;
  if (!indoor) {
    const pp = scenePerson(look, px, pz, pyaw, P.pose, 'patient', { P });
    P.model = pp.m; P.where = { scene: 'city', x: px, z: pz, yaw: pyaw }; P.person = pp;
  }
  // a bystander: waving at the door for indoor calls, beside the patient outside
  if (C.bystander) {
    const L = civilianLook(r);
    if (indoor) {
      const b = scenePerson(L, p.x + p.nx * 1.2 + p.nz * 1.5, p.z + p.nz * 1.2 - p.nx * 1.5, p.yaw, 'wave', 'bystander', { inside: false });
      SCENE.bys = b;
      const bi = SCENE.int && SCENE.int.bysSpot;
      if (bi) b.inSpot = bi;
    } else {
      const b = scenePerson(L, px + 2.2, pz + 1.4, 0, C.bystCPR && P.arrest ? 'cpr' : 'arms', 'bystander');
      b.m.root.rotation.y = Math.atan2(px - b.x, pz - b.z);
      if (C.bystCPR && P.arrest) { b.m.root.position.set(px + 0.7, groundY(px, pz), pz); b.x = px + 0.7; b.z = pz; b.m.root.rotation.y = -Math.PI / 2; }
      SCENE.bys = b;
    }
  }
  // a patient indoors with CPR going: the bystander is doing it in the room
  if (indoor && C.bystCPR && P.arrest && SCENE.int) {
    const I = SCENE.int, b = scenePerson(civilianLook(r), I.pat.x + 0.7, I.pat.z, -Math.PI / 2, 'cpr', 'cprBystander', { y: 0 });
    SCENE.bysCPR = b;
  }
}

// ---------- first responders ----------
function sceneSideSpot(C, back = 14) {
  const p = C.place;
  if (p.kind === 'road') { const q = edgePos(p.edge, p.dir, CP / 2 - back - 8, parkOff(p.edge.line)); return q; }
  const c = p.curb, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  return { x: c.x - fx * back, z: c.z - fz * back, yaw: c.yaw };
}
function spawnPolice(C) {
  const s = C.place.kind === 'road' ? sceneSideSpot(C, 4) : (() => { const c = C.place.curb, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); return { x: c.x + fx * 12, z: c.z + fz * 12, yaw: c.yaw }; })();
  const car = buildCar('sedan', 0x111418, { police: true }); car.position.set(s.x, 0, s.z); car.rotation.y = s.yaw; sceneAdd(car);
  sceneSolid(s.x - 2.3, s.z - 2.3, s.x + 2.3, s.z + 2.3, 1.5); SCENE.blockers.push({ x: s.x, z: s.z, len: 4.6 });
  SCENE.cops.push(car);
  const p = C.place;
  const ox = p.x + (p.nx || 0) * 2.5 + 1.5, oz = p.z + (p.nz || 0) * 2.5;
  const o = scenePerson(COP, ox, oz, p.yaw || 0, 'arms', 'cop'); SCENE.cop = o;
}
function spawnFireEngine(C) {
  const s = sceneSideSpot(C, 16);
  const fe = buildFireEngine(); fe.position.set(s.x, 0, s.z); fe.rotation.y = s.yaw; sceneAdd(fe);
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  sceneSolid(Math.min(s.x - fx * 5, s.x + fx * 5) - 1.4, Math.min(s.z - fz * 5, s.z + fz * 5) - 1.4, Math.max(s.x - fx * 5, s.x + fx * 5) + 1.4, Math.max(s.z - fz * 5, s.z + fz * 5) + 1.4, 3);
  SCENE.blockers.push({ x: s.x, z: s.z, len: 10 });
  SCENE.fire.push(fe);
  // two firefighters go to the patient; in an arrest one takes over compressions
  const P = C.P;
  const W = P.where || {};
  if (W.scene === 'interior' && SCENE.int) {
    const I = SCENE.int;
    const f1 = scenePerson(FIREFIGHTER, I.pat.x - 0.7, I.pat.z + 0.6, Math.PI / 2, P.arrest ? 'cpr' : 'arms', 'ff', { y: 0 });
    const f2 = scenePerson(FIREFIGHTER, I.pat.x + 1.6, I.pat.z + 1.4, -2.4, 'arms', 'ff', { y: 0 });
    SCENE.ffs = [f1, f2];
  } else {
    const bx = W.x !== undefined ? W.x : C.place.x, bz = W.z !== undefined ? W.z : C.place.z;
    const f1 = scenePerson(FIREFIGHTER, bx - 0.75, bz + 0.3, Math.PI / 2, P.arrest ? 'cpr' : 'arms', 'ff');
    const f2 = scenePerson(FIREFIGHTER, bx + 2.0, bz - 1.5, -2.2, 'arms', 'ff');
    SCENE.ffs = [f1, f2];
    if (C.mvc && SCENE.wreck) for (let k = 0; k < 4; k++) { const c = buildCone(); c.position.set(SCENE.wreck.x + Math.sin(s.yaw) * (-8 - k * 3), 0, SCENE.wreck.z + Math.cos(s.yaw) * (-8 - k * 3)); sceneAdd(c); }
  }
  // the bystander stops CPR when the firefighters take over
  if (SCENE.bys && SCENE.bys.pose === 'cpr') setPose(SCENE.bys, 'arms', 1.2);
  if (SCENE.bysCPR) setPose(SCENE.bysCPR, 'arms', 1.4);
  C.bystCPR = false;
}
function setPose(p, pose, back = 0) {
  p.pose = pose;
  if (back) { const a = p.m.root.rotation.y; p.x -= Math.sin(a) * back; p.z -= Math.cos(a) * back; p.m.root.position.x = p.x; p.m.root.position.z = p.z; }
}
function updateScenePeople(dt) {
  const C = G.call;
  const ffCPR = C && C.fireOn && C.P.arrest && !workerOn('cpr', 'ricky') && !workerOn('cpr', 'partner');
  if (SCENE.ffs) SCENE.ffs[0].pose = ffCPR ? 'cpr' : 'arms';
  for (const p of SCENE.people) {
    if (p.role === 'patient' && p.P) p.pose = patientPose(p.P);
    if (p.role === 'cop' && C) p.pose = C.pdCleared ? 'wave' : 'arms';
    if (p.role === 'bystander' && p.inside === false && C && C.stage !== 'enroute' && C.stage !== 'pending' && dist(PLAYER.x, PLAYER.z, p.x, p.z) < 6) p.pose = 'arms';
    posePerson(p.m, p.pose, dt);
  }
  if (C) for (const P of C.patients) if (P.model && P.carried) posePerson(P.model, patientPose(P), dt);
}
// how the patient lies or sits right now
function patientPose(P) {
  if (P.carried === 'chair') return 'sit';
  if (P.carried === 'stretcher') return P.position === 'fowler' || P.position === 'sitting' ? 'lie' : 'lie';
  if (P.carried) return 'lie';
  if (P.arrest || P.avpu === 'U' || P.avpu === 'P') return P.position === 'recovery' ? 'recovery' : P.v.seizing ? 'lieSeize' : 'lie';
  if (P.v.seizing) return 'lieSeize';
  if (P.position === 'recovery') return 'recovery';
  if (P.conds.labor && !P.conds.labor.born) return 'lieKnee';
  return P.pose;
}

// ---------- interiors ----------
// One room per call. Walls are single-sided facing in, so the camera sees in from outside (doll-house view).
function buildInterior(C, r) {
  const k = C.place.kind;
  const dims = { house: [9, 7], apt: [8, 6.5], office: [11, 8], shop: [12, 9], ware: [16, 12] }[k] || [9, 7];
  const W = dims[0], D = dims[1], H = 2.8;
  const g = new THREE.Group(); g.position.set(INT_X, 0, INT_Z); sceneAdd(g);
  const floorTex = k === 'ware' ? TEX.asphalt : k === 'office' || k === 'shop' ? TEX.floorTile : r.chance(0.5) ? TEX.floorWood : TEX.carpet;
  const fl = mesh(GM.plane(), new THREE.MeshLambertMaterial({ map: floorTex }), 0, 0, 0, W, 1, D); fl.receiveShadow = true; g.add(fl);
  const wallCol = { house: r.pick([0xe8dcc8, 0xd8e0e8, 0xe8d8d0, 0xd8e4d0]), apt: r.pick([0xe0dcd4, 0xd0d8e0]), office: 0xe4e6e8, shop: 0xf0ece4, ware: 0xa8acb0 }[k];
  const wm = new THREE.MeshLambertMaterial({ color: wallCol, side: THREE.FrontSide });
  const wall = (x, z, w, rot) => { const m = mesh(GM.planeV(), wm, x, H / 2, z, w, H, 1); m.rotation.y = rot; m.receiveShadow = true; g.add(m); };
  wall(0, -D / 2, W, 0); wall(-W / 2, 0, D, Math.PI / 2); wall(W / 2, 0, D, -Math.PI / 2);
  // the front wall (with the door) faces in from +z
  wall(-W / 4 - 0.6, D / 2, W / 2 - 1.2, Math.PI); wall(W / 4 + 0.6, D / 2, W / 2 - 1.2, Math.PI);
  const door = mesh(GM.box(), lam(0x6a4a34), 0, 1.1, D / 2 + 0.05, 1.2, 2.2, 0.08); g.add(door);
  // baseboard trim and a ceiling light
  const trim = lam(0xf4f0e8);
  g.add(mesh(GM.box(), trim, 0, 0.06, -D / 2 + 0.02, W, 0.12, 0.04), mesh(GM.box(), trim, -W / 2 + 0.02, 0.06, 0, 0.04, 0.12, D), mesh(GM.box(), trim, W / 2 - 0.02, 0.06, 0, 0.04, 0.12, D));
  const solids = [];
  const furn = (x, z, w, h, d, col, solid = true, y = 0) => { const m = mesh(GM.box(), lam(col), x, y + h / 2, z, w, h, d); m.castShadow = true; m.receiveShadow = true; g.add(m); if (solid) solids.push({ x0: INT_X + x - w / 2, z0: INT_Z + z - d / 2, x1: INT_X + x + w / 2, z1: INT_Z + z + d / 2 }); return m; };
  let pat = { x: 0, z: -0.5, yaw: 0 }, chair = null, bed = null;
  const P = C.P;
  if (k === 'house' || k === 'apt') {
    const sofaC = r.pick([0x5a6a8a, 0x8a5a4a, 0x6a7a5a, 0x7a6a8a]);
    furn(-W / 2 + 1.6, -D / 2 + 0.55, 2.4, 0.45, 0.9, sofaC); furn(-W / 2 + 1.6, -D / 2 + 0.15, 2.4, 0.9, 0.25, sofaC);
    furn(-W / 2 + 1.6, -D / 2 + 1.7, 1.2, 0.42, 0.6, 0x7a5a3a);
    furn(W / 2 - 0.4, -D / 2 + 1.5, 0.4, 0.55, 1.4, 0x3a3a40); furn(W / 2 - 0.35, -D / 2 + 1.5, 0.08, 0.6, 1.2, 0x111111, false, 0.55);
    // armchair
    const ax = W / 2 - 1.6, az = 0.6;
    furn(ax, az, 0.9, 0.45, 0.85, sofaC); furn(ax + 0.42, az, 0.15, 0.85, 0.85, sofaC);
    chair = { x: ax - 0.05, z: az, yaw: -Math.PI / 2 };
    // bed in a corner for bedroom calls
    if (P.place === 'bed') { furn(-W / 2 + 1.2, 1.2, 2.0, 0.55, 1.6, 0xe8e8f0); furn(-W / 2 + 0.15, 1.2, 0.2, 1.0, 1.6, 0x6a4a34); bed = { x: -W / 2 + 1.3, z: 1.2, yaw: Math.PI / 2 }; }
    furn(0, -D / 2 + 0.2, 1.4, 1.8, 0.35, 0x8a6a4a); // bookshelf
    g.add(mesh(GM.box(), lam(r.pick([0x8a3a3a, 0x3a5a8a, 0x8a7a3a])), 0.4, 0.01, 0.2, 2.6, 0.02, 1.8)); // rug
  } else if (k === 'office') {
    for (const [x, z] of [[-3, -2], [0, -2], [3, -2], [-3, 1.5], [3, 1.5]]) { furn(x, z, 1.6, 0.75, 0.8, 0xd8d4cc); furn(x, z - 0.3, 0.6, 0.4, 0.05, 0x202024, false, 0.75); furn(x, z + 0.7, 0.5, 0.5, 0.5, 0x2a2a30); }
    chair = { x: 3, z: 2.2, yaw: Math.PI };
  } else if (k === 'shop') {
    for (const x of [-3.5, 0, 3.5]) { furn(x, -1.5, 1.0, 1.6, 4, 0xd8d8d8); for (let y = 0.4; y < 1.6; y += 0.4) furn(x, -1.5, 1.05, 0.25, 3.8, r.pick([0xc84a3a, 0x3a8ac8, 0xe8c83a, 0x5aa85a]), false, y); }
    furn(-W / 2 + 1.2, D / 2 - 1.8, 2, 1.0, 0.8, 0x6a5a4a);
  } else {
    for (const x of [-5, -1, 3]) furn(x, -3, 2.4, 1.0, 1.2, 0x5a6a7a);
    furn(5, 2, 2, 2.2, 2, 0x8a6a3a); furn(-5, 2.5, 3, 1.8, 1.2, 0x3a6a8a);
  }
  // where the patient is
  if (P.place === 'chair' && chair) pat = chair;
  else if (P.place === 'bed' && bed) pat = bed;
  else pat = { x: r.range(-1, 1), z: r.range(-0.6, 0.8), yaw: r.range(-1, 1) };
  // lights
  const lamp = mesh(GM.box(), mat(0xffffff, { basic: true }), 0, H - 0.05, 0, 1.2, 0.05, 0.4); g.add(lamp);
  SCENE.int = { g, W, D, H, solids, door: { x: INT_X, z: INT_Z + D / 2 - 0.6 }, pat: { x: INT_X + pat.x, z: INT_Z + pat.z, yaw: pat.yaw }, kind: k, floor: C.floor, stairs: C.place.access === 'stairs' && C.floor > 1 };
  const Pp = scenePerson(P.look, INT_X + pat.x, INT_Z + pat.z, pat.yaw, P.pose, 'patient', { P, y: P.pose === 'sit' || P.pose === 'chestSit' ? 0 : 0 });
  if (pat === bed) Pp.m.root.position.y = 0.55;
  P.model = Pp.m; P.where = { scene: 'interior', x: INT_X + pat.x, z: INT_Z + pat.z, yaw: pat.yaw, y: Pp.m.root.position.y }; P.person = Pp;
  // a family member waiting in the room once the crew is inside
  SCENE.int.bysSpot = { x: INT_X + pat.x + 1.4, z: INT_Z + pat.z + 1.2 };
}
// interior walking: stay inside the room, out of the furniture
function collideInterior(x, z, r) {
  const I = SCENE.int; if (!I) return { x, z };
  x = clamp(x, INT_X - I.W / 2 + r, INT_X + I.W / 2 - r); z = clamp(z, INT_Z - I.D / 2 + r, INT_Z + I.D / 2 - r);
  for (const s of I.solids) {
    const qx = clamp(x, s.x0, s.x1), qz = clamp(z, s.z0, s.z1), dx = x - qx, dz = z - qz, d = Math.hypot(dx, dz);
    if (d < r && d > 1e-5) { x = qx + dx / d * r; z = qz + dz / d * r; }
    else if (d <= 1e-5) { const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2; if (Math.abs(x - cx) / (s.x1 - s.x0) > Math.abs(z - cz) / (s.z1 - s.z0)) x = x < cx ? s.x0 - r : s.x1 + r; else z = z < cz ? s.z0 - r : s.z1 + r; }
  }
  return { x, z };
}
