// Ashreach — mob templates (MOB_T) and level scaling (mobStats)
//
// COMBAT ASSUMPTIONS (the combat code in 13_combat.js should match these; everything below is tuned against them)
//   hit chance      hit% = clamp(0.5 + (ar - dr) / (2 * max(ar, dr, 1)), 0.06, 0.95)
//   mitigation      dmg *= 1 - min(0.75, ac / (ac + 60 + 12 * attackerLevel))      (ac of the matching damage type)
//   reference PLAYER at level L with level-appropriate gear:
//       AR = 5 + 5.5 L        defence = 0.8 * AR        AC (melee/proj) = 4.5 L + 10
//       HP = 60 + 55 L        damage/hit = 8 + 2.2 L at a 1.8 s cycle (specials/crits/nano boosts ~ x1.5 on top)
//   reference MOB at level L (hpMul = dmgMul = acMul = 1): ar = 5 + 5.5 L, dr = 0.7 * (5 + 5.5 L), ac = 4.5 L + 10 (melee/proj)
//   => a same-level player kills a normal mob in ~11 s (8-15 s depending on hpMul) and loses ~33% HP doing it.
//   Named/boss mobs have large hpMul and are meant for teams. Mob damage per hit is [0.8, 1.2] x average.
//
// MOB_T fields: name, model (makeCreature kind or 'humanoid'), scale, colors [hex x3], lvl [min,max], arch ('melee'|'ranged'|'caster'),
//   dmgType, aggro (0 = passive: only fights back; else aggro radius hint in m), social (call-for-help radius, 0 = none), speed (x base 5 m/s),
//   hpMul/dmgMul/acMul (optional arMul/drMul, acProf {type: x} per-damage-type armour multipliers), atk (s), range (m),
//   abilities [MOB_ABILITIES ids], adds (mob id for summon_adds), loot (05_items loot kind or null), named, xpMul.
//   Extra: anyLvl (mission mobs, spawn at the mission level), friendly (never hostile to the player; guards).

const md_TTK = 11;            // seconds for a same-level player to kill a hpMul-1 mob
const md_MIT = 0.22;          // typical armour mitigation both ways
const md_HITP = 0.65;         // player hit chance vs a mob (mob dr = 0.7 ar)
const md_HITM = 0.6;          // mob hit chance vs a player (player defence = 0.8 ar)
const md_SPECIAL = 1.5;       // player specials / crits / nano multiplier on top of auto-attack
const md_KILL_FRAC = 0.33;    // fraction of the player's HP lost in a TTK-length fight
function md_playerHit(L) { return 8 + 2.2 * L; }
function md_playerHp(L) { return 60 + 55 * L; }
function md_playerDps(L) { return md_HITP * md_playerHit(L) / 1.8 * md_SPECIAL * (1 - md_MIT); }

const MOB_T = {};
function md_add(id, name, model, scale, colors, lvl, arch, dmgType, o) {
  MOB_T[id] = Object.assign({
    id, name, model, scale, colors, lvl, arch, dmgType, aggro: 16, social: 0, speed: 1, hpMul: 1, dmgMul: 1, acMul: 1, atk: 2,
    range: arch === 'melee' ? 2.6 : arch === 'ranged' ? 22 : 24, abilities: [], loot: model, named: false, xpMul: 1,
  }, o);
}
// id, name, model, scale, colors, lvl, arch, dmgType, overrides
md_add('chitterling', 'Chitterling', 'critter', 0.7, [0xb88a5a, 0x6e4b2c, 0xf0d9a8], [1, 4], 'melee', 'melee',
  { aggro: 0, speed: 1.0, hpMul: 0.8, dmgMul: 0.75, atk: 2.0, range: 1.8, xpMul: 0.9 });
md_add('dust_scuttler', 'Dust Scuttler', 'insect', 0.8, [0xc9a26b, 0x7a5a34, 0x3c2c1c], [2, 6], 'melee', 'melee',
  { aggro: 10, speed: 1.1, hpMul: 0.85, dmgMul: 0.9, acMul: 1.2, atk: 1.6, range: 1.8 });
md_add('rust_hound', 'Rust Hound', 'beast', 0.95, [0x9a5a3a, 0x5b3624, 0xd9a066], [4, 8], 'melee', 'melee',
  { aggro: 16, social: 14, speed: 1.25, dmgMul: 0.85, atk: 1.8, abilities: ['enrage'] });
md_add('scav_drone', 'Scavenger Drone', 'drone', 0.8, [0x6d7580, 0x3a4048, 0xff8a2a], [5, 9], 'ranged', 'energy',
  { aggro: 18, speed: 0.9, hpMul: 0.9, dmgMul: 0.85, acMul: 1.2, atk: 2.4, range: 20, acProf: { energy: 1.3, chem: 1.2 } });
md_add('smuggler', 'Smuggler', 'humanoid', 1.0, [0x5a4a3a, 0x2b2f3a, 0xc8a050], [6, 10], 'ranged', 'proj',
  { aggro: 16, social: 12, dmgMul: 0.85, atk: 2.2, abilities: ['heal_self'] });
md_add('smuggler_boss', 'Captain Varro', 'humanoid', 1.15, [0x7a2a22, 0x1d1f27, 0xe0b040], [11, 11], 'ranged', 'proj',
  { aggro: 20, social: 16, hpMul: 10, dmgMul: 1.1, acMul: 1.3, atk: 2.0, range: 24, abilities: ['heal_self', 'summon_adds', 'enrage'], adds: 'smuggler',
    loot: 'humanoid', named: true, xpMul: 5 });
md_add('sand_wyrm', 'Sand Wyrm', 'worm', 1.5, [0xd2b070, 0x8a6a38, 0x4a3a22], [8, 14], 'melee', 'melee',
  { aggro: 10, speed: 0.9, hpMul: 1.15, dmgMul: 0.85, acMul: 1.2, atk: 2.4, range: 3.0, abilities: ['stomp'] });
md_add('dune_strider', 'Dune Strider', 'beast', 1.6, [0xbfa57a, 0x8a7552, 0xe8dcc0], [10, 16], 'melee', 'melee',
  { aggro: 0, speed: 1.2, hpMul: 1.1, dmgMul: 0.9, atk: 2.2, range: 2.8 });
md_add('scorpod', 'Scorpod', 'insect', 1.1, [0x6a3a28, 0x2c1a14, 0xd6a43a], [12, 18], 'melee', 'melee',
  { aggro: 14, speed: 1.1, hpMul: 0.95, dmgMul: 0.75, atk: 1.8, abilities: ['poison_bite'], acProf: { poison: 1.5 } });
md_add('rogue_drone', 'Rogue Drone', 'drone', 0.9, [0x8a4a4a, 0x3a2a2a, 0xff3a3a], [14, 20], 'ranged', 'energy',
  { aggro: 20, social: 10, speed: 0.95, hpMul: 0.9, dmgMul: 0.75, acMul: 1.2, atk: 2.2, abilities: ['nuke_energy'], acProf: { energy: 1.3 } });
md_add('dust_raider', 'Dust Raider', 'humanoid', 1.0, [0xa88a5a, 0x4a3a2a, 0xb03a2a], [15, 20], 'ranged', 'proj',
  { aggro: 18, social: 16, dmgMul: 0.8, atk: 2.2, abilities: ['heal_self', 'snare'] });
md_add('mire_lurker', 'Mire Lurker', 'mutant', 1.2, [0x4a6a4a, 0x2a3a2a, 0xa8c070], [15, 22], 'melee', 'melee',
  { aggro: 12, speed: 0.9, hpMul: 1.1, dmgMul: 0.85, atk: 2.4, abilities: ['root'], acProf: { poison: 1.4, chem: 1.3 } });
md_add('spore_beetle', 'Spore Beetle', 'insect', 1.3, [0x6a8a3a, 0x3a4a22, 0xd6e070], [18, 25], 'melee', 'chem',
  { aggro: 12, speed: 0.85, hpMul: 1.05, dmgMul: 0.8, acMul: 1.3, atk: 2.2, abilities: ['spore_cloud'], acProf: { chem: 1.5, poison: 1.5 } });
md_add('thornback', 'Thornback', 'beast', 1.5, [0x5a6a4a, 0x3a3a2a, 0xc0a050], [20, 28], 'melee', 'melee',
  { aggro: 12, speed: 1.0, hpMul: 1.15, dmgMul: 0.85, acMul: 1.2, atk: 2.4, abilities: ['enrage'] });
md_add('feral_mutant', 'Feral Mutant', 'mutant', 1.15, [0x8a6a5a, 0x4a3030, 0xc04a3a], [22, 30], 'melee', 'melee',
  { aggro: 20, social: 8, speed: 1.15, dmgMul: 0.9, atk: 1.8, abilities: ['enrage'] });
md_add('lumen_cultist', 'Lumen Cultist', 'humanoid', 1.0, [0x5a2a8a, 0x1e1230, 0x6af0ff], [24, 30], 'caster', 'energy',
  { aggro: 18, social: 18, hpMul: 0.85, dmgMul: 0.7, atk: 2.6, range: 24, abilities: ['nuke_energy', 'heal_ally', 'heal_self'] });
md_add('mesa_stalker', 'Mesa Stalker', 'beast', 1.2, [0xa8502a, 0x5a2a18, 0xe8b070], [25, 32], 'melee', 'melee',
  { aggro: 22, speed: 1.3, hpMul: 0.95, dmgMul: 0.85, atk: 1.7, abilities: ['snare'] });
md_add('canyon_raider', 'Canyon Raider', 'humanoid', 1.05, [0x8a5a3a, 0x3a3028, 0xd8c060], [28, 36], 'ranged', 'proj',
  { aggro: 18, social: 16, dmgMul: 0.8, atk: 2.2, range: 24, abilities: ['snare', 'heal_self'] });
md_add('rock_golem', 'Rock Golem', 'golem', 1.7, [0x8a7a6a, 0x4a423a, 0xe0a040], [30, 38], 'melee', 'melee',
  { aggro: 10, speed: 0.55, hpMul: 0.7, dmgMul: 1.0, acMul: 2.0, atk: 3.0, range: 3.2, abilities: ['stomp'], acProf: { energy: 0.6, chem: 1.3, rad: 1.5 } });
md_add('hover_sentry', 'Hover Sentry', 'drone', 1.1, [0x7a8aa0, 0x2c3440, 0x40d0ff], [32, 40], 'ranged', 'energy',
  { aggro: 22, speed: 0.9, hpMul: 0.85, dmgMul: 0.75, acMul: 1.4, atk: 2.0, range: 26, abilities: ['nuke_energy'], acProf: { energy: 1.4 } });
md_add('brute_mutant', 'Brute Mutant', 'mutant', 1.6, [0x7a8a5a, 0x3a4a30, 0xc0705a], [34, 40], 'melee', 'melee',
  { aggro: 16, hpMul: 1.25, dmgMul: 0.85, atk: 2.8, range: 3.0, abilities: ['stomp', 'enrage'] });
md_add('foundry_bot', 'Foundry Bot', 'drone', 1.0, [0x9a8a70, 0x3a342c, 0xff7a20], [30, 38], 'ranged', 'proj',
  { aggro: 22, social: 14, speed: 0.9, hpMul: 0.9, dmgMul: 0.8, acMul: 1.5, atk: 2.2, abilities: ['snare'], acProf: { fire: 1.5 } });
md_add('foundry_tech', 'Foundry Technician', 'humanoid', 1.0, [0xd8a030, 0x3a3a42, 0xff5a20], [32, 40], 'caster', 'fire',
  { aggro: 20, social: 16, hpMul: 0.85, dmgMul: 0.7, atk: 2.6, range: 24, abilities: ['nuke_fire', 'heal_ally', 'root'] });
md_add('slag_golem', 'Slag Golem', 'golem', 1.9, [0x4a3a38, 0x2a1e1c, 0xff6a1a], [34, 42], 'melee', 'fire',
  { aggro: 12, speed: 0.55, hpMul: 0.75, dmgMul: 0.9, acMul: 1.8, atk: 3.0, range: 3.4, abilities: ['stomp', 'nuke_fire'], acProf: { fire: 2.5, cold: 0.5 } });
md_add('overseer', 'Overseer Kal-9', 'golem', 2.4, [0x6a6e78, 0x2a2e38, 0xff4a2a], [46, 46], 'melee', 'melee',
  { aggro: 24, social: 20, speed: 0.8, hpMul: 28, dmgMul: 1.2, acMul: 1.6, atk: 2.6, range: 4.0, abilities: ['stomp', 'enrage', 'summon_adds', 'nuke_fire'],
    adds: 'foundry_bot', loot: 'golem', named: true, xpMul: 7 });
md_add('lumen_wisp', 'Lumen Wisp', 'wisp', 0.9, [0x70e8ff, 0x2a8ab0, 0xffffff], [36, 44], 'caster', 'energy',
  { aggro: 20, hpMul: 0.8, dmgMul: 0.7, atk: 2.2, abilities: ['nuke_energy', 'snare'], acProf: { energy: 2.0 } });
md_add('scar_worm', 'Scar Worm', 'worm', 2.0, [0x8a5ad0, 0x3a2a5a, 0x70f0ff], [40, 48], 'melee', 'melee',
  { aggro: 12, speed: 0.95, hpMul: 1.25, dmgMul: 0.85, acMul: 1.2, atk: 2.6, range: 3.4, abilities: ['stomp', 'poison_bite'] });
md_add('deserter', 'Meridian Deserter', 'humanoid', 1.05, [0x4a5a4a, 0x2a2e2a, 0x7ac0e0], [40, 48], 'ranged', 'proj',
  { aggro: 22, social: 18, dmgMul: 0.8, atk: 2.0, range: 26, abilities: ['heal_self', 'snare'] });
md_add('scar_titan', 'Scar Titan', 'mutant', 2.4, [0x6a7a9a, 0x30384a, 0x80f0ff], [45, 50], 'melee', 'melee',
  { aggro: 24, hpMul: 14, dmgMul: 1.2, acMul: 1.4, atk: 2.8, range: 3.8, abilities: ['stomp', 'enrage'], named: true, xpMul: 5 });
md_add('colossus', 'The Scar Colossus', 'golem', 4.0, [0x8a7ab0, 0x2a2440, 0x80f0ff], [55, 55], 'melee', 'melee',
  { aggro: 28, social: 30, speed: 0.7, hpMul: 60, dmgMul: 1.2, acMul: 1.8, atk: 3.4, range: 6.0, abilities: ['stomp', 'enrage', 'nuke_energy', 'summon_adds'],
    adds: 'lumen_wisp', named: true, xpMul: 10 });
md_add('merc', 'Mercenary', 'humanoid', 1.0, [0x4a5a6a, 0x22262c, 0xd04a3a], [1, 50], 'ranged', 'proj',
  { aggro: 20, social: 12, dmgMul: 0.8, atk: 2.2, abilities: ['heal_self'], anyLvl: true });
md_add('security_bot', 'Security Bot', 'drone', 1.0, [0xc8ccd4, 0x3a3e48, 0x3a8aff], [1, 50], 'ranged', 'proj',
  { aggro: 24, social: 14, speed: 0.9, hpMul: 0.9, dmgMul: 0.8, acMul: 1.3, atk: 2.2, abilities: ['nuke_energy'], anyLvl: true });
md_add('lab_horror', 'Lab Horror', 'mutant', 1.3, [0xb0a0b0, 0x5a3a5a, 0x70ff70], [1, 50], 'melee', 'chem',
  { aggro: 16, hpMul: 1.1, dmgMul: 0.8, atk: 2.2, abilities: ['poison_bite', 'enrage'], anyLvl: true });
md_add('guard', 'Concord Guard', 'humanoid', 1.05, [0x3a5a8a, 0x1c2230, 0xe0e8f0], [60, 60], 'ranged', 'energy',
  { aggro: 0, hpMul: 20, dmgMul: 2, acMul: 2, atk: 1.8, range: 26, loot: null, xpMul: 0, friendly: true });

const MD_AC_TYPES = ['melee', 'proj', 'energy', 'chem', 'rad', 'cold', 'fire', 'poison'];
// Armour is strongest against melee/projectile; other types default to 70% of that.
const MD_AC_BASE = { melee: 1, proj: 1, energy: 0.7, chem: 0.7, rad: 0.7, cold: 0.7, fire: 0.7, poison: 0.7 };

// Works for PETS entries too (same field names). Level is clamped to >= 1.
function mobStats(tpl, level) {
  const L = Math.max(1, Math.round(level));
  const g = (v, d) => (v === undefined || v === null ? d : v);
  const hpMul = g(tpl.hpMul, 1), dmgMul = g(tpl.dmgMul, 1), acMul = g(tpl.acMul, 1), atk = g(tpl.atk, 2);
  const baseAr = 5 + 5.5 * L;
  const caster = tpl.arch === 'caster';
  const maxHp = Math.max(8, Math.round(md_TTK * md_playerDps(L) * hpMul));
  const mobDps = md_KILL_FRAC * md_playerHp(L) / md_TTK;
  const avg = mobDps * atk / (md_HITM * (1 - md_MIT)) * dmgMul;
  const ac = {};
  const prof = tpl.acProf || {};
  for (const t of MD_AC_TYPES) ac[t] = Math.round((4.5 * L + 10) * acMul * MD_AC_BASE[t] * g(prof[t], 1));
  const xp = typeof mobXp === 'function' ? mobXp(L) : Math.round(8 + 4 * L + 0.22 * L * L);
  return {
    maxHp,
    maxNp: Math.round((60 + 25 * L) * (caster ? 2 : 0.5)),
    ar: Math.round(baseAr * g(tpl.arMul, 1)),
    dr: Math.round(0.7 * baseAr * g(tpl.drMul, 1)),
    dmg: [Math.max(1, Math.round(avg * 0.8)), Math.max(1, Math.round(avg * 1.2))],
    atk,
    ac,
    runSpeed: +(5 * g(tpl.speed, 1)).toFixed(2),
    xp: Math.round(xp * g(tpl.xpMul, 1)),
  };
}
// Resolve a MOB_ABILITIES def (relative amounts, `rel: true`) into absolute fx for a caster with mobStats `M`
// and a given target maxHp: dmg/dot amt x average basic hit, heal/hot amt x target maxHp. Other defs pass through.
function mobAbilityFx(ab, M, targetMaxHp) {
  if (!ab.rel) return ab.fx;
  const avg = (M.dmg[0] + M.dmg[1]) / 2;
  return ab.fx.map((f) => {
    if (f.t === 'dmg' || f.t === 'dot') return Object.assign({}, f, { amt: [Math.max(1, Math.round(f.amt[0] * avg)), Math.max(1, Math.round(f.amt[1] * avg))] });
    if (f.t === 'heal' || f.t === 'hot') return Object.assign({}, f, { amt: [Math.round(f.amt[0] * targetMaxHp), Math.round(f.amt[1] * targetMaxHp)] });
    return f;
  });
}
