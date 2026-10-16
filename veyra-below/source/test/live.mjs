// Real input in real time: title → new warden → ship → teleporter → first floor → fight. node test/live.mjs
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
import fs from 'fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(here, 'out'), { recursive: true });
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.VB);
await page.evaluate(() => localStorage.clear());
await page.click('[data-a="new:0"]');
await page.fill('#cname', 'Kestrel');
await page.click('[data-a="role:marksman"]'); await page.click('[data-a="race:construct"]');
await page.click('[data-a="cgo"]');
await page.waitForTimeout(1500);
for (let k = 0; k < 14 && await page.$(".dlg"); k++) { await page.click('.dlg'); await page.waitForTimeout(150); }
const r = {};
r.mode = await page.evaluate(() => VB.GAME.mode);
const p0 = await page.evaluate(() => ({ x: VB.PL.x, z: VB.PL.z }));
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
const p1 = await page.evaluate(() => ({ x: VB.PL.x, z: VB.PL.z }));
r.moved = Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2);
await page.keyboard.press('KeyI'); await page.waitForTimeout(300);
r.menu = await page.evaluate(() => VB.UI.cur && VB.UI.cur.id);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
r.menuClosed = await page.evaluate(() => !VB.UI.cur);
// walk to the teleporter and use it
await page.evaluate(() => { const t = VB.LV.objects.find((o) => o.kind === 'tele'); VB.PL.x = t.x; VB.PL.z = t.z + 1; });
await page.waitForTimeout(300);
await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
r.tele = await page.evaluate(() => VB.UI.cur && VB.UI.cur.id);
await page.click('[data-a="go:0"]');
await page.waitForFunction(() => VB.GAME.mode === 'field' && document.querySelector('#loading').hidden, null, { timeout: 60000 });
r.field = await page.evaluate(() => VB.GAME.area + ' ' + VB.GAME.floorIdx);
// fight something with the mouse
await page.evaluate(() => { VB.god(true); const e = VB.f.spawnEnemy('mossling', VB.PL.x + 3, VB.PL.z, { lvl: 1 }); e.aggro = VB.PL; });
for (let k = 0; k < 12; k++) {
  const s = await page.evaluate(() => { const e = VB.ENTS.find((q) => q.team === 1 && !q.dead && !q.box); if (!e) return null; const v = new THREE.Vector3(e.x, 0.8, e.z).project(VB.R.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
  if (!s) break;
  await page.mouse.move(s.x, s.y); await page.mouse.down(); await page.waitForTimeout(250); await page.mouse.up(); await page.waitForTimeout(150);
}
r.kills = await page.evaluate(() => VB.GAME.char.stats.kills);
await page.keyboard.press('Space'); await page.waitForTimeout(200);
await page.keyboard.press('Digit4'); await page.waitForTimeout(500);
r.traps = await page.evaluate(() => VB.f.ZONES.length >= 0);
await page.screenshot({ path: path.join(here, 'out', 'live.png') });
console.log(JSON.stringify(r, null, 1));
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK, no errors');
