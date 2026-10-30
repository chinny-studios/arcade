// Creature Feature — data: the four monsters, the townsfolk of Pine Hollow, what they shout, and the scoring

// Speeds in m/s. attack: the primary (click / RT). a1: right click / LT. a2: Q / RB. door: hits to break a door
// (0 = walks through it, -1 = can't break doors at all and beckons the people inside out instead).
const MONSTERS = {
  vampire: {
    id: 'vampire', name: 'The Count', kind: 'Vampire', tag: 'He never drinks... soda pop.',
    blurb: 'Glides through the dark, hypnotises a victim from across the street and takes to the rooftops as a bat. Every bite is a meal.',
    walk: 4.6, run: 9.2, stalk: 2.4, jump: 8.2, radius: 0.42, height: 2.0, cam: 4.6, eye: 1.75, sight: 0.85,
    stats: { speed: 3, power: 2, stealth: 5, range: 4 },
    attack: { name: 'Bite', reach: 1.9, arc: 1.2, cd: 0.4, lock: 1.15, kind: 'bite', multi: false },
    a1: { name: 'Hypnotise', cd: 6, desc: 'Fix a victim with your stare. They walk to you in a trance.' },
    a2: { name: 'Bat Form', cd: 10, dur: 10, desc: 'Become a bat. Fly over the roofs; attack to swoop down on a victim.' },
    door: -1, doorVerb: 'Beckon', feedGain: 18, killGain: 26,
    voice: 'hiss',
  },
  werewolf: {
    id: 'werewolf', name: 'The Wolf Man', kind: 'Werewolf', tag: 'Even a man who is pure in heart...',
    blurb: 'Fastest thing in town on all fours. Pounces from a rooftop, tears through crowds and howls them frozen with terror.',
    walk: 5.0, run: 13.5, stalk: 2.6, jump: 10, radius: 0.5, height: 2.2, cam: 5.0, eye: 1.8, sight: 1.0,
    stats: { speed: 5, power: 4, stealth: 2, range: 3 },
    attack: { name: 'Claw', reach: 2.6, arc: 2.1, cd: 0.42, lock: 0.38, kind: 'claw', multi: true },
    a1: { name: 'Pounce', cd: 3.5, desc: 'Leap where you aim. Anyone you land on is finished.' },
    a2: { name: 'Howl', cd: 16, desc: 'Everyone within 40 m freezes in terror for a few seconds.' },
    door: 2, doorVerb: 'Break in', feedGain: 26, killGain: 12,
    voice: 'growl',
  },
  frank: {
    id: 'frank', name: 'The Monster', kind: "Frankenstein's Monster", tag: "It's alive! And it's hungry.",
    blurb: 'Slow and enormous. Smashes doors, cars and lamp posts, throws whatever it grabs and stamps the ground to knock everyone flat.',
    walk: 3.5, run: 6.4, stalk: 2.2, jump: 5.2, radius: 0.7, height: 2.6, cam: 6.2, eye: 2.3, sight: 1.15,
    stats: { speed: 1, power: 5, stealth: 1, range: 4 },
    attack: { name: 'Smash', reach: 3.0, arc: 2.4, cd: 0.6, lock: 0.75, kind: 'smash', multi: true },
    a1: { name: 'Hurl', cd: 1.2, desc: 'Grab the nearest car, bin, bench, body or chunk of road, then throw it.' },
    a2: { name: 'Stomp', cd: 9, desc: 'Shake the ground. Everyone within 15 m is knocked off their feet.' },
    door: 0, doorVerb: 'Smash in', feedGain: 26, killGain: 14,
    voice: 'roar',
  },
  mummy: {
    id: 'mummy', name: 'The Mummy', kind: 'Mummy', tag: 'Three thousand years is a long time between meals.',
    blurb: 'Shuffles, but never needs to run: lashes victims with its bandages from across the street and calls up a blinding sandstorm.',
    walk: 3.8, run: 6.2, stalk: 2.3, jump: 5.6, radius: 0.45, height: 2.0, cam: 4.8, eye: 1.75, sight: 0.95,
    stats: { speed: 2, power: 3, stealth: 4, range: 5 },
    attack: { name: 'Strangle', reach: 2.0, arc: 1.3, cd: 0.4, lock: 1.0, kind: 'strangle', multi: false },
    a1: { name: 'Bandage Lash', cd: 4.5, desc: 'Lash a victim up to 24 m away and reel them in.' },
    a2: { name: 'Sandstorm', cd: 15, dur: 7, desc: 'A storm of sand follows you. Victims inside are blind and slow.' },
    door: 3, doorVerb: 'Break in', feedGain: 26, killGain: 12,
    voice: 'moan',
  },
};
const MONSTER_ORDER = ['vampire', 'werewolf', 'frank', 'mummy'];

// Townsfolk. pts: base score. spd: sprint multiplier. stam: seconds of sprint. f: wears a skirt.
// Colours: skin, hair, top, jacket (0 = none), legs, shoes, hat (0 = none).
const SKIN = [0xf1c8a4, 0xe0ac84, 0xc68a62, 0x9a6440, 0x6e4630, 0xf4d4b8];
const HAIR = [0x1a1410, 0x3a2414, 0x6a4422, 0xc89a50, 0x8a2a10, 0x9a9a98, 0x2a1a10];
const FOLK = {
  greaser: { name: 'Greaser', pts: 100, spd: 1.05, stam: 6, top: 0xf2f2ee, jacket: 0x161616, legs: 0x2c3e66, shoes: 0x111111, hair: [0x111111, 0x2a1a10], quiff: true },
  sweetheart: { name: 'Sweetheart', pts: 110, spd: 0.95, stam: 5, f: true, top: 0xf6f0e6, skirt: [0xf28ab8, 0x7ad0d8, 0xe84848, 0xb8e070], legs: 0xf1c8a4, shoes: 0xffffff, ponytail: true },
  jock: { name: 'Letterman', pts: 120, spd: 1.15, stam: 8, top: 0xf6f6f0, jacket: [0xb02028, 0x1e3a8a, 0x1c6a3a], sleeves: 0xf0f0e8, legs: 0xc8b890, shoes: 0xf0f0f0 },
  housewife: { name: 'Housewife', pts: 100, spd: 0.9, stam: 5, f: true, top: [0x8ad0e0, 0xf0b0c0, 0xf0e090, 0xb0e0a8], skirt: 'top', apron: 0xffffff, legs: 0xf1c8a4, shoes: 0xa03030 },
  milkman: { name: 'Milkman', pts: 100, spd: 0.95, stam: 5, top: 0xf8f8f8, legs: 0xf0f0f0, shoes: 0x222222, hat: 0xf8f8f8, cap: true },
  deputy: { name: 'Deputy', pts: 160, spd: 1.05, stam: 7, top: 0xc8a870, legs: 0x5a4a30, shoes: 0x2a1a10, hat: 0x6a5030, stetson: true, badge: true },
  doctor: { name: 'Doc', pts: 130, spd: 0.9, stam: 5, top: 0xf6f6f6, jacket: 0xf8f8f8, coat: true, legs: 0x3a3a44, shoes: 0x1a1a1a, glasses: true },
  beatnik: { name: 'Beatnik', pts: 110, spd: 1.0, stam: 5, top: 0x161618, legs: 0x161618, shoes: 0x111111, hat: 0x161618, beret: true, glasses: true },
  mechanic: { name: 'Mechanic', pts: 100, spd: 1.0, stam: 6, top: 0x3a5a8a, legs: 0x3a5a8a, shoes: 0x2a1a10, hat: 0xc02020, cap: true },
  waitress: { name: 'Waitress', pts: 110, spd: 1.0, stam: 6, f: true, top: 0x6ad0c0, skirt: 'top', apron: 0xffffff, legs: 0xf1c8a4, shoes: 0xffffff, ponytail: true },
  grandpa: { name: 'Grandpa', pts: 80, spd: 0.72, stam: 3, top: 0xe8e0c8, jacket: 0x7a5a3a, legs: 0x6a6a60, shoes: 0x2a1a10, hairC: 0xd8d8d0, hat: 0x5a4a3a, fedora: true },
  salesman: { name: 'Salesman', pts: 120, spd: 0.95, stam: 5, top: 0xf2f2ee, jacket: [0x5a5a62, 0x4a3a2a, 0x2a3a5a], legs: 'jacket', shoes: 0x1a1a1a, hat: 0x3a3a40, fedora: true, tie: 0xb02028 },
  scientist: { name: 'Professor', pts: 250, spd: 0.85, stam: 4, top: 0xf2f2ee, jacket: 0xf6f6f6, coat: true, legs: 0x4a4a52, shoes: 0x1a1a1a, hairC: 0xe8e8e8, glasses: true, rare: true },
};
const FOLK_COMMON = ['greaser', 'sweetheart', 'jock', 'housewife', 'milkman', 'deputy', 'doctor', 'beatnik', 'mechanic', 'waitress', 'grandpa', 'salesman'];

// what they shout. {m} is replaced with what they think you are.
const LINES = {
  spot: ["It's {m}!", 'Run for your lives!', 'Somebody call the Sheriff!', 'Holy cow!', 'Get to the car!', 'This can\'t be happening!', 'It came from the graveyard!', 'Jeepers!', 'Help! HELP!', 'Lock the doors!', 'Mother of mercy!', 'Nobody will ever believe this!'],
  hurt: ['AAAAAH!', 'NOOOO!', 'AAAGH!', 'Not like this!', 'Mama!'],
  hide: ['Bolt the door!', "We're safe in here!", 'Get away from the window!'],
  out: ['It came through the door!', 'Get out! Get out!'],
  calm: ['Did you hear something?', 'Probably just raccoons.', "Swell night, isn't it?", 'Is that a dog howling?', 'Swell picture tonight.', 'Pass the popcorn.'],
  car: ['Step on it!', 'Drive, drive, DRIVE!', "It won't start!"],
  trance: ['Yes... master...', 'So... sleepy...', 'Your eyes...'],
  monster: {
    vampire: ['Dracula', 'a vampire', 'the Count'], werewolf: ['a werewolf', 'the Wolf Man', 'a wolf walking like a man'],
    frank: ["Frankenstein's monster", 'a monster', 'the creature'], mummy: ['the Mummy', 'a walking mummy', 'the curse'],
  },
};

// score bonuses, added to the victim's base before the combo multiplier
const BONUS = {
  silent: { pts: 100, label: 'Unseen' }, air: { pts: 150, label: 'From above' }, flushed: { pts: 120, label: 'Home invasion' },
  car: { pts: 150, label: 'Roadkill' }, multi: { pts: 200, label: 'Double feature' }, range: { pts: 60, label: 'Long reach' },
  thrown: { pts: 120, label: 'Special delivery' }, trance: { pts: 50, label: 'Entranced' }, tripped: { pts: 40, label: 'Tripped' },
  flat: { pts: 80, label: 'While they were down' }, blind: { pts: 60, label: 'Lost in the sand' }, frozen: { pts: 60, label: 'Petrified' },
  pounce: { pts: 100, label: 'Pounce' }, feed: { pts: 50, label: 'Fed' }, rare: { pts: 0, label: 'The Professor' },
};
const COMBO_TIME = 9, COMBO_MAX = 8;
const PANIC_NAMES = [[0, 'Quiet'], [20, 'Uneasy'], [45, 'Alarmed'], [70, 'Panic'], [90, 'Hysteria']];
