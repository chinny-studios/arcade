// Veyra Below — items: generation, stats, names, values, tooltips, inventory helpers

let UID = 1;
const newUid = () => (Date.now() % 1e7) * 1000 + (UID++ % 1000);
const EQUIP_SLOTS = ['weapon', 'frame', 'barrier', 'unit1', 'unit2'];
const SLOT_NAMES = { weapon: 'Weapon', frame: 'Frame', barrier: 'Barrier', unit1: 'Unit', unit2: 'Unit' };
const isEquip = (it) => it && (it.kind === 'weapon' || it.kind === 'frame' || it.kind === 'barrier' || it.kind === 'unit');
const RAR_MULT = [1, 1.06, 1.14, 1.3, 1.32, 1];

function findAffix(id) { return AFFIXES.find((a) => a.id === id); }
function findUnique(id) { return UNIQUES.find((u) => u.id === id); }
function findRelic(id) { return RELICS.find((u) => u.id === id); }
function findSetPiece(id) { for (const [sid, s] of Object.entries(SETS)) { const p = s.pieces.find((q) => q.id === id); if (p) return { set: sid, piece: p }; } return null; }

// ---------- base numbers ----------
function weaponDamage(it) {
  const wt = WTYPES[it.base];
  const w = LCURVE(it.ilvl) * wt.mult * (it.mult || RAR_MULT[it.rar] || 1) * (1 + (it.grind || 0) * 0.035);
  return { min: Math.max(1, Math.round(w * 0.85)), max: Math.max(2, Math.round(w * 1.15)) };
}
function armorDefence(it) {
  const a = ACURVE(it.ilvl) * (it.mult || RAR_MULT[it.rar] || 1);
  if (it.kind === 'frame') return { dfp: Math.round(a * 1.2), evp: Math.round(a * 0.35) };
  if (it.kind === 'barrier') return { dfp: Math.round(a * 0.6), evp: Math.round(a * 0.5) };
  return { dfp: 0, evp: 0 };
}
function unitImplicit(it) { const u = UNIT_TYPES[it.base]; return { [u.stat]: Math.round(u.v * (1 + it.ilvl * 0.09) * (it.rar >= 2 ? 1.2 : 1)) }; }
function reqLevel(it) {
  if (!isEquip(it)) return it.kind === 'disc' ? discReq(it) : 1;
  if (it.uniq) { const s = findRelic(it.uniq) || findUnique(it.uniq); if (s) return Math.max(1, Math.min(it.ilvl, s.lvl + Math.round((it.ilvl - s.lvl) * 0.8))); }
  return Math.max(1, Math.round(it.ilvl * 0.85) - 1);
}
function discReq(it) { return Math.max(1, Math.round((it.lv - 1) * 2.4)); }
function affixValue(a, ilvl, roll) {
  const v = lerp(a.v[0], a.v[1], roll);
  if (a.sc) return Math.round(v * (1 + ilvl * 0.09 * a.sc));
  return Math.round(v * 1000) / 1000;
}

// Every stat an item contributes (not counting set bonuses).
function itemStats(it) {
  const s = {};
  const add = (k, v) => { s[k] = (s[k] || 0) + v; };
  if (!isEquip(it) || it.unid) return s;
  if (it.kind === 'frame' || it.kind === 'barrier') { const d = armorDefence(it); add('dfp', d.dfp); add('evp', d.evp); }
  if (it.kind === 'unit') for (const [k, v] of Object.entries(unitImplicit(it))) add(k, v);
  if (it.kind === 'weapon') { const wt = WTYPES[it.base]; if (wt.tech || it.tech) add('techPct', (wt.tech || 0) + (it.tech || 0)); if (wt.tpRegen) add('tpRegen', wt.tpRegen); }
  for (const a of it.aff || []) add(a.stat, a.v);
  for (const g of it.gems || []) {
    const gd = GEMS[g.id], tab = it.kind === 'weapon' ? gd.weapon : gd.armor;
    for (const [k, arr] of Object.entries(tab)) add(k, arr[g.tier]);
  }
  if (it.uniq) {
    const u = findUnique(it.uniq);
    if (u) for (const [k, v] of Object.entries(u.stats)) add(k, Math.abs(v) >= 1 ? v * (1 + (it.ilvl - u.lvl) * 0.04) : v);
  }
  // round flats
  for (const k of STAT_KEYS) if (s[k]) s[k] = Math.round(s[k]);
  return s;
}

// ---------- names ----------
function itemBaseName(it) {
  const tier = Math.min(4, Math.floor(it.ilvl / 20));
  if (it.kind === 'weapon') return WTYPES[it.base].tiers[tier];
  if (it.kind === 'frame') return FRAME_TIERS[Math.min(9, Math.floor(it.ilvl / 10))];
  if (it.kind === 'barrier') return BARRIER_TIERS[Math.min(9, Math.floor(it.ilvl / 10))];
  if (it.kind === 'unit') return UNIT_TYPES[it.base].name + ' ' + UNIT_GRADES[tier];
  if (it.kind === 'tool') return TOOLS[it.base].name;
  if (it.kind === 'disc') return `Disc: ${TECHS[it.base].name} Lv${it.lv}`;
  if (it.kind === 'gem') return `${GEM_TIERS[it.lv]} ${GEMS[it.base].name}`;
  if (it.kind === 'quest') return it.name;
  return '?';
}
function itemName(it) {
  if (it.unid) return it.rar === 5 ? '????' : 'Unappraised ' + itemBaseName(it);
  let n;
  if (it.name) n = it.name;
  else if (it.rar === 1) { const pre = (it.aff || []).find((a) => findAffix(a.id).pre), suf = (it.aff || []).find((a) => findAffix(a.id).suf); n = (pre ? findAffix(pre.id).pre + ' ' : '') + itemBaseName(it) + (suf ? ' ' + findAffix(suf.id).suf : ''); }
  else n = itemBaseName(it);
  if (it.grind) n += ' +' + it.grind;
  if (it.kind === 'tool' && it.n > 1) n += ' ×' + it.n;
  return n;
}
function itemColor(it) {
  if (it.kind === 'tool') return TOOLS[it.base].use === 'mat' ? '#ffb0ff' : '#c8f0d0';
  if (it.kind === 'disc') return '#a0d8ff';
  if (it.kind === 'gem') return hexCss(GEMS[it.base].color);
  if (it.kind === 'quest') return '#ffb060';
  return RARITY[it.rar || 0].color;
}
function itemValue(it) {
  if (it.kind === 'tool') return TOOLS[it.base].price * (it.n || 1);
  if (it.kind === 'disc') return Math.round(80 + it.lv * it.lv * 25 + (TECHS[it.base].forceOnly ? 400 : 0));
  if (it.kind === 'gem') return [400, 2500, 12000][it.lv];
  if (it.kind === 'quest') return 0;
  const base = 30 + it.ilvl * it.ilvl * 3 + it.ilvl * 20;
  return Math.round(base * [1, 2.2, 4, 7, 8, 12][it.rar || 0] * (1 + (it.grind || 0) * 0.08) * (1 + (it.sockets || 0) * 0.2));
}
const sellPrice = (it) => Math.max(1, Math.round(itemValue(it) / 4));
const buyPrice = (it) => Math.round(itemValue(it) * (it.kind === 'tool' ? 1 : 1.5));

// ---------- generation ----------
function rollAffixes(it, n, rng) {
  const slot = it.kind;
  const pool = AFFIXES.filter((a) => a.slots.includes(slot) && a.lvl <= it.ilvl + 2);
  it.aff = [];
  let pre = 0, suf = 0;
  const maxPre = it.rar === 1 ? 1 : 3, maxSuf = it.rar === 1 ? 1 : 3;
  for (let k = 0; k < 20 && it.aff.length < n; k++) {
    const a = rng.pick(pool);
    if (it.aff.some((q) => q.id === a.id || q.stat === a.stat)) continue;
    if (a.pre && pre >= maxPre) continue; if (a.suf && suf >= maxSuf) continue;
    it.aff.push({ id: a.id, stat: a.stat, v: affixValue(a, it.ilvl, Math.pow(rng(), 0.8)) });
    a.pre ? pre++ : suf++;
  }
}
function rollAttrs(it, rng, area) {
  // family tuning on weapons: extra damage against Wild / Burrower / Mech / Eldritch foes, or Keen (accuracy and crits)
  it.attrs = {};
  const keys = ['wild', 'burrow', 'mech', 'eldritch', 'keen'];
  const n = rng() < 0.45 ? 0 : rng() < 0.6 ? 1 : rng() < 0.75 ? 2 : 3;
  for (let k = 0; k < n; k++) {
    const key = area && rng() < 0.4 ? AREAS[area].family : rng.pick(keys);
    if (it.attrs[key]) continue;
    it.attrs[key] = 5 * rng.int(1, Math.min(10, 2 + Math.floor(it.ilvl / 6)));
  }
}
function makeEquip(kind, ilvl, rar, rng = rnd, opts = {}) {
  const it = { uid: newUid(), kind, ilvl: Math.max(1, Math.round(ilvl)), rar, aff: [], grind: 0 };
  if (kind === 'weapon') {
    it.base = opts.base || rng.pick(WTYPE_ORDER);
    it.maxGrind = 5 + Math.floor(it.ilvl / 6) + (rar >= 2 ? 3 : 0);
    rollAttrs(it, rng, opts.area);
    if (rar >= 1 && rng() < 0.12 + rar * 0.06) it.special = rng.pick(SPECIAL_ORDER.filter((s) => s !== 'frenzy'));
  } else if (kind === 'unit') it.base = opts.base || rng.pick(Object.keys(UNIT_TYPES));
  if (rar === 1) rollAffixes(it, rng() < 0.5 ? 1 : 2, rng);
  if (rar === 2) { rollAffixes(it, rng.int(3, it.ilvl > 20 ? 6 : 5), rng); it.name = rng.pick(RARE_NAME_A) + ' ' + rng.pick(RARE_NAME_B[kind === 'unit' ? 'unit' : kind]); }
  if (kind !== 'unit' && rar <= 2) { const maxS = kind === 'weapon' ? 3 : 2; if (rng() < 0.18 + rar * 0.07) it.sockets = rng.int(1, Math.min(maxS, 1 + Math.floor(it.ilvl / 15))); }
  it.gems = [];
  return it;
}
function makeUnique(u, ilvl, rng = rnd) {
  const kind = u.slot;
  const it = makeEquip(kind, Math.max(ilvl, u.lvl), 4, rng, { base: u.base });
  it.uniq = u.id; it.name = u.name; it.aff = []; it.attrs = kind === 'weapon' ? { [rng.pick(['wild', 'burrow', 'mech', 'eldritch'])]: 20 } : undefined;
  if (u.special) it.special = u.special;
  it.sockets = kind === 'unit' ? 0 : rng.int(0, 1);
  return it;
}
function makeSetPiece(setId, piece, ilvl, rng = rnd) {
  const it = makeEquip(piece.slot, Math.max(ilvl, piece.lvl), 3, rng, { base: piece.base });
  it.uniq = piece.id; it.set = setId; it.name = piece.name; it.aff = [];
  // each piece also carries two fixed affixes for its role
  const fixed = { wayfarer: ['vital', 'strength'], gunner: ['accurate', 'precision'], archon: ['mindful', 'focus'] }[setId];
  for (const id of fixed) { const a = findAffix(id); if (a.slots.includes(piece.slot)) it.aff.push({ id, stat: a.stat, v: affixValue(a, it.ilvl, 0.75) }); }
  if (piece.slot === 'weapon') it.attrs = { keen: 15 };
  it.sockets = 0;
  return it;
}
function makeRelic(r, ilvl, rng = rnd) {
  const it = makeEquip('weapon', Math.max(ilvl, r.lvl), 5, rng, { base: r.base });
  it.uniq = r.id; it.name = r.name; it.mult = r.mult; it.special = r.special; it.maxGrind = r.grind; it.tech = r.tech || 0;
  it.attrs = { ...r.attrs }; for (const k of Object.keys(it.attrs)) it.attrs[k] = Math.min(60, it.attrs[k] + 5 * rng.int(0, 2));
  it.aff = []; it.sockets = 0;
  return it;
}
function makeTool(id, n = 1) { return { uid: newUid(), kind: 'tool', base: id, n }; }
function makeDisc(tech, lv) { return { uid: newUid(), kind: 'disc', base: tech, lv }; }
function makeGem(id, tier) { return { uid: newUid(), kind: 'gem', base: id, lv: tier }; }

// What drops. ctx: { ilvl, mf, sid, area, source, boss, role, diff }
function rollDrop(ctx, rng = rnd) {
  const src = ctx.source || 'monster';
  const ilvl = ctx.ilvl, mf = (ctx.mf || 0) + (DIFFS[ctx.diff || 0].drop - 1);
  // category
  const cats = [['tool', 22], ['weapon', 19], ['frame', 8], ['barrier', 7], ['unit', 8], ['disc', 8], ['gem', 3.5], ['hone1', 2], ['mat', 0.6]];
  if (src === 'boss' || src === 'unique') { cats[0][1] = 12; cats[1][1] = 34; }
  const cat = rng.wpick(cats, (c) => c[1])[0];
  if (cat === 'tool') return rollTool(ilvl, rng);
  if (cat === 'hone1') return makeTool(ilvl >= 30 && rng() < 0.3 ? 'hone3' : ilvl >= 15 && rng() < 0.4 ? 'hone2' : 'hone1');
  if (cat === 'mat') return makeTool(rng.pick(['strTonic', 'psyTonic', 'defTonic', 'evaTonic', 'vigTonic', 'psiTonic', 'luckTonic']));
  if (cat === 'disc') return rollDisc(ilvl, rng, ctx.role);
  if (cat === 'gem') return makeGem(rng.pick(Object.keys(GEMS)), ilvl >= 45 && rng() < 0.35 ? 2 : ilvl >= 18 && rng() < 0.5 ? 1 : 0);
  // equipment rarity
  const boost = { monster: 1, elite: 2.2, unique: 4, boss: 5, box: 0.9, skylark: 6 }[src] || 1;
  const m = boost * (1 + mf);
  const x = rng();
  let rar = 0;
  const pStar = 0.006 * m, pUni = 0.01 * m, pSet = 0.008 * m, pRare = 0.07 * m, pMagic = 0.3 * Math.sqrt(m);
  if (cat === 'weapon' && x < pStar) rar = 5;
  else if (x < pStar + pUni) rar = 4;
  else if (x < pStar + pUni + pSet) rar = 3;
  else if (x < pStar + pUni + pSet + pRare) rar = 2;
  else if (x < pStar + pUni + pSet + pRare + pMagic) rar = 1;
  if (rar === 5) { const s = rollRelic(ilvl, ctx, rng); if (s) return s; rar = 2; }
  if (rar === 4) { const u = UNIQUES.filter((q) => q.lvl <= ilvl + 3 && (cat === 'weapon' ? q.slot === 'weapon' : q.slot !== 'weapon')); if (u.length) { const it = makeUnique(rng.pick(u), ilvl, rng); it.unid = true; return it; } rar = 2; }
  if (rar === 3) { const opts = []; for (const [sid, s] of Object.entries(SETS)) for (const p of s.pieces) if (p.lvl <= ilvl + 4) opts.push([sid, p]); if (opts.length) { const [sid, p] = rng.pick(opts); const it = makeSetPiece(sid, p, ilvl, rng); it.unid = true; return it; } rar = 2; }
  let base;
  if (cat === 'weapon') {
    // weighted toward weapons your class can use, and toward your star sign's favourites
    base = rng.wpick(WTYPE_ORDER, (w) => (ctx.role && ROLES[ctx.role].weapons.includes(w) ? 3 : 1) * (ctx.sid && ctx.sid.favor.includes(w) ? 2 : 1));
  }
  const it = makeEquip(cat, ilvl, rar, rng, { base, area: ctx.area });
  if (rar >= 2) it.unid = true;
  return it;
}
function rollRelic(ilvl, ctx, rng) {
  let pool = RELICS.filter((r) => r.lvl <= ilvl + 2 && (!r.boss || r.boss === ctx.boss));
  if (ctx.source === 'boss') { const b = pool.filter((r) => r.boss === ctx.boss); if (b.length && rng() < 0.7) pool = b; }
  if (!pool.length) return null;
  const r = rng.wpick(pool, (q) => (ctx.sid && q.sid.includes(ctx.sid.id) ? 5 : 1) * (q.boss ? 1.5 : 1) * (ctx.role && ROLES[ctx.role].weapons.includes(q.base) ? 2 : 1));
  const it = makeRelic(r, ilvl, rng); it.unid = true; return it;
}
function rollTool(ilvl, rng) {
  const opts = [['medgel1', 30], ['psicell1', 22], ['medgel2', ilvl >= 8 ? 14 : 0], ['psicell2', ilvl >= 8 ? 10 : 0], ['medgel3', ilvl >= 22 ? 5 : 0], ['psicell3', ilvl >= 22 ? 4 : 0],
    ['purgeSpray', 6], ['reviveShot', 5], ['restorer', ilvl >= 15 ? 1 : 0], ['beacon', 8], ['lifeCharm', 0.25]];
  const id = rng.wpick(opts, (o) => o[1])[0];
  return makeTool(id, 1);
}
function rollDisc(ilvl, rng, role) {
  const techs = TECH_ORDER.filter((t) => t !== 'recall' || rng() < 0.5);
  const id = rng.wpick(techs, (t) => (TECHS[t].forceOnly ? 0.5 : 1) * (t === 'rekindle' ? 0.4 : 1));
  const cap = role ? ROLES[role].techMax : 20;
  const lv = clamp(1 + Math.floor(ilvl / 2.6) + rng.int(-2, 1), 1, 20);
  return makeDisc(id, Math.min(lv, id === 'recall' || id === 'rekindle' ? 1 : 30, Math.max(cap, 1)));
}
function creditsDrop(ilvl, gf, rng = rnd) { return Math.max(1, Math.round((5 + ilvl * 3.2) * rng.range(0.5, 1.5) * (1 + (gf || 0)))); }

// ---------- inventory ----------
const INV_MAX = 30, BANK_MAX = 120;
function invAdd(list, it, max = INV_MAX) {
  if (it.kind === 'tool') {
    const st = TOOLS[it.base].stack;
    for (const o of list) if (o.kind === 'tool' && o.base === it.base && o.n < st) {
      const take = Math.min(st - o.n, it.n); o.n += take; it.n -= take;
      if (it.n <= 0) return true;
    }
  }
  if (list.length >= max) return false;
  list.push(it); return true;
}
function invCount(list, base) { let n = 0; for (const o of list) if (o.kind === 'tool' && o.base === base) n += o.n; return n; }
function invTake(list, base, n = 1) {
  for (let i = list.length - 1; i >= 0 && n > 0; i--) {
    const o = list[i]; if (o.kind !== 'tool' || o.base !== base) continue;
    const k = Math.min(n, o.n); o.n -= k; n -= k; if (o.n <= 0) list.splice(i, 1);
  }
  return n === 0;
}
function invRemove(list, it) { const i = list.indexOf(it); if (i >= 0) list.splice(i, 1); }

// ---------- tooltip ----------
function statLine(k, v) {
  const L = STAT_LABEL[k]; if (!L) return '';
  if (typeof L === 'string') return `${v > 0 ? '+' : ''}${Math.round(v)} ${L}`;
  if (L.p) { const p = Math.round(v * 1000) / 10; return `${p > 0 ? '+' : ''}${p}% ${L.t}`; }
  return `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10} ${L.t}`;
}
function tooltipHTML(it, cmp, char) {
  const c = itemColor(it), lines = [];
  lines.push(`<div class="tt-name" style="color:${c}">${esc(itemName(it))}</div>`);
  let sub = '';
  if (isEquip(it)) sub = (it.kind === 'weapon' ? WTYPES[it.base].name : SLOT_NAMES[it.kind === 'unit' ? 'unit1' : it.kind]) + ' · ' + (it.unid ? 'Unappraised' : RARITY[it.rar].name);
  else if (it.kind === 'tool') sub = TOOLS[it.base].use === 'mat' ? 'Tonic' : 'Tool';
  else if (it.kind === 'disc') sub = 'Art chip · ' + (TECHS[it.base].elem ? ELEM_NAMES[TECHS[it.base].elem] : 'Support');
  else if (it.kind === 'gem') sub = 'Psi crystal · goes in a socket';
  else if (it.kind === 'quest') sub = 'Quest item';
  lines.push(`<div class="tt-sub">${sub}</div>`);
  if (it.unid) { lines.push('<div class="tt-dim">Take it to the Artificer to appraise it.</div>'); if (it.rar === 5) lines.push('<div class="tt-star">Relic</div>'); return lines.join(''); }
  if (it.kind === 'weapon') {
    const d = weaponDamage(it); lines.push(`<div class="tt-big">${d.min}–${d.max} damage</div>`);
    const wt = WTYPES[it.base], spd = wt.speed;
    lines.push(`<div class="tt-dim">${wt.cls === 'melee' ? 'Melee' : wt.cls === 'staff' ? 'Psi bolts' : wt.cls === 'thrown' ? 'Thrown, returns' : 'Ranged'} · ${spd >= 1.25 ? 'very fast' : spd >= 1 ? 'fast' : spd >= 0.85 ? 'medium' : 'slow'}</div>`);
    const at = Object.entries(it.attrs || {}).filter(([, v]) => v);
    if (at.length) lines.push(`<div class="tt-attr">${at.map(([k, v]) => `${FAMILY_NAMES[k]} ${v}%`).join(' · ')}</div>`);
    if (it.special) lines.push(`<div class="tt-special">Special: ${SPECIALS[it.special].name} — ${SPECIALS[it.special].desc}</div>`);
    if (it.maxGrind) lines.push(`<div class="tt-dim">Honed ${it.grind || 0} / ${it.maxGrind}</div>`);
  }
  if (it.kind === 'frame' || it.kind === 'barrier') { const d = armorDefence(it); lines.push(`<div class="tt-big">${d.dfp} DEF · ${d.evp} EVA</div>`); }
  if (it.kind === 'unit') for (const [k, v] of Object.entries(unitImplicit(it))) lines.push(`<div class="tt-big">${statLine(k, v)}</div>`);
  if (isEquip(it)) {
    const st = itemStats(it);
    if (it.kind === 'frame' || it.kind === 'barrier') { const d = armorDefence(it); st.dfp -= d.dfp; st.evp -= d.evp; }
    if (it.kind === 'unit') for (const [k, v] of Object.entries(unitImplicit(it))) st[k] -= v;
    const aff = Object.entries(st).filter(([, v]) => Math.abs(v) > 1e-6).map(([k, v]) => statLine(k, v)).filter(Boolean);
    if (aff.length) lines.push(`<div class="tt-aff">${aff.filter(Boolean).map((a) => `<div>${a}</div>`).join('')}</div>`);
    if (it.sockets) { lines.push(`<div class="tt-sock">${Array.from({ length: it.sockets }, (_, i) => { const g = (it.gems || [])[i]; return g ? `<span class="sock full" style="background:${hexCss(GEMS[g.id].color)}" title="${GEM_TIERS[g.tier]} ${GEMS[g.id].name}"></span>` : '<span class="sock"></span>'; }).join('')} ${it.sockets} socket${it.sockets > 1 ? 's' : ''}</div>`); }
    if (it.set) {
      const S = SETS[it.set], have = char ? setCount(char, it.set) : 0;
      lines.push(`<div class="tt-set">${S.name} (${have}/4)</div>`);
      for (const [n, b] of Object.entries(S.bonus)) lines.push(`<div class="tt-setb ${have >= +n ? 'on' : ''}">${n} pieces: ${Object.entries(b).map(([k, v]) => statLine(k, v)).join(', ')}</div>`);
    }
    const u = it.uniq && (findUnique(it.uniq) || findRelic(it.uniq));
    if (u && u.flavor) lines.push(`<div class="tt-flavor">${esc(u.flavor)}</div>`);
    const rq = reqLevel(it);
    let restrict = '';
    if (it.kind === 'weapon' && char) { const ok = ROLES[char.role].weapons.includes(it.base); restrict = ok ? '' : `<div class="tt-bad">${ROLES[char.role].name}s can't use ${WTYPES[it.base].name}s</div>`; }
    lines.push(`<div class="tt-req ${char && char.level < rq ? 'tt-bad' : ''}">Requires level ${rq}</div>${restrict}`);
  }
  if (it.kind === 'tool') lines.push(`<div class="tt-desc">${TOOLS[it.base].desc}</div>`);
  if (it.kind === 'disc') {
    const T_ = TECHS[it.base]; lines.push(`<div class="tt-desc">${T_.desc}</div><div class="tt-dim">PSI cost ${techCost(it.base, it.lv)}</div>`);
    if (char) { const cur = (char.techs || {})[it.base] || 0, why = discProblem(char, it); lines.push(why ? `<div class="tt-bad">${why}</div>` : `<div class="tt-good">${cur ? `Raises ${T_.name} from Lv${cur} to Lv${it.lv}` : `Learn ${T_.name} Lv${it.lv}`}</div>`); }
  }
  if (it.kind === 'gem') { const g = GEMS[it.base]; lines.push(`<div class="tt-desc">In a weapon: ${Object.entries(g.weapon).map(([k, a]) => statLine(k, a[it.lv])).join(', ')}<br>In armour: ${Object.entries(g.armor).map(([k, a]) => statLine(k, a[it.lv])).join(', ')}</div>`); }
  if (cmp && isEquip(it) && isEquip(cmp) && !cmp.unid) lines.push(compareHTML(it, cmp));
  if (it.kind !== 'quest') lines.push(`<div class="tt-price">Sells for ${fmtNum(sellPrice(it))} credits</div>`);
  return lines.join('');
}
function compareHTML(a, b) {
  const sa = itemStats(a), sb = itemStats(b), keys = new Set([...Object.keys(sa), ...Object.keys(sb)]), out = [];
  if (a.kind === 'weapon' && b.kind === 'weapon') { const da = weaponDamage(a), db = weaponDamage(b), d = Math.round((da.min + da.max - db.min - db.max) / 2); if (d) out.push(`<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d} damage</span>`); }
  for (const k of keys) { const d = (sa[k] || 0) - (sb[k] || 0); if (Math.abs(d) > 1e-6) { const l = statLine(k, d); if (l) out.push(`<span class="${d > 0 === (k !== 'tpCost') ? 'up' : 'down'}">${l}</span>`); } }
  return out.length ? `<div class="tt-cmp"><div class="tt-dim">Compared with equipped:</div>${out.join('')}</div>` : '';
}
function discProblem(char, it) {
  const T_ = TECHS[it.base], cap = ROLES[char.role].techMax;
  if (T_.forceOnly && char.role !== 'psion') return 'Only Psions can learn this.';
  if (T_.support && RACES[char.race].noSupport) return 'Constructs cannot use support arts.';
  if (it.lv > cap) return `${ROLES[char.role].name}s can learn arts up to Lv${cap}.`;
  if (char.level < discReq(it)) return `Requires level ${discReq(it)}.`;
  if ((char.techs[it.base] || 0) >= it.lv) return 'You already know this level.';
  return '';
}
function setCount(char, setId) { let n = 0; for (const s of EQUIP_SLOTS) { const it = char.equip[s]; if (it && it.set === setId && !it.unid) n++; } return n; }
