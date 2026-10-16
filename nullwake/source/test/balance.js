// Plays a whole run with the autopilot and prints a line per minute. Usage:
//   node test/smoke.mjs --stage s1 --pilot ryn --steps test/balance.js
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
