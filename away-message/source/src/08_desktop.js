// The desktop: the app registry, desktop icons, the Start menu, quick launch, the tray and the clock.
const APPS = {
  mycomp: { title: 'My Computer', icon: 'computer', open: () => openExplorer('mycomp') },
  mydocs: { title: 'My Documents', icon: 'docs', open: () => openExplorer('docs') },
  recycle: { title: 'Recycle Bin', icon: 'recycle', open: () => openExplorer('recycle') },
  ie: { title: 'Internet Exploder', icon: 'globe', open: () => openBrowser(), prog: true },
  amerinet: { title: 'AmeriNet Online', icon: 'amerinet', open: () => openAmeriNet(), prog: true },
  mail: { title: 'AmeriNet Mail', icon: 'mail', open: () => openMail() },
  snapster: { title: 'Snapster', icon: 'snapster', open: () => openSnapster(), prog: true },
  buddy: { title: 'BuddyChat', icon: 'buddy', open: () => openBuddyChat(), prog: true },
  zapamp: { title: 'ZapAmp', icon: 'zapamp', open: () => openZapAmp(), prog: true },
  bongo: { title: 'Bongo Buddy', icon: 'bongo', open: () => { bongoSummon(); bongoMenu(); }, prog: true, when: () => S.bongo.installed },
  vblaster: { title: 'VirusBlaster 2001', icon: 'shield', open: () => openVirusBlaster(), prog: true },
  adbegone: { title: 'Ad-Be-Gone', icon: 'adbegone', open: () => openAdBeGone(), prog: true, when: () => S.adbegone },
  mines: { title: 'Mine Finder', icon: 'mines', open: () => openMines() },
  sol: { title: 'Solitaire', icon: 'cards', open: () => openSolitaire() },
  pinball: { title: '3D Pinball', icon: 'pinball', open: () => openPinball() },
  notepad: { title: 'Notepad', icon: 'notepad', open: () => openNotepad() },
  dos: { title: 'DOS Prompt', icon: 'dos', open: () => openDOS() },
  control: { title: 'Control Panel', icon: 'control', open: () => openControlPanel() },
  printers: { title: 'Printers', icon: 'printer', open: () => msgBox({ title: 'Printers', icon: 'error', text: 'PC LOAD LETTER\n\nThe printer is out of paper, out of ink, and out of patience.' }) },
  dialup: { title: 'Dial-Up Networking', icon: 'modem', open: () => openAmeriNet() },
  trophy: { title: 'My Achievements', icon: 'trophy', open: () => openAchievements() },
  help: { title: 'Help', icon: 'help', open: () => openHelp() },
};
const DESK_SC = ['mycomp', 'mydocs', 'ie', 'recycle', 'amerinet', 'snapster', 'buddy', 'zapamp', 'bongo', 'vblaster', 'trophy', 'adbegone'];
const DESK = { sel: null, els: {} };

function deskItems() {
  const out = [];
  for (const id of DESK_SC) { const a = APPS[id]; if (a.when && !a.when()) continue; out.push({ key: 'sc:' + id, label: a.title, icon: id === 'recycle' && filesIn('recycle').length ? 'recyclefull' : a.icon, open: a.open, sc: id !== 'mycomp' && id !== 'recycle' && id !== 'mydocs' }); }
  for (const ad of S.bongo.adware) { const A = ADWARE[ad]; if (A && A.desk) out.push({ key: 'ad:' + ad, label: A.desk, icon: A.icon, open: () => A.open(), sc: true, ad }); }
  for (const f of filesIn('desktop')) out.push({ key: 'f:' + f.id, label: displayName(f), icon: fileIcon(f), open: () => openFile(f), f });
  return out;
}
function renderDesktop() {
  const host = $('#icons'); host.textContent = ''; DESK.els = {};
  const items = deskItems();
  const H = deskH(), rows = Math.max(1, Math.floor((H - 6) / 72));
  const used = new Set();
  const cellOf = (x, y) => Math.round((x - 4) / 78) * 1000 + Math.round((y - 4) / 72);
  for (const it of items) if (S.desktop[it.key]) used.add(cellOf(...S.desktop[it.key]));
  let n = 0;
  for (const it of items) {
    let pos = S.desktop[it.key];
    if (!pos) { let c; do { c = Math.floor(n / rows) * 1000 + (n % rows); n++; } while (used.has(c)); used.add(c); pos = [4 + Math.floor(c / 1000) * 78, 4 + (c % 1000) * 72]; }
    const el = h('div', { class: 'dicon' + (DESK.sel === it.key ? ' sel' : ''), title: it.f ? it.f.name : it.label }, img(it.icon, 32), it.sc ? h('img', { class: 'lnk', src: SC_ARROW }) : null, h('span', { text: it.label }));
    el.style.left = pos[0] + 'px'; el.style.top = pos[1] + 'px';
    el._it = it;
    iconDrag(el, it);
    el.addEventListener('dblclick', () => { SFX.click(); it.open(); });
    ctxMenu(el, () => {
      const m = [{ label: '<b>Open</b>', act: it.open }];
      if (it.f) m.push({ sep: 1 }, { label: 'Delete', act: () => deleteFile(it.f) }, { label: 'Rename', act: () => renameFile(it.f) }, { sep: 1 }, { label: 'Properties', act: () => fileProps(it.f) });
      else if (it.key === 'sc:recycle') m.push({ label: 'Empty Recycle Bin', act: emptyRecycle });
      else if (it.key === 'sc:bongo') m.push({ label: 'Delete', act: () => msgBox({ title: 'Bongo Buddy', icon: 'bongo', text: 'Bongo can\'t be deleted from here, silly! Use Add/Remove Programs. (Bongo hopes you won\'t.)' }) });
      else if (it.ad) m.push({ label: 'Delete', act: () => { msgBox({ title: 'Delete', icon: 'error', text: 'Cannot delete ' + it.label + ': Access is denied.\n\nThe file is in use by Bongo Search Assistant.' }); } });
      else if (it.key === 'sc:mycomp') m.push({ sep: 1 }, { label: 'Properties', act: aboutWindoze });
      return m;
    });
    host.append(el); DESK.els[it.key] = el;
  }
}
const SC_ARROW = (() => { const c = document.createElement('canvas'); c.width = c.height = 11; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 11, 11); x.strokeStyle = '#000'; x.strokeRect(0.5, 0.5, 10, 10); x.beginPath(); x.moveTo(3, 8); x.lineTo(3, 5); x.quadraticCurveTo(3, 3, 6, 3); x.lineTo(6, 1.5); x.lineTo(9, 4); x.lineTo(6, 6.5); x.lineTo(6, 5); x.quadraticCurveTo(4.5, 5, 4.5, 8); x.closePath(); x.fillStyle = '#000'; x.fill(); return c.toDataURL(); })();
function iconDrag(el, it) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) { selectIcon(it.key); return; }
    e.stopPropagation(); selectIcon(it.key);
    const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop; let moved = false;
    el.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true; el.style.left = clamp(ox + dx, 0, deskW() - 70) + 'px'; el.style.top = clamp(oy + dy, 0, deskH() - 60) + 'px'; el.style.zIndex = 5;
    };
    const up = (ev) => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.style.zIndex = '';
      if (!moved) { if (ev.pointerType === 'touch') { SFX.click(); it.open(); } return; }
      // dropped on the Recycle Bin or ZapAmp?
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + 18;
      for (const k of ['sc:recycle', 'sc:zapamp']) {
        const t = DESK.els[k]; if (!t || t === el) continue;
        const q = t.getBoundingClientRect();
        if (cx > q.left && cx < q.right && cy > q.top && cy < q.bottom) {
          if (k === 'sc:recycle' && it.f) { S.desktop[it.key] = null; recycleFile(it.f); return; }
          if (k === 'sc:recycle' && it.key === 'sc:bongo') { bongoSay('Hey! I am NOT trash!', { emote: 'sad' }); unlock('trashbongo'); break; }
          if (k === 'sc:zapamp' && it.f && extOf(it.f.name) === 'mp3') { zapPlayFile(it.f); break; }
        }
      }
      S.desktop[it.key] = [el.offsetLeft, el.offsetTop]; save();
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });
}
function selectIcon(key) { DESK.sel = key; for (const k in DESK.els) DESK.els[k].classList.toggle('sel', k === key); }
function arrangeIcons() { S.desktop = {}; save(); renderDesktop(); }

// ---- Start menu ----
function startItems() {
  const progs = () => {
    const list = [
      { label: 'Accessories', icon: 'programs', items: [
        { label: 'Games', icon: 'programs', items: [{ label: 'Mine Finder', icon: 'mines', act: APPS.mines.open }, { label: 'Solitaire', icon: 'cards', act: APPS.sol.open }, { label: '3D Pinball', icon: 'pinball', act: APPS.pinball.open }] },
        { label: 'System Tools', icon: 'programs', items: [{ label: 'ScanDisk', icon: 'hdd', act: () => runScandisk(true) }, { label: 'Registry Editor', icon: 'key', act: openRegedit }] },
        { label: 'Notepad', icon: 'notepad', act: APPS.notepad.open },
        { label: 'DOS Prompt', icon: 'dos', act: APPS.dos.open },
        { label: 'My Achievements', icon: 'trophy', act: APPS.trophy.open },
      ] },
      { label: 'Online Services', icon: 'programs', items: [{ label: 'AmeriNet Online', icon: 'amerinet', act: APPS.amerinet.open }, { label: 'AmeriNet Mail', icon: 'mail', act: APPS.mail.open }] },
      { label: 'StartUp', icon: 'programs', items: S.bongo.updater ? [{ label: 'Bongo Search Assistant', icon: 'bongo', act: () => bongoSay('That\'s my helper! It keeps me safe. From you. Hee hee!', { emote: 'wave' }) }] : [{ label: '(Empty)', dis: 1 }] },
    ];
    for (const id of ['ie', 'snapster', 'buddy', 'zapamp', 'bongo', 'vblaster', 'adbegone']) { const a = APPS[id]; if (!a.when || a.when()) list.push({ label: a.title, icon: a.icon, act: a.open }); }
    return list;
  };
  const docs = () => {
    const r = (S.recent || []).map((id) => S.files.find((f) => f.id === id)).filter((f) => f && f.dir !== 'recycle');
    return [{ label: 'My Documents', icon: 'docs', act: APPS.mydocs.open }, { sep: 1 }].concat(r.length ? r.map((f) => ({ label: esc(displayName(f)), icon: fileIcon(f), act: () => openFile(f) })) : [{ label: '(Empty)', dis: 1 }]);
  };
  return [
    { label: 'Windoze Update', icon: 'globe', act: () => openBrowser('www.windozeupdate.com/') },
    { sep: 1 },
    { label: '<u>P</u>rograms', icon: 'programs', items: progs() },
    { label: '<u>D</u>ocuments', icon: 'docsmenu', items: docs() },
    { label: '<u>S</u>ettings', icon: 'settings', items: [{ label: 'Control Panel', icon: 'control', act: openControlPanel }, { label: 'Printers', icon: 'printer', act: APPS.printers.open }, { label: 'Folder Options...', icon: 'folderopt', act: openFolderOptions }, { label: 'Display', icon: 'display', act: openDisplay }] },
    { label: 'S<u>e</u>arch', icon: 'find', items: [{ label: 'For Files or Folders...', icon: 'find', act: openFind }, { label: 'On the Internet...', icon: 'globe', act: () => openBrowser('www.askgeeves.com/') }] },
    { label: '<u>H</u>elp', icon: 'help', act: openHelp },
    { label: '<u>R</u>un...', icon: 'run', act: openRun },
    { sep: 1 },
    { label: '<u>L</u>og Off ' + esc(S.sn || 'Family') + '...', icon: 'key', act: () => msgBox({ title: 'Log Off Windoze', icon: 'question', text: 'Are you sure you want to log off?', buttons: ['Yes', 'No'] }).then((b) => b === 'Yes' && restartPC()) },
    { label: 'Sh<u>u</u>t Down...', icon: 'shutdown', act: openShutdown },
  ];
}
function toggleStart() {
  const sb = $('#start');
  if ($('#startmenu')) { closeMenus(); return; }
  const banner = h('div', { class: 'banner' }, h('b', { html: 'Windoze<i> Me</i>' }));
  const a = APP().getBoundingClientRect();
  sb.classList.add('down');
  const m = popMenu(startItems(), 2, 0, { big: true, id: 'startmenu', banner, onClose: () => sb.classList.remove('down') });
  m.style.top = (a.height - 28 - m.offsetHeight + 1) + 'px';
  SFX.menu();
}

// ---- tray ----
const TRAY = { items: {} };
function traySet(id, o) {
  let it = TRAY.items[id];
  if (!it) {
    it = TRAY.items[id] = { el: h('span', { class: 'ti' }, h('img')) };
    it.el.addEventListener('click', (e) => { const f = it.o.click; if (f) f(e); });
    it.el.addEventListener('dblclick', (e) => { const f = it.o.dbl; if (f) f(e); });
    it.el.addEventListener('contextmenu', (e) => { e.preventDefault(); if (it.o.ctx) { const r = it.el.getBoundingClientRect(), A = APP().getBoundingClientRect(); popMenu(it.o.ctx(), r.left - A.left - 120, r.top - A.top - 10); } });
    const order = ['smiley', 'casino', 'bongobar', 'vb', 'buddy', 'modem', 'zap', 'vol'];
    const host = $('#trayicons'); host.append(it.el);
    [...host.children].sort((a, b) => order.indexOf(a._id) - order.indexOf(b._id)).forEach((c) => host.append(c));
    it.el._id = id;
  }
  it.o = o; it.el.firstChild.src = icon(o.icon, 16); it.el.title = o.title || '';
}
function trayRemove(id) { const it = TRAY.items[id]; if (it) { it.el.remove(); delete TRAY.items[id]; } }
function trayRect(id) { const it = TRAY.items[id]; return it ? it.el.getBoundingClientRect() : $('#tray').getBoundingClientRect(); }
function volumePopup() {
  if ($('#volpop')) { $('#volpop').remove(); return; }
  const r = h('input', { type: 'range', min: 0, max: 100, value: Math.round(S.vol * 100), style: 'writing-mode: vertical-lr; direction: rtl; height: 90px; width: 22px' });
  r.addEventListener('input', () => { setVolume(r.value / 100); });
  r.addEventListener('change', () => SFX.ding());
  const mute = h('input', { type: 'checkbox', checked: AU.muted, onchange: (e) => { setMuted(e.target.checked); updateVolIcon(); } });
  const p = h('div', { id: 'volpop', class: 'menu', style: 'padding:8px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px' }, h('div', { text: 'Volume' }), r, h('label', { class: 'row', style: 'gap:3px' }, mute, 'Mute'));
  APP().append(p);
  const A = APP().getBoundingClientRect(), t = trayRect('vol');
  p.style.left = Math.min(A.width - p.offsetWidth - 2, t.left - A.left - 20) + 'px'; p.style.top = (t.top - A.top - p.offsetHeight - 4) + 'px';
  const off = (e) => { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('pointerdown', off, true); } };
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
}
function updateVolIcon() { traySet('vol', { icon: AU.muted ? 'soundoff' : 'sound', title: 'Volume', click: volumePopup, dbl: openSounds }); }

function buildTaskbar() {
  const sb = $('#start'); sb.textContent = ''; sb.append(img('logo', 16), h('span', { text: 'Start' }));
  sb.addEventListener('pointerdown', (e) => { e.stopPropagation(); unlockAudio(); toggleStart(); });
  const ql = $('#ql');
  const q = (ic, title, fn) => h('button', { title, onclick: fn }, img(ic, 16));
  ql.append(q('display', 'Show Desktop', () => { const all = WM.wins.filter((w) => !w.min && !w.o.bare); if (all.length) all.forEach((w) => w.minimize()); else WM.wins.forEach((w) => { if (w.min) w.restore(); }); }),
    q('globe', 'Launch Internet Exploder', () => openBrowser()), q('amerinet', 'AmeriNet Online', () => openAmeriNet()), q('zapamp', 'ZapAmp', () => openZapAmp()));
  updateVolIcon();
  const clk = $('#clock');
  const upd = () => { clk.textContent = clockStr(); clk.title = dateStr(); };
  upd(); every(1, upd);
  clk.addEventListener('dblclick', openDateTime);
  // desktop interactions
  const desk = $('#desk');
  desk.addEventListener('pointerdown', (e) => { if (e.target === desk || e.target.id === 'icons' || e.target.id === 'wins') selectIcon(null); });
  ctxMenu(desk, (e) => (e.target.closest('.win') ? null : [
    { label: 'Arrange Icons', act: arrangeIcons }, { label: 'Line up Icons', act: arrangeIcons }, { sep: 1 },
    { label: 'Refresh', act: () => { clearTrails(); renderDesktop(); } }, { sep: 1 },
    { label: 'New', items: [{ label: 'Folder', icon: 'folder', act: () => msgBox({ title: 'New Folder', icon: 'info', text: 'Folders are for organized people. You have a desktop.' }) }, { label: 'Text Document', icon: 'txt', act: () => addFile({ name: 'New Text Document.txt', dir: 'desktop', text: '', size: 0 }) }] },
    { sep: 1 }, { label: 'Properties', act: openDisplay },
  ]));
  on('fs', () => renderDesktop());
  on('desk', () => renderDesktop());
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderDesktop, 150); });
}
