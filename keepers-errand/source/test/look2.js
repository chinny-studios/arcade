await KE.start({ area: 'lh3', at: [0, 7.4, Math.PI], items: { pebble: 1 }, flags: { sawNotice: true, intro: true, pebbleUp: true, lighthouseOpen: true } });
KE.god(); KE.sim(1.2);
const B = F.G.boss;
out.b = [[B.x, B.y, B.z, B.state, B.obj.visible, !!B.obj.parent, B.obj.parent && B.obj.parent.name]];
//--- shot b_intro
await say(); KE.sim(2.0);
const B = F.G.boss; out.b.push([B.x, B.y, B.z, B.state]);
//--- shot b_fight
const B = F.G.boss; B.damage(8); KE.sim(4); await say(); KE.sim(4.5); out.b.push([B.x, B.y, B.z, B.state, B.phase]);
return out.b;
//--- shot b_phase2
