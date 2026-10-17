// Ricky Rescue — mass-casualty incidents: a bus crash with six to eight patients. Medic 12 is first in, so Ricky
// triages everyone with START (walk? breathing? rate over 30? radial pulse? follows commands?), tags them, sends the
// report, and then treats and transports the most critical red tag while other units take the rest.

const TAGS = { green: { name: 'Minor', col: 0x3ac060, css: '#3ac060' }, yellow: { name: 'Delayed', col: 0xf0c020, css: '#f0c020' }, red: { name: 'Immediate', col: 0xe02828, css: '#e02828' }, black: { name: 'Expectant', col: 0x202020, css: '#555' } };
const MCI_TPL = {
  id: 'mci', nature: 'Bus crash, multiple patients', cat: 'MCI', rank: 2, pri: 1, dest: 'trauma', alert: 'trauma', sceneGoal: 20 * 60, transportLS: () => true, trauma: true,
  checks: [
    { kind: 'crit', text: 'Everyone triaged', test: (C) => C.mci.pts.every((p) => C.mci.tags.has(p)) },
    { kind: 'crit', text: 'No immediate (red) patient under-triaged', test: (C) => C.mci.pts.every((p) => (p.triageTrue || p.triage) !== 'red' || C.mci.tags.get(p) === 'red') },
    { kind: 'good', text: 'Triage finished within 6 minutes of arrival', test: (C) => C.mci.doneT !== undefined && C.mci.doneT - (C.times.arrive || 0) < 360 },
    { kind: 'good', text: 'Triage accuracy over 80%', test: (C) => mciAccuracy(C) >= 0.8 },
    { kind: 'crit', text: 'Life threats on your patient treated', test: (C) => C.P.bleeds.every((b) => b.ctrl !== 'none') && (!C.P.conds.pneumo || C.P.conds.pneumo.decomp) },
  ],
};
// the right tag is judged on the patient's state at the moment they were tagged
function mciAccuracy(C) { const n = C.mci.pts.length; let k = 0; for (const p of C.mci.pts) if (C.mci.tags.get(p) === (p.triageTrue || p.triage)) k++; return k / n; }
// START from the patient's state: returns the right tag
function startTag(P) {
  if (P.flags.walks) return 'green';
  if (P.arrest || P.flags.apneic) return P.flags.apneicOpens ? 'red' : 'black';
  if (P.v.rr > 30) return 'red';
  if (P.v.sbp < 80) return 'red';
  if (P.v.gcs < 13) return 'red';
  return 'yellow';
}
function startMCI(o = {}) {
  const r = RNG();
  const ds = G.career.districts.filter((d) => G.shift.cover.includes(d));
  const d = o.district || r.pick(ds);
  const cands = roadPlaces(d, r).filter((p) => p.edge.lanes === 2);
  const place = (cands.length ? r.pick(cands) : r.pick(roadPlaces(d, r)));
  const n = r.int(6, 8);
  // a mix: two reds, two or three yellows, some walking wounded, perhaps one who can't be saved
  const kinds = ['redBleed', 'redPneumo', 'yellowFemur', 'yellowArm', 'green', 'green', 'redHead', 'black', 'yellowBack'].slice(0, n);
  r.shuffle(kinds);
  const pts = [];
  for (const k of kinds) {
    const spec = { age: r.int(16, 75), pose: 'lie', position: 'supine', place: 'ground', conds: {}, flags: {}, hist: { S: 'injured in the crash', A: 'unknown', M: 'unknown', P: 'unknown', L: 'unknown', E: 'Passenger on the bus.' }, spine: { risk: true } };
    if (k === 'redBleed') { spec.bleeds = [{ site: 'right thigh', kind: 'arterial', rate: 220, limb: true }]; spec.loss = 1300; }
    if (k === 'redPneumo') { spec.conds.pneumo = { sev: 0.65, side: 'right' }; }
    if (k === 'redHead') { spec.conds.tbi = { sev: 0.55, grow: 0.0001 }; }
    if (k === 'yellowFemur') { spec.conds.fracture = { site: 'left thigh', femur: true, desc: 'Left thigh deformed' }; spec.internal = 15; }
    if (k === 'yellowArm') { spec.conds.fracture = { site: 'right forearm', desc: 'Right forearm deformed' }; spec.pose = 'sitGround'; }
    if (k === 'yellowBack') { spec.injuries = [{ desc: 'Back pain, can\'t feel the legs well' }]; spec.spine.injured = true; }
    if (k === 'green') { spec.flags.walks = true; spec.pose = r.chance(0.5) ? 'arms' : 'sitGround'; spec.injuries = [{ desc: 'Cuts and bruises', minor: true }]; }
    if (k === 'black') { spec.arrest = 'asys'; spec.arrestCause = 'bleed'; spec.downtime = 1500; spec.flags.apneic = true; }
    const P = makePatient(spec, r);
    P.mciKind = k;
    P.triage = startTag(P);
    pts.push(P);
  }
  // our patient: the worst red
  const main = pts.find((p) => p.mciKind === 'redBleed') || pts.find((p) => p.triage === 'red') || pts[0];
  const C = {
    id: 'mci' + Date.now().toString(36), tpl: MCI_TPL, type: 'mci', nature: MCI_TPL.nature, pri: 1, place, addr: place.addr, district: d,
    P: main, patients: pts, t: 0, stage: 'pending', times: { dispatch: 0 }, acts: new Set(), actT: {}, actN: {}, log: [], harms: [], notes: [],
    ls: { enroute: false, transport: false }, hazard: null, pdCleared: true, mvc: true, dest: null, prealert: null, ppe: false, devices: {},
    crashes0: RIG ? RIG.crashes : 0, startClock: G.clockT, mci: { pts, tags: new Map(), done: false, sent: false },
  };
  C.dispatchText = `Medic 12, respond priority 1 to ${place.addr}. A bus has collided with several cars, multiple patients. You're first in: take medical command and triage.`;
  G.call = C; G.shift.callsN++; G.shift.mciDone = true;
  buildMCIScene(C, r);
  radioTone(); radio('Dispatch', C.dispatchText, 'dispatch');
  dispatchResponders(C, r);
  bus.emit('dispatch', C);
  return C;
}
function buildMCIScene(C, r) {
  clearScene();
  const p = C.place, e = p.edge, dir = p.dir;
  const bpos = edgePos(e, dir, CP / 2, laneOff(1) - 1);
  const bus_ = new THREE.Group();
  bus_.add(mesh(GM.box(), lam(0xe8b820), 0, 1.7, 0, 2.5, 2.6, 11), mesh(GM.box(), lam(0x1a2430), 0, 2.2, 0, 2.52, 0.9, 10.4), mesh(GM.box(), lam(0x202226), 0, 0.5, 0, 2.3, 0.5, 10.6));
  for (const z of [3.6, -3.6]) for (const sx of [-1, 1]) bus_.add(mesh(GM.wheel(), lam(0x141414), sx * 1.15, 0.55, z, 0.35, 1.1, 1.1));
  bus_.position.set(bpos.x, 0, bpos.z); bus_.rotation.y = bpos.yaw + 0.35; bus_.rotation.z = 0.05; shadowy(bus_, true, false); sceneAdd(bus_);
  sceneSolid(bpos.x - 5, bpos.z - 5, bpos.x + 5, bpos.z + 5, 3); SCENE.blockers.push({ x: bpos.x, z: bpos.z, len: 12 });
  for (let k = 0; k < 2; k++) {
    const q = edgePos(e, dir, CP / 2 + 9 + k * 6, laneOff(0) + r.range(-1, 1));
    const car = buildCar(r.pick(['sedan', 'suv', 'hatch']), r.pick(CAR_COLORS), { wreck: true }); car.position.set(q.x, 0, q.z); car.rotation.y = q.yaw + r.range(-1.2, 1.2); sceneAdd(car);
    sceneSolid(q.x - 2.2, q.z - 2.2, q.x + 2.2, q.z + 2.2, 1.5);
  }
  SCENE.wreck = { x: bpos.x, z: bpos.z };
  // patients scattered on the road and sidewalk around the bus
  C.patients.forEach((P, i) => {
    const s = CP / 2 - 9 + (i % 4) * 5 + r.range(-1, 1), off = (i < 4 ? parkOff(e.line) + 1.0 : -0.5) + r.range(-0.8, 0.8);
    const q = edgePos(e, dir, s, off);
    const pp = scenePerson(P.look, q.x, q.z, q.yaw + r.range(-2, 2), P.pose === 'arms' ? 'arms' : P.pose, 'patient', { P });
    P.model = pp.m; P.person = pp; P.where = { scene: 'city', x: q.x, z: q.z, yaw: q.yaw };
    // a coloured tag ribbon, shown once tagged
    const rib = mesh(GM.box(), lam(0xffffff, { emissive: 0x222222 }), 0, 0, 0, 0.12, 0.06, 0.2); rib.visible = false;
    pp.m.aL.el.add(rib); rib.position.set(0, -0.15, 0); P.ribbon = rib;
  });
}
// the triage panel for one patient
const TRI = { P: null, checks: {} };
function openTriage(P) {
  const C = G.call;
  TRI.P = P; TRI.checks = P.triChecks || (P.triChecks = {});
  if (!C.times.contact) C.times.contact = C.t;
  renderTriage(); UI.show('triage');
}
function renderTriage() {
  const C = G.call, P = TRI.P, K = TRI.checks;
  $('#triName').textContent = `Patient ${C.mci.pts.indexOf(P) + 1} of ${C.mci.pts.length}` + (C.mci.tags.has(P) ? ' · tagged ' + TAGS[C.mci.tags.get(P)].name : '');
  const res = [];
  if (K.walk !== undefined) res.push(K.walk ? 'Gets up and walks.' : 'Can\'t walk.');
  if (K.breath !== undefined) res.push(K.breath === 'no' ? 'Not breathing.' : K.breath === 'opened' ? 'Breathing after the airway was opened.' : K.breath === 'still' ? 'Still not breathing with the airway open.' : 'Breathing.');
  if (K.rr !== undefined) res.push('Respirations ' + K.rr + '.');
  if (K.pulse !== undefined) res.push(K.pulse ? 'Radial pulse present, cap refill under 2 s.' : 'No radial pulse, cap refill slow.');
  if (K.cmd !== undefined) res.push(K.cmd ? 'Follows simple commands.' : 'Doesn\'t follow commands.');
  $('#triRes').innerHTML = res.map((t) => `<div>${esc(t)}</div>`).join('') || '<div class="dim">START: walk? breathing? rate? pulse? commands?</div>';
  const box = $('#triActs'); box.innerHTML = '';
  const add = (label, fn, dis) => { const b = el('button', 'act btn' + (dis ? ' dis' : ''), `<b>${esc(label)}</b>`); b.onclick = () => { if (!dis) { fn(); G.clockT += 5; C.t += 5; renderTriage(); } }; box.appendChild(b); };
  add('“Can you walk?”', () => { K.walk = !!P.flags.walks; });
  add('Check breathing', () => { K.breath = P.arrest || P.flags.apneic ? 'no' : 'yes'; });
  if (K.breath === 'no') add('Open the airway', () => { K.breath = P.flags.apneicOpens ? 'opened' : 'still'; });
  add('Count respirations', () => { K.rr = P.arrest ? 0 : Math.round(P.v.rr); }, K.breath === 'no' || K.breath === 'still');
  add('Radial pulse / cap refill', () => { K.pulse = !P.arrest && P.v.sbp >= 80; }, P.arrest);
  add('“Squeeze my hand”', () => { K.cmd = !P.arrest && P.v.gcs >= 13; }, P.arrest);
  const tags = $('#triTags'); tags.innerHTML = '';
  for (const [id, T] of Object.entries(TAGS)) {
    const b = el('button', 'tagb btn' + (C.mci.tags.get(P) === id ? ' on' : ''), T.name); b.style.setProperty('--c', T.css);
    b.onclick = () => { tagPatient(P, id); UI.hide('triage'); };
    tags.appendChild(b);
  }
}
function tagPatient(P, id, who = 'Ricky') {
  const C = G.call;
  C.mci.tags.set(P, id);
  P.triageTrue = startTag(P);
  P.ribbon.visible = true; P.ribbon.material = lam(TAGS[id].col, { emissive: TAGS[id].col, emissiveIntensity: 0.3 });
  callLog(C, who, `Tagged patient ${C.mci.pts.indexOf(P) + 1} ${TAGS[id].name.toLowerCase()}.`);
  if (C.mci.tags.size === C.mci.pts.length && C.mci.doneT === undefined) { C.mci.doneT = C.t; toast('Everyone is tagged. Send your report to dispatch.'); }
}
// Marisol triages too, the patients nearest her first
function updateMCI(dt) {
  const C = G.call; if (!C || !C.mci || C.mci.sent || C.stage !== 'onscene') return;
  if (PARTNER.task !== 'follow' && PARTNER.task !== 'mci') return;
  const M = C.mci;
  if (!M.ptarget || M.tags.has(M.ptarget)) {
    const left = M.pts.filter((p) => !M.tags.has(p) && p !== TRI.P);
    if (!left.length) { PARTNER.task = 'follow'; return; }
    M.ptarget = left.reduce((a, b) => (dist(PARTNER.x, PARTNER.z, a.where.x, a.where.z) < dist(PARTNER.x, PARTNER.z, b.where.x, b.where.z) ? a : b));
    M.ptT = 0;
  }
  PARTNER.task = 'mci';
  const P = M.ptarget, d = dist(PARTNER.x, PARTNER.z, P.where.x, P.where.z);
  if (d > 1.4) { const k = Math.min(1, 3.2 * dt / d); PARTNER.yaw = Math.atan2(P.where.x - PARTNER.x, P.where.z - PARTNER.z); PARTNER.x += (P.where.x - PARTNER.x) * k; PARTNER.z += (P.where.z - PARTNER.z) * k; PARTNER.v = 3.2; PARTNER.workPose = null; }
  else { PARTNER.v = 0; PARTNER.workPose = 'kneel'; M.ptT += dt * TIME_SCALE; if (M.ptT > 40) { const right = Math.random() < 0.9; const tag = right ? P.triage : ({ red: 'yellow', yellow: 'red', green: 'yellow', black: 'red' })[P.triage]; tagPatient(P, tag, PARTNER_SHORT); PARTNER.workPose = null; M.ptarget = null; } }
  PARTNER.model.root.position.set(PARTNER.x, groundY(PARTNER.x, PARTNER.z), PARTNER.z); PARTNER.model.root.rotation.y = PARTNER.yaw;
  posePerson(PARTNER.model, PARTNER.workPose || 'stand', dt, PARTNER.v / 3);
  PARTNER.model.root.visible = true;
}
// the report: more units arrive and take every patient but ours
function sendMCIReport() {
  const C = G.call, M = C.mci; if (M.sent) return;
  const n = (t) => M.pts.filter((p) => M.tags.get(p) === t).length;
  radio('Medic 12', `Medic 12 command: ${M.pts.length} patients. ${n('red')} immediate, ${n('yellow')} delayed, ${n('green')} minor, ${n('black')} expectant. Requesting ${Math.max(2, n('red') + n('yellow'))} more units.`, 'crew');
  M.sent = true;
  setTimeout(() => {
    radio('Dispatch', 'Medics 7, 9 and 15 and a bus for the walking wounded are on scene. Medic 12, take your most critical patient.');
    // the others are taken away; ours stays
    for (const P of M.pts) if (P !== C.P && P.person) { R.scene.remove(P.model.root); const i = SCENE.people.indexOf(P.person); if (i >= 0) SCENE.people.splice(i, 1); P.where = { scene: 'taken' }; }
    C.patients = [C.P];
    for (let k = 0; k < 2; k++) { const q = sceneSideSpot(C, 30 + k * 10), m = buildRig('cutaway', k ? 'metro' : 'county', 'alt', 'redwhite'); m.root.position.set(q.x, 0, q.z); m.root.rotation.y = q.yaw; sceneAdd(m.root); animRigLights(m, true, k * 0.3, R.night); }
    PARTNER.task = 'follow';
    toast(`Your patient: ${C.P.first}, tagged ${TAGS[M.tags.get(C.P)] ? TAGS[M.tags.get(C.P)].name.toLowerCase() : 'untagged'}.`);
  }, DEBUG ? 0 : 1800);
}
