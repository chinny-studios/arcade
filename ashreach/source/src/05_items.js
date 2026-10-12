// Ashreach — items: equipment slots, weapon/armour/utility templates, implants & clusters, consumables, loot and vendor stock

const EQUIP_SLOTS = ['rhand', 'lhand', 'head', 'back', 'lshoulder', 'rshoulder', 'chest', 'larm', 'rarm', 'lwrist', 'rwrist', 'hands', 'legs', 'feet', 'util1', 'util2', 'util3', 'deck'];
const IMPLANT_SLOTS = ['eye', 'head', 'ear', 'rarm', 'chest', 'larm', 'rwrist', 'waist', 'lwrist', 'rhand', 'legs', 'lhand', 'feet'];
const ITEM_T = {};          // templateId -> template (nanocrystal templates are registered from NANOS)
const CLUSTER_T = {};       // statId -> { name, k, slots: { shiny: [implantSlot], bright: [...], faded: [...] } }
const IMPLANT_TABLE = {};   // implantSlot -> { shiny: [statId], bright: [...], faded: [...] }
const CLUSTER_COLORS = ['shiny', 'bright', 'faded'];
const CLUSTER_MUL = { shiny: 1, bright: 0.6, faded: 0.4 };
const IT_AC = ['melee', 'proj', 'energy', 'chem', 'rad', 'cold', 'fire', 'poison'];
const IT_SLOT_NAME = {
  rhand: 'Right Hand', lhand: 'Left Hand', head: 'Head', back: 'Back', lshoulder: 'Left Shoulder', rshoulder: 'Right Shoulder', chest: 'Chest',
  larm: 'Left Arm', rarm: 'Right Arm', lwrist: 'Left Wrist', rwrist: 'Right Wrist', hands: 'Hands', legs: 'Legs', feet: 'Feet',
  util1: 'Utility', util2: 'Utility', util3: 'Utility', deck: 'Nano Memory Deck', eye: 'Eye', ear: 'Ear', waist: 'Waist',
};
const IT_IMP_ABIL = { eye: 'sen', head: 'int', ear: 'psy', rarm: 'str', chest: 'sta', larm: 'str', rwrist: 'agi', waist: 'sta', lwrist: 'agi', rhand: 'agi', legs: 'agi', lhand: 'agi', feet: 'agi' };
const IT_STAT_FB = {
  maxHp: 'Max Health', maxNp: 'Max Nano', hpRegen: 'Health Delta', npRegen: 'Nano Delta', ncu: 'Nano Memory', runSpeed: 'Run Speed', addDmg: 'Added Damage',
  critPct: 'Critical Chance %', nanoCost: 'Nano Cost Reduction %', nanoInit: 'Nano Cast Speed', level: 'Level', sen_sch: 'Sensory Tuning',
  ac_melee: 'Melee Armour', ac_proj: 'Projectile Armour', ac_energy: 'Energy Armour', ac_chem: 'Chemical Armour', ac_rad: 'Radiation Armour',
  ac_cold: 'Cold Armour', ac_fire: 'Fire Armour', ac_poison: 'Poison Armour',
};
const IT_TYPE_NAME = { melee: 'melee', proj: 'projectile', energy: 'energy', chem: 'chemical', rad: 'radiation', cold: 'cold', fire: 'fire', poison: 'poison' };
const IT_SPECIAL_NAME = { quick: 'Quick Shot', burst: 'Burst', fullauto: 'Full Auto', aimed: 'Aimed Shot', fast: 'Fast Attack', brawl: 'Brawl', pressure: 'Pressure Point', backstab: 'Backstab' };
const IT_TIER_COL = [[25, '#9aa3ad'], [60, '#6fcf6f'], [100, '#58a6ff'], [150, '#c07bff'], [9999, '#ffb347']];
const IT_CL_COL = { shiny: '#ffd24a', bright: '#7fe0ff', faded: '#9aa0a8' };

// ---------- small helpers ----------
const it_tierColor = (ql) => { for (const t of IT_TIER_COL) if (ql <= t[0]) return t[1]; return '#ffb347'; };
const it_r05 = (x) => Math.round(x * 20) / 20;
const it_num = (x) => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10);
const it_base = (ql) => 4 + 0.35 * Math.pow(ql, 1.6);          // credits value of a "1.0" item at this QL
const itemQlForLevel = (level, rng) => clamp(Math.round(level * 2.3 * (rng ? 0.8 + 0.4 * rng.f() : 1)), 1, 200);
function it_rng(r, seed) {
  if (r && typeof r.chance === 'function') return r;
  if (typeof r === 'function') {
    return { f: r, r: (a, b) => a + (b - a) * r(), i: (a, b) => Math.floor(a + (b - a + 1) * r()), pick: (arr) => arr[Math.floor(r() * arr.length)], chance: (p) => r() < p };
  }
  return makeRng(seed ? strSeed(String(seed)) : (Math.random() * 4294967296) >>> 0);
}
function it_statName(id) {
  if (typeof STAT_NAMES !== 'undefined' && STAT_NAMES[id]) return STAT_NAMES[id];
  if (typeof SKILLS !== 'undefined' && SKILLS[id]) return SKILLS[id].name;
  if (typeof ABILITY_NAMES !== 'undefined' && ABILITY_NAMES[id]) return ABILITY_NAMES[id];
  if (IT_STAT_FB[id]) return IT_STAT_FB[id];
  return cap1(String(id).replace(/_/g, ' '));
}
function it_tpl(id) { return ITEM_T[id] || (typeof id === 'string' && id.indexOf('nano:') === 0 ? it_nanoTpl(id) : null); }

// ---------- weapons ----------
// Per weapon-skill defaults. abil = secondary requirement; atk = base attack seconds; dm = damage multiplier vs. the QL damage curve.
const IT_SK = {
  pistol:        { n: 'Pistol', abil: 'agi', type: 'proj', sp: ['quick'], range: 20, model: 'pistol', atk: 1.5, spread: 0.25, dm: 0.9, glyph: '┌' },
  smg:           { n: 'SMG', abil: 'agi', type: 'proj', sp: ['burst', 'quick'], range: 22, model: 'smg', atk: 1.1, spread: 0.25, dm: 0.85, glyph: '╞' },
  assault_rifle: { n: 'Assault Rifle', abil: 'agi', type: 'proj', sp: ['burst', 'fullauto'], range: 30, model: 'rifle', atk: 1.8, spread: 0.3, dm: 1.0, th: 1, glyph: '╪' },
  rifle:         { n: 'Rifle', abil: 'sen', type: 'proj', sp: ['aimed'], range: 35, model: 'rifle', atk: 2.5, spread: 0.35, dm: 1.1, th: 1, glyph: '━' },
  shotgun:       { n: 'Shotgun', abil: 'str', type: 'proj', sp: ['quick'], range: 18, model: 'shotgun', atk: 2.6, spread: 0.4, dm: 1.1, th: 1, glyph: '╤' },
  bow:           { n: 'Bow', abil: 'agi', type: 'proj', sp: ['aimed'], range: 30, model: 'rifle', atk: 2.2, spread: 0.3, dm: 1.0, th: 1, glyph: ')' },
  heavy_weapons: { n: 'Heavy Weapons', abil: 'str', type: 'proj', sp: ['fullauto'], range: 28, model: 'heavy', atk: 3.0, spread: 0.3, dm: 1.15, th: 1, glyph: '▬' },
  ranged_energy: { n: 'Ranged Energy', abil: 'sen', type: 'energy', sp: ['quick'], range: 25, model: 'pistol', atk: 1.8, spread: 0.25, dm: 1.0, glyph: '◊' },
  blunt1h:       { n: '1H Blunt', abil: 'str', type: 'melee', sp: ['fast'], range: 3, model: 'melee1h', atk: 1.7, spread: 0.3, dm: 1.0, glyph: '▪' },
  edged1h:       { n: '1H Edged', abil: 'agi', type: 'melee', sp: ['fast'], range: 3, model: 'melee1h', atk: 1.5, spread: 0.3, dm: 0.95, glyph: '†' },
  piercing:      { n: 'Piercing', abil: 'agi', type: 'melee', sp: ['backstab', 'fast'], range: 3, model: 'melee1h', atk: 1.3, spread: 0.35, dm: 0.9, glyph: '↑' },
  blunt2h:       { n: '2H Blunt', abil: 'str', type: 'melee', sp: ['fast'], range: 4, model: 'melee2h', atk: 3.0, spread: 0.3, dm: 1.1, th: 1, glyph: '■' },
  edged2h:       { n: '2H Edged', abil: 'str', type: 'melee', sp: ['fast'], range: 4, model: 'melee2h', atk: 2.8, spread: 0.3, dm: 1.1, th: 1, glyph: '‡' },
  melee_energy:  { n: 'Melee Energy', abil: 'str', type: 'energy', sp: ['fast'], range: 3.5, model: 'melee1h', atk: 2.0, spread: 0.3, dm: 1.0, glyph: '♦' },
  martial_arts:  { n: 'Martial Arts', abil: 'agi', type: 'melee', sp: ['brawl', 'pressure', 'fast'], range: 3, model: 'fists', atk: 1.2, spread: 0.3, dm: 0.8, glyph: '●' },
};
const IT_SKILLS = Object.keys(IT_SK);
// [id, name, skill, qlMin, qlMax, overrides]. Overrides: atk dm spread rm(recharge mult) dmgType specials range model twoHand vm(value mult) rq(req mult) modK({stat: perQL})
const IT_WEAPONS = [
  ['pistol_basic', 'Dustrunner Pistol', 'pistol', 1, 45, {}],
  ['pistol_hale', 'Hale Duelist', 'pistol', 30, 110, { atk: 1.3, dm: 1.0, modK: { critPct: 0.01 } }],
  ['pistol_wren', 'Wren Quickdraw', 'pistol', 60, 160, { atk: 1.1, dm: 0.92, vm: 1.1 }],
  ['pistol_vesper', 'Vesper Mk IV Magnum', 'pistol', 80, 200, { atk: 1.7, dm: 1.12, spread: 0.3, modK: { critPct: 0.015 } }],
  ['smg_basic', 'Drover Machine Pistol', 'smg', 1, 50, {}],
  ['smg_kessler', 'Kessler M3 Carbine', 'smg', 35, 130, { atk: 0.95, dm: 0.9 }],
  ['smg_hornet', 'Hornet P9', 'smg', 90, 200, { atk: 0.8, dm: 0.88, modK: { smg: 0.1 } }],
  ['ar_basic', 'Garrison AR-1', 'assault_rifle', 1, 50, {}],
  ['ar_kessler', 'Kessler M7 Assault Rifle', 'assault_rifle', 40, 130, { atk: 1.7, dm: 1.02 }],
  ['ar_ironhide', 'Ironhide ARX', 'assault_rifle', 100, 200, { atk: 1.8, dm: 1.08, modK: { assault_rifle: 0.1 } }],
  ['rifle_basic', 'Homestead Long Rifle', 'rifle', 1, 50, {}],
  ['rifle_sable', 'Sable Marksman 40', 'rifle', 35, 130, { atk: 2.3, dm: 1.1, modK: { critPct: 0.01 } }],
  ['rifle_aurelian', 'Aurelian Longshot', 'rifle', 100, 200, { atk: 2.5, dm: 1.18, spread: 0.4, modK: { critPct: 0.02 } }],
  ['shotgun_basic', 'Alley Sweeper', 'shotgun', 1, 50, {}],
  ['shotgun_breaker', 'Breaker-12 Pump', 'shotgun', 35, 130, { atk: 2.4, dm: 1.12 }],
  ['shotgun_hammerfall', 'Hammerfall Scattergun', 'shotgun', 100, 200, { atk: 2.7, dm: 1.2, spread: 0.45, modK: { addDmg: 0.05 } }],
  ['bow_basic', 'Drifter Recurve', 'bow', 1, 50, {}],
  ['bow_tarn', 'Tarn Composite Bow', 'bow', 35, 130, { atk: 2.0, dm: 1.05 }],
  ['bow_flux', 'Fluxstring Compound', 'bow', 100, 200, { atk: 2.2, dm: 1.12, modK: { critPct: 0.015 } }],
  ['hw_basic', 'Rivet Gun HMG', 'heavy_weapons', 1, 60, {}],
  ['hw_cinder', 'Cinder Flamer', 'heavy_weapons', 40, 140, { dmgType: 'fire', range: 14, atk: 2.4, dm: 1.1 }],
  ['hw_hailstorm', 'Hailstorm Minigun', 'heavy_weapons', 90, 200, { atk: 3.2, dm: 1.2, vm: 1.2 }],
  ['energy_basic', 'Arcline Pulse Pistol', 'ranged_energy', 1, 60, {}],
  ['energy_lumen', 'Lumen Lance', 'ranged_energy', 40, 140, { twoHand: 1, model: 'rifle', range: 32, atk: 2.2, dm: 1.15 }],
  ['energy_prism', 'Prism Beamer', 'ranged_energy', 100, 200, { twoHand: 1, model: 'rifle', range: 35, atk: 2.4, dm: 1.2, modK: { nanoCost: 0.01 } }],
  ['blunt1h_basic', 'Pipe Club', 'blunt1h', 1, 50, {}],
  ['blunt1h_shock', 'Shockbaton', 'blunt1h', 35, 130, { atk: 1.6, dm: 1.02 }],
  ['blunt1h_breaker', 'Breaker Mace', 'blunt1h', 100, 200, { atk: 1.8, dm: 1.1, modK: { blunt1h: 0.1 } }],
  ['blade_1h_basic', 'Salvage Blade', 'edged1h', 1, 50, {}],
  ['edged1h_ridge', 'Ridgeline Cutlass', 'edged1h', 35, 130, { atk: 1.4, dm: 1.0 }],
  ['edged1h_mono', 'Monoedge Saber', 'edged1h', 100, 200, { atk: 1.5, dm: 1.08, modK: { edged1h: 0.1 } }],
  ['knife_basic', 'Utility Knife', 'piercing', 1, 50, {}],
  ['piercing_stiletto', 'Stiletto Mk2', 'piercing', 35, 130, { atk: 1.2, dm: 0.92, modK: { critPct: 0.015 } }],
  ['piercing_needle', 'Needlepoint Dirk', 'piercing', 100, 200, { atk: 1.2, dm: 0.98, modK: { critPct: 0.025 } }],
  ['hammer_2h_basic', 'Sledge Maul', 'blunt2h', 1, 50, {}],
  ['blunt2h_quake', 'Quake Hammer', 'blunt2h', 35, 130, { atk: 2.9, dm: 1.12 }],
  ['blunt2h_basalt', 'Basalt Crusher', 'blunt2h', 100, 200, { atk: 3.1, dm: 1.2, modK: { addDmg: 0.05 } }],
  ['blade_2h_basic', 'Cutter Greatblade', 'edged2h', 1, 50, {}],
  ['edged2h_harbinger', 'Harbinger Greatsword', 'edged2h', 35, 130, { atk: 2.7, dm: 1.12 }],
  ['edged2h_edgewalker', 'Edgewalker Zweihander', 'edged2h', 100, 200, { atk: 2.8, dm: 1.2, modK: { critPct: 0.015 } }],
  ['menergy_basic', 'Arc Baton', 'melee_energy', 1, 60, {}],
  ['menergy_glaive', 'Lumen Glaive', 'melee_energy', 40, 140, { twoHand: 1, model: 'melee2h', range: 4, atk: 2.6, dm: 1.15 }],
  ['menergy_plasma', 'Plasma Edge', 'melee_energy', 100, 200, { atk: 1.9, dm: 1.1, modK: { melee_energy: 0.1 } }],
  ['knuckles_basic', 'Wrapped Knuckles', 'martial_arts', 1, 50, { fist: 1, modK: { martial_arts: 0.2 } }],
  ['ma_thunder', 'Thunderfist Wraps', 'martial_arts', 35, 130, { fist: 1, atk: 1.1, dm: 0.85, modK: { martial_arts: 0.25 } }],
  ['ma_lumenfist', 'Lumenfist Gauntlets', 'martial_arts', 100, 200, { fist: 1, atk: 1.2, dm: 0.92, dmgType: 'energy', modK: { martial_arts: 0.3, critPct: 0.01 } }],
];

function it_bWeapon(it, t, ql) {
  const k = IT_SK[t.skill];
  const atk = it_r05(Math.max(0.6, t.atk));
  const avg = (3 + ql * 0.30) * atk * t.dm;
  it.skill = t.skill; it.dmgType = t.dmgType; it.atk = atk; it.rech = it_r05(Math.max(0.6, atk * (t.rm || 1)));
  it.dmg = [Math.max(1, Math.round(avg * (1 - t.spread))), Math.max(2, Math.round(avg * (1 + t.spread)))];
  it.range = t.range; it.specials = t.specials.slice(); it.twoHand = !!t.twoHand; it.model = t.model;
  if (t.fist) it.fist = true;   // martial-arts wraps: dmg is added to the unarmed martial_arts damage
  it.reqs[t.skill] = Math.round((ql * 1.6 + 5) * (t.rq || 1));
  it.reqs[k.abil] = Math.round(ql * 0.7 + 3);
  it.value = Math.round(it_base(ql) * 3 * (t.vm || 1));
}

// ---------- armour ----------
const IT_AW = { head: 1.2, back: 0.8, shoulder: 0.8, chest: 2.5, arm: 1, wrist: 0.6, hands: 0.8, legs: 1.8, feet: 0.9 };
const IT_ASLOTS = { head: ['head'], back: ['back'], shoulder: ['lshoulder', 'rshoulder'], chest: ['chest'], arm: ['larm', 'rarm'], wrist: ['lwrist', 'rwrist'], hands: ['hands'], legs: ['legs'], feet: ['feet'] };
const IT_ANOUN = {
  light: { head: 'Cowl', back: 'Cloak', shoulder: 'Shoulder Wraps', chest: 'Tunic', arm: 'Sleeve', wrist: 'Cuff', hands: 'Gloves', legs: 'Trousers', feet: 'Slippers' },
  medium: { head: 'Visor', back: 'Duster', shoulder: 'Epaulets', chest: 'Vest', arm: 'Armguard', wrist: 'Bracelet', hands: 'Gloves', legs: 'Leggings', feet: 'Boots' },
  heavy: { head: 'Helm', back: 'Cape', shoulder: 'Pauldrons', chest: 'Cuirass', arm: 'Vambrace', wrist: 'Wristguard', hands: 'Gauntlets', legs: 'Greaves', feet: 'Sabatons' },
};
// prof: AC multipliers in IT_AC order. ab: ability requirement; abm: its QL multiplier; bd: body_dev requirement multiplier. modK: stat -> per-QL (times slot weight).
const IT_ASET = {
  basic:    { n: 'Salvage', lo: 1, hi: 30, tier: 'light', prof: [0.45, 0.45, 0.35, 0.3, 0.3, 0.3, 0.3, 0.3], ab: 'sta', abm: 0.3, bd: 0, modK: {}, vm: 0.5, glyph: '▣' },
  cloth:    { n: 'Loomweave', lo: 8, hi: 200, tier: 'light', prof: [0.35, 0.35, 1.0, 0.8, 0.8, 0.8, 0.6, 0.8], ab: 'int', abm: 0.5, bd: 0, modK: { maxNp: 0.9, int: 0.06 }, vm: 1.0, glyph: '▣' },
  mesh:     { n: 'Sablemesh', lo: 18, hi: 200, tier: 'medium', prof: [0.7, 0.7, 0.7, 0.7, 0.6, 0.6, 0.6, 0.6], ab: 'agi', abm: 0.55, bd: 0.6, modK: { agi: 0.07, maxHp: 0.4 }, vm: 1.1, glyph: '▣' },
  combat:   { n: 'Ridgeback', lo: 28, hi: 200, tier: 'medium', prof: [1.0, 1.0, 0.55, 0.5, 0.5, 0.55, 0.5, 0.5], ab: 'str', abm: 0.55, bd: 1.0, modK: { maxHp: 1.0, sta: 0.06 }, vm: 1.2, glyph: '▣' },
  plated:   { n: 'Basalt Plate', lo: 45, hi: 200, tier: 'heavy', prof: [1.3, 1.2, 0.7, 0.5, 0.55, 0.6, 0.55, 0.5], ab: 'str', abm: 0.7, bd: 1.3, modK: { maxHp: 1.6, str: 0.06 }, vm: 1.4, glyph: '▣' },
  meridian: { n: 'Meridian Aegis', lo: 70, hi: 200, tier: 'medium', prof: [0.9, 0.9, 1.1, 0.8, 0.8, 0.8, 0.8, 0.8], ab: 'int', abm: 0.6, bd: 0.8, modK: { maxNp: 0.9, int: 0.07, nanoCost: 0.005 }, vm: 1.6, faction: 'meridian', glyph: '▣' },
  freehold: { n: 'Freehold Outrider', lo: 70, hi: 200, tier: 'medium', prof: [1.1, 1.1, 0.7, 0.6, 0.6, 0.6, 0.6, 0.6], ab: 'sta', abm: 0.6, bd: 1.1, modK: { maxHp: 1.3, addDmg: 0.04, sta: 0.06 }, vm: 1.6, faction: 'freehold', glyph: '▣' },
};
const IT_SHIELDS = [
  ['shield_buckler', 'Riot Buckler', 5, 80, 'combat', 'str'],
  ['shield_aegis', 'Aegis Barrier Disc', 40, 200, 'meridian', 'int'],
  ['shield_bulwark', 'Bulwark Tower Shield', 80, 200, 'plated', 'str'],
];
function it_bArmor(it, t, ql) {
  const A = IT_ASET[t.set], w = t.w;
  IT_AC.forEach((ty, i) => { const v = Math.round(ql * 0.6 * w * A.prof[i]); if (v > 0) it.mods['ac_' + ty] = v; });
  for (const s in A.modK) { const v = it_num(ql * A.modK[s] * w); if (v > 0) it.mods[s] = v; }
  it.reqs[t.ab] = Math.round(ql * A.abm * (w >= 2 ? 1.1 : 1) + 3);
  if (A.bd) it.reqs.body_dev = Math.round(ql * A.bd * 1.1 + 2);
  if (A.faction) it.faction = A.faction;
  it.armorSet = t.set;
  it.value = Math.round(it_base(ql) * 1.5 * w * A.vm);
}

// ---------- utility / decks ----------
// [id, name, slots, qlMin, qlMax, { base: {stat: const}, k: {stat: perQL}, rq: {stat: [perQL, const]}, glyph }]
const IT_UTIL = [
  ['deck_mnemo', 'Mnemo Chip', ['deck'], 1, 60, { base: { ncu: 6 }, k: { ncu: 0.3 }, rq: { int: [0.5, 3] }, glyph: '◘' }],
  ['deck_core', 'Lattice Core Bank', ['deck'], 40, 140, { base: { ncu: 10 }, k: { ncu: 0.32, maxNp: 0.5 }, rq: { int: [0.5, 3] }, glyph: '◘' }],
  ['deck_quantum', 'Quantum Memory Stack', ['deck'], 100, 200, { base: { ncu: 14 }, k: { ncu: 0.34, maxNp: 0.7, nanoInit: 0.3 }, rq: { int: [0.5, 3] }, glyph: '◘' }],
  ['util_goggles', 'Scanner Goggles', ['util1', 'util2', 'util3'], 5, 200, { k: { sen: 0.12, critPct: 0.02 }, rq: { sen: [0.4, 3] }, glyph: '¤' }],
  ['util_medpouch', "Medic's Webbing", ['util1', 'util2', 'util3'], 5, 200, { k: { first_aid: 0.35, treatment: 0.35 }, rq: { int: [0.3, 3] }, glyph: '¤' }],
  ['util_bandolier', 'Reload Bandolier', ['util1', 'util2', 'util3'], 5, 200, { k: { addDmg: 0.08, ranged_init: 0.3 }, rq: { agi: [0.4, 3] }, glyph: '¤' }],
  ['util_harness', 'Servo Harness', ['util1', 'util2', 'util3'], 5, 200, { k: { str: 0.15, maxHp: 0.8 }, rq: { sta: [0.4, 3] }, glyph: '¤' }],
  ['util_spurs', "Runner's Spurs", ['util1', 'util2', 'util3'], 5, 200, { k: { agi: 0.12, runSpeed: 0.004 }, rq: { agi: [0.4, 3] }, glyph: '¤' }],
  ['util_cell', 'Lumen Cell Pack', ['util1', 'util2', 'util3'], 5, 200, { k: { maxNp: 1.0, npRegen: 0.01 }, rq: { int: [0.4, 3] }, glyph: '¤' }],
  ['util_filter', 'Rebreather Filter', ['util1', 'util2', 'util3'], 5, 200, { k: { ac_chem: 0.4, ac_poison: 0.4, ac_rad: 0.4 }, rq: { sta: [0.4, 3] }, glyph: '¤' }],
  ['util_damper', 'Kinetic Dampener', ['util1', 'util2', 'util3'], 5, 200, { k: { ac_melee: 0.5, ac_proj: 0.5 }, rq: { sta: [0.4, 3] }, glyph: '¤' }],
];
function it_bUtil(it, t, ql) {
  for (const s in (t.base || {})) it.mods[s] = t.base[s];
  for (const s in (t.k || {})) { const v = it_num(ql * t.k[s]); it.mods[s] = it_num((it.mods[s] || 0) + v); }
  for (const s in (t.rq || {})) it.reqs[s] = Math.round(ql * t.rq[s][0] + t.rq[s][1]);
  it.value = Math.round(it_base(ql) * (t.slots[0] === 'deck' ? 3 : 2.5));
}

// ---------- consumables ----------
const IT_CONS = [
  ['health_kit', 'Field Medkit', 1, 200, '#ff6b6b', (ql) => ({ heal: [Math.round(ql * 5 + 25), Math.round(ql * 6.5 + 40)], cd: 20 }), { first_aid: [1.0, 0] }, 0.35],
  ['nano_kit', 'Nano Recharge Cell', 1, 200, '#5aa9ff', (ql) => ({ np: [Math.round(ql * 3 + 15), Math.round(ql * 4 + 25)], cd: 20 }), { treatment: [1.0, 0] }, 0.35],
  ['stim_bulk', 'Bulk Stim', 5, 200, '#c7f464', (ql) => ({ buff: { str: it_num(ql * 0.2 + 2), sta: it_num(ql * 0.2 + 2), maxHp: Math.round(ql * 1.5) }, dur: 300, cd: 60 }), { first_aid: [0.8, 0] }, 0.4],
  ['stim_reflex', 'Reflex Stim', 5, 200, '#c7f464', (ql) => ({ buff: { agi: it_num(ql * 0.2 + 2), ranged_init: it_num(ql * 0.6 + 4), melee_init: it_num(ql * 0.6 + 4) }, dur: 300, cd: 60 }), { first_aid: [0.8, 0] }, 0.4],
  ['stim_focus', 'Focus Stim', 5, 200, '#c7f464', (ql) => ({ buff: { int: it_num(ql * 0.2 + 2), psy: it_num(ql * 0.2 + 2), maxNp: Math.round(ql * 1.2) }, dur: 300, cd: 60 }), { first_aid: [0.8, 0] }, 0.4],
  ['stim_hardening', 'Hardening Stim', 5, 200, '#c7f464', (ql) => ({ buff: { ac_melee: Math.round(ql * 0.8 + 4), ac_proj: Math.round(ql * 0.8 + 4) }, dur: 300, cd: 60 }), { first_aid: [0.8, 0] }, 0.4],
];
function it_bCons(it, t, ql) {
  it.use = t.useFn(ql);
  for (const s in t.rq) it.reqs[s] = Math.round(ql * t.rq[s][0] + t.rq[s][1]);
  it.value = Math.max(1, Math.round(it_base(ql) * t.vm));
}

// ---------- misc loot & mission keys ----------
const LOOT_KINDS = {
  critter: ['Frayed Whisker Tuft', 'Gnawed Cable', 'Chitterling Tail'],
  insect: ['Chitin Shard', 'Scuttler Mandible', 'Spore Gland'],
  beast: ['Hound Pelt', 'Cracked Fang', 'Tough Hide Scrap'],
  drone: ['Scrap Servo', 'Burnt Circuit Board', 'Fused Power Coupling', 'Cracked Optic Lens'],
  humanoid: ['Ration Tin', 'Dented Canteen', 'Salvaged Radio', 'Spent Ammo Clip', 'Wire-Bound Journal'],
  mutant: ['Mutated Gland', 'Warped Bone', 'Tumorous Growth'],
  golem: ['Slag Chunk', 'Basalt Core Fragment', 'Fused Ore Lump'],
  wisp: ['Lumen Shard', 'Glowing Residue'],
  worm: ['Wyrm Hide', 'Grit-Packed Scale'],
};
const it_slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const IT_KEYS = [['key_card', 'Security Keycard'], ['key_data', 'Encrypted Data Core'], ['key_sample', 'Sealed Sample Case'], ['key_parcel', 'Courier Parcel'], ['key_relic', 'Pre-Collapse Relic']];

// ---------- implants & clusters ----------
const IT_IMP_NAME = { eye: 'Eye', head: 'Head', ear: 'Ear', rarm: 'Right Arm', chest: 'Chest', larm: 'Left Arm', rwrist: 'Right Wrist', waist: 'Waist', lwrist: 'Left Wrist', rhand: 'Right Hand', legs: 'Leg', lhand: 'Left Hand', feet: 'Foot' };
// stat: [value per QL for a shiny cluster, [home slot for shiny, bright, faded]]
const IT_CLUSTER_DEF = {
  str: [0.22, 'rarm larm waist'], agi: [0.22, 'rwrist lwrist feet'], sta: [0.22, 'chest waist legs'], int: [0.22, 'head ear eye'], sen: [0.22, 'ear eye head'], psy: [0.22, 'ear head chest'],
  pistol: [0.45, 'rhand eye lhand'], assault_rifle: [0.45, 'rhand lhand eye'], rifle: [0.45, 'eye rhand lhand'], smg: [0.45, 'lhand rhand lwrist'],
  shotgun: [0.45, 'rhand lhand rwrist'], bow: [0.45, 'eye lhand rhand'], heavy_weapons: [0.45, 'chest rarm waist'], ranged_energy: [0.45, 'eye lhand rhand'],
  blunt1h: [0.45, 'larm rarm rhand'], edged1h: [0.45, 'larm rarm lhand'], piercing: [0.45, 'larm lhand rarm'], blunt2h: [0.45, 'rarm larm chest'],
  edged2h: [0.45, 'rarm larm waist'], melee_energy: [0.45, 'rarm rhand larm'], martial_arts: [0.45, 'rhand lhand larm'],
  body_dev: [0.45, 'waist chest legs'], nano_pool: [0.45, 'head waist ear'], first_aid: [0.4, 'rwrist lwrist rhand'], treatment: [0.4, 'lwrist rwrist ear'],
  fab: [0.45, 'head ear eye'], trn: [0.45, 'ear head eye'], bio: [0.45, 'head ear chest'], psi: [0.45, 'ear head lwrist'], sen_sch: [0.45, 'eye head ear'], spt: [0.45, 'legs head ear'],
  dodge_ranged: [0.4, 'feet legs lwrist'], evade_close: [0.4, 'legs feet rwrist'], melee_init: [0.4, 'rwrist rarm lhand'], ranged_init: [0.4, 'lwrist rhand eye'],
  nano_init: [0.4, 'ear head lwrist'], aimed_shot: [0.4, 'eye rhand lwrist'], burst: [0.4, 'rhand lhand rwrist'], full_auto: [0.4, 'lhand rhand chest'],
  quick_shot: [0.4, 'lhand rhand eye'], fast_attack: [0.4, 'rarm rwrist larm'], sneak_attack: [0.4, 'larm rarm eye'], brawl: [0.4, 'rarm chest larm'],
  pressure_pt: [0.4, 'larm lhand rarm'], comp_lit: [0.4, 'ear head waist'], nano_resist: [0.4, 'head ear chest'], perception: [0.4, 'eye ear head'], concealment: [0.4, 'eye feet lwrist'],
  maxHp: [2.2, 'chest waist legs'], maxNp: [1.8, 'waist head ear'], hpRegen: [0.012, 'chest legs feet'], npRegen: [0.012, 'waist head feet'], ncu: [0.12, 'waist head ear'],
  runSpeed: [0.005, 'feet legs lwrist'], addDmg: [0.1, 'chest rarm rhand'], critPct: [0.04, 'eye rhand lhand'], nanoCost: [0.05, 'ear head waist'], nanoInit: [0.5, 'head ear eye'],
};
function it_clusterVal(stat, color, ql) { return it_num(ql * CLUSTER_T[stat].k * CLUSTER_MUL[color]); }
function it_bCluster(it, t, ql) {
  it.stat = t.stat; it.socket = t.socket;
  it.mods[t.stat] = Math.max(0.1, it_clusterVal(t.stat, t.socket, ql));
  it.value = Math.round(it_base(ql) * 1.5 * CLUSTER_MUL[t.socket]);
}
function it_bImplant(it, t, ql) {
  it.slot = t.slot; it.slots = [t.slot];
  it.clusters = { shiny: null, bright: null, faded: null };
  it.reqs.treatment = Math.round(ql * 2.4 + 8);          // tuned to the skill caps in 03_stats (a treatment-cheap prof reaches ~270 at L50)
  it.reqs[IT_IMP_ABIL[t.slot]] = Math.round(ql * 1.6 + 6);
  it.value = Math.round(it_base(ql) * 4);
}
function clusterFits(implant, cluster, socket) {
  if (!implant || implant.kind !== 'implant' || !cluster || cluster.kind !== 'cluster') return false;
  const c = CLUSTER_T[cluster.stat];
  return !!c && CLUSTER_COLORS.indexOf(socket) >= 0 && cluster.socket === socket && c.slots[socket].indexOf(implant.slot) >= 0;
}
// Tradeskill-bench insertion. S optional: when given (and nano_prog exists) the cluster's QL must not exceed Nano Programming.
function insertCluster(implant, cluster, socket, S) {
  if (!implant || implant.kind !== 'implant') return { ok: false, msg: 'That is not an implant.' };
  if (!cluster || cluster.kind !== 'cluster') return { ok: false, msg: 'That is not a cluster.' };
  if (CLUSTER_COLORS.indexOf(socket) < 0) return { ok: false, msg: 'No such socket.' };
  if (cluster.socket !== socket) return { ok: false, msg: 'A ' + cluster.socket + ' cluster only fits a ' + cluster.socket + ' socket.' };
  if (!clusterFits(implant, cluster, socket)) return { ok: false, msg: it_statName(cluster.stat) + ' (' + socket + ') cannot be placed in a ' + (IT_IMP_NAME[implant.slot] || implant.slot).toLowerCase() + ' implant.' };
  if (implant.clusters[socket]) return { ok: false, msg: 'The ' + socket + ' socket is already occupied.' };
  if (cluster.ql > implant.ql) return { ok: false, msg: 'The cluster (QL ' + cluster.ql + ') is stronger than the implant (QL ' + implant.ql + ').' };
  if (S && S.nano_prog !== undefined && S.nano_prog < cluster.ql) return { ok: false, msg: 'You need Nano Programming ' + cluster.ql + ' (you have ' + Math.floor(S.nano_prog) + ').' };
  implant.clusters[socket] = cluster;
  return { ok: true, msg: it_statName(cluster.stat) + ' cluster set into the ' + socket + ' socket.' };
}
function removeCluster(implant, socket) {
  const c = implant && implant.clusters && implant.clusters[socket];
  if (c) implant.clusters[socket] = null;
  return c || null;
}
// A ready-made implant with clusters of the implant's own QL; picks = { shiny: statId, bright: statId, faded: statId } (missing -> random valid).
function makeImplant(slot, ql, rng, picks) {
  const im = makeItem('implant_' + slot, ql);
  if (!im) return null;
  rng = it_rng(rng);
  picks = picks || {};
  for (const col of CLUSTER_COLORS) {
    const list = IMPLANT_TABLE[slot][col];
    const stat = picks[col] && list.indexOf(picks[col]) >= 0 ? picks[col] : rng.pick(list);
    insertCluster(im, makeItem('cluster_' + col + '_' + stat, im.ql), col);
  }
  return im;
}

// ---------- nanocrystals ----------
function it_nanoTpl(id) {
  const nid = id.slice(5), n = typeof NANOS !== 'undefined' && NANOS[nid];
  if (!n) return null;
  const lv = Math.max(1, n.lvl || 1);
  return (ITEM_T[id] = { id, name: 'Nanocrystal: ' + n.name, kind: 'nanocrystal', nanoId: nid, slots: [], qlMin: lv, qlMax: lv, vm: 2.2, glyph: '✦', color: '#4fd1c5' });
}
function registerNanoItems() { if (typeof NANOS !== 'undefined') for (const id in NANOS) it_nanoTpl('nano:' + id); }
function it_bNano(it, t, ql) {
  const n = NANOS[t.nanoId];
  it.nano = t.nanoId; it.name = 'Nanocrystal: ' + n.name;
  it.reqs = Object.assign({}, n.reqs || {});
  it.reqs.level = Math.max(1, n.lvl || 1);
  it.prof = n.prof;
  it.value = Math.round(it_base(itemQlForLevel(it.reqs.level)) * 2.2);
  it.icon.color = (typeof NANO_SCHOOLS !== 'undefined' && NANO_SCHOOLS[n.school] && NANO_SCHOOLS[n.school].color) || '#4fd1c5';
}

const IT_BUILD = { weapon: it_bWeapon, armor: it_bArmor, util: it_bUtil, consumable: it_bCons, cluster: it_bCluster, implant: it_bImplant, nanocrystal: it_bNano };

// ---------- template registration ----------
const it_add = (t) => { t.slots = t.slots || []; ITEM_T[t.id] = t; return t; };
(function it_init() {
  for (const w of IT_WEAPONS) {
    const [id, name, skill, lo, hi, o] = w, k = IT_SK[skill];
    it_add(Object.assign({
      id, name, kind: 'weapon', skill, slots: ['rhand'], qlMin: lo, qlMax: hi, dmgType: k.type, specials: k.sp.slice(), twoHand: !!k.th, range: k.range, model: k.model,
      atk: k.atk, dm: k.dm, spread: k.spread, glyph: k.glyph,
    }, o));
  }
  for (const set in IT_ASET) {
    const A = IT_ASET[set];
    for (const key in IT_AW) {
      const noun = IT_ANOUN[A.tier][key];
      const mk = (id, slots) => it_add({ id, name: A.n + ' ' + noun, kind: 'armor', set, slots, qlMin: A.lo, qlMax: A.hi, w: IT_AW[key], ab: A.ab, glyph: A.glyph, faction: A.faction });
      if (set === 'basic') IT_ASLOTS[key].forEach((s) => mk('armor_basic_' + s, [s]));
      else mk(set + '_' + key, IT_ASLOTS[key]);
    }
  }
  ITEM_T.gloves_basic = Object.assign({}, ITEM_T.armor_basic_hands, { id: 'gloves_basic', name: 'Salvage Gloves' });
  for (const [id, name, lo, hi, set, ab] of IT_SHIELDS) {
    const A = IT_ASET[set];
    it_add({ id, name, kind: 'armor', set, slots: ['lhand'], qlMin: lo, qlMax: hi, w: 2.0, ab, glyph: '◙', shield: true });
  }
  for (const [id, name, slots, lo, hi, o] of IT_UTIL) it_add(Object.assign({ id, name, kind: 'util', slots, qlMin: lo, qlMax: hi }, o));
  for (const [id, name, lo, hi, color, useFn, rq, vm] of IT_CONS) it_add({ id, name, kind: 'consumable', qlMin: lo, qlMax: hi, color, useFn, rq, vm, maxStack: 20, glyph: '✚' });
  // clusters: build the stat -> slot tables
  IMPLANT_SLOTS.forEach((s) => { IMPLANT_TABLE[s] = { shiny: [], bright: [], faded: [] }; });
  for (const stat in IT_CLUSTER_DEF) {
    const [k, homes] = IT_CLUSTER_DEF[stat], hs = homes.split(' ');
    CLUSTER_T[stat] = { name: it_statName(stat), k, slots: { shiny: [hs[0]], bright: [hs[1]], faded: [hs[2]] } };
    CLUSTER_COLORS.forEach((col, i) => {
      IMPLANT_TABLE[hs[i]][col].push(stat);
      it_add({ id: 'cluster_' + col + '_' + stat, name: cap1(col) + ' ' + it_statName(stat) + ' Cluster', kind: 'cluster', stat, socket: col, qlMin: 1, qlMax: 200, glyph: '◆', color: IT_CL_COL[col] });
    });
  }
  for (const s of IMPLANT_SLOTS) it_add({ id: 'implant_' + s, name: 'Basic ' + IT_IMP_NAME[s] + ' Implant', kind: 'implant', slot: s, slots: [s], qlMin: 1, qlMax: 200, glyph: '◈' });
  // misc loot, keys
  for (const kind in LOOT_KINDS) LOOT_KINDS[kind] = LOOT_KINDS[kind].map((nm) => {
    const id = 'misc_' + it_slug(nm);
    it_add({ id, name: nm, kind: 'misc', qlMin: 1, qlMax: 200, vm: 0.12, color: '#a6a08c', glyph: '•', maxStack: 50, lootKind: kind });
    return id;
  });
  it_add({ id: 'misc_junk', name: 'Scrap Bundle', kind: 'misc', qlMin: 1, qlMax: 200, vm: 0.1, color: '#a6a08c', glyph: '•', maxStack: 50 });
  for (const [id, name] of IT_KEYS) it_add({ id, name, kind: 'key', qlMin: 1, qlMax: 200, vm: 0, color: '#e8c35a', glyph: '¤', quest: true });
  registerNanoItems();
})();
const IT_BY_KIND = {};
for (const id in ITEM_T) (IT_BY_KIND[ITEM_T[id].kind] = IT_BY_KIND[ITEM_T[id].kind] || []).push(id);
const IT_BY_SKILL = {};
IT_BY_KIND.weapon.forEach((id) => { (IT_BY_SKILL[ITEM_T[id].skill] = IT_BY_SKILL[ITEM_T[id].skill] || []).push(id); });

// ---------- item instances ----------
function makeItem(id, ql, rng) {
  const t = it_tpl(id);
  if (!t) return null;
  ql = clamp(Math.round(ql == null || isNaN(ql) ? t.qlMin : ql), t.qlMin, t.qlMax);
  const it = {
    uid: uid(), t: id, name: t.name, ql, kind: t.kind, slots: (t.slots || []).slice(), reqs: {}, mods: {}, value: 1, stack: 1,
    icon: { glyph: t.glyph || '?', color: t.color || it_tierColor(ql) },
  };
  const b = IT_BUILD[t.kind];
  if (b) b(it, t, ql); else it.value = Math.max(0, Math.round(it_base(ql) * (t.vm == null ? 1 : t.vm)));
  if (t.kind === 'weapon' && t.modK) for (const s in t.modK) { const v = it_num(ql * t.modK[s]); if (v > 0) it.mods[s] = v; }
  if (t.kind === 'key') it.quest = true;
  return it;
}
function itemReqsMet(S, item) {
  const missing = [];
  for (const stat in (item.reqs || {})) {
    const need = item.reqs[stat], have = (S && S[stat]) || 0;
    if (have < need) missing.push({ stat, need, have });
  }
  return { ok: missing.length === 0, missing };
}
function itemMods(item) {
  const m = Object.assign({}, item.mods || {});
  if (item.clusters) for (const col of CLUSTER_COLORS) {
    const c = item.clusters[col];
    if (c && c.mods) for (const s in c.mods) m[s] = (m[s] || 0) + c.mods[s];
  }
  return m;
}
function itemPrice(item, buy) {
  if (!item || item.kind === 'key') return 0;
  let v = item.value || 0;
  if (item.clusters) for (const col of CLUSTER_COLORS) if (item.clusters[col]) v += item.clusters[col].value || 0;
  if (buy) return Math.max(1, Math.round(v));
  return Math.max(1, Math.floor(v * (item.kind === 'misc' ? 0.5 : 0.25)));
}

// ---------- tooltips ----------
function it_fmtMod(s, v) {
  const sign = v < 0 ? '' : '+';
  const suffix = s === 'critPct' || s === 'nanoCost' ? '%' : '';
  return sign + v + suffix + ' ' + it_statName(s).replace(/ %$/, '');
}
function itemDesc(item, S) {
  const L = [], t = ITEM_T[item.t];
  let label = '';
  if (item.kind === 'weapon') label = IT_SK[item.skill].n + (item.twoHand ? ' (two-handed)' : '') + (item.fist ? ' fist weapon' : '');
  else if (item.kind === 'armor') label = item.shield ? 'Shield' : 'Armour - ' + (item.slots.length > 1 ? IT_SLOT_NAME[item.slots[0]].replace(/^Left /, '') : IT_SLOT_NAME[item.slots[0]]);
  else if (item.kind === 'util') label = item.slots[0] === 'deck' ? 'Nano Memory bank' : 'Utility';
  else if (item.kind === 'implant') label = IT_IMP_NAME[item.slot] + ' implant';
  else if (item.kind === 'cluster') label = cap1(item.socket) + ' cluster';
  else if (item.kind === 'nanocrystal') label = 'Nanocrystal';
  else label = cap1(item.kind);
  L.push(item.kind === 'nanocrystal' ? label + ' - level ' + (item.reqs.level || 1) : 'QL ' + item.ql + ' ' + label);
  if (item.kind === 'weapon') {
    L.push('Damage ' + item.dmg[0] + '-' + item.dmg[1] + ' ' + IT_TYPE_NAME[item.dmgType] + (item.fist ? ' (added to unarmed damage)' : ''));
    L.push('Attack ' + item.atk.toFixed(2) + 's, recharge ' + item.rech.toFixed(2) + 's, range ' + item.range + ' m');
    if (item.specials.length) L.push('Specials: ' + item.specials.map((s) => IT_SPECIAL_NAME[s] || s).join(', '));
  } else if (item.kind === 'consumable' && item.use) {
    const u = item.use;
    if (u.heal) L.push('Restores ' + u.heal[0] + '-' + u.heal[1] + ' health');
    if (u.np) L.push('Restores ' + u.np[0] + '-' + u.np[1] + ' nano');
    if (u.buff) L.push('For ' + u.dur + 's: ' + Object.keys(u.buff).map((s) => it_fmtMod(s, u.buff[s])).join(', '));
    L.push('Recharge ' + (u.cd || 15) + 's');
  } else if (item.kind === 'nanocrystal') {
    const n = typeof NANOS !== 'undefined' && NANOS[item.nano];
    if (n) {
      L.push('Teaches ' + n.name + (n.prof && n.prof !== 'any' && typeof PROFS !== 'undefined' && PROFS[n.prof] ? ' (' + PROFS[n.prof].name + ')' : ''));
      if (n.desc) L.push(n.desc);
    }
  } else if (item.kind === 'cluster') {
    L.push('Fits: ' + CLUSTER_T[item.stat].slots[item.socket].map((s) => IT_IMP_NAME[s] + ' implant').join(', '));
  } else if (item.kind === 'implant') {
    for (const col of CLUSTER_COLORS) {
      const c = item.clusters[col];
      L.push(cap1(col) + ': ' + (c ? it_statName(c.stat) + ' ' + it_fmtMod(c.stat, c.mods[c.stat]).split(' ')[0] + ' (QL ' + c.ql + ')' : 'empty'));
    }
  } else if (item.kind === 'misc') L.push('Salvage - sells to any vendor');
  else if (item.kind === 'key') L.push('Mission item');
  if (item.faction) L.push('Faction: ' + (typeof FACTIONS !== 'undefined' && FACTIONS[item.faction] ? FACTIONS[item.faction].name : cap1(item.faction)));
  const rq = Object.keys(item.reqs || {});
  if (rq.length) {
    L.push('Requires: ' + rq.map((s) => {
      const have = S ? Math.floor(S[s] || 0) : null;
      return it_statName(s) + ' ' + item.reqs[s] + (have !== null && have < item.reqs[s] ? ' (you have ' + have + ')' : '');
    }).join(', '));
  }
  const mods = item.kind === 'implant' ? {} : item.mods || {};
  for (const s in mods) L.push(it_fmtMod(s, mods[s]));
  if (item.kind === 'implant') { const m = itemMods(item); for (const s in m) L.push(it_fmtMod(s, it_num(m[s]))); }
  if (item.kind !== 'key') L.push('Value ' + fmtInt(item.value) + ' cr');
  return L;
}

// ---------- loot ----------
function rollCredits(level, rng) {
  rng = it_rng(rng);
  level = Math.max(1, level || 1);
  return Math.max(1, Math.round((6 + level * 4.5) * (1 + level * 0.02) * (0.5 + rng.f())));
}
function it_pickT(rng, ids, ql) {
  const ok = ids.filter((id) => ITEM_T[id].qlMin <= ql && ql <= ITEM_T[id].qlMax);
  if (ok.length) return rng.pick(ok);
  let best = ids[0], bd = 1e9;
  for (const id of ids) { const t = ITEM_T[id], d = ql < t.qlMin ? t.qlMin - ql : ql - t.qlMax; if (d < bd) { bd = d; best = id; } }
  return best;
}
// Mob loot. `src` is a mob template ({ loot: kind|[extra template ids], model, named }) or a kind string. Credits are rolled separately.
function rollLoot(src, level, rng) {
  rng = it_rng(rng);
  level = Math.max(1, level || 1);
  const tpl = src && typeof src === 'object' ? src : null;
  let kind = tpl ? (typeof tpl.loot === 'string' ? tpl.loot : tpl.model || 'humanoid') : String(src || 'humanoid');
  if (!LOOT_KINDS[kind]) kind = 'critter';
  const named = !!(tpl && tpl.named), hum = kind === 'humanoid';
  const ql = itemQlForLevel(level, rng);
  const out = [];
  const add = (id, q) => { const it = makeItem(id, q); if (it) out.push(it); return it; };
  if (rng.chance(named ? 1 : 0.6)) add(rng.pick(LOOT_KINDS[kind]), clamp(Math.round(ql * 0.6), 1, 200));
  if (rng.chance(named ? 0.7 : 0.1)) add(rng.chance(0.6) ? 'health_kit' : 'nano_kit', clamp(Math.round(ql * 0.7), 1, 200));
  const gearN = named ? 2 : rng.chance(hum ? 0.16 : 0.025) ? 1 : 0;
  for (let i = 0; i < gearN; i++) {
    const r = rng.f();
    if (r < 0.5) add(it_pickT(rng, IT_BY_KIND.weapon, ql), ql);
    else if (r < 0.9) {
      const ids = IT_BY_KIND.armor.filter((id) => !ITEM_T[id].shield && ITEM_T[id].set !== 'basic' && (ql >= 70 || !ITEM_T[id].faction));
      const pool = ql <= 30 ? IT_BY_KIND.armor.filter((id) => ITEM_T[id].set === 'basic') : ids;
      add(it_pickT(rng, pool, ql), ql);
    } else add(it_pickT(rng, IT_BY_KIND.util, ql), Math.round(ql * 0.9));
  }
  if (rng.chance(0.03)) add(rng.pick(['stim_bulk', 'stim_reflex', 'stim_focus', 'stim_hardening']), clamp(Math.round(ql * 0.7), 5, 200));
  if (typeof NANOS !== 'undefined' && rng.chance(named ? 0.5 : 0.03)) {
    const ids = Object.keys(NANOS).filter((id) => NANOS[id].lvl <= level + 2 && NANOS[id].lvl >= level - 12);
    if (ids.length) add('nano:' + rng.pick(ids), 1);
  }
  if (level >= 8 && rng.chance(named ? 0.5 : 0.02)) {
    const stats = Object.keys(CLUSTER_T);
    add('cluster_' + rng.pick(CLUSTER_COLORS) + '_' + rng.pick(stats), clamp(Math.round(ql * 0.8), 1, 200));
  }
  if (tpl && Array.isArray(tpl.loot)) for (const id of tpl.loot) if (ITEM_T[id] && rng.chance(0.5)) add(id, ql);
  return out;
}

// ---------- vendors ----------
// kinds: 'weapons' | 'armor' | 'armor:meridian' | 'armor:freehold' | 'implants' | 'general' | 'nanos:<profId>'
function vendorStock(kind, level, rng) {
  level = Math.max(1, level || 1);
  rng = it_rng(rng, 'vendor:' + kind + ':' + level);
  const ql = itemQlForLevel(level), out = [];
  const add = (id, q) => { const it = makeItem(id, q); if (it) out.push(it); };
  const qs = [ql, Math.max(1, Math.round(ql * 0.6))];
  if (kind === 'weapons') {
    for (const sk of IT_SKILLS) {
      const seen = {};
      for (const q of qs) { const id = it_pickT(rng, IT_BY_SKILL[sk], q), key = id + ':' + clamp(q, ITEM_T[id].qlMin, ITEM_T[id].qlMax); if (!seen[key]) { seen[key] = 1; add(id, q); } }
    }
  } else if (kind === 'armor' || kind === 'armor:meridian' || kind === 'armor:freehold') {
    const fac = kind.split(':')[1];
    let sets = fac ? [fac] : ql <= 30 ? ['basic', 'cloth'] : Object.keys(IT_ASET).filter((s) => s !== 'basic' && !IT_ASET[s].faction && IT_ASET[s].lo <= ql);
    if (!sets.length) sets = ['cloth'];
    sets = sets.filter((s) => IT_ASET[s].lo <= Math.max(ql, IT_ASET[s].lo)).slice(-3);
    for (const s of sets) {
      const A = IT_ASET[s];
      for (const key in IT_AW) {
        if (s === 'basic') IT_ASLOTS[key].forEach((sl) => add('armor_basic_' + sl, ql));
        else add(s + '_' + key, clamp(ql, A.lo, A.hi));
      }
    }
    if (ql >= 5) add(it_pickT(rng, IT_SHIELDS.map((x) => x[0]), ql), ql);
  } else if (kind === 'implants') {
    const cap = clamp(Math.round(ql * 1.05 + 8), 10, 125);
    for (const s of IMPLANT_SLOTS) add('implant_' + s, cap);
    for (const s of IMPLANT_SLOTS) { const im = makeImplant(s, Math.max(1, Math.round(cap * 0.8)), rng); if (im) out.push(im); }
    for (const col of CLUSTER_COLORS) for (const stat of Object.keys(CLUSTER_T)) add('cluster_' + col + '_' + stat, Math.max(1, Math.round(cap * 0.8)));
  } else if (kind === 'general') {
    for (const q of qs) { add('health_kit', q); add('nano_kit', q); }
    for (const id of ['stim_bulk', 'stim_reflex', 'stim_focus', 'stim_hardening']) add(id, Math.max(5, Math.round(ql * 0.7)));
    for (const id of IT_BY_KIND.util) if (ITEM_T[id].qlMin <= ql) add(id, Math.round(ql * 0.8));
  } else if (kind.indexOf('nanos:') === 0) {
    const prof = kind.slice(6);
    registerNanoItems();
    if (typeof NANOS !== 'undefined') {
      const ids = Object.keys(NANOS).filter((id) => (NANOS[id].prof === prof || NANOS[id].prof === 'any') && (NANOS[id].lvl || 1) <= level + 5);
      ids.sort((a, b) => NANOS[a].lvl - NANOS[b].lvl || (a < b ? -1 : 1));
      for (const id of ids) add('nano:' + id, 1);
    }
  }
  return out;
}
