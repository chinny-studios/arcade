// Ricky Rescue — the crew on foot: Ricky's controller, Marisol's AI, the stretcher and carry devices, packaging and
// moving the patient, loading into the rig, doors in and out of buildings, and the interaction prompts.
//
// Spaces: 'city' or 'int' (the interior room of the current call). Equipment is at 'rig' (stowed), on the ground in a
// space, or carried/pushed by someone.

const PLAYER = { x: 0, z: 0, yaw: 0, y: 0, sp: 'city', model: null, v: 0, carry: null, push: false, pose: 'stand', busy: 0, run: false };
const PARTNER = { x: 0, z: 0, yaw: 0, y: 0, sp: 'city', model: null, task: 'cab', carry: null, target: null, busy: 0, bag: null, speed: 3.4, say: 0 };
const EQ = {};
const SPEED = { walk: 3.0, run: 5.0, push: 2.3, carry: 1.7 };

function initCrew() {
  const C = G.career, U = UNIFORMS[C.uniform];
  for (const p of [PLAYER, PARTNER]) if (p.model) R.scene.remove(p.model.root);
  PLAYER.model = makePerson(Object.assign({}, C.look, { shirt: U.shirt, pants: U.pants, shoes: 0x111111, uniform: true, gloves: true }));
  PARTNER.model = makePerson({ skin: SKINS[3], hair: HAIRS[0], style: 'bun', shirt: U.shirt, pants: U.pants, shoes: 0x111111, uniform: true, gloves: true, h: 0.96 });
  R.scene.add(PLAYER.model.root, PARTNER.model.root);
  PARTNER.bag = buildBag(); PARTNER.mon = buildMonitorBox();
  PARTNER.model.aR.el.add(PARTNER.bag); PARTNER.bag.position.set(0, -0.45, 0.1); PARTNER.bag.scale.setScalar(0.8);
  PARTNER.model.aL.el.add(PARTNER.mon); PARTNER.mon.position.set(0, -0.42, 0.08); PARTNER.mon.scale.setScalar(0.8);
  for (const k of Object.keys(EQ)) if (EQ[k].model) R.scene.remove(EQ[k].model.g);
  EQ.stretcher = { id: 'stretcher', model: buildStretcher(), at: 'rig', x: 0, z: 0, yaw: 0, sp: 'city', by: null, P: null };
  EQ.chair = { id: 'chair', model: buildStairChair(), at: 'rig', x: 0, z: 0, yaw: 0, sp: 'city', by: null, P: null };
  EQ.scoop = { id: 'scoop', model: buildBoard(true), at: 'rig', x: 0, z: 0, yaw: 0, sp: 'city', by: null, P: null };
  EQ.board = { id: 'board', model: buildBoard(false), at: 'rig', x: 0, z: 0, yaw: 0, sp: 'city', by: null, P: null };
  for (const e of Object.values(EQ)) { R.scene.add(e.model.g); e.model.g.visible = false; }
  PLAYER.carry = null; PLAYER.push = false; PLAYER.sp = 'city';
  PARTNER.task = 'cab'; PARTNER.carry = null; PARTNER.sp = 'city'; PARTNER.gear = false;
  PLAYER.model.root.visible = false; PARTNER.model.root.visible = false;
  G.where = 'cab';
}
function resetCrewAfterCall() {
  for (const e of Object.values(EQ)) { e.at = 'rig'; e.by = null; e.P = null; e.model.g.visible = false; if (e.id === 'stretcher') { setStretcher(e.model, 1, 0); e.model.gear.visible = true; } }
  PLAYER.carry = null; PLAYER.push = false;
  if (PARTNER.task !== 'cab' && PARTNER.task !== 'drive') PARTNER.task = 'follow';
  PARTNER.carry = null; PARTNER.gear = false;
  if (G.where === 'back') { G.where = 'cab'; setEnv('city'); }
  if (RIG) RIG.loaded = null;
}

// ---------- rig landmarks ----------
function rigPoint(fwd, side) { const A = RIG, fx = Math.sin(A.yaw), fz = Math.cos(A.yaw); return { x: A.x + fx * fwd - fz * side, z: A.z + fz * fwd + fx * side }; }
const rigDriverDoor = () => rigPoint(RIG.len / 2 - 1.3, RIG.wid / 2 + 0.7);   // left side (+side = left)
const rigPassDoor = () => rigPoint(RIG.len / 2 - 1.3, -RIG.wid / 2 - 0.7);
const rigRear = () => rigPoint(-RIG.len / 2 - 1.3, 0);

// ---------- getting in and out ----------
function exitCab() {
  if (G.where !== 'cab' || Math.abs(RIG.v) > 1.5) return false;
  const d = rigDriverDoor();
  Object.assign(PLAYER, { x: d.x, z: d.z, yaw: RIG.yaw + Math.PI / 2, sp: 'city' });
  PLAYER.model.root.visible = true;
  G.where = 'foot';
  RIG.v = 0; RIG.auto = null;
  if (PARTNER.task === 'cab' || PARTNER.task === 'drive') {
    const p = rigPassDoor(); Object.assign(PARTNER, { x: p.x, z: p.z, sp: 'city', task: 'follow' });
    PARTNER.model.root.visible = true;
    // on a call, Marisol brings the jump bag and monitor
    if (G.call && ['onscene', 'enroute', 'staging'].includes(G.call.stage)) { PARTNER.gear = true; }
  }
  CAM.userYaw = RIG.yaw + Math.PI; CAM.userPitch = 0;
  bus.emit('exitCab');
  return true;
}
function enterCab() {
  if (G.where !== 'foot' || PLAYER.sp !== 'city') return false;
  if (PLAYER.push || PLAYER.carry) { toast('Put the ' + (PLAYER.push ? 'stretcher' : DEVICES[PLAYER.carry].short) + ' away first.', 'bad'); return false; }
  const C = G.call;
  if (C && C.stage === 'onscene' && !RIG.loaded && C.P && !C.refused && !C.terminated && C.P.where.scene) {
    // leaving the patient behind would be abandonment
    if (!C.leaveWarn) { C.leaveWarn = true; toast('You can\'t leave without the patient. (Press again to leave anyway.)', 'bad'); return false; }
    addHarm(C, 'Left the scene without the patient');
    finishCall('abandoned');
  }
  G.where = 'cab'; PLAYER.model.root.visible = false;
  if (PARTNER.task !== 'back') { PARTNER.task = 'cab'; PARTNER.model.root.visible = false; PARTNER.carry = null; PARTNER.gear = false; }
  CAM.userYaw = 0; CAM.userPitch = 0; snapCam();
  bus.emit('enterCab');
  return true;
}

// ---------- doors ----------
function placeDoor() { const p = G.call && G.call.place; return p && G.call.indoor ? { x: p.x, z: p.z, yaw: p.yaw } : null; }
function goInside() {
  const I = SCENE.int, C = G.call; if (!I) return;
  if (PLAYER.push && I.stairs) { toast(`The stretcher won't make the turns on a walk-up to the ${ordinal(C.floor)} floor. Leave it here and bring the stair chair or scoop.`, 'bad'); return; }
  if (PLAYER.push && EQ.stretcher.P) return;
  fade(() => {
    PLAYER.sp = 'int'; PLAYER.x = I.door.x; PLAYER.z = I.door.z - 0.4; PLAYER.yaw = Math.PI;
    setEnv('interior'); CITY.interior = { floorY: 0 };
    CAM.userYaw = 0; CAM.userPitch = 0.25; snapCam();
    if (C.floor > 1) callLog(C, 'Ricky', `Up to the ${ordinal(C.floor)} floor${C.place.access === 'elevator' ? ' in the elevator' : ' by the stairs'}.`);
    // the family member follows us in
    if (SCENE.bys && SCENE.bys.inSpot && !SCENE.bys.moved) { const b = SCENE.bys; b.moved = true; b.x = b.inSpot.x; b.z = b.inSpot.z; b.m.root.position.set(b.x, 0, b.z); b.m.root.rotation.y = Math.PI; b.pose = 'arms'; }
    if (PARTNER.task === 'follow') { PARTNER.sp = 'int'; PARTNER.x = I.door.x + 0.8; PARTNER.z = I.door.z - 0.3; }
    for (const e of Object.values(EQ)) if (e.by === 'ricky') e.sp = 'int';
    if (C.floor > 1) G.clockT += C.floor * 15;
  });
}
function goOutside() {
  const C = G.call, d = placeDoor(); if (!d) return;
  const carrying = carriedPatientDevice();
  fade(() => {
    if (carrying && C.floor > 1) { const t = C.floor * (C.place.access === 'elevator' ? 20 : 45); G.clockT += t; advanceCall(t); callLog(C, 'Ricky', C.place.access === 'elevator' ? 'Down in the elevator.' : `Carried down ${C.floor - 1} flight${C.floor > 2 ? 's' : ''} of stairs.`); }
    PLAYER.sp = 'city'; PLAYER.x = d.x; PLAYER.z = d.z; PLAYER.yaw = d.yaw;
    setEnv('city'); CITY.interior = null;
    CAM.userYaw = d.yaw + Math.PI; CAM.userPitch = 0; snapCam();
    if (PARTNER.sp === 'int' && (PARTNER.task === 'follow' || PARTNER.task === 'carry' || PARTNER.task === 'kneel')) { PARTNER.sp = 'city'; PARTNER.x = d.x + 0.9; PARTNER.z = d.z; if (PARTNER.task === 'kneel') PARTNER.task = 'follow'; }
    for (const e of Object.values(EQ)) if (e.by === 'ricky') e.sp = 'city';
    if (carrying && carrying.P) { carrying.P.where.scene = 'city'; }
  });
}
// time passing in one lump (stairs): run the patient forward with whatever care is ongoing
function advanceCall(gsec) { const C = G.call; if (!C) return; for (let t = 0; t < gsec; t += 2) { C.t += 2; const ctx = careContext(C); for (const P of C.patients) tickPatient(P, 2, ctx); } }
function fade(fn) { const f = $('#fade'); if (!f || DEBUG) { fn(); return; } f.classList.add('on'); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 60); }, 260); }

// ---------- equipment ----------
function carriedPatientDevice() { for (const e of Object.values(EQ)) if (e.P && (e.by === 'ricky')) return e; return null; }
function takeFromRig(id) {
  const e = EQ[id];
  if (e.at !== 'rig') return;
  if (PLAYER.push || PLAYER.carry) { toast('Your hands are full.', 'bad'); return; }
  e.at = 'held'; e.by = 'ricky'; e.sp = 'city'; e.model.g.visible = true;
  if (id === 'stretcher') { PLAYER.push = true; setStretcher(e.model, 1, 0); }
  else PLAYER.carry = id;
  G.call && (G.call.devices[id] = true);
  closePanel('rear');
}
function stowToRig(id) {
  const e = EQ[id]; if (e.P) return;
  e.at = 'rig'; e.by = null; e.model.g.visible = false;
  if (id === 'stretcher') PLAYER.push = false; else if (PLAYER.carry === id) PLAYER.carry = null;
  closePanel('rear');
}
function dropHeld() {
  if (PLAYER.push) { const e = EQ.stretcher; if (e.P && !e.P.loading) { /* keep the patient on it */ } e.at = 'ground'; e.by = null; PLAYER.push = false; return; }
  if (PLAYER.carry) { const e = EQ[PLAYER.carry]; e.at = 'ground'; e.by = null; PLAYER.carry = null; }
}
function pickUp(e) {
  if (PLAYER.push || PLAYER.carry) return;
  e.at = 'held'; e.by = 'ricky';
  if (e.id === 'stretcher') PLAYER.push = true; else PLAYER.carry = e.id;
}
// Marisol fetches a device from the rig and brings it to the patient
function partnerFetch(id) {
  const e = EQ[id];
  if (e.at !== 'rig') { toast(DEVICES[id].name + ' is already out.', 'bad'); return; }
  if (PARTNER.task === 'fetch') { toast(PARTNER_NAME() + ' is already fetching something.', 'bad'); return; }
  stopWorker('partner');
  PARTNER.task = 'fetch'; PARTNER.fetch = { id, phase: 'out' };
  partnerSay(`Getting the ${DEVICES[id].short}.`);
}
const PARTNER_NAME = () => PARTNER_SHORT;
const PARTNER_SHORT = 'Marisol';
function equipNearPatient(P, id, r = 4.5) {
  const e = EQ[id]; if (!P.where || e.P) return false;
  if (!(e.at === 'ground' || e.at === 'held')) return false;
  const sp = P.where.scene === 'interior' ? 'int' : 'city';
  if (e.sp !== sp) return false;
  return dist(e.x, e.z, P.where.x, P.where.z) < r;
}

// ---------- packaging and moving the patient ----------
const MOVES = [
  { id: 'stretcher', name: 'Onto the stretcher', dev: 'stretcher', dur: 35 },
  { id: 'chair', name: 'Into the stair chair', dev: 'chair', dur: 35 },
  { id: 'scoop', name: 'Onto the scoop stretcher', dev: 'scoop', dur: 60 },
  { id: 'board', name: 'Log-roll onto the long board', dev: 'board', dur: 60 },
  { id: 'walk', name: 'Help them walk to the stretcher', dev: null, dur: 25 },
];
function moveNeed(P, m) {
  if (P.carried) return 'Already packaged';
  if (P.conds.labor && !P.conds.labor.born && P.conds.labor.crown > 0.65) return 'The baby is coming: deliver here';
  if (m.dev && !equipNearPatient(P, m.dev)) return `Bring the ${DEVICES[m.dev].short} next to the patient`;
  if (m.dev && m.dev !== 'stretcher' && !nearPartner(P)) return PARTNER_SHORT + ' needs to be here to lift';
  if (m.id === 'stretcher' && P.where.scene === 'interior' && SCENE.int && SCENE.int.stairs) return 'No stretcher up these stairs';
  if (m.id === 'walk') {
    if (P.avpu !== 'A' || P.arrest) return 'Patient can\'t walk';
    if (!EQ.stretcher || !(EQ.stretcher.at === 'ground' || EQ.stretcher.at === 'held') || EQ.stretcher.sp !== (P.where.scene === 'interior' ? 'int' : 'city') || dist(EQ.stretcher.x, EQ.stretcher.z, P.where.x, P.where.z) > 14) return 'Bring the stretcher close first';
  }
  if (m.id === 'chair' && (P.avpu !== 'A' && P.avpu !== 'V')) return 'Patient can\'t sit up in a chair';
  return null;
}
function moveHarm(P, m, C) {
  if (P.spine.risk && !P.spine.collar && m.id !== 'board' && m.id !== 'scoop') return 'Moved a possible spinal injury without a collar';
  if (P.spine.risk && (m.id === 'walk' || m.id === 'chair')) return 'Walked or sat up a possible spinal injury';
  if (m.id === 'walk' && (P.conds.fracture && (P.conds.fracture.femur || P.conds.fracture.hip || /leg|shin/.test(P.conds.fracture.site)))) return 'Made a patient walk on a broken leg';
  if (m.id === 'chair' && P.conds.fracture && (P.conds.fracture.hip || P.conds.fracture.femur)) return 'Sat a hip or thigh fracture in the stair chair';
  if (m.id === 'walk' && (P.v.sbp < 95 || P.conds.stemi || P.conds.stroke || P.conds.chf || (P.conds.asthma && P.conds.asthma.sev > 0.4) || effLoss(P) > 600)) return 'Walked a patient who was too sick to walk';
  if (P.arrest && C.t - (C.times.contact || C.t) < 600 && !C.tpl.trauma) return 'Moved a cardiac arrest before working it on scene';
  if (P.conds.fracture && !P.conds.fracture.splinted && (m.id !== 'walk')) { P.conds.fracture.moved = true; return null; }
  return null;
}
function nearPartner(P) { return (PARTNER.sp === (P.where.scene === 'interior' ? 'int' : 'city') && dist(PARTNER.x, PARTNER.z, P.where.x, P.where.z) < 4 && PARTNER.task !== 'fetch') || medicCanReach(P); }
// start the timed move; finishes in completeMove
function startMove(P, id) {
  const m = MOVES.find((q) => q.id === id), C = G.call;
  const why = moveNeed(P, m); if (why) { toast(why, 'bad'); return; }
  const h = moveHarm(P, m, C); if (h) addHarm(C, h);
  if (P.spine.risk && P.spine.injured && !P.spine.collar) P.spine.violated = true;
  stopWorker('ricky'); stopWorker('partner', true); stopWorker('medic', true);
  if (!C.moveDevice) C.moveDevice = m.dev || 'walk';
  startWork('ricky', { id: 'move:' + id, name: m.name, dur: m.dur, move: m });
  if (m.dev && m.dev !== 'stretcher') { const helper = partnerCanReach(P) ? 'partner' : 'medic'; startWork(helper, { id: 'assist', name: 'Helping lift', dur: m.dur }); }
}
function completeMove(P, m) {
  const C = G.call;
  if (m.id === 'walk') {
    const e = EQ.stretcher;
    P.walkTo = e; // walks to the stretcher, then sits on it
    putOnDevice(P, e);
    callLog(C, 'Ricky', `${P.first} walks to the stretcher with help.`);
    return;
  }
  const e = EQ[m.dev];
  putOnDevice(P, e);
  if (m.id === 'board' || m.id === 'scoop') P.spine.board = true;
  callLog(C, 'Ricky', m.name.replace('Onto', 'On').replace('Into', 'In') + '.');
  // Ricky takes the head end; the patient goes where the device goes
  if (e.id !== 'stretcher') { e.at = 'held'; e.by = 'ricky'; PLAYER.carry = e.id; PLAYER.push = false; PARTNER.task = 'carry'; }
  else { e.at = 'held'; e.by = 'ricky'; PLAYER.push = true; PLAYER.carry = null; PARTNER.task = 'follow'; }
  closePanel('care');
}
function putOnDevice(P, e) {
  e.P = P; P.carried = e.id;
  const M = P.model;
  if (P.person) { const i = SCENE.people.indexOf(P.person); if (i >= 0) SCENE.people.splice(i, 1); }
  R.scene.remove(M.root);
  if (e.id === 'stretcher') {
    e.model.deck.add(M.root); M.root.position.set(0, 0.06, 0.05); M.root.rotation.set(0, 0, 0); e.model.gear.visible = false;
    setStretcher(e.model, 1, P.position === 'fowler' || P.position === 'sitting' ? 1 : 0);
  } else if (e.id === 'chair') { e.model.g.add(M.root); M.root.position.set(0, 0.06, 0.02); M.root.rotation.set(0, 0, 0); }
  else { e.model.g.add(M.root); M.root.position.set(0, 0.04, 0); M.root.rotation.set(0, Math.PI, 0); }
  snapPose(M, patientPose(P));
}
// a carry device meets the stretcher
function transferToStretcher() {
  const d = carriedPatientDevice(); if (!d || d.id === 'stretcher') return;
  const P = d.P, s = EQ.stretcher;
  if (s.at === 'rig') { const rr = rigRear(); s.at = 'ground'; s.by = null; s.sp = 'city'; s.x = rr.x; s.z = rr.z; s.yaw = RIG.yaw; s.model.g.visible = true; setStretcher(s.model, 1, 0); }
  startWork('ricky', { id: 'transfer', name: 'Moving to the stretcher', dur: 25, fn: () => {
    d.model.g.remove(P.model.root); d.P = null; d.at = 'rig'; d.by = null; d.model.g.visible = false; PLAYER.carry = null;
    putOnDevice(P, s); s.at = 'held'; s.by = 'ricky'; PLAYER.push = true; PARTNER.task = 'follow';
    callLog(G.call, 'Ricky', 'Onto the stretcher.');
  } });
}
// slide the stretcher into the rig
function loadPatient() {
  const s = EQ.stretcher, P = s.P, C = G.call; if (!P) return;
  closePanel('rear');
  startWork('ricky', { id: 'load', name: 'Loading', dur: 18 * RIGS[RIG.type].load + 6 + equipDelay('load'), fn: () => {
    s.at = 'rig'; s.by = null; s.model.g.visible = false; PLAYER.push = false; RIG.loaded = P;
    P.where = { scene: 'rig' }; RIG.doors = 0;
    callLog(C, 'Ricky', 'Patient loaded.');
    bus.emit('loaded', P);
    openTransportPanel();
  } });
  RIG.doors = 1;
}
function unloadPatient() {
  const s = EQ.stretcher, P = RIG.loaded; if (!P) return;
  RIG.doors = 1;
  s.at = 'held'; s.by = 'ricky'; s.sp = 'city'; s.model.g.visible = true; s.P = P; PLAYER.push = true; RIG.loaded = null;
  if (G.where === 'back') { G.where = 'foot'; setEnv('city'); PLAYER.model.root.visible = true; }
  const r = rigRear(); PLAYER.x = r.x - Math.sin(RIG.yaw) * 1.4; PLAYER.z = r.z - Math.cos(RIG.yaw) * 1.4; PLAYER.yaw = RIG.yaw + Math.PI; PLAYER.sp = 'city';
  P.where = { scene: 'city', x: PLAYER.x, z: PLAYER.z };
  if (PARTNER.task !== 'follow') { const q = rigRear(); Object.assign(PARTNER, { x: q.x + 1, z: q.z, sp: 'city', task: 'follow' }); PARTNER.model.root.visible = true; }
  CAM.userYaw = RIG.yaw + Math.PI / 2; snapCam();
  setTimeout(() => { if (RIG) RIG.doors = 0; }, 1500);
}

// ---------- the update ----------
function updatePlayer(dt) {
  if (G.where !== 'foot') return;
  const busy = PLAYER.busy > 0 || UI.blocking();
  const mv = busy ? { x: 0, y: 0 } : Input.move();
  const spd = PLAYER.push ? SPEED.push : PLAYER.carry ? SPEED.carry : Input.held('run') ? SPEED.run : SPEED.walk;
  // camera-relative movement
  const cy = CAM.userYaw, fx = -Math.sin(cy), fz = -Math.cos(cy), rx = -fz, rz = fx;
  let mx = rx * mv.x - fx * mv.y, mz = rz * mv.x - fz * mv.y;
  const l = Math.hypot(mx, mz);
  if (l > 0.05) {
    const tY = Math.atan2(mx, mz);
    PLAYER.yaw = angTo(PLAYER.yaw, tY, dt * (PLAYER.push || PLAYER.carry ? 2.4 : 10));
    const k = PLAYER.push || PLAYER.carry ? Math.max(0, Math.cos(angWrap(tY - PLAYER.yaw))) : 1;
    let nx = PLAYER.x + Math.sin(PLAYER.yaw) * spd * Math.min(1, l) * k * dt, nz = PLAYER.z + Math.cos(PLAYER.yaw) * spd * Math.min(1, l) * k * dt;
    const r = PLAYER.push ? 0.5 : 0.35;
    if (PLAYER.sp === 'int') { const q = collideInterior(nx, nz, r); nx = q.x; nz = q.z; }
    else { const q = collideCircle(nx, nz, r, 0.4); nx = q.x; nz = q.z; const q2 = collideRigBody(nx, nz, r); nx = q2.x; nz = q2.z; }
    // the pushed stretcher also has to fit
    if (PLAYER.push) {
      const sx = nx + Math.sin(PLAYER.yaw) * 1.5, sz = nz + Math.cos(PLAYER.yaw) * 1.5;
      if (PLAYER.sp === 'int') { const q = collideInterior(sx, sz, 0.45); nx += q.x - sx; nz += q.z - sz; }
      else { const q = collideCircle(sx, sz, 0.45, 0.4); nx += q.x - sx; nz += q.z - sz; }
    }
    PLAYER.v = Math.hypot(nx - PLAYER.x, nz - PLAYER.z) / dt;
    PLAYER.x = nx; PLAYER.z = nz;
  } else PLAYER.v = 0;
  PLAYER.y = PLAYER.sp === 'int' ? 0 : groundY(PLAYER.x, PLAYER.z);
  const M = PLAYER.model;
  M.root.position.set(PLAYER.x, PLAYER.y, PLAYER.z); M.root.rotation.y = PLAYER.yaw;
  let pose = PLAYER.push ? 'push' : PLAYER.carry ? 'carry' : 'stand';
  if (PLAYER.busy > 0 && PLAYER.workPose) pose = PLAYER.workPose;
  posePerson(M, pose, dt, PLAYER.v / 3);
  // held equipment follows
  for (const e of Object.values(EQ)) {
    if (e.by === 'ricky') {
      const ahead = e.id === 'stretcher' ? 1.55 : e.P ? 1.0 : 0.55;
      e.x = PLAYER.x + Math.sin(PLAYER.yaw) * ahead; e.z = PLAYER.z + Math.cos(PLAYER.yaw) * ahead; e.yaw = PLAYER.yaw; e.sp = PLAYER.sp;
      if (e.P && e.P.where) { e.P.where.x = e.x; e.P.where.z = e.z; e.P.where.scene = PLAYER.sp === 'int' ? 'interior' : 'city'; }
    }
    if (e.at === 'held' || e.at === 'ground') {
      const g = e.model.g; g.visible = true;
      const y = e.sp === 'int' ? 0 : groundY(e.x, e.z);
      if (e.id === 'stretcher') { g.position.set(e.x, y, e.z); g.rotation.y = e.yaw + Math.PI; }
      else if (e.P) { g.position.set(e.x, y + (e.id === 'chair' ? 0.1 : 0.55), e.z); g.rotation.y = e.yaw + (e.id === 'chair' ? Math.PI : 0); }
      else if (e.by) { g.position.set(e.x, y + 0.3, e.z); g.rotation.y = e.yaw; g.rotation.z = e.id === 'chair' ? 0 : 0; }
      else { g.position.set(e.x, y, e.z); g.rotation.y = e.yaw; }
    }
  }
}
// keep people out of the rig's body
function collideRigBody(x, z, r) {
  if (!RIG) return { x, z };
  const fx = Math.sin(RIG.yaw), fz = Math.cos(RIG.yaw);
  const dx = x - RIG.x, dz = z - RIG.z, a = dx * fx + dz * fz, b = -dx * fz + dz * fx;
  const hl = RIG.len / 2 + r, hw = RIG.wid / 2 + r;
  if (Math.abs(a) < hl && Math.abs(b) < hw) {
    const pa = hl - Math.abs(a), pb = hw - Math.abs(b);
    if (pa < pb) { const s = Math.sign(a) || 1; return { x: x + fx * pa * s, z: z + fz * pa * s }; }
    const s = Math.sign(b) || 1; return { x: x - fz * pb * s, z: z + fx * pb * s };
  }
  return { x, z };
}

function partnerSay(text) { radio(PARTNER_SHORT, text, 'partner'); }
function updatePartner(dt) {
  const T = PARTNER, M = T.model;
  if (T.task === 'cab' || T.task === 'drive' || T.task === 'back') { M.root.visible = false; return; }
  M.root.visible = true;
  const C = G.call;
  let tx = T.x, tz = T.z, tsp = T.sp, pose = 'stand', face = null;
  const P = C && C.P;
  const pSp = P && P.where ? (P.where.scene === 'interior' ? 'int' : P.where.scene === 'rig' ? 'rig' : 'city') : null;
  if (T.task === 'fetch') {
    const F = T.fetch, e = EQ[F.id];
    if (F.phase === 'out') {
      if (T.sp === 'int') { tx = SCENE.int.door.x; tz = SCENE.int.door.z; tsp = 'int'; if (dist(T.x, T.z, tx, tz) < 0.8) { const d = placeDoor(); T.sp = 'city'; T.x = d.x; T.z = d.z; } }
      else { const r = rigRear(); tx = r.x; tz = r.z; tsp = 'city'; if (dist(T.x, T.z, tx, tz) < 1.2) { F.phase = 'back'; e.at = 'held'; e.by = 'partner'; e.sp = 'city'; e.model.g.visible = true; if (C) C.devices[F.id] = true; } }
    } else {
      // bring it to the patient (or Ricky if the patient is on the move)
      const goal = P && P.where && P.where.x !== undefined && !P.carried ? P.where : PLAYER;
      const gSp = goal === PLAYER ? PLAYER.sp : pSp;
      if (gSp === 'int' && T.sp === 'city') {
        const d = placeDoor(); tx = d.x; tz = d.z;
        if (dist(T.x, T.z, tx, tz) < 1.0) {
          if (F.id === 'stretcher' && SCENE.int && SCENE.int.stairs) { e.at = 'ground'; e.by = null; e.x = d.x + 1; e.z = d.z; T.task = 'follow'; partnerSay('The stretcher won\'t fit up the stairs. I left it by the door.'); }
          else { T.sp = 'int'; T.x = SCENE.int.door.x; T.z = SCENE.int.door.z - 0.4; e.sp = 'int'; }
        }
      } else {
        tx = goal.x + 1.4; tz = goal.z + 1.1;
        if (dist(T.x, T.z, tx, tz) < 1.0) { e.at = 'ground'; e.by = null; e.x = goal.x + 0.2 + (F.id === 'stretcher' ? 1.8 : 1.0); e.z = goal.z + 0.8; e.yaw = 0; e.sp = T.sp; T.task = 'kneel'; partnerSay(`${DEVICES[F.id].name} is here.`); }
      }
    }
    if (e.by === 'partner') { e.x = T.x + Math.sin(T.yaw) * (F.id === 'stretcher' ? 1.5 : 0.5); e.z = T.z + Math.cos(T.yaw) * (F.id === 'stretcher' ? 1.5 : 0.5); e.yaw = T.yaw; e.sp = T.sp; }
    pose = e.by === 'partner' ? (F.id === 'stretcher' ? 'push' : 'carry') : 'stand';
  } else if (T.task === 'carry') {
    // the foot end of a carried patient
    const d = carriedPatientDevice();
    if (!d) T.task = 'follow';
    else { tx = d.x + Math.sin(PLAYER.yaw) * 1.0; tz = d.z + Math.cos(PLAYER.yaw) * 1.0; tsp = PLAYER.sp; T.sp = PLAYER.sp; pose = 'carry'; face = PLAYER.yaw + Math.PI; }
  } else if (T.task === 'kneel' || T.workPose) {
    if (P && P.where && P.where.x !== undefined && pSp !== 'rig') { tx = P.where.x - 1.0; tz = P.where.z + 0.4; tsp = pSp; face = Math.atan2(P.where.x - tx, P.where.z - tz); }
    pose = T.workPose || 'kneel';
    if (T.task === 'kneel' && !T.busy && C && P && (P.carried || dist(PLAYER.x, PLAYER.z, P.where.x || 0, P.where.z || 0) > 6)) T.task = 'follow';
  } else {
    // follow Ricky, staying beside the stretcher if pushing
    const back = PLAYER.push ? -1.5 : 1.8;
    tx = PLAYER.x - Math.sin(PLAYER.yaw) * back + Math.cos(PLAYER.yaw) * 1.2; tz = PLAYER.z - Math.cos(PLAYER.yaw) * back - Math.sin(PLAYER.yaw) * 1.2;
    tsp = PLAYER.sp;
    if (T.sp !== tsp) { T.sp = tsp; T.x = tx; T.z = tz; }
    if (T.gear && C && P && dist(PLAYER.x, PLAYER.z, P.where.x || 1e9, P.where.z || 1e9) < 5 && !P.carried) T.task = 'kneel';
  }
  // walk there
  if (T.sp === tsp) {
    const dx = tx - T.x, dz = tz - T.z, d = Math.hypot(dx, dz);
    if (d > 45 && T.task === 'follow') { T.x = tx; T.z = tz; }
    else if (d > 0.15) {
      const sp = Math.min(d * 3, T.task === 'fetch' ? 3.6 : d > 6 ? 4.5 : 3.2) * (T.busy > 0 ? 0 : 1);
      T.yaw = angTo(T.yaw, Math.atan2(dx, dz), dt * 8);
      let nx = T.x + dx / d * sp * dt, nz = T.z + dz / d * sp * dt;
      if (T.sp === 'int') { const q = collideInterior(nx, nz, 0.33); nx = q.x; nz = q.z; } else { const q = collideCircle(nx, nz, 0.33, 0.4); nx = q.x; nz = q.z; const q2 = collideRigBody(nx, nz, 0.33); nx = q2.x; nz = q2.z; }
      T.v = Math.hypot(nx - T.x, nz - T.z) / dt; T.x = nx; T.z = nz;
    } else { T.v = 0; if (face !== null) T.yaw = angTo(T.yaw, face, dt * 6); }
  }
  T.y = T.sp === 'int' ? 0 : groundY(T.x, T.z);
  const seen = PLAYER.sp === T.sp;
  M.root.visible = seen;
  M.root.position.set(T.x, T.y, T.z); M.root.rotation.y = T.yaw;
  if (T.v > 0.3 && (pose === 'kneel' || T.workPose)) pose = 'stand';
  posePerson(M, pose, dt, T.v / 3);
  T.bag.visible = T.mon.visible = !!T.gear && pose === 'stand';
}

// ---------- interaction prompts ----------
// returns a list of { key, label, fn } for what Ricky can do right here
function interactions() {
  const out = [];
  if (G.where !== 'foot' || PLAYER.busy > 0) return out;
  const C = G.call, P = C && C.P;
  const near = (x, z, r) => dist(PLAYER.x, PLAYER.z, x, z) < r;
  if (PLAYER.sp === 'city' && RIG) {
    const dd = rigDriverDoor(), rr = rigRear();
    if (near(dd.x, dd.z, 2.0) && !PLAYER.push && !PLAYER.carry) out.push({ label: 'Get in and drive', fn: enterCab, kind: 'cab' });
    if (near(rr.x, rr.z, 2.6)) {
      if (PLAYER.push && EQ.stretcher.P && C && C.stage !== 'hospital') out.push({ label: 'Load the patient', fn: loadPatient });
      else if (C && C.stage === 'hospital' && RIG.loaded) out.push({ label: 'Unload the patient', fn: unloadPatient });
      else out.push({ label: 'Rear doors (equipment)', fn: () => openRearPanel() });
    }
    if (RIG.loaded && near(rr.x, rr.z, 2.6) && C && C.stage !== 'hospital') out.push({ label: 'Climb in back', fn: () => climbInBack() });
  }
  // coffee between calls
  const cs = coffeeSpot(); if (cs) out.push({ label: `Grab a coffee at ${cs.name}${cs.cost ? ' (' + fmtMoney(cs.cost) + ')' : ''}`, fn: () => grabCoffee(cs) });
  // mass-casualty triage before anyone gets treated
  if (C && C.mci && !C.mci.sent) {
    for (const Q of C.mci.pts) if (Q.where.scene === 'city' && near(Q.where.x, Q.where.z, 2.4)) out.push({ label: `Triage patient ${C.mci.pts.indexOf(Q) + 1}${C.mci.tags.has(Q) ? ' (' + TAGS[C.mci.tags.get(Q)].name.toLowerCase() + ')' : ''}`, fn: () => openTriage(Q), kind: 'care' });
    if (C.mci.tags.size === C.mci.pts.length) out.push({ label: 'Radio the command report', fn: sendMCIReport, key: 'R' });
    return out;
  }
  if (C && P && P.where && !P.carried && P.where.scene !== 'rig') {
    const sp = P.where.scene === 'interior' ? 'int' : 'city';
    if (sp === PLAYER.sp && near(P.where.x, P.where.z, 2.6) && !PLAYER.push && !PLAYER.carry) out.push({ label: `Care for ${P.first}`, fn: () => openCare(P), kind: 'care' });
  }
  // a stretcher or device lying around
  if (!PLAYER.push && !PLAYER.carry) for (const e of Object.values(EQ)) if (e.at === 'ground' && e.sp === PLAYER.sp && near(e.x, e.z, 2.2) && (!e.P || e.id === 'stretcher')) out.push({ label: (e.id === 'stretcher' ? 'Push the stretcher' : 'Pick up the ' + DEVICES[e.id].short), fn: () => pickUp(e) });
  if (PLAYER.push || PLAYER.carry) {
    const held = PLAYER.push ? EQ.stretcher : EQ[PLAYER.carry];
    if (held.P && held.id !== 'stretcher' && EQ.stretcher.at === 'ground' && EQ.stretcher.sp === PLAYER.sp && near(EQ.stretcher.x, EQ.stretcher.z, 3.2)) out.push({ label: 'Transfer to the stretcher', fn: transferToStretcher });
    // hands full with a carried patient: pull the stretcher out at the rear doors
    if (held.P && held.id !== 'stretcher' && EQ.stretcher.at === 'rig' && PLAYER.sp === 'city' && RIG) { const rr = rigRear(); if (near(rr.x, rr.z, 3.5)) out.unshift({ label: 'Pull out the stretcher and transfer', fn: transferToStretcher }); }
    if (!held.P) out.push({ label: 'Set it down', fn: dropHeld, key: 'Q' });
  }
  // doors
  if (C && C.indoor && SCENE.int) {
    const d = placeDoor();
    if (PLAYER.sp === 'city' && near(d.x, d.z, 2.4)) out.push({ label: C.floor > 1 ? `Go in (${ordinal(C.floor)} floor)` : 'Go inside', fn: goInside, kind: 'door' });
    if (PLAYER.sp === 'int' && near(SCENE.int.door.x, SCENE.int.door.z, 1.8)) out.push({ label: 'Go outside', fn: goOutside, kind: 'door' });
  }
  // the ER doors
  if (C && C.stage === 'hospital' && C.dest && PLAYER.sp === 'city') {
    const H = CITY.hospitals[C.dest];
    if (near(H.door.x, H.door.z, 4) && PLAYER.push && EQ.stretcher.P) out.unshift({ label: 'Hand off to the ER team', fn: () => openHandoff() });
  }
  // people
  for (const p of SCENE.people) {
    if (p.role === 'cop' && PLAYER.sp === 'city' && near(p.x, p.z, 2.5)) out.push({ label: 'Talk to the officer', fn: () => radio('PD', C && C.pdCleared ? 'Scene\'s secure. Patient is ' + (C.indoor ? 'inside.' : 'right over there.') : 'Hang back, we\'re still clearing it.') });
    if (p.role === 'bystander' && near(p.x, p.z, 2.3) && C && C.bystander && ((p.inside === false && PLAYER.sp === 'city') || (p.moved && PLAYER.sp === 'int') || (!C.indoor && PLAYER.sp === 'city'))) out.push({ label: `Talk to the ${C.bystander.rel.toLowerCase()}`, fn: () => talkBystander(C) });
  }
  return out;
}
function talkBystander(C) {
  const P = C.P, b = C.bystander;
  const lines = [P.hist.E, P.hist.P ? 'History: ' + P.hist.P + '.' : '', P.hist.M && P.hist.M !== 'unknown' ? 'Takes ' + P.hist.M + '.' : ''];
  if (P.hist.lkw) lines.push('Last seen normal ' + P.hist.lkw + '.');
  if (C.indoor && PLAYER.sp === 'city') lines.unshift(`${P.first} is ${C.floor > 1 ? 'up on the ' + ordinal(C.floor) + ' floor' : 'inside'}, please hurry!`);
  radio(b.rel, lines.filter(Boolean).join(' '), 'bystander');
  P.known.add('bystanderTalk');
}
function climbInBack() {
  G.where = 'back'; PLAYER.model.root.visible = false;
  if (PARTNER.task !== 'drive') { PARTNER.task = 'drive'; PARTNER.model.root.visible = false; }
  enterRigBack();
}
