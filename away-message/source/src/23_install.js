// Installing things: web downloads that land a setup icon on the desktop, the generic InstallShield-style setup
// wizard, and what each installable program does when its setup finishes.
const DOWNLOADS = {
  bongo: { name: 'BongoSetup.exe', app: 'bongoInstall', size: 14700000 },
  adbegone: { name: 'AdBeGoneSetup.exe', app: 'adbegoneInstall', size: 1100000 },
  winzipper: { name: 'winzip80.exe', app: 'winzipInstall', size: 1260000 },
  zapamp: { name: 'zapamp276.exe', app: 'zapampInstall', size: 1990000 },
  toasters: { name: 'FlyingToasterz.exe', app: 'toasterInstall', size: 2100000 },
  weatherbug: { name: 'WeatherBuggy.exe', app: 'weatherInstall', size: 3400000, sketchy: true },
  cometcursor: { name: 'CometCursor.exe', app: 'cometInstall', size: 820000, sketchy: true },
  crack: { name: 'SuperCrack_MP3Pro.exe', payload: 'popups', size: 402000 },
  bsod: { name: 'bsod_prank.exe', payload: 'bsodprank', size: 24000 },
};
function webDownload(key) {
  const d = DOWNLOADS[key]; if (!d) return;
  if (!netOn()) { needNet('Download'); return; }
  const bar = h('div', { class: 'bar', style: 'width:100%' }, h('i', { style: 'width:0' }));
  const info = h('div', { class: 'dim', style: 'font-size:11px' });
  const w = openWin({ title: 'File Download', icon: 'globe', w: 340, small: true, resizable: false, body: h('div', { class: 'pad col' }, h('div', { class: 'row' }, img('globe', 32), h('div', { class: 'grow' }, 'Downloading:', h('br'), h('b', { text: d.name }))), bar, info) });
  let got = 0; const rate = MYCAP * 1024 * SPEEDUP;
  const iv = every(0.1, () => {
    got += rate * 0.1 * rnd(0.7, 1.1);
    const p = Math.min(1, got / d.size);
    bar.firstChild.style.width = p * 100 + '%';
    info.textContent = `${fmtSize(Math.min(got, d.size))} of ${fmtSize(d.size)}  (${fmtTime((d.size - got) / rate)} left)`;
    if (p >= 1) { cancel(iv); w.close(); const f = addFile({ dir: 'desktop', name: d.name, size: d.size, app: d.app, payload: d.payload, installer: !!d.app && !d.noSetup, icon: d.payload ? 'exe' : null }); msgBox({ title: 'Download complete', icon: 'info', text: `"${d.name}" was saved to your Desktop.\n\nWould you like to run it now?`, buttons: ['Run', 'Close'] }).then((b) => { if (b === 'Run') runFile(f); }); stat('webdl'); }
  });
}
// installers: each is an APP with installer:true semantics handled here
function installApp(appId, file) {
  const inst = INSTALLERS[appId];
  if (!inst) { runFile({ name: file ? file.name : 'setup.exe' }); return; }
  runSetupWizard(inst, () => { inst.done(); if (file) { file.installer = false; } });
}
const INSTALLERS = {
  bongoInstall: { title: 'Bongo Buddy', icon: 'bongo', eula: 'BONGO BUDDY LICENSE AGREEMENT\n\nBy installing Bongo Buddy, you agree that Bongo may: display special offers, change your home page, add toolbars, monitor your browsing "to serve you better," start automatically, and be very difficult to remove. Bongo is your friend. Bongo would never hurt you. You agree to love Bongo forever.',
    done() { S.bongo.installed = true; S.bongo.updater = true; save(); emit('desk'); emit('programs'); bongoSummon(); } },
  adbegoneInstall: { title: 'Ad-Be-Gone 1.0', icon: 'adbegone', done() { S.adbegone = true; save(); emit('desk'); emit('programs'); msgBox({ title: 'Ad-Be-Gone', icon: 'adbegone', text: 'Ad-Be-Gone is installed! Open it from the desktop and scan for spyware.' }); } },
  winzipInstall: { title: 'WinZipper 8.0', icon: 'zip', nag: true, done() { msgBox({ title: 'WinZipper', icon: 'zip', text: 'Thank you for installing WinZipper!\n\nThis is an evaluation version. You have used it 0 times. 45 days remain in your trial (which will never end).' }); } },
  zapampInstall: { title: 'ZapAmp 2.76', icon: 'zapamp', done() { msgBox({ title: 'ZapAmp', icon: 'zapamp', text: 'ZapAmp is already installed! But thanks for the second copy.' }); openZapAmp(); } },
  toasterInstall: { title: 'Flying Toasterz', icon: 'display', done() { S.saver = 'toasters'; save(); msgBox({ title: 'Flying Toasterz', icon: 'display', text: 'Flying Toasterz is now your screen saver! Wait a couple of minutes without touching anything, or preview it in Display Properties.' }); } },
  weatherInstall: { title: 'WeatherBuggy', icon: 'smiley', sketchy: true, done() { installAdware('offers'); traySet('weather', { icon: 'info', title: 'WeatherBuggy: 72\u00B0 and pop-ups', click: bongoAdPopup }); msgBox({ title: 'WeatherBuggy', icon: 'warn', text: 'WeatherBuggy installed! It also installed 6 partner programs to "enhance your experience."' }); unlock('adware'); } },
  cometInstall: { title: 'Comet Cursor', icon: 'mouse', sketchy: true, done() { S.trails = true; save(); installAdware('offers'); msgBox({ title: 'Comet Cursor', icon: 'mouse', text: 'Your cursor is now a comet! (We also turned on some "features.")' }); unlock('mousetrails'); } },
};
// generic setup wizard
function runSetupWizard(inst, onDone) {
  let page = 0;
  const pages = ['welcome'].concat(inst.eula ? ['eula'] : [], ['dir', 'install', 'done']);
  const content = h('div', { class: 'grow', style: 'min-height:0;display:flex;flex-direction:column' });
  const banner = h('div', { style: 'width:120px;flex:none;background:linear-gradient(160deg,#1a3a8a,#4a7ad0);display:flex;align-items:center;justify-content:center' }, img(inst.icon, 32));
  banner.firstChild.style.width = '56px'; banner.firstChild.style.height = '56px';
  const back = h('button', { class: 'btn', text: '< Back', disabled: true });
  const next = h('button', { class: 'btn def', text: 'Next >' });
  const cancel2 = h('button', { class: 'btn', text: 'Cancel', onclick: () => w.close() });
  let agreed = false, installing = false, finished = false;
  const show = () => {
    const p = pages[page]; content.textContent = '';
    back.disabled = page === 0 || p === 'install' || p === 'done';
    next.textContent = p === 'done' ? 'Finish' : p === 'eula' ? 'I Agree' : p === 'dir' ? 'Install' : 'Next >';
    next.disabled = (p === 'eula' && !agreed) || p === 'install';
    cancel2.disabled = p === 'done';
    if (p === 'welcome') content.append(h('div', { class: 'pad' }, h('h3', { text: 'Welcome to the ' + inst.title + ' Setup Wizard' }), h('p', { text: 'This will install ' + inst.title + ' on your computer. It is strongly recommended that you close all other applications before continuing.' }), h('p', { text: 'Click Next to continue.' })));
    else if (p === 'eula') content.append(h('div', { class: 'pad col', style: 'min-height:0' }, h('b', { text: 'License Agreement' }), h('div', { class: 'field sel-text', style: 'flex:1;overflow:auto;font-size:11px;white-space:pre-wrap;min-height:80px', text: inst.eula }), h('label', { class: 'row' }, h('input', { type: 'checkbox', onchange: (e) => { agreed = e.target.checked; next.disabled = !agreed; } }), 'I accept the terms (not that I read them)')));
    else if (p === 'dir') content.append(h('div', { class: 'pad col' }, h('div', { text: 'Setup will install ' + inst.title + ' in the following folder:' }), h('div', { class: 'row' }, h('input', { type: 'text', value: 'C:\\Program Files\\' + inst.title.split(' ')[0], class: 'grow', readonly: true }), h('button', { class: 'btn sm', text: 'Browse...', onclick: () => msgBox({ title: 'Setup', icon: 'info', text: 'Just use the default. It\'s fine.' }) })), h('div', { class: 'dim', text: 'Space required: ' + (inst.sketchy ? 'way more than it says' : '3.1 MB') })));
    else if (p === 'install') { const bar = h('div', { class: 'bar', style: 'margin-top:8px' }, h('i', { style: 'width:0' })); const lbl = h('div', { class: 'dim' }); content.append(h('div', { class: 'pad col' }, h('b', { text: 'Installing...' }), lbl, bar)); let pr = 0; const iv = every(0.12, () => { pr += irnd(3, 10); bar.firstChild.style.width = Math.min(100, pr) + '%'; lbl.textContent = 'Copying file: ' + pick(['bongo.dll', 'setup.ocx', 'helper.exe', 'offers.dat', 'readme.txt', 'uninst.exe']); if (pr >= 100) { cancel(iv); page++; show(); } }); }
    else if (p === 'done') { finished = true; content.append(h('div', { class: 'pad' }, h('h3', { text: 'Installation Complete' }), h('p', { text: inst.title + ' has been installed on your computer.' }), inst.nag ? h('p', { class: 'dim', text: 'Please remember to register and send $29.95.' }) : null)); if (onDone && !w._done) { w._done = true; onDone(); } }
  };
  next.onclick = () => { const p = pages[page]; if (p === 'done') { w.close(); return; } page++; show(); };
  back.onclick = () => { if (page > 0) { page--; show(); } };
  const w = openWin({ title: inst.title + ' Setup', icon: inst.icon, w: 420, h: 300, resizable: false, small: true, body: h('div', { class: 'col grow', style: 'gap:0;min-height:0' }, h('div', { class: 'row grow', style: 'align-items:stretch;min-height:0;gap:0' }, banner, content), h('hr', { class: 'etch' }), h('div', { class: 'row', style: 'padding:6px', }, h('div', { class: 'grow' }), back, next, h('div', { style: 'width:6px' }), cancel2)) });
  show();
}
// register installer apps so runFile → APPS[app] works with installer flag
for (const id in INSTALLERS) APPS[id] = { title: INSTALLERS[id].title, icon: INSTALLERS[id].icon, open: () => installApp(id) };
// the "bsod prank" program just triggers a fake BSOD
VIRUSES.bsodprank = { name: 'Joke.BSOD', bad: 'shows a fake blue screen', start() { bsod({ fatal: false }); } };
