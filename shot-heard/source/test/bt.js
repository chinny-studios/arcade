// a whole breakthrough round on fast forward
SH.god(true);
let t = 0;
const log = [];
while (!M.over && t < 2400) { SH.sim(60); t += 60; log.push(t + 's sector ' + M.sector + ' att ' + M.tickets[M.attacker] + ' ' + M.flags.map((f) => f.id + f.owner + (f.active ? '*' : '')).join('')); }
SH.sim(8);
return { t, over: M.over, winner: M.winner, attacker: M.attacker, state: SH.state, log };
