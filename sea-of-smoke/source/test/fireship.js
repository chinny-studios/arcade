// Fireship: fire rafts at a parked galleon, smoke screen, then set alight and ram.
SS.peace(); SS.god(true);
const p = SS.G.player; SS.tp(350, -1200, -Math.PI / 2);
const e = SS.G.ships.find((s) => s.team === 1 && s.cls === 'galleon'); SS.place(e, 420, 0.05, 0);
window.__t = e; const hp0 = e.hp;
SS.weapon(3); SS.aim(Math.atan2(e.x - p.x, e.z - p.z), 420); const r = SS.fire(); SS.sim(6); SS.render(); await wait(200); SS.render();
return ['rafts launched=' + r + ' in water=' + SS.combat.rafts.length + ' target hp ' + Math.round(e.hp) + '/' + hp0];
//--- shot rafts
SS.sim(30); const e = __t, p = SS.G.player;
const res = ['after rafts: target hp ' + Math.round(e.hp) + ' fires=' + e.fires.map((f) => f > 0 ? 1 : 0) + ' rafts left=' + SS.combat.rafts.length];
const sm = p.useSpecial(); SS.helm(4, 0.3); SS.sim(8);
res.push('smoke=' + sm + ' clouds=' + SS.combat.clouds.length + ' enemy sees me=' + p.seen[1]);
SS.render(); await wait(200); SS.render();
return res;
//--- shot smokescreen
const p = SS.G.player, e = __t; const ig = p.ignite(); SS.tp(e.x + 70, e.z, -Math.PI / 2); SS.helm(4, 0); const hp0 = e.hp;
SS.sim(6);
return ['ignite=' + ig + ' fireship alive=' + p.alive + ' target hp ' + Math.round(hp0) + ' -> ' + Math.round(e.hp) + ' fires=' + e.fires.map((f) => f > 0 ? 1 : 0), SS.match.log.map((l) => l.text).join(' | ')];
