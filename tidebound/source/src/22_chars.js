// Tidebound: characters. Overworld sprites (16x20, 4 directions x 3 frames) and battle portraits (64x64).
// Overworld: one pixel-string body per direction (head, shirt, legs) shared by everyone; each character recolours
// it through a palette and adds small row patches for hair, hats and props. Portraits: 64x64 3/4 busts painted
// natively from shape layers and pixel stamps, shaded and outlined. Everything is built lazily and cached.
const Chars = (() => {
  const OUT = '#281c28', EYE = '#181820', SHOE = '#3a2820', BELT = '#4a3020', METAL = '#c8d0d8', BROWN = '#8a5a30';
  const SKIN = { light: '#f8d8b0', tan: '#e0a878', medium: '#c88858', dark: '#8a5030' };

  // hex colour * f (f < 1 darkens)
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    return '#' + [16, 8, 0].map((s) => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0')).join('');
  }

  // ---------- per-character specs ----------
  // hair/skin/shirt/pants colours; hat + band for hatType 'cap' | 'straw' | 'swim' | 'nurse';
  // acc = accent (scarf, cape, backpack); flags: long, spiky, bun, beard, glasses, coat, skirt, apron,
  // scarf, cape, pack, cane, net.
  const SPEC = {
    player:    { hair: '#6a3c20', skin: SKIN.light, shirt: '#f0f0f0', pants: '#3c4c7c', hat: '#e03838', band: '#f8f8f8', acc: '#3868c8', hatType: 'cap', pack: 1 },
    rival:     { hair: '#3a6ad8', skin: SKIN.light, shirt: '#e8e8f0', pants: '#303848', acc: '#e03838', spiky: 1, scarf: 1 },
    prof:      { hair: '#d8d8e0', skin: SKIN.light, shirt: '#f4f4f8', pants: '#4a5878', band: '#f4f4f8', long: 1, coat: 1, glasses: 1 },
    mom:       { hair: '#8a4a28', skin: SKIN.light, shirt: '#e87898', pants: '#e87898', acc: '#e87898', long: 1, skirt: 1 },
    nurse:     { hair: '#6a3c20', skin: SKIN.light, shirt: '#f4f4f4', pants: '#f4f4f4', hat: '#f4f4f4', band: '#f4f4f4', hatType: 'nurse', long: 1 },
    clerk:     { hair: '#3c2818', skin: SKIN.medium, shirt: '#7cb0d8', pants: '#384858', band: '#f4f4f4', apron: 1 },
    sailor:    { hair: '#c05a20', skin: SKIN.tan, shirt: '#e8e8e8', pants: '#2a3a6a', hat: '#f4f4f4', band: '#203870', hatType: 'cap' },
    captain:   { hair: '#404040', skin: SKIN.dark, shirt: '#2c3e6c', pants: '#e0e0e0', hat: '#181820', band: '#e8b020', hatType: 'cap' },
    lass:      { hair: '#c04838', skin: SKIN.light, shirt: '#f8c0d0', pants: '#f8c0d0', acc: '#a060c8', long: 1, skirt: 1 },
    youngster: { hair: '#3c2818', skin: SKIN.light, shirt: '#e0c040', pants: '#3c4870', hat: '#48a048', band: '#f4f4f4', hatType: 'cap' },
    fisher:    { hair: '#5a4028', skin: SKIN.tan, shirt: '#58a0a0', pants: '#6a5030', hat: '#e8c878', band: '#a06030', hatType: 'straw' },
    hiker:     { hair: '#5a3a20', skin: SKIN.medium, shirt: '#58884a', pants: '#806040', acc: '#a05830', beard: 1, pack: 1 },
    swimmer:   { hair: '#2a2a40', skin: SKIN.tan, shirt: '#e0a878', pants: '#2868c8', hat: '#3858c0', hatType: 'swim' },
    bugkid:    { hair: '#302018', skin: SKIN.light, shirt: '#70b848', pants: '#806040', net: 1 },
    oldman:    { hair: '#d8d8e0', skin: SKIN.dark, shirt: '#7878a0', pants: '#506070', cane: 1 },
    oldwoman:  { hair: '#d8d8e0', skin: SKIN.medium, shirt: '#a070b0', pants: '#604870', bun: 1 },
    girl:      { hair: '#e0b040', skin: SKIN.light, shirt: '#f080a0', pants: '#406080', long: 1 },
    boy:       { hair: '#c88030', skin: SKIN.light, shirt: '#e8d030', pants: '#3868a0' },
    man:       { hair: '#3a2818', skin: SKIN.light, shirt: '#4870c0', pants: '#404040' },
    woman:     { hair: '#6a3020', skin: SKIN.medium, shirt: '#58b8a0', pants: '#384858', long: 1 },
    leader:    { hair: '#2888a8', skin: SKIN.light, shirt: '#2870c8', pants: '#203858', acc: '#8040c0', long: 1, cape: 1 },
    gymguide:  { hair: '#5a3a20', skin: SKIN.light, shirt: '#f0f0f0', pants: '#284068', hat: '#3060b0', band: '#f4f4f4', hatType: 'cap' },
    scientist: { hair: '#806040', skin: SKIN.light, shirt: '#e0e8f0', pants: '#404858', band: '#f4f4f8', coat: 1, glasses: 1 },
  };
  const NAMES = ['player', 'rival', 'prof', 'mom', 'nurse', 'clerk', 'sailor', 'captain', 'lass', 'youngster', 'fisher',
    'hiker', 'swimmer', 'bugkid', 'oldman', 'oldwoman', 'girl', 'boy', 'man', 'woman', 'leader', 'gymguide', 'scientist'];
  const specOf = (name) => SPEC[name] || SPEC.man;
  const keyOf = (name) => (SPEC[name] ? name : 'man');

  // ---------- overworld templates (16x20). Rows 0-9 head, 10-14 body, 15-19 legs. Letters are palette roles. ----------
  const HEAD = {
    down: [
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '...OHHHHHHHHO...',
      '...OHHSSSSHHO...',
      '...OHSESSESHO...',
      '...OHSSSSSSHO...',
      '...OSSSSSSSSO...',
      '....OsSSSSsO....',
      '.....OOOOOO.....',
    ],
    up: [
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '...OHhHHHHhHO...',
      '...OHHHHHHHHO...',
      '...OHHHHHHHHO...',
      '...OHHhHHhHHO...',
      '...OHHHHHHHHO...',
      '....OHHHHHHO....',
      '.....OOOOOO.....',
    ],
    left: [
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '...OHHHHHHHHO...',
      '...OHHSSSSHHO...',
      '...OSESSSSHHO...',
      '...OSSSSSSHHO...',
      '...OSSSSSSSHO...',
      '....OsSSSSsO....',
      '.....OOOOOO.....',
    ],
  };
  const BODY = [
    '..OOWWWWWWWWOO..',
    '..OwWWWWWWWWwO..',
    '..OwWWWWWWWWwO..',
    '..OSWWWWWWWWSO..',
    '...OQQQQQQQQO...',
  ];
  // legs per frame (0 stand, 1 step left, 2 step right); 'left' is the profile view
  const LEGS = {
    down: [
      ['...OPPPOOPPPO...', '...OPPPOOPPPO...', '...OPPPOOPPPO...', '...OBBBOOBBBO...', '...OOOOOOOOOO...'],
      ['...OPPPOOPPPO...', '...OPPPOOPPPO...', '...OBBBOOPPPO...', '...OOOOOOBBBO...', '........OOOOO...'],
      ['...OPPPOOPPPO...', '...OPPPOOPPPO...', '...OPPPOOBBBO...', '...OBBBOOOOOO...', '...OOOOOO.......'],
    ],
    left: [
      ['....OPPPPPPO....', '....OPPPPPPO....', '....OPPpPPPO....', '...OBBBBBBBO....', '...OOOOOOOOO....'],
      ['....OPPPPPPO....', '....OPPPPPPO....', '...OBBBPPPPO....', '....OOOOBBBO....', '........OOOO....'],
      ['....OPPPPPPO....', '....OPPPPPPO....', '....OPPPBBBO....', '...OBBBBOOOO....', '...OOOO.........'],
    ],
  };

  // Palette for a character. Roles: O outline, E eyes, H hair, S skin, W shirt, P pants, K hat, L band or
  // coat, X accent, N brown, M metal, R red, B shoes, Q belt; lower-case = shade.
  function palette(sp) {
    const hat = sp.hat || '#f4f4f4', band = sp.band || '#f4f4f4', acc = sp.acc || '#808080';
    return {
      O: OUT, E: EYE, B: SHOE, Q: BELT, M: METAL, N: BROWN, R: '#e03838',
      H: sp.hair, h: shade(sp.hair, 0.7), S: sp.skin, s: shade(sp.skin, 0.82),
      W: sp.shirt, w: shade(sp.shirt, 0.8), P: sp.pants, p: shade(sp.pants, 0.8),
      K: hat, k: shade(hat, 0.75), L: band, l: shade(band, 0.8), X: acc, x: shade(acc, 0.75),
    };
  }

  // Build the 16x20 role grid for a character, direction ('up' | 'down' | 'left') and frame.
  function compose(sp, v, frame) {
    const ld = v === 'up' ? 'down' : v;
    const rows = HEAD[v].concat(BODY, LEGS[ld][frame]).map((r) => r.split(''));
    const put = (y, s) => { for (let x = 0; x < 16; x++) if (s[x] !== '.') rows[y][x] = s[x]; };
    const remap = (y0, y1, map) => { for (let y = y0; y <= y1; y++) rows[y] = rows[y].map((c) => map[c] || c); };
    const col = (c, y0, y1, ch) => { for (let y = y0; y <= y1; y++) rows[y][c] = ch; };

    // body recolour
    if (sp.coat) { remap(10, 14, { W: 'L', w: 'l', Q: 'L' }); remap(15, 16, { P: 'L', p: 'l' }); }
    if (sp.scarf) remap(10, 11, { W: 'X', w: 'x', O: 'X' });
    if (sp.cape) {
      if (v === 'up') remap(10, 14, { W: 'X', w: 'x', O: 'x' });
      else if (v === 'left') col(13, 10, 14, 'X');
      else { col(2, 10, 14, 'X'); col(13, 10, 14, 'X'); }
    }
    if (sp.pack) {
      if (v === 'up') remap(10, 14, { W: 'X', w: 'x', O: 'x' });
      else if (v === 'left') col(13, 10, 13, 'X');
    }
    if (sp.skirt) remap(14, 17, { P: 'X', p: 'x', Q: 'X' });
    if (sp.apron && v !== 'up') for (let y = 12; y <= 16; y++) put(y, '.....LLLLLL.....');

    // hair
    if (sp.long) {
      if (v === 'left') { for (let y = 7; y <= 9; y++) { rows[y][12] = 'H'; rows[y][13] = 'H'; } }
      else { put(8, '..HH........HH..'); put(9, '..HH........HH..'); }
    }
    if (sp.spiky) put(0, '...H.H.H.H.H....');
    if (sp.bun) put(0, '.....OHHHHO.....');

    // hats
    if (sp.hatType === 'cap') {
      put(1, '....OKKKKKKO....');
      put(2, '...OKKKKKKKKO...');
      if (v === 'up') {
        put(3, '...OLLLLLLLLO...');
        for (let y = 4; y <= 7; y++) put(y, '...OKKKKKKKKO...');
        put(8, '....OKKKKKKO....');
      } else {
        put(3, '...OLLLLLLLLO...');
        put(4, '..OkkkkkkkkkkO..');
      }
    } else if (sp.hatType === 'swim') {
      put(1, '....OKKKKKKO....');
      put(2, '...OKKKKKKKKO...');
      put(3, '...OKKKKKKKKO...');
      put(4, '...OKKKKKKKKO...');
    } else if (sp.hatType === 'straw') {
      put(1, '....OKKKKKKO....');
      put(2, '...OKKKKKKKKO...');
      put(3, '.OKKKKKKKKKKKKO.');
    } else if (sp.hatType === 'nurse') {
      put(1, '.....OKKKKO.....');
      put(2, '....OKKRRKKO....');
    }

    // props and face details
    if (sp.beard && v !== 'up') { put(8, '....OHHHHHHO....'); put(9, '.....OHHHHO.....'); }
    if (sp.cane) {
      if (v === 'left') for (let y = 13; y <= 19; y++) put(y, '.N..............');
      else for (let y = 13; y <= 19; y++) put(y, '..............N.');
    }
    if (sp.net) {
      if (v === 'left') {
        put(0, 'MMMM............'); put(1, 'MMMM............'); put(2, 'MMN.............');
        for (let y = 3; y <= 19; y++) put(y, '.N..............');
      } else {
        put(0, '.............MMM'); put(1, '............MMMM'); put(2, '............MMN.');
        for (let y = 3; y <= 19; y++) put(y, '..............N.');
      }
    }
    return rows;
  }

  const spriteCache = {};
  // 16x20 canvas for name, direction 'up' | 'down' | 'left' (right is mirrored by draw) and frame 0..2
  function sprite(name, v, frame) {
    const k = keyOf(name) + '|' + v + '|' + frame;
    if (spriteCache[k]) return spriteCache[k];
    const sp = specOf(name);
    const pal = palette(sp);
    const rows = compose(sp, v, frame);
    return (spriteCache[k] = makeCanvas(16, 20, (c, g) => {
      for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) {
        const ch = rows[y][x];
        if (ch !== '.') { g.fillStyle = pal[ch] || '#ff00ff'; g.fillRect(x, y, 1, 1); }
      }
    }));
  }

  // ---------- battle portraits: 64x64, painted natively in a 3/4 view ----------
  // A portrait is a stack of shape layers painted back to front, then shaded and outlined. Materials are letters:
  // an upper-case letter is a shaded material (light from the upper left: its top and left edges take the highlight
  // tone, its bottom and right edges the shadow tone); a lower-case letter is an explicit shadow of that material;
  // PSOLID letters keep their colour (eyes, glints, metal, gold). Faces and small props are pixel-string stamps, and
  // shapes come from the S helpers. A dark outline tinted from the touching material is added last.
  const PSOLID = { D: '#181820', '@': '#ffffff', R: '#d83838', G: '#f0b828', M: '#c8d0d8', Z: '#3a2418', Y: '#f0a0a0' };
  const TORSO = [[21, 40], [43, 40], [49, 44], [51, 52], [53, 64], [11, 64], [13, 52], [15, 44]];
  const ARM_L = [[17, 44], [10, 50], [14, 57]];
  const ARM_R = [[47, 44], [54, 50], [50, 57]];
  const PEYE = ['@D', 'DD', 'DD'];
  const BROW = ['ZZZ'];
  const MOUTH = {
    neutral: [['DD'], 32, 30],
    smile: [['D..D', '.DD.'], 32, 29],
    grin: [['DDDDD', 'D@@@D', '.DDD.'], 31, 29],
    frown: [['.DD.', 'D..D'], 32, 29],
    shout: [['.DD.', 'DRRD', '.DD.'], 32, 28],
  };

  const mixHex = (hex, t, to = 255) => {
    const n = parseInt(hex.slice(1), 16);
    return '#' + [16, 8, 0].map((s) => {
      const c = (n >> s) & 255;
      return Math.round(c + (to - c) * t).toString(16).padStart(2, '0');
    }).join('');
  };

  const S = {
    ell: (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1,
    box: (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1,
    seg: (x0, y0, x1, y1, w) => (x, y) => {
      const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L));
      return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) <= w / 2;
    },
    poly: (pts) => (x, y) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    },
    ring: (cx, cy, r0, r1) => (x, y) => { const d = Math.hypot(x - cx, y - cy); return d <= r1 && d >= r0; },
  };

  function painter() {
    const G = [];
    for (let y = 0; y < 64; y++) G.push(new Array(64).fill('.'));
    const paint = (m, pred) => {
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (pred(x, y)) G[y][x] = m;
    };
    const stamp = (x0, y0, rows) => rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const x = x0 + i, y = y0 + j;
        if (r[i] !== '.' && x >= 0 && x < 64 && y >= 0 && y < 64) G[y][x] = r[i];
      }
    });
    return { G, paint, stamp };
  }

  // Letters to colours: highlight, base and shadow per shaded material, then the dark outline. 'i' and 'j' are
  // the hair-strand and cloth highlights (pal.HR, pal.HL); lower case is the shadow of its upper-case material.
  function resolvePortrait(G, pal) {
    const body = (c) => c !== '.' && !PSOLID[c];
    const norm = (c) => (c === 'i' ? 'H' : c === 'j' ? 'W' : c.toUpperCase());
    const at = (x, y) => (x < 0 || y < 0 || x > 63 || y > 63 ? '.' : G[y][x]);
    const sh = (F) => shade(pal[F], F === 'K' ? 0.74 : 0.7);
    const hi = (F) => mixHex(pal[F], F === 'K' ? 0.2 : 0.3);
    const out = [];
    for (let y = 0; y < 64; y++) {
      const row = new Array(64).fill(null);
      for (let x = 0; x < 64; x++) {
        const c = G[y][x];
        if (c === '.') {
          const n = [at(x, y + 1), at(x + 1, y), at(x, y - 1), at(x - 1, y)].find(body);
          if (n) row[x] = shade(pal[norm(n)], 0.4);
        } else if (PSOLID[c]) {
          row[x] = PSOLID[c];
        } else if (c === 'i') {
          row[x] = pal.HR;
        } else if (c === 'j') {
          row[x] = pal.HL;
        } else {
          const F = c.toUpperCase();
          const diff = (n) => n === '.' || (body(n) && norm(n) !== F);
          if (c !== F) row[x] = sh(F);
          else if (diff(at(x, y - 1)) || diff(at(x - 1, y))) row[x] = hi(F);
          else if (diff(at(x + 1, y)) || diff(at(x, y + 1))) row[x] = sh(F);
          else row[x] = pal[F];
        }
      }
      out.push(row);
    }
    return out;
  }

  function drawRows(rows) {
    return makeCanvas(64, 64, (c, g) => {
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        if (rows[y][x]) { g.fillStyle = rows[y][x]; g.fillRect(x, y, 1, 1); }
      }
    });
  }

  // Palette for a portrait: defaults come from the character's spec, `over` replaces single materials.
  function ppal(sp, over) {
    const p = Object.assign({
      K: sp.skin, H: sp.hair, W: sp.shirt, V: sp.shirt, P: sp.pants, C: sp.hat || '#f4f4f4', T: sp.band || '#f4f4f4',
      A: sp.acc || '#c04848', J: '#f4f4f8', U: '#2a3a5a', N: '#8a5a30', B: '#806040', Q: '#3a2820',
    }, over || {});
    p.HR = mixHex(p.H, 0.45);
    p.HL = mixHex(p.W, 0.4);
    return p;
  }

  // Neck and the band of shadow under the chin.
  function neck(a) {
    a.paint('K', S.box(28, 33, 36, 41));
    a.paint('k', S.box(28, 36, 36, 39));
  }

  // Hand: a small rounded palm with a thumb, at (x, y).
  function hand(a, x, y, m) {
    a.paint(m || 'K', S.ell(x, y, 2.4, 2.7));
    a.paint(m || 'K', S.seg(x + 1, y - 1, x + 2.6, y - 3.4, 1.8));
  }

  // Arm from shoulder through the elbow to the hand. Segments before `cuff` are sleeve (material `sleeve`), the rest
  // bare forearm (`hand` material). A small hand with a thumb ends the arm.
  function arm(a, pts, sleeve, skin, cuff) {
    const c = cuff === undefined ? pts.length - 2 : cuff;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      a.paint(i < c ? sleeve : skin || 'K', S.seg(x0, y0, x1, y1, i < c ? 7 : 5));
    }
    const [hx, hy] = pts[pts.length - 1];
    hand(a, hx, hy, skin || 'K');
  }

  // Torso: material m with a far-side shadow, two cloth folds, a near-shoulder highlight and a belt line.
  function torso(a, m, pts, belt) {
    const inT = S.poly(pts || TORSO);
    const f = m.toLowerCase();
    a.paint(m, inT);
    a.paint(f, (x, y) => inT(x, y) && x >= 38 && y >= 42);
    a.paint(f, S.seg(29, 50, 27, 57, 1));
    a.paint(f, S.seg(37, 51, 40, 58, 1));
    a.paint('j', (x, y) => inT(x, y) && y >= 41 && y <= 43 && x <= 30);
    if (belt !== false) {
      a.paint('Q', (x, y) => inT(x, y) && (y === 56 || y === 57));
      a.paint('G', S.box(31, 56, 33, 57));
    }
  }

  // Head centred at (32, 24). o: hair ('short' | 'long' | 'spiky' | 'bun' | 'none'), hl (hairline y, or fn of x),
  // expr (MOUTH key), brow [left, right] raise, glasses, beard, blush, back (no face: seen from behind).
  function head(a, o) {
    const hd = S.ell(32, 24, 10.5, 11.5);
    const hl = typeof o.hl === 'function' ? o.hl : () => (o.hl === undefined ? 18 : o.hl);
    const hair = o.hair || 'short';
    a.paint('K', hd);
    a.paint('k', (x, y) => hd(x, y) && x >= 38);
    a.paint('K', S.ell(21.5, 26, 1.8, 2.8));
    if (hair !== 'none' && !o.back) {
      a.paint('H', (x, y) => S.ell(32, 24, 11.3, 12.4)(x, y) && y < hl(x));
      if (hair === 'long') { a.paint('H', S.box(20, 20, 22, 36)); a.paint('H', S.box(42, 20, 44, 36)); }
      if (hair === 'bun') a.paint('H', S.ell(32, 8, 4.5, 4));
      a.paint('i', S.seg(25, 16, 28, 14, 1));
      a.paint('i', S.seg(31, 15, 35, 14, 1));
      a.paint('i', S.seg(37, 17, 39, 15.5, 1));
    }
    if (o.back) {
      a.paint('H', S.ell(32, 24, 11.3, 12.4));
      a.paint('K', S.ell(41.5, 27, 1.8, 2.8));
      return;
    }
    a.paint('k', (x, y) => hd(x, y) && y >= hl(x) && y < hl(x) + 1);
    if (o.beard) a.paint('H', (x, y) => (hd(x, y) && y >= 28) || (y >= 33 && y <= 37 && x >= 26 && x <= 38));
    a.stamp(25, 22, PEYE);
    a.stamp(35, 22, PEYE);
    const br = o.brow || [0, 0];
    a.stamp(25, 19 + br[0], BROW);
    a.stamp(35, 19 + br[1], BROW);
    a.paint('k', S.box(33, 25, 33, 27));
    if (o.blush) { a.stamp(27, 27, ['YY']); a.stamp(37, 27, ['YY']); }
    if (o.glasses) {
      a.paint('M', (x, y) => S.box(23, 20, 28, 25)(x, y) && !S.box(24, 21, 27, 24)(x, y));
      a.paint('M', (x, y) => S.box(33, 20, 38, 25)(x, y) && !S.box(34, 21, 37, 24)(x, y));
      a.paint('M', S.box(28, 21, 33, 21));
    }
    const m = MOUTH[o.expr || 'smile'];
    a.stamp(m[1], m[2], m[0]);
  }

  // Peaked cap: dome, band, brim. o.band: material of the band; o.brim: material of the brim.
  function cap(a, o) {
    const dome = (x, y) => S.ell(32, 24, 11.6, 12.6)(x, y) && y < 17;
    a.paint('C', dome);
    a.paint(o.band || 'T', (x, y) => dome(x, y) && y >= 15);
    if (o.brim !== 'none') a.paint(o.brim || 'C', S.box(19, 17, 45, 18));
  }

  function straw(a) {
    a.paint('C', (x, y) => S.ell(32, 13, 11, 7)(x, y) && y < 16);
    a.paint('T', (x, y) => S.ell(32, 13, 11, 7)(x, y) && y >= 14 && y < 16);
    a.paint('C', S.ell(32, 16.5, 19, 3.2));
  }

  function swimcap(a) {
    a.paint('C', (x, y) => S.ell(32, 24, 11.4, 12.2)(x, y) && y < 19.5);
    a.paint('C', S.box(21, 19, 22, 22));
    a.paint('C', S.box(42, 19, 43, 22));
    a.paint('M', S.box(21, 18, 43, 18));
    a.paint('A', S.ell(27, 18, 2.2, 1.6));
    a.paint('A', S.ell(37, 18, 2.2, 1.6));
    a.stamp(26, 17, ['@']);
    a.stamp(36, 17, ['@']);
  }

  // Generic adult from the character spec, used for everyone without a bespoke portrait.
  function genericDesign(sp) {
    return {
      pal: () => ppal(sp),
      build: (a) => {
        if (sp.long) a.paint('H', S.poly([[19, 20], [45, 20], [48, 50], [16, 50]]));
        if (sp.cape) a.paint('A', S.poly([[6, 36], [58, 36], [62, 64], [2, 64]]));
        if (sp.pack) a.paint('B', S.poly([[12, 38], [52, 38], [54, 50], [10, 50]]));
        neck(a);
        torso(a, sp.coat ? 'J' : 'W');
        if (sp.coat) a.paint('W', S.poly([[27, 39], [37, 39], [32, 47]]));
        if (sp.apron) a.paint('J', S.poly([[22, 52], [42, 52], [45, 64], [19, 64]]));
        arm(a, ARM_L, 'V', 'K');
        if (sp.cane) {
          arm(a, [[47, 44], [52, 52], [52, 58]], 'V', 'K');
          a.paint('N', S.seg(52, 56, 53, 64, 2));
        } else {
          arm(a, ARM_R, 'V', 'K');
        }
        head(a, {
          hair: sp.bun ? 'bun' : sp.long ? 'long' : 'short', hl: sp.long ? 17 : 18, glasses: sp.glasses,
          beard: sp.beard, expr: 'smile',
        });
        if (sp.hatType === 'cap') cap(a, { band: 'T' });
        else if (sp.hatType === 'nurse') { cap(a, { band: 'T' }); a.stamp(31, 11, ['.R.', 'RRR', '.R.']); }
        else if (sp.hatType === 'straw') straw(a);
        else if (sp.hatType === 'swim') swimcap(a);
      },
    };
  }

  // Bespoke portraits. Each build paints back to front: hair behind, torso, arms, props, head, hats.
  const DESIGN = {
    player: {
      pal: (sp) => ppal(sp, { W: '#f0f0f0', V: '#dcdce8', B: '#3868c8', K: sp.skin }),
      build: (a) => {
        neck(a);
        torso(a, 'B');
        a.paint('W', S.poly([[22, 39], [42, 39], [40, 44], [24, 44]]));
        a.paint('V', S.seg(22, 42, 21, 63, 2.4));
        a.paint('V', S.seg(42, 42, 43, 63, 2.4));
        arm(a, [[15, 46], [12, 54], [13, 59]], 'W', 'K');
        arm(a, [[49, 46], [52, 54], [51, 59]], 'W', 'K');
        head(a, { back: true });
        cap(a, { band: 'T', brim: 'none' });
      },
    },
    rival: {
      pal: (sp) => ppal(sp, { H: '#3a6ad8', W: '#e8e8f0', V: '#d4d4e0', J: '#e8e8f0', A: '#d83838' }),
      build: (a) => {
        neck(a);
        torso(a, 'J');
        a.paint('A', S.poly([[27, 39], [37, 39], [32, 50]]));
        arm(a, [[17, 44], [11, 50], [18, 56]], 'V', 'K');
        arm(a, [[47, 44], [53, 40], [55, 34]], 'V', 'K');
        a.paint('K', S.seg(55, 33, 56, 27, 3));
        head(a, { hair: 'spiky', hl: 17, expr: 'grin', brow: [0, -1] });
        a.paint('H', S.poly([[20, 18], [22, 6], [27, 15]]));
        a.paint('H', S.poly([[26, 14], [29, 3], [33, 13]]));
        a.paint('H', S.poly([[32, 13], [37, 4], [39, 14]]));
        a.paint('H', S.poly([[37, 15], [43, 8], [44, 19]]));
      },
    },
    prof: {
      pal: (sp) => ppal(sp, { H: '#d8d8e0', J: '#f4f4f8', V: '#e4e4ec', W: '#4a5878', N: '#8a5a30' }),
      build: (a) => {
        a.paint('H', S.poly([[19, 20], [45, 20], [48, 52], [16, 52]]));
        neck(a);
        torso(a, 'J');
        a.paint('W', S.poly([[27, 39], [37, 39], [32, 48]]));
        a.paint('N', S.box(16, 46, 27, 62));
        a.paint('@', S.box(17, 47, 26, 61));
        a.paint('Z', (x, y) => x >= 19 && x <= 24 && (y === 50 || y === 53 || y === 56 || y === 59));
        arm(a, ARM_R, 'V', 'K');
        arm(a, [[17, 44], [14, 50], [20, 53]], 'V', 'K');
        head(a, { hair: 'short', hl: 17, expr: 'smile', glasses: true });
      },
    },
    lass: {
      pal: (sp) => ppal(sp, { H: '#c04838', W: '#f8c0d0', V: '#f0a8c0', J: '#f8c0d0', A: '#a060c8' }),
      build: (a) => {
        a.paint('H', S.poly([[19, 20], [45, 20], [47, 52], [17, 52]]));
        neck(a);
        torso(a, 'W');
        a.paint('A', S.poly([[27, 39], [37, 39], [32, 45]]));
        arm(a, ARM_L, 'V', 'K');
        arm(a, [[47, 44], [53, 36], [56, 28]], 'V', 'K');
        head(a, { hair: 'long', hl: 17, expr: 'smile', blush: true });
        a.paint('A', S.ell(41, 13, 2.6, 2.2));
        a.paint('A', S.ell(46, 13, 2.6, 2.2));
      },
    },
    youngster: {
      pal: (sp) => ppal(sp, { W: '#e0c040', V: '#e8d060', C: '#48a048', H: '#3c2818', T: '#f4f4f4' }),
      build: (a) => {
        neck(a);
        torso(a, 'W');
        a.paint('T', S.poly([[28, 39], [36, 39], [32, 44]]));
        arm(a, ARM_L, 'V', 'K');
        arm(a, [[47, 44], [48, 36], [44, 27]], 'V', 'K');
        head(a, { hair: 'short', hl: 18, expr: 'smile', brow: [0, -1] });
        cap(a, { band: 'T', brim: 'C' });
      },
    },
    fisher: {
      pal: (sp) => ppal(sp, { H: '#5a4028', W: '#58a0a0', V: '#58a0a0', C: '#e8c878', T: '#a06030', N: '#8a5a30' }),
      build: (a) => {
        neck(a);
        torso(a, 'W');
        a.paint('K', S.poly([[28, 39], [36, 39], [32, 46]]));
        a.paint('N', S.seg(46, 40, 60, 4, 2));
        a.paint('M', S.seg(60, 4, 63, 26, 1));
        arm(a, ARM_L, 'V', 'K');
        arm(a, [[47, 44], [50, 39], [47, 36]], 'V', 'K');
        head(a, { hair: 'short', hl: 18, expr: 'smile' });
        straw(a);
      },
    },
    hiker: {
      pal: (sp) => ppal(sp, { K: sp.skin, H: '#5a3a20', W: '#58884a', V: '#58884a', B: '#a07048', U: '#3a2a1a', N: '#8a5a30' }),
      build: (a) => {
        a.paint('B', S.poly([[10, 42], [15, 34], [49, 34], [54, 42], [55, 52], [9, 52]]));
        neck(a);
        torso(a, 'W');
        a.paint('U', S.seg(22, 40, 21, 63, 2));
        a.paint('U', S.seg(42, 40, 43, 63, 2));
        a.paint('N', S.seg(7, 38, 7, 63, 2));
        arm(a, [[17, 44], [11, 50], [10, 56]], 'V', 'K');
        arm(a, ARM_R, 'V', 'K');
        head(a, { hair: 'short', hl: 18, expr: 'neutral', beard: true });
      },
    },
    swimmer: {
      pal: (sp) => ppal(sp, { K: sp.skin, V: sp.skin, H: '#2a2a40', C: '#3858c0', A: '#3868c8', J: '#f0f0f0', W: '#e8b890' }),
      build: (a) => {
        neck(a);
        torso(a, 'K', TORSO, false);
        torso(a, 'A', [[24, 40], [40, 40], [43, 46], [44, 64], [20, 64], [21, 46]], false);
        a.paint('K', S.seg(24, 40, 22, 46, 1.4));
        a.paint('K', S.seg(40, 40, 42, 46, 1.4));
        a.paint('J', S.poly([[13, 42], [22, 40], [24, 50], [18, 62], [12, 56]]));
        a.paint('j', S.seg(15, 44, 20, 48, 1));
        arm(a, ARM_L, 'V', 'K');
        arm(a, [[47, 44], [54, 40], [53, 32]], 'V', 'K');
        head(a, { hair: 'none', hl: 19, expr: 'grin' });
        swimcap(a);
      },
    },
    bugkid: {
      pal: (sp) => ppal(sp, { K: sp.skin, H: '#302018', W: '#70b848', V: '#70b848', J: '#f0f0f0', N: '#8a5a30' }),
      build: (a) => {
        neck(a);
        torso(a, 'W');
        a.paint('J', S.poly([[27, 39], [37, 39], [32, 45]]));
        a.paint('N', S.seg(46, 42, 57, 6, 2));
        a.paint('J', (x, y) => S.ring(59, 6, 0, 5.2)(x, y) && (x + y) % 2 === 0);
        a.paint('M', S.ring(59, 6, 5.2, 6.8));
        arm(a, ARM_L, 'V', 'K');
        arm(a, [[47, 44], [50, 38], [48, 34]], 'V', 'K');
        head(a, { hair: 'short', hl: 16, expr: 'grin' });
      },
    },
    sailor: {
      pal: (sp) => ppal(sp, { K: sp.skin, H: '#c05a20', W: '#e8e8e8', V: '#e8e8e8', U: '#203870', C: '#f4f4f4', T: '#203870', A: '#c04848' }),
      build: (a) => {
        neck(a);
        torso(a, 'W');
        a.paint('U', (x, y) => S.poly(TORSO)(x, y) && y >= 46 && y % 4 === 2);
        a.paint('A', S.poly([[27, 39], [37, 39], [32, 46]]));
        arm(a, [[17, 44], [15, 50], [19, 57]], 'V', 'K');
        a.paint('N', S.ring(15, 50, 2.6, 4.4));
        a.paint('K', S.ell(19, 57, 2.8, 2.8));
        arm(a, ARM_R, 'V', 'K');
        head(a, { hair: 'short', hl: 18, expr: 'grin' });
        cap(a, { band: 'T', brim: 'C' });
      },
    },
    leader: {
      pal: (sp) => ppal(sp, { K: sp.skin, H: '#2888a8', W: '#2870c8', V: '#2870c8', A: '#8040c0', J: '#f4f4f8' }),
      build: (a) => {
        a.paint('A', S.poly([[6, 36], [58, 36], [63, 64], [1, 64]]));
        a.paint('H', S.poly([[19, 20], [45, 20], [47, 50], [17, 50]]));
        neck(a);
        torso(a, 'W');
        a.paint('J', S.poly([[27, 39], [37, 39], [32, 48]]));
        a.paint('G', S.ell(32, 44, 1.6, 1.6));
        arm(a, ARM_L, 'V', 'K');
        arm(a, [[47, 44], [54, 46], [60, 42]], 'V', 'K');
        a.paint('K', S.seg(60, 41, 64, 37, 2));
        head(a, { hair: 'long', hl: 17, expr: 'smile', brow: [0, -1] });
        a.paint('G', S.box(26, 16, 38, 16));
      },
    },
    captain: {
      pal: (sp) => ppal(sp, { K: '#8a5030', H: '#404040', W: '#f4f4f8', V: '#2a3c66', U: '#1e2e50', J: '#f4f4f8', C: '#181820' }),
      build: (a) => {
        neck(a);
        torso(a, 'U');
        a.paint('J', S.poly([[22, 39], [30, 39], [30, 50], [24, 46]]));
        a.paint('J', S.poly([[42, 39], [34, 39], [34, 50], [40, 46]]));
        a.paint('J', S.poly([[27, 39], [37, 39], [32, 48]]));
        a.paint('G', S.box(32, 54, 32, 54));
        a.paint('G', S.box(32, 59, 32, 59));
        arm(a, [[17, 44], [15, 50], [30, 53]], 'V', 'K');
        arm(a, [[47, 44], [49, 50], [34, 54]], 'V', 'K');
        head(a, { hair: 'none', hl: 18, expr: 'neutral' });
        cap(a, { band: 'G', brim: 'C' });
        a.stamp(31, 12, ['.G.', 'GGG', '.G.']);
      },
    },
  };

  function portraitDesign(k, sp) { return DESIGN[k] || genericDesign(sp); }

  const pcache = {};
  // 64x64 battle portrait: a 3/4 bust with a pose, transparent background
  function portrait(name) {
    const k = keyOf(name);
    if (pcache[k]) return pcache[k];
    const sp = specOf(name);
    const d = portraitDesign(k, sp);
    const a = painter();
    const pal = d.pal(sp);
    d.build(a);
    return (pcache[k] = drawRows(resolvePortrait(a.G, pal)));
  }

  // Overworld sprite. (x, y) is the top-left of the tile; the sprite is drawn 4px up so the feet sit on the tile bottom.
  // dir: up | down | left | right (right is the left sprite mirrored); frame: 0 stand, 1 step left, 2 step right.
  function draw(g, name, x, y, dir = 'down', frame = 0) {
    const f = frame === 1 || frame === 2 ? frame : 0;
    const v = dir === 'up' ? 'up' : dir === 'left' || dir === 'right' ? 'left' : 'down';
    const c = sprite(name, v, f);
    g.imageSmoothingEnabled = false;
    if (dir === 'right') {
      g.save();
      g.translate(x + 16, y - 4);
      g.scale(-1, 1);
      g.drawImage(c, 0, 0);
      g.restore();
    } else {
      g.drawImage(c, x, y - 4);
    }
  }

  // Dark ellipse-ish shadow under the feet of the tile at (x, y), for ledge hops and similar.
  function shadow(g, x, y) {
    g.fillStyle = 'rgba(20,30,40,0.22)';
    g.fillRect(x + 5, y + 13, 6, 1);
    g.fillStyle = 'rgba(20,30,40,0.3)';
    g.fillRect(x + 3, y + 14, 10, 1);
    g.fillStyle = 'rgba(20,30,40,0.22)';
    g.fillRect(x + 5, y + 15, 6, 1);
  }

  // All overworld frames on one canvas: rows down, up, left, right; columns stand, step L, step R.
  function sheet(name) {
    const dirs = ['down', 'up', 'left', 'right'];
    return makeCanvas(48, 80, (c, g) => {
      dirs.forEach((d, r) => {
        for (let f = 0; f < 3; f++) draw(g, name, f * 16, r * 20 + 4, d, f);
      });
    });
  }

  return { draw, shadow, portrait, sheet, names: NAMES.slice() };
})();
