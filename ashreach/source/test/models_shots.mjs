// Headless screenshots of test/models_view.html.
//   node test/models_shots.mjs name:query [name:query ...]     e.g.  idle:state=idle&cam=humans
// PNGs land in test/out/models_<name>.png; page errors are printed and fail the run.
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
const shots = process.argv.slice(2);
if (!shots.length) shots.push('wide:state=idle');
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
for (const s of shots) {
  const i = s.indexOf(':'), name = s.slice(0, i), q = s.slice(i + 1);
  await page.goto('file://' + path.join(here, 'models_view.html') + '?still=1&' + q);
  await page.waitForFunction(() => window.MV_READY, null, { timeout: 60000 }).catch((e) => errors.push(name + ' never ready: ' + e.message));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(outDir, 'models_' + name + '.png') });
  const hud = await page.evaluate(() => document.getElementById('hud').textContent).catch(() => '');
  console.log(name, '|', hud.replace(/\n/g, ' | '));
}
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
