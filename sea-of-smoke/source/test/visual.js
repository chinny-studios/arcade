// Screenshots: a fort in action, a fog bank, the spyglass.
SS.peace(); SS.god(true);
const M = SS.match, cap = M.caps[1], f = cap.fort; cap.owner = 0; f.owner = f.team = 0; f.w.flag.material.map = null;
const p = SS.G.player; SS.tp(f.x - 250, f.z - 330, 0.6);
const e = SS.enemy(2); e.x = f.x + 120; e.z = f.z - 380; e.h = 1.2; e.tele = 3;
SS.sim(14); SS.look(Math.atan2(f.x + 60 - p.x, f.z - 200 - p.z), 380); SS.render(); await wait(300); SS.render();
return ['enemy ' + e.name + ' hp ' + Math.round(e.hp) + '/' + e.maxHp + ' seen by 0: ' + e.seen[0] + ' balls ' + SS.combat.balls.length];
//--- shot fort
const b = SS.match.fog[0]; SS.tp(b.x, b.z - b.r - 200, 0); SS.look(0, 400); SS.sim(0.5); SS.render(); await wait(300); SS.render();
return ['fog at ' + Math.round(b.x) + ',' + Math.round(b.z)];
//--- shot fogbank
SS.tp(0, -900, 0); SS.look(0, 700); SS.input.press('M2'); for (let i = 0; i < 12; i++) { SS.pc.update(0.05); SS.render(); }
await wait(200); return ['spyK ' + SS.pc.spyK.toFixed(2)];
//--- shot spyglass
SS.input.release('M2');
