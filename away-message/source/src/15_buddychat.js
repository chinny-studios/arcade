// BuddyChat: sign-on, the buddy list, IM windows with scripted buddies, profiles, away messages, warnings, file
// sends and chat rooms.
const BC = { on: false, w: null, since: 0, ims: {}, rooms: {}, st: {}, warn: 0, busy: {}, quest: {}, done: {}, away: null, lastStart: -99, iblocked: {} };
const AWAY_PRESETS = ['~*~ at the mall ~*~', 'brb shower', 'sleeping... or am i?', 'eating dinner. IM me and ill get back 2 u', 'out with friends. leave a msg!!', '<i>"and i wonder if u know... how it really feels..."</i> ~*~', 'not here. obviously.'];
function bcRow(sn) { return BC.st[sn] || (BC.st[sn] = { state: 'off', since: 0, away: '', awayUntil: 0 }); }
function bcLink(t) { return esc(t).replace(/(www\.[a-z0-9.\-/]+)/gi, '<a data-href="$1">$1</a>').replace(/:\)|:-\)/g, `<img src="${icon('smiley', 16)}" style="vertical-align:-4px;width:15px">`); }

// ---- sign on / off ----
function openBuddyChat() {
  if (BC.on) { const w = buddyList(); w.restore(); w.focus(); return; }
  if (!netOn()) { needNet('BuddyChat'); return; }
  const sn = h('input', { type: 'text', value: S.sn, readonly: true, class: 'grow' });
  const status = h('div', { class: 'dim', style: 'height:14px;text-align:center' });
  const go = h('button', { class: 'btn def', style: 'width:100%;height:30px;font-weight:bold', text: 'Sign On' });
  const body = h('div', { class: 'col grow', style: 'gap:0' },
    h('div', { style: 'background:linear-gradient(180deg,#ffe866,#ffb000);padding:16px 10px;text-align:center;flex:none' }, h('img', { src: icon('buddy', 32), style: 'width:64px;height:64px' }), h('div', { style: 'font:bold italic 22px Arial;color:#003a8a', html: 'Buddy<span style="color:#fff;text-shadow:1px 1px #0a3a8a">Chat</span>' }), h('div', { style: 'font-size:10px;color:#6a4a00', text: 'by AmeriNet • version 4.7' })),
    h('div', { class: 'pad col' }, h('div', { class: 'row' }, 'Screen Name', sn), h('div', { class: 'row' }, 'Password', h('input', { type: 'password', value: 'hunter22', class: 'grow' })), h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: true }), 'Save password'), status, go));
  const w = openWin({ key: 'bcsignon', title: 'Sign On', icon: 'buddy', w: 230, body, resizable: false, small: true });
  go.onclick = async () => {
    if (!netOn()) { needNet('BuddyChat'); return; }
    go.disabled = true;
    for (const s of ['Connecting...', 'Verifying screen name...', 'Starting services...']) { status.textContent = s; await sleep(0.7); }
    w.close(); bcSignOn();
  };
}
function bcSignOn() {
  if (BC.on || !netOn()) return;
  BC.on = true; BC.since = T.t;
  SFX.doorOpen(); unlock('buddy'); stat('bcsignons');
  traySet('buddy', { icon: 'buddy', title: 'BuddyChat: ' + S.sn, dbl: () => buddyList().focus(), ctx: () => [{ label: 'Open Buddy List', act: () => buddyList().focus() }, { label: 'Sign Off', act: () => bcSignOff() }] });
  for (const b of BUDDIES) { const r = bcRow(b.sn); r.state = 'off'; r.away = ''; }
  buddyList();
  emit('bc', 'on');
}
function bcSignOff(why) {
  if (!BC.on) return;
  BC.on = false;
  SFX.doorClose();
  trayRemove('buddy');
  for (const sn in BC.ims) { const w = BC.ims[sn]; if (w && !w.closed) imSys(w, 'You are no longer signed on.'); }
  for (const r in BC.rooms) { const w = BC.rooms[r]; if (w && !w.closed) w.close(true); }
  if (BC.w && !BC.w.closed) BC.w.close(true);
  if (BC.awayW && !BC.awayW.closed) BC.awayW.close(true);
  emit('bc', 'off');
  if (why === 'net') msgBox({ title: 'BuddyChat', icon: 'error', text: 'You have been disconnected from BuddyChat.\n\nThe connection to the server was lost.', task: true });
}
on('disconnect', () => bcSignOff('net'));

// ---- buddy list ----
function buddyList() {
  if (BC.w && !BC.w.closed) return BC.w;
  const tree = h('div', { class: 'lv', style: 'padding:3px' });
  const warnEl = h('div', { class: 'dim' });
  const btn = (ic, t, fn) => h('button', { class: 'btn', style: 'min-width:0;flex:1;height:38px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0', onclick: fn }, img(ic, 16), t);
  const selSn = () => tree._sel;
  const body = h('div', { class: 'col grow', style: 'gap:4px;padding:4px;min-height:0' },
    h('div', { style: 'background:linear-gradient(180deg,#ffe866,#ffb000);padding:6px;display:flex;align-items:center;gap:8px;box-shadow:var(--in)' }, img('buddy', 32), h('div', null, h('div', { style: 'font:bold italic 15px Arial;color:#003a8a', text: 'BuddyChat' }), h('div', { style: 'font-weight:bold', text: S.sn }))),
    tree, warnEl,
    h('div', { class: 'row', style: 'gap:2px' }, btn('chat', 'IM', () => openIM(selSn() || BUDDIES[0].sn)), btn('network', 'Chat', chooseRoom), btn('info', 'Info', () => selSn() && buddyInfo(selSn())), btn('away', 'Away', awayDialog), btn('star', 'Board', openAwayBoard)));
  const w = BC.w = openWin({ key: 'buddylist', title: S.sn + '\'s Buddy List', icon: 'buddy', w: 210, h: 470, minW: 170, x: deskW() - 230, y: 10, body,
    menu: [{ label: 'My BuddyChat', items: () => [{ label: 'Edit Profile...', act: editProfile }, { label: 'Fill Out Survey...', act: openSurvey }, { label: 'Away Message...', act: awayDialog }, { label: 'Away Message Board', act: openAwayBoard }, { sep: 1 }, { label: 'Warning Level: ' + Math.round(BC.warn) + '%', dis: 1 }, { sep: 1 }, { label: 'Sign Off', act: () => bcSignOff() }] },
      { label: 'People', items: () => [{ label: 'Send Instant Message', act: () => sendIMTo() }, { label: 'Get Member Info', act: () => selSn() && buddyInfo(selSn()) }, { label: 'Join a Chat Room...', act: chooseRoom }] },
      { label: 'Help', items: [{ label: 'BuddyChat Help', act: () => openHelp(3) }] }],
    onClose: () => { if (BC.on) { msgBox({ title: 'BuddyChat', icon: 'question', text: 'Closing the Buddy List signs you off BuddyChat. Sign off?', buttons: ['Sign Off', 'Cancel'] }).then((b) => b === 'Sign Off' && bcSignOff()); return false; } } });
  w.render = () => {
    tree.textContent = '';
    const groups = { Buddies: [], Family: [], 'Co-Workers': [] }, off = [];
    for (const b of BUDDIES) { const r = bcRow(b.sn); if (r.state === 'off' || S.blocked[b.sn]) off.push(b); else groups[b.group].push(b); }
    const total = (g) => BUDDIES.filter((b) => b.group === g).length;
    const row = (b, offline) => {
      const r = bcRow(b.sn);
      const el = h('div', { style: `padding:1px 2px 1px 18px;display:flex;gap:4px;align-items:center;${offline ? 'color:#808080;' : ''}${tree._sel === b.sn ? 'background:var(--sel);color:#fff;' : ''}${r.fresh > T.t ? 'font-weight:bold;' : ''}` }, r.away && !offline ? img('away', 16) : null, b.sn, r.idle && !offline ? h('span', { class: 'dim', text: '(idle)' }) : null);
      el.addEventListener('pointerdown', () => { tree._sel = b.sn; w.render(); });
      el.addEventListener('dblclick', () => openIM(b.sn));
      el.addEventListener('click', (e) => { if (e.pointerType === 'touch') openIM(b.sn); });
      ctxMenu(el, [{ label: '<b>Send Instant Message</b>', act: () => openIM(b.sn) }, { label: 'Get Info', act: () => buddyInfo(b.sn) }]);
      return el;
    };
    for (const g in groups) { tree.append(h('div', { style: 'font-weight:bold;padding:2px', text: `▾ ${g} (${groups[g].length}/${total(g)})` })); groups[g].forEach((b) => tree.append(row(b))); }
    tree.append(h('div', { style: 'font-weight:bold;padding:2px;color:#808080', text: `▾ Offline (${off.length}/${BUDDIES.length})` })); off.forEach((b) => tree.append(row(b, true)));
    warnEl.textContent = 'Warning level: ' + Math.round(BC.warn) + '%' + (BC.away ? ' • Away' : '');
  };
  w.render();
  return w;
}
function bcRender() { if (BC.w && !BC.w.closed) BC.w.render(); }
async function sendIMTo() { const v = await inputBox({ title: 'Send Instant Message', icon: 'chat', text: 'To (screen name):' }); if (v) openIM(v.trim()); }
function buddyInfo(sn) {
  const b = BUDDY(sn), r = b ? bcRow(b.sn) : null;
  const pr = b ? b.profile.replace(/\{sn\}/g, esc(S.sn)) : 'No profile.';
  const body = h('div', { class: 'col grow pad', style: 'min-height:0' }, h('div', { class: 'row' }, img('user', 32), h('b', { style: 'font-size:13px', text: sn })), h('div', { class: 'dim', text: r && r.state !== 'off' && !S.blocked[sn] ? 'Online for ' + fmtTime(T.t - r.since) + (r.away ? ' • Away' : '') : 'Offline' }),
    r && r.away ? h('div', { class: 'field', style: 'background:#ffffe0', html: '<b>Away message:</b><br>' + r.away }) : null,
    h('div', { class: 'field sel-text', style: 'flex:1;overflow:auto;font:12px Arial', html: pr }));
  openWin({ key: 'info:' + sn, title: 'Buddy Info: ' + sn, icon: 'info', w: 300, h: 300, body, small: true });
  unlock('info');
}

// ---- IM windows ----
function openIM(sn, quiet) {
  const b = BUDDY(sn); if (b) sn = b.sn;
  const ex = BC.ims[sn];
  if (ex && !ex.closed) { if (!quiet) { ex.restore(); ex.focus(); } else ex.flash(); return ex; }
  const log = h('div', { class: 'field sel-text', style: 'flex:1;min-height:60px;overflow:auto;font:13px Arial,sans-serif;line-height:1.35' });
  const chips = h('div', { class: 'row', style: 'flex-wrap:wrap;gap:3px;min-height:0' });
  const inp = h('textarea', { class: 'field', style: 'height:46px;font:13px Arial' });
  const fmt = (t) => h('button', { class: 'btn sm', style: 'min-width:22px', html: t, onclick: () => { inp.value += t === '<b>B</b>' ? '' : t === ':)' ? ' :)' : ''; inp.focus(); } });
  const send = () => { const v = inp.value.trim(); if (!v) return; inp.value = ''; imSend(sn, v); };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const btn = (ic, t, fn) => h('button', { class: 'btn', style: 'min-width:0;padding:0 6px;display:flex;align-items:center;gap:3px', onclick: fn }, img(ic, 16), t);
  const body = h('div', { class: 'col grow pad', style: 'min-height:0;gap:4px' }, log, chips, h('div', { class: 'row', style: 'gap:2px' }, fmt('<b>B</b>'), fmt('<i>I</i>'), fmt('<u>U</u>'), fmt(':)')), inp,
    h('div', { class: 'row', style: 'gap:3px' }, btn('warnlvl', 'Warn', () => imWarn(sn)), btn('block', 'Block', () => imBlock(sn)), btn('mp3', 'Send File', () => imSendFile(sn)), btn('info', 'Info', () => buddyInfo(sn)), h('div', { class: 'grow' }), h('button', { class: 'btn def', text: 'Send', onclick: send })));
  const w = openWin({ title: sn + ' - Instant Message', icon: 'chat', w: 380, h: 330, minW: 260, body, x: 160 + irnd(0, 140), y: 30 + irnd(0, 120), onFocus: () => setTimeout(() => inp.focus(), 0) });
  w.log = log; w.chips = chips; w.sn = sn; w.inp = inp;
  log.addEventListener('click', (e) => { const a = e.target.closest('[data-href]'); if (a) openBrowser(a.dataset.href); });
  BC.ims[sn] = w;
  if (!quiet) setTimeout(() => inp.focus(), 50);
  return w;
}
function imLine(w, who, text, mine) {
  if (!w || w.closed) return;
  const c = mine ? '#0000ff' : (BUDDY(who) || {}).color || '#ff0000';
  w.log.append(h('div', { html: `<b style="color:${c}">${esc(who)}</b>: ${bcLink(text)}` }));
  w.log.scrollTop = w.log.scrollHeight;
}
function imSys(w, text) { if (!w || w.closed) return; w.log.append(h('div', { style: 'color:#808080;font-style:italic', html: esc(text) })); w.log.scrollTop = w.log.scrollHeight; }
function imChips(w, opts, fn) {
  if (!w || w.closed) return;
  w.chips.textContent = '';
  for (const o of opts || []) w.chips.append(h('button', { class: 'btn sm', style: 'background:#ffffe0', text: o[0], onclick: () => { w.inp.value = o[0]; fn && fn(o); } }));
}
function buddyAvailable(sn) { const r = bcRow(sn); return BC.on && r.state !== 'off' && !S.blocked[sn]; }
function imSend(sn, text) {
  const w = BC.ims[sn];
  if (!BC.on) { imSys(w, 'You are not signed on.'); return; }
  if (BC.warn >= 100) { imSys(w, 'You are warned to 100% and can\'t send messages right now. Wait for your warning level to go down.'); return; }
  const b = BUDDY(sn);
  if (b && !buddyAvailable(b.sn)) { imSys(w, sn + ' is not currently signed on.'); SFX.error(); return; }
  if (!b && !roomUserOnline(sn)) { imSys(w, sn + ' is not currently signed on.'); SFX.error(); return; }
  imLine(w, S.sn, text, true); SFX.imOut(); stat('ims'); unlock('im');
  if (w) imChips(w, []);
  if (!b) { after(rnd(2, 6), () => { if (chance(0.7)) buddySay(sn, pick(['who is this', 'lol hi', 'do i know u?', 'asdfgh', 'brb'])); }); return; }
  const r = bcRow(b.sn);
  if (r.away) { after(0.3, () => imLine(w, b.sn, 'Auto response from ' + b.sn + ': ' + r.away.replace(/<[^>]+>/g, ''))); return; }
  const a = BC.busy[b.sn];
  if (a && a.waiting) { a.waiting = false; const opt = matchOpt(a.node.opts, text); runNode(b, a.th, opt[1], opt[2]); return; }
  if (a) return;
  if (chance(0.85)) after(rnd(2, 5), () => buddySay(b.sn, buddyReply(b, text)));
}
function matchOpt(opts, text) {
  const t = text.toLowerCase(), words = t.split(/\W+/).filter((x) => x.length > 1);
  let best = null, bs = 0;
  for (const o of opts) { const ow = o[0].toLowerCase().split(/\W+/); const s = words.filter((x) => ow.includes(x)).length + (t === o[0].toLowerCase() ? 10 : 0); if (s > bs) { bs = s; best = o; } }
  if (!best && /\b(yes|yeah|ya|yep|sure|ok|k|maybe|totally)\b/.test(t)) best = opts.find((o) => o[2] > 0);
  if (!best && /\b(no|nah|nope|ew|never)\b/.test(t)) best = opts.find((o) => o[2] < 0) || opts.find((o) => o[2] === 0);
  return best || opts.find((o) => o[2] === 0) || opts[0];
}
function buddySay(sn, text) {
  if (!BC.on || (BUDDY(sn) && !buddyAvailable(sn))) return;
  const w = openIM(sn, true);
  imLine(w, sn, text); SFX.imIn();
  if (BC.away) after(0.4, () => imLine(w, S.sn, 'Auto response from ' + S.sn + ': ' + BC.away.replace(/<[^>]+>/g, ''), true));
}
async function runNode(b, th, key, rel = 0) {
  const sn = b.sn;
  if (rel) relAdd(sn, rel);
  const node = th.nodes[key]; if (!node) { delete BC.busy[sn]; return; }
  BC.busy[sn] = { th, node, waiting: false };
  for (const line of node.say || []) {
    await sleep(1.2 + line.length * 0.035 + rnd(0, 0.8));
    if (!buddyAvailable(sn)) { delete BC.busy[sn]; return; }
    buddySay(sn, line.replace(/\{sn\}/g, S.sn));
  }
  if (node.fx) node.fx();
  if (node.quest) { BC.quest[sn] = Object.assign({ th }, node.quest); delete BC.busy[sn]; return; }
  if (node.opts) { BC.busy[sn].waiting = true; const w = BC.ims[sn]; imChips(w, node.opts, () => imSend(sn, w.inp.value)); return; }
  delete BC.busy[sn];
}
function questDone(sn) { const q = BC.quest[sn]; if (!q) return; delete BC.quest[sn]; unlock(q.kind === 'file' ? 'sendfile' : 'guestbook'); runNode(BUDDY(sn), q.th, q.done); }
on('guestbook', (who) => { for (const sn in BC.quest) if (BC.quest[sn].kind === 'guestbook') questDone(sn); });
function imWarn(sn) {
  const w = BC.ims[sn];
  if (!BC.on) return;
  const b = BUDDY(sn); if (!b || !buddyAvailable(b.sn)) { imSys(w, 'You can only warn people who are online.'); return; }
  imSys(w, 'You warned ' + sn + '. Their warning level is now ' + (10 + irnd(0, 10)) + '%.'); SFX.warn();
  relAdd(b.sn, -3); after(2, () => buddySay(b.sn, pick(['did u just WARN me???', 'wow. ok.', 'WHY WOULD U WARN ME', 'rude!!!'])));
  unlock('warnbuddy');
}
function imBlock(sn) {
  BC.iblocked[sn] = true; imSys(BC.ims[sn], 'You have blocked ' + sn + '. They can no longer IM you.');
}
function imSendFile(sn) {
  const w = BC.ims[sn];
  if (!BC.on) return;
  const files = filesIn('music').concat(filesIn('desktop')).filter((f) => /mp3|exe|vbs|scr/.test(extOf(f.name)));
  if (!files.length) { msgBox({ title: 'Send File', icon: 'info', text: 'You don\'t have any files to send. Download some songs with Snapster first!' }); return; }
  const lv = listView([{ label: 'File', w: 300 }, { label: 'Size', w: 70 }], { onOpen: (r) => go(r.f) });
  lv.set(files.map((f) => ({ f, cells: [h('span', null, img(fileIcon(f), 16), displayName(f)), fmtSize(f.size)] })));
  const go = async (f) => {
    d.close();
    const b = BUDDY(sn); if (!b || !buddyAvailable(b.sn)) { imSys(w, sn + ' is not available to receive files.'); return; }
    imSys(w, `Sending "${displayName(f)}" to ${sn}...`);
    const t = clamp(f.size / 1024 / (MYCAP * SPEEDUP), 3, 14);
    await sleep(t);
    if (!BC.on || !buddyAvailable(b.sn)) { imSys(w, 'File transfer failed.'); return; }
    imSys(w, 'File transfer complete.'); stat('sentfiles');
    const q = BC.quest[b.sn];
    await sleep(2);
    if (f.payload) { buddySay(b.sn, pick(['DUDE U SENT ME A VIRUS', 'my computer just went crazy!!! what did u send me???', 'my mom is SO mad. that was a virus!!!'])); relAdd(b.sn, -4); unlock('sentvirus'); return; }
    if (!f.track) { buddySay(b.sn, 'it wont open??'); return; }
    if (f.track.kind === 'talk' || f.track.kind === 'silence') { buddySay(b.sn, pick(['this is just some guy talking lol', 'its silent?? is this a fake?', 'lol fake file'])); return; }
    const real = f.track.kind === 'wrong' ? f.track.realOf : f.track.songId;
    if (q && q.kind === 'file') {
      if (real === q.song) questDone(b.sn);
      else if (f.track.songId === q.song) buddySay(b.sn, 'uh... this isnt the right song. somebody mislabeled it lol');
      else buddySay(b.sn, 'thats not the one i asked for lol. but thx');
    } else buddySay(b.sn, b.likes.includes(findSong(real).genre) ? 'ooh thx!!! i love this one' : 'thx... i guess lol');
  };
  const d = openWin({ title: 'Send File to ' + sn, icon: 'mp3', w: 420, h: 300, small: true, body: h('div', { class: 'col grow pad', style: 'min-height:0' }, lv, h('div', { class: 'btns' }, h('button', { class: 'btn def', text: 'Send', onclick: () => { const r = lv.selected(); if (r) go(r.f); } }), h('button', { class: 'btn', text: 'Cancel', onclick: () => d.close() }))) });
}

// ---- buddy simulation ----
function buddySignOn(sn) { const r = bcRow(sn); if (r.state !== 'off' || S.blocked[sn]) return; r.state = 'on'; r.since = T.t; r.fresh = T.t + 6; r.away = ''; SFX.doorOpen(); bcRender(); after(6.2, bcRender); }
function buddySignOff(sn, back) { const r = bcRow(sn); if (r.state === 'off') return; r.state = 'off'; r.away = ''; SFX.doorClose(); bcRender(); const w = BC.ims[sn]; if (w && !w.closed) imSys(w, sn + ' signed off at ' + clockStr()); if (back) r.backAt = T.t + back; }
every(1, () => {
  if (!BC.on) return;
  const el = T.t - BC.since;
  BC.warn = Math.max(0, BC.warn - 1 / 25);
  for (const b of BUDDIES) {
    const r = bcRow(b.sn);
    if (S.blocked[b.sn]) continue;
    if (r.state === 'off') { if (el >= b.on[0] && el < b.on[1] && (!r.backAt || T.t >= r.backAt) && !r.gone) buddySignOn(b.sn); continue; }
    if (el >= b.on[1]) { r.gone = true; buddySignOff(b.sn); continue; }
    if (!r.away && !BC.busy[b.sn] && chance(1 / 240)) { r.away = pick(b.aways); r.awayUntil = T.t + rnd(40, 120); bcRender(); }
    else if (r.away && T.t > r.awayUntil) { r.away = ''; bcRender(); }
    // threads
    if (r.away || BC.busy[b.sn] || BC.quest[b.sn] || T.t - BC.lastStart < 25 || T.t - r.since < 8) continue;
    for (const id in b.threads) {
      const th = b.threads[id], key = b.sn + ':' + id;
      if (BC.done[key] || el < th.at) continue;
      if (relOf(b.sn) <= -6) break;
      BC.done[key] = true; BC.lastStart = T.t;
      runNode(b, th, th.start);
      break;
    }
  }
  // blocked by a buddy you annoyed too much
  for (const b of BUDDIES) if (!S.blocked[b.sn] && relOf(b.sn) <= -7 && bcRow(b.sn).state !== 'off') { const w = BC.ims[b.sn]; if (w && !w.closed) imLine(w, b.sn, pick(['im blocking u.', 'ur so annoying. bye.', 'blocked.'])); S.blocked[b.sn] = true; save(); buddySignOff(b.sn); unlock('blocked'); }
});

// ---- profile and away ----
function richEditor(html) {
  const ed = h('div', { class: 'field sel-text', contenteditable: 'true', style: 'flex:1;min-height:90px;overflow:auto;font:13px Arial;-webkit-user-select:text;user-select:text', html });
  const cmd = (c, v) => { ed.focus(); document.execCommand(c, false, v); };
  const colors = ['#000000', '#ff0000', '#ff00ff', '#8000ff', '#0000ff', '#008000', '#ff8000', '#808080'];
  const bar = h('div', { class: 'row', style: 'gap:2px;flex-wrap:wrap' }, h('button', { class: 'btn sm', html: '<b>B</b>', onclick: () => cmd('bold') }), h('button', { class: 'btn sm', html: '<i>I</i>', onclick: () => cmd('italic') }), h('button', { class: 'btn sm', html: '<u>U</u>', onclick: () => cmd('underline') }),
    colors.map((c) => h('button', { class: 'btn sm', style: `min-width:16px;background:${c}`, onclick: () => cmd('foreColor', c) })), h('button', { class: 'btn sm', text: '~*~', onclick: () => cmd('insertText', '~*~') }), h('button', { class: 'btn sm', text: '<3', onclick: () => cmd('insertText', '<3') }),
    h('button', { class: 'btn sm', text: 'Lyrics...', onclick: () => pickLyrics((html, song) => { ed.focus(); document.execCommand('insertHTML', false, html); out.song = song; }) }));
  const out = { ed, bar, song: null };
  return out;
}
function editProfile() {
  const E = richEditor(S.profile || `<div style="text-align:center"><b>~*~ ${esc(S.sn)} ~*~</b><br><br><i>"put ur favorite song lyrics here"</i></div>`);
  const w = openWin({ key: 'profile', title: 'Edit Profile', icon: 'user', w: 380, h: 340, small: true, body: h('div', { class: 'col grow pad', style: 'min-height:0' }, h('div', { text: 'Your profile is what people see when they click Get Info on you. Make it deep.' }), E.bar, E.ed,
    h('div', { class: 'btns' }, h('button', { class: 'btn def', text: 'Save', onclick: () => { S.profile = E.ed.innerHTML; save(); unlock('profile'); w.close(); buddyComment(E.song ? 'lyrics' : 'profile', E.song); } }), h('button', { class: 'btn', text: 'Cancel', onclick: () => w.close() }))) });
}
function awayDialog() {
  if (!BC.on) { openBuddyChat(); return; }
  const presets = (S.aways || AWAY_PRESETS);
  const E = richEditor(presets[0]), ed = E.ed, bar = E.bar;
  const sel = h('select', { style: 'width:100%' }, presets.map((p, i) => h('option', { value: i, text: p.replace(/<[^>]+>/g, '') })));
  sel.addEventListener('change', () => { ed.innerHTML = presets[sel.value]; });
  const w = openWin({ key: 'awayedit', title: 'New Away Message', icon: 'away', w: 360, h: 320, small: true, body: h('div', { class: 'col grow pad', style: 'min-height:0' }, sel, bar, ed,
    h('div', { class: 'btns' }, h('button', { class: 'btn def', text: 'I\'m Away', onclick: () => { const m = ed.innerHTML.trim(); if (!m) return; S.aways = [m].concat(presets.filter((p) => p !== m)).slice(0, 10); save(); w.close(); setAway(m); } }), h('button', { class: 'btn', text: 'Cancel', onclick: () => w.close() }))) });
}
function setAway(m) {
  BC.away = m; unlock('away'); stat('aways'); bcRender();
  if (BC.awayW && !BC.awayW.closed) BC.awayW.close(true);
  const back = () => { BC.away = null; bcRender(); if (BC.awayW && !BC.awayW.closed) BC.awayW.close(true); };
  BC.awayW = openWin({ key: 'away', title: 'Away Message', icon: 'away', w: 260, small: true, resizable: false, onClose: () => { back(); }, body: h('div', { class: 'col pad' }, h('div', { class: 'field', style: 'background:#ffffe0;min-height:50px', html: m }), h('div', { class: 'btns c' }, h('button', { class: 'btn def', text: 'I\'m Back', onclick: back }))) });
  const d = deepScore(m);
  if (d >= 60) { unlock('deepaway'); buddyComment('deep'); }
  toast('Deep-o-Meter', 'Your away message scored ' + d + '%: ' + deepLabel(d) + '.', 'away');
}

// ---- chat rooms ----
function chooseRoom() {
  if (!BC.on) { openBuddyChat(); return; }
  const lv = listView([{ label: 'Room', w: 160 }, { label: 'People', w: 60 }], { onOpen: (r) => { w.close(); joinRoom(r.n); } });
  lv.set(Object.keys(ROOMS).map((n) => ({ n, cells: [h('span', null, img('network', 16), n), String(ROOMS[n].users.length + 1)] })));
  const w = openWin({ title: 'Join a Chat Room', icon: 'network', w: 280, h: 260, small: true, body: h('div', { class: 'col grow pad', style: 'min-height:0' }, lv, h('div', { class: 'btns' }, h('button', { class: 'btn def', text: 'Go Chat', onclick: () => { const r = lv.selected(); if (r) { w.close(); joinRoom(r.n); } } }))) });
}
function roomUserOnline(sn) { for (const n in BC.rooms) { const w = BC.rooms[n]; if (w && !w.closed && w.people.includes(sn)) return true; } return false; }
function joinRoom(name) {
  const R = ROOMS[name];
  if (BC.rooms[name] && !BC.rooms[name].closed) { BC.rooms[name].focus(); return; }
  const log = h('div', { class: 'field sel-text', style: 'flex:1;min-height:60px;overflow:auto;font:13px Arial;line-height:1.35' });
  const ppl = h('div', { class: 'lv', style: 'width:130px;flex:none' });
  const inp = h('input', { type: 'text', class: 'grow' });
  const w = openWin({ title: 'Chat Room: ' + name, icon: 'network', w: 520, h: 360, minW: 360, body: h('div', { class: 'col grow pad', style: 'min-height:0' }, h('div', { class: 'row grow', style: 'align-items:stretch;min-height:0' }, log, ppl), h('div', { class: 'row' }, inp, h('button', { class: 'btn def', text: 'Send', onclick: () => send() }))),
    onClose: () => { delete BC.rooms[name]; } });
  w.log = log; w.name = name; w.joined = T.t; w.people = shuffle(R.users.slice()).slice(0, irnd(4, R.users.length)); w.said = 0;
  BC.rooms[name] = w;
  const send = () => { const v = inp.value.trim(); if (!v) return; inp.value = ''; roomSay(w, S.sn, v, true); w.said++; stat('roomlines'); roomReact(w, v); };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  log.addEventListener('click', (e) => { const a = e.target.closest('[data-href]'); if (a) openBrowser(a.dataset.href); });
  w.renderPeople = () => { ppl.textContent = ''; ppl.append(h('div', { style: 'font-weight:bold;padding:2px', text: (w.people.length + 1) + ' people here' })); [S.sn].concat(w.people).forEach((p) => { const e = h('div', { style: 'padding:1px 4px;' + '', text: p }); e.addEventListener('dblclick', () => p !== S.sn && openIM(p)); ctxMenu(e, p === S.sn ? [] : [{ label: 'Send IM', act: () => openIM(p) }, { label: 'Get Info', act: () => buddyInfo(p) }, { label: 'Warn', act: () => roomSys(w, 'You warned ' + p + '.') }]); ppl.append(e); }); };
  w.renderPeople();
  roomSys(w, '*** You are in "' + name + '". ***'); unlock('chatroom'); stat('rooms');
  return w;
}
// html: an already-built message (prog fades and macros); otherwise text is escaped and linkified
function roomSay(w, who, text, mine, html) { if (!w || w.closed) return; const c = mine ? '#0000ff' : '#a00000'; w.log.append(h('div', { style: !html && text.includes('\n') ? 'white-space:pre;font-family:monospace' : '', html: `<b style="color:${c}">${esc(who)}</b>: ${html || bcLink(text)}` })); while (w.log.children.length > 200) w.log.firstChild.remove(); w.log.scrollTop = w.log.scrollHeight; }
function roomSys(w, text) { if (!w || w.closed) return; w.log.append(h('div', { style: 'color:#808080', text })); w.log.scrollTop = w.log.scrollHeight; }
function roomReact(w, text) {
  if (chance(0.6)) after(rnd(2, 5), () => { const u = pick(w.people); if (u) roomSay(w, u, pick(['lol ' + S.sn, 'hi ' + S.sn + '!', 'haha', S.sn + ' ur funny', 'same', 'totally', 'whatever ' + S.sn, '???'])); });
}
every(2.5, () => {
  for (const n in BC.rooms) {
    const w = BC.rooms[n]; if (!w || w.closed || !BC.on) continue;
    const R = ROOMS[n];
    if (chance(0.6)) { const u = pick(w.people); if (u) roomSay(w, u, pick(R.lines)); }
    if (chance(0.06) && w.people.length > 3) { const u = pick(w.people); w.people = w.people.filter((p) => p !== u); roomSys(w, u + ' has left the room.'); w.renderPeople(); }
    else if (chance(0.06)) { const u = pick(R.users.filter((p) => !w.people.includes(p))); if (u) { w.people.splice(irnd(0, w.people.length), 0, u); roomSys(w, u + ' has entered the room.'); w.renderPeople(); } }
  }
});
