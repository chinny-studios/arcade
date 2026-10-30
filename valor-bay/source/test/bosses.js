// each villain against a god-mode hero: watch the moves for a while, then beat them
const r = {};
for (const [id, hero] of [['mauler', 'bulwark'], ['kilowatt', 'spindle'], ['overclock', 'skylark']]) {
  VB.start({ hero, god: true, at: { x: 2, z: 100 } });
  const b = VB.boss(id, 2, 80);
  const moves = new Set();
  for (let i = 0; i < 200; i++) { VB.sim(0.1); if (b.move) moves.add(b.move); }
  const hpBefore = Math.round(b.hp);
  let t = 0;
  while (!b.ko && t < 90) {
    VB.aimAt(b);
    if (b.y - VB.P.y > 4 || hero === 'skylark') { VB.press('rmb'); VB.sim(0.25); if (VB.P.cds.e <= 0) VB.press('e'); }
    else { VB.press('atk'); VB.sim(0.25); }
    if (VB.P.meter >= 100) VB.press('ult');
    t += 0.3;
  }
  r[id] = { moves: [...moves], hpBefore, ko: b.ko, t: +t.toFixed(1), score: VB.G.score, heroHp: Math.round(VB.P.hp) };
}
return r;
