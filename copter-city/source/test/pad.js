// a mocked standard gamepad: right trigger climbs, left stick forward flies, A uses gear, Y gets out
const pad = { connected: true, index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
navigator.getGamepads = () => [pad];
const set = (i, on) => { pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
const H = CC.HELI, r = {};
set(7, true); for (let i = 0; i < 120; i++) CC.f.MUSIC && CC.sim(1 / 30); set(7, false);
r.climb = { y: +H.y.toFixed(1), mode: CC.Input.mode };
pad.axes[1] = -1; CC.sim(3); pad.axes[1] = 0;
r.fwd = { v: +Math.hypot(H.vx, H.vz).toFixed(1) };
set(2, true); CC.sim(1 / 30); set(2, false); CC.sim(1 / 30); r.gear = H.equip;
set(13, true); CC.sim(1 / 30); set(13, false); CC.sim(1 / 30);
CC.tp(H.x, H.z, 0); set(3, true); CC.sim(1 / 30); set(3, false); CC.sim(0.2); r.where = CC.G.where;
set(9, true); CC.sim(1 / 30); set(9, false); CC.sim(1 / 30); r.pause = CC.UI.top();
set(13, true); CC.sim(1 / 30); set(13, false); set(0, true); CC.sim(1 / 30); set(0, false); CC.sim(1 / 30); r.afterNav = CC.UI.top();
return r;
