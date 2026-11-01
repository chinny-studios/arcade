// Files: a tiny virtual file system in S.files, the Explorer window, Notepad, the DOS prompt, Run and Find.
// file: { id, name, dir: 'desktop'|'docs'|'music'|'recycle', size, track?, payload?, app?, text?, date, from? }
const DIRS = {
  mycomp: { name: 'My Computer', icon: 'computer' },
  a: { name: '3\u00BD Floppy (A:)', icon: 'floppy', path: 'A:\\' },
  c: { name: '(C:)', icon: 'hdd', path: 'C:\\' },
  d: { name: 'CD-ROM (D:)', icon: 'cdrom', path: 'D:\\' },
  docs: { name: 'My Documents', icon: 'docs', path: 'C:\\My Documents' },
  music: { name: 'My Music', icon: 'music', path: 'C:\\My Documents\\My Music' },
  progfiles: { name: 'Program Files', icon: 'folder', path: 'C:\\Program Files' },
  windoze: { name: 'WINDOZE', icon: 'folder', path: 'C:\\WINDOZE' },
  desktop: { name: 'Desktop', icon: 'folder', path: 'C:\\WINDOZE\\Desktop' },
  recycle: { name: 'Recycle Bin', icon: 'recycle', path: 'C:\\RECYCLED' },
};
const SYSFILES = ['COMMAND.COM', 'WIN.COM', 'KRNL386.EXE', 'USER.EXE', 'GDI.EXE', 'SYSTEM.INI', 'WIN.INI', 'REGEDIT.EXE', 'EXPLORER.EXE', 'CLOUDS.BMP', 'SETUP.BMP', 'TADA.WAV', 'CHORD.WAV', 'HIMEM.SYS', 'IO.SYS', 'MSDOS.SYS'];
const KNOWN_EXT = ['mp3', 'txt', 'exe', 'vbs', 'zip', 'bat', 'jpg', 'doc', 'scr', 'com', 'wav', 'bmp', 'ini', 'sys', 'pif'];
const extOf = (n) => { const m = /\.([a-z0-9]+)$/i.exec(n); return m ? m[1].toLowerCase() : ''; };
function displayName(f) { const n = typeof f === 'string' ? f : f.name; return S.hideExt && KNOWN_EXT.includes(extOf(n)) ? n.replace(/\.[a-z0-9]+$/i, '') : n; }
function fileIcon(f) {
  if (f.icon) return f.icon;
  const e = extOf(f.name);
  return { mp3: 'mp3', txt: 'txt', ini: 'txt', vbs: 'vbs', zip: 'zip', bat: 'bat', com: 'bat', doc: 'txt', jpg: 'display', bmp: 'display', wav: 'sound', scr: 'pipes', sys: 'gear' }[e] || (f.app ? (APPS[f.app] && APPS[f.app].icon) || 'exe' : 'exe');
}
function filesIn(dir) { return S.files.filter((f) => f.dir === dir); }
function addFile(f) {
  f = Object.assign({ id: uid('f'), date: shortDate(), size: 1024 }, f);
  // unique name in its folder
  let n = f.name, i = 2;
  while (S.files.some((g) => g.dir === f.dir && g.name.toLowerCase() === n.toLowerCase())) n = f.name.replace(/(\.[^.]+)?$/, (m) => ' (' + i++ + ')' + (m || ''));
  f.name = n;
  S.files.push(f); save(); emit('fs', f);
  return f;
}
function removeFile(f) { S.files = S.files.filter((g) => g !== f && g.id !== f.id); save(); emit('fs', f); }
function recycleFile(f) {
  if (f.dir === 'recycle') { removeFile(f); return; }
  f.from = f.dir; f.dir = 'recycle'; save(); SFX.recycle(); emit('fs', f); stat('recycled');
}
async function deleteFile(f, ask = true) {
  if (ask) {
    const b = await msgBox({ title: 'Confirm File Delete', icon: 'question', text: f.dir === 'recycle' ? `Are you sure you want to delete '${displayName(f)}'?` : `Are you sure you want to send '${displayName(f)}' to the Recycle Bin?`, buttons: ['Yes', 'No'] });
    if (b !== 'Yes') return false;
  }
  recycleFile(f); return true;
}
function restoreFile(f) { f.dir = f.from || 'desktop'; save(); emit('fs', f); }
function emptyRecycle() { const n = filesIn('recycle').length; S.files = S.files.filter((f) => f.dir !== 'recycle'); save(); if (n) SFX.recycle(); emit('fs'); if (n) unlock('emptybin'); }

// open any file by type
function openFile(f) {
  const e = extOf(f.name);
  if (f.dir === 'recycle') { msgBox({ title: 'Recycle Bin', icon: 'info', text: 'Restore this item before you open it.' }); return; }
  recentAdd(f);
  if (e === 'mp3') { if (f.payload && !f.track) return runFile(f); zapPlayFile(f); return; }
  if (e === 'txt' || e === 'ini' || e === 'doc') { openNotepad(f); return; }
  if (e === 'jpg' || e === 'bmp') { msgBox({ title: displayName(f), icon: 'info', text: 'Imaging for Windoze can\'t open this picture. It might be damaged.' }); return; }
  if (e === 'wav') { SFX.tada(); return; }
  runFile(f);
}
function runFile(f) {
  stat('ran');
  if (f.payload) { infect(f.payload, f); return; }
  if (f.app && APPS[f.app]) { if (f.installer) installApp(f.app, f); else APPS[f.app].open(); return; }
  if (extOf(f.name) === 'zip') { msgBox({ title: 'WinZipper', icon: 'zip', text: 'This archive is empty. (It was probably a fake.)' }); return; }
  msgBox({ title: displayName(f), icon: 'error', text: `${f.name}\n\nThis program has performed an illegal operation and will be shut down.\n\nIf the problem persists, contact the program vendor.` , buttons: ['Close'] });
}
function recentAdd(f) { S.recent = (S.recent || []).filter((id) => id !== f.id); S.recent.unshift(f.id); S.recent.length = Math.min(S.recent.length, 8); save(); }

// ---- Explorer ----
function dirItems(dir) {
  const fld = (id) => ({ kind: 'dir', id, name: DIRS[id].name, icon: id === 'recycle' && filesIn('recycle').length ? 'recyclefull' : DIRS[id].icon });
  const app = (id) => ({ kind: 'app', id, name: APPS[id].title, icon: APPS[id].icon });
  if (dir === 'mycomp') return [fld('a'), fld('c'), fld('d'), { kind: 'app', id: 'control', name: 'Control Panel', icon: 'control' }, { kind: 'app', id: 'printers', name: 'Printers', icon: 'printer' }, { kind: 'app', id: 'dialup', name: 'Dial-Up Networking', icon: 'modem' }];
  if (dir === 'c') return [fld('docs'), fld('progfiles'), fld('windoze'), { kind: 'sys', name: 'AUTOEXEC.BAT', icon: 'bat' }, { kind: 'sys', name: 'CONFIG.SYS', icon: 'gear' }];
  if (dir === 'docs') return [fld('music')].concat(filesIn('docs').map((f) => ({ kind: 'file', f })));
  if (dir === 'progfiles') return Object.keys(APPS).filter((k) => APPS[k].prog && (!APPS[k].when || APPS[k].when())).map(app);
  if (dir === 'windoze') return [fld('desktop')].concat(SYSFILES.filter((n) => !(S.deletedSys || []).includes(n)).map((n) => ({ kind: 'sys', name: n, icon: fileIcon({ name: n }) })));
  return filesIn(dir).map((f) => ({ kind: 'file', f }));
}
function openExplorer(dir = 'mycomp') {
  if (dir === 'a') { msgBox({ title: 'A:\\', icon: 'error', text: 'A:\\ is not accessible.\n\nThe device is not ready.', buttons: ['Retry', 'Cancel'] }); return; }
  if (dir === 'd') { msgBox({ title: 'D:\\', icon: 'error', text: 'Please insert a disc into drive D:.', buttons: ['OK'] }); return; }
  let cur = dir, sel = null, w;
  const path = h('div', { class: 'field' });
  const view = h('div', { class: 'icons' });
  const up = h('button', { class: 'btn sm', text: 'Up', onclick: () => { const p = { c: 'mycomp', docs: 'c', music: 'docs', progfiles: 'c', windoze: 'c', desktop: 'windoze', recycle: 'mycomp' }[cur]; if (p) go(p); } });
  const emptyBtn = h('button', { class: 'btn sm', text: 'Empty Recycle Bin', onclick: () => emptyRecycle() });
  const go = (d) => { cur = d; sel = null; render(); };
  const openItem = (it) => {
    if (it.kind === 'dir') { if (it.id === 'a' || it.id === 'd') openExplorer(it.id); else go(it.id); }
    else if (it.kind === 'app') APPS[it.id].open();
    else if (it.kind === 'file') openFile(it.f);
    else if (it.kind === 'sys') runSys(it.name);
  };
  const itemMenu = (it) => {
    const m = [{ label: '<b>Open</b>', act: () => openItem(it) }];
    if (it.kind === 'file') {
      if (cur === 'recycle') m.push({ label: 'Restore', act: () => restoreFile(it.f) }, { label: 'Delete', act: () => deleteFile(it.f) });
      else m.push({ sep: 1 }, { label: 'Send To Desktop', act: () => { it.f.dir = 'desktop'; save(); emit('fs'); } }, { label: 'Delete', act: () => deleteFile(it.f) }, { label: 'Rename', act: () => renameFile(it.f) });
      m.push({ sep: 1 }, { label: 'Properties', act: () => fileProps(it.f) });
    } else if (it.kind === 'sys') m.push({ label: 'Delete', act: () => deleteSys(it.name) });
    return m;
  };
  const render = () => {
    const D = DIRS[cur];
    w.setTitle(D.name); w.setIcon(D.icon === 'recycle' && filesIn('recycle').length ? 'recyclefull' : D.icon);
    path.textContent = ''; path.append(img(D.icon, 16), D.path || D.name);
    view.textContent = '';
    const items = dirItems(cur);
    for (const it of items) {
      const name = it.kind === 'file' ? displayName(it.f) : it.name;
      const el = h('div', { class: 'ficon' + (sel === it ? ' sel' : ''), title: it.kind === 'file' ? it.f.name : name }, img(it.kind === 'file' ? fileIcon(it.f) : it.icon, 32), h('span', { text: name }));
      el.addEventListener('pointerdown', (e) => { e.stopPropagation(); sel = it; $$('.ficon', view).forEach((x) => x.classList.remove('sel')); el.classList.add('sel'); w.setStatus(0, it.kind === 'file' ? `${it.f.name}  ${fmtSize(it.f.size)}` : name); });
      el.addEventListener('dblclick', () => openItem(it));
      el.addEventListener('click', (e) => { if (e.pointerType === 'touch') openItem(it); });
      ctxMenu(el, () => itemMenu(it));
      view.append(el);
    }
    w.setStatus(0, items.length + ' object(s)');
    w.setStatus(1, cur === 'mycomp' ? 'My Computer' : fmtSize(items.reduce((a, it) => a + (it.f ? it.f.size : 0), 0)));
    up.disabled = cur === 'mycomp';
    emptyBtn.hidden = cur !== 'recycle';
  };
  view.addEventListener('pointerdown', () => { sel = null; $$('.ficon', view).forEach((x) => x.classList.remove('sel')); });
  ctxMenu(view, () => [{ label: 'Refresh', act: render }, cur === 'recycle' ? { label: 'Empty Recycle Bin', act: emptyRecycle } : null, cur === 'docs' || cur === 'desktop' ? { label: 'New Text Document', act: () => { addFile({ name: 'New Text Document.txt', dir: cur, text: '', size: 0 }); } } : null]);
  const body = h('div', { class: 'col grow', style: 'gap:0;min-height:0' }, h('div', { class: 'addr' }, up, h('span', { text: 'Address' }), path, emptyBtn), view);
  w = openWin({
    title: DIRS[dir].name, icon: DIRS[dir].icon, w: 520, h: 360, body, status: ['', { text: '', style: 'width:140px' }],
    menu: [{ label: 'File', items: () => [{ label: 'Open', dis: !sel, act: () => sel && openItem(sel) }, { label: 'Delete', dis: !sel || sel.kind !== 'file', act: () => deleteFile(sel.f) }, { label: 'Properties', dis: !sel || sel.kind !== 'file', act: () => fileProps(sel.f) }, { sep: 1 }, cur === 'recycle' ? { label: 'Empty Recycle Bin', act: emptyRecycle } : null, { label: 'Close', act: () => w.close() }] },
      { label: 'Edit', items: [{ label: 'Undo', dis: 1 }, { sep: 1 }, { label: 'Cut', dis: 1 }, { label: 'Copy', dis: 1 }, { label: 'Paste', dis: 1 }] },
      { label: 'View', items: () => [{ label: 'Refresh', act: render }, { sep: 1 }, { label: 'Folder Options...', act: openFolderOptions }] },
      { label: 'Go', items: () => [{ label: 'Up One Level', act: () => up.click() }, { sep: 1 }, { label: 'My Computer', act: () => go('mycomp') }, { label: 'My Documents', act: () => go('docs') }] },
      { label: 'Help', items: [{ label: 'About Windoze', act: aboutWindoze }] }],
  });
  const off = () => { if (!w.closed) render(); };
  on('fs', off);
  render();
  return w;
}
async function renameFile(f) {
  const v = await inputBox({ title: 'Rename', text: 'New name:', value: f.name });
  if (v && v.trim()) { f.name = v.trim(); save(); emit('fs', f); if (extOf(f.name) === 'mp3' && f.payload) unlock('rename'); }
}
function fileProps(f) {
  msgBox({ title: displayName(f) + ' Properties', icon: 'none', html: `<div class="row" style="gap:12px;align-items:flex-start"><img src="${icon(fileIcon(f))}" width="32"><div><b>${esc(f.name)}</b><hr class="etch">Type: ${esc((extOf(f.name) || 'file').toUpperCase())} File<br>Location: ${esc(DIRS[f.dir] ? DIRS[f.dir].path : '')}<br>Size: ${fmtSize(f.size)} (${fmtBytes(f.size)} bytes)<br>Created: ${esc(f.date)}${f.track ? `<br>Bitrate: ${f.track.kbps} kbps` : ''}${f.fromUser ? `<br>Downloaded from: ${esc(f.fromUser)}` : ''}</div></div>`, w: 320 });
}
function runSys(n) {
  if (n === 'REGEDIT.EXE') { openRegedit(); return; }
  if (n === 'EXPLORER.EXE') { openExplorer('mycomp'); return; }
  if (/\.(ini|bat|sys)$/i.test(n)) { openNotepad({ name: n, text: SYSTEXT[n] || '; ' + n + '\n[boot]\nshell=Explorer.exe\n', ro: true }); return; }
  if (/\.wav$/i.test(n)) { (n === 'TADA.WAV' ? SFX.tada : SFX.chord)(); return; }
  if (/\.bmp$/i.test(n)) { setWallpaper(n === 'CLOUDS.BMP' ? 'clouds' : 'setup'); return; }
  if (n === 'COMMAND.COM') { openDOS(); return; }
  msgBox({ title: n, icon: 'error', text: 'This program cannot be run in Windoze mode.' });
}
const SYSTEXT = {
  'AUTOEXEC.BAT': '@ECHO OFF\nSET BLASTER=A220 I5 D1 T4\nSET PATH=C:\\WINDOZE;C:\\WINDOZE\\COMMAND\nREM  Bongo Buddy auto-start (do not remove!!)\nC:\\PROGRA~1\\BONGO\\BONGOUPD.EXE /silent\n',
  'CONFIG.SYS': 'DEVICE=C:\\WINDOZE\\HIMEM.SYS\nDOS=HIGH,UMB\nFILES=40\nBUFFERS=30\n',
  'WIN.INI': '[windoze]\nload=\nrun=bongo.exe\n\n[Desktop]\nWallpaper=(None)\nTileWallpaper=1\n\n[sounds]\nSystemStart=TADA.WAV\n',
  'SYSTEM.INI': '[boot]\nshell=Explorer.exe\nsystem.drv=system.drv\n\n[386Enh]\n; do not touch anything in here\n',
};
async function deleteSys(n) {
  const b = await msgBox({ title: 'Confirm File Delete', icon: 'warn', text: `The file '${n}' is a system file. If you remove it, Windoze or another program may no longer work correctly.\n\nAre you sure you want to delete it?`, buttons: ['Yes', 'No'], def: 1 });
  if (b !== 'Yes') return;
  S.deletedSys = (S.deletedSys || []).concat(n); save(); emit('fs'); SFX.recycle();
  unlock('sysfile');
  if (/KRNL|USER|GDI|WIN\.COM|IO\.SYS|MSDOS|COMMAND|HIMEM/.test(n)) after(3, () => bsod({ code: '0E', fatal: true, why: 'sys' }));
}
function openRegedit() {
  const tree = ['My Computer', '  + HKEY_CLASSES_ROOT', '  + HKEY_CURRENT_USER', '  - HKEY_LOCAL_MACHINE', '      + SOFTWARE', '          + AmeriNet', '          + BongoBuddy', '              Bongo = "always_on"', '              CanUninstall = "lol no"', '          + Snapster', '      + SYSTEM', '  + HKEY_USERS'];
  openWin({ title: 'Registry Editor', icon: 'key', w: 460, h: 300, body: h('div', { class: 'lv lcd', style: 'font-size:16px;padding:6px;white-space:pre' }, tree.join('\n')) });
  msgBox({ title: 'Registry Editor', icon: 'warn', text: 'Editing the registry can make your computer unusable. Look, but don\'t touch.' });
  unlock('regedit');
}

// ---- Notepad ----
function openNotepad(f) {
  const ta = h('textarea', { class: 'field sel-text grow', style: 'font: 13px/1.3 "Courier New", monospace; white-space: pre-wrap;', spellcheck: false });
  ta.value = f ? (f.text || '') : (S.notepad || '');
  if (f && f.ro) ta.readOnly = true;
  let file = f && f.id ? f : null, w, dirty = false;
  ta.addEventListener('input', () => { dirty = true; if (!file) { S.notepad = ta.value; save(); } });
  const saveAs = async () => {
    const n = await inputBox({ title: 'Save As', text: 'File name (saved in My Documents):', value: file ? file.name : 'Untitled.txt' });
    if (!n) return;
    const name = /\.[a-z0-9]+$/i.test(n) ? n : n + '.txt';
    file = addFile({ name, dir: 'docs', text: ta.value, size: ta.value.length });
    w.setTitle(displayName(file) + ' - Notepad'); dirty = false; unlock('notepad');
  };
  const doSave = () => { if (file) { file.text = ta.value; file.size = ta.value.length; save(); emit('fs', file); dirty = false; } else saveAs(); };
  w = openWin({
    title: (f ? displayName(f) : 'Untitled') + ' - Notepad', icon: 'notepad', w: 460, h: 320, body: ta,
    menu: [{ label: 'File', items: [{ label: 'New', act: () => { file = null; ta.value = ''; w.setTitle('Untitled - Notepad'); } }, { label: 'Save', act: doSave, dis: f && f.ro }, { label: 'Save As...', act: saveAs }, { sep: 1 }, { label: 'Exit', act: () => w.close() }] },
      { label: 'Edit', items: [{ label: 'Select All', act: () => ta.select() }, { label: 'Time/Date', key: 'F5', act: () => { ta.setRangeText(clockStr() + ' ' + shortDate().split(' ')[0], ta.selectionStart, ta.selectionEnd, 'end'); } }] },
      { label: 'Search', items: [{ label: 'Find...', dis: 1 }] },
      { label: 'Help', items: [{ label: 'About Notepad', act: aboutWindoze }] }],
    onClose: () => { if (dirty && file && !(f && f.ro)) { file.text = ta.value; file.size = ta.value.length; save(); } },
  });
  ta.addEventListener('keydown', (e) => { if (e.key === 'F5') { e.preventDefault(); ta.setRangeText(clockStr() + ' 6/15/01', ta.selectionStart, ta.selectionEnd, 'end'); } });
  setTimeout(() => ta.focus(), 30);
  return w;
}

// ---- DOS prompt ----
function openDOS() {
  const out = h('div', { class: 'lcd sel-text', style: 'flex:1;min-height:0;overflow:auto;background:#000;color:#c0c0c0;font-size:18px;line-height:1.05;padding:4px 6px;white-space:pre-wrap;word-break:break-all' });
  const inp = h('input', { type: 'text', style: 'position:absolute;opacity:0;left:0;top:0;width:10px;height:10px', autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
  let cwd = 'C:\\WINDOZE', line = '', confirm = null, w;
  const print = (s) => { out.append(s + '\n'); out.scrollTop = out.scrollHeight; };
  const cursor = h('span', { class: 'blink', text: '_' });
  const promptEl = h('span');
  const showPrompt = () => { promptEl.textContent = (confirm ? confirm.q : cwd + '>') + line; out.append(promptEl, cursor); out.scrollTop = out.scrollHeight; };
  const run = (cmdline) => {
    promptEl.remove(); cursor.remove();
    print((confirm ? confirm.q : cwd + '>') + cmdline);
    if (confirm) { const c = confirm; confirm = null; c.fn(cmdline.trim().toUpperCase()); if (!confirm) showPrompt(); return; }
    const [cmd, ...args] = cmdline.trim().split(/\s+/); const a = args.join(' ');
    const C = (cmd || '').toLowerCase();
    if (!C) {}
    else if (C === 'help') print('For more information on a specific command, type HELP command-name\nCD       Displays or changes the current directory.\nCLS      Clears the screen.\nDATE     Displays the date.\nDIR      Displays a list of files.\nECHO     Displays messages.\nEXIT     Quits the DOS prompt.\nFORMAT   Formats a disk.\nMEM      Displays free memory.\nPING     Checks a connection.\nTIME     Displays the time.\nVER      Displays the Windoze version.\nWIN      Starts Windoze.');
    else if (C === 'cls') { out.textContent = ''; }
    else if (C === 'ver') print('\nWindoze Millennium [Version 4.90.3000]\n');
    else if (C === 'date') print('Current date is ' + gameDate().toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' }));
    else if (C === 'time') print('Current time is ' + clockStr());
    else if (C === 'echo') print(a || 'ECHO is on.');
    else if (C === 'mem') print('\n    655,360 bytes total conventional memory\n    589,824 bytes available to DOS\n    131,072K total extended memory\n    Largest executable program size  612,048 (598K)\n');
    else if (C === 'cd' || C === 'chdir' || C === 'cd..') { if (C === 'cd..' || a === '..') cwd = cwd.replace(/\\[^\\]+$/, '') || 'C:'; else if (a) cwd = (a.includes(':') ? a : cwd + '\\' + a).toUpperCase(); if (cwd === 'C:') cwd = 'C:\\'; }
    else if (C === 'dir') {
      const files = cwd.startsWith('C:\\WINDOZE') ? SYSFILES.filter((n) => !(S.deletedSys || []).includes(n)) : cwd.includes('MUSIC') ? filesIn('music').map((f) => f.name.toUpperCase()) : ['AUTOEXEC.BAT', 'CONFIG.SYS', 'COMMAND.COM', '<DIR>  WINDOZE', '<DIR>  MYDOCU~1', '<DIR>  PROGRA~1'];
      print('\n Volume in drive C has no label\n Volume Serial Number is 1F2B-0E36\n Directory of ' + cwd + '\n');
      for (const f of files) print(' ' + f.padEnd(28) + '  06-15-01  7:30p');
      print('        ' + files.length + ' file(s)\n                 412,304,384 bytes free');
    }
    else if (C === 'ping') { print('\nPinging ' + (a || 'localhost') + ' with 32 bytes of data:\n'); if (NET.state !== 'on') { for (let i = 0; i < 4; i++) print('Request timed out.'); } else for (let i = 0; i < 4; i++) print('Reply from 10.0.0.' + irnd(2, 250) + ': bytes=32 time=' + irnd(140, 420) + 'ms TTL=' + irnd(40, 120)); }
    else if (C === 'format') {
      confirm = { q: '\nWARNING, ALL DATA ON NON-REMOVABLE DISK\nDRIVE ' + (a || 'C:').toUpperCase() + ' WILL BE LOST!\nProceed with Format (Y/N)?', fn: (ans) => {
        if (ans === 'Y') { print('\nFormatting 20,473.6M'); let p = 0; const iv = setInterval(() => { p += irnd(4, 11); promptEl.remove(); cursor.remove(); if (p >= 100) { clearInterval(iv); print('100 percent completed.\n\n...just kidding. Your files are fine.\nBongo hid the real FORMAT command. You\'re welcome!\n'); unlock('format'); showPrompt(); } else { out.lastChild && out.lastChild.nodeType === 3 && /percent/.test(out.lastChild.textContent) && out.lastChild.remove(); print(p + ' percent completed.'); } }, 260); confirm = null; promptEl.remove(); return 'hold'; }
        print('');
      } };
      showPrompt(); return;
    }
    else if (C === 'exit') { w.close(); return; }
    else if (C === 'win') print('You are already running Windoze.');
    else if (C === 'deltree' || C === 'del') print('Access denied. (Nice try.)');
    else if (C === 'edit' || C === 'notepad') openNotepad();
    else if (C === 'bongo') { print('Bad command or file name... just kidding. HI!!!'); bongoSummon(); bongoSay('You found me in DOS! I\'m everywhere!', { emote: 'wave' }); }
    else if (C === 'scandisk') { w.close(); runScandisk(true); return; }
    else if (/^[a-z]:$/.test(C)) { if (C === 'c:') cwd = 'C:\\'; else print('\nNot ready reading drive ' + C.toUpperCase()[0] + '\nAbort, Retry, Fail?'); }
    else print('Bad command or file name');
    showPrompt();
  };
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const l = line; line = ''; run(l); e.preventDefault(); return; }
    if (e.key === 'Backspace') { line = line.slice(0, -1); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) line += e.key;
    else return;
    e.preventDefault();
    promptEl.textContent = (confirm ? confirm.q : cwd + '>') + line;
  });
  const body = h('div', { class: 'col grow', style: 'gap:0;min-height:0;position:relative' }, h('div', { class: 'row', style: 'padding:2px 2px 4px' }, h('select', null, h('option', null, 'Auto')), h('button', { class: 'btn sm', text: 'A', style: 'font-weight:bold' })), out, inp);
  out.addEventListener('pointerdown', (e) => { e.preventDefault(); inp.focus(); });
  w = openWin({ title: 'DOS Prompt', icon: 'dos', w: 560, h: 340, body, onFocus: () => setTimeout(() => inp.focus(), 0) });
  print('\nMicrosloth(R) Windoze Millennium\n   (C)Copyright Microsloth Corp 1981-2000.\n');
  showPrompt(); setTimeout(() => inp.focus(), 50);
  unlock('dos');
  w.type = (s) => { for (const ch of s) { line += ch; } run(line); line = ''; };
  return w;
}

// ---- Run and Find ----
const RUNCMDS = {
  notepad: () => openNotepad(), command: openDOS, cmd: openDOS, winmine: () => openMines(), mines: () => openMines(), sol: () => openSolitaire(), pinball: () => openPinball(),
  iexplore: () => openBrowser(), explorer: () => openExplorer(), regedit: openRegedit, control: openControlPanel, 'desk.cpl': openDisplay, display: openDisplay, sounds: openSounds, mouse: openMouse, dialup: () => openAmeriNet(), scandisk: () => runScandisk(true),
  snapster: () => APPS.snapster.open(), zapamp: () => APPS.zapamp.open(), bongo: () => { bongoSummon(); bongoSay('You called? I\'m always here for you. ALWAYS.', { emote: 'wave' }); unlock('secretbongo'); },
  mail: () => openMail(), aim: () => msgBox({ icon: 'info', title: 'Run', text: 'Did you mean BuddyChat? We don\'t talk about the other one.' }), calc: () => msgBox({ icon: 'info', title: 'Calculator', text: '2 + 2 = 5\n\n(Calculator is still installing. Please try again in 2002.)' }),
};
function openRun() {
  const dl = h('datalist', { id: 'runlist' }, Object.keys(RUNCMDS).map((k) => h('option', { value: k })));
  inputBox({ title: 'Run', icon: 'run', w: 360, text: 'Type the name of a program, folder, document, or Internet resource, and Windoze will open it for you.', value: S.lastRun || '', extra: dl }).then((v) => {
    if (!v) return;
    S.lastRun = v; save();
    const c = v.trim().toLowerCase();
    if (/^(https?:\/\/|www\.)/.test(c)) { openBrowser(c.startsWith('http') ? c : '' + c); return; }
    if (/^format/.test(c)) { const w = openDOS(); setTimeout(() => w.type(c), 200); return; }
    const k = c.replace(/\.exe$/, '');
    if (RUNCMDS[k]) { RUNCMDS[k](); return; }
    const f = S.files.find((f) => f.name.toLowerCase() === c || displayName(f).toLowerCase() === c);
    if (f) { openFile(f); return; }
    msgBox({ title: v, icon: 'error', text: `Cannot find the file '${v}' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.` });
  });
  setTimeout(() => { const i = $('.win.active input'); if (i) i.setAttribute('list', 'runlist'); }, 40);
}
async function openFind() {
  const q = await inputBox({ title: 'Find: All Files', icon: 'find', text: 'Named:', ok: 'Find Now' });
  if (q == null) return;
  const res = S.files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()) && f.dir !== 'recycle');
  const lv = listView([{ label: 'Name', w: 220 }, { label: 'In Folder', w: 200 }, { label: 'Size', w: 70 }], { onOpen: (r) => openFile(r.f) });
  lv.set(res.map((f) => ({ f, cells: [h('span', null, img(fileIcon(f), 16), displayName(f)), DIRS[f.dir].path, fmtSize(f.size)] })));
  openWin({ title: 'Find: Files named ' + q, icon: 'find', w: 520, h: 280, body: lv, status: [res.length + ' file(s) found'] });
}
