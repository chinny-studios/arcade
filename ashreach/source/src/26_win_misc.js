// Ashreach — other windows: map, team, missions, vendor, clone bay, hopper, bank, mission terminal, options, help, NPC

const MISC_SLIDERS = [
  ['good_bad', 'Good', 'Bad'], ['order_chaos', 'Order', 'Chaos'], ['open_hidden', 'Open', 'Hidden'], ['physical_mystical', 'Physical', 'Mystical'],
  ['headon_stealth', 'Head-on', 'Stealth'], ['credits_xp', 'Credits', 'XP'], ['easy_hard', 'Easy', 'Hard'],
];
const MISC_KEYS = [
  ['W / S', 'Run forward / back'], ['A / D', 'Turn (strafe while holding RMB)'], ['Q / E', 'Strafe left / right'], ['R', 'Autorun'], ['Space', 'Jump'],
  ['Hold RMB', 'Mouse-look and steer'], ['Hold LMB', 'Orbit the camera'], ['Wheel', 'Zoom'], ['LMB click', 'Select a target'], ['RMB click', 'Talk to / attack what you click'],
  ['Tab', 'Next hostile target'], ['` (backquote)', 'Toggle auto-attack'], ['1 – 0', 'Hotbar 1'], ['Shift+1 – 0', 'Hotbar 2'], ['X', 'Sit / stand (faster regeneration)'],
  ['F', 'Interact with the nearest NPC or terminal'], ['C', 'Character: skills, equipment, implants'], ['I', 'Inventory'], ['N', 'Nano programs'], ['M', 'Map'],
  ['T', 'Team'], ['J', 'Missions'], ['Enter', 'Chat (Enter again to send)'], ['/', 'Start a chat command'], ['Esc', 'Close window · clear target · options'], ['F1', 'This help'],
];

function misc_build() {
  // ---- map ----
  uiWin('map', {
    title: 'Map', key: 'M', foot: true, build: (w) => {
      w.cv = ui_h('canvas', null, null, w.body); w.cv.id = 'bigmap';
      w.cv.addEventListener('mousemove', (ev) => { w.hov = misc_mapWorld(w, ev); });
      w.cv.addEventListener('mouseleave', () => { w.hov = null; });
    },
    onOpen: (w) => {
      const s = Math.round(clamp(Math.min(innerWidth - 60, innerHeight - 120), 280, 600));
      w.cv.width = w.cv.height = s * Math.min(2, devicePixelRatio || 1);
      w.cv.style.width = w.cv.style.height = s + 'px';
      w.el.style.width = (s + 22) + 'px';
    },
    refresh: misc_mapDraw, live: 0.25,
  });
  // ---- team ----
  uiWin('team', { title: 'Team', key: 'T', w: 340, foot: true, x: 210, y: 140, refresh: misc_team, live: 0.5 });
  // ---- missions ----
  uiWin('missions', { title: 'Missions', key: 'J', w: 420, refresh: misc_missions, live: 1 });
  // ---- vendor ----
  uiWin('vendor', { title: 'Vendor', w: 400, h: 560, foot: true, x: (w) => Math.max(10, innerWidth / 2 - w - 20), y: 50, refresh: misc_vendor, live: 1 });
  // ---- clone bay ----
  uiWin('clonebay', { title: 'Clone Bay', w: 360, refresh: misc_clonebay });
  // ---- hopper ----
  uiWin('hopper', { title: 'Hopper', w: 400, refresh: misc_hopper, live: 1 });
  // ---- bank ----
  uiWin('bank', { title: 'Bank', w: 384, foot: true, x: (w) => Math.max(10, innerWidth / 2 - w - 20), y: 60, refresh: misc_bank });
  // ---- mission terminal ----
  uiWin('terminal', { title: 'Mission Terminal', w: 470, x: (w) => Math.max(10, innerWidth / 2 - w / 2), y: 30, refresh: misc_terminal, onOpen: (w) => { if (w.npc !== UI.npc) { w.npc = UI.npc; UI.termOffers = null; } } });
  // ---- options ----
  uiWin('options', { title: 'Options', key: 'Esc', w: 380, refresh: misc_options });
  // ---- help ----
  uiWin('help', { title: 'Help', key: 'F1', w: 600, refresh: misc_help });
  // ---- generic NPC (trainers, faction officers, ...) ----
  uiWin('npc', { title: 'Conversation', w: 380, refresh: misc_npc });

  UI.wins.options.body.addEventListener('input', misc_optInput);
  UI.wins.options.body.addEventListener('change', misc_optInput);
  UI.wins.terminal.body.addEventListener('input', (ev) => {
    const k = ev.target.dataset.sl;
    if (!k) return;
    misc_sliders()[k] = +ev.target.value / 100;
    ui_save();
    const q = UI.wins.terminal.body.querySelector('.qlro');
    if (q) q.innerHTML = misc_qlText();
  });
  UI.wins.terminal.body.addEventListener('change', (ev) => { if (ev.target.type === 'range') ev.target.blur(); });
  UI.wins.vendor.body.addEventListener('change', (ev) => { if (ev.target.dataset.vf !== undefined) { UI.store.vendUsable = ev.target.checked; ui_save(); ui_refreshWin(UI.wins.vendor, true); } });
  UI.wins.team.body.addEventListener('keydown', (ev) => { if (ev.code === 'Enter' && ev.target.id === 'tminv') { ev.preventDefault(); ev.stopPropagation(); misc_invite(); } });
  misc_regs();
  misc_events();
}

// ---------- map ----------
function misc_mapWorld(w, ev) {
  const r = w.cv.getBoundingClientRect(), B = hud_mapBounds();
  return { x: B.x0 + (ev.clientX - r.left) / r.width * B.size, z: B.z0 + (ev.clientY - r.top) / r.height * B.size };
}
function misc_mapDraw(w) {
  const cv = w.cv, ctx = cv.getContext('2d'), B = hud_mapBounds(), dpr = cv.width / parseFloat(cv.style.width || cv.width);
  hud_drawMap(ctx, cv.width, cv.height, B.x0 + B.size / 2, B.z0 + B.size / 2, cv.width / B.size, 0, { labels: true, big: true, dpr });
  const def = typeof ZONE !== 'undefined' && ZONE && ZONE.def;
  w.bar.firstChild.textContent = 'Map · ' + (def ? def.name : '');
  const h = w.hov;
  ui_set(w.foot, '<span class="mono dim" style="font-size:11px">' + (PLAYER ? 'You ' + Math.round(PLAYER.pos.x) + ', ' + Math.round(PLAYER.pos.z) : '') + (h ? '  ·  cursor ' + Math.round(h.x) + ', ' + Math.round(h.z) : '') + '</span><span class="sp"></span>' +
    '<span style="font-size:11px"><span style="color:#ffb347">◆</span> mission <span style="color:#7dff9a">●</span> team <span style="color:#ff4a3a">●</span> hostile <span style="color:#ffe9a8">■</span> service <span style="color:#5fe0d0">●</span> exit</span>');
}

// ---------- team ----------
function misc_team(w) {
  const T = typeof TEAM !== 'undefined' ? TEAM : { members: [] };
  const ms = T.members || [], lead = T.leader === PLAYER;
  let h = '';
  if (ms.length <= 1) h += '<div class="empty">You are not in a team. Invite someone by name, or target a player and press Invite target.</div>';
  else {
    h += '<div class="hd">Members ' + ms.length + ' / 6</div>';
    for (const m of ms) {
      const f = m.dead ? 0 : m.hp / ((m.S && m.S.maxHp) || 1);
      h += '<div class="vrow" style="grid-template-columns:1fr 70px auto;cursor:default"><div><div class="vn">' + (T.leader === m ? '<span class="amb">★ </span>' : '') + '<span style="color:' + uiFactionColor(m.faction) + '">' + esc(m.name) + '</span>' + (m === PLAYER ? ' <span class="dim">(you)</span>' : '') + '</div>' +
        '<div class="vq">Level ' + m.level + ' ' + esc(m.char ? ui_profName(m.char.prof) : '') + (m.dead ? ' · dead' : '') + '</div></div>' +
        '<div class="bar hp" style="margin:0"><i style="transform:scaleX(' + f.toFixed(2) + ')"></i></div>' +
        (lead && m !== PLAYER ? '<button class="btn sm bad" data-act="tkick:' + m.id + '">Kick</button>' : '<span></span>') + '</div>';
    }
  }
  h += '<div class="hd">Invite</div><div class="row"><input id="tminv" class="txt" style="flex:1" placeholder="Player name" maxlength="20" autocomplete="off"><button class="btn" data-act="tinv:">Invite</button></div>';
  ui_set(w.body, h);
  const t = PLAYER && PLAYER.target;
  ui_set(w.foot, '<button class="btn' + (t && (t.kind === 'sim' || t.kind === 'player') && t !== PLAYER ? '' : ' off') + '" data-act="tinvt:">Invite target</button><span class="sp"></span>' +
    (ms.length > 1 ? '<button class="btn bad" data-act="tleave:">Leave team</button>' : ''));
}
function misc_invite(name) {
  const inp = ui_q('#tminv');
  name = name || (inp && inp.value.trim());
  if (!name) { ui_toast('Type a name to invite.'); return; }
  if (typeof teamInvite === 'function') teamInvite(name);
  else if (typeof chatCommand === 'function' && chatCommand('invite', [name])) { /* handled */ }
  else ui_missing('Team invites');
  if (inp) { inp.value = ''; inp.blur(); }
}

// ---------- missions ----------
function misc_missions(w) {
  const c = PLAYER && PLAYER.char;
  if (!c) return;
  let h = '';
  const ms = (c.missions || []).filter((m) => m.state !== 'abandoned');
  h += '<div class="hd">Contracts ' + ms.filter((m) => m.state === 'active').length + ' / 3</div>';
  if (!ms.length) h += '<div class="empty">No missions. Use a mission terminal in any city or outpost to pick one up.</div>';
  ms.forEach((m) => {
    const L = m.location || {}, R = m.reward || {};
    const done = m.state === 'done';
    h += '<div class="mcard' + (done ? ' done' : '') + '"><div class="row"><span class="mt">' + esc(m.title || 'Mission') + '</span><span class="sp"></span><span class="mono dim">QL ' + (m.ql || '?') + '</span></div>' +
      '<div class="md">' + esc(m.desc || '') + '</div>' +
      '<div class="mr">' + (done ? '<span class="grn">COMPLETED</span> · ' : '') + 'Location: <b>' + esc(ui_zoneName(L.zone)) + '</b>' + (L.x != null ? ' (' + Math.round(L.x) + ', ' + Math.round(L.z) + ')' : '') + '</div>' +
      '<div class="mr">Reward: <b>' + fmtInt(R.credits || 0) + ' cr</b> · <b>' + fmtInt(R.xp || 0) + ' XP</b>' + (R.item ? ' · <span data-tip="mitem:' + esc(m.id) + '" style="color:' + ui_col(R.item.icon && R.item.icon.color) + '">' + esc(R.item.name) + '</span>' : '') + '</div>' +
      (done ? '' : '<div class="row" style="margin-top:6px"><button class="btn sm" data-act="mmap:' + esc(m.id) + '">Show on map</button><span class="sp"></span><button class="btn sm bad" data-act="mab:' + esc(m.id) + '">Abandon</button></div>') + '</div>';
  });
  if (typeof questList === 'function') {
    const qs = questList().filter((q) => q.state !== 'new' && q.state !== 'done');
    if (qs.length) {
      h += '<div class="hd">Tasks</div>';
      for (const q of qs) h += '<div class="mcard" style="border-left-color:var(--teal)"><div class="row"><span class="mt">' + esc(q.title) + '</span><span class="sp"></span><span class="mono ' + (q.state === 'ready' ? 'grn' : 'dim') + '">' + (q.state === 'ready' ? 'return to ' + esc(q.giver) : Math.min(q.n, q.need) + ' / ' + q.need) + '</span></div><div class="mr">' + esc(q.giver ? 'From ' + q.giver : '') + '</div></div>';
    }
  }
  ui_set(w.body, h);
}

// ---------- vendor ----------
function misc_vendorTitle(npc) { return npc ? npc.name + (typeof hud_npcTitle === 'function' && hud_npcTitle(npc) ? ' · ' + hud_npcTitle(npc) : '') : 'Vendor'; }
function misc_vendor(w) {
  const npc = UI.npc;
  w.bar.firstChild.textContent = misc_vendorTitle(npc);
  if (!npc || !PLAYER) { ui_set(w.body, '<div class="empty">Nobody to trade with.</div>'); return; }
  const stock = npc.stock || [], cr = PLAYER.char.credits, only = !!UI.store.vendUsable;
  let h = '<div class="dropzone" data-drop="vend" style="min-height:100%"><label class="row note" style="margin-bottom:6px"><input type="checkbox" data-vf' + (only ? ' checked' : '') + '> Only show items I can use</label><div class="vgrid">';
  let n = 0;
  for (const it of stock) {
    const ok = typeof itemReqsMet !== 'function' || itemReqsMet(PLAYER.S, it).ok;
    if (only && !ok) continue;
    n++;
    const p = typeof itemPrice === 'function' ? itemPrice(it, true) : it.value;
    h += '<div class="vrow' + (p > cr ? ' cant' : '') + '" data-act="vbuy:' + it.uid + '" data-ctx="vbuy:' + it.uid + '" data-tip="vitem:' + it.uid + '" data-drag="vendor:' + it.uid + '">' +
      '<div class="cell' + (ok ? '' : ' bad') + '">' + ui_icon(it.icon) + '</div><div style="min-width:0"><div class="vn" style="color:' + (typeof it_tierColor === 'function' ? it_tierColor(it.ql) : '#fff') + '">' + esc(it.name) + '</div><div class="vq">QL ' + it.ql + ' · ' + esc(cap1(it.kind)) + '</div></div>' +
      '<div class="vp">' + fmtInt(p) + '</div></div>';
  }
  if (!n) h += '<div class="empty">' + (stock.length ? 'Nothing here you can use yet.' : 'Sold out.') + '</div>';
  h += '</div></div>';
  ui_set(w.body, h);
  ui_set(w.foot, '<span class="cr">' + fmtInt(cr) + '</span><span class="sp"></span><span class="note">Click to buy · right-click or drag your items here to sell</span>');
}
function vend_buy(it) {
  if (!it || !UI.npc) return;
  if (typeof buyItem !== 'function') { ui_missing('Buying'); return; }
  buyItem(UI.npc, it);
}

// ---------- clone bay ----------
function misc_clonebay(w) {
  const c = PLAYER && PLAYER.char;
  if (!c) return;
  const cl = c.flags && c.flags.clone;
  let where = 'nowhere';
  if (cl) {
    const def = typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS[cl.zone];
    const p = def && cl.poi && (def.pois || []).find((q) => q.id === cl.poi);
    where = (def ? def.name : ui_zoneName(cl.zone)) + (p && p.name ? ' · ' + p.name : '');
  }
  const here = cl && typeof ZONE !== 'undefined' && ZONE && cl.zone === ZONE.id && (!UI.npc || !UI.npc.poi || !cl.poi || cl.poi === UI.npc.poi.id);
  ui_set(w.body, '<div class="note" style="margin-bottom:8px">The Concord keeps a fresh body on file for every insured citizen. When you die, you wake up at the last clone bay where you updated your insurance, a little weaker for a while.</div>' +
    '<div class="kv" style="margin-bottom:10px"><span>Current clone point</span><span style="font-family:inherit" class="amb">' + esc(where) + '</span></div>' +
    '<div class="row"><span class="sp"></span><button class="btn pri" data-act="clone:"' + (here ? ' disabled' : '') + '>' + (here ? 'Insured here' : 'Update clone insurance') + '</button></div>');
}

// ---------- hopper / shuttle / lattice ----------
function misc_hopper(w) {
  const npc = UI.npc, c = PLAYER && PLAYER.char;
  if (!npc || !c) { ui_set(w.body, '<div class="empty">No transport here.</div>'); return; }
  w.bar.firstChild.textContent = npc.lattice ? 'The Lattice' : npc.role === 'shuttle' ? 'Shuttle' : 'Hopper';
  const ds = npc.destinations || [];
  let h = '<div class="note" style="margin-bottom:6px">' + (npc.lattice ? 'Step into the Lattice and come out at any node you have attuned to.' : npc.role === 'shuttle' ? 'Concord shuttle service. Departures every few minutes.' : 'Suborbital hopper. Strap in, it is a short and bumpy ride.') + '</div>';
  if (!ds.length) h += '<div class="empty">No destinations available.</div>';
  ds.forEach((d, i) => {
    const same = typeof ZONE !== 'undefined' && ZONE && d.zone === ZONE.id && (!d.poi || !npc.poi || d.poi === npc.poi.id);
    const cant = (d.cost || 0) > c.credits;
    h += '<div class="dest"><div><div class="dn">' + esc(d.name || ui_zoneName(d.zone)) + '</div><div class="dz">' + esc(ui_zoneName(d.zone)) + (typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS[d.zone] && ZONE_DEFS[d.zone].lvl ? ' · levels ' + ZONE_DEFS[d.zone].lvl.join('–') : '') + '</div></div>' +
      '<span class="mono ' + (cant ? 'red' : 'amb') + '">' + (d.cost ? fmtInt(d.cost) + ' cr' : 'free') + '</span>' +
      '<button class="btn sm' + (same || cant ? ' off' : ' pri') + '" data-act="hop:' + i + '">' + (same ? 'Here' : 'Travel') + '</button></div>';
  });
  ui_set(w.body, h);
}

// ---------- bank ----------
function bank_list() { const c = PLAYER.char; return c.bank || (c.bank = []); }
function bank_deposit(it) {
  if (!it || it.quest || it.kind === 'key') { ui_toast('Mission items cannot be banked.'); return; }
  const b = bank_list();
  if (b.length >= 96) { ui_toast('Your bank is full.'); return; }
  if (typeof removeItem === 'function' ? !removeItem(PLAYER, it) : true) return;
  b.push(it);
  for (const en of PLAYER.char.hotbar || []) if (en && en.type === 'item' && en.uid === it.uid) en.uid = -1;
  EV.emit('inv', PLAYER);
}
function bank_withdraw(it) {
  const b = bank_list(), i = b.indexOf(it);
  if (i < 0) return;
  if (typeof addItem !== 'function') { ui_missing('Banking'); return; }
  b.splice(i, 1);
  if (!addItem(PLAYER, it)) { b.splice(i, 0, it); ui_toast('Your inventory is full.'); return; }
  EV.emit('inv', PLAYER);
}
function misc_bank(w) {
  if (!PLAYER) return;
  const b = bank_list();
  let h = '<div class="note" style="margin-bottom:6px">Items stored here are safe and reachable from any bank terminal.</div><div class="igrid dropzone" data-drop="bank">';
  const cells = Math.max(32, Math.ceil((b.length + 1) / 8) * 8);
  for (let i = 0; i < cells; i++) {
    const it = b[i];
    h += it ? '<div class="cell" data-drag="bank:' + it.uid + '" data-tip="bitem:' + it.uid + '" data-ctx="bank:' + it.uid + '" data-drop="bank">' + ui_icon(it.icon) + (it.stack > 1 ? '<span class="ct">' + it.stack + '</span>' : '') + '<span class="ql">' + it.ql + '</span></div>' : '<div class="cell" data-drop="bank"></div>';
  }
  h += '</div>';
  ui_set(w.body, h);
  ui_set(w.foot, '<span class="mono dim" style="font-size:11px">' + b.length + ' / 96 stored</span><span class="sp"></span><span class="note">Right-click to move between bank and inventory</span>');
}

// ---------- mission terminal ----------
function misc_sliders() {
  const s = UI.store.term || (UI.store.term = {});
  for (const [k] of MISC_SLIDERS) if (typeof s[k] !== 'number') s[k] = 0;
  return s;
}
function misc_qlText() {
  const s = misc_sliders(), lvl = PLAYER ? PLAYER.level : 1;
  const ml = Math.max(1, lvl + Math.round((s.easy_hard || 0) * 4));
  const ql = clamp(Math.round(ml * 2.3), 1, 200);
  return 'Difficulty <b class="amb">QL ' + ql + '</b> · opposition around level <b class="amb">' + ml + '</b>' + (ml < lvl - 3 ? ' <span class="dim">(easy pickings)</span>' : ml > lvl + 2 ? ' <span class="red">(dangerous)</span>' : '');
}
function misc_terminal(w) {
  if (!PLAYER) return;
  const s = misc_sliders();
  let h = '<div class="note" style="margin-bottom:6px">Set what kind of contract you are after, then request offers. Harder contracts pay more and drop better rewards.</div>';
  for (const [k, a, b] of MISC_SLIDERS) h += '<div class="sld"><span>' + a + '</span><input type="range" min="-100" max="100" step="5" value="' + Math.round((s[k] || 0) * 100) + '" data-sl="' + k + '"><span>' + b + '</span></div>';
  h += '<div class="row" style="margin:8px 0 4px"><span class="qlro note">' + misc_qlText() + '</span><span class="sp"></span><button class="btn pri" data-act="mreq:">Request missions</button></div>';
  const offers = UI.termOffers;
  if (offers) {
    h += '<div class="hd">Offers</div>';
    if (!offers.length) h += '<div class="empty">No contracts right now.</div>';
    offers.forEach((o, i) => {
      const R = o.reward || {};
      h += '<div class="mcard"><div class="row"><span class="mt">' + esc(o.title) + '</span><span class="sp"></span><span class="mono dim">' + esc(cap1(o.type || '')) + ' · QL ' + o.ql + '</span></div>' +
        '<div class="md">' + esc(o.desc || '') + '</div>' +
        '<div class="mr">Location: <b>' + esc(ui_zoneName(o.location && o.location.zone)) + '</b></div>' +
        '<div class="row" style="margin-top:4px"><div class="mr">Reward: <b>' + fmtInt(R.credits || 0) + ' cr</b> · <b>' + fmtInt(R.xp || 0) + ' XP</b>' + (R.item ? ' · <span data-tip="oitem:' + i + '" style="color:' + ui_col(R.item.icon && R.item.icon.color) + ';cursor:help">' + esc(R.item.name) + '</span>' : '') + '</div><span class="sp"></span>' +
        '<button class="btn sm pri" data-act="macc:' + i + '">Accept</button></div></div>';
    });
  }
  ui_set(w.body, h);
}

// ---------- options ----------
function misc_options(w) {
  const v = typeof audVol !== 'undefined' ? audVol : { master: 0.8, music: 0.7, sfx: 0.85 };
  const sl = (k, lab) => '<div class="sld" style="grid-template-columns:70px 1fr 34px"><span>' + lab + '</span><input type="range" min="0" max="100" value="' + Math.round((v[k] ?? 0.8) * 100) + '" data-vol="' + k + '"><span class="mono">' + Math.round((v[k] ?? 0.8) * 100) + '</span></div>';
  const ck = (k, lab) => '<label class="row" style="margin:4px 0"><input type="checkbox" data-opt="' + k + '"' + (UI.opts[k] ? ' checked' : '') + '> ' + lab + '</label>';
  let h = '<div class="hd">Sound</div>' + sl('master', 'Master') + sl('music', 'Music') + sl('sfx', 'Effects');
  h += '<div class="hd">Graphics</div><div class="row" style="margin:4px 0"><span class="dim" style="width:70px">Quality</span><select class="txt" data-q="1"><option value="high"' + (UI.opts.quality !== 'low' ? ' selected' : '') + '>High (shadows)</option><option value="low"' + (UI.opts.quality === 'low' ? ' selected' : '') + '>Low (faster)</option></select></div>';
  h += ck('fps', 'Show frame rate') + ck('names', 'Show nameplates') + ck('rotMap', 'Rotate the minimap with my heading');
  h += '<div class="hd">Game</div><div class="row" style="flex-wrap:wrap;gap:6px"><button class="btn" data-act="osave:">Save game</button><button class="btn" data-act="oquit:">Save &amp; quit to title</button><button class="btn" data-act="oreset:">Reset window positions</button></div>';
  h += '<div class="hd">Keys</div><div class="note">Press <b class="amb">F1</b> for the full control list.</div>';
  h += '<div class="row" style="margin-top:10px"><span class="sp"></span><button class="btn pri" data-act="oclose:">Resume</button></div>';
  ui_set(w.body, h);
}
function misc_optInput(ev) {
  const t = ev.target;
  if (t.dataset.vol) {
    const v = +t.value / 100, k = t.dataset.vol;
    if (t.nextElementSibling) t.nextElementSibling.textContent = t.value;
    if (typeof setVolume === 'function') setVolume(k === 'master' ? v : null, k === 'music' ? v : null, k === 'sfx' ? v : null);
    if (ev.type === 'change') t.blur();
  } else if (t.dataset.opt && ev.type === 'change') {
    UI.opts[t.dataset.opt] = t.checked; ui_save();
    if (t.dataset.opt === 'fps') misc_applyFps();
    t.blur();
  } else if (t.dataset.q && ev.type === 'change') {
    UI.opts.quality = t.value; ui_save();
    if (typeof setQuality === 'function') setQuality(t.value);
    t.blur();
  }
}
function misc_applyFps() {
  if (typeof showFps !== 'undefined') showFps = !!UI.opts.fps;
  const f = $('#fps'); if (f && !UI.opts.fps) f.hidden = true;
}

// ---------- help ----------
function misc_help(w) {
  ui_set(w.body, '<div class="hd">Controls</div><div class="keys">' + MISC_KEYS.map(([k, d]) => '<kbd>' + esc(k) + '</kbd><span>' + esc(d) + '</span>').join('') + '</div>' +
    '<div class="hd">Getting started</div><div class="note" style="line-height:1.55">' +
    'Talk to the people around the Landfall shuttleport (F or right-click) for your first tasks. Target a creature with a click or Tab, then press <b class="amb">`</b> to attack; weapon specials and nano programs sit on the bars at the bottom of the screen.<br>' +
    'Levelling grants <b class="amb">Improvement Points</b>: spend them in the Character window (C) on your weapon skill, Body Development and your nano school. Better gear needs higher skills.<br>' +
    'Sit (X) between fights to recover. If you die you wake up at your last clone bay, so update your clone insurance whenever you reach a new outpost.<br>' +
    'Mission terminals hand out instanced contracts; the sliders decide what kind. Hoppers connect the cities and outposts.</div>' +
    '<div class="hd">Chat</div><div class="note">Press Enter to type. /help in the chat lists every command.</div>');
}

// ---------- generic NPC ----------
function misc_npc(w) {
  const npc = UI.npc;
  if (!npc) { ui_set(w.body, '<div class="empty">Nobody is here.</div>'); return; }
  w.bar.firstChild.textContent = npc.name;
  const sub = typeof hud_npcTitle === 'function' ? hud_npcTitle(npc) : '';
  const text = npc.greet || (npc.poi && npc.poi.data && (npc.poi.data.text || npc.poi.data.greet)) ||
    { trainer: 'Every skill you have is just a habit. Habits can be unlearned, for a price. Today it is free.', faction: 'The cause always needs capable hands. Come back when you have made a name for yourself.' }[npc.role] || 'Safe travels out there.';
  let h = (sub ? '<div class="hd">' + esc(sub) + '</div>' : '') + '<div style="line-height:1.5;margin-bottom:10px">' + esc(text) + '</div>';
  if (npc.role === 'trainer' && typeof respec === 'function') h += '<div class="row"><span class="note">Refund all spent improvement points.</span><span class="sp"></span><button class="btn bad" data-act="respec:">Reset skills</button></div>';
  ui_set(w.body, h);
}

// ---------- registries ----------
function misc_regs() {
  UI.acts.tinv = () => misc_invite();
  UI.acts.tinvt = () => { const t = PLAYER && PLAYER.target; if (t) misc_invite(t.name); };
  UI.acts.tleave = () => { if (typeof teamLeave === 'function') teamLeave(); else if (!(typeof chatCommand === 'function' && chatCommand('leave', []))) ui_missing('Leaving a team'); ui_refreshWin(UI.wins.team); };
  UI.acts.tkick = (id) => {
    const m = TEAM.members.find((x) => String(x.id) === id);
    if (!m) return;
    ui_confirm('Remove <b>' + esc(m.name) + '</b> from the team?', () => { if (typeof teamKick === 'function') teamKick(m); else ui_missing('Kicking'); ui_refreshWin(UI.wins.team); }, 'Kick');
  };
  const mFind = (id) => (PLAYER.char.missions || []).find((m) => String(m.id) === String(id));
  UI.acts.mmap = (id) => {
    const m = mFind(id);
    if (!m) return;
    UI.mapFocus = m;
    const z = m.location && m.location.zone;
    if (z && typeof ZONE !== 'undefined' && ZONE && z !== ZONE.id) ui_toast('That mission is in ' + ui_zoneName(z) + '.', 'info');
    uiOpen('map');
  };
  UI.acts.mab = (id) => {
    const m = mFind(id);
    if (!m) return;
    ui_confirm('Abandon <b>' + esc(m.title) + '</b>? Its mission items will be lost.', () => { if (typeof abandonMission === 'function') abandonMission(m); else ui_missing('Abandoning missions'); ui_refreshWin(UI.wins.missions); }, 'Abandon');
  };
  UI.tips.mitem = (id) => { const m = mFind(id); return m && m.reward && m.reward.item ? inv_tip(m.reward.item, 'Mission reward') : null; };
  UI.tips.oitem = (i) => { const o = UI.termOffers && UI.termOffers[+i]; return o && o.reward && o.reward.item ? inv_tip(o.reward.item, 'Mission reward') : null; };
  // vendor
  const vFind = (u) => UI.npc && (UI.npc.stock || []).find((i) => String(i.uid) === String(u));
  UI.tips.vitem = (u) => { const it = vFind(u); if (!it) return null; const p = itemPrice(it, true); return inv_tip(it, (p > PLAYER.char.credits ? 'You cannot afford this (' : 'Click to buy (') + fmtInt(p) + ' cr)'); };
  UI.acts.vbuy = (u) => vend_buy(vFind(u));
  UI.ctxs.vbuy = (u) => vend_buy(vFind(u));
  UI.drags.vendor = (u) => { const it = vFind(u); return it ? { kind: 'vendor', item: it, icon: ui_icon(it.icon) } : null; };
  UI.dropOk.vend = (a, p) => (p.kind === 'item' ? true : null);
  UI.drops.vend = (a, p) => { if (p.kind === 'item' && p.item) inv_sell(p.item); };
  // clone bay, hopper
  UI.acts.clone = () => { if (typeof setClonePoint === 'function' && UI.npc) setClonePoint(UI.npc); else ui_missing('Clone insurance'); ui_refreshWin(UI.wins.clonebay, true); };
  UI.acts.hop = (i) => {
    const d = UI.npc && (UI.npc.destinations || [])[+i];
    if (!d) return;
    if (typeof travel !== 'function') { ui_missing('Travel'); return; }
    uiClose('hopper');
    travel(d);
  };
  // bank
  const bFind = (u) => bank_list().find((i) => String(i.uid) === String(u));
  UI.tips.bitem = (u) => { const it = bFind(u); return it ? inv_tip(it, 'Right-click or drag to your inventory to withdraw') : null; };
  UI.drags.bank = (u) => { const it = bFind(u); return it ? { kind: 'bank', item: it, icon: ui_icon(it.icon) } : null; };
  UI.ctxs.bank = (u) => bank_withdraw(bFind(u));
  UI.dropOk.bank = (a, p) => (p.kind === 'item' ? true : null);
  UI.drops.bank = (a, p) => { if (p.kind === 'item' && p.item) bank_deposit(p.item); };
  // terminal
  UI.acts.mreq = () => {
    if (typeof requestMissions !== 'function') { ui_missing('Mission generation'); return; }
    try { UI.termOffers = requestMissions(UI.npc, Object.assign({}, misc_sliders())) || []; } catch (e) { console.error(e); UI.termOffers = []; }
    if (typeof sfx === 'function') sfx('ui_open');
    ui_refreshWin(UI.wins.terminal, true);
    const b = UI.wins.terminal.body, hd = b.querySelector('.hd');
    if (hd) b.scrollTop = hd.offsetTop - 10;
  };
  UI.acts.macc = (i) => {
    const o = UI.termOffers && UI.termOffers[+i];
    if (!o) return;
    if (typeof acceptMission !== 'function') { ui_missing('Accepting missions'); return; }
    const r = acceptMission(UI.npc, o);
    if (r && r.ok === false) { ui_res(r); return; }
    if (r) { UI.termOffers.splice(+i, 1); ui_toast('Mission accepted: ' + o.title, 'info'); }
    ui_refreshWin(UI.wins.terminal, true);
  };
  // options
  UI.acts.osave = () => { if (typeof saveGame === 'function') saveGame(); else ui_missing('Saving'); };
  UI.acts.oquit = () => { uiClose('options'); if (typeof quitToTitle === 'function') quitToTitle(); else ui_missing('Quitting'); };
  UI.acts.oreset = () => { UI.store.pos = {}; ui_save(); for (const id in UI.wins) { const w = UI.wins[id]; if (w.open) ui_place(w); } ui_toast('Window positions reset.', 'info'); };
  UI.acts.oclose = () => uiClose('options');
  UI.acts.respec = () => ui_confirm('Refund all of your improvement points?', () => { respec(PLAYER.char); if (typeof refreshStats === 'function') refreshStats(PLAYER); EV.emit('log', 'Your improvement points have been refunded.', 'info'); }, 'Reset');
}
function misc_events() {
  EV.on('teaminvite', (from) => {
    if (!from || UI.state !== 'play') return;
    ui_confirm('<b>' + esc(from.name) + '</b> (level ' + from.level + ' ' + esc(from.char ? ui_profName(from.char.prof) : '') + ') invites you to join their team.',
      () => { if (typeof teamAccept === 'function') teamAccept(from); else if (typeof chatCommand === 'function') chatCommand('accept', [from.name]); },
      'Join', () => { if (typeof teamDecline === 'function') teamDecline(from); }, 'Decline');
  });
  EV.on('mission', () => { if (UI.wins.terminal && UI.wins.terminal.open) ui_dirty('terminal'); });
}
