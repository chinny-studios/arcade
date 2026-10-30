// a long hunt in god mode: wander to people and kill them, watch how the town reacts
CF.start({ monster: 'werewolf' });
CF.god(true);
const log = [];
let t = 0;
while (t < 150) {
  const v = CF.nearest(['idle', 'walk', 'flee', 'cower', 'down', 'trance', 'blind']);
  if (v) { CF.tp(v.x + 1.2, v.z + 1.2); CF.aimAt(v); CF.press('atk'); }
  CF.sim(4); t += 4;
  if (t % 20 === 0) log.push([t, CF.G.kills, CF.G.score, Math.round(CF.G.panic), JSON.stringify(CF.counts()), CF.CARS.list.filter((c) => c.state === 'drive').length, CF.TOWN.refuges.reduce((a, r) => a + r.occ.length, 0)].join(' '));
}
return log;
//--- shot play
