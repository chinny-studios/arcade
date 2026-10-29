// Player systems: broadside, chain shot, boarding, repair, squall. Bots are frozen with SS.peace().
SS.peace(); SS.god(true);
const p = SS.G.player; SS.tp(0, -600, 0);
const e = SS.enemy(0); SS.place(e, 330, Math.PI / 2, 0);  // galleon to starboard, same heading
const hp0 = e.hp;
SS.aimAt(e); const n = SS.fire(); SS.sim(0.9); SS.render(); await wait(200); SS.render();
window.__r = { fired: n, hp0 };
return ['broadside batteries fired: ' + n];
//--- shot broadside
SS.sim(4); const e = SS.enemy(0);
const res = ['hull after broadside: ' + Math.round(e.hp) + ' / ' + __r.hp0 + ' fires=' + e.fires.map((f) => f > 0 ? 1 : 0)];
SS.weapon(1); SS.G.player.rl.star = 0; SS.aimAt(e); SS.fire(); SS.sim(5);
res.push('sails after chain: ' + e.sails.toFixed(2) + ' player ammo=' + SS.G.player.ammo);
SS.sim(1); SS.render(); await wait(100); SS.render();
return res;
//--- shot smoke
const p = SS.G.player, e = SS.enemy(1);
e.hp = e.maxHp * 0.3; SS.place(e, 13, Math.PI / 2, p.h); e.x = p.wx(-(p.C.beam + e.C.beam) / 2 - 3, 0); e.z = p.wz(-(p.C.beam + e.C.beam) / 2 - 3, 0);
const can = p.canBoard(e), why = p.boardReason(e), ok = p.startBoard(e);
SS.sim(2); SS.render(); await wait(100); SS.render();
window.__e = e;
return ['canBoard=' + can + ' reason=' + why + ' started=' + ok + ' crew ' + Math.round(p.crew) + ' vs ' + Math.round(e.crew)];
//--- shot boarding
SS.sim(25); const p = SS.G.player, e = __e;
const res = ['after boarding: enemy team=' + e.team + ' crew=' + Math.round(e.crew) + ' mine=' + Math.round(p.crew) + ' captures=' + p.stats.captures];
p.startFire(1, null); p.startLeak(0, null); const r = p.useRepair(); res.push('repair used=' + r + ' fires=' + p.fires + ' leaks=' + p.leaks.map((l) => l > 0 ? 1 : 0));
SS.squall(true); SS.sim(3); SS.look(SS.G.player.h + 0.6, 500); SS.render(); await wait(300); SS.render();
res.push('squall ' + SS.state().squall + ' log: ' + SS.match.log.map((l) => l.text).join(' | '));
return res;
//--- shot squall
