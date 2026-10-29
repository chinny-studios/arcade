HG.manual(true);
HG.start({ mission: 0, seed: 4 });
HG.peace = HG.peace; // AI on for everyone, player too
const p = HG.G.player; p.ai = new (HG.G.ships[1].ai.constructor)(p, {});
const log = [];
for (let i = 0; i < 12; i++) { const st = HG.sim(15); log.push([st.time, st.alive.join('v'), st.craft.join('v'), st.phase, st.result, Math.round(p.hull)]); if (st.phase !== 'play') break; }
out.log = log;
HG.run(1.5); HG.render();
return { log, ships: HG.ships().map((s) => [s.name, s.cls, s.team, s.alive, s.hull, s.subs.join(','), s.stats.dmg | 0, s.stats.hits + '/' + s.stats.shots]) };
//--- shot battle
