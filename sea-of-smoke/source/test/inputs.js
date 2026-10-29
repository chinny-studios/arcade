// Real DOM key and mouse events through the live frame loop: sails, helm, ammo, fire, pause.
const key = (code, type) => window.dispatchEvent(new KeyboardEvent(type || 'keydown', { code, bubbles: true }));
const tap = async (code) => { key(code); await wait(450); key(code, 'keyup'); await wait(450); };
SS.peace();
const p = SS.G.player, h0 = p.h;
for (let i = 0; i < 4; i++) await tap('KeyW');
const tele = p.tele;
key('KeyD'); await wait(3000); key('KeyD', 'keyup');
await tap('Digit2'); const ammo = p.ammo;
window.dispatchEvent(new MouseEvent('mousedown', { button: 0 })); await wait(600); window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
const shots = p.stats.shots;
await tap('Escape'); const paused = SS.G.paused + '/' + SS.ui.screen;
await tap('Escape'); const resumed = SS.G.paused + '/' + SS.ui.screen;
await tap('KeyM'); const big = SS.hud.mapBig;
return [`tele=${tele} turned=${(p.h - h0).toFixed(3)} rudder=${p.rudder.toFixed(2)} ammo=${ammo} shots=${shots} paused=${paused} resumed=${resumed} chart=${big}`];
//--- shot chart
