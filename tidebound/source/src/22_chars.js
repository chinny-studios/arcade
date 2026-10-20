// Tidebound: characters. Overworld sprites (16x20, 4 directions x 3 frames) and battle portraits (64x64).
// Overworld: one pixel-string body per direction (head, shirt, legs) shared by everyone; each character recolours
// it through a palette and adds small row patches for hair, hats and props. Portraits: a bust painted per pixel
// from shape tests at 32x32 and scaled x2. Everything is built lazily and cached.
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
    captain:   { hair: '#404040', skin: SKIN.dark, shirt: '#2c3e6c', pants: '#e0e0e0', hat: '#203870', band: '#e8b020', hatType: 'cap' },
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

  // ---------- portraits (64x64 from a 32x32 grid) ----------
  // Shape tests use pixel centres (x + 0.5, y + 0.5). Layers are painted back to front, then an outline is added.
  function bust(sp) {
    const G = [];
    for (let y = 0; y < 32; y++) G.push(new Array(32).fill('.'));
    const put = (ch, pred) => {
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (pred(x + 0.5, y + 0.5)) G[y][x] = ch;
    };
    const dx = (x) => Math.abs(x - 16);
    const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
    const inHead = (x, y) => ((x - 16) / 7.6) ** 2 + ((y - 13.5) / 8.6) ** 2 <= 1;
    const torso = (x, y) => y >= 21 && y < 33 && dx(x) <= Math.min(10.5, 5 + (y - 21) * 1.5);
    const hairTop = (x, y) => inHead(x, y) && y < 9.3 - 0.07 * dx(x) * dx(x);
    const tip = (x) => 1 + 2 * Math.abs(((Math.floor(x) - 8) % 4) - 2);

    // behind the body
    if (sp.cape) put('X', (x, y) => y >= 19 && y < 33 && dx(x) <= 12);
    if (sp.pack) put('X', (x, y) => y >= 21 && y < 33 && dx(x) <= 11);
    if (sp.long) put('H', (x, y) => y >= 9 && y < 27 && dx(x) >= 6.5 && dx(x) <= 9.5);
    if (sp.bun) put('H', (x, y) => (x - 16) ** 2 + (y - 3.5) ** 2 <= 9);

    // body
    put(sp.coat ? 'L' : 'W', torso);
    put(sp.coat ? 'l' : 'w', (x, y) => torso(x, y) && dx(x) >= 8);
    if (sp.coat) put('l', (x, y) => torso(x, y) && y >= 23 && dx(x) < 0.9);
    put('S', (x, y) => y >= 20 && y < 24 && dx(x) <= 3);
    if (sp.scarf) put('X', (x, y) => y >= 21 && y < 24 && dx(x) <= 7.5);
    if (sp.pack && !sp.cape) put('x', (x, y) => y >= 30 && y < 33 && dx(x) <= 11 && dx(x) > 9);

    // head
    put('S', inHead);
    put('s', (x, y) => inHead(x, y) && y >= 17.5 && dx(x) >= 5.5);

    // hair (cap and hat types cover it below)
    put('H', hairTop);
    put('H', (x, y) => inHead(x, y) && dx(x) >= 6.6 && y < 13.5);
    if (sp.spiky) put('H', (x, y) => dx(x) <= 9 && y >= tip(x) && y < 9);
    if (sp.long) put('H', (x, y) => inHead(x, y) && y < 9.3 - 0.07 * dx(x) * dx(x) && dx(x) >= 6);

    // hats
    if (sp.hatType === 'cap') {
      put('K', (x, y) => inHead(x, y) && y < 7.2);
      put('L', (x, y) => inHead(x, y) && y >= 7.2 && y < 8.4);
      put('k', (x, y) => y >= 8.4 && y < 9.4 && dx(x) <= 9);
    } else if (sp.hatType === 'swim') {
      put('K', (x, y) => inHead(x, y) && y < 8.6);
    } else if (sp.hatType === 'straw') {
      put('K', (x, y) => y >= 2.8 && y < 7 && dx(x) <= 7.2);
      put('L', (x, y) => y >= 6 && y < 7 && dx(x) <= 7.2);
      put('K', (x, y) => y >= 7 && y < 8.2 && dx(x) <= 13);
      put('k', (x, y) => y >= 8.2 && y < 8.9 && dx(x) <= 12);
    } else if (sp.hatType === 'nurse') {
      put('K', (x, y) => inHead(x, y) && y < 6.4 && dx(x) <= 6);
      put('R', rect(15, 3, 17, 6));
      put('R', rect(14, 4, 18, 5));
    }

    // face
    if (sp.beard) {
      put('H', (x, y) => (inHead(x, y) && y >= 17.5 && dx(x) <= 5) || (y >= 20 && y < 23 && dx(x) <= 4.5));
    } else {
      put('s', rect(15, 18, 17, 19));
    }
    if (sp.glasses) {
      put('M', (x, y) => rect(10, 12, 14, 16)(x, y) && !rect(11, 13, 13, 15)(x, y));
      put('M', (x, y) => rect(18, 12, 22, 16)(x, y) && !rect(19, 13, 21, 15)(x, y));
    }
    put('E', rect(12, 13, 13, 15));
    put('E', rect(19, 13, 20, 15));

    // props
    if (sp.net) {
      put('N', (x, y) => y >= 9 && y < 31 && Math.abs(x - (25 - (y - 9) * 0.2)) < 0.6);
      put('M', (x, y) => { const d = Math.hypot(x - 27, y - 7); return d <= 3.6 && d >= 2.6; });
    }

    // outline: empty pixels touching the figure
    const out = G.map((r) => r.slice());
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (G[y][x] !== '.') continue;
      const n = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      if (n.some(([a, b]) => a >= 0 && a < 32 && b >= 0 && b < 32 && G[b][a] !== '.')) out[y][x] = 'O';
    }
    return out;
  }

  const pcache = {};
  // 64x64 battle portrait (front facing bust)
  function portrait(name) {
    const k = keyOf(name);
    if (pcache[k]) return pcache[k];
    const sp = specOf(name);
    const pal = palette(sp);
    const G = bust(sp);
    const small = makeCanvas(32, 32, (c, g) => {
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const ch = G[y][x];
        if (ch !== '.') { g.fillStyle = pal[ch] || '#ff00ff'; g.fillRect(x, y, 1, 1); }
      }
    });
    return (pcache[k] = makeCanvas(64, 64, (c, g) => { g.drawImage(small, 0, 0, 64, 64); }));
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
