// Headless smoke test: loads ../../index.html#debug in Chromium, starts a battle, runs an optional steps file
// against window.SH and saves screenshots to test/out/.
//   node test/smoke.mjs [--steps file.js] [--map lexington] [--mode conquest] [--side 0] [--cls line] [--size 32] [--no-start] [--shot name.png] [--log]
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
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push('console: ' + m.text()); else if (args.includes('--log')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
// fonts are optional and some sandboxes block them
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const t0 = Date.now();
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.SH && !document.querySelector('#btnPlay').disabled, null, { timeout: 120000 });
console.log('title ready in', Date.now() - t0, 'ms');
if (!args.includes('--no-start')) {
  await page.evaluate((o) => { window.__map = o.map; window.__mode = o.mode; }, { map: opt('--map', 'lexington'), mode: opt('--mode', 'conquest') });
  const T = await page.evaluate((o) => { SH.manual(true); return SH.start(o); }, { map: opt('--map', 'lexington'), mode: opt('--mode', 'conquest'), side: +opt('--side', 0), cls: opt('--cls', 'line'), size: +opt('--size', 32) });
  console.log('started in', Date.now() - t0, 'ms', JSON.stringify(T));
}
const steps = opt('--steps');
if (steps) {
  // a steps file may be split by lines "//--- shot NAME": each segment runs in turn and a screenshot is taken after it.
  // Segments share state through the `out` object (window.__out).
  const parts = fs.readFileSync(steps, 'utf8').split(/^\/\/--- shot (\S+)\s*$/m);
  for (let i = 0; i < parts.length; i += 2) {
    try {
      const res = await page.evaluate(`(async () => { const out = window.__out = window.__out || {}; const F = SH.f, P = SH.PL, M = SH.MATCH; const wait = (ms) => new Promise(r => setTimeout(r, ms));\n${parts[i]}\n})()`);
      if (res !== undefined) console.log(JSON.stringify(res, null, 1));
    } catch (e) { errors.push('steps: ' + e.message); break; }
    if (parts[i + 1]) { await page.evaluate(() => SH.render()); await page.screenshot({ path: path.join(outDir, parts[i + 1] + '.png'), timeout: 180000 }); }
  }
}
const shotName = opt('--shot');
if (shotName) { await page.evaluate(() => SH.render()); await page.screenshot({ path: path.join(outDir, shotName), timeout: 180000 }); }
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('OK, no errors');
