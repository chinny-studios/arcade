// Headless check: loads the built page, runs AI-vs-AI skirmishes on every map and fails on any page error.
// Usage: node test/smoke.mjs [outDir]   (serves ../index.html itself)
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url));
const page = fs.readFileSync(path.join(here, '..', '..', 'index.html'));
const out = process.argv[2];
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(page); }).listen(0);
const port = srv.address().port;
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message + '\n' + e.stack));
p.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_|net::/.test(m.text())) errors.push(m.text()); });
await p.goto(`http://localhost:${port}/#debug`);
await p.waitForTimeout(500);
if (out) await p.screenshot({ path: path.join(out, 'title.png') });
const rulesFails = await p.evaluate(`(async () => { ${fs.readFileSync(path.join(here, 'rules.js'), 'utf8')} })()`);
console.log('rules:', rulesFails.length ? 'FAIL\n  ' + rulesFails.join('\n  ') : 'all passed');
const maps = ['crossfire', 'twinrivers', 'saltmarsh', 'highland'];
const cos = [['kade', 'volsk'], ['halden', 'strann'], ['okafor', 'grosz'], ['kade', 'strann']];
let fail = errors.length > 0 || rulesFails.length > 0;
for (let i = 0; i < maps.length; i++) {
  const t0 = Date.now();
  const r = await p.evaluate(([map, coP, coE, fog]) => SF.sim({ map, coP, coE, fog }, 35), [maps[i], cos[i][0], cos[i][1], i % 2 === 1]);
  console.log(maps[i], cos[i].join('/'), 'fog', i % 2 === 1, '->', JSON.stringify({ winner: r.winner, day: r.day, how: r.how, units: r.units, props: r.props }),
    'built', r.stats.map((s) => s.built), 'kills', r.stats.map((s) => s.kills), (Date.now() - t0) + 'ms');
  if (out) await p.screenshot({ path: path.join(out, 'sim-' + maps[i] + '.png') });
}
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); fail = true; }
await browser.close();
srv.close();
process.exit(fail ? 1 : 0);
