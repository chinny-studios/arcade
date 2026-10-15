// Title and character creation screenshots.
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + path.resolve(here, '../../index.html'));
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(here, 'out/t_title.png'), timeout: 120000 });
await page.click('#bNew');
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(here, 'out/t_new.png'), timeout: 120000 });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(here, 'out/t_new_phone.png'), timeout: 120000 });
await browser.close();
console.log(errors.length ? 'ERRORS ' + errors.join('\n') : 'OK');
