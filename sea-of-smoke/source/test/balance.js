// Plays AI-only battles on every map (player parked under god mode) and reports length, result and losses.
const res = [];
for (let m = 0; m < 3; m++) for (let rep = 0; rep < 2; rep++) {
  SS.start({ map: m, seed: 100 + m * 10 + rep, noPlayer: true });
  const t0 = performance.now();
  for (let i = 0; i < 40 && SS.state().phase !== 'over'; i++) SS.sim(30, 1 / 20);
  const s = SS.state(), sh = SS.ships();
  const by = (T) => sh.filter((x) => x.team === T && !x.alive).map((x) => x.cls[0]).join('');
  const boards = SS.match.log.filter((l) => /captured/.test(l.text)).length, forts = SS.match.log.filter((l) => /silenced/.test(l.text)).length;
  res.push(`${SS.MAPS[m].id} seed${rep}: ${s.result.why} t=${s.time}s pts=${s.result.pts.map(Math.round)} alive=${s.alive} lost0=${by(0)} lost1=${by(1)} captures=${boards} forts=${forts} sim=${Math.round(performance.now() - t0)}ms`);
}
return res;
