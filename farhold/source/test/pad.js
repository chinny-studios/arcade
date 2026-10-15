// Gamepad: a fake standard pad drives movement, menus and the jetpack
FH.mute(); FH.sim(0.3);
const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false })) };
navigator.getGamepads = () => [pad];
const btn = (i, v) => { pad.buttons[i].value = v; pad.buttons[i].pressed = v > 0.5; };
const p0 = P.pos.clone();
pad.axes[1] = -1; FH.sim(1); pad.axes[1] = 0; FH.sim(0.1);
const walked = P.pos.distanceTo(p0);
pad.axes[2] = 1; FH.sim(0.5); pad.axes[2] = 0;
btn(8, 1); FH.sim(1 / 30); btn(8, 0); FH.sim(1 / 30);
const ui1 = FH.UI.cur;
btn(5, 1); FH.sim(1 / 30); btn(5, 0); FH.sim(1 / 30);
const tab = FH.UI.tab;
btn(15, 1); FH.sim(1 / 30); btn(15, 0); FH.sim(1 / 30);
const focus = document.querySelector('.focus') && document.querySelector('.focus').textContent.slice(0, 20);
btn(1, 1); FH.sim(1 / 30); btn(1, 0); FH.sim(1 / 30);
const ui2 = FH.UI.cur;
btn(0, 1); FH.sim(1); const air = !P.onGround; btn(0, 0); FH.sim(1);
return { walked: walked.toFixed(1), ui1, tab, focus, ui2, air, padActive: FH.Input.gp.active };
