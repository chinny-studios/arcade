// 02_textures: every texture in the game is a 32x32 tile painted here at load time into one 512x512 atlas.
// Three mip levels (32, 16, 8 px tiles) are made by box-filtering the whole atlas, which never mixes tiles because
// tile edges stay aligned. The shader in 03_render.js wraps and 3-point filters inside a tile, like the N64 RDP.
const TS = 32, ATLAS_TILES = 16, AS = TS * ATLAS_TILES;
const TILE = {};                 // name -> tile index
const atlas0 = new Uint8ClampedArray(AS * AS * 4);
let tileCount = 0;

function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function tnoise(x, y, per, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const w = (a) => ((a % per) + per) % per;
  const a = hash2(w(x0), w(y0), s), b = hash2(w(x0 + 1), w(y0), s);
  const c = hash2(w(x0), w(y0 + 1), s), d = hash2(w(x0 + 1), w(y0 + 1), s);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
// Tileable fractal noise over a 32 px tile, 0..1. base = cells across the tile at the coarsest octave.
function fbm(x, y, s, base = 4, oct = 4) {
  let v = 0, amp = 0.5, tot = 0;
  for (let o = 0; o < oct; o++) { const per = base << o; v += amp * tnoise(x * per / TS, y * per / TS, per, s + o * 31); tot += amp; amp *= 0.5; }
  return v / tot;
}
const C = (h) => hex3(h);
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

class Painter {
  constructor(seed) { this.d = new Float32Array(TS * TS * 4); this.seed = seed; this.r = mulberry32(seed * 7919 + 13); }
  i(x, y) { x = ((x % TS) + TS) % TS; y = ((y % TS) + TS) % TS; return (y * TS + x) * 4; }
  set(x, y, c, a = 1) { const i = this.i(x | 0, y | 0), d = this.d; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; return this; }
  get(x, y) { const i = this.i(x | 0, y | 0), d = this.d; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }
  blend(x, y, c, t, a) { const p = this.get(x, y); this.set(x, y, mix3(p, c, t), a === undefined ? p[3] : a); return this; }
  mul(x, y, f) { const i = this.i(x | 0, y | 0), d = this.d; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; return this; }
  alpha(x, y, a) { this.d[this.i(x | 0, y | 0) + 3] = a; return this; }
  fill(c, a = 1) { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) this.set(x, y, c, a); return this; }
  each(fn) { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const r = fn(x, y, this.get(x, y)); if (r) this.set(x, y, r, r[3] === undefined ? 1 : r[3]); } return this; }
  rect(x, y, w, h, c, a = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, a); return this; }
  brect(x, y, w, h, c, t) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.blend(i, j, c, t); return this; }
  mrect(x, y, w, h, f) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.mul(i, j, f); return this; }
  hline(x, y, w, c) { return this.rect(x, y, w, 1, c); }
  vline(x, y, h, c) { return this.rect(x, y, 1, h, c); }
  // a raised panel: light top/left edge, dark bottom/right edge
  bevel(x, y, w, h, hi = 1.25, lo = 0.65) {
    for (let i = x; i < x + w; i++) { this.mul(i, y, hi); this.mul(i, y + h - 1, lo); }
    for (let j = y + 1; j < y + h - 1; j++) { this.mul(x, j, hi); this.mul(x + w - 1, j, lo); }
    return this;
  }
  disc(cx, cy, r, c, a = 1) { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) this.set(x, y, c, a); return this; }
  ring(cx, cy, r0, r1, c) { for (let y = Math.floor(cy - r1 - 1); y <= cy + r1 + 1; y++) for (let x = Math.floor(cx - r1 - 1); x <= cx + r1 + 1; x++) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d >= r0 && d <= r1) this.set(x, y, c); } return this; }
  grain(amp, base = 4, s = 0) { return this.each((x, y, p) => { const f = 1 + (fbm(x, y, this.seed + s, base) - 0.5) * amp; return [p[0] * f, p[1] * f, p[2] * f, p[3]]; }); }
  speck(n, c, t = 1) { for (let k = 0; k < n; k++) this.blend(Math.floor(this.r() * TS), Math.floor(this.r() * TS), c, t); return this; }
  jitter(amp) { return this.each((x, y, p) => { const f = 1 + (this.r() - 0.5) * amp; return [p[0] * f, p[1] * f, p[2] * f, p[3]]; }); }
  rivets(pts, c = [0.8, 0.8, 0.8]) { for (const [x, y] of pts) { this.set(x, y, c); this.mul(x + 1, y + 1, 0.6); } return this; }
  text(str, x, y, c) { // a tiny 3x5 stencil font for crate markings and labels
    for (const ch of str) {
      const g = FONT35[ch];
      if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j] >> (2 - i) & 1) this.set(x + i, y + j, c);
      x += 4;
    }
    return this;
  }
  commit(idx) {
    const ox = (idx % ATLAS_TILES) * TS, oy = Math.floor(idx / ATLAS_TILES) * TS;
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
      const s = (y * TS + x) * 4, o = ((oy + y) * AS + ox + x) * 4;
      atlas0[o] = this.d[s] * 255; atlas0[o + 1] = this.d[s + 1] * 255; atlas0[o + 2] = this.d[s + 2] * 255; atlas0[o + 3] = this.d[s + 3] * 255;
    }
  }
}
const FONT35 = {
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 3, 1, 7], '4': [5, 5, 7, 1, 1], '5': [7, 4, 7, 1, 7],
  '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 2, 2], '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7], 'A': [2, 5, 7, 5, 5], 'B': [6, 5, 6, 5, 6],
  'C': [7, 4, 4, 4, 7], 'D': [6, 5, 5, 5, 6], 'E': [7, 4, 6, 4, 7], 'F': [7, 4, 6, 4, 4], 'G': [7, 4, 5, 5, 7], 'H': [5, 5, 7, 5, 5],
  'I': [7, 2, 2, 2, 7], 'K': [5, 5, 6, 5, 5], 'L': [4, 4, 4, 4, 7], 'M': [5, 7, 7, 5, 5], 'N': [6, 5, 5, 5, 5], 'O': [7, 5, 5, 5, 7],
  'P': [7, 5, 7, 4, 4], 'R': [6, 5, 6, 5, 5], 'S': [7, 4, 7, 1, 7], 'T': [7, 2, 2, 2, 2], 'U': [5, 5, 5, 5, 7], 'V': [5, 5, 5, 5, 2],
  'X': [5, 5, 2, 5, 5], 'Y': [5, 5, 2, 2, 2], 'Z': [7, 1, 2, 4, 7], '-': [0, 0, 7, 0, 0], '.': [0, 0, 0, 0, 2], '!': [2, 2, 2, 0, 2],
};
function tex(name, fn) {
  const idx = tileCount++;
  TILE[name] = idx;
  const p = new Painter(idx * 17 + 3);
  fn(p);
  p.commit(idx);
  return idx;
}

// ---------------------------------------------------------------- the textures
function paintTextures() {
  // ---- concrete and bunker interiors
  tex('concrete', (p) => {
    p.fill(C(0x8a8780)).grain(0.45, 4).grain(0.25, 16, 5).speck(40, C(0x5a5650), 0.5);
    p.hline(0, 15, 32, C(0x6d6a63)); p.hline(0, 31, 32, C(0x66625c));
    for (let x = 0; x < 32; x += 1) if (fbm(x, 0, 99, 8) > 0.6) p.mrect(x, 16, 1, 4, 0.9); // drip stains
  });
  tex('concrete_dk', (p) => {
    p.fill(C(0x5f5f5c)).grain(0.5, 4).speck(50, C(0x3c3c3a), 0.6);
    p.rect(0, 0, 32, 1, C(0x484845)).rect(0, 0, 1, 32, C(0x484845));
    p.rivets([[4, 4], [27, 4], [4, 27], [27, 27]], C(0x8a8a86));
  });
  tex('wall_green', (p) => {   // two-tone 1960s institutional paint: cream above, green dado below
    p.each((x, y) => y < 19 ? C(0xc9c2a6) : C(0x5d7a5c)).grain(0.18, 4).grain(0.12, 16, 3);
    p.hline(0, 18, 32, C(0x3c4a3a)); p.hline(0, 19, 32, C(0x7d9a7a));
    p.hline(0, 31, 32, C(0x2f3a2e));
    p.speck(14, C(0x6a6450), 0.5);
  });
  tex('wall_panel', (p) => {   // ribbed control-room panelling
    p.fill(C(0x6f7c86)).grain(0.2, 4);
    for (let x = 0; x < 32; x += 8) { p.vline(x, 0, 32, C(0x4c5761)); p.vline(x + 1, 0, 32, C(0x8d9aa4)); }
    p.hline(0, 0, 32, C(0x4a545c)).hline(0, 16, 32, C(0x56616a)).hline(0, 17, 32, C(0x8a97a1));
  });
  tex('tile_floor', (p) => {
    p.each((x, y) => ((x >> 3) + (y >> 3)) & 1 ? C(0x8c3a2c) : C(0x9a8f78)).grain(0.2, 8);
    for (let k = 0; k < 32; k += 8) { p.hline(0, k, 32, C(0x4e4a40)); p.vline(k, 0, 32, C(0x4e4a40)); }
  });
  tex('lino', (p) => { p.fill(C(0x6b7462)).grain(0.2, 4).speck(120, C(0x8b9480), 0.6).speck(80, C(0x4a5244), 0.6); p.hline(0, 0, 32, C(0x50574a)); p.vline(0, 0, 32, C(0x50574a)); });
  tex('grate', (p) => {
    p.fill(C(0x2a2c2e));
    for (let y = 0; y < 32; y += 4) for (let x = 0; x < 32; x++) { p.set(x, y, C(0x7b8086)); p.set(x, y + 1, C(0x52565a)); }
    for (let x = 0; x < 32; x += 8) { p.vline(x, 0, 32, C(0x8d9298)); p.vline(x + 1, 0, 32, C(0x45484b)); }
  });
  tex('ceil', (p) => { p.fill(C(0xb5b2a7)).grain(0.12, 8).speck(90, C(0x8d8a80), 0.6); p.hline(0, 0, 32, C(0x6a675e)); p.vline(0, 0, 32, C(0x6a675e)); p.hline(0, 16, 32, C(0x8e8b82)); });
  tex('lamp', (p) => {
    p.fill(C(0x76736b)); p.rect(3, 3, 26, 26, C(0xfffbe8)); p.brect(3, 3, 26, 26, C(0xffffff), 0.5);
    for (let x = 5; x < 28; x += 4) p.vline(x, 4, 24, C(0xe0dcc8));
    p.bevel(2, 2, 28, 28, 1.3, 0.6);
  });
  // ---- outdoors (steppe launch site)
  tex('sand', (p) => { p.fill(C(0xa89470)).grain(0.35, 4).grain(0.2, 16, 9).speck(60, C(0x7c6a4c), 0.6).speck(30, C(0xd0bf98), 0.6); });
  tex('grass', (p) => {
    p.fill(C(0x8a8656)).grain(0.4, 4).grain(0.25, 16, 2);
    for (let k = 0; k < 70; k++) { const x = p.r() * 32 | 0, y = p.r() * 32 | 0, h = 1 + p.r() * 3 | 0; for (let j = 0; j < h; j++) p.blend(x, y - j, C(0xb5ad6a), 0.7); }
    p.speck(40, C(0x5e5a38), 0.6);
  });
  tex('pad', (p) => {
    p.fill(C(0xa5a39b)).grain(0.25, 4).speck(70, C(0x7f7d76), 0.5);
    p.hline(0, 0, 32, C(0x5d5b55)); p.vline(0, 0, 32, C(0x5d5b55));
    for (let x = 0; x < 32; x++) if (fbm(x, 9, 7, 4) > 0.62) p.mrect(x, 6 + (x & 3), 2, 2, 0.7);  // scorch flecks
  });
  tex('pad_line', (p) => { p.fill(C(0xa5a39b)).grain(0.25, 4); p.rect(0, 13, 32, 6, C(0xd8b830)); p.grain(0.15, 8, 2); p.hline(0, 0, 32, C(0x5d5b55)); });
  tex('cliff', (p) => {
    p.each((x, y) => { const n = fbm(x, y * 0.6, 3, 4), m = fbm(x * 1.5, y * 0.4, 8, 2); return mix3(C(0x5a4c3a), C(0xa89474), clamp(n * 0.75 + m * 0.35 - 0.05, 0, 1)); });
    for (let k = 0; k < 7; k++) { let x = p.r() * 32; const y0 = p.r() * 32, len = 6 + p.r() * 20; for (let j = 0; j < len; j++) { x += (p.r() - 0.5) * 1.4; p.mul(x, y0 + j, 0.62); } }
    for (const y of [6, 17, 26]) for (let x = 0; x < 32; x++) if (fbm(x, y, 13, 4) > 0.42) { p.mul(x, y, 1.22); p.mul(x, y + 1, 0.78); }
    p.speck(30, C(0x3e3428), 0.6);
  });
  tex('corrugated', (p) => {
    p.each((x) => { const s = 0.75 + 0.35 * Math.sin(x / 32 * TAU * 4); return [0.46 * s, 0.52 * s, 0.56 * s]; }).grain(0.2, 4).speck(30, C(0x6a4a30), 0.5);
    p.hline(0, 31, 32, C(0x353a3e));
    for (let x = 0; x < 32; x++) if (fbm(x, 30, 21, 8) > 0.55) p.blend(x, 28 + (x % 3), C(0x7a4a28), 0.6); // rust along the foot
  });
  tex('fence', (p) => {
    p.fill([0, 0, 0], 0);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const a = ((x + y) & 7) === 0, b = ((x - y + 64) & 7) === 0;
      if (a || b) p.set(x, y, C(0xb8bcbc), 1);
    }
    p.rect(0, 0, 32, 2, C(0x8a8e90)); p.rect(0, 0, 2, 32, C(0x7a7e80));
  });
  tex('wire', (p) => { // razor wire on the fence top
    p.fill([0, 0, 0], 0);
    for (let x = 0; x < 32; x++) { const y = 16 + Math.round(10 * Math.sin(x / 32 * TAU * 2)); p.set(x, y, C(0xc8c8c8)); p.set(x, 32 - y, C(0x989898)); if ((x & 3) === 0) { p.set(x, y - 1, C(0xe0e0e0)); p.set(x, y + 1, C(0xe0e0e0)); } }
  });
  // ---- doors and glass
  tex('door', (p) => {
    p.fill(C(0x77746a)).grain(0.18, 4);
    p.rect(0, 0, 32, 4, C(0x2a2a2a)); for (let x = 0; x < 32; x += 4) p.rect(x, 0, 2, 4, C(0xd6a92a));
    p.rect(11, 8, 10, 6, C(0x3a4b55)); p.brect(12, 9, 4, 2, C(0xb0c8d0), 0.6); p.bevel(11, 8, 10, 6, 0.6, 1.3);
    p.bevel(1, 5, 30, 26, 1.2, 0.7); p.hline(0, 20, 32, C(0x55524a));
    p.rect(26, 15, 3, 3, C(0x2c2c2c));
  });
  tex('door_lock', (p) => {
    p.fill(C(0x7a3a30)).grain(0.18, 4);
    p.rect(0, 0, 32, 4, C(0x2a2a2a)); for (let x = 0; x < 32; x += 4) p.rect(x, 0, 2, 4, C(0xd6a92a));
    p.bevel(1, 5, 30, 26, 1.2, 0.7);
    p.rect(12, 12, 8, 10, C(0x1c1c1c)); p.rect(14, 14, 4, 2, C(0xff3020)); p.rect(13, 18, 6, 1, C(0x909090));
  });
  tex('door_st', (p) => { // station door: white with an orange band
    p.fill(C(0xd8d6cf)).grain(0.1, 4); p.rect(0, 12, 32, 6, C(0xd8702a)); p.vline(15, 0, 32, C(0x6a6a66)); p.vline(16, 0, 32, C(0x404040));
    p.bevel(0, 0, 32, 32, 1.1, 0.6); p.rect(5, 4, 6, 4, C(0x334450)); p.rect(21, 4, 6, 4, C(0x334450));
  });
  tex('glass', (p) => {
    p.each((x, y) => { const s = ((x + y) % 23 < 2 || (x + y + 9) % 31 < 1) ? 0.55 : 0.22; return [0.62, 0.8, 0.86, s]; });
    p.rect(0, 0, 32, 1, C(0x8aa0a8), 0.6);
  });
  tex('viewport', (p) => { p.each((x, y) => [0.35, 0.5, 0.7, ((x * 3 + y) % 37 < 2) ? 0.35 : 0.12]); });
  // ---- props
  tex('crate', (p) => {
    p.fill(C(0x9a7446)).grain(0.25, 2);
    for (let y = 0; y < 32; y += 8) { p.hline(0, y, 32, C(0x5e4224)); for (let x = 0; x < 32; x++) if (fbm(x * 0.3, y + 3, 5, 4) > 0.6) p.mul(x, y + 3, 0.8); }
    p.rect(0, 0, 32, 3, C(0x6e5030)).rect(0, 29, 32, 3, C(0x6e5030)).rect(0, 0, 3, 32, C(0x6e5030)).rect(29, 0, 3, 32, C(0x6e5030));
    for (let k = 0; k < 32; k++) p.set(k, k, C(0x6e5030)).set(k + 1, k, C(0x6e5030));
    p.text('KS-9', 9, 13, C(0x2a1d10));
  });
  tex('crate_mil', (p) => {
    p.fill(C(0x5a6440)).grain(0.2, 4); p.bevel(0, 0, 32, 32, 1.3, 0.6); p.bevel(2, 2, 28, 28, 0.7, 1.2);
    p.text('7.62', 8, 9, C(0xd8d8c0)); p.text('M43', 10, 18, C(0xd8d8c0));
  });
  tex('barrel', (p) => {
    p.each((x) => { const s = 0.7 + 0.45 * Math.sin((x + 0.5) / 32 * Math.PI); return [0.66 * s, 0.16 * s, 0.1 * s]; }).grain(0.15, 4);
    p.rect(0, 3, 32, 2, C(0x3a1a12)); p.rect(0, 27, 32, 2, C(0x3a1a12));
    for (let x = 0; x < 32; x++) for (let y = 12; y < 20; y++) if (((x + y) >> 2) & 1) p.set(x, y, C(0xe0b828));
  });
  tex('barrel_top', (p) => { p.fill(C(0x6a1a12)); p.ring(16, 16, 13, 15, C(0x3a1a12)); p.disc(22, 10, 2.5, C(0x2a2a2a)); p.grain(0.2, 4); });
  tex('console', (p) => {
    p.fill(C(0x8a8f7c)).grain(0.12, 4); p.bevel(0, 0, 32, 32, 1.2, 0.6);
    p.rect(3, 3, 14, 11, C(0x1e2a22)); p.each((x, y) => (x >= 4 && x < 16 && y >= 4 && y < 13 && (y & 1)) ? C(0x3fa060) : null);
    p.bevel(3, 3, 14, 11, 0.6, 1.3);
    for (let k = 0; k < 3; k++) { p.disc(22 + (k % 2) * 6, 6 + k * 4, 2, C(0xf0eee0)); p.set(22 + (k % 2) * 6, 5 + k * 4, C(0x202020)); }
    const cols = [0xff3a2a, 0x3aff5a, 0xffd23a, 0x3a9aff];
    for (let i = 0; i < 6; i++) p.rect(4 + i * 4, 18, 2, 2, C(cols[i % 4]));
    for (let i = 0; i < 6; i++) p.rect(4 + i * 4, 23, 3, 5, C(0x303030)).set(5 + i * 4, 23 + (i % 3), C(0xc0c0c0));
  });
  tex('console_top', (p) => {
    p.fill(C(0x7a7f6c)).grain(0.12, 4);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) { p.rect(2 + i * 4, 3 + j * 4, 3, 3, C(j === 0 ? 0xd6c8a0 : 0x404040)); p.mul(4 + i * 4, 5 + j * 4, 0.6); }
    p.rect(2, 21, 28, 8, C(0x2c2c2c)); for (let i = 0; i < 9; i++) p.vline(4 + i * 3, 22, 4 + (i % 3), C(0xdcdcdc));
  });
  tex('console_dead', (p) => {
    p.fill(C(0x3c3e36)).grain(0.3, 4); p.rect(3, 3, 14, 11, C(0x0e0e0e));
    for (let k = 0; k < 18; k++) { const a = p.r() * TAU, r = p.r() * 8; p.set(10 + Math.cos(a) * r, 8 + Math.sin(a) * r * 0.7, C(0x707070)); }
    p.speck(60, C(0x101010), 0.8); p.speck(10, C(0xff8020), 0.6);
  });
  tex('screen', (p) => {
    p.fill(C(0x0c1a10)); for (let y = 2; y < 30; y += 3) for (let x = 3; x < 29; x++) if (hash2(x >> 1, y, 4) > 0.35) p.set(x, y, C(0x5aff8a));
    p.each((x, y) => (y & 1) ? null : [0.03, 0.08, 0.05]); p.bevel(0, 0, 32, 32, 0.5, 1.4);
  });
  tex('tape', (p) => {
    p.fill(C(0xc8c4b4)).grain(0.1, 4); p.bevel(0, 0, 32, 32, 1.2, 0.6);
    for (const cx of [9, 23]) { p.disc(cx, 9, 6, C(0x2a2a2a)); p.disc(cx, 9, 5, C(0x5a4a3a)); p.disc(cx, 9, 2, C(0xb0b0b0)); p.set(cx, 4, C(0xb0b0b0)); p.set(cx + 4, 9, C(0xb0b0b0)); }
    p.rect(3, 17, 26, 1, C(0x707070));
    const cols = [0xff4030, 0xffd040, 0x40ff60, 0xffffff];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) p.rect(4 + i * 3, 20 + j * 3, 2, 2, hash2(i, j, 3) > 0.5 ? C(cols[(i + j) % 4]) : C(0x3a3a3a));
  });
  tex('metal', (p) => { p.fill(C(0x7c858c)).grain(0.18, 4).speck(30, C(0x5c656c), 0.5); p.bevel(0, 0, 32, 32, 1.15, 0.7); });
  tex('metal_dk', (p) => { p.fill(C(0x45494d)).grain(0.2, 4).speck(30, C(0x2c2f32), 0.5); p.bevel(0, 0, 32, 32, 1.2, 0.7); p.rivets([[3, 3], [28, 3], [3, 28], [28, 28]], C(0x8a8e92)); });
  tex('steel_red', (p) => {
    p.fill(C(0xa0482a)).grain(0.25, 4).speck(40, C(0x6a2e1a), 0.6);
    p.rect(0, 0, 32, 4, C(0x7a3420)).rect(0, 28, 32, 4, C(0x7a3420)); p.rect(14, 0, 4, 32, C(0x7a3420));
    p.rivets([[2, 2], [8, 2], [24, 2], [30, 2], [2, 30], [8, 30], [24, 30], [30, 30]], C(0xd08060));
  });
  tex('rocket_w', (p) => { p.fill(C(0xe6e4dc)).grain(0.08, 4); p.hline(0, 0, 32, C(0x9a9a94)); p.vline(0, 0, 32, C(0xb0b0aa)); p.rivets([[4, 2], [12, 2], [20, 2], [28, 2]], C(0xa0a09a)); });
  tex('rocket_b', (p) => { p.fill(C(0x232323)).grain(0.12, 4); p.hline(0, 0, 32, C(0x4a4a4a)); p.vline(0, 0, 32, C(0x3a3a3a)); });
  tex('rocket_flag', (p) => { p.fill(C(0xe6e4dc)).grain(0.08, 4); p.rect(4, 8, 24, 16, C(0xc42a22)); p.text('KS', 8, 13, C(0xf0d040)); p.text('9', 20, 13, C(0xf0d040)); });
  tex('gold', (p) => { p.each((x, y) => { const n = fbm(x, y, 5, 8); return mix3(C(0x8a6418), C(0xffd860), n * n * 1.6); }); p.each((x, y, c) => (fbm(x, y, 9, 4) > 0.62) ? [c[0] * 1.2, c[1] * 1.15, c[2]] : null); });
  tex('mirror', (p) => { p.each((x, y) => mix3(C(0x9cc8ff), C(0xffffff), (x + y) / 64)); p.bevel(0, 0, 32, 32, 1.3, 0.5); for (let k = 4; k < 32; k += 9) p.brect(k, 0, 2, 32, C(0xffffff), 0.5); });
  tex('solar', (p) => { p.fill(C(0x1c2a5c)); for (let y = 0; y < 32; y += 8) for (let x = 0; x < 32; x += 8) { p.rect(x + 1, y + 1, 6, 6, C(0x2a4490)); p.set(x + 2, y + 2, C(0x6a8ad0)); } p.grain(0.1, 4); });
  tex('radar', (p) => { p.fill(C(0xc8ccc8), 1); for (let k = 0; k < 32; k += 4) { p.hline(0, k, 32, C(0x8a8e8a)); p.vline(k, 0, 32, C(0x8a8e8a)); } p.grain(0.1, 4); });
  tex('alarm', (p) => {
    p.fill(C(0x9a2018)).grain(0.15, 4); p.bevel(0, 0, 32, 32, 1.3, 0.5);
    p.disc(16, 11, 7, C(0xd8c8a0)); p.disc(16, 11, 5, C(0xb8a070)); p.disc(16, 11, 1.5, C(0x403020));
    p.rect(8, 21, 16, 7, C(0x202020)); p.rect(10, 23, 12, 3, C(0xffd040)); p.text('ALARM', 6, 1, C(0xffffff));
  });
  tex('alarm_dead', (p) => { p.fill(C(0x4a1a14)).grain(0.3, 4); p.disc(16, 11, 7, C(0x2a2018)); p.speck(40, C(0x111111), 0.8); p.rect(8, 21, 16, 7, C(0x101010)); });
  tex('hazard', (p) => { p.each((x, y) => (((x + y) >> 3) & 1) ? C(0x262626) : C(0xd8b028)).grain(0.15, 4); });
  tex('plant', (p) => {
    p.fill([0, 0, 0], 0);
    for (let k = 0; k < 9; k++) { const x0 = 3 + k * 3.3, lean = (p.r() - 0.5) * 0.8; for (let y = 31; y > 6 + p.r() * 8; y--) { const x = x0 + (31 - y) * lean; p.set(x, y, mix3(C(0x2a6a20), C(0x8ad050), (31 - y) / 26)); if (y % 4 === 0) { p.set(x + 1, y, C(0x6ab040)); p.set(x - 1, y - 1, C(0x5aa038)); } } }
  });
  tex('soil', (p) => { p.fill(C(0x3a2a1c)).grain(0.4, 8).speck(40, C(0x5a4630), 0.6); });
  tex('bunk', (p) => { p.fill(C(0x8a9aa8)).grain(0.12, 4); p.rect(0, 0, 32, 9, C(0xe8e6de)); p.bevel(0, 0, 32, 9, 1.1, 0.7); for (let y = 12; y < 32; y += 5) p.hline(0, y, 32, C(0x6a7a88)); });
  tex('wood', (p) => { p.each((x, y) => mix3(C(0x5a3a1e), C(0x8a5e32), fbm(x * 0.25, y * 2, 13, 4))).grain(0.15, 4); });
  // ---- space station
  tex('hull', (p) => {
    p.fill(C(0xd4d2ca)).grain(0.08, 4); p.hline(0, 0, 32, C(0x8a8a84)); p.vline(0, 0, 32, C(0x9a9a94)); p.hline(0, 16, 32, C(0xaeaca6));
    p.rivets([[3, 3], [28, 3], [3, 19], [28, 19]], C(0x9a9a94)); p.rect(10, 22, 12, 6, C(0xbab8b0)); p.bevel(10, 22, 12, 6, 0.7, 1.2);
  });
  tex('hull_stripe', (p) => {
    p.fill(C(0xd4d2ca)).grain(0.08, 4); p.rect(0, 10, 32, 8, C(0xd8702a)); p.hline(0, 9, 32, C(0x8a8a84)); p.hline(0, 18, 32, C(0x8a8a84));
    p.text('C-4', 2, 2, C(0x5a5a56)); p.vline(0, 0, 32, C(0x9a9a94));
  });
  tex('hull_dk', (p) => {
    p.fill(C(0x5c6168)).grain(0.12, 4); p.bevel(0, 0, 32, 32, 1.2, 0.6);
    for (let y = 6; y < 26; y += 3) p.rect(6, y, 20, 1, C(0x26292c));
  });
  tex('floor_st', (p) => { p.fill(C(0x3c4046)).grain(0.12, 4); for (let y = 2; y < 32; y += 6) p.rect(0, y, 32, 2, C(0x52575e)); p.hline(0, 0, 32, C(0x26292c)); p.vline(0, 0, 32, C(0x26292c)); });
  tex('ceil_st', (p) => { p.fill(C(0xbab8b0)).grain(0.08, 4); p.rect(4, 4, 24, 24, C(0xcac8c0)); p.bevel(4, 4, 24, 24, 1.15, 0.75); p.rect(10, 14, 12, 4, C(0x707070)); });
  // ---- lunar base
  tex('moon_wall', (p) => {
    p.fill(C(0xb8ab92)).grain(0.12, 4);
    for (let y = 0; y < 32; y += 8) for (let x = 0; x < 32; x += 8) { p.bevel(x, y, 8, 8, 1.12, 0.78); p.set(x + 4, y + 4, C(0x8a7e68)); }
  });
  tex('moon_floor', (p) => { p.fill(C(0x5a5650)).grain(0.18, 4); p.rect(0, 0, 32, 2, C(0x3a3834)); p.rect(0, 0, 2, 32, C(0x3a3834)); p.rect(12, 12, 8, 8, C(0x6a665e)); p.bevel(12, 12, 8, 8, 1.2, 0.7); });
  tex('regolith', (p) => { p.fill(C(0x8c8a86)).grain(0.4, 4).grain(0.25, 16, 4).speck(70, C(0x5a5856), 0.6).speck(40, C(0xb0aeaa), 0.6); });
  tex('moon_black', (p) => { p.fill(C(0x2a2e34)).grain(0.2, 4); p.bevel(0, 0, 32, 32, 1.4, 0.6); p.rect(12, 2, 8, 28, C(0x40464e)); });
  // ---- sky pieces
  tex('stars', (p) => { p.fill([0, 0, 0]); for (let k = 0; k < 18; k++) { const b = 0.4 + p.r() * 0.6; p.set(p.r() * 32, p.r() * 32, [b, b, b * (0.9 + p.r() * 0.2)]); } p.set(7, 21, [1, 1, 1]); p.set(8, 21, [0.5, 0.5, 0.5]); });
  tex('clouds', (p) => { p.each((x, y) => { const n = fbm(x, y, 41, 2, 4); const a = clamp((n - 0.48) * 4, 0, 1); return [1, 1, 1, a * 0.85]; }); });
  tex('sun', (p) => { p.each((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5) / 16; const a = clamp(1.2 - d * 1.3, 0, 1); return [1, 0.95, 0.8, a * a]; }); p.disc(16, 16, 5, [1, 1, 0.95]); });
  for (let k = 0; k < 4; k++) tex('earth' + k, (p) => {
    p.each((x, y) => {
      const gx = x + k * 32, lat = Math.abs(y - 15.5) / 16;
      const land = tnoise(gx / 128 * 8, y / 32 * 4, 8, 77) * 0.65 + tnoise(gx / 128 * 16, y / 32 * 8, 16, 78) * 0.35;
      let c = land > 0.55 ? mix3(C(0x4a7a30), C(0xa08a50), (land - 0.55) * 3) : mix3(C(0x183a8a), C(0x2a5ab0), land);
      if (lat > 0.82) c = C(0xe8eef4);
      const cl = tnoise(gx / 128 * 16, y / 32 * 8, 16, 91) * 0.6 + tnoise(gx / 128 * 32, y / 32 * 16, 32, 92) * 0.4;
      if (cl > 0.56) c = mix3(c, [1, 1, 1], clamp((cl - 0.56) * 5, 0, 0.9));
      return c;
    });
  });
  // ---- people: neutral textures tinted per part by vertex colour
  tex('cloth', (p) => { p.fill([0.85, 0.85, 0.85]).grain(0.2, 4); for (let y = 0; y < 32; y += 11) p.mrect(0, y, 32, 1, 0.8); });
  tex('tunic', (p) => { // torso front: collar, buttons, belt, pockets
    p.fill([0.85, 0.85, 0.85]).grain(0.15, 4);
    p.rect(11, 0, 10, 4, [0.6, 0.6, 0.6]); p.vline(15, 4, 21, [0.55, 0.55, 0.55]);
    for (let y = 7; y < 24; y += 5) p.rect(16, y, 2, 2, [1, 0.95, 0.7]);
    p.rect(4, 7, 8, 6, [0.72, 0.72, 0.72]); p.rect(20, 7, 8, 6, [0.72, 0.72, 0.72]);
    p.rect(0, 25, 32, 4, [0.25, 0.2, 0.15]); p.rect(14, 25, 4, 4, [0.9, 0.8, 0.4]);
  });
  tex('jumpsuit', (p) => { p.fill([0.85, 0.85, 0.85]).grain(0.15, 4); p.vline(15, 0, 28, [0.5, 0.5, 0.5]); p.rect(4, 6, 8, 4, [1, 1, 1]); p.rect(5, 7, 6, 2, [0.3, 0.4, 0.8]); p.rect(0, 25, 32, 3, [0.4, 0.4, 0.4]); });
  tex('suit', (p) => { // jacket with lapels, shirt and tie
    p.fill([0.85, 0.85, 0.85]).grain(0.12, 4);
    p.rect(12, 0, 8, 20, [1.05, 1.05, 1.05]); p.rect(15, 2, 2, 16, [0.6, 0.12, 0.1]);
    for (let y = 0; y < 14; y++) { p.set(11 - (y >> 2), y, [0.6, 0.6, 0.6]); p.set(20 + (y >> 2), y, [0.6, 0.6, 0.6]); }
    p.rect(14, 22, 2, 2, [0.4, 0.4, 0.4]);
  });
  tex('labcoat', (p) => { p.fill([0.95, 0.95, 0.94]).grain(0.08, 4); p.vline(15, 0, 32, [0.7, 0.7, 0.7]); p.rect(12, 0, 8, 6, [0.6, 0.7, 0.85]); p.rect(20, 8, 6, 5, [0.82, 0.82, 0.82]); p.rect(21, 7, 1, 3, [0.2, 0.3, 0.8]); });
  tex('skin', (p) => { p.fill(C(0xd8a888)).grain(0.08, 4); });
  tex('hand', (p) => { p.fill(C(0xd8a888)).grain(0.08, 4); for (let x = 4; x < 32; x += 7) p.vline(x, 18, 14, C(0xb08060)); });
  tex('hair', (p) => { p.fill([0.85, 0.85, 0.85]).grain(0.5, 8); for (let k = 0; k < 40; k++) p.vline(p.r() * 32, p.r() * 32, 3, [0.6, 0.6, 0.6]); });
  tex('boot', (p) => { p.fill(C(0x2a2420)).grain(0.2, 4); p.rect(0, 26, 32, 6, C(0x15120f)); p.hline(0, 4, 32, C(0x4a4038)); });
  tex('fur', (p) => { p.fill([0.85, 0.85, 0.85]); for (let k = 0; k < 220; k++) p.blend(p.r() * 32, p.r() * 32, [0.5, 0.5, 0.5], 0.6); p.grain(0.4, 8); });
  tex('ushanka_f', (p) => { p.fill([0.85, 0.85, 0.85]); for (let k = 0; k < 220; k++) p.blend(p.r() * 32, p.r() * 32, [0.5, 0.5, 0.5], 0.6); p.grain(0.4, 8); p.rect(12, 14, 8, 8, C(0xc0a030)); p.rect(14, 16, 4, 4, C(0xc02018)); });
  tex('helmet', (p) => { p.fill([0.92, 0.92, 0.92]).grain(0.06, 4); p.rect(0, 22, 32, 3, [0.5, 0.5, 0.5]); p.rect(13, 6, 6, 8, C(0xd8702a)); });
  const face = (name, o) => tex(name, (p) => {
    const sk = C(o.skin || 0xd8a888), hair = C(o.hair || 0x3a2a1c);
    p.fill(sk).grain(0.08, 4);
    p.rect(0, 0, 32, o.hairline || 7, hair).grain(0.06, 4);
    if (o.bald) p.rect(0, 0, 32, 3, mix3(sk, [1, 1, 1], 0.15));
    p.rect(0, 0, 3, 16, hair); p.rect(29, 0, 3, 16, hair);
    const ey = o.eyeY || 13;
    p.rect(7, ey - 2, 7, 1, mix3(hair, sk, 0.3)); p.rect(18, ey - 2, 7, 1, mix3(hair, sk, 0.3)); // brows
    p.rect(8, ey, 5, 2, [0.95, 0.95, 0.92]); p.rect(19, ey, 5, 2, [0.95, 0.95, 0.92]);
    p.rect(10, ey, 2, 2, C(o.eye || 0x3a2a20)); p.rect(21, ey, 2, 2, C(o.eye || 0x3a2a20));
    p.rect(15, ey + 1, 2, 7, mix3(sk, [0, 0, 0], 0.12)); p.rect(14, ey + 7, 4, 1, mix3(sk, [0, 0, 0], 0.3)); // nose
    p.rect(11, ey + 11, 10, 1, C(0x8a4a3a)); p.rect(12, ey + 12, 8, 1, mix3(sk, [0, 0, 0], 0.15));
    if (o.tache) p.rect(10, ey + 9, 12, 2, hair);
    if (o.beard) { p.rect(4, ey + 10, 24, 32 - ey - 10, hair); p.rect(11, ey + 11, 10, 1, C(0x5a2a20)); }
    if (o.glasses) { p.ring(10.5, ey + 1, 3.2, 4.1, C(0x202020)); p.ring(21.5, ey + 1, 3.2, 4.1, C(0x202020)); p.hline(14, ey, 4, C(0x202020)); }
    if (o.monocle) { p.ring(21.5, ey + 1, 3.6, 4.6, C(0xd0c060)); p.vline(25, ey + 5, 10, C(0xd0c060)); }
    if (o.scar) for (let k = 0; k < 9; k++) p.set(6 + k, ey - 4 + k, C(0x9a5a4a));
    p.mrect(0, 28, 32, 4, 0.85); p.jitter(0.05);
  });
  face('face_a', { tache: true });
  face('face_b', { hair: 0x8a6a3a, eye: 0x3a5a7a });
  face('face_c', { skin: 0xc49070, hair: 0x101010, beard: true });
  face('face_d', { hair: 0x2a2018, hairline: 5, glasses: true });
  face('face_e', { skin: 0x9a6a4a, hair: 0x101010 });
  face('face_f', { skin: 0xe0b898, hair: 0xb09060, eye: 0x3a6a8a });
  face('face_sci', { hair: 0xc8c8c8, glasses: true, hairline: 4, bald: true });
  face('face_sci2', { skin: 0xe8c0a0, hair: 0x5a3018, glasses: true, eye: 0x2a6a3a });
  face('face_boss', { hair: 0xb8b8b0, hairline: 5, monocle: true, scar: true, eye: 0x6a8aa0 });
  tex('face_visor', (p) => { p.fill(C(0x2a2a2e)).grain(0.1, 4); p.rect(3, 8, 26, 9, C(0x101418)); p.brect(5, 9, 10, 2, C(0x8ad0ff), 0.5); p.bevel(3, 8, 26, 9, 0.6, 1.4); p.rect(10, 22, 12, 4, C(0x1a1a1a)); for (let x = 11; x < 21; x += 2) p.vline(x, 22, 4, C(0x404040)); });
  tex('face_back', (p) => { p.fill(C(0x3a2a1c)).grain(0.3, 8); p.rect(0, 22, 32, 10, C(0xd8a888)); p.grain(0.06, 4); });
  tex('face_side', (p) => { p.fill(C(0xd8a888)).grain(0.08, 4); p.rect(0, 0, 32, 9, C(0x3a2a1c)); p.rect(20, 0, 12, 16, C(0x3a2a1c)); p.disc(12, 14, 3, C(0xc89878)); p.ring(12, 14, 2, 3, C(0xa87858)); });
  // ---- weapons and gadgets
  tex('gunmetal', (p) => { p.fill(C(0x50545a)).grain(0.18, 4); p.hline(0, 0, 32, C(0x6a6e74)); p.hline(0, 31, 32, C(0x202226)); for (let x = 2; x < 32; x += 4) p.vline(x, 4, 24, C(0x33363a)); });
  tex('gunblue', (p) => { p.fill(C(0x3c4250)).grain(0.12, 4); p.rect(0, 0, 32, 3, C(0x6a7286)); p.hline(0, 16, 32, C(0x56607a)); for (let x = 3; x < 32; x += 5) p.vline(x, 20, 8, C(0x2a2e38)); });
  tex('gungrip', (p) => { p.fill(C(0x4a3020)); for (let y = 0; y < 32; y += 2) for (let x = (y >> 1) & 1; x < 32; x += 2) p.mul(x, y, 0.7); });
  tex('chrome', (p) => { p.each((x, y) => mix3(C(0x707a88), C(0xf4f8ff), 0.5 + 0.5 * Math.sin(y / 32 * TAU * 2))); p.hline(0, 0, 32, C(0xffffff)); });
  tex('camera_t', (p) => { p.fill(C(0x2a2a2a)).grain(0.2, 4); p.rect(0, 0, 32, 6, C(0xb0b0b0)); p.disc(16, 18, 8, C(0x101010)); p.ring(16, 18, 8, 10, C(0x8a8a8a)); p.disc(13, 15, 2, C(0x6a8ab0)); });
  tex('device', (p) => { p.fill(C(0x2c2c30)).grain(0.15, 4); p.bevel(0, 0, 32, 32, 1.4, 0.6); p.disc(16, 16, 4, C(0xff3020)); p.disc(15, 15, 1.5, C(0xffb0a0)); p.text('009', 10, 24, C(0xa0a0a0)); });
  tex('mine', (p) => { p.fill(C(0x3a4430)).grain(0.2, 4); p.ring(16, 16, 12, 15, C(0x20241a)); p.disc(16, 16, 4, C(0xffc020)); p.rivets([[16, 6], [6, 16], [26, 16], [16, 26]], C(0x8a8a7a)); });
  tex('keycard', (p) => { p.fill(C(0xe0d8c0)); p.rect(0, 4, 32, 6, C(0x202020)); p.rect(3, 14, 12, 12, C(0xc04030)); p.text('CMD', 17, 16, C(0x303030)); });
  tex('ammo_box', (p) => { p.fill(C(0x4a5a3a)).grain(0.2, 4); p.bevel(0, 0, 32, 32, 1.3, 0.6); p.rect(4, 10, 24, 12, C(0xd8c890)); p.text('AMMO', 8, 13, C(0x2a2a1a)); });
  tex('armor', (p) => { p.fill(C(0x2c4a6a)).grain(0.2, 4); for (let y = 2; y < 32; y += 6) p.hline(0, y, 32, C(0x1c3048)); p.rect(10, 0, 12, 7, C(0x15283a)); p.bevel(0, 0, 32, 32, 1.3, 0.6); });
  tex('tapereel', (p) => { p.fill(C(0xd0ccbc)); p.disc(16, 16, 14, C(0x4a3a2a)); p.disc(16, 16, 5, C(0xd0d0d0)); for (let k = 0; k < 3; k++) { const a = k * TAU / 3; p.disc(16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9, 2.5, C(0xd0ccbc)); } p.text('HELIOS', 4, 26, C(0xc02010)); });
  // ---- effects (additive or alpha-tested sprites)
  tex('flash', (p) => {
    p.fill([0, 0, 0], 0);
    p.each((x, y) => {
      const dx = x - 15.5, dy = y - 15.5, r = Math.hypot(dx, dy) / 16, a = Math.atan2(dy, dx);
      const star = 0.55 + 0.45 * Math.pow(Math.abs(Math.cos(a * 3)), 6);
      const v = clamp(1.25 - r / star * 1.25, 0, 1);
      return [v, v * 0.85, v * 0.45, 1];
    });
  });
  tex('spark', (p) => { p.fill([0, 0, 0]); p.each((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5); const v = clamp(1 - d / 9, 0, 1); return [v, v * 0.9, v * 0.6]; }); p.rect(15, 2, 2, 28, [1, 0.95, 0.7]); p.rect(2, 15, 28, 2, [1, 0.95, 0.7]); });
  tex('smoke', (p) => { p.each((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5) / 16; const n = fbm(x, y, 61, 4); const a = clamp((1 - d) * 1.6 * n * 1.4, 0, 1); return [0.55, 0.55, 0.55, a]; }); });
  tex('dust', (p) => { p.each((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5) / 16; const n = fbm(x, y, 63, 4); const a = clamp((1 - d) * 1.6 * n * 1.4, 0, 1); return [0.72, 0.64, 0.5, a]; }); });
  for (let f = 0; f < 4; f++) tex('expl' + f, (p) => {
    const age = f / 3;
    p.each((x, y) => {
      const d = Math.hypot(x - 15.5, y - 15.5) / 16, n = fbm(x, y, 70 + f, 4);
      const v = clamp((1 - d * (1.1 - age * 0.3)) * 1.8 * (0.6 + n * 0.8) - age * 0.5, 0, 1);
      return [v, v * v * (0.95 - age * 0.3), v * v * v * (0.6 - age * 0.4)];
    });
  });
  tex('shard', (p) => { p.fill([0, 0, 0], 0); for (let y = 4; y < 28; y++) for (let x = 16 - (28 - y) / 3; x < 16 + (y - 4) / 3; x++) p.set(x, y, [0.75, 0.9, 1], 1); });
  tex('hole', (p) => { p.fill([0, 0, 0], 0); p.disc(16, 16, 9, [0.25, 0.23, 0.2]); p.disc(16, 16, 6, [0.08, 0.07, 0.06]); for (let k = 0; k < 6; k++) { const a = k * 1.1; p.set(16 + Math.cos(a) * 11, 16 + Math.sin(a) * 11, [0.3, 0.28, 0.25]); } });
  tex('scorch', (p) => { p.each((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5) / 16; const n = fbm(x, y, 81, 4); return [0.05, 0.05, 0.05, (1 - d) * 1.3 * (0.5 + n) > 0.6 ? 1 : 0]; }); });
  tex('beam', (p) => { p.each((x, y) => { const d = Math.abs(y - 15.5) / 16; const v = clamp(1 - d * 2.2, 0, 1); return [v * 0.5, v, v]; }); });
  tex('white', (p) => p.fill([1, 1, 1]));
  tex('black', (p) => p.fill([0, 0, 0]));
  tex('glow', (p) => { p.each((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5) / 16; const v = clamp(1 - d, 0, 1); return [v * v, v * v, v * v]; }); });
}

// Box-filter the atlas down for the mip levels. Alpha-weighted so cut-out textures keep their colour.
function downsample(src, size) {
  const n = size >> 1, out = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const s = ((y * 2 + j) * size + x * 2 + i) * 4, w = src[s + 3] / 255 + 1e-3;
      r += src[s] * w; g += src[s + 1] * w; b += src[s + 2] * w; a += src[s + 3];
    }
    let wt = 0;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) wt += src[((y * 2 + j) * size + x * 2 + i) * 4 + 3] / 255 + 1e-3;
    const o = (y * n + x) * 4;
    out[o] = r / wt; out[o + 1] = g / wt; out[o + 2] = b / wt; out[o + 3] = a / 4;
  }
  return out;
}
let ATLAS = null;  // [THREE.DataTexture x3]
function buildAtlas() {
  paintTextures();
  const l1 = downsample(atlas0, AS), l2 = downsample(l1, AS >> 1);
  const mk = (data, size) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.flipY = false; t.needsUpdate = true;
    return t;
  };
  ATLAS = [mk(atlas0, AS), mk(l1, AS >> 1), mk(l2, AS >> 2)];
}
