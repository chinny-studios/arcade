// Gamepad (mocked navigator.getGamepads) and touch (pointer events) checks:
// pad: RT drives, X toggles lights, Y gets out, A uses a prompt, D-pad moves menu focus and A clicks.
// touch: GAS and steer buttons drive, IN/OUT gets out, the stick walks, USE uses a prompt.
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const check = (name, ok, info) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) errors.push('check failed: ' + name); };
async function open(hasTouch) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    // a fake standard gamepad driven from window.__pad
    window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, index: 0, mapping: 'standard', id: 'mock' };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__pad], configurable: true, writable: true });
  });
  await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
  await page.waitForFunction(() => window.RR, null, { timeout: 60000 });
  return page;
}
const waitFor = async (page, fn, ms = 20000) => { try { await page.waitForFunction(fn, null, { timeout: ms, polling: 100 }); return true; } catch { return false; } };
const btn = (page, i, on, v) => page.evaluate(([i, on, v]) => { const b = window.__pad.buttons[i]; b.pressed = on; b.value = v !== undefined ? v : on ? 1 : 0; }, [i, on, v]);
// hold a button until the game has seen it (a frame can take longer than a quick press), then release
const frames = (page, n = 2) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const tap = async (page, i) => { await btn(page, i, true); await frames(page, 2); await btn(page, i, false); await frames(page, 2); };
// ---------- gamepad ----------
{
  const page = await open(false);
  await tap(page, 13);
  check('D-pad focuses a title button', await waitFor(page, () => !!document.querySelector('#titleMenu .focus')));
  // move focus to "Quick shift" and press A
  for (let k = 0; k < 4; k++) { const t = await page.evaluate(() => (document.querySelector('#titleMenu .focus') || {}).textContent || ''); if (t.startsWith('Quick')) break; await tap(page, 13); }
  await tap(page, 0);
  check('A on Quick shift starts play', await waitFor(page, () => document.body.dataset.state === 'play'));
  await page.evaluate(() => { RR.G.live = false; RR.f.dispatchCall({ type: 'asthma' }); RR.f.respond(); RR.RIG.siren = false; });
  check('input mode is pad', await page.evaluate(() => RR.Input.mode === 'pad'));
  await btn(page, 7, true, 1);
  check('RT drives', await waitFor(page, () => RR.RIG.v > 1.5, 30000), await page.evaluate(() => RR.RIG.v));
  await btn(page, 7, false, 0);
  await tap(page, 2);
  check('X toggles lights', await waitFor(page, () => RR.RIG.siren));
  await page.evaluate(() => { RR.toScene(); RR.RIG.v = 0; });
  await tap(page, 3);
  check('Y gets out', await waitFor(page, () => RR.G.where === 'foot'));
  await page.evaluate(() => { const A = RR.RIG, fx = Math.sin(A.yaw), fz = Math.cos(A.yaw); RR.PLAYER.x = A.x - fx * (A.len / 2 + 1.4); RR.PLAYER.z = A.z - fz * (A.len / 2 + 1.4); });
  await waitFor(page, () => RR.HUD.prompts.length > 0 && RR.HUD.prompts[0].label.startsWith('Rear'));
  await tap(page, 0);
  check('A uses the rear-door prompt', await waitFor(page, () => RR.UI.isOpen('rear')));
  await tap(page, 13);
  check('D-pad focuses inside the rear panel', await waitFor(page, () => !!document.querySelector('#rear .focus')));
  await tap(page, 1);
  check('B closes the panel', await waitFor(page, () => !RR.UI.isOpen('rear')));
  await page.evaluate(() => { RR.Input.setMode('pad'); });
  await page.evaluate(() => { window.__pad.axes[1] = -1; });
  const z0 = await page.evaluate(() => RR.PLAYER.x + RR.PLAYER.z);
  check('left stick walks', await waitFor(page, `Math.abs(RR.PLAYER.x + RR.PLAYER.z - ${z0}) > 0.5`));
  await page.evaluate(() => { window.__pad.axes[1] = 0; });
  await page.close();
}
// ---------- touch ----------
{
  const page = await open(true);
  await page.evaluate(() => { Object.defineProperty(navigator, 'getGamepads', { value: () => [], configurable: true }); });
  await page.locator('#titleMenu button', { hasText: 'Quick shift' }).tap();
  check('tap starts a quick shift', await waitFor(page, () => document.body.dataset.state === 'play'));
  await page.evaluate(() => { RR.G.live = false; RR.f.dispatchCall({ type: 'asthma' }); RR.f.respond(); });
  const pd = (sel, type) => page.evaluate(([sel, type]) => { const e = document.querySelector(sel), r = e.getBoundingClientRect(); e.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); }, [sel, type]);
  await pd('#tGas', 'pointerdown');
  check('touch mode', await waitFor(page, () => document.body.dataset.input === 'touch'));
  check('GAS drives', await waitFor(page, () => RR.RIG.v > 1.5, 30000), await page.evaluate(() => RR.RIG.v));
  await pd('[data-t="left"]', 'pointerdown');
  const y0 = await page.evaluate(() => RR.RIG.yaw);
  check('steer button turns', await waitFor(page, `Math.abs(RR.RIG.yaw - ${y0}) > 0.05`));
  await pd('[data-t="left"]', 'pointerup'); await pd('#tGas', 'pointerup');
  await page.evaluate(() => { RR.toScene(); RR.RIG.v = 0; });
  await pd('[data-tap="exit"]', 'pointerdown');
  check('IN/OUT gets out', await waitFor(page, () => RR.G.where === 'foot'));
  // the stick: drag up from the left side
  await page.evaluate(() => { const z = document.querySelector('#tStick'); const r = z.getBoundingClientRect(); const x = r.left + 120, y = r.bottom - 120; z.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, pointerType: 'touch', clientX: x, clientY: y })); z.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 9, pointerType: 'touch', clientX: x, clientY: y - 60 })); });
  const p0 = await page.evaluate(() => RR.PLAYER.x + RR.PLAYER.z);
  check('stick walks', await waitFor(page, `Math.abs(RR.PLAYER.x + RR.PLAYER.z - ${p0}) > 0.5`));
  await page.evaluate(() => { const z = document.querySelector('#tStick'); z.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9, pointerType: 'touch' })); });
  await page.evaluate(() => { const A = RR.RIG, fx = Math.sin(A.yaw), fz = Math.cos(A.yaw); RR.PLAYER.x = A.x - fx * (A.len / 2 + 1.4); RR.PLAYER.z = A.z - fz * (A.len / 2 + 1.4); });
  await waitFor(page, () => RR.HUD.prompts.length > 0 && RR.HUD.prompts[0].label.startsWith('Rear'));
  await pd('[data-tap="use"]', 'pointerdown');
  check('USE uses the prompt', await waitFor(page, () => RR.UI.isOpen('rear')));
  await page.screenshot({ path: path.join(here, 'out', 'touch.png') });
  await page.close();
}
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('OK, no errors');
