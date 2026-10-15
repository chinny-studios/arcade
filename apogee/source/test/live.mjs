// Real-time input check: real key presses through the live frame loop (no sim), in both control schemes.
//   node test/live.mjs
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.AP);
const res = {};
// title -> select -> mission 1 -> Agent -> accept, all by keyboard
await page.keyboard.press('Enter'); await page.waitForTimeout(300);
await page.keyboard.press('Enter'); await page.waitForTimeout(200);
await page.keyboard.press('Enter'); await page.waitForTimeout(200);
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
res.state = await page.evaluate(() => AP.state().state);
await page.evaluate(() => { AP.god(); AP.peace(); });
const p0 = await page.evaluate(() => AP.state().pos);
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
const p1 = await page.evaluate(() => AP.state().pos);
res.walked = +Math.hypot(p1[0] - p0[0], p1[2] - p0[2]).toFixed(2);
// fire with the right control key
const s0 = await page.evaluate(() => AP.f.G.stats.shots);
await page.keyboard.down('ControlRight'); await page.waitForTimeout(200); await page.keyboard.up('ControlRight'); await page.waitForTimeout(300);
res.shots = (await page.evaluate(() => AP.f.G.stats.shots)) - s0;
// watch menu with Tab, close with Tab
await page.keyboard.press('Tab'); await page.waitForTimeout(200);
res.watch = await page.evaluate(() => AP.f.G.state);
await page.keyboard.press('Tab'); await page.waitForTimeout(200);
res.back = await page.evaluate(() => AP.f.G.state);
// classic: arrows turn, auto-aim
await page.evaluate(() => { AP.f.SET.controls = 'classic'; });
const y0 = await page.evaluate(() => AP.f.G.player.yaw);
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(600); await page.keyboard.up('ArrowLeft');
res.turned = +((await page.evaluate(() => AP.f.G.player.yaw)) - y0).toFixed(2);
// N64 frame rate: count steps per second through the clock
await page.evaluate(() => { AP.f.SET.fps = 'n64'; window.__t0 = AP.f.G.time; window.__n = 0; });
await page.waitForTimeout(2000);
res.n64clock = await page.evaluate(() => +(AP.f.G.time - window.__t0).toFixed(2));
await page.evaluate(() => { AP.f.SET.fps = 'smooth'; AP.f.SET.controls = 'modern'; });
console.log(JSON.stringify(res));
await browser.close();
if (errors.length) { console.log('ERRORS\n' + errors.join('\n')); process.exit(1); }
console.log('OK');
