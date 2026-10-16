// Core loop: hub, descend, fight, loot, rooms, return. node test/smoke.mjs --steps test/play.js

out.hub = VB.stats();
F.buildFloor('forest', 0, 0, 'seed1'); VB.god(true);
out.floor = VB.stats();
out.rooms = VB.LV.rooms.map((r) => r.type).join(',');
VB.sim(1);
//--- shot play_start
// walk into the nearest pack room and fight
const pack = VB.LV.rooms.findIndex((r) => r.type === 'pack' || r.type === 'lock');
VB.toRoom(pack);
for (let k = 0; k < 40; k++) { const e = VB.ENTS.find((q) => q.team === 1 && !q.dead && !q.box); if (!e) break; VB.PL.aimPt = { x: e.x, z: e.z }; VB.Input.acts.add('atkN'); VB.sim(0.5); }
out.afterFight = VB.stats();
out.groundItems = F.GROUND.length;
//--- shot play_fight
VB.killAll(); VB.sim(2);
out.cleared = VB.LV.rooms.filter((r) => r.cleared).length;
out.xp = VB.GAME.char.xp; out.level = VB.GAME.char.level;
return out;
