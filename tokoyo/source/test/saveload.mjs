// Save → reload → Continue round trip in one browser context (localStorage persists across reloads).
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const file = 'file://' + path.resolve(here, '../../index.html') + '#debug';
await page.goto(file);
await page.waitForFunction(() => window.TK);
await page.evaluate(() => window.TK.start({ seed: 'roundtrip' }));
const before = await page.evaluate(() => {
  const TK = window.TK, P = TK.P, F = TK.f;
  TK.peace(true); TK.mute();
  TK.give('wood', 23); TK.give('bronze_sword', 1, 3); TK.equip('bronze_sword');
  TK.tp(P.pos.x + 30, P.pos.z + 5);
  const x = P.pos.x + 3, z = P.pos.z, h = F.heightAt(x, z);
  const fl = TK.place('wood_floor', x, h + 0.25, z, 0.5);
  const ch = TK.place('chest', x, h + 0.25, z, 0); ch.data.inv.add('flint', 9);
  const fire = TK.place('campfire', x + 4, F.heightAt(x + 4, z), z, 0); fire.data.fuel = 7;
  // dig a hole and pave a path
  window.TK.f.BUILD; F.dropItems('resin', 5, x - 2, h + 1, z);
  TK.sim(2);
  const dug = F.heightAt(x - 6, z);
  F.SAVE; window.TK.SAVE.save();
  const t = window.TK.target && null; void t;
  P.skills.woodcutting = { lv: 12, xp: 0.5 };
  window.TK.SAVE.save();
  return { pos: P.pos.toArray().map((v) => +v.toFixed(1)), wood: P.inv.count('wood'), sword: P.inv.slots.find((s) => s && s.id === 'bronze_sword').q, eq: !!P.eq.right, pieces: TK.BUILD.pieces.length, chestFlint: ch.data.inv.count('flint'), time: Math.round(TK.G.time), drops: TK.DROPS.length, dug };
});
await page.reload();
await page.waitForFunction(() => window.TK);
await page.evaluate(() => window.TK.start({ cont: true }));
const after = await page.evaluate(() => {
  const TK = window.TK, P = TK.P;
  const ch = TK.BUILD.pieces.find((p) => p.id === 'chest');
  return { pos: P.pos.toArray().map((v) => +v.toFixed(1)), wood: P.inv.count('wood'), sword: (P.inv.slots.find((s) => s && s.id === 'bronze_sword') || {}).q, eq: !!P.eq.right, pieces: TK.BUILD.pieces.length, chestFlint: ch && ch.data.inv.count('flint'), time: Math.round(TK.G.time), drops: TK.DROPS.length, wc: P.skills.woodcutting && P.skills.woodcutting.lv, fire: (TK.BUILD.pieces.find((p) => p.id === 'campfire') || {}).data };
});
console.log(JSON.stringify({ before, after }, null, 1));
await browser.close();
if (errors.length) { console.log('ERRORS', errors); process.exit(1); }
