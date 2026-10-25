// Real touch input on an emulated phone: pick a size, begin, choose a power and tap the city.
//   node test/touch.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.AG, null, { timeout: 120000 });
const tap = async (sel) => { const b = await page.locator(sel).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(300); };
await tap('.size[data-k="town"]');
await page.waitForTimeout(2500);
await tap('#begin');
const r = {};
// the help panel on first play
if (await page.locator('#help').isVisible()) await tap('#helpClose');
// a drag on the map first (people often look around before choosing)
await page.evaluate(() => { const c = AG.centre(); AG.look(c.x, c.z, 600, 0.7); });
const cv = await page.locator('#c').boundingBox();
await page.touchscreen.tap(cv.width / 2, cv.height * 0.3);
await page.waitForTimeout(300);
for (const id of ['lightning', 'meteor', 'tornado']) {
  await tap(`.pw[data-id="${id}"]`);
  const before = await page.evaluate(() => AG.G.casts || 0);
  await page.touchscreen.tap(cv.width / 2 + (id === 'meteor' ? 60 : 0), cv.height * 0.32);
  await page.waitForTimeout(600);
  r[id] = (await page.evaluate(() => AG.G.casts || 0)) - before;
}
r.effects = await page.evaluate(() => AG.G.effects.map((e) => e.type));
r.cars = await page.evaluate(() => AG.TR.cars.filter((c) => c.on).length);
r.peds = await page.evaluate(() => AG.TR.peds.filter((p) => p.on).length);
await page.screenshot({ path: path.join(outDir, 'touch.png') });
console.log(JSON.stringify(r));
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 10).join('\n')); process.exit(1); }
const ok = r.lightning > 0 && r.meteor > 0 && r.tornado > 0;
console.log(ok ? 'OK, touch casts work' : 'FAIL: a tap did not cast');
process.exit(ok ? 0 : 1);
