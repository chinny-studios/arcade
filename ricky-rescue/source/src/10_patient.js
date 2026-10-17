// Ricky Rescue — patients: generation, the physiology model (conditions push vitals around), bleeding, oxygen and
// ventilation, cardiac arrest and resuscitation, exam findings.
//
// Time is game seconds. Vitals are recomputed every tick as a target (baseline + every condition's effect) and the
// shown values ease toward it, so treatment works over a minute or two rather than instantly.

const COND = {};

// ---------- conditions ----------
// Each: init(c, P), tick(c, P, dt, ctx), fx(c, P, t) adjusts the target vitals t, find(c, P, f) adds exam findings.
COND.stemi = {
  init(c) { c.loc = c.loc || 'anterior'; c.aspirin = false; c.vfRisk = c.vfRisk === undefined ? 1 : c.vfRisk; },
  tick(c, P, dt) {
    const g = (c.aspirin ? 0.00045 : 0.0008) * (P.v.spo2 < 92 ? 1.4 : 1);
    c.sev = Math.min(1, c.sev + g * dt);
    if (!P.arrest && G.call && G.call.stage !== 'handoff' && rnd() < 0.00004 * (0.4 + c.sev) * c.vfRisk * dt) startArrest(P, 'vf', 'cardiac');
  },
  fx(c, P, t) {
    t.pain = Math.max(t.pain, 6 + c.sev * 3 - (c.nitro || 0) * 2);
    if (c.loc === 'inferior') { t.hr -= 18 * c.sev; t.sbp -= 12 * c.sev; } else { t.hr += 22 * c.sev; t.sbp -= 8 * c.sev; }
    t.rr += 4; t.nausea = Math.max(t.nausea, 0.4 + c.sev * 0.4);
    t.skin = 'pale, cool, diaphoretic';
  },
  find(c, P, f) { f.other.push('Clutching the chest, diaphoretic'); },
};
COND.stroke = {
  init(c) { c.side = c.side || 'right'; },
  tick(c, P, dt) { c.sev = Math.min(1, c.sev + 0.00012 * dt); },
  fx(c, P, t) { t.sbp += 45; t.dbp += 20; t.gcs -= c.sev > 0.6 ? 3 : 1; t.speech = 'slurred'; },
  find(c, P, f) {
    const s = c.side === 'right' ? 'right' : 'left';
    f.stroke = { face: `${s === 'right' ? 'Right' : 'Left'}-sided facial droop`, arm: `${s === 'right' ? 'Right' : 'Left'} arm drifts down`, speech: c.sev > 0.5 ? 'Garbled words, can\'t name a pen' : 'Slurred speech', eyes: c.sev > 0.6 ? 'Gaze deviated to the ' + (s === 'right' ? 'left' : 'right') : 'Eyes normal', balance: 'Unsteady, can\'t stand' };
    f.other.push('One-sided weakness');
  },
};
COND.hypogly = {
  init(c, P) { c.glu = c.glu || 34; },
  tick(c, P, dt) {
    if (c.give) { const k = Math.min(c.give, dt * c.giveRate); c.glu += k; c.give -= k; }
    c.glu = Math.max(18, c.glu - 0.004 * dt);
    if (c.glu > 75) c.sev = 0;
  },
  fx(c, P, t) {
    t.glu = c.glu;
    if (c.glu < 70) { t.gcs -= c.glu < 30 ? 9 : c.glu < 45 ? 5 : 2; t.hr += 18; t.skin = 'pale, cool, very sweaty'; }
  },
  find(c, P, f) { if (c.glu < 60) f.other.push('Sweaty, confused'); },
};
COND.asthma = {
  tick(c, P, dt) {
    if (c.neb > 0) { const k = Math.min(c.neb, dt * 0.0012); c.sev = Math.max(0, c.sev - k); c.neb -= k; }
    if (c.epi > 0) { const k = Math.min(c.epi, dt * 0.004); c.sev = Math.max(0, c.sev - k); c.epi -= k; }
    if (c.cpap) c.sev = Math.max(0, c.sev - dt * 0.0002);
    c.sev = Math.min(1, c.sev + 0.00025 * dt * (P.position === 'supine' ? 1.8 : 1));
  },
  fx(c, P, t) {
    t.rr += 22 * c.sev - (c.sev > 0.92 ? 18 : 0); t.hr += 35 * c.sev; t.vent += 0.42 * c.sev; t.pain = Math.max(t.pain, 3);
    t.anxiety = Math.max(t.anxiety, 0.4 + c.sev * 0.5);
    if (c.sev > 0.85) t.gcs -= 3;
    t.speech = c.sev > 0.7 ? 'one or two words at a time' : c.sev > 0.4 ? 'short phrases' : '';
  },
  find(c, P, f) { f.lungs = c.sev > 0.9 ? 'Barely any air moving (silent chest)' : c.sev > 0.15 ? 'Wheezes in all fields, long exhale' : 'Faint end-expiratory wheeze'; f.other.push('Tripod position, accessory muscles'); },
};
COND.chf = {
  tick(c, P, dt) {
    let d = 0.00015;
    if (c.cpap) d -= 0.0016;
    if (c.nitro > 0) { d -= 0.0012; c.nitro = Math.max(0, c.nitro - dt / 300); }
    if (P.position === 'supine') d += 0.0004;
    c.sev = clamp(c.sev + d * dt, 0, 1);
  },
  fx(c, P, t) { t.rr += 16 * c.sev; t.hr += 20 * c.sev; t.sbp += 55 * c.sev; t.dbp += 20 * c.sev; t.vent += 0.45 * c.sev; t.anxiety = Math.max(t.anxiety, 0.3 + 0.5 * c.sev); t.speech = c.sev > 0.6 ? 'short phrases' : ''; },
  find(c, P, f) { f.lungs = c.sev > 0.2 ? 'Crackles (rales) up to mid-fields on both sides' : 'Crackles in both bases'; f.other.push('Swollen ankles', 'Distended neck veins (JVD)'); f.skin = 'pale, cool, sweaty'; },
};
COND.anaph = {
  tick(c, P, dt) {
    if (c.epi > 0) { const k = Math.min(c.epi, dt * 0.006); c.sev = Math.max(0, c.sev - k); c.epi -= k; if (c.epi <= 0) c.rebound = 600; }
    if (c.rebound > 0) { c.rebound -= dt; c.sev = Math.min(1, c.sev + 0.0002 * dt); }
    else c.sev = Math.min(1, c.sev + (c.antihist ? 0.0009 : 0.0016) * dt);
  },
  fx(c, P, t) {
    t.hr += 45 * c.sev; t.sbp -= 65 * c.sev * c.sev; t.dbp -= 30 * c.sev; t.rr += 12 * c.sev; t.vent += 0.5 * Math.max(0, c.sev - 0.3);
    t.airwaySwell = c.sev; t.skin = 'flushed with hives'; t.anxiety = Math.max(t.anxiety, 0.7);
    if (c.sev > 0.8) t.gcs -= 3;
    t.speech = c.sev > 0.6 ? 'hoarse, muffled voice' : '';
  },
  find(c, P, f) { f.lungs = c.sev > 0.3 ? 'Wheezes, tight' : 'Clear, some tightness'; f.airway = c.sev > 0.5 ? 'Stridor, swollen lips and tongue' : 'Lips swelling'; f.other.push('Hives across the chest and arms'); },
};
COND.opioid = {
  tick(c, P, dt) {
    if (c.narcan > 0) { const k = Math.min(c.narcan, dt * (c.narcanIV ? 0.02 : 0.007)); c.sev = Math.max(0, c.sev - k); c.narcan -= k; if (c.sev < 0.1 && !c.woke) { c.woke = true; bus.emit('patientWoke', P); } }
  },
  fx(c, P, t) { t.rrSet = Math.max(2, Math.round(14 - 12 * c.sev)); t.vent += 0.75 * c.sev; t.gcs -= 11 * c.sev; t.hr -= 10 * c.sev; t.pupils = c.sev > 0.25 ? 'pinpoint' : 'equal, reactive'; },
  find(c, P, f) { if (c.sev > 0.3) f.other.push('Pinpoint pupils', 'Snoring respirations'); f.other.push('Drug paraphernalia nearby'); },
};
COND.seizure = {
  init(c) { c.active = c.active !== false; c.left = c.left || 240; c.post = 0; },
  tick(c, P, dt) {
    if (c.active) { c.left -= dt * (c.status ? 0 : 1); if (c.left <= 0 || c.midaz) { c.active = false; c.post = 900; bus.emit('seizureStop', P); } }
    else if (c.post > 0) c.post -= dt;
  },
  fx(c, P, t) {
    if (c.active) { t.gcs = 4; t.hr += 30; t.sbp += 20; t.vent += 0.45; t.seizing = true; t.airwayFluid = true; }
    else if (c.post > 0) { t.gcs -= Math.round(5 * c.post / 900) + 1; t.hr += 10; }
  },
  find(c, P, f) { if (c.active) f.other.push('Rhythmic jerking of all limbs'); else f.other.push('Drowsy, confused (post-ictal)', 'Bitten tongue'); },
};
COND.tbi = {
  tick(c, P, dt) { c.sev = Math.min(1, c.sev + (c.grow || 0.00006) * dt * (P.v.spo2 < 90 ? 2 : 1) * (P.v.sbp < 90 ? 2 : 1)); },
  fx(c, P, t) {
    t.gcs -= Math.round(8 * c.sev);
    if (c.sev > 0.65) { t.sbp += 40 * (c.sev - 0.6) * 2.5; t.hr -= 25 * (c.sev - 0.6) * 2.5; t.rrIrregular = true; t.pupils = 'left pupil dilated, sluggish'; }
    t.nausea = Math.max(t.nausea, 0.4);
  },
  find(c, P, f) { f.other.push('Swelling and a laceration on the scalp'); if (c.sev > 0.5) f.other.push('Repeating questions'); },
};
COND.fracture = {
  init(c) { c.splinted = false; c.site = c.site || 'left forearm'; },
  tick(c, P, dt) { if (c.moved && !c.splinted) { c.moved = false; P.painBump = 2; } },
  fx(c, P, t) { t.pain = Math.max(t.pain, (c.femur ? 8 : c.hip ? 8 : 7) - (c.splinted ? (c.traction ? 4 : 3) : 0)); },
  find(c, P, f) { f.other.push(c.desc || ('Deformity of the ' + c.site)); },
};
COND.pneumo = {
  tick(c, P, dt) { if (!c.decomp) c.sev = Math.min(1, c.sev + (c.sealed ? 0.0006 : 0.0011) * dt * (P.o2 === 'bvm' || P.airway.adjunct === 'ett' ? 1.6 : 1)); else c.sev = Math.max(0.03, c.sev - 0.01 * dt); },
  fx(c, P, t) { t.rr += 18 * c.sev; t.hr += 40 * c.sev; t.sbp -= Math.max(0, c.sev - 0.45) * 130; t.vent += 0.45 * c.sev; t.anxiety = Math.max(t.anxiety, 0.4 + 0.4 * c.sev); },
  find(c, P, f) { f.lungs = c.decomp ? 'Improving on the ' + (c.side || 'left') : 'Absent on the ' + (c.side || 'left') + ', clear on the other side'; if (c.sev > 0.6) f.other.push('Distended neck veins', 'Trachea shifted'); if (c.open) f.other.push('Sucking chest wound'); },
};
COND.labor = {
  init(c) { c.stage = c.stage || 'active'; c.crown = c.crown || 0; c.born = false; c.baby = null; c.contraction = 0; },
  tick(c, P, dt) {
    c.contraction += dt;
    if (!c.born) c.crown = Math.min(1, c.crown + c.rate * dt);
    if (c.born && !c.fundal && c.pph === undefined) c.pph = 0;
    if (c.born && !c.fundal) c.pph = (c.pph || 0) + dt * 0.4;
  },
  fx(c, P, t) { t.pain = Math.max(t.pain, c.born ? 3 : 6 + c.crown * 3); t.hr += 15; if (c.pph > 300) t.sbp -= Math.min(30, (c.pph - 300) / 20); },
  find(c, P, f) { f.other.push(c.crown > 0.7 && !c.born ? 'Crowning: the baby\'s head is visible' : c.born ? 'Delivered, uterus ' + (c.fundal ? 'firm' : 'soft') : 'Contractions ' + (c.crown > 0.4 ? '2' : '4') + ' minutes apart'); },
};
COND.intox = { fx(c, P, t) { t.gcs -= 1; t.hr += 10; t.speech = 'slurred'; }, find(c, P, f) { f.other.push('Smells of alcohol'); } };
COND.anxiety = { tick(c, P, dt) { if (c.calm) c.sev = Math.max(0, c.sev - dt * 0.002); }, fx(c, P, t) { t.rr += 10 * c.sev; t.hr += 25 * c.sev; t.anxiety = Math.max(t.anxiety, c.sev); }, find(c, P, f) { f.other.push('Tingling in the hands and lips'); } };
COND.dehydr = { fx(c, P, t) { t.hr += 25 * c.sev; t.sbp -= 25 * c.sev; t.temp += 0.8 * c.sev; }, find(c, P, f) { f.other.push('Dry mouth, poor skin turgor'); } };
COND.heat = { tick(c, P, dt) { if (c.cooling) c.sev = Math.max(0, c.sev - dt * 0.0006); }, fx(c, P, t) { t.temp += 3.2 * c.sev; t.hr += 40 * c.sev; t.sbp -= 25 * c.sev; t.gcs -= Math.round(5 * c.sev); t.skin = c.sev > 0.6 ? 'hot, dry, flushed' : 'hot, sweaty'; }, find() { } };

// ---------- making a patient ----------
function makePatient(spec, r = rnd) {
  const sex = spec.sex || (r.chance(0.5) ? 'M' : 'F');
  const age = spec.age || r.int(25, 70);
  const first = spec.first || r.pick(sex === 'F' ? FIRST_NAMES_F : FIRST_NAMES_M), last = spec.last || r.pick(LAST_NAMES);
  const P = {
    first, last, name: first + ' ' + last, age, sex, kg: spec.kg || (age < 13 ? 8 + age * 3 : sex === 'F' ? Math.round(r.range(55, 92)) : Math.round(r.range(66, 108))),
    look: Object.assign(civilianLook(r, { sex, age }), spec.look || {}),
    base: Object.assign({ hr: age > 65 ? 76 : 72, sbp: age > 60 ? 138 : 124, dbp: 80, rr: 16, spo2: age > 70 ? 96 : 98, temp: 36.9, glu: 108, gcs: 15, etco2: 38 }, spec.base || {}),
    conds: {}, bleeds: (spec.bleeds || []).map((b) => Object.assign({ ctrl: 'none', lost: 0, kind: 'venous', limb: true }, b)),
    injuries: (spec.injuries || []).map((i) => Object.assign({ found: false, treated: false }, i)),
    v: {}, avpu: 'A', arrest: null, dead: false, rosc: false, roscV: 1,
    airway: { opened: false, adjunct: null, cleared: false },
    o2: null, iv: false, fluids: 0, fluidLeft: 0, meds: [], medCount: {},
    spine: Object.assign({ risk: false, injured: false, collar: false, board: false, violated: false }, spec.spine || {}),
    position: spec.position || 'sitting', pose: spec.pose || 'sit', place: spec.place || 'floor',
    hist: spec.hist || {}, flags: Object.assign({}, spec.flags || {}),
    known: new Set(), meas: {}, monitor: false, pads: false, ecg12: null,
    loss: spec.loss || 0, internal: spec.internal || 0, // mL lost so far; internal bleed rate mL/min
    stats: { hypoxT: 0, hypoT: 0, arrestT: 0, painSum: 0, worst: 1 },
    pain: spec.pain || 0, painRelief: 0, anxiety: 0.3, calm: 0, nausea: 0, vomitT: 0, said: [],
    shock: { warm: false, legs: false },
    kids: spec.kids || null,
  };
  for (const [id, c] of Object.entries(spec.conds || {})) { P.conds[id] = Object.assign({ sev: 0.3 }, c); if (COND[id].init) COND[id].init(P.conds[id], P); }
  derive(P, 999);
  if (spec.arrest) startArrest(P, spec.arrest, spec.arrestCause || 'cardiac', spec.downtime || 0);
  return P;
}

// ---------- the tick ----------
// ctx: { cpr: quality 0..1 (0 = none), bvm: bool, pressure: bool, rough: 0.., t }
function tickPatient(P, dt, ctx) {
  if (P.dead) return;
  for (const id in P.conds) { const C = COND[id]; if (C.tick) C.tick(P.conds[id], P, dt, ctx); }
  // bleeding: external sites plus internal
  let rate = P.internal; // mL/min
  for (const b of P.bleeds) {
    if (b.stopped) continue;
    let k = 1;
    if (b.ctrl === 'dressing') k = b.kind === 'arterial' ? 0.55 : 0.2;
    else if (b.ctrl === 'gauze') k = 0.08;
    else if (b.ctrl === 'tq') k = 0;
    if (ctx.pressure && b === worstBleed(P) && b.ctrl !== 'tq') k = Math.min(k, 0.12);
    const r = b.rate * k * (P.arrest ? 0.15 : 1) * (P.v.sbp < 70 ? 0.6 : 1);
    b.cur = r; rate += r;
    b.lost += r * dt / 60;
  }
  if (P.txa) rate *= 0.9;
  P.loss += rate * dt / 60;
  P.bleedRate = rate;
  // fluids run in at about 100 mL/min
  if (P.fluidLeft > 0) { const k = Math.min(P.fluidLeft, dt * 1.6); P.fluidLeft -= k; P.fluids += k; }
  // medications with onset (generic pharmacology)
  for (const m of P.meds) if (!m.done && m.at <= ctx.t) { m.done = true; if (m.fn) m.fn(P); }
  if (P.painRelief > 0) P.painRelief = Math.max(0, P.painRelief - dt / 900);
  if (P.calm > 0) P.calm = Math.max(0, P.calm - dt / 600);
  if (P.arrest) tickArrest(P, dt, ctx); else checkArrest(P, dt, ctx);
  derive(P, dt, ctx);
  // running totals for the outcome
  const S = P.stats;
  if (P.v.spo2 < 88) S.hypoxT += dt;
  if (P.v.sbp < 90 && !P.arrest) S.hypoT += dt;
  if (P.arrest) S.arrestT += dt;
  S.painSum += P.v.pain * dt;
  if (P.vomitT > 0) P.vomitT -= dt;
  // nausea can make an unprotected patient vomit
  if (P.v.nausea > 0.6 && !P.medCount.ondan && rnd() < dt * 0.0006 && P.vomitT <= 0) { P.vomitT = 120; P.airway.cleared = false; P.vomited = (P.vomited || 0) + 1; bus.emit('vomit', P); }
}
function worstBleed(P) { let b = null; for (const q of P.bleeds) if (!q.stopped && q.ctrl !== 'tq' && (!b || q.rate > b.rate)) b = q; return b; }
function effLoss(P) { return Math.max(0, P.loss - P.fluids * 0.3); }

// target vitals, then ease toward them
function derive(P, dt, ctx = {}) {
  const t = Object.assign({}, P.base, { pain: P.pain, vent: 0, nausea: 0, anxiety: P.anxiety, skin: 'pink, warm, dry', pupils: 'equal, reactive', speech: '', airwaySwell: 0, rrSet: 0 });
  for (const id in P.conds) { const C = COND[id]; if (C.fx) C.fx(P.conds[id], P, t); }
  // blood loss (Class I–IV shock)
  const f = effLoss(P) / (P.kg * 70);
  if (f > 0.1) { t.hr += clamp((f - 0.1) * 260, 0, 75); t.rr += clamp((f - 0.15) * 50, 0, 14); t.skin = f > 0.25 ? 'pale, cool, clammy' : t.skin; }
  if (f > 0.22) { t.sbp -= clamp((f - 0.22) * 300, 0, 85); t.dbp -= clamp((f - 0.22) * 150, 0, 40); }
  if (f > 0.33) t.gcs -= Math.round((f - 0.33) * 40);
  if (P.shock.warm && f > 0.15) t.sbp += 3;
  if (P.shock.legs && f > 0.15) t.sbp += 4;
  // fluids lift the pressure a little in shock
  if (P.fluids > 0 && f > 0.15) t.sbp += Math.min(20, P.fluids / 60);
  // airway: an unconscious patient obstructs unless opened; vomit or blood until suctioned
  const gcsEst = P.v.gcs === undefined ? t.gcs : P.v.gcs;
  P.airwayState = 'clear';
  if (gcsEst <= 8 && !P.airway.adjunct && !P.airway.opened && P.position !== 'recovery' && !P.arrest) { t.vent += 0.3; P.airwayState = 'snoring'; }
  if ((t.airwayFluid || P.vomitT > 0) && !P.airway.cleared) { t.vent += 0.25; P.airwayState = 'gurgling'; }
  if (t.airwaySwell > 0.5 && !['igel', 'ett'].includes(P.airway.adjunct)) { t.vent += (t.airwaySwell - 0.5) * 1.2; P.airwayState = 'stridor'; }
  // pain and anxiety
  t.pain = clamp(t.pain - P.painRelief * 5 + (P.painBump || 0), 0, 10);
  t.hr += t.pain * 2.2 + t.anxiety * 10; t.sbp += t.pain * 2; t.rr += t.pain * 0.4 + t.anxiety * 4;
  if (P.calm > 0) { t.hr -= 6 * P.calm; t.rr -= 2 * P.calm; }
  // ventilation and oxygen
  let vent = clamp(t.vent, 0, 1.2);
  const bvm = ctx.bvm && !P.arrest;
  if (bvm) vent *= 0.15;
  if (P.airway.adjunct === 'ett' || P.airway.adjunct === 'igel') vent *= bvm ? 0.5 : 1;
  let spo2 = t.spo2 - vent * 32;
  const boost = { nc: 3, nrb: 7, bvm: 10, cpap: 9 }[P.o2] || 0;
  spo2 = Math.min(100, spo2 + Math.min(boost, Math.max(0, 100 - spo2) * 0.8));
  if (bvm) spo2 = Math.max(spo2, 94 - Math.max(0, t.vent - 0.8) * 20);
  t.spo2 = spo2;
  if (t.rrSet) t.rr = t.rrSet;
  if (bvm) t.rr = 12;
  if (t.spo2 < 85) { t.hr += (85 - t.spo2) * 0.8; t.gcs -= Math.round((85 - t.spo2) / 6); t.skin = t.spo2 < 80 ? 'grey-blue (cyanotic)' : t.skin; }
  t.etco2 = 38 + (t.rrSet && !bvm ? (14 - t.rrSet) * 3.5 : 0) - (t.rr > 24 ? (t.rr - 24) * 0.6 : 0);
  // arrest overrides everything
  if (P.arrest) {
    const q = ctx.cpr || 0;
    Object.assign(t, { hr: 0, sbp: q ? 55 * q : 0, dbp: q ? 20 * q : 0, rr: 0, gcs: 3, spo2: ctx.bvm || P.airway.adjunct ? 82 : 60, etco2: q ? 8 + 14 * q : 3, pain: 0, skin: 'grey, cool' });
  }
  t.gcs = clamp(Math.round(t.gcs), 3, 15);
  t.hr = Math.max(0, t.hr); t.rr = Math.max(0, t.rr); t.sbp = Math.max(0, t.sbp); t.dbp = Math.max(0, clamp(t.dbp - (P.base.sbp - t.sbp) * 0.35, t.sbp * 0.5, t.sbp - 25));
  // ease
  const k = dt >= 999 ? 1 : 1 - Math.exp(-dt / 22), kf = dt >= 999 ? 1 : 1 - Math.exp(-dt / 8);
  const v = P.v;
  for (const key of ['hr', 'sbp', 'dbp', 'rr', 'spo2', 'temp', 'glu', 'etco2', 'pain', 'nausea']) {
    if (v[key] === undefined) v[key] = t[key];
    else v[key] = lerp(v[key], t[key], P.arrest || key === 'pain' || key === 'glu' ? kf : k);
  }
  v.gcs = v.gcs === undefined ? t.gcs : (Math.abs(v.gcs - t.gcs) >= 1 && rnd() < (dt >= 999 ? 1 : dt / 15) ? v.gcs + Math.sign(t.gcs - v.gcs) : v.gcs);
  if (P.arrest) v.gcs = 3;
  v.skin = t.skin; v.pupils = t.pupils; v.speech = t.speech; v.seizing = !!t.seizing; v.rrIrregular = !!t.rrIrregular; v.anxiety = t.anxiety;
  v.pulse = P.arrest ? 'absent' : v.sbp < 75 ? 'weak, thready (no radial)' : v.sbp < 92 || v.hr > 120 ? 'rapid, weak' : v.hr < 55 ? 'slow, strong' : 'strong, regular';
  v.rhythm = P.arrest ? P.arrest.rhythm : rhythmFor(P);
  P.avpu = v.gcs >= 14 ? 'A' : v.gcs >= 10 ? 'V' : v.gcs >= 7 ? 'P' : 'U';
  if (P.painBump) P.painBump = Math.max(0, P.painBump - (dt >= 999 ? 0 : dt / 120));
}
function rhythmFor(P) {
  const v = P.v;
  if (P.conds.stemi) return 'stemi';
  if (v.hr > 150 && P.conds.svt) return 'svt';
  if (v.hr >= 100) return 'stach';
  if (v.hr < 60) return 'sbrad';
  if (P.flags.afib) return 'afib';
  return 'sinus';
}
const RHYTHM_NAMES = { sinus: 'Sinus rhythm', stach: 'Sinus tachycardia', sbrad: 'Sinus bradycardia', afib: 'Atrial fibrillation', stemi: 'Sinus with ST elevation', svt: 'SVT', vf: 'Ventricular fibrillation', vt: 'Pulseless V-tach', pea: 'PEA (organised, no pulse)', asys: 'Asystole' };
const SHOCKABLE = (r) => r === 'vf' || r === 'vt';

// ---------- cardiac arrest ----------
function startArrest(P, rhythm, cause, downtime = 0) {
  if (P.arrest || P.dead) return;
  P.arrest = { rhythm, cause, t: downtime, V: clamp(1 - downtime * 0.0017, 0.05, 1), cprT: 0, noCprT: downtime, shocks: 0, epi: 0, lastEpi: -999, amio: 0, cycle: 0, analyses: 0, onsetT: G.call ? G.call.t : 0, witnessed: downtime === 0 };
  P.rosc = false;
  P.o2 = P.o2 === 'cpap' ? null : P.o2;
  P.stats.arrests = (P.stats.arrests || 0) + 1;
  bus.emit('arrest', P);
}
function tickArrest(P, dt, ctx) {
  const A = P.arrest, q = ctx.cpr || 0;
  A.t += dt;
  if (q > 0) A.cprT += dt; else A.noCprT += dt;
  const decay = q > 0 ? 0.00022 + (1 - q) * 0.0011 : 0.0017;
  A.V = Math.max(0, A.V - decay * dt * (ctx.bvm || P.airway.adjunct ? 0.85 : 1));
  if (SHOCKABLE(A.rhythm) && A.V < 0.3 && rnd() < dt * 0.003) A.rhythm = 'asys';
  // every two minutes of CPR, a pulse check can find ROSC in non-shockable rhythms when the cause is fixed
  if (q > 0) {
    A.cycle += dt;
    if (A.cycle >= 120) {
      A.cycle = 0;
      if (!SHOCKABLE(A.rhythm)) {
        let p = (0.02 + 0.16 * A.V) * (A.epi > 0 && A.t - A.lastEpi < 300 ? 1.7 : 1) * causeFixed(P) * q;
        if (rnd() < p) achieveROSC(P);
        else if (A.rhythm === 'pea' && A.V < 0.2 && rnd() < 0.4) A.rhythm = 'asys';
      }
    }
  }
}
// how much the arrest's cause has been dealt with (multiplies ROSC chances)
function causeFixed(P) {
  const c = P.arrest.cause;
  if (c === 'hypoxia' || c === 'opioid') return (P.airway.adjunct || P.bvmTime > 30 ? 1.6 : 0.6) * (P.conds.opioid && P.conds.opioid.sev < 0.3 ? 1.4 : 1);
  if (c === 'bleed') return P.bleeds.every((b) => b.ctrl !== 'none' || b.stopped) && P.fluids > 400 ? 1.5 : 0.25;
  if (c === 'pneumo') return P.conds.pneumo && P.conds.pneumo.decomp ? 2.2 : 0.15;
  if (c === 'anaph') return P.medCount.epipen || P.medCount.epi ? 1.3 : 0.4;
  return 1;
}
// shock from the AED or monitor: returns 'rosc', 'noeffect' or 'refib'
function deliverShock(P) {
  const A = P.arrest; if (!A) return 'noeffect';
  A.shocks++;
  if (!SHOCKABLE(A.rhythm)) return 'noeffect';
  const p = clamp(0.18 + 0.5 * A.V + (A.amio ? 0.12 : 0) + Math.min(A.epi, 2) * 0.04 + (A.shocks === 1 && A.noCprT < 120 ? 0.1 : 0), 0.05, 0.85);
  if (rnd() < p) { achieveROSC(P); return 'rosc'; }
  if (rnd() < 0.3) A.rhythm = A.rhythm === 'vf' ? 'vt' : 'vf';
  return 'refib';
}
function achieveROSC(P) {
  const A = P.arrest;
  P.roscV = A.V; P.rosc = true; P.arrest = null;
  P.lastArrest = A;
  // a weak heart after ROSC: low pressure, slow to wake, may need ventilation
  P.base.hr = 104; P.base.sbp = 92; P.base.dbp = 58;
  P.base.gcs = A.V > 0.7 ? 9 : A.V > 0.4 ? 6 : 4;
  if (A.cause === 'opioid' && P.conds.opioid) P.conds.opioid.sev = Math.min(P.conds.opioid.sev, 0.5);
  if (P.conds.stemi) P.conds.stemi.vfRisk = 0.6;
  bus.emit('rosc', P);
}
function checkArrest(P, dt, ctx) {
  const v = P.v, f = effLoss(P) / (P.kg * 70);
  P.critT = P.critT || 0;
  const crit = v.spo2 < 62 || v.sbp < 52 || f > 0.48;
  P.critT = crit ? P.critT + dt : Math.max(0, P.critT - dt * 2);
  if (P.critT > 75) {
    const cause = f > 0.45 ? 'bleed' : P.conds.pneumo && P.conds.pneumo.sev > 0.9 ? 'pneumo' : P.conds.anaph && P.conds.anaph.sev > 0.9 ? 'anaph' : P.conds.opioid ? 'opioid' : 'hypoxia';
    startArrest(P, cause === 'hypoxia' && rnd() < 0.3 ? 'asys' : 'pea', cause);
    P.critT = 0;
  }
  // after ROSC the heart can stop again if the pressure is left low
  if (P.rosc && v.sbp < 80 && rnd() < dt * 0.0006) startArrest(P, rnd() < 0.5 ? 'vf' : 'pea', 'cardiac');
}

// ---------- exam findings ----------
function findings(P) {
  const f = { lungs: 'Clear and equal on both sides', skin: P.v.skin, airway: null, other: [], stroke: null, pupils: P.v.pupils };
  for (const id in P.conds) { const C = COND[id]; if (C.find) C.find(P.conds[id], P, f); }
  if (!f.airway) f.airway = P.arrest ? 'No breathing' : { clear: 'Clear, talking', snoring: 'Snoring: the tongue is blocking it', gurgling: 'Gurgling: fluid in the airway', stridor: 'Stridor: high-pitched, swelling' }[P.airwayState];
  if (P.airwayState === 'clear' && P.avpu !== 'A' && !P.arrest) f.airway = 'Open, not talking';
  if (P.arrest) f.lungs = 'No breath sounds (not breathing)';
  return f;
}
// a short spoken line for the current state of the patient
function patientLine(P) {
  if (P.arrest || P.avpu === 'U') return null;
  if (P.avpu === 'P') return '(moans)';
  if (P.avpu === 'V') return pick(['Wha... where am I?', 'Mm... leave me alone...', 'Huh?']);
  const s = P.v.speech;
  if (s === 'one or two words at a time') return 'Can\'t... breathe...';
  if (P.conds.labor && !P.conds.labor.born) return pick(['Here comes another one!', 'I need to push!', 'Is it supposed to hurt this much?!']);
  if (P.v.pain >= 7) return pick(['It really hurts.', 'Please, it hurts so much.', 'Ow, ow, careful...']);
  if (P.v.anxiety > 0.6) return pick(['Am I going to be okay?', 'I\'m scared.', 'What\'s happening to me?']);
  return pick(['Thank you for coming.', 'I feel a little better now.', 'Okay.', 'Do I really have to go to the hospital?']);
}
