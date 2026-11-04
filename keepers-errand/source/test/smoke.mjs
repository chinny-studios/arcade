// Headless smoke test: loads ../../index.html#debug in Chromium, optionally starts a game, runs a steps file
// against window.KE and saves screenshots to test/out/.
//   node test/smoke.mjs [--start '{"area":"isle"}'] [--steps file.js] [--shot name.png] [--log] [--w 1280 --h 720]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const outDir = path.join(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +opt('--w', 1280), height: +opt('--h', 720) } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (args.includes('--log')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
const t0 = Date.now();
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.KE && window.KE.ready, null, { timeout: 120000 });
console.log('loaded in', Date.now() - t0, 'ms');
const start = opt('--start');
if (start) console.log('start', JSON.stringify(await page.evaluate((o) => window.KE.start(JSON.parse(o)), start)));
const steps = opt('--steps');
if (steps) {
  // a steps file may be split by lines "//--- shot NAME": each segment runs in turn and a screenshot is taken after it.
  // Segments share state through the `out` object (window.__out).
  const parts = fs.readFileSync(steps, 'utf8').split(/^\/\/--- shot (\S+)\s*$/m);
  for (let i = 0; i < parts.length; i += 2) {
    try {
      const res = await page.evaluate(`(async () => { const KE = window.KE; const out = window.__out = window.__out || {}; const F = KE.f; const wait = (ms) => new Promise(r => setTimeout(r, ms)); const S = () => KE.state(); const say = (c) => KE.finishDialog(c); const log = (out.log = out.log || []); const H = F.Hero;\n${parts[i]}\n})()`);
      if (res !== undefined) console.log(JSON.stringify(res, null, 1));
    } catch (e) { errors.push('steps: ' + e.message); break; }
    if (parts[i + 1]) { await page.evaluate(() => window.KE.render()); await page.screenshot({ path: path.join(outDir, parts[i + 1] + '.png'), timeout: 180000 }); console.log('shot', parts[i + 1]); }
  }
}
const shotName = opt('--shot');
if (shotName) await page.screenshot({ path: path.join(outDir, shotName), timeout: 180000 });
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('OK, no errors');
