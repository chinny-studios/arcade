document.querySelector('#banner').style.visibility = 'hidden';
RA.time(10); RA.go('suburastreet'); RA.sim(2);
const near = RA.NPC.agents.filter((a) => a.type === 'walk' && a.look).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
const a = near[0]; a.v = 0; a.spd = 0; a.talk = true;
RA.tp(a.x + Math.sin(a.yaw) * 2.6, a.z + Math.cos(a.yaw) * 2.6); RA.sim(0.5); RA.lookAt(a.x, a.y + 1.2, a.z); RA.render();
return a.who.title;
//--- shot t_face
// a lineup of roles
const roles = ['citizen', 'woman', 'senator', 'soldier', 'vestal', 'slave', 'child', 'philosopher', 'magistrate', 'lictor', 'traveller', 'vigil', 'gladiator', 'farmer'];
RA.time(10); RA.go('forum'); RA.sim(0.2);
const cx = P.x, cz = P.z, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
RA.NPC.agents.length = 0;
roles.forEach((r, i) => { const p = RA.f.makePerson(r); const ag = RA.NPC.newAgent('spot', p); ag.pose = 'stand'; const o = (i - roles.length / 2) * 0.95; ag.x = cx + fx * 7 + rx * o; ag.z = cz + fz * 7 + rz * o; ag.y = RA.f.groundAt(ag.x, ag.z) + 0.06; ag.yaw = Math.atan2(cx - ag.x, cz - ag.z); });
RA.NPC.spotT = 999; RA.NPC.spawnT = 999; RA.NPC.scanT = 999;
RA.render();
//--- shot t_lineup
