import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const b = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/../index.html');
await p.waitForTimeout(800);
await p.screenshot({ path: 'test/out/live_title.png' });
await p.click('#bStart'); await p.waitForTimeout(2500);
for (let i = 0; i < 8; i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(400); }
await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW');
await p.waitForTimeout(500);
await p.screenshot({ path: 'test/out/live_hub.png' });
await p.keyboard.press('KeyJ'); await p.waitForTimeout(600);
await p.screenshot({ path: 'test/out/live_journal.png' });
console.log(errs.length ? 'ERRORS ' + errs.join('\n') : 'no errors');
await b.close();
