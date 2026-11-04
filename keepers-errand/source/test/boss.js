// the boss on its own: phase 1 by the real rules (charge into a wall, punch the boiler), phase 2 with Sporty lobs
await KE.start({ area: 'lh3', at: [0, 7.4, Math.PI], items: { pebble: 1, stamp: 1 }, flags: { sawNotice: true, intro: true, pebbleUp: true, lighthouseOpen: true, lhDrained: true, fuseBroken: true } });
KE.god(); KE.sim(0.5); await say(); KE.sim(0.5);
const B = F.G.boss; KE.mode('aggressive');
let tt = 0;
while (tt < 120 && B.phase === 1 && B.hp > 0) {
  if (B.state === 'stunned') { KE.walkTo(B.x - Math.sin(B.ry) * 2.0, B.z - Math.cos(B.ry) * 2.0, 1.0, 0.4); KE.face(B.x, B.z); KE.press('action'); KE.sim(0.3); }
  else { const an = Math.atan2(H.x - B.x, H.z - B.z); if (Math.hypot(H.x, H.z) < 6.5) KE.walkTo(Math.sin(an) * 7.6, Math.cos(an) * 7.6, 0.6, 0.5); else { F.G.autoMove = [Math.cos(an), -Math.sin(an)]; KE.sim(0.25); F.G.autoMove = null; } }
  KE.sim(0.1); tt += 0.5;
}
log.push(['phase1', B.phase, B.hp, Math.round(tt)]);
KE.sim(3); await say(); KE.sim(1.0);
for (const mode of ['sporty', 'normal', 'aggressive']) {
  KE.mode(mode); const before = B.coreHp; tt = 0;
  while (tt < 30 && B.coreHp === before) {
    if (B.eng.open && !F.Pebble.active) { const an = Math.atan2(H.x, H.z); if (Math.hypot(H.x, H.z) > 6) KE.walkTo(Math.sin(an) * 4.5, Math.cos(an) * 4.5, 1.5, 0.5); KE.face(0, 0); KE.press('throw'); }
    KE.sim(0.2); tt += 0.2;
  }
  log.push([mode, before - B.coreHp, Math.round(tt)]);
}
await say(0, 2.5); KE.sim(2);
log.push(['ending', S().flags.includes('bossDone'), S().area, F.G.state, F.G.weather]);
return log;
