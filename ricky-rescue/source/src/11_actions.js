// Ricky Rescue — patient care actions. Each action has a duration in game seconds, who can do it (Marisol is an EMT:
// she does basic skills only), the minimum rank for Ricky, a supply it uses, and hooks:
//   show(P, C)  listed at all?            need(P, C)  reason it can't be done now (button disabled)
//   harm(P, C)  a contraindication: allowed, but recorded as an error with the reason
//   done(P, C, who)  apply; returns the log line
// C is the active call. Continuous actions (CPR, BVM, direct pressure) keep a worker busy until stopped.

const TABS = [
  { id: 'assess', name: 'Assess' }, { id: 'vitals', name: 'Vitals' }, { id: 'airway', name: 'Airway & O₂' },
  { id: 'circ', name: 'Circulation' }, { id: 'trauma', name: 'Trauma' }, { id: 'meds', name: 'Meds' }, { id: 'other', name: 'Other' },
];
const reveal = (P, C, key, val) => { P.known.add(key); if (val !== undefined) P.meas[key] = { v: val, t: C.t }; };
const fmtBP = (P) => Math.round(P.v.sbp) + '/' + Math.round(P.v.dbp);
const noise = (v, a) => Math.round(v + (Math.random() - 0.5) * 2 * a);
const isConscious = (P) => P.avpu === 'A' && !P.arrest;
const canSwallow = (P) => P.avpu === 'A' && !P.arrest && !P.v.seizing;
function giveMed(P, C, id, onset, fn) { P.meds.push({ id, t: C.t, at: C.t + onset, fn }); P.medCount[id] = (P.medCount[id] || 0) + 1; }
const hasAlert = (P, key) => !!P.flags[key];
const noDuplicates = (id, n = 1) => (P) => ((P.medCount[id] || 0) >= n ? 'Already given' : null);

const ACTIONS = [
  // ---------------- assessment ----------------
  { id: 'ppe', tab: 'assess', name: 'Gloves & PPE', dur: 5, who: 'both', note: 'Body substance isolation before touching anyone.',
    show: (P, C) => !C.ppe, done: (P, C) => { C.ppe = true; return 'Gloves on.'; } },
  { id: 'impression', tab: 'assess', name: 'General impression (AVPU)', dur: 10, who: 'both', note: 'Look, listen, talk: how sick, how awake, any obvious threat to life.',
    done: (P, C) => {
      reveal(P, C, 'avpu', P.avpu); reveal(P, C, 'impression');
      const f = findings(P), threats = [];
      if (P.arrest) threats.push('not breathing, no movement');
      if (P.bleeds.some((b) => b.kind === 'arterial' && b.ctrl === 'none')) threats.push('bright red blood spurting');
      if (P.airwayState !== 'clear' && !P.arrest) threats.push(f.airway.toLowerCase());
      if (P.v.seizing) threats.push('actively seizing');
      return `${P.avpu === 'A' ? 'Awake and alert' : P.avpu === 'V' ? 'Responds to voice' : P.avpu === 'P' ? 'Responds only to pain' : 'Unresponsive'}${threats.length ? '. ' + threats.join(', ') : ''}. Skin ${P.v.skin}.`;
    } },
  { id: 'abc', tab: 'assess', name: 'Primary survey (ABCs)', dur: 20, who: 'both', note: 'Airway, breathing, circulation and major bleeding.',
    done: (P, C) => {
      const f = findings(P);
      reveal(P, C, 'abc'); reveal(P, C, 'airway', f.airway); reveal(P, C, 'skin', P.v.skin);
      for (const b of P.bleeds) b.seen = true;
      const br = P.arrest ? 'Not breathing' : P.v.rr < 8 ? 'Very slow, shallow breathing' : P.v.rr > 28 ? 'Fast, laboured breathing' : 'Breathing adequately';
      const pu = P.arrest ? 'No carotid pulse' : 'Radial pulse ' + P.v.pulse;
      const bl = P.bleeds.filter((b) => !b.stopped && b.ctrl === 'none').map((b) => `${b.kind === 'arterial' ? 'spurting' : 'steady'} bleeding from the ${b.site}`);
      return `A: ${f.airway}. B: ${br}. C: ${pu}${bl.length ? '; ' + bl.join(', ') : ''}.`;
    } },
  { id: 'lungs', tab: 'assess', name: 'Listen to lung sounds', dur: 15, who: 'both', note: 'Stethoscope on both sides of the chest.',
    done: (P, C) => { const f = findings(P); reveal(P, C, 'lungs', f.lungs); return 'Lungs: ' + f.lungs + '.'; } },
  { id: 'exam', tab: 'assess', name: 'Head-to-toe exam', dur: 60, who: 'both', note: 'Find every injury and sign. A rapid trauma assessment for trauma, a focused exam for medical calls.',
    done: (P, C) => {
      const f = findings(P); reveal(P, C, 'exam');
      for (const i of P.injuries) i.found = true;
      for (const b of P.bleeds) b.seen = true;
      reveal(P, C, 'pupils', f.pupils);
      const inj = P.injuries.map((i) => i.desc);
      const bits = [...inj, ...f.other.filter((o) => !inj.includes(o))];
      if (P.flags.medicAlert) bits.push('Medical alert bracelet: ' + P.flags.medicAlert);
      return bits.length ? 'Found: ' + bits.join('; ') + '. Pupils ' + f.pupils + '.' : 'No injuries or abnormal findings. Pupils ' + f.pupils + '.';
    } },
  { id: 'stroke', tab: 'assess', name: 'Stroke scale (BE-FAST)', dur: 40, who: 'both', note: 'Balance, eyes, face, arms, speech, time last known well.',
    need: (P) => (P.arrest || P.avpu === 'U' ? 'Patient must be responsive' : null),
    done: (P, C) => {
      const f = findings(P); reveal(P, C, 'stroke');
      if (!f.stroke) { C.strokeNeg = true; return 'Stroke scale normal: smile even, arms hold, speech clear.'; }
      C.strokePos = true;
      return `Positive: ${f.stroke.face}; ${f.stroke.arm}; ${f.stroke.speech}; ${f.stroke.balance}.`;
    } },
  { id: 'gcs', tab: 'assess', name: 'GCS & orientation', dur: 12, who: 'both', note: 'Eyes, verbal, motor (3–15) and orientation to person, place, time, event.',
    done: (P, C) => { reveal(P, C, 'gcs', P.v.gcs); return `GCS ${P.v.gcs}${P.v.gcs === 15 ? ', oriented to person, place, time and event' : P.v.gcs >= 13 ? ', confused' : ''}.`; } },
  { id: 'sample', tab: 'assess', name: 'History (SAMPLE)', dur: 50, who: 'ricky', note: 'Signs & symptoms, allergies, medications, past history, last intake, events.',
    done: (P, C) => {
      reveal(P, C, 'sample');
      const H = P.hist, src = isConscious(P) && P.v.speech !== 'one or two words at a time' ? 'patient' : C.bystander ? 'bystander' : null;
      if (!src) { C.historyFail = true; return 'No one can give a history. Check for a medical alert tag, pill bottles or a phone.'; }
      const who = src === 'patient' ? 'Patient' : C.bystander.rel;
      P.known.add('hist');
      for (const k of ['S', 'A', 'M', 'P', 'L', 'E']) if (H[k]) reveal(P, C, 'h' + k, H[k]);
      if (H.lkw) { reveal(P, C, 'lkw', H.lkw); }
      if (H.pde) P.known.add('pde');
      return `${who}: ${H.E || 'No details'} Allergies: ${H.A || 'none'}. Meds: ${H.M || 'none'}. History: ${H.P || 'none'}.${H.lkw ? ' Last known well: ' + H.lkw + '.' : ''}`;
    } },
  { id: 'opqrst', tab: 'assess', name: 'Pain history (OPQRST)', dur: 30, who: 'ricky', note: 'Onset, provocation, quality, radiation, severity, time.',
    show: (P) => !!P.hist.O, need: (P) => (isConscious(P) ? null : 'Patient can\'t answer'),
    done: (P, C) => { reveal(P, C, 'opqrst'); const H = P.hist; return `Onset ${H.O}. Worse with ${H.Pq || 'nothing'}. Feels ${H.Q}. ${H.Rr ? 'Spreads to ' + H.Rr + '. ' : ''}Pain ${Math.round(P.v.pain)}/10. Started ${H.T}.`; } },
  // ---------------- vitals ----------------
  { id: 'pulse', tab: 'vitals', name: 'Pulse', dur: 15, who: 'both', note: 'Rate and quality at the wrist.',
    done: (P, C) => { const v = P.arrest ? 0 : noise(P.v.hr, 2); reveal(P, C, 'hr', v); C.vitalSets = (C.vitalSets || 0) + 0.25; return P.arrest ? 'No pulse!' : `Pulse ${v}, ${P.v.pulse}.`; } },
  { id: 'bp', tab: 'vitals', name: 'Blood pressure', dur: 30, who: 'both', note: 'Cuff and stethoscope.',
    done: (P, C) => { if (P.arrest) { reveal(P, C, 'bp', '0/0'); return 'No blood pressure.'; } const s = noise(P.v.sbp, 3), d = noise(P.v.dbp, 3); reveal(P, C, 'bp', s + '/' + d); P.meas.sbp = { v: s, t: C.t }; C.vitalSets = (C.vitalSets || 0) + 0.25; return `BP ${s}/${d}.`; } },
  { id: 'rr', tab: 'vitals', name: 'Respirations', dur: 30, who: 'both', note: 'Count breaths for 30 seconds.',
    done: (P, C) => { const v = P.arrest ? 0 : noise(P.v.rr, 1); reveal(P, C, 'rr', v); C.vitalSets = (C.vitalSets || 0) + 0.25; return `Respirations ${v}${P.v.rrIrregular ? ', irregular' : ''}.`; } },
  { id: 'spo2', tab: 'vitals', name: 'Pulse oximetry', dur: 10, who: 'both', note: 'Oxygen saturation on a finger.',
    done: (P, C) => { const v = P.arrest ? '--' : clamp(noise(P.v.spo2, 1), 50, 100); reveal(P, C, 'spo2', v); C.vitalSets = (C.vitalSets || 0) + 0.25; return P.arrest ? 'No reading.' : `SpO₂ ${v}%.`; } },
  { id: 'glucose', tab: 'vitals', name: 'Blood glucose', dur: 40, who: 'both', note: 'Finger-stick glucometer. Check it on anyone with altered mental status.',
    done: (P, C) => { const v = noise(P.v.glu, 3); reveal(P, C, 'glu', v); return `Blood glucose ${v} mg/dL${v < 70 ? ' (low!)' : v > 300 ? ' (high)' : ''}.`; } },
  { id: 'temp', tab: 'vitals', name: 'Temperature', dur: 15, who: 'both',
    done: (P, C) => { const v = (P.v.temp + (Math.random() - 0.5) * 0.2).toFixed(1); reveal(P, C, 'temp', v); return `Temperature ${v} °C.`; } },
  { id: 'monitor', tab: 'vitals', name: 'Cardiac monitor', dur: 30, who: 'both', note: 'Leads and SpO₂ on: heart rate, rhythm and saturation keep updating, the cuff cycles every 5 minutes.',
    show: (P) => !P.monitor, done: (P, C) => { P.monitor = true; P.nextNibp = C.t; return 'Monitor on.'; } },
  { id: 'ecg12', tab: 'vitals', name: '12-lead ECG', dur: 75, who: 'ricky', rank: 1, note: 'Look for a heart attack (STEMI) and send it ahead to the hospital.',
    need: (P) => (!P.monitor ? 'Attach the monitor first' : P.arrest ? 'Not during an arrest' : null),
    done: (P, C) => {
      const s = P.conds.stemi;
      P.ecg12 = s ? s.loc + ' STEMI' : 'no STEMI';
      reveal(P, C, 'ecg12', P.ecg12);
      return s ? `12-lead: ST elevation in the ${s.loc === 'inferior' ? 'inferior leads (II, III, aVF)' : 'anterior leads (V1–V4)'}. ${s.loc.toUpperCase()} STEMI. Transmitted.` : `12-lead: ${RHYTHM_NAMES[P.v.rhythm] || 'sinus'}, no ST elevation.`;
    } },
  // ---------------- airway & breathing ----------------
  { id: 'fowler', tab: 'airway', name: 'Sit up (position of comfort)', dur: 10, who: 'both', note: 'Breathing problems and chest pain are easier sitting up.',
    show: (P) => P.position !== 'fowler', need: (P) => (P.avpu !== 'A' || P.arrest ? 'Only for an alert patient' : null),
    harm: (P) => (P.spine.risk && !P.spine.cleared ? 'Sat up a patient who needed spinal precautions' : P.v.sbp < 90 ? 'Sat up a patient in shock' : null),
    done: (P) => { P.position = 'fowler'; return 'Sitting up.'; } },
  { id: 'supine', tab: 'airway', name: 'Lay flat', dur: 10, who: 'both', show: (P) => P.position !== 'supine',
    harm: (P) => ((P.conds.chf || P.conds.asthma) && P.avpu === 'A' ? 'Laid flat a patient who can\'t breathe lying down' : null),
    done: (P) => { P.position = 'supine'; return 'Laid flat.'; } },
  { id: 'recovery', tab: 'airway', name: 'Recovery position', dur: 12, who: 'both', note: 'On the side so the airway stays clear. Not for spinal injuries.',
    show: (P) => P.position !== 'recovery' && !P.arrest, need: (P) => (P.avpu === 'A' ? 'Patient is alert' : null),
    harm: (P) => (P.spine.risk ? 'Rolled a possible spinal injury into the recovery position' : null),
    done: (P) => { P.position = 'recovery'; return 'In the recovery position.'; } },
  { id: 'jaw', tab: 'airway', name: 'Open airway (jaw thrust)', dur: 6, who: 'both', note: 'Lift the jaw to clear the tongue.',
    show: (P) => !P.airway.opened, done: (P) => { P.airway.opened = true; return 'Airway opened.'; } },
  { id: 'suction', tab: 'airway', name: 'Suction', dur: 15, who: 'both', note: 'Clear vomit, blood or secretions.',
    done: (P, C) => { const had = P.airwayState === 'gurgling'; P.airway.cleared = true; P.vomitT = 0; if (!had) C.extraSuction = true; return had ? 'Suctioned: airway clear.' : 'Nothing much to suction.'; } },
  { id: 'opa', tab: 'airway', name: 'Oral airway (OPA)', dur: 10, who: 'both', note: 'Holds the tongue forward in an unresponsive patient with no gag reflex.',
    show: (P) => !P.airway.adjunct, need: (P) => (P.avpu === 'A' || P.avpu === 'V' ? 'Patient would gag' : null),
    done: (P) => { if (P.v.gcs > 8 && !P.arrest) { P.vomitT = 90; P.airway.cleared = false; return 'Gagging! Pulled it out.'; } P.airway.adjunct = 'opa'; P.airway.opened = true; return 'OPA in.'; } },
  { id: 'npa', tab: 'airway', name: 'Nasal airway (NPA)', dur: 10, who: 'both', note: 'Tolerated with a gag reflex. Not with a head or face injury.',
    show: (P) => !P.airway.adjunct, need: (P) => (P.avpu === 'A' ? 'Patient is alert' : null),
    harm: (P) => (P.conds.tbi ? 'Nasal airway in a head injury' : null), done: (P) => { P.airway.adjunct = 'npa'; P.airway.opened = true; return 'NPA in.'; } },
  { id: 'nc', tab: 'airway', name: 'Nasal cannula (2–4 L)', dur: 10, who: 'both', use: 'o2', note: 'Low-flow oxygen for mild hypoxia (SpO₂ 90–94%).',
    show: (P) => P.o2 !== 'nc' && !P.arrest, harm: (P, C) => (P.meas.spo2 && P.meas.spo2.v >= 96 && !P.conds.anaph && !P.conds.pneumo ? 'Oxygen without hypoxia' : null),
    done: (P) => { P.o2 = 'nc'; return 'Nasal cannula at 4 L/min.'; } },
  { id: 'nrb', tab: 'airway', name: 'Non-rebreather (15 L)', dur: 10, who: 'both', use: 'o2', note: 'High-flow oxygen for serious hypoxia, shock or trauma.',
    show: (P) => P.o2 !== 'nrb' && !P.arrest, harm: (P, C) => (P.meas.spo2 && P.meas.spo2.v >= 96 && !P.conds.anaph && !P.conds.pneumo && !P.conds.tbi && effLoss(P) < 800 ? 'High-flow oxygen without hypoxia' : null),
    need: (P) => (P.v.rr < 8 && !P.arrest ? 'Breathing too slow: ventilate with the BVM' : null),
    done: (P) => { P.o2 = 'nrb'; return 'Non-rebreather at 15 L/min.'; } },
  { id: 'bvm', tab: 'airway', name: 'Ventilate (BVM)', dur: 6, cont: true, who: 'both', use: 'o2', note: 'Bag-valve-mask breaths for someone not breathing, or breathing too slow or shallow. Keeps a rescuer busy.',
    harm: (P) => (P.avpu === 'A' && P.v.rr >= 10 && !P.arrest ? 'Bagged a patient who was breathing fine' : null),
    done: (P) => { P.o2 = 'bvm'; return 'Ventilating with the BVM, one breath every 6 seconds.'; } },
  { id: 'albuterol', tab: 'airway', name: 'Albuterol nebulizer', dur: 20, who: 'both', use: 'albuterol', note: 'Opens the airways in asthma, COPD or allergic wheezing.',
    need: (P) => (P.arrest || P.avpu === 'U' ? 'Patient must be breathing on their own' : null),
    harm: (P) => (P.conds.chf && !P.conds.asthma ? 'Albuterol for fluid in the lungs (crackles, not wheezes)' : null),
    done: (P, C) => { giveMed(P, C, 'albuterol', 30, (q) => { if (q.conds.asthma) q.conds.asthma.neb = (q.conds.asthma.neb || 0) + 0.38; if (q.conds.anaph) q.conds.anaph.sev = Math.max(0, q.conds.anaph.sev - 0.08); }); P.base.hr += 8; return 'Albuterol 2.5 mg nebulizing.'; } },
  { id: 'cpap', tab: 'airway', name: 'CPAP', dur: 45, who: 'ricky', rank: 2, use: 'o2', note: 'Pressure mask that pushes fluid out of the lungs (CHF) and splints tired airways.',
    show: (P) => P.o2 !== 'cpap', need: (P) => (P.avpu !== 'A' || P.arrest ? 'Patient must be awake and breathing' : null),
    harm: (P) => (P.v.sbp < 90 ? 'CPAP with low blood pressure' : P.conds.pneumo ? 'CPAP with a collapsed lung' : null),
    done: (P) => { P.o2 = 'cpap'; if (P.conds.chf) P.conds.chf.cpap = true; if (P.conds.asthma) P.conds.asthma.cpap = true; return 'CPAP on, 7.5 cm H₂O.'; } },
  { id: 'igel', tab: 'airway', name: 'i-gel airway', dur: 30, who: 'ricky', rank: 1, use: 'airway', note: 'A supraglottic airway for an unresponsive patient with no gag reflex (cardiac arrest).',
    show: (P) => P.airway.adjunct !== 'igel' && P.airway.adjunct !== 'ett', need: (P) => (P.avpu !== 'U' && !P.arrest ? 'Patient has a gag reflex' : null),
    done: (P) => { P.airway.adjunct = 'igel'; P.airway.opened = true; return 'i-gel placed, good chest rise.'; } },
  { id: 'ett', tab: 'airway', name: 'Intubate', dur: 60, who: 'ricky', rank: 2, use: 'airway', note: 'Endotracheal tube: the most secure airway. Interrupts CPR if done mid-arrest.',
    show: (P) => P.airway.adjunct !== 'ett', need: (P) => (P.avpu !== 'U' && !P.arrest ? 'Patient has a gag reflex' : null),
    done: (P, C) => { if (Math.random() < 0.15) return 'Couldn\'t see the cords. Failed attempt: keep bagging.'; P.airway.adjunct = 'ett'; P.airway.opened = true; return 'Tube placed, confirmed with waveform capnography.'; } },
  { id: 'needle', tab: 'airway', name: 'Needle decompression', dur: 30, who: 'ricky', rank: 2, use: 'needle', note: 'Release a tension pneumothorax: absent breath sounds on one side, falling pressure.',
    harm: (P) => (!P.conds.pneumo ? 'Needle decompression without a tension pneumothorax' : null),
    done: (P) => { if (P.conds.pneumo) { P.conds.pneumo.decomp = true; return 'Rush of air! Breathing and pressure improving.'; } return 'No rush of air.'; } },
  // ---------------- circulation ----------------
  { id: 'cpr', tab: 'circ', name: 'CPR', dur: 4, cont: true, who: 'both', note: 'Hard and fast, 100–120 a minute. Keeps a rescuer busy. Ricky\'s compressions follow your rhythm.',
    harm: (P) => (!P.arrest ? 'CPR on a patient with a pulse' : null),
    done: (P) => (P.arrest ? 'Compressions started.' : 'Started compressions on a patient with a pulse!') },
  { id: 'aed', tab: 'circ', name: 'AED: pads & analyse', dur: 22, who: 'both', use: 'pads', note: 'The AED reads the rhythm and tells you whether to shock. Hands off during analysis.',
    show: (P) => !P.pads, harm: (P) => (!P.arrest ? 'AED pads on a patient with a pulse' : null),
    done: (P, C) => { P.pads = true; P.monitor = true; return aedAnalyse(P, C); } },
  { id: 'analyse', tab: 'circ', name: 'AED: analyse', dur: 10, who: 'both', note: 'Analyse the rhythm again (every 2 minutes).', show: (P) => P.pads && !C_shockReady(),
    done: (P, C) => aedAnalyse(P, C) },
  { id: 'shock', tab: 'circ', name: '⚡ Shock', dur: 4, who: 'both', note: 'Everyone clear!', show: (P) => C_shockReady(),
    done: (P, C) => { C.shockReady = false; if (!P.arrest) return 'Shock cancelled: no longer needed.'; const r = deliverShock(P); C.shocks = (C.shocks || 0) + 1; bus.emit('shock', P); return r === 'rosc' ? 'Shock delivered. Pulse is back!' : 'Shock delivered. Resume CPR.'; } },
  { id: 'defib', tab: 'circ', name: '⚡ Manual defib 200 J', dur: 5, who: 'ricky', rank: 2, use: 'pads', note: 'Read the rhythm yourself and shock VF or pulseless VT.',
    show: (P) => P.arrest && P.monitor, harm: (P) => (P.arrest && !SHOCKABLE(P.arrest.rhythm) ? 'Shocked a non-shockable rhythm (' + RHYTHM_NAMES[P.arrest.rhythm] + ')' : null),
    done: (P, C) => { P.pads = true; const r = deliverShock(P); C.shocks = (C.shocks || 0) + 1; bus.emit('shock', P); return r === 'rosc' ? 'Shock delivered. Organised rhythm with a pulse!' : r === 'noeffect' ? 'Shock delivered. No change.' : 'Shock delivered. Back on the chest.'; } },
  { id: 'pressure', tab: 'circ', name: 'Direct pressure', dur: 4, cont: true, who: 'both', note: 'Press hard on the worst bleeding. Keeps a rescuer busy.',
    show: (P) => P.bleeds.some((b) => !b.stopped && b.ctrl !== 'tq'), done: (P) => 'Holding pressure on the ' + (worstBleed(P) || { site: 'wound' }).site + '.' },
  { id: 'dressing', tab: 'circ', name: 'Pressure dressing', dur: 25, who: 'both', use: 'dressing', note: 'A bulky dressing wrapped tight. Enough for most venous bleeding.',
    show: (P) => P.bleeds.some((b) => b.ctrl === 'none' && !b.stopped),
    done: (P) => { const b = P.bleeds.find((q) => q.ctrl === 'none' && !q.stopped); b.ctrl = 'dressing'; return `Pressure dressing on the ${b.site}${b.kind === 'arterial' ? '. Still soaking through.' : '.'}`; } },
  { id: 'gauze', tab: 'circ', name: 'Pack wound (hemostatic gauze)', dur: 45, who: 'both', use: 'gauze', note: 'Pack a deep wound where a tourniquet can\'t go (groin, armpit, neck).',
    show: (P) => P.bleeds.some((b) => !b.stopped && (b.ctrl === 'none' || b.ctrl === 'dressing') && b.kind === 'arterial'),
    done: (P) => { const b = P.bleeds.find((q) => !q.stopped && q.ctrl !== 'tq' && q.ctrl !== 'gauze' && q.kind === 'arterial'); b.ctrl = 'gauze'; return `Packed the ${b.site} wound and held pressure.`; } },
  { id: 'tq', tab: 'circ', name: 'Tourniquet', dur: 20, who: 'both', use: 'tourniquet', note: 'High and tight on a bleeding arm or leg. Note the time.',
    show: (P) => P.bleeds.some((b) => !b.stopped && b.ctrl !== 'tq' && b.limb),
    harm: (P) => (P.bleeds.filter((b) => !b.stopped && b.ctrl !== 'tq' && b.limb).every((b) => b.kind !== 'arterial' && b.rate < 120) ? 'Tourniquet on a minor bleed' : null),
    done: (P, C) => { const b = P.bleeds.filter((q) => !q.stopped && q.ctrl !== 'tq' && q.limb).sort((a, c) => c.rate - a.rate)[0]; b.ctrl = 'tq'; b.tqT = C.t; return `Tourniquet on the ${b.site}, ${fmtClock(G.clockT)}. Bleeding stopped.`; } },
  { id: 'iv', tab: 'circ', name: 'IV / IO access', dur: 70, who: 'ricky', rank: 1, use: 'ivkit', note: 'A line for fluids and medications. In an arrest, an IO in the shin.',
    show: (P) => !P.iv, done: (P) => { if (!P.arrest && P.v.sbp < 80 && Math.random() < 0.3) return 'Veins collapsed. Missed: try again.'; P.iv = true; return P.arrest ? 'IO in the left shin, flushing well.' : '18-gauge IV in the left arm.'; } },
  { id: 'fluids', tab: 'circ', name: 'Saline 500 mL', dur: 10, who: 'ricky', rank: 1, use: 'saline', note: 'Fluid for shock. In bleeding trauma, give just enough for a radial pulse (SBP about 90).',
    need: (P) => (!P.iv ? 'Needs IV access' : null),
    harm: (P) => (P.conds.chf ? 'IV fluid into wet lungs (CHF)' : P.fluids + P.fluidLeft >= 2000 ? 'Over 2 L of fluid' : P.v.sbp > 110 && !P.conds.dehydr && !P.conds.heat ? 'Fluid bolus without low blood pressure' : null),
    done: (P) => { P.fluidLeft += 500; return '500 mL normal saline running wide open.'; } },
  { id: 'warm', tab: 'circ', name: 'Blanket & shock position', dur: 15, who: 'both', note: 'Keep a shocked patient warm and flat, legs raised if no injury.',
    show: (P) => !P.shock.warm, done: (P) => { P.shock.warm = true; if (!P.spine.risk && !Object.values(P.conds).some((c) => c.femur || c.hip)) P.shock.legs = true; return 'Covered with a blanket.'; } },
  // ---------------- trauma ----------------
  { id: 'collar', tab: 'trauma', name: 'Cervical collar', dur: 30, who: 'both', use: 'collar', note: 'Spinal motion restriction for a possible neck injury (mechanism, pain, numbness, altered).',
    show: (P) => !P.spine.collar, harm: (P) => (!P.spine.risk ? 'Collared a patient with no reason for spinal precautions' : null),
    done: (P) => { P.spine.collar = true; return 'C-collar sized and on.'; } },
  { id: 'splint', tab: 'trauma', name: 'Splint the fracture', dur: 60, who: 'both', use: 'splint', note: 'Immobilise the joint above and below. Check pulse and feeling before and after.',
    show: (P) => !!P.conds.fracture && !P.conds.fracture.splinted && !P.conds.fracture.femur,
    done: (P) => { P.conds.fracture.splinted = true; return `${P.conds.fracture.site} splinted. Good pulse below.`; } },
  { id: 'traction', tab: 'trauma', name: 'Traction splint', dur: 110, who: 'both', use: 'traction', note: 'For a mid-thigh femur fracture: less pain, less bleeding into the thigh.',
    show: (P) => !!P.conds.fracture && P.conds.fracture.femur && !P.conds.fracture.splinted,
    harm: (P) => (P.conds.fracture.hip ? 'Traction splint on a hip fracture' : null),
    done: (P) => { const f = P.conds.fracture; f.splinted = true; f.traction = true; P.internal *= 0.35; return 'Traction splint applied. The thigh is straighter and the pain eases.'; } },
  { id: 'hipsplint', tab: 'trauma', name: 'Pad & immobilise the hip', dur: 50, who: 'both', note: 'Pillows and blankets: let the leg stay as it lies.',
    show: (P) => !!P.conds.fracture && P.conds.fracture.hip && !P.conds.fracture.splinted, done: (P) => { P.conds.fracture.splinted = true; return 'Hip padded and supported.'; } },
  { id: 'seal', tab: 'trauma', name: 'Chest seal', dur: 20, who: 'both', use: 'dressing', note: 'Occlusive dressing over a sucking chest wound.',
    show: (P) => !!P.conds.pneumo && P.conds.pneumo.open && !P.conds.pneumo.sealed, done: (P) => { P.conds.pneumo.sealed = true; return 'Vented chest seal on.'; } },
  { id: 'bandage', tab: 'trauma', name: 'Bandage minor wounds', dur: 30, who: 'both', use: 'dressing', show: (P) => P.injuries.some((i) => i.minor && !i.treated),
    done: (P) => { for (const i of P.injuries) if (i.minor) i.treated = true; return 'Cuts and scrapes dressed.'; } },
  { id: 'cool', tab: 'trauma', name: 'Active cooling', dur: 30, who: 'both', show: (P) => !!P.conds.heat && !P.conds.heat.cooling, done: (P) => { P.conds.heat.cooling = true; return 'Cold packs to the neck, armpits and groin; misting with water.'; } },
  // ---------------- medications ----------------
  { id: 'aspirin', tab: 'meds', name: 'Aspirin 324 mg (chewed)', dur: 15, who: 'both', use: 'aspirin', note: 'For suspected heart attack. Not with an aspirin allergy, a bleed or a suspected stroke.',
    need: (P) => (!canSwallow(P) ? 'Patient can\'t swallow safely' : P.medCount.aspirin ? 'Already given' : null),
    harm: (P) => (P.hist.A && /aspirin/i.test(P.hist.A) ? 'Aspirin with an aspirin allergy' : P.conds.stroke ? 'Aspirin in a suspected stroke (could be a bleed)' : P.bleeds.length || P.conds.tbi ? 'Aspirin in a bleeding patient' : !P.conds.stemi ? 'Aspirin with no sign of a heart attack' : null),
    done: (P, C) => { giveMed(P, C, 'aspirin', 60, (q) => { if (q.conds.stemi) q.conds.stemi.aspirin = true; }); return 'Four baby aspirin, chewed.'; } },
  { id: 'nitro', tab: 'meds', name: 'Nitroglycerin 0.4 mg SL', dur: 12, who: 'both', use: 'nitro', note: 'Chest pain or CHF. Not if SBP under 100, after erectile-dysfunction drugs, or in an inferior (right-sided) heart attack.',
    need: (P) => (!canSwallow(P) ? 'Patient must be alert' : (P.medCount.nitro || 0) >= 3 ? 'Maximum three doses' : null),
    harm: (P) => (P.v.sbp < 100 ? 'Nitro with a systolic under 100' : P.hist.pde ? 'Nitro after an erectile-dysfunction drug' : P.conds.stemi && P.conds.stemi.loc === 'inferior' ? 'Nitro in an inferior STEMI' : !P.conds.stemi && !P.conds.chf ? 'Nitro without chest pain or CHF' : null),
    done: (P, C) => {
      const drop = P.hist.pde || (P.conds.stemi && P.conds.stemi.loc === 'inferior') ? 45 : 14;
      giveMed(P, C, 'nitro', 60, (q) => { q.base.sbp -= drop; if (q.conds.stemi) q.conds.stemi.nitro = (q.conds.stemi.nitro || 0) + 1; if (q.conds.chf) q.conds.chf.nitro = (q.conds.chf.nitro || 0) + 1; });
      return 'One spray under the tongue.';
    } },
  { id: 'oralglu', tab: 'meds', name: 'Oral glucose 15 g', dur: 20, who: 'both', use: 'oralglu', note: 'Low blood sugar in a patient awake enough to swallow.',
    need: (P) => (P.medCount.oralglu >= 2 ? 'Already given twice' : null),
    harm: (P) => (!canSwallow(P) ? 'Oral glucose to a patient who can\'t swallow (choking risk)' : P.meas.glu && P.meas.glu.v > 80 ? 'Glucose with a normal sugar' : !P.meas.glu ? 'Glucose without checking the sugar' : null),
    done: (P, C) => { if (!canSwallow(P)) { P.vomitT = 60; P.airway.cleared = false; return 'Coughing and choking on the gel!'; } giveMed(P, C, 'oralglu', 30, (q) => { if (q.conds.hypogly) { q.conds.hypogly.give = (q.conds.hypogly.give || 0) + 45; q.conds.hypogly.giveRate = 0.12; } }); return 'Oral glucose between cheek and gum.'; } },
  { id: 'epipen', tab: 'meds', name: 'Epinephrine auto-injector', dur: 10, who: 'both', use: 'epipen', note: 'Anaphylaxis: hives plus breathing trouble or low pressure. Outer thigh.',
    need: noDuplicates('epipen', 2), harm: (P) => (!P.conds.anaph && !(P.conds.asthma && P.conds.asthma.sev > 0.8) ? 'Epinephrine without anaphylaxis' : null),
    done: (P, C) => { giveMed(P, C, 'epipen', 40, (q) => { if (q.conds.anaph) { q.conds.anaph.epi = (q.conds.anaph.epi || 0) + 0.65; } if (q.conds.asthma) q.conds.asthma.epi = (q.conds.asthma.epi || 0) + 0.4; q.base.hr += 15; }); return 'Epinephrine 0.3 mg into the thigh.'; } },
  { id: 'narcan', tab: 'meds', name: 'Naloxone 4 mg nasal', dur: 10, who: 'both', use: 'narcan', note: 'Reverses opioids. Ventilate first: aim for breathing, not a wide-awake patient.',
    need: noDuplicates('narcan', 2), harm: (P) => (!P.conds.opioid ? 'Naloxone without signs of an opioid overdose' : null),
    done: (P, C) => { giveMed(P, C, 'narcan', 150, (q) => { if (q.conds.opioid) q.conds.opioid.narcan = (q.conds.opioid.narcan || 0) + 0.85; }); return 'Naloxone 4 mg up one nostril.'; } },
  { id: 'narcaniv', tab: 'meds', name: 'Naloxone 0.4 mg IV', dur: 10, who: 'ricky', rank: 1, use: 'narcan', note: 'Titrated IV naloxone: works in about a minute, gentler wake-up.',
    need: (P) => (!P.iv ? 'Needs IV access' : null), harm: (P) => (!P.conds.opioid ? 'Naloxone without signs of an opioid overdose' : null),
    done: (P, C) => { giveMed(P, C, 'narcaniv', 50, (q) => { if (q.conds.opioid) { q.conds.opioid.narcan = (q.conds.opioid.narcan || 0) + 0.45; q.conds.opioid.narcanIV = true; } }); return 'Naloxone 0.4 mg IV, titrating.'; } },
  { id: 'd10', tab: 'meds', name: 'D10 250 mL IV', dur: 15, who: 'ricky', rank: 1, use: 'd10', note: 'IV dextrose for low sugar in a patient who can\'t swallow.',
    need: (P) => (!P.iv ? 'Needs IV access' : null), harm: (P) => (!P.meas.glu ? 'Dextrose without checking the sugar' : P.meas.glu.v > 80 ? 'Dextrose with a normal sugar' : null),
    done: (P, C) => { giveMed(P, C, 'd10', 20, (q) => { if (q.conds.hypogly) { q.conds.hypogly.give = (q.conds.hypogly.give || 0) + 90; q.conds.hypogly.giveRate = 0.4; } }); return 'D10 running in.'; } },
  { id: 'glucagon', tab: 'meds', name: 'Glucagon 1 mg IM', dur: 12, who: 'ricky', rank: 1, use: 'glucagon', note: 'Raises the sugar when there\'s no IV. Slow (10–15 minutes).',
    harm: (P) => (!P.meas.glu ? 'Glucagon without checking the sugar' : P.meas.glu.v > 80 ? 'Glucagon with a normal sugar' : null),
    done: (P, C) => { giveMed(P, C, 'glucagon', 300, (q) => { if (q.conds.hypogly) { q.conds.hypogly.give = (q.conds.hypogly.give || 0) + 60; q.conds.hypogly.giveRate = 0.08; } q.nausea = 0.5; }); return 'Glucagon into the shoulder.'; } },
  { id: 'epi', tab: 'meds', name: 'Epinephrine 1 mg IV (arrest)', dur: 8, who: 'ricky', rank: 2, use: 'epi', note: 'Every 3–5 minutes in cardiac arrest. Early for asystole and PEA, after the second shock for VF.',
    need: (P) => (!P.iv ? 'Needs IV/IO access' : !P.arrest ? 'Only in cardiac arrest' : null),
    harm: (P) => (P.arrest && P.arrest.t - P.arrest.lastEpi < 150 ? 'Epinephrine too soon after the last dose' : null),
    done: (P, C) => { P.arrest.epi++; P.arrest.lastEpi = P.arrest.t; P.medCount.epi = (P.medCount.epi || 0) + 1; return 'Epinephrine 1 mg IV push, flushed.'; } },
  { id: 'amio', tab: 'meds', name: 'Amiodarone 300 mg IV', dur: 10, who: 'ricky', rank: 2, use: 'amio', note: 'VF or VT that keeps coming back after shocks.',
    need: (P) => (!P.iv ? 'Needs IV/IO access' : !P.arrest ? 'Only for VF/VT arrest here' : (P.arrest.amio >= 2 ? 'Already given twice' : null)),
    harm: (P) => (P.arrest && !SHOCKABLE(P.arrest.rhythm) ? 'Amiodarone in a non-shockable rhythm' : null),
    done: (P) => { P.arrest.amio++; P.medCount.amio = (P.medCount.amio || 0) + 1; return 'Amiodarone 300 mg IV push.'; } },
  { id: 'fentanyl', tab: 'meds', name: 'Fentanyl 50 mcg IV', dur: 10, who: 'ricky', rank: 2, use: 'fentanyl', note: 'Pain relief. Watch breathing and pressure.',
    need: (P) => (!P.iv ? 'Needs IV access' : (P.medCount.fentanyl || 0) >= 3 ? 'Maximum dose reached' : null),
    harm: (P) => (P.v.sbp < 95 ? 'Fentanyl with low blood pressure' : P.v.gcs < 14 ? 'Fentanyl with altered consciousness' : P.v.pain < 4 ? 'Fentanyl for mild pain' : null),
    done: (P, C) => { giveMed(P, C, 'fentanyl', 60, (q) => { q.painRelief = Math.min(1.2, q.painRelief + 0.7); q.base.rr -= 1; q.base.sbp -= 6; }); return 'Fentanyl 50 mcg IV.'; } },
  { id: 'ondan', tab: 'meds', name: 'Ondansetron 4 mg', dur: 10, who: 'ricky', rank: 2, use: 'ondan', note: 'For nausea and vomiting.',
    need: noDuplicates('ondan'), harm: (P) => (P.v.nausea < 0.3 && !P.vomited ? 'Ondansetron without nausea' : null),
    done: (P, C) => { giveMed(P, C, 'ondan', 120, (q) => { q.nausea = 0; }); return 'Ondansetron 4 mg dissolving under the tongue.'; } },
  { id: 'diphen', tab: 'meds', name: 'Diphenhydramine 50 mg IV', dur: 10, who: 'ricky', rank: 2, use: 'diphen', note: 'Antihistamine: helps hives after epinephrine has been given.',
    need: (P) => (!P.iv ? 'Needs IV access' : P.medCount.diphen ? 'Already given' : null), harm: (P) => (!P.conds.anaph ? 'Diphenhydramine without an allergic reaction' : null),
    done: (P, C) => { giveMed(P, C, 'diphen', 120, (q) => { if (q.conds.anaph) q.conds.anaph.antihist = true; }); return 'Diphenhydramine 50 mg IV.'; } },
  { id: 'midaz', tab: 'meds', name: 'Midazolam 5 mg IM', dur: 10, who: 'ricky', rank: 2, use: 'midaz', note: 'Stops a seizure that has lasted over five minutes.',
    need: (P) => (P.medCount.midaz >= 2 ? 'Maximum two doses' : null), harm: (P) => (!P.v.seizing ? 'Midazolam with no active seizure' : null),
    done: (P, C) => { giveMed(P, C, 'midaz', 90, (q) => { if (q.conds.seizure && q.conds.seizure.active) q.conds.seizure.midaz = true; q.base.rr -= 2; }); return 'Midazolam 5 mg into the thigh.'; } },
  { id: 'txa', tab: 'meds', name: 'TXA 1 g IV', dur: 20, who: 'ricky', rank: 2, use: 'txa', note: 'Tranexamic acid for major bleeding in trauma, within three hours.',
    need: (P) => (!P.iv ? 'Needs IV access' : P.txa ? 'Already given' : null), harm: (P) => (effLoss(P) < 500 && P.internal < 20 ? 'TXA without significant bleeding' : null),
    done: (P) => { P.txa = true; P.medCount.txa = 1; return 'TXA 1 g over 10 minutes.'; } },
  // ---------------- OB and other ----------------
  { id: 'obkit', tab: 'other', name: 'Open OB kit & prepare', dur: 30, who: 'both', use: 'obkit', show: (P) => !!P.conds.labor && !P.conds.labor.kit,
    done: (P) => { P.conds.labor.kit = true; return 'Drapes down, towels, bulb syringe and clamps ready.'; } },
  { id: 'deliver', tab: 'other', name: 'Deliver the baby', dur: 70, who: 'ricky', show: (P) => !!P.conds.labor && !P.conds.labor.born,
    need: (P) => (!P.conds.labor.kit ? 'Open the OB kit first' : P.conds.labor.crown < 0.65 ? 'Not crowning yet: transport' : null),
    done: (P, C) => { const L = P.conds.labor; L.born = true; L.bornT = C.t; L.baby = { cried: false, warm: false, cord: false, apgar: 6 }; P.kids = 1; bus.emit('birth', P); return 'Supported the head, checked for the cord, delivered the shoulders. It\'s a ' + (Math.random() < 0.5 ? 'girl' : 'boy') + '!'; } },
  { id: 'baby', tab: 'other', name: 'Dry, warm & stimulate baby', dur: 30, who: 'both', show: (P) => !!P.conds.labor && P.conds.labor.born && !P.conds.labor.baby.warm,
    done: (P) => { const b = P.conds.labor.baby; b.warm = true; b.cried = true; b.apgar = 9; return 'Rubbed dry, hat on, skin to skin with mum. A good loud cry!'; } },
  { id: 'cord', tab: 'other', name: 'Clamp & cut the cord', dur: 20, who: 'both', show: (P) => !!P.conds.labor && P.conds.labor.born && !P.conds.labor.baby.cord,
    done: (P) => { P.conds.labor.baby.cord = true; return 'Two clamps, cut between them.'; } },
  { id: 'fundal', tab: 'other', name: 'Fundal massage', dur: 30, who: 'both', show: (P) => !!P.conds.labor && P.conds.labor.born && !P.conds.labor.fundal,
    done: (P) => { P.conds.labor.fundal = true; return 'Massaged the uterus until firm. Bleeding slowing.'; } },
  { id: 'reassure', tab: 'other', name: 'Reassure & coach breathing', dur: 20, who: 'both', note: 'A calm voice brings the heart rate and breathing down.',
    need: (P) => (P.avpu !== 'A' ? 'Patient isn\'t awake enough' : null),
    done: (P) => { P.calm = 1; P.anxiety = Math.max(0.1, P.anxiety - 0.3); if (P.conds.anxiety) P.conds.anxiety.calm = true; return 'Talked them through it, slow breaths together.'; } },
  { id: 'refusal', tab: 'other', name: 'Refusal: explain risks & sign', dur: 60, who: 'ricky', note: 'A competent adult can refuse care. Make sure they can decide, explain the risks and get a signature.',
    show: (P) => !!P.flags.refuse && !P.arrest,
    harm: (P, C) => {
      if (P.v.gcs < 15 || P.conds.intox || P.conds.tbi) return 'Accepted a refusal from a patient who couldn\'t make that decision';
      if (P.conds.hypogly && P.v.glu < 80) return 'Accepted a refusal while the sugar was still low';
      if (!P.known.has('hr') || !P.known.has('bp')) return 'Took a refusal without a set of vitals';
      if (P.conds.stemi || P.conds.stroke || effLoss(P) > 500) return 'Let a seriously ill patient refuse without medical control';
      return null;
    },
    done: (P, C) => { C.refused = true; return `${P.first} signs the refusal. "If anything changes, call 911 again." Copy of the form left with them.`; } },
  { id: 'terminate', tab: 'other', name: 'Call medical control: stop', dur: 30, who: 'ricky', rank: 2, note: 'After 20 minutes of full resuscitation in asystole, the doctor can end the attempt.',
    show: (P) => !!P.arrest && P.arrest.cprT > 1200 && P.arrest.rhythm === 'asys',
    done: (P, C) => { P.dead = true; P.arrest.ended = true; C.terminated = true; return 'Medical control agrees. Time of death ' + fmtClock(G.clockT) + '. We stay with the family a while.'; } },
];
const ACT = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));
function C_shockReady() { return !!(G.call && G.call.shockReady); }
function aedAnalyse(P, C) {
  C.aedAnalyses = (C.aedAnalyses || 0) + 1;
  if (!P.arrest) return 'Analysing... No shock advised. Check for a pulse.';
  if (SHOCKABLE(P.arrest.rhythm)) { C.shockReady = true; bus.emit('aedShock', P); return 'Analysing... SHOCK ADVISED. Stand clear!'; }
  return 'Analysing... No shock advised. Resume CPR.';
}
