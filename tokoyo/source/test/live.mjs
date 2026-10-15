// Real-time run in normal mode with real key presses; fails on any page error.
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + path.resolve(here, '../../index.html'));
await page.waitForTimeout(800);
await page.click('#bNew');
await page.fill('#cName', 'Kaede');
await page.click('#cHair .chip:nth-child(2)');
await page.click('#bStart');
await page.waitForFunction(() => document.body.dataset.state === 'play', null, { timeout: 120000 });
const kb = page.keyboard;
const hold = async (k, ms) => { await kb.down(k); await page.waitForTimeout(ms); await kb.up(k); };
await page.waitForTimeout(3000);
await kb.press('Space'); // skip the arrival
await page.waitForTimeout(2000);
await hold('KeyW', 3000);
await kb.down('ShiftLeft'); await hold('KeyW', 2000); await kb.up('ShiftLeft');
await kb.press('Space'); await page.waitForTimeout(800);
await kb.press('KeyE'); await page.waitForTimeout(300);
await kb.press('Tab'); await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(here, 'out/live_inv.png'), timeout: 120000 });
await kb.press('Tab'); await page.waitForTimeout(300);
await kb.press('KeyM'); await page.waitForTimeout(1200);
await kb.press('KeyM'); await page.waitForTimeout(300);
await kb.press('Escape'); await page.waitForTimeout(800);
await page.screenshot({ path: path.join(here, 'out/live_pause.png'), timeout: 120000 });
await page.click('#pResume'); await page.waitForTimeout(500);
await hold('KeyA', 1500); await hold('KeyS', 1000);
await kb.press('KeyX'); await page.waitForTimeout(1500); await kb.press('KeyX');
await kb.press('Digit1'); await page.waitForTimeout(500);
const st = await page.evaluate(() => ({ state: document.body.dataset.state, saved: !!localStorage.getItem('tokoyo.save.v1') }));
await page.screenshot({ path: path.join(here, 'out/live_end.png'), timeout: 120000 });
await browser.close();
console.log(JSON.stringify(st));
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK, no errors');
