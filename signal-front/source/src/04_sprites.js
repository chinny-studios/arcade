// Signal Front — pixel art: unit sprites, property sprites, terrain tiles, commander portraits
// Sprites are authored as 16-wide character grids facing right and get an automatic dark outline.
// a b c d = team colour ramp (light to dark). R/Q = rotor or glow pixels shown on alternate frames.
// e/E = track links that swap shade on alternate frames so treads appear to roll.

const PAL = {
  w: '#f4f2ea', g: '#c4c8cf', G: '#8b919b', h: '#565c67', H: '#343840', x: '#18222e',
  y: '#6ff3ff', Y: '#ffd23a', r: '#ff5040', o: '#ff9a30', s: '#ecb58c', S: '#b37a56', n: '#5d6236', N: '#3b3f22',
  e: '#26292f', E: '#50555e', R: '#dfe4ea', Q: '#dfe4ea', P: '#6ff3ff', p: '#6ff3ff', k: '#0c0d12',
};
const OUTLINE = '#0c0d12';

const UNIT_ART = {
  crawler: [
    '................',
    '................',
    '................',
    '................',
    '.....g..........',
    '.....h..........',
    '.....h..........',
    '....aaaaaaa.....',
    '...abbbbbbbaaa..',
    '...bbbbbbbbbbyy.',
    '...ccccccccbbbh.',
    '....hG.....hG...',
    '...hG.G...hG.G..',
    '...h..G...h..G..',
    '..HH..GG.HH..GG.',
    '................',
  ],
  strider: [
    '................',
    '................',
    '................',
    '................',
    '.......GGGGGGw..',
    '......hGgggggw..',
    '......hGGGGGG...',
    '.......hhh......',
    '....aaaaaaaaa...',
    '...abbbbbbbbbby.',
    '...bbbbbbbbbbbb.',
    '...cccccccccccc.',
    '..eEeEeEeEeEeEe.',
    '..HeEeEeEeEeEeH.',
    '...HHHHHHHHHHH..',
    '................',
  ],
  wraith: [
    '................',
    '..RRRRRRQQQQQQ..',
    '.......hh.......',
    '.......hh.......',
    '......aaaa......',
    '.....abbbbaa....',
    'Q.hhhabbbbbbby..',
    'R...hbbbbbbbyy..',
    '.....cbbbbbbb...',
    '......ccccc.....',
    '.......h.h......',
    '......hhhhhh....',
    '................',
    '................',
    '................',
    '................',
  ],
  watchpost: [
    '................',
    '.....ggggg......',
    '.....gyPyg......',
    '.....ggggg......',
    '.......h........',
    '.......h........',
    '......hhh.......',
    '......h.h.......',
    '...aaaaaaaaa....',
    '...bbbbbbbbbaa..',
    '...bbbbbbbbbbxa.',
    '...cccccccccccc.',
    '...cdddcccccddd.',
    '....HgH....HgH..',
    '.....H......H...',
    '................',
  ],
  nexus: [
    '................',
    '................',
    '................',
    '....G...........',
    '...GgG..h.......',
    '....h...h.......',
    '...aaaaaaaaaa...',
    '..abbbbbbbbbbba.',
    '..bbyybbbbbbbxx.',
    '..bbbbbbbbbbbbb.',
    '..ccccccccccccc.',
    '.eEeEeEeEeEeEeE.',
    '.HeEeEeEeEeEeEH.',
    '..HHHHHHHHHHHH..',
    '................',
    '................',
  ],
  static: [
    '................',
    '..P.......p.....',
    '.P..ggggg..p....',
    '...gGhGhGg......',
    '...gGhGhGg......',
    '....ggggg.......',
    '......h.........',
    '...aaaaaaaaaa...',
    '...bbbbbbbbbbaa.',
    '...bbbbbbbbbbbxa',
    '...cccccccccccc.',
    '...cdddcccccddd.',
    '....HgH....HgH..',
    '.....H......H...',
    '................',
    '................',
  ],
  spark: [
    '................',
    '................',
    '....GGGGGGG.....',
    '....GxGxGxG.....',
    '....GGGGGGG.....',
    '....GxGxGxG.....',
    '....GGGGGGG.....',
    '.....hh.hh......',
    '...aaaaaaaaaa...',
    '..abbbbbbbbbbbb.',
    '..bbbbbbbbbbbbxa',
    '..ccccccccccccc.',
    '.eEeEeEeEeEeEeE.',
    '.HeEeEeEeEeEeEH.',
    '..HHHHHHHHHHHH..',
    '................',
  ],
  moray: [
    '................',
    '..........ww....',
    '........GGgw....',
    '......GGgGG.....',
    '....GGgGG.......',
    '...GgGh.........',
    '....hhh.........',
    '..aaaaaaaaaaa...',
    '.abbbbbbbbbbbaa.',
    '.bbbbbbbbbbbbbxa',
    '.ccccccccccccccc',
    '.cdddcccdddcddd.',
    '..HgH...HgH.HgH.',
    '...H.....H...H..',
    '................',
    '................',
  ],
  mallet: [
    '................',
    '..RQRQ..........',
    '...hh......g....',
    '...hh.....gyg...',
    '..GGGGGG...g....',
    '..GhGhGG...h....',
    '..GGGGGG...h....',
    '...aaaaaaaaaa...',
    '..abbbbbbbbbbbb.',
    '..bbbbbbbbbbbbxa',
    '..ccccccccccccc.',
    '.eEeEeEeEeEeEeE.',
    '.HeEeEeEeEeEeEH.',
    '..HHHHHHHHHHHH..',
    '................',
    '................',
  ],
  streak: [
    '................',
    '................',
    '................',
    '..aa............',
    '..abb...........',
    '..abbb..........',
    '.ohbbbbbbbbbaa..',
    'oohbbbbbbbbbbbbw',
    '.ohccccccccccbb.',
    '..hcc...........',
    '..cc............',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  razorwing: [
    '................',
    '................',
    '................',
    '...aa...........',
    '...abb..........',
    '...abbb.........',
    '.o.hbbbbbbbbb...',
    'oohhbbbbbbbbbbbw',
    '.o.hccbbbbbbbbb.',
    '...ccccccccc....',
    '...ccc..........',
    '...cc...........',
    '................',
    '................',
    '................',
    '................',
  ],
  deepfin: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..........h.....',
    '.........hhh....',
    '...aaaaaaaaaaa..',
    '..abbbbbbbbbbbby',
    '.hcccccccccccccc',
    'hh.cccccccccccc.',
    '................',
    '................',
    '................',
    '................',
  ],

  rifle: [
    '................',
    '................',
    '................',
    '......ccc.......',
    '.....cbbbc......',
    '.....csSS.......',
    '......ss........',
    '.....bbbb.......',
    '....bbbbbGGGGGG.',
    '....bbsbb.......',
    '....bbbb........',
    '.....cccc.......',
    '.....cc.cc......',
    '.....cc..cc.....',
    '....hhh..hhh....',
    '................',
  ],
  atgm: [
    '................',
    '................',
    '................',
    '..GGGGGGGGGGGh..',
    '..hhhcccGhhh....',
    '.....cbbbc......',
    '.....csSS.......',
    '......ss........',
    '....bbbbb.......',
    '...bbbbbbb......',
    '...bbsbbb.......',
    '....bbbb........',
    '....ccccc.......',
    '...ccc.cc.......',
    '...cc...cc......',
    '..hhh...hhh.....',
  ],
  buggy: [
    '................',
    '................',
    '................',
    '................',
    '......hGGGGG....',
    '......h.........',
    '.....hhh.....x..',
    '...aaaaaaaaaax..',
    '..abbbbbbbbbbba.',
    '..bbbbbbbbbbbbbb',
    '..cccccccccccccc',
    '...HHH.....HHH..',
    '..HgggH...HgggH.',
    '...HHH.....HHH..',
    '................',
    '................',
  ],
  truck: [
    '................',
    '................',
    '................',
    '................',
    '..aaaaaaaaa.....',
    '..abbbbbbbbaa...',
    '..bbbbbbbbbbxa..',
    '..bbbbbbbbbbbba.',
    '..ccccccccccccc.',
    '.eEeEeEeEeEeEeE.',
    '.HeEeEeEeEeEeEH.',
    '..HHHHHHHHHHHH..',
    '................',
    '................',
    '................',
    '................',
  ],
  tank: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....aaaaa......',
    '....abbbbbbGGGGG',
    '....bbbbbbb.....',
    '..aaaaaaaaaaaa..',
    '.abbbbbbbbbbbbb.',
    '.ccccccccccccccc',
    '.eEeEeEeEeEeEeE.',
    '.HeEeEeEeEeEeEH.',
    '..HHHHHHHHHHHH..',
    '................',
    '................',
  ],
  heavy: [
    '................',
    '................',
    '................',
    '................',
    '....aaaaaaa.....',
    '...abbbbbbbbGGGG',
    '...bbbbbbbbbGGGG',
    '...cbbbbbbbc....',
    '.aaaaaaaaaaaaaa.',
    'abbbbbbbbbbbbbbb',
    'bccccccccccccccc',
    'eEeEeEeEeEeEeEeE',
    'HeEeEeEeEeEeEeEH',
    '.HHHHHHHHHHHHHH.',
    '................',
    '................',
  ],
  howitzer: [
    '................',
    '................',
    '..............G.',
    '............GG..',
    '..........GG....',
    '........GG......',
    '.....aaaGaa.....',
    '....abbbbbbb....',
    '..aaaaaaaaaaa...',
    '.abbbbbbbbbbbb..',
    '.cccccccccccccc.',
    '.eEeEeEeEeEeEeE.',
    '.HeEeEeEeEeEeEH.',
    '..HHHHHHHHHHHH..',
    '................',
    '................',
  ],
  mlrs: [
    '................',
    '................',
    '................',
    '........GGGGGG..',
    '......GGhGhGhG..',
    '.....GhGhGhGG...',
    '.....GGGGGG.....',
    '......hh.....x..',
    '..aaaaaaaaaaax..',
    '.abbbbbbbbbbbba.',
    '.bbbbbbbbbbbbbbb',
    '.ccccccccccccccc',
    '..HgH...HgH.HgH.',
    '...H.....H...H..',
    '................',
    '................',
  ],
  spaa: [
    '................',
    '................',
    '....G...........',
    '...GgG...GGGGG..',
    '....h...GGGGG...',
    '....h..GG.......',
    '...aaaaaa.......',
    '...bbbbbbbb.....',
    '..aaaaaaaaaaaa..',
    '.abbbbbbbbbbbbb.',
    '.ccccccccccccccc',
    '.eEeEeEeEeEeEeE.',
    '.HeEeEeEeEeEeEH.',
    '..HHHHHHHHHHHH..',
    '................',
    '................',
  ],
  fpv: [
    '................',
    '.RQRQ...........',
    '..hbbh..........',
    '..hcch..........',
    '.h....h..RQRQ...',
    '..........hbbh..',
    '..........hcch..',
    '.........h....h.',
    '....RQRQ........',
    '.....hbbh.......',
    '.....hcch.......',
    '....h....h......',
    '................',
    '................',
    '................',
    '................',
  ],
  kite: [
    '................',
    '................',
    '................',
    '....a...........',
    '....ab..........',
    '....abb.........',
    'P.hhbbbbbbbbbbw.',
    'p..hccccccccbw..',
    '....cc..........',
    '....c...........',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  gunship: [
    '................',
    'RRRRRRRRQQQQQQQ.',
    '.......hh.......',
    '.......hh.......',
    '......aaaaa.....',
    'Q....abbbbbbx...',
    'Rhhhhabbbbbbxx..',
    'R...hbbbbbbbbbb.',
    '.....ccccccccc..',
    '......GG..GG.G..',
    '.....hhhhhhhhh..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  corvette: [
    '................',
    '................',
    '................',
    '.......h........',
    '......hhh.......',
    '......GgG.......',
    '.....GGGGG......',
    '....gggggggGGG..',
    '..h.ggxgxggg....',
    '.aaaaaaaaaaaaaaa',
    '.bbbbbbbbbbbbbb.',
    '..cccccccccccc..',
    '................',
    '................',
    '................',
    '................',
  ],
};

// Properties are 16 x 20: the top 4 rows rise into the tile above.
const PROP_ART = {
  city: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......aaa......',
    '......abbba.....',
    '..aaaaabbbbb....',
    '..abbbbbYbYb....',
    '..bbYbYbbbbb.aa.',
    '..bbbbbbYbYbabba',
    '..bbYbYbbbbbbYbb',
    '..bbbbbbbbbbbbbb',
    '..bbYbYbYbYbbYbb',
    '..cccccccccccccc',
    '..ccHHcccHHcccHc',
    '..cccccccccccccc',
    '................',
    '................',
    '................',
  ],
  base: [
    '................',
    '................',
    '................',
    '..hh............',
    '..hh............',
    '..gg............',
    '..bb............',
    '..bbaaaaaaaaaa..',
    '..babbbbbbbbbbb.',
    '..bbbbbbbbbbbbb.',
    '..bbbbbbbbbbbbb.',
    '..bcchhhhhhhccb.',
    '..bchGhGhGhGhcb.',
    '..bchhhhhhhhhcb.',
    '..bchGhGhGhGhcb.',
    '..cccccccccccccc',
    '..cccccccccccccc',
    '................',
    '................',
    '................',
  ],
  airport: [
    '................',
    '................',
    '................',
    '...g............',
    '..yyy...........',
    '..ggg...........',
    '...h............',
    '...h............',
    '..aaa...........',
    '..bbb.aaaaaaaa..',
    '..bbbabbbbbbbba.',
    '..bbbbbbbbbbbbbb',
    '..bbbbhhhhhhhhbb',
    '..bbbbhGGGGGGhbb',
    '..ccccHhhhhhhHcc',
    '..ccccHhhhhhhHcc',
    '..cccccccccccccc',
    '................',
    '................',
    '................',
  ],
  port: [
    '................',
    '................',
    '....hhhhhhhhh...',
    '....h......hh...',
    '....h.......Y...',
    '....h.......h...',
    '....h...........',
    '....h...........',
    '...hhh..........',
    '..aaaaaaaaaa....',
    '..abbbbbbbbbba..',
    '..bbbbbbbbbbbbb.',
    '..bbbbcccccbbbb.',
    '..bbbbcHHHcbbbb.',
    '..ccccHHHHHcccc.',
    '..ccccHHHHHcccc.',
    '..cccccccccccccc',
    '................',
    '................',
    '................',
  ],
  hq: [
    '........h.......',
    '........hbbb....',
    '........hbbbb...',
    '........h.......',
    '......ggggg.....',
    '.....gyyyyyg....',
    '......ggggg.....',
    '..aaaaaaaaaaaaa.',
    '.abbbbbbbbbbbbba',
    '.bbYbYbbbbbYbYbb',
    '.bbbbbbaaabbbbbb',
    '.bbYbYbabbbbYbYb',
    '.bbbbbbabbbbbbbb',
    '.cccccccccccccc.',
    '.ccHHcccHHHccHHc',
    '.ccHHcccHHHccHHc',
    '.ccccccccccccccc',
    '................',
    '................',
    '................',
  ],
  tower: [
    '.......g........',
    '......gyg.......',
    '.......h........',
    '......hGh.......',
    '......h.h..gg...',
    '.....hGhGh.ggg..',
    '.....h...h.hgg..',
    '.....hGhGhh.....',
    '....h.....h.....',
    '....hGhGhGh.....',
    '....h.....h.....',
    '...hGhGhGhGh....',
    '...h.......h....',
    '..aaaaaaaaaaa...',
    '..bbbbbbbbbbbb..',
    '..cccccccccccc..',
    '................',
    '................',
    '................',
    '................',
  ],
};

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
}

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Rasterise a char grid with a team ramp into a canvas (with automatic 1px outline).
function rasterize(grid, ramp, frame, opts = {}) {
  const H = grid.length, W = 16;
  const c = mkCanvas(W, H), x = c.getContext('2d');
  const img = x.createImageData(W, H);
  const solid = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    const row = grid[j];
    for (let i = 0; i < W; i++) {
      let ch = row[i] || '.';
      if (ch === '.') continue;
      if ((ch === 'R' || ch === 'P') && frame === 1) continue;
      if ((ch === 'Q' || ch === 'p') && frame === 0) continue;
      if (frame === 1 && ch === 'e') ch = 'E'; else if (frame === 1 && ch === 'E') ch = 'e';
      let col = 'abcd'.includes(ch) ? ramp['abcd'.indexOf(ch)] : PAL[ch];
      if (!col) continue;
      if (opts.grey) { const [r, g, b] = hexToRgb(col); const l = (r * 0.3 + g * 0.55 + b * 0.15) * 0.62; col = '#' + [l, l, l].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); }
      const [r, g, b] = hexToRgb(col);
      const o = (j * W + i) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
      solid[j * W + i] = (ch === 'R' || ch === 'Q') ? 2 : 1;
    }
  }
  if (!opts.noOutline) {
    const [r, g, b] = hexToRgb(OUTLINE);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (solid[j * W + i]) continue;
      let near = false;
      for (const [dx, dy] of DIRS) { const a = i + dx, bb = j + dy; if (a >= 0 && a < W && bb >= 0 && bb < H && solid[bb * W + a] === 1) near = true; }
      if (near) { const o = (j * W + i) * 4; img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255; }
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

function flipCanvas(src) {
  const c = mkCanvas(src.width, src.height), x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  return c;
}

const SPR = { unit: {}, prop: {}, tile: {}, portrait: {} };
// unit sprite: SPR.unit[type][side][frame] ; greyed variant at [frame + 2]
function unitSprite(t, side, frame, grey) {
  const key = t + side;
  if (!SPR.unit[key]) {
    const ramp = FACTIONS[side].ramp, arr = [];
    for (let f = 0; f < 2; f++) arr[f] = rasterize(UNIT_ART[t], ramp, f);
    for (let f = 0; f < 2; f++) arr[f + 2] = rasterize(UNIT_ART[t], ramp, f, { grey: true });
    if (side === 1) for (let i = 0; i < 4; i++) arr[i] = flipCanvas(arr[i]);
    SPR.unit[key] = arr;
  }
  return SPR.unit[key][frame + (grey ? 2 : 0)];
}
function propSprite(k, owner) {
  const key = k + owner;
  if (!SPR.prop[key]) SPR.prop[key] = rasterize(PROP_ART[k], owner < 0 ? NEUTRAL_RAMP : FACTIONS[owner].ramp, 0);
  return SPR.prop[key];
}

// ---------------- terrain tiles (procedural pixel art) ----------------
const TC = {
  grass: '#7cc858', grass2: '#68b048', grass3: '#94d86c', dirt: '#c8b078',
  tree: '#2f7a3a', tree2: '#235e2c', tree3: '#4a9a48', trunk: '#5a3e22',
  rock: '#a89070', rock2: '#7c6650', rock3: '#d6c4a2', snow: '#f2f2ec',
  road: '#b9b2a2', road2: '#9a9384', roadEdge: '#827b6c',
  water: '#3a7ce0', water2: '#5a9cf0', water3: '#2a5cb8', foam: '#d8ecff',
  sand: '#ecd898', sand2: '#d4bc78', river: '#4a90e8', bridge: '#a87c4c', bridge2: '#7a5630',
};

function tileCanvas() { const c = mkCanvas(T, T); return [c, c.getContext('2d')]; }
function px(x, X, Y, col, w = 1, h = 1) { x.fillStyle = col; x.fillRect(X, Y, w, h); }

function drawGrass(x, gx, gy) {
  px(x, 0, 0, TC.grass, T, T);
  for (let i = 0; i < 7; i++) {
    const a = hash2(gx, gy, i * 3), b = hash2(gx, gy, i * 3 + 1), c = hash2(gx, gy, i * 3 + 2);
    const X = Math.floor(a * 15), Y = Math.floor(b * 15);
    if (c < 0.5) { px(x, X, Y, TC.grass2); px(x, X + 1, Y - 1, TC.grass2); }
    else if (c < 0.8) px(x, X, Y, TC.grass3);
    else px(x, X, Y, TC.grass2, 2, 1);
  }
}

function drawWater(x, gx, gy, frame) {
  px(x, 0, 0, TC.water, T, T);
  for (let i = 0; i < 4; i++) {
    const a = hash2(gx, gy, 40 + i), b = hash2(gx, gy, 50 + i);
    const X = (Math.floor(a * 14) + frame * 2 + i) % 14, Y = Math.floor(b * 14);
    px(x, X, Y, TC.water2, 3, 1);
    px(x, X + 1, Y + 1, TC.water3, 2, 1);
  }
}

function drawShore(x, mask, frame) {
  // mask bits: 1 E, 2 W, 4 S, 8 N are land neighbours
  const f = frame % 2;
  if (mask & 8) { px(x, 0, 0, TC.sand, T, 2); px(x, 0, 2, TC.foam, T, 1); if (f) px(x, 3, 3, TC.foam, 4, 1); }
  if (mask & 4) { px(x, 0, 14, TC.sand, T, 2); px(x, 0, 13, TC.foam, T, 1); if (f) px(x, 9, 12, TC.foam, 4, 1); }
  if (mask & 2) { px(x, 0, 0, TC.sand, 2, T); px(x, 2, 0, TC.foam, 1, T); if (f) px(x, 3, 9, TC.foam, 1, 3); }
  if (mask & 1) { px(x, 14, 0, TC.sand, 2, T); px(x, 13, 0, TC.foam, 1, T); if (f) px(x, 12, 4, TC.foam, 1, 3); }
}

function drawTree(x, X, Y) {
  px(x, X + 2, Y + 6, TC.trunk, 1, 2);
  px(x, X + 1, Y + 1, TC.tree2, 4, 5);
  px(x, X, Y + 2, TC.tree2, 6, 3);
  px(x, X + 1, Y + 1, TC.tree, 3, 4);
  px(x, X + 2, Y, TC.tree, 2, 1);
  px(x, X + 1, Y + 2, TC.tree3, 2, 1);
  px(x, X + 2, Y + 1, TC.tree3, 1, 1);
}

function drawRoad(x, mask, kind) {
  // mask bits 1 E 2 W 4 S 8 N connect
  const c = kind === 'bridge' ? TC.bridge : TC.road, e = kind === 'bridge' ? TC.bridge2 : TC.roadEdge;
  const horiz = (mask & 3) || !(mask & 12);
  const vert = mask & 12;
  px(x, 4, 4, c, 8, 8);
  if ((mask & 1) || (horiz && !vert)) px(x, 8, 4, c, 8, 8);
  if ((mask & 2) || (horiz && !vert)) px(x, 0, 4, c, 8, 8);
  if (mask & 4) px(x, 4, 8, c, 8, 8);
  if (mask & 8) px(x, 4, 0, c, 8, 8);
  if (kind === 'bridge') {
    for (let i = 0; i < T; i += 3) {
      if (vert && !(mask & 3)) px(x, 4, i, e, 8, 1); else px(x, i, 4, e, 1, 8);
    }
    if (vert && !(mask & 3)) { px(x, 3, 0, e, 1, T); px(x, 12, 0, e, 1, T); }
    else { px(x, 0, 3, e, T, 1); px(x, 0, 12, e, T, 1); }
  } else {
    if (!(mask & 8)) px(x, 4, 4, e, 8, 1);
    if (!(mask & 4)) px(x, 4, 11, e, 8, 1);
    if (!(mask & 2) && !(horiz && !vert)) px(x, 4, 4, e, 1, 8);
    if (!(mask & 1) && !(horiz && !vert)) px(x, 11, 4, e, 1, 8);
    if ((mask & 1) || (horiz && !vert)) { px(x, 11, 4, e, 5, 1); px(x, 11, 11, e, 5, 1); }
    if ((mask & 2) || (horiz && !vert)) { px(x, 0, 4, e, 5, 1); px(x, 0, 11, e, 5, 1); }
    if (mask & 4) { px(x, 4, 11, e, 1, 5); px(x, 11, 11, e, 1, 5); }
    if (mask & 8) { px(x, 4, 0, e, 1, 5); px(x, 11, 0, e, 1, 5); }
    px(x, 7, 7, TC.road2, 2, 2);
  }
}

function drawRiver(x, mask, frame) {
  const c = TC.river;
  const horiz = (mask & 3) || !(mask & 12);
  const vert = mask & 12;
  px(x, 4, 4, c, 8, 8);
  if ((mask & 1) || (horiz && !vert)) px(x, 8, 4, c, 8, 8);
  if ((mask & 2) || (horiz && !vert)) px(x, 0, 4, c, 8, 8);
  if (mask & 4) px(x, 4, 8, c, 8, 8);
  if (mask & 8) px(x, 4, 0, c, 8, 8);
  const f = frame % 2;
  if (vert) { px(x, 6, (f * 6 + 2) % 16, TC.water2, 1, 3); px(x, 9, (f * 6 + 9) % 16, TC.water2, 1, 3); }
  else { px(x, (f * 6 + 2) % 16, 6, TC.water2, 3, 1); px(x, (f * 6 + 9) % 16, 9, TC.water2, 3, 1); }
}

// Tile cache: key -> canvas. Tall layers (mountain/forest/property) are separate sprites.
function terrainTile(k, gx, gy, mask, frame) {
  const key = k + ':' + mask + ':' + frame + ':' + ((k === 'plain' || k === 'forest' || k === 'sea') ? (gx * 7 + gy * 13) % 5 : 0);
  let c = SPR.tile[key];
  if (c) return c;
  const [cv, x] = tileCanvas();
  const vx = (gx * 7 + gy * 13) % 5, vy = 3;
  switch (k) {
    case 'sea': case 'reef':
      drawWater(x, vx, vy, frame); drawShore(x, mask, frame);
      if (k === 'reef') { px(x, 3, 5, TC.rock2, 3, 2); px(x, 4, 4, TC.rock, 2, 1); px(x, 9, 9, TC.rock2, 4, 2); px(x, 10, 8, TC.rock, 2, 1); px(x, 6, 12, TC.rock2, 2, 1); }
      break;
    case 'shoal':
      px(x, 0, 0, TC.sand, T, T);
      for (let i = 0; i < 6; i++) px(x, Math.floor(hash2(vx, i, 9) * 15), Math.floor(hash2(i, vx, 11) * 15), TC.sand2);
      if (mask & 1) { px(x, 13, 0, TC.foam, 1, T); px(x, 14, 0, TC.water, 2, T); }
      if (mask & 2) { px(x, 2, 0, TC.foam, 1, T); px(x, 0, 0, TC.water, 2, T); }
      if (mask & 4) { px(x, 0, 13, TC.foam, T, 1); px(x, 0, 14, TC.water, T, 2); }
      if (mask & 8) { px(x, 0, 2, TC.foam, T, 1); px(x, 0, 0, TC.water, T, 2); }
      break;
    case 'river': drawGrass(x, vx, vy); drawRiver(x, mask, frame); break;
    case 'road': drawGrass(x, vx, vy); drawRoad(x, mask, 'road'); break;
    case 'bridge': drawGrass(x, vx, vy); drawRiver(x, mask >> 4, frame); drawRoad(x, mask & 15, 'bridge'); break;
    default: drawGrass(x, vx, vy);
  }
  SPR.tile[key] = cv;
  return cv;
}

// Tall overlays 16 x 20 (forest, mountain)
function tallTile(k, gx, gy) {
  const v = (gx * 5 + gy * 11) % 4;
  const key = 'tall:' + k + v;
  if (SPR.tile[key]) return SPR.tile[key];
  const c = mkCanvas(T, 20), x = c.getContext('2d');
  if (k === 'forest') {
    const spots = [[1, 7], [8, 6], [4, 11], [10, 11], [0, 12], [6, 2]];
    for (let i = 0; i < spots.length; i++) if (i < 5 || v % 2) drawTree(x, spots[i][0] + (v === 3 ? 1 : 0), spots[i][1] + 2);
  } else if (k === 'mount') {
    // stepped peak
    const peak = v % 2 ? 6 : 8;
    for (let row = 0; row < 16; row++) {
      const half = Math.min(8, Math.floor(row * 0.62) + 1);
      const y = 2 + row;
      px(x, peak - half, y, TC.rock2, half * 2, 1);
      px(x, peak - half + 1, y, TC.rock, Math.max(1, half - 1), 1);
    }
    px(x, peak - 1, 2, TC.snow, 2, 2); px(x, peak - 2, 4, TC.snow, 3, 1); px(x, peak - 1, 5, TC.rock3, 1, 2);
    px(x, peak + 2, 8, TC.rock2, 1, 4); px(x, peak - 4, 11, TC.rock3, 2, 1);
    if (v > 1) { // small second peak
      const p2 = peak + 6;
      for (let row = 0; row < 8; row++) { const h = Math.floor(row * 0.6) + 1; px(x, p2 - h, 10 + row, TC.rock2, h * 2, 1); px(x, p2 - h + 1, 10 + row, TC.rock, Math.max(1, h - 1), 1); }
    }
  }
  SPR.tile[key] = c;
  return c;
}

// ---------------- commander portraits (procedural, 32 x 32) ----------------
function portrait(id, mood = 0) {
  const key = id + mood;
  if (SPR.portrait[key]) return SPR.portrait[key];
  const co = COS[id], L = co.look, side = co.side;
  const c = mkCanvas(32, 32), x = c.getContext('2d');
  const ramp = FACTIONS[side].ramp;
  // backdrop
  px(x, 0, 0, ramp[3], 32, 32);
  for (let i = 0; i < 32; i += 4) px(x, 0, i, ramp[2], 32, 1);
  const skin = L.skin, shade = mixHex(L.skin, '#000000', 0.25), hair = L.hair;
  // shoulders / uniform
  const uni = side === 0 ? ['#2c3440', '#1d232c', '#46566a'] : ['#5b5f34', '#3f4224', '#7a7f48'];
  px(x, 3, 26, uni[0], 26, 6); px(x, 5, 24, uni[0], 22, 2); px(x, 13, 24, uni[1], 6, 8);
  px(x, 5, 25, uni[2], 4, 1); px(x, 23, 25, uni[2], 4, 1);
  if (side === 0) { px(x, 20, 27, '#6ff3ff', 3, 1); } else { px(x, 7, 27, '#ffd23a', 2, 2); px(x, 10, 27, '#c8452f', 2, 2); }
  // neck + face
  px(x, 13, 20, shade, 6, 5);
  px(x, 10, 7, skin, 12, 14); px(x, 11, 21, skin, 10, 1); px(x, 9, 10, skin, 1, 7); px(x, 22, 10, skin, 1, 7);
  px(x, 10, 17, shade, 1, 3); px(x, 21, 17, shade, 1, 3);
  // eyes / brows / mouth
  const eye = '#1a1a1a';
  px(x, 12, 13, '#ffffff', 3, 2); px(x, 17, 13, '#ffffff', 3, 2);
  px(x, 13, 13, eye, 2, 2); px(x, 18, 13, eye, 2, 2);
  px(x, 12, 11, hair, 3, 1); px(x, 17, 11, hair, 3, 1);
  px(x, 15, 15, shade, 2, 3);
  if (mood === 1) { px(x, 13, 19, '#7a2a24', 6, 1); px(x, 12, 18, '#7a2a24', 1, 1); px(x, 19, 18, '#7a2a24', 1, 1); }
  else px(x, 14, 19, '#7a3a30', 4, 1);
  // hair styles
  switch (L.style) {
    case 'bob': px(x, 9, 5, hair, 14, 4); px(x, 8, 7, hair, 3, 12); px(x, 21, 7, hair, 3, 12); px(x, 10, 9, hair, 4, 1); break;
    case 'crop': px(x, 10, 5, hair, 12, 3); px(x, 9, 7, hair, 2, 3); px(x, 21, 7, hair, 2, 3); break;
    case 'puffs': px(x, 6, 3, hair, 6, 6); px(x, 20, 3, hair, 6, 6); px(x, 10, 5, hair, 12, 3); break;
    case 'bald': px(x, 9, 9, hair, 2, 4); px(x, 21, 9, hair, 2, 4); px(x, 12, 6, mixHex(skin, '#ffffff', 0.2), 4, 1); break;
    case 'tied': px(x, 10, 5, hair, 12, 4); px(x, 9, 7, hair, 2, 6); px(x, 21, 7, hair, 2, 6); px(x, 22, 4, hair, 4, 3); px(x, 24, 6, hair, 2, 8); break;
    case 'beret': px(x, 9, 4, '#7a1e1e', 15, 4); px(x, 8, 6, '#5a1414', 3, 2); px(x, 21, 5, '#ffd23a', 2, 2); px(x, 9, 8, hair, 2, 4); px(x, 21, 8, hair, 2, 4); break;
  }
  switch (L.acc) {
    case 'headset': px(x, 8, 11, '#30343c', 2, 5); px(x, 8, 16, '#30343c', 1, 3); px(x, 9, 19, '#30343c', 4, 1); px(x, 12, 19, '#6ff3ff', 1, 1); break;
    case 'visor': px(x, 11, 12, '#20262e', 10, 4); px(x, 12, 13, '#6ff3ff', 8, 1); px(x, 10, 13, '#20262e', 1, 2); px(x, 21, 13, '#20262e', 1, 2); break;
    case 'goggles': px(x, 10, 6, '#30343c', 12, 1); px(x, 11, 4, '#4a5260', 4, 3); px(x, 17, 4, '#4a5260', 4, 3); px(x, 12, 5, '#9ad', 2, 1); px(x, 18, 5, '#9ad', 2, 1); break;
    case 'moustache': px(x, 12, 17, '#bdb7ad', 8, 2); px(x, 11, 18, '#bdb7ad', 1, 1); px(x, 20, 18, '#bdb7ad', 1, 1); break;
    case 'scar': px(x, 18, 10, '#c0705a', 1, 6); px(x, 17, 12, '#c0705a', 1, 1); px(x, 19, 14, '#c0705a', 1, 1); break;
    case 'beard': px(x, 10, 17, hair, 12, 4); px(x, 11, 21, hair, 10, 1); px(x, 14, 19, '#7a3a30', 4, 1); break;
  }
  // frame
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 31, 32, 1); x.fillRect(31, 0, 1, 32);
  SPR.portrait[key] = c;
  return c;
}
