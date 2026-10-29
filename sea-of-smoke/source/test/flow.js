// Player sinks -> spectating -> "Skip to the end" fast-forwards the battle -> results screen.
const p = SS.G.player, e = SS.enemy(0);
p.damage(p.hp + 1, e, 'hull');
const dead = !document.getElementById('dead').hidden;
await SS.ui.skip(); SS.ui.update();
return [`dead panel=${dead} phase=${SS.state().phase} screen=${SS.ui.screen} result=${JSON.stringify(SS.state().result)} title=${document.getElementById('restitle').textContent}`];
//--- shot flow
