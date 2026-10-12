// Tests for 04_nanos.js and 06_mobs.js:  node test/nanos_test.mjs
import { load } from './load.mjs';
import fs from 'fs';
import path from 'path';
import url from 'url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const has03 = fs.existsSync(path.join(here, '..', 'src', '03_stats.js'));
const files = (has03 ? ['03_stats.js'] : []).concat(['04_nanos.js', '06_mobs.js']);
const M = load(files, ['NANOS', 'NANOLINES', 'NANO_SCHOOLS', 'PETS', 'MOB_ABILITIES', 'nanoReqMet', 'MOB_T', 'mobStats', 'mobAbilityFx', 'nanosForProf',
  'PROFS', 'STAT_IDS', 'MAX_LEVEL']);

let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('FAIL: ' + msg); } };

const PROF_IDS = ['trooper', 'bruiser', 'medic', 'mechanist', 'runner', 'nanoshaper', 'psion', 'martialist', 'infiltrator', 'wayfarer', 'broker', 'executive', 'warden', 'wraith'];
const FX = ['buff', 'debuff', 'heal', 'hot', 'dmg', 'dot', 'root', 'snare', 'calm', 'stun', 'taunt', 'pet', 'drain', 'shield', 'reflect', 'dmgshield', 'morph', 'lattice', 'stealth', 'speed', 'proc', 'summon'];
const TARGETS = ['self', 'team', 'friend', 'enemy', 'pet'];
const DMG = ['melee', 'proj', 'energy', 'chem', 'rad', 'cold', 'fire', 'poison'];
const SCHOOL_STATS = { fab: 'fab', trn: 'trn', bio: 'bio', psi: 'psi', sen: 'sen_sch', spt: 'spt' };
const PSEUDO = ['addAR', 'addDef', 'dmgPct', 'atkPct'];

// ---- schools / lines ----
ok(Object.keys(M.NANO_SCHOOLS).length === 6, '6 schools');
for (const s in M.NANO_SCHOOLS) ok(/^#[0-9a-f]{6}$/i.test(M.NANO_SCHOOLS[s].color), 'school colour ' + s);
for (const l in M.NANOLINES) ok(['self', 'team', 'enemy'].includes(M.NANOLINES[l].stack) && M.NANOLINES[l].name, 'line ' + l);

// ---- nanos ----
const ids = Object.keys(M.NANOS);
ok(ids.length >= 200, 'nano count ' + ids.length);
const statOk = (k) => !M.STAT_IDS || M.STAT_IDS.includes(k) || ['hitHeal', 'lifeSteal', ...PSEUDO].includes(k);
const byLine = {};
for (const id of ids) {
  const n = M.NANOS[id];
  const w = id + ': ';
  ok(n.id === id, w + 'id field');
  ok(typeof n.name === 'string' && n.name.length > 1, w + 'name');
  ok(n.prof === 'any' || PROF_IDS.includes(n.prof), w + 'prof');
  ok(id.startsWith(n.prof + '_'), w + 'id prefix');
  ok(Number.isInteger(n.lvl) && n.lvl >= 1 && n.lvl <= 50, w + 'lvl');
  ok(M.NANOLINES[n.line], w + 'line exists');
  ok(Number.isFinite(n.str) && n.str > 0, w + 'str');
  ok(Number.isInteger(n.cost) && n.cost >= 1, w + 'cost');
  ok(Number.isInteger(n.ncu) && n.ncu >= 0 && n.ncu <= 45, w + 'ncu ' + n.ncu);
  ok(n.cast >= 0 && n.cast <= 3, w + 'cast ' + n.cast);
  ok(n.recharge >= 1 && n.recharge <= 30, w + 'recharge ' + n.recharge);
  ok(n.range >= 0 && n.range <= 40, w + 'range');
  ok(TARGETS.includes(n.target), w + 'target');
  ok(M.NANO_SCHOOLS[n.school], w + 'school');
  ok(n.reqs && Object.keys(n.reqs).length >= 1, w + 'reqs');
  const rk = Object.keys(n.reqs);
  ok(rk[0] === SCHOOL_STATS[n.school], w + 'primary req is the school ' + rk[0]);
  for (const k of rk) ok(Object.values(SCHOOL_STATS).includes(k) && n.reqs[k] > 0 && n.reqs[k] <= 260, w + 'req ' + k);
  ok(n.icon && typeof n.icon.glyph === 'string' && n.icon.glyph.length >= 1 && /^#/.test(n.icon.color), w + 'icon');
  ok(typeof n.desc === 'string' && n.desc.length > 10, w + 'desc');
  ok(Array.isArray(n.fx) && n.fx.length >= 1, w + 'fx');
  const isBuffish = n.fx.some((f) => ['buff', 'shield', 'reflect', 'speed', 'stealth', 'morph', 'pet', 'proc'].includes(f.t)) && n.target !== 'enemy';
  ok(isBuffish ? n.ncu > 0 && n.dur >= 60 : n.ncu === 0, w + 'buff ncu/dur');
  if (n.fx.some((f) => f.t === 'hot' || f.t === 'dot' || f.t === 'root' || f.t === 'snare' || f.t === 'calm' || f.t === 'drain' || f.t === 'debuff')) ok(n.dur > 0, w + 'needs dur');
  if (n.dur >= 60 && n.target !== 'enemy') ok(n.dur <= 3600, w + 'buff dur <= 60 min');
  for (const f of n.fx) {
    ok(FX.includes(f.t), w + 'fx type ' + f.t);
    if (f.t === 'buff' || f.t === 'debuff') for (const k in f.mods) ok(statOk(k) && Number.isFinite(f.mods[k]), w + 'mod stat ' + k);
    if (f.t === 'heal' || f.t === 'hot' || f.t === 'dmg' || f.t === 'dot') ok(Array.isArray(f.amt) && f.amt[0] > 0 && f.amt[1] >= f.amt[0], w + 'amt');
    if (f.t === 'hot' || f.t === 'dot') ok(f.every > 0, w + 'every');
    if (f.t === 'dmg' || f.t === 'dot') ok(DMG.includes(f.type), w + 'dmg type');
    if (f.t === 'pet') ok(M.PETS[f.pet], w + 'pet exists ' + f.pet);
    if (f.t === 'drain') ok(f.stat && f.amt > 0 && statOk(f.stat), w + 'drain');
    if (f.t === 'shield') ok(f.absorb > 0, w + 'absorb');
    if (f.t === 'reflect' || f.t === 'snare') ok(f.pct > 0 && f.pct <= 100, w + 'pct');
    if (f.t === 'morph') ok(f.model, w + 'morph model');
    if (f.t === 'taunt') ok(f.amt > 0, w + 'taunt amt');
    if (f.t === 'proc') ok(f.drain > 0 || f.teamHeal > 0, w + 'proc');
  }
  (byLine[n.line] = byLine[n.line] || []).push(n);
  const needNan = M.nanoReqMet({}, n);
  ok(needNan === false, w + 'reqMet false with empty stats');
  const S = {}; for (const k in n.reqs) S[k] = n.reqs[k];
  ok(M.nanoReqMet(S, n) === true, w + 'reqMet exact');
}
// strength strictly increases with level inside each line (per prof-spec)
for (const l in byLine) {
  const arr = byLine[l].filter((n) => n.prof === byLine[l][0].prof).sort((a, b) => a.lvl - b.lvl);
  for (let i = 1; i < arr.length; i++) ok(arr[i].str > arr[i - 1].str, 'line ' + l + ' str increases at ' + arr[i].id);
}
// level-1 starting nanos referenced by the profession table
if (M.PROFS) for (const p of PROF_IDS) {
  for (const id of M.PROFS[p].startNanos) {
    const n = M.NANOS[id];
    ok(!!n, p + ' startNano exists: ' + id);
    if (n) { ok(n.lvl === 1 && n.prof === p, id + ' is level 1 of ' + p); for (const k in n.reqs) ok(n.reqs[k] <= 14, id + ' req ' + k + ' <= 14'); }
  }
}
// profession spread
for (const p of PROF_IDS) {
  const list = M.nanosForProf(p).map((id) => M.NANOS[id]);
  ok(list.length >= 12 && list.length <= 24, p + ' nano count ' + list.length);
  const lvls = list.map((n) => n.lvl);
  ok(lvls.includes(1), p + ' has level 1');
  ok(lvls.some((l) => l >= 5 && l <= 10), p + ' has a level 5-10 nano');
  ok(lvls.some((l) => l >= 22 && l <= 30), p + ' has a ~25 nano');
  ok(lvls.some((l) => l >= 40 && l <= 50), p + ' has a ~45 nano');
  const lines = new Set(list.map((n) => n.line));
  ok(lines.size >= 3 && lines.size <= 6, p + ' lines ' + lines.size);
}
ok(M.nanosForProf('any').length >= 6, 'any-profession nanos');
// signature checks
const has = (p, pred) => M.nanosForProf(p).some((id) => pred(M.NANOS[id]));
const fxHas = (t) => (n) => n.fx.some((f) => f.t === t);
ok(has('mechanist', fxHas('pet')), 'mechanist pet'); ok(has('mechanist', (n) => n.fx.some((f) => f.t === 'debuff')), 'mechanist blind');
ok(has('runner', fxHas('lattice')), 'runner lattice'); ok(has('runner', fxHas('speed')), 'runner speed');
ok(has('nanoshaper', fxHas('root')), 'ns root'); ok(has('nanoshaper', (n) => n.fx.some((f) => f.t === 'buff' && f.mods.nanoCost)), 'ns nano cost');
ok(has('psion', fxHas('pet')), 'psion pet'); ok(has('executive', fxHas('calm')), 'exec calm'); ok(has('executive', fxHas('pet')), 'exec pet');
ok(has('wayfarer', fxHas('morph')), 'wayfarer morph'); ok(has('broker', fxHas('drain')), 'broker drain');
ok(has('infiltrator', fxHas('stealth')), 'infiltrator stealth'); ok(has('wraith', (n) => n.fx.some((f) => f.t === 'proc' && f.drain)), 'wraith drain proc');
ok(has('warden', (n) => n.fx.some((f) => f.t === 'proc' && f.teamHeal)), 'warden heal on hit');
ok(has('trooper', fxHas('reflect')), 'trooper reflect'); ok(has('bruiser', fxHas('taunt')), 'bruiser taunt');
ok(has('medic', fxHas('hot')) && has('medic', fxHas('heal')) && has('medic', fxHas('dot')), 'medic heal/hot/dot');

// ---- pets ----
for (const id in M.PETS) {
  const p = M.PETS[id];
  ok(p.name && p.model && p.scale > 0 && p.colors.length === 3 && ['melee', 'ranged', 'caster', 'healer'].includes(p.arch) && p.lvlFrom === 'caster', 'pet ' + id);
  const st = M.mobStats(p, 20);
  ok(st.maxHp > 0 && st.dmg[1] >= st.dmg[0], 'pet stats ' + id);
}

// ---- mob abilities ----
for (const id in M.MOB_ABILITIES) {
  const a = M.MOB_ABILITIES[id];
  ok(a.name && ['self', 'friend', 'enemy'].includes(a.target) && a.fx.length && a.cast >= 0 && a.recharge > 0 && a.icon, 'mob ability ' + id);
  for (const f of a.fx) ok(FX.includes(f.t), id + ' fx ' + f.t);
}
for (const id of ['heal_self', 'nuke_energy', 'nuke_fire', 'poison_bite', 'root', 'snare', 'enrage', 'stomp', 'summon_adds']) ok(M.MOB_ABILITIES[id], 'ability ' + id);

// ---- mobs ----
const ROSTER = ['chitterling', 'dust_scuttler', 'rust_hound', 'scav_drone', 'smuggler', 'smuggler_boss', 'sand_wyrm', 'dune_strider', 'scorpod', 'rogue_drone', 'dust_raider', 'mire_lurker',
  'spore_beetle', 'thornback', 'feral_mutant', 'lumen_cultist', 'mesa_stalker', 'canyon_raider', 'rock_golem', 'hover_sentry', 'brute_mutant', 'foundry_bot', 'foundry_tech', 'slag_golem',
  'overseer', 'lumen_wisp', 'scar_worm', 'deserter', 'scar_titan', 'colossus', 'merc', 'security_bot', 'lab_horror', 'guard'];
const MODELS = ['critter', 'beast', 'insect', 'mutant', 'drone', 'worm', 'golem', 'wisp', 'humanoid'];
const LOOT = ['critter', 'insect', 'beast', 'drone', 'humanoid', 'mutant', 'golem', 'wisp', 'worm'];
for (const id of ROSTER) ok(M.MOB_T[id], 'mob exists ' + id);
for (const id in M.MOB_T) {
  const t = M.MOB_T[id], w = 'mob ' + id + ': ';
  ok(ROSTER.includes(id), w + 'in roster');
  ok(t.name && MODELS.includes(t.model) && t.scale > 0.3 && t.colors.length === 3 && t.colors.every((c) => Number.isInteger(c) && c >= 0 && c <= 0xffffff), w + 'look');
  ok(t.lvl.length === 2 && t.lvl[0] >= 1 && t.lvl[1] >= t.lvl[0], w + 'lvl');
  ok(['melee', 'ranged', 'caster'].includes(t.arch) && DMG.includes(t.dmgType), w + 'arch/dmgType');
  ok(t.atk > 0.5 && t.range > 0 && t.speed > 0.3 && t.hpMul > 0 && t.dmgMul > 0 && t.acMul > 0, w + 'numbers');
  ok(t.loot === null || LOOT.includes(t.loot), w + 'loot');
  ok(Array.isArray(t.abilities) && t.abilities.every((a) => M.MOB_ABILITIES[a]), w + 'abilities');
  if (t.abilities.includes('summon_adds')) ok(M.MOB_T[t.adds], w + 'adds');
  ok(t.named ? t.xpMul >= 5 && t.xpMul <= 10 : t.xpMul <= 1, w + 'xpMul');
}
for (const id of ['smuggler_boss', 'overseer', 'scar_titan', 'colossus']) ok(M.MOB_T[id].named, id + ' named');

// ---- stats sanity + balance (using the assumptions documented in 06_mobs.js) ----
const hitCh = (ar, dr) => Math.min(0.95, Math.max(0.06, 0.5 + (ar - dr) / (2 * Math.max(ar, dr, 1))));
const mit = (ac, lvl) => 1 - Math.min(0.75, ac / (ac + 60 + lvl * 12));
const report = [];
for (const L of [1, 10, 30, 50]) {
  const prev = M.mobStats(M.MOB_T.merc, L > 1 ? L - 1 : 1);
  const s = M.mobStats(M.MOB_T.merc, L);
  ok(s.maxHp > prev.maxHp * (L > 1 ? 1 : 0.99) && s.ar > 0 && s.dr > 0 && s.xp > 0 && s.runSpeed > 1 && s.dmg[0] >= 1, 'mobStats sane L' + L);
  for (const k of ['melee', 'proj', 'energy', 'chem', 'rad', 'cold', 'fire', 'poison']) ok(s.ac[k] >= 0 && Number.isFinite(s.ac[k]), 'ac ' + k);
  for (const id in M.MOB_T) {
    const t = M.MOB_T[id];
    if (t.friendly) continue;
    const m = M.mobStats(t, L);
    const pAr = 5 + 5.5 * L, pDr = 0.8 * pAr, pHp = 60 + 55 * L, pHit = 8 + 2.2 * L;
    const pAc = 4.5 * L + 10;
    const pDps = hitCh(pAr, m.dr) * pHit / 1.8 * 1.5 * (mit(m.ac.melee, L) + mit(m.ac.proj, L)) / 2;
    const ttk = m.maxHp / pDps;
    const mDps = hitCh(m.ar, pDr) * (m.dmg[0] + m.dmg[1]) / 2 / m.atk * mit(pAc, L);
    const frac = mDps * ttk / pHp;
    if (!t.named && L >= t.lvl[0] - 1 && L <= t.lvl[1] + 1 || (L === 30 && !t.named) || (L === 1 && !t.named)) {
      report.push(`${id.padEnd(15)} L${String(L).padStart(2)} hp${String(m.maxHp).padStart(6)} ttk ${ttk.toFixed(1).padStart(5)} dmgTaken ${(frac * 100).toFixed(0).padStart(3)}%`);
      ok(ttk >= 6.5 && ttk <= 17, `${id} L${L} ttk ${ttk.toFixed(1)}`);
      ok(frac >= 0.17 && frac <= 0.5, `${id} L${L} damage taken ${(frac * 100).toFixed(0)}%`);
    } else if (t.named) ok(m.maxHp > 5 * M.mobStats(M.MOB_T.merc, L).maxHp, `${id} is team content`);
  }
}
if (process.argv.includes('-v')) console.log(report.join('\n'));
console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
