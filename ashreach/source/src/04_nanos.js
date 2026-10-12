// Ashreach — nano schools, nanolines, the NANOS database, pets and mob special abilities
//
// Conventions (also read by 13_combat.js / 14_ai.js):
//  - reqs: school-skill STAT ids (Sensory Tuning's stat id is `sen_sch`, the others equal the school id). The nano's
//    primary school is the FIRST key of `reqs` (combat uses it as the cast-accuracy skill).
//  - Nano ids are `<profId>_<snake_case name>`, e.g. `medic_mend`. `id` is also stored on the def.
//  - Hostile-ish pseudo stats usable in debuff/drain mods: `addAR` (attack rating) and `addDef` (defence rating).
//  - fx `proc` (weapon-hit procs): { t:'proc', drain: pct } heals the wielder for pct% of weapon damage dealt,
//    { t:'proc', teamHeal: n } heals every team member in range n HP per weapon hit.
//  - MOB_ABILITIES amounts are RELATIVE (def.rel === true): dmg/dot amt are multiples of the caster's average basic hit
//    ((mob.dmg[0]+mob.dmg[1])/2); heal/hot amt are fractions of the TARGET's maxHp; debuffs/snare are absolute.
//    `ai` hints: { hpBelow, allyHpBelow, once, p } (hpBelow = use when own hp fraction under; p = chance per decision).
//    Extra fields: `aoe` (radius m, hits everything hostile around the caster), fx { t:'summon', n } (spawn n adds of
//    tpl.adds, level = caster level - 2), buff mods `dmgPct` / `atkPct` (+% damage, +% attack speed) for enrage.

const NANO_SCHOOLS = {
  fab: { name: 'Fabrication', color: '#ff9a3c', stat: 'fab' },
  trn: { name: 'Transmutation', color: '#ff5a6e', stat: 'trn' },
  bio: { name: 'Biomorphics', color: '#52d273', stat: 'bio' },
  psi: { name: 'Psi Modulation', color: '#b186ff', stat: 'psi' },
  sen: { name: 'Sensory Tuning', color: '#4cc9f0', stat: 'sen_sch' },
  spt: { name: 'Spacetime', color: '#f4d35e', stat: 'spt' },
};
// Main + secondary school per profession (main matches PROFS[prof].school; secondary = cheap second school or null).
const NANO_PROF_SCHOOLS = {
  trooper: ['fab'], bruiser: ['fab', 'bio'], medic: ['bio', 'trn'], mechanist: ['fab', 'trn'], runner: ['spt', 'sen'],
  nanoshaper: ['fab', 'trn'], psion: ['psi', 'trn'], martialist: ['sen', 'spt'], infiltrator: ['psi', 'sen'],
  wayfarer: ['bio', 'sen'], broker: ['psi', 'trn'], executive: ['psi', 'fab'], warden: ['bio', 'sen'], wraith: ['sen', 'bio'],
};

const NANOLINES = {};
const NANOS = {};
const PETS = {};

// ---- pets -----------------------------------------------------------------------------------
// Same shape as a MOB_T template (so mobStats(PETS[id], level) works); level = caster level (capped by the nano).
function nn_pets() {
  const mk = (id, name, model, scale, colors, arch, o) => {
    PETS[id] = Object.assign({
      name, model, scale, colors, arch, lvlFrom: 'caster', lvlOff: 0, lvl: [1, 50], dmgType: 'proj', aggro: 0, social: 0, speed: 1.15,
      hpMul: 1.4, dmgMul: 0.6, acMul: 1.1, atk: 2, range: arch === 'melee' ? 2.4 : 18, abilities: [], loot: null, named: false, xpMul: 0, pet: true,
    }, o);
  };
  const mech = [['Spark Drone', 'drone', 0.6], ['Guard Bot', 'drone', 0.75], ['Skirmish Frame', 'golem', 0.7], ['Siege Walker', 'golem', 0.85], ['Assault Chassis', 'golem', 1.0], ['Warmech Prime', 'golem', 1.2]];
  mech.forEach((m, i) => mk('mech_' + (i + 1), m[0], m[1], m[2], [0x8a909a, 0x3d424c, 0xffa030], i % 2 ? 'melee' : 'ranged',
    { hpMul: 1.3 + i * 0.12, dmgMul: 0.5 + i * 0.04, acMul: 1.2 + i * 0.1, dmgType: i % 2 ? 'melee' : 'proj', atk: 2.2 - i * 0.1 }));
  ['Mind Familiar', 'Thought Stalker', 'Psyche Wraith', 'Echo Predator', 'Nightmare Avatar'].forEach((n, i) =>
    mk('psion_hunter' + (i + 1), n, 'wisp', 0.6 + i * 0.12, [0xb186ff, 0x5a35c0, 0xf0e4ff], 'caster',
      { dmgType: 'energy', hpMul: 1.0 + i * 0.08, dmgMul: 0.62 + i * 0.05, range: 20, speed: 1.2 }));
  ['Mind Mender', 'Soothing Echo', 'Healing Avatar'].forEach((n, i) =>
    mk('psion_mender' + (i + 1), n, 'wisp', 0.6 + i * 0.15, [0x52d273, 0x1f8a46, 0xe0ffe8], 'healer',
      { dmgType: 'energy', hpMul: 0.9 + i * 0.1, dmgMul: 0.2, range: 22, abilities: ['pet_heal'], speed: 1.2 }));
  ['Ledger Droid', 'Courier Droid', 'Enforcer Droid', 'Auditor Droid', 'Director Droid'].forEach((n, i) =>
    mk('exec_droid' + (i + 1), n, 'drone', 0.65 + i * 0.1, [0xcfd3da, 0x3b4e8a, 0xe8c15a], i === 2 ? 'melee' : 'ranged',
      { dmgType: i === 2 ? 'melee' : 'energy', hpMul: 1.2 + i * 0.1, dmgMul: 0.5 + i * 0.05, acMul: 1.1 + i * 0.1 }));
}
nn_pets();

// ---- nano database --------------------------------------------------------------------------
function nn_build() {
  const R = Math.round;
  const HPA = (L) => 60 + 45 * L;       // typical player HP at level L (heal / buff scaling)
  const HIT = (L) => 8 + 2.2 * L;       // typical player damage per hit at level L (nuke / dot scaling)
  const H = (L, a, b) => [R(HPA(L) * a), R(HPA(L) * b)];
  const D = (L, a, b) => [R(HIT(L) * a), R(HIT(L) * b)];
  const sk = (s) => (s === 'sen' ? 'sen_sch' : s);
  const buff = (mods) => ({ t: 'buff', mods });
  const deb = (mods) => ({ t: 'debuff', mods });
  const snake = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const ip = (v, i, n) => (Array.isArray(v) ? R((v[0] + (v[1] - v[0]) * (n > 1 ? i / (n - 1) : 0)) * 10) / 10 : v);
  const ipi = (v, i, n) => (Array.isArray(v) ? R(v[0] + (v[1] - v[0]) * (n > 1 ? i / (n - 1) : 0)) : v);
  const STAT_LABEL = {
    maxHp: 'Max Health', maxNp: 'Max Nano', hpRegen: 'Health Delta', npRegen: 'Nano Delta', addDmg: 'Added Damage', critPct: 'Critical Chance %',
    nanoCost: 'Nano Cost Reduction %', nanoInit: 'Nano Cast Speed', addAR: 'Attack Rating', addDef: 'Defence Rating', sen_sch: 'Sensory Tuning',
    ac_melee: 'Melee Armour', ac_proj: 'Projectile Armour', ac_energy: 'Energy Armour', ac_chem: 'Chemical Armour', ac_rad: 'Radiation Armour',
    ac_cold: 'Cold Armour', ac_fire: 'Fire Armour', ac_poison: 'Poison Armour', str: 'Strength', agi: 'Agility', sta: 'Stamina', int: 'Intelligence',
    sen: 'Sense', psy: 'Psyche', fab: 'Fabrication', trn: 'Transmutation', bio: 'Biomorphics', psi: 'Psi Modulation', spt: 'Spacetime',
    evade_close: 'Evade Close Combat', dodge_ranged: 'Dodge Ranged', duck_exp: 'Duck Explosives', pressure_pt: 'Pressure Point', nano_pool: 'Nano Pool',
    melee_init: 'Melee Initiative', phys_init: 'Physical Initiative', ranged_init: 'Ranged Initiative', full_auto: 'Full Auto', aimed_shot: 'Aimed Shot',
    sneak_attack: 'Sneak Attack', martial_arts: 'Martial Arts', assault_rifle: 'Assault Rifle', smg: 'SMG', fast_attack: 'Fast Attack',
  };
  const lab = (k) => STAT_LABEL[k] || k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const num = (v) => (Array.isArray(v) ? v[0] + '-' + v[1] : '' + v);
  const mins = (s) => (s >= 120 ? R(s / 60) + ' min' : R(s) + ' s');
  const fxDesc = (f) => {
    const mods = (m, sign) => Object.keys(m).map((k) => lab(k) + ' ' + (m[k] * sign >= 0 ? '+' : '-') + Math.abs(m[k])).join(', ');
    switch (f.t) {
      case 'buff': return 'Raises ' + mods(f.mods, 1);
      case 'debuff': return 'Lowers target: ' + mods(f.mods, 1);
      case 'heal': return 'Restores ' + num(f.amt) + ' health';
      case 'hot': return 'Restores ' + num(f.amt) + ' health every ' + f.every + ' s';
      case 'dmg': return 'Deals ' + num(f.amt) + ' ' + f.type + ' damage';
      case 'dot': return 'Deals ' + num(f.amt) + ' ' + f.type + ' damage every ' + f.every + ' s';
      case 'root': return 'Roots the target in place';
      case 'snare': return 'Slows the target by ' + f.pct + '%';
      case 'calm': return 'Calms the target, ending its attack';
      case 'stun': return 'Stuns the target';
      case 'taunt': return 'Generates ' + f.amt + ' hate on the target';
      case 'pet': return 'Summons ' + (PETS[f.pet] ? PETS[f.pet].name : f.pet) + ' to fight for you';
      case 'drain': return 'Drains ' + f.amt + ' ' + lab(f.stat) + ' from the target and adds it to you';
      case 'shield': return 'Absorbs up to ' + f.absorb + ' damage';
      case 'reflect': return 'Reflects ' + f.pct + '% of incoming ranged damage';
      case 'dmgshield': return 'Damages attackers (' + f.type + ' ' + num(f.amt) + ')';
      case 'morph': return 'Reshapes your body into a ' + f.name;
      case 'lattice': return 'Opens the Lattice: travel to any hopper pad or clone bay';
      case 'stealth': return 'Conceals you until you attack or are struck';
      case 'speed': return 'Run speed +' + f.pct + '%';
      case 'proc': return f.drain ? 'Weapon hits heal you for ' + f.drain + '% of the damage dealt' : 'Each weapon hit heals your whole team for ' + f.teamHeal;
    }
    return '';
  };
  const BUFFISH = { buff: 1, shield: 1, reflect: 1, speed: 1, stealth: 1, morph: 1, pet: 1, proc: 1, dmgshield: 1 };
  const CTRL = { root: 1, snare: 1, calm: 1, stun: 1, taunt: 1, debuff: 1, drain: 1 };
  const mag = (fx, L) => {
    for (const f of fx) {
      if (f.t === 'buff' || f.t === 'debuff') { const v = Object.keys(f.mods).map((k) => Math.abs(f.mods[k])); return Math.max.apply(null, v); }
      if (f.t === 'speed' || f.t === 'reflect' || f.t === 'snare') return f.pct;
      if (f.t === 'shield') return f.absorb;
      if (f.t === 'heal' || f.t === 'hot' || f.t === 'dmg' || f.t === 'dot') return (f.amt[0] + f.amt[1]) / 2;
      if (f.t === 'taunt' || f.t === 'drain') return f.amt;
      if (f.t === 'proc') return f.drain || f.teamHeal;
    }
    return L;
  };
  const rankIcon = { heal: '✚', hot: '♥', dmg: '✦', dot: '☣', root: '⚓', snare: '↓', calm: '☾', stun: '✖', taunt: '!', pet: '⚙', drain: '⇩', shield: '▣', reflect: '◈', morph: '☻', lattice: '↯', stealth: '◌', speed: '»', proc: '☠', debuff: '▽', buff: '▲' };

  const specs = [];
  const S = (o) => specs.push(o);

  // ================= TROOPER (fab) =================
  S({ p: 'trooper', k: 'sights', n: 'Rifle Discipline', t: 'self', lv: [1, 8, 16, 25, 35, 45], gl: 'AR',
    ti: ['Rifle Focus', 'Target Lock', 'Rifle Calibration', 'Killer Focus', 'Marksman Matrix', 'Warfront Mastery'],
    f: (L) => [buff(Object.assign({ assault_rifle: R(5 + 3.2 * L) }, L >= 16 ? { burst: R(2 + 1.8 * L), full_auto: R(2 + 1.8 * L) } : {}))],
    fl: 'Calibrates your optics and recoil compensation.' });
  S({ p: 'trooper', k: 'reflect', n: 'Reflector Field', t: 'self', lv: [1, 12, 24, 34, 44], gl: '◈',
    ti: ['Reflect Field', 'Rebound Screen', 'Backlash Field', 'Ricochet Bulwark', 'Mirrorplate Aegis'],
    f: (L) => [{ t: 'reflect', pct: R(5 + 0.4 * L) }, buff({ ac_proj: R(4 + 2 * L) })], fl: 'A shimmering field throws part of every shot back at the shooter.' });
  S({ p: 'trooper', k: 'skin', n: 'Plated Skin', t: 'self', lv: [1, 12, 26, 40], gl: '▣',
    ti: ['Hardened Skin', 'Plated Skin', 'Ceramic Skin', 'Adamant Skin'], f: (L) => [buff({ ac_proj: R(8 + 3.6 * L), ac_melee: R(6 + 3 * L) })], fl: 'Nanomachines harden the outer dermis.' });
  S({ p: 'trooper', k: 'squad', n: 'Squad Sights', t: 'team', lv: [14, 28, 42], gl: 'AR', nw: 1.4,
    ti: ['Fire Discipline', 'Concentrated Fire', 'Strike Doctrine'], f: (L) => [buff({ assault_rifle: R(3 + 2.2 * L), addDmg: R(0.6 + 0.3 * L) })], fl: 'Shares your firing solution with the squad.' });
  S({ p: 'trooper', k: 'barrier', n: 'Barrier Plate', t: 'self', lv: [8, 30], gl: '▣', ca: 1.5, rc: 30, du: 120, ki: 0.8,
    ti: ['Spall Shield', 'Hardlight Plate'], f: (L) => [{ t: 'shield', absorb: R(40 + 30 * L) }], fl: 'A hardlight plate that soaks a fixed amount of damage.' });

  // ================= BRUISER (fab, bio) =================
  S({ p: 'bruiser', k: 'rage', n: 'Rage', t: 'self', lv: [1, 9, 19, 31, 43], gl: '☠', ti: ['Rage', 'Fury', 'Berserk', 'Wrath', 'Bloodstorm'],
    f: (L) => [buff({ str: R(3 + 0.8 * L), addDmg: R(1 + 0.5 * L) })], fl: 'Flood the muscles with stimulants and fury.' });
  S({ p: 'bruiser', k: 'taunt', n: 'Taunt', t: 'enemy', lv: [1, 10, 20, 32, 44], gl: '!', ca: 0.5, rc: [6, 12], ki: 0.5, rg: 25,
    ti: ['Taunt', 'Bellow', 'Challenging Roar', 'Warcry', 'Iron Summons'], f: (L) => [{ t: 'taunt', amt: R(80 + 45 * L) }], fl: 'Drag the enemy\'s attention onto you.' });
  S({ p: 'bruiser', k: 'hide', n: 'Bulk Up', t: 'self', lv: [1, 11, 22, 34, 46], gl: 'HP', ti: ['Thick Hide', 'Bulk Up', 'Ironhide', 'Titan Frame', 'Colossus Frame'],
    f: (L) => [buff({ maxHp: R(30 + 14 * L) })], fl: 'Tissue-swelling nanites inflate your health pool.' });
  S({ p: 'bruiser', k: 'plate', n: 'Plated Hide', t: 'self', lv: [6, 24, 40], gl: '▣', ti: ['Hide Plating', 'Slab Armour', 'Fortress Plating'],
    f: (L) => [buff({ ac_melee: R(10 + 4.5 * L), ac_proj: R(8 + 3.5 * L) })], fl: 'Layered composite grows over your skin.' });

  // ================= MEDIC (bio, trn) =================
  S({ p: 'medic', k: 'mend', n: 'Field Mend', t: 'friend', lv: [1, 8, 16, 25, 35, 45], gl: '✚', ca: [1.2, 2.4], rc: [3, 7],
    ti: ['Mend', 'Patch Up', 'Trauma Seal', 'Clean Restoration', 'Surgical Renewal', 'Full Recovery'], f: (L, i) => [{ t: 'heal', amt: H(L, 0.2 + 0.045 * i, 0.24 + 0.05 * i) }],
    fl: 'A burst of healing nanites.' });
  S({ p: 'medic', k: 'regen', n: 'Regen Pulse', t: 'friend', lv: [1, 12, 24, 36, 46], gl: '♥', ca: 1.2, rc: 8, du: [15, 24],
    ti: ['Regen Pulse', 'Slow Mend', 'Steady Infusion', 'Reservoir Infusion', 'Cascade Infusion'], f: (L) => [{ t: 'hot', amt: H(L, 0.035, 0.045), every: 3 }],
    fl: 'Heals a little every few seconds.' });
  S({ p: 'medic', k: 'vital', n: 'Team Vitality', t: 'team', lv: [1, 14, 26, 38, 48], gl: 'HP', nw: 1.3,
    ti: ['Vitality', 'Collective Vigour', 'Squad Resilience', 'Legion Constitution', 'Bastion of Life'], f: (L) => [buff({ maxHp: R(20 + 10 * L) })], fl: 'Raises the health pool of the whole team.' });
  S({ p: 'medic', k: 'toxin', n: 'Toxin Strike', t: 'enemy', lv: [7, 18, 30, 42], gl: '☣', ca: [1.5, 2], rc: 12, du: 21, ki: 0.8,
    ti: ['Toxin Strike', 'Necrotic Seed', 'Blight Cascade', 'Pathogen Storm'], f: (L) => [{ t: 'dot', type: 'poison', amt: D(L, 0.85, 1.05), every: 3 }], fl: 'Seeds the target with a lingering toxin.' });

  // ================= MECHANIST (fab, trn) =================
  S({ p: 'mechanist', k: 'bot', n: 'Combat Drone', t: 'self', lv: [1, 10, 19, 28, 37, 46], gl: '⚙', ca: 3, rc: 10, du: 3600,
    ti: ['Spark Drone', 'Guard Bot', 'Skirmish Frame', 'Siege Walker', 'Assault Chassis', 'Warmech Prime'], f: (L, i) => [{ t: 'pet', pet: 'mech_' + (i + 1) }],
    fl: 'Assembles a combat robot from scrap nanites.' });
  S({ p: 'mechanist', k: 'ward', n: 'Ward Plating', t: 'self', lv: [1, 14, 28, 42], gl: '▣', ti: ['Ward Plating', 'Field Plating', 'Ablative Plating', 'Reactive Plating'],
    f: (L) => [buff({ ac_proj: R(8 + 4 * L), ac_melee: R(8 + 4 * L), ac_energy: R(4 + 2 * L) })], fl: 'Projects a plating lattice over your body.' });
  S({ p: 'mechanist', k: 'blind', n: 'Flash Blind', t: 'enemy', lv: [1, 16, 30, 44], gl: '☀', ca: 1.0, rc: 15, du: [20, 30], ki: 0.7,
    ti: ['Flash Blind', 'Glare Pulse', 'Whiteout Burst', 'Starburst'], f: (L) => [deb({ addAR: -R(5 + 2.6 * L), addDef: -R(3 + 1.4 * L) })], fl: 'An arc-flash that dazzles the target\'s sensors.' });
  S({ p: 'mechanist', k: 'petarm', n: 'Pet Armour', t: 'pet', lv: [10, 26, 42], gl: '▣', ti: ['Pet Armour', 'Reinforced Chassis', 'Composite Chassis'],
    f: (L) => [buff({ ac_melee: R(15 + 5 * L), ac_proj: R(15 + 5 * L), maxHp: R(30 + 10 * L) })], fl: 'Reinforces your robot.' });
  S({ p: 'mechanist', k: 'repair', n: 'Pet Welder', t: 'pet', lv: [14, 34], gl: '✚', ca: 1.5, rc: 8, ti: ['Pet Welder', 'Pet Overhaul'],
    f: (L, i) => [{ t: 'heal', amt: [R(4.77 * (8 + 2.2 * L) * (0.35 + 0.15 * i)), R(4.77 * (8 + 2.2 * L) * (0.45 + 0.15 * i))] }], fl: 'Field repairs for your robot.' });

  // ================= RUNNER (spt, sen) =================
  S({ p: 'runner', k: 'sprint', ln: 'run_speed', n: 'Sprint Protocol', t: 'self', lv: [1, 8, 16, 25, 34, 43], gl: '»', nw: 0.7,
    ti: ['Sprint', 'Quickstep', 'Dash Matrix', 'Windrunner', 'Gale Stride', 'Blur'], f: (L) => [{ t: 'speed', pct: R(8 + 0.6 * L) }], fl: 'Spacetime-folded legs eat the distance.' });
  S({ p: 'runner', k: 'slip', n: 'Slipstream', t: 'self', lv: [1, 12, 22, 33, 44], gl: '≋',
    ti: ['Slipstream', 'Sidestep', 'Phantom Weave', 'Blur Guard', 'Untouchable'], f: (L) => [buff({ evade_close: R(5 + 3.2 * L), dodge_ranged: R(5 + 3.2 * L), duck_exp: R(3 + 2 * L) })], fl: 'You are never quite where they aim.' });
  S({ p: 'runner', k: 'patch', n: 'Quick Patch', t: 'friend', lv: [1, 14, 26, 38, 47], gl: '♥', ca: 1.0, rc: 10, du: [15, 24],
    ti: ['Patch Up', 'Stim Drip', 'Adrenal Weave', 'Pulse Regen', 'Second Wind'], f: (L) => [{ t: 'hot', amt: H(L, 0.04, 0.05), every: 3 }], fl: 'A cheap health-over-time stim.' });
  S({ p: 'runner', k: 'lattice', n: 'The Lattice', t: 'self', lv: [10, 30], gl: '↯', ca: 3, rc: [30, 20], ki: 2.5, ti: ['Lattice Link', 'Lattice Link II'],
    f: () => [{ t: 'lattice' }], fl: 'Step into the Lattice and come out at any hopper pad or clone bay.' });
  S({ p: 'runner', k: 'trigger', n: 'Quick Draw', t: 'self', lv: [3, 15, 27, 39], gl: 'SM', ti: ['Quick Draw', 'Spray Control', 'Hairtrigger', 'Blazing Hands'],
    f: (L) => [buff({ smg: R(4 + 3.2 * L), full_auto: R(2 + 1.8 * L) })], fl: 'Tunes reflexes to the rattle of an SMG.' });

  // ================= NANOSHAPER (fab, trn) =================
  S({ p: 'nanoshaper', k: 'bolt', n: 'Arc Bolt', t: 'enemy', lv: [1, 9, 18, 30, 42], gl: '⚡', ca: [1.8, 2.6], rc: [4, 8], rg: 30,
    ti: ['Arc Bolt', 'Lumen Lance', 'Plasma Spear', 'Starfall Lance', 'Singularity Bolt'], f: (L) => [{ t: 'dmg', type: 'energy', amt: D(L, 3.4, 4.2) }], fl: 'A concentrated bolt of raw lumen energy.' });
  S({ p: 'nanoshaper', k: 'blast', n: 'Searing Blast', t: 'enemy', lv: [12, 28, 44], gl: '✹', ca: 3, rc: 15, ki: 1.1, rg: 30,
    ti: ['Cinder Blast', 'Furnace Blast', 'Sunfire Detonation'], f: (L) => [{ t: 'dmg', type: 'fire', amt: D(L, 6, 7.5) }], fl: 'A slow, enormous fireball.' });
  S({ p: 'nanoshaper', k: 'corrode', n: 'Corrode', t: 'enemy', lv: [1, 12, 24, 36], gl: '☣', ca: 1.5, rc: 12, du: 21, ki: 0.8, rg: 30,
    ti: ['Corrode', 'Etch', 'Dissolve', 'Unmake'], f: (L) => [{ t: 'dot', type: 'chem', amt: D(L, 0.95, 1.15), every: 3 }], fl: 'Eats the target away from the inside.' });
  S({ p: 'nanoshaper', k: 'ensnare', n: 'Ensnare', t: 'enemy', lv: [1, 16, 30, 44], gl: '⚓', ca: 1.5, rc: 20, du: [6, 10], ki: 0.7, rg: 28,
    ti: ['Ensnare', 'Crystal Bind', 'Lumen Cage', 'Prism Prison'], f: () => [{ t: 'root' }], fl: 'Lumen crystals lock the target\'s legs.' });
  S({ p: 'nanoshaper', k: 'thrift', n: 'Efficient Weave', t: 'self', lv: [8, 20, 32, 44], gl: '%', ti: ['Efficient Weave', 'Frugal Lattice', 'Thrifty Matrix', 'Austere Core'],
    f: (L) => [buff({ nanoCost: R(3 + 0.25 * L) })], fl: 'Streamlines every program you run.' });

  // ================= PSION (psi, trn) =================
  S({ p: 'psion', k: 'familiar', n: 'Mind Familiar', t: 'self', lv: [1, 13, 24, 35, 46], gl: '❂', ca: 3, rc: 10, du: 3600,
    ti: ['Mind Familiar', 'Thought Stalker', 'Psyche Wraith', 'Echo Predator', 'Nightmare Avatar'], f: (L, i) => [{ t: 'pet', pet: 'psion_hunter' + (i + 1) }], fl: 'A hunting thought given shape.' });
  S({ p: 'psion', k: 'mender', n: 'Mind Mender', t: 'self', lv: [8, 24, 40], gl: '❂', ca: 3, rc: 10, du: 3600, ti: ['Mind Mender', 'Soothing Echo', 'Healing Avatar'],
    f: (L, i) => [{ t: 'pet', pet: 'psion_mender' + (i + 1) }], fl: 'A gentle thought-form that mends its master.' });
  S({ p: 'psion', k: 'focus', n: 'Focus', t: 'self', lv: [1, 14, 28, 40], gl: '◉', ti: ['Focus', 'Deep Focus', 'Lucid Trance', 'Perfect Stillness'],
    f: (L) => [buff({ nano_pool: R(8 + 4.5 * L), nanoInit: R(2 + 1.2 * L), psy: R(1 + 0.4 * L) })], fl: 'Quiets the mind and deepens the nano pool.' });
  S({ p: 'psion', k: 'lash', n: 'Lash', t: 'enemy', lv: [1, 10, 20, 30, 40, 48], gl: '✦', ca: [1.5, 2.2], rc: [3, 6], rg: 28,
    ti: ['Lash', 'Mind Whip', 'Psychic Scourge', 'Mind Flay', 'Cerebral Storm', 'Mindfire'], f: (L) => [{ t: 'dmg', type: 'energy', amt: D(L, 2.2, 2.7) }], fl: 'A psychic whip-crack.' });
  S({ p: 'psion', k: 'syntony', n: 'Shared Syntony', t: 'team', lv: [16, 28, 40, 48], gl: '❖', nw: 2.2,
    ti: ['Shared Syntony', 'Chorus Syntony', 'Resonant Syntony', 'Grand Syntony'],
    f: (L) => { const v = R(3 + 1.5 * L); return [buff({ fab: v, trn: v, bio: v, psi: v, sen_sch: v, spt: v })]; }, fl: 'Tunes every ally\'s nano skills to your own.' });

  // ================= MARTIALIST (sen, spt) =================
  S({ p: 'martialist', k: 'palm', n: 'Iron Palm', t: 'self', lv: [1, 10, 20, 32, 44], gl: '✋', ti: ['Iron Palm', 'Crane Stance', 'Dragon Stance', 'Tiger Claw', 'Fist of Ages'],
    f: (L) => [buff(Object.assign({ martial_arts: R(4 + 3.2 * L), brawl: R(2 + 2 * L) }, L >= 20 ? { pressure_pt: R(2 + 2 * L) } : {}))], fl: 'Conditions the hands and the stance.' });
  S({ p: 'martialist', k: 'focus', n: 'Inner Focus', t: 'self', lv: [1, 12, 24, 36, 47], gl: '◉', ti: ['Inner Focus', 'Keen Eye', 'Killing Intent', 'Perfect Timing', 'Lightning Insight'],
    f: (L) => [buff({ critPct: R((1.5 + 0.17 * L) * 10) / 10, addDmg: R(1 + 0.3 * L) })], fl: 'Sees the opening before it exists.' });
  S({ p: 'martialist', k: 'wind', n: 'Second Wind', t: 'self', lv: [1, 9, 18, 28, 40], gl: '✚', ca: [1.2, 2.2], rc: [4, 7],
    ti: ['Second Wind', 'Inner Mending', 'Meditative Renewal', 'Still Water', 'Mountain Breath'], f: (L, i) => [{ t: 'heal', amt: H(L, 0.2 + 0.05 * i, 0.25 + 0.055 * i) }], fl: 'Controlled breathing that knits wounds.' });
  S({ p: 'martialist', k: 'haste', n: 'Quick Hands', t: 'self', lv: [6, 18, 30, 42], gl: '≫', ti: ['Quick Hands', 'Flowing Strikes', 'Tempest Rhythm', 'Stormform'],
    f: (L) => [buff({ melee_init: R(5 + 3 * L), phys_init: R(3 + 2 * L) })], fl: 'Blows land faster than thought.' });

  // ================= INFILTRATOR (psi, sen) =================
  S({ p: 'infiltrator', k: 'aim', n: 'Steady Aim', t: 'self', lv: [1, 8, 16, 25, 35, 45], gl: '⌖', ti: ['Steady Aim', 'Scope Calibration', 'Sniper Focus', 'Deadeye Matrix', 'Phantom Marksman', 'Dead Reckoning'],
    f: (L) => [buff({ rifle: R(5 + 3.2 * L), aimed_shot: R(2 + 3 * L) })], fl: 'Slows your heartbeat between breaths.' });
  S({ p: 'infiltrator', k: 'veil', n: 'Shadow Veil', t: 'self', lv: [1, 16, 30, 44], gl: '◌', ca: 1.5, rc: 20, du: [90, 180], ki: 0.8,
    ti: ['Shadow Veil', 'Ghost Mantle', 'Dim Silhouette', 'Null Presence'], f: (L) => [{ t: 'stealth' }, buff({ concealment: R(5 + 3 * L) })], fl: 'Bends light around you. Attacking or being struck breaks it.' });
  S({ p: 'infiltrator', k: 'ham', n: 'Hamstring', t: 'enemy', lv: [1, 14, 28, 42], gl: '↓', ca: 1.0, rc: 15, du: [12, 18], ki: 0.6, rg: 28,
    ti: ['Hamstring', 'Crippling Shot', 'Kneecap', 'Hobble Protocol'], f: (L) => [{ t: 'snare', pct: R(30 + 0.4 * L) }], fl: 'A shot to the tendon slows the target.' });
  S({ p: 'infiltrator', k: 'crit', n: 'Weak Point', t: 'self', lv: [5, 15, 26, 37, 47], gl: '✧', ti: ['Weak Point', 'Pressure Gaps', 'Vital Reading', 'Surgical Insight', 'Executioner Mind'],
    f: (L) => [buff({ critPct: R((1.5 + 0.17 * L) * 10) / 10 })], fl: 'Highlights the seams in every defence.' });
  S({ p: 'infiltrator', k: 'mark', n: 'Mark Target', t: 'enemy', lv: [10, 24, 38], gl: '▽', ca: 1.0, rc: 20, du: 30, ki: 0.7, rg: 30,
    ti: ['Mark Target', 'Expose Weakness', 'Fatal Exposure'], f: (L) => [deb({ addDef: -R(3 + 1.6 * L), ac_proj: -R(5 + 2 * L) })], fl: 'Paints the target\'s weak points for the whole team.' });

  // ================= WAYFARER (bio, sen) =================
  S({ p: 'wayfarer', k: 'fleet', ln: 'run_speed', n: 'Sprint Protocol', t: 'self', lv: [1, 10, 20, 32, 44], gl: '»', nw: 0.7,
    ti: ['Fleet Foot', 'Swift Foot', 'Gale Foot', 'Windwalker', 'Hawk Stride'], f: (L) => [{ t: 'speed', pct: R(7 + 0.45 * L) }], fl: 'Trail-hardened legs.' });
  S({ p: 'wayfarer', k: 'mend', n: 'Wild Mend', t: 'friend', lv: [1, 9, 19, 30, 41], gl: '✚', ca: [1.2, 2.4], rc: [3, 7],
    ti: ['Wild Mend', 'Poultice', 'Herbal Balm', 'Wild Remedy', 'Spirit Spring'], f: (L, i) => [{ t: 'heal', amt: H(L, 0.15 + 0.045 * i, 0.19 + 0.05 * i) }], fl: 'Frontier medicine, nanite-grown.' });
  S({ p: 'wayfarer', k: 'form', n: 'Animal Forms', t: 'self', lv: [1, 12, 24, 36, 46], gl: '☻', ca: 2, rc: 5,
    ti: ['Beast Form', 'Bear Form', 'Mantis Form', 'Ridgeback Form', 'Behemoth Form'],
    f: (L, i) => [
      [{ t: 'morph', name: 'wolf', model: 'beast', scale: 0.95, colors: [0x6b6f77, 0x3d4047, 0xc9ccd2] }, buff({ agi: R(4 + 1.1 * L), critPct: 1 + R(L * 0.1) }), { t: 'speed', pct: 10 }],
      [{ t: 'morph', name: 'bear', model: 'beast', scale: 1.5, colors: [0x7a5230, 0x45301c, 0xd0b080] }, buff({ str: R(6 + 1.3 * L), sta: R(6 + 1.1 * L), maxHp: R(60 + 16 * L) })],
      [{ t: 'morph', name: 'mantis', model: 'insect', scale: 1.3, colors: [0x6fb04a, 0x2f5a22, 0xe8f08a] }, buff({ addDmg: R(2 + 0.6 * L), critPct: R((2 + 0.2 * L) * 10) / 10, evade_close: R(5 + 2 * L) })],
      [{ t: 'morph', name: 'ridgeback', model: 'beast', scale: 1.4, colors: [0x8a3a22, 0x3c1c12, 0xe6b060] }, buff({ str: R(5 + L), agi: R(5 + L), maxHp: R(50 + 14 * L), ac_melee: R(8 + 3 * L) }), { t: 'speed', pct: 12 }],
      [{ t: 'morph', name: 'behemoth', model: 'mutant', scale: 1.7, colors: [0x5a7a5a, 0x2a3a2a, 0xe0d070] }, buff({ str: R(8 + 1.4 * L), sta: R(8 + 1.2 * L), maxHp: R(80 + 20 * L), addDmg: R(3 + 0.8 * L), ac_melee: R(10 + 4 * L), ac_proj: R(10 + 4 * L) })],
    ][i], fl: 'Reshape your body into something that has survived the wilds.' });
  S({ p: 'wayfarer', k: 'pace', ln: 'team_run_speed', n: 'Team Stride', t: 'team', lv: [10, 22, 34, 46], gl: '»', nw: 1.0,
    ti: ['Team Stride', 'Trail Pace', 'Wind at Backs', 'Caravan Swiftness'], f: (L) => [{ t: 'speed', pct: R(6 + 0.4 * L) }], fl: 'Sets a pace the whole team can keep.' });
  S({ p: 'wayfarer', k: 'regrow', n: 'Thick Hide', t: 'self', lv: [8, 26, 42], gl: '♥', ti: ['Thick Skin', 'Mending Hide', 'Regrowth'],
    f: (L) => [buff({ hpRegen: R(1 + 0.35 * L), maxHp: R(15 + 8 * L) })], fl: 'Your wounds close on their own.' });

  // ================= BROKER (psi, trn) =================
  S({ p: 'broker', k: 'siphon', n: 'Skill Siphon', t: 'enemy', lv: [1, 10, 22, 34, 46], gl: '⇩', ca: 1.2, rc: 12, du: 40, ki: 0.8, rg: 28,
    ti: ['Siphon', 'Wage Garnish', 'Hostile Audit', 'Liquidation', 'Total Foreclosure'], f: (L) => [{ t: 'drain', stat: 'addAR', amt: R(4 + 2.2 * L) }, { t: 'drain', stat: 'addDef', amt: R(2 + 1.2 * L) }],
    fl: 'Takes the target\'s edge and gives it to you.' });
  S({ p: 'broker', k: 'erode', n: 'Armour Levy', t: 'enemy', lv: [1, 14, 26, 38], gl: '⇩', ca: 1.2, rc: 12, du: 40, ki: 0.8, rg: 28,
    ti: ['Erode', 'Surcharge', 'Asset Seizure', 'Hostile Takeover'], f: (L) => [{ t: 'drain', stat: 'ac_proj', amt: R(8 + 3.2 * L) }, { t: 'drain', stat: 'ac_melee', amt: R(8 + 3.2 * L) }],
    fl: 'Levies the target\'s armour in your favour.' });
  S({ p: 'broker', k: 'escrow', n: 'Escrow Shield', t: 'self', lv: [1, 16, 32], gl: '▣', ca: 1.5, rc: 30, du: 120, ki: 0.8, ti: ['Barrier', 'Bonded Shield', 'Vault Shield'],
    f: (L) => [{ t: 'shield', absorb: R(30 + 26 * L) }], fl: 'Holds incoming damage in escrow.' });
  S({ p: 'broker', k: 'mend', n: 'Barter Mend', t: 'friend', lv: [4, 12, 22, 33, 44], gl: '✚', ca: [1.4, 2.4], rc: [4, 8],
    ti: ['Barter Mend', 'Fair Trade Mend', 'Insured Recovery', 'Dividend Heal', 'Total Settlement'], f: (L, i) => [{ t: 'heal', amt: H(L, 0.14 + 0.04 * i, 0.18 + 0.045 * i) }], fl: 'A fair price for a patched wound.' });

  // ================= EXECUTIVE (psi, fab) =================
  S({ p: 'executive', k: 'hush', n: 'Hush', t: 'enemy', lv: [1, 14, 28, 40], gl: '☾', ca: 1.0, rc: 25, du: [10, 16], ki: 0.7, rg: 28,
    ti: ['Hush', 'Cooling Order', 'Mandatory Recess', 'Gag Order'], f: () => [{ t: 'calm' }], fl: 'A firm word that ends the fight, for now.' });
  S({ p: 'executive', k: 'tape', n: 'Red Tape', t: 'enemy', lv: [1, 16, 30, 44], gl: '⚓', ca: 1.5, rc: 20, du: [8, 14], ki: 0.7, rg: 28,
    ti: ['Red Tape', 'Injunction', 'Restraining Order', 'Asset Freeze'], f: () => [{ t: 'root' }], fl: 'Bureaucracy has never moved so fast.' });
  S({ p: 'executive', k: 'droid', n: 'Assistant Droid', t: 'self', lv: [1, 12, 24, 34, 44], gl: '⚙', ca: 3, rc: 10, du: 3600,
    ti: ['Ledger Droid', 'Courier Droid', 'Enforcer Droid', 'Auditor Droid', 'Director Droid'], f: (L, i) => [{ t: 'pet', pet: 'exec_droid' + (i + 1) }], fl: 'Requisitions a droid assistant.' });
  S({ p: 'executive', k: 'delay', n: 'Paperwork Delay', t: 'enemy', lv: [6, 18, 30, 42], gl: '↓', ca: 1.0, rc: 15, du: 15, ki: 0.6, rg: 28,
    ti: ['Paperwork Delay', 'Procedural Delay', 'Filibuster', 'Gridlock'], f: (L) => [{ t: 'snare', pct: R(20 + 0.6 * L) }], fl: 'Slows the target to a bureaucratic crawl.' });
  S({ p: 'executive', k: 'budget', n: 'Budget Memo', t: 'team', lv: [12, 24, 36, 46], gl: '%', nw: 1.5,
    ti: ['Budget Memo', 'Austerity Directive', 'Efficiency Mandate', 'Executive Order'], f: (L) => [buff({ nanoCost: R((2 + 0.16 * L) * 10) / 10 })], fl: 'Every program on the team runs cheaper.' });

  // ================= WARDEN (bio, sen) =================
  S({ p: 'warden', k: 'aegis', n: 'Aegis Aura', t: 'team', lv: [1, 14, 26, 38, 48], gl: '◈', nw: 1.4,
    ti: ['Aegis Aura', 'Bulwark Aura', 'Bastion Aura', 'Citadel Aura', 'Sanctum Aura'], f: (L) => [buff({ ac_melee: R(6 + 2.8 * L), ac_proj: R(6 + 2.8 * L) })], fl: 'An aura that hardens everyone near you.' });
  S({ p: 'warden', k: 'blade', n: 'Mend Blade', t: 'self', lv: [1, 12, 24, 36, 46], gl: '⚔', ti: ['Mend Blade', 'Healing Edge', 'Lifebinding Edge', 'Vital Edge', 'Lifeblood Edge'],
    f: (L) => [{ t: 'proc', teamHeal: R(2 + 0.8 * L) }], fl: 'Every blow you land mends your allies.' });
  S({ p: 'warden', k: 'stance', n: 'Bulwark', t: 'self', lv: [1, 14, 28, 42], gl: '▣', ti: ['Bulwark', 'Shield Stance', 'Fortress Stance', 'Aegis Stance'],
    f: (L) => [buff({ ac_melee: R(8 + 4 * L), ac_proj: R(6 + 3 * L), maxHp: R(15 + 8 * L) })], fl: 'Plant your feet.' });
  S({ p: 'warden', k: 'fury', n: 'Aura of Fury', t: 'team', lv: [8, 20, 32, 44], gl: '☼', nw: 1.4,
    ti: ['Aura of Resolve', 'Aura of Fury', 'Aura of Wrath', 'Aura of Dominion'], f: (L) => [buff({ addDmg: R(1.5 + 0.6 * L) })], fl: 'An aura that sharpens everyone near you.' });
  S({ p: 'warden', k: 'recover', n: 'Steel Resolve', t: 'self', lv: [4, 16, 28, 40], gl: '✚', ca: [1.2, 2.2], rc: [4, 7],
    ti: ['Steel Resolve', 'Guarded Recovery', 'Vigil Renewal', 'Sanctum Mend'], f: (L, i) => [{ t: 'heal', amt: H(L, 0.16 + 0.05 * i, 0.2 + 0.055 * i) }], fl: 'Grit your teeth and close the wound.' });

  // ================= WRAITH (sen, bio) =================
  S({ p: 'wraith', k: 'shroud', n: 'Dusk Veil', t: 'self', lv: [1, 16, 30, 44], gl: '◌', ca: 1.5, rc: 20, du: [90, 180], ki: 0.8,
    ti: ['Shadow Step', 'Dusk Veil', 'Midnight Shroud', 'Eclipse Veil'], f: (L) => [{ t: 'stealth' }, buff({ concealment: R(5 + 3 * L) })], fl: 'Step into the gap between lights.' });
  S({ p: 'wraith', k: 'leech', n: 'Leech', t: 'self', lv: [1, 12, 24, 36, 47], gl: '☠', ti: ['Leech', 'Hungry Edge', 'Starving Edge', 'Vampiric Edge', 'Soul Edge'],
    f: (L) => [{ t: 'proc', drain: R(3 + 0.25 * L) }], fl: 'Your weapon drinks what it cuts and gives it to you.' });
  S({ p: 'wraith', k: 'venom', n: 'Venom Edge', t: 'enemy', lv: [1, 14, 26, 38], gl: '☣', ca: 1.0, rc: 12, du: 18, ki: 0.8, rg: 16,
    ti: ['Venom Edge', 'Viper Edge', 'Deathbloom Edge', 'Plague Edge'], f: (L) => [{ t: 'dot', type: 'poison', amt: D(L, 0.8, 1.0), every: 3 }], fl: 'A toxin-coated cut that keeps working.' });
  S({ p: 'wraith', k: 'ambush', n: 'Cutthroat', t: 'self', lv: [5, 16, 28, 40], gl: '✦', ti: ['Cutthroat', 'Assassin Focus', 'Killer Instinct', 'Death Mark'],
    f: (L) => [buff({ sneak_attack: R(4 + 3.2 * L), critPct: R((1 + 0.12 * L) * 10) / 10 })], fl: 'Strikes from the dark hit harder.' });
  S({ p: 'wraith', k: 'dusk', n: 'Dusk Step', t: 'self', lv: [7, 19, 31, 43], gl: '≋', ti: ['Dusk Step', 'Ghost Step', 'Wraith Step', 'Phantom Step'],
    f: (L) => [buff({ evade_close: R(5 + 3 * L), dodge_ranged: R(4 + 2.5 * L) })], fl: 'Blows slide off a body that is half elsewhere.' });

  // ================= ANY profession =================
  const AN = 'any';
  S({ p: AN, k: 'bandage', n: 'Bandage Routine', t: 'friend', lv: [1, 15], sc: ['bio'], gl: '✚', ca: 2, rc: 6, ti: ['Bandage Routine', 'Dressing Routine'],
    f: (L, i) => [{ t: 'heal', amt: H(L, 0.12 + 0.1 * i, 0.15 + 0.1 * i) }], fl: 'Basic nanite first-aid anyone can run.' });
  S({ p: AN, k: 'vigour', n: 'Minor Vitality', t: 'self', lv: [3, 20], sc: ['bio'], gl: 'HP', ti: ['Minor Vitality', 'Lesser Vitality'], f: (L) => [buff({ maxHp: R(15 + 5 * L) })], fl: 'A small bump to health.' });
  S({ p: AN, k: 'sprint', ln: 'run_speed', n: 'Sprint Protocol', t: 'self', lv: [5, 22], sc: ['spt'], gl: '»', nw: 0.7, ti: ['Light Feet', 'Quick Feet'],
    f: (L) => [{ t: 'speed', pct: R(4 + 0.15 * L) }], fl: 'A modest turn of speed.' });
  S({ p: AN, k: 'clarity', n: 'Nano Sip', t: 'self', lv: [4, 22], sc: ['psi'], gl: 'NP', ti: ['Nano Sip', 'Nano Draught'], f: (L) => [buff({ maxNp: R(15 + 6 * L) })], fl: 'A slightly larger nano reservoir.' });
  S({ p: AN, k: 'edge', n: 'Sharpened Edge', t: 'self', lv: [6, 24], sc: ['fab'], gl: '⚔', ti: ['Sharpened Edge', 'Honed Edge'], f: (L) => [buff({ addDmg: R(1 + 0.3 * L) })], fl: 'Adds a little bite to every hit.' });
  S({ p: AN, k: 'weave', n: 'Padded Weave', t: 'self', lv: [8, 26], sc: ['trn'], gl: '▣', ti: ['Padded Weave', 'Reinforced Weave'],
    f: (L) => [buff({ ac_melee: R(5 + 2 * L), ac_proj: R(5 + 2 * L) })], fl: 'A thin woven plating.' });
  S({ p: AN, k: 'sense', n: 'Keen Senses', t: 'self', lv: [10, 28], sc: ['sen'], gl: '◉', ti: ['Keen Senses', 'Sharp Senses'],
    f: (L) => [buff({ evade_close: R(3 + 1.6 * L), dodge_ranged: R(3 + 1.6 * L) })], fl: 'Sharper reflexes.' });

  // ---- build ----
  for (const sp of specs) {
    const n = sp.lv.length, lineId = sp.ln || (sp.p + '_' + sp.k);
    const stack = sp.t === 'enemy' ? 'enemy' : sp.t === 'team' ? 'team' : 'self';
    if (!NANOLINES[lineId]) NANOLINES[lineId] = { name: sp.n, stack, prof: sp.p };
    const schools = sp.sc || NANO_PROF_SCHOOLS[sp.p];
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const L = sp.lv[i], name = sp.ti[i], id = sp.p + '_' + snake(name);
      const fx = sp.f(L, i);
      const kinds = fx.map((f) => f.t);
      const isBuff = kinds.some((k) => BUFFISH[k]) && sp.t !== 'enemy';
      const isPet = kinds.includes('pet');
      // requirements: primary school first
      const m = R(L * 4.6 + 5), reqs = {};
      reqs[sk(schools[0])] = sp.p === AN ? R(m * 0.85) : m;
      if (schools[1] && sp.p !== AN) reqs[sk(schools[1])] = Math.floor(m * 0.65);
      // cost
      const base = 10 + L * 4;
      let dc = 0, util = false;
      for (const f of fx) {
        if (f.t === 'heal') dc += (f.amt[0] + f.amt[1]) / 2 * 0.35;
        else if (f.t === 'dmg') dc += (f.amt[0] + f.amt[1]) / 2 * 0.7;
        else if (f.t === 'dot') dc += (f.amt[0] + f.amt[1]) / 2 * (ipi(sp.du, i, n) / f.every) * 0.45;
        else if (f.t === 'hot') dc += (f.amt[0] + f.amt[1]) / 2 * (ipi(sp.du, i, n) / f.every) * 0.4;
        else util = true;
      }
      const ki = sp.ki || 1;
      let cost = dc * ki + (util ? base * (isBuff || isPet ? 0.6 : 0.7) * ki : 0);
      if (isPet) cost = base * 1.4;
      cost = Math.max(3, R(cost));
      // duration
      let dur = 0;
      if (sp.du !== undefined) dur = ipi(sp.du, i, n);
      else if (isBuff) dur = sp.t === 'team' ? Math.min(1800, 600 + L * 25) : Math.min(3600, 900 + L * 50);
      if (kinds.includes('pet')) dur = sp.du || 3600;
      const ncu = isBuff ? Math.max(1, R((sp.nw || 1) * (isPet ? 0.8 : 1) * (4 + 0.55 * L))) : 0;
      let str = R(mag(fx, L));
      if (str <= prev) str = prev + 1;
      prev = str;
      const rg = sp.rg !== undefined ? sp.rg : sp.t === 'self' ? 0 : sp.t === 'team' ? 25 : sp.t === 'enemy' ? 30 : 30;
      const nano = {
        id, name, prof: sp.p, lvl: L, line: lineId, str, ncu, cost, cast: ip(sp.ca !== undefined ? sp.ca : isPet ? 3 : 1.5, i, n),
        recharge: ip(sp.rc !== undefined ? sp.rc : 2, i, n), range: rg, target: sp.t, reqs, dur, school: schools[0],
        icon: { glyph: sp.gl || rankIcon[kinds[0]] || '✦', color: NANO_SCHOOLS[schools[0]].color }, fx,
      };
      nano.desc = (sp.fl ? sp.fl + ' ' : '') + fx.map(fxDesc).filter(Boolean).join('. ') + '.' + (dur >= 60 && sp.t !== 'enemy' ? ' Lasts ' + mins(dur) + '.' : dur > 0 ? ' Lasts ' + mins(dur) + '.' : '');
      NANOS[id] = nano;
    }
  }
}
nn_build();

// ---- mob / sim abilities --------------------------------------------------------------------
function nn_mobAbilities() {
  const A = (id, name, o) => {
    MOB_ABILITIES[id] = Object.assign({ id, name, prof: 'mob', lvl: 1, line: id, str: 1, ncu: 0, cost: 0, cast: 1.5, recharge: 10, range: 25, target: 'enemy', reqs: {}, dur: 0, rel: true, ai: { p: 0.5 }, desc: '' }, o);
    MOB_ABILITIES[id].icon = o.icon || { glyph: '✦', color: '#ff9a3c' };
  };
  A('heal_self', 'Self Repair', { target: 'self', range: 0, cast: 2.5, recharge: 20, fx: [{ t: 'heal', amt: [0.18, 0.24] }], ai: { hpBelow: 0.5 }, icon: { glyph: '✚', color: '#52d273' }, desc: 'Heals itself for about a fifth of its health.' });
  A('heal_ally', 'Mend Ally', { target: 'friend', range: 25, cast: 2.0, recharge: 12, fx: [{ t: 'heal', amt: [0.15, 0.2] }], ai: { allyHpBelow: 0.6 }, icon: { glyph: '✚', color: '#52d273' }, desc: 'Heals a wounded ally.' });
  A('pet_heal', 'Soothing Pulse', { target: 'friend', range: 25, cast: 2.0, recharge: 8, fx: [{ t: 'heal', amt: [0.1, 0.14] }], ai: { allyHpBelow: 0.85 }, icon: { glyph: '✚', color: '#52d273' }, desc: 'Heals its master.' });
  A('nuke_energy', 'Energy Bolt', { cast: 2.2, recharge: 7, fx: [{ t: 'dmg', type: 'energy', amt: [1.8, 2.2] }], ai: { p: 0.6 }, icon: { glyph: '⚡', color: '#4cc9f0' }, desc: 'A bolt of energy.' });
  A('nuke_fire', 'Flame Burst', { cast: 2.8, recharge: 10, fx: [{ t: 'dmg', type: 'fire', amt: [2.2, 2.8] }], ai: { p: 0.5 }, icon: { glyph: '✹', color: '#ff7a3c' }, desc: 'A burst of flame.' });
  A('poison_bite', 'Venomous Strike', { cast: 0.3, recharge: 12, range: 3.5, fx: [{ t: 'dmg', type: 'poison', amt: [0.6, 0.8] }, { t: 'dot', type: 'poison', amt: [0.35, 0.45], every: 3 }], dur: 12, ai: { p: 0.5 }, icon: { glyph: '☣', color: '#8ad060' }, desc: 'A bite that leaves a lingering poison.' });
  A('spore_cloud', 'Spore Cloud', { cast: 1.5, recharge: 16, range: 8, aoe: 6, fx: [{ t: 'dot', type: 'chem', amt: [0.3, 0.4], every: 3 }], dur: 12, ai: { p: 0.5 }, icon: { glyph: '☁', color: '#b0d060' }, desc: 'A choking cloud of spores.' });
  A('root', 'Entangle', { cast: 1.0, recharge: 20, range: 20, fx: [{ t: 'root' }], dur: 4, ai: { p: 0.35 }, icon: { glyph: '⚓', color: '#c8a050' }, desc: 'Roots the target for a few seconds.' });
  A('snare', 'Hobble', { cast: 0.8, recharge: 12, range: 22, fx: [{ t: 'snare', pct: 40 }], dur: 6, ai: { p: 0.4 }, icon: { glyph: '↓', color: '#c8a050' }, desc: 'Slows the target.' });
  A('enrage', 'Enrage', { target: 'self', range: 0, cast: 0.5, recharge: 60, fx: [{ t: 'buff', mods: { dmgPct: 30, atkPct: 25 } }], dur: 20, ai: { hpBelow: 0.35, once: true }, icon: { glyph: '☠', color: '#ff5a5a' }, desc: 'Flies into a rage: more damage, faster attacks.' });
  A('stomp', 'Ground Stomp', { target: 'self', range: 0, cast: 1.5, recharge: 14, aoe: 8, fx: [{ t: 'dmg', type: 'melee', amt: [1.5, 1.9] }, { t: 'stun' }], dur: 1.5, ai: { p: 0.5 }, icon: { glyph: '✖', color: '#d09050' }, desc: 'Slams the ground, damaging and briefly stunning everything near.' });
  A('summon_adds', 'Call Reinforcements', { target: 'self', range: 0, cast: 2.5, recharge: 45, fx: [{ t: 'summon', n: 2 }], ai: { hpBelow: 0.7, once: true }, icon: { glyph: '❖', color: '#ff9a3c' }, desc: 'Calls two allies to the fight.' });
}
const MOB_ABILITIES = {};
nn_mobAbilities();

// Do the stats meet the nano's school requirements? (level is checked separately by the learn code)
function nanoReqMet(S, nano) {
  if (!nano || !nano.reqs) return true;
  for (const k in nano.reqs) if ((S[k] || 0) < nano.reqs[k]) return false;
  return true;
}
// All nano ids for a profession (plus the 'any' pool), sorted by level.
function nanosForProf(prof, withAny) {
  const out = [];
  for (const id in NANOS) { const n = NANOS[id]; if (n.prof === prof || (withAny && n.prof === 'any')) out.push(id); }
  return out.sort((a, b) => NANOS[a].lvl - NANOS[b].lvl || NANOS[a].str - NANOS[b].str);
}
