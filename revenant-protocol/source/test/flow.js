const $ = (s) => document.querySelector(s); const r = [];
$('#bNew').click(); r.push(['diff menu', !$('#diffMenu').hidden]);
$('#diffs button:nth-child(2)').click(); r.push(['brief', RP.G.state, $('#briefName').textContent]);
$('#bLaunch').click(); r.push(['play', RP.G.state, RP.P.cur, RP.P.shield]);
RP.sim(0.5);
// die: lives 3 -> continue
RP.P.health = 1; RP.P.shield = 0; RP.f; 
r.push(['hurt']); 
RP.sim(0.1);
return r;
//--- shot flow_play
const $ = (s) => document.querySelector(s); const r = [];
RP.P.health = 0.5; RP.P.shield = 0;
RP.ENEMIES.forEach(e => { if (!e.dead) { e.alert = true; } });
// kill the player directly
RP.P.dead = true; RP.P.deadT = 0; RP.sim(2);
r.push(['dead', RP.G.state, $('#deadText').textContent]);
return r;
//--- shot flow_dead
const $ = (s) => document.querySelector(s); const r = [];
$('#bRespawn').click(); r.push(['respawn', RP.G.state, RP.P.lives, RP.P.health, [RP.P.x, RP.P.z]]);
RP.complete(); r.push(['done', RP.G.state, $('#doneStats').textContent]);
return r;
//--- shot flow_done
const $ = (s) => document.querySelector(s); const r = [];
$('#bNext').click(); r.push(['next', RP.G.state, RP.G.mission, $('#briefName').textContent]);
$('#bLaunch').click(); r.push(['pda']); RP.press('KeyP');
document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' }));
r.push(['pdaState', RP.G.state]);
return r;
//--- shot flow_pda
const $ = (s) => document.querySelector(s); const r = [];
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyP' }));
r.push(['back', RP.G.state]);
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' })); RP.sim(0.1);
r.push(['map', RP.G.mapOn]);
return r;
//--- shot flow_map

