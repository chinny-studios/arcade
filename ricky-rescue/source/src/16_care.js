// Ricky Rescue — patient care: up to three workers (Ricky, Marisol and an engine company's firefighter-paramedic)
// doing timed actions in parallel, continuous jobs (CPR, BVM, direct pressure), Ricky's CPR rhythm, the others' own
// initiative, and the care panel with its monitor.

const WORKERS = ['ricky', 'partner', 'medic'];
const WORK = { ricky: null, partner: null, medic: null, queue: { ricky: null, partner: null, medic: null } };
const workerName = (who) => (who === 'ricky' ? 'Ricky' : who === 'partner' ? PARTNER_SHORT : MEDIC.first || 'Medic');
const workerBody = (who) => (who === 'ricky' ? PLAYER : who === 'partner' ? PARTNER : MEDIC);
const CPRQ = { taps: [], q: 0, last: 0, rate: 0 };
const CARE = { open: false, P: null, tab: 'assess', who: 'ricky', logN: 0, sel: null };

// ---------- workers ----------
function startWork(who, job) {
  if (WORK[who] && WORK[who].cont) stopWorker(who, true);
  job.t = 0; job.started = G.call ? G.call.t : 0;
  WORK[who] = job;
  const B = workerBody(who);
  B.busy = who === 'ricky' && job.cont ? 0 : 1; B.workPose = job.pose || 'kneel';
  if (who === 'partner' && PARTNER.task !== 'drive' && PARTNER.task !== 'back') PARTNER.task = 'kneel';
  CARE.dirty = true;
}
function stopWorker(who, quiet) {
  const j = WORK[who]; if (!j) return;
  WORK[who] = null;
  const B = workerBody(who); B.busy = 0; B.workPose = null;
  if (j.cont && !quiet && G.call) callLog(G.call, workerName(who), 'Stopped ' + j.name.toLowerCase() + '.');
  if (j.act && j.act.id === 'bvm' && G.call && !workerOn('bvm')) { const P = G.call.P; if (P.o2 === 'bvm') P.o2 = null; }
  CARE.dirty = true;
}
function stopAllWork() { for (const w of WORKERS) { stopWorker(w, true); WORK.queue[w] = null; } }
function workerOn(id, who) { const w = who ? [WORK[who]] : WORKERS.map((k) => WORK[k]); return w.some((j) => j && j.act && j.act.id === id && (j.on || !j.cont)); }
function rickyCanReach(P) {
  if (G.where === 'back') return P.where && P.where.scene === 'rig';
  if (G.where !== 'foot' || !P.where || P.carried) return false;
  const sp = P.where.scene === 'interior' ? 'int' : 'city';
  return sp === PLAYER.sp && dist(PLAYER.x, PLAYER.z, P.where.x, P.where.z) < 3.2 && !PLAYER.push && !PLAYER.carry;
}
function partnerCanReach(P) {
  if (PARTNER.task === 'back') return P.where && P.where.scene === 'rig';
  if (PARTNER.task === 'fetch' || PARTNER.task === 'drive' || PARTNER.task === 'cab' || PARTNER.task === 'carry' || !P.where || P.carried) return false;
  const sp = P.where.scene === 'interior' ? 'int' : 'city';
  return sp === PARTNER.sp && dist(PARTNER.x, PARTNER.z, P.where.x, P.where.z) < 6;
}
// the engine medic: on scene beside the patient, or riding in the back with them
function medicCanReach(P) {
  if (!MEDIC.on || !P.where) return false;
  if (MEDIC.task === 'ride') return P.where.scene === 'rig';
  if (P.carried || !MEDIC.person) return false;
  const sp = P.where.scene === 'interior' ? 'int' : 'city';
  return sp === MEDIC.sp && dist(MEDIC.x, MEDIC.z, P.where.x, P.where.z) < 6;
}
const canReach = (who, P) => (who === 'ricky' ? rickyCanReach(P) : who === 'partner' ? partnerCanReach(P) : medicCanReach(P));
// why an action can't be done by `who` right now (null = OK)
function actionBlock(a, P, who) {
  const C = G.call, rank = G.career.rank;
  if (a.show && !a.show(P, C)) return 'Not needed now';
  if (who === 'partner') {
    if (a.who === 'ricky') return 'Only Ricky can do this';
    if (a.rank) return PARTNER_SHORT + ' is an EMT';
    if (!partnerCanReach(P)) return PARTNER_SHORT + ' isn\'t with the patient';
  } else if (who === 'medic') {
    // a paramedic: everything up to paramedic level, whatever Ricky's own certification; the crew's decisions stay Ricky's
    if (a.id === 'refusal' || a.id === 'terminate' || a.id === 'sample' || a.id === 'opqrst') return 'Ricky leads this call';
    if ((a.rank || 0) > 2) return 'Beyond a paramedic';
    if (!medicCanReach(P)) return (MEDIC.first || 'The medic') + ' isn\'t with the patient';
  } else {
    if ((a.rank || 0) > rank) return 'Needs ' + RANKS[a.rank].long;
    if (!rickyCanReach(P)) return 'Get next to the patient';
  }
  if (a.use && RIG && (RIG.stock[a.use] || 0) <= 0) return 'Out of ' + SUPPLIES[a.use].name.toLowerCase();
  if (a.need) { const n = a.need(P, C); if (n) return n; }
  if (WORK[who] && !WORK[who].cont && !actionBlock.ignoreBusy) return workerName(who) + ' is busy';
  if (a.cont && workerOn(a.id)) return 'Already being done';
  for (const other of WORKERS) if (other !== who && !a.cont && WORK[other] && WORK[other].act && WORK[other].act.id === a.id) return 'Already being done';
  return null;
}
function actionBlockIgnoringBusy(a, P, who) { actionBlock.ignoreBusy = true; try { return actionBlock(a, P, who); } finally { actionBlock.ignoreBusy = false; } }
function doAction(id, who = CARE.who, P = G.call && G.call.P) {
  const a = ACT[id], C = G.call; if (!a || !C || !P) return false;
  const why = actionBlock(a, P, who);
  // a busy worker takes it next
  if (why && WORK[who] && !WORK[who].cont && why.endsWith('is busy') && !actionBlockIgnoringBusy(a, P, who)) { WORK.queue[who] = id; CARE.dirty = true; return true; }
  if (why) { toast(why, 'bad'); return false; }
  if (a.use && RIG && a.use !== 'o2') RIG.stock[a.use]--;
  if (a.use === 'o2' && RIG) RIG.stock.o2 = Math.max(0, RIG.stock.o2 - 2);
  if (who === 'ricky' && !C.ppe && id !== 'ppe' && !C.ppeWarn) { C.ppeWarn = true; addHarm(C, 'Touched the patient before gloves and PPE'); }
  if (C.actT[id] === undefined) C.actT[id] = C.t;
  if (!C.times.contact) C.times.contact = C.t;
  const h = a.harm && a.harm(P, C); if (h) addHarm(C, h);
  let dur = a.dur;
  if (who === 'partner' && G.career.rank >= 3) dur *= 0.8;
  if (who === 'medic') dur *= 0.9; else dur *= fatigueMul();
  dur += equipDelay(id);
  const pose = id === 'cpr' ? 'cpr' : id === 'bvm' ? 'kneel' : (P.pose === 'sit' || P.pose === 'chestSit') && G.where !== 'back' ? 'crouch' : 'kneel';
  startWork(who, { act: a, id, name: a.name, dur, cont: !!a.cont, pose, P });
  bus.emit('action', id, who);
  return true;
}
function updateWorkers(gdt) {
  const C = G.call; if (!C) return;
  for (const who of WORKERS) {
    const j = WORK[who]; if (!j) continue;
    const P = j.P || C.P;
    // a worker who has walked off (or the patient was moved) loses the job
    if (j.act && !canReach(who, P)) { stopWorker(who); continue; }
    let rate = 1;
    if (RIG && P.where && P.where.scene === 'rig' && Math.abs(RIG.v) > 1) rate = 1 / (1 + RIG.rough * 0.8 / RIGS[RIG.type].ride);
    j.t += gdt * rate;
    if (j.t >= j.dur && !j.on) {
      if (j.act) {
        const line = j.act.done(P, C, who);
        C.acts.add(j.id); C.actN[j.id] = (C.actN[j.id] || 0) + 1;
        if (line) callLog(C, workerName(who), line);
        bus.emit('actionDone', j.id, who, line);
      } else if (j.move) completeMove(P, j.move);
      else if (j.fn) j.fn();
      if (j.cont) { j.on = true; if (who === 'ricky') { PLAYER.busy = 0; } }
      else { WORK[who] = null; const B = workerBody(who); B.busy = 0; B.workPose = null; }
      CARE.dirty = true;
    }
    // continuous jobs end themselves when no longer needed
    if (j.on && j.act) {
      if (j.id === 'cpr' && !P.arrest) { stopWorker(who); }
      else if (j.id === 'pressure' && !worstBleed(P)) stopWorker(who);
      else if (j.id === 'bvm') { P.bvmTime = (P.bvmTime || 0) + gdt; if (RIG) RIG.stock.o2 = Math.max(0, RIG.stock.o2 - gdt * 0.004); }
    }
  }
  // queued actions start when their worker is free
  for (const who of WORKERS) {
    const q = WORK.queue[who];
    if (q && (!WORK[who] || WORK[who].cont)) { WORK.queue[who] = null; if (!actionBlock(ACT[q], C.P, who)) doAction(q, who); CARE.dirty = true; }
  }
  partnerInitiative(C);
  medicInitiative(C);
}
// CPR quality from whoever is doing it; Ricky's follows the player's rhythm
function careContext(C) {
  const P = C.P;
  let cpr = 0;
  const analysing = WORKERS.some((w) => WORK[w] && (WORK[w].id === 'aed' || WORK[w].id === 'analyse'));
  if (WORK.ricky && WORK.ricky.id === 'cpr') cpr = Math.max(cpr, OPTS.autoCPR || !G.live ? 0.8 : CPRQ.q);
  if (WORK.partner && WORK.partner.id === 'cpr') { const j = WORK.partner; cpr = Math.max(cpr, 0.82 - Math.min(0.2, (C.t - j.started) / 1500)); }
  if (WORK.medic && WORK.medic.id === 'cpr') cpr = Math.max(cpr, 0.84);
  if (C.fireOn && P.arrest && !P.carried && P.where && P.where.scene !== 'rig') cpr = Math.max(cpr, 0.8);
  if (C.bystCPR && P.arrest && !C.times.contact) cpr = Math.max(cpr, 0.45);
  if (analysing) cpr = 0;
  if (P.carried && (PLAYER.v > 0.3)) cpr *= 0.3;
  return { cpr, bvm: workerOn('bvm') || (P.arrest && C.fireOn && !!P.airway.adjunct), pressure: workerOn('pressure') || !!C.ffPressure, t: C.t };
}
// Marisol does sensible things on her own: compressions in an arrest, vitals every few minutes
function partnerInitiative(C) {
  if (!OPTS.partnerAuto || WORK.partner || WORK.queue.partner) return;
  const P = C.P;
  if (!partnerCanReach(P) || !C.times.contact || !C.ppe) return;
  if (P.arrest && !workerOn('cpr') && !(C.fireOn && !P.carried)) { partnerSay('No pulse! Starting compressions.'); doAction('cpr', 'partner'); return; }
  if (C.t - (C.partnerT || -999) < 25) return;
  C.partnerT = C.t;
  if (P.arrest) return;
  const old = (k) => !P.meas[k] || C.t - P.meas[k].t > (G.where === 'back' || PARTNER.task === 'back' ? 300 : 420);
  for (const id of ['spo2', 'pulse', 'bp', 'rr']) {
    const key = id === 'pulse' ? 'hr' : id;
    if (P.monitor && (id === 'spo2' || id === 'pulse')) continue;
    if (old(key) && !actionBlock(ACT[id], P, 'partner')) { doAction(id, 'partner'); return; }
  }
  if (!P.monitor && C.times.contact && C.t - C.times.contact > 60 && !actionBlock(ACT.monitor, P, 'partner')) doAction('monitor', 'partner');
}
// the engine medic works the advanced side of an arrest and puts the monitor on; anything else is Ricky's call
function medicInitiative(C) {
  if (!OPTS.partnerAuto || !MEDIC.on || WORK.medic || WORK.queue.medic) return;
  const P = C.P;
  if (!medicCanReach(P) || C.times.contact === undefined || !C.ppe) return;
  if (C.t - (C.medicT || -999) < 15) return;
  C.medicT = C.t;
  const tryDo = (id) => { if (!actionBlock(ACT[id], P, 'medic')) { doAction(id, 'medic'); return true; } return false; };
  if (P.arrest) {
    if (C.shockReady) { tryDo('shock'); return; }
    if (!P.pads && tryDo('aed')) return;
    if (P.pads && P.arrest.t - (C.lastAnalyse || 0) > 120 && !workerOn('analyse') && tryDo('analyse')) { C.lastAnalyse = P.arrest.t; return; }
    if (!P.airway.adjunct && tryDo('igel')) return;
    if (!P.iv && tryDo('iv')) return;
    if (P.arrest.t - P.arrest.lastEpi > 240) tryDo('epi');
    return;
  }
  const wb = worstBleed(P);
  if (wb && wb.kind === 'arterial' && wb.limb && wb.ctrl !== 'tq' && tryDo('tq')) return;
  if (!P.monitor) tryDo('monitor');
}
// Ricky's compressions: one press per push, aim for 100–120 a minute
function cprTap() {
  const now = performance.now() / 1000;
  CPRQ.taps.push(now); while (CPRQ.taps.length > 6) CPRQ.taps.shift();
  CPRQ.last = now;
  if (CPRQ.taps.length >= 3) {
    const d = (CPRQ.taps[CPRQ.taps.length - 1] - CPRQ.taps[0]) / (CPRQ.taps.length - 1);
    CPRQ.rate = 60 / d;
    const err = CPRQ.rate < 100 ? (100 - CPRQ.rate) / 40 : CPRQ.rate > 120 ? (CPRQ.rate - 120) / 40 : 0;
    CPRQ.q = lerp(CPRQ.q, clamp(1 - err, 0.15, 1), 0.5);
  }
  AUDIO.cpr && AUDIO.cpr();
  CARE.cprPulse = 1;
}
function updateCPRQ(dt) {
  const idle = performance.now() / 1000 - CPRQ.last;
  if (idle > 1.1) CPRQ.q = Math.max(0, CPRQ.q - dt * 0.9);
}

// ---------- the care panel ----------
function openCare(P) {
  const C = G.call; if (!C) return;
  CARE.open = true; CARE.P = P; CARE.dirty = true;
  if (!C.times.contact) { C.times.contact = C.t; C.unswallow = !canSwallow(P); bus.emit('contact', C); }
  UI.show('care');
  PLAYER.yaw = Math.atan2(P.where.x - PLAYER.x, P.where.z - PLAYER.z) || PLAYER.yaw;
  renderCare();
}
function closeCare() { CARE.open = false; UI.hide('care'); }
function renderCare() {
  const C = G.call, P = CARE.P; if (!C || !P) return;
  const root = $('#care'); if (!root) return;
  const inBack = G.where === 'back';
  $('#careName').textContent = `${P.name}, ${P.age} ${P.sex}`;
  $('#careSub').textContent = `${C.nature}${C.place.addr ? ' · ' + C.addr : ''}`;
  // tabs
  const tabs = $('#careTabs');
  tabs.innerHTML = '';
  for (const t of [...TABS, { id: 'move', name: inBack ? 'Transport' : 'Move' }]) {
    const b = el('button', 'tab btn' + (CARE.tab === t.id ? ' on' : ''), t.name);
    b.onclick = () => { CARE.tab = t.id; renderCare(); };
    tabs.appendChild(b);
  }
  // who does it
  if (CARE.who === 'medic' && !MEDIC.on) CARE.who = 'ricky';
  for (const w of WORKERS) $('#w-' + w).classList.toggle('on', CARE.who === w);
  // actions
  const list = $('#careActs'); list.innerHTML = '';
  if (CARE.tab === 'move') renderMoveTab(list, P, C);
  else for (const a of ACTIONS.filter((q) => q.tab === CARE.tab)) {
    if (a.show && !a.show(P, C)) continue;
    if ((a.rank || 0) > G.career.rank + 1) continue;
    let why = actionBlock(a, P, CARE.who);
    const queue = why && why.endsWith('is busy') && !actionBlockIgnoringBusy(a, P, CARE.who);
    if (queue) why = null;
    const locked = (a.rank || 0) > G.career.rank;
    const b = el('button', 'act btn' + (why ? ' dis' : '') + (locked ? ' lock' : '') + (a.id === 'shock' || a.id === 'defib' ? ' danger' : ''));
    const stock = a.use && RIG ? (a.use === 'o2' ? Math.round(RIG.stock.o2) + '%' : RIG.stock[a.use]) : '';
    b.innerHTML = `<b>${esc(a.name)}</b><span>${queue ? 'queue next · ' : ''}${a.cont ? 'ongoing' : fmtSec(a.dur)}${stock !== '' ? ' · ' + stock + ' left' : ''}${(a.rank || 0) ? ' · ' + RANKS[a.rank].name : ''}</span>${why ? `<i>${esc(why)}</i>` : ''}`;
    b.title = a.note || '';
    b.onclick = () => { if (!doAction(a.id)) return; renderCare(); };
    list.appendChild(b);
  }
  renderChart(P, C);
  CARE.dirty = false;
}
const fmtSec = (s) => (s >= 60 ? Math.round(s / 6) / 10 + ' min' : Math.round(s) + ' s');
function renderMoveTab(list, P, C) {
  const add = (html, cls, fn, title) => { const b = el('button', 'act btn' + (cls ? ' ' + cls : ''), html); if (title) b.title = title; b.onclick = fn; list.appendChild(b); return b; };
  if (G.where === 'back') {
    const H = C.dest && CITY.hospitals[C.dest];
    add(`<b>${H ? 'To ' + esc(H.short) : 'No destination'}</b><span>${ROUTE.left ? Math.round(ROUTE.left) + ' m, ETA ' + fmtMin(etaFor(ROUTE.left, RIG.siren)) : ''}</span>`, 'info', () => openTransportPanel(true), 'Change hospital or pre-alert');
    add(`<b>${OPTS.ff ? 'Normal speed' : 'Fast-forward ×3'}</b><span>Time passes faster on the way</span>`, '', () => { OPTS.ff = !OPTS.ff; renderCare(); });
    add(`<b>${RIG.siren ? 'Lights & sirens off' : 'Lights & sirens on'}</b><span>Ask ${PARTNER_SHORT} to ${RIG.siren ? 'go routine' : 'run hot'}</span>`, '', () => { setSiren(!RIG.siren); renderCare(); });
    return;
  }
  for (const m of MOVES) {
    const why = moveNeed(P, m);
    add(`<b>${esc(m.name)}</b><span>${fmtSec(m.dur)}</span>${why ? `<i>${esc(why)}</i>` : ''}`, why ? 'dis' : '', () => startMove(P, m.id));
  }
  for (const id of ['stretcher', 'chair', 'scoop', 'board']) {
    const e = EQ[id];
    if (e.at !== 'rig') continue;
    add(`<b>${PARTNER_SHORT}: fetch the ${DEVICES[id].short}</b><span>from the rig</span>`, PARTNER.task === 'fetch' ? 'dis' : '', () => { partnerFetch(id); renderCare(); });
  }
}
// what we know so far, plus the live monitor
function renderChart(P, C) {
  const K = (k) => P.known.has(k), M = (k) => P.meas[k];
  const rows = [];
  if (K('avpu')) rows.push(['AVPU', P.meas.avpu.v]);
  if (K('airway')) rows.push(['Airway', P.meas.airway.v]);
  if (K('lungs')) rows.push(['Lungs', M('lungs').v]);
  if (K('skin')) rows.push(['Skin', M('skin').v]);
  if (K('pupils')) rows.push(['Pupils', M('pupils').v]);
  if (K('gcs')) rows.push(['GCS', M('gcs').v]);
  if (K('glu')) rows.push(['Glucose', M('glu').v + ' mg/dL']);
  if (K('temp')) rows.push(['Temp', M('temp').v + ' °C']);
  if (K('ecg12')) rows.push(['12-lead', M('ecg12').v]);
  if (K('stroke')) rows.push(['Stroke scale', C.strokePos ? 'Positive' : 'Negative']);
  if (K('lkw')) rows.push(['Last known well', M('lkw').v]);
  const found = P.injuries.filter((i) => i.found).map((i) => i.desc);
  if (found.length) rows.push(['Injuries', found.join('; ')]);
  const bl = P.bleeds.filter((b) => b.seen).map((b) => `${b.site}: ${b.ctrl === 'none' ? (b.kind === 'arterial' ? 'spurting' : 'bleeding') : b.ctrl === 'tq' ? 'tourniquet' : b.ctrl}`);
  if (bl.length) rows.push(['Bleeding', bl.join('; ')]);
  if (K('hist')) { const H = P.hist; rows.push(['History', `Allergies: ${H.A || 'none'} · Meds: ${H.M || 'none'} · PMH: ${H.P || 'none'}`]); }
  const iv = [P.o2 ? { nc: 'Nasal cannula', nrb: 'Non-rebreather', bvm: 'BVM', cpap: 'CPAP' }[P.o2] : null, P.airway.adjunct ? P.airway.adjunct.toUpperCase() : null, P.iv ? 'IV' + (P.fluids || P.fluidLeft ? ` (${Math.round(P.fluids)} mL in)` : '') : null, P.spine.collar ? 'C-collar' : null].filter(Boolean);
  if (iv.length) rows.push(['Interventions', iv.join(', ')]);
  const meds = Object.entries(P.medCount).map(([k, n]) => (ACT[k] ? ACT[k].name.split(' ')[0] : k) + (n > 1 ? ' ×' + n : ''));
  if (meds.length) rows.push(['Meds given', meds.join(', ')]);
  $('#careChart').innerHTML = rows.length ? rows.map(([a, b]) => `<div><span>${a}</span><b>${esc(b)}</b></div>`).join('') : '<div class="dim">Nothing charted yet. Start with gloves, a general impression and the ABCs.</div>';
  // log
  $('#careLog').innerHTML = C.log.slice(-7).map((l) => `<div><span>${fmtDur(l.t)}</span> <b>${esc(l.who)}:</b> ${esc(l.text)}</div>`).join('');
  $('#careLog').scrollTop = 1e6;
}
// numbers and workers refresh every frame without rebuilding the buttons
function updateCarePanel(dt) {
  if (!CARE.open) return;
  const C = G.call, P = CARE.P; if (!C || !P) { closeCare(); return; }
  if (G.where === 'foot' && !rickyCanReach(P) && !PLAYER.busy && !WORK.ricky) { closeCare(); return; }
  CARE.refresh = (CARE.refresh || 0) - dt;
  if (CARE.dirty || CARE.refresh <= 0) { CARE.refresh = 0.8; renderCare(); }
  // vitals boxes
  const live = P.monitor;
  const m = (k) => P.meas[k];
  const show = (id, key, val, unit, warn) => {
    const e = $('#v-' + id); if (!e) return;
    const known = live && (key === 'hr' || key === 'spo2') ? val : m(key) ? m(key).v : '--';
    e.querySelector('b').textContent = known;
    e.querySelector('i').textContent = live && (key === 'hr' || key === 'spo2') ? 'live' : m(key) ? fmtDur(C.t - m(key).t) + ' ago' : '';
    e.classList.toggle('warn', !!warn && known !== '--');
  };
  if (live && P.nextNibp !== undefined && C.t >= P.nextNibp) { P.nextNibp = C.t + 300; P.meas.bp = { v: P.arrest ? '0/0' : Math.round(P.v.sbp) + '/' + Math.round(P.v.dbp), t: C.t }; P.known.add('bp'); }
  show('hr', 'hr', P.arrest ? (P.monitor ? '--' : '--') : Math.round(P.v.hr), '', P.v.hr > 120 || P.v.hr < 50 || P.arrest);
  show('spo2', 'spo2', P.arrest ? '--' : Math.round(P.v.spo2), '%', P.v.spo2 < 92);
  show('bp', 'bp', null, '', P.v.sbp < 90 || P.v.sbp > 180);
  show('rr', 'rr', null, '', P.v.rr < 10 || P.v.rr > 26);
  const rh = $('#v-rhythm');
  rh.textContent = live ? (G.career.rank >= 2 || P.pads ? (RHYTHM_NAMES[P.v.rhythm] || '') : (P.arrest ? 'Check pulse!' : 'Monitor on')) : 'No monitor';
  rh.classList.toggle('warn', !!P.arrest && live);
  drawECG(dt, P, live);
  // workers
  $('#w-medic').hidden = !MEDIC.on;
  $('#workers').classList.toggle('three', MEDIC.on);
  for (const who of WORKERS) {
    const j = WORK[who], e = $('#w-' + who);
    const name = who === 'medic' ? `${workerName(who)} · ${MEDIC.unit ? MEDIC.unit.short : ''} medic` : workerName(who);
    const where = who === 'partner' ? ({ fetch: 'fetching', drive: 'driving', cab: 'in the cab', carry: 'carrying' }[PARTNER.task] || '') : '';
    e.querySelector('b').textContent = name;
    const q = WORK.queue[who];
    e.querySelector('span').textContent = (j ? j.name + (j.on ? ' (ongoing)' : '') : where || 'Ready') + (q ? ' · next: ' + ACT[q].name : '');
    e.querySelector('i').style.width = j ? (j.on ? 100 : clamp(j.t / j.dur * 100, 0, 100)) + '%' : '0%';
    e.querySelector('.stop').hidden = !j;
    e.classList.toggle('busy', !!j);
  }
  // CPR pad
  const cprOn = WORK.ricky && WORK.ricky.id === 'cpr' && !OPTS.autoCPR;
  const pad = $('#cprPad'); pad.hidden = !cprOn;
  if (cprOn) {
    updateCPRQ(dt);
    CARE.cprPulse = Math.max(0, (CARE.cprPulse || 0) - dt * 5);
    pad.style.setProperty('--p', CARE.cprPulse);
    $('#cprRate').textContent = CPRQ.rate ? Math.round(CPRQ.rate) + '/min' : 'Tap in rhythm';
    $('#cprQ i').style.width = Math.round(CPRQ.q * 100) + '%';
  }
  $('#careClock').textContent = (C.times.contact ? 'Patient contact ' + fmtDur(C.t - C.times.contact) : '') + (P.arrest ? ' · Arrest ' + fmtDur(P.arrest.t) : '');
}
// a scrolling ECG trace on a canvas
const ECG = { x: 0, phase: 0, last: 0 };
function drawECG(dt, P, live) {
  const cv = $('#ecg'); if (!cv) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  if (!live) { g.fillStyle = '#071008'; g.fillRect(0, 0, W, H); g.fillStyle = '#2a5a3a'; g.font = '13px sans-serif'; g.fillText('Attach the monitor to see the rhythm', 10, H / 2 + 4); return; }
  const speed = 90; // px per real second
  const n = Math.max(1, Math.round(speed * dt));
  for (let k = 0; k < n; k++) {
    ECG.x = (ECG.x + 1) % W;
    g.fillStyle = '#071008'; g.fillRect(ECG.x, 0, 6, H);
    const rhythm = P.v.rhythm, hr = P.arrest ? 0 : P.v.hr;
    let y = 0;
    if (rhythm === 'vf') { ECG.phase += 1 / speed; y = Math.sin(ECG.phase * 31) * 10 + Math.sin(ECG.phase * 17 + 1) * 8 + Math.sin(ECG.phase * 7) * 5; }
    else if (rhythm === 'vt') { ECG.phase += 1 / speed; y = Math.sin(ECG.phase * TAU * 3) * 22; }
    else if (rhythm === 'asys') { y = (Math.random() - 0.5) * 1.5; }
    else {
      const beat = 60 / Math.max(20, rhythm === 'pea' ? 45 : hr);
      ECG.phase += (1 / speed) / beat;
      const p = ECG.phase % 1;
      const ste = rhythm === 'stemi' ? 7 : 0;
      if (p < 0.08) y = Math.sin(p / 0.08 * Math.PI) * 4;
      else if (p < 0.13) y = 0;
      else if (p < 0.15) y = -4; else if (p < 0.18) y = 28; else if (p < 0.21) y = -8;
      else if (p < 0.3) y = ste;
      else if (p < 0.42) y = Math.sin((p - 0.3) / 0.12 * Math.PI) * 7 + ste * (1 - (p - 0.3) / 0.12);
      if (p < ECG.lastP) { if (!P.arrest && G.where !== 'cab') AUDIO.beep && AUDIO.beep(P.v.spo2); }
      ECG.lastP = p;
    }
    const py = H / 2 - y;
    g.strokeStyle = '#4af07a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ECG.x - 1, ECG.lastY === undefined ? py : ECG.lastY); g.lineTo(ECG.x, py); g.stroke();
    ECG.lastY = py;
  }
}
