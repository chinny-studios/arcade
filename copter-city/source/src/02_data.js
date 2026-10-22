// Copter City — data: helicopters, upgrades, cities, call types, ranks, names and lines

// speed m/s, climb m/s, turn rad/s, hp, fuel litres, burn litres/s at cruise, bucket litres, seats, gas canisters
const HELIS = {
  sparrow: {
    name: 'Sparrow 22', role: 'Utility', price: 0, speed: 38, climb: 9, turn: 1.45, hp: 100, fuel: 220, burn: 0.5, bucket: 450, seats: 2, gas: 0,
    equip: ['bucket', 'ladder', 'mega'], model: 'light', colors: [0xf2c230, 0x2a2a30, 0xffffff],
    desc: 'A tired two-seat utility chopper the city leased for you. Slow, light and forgiving, with a small water bucket and a rope ladder.',
  },
  watchdog: {
    name: 'Watchdog P4', role: 'Police', price: 16000, speed: 47, climb: 11, turn: 1.65, hp: 140, fuel: 300, burn: 0.65, bucket: 0, seats: 3, gas: 6, siren: true,
    equip: ['ladder', 'spot', 'mega', 'gas'], model: 'police', colors: [0x1e2c5a, 0xf0f0f0, 0x1e2c5a],
    desc: 'Police patrol craft. Searchlight, siren, megaphone and six tear gas canisters for pursuits and riots. No bucket.',
  },
  lifeline: {
    name: 'Lifeline M3', role: 'Medevac', price: 22000, speed: 50, climb: 10, turn: 1.45, hp: 130, fuel: 360, burn: 0.75, bucket: 0, seats: 4, gas: 0, medic: true,
    equip: ['ladder', 'spot', 'mega'], model: 'medevac', colors: [0xf4f4f0, 0xd42828, 0xd42828],
    desc: 'Fast air ambulance with a flight medic on board: patients hold on far longer. Four seats, a searchlight and a rescue ladder.',
  },
  firehawk: {
    name: 'Firehawk 9', role: 'Firefighting', price: 30000, speed: 44, climb: 10, turn: 1.35, hp: 170, fuel: 380, burn: 0.9, bucket: 1400, seats: 3, gas: 0,
    equip: ['bucket', 'ladder', 'spot', 'mega'], model: 'medium', colors: [0xc8281e, 0xf2f2f2, 0x303030],
    desc: 'A medium lift helicopter built around a 1,400 litre bucket. Armoured against heat and smoke.',
  },
  hauler: {
    name: 'Skyhauler 2', role: 'Heavy lift', price: 52000, speed: 36, climb: 7.5, turn: 0.95, hp: 250, fuel: 620, burn: 1.3, bucket: 2600, seats: 10, gas: 0,
    equip: ['bucket', 'ladder', 'spot', 'mega'], model: 'tandem', colors: [0x5a6a3a, 0x2a2e26, 0xe0d8a0],
    desc: 'Twin-rotor heavy lifter. Ten seats and a 2,600 litre bucket, but it turns like a barge.',
  },
  raptor: {
    name: 'Raptor X', role: 'Special', price: 88000, speed: 64, climb: 14, turn: 2.0, hp: 220, fuel: 420, burn: 1.15, bucket: 800, seats: 4, gas: 12, siren: true,
    equip: ['bucket', 'ladder', 'spot', 'mega', 'gas'], model: 'raptor', colors: [0x30343a, 0x1a1c20, 0xe8a020],
    desc: 'Experimental fast-response craft. Quick, tough and carrying everything: bucket, ladder, searchlight, siren and twelve gas canisters.',
  },
};
const HELI_ORDER = ['sparrow', 'watchdog', 'lifeline', 'firehawk', 'hauler', 'raptor'];

const EQUIP = {
  bucket: { name: 'Water bucket', key: '1', short: 'BUCKET', help: 'Dip it in the water to fill, then F to dump it on a fire.' },
  ladder: { name: 'Rope ladder', key: '2', short: 'LADDER', help: 'Hover low over people so they can climb aboard.' },
  spot: { name: 'Searchlight', key: '3', short: 'LIGHT', help: 'F to switch on. Keeps suspects in sight at night.' },
  mega: { name: 'Megaphone', key: '4', short: 'MEGA', help: 'F to broadcast: clears traffic jams and calms crowds.' },
  gas: { name: 'Tear gas', key: '5', short: 'GAS', help: 'F to drop a canister. Stops getaway cars and breaks up riots.' },
};
const EQUIP_ORDER = ['bucket', 'ladder', 'spot', 'mega', 'gas'];

// upgrades: three levels each, cost is a fraction of the helicopter's price (with a floor for the free Sparrow)
const UPGRADES = {
  engine: { name: 'Engine', desc: '+8% top speed and climb per level', cost: [0.25, 0.4, 0.6] },
  armor: { name: 'Armour', desc: '+18% hull strength per level', cost: [0.2, 0.35, 0.5] },
  tank: { name: 'Fuel tank', desc: '+22% fuel per level', cost: [0.12, 0.2, 0.3] },
  bucket: { name: 'Bucket', desc: '+25% water per level', cost: [0.15, 0.25, 0.4], needs: 'bucket' },
};
const upCost = (heliId, up, lvl) => Math.round(Math.max(HELIS[heliId].price, 9000) * UPGRADES[up].cost[lvl] / 100) * 100;
function heliStats(id, ups = {}) {
  const h = HELIS[id], e = ups.engine || 0, a = ups.armor || 0, t = ups.tank || 0, b = ups.bucket || 0;
  return Object.assign({}, h, { id, speed: h.speed * (1 + 0.08 * e), climb: h.climb * (1 + 0.08 * e), hp: h.hp * (1 + 0.18 * a), fuel: h.fuel * (1 + 0.22 * t), bucket: h.bucket * (1 + 0.25 * b) });
}
const PRICES = { fuel: 1.6, repair: 28, gas: 120 }; // per litre, per hit point, per canister

// Cities in career order. nb: blocks per side. water: the shape of the water. calls: what the dispatcher can send.
// goal: calls to complete to be offered the next city. pay: reward multiplier.
const CITIES = [
  {
    id: 'dover', name: 'Dover Flats', nb: 7, water: 'lake', density: 0.35, downtown: 0.15, seed: 'dover-1996', hospitals: 1, hour: 9,
    calls: ['fire', 'medevac', 'taxi', 'jam'], goal: 6, pay: 1, maxCalls: 2,
    blurb: 'A sleepy farm town around a lake. The city council bought a helicopter and now they need someone to fly it.',
  },
  {
    id: 'halley', name: 'Port Halley', nb: 9, water: 'bay', density: 0.5, downtown: 0.3, seed: 'halley-1996', hospitals: 2, hour: 14,
    calls: ['fire', 'medevac', 'taxi', 'jam', 'crime', 'roof', 'ship'], goal: 8, pay: 1.25, maxCalls: 3,
    blurb: 'A fishing port gone to seed. Container ships, warehouse fires and a crime rate the mayor would rather not talk about.',
  },
  {
    id: 'granite', name: 'Granite Falls', nb: 10, water: 'river', density: 0.55, downtown: 0.35, seed: 'granite-1996', hospitals: 2, hour: 17,
    calls: ['fire', 'medevac', 'taxi', 'jam', 'crime', 'roof', 'riot', 'flood'], goal: 10, pay: 1.5, maxCalls: 3,
    blurb: 'A mill city split by a fast river. When it rains the river comes up into the streets, and when the mill closes the streets come up too.',
  },
  {
    id: 'sunset', name: 'Sunset Bay', nb: 11, water: 'coast', density: 0.6, downtown: 0.4, seed: 'sunset-1996', hospitals: 3, hour: 11,
    calls: ['fire', 'medevac', 'taxi', 'jam', 'crime', 'roof', 'riot', 'ship', 'spill', 'twister'], goal: 12, pay: 1.8, maxCalls: 4,
    blurb: 'Beach town on the edge of tornado alley, with a chemical plant on the north side that nobody likes to mention.',
  },
  {
    id: 'metro', name: 'Metro Heights', nb: 13, water: 'bayriver', density: 0.75, downtown: 0.5, seed: 'metro-1996', hospitals: 3, hour: 20,
    calls: ['fire', 'medevac', 'taxi', 'jam', 'crime', 'roof', 'riot', 'flood', 'ship', 'spill', 'twister', 'quake'], goal: 15, pay: 2.2, maxCalls: 4,
    blurb: 'The big city. Towers, freeways, a river and a harbour, and every kind of trouble there is, often all at once.',
  },
];
const cityDef = (id) => CITIES.find((c) => c.id === id) || CITIES[0];

// Call types. reward is the base pay, time the seconds before the call goes stale (0: no limit), w: weight in the mix
const CALL = {
  fire: { name: 'Structure fire', tag: 'FIRE', color: '#ff6a2a', reward: 1400, time: 0, w: 3, needs: 'bucket' },
  medevac: { name: 'Medical evacuation', tag: 'MEDIC', color: '#ff4a6a', reward: 1100, time: 0, w: 3 },
  taxi: { name: 'Passenger pickup', tag: 'FARE', color: '#4ad8ff', reward: 500, time: 150, w: 2 },
  jam: { name: 'Traffic jam', tag: 'JAM', color: '#ffd23a', reward: 600, time: 120, w: 2, needs: 'mega' },
  crime: { name: 'Getaway car', tag: 'CRIME', color: '#6a8aff', reward: 1800, time: 0, w: 2 },
  roof: { name: 'Rooftop rescue', tag: 'ROOF', color: '#ff8a3a', reward: 2000, time: 0, w: 1.5, needs: 'ladder' },
  riot: { name: 'Riot', tag: 'RIOT', color: '#c86aff', reward: 1700, time: 160, w: 1.2 },
  flood: { name: 'Flash flood', tag: 'FLOOD', color: '#3a9aff', reward: 2200, time: 0, w: 1, needs: 'ladder' },
  ship: { name: 'Ship on fire', tag: 'SHIP', color: '#ff9a4a', reward: 2400, time: 0, w: 1, needs: 'bucket' },
  spill: { name: 'Chemical spill', tag: 'HAZMAT', color: '#8aff3a', reward: 2600, time: 0, w: 0.8, needs: 'ladder', disaster: true },
  twister: { name: 'Tornado', tag: 'TORNADO', color: '#b0b8c8', reward: 3200, time: 0, w: 0.6, disaster: true },
  quake: { name: 'Earthquake', tag: 'QUAKE', color: '#d8a86a', reward: 4000, time: 0, w: 0.5, disaster: true },
};

const RANKS = ['Rookie', 'Pilot', 'Senior Pilot', 'Captain', 'Chief Pilot', 'Sky Legend'];

const LANDMARKS = ['City Hall', 'Memorial Stadium', 'Grand Hotel', 'Union Station', 'Natural History Museum', 'Founders Park', 'Plaza Mall',
  'State University', 'Opera House', 'Convention Center', 'County Courthouse', 'Botanical Garden'];

const FIRST = ['Gus', 'Marla', 'Dwayne', 'Tess', 'Ray', 'Bev', 'Hank', 'Lorraine', 'Vic', 'Dot', 'Earl', 'Shelly', 'Moe', 'Pat', 'Lou', 'Rita', 'Stan', 'Gina', 'Chet', 'Wanda', 'Al', 'Joan'];
const LAST = ['Kowalski', 'Ferraro', 'Nguyen', 'Brandt', 'Okafor', 'Delgado', 'Pruitt', 'Lindqvist', 'Haddad', 'Moreau', 'Tanaka', 'Boyle', 'Petrov', 'Abernathy'];
const randName = () => pick(FIRST) + ' ' + pick(LAST);

const TAXI_HI = ['Hey! Over here!', 'Thank goodness, a chopper!', 'I am SO late. Can you fly fast?', 'My cousin told me you do rides.', 'Is this thing safe?'];
const TAXI_ROUGH = ['Whoa! Easy!', 'I think I left my stomach back there.', 'Do you even have a license?', 'Please stop doing that.', 'My coffee!'];
const TAXI_BYE = ['Thanks for the lift!', 'Best ride of my life.', 'I am never doing that again.', 'Keep the change.', 'Smooth flying, pilot.'];
const CHATTER = [
  'Nice chopper. Did the city really pay for that?', 'I hear the fire department wants your job.', 'My kid wants to be a pilot now. Thanks a lot.',
  'Do you ever just fly around for fun?', 'Watch out for the power lines by the river.', 'You buzzed my house this morning.',
  'Is it true you can land on the hospital roof?', 'The traffic on the bridge is murder at five.', 'I saw a tornado once. It looked at me.',
  'Somebody keeps leaving gold tokens on the rooftops. Weird, right?', 'Fuel is cheaper at the hangar, I bet.', 'Hey, aren\'t you the helicopter person?',
  'My uncle flew in the war. He says you\'re doing it wrong.', 'Could you not land on my lawn again?', 'The mayor\'s nephew wanted your job.',
];
