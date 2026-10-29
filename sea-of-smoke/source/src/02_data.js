// ---- 02_data: ship classes, ammunition, consumables, maps, names ----
// Ship dimensions: len (m), beam, fb = deck height above the waterline, draft, mastH = main truck above water.
// guns: per broadside; chase = bow/stern chasers. speed m/s at full sail; accel = seconds from stop to full;
// turnR = turning radius at full speed (m); rudderT = seconds for the rudder to go hard over.
// conceal = range (m) at which an enemy spots this ship in clear weather.
const CLASSES = {
  sloop: {
    name: 'Sloop', ship: 'Kestrel', role: 'Scout and capper',
    blurb: 'A single-masted cutter that outruns anything afloat. Light guns, a small crew, two smoke pots. Take the points and spot for the fleet.',
    len: 22, beam: 6.4, fb: 2.4, draft: 1.8, mastH: 24, masts: 1, decks: 1, rig: 'sloop',
    hp: 3500, crew: 70, speed: 23, accel: 5, turnR: 105, rudderT: 1.0, conceal: 540,
    guns: { side: 6, cal: '6-pounders', dmg: 55, reload: 6, range: 470, vel: 210, disp: 1.0, bow: 1, stern: 0 },
    repair: { charges: 2, cd: 40 }, special: 'smoke', value: 35,
  },
  brig: {
    name: 'Brigantine', ship: 'Magpie', role: 'Raider, chain shot',
    blurb: 'Two masts and a sharp turn of speed. Her gunners load chain shot faster and aim it better: strip a big ship of her sails and run.',
    len: 30, beam: 8, fb: 2.9, draft: 3.0, mastH: 30, masts: 2, decks: 1, rig: 'brig',
    hp: 6300, crew: 120, speed: 19.5, accel: 7, turnR: 150, rudderT: 1.4, conceal: 640,
    guns: { side: 9, cal: '9-pounders', dmg: 85, reload: 8, range: 590, vel: 220, disp: 1.0, bow: 1, stern: 1 },
    chainBonus: 1.35, repair: { charges: 3, cd: 45 }, special: 'studding', value: 45,
  },
  frigate: {
    name: 'Frigate', ship: 'Hesper', role: 'Long-range gunner',
    blurb: 'Three masts, one long gun deck and the reach of the fleet. Send a lookout aloft and pick your fights from the edge of the smoke.',
    len: 42, beam: 11, fb: 3.6, draft: 4.0, mastH: 40, masts: 3, decks: 1, rig: 'ship',
    hp: 10500, crew: 240, speed: 16.5, accel: 10, turnR: 210, rudderT: 1.8, conceal: 780,
    guns: { side: 14, cal: '12-pounders', dmg: 115, reload: 10.5, range: 790, vel: 245, disp: 0.9, bow: 2, stern: 2 },
    repair: { charges: 3, cd: 50 }, special: 'lookout', value: 60,
  },
  galleon: {
    name: "Man-o'-War", ship: 'Leviathan', role: 'Line of battle, boarding',
    blurb: 'Three gun decks, five hundred hands and a hull like a cliff. Slow to turn and seen from afar, but her broadside ends arguments and her crew wins boardings.',
    len: 54, beam: 15, fb: 5.4, draft: 5.2, mastH: 46, masts: 3, decks: 3, rig: 'ship',
    hp: 18000, crew: 500, speed: 12.5, accel: 16, turnR: 280, rudderT: 2.6, conceal: 900,
    guns: { side: 22, cal: '24-pounders', dmg: 165, reload: 15, range: 710, vel: 230, disp: 1.1, bow: 2, stern: 2 },
    repair: { charges: 3, cd: 55 }, special: 'rally', value: 80,
  },
  fireship: {
    name: 'Fireship', ship: 'Tinderbox', role: 'Fire rafts, ambush',
    blurb: 'A small brig packed with pitch and powder. Launch burning rafts from the smoke, and when all is lost, set her alight and ram.',
    len: 20, beam: 5.6, fb: 2.2, draft: 1.4, mastH: 22, masts: 2, decks: 1, rig: 'brig',
    hp: 2400, crew: 34, speed: 25, accel: 4.5, turnR: 95, rudderT: 0.9, conceal: 430,
    guns: { side: 3, cal: 'swivels', dmg: 32, reload: 3.2, range: 270, vel: 190, disp: 1.3, bow: 1, stern: 0 },
    rafts: { n: 3, reload: 38, range: 760, speed: 15, dmg: 4000 },
    repair: { charges: 2, cd: 40 }, special: 'smoke', ignite: true, value: 30,
  },
};
const CLASS_ORDER = ['sloop', 'fireship', 'brig', 'frigate', 'galleon'];

// hull/sail/crew are damage multipliers; fire and leak are chances per hull hit; range multiplies gun range.
const AMMO = [
  { id: 'round', name: 'Round shot', short: 'ROUND', hull: 1, sail: 0.25, crew: 0.25, fire: 0.035, leak: 0.10, range: 1, reload: 1, disp: 1 },
  { id: 'chain', name: 'Chain shot', short: 'CHAIN', hull: 0.3, sail: 2.4, crew: 0.12, fire: 0, leak: 0.02, range: 0.7, reload: 1.1, disp: 1.2 },
  { id: 'grape', name: 'Grapeshot', short: 'GRAPE', hull: 0.25, sail: 0.6, crew: 2.6, fire: 0, leak: 0, range: 0.5, reload: 0.9, disp: 1.8 },
];
const RAFT_SLOT = 3; // weapon slot 4 on the fireship

const SPECIALS = {
  smoke: { name: 'Smoke pots', key: 'T', dur: 14, cd: 70, charges: 2, desc: 'Lays a smoke screen in your wake. Ships inside it cannot be seen beyond 150 m.' },
  studding: { name: 'Studding sails', key: 'T', dur: 35, cd: 90, charges: 3, desc: 'Sets extra canvas: +16% top speed.' },
  lookout: { name: 'Lookout aloft', key: 'T', dur: 40, cd: 110, charges: 3, desc: 'A sharp-eyed hand at the masthead: spots ships 35% farther and tightens your aim.' },
  rally: { name: 'Rally the crew', key: 'T', dur: 30, cd: 120, charges: 2, desc: 'Drums and rum: 20% faster reload, 40% stronger boarding parties.' },
};
const FIRE = { dur: 35, dps: 0.0028, max: 3 };   // dps as a fraction of max hull per second
const LEAK = { dur: 30, dps: 0.0028, max: 2, slow: 0.08 };
const REPAIR = { dur: 14, heal: 0.006 };

const TEAM_NAMES = ['Brethren of the Coast', 'The Red Flag'];
const SHIP_NAMES = [
  ['Black Gull', "Widow's Due", 'Salt Jenny', "Hangman's Luck", 'Merry Tom', 'Saint Nobody', 'Old Scratch', 'Crooked Moon',
    'Gilded Rat', 'Lady Ruin', 'Drowned Kate', 'Bonny Mary', 'Rum Cove', 'Long Shadow', 'Grey Fox', 'Iron Bess'],
  ['Red Hand', 'Bloody Ann', 'Scarlet Wake', 'Corsair', 'Fury', 'Cutthroat', 'Red Duchess', 'Vengeance', 'Brimstone',
    'Wrath', 'Gallows Bird', 'Skinner', 'Marauder', 'Carrion Crow', 'Sea Butcher', 'Ember Jack'],
];
const FLEET = ['galleon', 'galleon', 'frigate', 'frigate', 'brig', 'sloop', 'fireship'];

// Islands: [x, z, rx, rz, peak, rot]. A peak below zero makes a reef. Caps get a fort islet at fort: [x, z].
// Spawns are fleet anchor points; team 0 sails north (+z), team 1 south.
const MAPS = [
  {
    id: 'keys', name: 'Serpent Keys', size: 2600, seed: 11,
    desc: 'A chain of jungle keys with three forts. Points on both flanks and one in the middle, plenty of islands to hide behind.',
    islands: [
      [-210, 270, 170, 120, 70, 0.4], [240, -230, 150, 110, 55, -0.3], [-920, 260, 220, 170, 95, 0.2], [-470, -390, 120, 80, 38, 0.8],
      [960, -250, 230, 160, 105, -0.2], [500, 400, 130, 90, 45, 0.6], [-220, -720, 100, 70, 30, 0], [260, 730, 110, 70, 34, 0.3],
      [-1150, -900, 160, 120, 60, 0.5], [1150, 900, 160, 120, 60, 0.5], [-1200, 900, 120, 200, 70, 0], [1200, -900, 120, 200, 70, 0],
      [-30, 560, 60, 40, 20, 0], [40, -560, 60, 40, 20, 0], [-660, 620, 80, 60, 26, 0.2], [660, -620, 80, 60, 26, 0.2],
    ],
    caps: [{ id: 'A', x: -650, z: 0, fort: [-720, -70] }, { id: 'B', x: 0, z: 0, fort: [30, 90] }, { id: 'C', x: 650, z: 0, fort: [720, 70] }],
    spawns: [{ x: 0, z: -1080 }, { x: 0, z: 1080 }],
    fog: [[-500, 700, 260], [600, -650, 240], [1050, 300, 220]],
    sun: [0.55, 0.42, 0.72], time: 'day',
  },
  {
    id: 'strait', name: "Hangman's Strait", size: 2600, seed: 23,
    desc: 'Two lanes of water between high headlands and a long rocky island. Each lane has a fort; the headlands block shots and hide ships.',
    islands: [
      [-1050, 0, 420, 820, 120, 0], [-760, -350, 180, 220, 70, 0.3], [-740, 380, 200, 230, 80, -0.3],
      [1050, 0, 420, 820, 120, 0], [760, 340, 180, 220, 75, 0.3], [740, -380, 200, 230, 80, -0.3],
      [0, -170, 110, 150, 60, 0], [0, 10, 150, 170, 85, 0.1], [10, 200, 100, 140, 55, 0],
      [-420, -700, 70, 50, 22, 0], [430, 700, 70, 50, 22, 0], [-80, -620, 50, 40, 15, 0], [80, 620, 50, 40, 15, 0],
    ],
    caps: [{ id: 'A', x: -330, z: 0, fort: [-410, 60] }, { id: 'B', x: 330, z: 0, fort: [410, -60] }],
    spawns: [{ x: 0, z: -1080 }, { x: 0, z: 1080 }],
    fog: [[-320, -500, 200], [330, 520, 200]],
    sun: [-0.6, 0.3, 0.6], time: 'evening',
  },
  {
    id: 'bones', name: 'The Bones', size: 2600, seed: 37,
    desc: 'Open water over coral shoals. Sloops and fireships slip across the reefs; brigs, frigates and men-o\'-war run aground on them.',
    islands: [
      [0, 360, 120, 80, 42, 0.3], [-1050, -150, 150, 110, 50, 0.4], [1050, 150, 150, 110, 50, 0.4],
      [-300, -110, 190, 110, -2.0, 0.5], [300, -160, 170, 100, -2.0, -0.4], [0, -470, 210, 90, -2.0, 0],
      [-650, -360, 150, 90, -2.0, 0.9], [650, -360, 150, 90, -2.0, -0.9], [-180, 620, 150, 80, -2.0, 0.2],
      [320, 660, 140, 80, -2.0, -0.3], [-700, 640, 130, 80, -2.0, 0], [720, 620, 120, 90, -2.0, 0],
      [-380, 260, 35, 30, 12, 0], [420, 240, 30, 30, 10, 0], [150, -320, 25, 20, 8, 0],
    ],
    caps: [{ id: 'A', x: -560, z: 160, fort: [-610, 230] }, { id: 'B', x: 0, z: -40, fort: [0, 40] }, { id: 'C', x: 560, z: 160, fort: [610, 230] }],
    spawns: [{ x: 0, z: -1080 }, { x: 0, z: 1080 }],
    fog: [[0, 900, 260], [-900, -700, 250], [900, -700, 250]],
    sun: [0.3, 0.6, -0.7], time: 'noon',
  },
];
const MATCH = { time: 540, start: 300, win: 1000, tick: 5, capPts: 3, capR: 220, capTime: 40, countdown: 8 };
