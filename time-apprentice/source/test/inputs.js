// Touch stick moves the player, a right-side drag turns the view, a quick tap talks; pause opens and closes.
await TA.go('giza', 1); TA.sim(0.3);
while (TA.HUD.dlg) { await TA.skip(); }
const r = {}, c = document.getElementById('c');
const mk = (id, x, y) => new Touch({ identifier: id, target: c, clientX: x, clientY: y });
const x0 = P.x, z0 = P.z;
c.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(1, 200, 500)], changedTouches: [mk(1, 200, 500)], bubbles: true, cancelable: true }));
c.dispatchEvent(new TouchEvent('touchmove', { touches: [mk(1, 200, 430)], changedTouches: [mk(1, 200, 430)], bubbles: true, cancelable: true }));
TA.sim(1.5);
c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(1, 200, 430)], bubbles: true, cancelable: true }));
r.moved = +Math.hypot(P.x - x0, P.z - z0).toFixed(1);
r.touchClass = document.body.classList.contains('touch');
const yaw0 = P.yaw;
c.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(2, 1000, 400)], changedTouches: [mk(2, 1000, 400)], bubbles: true, cancelable: true }));
c.dispatchEvent(new TouchEvent('touchmove', { touches: [mk(2, 1100, 400)], changedTouches: [mk(2, 1100, 400)], bubbles: true, cancelable: true }));
TA.sim(1 / 30);
c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(2, 1100, 400)], bubbles: true, cancelable: true }));
r.turned = +(P.yaw - yaw0).toFixed(2);
// walk up to Ankhhaf and tap to talk
const a = TA.Stage.actors.ankhhaf; TA.tp(a.x + 1.6, a.z + 1.6); TA.lookAt(a.x, a.headY - 0.3, a.z); TA.sim(0.2);
c.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(3, 1000, 300)], changedTouches: [mk(3, 1000, 300)], bubbles: true, cancelable: true }));
c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(3, 1000, 300)], bubbles: true, cancelable: true }));
TA.sim(0.5); await new Promise((ok) => setTimeout(ok, 10)); TA.sim(0.1);
r.tapTalk = TA.HUD.open;
await TA.skip();
// keyboard: E on a target, then the journal and pause
TA.HUD.openPause(); r.pause = TA.HUD.open; TA.HUD.close(false); r.after = TA.HUD.open;
TA.HUD.openJournal(); r.journal = TA.HUD.open; TA.HUD.close(false);
if (r.moved < 1 || Math.abs(r.turned) < 0.1 || r.tapTalk !== 'dlg' || r.pause !== 'pause') throw new Error(JSON.stringify(r));
return r;
//--- shot t_touch
