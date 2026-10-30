// Valor Bay — data: the five heroes, the villains, the gangs, the people of the city and what everyone shouts

// look: c1 main costume, c2 second colour, c3 trim / emblem, skin, eye (lens colour, 0 = no mask lenses)
// build: h height (m), bulk (shoulder and limb thickness), legs (fraction of height)
// cd: cooldowns in seconds; ult: hero meter needed for the ultimate (0..100)
const HEROES = {
  spindle: {
    name: 'Spindle', kind: 'Web-slinger', tag: 'Your friendly street-level wall-crawler.',
    blurb: 'Swings from the skyscrapers on silk lines, crawls up any wall and ties criminals up in webbing.',
    look: { c1: 0xd8202c, c2: 0x1c3ca8, c3: 0x101018, skin: 0xe0b090, eye: 0xf4f8ff, mask: true, pattern: 'web', emblem: 'spider' },
    build: { h: 1.8, bulk: 0.9, legs: 0.5 },
    stats: { strength: 3, speed: 4, range: 3, toughness: 2, mobility: 5 },
    hp: 120, walk: 5, run: 11, jump: 13, melee: 12, color: '#ff3a3a',
    travel: { name: 'Web Swing', desc: 'Hold to swing from the buildings; let go to fling yourself. Walk into a wall to crawl up it.' },
    rmb: { name: 'Web Shot', desc: 'Sticky silk: three hits webs a thug to the spot.', cd: 0.28 },
    q: { name: 'Web Yank', desc: 'Pull a target to you, or tear a gun out of their hand.', cd: 3 },
    e: { name: 'Web Bomb', desc: 'A burst of webbing that glues everyone nearby.', cd: 8 },
    r: { name: 'Web Storm', desc: 'Every crook within 30 m is wrapped up.', ult: 100 },
  },
  skylark: {
    name: 'Skylark', kind: 'Flier', tag: 'Faster than a jet, brighter than the sun.',
    blurb: 'Flies anywhere in the city and fires blasts of solar energy from her hands.',
    look: { c1: 0xf4f4f8, c2: 0x2a8cf0, c3: 0xffc020, skin: 0xc88a60, eye: 0, cape: 0x2a8cf0, hair: 0x2a1a10, emblem: 'star' },
    build: { h: 1.78, bulk: 0.95, legs: 0.52 },
    stats: { strength: 3, speed: 5, range: 5, toughness: 3, mobility: 5 },
    hp: 140, walk: 5, run: 10, jump: 12, melee: 14, color: '#4aa8ff',
    travel: { name: 'Flight', desc: 'Press to take off (or jump twice). Fly where you look and hold it for full speed; Space climbs, C dives, and coming down onto anything with C lands.' },
    rmb: { name: 'Solar Bolt', desc: 'A quick bolt of energy that finds its target.', cd: 0.22 },
    q: { name: 'Sunbeam', desc: 'Hold for a continuous beam that burns through a crowd.', cd: 4 },
    e: { name: 'Sonic Boom', desc: 'Dash through the air, bowling over everyone in your path.', cd: 5 },
    r: { name: 'Supernova', desc: 'A blinding blast in every direction.', ult: 100 },
  },
  blitz: {
    name: 'Blitz', kind: 'Speedster', tag: 'Gone before the sound catches up.',
    blurb: 'Runs at the speed of lightning, up the side of skyscrapers and across the water.',
    look: { c1: 0xf0c018, c2: 0xc81818, c3: 0xffffff, skin: 0xd8a882, eye: 0x101010, mask: true, emblem: 'bolt' },
    build: { h: 1.8, bulk: 0.85, legs: 0.53 },
    stats: { strength: 2, speed: 5, range: 2, toughness: 2, mobility: 5 },
    hp: 110, walk: 5.5, run: 12, jump: 12, melee: 9, color: '#ffd23a',
    travel: { name: 'Super Speed', desc: 'Hold to run at 60 m/s. Run into a wall to run up it; you can run on water.' },
    rmb: { name: 'Blur Strike', desc: 'Zip to a target and hit them before they blink.', cd: 0.6 },
    q: { name: 'Whirlwind', desc: 'Spin into a tornado that sucks crooks in and throws them skyward.', cd: 6 },
    e: { name: 'Lightning Lap', desc: 'Circle a crowd at full speed, hitting every one of them.', cd: 7 },
    r: { name: 'Speed Force', desc: 'Time crawls for everyone but you.', ult: 100 },
  },
  bulwark: {
    name: 'Bulwark', kind: 'Powerhouse', tag: 'The strongest man in Valor Bay.',
    blurb: 'Leaps a city block in one bound, lifts cars over his head and hits like a freight train.',
    look: { c1: 0x2a8a3a, c2: 0x5a2a8a, c3: 0xe8e8e8, skin: 0x8a5a3a, eye: 0, hair: 0x101010, emblem: 'fist' },
    build: { h: 2.5, bulk: 1.55, legs: 0.46 },
    stats: { strength: 5, speed: 2, range: 2, toughness: 5, mobility: 3 },
    hp: 260, walk: 4.5, run: 10, jump: 16, melee: 26, color: '#4ad860',
    travel: { name: 'Super Leap', desc: 'Hold to crouch, let go to leap where you are looking. Lands with a shockwave.' },
    rmb: { name: 'Lift & Throw', desc: 'Pick up a car (or tear up the street) and hurl it.', cd: 0.8 },
    q: { name: 'Ground Pound', desc: 'Smash the ground and knock everyone off their feet. From the air it hits harder.', cd: 5 },
    e: { name: 'Thunder Clap', desc: 'A clap that blows away everything in front of you.', cd: 5 },
    r: { name: 'Rampage', desc: 'Grow huge and unstoppable for ten seconds.', ult: 100 },
  },
  equinox: {
    name: 'Equinox', kind: 'Elementalist', tag: 'Fire in one hand, ice in the other.',
    blurb: 'Hovers on jets of flame, throws fireballs and freezes crooks solid.',
    look: { c1: 0x241a3a, c2: 0xff6a18, c3: 0x5ad8ff, skin: 0xe8c0a0, eye: 0, hair: 0xf0f0f8, emblem: 'yinyang' },
    build: { h: 1.75, bulk: 0.88, legs: 0.52 },
    stats: { strength: 2, speed: 3, range: 5, toughness: 3, mobility: 4 },
    hp: 120, walk: 5, run: 9.5, jump: 12, melee: 10, color: '#ff8a3a',
    travel: { name: 'Flame Jets', desc: 'Press to rise on jets of fire (or jump twice); hold to fly faster. Space climbs, C descends and lands. Slower than a true flier.' },
    rmb: { name: 'Fireball', desc: 'An exploding ball of fire that sets crooks alight.', cd: 0.45 },
    q: { name: 'Ice Lance', desc: 'A shard of ice that freezes everyone in a line. A frozen crook falls to one hit.', cd: 2.5 },
    e: { name: 'Fire Pillar', desc: 'A column of flame erupts under your target.', cd: 6 },
    r: { name: 'Absolute Zero', desc: 'Freeze everything around you solid, then shatter it.', ult: 100 },
  },
};
const HERO_ORDER = ['spindle', 'skylark', 'blitz', 'bulwark', 'equinox'];

// the gangs: each crook wears his gang's colours
const GANGS = {
  jackals: { name: 'Neon Jackals', c1: 0xc020c8, c2: 0x20e0d0, c3: 0x18181e },
  gearheads: { name: 'Gearheads', c1: 0xe87018, c2: 0x50545c, c3: 0x2a2a2a },
  suits: { name: 'Syndicate', c1: 0x26262e, c2: 0xd8d8d8, c3: 0xc01818 },
};
// crook types
const CROOKS = {
  thug: { name: 'Thug', hp: 30, speed: 5.2, dmg: 7, reach: 1.7, h: 1.82, bulk: 1.05, weapon: 'bat', pts: 100 },
  punk: { name: 'Punk', hp: 22, speed: 5.8, dmg: 5, reach: 1.5, h: 1.75, bulk: 0.92, weapon: 'none', pts: 80 },
  gunman: { name: 'Gunman', hp: 26, speed: 4.6, dmg: 6, reach: 30, h: 1.8, bulk: 1, weapon: 'gun', pts: 140, ranged: true },
  brute: { name: 'Brute', hp: 90, speed: 4.2, dmg: 16, reach: 2.4, h: 2.3, bulk: 1.6, weapon: 'pipe', pts: 300 },
  drone: { name: 'Drone', hp: 20, speed: 8, dmg: 5, reach: 25, h: 0.8, bulk: 1, weapon: 'laser', pts: 120, ranged: true, flying: true },
};

// the supervillains. Each arrives with a crew and a line, and has a whole move set in 11_bosses.js
const VILLAINS = {
  mauler: { name: 'Mauler', title: 'the Living Wrecking Ball', hp: 1400, h: 4.2, bulk: 2.4, crew: 'gearheads',
    look: { c1: 0x6a3a9a, c2: 0x3a8a3a, c3: 0x202020, skin: 0x7aa04a, eye: 0xffe020, hair: 0x101010 },
    lines: ['MAULER SMASH YOUR LITTLE CITY!', 'You hit like a pigeon!', 'Mauler will flatten you!'], pts: 5000 },
  kilowatt: { name: 'Kilowatt', title: 'Mistress of the Grid', hp: 1000, h: 1.85, bulk: 0.95, crew: 'jackals',
    look: { c1: 0x18181e, c2: 0xffe020, c3: 0x40d0ff, skin: 0xd8b090, eye: 0x40d0ff, mask: true, hair: 0xffffff },
    lines: ['Let\'s see how you handle ten thousand volts!', 'The whole city runs on MY power!', 'Shocking, isn\'t it?'], pts: 5000 },
  overclock: { name: 'Overclock', title: 'the Iron Tyrant', hp: 1100, h: 2.3, bulk: 1.35, crew: 'suits',
    look: { c1: 0x6a7280, c2: 0xd02020, c3: 0x40ff60, skin: 0x6a7280, eye: 0xff2020, mask: true, robot: true },
    lines: ['Your obsolete heroics end today.', 'Drones: eliminate the pest.', 'I have calculated your defeat.'], pts: 5000 },
};
const VILLAIN_ORDER = ['mauler', 'kilowatt', 'overclock'];

// civilians: clothes and skin palettes
const SKINS = [0xf0d0b0, 0xe0b090, 0xc88a60, 0xa06a40, 0x7a4a2a, 0x5a3420, 0xf8dcc4];
const HAIRS = [0x1a120c, 0x3a2414, 0x6a4020, 0xc89040, 0xe8d090, 0x888888, 0xb03018, 0x101010];
const SHIRTS = [0xe84040, 0x4080e8, 0x40c060, 0xf0c030, 0xf0f0f0, 0x303038, 0xe070b0, 0x40c0d0, 0xf08030, 0x8050c0, 0xa0a0a8, 0x2a5a8a];
const PANTS = [0x2a3a6a, 0x303034, 0x6a5a40, 0x8a8a90, 0x1a1a1e, 0x4a2a1a, 0x3a5a3a, 0xc0b090];

// a gang's lieutenant shouts, people scream, the press reports
const LINES = {
  crookSee: ['It\'s {hero}!', 'Get {hero}!', 'Cape incoming!', 'Uh oh...', 'Waste the hero!', 'Not you again!', 'Run for it!'],
  crookHurt: ['Oof!', 'Ow!', 'Ugh!', 'Agh!', 'My face!', 'Not fair!'],
  crookKO: ['I give up!', 'Mommy...', 'Seeing stars...', 'Uncle!', 'OK, OK!'],
  civScared: ['Help!', 'Aaah!', 'Run!', 'Police!', 'Somebody help!', 'Not my wallet!'],
  civCheer: ['It\'s {hero}!', 'Go get \'em!', 'My hero!', 'Wow!', 'Thank you, {hero}!', 'Can I get a selfie?', 'Valor Bay loves you!', 'Woo!'],
  civSaved: ['Thank you!', 'You saved me!', 'My hero!', 'I owe you one!'],
  mugger: ['Wallet. Now.', 'Give it here!', 'Hand it over!'],
  robber: ['Fill the bag!', 'Nobody move!', 'Hurry it up!'],
};
// comic sound words for hits
const POWS = {
  punch: ['POW!', 'WHAM!', 'BAM!', 'SOCK!', 'THWACK!', 'BIFF!', 'KAPOW!', 'SMACK!'],
  big: ['KRAKOOM!', 'KA-BLAM!', 'SKRAKK!', 'WHAMMO!', 'KER-RUNCH!', 'BOOM!'],
  web: ['THWIP!', 'THWIP!', 'SPLAT!', 'THWAPP!'],
  zap: ['ZAP!', 'ZZZAK!', 'FZZT!', 'KZZT!'],
  fire: ['FWOOSH!', 'WHOOMPH!', 'FOOM!'],
  ice: ['KRISSH!', 'TCHAK!', 'SHHNK!'],
  wind: ['WHOOOSH!', 'ZOOM!', 'VWOOSH!'],
};

// crime types the director can start: weight, how far from the player, what it spawns
const CRIMES = {
  mugging: { name: 'Mugging', w: 5, pts: 400, desc: 'A mugging' },
  robbery: { name: 'Store robbery', w: 4, pts: 800, desc: 'A store robbery' },
  getaway: { name: 'Getaway car', w: 3, pts: 900, desc: 'A getaway car' },
  gangwar: { name: 'Gang war', w: 2, pts: 1200, desc: 'A gang war' },
  heist: { name: 'Armored truck heist', w: 2, pts: 1500, desc: 'An armored truck heist' },
};
// hero ranks by score in one patrol (cosmetic, shown on the HUD)
const RANKS = [[0, 'Rookie'], [3000, 'Vigilante'], [10000, 'Crime Fighter'], [25000, 'Hero'], [50000, 'Champion'], [90000, 'Legend'], [150000, 'Icon of Valor Bay']];
const rankOf = (s) => { let r = RANKS[0][1]; for (const [k, n] of RANKS) if (s >= k) r = n; return r; };
