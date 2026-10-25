// two minutes in, stand behind the busiest firing line and look at the enemy
SH.god(true);
SH.sim(120);
const me = P.s;
let best = null, bs = -1;
for (const s of SH.SOLDIERS) if (s.bot && s.team === me.team && s.state === 'up' && s.bot.target) { const n = SH.SOLDIERS.filter((o) => o.team === me.team && o.state === 'up' && o.pos.distanceTo(s.pos) < 20).length; if (n > bs) { bs = n; best = s; } }
const t = best.bot.target;
const dx = t.pos.x - best.pos.x, dz = t.pos.z - best.pos.z, d = Math.hypot(dx, dz);
SH.tp(best.pos.x - dx / d * 6, best.pos.z - dz / d * 6);
SH.aimAt(t.pos.x, t.pos.y + 1.2, t.pos.z);
SH.sim(0.6);
SH.aimAt(t.pos.x, t.pos.y + 1.2, t.pos.z);
return { d, n: bs };
//--- shot front1
SH.sim(4); 
//--- shot front2
