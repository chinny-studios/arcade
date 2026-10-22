// Real keyboard input in real time: climb, fly forward, pick equipment, switch camera, open the map and pause.
//   node test/live.mjs
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.CC);
await page.evaluate(() => CC.start({}));
const st = () => page.evaluate(() => ({ ...CC.stats(), eq: CC.HELI.equip, cam: CC.CAM.mode, map: !document.querySelector('#mapBig').hidden, pause: !document.querySelector('#pause').hidden }));
const waitFor = async (f, ms = 240000) => { try { await page.waitForFunction(f, null, { timeout: ms, polling: 200 }); } catch (e) { console.log('timed out on', f.toString(), JSON.stringify(await st())); throw e; } };
const res = {};
res.start = await st();
const f0 = await page.evaluate(() => CC.G.frame); await new Promise((r) => setTimeout(r, 3000)); res.fps = ((await page.evaluate(() => CC.G.frame)) - f0) / 3;
await page.keyboard.down('Space'); await waitFor(() => CC.HELI.y > 8); await page.keyboard.up('Space');
res.climbed = await st();
await page.keyboard.down('KeyW'); await waitFor(() => Math.hypot(CC.HELI.vx, CC.HELI.vz) > 8); await page.keyboard.up('KeyW');
res.forward = await st();
await page.keyboard.press('Digit2'); await waitFor(() => CC.HELI.equip === 'ladder');
await page.keyboard.press('KeyV'); await waitFor(() => CC.CAM.mode === 'cockpit');
await page.keyboard.press('KeyM'); await waitFor(() => !document.querySelector('#mapBig').hidden);
res.mid = await st();
await page.keyboard.press('KeyM'); await waitFor(() => document.querySelector('#mapBig').hidden); await page.keyboard.press('Escape'); await waitFor(() => !document.querySelector('#pause').hidden);
res.paused = await st();
await page.screenshot({ path: path.join(here, 'out', 'live.png') });
console.log(JSON.stringify(res));
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK, no errors');
