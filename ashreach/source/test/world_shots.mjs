// Headless screenshots + stats for every zone of the world viewer.
//   node test/world_shots.mjs [zoneId ...] [--markers]
// Writes test/out/world_<zone>_<view>.png and prints build ms, draw calls, triangles, POI and exit ids.
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
const args = process.argv.slice(2);
const want = args.filter((a) => !a.startsWith('--'));
const VIEWS = {
  landfall: [['over', 'lookAt', 0, 300, 520, 0, 0, -60], ['start', 'eye', 0, 280, Math.PI], ['port', 'lookAt', -40, 12, 240, 30, 5, 330], ['wreck', 'lookAt', 230, 6, -200, 300, 6, -285], ['den', 'lookAt', -345, 4, -40, -390, 3, -60]],
  halden: [['over', 'lookAt', 260, 180, 330, 0, 0, 0], ['plaza', 'lookAt', 36, 2, 52, 0, 5, 0], ['shops', 'lookAt', 30, 2, 5, 120, 4, -25], ['port', 'lookAt', 0, 6, 110, 0, 5, 170], ['gate', 'lookAt', 150, 2, 0, 240, 8, 0], ['embassy', 'lookAt', -90, 3, 8, -176, 30, 0]],
  dustbowl: [['over', 'lookAt', -900, 300, 500, 0, 0, 0], ['outpost', 'lookAt', -360, 5, 70, -425, 3, 40], ['camp', 'lookAt', 360, 8, -380, 440, 3, -430], ['river', 'eye', 140, 120, Math.PI], ['bucket', 'lookAt', -10, 8, 380, -80, 12, 440]],
  greenhollow: [['over', 'lookAt', -800, 260, 400, 0, 0, 0], ['bog', 'lookAt', -330, 5, 120, -230, 2, 250], ['spore', 'eye', 30, -200, Math.PI * 0.85], ['cult', 'lookAt', 360, 8, 80, 430, 5, 140], ['proc', 'lookAt', -250, 10, -250, -330, 30, -320]],
  broken_mesa: [['over', 'lookAt', -700, 320, 500, 0, 0, 0], ['outpost', 'lookAt', -40, 6, -40, -100, 4, 30], ['canyon', 'eye', 100, -80, -2.1], ['foundry', 'lookAt', 200, 8, 380, 240, 8, 490], ['arch', 'lookAt', -500, 6, 0, -410, 20, -10]],
  lumen_scar: [['over', 'lookAt', -800, 280, 600, 0, 0, 0], ['outpost', 'lookAt', -500, 6, 450, -560, 4, 380], ['pylon', 'lookAt', 200, 6, 160, 280, 20, 80], ['crater', 'lookAt', 400, 20, 300, 560, 0, 470]],
  smugglers_den: [['over', 'top'], ['entry', 'arrive']],
  sunken_foundry: [['over', 'top'], ['entry', 'arrive']],
};
const MISSIONS = ['office', 'warehouse', 'lab', 'bunker', 'cave', 'foundry'];
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
await page.goto('file://' + path.join(here, 'world_view.html'));
await page.waitForFunction(() => window.WV, null, { timeout: 60000 });
await page.evaluate(() => document.body.classList.add('hideui'));
const zones = want.length ? want : [...Object.keys(VIEWS), ...MISSIONS.map((t) => 'mission:' + t)];
const report = [];
for (const z of zones) {
  const isM = z.startsWith('mission:');
  const res = await page.evaluate(([z, isM, markers]) => {
    const r = isM ? WV.mission(z.slice(8), 'm', 77) : WV.load(z);
    if (markers) WV.markers(true);
    const d = WV.ZONE.def;
    return { ...r, poiIds: d.pois.map((p) => p.id + ':' + p.type), exits: d.exits.map((e) => e.to + '/' + e.poi), spawns: d.spawns.length, rooms: (d.rooms || []).length, size: d.size };
  }, [z, isM, args.includes('--markers')]);
  const views = isM ? [['over', 'top'], ['entry', 'arrive']] : VIEWS[z] || [['over', 'top']];
  res.views = {};
  for (const v of views) {
    const st = await page.evaluate((v) => {
      const d = WV.ZONE.def;
      if (v[1] === 'top') WV.view(0, d.size * 0.62, d.size * 0.32, 0, -1.1);
      else if (v[1] === 'arrive') { const p = d.pois.find((q) => q.type === 'arrive'); WV.eye(p.x, p.z, p.yaw + Math.PI, -0.08); }
      else if (v[1] === 'eye') WV.eye(v[2], v[3], v[4]);
      else { const [x, y, z, tx, ty, tz] = v.slice(2); WV.lookAt(x, WV.groundY(x, z) + y, z, tx, WV.groundY(tx, tz) + ty, tz); }
      const fog = [scene.fog.near, scene.fog.far];
      if (v[0] === 'over') { scene.fog.near = 400; scene.fog.far = 2600; }
      WV.tick(0.016); WV.tick(0.3);
      const st = WV.stats();
      scene.fog.near = fog[0]; scene.fog.far = fog[1];
      return st;
    }, v);
    await page.screenshot({ path: path.join(outDir, 'world_' + z.replace(':', '_') + '_' + v[0] + '.png') });
    res.views[v[0]] = st;
  }
  report.push(res);
  console.log(`${res.id.padEnd(16)} build ${res.ms.toFixed(0).padStart(5)} ms  size ${res.size}  spawns ${res.spawns}  rooms ${res.rooms}  ` + Object.entries(res.views).map(([k, s]) => `${k}: ${s.calls}c/${(s.tris / 1000).toFixed(0)}k`).join('  '));
  if (args.includes('--ids')) console.log('   pois:', res.poiIds.join(', '), '\n   exits:', res.exits.join(', '));
}
fs.writeFileSync(path.join(outDir, 'world_report.json'), JSON.stringify(report, null, 1));
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); process.exit(1); }
console.log('OK');
