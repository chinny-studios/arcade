// Wants appear and come true; a party by phone brings guests and is judged at the end
const [maya, ben, jun] = S;
WL.sim(5);
const rep = { wants: S.map(s => (s.wants || []).map(w => w.id + ':' + w.arg)) };
// meet a few neighbours first
for (const p of G.sims.filter(p => !p.household).slice(0, 5)) { WL.f.simById(p.id); maya.rels[p.id] = { f: 30, r: 0, met: true }; p.rels[maya.id] = { f: 30, r: 0, met: true }; }
WL.time(1, 17);
WL.act(0, 'phone', 'party');
WL.sim(90);
rep.guests = G.sims.filter(s => s.onLot && s.visit && s.visit.party).map(s => s.first + ':' + s.visit.state);
rep.flags = G.flags.party;
WL.sim(320);
rep.after = { party: G.flags.party, moodlets: maya.moodlets.map(m => m.id), aspire: S.map(s => s.aspire || 0) };
rep.log = G.log.slice(0, 8).map(l => l.icon + ' ' + l.text);
WL.cam(12, 14, 20, Math.PI / 4);
return rep;
