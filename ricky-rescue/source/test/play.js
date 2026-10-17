// A chest-pain call from dispatch to handoff through the debug hook, with screenshots along the way.
const c = RR.call('chest', { district: 'maple' });
out.call = c;
RR.sim(2);
return { c, s: RR.stats() };
//--- shot p1_dispatch
RR.toScene();
RR.sim(0.5);
return RR.stats();
//--- shot p2_scene
const r = RR.toPatient();
RR.sim(0.3);
return r;
//--- shot p3_care
const L = [];
for (const id of ['ppe', 'impression', 'abc']) L.push(id + ': ' + RR.act(id));
L.push('monitor: ' + RR.act('monitor', 'partner', false));
for (const id of ['sample', 'opqrst', 'aspirin', 'nitro']) L.push(id + ': ' + RR.act(id));
L.push('bp: ' + RR.act('bp', 'partner'));
RR.sim(1);
return { L, s: RR.stats() };
//--- shot p4_treated
const p = RR.pack('stretcher');
RR.sim(0.5);
return { p, s: RR.stats() };
//--- shot p5_transport_panel
const t = RR.transport('mercy', 'partner', RR.P.conds.stemi ? 'stemi' : 'none', !!RR.P.conds.stemi);
RR.sim(5);
return { t, s: RR.stats() };
//--- shot p6_back
RR.sim(40);
return RR.stats();
//--- shot p7_drive
const st = RR.arrive();
RR.sim(0.5);
return { st, s: RR.stats() };
//--- shot p8_hospital
const h = RR.handoff(true);
RR.sim(0.3);
return h;
//--- shot p9_review
