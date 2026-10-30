// real DOM keyboard and mouse events, then a mocked gamepad
const key = (code, type) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
const r = {};
CF.tp(-20, 0); CF.face(Math.PI / 2);
const x0 = CF.P.x;
key('KeyW', 'keydown'); CF.sim(1); key('KeyW', 'keyup'); CF.sim(0.3);
r.walked = +(CF.P.x - x0).toFixed(1);
key('ShiftLeft', 'keydown'); key('KeyW', 'keydown'); CF.sim(1); key('KeyW', 'keyup'); key('ShiftLeft', 'keyup');
r.ran = +(CF.P.x - x0 - r.walked).toFixed(1);
key('Space', 'keydown'); CF.sim(0.15); r.jumpY = +CF.P.y.toFixed(2); key('Space', 'keyup'); CF.sim(1);
key('KeyQ', 'keydown'); CF.sim(0.1); key('KeyQ', 'keyup'); r.batQ = CF.P.form; key('KeyQ', 'keydown'); CF.sim(0.1); key('KeyQ', 'keyup'); r.backQ = CF.P.form;
CF.sim(1);
const v = CF.spawn('greaser', CF.P.x + fwdXs(), CF.P.z); function fwdXs() { return 1.6; }
CF.aimAt(v);
document.querySelector('#c').dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); CF.sim(0.05);
window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
r.clickAct = CF.P.act; CF.sim(1.5); r.victim = v.state;
// a gamepad: left stick forward
const pad = { connected: true, index: 0, axes: [0, -1, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
navigator.getGamepads = () => [pad];
const z0 = CF.P.z, xx0 = CF.P.x; CF.sim(1);
r.padMode = CF.Input.mode; r.padMoved = +Math.hypot(CF.P.x - xx0, CF.P.z - z0).toFixed(1);
pad.axes[1] = 0; pad.buttons[5] = { pressed: true, value: 1 }; CF.sim(0.1); pad.buttons[5] = { pressed: false, value: 0 }; CF.sim(0.1);
r.padRB = CF.P.form;
return r;
