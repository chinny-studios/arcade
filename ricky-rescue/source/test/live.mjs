// Real input in real time: title → quick shift → respond with Enter → drive with W/D → lights with Q →
// get out with F → rear doors with E → take the stretcher → into the house → care panel → gloves by click.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const outDir = path.join(here, 'out'); fs.mkdirSync(outDir, { recursive: true });
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + path.resolve(here, '../../index.html') + '#debug');
await page.waitForFunction(() => window.RR, null, { timeout: 60000 });
await page.evaluate(() => { localStorage.clear(); });
const ev = (f, a) => page.evaluate(f, a);
// SwiftShader draws a frame or two a second: wait on conditions rather than fixed times
const waitFor = async (fn, ms = 20000) => { try { await page.waitForFunction(fn, null, { timeout: ms, polling: 100 }); return true; } catch { return false; } };
const frames = (n = 2) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const check = (name, ok, info) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) errors.push('check failed: ' + name); };
await page.waitForTimeout(500);
// title menu: Quick shift
await page.locator('#titleMenu button', { hasText: 'Quick shift' }).click();
await page.waitForFunction(() => document.body.dataset.state === 'play', null, { timeout: 30000 });
check('quick shift starts', true);
await page.waitForFunction(() => RR.C && RR.C.stage === 'pending', null, { timeout: 60000 });
check('a call is dispatched', true, await ev(() => RR.C.nature));
await page.keyboard.press('Enter');
check('Enter responds', await waitFor(() => RR.C.stage === 'enroute'));
check('lights on automatically for P1', await ev(() => RR.C.pri !== 1 || RR.RIG.siren));
const s0 = await ev(() => RR.RIG.siren);
await page.keyboard.press('KeyQ');
check('Q toggles lights & sirens', await waitFor(`RR.RIG.siren === ${!s0}`));
await page.keyboard.press('KeyQ'); await waitFor(`RR.RIG.siren === ${s0}`);
await page.keyboard.down('KeyW');
check('W drives forward', await waitFor(() => RR.RIG.v > 2, 30000), await ev(() => RR.RIG.v));
await page.keyboard.down('KeyD'); await frames(3); await page.keyboard.up('KeyD');
await page.keyboard.up('KeyW');
await page.keyboard.down('KeyS'); await waitFor(() => RR.RIG.v < 0.5, 30000); await page.keyboard.up('KeyS');
await page.screenshot({ path: path.join(outDir, 'live1_drive.png') });
// jump to the scene and park
await ev(() => { RR.toScene({ waitPD: true }); RR.RIG.v = 0; });
await frames(2);
await page.keyboard.press('KeyF');
check('F gets out', await waitFor(() => RR.G.where === 'foot'));
// walk to the rear doors: teleport near, then press E
await ev(() => { const A = RR.RIG, fx = Math.sin(A.yaw), fz = Math.cos(A.yaw); RR.PLAYER.x = A.x - fx * (A.len / 2 + 1.4); RR.PLAYER.z = A.z - fz * (A.len / 2 + 1.4); });
await waitFor(() => RR.HUD.prompts.some((p) => p.label.startsWith('Rear')));
const pr = await ev(() => RR.HUD.prompts.map((p) => p.label));
check('rear-door prompt', pr.some((p) => p.startsWith('Rear doors')), pr);
// cycle to it with Tab if it isn't first
for (let k = 0; k < 3; k++) { const cur = await ev(() => RR.HUD.prompts[RR.HUD.promptIdx % RR.HUD.prompts.length].label); if (cur.startsWith('Rear')) break; await page.keyboard.press('Tab'); await frames(2); }
await page.keyboard.press('KeyE');
await waitFor(() => RR.UI.isOpen('rear'));
check('E opens the rear doors', await ev(() => RR.UI.isOpen('rear')), await ev(() => ({ open: [...RR.UI.open], pr: RR.HUD.prompts.map((p) => p.label), idx: RR.HUD.promptIdx, where: RR.G.where, x: RR.PLAYER.x, busy: RR.PLAYER.busy, act: document.activeElement && document.activeElement.tagName })));
await page.locator('#rearList button', { hasText: 'Take the stretcher' }).click();
check('taking the stretcher', await waitFor(() => RR.PLAYER.push));
// walk with the stretcher for a moment
const x0 = await ev(() => RR.PLAYER.x + RR.PLAYER.z);
await page.keyboard.down('KeyS'); await waitFor(`Math.abs(RR.PLAYER.x + RR.PLAYER.z - ${x0}) > 0.5`); await page.keyboard.up('KeyS');
check('walking with the stretcher', true);
await page.screenshot({ path: path.join(outDir, 'live2_stretcher.png') });
// to the patient (indoors if needed): put the stretcher down first if it's a walk-up
await page.keyboard.press('KeyQ');
check('Q sets the stretcher down', await waitFor(() => !RR.PLAYER.push));
await ev(() => { const C = RR.C; if (C.indoor) { RR.PLAYER.x = C.place.x; RR.PLAYER.z = C.place.z; } });
await frames(3);
if (await ev(() => RR.C.indoor)) {
  const lab = await ev(() => RR.HUD.prompts.map((p) => p.label));
  check('door prompt', lab.some((l) => l.startsWith('Go in')), lab);
  for (let k = 0; k < 3; k++) { const cur = await ev(() => RR.HUD.prompts[RR.HUD.promptIdx % RR.HUD.prompts.length].label); if (cur.startsWith('Go in')) break; await page.keyboard.press('Tab'); await frames(2); }
  await page.keyboard.press('KeyE');
  check('E goes inside', await waitFor(() => RR.PLAYER.sp === 'int'));
}
await ev(() => { const P = RR.P; RR.PLAYER.x = P.where.x + 1.2; RR.PLAYER.z = P.where.z + 0.4; });
await waitFor(() => RR.HUD.prompts.some((p) => p.label.startsWith('Care')));
for (let k = 0; k < 4; k++) { const cur = await ev(() => RR.HUD.prompts.length ? RR.HUD.prompts[RR.HUD.promptIdx % RR.HUD.prompts.length].label : ''); if (cur.startsWith('Care')) break; await page.keyboard.press('Tab'); await frames(2); }
await page.keyboard.press('KeyE');
check('E opens patient care', await waitFor(() => RR.CARE.open));
await page.locator('#careActs button', { hasText: 'Gloves & PPE' }).click();
check('clicking Gloves & PPE does it', await waitFor(() => RR.C.ppe, 40000));
await page.locator('#careTabs button', { hasText: 'Vitals' }).click(); await page.waitForTimeout(200);
await page.locator('#w-partner').click(); await page.waitForTimeout(100);
await page.locator('#careActs button', { hasText: 'Blood pressure' }).click();
// she may be busy with something she started herself: then the BP is queued for her next
check('Marisol takes the BP', await waitFor(() => (RR.WORK.partner && RR.WORK.partner.id === 'bp') || RR.WORK.queue.partner === 'bp' || RR.P.known.has('bp')));
await page.screenshot({ path: path.join(outDir, 'live3_care.png') });
await page.keyboard.press('Escape');
check('Esc closes care', await waitFor(() => !RR.CARE.open));
await page.keyboard.press('Escape');
check('Esc pauses', await waitFor(() => RR.UI.isOpen('pause')));
await page.locator('#pResume').click();
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('OK, no errors');
