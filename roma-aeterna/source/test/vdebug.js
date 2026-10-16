RA.time(10); RA.go('metella'); RA.sim(0.3);
RA.NPC.agents.length = 0; RA.NPC.spawnT = 999; RA.NPC.spotT = 999; RA.NPC.scanT = 999;
const before = RA.NPC.roadsNear.length;
for (const k of ['cart', 'raeda', 'rider', 'litter', 'pack']) RA.NPC.spawnVehicle(k, true);
return { before, n: RA.NPC.agents.length, types: RA.NPC.agents.map((a) => a.type + ':' + Math.round(Math.hypot(a.x - P.x, a.z - P.z))) };
