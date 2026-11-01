// ZapAmp: the skinnable MP3 player with a spectrum analyzer and a playlist. "It really zaps the yak's back."
const SKINS = {
  base: { name: 'Base Skin', bg: 'linear-gradient(180deg,#4a4a5c,#24242e)', edge: '#11111a', lcd: '#000', txt: '#22e822', dim: '#0a5a0a', btn: 'linear-gradient(180deg,#6a6a7a,#3a3a48)', btxt: '#ddd', acc: '#ffd400', bars: ['#22e822', '#e8e822', '#e82222'] },
  chrome: { name: 'Chrome Dome', bg: 'linear-gradient(180deg,#f4f4f8,#9a9aa8 50%,#d8d8e0)', edge: '#555', lcd: '#0a1a2a', txt: '#7ad0ff', dim: '#1a3a5a', btn: 'linear-gradient(180deg,#fff,#b0b0c0)', btxt: '#222', acc: '#0a5ac0', bars: ['#7ad0ff', '#fff', '#ff7ad0'] },
  bubblegum: { name: 'Bubblegum', bg: 'linear-gradient(180deg,#ffb0d8,#ff6ab0)', edge: '#a0205a', lcd: '#3a0020', txt: '#ffd0ec', dim: '#7a2a50', btn: 'linear-gradient(180deg,#fff0f8,#ff9ac8)', btxt: '#7a0040', acc: '#fff', bars: ['#ff9ad0', '#fff', '#ffe066'] },
  toxic: { name: 'Toxic Waste', bg: 'linear-gradient(180deg,#1a2a0a,#000)', edge: '#3aff00', lcd: '#000', txt: '#7aff00', dim: '#1a4a00', btn: 'linear-gradient(180deg,#2a4a0a,#0a1a00)', btxt: '#7aff00', acc: '#ff0', bars: ['#7aff00', '#ff0', '#f40'] },
  ocean: { name: 'Deep Blue', bg: 'linear-gradient(180deg,#0a4a8a,#021a3a)', edge: '#000', lcd: '#001020', txt: '#40e0ff', dim: '#0a3a5a', btn: 'linear-gradient(180deg,#2a7ac0,#0a3a7a)', btxt: '#e0f8ff', acc: '#40e0ff', bars: ['#40e0ff', '#80ffd0', '#fff'] },
  matrix: { name: 'Th3 M4tr1x', bg: '#000', edge: '#0f0', lcd: '#000', txt: '#0f0', dim: '#030', btn: '#020', btxt: '#0f0', acc: '#0f0', bars: ['#030', '#0a0', '#0f0'] },
  bongo: { name: 'Bongo Gold (Deluxe!)', bg: 'linear-gradient(180deg,#ffe066,#ff70b8)', edge: '#a0205a', lcd: '#5a0a34', txt: '#ffe066', dim: '#8a3a60', btn: 'linear-gradient(180deg,#fff4c0,#ffb0d8)', btxt: '#a0205a', acc: '#fff', bars: ['#ff70b8', '#ffe066', '#fff'] },
};
const ZAP = { w: null, idx: -1, shuffle: false, repeat: false, vis: 0, remain: false, raf: 0, scroll: 0, el: {} };
function zapList() { return (S.playlist || []).map((id) => S.files.find((f) => f.id === id)).filter((f) => f && f.dir !== 'recycle'); }
function openZapAmp() {
  if (ZAP.w && !ZAP.w.closed) { ZAP.w.restore(); ZAP.w.focus(); return ZAP.w; }
  const E = ZAP.el = {};
  const bt = (label, title, fn, wd = 26) => h('button', { class: 'zb', title, style: `width:${wd}px`, onclick: fn, html: label });
  E.time = h('div', { class: 'zt lcd', text: '0:00', title: 'Click to show time remaining', onclick: () => { ZAP.remain = !ZAP.remain; } });
  E.state = h('div', { class: 'zs', text: '■' });
  E.vis = h('canvas', { width: 152, height: 36, style: 'width:76px;height:18px;cursor:pointer', title: 'Click to change visualization', onclick: () => { ZAP.vis = (ZAP.vis + 1) % 3; if (ZAP.vis === 1) unlock('scope'); } });
  E.title = h('div', { class: 'zm lcd', text: 'ZapAmp 2.76' });
  E.info = h('div', { class: 'zi', html: '<b>---</b> kbps <b>--</b> kHz <span>stereo</span>' });
  E.seek = h('input', { type: 'range', min: 0, max: 1000, value: 0, class: 'zr' });
  E.seek.addEventListener('input', () => { E.seeking = true; });
  E.seek.addEventListener('change', () => { E.seeking = false; if (MP.song) MP.seek(E.seek.value / 1000 * MP.song.dur); });
  E.vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round(S.vol * 100), class: 'zr', style: 'width:68px', title: 'Volume' });
  E.vol.addEventListener('input', () => setVolume(E.vol.value / 100));
  E.shuf = bt('SHUF', 'Shuffle', () => { ZAP.shuffle = !ZAP.shuffle; zapPaint(); }, 38);
  E.rep = bt('REP', 'Repeat', () => { ZAP.repeat = !ZAP.repeat; zapPaint(); }, 32);
  E.pl = h('div', { class: 'zpl' });
  E.plwrap = h('div', { class: 'zplw' }, E.pl, h('div', { class: 'row', style: 'gap:3px;padding:3px' },
    bt('+ADD', 'Add songs from My Music', zapAddDialog, 42), bt('-REM', 'Remove selected', () => { if (ZAP.selId) { S.playlist = S.playlist.filter((id) => id !== ZAP.selId); save(); zapRenderList(); } }, 42), bt('CLR', 'Clear playlist', () => { S.playlist = []; save(); zapRenderList(); }, 34), h('div', { class: 'grow' }), bt('SKIN', 'Change skin', zapSkinMenu, 40)));
  const drag = h('div', { class: 'zh drag' }, h('span', { html: '⚡ ZAPAMP' }), h('div', { class: 'grow' }), h('button', { class: 'zx', text: '_', title: 'Minimize', onclick: () => ZAP.w.minimize() }), h('button', { class: 'zx', text: '×', title: 'Close', onclick: () => ZAP.w.close() }));
  const root = E.root = h('div', { class: 'zap' }, drag,
    h('div', { class: 'row', style: 'gap:6px;padding:4px 6px 2px;align-items:stretch' }, h('div', { class: 'zlcd', style: 'width:92px' }, h('div', { class: 'row', style: 'gap:4px' }, E.state, E.time), E.vis), h('div', { class: 'zlcd grow col', style: 'gap:3px;min-width:0' }, E.title, E.info)),
    h('div', { style: 'padding:0 6px' }, E.seek),
    h('div', { class: 'row', style: 'gap:2px;padding:3px 6px 6px' }, bt('⏮', 'Previous', () => zapStep(-1)), bt('▶', 'Play', zapPlay), bt('❚❚', 'Pause', zapPause), bt('■', 'Stop', zapStop), bt('⏭', 'Next', () => zapStep(1)), bt('⏏', 'Open file', zapAddDialog), h('div', { class: 'grow' }), E.vol),
    h('div', { class: 'row', style: 'gap:3px;padding:0 6px 5px' }, E.shuf, E.rep, h('div', { class: 'grow' }), h('span', { class: 'zi', text: 'it really zaps the yak\'s back' })), E.plwrap);
  if (!$('#zapcss')) document.head.append(h('style', { id: 'zapcss', text: `
    .zap { width: 300px; background: var(--za-bg); box-shadow: 0 0 0 1px var(--za-edge), 2px 3px 0 rgba(0,0,0,.35); color: var(--za-btxt); font: 10px/1.2 Arial, sans-serif; }
    .zap .zh { height: 15px; display: flex; align-items: center; gap: 2px; padding: 0 2px 0 6px; background: rgba(0,0,0,.25); color: var(--za-acc); font: bold 9px Arial; letter-spacing: 2px; touch-action: none; }
    .zap .zx { width: 13px; height: 11px; border: 0; padding: 0; font: bold 9px/9px Arial; background: var(--za-btn); color: var(--za-btxt); box-shadow: inset 0 0 0 1px rgba(0,0,0,.35); }
    .zap .zlcd { background: var(--za-lcd); box-shadow: inset 1px 1px 0 rgba(0,0,0,.6), inset -1px -1px 0 rgba(255,255,255,.18); padding: 3px 5px; }
    .zap .zt { color: var(--za-txt); font-size: 26px; line-height: 22px; text-shadow: 0 0 4px var(--za-txt); }
    .zap .zs { color: var(--za-txt); font-size: 11px; width: 10px; }
    .zap .zm { color: var(--za-txt); font-size: 17px; line-height: 16px; white-space: nowrap; overflow: hidden; }
    .zap .zi { color: var(--za-dim); font-size: 9px; white-space: nowrap; overflow: hidden; }
    .zap .zlcd .zi { color: var(--za-txt); opacity: .75; } .zap .zi b { font-weight: normal; color: var(--za-txt); }
    .zap .zb { height: 18px; border: 0; padding: 0; background: var(--za-btn); color: var(--za-btxt); font: bold 10px Arial; box-shadow: inset -1px -1px 0 rgba(0,0,0,.4), inset 1px 1px 0 rgba(255,255,255,.4); border-radius: 2px; }
    .zap .zb:active, .zap .zb.on { box-shadow: inset 1px 1px 0 rgba(0,0,0,.5); filter: brightness(.85); }
    .zap .zb.on { color: var(--za-acc); }
    .zap .zr { width: 100%; height: 10px; accent-color: var(--za-acc); margin: 0; }
    .zap .zplw { border-top: 1px solid var(--za-edge); }
    .zap .zpl { height: 120px; overflow-y: auto; background: var(--za-lcd); margin: 4px 4px 0; color: var(--za-txt); font: 11px/15px Arial; }
    .zap .zpl div { padding: 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; gap: 4px; }
    .zap .zpl div span:last-child { margin-left: auto; }
    .zap .zpl div.cur { color: #fff; } .zap .zpl div.sel { background: rgba(255,255,255,.18); }
  ` }));
  const w = ZAP.w = openWin({ key: 'zapamp', title: 'ZapAmp', icon: 'zapamp', bare: true, w: 300, body: root, x: Math.max(0, deskW() - 320), y: 20, onClose: () => { cancelAnimationFrame(ZAP.raf); MP.stop(); emit('music', 'stop'); } });
  makeDraggable(w, drag);
  zapApplySkin(); zapRenderList(); zapPaint();
  const loop = () => { ZAP.raf = requestAnimationFrame(loop); zapFrame(); };
  loop();
  return w;
}
function zapApplySkin(id = S.skin) {
  const k = SKINS[id] ? id : 'base'; const s = SKINS[k]; const r = ZAP.el.root; if (!r) return;
  const map = { bg: '--za-bg', edge: '--za-edge', lcd: '--za-lcd', txt: '--za-txt', dim: '--za-dim', btn: '--za-btn', btxt: '--za-btxt', acc: '--za-acc' };
  for (const key in map) r.style.setProperty(map[key], s[key]);
}
function zapSkinMenu() {
  const r = ZAP.el.root.getBoundingClientRect(), A = APP().getBoundingClientRect();
  const owned = Object.keys(SKINS).filter((k) => S.skins.includes(k) || (k === 'bongo' && S.bongo.adware.includes('bongoskin')));
  popMenu(owned.map((k) => ({ label: SKINS[k].name, radio: S.skin === k, act: () => { S.skin = k; save(); zapApplySkin(); if (k !== 'base') unlock('skin'); } })).concat([{ sep: 1 }, { label: 'Get more skins...', act: () => openBrowser('www.zapamp.com/skins/') }]), r.right - A.left - 160, r.bottom - A.top - 10);
}
function zapPaint() { if (!ZAP.el.shuf) return; ZAP.el.shuf.classList.toggle('on', ZAP.shuffle); ZAP.el.rep.classList.toggle('on', ZAP.repeat); }
function zapRenderList() {
  const pl = ZAP.el.pl; if (!pl) return;
  pl.textContent = '';
  const L = zapList();
  if (!L.length) pl.append(h('div', { style: 'opacity:.6', text: 'Playlist is empty. Download some songs with Snapster!' }));
  L.forEach((f, i) => {
    const d = h('div', { class: (i === ZAP.idx ? 'cur' : '') + (ZAP.selId === f.id ? ' sel' : '') }, h('span', { text: (i + 1) + '. ' + songLabel(f) }), h('span', { text: f.track ? fmtTime(songDur(f.track)) : '?:??' }));
    d.addEventListener('click', () => { ZAP.selId = f.id; zapRenderList(); });
    d.addEventListener('dblclick', () => zapPlayIdx(i));
    pl.append(d);
  });
}
function songLabel(f) { return displayName(f).replace(/^\d\d - /, ''); }
function zapAddDialog() {
  const all = filesIn('music').concat(filesIn('desktop'), filesIn('docs')).filter((f) => extOf(f.name) === 'mp3');
  if (!all.length) { msgBox({ title: 'ZapAmp', icon: 'info', text: 'There are no MP3 files in My Music yet.\n\nUse Snapster to download some!' }); return; }
  const lv = listView([{ label: 'File', w: 300 }, { label: 'Size', w: 70 }], { onOpen: (r) => { zapQueue([r.f], true); w.close(); } });
  lv.set(all.map((f) => ({ f, cells: [h('span', null, img(fileIcon(f), 16), displayName(f)), fmtSize(f.size)] })));
  const w = openWin({ title: 'Add File(s) to Playlist', icon: 'zapamp', w: 420, h: 300, small: true, body: h('div', { class: 'col grow pad', style: 'min-height:0' }, lv, h('div', { class: 'btns' }, h('button', { class: 'btn def', text: 'Add', onclick: () => { const r = lv.selected(); if (r) zapQueue([r.f], !MP.playing); w.close(); } }), h('button', { class: 'btn', text: 'Add All', onclick: () => { zapQueue(all, !MP.playing); w.close(); } }), h('button', { class: 'btn', text: 'Cancel', onclick: () => w.close() }))) });
}
function zapQueue(files, playFirst) {
  openZapAmp();
  S.playlist = S.playlist || [];
  for (const f of files) if (!S.playlist.includes(f.id)) S.playlist.push(f.id);
  save(); zapRenderList();
  if (playFirst) zapPlayIdx(zapList().findIndex((f) => f.id === files[0].id));
}
function zapPlayFile(f) { zapQueue([f], true); }
function zapPlayIdx(i) {
  const L = zapList(); const f = L[i]; if (!f) return;
  ZAP.idx = i; zapRenderList();
  if (!f.track) {
    zapStop();
    if (f.payload) { msgBox({ title: 'ZapAmp', icon: 'warn', text: `ZapAmp can't play "${displayName(f)}". It doesn't look like an MP3.\n\nRun it anyway?`, buttons: ['Run', 'Cancel'], def: 1 }).then((b) => b === 'Run' && runFile(f)); return; }
    msgBox({ title: 'ZapAmp', icon: 'error', text: `Error: "${f.name}" is not a valid MP3 file. It may be damaged.` }); return;
  }
  MP.load(f.track); MP.onEnd = zapEnded; MP.play();
  ZAP.scroll = 0; ZAP.cur = f;
  const t = f.track;
  ZAP.el.title.textContent = (i + 1) + '. ' + songLabel(f) + ' (' + fmtTime(MP.song.dur) + ')  ***  ';
  ZAP.el.info.innerHTML = `<b>${t.kbps}</b> kbps <b>${t.kbps <= 64 ? 22 : 44}</b> kHz <span>${t.kbps <= 64 ? 'mono' : 'stereo'}</span>`;
  stat('plays'); unlock('play1'); emit('music', 'play');
  if (t.kbps <= 64) unlock('lowbit');
  if (t.kind === 'talk') { after(0.4, () => SPEECH.say(pick(['Hi. This is not the song you were looking for. Please buy the CD.', 'You have downloaded a fake file. Your computer has been logged. Just kidding. Or am I?', 'Hey, this is Dave. This is not a song. This is my answering machine. Leave a message.']), { voice: 'system', rate: 0.95 })); after(4, () => unlock('fake')); }
  if (t.kind === 'silence') after(10, () => { if (ZAP.cur === f && MP.playing) unlock('fake'); });
  if (t.kind === 'wrong') after(6, () => { if (ZAP.cur === f && MP.playing) { unlock('wrongsong'); if (S.bongo.installed && BONGO.shown) bongoSay('Hmm, that doesn\'t sound like ' + t.artist + ' to me.', { emote: 'think' }); } });
  if (t.kind === 'live') unlock('live');
}
function zapEnded() {
  const f = ZAP.cur;
  if (f && f.track && f.track.kind === 'incomplete') { unlock('incomplete'); ZAP.el.title.textContent = 'ERROR: unexpected end of file  ***  '; }
  emit('music', 'stop');
  const L = zapList();
  if (!L.length) return;
  if (ZAP.repeat || ZAP.idx < L.length - 1 || ZAP.shuffle) zapStep(1, true);
}
function zapStep(d, auto) {
  const L = zapList(); if (!L.length) return;
  let i = ZAP.shuffle ? (L.length > 1 ? (ZAP.idx + irnd(1, L.length - 1)) % L.length : 0) : ZAP.idx + d;
  if (i >= L.length) { if (!ZAP.repeat && auto) return; i = 0; } if (i < 0) i = L.length - 1;
  zapPlayIdx(i);
}
function zapPlay() { if (MP.song && !MP.playing) { MP.play(); emit('music', 'play'); } else if (!MP.song) { const L = zapList(); if (L.length) zapPlayIdx(Math.max(0, ZAP.idx)); else zapAddDialog(); } }
function zapPause() { if (MP.playing) { MP.pause(); emit('music', 'pause'); } else if (MP.song) zapPlay(); }
function zapStop() { MP.stop(); emit('music', 'stop'); }
const _fd = new Uint8Array(512), _td = new Uint8Array(1024);
function zapFrame() {
  const E = ZAP.el; if (!E.time || !ZAP.w || ZAP.w.min) return;
  const pos = MP.pos(), dur = MP.song ? MP.song.dur : 0;
  E.time.textContent = (ZAP.remain && dur ? '-' : '') + fmtTime(ZAP.remain && dur ? dur - pos : pos);
  E.state.textContent = MP.playing ? '▶' : MP.song && pos > 0 ? '❚❚' : '■';
  if (!E.seeking && dur) E.seek.value = Math.round(pos / dur * 1000);
  if (MP.playing && (ZAP.scroll += 1) % 9 === 0) { const t = E.title.textContent; E.title.textContent = t.slice(1) + t[0]; }
  const c = E.vis, x = c.getContext('2d'), W = c.width, H = c.height, sk = SKINS[S.skin] || SKINS.base;
  x.clearRect(0, 0, W, H);
  if (ZAP.vis === 2) return;
  const live = MP.playing && AU.analyser;
  if (ZAP.vis === 0) {
    if (live) AU.analyser.getByteFrequencyData(_fd);
    const n = 19, bw = W / n;
    for (let i = 0; i < n; i++) {
      const v = live ? _fd[Math.floor(Math.pow(i / n, 1.6) * 180) + 1] / 255 : 0;
      const bh = Math.max(1, Math.round(v * H / 3) * 3);
      for (let y = 0; y < bh; y += 3) { x.fillStyle = sk.bars[y < H * 0.5 ? 0 : y < H * 0.8 ? 1 : 2]; x.fillRect(i * bw + 1, H - y - 2, bw - 2, 2); }
    }
  } else {
    if (live) AU.analyser.getByteTimeDomainData(_td); x.strokeStyle = sk.txt; x.lineWidth = 2; x.beginPath();
    for (let i = 0; i < W; i++) { const v = live ? _td[Math.floor(i / W * 1024)] / 128 - 1 : 0; x.lineTo(i, H / 2 + v * H * 0.45); }
    x.stroke();
  }
}
