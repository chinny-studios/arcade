// Browser API check on models_view.html: setLook (recolour + rebuild), setWeapon, setGlow, play, dispose,
// then render again (shared template buffers must survive disposing an instance). Fails on any page error.
import { createRequire } from 'module';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
await page.goto('file://' + path.join(here, 'models_view.html') + '?still=1&cam=humans');
await page.waitForFunction(() => window.MV_READY, null, { timeout: 60000 });
const res = await page.evaluate(() => {
  const { RIGS, step, render } = window.MV, out = {};
  const r0 = RIGS[0], before = r0.stats();
  r0.setLook({ primary: 0xff0000 }); out.recolourSameTpl = r0.stats().tris === before.tris;
  r0.setLook({ armorTier: 3, helmet: true, sex: 'f' }); out.rebuilt = r0.stats();
  for (const w of ['none', 'pistol', 'rifle', 'smg', 'shotgun', 'heavy', 'melee1h', 'melee2h', 'fists']) { r0.setWeapon(w); step(0.05); render(); }
  r0.setWeapon('melee1h', 'baton'); r0.setWeapon('melee2h', 'hammer');
  r0.setGlow(0x40ff80); step(0.05); render(); r0.setGlow(null);
  for (const a of ['attack', 'shoot', 'cast', 'hit', 'special', 'emote', 'jump', 'die']) RIGS.forEach((r) => r.play(a));
  for (let i = 0; i < 30; i++) { step(1 / 30); render(); }
  RIGS[1].dispose(); RIGS[12].dispose();   // a humanoid sharing nothing special + a creature
  for (let i = 0; i < 5; i++) { step(1 / 30); render(); }
  out.stillRendering = RIGS[3].root.visible;
  out.heights = RIGS.map((r) => +r.height.toFixed(2));
  out.radii = RIGS.map((r) => +r.radius.toFixed(2));
  return out;
});
console.log(JSON.stringify(res));
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK');
