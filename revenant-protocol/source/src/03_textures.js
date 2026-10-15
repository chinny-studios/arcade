// Revenant Protocol — procedural 64x64 pixel textures. Alpha holds "unlit" (emissive) amount: 255 = lit, 0 = glows.

const TEX = {};
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function makeTex(name, fn, S = 64, seed = 0) {
  const d = new Uint8Array(S * S * 4);
  const idx = (x, y) => ((S - 1 - (((y % S) + S) % S)) * S + (((x % S) + S) % S)) * 4;
  const T = {
    S,
    px(x, y, c, e = 0) {
      const i = idx(x | 0, y | 0);
      d[i] = clamp(c[0], 0, 255); d[i + 1] = clamp(c[1], 0, 255); d[i + 2] = clamp(c[2], 0, 255);
      d[i + 3] = Math.round(255 * (1 - clamp(e, 0, 1)));
    },
    get(x, y) { const i = idx(x | 0, y | 0); return [d[i], d[i + 1], d[i + 2]]; },
    emis(x, y) { return 1 - d[idx(x | 0, y | 0) + 3] / 255; },
    rect(x, y, w, h, c, e = 0) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) T.px(i, j, c, e); },
    fill(c) { T.rect(0, 0, S, S, c); },
    each(f) { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) f(x, y); },
    mul(x, y, k) { const c = T.get(x, y); T.px(x, y, shade(c, k), T.emis(x, y)); },
    grain(a, s = seed) { T.each((x, y) => { if (T.emis(x, y) > 0) return; const n = (hash2(x + s * 131, y + s * 71) - 0.5) * a; const c = T.get(x, y); T.px(x, y, [c[0] + n, c[1] + n, c[2] + n]); }); },
    hline(x, y, w, c, e) { T.rect(x, y, w, 1, c, e); },
    vline(x, y, h, c, e) { T.rect(x, y, 1, h, c, e); },
    // A raised panel: highlight on top/left edges, shadow on bottom/right.
    bevel(x, y, w, h, k = 1) {
      for (let i = x; i < x + w; i++) { T.mul(i, y, 1 + 0.25 * k); T.mul(i, y + h - 1, 1 - 0.35 * k); }
      for (let j = y + 1; j < y + h - 1; j++) { T.mul(x, j, 1 + 0.25 * k); T.mul(x + w - 1, j, 1 - 0.35 * k); }
    },
    rivet(x, y) { T.px(x, y, shade(T.get(x, y), 1.35)); T.px(x + 1, y + 1, shade(T.get(x + 1, y + 1), 0.6)); },
  };
  fn(T);
  const tex = new THREE.DataTexture(d, S, S, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  TEX[name] = tex;
  return tex;
}

// Shared building blocks
function metalPanels(T, base, cell = 32, seam = 0.45) {
  T.fill(base); T.grain(10);
  for (let y = 0; y < 64; y += cell) for (let x = 0; x < 64; x += cell) {
    T.bevel(x, y, cell, cell, 1);
    T.hline(x, y + cell - 1, cell, shade(base, seam)); T.vline(x + cell - 1, y, cell, shade(base, seam));
    T.rivet(x + 3, y + 3); T.rivet(x + cell - 5, y + 3); T.rivet(x + 3, y + cell - 5); T.rivet(x + cell - 5, y + cell - 5);
  }
}
function hazard(T, x, y, w, h, a = [220, 170, 30], b = [30, 28, 26]) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) T.px(i, j, ((i + j) >> 3) & 1 ? a : b);
}

function buildTextures() {
  // --- Ascendancy interiors ---
  makeTex('panel', (T) => {
    metalPanels(T, [150, 152, 160]);
    for (let x = 0; x < 64; x++) { T.mul(x, 30, 0.7); T.mul(x, 33, 0.7); }
  });
  makeTex('panel2', (T) => {
    T.fill([92, 96, 106]); T.grain(8);
    for (let x = 0; x < 64; x += 8) { T.vline(x, 0, 64, [70, 73, 82]); T.vline(x + 1, 0, 64, [118, 122, 132]); }
    T.rect(0, 8, 64, 5, [128, 40, 34]); T.hline(0, 8, 64, [170, 70, 60]); T.hline(0, 12, 64, [70, 20, 18]);
    T.rect(0, 52, 64, 3, [60, 62, 70]);
  });
  makeTex('trim', (T) => {
    metalPanels(T, [135, 138, 146], 64);
    T.rect(0, 26, 64, 12, [40, 42, 48]);
    for (let x = 2; x < 64; x += 6) T.rect(x, 29, 3, 6, [220, 60, 40], 1);
  });
  makeTex('tech', (T) => {
    metalPanels(T, [126, 130, 138]);
    T.rect(8, 10, 48, 26, [18, 22, 26]); T.bevel(7, 9, 50, 28, -1);
    T.rect(10, 12, 44, 22, [8, 28, 22], 1);
    for (let y = 14; y < 32; y += 3) { let x = 12; while (x < 50) { const w = 2 + ((hash2(x, y) * 7) | 0); if (hash2(y, x) > 0.25) T.rect(x, y, Math.min(w, 52 - x), 1, [70, 230, 150], 1); x += w + 1; } }
    for (let x = 10; x < 56; x += 6) { const c = pick([[255, 60, 40], [255, 190, 40], [60, 255, 110], [60, 160, 255]]); T.rect(x, 44, 3, 3, c, 1); }
    T.rect(10, 52, 44, 4, [60, 62, 68]);
  });
  makeTex('screen', (T) => {
    T.fill([60, 64, 72]); T.grain(8);
    T.rect(4, 6, 56, 34, [20, 24, 30]);
    T.rect(6, 8, 25, 30, [10, 24, 46], 1); T.rect(33, 8, 25, 30, [10, 24, 46], 1);
    for (let i = 0; i < 2; i++) {
      const ox = 6 + i * 27;
      for (let x = 0; x < 25; x++) { const y = 23 + Math.round(Math.sin((x + i * 9) * 0.5) * 6 * (i ? 0.6 : 1)); T.px(ox + x, y, [110, 200, 255], 1); }
      T.hline(ox, 23, 25, [40, 80, 120], 1); T.vline(ox + 12, 8, 30, [40, 80, 120], 1);
    }
    T.rect(4, 44, 56, 16, [80, 84, 92]); T.bevel(4, 44, 56, 16);
    for (let x = 8; x < 58; x += 5) T.rect(x, 48 + ((x / 5) % 2) * 5, 3, 2, pick([[255, 70, 50], [255, 210, 60], [80, 255, 120], [120, 200, 255]]), 1);
  });
  makeTex('pipe', (T) => {
    T.fill([52, 55, 60]); T.grain(8);
    for (const [px, w] of [[4, 10], [22, 6], [36, 14], [56, 6]]) {
      for (let x = 0; x < w; x++) { const k = 0.55 + 0.7 * Math.sin((x + 0.5) / w * Math.PI); T.rect(px + x, 0, 1, 64, shade([120, 118, 108], k)); }
      for (let y = 6; y < 64; y += 32) T.rect(px - 1, y, w + 2, 3, [70, 70, 74]);
    }
  });
  makeTex('vent', (T) => {
    metalPanels(T, [110, 114, 120], 64);
    T.rect(8, 8, 48, 48, [30, 32, 36]);
    for (let y = 10; y < 56; y += 5) { T.rect(9, y, 46, 3, [90, 94, 100]); T.hline(9, y, 46, [130, 134, 140]); }
  });
  makeTex('floor', (T) => {
    T.fill([108, 110, 116]); T.grain(12);
    for (let y = 0; y < 64; y += 16) T.hline(0, y, 64, [66, 68, 74]);
    for (let x = 0; x < 64; x += 16) T.vline(x, 0, 64, [66, 68, 74]);
    for (let i = 0; i < 4; i++) { const cx = (hash2(i, 9) * 64) | 0, cy = (hash2(9, i) * 64) | 0; for (let a = 0; a < 30; a++) T.mul(cx + ((hash2(a, i) * 9) | 0) - 4, cy + ((hash2(i, a) * 7) | 0) - 3, 0.85); }
  });
  makeTex('grate', (T) => {
    T.fill([44, 46, 50]);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if ((x % 4 === 0) || (y % 4 === 0)) T.px(x, y, [88, 90, 96]); else T.px(x, y, [16, 17, 20]);
    T.grain(8);
    for (let i = 0; i < 64; i++) { T.px(i, 0, [120, 122, 128]); T.px(0, i, [120, 122, 128]); T.px(i, 32, [110, 112, 118]); T.px(32, i, [110, 112, 118]); }
  });
  makeTex('plate', (T) => {
    T.fill([118, 120, 126]); T.grain(10);
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
      const o = ((y / 8) % 2) * 4;
      T.px(x + o + 1, y + 2, [160, 162, 170]); T.px(x + o + 2, y + 1, [160, 162, 170]); T.px(x + o + 2, y + 3, [70, 72, 78]); T.px(x + o + 3, y + 2, [70, 72, 78]);
    }
    T.bevel(0, 0, 64, 64);
  });
  makeTex('ceil', (T) => {
    metalPanels(T, [84, 88, 96]);
    T.rect(4, 28, 56, 8, [60, 62, 68]); T.rect(6, 29, 52, 6, [235, 240, 230], 1);
  });
  makeTex('ceil2', (T) => { metalPanels(T, [70, 73, 80]); });
  makeTex('lightpanel', (T) => {
    T.fill([70, 72, 78]); T.rect(4, 4, 56, 56, [230, 236, 228], 1);
    for (let i = 4; i < 60; i += 13) { T.hline(4, i, 56, [190, 200, 196], 1); }
  });
  makeTex('redlight', (T) => {
    metalPanels(T, [90, 70, 70], 64);
    T.rect(12, 20, 40, 24, [40, 20, 20]); T.rect(14, 22, 36, 20, [255, 70, 50], 1);
  });
  makeTex('door', (T) => {
    metalPanels(T, [128, 132, 140], 32);
    T.rect(0, 56, 64, 8, [40, 40, 44]); hazard(T, 0, 57, 64, 7);
    T.rect(0, 28, 64, 8, [80, 84, 92]); T.bevel(0, 28, 64, 8);
  });
  for (const [k, c] of [['r', [230, 50, 40]], ['b', [50, 130, 255]], ['y', [250, 210, 40]]]) {
    makeTex('door_' + k, (T) => {
      metalPanels(T, [116, 120, 128], 32);
      T.rect(0, 56, 64, 8, [40, 40, 44]); hazard(T, 0, 57, 64, 7);
      T.rect(0, 26, 64, 12, [30, 30, 34]); T.rect(2, 28, 60, 8, c, 1);
      T.rect(26, 24, 12, 16, [30, 30, 34]); T.rect(28, 26, 8, 12, shade(c, 0.6), 1);
    });
  }
  makeTex('lift', (T) => {
    T.fill([100, 104, 110]); T.grain(10);
    hazard(T, 0, 0, 64, 6);
    for (let y = 10; y < 64; y += 9) { T.hline(0, y, 64, [70, 72, 78]); T.hline(0, y + 1, 64, [130, 134, 140]); }
  });
  makeTex('lifttop', (T) => {
    T.fill([60, 62, 66]);
    for (let y = 4; y < 60; y++) for (let x = 4; x < 60; x++) T.px(x, y, (x % 4 === 0 || y % 4 === 0) ? [100, 102, 108] : [34, 35, 38]);
    T.grain(6);
    hazard(T, 0, 0, 64, 4); hazard(T, 0, 60, 64, 4); hazard(T, 0, 0, 4, 64); hazard(T, 60, 0, 4, 64);
  });
  makeTex('hazard', (T) => { hazard(T, 0, 0, 64, 64); T.grain(14); });
  makeTex('crate', (T) => {
    T.fill([112, 98, 64]); T.grain(14);
    T.rect(0, 0, 64, 6, [86, 74, 48]); T.rect(0, 58, 64, 6, [86, 74, 48]); T.rect(0, 0, 6, 64, [86, 74, 48]); T.rect(58, 0, 6, 64, [86, 74, 48]);
    for (let i = 6; i < 58; i++) { T.rect(i, i - 2, 2, 3, [92, 80, 52]); }
    T.bevel(0, 0, 64, 64); T.bevel(6, 6, 52, 52, -1);
    T.rect(40, 12, 12, 6, [210, 200, 170]);
  });
  makeTex('cratetop', (T) => {
    T.fill([104, 92, 60]); T.grain(14);
    for (let y = 0; y < 64; y += 10) T.hline(0, y, 64, [80, 70, 46]);
    T.bevel(0, 0, 64, 64);
  });
  makeTex('crate2', (T) => {
    T.fill([70, 78, 90]); T.grain(10);
    T.rect(4, 4, 56, 56, [84, 92, 104]); T.bevel(4, 4, 56, 56);
    T.rect(10, 26, 44, 12, [200, 200, 205]); T.rect(12, 28, 40, 8, [60, 66, 76]);
    T.rect(0, 0, 64, 2, [50, 54, 60]);
  });
  // --- Kesh exteriors ---
  makeTex('sand', (T) => {
    T.each((x, y) => {
      const n = fbmW(x / 16, y / 16, 4, 3);
      const r = Math.sin((y + n * 14) * (TAU / 16)) * 0.5 + 0.5;
      T.px(x, y, mixc([186, 140, 92], [214, 170, 116], r * 0.6 + n * 0.4));
    });
    T.grain(16);
  });
  makeTex('cliff', (T) => {
    const bands = [[176, 112, 70], [196, 140, 92], [150, 92, 60], [206, 156, 104], [168, 108, 72], [186, 128, 84]];
    T.each((x, y) => {
      const n = fbmW(x / 16, y / 16, 4, 3);
      const b = Math.floor((y + n * 10) / 64 * 6 + 6) % 6;
      T.px(x, y, shade(bands[b], 0.85 + n * 0.3));
    });
    T.grain(18);
  });
  makeTex('rock', (T) => {
    T.each((x, y) => { const n = fbmW(x / 8, y / 8, 8, 3); T.px(x, y, mixc([70, 64, 60], [130, 120, 108], n)); });
    T.grain(20);
  });
  makeTex('concrete', (T) => {
    T.each((x, y) => { const n = fbmW(x / 16, y / 16, 4, 4); T.px(x, y, mixc([96, 98, 100], [134, 136, 136], n)); });
    T.grain(14);
    T.hline(0, 0, 64, [70, 72, 74]); T.vline(0, 0, 64, [70, 72, 74]);
  });
  // --- Talmor ---
  makeTex('brick', (T) => {
    T.fill([40, 44, 38]);
    for (let r = 0; r < 8; r++) for (let b = 0; b < 4; b++) {
      const o = (r % 2) * 8, x = b * 16 + o, y = r * 8;
      const k = 0.75 + hash2(r, b) * 0.4;
      T.rect(x + 1, y + 1, 15, 7, shade([92, 84, 64], k)); T.bevel(x + 1, y + 1, 15, 7, 0.6);
    }
    T.grain(14);
    T.each((x, y) => { if (y > 40) T.mul(x, y, lerp(1, 0.55, (y - 40) / 24) * (0.9 + 0.2 * hash2(x, 3))); });
  });
  makeTex('grime', (T) => {
    T.each((x, y) => { const n = fbmW(x / 16, y / 8, 4, 3); T.px(x, y, mixc([64, 70, 60], [104, 110, 96], n)); });
    for (let i = 0; i < 9; i++) { const x0 = (hash2(i, 4) * 64) | 0, l = 20 + hash2(4, i) * 44; for (let y = 0; y < l; y++) T.mul(x0, y, 0.7); }
    T.grain(12);
  });
  makeTex('citywall', (T) => {
    T.fill([46, 48, 58]); T.grain(10);
    for (let y = 4; y < 64; y += 12) for (let x = 3; x < 64; x += 10) {
      const lit = hash2(x, y) > 0.55;
      T.rect(x, y, 6, 7, lit ? [255, 200, 110] : [24, 26, 34], lit ? 1 : 0);
    }
  });
  makeTex('cellbars', (T) => {
    T.fill([200, 204, 210]); T.grain(8);
    for (let y = 0; y < 64; y += 32) T.bevel(0, y, 64, 32);
    T.rect(0, 2, 64, 3, [255, 60, 40], 1);
  });
  makeTex('water', (T) => {
    T.each((x, y) => {
      const w = Math.sin(x * TAU / 32 + Math.sin(y * TAU / 64) * 2) * 0.5 + Math.sin(y * TAU / 16 + x * TAU / 64) * 0.5;
      T.px(x, y, mixc([26, 58, 64], [70, 120, 120], w * 0.5 + 0.5), 0.15);
    });
  });
  makeTex('sludge', (T) => {
    T.each((x, y) => {
      const n = fbmW(x / 16, y / 16, 4, 3);
      T.px(x, y, mixc([50, 90, 20], [120, 180, 40], n), 0.4);
    });
    for (let i = 0; i < 12; i++) { const x = (hash2(i, 1) * 60) | 0, y = (hash2(1, i) * 60) | 0; T.rect(x, y, 2, 2, [190, 240, 90], 0.8); }
  });
  // --- Kethra ---
  makeTex('lava', (T) => {
    T.each((x, y) => {
      const n = fbmW(x / 16, y / 16, 4, 4);
      const hot = smooth(0.42, 0.62, n);
      T.px(x, y, mixc([70, 20, 10], [255, 190, 60], hot), 0.55 + hot * 0.45);
    });
  });
  makeTex('basalt', (T) => {
    T.each((x, y) => { const n = fbmW(x / 8, y / 8, 8, 3); T.px(x, y, mixc([34, 30, 32], [80, 70, 68], n)); });
    T.grain(18);
    for (let i = 0; i < 6; i++) { let x = (hash2(i, 7) * 64) | 0; for (let y = 0; y < 64; y++) { x += Math.round(hash2(i, y) * 2 - 1); T.px(x, y, [120, 40, 16], 0.6); } }
  });
  makeTex('ice', (T) => {
    T.each((x, y) => { const n = fbmW(x / 16, y / 16, 4, 3); T.px(x, y, mixc([150, 190, 215], [214, 236, 248], n), 0.12); });
    for (let i = 0; i < 5; i++) { let x = (hash2(i, 2) * 64) | 0, y = (hash2(2, i) * 64) | 0; for (let s = 0; s < 40; s++) { T.px(x, y, [250, 255, 255], 0.2); x += Math.round(hash2(i, s) * 2 - 0.6); y += Math.round(hash2(s, i) * 2 - 0.6); } }
  });
  makeTex('foundry', (T) => {
    metalPanels(T, [96, 84, 76], 32, 0.4);
    T.each((x, y) => { if (y > 44) T.mul(x, y, lerp(1, 0.6, (y - 44) / 20)); });
    T.rect(0, 12, 64, 3, [255, 120, 40], 0.8);
  });
  // --- Litany ---
  makeTex('hull', (T) => {
    metalPanels(T, [58, 60, 68], 32, 0.5);
    T.rect(0, 46, 64, 4, [150, 30, 26]);
  });
  makeTex('shipwall', (T) => {
    T.fill([30, 32, 38]); T.grain(6);
    for (let y = 0; y < 64; y += 16) T.hline(0, y, 64, [92, 96, 108]);
    T.vline(0, 0, 64, [92, 96, 108]); T.vline(32, 0, 64, [70, 74, 84]);
    for (let y = 6; y < 64; y += 16) { T.rect(4, y, 2, 2, [90, 170, 255], 1); T.rect(36, y, 2, 2, [90, 170, 255], 1); }
  });
  makeTex('window', (T) => {
    T.fill([20, 22, 28]);
    T.rect(4, 4, 56, 56, [2, 3, 8], 1);
    for (let i = 0; i < 40; i++) { const x = 4 + ((hash2(i, 5) * 56) | 0), y = 4 + ((hash2(5, i) * 56) | 0); const b = 120 + hash2(i, i) * 135; T.px(x, y, [b, b, b + 10], 1); }
    T.bevel(3, 3, 58, 58, -1);
  });
  makeTex('field', (T) => {
    T.each((x, y) => { const s = (y % 4 === 0) ? 1 : 0.35 + 0.25 * Math.sin(x * TAU / 32); T.px(x, y, [80 * s, 200 * s, 255 * s], 1); });
  });
  makeTex('switch_off', (T) => {
    T.fill([60, 62, 70]); T.bevel(0, 0, 32, 32);
    T.rect(8, 6, 16, 20, [30, 30, 34]); T.rect(13, 14, 6, 10, [160, 160, 170]); T.rect(12, 6, 8, 4, [230, 50, 40], 1);
  }, 32);
  makeTex('switch_on', (T) => {
    T.fill([60, 62, 70]); T.bevel(0, 0, 32, 32);
    T.rect(8, 6, 16, 20, [30, 30, 34]); T.rect(13, 8, 6, 10, [160, 160, 170]); T.rect(12, 22, 8, 4, [60, 240, 90], 1);
  }, 32);
  makeTex('pump', (T) => {
    metalPanels(T, [70, 110, 140], 32);
    T.rect(20, 8, 24, 48, [30, 40, 50]); T.rect(24, 12, 16, 40, [80, 220, 255], 1);
  });
  makeTex('pumpdead', (T) => {
    T.fill([40, 36, 34]); T.grain(30);
    T.rect(20, 8, 24, 48, [20, 18, 18]);
  });
}
