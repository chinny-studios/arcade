// Ashreach — character window: skills & IP spending, equipment paperdoll, implants & clusters, derived stats

const CW_DOLL = [['back', 1, 1], ['head', 1, 2], ['rshoulder', 2, 1], ['chest', 2, 2], ['lshoulder', 2, 3], ['rarm', 3, 1], ['hands', 3, 2], ['larm', 3, 3], ['rwrist', 4, 1], ['legs', 4, 2], ['lwrist', 4, 3], ['feet', 5, 2]];
const CW_SLOT_LABEL = {
  rhand: 'Right hand', lhand: 'Left hand', head: 'Head', back: 'Back', lshoulder: 'L shoulder', rshoulder: 'R shoulder', chest: 'Chest', larm: 'L arm', rarm: 'R arm',
  lwrist: 'L wrist', rwrist: 'R wrist', hands: 'Hands', legs: 'Legs', feet: 'Feet', util1: 'Utility', util2: 'Utility', util3: 'Utility', deck: 'NM deck',
  eye: 'Eye', ear: 'Ear', waist: 'Waist',
};
const CW_IMP_LABEL = { eye: 'Eye', head: 'Head', ear: 'Ear', rarm: 'R arm', chest: 'Chest', larm: 'L arm', rwrist: 'R wrist', waist: 'Waist', lwrist: 'L wrist', rhand: 'R hand', legs: 'Legs', lhand: 'L hand', feet: 'Feet' };
const CW_IMP_ORDER = ['eye', 'head', 'ear', 'rarm', 'chest', 'larm', 'rwrist', 'waist', 'lwrist', 'rhand', 'legs', 'lhand', 'feet'];
const CW_SOCKETS = ['shiny', 'bright', 'faded'];

function cw_build() {
  uiWin('char', {
    title: 'Character', key: 'C', w: 480, h: 600, x: 14, y: (w, h) => Math.max(10, (innerHeight - h) / 2 - 30),
    tabs: [['skills', 'Skills'], ['equip', 'Equipment'], ['implants', 'Implants'], ['stats', 'Stats']],
    refresh: cw_refresh, live: 0.5,
  });
  cw_regs();
}
function cw_refresh(w) {
  if (!PLAYER || !PLAYER.char) return;
  const f = { skills: cw_skills, equip: cw_equip, implants: cw_implants, stats: cw_stats }[w.tab] || cw_skills;
  ui_set(w.body, f());
}

// ---------- skills ----------
function cw_abilRow(ab) {
  const c = PLAYER.char, S = PLAYER.S, B = (typeof BREEDS !== 'undefined' && BREEDS[c.breed]) || { base: {} };
  const raised = c.abil[ab] || 0;
  const cap = typeof abilityCap === 'function' ? abilityCap(c, ab) : 999;
  const cost = typeof abilityIpCost === 'function' ? abilityIpCost(c, ab) : 0;
  const base = (B.base[ab] || 0) + raised, v = Math.round(S[ab] || 0);
  const can = raised < cap && c.ip >= cost && typeof raiseAbility === 'function';
  return '<div class="srow ab" data-tip="ab:' + ab + '"><span class="sn">' + esc(ui_sn(ab)) + '</span><span class="sv' + (v > base ? ' up' : v < base ? ' dn' : '') + '">' + v + '</span>' +
    '<span class="sc' + (raised >= cap ? ' cap' : '') + '">' + (raised >= cap ? 'cap' : cost) + '</span>' +
    '<button class="pm" data-act="skl:a:' + ab + '"' + (raised > 0 && typeof lowerAbility === 'function' ? '' : ' disabled') + '>−</button>' +
    '<button class="pm" data-act="skr:a:' + ab + '"' + (can ? '' : ' disabled') + '>+</button></div>';
}
function cw_skillRow(id) {
  const c = PLAYER.char, S = PLAYER.S;
  const st = typeof skillStat === 'function' ? skillStat(id) : id;
  const raised = c.skill[id] || 0;
  const cap = typeof skillCap === 'function' ? skillCap(c, id) : 999;
  const cost = typeof skillIpCost === 'function' ? skillIpCost(c, id) : 0;
  const v = Math.round(S[st] || 0), base = cw_skillBase(id);
  const can = raised < cap && c.ip >= cost && typeof raiseSkill === 'function';
  return '<div class="srow" data-tip="sk:' + id + '"><span class="sn">' + esc(SKILLS[id].name) + '</span><span class="sv' + (v > base.total ? ' up' : v < base.total ? ' dn' : '') + '">' + v + '</span>' +
    '<span class="sc' + (raised >= cap ? ' cap' : '') + '">' + (raised >= cap ? 'cap' : cost) + '</span>' +
    '<button class="pm" data-act="skl:s:' + id + '"' + (raised > 0 && typeof lowerSkill === 'function' ? '' : ' disabled') + '>−</button>' +
    '<button class="pm" data-act="skr:s:' + id + '"' + (can ? '' : ' disabled') + '>+</button></div>';
}
// Base/trickle/IP parts of a skill, mirroring computeStats (5 base + raised + floor(weighted abilities / 4)).
function cw_skillBase(id) {
  const c = PLAYER.char, S = PLAYER.S, sk = SKILLS[id];
  let sum = 0;
  for (const a in sk.trickle) sum += sk.trickle[a] * (S[a] || 0);
  const trickle = Math.floor(sum / 4), raised = c.skill[id] || 0;
  return { base: 5, trickle, raised, total: 5 + trickle + raised };
}
function cw_skills() {
  const c = PLAYER.char;
  if (typeof SKILL_CATS === 'undefined') return '<div class="empty">Skill data is not loaded.</div>';
  const tl = typeof titleLevel === 'function' ? titleLevel(c.level) : 1;
  let h = '<div class="ipbox"><div><div class="big">' + fmtInt(c.ip) + '</div><div class="lab">Unspent IP</div></div><div class="sp"></div>' +
    '<div class="note" style="text-align:right">Level <b class="amb">' + c.level + '</b> · Title level ' + tl + '<br>' + esc(ui_breedName(c.breed)) + ' ' + esc(ui_profName(c.prof)) + '<br><span class="dim">Shift-click +/− for 10 points</span></div></div>';
  h += '<div class="srow" style="color:var(--faint);font-size:10px;letter-spacing:.12em;text-transform:uppercase"><span>Ability / skill</span><span style="text-align:right">Value</span><span style="text-align:right">IP</span><span></span><span></span></div>';
  const shutA = UI.store.shut['abil'];
  h += '<div class="scat' + (shutA ? ' shut' : '') + '" data-act="scat:abil"><span class="ar">▼</span>Abilities</div>';
  if (!shutA) h += ABILITY_IDS.map(cw_abilRow).join('');
  for (const cat of SKILL_CATS) {
    const shut = UI.store.shut[cat.id];
    h += '<div class="scat' + (shut ? ' shut' : '') + '" data-act="scat:' + cat.id + '"><span class="ar">▼</span>' + esc(cat.name) + '</div>';
    if (!shut) h += cat.skills.map(cw_skillRow).join('');
  }
  return h;
}
function cw_change(arg, up, n) {
  const c = PLAYER.char, [k, id] = [arg.slice(0, 1), arg.slice(2)];
  const fn = k === 'a' ? (up ? (typeof raiseAbility === 'function' && raiseAbility) : (typeof lowerAbility === 'function' && lowerAbility))
    : (up ? (typeof raiseSkill === 'function' && raiseSkill) : (typeof lowerSkill === 'function' && lowerSkill));
  if (!fn) { ui_missing('Raising skills'); return; }
  let done = 0;
  for (let i = 0; i < n; i++) { if (!fn(c, id)) break; done++; }
  if (!done && up) {
    const cap = k === 'a' ? abilityCap(c, id) : skillCap(c, id), cur = k === 'a' ? c.abil[id] : c.skill[id];
    ui_toast(cur >= cap ? 'That is at its cap for your level.' : 'Not enough IP.');
  }
  if (done) {
    if (typeof refreshStats === 'function') refreshStats(PLAYER);
    if (typeof sfx === 'function') sfx('ui_click');
    HUD.ipNag = false;
  }
  ui_refreshWin(UI.wins.char);
}
function cw_tipSkill(id, isAb) {
  const c = PLAYER.char, S = PLAYER.S;
  if (isAb) {
    const B = BREEDS[c.breed], raised = c.abil[id] || 0, base = B.base[id] || 0, v = Math.round(S[id] || 0);
    const cap = abilityCap(c, id), cost = abilityIpCost(c, id);
    return ui_tipHead(ui_sn(id), '#5fe0d0', 'Ability') + '<div class="kv"><span>Breed base</span><span>' + base + '</span><span>Raised with IP</span><span>' + raised + ' / ' + cap + '</span>' +
      '<span>Gear & buffs</span><span class="' + (v - base - raised >= 0 ? 'ok' : 'no') + '">' + cw_sgn(v - base - raised) + '</span><span><b>Total</b></span><span><b>' + v + '</b></span></div><hr>' +
      '<div class="tr dim">Next point: ' + cost + ' IP · cost factor ' + B.abilityCost[id] + '</div>';
  }
  const sk = SKILLS[id], st = typeof skillStat === 'function' ? skillStat(id) : id, b = cw_skillBase(id), v = Math.round(S[st] || 0);
  const cap = skillCap(c, id), cost = skillIpCost(c, id), tier = typeof skillTier === 'function' ? skillTier(c, id) : null;
  const tr = Object.keys(sk.trickle).map((a) => Math.round(sk.trickle[a] * 100) + '% ' + a.toUpperCase()).join(', ');
  return ui_tipHead(sk.name, '#5fe0d0', esc(sk.cat) + (tier ? ' · cost factor ' + tier : '')) +
    '<div class="kv"><span>Base</span><span>' + b.base + '</span><span>Trickle-down</span><span>' + b.trickle + '</span><span>Raised with IP</span><span>' + b.raised + ' / ' + cap + '</span>' +
    '<span>Gear & buffs</span><span class="' + (v - b.total >= 0 ? 'ok' : 'no') + '">' + cw_sgn(v - b.total) + '</span><span><b>Total</b></span><span><b>' + v + '</b></span></div><hr>' +
    '<div class="tr dim">Trickle from ' + tr + '<br>Next point: ' + cost + ' IP</div>';
}
const cw_sgn = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(Math.round(n));

// ---------- equipment ----------
function cw_slotCell(slot, item, kind) {
  const bad = item && typeof itemReqsMet === 'function' && !itemReqsMet(PLAYER.S, item).ok;
  return '<div class="cell lbl' + (bad ? ' bad' : '') + '" data-l="' + esc(CW_SLOT_LABEL[slot] || slot) + '" data-drop="' + kind + ':' + slot + '"' +
    (item ? ' data-drag="' + kind + ':' + slot + '" data-tip="' + kind + ':' + slot + '" data-ctx="' + kind + ':' + slot + '"' : ' data-tip="text:' + esc(CW_SLOT_LABEL[slot] || slot) + ' (empty)"') + '>' +
    (item ? ui_icon(item.icon) + '<span class="ql">' + item.ql + '</span>' : '') + '</div>';
}
function cw_equip() {
  const eq = PLAYER.char.equip;
  let h = '<div class="eqwrap"><div class="eqside"><div class="hd">Weapons</div>' + cw_slotCell('rhand', eq.rhand, 'eq') + cw_slotCell('lhand', eq.lhand, 'eq') + '</div>';
  h += '<div><div class="hd">Armour</div><div class="doll">' + CW_DOLL.map(([s, r, col]) => '<div style="grid-row:' + r + ';grid-column:' + col + '">' + cw_slotCell(s, eq[s], 'eq') + '</div>').join('') + '</div></div>';
  h += '<div class="eqside"><div class="hd">Utility</div>' + ['util1', 'util2', 'util3', 'deck'].map((s) => cw_slotCell(s, eq[s], 'eq')).join('') + '</div></div>';
  h += '<div class="note" style="margin-top:10px;text-align:center">Drag items from your inventory onto a slot. Drag back or right-click to unequip. Red frames mark gear whose requirements you no longer meet.</div>';
  const w = eq.rhand || eq.lhand;
  if (typeof attackStats === 'function') {
    const A = attackStats(PLAYER);
    h += '<div class="wpn"><div class="row"><b>' + esc(w ? w.name : 'Unarmed') + '</b><span class="sp"></span><span class="mono dim">' + esc(ui_sn(A.w ? A.w.skill : 'martial_arts')) + '</span></div>' +
      '<div class="kv" style="margin-top:3px"><span>Attack rating</span><span>' + Math.round(A.ar) + '</span><span>Damage</span><span>' + A.dmg[0] + '–' + A.dmg[1] + ' ' + (CHAT_TYPE[A.type] || A.type) + '</span>' +
      '<span>Attack cycle</span><span>' + A.cycle.toFixed(2) + ' s</span><span>Range</span><span>' + Math.round(A.range * 10) / 10 + ' m</span></div></div>';
  }
  return h;
}

// ---------- implants ----------
function cw_implants() {
  const im = PLAYER.char.implants || {};
  let h = '<div class="note" style="margin-bottom:8px">Implants need Treatment and an ability. Drag an implant onto its body slot; drag a cluster onto a matching socket (shiny · bright · faded).</div><div class="imps">';
  for (const s of CW_IMP_ORDER) {
    const it = im[s];
    h += '<div class="imp"><div class="cell lbl' + (it && typeof itemReqsMet === 'function' && !itemReqsMet(PLAYER.S, it).ok ? ' bad' : '') + '" data-l="' + CW_IMP_LABEL[s] + '" data-drop="imp:' + s + '"' +
      (it ? ' data-drag="imp:' + s + '" data-tip="imp:' + s + '" data-ctx="imp:' + s + '"' : ' data-tip="text:' + CW_IMP_LABEL[s] + ' implant slot (empty)"') + '>' + (it ? ui_icon(it.icon) + '<span class="ql">' + it.ql + '</span>' : '') + '</div><div class="soc">';
    for (const col of CW_SOCKETS) {
      const cl = it && it.clusters && it.clusters[col];
      h += '<div class="so s-' + col + (cl ? ' f' : '') + '" data-drop="sock:' + s + ':' + col + '" data-tip="sock:' + s + ':' + col + '"' + (cl ? ' data-ctx="sock:' + s + ':' + col + '"' : '') + '>' +
        (cl ? esc(cw_short(cl.stat)) : col) + '</div>';
    }
    h += '</div></div>';
  }
  h += '</div>';
  return h;
}
function cw_short(stat) {
  const n = ui_sn(stat);
  const ab = { Strength: 'STR', Agility: 'AGI', Stamina: 'STA', Intelligence: 'INT', Sense: 'SEN', Psyche: 'PSY' }[n];
  if (ab) return ab;
  return n.split(/\s+/).map((w, i, a) => (a.length > 1 ? w.slice(0, 3) : w.slice(0, 7))).join('').slice(0, 7);
}

// ---------- stats ----------
function cw_stats() {
  const S = PLAYER.S, c = PLAYER.char;
  const used = typeof ncuUsed === 'function' ? ncuUsed(PLAYER) : 0;
  const kv = (rows) => '<div class="kv">' + rows.map(([k, v]) => '<span>' + esc(k) + '</span><span>' + v + '</span>').join('') + '</div>';
  let h = '<div class="stg"><div><div class="hd">Vitals</div>' + kv([
    ['Health', fmtInt(PLAYER.hp) + ' / ' + fmtInt(S.maxHp)], ['Nano', fmtInt(PLAYER.np) + ' / ' + fmtInt(S.maxNp)],
    ['Health delta', ui_fmt(S.hpRegen) + ' /s'], ['Nano delta', ui_fmt(S.npRegen) + ' /s'],
    ['Nano Memory', used + ' / ' + fmtInt(S.ncu)], ['Run speed', ui_fmt(S.runSpeed) + ' m/s'],
  ]) + '<div class="hd">Offence</div>' + kv([
    ['Critical chance', ui_fmt(S.critPct) + '%'], ['Added damage', '+' + ui_fmt(S.addDmg || 0)],
    ['Nano cost', '−' + ui_fmt(S.nanoCost || 0) + '%'], ['Nano init', ui_fmt(S.nanoInit || 0)],
  ]);
  if (typeof defenseRating === 'function') h += '<div class="hd">Defence</div>' + kv([['vs ranged', Math.round(defenseRating(PLAYER, 'ranged'))], ['vs melee', Math.round(defenseRating(PLAYER, 'melee'))], ['vs nanos', Math.round(defenseRating(PLAYER, 'nano'))]]);
  h += '</div><div><div class="hd">Armour class</div>' + kv(['melee', 'proj', 'energy', 'chem', 'rad', 'cold', 'fire', 'poison'].map((t) => [cap1(CHAT_TYPE[t] || t), fmtInt(S['ac_' + t] || 0)]));
  h += '<div class="hd">Character</div>' + kv([['Breed', esc(ui_breedName(c.breed))], ['Profession', esc(ui_profName(c.prof))], ['Faction', esc((typeof FACTIONS !== 'undefined' && FACTIONS[c.faction] ? FACTIONS[c.faction].name : c.faction))],
    ['Level', c.level], ['Credits', fmtInt(c.credits)], ['Nano programs', c.nanos.length]]) + '</div></div>';
  if (typeof attackStats === 'function') {
    const A = attackStats(PLAYER), eq = c.equip;
    h += '<div class="hd">Weapons</div>';
    const wl = [eq.rhand, eq.lhand && eq.lhand.kind === 'weapon' ? eq.lhand : null].filter(Boolean);
    if (!wl.length) wl.push(null);
    for (const w of wl) {
      const prim = w === (eq.rhand || eq.lhand || null);
      const sk = w ? w.skill : 'martial_arts';
      h += '<div class="wpn"><div class="row"><b>' + esc(w ? w.name : 'Unarmed') + '</b><span class="sp"></span><span class="mono dim">' + (w ? 'QL ' + w.ql : '') + '</span></div>' + kv([
        ['Attack rating (' + ui_sn(sk) + ')', Math.round(prim ? A.ar : (S[sk] || 0))],
        ['Damage', (prim ? A.dmg : w.dmg).join('–') + ' ' + (CHAT_TYPE[prim ? A.type : w.dmgType] || '')],
        ['Cycle', prim ? A.cycle.toFixed(2) + ' s' : (w.atk + w.rech).toFixed(2) + ' s'],
        ['Specials', ((prim ? A.specials : w.specials) || []).map(ui_specialName).join(', ') || '—'],
      ]) + '</div>';
    }
  }
  return h;
}

// ---------- registries ----------
function cw_regs() {
  UI.acts.skr = (a, el, ev) => cw_change(a, true, ev.shiftKey ? 10 : 1);
  UI.acts.skl = (a, el, ev) => cw_change(a, false, ev.shiftKey ? 10 : 1);
  UI.acts.scat = (id) => { UI.store.shut[id] = !UI.store.shut[id]; ui_save(); ui_refreshWin(UI.wins.char); };
  UI.tips.sk = (id) => (PLAYER && SKILLS[id] ? cw_tipSkill(id, false) : null);
  UI.tips.ab = (id) => (PLAYER ? cw_tipSkill(id, true) : null);
  // equipment
  UI.tips.eq = (slot) => { const it = PLAYER && PLAYER.char.equip[slot]; return it ? inv_tip(it, 'Right-click or drag to your inventory to unequip') : null; };
  UI.drags.eq = (slot) => { const it = PLAYER.char.equip[slot]; return it ? { kind: 'equip', slot, item: it, icon: ui_icon(it.icon) } : null; };
  UI.ctxs.eq = (slot) => cw_unequip(slot);
  UI.dropOk.eq = (slot, p) => {
    if (p.kind !== 'item' || !p.item || !(p.item.slots || []).includes(slot) || p.item.kind === 'implant') return null;
    return typeof itemReqsMet === 'function' ? itemReqsMet(PLAYER.S, p.item).ok : true;
  };
  UI.drops.eq = (slot, p) => {
    if (p.kind !== 'item' || !p.item) return;
    if (typeof equip !== 'function') { ui_missing('Equipping'); return; }
    if (typeof sfx === 'function') sfx('ui_click');
    ui_res(equip(PLAYER, p.item, slot));
  };
  // implants
  UI.tips.imp = (slot) => { const it = PLAYER && PLAYER.char.implants[slot]; return it ? inv_tip(it, 'Right-click or drag to your inventory to remove') : null; };
  UI.drags.imp = (slot) => { const it = PLAYER.char.implants[slot]; return it ? { kind: 'implant', slot, item: it, icon: ui_icon(it.icon) } : null; };
  UI.ctxs.imp = (slot) => cw_unimplant(slot);
  UI.dropOk.imp = (slot, p) => {
    if (p.kind !== 'item' || !p.item || p.item.kind !== 'implant') return null;
    if (p.item.slot !== slot && !(p.item.slots || []).includes(slot)) return null;
    return typeof itemReqsMet === 'function' ? itemReqsMet(PLAYER.S, p.item).ok : true;
  };
  UI.drops.imp = (slot, p) => {
    if (p.kind !== 'item' || !p.item) return;
    if (p.item.kind === 'cluster') { const it = PLAYER.char.implants[slot]; if (it) cw_insert(it, p.item, p.item.socket); return; }
    if (p.item.kind !== 'implant') { ui_toast('Only implants go there.'); return; }
    if (typeof implant !== 'function') { ui_missing('Implanting'); return; }
    ui_res(implant(PLAYER, p.item, slot));
  };
  UI.tips.sock = (a) => {
    const [slot, col] = a.split(':'), it = PLAYER && PLAYER.char.implants[slot], cl = it && it.clusters && it.clusters[col];
    if (cl) return inv_tip(cl, 'Right-click to pull the cluster out');
    return ui_tipHead(cap1(col) + ' socket', ({ shiny: '#ffd24a', bright: '#7fe0ff', faded: '#b0b8bc' })[col], it ? 'Empty' : 'No implant in this slot') +
      (it && typeof IMPLANT_TABLE !== 'undefined' && IMPLANT_TABLE[it.slot] ? '<div class="tl">Accepts: ' + IMPLANT_TABLE[it.slot][col].map(ui_sn).map(esc).join(', ') + '</div>' : '');
  };
  UI.dropOk.sock = (a, p) => {
    if (p.kind !== 'item' || !p.item || p.item.kind !== 'cluster') return null;
    const [slot, col] = a.split(':'), it = PLAYER.char.implants[slot];
    return !!it && typeof clusterFits === 'function' && clusterFits(it, p.item, col) && !it.clusters[col] && p.item.ql <= it.ql;
  };
  UI.drops.sock = (a, p) => {
    const [slot, col] = a.split(':'), it = PLAYER.char.implants[slot];
    if (!it) { ui_toast('Put an implant in that slot first.'); return; }
    if (p.kind === 'item' && p.item && p.item.kind === 'cluster') cw_insert(it, p.item, col);
  };
  UI.ctxs.sock = (a) => {
    const [slot, col] = a.split(':'), it = PLAYER.char.implants[slot], cl = it && it.clusters[col];
    if (!cl || typeof removeCluster !== 'function') return;
    ui_confirm('Pull the ' + esc(ui_sn(cl.stat)) + ' cluster out of your ' + esc(CW_IMP_LABEL[slot]) + ' implant?', () => {
      const got = removeCluster(it, col);
      if (got && typeof addItem === 'function' && !addItem(PLAYER, got)) it.clusters[col] = got;
      if (typeof refreshStats === 'function') refreshStats(PLAYER);
      EV.emit('inv', PLAYER);
    }, 'Remove');
  };
}
function cw_insert(implantItem, cluster, socket) {
  if (typeof insertCluster !== 'function') { ui_missing('Cluster insertion'); return; }
  const r = insertCluster(implantItem, cluster, socket, PLAYER.S);
  if (!r || !r.ok) { ui_res(r); return; }
  if (typeof removeItem === 'function') removeItem(PLAYER, cluster);
  if (typeof refreshStats === 'function') refreshStats(PLAYER);
  EV.emit('log', r.msg, 'info');
  EV.emit('inv', PLAYER);
  if (typeof sfx === 'function') sfx('buff');
}
function cw_unequip(slot) {
  if (typeof unequip !== 'function') { ui_missing('Unequipping'); return; }
  unequip(PLAYER, slot);
}
function cw_unimplant(slot) {
  if (typeof unimplant !== 'function') { ui_missing('Removing implants'); return; }
  unimplant(PLAYER, slot);
}
