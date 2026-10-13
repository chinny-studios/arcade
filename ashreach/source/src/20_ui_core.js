// Ashreach — UI core: DOM helpers, window manager, tooltips, drag & drop, banners, keyboard, public ui* entry points

// Everything interactive in the UI is wired through data attributes resolved by small registries:
//   data-tip="kind:arg"  -> UI.tips[kind](arg, el) returns tooltip html
//   data-drag="kind:arg" -> UI.drags[kind](arg, el) returns a payload { kind, icon, ... }
//   data-drop="kind:arg" -> UI.drops[kind](arg, payload, el); UI.dropOk[kind](arg, payload) -> true/false/null (highlight)
//   data-act="kind:arg"  -> UI.acts[kind](arg, el, ev)   (left click)
//   data-ctx="kind:arg"  -> UI.ctxs[kind](arg, el, ev)   (right click)
// so windows can rebuild their innerHTML freely without re-binding listeners.
const UI = {
  root: null, state: 'boot', wins: {}, z: 30, tips: {}, drags: {}, drops: {}, dropOk: {}, acts: {}, ctxs: {}, nowhere: {},
  drag: null, down: null, mdown: false, tipEl: null, tipSrc: null, tipT: 0, mx: 0, my: 0, npc: null, store: null, t: 0,
  bannerT: 0, toasts: [], opts: { fps: false, rotMap: false, mmZoom: 0.7, names: true },
};
const UI_WIN_IDS = ['char', 'inv', 'nanos', 'map', 'team', 'missions', 'options', 'vendor', 'clonebay', 'hopper', 'terminal', 'bank', 'help', 'npc'];
const UI_NPC_WINS = ['vendor', 'clonebay', 'hopper', 'terminal', 'bank', 'npc'];

// ---------- small helpers ----------
function ui_h(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
// Set innerHTML only when it changed, keeping scroll position (cheap periodic refreshes, no hover flicker).
function ui_set(el, html) {
  if (el._h === html) return false;
  const st = el.scrollTop;
  el.innerHTML = html; el._h = html;
  el.scrollTop = st;
  return true;
}
const ui_q = (sel, el) => (el || document).querySelector(sel);
function ui_col(c) {
  if (typeof c === 'number') return '#' + c.toString(16).padStart(6, '0');
  return c || '#9fb0bf';
}
function ui_rgba(c, a) {
  let h = ui_col(c).replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
// A glyph icon: { glyph, color }.
function ui_icon(icon, fallback) {
  icon = icon || { glyph: fallback || '?', color: '#9fb0bf' };
  const c = ui_col(icon.color);
  const g = String(icon.glyph || fallback || '?');
  return '<div class="ico" style="color:' + c + ';border-color:' + ui_rgba(c, 0.55) + ';background:radial-gradient(circle at 35% 30%,' + ui_rgba(c, 0.32) + ',' + ui_rgba(c, 0.08) + ' 70%),#0b1014' + (g.length > 2 ? ';font-size:10px' : '') + '">' + esc(g) + '</div>';
}
function ui_sn(id) {
  if (typeof STAT_NAMES !== 'undefined' && STAT_NAMES[id]) return STAT_NAMES[id];
  if (typeof it_statName === 'function') return it_statName(id);
  return String(id);
}
function ui_fmt(n) { return typeof n !== 'number' || !isFinite(n) ? '–' : Math.abs(n) >= 1000 ? fmtInt(n) : (Math.round(n * 10) / 10).toString(); }
function ui_time(s) {
  s = Math.max(0, Math.ceil(s));
  if (s >= 3600) return Math.floor(s / 3600) + 'h';
  if (s >= 60) return Math.floor(s / 60) + 'm' + (s < 600 ? ('0' + (s % 60)).slice(-2) : '');
  return s + 's';
}
const ui_has = (fname) => typeof fname === 'function';
// Report an {ok,msg} result: failures as a red toast (successes are logged by the modules themselves).
function ui_res(r, okMsg) {
  if (r && r.ok === false && r.msg) ui_toast(r.msg);
  else if (r !== false && okMsg) ui_toast(okMsg, 'info');
  return r;
}
function ui_missing(what) { ui_toast(what + ' is not available yet.', 'info'); }
function ui_nano(n) {
  if (!n) return null;
  if (typeof n === 'string') { const d = typeof NANOS !== 'undefined' && NANOS[n]; return d ? Object.assign({ id: n }, d) : null; }
  return n;
}
function ui_nanoId(n) {
  if (!n) return null;
  if (typeof n === 'string') return n;
  if (n.id) return n.id;
  if (typeof NANOS !== 'undefined') for (const k in NANOS) if (NANOS[k] === n) return k;
  return null;
}
function ui_findItem(uidStr) {
  if (!PLAYER || !PLAYER.char) return null;
  const c = PLAYER.char, m = (i) => i && String(i.uid) === String(uidStr);
  let it = c.inv.find(m);
  if (it) return it;
  for (const s in c.equip) if (m(c.equip[s])) return c.equip[s];
  for (const s in c.implants || {}) if (m(c.implants[s])) return c.implants[s];
  if (c.bank) { it = c.bank.find(m); if (it) return it; }
  if (UI.npc && UI.npc.stock) { it = UI.npc.stock.find(m); if (it) return it; }
  return null;
}
// Con colour by level difference (target level vs player level).
function uiCon(level) {
  if (!PLAYER) return '#ffffff';
  const d = level - PLAYER.level;
  if (d <= -10) return '#9a9a9a';
  if (d <= -5) return '#5fd35f';
  if (d <= -2) return '#5aa8ff';
  if (d <= 1) return '#f4f4f4';
  if (d <= 3) return '#ffe14a';
  if (d <= 6) return '#ff9a2e';
  return '#ff4a3a';
}
function uiFactionColor(f) {
  if (typeof FACTIONS !== 'undefined' && FACTIONS[f]) return FACTIONS[f].color;
  return { meridian: '#4f8fd6', freehold: '#d9703a', unaligned: '#b9b39a' }[f] || '#cccccc';
}
function ui_profName(p) { return (typeof PROFS !== 'undefined' && PROFS[p]) ? PROFS[p].name : (p ? cap1(p) : ''); }
function ui_breedName(b) { return (typeof BREEDS !== 'undefined' && BREEDS[b]) ? BREEDS[b].name : (b ? cap1(b) : ''); }
function ui_zoneName(z) { return (typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS[z]) ? ZONE_DEFS[z].name : (z ? cap1(String(z).replace(/_/g, ' ')) : ''); }
function ui_specialName(id) { return (typeof SPECIALS !== 'undefined' && SPECIALS[id]) ? SPECIALS[id].name : (typeof IT_SPECIAL_NAME !== 'undefined' && IT_SPECIAL_NAME[id]) || cap1(id); }

// ---------- persistence ----------
function ui_load() {
  if (UI.store) return UI.store;
  let s = null;
  try { s = JSON.parse(localStorage.getItem('ashreach.ui') || 'null'); } catch (e) { s = null; }
  UI.store = s && typeof s === 'object' ? s : {};
  UI.store.pos = UI.store.pos || {}; UI.store.shut = UI.store.shut || {};
  Object.assign(UI.opts, UI.store.opts || {});
  return UI.store;
}
function ui_save() {
  UI.store.opts = UI.opts;
  try { localStorage.setItem('ashreach.ui', JSON.stringify(UI.store)); } catch (e) { /* storage blocked */ }
}

// ---------- windows ----------
// o: { title, key, w, h, x, y, cls, tabs:[[id,label]], build(w), refresh(w), live /*s between auto refreshes*/, onOpen(w), onClose(w), noClose }
function uiWin(id, o) {
  const el = ui_h('div', 'win pnl ' + (o.cls || ''), null, UI.root);
  el.id = 'win-' + id; el.hidden = true;
  if (o.w) el.style.width = o.w + 'px';
  if (o.h) el.style.height = o.h + 'px';
  const bar = ui_h('div', 'wt', '<span>' + esc(o.title) + '</span>' + (o.key ? '<span class="wk">' + esc(o.key) + '</span>' : '') + (o.noClose ? '' : '<button class="wx" title="Close">×</button>'), el);
  const w = { id, o, el, bar, body: null, foot: null, open: false, tab: null, refT: 0, dirty: true };
  if (o.tabs) {
    w.tabsEl = ui_h('div', 'tabs', null, el);
    w.tabsEl.style.margin = '6px 8px 0';
    w.tab = (ui_load().tabs || {})[id] || o.tabs[0][0];
    for (const [tid, lab] of o.tabs) {
      const t = ui_h('div', 'tab', esc(lab), w.tabsEl);
      t.dataset.tab = tid;
      t.onclick = () => { w.tab = tid; (UI.store.tabs = UI.store.tabs || {})[id] = tid; ui_save(); w.body.scrollTop = 0; ui_refreshWin(w, true); };
    }
  }
  w.body = ui_h('div', 'wb', null, el);
  if (o.foot) w.foot = ui_h('div', 'wf', null, el);
  bar.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0 || ev.target.closest('.wx')) return;
    ev.preventDefault();
    ui_raise(w);
    const r = el.getBoundingClientRect();
    UI.moving = { w, dx: ev.clientX - r.left, dy: ev.clientY - r.top };
  });
  const x = bar.querySelector('.wx');
  if (x) x.onclick = () => uiClose(id);
  el.addEventListener('mousedown', () => ui_raise(w), true);
  if (o.build) o.build(w);
  UI.wins[id] = w;
  return w;
}
function ui_raise(w) {
  if (w.el.style.zIndex == UI.z) return;
  if (++UI.z > 700) {   // renumber so windows never climb over banners, dialogs and tooltips
    const open = Object.values(UI.wins).sort((a, b) => (+a.el.style.zIndex || 0) - (+b.el.style.zIndex || 0));
    UI.z = 30; for (const o of open) o.el.style.zIndex = ++UI.z;
    UI.z++;
  }
  w.el.style.zIndex = UI.z;
  for (const k in UI.wins) UI.wins[k].el.classList.toggle('top', UI.wins[k] === w);
}
function ui_place(w) {
  const p = UI.store.pos[w.id];
  const W = w.el.offsetWidth || w.o.w || 300, H = w.el.offsetHeight || 200;
  let x, y;
  if (p) { x = p[0]; y = p[1]; } else {
    x = typeof w.o.x === 'function' ? w.o.x(W, H) : w.o.x != null ? w.o.x : (innerWidth - W) / 2;
    y = typeof w.o.y === 'function' ? w.o.y(W, H) : w.o.y != null ? w.o.y : Math.max(40, (innerHeight - H) / 2 - 40);
  }
  ui_moveWin(w, x, y);
}
function ui_moveWin(w, x, y) {
  const W = w.el.offsetWidth || 200;
  x = clamp(Math.round(x), Math.min(0, 60 - W), Math.max(0, innerWidth - 60));
  y = clamp(Math.round(y), 0, Math.max(0, innerHeight - 30));
  w.el.style.left = x + 'px'; w.el.style.top = y + 'px';
  w.x = x; w.y = y;
}
function ui_refreshWin(w, force) {
  if (!w.open) return;
  if (w.tabsEl) for (const t of w.tabsEl.children) t.classList.toggle('on', t.dataset.tab === w.tab);
  if (force) w.body._h = null;
  if (w.o.refresh) w.o.refresh(w);
  w.dirty = false; w.refT = 0;
}
function uiOpen(id, arg) {
  const w = UI.wins[id];
  if (!w) return;
  if (arg !== undefined) w.arg = arg;
  const was = w.open;
  w.open = true; w.el.hidden = false;
  if (w.o.onOpen) w.o.onOpen(w);
  ui_refreshWin(w, true);
  if (!was) ui_place(w);
  ui_raise(w);
  ui_microSync();
}
function uiClose(id) {
  const w = UI.wins[id];
  if (!w || !w.open) return;
  w.open = false; w.el.hidden = true;
  if (w.o.onClose) w.o.onClose(w);
  if (UI.tipSrc && w.el.contains(UI.tipSrc)) ui_tipHide();
  ui_microSync();
}
function uiToggle(id) { const w = UI.wins[id]; if (w) (w.open ? uiClose : uiOpen)(id); }
function ui_dirty(...ids) { for (const id of ids) if (UI.wins[id]) UI.wins[id].dirty = true; }
function ui_closeAll(keepChat) { for (const id in UI.wins) uiClose(id); }
function ui_topWin() {
  let best = null;
  for (const id in UI.wins) { const w = UI.wins[id]; if (w.open && !w.o.noClose && (!best || (+w.el.style.zIndex || 0) > (+best.el.style.zIndex || 0))) best = w; }
  return best;
}
function ui_microSync() { if (typeof hud_microSync === 'function') hud_microSync(); }

// ---------- tooltips ----------
function ui_tipShow(html, x, y) {
  const t = UI.tipEl;
  if (t._h !== html) { t.innerHTML = html; t._h = html; }
  t.hidden = false;
  const r = t.getBoundingClientRect();
  let tx = x + 16, ty = y + 18;
  if (tx + r.width > innerWidth - 6) tx = x - r.width - 12;
  if (ty + r.height > innerHeight - 6) ty = Math.max(4, y - r.height - 10);
  t.style.left = Math.max(4, tx) + 'px'; t.style.top = ty + 'px';
}
function ui_tipHide() { UI.tipEl.hidden = true; UI.tipSrc = null; }
function ui_tipFor(el) {
  const spec = el.dataset.tip, i = spec.indexOf(':');
  const k = i < 0 ? spec : spec.slice(0, i), a = i < 0 ? '' : spec.slice(i + 1);
  if (k === 'text') return esc(a);
  if (k === 'html') return a;
  const f = UI.tips[k];
  return f ? f(a, el) : null;
}
function ui_tipUpdate() {
  if (UI.drag) { if (!UI.tipEl.hidden) ui_tipHide(); return; }
  const el = UI.hover && UI.hover.closest && UI.hover.closest('[data-tip]');
  if (!el || !UI.root.contains(el)) { if (!UI.tipEl.hidden) ui_tipHide(); return; }
  const html = ui_tipFor(el);
  if (!html) { ui_tipHide(); return; }
  UI.tipSrc = el;
  ui_tipShow(html, UI.mx, UI.my);
}
// Generic tooltip pieces.
function ui_tipHead(name, color, sub) { return '<div class="tn" style="color:' + ui_col(color || '#fff') + '">' + esc(name) + '</div>' + (sub ? '<div class="ts">' + sub + '</div>' : ''); }

// ---------- drag & drop ----------
function ui_spec(el, attr) {
  const s = el.getAttribute(attr), i = s.indexOf(':');
  return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
}
function ui_dragBegin(payload, x, y) {
  UI.drag = payload;
  const g = UI.dragEl;
  g.innerHTML = payload.icon || '';
  g.hidden = false;
  g.style.left = x + 'px'; g.style.top = y + 'px';
  ui_tipHide();
  // highlight targets
  for (const el of UI.root.querySelectorAll('[data-drop]')) {
    if (el.offsetParent === null) continue;
    const [k, a] = ui_spec(el, 'data-drop');
    const f = UI.dropOk[k];
    const r = f ? f(a, payload, el) : null;
    if (r === true) el.classList.add('dropok'); else if (r === false) el.classList.add('dropbad');
  }
}
function ui_dragEnd(x, y) {
  const p = UI.drag;
  UI.drag = null; UI.dragEl.hidden = true;
  for (const el of UI.root.querySelectorAll('.dropok,.dropbad')) el.classList.remove('dropok', 'dropbad');
  const hit = document.elementFromPoint(x, y);
  const tgt = hit && hit.closest && hit.closest('[data-drop]');
  if (tgt && UI.root.contains(tgt)) {
    const [k, a] = ui_spec(tgt, 'data-drop');
    if (UI.drops[k]) UI.drops[k](a, p, tgt);
  } else if (!uiHit(x, y) && UI.nowhere[p.kind]) UI.nowhere[p.kind](p);
  UI.noClick = true; setTimeout(() => { UI.noClick = false; }, 0);
}

// ---------- banners, toasts, confirm ----------
function uiMessage(text, cls) {
  const b = UI.bannerEl;
  if (!b) return;
  const [main, sub] = String(text).split('\n');
  b.innerHTML = '<div class="bn ' + (cls || '') + '">' + esc(main) + (sub ? '<span class="bs">' + esc(sub) + '</span>' : '') + '</div>';
  b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  UI.bannerT = cls === 'death' ? 5 : 3.2;
}
function ui_toast(text, cls) {
  const box = UI.toastEl;
  if (!box) return;
  for (const t of UI.toasts) if (t.el.textContent === text) { t.t = 2.6; t.el.style.opacity = 1; return; }
  const el = ui_h('div', cls || '', esc(text), box);
  UI.toasts.push({ el, t: 2.6 });
  if (UI.toasts.length > 3) { const o = UI.toasts.shift(); o.el.remove(); }
}
function ui_confirm(html, yes, yesLabel, no, noLabel) {
  const m = ui_h('div', 'modal', '<div class="pnl"><p>' + html + '</p><div class="row"><button class="btn pri">' + esc(yesLabel || 'Yes') + '</button><button class="btn">' + esc(noLabel || 'Cancel') + '</button></div></div>', UI.root);
  const [a, b] = m.querySelectorAll('button');
  const done = () => { m.remove(); UI.modal = null; };
  a.onclick = () => { done(); yes(); };
  b.onclick = () => { done(); if (no) no(); };
  m.onmousedown = (e) => { if (e.target === m) b.onclick(); };
  UI.modal = { el: m, close: () => b.onclick() };
  a.focus();
}

// ---------- input ----------
function uiIsTyping() {
  const a = document.activeElement;
  if (!a) return false;
  if (a.tagName === 'TEXTAREA' || a.isContentEditable) return true;
  return a.tagName === 'INPUT' && !/^(range|checkbox|radio|button|submit|color)$/.test(a.type);
}
function uiHit(x, y) {
  if (UI.drag || UI.moving) return true;
  const el = document.elementFromPoint(x, y);
  return !!el && el !== UI.root && UI.root.contains(el);
}
function ui_inPlay() { return UI.state === 'play' && !!PLAYER; }
function ui_onKey(ev) {
  if (UI.state !== 'play') {
    if (UI.state === 'chargen' && ev.code === 'Escape' && !uiIsTyping() && ui_has(showTitle)) showTitle();
    return;
  }
  const typing = uiIsTyping();
  // Escape outside text fields is routed by the main loop through uiEscape() (then target clear, then options).
  if (ev.code === 'Escape') { if (typing) { document.activeElement.blur(); ev.preventDefault(); } return; }
  if (typing) return;
  if (ev.code === 'Enter' || ev.code === 'NumpadEnter') { ev.preventDefault(); chat_focus(''); return; }
  if (ev.code === 'Slash') { ev.preventDefault(); chat_focus('/'); return; }
  if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
  const map = { KeyC: 'char', KeyI: 'inv', KeyN: 'nanos', KeyM: 'map', KeyT: 'team', KeyJ: 'missions', KeyO: 'options', F1: 'help', KeyB: null };
  if (ev.code in map && map[ev.code]) { ev.preventDefault(); if (!ev.repeat) uiToggle(map[ev.code]); return; }
  const m = /^Digit(\d)$/.exec(ev.code);
  if (m && !ev.repeat) {
    const d = +m[1], i = (d === 0 ? 9 : d - 1) + (ev.shiftKey ? 10 : 0);
    ev.preventDefault();
    if (ui_has(hud_useSlot)) hud_useSlot(i);
  }
}

// Esc: close a dialog or the topmost window. Returns true when it consumed the key.
function uiEscape() {
  if (UI.state !== 'play') return false;
  if (UI.modal) { UI.modal.close(); return true; }
  const w = ui_topWin();
  if (w) { uiClose(w.id); return true; }
  return false;
}

// ---------- public entry points ----------
function uiInit() {
  if (UI.root) return;
  ui_load();
  UI.root = $('#ui');
  UI.tipEl = ui_h('div', null, null, document.body); UI.tipEl.id = 'tip'; UI.tipEl.hidden = true;
  UI.dragEl = ui_h('div', 'cell', null, document.body); UI.dragEl.id = 'drag'; UI.dragEl.hidden = true;
  if (typeof hud_build === 'function') hud_build();
  if (typeof chat_build === 'function') chat_build();
  if (typeof cw_build === 'function') cw_build();
  if (typeof inv_build === 'function') inv_build();
  if (typeof nw_build === 'function') nw_build();
  if (typeof misc_build === 'function') misc_build();
  if (typeof cg_build === 'function') cg_build();
  if (typeof ti_build === 'function') ti_build();
  ui_hudVisible(false);
  const fps = $('#fps'); if (fps) fps.hidden = !UI.opts.fps;

  addEventListener('mousemove', (ev) => {
    UI.mx = ev.clientX; UI.my = ev.clientY; UI.hover = ev.target;
    if (UI.moving) { ui_moveWin(UI.moving.w, ev.clientX - UI.moving.dx, ev.clientY - UI.moving.dy); return; }
    if (UI.down && !UI.drag && Math.hypot(ev.clientX - UI.down.x, ev.clientY - UI.down.y) > 5) {
      const d = UI.down; UI.down = null;
      const f = UI.drags[d.k];
      const p = f && f(d.a, d.el);
      if (p) ui_dragBegin(p, ev.clientX, ev.clientY);
    }
    if (UI.drag) { UI.dragEl.style.left = ev.clientX + 'px'; UI.dragEl.style.top = ev.clientY + 'px'; }
    ui_tipUpdate();
  });
  UI.root.addEventListener('mousedown', (ev) => {
    UI.mdown = true;
    if (ev.button !== 0) return;
    const el = ev.target.closest('[data-drag]');
    if (el && !ev.target.closest('input,button:not([data-drag])')) {
      const [k, a] = ui_spec(el, 'data-drag');
      UI.down = { k, a, el, x: ev.clientX, y: ev.clientY };
      ev.preventDefault();
    }
  });
  addEventListener('mouseup', (ev) => {
    UI.mdown = false;
    if (UI.moving) { const w = UI.moving.w; UI.store.pos[w.id] = [w.x, w.y]; ui_save(); UI.moving = null; }
    if (UI.drag) ui_dragEnd(ev.clientX, ev.clientY);
    UI.down = null;
  });
  UI.root.addEventListener('click', (ev) => {
    if (UI.noClick) return;
    const el = ev.target.closest('[data-act]');
    if (!el || !UI.root.contains(el)) return;
    const [k, a] = ui_spec(el, 'data-act');
    if (UI.acts[k]) { UI.acts[k](a, el, ev); ui_tipUpdate(); }
  });
  UI.root.addEventListener('contextmenu', (ev) => {
    if (!ev.target.closest('input')) ev.preventDefault();
    const el = ev.target.closest('[data-ctx]');
    if (!el) return;
    const [k, a] = ui_spec(el, 'data-ctx');
    if (UI.ctxs[k]) { UI.ctxs[k](a, el, ev); ui_tipUpdate(); }
  });
  // Wheel over UI panels scrolls them, not the camera.
  UI.root.addEventListener('wheel', (ev) => ev.stopPropagation(), { passive: true });
  addEventListener('keydown', ui_onKey);
  addEventListener('resize', () => { for (const id in UI.wins) { const w = UI.wins[id]; if (w.open) ui_moveWin(w, w.x, w.y); } });
  addEventListener('blur', () => { UI.mdown = false; UI.down = null; if (UI.drag) { UI.drag = null; UI.dragEl.hidden = true; } });
  ui_events();
}
function ui_hudVisible(on) {
  if (UI.hudEl) UI.hudEl.hidden = !on;
  if (UI.chatEl) UI.chatEl.hidden = !on;
  if (!on) ui_closeAll();
}

// Per frame from the main loop.
function uiUpdate(dt) {
  if (!UI.root) return;
  dt = Math.min(dt || 0, 0.25);
  UI.t += dt;
  if (UI.bannerT > 0 && (UI.bannerT -= dt) <= 0) UI.bannerEl.classList.remove('on');
  for (let i = UI.toasts.length - 1; i >= 0; i--) {
    const t = UI.toasts[i];
    t.t -= dt;
    if (t.t < 0.4) t.el.style.opacity = Math.max(0, t.t / 0.4);
    if (t.t <= 0) { t.el.remove(); UI.toasts.splice(i, 1); }
  }
  if (!ui_inPlay()) return;
  if (typeof hud_update === 'function') hud_update(dt);
  // NPC windows close when the player walks away
  if (UI.npc && UI.npc.pos && PLAYER.pos && Math.hypot(UI.npc.pos.x - PLAYER.pos.x, UI.npc.pos.z - PLAYER.pos.z) > 9) {
    for (const id of UI_NPC_WINS) uiClose(id);
    UI.npc = null;
  }
  for (const id in UI.wins) {
    const w = UI.wins[id];
    if (!w.open) continue;
    w.refT += dt;
    if (UI.mdown || UI.drag) continue;
    if (w.dirty || (w.o.live && w.refT >= w.o.live)) ui_refreshWin(w);
  }
  if (UI.tipSrc && (UI.tipT += dt) > 0.4) { UI.tipT = 0; if (document.body.contains(UI.tipSrc)) ui_tipUpdate(); else ui_tipHide(); }
}

// ---------- events ----------
function ui_events() {
  EV.on('stats', (e) => { if (e === PLAYER) ui_dirty('char', 'nanos', 'inv', 'vendor', 'team'); if (typeof hud_dirty === 'function') hud_dirty(); });
  EV.on('inv', (e) => { if (e === PLAYER) { ui_dirty('inv', 'char', 'vendor', 'bank'); if (typeof hud_dirty === 'function') hud_dirty(); } });
  EV.on('mission', () => { ui_dirty('missions', 'map'); if (typeof hud_alert === 'function') hud_alert('missions'); });
  EV.on('levelup', (e, lvl) => {
    if (e !== PLAYER) return;
    uiMessage('Level ' + lvl + '!\nNew improvement points available', 'lvl');
    ui_dirty('char', 'nanos');
    if (typeof hud_alert === 'function') hud_alert('char');
  });
  EV.on('death', (e) => { if (e === PLAYER) uiMessage('You have died\nReturning to your clone bay', 'death'); });
  EV.on('zone', (id) => {
    for (const wid of UI_NPC_WINS) uiClose(wid);
    UI.npc = null;
    ui_dirty('map');
    if (typeof hud_zone === 'function') hud_zone(id);
  });
  EV.on('interact', (npc) => {
    if (!npc) return;
    const role = npc.role;
    if (role === 'npc' || role === 'door' || role === 'pylon') return;   // missions/world modules own those dialogs
    UI.npc = npc;
    const win = { vendor: 'vendor', terminal: 'terminal', clonebay: 'clonebay', hopper: 'hopper', shuttle: 'hopper', bank: 'bank' }[role] || 'npc';
    for (const id of UI_NPC_WINS) if (id !== win) uiClose(id);
    uiOpen(win);
    if (win === 'vendor' || win === 'bank') uiOpen('inv');
  });
  EV.on('log', (text, cls) => { if (cls === 'warn' && UI.state === 'play') ui_toast(text); });
  EV.on('target', () => { if (typeof hud_dirty === 'function') hud_dirty(); });
}
