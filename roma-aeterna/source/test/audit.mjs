// Geometry audit: renders the whole city from many walkable points and around every place, and reports surfaces seen
// from behind (magenta under the audit material: a missing or reversed face, or a camera inside something) and
// z-fighting (pixels that change when only the depth range moves), grouped by the source lines that made them.
//   node test/audit.mjs [--grid 14] [--dirs 3] [--far 200] [--only forum,pantheon] [--shots 40] [--w 480 --h 270]
//                       [--part k/n] [--out name]   (split a sweep over several browsers)
// Writes test/out/audit/report.json, report.txt and screenshots of the worst views.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(url.fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const outDir = path.join(here, 'out', opt('--out', 'audit'));
fs.mkdirSync(outDir, { recursive: true });

// the instrumented page: the built game with audit_inject.js spliced in just before boot()
const html = fs.readFileSync(path.resolve(here, '../../index.html'), 'utf8');
const at = html.lastIndexOf('\nboot();\n');
const inject = fs.readFileSync(path.join(here, 'audit_inject.js'), 'utf8');
const page_ = html.slice(0, at + 1) + inject + html.slice(at + 1);
const pagePath = path.join(outDir, 'audit.html');
fs.writeFileSync(pagePath, page_);

// bundle line -> src file:line (build.py joins src/*.js with "\n" after the IIFE header line)
const lines = page_.split('\n');
const head = lines.findIndex((l) => l.startsWith("(function(){'use strict';")) + 1; // 1-based line of the header
const files = fs.readdirSync(path.join(here, '../src')).filter((f) => f.endsWith('.js')).sort();
const starts = []; let ln = head + 1;
for (const f of files) { starts.push([ln, f]); ln += fs.readFileSync(path.join(here, '../src', f), 'utf8').split('\n').length; }
const injAt = page_.slice(0, at + 1).split('\n').length, injN = inject.split('\n').length - 1;
const srcOf = (L) => {
  if (!L) return '?';
  if (L >= injAt) L -= injN; // lines after the splice
  let k = 0; while (k + 1 < starts.length && starts[k + 1][0] <= L) k++;
  return starts[k][1].replace('.js', '') + ':' + (L - starts[k][0] + 1);
};

const W = +opt('--w', 480), H = +opt('--h', 270), grid = +opt('--grid', 14), only = opt('--only', '').split(',').filter(Boolean);
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const t0 = Date.now();
await page.goto('file://' + pagePath + '#debug');
await page.waitForFunction(() => window.RA && window.__AUDIT, null, { timeout: 60000 });
await page.evaluate(async (far) => {
  __AUDIT.prepare(); await RA.start({ hour: 11 }); RA.G.state = 'audit'; __AUDIT.quiet(); __AUDIT.backs();
  // no shadow pass (it doubles the cost of a frame), and a short view: anything farther is seen from a nearer point
  RA.R.sun.castShadow = false; RA.R.renderer.shadowMap.enabled = false;
  RA.R.camera.far = +far; RA.R.camera.updateProjectionMatrix();
  document.querySelectorAll('#hud, #banner, #fps, .hud').forEach((e) => { e.style.visibility = 'hidden'; });
}, opt('--far', 200));
console.log('built in', ((Date.now() - t0) / 1000).toFixed(0), 's');

// --probe x,y,z,yaw,pitch,px,py: list every surface along one pixel's ray, and the solids round the camera
if (opt('--probe')) {
  const [x, y, z, yaw, pitch, px, py] = opt('--probe').split(',').map(Number);
  const r = await page.evaluate((a) => { const A = __AUDIT; A.view(a[0], a[1], a[2], a[3], a[4]); const f = A.hits(a[5], a[6], a[7], a[8], 12), b = A.hits(a[5], a[6], a[7], a[8], 6, true); b.forEach((h) => { h.back = 'B'; }); return f.concat(b).sort((p, q) => p.d - q.d); }, [x, y, z, yaw, pitch, px, py, W, H]);
  const SITES = await page.evaluate(() => __AUDIT.SITES);
  for (const h of r) console.log(h.d.toFixed(2).padStart(7), h.back === 'B' ? 'backmesh' : h.back ? 'BACK    ' : 'front   ', JSON.stringify(h.p), JSON.stringify(h.n), SITES[h.site].split(',').map((l) => srcOf(+l)).join(' < '));
  await browser.close(); process.exit(0);
}
// --look x,y,z,tx,ty,tz[,fov];... : save the detector's picture from free cameras (look_N.png)
if (opt('--look')) {
  let k = 0;
  for (const c of opt('--look').split(';')) {
    const [x, y, z, tx, ty, tz, fov] = c.split(',').map(Number);
    const url = await page.evaluate((a) => {
      const A = __AUDIT, cam = RA.R.camera, dx = a[3] - a[0], dy = a[4] - a[1], dz = a[5] - a[2];
      A.pos(a[0], a[1], a[2], Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
      const f0 = cam.fov; cam.fov = a[6] || f0; cam.updateProjectionMatrix(); const u = A.png(); cam.fov = f0; cam.updateProjectionMatrix(); return u;
    }, [x, y, z, tx, ty, tz, fov]);
    fs.writeFileSync(path.join(outDir, `look_${k++}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await browser.close(); process.exit(0);
}
// the views: walkable points on a grid, shop and stand spots, and an orbit round every place
let views = await page.evaluate(({ grid, only, dirs }) => {
  const A = __AUDIT, W = RA.W, out = [], seen = new Set();
  const near = (x, z) => !only.length || W.places.some((p) => only.includes(p.id) && Math.hypot(p.x - x, p.z - z) < Math.max(60, p.r * 2.5));
  const ground = (x, z, tag, n, pitchUp, fy) => {
    const k = Math.floor(x / grid) + ':' + Math.floor(z / grid);
    if (seen.has(k) || !near(x, z)) return; seen.add(k);
    const y = A.feet(x, z, fy) + 1.6;
    if (A.buried(x, y, z)) return;
    const y0 = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1 * Math.PI * 2; // the same views every run
    for (let i = 0; i < n; i++) out.push({ tag, x, y, z, yaw: y0 + i * Math.PI * 2 / n, pitch: 0.08 });
    if (pitchUp) out.push({ tag: tag + ':up', x, y, z, yaw: y0, pitch: 1.05 });
  };
  for (const s of W.spots) if (s.kind !== 'mill') ground(s.x, s.z, 'spot', dirs, true, s.y); // (a mill spot is the centre of the donkey's round)
  for (const n of W.nodes) ground(n.x, n.z, 'node', dirs, true);
  for (const p of W.places) {
    if (p.kind === 'district' || (only.length && !only.includes(p.id))) continue;
    const r = Math.max(14, p.r), g = A.feet(p.x, p.z);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.2, d = r * 1.7 + 8, x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d, y = g + r * 0.7 + 8;
      out.push({ tag: 'orbit:' + p.id, x, y, z, yaw: Math.atan2(x - p.x, z - p.z), pitch: -Math.atan2(y - g - 4, d) });
    }
  }
  return out;
}, { grid, only, dirs: +opt('--dirs', 3) });
// --part k/n: every n-th view starting at k, to split a sweep over several browsers
if (opt('--part')) { const [k, n] = opt('--part').split('/').map(Number); views = views.filter((v, i) => i % n === k); }
console.log(views.length, 'views');

const found = [];
let ms = [0, 0, 0];
const B = 24;
for (let i = 0; i < views.length; i += B) {
  const batch = views.slice(i, i + B);
  const res = await page.evaluate((vs) => vs.map((v) => __AUDIT.view(v.x, v.y, v.z, v.yaw, v.pitch)), batch);
  res.forEach((r, k) => { ms = ms.map((m, j) => m + r.ms[j]); if (r.mag.length || r.zf.length) found.push({ v: batch[k], ...r }); });
  if ((i / B) % 10 === 0) console.log(`${i + batch.length}/${views.length} views, ${found.length} with findings, ${((Date.now() - t0) / 1000).toFixed(0)} s, ms/view ${ms.map((m) => Math.round(m / (i + batch.length))).join('/')}`);
}
const SITES = await page.evaluate(() => __AUDIT.SITES);
const siteName = (i) => SITES[i].split(',').map((l) => srcOf(+l)).join(' < ');

// group by the source of the nearest hit
const groups = new Map();
for (const f of found) for (const [kind, list] of [['inside', f.mag], ['zfight', f.zf]]) for (const c of list) {
  const h0 = c.hits[0]; if (!h0) continue;
  let key = kind + ' ' + siteName(h0.site);
  if (kind === 'zfight') { const h1 = c.hits.find((h, j) => j > 0 && Math.abs(h.d - h0.d) < 0.25); key += h1 ? '  vs  ' + siteName(h1.site) : '  vs  (single)'; }
  const g = groups.get(key) || { key, kind, px: 0, views: 0, ex: [] };
  g.px += c.n; g.views++;
  if (g.ex.length < 6) g.ex.push({ v: f.v, px: c.px, p: h0.p, back: h0.back, d: Math.round(h0.d * 10) / 10 });
  groups.set(key, g);
}
const list = [...groups.values()].sort((a, b) => b.px - a.px);
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ views: views.length, found: found.length, groups: list }, null, 1));
const txt = list.map((g) => `${g.kind.padEnd(6)} ${String(g.px).padStart(7)} px ${String(g.views).padStart(4)} views  ${g.key.slice(g.kind.length + 1)}\n        e.g. ${g.ex.slice(0, 3).map((e) => `[${e.p}] ${e.v.tag}`).join('  ')}`).join('\n');
fs.writeFileSync(path.join(outDir, 'report.txt'), txt + '\n');

// screenshots of the worst views: the whole view, and a close-up aimed at the hit
const nShots = +opt('--shots', 30);
let s = 0;
for (const g of list.slice(0, nShots)) {
  const e = g.ex.sort((a, b) => a.d - b.d)[0];
  const tag = String(s).padStart(2, '0') + '_' + g.kind;
  const save = (f, url) => fs.writeFileSync(path.join(outDir, f), Buffer.from(url.split(',')[1], 'base64'));
  save(tag + '.png', await page.evaluate((v) => { __AUDIT.view(v.x, v.y, v.z, v.yaw, v.pitch); return __AUDIT.png(); }, e.v));
  save(tag + '_zoom.png', await page.evaluate(({ v, p }) => {
    const A = __AUDIT, cam = RA.R.camera, dx = p[0] - v.x, dy = p[1] - v.y, dz = p[2] - v.z;
    A.pos(v.x, v.y, v.z, Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
    const f0 = cam.fov; cam.fov = Math.max(4, Math.min(40, 2 * Math.atan2(3, Math.hypot(dx, dy, dz)) * 180 / Math.PI)); cam.updateProjectionMatrix();
    const url = A.png(); cam.fov = f0; cam.updateProjectionMatrix(); return url;
  }, { v: e.v, p: e.p }));
  g.shot = s++;
}
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ views: views.length, found: found.length, groups: list }, null, 1));
await browser.close();
console.log(txt.split('\n').slice(0, 60).join('\n'));
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 10).join('\n')); process.exit(1); }
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${views.length} views, ${found.length} with findings, ${list.length} groups`);
