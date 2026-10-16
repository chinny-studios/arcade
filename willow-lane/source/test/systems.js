// Exercise the main systems headless and report what happened
const G = WL.G, f = WL.f, rep = {};
const hh = () => WL.sims();
const [maya, ben, jun] = hh();
const fridge = G.objects.find(o => o.type === 'fridge');
// --- cooking
WL.needs(0, { hunger: 30 });
WL.act(0, 'fridge', 'cookMeal');
WL.sim(90);
rep.cook = { hunger: Math.round(maya.needs.hunger), items: G.items.map(i => i.kind + (i.servings != null ? i.servings : '') + (i.dirty ? '*' : '')), cooking: maya.skills.cooking };
// --- socials
WL.social(0, 1, 'chat'); WL.sim(30);
WL.social(0, 1, 'kiss'); WL.sim(20);
rep.social = { f: Math.round(maya.rels[ben.id].f), r: Math.round(maya.rels[ben.id].r), label: ben && maya.rels[ben.id].spouse };
// --- job & carpool
f.takeJob(ben, 'business');
WL.time(2, 7.5);
WL.sim(70);
rep.work = { away: ben.away && ben.away.kind, veh: f.VEH.length, jun: jun.away && jun.away.kind };
WL.sim(9 * 60);
rep.workBack = { away: ben.away && ben.away.kind, money: G.money, perf: Math.round(ben.job.perf), jun: jun.away, homework: jun.school.homework, grade: jun.school.grade };
// --- visitors
const v = WL.visitor(); WL.sim(60);
rep.visit = { name: v && v.first, onLot: v && v.onLot, state: v && v.visit && v.visit.state, cur: v && v.cur && v.cur.id };
// --- pregnancy & birth
maya.rels[ben.id].r = ben.rels[maya.id].r = 90;
const bed = G.objects.find(o => o.type === 'bed_double');
let tries = 0;
while (!maya.preg && !ben.preg && tries++ < 5) { WL.act(0, bed, 'tryBaby', ben); WL.sim(80); }
rep.preg = { maya: !!maya.preg, ben: !!ben.preg, tries };
WL.sim(3 * 1440 + 120, 2);
rep.baby = hh().map(s => s.first + ':' + s.age);
// --- aging
f.ageUp(jun);
rep.aged = jun.age;
rep.stats = WL.stats();
rep.log = G.log.slice(0, 25).map(l => l.icon + ' ' + l.text);
return rep;
//--- shot systems
