RP.god(); RP.peace();
RP.tp(21, 24, -Math.PI / 2 - 0.2); RP.look(-Math.PI / 2 - 0.2, -0.15); RP.sim(0.3);
//--- shot m3_forge
RP.tp(35, 26, -Math.PI / 2); RP.sim(2);
//--- shot m3_island
RP.tp(23, 6, -Math.PI / 2); RP.sim(0.3);
//--- shot m3_ice
RP.tp(30, 47, 0.2); RP.look(-0.6, 0.05); RP.sim(0.3);
//--- shot m3_cradle
// pumps: plant all three, then the exit
const pumps = RP.USABLES.filter(u => u.t === 'pump');
for (const p of pumps) { p.use(); RP.sim(5); }
out.pumps = RP.G.obj.map(o => o.text + (o.done ? ' OK' : ''));
// ride the platform: stand on the island edge at the platform's start
RP.tp(36, 25, -Math.PI / 2);
const pl = RP.LV.plats[0]; let ok = false;
for (let i = 0; i < 300; i++) { RP.hold('KeyW', true); RP.sim(1 / 30); if (RP.P.x > 41 * 2) { ok = true; break; } }
RP.hold('KeyW', false);
out.plat = { ok, x: RP.P.x / 2, y: RP.P.y, dead: RP.P.dead };
return out;
