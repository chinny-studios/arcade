// a last look: wounded, the deploy screen after death, cavalry and a crewed gun, a gunboat at dusk
SH.sim(3);
SH.f.hurtSoldier(P.s, 100, SH.enemy()[0], 'Brown Bess', 'body', 0.5, 0.5); SH.sim(1.2);
return P.s.state;
//--- shot vis_wounded
SH.f.killSoldier(P.s, null, '', false); SH.sim(3);
return SH.state;
//--- shot vis_dead_deploy
SH.start({ map: 'saratoga', side: 0 }); SH.god(true); SH.sim(25);
const h = SH.HORSES.find((x) => x.rider && x.rider.bot);
const c = SH.CANNONS.find((x) => x.crew);
out.hc = { h: !!h, c: !!c };
if (h) { SH.tp(h.pos.x + 8, h.pos.z + 8); SH.aimAt(h.pos.x, h.pos.y + 1.6, h.pos.z); }
SH.sim(0.05); if (h) SH.aimAt(h.pos.x, h.pos.y + 1.6, h.pos.z); SH.sim(0.02);
return out.hc;
//--- shot vis_rider
const c = SH.CANNONS.find((x) => x.crew);
if (c) { SH.tp(c.pos.x + Math.cos(c.yaw) * 6 + Math.sin(c.yaw) * 4, c.pos.z - Math.sin(c.yaw) * 6 + Math.cos(c.yaw) * 4); SH.aimAt(c.pos.x, c.pos.y + 1, c.pos.z); SH.sim(0.05); }
return !!c;
//--- shot vis_gun
SH.start({ map: 'yorktown', side: 1, spawn: 'B' }); SH.god(true); SH.sim(6);
return { mounted: P.s.mount && P.s.mount.type };
//--- shot vis_ship
