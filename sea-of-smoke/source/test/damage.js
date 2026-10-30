// Visible damage: shot holes, blackened listing hull, masts falling to chain shot, crits, damage smoke.
SS.manual(true); SS.peace(); SS.god(true);
const p = SS.G.player; SS.tp(-300, -1150, Math.PI / 2);
const e = SS.G.ships.find((s) => s.team === 1 && s.cls === 'galleon'); SS.place(e, 260, -Math.PI / 2, Math.PI / 2 + 0.25);
window.__e = e;
for (let i = 0; i < 6; i++) { SS.broadside(p, e); SS.run(2.5); }
const r1 = `after 6 round-shot broadsides: hull ${Math.round(e.hpf * 100)}% holes=${e.model.holes.count} shade=${e.shade.toFixed(2)} roll=${e.roll.toFixed(3)} y=${e.y.toFixed(2)} crit=${JSON.stringify(e.crit)}`;
SS.weapon(1); e.hp = e.maxHp * 0.6; e.tele = 2;
for (let i = 0; i < 8; i++) { SS.broadside(p, e); SS.run(2.5); }
const down = e.model.masts.filter((m) => m.fallen).length;
SS.run(2);
SS.look(Math.atan2(e.x - p.x, e.z - p.z) + 0.05, Math.hypot(e.x - p.x, e.z - p.z), 0.55); SS.render();
return [r1, `after chain: sails ${Math.round(e.sails * 100)}% masts down ${down}/${e.model.masts.length} cap ${e.sailCap().toFixed(2)} hull ${Math.round(e.hpf * 100)}%`];
//--- shot damage
const e = __e; SS.pc.spyK = 1; SS.look(SS.pc.yaw, SS.pc.aimDist); SS.render();
return ['spyglass on the wreck'];
//--- shot damage_spy
