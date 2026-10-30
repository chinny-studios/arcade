// ---- 02_data: ship classes, small craft, missions ----
// Speeds in m/s, turn and pitch rates in degrees per second, damage in hull points.
// side = each broadside battery (port and starboard), bow = forward guns with a narrow arc.
const BOLT_SPEED = 1150, BOLT_RANGE = 3400;
const CLASSES = {
  corvette: { size: 'S', len: 170, hull: 2400, shield: 600, speed: 135, accel: 16, turn: 21, pitch: 15, flak: 6,
    side: { guns: 3, dmg: 38, reload: 3.0 }, bow: { guns: 2, dmg: 30, reload: 2.4 }, torps: 0, hangar: [], value: 1 },
  frigate: { size: 'M', len: 270, hull: 4600, shield: 1100, speed: 105, accel: 11, turn: 15, pitch: 11, flak: 8,
    side: { guns: 5, dmg: 50, reload: 3.8 }, bow: { guns: 2, dmg: 40, reload: 3.0 }, torps: 0, hangar: ['int'], value: 2 },
  cruiser: { size: 'M', len: 360, hull: 7000, shield: 1600, speed: 92, accel: 9, turn: 12.5, pitch: 9, flak: 10,
    side: { guns: 7, dmg: 58, reload: 4.0 }, bow: { guns: 2, dmg: 50, reload: 3.2 }, torps: 0, hangar: ['int', 'bmb'], value: 3 },
  heavy: { size: 'L', len: 470, hull: 10500, shield: 2300, speed: 84, accel: 8, turn: 11, pitch: 8, flak: 12,
    side: { guns: 8, dmg: 66, reload: 4.2 }, bow: { guns: 3, dmg: 60, reload: 3.4 }, torps: 4, hangar: ['int', 'int', 'bmb'], value: 4 },
  carrier: { size: 'L', len: 520, hull: 9000, shield: 2000, speed: 72, accel: 6, turn: 8, pitch: 6, flak: 14,
    side: { guns: 4, dmg: 45, reload: 4.4 }, bow: null, torps: 0, hangar: ['int', 'bmb', 'int', 'bmb'], value: 4 },
  battleship: { size: 'XL', len: 640, hull: 16000, shield: 3200, speed: 66, accel: 5.5, turn: 7.5, pitch: 5.5, flak: 14,
    side: { guns: 10, dmg: 70, reload: 4.6 }, bow: { guns: 4, dmg: 62, reload: 3.8 }, torps: 0, hangar: ['int', 'bmb'], value: 6 },
  battlecruiser: { size: 'L', len: 560, hull: 14000, shield: 3000, speed: 78, accel: 7, turn: 9.5, pitch: 7, flak: 14,
    side: { guns: 10, dmg: 72, reload: 4.2 }, bow: { guns: 4, dmg: 66, reload: 3.4 }, torps: 6, hangar: ['int', 'int', 'bmb'], value: 6 },
  dreadnought: { size: 'XXL', len: 920, hull: 30000, shield: 5000, speed: 46, accel: 3.5, turn: 5, pitch: 3.5, flak: 22,
    side: { guns: 12, dmg: 72, reload: 4.8 }, bow: { guns: 5, dmg: 70, reload: 4.0 }, torps: 0, hangar: ['int', 'bmb', 'int', 'bmb'], value: 10 },
  transport: { size: 'S', len: 190, hull: 3200, shield: 700, speed: 62, accel: 6, turn: 9, pitch: 6, flak: 3,
    side: null, bow: null, torps: 0, hangar: [], value: 1 },
  station: { size: 'XL', len: 700, hull: 26000, shield: 4200, speed: 0, accel: 0, turn: 0, pitch: 0, flak: 20,
    side: { guns: 10, dmg: 70, reload: 4.4 }, bow: null, torps: 0, hangar: ['int'], value: 8, ring: true },
};
// What each navy calls the class. Team 0 is the Concord (the player), team 1 the Hegemony.
const CLASS_NAMES = [
  { corvette: 'Picket-class corvette', frigate: 'Rapier-class frigate', cruiser: 'Lance-class cruiser', heavy: 'Bastion-class heavy cruiser',
    carrier: 'Harbor-class carrier', battleship: 'Citadel-class battleship', battlecruiser: 'Aegis-class battlecruiser', dreadnought: 'Sovereign-class dreadnought',
    transport: 'Tender transport', station: 'Orbital defence platform' },
  { corvette: 'Jackal corvette', frigate: 'Halberd frigate', cruiser: 'Warden cruiser', heavy: 'Reaver heavy cruiser',
    carrier: 'Brood carrier', battleship: 'Colossus battleship', battlecruiser: 'Scourge battlecruiser', dreadnought: 'Tyrant dreadnought',
    transport: 'Hauler', station: 'Fortress platform' },
];
const SHIP_NAMES = [
  ['Steadfast', 'Meridian', 'Halcyon', 'Corvus', 'Tenacity', 'Lantern', 'Orison', 'Kestrel', 'Valiant', 'Clarion', 'Bulwark', 'Sentinel', 'Ardent', 'Perseverance', 'Wayfarer', 'Thessaly'],
  ['Iron Creed', 'Gravemind', 'Black Tithe', 'Sunderer', 'Ashen Oath', 'Pale Rider', 'Reckoning', 'Dominion', 'Carrion', 'Grim Harvest', 'Forfeit', 'Ruinous', 'Scald', 'Vassal', 'Malice', 'Tribute'],
];
const SUBSYS = {
  engines: { name: 'Engines', hp: 0.16 }, shields: { name: 'Shield generator', hp: 0.13 },
  port: { name: 'Port battery', hp: 0.14 }, stbd: { name: 'Starboard battery', hp: 0.14 },
  hangar: { name: 'Hangar', hp: 0.14 }, bridge: { name: 'Bridge', hp: 0.1 },
};
const SUB_ORDER = ['bridge', 'engines', 'shields', 'port', 'stbd', 'hangar'];
const FACINGS = ['fore', 'aft', 'port', 'stbd'];
const FACING_NAMES = { fore: 'Fore', aft: 'Aft', port: 'Port', stbd: 'Starboard' };

// Small craft. turn in radians per second; gun range in metres.
const CRAFT = {
  int: { name: 'Interceptors', one: 'Interceptor', hp: 60, speed: 290, turn: 2.3, size: 6, len: 14,
    gun: { dmg: 9, rate: 0.16, range: 760, speed: 1500, capDmg: 2.2 }, torps: 0 },
  bmb: { name: 'Bombers', one: 'Bomber', hp: 150, speed: 205, turn: 1.35, size: 4, len: 20,
    gun: { dmg: 5, rate: 0.4, range: 500, speed: 1300, capDmg: 1.5 }, torps: 2 },
  // The player's own fighter, flown by remote from the bridge (G). Shielded, fast, two torpedoes.
  strike: { name: 'Strike fighter', one: 'Strike fighter', hp: 110, shield: 70, speed: 300, boost: 470, turn: 2.6, size: 1, len: 16, rebuild: 30,
    gun: { dmg: 15, rate: 0.09, range: 1050, speed: 1700, capDmg: 7 }, torps: 2 },
  shuttle: { name: 'Boarding shuttle', one: 'Shuttle', hp: 700, speed: 170, turn: 1.1, size: 1, len: 28, gun: null, torps: 0 },
};
const TORP = { speed: 290, turn: 1.1, hp: 25, dmg: 460, life: 9, range: 950 };
const SQUAD_NAMES = [['Arrow', 'Spear', 'Hammer', 'Lance', 'Sabre', 'Comet'], ['Talon', 'Viper', 'Maul', 'Hook', 'Wasp', 'Shrike']];
const REBUILD_TIME = 16, CRAFT_CAP = 60;
const ARENA_R = 7500;   // the battle area: a sphere around the origin

// ---- Missions ----
// Spawn entries: [cls, x, y, z, yawDeg, extra]. extra may hold name, tag, throttle, jump (seconds after start), ai flags.
const MISSIONS = [
  { id: 'picket', name: 'Picket Line', sub: 'Mission 1 · The outer marker',
    brief: 'A Hegemony raiding group has jumped in at the outer marker of the Aster system. Your light cruiser <b>Vigilant</b> and the frigate <b>Kestrel</b> are the only ships on picket. Break up the raid before it reaches the orbital lanes.',
    goal: 'Destroy every enemy warship.',
    player: ['cruiser', 0, 0, -1900, 0, { name: 'Vigilant', squads: ['int'] }],
    allies: [['frigate', -520, 90, -2100, 4, { name: 'Kestrel' }]],
    enemies: [['frigate', 380, -80, 1700, 182], ['frigate', -650, 160, 2100, 178], ['corvette', 1000, 20, 1450, 186]],
    obj: { kind: 'destroyAll' }, par: 300, tutorial: true },
  { id: 'carrier', name: 'Carrier Strike', sub: 'Mission 2 · The evacuation lane',
    brief: 'Three tenders full of refugees are running for the jump point. A Hegemony carrier, the <b>Brood Mother</b>, has found them and is launching bombers. Keep the tenders alive and kill the carrier. Your <b>Vigilant</b> now carries a bomber squadron: order it onto the carrier.',
    goal: 'Destroy the carrier Brood Mother. Keep at least one tender alive until it jumps out.',
    player: ['cruiser', 150, 0, -1500, 0, { name: 'Vigilant', squads: ['int', 'bmb'] }],
    allies: [['transport', -260, -60, -2400, 180, { tag: 'convoy', name: 'Tender Ivy', throttle: 0.75 }], ['transport', 0, -120, -2550, 180, { tag: 'convoy', name: 'Tender Rowan', throttle: 0.75 }],
      ['transport', 260, -60, -2400, 180, { tag: 'convoy', name: 'Tender Alder', throttle: 0.75 }], ['frigate', -700, 120, -1700, 0, { name: 'Clarion' }], ['corvette', 800, -60, -1800, 0, { name: 'Ardent' }]],
    enemies: [['carrier', 0, 380, 3300, 180, { name: 'Brood Mother', tag: 'target' }], ['corvette', 700, 100, 2500, 185], ['frigate', -500, 500, 2900, 180]],
    obj: { kind: 'carrier', escapeAt: 240 }, par: 360 },
  { id: 'lanes', name: 'Hold the Lanes', sub: 'Mission 3 · Platform Seven',
    brief: 'Orbital defence Platform Seven guards the main shipping lane. The Hegemony is throwing everything it has at it. You have the heavy cruiser <b>Resolute</b>, with torpedo tubes. Hold for six minutes, or until every wave is destroyed.',
    goal: 'Keep Platform Seven alive for 6:00.',
    player: ['heavy', 0, 150, -900, 0, { name: 'Resolute', squads: ['int', 'int', 'bmb'] }],
    allies: [['station', 0, -150, 0, 0, { name: 'Platform Seven', tag: 'protect' }], ['frigate', -900, 0, 300, 90, { name: 'Lantern' }], ['frigate', 900, 60, 200, -90, { name: 'Orison' }]],
    enemies: [['frigate', 400, 100, 3000, 180, { jump: 6 }], ['frigate', -500, -100, 3200, 180, { jump: 6.5 }], ['corvette', 0, 300, 2800, 180, { jump: 7 }],
      ['cruiser', 3000, 200, 500, 270, { jump: 110 }], ['carrier', 3500, 500, -200, 270, { jump: 111 }], ['corvette', 2800, -200, 900, 270, { jump: 112 }], ['frigate', 3200, -400, -600, 270, { jump: 112.5 }],
      ['battleship', -400, 300, -3400, 0, { jump: 220 }], ['corvette', 300, 100, -3100, 0, { jump: 221 }], ['corvette', -900, 400, -3000, 0, { jump: 221.5 }], ['cruiser', 900, -300, -3300, 0, { jump: 222 }]],
    obj: { kind: 'survive', time: 360 }, par: 360 },
  { id: 'broadside', name: 'Broadside', sub: 'Mission 4 · Above the capital',
    brief: 'The Hegemony battle line has reached high orbit over Aster. The fleets are passing at knife-fighting range. Their flagship of the line, the battleship <b>Ashen Oath</b>, must not reach bombardment orbit. Close in, strip its shields, and break it.',
    goal: 'Destroy the battleship Ashen Oath.',
    player: ['heavy', 0, 0, -600, 0, { name: 'Resolute', squads: ['int', 'int', 'bmb'], throttle: 0.5 }],
    allies: [['battleship', -700, -150, -900, 0, { name: 'Bulwark', throttle: 0.5 }], ['cruiser', 650, 180, -700, 0, { name: 'Meridian', throttle: 0.5 }],
      ['cruiser', -300, 380, -1300, 0, { name: 'Ardent', throttle: 0.5 }], ['frigate', 900, -250, -1100, 0, { name: 'Corvus', throttle: 0.5 }]],
    enemies: [['battleship', -200, 120, 900, 180, { name: 'Ashen Oath', tag: 'target', throttle: 0.5, hull: 1.6 }], ['cruiser', 600, -100, 800, 180, { throttle: 0.5 }], ['cruiser', -900, 300, 1200, 180, { throttle: 0.5 }],
      ['frigate', 1100, 250, 1300, 180, { throttle: 0.5 }], ['frigate', -1300, -200, 1000, 180, { throttle: 0.5 }], ['corvette', 300, 500, 1100, 180], ['carrier', 0, 700, 2600, 180]],
    obj: { kind: 'destroyTag' }, par: 420 },
  { id: 'admiral', name: 'The Admiral', sub: 'Mission 5 · The Iron Mandate',
    brief: 'Admiral Ilse Varga was taken when her flagship fell. She is held aboard the Hegemony dreadnought <b>Iron Mandate</b>. You command the battlecruiser <b>Highguard</b>. Knock out the Mandate\'s engines and shield generator <b>without destroying it</b>, then cover the boarding shuttle until the team brings her out.',
    goal: 'Disable the Iron Mandate (engines and shield generator), then protect the boarding shuttle. Do not destroy the dreadnought.',
    player: ['battlecruiser', 0, 0, -2200, 0, { name: 'Highguard', squads: ['int', 'int', 'bmb'] }],
    allies: [['cruiser', -800, 150, -2400, 0, { name: 'Halcyon' }], ['cruiser', 800, -100, -2400, 0, { name: 'Tenacity' }], ['frigate', 0, 400, -2700, 0, { name: 'Wayfarer' }]],
    enemies: [['dreadnought', 0, 200, 1800, 180, { name: 'Iron Mandate', tag: 'flagship', throttle: 0.4 }], ['cruiser', 900, 0, 1300, 180], ['cruiser', -1000, 350, 1500, 180],
      ['frigate', 500, 600, 900, 180], ['frigate', -500, -300, 1000, 180], ['carrier', 200, 900, 3200, 180]],
    obj: { kind: 'board', dockTime: 45 }, par: 480 },
  { id: 'aster', name: 'Aster\'s Sky', sub: 'Mission 6 · The last line',
    brief: 'The Hegemony main fleet is here, led by two Tyrant dreadnoughts. If they reach low orbit, Aster burns. Every ship the Concord has left is with you. Kill the dreadnoughts and the fleet will break.',
    goal: 'Destroy both Tyrant dreadnoughts.',
    player: ['battlecruiser', 0, 0, -1600, 0, { name: 'Highguard', squads: ['int', 'int', 'bmb'] }],
    allies: [['battleship', -900, -100, -1800, 0, { name: 'Bulwark' }], ['cruiser', 900, 200, -1500, 0, { name: 'Meridian' }], ['cruiser', -400, 500, -2200, 0, { name: 'Sentinel' }],
      ['carrier', 300, -400, -2600, 0, { name: 'Harbor' }], ['frigate', 1400, -100, -1900, 0, { name: 'Corvus' }], ['frigate', -1500, 250, -1700, 0, { name: 'Valiant' }]],
    enemies: [['dreadnought', 200, 300, 2600, 180, { name: 'Dominion', tag: 'target' }], ['cruiser', -900, 0, 1900, 180], ['cruiser', 1000, 150, 1700, 180], ['frigate', -1500, 400, 1500, 180],
      ['frigate', 1500, -200, 1800, 180], ['corvette', 0, -300, 1400, 180],
      ['dreadnought', 3200, 600, 500, 270, { name: 'Reckoning', tag: 'target', jump: 150 }], ['carrier', 3600, 1000, 1400, 260, { jump: 151 }], ['cruiser', 3000, 100, -400, 280, { jump: 152 }], ['corvette', 2700, 300, 1000, 270, { jump: 152.5 }], ['battleship', 3400, -300, 1000, 265, { jump: 153 }]],
    obj: { kind: 'destroyTag' }, par: 600 },
];
