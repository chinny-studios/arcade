// Ashreach — inventory window: item grid, tooltips, use/equip/sell by right-click, drag to slots/hotbar, sort, destroy

const INV_ORDER = ['weapon', 'armor', 'util', 'implant', 'cluster', 'nanocrystal', 'consumable', 'misc', 'key'];

function inv_build() {
  uiWin('inv', {
    title: 'Inventory', key: 'I', w: 384, foot: true, x: (w) => innerWidth - w - 14, y: (w, h) => Math.max(10, innerHeight - h - 130),
    refresh: inv_refresh, live: 1,
  });
  inv_regs();
}
function inv_cap() { return typeof INV_MAX !== 'undefined' ? INV_MAX : 48; }
function inv_refresh(w) {
  if (!PLAYER || !PLAYER.char) return;
  const inv = PLAYER.char.inv, cap = Math.max(inv.length, inv_cap());
  const cells = Math.ceil(cap / 8) * 8;
  let h = '<div class="igrid dropzone" data-drop="inv">';
  for (let i = 0; i < cells; i++) {
    const it = inv[i];
    if (!it) { h += '<div class="cell" data-drop="inv"' + (i >= cap ? ' style="opacity:.3"' : '') + '></div>'; continue; }
    h += inv_cell(it, 'item');
  }
  h += '</div>';
  ui_set(w.body, h);
  ui_set(w.foot, '<span class="cr" data-tip="text:Credits">' + fmtInt(PLAYER.char.credits) + '</span><span class="sp"></span><span class="mono dim" style="font-size:11px">' + inv.length + '/' + inv_cap() + '</span>' +
    '<button class="btn sm" data-act="isort:" data-tip="text:Sort by kind, name and quality">Sort</button><div class="trash" data-drop="trash" data-tip="text:Drag an item here to destroy it">🗑</div>');
}
function inv_cell(it, kind) {
  const bad = (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'util' || it.kind === 'implant' || it.kind === 'nanocrystal') && typeof itemReqsMet === 'function' && !itemReqsMet(PLAYER.S, it).ok;
  const ct = it.stack > 1 ? '<span class="ct">' + it.stack + '</span>' : '';
  return '<div class="cell' + (bad ? ' bad' : '') + '" data-drag="' + kind + ':' + it.uid + '" data-tip="' + kind + ':' + it.uid + '" data-ctx="' + kind + ':' + it.uid + '" data-drop="invit:' + it.uid + '">' +
    ui_icon(it.icon) + ct + (it.kind !== 'nanocrystal' && it.kind !== 'key' ? '<span class="ql">' + it.ql + '</span>' : '') + '</div>';
}
// Item tooltip: name, kind line, description lines, requirements coloured against the player's stats.
function inv_tip(it, hint) {
  if (!it) return null;
  const S = PLAYER ? PLAYER.S : null;
  const col = typeof it_tierColor === 'function' && it.kind !== 'nanocrystal' ? it_tierColor(it.ql) : ui_col(it.icon && it.icon.color);
  let lines = typeof itemDesc === 'function' ? itemDesc(it, S) : ['QL ' + it.ql + ' ' + it.kind];
  const sub = lines[0] || '';
  let h = ui_tipHead(it.name + (it.stack > 1 ? ' ×' + it.stack : ''), col, esc(sub));
  for (const L of lines.slice(1)) {
    if (/^Requires:/.test(L)) continue;
    if (/^Value /.test(L)) continue;
    const m = /^([+−-])/.exec(L);
    h += '<div class="' + (m ? 'tr ' + (m[1] === '+' ? 'ok' : 'no') : 'tl') + '">' + esc(L) + '</div>';
  }
  const rq = it.reqs || {};
  const keys = Object.keys(rq);
  if (keys.length) {
    h += '<hr><div class="dim" style="font-size:10px;letter-spacing:.14em;text-transform:uppercase">Requirements</div><div class="tr">';
    h += keys.map((k) => {
      const have = k === 'level' ? (PLAYER ? PLAYER.level : 0) : Math.floor((S && S[k]) || 0);
      return '<span class="' + (have >= rq[k] ? 'ok' : 'no') + '">' + esc(ui_sn(k)) + ' ' + rq[k] + (have < rq[k] ? ' <span class="dim">(' + have + ')</span>' : '') + '</span>';
    }).join('<br>') + '</div>';
  }
  if (it.kind === 'nanocrystal' && it.nano && PLAYER && PLAYER.char.nanos.includes(it.nano)) h += '<div class="amb">You already know this program.</div>';
  const price = typeof itemPrice === 'function' && it.kind !== 'key' ? itemPrice(it, false) : 0;
  h += '<hr><div class="tr dim">' + (UI.wins.vendor && UI.wins.vendor.open && price ? 'Sells for <span class="amb">' + fmtInt(price * (it.stack || 1)) + ' cr</span>' : 'Value ' + fmtInt(it.value || 0) + ' cr') + '</div>';
  if (hint) h += '<div class="dim">' + esc(hint) + '</div>';
  return h;
}
function inv_hint(it) {
  if (UI.wins.vendor && UI.wins.vendor.open) return 'Right-click to sell';
  if (UI.wins.bank && UI.wins.bank.open) return 'Right-click to store in the bank';
  return { weapon: 'Right-click to equip', armor: 'Right-click to equip', util: 'Right-click to equip', implant: 'Right-click to implant', nanocrystal: 'Right-click to upload the program', consumable: 'Right-click to use · drag to the hotbar', cluster: 'Drag onto an implant socket' }[it.kind] || '';
}
function inv_use(it) {
  if (UI.wins.vendor && UI.wins.vendor.open && UI.npc) { inv_sell(it); return; }
  if (UI.wins.bank && UI.wins.bank.open) { bank_deposit(it); return; }
  if (it.kind === 'cluster') { ui_toast('Drag the cluster onto an implant socket (Character → Implants).', 'info'); uiOpen('char'); UI.wins.char.tab = 'implants'; ui_refreshWin(UI.wins.char, true); return; }
  if (it.kind === 'misc' || it.kind === 'key') { ui_toast('You cannot use that.', 'info'); return; }
  if (typeof useItem !== 'function') { ui_missing('Using items'); return; }
  useItem(PLAYER, it);
}
function inv_sell(it) {
  if (it.kind === 'key' || it.quest) { ui_toast('Mission items cannot be sold.'); return; }
  if (typeof sellItem !== 'function') { ui_missing('Selling'); return; }
  const doSell = () => sellItem(UI.npc, it);
  if ((it.kind === 'implant' && it.clusters && Object.values(it.clusters).some(Boolean)) || itemPrice(it, false) * (it.stack || 1) > 2000) ui_confirm('Sell <b>' + esc(it.name) + '</b> for ' + fmtInt(itemPrice(it, false) * (it.stack || 1)) + ' credits?', doSell, 'Sell');
  else doSell();
}
function inv_sort() {
  const inv = PLAYER.char.inv;
  inv.sort((a, b) => (INV_ORDER.indexOf(a.kind) - INV_ORDER.indexOf(b.kind)) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) || (b.ql - a.ql));
  EV.emit('inv', PLAYER);
}
function inv_regs() {
  UI.tips.item = (u) => { const it = ui_findItem(u); return it ? inv_tip(it, inv_hint(it)) : null; };
  UI.drags.item = (u) => { const it = ui_findItem(u); return it ? { kind: 'item', item: it, icon: ui_icon(it.icon) } : null; };
  UI.ctxs.item = (u) => { const it = ui_findItem(u); if (it) inv_use(it); };
  UI.acts.isort = () => inv_sort();
  UI.dropOk.inv = (a, p) => (['equip', 'implant', 'bank', 'vendor'].includes(p.kind) ? true : null);
  UI.dropOk.invit = (u, p) => {
    if (p.kind === 'item' && p.item && p.item.kind === 'cluster') { const it = ui_findItem(u); if (it && it.kind === 'implant') return typeof clusterFits === 'function' && clusterFits(it, p.item, p.item.socket) && !it.clusters[p.item.socket]; }
    return UI.dropOk.inv(u, p);
  };
  UI.drops.inv = (a, p) => inv_dropIn(p, null);
  UI.drops.invit = (u, p) => inv_dropIn(p, ui_findItem(u));
  UI.dropOk.trash = (a, p) => (p.kind === 'item' ? true : null);
  UI.drops.trash = (a, p) => {
    if (p.kind !== 'item' || !p.item) return;
    const it = p.item;
    ui_confirm('Destroy <b>' + esc(it.name) + '</b>' + (it.stack > 1 ? ' ×' + it.stack : '') + '? This cannot be undone.', () => {
      if (typeof removeItem === 'function') removeItem(PLAYER, it);
      for (const en of PLAYER.char.hotbar || []) if (en && en.type === 'item' && en.uid === it.uid) en.uid = -1;
      EV.emit('log', 'You destroyed ' + it.name + '.', 'info');
    }, 'Destroy');
  };
}
// Something was dropped on the inventory (onto `onto`, an inventory item, or empty space).
function inv_dropIn(p, onto) {
  const inv = PLAYER.char.inv;
  switch (p.kind) {
    case 'equip': cw_unequip(p.slot); return;
    case 'implant': cw_unimplant(p.slot); return;
    case 'bank': bank_withdraw(p.item); return;
    case 'vendor': vend_buy(p.item); return;
    case 'item': {
      const it = p.item;
      if (!onto || onto === it) return;
      if (it.kind === 'cluster' && onto.kind === 'implant') { cw_insert(onto, it, it.socket); return; }
      const a = inv.indexOf(it), b = inv.indexOf(onto);
      if (a < 0 || b < 0) return;
      inv[a] = onto; inv[b] = it;
      EV.emit('inv', PLAYER);
    }
  }
}
