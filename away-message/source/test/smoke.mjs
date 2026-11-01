// Headless smoke test for Away Message. Loads ../../index.html#debug in Chromium, drives window.AM, and screenshots
// to test/out/. Usage: node test/smoke.mjs [--steps test/play.js] [--shot name.png] [--log]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const outDir = path.join(here, 'out'); fs.mkdirSync(outDir, { recursive: true });
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: +opt('--w', 1024), height: +opt('--h', 720) } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::|favicon/.test(m.text())) errors.push('console: ' + m.text()); else if (args.includes('--log')) console.log('[page]', m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.AM, null, { timeout: 30000 });
await page.evaluate(() => { AM.reset(); });
await page.reload();
await page.waitForFunction(() => window.AM, null, { timeout: 30000 });
await page.evaluate(() => AM.start());
const steps = opt('--steps');
if (steps) {
  const parts = fs.readFileSync(path.resolve(steps), 'utf8').split(/^\/\/--- shot (\S+)\s*$/m);
  for (let i = 0; i < parts.length; i += 2) {
    try { const res = await page.evaluate(`(async () => { const AM = window.AM; const wait = (ms) => new Promise(r=>setTimeout(r,ms));\n${parts[i]}\n})()`); if (res !== undefined) console.log(JSON.stringify(res)); }
    catch (e) { errors.push('steps: ' + e.message); break; }
    if (parts[i + 1]) { await page.screenshot({ path: path.join(outDir, parts[i + 1] + '.png') }); }
  }
}
const shot = opt('--shot'); if (shot) await page.screenshot({ path: path.join(outDir, shot) });
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 30).join('\n')); process.exit(1); }
console.log('OK, no errors');
