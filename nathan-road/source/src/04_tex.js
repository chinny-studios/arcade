// 04_tex: every texture is drawn in code. The main atlas is 16x16 tiles of 64 px with two mips. Alpha has three
// meanings: 0 = cut out, 128..230 = window glass that may light up at night, 255 = solid. The sign atlas holds shop
// signs and landmark lettering at absolute uv; it is built after the sign font has loaded.
const T = {};            // tile name -> index
const TILE_FNS = [];
function tile(name, fn) { T[name] = TILE_FNS.length; TILE_FNS.push(fn); }

// ---- small drawing helpers (x: 2d context of the colour layer, m: of the glass mask layer)
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
function jitter(x, base, amt, step = 1, w = TILE, h = TILE, x0 = 0, y0 = 0) {
  for (let y = y0; y < y0 + h; y += step) for (let i = x0; i < x0 + w; i += step) {
    const k = (RNG() - 0.5) * amt;
    x.fillStyle = rgb(base[0] + k, base[1] + k, base[2] + k); x.fillRect(i, y, step, step);
  }
}
function rect(x, c, a, b, w, h) { x.fillStyle = c; x.fillRect(a, b, w, h); }
function glass(x, m, a, b, w, h, c1, c2) {
  const g = x.createLinearGradient(a, b, a + w, b + h); g.addColorStop(0, c1); g.addColorStop(1, c2);
  x.fillStyle = g; x.fillRect(a, b, w, h); m.fillStyle = '#fff'; m.fillRect(a, b, w, h);
}
function speckle(x, n, cols) { for (let i = 0; i < n; i++) { x.fillStyle = rpick(cols); x.fillRect(rint(0, 63), rint(0, 63), 1, 1); } }
function grime(x, amt = 0.25) {   // streaks under windows and along the bottom
  for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(30,25,20,${rnd(0.03, amt * 0.4)})`; x.fillRect(rint(0, 62), rint(0, 40), rint(1, 3), rint(8, 30)); }
}

// ---------------- ground
tile('white', (x) => rect(x, '#fff', 0, 0, 64, 64));
tile('asphalt', (x) => { jitter(x, [74, 74, 76], 14, 2); speckle(x, 80, ['#5a5a5c', '#8a8a88', '#444']); });
tile('asphalt2', (x) => { jitter(x, [84, 83, 82], 12, 2); for (let i = 0; i < 3; i++) rect(x, 'rgba(40,40,40,.35)', rint(0, 50), rint(0, 50), rint(10, 30), rint(6, 14)); });
tile('pave', (x) => {           // grey 300 mm slabs with the odd stained one
  jitter(x, [168, 166, 160], 10, 2);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const k = RNG(); if (k < 0.2) rect(x, `rgba(${k < 0.08 ? '150,70,60' : '90,90,90'},.18)`, i * 16, j * 16, 16, 16);
  }
  x.fillStyle = 'rgba(70,70,70,.55)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); }
});
tile('paveRed', (x) => {        // red and grey interlocking pavers
  for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) {
    const red = (i + j) % 3 !== 0, k = RNG() * 18;
    rect(x, red ? rgb(150 + k, 72 + k, 62 + k) : rgb(150 + k, 148 + k, 140 + k), i * 16 + (j % 2) * 8, j * 8, 15, 7);
    rect(x, red ? rgb(150 + k, 72 + k, 62 + k) : rgb(150 + k, 148 + k, 140 + k), i * 16 + (j % 2) * 8 - 64, j * 8, 15, 7);
  }
  x.globalCompositeOperation = 'destination-over'; rect(x, '#5a4a44', 0, 0, 64, 64); x.globalCompositeOperation = 'source-over';
});
tile('plaza', (x) => { jitter(x, [196, 186, 168], 8, 2); x.fillStyle = 'rgba(90,80,70,.5)'; for (let i = 0; i < 64; i += 32) { x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); } });
tile('deck', (x) => { for (let i = 0; i < 64; i += 8) { const k = RNG() * 20; rect(x, rgb(120 + k, 88 + k, 62 + k), 0, i, 64, 7); rect(x, '#3a2a20', 0, i + 7, 64, 1); } });
tile('kerb', (x) => { jitter(x, [182, 180, 174], 12, 2); rect(x, 'rgba(60,60,60,.35)', 0, 0, 64, 6); x.fillStyle = 'rgba(40,40,40,.5)'; for (let i = 0; i < 64; i += 32) x.fillRect(i, 0, 1, 64); });
tile('grass', (x) => { jitter(x, [76, 116, 52], 26, 2); speckle(x, 60, ['#8db35a', '#3e6a2a', '#a7b860']); });
tile('soil', (x) => { jitter(x, [96, 74, 52], 22, 2); speckle(x, 40, ['#4a6a30', '#6b8a3a']); });
tile('track', (x) => { jitter(x, [160, 70, 56], 14, 2); });
tile('court', (x) => { jitter(x, [70, 110, 120], 8, 4); rect(x, '#eee', 0, 30, 64, 2); });
tile('water', (x) => { jitter(x, [40, 78, 92], 10, 2); for (let i = 0; i < 18; i++) rect(x, 'rgba(160,200,210,.25)', rint(0, 56), rint(0, 63), rint(4, 10), 1); });
tile('pool', (x) => { jitter(x, [60, 150, 190], 10, 2); for (let i = 0; i < 12; i++) rect(x, 'rgba(230,250,255,.4)', rint(0, 56), rint(0, 63), rint(3, 8), 1); });
tile('concrete', (x) => { jitter(x, [158, 154, 146], 14, 2); grime(x, 0.2); });
tile('seawall', (x) => { jitter(x, [122, 118, 108], 16, 2); for (let j = 0; j < 64; j += 16) for (let i = (j / 16) % 2 * 16; i < 64; i += 32) { x.strokeStyle = 'rgba(40,40,40,.5)'; x.strokeRect(i + 0.5, j + 0.5, 31, 15); } rect(x, 'rgba(30,60,40,.45)', 0, 44, 64, 20); });
tile('roof', (x) => { jitter(x, [130, 128, 122], 16, 2); for (let i = 0; i < 6; i++) rect(x, 'rgba(50,50,45,.18)', rint(0, 50), rint(0, 50), rint(6, 20), rint(6, 20)); });
tile('roofGreen', (x) => { jitter(x, [92, 120, 104], 10, 2); x.fillStyle = 'rgba(40,60,50,.4)'; for (let i = 0; i < 64; i += 16) x.fillRect(i, 0, 1, 64); });
tile('lane', (x) => { jitter(x, [222, 222, 214], 8, 2); });
tile('yellow', (x) => { jitter(x, [214, 178, 40], 10, 2); });
tile('tactile', (x) => { rect(x, '#c8a428', 0, 0, 64, 64); x.fillStyle = '#e6c440'; for (let j = 4; j < 64; j += 10) for (let i = 4; i < 64; i += 10) x.fillRect(i, j, 5, 5); });

// ---------------- facades. One tile = one bay (about 3.6 m) by one floor (3.2 m). Walls map v up.
function winFrame(x, m, a, b, w, h, frame, g1, g2, bars) {
  rect(x, frame, a - 1, b - 1, w + 2, h + 2);
  glass(x, m, a, b, w, h, g1, g2);
  rect(x, frame, a + (w >> 1), b, 1, h);
  if (bars) { x.fillStyle = 'rgba(40,40,40,.8)'; for (let i = a + 2; i < a + w; i += 4) x.fillRect(i, b, 1, h); }
}
function acUnit(x, a, b) { rect(x, '#d8d6d0', a, b, 12, 8); rect(x, '#9a9890', a + 2, b + 2, 8, 4); x.fillStyle = '#666'; for (let i = a + 2; i < a + 10; i += 2) x.fillRect(i, b + 2, 1, 4); }
function laundry(x, a, b) { rect(x, '#777', a, b, 24, 1); const cs = ['#d33', '#36c', '#eee', '#e9c23a', '#5a5', '#c6c']; for (let i = 0; i < 4; i++) rect(x, rpick(cs), a + 2 + i * 6, b + 1, 4, rint(5, 9)); }
function tenement(name, wall, frame, opts = {}) {
  tile(name, (x, m) => {
    jitter(x, wall, opts.tex || 10, opts.mosaic ? 2 : 4);
    if (opts.mosaic) { x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 64; i += 4) { x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); } }
    rect(x, 'rgba(0,0,0,.18)', 0, 0, 64, 3);                    // floor slab line
    const ww = opts.wide ? 50 : 34, wx = opts.wide ? 7 : 15;
    winFrame(x, m, wx, 14, ww, 30, frame, opts.g1 || '#4f6672', opts.g2 || '#7d97a3', opts.bars && RNG() < 0.6);
    if (RNG() < 0.7) acUnit(x, rint(2, 48), 48);
    if (opts.laundry && RNG() < 0.6) laundry(x, rint(4, 36), 46);
    grime(x, opts.grime || 0.25);
  });
}
rseed('tiles');
tenement('ten1', [214, 204, 176], '#c9c7c0', { bars: true, laundry: true });
tenement('ten2', [196, 150, 136], '#ddd', { mosaic: true, wide: true });
tenement('ten3', [150, 148, 140], '#888', { laundry: true, bars: true, grime: 0.5 });
tenement('ten4', [150, 186, 160], '#e0e0d8', { mosaic: true });
tenement('ten5', [210, 190, 120], '#bdb7a8', { bars: true });
tenement('ten6', [186, 196, 208], '#f0f0f0', { mosaic: true, wide: true });
tile('office1', (x, m) => {         // curtain wall
  glass(x, m, 0, 0, 64, 64, '#3d6470', '#7aa2ad');
  rect(x, '#2a3a40', 0, 0, 64, 3); rect(x, '#b8c4c8', 0, 3, 64, 1); rect(x, '#2a3a40', 31, 0, 2, 64);
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(4, 8, 20, 50);
});
tile('office2', (x, m) => {         // stone and strip windows
  jitter(x, [176, 172, 164], 8, 4);
  glass(x, m, 0, 18, 64, 28, '#384c58', '#6e8794'); rect(x, '#555f66', 0, 18, 64, 2); rect(x, '#888', 20, 18, 2, 28); rect(x, '#888', 42, 18, 2, 28);
});
tile('office3', (x, m) => {         // dark glass tower
  glass(x, m, 0, 0, 64, 64, '#1e2c3a', '#40576a');
  rect(x, '#0e141a', 0, 0, 64, 2); for (let i = 0; i < 64; i += 16) rect(x, '#2d3d4a', i, 0, 1, 64);
});
tile('hotel1', (x, m) => {
  jitter(x, [206, 196, 178], 6, 4);
  winFrame(x, m, 8, 12, 20, 34, '#8a8070', '#4a5862', '#8ea0aa'); winFrame(x, m, 36, 12, 20, 34, '#8a8070', '#4a5862', '#8ea0aa');
  rect(x, 'rgba(0,0,0,.15)', 0, 0, 64, 3);
});
tile('mall', (x) => { jitter(x, [200, 198, 192], 6, 4); x.fillStyle = 'rgba(80,80,80,.35)'; for (let i = 0; i < 64; i += 21) x.fillRect(i, 0, 1, 64); x.fillRect(0, 32, 64, 1); });
tile('mallGlass', (x, m) => { jitter(x, [210, 206, 198], 6, 4); glass(x, m, 4, 10, 56, 44, '#40525e', '#91a7b2'); rect(x, '#ccc', 31, 10, 2, 44); });
tile('heritage', (x, m) => {        // colonial arcade: arched windows, cream render
  jitter(x, [228, 220, 196], 6, 4);
  x.fillStyle = '#4a5560'; x.beginPath(); x.moveTo(16, 50); x.lineTo(16, 24); x.arc(32, 24, 16, Math.PI, 0); x.lineTo(48, 50); x.fill();
  m.fillStyle = '#fff'; m.beginPath(); m.moveTo(18, 50); m.lineTo(18, 24); m.arc(32, 24, 14, Math.PI, 0); m.lineTo(46, 50); m.fill();
  rect(x, '#d8cfb4', 0, 52, 64, 6); rect(x, '#bcb294', 0, 0, 64, 4); rect(x, '#d0c6a8', 0, 0, 6, 64); rect(x, '#d0c6a8', 58, 0, 6, 64);
});
tile('brick', (x) => {
  for (let j = 0; j < 16; j++) for (let i = -1; i < 5; i++) { const k = RNG() * 26; rect(x, rgb(150 + k, 64 + k * 0.4, 48), i * 16 + (j % 2) * 8, j * 4, 15, 3); }
  x.globalCompositeOperation = 'destination-over'; rect(x, '#cfc4b0', 0, 0, 64, 64); x.globalCompositeOperation = 'source-over';
});
tile('granite', (x) => { jitter(x, [196, 190, 178], 12, 2); x.fillStyle = 'rgba(80,70,60,.35)'; for (let j = 0; j < 64; j += 16) x.fillRect(0, j, 64, 1); for (let j = 0; j < 64; j += 16) x.fillRect((j / 16 % 2) * 32 + 16, j, 1, 16); });
tile('pinkTile', (x) => { jitter(x, [214, 160, 150], 8, 2); x.fillStyle = 'rgba(120,70,60,.25)'; for (let i = 0; i < 64; i += 8) { x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); } });
tile('whiteRender', (x) => { jitter(x, [236, 234, 226], 6, 4); grime(x, 0.12); });
tile('farWin', (x, m) => {          // distant towers: two floors, three bays per tile
  jitter(x, [170, 168, 160], 10, 4);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) glass(x, m, i * 21 + 3, j * 32 + 10, 15, 16, '#4c5c66', '#73858f');
});
tile('farGlass', (x, m) => { glass(x, m, 0, 0, 64, 64, '#38525e', '#6d8c98'); for (let j = 0; j < 64; j += 16) rect(x, '#24343c', 0, j, 64, 2); });

// ---------------- shopfronts (one tile = the ground floor, 4.5 m, by one 4 m bay)
function shopBase(x) { jitter(x, [150, 146, 140], 8, 4); rect(x, '#2a2a2a', 0, 0, 64, 12); }
tile('shopOpen', (x, m) => {
  shopBase(x); glass(x, m, 3, 14, 58, 48, '#f2e6c4', '#d8c08a');
  const cs = ['#c33', '#36c', '#ec3', '#3a3', '#e8e8e8', '#c6c', '#f80'];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 9; i++) if (RNG() < 0.7) rect(x, rpick(cs), 6 + i * 6, 20 + j * 12, 4, rint(4, 9));
  rect(x, '#444', 3, 58, 58, 6);
});
tile('shopGlass', (x, m) => {
  shopBase(x); glass(x, m, 3, 14, 58, 50, '#c8d8de', '#f4f2e8'); rect(x, '#666', 31, 14, 2, 50);
  for (let i = 0; i < 4; i++) rect(x, rpick(['#d4af37', '#ddd', '#222', '#a33']), 8 + i * 13, rint(36, 44), 6, 6);
});
tile('shopShut', (x) => { shopBase(x); for (let j = 14; j < 64; j += 3) { rect(x, '#a8aaa8', 3, j, 58, 2); rect(x, '#7a7c7a', 3, j + 2, 58, 1); } grime(x, 0.3); });
tile('shopFood', (x, m) => {
  shopBase(x); rect(x, '#8c1c18', 0, 12, 64, 6); glass(x, m, 3, 20, 58, 44, '#f6d8a0', '#e0a050');
  for (let i = 0; i < 4; i++) { rect(x, '#5a2a10', 8 + i * 14, 24, 2, 4); rect(x, '#b5501c', 6 + i * 14, 28, 7, 12); }   // roast geese in the window
});
tile('lobby', (x, m) => { shopBase(x); rect(x, '#bba', 3, 14, 58, 50); glass(x, m, 12, 20, 40, 44, '#6a6658', '#a8a290'); rect(x, '#555', 31, 20, 2, 44); });
tile('shopDark', (x, m) => { shopBase(x); glass(x, m, 3, 14, 58, 50, '#222830', '#3a4450'); });

// ---------------- props and people bits
tile('foliage', (x) => {
  for (let i = 0; i < 160; i++) {
    const a = RNG() * TAU, r = Math.sqrt(RNG()) * 30, cx = 32 + Math.cos(a) * r, cy = 34 + Math.sin(a) * r * 0.9;
    const k = RNG(); x.fillStyle = k < 0.33 ? '#2e5a24' : k < 0.66 ? '#3f7a2e' : '#5d9a3a'; x.fillRect(cx - 2, cy - 2, rint(3, 6), rint(3, 5));
  }
});
tile('palm', (x) => {
  x.strokeStyle = '#3d7a2c'; x.lineWidth = 3;
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; x.beginPath(); x.moveTo(32, 32); x.quadraticCurveTo(32 + Math.cos(a) * 18, 32 + Math.sin(a) * 18 - 8, 32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30); x.stroke(); }
});
tile('bark', (x) => { jitter(x, [92, 74, 58], 20, 2); x.fillStyle = 'rgba(30,20,10,.4)'; for (let i = 0; i < 64; i += 7) x.fillRect(i, 0, 2, 64); });
tile('rail', (x) => {                   // pedestrian guard rail: cut out between the bars
  rect(x, '#a9adae', 0, 0, 64, 6); rect(x, '#a9adae', 0, 58, 64, 6); for (let i = 2; i < 64; i += 8) rect(x, '#a9adae', i, 0, 3, 64);
});
tile('railGreen', (x) => { rect(x, '#2f5d46', 0, 0, 64, 6); rect(x, '#2f5d46', 0, 30, 64, 3); for (let i = 2; i < 64; i += 16) rect(x, '#2f5d46', i, 0, 3, 64); });
tile('metal', (x) => { jitter(x, [120, 124, 126], 10, 2); });
tile('metalDark', (x) => { jitter(x, [52, 56, 60], 8, 2); });
tile('lamp', (x) => { rect(x, '#fff8e0', 0, 0, 64, 64); });
tile('glow', (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.25, '#aaa'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
tile('beam', (x) => { const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, '#000'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
tile('clock', (x) => {
  rect(x, '#bcae90', 0, 0, 64, 64); x.fillStyle = '#f4f0e0'; x.beginPath(); x.arc(32, 32, 28, 0, TAU); x.fill();
  x.strokeStyle = '#222'; x.lineWidth = 2; x.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; rect(x, '#222', 32 + Math.cos(a) * 23 - 1, 32 + Math.sin(a) * 23 - 1, 3, 3); }
  x.lineWidth = 3; x.beginPath(); x.moveTo(32, 32); x.lineTo(32, 14); x.moveTo(32, 32); x.lineTo(44, 36); x.stroke();
});
tile('ferryHull', (x) => { rect(x, '#2d6a3e', 0, 0, 64, 44); rect(x, '#e8e8e2', 0, 44, 64, 20); rect(x, '#1e4a2a', 0, 40, 64, 4); });
tile('ferryCabin', (x, m) => { rect(x, '#ecece4', 0, 0, 64, 64); glass(x, m, 6, 14, 22, 24, '#34505a', '#6a8a96'); glass(x, m, 36, 14, 22, 24, '#34505a', '#6a8a96'); rect(x, '#2d6a3e', 0, 54, 64, 10); });
tile('ferryDeck', (x) => { for (let i = 0; i < 64; i += 6) { const k = RNG() * 16; rect(x, rgb(150 + k, 116 + k, 80 + k), 0, i, 64, 5); rect(x, '#5a4430', 0, i + 5, 64, 1); } });
tile('bench', (x) => { for (let i = 0; i < 64; i += 16) { rect(x, '#8a5a34', 0, i, 64, 12); rect(x, '#5a3a20', 0, i + 12, 64, 4); } });
tile('busSide', (x, m) => { rect(x, '#e2a530', 0, 0, 64, 64); glass(x, m, 2, 6, 60, 20, '#2a3a44', '#5a7280'); glass(x, m, 2, 36, 60, 18, '#2a3a44', '#5a7280'); rect(x, '#c33', 0, 58, 64, 6); });
tile('carWin', (x, m) => { glass(x, m, 0, 0, 64, 64, '#28343c', '#62788a'); });
tile('tiles', (x) => { jitter(x, [210, 210, 204], 6, 2); x.fillStyle = 'rgba(90,90,90,.35)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); } });
tile('tilesGreen', (x) => { jitter(x, [140, 176, 150], 8, 2); x.fillStyle = 'rgba(60,90,70,.35)'; for (let i = 0; i < 64; i += 8) { x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); } });
tile('terrazzo', (x) => { jitter(x, [190, 182, 170], 8, 2); speckle(x, 300, ['#8a7e70', '#e0d6c8', '#6a6258', '#b0a090']); });
tile('door', (x, m) => { rect(x, '#7a5a3a', 0, 0, 64, 64); rect(x, '#5a3e24', 6, 6, 52, 52); rect(x, '#d4af37', 48, 32, 5, 5); });
tile('doorMetal', (x) => { jitter(x, [140, 144, 150], 6, 2); rect(x, '#555', 31, 0, 2, 64); rect(x, '#999', 0, 0, 64, 3); });
tile('mailbox', (x) => { rect(x, '#888', 0, 0, 64, 64); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { rect(x, '#b9bcbe', i * 16 + 1, j * 16 + 1, 14, 14); rect(x, '#333', i * 16 + 4, j * 16 + 4, 8, 2); } });
tile('bed', (x) => { rect(x, '#e8e4dc', 0, 0, 64, 64); for (let i = 0; i < 64; i += 8) rect(x, 'rgba(100,140,200,.25)', i, 0, 4, 64); });
tile('stone', (x) => { jitter(x, [140, 136, 128], 22, 2); });
tile('dome', (x) => { jitter(x, [236, 234, 228], 5, 4); x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 64; i += 8) x.fillRect(0, i, 64, 1); });
tile('flamingo', (x) => { rect(x, '#e88a8a', 20, 10, 24, 18); rect(x, '#e88a8a', 40, 0, 4, 14); rect(x, '#333', 26, 28, 2, 36); rect(x, '#333', 36, 28, 2, 36); });
tile('handprint', (x) => { jitter(x, [176, 168, 150], 8, 2); x.fillStyle = '#8a8070'; x.fillRect(22, 26, 20, 22); for (let i = 0; i < 4; i++) x.fillRect(22 + i * 5, 12, 3, 14); x.fillRect(42, 30, 8, 3); });

// build the atlas: colour layer + glass mask per tile, then two mips
let ATLAS = null;
function buildAtlas() {
  const S = TILE * ATLAS_N;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  const tc = document.createElement('canvas'); tc.width = tc.height = TILE;
  const mc = document.createElement('canvas'); mc.width = mc.height = TILE;
  const tx = tc.getContext('2d'), mx = mc.getContext('2d');
  const img = x.createImageData(S, S);
  TILE_FNS.forEach((fn, i) => {
    rseed('tile' + i);
    tx.clearRect(0, 0, TILE, TILE); mx.clearRect(0, 0, TILE, TILE);
    fn(tx, mx);
    const d = tx.getImageData(0, 0, TILE, TILE).data, md = mx.getImageData(0, 0, TILE, TILE).data;
    const ox = (i % ATLAS_N) * TILE, oy = Math.floor(i / ATLAS_N) * TILE;
    for (let y = 0; y < TILE; y++) for (let k = 0; k < TILE; k++) {
      const s = (y * TILE + k) * 4, o = ((oy + TILE - 1 - y) * S + ox + k) * 4;        // flip: v grows upward
      img.data[o] = d[s]; img.data[o + 1] = d[s + 1]; img.data[o + 2] = d[s + 2];
      img.data[o + 3] = d[s + 3] < 128 ? 0 : md[s + 3] > 128 ? 160 : 255;
    }
  });
  const mk = (data, size) => { const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false; t.needsUpdate = true; return t; };
  const half = (src, size) => {   // average colour, majority alpha class
    const n = size / 2, out = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let k = 0; k < n; k++) {
      let r = 0, g = 0, b = 0, cnt = 0; const cls = [0, 0, 0];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const s = ((y * 2 + dy) * size + k * 2 + dx) * 4, a = src[s + 3];
        cls[a === 0 ? 0 : a === 160 ? 1 : 2]++;
        if (a) { r += src[s]; g += src[s + 1]; b += src[s + 2]; cnt++; }
      }
      const o = (y * n + k) * 4; cnt = cnt || 1;
      out[o] = r / cnt; out[o + 1] = g / cnt; out[o + 2] = b / cnt;
      out[o + 3] = cls[0] >= 3 ? 0 : cls[1] >= cls[2] ? 160 : 255;
    }
    return out;
  };
  const a0 = new Uint8Array(img.data.buffer), a1 = half(a0, S), a2 = half(a1, S / 2);
  UNI.uA0.value = mk(a0, S); UNI.uA1.value = mk(a1, S / 2); UNI.uA2.value = mk(a2, S / 4);
  ATLAS = c;
}

// ---------------------------------------------------------------- signs
// Shop signs carry the real names from the map listings (no logos, just lettering on a board in a colour for the
// kind of shop). Each name is drawn into the sign atlas the first time a sign needs it: horizontal boards are
// 128x32, hanging signs 32x128 (Chinese reads top-down), and a few landmark signs 256x64.
const SIGN_FONT = '"NR Sign", "Noto Sans TC", "Noto Sans CJK TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", "WenQuanYi Zen Hei", sans-serif';
const SIGN_CATS = ['shop', 'food', 'cafe', 'bar', 'hotel', 'bank', 'pharmacy', 'jewel', 'fashion', 'tech', 'beauty', 'conv', 'travel', 'other'];
const CAT_BG = {
  shop: [['#f5f0e0', '#1a3a8a'], ['#0a3a8a', '#fff']], food: [['#b3141b', '#fff6c8'], ['#f0c020', '#8a0a0a']], cafe: [['#5a3a22', '#f8e8c8'], ['#106a36', '#fff8d0']],
  bar: [['#141018', '#ff4f9a'], ['#141018', '#3af0ff']], hotel: [['#f4f0e6', '#2a2a2a'], ['#1a2a4a', '#e8d090']], bank: [['#f5f0e0', '#b3141b'], ['#0a5a3a', '#fff']],
  pharmacy: [['#0a7a5a', '#fff'], ['#fff', '#0a7a5a']], jewel: [['#141414', '#e8c060'], ['#8a0a14', '#f0d070']], fashion: [['#f2f2f2', '#111'], ['#111', '#f2f2f2']],
  tech: [['#0a3a8a', '#fff'], ['#e8e8e8', '#0a3a8a']], beauty: [['#f8e0ea', '#8a1a4a'], ['#fff', '#c8306a']], conv: [['#e0601a', '#fff'], ['#1a8a3a', '#fff']],
  travel: [['#fff', '#0a3a8a'], ['#2a6aaa', '#fff']], other: [['#e8e8e8', '#111'], ['#5a1a6a', '#ffd0f0']], building: [['#d8d4c8', '#2a2a2a'], ['#2a2a2a', '#e8e0c8']],
};
const NEON = ['#ff3a6a', '#3af0ff', '#ffde3a', '#7aff5a', '#ff7a1a', '#c86aff', '#ff4a3a'];
const SA = { w: 2048, h: 2048 };
let SIGNS = null;
function buildSigns() {
  const c = document.createElement('canvas'); c.width = SA.w; c.height = SA.h;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  SIGNS = { canvas: c, x, tex: t, h: new Map(), v: new Map(), special: {}, nh: 0, nv: 0, ns: 0 };
  const SPECIAL = [
    ['milton', '美敦大廈', 'MILTON MANSION', '#f4efe0', '#9a1a1a'],
    ['chungking', '重慶大廈', 'CHUNGKING MANSIONS', '#1a1a1a', '#f0d040'],
    ['mirador', '美麗都大廈', 'MIRADOR MANSION', '#f4efe0', '#1a3a8a'],
    ['ferry', '天星小輪', 'STAR FERRY', '#ece8dc', '#1e5a32'],
    ['tarts', '蛋撻', 'EGG TARTS', '#f0c020', '#8a0a0a'],
    ['tea', '港式奶茶', 'MILK TEA', '#106a36', '#fff8d0'],
    ['news', '報攤', 'NEWS', '#0a3a8a', '#fff'],
    ['park', '九龍公園', 'KOWLOON PARK', '#2d5a3a', '#fff'],
    ['museum', '香港太空館', 'HONG KONG SPACE MUSEUM', '#e8e8e8', '#222'],
    ['directory', '美敦大廈 住戶名錄', 'DIRECTORY', '#1a1a1a', '#e8e0c8'],
    ['curry', '咖喱', 'CURRY', '#e8a020', '#5a1a0a'],
  ];
  for (const [id, zh, en, bg, fg] of SPECIAL) {
    const i = SIGNS.ns++, px = (i % 8) * 256, py = 1856 + Math.floor(i / 8) * 64;
    x.fillStyle = bg; x.fillRect(px, py, 256, 64); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    fitFont(x, zh, 240, 34); x.fillText(zh, px + 128, py + 24); fitFont(x, en, 240, 14, 700); x.fillText(en, px + 128, py + 52);
    SIGNS.special[id] = signUv(px, py, 256, 64);
  }
}
const signUv = (px, py, w, h) => [px / SA.w, 1 - (py + h) / SA.h, (px + w) / SA.w, 1 - py / SA.h];
function fitFont(x, t, maxW, size, weight = 900) { let s = size; do { x.font = `${weight} ${s}px ${SIGN_FONT}`; s--; } while (x.measureText(t).width > maxW && s > 6); }
const nameParts = (s) => { const [zh, en] = String(s || '').split('|'); return [zh || '', en || '']; };
function signColours(key, cat) { const p = CAT_BG[cat] || CAT_BG.shop; return p[strSeed(key) % p.length]; }
// a horizontal board for "zh|en": two lines if it has both
function signH(name, cat = 'shop') {
  const key = cat + ':' + name;
  if (SIGNS.h.has(key)) return SIGNS.h.get(key);
  const i = SIGNS.nh++; if (i >= 16 * 46) return SIGNS.h.values().next().value;
  const px = (i % 16) * 128, py = Math.floor(i / 16) * 32, x = SIGNS.x, [zh, en] = nameParts(name), [bg, fg] = signColours(key, cat);
  x.fillStyle = bg; x.fillRect(px, py, 128, 32); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (zh && en) { fitFont(x, zh, 120, 19); x.fillText(zh, px + 64, py + 12); fitFont(x, en.toUpperCase(), 120, 9, 700); x.fillText(en.toUpperCase(), px + 64, py + 26); }
  else { const tx = zh || en; fitFont(x, tx, 120, zh ? 22 : 16, zh ? 900 : 800); x.fillText(tx, px + 64, py + 17); }
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.strokeRect(px + 0.5, py + 0.5, 127, 31);
  const r = { uv: signUv(px, py, 128, 32), neon: NEON[strSeed(name) % NEON.length] };
  SIGNS.h.set(key, r); return r;
}
// a hanging sign: Chinese top to bottom, or English turned on its side
function signV(name, cat = 'shop') {
  const key = cat + ':' + name;
  if (SIGNS.v.has(key)) return SIGNS.v.get(key);
  const i = SIGNS.nv++; if (i >= 64 * 3) return SIGNS.v.values().next().value;
  const px = (i % 64) * 32, py = 1472 + Math.floor(i / 64) * 128, x = SIGNS.x, [zh, en] = nameParts(name);
  const neon = (strSeed(name) % 3) !== 0, col = NEON[strSeed(name) % NEON.length], [bg, fg] = signColours(key, cat);
  x.fillStyle = neon ? '#141018' : bg; x.fillRect(px, py, 32, 128);
  x.strokeStyle = neon ? col : fg; x.lineWidth = 2; x.strokeRect(px + 2, py + 2, 28, 124);
  x.fillStyle = neon ? col : fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (zh) {
    const chars = [...zh].slice(0, 6), step = 120 / chars.length;
    x.font = `900 ${Math.min(24, step - 2) | 0}px ${SIGN_FONT}`;
    chars.forEach((ch, k) => x.fillText(ch, px + 16, py + 6 + step * (k + 0.5)));
  } else {
    x.save(); x.translate(px + 16, py + 64); x.rotate(Math.PI / 2); fitFont(x, en.toUpperCase(), 116, 18, 800); x.fillText(en.toUpperCase(), 0, 1); x.restore();
  }
  const r = { uv: signUv(px, py, 32, 128), neon: neon ? col : null };
  SIGNS.v.set(key, r); return r;
}
// load the embedded sign font (a subset of Noto Sans TC Black) before drawing signs; fall back to system fonts
async function loadSignFont() {
  if (typeof SIGN_FONT_B64 === 'undefined' || !SIGN_FONT_B64) return false;
  try {
    const bin = atob(SIGN_FONT_B64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const f = new FontFace('NR Sign', u8.buffer, { weight: '100 900' });
    await f.load(); document.fonts.add(f); return true;
  } catch (e) { return false; }
}
