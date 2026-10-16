// A hungry child alone at home: does she feed herself? What does she do all afternoon?
const G = WL.G, [maya, ben, jun] = WL.sims();
WL.time(1, 15);
for (const s of [maya, ben]) { s.onLot = false; s.away = { kind: 'work', until: G.t + 9999 }; }
WL.needs(2, { hunger: 25, fun: 50, energy: 70, bladder: 60 });
jun.school.homework = true;
const log = [];
for (let i = 0; i < 36; i++) { WL.sim(10); log.push(Math.round(G.t % 1440 / 6) / 10 + 'h ' + (jun.cur ? jun.cur.id : '-') + ' h' + Math.round(jun.needs.hunger) + ' f' + Math.round(jun.needs.fun) + ' b' + Math.round(jun.needs.bladder) + ' e' + Math.round(jun.needs.energy) + (jun.school.homework ? ' HW' : '')); }
return log;
