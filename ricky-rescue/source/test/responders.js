// Responding units: an engine and police drive in with lights, crews walk to the patient, a firefighter takes over CPR,
// the engine medic joins as a third worker (doing paramedic skills while Ricky is still an EMT) and rides to the
// hospital; police clear an unsafe scene; units go back in service afterwards.
const L = {};
let c, n = 0;
do { if (RR.C) { RR.G.call = null; RR.f.backInService(); } c = RR.call('arrest'); n++; } while (!RR.C.units.some((u) => u.kind === 'fire') && n < 10);
const E = RR.C.units.find((u) => u.kind === 'fire');
L.dispatched = RR.C.units.map((u) => u.name);
const d0 = Math.round(E.route.len - E.s);
RR.sim(6);
L.engineMoving = { before: d0, after: Math.round(E.route.len - E.s), v: +E.v.toFixed(1), state: E.state };
// let the engine get there on its own
for (let k = 0; k < 120 && E.state === 'enroute'; k++) RR.sim(1);
L.engineArrived = E.state;
for (let k = 0; k < 40 && !RR.C.fireOn; k++) RR.sim(0.5);
L.ffAtPatient = !!RR.C.fireOn;
L.cprByFire = RR.f.careContext(RR.C).cpr;
RR.render();
return L;
//--- shot r1_engine_on_scene
RR.toScene(); RR.toPatient();
for (let k = 0; k < 40 && !RR.MEDIC.on; k++) RR.sim(0.5);
const M = { medicOn: RR.MEDIC.on, name: RR.MEDIC.name, rank: RR.G.career.rank };
M.ppe = RR.act('ppe');
M.iv = RR.act('iv', 'medic');
M.epi = RR.P.arrest ? RR.act('epi', 'medic') : 'pulse back';
M.rickyIV = RR.f.doAction('igel', 'ricky') ? 'allowed?!' : 'blocked for an EMT';
RR.sim(2); RR.render();
return M;
//--- shot r2_medic_working
for (let k = 0; k < 8 && RR.P.arrest; k++) { RR.sim(15); if (RR.C.shockReady) RR.act('shock', 'medic'); }
RR.pack('stretcher');
const T = RR.transport('mercy', 'ricky', 'stemi', true);
T.medicRides = RR.MEDIC.task;
T.workers = RR.WORK.medic ? RR.WORK.medic.name : null;
RR.sim(8);
T.unitsAfter = RR.units();
return T;
//--- shot r3_leaving
RR.arrive(); const h = RR.handoff(true);
RR.UI.hide('review'); RR.f.backInService(); RR.sim(1);
return { grade: h.grade, medicAfter: RR.MEDIC.on, units: RR.units() };
//--- shot r4_after
// an unsafe scene: police drive in and clear it before Medic 12 goes in
let s, m = 0;
do { if (RR.C) { RR.G.call = null; RR.f.backInService(); } s = RR.call('stab'); m++; } while (!s && m < 5);
const C = RR.C, cop = C.units.find((u) => u.kind === 'police');
RR.toScene();
const stage1 = C.stage;
for (let k = 0; k < 200 && !C.pdCleared; k++) RR.sim(1);
RR.render();
return { hazard: C.hazard, stage1, cleared: C.pdCleared, copState: cop && cop.state, entered: !!C.enteredUnsafe, units: RR.units() };
//--- shot r5_police
