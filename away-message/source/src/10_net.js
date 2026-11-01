// AmeriNet Online: the dial-up connection, Mom and the shared phone line, and AmeriNet Mail.
const NET = { state: 'off', since: 0, online: 0, momT: 0, momOpen: false, attempts: 0, w: null };
function netOn() { return NET.state === 'on'; }
async function needNet(what) {
  if (netOn()) return true;
  const b = await msgBox({ title: what || 'Not connected', icon: 'question', text: 'You are not connected to the Internet.\n\nDo you want to connect with AmeriNet Online now?', buttons: ['Connect', 'Work Offline'] });
  if (b === 'Connect') { openAmeriNet(); if (NET.state === 'off') connect(); }
  return false;
}
const SN_IDEAS = ['sk8rgrl2001', 'xXpunkr0ckXx', 'lil_shorty14', 'Kewl_Kid_88', 'dancingqueen01', 'BlinkFan182', 'xXDragonXx', 'SweetPea2001', 'ChillinVillain', 'pizzaboi99', 'StarGazer_x', 'n00bslayer'];
async function pickScreenName() {
  const sug = h('div', { class: 'row', style: 'flex-wrap:wrap;gap:3px;margin-top:2px' }, shuffle(SN_IDEAS.slice()).slice(0, 5).map((n) => h('button', { class: 'btn sm', text: n, onclick: (e) => { const i = e.target.closest('.win').querySelector('input'); i.value = n; i.focus(); } })));
  const v = await inputBox({ title: 'AmeriNet - New Member', icon: 'amerinet', w: 380, text: '<b>Choose your screen name!</b><br>3 to 16 letters and numbers. This is how everyone online will know you, so make it count.', value: '', max: 16, extra: sug, ok: 'Continue' });
  if (v == null) return null;
  const sn = v.replace(/[^A-Za-z0-9_ ]/g, '').trim().slice(0, 16);
  if (sn.length < 3) { await msgBox({ title: 'AmeriNet', icon: 'error', text: 'That screen name is too short. Try something with a few more letters (and maybe an x or two).' }); return pickScreenName(); }
  if (/^(jenny4eva|SkaterDude182|xXDarkAngelXx)$/i.test(sn)) { await msgBox({ title: 'AmeriNet', icon: 'error', text: `Sorry, the screen name "${sn}" is already taken. How about "${sn}${irnd(2, 99)}"?` }); return pickScreenName(); }
  S.sn = sn; save(); emit('sn', sn);
  return sn;
}
function openAmeriNet() {
  if (NET.w && !NET.w.closed) { NET.w.restore(); NET.w.focus(); return NET.w; }
  const body = h('div', { class: 'col grow', style: 'gap:0;min-height:0' });
  const w = NET.w = openWin({ key: 'amerinet', title: 'AmeriNet Online', icon: 'amerinet', w: 430, h: 360, body, resizable: false, small: true, menu: [{ label: 'File', items: () => [{ label: netOn() ? 'Sign Off' : 'Sign On', act: () => (netOn() ? disconnect('user') : connect()) }, { sep: 1 }, { label: 'Exit', act: () => w.close() }] }, { label: 'Mail', items: [{ label: 'Read Mail', act: openMail }] }, { label: 'Help', items: [{ label: 'Getting online', act: () => openHelp(1) }] }] });
  w.render = () => renderAmeriNet(w, body);
  w.render();
  return w;
}
function amLogo() {
  return h('div', { style: 'background:linear-gradient(160deg,#0b2a7a,#1a6ad0 60%,#6fb4ff);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;flex:none' }, img('amerinet', 32),
    h('div', null, h('div', { style: 'font:bold italic 24px Arial;letter-spacing:-.5px', html: 'Ameri<span style="color:#ffd400">Net</span> Online' }), h('div', { style: 'font-size:11px;opacity:.85', text: 'Version 5.0 • So easy to use, no wonder it\'s #2!' })));
}
function renderAmeriNet(w, body) {
  body.textContent = ''; body.append(amLogo());
  const pad = h('div', { class: 'pad col grow', style: 'gap:8px' }); body.append(pad);
  if (NET.state === 'off') {
    const sel = h('select', { class: 'grow' }, S.sn ? h('option', { value: S.sn, text: S.sn }) : null, h('option', { value: '__new', text: 'New User' }));
    const pw = h('input', { type: 'password', value: S.sn ? 'hunter22' : '', class: 'grow', disabled: !S.sn });
    sel.addEventListener('change', () => { pw.disabled = sel.value === '__new'; pw.value = pw.disabled ? '' : 'hunter22'; });
    const go = h('button', { class: 'btn def', style: 'height:30px;font-weight:bold;min-width:110px', text: 'SIGN ON', onclick: async () => { if (sel.value === '__new' || !S.sn) { if (!(await pickScreenName())) return; } connect(); } });
    pad.append(h('div', { class: 'row' }, h('span', { style: 'width:120px', text: 'Select Screen Name:' }), sel), h('div', { class: 'row' }, h('span', { style: 'width:120px', text: 'Enter Password:' }), pw), h('div', { class: 'row' }, h('span', { style: 'width:120px', text: 'Select Location:' }), h('select', { class: 'grow' }, h('option', null, 'Home (56K modem)'), h('option', null, 'Grandma\'s house'))),
      h('div', { class: 'grow' }), h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Setup', onclick: openModems }), h('button', { class: 'btn', text: 'Help', onclick: () => openHelp(1) }), h('div', { class: 'grow' }), go));
  } else if (NET.state === 'dialing') {
    const steps = [['phone', 'Step 1: Dialing 555-0142...'], ['modem', 'Step 2: Connecting at 44,000 bps'], ['key', 'Step 3: Checking password']];
    const row = h('div', { class: 'row', style: 'justify-content:space-around;margin:14px 0 6px' }, steps.map(([ic], i) => h('div', { style: `padding:10px;box-shadow:var(--in);background:${i <= NET.step ? '#fff' : '#a0a0a0'};opacity:${i <= NET.step ? 1 : 0.45}` }, img(ic, 32))));
    pad.append(row, h('div', { style: 'text-align:center;font-weight:bold;font-size:13px', text: steps[Math.min(2, NET.step)][1] }), h('div', { class: 'grow' }), h('div', { class: 'btns c' }, h('button', { class: 'btn', text: 'Cancel', onclick: () => { NET.cancel = true; } })));
  } else {
    const unread = S.mail.filter((m) => !m.read).length;
    pad.append(h('div', { style: 'font:bold 17px Arial', text: 'Welcome, ' + S.sn + '!' }),
      h('button', { class: 'btn', style: 'height:48px;display:flex;align-items:center;gap:10px;justify-content:flex-start', onclick: openMail }, img('mail', 32), h('span', { style: 'font-size:13px', html: unread ? `<b>You got mail!</b> (${unread} new)` : 'No new mail' })),
      h('div', { class: 'row', style: 'flex-wrap:wrap' }, [['globe', 'Internet', () => openBrowser()], ['buddy', 'BuddyChat', () => openBuddyChat()], ['snapster', 'Snapster', () => openSnapster()]].map(([ic, t, f]) => h('button', { class: 'btn', style: 'height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-width:90px', onclick: f }, img(ic, 24), t))),
      h('div', { class: 'grow' }), h('div', { class: 'row' }, h('span', { class: 'grow dim', text: 'Connected at 44,000 bps' }), h('button', { class: 'btn', text: 'Sign Off', onclick: () => disconnect('user') })));
  }
}
async function connect() {
  if (NET.state !== 'off') return;
  if (!S.sn) { openAmeriNet(); if (!(await pickScreenName())) return; }
  NET.state = 'dialing'; NET.step = 0; NET.cancel = false; NET.attempts++;
  const w = openAmeriNet(); w.render();
  emit('net', 'dialing');
  const dur = SFX.modem() || 9;
  const busy = NET.attempts === 2 && chance(0.5);
  for (const [t, st] of [[dur * 0.36, 1], [dur * 0.78, 2], [dur, 3]]) {
    while (T.t < 0) await sleep(0.1);
    const t0 = T.t; let waited = 0;
    while (waited < t - (st === 1 ? 0 : [0, dur * 0.36, dur * 0.78][st - 1])) { await sleep(0.1); waited = T.t - t0; if (NET.cancel) break; }
    if (NET.cancel) break;
    if (busy && st === 1) { NET.state = 'off'; if (!w.closed) w.render(); tone({ f: 480, d: 0.5, v: 0.08 }); tone({ f: 620, d: 0.5, v: 0.08 }); tone({ f: 480, t: 1, d: 0.5, v: 0.08 }); tone({ f: 620, t: 1, d: 0.5, v: 0.08 }); msgBox({ title: 'AmeriNet', icon: 'error', text: 'The number you dialed is busy. All of AmeriNet is online right now.\n\nPlease try again.' }); return; }
    NET.step = st; if (!w.closed) w.render();
  }
  if (NET.cancel) { NET.state = 'off'; if (AU.ctx) { AU.sfx.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.02); setTimeout(() => AU.sfx.gain.setTargetAtTime(0.55, AU.ctx.currentTime, 0.02), 300); } if (!w.closed) w.render(); emit('net', 'off'); return; }
  NET.state = 'on'; NET.since = T.t;
  traySet('modem', { icon: 'modemon', title: 'Connected to AmeriNet at 44,000 bps', dbl: netStatus, ctx: () => [{ label: '<b>Status</b>', act: netStatus }, { label: 'Disconnect', act: () => disconnect('user') }] });
  if (!w.closed) w.render();
  unlock('connect'); stat('connects');
  if (!S.mail.length) receiveMail('welcome', true);
  const unread = S.mail.filter((m) => !m.read).length;
  after(0.6, () => SPEECH.say(unread ? 'Welcome! You got mail!' : 'Welcome!', { voice: 'system', pitch: 0.95, rate: 0.95 }));
  scheduleMom(NET.attempts > 1 ? rnd(240, 420) : rnd(170, 300));
  emit('net', 'on');
}
function disconnect(why = 'user') {
  if (NET.state === 'off') return;
  const was = NET.state; NET.state = 'off';
  cancel(NET.momT); NET.momT = 0;
  trayRemove('modem');
  if (NET.w && !NET.w.closed) NET.w.render();
  if (was === 'on') { NET.online += T.t - NET.since; emit('net', 'off'); emit('disconnect', why); }
  if (why === 'user') SFX.doorClose();
  if (why === 'user' && was === 'on') after(0.3, () => SPEECH.say('Goodbye!', { voice: 'system' }));
}
function netStatus() {
  const t = netOn() ? T.t - NET.since : 0;
  msgBox({ title: 'Connected to AmeriNet', icon: 'modemon', html: `Connected at 44,000 bps<br>Duration: ${fmtTime(t)}<br>Bytes received: ${fmtBytes(Math.round(t * 4300))}<br>Bytes sent: ${fmtBytes(Math.round(t * 610))}<br><br>Server type: PPP: Internet, Windoze NT Server, Windoze 98`, buttons: ['OK', 'Disconnect'] }).then((b) => b === 'Disconnect' && disconnect('user'));
}

// ---- Mom ----
const MOM_LINES = [
  'Are you on the Internet AGAIN? I need to call your Aunt Linda!',
  'Honey, I\'m expecting a call from the bank. Get off the computer, please.',
  'Who is tying up the phone line?! Grandma has been trying to call for an hour!',
  'I need the phone to order a pizza. Do you want pizza or do you want the Internet?',
  'Your father wants to check the baseball scores. On the PHONE. Off you go.',
];
function scheduleMom(sec) { cancel(NET.momT); NET.momT = after(sec, momEvent); }
async function momEvent(stage = 1) {
  if (!netOn() || NET.momOpen) return;
  NET.momOpen = true;
  const text = stage === 1 ? pick(MOM_LINES) : 'That was FIVE MINUTES. I\'m picking up the phone in ten seconds, I mean it.';
  SPEECH.say(stage === 1 ? 'Hey! Are you on the Internet?' : 'That was five minutes!', { voice: 'system', pitch: 1.1, rate: 1.05 });
  const b = await msgBox({ title: 'Mom', icon: 'user', winIcon: 'user', task: true, text, buttons: stage === 1 ? ['Getting off now!', '5 more minutes!!', 'Ignore her'] : ['OK, OK, signing off!', 'Ignore her'] });
  NET.momOpen = false;
  if (!netOn()) return;
  if (/Getting off|signing off/.test(b)) { disconnect('user'); stat('momHappy'); unlock('goodkid'); after(1, () => SPEECH.say('Thank you, sweetie.', { voice: 'system', pitch: 1.1 })); return; }
  if (/5 more/.test(b)) { unlock('fivemore'); stat('fivemore'); NET.momT = after(rnd(80, 140), () => momEvent(2)); return; }
  NET.momT = after(rnd(7, 14), momPickup);
}
function momPickup() {
  if (!netOn()) return;
  SFX.pickup();
  after(0.4, () => SPEECH.say('Hello? Hello?! Ugh, that screeching!', { voice: 'system', pitch: 1.1, rate: 1.05 }));
  disconnect('mom');
  stat('momPickup'); unlock('mom');
  after(0.6, () => msgBox({ title: 'AmeriNet Online', icon: 'error', text: 'You have been disconnected from AmeriNet.\n\nLost carrier. Someone picked up the phone.', task: true }));
}

// ---- Mail ----
const MAIL_DB = {
  welcome: { from: 'AmeriNet Staff', subj: 'Welcome to AmeriNet, {sn}!', at: 0, body: 'Dear {sn},<br><br>Welcome to <b>AmeriNet Online</b>, the #2 online service in America! Here are a few things to try:<br><br>• Chat with friends on <b>BuddyChat</b><br>• Surf the World Wide Web with <b>Internet Exploder</b><br>• Visit <a data-href="www.askgeeves.com/">Ask Geeves</a> to find anything<br><br>Remember: never give your password to anyone, even if they say they work for AmeriNet. <i>Especially</i> then.<br><br>See you online!<br>The AmeriNet Team' },
  chain: { from: 'auntlinda_quilts', subj: 'FW: FW: FW: FW: FW: Bill Grates is giving away $$$ - THIS IS REAL!!!', at: 25, chain: true, body: '&gt;&gt;&gt;&gt;&gt;&gt;&gt; i checked with snopez and this is REAL!!!!!<br>&gt;&gt;&gt;&gt;&gt; Dear Friends, please do not take this for a junk letter. Bill Grates is sharing his fortune. If you ignore this, you will repent later. Microsloth and AmeriNet are now the largest Internet company, and to make sure Internet Exploder remains the most widely used program, they are testing an e-mail tracking program.<br>&gt;&gt;&gt; When you forward this e-mail to friends, Microsloth can track it for two weeks. For every person you forward it to, Microsloth will pay you <b>$245.00</b>. For every person they send it to, you get $243!!!<br>&gt;&gt; My cousin\'s neighbor is a lawyer and she got a check for $4,312.44!!!<br><br>Love, Aunt Linda<br>PS how do i make the letters smaller' },
  survey: { from: 'jenny4eva', subj: 'FW: get 2 kno ur friends survey!!! :) :) :)', at: 70, chain: true, body: 'fill it out and send it back!!! and send it 2 ur friends 2!!! &lt;3<br><br>~*~*~*~*~*~*~*~<br>NAME: jenny<br>AGE: 14 (15 in august!!!)<br>FAVE COLOR: purple and silver<br>FAVE BAND: *NSYNK obviously<br>FAVE MOVIE: the one with the lady and the ghost<br>CRUSH: none of ur business :P<br>DO U BELIEVE IN LOVE AT 1ST SITE: ... maybe<br>WHAT R U WEARING RITE NOW: pajama pants!!!<br>LAST PERSON U IMED: ' + '{sn}' + '<br>~*~*~*~*~*~*~*~<br><br>if u dont send this 2 10 ppl u will have bad luck in love 4 ever!!!!!' },
  admirer: { from: 'cousinTJ', subj: 'u have a secret admirer!!!', at: 130, body: 'someone in ur class likes u. open the file to find out who!!! (its not me lol)', attach: { name: 'secret_admirer.txt.vbs', size: 10342, payload: 'admirer' } },
  hamster: { from: 'SkaterDude182', subj: 'dude u HAVE to see this lol', at: 200, body: 'my brother sent me this. i watched it like 40 times. its the funniest thing on the whole internet<br><br>-skater', attach: { name: 'gerbil_dance.exe', size: 284112, app: 'gerbilshow' } },
  bongopremium: { from: 'BongoBuddy Team', subj: 'Congratulations! You qualify for Bongo Deluxe FREE!!!', at: 280, needBongo: true, body: '<div style="color:#c0207a;font:bold 16px Arial">Bongo loves you!</div>Thanks for using <b>Bongo Buddy</b>, the #1 FREE desktop friend! As a valued member, you can now upgrade to <b>Bongo Deluxe</b> with 40 new jokes, the Bongo Toolbar and SmileyPal for FREE!!!<br><br><a data-href="www.bongobuddy.com/">Click here to upgrade now!</a><br><br><span style="font-size:9px;color:#888">By clicking you agree to the 47-page license agreement, which permits Bongo to display offers, change your home page, monitor your browsing for quality purposes, and live forever.</span>' },
  snapnews: { from: 'Snapster', subj: 'Snapster News: we\'re still here!', at: 360, body: 'Hi {sn},<br><br>You may have heard that the band <b>Metallicuh</b> is suing Snapster. Don\'t worry! Snapster is still FREE and will stay free forever*.<br><br>We\'ve blocked Metallicuh songs at the band\'s request. Please stop searching for "Enter Sandwich."<br><br>Keep sharing!<br>- Shawn and the Snapster crew<br><br><span style="font-size:9px">*forever not guaranteed</span>' },
  spam: { from: 'MONEY-MAKER-2001', subj: 'Make $$$ from home!!! NOT A SCAM!!!', at: 440, body: '<div style="color:#090;font:bold 18px Arial">EARN $5,000 A WEEK FROM HOME!!!</div>Our <b>MoneyMaker 2001</b> software does EVERYTHING for you. Just download and run it. Thousands of satisfied customers (we cannot name them for privacy reasons).<br><br>Attached is your FREE copy!!! Act now, this offer expires in 24 HOURS.', attach: { name: 'MoneyMaker2001.exe', size: 98304, payload: 'popups' } },
  poem: { from: 'xXDarkAngelXx', subj: 'new poem. dont show anyone', at: 520, body: '<i>the rain falls<br>like my tears<br>but nobody sees the rain<br>because they are inside<br>watching tv<br>&nbsp;&nbsp;&nbsp;&nbsp;- xx angel xx</i><br><br>its on my geopages too. sign my guestbook if u want. or dont. whatever.<br><a data-href="www.geopages.com/area51/7734/">www.geopages.com/area51/7734</a>' },
};
const mailFill = (s) => s.replace(/\{sn\}/g, esc(S.sn || 'friend'));
function receiveMail(id, quiet) {
  if (S.mail.some((m) => m.id === id)) return;
  S.mail.push({ id, read: false, date: shortDate() }); save();
  if (!quiet) { SFX.mail(); after(0.2, () => SPEECH.say('You got mail!', { voice: 'system', pitch: 0.95 })); }
  emit('mail', id);
  if (NET.w && !NET.w.closed) NET.w.render();
}
on('boot', () => onTick(() => {
  if (!netOn()) return;
  const online = NET.online + T.t - NET.since;
  for (const id in MAIL_DB) { const M = MAIL_DB[id]; if (online >= M.at && !S.mail.some((m) => m.id === id) && (!M.needBongo || S.bongo.installed)) { receiveMail(id); break; } }
}));
function openMail() {
  let w, cur = null;
  const preview = h('div', { class: 'field sel-text', style: 'flex:1;min-height:80px;overflow:auto;padding:8px;font:12px/1.45 Arial,sans-serif' });
  const lv = listView([{ label: '', w: 22 }, { label: 'From', w: 130 }, { label: 'Subject', w: 280 }, { label: 'Date', w: 110 }], { onSelect: (r) => show(r.m) });
  const attachBtn = h('button', { class: 'btn', text: 'Download Attachment', disabled: true });
  const fwdBtn = h('button', { class: 'btn', text: 'Forward', disabled: true });
  const delBtn = h('button', { class: 'btn', text: 'Delete', disabled: true });
  const refresh = () => lv.set(S.mail.slice().reverse().filter((m) => MAIL_DB[m.id] && !m.deleted).map((m) => ({ m, cells: [img(m.read ? 'mail' : 'mail', 16), MAIL_DB[m.id].from, h('span', { style: m.read ? '' : 'font-weight:bold', text: mailFill(MAIL_DB[m.id].subj).replace(/&#39;/g, "'") }), m.date] })));
  const show = (m) => {
    cur = m; const M = MAIL_DB[m.id];
    if (!m.read) { m.read = true; save(); refresh(); lv.select(lv.rows.findIndex((r) => r.m === m)); if (NET.w && !NET.w.closed) NET.w.render(); stat('mailread'); unlock('mail'); }
    preview.innerHTML = `<b>From:</b> ${esc(M.from)}<br><b>Subject:</b> ${mailFill(M.subj)}<hr>${mailFill(M.body)}` + (M.attach ? `<hr><img src="${icon(fileIcon(M.attach), 16)}" style="vertical-align:-3px"> <b>File:</b> ${esc(displayName(M.attach))} (${fmtSize(M.attach.size)})` : '');
    attachBtn.disabled = !M.attach || m.got; fwdBtn.disabled = false; delBtn.disabled = false;
  };
  preview.addEventListener('click', (e) => { const a = e.target.closest('[data-href]'); if (a) { e.preventDefault(); openBrowser(a.dataset.href); } });
  attachBtn.onclick = async () => {
    const M = MAIL_DB[cur.id]; if (!M.attach) return;
    const b = await msgBox({ title: 'Download Manager', icon: 'warn', text: `You are about to download "${displayName(M.attach)}".\n\nFiles from people you don't know can contain viruses. Download anyway?`, buttons: ['Download Now', 'Cancel'] });
    if (b !== 'Download Now') return;
    cur.got = true; save(); attachBtn.disabled = true;
    const f = addFile(Object.assign({ dir: 'desktop' }, M.attach));
    msgBox({ title: 'Download Manager', icon: 'info', text: `Download complete.\n\n"${displayName(f)}" was saved to your Desktop.` });
  };
  fwdBtn.onclick = async () => {
    const M = MAIL_DB[cur.id];
    const b = await msgBox({ title: 'Forward Mail', icon: 'mail', winIcon: 'mail', text: 'Forward this message to everyone in your Address Book (all of your buddies)?', buttons: ['Forward to All', 'Cancel'] });
    if (b !== 'Forward to All') return;
    stat('forwards'); SFX.imOut();
    if (M.chain) unlock('chain');
    emit('forward', cur.id);
    msgBox({ title: 'Mail', icon: 'info', text: 'Your message has been sent to 10 people.' + (M.chain ? '\n\nBill Grates will be in touch. Any day now.' : '') });
  };
  delBtn.onclick = () => { cur.deleted = true; save(); preview.textContent = ''; refresh(); delBtn.disabled = fwdBtn.disabled = attachBtn.disabled = true; };
  const body = h('div', { class: 'col grow pad', style: 'min-height:0;gap:6px' }, h('div', { class: 'row' }, img('mail', 24), h('b', { style: 'font-size:13px', text: 'Mailbox for ' + (S.sn || 'Guest') }), h('div', { class: 'grow' }), fwdBtn, delBtn, attachBtn), h('div', { style: 'flex:1.1;min-height:90px;display:flex' }, lv), preview);
  w = openWin({ key: 'mail', title: 'AmeriNet Mail', icon: 'mail', w: 620, h: 440, body, status: [netOn() ? 'Online' : 'Offline: showing saved mail'] });
  refresh();
  const off = () => { if (!w.closed) refresh(); };
  on('mail', off);
  if (lv.rows.length) { const i = lv.rows.findIndex((r) => !r.m.read); lv.select(i >= 0 ? i : 0); }
  return w;
}
