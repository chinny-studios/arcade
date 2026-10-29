// Every mission with the player's ship flown by the AI: how long, who wins, what's left.
HG.manual(true); const SEED = window.__seed || 11;
const res = [];
for (const m of HG.MISSIONS) {
  if (m.id === 'admiral') continue;
  HG.start({ mission: m.id, seed: SEED });
  const p = HG.G.player; p.ai = new (HG.G.ships.find((s) => s.ai).ai.constructor)(p, {});
  let st;
  for (let t = 0; t < 900; t += 30) { st = HG.sim(30); if (st.phase !== 'play') break; }
  res.push({ m: m.id, t: st.time, result: st.result, reason: st.reason, alive: st.alive, hull: Math.round(p.hull / p.maxHull * 100), grade: st.grade, objs: st.objs });
}
return res;
