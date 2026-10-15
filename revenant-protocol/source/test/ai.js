const res = [];
const spots = [[33, 15], [24, 33], [21, 24], [20, 26]];
for (let m = 0; m < 4; m++) {
  RP.start(m); RP.god();
  RP.tp(spots[m][0], spots[m][1], 0);
  for (const e of RP.ENEMIES) { e.alert = true; e.state = 'chase'; e.ambush = false; }
  const d0 = RP.ENEMIES.map(e => Math.hypot(e.x - RP.P.x, e.z - RP.P.z));
  const t0 = performance.now();
  RP.sim(20);
  const ms = performance.now() - t0;
  let closer = 0, stuck = 0;
  RP.ENEMIES.forEach((e, i) => { const d = Math.hypot(e.x - RP.P.x, e.z - RP.P.z); if (d < d0[i] - 4) closer++; const c = RP.f.cellAt(e.x, e.z); if (c.solid) stuck++; });
  res.push({ m, n: RP.ENEMIES.length, closer, stuck, dead: RP.ENEMIES.filter(e => e.dead).length, proj: RP.PROJ.length, msPerSimSec: Math.round(ms / 20), hpLost: 100 - RP.P.health });
}
return res;
