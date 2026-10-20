// Tidebound: tiles. Every map tile (outdoor, buildings, cave, interior) is painted in code. A tile is rendered once per
// animation frame to an offscreen canvas on first use, and draw() blits it. Tiles.get(name) never throws: an unknown
// name gives a magenta/black checker that is not solid. Only the helpers inside the IIFE are private.

const Tiles = (() => {
  // ---------- palette ----------
  const K = {
    ol: '#1e3a24',                           // dark outline
    gr: '#5cb84c', gr1: '#4ea842', gr3: '#7ccc62', gs: '#3e9238', gd: '#2a6a2c',
    tg: '#379030', tg1: '#2a7a2a', tgl: '#5cb848', tgk: '#1c4a22', tgL: '#9ae486', tgM: '#58c04c',
    w1: '#2a68c8', w2: '#3a80dc', w3: '#1c4ea6', w4: '#8ccaf8', wsp: '#f6fcff',
    sd: '#f6dc98', sd2: '#e6c47c', sdL: '#fff2c8', sdW: '#d2a862', foam: '#f6fcff', foam2: '#9ad6f6',
    wood: '#a8703c', woodL: '#c8904e', woodD: '#6a4220', woodH: '#e4ae70',
    cream: '#f4e6c4', creamD: '#d8c49a', red: '#d8443a', redD: '#8a2418', blue: '#3c6cd0', glass: '#8ad8f8',
  };

  // ---------- helpers ----------
  function hash(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  // Shaded round blob in tile pixels (centre and radii in tile units). cols = { o, hi, mid, lo, sh }, light top-left.
  function ball(g, cx, cy, rx, ry, cols, speck) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      if (d > 0.7) { px(g, x, y, cols.o); continue; }
      const s = (dx + dy) * 0.5;
      let c = s < -0.4 ? cols.hi : s < 0.05 ? cols.mid : s < 0.45 ? cols.lo : cols.sh;
      if (speck && c !== cols.hi && hash(x, y, 9) < speck[1]) c = speck[0];
      px(g, x, y, c);
    }
  }
  function shadow(g, cx, cy, rx, ry) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(g, x, y, K.gs);
    }
  }
  // Pixel arrow for the stairs tiles.
  function arrow(g, up) {
    const W = '#fff8e0';
    if (up) {
      px(g, 8, 4, W); rect(g, 7, 5, 3, 1, W); rect(g, 6, 6, 5, 1, W); rect(g, 7, 7, 2, 5, W);
    } else {
      rect(g, 7, 4, 2, 5, W); rect(g, 6, 9, 5, 1, W); rect(g, 7, 10, 3, 1, W); px(g, 8, 11, W);
    }
  }
  // 3x5 pixel letters for the MART plate.
  const FONT3 = {
    M: ['#.#', '###', '#.#', '#.#', '#.#'],
    A: ['.#.', '#.#', '###', '#.#', '#.#'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'],
    T: ['###', '.#.', '.#.', '.#.', '.#.'],
  };

  // ---------- grass, sand, path ----------
  function grassBase(g) {
    rect(g, 0, 0, 16, 16, K.gr);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x, y, 1);
      if (h < 0.09) px(g, x, y, K.gr1);
      else if (h > 0.96) px(g, x, y, K.gr3);
    }
  }
  const FLOWERS = [[3, 4, '#f07aa0'], [11, 3, '#ffffff'], [6, 9, '#ffd84a'], [13, 8, '#f07aa0'], [1, 11, '#ffffff'], [9, 12, '#ffd84a']];
  function flowerHead(g, x, y, petal, dx) {
    px(g, x, y + 2, K.gd); px(g, x, y + 3, K.gd); px(g, x - 1, y + 3, K.gs);
    const hx = x + dx;
    px(g, hx, y - 1, petal); px(g, hx - 1, y, petal); px(g, hx + 1, y, petal); px(g, hx, y + 1, petal);
    px(g, hx, y, '#fff3a0');
  }
  function flowersPaint(g, f) {
    grassBase(g);
    FLOWERS.forEach(([x, y, c], i) => {
      const sway = i % 2 === 0 ? (f ? 1 : 0) : (f ? -1 : 0);   // neighbours sway in opposite directions
      flowerHead(g, x, y, c, sway);
    });
  }
  // Tall grass: darker base with blade tufts. The tufts with y >= 6 are also drawn again as the front layer.
  const TUFT = ['..k..', '.kLk.', 'kLMLk', '.kkk.'];
  const TUFT_PAL = { k: K.tgk, L: K.tgL, M: K.tgM };
  const TUFTS = [[1, 0], [7, 1], [11, 3], [3, 5], [9, 6], [0, 9], [6, 10], [11, 11], [3, 12]];
  function tuft(g, x0, y0) {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) {
      const c = TUFT_PAL[TUFT[j][i]];
      if (c) px(g, x0 + i, y0 + j, c);
    }
  }
  function tallBase(g) {
    rect(g, 0, 0, 16, 16, K.tg);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x, y, 2);
      if (h < 0.12) px(g, x, y, K.tg1);
      else if (h > 0.93) px(g, x, y, K.tgl);
    }
    for (const [x, y] of TUFTS) tuft(g, x, y);
  }
  function sandBase(g) {
    rect(g, 0, 0, 16, 16, K.sd);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x, y, 3);
      if (h < 0.1) px(g, x, y, K.sd2);
      else if (h > 0.95) px(g, x, y, K.sdL);
    }
  }
  function pathBase(g) {
    rect(g, 0, 0, 16, 16, '#e8cc9a');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x, y, 4);
      if (h < 0.09) px(g, x, y, '#c8a468');
      else if (h > 0.94) px(g, x, y, '#f8e6bc');
    }
  }

  // ---------- water and shores ----------
  const SPARK = [[[3, 4], [11, 10]], [[8, 2], [13, 6]], [[1, 11], [9, 13]], [[5, 7], [14, 14]]];
  function waterBase(g, f) {
    rect(g, 0, 0, 16, 16, K.w1);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const xs = (x + f * 3 + ((y >> 2) & 1) * 4) & 7;
      if ((y & 3) === 1 && xs < 3) px(g, x, y, K.w2);
      else if ((y & 3) === 3 && xs >= 5) px(g, x, y, K.w3);
    }
    for (const [sx, sy] of SPARK[f & 3]) {
      px(g, sx, sy, K.wsp);
      px(g, sx - 1, sy, K.w4); px(g, sx + 1, sy, K.w4); px(g, sx, sy - 1, K.w4); px(g, sx, sy + 1, K.w4);
    }
  }
  // Sand band depth (pixels) with a little wobble along the coast, so the edge is not ruler-straight.
  const WOB = [0.5, -0.4, 0.2, 0.8, -0.2, 0.3, -0.6, 0.1, 0.6, -0.3, 0.2, -0.5, 0.4, 0.9, -0.1, 0.0];
  const SHORE_D = 5, SHORE_R = 2.5;
  function shorePaint(g, f, sides) {
    waterBase(g, f);
    const dist = (s, x, y) => {
      const d = s === 'n' ? y + 0.5 : s === 's' ? 15.5 - y : s === 'w' ? x + 0.5 : 15.5 - x;
      const w = (s === 'n' || s === 's') ? WOB[x] : WOB[y];
      return d - (SHORE_D + w);   // < 0 is sand, >= 0 is water
    };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let sand, edge;
      if (sides.length === 1) {
        edge = dist(sides[0], x, y);
        sand = edge < 0;
      } else {
        const a = dist(sides[0], x, y), b = dist(sides[1], x, y);
        sand = a < 0 || b < 0;
        edge = Math.min(a, b);
        // round off the water where two sand bands meet (a fillet, so the corner is not a sharp notch)
        if (!sand && a < 2 * SHORE_R && b < 2 * SHORE_R && Math.hypot(a - SHORE_R, b - SHORE_R) > SHORE_R) sand = true;
      }
      if (sand) {
        if (edge > -1.3) px(g, x, y, K.sdW);
        else {
          const h = hash(x, y, 5);
          px(g, x, y, h < 0.1 ? K.sd2 : h > 0.95 ? K.sdL : K.sd);
        }
      } else if (edge < 1.4) {
        px(g, x, y, ((x + y + f) & 1) ? K.foam2 : K.foam);
      }
    }
  }

  // ---------- ledges ----------
  function ledgeS(g) {
    grassBase(g);
    rect(g, 0, 10, 16, 1, '#a6e28a');
    rect(g, 0, 11, 16, 1, K.gd);
    rect(g, 0, 12, 16, 2, '#a07048');
    for (let x = 0; x < 16; x++) if (hash(x, 12, 3) < 0.35) px(g, x, 13, '#7a5232');
    rect(g, 0, 14, 16, 1, '#5a3c22');
    rect(g, 0, 15, 16, 1, '#2e5e2a');
  }
  // The same ledge turned so the cliff faces west or east.
  function ledgeTurn(g, dir) {
    const src = makeCanvas(16, 16, (c, s) => ledgeS(s));
    g.save();
    if (dir === 'w') g.setTransform(0, 1, -1, 0, 16, 0);
    else g.setTransform(0, -1, 1, 0, 0, 16);
    g.drawImage(src, 0, 0);
    g.restore();
  }

  // ---------- trees, rocks, plants, objects ----------
  const TREE_C = { o: '#18361e', hi: '#8ce274', mid: '#40a83a', lo: '#2c7c30', sh: '#1d5a24' };
  const BUSH_C = { o: '#18361e', hi: '#9ae680', mid: '#4cae44', lo: '#2e8034', sh: '#1f5a26' };
  const ROCK_C = { o: '#34343e', hi: '#eeeef6', mid: '#b8b8c4', lo: '#8a8a96', sh: '#5c5c68' };
  const SMASH_C = { o: '#40321f', hi: '#f2d8b0', mid: '#c09a6c', lo: '#94704a', sh: '#5e4428' };
  const CHOP_C = { o: '#18361e', hi: '#c4f4a0', mid: '#58c04c', lo: '#34903a', sh: '#246a2a' };
  const CRACK = [[9, 5], [8, 6], [8, 7], [7, 8], [6, 8], [6, 9], [5, 10], [4, 10]];
  function treeTrunk(g, y0, h) {
    rect(g, 6, y0, 4, h, '#7c4e2a');
    rect(g, 6, y0, 1, h, '#a8703c');
    rect(g, 9, y0, 1, h, '#4a2c14');
  }
  function fence(g) {
    grassBase(g);
    for (const x0 of [1, 6, 11]) {
      rect(g, x0, 4, 3, 11, '#f8f4ea');
      rect(g, x0, 4, 1, 11, '#9a8a70');
      rect(g, x0 + 2, 4, 1, 11, '#9a8a70');
      px(g, x0 + 1, 3, '#f8f4ea'); px(g, x0 + 1, 2, '#9a8a70');
    }
    rect(g, 0, 6, 16, 2, '#c89660'); rect(g, 0, 6, 16, 1, '#e8c08a');
    rect(g, 0, 11, 16, 2, '#c89660'); rect(g, 0, 12, 16, 1, '#8a5a30');
  }
  function sign(g) {
    grassBase(g);
    rect(g, 7, 9, 2, 7, '#8a5a30');
    rect(g, 2, 2, 12, 8, '#2c1a0c');
    rect(g, 3, 3, 10, 6, '#d8a062');
    rect(g, 3, 3, 10, 1, '#f0c088');
    rect(g, 4, 5, 8, 1, '#6a3e18');
    rect(g, 4, 7, 6, 1, '#6a3e18');
  }
  function mailbox(g) {
    grassBase(g);
    shadow(g, 8, 14.5, 4, 1.2);
    rect(g, 7, 9, 2, 6, '#8a5a30');
    rect(g, 4, 4, 8, 6, '#2c1a0c');
    rect(g, 5, 5, 6, 4, '#e8483a');
    rect(g, 5, 5, 6, 1, '#f8806c');
    rect(g, 5, 7, 6, 1, '#ffffff');
    rect(g, 12, 2, 1, 4, '#2c1a0c');
    rect(g, 13, 2, 2, 2, '#f0c040');
  }
  function lamp(g) {
    grassBase(g);
    shadow(g, 8, 14.5, 4, 1.2);
    rect(g, 7, 5, 2, 10, '#50505a');
    rect(g, 5, 14, 6, 2, '#383840');
    rect(g, 5, 0, 6, 1, '#383840');
    rect(g, 5, 1, 6, 3, '#383840');
    rect(g, 6, 1, 4, 3, '#fff6b0');
    px(g, 7, 2, '#ffffff'); px(g, 8, 2, '#ffffff');
  }
  function dockPaint(g) {
    for (let y = 0; y < 16; y++) {
      const seam = (y >> 2) & 1 ? 11 : 4;
      for (let x = 0; x < 16; x++) {
        const r = y & 3;
        let c;
        if (r === 0) c = '#7a4f2c';
        else if (r === 1) c = '#d6a66c';
        else if (r === 3) c = '#9a6a3a';
        else c = x === seam ? '#7a4f2c' : hash(x, y, 6) < 0.05 ? '#a87444' : '#b98452';
        px(g, x, y, c);
      }
    }
  }
  function roofPaint(g, c, edgeL, edgeR) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = y & 3, off = ((y >> 2) & 1) ? 2 : 0;
      let col;
      if (y === 0 || y === 15) col = c.ol;
      else if (r === 0) col = c.hi;
      else if (r === 3) col = c.sh;
      else col = ((x + off) & 3) === 0 ? c.sh : c.base;
      if (edgeL && x === 0) col = c.ol;
      if (edgeR && x === 15) col = c.ol;
      px(g, x, y, col);
    }
  }
  const BLUE_R = { base: '#3c6cd0', hi: '#78a4f0', sh: '#24489a', ol: '#14265c' };
  const RED_R = { base: '#d8443a', hi: '#f88a72', sh: '#982c1c', ol: '#4a1410' };
  const TEAL_R = { base: '#2aa0a0', hi: '#64d4cc', sh: '#17706c', ol: '#0c4444' };
  const WHITE_R = { base: '#eef3f8', hi: '#ffffff', sh: '#c2ceda', ol: '#6c7c8c' };
  function plate(g, cx, cy, r, ol) {
    ball(g, cx, cy, r, r, { o: ol, hi: '#ffffff', mid: '#ffffff', lo: '#eef2f6', sh: '#d4dce4' });
  }
  function sidingPaint(g, base, line) {
    rect(g, 0, 0, 16, 16, base);
    for (let y = 3; y < 16; y += 4) rect(g, 0, y, 16, 1, line);
  }
  function woodFloor(g) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = y & 3, seamX = ((y >> 2) & 1) ? 11 : 5;
      let c = '#c48c52';
      if (r === 0) c = '#a86e3a';
      else if (r === 1) c = '#d8a46a';
      else if (x === seamX) c = '#a86e3a';
      else if (hash(x, y, 8) < 0.06) c = '#b87c44';
      px(g, x, y, c);
    }
  }
  function tileFloor(g) {
    rect(g, 0, 0, 16, 16, '#ece2cc');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if ((x & 7) === 7 || (y & 7) === 7) px(g, x, y, '#c8b89a');
    }
  }
  function rockWall(g) {
    rect(g, 0, 0, 16, 16, '#7a6a5a');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const course = y >> 2;
      const joint = (x + (course & 1) * 4) & 7;
      if ((y & 3) === 3) px(g, x, y, '#4e4238');
      else if (joint === 7) px(g, x, y, '#4e4238');
      else if (hash(x, y, 6) < 0.08) px(g, x, y, '#8e7e6c');
    }
    rect(g, 15, 0, 1, 16, '#4a3e34');
    rect(g, 0, 15, 16, 1, '#4a3e34');
  }
  function caveFloor(g) {
    rect(g, 0, 0, 16, 16, '#5a5450');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x, y, 7);
      if (h < 0.1) px(g, x, y, '#4a4540');
      else if (h > 0.95) px(g, x, y, '#6e6862');
    }
  }
  const ROCK2 = { o: '#2a2220', hi: '#b8a890', mid: '#8a7a68', lo: '#6a5c4c', sh: '#4a3e34' };
  const BOOKS = ['#d84848', '#3c6cd0', '#f0c040', '#48a848', '#c060c0', '#f08040', '#e8e8e8'];
  const ORB = [
    { o: '#5a1010', hi: '#ffd0c0', mid: '#f05050', lo: '#c02828', sh: '#8a1010' },
    { o: '#10204a', hi: '#c0e0ff', mid: '#4a8ae8', lo: '#2a5ac0', sh: '#183a80' },
    { o: '#5a4010', hi: '#fff8c0', mid: '#f8d848', lo: '#e0aa20', sh: '#a07010' },
  ];
  const STONE_C = { o: '#4a4a58', hi: '#f0f0f8', mid: '#c8c8d4', lo: '#a0a0b0', sh: '#7a7a88' };
  const PLANT_C = TREE_C;

  // ---------- registry ----------
  const defs = {};
  const rendered = {};
  const tiles = {};
  function def(name, flags, paint, extra) {
    const e = extra || {};
    defs[name] = { flags: flags || {}, paint, n: e.n || 1, fps: e.fps || 0, over: e.over || null };
  }
  function ready(name) {
    let r = rendered[name];
    if (r) return r;
    const d = defs[name];
    r = rendered[name] = { frames: [], overs: d.over ? [] : null };
    for (let f = 0; f < d.n; f++) {
      r.frames.push(makeCanvas(16, 16, (c, g) => d.paint(g, f)));
      if (d.over) r.overs.push(makeCanvas(16, 16, (c, g) => d.over(g, f)));
    }
    return r;
  }
  function frameOf(d, t) { return d.n > 1 ? Math.floor(Math.max(0, t) * d.fps) % d.n : 0; }
  function get(name) {
    const id = typeof name === 'string' && defs[name] ? name : '?';
    if (tiles[id]) return tiles[id];
    const d = defs[id], f = d.flags;
    tiles[id] = {
      name: id,
      solid: !!f.solid, enc: f.enc || null, ledge: f.ledge || null, water: !!f.water, over: !!f.over,
      door: !!f.door, counter: !!f.counter, chop: !!f.chop, smash: !!f.smash,
      draw(g, x, y, time) { const r = ready(id); g.drawImage(r.frames[frameOf(d, time || 0)], x, y); },
      drawOver(g, x, y, time) { const r = ready(id); if (r.overs) g.drawImage(r.overs[frameOf(d, time || 0)], x, y); },
    };
    return tiles[id];
  }

  // ---------- outdoor ----------
  def('grass', {}, (g) => grassBase(g));
  def('flowers', {}, (g, f) => flowersPaint(g, f), { n: 2, fps: 2 });
  def('tallgrass', { enc: 'grass', over: true }, (g) => tallBase(g), {
    over: (g) => { for (const [x, y] of TUFTS) if (y >= 6) tuft(g, x, y); },
  });
  def('sand', {}, (g) => sandBase(g));
  def('path', {}, (g) => pathBase(g));
  def('water', { solid: true, water: true }, (g, f) => waterBase(g, f), { n: 4, fps: 4 });
  def('shore_n', { solid: true, water: true }, (g, f) => shorePaint(g, f, ['n']), { n: 4, fps: 4 });
  def('shore_s', { solid: true, water: true }, (g, f) => shorePaint(g, f, ['s']), { n: 4, fps: 4 });
  def('shore_e', { solid: true, water: true }, (g, f) => shorePaint(g, f, ['e']), { n: 4, fps: 4 });
  def('shore_w', { solid: true, water: true }, (g, f) => shorePaint(g, f, ['w']), { n: 4, fps: 4 });
  def('shore_ne', { solid: true, water: true }, (g, f) => shorePaint(g, f, ['n', 'e']), { n: 4, fps: 4 });
  def('shore_nw', { solid: true, water: true }, (g, f) => shorePaint(g, f, ['n', 'w']), { n: 4, fps: 4 });
  def('shore_se', { solid: true, water: true }, (g, f) => shorePaint(g, f, ['s', 'e']), { n: 4, fps: 4 });
  def('shore_sw', { solid: true, water: true }, (g, f) => shorePaint(g, f, ['s', 'w']), { n: 4, fps: 4 });
  def('tree', { solid: true }, (g) => {
    grassBase(g);
    ball(g, 8, 7.5, 7.8, 7.5, TREE_C, ['#2c7c30', 0.2]);
  });
  def('tree_top', { solid: true }, (g) => {
    grassBase(g);
    ball(g, 8, 8.2, 7.8, 7.6, TREE_C, ['#2c7c30', 0.2]);
  });
  def('tree_bottom', { solid: true }, (g) => {
    grassBase(g);
    shadow(g, 8, 15, 6, 1.4);
    ball(g, 8, -1.5, 7.2, 5.6, TREE_C, ['#2c7c30', 0.2]);
    treeTrunk(g, 3, 13);
  });
  def('bush', { solid: true }, (g) => {
    grassBase(g);
    shadow(g, 8, 14.5, 6.5, 1.5);
    ball(g, 8, 9, 6.8, 5.4, BUSH_C, ['#2e8034', 0.15]);
  });
  def('rock', { solid: true }, (g) => {
    grassBase(g);
    shadow(g, 8, 13.6, 5.5, 1.6);
    ball(g, 8, 9.6, 5.8, 4.6, ROCK_C);
  });
  def('fence', { solid: true }, (g) => fence(g));
  def('sign', { solid: true }, (g) => sign(g));
  def('mailbox', { solid: true }, (g) => mailbox(g));
  def('ledge_s', { ledge: 'down' }, (g) => ledgeS(g));
  def('ledge_w', { ledge: 'left' }, (g) => ledgeTurn(g, 'w'));
  def('ledge_e', { ledge: 'right' }, (g) => ledgeTurn(g, 'e'));
  def('dune', {}, (g) => {
    sandBase(g);
    ball(g, 8, 11, 7.5, 5, { o: '#c8a060', hi: '#fff6d4', mid: '#f4da90', lo: '#e4c078', sh: '#d4aa68' });
  });
  def('chop_tree', { solid: true, chop: true }, (g) => {
    grassBase(g);
    shadow(g, 8, 14.5, 4, 1.2);
    rect(g, 7, 9, 2, 6, '#8a5a30');
    rect(g, 7, 9, 1, 6, '#b07a48');
    ball(g, 8, 6, 4.6, 4.6, CHOP_C);
  });
  def('boulder', { solid: true }, (g) => {
    grassBase(g);
    shadow(g, 8, 15, 7, 1.3);
    ball(g, 8, 8.4, 7.6, 7.2, ROCK_C);
  });
  def('smash_rock', { solid: true, smash: true }, (g) => {
    grassBase(g);
    shadow(g, 8, 14, 5.5, 1.4);
    ball(g, 8, 9.4, 6.2, 5.2, SMASH_C);
    for (const [x, y] of CRACK) px(g, x, y, SMASH_C.sh);
  });
  def('dock', {}, (g) => dockPaint(g));
  def('pier_post', { solid: true }, (g, f) => {
    waterBase(g, f);
    rect(g, 6, 0, 4, 16, '#8a5a30');
    rect(g, 6, 0, 1, 16, '#c08a50');
    rect(g, 9, 0, 1, 16, '#4a2c14');
    rect(g, 5, 0, 6, 2, '#a87444');
    rect(g, 5, 0, 6, 1, '#c8904e');
  }, { n: 4, fps: 4 });
  def('flowerbed', {}, (g) => {
    grassBase(g);
    FLOWERS.forEach(([x, y, c]) => { if (y <= 12) flowerHead(g, x, y, c, 0); });
    flowerHead(g, 7, 12, '#f07aa0', 0);
  });
  def('lamp', { solid: true }, (g) => lamp(g));

  // ---------- buildings ----------
  def('roof_l', { solid: true }, (g) => roofPaint(g, BLUE_R, true, false));
  def('roof_m', { solid: true }, (g) => roofPaint(g, BLUE_R, false, false));
  def('roof_r', { solid: true }, (g) => roofPaint(g, BLUE_R, false, true));
  def('roof_red_l', { solid: true }, (g) => roofPaint(g, RED_R, true, false));
  def('roof_red_m', { solid: true }, (g) => roofPaint(g, RED_R, false, false));
  def('roof_red_r', { solid: true }, (g) => roofPaint(g, RED_R, false, true));
  def('wall', { solid: true }, (g) => sidingPaint(g, K.cream, K.creamD));
  def('wall_window', { solid: true }, (g) => {
    sidingPaint(g, K.cream, K.creamD);
    rect(g, 3, 3, 10, 9, '#4a3020');
    rect(g, 4, 4, 8, 7, K.glass);
    rect(g, 7, 4, 1, 7, '#4a3020');
    rect(g, 4, 4, 3, 1, '#ffffff');
    rect(g, 4, 5, 1, 2, '#ffffff');
    rect(g, 2, 12, 12, 1, '#b8a078');
  });
  def('door', { door: true }, (g) => {
    sidingPaint(g, K.cream, K.creamD);
    rect(g, 3, 2, 10, 14, '#4a3020');
    rect(g, 4, 3, 8, 13, '#a86c3c');
    rect(g, 5, 4, 6, 4, '#c08a50');
    rect(g, 5, 10, 6, 5, '#c08a50');
    px(g, 9, 9, '#f8d060');
    rect(g, 2, 15, 12, 1, '#b8b0a0');
  });
  def('care_roof', { solid: true }, (g) => {
    roofPaint(g, RED_R, false, false);
    plate(g, 8, 8, 4.8, '#4a1410');
    rect(g, 7, 5, 2, 6, K.red);
    rect(g, 5, 7, 6, 2, K.red);
  });
  def('care_wall', { solid: true }, (g) => {
    sidingPaint(g, '#fff6f4', '#ecd6d0');
    rect(g, 0, 0, 16, 2, K.red);
    rect(g, 0, 14, 16, 1, '#ecd6d0');
  });
  def('care_door', { door: true }, (g) => {
    sidingPaint(g, '#fff6f4', '#ecd6d0');
    rect(g, 2, 2, 12, 14, K.red);
    rect(g, 3, 3, 5, 12, '#bfe8ff');
    rect(g, 8, 3, 5, 12, '#bfe8ff');
    rect(g, 7, 3, 1, 12, K.red);
    px(g, 4, 4, '#ffffff'); px(g, 9, 4, '#ffffff');
    px(g, 6, 9, '#ffffff'); px(g, 9, 9, '#ffffff');
  });
  def('mart_roof', { solid: true }, (g) => {
    roofPaint(g, BLUE_R, false, false);
    rect(g, 0, 4, 16, 8, BLUE_R.ol);
    rect(g, 0, 5, 16, 6, '#ffffff');
    for (const k of ['M', 'A', 'R', 'T']) {
      const x0 = 'MART'.indexOf(k) * 4;
      FONT3[k].forEach((row, j) => {
        for (let i = 0; i < 3; i++) if (row[i] === '#') px(g, x0 + i, 6 + j, BLUE_R.ol);
      });
    }
  });
  def('mart_wall', { solid: true }, (g) => {
    sidingPaint(g, K.cream, K.creamD);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) px(g, x, y, ((x >> 1) & 1) ? '#ffffff' : K.blue);
    for (let x = 0; x < 16; x += 2) px(g, x, 4, K.blue);
    rect(g, 2, 7, 12, 6, '#4a3020');
    rect(g, 3, 8, 10, 4, K.glass);
  });
  def('mart_door', { door: true }, (g) => {
    sidingPaint(g, K.cream, K.creamD);
    rect(g, 2, 2, 12, 14, K.blue);
    rect(g, 3, 3, 10, 12, '#cdeeff');
    rect(g, 7, 3, 2, 12, K.blue);
    px(g, 6, 9, '#ffffff'); px(g, 9, 9, '#ffffff');
  });
  def('gym_roof', { solid: true }, (g) => {
    roofPaint(g, TEAL_R, false, false);
    ball(g, 8, 8, 6, 6, { o: '#7a5008', hi: '#fff4b0', mid: '#f4c440', lo: '#d8a020', sh: '#a87410' });
    ball(g, 8, 8, 4.2, 4.2, { o: '#14306a', hi: '#9cc4fa', mid: '#3a78d8', lo: '#2a5cb8', sh: '#1c4090' });
    for (let x = 5; x <= 10; x++) px(g, x, (x & 1) ? 8 : 7, '#ffffff');
  });
  def('gym_wall', { solid: true }, (g) => {
    sidingPaint(g, '#eef8f8', '#d4ecea');
    rect(g, 0, 0, 2, 16, '#2aa0a0');
    rect(g, 14, 0, 2, 16, '#2aa0a0');
    rect(g, 0, 0, 1, 16, '#64d4cc');
    rect(g, 5, 4, 6, 7, '#2a68c8');
    rect(g, 6, 5, 4, 5, '#8ab8f8');
  });
  def('gym_door', { door: true }, (g) => {
    sidingPaint(g, '#eef8f8', '#d4ecea');
    rect(g, 3, 2, 10, 14, '#1c6e6e');
    rect(g, 4, 3, 4, 12, '#2aa0a0');
    rect(g, 8, 3, 4, 12, '#2aa0a0');
    rect(g, 7, 1, 2, 1, '#f0c040');
    px(g, 7, 9, '#f0c040'); px(g, 8, 9, '#f0c040');
  });
  def('lab_roof', { solid: true }, (g) => {
    roofPaint(g, WHITE_R, false, false);
    rect(g, 0, 6, 16, 2, '#2aa8a8');
    rect(g, 0, 6, 16, 1, '#5ad0cc');
  });
  def('lab_wall', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#f0f4f8');
    rect(g, 0, 4, 16, 2, '#2aa8a8');
    rect(g, 3, 8, 10, 5, '#4a6a80');
    rect(g, 4, 9, 8, 3, '#9ae0f0');
  });
  def('lab_door', { door: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#f0f4f8');
    rect(g, 4, 2, 8, 14, '#2aa8a8');
    rect(g, 5, 3, 6, 6, '#cdf4f8');
    rect(g, 5, 10, 6, 5, '#48c8c0');
    px(g, 9, 9, '#ffffff');
  });
  def('lighthouse_top', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#f4f4f8');
    ball(g, 8, 3, 6.5, 3.5, { o: '#4a1410', hi: '#f88a72', mid: '#d8443a', lo: '#b02c20', sh: '#7a1c12' });
    rect(g, 4, 7, 8, 5, '#fff4a0');
    rect(g, 6, 7, 4, 5, '#ffffff');
    rect(g, 3, 6, 10, 1, '#3a3a44');
    rect(g, 3, 12, 10, 1, '#3a3a44');
    rect(g, 3, 6, 1, 7, '#3a3a44');
    rect(g, 12, 6, 1, 7, '#3a3a44');
    rect(g, 0, 13, 16, 3, '#c8ccd6');
    rect(g, 0, 13, 16, 1, '#3a3a44');
  });
  def('lighthouse_body', { solid: true }, (g) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const red = (y >> 2) & 1;
      let c = red ? K.red : '#f4f4f8';
      if (x < 3) c = red ? '#b02c20' : '#d8d8e0';
      else if (x > 12) c = red ? '#b02c20' : '#e8e8f0';
      px(g, x, y, c);
    }
  });
  def('lighthouse_door', { door: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#c8c0b0');
    for (let y = 3; y < 16; y += 4) rect(g, 0, y, 16, 1, '#a89e8e');
    rect(g, 4, 5, 8, 11, '#7a3028');
    rect(g, 5, 4, 6, 1, '#7a3028');
    rect(g, 6, 3, 4, 1, '#7a3028');
    px(g, 9, 10, '#f8d060');
  });

  // ---------- cave ----------
  def('cave_floor', { enc: 'cave' }, (g) => caveFloor(g));
  def('cave_wall', { solid: true }, (g) => rockWall(g));
  def('cave_wall_top', { solid: true }, (g) => {
    rockWall(g);
    rect(g, 0, 0, 16, 3, '#a89888');
    for (let x = 1; x < 16; x += 4) px(g, x, 0, '#c8b8a8');
    rect(g, 0, 3, 16, 1, '#4a3e34');
  });
  def('cave_ladder', { door: true }, (g) => {
    caveFloor(g);
    rect(g, 4, 0, 2, 16, '#9a6a3a');
    rect(g, 4, 0, 1, 16, '#c8904e');
    rect(g, 10, 0, 2, 16, '#9a6a3a');
    rect(g, 10, 0, 1, 16, '#c8904e');
    for (const y of [2, 6, 10, 14]) {
      rect(g, 4, y, 8, 1, '#c8904e');
      rect(g, 4, y + 1, 8, 1, '#6a4220');
    }
  });
  def('cave_entrance', { door: true }, (g) => {
    rockWall(g);
    rect(g, 3, 8, 10, 8, '#1e1a18');
    rect(g, 5, 6, 6, 2, '#1e1a18');
    rect(g, 6, 5, 4, 1, '#1e1a18');
    rect(g, 4, 13, 8, 3, '#3a3430');
  });
  def('cave_exit', { door: true }, (g) => {
    rockWall(g);
    rect(g, 3, 8, 10, 8, '#9ad4f0');
    rect(g, 5, 6, 6, 2, '#9ad4f0');
    rect(g, 6, 5, 4, 1, '#9ad4f0');
    rect(g, 4, 12, 8, 4, '#e8d8a8');
  });
  def('water_cave', { solid: true, water: true }, (g, f) => {
    rect(g, 0, 0, 16, 16, '#1c4a5a');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if ((y & 3) === 1 && ((x + f * 3 + ((y >> 2) & 1) * 4) & 7) < 2) px(g, x, y, '#2a6a7a');
    }
    for (const [sx, sy] of SPARK[f & 3]) px(g, sx, sy, '#7ae0f0');
  }, { n: 4, fps: 3 });
  def('rubble', { solid: true }, (g) => {
    caveFloor(g);
    ball(g, 4.5, 11, 3.8, 3, ROCK2);
    ball(g, 11, 10.5, 4, 3.4, ROCK2);
    ball(g, 8, 5.5, 3, 2.6, ROCK2);
  });

  // ---------- interior ----------
  def('floor', {}, (g) => tileFloor(g));
  def('wood_floor', {}, (g) => woodFloor(g));
  def('wall_in', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 12, '#ece2d0');
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) if ((x & 3) === 1 && (y & 3) === 1) px(g, x, y, '#dccbb0');
    rect(g, 0, 0, 16, 2, '#c8b498');
    rect(g, 0, 12, 16, 4, '#a8733e');
    rect(g, 0, 12, 16, 1, '#d8a466');
    rect(g, 0, 15, 16, 1, '#5a3418');
  });
  def('window_in', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 12, '#ece2d0');
    rect(g, 0, 0, 16, 2, '#c8b498');
    rect(g, 0, 12, 16, 4, '#a8733e');
    rect(g, 0, 12, 16, 1, '#d8a466');
    rect(g, 3, 2, 10, 9, '#f8f8f8');
    rect(g, 4, 3, 8, 7, '#a8e0f8');
    rect(g, 7, 3, 2, 7, '#f8f8f8');
    rect(g, 4, 3, 2, 1, '#ffffff');
    rect(g, 2, 11, 12, 1, '#c8b498');
  });
  def('stairs_up', { door: true }, (g) => {
    woodFloor(g);
    rect(g, 0, 0, 2, 16, '#6a4220');
    rect(g, 14, 0, 2, 16, '#6a4220');
    for (let k = 0; k < 4; k++) {
      const y = k * 4;
      rect(g, 2, y, 12, 1, K.woodH);
      rect(g, 2, y + 1, 12, 2, '#b07a44');
      rect(g, 2, y + 3, 12, 1, '#6a3c18');
    }
    arrow(g, true);
  });
  def('stairs_down', { door: true }, (g) => {
    woodFloor(g);
    rect(g, 0, 0, 2, 16, '#6a4220');
    rect(g, 14, 0, 2, 16, '#6a4220');
    for (let k = 0; k < 4; k++) {
      const y = k * 4;
      rect(g, 2, y, 12, 1, K.woodH);
      rect(g, 2, y + 1, 12, 2, '#b07a44');
      rect(g, 2, y + 3, 12, 1, '#6a3c18');
    }
    arrow(g, false);
  });
  def('mat', {}, (g) => {
    woodFloor(g);
    rect(g, 1, 2, 14, 12, '#8a5a30');
    rect(g, 2, 3, 12, 10, '#d8b070');
    for (let y = 3; y < 13; y++) for (let x = 2; x < 14; x++) if (((x >> 1) + (y >> 1)) & 1) px(g, x, y, '#c09050');
  });
  def('table', { solid: true }, (g) => {
    woodFloor(g);
    rect(g, 1, 3, 14, 7, '#c8884a');
    rect(g, 1, 3, 14, 1, K.woodH);
    rect(g, 1, 9, 14, 1, '#6a4220');
    rect(g, 2, 10, 2, 5, '#8a5a30');
    rect(g, 12, 10, 2, 5, '#8a5a30');
  });
  def('chair', { solid: true }, (g) => {
    woodFloor(g);
    rect(g, 4, 1, 8, 5, '#a06a3a');
    rect(g, 5, 2, 6, 1, '#c08a52');
    rect(g, 5, 4, 6, 1, '#c08a52');
    rect(g, 3, 6, 10, 3, '#c8904e');
    rect(g, 3, 6, 10, 1, K.woodH);
    rect(g, 4, 9, 2, 6, '#6a4220');
    rect(g, 10, 9, 2, 6, '#6a4220');
  });
  def('bed', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#8a5a30');
    rect(g, 0, 0, 16, 3, '#6a4220');
    rect(g, 3, 3, 10, 4, '#ffffff');
    rect(g, 3, 3, 10, 1, '#c8c8d8');
    rect(g, 1, 7, 14, 8, '#3c6cd0');
    rect(g, 1, 7, 14, 1, '#6c96ec');
    rect(g, 1, 10, 14, 1, '#2a54a8');
    rect(g, 1, 15, 14, 1, '#6a4220');
  });
  def('bookshelf', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#8a5a30');
    for (let s = 0; s < 3; s++) {
      const y0 = 1 + s * 5;
      for (let x = 1; x < 15; x++) {
        const c = BOOKS[Math.floor(hash(x, s, 11) * BOOKS.length)];
        rect(g, x, y0, 1, 4, (x * 7 + s) % 3 === 0 ? '#4a2c14' : c);
      }
      rect(g, 0, y0 + 4, 16, 1, '#4a2c14');
    }
  });
  def('tv', { solid: true }, (g) => {
    woodFloor(g);
    rect(g, 2, 1, 12, 8, '#2a2a34');
    rect(g, 3, 2, 10, 6, '#58b0e8');
    rect(g, 4, 3, 2, 1, '#c8ecff');
    rect(g, 1, 9, 14, 6, '#6a4a2a');
    rect(g, 1, 9, 14, 1, '#8a6a4a');
    rect(g, 3, 15, 2, 1, '#2a2a34');
    rect(g, 11, 15, 2, 1, '#2a2a34');
  });
  def('plant', { solid: true }, (g) => {
    tileFloor(g);
    rect(g, 4, 9, 8, 2, '#d87850');
    rect(g, 5, 10, 6, 5, '#c06040');
    rect(g, 5, 10, 1, 5, '#d87850');
    ball(g, 8, 6, 5.6, 4.8, PLANT_C, ['#2c7c30', 0.2]);
  });
  def('counter', { solid: true, counter: true }, (g) => {
    rect(g, 0, 0, 16, 6, '#e0d4bc');
    rect(g, 0, 6, 16, 1, '#fff8e8');
    rect(g, 0, 7, 16, 9, '#a06c3c');
    rect(g, 2, 9, 12, 1, '#7a4c24');
    rect(g, 2, 13, 12, 1, '#7a4c24');
    px(g, 7, 11, '#f0d080'); px(g, 8, 11, '#f0d080');
  });
  def('pc', { solid: true }, (g) => {
    woodFloor(g);
    rect(g, 4, 1, 8, 6, '#3a3a44');
    rect(g, 5, 2, 6, 4, '#58d0a0');
    rect(g, 7, 7, 2, 1, '#3a3a44');
    rect(g, 0, 8, 16, 8, '#a88050');
    rect(g, 0, 8, 16, 1, '#c8a070');
    rect(g, 4, 9, 8, 2, '#e0e0e8');
  });
  def('heal_machine', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#d8dce4');
    rect(g, 0, 0, 16, 1, '#ffffff');
    rect(g, 0, 15, 16, 1, '#6a7080');
    rect(g, 0, 0, 1, 16, '#9aa0b0');
    rect(g, 15, 0, 1, 16, '#6a7080');
    rect(g, 1, 1, 14, 2, '#3c6cd0');
    rect(g, 1, 2, 14, 1, '#6c96ec');
    const slots = [[2, 5, 0], [6, 5, 1], [10, 5, 2], [2, 10, 1], [6, 10, 2], [10, 10, 0]];
    for (const [x0, y0, k] of slots) {
      rect(g, x0 - 1, y0 - 1, 5, 5, '#7a8296');
      rect(g, x0, y0, 3, 3, '#3a4050');
      ball(g, x0 + 1.5, y0 + 1.5, 1.6, 1.6, ORB[k]);
    }
    rect(g, 1, 14, 14, 1, '#9aa0b0');
  });
  def('shelf', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#b08050');
    const items = ['#e04848', '#48a848', '#3c6cd0', '#f0c040', '#c060c0'];
    for (const y of [4, 9, 14]) {
      items.forEach((c, i) => {
        const x = 1 + i * 3;
        rect(g, x, y - 3, 2, 3, c);
        px(g, x, y - 4, '#4a2c14');
      });
      rect(g, 0, y, 16, 1, '#6a4220');
      rect(g, 0, y + 1, 16, 1, '#d8a466');
    }
  });
  def('rug', {}, (g) => {
    rect(g, 0, 0, 16, 16, '#c8443a');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (((x + y) & 7) === 0 || ((x - y + 16) & 7) === 0) px(g, x, y, '#f0c060');
      else if (((x + y) & 7) === 4) px(g, x, y, '#a02a22');
    }
  });
  def('lab_machine', { solid: true }, (g) => {
    tileFloor(g);
    rect(g, 1, 2, 14, 12, '#8aa8b0');
    rect(g, 1, 2, 14, 1, '#3a5058');
    rect(g, 1, 13, 14, 1, '#3a5058');
    rect(g, 1, 2, 1, 12, '#3a5058');
    rect(g, 14, 2, 1, 12, '#3a5058');
    rect(g, 3, 4, 10, 5, '#1e3a40');
    px(g, 4, 5, '#58f0a0'); px(g, 6, 5, '#f0d058'); px(g, 8, 5, '#58f0a0'); px(g, 10, 5, '#f06058');
    px(g, 4, 11, '#e0e8ec'); px(g, 7, 11, '#e0e8ec'); px(g, 10, 11, '#e0e8ec');
    rect(g, 0, 14, 16, 2, '#c8d4d8');
    rect(g, 0, 14, 16, 1, '#8aa0a8');
  });
  def('gym_floor', {}, (g) => {
    rect(g, 0, 0, 16, 16, '#3cb8b0');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if ((x & 7) === 7 || (y & 7) === 7) px(g, x, y, '#a8f0e8');
      else if (hash(x, y, 13) < 0.05) px(g, x, y, '#34a8a0');
    }
  });
  def('gym_pool', { solid: true }, (g, f) => {
    waterBase(g, f);
    rect(g, 0, 0, 16, 1, '#e8f4f8');
    rect(g, 0, 15, 16, 1, '#c8d8e0');
  }, { n: 4, fps: 4 });
  def('gym_statue', { solid: true }, (g) => {
    rect(g, 0, 0, 16, 16, '#3cb8b0');
    rect(g, 3, 11, 10, 5, '#c8c8d0');
    rect(g, 3, 11, 10, 1, '#f0f0f8');
    rect(g, 3, 15, 10, 1, '#7a7a88');
    ball(g, 8, 10.5, 4.5, 3.6, STONE_C);
    ball(g, 8, 4.6, 2.6, 2.8, STONE_C);
  });

  // Unknown tile: magenta/black checker, not solid.
  def('?', {}, (g) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(g, x, y, ((x >> 2) + (y >> 2)) & 1 ? '#ff00ff' : '#000000');
  });

  return {
    get,
    names: Object.keys(defs).filter((n) => n !== '?'),
  };
})();
DBG.tiles = Tiles;
