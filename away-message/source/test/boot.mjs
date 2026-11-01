// Boot test: loads the page WITHOUT #debug (the real boot path the debug hook skips), clicks the power button,
// and verifies the BIOS/splash sequence finishes and the desktop appears. Run: node test/boot.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out'); fs.mkdirSync(outDir, { recursive: true });
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::|favicon/.test(m.text())) errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
await page.goto('file://' + path.resolve(here, '../../index.html'));
// the power button is the only button on the start screen
await page.waitForSelector('#screen.on button', { timeout: 15000 });
await page.click('#screen.on button');
// click once more to skip the BIOS/splash delays, then wait for the desktop
await page.waitForTimeout(400);
await page.mouse.click(512, 360);
let ok = false;
try {
  await page.waitForFunction(() => { const s = document.querySelector('#screen'); const tb = document.querySelector('#taskbar'); return s && !s.classList.contains('on') && tb && tb.offsetHeight > 0; }, null, { timeout: 20000 });
  ok = true;
} catch (e) { errors.push('desktop did not appear: ' + e.message); }
await page.screenshot({ path: path.join(outDir, 'boot.png') });
await browser.close();
if (!ok || errors.length) { console.log('BOOT FAILED:\n' + errors.join('\n')); process.exit(1); }
console.log('OK, booted to desktop');
