// Farhold — game data: elements, products, recipes, technology, planet archetypes, base parts, ships

// ---------- items ----------
// cat: el (element, stacks big), pr (product), cur (currency, never in slots), sp (special/valuable)
// sym: icon glyph; col: icon colour; val: base trade value in units
const ITEMS = {
  carbon: { name: 'Carbon', cat: 'el', sym: 'C', col: 0xd8443c, val: 7, desc: 'Organic element found in every living plant. Fuels the mining beam and many recipes.' },
  ccarbon: { name: 'Condensed Carbon', cat: 'el', sym: 'C+', col: 0xff6a4a, val: 24, desc: 'Carbon compressed in a refiner. Dense and useful.' },
  ferrite: { name: 'Ferrite Dust', cat: 'el', sym: 'Fe', col: 0xa8aab4, val: 14, desc: 'Metallic dust found in almost every rock. Basic building material.' },
  pferrite: { name: 'Pure Ferrite', cat: 'el', sym: 'Fe+', col: 0xd0d4de, val: 28, desc: 'Ferrite dust refined to a pure metal.' },
  mferrite: { name: 'Magnetic Ferrite', cat: 'el', sym: 'Fe*', col: 0x8fc8ff, val: 82, desc: 'Pure ferrite refined further until it holds a charge.' },
  oxygen: { name: 'Oxygen', cat: 'el', sym: 'O₂', col: 0xff5a7a, val: 34, desc: 'Harvested from the red bulbs of oxygen plants. Recharges life support.' },
  sodium: { name: 'Sodium', cat: 'el', sym: 'Na', col: 0xf2c230, val: 20, desc: 'Harvested from glowing yellow plants. Recharges hazard protection.' },
  sodnit: { name: 'Sodium Nitrate', cat: 'el', sym: 'Na+', col: 0xffd860, val: 40, desc: 'Refined sodium. Recharges hazard protection twice as well.' },
  dihydro: { name: 'Di-hydrogen', cat: 'el', sym: 'H', col: 0x4aa8ff, val: 34, desc: 'Mined from blue crystals. Refuels the lift thrusters.' },
  tritium: { name: 'Tritium', cat: 'el', sym: 'Tr', col: 0x6ae0d0, val: 6, desc: 'Abundant in asteroids. Fuels the pulse drive.' },
  cobalt: { name: 'Cobalt', cat: 'el', sym: 'Co', col: 0x4b7bd8, val: 198, desc: 'Blue mineral found in boulders and deposits.' },
  copper: { name: 'Copper', cat: 'el', sym: 'Cu', col: 0xe08a3a, val: 110, desc: 'Stellar metal found near yellow stars. Refines into chromatic metal.' },
  cadmium: { name: 'Cadmium', cat: 'el', sym: 'Cd', col: 0xe03a3a, val: 234, desc: 'Stellar metal found near red stars.' },
  emeril: { name: 'Emeril', cat: 'el', sym: 'Em', col: 0x3ad070, val: 275, desc: 'Stellar metal found near green stars.' },
  indium: { name: 'Indium', cat: 'el', sym: 'In', col: 0x5a8aff, val: 464, desc: 'Stellar metal found near blue stars.' },
  chromatic: { name: 'Chromatic Metal', cat: 'el', sym: 'Cr', col: 0xf0a0ff, val: 245, desc: 'A shifting alloy refined from stellar metals. Needed for advanced technology.' },
  gold: { name: 'Gold', cat: 'el', sym: 'Au', col: 0xffcc44, val: 220, desc: 'Precious metal. Sells well.' },
  silver: { name: 'Silver', cat: 'el', sym: 'Ag', col: 0xd8e0e8, val: 100, desc: 'Precious metal. Sells reasonably well.' },
  paraffin: { name: 'Paraffinium', cat: 'el', sym: 'Pf', col: 0xff9a50, val: 62, desc: 'Waxy element from the star bulbs of lush worlds.' },
  pyrite: { name: 'Pyrite', cat: 'el', sym: 'Py', col: 0xe6c060, val: 62, desc: 'Glittering element from the desert worlds.' },
  dioxite: { name: 'Dioxite', cat: 'el', sym: 'Dx', col: 0x9ee0ff, val: 62, desc: 'Frost-crystal element from frozen worlds.' },
  phosphorus: { name: 'Phosphorus', cat: 'el', sym: 'P', col: 0xff7040, val: 62, desc: 'Combustible element from scorched worlds.' },
  ammonia: { name: 'Ammonia', cat: 'el', sym: 'NH', col: 0xb0e040, val: 62, desc: 'Pungent element from toxic worlds.' },
  uranium: { name: 'Uranium', cat: 'el', sym: 'U', col: 0x90ff40, val: 62, desc: 'Radioactive element. Handle with gloves.' },
  rust: { name: 'Rusted Metal', cat: 'el', sym: 'Rs', col: 0xb06a40, val: 20, desc: 'Corroded metal scraped from dead worlds.' },
  prismite: { name: 'Prismite', cat: 'el', sym: 'Pr', col: 0xff60e0, val: 90, desc: 'Strange refractive element from anomalous worlds.' },
  mordite: { name: 'Mordite', cat: 'el', sym: 'Mo', col: 0x8a3a8a, val: 40, desc: 'A dark substance left behind by fallen creatures.' },
  // products
  plate: { name: 'Hull Plate', cat: 'pr', sym: '▣', col: 0xa0b0c0, val: 300, desc: 'A sturdy plate pressed from ferrite. Used in repairs and construction.' },
  seal: { name: 'Seal Gel', cat: 'pr', sym: '◉', col: 0xff6050, val: 420, desc: 'An airtight carbon polymer. Patches ruptured systems.' },
  weave: { name: 'Carbon Weave', cat: 'pr', sym: '≋', col: 0xd05050, val: 500, desc: 'Woven carbon nanotubes. Light and strong.' },
  jelly: { name: 'Hydro Jelly', cat: 'pr', sym: '◍', col: 0x4aa8ff, val: 200, desc: 'Gelled di-hydrogen. Refills 50% of the lift thrusters.' },
  liftfuel: { name: 'Lift Fuel', cat: 'pr', sym: '▲', col: 0x60c0ff, val: 450, desc: 'Refills the lift thrusters completely.' },
  ioncell: { name: 'Ion Cell', cat: 'pr', sym: '⚡', col: 0x60a0ff, val: 200, desc: 'Recharges 50% of hazard protection.' },
  lifegel: { name: 'Life Gel', cat: 'pr', sym: '✚', col: 0xff7090, val: 300, desc: 'Recharges life support completely.' },
  shieldcell: { name: 'Shield Cell', cat: 'pr', sym: '⬡', col: 0x80e0ff, val: 260, desc: 'Restores the exosuit shield instantly.' },
  antimatter: { name: 'Antimatter', cat: 'pr', sym: '✦', col: 0xff60ff, val: 1500, desc: 'A contained speck of antimatter. Core of every warp cell.' },
  housing: { name: 'Antimatter Housing', cat: 'pr', sym: '⬢', col: 0xc0a0ff, val: 900, desc: 'A magnetic bottle for antimatter.' },
  warpcell: { name: 'Warp Cell', cat: 'pr', sym: '✺', col: 0xffa0ff, val: 3800, desc: 'Powers one hyperspace jump.' },
  circuit: { name: 'Circuit Board', cat: 'pr', sym: '⌗', col: 0x60ff9a, val: 1200, desc: 'Precision circuitry for advanced technology.' },
  // valuables
  storm: { name: 'Storm Crystal', cat: 'sp', sym: '❄', col: 0x9ef0ff, val: 3000, desc: 'A crystal that forms only during violent storms. Highly prized.' },
  relic: { name: 'Relic Shard', cat: 'sp', sym: '◈', col: 0xffd080, val: 8000, desc: 'A fragment of an ancient civilisation. Collectors pay handsomely.' },
  datapad: { name: 'Salvaged Data', cat: 'sp', sym: '⌘', col: 0x60e0a0, val: 500, desc: 'Recovered data. Technology merchants trade blueprints for it.' },
  egg: { name: 'Creature Egg', cat: 'sp', sym: '◒', col: 0xffe0b0, val: 1200, desc: 'A warm egg from a contented creature.' },
};
for (const k in ITEMS) { const it = ITEMS[k]; it.id = k; it.stack = it.cat === 'el' ? 250 : it.cat === 'pr' ? 10 : 5; }
const STAR_METAL = { G: 'copper', M: 'cadmium', E: 'emeril', O: 'indium' };

// ---------- crafting ----------
const RECIPES = [
  { out: 'plate', n: 1, in: { ferrite: 50 } },
  { out: 'seal', n: 1, in: { carbon: 30 } },
  { out: 'weave', n: 1, in: { carbon: 50 } },
  { out: 'jelly', n: 1, in: { dihydro: 40 } },
  { out: 'liftfuel', n: 1, in: { dihydro: 40, plate: 1 } },
  { out: 'ioncell', n: 1, in: { ferrite: 30, cobalt: 10 } },
  { out: 'lifegel', n: 1, in: { jelly: 1, carbon: 20 } },
  { out: 'shieldcell', n: 1, in: { sodium: 30, ferrite: 20 } },
  { out: 'antimatter', n: 1, in: { chromatic: 25, ccarbon: 20 } },
  { out: 'housing', n: 1, in: { oxygen: 30, pferrite: 50 } },
  { out: 'warpcell', n: 1, in: { antimatter: 1, housing: 1 } },
  { out: 'circuit', n: 1, in: { chromatic: 40, weave: 1, gold: 10 } },
];
// refiner: one input -> output at ratio in:out, seconds per output unit
const REFINE = [
  { in: 'carbon', a: 2, out: 'ccarbon', b: 1 },
  { in: 'ferrite', a: 1, out: 'pferrite', b: 1 },
  { in: 'pferrite', a: 2, out: 'mferrite', b: 1 },
  { in: 'sodium', a: 2, out: 'sodnit', b: 1 },
  { in: 'copper', a: 2, out: 'chromatic', b: 1 },
  { in: 'cadmium', a: 1, out: 'chromatic', b: 1 },
  { in: 'emeril', a: 1, out: 'chromatic', b: 2 },
  { in: 'indium', a: 1, out: 'chromatic', b: 3 },
  { in: 'oxygen', a: 2, out: 'carbon', b: 1 },
  { in: 'mordite', a: 1, out: 'carbon', b: 2 },
  { in: 'rust', a: 1, out: 'ferrite', b: 2 },
  { in: 'paraffin', a: 1, out: 'dihydro', b: 1 },
  { in: 'pyrite', a: 1, out: 'gold', b: 1, rate: 0.1 },
  { in: 'dioxite', a: 1, out: 'ccarbon', b: 1 },
  { in: 'phosphorus', a: 1, out: 'sodnit', b: 1 },
  { in: 'ammonia', a: 1, out: 'oxygen', b: 1 },
  { in: 'uranium', a: 1, out: 'tritium', b: 4 },
  { in: 'prismite', a: 1, out: 'chromatic', b: 1 },
  { in: 'tritium', a: 5, out: 'dihydro', b: 1 },
];

// ---------- technology ----------
// slot: suit | tool | ship. cost: materials to build/install. nan: nanite price for the blueprint at a merchant.
// fx: stat modifiers merged at runtime.
const TECH = {
  // exosuit
  lifesup: { name: 'Life Support', slot: 'suit', base: true, desc: 'Keeps you breathing. Drains slowly; recharge with Oxygen or Life Gel.' },
  hazard: { name: 'Hazard Protection', slot: 'suit', base: true, desc: 'Shields you from extreme heat, cold, toxins and radiation. Recharge with Sodium.' },
  jetpack: { name: 'Jetpack', slot: 'suit', base: true, desc: 'Hold Jump in the air to fly briefly.' },
  shield: { name: 'Personal Shield', slot: 'suit', base: true, desc: 'Absorbs damage and recharges on its own.' },
  jet2: { name: 'Efficient Thrusters', slot: 'suit', nan: 120, cost: { plate: 2, dihydro: 60 }, fx: { jet: 1.6 }, desc: 'Jetpack burns 40% less fuel and climbs faster.' },
  life2: { name: 'Oxygen Recycler', slot: 'suit', nan: 150, cost: { oxygen: 80, seal: 1 }, fx: { life: 0.55 }, desc: 'Life support drains 45% slower.' },
  haz2: { name: 'Hazard Lining', slot: 'suit', nan: 180, cost: { sodnit: 40, weave: 1 }, fx: { haz: 0.5 }, desc: 'Hazard protection drains half as fast in every environment.' },
  shield2: { name: 'Shield Lattice', slot: 'suit', nan: 200, cost: { pferrite: 80, ioncell: 2 }, fx: { shield: 1.6 }, desc: '+60% shield strength.' },
  sprint2: { name: 'Stamina Booster', slot: 'suit', nan: 90, cost: { oxygen: 40, carbon: 60 }, fx: { stam: 1.7 }, desc: 'Sprint for much longer.' },
  // multitool
  mining: { name: 'Mining Beam', slot: 'tool', base: true, desc: 'Breaks down rocks, plants and minerals into elements.' },
  scanner: { name: 'Scanner', slot: 'tool', base: true, broken: true, repair: { ferrite: 30 }, desc: 'Pulse to reveal resources and structures nearby.' },
  visor: { name: 'Analysis Visor', slot: 'tool', base: true, desc: 'Study creatures, plants and minerals to record discoveries.' },
  bolt: { name: 'Bolt Caster', slot: 'tool', base: true, desc: 'A projectile weapon. Reloads with Ferrite Dust.' },
  mine2: { name: 'Optical Drill', slot: 'tool', nan: 140, cost: { pferrite: 60, chromatic: 20 }, fx: { mine: 1.6 }, desc: 'Mining beam extracts 60% faster.' },
  scan2: { name: 'Wide-band Scanner', slot: 'tool', nan: 100, cost: { ferrite: 80, carbon: 40 }, fx: { scan: 2 }, desc: 'Doubles scanner range and reveals structures further away.' },
  bolt2: { name: 'Rapid Bolts', slot: 'tool', nan: 160, cost: { mferrite: 30, chromatic: 30 }, fx: { bolt: 1.4 }, desc: 'Bolt caster fires faster and hits harder.' },
  cool2: { name: 'Heat Sink', slot: 'tool', nan: 90, cost: { dioxite: 30, pferrite: 40 }, fx: { cool: 1.8 }, desc: 'Mining beam overheats far less.' },
  // starship
  thrusters: { name: 'Lift Thrusters', slot: 'ship', base: true, broken: true, repair: { plate: 1, seal: 1 }, desc: 'Lift the ship off the ground. Each launch burns fuel unless you leave from a landing pad.' },
  pulse: { name: 'Pulse Drive', slot: 'ship', base: true, broken: true, repair: { plate: 2, jelly: 1 }, desc: 'Hold Pulse in space to cross a star system in seconds. Fuel: Tritium.' },
  deflector: { name: 'Deflector Shield', slot: 'ship', base: true, desc: 'Protects the hull. Recharge with Sodium.' },
  cannon: { name: 'Pulse Cannon', slot: 'ship', base: true, desc: 'Rapid-fire ship weapon. Overheats with sustained fire.' },
  warpdrive: { name: 'Warp Drive', slot: 'ship', nan: 0, cost: { plate: 3, chromatic: 50, weave: 2 }, desc: 'Jump between star systems. Each jump uses one Warp Cell.' },
  cadmiumdrive: { name: 'Cadmium Drive', slot: 'ship', nan: 250, cost: { cadmium: 100, circuit: 1 }, req: 'warpdrive', desc: 'Lets the warp drive reach red stars.' },
  emerildrive: { name: 'Emeril Drive', slot: 'ship', nan: 400, cost: { emeril: 100, circuit: 2 }, req: 'cadmiumdrive', desc: 'Lets the warp drive reach green stars.' },
  indiumdrive: { name: 'Indium Drive', slot: 'ship', nan: 600, cost: { indium: 100, circuit: 3 }, req: 'emerildrive', desc: 'Lets the warp drive reach blue stars.' },
  reactor: { name: 'Warp Reactor', slot: 'ship', nan: 300, cost: { chromatic: 80, mferrite: 40 }, req: 'warpdrive', fx: { range: 1.8 }, desc: 'Extends warp range by 80%.' },
  cannon2: { name: 'Overcharged Cannon', slot: 'ship', nan: 220, cost: { pferrite: 80, chromatic: 40 }, fx: { gun: 1.5 }, desc: 'Ship cannon does 50% more damage.' },
  deflector2: { name: 'Reinforced Deflector', slot: 'ship', nan: 240, cost: { mferrite: 40, sodnit: 40 }, fx: { dshield: 1.7 }, desc: '+70% ship shield strength.' },
  pulse2: { name: 'Pulse Overdrive', slot: 'ship', nan: 180, cost: { tritium: 200, chromatic: 20 }, fx: { pulse: 1.5 }, desc: 'Pulse drive is 50% faster and burns less fuel.' },
};
for (const k in TECH) TECH[k].id = k;

// ---------- planet archetypes ----------
// temp: day range °C; haz: hazard kind; storm: name of storm; flora/fauna: life density; sea: chance of oceans;
// terr: terrain parameter ranges; sky hues used by the palette generator.
const PLANET_TYPES = {
  lush: { name: 'Lush', adj: ['Verdant', 'Paradise', 'Lush', 'Overgrown', 'Tropical', 'Flourishing'], temp: [14, 34], haz: 'heat', hazMul: 0.15, storm: 'Superheated Rain', stormTemp: 60, flora: 1, fauna: 1, sea: 0.85, special: 'paraffin', atmo: 1,
    terr: { amp: [70, 150], cont: [0.8, 1.1], mtn: [0.3, 0.9], hills: [0.15, 0.35], terr: 0, crat: 0, warp: [0, 0.5], canyon: 0 }, floraStyles: ['round', 'conifer', 'palm', 'mushroom', 'fern', 'bulbtree'] },
  frozen: { name: 'Frozen', adj: ['Frozen', 'Icebound', 'Glacial', 'Frostbound', 'Arctic', 'Freezing'], temp: [-90, -35], haz: 'cold', hazMul: 1, storm: 'Blizzard', stormTemp: -150, flora: 0.5, fauna: 0.45, sea: 0.35, special: 'dioxite', atmo: 1,
    terr: { amp: [80, 170], cont: [0.8, 1.1], mtn: [0.6, 1.2], hills: [0.2, 0.4], terr: 0, crat: 0, warp: [0, 0.3], canyon: [0, 0.4] }, floraStyles: ['conifer', 'crystal', 'deadtree', 'fern'] },
  scorched: { name: 'Scorched', adj: ['Scorched', 'Torrid', 'Boiling', 'Blistered', 'Charred', 'Incandescent'], temp: [60, 115], haz: 'heat', hazMul: 1, storm: 'Firestorm', stormTemp: 190, flora: 0.4, fauna: 0.35, sea: 0, special: 'phosphorus', atmo: 1,
    terr: { amp: [60, 140], cont: [0.6, 1], mtn: [0.3, 0.8], hills: [0.2, 0.4], terr: [0, 6], crat: 0, warp: [0, 0.6], canyon: [0.2, 0.7] }, floraStyles: ['cactus', 'deadtree', 'coral', 'spike'] },
  toxic: { name: 'Toxic', adj: ['Toxic', 'Caustic', 'Poisonous', 'Noxious', 'Acidic', 'Blighted'], temp: [20, 48], haz: 'toxic', hazMul: 1, storm: 'Acid Rain', stormTemp: 40, flora: 0.7, fauna: 0.5, sea: 0.5, special: 'ammonia', atmo: 1,
    terr: { amp: [60, 130], cont: [0.8, 1.1], mtn: [0.2, 0.7], hills: [0.2, 0.4], terr: 0, crat: 0, warp: [0.3, 0.9], canyon: 0 }, floraStyles: ['mushroom', 'tentacle', 'bulbtree', 'spike'] },
  radioactive: { name: 'Irradiated', adj: ['Irradiated', 'Radioactive', 'Contaminated', 'Isotopic', 'Nuclear'], temp: [-10, 40], haz: 'rad', hazMul: 1, storm: 'Radiation Storm', stormTemp: 30, flora: 0.55, fauna: 0.4, sea: 0.2, special: 'uranium', atmo: 1,
    terr: { amp: [60, 140], cont: [0.8, 1.1], mtn: [0.3, 0.9], hills: [0.2, 0.4], terr: [0, 4], crat: [0, 0.4], warp: [0, 0.5], canyon: [0, 0.4] }, floraStyles: ['spike', 'mushroom', 'deadtree', 'crystal'] },
  barren: { name: 'Barren', adj: ['Barren', 'Desert', 'Arid', 'Dusty', 'Parched', 'Desolate'], temp: [28, 58], haz: 'heat', hazMul: 0.35, storm: 'Dust Storm', stormTemp: 85, flora: 0.25, fauna: 0.3, sea: 0, special: 'pyrite', atmo: 1,
    terr: { amp: [50, 120], cont: [0.6, 1], mtn: [0.2, 0.6], hills: [0.15, 0.3], terr: [3, 8], crat: 0, warp: [0, 0.4], canyon: [0.2, 0.6] }, floraStyles: ['cactus', 'deadtree', 'spike'] },
  dead: { name: 'Dead', adj: ['Dead', 'Lifeless', 'Airless', 'Cratered', 'Silent'], temp: [-60, 20], haz: 'none', hazMul: 0, storm: null, flora: 0, fauna: 0, sea: 0, special: 'rust', atmo: 0,
    terr: { amp: [50, 120], cont: [0.5, 0.9], mtn: [0.1, 0.4], hills: [0.15, 0.3], terr: 0, crat: [0.6, 1.2], warp: 0, canyon: 0 }, floraStyles: [] },
  exotic: { name: 'Exotic', adj: ['Anomalous', 'Bizarre', 'Glassy', 'Shattered', 'Erratic'], temp: [-5, 30], haz: 'rad', hazMul: 0.4, storm: 'Static Storm', stormTemp: 20, flora: 0.6, fauna: 0.3, sea: 0.15, special: 'prismite', atmo: 1,
    terr: { amp: [70, 160], cont: [0.6, 1], mtn: [0.2, 0.6], hills: [0.2, 0.4], terr: [0, 5], crat: 0, warp: [0.6, 1.2], canyon: 0, spikes: [0.5, 1.2] }, floraStyles: ['spiral', 'orb', 'tentacle', 'crystal'] },
};
const HAZ_LABEL = { none: 'None', heat: 'Extreme Heat', cold: 'Extreme Cold', toxic: 'Toxic', rad: 'Radiation' };
const SENTINEL_LV = [{ name: 'Absent', k: 0 }, { name: 'Low Security', k: 0.5 }, { name: 'Standard', k: 1 }, { name: 'Aggressive', k: 2 }];

// ---------- base building parts ----------
// grid: how the part snaps (cell = centred on a 4 m cell, edge = on a cell edge, free = placed anywhere)
const PARTS = {
  basecomp: { name: 'Base Computer', cost: { ferrite: 40, carbon: 20 }, grid: 'free', desc: 'Claims the land around it as your base. Respawn and save here.' },
  floor: { name: 'Floor Panel', cost: { ferrite: 20 }, grid: 'cell', desc: 'A 4 × 4 m floor.' },
  wall: { name: 'Wall', cost: { ferrite: 20 }, grid: 'edge', desc: 'A solid metal wall.' },
  door: { name: 'Doorway', cost: { ferrite: 20 }, grid: 'edge', desc: 'A wall with an opening.' },
  window: { name: 'Window Wall', cost: { ferrite: 15, dihydro: 10 }, grid: 'edge', desc: 'A wall with a wide window.' },
  roof: { name: 'Roof Panel', cost: { ferrite: 20 }, grid: 'roof', desc: 'Covers a 4 × 4 m cell. Sheltered rooms protect you from hazards.' },
  ramp: { name: 'Ramp', cost: { ferrite: 30 }, grid: 'cell', desc: 'Climb up a storey.' },
  light: { name: 'Light Pole', cost: { carbon: 10, sodium: 5 }, grid: 'free', desc: 'A warm light.' },
  crate: { name: 'Storage Crate', cost: { plate: 1, ferrite: 20 }, grid: 'free', desc: 'Holds 10 stacks of anything.' },
  refiner: { name: 'Refiner', cost: { ferrite: 30, sodium: 20 }, grid: 'free', desc: 'Refines elements over time.' },
  pad: { name: 'Landing Pad', cost: { plate: 2, ferrite: 40 }, grid: 'free', desc: 'Launching from a pad costs no lift fuel.' },
  beacon: { name: 'Save Beacon', cost: { ferrite: 20, carbon: 20 }, grid: 'free', desc: 'Save your progress here at any time.' },
  teleport: { name: 'Teleporter', cost: { plate: 2, chromatic: 20 }, grid: 'free', desc: 'Travel between your bases and the space stations you have visited.' },
  planter: { name: 'Hydroponic Tray', cost: { ferrite: 20, carbon: 20 }, grid: 'free', desc: 'Grows oxygen and sodium plants. Harvest every few minutes.' },
  flag: { name: 'Banner', cost: { carbon: 5 }, grid: 'free', desc: 'Plant your colours.' },
};
for (const k in PARTS) PARTS[k].id = k;

// ---------- starships ----------
// class stats: cargo slots, speed multiplier, shield, damage, manoeuvrability
const SHIP_TYPES = {
  shuttle: { name: 'Shuttle', slots: 18, speed: 1, shield: 1, dmg: 1, turn: 1, price: 0 },
  fighter: { name: 'Fighter', slots: 16, speed: 1.15, shield: 1.2, dmg: 1.5, turn: 1.25, price: 180000 },
  explorer: { name: 'Explorer', slots: 22, speed: 1.3, shield: 0.9, dmg: 0.9, turn: 1.05, price: 240000 },
  hauler: { name: 'Hauler', slots: 32, speed: 0.9, shield: 1.6, dmg: 0.9, turn: 0.8, price: 320000 },
};

// ---------- economy ----------
const ECONOMIES = [
  { name: 'Mining', buy: 0.9, sell: 0.85, favour: ['ferrite', 'pferrite', 'cobalt', 'gold', 'silver'] },
  { name: 'Trading', buy: 1, sell: 1, favour: ['plate', 'seal', 'weave'] },
  { name: 'Scientific', buy: 1.05, sell: 1.05, favour: ['circuit', 'antimatter', 'datapad'] },
  { name: 'Technology', buy: 1.1, sell: 1, favour: ['chromatic', 'mferrite', 'housing'] },
  { name: 'Manufacturing', buy: 0.95, sell: 0.9, favour: ['carbon', 'ccarbon', 'oxygen', 'sodium'] },
  { name: 'Power Generation', buy: 1, sell: 0.95, favour: ['dihydro', 'tritium', 'uranium', 'liftfuel'] },
];
const CONFLICT = ['Peaceful', 'Unsettled', 'Dangerous', 'Lawless'];

// ---------- lore: the voice of the ship's mind and the ancient waystones ----------
const LORE = [
  'The stone hums when you touch it. A sequence of glyphs lights in turn, and you understand: <i>we also came here following the signal.</i>',
  'Carved deep in the obelisk: a spiral of stars, and at its heart a single mark. The word beneath it translates, roughly, as <i>“the far hold”</i>.',
  'Glyphs flow across the surface like water. <i>Those who reach the centre do not return. We do not know if that is a warning.</i>',
  'A map, or a poem. <i>Every world is a door. Every door is a question. The signal is the only answer we ever heard.</i>',
  'The waystone shows a ship much like yours, crashing again and again on a thousand different worlds. The same ship. The same pilot.',
  'A soft chime. <i>Traveller, we left this for you. You are late, but you are not the last.</i>',
  'The glyphs describe a machine at the galactic core that dreams the stars into being, and a beacon that calls its dreamers home.',
  'Scratched beside the official text, in a cruder hand: <i>I turned back. I regret it every day.</i>',
];
const SOLA = {
  wake: 'Pilot. You are awake. I am SOLA, your ship’s mind — what is left of it. Your life support is failing. Mine rocks for <b>Ferrite Dust</b> with the mining beam.',
  scanner: 'Good. Open your inventory and repair the <b>Scanner</b> with that ferrite, then press <b>[scan]</b> to pulse it.',
  oxygen: 'The red bulbs nearby are <b>oxygen plants</b>. Harvest them with <b>[interact]</b>, then recharge life support from the quick menu <b>[quick]</b>.',
  ship: 'I have marked our ship. It is in poor shape. Reach it and we will begin repairs.',
  thrusters: 'The <b>Lift Thrusters</b> are ruptured. We need a <b>Hull Plate</b> (50 Ferrite Dust) and <b>Seal Gel</b> (30 Carbon). Craft them in your inventory, then repair the thrusters.',
  fuel: 'Thrusters repaired. They need fuel: <b>Di-hydrogen</b> from the blue crystals, or Hydro Jelly. Recharge them from the ship’s technology panel.',
  pulse: 'One more thing before we can leave orbit: the <b>Pulse Drive</b>. Two Hull Plates and one Hydro Jelly (40 Di-hydrogen) should do it.',
  launch: 'Everything checks out. Climb aboard with <b>[interact]</b> and hold <b>[thrust]</b> to lift off. Let’s see the sky.',
  space: 'There it is. Space. I am picking up a <b>space station</b> in this system — fly to it, and hold <b>[pulse]</b> to cross the distance quickly. Mine asteroids with the cannon for Tritium.',
  station: 'Fly straight into the glowing hangar mouth to dock. Inside you can sell what you have gathered and buy upgrades.',
  docked: 'Welcome to civilisation, such as it is. Use the <b>trade terminal</b> to sell. The <b>technology merchant</b> sells blueprints for nanites — earn nanites by uploading discoveries.',
  warp: 'I have isolated the signal again. It comes from the galactic core — a place the old charts call <b>Farhold</b>. We will need a <b>Warp Drive</b>: 3 Hull Plates, 50 Chromatic Metal and 2 Carbon Weave. Chromatic metal comes from refining stellar metals like Copper.',
  warpcell: 'The warp drive is built. Each jump needs a <b>Warp Cell</b> — Antimatter plus an Antimatter Housing. Open the galaxy map <b>[map]</b>, choose a star toward the core and hold <b>[warp]</b> in space.',
  jump1: 'The signal is stronger here. Keep going. I want to know what is waiting at the centre as much as you do.',
  jump2: 'Pilot, I have been running the numbers. The signal is not a broadcast. It is a reply. Something at the core is answering us.',
  jump3: 'We are getting close. I am detecting other ships on similar headings — all of them silent, all of them old.',
  core: 'We are here. Farhold. Pilot… I do not know what happens next. Whatever it is, I am glad it was you.',
  base: 'If you find a world you like, build a <b>Base Computer</b> from the build menu <b>[build]</b>. It will hold your progress, and our coordinates.',
  storm: 'Storm incoming. Hazard protection will drain much faster — find shelter in a cave, a building or the ship.',
  lowlife: 'Life support is critical. Recharge it with Oxygen from the quick menu.',
  lowhaz: 'Hazard protection is failing. Recharge it with Sodium, or get to shelter.',
  wanted: 'Sentinels have flagged you. Break line of sight or leave the area until they lose interest.',
  pirates: 'Pirates! Their ships are closing on us. Fight, or hold <b>[pulse]</b> to escape when they back off.',
};
