// how often do the bots fire and hit?
SH.god(true);
const rows = [];
for (let k = 0; k < 6; k++) {
  SH.sim(30);
  const S = SH.SOLDIERS.filter((s) => s.bot);
  rows.push({ t: (k + 1) * 30, ...SH.STATS, targets: S.filter((s) => s.bot.target).length, fight: S.filter((s) => s.bot.state === 'fight').length, reload: S.filter((s) => s.bot.state === 'reload').length, up: S.filter((s) => s.state === 'up').length, tix: SH.MATCH.tickets.join('/') });
}
return rows.map((r) => JSON.stringify(r));
