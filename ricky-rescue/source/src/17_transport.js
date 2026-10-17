// Ricky Rescue — transport: the rear-door equipment panel, choosing a hospital, a pre-alert and who drives, the
// patient compartment (riding in back while Marisol drives), arriving at the bay, and the handoff report.

// ---------- rear doors ----------
function openRearPanel() {
  const box = $('#rearList'); box.innerHTML = '';
  const add = (label, sub, fn, dis) => { const b = el('button', 'act btn' + (dis ? ' dis' : ''), `<b>${esc(label)}</b><span>${esc(sub || '')}</span>`); b.onclick = () => { if (!dis) fn(); }; box.appendChild(b); };
  for (const id of ['stretcher', 'chair', 'scoop', 'board']) {
    const e = EQ[id];
    if (e.at === 'rig') add('Take the ' + DEVICES[id].short, id === 'stretcher' ? 'You push it. Jump bag and monitor ride on top.' : 'You carry it', () => takeFromRig(id), PLAYER.push || PLAYER.carry);
    else if ((e.by === 'ricky') && !e.P) add('Put the ' + DEVICES[id].short + ' back', '', () => stowToRig(id));
  }
  const nearBase = RIG && (Object.values(CITY.hospitals).some((h) => dist(RIG.x, RIG.z, h.bay.x, h.bay.z) < 40) || dist(RIG.x, RIG.z, CITY.station.x, CITY.station.z) < 40);
  const miss = missingStock();
  add('Restock the cabinets', G.call ? 'After the call' : !nearBase ? 'Only at a hospital or the station' : miss ? `${miss} item${miss > 1 ? 's' : ''} to top up · about ${fmtMin(60 + miss * 15)}` : 'Already full', () => startRestock(), !nearBase || !!G.call || !miss);
  if (G.shift && G.shift.check) { const ch = G.shift.check, n = RIG_CHECK.filter((c) => ch.items[c.id].state !== 'todo').length; add('Rig check', ch.done ? 'Done for this shift' : `${n} of ${RIG_CHECK.length} checked` + (G.call ? ' · after the call' : ''), () => openRigCheck(), false); }
  const low = Object.entries(RIG.stock).filter(([k, v]) => (k === 'o2' ? v < 30 : v === 0)).map(([k]) => SUPPLIES[k].name);
  $('#rearStock').textContent = low.length ? 'Running low: ' + low.join(', ') : 'Cabinets are stocked.';
  UI.show('rear');
}
function closePanel(id) { UI.hide(id); }

// ---------- choosing a hospital ----------
const TP = { dest: null, driver: 'partner', ls: false, alert: 'none', lens: {} };
function openTransportPanel(midway) {
  const C = G.call; if (!C) return;
  TP.midway = !!midway;
  TP.dest = C.dest || null; TP.alert = C.prealert || 'none'; TP.ls = RIG.siren; TP.driver = C.driver || 'partner';
  // the engine medic comes along for anyone sick enough to need a second pair of advanced hands
  if (!midway) TP.medic = MEDIC.on && !!(C.P.arrest || C.P.rosc || C.tpl.transportLS(C, C.P));
  for (const id of Object.keys(HOSPITALS)) TP.lens[id] = routeLength(Object.assign({}, CITY.hospitals[id].bay));
  if (!TP.dest) TP.dest = Object.keys(HOSPITALS).sort((a, b) => TP.lens[a] - TP.lens[b])[0];
  renderTransport();
  UI.show('transport');
}
function renderTransport() {
  const C = G.call, P = C.P;
  const hl = $('#tpHosp'); hl.innerHTML = '';
  for (const [id, H] of Object.entries(HOSPITALS)) {
    const len = TP.lens[id];
    const b = el('button', 'hosp btn' + (TP.dest === id ? ' on' : ''));
    b.innerHTML = `<b>${esc(H.name)}</b><span>${Math.round(len)} m · about ${fmtMin(etaFor(len, TP.ls))}</span><em>${H.caps.map((c) => `<u class="cap-${c}">${CAP_NAMES[c]}</u>`).join('')}</em>`;
    b.onclick = () => { TP.dest = id; renderTransport(); };
    hl.appendChild(b);
  }
  const opt = (id, val, label) => { const b = $('#' + id); b.classList.toggle('on', val); b.textContent = label; };
  $('#tpDrive').hidden = TP.midway;
  opt('tpPartner', TP.driver === 'partner', `Ride in back, ${PARTNER_SHORT} drives`);
  opt('tpRicky', TP.driver === 'ricky', `I'll drive, ${PARTNER_SHORT} rides in back`);
  opt('tpLS', TP.ls, TP.ls ? 'Lights & sirens: ON' : 'Lights & sirens: off');
  $('#tpMedic').hidden = !MEDIC.on || TP.midway;
  if (MEDIC.on) opt('tpMedic', TP.medic, TP.medic ? `${MEDIC.first} (${MEDIC.unit.name}) rides in` : `${MEDIC.first} stays with ${MEDIC.unit.name}`);
  const al = $('#tpAlerts'); al.innerHTML = '';
  for (const [id, name] of [['none', 'Routine report'], ['stemi', 'STEMI alert'], ['stroke', 'Stroke alert'], ['trauma', 'Trauma alert']]) {
    const b = el('button', 'chip btn' + (TP.alert === id ? ' on' : ''), name);
    b.onclick = () => { TP.alert = id; renderTransport(); };
    al.appendChild(b);
  }
  $('#tpSummary').textContent = `${P.name}, ${P.age}. ${P.arrest ? 'In cardiac arrest.' : P.avpu === 'A' ? 'Awake.' : 'Altered.'} Last vitals: ${P.meas.bp ? 'BP ' + P.meas.bp.v : 'no BP'}, ${P.meas.hr ? 'HR ' + P.meas.hr.v : 'no pulse taken'}, ${P.meas.spo2 ? 'SpO₂ ' + P.meas.spo2.v + '%' : 'no SpO₂'}.`;
}
function confirmTransport() {
  const C = G.call, P = C.P, H = CITY.hospitals[TP.dest];
  const first = !C.dest;
  C.dest = TP.dest;
  if (TP.alert !== C.prealert) {
    C.prealert = TP.alert;
    const eta = Math.max(2, Math.round(etaFor(TP.lens[TP.dest], TP.ls) / 60));
    const alertName = { none: '', stemi: 'STEMI alert, ', stroke: 'stroke alert, ', trauma: 'trauma alert, ' }[TP.alert];
    radio('Medic 12', `${H.short}, Medic 12, en route with a ${ageText(P)}, ${alertName}${C.nature.toLowerCase()}. ${P.meas.bp ? 'BP ' + P.meas.bp.v + ', ' : ''}${P.meas.hr ? 'pulse ' + P.meas.hr.v + ', ' : ''}${P.arrest ? 'CPR in progress, ' : ''}ETA ${eta} minutes.`, 'crew');
    setTimeout(() => radio(H.short, TP.alert !== 'none' ? `Copy Medic 12, ${TP.alert === 'stemi' ? 'cath lab is activated' : TP.alert === 'stroke' ? 'stroke team will meet you' : 'trauma team is activating'}.` : 'Copy Medic 12, see you soon.'), 2500);
    C.prealertT = C.t;
  }
  UI.hide('transport');
  setSiren(TP.ls);
  if (first) {
    C.stage = 'transport'; C.times.depart = C.t; C.driver = TP.driver;
    C.sceneTime = C.t - (C.times.contact || C.times.arrive || C.t);
  }
  buildRoute(Object.assign({ ls: TP.ls }, H.bay), H.short);
  if (!first) { if (RIG.auto) RIG.auto = { pts: ROUTE.pts, i: 0 }; return; }
  // everyone aboard; the engine medic too, if asked
  if (MEDIC.on) {
    if (TP.medic) { MEDIC.task = 'ride'; radio(MEDIC.first, 'I\'ll ride in with you.', 'medic'); }
    else { stopWorker('medic', true); MEDIC.on = false; MEDIC.task = 'leave'; }
  }
  PLAYER.push = false; PLAYER.carry = null;
  for (const e of Object.values(EQ)) if (e.at !== 'rig' && !e.P) { e.at = 'rig'; e.by = null; e.model.g.visible = false; }
  if (TP.driver === 'partner') {
    G.where = 'back'; PLAYER.model.root.visible = false;
    PARTNER.task = 'drive'; PARTNER.model.root.visible = false;
    stopWorker('partner', true);
    RIG.auto = { pts: ROUTE.pts, i: 0 };
    enterRigBack();
  } else {
    // Marisol takes over patient care in the back; Ricky's ongoing job passes to her
    const j = WORK.ricky; stopWorker('ricky', true);
    if (j && j.cont && j.act && !WORK.partner) startWork('partner', Object.assign({}, j, { t: j.dur, on: true }));
    PARTNER.task = 'back'; PARTNER.model.root.visible = false;
    G.where = 'cab'; PLAYER.model.root.visible = false;
    closeCare();
    CAM.userYaw = 0; snapCam();
  }
  callLog(C, 'Ricky', `Transporting to ${H.short}${TP.ls ? ' with lights and sirens' : ''}.`);
  bus.emit('transport', C);
}

// ---------- the patient compartment ----------
const RIGBOX = { g: null, type: null, str: null, ricky: null };
const RIGBOX_X = -5000, RIGBOX_Z = 600;
function buildRigBox() {
  if (RIGBOX.g) R.scene.remove(RIGBOX.g);
  const S = RIGS[RIG.type], g = new THREE.Group(); g.position.set(RIGBOX_X, 0, RIGBOX_Z);
  const L = S.len - (RIG.type === 'van' ? 1.9 : 2.3), W = S.wid - 0.2, H = 1.9;
  const wall = lam(0xe8ecee), cab = lam(RIG.type === 'box' ? 0xc8d4dc : 0xd8dcd8), dark = lam(0x2a3038);
  const add = (m, x, y, z, sx, sy, sz) => { const o = mesh(GM.box(), m, x, y, z, sx, sy, sz); o.receiveShadow = true; g.add(o); return o; };
  add(lam(0x5a6670), 0, -0.02, 0, W, 0.04, L); // floor
  const inner = (x, z, w, rot) => { const m = mesh(GM.planeV(), new THREE.MeshLambertMaterial({ color: 0xe8ecee }), x, H / 2, z, w, H, 1); m.rotation.y = rot; g.add(m); };
  inner(0, -L / 2, W, 0); inner(-W / 2, 0, L, Math.PI / 2); inner(W / 2, 0, L, -Math.PI / 2);
  // cabinets along the curb side (-x) and the bench on the street side (+x)
  for (let z = -L / 2 + 0.4; z < L / 2 - 0.6; z += 0.62) { add(cab, -W / 2 + 0.22, 1.35, z + 0.3, 0.42, 0.9, 0.58); add(lam(0x7a8a98), -W / 2 + 0.44, 1.35, z + 0.3, 0.01, 0.82, 0.5); }
  add(lam(0x2a4a8a), W / 2 - 0.3, 0.42, 0.2, 0.52, 0.12, L * 0.62); add(cab, W / 2 - 0.3, 0.18, 0.2, 0.52, 0.36, L * 0.62);
  add(lam(0x2a4a8a), W / 2 - 0.08, 0.75, 0.2, 0.08, 0.55, L * 0.62);
  // captain's chair at the head end
  add(lam(0x2a4a8a), 0, 0.45, -L / 2 + 0.45, 0.5, 0.1, 0.5); add(lam(0x2a4a8a), 0, 0.8, -L / 2 + 0.22, 0.5, 0.6, 0.1);
  // monitor and oxygen on the wall
  const mon = buildMonitorBox(); mon.position.set(-W / 2 + 0.35, 1.0, -L / 2 + 0.9); mon.rotation.y = Math.PI / 2; g.add(mon);
  add(lam(0x3a9a5a), -W / 2 + 0.15, 1.4, -L / 2 + 1.5, 0.12, 0.3, 0.12);
  // ceiling lights
  for (const z of [-L / 4, L / 4]) add(mat(0xffffff, { basic: true }), 0, H - 0.02, z, 0.5, 0.02, 0.9);
  // rear door windows that flicker as streetlights pass
  RIGBOX.win = [];
  for (const sx of [-1, 1]) { const w = add(new THREE.MeshBasicMaterial({ color: 0x223040 }), sx * W / 4, 1.35, L / 2 - 0.01, W / 2 - 0.4, 0.45, 0.02); RIGBOX.win.push(w); }
  // the stretcher
  const st = buildStretcher(); st.g.position.set(-0.25, 0, 0.15); st.g.rotation.y = 0; setStretcher(st, 0.55, 0); st.gear.visible = false; g.add(st.g);
  // Ricky on the bench
  const C = G.career, U = UNIFORMS[C.uniform];
  const rk = makePerson(Object.assign({}, C.look, { shirt: U.shirt, pants: U.pants, uniform: true, gloves: true }));
  // Ricky in the captain's chair at the patient's head
  rk.root.position.set(0, 0.0, -L / 2 + 0.42); rk.root.rotation.y = 0; snapPose(rk, 'sit'); g.add(rk.root);
  // the engine medic on the bench, when one rides along
  const md = makePerson(ENGINE_MEDIC); md.root.position.set(W / 2 - 0.42, 0.06, -L / 2 + 1.35); md.root.rotation.y = -Math.PI / 2; snapPose(md, 'sit'); md.root.visible = false; g.add(md.root);
  shadowy(g, false, true);
  R.scene.add(g);
  Object.assign(RIGBOX, { g, type: RIG.type, str: st, ricky: rk, medic: md, L, W, H });
}
function enterRigBack() {
  const C = G.call, P = C.P;
  if (!RIGBOX.g || RIGBOX.type !== RIG.type) buildRigBox();
  RIGBOX.g.visible = true;
  // the patient goes onto the compartment's stretcher
  const M = P.model; if (M.root.parent) M.root.parent.remove(M.root);
  RIGBOX.str.deck.add(M.root); M.root.position.set(0, 0.06, 0.05); M.root.rotation.set(0, 0, 0);
  setStretcher(RIGBOX.str, 0.55, P.position === 'fowler' || P.position === 'sitting' ? 1 : 0);
  snapPose(M, 'lie');
  P.where = { scene: 'rig' };
  setEnv('rig');
  R.ptLight.position.set(RIGBOX_X, 1.7, RIGBOX_Z);
  openCare(P);
}
function leaveRigBack() {
  const P = G.call && G.call.P;
  if (P && P.model && RIGBOX.str && P.model.root.parent === RIGBOX.str.deck) { RIGBOX.str.deck.remove(P.model.root); EQ.stretcher.model.deck.add(P.model.root); }
  if (RIGBOX.g) RIGBOX.g.visible = false;
}
// the camera in the back sways with the rig
function camRigBack(dt) {
  const A = RIG, sw = clamp(A.accLat * 0.012, -0.08, 0.08), sp = clamp(A.accLong * 0.008, -0.05, 0.05);
  if (RIGBOX.medic) RIGBOX.medic.root.visible = MEDIC.on && MEDIC.task === 'ride';
  RIGBOX.sway = lerp(RIGBOX.sway || 0, sw, 1 - Math.exp(-dt * 5));
  // from the rear corner on the bench side, looking along the stretcher to Ricky at the head
  const yaw = clamp(CAM.userYaw * 0.3, -0.5, 0.5), x = RIGBOX_X + RIGBOX.W / 2 - 0.3, z = RIGBOX_Z + RIGBOX.L / 2 - 0.2;
  R.camera.position.set(x + RIGBOX.sway * 2, 1.82 + sp * 2, z);
  R.camera.lookAt(RIGBOX_X - 0.3 + Math.sin(yaw) * 1.5 + RIGBOX.sway * 4, 0.45, RIGBOX_Z - 0.5);
  R.camera.rotation.z += RIGBOX.sway;
  if (RIGBOX.win) { const f = Math.abs(A.v) > 2 ? 0.5 + 0.5 * Math.sin(performance.now() / 1000 * Math.abs(A.v) * 0.45) : 0; for (const w of RIGBOX.win) w.material.color.setHex(R.night > 0.5 ? lerpHex(0x10161c, 0xffe0a0, f * 0.6) : lerpHex(0x8aa0b4, 0xc8d8e8, f * 0.4)); }
}

// ---------- arriving ----------
function arriveHospital(C) {
  if (C.stage !== 'transport') return;
  C.stage = 'hospital'; C.times.hospital = C.t;
  RIG.auto = null; RIG.v = 0; setSiren(false); clearRoute();
  const H = CITY.hospitals[C.dest];
  radio('Medic 12', `Medic 12 at ${H.short}.`, 'crew');
  if (G.where === 'back') { leaveRigBack(); closeCare(); fade(() => unloadPatient()); }
  else { toast('Get out and unload the patient at the back doors.'); }
  if (PARTNER.task === 'back') { stopWorker('partner', true); }
  // the engine medic hands over with us, then heads back to quarters
  if (MEDIC.on && MEDIC.task === 'ride') { stopWorker('medic', true); MEDIC.on = false; MEDIC.task = 'none'; setTimeout(() => radio(MEDIC.first, `Good work. I'll get a ride back to ${MEDIC.unit ? MEDIC.unit.name : 'quarters'}.`, 'medic'), DEBUG ? 0 : 3000); }
  bus.emit('atHospital', C);
}

// ---------- handoff ----------
const HQ = { qs: [], i: 0, right: 0 };
function makeHandoff(C) {
  const P = C.P, r = RNG(), qs = [];
  const shuffle = (a) => r.shuffle(a);
  // 1: what's going on
  const others = r.shuffle(CALLS.filter((t) => t.nature !== C.nature).map((t) => t.nature)).slice(0, 2);
  qs.push({ q: 'What did you find? (the chief concern)', opts: shuffle([C.nature, ...others]), ans: C.nature });
  // 2: latest vitals
  const bp = P.meas.bp ? P.meas.bp.v : null, hr = P.meas.hr ? P.meas.hr.v : null;
  if (bp || hr) {
    const real = `BP ${bp || 'not taken'}, pulse ${hr === null ? 'not taken' : hr}`;
    const fake1 = `BP ${bp ? (parseInt(bp) + 40) + '/' + (parseInt(bp.split('/')[1] || 80) + 20) : '120/80'}, pulse ${hr === null ? 72 : hr + 30}`;
    const fake2 = `BP ${bp ? Math.max(60, parseInt(bp) - 45) + '/' + Math.max(30, parseInt(bp.split('/')[1] || 80) - 25) : '90/50'}, pulse ${hr === null ? 130 : Math.max(40, hr - 25)}`;
    qs.push({ q: 'Last set of vitals?', opts: shuffle([real, fake1, fake2]), ans: real });
  } else qs.push({ q: 'Last set of vitals?', opts: shuffle(['We didn\'t get a set of vitals', 'BP 128/84, pulse 88', 'BP 96/60, pulse 118']), ans: 'We didn\'t get a set of vitals' });
  // 3: what we did
  const done = [...C.acts].filter((id) => ACT[id] && ['airway', 'circ', 'meds', 'trauma'].includes(ACT[id].tab)).map((id) => ACT[id].name.split(' (')[0]);
  const realTx = done.length ? done.slice(0, 4).join(', ') : 'Assessment and comfort only';
  const extraPool = ['Aspirin', 'Tourniquet', 'Naloxone 4 mg nasal', 'Albuterol nebulizer', 'Cervical collar', 'Epinephrine auto-injector', 'Oral glucose 15 g', 'CPR'].filter((n) => !done.some((d) => d.startsWith(n.split(' ')[0])));
  const fakeTx1 = done.length > 1 ? done.slice(1, 4).concat([r.pick(extraPool)]).join(', ') : r.pick(extraPool) + ', ' + r.pick(extraPool);
  const fakeTx2 = done.length ? done.slice(0, 2).join(', ') + (done.length > 2 ? '' : ', ' + r.pick(extraPool)) : 'Assessment, ' + r.pick(extraPool);
  qs.push({ q: 'Treatment given?', opts: shuffle([...new Set([realTx, fakeTx1, fakeTx2])]), ans: realTx });
  // 4: the key finding
  let key = null;
  if (P.known.has('lkw')) key = ['Last known well ' + P.meas.lkw.v, 'Symptoms started this morning on waking', 'Unknown onset'];
  else if (P.ecg12 && P.conds.stemi) key = ['12-lead shows ' + P.ecg12, '12-lead normal', '12-lead shows atrial fibrillation only'];
  else if (P.bleeds.some((b) => b.ctrl === 'tq')) { const b = P.bleeds.find((q) => q.ctrl === 'tq'); key = ['Tourniquet on at ' + fmtClock(C.startClock + (b.tqT || 0)), 'No tourniquet', 'Tourniquet loosened on scene']; }
  else if (P.known.has('glu')) key = ['Glucose ' + P.meas.glu.v + ' mg/dL', 'Glucose ' + (P.meas.glu.v + 90) + ' mg/dL', 'Glucose not checked'];
  else if (P.lastArrest || P.arrest) key = [P.arrest ? 'Still in arrest, ' + (C.shocks || 0) + ' shocks' : 'Pulse back after ' + (C.shocks || 0) + ' shock' + ((C.shocks || 0) === 1 ? '' : 's'), 'Never lost a pulse', 'No shocks advised at any point'];
  if (key) qs.push({ q: 'The detail the ER needs most?', opts: shuffle(key.slice()), ans: key[0] });
  return qs;
}
function openHandoff() {
  const C = G.call;
  HQ.qs = makeHandoff(C); HQ.i = 0; HQ.right = 0; HQ.answers = [];
  closeCare();
  UI.show('handoff');
  renderHandoff();
}
function renderHandoff() {
  const C = G.call, q = HQ.qs[HQ.i];
  $('#hoTitle').textContent = `Handoff at ${CITY.hospitals[C.dest].short} (${HQ.i + 1}/${HQ.qs.length})`;
  $('#hoQ').textContent = q.q;
  const box = $('#hoOpts'); box.innerHTML = '';
  for (const o of q.opts) {
    const b = el('button', 'act btn', `<b>${esc(o)}</b>`);
    b.onclick = () => {
      const ok = o === q.ans; if (ok) HQ.right++;
      HQ.answers.push({ q: q.q, a: o, ok, ans: q.ans });
      HQ.i++;
      if (HQ.i >= HQ.qs.length) { UI.hide('handoff'); C.handoff = { right: HQ.right, n: HQ.qs.length, answers: HQ.answers }; C.times.handoff = C.t; handoffPatient(C); finishCall('handoff'); }
      else renderHandoff();
    };
    box.appendChild(b);
  }
}
function handoffPatient(C) {
  const P = C.P, s = EQ.stretcher;
  if (P.model && P.model.root.parent) P.model.root.parent.remove(P.model.root);
  s.P = null; P.carried = null; P.where = { scene: 'er' };
  setStretcher(s.model, 1, 0); s.model.gear.visible = true;
}
