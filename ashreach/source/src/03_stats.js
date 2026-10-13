// Ashreach — abilities, skills, breeds, professions, XP/IP tables, caps and costs, newCharacter, computeStats

const MAX_LEVEL = 50;
const ABILITY_IDS = ['str', 'agi', 'sta', 'int', 'sen', 'psy'];
const ABILITY_NAMES = { str: 'Strength', agi: 'Agility', sta: 'Stamina', int: 'Intelligence', sen: 'Sense', psy: 'Psyche' };
const AC_STATS = ['ac_melee', 'ac_proj', 'ac_energy', 'ac_chem', 'ac_rad', 'ac_cold', 'ac_fire', 'ac_poison'];
const DERIVED_STATS = ['maxHp', 'maxNp', 'hpRegen', 'npRegen', 'ncu', 'runSpeed', 'addDmg', 'critPct', 'nanoCost', 'nanoInit'];

const FACTIONS = {
  meridian: { name: 'Meridian', color: '#4f8fd6' },
  freehold: { name: 'Freehold', color: '#d9703a' },
  unaligned: { name: 'Unaligned', color: '#b9b39a' },
};

// ---- skills -------------------------------------------------------------------------------
// Row: 'id|Name|weights'. Weights are integers per ability, normalised to sum 1. Trickle-down = 1/4 of
// the weighted ability sum. NB the ability `sen` (Sense) and the nano school `sen` (Sensory Tuning) share
// an id: the school's *stat* id (S key, mods key, item/nano req key) is `sen_sch`; `sen` in S is the ability.
const st_SKILL_ROWS = [
  ['Body', [
    'body_dev|Body Development|sta6 str4', 'nano_pool|Nano Pool|psy7 int3', 'nano_resist|Nano Resist|psy5 sta3 int2',
    'dodge_ranged|Dodge Ranged|agi7 sen3', 'evade_close|Evade Close Combat|agi6 sta2 sen2', 'duck_exp|Duck Explosives|agi6 sta4']],
  ['Melee', [
    'martial_arts|Martial Arts|agi4 str3 sen3', 'brawl|Brawl|str5 sta3 agi2', 'pressure_pt|Pressure Point|agi4 sen4 str2',
    'riposte|Riposte|agi5 sen5', 'blunt1h|1H Blunt|str5 agi3 sen2', 'edged1h|1H Edged|str4 agi4 sen2', 'piercing|Piercing|agi5 str3 sen2',
    'blunt2h|2H Blunt|str6 sta2 agi2', 'edged2h|2H Edged|str5 agi3 sen2', 'melee_energy|Melee Energy|str4 agi3 int3',
    'parry|Parry|agi4 str3 sen3', 'fast_attack|Fast Attack|agi6 sen4', 'sneak_attack|Sneak Attack|agi5 sen5', 'multi_melee|Multi Melee|agi5 str3 sen2']],
  ['Ranged', [
    'pistol|Pistol|agi5 sen5', 'assault_rifle|Assault Rifle|agi5 sen3 str2', 'rifle|Rifle|agi4 sen6', 'smg|SMG|agi6 sen4',
    'shotgun|Shotgun|agi4 sen3 str3', 'bow|Bow|agi5 str3 sen2', 'heavy_weapons|Heavy Weapons|str5 sen3 agi2', 'grenade|Grenade|str4 agi4 sen2',
    'ranged_energy|Ranged Energy|agi4 sen4 int2', 'quick_shot|Quick Shot|agi6 sen4', 'burst|Burst|agi5 sen3 str2', 'full_auto|Full Auto|str4 agi3 sen3',
    'aimed_shot|Aimed Shot|sen7 agi3', 'multi_ranged|Multi Ranged|agi5 sen5']],
  ['Speed', [
    'melee_init|Melee Initiative|agi7 sen3', 'ranged_init|Ranged Initiative|agi5 sen5', 'phys_init|Physical Initiative|agi7 sta3',
    'nano_init|Nano Initiative|psy6 int4', 'run_speed|Run Speed|agi6 sta4']],
  ['Nanos & Aiding', [
    'fab|Fabrication|int6 psy4', 'trn|Transmutation|int5 psy3 sen2', 'bio|Biomorphics|int5 sta3 psy2', 'psi|Psi Modulation|psy6 int4',
    'sen|Sensory Tuning|sen5 int3 psy2', 'spt|Spacetime|int5 agi3 psy2', 'first_aid|First Aid|int4 agi3 sen3', 'treatment|Treatment|int5 agi3 sen2',
    'nano_prog|Nano Programming|int7 psy3']],
  ['Spying', [
    'perception|Perception|sen7 int3', 'concealment|Concealment|agi5 sen5', 'breaking_entry|Breaking & Entry|agi4 sen3 int3',
    'trap_disarm|Trap Disarming|agi4 int3 sen3']],
  ['Navigation', ['map_nav|Map Navigation|int5 sen5', 'swimming|Swimming|sta5 str3 agi2', 'vehicle_ground|Ground Vehicles|agi5 sen5']],
  ['Trade & Repair', [
    'comp_lit|Computer Literacy|int7 psy3', 'psychology|Psychology|psy6 int4', 'mech_eng|Mechanical Engineering|int5 str3 sen2',
    'elec_eng|Electrical Engineering|int5 sen3 agi2', 'quantum_ft|Quantum Field Theory|int6 sen2 psy2', 'weapon_smt|Weapon Smithing|str4 int3 sen3',
    'pharma_tech|Pharma Tech|int5 sen3 agi2', 'chemistry|Chemistry|int6 sen2 agi2', 'tutoring|Tutoring|int5 psy5']],
];
const SKILLS = {};
const SKILL_CATS = [];
const SKILL_IDS = [];
st_SKILL_ROWS.forEach(([cat, rows]) => {
  const list = [];
  rows.forEach((row) => {
    const [id, name, w] = row.split('|');
    const trickle = {}; let sum = 0;
    w.split(' ').forEach((t) => { const n = +t.slice(3); trickle[t.slice(0, 3)] = n; sum += n; });
    for (const k in trickle) trickle[k] = trickle[k] / sum;
    SKILLS[id] = { id, name, cat, trickle, stat: id === 'sen' ? 'sen_sch' : id };
    list.push(id); SKILL_IDS.push(id);
  });
  SKILL_CATS.push({ id: cat.toLowerCase().replace(/[^a-z]+/g, '_'), name: cat, skills: list });
});
const WEAPON_SKILL_IDS = ['martial_arts', 'blunt1h', 'edged1h', 'piercing', 'blunt2h', 'edged2h', 'melee_energy', 'pistol', 'assault_rifle', 'rifle', 'smg', 'shotgun', 'bow', 'heavy_weapons', 'grenade', 'ranged_energy'];
// Item `specials` ids -> the skill that governs them.
const SPECIAL_SKILL = { quick: 'quick_shot', burst: 'burst', fullauto: 'full_auto', aimed: 'aimed_shot', fast: 'fast_attack', brawl: 'brawl', pressure: 'pressure_pt', backstab: 'sneak_attack' };
// Stat id (key in S / mods / reqs) for a skill id.
function skillStat(id) { return SKILLS[id] ? SKILLS[id].stat : id; }

const STAT_IDS = [].concat(ABILITY_IDS, SKILL_IDS.map(skillStat), DERIVED_STATS, AC_STATS);
const STAT_NAMES = Object.assign({}, ABILITY_NAMES, {
  maxHp: 'Max Health', maxNp: 'Max Nano', hpRegen: 'Health Delta', npRegen: 'Nano Delta', ncu: 'Nano Memory', runSpeed: 'Run Speed (m/s)',
  addDmg: 'Added Damage', critPct: 'Critical Chance %', nanoCost: 'Nano Cost Reduction %', nanoInit: 'Nano Cast Speed',
  ac_melee: 'Melee Armour', ac_proj: 'Projectile Armour', ac_energy: 'Energy Armour', ac_chem: 'Chemical Armour',
  ac_rad: 'Radiation Armour', ac_cold: 'Cold Armour', ac_fire: 'Fire Armour', ac_poison: 'Poison Armour',
});
SKILL_IDS.forEach((id) => { STAT_NAMES[skillStat(id)] = SKILLS[id].name; });

// ---- breeds -------------------------------------------------------------------------------
// base: ability at level 1. cap: ability maximum (total) at level MAX_LEVEL; lower levels scale linearly
// toward it. abilityCost: IP cost factor per ability. HP = hpBase + body_dev*hpMul + level*profHp.
const BREEDS = {
  baseline: {
    name: 'Baseline', desc: 'Unmodified humans. No weaknesses, no extremes: every ability is cheap to raise and the ceilings are even.',
    base: { str: 12, agi: 12, sta: 12, int: 12, sen: 12, psy: 12 }, cap: { str: 230, agi: 230, sta: 230, int: 230, sen: 230, psy: 230 },
    abilityCost: { str: 1.5, agi: 1.5, sta: 1.5, int: 1.5, sen: 1.5, psy: 1.5 },
    hpBase: 60, npBase: 40, hpMul: 6, npMul: 4, nanoCostCap: 50,
  },
  kestrel: {
    name: 'Kestrel', desc: 'Lithe, gene-tuned for the dust. Superb Agility and Sense; frail in Strength and Psyche, so slightly thinner on health and nano.',
    base: { str: 8, agi: 20, sta: 10, int: 12, sen: 18, psy: 8 }, cap: { str: 170, agi: 290, sta: 200, int: 230, sen: 280, psy: 160 },
    abilityCost: { str: 3, agi: 1, sta: 2.2, int: 2, sen: 1.2, psy: 3 },
    hpBase: 60, npBase: 35, hpMul: 5.5, npMul: 3.5, nanoCostCap: 50,
  },
  savant: {
    name: 'Savant', desc: 'Lab-bred thinkers. Towering Intelligence and Psyche and the deepest nano pools; physically frail.',
    base: { str: 6, agi: 10, sta: 8, int: 20, sen: 14, psy: 20 }, cap: { str: 150, agi: 210, sta: 170, int: 290, sen: 250, psy: 290 },
    abilityCost: { str: 3, agi: 2, sta: 2.5, int: 1, sen: 1.5, psy: 1 },
    hpBase: 55, npBase: 60, hpMul: 5, npMul: 6.5, nanoCostCap: 55,
  },
  bulwark: {
    name: 'Bulwark', desc: 'Heavy-labour clones. Immense Strength and Stamina and a huge health pool; poor with nanos and anything delicate.',
    base: { str: 20, agi: 8, sta: 20, int: 8, sen: 10, psy: 8 }, cap: { str: 290, agi: 190, sta: 290, int: 160, sen: 190, psy: 150 },
    abilityCost: { str: 1, agi: 2.5, sta: 1, int: 3, sen: 2.5, psy: 3 },
    hpBase: 80, npBase: 25, hpMul: 8.5, npMul: 2.5, nanoCostCap: 45,
  },
};

// ---- professions --------------------------------------------------------------------------
// Skill cost tiers (1.0 cheapest .. 4.0). Anything not listed uses the generic defaults below.
const st_DEF_COST = (() => {
  const d = {};
  const set = (t, s) => s.split(' ').forEach((i) => { d[i] = t; });
  set(3.5, 'martial_arts brawl pressure_pt riposte blunt1h edged1h piercing blunt2h edged2h melee_energy parry fast_attack sneak_attack pistol assault_rifle rifle smg shotgun bow heavy_weapons grenade ranged_energy quick_shot burst full_auto aimed_shot fab trn bio psi sen spt');
  set(3, 'multi_melee multi_ranged nano_resist treatment psychology mech_eng elec_eng quantum_ft weapon_smt pharma_tech chemistry tutoring nano_prog perception concealment breaking_entry trap_disarm');
  set(2.5, 'nano_pool melee_init ranged_init phys_init nano_init run_speed dodge_ranged evade_close duck_exp first_aid comp_lit map_nav vehicle_ground');
  set(2, 'body_dev swimming');
  return d;
})();
// t: { tier: 'skill skill ...' }, w: weapon skill, s: starting free-ish skill points (bought with starting IP).
function st_prof(o) {
  const skillCost = Object.assign({}, st_DEF_COST);
  for (const t in o.t) o.t[t].split(' ').forEach((s) => { skillCost[s] = +t; });
  const gear = [['armor_basic_chest', 1], ['armor_basic_legs', 1], ['armor_basic_feet', 1], ['gloves_basic', 1], ['health_kit', 1, 3]];
  if (o.npPerLvl >= 8) gear.push(['nano_kit', 1, 3]);
  return {
    name: o.name, desc: o.desc, role: o.role, color: o.color, skillCost, hpPerLvl: o.hp, npPerLvl: o.np, weapon: o.w,
    school: o.school, startSkills: o.s, startItems: o.items.map((i) => [i, 1]).concat(gear), startNanos: o.nanos, tips: o.tips,
  };
}
const PROFS = {
  trooper: st_prof({
    name: 'Trooper', role: 'Ranged DPS / tank', color: '#8aa05a', hp: 14, np: 5, w: 'assault_rifle', school: 'fab',
    desc: 'Disciplined riflemen. Assault rifles, burst and full auto, armour-plating buffs and the best shield-reflect nanos.',
    t: { 1: 'assault_rifle burst full_auto body_dev', 1.2: 'heavy_weapons ranged_init', 1.5: 'grenade quick_shot fab phys_init duck_exp weapon_smt',
      2: 'shotgun rifle multi_ranged dodge_ranged nano_resist mech_eng', 2.5: 'pistol smg ranged_energy' },
    s: { assault_rifle: 12, fab: 12, body_dev: 4 }, items: ['ar_basic'], nanos: ['trooper_reflect_field', 'trooper_rifle_focus', 'trooper_hardened_skin'],
    tips: 'Sturdy and simple: open with Burst, keep Full Auto for long fights, and invest in Body Development. Your reflect field punishes melee mobs.',
  }),
  bruiser: st_prof({
    name: 'Bruiser', role: 'Melee tank', color: '#c0562e', hp: 16, np: 3, w: 'blunt2h', school: 'fab',
    desc: 'Two-handed brawlers built to hold a crowd. Massive health, rage buffs and taunts that drag mobs onto you.',
    t: { 1: 'blunt2h brawl body_dev melee_init', 1.2: 'blunt1h piercing evade_close', 1.5: 'fast_attack riposte phys_init parry', 1.5: 'fab', 2: 'bio multi_melee edged2h melee_energy nano_resist',
      3: 'nano_pool' },
    s: { blunt2h: 12, fab: 12, body_dev: 5 }, items: ['hammer_2h_basic'], nanos: ['bruiser_rage', 'bruiser_taunt', 'bruiser_thick_hide'],
    tips: 'Walk into the pack and Taunt. Raise Body Development and Strength first; your Rage buff is the damage you will live on.',
  }),
  medic: st_prof({
    name: 'Medic', role: 'Healer', color: '#4fc28a', hp: 9, np: 14, w: 'pistol', school: 'bio',
    desc: 'Field surgeons with the strongest heals in the game: instant patches, heals over time and health-pool buffs.',
    t: { 1: 'bio treatment first_aid nano_pool', 1.2: 'pistol pharma_tech', 1.5: 'shotgun comp_lit nano_init nano_resist chemistry', 2: 'quick_shot sen trn body_dev psychology' },
    s: { pistol: 12, bio: 14, nano_pool: 4 }, items: ['pistol_basic'], nanos: ['medic_mend', 'medic_regen_pulse', 'medic_vitality'],
    tips: 'Biomorphics unlocks your heals; raise it early. Keep nano topped by sitting between fights, and heal team-mates before nuking.',
  }),
  mechanist: st_prof({
    name: 'Mechanist', role: 'Pet / buffs', color: '#d1a23c', hp: 10, np: 10, w: 'pistol', school: 'fab',
    desc: 'Tinkerers who field a combat drone, buff armour and shielding, and blind enemies with arc-flashes.',
    t: { 1: 'mech_eng elec_eng fab', 1.2: 'pistol quantum_ft', 1.5: 'weapon_smt shotgun nano_pool nano_init comp_lit trn nano_prog', 1.8: 'body_dev', 2: 'burst' },
    s: { pistol: 12, fab: 14, mech_eng: 4 }, items: ['pistol_basic'], nanos: ['mechanist_ward_plating', 'mechanist_spark_drone', 'mechanist_flash_blind'],
    tips: 'Your drone fights for you: summon it before every pull and buff it. Fabrication and Mechanical Engineering raise its strength.',
  }),
  runner: st_prof({
    name: 'Runner', role: 'Evasive SMG skirmisher', color: '#e0c030', hp: 10, np: 7, w: 'smg', school: 'spt',
    desc: 'Fast, slippery gunners with the Lattice teleport network. SMG full auto, speed nanos and evades.',
    t: { 1: 'smg full_auto run_speed dodge_ranged evade_close spt', 1.2: 'ranged_init phys_init map_nav vehicle_ground', 1.5: 'pistol quick_shot burst sen breaking_entry trap_disarm',
      1.8: 'shotgun perception', 2: 'body_dev concealment' },
    s: { smg: 12, spt: 12, dodge_ranged: 6 }, items: ['smg_basic'], nanos: ['runner_sprint', 'runner_slipstream', 'runner_patch_up'],
    tips: 'Keep moving and kite. Full Auto is your damage; Run Speed and Dodge keep you alive. Unlock the Lattice to skip long walks.',
  }),
  nanoshaper: st_prof({
    name: 'Nanoshaper', role: 'Nuker', color: '#9a6bff', hp: 8, np: 15, w: 'pistol', school: 'fab',
    desc: 'Glass-cannon casters. The largest nukes and damage-over-time programs, with roots and the best nano cost reduction.',
    t: { 1: 'fab trn nano_pool nano_init comp_lit', 1.2: 'nano_prog nano_resist', 1.5: 'pistol spt chemistry quantum_ft', 1.8: 'psi', 2: 'smg first_aid', 2.5: 'bio', 3: 'body_dev' },
    s: { pistol: 12, fab: 14, nano_pool: 6 }, items: ['pistol_basic'], nanos: ['nanoshaper_arc_bolt', 'nanoshaper_corrode', 'nanoshaper_ensnare'],
    tips: 'Root, then nuke, then step back and sit. Your health is low: let something else hold the target, and watch your nano pool.',
  }),
  psion: st_prof({
    name: 'Psion', role: 'Pets / nano buffs', color: '#d96bd0', hp: 8, np: 15, w: 'pistol', school: 'psi',
    desc: 'Mind-shapers who conjure psychic familiars that fight and heal, and who raise their allies\' nano skills.',
    t: { 1: 'psi trn nano_pool nano_init nano_resist psychology', 1.2: 'comp_lit', 1.5: 'pistol fab nano_prog', 1.8: 'shotgun rifle', 2: 'dodge_ranged first_aid sen', 2.5: 'body_dev' },
    s: { pistol: 12, psi: 14, nano_pool: 6 }, items: ['pistol_basic'], nanos: ['psion_mind_familiar', 'psion_focus', 'psion_lash'],
    tips: 'Summon a familiar before each fight and let it work. Psi Modulation gates your best programs; your familiars scale with your level.',
  }),
  martialist: st_prof({
    name: 'Martialist', role: 'Unarmed striker', color: '#e8e0d0', hp: 11, np: 6, w: 'martial_arts', school: 'sen',
    desc: 'Bare-handed duellists. Fast strikes, Brawl and Pressure Point for huge single hits, and self-healing meditation.',
    t: { 1: 'martial_arts brawl fast_attack pressure_pt evade_close melee_init', 1.2: 'parry phys_init', 1.5: 'riposte body_dev sen spt run_speed', 1.8: 'dodge_ranged',
      2: 'nano_pool bio', 2.5: 'multi_melee edged1h blunt1h' },
    s: { martial_arts: 12, sen: 12, body_dev: 5 }, items: ['knuckles_basic'], nanos: ['martialist_inner_focus', 'martialist_second_wind', 'martialist_iron_palm'],
    tips: 'Lead with Pressure Point, follow with Fast Attack and Brawl. Your self-heal keeps you going; watch the recharge timers rather than spamming.',
  }),
  infiltrator: st_prof({
    name: 'Infiltrator', role: 'Sniper / crits', color: '#58606e', hp: 9, np: 6, w: 'rifle', school: 'psi',
    desc: 'Stealthy marksmen. Rifles with Aimed Shot, concealment, and the highest critical chance in the game.',
    t: { 1: 'rifle aimed_shot ranged_init concealment perception breaking_entry trap_disarm', 1.2: 'quick_shot burst sneak_attack sen', 1.5: 'pistol smg bow psi dodge_ranged map_nav',
      1.8: 'evade_close comp_lit', 2: 'body_dev' },
    s: { rifle: 12, psi: 12, aimed_shot: 4 }, items: ['rifle_basic'], nanos: ['infiltrator_shadow_veil', 'infiltrator_steady_aim', 'infiltrator_hamstring'],
    tips: 'Open from range with Aimed Shot, vanish with your veil when threatened. Sense and Agility feed your crit chance.',
  }),
  wayfarer: st_prof({
    name: 'Wayfarer', role: 'Hybrid / morphs', color: '#6aa84f', hp: 11, np: 8, w: 'pistol', school: 'bio',
    desc: 'Frontier hybrids who shift into beast forms, patch themselves up, and outrun everything. Pistols, bows and blades.',
    t: { 1: 'bio bow run_speed map_nav swimming', 1.2: 'pistol edged1h evade_close', 1.5: 'piercing dodge_ranged body_dev first_aid perception sen', 1.8: 'treatment melee_init fast_attack quick_shot',
      2: 'blunt1h nano_pool' },
    s: { pistol: 12, bio: 12, edged1h: 6 }, items: ['pistol_basic', 'blade_1h_basic'], nanos: ['wayfarer_fleet_foot', 'wayfarer_wild_mend', 'wayfarer_beast_form'],
    tips: 'A jack of all trades: shoot to open, change into beast form to brawl, and heal yourself. Your speed lets you pick every fight.',
  }),
  broker: st_prof({
    name: 'Broker', role: 'Drainer / trader', color: '#c9a227', hp: 9, np: 10, w: 'shotgun', school: 'psi',
    desc: 'Shotgun-toting dealers who steal skills and armour off their targets, and who haggle better prices at vendors.',
    t: { 1: 'shotgun psi trn tutoring nano_prog', 1.2: 'comp_lit psychology chemistry pharma_tech weapon_smt mech_eng elec_eng quantum_ft', 1.5: 'pistol', 1.8: 'smg nano_pool nano_resist',
      2: 'blunt1h breaking_entry fab', 2.2: 'body_dev' },
    s: { shotgun: 12, psi: 12, body_dev: 4 }, items: ['shotgun_basic'], nanos: ['broker_siphon', 'broker_erode', 'broker_barrier'],
    tips: 'Siphon a target\'s skills before the first shot, then close in with the shotgun. Tradeskills are cheap; build and sell gear.',
  }),
  executive: st_prof({
    name: 'Executive', role: 'Controller / pets', color: '#a0b4c8', hp: 8, np: 12, w: 'pistol', school: 'psi',
    desc: 'Corporate administrators who calm and root enemies, field a droid assistant, and cut the nano cost of the whole team.',
    t: { 1: 'pistol psi comp_lit psychology', 1.2: 'nano_pool nano_init tutoring', 1.5: 'smg fab nano_resist nano_prog mech_eng sen ranged_init', 2: 'dodge_ranged first_aid trn', 2.2: 'body_dev' },
    s: { pistol: 12, psi: 14, nano_pool: 5 }, items: ['pistol_basic'], nanos: ['executive_hush', 'executive_red_tape', 'executive_ledger_droid'],
    tips: 'Control the room: Hush calms a pack member, Red Tape roots another. Your droid soaks hits while you plink with the pistol.',
  }),
  warden: st_prof({
    name: 'Warden', role: 'Melee tank / auras', color: '#4c78b8', hp: 15, np: 5, w: 'edged2h', school: 'bio',
    desc: 'Armoured sword-bearers who protect their team with auras and mend themselves with every blow.',
    t: { 1: 'edged2h parry riposte body_dev', 1.2: 'edged1h melee_init', 1.5: 'evade_close phys_init bio sen fast_attack nano_resist', 1.8: 'first_aid', 2: 'blunt2h piercing treatment multi_melee nano_pool',
      2.5: 'blunt1h' },
    s: { edged2h: 12, bio: 12, body_dev: 5 }, items: ['blade_2h_basic'], nanos: ['warden_aegis_aura', 'warden_mend_blade', 'warden_bulwark'],
    tips: 'Keep your aura running for the team and let heal-on-hit sustain you. Parry and Riposte turn their attacks against them.',
  }),
  wraith: st_prof({
    name: 'Wraith', role: 'Assassin / life-drain', color: '#6b3d8a', hp: 10, np: 6, w: 'piercing', school: 'sen',
    desc: 'Knife-fighters who strike from stealth, backstab for huge damage and siphon life with every blow.',
    t: { 1: 'piercing sneak_attack concealment melee_init evade_close', 1.2: 'edged1h fast_attack phys_init perception breaking_entry', 1.5: 'riposte sen spt dodge_ranged trap_disarm bio',
      1.8: 'body_dev multi_melee run_speed map_nav', 2: 'nano_pool', 2.5: 'pistol' },
    s: { piercing: 12, sen: 12, concealment: 4 }, items: ['knife_basic'], nanos: ['wraith_shadow_step', 'wraith_leech', 'wraith_venom_edge'],
    tips: 'Vanish, creep up, and Backstab; finish with your life-drain procs. If it goes wrong, shadow-step away rather than trading blows.',
  }),
};

// ---- levels, XP, IP -----------------------------------------------------------------------
function titleLevel(level) { return level >= 50 ? 3 : level >= 15 ? 2 : 1; }
// IP granted on reaching `level` (level 1 = the creation budget).
function ipAtLevel(level) { return level <= 1 ? 70 : [0, 40, 80, 160][titleLevel(level)]; }
function totalIpAtLevel(level) { let s = 0; for (let l = 1; l <= level; l++) s += ipAtLevel(l); return s; }
// XP a same-level mob gives.
function mobXp(level) { return Math.round(8 + 4 * level + 0.22 * level * level); }
// Kills of same-level mobs to clear a level: 6 at level 1, ~20 by level 10, ~60 at the top.
function xpToNext(level) {
  if (level >= MAX_LEVEL) return Infinity;
  const kills = level < 10 ? 6 + 1.6 * (level - 1) : 20 + 40 * ((level - 10) / (MAX_LEVEL - 11));
  return Math.round(kills * mobXp(level));
}

// ---- caps and costs -----------------------------------------------------------------------
function st_rate(tier) { return tier < 1.5 ? 5 : tier < 2.5 ? 4 : tier < 3.5 ? 3.5 : 3; }
function skillTier(char, id) { return PROFS[char.prof].skillCost[id] || 3.5; }
// Max raised (IP-bought) points; the 5 base points, trickle-down and mods sit on top.
function skillCap(char, id) { return Math.floor(st_rate(skillTier(char, id)) * char.level) + 10; }
function skillIpCost(char, id) { return Math.ceil(skillTier(char, id) * (1 + (char.skill[id] || 0) / 40)); }
function abilityCap(char, ab) {
  const b = BREEDS[char.breed];
  const total = b.base[ab] + (b.cap[ab] - b.base[ab]) * (0.08 + 0.92 * (char.level - 1) / (MAX_LEVEL - 1));
  return Math.max(0, Math.round(total - b.base[ab]));
}
function abilityIpCost(char, ab) { return Math.ceil(BREEDS[char.breed].abilityCost[ab] * (1 + (char.abil[ab] || 0) / 30)); }

function raiseAbility(char, ab) {
  if (!BREEDS[char.breed].base.hasOwnProperty(ab)) return false;
  const cost = abilityIpCost(char, ab);
  if ((char.abil[ab] || 0) >= abilityCap(char, ab) || char.ip < cost) return false;
  char.ip -= cost; char.abil[ab] = (char.abil[ab] || 0) + 1; return true;
}
function lowerAbility(char, ab) {
  const n = char.abil[ab] || 0;
  if (n <= 0) return false;
  char.abil[ab] = n - 1; char.ip += abilityIpCost(char, ab); return true;
}
function raiseSkill(char, id) {
  if (!SKILLS[id]) return false;
  const cost = skillIpCost(char, id);
  if ((char.skill[id] || 0) >= skillCap(char, id) || char.ip < cost) return false;
  char.ip -= cost; char.skill[id] = (char.skill[id] || 0) + 1; return true;
}
function lowerSkill(char, id) {
  const n = char.skill[id] || 0;
  if (n <= 0) return false;
  char.skill[id] = n - 1; char.ip += skillIpCost(char, id); return true;
}
// Refund everything and re-buy the profession's starter package.
function respec(char) {
  ABILITY_IDS.forEach((a) => { char.abil[a] = 0; });
  SKILL_IDS.forEach((s) => { char.skill[s] = 0; });
  char.ip = totalIpAtLevel(char.level);
  st_starterBuy(char);
}
function st_starterBuy(char) {
  const plan = PROFS[char.prof].startSkills;
  for (const id in plan) while ((char.skill[id] || 0) < plan[id] && raiseSkill(char, id));
}

// Apply one level of progress (combat calls this when xp >= xpToNext). Does not touch xp.
function levelUp(char) {
  if (char.level >= MAX_LEVEL) return false;
  char.level++; char.ip += ipAtLevel(char.level); return true;
}
// Add XP, levelling as needed. Returns the number of levels gained. `xp` is progress within the level.
function addXp(char, amt) {
  let gained = 0;
  char.xp += amt;
  while (char.level < MAX_LEVEL && char.xp >= xpToNext(char.level)) { char.xp -= xpToNext(char.level); levelUp(char); gained++; }
  if (char.level >= MAX_LEVEL) char.xp = 0;
  return gained;
}

// ---- characters ---------------------------------------------------------------------------
const ST_EQUIP_SLOTS = ['rhand', 'lhand', 'head', 'back', 'lshoulder', 'rshoulder', 'chest', 'larm', 'rarm', 'lwrist', 'rwrist', 'hands', 'legs', 'feet', 'util1', 'util2', 'util3', 'deck'];
const ST_IMPLANT_SLOTS = ['eye', 'head', 'ear', 'rarm', 'chest', 'larm', 'rwrist', 'waist', 'lwrist', 'rhand', 'legs', 'lhand', 'feet'];
function newCharacter(o) {
  o = o || {};
  const breed = BREEDS[o.breed] ? o.breed : 'baseline', prof = PROFS[o.prof] ? o.prof : 'trooper';
  const look = Object.assign({ skin: 0xc89a76, hair: 0x3a2a1c, hairStyle: 0, height: 1, primary: 0x4a6fa5, secondary: 0x2b2f38 }, o.look || {});
  const ch = {
    name: o.name || 'Newcomer', breed, prof, faction: FACTIONS[o.faction] ? o.faction : 'unaligned', sex: o.sex === 'f' ? 'f' : 'm', look,
    level: 1, xp: 0, ip: ipAtLevel(1), abil: {}, skill: {}, equip: {}, implants: {}, inv: [], bank: [], credits: 500,
    nanos: PROFS[prof].startNanos.slice(), hotbar: new Array(20).fill(null), missions: [], flags: {},
  };
  ABILITY_IDS.forEach((a) => { ch.abil[a] = 0; });
  SKILL_IDS.forEach((s) => { ch.skill[s] = 0; });
  ST_EQUIP_SLOTS.forEach((s) => { ch.equip[s] = null; });
  ST_IMPLANT_SLOTS.forEach((s) => { ch.implants[s] = null; });
  st_starterBuy(ch);
  // Starting kit: weapons/armour are worn, the rest goes to the pack (skipped if the item db has no such template).
  if (typeof makeItem === 'function' && typeof ITEM_T !== 'undefined') {
    PROFS[prof].startItems.forEach(([tid, ql, n]) => {
      if (!ITEM_T[tid]) return;
      const it = makeItem(tid, ql);
      if (n > 1) it.stack = n;
      const slot = (it.kind === 'weapon' || it.kind === 'armor') && (it.slots || []).find((s) => ch.equip[s] === null);
      if (slot) ch.equip[slot] = it; else ch.inv.push(it);
    });
  }
  return ch;
}

// mods: summed { statId: number } from equipment, implants and buffs. S has every stat id (0 if none).
function computeStats(char, mods) {
  mods = mods || {};
  const br = BREEDS[char.breed], pf = PROFS[char.prof], S = {};
  const M = (k) => mods[k] || 0;
  ABILITY_IDS.forEach((a) => { S[a] = Math.max(0, br.base[a] + (char.abil[a] || 0) + M(a)); });
  SKILL_IDS.forEach((id) => {
    const sk = SKILLS[id]; let sum = 0;
    for (const a in sk.trickle) sum += sk.trickle[a] * S[a];
    S[sk.stat] = Math.max(0, 5 + (char.skill[id] || 0) + Math.floor(sum / 4) + M(sk.stat));
  });
  S.maxHp = Math.max(1, Math.round(br.hpBase + S.body_dev * br.hpMul + char.level * pf.hpPerLvl + M('maxHp')));
  S.maxNp = Math.max(0, Math.round(br.npBase + S.nano_pool * br.npMul + char.level * pf.npPerLvl + M('maxNp')));
  S.hpRegen = Math.max(0, +(0.4 + S.maxHp * 0.002 + S.sta * 0.01 + M('hpRegen')).toFixed(2));
  S.npRegen = Math.max(0, +(0.3 + S.maxNp * 0.002 + S.psy * 0.008 + M('npRegen')).toFixed(2));
  S.ncu = Math.max(0, Math.round(30 + char.level + S.comp_lit * 0.25 + M('ncu')));
  S.runSpeed = clamp(+(5 + S.run_speed / 200 + M('runSpeed')).toFixed(2), 1.5, 11);
  S.addDmg = M('addDmg');
  S.critPct = Math.max(0, +(2 + S.sen / 60 + M('critPct')).toFixed(1));
  S.nanoCost = Math.min(br.nanoCostCap, M('nanoCost'));
  S.nanoInit = S.nano_init + M('nanoInit');
  AC_STATS.forEach((k) => { S[k] = M(k); });
  S.level = char.level; // convenience for level requirements
  for (const k in mods) if (!(k in S)) S[k] = mods[k]; // pass unknown mods through
  return S;
}
