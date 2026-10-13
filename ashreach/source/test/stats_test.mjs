// Sanity tests for 03_stats.js:  node test/stats_test.mjs
import { load } from './load.mjs';
const N = ['ABILITY_IDS', 'ABILITY_NAMES', 'SKILLS', 'SKILL_IDS', 'SKILL_CATS', 'BREEDS', 'PROFS', 'MAX_LEVEL', 'xpToNext', 'ipAtLevel', 'titleLevel', 'mobXp',
  'abilityIpCost', 'skillIpCost', 'abilityCap', 'skillCap', 'newCharacter', 'raiseAbility', 'raiseSkill', 'lowerSkill', 'lowerAbility', 'levelUp', 'addXp',
  'respec', 'totalIpAtLevel', 'computeStats', 'STAT_NAMES', 'STAT_IDS', 'FACTIONS', 'skillStat', 'SPECIAL_SKILL', 'WEAPON_SKILL_IDS'];
const M = load(['03_stats.js'], N);
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };

const REQUIRED = 'body_dev nano_pool martial_arts brawl pressure_pt riposte blunt1h edged1h piercing blunt2h edged2h melee_energy melee_init parry fast_attack sneak_attack multi_melee pistol assault_rifle rifle smg shotgun bow heavy_weapons grenade ranged_energy ranged_init quick_shot burst full_auto aimed_shot multi_ranged phys_init nano_init dodge_ranged evade_close duck_exp run_speed fab trn bio psi sen spt nano_resist first_aid treatment comp_lit psychology mech_eng elec_eng quantum_ft weapon_smt pharma_tech nano_prog chemistry tutoring perception concealment map_nav breaking_entry trap_disarm'.split(' ');
REQUIRED.forEach((id) => ok(M.SKILLS[id], 'missing skill ' + id));
console.log('skills:', M.SKILL_IDS.length, 'cats:', M.SKILL_CATS.map((c) => c.name + ':' + c.skills.length).join(' '));
M.SKILL_IDS.forEach((id) => {
  const t = M.SKILLS[id].trickle; const s = Object.values(t).reduce((a, b) => a + b, 0);
  ok(Math.abs(s - 1) < 1e-9, 'trickle sum ' + id); ok(Object.keys(t).every((k) => M.ABILITY_IDS.includes(k)), 'trickle ability ' + id);
  ok(M.STAT_NAMES[M.skillStat(id)], 'name ' + id);
});
M.STAT_IDS.forEach((id) => ok(M.STAT_NAMES[id], 'STAT_NAMES ' + id));
ok(new Set(M.STAT_IDS).size === M.STAT_IDS.length, 'stat ids unique');
ok(Object.keys(M.BREEDS).length === 4 && Object.keys(M.PROFS).length === 14, 'counts');
Object.values(M.SPECIAL_SKILL).forEach((s) => ok(M.SKILLS[s], 'special skill ' + s));

// professions: tiers valid, weapon cheap, distinct identities
const pids = Object.keys(M.PROFS), bids = Object.keys(M.BREEDS);
pids.forEach((p) => {
  const P = M.PROFS[p];
  M.SKILL_IDS.forEach((s) => ok(P.skillCost[s] >= 1 && P.skillCost[s] <= 4, `${p} tier ${s}`));
  Object.keys(P.skillCost).forEach((s) => ok(M.SKILLS[s], `${p} unknown cost skill ${s}`));
  ok(P.skillCost[P.weapon] <= 1.5 && M.WEAPON_SKILL_IDS.includes(P.weapon), p + ' weapon');
  ok(P.startNanos.length >= 2 && P.startNanos.length <= 3 && P.startNanos.every((n) => n.startsWith(p + '_')), p + ' nanos');
  ok(P.tips.length > 20 && P.startItems.length >= 5, p + ' tips/items');
  Object.keys(P.startSkills).forEach((s) => ok(M.SKILLS[s], p + ' startSkill ' + s));
  ok(P.skillCost[P.school] <= 1.5, p + ' school cheap: ' + P.school + ' ' + P.skillCost[P.school]);
  const cheap = M.SKILL_IDS.filter((s) => P.skillCost[s] <= 1.2).length;
  ok(cheap >= 4, p + ' cheap count ' + cheap);
});
// profession cost vectors pairwise distinct
for (let i = 0; i < pids.length; i++) for (let j = i + 1; j < pids.length; j++)
  ok(M.SKILL_IDS.some((s) => M.PROFS[pids[i]].skillCost[s] !== M.PROFS[pids[j]].skillCost[s]), 'same costs ' + pids[i] + pids[j]);

// level 1: everyone builds, can wield, fights
const SAMPLE = {};
bids.forEach((b) => pids.forEach((p) => {
  const c = M.newCharacter({ name: 'T', breed: b, prof: p, faction: 'meridian' });
  const S = M.computeStats(c, {});
  M.STAT_IDS.forEach((id) => ok(typeof S[id] === 'number' && !isNaN(S[id]), `${b}/${p} S.${id}`));
  const w = M.PROFS[p].weapon;
  ok(S[w] >= 16, `${b}/${p} L1 weapon skill ${S[w]}`);
  ok(S[M.PROFS[p].school === 'sen' ? 'sen_sch' : M.PROFS[p].school] >= 14, `${b}/${p} school`);
  ok(S.maxHp >= 80 && S.maxHp <= 400, `${b}/${p} L1 hp ${S.maxHp}`);
  ok(c.ip >= 0 && c.ip <= 40, `${b}/${p} leftover IP ${c.ip}`);
  ok(JSON.parse(JSON.stringify(c)).prof === p, 'json');
  SAMPLE[b + '/' + p] = [S.maxHp, S.maxNp, c.ip];
}));
console.log('L1 trooper/baseline', JSON.stringify(SAMPLE['baseline/trooper']), ' L1 savant/nanoshaper', JSON.stringify(SAMPLE['savant/nanoshaper']), ' bulwark/bruiser', JSON.stringify(SAMPLE['bulwark/bruiser']));

// IP spending respects caps
{
  const c = M.newCharacter({ breed: 'baseline', prof: 'trooper' });
  c.ip = 1e9;
  M.SKILL_IDS.forEach((s) => { while (M.raiseSkill(c, s)); ok(c.skill[s] === M.skillCap(c, s), 'skill cap ' + s); });
  M.ABILITY_IDS.forEach((a) => { while (M.raiseAbility(c, a)); ok(c.abil[a] === M.abilityCap(c, a), 'ab cap ' + a); });
  const S = M.computeStats(c, {});
  ok(S.assault_rifle < 60 + 60, 'L1 maxed AR ' + S.assault_rifle);
  const ip = c.ip; c.ip = 0; ok(!M.raiseSkill(c, 'pistol') && !M.raiseAbility(c, 'str'), 'no ip no raise');
  // lower refunds exactly what raise cost
  const d = M.newCharacter({ breed: 'kestrel', prof: 'runner' }); d.ip = 500;
  const ip0 = d.ip; M.raiseSkill(d, 'smg'); M.raiseSkill(d, 'smg'); M.raiseAbility(d, 'agi'); M.lowerSkill(d, 'smg'); M.lowerSkill(d, 'smg'); M.lowerAbility(d, 'agi');
  ok(d.ip === ip0, 'refund symmetric');
  M.respec(d); ok(d.ip + 0 > 0 && M.totalIpAtLevel(1) === M.ipAtLevel(1), 'respec');
}

// XP / IP
{
  let tot = 0, kills = 0; const at = {};
  for (let l = 1; l < M.MAX_LEVEL; l++) {
    tot += M.xpToNext(l); kills += M.xpToNext(l) / M.mobXp(l); at[l + 1] = [tot, Math.round(kills)];
    ok(M.xpToNext(l + 0) > 0 && (l === 1 || M.xpToNext(l) >= M.xpToNext(l - 1)), 'xp monotone ' + l);
  }
  console.log('total xp/kills to reach L2', at[2], 'L10', at[10], 'L30', at[30], 'L50', at[50]);
  const kpl = (l) => M.xpToNext(l) / M.mobXp(l);
  ok(kpl(1) >= 5 && kpl(1) <= 8 && kpl(10) >= 18 && kpl(10) <= 22 && kpl(49) >= 55 && kpl(49) <= 65, 'kills per level range ' + kpl(1) + ' ' + kpl(49));
  console.log('total IP at 14/49/50:', M.totalIpAtLevel(14), M.totalIpAtLevel(49), M.totalIpAtLevel(50));
  ok(M.titleLevel(14) === 1 && M.titleLevel(15) === 2 && M.titleLevel(49) === 2 && M.titleLevel(50) === 3, 'titles');
  const c = M.newCharacter({ prof: 'bruiser' });
  ok(M.addXp(c, M.xpToNext(1) + M.xpToNext(2) + 5) === 2 && c.level === 3 && c.xp === 5, 'addXp');
  ok(c.ip >= M.ipAtLevel(2) + M.ipAtLevel(3), 'levelup ip');
  c.level = 50; ok(!M.levelUp(c), 'max level');
}

// Level-50 builds: spend all IP on weapon, body dev, then breed's favoured abilities
function build50(b, p) {
  const c = M.newCharacter({ breed: b, prof: p });
  c.level = 50; c.ip = M.totalIpAtLevel(50) - (M.totalIpAtLevel(1) - c.ip);
  const P = M.PROFS[p];
  const ab = M.ABILITY_IDS.slice().sort((x, y) => M.BREEDS[b].abilityCost[x] - M.BREEDS[b].abilityCost[y]);
  // abilities that feed the weapon skill most
  const wt = M.SKILLS[P.weapon].trickle; const fav = Object.keys(wt).sort((x, y) => wt[y] - wt[x])[0];
  const plan = [[P.weapon, 0.8], [P.school, 0.5], ['body_dev', 0.6], ['nano_pool', 0.4], ['fav', 0.3]];
  let guard = 0;
  while (c.ip > 0 && guard++ < 20000) {
    // buy toward each target in rotation: weapon first until cap, then body dev etc.
    let bought = false;
    for (const s of [P.weapon, 'body_dev', P.school, 'sta', 'nano_pool', fav, 'dodge_ranged']) {
      const done = M.SKILLS[s] ? M.raiseSkill(c, s) : M.raiseAbility(c, s);
      if (done) { bought = true; break; }
    }
    if (!bought) break;
  }
  return c;
}
console.log('\nL50 builds (all IP: weapon, body dev, school, ...):');
const hps = [];
bids.forEach((b) => pids.forEach((p) => {
  const c = build50(b, p), S = M.computeStats(c, {}), w = M.PROFS[p].weapon;
  hps.push([b, p, S.maxHp, S.maxNp, S[w]]);
  ok(S.maxHp >= 1300 && S.maxHp <= 5000, `${b}/${p} L50 hp ${S.maxHp}`);
  ok(S[w] >= 200 && S[w] <= 350, `${b}/${p} L50 weapon ${S[w]}`);
  ok(S.runSpeed >= 5 && S.runSpeed <= 11, 'run speed');
}));
['baseline', 'kestrel', 'savant', 'bulwark'].forEach((b) => console.log(b.padEnd(9), hps.filter((x) => x[0] === b).map((x) => `${x[1].slice(0, 5)} ${x[2]}/${x[3]}/${x[4]}`).join(' | ')));

// mods
{
  const c = M.newCharacter({ breed: 'savant', prof: 'nanoshaper' });
  const A = M.computeStats(c, {}), B = M.computeStats(c, { str: 40, maxHp: 150, ac_proj: 80, assault_rifle: 40, nanoCost: 90, runSpeed: 99, sen_sch: 100, fooBar: 3 });
  ok(B.str === A.str + 40 && B.maxHp >= A.maxHp + 150 && B.ac_proj === 80 && B.assault_rifle >= A.assault_rifle + 40, 'mods apply');
  ok(B.nanoCost === 55 && B.runSpeed === 11 && B.sen_sch === A.sen_sch + 100 && B.fooBar === 3, 'mod caps');
  const D = M.computeStats(c, { int: 100 }); ok(D.fab > A.fab, 'trickle from buffed ability');
  ok(M.computeStats(M.newCharacter({ breed: 'bulwark' }), {}).nanoCost === 0, 'nanoCost default 0');
}
console.log(fails ? `\n${fails} FAILURES` : '\nall ok');
process.exit(fails ? 1 : 0);
