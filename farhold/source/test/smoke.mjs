// Headless smoke test: loads ../../index.html#debug in Chromium, starts a journey, runs an optional
// steps file against window.FH and saves screenshots to test/out/.
//   node test/smoke.mjs [--steps file.js] [--shot name.png] [--no-start] [--seed s] [--log] [--w 1280 --h 720]
// A steps file may be split by lines "//--- shot NAME": segments run in turn with a screenshot between them.
// Segments share state through `out` (window.__out).
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
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug' + (args.includes('--nowork') ? '-nowork' : ''));
await page.waitForFunction(() => window.FH, null, { timeout: 60000 });
if (!args.includes('--no-start')) {
  await page.evaluate((seed) => { localStorage.clear(); return window.FH.start({ seed }); }, opt('--seed', 'test'));
  console.log('started in', Date.now() - t0, 'ms');
}
const steps = opt('--steps');
if (steps) {
  const parts = fs.readFileSync(steps, 'utf8').split(/^\/\/--- shot (\S+)\s*$/m);
  for (let i = 0; i < parts.length; i += 2) {
    try {
      const res = await page.evaluate(`(async () => { const FH = window.FH; const out = window.__out = window.__out || {}; const F = FH.f, P = FH.P, S = FH.SHIP; const wait = (ms) => new Promise(r => setTimeout(r, ms));\n${parts[i]}\n})()`);
      if (res !== undefined) console.log(JSON.stringify(res, null, 1));
    } catch (e) { errors.push('steps: ' + e.message); break; }
    if (parts[i + 1]) { await page.evaluate(() => window.FH.render()); await page.screenshot({ path: path.join(outDir, parts[i + 1] + '.png'), timeout: 180000 }); }
  }
}
const shotName = opt('--shot');
if (shotName) { await page.evaluate(() => window.FH && window.FH.render && window.FH.G.state === 'play' && window.FH.render()); await page.screenshot({ path: path.join(outDir, shotName), timeout: 180000 }); }
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('OK, no errors');
