// Ashreach — title screen: logo, save slots (continue / delete), new character, key help

const TI = { el: null, list: null };

function ti_build() {
  const el = ui_h('div', 'screen', null, UI.root);
  el.id = 'title'; el.hidden = true;
  TI.el = el;
  el.innerHTML = '<h1 id="logo">ASHREACH</h1><div class="tagl">an offline online world</div><div class="rule"></div>' +
    '<div id="saves" class="pnl"></div>' +
    '<div class="help"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move · <kbd>Q</kbd><kbd>E</kbd> strafe · hold <kbd>RMB</kbd> to steer · <kbd>LMB</kbd> target · <kbd>Tab</kbd> next enemy · <kbd>`</kbd> attack · <kbd>1</kbd>–<kbd>0</kbd> hotbar · <kbd>F</kbd> talk · <kbd>X</kbd> sit<br>' +
    '<kbd>C</kbd> character · <kbd>I</kbd> inventory · <kbd>N</kbd> nanos · <kbd>M</kbd> map · <kbd>J</kbd> missions · <kbd>Enter</kbd> chat · <kbd>F1</kbd> help</div>' +
    '<div class="foot">Single player · saved in this browser · the other "players" are simulated</div>';
  TI.list = el.querySelector('#saves');
  UI.acts.tcont = (slot) => { if (typeof continueSave === 'function') { if (!continueSave(+slot)) { ui_toast('That save could not be loaded.'); ti_render(); } } else ui_missing('Loading'); };
  UI.acts.tdel = (slot) => {
    const s = ti_saves().find((x) => x.slot === +slot);
    ui_confirm('Delete <b>' + esc(s ? s.name : 'this character') + '</b> forever?', () => { if (typeof deleteSave === 'function') deleteSave(+slot); ti_render(); }, 'Delete');
  };
  UI.acts.tnew = () => showChargen();
}
function ti_saves() { try { return typeof listSaves === 'function' ? listSaves() || [] : []; } catch (e) { return []; } }
function ti_ago(t) {
  if (!t) return '';
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : d + ' days ago';
}
function ti_render() {
  const saves = ti_saves();
  let h = '<div class="hd">Characters</div>';
  if (!saves.length) h += '<div class="empty" style="padding:14px 0">No characters yet. The Concord shuttle is waiting.</div>';
  for (const s of saves.slice(0, 8)) {
    const P = typeof PROFS !== 'undefined' && PROFS[s.prof], col = P ? P.color : '#9fb0bf';
    h += '<div class="slot"><div class="sb" style="color:' + col + ';border-color:' + ui_rgba(col, 0.6) + ';background:' + ui_rgba(col, 0.12) + '">' + s.level + '</div>' +
      '<div><div class="sn">' + esc(s.name) + '</div><div class="sd">Level <b>' + s.level + '</b> ' + esc(ui_breedName(s.breed)) + ' <b>' + esc(ui_profName(s.prof)) + '</b> · <span style="color:' + uiFactionColor(s.faction) + '">' + esc(cap1(s.faction || '')) + '</span><br>' +
      esc(ui_zoneName(s.zone)) + (s.time ? ' · ' + ti_ago(s.time) : '') + '</div></div>' +
      '<div class="row"><button class="btn pri" data-act="tcont:' + s.slot + '">Continue</button><button class="btn bad sm" data-act="tdel:' + s.slot + '" data-tip="text:Delete this character">✕</button></div></div>';
  }
  h += '<div class="newc"><button class="btn' + (saves.length ? '' : ' pri') + ' big" data-act="tnew:">New Character</button></div>';
  ui_set(TI.list, h);
}
function showTitle() {
  if (!UI.root) uiInit();
  UI.state = 'title';
  ui_hudVisible(false);
  if (typeof cg_hide === 'function') cg_hide();
  if (UI.modal) UI.modal.close();
  TI.el.hidden = false;
  ti_render();
}
function hideTitle() {
  if (!UI.root) uiInit();
  TI.el.hidden = true;
  if (typeof cg_hide === 'function') cg_hide();
  UI.state = 'play';
  HUD.hotSig = HUD.spSig = HUD.buffSig = HUD.teamSig = HUD.tbuffSig = '';
  HUD.map = null; HUD.mapZone = null; HUD.ipNag = false;
  for (const k in HUD.alerts) HUD.alerts[k] = false;
  ui_hudVisible(true);
  ti_seedHotbar();
  if (UI.opts.quality === 'low' && typeof setQuality === 'function') setQuality('low');
  misc_applyFps();
}
// A brand-new character starts with its programs and kits on the first bar.
function ti_seedHotbar() {
  const c = PLAYER && PLAYER.char;
  if (!c || (c.hotbar && c.hotbar.some(Boolean))) return;
  const hb = c.hotbar = new Array(20).fill(null);
  (c.nanos || []).slice(0, 6).forEach((id, i) => { hb[i] = { type: 'nano', id }; });
  let k = 7;
  for (const t of ['health_kit', 'nano_kit']) { const it = c.inv.find((i) => i.t === t); if (it) hb[k++] = { type: 'item', uid: it.uid, t: it.t, name: it.name, icon: it.icon }; }
}
