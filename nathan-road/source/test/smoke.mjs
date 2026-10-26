// Headless smoke test: loads ../../index.html#debug in Chromium, optionally starts a mission, runs a steps file
// against window.NR and saves screenshots to test/out/.
//   node test/smoke.mjs [--hour H] [--steps file.js] [--shot name.png] [--no-start] [--log] [--touch] [--w 1280 --h 720]
// A steps file may be split by lines "//--- shot NAME": each segment runs in turn and a screenshot is taken between them.
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
const page = await browser.newPage({ viewport: { width: +opt('--w', 1280), height: +opt('--h', 720) }, hasTouch: args.includes('--touch'), isMobile: args.includes('--touch') });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (args.includes('--log')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
const t0 = Date.now();
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
try { await page.waitForFunction(() => window.NR && window.NR.ready, null, { timeout: 240000 }); } catch (e) { console.log('BOOT FAILED\n' + errors.join('\n')); await browser.close(); process.exit(1); }
console.log('booted in', Date.now() - t0, 'ms');
if (!args.includes('--no-start')) {
  const r = await page.evaluate((h) => window.NR.start({ hour: +h }), opt('--hour', '16.5'));
  console.log('started', JSON.stringify(r));
}
const steps = opt('--steps');
if (steps) {
  const parts = fs.readFileSync(steps, 'utf8').split(/^\/\/--- shot (\S+)\s*$/m);
  for (let i = 0; i < parts.length; i += 2) {
    try {
      const res = await page.evaluate(`(async () => { const NR = window.NR; const out = window.__out = window.__out || {}; const wait = (ms) => new Promise(r => setTimeout(r, ms));\n${parts[i]}\n})()`);
      if (res !== undefined) console.log(JSON.stringify(res, null, 1));
    } catch (e) { errors.push('steps: ' + e.message); break; }
    if (parts[i + 1]) { await page.waitForTimeout(150); await page.screenshot({ path: path.join(outDir, parts[i + 1] + '.png'), timeout: 180000 }); }
  }
}
const shotName = opt('--shot');
if (shotName) { await page.waitForTimeout(300); await page.screenshot({ path: path.join(outDir, shotName), timeout: 180000 }); }
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('OK, no errors');
