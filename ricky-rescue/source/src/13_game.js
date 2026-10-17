// Ricky Rescue — game state, the shift clock, dispatch and the call lifecycle
//
// Stages of a call: 'pending' (radio has it, waiting for Medic 12 to respond) → 'enroute' → 'staging' (unsafe
// scene, wait for police) → 'onscene' → 'transport' → 'hospital' → 'done' (review shown, back in service).

const G = {
  mode: 'title', career: null, shift: null, call: null, clockT: 9 * 3600, speed: 1, where: 'cab', env: 'city',
  paused: false, debug: false, lastCall: null, msgs: [],
};

function newCareer(o = {}) {
  return {
    v: 1, name: o.name || 'Ricky', look: Object.assign({ skin: SKINS[2], hair: HAIRS[1], style: 'short' }, o.look || {}),
    xp: 0, rank: 0, money: 400, rigs: ['van'], rig: 'van', livery: 'classic', liveries: ['classic'], lightPat: 'alt', lightPats: ['alt'], lightCol: 'redwhite', lightCols: ['redwhite'],
    uniform: 'navy', uniforms: ['navy'], districts: ['maple'],
    stats: { shifts: 0, calls: 0, saves: 0, rosc: 0, deliveries: 0, grades: { A: 0, B: 0, C: 0, D: 0, F: 0 }, best: null, km: 0, crashes: 0 },
    hist: [], tips: {},
  };
}
// unlock districts from rank and xp; returns newly unlocked names
function updateUnlocks(C) {
  const out = [];
  C.rank = Math.max(C.rank, rankFor(C.xp));
  for (const [id, d] of Object.entries(DISTRICTS)) if (!C.districts.includes(id) && C.rank >= d.rank && C.xp >= d.xp) { C.districts.push(id); out.push(d.name); }
  return out;
}

// ---------- the shift ----------
function startShift(o = {}) {
  const C = G.career;
  const startH = o.hour !== undefined ? o.hour : 7;
  G.clockT = startH * 3600;
  G.shift = { startH, hours: o.hours || 8, endT: (startH + (o.hours || 8)) * 3600, cover: o.cover || [...C.districts], results: [], nextCallT: G.clockT + (o.firstCall !== undefined ? o.firstCall : 45) * TIME_SCALE, earnings: 0, xp: 0, over: false, callsN: 0 };
  G.call = null;
  setEnv('city'); setTimeOfDay(startH);
  clearTraffic(); clearRoute(); clearScene(); resetResponders();
  const st = CITY.station;
  createRig(C.rig, st.x, st.z, st.yaw);
  RIG.siren = false;
  initCrew();
  G.where = 'cab'; G.mode = 'play'; G.speed = 1;
  CAM.yaw = st.yaw + Math.PI; snapCam();
  C.stats.shifts++;
  radio('Dispatch', `Medic 12, good ${startH < 12 ? 'morning' : 'evening'}. You're in service at Station 12. Shift ends ${fmtClock(G.shift.endT)}.`);
  bus.emit('shiftStart');
}
function endShiftNow() {
  const S = G.shift; if (!S || S.over) return;
  S.over = true;
  G.career.money += 0;
  saveGame();
  bus.emit('shiftEnd', S);
}

// advance the clock, schedule calls, tick the active call. dt is real seconds × game speed.
function updateGame(dt) {
  const gdt = dt * TIME_SCALE;
  G.clockT += gdt;
  setTimeOfDay((G.clockT / 3600) % 24);
  const S = G.shift; if (!S) return;
  if (!G.call && !S.over) {
    if (G.clockT >= S.endT) { endShiftNow(); return; }
    if (G.clockT >= S.nextCallT && G.where !== 'back') dispatchCall();
  }
  if (G.call) tickCall(gdt);
}

function dispatchCall(o = {}) {
  const r = RNG();
  const mci = !o.type && G.career.rank >= 2 && !G.shift.mciDone && r.chance(0.12);
  if (mci || o.type === 'mci') return startMCI(o);
  const pc = pickCall(r, o);
  if (!pc) { G.shift.nextCallT = G.clockT + 120; return null; }
  return startCall(pc.tpl, pc.place, r, o);
}
function startCall(tpl, place, r = RNG(), o = {}) {
  const m = tpl.make(r, place);
  const P = makePatient(m.spec, r);
  const C = {
    id: 'c' + Date.now().toString(36), tpl, type: tpl.id, nature: tpl.nature, pri: tpl.pri, place, addr: place.addr, district: place.district,
    P, patients: [P], t: 0, stage: 'pending', times: { dispatch: 0 }, acts: new Set(), actT: {}, actN: {}, log: [], harms: [], notes: [],
    ls: { enroute: false, transport: false, lsTime: 0, travel: 0 }, hazard: m.hazard || null, pdCleared: !m.hazard, mvc: !!m.mvc,
    bystCPR: !!m.bystCPR, witnessed: m.witnessed, dest: null, prealert: null, driver: null, ppe: false, devices: {},
    crashes0: RIG ? RIG.crashes : 0, startClock: G.clockT, text: m.text,
  };
  C.floor = place.access === 'elevator' || place.access === 'stairs' ? (place.kind === 'house' ? (r.chance(0.5) && place.floors > 1 ? 2 : 1) : r.int(1, Math.max(1, place.floors || 1))) : 0;
  C.dispatchText = `Medic 12, respond priority ${tpl.pri} to ${place.parkName ? place.parkName + ', ' : place.storeName ? place.storeName + ', ' : ''}${place.addr}${place.kind === 'apt' ? ', apartment ' + Math.max(1, C.floor) + String.fromCharCode(65 + r.int(0, 3)) : ''}. ${cap(ageText(P))}, ${m.text}.`;
  if (C.floor > 1) C.dispatchText += ` Patient is on the ${ordinal(C.floor)} floor${place.access === 'elevator' ? '' : ', walk-up'}.`;
  if (m.bys) C.bystander = { rel: relFor(r, P), name: r.pick(P.sex === 'F' ? FIRST_NAMES_M : FIRST_NAMES_F) };
  if (C.hazard) C.dispatchText += ' Caution: scene not secure. Stage until PD advises.';
  if (tpl.arrest && P.arrest) C.firstShockable = SHOCKABLE(P.arrest.rhythm);
  G.call = C;
  G.shift.callsN++;
  buildScene(C, r);
  // the engine company and police drive in as well when the call needs them
  dispatchResponders(C, r);
  radioTone();
  radio('Dispatch', C.dispatchText, 'dispatch');
  bus.emit('dispatch', C);
  return C;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ordinal = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');

function respond() {
  const C = G.call; if (!C || C.stage !== 'pending') return;
  C.stage = 'enroute'; C.times.respond = C.t;
  radio('Medic 12', `Medic 12 copies, responding${C.pri === 1 ? ' priority one' : ''}.`, 'crew');
  const goal = C.hazard ? stagingPoint(C) : C.place.curb;
  buildRoute(Object.assign({ ls: true }, goal), C.hazard ? 'Staging area' : C.addr);
  if (G.where === 'cab' && OPTS.autoLights && C.pri === 1) setSiren(true);
}
function setSiren(on) {
  if (!RIG) return;
  RIG.siren = on;
  const C = G.call;
  if (C && on) { if (C.stage === 'enroute' || C.stage === 'staging') C.ls.enroute = true; if (C.stage === 'transport') C.ls.transport = true; }
  if (ROUTE.goal) buildRoute(Object.assign({}, ROUTE.goal, { ls: on }), ROUTE.label);
  if (RIG.auto) RIG.auto = { pts: ROUTE.pts, i: 0 };
  bus.emit('siren', on);
}

function tickCall(gdt) {
  const C = G.call;
  C.t += gdt;
  // patients evolve the whole time, including before we arrive
  const ctx = careContext(C);
  for (const P of C.patients) tickPatient(P, gdt, ctx);
  updateWorkers(gdt);
  // stage changes from where the rig is
  if (C.stage === 'enroute' && RIG) {
    const tgt = C.hazard && !C.pdCleared ? stagingPoint(C) : C.place.curb;
    const near = dist(RIG.x, RIG.z, tgt.x, tgt.z) < (C.hazard && !C.pdCleared ? 30 : 45) && Math.abs(RIG.v) < 2;
    if (near || (G.where === 'foot' && dist(PLAYER.x, PLAYER.z, C.place.x, C.place.z) < 60)) {
      if (C.hazard && !C.pdCleared) { C.stage = 'staging'; C.times.stage = C.t; radio('Medic 12', 'Medic 12 staging, waiting on PD.', 'crew'); clearRoute(); }
      else arriveOnScene(C);
    }
  } else if (C.stage === 'staging' && C.pdCleared && RIG && dist(RIG.x, RIG.z, C.place.curb.x, C.place.curb.z) < 45 && Math.abs(RIG.v) < 2) arriveOnScene(C);
  else if (C.stage === 'staging' && C.pdCleared && G.where === 'foot' && dist(PLAYER.x, PLAYER.z, C.place.x, C.place.z) < 40) arriveOnScene(C);
  // walking into an unsafe scene
  if (C.hazard && !C.pdCleared && G.where === 'foot' && !C.enteredUnsafe && dist(PLAYER.x, PLAYER.z, C.place.x, C.place.z) < 28) {
    C.enteredUnsafe = true; addHarm(C, 'Went into an unsafe scene before police cleared it');
    toast('The scene isn\'t secure! Back off and stage.', 'bad'); radio('PD', 'Medic 12, hold back, we\'re not clear yet!');
  }
  // transport and arrival at the hospital
  if (C.stage === 'transport' && C.dest && RIG) {
    const H = CITY.hospitals[C.dest];
    if (dist(RIG.x, RIG.z, H.bay.x, H.bay.z) < 9 && Math.abs(RIG.v) < 1) arriveHospital(C);
  }
  // a refusal or a stopped resuscitation ends the call a moment later
  if ((C.terminated || C.refused) && C.stage !== 'done' && C.closeAt === undefined) C.closeAt = C.t + 10;
  if (C.closeAt !== undefined && C.t >= C.closeAt && C.stage !== 'done') finishCall(C.terminated ? 'terminated' : 'refusal');
}
function arriveOnScene(C) {
  if (C.stage === 'onscene') return;
  C.stage = 'onscene'; C.times.arrive = C.t;
  radio('Medic 12', 'Medic 12 on scene.', 'crew');
  clearRoute();
  bus.emit('arrive', C);
}
function stagingPoint(C) {
  if (C.staging) return C.staging;
  // a curb a block away from the scene
  const p = C.place, cands = CITY.places.filter((q) => q.curb && dist(q.curb.x, q.curb.z, p.x, p.z) > 90 && dist(q.curb.x, q.curb.z, p.x, p.z) < 170);
  const q = cands.length ? cands.reduce((a, b) => (dist(a.curb.x, a.curb.z, RIG.x, RIG.z) < dist(b.curb.x, b.curb.z, RIG.x, RIG.z) ? a : b)) : p;
  C.staging = Object.assign({}, q.curb);
  return C.staging;
}
function addHarm(C, text) { if (C.harms.some((h) => h.text === text)) return; C.harms.push({ t: C.t, text }); bus.emit('harm', text); }
function callLog(C, who, text) { C.log.push({ t: C.t, who, text }); bus.emit('log', who, text); }

// the call is over: score it, show the review, back in service
function finishCall(how) {
  const C = G.call; if (!C || C.stage === 'done') return;
  C.stage = 'done'; C.how = how; C.times.end = C.t;
  const res = scoreCall(C);
  G.lastCall = res;
  applyResult(res);
  G.shift.results.push(res);
  clearRoute();
  showReview(res);
  saveGame();
  bus.emit('callDone', res);
}
// after the review: clear the scene and schedule the next call
function backInService() {
  const C = G.call;
  // anyone still inside the building comes back out to the street
  if (C && C.indoor && (PLAYER.sp === 'int' || PARTNER.sp === 'int')) {
    const d = { x: C.place.x, z: C.place.z };
    if (PLAYER.sp === 'int') { PLAYER.sp = 'city'; PLAYER.x = d.x; PLAYER.z = d.z; snapCam(); }
    if (PARTNER.sp === 'int') { PARTNER.sp = 'city'; PARTNER.x = d.x + 1; PARTNER.z = d.z; }
  }
  if (R.env !== 'city') setEnv('city');
  leaveRigBack();
  releaseUnits();
  clearScene();
  resetCrewAfterCall();
  G.call = null;
  stopAllWork();
  if (RIG) { RIG.siren = false; RIG.auto = null; }
  const S = G.shift;
  S.nextCallT = G.clockT + rnd.range(3, 9) * 60;
  radio('Medic 12', 'Medic 12 is back in service.', 'crew');
  saveGame();
  if (G.clockT >= S.endT) endShiftNow();
}
// skip the quiet time until the next call
function skipToCall() {
  if (G.call || !G.shift || G.shift.over) return;
  G.clockT = Math.max(G.clockT, G.shift.nextCallT - 5);
  if (G.clockT >= G.shift.endT) endShiftNow();
}
