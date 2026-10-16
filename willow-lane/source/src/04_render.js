// Willow Lane — renderer, camera rig, lights, sky, procedural textures (floors, wallpapers, grass) and the neighbourhood around the lot

const LOT_W = 30, LOT_D = 26;     // lot size in tiles (1 tile = 1 m)
const WALL_H = 2.8, WALL_T = 0.14, WALL_LOW = 0.32;

const R = {};
function initRender() {
  const canvas = $('#c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  R.renderer = renderer;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ccbea);
  R.scene = scene;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
  R.camera = camera;
  R.cam = { tx: LOT_W / 2, tz: LOT_D / 2 + 2, yaw: Math.PI / 4, yawT: Math.PI / 4, pitch: 0.86, dist: 34, distT: 34, follow: null };

  R.hemi = new THREE.HemisphereLight(0xdfefff, 0x6a7a4a, 0.75);
  scene.add(R.hemi);
  R.amb = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(R.amb);
  const sun = new THREE.DirectionalLight(0xfff2dc, 0.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 120;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  R.sun = sun;
  // pool of warm point lights handed to the lamps nearest the camera after dark
  R.lampLights = [];
  for (let i = 0; i < 6; i++) { const L = new THREE.PointLight(0xffc880, 0, 8, 1.3); L.position.set(0, -50, 0); scene.add(L); R.lampLights.push(L); }

  R.raycaster = new THREE.Raycaster();
  R.groundPlane = new THREE.Plane(new V3(0, 1, 0), 0);
  buildTextures();
  buildNeighbourhood();
  onResize();
  window.addEventListener('resize', onResize);
}
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
}

// ---------- camera ----------
function updateCamera(dt) {
  const c = R.cam;
  if (c.follow && c.follow.model && c.follow.model.visible) { c.tx = lerp(c.tx, c.follow.x, Math.min(1, dt * 4)); c.tz = lerp(c.tz, c.follow.z, Math.min(1, dt * 4)); }
  c.yaw += angWrap(c.yawT - c.yaw) * Math.min(1, dt * 8);
  c.dist = lerp(c.dist, c.distT, Math.min(1, dt * 8));
  c.tx = clamp(c.tx, -10, LOT_W + 10); c.tz = clamp(c.tz, -8, LOT_D + 10);
  const pitch = lerp(0.62, 0.98, clamp((c.dist - 8) / 40, 0, 1)) * c.pitch / 0.86;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  R.camera.position.set(c.tx + Math.sin(c.yaw) * cp * c.dist, sp * c.dist, c.tz + Math.cos(c.yaw) * cp * c.dist);
  R.camera.lookAt(c.tx, 0.6, c.tz);
}
// view direction on the ground plane (from the camera toward the target)
const viewDir = () => [-Math.sin(R.cam.yaw), -Math.cos(R.cam.yaw)];
function camPan(dx, dz) {
  const c = R.cam, s = Math.sin(c.yaw), co = Math.cos(c.yaw);
  // dx: right, dz: forward (away from the camera)
  c.tx += co * dx - s * dz; c.tz += -s * dx - co * dz;
  c.follow = null;
}
function screenToGround(px, py) {
  const ndc = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
  R.raycaster.setFromCamera(ndc, R.camera);
  const p = new V3();
  return R.raycaster.ray.intersectPlane(R.groundPlane, p) ? p : null;
}
function pickAt(px, py, list) {
  const ndc = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
  R.raycaster.setFromCamera(ndc, R.camera);
  const hits = R.raycaster.intersectObjects(list, true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.pick) o = o.parent; if (o && o.visible !== false && isShown(o)) return { pick: o.userData.pick, point: h.point }; }
  return null;
}
function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function worldToScreen(x, y, z) {
  _v1.set(x, y, z).project(R.camera);
  return { x: (_v1.x + 1) / 2 * window.innerWidth, y: (1 - _v1.y) / 2 * window.innerHeight, vis: _v1.z < 1 && _v1.z > -1 };
}

// ---------- sky & light by time of day ----------
const SKY_KEYS = [ // hour, sky colour, sun intensity, hemi intensity, sun colour
  [0, 0x0d1830, 0.0, 0.22, 0x8090c0], [5, 0x1a2848, 0.0, 0.26, 0x8090c0], [6.3, 0xe8a888, 0.35, 0.5, 0xffb080],
  [8, 0x9ccbea, 0.85, 0.72, 0xfff0d8], [12, 0x8cc4ee, 1.0, 0.8, 0xffffff], [17, 0x9cc8e6, 0.85, 0.72, 0xfff0d8],
  [19, 0xf0a070, 0.45, 0.55, 0xff9a60], [20.3, 0x3a3060, 0.05, 0.36, 0x9080c0], [22, 0x0d1830, 0.0, 0.24, 0x8090c0], [24, 0x0d1830, 0.0, 0.22, 0x8090c0],
];
function lightLevel(h = hourF()) { // 0 = night, 1 = day
  return clamp(Math.min((h - 5.6) / 1.6, (20.5 - h) / 1.6), 0, 1);
}
const isDark = (h = hourF()) => lightLevel(h) < 0.35;
function updateSky() {
  const h = hourF();
  let a = SKY_KEYS[0], b = SKY_KEYS[1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) if (h >= SKY_KEYS[i][0] && h <= SKY_KEYS[i + 1][0]) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  const t = (h - a[0]) / Math.max(0.001, b[0] - a[0]);
  R.scene.background.setHex(mixHex(a[1], b[1], t));
  R.sun.intensity = lerp(a[2], b[2], t);
  R.sun.color.setHex(mixHex(a[4], b[4], t));
  R.hemi.intensity = lerp(a[3], b[3], t);
  // sun arc: rises in the east (+x), sets in the west
  const ang = clamp((h - 6) / 14, 0, 1) * Math.PI;
  const sx = Math.cos(ang) * 30, sy = Math.max(6, Math.sin(ang) * 34), sz = -12;
  R.sun.position.set(LOT_W / 2 + sx, sy, LOT_D / 2 + sz);
  R.sun.target.position.set(LOT_W / 2, 0, LOT_D / 2);
  const night = 1 - lightLevel(h);
  R.amb.intensity = 0.1 + night * 0.12;
  R.amb.color.setHex(mixHex(0xffffff, 0x6070b0, night));
  for (const m of R.nightGlow) m.emissiveIntensity = night;
}

// ---------- materials ----------
const MAT = {};
function mat(color, opts) {
  const key = color + (opts ? JSON.stringify(opts) : '');
  if (!MAT[key]) {
    // colours are authored in sRGB; the renderer works in linear space
    const m = MAT[key] = new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
    m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear();
  }
  return MAT[key];
}

// ---------- procedural textures ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}
function noiseFill(g, w, h, base, amt, n = 900, size = 2) {
  g.fillStyle = cssHex(base); g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.fillStyle = cssHex(shadeHex(base, 1 + (Math.random() - 0.5) * amt)); g.fillRect(Math.random() * w, Math.random() * h, size, size); }
}

// Floor patterns. kind 'in' is shown first in the catalog, 'out' are paths and patios.
const FLOORS = [
  { id: 1, name: 'Honey Oak Planks', price: 10, draw: (g, s) => planks(g, s, 0xc89a5e) },
  { id: 2, name: 'Walnut Planks', price: 12, draw: (g, s) => planks(g, s, 0x7a5032) },
  { id: 3, name: 'Herringbone Parquet', price: 15, draw: (g, s) => parquet(g, s, 0xb8834e) },
  { id: 4, name: 'Diner Checkerboard', price: 8, draw: (g, s) => checker(g, s, 0xf2efe6, 0x2a2a30, 4) },
  { id: 5, name: 'Terracotta Tile', price: 9, draw: (g, s) => tiles(g, s, 0xc0663e, 0xe0d0b8, 2) },
  { id: 6, name: 'Seafoam Tile', price: 9, draw: (g, s) => tiles(g, s, 0x8ac8c0, 0xf0f0ea, 4) },
  { id: 7, name: 'Oatmeal Carpet', price: 6, draw: (g, s) => noiseFill(g, s, s, 0xd8c8a8, 0.12, 2400, 2) },
  { id: 8, name: 'Navy Carpet', price: 6, draw: (g, s) => noiseFill(g, s, s, 0x3a4a78, 0.18, 2400, 2) },
  { id: 9, name: 'Rose Carpet', price: 6, draw: (g, s) => noiseFill(g, s, s, 0xc87a86, 0.14, 2400, 2) },
  { id: 10, name: 'White Marble', price: 18, draw: (g, s) => marble(g, s) },
  { id: 11, name: 'Polished Concrete', price: 5, draw: (g, s) => noiseFill(g, s, s, 0xa8a8a4, 0.1, 1200, 3) },
  { id: 12, name: 'Linoleum Squares', price: 4, draw: (g, s) => checker(g, s, 0xe8e0c0, 0xd0c8a0, 2) },
  { id: 13, name: 'Flagstone Path', price: 7, out: true, draw: (g, s) => flagstone(g, s) },
  { id: 14, name: 'Brick Patio', price: 8, out: true, draw: (g, s) => bricks(g, s, 0xa85a40, 0xc8b8a0, true) },
  { id: 15, name: 'Garden Gravel', price: 3, out: true, draw: (g, s) => noiseFill(g, s, s, 0xb8b0a0, 0.35, 3000, 3) },
  { id: 16, name: 'Deck Boards', price: 10, out: true, draw: (g, s) => planks(g, s, 0x9a7a5a, true) },
];
const FLOOR = Object.fromEntries(FLOORS.map((f) => [f.id, f]));
function planks(g, s, c, wide) {
  const n = wide ? 4 : 6, ph = s / n;
  for (let i = 0; i < n; i++) {
    const cc = shadeHex(c, 0.9 + Math.random() * 0.2);
    g.fillStyle = cssHex(cc); g.fillRect(0, i * ph, s, ph);
    for (let k = 0; k < 14; k++) { g.fillStyle = cssHex(shadeHex(cc, 0.92 + Math.random() * 0.1)); g.fillRect(Math.random() * s, i * ph + Math.random() * ph, 10 + Math.random() * 30, 1); }
    g.fillStyle = cssHex(shadeHex(c, 0.6)); g.fillRect(0, i * ph, s, 1.5);
    const off = (i % 2) * s / 2 + s / 4; g.fillRect(off % s, i * ph, 1.5, ph);
  }
}
function parquet(g, s, c) {
  g.fillStyle = cssHex(c); g.fillRect(0, 0, s, s);
  const u = s / 8;
  for (let y = -2; y < 10; y++) for (let x = -2; x < 10; x++) {
    g.fillStyle = cssHex(shadeHex(c, 0.85 + Math.random() * 0.3));
    if ((x + y) % 2 === 0) g.fillRect(x * u, y * u, u * 2, u); else g.fillRect(x * u, y * u, u, u * 2);
  }
  g.strokeStyle = cssHex(shadeHex(c, 0.6)); g.lineWidth = 1;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(0, i * u); g.lineTo(s, i * u); g.stroke(); }
}
function checker(g, s, a, b, n) { const u = s / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = cssHex((x + y) % 2 ? b : a); g.fillRect(x * u, y * u, u, u); } }
function tiles(g, s, c, grout, n) {
  g.fillStyle = cssHex(grout); g.fillRect(0, 0, s, s);
  const u = s / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = cssHex(shadeHex(c, 0.92 + Math.random() * 0.14)); g.fillRect(x * u + 2, y * u + 2, u - 4, u - 4); }
}
function marble(g, s) {
  noiseFill(g, s, s, 0xf0eeea, 0.04, 600, 3);
  g.strokeStyle = 'rgba(120,120,130,0.25)';
  for (let i = 0; i < 6; i++) { g.beginPath(); let x = Math.random() * s, y = 0; g.moveTo(x, y); while (y < s) { x += (Math.random() - 0.5) * 20; y += 8; g.lineTo(x, y); } g.lineWidth = 0.5 + Math.random(); g.stroke(); }
  g.strokeStyle = 'rgba(180,180,180,0.6)'; g.strokeRect(0.5, 0.5, s - 1, s - 1);
}
function flagstone(g, s) {
  noiseFill(g, s, s, 0x6a8a4a, 0.2, 800, 2);
  const pts = [[0.25, 0.25], [0.72, 0.22], [0.28, 0.74], [0.74, 0.72]];
  for (const [px, py] of pts) {
    g.fillStyle = cssHex(shadeHex(0xb0a898, 0.85 + Math.random() * 0.25)); g.beginPath();
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, r = s * (0.18 + Math.random() * 0.05); g.lineTo(px * s + Math.cos(a) * r, py * s + Math.sin(a) * r); }
    g.fill();
  }
}
function bricks(g, s, c, mortar, herring) {
  g.fillStyle = cssHex(mortar); g.fillRect(0, 0, s, s);
  const bh = s / 8, bw = s / 4;
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { g.fillStyle = cssHex(shadeHex(c, 0.85 + Math.random() * 0.3)); g.fillRect(x * bw + (y % 2) * bw / 2 + 1.5, y * bh + 1.5, bw - 3, bh - 3); }
}

// Wallpapers: each is a 128×320 texture covering one wall face (1 m × 2.8 m)
const PAPERS = [
  { id: 1, name: 'Eggshell Paint', price: 2, draw: (g, w, h) => plain(g, w, h, 0xf0ebe0) },
  { id: 2, name: 'Sage Paint', price: 2, draw: (g, w, h) => plain(g, w, h, 0xb8c8a8) },
  { id: 3, name: 'Duck Egg Paint', price: 2, draw: (g, w, h) => plain(g, w, h, 0xa8d0d4) },
  { id: 4, name: 'Butter Paint', price: 2, draw: (g, w, h) => plain(g, w, h, 0xf0d890) },
  { id: 5, name: 'Terracotta Paint', price: 2, draw: (g, w, h) => plain(g, w, h, 0xd08a68) },
  { id: 6, name: 'Lilac Paint', price: 2, draw: (g, w, h) => plain(g, w, h, 0xc8b0d8) },
  { id: 7, name: 'Candy Stripe', price: 6, draw: (g, w, h) => stripes(g, w, h, 0xf4e8ec, 0xe0a8b8) },
  { id: 8, name: 'Mint Stripe', price: 6, draw: (g, w, h) => stripes(g, w, h, 0xe8f4ee, 0xa8d8c0) },
  { id: 9, name: 'Damask Navy', price: 9, draw: (g, w, h) => damask(g, w, h, 0x2a3a5a, 0x4a5a80) },
  { id: 10, name: 'Wainscot & Cream', price: 12, draw: (g, w, h) => wainscot(g, w, h, 0xf0e8d0, 0x6a8a6a) },
  { id: 11, name: 'Wood Panelling', price: 10, draw: (g, w, h) => woodPanel(g, w, h, 0x8a6040) },
  { id: 12, name: 'Bathroom Tile', price: 8, draw: (g, w, h) => wallTile(g, w, h, 0xf0f4f4, 0xc8d4d4) },
  { id: 13, name: 'Exposed Brick', price: 9, draw: (g, w, h) => bricks(g, w, h, 0xa85440, 0xc8bca8) },
  { id: 14, name: 'Clapboard Siding', price: 5, draw: (g, w, h) => siding(g, w, h, 0xe8e2d4) },
  { id: 15, name: 'Blue Siding', price: 5, draw: (g, w, h) => siding(g, w, h, 0x8aa8c4) },
  { id: 16, name: 'Sunflower Print', price: 8, draw: (g, w, h) => dots(g, w, h, 0xf8f0d8, 0xe8b840) },
];
const PAPER = Object.fromEntries(PAPERS.map((p) => [p.id, p]));
function plain(g, w, h, c) { noiseFill(g, w, h, c, 0.03, 300, 2); skirting(g, w, h); }
function skirting(g, w, h) { g.fillStyle = '#f4f2ec'; g.fillRect(0, h - 12, w, 12); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, h - 12, w, 1); }
function stripes(g, w, h, a, b) { g.fillStyle = cssHex(a); g.fillRect(0, 0, w, h); g.fillStyle = cssHex(b); for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h); skirting(g, w, h); }
function damask(g, w, h, a, b) {
  g.fillStyle = cssHex(a); g.fillRect(0, 0, w, h); g.fillStyle = cssHex(b);
  for (let y = 0; y < h; y += 40) for (let x = (y / 40 % 2) * 32; x < w + 32; x += 64) {
    g.beginPath(); g.ellipse(x, y + 20, 10, 16, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(x, y + 20, 18, 5, 0, 0, TAU); g.fill();
  }
  skirting(g, w, h);
}
function wainscot(g, w, h, top, bot) {
  g.fillStyle = cssHex(top); g.fillRect(0, 0, w, h);
  const y0 = h * 0.62; g.fillStyle = cssHex(bot); g.fillRect(0, y0, w, h - y0);
  g.fillStyle = cssHex(shadeHex(bot, 0.8)); for (let x = 8; x < w; x += 32) g.fillRect(x, y0 + 10, 2, h - y0 - 24);
  g.fillStyle = '#f4f2ec'; g.fillRect(0, y0 - 4, w, 8); skirting(g, w, h);
}
function woodPanel(g, w, h, c) { for (let x = 0; x < w; x += 16) { g.fillStyle = cssHex(shadeHex(c, 0.85 + Math.random() * 0.3)); g.fillRect(x, 0, 16, h); g.fillStyle = cssHex(shadeHex(c, 0.55)); g.fillRect(x, 0, 1.5, h); } }
function wallTile(g, w, h, c, grout) {
  g.fillStyle = cssHex(grout); g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { g.fillStyle = cssHex(shadeHex(c, 0.97 + Math.random() * 0.05)); g.fillRect(x + 1, y + 1, 14, 14); }
}
function siding(g, w, h, c) { g.fillStyle = cssHex(c); g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 14) { g.fillStyle = cssHex(shadeHex(c, 0.78)); g.fillRect(0, y + 12, w, 2); g.fillStyle = cssHex(shadeHex(c, 1.06)); g.fillRect(0, y, w, 2); } }
function dots(g, w, h, a, b) { g.fillStyle = cssHex(a); g.fillRect(0, 0, w, h); for (let y = 10; y < h; y += 28) for (let x = (y / 28 % 2) * 16 + 8; x < w; x += 32) { g.fillStyle = cssHex(b); g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); g.fillStyle = '#8a5a2a'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); } skirting(g, w, h); }

const TEX = {};
function buildTextures() {
  // floor atlas: 8×2 cells of 128 px with a 4 px gutter so mipmaps don't bleed
  const CELL = 128, PAD = 4;
  const atlas = document.createElement('canvas'); atlas.width = CELL * 8; atlas.height = CELL * 2;
  const ag = atlas.getContext('2d');
  TEX.floorUV = {};
  for (const f of FLOORS) {
    const i = f.id - 1, cx = (i % 8) * CELL, cy = Math.floor(i / 8) * CELL;
    const c = document.createElement('canvas'); c.width = c.height = CELL - PAD * 2;
    f.draw(c.getContext('2d'), CELL - PAD * 2, CELL - PAD * 2);
    ag.drawImage(c, cx + PAD, cy + PAD);
    // stretch the edge pixels into the gutter
    ag.drawImage(c, 0, 0, 1, c.height, cx, cy + PAD, PAD, c.height);
    ag.drawImage(c, c.width - 1, 0, 1, c.height, cx + CELL - PAD, cy + PAD, PAD, c.height);
    ag.drawImage(atlas, cx, cy + PAD, CELL, 1, cx, cy, CELL, PAD);
    ag.drawImage(atlas, cx, cy + CELL - PAD - 1, CELL, 1, cx, cy + CELL - PAD, CELL, PAD);
    f.thumb = c.toDataURL();
    const u0 = (cx + PAD) / atlas.width, u1 = (cx + CELL - PAD) / atlas.width;
    const v0 = 1 - (cy + CELL - PAD) / atlas.height, v1 = 1 - (cy + PAD) / atlas.height;
    TEX.floorUV[f.id] = [u0, v0, u1, v1];
  }
  TEX.floor = new THREE.CanvasTexture(atlas); TEX.floor.encoding = THREE.sRGBEncoding; TEX.floor.anisotropy = 4;
  TEX.floorMat = new THREE.MeshLambertMaterial({ map: TEX.floor });
  TEX.paper = {};
  for (const p of PAPERS) {
    const t = canvasTex(128, 320, p.draw);
    p.thumb = t.image.toDataURL();
    TEX.paper[p.id] = new THREE.MeshLambertMaterial({ map: t });
  }
  TEX.grass = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, 0x6a9a48, 0.22, 5000, 2);
    for (let i = 0; i < 400; i++) { g.fillStyle = cssHex(shadeHex(0x7aaa50, 0.9 + Math.random() * 0.3)); g.fillRect(Math.random() * w, Math.random() * h, 1, 4); }
  }, true);
  TEX.walk = canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, 0xc4c0b8, 0.08, 800, 2); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); }, true);
  TEX.road = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, 0x4a4a50, 0.18, 4000, 2); }, true);
}

// ---------- the neighbourhood (decor only) ----------
R.nightGlow = [];
function buildNeighbourhood() {
  const S = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({ map: TEX.grass }));
  grass.material.map.repeat.set(60, 60);
  grass.rotation.x = -Math.PI / 2; grass.position.set(LOT_W / 2, 0, LOT_D / 2); grass.receiveShadow = true;
  S.add(grass);
  // sidewalks and the street run along the front (+z) of the lot
  const strip = (z0, z1, tex, y, rep) => {
    const m = new THREE.MeshLambertMaterial({ map: tex.clone() }); m.map.needsUpdate = true; m.map.repeat.set(240 / rep, (z1 - z0) / rep);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(240, z1 - z0), m);
    p.rotation.x = -Math.PI / 2; p.position.set(LOT_W / 2, y, (z0 + z1) / 2); p.receiveShadow = true; S.add(p); return p;
  };
  strip(LOT_D, LOT_D + 2, TEX.walk, 0.03, 1);
  strip(LOT_D + 2, LOT_D + 9, TEX.road, 0.015, 4);
  strip(LOT_D + 9, LOT_D + 11, TEX.walk, 0.03, 1);
  // kerbs and lane markings
  for (const z of [LOT_D + 2, LOT_D + 9]) { const k = new THREE.Mesh(new THREE.BoxGeometry(240, 0.12, 0.16), mat(0xb0aca4)); k.position.set(LOT_W / 2, 0.06, z); S.add(k); }
  for (let x = -100; x < 130; x += 4) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.14), mat(0xf0e8c0)); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.02, LOT_D + 5.5); S.add(l); }
  // street lamps
  for (let x = -40; x < 80; x += 14) for (const z of [LOT_D + 1.7, LOT_D + 9.3]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6), mat(0x3a3e44)); pole.position.set(x, 2.1, z); S.add(pole);
    const glowM = new THREE.MeshLambertMaterial({ color: 0xfff0c0, emissive: 0xffd890, emissiveIntensity: 0 }); R.nightGlow.push(glowM);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), glowM); head.position.set(x, 4.2, z); S.add(head);
  }
  // houses across the street and on either side
  const hcols = [0xe8d8c0, 0xa8c4d8, 0xd8b8a0, 0xc8d8b0, 0xf0e0a0, 0xd0c0d8];
  const spots = [[-14, LOT_D + 20, 0], [2, LOT_D + 20, 0], [18, LOT_D + 21, 0], [34, LOT_D + 20, 0], [50, LOT_D + 20, 0],
    [-19, 10, 1], [-19, -8, 1], [LOT_W + 13, 10, 3], [LOT_W + 13, -8, 3], [-2, -18, 2], [16, -18, 2], [34, -18, 2]];
  spots.forEach(([x, z, r], i) => S.add(buildHouse(x, z, r, hcols[i % hcols.length], i)));
  // trees off the lot
  const tr = mulberry32(7);
  for (let i = 0; i < 70; i++) {
    const x = -40 + tr() * 120, z = -34 + tr() * 90;
    const onLot = x > -9 && x < LOT_W + 9 && z > -3 && z < LOT_D + 12;
    const nearHouse = spots.some(([hx, hz]) => Math.abs(hx - x) < 8 && Math.abs(hz - z) < 7);
    if (onLot || nearHouse || (z > LOT_D - 1 && z < LOT_D + 12)) continue;
    const t = makeTreeModel(0.8 + tr() * 0.6, tr() < 0.3 ? 1 : 0); t.position.set(x, 0, z); t.rotation.y = tr() * TAU; S.add(t);
  }
  mergeStatic(S);
  R.scene.add(S);
}
function buildHouse(x, z, r, col, seed) {
  const g = new THREE.Group();
  const w = 10, d = 8, h = 3;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(col)); body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
  // gable roof
  const roofM = mat([0x7a3a2a, 0x3a4a5a, 0x5a4a3a, 0x6a2a2a][seed % 4]);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.2, d / 2 / Math.cos(0.6) + 0.4), roofM);
    p.position.set(0, h + Math.tan(0.6) * d / 4, s * d / 4); p.rotation.x = s * 0.6; p.castShadow = true; g.add(p);
  }
  const gableShape = new THREE.Shape(); gableShape.moveTo(-d / 2, 0); gableShape.lineTo(d / 2, 0); gableShape.lineTo(0, Math.tan(0.6) * d / 2); gableShape.lineTo(-d / 2, 0);
  for (const s of [-1, 1]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), mat(col, { side: THREE.DoubleSide })); gm.rotation.y = Math.PI / 2; gm.position.set(s * w / 2, h, 0); g.add(gm); }
  // door and windows on the front (+z)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 2.1, 0.1), mat(0x5a3a2a)); door.position.set(-1.5, 1.05, d / 2 + 0.03); g.add(door);
  for (const wx of [-3.8, 1.2, 3.6]) {
    const gm = new THREE.MeshLambertMaterial({ color: 0x8ab0c8, emissive: 0xffc870, emissiveIntensity: 0 }); R.nightGlow.push(gm);
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.08), gm); win.position.set(wx, 1.7, d / 2 + 0.03); g.add(win);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 0.04), mat(0xf4f0e8)); fr.position.set(wx, 1.7, d / 2 + 0.01); g.add(fr);
  }
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 6), mat(0xb8b0a0)); path.rotation.x = -Math.PI / 2; path.position.set(-1.5, 0.02, d / 2 + 3); g.add(path);
  g.position.set(x, 0, z); g.rotation.y = r * Math.PI / 2 + Math.PI;
  return g;
}
