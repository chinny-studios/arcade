// Headless smoke test: loads ../index.html#debug in Chromium, reports console errors,
// optionally runs a script against window.AR and saves screenshots.
//   node test/smoke.mjs [--steps file.js] [--shot out.png] [--wait ms]
// The steps file is evaluated in the page as an async function body with `AR` in scope;
// whatever it returns is printed as JSON. Screenshots taken via `await shot('name')` inside
// steps land in test/out/.
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
const page_ = path.resolve(here, '../../index.html');
const outDir = path.join(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (args.includes('--log')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
await page.exposeFunction('__shot', async (name) => { await page.screenshot({ path: path.join(outDir, name + '.png') }); return true; });
await page.goto('file://' + page_ + '#debug');
await page.waitForFunction(() => window.AR && window.AR.ready, null, { timeout: 90000 }).catch((e) => errors.push('never ready: ' + e.message));
await page.waitForTimeout(+opt('--wait', 500));
const steps = opt('--steps');
if (steps) {
  const body = fs.readFileSync(steps, 'utf8');
  try {
    const res = await page.evaluate(`(async () => { const AR = window.AR; const shot = (n) => window.__shot(n); const wait = (ms) => new Promise(r => setTimeout(r, ms));\n${body}\n})()`);
    console.log(JSON.stringify(res, null, 1));
  } catch (e) { errors.push('steps: ' + e.message); }
}
const shotName = opt('--shot');
if (shotName) await page.screenshot({ path: path.join(outDir, shotName) });
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK, no errors');
