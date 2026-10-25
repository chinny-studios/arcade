// play a whole conquest round on fast forward and check that it ends
SH.god(true);
let t = 0;
const log = [];
while (!M.over && t < 2400) { SH.sim(60); t += 60; log.push(t + 's ' + M.tickets.join('/') + ' ' + M.flags.map((f) => f.id + f.owner).join('')); }
SH.sim(8);
return { t, over: M.over, winner: M.winner, state: SH.state, log: log.filter((x, i) => i % 3 === 0), stats: SH.STATS };
