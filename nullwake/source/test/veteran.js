// Restarts the run with a mid-game hangar (a few ranks in the cheaper upgrades), then plays it like balance.js.
//   node test/smoke.mjs --stage s2 --steps test/veteran.js
NW.SAVE().meta = { hull: 3, armor: 1, regen: 2, might: 3, area: 1, move: 1, magnet: 1, growth: 1, greed: 2 };
NW.start({ stage: G.stageId, pilot: G.pilotId, seed: 'test' });
const rows = [];
for (let m = 0; m < 20 && !G.ended; m++) {
  const t0 = performance.now(); G.dmgLog = {};
  const s = NW.sim(60);
  rows.push(`${String(s.t).padStart(4)}s hp ${String(s.hp).padStart(3)}/${s.maxHp} lv ${String(s.lvl).padStart(2)} kills ${String(s.kills).padStart(5)} foes ${String(s.enemies).padStart(3)} gems ${String(s.gems).padStart(3)} ${s.boss || ''} | ${s.weapons.join(' ')} | ${s.passives.join(' ')} (${Math.round(performance.now() - t0)} ms) dmg ${JSON.stringify(Object.fromEntries(Object.entries(G.dmgLog).map(([k, v]) => [k, Math.round(v)])))}`);
  if (s.dead || s.won) break;
}
const st = NW.stats();
rows.push(`end: ${st.won ? 'WON' : st.dead ? 'DIED' : 'running'} at ${st.t}s, gold ${st.gold}`);
return rows;
