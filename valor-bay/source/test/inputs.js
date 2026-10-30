// real DOM keyboard and mouse events through the live loop, then a mocked gamepad
const r = {};
VB.tp(2, 150); VB.face(0, 0.1);
const z0 = VB.P.z;
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
key('KeyW', true); key('ShiftLeft', true);
await wait(4000);
r.kbm = { moved: +(z0 - VB.P.z).toFixed(1), mode: VB.P.mode, y: +VB.P.y.toFixed(1) };
key('KeyW', false); key('ShiftLeft', false);
const c = document.querySelector('#c');
c.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); await wait(300); window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
r.attacked = VB.P.comboN > 0 || !!VB.P.act;
// a fake standard gamepad: left stick forward and RT (travel) held
const btn = (p) => ({ pressed: p, value: p ? 1 : 0 });
const pad = { index: 0, connected: true, mapping: 'standard', axes: [0, -1, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => btn(i === 7)) };
navigator.getGamepads = () => [pad];
VB.hero('blitz'); VB.tp(2, 150); VB.face(0, 0.1);
const z1 = VB.P.z;
await wait(3000);
r.pad = { mode: VB.Input.mode, moved: +(z1 - VB.P.z).toFixed(1), speedOn: VB.P.speedOn };
return r;
