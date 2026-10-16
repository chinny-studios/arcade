document.querySelector('#banner').style.visibility = 'hidden';
RA.time(10); RA.go('metella'); RA.sim(0.3);
RA.NPC.agents.length = 0; RA.NPC.spawnT = 999; RA.NPC.spotT = 999; RA.NPC.scanT = 999;
for (const k of ['cart', 'raeda', 'rider', 'litter', 'pack']) RA.NPC.spawnVehicle(k, true);
const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
let i = 0;
for (const a of RA.NPC.agents) if (!a.lead) { a.v = 0; a.spd = 0.0; a.x = P.x + fx * 11 + rx * (i * 4.5 - 9); a.z = P.z + fz * 11 + rz * (i * 4.5 - 9); a.y = RA.f.groundAt(a.x, a.z); a.yaw = P.yaw + Math.PI / 2; a.tx = a.x; a.tz = a.z; a.yv = a.y; i++; }
for (const a of RA.NPC.agents) if (a.lead) { RA.NPC.placeFollower(a, true); a.y = RA.f.groundAt(a.x, a.z); a.yv = a.y; }
RA.render();
//--- shot t_vehicles
RA.time(13); const c = RA.W.circus.F; RA.go('circus'); RA.sim(1); const ch = RA.NPC.race[2]; const [x, z, yaw] = RA.NPC.racePos(ch);
RA.cam(x + Math.sin(yaw) * 14 + Math.cos(yaw) * 6, RA.f.groundAt(x, z) + 3, z + Math.cos(yaw) * 14 - Math.sin(yaw) * 6, x, RA.f.groundAt(x, z) + 1, z); RA.render();
//--- shot t_chariot
