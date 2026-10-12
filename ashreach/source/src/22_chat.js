// Ashreach — chat window: tabs, channel colours, input line and slash commands, combat log

const CHAT = { msgs: [], tab: 'all', hist: [], histI: -1, el: null, log: null, input: null, chn: null, unread: {} };
const CHAT_TABS = [['all', 'All'], ['vicinity', 'Vicinity'], ['ooc', 'OOC'], ['team', 'Team'], ['combat', 'Combat']];
// Which tabs each message kind shows in.
const CHAT_ROUTE = {
  vicinity: ['all', 'vicinity'], shout: ['all', 'vicinity'], tell: ['all', 'vicinity', 'team'], faction: ['all', 'vicinity'], system: ['all', 'vicinity', 'ooc', 'team'],
  ooc: ['all', 'ooc'], team: ['all', 'team'], help: ['all', 'vicinity', 'ooc', 'team', 'combat'],
  'dmg-out': ['combat'], 'dmg-in': ['combat'], heal: ['combat'], info: ['all', 'combat'], warn: ['all', 'combat'], xp: ['all', 'combat'], loot: ['all', 'combat'], nano: ['all', 'combat'],
};
const CHAT_TYPE = { melee: 'melee', proj: 'projectile', energy: 'energy', chem: 'chemical', rad: 'radiation', cold: 'cold', fire: 'fire', poison: 'poison' };
const CHAT_HELP = [
  ['text', 'say it in vicinity (or the open tab\'s channel)'], ['/ooc text', 'out-of-character, heard world-wide'], ['/team text', 'team chat (also /tm)'],
  ['/t name text', 'private tell'], ['/s text', 'shout to the whole zone'], ['/invite name', 'invite someone to your team'], ['/leave', 'leave your team'],
  ['/follow', 'follow your target'], ['/assist', 'target what your target attacks'], ['/sit', 'sit down / stand up'], ['/who', 'list players nearby'],
  ['/loc', 'print your position'], ['/stuck', 'return to a safe spot in this zone'], ['/save', 'save the game'], ['/clear', 'clear this chat tab'],
];

function chat_build() {
  const el = ui_h('div', 'pnl', null, UI.root);
  el.id = 'chat';
  UI.chatEl = CHAT.el = el;
  const tabs = ui_h('div', 'tabs', CHAT_TABS.map(([id, n]) => '<div class="tab" data-ct="' + id + '">' + n + '</div>').join(''), el);
  CHAT.tabsEl = tabs;
  CHAT.log = ui_h('div', 'log', null, el);
  const ci = ui_h('div', 'ci', '<span class="chn">vic</span><input type="text" maxlength="240" spellcheck="false" autocomplete="off" placeholder="Press Enter to chat · /help for commands">', el);
  CHAT.chn = ci.firstChild; CHAT.input = ci.lastChild;
  const st = ui_load();
  if (st.chat) { CHAT.tab = st.chat.tab || 'all'; if (st.chat.w) { el.style.width = st.chat.w + 'px'; el.style.height = st.chat.h + 'px'; } if (st.chat.x != null) { el.style.left = st.chat.x + 'px'; el.style.top = st.chat.y + 'px'; el.style.bottom = 'auto'; } }
  el.style.resize = 'both'; el.style.overflow = 'hidden'; el.style.minWidth = '260px'; el.style.minHeight = '110px';
  tabs.addEventListener('click', (ev) => { const t = ev.target.closest('[data-ct]'); if (t) chat_setTab(t.dataset.ct); });
  // drag the panel by the empty part of the tab strip
  tabs.addEventListener('mousedown', (ev) => {
    if (ev.target !== tabs || ev.button !== 0) return;
    ev.preventDefault();
    const r = el.getBoundingClientRect();
    const mv = (e) => { el.style.left = clamp(e.clientX - (ev.clientX - r.left), 0, innerWidth - 80) + 'px'; el.style.top = clamp(e.clientY - (ev.clientY - r.top), 0, innerHeight - 40) + 'px'; el.style.bottom = 'auto'; };
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); chat_saveGeom(); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
  el.addEventListener('mouseup', () => { if (el.offsetWidth && (el.offsetWidth + 'x' + el.offsetHeight) !== CHAT.geom) chat_saveGeom(); });
  CHAT.log.addEventListener('click', (ev) => {
    const w = ev.target.closest('.who');
    if (w && w.dataset.n && PLAYER && w.dataset.n !== PLAYER.name) chat_focus('/t ' + w.dataset.n + ' ');
  });
  CHAT.input.addEventListener('keydown', (ev) => {
    if (ev.code === 'Enter' || ev.code === 'NumpadEnter') {
      ev.preventDefault(); ev.stopPropagation();
      const v = CHAT.input.value.trim();
      CHAT.input.value = '';
      if (v) { CHAT.hist.unshift(v); CHAT.hist.length = Math.min(CHAT.hist.length, 30); chat_send(v); }
      CHAT.histI = -1;
      CHAT.input.blur();
    } else if (ev.code === 'Escape') {
      ev.preventDefault(); ev.stopPropagation();
      CHAT.input.blur();
    } else if (ev.code === 'ArrowUp' || ev.code === 'ArrowDown') {
      ev.preventDefault();
      CHAT.histI = clamp(CHAT.histI + (ev.code === 'ArrowUp' ? 1 : -1), -1, CHAT.hist.length - 1);
      CHAT.input.value = CHAT.histI < 0 ? '' : CHAT.hist[CHAT.histI];
    }
    ev.stopPropagation();
  });
  CHAT.input.addEventListener('keyup', (ev) => ev.stopPropagation());
  CHAT.input.addEventListener('focus', () => el.classList.remove('idle'));
  CHAT.input.addEventListener('blur', () => el.classList.add('idle'));
  el.classList.add('idle');
  chat_setTab(CHAT.tab);
  chat_events();
}
function chat_saveGeom() {
  const el = CHAT.el, r = el.getBoundingClientRect();
  CHAT.geom = el.offsetWidth + 'x' + el.offsetHeight;
  UI.store.chat = { tab: CHAT.tab, w: el.offsetWidth, h: el.offsetHeight, x: el.style.bottom === 'auto' ? r.left : null, y: el.style.bottom === 'auto' ? r.top : null };
  ui_save();
}
function chat_focus(prefix) {
  if (!CHAT.input || UI.state !== 'play') return;
  CHAT.input.focus();
  if (prefix) CHAT.input.value = prefix;
  const n = CHAT.input.value.length;
  CHAT.input.setSelectionRange(n, n);
}
function chat_defChan() { return CHAT.tab === 'ooc' ? 'ooc' : CHAT.tab === 'team' ? 'team' : 'vicinity'; }
function chat_setTab(id) {
  CHAT.tab = id;
  CHAT.unread[id] = false;
  for (const t of CHAT.tabsEl.children) { t.classList.toggle('on', t.dataset.ct === id); t.classList.toggle('new', !!CHAT.unread[t.dataset.ct]); }
  CHAT.chn.textContent = { vicinity: 'vic', ooc: 'ooc', team: 'team' }[chat_defChan()];
  CHAT.log.innerHTML = CHAT.msgs.filter((m) => m.tabs.includes(id)).slice(-200).map((m) => '<div class="c-' + m.cls + '">' + m.html + '</div>').join('');
  CHAT.log.scrollTop = CHAT.log.scrollHeight;
  if (UI.store) { UI.store.chat = Object.assign(UI.store.chat || {}, { tab: id }); ui_save(); }
}
// Add a line. kind picks tabs (CHAT_ROUTE) and colour class.
function chat_add(kind, html) {
  const tabs = CHAT_ROUTE[kind] || ['all'];
  const m = { cls: kind, html, tabs };
  CHAT.msgs.push(m);
  if (CHAT.msgs.length > 500) CHAT.msgs.splice(0, 100);
  if (!CHAT.log) return;
  if (tabs.includes(CHAT.tab)) {
    const L = CHAT.log, atEnd = L.scrollTop + L.clientHeight >= L.scrollHeight - 30;
    ui_h('div', 'c-' + kind, html, L);
    while (L.childElementCount > 220) L.firstChild.remove();
    if (atEnd) L.scrollTop = L.scrollHeight;
  }
  let ch = false;
  for (const t of tabs) if (t !== CHAT.tab && t !== 'all' && kind !== 'system' && kind !== 'help' && !CHAT.unread[t] && t !== 'combat') { CHAT.unread[t] = true; ch = true; }
  if (ch) for (const t of CHAT.tabsEl.children) t.classList.toggle('new', !!CHAT.unread[t.dataset.ct]);
}
const chat_who = (name) => '<span class="who" data-n="' + esc(name) + '">' + esc(name) + '</span>';
// Print a local line without broadcasting (help, errors, echoes).
function chatPrint(text, kind) { chat_add(kind || 'system', esc(text)); }

function chat_send(v) {
  if (!PLAYER) return;
  if (v[0] !== '/') { chat_say(chat_defChan(), v); return; }
  const parts = v.slice(1).split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase(), rest = v.slice(1 + cmd.length).trim();
  switch (cmd) {
    case 'ooc': case 'o': return chat_say('ooc', rest);
    case 'team': case 'tm': case 'te': case 'p': return chat_say('team', rest);
    case 's': case 'shout': case 'y': return chat_say('shout', rest);
    case 'v': case 'say': case 'vicinity': return chat_say('vicinity', rest);
    case 't': case 'tell': case 'w': case 'msg': {
      const to = parts[0], msg = rest.slice((to || '').length).trim();
      if (!to || !msg) { chatPrint('Usage: /t name message', 'warn'); return; }
      EV.emit('chat', 'tell', PLAYER.name, msg, to);
      EV.emit('playerchat', 'tell', msg, to);
      return;
    }
    case 'r': case 'reply':
      if (!CHAT.lastTell) { chatPrint('Nobody has sent you a tell yet.', 'warn'); return; }
      return chat_send('/t ' + CHAT.lastTell + ' ' + rest);
    case 'help': case '?': case 'commands':
      chat_add('help', '<b>Chat commands</b>');
      for (const [c, d] of CHAT_HELP) chat_add('help', '<span class="amb">' + esc(c) + '</span> — ' + esc(d));
      return;
    case 'clear': CHAT.msgs = CHAT.msgs.filter((m) => !m.tabs.includes(CHAT.tab)); chat_setTab(CHAT.tab); return;
  }
  let done = false;
  if (typeof chatCommand === 'function') {
    const r = chatCommand(cmd, parts);
    if (typeof r === 'string') { chatPrint(r); done = true; } else done = !!r;
  }
  if (!done) {
    // fallbacks for team management when the sim layer does not handle them
    if (cmd === 'invite' && typeof teamInvite === 'function' && rest) { teamInvite(rest); return; }
    if (cmd === 'leave' && typeof teamLeave === 'function') { teamLeave(); return; }
    if (cmd === 'assist' && PLAYER.target && PLAYER.target.target && typeof setTarget === 'function') { setTarget(PLAYER.target.target); return; }
    chatPrint('Unknown command: /' + cmd + '. Type /help for a list.', 'warn');
  }
}
function chat_say(ch, text) {
  if (!text) return;
  if (ch === 'team' && !(typeof TEAM !== 'undefined' && TEAM.members && TEAM.members.length > 1)) { chatPrint('You are not in a team.', 'warn'); return; }
  EV.emit('chat', ch, PLAYER.name, text);
  EV.emit('playerchat', ch, text);
}

// ---------- event formatting ----------
function chat_events() {
  EV.on('chat', (ch, from, text, to) => {
    const t = esc(text);
    let html;
    switch (ch) {
      case 'system': html = (from ? chat_who(from) + ': ' : '') + t; break;
      case 'ooc': html = '[OOC] ' + chat_who(from) + ': ' + t; break;
      case 'team': html = '[Team] ' + chat_who(from) + ': ' + t; break;
      case 'shout': html = chat_who(from) + ' shouts: ' + t; break;
      case 'faction': html = '[' + esc(to || 'Faction') + '] ' + chat_who(from) + ': ' + t; break;
      case 'tell':
        if (PLAYER && from === PLAYER.name && to) html = 'To ' + chat_who(to) + ': ' + t;
        else { html = chat_who(from) + ' tells you: ' + t; CHAT.lastTell = from; if (typeof sfx === 'function') sfx('tell'); }
        break;
      default: html = from ? chat_who(from) + ': ' + t : t;
    }
    chat_add(CHAT_ROUTE[ch] ? ch : 'vicinity', html);
  });
  EV.on('log', (text, cls) => chat_add(CHAT_ROUTE[cls] ? cls : 'info', esc(text)));
  EV.on('dmg', (src, tgt, amt, type, o) => {
    if (!PLAYER) return;
    o = o || {};
    const pet = src && src.owner === PLAYER;
    if (src !== PLAYER && tgt !== PLAYER && !pet) return;
    const ty = CHAT_TYPE[type] || type || '';
    const sp = o.special ? ' with ' + ui_specialName(o.special) : '';
    const crit = o.crit ? ' <b class="amb">Critical!</b>' : '';
    let s;
    if (src === PLAYER) {
      if (o.miss) s = 'You missed ' + esc(tgt.name) + sp + '.';
      else if (o.nano) s = 'Your ' + esc(o.nano) + ' hit ' + esc(tgt.name) + ' for ' + fmtInt(amt) + ' ' + ty + ' damage.' + crit;
      else s = 'You hit ' + esc(tgt.name) + sp + ' for ' + fmtInt(amt) + ' ' + ty + ' damage.' + crit;
      chat_add('dmg-out', s);
    } else if (pet) {
      chat_add('dmg-out', esc(src.name) + (o.miss ? ' missed ' + esc(tgt.name) + '.' : ' hit ' + esc(tgt.name) + ' for ' + fmtInt(amt) + ' ' + ty + ' damage.' + crit));
    } else {
      const who = src ? esc(src.name) : 'Something';
      if (o.miss) s = who + ' missed you.';
      else if (o.nano) s = (src ? who + "'s " : '') + esc(o.nano) + ' hit you for ' + fmtInt(amt) + ' ' + ty + ' damage.' + crit;
      else s = who + ' hit you for ' + fmtInt(amt) + ' ' + ty + ' damage.' + crit;
      chat_add('dmg-in', s);
    }
  });
  EV.on('heal', (src, tgt, amt, o) => {
    if (!PLAYER || amt < 1 || (src !== PLAYER && tgt !== PLAYER)) return;
    o = o || {};
    const by = o.nano ? ' (' + esc(o.nano) + ')' : '';
    let s;
    if (src === PLAYER && tgt === PLAYER) s = 'You healed yourself for ' + fmtInt(amt) + by + '.';
    else if (src === PLAYER) s = 'You healed ' + esc(tgt.name) + ' for ' + fmtInt(amt) + by + '.';
    else s = (src ? esc(src.name) + ' healed you' : 'You were healed') + ' for ' + fmtInt(amt) + by + '.';
    chat_add('heal', s);
  });
  EV.on('teaminvite', (from) => {
    if (!from) return;
    chat_add('system', chat_who(from.name) + ' invites you to join a team.');
  });
}
