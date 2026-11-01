// Window manager: windows, the taskbar buttons, drop-down/context menus, message and input boxes.
const WM = { wins: [], z: 100, active: null, trails: false, nTrail: 0, menu: null, cascade: 0 };
const deskEl = () => $('#desk');
const winLayer = () => $('#wins');
const deskW = () => deskEl().clientWidth, deskH = () => deskEl().clientHeight;
const isNarrow = () => innerWidth < 700;

// openWin(o) → w. o: { key, title, icon, w, h, x, y, body, menu, status, resizable, max, min, bare, cls, onClose,
// onResize, center, noTask, help, minW, minH, maximized, parent }
function openWin(o) {
  if (o.key) { const ex = WM.wins.find((w) => w.key === o.key); if (ex) { ex.restore(); ex.focus(); return ex; } }
  const w = { id: uid('w'), key: o.key, title: o.title || '', iconName: o.icon || 'app', o, min: false, maxed: false, closed: false };
  const el = w.el = h('div', { class: 'win' + (o.bare ? ' bare' : '') + (o.cls ? ' ' + o.cls : '') });
  el._w = w;
  if (!o.bare) {
    const tb = w.tb = h('div', { class: 'tb' });
    w.tIcon = img(w.iconName, 16); w.tTitle = h('div', { class: 'ttl', text: w.title });
    tb.append(w.tIcon, w.tTitle);
    if (o.help) tb.append(h('button', { class: 'tbtn hp', title: 'Help', onclick: (e) => { e.stopPropagation(); o.help(); } }));
    if (o.min !== false) tb.append(h('button', { class: 'tbtn mn', title: 'Minimize', onclick: (e) => { e.stopPropagation(); w.minimize(); } }));
    if (o.max !== false && o.resizable !== false) tb.append(h('button', { class: 'tbtn mx', title: 'Maximize', onclick: (e) => { e.stopPropagation(); w.toggleMax(); } }));
    tb.append(h('button', { class: 'tbtn x', title: 'Close', onclick: (e) => { e.stopPropagation(); w.close(); } }));
    tb.addEventListener('dblclick', () => { if (o.max !== false && o.resizable !== false) w.toggleMax(); });
    w.tIcon.addEventListener('dblclick', (e) => { e.stopPropagation(); w.close(); });
    makeDraggable(w, tb);
    el.append(tb);
    if (o.menu) { w.menubar = buildMenubar(w, typeof o.menu === 'function' ? o.menu(w) : o.menu); el.append(w.menubar); }
  }
  w.body = h('div', { class: 'wbody' });
  el.append(w.body);
  if (o.status) { w.statusEl = h('div', { class: 'status' }); o.status.forEach((s) => w.statusEl.append(h('div', { style: typeof s === 'object' ? s.style : 'flex:1' }, typeof s === 'object' ? s.text : s))); el.append(w.statusEl); }
  if (o.resizable !== false && !o.bare) { const g = h('div', { class: 'grip' }); makeResizable(w, g); el.append(g); }
  w.setStatus = (i, t) => { if (w.statusEl && w.statusEl.children[i]) { const c = w.statusEl.children[i]; if (typeof t === 'string') c.textContent = t; else { c.textContent = ''; c.append(t); } } };
  w.setTitle = (t) => { w.title = t; if (w.tTitle) w.tTitle.textContent = t; if (w.taskEl) { w.taskEl.lastChild.textContent = t; w.taskEl.title = t; } };
  w.setIcon = (n) => { w.iconName = n; if (w.tIcon) w.tIcon.src = icon(n, 16); if (w.taskEl) w.taskEl.firstChild.src = icon(n, 16); };
  w.focus = () => focusWin(w);
  w.close = (force) => closeWin(w, force);
  w.minimize = () => minimizeWin(w);
  w.restore = () => { if (w.min) { w.min = false; w.el.style.display = ''; zoomAnim(w, false); } updateTasks(); };
  w.toggleMax = () => toggleMax(w);
  w.move = (x, y) => { w.el.style.left = Math.round(x) + 'px'; w.el.style.top = Math.round(y) + 'px'; };
  w.size = (ww, hh) => { w.el.style.width = Math.round(ww) + 'px'; w.el.style.height = Math.round(hh) + 'px'; if (o.onResize) o.onResize(w); };
  w.flash = () => { if (w.taskEl && WM.active !== w) w.taskEl.classList.add('flash'); };
  w.rect = () => ({ x: w.el.offsetLeft, y: w.el.offsetTop, w: w.el.offsetWidth, h: w.el.offsetHeight });
  el.addEventListener('pointerdown', () => focusWin(w), true);
  const body = typeof o.body === 'function' ? o.body(w) : o.body;
  if (body) w.body.append(body);
  winLayer().append(el);
  // size and place
  const W = deskW(), H = deskH();
  const ww = Math.min(o.w || 400, W - 4), hh = o.h ? Math.min(o.h, H - 4) : null;
  el.style.width = ww + 'px'; if (hh) el.style.height = hh + 'px';
  let x = o.x, y = o.y;
  if (x == null || y == null) {
    if (o.center || o.parent) { x = (W - ww) / 2; y = (H - (hh || el.offsetHeight)) / 2.4; }
    else { WM.cascade = (WM.cascade + 1) % 8; x = 30 + WM.cascade * 26 + (W > 900 ? 70 : 0); y = 16 + WM.cascade * 22; }
  }
  x = clamp(x, 0, Math.max(0, W - ww)); y = clamp(y, 0, Math.max(0, H - (hh || el.offsetHeight)));
  w.move(x, y);
  WM.wins.push(w);
  if (!o.noTask) addTask(w);
  focusWin(w);
  if ((o.maximized || (isNarrow() && o.resizable !== false && !o.bare && !o.parent && !o.small))) toggleMax(w);
  emit('win-open', w);
  return w;
}
function focusWin(w) {
  if (w.closed) return;
  if (WM.active === w && w.el.style.zIndex == WM.z) return;
  WM.active = w;
  w.el.style.zIndex = ++WM.z;
  for (const o of WM.wins) o.el.classList.toggle('active', o === w);
  if (w.taskEl) w.taskEl.classList.remove('flash');
  updateTasks();
  if (w.o.onFocus) w.o.onFocus(w);
}
function closeWin(w, force) {
  if (w.closed) return;
  if (!force && w.o.onClose && w.o.onClose(w) === false) return;
  w.closed = true;
  w.el.remove();
  if (w.taskEl) w.taskEl.remove();
  WM.wins = WM.wins.filter((o) => o !== w);
  if (WM.active === w) { WM.active = null; const top = WM.wins.filter((o) => !o.min).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0]; if (top) focusWin(top); }
  updateTasks();
  emit('win-close', w);
}
function minimizeWin(w) {
  if (w.min) return;
  zoomAnim(w, true);
  w.min = true; w.el.style.display = 'none';
  if (WM.active === w) { WM.active = null; w.el.classList.remove('active'); const top = WM.wins.filter((o) => !o.min).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0]; if (top) focusWin(top); }
  updateTasks();
}
function toggleMax(w) {
  const el = w.el;
  if (!w.maxed) { w.prev = [el.style.left, el.style.top, el.style.width, el.style.height]; el.style.left = '0px'; el.style.top = '0px'; el.style.width = '100%'; el.style.height = '100%'; w.maxed = true; el.classList.add('maxed'); }
  else { [el.style.left, el.style.top, el.style.width, el.style.height] = w.prev; w.maxed = false; el.classList.remove('maxed'); }
  if (w.o.onResize) w.o.onResize(w);
}
function zoomAnim(w, toTask) {
  if (!w.taskEl || w.o.bare) return;
  const d = deskEl().getBoundingClientRect(), a = w.el.getBoundingClientRect(), b = w.taskEl.getBoundingClientRect();
  const z = h('div', { class: 'zoomrect' });
  const set = (r) => { z.style.left = (r.left - d.left) + 'px'; z.style.top = (r.top - d.top) + 'px'; z.style.width = r.width + 'px'; z.style.height = '18px'; };
  set(toTask ? a : b); APP().append(z); z.getBoundingClientRect(); set(toTask ? b : a);
  setTimeout(() => z.remove(), 240);
}
function makeDraggable(w, handle) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button,input,select,textarea') || w.maxed) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = w.el.offsetLeft, oy = w.el.offsetTop;
    handle.setPointerCapture(e.pointerId);
    const move = (ev) => {
      if (WM.trails && WM.nTrail < 260) { const c = w.el.cloneNode(true); c.classList.add('trail'); c.style.zIndex = w.el.style.zIndex - 1; winLayer().append(c); WM.nTrail++; emit('trail'); }
      const W = deskW(), H = deskH();
      w.move(clamp(ox + ev.clientX - sx, -w.el.offsetWidth + 40, W - 40), clamp(oy + ev.clientY - sy, 0, H - 20));
      emit('win-move', w);
    };
    const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
  });
}
function clearTrails() { $$('.win.trail').forEach((e) => e.remove()); WM.nTrail = 0; }
function makeResizable(w, grip) {
  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, ow = w.el.offsetWidth, oh = w.el.offsetHeight;
    grip.setPointerCapture(e.pointerId);
    const move = (ev) => w.size(Math.max(w.o.minW || 200, ow + ev.clientX - sx), Math.max(w.o.minH || 120, oh + ev.clientY - sy));
    const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
  });
}

// ---- taskbar buttons ----
function addTask(w) {
  const b = w.taskEl = h('button', { class: 'btn task', title: w.title }, img(w.iconName, 16), h('span', { text: w.title }));
  b.addEventListener('click', () => {
    if (w.min) { w.restore(); w.focus(); }
    else if (WM.active === w) w.minimize();
    else w.focus();
  });
  b.addEventListener('contextmenu', (e) => { e.preventDefault(); popMenu([{ label: 'Restore', act: () => { w.restore(); w.focus(); }, dis: !w.min }, { label: 'Minimize', act: () => w.minimize(), dis: w.min }, { sep: 1 }, { label: '<b>Close</b>', act: () => w.close() }], e.clientX, e.clientY - 70); });
  $('#tasks').append(b);
}
function updateTasks() { for (const w of WM.wins) if (w.taskEl) w.taskEl.classList.toggle('on', WM.active === w && !w.min); }

// ---- menus ----
// item: { label, icon, act, items, dis, check, sep, key }
function popMenu(items, x, y, o = {}) {
  if (!o.sub) closeMenus();
  const m = h('div', { class: 'menu' + (o.big ? ' big' : '') + (o.cls ? ' ' + o.cls : ''), id: o.id || null });
  if (o.banner) m.append(o.banner);
  let openSub = null, subTimer = 0;
  const list = typeof items === 'function' ? items() : items;
  for (const it of list) {
    if (!it) continue;
    if (it.sep) { m.append(h('hr')); continue; }
    const ic = h('span', { class: 'ic' });
    if (it.icon) ic.append(img(it.icon, o.big ? 24 : 16)); else if (it.check) ic.append(h('span', { class: 'ck', text: '✓' })); else if (it.radio) ic.append(h('span', { class: 'ck', text: '•' }));
    const row = h('div', { class: 'mi' + (it.dis ? ' dis' : '') }, ic, h('span', { html: it.label }), it.key ? h('span', { class: 'key', text: it.key }) : null, it.items ? h('i', { class: 'ar' }) : null);
    const showSub = () => {
      if (openSub && openSub._for === row) return;
      if (openSub) { openSub.remove(); openSub = null; }
      if (!it.items || it.dis) return;
      const r = row.getBoundingClientRect(), a = APP().getBoundingClientRect();
      openSub = popMenu(it.items, r.right - a.left - 3, r.top - a.top - 3, { sub: true, big: false });
      openSub._for = row; m._sub = openSub;
    };
    row.addEventListener('pointerenter', () => {
      $$('.mi.hot', m).forEach((e) => e.classList.remove('hot')); row.classList.add('hot');
      clearTimeout(subTimer); subTimer = setTimeout(showSub, it.items ? 120 : 250);
      if (!it.items && openSub) subTimer = setTimeout(() => { if (openSub) { openSub.remove(); openSub = null; } }, 250);
    });
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      if (it.dis) return;
      if (it.items) { clearTimeout(subTimer); showSub(); return; }
      closeMenus(); SFX.menu();
      if (it.act) setTimeout(() => it.act(), 0);
    });
    m.append(row);
  }
  APP().append(m);
  const A = APP().getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  if (x + mw > A.width) x = o.sub ? Math.max(0, x - mw - (o.parentW || 150) + 6) : A.width - mw - 2;
  if (y + mh > A.height - (o.sub ? 0 : 0)) y = Math.max(0, A.height - mh - 2);
  m.style.left = Math.max(0, x) + 'px'; m.style.top = Math.max(0, y) + 'px';
  if (!o.sub) WM.menu = { el: m, onClose: o.onClose };
  m.addEventListener('pointerdown', (e) => e.stopPropagation());
  return m;
}
function closeMenus() {
  if (WM.menu) { const cb = WM.menu.onClose; WM.menu = null; if (cb) cb(); }
  $$('#app > .menu').forEach((e) => e.remove());
  $$('.menubar > div.open').forEach((e) => e.classList.remove('open'));
}
function buildMenubar(w, menus) {
  const bar = h('div', { class: 'menubar' });
  const open = (d, mi) => {
    closeMenus();
    const r = d.getBoundingClientRect(), a = APP().getBoundingClientRect();
    d.classList.add('open');
    popMenu(typeof mi.items === 'function' ? mi.items() : mi.items, r.left - a.left, r.bottom - a.top, { onClose: () => d.classList.remove('open') });
    d.classList.add('open'); bar._open = true;
  };
  for (const mi of menus) {
    const d = h('div', { html: mi.label });
    d.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (d.classList.contains('open')) { closeMenus(); return; } open(d, mi); });
    d.addEventListener('pointerenter', () => { if (WM.menu && $('.menubar > div.open', bar) && !d.classList.contains('open')) open(d, mi); });
    bar.append(d);
  }
  return bar;
}
function ctxMenu(el, items) { el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); const a = APP().getBoundingClientRect(); const it = typeof items === 'function' ? items(e) : items; if (it) popMenu(it, e.clientX - a.left, e.clientY - a.top); }); }

// ---- dialogs ----
function msgBox(o) {
  if (typeof o === 'string') o = { text: o };
  return new Promise((res) => {
    const btns = o.buttons || ['OK'];
    const ic = o.icon || 'info';
    let w;
    const done = (b) => { if (w && !w.closed) { w.o.onClose = null; w.close(true); } res(b); };
    const body = h('div', null,
      h('div', { class: 'mbox' }, ic === 'none' ? null : img(o.img || ic, 32), h('div', { class: 't', [o.html ? 'html' : 'text']: o.html || o.text })),
      o.extra || null,
      h('div', { class: 'mbtns' }, btns.map((b, i) => h('button', { class: 'btn' + (i === (o.def || 0) ? ' def' : ''), onclick: () => done(b) }, b))));
    w = openWin({ title: o.title || 'Windoze', icon: o.winIcon || (ic === 'none' ? 'app' : ic), w: o.w || 360, body, resizable: false, min: false, center: true, noTask: !o.task, small: true, cls: 'dialog', x: o.x, y: o.y, onClose: () => { res(btns.includes('Cancel') ? 'Cancel' : btns[btns.length - 1]); } });
    w.el.style.width = 'auto'; w.el.style.minWidth = Math.min(o.w || 260, deskW() - 10) + 'px'; w.el.style.maxWidth = Math.min(520, deskW() - 4) + 'px';
    const W = deskW(), H = deskH();
    if (o.x == null) w.move((W - w.el.offsetWidth) / 2 + (o.jitter ? rnd(-o.jitter, o.jitter) : 0), (H - w.el.offsetHeight) / 2.3 + (o.jitter ? rnd(-o.jitter * 0.6, o.jitter * 0.6) : 0));
    const db = $$('.mbtns .btn', w.el)[o.def || 0]; if (db) db.focus();
    if (!o.silent) ({ error: SFX.error, warn: SFX.exclaim, question: SFX.question, info: SFX.ding }[ic] || (() => {}))();
    w.done = done;
  });
}
function inputBox(o) {
  return new Promise((res) => {
    let w;
    const inp = h('input', { type: o.password ? 'password' : 'text', value: o.value || '', style: 'width:100%', maxlength: o.max || 200 });
    const done = (v) => { if (w && !w.closed) { w.o.onClose = null; w.close(true); } res(v); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(inp.value); if (e.key === 'Escape') done(null); });
    const body = h('div', { class: 'pad col' }, h('div', { class: 'row', style: 'align-items:flex-start;gap:12px' }, o.icon ? img(o.icon, 32) : null, h('div', { class: 'grow', html: o.text || '' })), inp, o.extra || null,
      h('div', { class: 'btns' }, h('button', { class: 'btn def', onclick: () => done(inp.value) }, o.ok || 'OK'), h('button', { class: 'btn', onclick: () => done(null) }, 'Cancel')));
    w = openWin({ title: o.title || 'Windoze', icon: o.icon || 'app', w: o.w || 340, body, resizable: false, min: false, center: true, noTask: true, small: true, onClose: () => res(null) });
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  });
}
// a sunken list view: cols = [{ label, w }], rows = [[cells...]], with selection
function listView(cols, o = {}) {
  const tbody = h('tbody');
  const lv = h('div', { class: 'lv' }, h('table', null, h('colgroup', null, cols.map((c) => h('col', { style: c.w ? 'width:' + c.w + 'px' : '' }))), h('thead', null, h('tr', null, cols.map((c) => h('th', { text: c.label })))), tbody));
  lv.sel = -1; lv.rows = [];
  lv.set = (rows) => {
    lv.rows = rows; tbody.textContent = '';
    rows.forEach((r, i) => {
      const tr = h('tr', { class: i === lv.sel ? 'sel' : '' }, r.cells.map((c) => h('td', { title: typeof c === 'string' ? c : '' }, c)));
      tr.addEventListener('pointerdown', () => { lv.select(i); });
      tr.addEventListener('dblclick', () => { if (o.onOpen) o.onOpen(r, i); });
      tr.addEventListener('click', (e) => { if (e.pointerType === 'touch' && o.tapOpen && o.onOpen) o.onOpen(r, i); });
      if (o.ctx) ctxMenu(tr, () => { lv.select(i); return o.ctx(r, i); });
      tbody.append(tr);
    });
    if (lv.sel >= rows.length) lv.sel = -1;
  };
  lv.select = (i) => { lv.sel = i; $$('tr', tbody).forEach((tr, j) => tr.classList.toggle('sel', j === i)); if (o.onSelect) o.onSelect(lv.rows[i], i); };
  lv.selected = () => lv.rows[lv.sel];
  return lv;
}
function tabs(names, onPick, start = 0) {
  const bar = h('div', { class: 'tabs' });
  const els = names.map((n, i) => h('div', { class: 'tab', text: n, onpointerdown: () => sel(i) }));
  bar.append(...els);
  const sel = (i) => { els.forEach((e, j) => e.classList.toggle('on', i === j)); bar.cur = i; onPick(i); };
  bar.sel = sel; setTimeout(() => sel(start), 0);
  return bar;
}
