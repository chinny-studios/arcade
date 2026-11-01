// Snapster: search other people's MP3s, download them over your 56K line (sharing it with whoever is uploading from
// you), and keep a library. Transfers run on game time; SPEEDUP squeezes a 15-minute 2001 download into a minute.
const SNAP = { w: null, results: [], xfers: [], ups: [], tab: 0, users: 9382, noUploads: false, searching: false };
const MYCAP = 4.6, SPEEDUP = 14;
function openSnapster() {
  if (SNAP.w && !SNAP.w.closed) { SNAP.w.restore(); SNAP.w.focus(); return SNAP.w; }
  const page = h('div', { class: 'col grow', style: 'min-height:0;gap:6px;padding:6px' });
  const tabBtns = ['Search', 'Transfer', 'Library', 'Help'].map((t, i) => h('button', { class: 'btn', style: 'min-width:64px;height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:10px', onclick: () => snapTab(i) }, img(['find', 'modem', 'music', 'help'][i], 16), t));
  const head = h('div', { style: 'display:flex;align-items:center;gap:8px;padding:4px 6px;background:linear-gradient(180deg,#2a2a2a,#000);flex:none' }, img('snapster', 32),
    h('div', { style: 'color:#fff;font:bold italic 22px Arial;letter-spacing:-.5px;margin-right:auto', html: 'snap<span style="color:#9be05a">ster</span><span style="font-size:10px;color:#aaa;font-style:normal;margin-left:6px">beta 10</span>' }), tabBtns);
  const w = SNAP.w = openWin({ key: 'snapster', title: 'Snapster', icon: 'snapster', w: 680, h: 470, minW: 480, minH: 300, body: h('div', { class: 'col grow', style: 'gap:0;min-height:0' }, head, page), status: ['', { text: '', style: 'width:200px' }],
    menu: [{ label: 'File', items: [{ label: 'Close', act: () => w.close() }] }, { label: 'Actions', items: () => [{ label: 'Clear Finished Transfers', act: clearFinished }, { label: (SNAP.noUploads ? '\u2713 ' : '') + 'Block uploads (be a leech)', act: () => { SNAP.noUploads = !SNAP.noUploads; if (SNAP.noUploads) { SNAP.ups = []; unlock('leech'); } snapRender(); } }] }, { label: 'Help', items: [{ label: 'Downloading music', act: () => openHelp(2) }] }] });
  w.page = page; w.tabBtns = tabBtns;
  snapTab(SNAP.tab);
  if (!netOn()) needNet('Snapster');
  return w;
}
function snapTab(i) { SNAP.tab = i; if (!SNAP.w || SNAP.w.closed) return; SNAP.w.tabBtns.forEach((b, j) => b.classList.toggle('down', i === j)); snapRender(true); }
function snapStatus() {
  if (!SNAP.w || SNAP.w.closed) return;
  const n = filesIn('music').filter((f) => extOf(f.name) === 'mp3').length;
  SNAP.w.setStatus(0, netOn() ? `Online (${S.sn}): sharing ${n} songs. Currently ${fmtBytes(SNAP.users)} users (${fmtBytes(SNAP.users * 278)} songs in ${fmtBytes(Math.round(SNAP.users * 1.19))} gigabytes) available.` : 'Not connected. Sign on with AmeriNet to search.');
  const act = SNAP.xfers.filter((x) => x.state === 'xfer').length;
  SNAP.w.setStatus(1, `Downloads: ${act}  Uploads: ${SNAP.ups.length}`);
}
function connDot(c) { const sp = (CONNS.find((x) => x[0] === c) || CONNS[3])[1]; return h('span', null, h('span', { style: `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;background:${sp >= 25 ? '#20c020' : sp >= 4 ? '#e0c000' : '#e02020'};box-shadow:inset -1px -1px rgba(0,0,0,.4)` }), c); }
function snapRender(full) {
  const w = SNAP.w; if (!w || w.closed) return;
  snapStatus();
  const p = w.page;
  if (SNAP.tab === 0) {
    if (!full && p._kind === 'search') { renderResults(); return; }
    p.textContent = ''; p._kind = 'search';
    const ar = h('input', { type: 'text', value: SNAP.qa || '', placeholder: '', style: 'width:150px' }), ti = h('input', { type: 'text', value: SNAP.qt || '', style: 'width:150px' });
    const minKb = h('select', null, ['any', 64, 128, 192].map((k) => h('option', { value: k, selected: String(SNAP.minKb || 'any') === String(k), text: k === 'any' ? 'any bitrate' : 'at least ' + k + ' kbps' })));
    const go = h('button', { class: 'btn def', text: 'Find It!', onclick: () => doSearch() });
    const doSearch = async () => {
      SNAP.qa = ar.value; SNAP.qt = ti.value; SNAP.minKb = minKb.value;
      if (!netOn()) { needNet('Snapster'); return; }
      if (!ar.value.trim() && !ti.value.trim()) { msgBox({ title: 'Snapster', icon: 'info', text: 'Type an artist or a song title to search for.' }); return; }
      go.disabled = true; SNAP.results = []; SNAP.label = 'Searching...'; renderResults();
      await sleep(rnd(0.8, 2.2));
      go.disabled = false;
      const r = snapSearch(ar.value, ti.value);
      const mk = minKb.value === 'any' ? 0 : +minKb.value;
      SNAP.results = r.results.filter((x) => x.kbps >= mk);
      SNAP.label = r.blocked ? 'Some results were blocked at the request of the artist. (Sorry, Metallicuh fans.)' : SNAP.results.length + ' results returned';
      stat('searches'); if (r.blocked) unlock('blocked');
      renderResults();
    };
    [ar, ti].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); }));
    const get = h('button', { class: 'btn', text: 'Get Selected Song', onclick: () => { const r = p._lv.selected(); if (r) startDownload(r.r); } });
    const lv = p._lv = listView([{ label: 'Filename', w: 250 }, { label: 'Filesize', w: 70 }, { label: 'Bitrate', w: 50 }, { label: 'Freq', w: 50 }, { label: 'Length', w: 48 }, { label: 'User', w: 110 }, { label: 'Connection', w: 76 }, { label: 'Ping', w: 44 }],
      { onOpen: (r) => startDownload(r.r), tapOpen: false, ctx: (r) => [{ label: '<b>Get Selected Song</b>', act: () => startDownload(r.r) }, { label: 'Browse files of ' + esc(r.r.user), act: () => browseUser(r.r.user) }] });
    p.append(h('div', { class: 'row', style: 'flex-wrap:wrap' }, 'Artist:', ar, 'Title:', ti, minKb, go), p._lbl = h('div', { class: 'dim' }), lv, h('div', { class: 'row' }, h('div', { class: 'grow dim', text: 'Double-click a song to download it. Green = fast peer.' }), get));
    renderResults();
  } else if (SNAP.tab === 1) {
    p.textContent = ''; p._kind = 'xfer';
    p._dl = listView([{ label: 'Filename', w: 230 }, { label: 'User', w: 100 }, { label: 'State', w: 120 }, { label: 'Progress', w: 110 }, { label: 'Rate', w: 60 }, { label: 'Time left', w: 60 }], { onOpen: (r) => r.x.state === 'done' && r.x.file && openFile(r.x.file) });
    p._ul = listView([{ label: 'Filename', w: 230 }, { label: 'User', w: 110 }, { label: 'State', w: 100 }, { label: 'Progress', w: 120 }]);
    const btns = h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Cancel', onclick: () => { const r = p._dl.selected(); if (r && !/done|fail/.test(r.x.state)) { r.x.state = 'fail'; r.x.msg = 'Cancelled'; snapRender(); } } }),
      h('button', { class: 'btn', text: 'Retry', onclick: () => { const r = p._dl.selected(); if (r && r.x.state === 'fail') { r.x.state = 'info'; r.x.wait = rnd(1, 3); r.x.got = 0; snapRender(); } } }),
      h('button', { class: 'btn', text: 'Play', onclick: () => { const r = p._dl.selected(); if (r && r.x.file) openFile(r.x.file); } }), h('div', { class: 'grow' }), h('button', { class: 'btn', text: 'Clear Finished', onclick: clearFinished }));
    p.append(h('b', { text: 'Downloads' }), h('div', { style: 'flex:1.4;display:flex;min-height:60px' }, p._dl), btns, h('b', { text: 'Uploads (people downloading from you)' }), h('div', { style: 'flex:1;display:flex;min-height:50px' }, p._ul));
    renderXfers();
  } else if (SNAP.tab === 2) {
    p.textContent = ''; p._kind = 'lib';
    const lv = listView([{ label: 'Song', w: 300 }, { label: 'Size', w: 70 }, { label: 'Bitrate', w: 60 }, { label: 'From', w: 120 }], { onOpen: (r) => openFile(r.f), ctx: (r) => [{ label: '<b>Play</b>', act: () => openFile(r.f) }, { label: 'Delete', act: () => deleteFile(r.f) }, { label: 'Properties', act: () => fileProps(r.f) }] });
    const fill = () => lv.set(filesIn('music').map((f) => ({ f, cells: [h('span', null, img(fileIcon(f), 16), displayName(f)), fmtSize(f.size), f.track ? f.track.kbps + ' kbps' : '-', f.fromUser || ''] })));
    fill(); p._fill = fill;
    p.append(h('div', { class: 'row' }, img('music', 16), h('b', { text: 'C:\\My Documents\\My Music' })), lv, h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Play All in ZapAmp', onclick: () => { const fs = filesIn('music').filter((f) => extOf(f.name) === 'mp3' && f.track); if (fs.length) { zapQueue(fs, true); } } }), h('button', { class: 'btn', text: 'Open Folder', onclick: () => openExplorer('music') })));
  } else {
    p.textContent = ''; p._kind = 'help';
    p.append(h('div', { class: 'field sel-text', style: 'flex:1;overflow:auto;padding:10px;font-size:12px;line-height:1.5', html: '<b>Welcome to Snapster!</b><br><br>1. Make sure you\'re signed on to AmeriNet.<br>2. On the <b>Search</b> page, type an artist or song and click <b>Find It!</b><br>3. Double-click a result to download it. Watch it on the <b>Transfer</b> page.<br>4. Finished songs are in your <b>Library</b> and in My Documents\\My Music.<br><br>Tips:<br>• Peers on Cable, DSL and T1 are faster. Peers on 14.4 are... patient.<br>• While people download from you, your own downloads slow down.<br>• A song that\'s 300 KB isn\'t really a song.<br>• A song that ends in <b>.exe</b> definitely isn\'t a song.<br>• Someone always names everything after the wrong band.<br><br><i>Snapster: the future of music, probably.</i>' }));
  }
}
function renderResults() {
  const p = SNAP.w && SNAP.w.page; if (!p || !p._lv) return;
  p._lbl.textContent = SNAP.label || '';
  p._lv.set(SNAP.results.map((r) => ({ r, cells: [h('span', null, img(r.payload ? 'exe' : 'mp3', 16), r.name), fmtBytes(r.size), String(r.kbps), String(r.khz), fmtTime(r.dur), r.user, connDot(r.conn), String(r.ping)] })));
}
function renderXfers() {
  const p = SNAP.w && SNAP.w.page; if (!p || p._kind !== 'xfer') return;
  const sel = p._dl.sel;
  const ST = { info: 'Getting info...', queued: 'Remotely queued', xfer: 'Transferring', done: 'Complete', fail: '' };
  p._dl.set(SNAP.xfers.map((x) => {
    const pct = Math.floor(x.got / x.r.size * 100);
    const bar = h('div', { class: 'bar', style: 'width:96px' }, h('i', { style: 'width:' + pct + '%' }));
    const left = x.state === 'xfer' && x.rate > 0 ? fmtTime((x.r.size - x.got) / (x.rate * 1024 * SPEEDUP)) : '';
    return { x, cells: [x.r.name, x.r.user, h('span', { style: x.state === 'fail' ? 'color:#c00' : x.state === 'done' ? 'color:#060' : '', text: x.state === 'fail' ? x.msg : ST[x.state] }), x.state === 'done' ? '100%' : bar, x.state === 'xfer' ? x.rate.toFixed(1) + ' K/s' : '', left] };
  }));
  if (sel >= 0) p._dl.select(sel);
  p._ul.set(SNAP.ups.map((u) => ({ cells: [u.f.name, u.user, 'Transferring', h('div', { class: 'bar', style: 'width:100px' }, h('i', { style: 'width:' + Math.floor(u.p * 100) + '%' }))] })));
}
function clearFinished() { SNAP.xfers = SNAP.xfers.filter((x) => !/done|fail/.test(x.state)); snapRender(); }
function startDownload(r) {
  if (!netOn()) { needNet('Snapster'); return; }
  if (SNAP.xfers.some((x) => x.r.id === r.id && x.state !== 'fail')) { snapTab(1); return; }
  SNAP.xfers.push({ id: uid('x'), r, state: 'info', wait: rnd(1, 3), got: 0, rate: 0 });
  SFX.click(); stat('dlstarted');
  snapTab(1);
}
function browseUser(user) {
  if (!netOn()) return;
  const R = mulberry(hash32(user));
  const n = 6 + Math.floor(R() * 12);
  const res = [];
  for (let i = 0; i < n; i++) {
    const s = SONGS[Math.floor(R() * SONGS.length)]; if (BLOCKED.includes(s.id)) continue;
    const kbps = [96, 128, 128, 160, 192][Math.floor(R() * 5)];
    const track = { songId: s.id, artist: s.artist, title: s.title, genre: s.genre, version: '', kind: 'song', kbps };
    const dur = songDur(track);
    res.push({ id: uid('r'), name: fileNameFor(s, '', R), size: Math.round(dur * kbps * 125), kbps, khz: 44100, dur, user, conn: SNAP.results.find((x) => x.user === user)?.conn || '56K', speed: (CONNS.find((c) => c[0] === (SNAP.results.find((x) => x.user === user)?.conn || '56K')) || CONNS[3])[1], ping: irnd(60, 400), track });
  }
  SNAP.results = res; SNAP.label = `Files shared by ${user} (${res.length})`; unlock('browse');
  snapTab(0);
}
// the transfer engine
onTick((dt) => {
  if (!SNAP.xfers.length && !SNAP.ups.length) return;
  const on = netOn();
  let changed = false;
  const active = SNAP.xfers.filter((x) => x.state === 'xfer');
  const upShare = SNAP.ups.length ? Math.min(0.5, 0.22 * SNAP.ups.length) : 0;
  const cap = MYCAP * (1 - upShare);
  for (const x of SNAP.xfers) {
    if (/done|fail/.test(x.state)) continue;
    if (!on) { x.state = 'fail'; x.msg = 'Interrupted (offline)'; changed = true; continue; }
    if (x.state === 'info' || x.state === 'queued') {
      x.wait -= dt;
      if (x.wait <= 0) { if (x.state === 'info' && chance(0.15)) { x.state = 'queued'; x.wait = rnd(8, 30); } else if (x.state === 'info' && chance(0.06)) { x.state = 'fail'; x.msg = 'Remote user is offline'; } else x.state = 'xfer'; changed = true; }
      continue;
    }
    // transferring
    const share = cap / Math.max(1, active.length);
    x.rate = Math.max(0.3, Math.min(share, x.r.speed) * rnd(0.85, 1.1));
    x.got += x.rate * 1024 * SPEEDUP * dt;
    if (chance(0.0022 * dt * 60 / 60)) { x.state = 'fail'; x.msg = pick(['Cancelled by remote user', 'Connection reset by peer', 'Remote user went offline']); changed = true; stat('dlfailed'); continue; }
    if (x.got >= x.r.size) { x.got = x.r.size; x.state = 'done'; finishDownload(x); changed = true; }
  }
  for (const u of SNAP.ups) u.p += dt / u.len;
  const before = SNAP.ups.length;
  SNAP.ups = SNAP.ups.filter((u) => u.p < 1 && on);
  if (SNAP.ups.length !== before) changed = true;
  if (T.frame % 6 === 0 || changed) renderXfers();
  if (changed) snapStatus();
});
every(8, () => {
  // other people download from you
  if (!netOn() || SNAP.noUploads || SNAP.ups.length >= 2) return;
  const mine = filesIn('music').filter((f) => extOf(f.name) === 'mp3');
  if (mine.length < 2 || !chance(0.35)) return;
  SNAP.ups.push({ f: pick(mine), user: peerName(), p: 0, len: rnd(30, 80) });
  stat('uploads'); if (S.stats.uploads >= 5) unlock('sharer');
  renderXfers(); snapStatus();
}, 3);
every(15, () => { SNAP.users = clamp(SNAP.users + irnd(-120, 140), 7000, 14000); snapStatus(); });
function finishDownload(x) {
  const r = x.r;
  const f = addFile({ name: r.name, dir: 'music', size: r.size, track: r.payload ? null : r.track, payload: r.payload, fromUser: r.user });
  x.file = f;
  stat('downloads'); SFX.ding();
  emit('download', f);
  const n = S.stats.downloads;
  unlock('dl1'); if (n >= 10) unlock('dl10'); if (n >= 25) unlock('dl25');
  if (r.track && r.track.kbps >= 320) unlock('hifi');
}
