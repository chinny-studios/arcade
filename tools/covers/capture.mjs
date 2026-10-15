// Screenshot a game for its card on the arcade index.
//
//   node tools/covers/capture.mjs <game> [<game> ...]   writes <game>/cover.webp
//   node tools/covers/capture.mjs --all
//   options: --out <dir>  write <dir>/<game>.png (+ every candidate shot) instead of the cover
//            --keep       also keep the full-size PNGs in tools/covers/out/
//
// Each game has a recipe in recipes/<game>.mjs that drives it to a good moment and calls shot().
// Needs Playwright (npm i -g playwright, or the copy in /opt/node22) and python3 with Pillow
// (or ffmpeg) for the WebP. Runs headless with SwiftShader, so WebGL works without a GPU but slowly:
// one game takes 20 s to 4 min. Run two at a time at most.
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';
import url from 'url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const outDir = opt('--out');
const keep = args.includes('--keep');
const allRecipes = fs.readdirSync(path.join(here, 'recipes')).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).map((f) => f.slice(0, -4));
const games = args.includes('--all') ? allRecipes : args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
if (!games.length) { console.log('usage: node tools/covers/capture.mjs <game>... | --all   recipes: ' + allRecipes.join(' ')); process.exit(1); }

// ---- static server for the repo, so relative paths (music, saves) behave as on GitHub Pages ----
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(repo, path.normalize(p));
  if (!f.startsWith(repo) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

// ---- CDN shim: the older single-file games load three.js from a CDN. Sandboxes often block CDNs,
// so serve the same build from the npm registry tarball (cached in .cache/), else let it through. ----
const cache = path.join(here, '.cache');
function npmFile(version, file) {
  const dir = path.join(cache, 'three-' + version);
  const f = path.join(dir, 'package', file);
  if (!fs.existsSync(f)) {
    fs.mkdirSync(dir, { recursive: true });
    const tgz = path.join(dir, 'three.tgz');
    execFileSync('curl', ['-sSfL', '-o', tgz, `https://registry.npmjs.org/three/-/three-${version}.tgz`]);
    execFileSync('tar', ['xzf', tgz, '-C', dir]);
  }
  return f;
}
function cdnFile(u) {
  let m = u.match(/^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r(\d+)\/(three(?:\.min)?\.js)$/);
  if (m) return npmFile(`0.${m[1]}.0`, 'build/' + m[2]);
  m = u.match(/^https:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/three@([\d.]+)\/(.+)$/);
  if (m) return npmFile(m[1], m[2]);
  return null;
}

const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0;
for (const game of games) {
  const t0 = Date.now();
  const mod = await import(path.join(here, 'recipes', game + '.mjs'));
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route(/^https:\/\//, async (route) => {
    const u = route.request().url();
    try {
      const f = cdnFile(u);
      if (f) return route.fulfill({ path: f, contentType: 'text/javascript' });
      if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) {
        const body = execFileSync('curl', ['-sSf', '--max-time', '20', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36', u]);
        return route.fulfill({ body, contentType: u.includes('googleapis') ? 'text/css' : 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
      }
    } catch { /* fall through to the network */ }
    return route.continue();
  });
  // Capture-only patches, e.g. exposing a player object hidden inside an IIFE. Never written to the repo.
  if (mod.patch) await ctx.route(new RegExp(`^${base.replace(/[./]/g, '\\$&')}${game}/(index\\.html)?$`), (route) => {
    let html = fs.readFileSync(path.join(repo, game, 'index.html'), 'utf8');
    for (const [a, b] of mod.patch) { if (!html.includes(a)) console.log(`  ${game}: patch target not found: ${a}`); html = html.replace(a, b); }
    route.fulfill({ body: html, contentType: 'text/html' });
  });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const pngDir = outDir || path.join(here, 'out');
  fs.mkdirSync(pngDir, { recursive: true });
  let final = null;
  const shot = async (name) => {
    const p = path.join(pngDir, `${game}${name ? '-' + name : ''}.png`);
    await page.screenshot({ path: p, timeout: 180000 });
    if (!name) final = p;
    return p;
  };
  try {
    await mod.default({ page, shot, url: base + game + '/', wait: (ms) => page.waitForTimeout(ms) });
    if (!final) throw new Error('recipe never called shot() for the cover');
    if (!outDir) {
      const dest = path.join(repo, game, 'cover.webp');
      toWebp(final, dest, mod.crop);
      console.log(`${game}: ${path.relative(repo, dest)} ${Math.round(fs.statSync(dest).size / 1024)} KB in ${Math.round((Date.now() - t0) / 1000)} s`);
      if (!keep) fs.rmSync(final);
    } else console.log(`${game}: ${path.relative(process.cwd(), final)} in ${Math.round((Date.now() - t0) / 1000)} s`);
  } catch (e) {
    failed++;
    console.log(`${game}: FAILED ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: path.join(pngDir, game + '-error.png') }).catch(() => {});
  }
  if (errors.length) console.log(`  ${game} page errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);

// 1280x720 PNG -> 800x450 WebP, after an optional crop box [x0, y0, x1, y1] (centre-cropped to 16:9).
function toWebp(src, dest, crop) {
  const py = `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
if sys.argv[3]: im = im.crop(tuple(int(v) for v in sys.argv[3].split(',')))
w, h = im.size
if w / h > 16 / 9: nw = round(h * 16 / 9); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
elif w / h < 16 / 9: nh = round(w * 9 / 16); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
im.resize((800, 450), Image.LANCZOS).save(sys.argv[2], 'WEBP', quality=78, method=6)
`;
  try { execFileSync('python3', ['-c', py, src, dest, crop ? crop.join(',') : ''], { stdio: 'pipe' }); return; } catch { /* no Pillow */ }
  const vf = (crop ? `crop=${crop[2] - crop[0]}:${crop[3] - crop[1]}:${crop[0]}:${crop[1]},` : '') + 'scale=800:450:force_original_aspect_ratio=increase,crop=800:450';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', vf, '-quality', '78', dest]);
}
