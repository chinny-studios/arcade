// Life events: a romance with a neighbour that ends in a wedding and moving in, a kitchen fire, and old age
const rep = {};
const [maya, ben, jun] = S;
// a townie visits; Maya (single for this test) woos them
F.wedding && 0;
for (const r of [maya.rels[ben.id], ben.rels[maya.id]]) { r.spouse = false; r.r = 0; }
const v = WL.visitor(); WL.sim(40);
rep.visitor = { name: v.first, state: v.visit && v.visit.state, onLot: v.onLot };
const r = maya.rels[v.id] = maya.rels[v.id] || { f: 0, r: 0, met: true }; const r2 = v.rels[maya.id] = v.rels[maya.id] || { f: 0, r: 0, met: true };
r.f = r2.f = 75; r.r = r2.r = 60; r.met = r2.met = true;
v.visit.until = G.t + 600;
for (const id of ['goSteady', 'propose', 'marry']) {
  r.r = r2.r = Math.max(r.r, 85); r.f = r2.f = Math.max(r.f, 80);
  WL.social(0, v, id); WL.sim(40);
  rep[id] = { partner: !!r.partner, engaged: !!r.engaged, spouse: !!r.spouse, household: v.household };
}
// fire
const stove = G.objects.find(o => o.type === 'stove');
F.startFire(stove, maya);
WL.sim(5);
rep.fire = { fires: G.items.filter(i => i.kind === 'fire').length, cur: maya.cur && maya.cur.id };
WL.sim(40);
rep.fireAfter = { fires: G.items.filter(i => i.kind === 'fire').length, stoveBroken: stove.broken };
// old age
maya.age = 'elder'; maya.ageDays = 30; F.passAway(maya); WL.sim(10);
rep.death = { alive: maya.alive, hh: WL.sims().map(s => s.first), urn: G.objects.some(o => o.type === 'urn'), grieving: ben.moodlets.map(m => m.id) };
rep.log = G.log.slice(0, 14).map(l => l.icon + ' ' + l.text);
return rep;
