// Ricky Rescue — call types. Each template makes a patient spec and scene details for a place, and lists what good
// care looks like: critical actions, nice-to-haves, the right destination and pre-alert, and a scene-time goal.
//
// make(r, place) returns { spec, text, bys (bystander), hazard, mvc, extra }.
// checks: { kind: 'crit' | 'good', text, test(C, P) } — scored at the end of the call.

const did = (C, id) => C.acts.has(id);
const knows = (P, k) => P.known.has(k);
const vitalsSet = (P) => ['hr', 'bp', 'rr', 'spo2'].every((k) => P.known.has(k));
const timeOf = (C, id) => C.actT[id] === undefined ? Infinity : C.actT[id];
const ageText = (P) => (P.age < 1 ? 'newborn' : P.age + '-year-old ' + (P.sex === 'F' ? 'female' : 'male'));
const relFor = (r, P) => P.age > 70 ? r.pick(['Daughter', 'Son', 'Husband', 'Wife', 'Neighbour']) : P.age < 18 ? r.pick(['Mother', 'Father']) : r.pick(['Partner', 'Roommate', 'Coworker', 'Sister', 'Friend']);
const HOME_MEDS = ['lisinopril', 'metoprolol', 'atorvastatin', 'metformin', 'amlodipine', 'levothyroxine', 'omeprazole', 'sertraline'];
const meds = (r, extra = [], n = 2) => r.shuffle([...HOME_MEDS]).slice(0, r.int(0, n)).concat(extra).join(', ') || 'none';
const allergy = (r, p = 0.25) => (r.chance(p) ? r.pick(['penicillin', 'sulfa drugs', 'codeine', 'latex', 'shellfish']) : 'none');
const lastMeal = (r) => r.pick(['Breakfast at 7', 'A sandwich at noon', 'Dinner around 6', 'Coffee an hour ago', 'Nothing since last night']);

const CALLS = [
  { id: 'chest', nature: 'Chest pain', cat: 'Medical', rank: 0, pri: 1, places: ['house', 'apt', 'office', 'shop'], w: 9,
    dest: 'cardiac', alert: 'stemi', sceneGoal: 15 * 60, transportLS: (C, P) => !!P.conds.stemi,
    make(r) {
      const stemi = r.chance(0.75), loc = r.chance(0.35) ? 'inferior' : 'anterior', pde = stemi && r.chance(0.2);
      const age = r.int(48, 82);
      return {
        text: `${stemi ? 'crushing chest pain, sweating' : 'chest pain'}`,
        spec: { age, sex: r.chance(0.6) ? 'M' : 'F', pose: 'chestSit', position: 'sitting', place: 'chair',
          conds: stemi ? { stemi: { sev: r.range(0.25, 0.5), loc } } : { anxiety: { sev: 0.5 } },
          base: { spo2: r.int(92, 97) },
          hist: { S: 'chest pain, short of breath, nauseous', A: allergy(r, 0.15), M: meds(r, pde ? ['sildenafil (yesterday)'] : []), P: r.pick(['high blood pressure, high cholesterol', 'diabetes', 'a stent in 2019', 'none']), L: lastMeal(r),
            E: stemi ? 'Started while watching TV, not getting better.' : 'Started after an argument at work.', O: r.pick(['30 minutes ago', 'an hour ago']), Pq: 'nothing makes it better', Q: stemi ? 'crushing, like an elephant on my chest' : 'sharp, catches when I breathe', Rr: stemi ? (loc === 'inferior' ? 'the jaw and back' : 'the left arm') : '', T: 'about 40 minutes ago', pde } },
        bys: r.chance(0.7),
      };
    },
    checks: [
      { kind: 'crit', text: 'Aspirin given', test: (C, P) => !P.conds.stemi || did(C, 'aspirin') },
      { kind: 'crit', text: 'ECG/12-lead to find the heart attack', test: (C, P) => !P.conds.stemi || G.career.rank < 1 || did(C, 'ecg12') },
      { kind: 'good', text: 'Cardiac monitor attached', test: (C) => did(C, 'monitor') || did(C, 'aed') },
      { kind: 'good', text: 'Nitro considered for pain (when safe)', test: (C, P) => !P.conds.stemi || did(C, 'nitro') || P.conds.stemi.loc === 'inferior' || P.hist.pde || P.v.sbp < 100 },
      { kind: 'good', text: 'History taken (SAMPLE / OPQRST)', test: (C) => did(C, 'sample') && did(C, 'opqrst') },
    ] },
  { id: 'arrest', nature: 'Cardiac arrest', cat: 'Medical', rank: 0, pri: 1, places: ['house', 'apt', 'office', 'shop', 'park'], w: 4,
    dest: 'cardiac', alert: 'stemi', sceneGoal: 25 * 60, transportLS: () => true, arrest: true,
    make(r) {
      const witnessed = r.chance(0.55), bystCPR = r.chance(0.45);
      return {
        text: `${witnessed ? 'collapsed in front of family' : 'found unresponsive'}, not breathing${bystCPR ? ', CPR in progress' : ''}`,
        spec: { age: r.int(52, 84), sex: r.chance(0.65) ? 'M' : 'F', pose: 'lie', position: 'supine', place: 'floor', arrest: r.chance(witnessed ? 0.75 : 0.35) ? 'vf' : 'asys', arrestCause: 'cardiac', downtime: witnessed ? r.int(120, 300) : r.int(480, 900),
          hist: { S: 'collapsed', A: 'none', M: meds(r, ['aspirin'], 3), P: r.pick(['heart attack two years ago', 'high blood pressure', 'diabetes, kidney disease']), L: lastMeal(r), E: witnessed ? 'Said he felt dizzy, then just went down.' : 'Found on the floor this morning.' } },
        bys: true, bystCPR, witnessed,
      };
    },
    checks: [
      { kind: 'crit', text: 'CPR started quickly', test: (C) => timeOf(C, 'cpr') - C.times.contact < 90 },
      { kind: 'crit', text: 'AED or monitor on early', test: (C) => Math.min(timeOf(C, 'aed'), timeOf(C, 'defib')) - C.times.contact < 240 },
      { kind: 'crit', text: 'Shocks for a shockable rhythm', test: (C, P) => !C.firstShockable || (C.shocks || 0) > 0 },
      { kind: 'good', text: 'Airway managed (BVM or advanced airway)', test: (C, P) => did(C, 'bvm') || !!P.airway.adjunct },
      { kind: 'good', text: 'Epinephrine given (Paramedic)', test: (C, P) => G.career.rank < 2 || did(C, 'epi') || P.rosc && !P.arrest && (C.shocks || 0) <= 1 },
    ] },
  { id: 'stroke', nature: 'Possible stroke', cat: 'Medical', rank: 0, pri: 1, places: ['house', 'apt', 'shop', 'office'], w: 5,
    dest: 'stroke', alert: 'stroke', sceneGoal: 15 * 60, transportLS: (C, P) => !!P.conds.stroke,
    make(r) {
      const mimic = r.chance(0.25), side = r.chance(0.5) ? 'right' : 'left';
      const lkwMin = r.int(25, 110);
      return {
        text: `${r.pick(['face drooping', 'slurred speech', 'can\'t lift arm'])}, sudden onset`,
        spec: { age: r.int(58, 88), pose: 'sit', position: 'sitting', place: 'chair',
          conds: mimic ? { hypogly: { glu: r.int(32, 44) } } : { stroke: { sev: r.range(0.35, 0.6), side } },
          base: mimic ? {} : { sbp: 150 },
          flags: mimic ? { medicAlert: 'Diabetic, insulin' } : { afib: r.chance(0.5) },
          hist: { S: 'weakness on one side, trouble speaking', A: allergy(r), M: mimic ? 'insulin, metformin' : meds(r, r.chance(0.5) ? ['apixaban'] : []), P: mimic ? 'type 1 diabetes' : 'atrial fibrillation, high blood pressure', L: mimic ? 'Skipped lunch' : lastMeal(r),
            E: 'Was fine, then suddenly couldn\'t get words out.', lkw: lkwMin + ' minutes ago (' + fmtClock(G.clockT - lkwMin * 60) + ')' } },
        bys: true,
      };
    },
    checks: [
      { kind: 'crit', text: 'Blood glucose checked (stroke mimic)', test: (C) => did(C, 'glucose') },
      { kind: 'crit', text: 'Stroke scale done', test: (C) => did(C, 'stroke') },
      { kind: 'crit', text: 'Last known well time found', test: (C, P) => P.known.has('lkw') },
      { kind: 'good', text: 'Short scene time (under 15 minutes)', test: (C) => (C.times.depart || Infinity) - C.times.contact < 15 * 60 },
    ] },
  { id: 'diabetic', nature: 'Diabetic emergency', cat: 'Medical', rank: 0, pri: 2, places: ['house', 'apt', 'office', 'shop', 'park'], w: 5,
    dest: 'any', alert: null, sceneGoal: 20 * 60, transportLS: () => false,
    make(r) {
      const deep = r.chance(0.4);
      return {
        text: deep ? 'diabetic, unresponsive' : 'diabetic, acting confused',
        spec: { age: r.int(19, 75), pose: deep ? 'lie' : 'sit', position: deep ? 'supine' : 'sitting', place: deep ? 'floor' : 'chair',
          conds: { hypogly: { glu: deep ? r.int(20, 28) : r.int(36, 48) } }, flags: { refuse: true, medicAlert: 'Type 1 diabetic' },
          hist: { S: 'shaky, sweaty, confused', A: allergy(r), M: 'insulin', P: 'type 1 diabetes', L: 'Skipped lunch after insulin', E: 'Took the usual insulin, then a long run.' } },
        bys: r.chance(0.8),
      };
    },
    checks: [
      { kind: 'crit', text: 'Blood glucose checked', test: (C) => did(C, 'glucose') },
      { kind: 'crit', text: 'Glucose raised (oral, D10 or glucagon)', test: (C) => did(C, 'oralglu') || did(C, 'd10') || did(C, 'glucagon') || (G.career.rank < 1 && C.unswallow && did(C, 'glucose')) },
      { kind: 'good', text: 'Glucose rechecked after treatment', test: (C) => (C.actN.glucose || 0) >= 2 },
    ] },
  { id: 'asthma', nature: 'Difficulty breathing', cat: 'Medical', rank: 0, pri: 1, places: ['house', 'apt', 'park', 'shop', 'office'], w: 5,
    dest: 'any', alert: null, sceneGoal: 15 * 60, transportLS: (C, P) => P.conds.asthma && P.conds.asthma.sev > 0.6,
    make(r) {
      return {
        text: 'asthma attack, inhaler not helping',
        spec: { age: r.int(12, 45), pose: 'sit', position: 'sitting', place: 'chair', conds: { asthma: { sev: r.range(0.45, 0.7) } },
          hist: { S: 'can\'t catch breath, chest tight', A: allergy(r, 0.4), M: 'albuterol inhaler (used 6 times), fluticasone', P: 'asthma, hospitalised twice', L: lastMeal(r), E: r.pick(['A cold all week, worse tonight.', 'Cleaning out the garage, lots of dust.', 'Running in the cold air.']) } },
        bys: r.chance(0.7),
      };
    },
    checks: [
      { kind: 'crit', text: 'Albuterol given', test: (C) => did(C, 'albuterol') },
      { kind: 'crit', text: 'Oxygen for low saturation', test: (C, P) => did(C, 'nrb') || did(C, 'nc') || did(C, 'cpap') },
      { kind: 'good', text: 'Lung sounds checked', test: (C) => did(C, 'lungs') },
      { kind: 'good', text: 'Kept sitting up', test: (C, P) => P.position !== 'supine' },
    ] },
  { id: 'chf', nature: 'Difficulty breathing', cat: 'Medical', rank: 1, pri: 1, places: ['house', 'apt'], w: 3,
    dest: 'any', alert: null, sceneGoal: 15 * 60, transportLS: (C, P) => P.conds.chf && P.conds.chf.sev > 0.6,
    make(r) {
      return {
        text: 'woke up unable to breathe, gurgling',
        spec: { age: r.int(64, 90), pose: 'sit', position: 'fowler', place: 'bed', conds: { chf: { sev: r.range(0.5, 0.75) } }, base: { sbp: 150 },
          hist: { S: 'can\'t breathe lying down, coughing pink froth', A: allergy(r), M: meds(r, ['furosemide', 'carvedilol']), P: 'heart failure, two heart attacks', L: 'A salty dinner', E: 'Woke at 3 am gasping, had to sit on the edge of the bed.' } },
        bys: true,
      };
    },
    checks: [
      { kind: 'crit', text: 'Kept upright', test: (C, P) => P.position !== 'supine' },
      { kind: 'crit', text: 'CPAP or high-flow oxygen', test: (C) => did(C, 'cpap') || did(C, 'nrb') },
      { kind: 'good', text: 'Nitro to unload the heart', test: (C) => did(C, 'nitro') },
      { kind: 'good', text: 'Lung sounds checked', test: (C) => did(C, 'lungs') },
    ] },
  { id: 'anaph', nature: 'Allergic reaction', cat: 'Medical', rank: 0, pri: 1, places: ['house', 'apt', 'shop', 'park', 'office'], w: 4,
    dest: 'any', alert: null, sceneGoal: 12 * 60, transportLS: () => true,
    make(r) {
      const trig = r.pick(['peanuts in a cookie', 'a bee sting', 'shrimp at lunch', 'a new antibiotic']);
      return {
        text: 'allergic reaction, throat feels tight',
        spec: { age: r.int(8, 55), pose: 'sit', position: 'sitting', place: 'chair', conds: { anaph: { sev: r.range(0.35, 0.5) } },
          hist: { S: 'itchy, throat closing, hives', A: trig.includes('peanut') ? 'peanuts' : trig.includes('bee') ? 'bee stings' : trig.includes('shrimp') ? 'shellfish' : 'amoxicillin', M: 'none (no auto-injector with them)', P: 'a mild reaction years ago', L: lastMeal(r), E: 'Ate/was exposed to ' + trig + ' about 15 minutes ago.' } },
        bys: r.chance(0.7),
      };
    },
    checks: [
      { kind: 'crit', text: 'Epinephrine given', test: (C) => did(C, 'epipen') },
      { kind: 'crit', text: 'Epinephrine within 5 minutes of contact', test: (C) => timeOf(C, 'epipen') - C.times.contact < 300 },
      { kind: 'good', text: 'Oxygen and airway watched', test: (C) => did(C, 'nrb') || did(C, 'nc') },
    ] },
  { id: 'overdose', nature: 'Unconscious person', cat: 'Special', rank: 0, pri: 1, places: ['apt', 'park', 'shop', 'ware'], w: 4,
    dest: 'any', alert: null, sceneGoal: 15 * 60, transportLS: () => false,
    make(r) {
      const unsafe = r.chance(0.4);
      return {
        text: unsafe ? 'unconscious, possible overdose, caller reports a fight nearby' : 'unconscious, breathing slowly, possible overdose',
        spec: { age: r.int(19, 48), pose: 'lie', position: 'supine', place: 'floor', conds: { opioid: { sev: r.range(0.75, 0.92) } }, flags: { refuse: true },
          hist: { S: 'unresponsive', A: 'unknown', M: 'unknown', P: 'unknown', L: 'unknown', E: 'Friend found them like this.' } },
        bys: r.chance(0.6), hazard: unsafe ? 'violence' : null,
      };
    },
    checks: [
      { kind: 'crit', text: 'Ventilated with the BVM', test: (C) => did(C, 'bvm') },
      { kind: 'crit', text: 'Naloxone given', test: (C) => did(C, 'narcan') || did(C, 'narcaniv') },
      { kind: 'good', text: 'Ventilated before naloxone', test: (C) => timeOf(C, 'bvm') <= Math.min(timeOf(C, 'narcan'), timeOf(C, 'narcaniv')) },
      { kind: 'good', text: 'Blood glucose checked', test: (C) => did(C, 'glucose') },
    ] },
  { id: 'seizure', nature: 'Seizure', cat: 'Medical', rank: 0, pri: 1, places: ['house', 'apt', 'shop', 'park', 'office'], w: 3,
    dest: 'any', alert: null, sceneGoal: 15 * 60, transportLS: (C, P) => !!(P.conds.seizure && P.conds.seizure.status),
    make(r) {
      const status = r.chance(0.45);
      return {
        text: status ? 'seizing for 6 minutes, not stopping' : 'had a seizure, now confused',
        spec: { age: r.int(16, 60), pose: status ? 'lieSeize' : 'lie', position: 'supine', place: 'floor', conds: { seizure: { active: status, status, left: status ? 9999 : 0, post: status ? 0 : 600 } },
          hist: { S: 'shaking all over', A: allergy(r), M: r.pick(['levetiracetam (ran out last week)', 'none']), P: r.pick(['epilepsy', 'none known']), L: lastMeal(r), E: 'Fell down shaking, about ' + (status ? 'six' : 'three') + ' minutes.' } },
        bys: true,
      };
    },
    checks: [
      { kind: 'crit', text: 'Blood glucose checked', test: (C) => did(C, 'glucose') },
      { kind: 'crit', text: 'Seizure stopped with midazolam (Paramedic)', test: (C, P) => !P.conds.seizure.status || G.career.rank < 2 || did(C, 'midaz') },
      { kind: 'good', text: 'Airway protected (suction, recovery position)', test: (C) => did(C, 'suction') || did(C, 'recovery') },
      { kind: 'good', text: 'Oxygen', test: (C) => did(C, 'nrb') || did(C, 'nc') || did(C, 'bvm') },
    ] },
  { id: 'mvc', nature: 'Traffic collision', cat: 'Trauma', rank: 0, pri: 1, places: ['road'], w: 7,
    dest: 'trauma', alert: 'trauma', sceneGoal: 10 * 60, transportLS: (C, P) => effLoss(P) > 700 || !!P.conds.pneumo || !!P.conds.tbi, trauma: true,
    make(r, place) {
      const kind = r.pick(['femur', 'bleed', 'pneumo', 'head', 'minor']);
      const hw = place.highway;
      const spec = { age: r.int(17, 70), pose: 'lie', position: 'supine', place: 'ground', spine: { risk: true, injured: r.chance(0.2) },
        injuries: [{ desc: 'Seat-belt bruise across the chest', minor: true }, { desc: 'Cuts to the hands from glass', minor: true }],
        hist: { S: 'hurts everywhere', A: allergy(r), M: meds(r), P: 'none', L: lastMeal(r), E: (hw ? 'Rear-ended at highway speed' : 'T-boned at the intersection') + ', airbags went off.' }, conds: {} };
      if (kind === 'femur') { spec.conds.fracture = { site: 'right thigh', femur: true, desc: 'Right thigh swollen, shortened and rotated (femur fracture)' }; spec.internal = 45; }
      if (kind === 'bleed') { spec.bleeds = [{ site: 'left forearm', kind: 'arterial', rate: r.int(160, 240), limb: true }]; spec.loss = 300; }
      if (kind === 'pneumo') { spec.conds.pneumo = { sev: 0.3, side: 'left' }; spec.injuries.push({ desc: 'Ribs grind on the left side' }); }
      if (kind === 'head') { spec.conds.tbi = { sev: r.range(0.25, 0.45), grow: 0.00012 }; spec.pose = 'lie'; }
      if (kind === 'minor') { spec.pose = 'sitGround'; spec.position = 'sitting'; spec.conds.fracture = { site: 'left wrist', desc: 'Swollen, deformed left wrist' }; spec.flags = { refuse: false }; }
      return { text: (hw ? 'multi-vehicle crash on the Beltway' : 'two-car crash, one person hurt') + ', ' + (kind === 'minor' ? 'conscious' : 'injuries reported'), spec, bys: r.chance(0.5), mvc: true };
    },
    checks: [
      { kind: 'crit', text: 'Spinal precautions considered (collar)', test: (C, P) => did(C, 'collar') || !P.spine.injured && P.v.gcs === 15 && !P.conds.fracture?.femur && !P.conds.tbi },
      { kind: 'crit', text: 'Head-to-toe trauma exam', test: (C) => did(C, 'exam') },
      { kind: 'crit', text: 'Life threats treated (bleeding, chest, airway)', test: (C, P) => P.bleeds.every((b) => b.ctrl !== 'none') && (!P.conds.pneumo || P.conds.pneumo.decomp || G.career.rank < 2) },
      { kind: 'good', text: 'Femur in a traction splint', test: (C, P) => !P.conds.fracture || !P.conds.fracture.femur || did(C, 'traction') },
      { kind: 'good', text: 'Platinum ten minutes on scene', test: (C) => (C.times.depart || Infinity) - C.times.contact < 10 * 60 },
    ] },
  { id: 'fall', nature: 'Fall', cat: 'Trauma', rank: 0, pri: 2, places: ['house', 'apt'], w: 6,
    dest: (P) => (P.conds.tbi ? 'trauma' : 'any'), alert: (P) => (P.conds.tbi ? 'trauma' : null), sceneGoal: 15 * 60, transportLS: (C, P) => !!P.conds.tbi && P.conds.tbi.sev > 0.5,
    make(r) {
      const head = r.chance(0.45);
      const spec = { age: r.int(72, 94), pose: 'lieKnee', position: 'supine', place: 'floor', conds: { fracture: { site: 'left hip', hip: true, femur: true, desc: 'Left leg shortened and turned out (hip fracture)' } }, internal: 6,
        spine: { risk: head }, look: { elder: true },
        hist: { S: 'hip pain, can\'t get up', A: allergy(r), M: meds(r, head ? ['warfarin'] : []), P: 'osteoporosis' + (head ? ', atrial fibrillation' : ''), L: lastMeal(r), E: 'Slipped on the bathroom rug' + (head ? ' and hit the head on the sink.' : '.') } };
      if (head) { spec.conds.tbi = { sev: 0.15, grow: 0.0002 }; spec.injuries = [{ desc: 'Bump and cut over the right eyebrow' }]; }
      return { text: 'elderly fall, can\'t get up' + (head ? ', hit head, on blood thinners' : ''), spec, bys: r.chance(0.6) };
    },
    checks: [
      { kind: 'crit', text: 'Hip padded and immobilised', test: (C) => did(C, 'hipsplint') },
      { kind: 'good', text: 'Moved on a scoop stretcher', test: (C) => C.moveDevice === 'scoop' },
      { kind: 'good', text: 'Head injury on thinners checked (GCS, pupils)', test: (C, P) => !P.conds.tbi || did(C, 'gcs') || did(C, 'exam') },
      { kind: 'good', text: 'Pain managed (Paramedic)', test: (C) => G.career.rank < 2 || did(C, 'fentanyl') },
    ] },
  { id: 'lac', nature: 'Severe bleeding', cat: 'Trauma', rank: 0, pri: 1, places: ['ware', 'shop', 'house'], w: 4,
    dest: 'trauma', alert: 'trauma', sceneGoal: 10 * 60, transportLS: () => true, trauma: true,
    make(r) {
      const site = r.pick(['right thigh', 'left upper arm', 'right forearm']);
      return {
        text: 'worker cut by a saw, bleeding heavily',
        spec: { age: r.int(20, 60), pose: 'sitGround', position: 'sitting', place: 'floor', bleeds: [{ site, kind: 'arterial', rate: r.int(260, 380), limb: true }], loss: r.int(500, 900),
          hist: { S: 'bleeding, dizzy', A: allergy(r), M: 'none', P: 'none', L: lastMeal(r), E: 'The angle grinder kicked back.' } },
        bys: true,
      };
    },
    checks: [
      { kind: 'crit', text: 'Tourniquet on the arterial bleed', test: (C) => did(C, 'tq') },
      { kind: 'crit', text: 'Bleeding controlled within 2 minutes of contact', test: (C) => Math.min(timeOf(C, 'tq'), timeOf(C, 'pressure')) - C.times.contact < 120 },
      { kind: 'good', text: 'Treated for shock (blanket, oxygen)', test: (C) => did(C, 'warm') || did(C, 'nrb') },
      { kind: 'good', text: 'TXA given (Paramedic)', test: (C) => G.career.rank < 2 || did(C, 'txa') },
    ] },
  { id: 'sports', nature: 'Injury', cat: 'Trauma', rank: 0, pri: 2, places: ['park'], w: 4,
    dest: 'any', alert: null, sceneGoal: 15 * 60, transportLS: () => false,
    make(r) {
      const leg = r.chance(0.5);
      return {
        text: leg ? 'player down, leg badly hurt' : 'fell off a skateboard, arm deformed',
        spec: { age: r.int(14, 40), pose: 'sitGround', position: 'sitting', place: 'ground', conds: { fracture: { site: leg ? 'left lower leg' : 'right forearm', desc: leg ? 'Left shin deformed, skin intact' : 'Right forearm bent, swelling' } },
          injuries: [{ desc: 'Grass stains and scrapes on the knees', minor: true }],
          hist: { S: 'pain', A: allergy(r), M: 'none', P: 'none', L: lastMeal(r), E: leg ? 'Collided going for the ball.' : 'Landed on an outstretched hand.' } },
        bys: true,
      };
    },
    checks: [
      { kind: 'crit', text: 'Fracture splinted', test: (C) => did(C, 'splint') },
      { kind: 'good', text: 'Pain managed (Paramedic)', test: (C) => G.career.rank < 2 || did(C, 'fentanyl') },
      { kind: 'good', text: 'Minor wounds dressed', test: (C) => did(C, 'bandage') },
    ] },
  { id: 'stab', nature: 'Assault', cat: 'Trauma', rank: 1, pri: 1, places: ['park', 'shop', 'apt'], w: 3,
    dest: 'trauma', alert: 'trauma', sceneGoal: 10 * 60, transportLS: () => true, trauma: true,
    make(r) {
      const chest = r.chance(0.5);
      return {
        text: 'stabbing, suspect may still be in the area',
        spec: { age: r.int(18, 45), pose: 'lie', position: 'supine', place: 'ground', conds: chest ? { pneumo: { sev: 0.25, side: 'left', open: true } } : {},
          bleeds: chest ? [{ site: 'left chest', kind: 'venous', rate: 60, limb: false }] : [{ site: 'right groin', kind: 'arterial', rate: 220, limb: false }], loss: 400,
          hist: { S: 'stabbed, can\'t breathe right', A: 'none', M: 'none', P: 'none', L: lastMeal(r), E: 'Jumped on the way home.' } },
        bys: r.chance(0.4), hazard: 'violence',
      };
    },
    checks: [
      { kind: 'crit', text: 'Waited for police to clear the scene', test: (C) => !C.enteredUnsafe },
      { kind: 'crit', text: 'Wound sealed or packed', test: (C) => did(C, 'seal') || did(C, 'gauze') },
      { kind: 'good', text: 'Platinum ten minutes on scene', test: (C) => (C.times.depart || Infinity) - C.times.contact < 10 * 60 },
    ] },
  { id: 'birth', nature: 'Childbirth', cat: 'Special', rank: 0, pri: 1, places: ['house', 'apt'], w: 2,
    dest: 'ob', alert: null, sceneGoal: 25 * 60, transportLS: () => false,
    make(r) {
      const fast = r.chance(0.65);
      return {
        text: fast ? 'woman in labor, says the baby is coming now' : 'woman in labor, contractions 4 minutes apart',
        spec: { age: r.int(22, 38), sex: 'F', pose: 'lieKnee', position: 'supine', place: 'floor', conds: { labor: { rate: fast ? 0.0011 : 0.00012, crown: fast ? 0.55 : 0.15 } },
          hist: { S: 'contractions, pressure', A: allergy(r), M: 'prenatal vitamins', P: fast ? 'two previous babies, both fast' : 'first pregnancy', L: lastMeal(r), E: 'Waters broke an hour ago.' } },
        bys: true,
      };
    },
    checks: [
      { kind: 'crit', text: 'Baby kept warm and stimulated', test: (C, P) => !P.conds.labor.born || did(C, 'baby') },
      { kind: 'crit', text: 'Cord clamped and cut', test: (C, P) => !P.conds.labor.born || did(C, 'cord') },
      { kind: 'good', text: 'Fundal massage after delivery', test: (C, P) => !P.conds.labor.born || did(C, 'fundal') },
      { kind: 'good', text: 'Went to a hospital with labor & delivery', test: (C) => C.dest && HOSPITALS[C.dest].caps.includes('ob') },
    ] },
  { id: 'lift', nature: 'Fall, no injury reported', cat: 'Special', rank: 0, pri: 3, places: ['house', 'apt'], w: 4,
    dest: 'any', alert: null, sceneGoal: 25 * 60, transportLS: () => false, refusalOk: true,
    make(r) {
      return {
        text: 'lift assist, fell out of bed, wants help up',
        spec: { age: r.int(70, 92), pose: 'sitGround', position: 'sitting', place: 'floor', flags: { refuse: true }, injuries: [{ desc: 'Small skin tear on the left forearm', minor: true }], look: { elder: true },
          hist: { S: 'none, just embarrassed', A: allergy(r), M: meds(r), P: 'arthritis', L: lastMeal(r), E: 'Rolled out of bed reaching for the lamp. Didn\'t hit my head.' } },
        bys: r.chance(0.5),
      };
    },
    checks: [
      { kind: 'crit', text: 'Full set of vitals before refusal', test: (C, P) => vitalsSet(P) },
      { kind: 'crit', text: 'Exam to rule out injuries', test: (C) => did(C, 'exam') },
      { kind: 'good', text: 'Blood glucose checked', test: (C) => did(C, 'glucose') },
      { kind: 'good', text: 'Skin tear dressed', test: (C) => did(C, 'bandage') },
    ] },
  { id: 'heat', nature: 'Person down in the heat', cat: 'Medical', rank: 1, pri: 1, places: ['park', 'road'], w: 2, dayOnly: true,
    dest: 'any', alert: null, sceneGoal: 12 * 60, transportLS: (C, P) => P.conds.heat.sev > 0.6,
    make(r) {
      return {
        text: 'collapsed while jogging, confused',
        spec: { age: r.int(18, 55), pose: 'lie', position: 'supine', place: 'ground', conds: { heat: { sev: r.range(0.6, 0.85) }, dehydr: { sev: 0.6 } },
          hist: { S: 'dizzy, nauseous, confused', A: 'none', M: 'none', P: 'none', L: 'Water an hour ago', E: 'Long run in the afternoon heat.' } },
        bys: true,
      };
    },
    checks: [
      { kind: 'crit', text: 'Temperature taken', test: (C) => did(C, 'temp') },
      { kind: 'crit', text: 'Active cooling started', test: (C) => did(C, 'cool') },
      { kind: 'good', text: 'IV fluids (AEMT+)', test: (C) => did(C, 'fluids') },
      { kind: 'good', text: 'Blood glucose checked', test: (C) => did(C, 'glucose') },
    ] },
];
const CALL = Object.fromEntries(CALLS.map((c) => [c.id, c]));

// pick a call type and place for the shift: weighted by district flavour, rank and time of day
const DISTRICT_W = {
  maple: { fall: 2, lift: 2, chest: 1.3, birth: 1.4, diabetic: 1.1, sports: 1.2, overdose: 0.4, stab: 0.2, lac: 0.5 },
  eastgate: { mvc: 1.6, asthma: 1.2, overdose: 1.0, chest: 1.0, anaph: 1.2 },
  downtown: { stab: 1.8, overdose: 1.8, arrest: 1.4, chest: 1.2, seizure: 1.3, heat: 1.4 },
  harbor: { lac: 2.6, mvc: 1.5, overdose: 1.2, stab: 1.0, fall: 0.4, lift: 0.3 },
};
function pickCall(r, opts = {}) {
  const C = G.career, night = R.night > 0.5;
  const districts = opts.district ? [opts.district] : C.districts.filter((d) => G.shift.cover.includes(d));
  for (let tries = 0; tries < 40; tries++) {
    const d = r.pick(districts);
    const tpl = opts.type ? CALL[opts.type] : r.wpick(CALLS.filter((t) => t.rank <= C.rank && !(t.dayOnly && night)), (t) => t.w * ((DISTRICT_W[d] || {})[t.id] || 1) * (night && (t.id === 'overdose' || t.id === 'stab' || t.id === 'mvc') ? 1.4 : 1));
    const kinds = tpl.places;
    const cands = kinds.includes('road') ? roadPlaces(d, r) : CITY.places.filter((p) => p.district === d && kinds.includes(p.kind));
    if (!cands.length) continue;
    let place = opts.zoneW ? r.wpick(cands, opts.zoneW) : r.pick(cands);
    if (opts.near) place = cands.reduce((a, b) => (dist2(a.x, a.z, opts.near.x, opts.near.z) < dist2(b.x, b.z, opts.near.x, opts.near.z) ? a : b));
    if (opts.far) { const far = cands.filter((p) => dist(p.x, p.z, RIG.x, RIG.z) > opts.far); if (far.length) place = r.pick(far); }
    if (RIG && dist(place.x, place.z, RIG.x, RIG.z) < 90 && !opts.type && !opts.near) continue;
    return { tpl, place };
  }
  return null;
}
// crash sites: a point in a lane mid-block, or on the Beltway
function roadPlaces(d, r) {
  const out = [];
  for (const e of CITY.edges) {
    const A = CITY.nodes[e.a];
    const mx = A.x + (e.axis === 'x' ? CP / 2 : 0), mz = A.z + (e.axis === 'z' ? CP / 2 : 0);
    if (districtAt(mx, mz) !== d) continue;
    const dir = r.chance(0.5) ? 1 : -1;
    const p = edgePos(e, dir, CP / 2 + r.range(-10, 10), laneOff(e.lanes - 1));
    const curb = edgePos(e, dir, CP / 2 - 13, parkOff(e.line)); // between the wreck and where the engine blocks the lane
    out.push({ kind: 'road', district: d, x: p.x, z: p.z, yaw: p.yaw, edge: e, dir, highway: e.line === 0 || e.line === CN, curb: { x: curb.x, z: curb.z, yaw: curb.yaw }, addr: (e.line === 0 || e.line === CN ? e.name : e.name + ' near ' + crossName(e, dir)), outdoor: true, floors: 0, access: 'ground' });
  }
  return out;
}
function crossName(e, dir) { const [, E] = edgeEnds(e, dir); return e.axis === 'x' ? STREETS_X[E.i] : STREETS_Z[E.j]; }
