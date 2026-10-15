// Revenant Protocol — weapons, items, enemies and mission text

// Slot keys 1..0. `ammo` names a pool in AMMO_MAX; thermal charges and mines are their own ammo.
const WEAPONS = [
  { id: 'fists', key: 'Digit1', name: 'FISTS', kind: 'melee', rate: 0.42, dmg: 14, range: 1.9 },
  { id: 'pistol', key: 'Digit2', name: 'DL-7 SIDEARM', ammo: 'energy', cost: 1, rate: 0.4, kind: 'bolt', dmg: 15, speed: 60, spread: 0.004, color: 0xff3a24 },
  { id: 'carbine', key: 'Digit3', name: 'LR-4 CARBINE', ammo: 'energy', cost: 2, rate: 0.17, kind: 'bolt', dmg: 11, speed: 60, spread: 0.028, color: 0xff3a24 },
  { id: 'thermal', key: 'Digit4', name: 'THERMAL CHARGE', ammo: 'thermal', cost: 1, rate: 0.75, kind: 'throw', dmg: 95, radius: 4.8,
    alt: { impact: true } },
  { id: 'repeater', key: 'Digit5', name: 'REPEATER', ammo: 'power', cost: 1, rate: 0.1, kind: 'bolt', dmg: 9, speed: 62, spread: 0.035, color: 0x7dff4a,
    alt: { cost: 3, rate: 0.42, count: 3, fan: 0.07 } },
  { id: 'fusion', key: 'Digit6', name: 'FUSION CUTTER', ammo: 'power', cost: 1, rate: 0.15, kind: 'bolt', dmg: 16, speed: 52, spread: 0.012, color: 0xffa21e,
    alt: { cost: 4, rate: 0.6, count: 4, fan: 0.045 } },
  { id: 'mine', key: 'Digit7', name: 'PROXIMITY MINE', ammo: 'mines', cost: 1, rate: 0.8, kind: 'mine', dmg: 120, radius: 4.8, alt: { timed: true } },
  { id: 'mortar', key: 'Digit8', name: 'MORTAR LAUNCHER', ammo: 'mortar', cost: 1, rate: 1.0, kind: 'mortar', dmg: 100, radius: 5.2 },
  { id: 'concussion', key: 'Digit9', name: 'CONCUSSION RIFLE', ammo: 'power', cost: 6, rate: 1.0, kind: 'hitscan', dmg: 70, radius: 2.6 },
  { id: 'cannon', key: 'Digit0', name: 'ASSAULT CANNON', ammo: 'plasma', cost: 1, rate: 0.075, kind: 'bolt', dmg: 11, speed: 70, spread: 0.03, color: 0x8fdcff,
    alt: { ammo: 'missile', cost: 1, rate: 0.9, kind: 'missile', dmg: 150, radius: 5, speed: 26 } },
];
const WEAPON = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
const AMMO_MAX = { energy: 500, power: 500, thermal: 50, mines: 30, mortar: 50, plasma: 400, missile: 20 };
const AMMO_NAME = { energy: 'ENERGY', power: 'POWER', thermal: 'CHARGES', mines: 'MINES', mortar: 'SHELLS', plasma: 'PLASMA', missile: 'MISSILES' };

// Pickups. Fields: ammo/n, weapon, shield, health, battery, life, key, gear, boost, goal.
const ITEMS = {
  energy: { name: 'Energy cell', ammo: 'energy', n: 15 },
  energy_s: { name: 'Energy cell', ammo: 'energy', n: 8 },
  power: { name: 'Power cell', ammo: 'power', n: 20 },
  power_s: { name: 'Power cell', ammo: 'power', n: 10 },
  thermal: { name: 'Thermal charges', ammo: 'thermal', n: 3, weapon: 'thermal' },
  mines: { name: 'Proximity mines', ammo: 'mines', n: 3, weapon: 'mine' },
  mortar: { name: 'Mortar shells', ammo: 'mortar', n: 6 },
  plasma: { name: 'Plasma cartridge', ammo: 'plasma', n: 40 },
  plasma_s: { name: 'Plasma cartridge', ammo: 'plasma', n: 20 },
  missile: { name: 'Missile rack', ammo: 'missile', n: 4 },
  shield: { name: 'Shield unit', shield: 20 },
  shieldbig: { name: 'Shield array', shield: 100 },
  medkit: { name: 'Med-gel', health: 25 },
  medbig: { name: 'Trauma kit', health: 60 },
  battery: { name: 'Battery', battery: 100 },
  life: { name: 'Revive module', life: 1 },
  superw: { name: 'Weapon supercharge', boost: 'weapon' },
  supers: { name: 'Shield supercharge', boost: 'shield' },
  key_r: { name: 'Red security key', key: 'r' },
  key_b: { name: 'Blue security key', key: 'b' },
  key_y: { name: 'Yellow security key', key: 'y' },
  mask: { name: 'Gas mask', gear: 'mask' },
  cleats: { name: 'Ice cleats', gear: 'cleats' },
  w_pistol: { name: 'DL-7 Sidearm', weapon: 'pistol', ammo: 'energy', n: 15 },
  w_carbine: { name: 'LR-4 Carbine', weapon: 'carbine', ammo: 'energy', n: 15 },
  w_repeater: { name: 'Repeater', weapon: 'repeater', ammo: 'power', n: 30 },
  w_fusion: { name: 'Fusion Cutter', weapon: 'fusion', ammo: 'power', n: 30 },
  w_mortar: { name: 'Mortar Launcher', weapon: 'mortar', ammo: 'mortar', n: 6 },
  w_concussion: { name: 'Concussion Rifle', weapon: 'concussion', ammo: 'power', n: 30 },
  w_cannon: { name: 'Assault Cannon', weapon: 'cannon', ammo: 'plasma', n: 30 },
  plans: { name: 'Revenant schematics', goal: 'plans' },
  datacore: { name: "Senn's data core", goal: 'core' },
  navcard: { name: 'Fleet nav card', goal: 'nav' },
};

// Enemy archetypes. cool = seconds between attacks, burst = shots per attack, fly = hover height,
// acc = aim error (radians), pain = chance to flinch, explode = damage when destroyed.
const ENEMIES = {
  trooper: { name: 'Legionnaire', hp: 30, speed: 3.4, r: 0.38, h: 1.85, atk: 'bolt', dmg: 6, burst: [1, 3], cool: [1.2, 2.4], acc: 0.08, pain: 0.45, sight: 34, drop: 'energy_s', gun: 'carbine', voice: 'bark' },
  officer: { name: 'Overseer', hp: 22, speed: 3.2, r: 0.36, h: 1.8, atk: 'bolt', dmg: 5, burst: [1, 2], cool: [1.3, 2.5], acc: 0.09, pain: 0.7, sight: 30, drop: 'energy_s', voice: 'bark' },
  raider: { name: 'Shade commando', hp: 48, speed: 4.4, r: 0.38, h: 1.85, atk: 'bolt', dmg: 8, burst: [2, 4], cool: [0.8, 1.6], acc: 0.045, pain: 0.3, sight: 36, drop: 'energy', voice: 'bark' },
  brute: { name: 'Gorrak brute', hp: 85, speed: 3.7, r: 0.5, h: 2.05, melee: true, dmg: 16, reach: 2.1, cool: [0.9, 1.3], pain: 0.25, sight: 26, voice: 'grunt' },
  hunter: { name: 'Skrell hunter', hp: 80, speed: 3.1, r: 0.42, h: 1.95, atk: 'pulse', dmg: 22, burst: [1, 1], cool: [2.2, 3.4], acc: 0.03, pain: 0.25, sight: 34, drop: 'power_s', voice: 'hiss' },
  seeker: { name: 'Seeker drone', hp: 55, speed: 2.6, r: 0.45, h: 0.9, fly: 2.4, atk: 'bolt', dmg: 7, burst: [2, 3], cool: [1.4, 2.4], acc: 0.05, pain: 0.15, sight: 34, explode: 35, drop: 'battery', voice: 'beep' },
  orb: { name: 'Interrogator orb', hp: 26, speed: 4.6, r: 0.32, h: 0.6, fly: 1.7, melee: true, dmg: 7, reach: 1.5, cool: [0.7, 1.0], pain: 0.5, sight: 26, explode: 0, voice: 'beep' },
  turret: { name: 'Sentry turret', hp: 45, speed: 0, r: 0.45, h: 0.7, ceiling: true, atk: 'bolt', dmg: 6, burst: [3, 5], cool: [1.5, 2.5], acc: 0.05, pain: 0, sight: 30, explode: 20, voice: 'beep' },
  maw: { name: 'Sump-maw', hp: 140, speed: 0, r: 0.7, h: 2.2, static: true, melee: true, dmg: 15, reach: 2.6, cool: [1.2, 1.8], pain: 0.3, sight: 14, voice: 'gurgle' },
  rev1: { name: 'Revenant Mk I', hp: 190, speed: 5.4, r: 0.45, h: 2.25, melee: true, dmg: 22, reach: 2.2, cool: [0.8, 1.2], pain: 0.08, sight: 36, voice: 'servo' },
  rev2: { name: 'Revenant Mk II', hp: 330, speed: 3.2, r: 0.55, h: 2.4, jet: true, atk: 'plasma', dmg: 6, burst: [4, 7], cool: [1.0, 1.8], acc: 0.05, missile: 0.25, pain: 0.05, sight: 40, drop: 'plasma_s', voice: 'servo' },
  boss: { name: 'General Vossk', hp: 1700, speed: 3.6, r: 0.8, h: 3.1, jet: true, boss: true, atk: 'plasma', dmg: 7, burst: [6, 10], cool: [0.7, 1.3], acc: 0.04, missile: 0.45, pain: 0, sight: 60, voice: 'servo' },
};
const DIFF = [
  { name: 'RECRUIT', dmg: 0.6, hp: 0.8, note: 'Fewer enemies, softer hits.' },
  { name: 'MERCENARY', dmg: 1.0, hp: 1.0, note: 'The intended challenge.' },
  { name: 'REVENANT', dmg: 1.4, hp: 1.15, note: 'More enemies, and they hit hard.' },
];

const MISSIONS = [
  {
    level: 'kesh', name: 'THE KESH GARRISON', planet: 'Kesh, the Dust Reach',
    brief: "Commander Tarn's message is short. The Ascendancy has stopped losing soldiers at the front. Something called the REVENANT PROTOCOL is replacing them, and nobody who has seen it has come back.\n\nThe garrison on Kesh holds a copy of the program's schematics. Land in the canyon, get inside the base, take the schematics from the vault and get back to the hangar for extraction.",
    obj: [{ id: 'plans', text: 'Recover the Revenant schematics from the vault' }, { id: 'exit', text: 'Reach the extraction shuttle in the hangar' }],
    loadout: { weapons: ['fists', 'pistol'], ammo: { energy: 60 }, shield: 50 },
    outro: 'The schematics are fragmentary, but they name an engineer: Dr. Ilan Senn, recently arrested for "disloyalty" and held under the city of Talmor.',
  },
  {
    level: 'talmor', name: 'UNDER TALMOR', planet: 'Talmor, the drowned city',
    brief: "Dr. Senn designed the Revenant's neural lattice and then tried to quit. The Ascendancy keeps him in a detention block reached only through the storm drains under Talmor.\n\nThe drains are flooded, dark and full of things that like the dark. Bring a lamp. Find the detention block, release Senn and take his data core.",
    obj: [{ id: 'release', text: 'Release Dr. Senn from the detention block' }, { id: 'core', text: "Recover Senn's data core" }, { id: 'exit', text: 'Escape through the outflow lift' }],
    loadout: { weapons: ['fists', 'pistol', 'carbine', 'thermal'], ammo: { energy: 120, thermal: 4 }, shield: 50 },
    outro: "Senn's core holds the location of the Revenant foundry: the volcanic moon Kethra. Senn did not survive the escape. His last words were about the coolant.",
  },
  {
    level: 'kethra', name: 'KETHRA FOUNDRY', planet: 'Kethra, a moon of fire',
    brief: "The foundry pours Revenant chassis in a lava-fed forge kept stable by three coolant pumps. Senn's notes say that if all three pumps go dark, the forge will tear itself apart.\n\nPlant a charge on each pump, then reach the cargo shuttle on the far platform. Expect the first Revenants to be guarding their own cradle.",
    obj: [{ id: 'pumps', text: 'Destroy the three coolant pumps (0/3)' }, { id: 'exit', text: 'Reach the cargo shuttle' }],
    loadout: { weapons: ['fists', 'pistol', 'carbine', 'thermal', 'repeater', 'mine'], ammo: { energy: 150, power: 80, thermal: 5, mines: 3 }, shield: 75 },
    outro: 'The foundry is gone. The shuttle\'s nav computer carries one last route: a rendezvous with the Iron Litany, flagship of General Oren Vossk.',
  },
  {
    level: 'litany', name: 'THE IRON LITANY', planet: 'Deep space, the Litany',
    brief: "The Iron Litany is where the Revenants are finished, and General Vossk is aboard. Your shuttle carries a valid docking code for one more hour.\n\nWork through the hangar deck and the assembly line, find the fleet nav card on the bridge deck, and stop Vossk before the Litany jumps to the front.",
    obj: [{ id: 'nav', text: 'Take the fleet nav card from the bridge deck' }, { id: 'boss', text: 'Defeat General Vossk' }, { id: 'exit', text: 'Reach the escape pod' }],
    loadout: { weapons: ['fists', 'pistol', 'carbine', 'thermal', 'repeater', 'fusion', 'mine', 'mortar', 'concussion'], ammo: { energy: 180, power: 160, thermal: 6, mines: 4, mortar: 8 }, shield: 100 },
    outro: 'The Iron Litany drifts dark behind the escape pod. Without Vossk and without the foundry, the Revenant Protocol has nowhere left to run.',
  },
];
