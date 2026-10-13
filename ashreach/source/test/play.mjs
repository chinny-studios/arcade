// Real-input playthrough: title → chargen → world, then keyboard combat. Screenshots in test/out/play_*.png
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
const pw = require('/opt/node22/lib/node_modules/playwright');
const here = path.dirname(url.fileURLToPath(import.meta.url));
const out = (n) => path.join(here, 'out', 'play_' + n + '.png');
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.stack || e.message));
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.AR && window.AR.ready, null, { timeout: 90000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: out('1_title') });
await page.click('[data-act="tnew:"]');
await page.waitForTimeout(800);
await page.click('text=Medic');
await page.click('text=Kestrel');
await page.screenshot({ path: out('2_chargen') });
await page.click('[data-act="cgenter:"]');
await page.waitForTimeout(3000);
await page.screenshot({ path: out('3_world') });
const st = await page.evaluate(() => ({ state: AR.state, name: AR.PLAYER && AR.PLAYER.name, prof: AR.PLAYER && AR.PLAYER.char.prof, zone: AR.ZONE.id }));
console.log('after chargen', JSON.stringify(st));
// walk forward 2 s, then tab-target the nearest mob and attack with backquote
await page.keyboard.down('KeyW'); await page.waitForTimeout(2000); await page.keyboard.up('KeyW');
const moved = await page.evaluate(() => [AR.PLAYER.pos.x.toFixed(1), AR.PLAYER.pos.z.toFixed(1)]);
console.log('moved to', moved);
// teleport near chitterlings to save walking
await page.evaluate(() => { const m = AR.ENTS.filter(e => e.kind === 'mob' && e.tplId === 'chitterling' && !e.dead).sort((a, b) => a.pos.distanceTo(AR.PLAYER.pos) - b.pos.distanceTo(AR.PLAYER.pos))[0]; AR.tp(m.pos.x + 10, m.pos.z); AR.PLAYER.yaw = -Math.PI / 2; AR.CAM.yaw = AR.PLAYER.yaw; });
await page.waitForTimeout(500);
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
await page.keyboard.press('Backquote');
await page.waitForTimeout(1200);
await page.screenshot({ path: out('4_fight') });
await page.keyboard.press('Digit1');   // first hotbar slot: a starting nano
await page.waitForTimeout(6000);
await page.screenshot({ path: out('5_after') });
const fight = await page.evaluate(() => ({ target: AR.PLAYER.target && AR.PLAYER.target.name, attacking: AR.PLAYER.attacking, hp: Math.round(AR.PLAYER.hp), xp: AR.PLAYER.char.xp, hotbar: AR.PLAYER.char.hotbar.slice(0, 4).map(h => h && (h.id || h.name)) }));
console.log('fight', JSON.stringify(fight));
for (const k of ['KeyC', 'KeyI', 'KeyN']) { await page.keyboard.press(k); await page.waitForTimeout(300); }
await page.screenshot({ path: out('6_windows') });
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'OK, no errors');
