// Real input: click through the title menu, walk with real key presses, open the map and notebook, go through
// Milton Mansion's door, and check touch controls in a phone-sized page.
//   node test/live.mjs
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const page_url = 'file://' + path.resolve(here, '../../index.html') + '#debug';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fails = [], errors = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'ok   ' : 'FAIL ') + m); };
async function open(opts) {
  const page = await browser.newPage(opts);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(page_url);
  await page.waitForFunction(() => window.NR && window.NR.ready, null, { timeout: 240000 });
  await page.evaluate(() => localStorage.clear());
  return page;
}
// ---- desktop
let page = await open({ viewport: { width: 1280, height: 720 } });
await page.click('#bStart');
await page.waitForTimeout(500);
ok(await page.evaluate(() => document.body.dataset.state === 'play'), 'title Start begins the walk');
const p0 = await page.evaluate(() => window.NR.state());
await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
const p1 = await page.evaluate(() => window.NR.state());
// SwiftShader can drop to a few fps here, and a frame's step is capped at 0.05 s, so any real movement counts
ok(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.4, `W walks (${(Math.hypot(p1.x - p0.x, p1.z - p0.z)).toFixed(1)} m)`);
// headless Chromium sometimes drops pointer lock, which (rightly) opens the pause menu: resume first
if (await page.evaluate(() => !document.querySelector('#pause').hidden)) await page.click('#pResume');
await page.keyboard.press('KeyM'); await page.waitForTimeout(300);
ok(await page.evaluate(() => !document.querySelector('#map').hidden), 'M opens the map');
await page.keyboard.press('KeyM'); await page.waitForTimeout(200);
ok(await page.evaluate(() => document.querySelector('#map').hidden), 'M closes the map');
await page.keyboard.press('KeyJ'); await page.waitForTimeout(300);
ok(await page.evaluate(() => !document.querySelector('#journal').hidden), 'J opens the notebook');
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
await page.evaluate(() => { const d = window.NR.W.LP.miltonDoor; window.NR.tp(d[0] - 1, d[1], -Math.PI / 2); });
await page.waitForTimeout(400);
await page.keyboard.press('KeyE'); await page.waitForTimeout(1200);
ok((await page.evaluate(() => window.NR.state())).space === 'milton', 'E at the door goes into Milton Mansion');
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
ok(await page.evaluate(() => !document.querySelector('#vf').hidden), 'C raises the camera');
await page.keyboard.press('Space'); await page.waitForTimeout(400);
ok(await page.evaluate(() => window.NR.ST.photos.length === 1), 'Space takes a photo');
await page.screenshot({ path: path.join(here, 'out', 'live_desktop.png') });
await page.close();
// ---- phone
page = await open({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
await page.tap('#bStart'); await page.waitForTimeout(500);
ok(await page.evaluate(() => document.body.classList.contains('touch')), 'touch controls on');
const q0 = await page.evaluate(() => window.NR.state());
const box = await page.locator('#stick').boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
const cdp = await page.context().newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - 50, id: 1 }] });
await page.waitForTimeout(2500);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const q1 = await page.evaluate(() => window.NR.state());
ok(Math.hypot(q1.x - q0.x, q1.z - q0.z) > 1, `stick walks (${Math.hypot(q1.x - q0.x, q1.z - q0.z).toFixed(1)} m)`);
await page.tap('#tMap'); await page.waitForTimeout(300);
ok(await page.evaluate(() => !document.querySelector('#map').hidden), 'MAP button opens the map');
await page.screenshot({ path: path.join(here, 'out', 'live_phone_map.png') });
await page.tap('#mapClose'); await page.waitForTimeout(300);
await page.screenshot({ path: path.join(here, 'out', 'live_phone.png') });
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 10).join('\n')); process.exit(1); }
if (fails.length) { console.log(fails.length + ' failed'); process.exit(1); }
console.log('OK, all passed');
