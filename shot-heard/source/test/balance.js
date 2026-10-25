// bots only, eight minutes: who is ahead, and who kills with what
const map = SH.MATCH.map ? SH.MATCH.map.id : 'lexington';
SH.f.startMatch({ map: SH.f.MAPS.find((m) => m.id === window.__map), mode: window.__mode || 'conquest', side: 0, size: 32, tix: 1, diff: 1, player: false });
const k = { US: {}, GB: {} };
SH.sim(480);
for (const s of SH.SOLDIERS) { const t = s.team ? 'GB' : 'US'; k[t][s.cls] = (k[t][s.cls] || 0) + s.sc.kills; }
return { tickets: M.tickets, kills: k, flags: M.flags.map((f) => f.id + f.owner).join('') };
