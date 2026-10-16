// Nullwake — data: weapons, passives, pilots, enemies, bosses, stages and hangar upgrades.

// Weapon stats: dmg, cd (seconds), amount, area (multiplier), speed (projectile px/s or multiplier), dur, pierce, chain, kb.
// up[i] is added at level i + 2. An evolved weapon is its own entry with `from`; it has one level.
const MAX_WLV = 8;
const WEAPONS = {
  blaster: { name: 'Pulse Blaster', color: '#5ef0ff', d: 'Fires bolts at the nearest enemies.',
    base: { dmg: 10, cd: 1.1, amount: 1, area: 1, speed: 440, dur: 1.4, pierce: 1, kb: 30 },
    up: [{ amount: 1, t: 'Fires 1 more bolt.' }, { cd: -0.15, t: 'Cooldown −0.15 s.' }, { amount: 1, t: 'Fires 1 more bolt.' }, { dmg: 6, t: 'Damage +6.' },
      { amount: 1, t: 'Fires 1 more bolt.' }, { pierce: 1, t: 'Bolts pass through 1 more enemy.' }, { dmg: 10, t: 'Damage +10.' }],
    evo: 'storm', needs: 'capacitor' },
  storm: { name: 'Storm Repeater', from: 'blaster', color: '#9ffcff', d: 'A torrent of piercing bolts that never stops.',
    base: { dmg: 18, cd: 0.11, amount: 1, area: 1.25, speed: 620, dur: 1.2, pierce: 3, kb: 20 } },

  lash: { name: 'Arc Lash', color: '#ff5ec8', d: 'Cracks a plasma whip to your side.',
    base: { dmg: 14, cd: 1.3, amount: 1, area: 1, pierce: 99, kb: 60 },
    up: [{ amount: 1, t: 'Also strikes behind you.' }, { dmg: 5, t: 'Damage +5.' }, { dmg: 5, area: 0.1, t: 'Damage +5, area +10%.' }, { dmg: 5, t: 'Damage +5.' },
      { area: 0.15, t: 'Area +15%.' }, { dmg: 5, cd: -0.15, t: 'Damage +5, cooldown −0.15 s.' }, { dmg: 8, t: 'Damage +8.' }],
    evo: 'siphon', needs: 'nanite' },
  siphon: { name: 'Siphon Lash', from: 'lash', color: '#ff2f8a', d: 'A crimson whip that mends your hull with every hit.',
    base: { dmg: 34, cd: 1.0, amount: 2, area: 1.4, pierce: 99, kb: 80 } },

  drones: { name: 'Orbit Drones', color: '#7dffa8', d: 'Drones circle you, cutting through anything they touch.',
    base: { dmg: 10, cd: 3, amount: 1, area: 1, speed: 1, dur: 3, kb: 50 },
    up: [{ amount: 1, t: '1 more drone.' }, { speed: 0.3, area: 0.25, t: 'Orbit +25% wider and 30% faster.' }, { dur: 0.5, dmg: 5, t: 'Lasts 0.5 s longer, damage +5.' },
      { amount: 1, t: '1 more drone.' }, { speed: 0.3, area: 0.25, t: 'Orbit +25% wider and 30% faster.' }, { dur: 0.5, dmg: 5, t: 'Lasts 0.5 s longer, damage +5.' }, { amount: 1, t: '1 more drone.' }],
    evo: 'halo', needs: 'emitter' },
  halo: { name: 'Halo Array', from: 'drones', color: '#b9ffd0', d: 'A permanent ring of drones that never powers down.',
    base: { dmg: 24, cd: 0, amount: 5, area: 1.6, speed: 1.7, dur: 1, kb: 70 } },

  rail: { name: 'Rail Lance', color: '#ffd25e', d: 'An instant piercing beam in the direction you move.',
    base: { dmg: 20, cd: 1.8, amount: 1, area: 1, pierce: 99, kb: 40 },
    up: [{ amount: 1, t: '1 more beam.' }, { dmg: 8, t: 'Damage +8.' }, { cd: -0.25, t: 'Cooldown −0.25 s.' }, { amount: 1, t: '1 more beam.' },
      { dmg: 8, t: 'Damage +8.' }, { area: 0.25, t: 'Beams 25% longer and wider.' }, { dmg: 12, t: 'Damage +12.' }],
    evo: 'sunspear', needs: 'amp' },
  sunspear: { name: 'Sunspear', from: 'rail', color: '#fff1a8', d: 'Screen-splitting beams that fire ahead and behind.',
    base: { dmg: 55, cd: 1.15, amount: 2, area: 1.5, pierce: 99, kb: 60 } },

  mines: { name: 'Plasma Mines', color: '#ff8a3d', d: 'Lobs mines that leave burning plasma pools.',
    base: { dmg: 9, cd: 3.2, amount: 1, area: 1, dur: 2.2, kb: 0 },
    up: [{ amount: 1, t: '1 more mine.' }, { area: 0.2, dmg: 3, t: 'Pools 20% wider, damage +3.' }, { cd: -0.4, t: 'Cooldown −0.4 s.' }, { amount: 1, dur: 0.4, t: '1 more mine, pools last 0.4 s longer.' },
      { dmg: 4, area: 0.2, t: 'Damage +4, pools 20% wider.' }, { amount: 1, t: '1 more mine.' }, { dmg: 6, dur: 0.6, t: 'Damage +6, pools last 0.6 s longer.' }],
    evo: 'nullwake', needs: 'thrusters' },
  nullwake: { name: 'Nullwake', from: 'mines', color: '#ffb36b', d: 'Your wake burns: plasma trails behind you as you move.',
    base: { dmg: 16, cd: 2.2, amount: 3, area: 1.4, dur: 3, kb: 0 } },

  missiles: { name: 'Seeker Missiles', color: '#ff5e6c', d: 'Homing missiles that burst on impact.',
    base: { dmg: 18, cd: 2.3, amount: 1, area: 1, speed: 280, dur: 3, kb: 50 },
    up: [{ amount: 1, t: '1 more missile.' }, { dmg: 6, t: 'Damage +6.' }, { area: 0.25, t: 'Blast 25% wider.' }, { amount: 1, t: '1 more missile.' },
      { cd: -0.3, t: 'Cooldown −0.3 s.' }, { dmg: 8, t: 'Damage +8.' }, { amount: 1, t: '1 more missile.' }],
    evo: 'barrage', needs: 'feed' },
  barrage: { name: 'Swarm Barrage', from: 'missiles', color: '#ff9aa4', d: 'A swarm of micro-missiles every second.',
    base: { dmg: 24, cd: 1.25, amount: 8, area: 1.3, speed: 360, dur: 3, kb: 50 } },

  tesla: { name: 'Tesla Coil', color: '#a98bff', d: 'Lightning strikes random enemies and arcs to their neighbours.',
    base: { dmg: 16, cd: 2.4, amount: 2, area: 1, chain: 1, kb: 0 },
    up: [{ amount: 1, t: '1 more strike.' }, { chain: 1, t: 'Arcs to 1 more enemy.' }, { dmg: 6, t: 'Damage +6.' }, { amount: 1, t: '1 more strike.' },
      { cd: -0.4, t: 'Cooldown −0.4 s.' }, { chain: 1, t: 'Arcs to 1 more enemy.' }, { dmg: 10, t: 'Damage +10.' }],
    evo: 'thunder', needs: 'tractor' },
  thunder: { name: 'Thunderhead', from: 'tesla', color: '#d4c6ff', d: 'A storm overhead: many strikes, long arcs, each one a blast.',
    base: { dmg: 34, cd: 1.1, amount: 6, area: 1.4, chain: 4, kb: 0 } },

  gravity: { name: 'Gravity Well', color: '#6b8bff', d: 'A crushing field around you that damages and slows.',
    base: { dmg: 6, cd: 0.55, area: 1, amount: 0, kb: 0 },
    up: [{ area: 0.2, t: 'Field 20% wider.' }, { dmg: 2, t: 'Damage +2.' }, { cd: -0.05, t: 'Pulses faster.' }, { area: 0.2, t: 'Field 20% wider.' },
      { dmg: 3, t: 'Damage +3.' }, { cd: -0.05, t: 'Pulses faster.' }, { area: 0.2, dmg: 3, t: 'Field 20% wider, damage +3.' }],
    evo: 'horizon', needs: 'plating' },
  horizon: { name: 'Event Horizon', from: 'gravity', color: '#9fb4ff', d: 'A wide singularity. Enemies crawl inside it and implode when they die.',
    base: { dmg: 15, cd: 0.35, area: 2.1, amount: 0, kb: 0 } },
};
const BASE_WEAPONS = Object.keys(WEAPONS).filter((k) => !WEAPONS[k].from);

// Passives: `stat` gets `per` added per level.
const PASSIVES = {
  plating: { name: 'Hull Plating', d: 'Max hull +20%.', stat: 'hpMul', per: 0.2, max: 5, color: '#9fb4ff' },
  nanite: { name: 'Nanite Weave', d: 'Repairs 0.25 hull per second.', stat: 'regen', per: 0.25, max: 5, color: '#7dffa8' },
  amp: { name: 'Damage Amp', d: 'Damage +10%.', stat: 'might', per: 0.1, max: 5, color: '#ff5e6c' },
  capacitor: { name: 'Capacitor', d: 'Weapon cooldowns −8%.', stat: 'cooldown', per: -0.08, max: 5, color: '#5ef0ff' },
  emitter: { name: 'Field Emitter', d: 'Weapon area +10%.', stat: 'area', per: 0.1, max: 5, color: '#ffd25e' },
  thrusters: { name: 'Thrusters', d: 'Move speed +10%.', stat: 'move', per: 0.1, max: 5, color: '#ff8a3d' },
  feed: { name: 'Ammo Feed', d: 'Every weapon fires 1 more shot.', stat: 'amount', per: 1, max: 2, color: '#ff5ec8' },
  tractor: { name: 'Tractor Beam', d: 'Pickup range +30%.', stat: 'magnet', per: 0.3, max: 5, color: '#a98bff' },
};
const MAX_SLOTS = 6;

const PILOTS = {
  ryn: { name: 'Ryn Okafor', role: 'Salvage Diver', weapon: 'blaster', bonus: { hpMul: 0.1, armor: 1 }, bt: '+10% hull, +1 armor', cost: 0,
    suit: '#3f8fff', trim: '#d8e6ff', visor: '#ffd25e', story: 'Went out for one last haul. The star went out first.' },
  sable: { name: 'Sable Ito', role: 'Drone Rigger', weapon: 'drones', bonus: { area: 0.1, duration: 0.1 }, bt: '+10% area, +10% duration', cost: 0,
    suit: '#ff8a3d', trim: '#ffe2c8', visor: '#5ef0ff', story: 'Talks to her drones. Sometimes they answer.' },
  kade: { name: 'Kade Varro', role: 'Navy Gunner', weapon: 'rail', bonus: { might: 0.15, move: -0.05 }, bt: '+15% damage, −5% move speed', cost: 600,
    suit: '#6c7a8c', trim: '#c8d0da', visor: '#ff5e6c', story: 'The only survivor of the picket line. Not by luck.' },
  ixa: { name: 'Ixa', role: 'Choir Adept', weapon: 'gravity', bonus: { magnet: 0.4, growth: 0.1, regen: 0.2 }, bt: '+40% pickup range, +10% XP, +0.2 hull/s', cost: 1500,
    suit: '#a06bff', trim: '#eadcff', visor: '#7dffa8', story: 'Her people heard the star die. She came to listen.' },
};

// Enemies. ai: chase | dash | ranged | swarm (set by events) | boss. shape picks the sprite drawer in 03_sprites.js.
const ENEMIES = {
  // Kessler Drift
  mite: { name: 'Void Mite', hp: 6, spd: 56, dmg: 5, r: 9, xp: 1, shape: 'bug', c1: '#7fd4ff', c2: '#1c4f78', c3: '#ffef7a' },
  skimmer: { name: 'Skimmer', hp: 5, spd: 98, dmg: 4, r: 9, xp: 1, shape: 'flyer', c1: '#c9a2ff', c2: '#4a2d8a', c3: '#ff5ec8' },
  drifter: { name: 'Drifter', hp: 20, spd: 40, dmg: 8, r: 14, xp: 2, shape: 'jelly', c1: '#5ef0d0', c2: '#13665e', c3: '#e8fff6' },
  splitter: { name: 'Splitter', hp: 28, spd: 44, dmg: 8, r: 15, xp: 2, shape: 'pod', c1: '#ffb36b', c2: '#7a3a12', c3: '#fff0a0', split: { type: 'mite', n: 3 } },
  scrapper: { name: 'Scrap Drone', hp: 45, spd: 54, dmg: 10, r: 13, xp: 3, shape: 'drone', c1: '#c4ccd8', c2: '#4c5566', c3: '#ff4040' },
  gunship: { name: 'Gunship', hp: 32, spd: 52, dmg: 8, r: 13, xp: 3, shape: 'ship', ai: 'ranged', shoot: { cd: 3.2, spd: 150, dmg: 8 }, c1: '#ffcf6b', c2: '#6a4a14', c3: '#ff6a3d' },
  hulk: { name: 'Rock Hulk', hp: 150, spd: 34, dmg: 14, r: 24, xp: 8, shape: 'rock', kbRes: 0.8, c1: '#8a7a6a', c2: '#3a3230', c3: '#ff8a3d' },
  // The Brood Moon
  larva: { name: 'Larva', hp: 9, spd: 54, dmg: 6, r: 9, xp: 1, shape: 'grub', c1: '#e8d27a', c2: '#7a5a24', c3: '#2a1a10' },
  broodling: { name: 'Broodling', hp: 8, spd: 104, dmg: 6, r: 9, xp: 1, shape: 'flyer', c1: '#9cff7a', c2: '#2f6a1a', c3: '#ff3d6a' },
  crawler: { name: 'Crawler', hp: 34, spd: 52, dmg: 9, r: 14, xp: 2, shape: 'spider', c1: '#b85cff', c2: '#3d1a5c', c3: '#ffe35e' },
  leaper: { name: 'Leaper', hp: 44, spd: 46, dmg: 11, r: 14, xp: 3, shape: 'mantis', ai: 'dash', dash: { cd: 3.6, mult: 4 }, c1: '#6affc4', c2: '#145c44', c3: '#ff4a4a' },
  spitter: { name: 'Spitter', hp: 40, spd: 42, dmg: 9, r: 15, xp: 3, shape: 'sac', ai: 'ranged', shoot: { cd: 3, spd: 140, dmg: 10 }, c1: '#d6ff5e', c2: '#4d6614', c3: '#ff5ec8' },
  podder: { name: 'Egg Sac', hp: 60, spd: 40, dmg: 8, r: 17, xp: 3, shape: 'pod', c1: '#ff7ab8', c2: '#6a1a44', c3: '#ffe0f0', split: { type: 'larva', n: 4 } },
  carapace: { name: 'Carapace', hp: 260, spd: 33, dmg: 16, r: 26, xp: 10, shape: 'shell', kbRes: 0.85, c1: '#5e7aff', c2: '#1a2466', c3: '#ff9a3d' },
  // Station Halcyon
  servitor: { name: 'Servitor', hp: 12, spd: 60, dmg: 7, r: 10, xp: 1, shape: 'drone', c1: '#e8eef8', c2: '#5a6a80', c3: '#5ef0ff' },
  spark: { name: 'Spark', hp: 10, spd: 96, dmg: 6, r: 8, xp: 1, shape: 'orb', c1: '#7af0ff', c2: '#1a5a80', c3: '#ffffff' },
  husk: { name: 'Crew Husk', hp: 36, spd: 50, dmg: 10, r: 14, xp: 2, shape: 'husk', c1: '#d8b070', c2: '#5a4024', c3: '#7dffa8' },
  sentry: { name: 'Sentry Walker', hp: 60, spd: 44, dmg: 10, r: 15, xp: 3, shape: 'mech', ai: 'ranged', shoot: { cd: 2.6, spd: 170, dmg: 12 }, c1: '#ff9a5e', c2: '#5c2a14', c3: '#ff3d3d' },
  wraith: { name: 'Phase Wraith', hp: 70, spd: 56, dmg: 12, r: 13, xp: 3, shape: 'ghost', ai: 'dash', dash: { cd: 3.2, mult: 4.5 }, c1: '#a8b8ff', c2: '#2a3466', c3: '#ff5ec8' },
  hive: { name: 'Swarm Hive', hp: 100, spd: 40, dmg: 10, r: 18, xp: 4, shape: 'pod', c1: '#9aa8bc', c2: '#2a3240', c3: '#5ef0ff', split: { type: 'servitor', n: 4 } },
  crusher: { name: 'Crusher', hp: 500, spd: 34, dmg: 20, r: 28, xp: 14, shape: 'mech', kbRes: 0.9, c1: '#d0d8e4', c2: '#3a4250', c3: '#ff3d3d' },

  // Bosses. attacks: ring, spiral, fan, summon, dash, lob, beam (11_bosses.js).
  scrapjaw: { name: 'Scrapjaw', hp: 1400, spd: 50, dmg: 18, r: 36, xp: 0, shape: 'drone', kbRes: 1, c1: '#e0a060', c2: '#5a3a20', c3: '#ff3030', mid: true,
    attacks: [{ k: 'dash', cd: 5 }, { k: 'summon', type: 'mite', n: 8, cd: 9 }, { k: 'ring', n: 12, spd: 150, dmg: 12, cd: 6 }] },
  maw: { name: 'The Kessler Maw', hp: 15000, spd: 42, dmg: 25, r: 62, xp: 0, shape: 'maw', kbRes: 1, c1: '#7a6a5e', c2: '#2a2220', c3: '#ff6a2a',
    attacks: [{ k: 'ring', n: 18, spd: 140, dmg: 14, cd: 4.5 }, { k: 'spiral', n: 40, spd: 150, dmg: 12, cd: 10 }, { k: 'summon', type: 'skimmer', n: 12, cd: 8 }, { k: 'dash', cd: 7 }] },
  warden: { name: 'Brood Warden', hp: 1900, spd: 52, dmg: 22, r: 38, xp: 0, shape: 'mantis', kbRes: 1, c1: '#ff9a3d', c2: '#5c2a0a', c3: '#ffef5e', mid: true,
    attacks: [{ k: 'dash', cd: 4 }, { k: 'lob', n: 3, r: 60, dmg: 16, cd: 6 }, { k: 'summon', type: 'larva', n: 10, cd: 8 }] },
  queen: { name: 'The Brood Queen', hp: 40000, spd: 36, dmg: 30, r: 66, xp: 0, shape: 'queen', kbRes: 1, c1: '#c05cff', c2: '#3a104e', c3: '#d6ff5e',
    attacks: [{ k: 'lob', n: 5, r: 70, dmg: 18, cd: 4 }, { k: 'summon', type: 'broodling', n: 14, cd: 7 }, { k: 'fan', n: 7, spd: 170, dmg: 16, cd: 3.5 }, { k: 'ring', n: 20, spd: 130, dmg: 16, cd: 6 }] },
  custodian: { name: 'Custodian Frame', hp: 2600, spd: 46, dmg: 26, r: 40, xp: 0, shape: 'mech', kbRes: 1, c1: '#5ef0ff', c2: '#1a3a50', c3: '#ff3d3d', mid: true,
    attacks: [{ k: 'beam', n: 1, dmg: 24, cd: 5 }, { k: 'fan', n: 5, spd: 190, dmg: 16, cd: 3 }, { k: 'summon', type: 'servitor', n: 10, cd: 8 }] },
  halcyon: { name: 'HALCYON', hp: 90000, spd: 30, dmg: 34, r: 70, xp: 0, shape: 'core', kbRes: 1, c1: '#e8eef8', c2: '#3a4660', c3: '#ff3d6a',
    attacks: [{ k: 'spiral', n: 60, spd: 160, dmg: 16, cd: 8 }, { k: 'beam', n: 3, dmg: 28, cd: 5.5 }, { k: 'ring', n: 24, spd: 150, dmg: 16, cd: 5 },
      { k: 'summon', type: 'spark', n: 14, cd: 7 }, { k: 'lob', n: 4, r: 70, dmg: 20, cd: 6.5 }] },
};
for (const [id, e] of Object.entries(ENEMIES)) { e.id = id; e.ai = e.ai || (e.attacks ? 'boss' : 'chase'); e.kbRes = e.kbRes || 0; }

// Stages. waves[m] = [minimum alive, seconds between batches, batch size, pool] for minute m. ev names the event cast.
const STAGES = [
  { id: 's1', name: 'Kessler Drift', sub: 'The debris ring of a dead star', look: 'drift', hpMul: 1, xpMul: 1, goldMul: 1,
    d: 'Where your ship broke up. Rock, ice and wreckage drift through the dark, and the swarm is waking up in it.',
    music: { bpm: 112, root: 45, prog: [0, -4, 3, -2], mode: 'minor' },
    waves: [[8, 1.3, 1, 'mite'], [16, 1.0, 2, 'mite mite skimmer'], [30, 0.8, 3, 'mite drifter'], [40, 0.8, 3, 'mite drifter splitter'],
      [50, 0.7, 3, 'drifter splitter skimmer'], [60, 0.7, 4, 'mite scrapper drifter'], [75, 0.6, 4, 'scrapper splitter gunship'],
      [90, 0.6, 4, 'mite mite scrapper gunship'], [100, 0.55, 5, 'drifter scrapper hulk'], [120, 0.5, 5, 'splitter gunship scrapper'],
      [140, 0.5, 6, 'mite skimmer scrapper hulk'], [160, 0.45, 6, 'scrapper gunship hulk'], [180, 0.4, 6, 'drifter splitter scrapper hulk'],
      [200, 0.4, 7, 'mite scrapper gunship hulk'], [230, 0.35, 8, 'scrapper hulk gunship splitter']],
    ev: { swarm: 'skimmer', ringA: 'mite', ringB: 'drifter', elites: ['drifter', 'scrapper', 'hulk'], mid: 'scrapjaw', final: 'maw' } },
  { id: 's2', name: 'The Brood Moon', sub: 'A moon the swarm made into a nest', look: 'brood', hpMul: 1, xpMul: 1.15, goldMul: 1.3, needs: 's1',
    d: 'The swarm came from somewhere. The ground is warm, it breathes, and the eggs are hatching.',
    music: { bpm: 100, root: 38, prog: [0, -2, -5, -4], mode: 'minor' },
    waves: [[10, 1.2, 2, 'larva'], [20, 0.9, 2, 'larva larva broodling'], [32, 0.8, 3, 'larva crawler'], [44, 0.75, 3, 'larva crawler podder'],
      [54, 0.7, 4, 'crawler podder broodling'], [66, 0.65, 4, 'larva leaper crawler'], [80, 0.6, 4, 'leaper podder spitter'],
      [95, 0.55, 5, 'larva larva leaper spitter'], [110, 0.5, 5, 'crawler leaper carapace'], [130, 0.5, 5, 'podder spitter leaper'],
      [150, 0.45, 6, 'larva broodling leaper carapace'], [170, 0.42, 6, 'leaper spitter carapace'], [190, 0.4, 7, 'crawler podder leaper carapace'],
      [215, 0.36, 7, 'larva leaper spitter carapace'], [245, 0.32, 8, 'leaper carapace spitter podder']],
    ev: { swarm: 'broodling', ringA: 'larva', ringB: 'crawler', elites: ['crawler', 'leaper', 'carapace'], mid: 'warden', final: 'queen' } },
  { id: 's3', name: 'Station Halcyon', sub: 'The research station that made the swarm', look: 'station', hpMul: 1, xpMul: 1.3, goldMul: 1.6, needs: 's2',
    d: 'The lights are still on. The crew is still here, after a fashion. Whatever runs the station wants you gone.',
    music: { bpm: 124, root: 40, prog: [0, -4, -2, -1], mode: 'minor' },
    waves: [[12, 1.1, 2, 'servitor'], [19, 0.85, 2, 'servitor servitor spark'], [26, 0.8, 3, 'servitor servitor husk'], [35, 0.75, 3, 'servitor husk hive'],
      [51, 0.7, 4, 'husk hive spark'], [62, 0.65, 4, 'servitor wraith husk'], [75, 0.6, 4, 'wraith hive sentry'],
      [88, 0.55, 5, 'servitor servitor wraith sentry'], [106, 0.5, 5, 'husk wraith crusher'], [123, 0.48, 6, 'hive sentry wraith'],
      [141, 0.44, 6, 'servitor spark wraith crusher'], [158, 0.4, 7, 'wraith sentry crusher'], [176, 0.38, 7, 'husk hive wraith crusher'],
      [198, 0.34, 8, 'servitor wraith sentry crusher'], [224, 0.3, 9, 'wraith crusher sentry hive']],
    ev: { swarm: 'spark', ringA: 'servitor', ringB: 'husk', elites: ['husk', 'wraith', 'crusher'], mid: 'custodian', final: 'halcyon' } },
];
const STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s]));
// The same rhythm of set pieces in every stage, cast from stage.ev.
const EVENTS = [[45, 'swarm', 16], [150, 'elite', 0], [210, 'ringA', 28], [270, 'swarm', 24], [300, 'mid'], [420, 'ringB', 30], [450, 'elite', 1],
  [540, 'swarm', 32], [600, 'mid'], [690, 'ringA', 36], [750, 'elite', 2], [810, 'swarm', 40], [870, 'ringB', 36], [RUN_LEN, 'final']];

// Hangar upgrades bought with gold between runs. Rank n+1 costs cost × (n+1).
const META = [
  { id: 'hull', name: 'Reinforced Hull', d: '+10% max hull per rank.', stat: 'hpMul', per: 0.1, max: 5, cost: 200, icon: 'plating' },
  { id: 'armor', name: 'Ablative Armor', d: 'Every hit does 1 less damage per rank.', stat: 'armor', per: 1, max: 3, cost: 600, icon: 'armor' },
  { id: 'regen', name: 'Med-Gel Lines', d: 'Repair 0.1 hull per second per rank.', stat: 'regen', per: 0.1, max: 5, cost: 250, icon: 'nanite' },
  { id: 'might', name: 'Overcharge', d: '+5% damage per rank.', stat: 'might', per: 0.05, max: 5, cost: 300, icon: 'amp' },
  { id: 'cool', name: 'Heat Sinks', d: '−2.5% weapon cooldowns per rank.', stat: 'cooldown', per: -0.025, max: 2, cost: 900, icon: 'capacitor' },
  { id: 'area', name: 'Focusing Lens', d: '+5% weapon area per rank.', stat: 'area', per: 0.05, max: 2, cost: 300, icon: 'emitter' },
  { id: 'dur', name: 'Field Stabiliser', d: '+15% weapon duration per rank.', stat: 'duration', per: 0.15, max: 2, cost: 300, icon: 'duration' },
  { id: 'vel', name: 'Mass Driver', d: '+10% projectile speed per rank.', stat: 'speed', per: 0.1, max: 2, cost: 300, icon: 'velocity' },
  { id: 'move', name: 'Servo Legs', d: '+5% move speed per rank.', stat: 'move', per: 0.05, max: 2, cost: 300, icon: 'thrusters' },
  { id: 'magnet', name: 'Collector Field', d: '+25% pickup range per rank.', stat: 'magnet', per: 0.25, max: 2, cost: 300, icon: 'tractor' },
  { id: 'growth', name: 'Neural Uplink', d: '+3% experience per rank.', stat: 'growth', per: 0.03, max: 5, cost: 900, icon: 'growth' },
  { id: 'greed', name: 'Salvage Rights', d: '+10% gold per rank.', stat: 'greed', per: 0.1, max: 5, cost: 200, icon: 'greed' },
  { id: 'reroll', name: 'Rescan', d: '+2 rerolls per run per rank, for level-up choices.', stat: 'rerolls', per: 2, max: 2, cost: 800, icon: 'reroll' },
  { id: 'skip', name: 'Discard Protocol', d: '+2 skips per run per rank, for level-up choices.', stat: 'skips', per: 2, max: 2, cost: 400, icon: 'skip' },
  { id: 'revival', name: 'Backup Clone', d: 'Come back once per run with half your hull.', stat: 'revival', per: 1, max: 1, cost: 3000, icon: 'revival' },
];
const metaCost = (m, rank) => m.cost * (rank + 1);

// Experience needed to go from level L to L + 1.
const xpFor = (L) => (L < 20 ? 5 + (L - 1) * 9 : L < 40 ? 176 + (L - 20) * 12 : 416 + (L - 40) * 15);
