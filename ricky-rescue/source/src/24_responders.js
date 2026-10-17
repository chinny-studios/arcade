// Ricky Rescue — responding units. Fire engines from the four firehouses and police cars on patrol drive to the scene
// with lights and sirens (traffic yields to them as it does to Medic 12), park where they protect the scene, and put
// their crews to work: a firefighter takes compressions or holds pressure, police clear unsafe scenes and direct
// traffic at crashes, and the first engine's firefighter-paramedic joins Ricky and Marisol as a third crew member
// who can ride in the ambulance to the hospital.

const RESP = { units: [], radioT: 0 };
const MEDIC = { on: false, unit: null, name: '', first: '', person: null, x: 0, z: 0, sp: 'city', task: 'none', busy: 0, workPose: null, said: false };
const POLICE_UNITS = [14, 23, 31, 42, 56, 68, 71, 85];

function initResponders() {
  for (const F of CITY.firehouses) {
    const m = buildFireEngine(); m.position.set(F.home.x, CURB, F.home.z); m.rotation.y = F.home.yaw; R.scene.add(m);
    RESP.units.push({ kind: 'fire', name: F.name, short: 'E' + F.num, F, model: m, x: F.home.x, z: F.home.z, yaw: F.home.yaw, v: 0, state: 'home', siren: false, lightT: Math.random(), barCols: m.userData.bar.map((b) => b.color.clone()) });
  }
}
// at the start of a shift every engine is back in quarters and no police are out
function resetResponders() {
  for (const u of [...RESP.units]) {
    if (u.kind === 'police') { R.scene.remove(u.model); RESP.units.splice(RESP.units.indexOf(u), 1); continue; }
    parkHome(u);
  }
  Object.assign(MEDIC, { on: false, unit: null, person: null, task: 'none', busy: 0, workPose: null, said: false });
}
function parkHome(u) {
  const h = u.F.home;
  Object.assign(u, { x: h.x, z: h.z, yaw: h.yaw, v: 0, state: 'home', siren: false, call: null, route: null, crew: [] });
  u.model.position.set(h.x, CURB, h.z); u.model.rotation.y = h.yaw; u.model.visible = true;
  h.solid.h = 3;
}

// ---------- who goes ----------
function dispatchResponders(C, r = rnd) {
  const tpl = C.tpl, mci = !!C.mci;
  const nFire = mci ? 2 : (tpl.arrest || C.mvc || (tpl.pri === 1 && r.chance(0.55)) || (tpl.id === 'lift' && r.chance(0.5))) ? 1 : 0;
  const nPD = mci ? 2 : (C.hazard || C.mvc || tpl.id === 'stab' || (tpl.id === 'overdose' && r.chance(0.6)) || (tpl.arrest && r.chance(0.35))) ? 1 : 0;
  C.units = [];
  // nearest free engines (one already heading home can be turned round)
  const free = RESP.units.filter((u) => u.kind === 'fire' && (u.state === 'home' || u.state === 'returning'));
  free.sort((a, b) => dist(a.x, a.z, C.place.x, C.place.z) - dist(b.x, b.z, C.place.x, C.place.z));
  for (let k = 0; k < nFire && k < free.length; k++) {
    const u = free[k];
    u.call = C; u.slot = k; u.crew = [];
    if (k === 0 && !mci) { C.medicUnit = u; Object.assign(MEDIC, { on: false, unit: u, name: u.F.medic, first: u.F.medic.split(' ')[0], task: 'none', person: null, said: false }); }
    C.units.push(u);
    sendToScene(u, C);
  }
  for (let k = 0; k < nPD; k++) {
    const u = spawnPolice(C, r); if (!u) continue;
    u.call = C; u.slot = k; u.crew = [];
    C.units.push(u);
    sendToScene(u, C);
  }
  if (C.units.length) {
    const names = C.units.map((u) => u.name);
    setTimeout(() => radio('Dispatch', `${names.join(', ')} also responding.`, 'dispatch'), DEBUG ? 0 : 2200);
  }
}
function spawnPolice(C, r) {
  const used = new Set(RESP.units.filter((u) => u.kind === 'police').map((u) => u.num));
  const num = POLICE_UNITS.find((n) => !used.has(n)); if (!num) return null;
  // a patrol car somewhere 250–450 m out, not right next to the player
  let pick = null;
  for (let tries = 0; tries < 80 && !pick; tries++) {
    const e = CITY.edges[Math.floor(r() * CITY.edges.length)], dir = r() < 0.5 ? 1 : -1;
    const p = edgePos(e, dir, CP / 2, laneOff(0)), d = dist(p.x, p.z, C.place.x, C.place.z);
    if (d > 250 && d < 450 && (!RIG || dist(p.x, p.z, RIG.x, RIG.z) > 150)) pick = p;
  }
  if (!pick) return null;
  const m = buildCar('sedan', 0x111418, { police: true }); R.scene.add(m);
  const u = { kind: 'police', num, name: 'Car ' + num, short: 'PD', model: m, x: pick.x, z: pick.z, yaw: pick.yaw, v: 6, state: 'out', siren: true, lightT: Math.random(), barCols: m.userData.bar.map((b) => b.color.clone()) };
  RESP.units.push(u);
  return u;
}
// where each unit parks: engines block upstream of a crash, police protect the far side or stand off at the curb
function respSpot(C, u) {
  const p = C.place, k = u.slot || 0;
  if (p.kind === 'road') {
    const e = p.edge, dir = p.dir;
    if (u.kind === 'fire') return edgePos(e, dir, k ? CP / 2 + 28 : CP / 2 - 30, laneOff(e.lanes - 1));
    return C.mci ? edgePos(e, dir, k ? CP / 2 + 28 : CP / 2 - 30, laneOff(0)) : edgePos(e, dir, CP / 2 + 20, laneOff(e.lanes - 1));
  }
  const c = p.curb, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const back = u.kind === 'fire' ? -16 - k * 13 : 12 + k * 8;
  return { x: c.x + fx * back, z: c.z + fz * back, yaw: c.yaw };
}
function sendToScene(u, C) {
  // unsafe scene: the engine stages with Medic 12 until police clear it
  const stage = u.kind === 'fire' && C.hazard && !C.pdCleared;
  driveUnit(u, stage ? stageSpot(C) : respSpot(C, u), true, 'scene');
  u.staging = stage;
}
function stageSpot(C) { const s = stagingPoint(C), fx = Math.sin(s.yaw), fz = Math.cos(s.yaw); return { x: s.x - fx * 16, z: s.z - fz * 16, yaw: s.yaw }; }

// ---------- driving ----------
function driveUnit(u, goal, siren, purpose) {
  let from = u, pre = [];
  // back to quarters: along the street in front of the firehouse, then onto the apron
  if (purpose === 'home') goal = { x: u.F.home.x + 8, z: lineAt(u.F.block.bj + 1) - laneOff(0), yaw: -Math.PI / 2 };
  // leaving quarters: nose out onto the street in front of the firehouse first
  if (u.state === 'home' && u.F) {
    const b = u.F.block, ly = lineAt(b.bj + 1) - laneOff(0);
    from = { x: u.x - 6, z: ly, yaw: -Math.PI / 2 };
    pre = [{ x: u.x, z: u.z }, { x: u.x, z: ly - 3 }];
    u.F.home.solid.h = 0;
  }
  const r = computeRoute(Object.assign({ ls: siren }, goal), from);
  let pts = pre.concat(r.pts);
  if (purpose === 'home') { const h = u.F.home; pts = pts.concat([{ x: h.x, z: lineAt(u.F.block.bj + 1) - laneOff(0) - 4 }, { x: h.x, z: h.z }]); }
  const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist(pts[k].x, pts[k].z, pts[k - 1].x, pts[k - 1].z));
  // speed limit at each point from the turn around it, then braking distance backwards along the path
  const vmax = siren ? 15.5 : 11;
  const ang = (k) => Math.atan2(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z);
  const vl = pts.map((p, k) => {
    if (k < 1 || k > pts.length - 2) return vmax;
    let turn = 0; for (let q = Math.max(0, k - 2); q < Math.min(pts.length - 2, k + 2); q++) turn += Math.abs(angWrap(ang(q + 1) - ang(q)));
    return turn > 0.3 ? lerp(13, 4.5, clamp((turn - 0.3) / 1.2, 0, 1)) : vmax;
  });
  vl[vl.length - 1] = 0;
  for (let k = vl.length - 2; k >= 0; k--) vl[k] = Math.min(vl[k], Math.sqrt(vl[k + 1] ** 2 + 2 * 5.5 * (cum[k + 1] - cum[k])));
  Object.assign(u, { route: { pts, cum, len: cum[cum.length - 1], vl }, s: 0, i: 0, goal, siren, purpose, state: purpose === 'scene' ? 'enroute' : purpose === 'home' ? 'returning' : 'leaving', blockT: 0, ghostT: 0 });
  unparkUnit(u);
}
function stepUnit(u, dt) {
  const Rt = u.route, P = Rt.pts, cum = Rt.cum;
  let i = u.i; while (i < cum.length - 2 && cum[i + 1] <= u.s) i++; u.i = i;
  const seg = Math.max(1e-6, cum[i + 1] - cum[i]), f = clamp((u.s - cum[i]) / seg, 0, 1);
  let vt = lerp(Rt.vl[i], Rt.vl[i + 1], f);
  // something stopped in the way (Medic 12, a car that hasn't pulled over): wait, then ease past
  u.ghostT = Math.max(0, u.ghostT - dt);
  const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw);
  let blocked = false;
  if (u.ghostT <= 0) {
    const test = (x, z, len) => { const ox = x - u.x, oz = z - u.z, al = ox * fx + oz * fz, lat = Math.abs(-ox * fz + oz * fx); if (al > 0 && al < 16 && lat < 2.4) { const v = Math.max(0, (al - len / 2 - 5) * 0.8); if (v < 0.5) blocked = true; vt = Math.min(vt, v); } };
    if (RIG && RIG.active) test(RIG.x, RIG.z, RIG.len);
    for (const c of TRAFFIC.cars) if (Math.abs(c.x - u.x) < 18 && Math.abs(c.z - u.z) < 18) test(c.x, c.z, c.len);
    for (const o of RESP.units) if (o !== u && o.state !== 'home' && o.state !== 'gone' && Math.abs(o.x - u.x) < 18 && Math.abs(o.z - u.z) < 18 && (o.state !== 'enroute' || o.s > u.s)) test(o.x, o.z, o.kind === 'fire' ? 9.5 : 4.6);
  }
  u.blockT = blocked && u.v < 0.5 ? u.blockT + dt : 0;
  if (u.blockT > 2.2) { u.ghostT = 4; u.blockT = 0; }
  if (u.ghostT > 0) vt = Math.min(vt, 4);
  u.v = u.v < vt ? Math.min(vt, u.v + (u.kind === 'fire' ? 2.6 : 3.4) * dt) : Math.max(vt, u.v - 7 * dt);
  u.s = Math.min(Rt.len, u.s + u.v * dt);
  // place on the path; the body turns a little behind the path so corners look driven
  let k = u.i; while (k < cum.length - 2 && cum[k + 1] <= u.s) k++;
  const g = clamp((u.s - cum[k]) / Math.max(1e-6, cum[k + 1] - cum[k]), 0, 1);
  u.x = lerp(P[k].x, P[k + 1].x, g); u.z = lerp(P[k].z, P[k + 1].z, g);
  const ty = Math.atan2(P[k + 1].x - P[k].x, P[k + 1].z - P[k].z);
  u.yaw = angTo(u.yaw, ty, dt * (2 + u.v * 0.25));
  if (u.s >= Rt.len - 0.3 && u.v < 0.6) arriveUnit(u);
}
function arriveUnit(u) {
  const C = u.call;
  if (u.purpose === 'home') { parkHome(u); return; }
  if (u.purpose === 'away') { R.scene.remove(u.model); u.state = 'gone'; RESP.units.splice(RESP.units.indexOf(u), 1); return; }
  // at the scene (or the staging spot)
  u.v = 0; u.state = 'scene';
  if (u.goal) u.yaw = u.goal.yaw;
  if (!C || G.call !== C) { leaveScene(u); return; }
  // Medic 12 already on the spot: park a little further back
  if (RIG && dist(RIG.x, RIG.z, u.x, u.z) < 8) { const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw); u.x -= fx * 11; u.z -= fz * 11; }
  parkUnit(u);
  if (u.staging && !C.pdCleared) { radio(u.name, `${u.name} staged with Medic 12.`); return; }
  if (u.staging) { u.staging = false; unparkUnit(u); driveUnit(u, respSpot(C, u), false, 'scene'); return; }
  radio(u.name, u.kind === 'police' ? `${u.name} on scene.` : C.P.arrest && !C.times.contact ? `${u.name} on scene, going in with the AED.` : `${u.name} on scene.`);
  dismount(u, C);
}
function parkUnit(u) {
  const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw), hl = u.kind === 'fire' ? 4.9 : 2.4, hw = u.kind === 'fire' ? 1.35 : 1.0;
  const ax = Math.abs(fx) * hl + Math.abs(fz) * hw, az = Math.abs(fz) * hl + Math.abs(fx) * hw;
  u.solid = sceneSolid(u.x - ax, u.z - az, u.x + ax, u.z + az, u.kind === 'fire' ? 3 : 1.5);
  u.blocker = { x: u.x, z: u.z, len: hl * 2 }; SCENE.blockers.push(u.blocker);
}
function unparkUnit(u) {
  if (u.solid) { const s = u.solid, i = CITY.solids.indexOf(s); if (i >= 0) CITY.solids.splice(i, 1); for (const l of CITY.grid.values()) { const k = l.indexOf(s); if (k >= 0) l.splice(k, 1); } const j = (SCENE.solids || []).indexOf(s); if (j >= 0) SCENE.solids.splice(j, 1); u.solid = null; }
  if (u.blocker) { const i = SCENE.blockers.indexOf(u.blocker); if (i >= 0) SCENE.blockers.splice(i, 1); u.blocker = null; }
}
function leaveScene(u) {
  unparkUnit(u);
  for (const p of u.crew || []) { R.scene.remove(p.m.root); const i = SCENE.people.indexOf(p); if (i >= 0) SCENE.people.splice(i, 1); }
  u.crew = []; u.call = null;
  if (u.kind === 'fire') driveUnit(u, null, false, 'home');
  else {
    // police drive off somewhere far and disappear
    const far = CITY.edges.filter((e) => { const A = CITY.nodes[e.a]; return dist(A.x, A.z, u.x, u.z) > 350; });
    const e = far[Math.floor(Math.random() * far.length)] || CITY.edges[0];
    driveUnit(u, edgePos(e, 1, CP / 2, laneOff(0)), false, 'away');
  }
}
// clear the scene: everyone packs up (called when the call ends)
function releaseUnits() {
  for (const u of RESP.units) if (u.call && (u.state === 'scene' || u.state === 'enroute')) leaveScene(u);
  if (!MEDIC.on || MEDIC.task !== 'ride') Object.assign(MEDIC, { on: false, unit: null, person: null, task: 'none' });
}

// ---------- crews ----------
const ENGINE_FF = Object.assign({}, FIREFIGHTER);
const ENGINE_MEDIC = Object.assign({}, FIREFIGHTER, { vest: 0x2a62c8, hat: 0x1a1a1a });
function dismount(u, C) {
  const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw), rx = -fz, rz = fx;
  const at = (side, fwd) => ({ x: u.x + rx * side + fx * fwd, z: u.z + rz * side + fz * fwd });
  const mk = (look, role, side, fwd) => { const q = at(side, fwd); const p = scenePerson(look, q.x, q.z, u.yaw + side * Math.PI / 2, 'stand', role, { sp: 'city', v: 0, unit: u }); u.crew.push(p); return p; };
  if (u.kind === 'police') { mk(COP, 'cop', -1.6, 0.4); return; }
  if (u === C.medicUnit) { const m = mk(ENGINE_MEDIC, 'medic', -2, 2); MEDIC.person = m; MEDIC.task = 'walk'; }
  mk(ENGINE_FF, 'ff', 2, 2);
  if (C.mvc || C.mci) mk(ENGINE_FF, 'ff2', -2, -1);
  if (C.mvc && SCENE.wreck) for (let k = 0; k < 4; k++) { const c = buildCone(); const q = at(-0.5, 7 + k * 3.5); c.position.set(q.x, 0, q.z); sceneAdd(c); }
}
// where a crew member wants to be: { x, z, sp, face }
function crewGoal(p, C) {
  const P = C.P, W = P.where || {}, u = p.unit;
  const pSp = W.scene === 'interior' ? 'int' : W.scene === 'city' ? 'city' : null;
  const home = { x: u.x + Math.cos(u.yaw) * 2, z: u.z - Math.sin(u.yaw) * 2, sp: 'city' };
  if (p.role === 'ff2') return SCENE.wreck ? { x: SCENE.wreck.x + 2.5, z: SCENE.wreck.z + 2.5, sp: 'city', face: SCENE.wreck } : home;
  if (p.role === 'cop') {
    if (C.mvc || C.mci) { const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw); return { x: u.x + fx * 8, z: u.z + fz * 8, sp: 'city', yaw: u.yaw }; }
    const door = C.indoor && SCENE.int ? { x: SCENE.int.door.x + 1.2, z: SCENE.int.door.z - 1.2, sp: 'int' } : null;
    if (C.hazard && !C.pdCleared) return C.indoor && door ? door : { x: C.place.x + 2, z: C.place.z + 1.5, sp: 'city' };
    if (pSp) return { x: W.x + 2.6, z: W.z - 1.8, sp: pSp, face: W };
    return home;
  }
  if (!pSp || P.carried) {
    // the patient is on the move or gone: the medic stays with Ricky, the firefighter heads back to the engine
    if (p.role === 'medic' && MEDIC.task !== 'leave' && G.call && G.call.stage !== 'transport' && G.call.stage !== 'done') return { x: PLAYER.x - Math.sin(PLAYER.yaw) * 2 - Math.cos(PLAYER.yaw) * 1.3, z: PLAYER.z - Math.cos(PLAYER.yaw) * 2 + Math.sin(PLAYER.yaw) * 1.3, sp: PLAYER.sp };
    return home;
  }
  if (p.role === 'medic') return { x: W.x + 0.9, z: W.z - 0.9, sp: pSp, face: W };
  return { x: W.x - 0.75, z: W.z + 0.3, sp: pSp, face: W };
}
function updateCrew(p, dt, C) {
  const g = crewGoal(p, C);
  let tx = g.x, tz = g.z;
  // between the street and a building: walk to the door first
  if (g.sp !== p.sp) {
    const I = SCENE.int, d = placeDoor();
    if (!I || !d) { p.sp = g.sp; }
    else if (p.sp === 'city') { tx = d.x; tz = d.z; if (dist(p.x, p.z, tx, tz) < 1.0) { p.sp = 'int'; p.x = I.door.x; p.z = I.door.z - 0.5; } }
    else { tx = I.door.x; tz = I.door.z; if (dist(p.x, p.z, tx, tz) < 0.8) { p.sp = 'city'; p.x = d.x; p.z = d.z; } }
  }
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  const hurry = C.P.arrest || C.tpl.pri === 1;
  if (d > 0.25) {
    const sp = Math.min(d * 3, hurry ? 4.2 : 3);
    p.yaw = angTo(p.yaw === undefined ? 0 : p.yaw, Math.atan2(dx, dz), dt * 8);
    let nx = p.x + dx / d * sp * dt, nz = p.z + dz / d * sp * dt;
    if (p.sp === 'int') { const q = collideInterior(nx, nz, 0.3); nx = q.x; nz = q.z; } else { const q = collideCircle(nx, nz, 0.3, 0.4); nx = q.x; nz = q.z; const q2 = collideRigBody(nx, nz, 0.3); nx = q2.x; nz = q2.z; }
    p.v = Math.hypot(nx - p.x, nz - p.z) / dt; p.x = nx; p.z = nz;
  } else {
    p.v = 0;
    const face = g.face ? Math.atan2(g.face.x - p.x, g.face.z - p.z) : g.yaw;
    if (face !== undefined) p.yaw = angTo(p.yaw, face, dt * 6);
  }
  p.atGoal = d < 0.6 && g.sp === p.sp;
  const y = p.sp === 'int' ? 0 : groundY(p.x, p.z);
  p.m.root.position.set(p.x, y, p.z); p.m.root.rotation.y = p.yaw;
  p.m.root.visible = !(p.role === 'medic' && MEDIC.task === 'ride');
}
// poses and the jobs firefighters and police take on by themselves
function crewWork(C, dt) {
  const P = C.P;
  C.ffPressure = false;
  let ffAt = false;
  for (const u of C.units || []) for (const p of u.crew || []) {
    updateCrew(p, dt, C);
    let pose = p.v > 0.3 ? 'stand' : 'arms';
    if (p.role === 'ff' && p.atGoal && P.where && P.where.scene !== 'rig' && !P.carried) {
      ffAt = true;
      const wb = worstBleed(P);
      if (P.arrest && !workerOn('cpr', 'ricky') && !workerOn('cpr', 'partner') && !workerOn('cpr', 'medic')) pose = 'cpr';
      else if (wb && wb.kind === 'arterial' && wb.ctrl !== 'tq' && wb.ctrl !== 'gauze' && !workerOn('pressure')) { pose = 'kneel'; C.ffPressure = true; }
      else pose = 'crouch';
    }
    if (p.role === 'medic') {
      MEDIC.x = p.x; MEDIC.z = p.z; MEDIC.sp = p.sp;
      const W = P.where || {};
      const near = W.x !== undefined && !P.carried && (W.scene === 'interior' ? 'int' : 'city') === p.sp && dist(p.x, p.z, W.x, W.z) < 2.5;
      if (near && MEDIC.task === 'walk') { MEDIC.task = 'patient'; MEDIC.on = true; if (C.times.contact !== undefined) medicIntro(C); }
      if (MEDIC.task === 'patient' && !near && !P.carried && P.where.scene !== 'rig') MEDIC.task = 'walk';
      if (P.carried && MEDIC.task === 'patient') MEDIC.task = 'walk';
      if (MEDIC.task === 'walk' && P.carried) MEDIC.on = true; // still part of the crew while the patient moves
      pose = MEDIC.workPose && p.atGoal ? MEDIC.workPose : p.v > 0.3 ? 'stand' : near ? 'kneel' : 'arms';
    }
    if (p.role === 'cop') pose = p.v > 0.3 ? 'stand' : C.mvc || C.mci ? 'wave' : 'arms';
    if (p.role === 'ff2') pose = p.v > 0.3 ? 'stand' : 'arms';
    p.pose = pose;
  }
  // firefighters at the patient take over from a bystander doing CPR
  if (ffAt && !C.fireOn) {
    C.fireOn = true;
    if (SCENE.bys && SCENE.bys.pose === 'cpr') setPose(SCENE.bys, 'arms', 1.2);
    if (SCENE.bysCPR) setPose(SCENE.bysCPR, 'arms', 1.4);
    C.bystCPR = false;
    if (P.arrest && !C.times.contact) radio(C.units.find((u) => u.kind === 'fire').name, 'We have CPR in progress, AED going on.');
  }
  if (!ffAt) C.fireOn = false;
  // police at an unsafe scene: in, look round, then clear it
  const cop = (C.units || []).find((u) => u.kind === 'police' && u.crew && u.crew[0]);
  if (C.hazard && !C.pdCleared && cop && cop.crew[0].atGoal) {
    if (C.clearAt === undefined) { C.clearAt = C.t + 45; C.pdOn = true; }
    else if (C.t >= C.clearAt) sceneCleared(C);
  }
}
function medicIntro(C) {
  if (MEDIC.said) return; MEDIC.said = true;
  radio(MEDIC.first, `${MEDIC.name}, ${MEDIC.unit.name}'s medic. I can start lines and push meds. Tell me what you need.`, 'medic');
}
function sceneCleared(C) {
  C.pdCleared = true;
  radio(C.units.find((u) => u.kind === 'police').name, 'Scene is secure, Medic 12 can come in.');
  if ((C.stage === 'staging' || C.stage === 'enroute') && RIG) buildRoute(Object.assign({ ls: RIG.siren }, C.place.curb), C.addr);
  // staged engines move up
  for (const u of C.units) if (u.kind === 'fire' && u.staging && (u.state === 'scene' || u.state === 'enroute')) { u.staging = false; driveUnit(u, respSpot(C, u), u.state === 'enroute', 'scene'); }
}

// ---------- per frame ----------
function updateResponders(dt) {
  const C = G.call;
  for (const u of [...RESP.units]) {
    if (u.route && (u.state === 'enroute' || u.state === 'returning' || u.state === 'leaving')) stepUnit(u, dt);
    if (u.state === 'home' || u.state === 'gone') continue;
    u.model.position.set(u.x, groundY(u.x, u.z), u.z); u.model.rotation.y = u.yaw;
    // lights: running to the call and at the scene
    const lit = u.siren || u.state === 'scene';
    u.lightT += dt;
    const ph = (u.lightT % 0.6) < 0.3;
    u.model.userData.bar.forEach((m, k) => { m.color.copy(u.barCols[k]).multiplyScalar(lit && (ph === (k === 0)) ? 1 : 0.25); });
    for (const h of u.model.userData.halos || []) h.s.material.opacity = lit && (ph === (h.k === 0)) ? 0.25 + R.night * 0.5 : 0;
  }
  if (C && C.units) {
    crewWork(C, dt);
    // packing up once Medic 12 has gone (the medic rides along if asked)
    if ((C.stage === 'transport' || C.stage === 'hospital') && !C.unitsLeft) {
      C.unitsLeftT = (C.unitsLeftT || 0) + dt;
      if (C.unitsLeftT > 6) { C.unitsLeft = true; for (const u of C.units) if (u.state === 'scene' || u.state === 'enroute') leaveScene(u); }
    }
  }
}
// the next arrival, for the HUD
function unitsLine(C) {
  if (!C || !C.units || !C.units.length || C.stage === 'done') return '';
  return C.units.filter((u) => u.call === C).map((u) => u.state === 'scene' ? `${u.short === 'PD' ? u.name : u.name} on scene` : u.state === 'enroute' ? `${u.name} ${Math.max(1, Math.round((u.route.len - u.s) / 11 * TIME_SCALE / 60))} min` : '').filter(Boolean).join(' · ');
}
// everything with lights and sirens running, for traffic to yield to
function sirenVehicles() {
  const out = [];
  if (RIG && RIG.active && RIG.siren) out.push(RIG);
  for (const u of RESP.units) if (u.siren && (u.state === 'enroute') && u.v > 0.5) out.push(u);
  return out;
}
