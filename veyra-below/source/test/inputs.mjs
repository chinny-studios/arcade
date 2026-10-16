// Gamepad (mocked standard pad) and touch (pointer events) checks. node test/inputs.mjs
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => {
  const b = () => ({ pressed: false, value: 0 });
  window.__pad = { id: 'mock', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, b), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [window.__pad];
});
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.VB);
const r = await page.evaluate(async () => {
  const out = {}, pad = window.__pad;
  const btn = (i, on) => { pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
  const tap = (i) => { btn(i, true); VB.sim(1 / 30); btn(i, false); VB.sim(1 / 30); };
  await VB.start({ role: 'marksman', level: 5 });
  document.querySelectorAll('.dlg').forEach((d) => d.click());
  VB.f.buildFloor('forest', 0, 0, 'pad'); VB.god(true);
  // move with the left stick
  const p0 = { x: VB.PL.x, z: VB.PL.z };
  pad.axes[0] = 1; VB.sim(1); pad.axes[0] = 0; VB.sim(0.1);
  out.padMode = VB.Input.mode; out.padMoved = +Math.hypot(VB.PL.x - p0.x, VB.PL.z - p0.z).toFixed(2);
  // attack with X at an enemy in front
  const e = VB.spawn('mossling', Math.sin(VB.PL.yaw) * 3, Math.cos(VB.PL.yaw) * 3); e.sleep = false;
  const hp0 = e.hp; for (let k = 0; k < 8; k++) tap(2); VB.sim(0.5);
  out.padHit = e.hp < hp0 || e.dead;
  // roll with RB, overdrive with LB does nothing without a sprite form
  tap(5); out.padRoll = !!(VB.PL.act && VB.PL.act.type === 'dodge') || VB.PL.cd.dodge > 0;
  // Start opens the menu, D-pad moves focus, LB/RB switch tabs, B closes
  tap(9); out.menu = VB.UI.cur && VB.UI.cur.id;
  tap(13); tap(13); out.focus = !!document.querySelector('.focus');
  const tab0 = document.querySelector('.tab.on').textContent; tap(5); out.tabChanged = document.querySelector('.tab.on').textContent !== tab0;
  tap(1); out.menuClosed = !VB.UI.cur;
  return out;
});
// touch: drag the stick and tap the attack button
await page.evaluate(() => { VB.PL.x = VB.LV.start.x; VB.PL.z = VB.LV.start.z; window.__p0 = { x: VB.PL.x, z: VB.PL.z }; });
const stick = await page.$('#tStick');
await page.dispatchEvent('#tStick', 'pointerdown', { pointerId: 7, clientX: 120, clientY: 560, isPrimary: true, pointerType: 'touch' });
await page.dispatchEvent('#tStick', 'pointermove', { pointerId: 7, clientX: 120, clientY: 480, isPrimary: true, pointerType: 'touch' });
r.touchMode = await page.evaluate(() => VB.Input.mode);
await page.evaluate(() => VB.sim(1));
await page.dispatchEvent('#tStick', 'pointerup', { pointerId: 7, clientX: 120, clientY: 480, pointerType: 'touch' });
r.touchMoved = await page.evaluate(() => +Math.hypot(VB.PL.x - __p0.x, VB.PL.z - __p0.z).toFixed(2));
r.touchUI = await page.evaluate(() => getComputedStyle(document.querySelector('#touch')).display);
await page.dispatchEvent('#tAtk', 'pointerdown', { pointerId: 8, pointerType: 'touch' });
r.touchAttack = await page.evaluate(() => { VB.sim(0.1); return !!(VB.PL.act && VB.PL.act.type === 'attack'); });
await page.dispatchEvent('#tAtk', 'pointerup', { pointerId: 8, pointerType: 'touch' });
console.log(JSON.stringify(r, null, 1));
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK, no errors');
