// "Viruses" (all harmless, in-game only): the payloads a fake download can carry, VirusBlaster that scans and cleans
// them, Ad-Be-Gone, the gerbil-dance joke program, the fx canvas (confetti, melting screen, runaway cursor),
// screen savers, and the toast popups.
const VIRUSES = {
  popups: { name: 'AdBot.Popup', bad: 'opens pop-up ads', start() { VX.popups = true; if (!VX.popupT) VX.popupT = every(rnd(14, 22), () => { if (VX.popups && !$('#saver.on')) bongoAdPopup(); }, 6); } },
  runaway: { name: 'Prankster.Cursor', bad: 'makes your cursor run away', start() { VX.runaway = true; APP().classList.add('fakecursor'); } },
  cursor: { name: 'Prankster.Cursor', bad: 'makes your cursor run away', start() { VIRUSES.runaway.start(); } },
  flip: { name: 'Joke.FlipScreen', bad: 'flips the screen upside down', start() { VX.flip = true; $('#desk').style.transform = 'rotate(180deg)'; } },
  trails: { name: 'Joke.Trails', bad: 'covers the screen in mouse trails', start() { VX.trails = true; WM.trails = true; S._trailsWasVirus = true; } },
  melt: { name: 'Joke.Melt', bad: 'melts the screen', start() { VX.melt = true; fxMelt(); } },
  admirer: { name: 'Script.Admirer', bad: 'e-mails itself to everyone and spawns windows', start() { fxWorm(); } },
  iluvu: { name: 'Script.Admirer', bad: 'e-mails itself to everyone', start() { fxWorm(); } },
};
const VX = { popups: false, runaway: false, flip: false, trails: false, melt: false, popupT: 0, cursorX: 0, cursorY: 0, active: [] };
function infect(payload, file) {
  const V = VIRUSES[payload] || VIRUSES.popups;
  if (!VX.active.includes(payload)) VX.active.push(payload);
  stat('infected'); unlock('virus');
  if (S.vblaster && S.defs && chance(0.6)) { after(1.2, () => { msgBox({ title: 'VirusBlaster 2001', icon: 'shield', winIcon: 'shield', text: `Threat detected!\n\n${V.name} was found in "${file ? file.name : 'a file'}" and blocked before it could run.\n\nYour computer is protected.`, task: true }); VX.active = VX.active.filter((p) => p !== payload); }); unlock('blocked2'); return; }
  msgBox({ title: 'Windoze', icon: 'error', text: `${file ? file.name : 'The program'} has performed an illegal operation and will be shut down.`, buttons: ['OK'], silent: false }).then(() => { V.start(); after(0.5, () => bongoInstalled() && bongoSay(pick(['Uh oh! That didn\'t look right!', 'Did your computer just do something weird?', 'Hee hee, spooky!']), { emote: 'sad' })); });
}
function bongoInstalled() { return S.bongo.installed && BONGO.shown; }
function cleanViruses() {
  VX.popups = false; VX.runaway = false; VX.melt = false;
  if (VX.flip) { VX.flip = false; $('#desk').style.transform = ''; }
  if (VX.trails) { VX.trails = false; if (S._trailsWasVirus && !S.trails) WM.trails = false; clearTrails(); }
  APP().classList.remove('fakecursor');
  fxClear();
  VX.active = [];
}
// ---- VirusBlaster ----
function openVirusBlaster() {
  let w;
  const log = h('div', { class: 'field sel-text', style: 'flex:1;min-height:80px;overflow:auto;font:12px monospace;background:#001a00;color:#40ff40;padding:6px' });
  const bar = h('div', { class: 'bar', style: 'flex:none' }, h('i', { style: 'width:0' }));
  const status = h('div', { class: 'row', style: 'flex:none' }, img('shield', 24), h('div', { class: 'grow' }, h('b', { text: 'VirusBlaster 2001' }), h('div', { class: 'dim', id: 'vbdefs' })));
  const print = (t, c) => { log.append(h('div', { style: c ? 'color:' + c : '', text: t })); log.scrollTop = log.scrollHeight; };
  const scanBtn = h('button', { class: 'btn def', text: 'Scan Now' });
  const updBtn = h('button', { class: 'btn', text: 'LiveUpdate' });
  const setDefs = () => { $('#vbdefs', status).textContent = S.defs ? 'Definitions: current (updated today)' : 'Definitions: OUT OF DATE (dated 1998)'; };
  scanBtn.onclick = async () => {
    scanBtn.disabled = updBtn.disabled = true; log.textContent = '';
    print('VirusBlaster 2001 - Full System Scan'); print('Definitions dated ' + (S.defs ? 'today' : 'June 1998') + '\n', S.defs ? '#40ff40' : '#ffd000');
    const scanFiles = S.files.filter((f) => f.dir !== 'recycle');
    const total = 420 + scanFiles.length;
    for (let i = 0; i <= total; i += irnd(8, 30)) { bar.firstChild.style.width = Math.min(100, i / total * 100) + '%'; if (chance(0.3)) print('Scanning ' + pick(['C:\\WINDOZE\\', 'C:\\Program Files\\', 'C:\\My Documents\\', 'memory ', 'registry ']) + 'file ' + i + '...'); await sleep(0.05); }
    bar.firstChild.style.width = '100%';
    const infected = scanFiles.filter((f) => f.payload);
    const activeNames = [...new Set(VX.active.map((p) => (VIRUSES[p] || {}).name).filter(Boolean))];
    print('');
    if (!S.defs) { print('Scan complete. No threats found.', '#40ff40'); print('(But your definitions are from 1998. Run LiveUpdate!)', '#ffd000'); unlock('olddefs'); }
    else {
      let found = 0;
      for (const f of infected) { print('THREAT: ' + (VIRUSES[f.payload] || {}).name + ' in ' + f.name, '#ff4040'); found++; }
      for (const n of activeNames) { print('ACTIVE THREAT IN MEMORY: ' + n, '#ff4040'); found++; }
      if (!found) print('Scan complete. No threats found. You\'re clean!', '#40ff40');
      else {
        print('\n' + found + ' threat(s) found. Cleaning...', '#ffd000');
        await sleep(1.2);
        for (const f of infected) { f.payload = null; f.quarantined = true; }
        save(); cleanViruses();
        print('All threats removed and quarantined.', '#40ff40'); SFX.ding();
        unlock('cleaned'); stat('cleaned');
      }
    }
    scanBtn.disabled = updBtn.disabled = false;
  };
  updBtn.onclick = async () => {
    if (!netOn()) { needNet('LiveUpdate'); return; }
    updBtn.disabled = scanBtn.disabled = true; log.textContent = ''; print('LiveUpdate: connecting to virusblaster.com...');
    for (const s of ['Checking for new definitions...', 'Found update: 2001-06-15 (was 1998-02-03)', 'Downloading (1.4 MB)...', 'Installing...']) { await sleep(rnd(0.6, 1.4)); print(s); }
    S.defs = true; save(); setDefs(); print('\nDefinitions are now up to date!', '#40ff40'); SFX.ding(); unlock('liveupdate');
    updBtn.disabled = scanBtn.disabled = false;
  };
  w = openWin({ key: 'vb', title: 'VirusBlaster 2001', icon: 'shield', w: 440, h: 340, body: h('div', { class: 'col grow pad', style: 'min-height:0' }, status, h('div', { class: 'row' }, scanBtn, updBtn, h('div', { class: 'grow' }), h('button', { class: 'btn', text: 'Close', onclick: () => w.close() })), bar, log) });
  setDefs();
  print('Welcome to VirusBlaster 2001.');
  print(S.defs ? 'Definitions are current. Click Scan Now.' : 'Your definitions are OUT OF DATE. Run LiveUpdate first!', S.defs ? '' : '#ffd000');
  if (VX.active.length) print('Warning: suspicious activity detected on this PC.', '#ff4040');
  return w;
}
// ---- Ad-Be-Gone ----
function openAdBeGone() {
  if (!S.adbegone) return;
  let w;
  const lv = listView([{ label: '', w: 22 }, { label: 'Item', w: 200 }, { label: 'Type', w: 90 }, { label: 'Status', w: 80 }], { });
  const found = () => {
    const items = [];
    if (S.bongo.installed) items.push({ id: 'bongo', name: 'Bongo Buddy', type: 'Spyware', core: true });
    if (S.bongo.updater) items.push({ id: 'updater', name: 'Bongo Search Assistant', type: 'Trojan', core: true });
    for (const id of S.bongo.adware) items.push({ id, name: ADWARE[id].name, type: 'Adware' });
    return items;
  };
  const refresh = () => lv.set(found().map((it) => ({ it, cells: [h('input', { type: 'checkbox', checked: true, 'data-id': it.id }), it.name, it.type, h('span', { style: 'color:#c00', text: 'Infected' })] })));
  const scanBtn = h('button', { class: 'btn def', text: 'Scan for Spyware' });
  const remBtn = h('button', { class: 'btn', text: 'Remove Checked', disabled: true });
  const bar = h('div', { class: 'bar' }, h('i', { style: 'width:0' }));
  scanBtn.onclick = async () => {
    scanBtn.disabled = true; lv.set([]);
    for (let p = 0; p <= 100; p += irnd(6, 16)) { bar.firstChild.style.width = Math.min(100, p) + '%'; await sleep(0.08); }
    bar.firstChild.style.width = '100%';
    refresh(); remBtn.disabled = false; scanBtn.disabled = false;
    w.setStatus(0, found().length + ' threats found'); unlock('adscan');
  };
  remBtn.onclick = async () => {
    const ids = $$('input[data-id]:checked', lv).map((c) => c.dataset.id);
    if (!ids.length) return;
    remBtn.disabled = true;
    for (const id of ids) {
      if (id === 'bongo' || id === 'updater') {
        // Bongo resists; Ad-Be-Gone weakens him but Add/Remove must finish the job
        if (S.bongo.installed) bongoSay(pick(['NO! Not Ad-Be-Gone! We\'re friends!', 'You can\'t make me leave! I live here!', 'I\'ll be baaa-ack!']), { emote: 'sad' });
        S.bongo.adbegone = (S.bongo.adbegone || 0) + 1;
        if (id === 'updater') { S.bongo.updater = false; unlock('killupdater'); }
      } else removeAdware(id);
      await sleep(0.4);
    }
    save(); refresh();
    if (!S.bongo.updater && ids.includes('updater')) msgBox({ title: 'Ad-Be-Gone', icon: 'info', text: 'Bongo Search Assistant has been disabled!\n\nIt can no longer reinstall things behind your back. Now you can finish removing Bongo from Add/Remove Programs for good.' });
    else msgBox({ title: 'Ad-Be-Gone', icon: 'info', text: 'Selected items removed.\n\nNote: Bongo Buddy itself must be removed from Add/Remove Programs. (Disable Bongo Search Assistant first, or he\'ll just come back.)' });
    emit('desk'); emit('programs'); remBtn.disabled = false; unlock('adbegone2');
  };
  w = openWin({ key: 'adbegone', title: 'Ad-Be-Gone 1.0', icon: 'adbegone', w: 460, h: 340, body: h('div', { class: 'col grow pad', style: 'min-height:0' }, h('div', { class: 'row' }, img('adbegone', 24), h('b', { text: 'Ad-Be-Gone Spyware Remover' })), lv, bar, h('div', { class: 'row' }, scanBtn, remBtn, h('div', { class: 'grow' }), h('button', { class: 'btn', text: 'Close', onclick: () => w.close() }))), status: ['Click Scan to begin'] });
  return w;
}
// ---- the gerbil-dance joke program ----
function gerbilShow() {
  const cv = h('canvas', { width: 320, height: 240, style: 'width:100%;height:100%;display:block;background:#101840' });
  const w = openWin({ title: 'gerbil_dance.exe', icon: 'gerbil', w: 320, h: 262, resizable: false, small: true, body: cv });
  const x = cv.getContext('2d');
  const bpm = 150, spb = 60 / bpm, t0 = performance.now();
  const notes = [60, 64, 67, 72, 67, 64]; let ni = 0, nextNote = 0;
  const draw = () => {
    if (w.closed) return;
    requestAnimationFrame(draw);
    const t = (performance.now() - t0) / 1000, beat = t / spb;
    if (t > nextNote) { tone({ f: mtof(notes[ni++ % notes.length] + 12), d: spb * 0.8, v: 0.1, type: 'square', r: 0.05 }); if (ni % 2 === 0) INST && INST.kick(now(), AU.sfx, 0.5); nextNote += spb; }
    x.fillStyle = '#101840'; x.fillRect(0, 0, 320, 240);
    for (let i = 0; i < 20; i++) { x.fillStyle = `hsl(${(t * 60 + i * 40) % 360},90%,60%)`; x.fillRect((i * 37 + t * 60) % 340 - 20, 200 + Math.sin(t * 3 + i) * 6, 16, 40); }
    const n = 5;
    for (let i = 0; i < n; i++) { const bx = 50 + i * 55, by = 150 + Math.abs(Math.sin(beat * Math.PI + i)) * -30; drawGerbil(x, bx, by, beat + i); }
    x.fillStyle = '#fff'; x.font = 'bold 20px Comic Sans MS, cursive'; x.textAlign = 'center'; x.fillText('\u266B DANCE GERBILS DANCE \u266B', 160, 36);
  };
  draw();
  after(1, () => bongoInstalled() && bongoSay('Hee hee! I love the dancing gerbils!', { emote: 'love' }));
  unlock('gerbil');
}
function drawGerbil(x, gx, gy, ph) {
  x.save(); x.translate(gx, gy); x.rotate(Math.sin(ph * Math.PI) * 0.2);
  E_(x, 0, 0, 14, 11, '#d8a060', '#5a3a10'); C_(x, 10, -8, 8, '#d8a060', '#5a3a10');
  C_(x, 8, -12, 3, '#f0c0a0', '#5a3a10'); C_(x, 12, -9, 1.5, '#000'); C_(x, 16, -7, 1.3, '#ff8080');
  x.strokeStyle = '#5a3a10'; x.lineWidth = 2; x.beginPath(); x.moveTo(-12, 2); x.quadraticCurveTo(-24, Math.sin(ph * 4) * 8, -26, -4); x.stroke();
  x.restore();
}
// register the gerbil program
APPS.gerbilshow = { title: 'gerbil_dance.exe', icon: 'gerbil', open: gerbilShow };
