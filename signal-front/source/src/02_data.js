// Signal Front — rules data: terrain, movement, units, damage tables, factions and commanders

// def = defence stars. Properties have an income and repair a class of unit.
const TER = {
  plain:  { name: 'Plains', def: 1 },
  forest: { name: 'Forest', def: 2, cover: true },
  mount:  { name: 'Mountain', def: 4 },
  road:   { name: 'Road', def: 0 },
  bridge: { name: 'Bridge', def: 0 },
  river:  { name: 'River', def: 0 },
  sea:    { name: 'Sea', def: 0 },
  shoal:  { name: 'Shoal', def: 0 },
  reef:   { name: 'Reef', def: 1, cover: true },
  city:   { name: 'City', def: 3, prop: true, income: true, repair: 'ground' },
  base:   { name: 'Factory', def: 3, prop: true, income: true, repair: 'ground', build: 'ground' },
  airport:{ name: 'Airfield', def: 3, prop: true, income: true, repair: 'air', build: 'air' },
  port:   { name: 'Port', def: 3, prop: true, income: true, repair: 'sea', build: 'sea' },
  hq:     { name: 'HQ', def: 4, prop: true, income: true, repair: 'ground' },
  tower:  { name: 'Relay Tower', def: 3, prop: true, income: false },
};
const PROP_INFO = {
  city: 'Earns funds each turn. Repairs and resupplies ground units.',
  base: 'Builds ground units. Earns funds, repairs ground units.',
  airport: 'Builds aircraft and drones. Earns funds, repairs air units.',
  port: 'Builds naval units. Earns funds, repairs naval units.',
  hq: 'Lose it and you lose the war. Earns funds, repairs ground units.',
  tower: 'Each Relay Tower you hold gives all your units +10% firepower.',
};

// Movement cost per movement type; missing = impassable.
const P1 = { city: 1, base: 1, airport: 1, port: 1, hq: 1, tower: 1 };
const MOVE = {
  foot:   { plain: 1, forest: 1, mount: 2, road: 1, bridge: 1, river: 2, shoal: 1, ...P1 },
  boot:   { plain: 1, forest: 1, mount: 1, road: 1, bridge: 1, river: 1, shoal: 1, ...P1 },
  treads: { plain: 1, forest: 2, road: 1, bridge: 1, shoal: 1, ...P1 },
  tires:  { plain: 2, forest: 3, road: 1, bridge: 1, shoal: 1, ...P1 },
  air:    { plain: 1, forest: 1, mount: 1, road: 1, bridge: 1, river: 1, sea: 1, shoal: 1, reef: 1, ...P1 },
  sea:    { sea: 1, reef: 2, port: 1 },
};
const MT_NAME = { foot: 'Legs', boot: 'All-terrain', treads: 'Treads', tires: 'Wheels', air: 'Air', sea: 'Naval' };
const CLS_NAME = { inf: 'Infantry', veh: 'Light vehicle', tank: 'Armor', heavy: 'Heavy armor', drone: 'Drone', heli: 'Rotorcraft', jet: 'Jet', ship: 'Ship', sub: 'Submersible' };

// Unit classes used by the damage tables: inf veh tank heavy drone heli jet ship sub
// w1 = primary weapon (uses ammo), w2 = secondary (unlimited). dmg = base damage % vs class.
const MG = { inf: 55, veh: 12, tank: 5, heavy: 1, drone: 20, heli: 7 };
const ATGM = { veh: 85, tank: 55, heavy: 15, ship: 15 };
const MG2 = { inf: 65, veh: 18, tank: 6, heavy: 1, drone: 22, heli: 9 };
const ARTY = { inf: 90, veh: 80, tank: 70, heavy: 45, ship: 55, sub: 55 };
const ROCKET = { inf: 95, veh: 85, tank: 80, heavy: 55, ship: 65, sub: 85 };
const AA = { inf: 105, veh: 50, tank: 25, heavy: 10, drone: 120, heli: 105, jet: 65 };

const UNITS = {
  // ---------------- Meridian Autonomy Command (player): uncrewed systems only ----------------
  crawler: { name: 'Crawler', side: 0, cost: 1000, move: 3, mt: 'foot', vis: 2, fuel: 99, cls: 'inf', cap: true,
    w2: { name: 'Coil gun', dmg: MG },
    desc: 'Quadruped ground robot. Cheap and tireless, and it can network (capture) property.' },
  strider: { name: 'Strider', side: 0, cost: 3000, move: 2, mt: 'boot', vis: 2, fuel: 70, cls: 'inf', cap: true,
    w1: { name: 'Lance ATGM', ammo: 3, dmg: ATGM }, w2: { name: 'Coil gun', dmg: MG2 },
    desc: 'Tracked UGV with an anti-armor missile pod. Climbs anything and captures property.' },
  wraith: { name: 'Wraith', side: 0, cost: 3500, move: 7, mt: 'air', vis: 5, fuel: 60, burn: 2, cls: 'drone',
    w2: { name: 'Chin gun', dmg: { inf: 55, veh: 28, tank: 5, heavy: 1, drone: 30, heli: 12 } },
    desc: 'Small autonomous recon helicopter. Wide sensor view, light gun.' },
  watchpost: { name: 'Watchpost', side: 0, cost: 4500, move: 4, mt: 'tires', vis: 5, fuel: 50, cls: 'veh', mesh: true,
    desc: 'Mobile sensor tower. Sees into forests nearby, and allies within 2 tiles get +10% firepower and defence (mesh link).' },
  nexus: { name: 'Nexus', side: 0, cost: 5000, move: 6, mt: 'treads', vis: 1, fuel: 70, cls: 'veh', supply: true,
    carry: ['crawler', 'strider'],
    desc: 'Expeditionary command node. Carries one ground robot and resupplies adjacent units.' },
  static: { name: 'Static', side: 0, cost: 6000, move: 5, mt: 'tires', vis: 3, fuel: 50, cls: 'veh', jam: true,
    desc: 'Electronic-warfare jammer. Enemy drones within 2 tiles lose 30% firepower and take 1 HP of damage each turn.' },
  spark: { name: 'Spark', side: 0, cost: 6000, move: 5, mt: 'treads', vis: 1, fuel: 50, cls: 'veh',
    w1: { name: 'Loitering munitions', ammo: 9, range: [2, 3], dmg: ARTY },
    desc: 'Tracked launcher for loitering munitions. Indirect fire, range 2-3. Cannot move and fire.' },
  moray: { name: 'Moray', side: 0, cost: 15000, move: 5, mt: 'tires', vis: 1, fuel: 50, cls: 'veh',
    w1: { name: 'Cruise missiles', ammo: 6, range: [3, 5], dmg: ROCKET },
    desc: 'Low-cost cruise-missile launcher. Long-range indirect fire, range 3-5.' },
  mallet: { name: 'Mallet', side: 0, cost: 8000, move: 6, mt: 'treads', vis: 2, fuel: 60, cls: 'veh',
    w1: { name: 'Interceptor quads', ammo: 9, dmg: AA },
    desc: 'Counter-drone battery that launches ramming interceptor quadcopters. Shreds drones and rotorcraft.' },
  streak: { name: 'Streak', side: 0, cost: 16000, move: 9, mt: 'air', vis: 2, fuel: 99, burn: 5, cls: 'jet',
    w1: { name: 'Interceptor', ammo: 9, dmg: { drone: 115, heli: 100, jet: 55 } },
    desc: 'Reusable twin-turbojet interceptor. Air-to-air only.' },
  razorwing: { name: 'Razorwing', side: 0, cost: 22000, move: 7, mt: 'air', vis: 2, fuel: 99, burn: 5, cls: 'jet',
    w1: { name: 'Strike munitions', ammo: 9, dmg: { inf: 110, veh: 105, tank: 95, heavy: 80, ship: 85, sub: 95 } },
    w2: { name: 'Cannon', dmg: { drone: 70, heli: 60, jet: 35 } },
    desc: 'Collaborative combat aircraft. Devastating ground strikes; can defend itself in the air.' },
  deepfin: { name: 'Deepfin', side: 0, cost: 18000, move: 5, mt: 'sea', vis: 4, fuel: 60, burn: 1, cls: 'sub', stealth: true,
    w1: { name: 'Torpedoes', ammo: 6, dmg: { ship: 95, sub: 55 } },
    desc: 'Extra-large autonomous submersible. Invisible to the enemy unless they are adjacent.' },

  // ---------------- Drovic Federation (AI): drones and conventional forces ----------------
  rifle: { name: 'Rifle Squad', side: 1, cost: 1000, move: 3, mt: 'foot', vis: 2, fuel: 99, cls: 'inf', cap: true,
    w2: { name: 'Rifles', dmg: MG }, desc: 'Line infantry. Captures property.' },
  atgm: { name: 'ATGM Team', side: 1, cost: 3000, move: 2, mt: 'boot', vis: 2, fuel: 70, cls: 'inf', cap: true,
    w1: { name: 'Guided missile', ammo: 3, dmg: ATGM }, w2: { name: 'Rifles', dmg: MG2 },
    desc: 'Anti-tank missile team. Crosses mountains and rivers, captures property.' },
  buggy: { name: 'Recon Buggy', side: 1, cost: 4000, move: 8, mt: 'tires', vis: 5, fuel: 80, cls: 'veh',
    w2: { name: 'Heavy MG', dmg: { inf: 70, veh: 35, tank: 6, heavy: 1, drone: 35, heli: 12 } },
    desc: 'Fast scout car with a heavy machine gun.' },
  truck: { name: 'Supply Carrier', side: 1, cost: 5000, move: 6, mt: 'treads', vis: 1, fuel: 70, cls: 'veh', supply: true,
    carry: ['rifle', 'atgm'], desc: 'Tracked carrier. Transports one squad and resupplies adjacent units.' },
  tank: { name: 'Battle Tank', side: 1, cost: 7000, move: 6, mt: 'treads', vis: 3, fuel: 70, cls: 'tank',
    w1: { name: 'Cannon', ammo: 9, dmg: { veh: 85, tank: 55, heavy: 15, ship: 10 } },
    w2: { name: 'Coax MG', dmg: { inf: 75, veh: 40, tank: 6, heavy: 1, drone: 20, heli: 10 } },
    desc: 'Main battle tank. Solid all-rounder.' },
  heavy: { name: 'Heavy Tank', side: 1, cost: 16000, move: 5, mt: 'treads', vis: 1, fuel: 50, cls: 'heavy',
    w1: { name: 'Heavy cannon', ammo: 8, dmg: { veh: 105, tank: 85, heavy: 55, ship: 35 } },
    w2: { name: 'Coax MG', dmg: { inf: 105, veh: 45, tank: 10, heavy: 1, drone: 25, heli: 12 } },
    desc: 'Slow, thick-skinned breakthrough tank.' },
  howitzer: { name: 'Howitzer', side: 1, cost: 6000, move: 5, mt: 'treads', vis: 1, fuel: 50, cls: 'veh',
    w1: { name: 'Howitzer', ammo: 9, range: [2, 3], dmg: ARTY },
    desc: 'Self-propelled gun. Indirect fire, range 2-3. Cannot move and fire.' },
  mlrs: { name: 'MLRS', side: 1, cost: 15000, move: 5, mt: 'tires', vis: 1, fuel: 50, cls: 'veh',
    w1: { name: 'Rocket salvo', ammo: 6, range: [3, 5], dmg: ROCKET },
    desc: 'Multiple rocket launcher. Long-range indirect fire, range 3-5.' },
  spaa: { name: 'Flak Track', side: 1, cost: 8000, move: 6, mt: 'treads', vis: 2, fuel: 60, cls: 'veh',
    w1: { name: 'Twin autocannon', ammo: 9, dmg: { ...AA, drone: 115 } },
    desc: 'Self-propelled anti-aircraft guns.' },
  fpv: { name: 'FPV Swarm', side: 1, cost: 4000, move: 6, mt: 'air', vis: 2, fuel: 40, burn: 2, cls: 'drone',
    w1: { name: 'Shaped charges', ammo: 3, dmg: { inf: 70, veh: 55, tank: 45, heavy: 20, ship: 20 } },
    desc: 'A cloud of cheap first-person-view attack drones. Hits ground targets only.' },
  kite: { name: 'Kite OWA', side: 1, cost: 5000, move: 8, mt: 'air', vis: 1, fuel: 30, burn: 3, cls: 'drone', kamikaze: true,
    w1: { name: 'Warhead', ammo: 1, dmg: { inf: 85, veh: 90, tank: 75, heavy: 55, ship: 70 } },
    desc: 'One-way attack drone. Destroyed when it strikes.' },
  gunship: { name: 'Gunship', side: 1, cost: 9000, move: 6, mt: 'air', vis: 3, fuel: 99, burn: 2, cls: 'heli',
    w1: { name: 'Rockets', ammo: 6, dmg: { veh: 55, tank: 55, heavy: 25, ship: 25 } },
    w2: { name: 'Chain gun', dmg: { inf: 75, veh: 30, tank: 6, heavy: 1, drone: 65, heli: 65 } },
    desc: 'Crewed attack helicopter.' },
  corvette: { name: 'Corvette', side: 1, cost: 14000, move: 6, mt: 'sea', vis: 3, fuel: 99, burn: 1, cls: 'ship',
    w1: { name: 'Deck gun', ammo: 9, dmg: { inf: 65, veh: 55, tank: 45, heavy: 30, ship: 45 } },
    w2: { name: 'CIWS / depth charges', dmg: { sub: 85, drone: 110, heli: 90, jet: 55 } },
    desc: 'Coastal warship. Shells the shore and hunts submersibles.' },
};
for (const id in UNITS) UNITS[id].id = id;
const isAir = (t) => UNITS[t].mt === 'air';
const isNaval = (t) => UNITS[t].mt === 'sea';
const isIndirect = (t) => { const w = UNITS[t].w1; return !!(w && w.range && w.range[0] > 1); };
const isDrone = (t) => UNITS[t].cls === 'drone';
const repairKind = (t) => (isAir(t) ? 'air' : isNaval(t) ? 'sea' : 'ground');
const buildKind = repairKind;

const FACTIONS = [
  { id: 'meridian', name: 'Meridian', long: 'Meridian Autonomy Command', color: '#3d8fe0',
    ramp: ['#9fd8ff', '#4a9be8', '#2860b0', '#163266'],
    roster: ['crawler', 'strider', 'wraith', 'watchpost', 'nexus', 'static', 'spark', 'mallet', 'moray', 'streak', 'razorwing', 'deepfin'] },
  { id: 'drovic', name: 'Drovic', long: 'Drovic Federation', color: '#e04a3a',
    ramp: ['#ffa48a', '#e0503c', '#a42c28', '#5a1618'],
    roster: ['rifle', 'atgm', 'buggy', 'truck', 'tank', 'howitzer', 'spaa', 'mlrs', 'heavy', 'fpv', 'kite', 'gunship', 'corvette'] },
];
const NEUTRAL_RAMP = ['#f2efe6', '#c9c4b8', '#8d887e', '#4c4a46'];

// ---------------- Commanders ----------------
// Hooks get (S, unit[, target]) and return additive % modifiers. pw = 0 none, 1 Power, 2 Super Power.
const air = (u) => isAir(u.t);
const indirect = (u) => isIndirect(u.t);
const armor = (u) => UNITS[u.t].cls === 'tank' || UNITS[u.t].cls === 'heavy';
const treads = (u) => UNITS[u.t].mt === 'treads';
const drone = (u) => isDrone(u.t);

const COS = {
  kade: { side: 0, name: 'Ines Kade', title: 'Autonomy Lead',
    bio: 'Wrote half of the swarm-coordination stack herself. Trusts her machines more than most people.',
    d2d: 'Air units +15% firepower.', look: { skin: '#e9b48e', hair: '#2a1d1a', style: 'bob', acc: 'headset', uni: 0 },
    power: { name: 'Overwatch', stars: 3, desc: 'Air units +1 move and +15% more firepower.' },
    super: { name: 'Full Autonomy', stars: 6, desc: 'All units +1 move. Air units +35% more firepower.' },
    atk(S, u, pw) { return air(u) ? 15 + (pw === 1 ? 15 : pw === 2 ? 35 : 0) : 0; },
    move(S, u, pw) { return (pw === 1 && air(u)) || pw === 2 ? 1 : 0; } },
  halden: { side: 0, name: 'Rook Halden', title: 'Sensor Fusion',
    bio: 'Former range officer who now runs the sensor mesh. Sees the shot before you take it.',
    d2d: 'All units +1 vision. Indirect units +10% firepower.', look: { skin: '#8d5a3c', hair: '#151515', style: 'crop', acc: 'visor', uni: 0 },
    power: { name: 'Sensor Net', stars: 3, desc: 'Reveals the whole map. Indirect units +1 range.' },
    super: { name: 'Kill Chain', stars: 6, desc: 'Reveals the whole map. Indirect units +2 range and +30% firepower.' },
    atk(S, u, pw) { return indirect(u) ? 10 + (pw === 2 ? 30 : 0) : 0; },
    vision() { return 1; }, reveal(S, pw) { return pw > 0; },
    range(S, u, pw) { return indirect(u) ? pw : 0; } },
  okafor: { side: 0, name: 'Juno Okafor', title: 'Field Maintenance',
    bio: 'Keeps the fleet running on spare parts and stubbornness. Nothing she fields stays broken for long.',
    d2d: 'Units on friendly property repair 3 HP instead of 2.', look: { skin: '#5b3a28', hair: '#0f0d0c', style: 'puffs', acc: 'goggles', uni: 0 },
    power: { name: 'Hot Swap', stars: 3, desc: 'All units repair 2 HP and are fully resupplied.' },
    super: { name: 'Rapid Reboot', stars: 6, desc: 'All units repair 4 HP, are fully resupplied and get +20% defence.' },
    repair: 3, def(S, u, pw) { return pw === 2 ? 20 : 0; },
    onPower(S, side, pw) { healAll(S, side, pw === 2 ? 40 : 20); } },

  volsk: { side: 1, name: 'Arkady Volsk', title: 'General of Artillery',
    bio: 'Believes any problem can be solved with enough shells. Has rarely been proven wrong.',
    d2d: 'Indirect units +20% firepower. Direct units -10%.', look: { skin: '#e2b190', hair: '#bdb7ad', style: 'bald', acc: 'moustache', uni: 1 },
    power: { name: 'Barrage', stars: 3, desc: 'Indirect units +1 range and +10% firepower.' },
    super: { name: 'Firestorm', stars: 6, desc: 'Shells the densest enemy cluster for 3 HP. Indirect units +1 range.' },
    atk(S, u, pw) { return indirect(u) ? 20 + (pw === 1 ? 10 : 0) : -10; },
    range(S, u, pw) { return indirect(u) && pw ? 1 : 0; },
    onPower(S, side, pw) { if (pw === 2) return clusterStrike(S, side, 30, 2); } },
  strann: { side: 1, name: 'Yeva Strann', title: 'Colonel of Drone Forces',
    bio: 'Built the Federation drone corps out of hobby parts and fear. Buys them by the thousand.',
    d2d: 'Drones +15% firepower and cost 20% less. Other units -5%.', look: { skin: '#f0c6a6', hair: '#d8d1c8', style: 'tied', acc: 'scar', uni: 1 },
    power: { name: 'Swarm Tide', stars: 3, desc: 'Drones +2 move and +15% more firepower.' },
    super: { name: 'Saturation', stars: 6, desc: 'Every enemy unit loses 1 HP. Drones +3 move and +35% firepower.' },
    atk(S, u, pw) { return drone(u) ? 15 + (pw === 1 ? 15 : pw === 2 ? 35 : 0) : -5; },
    move(S, u, pw) { return drone(u) ? (pw === 1 ? 2 : pw === 2 ? 3 : 0) : 0; },
    cost(t) { return isDrone(t) ? 0.8 : 1; },
    onPower(S, side, pw) { if (pw === 2) return damageAll(S, 1 - side, 10); } },
  grosz: { side: 1, name: 'Dmitri Grosz', title: 'Major of Armor',
    bio: 'Leads from the turret hatch. Considers infantry a polite word for speed bumps.',
    d2d: 'Tanks +20% firepower and +10% defence. Infantry -10%.', look: { skin: '#c99068', hair: '#3a2a20', style: 'beret', acc: 'beard', uni: 1 },
    power: { name: 'Breakthrough', stars: 3, desc: 'Treaded units +1 move. Tanks +10% more firepower.' },
    super: { name: 'Steel Avalanche', stars: 6, desc: 'Treaded units +2 move. Tanks +30% firepower, all units +20% defence.' },
    atk(S, u, pw) { return armor(u) ? 20 + (pw === 1 ? 10 : pw === 2 ? 30 : 0) : UNITS[u.t].cls === 'inf' ? -10 : 0; },
    def(S, u, pw) { return (armor(u) ? 10 : 0) + (pw === 2 ? 20 : 0); },
    move(S, u, pw) { return treads(u) ? pw : 0; } },
};
const STAR = 9000; // funds of damage per power star
