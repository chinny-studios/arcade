// Boot: wires the desktop together, runs the frame loop (game time + clock), the idle screen-saver timer, first-run
// setup, and the #debug hook (window.AM).
const MAIN = { raf: 0, lastTs: 0, lastInput: 0, started: false };
function seedFirstRun() {
  if (S.boots > 0 || S.files.length) return;
  addFile({ dir: 'desktop', name: 'read me!.txt', icon: 'txt', size: 320, text: 'Welcome to the family computer!\n\nIt is Friday night, June 15, 2001. Mom and Dad are watching TV.\n\n- Double-click AmeriNet Online to get on the Internet (it has to dial up first).\n- Download songs with Snapster. Chat with your buddies on BuddyChat.\n- That pink gorilla is Bongo. He means well. Mostly.\n- Open "My Achievements" to see everything there is to find.\n\nHave fun, and shut down before bed (Start > Shut Down) or ScanDisk will yell at you.\n\n- You' });
  addFile({ dir: 'desktop', name: 'AmeriNet 1000 FREE Hours!.txt', icon: 'amerinet', size: 210, text: 'YOU\'VE GOT 1000 FREE HOURS!!!\n\nInsert the AmeriNet CD... oh wait, it\'s already installed. Just double-click AmeriNet Online and click SIGN ON.\n\n(Offer expires never. There is always another CD.)' });
}
function activity() { MAIN.lastInput = performance.now(); if (SAV.on && !SAV.preview) endSaver(); }
function startDesktop() {
  if (MAIN.started) return; MAIN.started = true;
  applyScheme(); applyWall();
  fxInit(); SPEECH.init();
  seedFirstRun();
  buildTaskbar();
  renderDesktop();
  WM.trails = S.trails;
  // idle → screen saver (real time)
  MAIN.lastInput = performance.now();
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) addEventListener(ev, activity, true);
  // frame loop
  MAIN.lastTs = performance.now();
  const frame = (ts) => {
    MAIN.raf = requestAnimationFrame(frame);
    let dt = (ts - MAIN.lastTs) / 1000; MAIN.lastTs = ts;
    if (dt > 0.25) dt = 0.25;
    T.frame++;
    if (!$('#screen').classList.contains('on')) stepWorld(dt);
    // idle saver
    if (!SAV.on && !$('#screen').classList.contains('on') && !AU.muted !== false) {
      const idle = (ts - MAIN.lastInput) / 1000;
      if (idle > (S.saverWait || 120) && WM.wins.every((w) => !w.o || w.o.key !== 'shutdown')) startSaver(S.saver || 'pipes');
    }
  };
  MAIN.raf = requestAnimationFrame(frame);
  // close start menu / popups when clicking elsewhere
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.menu,.menubar,#start')) closeMenus(); }, true);
  // first unlock of audio on any gesture
  const once = () => { unlockAudio(); removeEventListener('pointerdown', once); removeEventListener('keydown', once); };
  addEventListener('pointerdown', once); addEventListener('keydown', once);
  // welcome
  const restarted = (() => { try { const r = sessionStorage.getItem('away-message-restart'); sessionStorage.removeItem('away-message-restart'); return r; } catch (e) { return null; } })();
  after(restarted ? 0.5 : 1.5, () => { if (!S.noWelcome) openWelcome(); });
  if (restarted) MAIN.wasRestart = true;
}
async function boot() {
  startDesktop();
  if (DEBUG) { if (!T.t) { CLOCK.t0 = 0; } S.cleanShutdown = true; return; }
  const restarted = MAIN.wasRestart;
  await powerOn({ restart: restarted });
}
// kick off
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();

// ---- debug hook ----
if (DEBUG) {
  window.AM = {
    S, T, WM, NET, BC, SNAP, ZAP, BONGO, MP, APPS, ACH,
    boot, start: () => { CLOCK.t0 = T.t; SFX.startup && null; emit('boot'); return 'desktop ready'; },
    sim(sec) { let rem = sec; while (rem > 0) { const d = Math.min(0.05, rem); stepWorld(d); rem -= d; } return { t: Math.round(T.t), net: NET.state, bc: BC.on }; },
    open(id) { if (APPS[id]) APPS[id].open(); else if (RUNCMDS[id]) RUNCMDS[id](); else throw new Error('no app ' + id); return id; },
    sn(name) { S.sn = name || 'tester'; save(); emit('sn', S.sn); return S.sn; },
    connect() { if (!S.sn) { S.sn = 'tester'; save(); } NET.state = 'on'; NET.since = T.t; traySet('modem', { icon: 'modemon', title: 'Connected' }); emit('net', 'on'); return 'online'; },
    disconnect: () => disconnect('user'),
    give(songId, kbps = 128, kind = 'song') { const s = findSong(songId) || SONGS[0]; const track = { songId: s.id, artist: s.artist, title: s.title, genre: s.genre, version: '', kind, kbps }; return addFile({ dir: 'music', name: s.artist + ' - ' + s.title + '.mp3', size: Math.round(songDur(track) * kbps * 125), track, fromUser: 'debug' }).name; },
    search(a, t) { return snapSearch(a || '', t || '').results.length; },
    buddyOn(sn) { const b = BUDDY(sn); if (b) { if (!BC.on) bcSignOn(); buddySignOn(b.sn); } return b ? b.sn : null; },
    bongo() { bongoSummon(); return BONGO.shown; },
    sing: (id) => bongoSing(id || 'theme'),
    adware: (id) => installAdware(id || 'bongobar'),
    unlock, unlockAll: () => { for (const a of ACH) unlock(a.id); return Object.keys(S.ach).length; },
    ach: () => ({ done: Object.keys(S.ach).filter((k) => ACH_BY[k]).length, total: ACH.length }),
    virus: (p) => infect(p || 'popups'),
    bsod: () => bsod(),
    saver: (id) => startSaver(id || 'pipes', true),
    reset() { resetSave(); return 'reset (reload to apply)'; },
    songs: () => SONGS.map((s) => s.id),
    achList: () => ACH.map((a) => a.id),
    wins: () => WM.wins.map((w) => w.title),
    // helpers for covers/tests
    save, snapSearch, filesIn, zapQueue, openIM, imLine, snapTab, deskW, deskH,
    win: (key) => WM.wins.find((w) => w.key === key),
    place: (key, x, y, ww, hh) => { const w = WM.wins.find((o) => o.key === key); if (w) { w.move(x, y); if (ww) w.size(ww, hh); } return !!w; },
    snap: SNAP, zap: ZAP, bc: BC, bongoObj: BONGO,
  };
}
