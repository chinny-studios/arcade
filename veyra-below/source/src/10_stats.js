// Veyra Below — characters: creation, derived stats, experience and levels

function newCharacter(name, role, race, look) {
  const c = {
    v: 1, name, role, race, sid: signFor(name).id, look,
    level: 1, xp: 0, credits: 300, mats: { hp: 0, tp: 0, atp: 0, dfp: 0, mst: 0, ata: 0, evp: 0, lck: 0 }, matTotal: 0,
    skills: {}, skillPts: 1, techs: {},
    equip: { weapon: null, frame: null, barrier: null, unit1: null, unit2: null },
    inv: [], bank: { items: [], credits: 0 },
    sprite: { form: 'sprite', def: 5, pow: 0, dex: 0, mind: 0, syn: 20, iq: 0, pbs: [], pbSel: 0, feedT: 0, pbCharge: 0 },
    hotbar: [null, null, null, null, null, null],
    prog: { diff: 0, maxDiff: 0, bosses: [{}, {}, {}, {}], way: [{}, {}, {}, {}], story: 0, capsules: {}, seenIntro: false },
    quest: { active: null, offers: [], done: 0 },
    allies: [], playTime: 0, stats: { kills: 0, deaths: 0, rares: 0, bosses: 0 }, created: Date.now(),
  };
  const rng = RNG(name + role + race);
  c.equip.weapon = makeEquip('weapon', 1, 0, rng, { base: ROLES[role].start }); c.equip.weapon.attrs = {};
  c.equip.frame = makeEquip('frame', 1, 0, rng); c.equip.frame.sockets = 0;
  invAdd(c.inv, makeTool('medgel1', 5)); invAdd(c.inv, makeTool('psicell1', role === 'psion' ? 5 : 3)); invAdd(c.inv, makeTool('beacon', 1));
  if (role === 'psion') { c.techs.ember = 1; c.techs.jolt = 1; if (race !== 'construct') c.techs.mend = 1; else c.techs.frostlance = 1; }
  if (role === 'psion') c.hotbar = [{ t: 'tech', id: 'ember' }, { t: 'tech', id: 'jolt' }, { t: 'tech', id: race !== 'construct' ? 'mend' : 'frostlance' }, null, { t: 'item', id: 'medgel1' }, { t: 'item', id: 'psicell1' }];
  else c.hotbar = [null, null, null, null, { t: 'item', id: 'medgel1' }, { t: 'item', id: 'psicell1' }];
  if (race === 'construct') c.hotbar[3] = { t: 'skill', id: 'trapburst' };
  return c;
}

const RES_KEYS = { fire: 'resFire', ice: 'resIce', bolt: 'resBolt', light: 'resLight', dark: 'resDark' };
// Everything derived from class, race, level, materials, equipment, sprite and passive skills.
function computeStats(c) {
  const role = ROLES[c.role], race = RACES[c.race];
  const S = { hpPct: 0, tpPct: 0, dfpPct: 0, dmgPct: 0, techPct: 0, meleePct: 0, rangedPct: 0, atkSpd: 0, moveSpd: 0, critCh: 0, critDmg: 0, leech: 0, tpLeech: 0, mf: 0, gf: 0,
    hpRegen: 0, tpRegen: 0, thorns: 0, resFire: 0, resIce: 0, resBolt: 0, resLight: 0, resDark: 0, resAll: 0, pbGain: 0, dmgReduce: 0, fireDmg: 0, iceDmg: 0, boltDmg: 0, xpPct: 0, tpCost: 0, cdr: 0,
    meleeLeech: 0, justBonus: 0, techCrit: 0, techCritDmg: 0, tpRegenPct: 0, chain: 0, rollDmg: 0, rollCd: 0, overchargeTp: 0, lastStand: 0, lowHpReduce: 0 };
  for (const k of STAT_KEYS) S[k] = (role.base[k] + role.grow[k] * (c.level - 1)) * race.mods[k] + (c.mats[k] || 0);
  // equipment
  const sets = {};
  for (const slot of EQUIP_SLOTS) {
    const it = c.equip[slot]; if (!it || it.unid) continue;
    if (reqLevel(it) > c.level) continue;
    const st = itemStats(it);
    for (const [k, v] of Object.entries(st)) S[k] = (S[k] || 0) + v;
    if (it.set) sets[it.set] = (sets[it.set] || 0) + 1;
  }
  for (const [sid, n] of Object.entries(sets)) for (const [need, b] of Object.entries(SETS[sid].bonus)) if (n >= +need) for (const [k, v] of Object.entries(b)) S[k] = (S[k] || 0) + v;
  // sprite
  const m = c.sprite;
  if (m) { S.dfp += Math.floor(m.def) * 2; S.atp += Math.floor(m.pow) * 2; S.ata += Math.floor(m.dex); S.evp += Math.floor(m.dex) * 0.5; S.mst += Math.floor(m.mind) * 2; }
  // passive skills
  const r = (id) => c.skills[id] || 0;
  S.dfpPct += 0.06 * r('ironhide'); S.hpPct += 0.04 * r('ironhide');
  S.meleePct += 0.07 * r('plasmaedge'); S.meleeLeech += 0.01 * r('bloodlust');
  S.justBonus += 0.06 * r('combomastery'); S.atkSpd += 0.04 * r('combomastery');
  S.lastStand = r('laststand'); S.lowHpReduce = 0.04 * r('laststand');
  S.critCh += 0.03 * r('steadyaim'); S.critDmg += 0.08 * r('steadyaim');
  S.rollCd += 0.1 * r('evasiveroll'); S.rollDmg += 0.15 * r('evasiveroll');
  S.overchargeTp = 0.4 * r('overcharge'); S.pbGain += 0.1 * r('overcharge');
  S.techPct += 0.07 * r('techmastery'); S.tpRegenPct += 0.15 * r('manafont'); S.tpPct += 0.04 * r('manafont');
  S.chain = 0.04 * r('chaincast'); S.techCrit = 0.04 * r('techoverflow'); S.techCritDmg = 0.1 * r('techoverflow');
  // finals
  S.maxHp = Math.round(S.hp * (1 + S.hpPct));
  S.maxTp = Math.round(S.tp * (1 + S.tpPct));
  S.dfp = Math.round(S.dfp * (1 + S.dfpPct));
  for (const k of ['atp', 'mst', 'ata', 'evp', 'lck']) S[k] = Math.round(S[k]);
  S.crit = 0.03 + S.lck * 0.0015 + S.critCh;
  S.critMul = 1.5 + S.critDmg;
  S.speed = 5.4 * (1 + S.moveSpd);
  S.tpRegenTotal = (S.maxTp * (c.role === 'psion' ? 0.02 : 0.012) * (race.tpRegen || 1) * (1 + S.tpRegenPct)) + S.tpRegen;
  for (const k of Object.values(RES_KEYS)) S[k] = Math.min(0.75, S[k] + S.resAll);
  S.dmgReduce = Math.min(0.5, S.dmgReduce);
  S.tpCost = Math.max(-0.5, S.tpCost);
  S.cdr = Math.min(0.4, S.cdr);
  return S;
}

function gainXP(c, amt) {
  if (c.level >= MAX_LEVEL) return 0;
  c.xp += Math.round(amt * (RACES[c.race].xp || 1));
  let ups = 0;
  while (c.level < MAX_LEVEL && c.xp >= xpToNext(c.level)) { c.xp -= xpToNext(c.level); c.level++; c.skillPts++; ups++; }
  if (c.level >= MAX_LEVEL) c.xp = 0;
  return ups;
}
function skillTierOpen(c, sk) {
  if (sk.role === 'race') return c.level >= (sk.level || 1);
  const spent = Object.entries(c.skills).filter(([id]) => SKILLS[id] && SKILLS[id].role === c.role).reduce((a, [, v]) => a + v, 0);
  return c.level >= SKILL_TIER_LEVEL[sk.tier] && spent >= SKILL_TIER_POINTS[sk.tier];
}
function classSkills(c) { return Object.entries(SKILLS).filter(([, s]) => s.role === c.role); }
function raceSkills(c) { return Object.entries(SKILLS).filter(([, s]) => s.role === 'race' && s.race === c.race && c.level >= (s.level || 1)); }
function knowsSkill(c, id) { const s = SKILLS[id]; if (!s) return false; if (s.role === 'race') return s.race === c.race && c.level >= (s.level || 1); return (c.skills[id] || 0) > 0; }
function canUseTech(c, id) { return (c.techs[id] || 0) > 0; }
function techLevelCap(c, id) { const T_ = TECHS[id]; if (T_.forceOnly && c.role !== 'psion') return 0; if (T_.support && RACES[c.race].noSupport) return 0; return ROLES[c.role].techMax; }

// Average gear for a recruited ally of a given level (allies don't manage inventories)
function allyChar(a) {
  const c = newCharacter(a.name, a.role, a.race, a.look);
  c.level = a.level; c.inv = [];
  const rng = RNG(a.name + a.level);
  c.equip.weapon = makeEquip('weapon', a.level, 1, rng, { base: a.weapon }); c.equip.weapon.aff = []; c.equip.weapon.mult = 1.12;
  c.equip.frame = makeEquip('frame', a.level, 1, rng); c.equip.frame.aff = [];
  c.equip.barrier = makeEquip('barrier', a.level, 1, rng); c.equip.barrier.aff = [];
  c.sprite.pow = c.sprite.def = c.sprite.dex = c.sprite.mind = a.level * 0.25;
  if (a.role === 'psion') c.sprite.mind = a.level * 0.6; else if (a.role === 'vanguard') c.sprite.pow = a.level * 0.6; else c.sprite.dex = a.level * 0.6;
  const tl = Math.max(1, Math.min(ROLES[a.role].techMax, Math.floor(a.level / 2.2) + 1));
  c.techs = {};
  if (a.role === 'psion') { for (const t of ['ember', 'frostlance', 'jolt', 'pyrering', 'inferno', 'arcchain', 'glacier', 'stormcall']) c.techs[t] = Math.max(1, tl - (['pyrering', 'inferno', 'arcchain', 'glacier', 'stormcall'].includes(t) ? 3 : 0)); if (a.race !== 'construct') { c.techs.mend = tl; c.techs.fervor = Math.max(1, tl - 2); c.techs.bulwark = Math.max(1, tl - 2); c.techs.rekindle = a.level >= 12 ? 1 : 0; c.techs.cleanse = 1; } if (a.level >= 20) { c.techs.radiance = Math.max(1, tl - 5); c.techs.umbra = Math.max(1, tl - 6); } }
  else if (a.race !== 'construct') { c.techs.mend = Math.max(1, Math.floor(tl / 2)); if (a.level >= 8) c.techs.fervor = Math.max(1, Math.floor(tl / 3)); }
  // spend skill points sensibly
  c.skills = {}; let pts = a.level;
  const tree = classSkills(c).sort((x, y) => x[1].tier - y[1].tier);
  for (let k = 0; k < 60 && pts > 0; k++) for (const [id, s] of tree) { if (pts <= 0) break; if ((c.skills[id] || 0) < s.max && skillTierOpen(c, s)) { c.skills[id] = (c.skills[id] || 0) + 1; pts--; } }
  return c;
}
