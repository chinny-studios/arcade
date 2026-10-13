// Like smoke.mjs but builds a private page (test/out/ms_index.html) that also exposes the mission API on AR.ms.
//   node test/missions_smoke.mjs --steps test/ms_steps.js [--log]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const outDir = path.join(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js')).sort();
let js = "(function(){'use strict';\n" + files.map((f) => '// ===== ' + f + ' =====\n' + fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n') + '\n})();\n';
js = js.replace('if (DEBUG) window.AR = {', 'if (DEBUG) window.AR = { ms: { MS, requestMissions, acceptMission, abandonMission, missionDoor, missionTick, missionZoneChanged, missionMarkers, questList, questDialog, ms_qAccept, ms_qComplete, ms_complete, ms_get, giveXp, spawnNpc, ENTS, removeItem, kill, entsNear, mobStats, groundY, randomDoorIn, makeInteriorDef }, ');
const page = fs.readFileSync(path.join(root, 'src', 'page.html'), 'utf8');
const i = page.indexOf('<div id="app">');
const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + page.slice(0, i) + '</head>\n<body>\n' + page.slice(i) +
  '\n<script>' + fs.readFileSync(path.join(root, 'vendor', 'three.min.js'), 'utf8') + '</script>\n<script>\n' + js + '</script>\n</body>\n</html>\n';
const pagePath = path.join(outDir, 'ms_index.html');
fs.writeFileSync(pagePath, html);
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page_ = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page_.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (args.includes('--log')) console.log('[page]', m.text()); });
page_.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
await page_.exposeFunction('__shot', async (name) => { await page_.screenshot({ path: path.join(outDir, name + '.png') }); return true; });
await page_.goto('file://' + pagePath + '#debug');
await page_.waitForFunction(() => window.AR && window.AR.ready, null, { timeout: 90000 }).catch((e) => errors.push('never ready: ' + e.message));
await page_.waitForTimeout(500);
const steps = opt('--steps');
if (steps) {
  const body = fs.readFileSync(steps, 'utf8');
  try {
    const res = await page_.evaluate(`(async () => { const AR = window.AR; const shot = (n) => window.__shot(n); const wait = (ms) => new Promise(r => setTimeout(r, ms));\n${body}\n})()`);
    console.log(JSON.stringify(res, null, 1));
  } catch (e) { errors.push('steps: ' + e.message); }
}
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK, no errors');
