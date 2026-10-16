// audio graph builds without errors; touch stick moves the player; the menu opens and closes
const r = {};
RA.go('forum'); RA.sim(0.5);
RA.f.AU = window.RA.AU; window.RA.AU && 0;
try { RA.audio(); r.audio = 'ok'; } catch (e) { r.audio = String(e); }
for (let i = 0; i < 30; i++) RA.sim(1 / 30);
// touch: a thumb on the left half pushed up = walk forward
const c = document.getElementById('c');
const mk = (id, x, y) => new Touch({ identifier: id, target: c, clientX: x, clientY: y });
const x0 = P.x, z0 = P.z;
c.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(1, 200, 500)], changedTouches: [mk(1, 200, 500)], bubbles: true, cancelable: true }));
c.dispatchEvent(new TouchEvent('touchmove', { touches: [mk(1, 200, 420)], changedTouches: [mk(1, 200, 420)], bubbles: true, cancelable: true }));
for (let i = 0; i < 60; i++) { RA.sim(1 / 30); }
c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(1, 200, 420)], bubbles: true, cancelable: true }));
r.touchMoved = Math.hypot(P.x - x0, P.z - z0).toFixed(1);
r.touchClass = document.body.classList.contains('touch');
// look drag on the right
const yaw0 = P.yaw;
c.dispatchEvent(new TouchEvent('touchstart', { touches: [mk(2, 1000, 400)], changedTouches: [mk(2, 1000, 400)], bubbles: true, cancelable: true }));
c.dispatchEvent(new TouchEvent('touchmove', { touches: [mk(2, 1100, 400)], changedTouches: [mk(2, 1100, 400)], bubbles: true, cancelable: true }));
RA.sim(1 / 30);
c.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [mk(2, 1100, 400)], bubbles: true, cancelable: true }));
r.touchLook = (P.yaw - yaw0).toFixed(2);
RA.HUD.openPause(); r.pause = RA.HUD.open; RA.HUD.close(); r.after = RA.HUD.open;
return r;
//--- shot t_touch
