// Ashreach — nano program window: known programs by school, Nano Memory usage, running programs, cast/drag to hotbar

const NW_TARGET = { self: 'Self', team: 'Team', friend: 'Friendly target', enemy: 'Hostile target', pet: 'Your pet' };

function nw_build() {
  uiWin('nanos', {
    title: 'Nano Programs', key: 'N', w: 440, h: 540, x: (w) => innerWidth - w - 210, y: (w, h) => Math.max(10, Math.min(110, innerHeight - h - 150)),
    refresh: nw_refresh, live: 0.25,
  });
  UI.tips.nano = (id) => nw_tip(id);
  UI.drags.nano = (id) => { const n = ui_nano(id); return n ? { kind: 'nano', id, icon: ui_icon(hud_nanoIcon(n)) } : null; };
  UI.acts.nano = (id) => nw_cast(id);
  UI.acts.nbuff = (id) => { if (typeof cancelBuff === 'function') cancelBuff(PLAYER, id); else ui_missing('Cancelling programs'); ui_refreshWin(UI.wins.nanos); };
  UI.acts.nschool = (id) => { UI.store.shut['n_' + id] = !UI.store.shut['n_' + id]; ui_save(); ui_refreshWin(UI.wins.nanos); };
}
function nw_cast(id) {
  if (typeof castNano !== 'function') { ui_missing('Nano casting'); return; }
  castNano(PLAYER, id, PLAYER.target);
}
function nw_school(n) {
  if (n.school) return n.school;
  const k = Object.keys(n.reqs || {})[0];
  return k === 'sen_sch' ? 'sen' : k || 'fab';
}
function nw_schoolInfo(id) { return (typeof NANO_SCHOOLS !== 'undefined' && NANO_SCHOOLS[id]) || { name: cap1(id || 'Other'), color: '#7fd0ff' }; }
function nw_refresh(w) {
  if (!PLAYER || !PLAYER.char) return;
  const c = PLAYER.char, S = PLAYER.S;
  const used = typeof ncuUsed === 'function' ? ncuUsed(PLAYER) : 0, tot = S.ncu || 0;
  let h = '<div class="ncu"><div class="row"><span class="hd" style="margin:0">Nano Memory</span><span class="sp"></span><span class="mono">' + used + ' / ' + tot + '</span></div>' +
    '<div class="bar"><i style="transform:scaleX(' + (tot ? clamp(used / tot, 0, 1) : 0).toFixed(3) + ')"></i></div></div>';
  const run = (PLAYER.buffs || []).filter((b) => !b.hostile);
  h += '<div class="hd">Running programs</div>';
  if (!run.length) h += '<div class="empty" style="padding:2px 0 4px">None. Buffs you run occupy Nano Memory.</div>';
  for (const b of run) {
    const n = ui_nano(b.nano);
    h += '<div class="run" data-tip="nano:' + esc(b.nano) + '"><div class="cell">' + ui_icon(b.icon || hud_nanoIcon(n)) + '</div><span>' + esc(b.name || (n && n.name) || b.nano) + '</span><span class="sp"></span>' +
      '<span class="mono dim">' + (b.ncu ? b.ncu + ' NM · ' : '') + (b.dur > 0 ? ui_time(b.t) : '∞') + '</span>' +
      (n ? '<button class="pm" data-act="nbuff:' + esc(b.nano) + '" data-tip="text:Cancel this program">×</button>' : '') + '</div>';
  }
  const groups = {};
  for (const id of c.nanos) { const n = ui_nano(id); if (n) (groups[nw_school(n)] = groups[nw_school(n)] || []).push([id, n]); }
  const order = typeof NANO_SCHOOLS !== 'undefined' ? Object.keys(NANO_SCHOOLS) : Object.keys(groups);
  for (const k of Object.keys(groups)) if (!order.includes(k)) order.push(k);
  if (!c.nanos.length) h += '<div class="empty">You know no nano programs. Buy nanocrystals from a nano vendor and right-click them to upload.</div>';
  for (const sc of order) {
    const list = groups[sc];
    if (!list) continue;
    const info = nw_schoolInfo(sc), shut = UI.store.shut['n_' + sc];
    const skv = Math.round(S[info.stat || sc] || 0);
    list.sort((a, b) => (a[1].line < b[1].line ? -1 : a[1].line > b[1].line ? 1 : 0) || (b[1].lvl - a[1].lvl));
    h += '<div class="scat' + (shut ? ' shut' : '') + '" data-act="nschool:' + sc + '" style="color:' + info.color + '"><span class="ar">▼</span>' + esc(info.name) + '<span class="sp"></span><span class="mono dim" style="letter-spacing:0">skill ' + skv + ' · ' + list.length + '</span></div>';
    if (shut) continue;
    for (const [id, n] of list) {
      const ok = typeof nanoReqMet !== 'function' || nanoReqMet(S, n);
      const cost = typeof nanoCostFor === 'function' ? nanoCostFor(PLAYER, n) : n.cost;
      const cd = PLAYER.cds ? PLAYER.cds['n:' + id] || 0 : 0, cdm = (PLAYER.cdMax && PLAYER.cdMax['n:' + id]) || n.recharge || 1;
      h += '<div class="nrow' + (ok ? '' : ' bad') + '" data-act="nano:' + esc(id) + '" data-tip="nano:' + esc(id) + '">' +
        '<div class="cell" data-drag="nano:' + esc(id) + '">' + ui_icon(hud_nanoIcon(n)) + (cd > 0 ? '<div class="cd" style="--cd:' + (cd / cdm).toFixed(2) + '">' + Math.ceil(cd) + '</div>' : '') + '</div>' +
        '<div style="min-width:0"><div class="nn">' + esc(n.name) + ' <span class="mono dim" style="font-size:10px">L' + n.lvl + '</span></div><div class="nd">' + esc(n.desc || '') + '</div></div>' +
        '<div class="nm"><span class="' + (PLAYER.np >= cost ? '' : 'no') + '">' + cost + ' NP</span>' + (n.ncu ? ' · ' + n.ncu + ' NM' : '') + '<br>' + ui_fmt(n.cast || 0) + 's / ' + ui_fmt(n.recharge || 0) + 's</div></div>';
    }
  }
  h += '<div class="note" style="margin-top:8px">Click a program to execute it on your target. Drag its icon to a hotbar slot.</div>';
  ui_set(w.body, h);
}
function nw_tip(id) {
  const n = ui_nano(id);
  if (!n) return null;
  const S = PLAYER ? PLAYER.S : {}, sc = nw_schoolInfo(nw_school(n));
  const cost = PLAYER && typeof nanoCostFor === 'function' ? nanoCostFor(PLAYER, n) : n.cost;
  let h = ui_tipHead(n.name, sc.color, 'Level ' + (n.lvl || 1) + ' · ' + esc(sc.name) + ' · ' + esc(NW_TARGET[n.target] || n.target || '')) + (n.desc ? '<div class="tl">' + esc(n.desc) + '</div>' : '');
  const rows = [['Nano cost', cost + ' NP'], ['Cast time', ui_fmt(n.cast || 0) + ' s'], ['Recharge', ui_fmt(n.recharge || 0) + ' s']];
  if (n.range) rows.push(['Range', n.range + ' m']);
  if (n.dur) rows.push(['Duration', ui_time(n.dur)]);
  if (n.ncu) rows.push(['Nano Memory', n.ncu + ' NM']);
  h += '<hr><div class="kv">' + rows.map(([a, b]) => '<span>' + a + '</span><span>' + b + '</span>').join('') + '</div>';
  const rq = n.reqs || {};
  if (Object.keys(rq).length) {
    h += '<hr><div class="tr">' + Object.keys(rq).map((k) => { const have = PLAYER ? Math.floor(S[k] || 0) : 1e9; return '<span class="' + (!PLAYER ? 'tl' : have >= rq[k] ? 'ok' : 'no') + '">' + esc(ui_sn(k)) + ' ' + rq[k] + (have < rq[k] ? ' <span class="dim">(' + have + ')</span>' : '') + '</span>'; }).join('<br>') + '</div>';
  }
  if (n.prof && n.prof !== 'any') h += '<div class="dim">' + esc(ui_profName(n.prof)) + ' program</div>';
  return h;
}
