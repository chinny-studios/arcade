// Signal Front — skirmish maps
// Each map is authored as its left half; the right half is the same half rotated 180°, with
// ownership swapped, so both sides start on equal ground. Width is twice the half width.
//   .  plains     %  forest     ^  mountain   =  road      #  bridge
//   -  river      ~  sea        :  shoal      *  reef
//   c  city   k  factory   a  airfield   p  port   t  relay tower   h  HQ
//   lowercase = neutral, UPPERCASE = Meridian-owned (mirrored copy goes to Drovic)

const MAPS = [
  { id: 'crossfire', name: 'Crossfire Flats', blurb: 'A small, open plain. Fast and brutal.',
    half: [
      '%%..c...',
      '%H===...',
      '.KA.=.%.',
      '..c.=..c',
      '.%..=...',
      '.C.%===k',
      '....%.=.',
      '.%c...=.',
      '..^...=.',
      'c.^^.%==',
      '...c....',
    ] },
  { id: 'twinrivers', name: 'Twin Rivers', blurb: 'Two rivers, a handful of bridges and relay towers on the high ground.',
    half: [
      '%..c...-..',
      '.H===..-.c',
      '.K..=..-..',
      '.KC.=..#==',
      '..%.=..-.=',
      'c...=c.-.=',
      '..t.=..-%=',
      '.%.%=..-.=',
      '..c.===#==',
      '.%^^...-.k',
      'A...c..-..',
      '..%....-.t',
      'c..%..c-..',
    ] },
  { id: 'saltmarsh', name: 'Saltmarsh Coast', blurb: 'A salt lake splits the front. Fight around it, or take the lake ports.',
    half: [
      '~~:..%...c.',
      '~:.H====...',
      '~:.K...=.%.',
      '~:.CA..====',
      '~~:..%..:~~',
      '~~:c....:~~',
      '~*:..k..:~~',
      '~~:.c...:~*',
      '~~:.....:~~',
      '~:..t...:~~',
      '~:.%..c.:~p',
      '~:..c..====',
      '~~:....=...',
      '~~:.%.c=.c.',
      '~~~::..%...',
    ] },
  { id: 'highland', name: 'Highland Relay', blurb: 'A long front across mountain passes. Everything is in play.',
    half: [
      '^^^%...c...%.',
      '^H====....c..',
      '^K..A=..%....',
      '.KC..=...c..t',
      '..%..====....',
      'c.%...%.=..^^',
      '..^^..c.=..^.',
      '.%^...%.=....',
      '..t...==#=k..',
      '.%..c.=.-...%',
      '..%...=.-..c.',
      '~:.c..=.-....',
      '~:...%=.-.%..',
      '~~:a..=.-....',
      '~~~:.c==#===.',
      '~p~:....-..c.',
      '~~~~:..%-....',
    ] },
];

const MAP_CHARS = { '.': 'plain', '%': 'forest', '^': 'mount', '=': 'road', '#': 'bridge', '-': 'river',
  '~': 'sea', ':': 'shoal', '*': 'reef', c: 'city', k: 'base', a: 'airport', p: 'port', t: 'tower', h: 'hq' };

function buildMap(def) {
  const H = def.half.length, hw = def.half[0].length, W = hw * 2;
  const tiles = new Array(W * H);
  for (let y = 0; y < H; y++) {
    if (def.half[y].length !== hw) console.warn('map row width', def.id, y);
    for (let x = 0; x < hw; x++) {
      const ch = def.half[y][x];
      const k = MAP_CHARS[ch.toLowerCase()] || 'plain';
      const owned = ch !== ch.toLowerCase();
      tiles[y * W + x] = { k, o: owned ? 0 : -1, cp: 20 };
      tiles[(H - 1 - y) * W + (W - 1 - x)] = { k, o: owned ? 1 : -1, cp: 20 };
    }
  }
  return { id: def.id, name: def.name, w: W, h: H, tiles };
}
