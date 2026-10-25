// bots fight on their own for two minutes: flags change hands, men fall, tickets drop
SH.god(true); SH.peace(false);
const t = SH.sim(60);
const S = SH.SOLDIERS;
out.a = { ms: t, ...SH.stats(), kills: S.reduce((a, s) => a + s.sc.kills, 0), deaths: S.reduce((a, s) => a + s.sc.deaths, 0), shots: S.filter((s) => s.lastFireT > 0).length,
  states: S.reduce((m, s) => (m[s.bot ? s.bot.state : 'player'] = (m[s.bot ? s.bot.state : 'player'] || 0) + 1, m), {}) };
return out.a;
//--- shot battle1
const t2 = SH.sim(60);
const S = SH.SOLDIERS;
return { ms: t2, ...SH.stats(), kills: S.reduce((a, s) => a + s.sc.kills, 0), deaths: S.reduce((a, s) => a + s.sc.deaths, 0), revives: S.reduce((a, s) => a + s.sc.revives, 0),
  crews: SH.CANNONS.map((c) => !!c.crew), riders: SH.HORSES.map((h) => !!h.rider), colours: SH.COLOURS.length, cls: Object.entries(S.reduce((m, s) => (m[s.cls] = (m[s.cls] || 0) + s.sc.kills, m), {})) };
//--- shot battle2
