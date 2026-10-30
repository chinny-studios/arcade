// a bot patrol: head for the nearest crime, fight whatever is there, use every power; four minutes per hero
const res = {};
for (const hero of ['spindle', 'skylark', 'blitz', 'bulwark', 'equinox']) {
  VB.start({ hero, crimes: true });
  VB.CRIME.villainT = 60;
  let t = 0, downs = 0, wasDown = false;
  const acts = ['atk', 'atk', 'atk', 'rmb', 'q', 'e', 'atk', 'down', 'jump'];
  while (t < 240) {
    const P = VB.P;
    if (P.downed) { if (!wasDown) downs++; wasDown = true; VB.sim(0.5); t += 0.5; continue; }
    wasDown = false;
    let tgt = null, bd = 1e9;
    for (const f of VB.FOES.list) { if (f.ko || f.dead) continue; const d = Math.hypot(f.x - P.x, f.z - P.z); if (d < bd) { bd = d; tgt = f; } }
    if (tgt && bd < 25) {
      VB.aimAt(tgt);
      const a = acts[Math.floor(Math.random() * acts.length)];
      VB.hold([a], 0.15, { x: 0, y: bd > 3 ? -1 : 0 });
      if (P.meter >= 100) VB.press('ult');
      t += 0.2;
    } else {
      const c = VB.CRIME.list.filter((c) => c.state === 'active').sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
      if (c) { const d = Math.hypot(c.x - P.x, c.z - P.z), k = Math.min(1, 30 / d); VB.tp(P.x + (c.x - P.x) * k, P.z + (c.z - P.z) * k); }
      VB.sim(0.5); t += 0.5;
    }
  }
  const done = VB.CRIME.list.length;
  res[hero] = { score: VB.G.score, arrests: VB.G.arrests, saves: VB.G.saves, bosses: VB.G.bosses, downs, wave: Math.round(VB.G.wave), hp: Math.round(VB.P.hp), foes: VB.FOES.list.length, pops: VB.FX.pools.spark.list.length };
}
return res;
