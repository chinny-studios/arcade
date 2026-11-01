// Progz: the add-on "progs" of 2001 chat culture, recreated as a harmless in-game toy. PhAnToM 3.2 (a parody
// Visual Basic prog) has a punter, an IM bomber, a fader for away messages, chat-room macros and anti-punt.
// Nothing here touches anything real: a "punt" is an IM stuffed with thousands of tags that an older BuddyChat
// client chokes on while drawing it, so the game signs that buddy off. The Progz 4 Trade room punts you back,
// and doing too much of it gets you TOS'd (AmeriNet ends your session).
const PROG = { w: null, log: null, busy: false, strikes: 0, punting: false };
const PROG_NAME = 'PhAnToM 3.2';
const ANTIPUNT_SN = ['cousinTJ', 'xX_PuNtEr_Xx'];
const PUNTS = {
  lite: { label: 'Lite punt (<font> flood)', tag: '<font>', tags: 1024, bytes: 14, hit: 0.45 },
  mega: { label: 'Mega punt (<h1> wall)', tag: '<h1>', tags: 4096, bytes: 9, hit: 0.85 },
  ultra: { label: 'UlTrA punt (everything)', tag: '<font size=999><h1>', tags: 16384, bytes: 24, hit: 1, lag: true },
};
const FADES = {
  Rainbow: ['#ff0000', '#ff8000', '#e0d000', '#00b000', '#0060ff', '#8000ff'],
  Fire: ['#800000', '#ff0000', '#ffb000'],
  Ice: ['#000080', '#0080ff', '#00c0c0'],
  Haxor: ['#004000', '#00d000', '#004000'],
  Barbie: ['#ff40c0', '#a000ff', '#ff40c0'],
  'Black & Red': ['#000000', '#e00000', '#000000'],
};
const MACROS = {
  'PhAnToM Banner': ' .--------------------------.\n |   P h A n T o M   3 . 2  |\n |  ~ the prog of choice ~  |\n \'--------------------------\'',
  'LOL': ' _      ___   _\n| |    / _ \\ | |\n| |__ | (_) || |__\n|____| \\___/ |____|',
  'Flower 4 U': '     _\n   _(_)_\n  (_)@(_)\n    (_)\\\n       |/\n       |\n  ~ 4 u ~',
  'Ghost': '   .-.\n  (o o)  boo!\n  | O |\n  |   |\n  \'~~~\'',
};
const PUNT_BACK = {
  jenny4eva: 'did u just PUNT me??? my mom thought i broke the computer!!!',
  SkaterDude182: 'dude. did u punt me. not cool man',
  xXDarkAngelXx: 'punted. just like everything else in my life.',
  bballstar23: 'yo was that u. since when do u have progz',
  sam_i_am88: 'um... did u just punt me? lol i thought we were friends',
  auntlinda_quilts: 'DEAR MY COMPUTER SAID ILLEGAL OPERATION AND THE INTERNET CLOSED. DID I BREAK IT',
};

// ---- files: the prog, the DLL every prog needs, and the "free hours" trojan from the same site ----
DOWNLOADS.phantom = { name: 'phantom32.exe', app: 'progz', size: 411648, noSetup: true };
DOWNLOADS.vbdll = { name: 'vb40032.dll', size: 721168 };
DOWNLOADS.freehours = { name: 'FREE_HOURS.exe', payload: 'popups', size: 56320 };
APPS.progz = { title: PROG_NAME, icon: 'progz', open: () => openProgz() };
const hasVbDll = () => S.files.some((f) => f.dir !== 'recycle' && /^vb40032/i.test(f.name));
const antiPuntOn = () => !!(S.antipunt && PROG.w && !PROG.w.closed);

Object.assign(ICONS, {
  progz(x) {
    R_(x, 2, 2, 28, 28, G_(x, 0, 2, 0, 30, ['#300000', '#000000']), '#800000');
    P_(x, [[9, 26], [9, 13], [10, 8], [16, 5], [22, 8], [23, 13], [23, 26], [20, 23], [18, 26], [16, 23], [14, 26], [12, 23]], '#f4f4f4', '#000');
    E_(x, 13, 13, 2, 2.6, '#e00000'); E_(x, 19, 13, 2, 2.6, '#e00000');
    E_(x, 16, 19, 2, 1.6, '#000');
  },
});

const PROG_README = `PhAnToM 3.2 bY d4rK_ReAp3r
==========================

thanx 4 downloading the BEST prog 4 BuddyChat!!!

U NEED VB40032.DLL 2 RUN THIS. get it from my site.

WHAT IT DOES
------------
PUNTER  - knocks people off BuddyChat. how it works: BuddyChat
          4.6 and older draws EVERY tag in an IM before it
          shows the IM. a punt is one IM with thousands of
          <font> or <h1> tags in it and nothing else. their
          computer tries 2 draw all of it, runs out of memory,
          and BuddyChat closes. bye bye lamer.
          4.7 has a fix, so lite punts dont always work on it.
          use the UlTrA punt (might lag ur computer 2 lol)
IM BOMB - sends the same IM over and over. BuddyChat stops u
          after 20 (flood control) and they will warn u.
FADER   - makes ur text fade colors. every letter gets its own
          <font color> tag. looks SICK in an away message.
MACROS  - scrolls ascii art into a chat room 1 line at a time.
ANTI-PUNT - leave the prog open with this on and it throws away
          any IM with a crazy number of tags in it before
          BuddyChat tries 2 draw it. ALWAYS HAVE THIS ON.

TOS
---
AmeriNet does NOT like progz. if ppl report u, u get a TOS
warning. keep doing it and they kick u offline. dont say i
didnt warn u.

4 educational purposez only!!!
greetz 2: ProgMaster2k1, l33t_h4x0r, everyone in Progz 4 Trade
NO greetz 2: lamerz, narcs, TOS
`;

// ---- the prog window ----
function openProgz() {
  if (PROG.w && !PROG.w.closed) { PROG.w.restore(); PROG.w.focus(); return PROG.w; }
  if (!hasVbDll()) {
    msgBox({ title: 'phantom32.exe', icon: 'error', text: 'Run-time error \'48\':\n\nFile not found: VB40032.DLL\n\nThis program needs VB40032.DLL to run. (Every prog does. Look for it on the site you got the prog from.)' });
    unlock('vbdll');
    return null;
  }
  const log = h('div', { class: 'sel-text', style: 'flex:none;height:64px;overflow:auto;background:#000;color:#00e000;font:11px/1.35 "Courier New",monospace;padding:3px 5px;box-shadow:var(--in)' });
  const host = h('div', { class: 'tabpage', style: 'background:#141414;flex:1;min-height:0;overflow:auto' });
  const pages = [['Punter', progPunter], ['IM Bomb', progBomber], ['Fader', progFader], ['Macros', progMacros], ['Options', progOptions]];
  const bar = tabs(pages.map((p) => p[0]), (i) => { host.textContent = ''; pages[i][1](host); });
  const head = h('div', { style: 'flex:none;background:linear-gradient(90deg,#000,#5a0000 50%,#000);padding:6px 8px 5px;text-align:center;box-shadow:var(--in)' },
    h('div', { style: 'font:bold 26px Impact,"Arial Black",sans-serif;letter-spacing:3px;color:#fff;text-shadow:0 0 6px #f00,2px 2px #600', text: PROG_NAME }),
    h('marquee', { scrollamount: 3, style: 'font:10px "Courier New",monospace;color:#00e000' }, 'bY d4rK_ReAp3r *** 4 BuddyChat 4.x *** punter * IM bomber * fader * macroz * anti-punt *** NO LAMERZ *** greetz 2 Progz 4 Trade ***'));
  const body = h('div', { class: 'col grow', style: 'gap:4px;padding:4px;min-height:0;background:#000' }, head, h('div', { class: 'col grow', style: 'gap:0;min-height:0' }, bar, host), log);
  const w = PROG.w = openWin({ key: 'progz', title: PROG_NAME + ' bY d4rK_ReAp3r', icon: 'progz', w: 440, h: 450, minW: 360, body, onClose: () => { if (S.antipunt && BC.on) toast(PROG_NAME, 'Anti-Punt is off now that the prog is closed.', 'progz'); } });
  PROG.log = log;
  progJingle();
  progLog('PhAnToM 3.2 LoAdEd!!! welcome ' + (S.sn || 'lamer'));
  progLog(BC.on ? 'BuddyChat: signed on as ' + S.sn : 'BuddyChat: NOT signed on. sign on first!!!', BC.on ? null : '#ffd000');
  progLog(S.antipunt ? 'anti-punt: ON' : 'anti-punt: OFF (turn it on in Options!!!)', S.antipunt ? null : '#ffd000');
  unlock('progz'); stat('progz');
  after(1, () => bongoInstalled() && bongoSay(pick(['Ooh, a "prog"! Bongo is not allowed to say what he thinks of those.', 'Are you a hacker now? Bongo is a little scared.']), { emote: 'sad' }));
  return w;
}
function progLog(t, c) {
  const log = PROG.log; if (!log || !PROG.w || PROG.w.closed) return;
  log.append(h('div', { style: c ? 'color:' + c : '', text: '\u00BB ' + t }));
  while (log.children.length > 80) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}
function progJingle() {
  [52, 55, 59, 64, 67, 71, 76, 83].forEach((m, i) => tone({ f: mtof(m), t: i * 0.06, d: 0.08, v: 0.07, type: 'square', lp: 2600 }));
  noise({ t: 0.5, d: 0.35, v: 0.07, bp: 900, q: 0.8, r: 0.3 });
}
const progLabel = (t) => h('div', { style: 'color:#ff4040;font-weight:bold;margin-top:2px', text: t });
const progNote = (html) => h('div', { style: 'font-size:11px;color:#9a9a9a;line-height:1.4', html });
function progTargets() {
  const out = [];
  if (!BC.on) return out;
  for (const b of BUDDIES) if (buddyAvailable(b.sn)) out.push(b.sn);
  for (const n in BC.rooms) { const w = BC.rooms[n]; if (w && !w.closed) for (const p of w.people) if (!out.includes(p)) out.push(p); }
  return out;
}
function roomWith(sn) { for (const n in BC.rooms) { const w = BC.rooms[n]; if (w && !w.closed && w.people.includes(sn)) return w; } return null; }
function targetRow() {
  const sel = h('select', { class: 'grow', style: 'min-width:0' });
  const fill = () => {
    const cur = sel.value; sel.textContent = '';
    const t = progTargets();
    if (!t.length) sel.append(h('option', { value: '', text: BC.on ? '(nobody online)' : '(sign on 2 BuddyChat first)' }));
    t.forEach((sn) => sel.append(h('option', { value: sn, text: sn + (BUDDY(sn) ? '' : '  (chat room)') })));
    if (t.includes(cur)) sel.value = cur;
  };
  fill();
  return { sel, row: h('div', { class: 'row' }, h('b', { style: 'color:#fff', text: 'Victim:' }), sel, h('button', { class: 'btn sm', text: 'Refresh', onclick: fill })) };
}
function canProg() {
  if (!BC.on) { progLog('sign on 2 BuddyChat first!!!', '#ff4040'); SFX.error(); return false; }
  if (PROG.busy) { progLog('hold on, still busy...', '#ffd000'); return false; }
  return true;
}
function targetOnline(sn) { const b = BUDDY(sn); return b ? buddyAvailable(b.sn) : !!roomWith(sn); }

// ---- punter ----
function progPunter(host) {
  const tg = targetRow();
  const kind = h('select', { style: 'width:100%' }, Object.keys(PUNTS).map((k) => h('option', { value: k, text: PUNTS[k].label })));
  kind.value = 'mega';
  const code = h('div', { class: 'sel-text', style: 'background:#000;color:#ff6060;font:10px/1.3 "Courier New",monospace;padding:4px;height:42px;overflow:hidden;word-break:break-all;box-shadow:var(--in)' });
  const showCode = () => { const P = PUNTS[kind.value]; code.textContent = P.tag.repeat(40) + '...'; size.textContent = `= ${fmtBytes(P.tags)} tags, about ${fmtSize(P.tags * P.bytes)} in one IM. Works on 4.7 about ${Math.round(P.hit * 100)}% of the time.`; };
  const size = h('div', { style: 'font-size:11px;color:#ffd000' });
  kind.addEventListener('change', showCode); showCode();
  const go = h('button', { class: 'btn def', style: 'width:100%;height:32px;font-weight:bold;font-size:14px', text: 'PUNT!!!', onclick: () => { if (tg.sel.value) doPunt(tg.sel.value, kind.value); else progLog('pick a victim first', '#ffd000'); } });
  host.append(h('div', { class: 'col' }, tg.row, progLabel('Punt type'), kind, progLabel('What gets sent'), code, size, go,
    progNote('A punt is one IM that\'s nothing but tags. Older BuddyChat clients try to draw every one of them before showing the message, run out of memory, and close, which signs your victim off. People with <b style="color:#ddd">anti-punt</b> throw the IM away first. (It\'s all pretend: nobody\'s computer is harmed.)')));
}
async function doPunt(sn, kind = 'mega') {
  if (!canProg()) return false;
  const P = PUNTS[kind] || PUNTS.mega;
  const b = BUDDY(sn); if (b) sn = b.sn;
  if (!targetOnline(sn)) { progLog(sn + ' is not signed on', '#ff4040'); return false; }
  PROG.busy = true;
  progLog(`building punt: ${fmtBytes(P.tags)} x ${P.tag} (${fmtSize(P.tags * P.bytes)})...`);
  await sleep(0.8);
  progLog('sending IM 2 ' + sn + '...');
  const im = openIM(sn, true);
  imSys(im, `You sent ${sn} an IM with ${fmtBytes(P.tags)} ${P.tag} tags in it.`);
  SFX.imOut(); stat('punts');
  if (P.lag && PROG.w && !PROG.w.closed) {
    progLog('UlTrA punt is lagging ur computer 2... lol', '#ffd000');
    APP().classList.add('busy'); PROG.w.setTitle(PROG_NAME + ' (Not Responding)');
    await sleep(1.6);
    APP().classList.remove('busy'); if (!PROG.w.closed) PROG.w.setTitle(PROG_NAME + ' bY d4rK_ReAp3r');
  } else await sleep(1.2);
  PROG.busy = false;
  progStrike();
  if (!BC.on || !targetOnline(sn)) { progLog(sn + ' signed off before it got there', '#ffd000'); return false; }
  if (ANTIPUNT_SN.includes(sn)) {
    progLog(sn + ' has ANTI-PUNT!!! ur punt bounced', '#ff4040'); SFX.error();
    after(2.5, () => buddySay(sn, sn === 'cousinTJ' ? 'lol nice try. i have progz 2' : 'anti-punt ON lamer. ur turn'));
    after(5, () => buddySay(sn, 'my turn :-)'));
    after(7, () => getPunted(sn));
    return false;
  }
  if (!chance(P.hit)) {
    progLog(sn + ' has BuddyChat 4.7. punt didn\'t work. try a bigger one', '#ffd000');
    after(rnd(2, 4), () => targetOnline(sn) && buddySay(sn, pick(['why did u just send me a giant IM with nothing in it', 'my computer froze for a sec?? was that u', 'lol nice try'])));
    return false;
  }
  progLog(sn + ' got PUNTED!!! ;-)', '#40ff40');
  if (b) {
    const back = rnd(45, 90);
    buddySignOff(b.sn, back); delete BC.busy[b.sn];
    if (im && !im.closed) imSys(im, b.sn + '\'s BuddyChat stopped responding.');
    after(back + rnd(8, 16), () => { if (buddyAvailable(b.sn)) { buddySay(b.sn, PUNT_BACK[b.sn] || 'did u punt me??'); relAdd(b.sn, -3); } });
  } else {
    const w = roomWith(sn);
    w.people = w.people.filter((p) => p !== sn); roomSys(w, sn + ' has left the room.'); w.renderPeople(); SFX.doorClose();
    if (im && !im.closed) imSys(im, sn + ' signed off at ' + clockStr());
    after(rnd(1.5, 3), () => { const u = pick(w.people); if (u && !w.closed) roomSay(w, u, pick(['lol ' + sn + ' got punted', 'who punted ' + sn + '???', 'PUNTED lol', 'nice punt ' + S.sn, 'bye ' + sn + ' lol'])); });
  }
  unlock('punt'); stat('punted');
  return true;
}
// someone punts you
async function getPunted(from) {
  if (!BC.on || PROG.punting) return false;
  if (antiPuntOn()) {
    progLog(`ANTI-PUNT: threw away an IM from ${from} with ${fmtBytes(irnd(3000, 16000))} tags`, '#40ff40');
    toast('PhAnToM Anti-Punt', `Blocked a punt from <b>${esc(from)}</b>. Nice try, lamer.`, 'progz'); SFX.coin();
    unlock('antipunt'); stat('antipunt');
    after(2, () => { const w = roomWith(from); if (w) roomSay(w, from, pick(['wtf ' + S.sn + ' has anti-punt', 'man. anti-punt', 'lucky ' + S.sn])); else if (BUDDY(from)) buddySay(from, 'aw u have anti-punt. no fair'); });
    return false;
  }
  PROG.punting = true;
  const w = openIM(from, false);
  // the punt itself: a wall of tags BuddyChat tries to draw all at once
  const cols = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00', '#00ffff', '#000000', '#ff8000'];
  const junk = h('div', { style: 'line-height:.9;word-break:break-all' });
  for (let i = 0; i < 70; i++) junk.append(h('span', { style: `font:bold ${irnd(14, 64)}px ${pick(['Arial', 'Times New Roman', 'Courier New', 'Comic Sans MS'])};color:${pick(cols)};${chance(0.3) ? 'background:' + pick(cols) + ';' : ''}`, text: pick(['\u00FF', '\u00A4', '<h1>', '</font>', '\u2593', '\u2588', '\u00A7', '\u00BF', '\u25A0', '\u00D0', '<font size=999>', '\u00F1']).repeat(irnd(1, 4)) }));
  w.log.append(h('div', { html: `<b style="color:#ff0000">${esc(from)}</b>:` }), junk); w.log.scrollTop = w.log.scrollHeight;
  for (let i = 0; i < 3; i++) after(i * 0.15, () => SFX.imIn());
  APP().classList.add('busy');
  w.setTitle(from + ' - Instant Message (Not Responding)');
  if (BC.w && !BC.w.closed) BC.w.setTitle(S.sn + '\'s Buddy List (Not Responding)');
  await sleep(2.2);
  APP().classList.remove('busy');
  if (!w.closed) { w.setTitle(from + ' - Instant Message'); junk.remove(); imSys(w, '[this message was too big to display]'); }
  PROG.punting = false;
  if (!BC.on) return false;
  bcSignOff(); stat('gotpunted'); unlock('gotpunted');
  progLog('u got PUNTED by ' + from + '. turn on anti-punt!!!', '#ff4040');
  msgBox({ title: 'BCHAT', icon: 'error', task: true, text: 'BCHAT caused an invalid page fault in\nmodule HTMLVIEW.DLL at 0167:bff7a3c2.\n\nBuddyChat will now close.\n\n(You just got punted. Sign back on, and turn on anti-punt in a prog if you don\'t want it to happen again.)' });
  after(2, () => bongoInstalled() && bongoSay('Ouch! Somebody punted you! Bongo can install PuntShield for you. It\'s FREE!', { emote: 'sad' }));
  return true;
}

// ---- IM bomber ----
function progBomber(host) {
  const tg = targetRow();
  const msg = h('input', { type: 'text', value: 'U JUST GOT BOMBED bY ' + PROG_NAME + '!!!', style: 'width:100%' });
  const n = h('select', { style: 'width:100%' }, [10, 25, 50].map((v) => h('option', { value: v, text: v + ' times' })));
  host.append(h('div', { class: 'col' }, tg.row, progLabel('Message'), msg, progLabel('How many'), n,
    h('button', { class: 'btn def', style: 'width:100%;height:32px;font-weight:bold;font-size:14px', text: 'BOMB!!!', onclick: () => { if (tg.sel.value) doBomb(tg.sel.value, msg.value.trim() || 'bombed', +n.value); else progLog('pick a victim first', '#ffd000'); } }),
    progNote('An IM bomber just sends the same message over and over as fast as it can. BuddyChat\'s flood control cuts you off after 20, and the person on the other end usually <b style="color:#ddd">warns</b> you for it, which raises your warning level.')));
}
async function doBomb(sn, text, count = 25) {
  if (!canProg()) return false;
  const b = BUDDY(sn); if (b) sn = b.sn;
  if (!targetOnline(sn)) { progLog(sn + ' is not signed on', '#ff4040'); return false; }
  if (BC.warn >= 100) { progLog('ur warned 2 100%. u cant send anything', '#ff4040'); return false; }
  PROG.busy = true;
  const w = openIM(sn, true);
  progLog(`IM bombing ${sn} x${count}...`);
  let sent = 0;
  for (let i = 0; i < count; i++) {
    if (!BC.on || w.closed) break;
    if (i === 20) { imSys(w, 'Message not sent: you are sending messages too fast. Please slow down.'); progLog('flood control stopped it at 20 lol', '#ffd000'); break; }
    imLine(w, S.sn, text, true); sent++;
    if (i % 4 === 0) SFX.imOut();
    await sleep(0.08);
  }
  PROG.busy = false;
  stat('imbombs'); stat('ims', sent); unlock('imbomb'); progStrike();
  after(rnd(1.5, 3), () => {
    if (!BC.on || !targetOnline(sn)) return;
    buddySay(sn, b ? pick(['STOP!!!!', 'omg STOP IT', 'WHY', 'ok ur getting warned', 'r u serious']) : pick(['wtf', 'IM bomb? really? lol', 'lamer']));
    if (b) relAdd(b.sn, -2);
    after(1.5, () => progWarnMe(sn));
  });
  return sent;
}
function progWarnMe(sn) {
  if (!BC.on) return;
  BC.warn = Math.min(100, BC.warn + irnd(20, 35));
  imSys(BC.ims[sn], sn + ' warned you. Your warning level is now ' + Math.round(BC.warn) + '%.');
  SFX.warn(); bcRender();
}

// ---- fader ----
function hexMix(a, b, t) { const p = (s, i) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16); return '#' + [0, 1, 2].map((i) => Math.round(lerp(p(a, i), p(b, i), t)).toString(16).padStart(2, '0')).join(''); }
function fadeAt(stops, t) { const s = clamp(t, 0, 1) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(s)); return hexMix(stops[i], stops[i + 1], s - i); }
const leet = (t) => t.replace(/[aeiost]/gi, (c) => ({ a: '4', e: '3', i: '1', o: '0', s: 'z', t: '7' })[c.toLowerCase()]);
const wavy = (t) => { let k = 0; return t.replace(/[a-z]/gi, (c) => (k++ % 2 ? c.toUpperCase() : c.toLowerCase())); };
function fadeHTML(text, stops, o = {}) {
  let t = String(text); if (o.leet) t = leet(t); if (o.wavy) t = wavy(t);
  const ch = [...t], n = Math.max(1, ch.length - 1);
  const out = ch.map((c, i) => (c === ' ' ? ' ' : `<font color="${fadeAt(stops, i / n)}">${esc(c)}</font>`)).join('');
  return o.bold ? '<b>' + out + '</b>' : out;
}
function progFader(host) {
  const txt = h('input', { type: 'text', value: 'brb... or am i', style: 'width:100%' });
  const fade = h('select', { class: 'grow' }, Object.keys(FADES).map((k) => h('option', { value: k, text: k })));
  const opt = (label, on) => { const c = h('input', { type: 'checkbox', checked: on }); return [c, h('label', { class: 'row', style: 'gap:3px;color:#ddd' }, c, label)]; };
  const [wv, wvL] = opt('wAvY cApS', true), [lt, ltL] = opt('3l33t sp34k', false), [bd, bdL] = opt('bold', true);
  const prev = h('div', { style: 'background:#fff;color:#000;font:15px Arial;padding:8px;min-height:24px;box-shadow:var(--in);word-break:break-word' });
  const src = h('div', { class: 'sel-text', style: 'display:none;background:#000;color:#00e000;font:10px/1.3 "Courier New",monospace;padding:4px;max-height:58px;overflow:auto;word-break:break-all;box-shadow:var(--in)' });
  const html = () => fadeHTML(txt.value, FADES[fade.value], { wavy: wv.checked, leet: lt.checked, bold: bd.checked });
  const upd = () => { prev.innerHTML = html() || '&nbsp;'; src.textContent = html(); };
  for (const e of [txt, fade, wv, lt, bd]) e.addEventListener(e === txt ? 'input' : 'change', upd);
  upd();
  host.append(h('div', { class: 'col' }, progLabel('Text'), txt, h('div', { class: 'row' }, h('b', { style: 'color:#fff', text: 'Fade:' }), fade), h('div', { class: 'row', style: 'flex-wrap:wrap;gap:10px' }, wvL, ltL, bdL), prev,
    h('div', { class: 'row', style: 'flex-wrap:wrap;gap:3px' },
      h('button', { class: 'btn def', text: 'Set as Away Message', onclick: () => fadeToAway(html()) }),
      h('button', { class: 'btn', text: 'Add to Profile', onclick: () => { const v = html(); if (!txt.value.trim()) return; S.profile = (S.profile || '') + '<br>' + v; save(); unlock('profile'); progLog('added 2 ur profile', '#40ff40'); buddyComment('fader'); } }),
      h('button', { class: 'btn', text: 'Show HTML', onclick: (e) => { const on = src.style.display === 'none'; src.style.display = on ? '' : 'none'; e.target.textContent = on ? 'Hide HTML' : 'Show HTML'; } })),
    src, progNote('A fader wraps every single letter in its own <b style="color:#ddd">&lt;font color&gt;</b> tag, stepping the color a little each time.')));
}
function fadeToAway(html) {
  if (!html) return false;
  if (!BC.on) { progLog('sign on 2 BuddyChat first!!!', '#ff4040'); SFX.error(); return false; }
  S.aways = [html].concat((S.aways || AWAY_PRESETS).filter((p) => p !== html)).slice(0, 10); save();
  setAway(html);
  progLog('away message set. it looks SICK', '#40ff40');
  unlock('fader'); stat('fades'); buddyComment('fader');
  return true;
}

// ---- macros and prog ads in chat rooms ----
function openRooms() { return Object.values(BC.rooms).filter((w) => w && !w.closed); }
function progMacros(host) {
  const pickM = h('select', { class: 'grow' }, Object.keys(MACROS).map((k) => h('option', { value: k, text: k })));
  const pre = h('div', { style: 'background:#000;color:#00e000;font:12px/1.15 "Courier New",monospace;white-space:pre;padding:4px 6px;height:96px;overflow:auto;box-shadow:var(--in)' });
  pickM.addEventListener('change', () => { pre.textContent = MACROS[pickM.value]; }); pre.textContent = MACROS[pickM.value];
  const rooms = openRooms();
  const roomSel = h('select', { class: 'grow' }, rooms.length ? rooms.map((w) => h('option', { value: w.name, text: w.name })) : h('option', { value: '', text: '(join a chat room first)' }));
  host.append(h('div', { class: 'col' }, h('div', { class: 'row' }, h('b', { style: 'color:#fff', text: 'Macro:' }), pickM), pre,
    h('div', { class: 'row' }, h('b', { style: 'color:#fff', text: 'Room:' }), roomSel, h('button', { class: 'btn sm', text: 'Join Progz 4 Trade', onclick: () => { if (!BC.on) { progLog('sign on 2 BuddyChat first!!!', '#ff4040'); return; } joinRoom('Progz 4 Trade'); host.textContent = ''; progMacros(host); } })),
    h('div', { class: 'row' }, h('button', { class: 'btn def', text: 'Scroll It!!!', onclick: () => scrollMacro(roomSel.value, pickM.value) }), h('button', { class: 'btn', text: 'Send Prog Ad', onclick: () => progAd(roomSel.value) })),
    progNote('A scroller posts ASCII art into a chat room one line at a time, so it fills everybody\'s screen. A <b style="color:#ddd">prog ad</b> announces which prog you\'ve got loaded, in a fade.')));
}
function roomFor(name) { const w = name && BC.rooms[name]; return w && !w.closed ? w : openRooms()[0] || null; }
async function scrollMacro(roomName, macro) {
  if (!canProg()) return false;
  const w = roomFor(roomName);
  if (!w) { progLog('join a chat room first (try Progz 4 Trade)', '#ffd000'); return false; }
  PROG.busy = true;
  progLog('scrolling "' + macro + '" in ' + w.name + '...');
  for (const line of (MACROS[macro] || MACROS.LOL).split('\n')) {
    if (w.closed || !BC.on) break;
    roomSay(w, S.sn, '', true, `<span style="white-space:pre;font-family:'Courier New',monospace">${esc(line)}</span>`);
    await sleep(0.25);
  }
  PROG.busy = false;
  w.said++; stat('macros'); unlock('macro'); progStrike();
  const rx = w.name === 'Progz 4 Trade' ? ['scroll more!!!', 'phantom macros r so old', 'nice macro ' + S.sn, 'lol'] : ['SCROLLER!!!', 'stop scrolling', 'omg stop', 'ur gonna get TOSed', 'lol ' + S.sn + ' has progz', 'nice macro lol'];
  for (let i = 0; i < 2; i++) after(rnd(1.5, 4) + i * 2, () => { const u = pick(w.people); if (u && !w.closed) roomSay(w, u, pick(rx)); });
  return true;
}
function progAd(roomName) {
  if (!canProg()) return false;
  const w = roomFor(roomName);
  if (!w) { progLog('join a chat room first (try Progz 4 Trade)', '#ffd000'); return false; }
  roomSay(w, S.sn, '', true, fadeHTML('~*~ ' + PROG_NAME + ' ~*~ LoAdEd bY ' + S.sn + ' ~*~', FADES['Black & Red'], { bold: true }));
  stat('progads');
  after(rnd(2, 4), () => { const u = pick(w.people); if (u && !w.closed) roomSay(w, u, pick(['where can i get that prog', 'phantom is ok. 4.0 is coming out soon', 'lol another prog ad', 'u got a punter in that?', 'upload me phantom!!!'])); });
  return true;
}

// ---- options ----
function progOptions(host) {
  const ap = h('input', { type: 'checkbox', checked: !!S.antipunt, onchange: (e) => { S.antipunt = e.target.checked; save(); progLog('anti-punt: ' + (S.antipunt ? 'ON' : 'OFF'), S.antipunt ? '#40ff40' : '#ffd000'); } });
  host.append(h('div', { class: 'col' },
    h('label', { class: 'row', style: 'color:#fff;font-weight:bold;gap:4px' }, ap, 'Anti-Punt (keep this prog open)'),
    progNote('Anti-punt checks every IM before BuddyChat draws it and throws away any with a crazy number of tags in it. It only works while the prog is running.'),
    h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Read Me', onclick: () => openNotepad({ name: 'PHANTOM README.txt', text: PROG_README, ro: true }) }), h('button', { class: 'btn', text: 'Get More Progz', onclick: () => openBrowser('www.geopages.com/area51/progz/') })),
    h('div', { style: 'margin-top:10px;font:11px "Courier New",monospace;color:#9a9a9a;line-height:1.5', html: `${PROG_NAME} &bull; made in Visual Basic 4<br>bY d4rK_ReAp3r (age 15, not that its any of ur business)<br>TOS reports against u this session: <b style="color:${PROG.strikes ? '#ff4040' : '#40ff40'}">${PROG.strikes}</b>` })));
}

// ---- Terms of Service: people report you, AmeriNet warns you, then ends your session ----
MAIL_DB.tos = { from: 'AmeriNet TOS Staff', subj: 'Terms of Service Warning', at: 1e9, body: 'Dear {sn},<br><br>Our Community Action Team has received several reports that your screen name is using <b>third-party programs ("progz")</b> to disrupt other members: punting, IM bombing and scrolling in chat rooms.<br><br>These are violations of the AmeriNet Terms of Service. If they continue, your session will be ended.<br><br>And remember: a prog that promises FREE HOURS is lying to you.<br><br>AmeriNet Community Action Team' };
function progStrike() {
  PROG.strikes++;
  if (PROG.strikes === 3) after(4, () => { if (netOn()) { receiveMail('tos'); toast('AmeriNet', 'Someone reported you to AmeriNet. Check your mail!', 'amerinet'); } });
  if (PROG.strikes >= 5) {
    PROG.strikes = 0;
    after(3, () => {
      if (!netOn()) return;
      bcSignOff(); disconnect('tos'); unlock('tosd'); stat('tosd');
      msgBox({ title: 'AmeriNet', icon: 'error', winIcon: 'amerinet', task: true, text: 'Your AmeriNet session has been ended.\n\nMembers reported this screen name for punting, IM bombing and scrolling, which violate the AmeriNet Terms of Service.\n\nYou\'ve been TOS\'d. (You can sign back on. This time.)' });
    });
  }
}

// ---- the progz chat room, where somebody always has a punter ----
ROOMS['Progz 4 Trade'] = { users: ['xX_PuNtEr_Xx', 'ProgMaster2k1', 'l33t_h4x0r', 'ScRoLLeR_KiNg', 'TOS_magnet', 'warez_kid99', 'n00b_hunter', 'FaDeR_GuRL'],
  lines: ['who got phantom 3.2', 'any1 got a punter that works on 4.7???', 'UPLOAD ME PROGZ', 'anti-punt ON. try me lamers', 'trading progz 4 buddy icons', 'dont run FREE_HOURS.exe its a trojan lol', 'get progz @ www.geopages.com/area51/progz', 'if u dont have anti-punt ur gonna get punted lol', 'who wants 2 b punted', 'my prog has 400 macros', 'vb40032.dll not found?? u need the dll n00b', 'TOS is in here. act normal', 'i got TOSed 3 times this week lol', 'faders r so 1999', 'whos making a prog in vb'] };
every(3, () => {
  const w = BC.rooms['Progz 4 Trade'];
  if (!w || w.closed || !BC.on || PROG.punting || w.puntDone || T.t - (w.joined || 0) < 30 || !chance(0.08)) return;
  const u = pick(w.people); if (!u) return;
  w.puntDone = true;
  roomSay(w, u, pick(['lol ' + S.sn + ' looks like a n00b', 'hey ' + S.sn + ' u got anti-punt?', 'bye bye ' + S.sn + ' lol', 'watch this. ' + S.sn + ' is gone']));
  after(2.5, () => getPunted(u));
});

// ---- the web: the progz site, a search result, and a link from the cheat site ----
SEARCH_DB.push(['progz prog progs punter punt fader hack hacker buddychat', 'www.geopages.com/area51/progz/', 'd4rK_ReAp3r\'z PrOgZ PaLaCe', 'PhAnToM 3.2, punterz, faderz, IM bomberz, macroz. NO LAMERZ!!!']);
GEO_EXTRA['area51/progz'] = () => pageShell('', `<div style="background:#000;color:#00e000;padding:16px;margin:-14px;font-family:'Courier New',monospace;min-height:340px">
  <div style="text-align:center"><h1 style="color:#ff2020;text-shadow:2px 2px #600;font-family:Impact,'Arial Black',sans-serif;letter-spacing:2px;margin:4px 0">d4rK_ReAp3r'z PrOgZ PaLaCe</h1>
  <marquee style="color:#ffd400">*** NO LAMERZ *** NO TOS *** NO NARCS *** greetz 2 all my boyz in Progz 4 Trade ***</marquee>
  <div style="margin:6px 0">u r visitor # ${hitCounter(31337)}</div></div>
  <p>welcome 2 the palace. here u can get the most 3L33T progz 4 BuddyChat. punterz, faderz, IM bomberz, macroz. EVERYTHING.</p>
  <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;border-color:#0a0;font-size:12px">
  <tr style="color:#ffd400"><th align="left">prog</th><th>size</th><th>get it</th></tr>
  <tr><td><b style="color:#ff4040">PhAnToM 3.2</b><br>punter, IM bomber, fader, macro scroller, ANTI-PUNT. the best prog EVER made</td><td align="center">402K</td><td align="center">${dlink('download', 'phantom')}</td></tr>
  <tr><td><b style="color:#fff">vb40032.dll</b><br>U NEED THIS 2 RUN ANY PROG!!! dont email me asking why it doesnt work</td><td align="center">704K</td><td align="center">${dlink('download', 'vbdll')}</td></tr>
  <tr><td><b style="color:#40c0ff">FREE_HOURS.exe</b><br>free AmeriNet hours generator!!! unlimited hours!!! (not tested)</td><td align="center">55K</td><td align="center">${dlink('download', 'freehours')}</td></tr>
  <tr><td><b style="color:#888">PhAnToM 4.0</b><br>coming soon!!!</td><td align="center">-</td><td align="center" style="color:#888">soon</td></tr>
  </table>
  <p style="color:#888;font-size:11px">4 educational purposez only. if u get TOSed its not my fault. if ur reading this ur a lamer. sign my ${link('guestbook', 'www.geopages.com/area51/7734/guestbook')} (its my friends page, i dont have 1 yet)</p></div>`, { raw: true, title: 'PrOgZ PaLaCe' });
