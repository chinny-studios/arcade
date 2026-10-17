// Every call type at a sensible standard of care, through to the review. Prints grade, outcome and anything missed.
// Use --start '{"rank":2}' to unlock advanced skills (CHF, stabbing and heat calls need rank 1).
const rank = RR.G.career.rank;
const PLAN = {
  chest: (P) => ['ppe', 'impression', 'abc', ['monitor', 'partner'], 'aspirin', rank >= 1 && 'ecg12', 'sample', 'opqrst', ['bp', 'partner'], P.v.sbp > 110 && !P.hist.pde && P.conds.stemi && P.conds.stemi.loc !== 'inferior' && 'nitro'],
  arrest: () => ['ppe', ['cpr', 'partner'], 'aed', 'SHOCK', 'bvm'],
  stroke: () => ['ppe', 'impression', 'abc', 'glucose', 'stroke', 'sample', ['bp', 'partner'], ['spo2', 'partner'], 'GLU'],
  diabetic: () => ['ppe', 'impression', 'abc', 'glucose', 'GLU', ['bp', 'partner'], 'sample', 'glucose'],
  asthma: () => ['ppe', 'impression', 'abc', ['spo2', 'partner'], 'lungs', 'albuterol', ['nrb', 'partner'], 'sample', ['bp', 'partner']],
  chf: () => ['ppe', 'impression', 'abc', 'lungs', rank >= 2 ? 'cpap' : 'nrb', ['bp', 'partner'], 'nitro', 'sample'],
  anaph: () => ['ppe', 'impression', 'abc', 'epipen', ['nrb', 'partner'], 'sample', ['bp', 'partner']],
  overdose: () => ['ppe', 'impression', 'abc', ['bvm', 'partner'], 'narcan', 'glucose', ['spo2', 'ricky']],
  seizure: () => ['ppe', 'impression', 'abc', rank >= 2 && 'midaz', 'glucose', 'suction', ['nrb', 'partner'], 'sample'],
  mvc: (P) => ['ppe', 'impression', 'abc', P.bleeds.length && 'tq', ['collar', 'partner'], 'exam', P.conds.pneumo && rank >= 2 && 'needle', P.conds.fracture && P.conds.fracture.femur && 'traction', P.conds.fracture && !P.conds.fracture.femur && 'splint', ['bp', 'partner']],
  fall: () => ['ppe', 'impression', 'abc', 'exam', 'hipsplint', 'gcs', ['bp', 'partner'], 'sample'],
  lac: () => ['ppe', 'impression', 'tq', 'abc', ['warm', 'partner'], ['nrb', 'partner'], rank >= 2 && 'iv', rank >= 2 && 'txa', ['bp', 'partner']],
  sports: () => ['ppe', 'impression', 'abc', 'exam', 'splint', 'bandage', ['bp', 'partner'], 'sample'],
  stab: (P) => ['ppe', 'impression', 'abc', P.conds.pneumo ? 'seal' : 'gauze', 'exam', P.conds.pneumo && rank >= 2 && 'needle', ['bp', 'partner']],
  birth: () => ['ppe', 'impression', 'abc', 'obkit', 'WAITCROWN', 'deliver', 'baby', 'cord', 'fundal', ['bp', 'partner']],
  lift: () => ['ppe', 'impression', 'abc', 'exam', ['pulse', 'partner'], ['bp', 'partner'], ['rr', 'partner'], ['spo2', 'partner'], 'glucose', 'bandage', 'sample', 'refusal'],
  heat: () => ['ppe', 'impression', 'abc', 'temp', 'cool', 'iv', 'fluids', 'glucose'],
};
const DEST = { chest: 'mercy', arrest: 'mercy', stroke: 'mercy', birth: 'mercy', mvc: 'general', lac: 'general', stab: 'general', fall: 'general' };
const ALERT = { chest: 'stemi', arrest: 'stemi', stroke: 'stroke', mvc: 'trauma', lac: 'trauma', stab: 'trauma', fall: 'trauma' };
const DEV = { mvc: 'board', fall: 'scoop', lac: 'stretcher', arrest: 'stretcher' };
const res = {};
const types = (window.__types || Object.keys(PLAN)).filter((t) => RR.CALL[t].rank <= rank);
for (const type of types) {
  try {
    const c = RR.call(type);
    if (!c) { res[type] = 'no place'; continue; }
    RR.toScene({ waitPD: true });
    RR.toPatient();
    const P = RR.P, lines = [];
    for (let a of PLAN[type](P)) {
      if (!a) continue;
      let who = 'ricky'; if (Array.isArray(a)) [a, who] = a;
      if (a === 'SHOCK') { if (RR.C.shockReady) lines.push('shock: ' + RR.act('shock')); continue; }
      if (a === 'GLU') { if (P.conds.hypogly) lines.push('glu: ' + RR.act(P.avpu === 'A' ? 'oralglu' : rank >= 1 ? 'glucagon' : 'nrb')); continue; }
      if (a === 'WAITCROWN') { let n = 0; while (P.conds.labor.crown < 0.66 && n++ < 400) RR.sim(1); continue; }
      const r = RR.act(a, who, !RR.ACT[a].cont);
      if (r.startsWith('BLOCKED')) lines.push(a + ' ' + r);
    }
    RR.sim(3);
    if (RR.C.refused) { RR.sim(2); }
    else {
      if (type === 'arrest') { for (let k = 0; k < 6 && RR.P.arrest; k++) { RR.sim(20); if (RR.C.shockReady) RR.act('shock'); else if (RR.P.arrest && !RR.WORK.ricky) RR.act('analyse'); } }
      RR.pack(DEV[type] || (P.avpu === 'A' && RR.C.floor > 1 && RR.C.place.access === 'stairs' ? 'chair' : 'stretcher'));
      RR.transport(DEST[type] || 'brigid', 'partner', (type === 'chest' && !P.conds.stemi) || (type === 'stroke' && !P.conds.stroke) || (type === 'fall' && !P.conds.tbi) ? 'none' : ALERT[type] || 'none', !!ALERT[type]);
      RR.sim(4);
      RR.arrive();
      RR.handoff(true);
    }
    const L = RR.G.lastCall;
    res[type] = { grade: L.grade, total: L.total, out: L.out.text.slice(0, 90), harms: L.harms.map((h) => h.text), missed: L.items.filter((i) => i.kind === 'bad').map((i) => i.text), notes: lines };
    RR.UI.hide('review'); RR.f.backInService();
    RR.sim(0.5);
  } catch (e) { res[type] = 'ERROR ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | '); }
}
return res;
