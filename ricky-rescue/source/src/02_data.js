// Ricky Rescue — static data: ranks, rigs, cosmetics, districts, hospitals, supplies, names

const SAVE_KEY = 'ricky-rescue.save.v1';
const OPTS_KEY = 'ricky-rescue.opts';

// Certification ranks. The partner (Marisol) is an EMT and only ever does basic skills; advanced skills are Ricky's.
const RANKS = [
  { id: 'emt', name: 'EMT', long: 'EMT-Basic', xp: 0, color: '#7fc4ff',
    blurb: 'Oxygen, airways, CPR and the AED, bleeding control, splints, spinal care, oral glucose, aspirin, nitro, epinephrine auto-injector, nasal naloxone, albuterol, childbirth.' },
  { id: 'aemt', name: 'AEMT', long: 'Advanced EMT', xp: 1400, color: '#8ee08a',
    blurb: 'IV access and fluids, D10, glucagon, IV naloxone, the i-gel airway and 12-lead ECGs sent ahead to the hospital.' },
  { id: 'medic', name: 'Paramedic', long: 'Paramedic', xp: 3800, color: '#ffb257',
    blurb: 'Manual defibrillation and pacing, cardiac drugs, pain relief, CPAP, intubation, needle decompression, TXA, midazolam. Mass-casualty incidents start coming in.' },
  { id: 'fto', name: 'FTO', long: 'Field Training Officer', xp: 8000, color: '#ff7ab0',
    blurb: 'The top of the ladder. Marisol works faster beside you, and the station pays a training bonus on every call.' },
];
function rankFor(xp) { let r = 0; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i; return r; }

// Rigs. speed is top speed in m/s, accel in m/s², ride is how steady the patient compartment is (higher is calmer),
// cap scales the supply cabinets.
const RIGS = {
  van: { name: 'Type II Medic Van', short: 'Type II', cost: 0, speed: 34, accel: 7.2, grip: 1.0, len: 6.0, wid: 2.1, hgt: 2.75, ride: 0.85, cap: 1.0, load: 1.0,
    blurb: 'A high-roof van. Quick, nimble in alleys, cramped in the back.' },
  cutaway: { name: 'Type III Cutaway', short: 'Type III', cost: 9000, speed: 33, accel: 6.3, grip: 1.0, len: 7.0, wid: 2.4, hgt: 3.05, ride: 1.05, cap: 1.4, load: 0.85,
    blurb: 'A van cab on a modular box. More cabinets, a steadier ride, room to work on both sides of the stretcher.' },
  box: { name: 'Type I Heavy Duty', short: 'Type I', cost: 22000, speed: 31, accel: 5.8, grip: 0.97, len: 7.7, wid: 2.5, hgt: 3.2, ride: 1.3, cap: 1.8, load: 0.6,
    blurb: 'A truck chassis with a big box. The smoothest ride in the fleet, the most supplies, and a powered stretcher mount.' },
};
const LIVERIES = {
  classic: { name: 'Classic', cost: 0, body: 0xf4f4f0, stripe: 0xd8262e, stripe2: 0xd8262e, cab: 0xf4f4f0, text: 0xd8262e },
  metro: { name: 'Metro Blue', cost: 800, body: 0xf4f4f0, stripe: 0x1f5fd0, stripe2: 0xffffff, cab: 0xf4f4f0, text: 0x1f5fd0 },
  county: { name: 'County Battenburg', cost: 1500, body: 0xd6f02a, stripe: 0x1d6be0, stripe2: 0xd6f02a, cab: 0xd6f02a, text: 0x1d3a8a, check: true },
  midnight: { name: 'Midnight', cost: 2500, body: 0x18233d, stripe: 0xf0c040, stripe2: 0xd8262e, cab: 0x18233d, text: 0xf0c040 },
  heritage: { name: 'Heritage 1974', cost: 3000, body: 0xf2e8d0, stripe: 0xe86a18, stripe2: 0xe86a18, cab: 0xf2e8d0, text: 0xe86a18 },
  ember: { name: 'Ember', cost: 4000, body: 0xc81e28, stripe: 0xffffff, stripe2: 0xffffff, cab: 0xc81e28, text: 0xffffff },
};
// Light-bar patterns: each is a list of [time fraction, left on, right on] steps over one period (seconds).
const LIGHTS = {
  alt: { name: 'Alternating', cost: 0, period: 0.7, steps: [[0, 1, 0], [0.5, 0, 1]] },
  wigwag: { name: 'Wig-wag', cost: 600, period: 0.5, steps: [[0, 1, 0], [0.12, 0, 0], [0.25, 0, 1], [0.37, 0, 0]] },
  quad: { name: 'Quad flash', cost: 900, period: 1.0, steps: [[0, 1, 0], [0.06, 0, 0], [0.12, 1, 0], [0.18, 0, 0], [0.24, 1, 0], [0.3, 0, 0], [0.5, 0, 1], [0.56, 0, 0], [0.62, 0, 1], [0.68, 0, 0], [0.74, 0, 1], [0.8, 0, 0]] },
  sweep: { name: 'Rotator sweep', cost: 1200, period: 0.9, sweep: true, steps: [[0, 1, 1]] },
};
const LIGHT_COLORS = {
  redwhite: { name: 'Red / white', cost: 0, a: 0xff2a2a, b: 0xffffff },
  redred: { name: 'All red', cost: 400, a: 0xff2a2a, b: 0xff2a2a },
  redblue: { name: 'Red / blue', cost: 700, a: 0xff2a2a, b: 0x3a6aff },
  redamber: { name: 'Red / amber', cost: 700, a: 0xff2a2a, b: 0xffa020 },
};
const UNIFORMS = {
  navy: { name: 'Navy', cost: 0, shirt: 0x1f2b4a, pants: 0x1a2236 },
  forest: { name: 'Forest', cost: 500, shirt: 0x24402e, pants: 0x1e2a22 },
  black: { name: 'Black', cost: 800, shirt: 0x1c1d22, pants: 0x18191d },
  maroon: { name: 'Maroon', cost: 800, shirt: 0x5a1f2a, pants: 0x1c1d22 },
  sky: { name: 'Sky shirt', cost: 600, shirt: 0x6e9acb, pants: 0x1a2236 },
};
const SKINS = [0xf2d3bd, 0xe0b48f, 0xc68c62, 0xa06a44, 0x7a4a2c, 0x553322];
const HAIRS = [0x1c1612, 0x3a2516, 0x6a4424, 0xa87a3a, 0xd8c08a, 0x8a8a8a, 0xb2402a];

const DISTRICTS = {
  maple: { name: 'Maple Heights', blurb: 'Suburban streets, cul-de-sac lawns and Station 12. Home turf.', rank: 0, xp: 0 },
  eastgate: { name: 'Eastgate', blurb: 'Apartments, strip malls and the Beltway on-ramps. Busier, with more crashes.', rank: 0, xp: 500 },
  downtown: { name: 'Downtown', blurb: 'Towers, plazas and crowds. Assaults, overdoses and office cardiac arrests.', rank: 1, xp: 1400 },
  harbor: { name: 'Harbor District', blurb: 'Warehouses, cranes and the docks. Industrial injuries and the worst crashes.', rank: 2, xp: 3800 },
};

// Hospitals. caps: er (everyone has one), trauma (Level I), cardiac (cath lab), stroke (stroke center), ob (labor & delivery).
const HOSPITALS = {
  brigid: { name: 'St. Brigid Community Hospital', short: 'St. Brigid', district: 'maple', caps: ['er'], color: 0xb8c8d8,
    blurb: 'Community emergency department. Close, quick to turn around, no specialty teams.' },
  mercy: { name: 'Mercy Heart & Stroke Institute', short: 'Mercy', district: 'eastgate', caps: ['er', 'cardiac', 'stroke', 'ob'], color: 0xd8c8b0,
    blurb: 'Cath lab around the clock, comprehensive stroke center, labor & delivery.' },
  general: { name: 'Harbor General Medical Center', short: 'Harbor General', district: 'downtown', caps: ['er', 'trauma', 'ob'], color: 0xc8d0c0,
    blurb: 'Level I trauma center with a surgical team on standby. Labor & delivery.' },
};
const CAP_NAMES = { er: 'Emergency dept', trauma: 'Level I trauma', cardiac: 'Cath lab (STEMI)', stroke: 'Stroke center', ob: 'Labor & delivery' };

// Cabinet stock, per unit of rig capacity. `o2` is the main tank in percent.
const SUPPLIES = {
  o2: { name: 'Oxygen', base: 100, unit: '%' },
  dressing: { name: 'Trauma dressings', base: 8 },
  tourniquet: { name: 'Tourniquets', base: 2 },
  gauze: { name: 'Hemostatic gauze', base: 2 },
  splint: { name: 'SAM splints', base: 3 },
  traction: { name: 'Traction splint', base: 1 },
  collar: { name: 'C-collars', base: 3 },
  oralglu: { name: 'Oral glucose', base: 2 },
  aspirin: { name: 'Aspirin 81 mg', base: 8 },
  nitro: { name: 'Nitroglycerin', base: 6 },
  epipen: { name: 'Epi auto-injector', base: 2 },
  narcan: { name: 'Naloxone', base: 3 },
  albuterol: { name: 'Albuterol nebs', base: 3 },
  obkit: { name: 'OB kit', base: 1 },
  ivkit: { name: 'IV start kits', base: 4 },
  saline: { name: 'Saline 1 L', base: 4 },
  d10: { name: 'D10 250 mL', base: 2 },
  glucagon: { name: 'Glucagon', base: 1 },
  airway: { name: 'Adv. airways', base: 2 },
  epi: { name: 'Epinephrine 1 mg', base: 8 },
  amio: { name: 'Amiodarone', base: 3 },
  fentanyl: { name: 'Fentanyl', base: 4 },
  ondan: { name: 'Ondansetron', base: 3 },
  diphen: { name: 'Diphenhydramine', base: 2 },
  needle: { name: 'Decompression needles', base: 2 },
  txa: { name: 'TXA', base: 2 },
  midaz: { name: 'Midazolam', base: 3 },
  atropine: { name: 'Atropine', base: 3 },
  pads: { name: 'Defib pads', base: 2 },
};
function fullStock(cap) { const s = {}; for (const [k, v] of Object.entries(SUPPLIES)) s[k] = k === 'o2' ? 100 : Math.max(1, Math.round(v.base * cap)); return s; }

// Moving equipment kept in the rig. Ricky pushes the stretcher; the partner carries the rest.
const DEVICES = {
  stretcher: { name: 'Stretcher', short: 'stretcher', carry: 'push' },
  chair: { name: 'Stair chair', short: 'stair chair', carry: 'carry' },
  board: { name: 'Long board', short: 'backboard', carry: 'carry' },
  scoop: { name: 'Scoop stretcher', short: 'scoop', carry: 'carry' },
};

const FIRST_NAMES_F = ['Maria', 'Linda', 'Grace', 'Aisha', 'Mei', 'Rosa', 'Patricia', 'Keisha', 'Hannah', 'Priya', 'Elena', 'Joan', 'Fatima', 'Yuki', 'Beatrice', 'Nora', 'Destiny', 'Carmen', 'Ingrid', 'Olivia', 'Thandi', 'Siobhan', 'Ruth', 'Lucia', 'Amara', 'Dorothy', 'Kim', 'Sofia', 'Bernadette', 'Zoe'];
const FIRST_NAMES_M = ['James', 'Robert', 'Luis', 'Kwame', 'Wei', 'Ahmed', 'Tom', 'Darnell', 'Hiroshi', 'Raj', 'Frank', 'Diego', 'Walter', 'Samuel', 'Ivan', 'Omar', 'Marcus', 'Eddie', 'Hector', 'Arthur', 'Tyrone', 'Sean', 'Nikolai', 'Ben', 'Gus', 'Carlos', 'Dmitri', 'Kofi', 'Liam', 'Pete'];
const LAST_NAMES = ['Alvarez', 'Brennan', 'Chen', 'Delacroix', 'Evans', 'Fofana', 'Garcia', 'Hughes', 'Ibrahim', 'Jensen', 'Kowalski', 'Liu', 'Mbeki', 'Nakamura', 'Okafor', "O'Neill", 'Patel', 'Quinn', 'Rossi', 'Santos', 'Thompson', 'Ueda', 'Vasquez', 'Washington', 'Xu', 'Yilmaz', 'Zielinski', 'Haddad', 'Moreau', 'Lindqvist', 'Abernathy', 'Castellanos'];

// Street names. Line index 0 and 12 on each axis are the Beltway; 3, 6, 9 are four-lane avenues.
// x grows east, z grows south (north is up on the map).
const STREETS_X = ['Beltway West', 'Juniper St', 'Larkspur St', 'Harbor Blvd', 'Quarry St', 'Fenwick St', 'Main St', 'Pruitt St', 'Thistle St', 'Eastgate Pkwy', 'Mulberry St', 'Oriel St', 'Beltway East'];
const STREETS_Z = ['Beltway North', 'Wharf St', 'Foundry St', 'Kingsley Ave', 'Grand St', 'Holloway St', 'Central Ave', 'Elm St', 'Alder Ln', 'Lincoln Ave', 'Birch Ln', 'Cedar Ln', 'Beltway South'];

const PARTNER_INFO = { name: 'Marisol Vega', short: 'Marisol', years: 14 };
