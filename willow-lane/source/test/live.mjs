// Real input in real time: menu clicks, pie menus from mouse clicks, walking, camera keys, buy mode placement
//   node test/live.mjs
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
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.WL, null, { timeout: 60000 });
await page.evaluate(() => localStorage.clear());
const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.png') });
const log = (...a) => console.log(...a);
// main menu -> preset -> starter cottage
await page.click('#mQuick'); await page.waitForTimeout(300);
await page.click('.preset[data-i="1"]'); await page.waitForTimeout(300);
await page.click('.preset[data-k="starter"]'); await page.waitForTimeout(1500);
log('state', await page.evaluate(() => [WL.G.state, WL.G.family, WL.sims().map((s) => s.first)]));
// screen position of a world point
const proj = (x, y, z) => page.evaluate(([x, y, z]) => { const v = new WL.R.camera.position.constructor(x, y, z).project(WL.R.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [x, y, z]);
await page.evaluate(() => { WL.cam(16, 14, 16, Math.PI / 4); WL.G.userSpeed = 0; });
await page.waitForTimeout(800);
// click the fridge -> pie menu -> "Have a snack"
const fr = await page.evaluate(() => { const o = WL.G.objects.find((o) => o.type === 'fridge'); return [o.x + 0.5, o.z + 0.5]; });
let [px, py] = await proj(fr[0], 1.2, fr[1]);
await page.mouse.click(px, py); await page.waitForTimeout(400);
const pie = await page.evaluate(() => [...document.querySelectorAll('.pie .pi')].map((b) => b.textContent));
log('pie', pie);
await shot('live_pie');
const snack = await page.$('.pie .pi:has-text("snack")');
if (snack) await snack.click();
await page.waitForTimeout(200);
log('queue', await page.evaluate(() => WL.G.selected.queue.map((a) => a.id)));
// click the ground to walk, then unpause
await page.evaluate(() => WL.cam(14.5, 20.5, 16, Math.PI / 4)); await page.waitForTimeout(300);
[px, py] = await proj(14.5, 0, 20.5);
log('ground at', Math.round(px), Math.round(py));
log('ground pick', await page.evaluate(([x, y]) => { const list = []; for (const s of WL.G.sims) if (s.model && s.model.visible) list.push(s.model); for (const o of WL.G.objects) if (o.model && o.model.visible) list.push(o.model); const h = WL.f.pickAt(x, y, list); return h ? h.pick.type + ':' + (h.pick.obj ? h.pick.obj.type : h.pick.sim ? h.pick.sim.first : '') : 'none'; }, [px, py]));
await page.mouse.click(px, py); await page.waitForTimeout(200);
log('queue2', await page.evaluate(() => WL.G.selected.queue.map((a) => a.id)));
await page.keyboard.press('Digit3'); await page.waitForTimeout(3000);
log('after', await page.evaluate(() => [WL.G.selected.cur && WL.G.selected.cur.id, Math.round(WL.G.selected.needs.hunger), WL.G.speed]));
// click another sim -> social pie
const other = await page.evaluate(() => { const s = WL.sims()[1]; return [s.x, s.z, s.posture]; });
await page.keyboard.press('Space');
await page.evaluate(([x, z]) => WL.cam(x, z, 12, Math.PI / 4), other); await page.waitForTimeout(400);
[px, py] = await proj(other[0], 1.0, other[1]);
await page.mouse.click(px, py); await page.waitForTimeout(400);
log('social pie', await page.evaluate(() => [...document.querySelectorAll('.pie .pi')].map((b) => b.textContent)));
await shot('live_social');
await page.mouse.click(20, 300); // close the pie by clicking away
// camera: keys, wheel, right-drag
const cam0 = await page.evaluate(() => ({ ...WL.R.cam, follow: null }));
await page.keyboard.down('KeyD'); await page.waitForTimeout(400); await page.keyboard.up('KeyD');
await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
await page.mouse.move(640, 300); await page.mouse.wheel(0, 400); await page.waitForTimeout(300);
await page.mouse.move(640, 360); await page.mouse.down({ button: 'right' }); await page.mouse.move(700, 360, { steps: 5 }); await page.mouse.up({ button: 'right' });
const cam1 = await page.evaluate(() => ({ ...WL.R.cam, follow: null }));
log('cam', { tx: [cam0.tx, cam1.tx].map((v) => v.toFixed(1)), yaw: [cam0.yawT, cam1.yawT].map((v) => v.toFixed(2)), dist: [cam0.distT, cam1.distT].map((v) => v.toFixed(1)) });
// buy mode: pick a chair and drop it on the lawn
await page.keyboard.press('F2'); await page.waitForTimeout(300);
await page.evaluate(() => WL.cam(22.5, 20.5, 16, Math.PI / 4));
await page.waitForTimeout(300);
await page.click('.item[data-item="chair"]'); await page.waitForTimeout(200);
[px, py] = await proj(22.5, 0, 20.5);
await page.mouse.move(px, py, { steps: 4 }); await page.waitForTimeout(200);
await page.mouse.click(px, py); await page.waitForTimeout(300);
log('chairs', await page.evaluate(() => WL.G.objects.filter((o) => o.type === 'chair').map((o) => o.x + ',' + o.z)), 'money', await page.evaluate(() => WL.G.money));
await shot('live_buy');
// build mode: drag a wall
await page.keyboard.press('F3'); await page.waitForTimeout(300);
await page.evaluate(() => WL.cam(25, 22, 16, Math.PI / 4)); await page.waitForTimeout(300);
const [ax, ay] = await proj(23, 0, 22), [bx, by] = await proj(27, 0, 22);
await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 8 }); await page.waitForTimeout(150);
await shot('live_wall');
await page.mouse.up(); await page.waitForTimeout(300);
log('walls at z=22', await page.evaluate(() => [...WL.LOT.walls.keys()].filter((k) => k.endsWith(':22')).length));
await page.keyboard.press('F1'); await page.waitForTimeout(300);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
log('options open', await page.evaluate(() => !document.querySelector('#dialog').hidden));
await shot('live_options');
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('OK, no errors');
