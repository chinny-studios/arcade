// drive the real pointer handlers: scrub the crystal with the solvent
PA.view(0, 0.08, 0.13, [0, 0.042, 0]);
const c = document.querySelector('#c');
const ev = (type, x, y, b = 0) => c.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button: b, buttons: 1, pointerId: 1, bubbles: true, isPrimary: true }));
const before = PA.progress().find((g) => g[0] === 'Crystal')[1];
ev('pointermove', 600, 300); ev('pointerdown', 600, 300);
for (let i = 0; i < 90; i++) { const a = i * 0.35; ev('pointermove', 640 + Math.cos(a) * 90, 360 + Math.sin(a * 1.3) * 90); PA.sim(1 / 30); }
ev('pointerup', 640, 360);
// wrong tool: polish over rust on a hand would say so; wire brush on brass should warn
PA.sim(0.3);
const after = PA.progress().find((g) => g[0] === 'Crystal')[1];
// orbit by dragging the background
const y0 = PA.CAM.tYaw; ev('pointerdown', 150, 650); for (let i = 0; i < 10; i++) { ev('pointermove', 150 + i * 20, 650); } ev('pointerup', 350, 650);
return { before, after, yaw: +(PA.CAM.tYaw - y0).toFixed(2), toast: document.querySelector('#toast').textContent };
//--- shot scrub
PA.lamp(true); PA.sim(0.2);
//--- shot scrublamp
