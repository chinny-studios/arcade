// live dispatch for ten minutes with nobody flying: calls spawn, time out, fires spread and burn down
const G = CC.G, seen = {}, ends = [];
CC.G.dispatch = true; CC.G.nextCallT = 1;
const off = []; 
const t0 = performance.now();
for (let i = 0; i < 120; i++) { CC.sim(5, 1 / 15); for (const c of G.calls) seen[c.type] = (seen[c.type] || 0) + 1; }
return { secs: Math.round((performance.now() - t0) / 1000), types: Object.keys(seen), open: G.calls.map((c) => c.type), stats: G.stats, burnt: CC.CITY.buildings.filter((b) => b.burnt).length, fires: CC.FIRE.list.length, particles: CC.FX.pools.add.list.length + CC.FX.pools.mix.list.length };
