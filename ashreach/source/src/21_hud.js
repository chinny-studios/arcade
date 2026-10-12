// Ashreach — HUD: unit frames, team, cast bar, hotbars, specials, buffs, minimap, XP bar, nameplates, floating combat text

const HUD = {
  el: {}, bars: {}, hot: [], hotSig: '', spSig: '', buffSig: '', tbuffSig: '', teamSig: '', teamEls: [], dirty: true,
  map: null, mapZone: null, mmT: 0, cast: { show: 0, state: '', name: '' }, plates: new Map(), platePool: [], fct: [], alerts: {},
  W: 1280, H: 720, pv: new THREE.Vector3(), slowT: 0,
};
const HUD_ACTIONS = {
  attack: { name: 'Attack', glyph: '⚔', color: '#ff7a5a', desc: 'Toggle auto-attack on your target (` key).' },
  sit: { name: 'Sit', glyph: '⤓', color: '#9fd0ff', desc: 'Sit down to regenerate health and nano faster (X key).' },
  follow: { name: 'Follow', glyph: '➜', color: '#7dff9a', desc: 'Follow your current target.' },
  assist: { name: 'Assist', glyph: '⊕', color: '#ffd36a', desc: 'Target what your target is attacking.' },
};
const HUD_MICRO = [
  ['char', 'C', 'Character', '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c0-4 3-6 7-6s7 2 7 6"/>'],
  ['inv', 'I', 'Inventory', '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>'],
  ['nanos', 'N', 'Nano programs', '<path d="M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 16.6 6.4 20l1.6-6.3-5-4.2 6.5-.5z"/>'],
  ['map', 'M', 'Map', '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>'],
  ['team', 'T', 'Team', '<path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5"/>'],
  ['missions', 'J', 'Missions', '<path d="M6 3h9l4 4v14H6zM9 10h7M9 14h7M9 18h4"/>'],
  ['options', 'Esc', 'Options', '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19 12l2-1-1-3-2 .2-1.3-1.3.2-2-3-1-1 2h-1.8l-1-2-3 1 .2 2L6 7.2 4 7 3 10l2 1v1.8l-2 1 1 3 2-.2 1.3 1.3-.2 2 3 1 1-2h1.8l1 2 3-1-.2-2 1.3-1.3 2 .2 1-3-2-1z"/>'],
  ['help', 'F1', 'Help', '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>'],
];

// ---------- build ----------
function hud_build() {
  const H = ui_h('div', null, null, UI.root); H.id = 'hud';
  UI.hudEl = H;
  const E = HUD.el;
  E.plates = ui_h('div', 'nolayer', null, H); E.plates.id = 'nplates';
  E.fct = ui_h('div', 'nolayer', null, H); E.fct.id = 'fctl';
  // player frame
  E.pf = ui_h('div', 'uf pnl', '<div class="un"><span class="lv"></span><span class="nm"></span><span class="sub"></span></div>' +
    '<div class="bar hp"><i class="lag"></i><i></i><b></b></div><div class="bar np"><i class="lag"></i><i></i><b></b></div>', H);
  E.pf.id = 'pf';
  E.pf.dataset.tip = 'self:';
  E.pf.dataset.act = 'selftgt:';
  HUD.bars.php = hud_barRef(E.pf.querySelector('.hp')); HUD.bars.pnp = hud_barRef(E.pf.querySelector('.np'));
  E.buffs = ui_h('div', null, null, H); E.buffs.id = 'buffs';
  // target frame
  E.tf = ui_h('div', 'uf pnl', '<div class="un"><span class="lv"></span><span class="nm"></span><span class="sub"></span></div>' +
    '<div class="bar hp"><i class="lag"></i><i></i><b></b></div><div class="bar np"><i></i><b></b></div><div class="tinfo"></div>' +
    '<div class="bar cb tcast" hidden><i></i><b></b></div><div class="tbuffs"></div>', H);
  E.tf.id = 'tf'; E.tf.hidden = true;
  HUD.bars.thp = hud_barRef(E.tf.querySelector('.hp')); HUD.bars.tnp = hud_barRef(E.tf.querySelector('.np'));
  HUD.bars.tcast = hud_barRef(E.tf.querySelector('.tcast'));
  E.tot = ui_h('div', 'uf pnl', '<div class="un"><span class="nm"></span></div><div class="bar hp sm"><i></i><b></b></div>', H);
  E.tot.id = 'tot'; E.tot.hidden = true;
  E.tot.dataset.act = 'tot:';
  E.tot.dataset.tip = 'text:Target of target · click to select';
  HUD.bars.tot = hud_barRef(E.tot.querySelector('.bar'));
  E.team = ui_h('div', null, null, H); E.team.id = 'team';
  // cast bar
  E.cast = ui_h('div', 'pnl', '<div class="cn"></div><div class="bar cb"><i></i><b></b></div>', H);
  E.cast.id = 'castbar'; E.cast.hidden = true;
  HUD.bars.cast = hud_barRef(E.cast.querySelector('.bar'));
  // hotbars + specials
  E.bars = ui_h('div', null, null, H); E.bars.id = 'bars';
  E.sp = ui_h('div', 'pnl', null, E.bars); E.sp.id = 'specials';
  for (let r = 0; r < 2; r++) {
    const row = ui_h('div', 'hb pnl', null, E.bars);
    for (let i = 0; i < 10; i++) {
      const n = r * 10 + i, key = (r ? '⇧' : '') + ((i + 1) % 10);
      const c = ui_h('div', 'cell', '<span class="k">' + key + '</span><div class="ic"></div><div class="cd"></div><span class="ct"></span>', row);
      for (const a of ['drop', 'drag', 'act', 'ctx', 'tip']) c.setAttribute('data-' + a, 'hot:' + n);
      HUD.hot.push({ el: c, ic: c.querySelector('.ic'), cd: c.querySelector('.cd'), ct: c.querySelector('.ct'), cdv: -1, cdt: '', ctv: '', cls: '' });
    }
  }
  // micro menu
  E.micro = ui_h('div', 'pnl', HUD_MICRO.map(([id, k, name, svg]) =>
    '<button class="mb" data-act="win:' + id + '" data-tip="text:' + name + ' (' + k + ')" data-mb="' + id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + svg + '</svg><span class="k">' + k + '</span></button>').join(''), H);
  E.micro.id = 'micro';
  // xp bar
  E.xp = ui_h('div', null, '<i></i>' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => '<s style="left:' + i * 10 + '%"></s>').join('') + '<b></b>', H);
  E.xp.id = 'xpbar';
  E.xpFill = E.xp.querySelector('i'); E.xpTxt = E.xp.querySelector('b');
  E.xp.dataset.tip = 'xp:';
  // minimap
  E.mm = ui_h('div', 'pnl', '<div class="mzn"><span></span></div><canvas width="368" height="368"></canvas>' +
    '<div class="mft"><span class="mc"></span><span class="sp"></span><button class="pm" data-act="mm:rot" data-tip="text:Rotate with heading / north up">↻</button><button class="pm" data-act="mm:out" data-tip="text:Zoom out">−</button><button class="pm" data-act="mm:in" data-tip="text:Zoom in">+</button></div>', H);
  E.mm.id = 'mm';
  E.mmName = E.mm.querySelector('.mzn span'); E.mmCoord = E.mm.querySelector('.mc');
  E.mmCv = E.mm.querySelector('canvas'); E.mmCx = E.mmCv.getContext('2d');
  E.mmCv.dataset.act = 'win:map'; E.mmCv.dataset.tip = 'text:Open the map (M)';
  // toasts + banner live outside the HUD so they also work over the title screens
  UI.toastEl = ui_h('div', null, null, UI.root); UI.toastEl.id = 'toast';
  UI.bannerEl = ui_h('div', null, null, UI.root); UI.bannerEl.id = 'banner';
  hud_regs();
  hud_events();
}
function hud_barRef(el) { return { el, fill: el.querySelector('i:not(.lag)'), lag: el.querySelector('i.lag'), txt: el.querySelector('b'), f: -1, s: null }; }
function hud_setBar(b, f, s) {
  f = clamp(isFinite(f) ? f : 0, 0, 1);
  if (Math.abs(f - b.f) > 0.001) {
    b.fill.style.transform = 'scaleX(' + f.toFixed(4) + ')';
    if (b.lag) b.lag.style.transform = 'scaleX(' + Math.max(f, f < b.f ? b.f : f).toFixed(4) + ')';
    if (b.lag && f < b.f) { const L = b.lag; requestAnimationFrame(() => { L.style.transform = 'scaleX(' + f.toFixed(4) + ')'; }); }
    else if (b.lag) b.lag.style.transform = 'scaleX(' + f.toFixed(4) + ')';
    b.f = f;
  }
  if (b.txt && s !== b.s) { b.txt.textContent = s; b.s = s; }
}
const hud_txt = (el, s) => { if (el._t !== s) { el.textContent = s; el._t = s; } };
function hud_dirty() { HUD.dirty = true; }
function hud_alert(id) { HUD.alerts[id] = true; hud_microSync(); }
function hud_microSync() {
  if (!HUD.el.micro) return;
  for (const b of HUD.el.micro.children) {
    const id = b.dataset.mb, w = UI.wins[id];
    if (w && w.open) HUD.alerts[id] = false;
    b.classList.toggle('on', !!(w && w.open));
    b.classList.toggle('alert', !!HUD.alerts[id] || (id === 'char' && PLAYER && PLAYER.char && PLAYER.char.ip > 0 && PLAYER.char.level > 1 && !(w && w.open) && HUD.ipNag));
  }
}

// ---------- names, colours ----------
function hud_entColor(e) {
  if (!e) return '#fff';
  if (e === PLAYER) return '#8ff3e6';
  if (PLAYER && e.team && e.team === PLAYER.team && e.kind !== 'mob') return '#8dff9e';
  if (e.kind === 'mob') return e.dead ? '#888' : uiCon(e.level);
  if (e.kind === 'npc') return '#ffe9a8';
  if (e.kind === 'pet') return e.owner === PLAYER ? '#bfe8ff' : '#c8d0d8';
  return uiFactionColor(e.faction);
}
function hud_entSub(e) {
  if (e.kind === 'mob') {
    const T = e.tpl || {};
    return (T.named ? 'Named · ' : '') + ({ melee: 'Melee', ranged: 'Ranged', caster: 'Caster' }[T.arch] || '') + (T.aggro ? ' · Aggressive' : '');
  }
  if (e.kind === 'npc') return hud_npcTitle(e);
  if (e.kind === 'pet') return 'Pet' + (e.owner ? ' of ' + e.owner.name : '');
  if (e.char) return ui_profName(e.char.prof) + ' · ' + ((typeof FACTIONS !== 'undefined' && FACTIONS[e.faction]) ? FACTIONS[e.faction].name : cap1(e.faction || ''));
  return '';
}
function hud_npcTitle(e) {
  if (e.title) return e.title;
  if (e.role === 'vendor') return ({ weapons: 'Weapons', armor: 'Armour', nanos: 'Nano programs', implants: 'Implants & clusters', general: 'General goods' }[e.stockKind] || cap1(String(e.stockKind || 'General'))) + ' vendor';
  return { terminal: 'Mission terminal', clonebay: 'Clone bay', hopper: 'Hopper pad', shuttle: 'Shuttle', bank: 'Bank', trainer: 'Trainer', door: 'Entrance', pylon: 'Lumen pylon' }[e.role] || '';
}
function hud_nanoIcon(n) { return n && n.icon ? n.icon : { glyph: '✦', color: n && n.school && typeof NANO_SCHOOLS !== 'undefined' && NANO_SCHOOLS[n.school] ? NANO_SCHOOLS[n.school].color : '#7fd0ff' }; }

// ---------- hotbar entries ----------
function hud_itemFor(en) {
  const inv = PLAYER.char.inv;
  return inv.find((i) => String(i.uid) === String(en.uid)) || (en.t ? inv.find((i) => i.t === en.t) : null) || null;
}
function hud_resolve(en) {
  if (!en || !PLAYER) return null;
  switch (en.type) {
    case 'nano': {
      const n = ui_nano(en.id);
      if (!n) return null;
      const ok = PLAYER.char.nanos.includes(en.id) && (typeof nanoReqMet !== 'function' || nanoReqMet(PLAYER.S, n));
      const cost = typeof nanoCostFor === 'function' ? nanoCostFor(PLAYER, n) : n.cost || 0;
      return { icon: hud_nanoIcon(n), name: n.name, cd: 'n:' + en.id, cdDef: n.recharge, na: !ok || PLAYER.np < cost, act: PLAYER.cast && PLAYER.cast.nano === en.id };
    }
    case 'item': {
      const it = hud_itemFor(en);
      const inv = PLAYER.char.inv;
      let count = 0;
      if (it) for (const i of inv) if (i.t === it.t && i.ql === it.ql) count += i.stack || 1;
      const cd = it && it.use ? 'item:' + (it.use.np ? 'np' : it.use.heal ? 'hp' : it.t) : null;
      return { icon: it ? it.icon : (en.icon || { glyph: '?', color: '#666' }), name: it ? it.name : (en.name || 'Item'), cd, na: !it, count: it && (count > 1 || it.kind === 'consumable') ? count : 0 };
    }
    case 'special': {
      const S = typeof SPECIALS !== 'undefined' && SPECIALS[en.id];
      const avail = typeof specialsFor === 'function' ? specialsFor(PLAYER).includes(en.id) : true;
      return { icon: { glyph: S ? S.glyph : '✶', color: '#ffb347' }, name: ui_specialName(en.id), cd: en.id, na: !avail };
    }
    case 'action': {
      const A = HUD_ACTIONS[en.id];
      if (!A) return null;
      return { icon: { glyph: A.glyph, color: A.color }, name: A.name, act: (en.id === 'attack' && PLAYER.attacking) || (en.id === 'sit' && PLAYER.sitting) };
    }
  }
  return null;
}
function hud_cdFrac(key, def) {
  if (!key || !PLAYER.cds) return [0, 0];
  const t = PLAYER.cds[key] || 0;
  if (t <= 0) return [0, 0];
  const max = (PLAYER.cdMax && PLAYER.cdMax[key]) || def || t;
  return [clamp(t / max, 0, 1), t];
}
function hud_hotbar() { const c = PLAYER.char; if (!c.hotbar) c.hotbar = new Array(20).fill(null); while (c.hotbar.length < 20) c.hotbar.push(null); return c.hotbar; }
function hud_useSlot(i) {
  if (!PLAYER || PLAYER.dead) return;
  const en = hud_hotbar()[i];
  const s = HUD.hot[i];
  if (s) { s.el.classList.remove('flash'); void s.el.offsetWidth; s.el.classList.add('flash'); }
  if (en) hud_useEntry(en);
}
function hud_useEntry(en) {
  switch (en.type) {
    case 'nano':
      if (typeof castNano === 'function') castNano(PLAYER, en.id, PLAYER.target); else ui_missing('Nano casting');
      break;
    case 'item': {
      const it = hud_itemFor(en);
      if (!it) { ui_toast('You have none left.'); return; }
      if (typeof useItem === 'function') useItem(PLAYER, it); else ui_missing('Using items');
      break;
    }
    case 'special':
      if (typeof useSpecial === 'function') useSpecial(PLAYER, en.id); else ui_missing('Specials');
      break;
    case 'action': hud_action(en.id); break;
  }
  hud_dirty();
}
function hud_action(id) {
  if (id === 'attack') {
    if (PLAYER.attacking) { if (typeof stopAttack === 'function') stopAttack(PLAYER); }
    else if (!PLAYER.target) ui_toast('You have no target.');
    else if (typeof startAttack === 'function') startAttack(PLAYER, PLAYER.target);
  } else if (typeof chatCommand === 'function' && chatCommand(id, [])) { /* handled */ }
  else if (id === 'sit') PLAYER.sitting = !PLAYER.sitting;
  else ui_missing(cap1(id));
}

// ---------- registries ----------
function hud_regs() {
  UI.tips.hot = (a) => {
    const en = PLAYER && hud_hotbar()[+a];
    if (!en) return '<span class="dim">Empty slot. Drag a nano program, item, special or action here.</span>';
    return hud_entryTip(en) + '<hr><span class="dim">' + (+a < 10 ? 'Key ' + ((+a + 1) % 10) : 'Shift+' + ((+a - 9) % 10)) + ' · drag off the bar to clear</span>';
  };
  UI.tips.special = (id) => hud_entryTip({ type: 'special', id });
  UI.tips.action = (id) => hud_entryTip({ type: 'action', id });
  UI.tips.buff = (i, el) => {
    const b = PLAYER && (el.dataset.tgt ? PLAYER.target && PLAYER.target.buffs : PLAYER.buffs)[+i];
    if (!b) return null;
    const n = ui_nano(b.nano);
    return ui_tipHead(b.name || (n && n.name) || 'Effect', b.hostile ? '#ff8a7a' : '#8fd0ff', b.hostile ? 'Hostile effect' : 'Nano program' + (b.ncu ? ' · ' + b.ncu + ' NM' : '')) +
      (n && n.desc ? '<div class="tl">' + esc(n.desc) + '</div>' : '') + (b.mods ? hud_modsHtml(b.mods) : '') +
      '<div class="tr dim">' + (b.t > 0 ? ui_time(b.t) + ' remaining' : '') + '</div>' + (!b.hostile && !el.dataset.tgt ? '<div class="dim">Right-click to cancel</div>' : '');
  };
  UI.tips.self = () => {
    if (!PLAYER) return null;
    const S = PLAYER.S;
    return ui_tipHead(PLAYER.name, '#8ff3e6', 'Level ' + PLAYER.level + ' ' + ui_breedName(PLAYER.char.breed) + ' ' + ui_profName(PLAYER.char.prof)) +
      '<div class="kv"><span>Health</span><span>' + fmtInt(PLAYER.hp) + ' / ' + fmtInt(S.maxHp) + '</span><span>Nano</span><span>' + fmtInt(PLAYER.np) + ' / ' + fmtInt(S.maxNp) + '</span>' +
      '<span>Health delta</span><span>' + ui_fmt(S.hpRegen) + '/s</span><span>Nano delta</span><span>' + ui_fmt(S.npRegen) + '/s</span></div>';
  };
  UI.tips.xp = () => {
    if (!PLAYER) return null;
    const c = PLAYER.char, nx = typeof xpToNext === 'function' ? xpToNext(c.level) : 0;
    return ui_tipHead('Level ' + c.level, '#ffb347', typeof titleLevel === 'function' ? 'Title level ' + titleLevel(c.level) : '') +
      '<div class="kv"><span>Experience</span><span>' + fmtInt(c.xp) + ' / ' + (isFinite(nx) ? fmtInt(nx) : '—') + '</span><span>To next level</span><span>' + (isFinite(nx) ? fmtInt(nx - c.xp) : '—') + '</span>' +
      '<span>Unspent IP</span><span>' + fmtInt(c.ip) + '</span></div><div class="dim" style="margin-top:4px">Spend IP in the Character window (C).</div>';
  };
  UI.tips.team = (id) => { const m = hud_teamMember(id); return m ? ui_tipHead(m.name, hud_entColor(m), 'Level ' + m.level + ' ' + hud_entSub(m)) + '<div class="tr">' + fmtInt(m.hp) + ' / ' + fmtInt(m.S.maxHp) + ' HP</div><div class="dim">Click to target · right-click to assist</div>' : null; };
  UI.drags.hot = (a) => {
    const en = PLAYER && hud_hotbar()[+a];
    if (!en) return null;
    const r = hud_resolve(en);
    return { kind: 'hot', i: +a, en, icon: ui_icon(r && r.icon) };
  };
  UI.drags.special = (id) => ({ kind: 'special', id, icon: ui_icon({ glyph: (typeof SPECIALS !== 'undefined' && SPECIALS[id] && SPECIALS[id].glyph) || '✶', color: '#ffb347' }) });
  UI.drags.action = (id) => ({ kind: 'action', id, icon: ui_icon(HUD_ACTIONS[id]) });
  UI.dropOk.hot = (a, p) => (['hot', 'nano', 'item', 'special', 'action'].includes(p.kind) ? true : null);
  UI.drops.hot = (a, p) => {
    if (!PLAYER) return;
    const bar = hud_hotbar(), i = +a;
    let en = null;
    if (p.kind === 'hot') { const o = bar[i]; bar[i] = p.en; bar[p.i] = o; HUD.hotSig = ''; return; }
    if (p.kind === 'nano') en = { type: 'nano', id: p.id };
    else if (p.kind === 'item' && p.item) en = { type: 'item', uid: p.item.uid, t: p.item.t, name: p.item.name, icon: p.item.icon };
    else if (p.kind === 'special') en = { type: 'special', id: p.id };
    else if (p.kind === 'action') en = { type: 'action', id: p.id };
    if (en) { bar[i] = en; HUD.hotSig = ''; if (typeof sfx === 'function') sfx('ui_click'); }
  };
  UI.nowhere.hot = (p) => { hud_hotbar()[p.i] = null; HUD.hotSig = ''; };
  UI.acts.hot = (a) => hud_useSlot(+a);
  UI.ctxs.hot = (a) => hud_useSlot(+a);
  UI.acts.special = (id) => { if (typeof useSpecial === 'function') useSpecial(PLAYER, id); };
  UI.acts.action = (id) => hud_action(id);
  UI.ctxs.buff = (i, el) => {
    const b = !el.dataset.tgt && PLAYER && PLAYER.buffs[+i];
    if (b && !b.hostile && typeof cancelBuff === 'function') cancelBuff(PLAYER, b.nano);
    HUD.buffSig = '';
  };
  UI.acts.win = (id) => { uiToggle(id); if (typeof sfx === 'function') sfx('ui_click'); };
  UI.acts.selftgt = () => { if (typeof setTarget === 'function') setTarget(PLAYER); };
  UI.acts.tot = () => { const t = PLAYER && PLAYER.target && PLAYER.target.target; if (t && typeof setTarget === 'function') setTarget(t); };
  UI.acts.tm = (id) => { const m = hud_teamMember(id); if (m && typeof setTarget === 'function') setTarget(m); };
  UI.ctxs.tm = (id) => { const m = hud_teamMember(id); if (m && m.target && typeof setTarget === 'function') setTarget(m.target); };
  UI.acts.mm = (a) => {
    if (a === 'rot') UI.opts.rotMap = !UI.opts.rotMap;
    else UI.opts.mmZoom = clamp((UI.opts.mmZoom || 1) * (a === 'in' ? 1.4 : 1 / 1.4), 0.35, 4);
    ui_save();
  };
}
function hud_modsHtml(mods) {
  const out = [];
  for (const k in mods) { const v = mods[k]; if (!v) continue; out.push('<span class="' + (v > 0 ? 'ok' : 'no') + '">' + (v > 0 ? '+' : '') + ui_fmt(v) + ' ' + esc(ui_sn(k)) + '</span>'); }
  return out.length ? '<div class="tr">' + out.join('<br>') + '</div>' : '';
}
function hud_entryTip(en) {
  switch (en.type) {
    case 'nano': return typeof nw_tip === 'function' ? nw_tip(en.id) : esc(en.id);
    case 'item': { const it = hud_itemFor(en); return it && typeof inv_tip === 'function' ? inv_tip(it) : ui_tipHead(en.name || 'Item', '#999', 'None left in your inventory'); }
    case 'special': {
      const S = typeof SPECIALS !== 'undefined' && SPECIALS[en.id];
      const sk = S && S.skill;
      const cd = PLAYER && PLAYER.cdMax && PLAYER.cdMax[en.id];
      return ui_tipHead(ui_specialName(en.id), '#ffb347', 'Weapon special') + (S ? '<div class="tl">' + esc(S.desc) + '</div>' : '') +
        (sk && PLAYER ? '<div class="tr">' + esc(ui_sn(sk)) + ': ' + Math.round(PLAYER.S[sk] || 0) + (cd ? ' · recharge ' + ui_fmt(cd) + 's' : '') + '</div>' : '');
    }
    case 'action': { const A = HUD_ACTIONS[en.id]; return A ? ui_tipHead(A.name, A.color, 'Action') + '<div class="tl">' + esc(A.desc) + '</div>' : ''; }
  }
  return '';
}

// ---------- events: cast bar, floating text ----------
function hud_events() {
  EV.on('cast', (e, n) => { if (e === PLAYER) { const N = ui_nano(n); HUD.cast = { show: 1, state: '', name: N ? N.name : 'Casting' }; } });
  EV.on('castdone', (e, n, t, ok) => { if (e === PLAYER) { HUD.cast.state = ok ? 'ok' : 'fail'; HUD.cast.show = 0.45; } });
  EV.on('dmg', (src, tgt, amt, type, o) => {
    o = o || {};
    if (!PLAYER || !tgt) return;
    const mine = src === PLAYER, pet = src && src.owner === PLAYER;
    if (tgt === PLAYER) hud_float(tgt, o.miss ? 'Miss' : '−' + fmtInt(amt), o.miss ? 'miss' : 'in' + (o.crit ? ' crit' : ''));
    else if (mine) hud_float(tgt, o.miss ? 'Miss' : fmtInt(amt) + (o.crit ? '!' : ''), o.miss ? 'miss' : o.crit ? 'crit' : o.nano || o.dot ? 'nano' : '');
    else if (pet) hud_float(tgt, o.miss ? 'Miss' : fmtInt(amt), o.miss ? 'miss' : 'pet');
  });
  EV.on('heal', (src, tgt, amt) => { if (PLAYER && amt >= 1 && (tgt === PLAYER || src === PLAYER)) hud_float(tgt, '+' + fmtInt(amt), 'heal'); });
  EV.on('xp', (e, amt) => { if (e === PLAYER && amt > 0) hud_float(PLAYER, '+' + fmtInt(amt) + ' XP', 'xp', 0.6); });
  EV.on('levelup', (e) => { if (e === PLAYER) { HUD.ipNag = true; hud_microSync(); } });
}
function hud_float(e, text, cls, yoff) {
  if (!e || !e.pos) return;
  let f = HUD.fct.length >= 40 ? HUD.fct.shift() : null;
  if (f) f.el.remove();
  const el = ui_h('div', 'fct ' + (cls || ''), esc(text), HUD.el.fct);
  HUD.fct.push({ el, e, x: e.pos.x, y: e.pos.y + ((e.rig && e.rig.height) || 1.8) * (0.9 + (yoff || 0)), z: e.pos.z, t: 0, dur: cls && cls.includes('crit') ? 1.6 : 1.25, jx: (Math.random() - 0.5) * 50 });
}

// ---------- per-frame ----------
function hud_update(dt) {
  const P = PLAYER, c = P.char, S = P.S || {};
  HUD.W = UI.root.clientWidth || innerWidth; HUD.H = UI.root.clientHeight || innerHeight;
  HUD.slowT += dt;
  const slow = HUD.slowT > 0.2 || HUD.dirty;
  if (slow) HUD.slowT = 0;
  // player frame
  const E = HUD.el;
  hud_txt(E.pf.querySelector('.lv'), String(P.level));
  hud_txt(E.pf.querySelector('.nm'), P.name);
  hud_txt(E.pf.querySelector('.sub'), ui_profName(c.prof));
  E.pf.querySelector('.lv').style.color = '#8ff3e6';
  hud_setBar(HUD.bars.php, P.hp / (S.maxHp || 1), fmtInt(P.hp) + ' / ' + fmtInt(S.maxHp || 0));
  hud_setBar(HUD.bars.pnp, P.np / (S.maxNp || 1), fmtInt(P.np) + ' / ' + fmtInt(S.maxNp || 0));
  hud_targetFrame(P.target);
  if (slow) { hud_buffs(); hud_team(); hud_specials(); hud_xp(); }
  hud_teamBars();
  hud_castbar(dt);
  hud_hotUpdate(slow);
  HUD.mmT += dt;
  if (HUD.mmT > 0.08) { HUD.mmT = 0; hud_minimap(); }
  hud_plates();
  hud_fct(dt);
  HUD.dirty = false;
}
function hud_targetFrame(t) {
  const E = HUD.el;
  if (!t || t.removed) { if (!E.tf.hidden) { E.tf.hidden = true; E.tot.hidden = true; } return; }
  E.tf.hidden = false;
  const col = hud_entColor(t);
  const lv = E.tf.querySelector('.lv'), nm = E.tf.querySelector('.nm');
  hud_txt(lv, t.kind === 'npc' ? '—' : String(t.level));
  lv.style.color = col; nm.style.color = col;
  hud_txt(nm, t.name + (t.dead ? ' (dead)' : ''));
  hud_txt(E.tf.querySelector('.sub'), t.kind === 'mob' ? (t.tpl && t.tpl.named ? 'Boss' : 'Monster') : t.kind === 'npc' ? 'NPC' : t.kind === 'pet' ? 'Pet' : t.kind === 'sim' ? 'Player' : t === PLAYER ? 'You' : '');
  const max = (t.S && t.S.maxHp) || 1;
  const pct = Math.round(100 * t.hp / max);
  hud_setBar(HUD.bars.thp, t.hp / max, t.kind === 'mob' || t.kind === 'npc' ? pct + '%' : fmtInt(t.hp) + ' / ' + fmtInt(max));
  const showNp = !!t.char && t.S && t.S.maxNp > 0;
  HUD.bars.tnp.el.hidden = !showNp;
  if (showNp) hud_setBar(HUD.bars.tnp, t.np / t.S.maxNp, fmtInt(t.np) + ' / ' + fmtInt(t.S.maxNp));
  const d = PLAYER.pos && t.pos ? Math.hypot(t.pos.x - PLAYER.pos.x, t.pos.z - PLAYER.pos.z) : 0;
  hud_txt(E.tf.querySelector('.tinfo'), hud_entSub(t) + (t !== PLAYER ? '  ·  ' + Math.round(d) + ' m' : ''));
  // target's cast
  const tc = HUD.bars.tcast;
  if (t.cast && t.cast.total > 0) {
    tc.el.hidden = false;
    const n = ui_nano(t.cast.nano) || (typeof nanoDef === 'function' && nanoDef(t.cast.nano));
    hud_setBar(tc, 1 - t.cast.t / t.cast.total, (n ? n.name : 'Casting') + ' ' + Math.max(0, t.cast.t).toFixed(1) + 's');
  } else if (!tc.el.hidden) tc.el.hidden = true;
  // target buffs (icons only)
  const sig = t.id + ':' + t.buffs.map((b) => b.nano).join(',');
  if (sig !== HUD.tbuffSig) {
    HUD.tbuffSig = sig;
    E.tf.querySelector('.tbuffs').innerHTML = t.buffs.slice(0, 16).map((b, i) => '<div class="bi' + (b.hostile ? ' deb' : '') + '" data-tip="buff:' + i + '" data-tgt="1">' + ui_icon(b.icon || hud_nanoIcon(ui_nano(b.nano))) + '</div>').join('');
  }
  // target of target
  const tt = t.target;
  if (tt && tt !== t && !tt.removed && t !== PLAYER) {
    E.tot.hidden = false;
    const n = E.tot.querySelector('.nm');
    hud_txt(n, '» ' + (tt === PLAYER ? 'You' : tt.name));
    n.style.color = hud_entColor(tt);
    hud_setBar(HUD.bars.tot, tt.hp / ((tt.S && tt.S.maxHp) || 1), '');
  } else E.tot.hidden = true;
}
function hud_buffs() {
  const B = PLAYER.buffs || [];
  const sig = B.map((b) => b.nano + (b.hostile ? '!' : '')).join(',');
  const box = HUD.el.buffs;
  if (sig !== HUD.buffSig) {
    HUD.buffSig = sig;
    box.innerHTML = B.map((b, i) => '<div class="bi' + (b.hostile ? ' deb' : '') + '" data-tip="buff:' + i + '" data-ctx="buff:' + i + '">' + ui_icon(b.icon || hud_nanoIcon(ui_nano(b.nano))) + '<span class="bt"></span></div>').join('');
  }
  const kids = box.children;
  for (let i = 0; i < B.length && i < kids.length; i++) {
    const b = B[i], k = kids[i];
    hud_txt(k.lastChild, b.dur > 0 && b.t < 36000 ? ui_time(b.t) : '');
    k.classList.toggle('low', b.t > 0 && b.t < 10 && !b.hostile);
  }
}
function hud_teamMember(id) { return TEAM_MEMBERS().find((m) => String(m.id) === String(id)); }
function TEAM_MEMBERS() { return (typeof TEAM !== 'undefined' && TEAM && TEAM.members) || []; }
function hud_team() {
  const ms = TEAM_MEMBERS().filter((m) => m !== PLAYER).slice(0, 6);
  const sig = ms.map((m) => m.id + ':' + m.name + ':' + m.level).join('|') + '|' + (TEAM.leader && TEAM.leader.id);
  if (sig === HUD.teamSig) return;
  HUD.teamSig = sig;
  const box = HUD.el.team;
  box.innerHTML = ms.map((m) => '<div class="tm pnl" data-act="tm:' + m.id + '" data-ctx="tm:' + m.id + '" data-tip="team:' + m.id + '"><div class="un">' +
    (TEAM.leader === m ? '<span class="ld">★</span>' : '') + '<span style="color:' + uiFactionColor(m.faction) + '">' + esc(m.name) + '</span><span class="lv">' + m.level + ' ' + esc(m.char ? ui_profName(m.char.prof) : '') + '</span></div>' +
    '<div class="bar hp"><i></i></div><div class="bar np"><i></i></div></div>').join('');
  HUD.teamEls = ms.map((m, i) => ({ m, el: box.children[i], hp: hud_barRef(box.children[i].querySelector('.hp')), np: hud_barRef(box.children[i].querySelector('.np')) }));
}
function hud_teamBars() {
  for (const t of HUD.teamEls) {
    const m = t.m;
    hud_setBar(t.hp, m.dead ? 0 : m.hp / ((m.S && m.S.maxHp) || 1), '');
    hud_setBar(t.np, m.np / ((m.S && m.S.maxNp) || 1), '');
    t.el.classList.toggle('tgt', PLAYER.target === m);
    t.el.classList.toggle('far', !!m.removed || (m.pos && Math.hypot(m.pos.x - PLAYER.pos.x, m.pos.z - PLAYER.pos.z) > 60));
  }
}
function hud_castbar(dt) {
  const E = HUD.el, C = HUD.cast, cast = PLAYER.cast;
  if (cast && cast.total > 0) {
    const n = ui_nano(cast.nano);
    E.cast.hidden = false; E.cast.className = 'pnl';
    hud_txt(E.cast.firstChild, n ? n.name : C.name);
    hud_setBar(HUD.bars.cast, 1 - cast.t / cast.total, Math.max(0, cast.t).toFixed(1) + 's');
    C.show = 0.45; C.state = '';
    return;
  }
  if (C.show > 0 && C.state) {
    C.show -= dt;
    E.cast.hidden = false; E.cast.className = 'pnl ' + C.state;
    hud_setBar(HUD.bars.cast, 1, C.state === 'ok' ? 'Done' : 'Interrupted');
    if (C.show <= 0) E.cast.hidden = true;
  } else if (!E.cast.hidden) E.cast.hidden = true;
}
function hud_specials() {
  const sp = typeof specialsFor === 'function' ? specialsFor(PLAYER) : [];
  const sig = sp.join(',');
  if (sig !== HUD.spSig || !HUD.spEls) {
    HUD.spSig = sig;
    const acts = Object.keys(HUD_ACTIONS);
    HUD.el.sp.innerHTML = acts.map((id) => '<div class="cell" data-act="action:' + id + '" data-drag="action:' + id + '" data-tip="action:' + id + '">' + ui_icon(HUD_ACTIONS[id]) + '</div>').join('') +
      (sp.length ? '<div class="sep"></div>' : '') +
      sp.map((id) => '<div class="cell" data-act="special:' + id + '" data-drag="special:' + id + '" data-tip="special:' + id + '">' + ui_icon({ glyph: (typeof SPECIALS !== 'undefined' && SPECIALS[id] && SPECIALS[id].glyph) || '✶', color: '#ffb347' }) + '<div class="cd"></div></div>').join('');
    HUD.spEls = sp.map((id, i) => ({ id, cd: HUD.el.sp.querySelectorAll('.cd')[i], v: -1, s: '' }));
    HUD.actEls = acts.map((id, i) => ({ id, el: HUD.el.sp.children[i] }));
  }
  for (const a of HUD.actEls) a.el.classList.toggle('act', (a.id === 'attack' && PLAYER.attacking) || (a.id === 'sit' && PLAYER.sitting));
}
function hud_cdSet(o, cdEl, key, def) {
  const [f, t] = hud_cdFrac(key, def);
  const v = Math.round(f * 100) / 100;
  if (v !== o.cdv) { cdEl.style.setProperty('--cd', v); o.cdv = v; }
  const s = t > 0 ? (t >= 10 ? Math.ceil(t) + '' : t.toFixed(1)) : '';
  if (s !== o.cdt) { cdEl.textContent = s; o.cdt = s; }
}
function hud_hotUpdate(slow) {
  const bar = hud_hotbar();
  if (slow) {
    const sig = JSON.stringify(bar) + '|' + PLAYER.char.inv.length;
    if (sig !== HUD.hotSig) {
      HUD.hotSig = sig;
      for (let i = 0; i < 20; i++) { const r = hud_resolve(bar[i]); HUD.hot[i].res = r; ui_set(HUD.hot[i].ic, r ? ui_icon(r.icon) : ''); }
    }
  }
  for (let i = 0; i < 20; i++) {
    const s = HUD.hot[i], en = bar[i];
    if (!en) { if (s.cdv) { s.cd.style.setProperty('--cd', 0); s.cd.textContent = ''; s.cdv = 0; s.cdt = ''; } if (s.ctv) { s.ct.textContent = ''; s.ctv = ''; } if (s.cls) { s.el.classList.remove('na', 'act'); s.cls = ''; } continue; }
    if (slow) {
      const r = s.res = hud_resolve(en);
      if (r) {
        const cls = (r.na ? 'na' : '') + (r.act ? ' act' : '');
        if (cls !== s.cls) { s.el.classList.toggle('na', !!r.na); s.el.classList.toggle('act', !!r.act); s.cls = cls; }
        const ct = r.count ? String(r.count) : '';
        if (ct !== s.ctv) { s.ct.textContent = ct; s.ctv = ct; }
      }
    }
    const r = s.res;
    hud_cdSet(s, s.cd, r && r.cd, r && r.cdDef);
  }
  if (HUD.spEls) for (const o of HUD.spEls) hud_cdSet(o, o.cd, o.id);
}
function hud_xp() {
  const c = PLAYER.char, nx = typeof xpToNext === 'function' ? xpToNext(c.level) : 0;
  const f = isFinite(nx) && nx > 0 ? c.xp / nx : 1;
  const E = HUD.el;
  const sx = 'scaleX(' + clamp(f, 0, 1).toFixed(4) + ')';
  if (E.xpFill.style.transform !== sx) E.xpFill.style.transform = sx;
  hud_txt(E.xpTxt, 'Level ' + c.level + '  ·  ' + (isFinite(nx) ? fmtInt(c.xp) + ' / ' + fmtInt(nx) + ' XP' : 'maximum level') + '  ·  IP: ' + fmtInt(c.ip) + ' unspent');
  hud_microSync();
}

// ---------- minimap ----------
function hud_zone() { HUD.map = null; HUD.mapZone = null; }
// World extents of the zone map canvas: { x0, z0, size } (map covers x0..x0+size, z0..z0+size; +x right, +z down).
function hud_mapBounds() {
  if (typeof zoneMapBounds === 'function') { const b = zoneMapBounds(); if (b) return b; }
  const def = typeof ZONE !== 'undefined' && ZONE && ZONE.def;
  const size = (def && def.size) || 1000;
  return { x0: -size / 2, z0: -size / 2, size };
}
function hud_mapCanvas() {
  const zid = typeof ZONE !== 'undefined' && ZONE ? ZONE.id : null;
  if (HUD.mapZone !== zid) {
    HUD.mapZone = zid; HUD.map = null;
    if (typeof zoneMapCanvas === 'function') { try { HUD.map = zoneMapCanvas(); } catch (e) { console.error(e); } }
  }
  return HUD.map;
}
const HUD_POI = { clonebay: ['C', '#7dff9a'], terminal: ['M', '#ffb347'], vendor: ['$', '#ffe9a8'], hopper: ['H', '#8fd0ff'], shuttle: ['S', '#8fd0ff'], bank: ['B', '#ffe9a8'], trainer: ['T', '#ffe9a8'], door: ['▣', '#c8d0d8'], pylon: ['◆', '#d2a6ff'], start: null, npc: null };
// Draw a zone map around (cx, cz) into ctx: w×h pixels, `ppm` pixels per metre, rotated by `rot` (radians).
function hud_drawMap(ctx, w, h, cx, cz, ppm, rot, opts) {
  opts = opts || {};
  ctx.save();
  ctx.fillStyle = '#0a1014'; ctx.fillRect(0, 0, w, h);
  const B = hud_mapBounds(), map = hud_mapCanvas();
  ctx.translate(w / 2, h / 2); ctx.rotate(rot); ctx.scale(ppm, ppm); ctx.translate(-cx, -cz);
  if (map) { ctx.imageSmoothingEnabled = true; ctx.drawImage(map, B.x0, B.z0, B.size, B.size); }
  else {
    ctx.strokeStyle = 'rgba(95,224,208,.12)'; ctx.lineWidth = 1 / ppm;
    const g = 50, x0 = Math.floor((cx - w / ppm) / g) * g, z0 = Math.floor((cz - h / ppm) / g) * g;
    ctx.beginPath();
    for (let x = x0; x < cx + w / ppm; x += g) { ctx.moveTo(x, cz - h / ppm); ctx.lineTo(x, cz + h / ppm); }
    for (let z = z0; z < cz + h / ppm; z += g) { ctx.moveTo(cx - w / ppm, z); ctx.lineTo(cx + w / ppm, z); }
    ctx.stroke();
  }
  ctx.restore();
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const P = (x, z) => { const dx = (x - cx) * ppm, dz = (z - cz) * ppm; return [w / 2 + dx * cs - dz * sn, h / 2 + dx * sn + dz * cs]; };
  const inView = (p, m) => p[0] > -m && p[1] > -m && p[0] < w + m && p[1] < h + m;
  const dpr = opts.dpr || 1;
  // POIs
  const def = typeof ZONE !== 'undefined' && ZONE && ZONE.def;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (def) {
    for (const p of def.pois || []) {
      const st = HUD_POI[p.type];
      if (!st) continue;
      const q = P(p.x, p.z);
      if (!inView(q, 10)) continue;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(q[0] - 6 * dpr, q[1] - 6 * dpr, 12 * dpr, 12 * dpr);
      ctx.strokeStyle = st[1]; ctx.lineWidth = dpr; ctx.strokeRect(q[0] - 6 * dpr, q[1] - 6 * dpr, 12 * dpr, 12 * dpr);
      ctx.fillStyle = st[1]; ctx.font = (9 * dpr) + 'px "Share Tech Mono", monospace'; ctx.fillText(st[0], q[0], q[1] + 0.5);
      if (opts.labels && p.name) { ctx.font = (10 * dpr) + 'px "Exo 2", sans-serif'; ctx.fillStyle = 'rgba(255,240,210,.85)'; ctx.fillText(p.name, q[0], q[1] - 13 * dpr); }
    }
    for (const x of def.exits || []) {
      const q = P(x.x, x.z);
      if (!inView(q, 10)) continue;
      ctx.fillStyle = '#5fe0d0'; ctx.beginPath(); ctx.arc(q[0], q[1], 4 * dpr, 0, TAU); ctx.fill();
      if (opts.labels) { ctx.font = (10 * dpr) + 'px "Exo 2", sans-serif'; ctx.fillText('→ ' + (x.label || ui_zoneName(x.to)), q[0], q[1] - 11 * dpr); }
    }
  }
  // missions in this zone
  if (PLAYER && PLAYER.char && def) {
    for (const m of PLAYER.char.missions || []) {
      const L = m.location || m.loc;
      if (!L || L.x == null || (L.zone && L.zone !== ZONE.id)) continue;
      const q = P(L.x, L.z), r = 7 * dpr;
      const c = clamp(q[0], r, w - r), d = clamp(q[1], r, h - r);
      ctx.fillStyle = UI.mapFocus === m ? '#fff' : '#ffb347'; ctx.strokeStyle = '#000'; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.moveTo(c, d - r); ctx.lineTo(c + r, d); ctx.lineTo(c, d + r); ctx.lineTo(c - r, d); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // entities
  if (typeof ENTS !== 'undefined') {
    for (const e of ENTS) {
      if (e === PLAYER || e.removed || (e.dead && e !== PLAYER.target) || !e.pos) continue;
      if (e.kind === 'npc' && e.rig && e.rig.prop) continue;
      const q = P(e.pos.x, e.pos.z);
      if (!inView(q, 4)) continue;
      const team = e.team && PLAYER && e.team === PLAYER.team && e.kind !== 'mob';
      let col, r = 2.2;
      if (team) { col = '#7dff9a'; r = 3.2; }
      else if (e.kind === 'mob') { col = isHostileSafe(e) ? uiCon(e.level) : '#c8a070'; r = e.tpl && e.tpl.named ? 3.5 : 2.2; }
      else if (e.kind === 'npc') col = '#ffe9a8';
      else if (e.kind === 'pet') col = e.owner === PLAYER ? '#8ff3e6' : '#a0a8b0';
      else col = uiFactionColor(e.faction);
      r *= dpr * (opts.big ? 1.3 : 1);
      ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, TAU); ctx.fill(); ctx.stroke();
      if (PLAYER.target === e) { ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(q[0], q[1], r + 3 * dpr, 0, TAU); ctx.stroke(); }
    }
  }
  // player arrow
  if (PLAYER) {
    const q = P(PLAYER.pos.x, PLAYER.pos.z);
    const fx = Math.sin(PLAYER.yaw), fz = Math.cos(PLAYER.yaw);
    const ax = fx * cs - fz * sn, az = fx * sn + fz * cs, s = 7 * dpr * (opts.big ? 1.3 : 1);
    ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(Math.atan2(az, ax));
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, s * 0.6); ctx.lineTo(-s * 0.35, 0); ctx.lineTo(-s * 0.7, -s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
function isHostileSafe(e) { return typeof isHostile === 'function' && PLAYER ? isHostile(PLAYER, e) : e.kind === 'mob'; }
function hud_minimap() {
  const E = HUD.el, cv = E.mmCv, ctx = E.mmCx, P = PLAYER;
  const def = typeof ZONE !== 'undefined' && ZONE && ZONE.def;
  hud_txt(E.mmName, def ? def.name + (def.lvl ? '  ' + def.lvl[0] + '–' + def.lvl[1] : def.safe ? '  safe' : '') : '—');
  hud_txt(E.mmCoord, Math.round(P.pos.x) + ', ' + Math.round(P.pos.z));
  const W = cv.width, H = cv.height, dpr = W / 184;
  const radius = 75 / (UI.opts.mmZoom || 1);
  const rot = UI.opts.rotMap ? -Math.PI / 2 - Math.atan2(Math.cos(P.yaw), Math.sin(P.yaw)) : 0;
  hud_drawMap(ctx, W, H, P.pos.x, P.pos.z, W / (2 * radius), rot, { dpr });
  // north marker
  const nx = W / 2 + Math.sin(-rot) * (W / 2 - 9 * dpr) * -1, ny = H / 2 - Math.cos(rot) * (H / 2 - 9 * dpr);
  ctx.font = 'bold ' + (10 * dpr) + 'px "Exo 2", sans-serif'; ctx.fillStyle = '#ffb347'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('N', nx, ny);
}

// ---------- nameplates ----------
function hud_plateShown(e, d) {
  const P = PLAYER;
  if (e === P || e.removed || !e.pos) return 0;
  if (e.rig && e.rig.root && e.rig.root.visible === false) return 0;
  const tgt = P.target === e;
  if (tgt) return 2;
  if (e.dead) return 0;
  const team = e.team && e.team === P.team && e.kind !== 'mob';
  if (team) return d < 80 ? 1 : 0;
  if (e.kind === 'mob') return e.target === P && d < 45 ? 1 : 0;
  if (e.kind === 'npc') return d < 28 ? 1 : 0;
  if (e.kind === 'pet') return e.owner === P && d < 30 ? 1 : 0;
  return d < 42 ? 1 : 0;
}
function hud_plates() {
  const seen = new Set();
  const W = HUD.W, H = HUD.H, v = HUD.pv;
  if (typeof camera === 'undefined' || typeof ENTS === 'undefined') return;
  const cp = camera.position;
  for (const e of ENTS) {
    const d = Math.hypot(e.pos.x - PLAYER.pos.x, e.pos.z - PLAYER.pos.z);
    const show = UI.opts.names === false && PLAYER.target !== e ? 0 : hud_plateShown(e, d);
    if (!show) continue;
    const h = e.rig && e.rig.height ? e.rig.height : 1.8;
    v.set(e.pos.x, e.pos.y + (e.dead ? 0.6 : h) + 0.3, e.pos.z).project(camera);
    if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) continue;
    seen.add(e);
    let p = HUD.plates.get(e);
    if (!p) {
      p = HUD.platePool.pop() || hud_newPlate();
      p.sig = ''; p.x = p.y = -1e4; p.hpv = -1; p.op = -1;
      HUD.plates.set(e, p);
      p.el.hidden = false;
    }
    const team = e.team && e.team === PLAYER.team && e.kind !== 'mob';
    const hpBar = show === 2 || team;
    const sub = e.kind === 'npc' ? hud_npcTitle(e) : '';
    const sig = e.name + '|' + e.level + '|' + show + '|' + hpBar + '|' + hud_entColor(e) + '|' + sub;
    if (sig !== p.sig) {
      p.sig = sig;
      p.el.className = 'npl' + (show === 2 ? ' tg' : '') + (team ? ' tm' : '');
      p.el.style.color = hud_entColor(e);
      p.el.innerHTML = esc(e.name) + (e.kind !== 'npc' ? '<span class="l">' + e.level + '</span>' : '') + (sub ? '<span class="g">&lt;' + esc(sub) + '&gt;</span>' : '') + (hpBar ? '<span class="h"><i></i></span>' : '');
      p.hp = p.el.querySelector('.h > i'); p.hpv = -1;
    }
    const x = Math.round((v.x + 1) / 2 * W), y = Math.round((1 - v.y) / 2 * H);
    if (x !== p.x || y !== p.y) { p.el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%)'; p.x = x; p.y = y; }
    if (p.hp) { const f = clamp(e.hp / ((e.S && e.S.maxHp) || 1), 0, 1); if (Math.abs(f - p.hpv) > 0.002) { p.hp.style.transform = 'scaleX(' + f.toFixed(3) + ')'; p.hpv = f; } }
    const cd = Math.hypot(e.pos.x - cp.x, e.pos.z - cp.z);
    const op = show === 2 ? 1 : Math.round(clamp(1.25 - cd / 50, 0.35, 1) * 20) / 20;
    if (op !== p.op) { p.el.style.opacity = op; p.op = op; }
    p.el.style.zIndex = show === 2 ? 2 : 1;
  }
  for (const [e, p] of HUD.plates) if (!seen.has(e)) { p.el.hidden = true; HUD.plates.delete(e); HUD.platePool.push(p); }
}
function hud_newPlate() { return { el: ui_h('div', 'npl', null, HUD.el.plates) }; }
function hud_fct(dt) {
  const W = HUD.W, H = HUD.H, v = HUD.pv;
  for (let i = HUD.fct.length - 1; i >= 0; i--) {
    const f = HUD.fct[i];
    f.t += dt;
    if (f.t >= f.dur) { f.el.remove(); HUD.fct.splice(i, 1); continue; }
    if (f.e && !f.e.removed && f.e.pos) { f.x = f.e.pos.x; f.z = f.e.pos.z; }
    v.set(f.x, f.y, f.z).project(camera);
    if (v.z > 1) { f.el.style.opacity = 0; continue; }
    const k = f.t / f.dur;
    const x = (v.x + 1) / 2 * W + f.jx * k, y = (1 - v.y) / 2 * H - 18 - 55 * Math.sqrt(k);
    const sc = f.el.classList.contains('crit') ? 1 + 0.5 * Math.max(0, 1 - f.t * 6) : 1;
    f.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc.toFixed(2) + ')';
    f.el.style.opacity = k > 0.65 ? ((1 - k) / 0.35).toFixed(2) : 1;
  }
}
