// Sanity tests for 05_items.js:  node test/items_test.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';
import { load } from './load.mjs';
const here = path.dirname(url.fileURLToPath(import.meta.url));
const src = (f) => fs.existsSync(path.join(here, '..', 'src', f));
const files = ['03_stats.js'];
let mockNanos = '';
if (src('04_nanos.js')) files.push('04_nanos.js');
files.push('05_items.js');
const N = ['EQUIP_SLOTS', 'IMPLANT_SLOTS', 'ITEM_T', 'CLUSTER_T', 'IMPLANT_TABLE', 'CLUSTER_COLORS', 'makeItem', 'itemReqsMet', 'itemMods', 'itemDesc', 'itemPrice',
  'clusterFits', 'insertCluster', 'removeCluster', 'makeImplant', 'rollLoot', 'rollCredits', 'vendorStock', 'registerNanoItems', 'itemQlForLevel',
  'PROFS', 'SKILLS', 'SKILL_IDS', 'STAT_IDS', 'SPECIAL_SKILL', 'computeStats', 'newCharacter', 'NANOS', 'makeRng', 'LOOT_KINDS', 'IT_SKILLS', 'IT_SK'];
const M = load(files, N);
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; if (fails < 40) console.log('FAIL', msg); } };

const ids = Object.keys(M.ITEM_T);
console.log('templates:', ids.length, 'nanos:', M.NANOS ? Object.keys(M.NANOS).length : '(no 04_nanos.js)');

// every template instantiates at min/max; reqs & mods monotonic in QL; descs are clean
const bad = /undefined|NaN|\[object/;
for (const id of ids) {
  const t = M.ITEM_T[id];
  let prev = null;
  for (let q = t.qlMin; q <= t.qlMax; q++) {
    const it = M.makeItem(id, q);
    ok(it && it.ql === q && it.uid && it.name && it.kind === t.kind, 'make ' + id + '@' + q);
    if (!it) break;
    ok(Number.isFinite(it.value) && it.value >= 0, 'value ' + id + '@' + q);
    ok(it.icon && it.icon.glyph && /^#/.test(it.icon.color), 'icon ' + id);
    for (const s in it.reqs) ok(Number.isFinite(it.reqs[s]) && it.reqs[s] >= 0, 'req finite ' + id);
    if (prev) {
      for (const s in prev.reqs) ok((it.reqs[s] || 0) >= prev.reqs[s], 'req monotonic ' + id + ' ' + s + '@' + q);
      for (const s in prev.mods) ok((it.mods[s] || 0) >= prev.mods[s], 'mod monotonic ' + id + ' ' + s + '@' + q);
      if (it.dmg) ok(it.dmg[1] >= prev.dmg[1] && it.dmg[0] >= prev.dmg[0], 'dmg monotonic ' + id + '@' + q);
    }
    if (q === t.qlMin || q === t.qlMax || q % 50 === 0) {
      const d = M.itemDesc(it, { str: 10 });
      ok(d.length >= 2 && d.every((l) => typeof l === 'string' && !bad.test(l)), 'desc ' + id + '@' + q + ' ' + JSON.stringify(d));
      ok(M.itemPrice(it, true) >= 0 && M.itemPrice(it, false) >= 0, 'price ' + id);
    }
    prev = it;
  }
  const lo = M.makeItem(id, t.qlMin), hi = M.makeItem(id, t.qlMax);
  ok(M.makeItem(id, -5).ql === t.qlMin && M.makeItem(id, 9999).ql === t.qlMax, 'clamp ' + id);
  if (t.kind === 'weapon') {
    ok(hi.dmg[0] <= hi.dmg[1] && hi.atk >= 0.6 && hi.rech >= 0.6 && hi.range >= 3 && hi.specials && hi.model, 'weapon fields ' + id);
    ok(M.ITEM_T[id].skill in M.IT_SK && hi.reqs[hi.skill] > 0, 'weapon skill req ' + id);
    ok(M.SKILLS[hi.skill] || hi.skill, 'skill exists');
    hi.specials.forEach((s) => ok(M.SPECIAL_SKILL[s], 'special known ' + s));
    ok(['pistol', 'rifle', 'smg', 'shotgun', 'heavy', 'melee1h', 'melee2h', 'fists'].includes(hi.model), 'model ' + id);
  }
  // all stat ids used in reqs/mods exist
  if (M.STAT_IDS) for (const it of [lo, hi]) {
    for (const s in it.reqs) ok(M.STAT_IDS.includes(s) || s === 'level', 'unknown req stat ' + s + ' in ' + id);
    for (const s in it.mods) ok(M.STAT_IDS.includes(s), 'unknown mod stat ' + s + ' in ' + id);
    if (it.use && it.use.buff) for (const s in it.use.buff) ok(M.STAT_IDS.includes(s), 'unknown buff stat ' + s + ' in ' + id);
  }
}

// every weapon skill has 2-4 templates covering ql 1..200
M.IT_SKILLS.forEach((sk) => {
  const ts = ids.filter((i) => M.ITEM_T[i].skill === sk);
  ok(ts.length >= 2 && ts.length <= 4, 'templates per skill ' + sk + ' ' + ts.length);
  for (let q = 1; q <= 200; q++) ok(ts.some((i) => M.ITEM_T[i].qlMin <= q && q <= M.ITEM_T[i].qlMax), 'coverage ' + sk + '@' + q);
});
// armour: every equip slot has a basic piece
['head', 'back', 'lshoulder', 'rshoulder', 'chest', 'larm', 'rarm', 'lwrist', 'rwrist', 'hands', 'legs', 'feet'].forEach((s) => ok(M.ITEM_T['armor_basic_' + s], 'armor_basic_' + s));

// starter ids (from 03_stats + required list)
const need = new Set('ar_basic hammer_2h_basic pistol_basic smg_basic rifle_basic shotgun_basic blade_2h_basic blade_1h_basic knife_basic knuckles_basic armor_basic_chest armor_basic_legs armor_basic_feet gloves_basic health_kit nano_kit'.split(' '));
for (const p in M.PROFS) M.PROFS[p].startItems.forEach(([tid]) => need.add(tid));
need.forEach((tid) => ok(M.ITEM_T[tid], 'starter template missing: ' + tid));
// a fresh character of every profession can wield its starting weapon and armour
for (const p in M.PROFS) {
  const ch = M.newCharacter({ name: 't', breed: 'baseline', prof: p });
  const S = M.computeStats(ch, {});
  const w = ch.equip.rhand;
  ok(w && w.kind === 'weapon', p + ' has a weapon equipped');
  [].concat(Object.values(ch.equip).filter(Boolean), ch.inv).forEach((it) => {
    const r = M.itemReqsMet(S, it);
    ok(r.ok, p + ' cannot use starter ' + it.name + ' ' + JSON.stringify(r.missing));
  });
}

// implants / clusters
ok(M.IMPLANT_SLOTS.length === 13 && M.IMPLANT_SLOTS.every((s) => M.ITEM_T['implant_' + s]), 'implant per slot');
M.IMPLANT_SLOTS.forEach((s) => M.CLUSTER_COLORS.forEach((c) => ok(M.IMPLANT_TABLE[s][c].length >= 2, 'cell ' + s + ' ' + c)));
Object.keys(M.CLUSTER_T).forEach((st) => M.CLUSTER_COLORS.forEach((c) => {
  ok(M.CLUSTER_T[st].slots[c].length === 1 && M.ITEM_T['cluster_' + c + '_' + st], 'cluster tpl ' + st);
  ok(M.STAT_IDS.includes(st), 'cluster stat is a stat id: ' + st);
}));
{
  const im = M.makeItem('implant_eye', 100);
  const sh = M.makeItem('cluster_shiny_rifle', 100), br = M.makeItem('cluster_bright_rifle', 100), fa = M.makeItem('cluster_faded_rifle', 100);
  ok(Math.abs(br.mods.rifle / sh.mods.rifle - 0.6) < 0.03 && Math.abs(fa.mods.rifle / sh.mods.rifle - 0.4) < 0.03, 'bright/faded ratios');
  ok(M.clusterFits(im, sh, 'shiny'), 'rifle shiny fits eye');
  ok(!M.clusterFits(im, sh, 'bright'), 'colour mismatch');
  ok(!M.clusterFits(M.makeItem('implant_feet', 100), sh, 'shiny'), 'rifle shiny not in feet');
  ok(!M.insertCluster(im, M.makeItem('cluster_shiny_rifle', 150), 'shiny').ok, 'cluster QL above implant');
  ok(!M.insertCluster(im, sh, 'shiny', { nano_prog: 50 }).ok, 'needs nano_prog');
  ok(M.insertCluster(im, sh, 'shiny', { nano_prog: 100 }).ok, 'insert ok');
  ok(!M.insertCluster(im, M.makeItem('cluster_shiny_rifle', 10), 'shiny').ok, 'occupied');
  ok(M.itemMods(im).rifle === sh.mods.rifle, 'itemMods includes clusters');
  ok(M.removeCluster(im, 'shiny') === sh && !M.itemMods(im).rifle, 'removeCluster');
  const rng = M.makeRng(5);
  for (const s of M.IMPLANT_SLOTS) { const f = M.makeImplant(s, 60, rng); ok(f && M.CLUSTER_COLORS.every((c) => f.clusters[c]), 'prefilled ' + s); ok(!bad.test(M.itemDesc(f).join('|')), 'implant desc'); }
  const json = JSON.parse(JSON.stringify(im)); ok(json.clusters.faded === null, 'json-safe');
  // implant requirements vs. a high-level treatment-cheap character
  const imp = M.makeItem('implant_chest', 40); ok(imp.reqs.treatment > 0 && imp.reqs.sta > 0, 'implant reqs');
}

// nanocrystals
if (M.NANOS) {
  M.registerNanoItems();
  for (const nid in M.NANOS) {
    const n = M.NANOS[nid], it = M.makeItem('nano:' + nid, 1);
    ok(it && it.kind === 'nanocrystal' && it.nano === nid && it.ql === Math.max(1, n.lvl) && it.reqs.level === Math.max(1, n.lvl), 'nano item ' + nid);
    ok(!bad.test(M.itemDesc(it).join('|')), 'nano desc ' + nid);
    if (n.reqs) for (const s in n.reqs) ok(it.reqs[s] === n.reqs[s], 'nano reqs ' + nid);
  }
} else ok(M.makeItem('nano:nope', 1) === null, 'unknown nano -> null');

// loot & vendors never throw and always give valid items
const valid = (it, where) => ok(it && it.uid && it.name && it.kind && it.ql >= 1 && Number.isFinite(it.value), 'bad item from ' + where + ' ' + JSON.stringify(it && it.t));
const kinds = Object.keys(M.LOOT_KINDS);
let nLoot = 0, nGear = 0;
for (let lvl = 1; lvl <= 60; lvl++) {
  for (let seed = 0; seed < 30; seed++) {
    const rng = M.makeRng(lvl * 1000 + seed);
    for (const k of kinds) { const l = M.rollLoot(k, lvl, rng); l.forEach((i) => { valid(i, 'loot ' + k); nLoot++; if (i.kind === 'weapon' || i.kind === 'armor') nGear++; }); }
    M.rollLoot({ loot: 'beast', named: true, model: 'beast' }, lvl, rng).forEach((i) => valid(i, 'named'));
    M.rollLoot({ model: 'humanoid' }, lvl, rng).forEach((i) => valid(i, 'humanoid tpl'));
    M.rollLoot({ model: 'weird' }, lvl, rng).forEach((i) => valid(i, 'unknown model'));
    const c = M.rollCredits(lvl, rng); ok(Number.isInteger(c) && c >= 1, 'credits');
  }
  const vk = ['weapons', 'armor', 'armor:meridian', 'armor:freehold', 'implants', 'general', 'nanos:medic', 'nanos:trooper', 'bogus'];
  for (const k of vk) {
    const st = M.vendorStock(k, lvl, M.makeRng(lvl));
    st.forEach((i) => valid(i, 'vendor ' + k));
    if (k !== 'bogus' && !k.startsWith('nanos:')) ok(st.length > 5, 'vendor ' + k + ' lvl ' + lvl + ' has stock (' + st.length + ')');
    const st2 = M.vendorStock(k, lvl);       // rng omitted
    ok(st2.length === st.length, 'vendor deterministic length ' + k);
  }
}
ok(nLoot > 1000 && nGear > 20, 'loot produces items (' + nLoot + ', gear ' + nGear + ')');
if (M.NANOS) ok(M.vendorStock('nanos:trooper', 50).every((i) => i.kind === 'nanocrystal'), 'nano vendor');

// balance printout
{
  const f = (id, q) => { const i = M.makeItem(id, q); return i.name + ' QL' + q + ' dmg ' + i.dmg + ' atk ' + i.atk + ' dps ' + ((i.dmg[0] + i.dmg[1]) / 2 / i.atk).toFixed(1) + ' reqs ' + JSON.stringify(i.reqs); };
  console.log(f('ar_kessler', 100)); console.log(f('rifle_aurelian', 200)); console.log(f('hammer_2h_basic', 20)); console.log(f('knuckles_basic', 30));
  console.log(JSON.stringify(M.makeItem('combat_chest', 100).mods), JSON.stringify(M.makeItem('combat_chest', 100).reqs));
  console.log(M.itemDesc(M.makeItem('ar_kessler', 100)).join('\n'));
}
console.log(fails ? fails + ' FAILURES' : 'all items tests passed');
process.exit(fails ? 1 : 0);
