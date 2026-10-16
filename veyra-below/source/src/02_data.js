// Veyra Below — game data: classes, areas, monsters, psionic arts, skills, items, sprites, story

// ---------- classes ----------
const STAT_KEYS = ['hp', 'tp', 'atp', 'dfp', 'mst', 'ata', 'evp', 'lck'];
const STAT_NAMES = { hp: 'HP', tp: 'PSI', atp: 'ATK', dfp: 'DEF', mst: 'PSY', ata: 'ACC', evp: 'EVA', lck: 'LUK' };
const ROLES = {
  vanguard: { name: 'Vanguard', short: 'VG', color: 0xe0603a, desc: 'Front-line fighter. Blades, greatblades, twin knives, lances and chakrams. Tough, and hits hard up close.',
    base: { hp: 62, tp: 24, atp: 44, dfp: 22, mst: 14, ata: 40, evp: 34, lck: 10 },
    grow: { hp: 9.5, tp: 2.4, atp: 3.0, dfp: 1.5, mst: 1.0, ata: 1.6, evp: 1.5, lck: 0.2 },
    weapons: ['blade', 'greatblade', 'knives', 'lance', 'chakram', 'pistol'], techMax: 10, start: 'blade' },
  marksman: { name: 'Marksman', short: 'MK', color: 0x48b8e8, desc: 'Sharpshooter. Pistols, rifles, repeaters and scatterguns. Accurate, quick on their feet, deadly at range.',
    base: { hp: 54, tp: 30, atp: 38, dfp: 18, mst: 18, ata: 56, evp: 40, lck: 14 },
    grow: { hp: 8, tp: 3, atp: 2.6, dfp: 1.3, mst: 1.3, ata: 2.4, evp: 1.8, lck: 0.3 },
    weapons: ['pistol', 'rifle', 'repeater', 'scatter', 'blade', 'lance'], techMax: 10, start: 'pistol' },
  psion: { name: 'Psion', short: 'PS', color: 0xa878f0, desc: 'Psychic caster. Scepters, staves and sigils. Fragile, but commands fire, ice, lightning, light, darkness and healing.',
    base: { hp: 44, tp: 64, atp: 22, dfp: 14, mst: 46, ata: 34, evp: 36, lck: 12 },
    grow: { hp: 6.2, tp: 6.5, atp: 1.4, dfp: 1.0, mst: 3.4, ata: 1.3, evp: 1.6, lck: 0.25 },
    weapons: ['scepter', 'staff', 'sigil', 'pistol', 'blade'], techMax: 20, start: 'staff' },
};
const RACES = {
  human: { name: 'Human', desc: 'Balanced and adaptable. +5% experience, luckier, and can learn every psionic art.',
    mods: { hp: 1, tp: 1, atp: 1, dfp: 1, mst: 1, ata: 1.05, evp: 1, lck: 1.3 }, xp: 1.05 },
  sylph: { name: 'Sylph', desc: 'Gene-tuned colonists born for psionics. More PSI and PSY, faster PSI regeneration and evasion, but frail.',
    mods: { hp: 0.86, tp: 1.3, atp: 0.92, dfp: 0.9, mst: 1.2, ata: 1, evp: 1.12, lck: 1 }, tpRegen: 1.6 },
  construct: { name: 'Construct', desc: 'Synthetic body. More HP, attack and defence, immune to poison and paralysis, lays plasma snares. Cannot use support arts; attack arts at 60%.',
    mods: { hp: 1.25, tp: 0.65, atp: 1.12, dfp: 1.15, mst: 0.78, ata: 1.05, evp: 0.88, lck: 0.9 }, noSupport: true, techMul: 0.6, immune: ['poison', 'shock'], traps: true },
};
const CLASS_NAME = (role, race) => RACES[race].name + ' ' + ROLES[role].name;

// Your star sign comes from your name. It decides which relics you find most often.
const STAR_SIGNS = [
  { id: 'lantern', name: 'The Lantern', color: 0xffd060, favor: ['scatter', 'chakram'] },
  { id: 'serpent', name: 'The Serpent', color: 0x3fae8a, favor: ['repeater', 'rifle'] },
  { id: 'anvil', name: 'The Anvil', color: 0x9aa8b8, favor: ['greatblade', 'lance'] },
  { id: 'tide', name: 'The Tide', color: 0x4c90f0, favor: ['staff', 'sigil'] },
  { id: 'lyre', name: 'The Lyre', color: 0xa060e8, favor: ['scepter', 'knives'] },
  { id: 'thorn', name: 'The Thorn', color: 0x5fd068, favor: ['sigil', 'pistol'] },
  { id: 'crown', name: 'The Crown', color: 0xf0c040, favor: ['blade', 'rifle'] },
  { id: 'hound', name: 'The Hound', color: 0xe07a30, favor: ['knives', 'repeater'] },
  { id: 'veil', name: 'The Veil', color: 0xc070c8, favor: ['pistol', 'lance'] },
  { id: 'wheel', name: 'The Wheel', color: 0xf2f0e8, favor: ['greatblade', 'scepter'] },
];
function signFor(name) { let s = 0; for (const ch of String(name)) s += ch.charCodeAt(0); return STAR_SIGNS[s % 10]; }

const SUIT_COLORS = [0xd8403a, 0x3a78d8, 0x3fae5a, 0xe0b040, 0x9a58d8, 0xe07ab0, 0x40c8c8, 0xe8e8e8, 0x404048, 0xe07a30];
const HAIR_COLORS = [0x2a2018, 0x7a4a28, 0xe0c070, 0xd04a30, 0xf0f0f0, 0x5a8ae0, 0xd070c0, 0x60d0a0];

// ---------- areas & difficulties ----------
const AREA_ORDER = ['forest', 'caves', 'mines', 'ruins'];
const AREAS = {
  forest: { name: 'Verdant Reach', sub: 'Wildwood', lvl: 1, family: 'wild', boss: 'vharn', style: 'organic', music: 0,
    pal: { floor: [0x4a6a34, 0x557a3a, 0x3f5e2c], wall: 0x2c3c24, wall2: 0x4c5a3c, fog: 0x18241a, bg: 0x0d150e, hemiSky: 0x9cc0e0, hemiGnd: 0x2c3a1c, hemiI: 0.62, key: 0xfff0c8, keyI: 1.0, glow: 0x9fffb0, pl: 0xffe2a8 },
    floors: [['mossling', 'skulkwolf', 'pyremoth', 'thornback'], ['skulkwolf', 'thornback', 'pyremoth', 'hexer', 'mossling']],
    blurb: 'The forest around the first colony. Something has turned the wildlife savage.' },
  caves: { name: 'Cinder Hollows', sub: 'Hollows', lvl: 7, family: 'burrow', boss: 'maw', style: 'organic', music: 1,
    pal: { floor: [0x4a3428, 0x553b2c, 0x3e2c22], wall: 0x2c1e18, wall2: 0x5a3626, fog: 0x1c0e0a, bg: 0x0c0605, hemiSky: 0xd08060, hemiGnd: 0x2a1408, hemiI: 0.5, key: 0xffb080, keyI: 0.8, glow: 0xff7a30, pl: 0xffb070 },
    floors: [['cindergrub', 'ashhound', 'magmaslug', 'carapace'], ['ashhound', 'shrieker', 'carapace', 'magmaslug', 'cindergrub']],
    blurb: 'Volcanic tunnels under the forest, where the colony dug for heat. The heat dug back.' },
  mines: { name: 'Deepworks', sub: 'Foundry', lvl: 14, family: 'mech', boss: 'custodian', style: 'grid', music: 2,
    pal: { floor: [0x3a4048, 0x424a52, 0x343a42], wall: 0x22282e, wall2: 0x5a6470, fog: 0x0c1218, bg: 0x06090c, hemiSky: 0x80b0e0, hemiGnd: 0x1a2028, hemiI: 0.55, key: 0xc8e0ff, keyI: 0.9, glow: 0x40e0ff, pl: 0xb0d8ff },
    floors: [['crawler', 'gundrone', 'sentry', 'sparkmine', 'turret'], ['gundrone', 'shieldmech', 'sentry', 'turret', 'crawler']],
    blurb: 'Automated mining levels run by the colony AI. The machines no longer take orders.' },
  ruins: { name: 'The Sunken Nave', sub: 'Cathedral', lvl: 21, family: 'eldritch', boss: 'sleeper', style: 'grid', music: 3,
    pal: { floor: [0x3a3440, 0x423a4a, 0x322c38], wall: 0x241e2c, wall2: 0x5a4a6a, fog: 0x100a16, bg: 0x07040a, hemiSky: 0xb090e0, hemiGnd: 0x1c1028, hemiI: 0.5, key: 0xe0c8ff, keyI: 0.75, glow: 0xc060ff, pl: 0xd8b8ff },
    floors: [['penitent', 'lancer', 'eye', 'flesh'], ['penitent', 'choir', 'veiled', 'lancer', 'eye', 'flesh']],
    blurb: 'A cathedral older than the colony, buried under the mines. Whatever was sealed here is waking.' },
};
const DIFFS = [
  { id: 'initiate', name: 'Initiate', lvl: 0, hp: 1, dmg: 1, xp: 1, drop: 1, elite: 0.12, color: '#9fd0ff' },
  { id: 'veteran', name: 'Veteran', lvl: 28, hp: 1.1, dmg: 1.08, xp: 1.15, drop: 1.25, elite: 0.16, color: '#ffd070' },
  { id: 'ascendant', name: 'Ascendant', lvl: 52, hp: 1.2, dmg: 1.16, xp: 1.3, drop: 1.5, elite: 0.2, color: '#ff8a50' },
  { id: 'apex', name: 'Apex', lvl: 72, hp: 1.35, dmg: 1.25, xp: 1.5, drop: 1.8, elite: 0.25, color: '#ff4a6a' },
];
const FAMILY_NAMES = { wild: 'Wild', burrow: 'Burrower', mech: 'Mech', eldritch: 'Eldritch', keen: 'Keen' };
const ELEMS = ['fire', 'ice', 'bolt', 'light', 'dark'];
const ELEM_NAMES = { fire: 'Fire', ice: 'Ice', bolt: 'Lightning', light: 'Light', dark: 'Dark', phys: 'Physical' };
const ELEM_COLORS = { fire: 0xff7a30, ice: 0x80d8ff, bolt: 0xfff060, light: 0xfff8d0, dark: 0xb050ff, phys: 0xffffff };

// ---------- monsters ----------
// hp/atk are multipliers on the level curves. Attacks: melee (cone), pounce (leap+hit), charge (dash), slam (ring
// around self), proj (projectile), lob (arcing shot at a spot), cast (delayed burst at target), summon, explode, beam.
const ENEMIES = {
  mossling: { name: 'Mossling', shape: 'slime', color: 0x6fae3a, color2: 0xd0f070, size: 0.55, move: 'close', hp: 1.5, atk: 0.7, xp: 0.6, speed: 4.4, evp: 0.8,
    res: { fire: -0.5, ice: 0.2 }, attacks: [{ type: 'pounce', range: 3.2, windup: 0.45, cd: 1.6, mult: 1 }] },
  skulkwolf: { name: 'Skulk Wolf', shape: 'wolf', color: 0x5e554a, color2: 0xd8c890, size: 0.95, move: 'close', hp: 3.0, atk: 1.0, xp: 1.0, speed: 5.4, pack: true,
    res: { fire: -0.25 }, attacks: [{ type: 'melee', range: 1.7, windup: 0.4, cd: 1.2, mult: 1 }, { type: 'pounce', range: 6, min: 3, windup: 0.6, cd: 4, mult: 1.3 }] },
  thornback: { name: 'Thornback', shape: 'beast', color: 0x6a4a30, color2: 0x9fd060, size: 1.35, move: 'close', hp: 6.5, atk: 1.6, xp: 1.8, speed: 3.0, poise: 2,
    res: { ice: -0.25 }, attacks: [{ type: 'melee', range: 2.2, windup: 0.65, cd: 1.8, mult: 1, arc: 1.8 }, { type: 'slam', range: 2.6, radius: 3.2, windup: 0.95, cd: 6, mult: 1.6 }] },
  pyremoth: { name: 'Pyre Moth', shape: 'moth', color: 0xd06a2a, color2: 0xffd060, size: 0.85, move: 'kite', fly: true, hp: 2.3, atk: 0.9, xp: 1.1, speed: 3.6, elem: 'fire',
    res: { fire: 0.6, ice: -0.5 }, attacks: [{ type: 'proj', range: 10, windup: 0.6, cd: 2.4, mult: 1, proj: 'fireball', speed: 9 }] },
  hexer: { name: 'Briar Hexer', shape: 'imp', color: 0x4a6a3a, color2: 0xb060ff, size: 0.95, move: 'kite', hp: 3.4, atk: 0.9, xp: 1.6, speed: 3.0, elem: 'dark',
    res: { dark: 0.4, light: -0.4 }, attacks: [{ type: 'summon', range: 14, windup: 1.0, cd: 9, what: 'mossling', n: 2 }, { type: 'cast', range: 11, windup: 0.9, cd: 3.2, mult: 1.2, radius: 2.2, delay: 0.9, fx: 'thorns' }] },
  skylark: { name: 'Gilded Skylark', shape: 'bird', color: 0xf0d040, color2: 0xffffff, size: 0.75, move: 'flee', hp: 4, atk: 0.3, xp: 8, speed: 4.2, rare: true, dropBonus: 5, attacks: [] },
  // caves
  cindergrub: { name: 'Cinder Grub', shape: 'grub', color: 0x5a2a1a, color2: 0xff7020, size: 0.75, move: 'close', hp: 1.8, atk: 2.0, xp: 0.9, speed: 3.9, elem: 'fire',
    res: { fire: 0.8, ice: -0.5 }, attacks: [{ type: 'explode', range: 1.6, windup: 0.75, cd: 9, mult: 1, radius: 2.8 }] },
  ashhound: { name: 'Ash Hound', shape: 'wolf', color: 0x3a302c, color2: 0xff5020, horns: true, size: 1.0, move: 'close', hp: 3.4, atk: 1.15, xp: 1.1, speed: 5.6, pack: true, elem: 'fire',
    res: { fire: 0.4, ice: -0.3 }, attacks: [{ type: 'melee', range: 1.8, windup: 0.38, cd: 1.1, mult: 1 }, { type: 'pounce', range: 7, min: 3, windup: 0.55, cd: 4, mult: 1.3 }] },
  magmaslug: { name: 'Magma Slug', shape: 'slug', color: 0x6a2a14, color2: 0xffa040, size: 1.1, move: 'kite', hp: 4.4, atk: 1.2, xp: 1.4, speed: 2.0, elem: 'fire',
    res: { fire: 0.7, ice: -0.4 }, attacks: [{ type: 'lob', range: 11, windup: 0.9, cd: 3.2, mult: 1.2, radius: 2.0, pool: true }] },
  shrieker: { name: 'Gloom Shrieker', shape: 'bat', color: 0x3a2a40, color2: 0xff4060, size: 0.95, move: 'kite', fly: true, hp: 3.0, atk: 1.1, xp: 1.5, speed: 4.5, elem: 'dark',
    res: { dark: 0.5, light: -0.5 }, attacks: [{ type: 'cast', range: 12, windup: 0.8, cd: 3.0, mult: 1.3, radius: 2.4, delay: 0.85, fx: 'dark' }] },
  carapace: { name: 'Basalt Carapace', shape: 'beetle', color: 0x2a2624, color2: 0xff6a20, size: 1.3, move: 'close', hp: 7.0, atk: 1.6, xp: 1.9, speed: 2.8, armored: 0.35, poise: 3,
    res: { bolt: -0.3, fire: 0.3 }, attacks: [{ type: 'melee', range: 2.1, windup: 0.6, cd: 1.7, mult: 1 }, { type: 'charge', range: 10, min: 3.5, windup: 0.8, cd: 5, mult: 1.6 }] },
  // mines
  crawler: { name: 'Scrap Crawler', shape: 'spider', color: 0x5a5a60, color2: 0xff3030, size: 0.65, move: 'close', hp: 1.6, atk: 0.8, xp: 0.6, speed: 5.0,
    res: { bolt: -0.5, ice: 0.2 }, attacks: [{ type: 'pounce', range: 3.4, windup: 0.4, cd: 1.5, mult: 1 }] },
  gundrone: { name: 'Gun Drone', shape: 'drone', color: 0x7a8490, color2: 0x40e0ff, size: 0.85, move: 'kite', fly: true, hp: 2.6, atk: 0.7, xp: 1.2, speed: 4.0, elem: 'bolt',
    res: { bolt: -0.4, ice: 0.3 }, attacks: [{ type: 'proj', range: 11, windup: 0.5, cd: 2.4, mult: 0.7, proj: 'laser', speed: 16, burst: 3 }] },
  sentry: { name: 'Drill Sentry', shape: 'mech', color: 0xb08a30, color2: 0x40e0ff, size: 1.3, move: 'close', hp: 6.0, atk: 1.6, xp: 1.8, speed: 3.0, armored: 0.3, poise: 2,
    res: { bolt: -0.4, fire: 0.2 }, attacks: [{ type: 'melee', range: 2.3, windup: 0.6, cd: 1.6, mult: 1, arc: 1.4 }, { type: 'charge', range: 9, min: 3, windup: 0.9, cd: 6, mult: 1.5 }] },
  sparkmine: { name: 'Spark Mine', shape: 'mine', color: 0x404448, color2: 0xfff060, size: 0.6, move: 'close', hp: 1.4, atk: 2.1, xp: 0.8, speed: 4.6, elem: 'bolt',
    res: { bolt: 0.8 }, attacks: [{ type: 'explode', range: 1.5, windup: 0.6, cd: 9, mult: 1, radius: 2.8 }] },
  turret: { name: 'Bastion Turret', shape: 'turret', color: 0x5a6068, color2: 0xff4040, size: 1.0, move: 'static', hp: 4.0, atk: 0.9, xp: 1.3, speed: 0, armored: 0.25,
    res: { bolt: -0.5 }, attacks: [{ type: 'proj', range: 13, windup: 0.4, cd: 1.6, mult: 0.8, proj: 'laser', speed: 18, burst: 2 }] },
  shieldmech: { name: 'Bulwark Unit', shape: 'mech', shield: true, color: 0x5a6a80, color2: 0xffb030, size: 1.35, move: 'close', hp: 7.5, atk: 1.5, xp: 2.0, speed: 2.7, block: 0.75, poise: 3,
    res: { bolt: -0.3 }, attacks: [{ type: 'melee', range: 2.2, windup: 0.7, cd: 1.8, mult: 1.1 }, { type: 'slam', range: 2.4, radius: 3, windup: 1.0, cd: 7, mult: 1.4 }] },
  // ruins
  penitent: { name: 'Hollow Penitent', shape: 'robed', color: 0x4a4038, color2: 0xd0ff80, size: 1.1, move: 'close', hp: 4.2, atk: 1.2, xp: 1.1, speed: 2.9,
    res: { light: -0.5, dark: 0.4, fire: -0.2 }, attacks: [{ type: 'melee', range: 1.9, windup: 0.6, cd: 1.5, mult: 1 }] },
  lancer: { name: 'Wraith Lancer', shape: 'knight', color: 0x2a2838, color2: 0xa060ff, size: 1.4, move: 'close', hp: 6.8, atk: 1.6, xp: 2.0, speed: 3.6, armored: 0.25, poise: 3, elem: 'dark',
    res: { light: -0.4, dark: 0.5 }, attacks: [{ type: 'melee', range: 2.8, windup: 0.6, cd: 1.6, mult: 1, arc: 0.9 }, { type: 'charge', range: 11, min: 3.5, windup: 0.75, cd: 5, mult: 1.7 }] },
  choir: { name: 'Bone Choir', shape: 'robed', halo: true, color: 0xd8d0c0, color2: 0xc060ff, size: 1.15, move: 'kite', hp: 4.0, atk: 1.1, xp: 2.0, speed: 2.6, elem: 'dark',
    res: { light: -0.5, dark: 0.6 }, attacks: [{ type: 'summon', range: 14, windup: 1.1, cd: 10, what: 'penitent', n: 2 }, { type: 'proj', range: 11, windup: 0.7, cd: 2.4, mult: 1.1, proj: 'darkorb', speed: 7, homing: 1.4 }] },
  veiled: { name: 'Veiled Blade', shape: 'ninja', color: 0x1a1a22, color2: 0x60ffd0, size: 1.05, move: 'close', stealth: true, hp: 3.6, atk: 1.4, xp: 1.6, speed: 5.4,
    res: { light: -0.3 }, attacks: [{ type: 'melee', range: 1.8, windup: 0.3, cd: 0.9, mult: 0.8 }, { type: 'pounce', range: 7, min: 2.5, windup: 0.4, cd: 3.5, mult: 1.3 }] },
  flesh: { name: 'Crawling Flesh', shape: 'slime', color: 0x8a2a30, color2: 0xffa0a0, size: 1.0, move: 'close', hp: 4.6, atk: 1.1, xp: 1.3, speed: 2.6, split: 'fleshling',
    res: { fire: -0.4, dark: 0.3 }, attacks: [{ type: 'melee', range: 1.7, windup: 0.55, cd: 1.4, mult: 1 }] },
  fleshling: { name: 'Fleshling', shape: 'slime', color: 0xa03a40, color2: 0xffa0a0, size: 0.55, move: 'close', hp: 1.2, atk: 0.7, xp: 0.3, speed: 4.4,
    res: { fire: -0.4 }, attacks: [{ type: 'pounce', range: 3, windup: 0.4, cd: 1.4, mult: 1 }] },
  eye: { name: 'Watching Eye', shape: 'eye', color: 0xe8e0d0, color2: 0xff3060, size: 0.9, move: 'kite', fly: true, hp: 3.0, atk: 1.0, xp: 1.5, speed: 3.2, elem: 'dark',
    res: { dark: 0.5, light: -0.5 }, attacks: [{ type: 'beam', range: 12, windup: 1.0, cd: 4.0, mult: 0.45, dur: 1.2 }] },
  // summoned by bosses
  wisp: { name: 'Psi Wisp', shape: 'wisp', color: 0x80ffd0, color2: 0xffffff, size: 0.5, move: 'kite', fly: true, hp: 1, atk: 0.6, xp: 0, speed: 5, ally: true, attacks: [] },
};
// rare colour variants on Apex (and a small chance elsewhere): stronger, better drops
const RARE_VARIANT = { name: (n) => 'Gleaming ' + n, hp: 1.6, xp: 3, drop: 3 };

const ELITE_MODS = {
  fast: { name: 'Swift', desc: 'moves and attacks faster' },
  strong: { name: 'Mighty', desc: 'hits much harder' },
  fire: { name: 'Blazing', desc: 'fire damage, bursts into flame on death' },
  cold: { name: 'Frostbound', desc: 'chilling hits slow you' },
  shock: { name: 'Stormcharged', desc: 'sheds sparks when hit' },
  stone: { name: 'Plated', desc: 'resists physical damage' },
  vamp: { name: 'Leeching', desc: 'heals when it hits' },
  blink: { name: 'Phasing', desc: 'blinks around' },
};
const UNIQUE_PREFIX = ['Gorr', 'Vexa', 'Mordrake', 'Skarn', 'Ilsabet', 'Thrum', 'Kaldra', 'Oszen', 'Rukh', 'Malvyn', 'Sable', 'Ghast', 'Hroth', 'Nyssa', 'Varg'];
const UNIQUE_TITLE = ['the Hungering', 'the Hollow', 'Bloodmoss', 'the Unseen', 'Ironjaw', 'the Rotten', 'Cinderheart', 'the Defiler', 'Grimhide', 'the Pale', 'Gutripper', 'the Forsaken', 'Deathmoth', 'the Stitched', 'Duskborn'];

// ---------- bosses ----------
const BOSSES = {
  vharn: { name: 'Vharn, the Rotwing', title: 'Corrupted Forest Dragon', hp: 125, atk: 1.7, xp: 30, area: 'forest', size: 3.2, color: 0x5a7a3a, color2: 0xd0ff60, elem: 'fire', res: { fire: 0.5, ice: -0.3 } },
  maw: { name: 'The Maw Below', title: 'Burrowing Horror of the Hollows', hp: 140, atk: 1.8, xp: 34, area: 'caves', size: 2.6, color: 0x5a3020, color2: 0xff7020, elem: 'fire', res: { fire: 0.6, ice: -0.3 } },
  custodian: { name: 'CUSTODIAN-7', title: 'Rogue Mining Intelligence', hp: 120, atk: 1.8, xp: 38, area: 'mines', size: 3, color: 0x5a6470, color2: 0xff3040, elem: 'bolt', res: { bolt: -0.3, ice: 0.2 } },
  sleeper: { name: 'Kharzael, the Sleeper', title: 'That Which Was Buried', hp: 240, atk: 2.1, xp: 60, area: 'ruins', size: 3.4, color: 0x2a1a38, color2: 0xc060ff, elem: 'dark', res: { dark: 0.5, light: -0.35 } },
};

// ---------- psionic arts ----------
// Psionic arts. PSI cost = a + b*lv; damage grows with art level and with PSY (see techPower)
const TECHS = {
  ember: { name: 'Ember', elem: 'fire', kind: 'bolt', tp: [5, 0.5], pow: 0.55, range: 13, desc: 'Hurls a fireball that bursts on impact.' },
  pyrering: { name: 'Pyre Ring', elem: 'fire', kind: 'ring', tp: [12, 1.0], pow: 0.5, radius: 4.6, desc: 'A ring of fire erupts around you.' },
  inferno: { name: 'Inferno', elem: 'fire', kind: 'burst', tp: [16, 1.2], pow: 0.7, radius: 3.4, range: 13, desc: 'A fire explosion at the target.' },
  frostlance: { name: 'Frost Lance', elem: 'ice', kind: 'wave', tp: [6, 0.5], pow: 0.5, range: 11, desc: 'A line of ice spikes that can freeze.' },
  rimering: { name: 'Rime Ring', elem: 'ice', kind: 'ring', tp: [13, 1.0], pow: 0.45, radius: 4.6, desc: 'Freezing air around you. Slows and can freeze.' },
  glacier: { name: 'Glacier', elem: 'ice', kind: 'burst', tp: [17, 1.2], pow: 0.62, radius: 3.6, range: 12, desc: 'A blizzard burst at the target.' },
  jolt: { name: 'Jolt', elem: 'bolt', kind: 'strike', tp: [5, 0.45], pow: 0.6, range: 13, desc: 'Lightning strikes the nearest foe ahead.' },
  arcchain: { name: 'Arc Chain', elem: 'bolt', kind: 'chain', tp: [11, 0.9], pow: 0.45, range: 11, jumps: 4, desc: 'Lightning that arcs between several foes.' },
  stormcall: { name: 'Storm Call', elem: 'bolt', kind: 'storm', tp: [18, 1.3], pow: 0.3, radius: 5, range: 12, desc: 'A storm of strikes around the target.' },
  radiance: { name: 'Radiance', elem: 'light', kind: 'pillar', tp: [20, 1.5], pow: 1.1, radius: 2.2, range: 13, forceOnly: true, desc: 'A pillar of searing light. Devastating against dark creatures.' },
  umbra: { name: 'Umbra', elem: 'dark', kind: 'orb', tp: [20, 1.5], pow: 0.85, range: 13, forceOnly: true, desc: 'A seeking orb of darkness. May kill outright.' },
  mend: { name: 'Mend', kind: 'heal', support: true, tp: [10, 0.8], pow: 1, radius: 7, desc: 'Restores HP to nearby allies.' },
  cleanse: { name: 'Cleanse', kind: 'cure', support: true, tp: [6, 0.2], radius: 7, desc: 'Cures poison, burns, freezing and paralysis nearby.' },
  fervor: { name: 'Fervor', kind: 'buff', stat: 'atp', support: true, tp: [12, 0.6], radius: 7, desc: 'Raises the party\'s attack power.' },
  bulwark: { name: 'Bulwark', kind: 'buff', stat: 'dfp', support: true, tp: [12, 0.6], radius: 7, desc: 'Raises the party\'s defence.' },
  enfeeble: { name: 'Enfeeble', kind: 'debuff', stat: 'atk', tp: [12, 0.6], radius: 5, range: 12, forceOnly: true, desc: 'Weakens the attacks of foes at the target.' },
  expose: { name: 'Expose', kind: 'debuff', stat: 'def', tp: [12, 0.6], radius: 5, range: 12, forceOnly: true, desc: 'Weakens the defences of foes at the target.' },
  rekindle: { name: 'Rekindle', kind: 'revive', support: true, tp: [30, 0], radius: 6, desc: 'Revives a fallen ally nearby.' },
  recall: { name: 'Recall', kind: 'portal', tp: [10, 0], desc: 'Opens a portal back to the ship. Step through it again to return.' },
};
const TECH_ORDER = ['ember', 'pyrering', 'inferno', 'frostlance', 'rimering', 'glacier', 'jolt', 'arcchain', 'stormcall', 'radiance', 'umbra', 'mend', 'cleanse', 'fervor', 'bulwark', 'enfeeble', 'expose', 'rekindle', 'recall'];
const techCost = (id, lv) => Math.round(TECHS[id].tp[0] + TECHS[id].tp[1] * (lv - 1));

// ---------- skills ----------
// tier unlocks at level 1 / 8 / 16 (+ rank requirements below). r = current rank.
const SKILLS = {
  // Vanguard
  risingslash: { role: 'vanguard', tier: 0, name: 'Rising Slash', type: 'active', max: 5, tp: 6, cd: 5, icon: 'slash', desc: (r) => `Leap forward and slash everything where you land for ${180 + 30 * r}% weapon damage.` },
  ironhide: { role: 'vanguard', tier: 0, name: 'Iron Hide', type: 'passive', max: 5, icon: 'shield', desc: (r) => `+${6 * r}% DEF and +${4 * r}% max HP.` },
  plasmaedge: { role: 'vanguard', tier: 0, name: 'Plasma Edge', type: 'passive', max: 5, icon: 'edge', desc: (r) => `+${7 * r}% melee damage.` },
  whirlwind: { role: 'vanguard', tier: 1, name: 'Whirlwind', type: 'active', max: 5, tp: 10, cd: 7, icon: 'spin', desc: (r) => `Spin for 1.6 s, hitting everything around you 5 times for ${70 + 10 * r}% each. You can move while spinning.` },
  bloodlust: { role: 'vanguard', tier: 1, name: 'Bloodlust', type: 'passive', max: 5, icon: 'drop', desc: (r) => `Melee hits heal you for ${r}% of the damage dealt.` },
  warcry: { role: 'vanguard', tier: 1, name: 'War Cry', type: 'active', max: 5, tp: 8, cd: 20, icon: 'cry', desc: (r) => `Party attack +${10 + 4 * r}% for 12 s. Nearby foes are drawn to you and slowed.` },
  sunder: { role: 'vanguard', tier: 2, name: 'Sunder', type: 'active', max: 5, tp: 14, cd: 10, icon: 'slam', desc: (r) => `Slam the ground for ${300 + 50 * r}% weapon damage around you and stun foes for 1.2 s.` },
  combomastery: { role: 'vanguard', tier: 2, name: 'Combo Mastery', type: 'passive', max: 5, icon: 'combo', desc: (r) => `Well-timed combo hits deal +${6 * r}% more damage, and you attack ${4 * r}% faster.` },
  laststand: { role: 'vanguard', tier: 2, name: 'Last Stand', type: 'passive', max: 3, icon: 'heart', desc: (r) => `Once per floor, a lethal blow leaves you at 1 HP and invulnerable for 2 s. Below 30% HP you take ${4 * r}% less damage.` },
  // Marksman
  volley: { role: 'marksman', tier: 0, name: 'Volley', type: 'active', max: 5, tp: 6, cd: 4, icon: 'fan', desc: (r) => `Fire a fan of ${5 + r} shots, each for ${80 + 8 * r}% weapon damage.` },
  steadyaim: { role: 'marksman', tier: 0, name: 'Steady Aim', type: 'passive', max: 5, icon: 'crit', desc: (r) => `+${3 * r}% critical chance and +${8 * r}% critical damage.` },
  evasiveroll: { role: 'marksman', tier: 0, name: 'Evasive Roll', type: 'passive', max: 5, icon: 'roll', desc: (r) => `Dodge recovers ${10 * r}% faster, and your next attack after a roll deals +${15 * r}% damage.` },
  piercinglance: { role: 'marksman', tier: 1, name: 'Piercing Lance', type: 'active', max: 5, tp: 10, cd: 6, icon: 'lance', desc: (r) => `Charge for half a second, then fire a beam through every foe in a line for ${250 + 40 * r}% weapon damage.` },
  grenade: { role: 'marksman', tier: 1, name: 'Plasma Grenade', type: 'active', max: 5, tp: 8, cd: 5, icon: 'grenade', desc: (r) => `Throw a grenade that bursts for ${200 + 30 * r}% weapon damage as fire in a 3 m radius.` },
  predatorsmark: { role: 'marksman', tier: 1, name: "Predator's Mark", type: 'active', max: 5, tp: 5, cd: 8, icon: 'mark', desc: (r) => `Mark the foe you aim at: it takes +${15 + 5 * r}% damage from the whole party for 10 s.` },
  sentry: { role: 'marksman', tier: 2, name: 'Sentry Turret', type: 'active', max: 5, tp: 16, cd: 18, icon: 'turret', desc: (r) => `Deploy a turret for 15 s that fires at foes for ${60 + 10 * r}% weapon damage per shot.` },
  plasmarain: { role: 'marksman', tier: 2, name: 'Plasma Rain', type: 'active', max: 5, tp: 18, cd: 12, icon: 'rain', desc: (r) => `Call a barrage on the target area: 8 strikes for ${70 + 12 * r}% weapon damage each.` },
  overcharge: { role: 'marksman', tier: 2, name: 'Overcharge', type: 'passive', max: 5, icon: 'bolt', desc: (r) => `Ranged hits restore ${(0.4 * r).toFixed(1)} PSI, and your sprite's overdrive charges ${10 * r}% faster.` },
  // Psion
  techmastery: { role: 'psion', tier: 0, name: 'Art Mastery', type: 'passive', max: 5, icon: 'tech', desc: (r) => `+${7 * r}% psionic art damage and healing.` },
  psibolt: { role: 'psion', tier: 0, name: 'Psi Bolt', type: 'active', max: 5, tp: 3, cd: 0.7, icon: 'bolts', desc: (r) => `Loose 3 seeking psi bolts, each for ${45 + 10 * r}% of Ember's power at your level.` },
  manafont: { role: 'psion', tier: 0, name: 'Mana Font', type: 'passive', max: 5, icon: 'font', desc: (r) => `+${15 * r}% PSI regeneration and +${4 * r}% max PSI.` },
  chaincast: { role: 'psion', tier: 1, name: 'Chain Cast', type: 'passive', max: 5, icon: 'chain', desc: (r) => `Attack arts have a ${4 * r}% chance to cast again for free.` },
  barrier: { role: 'psion', tier: 1, name: 'Psi Barrier', type: 'active', max: 5, tp: 15, cd: 16, icon: 'bubble', desc: (r) => `A shield that absorbs damage up to ${20 + 8 * r}% of your max HP for 10 s.` },
  familiar: { role: 'psion', tier: 1, name: 'Familiar', type: 'active', max: 5, tp: 18, cd: 30, icon: 'wisp', desc: (r) => `Summon a psi wisp for 30 s that casts Ember and Jolt at your foes (power ${50 + 10 * r}%).` },
  umbralrite: { role: 'psion', tier: 2, name: 'Umbral Rite', type: 'active', max: 5, tp: 20, cd: 10, icon: 'skull', desc: (r) => `Darkness engulfs the target area for ${220 + 40 * r}% art damage, with a ${3 * r}% chance to kill non-boss foes outright.` },
  meteor: { role: 'psion', tier: 2, name: 'Meteor', type: 'active', max: 5, tp: 28, cd: 14, icon: 'meteor', desc: (r) => `After a moment, a meteor strikes the target for ${400 + 60 * r}% art damage as fire and leaves the ground burning.` },
  techoverflow: { role: 'psion', tier: 2, name: 'Art Overflow', type: 'passive', max: 5, icon: 'star', desc: (r) => `Psionic arts can critically hit: +${4 * r}% chance and +${10 * r}% critical damage.` },
  // Construct snares
  trapburst: { role: 'race', race: 'construct', name: 'Plasma Snare', type: 'active', max: 1, tp: 0, cd: 7, level: 1, icon: 'trap', desc: () => 'Drop a snare that explodes for 250% weapon damage when a foe comes near.' },
  trapfreeze: { role: 'race', race: 'construct', name: 'Frost Snare', type: 'active', max: 1, tp: 0, cd: 10, level: 10, icon: 'trapice', desc: () => 'Drop a snare that freezes nearby foes for 3 s.' },
};
const SKILL_TIER_LEVEL = [1, 8, 16];
const SKILL_TIER_POINTS = [0, 3, 8]; // points spent in the tree before the tier opens

// ---------- items ----------
const RARITY = [
  { id: 'standard', name: 'Standard', color: '#e8e8e8' },
  { id: 'enhanced', name: 'Enhanced', color: '#6aa8ff' },
  { id: 'exotic', name: 'Exotic', color: '#ffe060' },
  { id: 'ensemble', name: 'Ensemble', color: '#58e070' },
  { id: 'legendary', name: 'Legendary', color: '#e8a050' },
  { id: 'relic', name: 'Relic', color: '#ff5a5a' },
];
const WTYPES = {
  blade: { name: 'Blade', cls: 'melee', mult: 1.0, speed: 1.0, range: 2.5, arc: 1.7, targets: 3, tiers: ['Blade', 'Shearblade', 'Duskblade', 'Runeblade', 'Sunblade'] },
  greatblade: { name: 'Greatblade', cls: 'melee', mult: 1.55, speed: 0.72, range: 3.0, arc: 2.5, targets: 6, tiers: ['Greatblade', 'Cleaver', 'Warblade', 'Colossus', 'Worldsplitter'] },
  knives: { name: 'Twin Knives', cls: 'melee', mult: 0.6, speed: 1.6, range: 2.1, arc: 1.5, targets: 2, hits: 2, tiers: ['Twin Knives', 'Fangs', 'Talons', 'Whispers', 'Crescents'] },
  lance: { name: 'Lance', cls: 'melee', mult: 1.15, speed: 0.9, range: 3.7, arc: 0.55, targets: 4, tiers: ['Lance', 'Pike', 'Halberd', 'Skewer', 'Starspear'] },
  chakram: { name: 'Chakram', cls: 'thrown', mult: 0.85, speed: 0.85, range: 10, pierce: 3, proj: 'chakram', tiers: ['Chakram', 'Ringblade', 'Orbiter', 'Halo Disc', 'Eclipse Disc'] },
  pistol: { name: 'Pistol', cls: 'gun', mult: 0.72, speed: 1.3, range: 14, proj: 'bullet', tiers: ['Pistol', 'Sidearm', 'Burner', 'Hand Cannon', 'Lumen Pistol'] },
  rifle: { name: 'Rifle', cls: 'gun', mult: 1.25, speed: 0.72, range: 20, proj: 'beam', pierce: 2, tiers: ['Rifle', 'Longshot', 'Marksrifle', 'Lancer Rifle', 'Starshot'] },
  repeater: { name: 'Repeaters', cls: 'gun', mult: 0.36, speed: 1.0, range: 11, proj: 'bullet', burst: 3, tiers: ['Repeaters', 'Twin Burners', 'Storm Pistols', 'Shredders', 'Hailguns'] },
  scatter: { name: 'Scattergun', cls: 'gun', mult: 0.4, speed: 0.8, range: 9, proj: 'pellet', pellets: 5, spread: 0.55, tiers: ['Scattergun', 'Spreader', 'Thunderbuss', 'Breacher', 'Sunburst'] },
  scepter: { name: 'Scepter', cls: 'melee', mult: 0.92, speed: 0.95, range: 2.5, arc: 1.7, targets: 3, tech: 0.1, tiers: ['Scepter', 'Mace', 'Censer', 'Crozier', 'Regalia'] },
  staff: { name: 'Staff', cls: 'staff', mult: 0.6, speed: 1.0, range: 11, proj: 'orb', tech: 0.15, tiers: ['Staff', 'Spire', 'Conduit', 'Pylon', 'Zenith Staff'] },
  sigil: { name: 'Sigil', cls: 'staff', mult: 0.48, speed: 1.2, range: 10, proj: 'spark', tech: 0.22, tpRegen: 0.6, tiers: ['Sigil', 'Glyph', 'Tome', 'Prism', 'Codex'] },
};
const WTYPE_ORDER = Object.keys(WTYPES);
const FRAME_TIERS = ['Padded Vest', 'Plated Vest', 'Carapace', 'Hardsuit', 'Exoplate', 'Bastion Suit', 'Strider Mail', 'Eclipse Plate', 'Zenith Suit', 'Starforged Plate'];
const BARRIER_TIERS = ['Buckler', 'Ward', 'Aegis Disc', 'Kite Ward', 'Tower Ward', 'Prism Ward', 'Halo Ward', 'Eclipse Ward', 'Zenith Ward', 'Starforged Ward'];
const UNIT_TYPES = {
  power: { name: 'Strength', stat: 'atp', v: 6 }, mind: { name: 'Psyche', stat: 'mst', v: 6 }, guard: { name: 'Guard', stat: 'dfp', v: 6 },
  hit: { name: 'Sight', stat: 'ata', v: 6 }, swift: { name: 'Reflex', stat: 'evp', v: 6 }, heart: { name: 'Vigor', stat: 'hp', v: 14 },
  spirit: { name: 'Psi', stat: 'tp', v: 10 }, luck: { name: 'Fortune', stat: 'lck', v: 4 },
};
const UNIT_GRADES = ['Implant', 'Implant Mk II', 'Implant Mk III', 'Grand Implant', 'Apex Implant'];

// Stat lines an item can carry. `p` marks a fraction shown as a percentage.
const STAT_LABEL = {
  hp: 'HP', tp: 'PSI', atp: 'ATK', dfp: 'DEF', mst: 'PSY', ata: 'ACC', evp: 'EVA', lck: 'LUK',
  dmgPct: { t: 'damage', p: 1 }, techPct: { t: 'psionic art damage', p: 1 }, hpPct: { t: 'max HP', p: 1 }, dfpPct: { t: 'DEF', p: 1 },
  atkSpd: { t: 'attack speed', p: 1 }, moveSpd: { t: 'movement speed', p: 1 }, critCh: { t: 'critical chance', p: 1 }, critDmg: { t: 'critical damage', p: 1 },
  leech: { t: 'of damage dealt returned as HP', p: 1 }, tpLeech: { t: 'of damage dealt returned as PSI', p: 1, s: 0.1 }, mf: { t: 'better chance of rare items', p: 1 }, gf: { t: 'extra credits', p: 1 },
  hpRegen: { t: 'HP per second' }, tpRegen: { t: 'PSI per second' }, thorns: { t: 'damage reflected to attackers' },
  resFire: { t: 'fire resistance', p: 1 }, resIce: { t: 'ice resistance', p: 1 }, resBolt: { t: 'lightning resistance', p: 1 }, resLight: { t: 'light resistance', p: 1 }, resDark: { t: 'dark resistance', p: 1 }, resAll: { t: 'all resistances', p: 1 },
  pbGain: { t: 'overdrive charge', p: 1 }, dmgReduce: { t: 'damage taken reduced', p: 1 }, fireDmg: { t: 'fire damage to attacks' }, iceDmg: { t: 'ice damage to attacks' }, boltDmg: { t: 'lightning damage to attacks' },
  xpPct: { t: 'experience', p: 1 }, tpCost: { t: 'art PSI cost', p: 1 }, cdr: { t: 'skill cooldowns', p: 1 },
};
// Random affixes. v: [min,max] at ilvl 1; flat values scale with item level (sc), percents don't.
const AFFIXES = [
  // prefixes
  { id: 'keen', pre: 'Keen', slots: ['weapon'], stat: 'dmgPct', v: [0.08, 0.2], lvl: 1 },
  { id: 'brutal', pre: 'Brutal', slots: ['weapon'], stat: 'dmgPct', v: [0.22, 0.4], lvl: 20 },
  { id: 'searing', pre: 'Searing', slots: ['weapon'], stat: 'fireDmg', v: [2, 5], sc: 1, lvl: 1 },
  { id: 'frigid', pre: 'Frigid', slots: ['weapon'], stat: 'iceDmg', v: [2, 5], sc: 1, lvl: 3 },
  { id: 'charged', pre: 'Charged', slots: ['weapon'], stat: 'boltDmg', v: [1, 7], sc: 1, lvl: 5 },
  { id: 'siphoning', pre: 'Siphoning', slots: ['weapon', 'unit'], stat: 'leech', v: [0.02, 0.05], lvl: 6 },
  { id: 'draining', pre: 'Draining', slots: ['weapon', 'unit'], stat: 'tpLeech', v: [0.03, 0.08], lvl: 6 },
  { id: 'accurate', pre: 'Accurate', slots: ['weapon', 'unit'], stat: 'ata', v: [4, 10], sc: 1, lvl: 1 },
  { id: 'swift', pre: 'Quick', slots: ['weapon', 'unit'], stat: 'atkSpd', v: [0.06, 0.15], lvl: 8 },
  { id: 'mystic', pre: 'Mystic', slots: ['weapon', 'unit', 'barrier'], stat: 'techPct', v: [0.06, 0.18], lvl: 4 },
  { id: 'mighty', pre: 'Mighty', slots: ['unit', 'frame', 'barrier'], stat: 'atp', v: [3, 8], sc: 1, lvl: 1 },
  { id: 'mindful', pre: 'Mindful', slots: ['unit', 'frame', 'barrier', 'weapon'], stat: 'mst', v: [3, 8], sc: 1, lvl: 1 },
  { id: 'sturdy', pre: 'Sturdy', slots: ['frame', 'barrier'], stat: 'dfpPct', v: [0.1, 0.3], lvl: 1 },
  { id: 'warded', pre: 'Warded', slots: ['frame', 'barrier', 'unit'], stat: 'dmgReduce', v: [0.02, 0.06], lvl: 12 },
  { id: 'vital', pre: 'Vital', slots: ['frame', 'barrier', 'unit'], stat: 'hp', v: [10, 22], sc: 1, lvl: 1 },
  { id: 'spirited', pre: 'Spirited', slots: ['frame', 'barrier', 'unit', 'weapon'], stat: 'tp', v: [6, 14], sc: 1, lvl: 1 },
  { id: 'lucky', pre: 'Lucky', slots: ['unit', 'barrier'], stat: 'lck', v: [2, 6], sc: 0.5, lvl: 3 },
  { id: 'thorned', pre: 'Thorned', slots: ['frame', 'barrier'], stat: 'thorns', v: [3, 8], sc: 1, lvl: 5 },
  // suffixes
  { id: 'vigor', suf: 'of Vigor', slots: ['frame', 'barrier', 'unit', 'weapon'], stat: 'hpPct', v: [0.05, 0.12], lvl: 1 },
  { id: 'clarity', suf: 'of Clarity', slots: ['frame', 'barrier', 'unit', 'weapon'], stat: 'mst', v: [3, 7], sc: 1, lvl: 1 },
  { id: 'grace', suf: 'of Grace', slots: ['frame', 'barrier', 'unit'], stat: 'evp', v: [4, 10], sc: 1, lvl: 1 },
  { id: 'sight', suf: 'of Sight', slots: ['weapon', 'unit', 'frame'], stat: 'ata', v: [4, 10], sc: 1, lvl: 1 },
  { id: 'strength', suf: 'of Strength', slots: ['weapon', 'unit', 'frame'], stat: 'atp', v: [3, 7], sc: 1, lvl: 1 },
  { id: 'flame', suf: 'of Embers', slots: ['frame', 'barrier', 'unit'], stat: 'resFire', v: [0.1, 0.25], lvl: 1 },
  { id: 'frost', suf: 'of Frost', slots: ['frame', 'barrier', 'unit'], stat: 'resIce', v: [0.1, 0.25], lvl: 1 },
  { id: 'storm', suf: 'of Storms', slots: ['frame', 'barrier', 'unit'], stat: 'resBolt', v: [0.1, 0.25], lvl: 1 },
  { id: 'dawn', suf: 'of Dawn', slots: ['frame', 'barrier', 'unit'], stat: 'resLight', v: [0.1, 0.25], lvl: 5 },
  { id: 'dusk', suf: 'of Dusk', slots: ['frame', 'barrier', 'unit'], stat: 'resDark', v: [0.1, 0.25], lvl: 5 },
  { id: 'colony', suf: 'of the Colony', slots: ['frame', 'barrier', 'unit'], stat: 'resAll', v: [0.06, 0.14], lvl: 14 },
  { id: 'haste', suf: 'of Haste', slots: ['frame', 'unit'], stat: 'moveSpd', v: [0.05, 0.12], lvl: 6 },
  { id: 'regen', suf: 'of Mending', slots: ['frame', 'barrier', 'unit'], stat: 'hpRegen', v: [0.5, 1.5], sc: 1, lvl: 4 },
  { id: 'focus', suf: 'of Focus', slots: ['frame', 'barrier', 'unit', 'weapon'], stat: 'tpRegen', v: [0.3, 0.9], sc: 0.6, lvl: 4 },
  { id: 'fortune', suf: 'of Fortune', slots: ['unit', 'barrier', 'frame'], stat: 'mf', v: [0.1, 0.3], lvl: 3 },
  { id: 'plenty', suf: 'of Plenty', slots: ['unit', 'barrier', 'frame'], stat: 'gf', v: [0.15, 0.4], lvl: 1 },
  { id: 'precision', suf: 'of Precision', slots: ['weapon', 'unit'], stat: 'critCh', v: [0.03, 0.07], lvl: 5 },
  { id: 'ruin', suf: 'of Ruin', slots: ['weapon', 'unit'], stat: 'critDmg', v: [0.15, 0.35], lvl: 10 },
  { id: 'wisdom', suf: 'of Wisdom', slots: ['unit', 'frame', 'barrier'], stat: 'xpPct', v: [0.04, 0.1], lvl: 8 },
  { id: 'channel', suf: 'of Channeling', slots: ['weapon', 'unit'], stat: 'tpCost', v: [-0.06, -0.14], lvl: 10 },
  { id: 'resonance', suf: 'of Resonance', slots: ['unit', 'weapon'], stat: 'pbGain', v: [0.1, 0.25], lvl: 6 },
  { id: 'tempo', suf: 'of Tempo', slots: ['unit', 'frame'], stat: 'cdr', v: [0.05, 0.12], lvl: 12 },
];
const RARE_NAME_A = ['Grim', 'Lumen', 'Rift', 'Dusk', 'Storm', 'Hollow', 'Blood', 'Star', 'Ash', 'Void', 'Ember', 'Bone', 'Pale', 'Iron', 'Wraith', 'Sun', 'Moon', 'Doom', 'Ghost', 'Oath'];
const RARE_NAME_B = { weapon: ['Fang', 'Song', 'Bite', 'Edge', 'Spite', 'Thorn', 'Call', 'Reaver', 'Kiss', 'Wail'], frame: ['Shell', 'Hide', 'Mantle', 'Carapace', 'Ward', 'Coat'], barrier: ['Aegis', 'Wall', 'Bulwark', 'Veil', 'Guard', 'Halo'], unit: ['Heart', 'Eye', 'Coil', 'Spark', 'Knot', 'Sigil'] };

// Legendaries: fixed bases and stats. Fields: slot, base (weapon type / unit type), lvl, stats {...}, effect
const UNIQUES = [
  { id: 'colonistShroud', name: "Shroud of the Last Colonist", slot: 'frame', lvl: 4, stats: { hpPct: 0.2, resAll: 0.12, hpRegen: 2 }, flavor: "Found folded on an empty cot in the Founders' Spire." },
  { id: 'emberFang', name: 'Emberfang', slot: 'weapon', base: 'knives', lvl: 6, stats: { dmgPct: 0.35, fireDmg: 12, atkSpd: 0.12 }, special: 'ignite', flavor: 'Still warm.' },
  { id: 'chorusRod', name: 'Chorus of Ash', slot: 'weapon', base: 'staff', lvl: 10, stats: { techPct: 0.3, mst: 20, tpRegen: 2 }, special: 'psiphon', flavor: 'It hums when held near the ruins.' },
  { id: 'wardensBarrier', name: "Warden's Oath", slot: 'barrier', lvl: 12, stats: { dfpPct: 0.4, thorns: 20, hp: 60 }, flavor: 'The first security chief never left his post.' },
  { id: 'gloamRifle', name: 'Gloam Sight', slot: 'weapon', base: 'rifle', lvl: 15, stats: { dmgPct: 0.4, critCh: 0.1, critDmg: 0.5 }, special: 'shackle', flavor: 'Sees through smoke, and through people.' },
  { id: 'stitchedHeart', name: 'Stitched Heart', slot: 'unit', base: 'heart', lvl: 18, stats: { hp: 120, leech: 0.04, hpRegen: 4 }, flavor: 'It beats. Do not ask whose.' },
  { id: 'custodianEye', name: "Custodian's Eye", slot: 'unit', base: 'hit', lvl: 20, stats: { ata: 40, critCh: 0.08, mf: 0.3 }, flavor: 'Torn out of a dead machine. Still watching.' },
  { id: 'sunderblade', name: 'Sunderblade', slot: 'weapon', base: 'greatblade', lvl: 22, stats: { dmgPct: 0.5, atp: 40, hpPct: 0.1 }, special: 'frenzy', flavor: 'Heavier than it looks, lighter than it should be.' },
  { id: 'paleMantle', name: 'Pale Mantle', slot: 'frame', lvl: 26, stats: { resDark: 0.4, mst: 35, techPct: 0.15, tpCost: -0.15 }, flavor: 'Woven from something that is not cloth.' },
  { id: 'hungerChain', name: 'Hunger Chain', slot: 'weapon', base: 'repeater', lvl: 28, stats: { dmgPct: 0.4, leech: 0.05, atkSpd: 0.2 }, special: 'siphon', flavor: 'Three barrels, one appetite.' },
  { id: 'starlessSigil', name: 'Starless Sigil', slot: 'unit', base: 'spirit', lvl: 30, stats: { tp: 80, tpRegen: 4, cdr: 0.15, pbGain: 0.3 }, flavor: 'The constellations on it are not in our sky.' },
  { id: 'kharzaelVeil', name: "Kharzael's Veil", slot: 'barrier', lvl: 34, stats: { resAll: 0.25, dmgReduce: 0.1, evp: 50 }, flavor: 'It remembers being worn.' },
];
// Sets: 4 pieces each, bonuses at 2 and 4 pieces.
const SETS = {
  wayfarer: { name: "Wayfarer's Resolve", pieces: [
    { id: 'wayfarerFrame', name: "Wayfarer's Coat", slot: 'frame', lvl: 8 }, { id: 'wayfarerBarrier', name: "Wayfarer's Buckler", slot: 'barrier', lvl: 8 },
    { id: 'wayfarerUnit', name: "Wayfarer's Badge", slot: 'unit', base: 'guard', lvl: 8 }, { id: 'wayfarerBlade', name: "Wayfarer's Edge", slot: 'weapon', base: 'blade', lvl: 8 }],
    bonus: { 2: { hpPct: 0.12, dfpPct: 0.15 }, 4: { dmgPct: 0.25, resAll: 0.15, hpRegen: 3 } } },
  gunner: { name: "Gunner's Creed", pieces: [
    { id: 'gunnerFrame', name: "Gunner's Duster", slot: 'frame', lvl: 16 }, { id: 'gunnerBarrier', name: "Gunner's Plate", slot: 'barrier', lvl: 16 },
    { id: 'gunnerUnit', name: "Gunner's Scope", slot: 'unit', base: 'hit', lvl: 16 }, { id: 'gunnerRifle', name: "Gunner's Longshot", slot: 'weapon', base: 'rifle', lvl: 16 }],
    bonus: { 2: { critCh: 0.06, ata: 30 }, 4: { dmgPct: 0.3, atkSpd: 0.15, critDmg: 0.4 } } },
  archon: { name: "Archon's Mantle", pieces: [
    { id: 'archonFrame', name: "Archon's Robe", slot: 'frame', lvl: 24 }, { id: 'archonBarrier', name: "Archon's Orb", slot: 'barrier', lvl: 24 },
    { id: 'archonUnit', name: "Archon's Focus", slot: 'unit', base: 'mind', lvl: 24 }, { id: 'archonWand', name: "Archon's Codex", slot: 'weapon', base: 'sigil', lvl: 24 }],
    bonus: { 2: { techPct: 0.15, tpRegen: 3 }, 4: { techPct: 0.25, tpCost: -0.2, hpPct: 0.15 } } },
};
// Relics: hand-made weapons with a special attack. sid: star signs that find them more often.
const RELICS = [
  { id: 'lunarFang', name: 'Lunar Fang', base: 'knives', lvl: 5, mult: 1.6, special: 'frostbite', attrs: { wild: 20 }, grind: 15, sid: ['lyre', 'hound'], flavor: 'Twin crescents that glow brighter in the dark.' },
  { id: 'emberheart', name: 'Emberheart', base: 'blade', lvl: 4, mult: 1.55, special: 'ignite', attrs: { wild: 15, burrow: 15 }, grind: 20, sid: ['crown', 'wheel'], flavor: 'Its blade burns red instead of blue.' },
  { id: 'verdantSpire', name: 'Verdant Spire', base: 'staff', lvl: 5, mult: 1.5, special: 'psiphon', attrs: { wild: 25 }, grind: 15, sid: ['tide', 'thorn'], tech: 0.25, flavor: 'A sapling grown into a staff.' },
  { id: 'larkLauncher', name: 'Lark Launcher', base: 'scatter', lvl: 6, mult: 1.7, special: 'shackle', attrs: { keen: 15 }, grind: 25, sid: ['lantern', 'veil'], flavor: 'Fires something that sounds like birdsong.' },
  { id: 'rotwingFang', name: 'Rotwing Fang', base: 'greatblade', lvl: 7, mult: 1.6, special: 'ignite', attrs: { wild: 30 }, grind: 20, sid: ['anvil', 'wheel'], boss: 'vharn', flavor: 'A tooth from the forest dragon, edged with plasma.' },
  { id: 'rotwingScale', name: 'Rotwing Scale', base: 'scepter', lvl: 7, mult: 1.6, special: 'siphon', attrs: { wild: 30 }, grind: 20, sid: ['lyre', 'tide', 'thorn'], boss: 'vharn', tech: 0.2, flavor: 'Still shimmers green.' },
  { id: 'cinderCoil', name: 'Cinder Coil', base: 'repeater', lvl: 10, mult: 1.6, special: 'ignite', attrs: { burrow: 25 }, grind: 25, sid: ['serpent', 'hound'], flavor: 'Three barrels wound in molten wire.' },
  { id: 'hollowsong', name: 'Hollowsong', base: 'sigil', lvl: 11, mult: 1.55, special: 'psiphon', attrs: { burrow: 20, eldritch: 10 }, grind: 15, sid: ['thorn', 'tide'], tech: 0.3, flavor: 'Whistles a tune no one taught it.' },
  { id: 'magmaHalo', name: 'Magma Halo', base: 'chakram', lvl: 10, mult: 1.6, special: 'ignite', attrs: { burrow: 30 }, grind: 20, sid: ['lantern'], flavor: 'A disc of cooled lava that refuses to stay cool.' },
  { id: 'mawsTongue', name: "Maw's Tongue", base: 'lance', lvl: 13, mult: 1.7, special: 'siphon', attrs: { burrow: 35 }, grind: 25, sid: ['anvil', 'veil'], boss: 'maw', flavor: 'It twitches when you are hungry.' },
  { id: 'mawsTooth', name: "Maw's Tooth", base: 'pistol', lvl: 13, mult: 1.7, special: 'reaper', attrs: { burrow: 35 }, grind: 25, sid: ['thorn', 'veil', 'crown'], boss: 'maw', flavor: 'Loaded with something sharp and alive.' },
  { id: 'railLancer', name: 'Rail Lancer', base: 'rifle', lvl: 17, mult: 1.6, special: 'overload', attrs: { mech: 30, keen: 10 }, grind: 30, sid: ['crown', 'serpent'], flavor: 'Built from a mining rail driver.' },
  { id: 'gearbreaker', name: 'Gearbreaker', base: 'greatblade', lvl: 16, mult: 1.6, special: 'overload', attrs: { mech: 35 }, grind: 25, sid: ['anvil', 'wheel'], flavor: 'Made for opening machines that do not want to be opened.' },
  { id: 'voltScepter', name: 'Volt Scepter', base: 'scepter', lvl: 18, mult: 1.55, special: 'overload', attrs: { mech: 30 }, grind: 20, sid: ['lyre', 'wheel'], tech: 0.2, flavor: 'Sparks on every swing.' },
  { id: 'custodianCore', name: "Custodian's Core", base: 'staff', lvl: 20, mult: 1.7, special: 'shackle', attrs: { mech: 40 }, grind: 25, sid: ['tide'], boss: 'custodian', tech: 0.3, flavor: 'Its thoughts are very loud.' },
  { id: 'custodianArms', name: 'Custodian Arms', base: 'repeater', lvl: 20, mult: 1.7, special: 'overload', attrs: { mech: 40 }, grind: 30, sid: ['hound', 'serpent', 'lantern'], boss: 'custodian', flavor: 'Torn off the Custodian and rewired for human hands.' },
  { id: 'penitentsRest', name: "Penitent's Rest", base: 'blade', lvl: 23, mult: 1.6, special: 'reaper', attrs: { eldritch: 35 }, grind: 25, sid: ['crown', 'anvil'], flavor: 'Gives them what they were praying for.' },
  { id: 'nightlance', name: 'Nightlance', base: 'lance', lvl: 24, mult: 1.65, special: 'siphon', attrs: { eldritch: 30, keen: 10 }, grind: 25, sid: ['veil', 'anvil'], flavor: 'Taken from a lancer that would not stay down.' },
  { id: 'choirsEcho', name: "Choir's Echo", base: 'sigil', lvl: 25, mult: 1.6, special: 'psiphon', attrs: { eldritch: 30 }, grind: 20, sid: ['thorn', 'lyre'], tech: 0.35, flavor: 'Plays back the last thing it heard.' },
  { id: 'veilpiercer', name: 'Veilpiercer', base: 'pistol', lvl: 24, mult: 1.6, special: 'shackle', attrs: { eldritch: 30, keen: 15 }, grind: 30, sid: ['thorn', 'veil'], flavor: 'Finds what hides.' },
  { id: 'sleeperBane', name: 'Sleeperbane', base: 'greatblade', lvl: 28, mult: 1.85, special: 'reaper', attrs: { eldritch: 45 }, grind: 35, sid: ['anvil', 'wheel', 'crown'], boss: 'sleeper', flavor: 'Forged to end a dream.' },
  { id: 'starlessRifle', name: 'Starless Night', base: 'rifle', lvl: 28, mult: 1.85, special: 'siphon', attrs: { eldritch: 45, keen: 20 }, grind: 35, sid: ['serpent', 'crown', 'hound'], boss: 'sleeper', flavor: 'Every shot leaves a hole in the sky.' },
  { id: 'heartOfKharzael', name: 'Heart of Kharzael', base: 'staff', lvl: 28, mult: 1.85, special: 'psiphon', attrs: { eldritch: 45 }, grind: 30, sid: ['tide', 'lyre', 'thorn'], boss: 'sleeper', tech: 0.45, flavor: 'Still dreaming.' },
  { id: 'wakeChakram', name: 'Wake of Veyra', base: 'chakram', lvl: 28, mult: 1.85, special: 'frostbite', attrs: { eldritch: 45 }, grind: 35, sid: ['lantern', 'veil'], boss: 'sleeper', flavor: 'Throws a little of the planet with it.' },
];
const SPECIALS = {
  ignite: { name: 'Ignite', desc: 'fire damage and sets foes ablaze', elem: 'fire' },
  frostbite: { name: 'Frostbite', desc: 'ice damage and can freeze', elem: 'ice' },
  overload: { name: 'Overload', desc: 'lightning damage and can paralyse', elem: 'bolt' },
  siphon: { name: 'Siphon', desc: 'heals you for a share of the damage' },
  psiphon: { name: 'Psiphon', desc: 'restores PSI on hit' },
  reaper: { name: 'Reaper', desc: 'chance to kill a non-boss foe outright' },
  shackle: { name: 'Shackle', desc: 'paralyses foes' },
  frenzy: { name: 'Frenzy', desc: 'deals double damage at a cost of HP' },
};
const SPECIAL_ORDER = Object.keys(SPECIALS);

// Consumables and other stackables. Prices are base credits.
const TOOLS = {
  medgel1: { name: 'Minor Medgel', desc: 'Restores 25% HP.', price: 50, stack: 10, color: 0x60e070, use: 'heal', v: 0.25 },
  medgel2: { name: 'Medgel', desc: 'Restores 50% HP.', price: 300, stack: 10, color: 0x60e070, use: 'heal', v: 0.5, lvl: 10 },
  medgel3: { name: 'Full Medgel', desc: 'Restores all HP.', price: 1500, stack: 10, color: 0x60e070, use: 'heal', v: 1, lvl: 25 },
  psicell1: { name: 'Minor Psi Cell', desc: 'Restores 25% PSI.', price: 80, stack: 10, color: 0x60a0ff, use: 'tp', v: 0.25 },
  psicell2: { name: 'Psi Cell', desc: 'Restores 50% PSI.', price: 400, stack: 10, color: 0x60a0ff, use: 'tp', v: 0.5, lvl: 10 },
  psicell3: { name: 'Full Psi Cell', desc: 'Restores all PSI.', price: 2000, stack: 10, color: 0x60a0ff, use: 'tp', v: 1, lvl: 25 },
  purgeSpray: { name: 'Purge Spray', desc: 'Cures poison, burns, freezing and paralysis.', price: 300, stack: 10, color: 0xffe060, use: 'cure' },
  reviveShot: { name: 'Revive Shot', desc: 'Revives a fallen ally, or yourself.', price: 500, stack: 10, color: 0xe0e0ff, use: 'revive' },
  restorer: { name: 'Field Restorer', desc: 'Fully restores the whole party.', price: 5000, stack: 10, color: 0xffd0ff, use: 'party' },
  beacon: { name: 'Recall Beacon', desc: 'Opens a portal back to the ship that stays open for your return.', price: 120, stack: 10, color: 0x80ffff, use: 'portal' },
  lifeCharm: { name: 'Lifeward Charm', desc: 'If you fall, you are revived automatically. Consumed on use.', price: 10000, stack: 1, color: 0xff80c0, use: 'none' },
  hone1: { name: 'Hone Kit', desc: 'The Artificer uses it to hone a weapon +1.', price: 600, stack: 99, color: 0xc0c0c0, use: 'none', grind: 1 },
  hone2: { name: 'Hone Kit II', desc: 'The Artificer uses it to hone a weapon +2.', price: 2400, stack: 99, color: 0xc0c0c0, use: 'none', grind: 2, lvl: 15 },
  hone3: { name: 'Hone Kit III', desc: 'The Artificer uses it to hone a weapon +3.', price: 9000, stack: 99, color: 0xc0c0c0, use: 'none', grind: 3, lvl: 30 },
  strTonic: { name: 'Strength Tonic', desc: 'Permanently raises ATK by 2.', price: 3000, stack: 99, color: 0xff6060, use: 'mat', stat: 'atp', v: 2 },
  psyTonic: { name: 'Psyche Tonic', desc: 'Permanently raises PSY by 2.', price: 3000, stack: 99, color: 0x6080ff, use: 'mat', stat: 'mst', v: 2 },
  defTonic: { name: 'Guard Tonic', desc: 'Permanently raises DEF by 2.', price: 3000, stack: 99, color: 0xa0a0a0, use: 'mat', stat: 'dfp', v: 2 },
  evaTonic: { name: 'Reflex Tonic', desc: 'Permanently raises EVA by 2.', price: 3000, stack: 99, color: 0x60e0c0, use: 'mat', stat: 'evp', v: 2 },
  vigTonic: { name: 'Vigor Tonic', desc: 'Permanently raises max HP by 4.', price: 3000, stack: 99, color: 0x60e070, use: 'mat', stat: 'hp', v: 4 },
  psiTonic: { name: 'Psi Tonic', desc: 'Permanently raises max PSI by 4.', price: 3000, stack: 99, color: 0x60a0ff, use: 'mat', stat: 'tp', v: 4 },
  luckTonic: { name: 'Fortune Tonic', desc: 'Permanently raises LUK by 2.', price: 3000, stack: 99, color: 0xffe060, use: 'mat', stat: 'lck', v: 2 },
};
const MAT_CAP = 120; // total tonics a character can absorb
// Psi crystals for sockets: tier 1..3. On weapons and on armour they give different stats.
const GEMS = {
  ruby: { name: 'Ruby', color: 0xff3a50, weapon: { fireDmg: [4, 12, 28] }, armor: { resFire: [0.08, 0.14, 0.22] } },
  sapphire: { name: 'Sapphire', color: 0x3a70ff, weapon: { iceDmg: [4, 12, 28] }, armor: { resIce: [0.08, 0.14, 0.22] } },
  topaz: { name: 'Topaz', color: 0xffd040, weapon: { boltDmg: [4, 12, 28] }, armor: { lck: [3, 7, 12] } },
  emerald: { name: 'Emerald', color: 0x40e070, weapon: { ata: [6, 14, 26] }, armor: { hpRegen: [1, 2.5, 5] } },
  amethyst: { name: 'Amethyst', color: 0xb050ff, weapon: { leech: [0.01, 0.02, 0.035] }, armor: { tp: [10, 25, 50] } },
  diamond: { name: 'Diamond', color: 0xf0f8ff, weapon: { critDmg: [0.1, 0.2, 0.35] }, armor: { resAll: [0.04, 0.08, 0.12] } },
};
const GEM_TIERS = ['Chipped', 'Flawless', 'Radiant'];

// ---------- sprites (companion drones) ----------
const SPRITE_FORMS = {
  sprite: { name: 'Sprite', tier: 0, color: 0xc8d0e0, shape: 'pod' },
  flint: { name: 'Flint', tier: 1, role: 'vanguard', color: 0xe06040, shape: 'wing', pb: 'nova' },
  glint: { name: 'Glint', tier: 1, role: 'marksman', color: 0x40c0e0, shape: 'ring', pb: 'tempest' },
  murmur: { name: 'Murmur', tier: 1, role: 'psion', color: 0xa070f0, shape: 'orb', pb: 'seraph' },
  bastion: { name: 'Bastion', tier: 2, stat: 'def', color: 0x9aa8b8, shape: 'shell', pb: 'aegis' },
  fury: { name: 'Fury', tier: 2, stat: 'pow', color: 0xff5a40, shape: 'wing', pb: 'nova' },
  zephyr: { name: 'Zephyr', tier: 2, stat: 'dex', color: 0x50e0a0, shape: 'ring', pb: 'tempest' },
  oracle: { name: 'Oracle', tier: 2, stat: 'mind', color: 0x7090ff, shape: 'orb', pb: 'seraph' },
  paragon: { name: 'Paragon', tier: 3, role: 'vanguard', color: 0xffc040, shape: 'crown', pb: 'aegis' },
  polaris: { name: 'Polaris', tier: 3, role: 'marksman', color: 0x80f0ff, shape: 'crown', pb: 'nova' },
  nimbus: { name: 'Nimbus', tier: 3, role: 'psion', color: 0xff80f0, shape: 'crown', pb: 'tempest' },
};
const SPRITE_EVOLVE = [10, 35, 60];
const SPRITE_STAT_NAMES = { def: 'Guard', pow: 'Might', dex: 'Agility', mind: 'Insight' };
// overdrives: what a fully charged sprite unleashes
const PBS = {
  nova: { name: 'Nova Burst', desc: 'A plasma explosion around you for heavy damage.' },
  tempest: { name: 'Seeker Swarm', desc: 'A swarm of seeking plasma missiles.' },
  seraph: { name: 'Seraph Rain', desc: 'Fully restores the party\'s HP and half their PSI.' },
  aegis: { name: 'Aegis Field', desc: 'The party is invulnerable for 6 s and regenerates HP.' },
};
// stat gains per feeding (guard, might, agility, insight, bond, wit)
const SPRITE_FEED = {
  medgel1: [0.06, 0.32, 0.06, 0, 2, 1], medgel2: [0.12, 0.5, 0.12, 0, 3, 2], medgel3: [0.2, 0.7, 0.2, 0.05, 4, 3],
  psicell1: [0.06, 0, 0.06, 0.32, 2, 1], psicell2: [0.12, 0, 0.12, 0.5, 3, 2], psicell3: [0.2, 0.05, 0.2, 0.7, 4, 3],
  purgeSpray: [0.4, 0.05, 0.1, 0.05, 3, 3], reviveShot: [0.15, 0.1, 0.4, 0.1, 4, 4], restorer: [0.5, 0.5, 0.5, 0.5, 8, 8],
  beacon: [0.1, 0.1, 0.25, 0.1, 2, 2], hone1: [0.35, 0.2, 0, 0, 1, 2], lifeCharm: [1, 1, 1, 1, 10, 10],
};
const SPRITE_FEED_CD = 40; // seconds between feedings

// ---------- the ship ----------
const NPCS = {
  commander: { name: 'Commander Hale', role: 'Expedition Command', color: 0x3a4a6a, hair: 0x9a9a9a },
  shop: { name: 'Mira', role: 'Quartermaster', color: 0x3fae8a, hair: 0x2a2018 },
  artificer: { name: 'Old Bram', role: 'Artificer', color: 0x8a5a30, hair: 0xf0f0f0 },
  bank: { name: 'Ledger', role: 'Vault', color: 0x5a6470, construct: true },
  bureau: { name: 'Juno', role: "Wardens' Bureau", color: 0xd0a040, hair: 0xd04a30 },
  spritelab: { name: 'Dr. Pell', role: 'Sprite Lab', color: 0xe8e8e8, hair: 0x5a8ae0 },
  lobby: { name: 'Crew Terminal', role: 'Recruit wardens', color: 0x40c8c8, terminal: true },
  medic: { name: 'Ines', role: 'Medbay', color: 0xe8e8f0, hair: 0x7a4a28 },
  teleporter: { name: 'Teleporter', role: 'Descend to Veyra', terminal: true },
};

// ---------- allies ----------
const ALLY_NAMES = ['Kiro', 'Ash', 'Nova', 'Sela', 'Ronan', 'Mina', 'Zed', 'Lyra', 'Tobin', 'Vesper', 'Orrin', 'Pip', 'Juna', 'Dax', 'Rook', 'Iris', 'Fenn', 'Talia', 'Brix', 'Wren', 'Coda', 'Marlo', 'Echo', 'Sumi'];
const ALLY_LINES = {
  cheerful: { start: ['Let\'s go, team!', 'Veyra, here we come!', 'Stay close, I\'ll cover you!'], kill: ['Got one!', 'Nice!', 'Yay!'], rare: ['Ooh, a relic!', 'Look at that glow! Lucky us!'], hurt: ['Ouch!', 'A little help?'], heal: ['Healing up!', 'Mending!'], level: ['Level up! Woohoo!'], boss: ['That thing is huge!', 'We can do this!'], down: ['I\'m down... sorry!'], revive: ['Back in action!'], idle: ['*laughs*', 'This place is pretty... in a creepy way.', 'Anyone need a medgel?'], clear: ['Room clear!', 'All done here!'], combo: ['Great combo!'] },
  stoic: { start: ['Stay sharp.', 'Moving out.'], kill: ['Down.', 'Target eliminated.'], rare: ['Relic.', 'Something good dropped.'], hurt: ['Taking damage.'], heal: ['Restoring.'], level: ['Stronger.'], boss: ['Focus fire.', 'This is it.'], down: ['I\'m down.'], revive: ['Thanks.'], idle: ['...', 'Keep moving.'], clear: ['Clear.', 'Area secure.'], combo: ['Good timing.'] },
  snarky: { start: ['Another lovely day on the death planet.', 'Try not to step in anything.'], kill: ['Too easy.', 'Next!', 'Is that all?'], rare: ['Finally, something shiny.', 'Mine. Kidding. Mostly.'], hurt: ['Rude!', 'Hey, watch it!'], heal: ['Fine, I\'ll heal you.'], level: ['About time.'], boss: ['Oh good, a big one.', 'Who feeds these things?'], down: ['Well, this is embarrassing.'], revive: ['I meant to do that.'], idle: ['*sighs*', 'Are we lost? We\'re lost.', 'I could be on the ship right now.'], clear: ['That\'s that.', 'Clear. You\'re welcome.'], combo: ['Show-off.'] },
};
const PERSONALITIES = Object.keys(ALLY_LINES);

// ---------- story ----------
const STORY = {
  intro: [
    'Seven years ago the colony ship Halcyon set down its first settlers on the planet Veyra.',
    'Last month the Meridian arrived in orbit to join them. As it did, the Founders\' Spire on the surface erupted in violet light.',
    'Nobody on the ground has answered since. The Wardens\' Bureau is sending people down.',
    'You are one of them.',
  ],
  commander: [
    'You\'re the new warden. Good. We need every one we can get.',
    'The woods around the Founders\' Spire have turned on us. The animals are rabid, and they don\'t stay dead.',
    'Find out what happened down there. Take the teleporter when you\'re ready, and see Juno at the Bureau if you want paid contracts.',
  ],
  after: {
    forest: 'The dragon... it was one of the colony\'s survey animals, swollen into that. Something under the woods is changing them. The scanners show tunnels: the Cinder Hollows. Go down.',
    caves: 'Mining tunnels beyond the Hollows go deeper than any record we have. The colony AI ran them. Its signal is still active, and it is not friendly.',
    mines: 'Under the Deepworks there\'s a structure. Not ours. Not anyone\'s. The miners found it, and the machines tried to wall it up again. Whatever is down there, end it.',
    ruins: 'It\'s over. The Sleeper is gone, and the surface has gone quiet. For now. The Bureau will keep paying wardens who go back down. Something tells me Veyra is not finished with us.',
  },
  // echo logs left by Captain Liss Varo of the colony guard
  capsules: {
    forest: ['Liss Varo, colony guard. Day 1. The Spire lit up like a torch. Something under it howled. I\'m going after the survivors.',
      'Varo. The animals are wrong. Their eyes glow the same violet as the light from the Spire.',
      'Varo. I found the survey dragon. It knew my name. I don\'t know how.'],
    caves: ['Varo. The heat down here isn\'t volcanic. It comes from below, pulsing, like breathing.',
      'Varo. The colony dug these tunnels looking for power. They found it. It found them.',
      'Varo. Something huge moves through the rock. I can hear it hunting.'],
    mines: ['Varo. The colony AI sealed the lower levels. It isn\'t mad. It\'s scared.',
      'Varo. CUSTODIAN left a log: "Containment outranks colonist safety." Containment of what?',
      'Varo. There are doors down here that weren\'t built by people.'],
    ruins: ['Varo. A cathedral. Under a planet nobody had ever set foot on. The walls carry a language I can read without learning it.',
      'Varo. It\'s called Kharzael. It was sealed here before this world had a sun. The colony woke it.',
      'Varo. If you\'re hearing this, warden: I\'m sorry. I couldn\'t finish it. You\'ll have to.'],
  },
};
const LOADING_TIPS = [
  'Tap attack again just as a swing ends for a perfectly timed combo hit.',
  'Heavy attacks hit harder but miss more often. Specials cost a little PSI and trigger your weapon\'s special.',
  'Feed your sprite medgels and psi cells to grow its stats. It evolves at levels 10, 35 and 60.',
  'Red beams mark relics. Take them to the Artificer to find out what they are.',
  'Your star sign decides which relics you find most often.',
  'A Recall Beacon or the Recall art opens a portal home. Step through it again to return where you left off.',
  'Each area\'s monsters have a family: Wild, Burrower, Mech or Eldritch. Weapons tuned to a family hit it harder.',
  'Doors seal while monsters are in the room. Clear them all to open the way.',
];
