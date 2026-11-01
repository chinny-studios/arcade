// Internet Exploder and a tiny fake World Wide Web of 2001: the AmeriNet portal, a search engine, download sites
// (where you find apps and the odd virus), personal GeoPages with guestbooks, and the obligatory under-construction.
const SITES = {};
function site(host, fn) { SITES[host.replace(/^https?:\/\//, '').replace(/\/$/, '')] = fn; }
function normURL(u) { u = (u || '').trim(); if (!/^[a-z]+:/.test(u)) u = 'http://' + u; return u; }
function hostOf(u) { return normURL(u).replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase(); }
function openBrowser(url) {
  if (!url) url = S.homepage || 'http://www.amerinet.com/';
  const existing = WM.wins.find((w) => w.key === 'ie' && !w.closed);
  if (existing) { existing.restore(); existing.focus(); existing.nav(url); return existing; }
  const addr = h('input', { type: 'text', style: 'width:100%' });
  const page = h('div', { class: 'grow', style: 'overflow:auto;background:#fff;min-height:0' });
  const statusBar = h('span', { class: 'grow', text: 'Done' });
  const histBack = [], histFwd = [];
  const w = openWin({ key: 'ie', title: 'Internet Exploder', icon: 'globe', w: 640, h: 460, minW: 420, body: h('div', { class: 'col grow', style: 'gap:0;min-height:0' },
    h('div', { class: 'row', style: 'padding:2px 4px;gap:3px;flex:none' }, nbtn('back', 'Back', () => { if (histBack.length > 1) { histFwd.push(histBack.pop()); w.nav(histBack[histBack.length - 1], true); } }), nbtn('fwd', 'Forward', () => { if (histFwd.length) w.nav(histFwd.pop(), true); }), nbtn('x', 'Stop', () => {}), nbtn('refresh', 'Refresh', () => w.nav(w.url)), nbtn('home', 'Home', () => w.nav(S.homepage))),
    toolbarFor(), h('div', { class: 'addr' }, h('span', { text: 'Address' }), h('div', { class: 'field', style: 'flex:1;gap:4px' }, img('globe', 16), addr), h('button', { class: 'btn sm', text: 'Go', onclick: () => w.nav(addr.value) })),
    page), status: ['', { text: '', style: 'width:90px' }] });
  w.page = page; w.addr = addr; w.statusBar = statusBar;
  w.setStatus(0, statusBar); w.setStatus(1, h('span', { class: 'row', style: 'gap:3px' }, img('globe', 16), 'Internet'));
  addr.addEventListener('keydown', (e) => { if (e.key === 'Enter') w.nav(addr.value); });
  page.addEventListener('click', (e) => { const a = e.target.closest('[data-href]'); if (a) { e.preventDefault(); w.nav(a.dataset.href); } const d = e.target.closest('[data-dl]'); if (d) { e.preventDefault(); webDownload(d.dataset.dl); } });
  w.nav = (url, noHist) => browserNav(w, url, noHist, histBack, histFwd);
  w.nav(url);
  unlock('browse');
  return w;
}
function nbtn(ic, t, fn) { return h('button', { class: 'btn sm', style: 'min-width:0;display:flex;align-items:center;gap:3px', onclick: fn, title: t }, img({ back: 'find', fwd: 'find', home: 'amerinet', refresh: 'globe', x: 'error' }[ic] || 'globe', 16), t); }
function toolbarFor() {
  const bars = [];
  if (S.bongo.adware.includes('bongobar')) bars.push(['BongoBar', '#ff8ac4', ['Search the Web with Bongo!', 'Smileys', 'Weather', 'Bongo!']]);
  if (S.bongo.adware.includes('smileypal')) bars.push(['SmileyPal', '#ffe066', [':) :D ;) :P :( >:(  9000 more!']]);
  if (!bars.length) return h('div', { style: 'display:none' });
  return h('div', { class: 'col', style: 'flex:none' }, bars.map(([n, c, items]) => h('div', { class: 'row', style: `background:${c};padding:2px 4px;gap:6px;font-size:10px;overflow:hidden;white-space:nowrap`, onclick: () => bongoAdPopup() }, h('b', { text: n }), items.map((i) => h('span', { text: i })))));
}
async function browserNav(w, url, noHist, back, fwd) {
  url = normURL(url); w.url = url; w.addr.value = url;
  if (!noHist) { back.push(url); fwd.length = 0; }
  const host = hostOf(url);
  if (!netOn() && host !== 'about:blank' && !/^about:/.test(url)) {
    w.page.innerHTML = pageShell('The page cannot be displayed', `<p>You are not connected to the Internet. Internet Exploder cannot display this page.</p><p>Sign on to AmeriNet and try again.</p><p><button class="btn" onclick="(window.__amerinet||function(){})()">Connect with AmeriNet</button></p>`);
    const b = w.page.querySelector('button'); if (b) b.onclick = () => { openAmeriNet(); connect(); };
    w.setTitle('The page cannot be displayed - Internet Exploder'); w.statusBar.textContent = 'Done'; return;
  }
  w.setTitle('Working... - Internet Exploder'); w.statusBar.textContent = 'Opening page ' + host + '...';
  APP().classList.add('busy');
  w.page.innerHTML = '';
  stat('pageviews');
  const slow = (S.bongo.adware.length) ? 1.4 : 1;
  await sleep(rnd(0.4, 1.2) * slow);
  APP().classList.remove('busy');
  const fn = SITES[host] || SITES[host.replace(/^www\./, '')] || (host.replace(/^www\./, '').match(/^(geopages\.com|angelfyre\.com)/) ? SITES['geopages.com'] : null);
  let title = host;
  if (fn) { const r = fn(w, host, url); if (r && r.title) title = r.title; w.page.innerHTML = w.page.innerHTML || ''; if (typeof r === 'string') w.page.innerHTML = r; }
  else { w.page.innerHTML = notFound(host); title = 'Cannot find server'; }
  w.setTitle(title + ' - Internet Exploder');
  w.statusBar.textContent = 'Done';
  if (/bongosearch|bongobuddy/.test(host)) unlock('bongosite');
}
function pageShell(title, body, o = {}) {
  return `<div style="font:14px/1.5 'Times New Roman',serif;padding:0">${o.raw ? '' : `<div style="background:${o.bg || '#000080'};color:#fff;padding:10px 14px;font:bold 22px Arial"><img src="${icon(o.icon || 'globe', 24)}" style="vertical-align:-6px"> ${title}</div>`}<div style="padding:14px">${body}</div></div>`;
}
const notFound = (h) => pageShell('Cannot find server', `<p>Internet Exploder cannot find the server <b>${esc(h)}</b>.</p><ul><li>Make sure the address is spelled correctly.</li><li>The site may be down (or may have never existed — it's 2001).</li></ul>`, { bg: '#808080' });
function link(t, href) { return `<a data-href="${esc(href)}" style="color:#0000ee">${t}</a>`; }
function dlink(t, id) { return `<a data-dl="${esc(id)}" style="color:#0000ee">${t}</a>`; }
const hitCounter = (n) => `<div style="font-family:monospace;background:#000;color:#0f0;display:inline-block;padding:2px 4px;letter-spacing:2px">${String(n).padStart(6, '0')}</div>`;

site('www.amerinet.com', () => pageShell('AmeriNet.com', `
  <table style="width:100%"><tr><td style="vertical-align:top;width:150px">
    <div style="background:#e8eeff;border:1px solid #88a;padding:6px"><b>Channels</b><br>${['News', 'Sports', 'Music', 'Games', 'Teens', 'Chat', 'Shopping'].map((c) => link(c, 'http://www.amerinet.com/' + c.toLowerCase()) + '<br>').join('')}</div>
  </td><td style="vertical-align:top;padding-left:14px">
    <h2 style="margin:0">Welcome to AmeriNet, ${esc(S.sn || 'Guest')}!</h2>
    <p><b>Today on AmeriNet — ${esc(dateStr())}</b></p>
    <ul><li>${link('Download the new *NSYNK single preview!', 'http://www.snapster.com/')}</li>
    <li>${link('Is Snapster legal? The lawsuit explained.', 'http://www.askgeeves.com/')}</li>
    <li>${link('Make your own home page on GeoPages', 'http://www.geopages.com/')}</li>
    <li>Try ${link('Ask Geeves', 'http://www.askgeeves.com/')}, the search engine that understands questions!</li></ul>
    <p>You've got mail! ${link('Read it now', 'about:mail')}</p>
    <hr><div style="font-size:11px;color:#666">Keyword: type a word in the address bar. ${hitCounter(14920583)} visitors</div>
  </td></tr></table>`, { title: 'AmeriNet.com' }));
site('about:mail', () => { after(0.1, () => openMail()); return pageShell('AmeriNet Mail', '<p>Opening your mailbox...</p>'); });

const SEARCH_DB = [
  ['snapster download', 'http://www.snapster.com/', 'Snapster - Download free music', 'The #1 way to share MP3s with people all over the world.'],
  ['bongo buddy', 'http://www.bongobuddy.com/', 'Bongo Buddy - Your FREE desktop friend!', 'Download Bongo, the pink gorilla who sings! 100% free, 100% not spyware.'],
  ['winzip zip', 'http://www.download-palace.com/', 'Download Palace - free software', 'WinZipper, ZapAmp, media players, screensavers and more!'],
  ['screensaver flying toasters pipes', 'http://www.download-palace.com/', 'Download Palace - Screensavers', 'The best free screensavers on the Web.'],
  ['antivirus virus', 'http://www.virusblaster.com/', 'VirusBlaster 2001', 'Protect your PC from the latest viruses.'],
  ['remove bongo spyware adware', 'http://www.adbegone.com/', 'Ad-Be-Gone - remove spyware', 'The only program that can remove Bongo Buddy for good.'],
  ['games cheats', 'http://www.gamezcheatz.com/', 'GameZ CheatZ 2001', 'Cheat codes, walkthroughs, and the blue screen of death prank!'],
  ['lyrics', 'http://www.lyricz-dungeon.com/', 'The Lyricz Dungeon', 'Every song lyric, with pop-ups and MIDI music that you can\'t turn off.'],
];
site('www.askgeeves.com', (w, host, url) => {
  const q = /[?&]q=([^&]*)/.exec(url);
  const inner = (query) => {
    if (!query) return `<div style="text-align:center;padding:30px"><div style="font:bold 30px Arial;color:#004080">Ask Geeves<span style="font-size:12px">®</span></div><p>Ask me anything!</p><form onsubmit="return false"><input type="text" id="gq" style="width:280px;padding:4px"> <button class="btn" id="gb">Ask!</button></form><p style="font-size:11px;color:#888">Powered by a butler and 3 servers</p></div>`;
    const ql = query.toLowerCase();
    const hits = SEARCH_DB.map((r) => [r, r[0].split(' ').filter((t) => ql.includes(t)).length + (ql.includes(r[2].toLowerCase().split(' ')[0].toLowerCase()) ? 1 : 0)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const list = (hits.length ? hits : SEARCH_DB.map((r) => [r, 0]).slice(0, 4)).map(([r]) => `<div style="margin:12px 0"><a data-href="${r[1]}" style="font-size:16px;color:#0000ee">${esc(r[2])}</a><div style="color:#060;font-size:12px">${esc(r[1])}</div><div>${esc(r[3])}</div></div>`).join('');
    return `<div style="padding:4px 0 10px;border-bottom:1px solid #ccc"><b style="color:#004080">Ask Geeves</b> &nbsp; <input type="text" id="gq" value="${esc(query)}" style="width:260px"> <button class="btn sm" id="gb">Ask!</button></div><p style="font-size:12px;color:#666">I found these results for "<b>${esc(query)}</b>":</p>${list}`;
  };
  after(0.05, () => { const i = w.page.querySelector('#gq'), b = w.page.querySelector('#gb'); const go = () => w.nav('http://www.askgeeves.com/?q=' + encodeURIComponent(i.value)); if (b) b.onclick = go; if (i) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); if (i && !q) i.focus(); });
  stat('searches');
  return { title: q ? 'Ask Geeves: ' + decodeURIComponent(q[1]) : 'Ask Geeves', html: pageShell('', inner(q ? decodeURIComponent(q[1]) : ''), { raw: true }) };
});
site('www.google.com', (w) => { after(0.1, () => w.nav('http://www.askgeeves.com/')); return 'Redirecting...'; });

site('www.snapster.com', () => pageShell('Snapster.com', `<div style="text-align:center"><h1 style="color:#4f9a20">snapster</h1><p>Share music with the world.</p>
  <p><b>Snapster runs right on your computer.</b> You already have it installed!</p>
  <p><button class="btn" onclick="(window.__snap||function(){})()">Open Snapster</button></p>
  <p style="font-size:11px;color:#888">Snapster is currently being sued by several bands, a metal drummer, and a rapper. Snapster is confident it will win, lose, or settle.</p></div>`, { title: 'Snapster', bg: '#2b5e10' }), { fx: 1 });
site('www.bongobuddy.com', () => pageShell('BongoBuddy.com', `<div style="background:#ff9ccc;text-align:center;padding:20px;margin:-14px"><img src="${icon('bongo', 32)}" style="width:80px;height:80px"><h1 style="color:#c0207a">Bongo Buddy!</h1><p style="font-size:16px">The FREE desktop friend who SINGS!</p>
  <p>${S.bongo.installed ? 'You already have Bongo! Isn\'t he great?' : dlink('<button class="btn">Download Bongo Buddy FREE!</button>', 'bongo')}</p>
  <p style="font-size:11px">Over 20 million friends installed! (Many by accident!)</p>
  <p style="font-size:10px;color:#a03070">Bongo Buddy is not spyware. Bongo Buddy is your friend. Bongo Buddy is always watching out for you. Always.</p></div>`, { title: 'Bongo Buddy', bg: '#c0207a', icon: 'bongo' }));
site('www.download-palace.com', () => pageShell('Download Palace', `<p>Welcome to the Palace! The best <b>FREEWARE</b> and <b>SHAREWARE</b> on the Web. ${hitCounter(882104)}</p>
  <table style="width:100%;border-collapse:collapse" border="1" cellpadding="6">
  <tr style="background:#008080;color:#fff"><th align=left>Program</th><th>Size</th><th>Download</th></tr>
  ${[['WinZipper 8.0', 'Unzip .zip files. 45-day trial (lasts forever).', 'winzipper', '1.2MB'], ['ZapAmp 2.76', 'The MP3 player. You have it, but here\'s another copy!', 'zapamp', '1.9MB'], ['Flying Toasterz Screensaver', 'Toasters with wings. A classic.', 'toasters', '2.1MB'], ['Weather Buggy', 'Live weather in your tray! (and 12 other things)', 'weatherbug', '3.4MB'], ['Comet Cursor', 'Make your cursor a comet! Totally safe!', 'cometcursor', '0.8MB'], ['SuperCrack MP3 Pro', 'Unlock premium MP3 features!!!', 'crack', '402KB']].map(([n, d, id, s]) => `<tr><td><b>${n}</b><br><span style="font-size:11px;color:#444">${d}</span></td><td align=center>${s}</td><td align=center>${dlink('Download', id)}</td></tr>`).join('')}
  </table><p style="font-size:11px;color:#888">Download Palace is not responsible for what these programs do to your computer.</p>`, { title: 'Download Palace', bg: '#008080' }));
site('www.virusblaster.com', () => pageShell('VirusBlaster 2001', `<p>Is your computer acting strange? Pop-ups? A cursor with a mind of its own? You might have a <b>VIRUS</b>.</p>
  <p><b>VirusBlaster 2001</b> scans and removes the latest threats. You already have it installed!</p>
  <p><button class="btn" onclick="(window.__vb||function(){})()">Open VirusBlaster</button></p>
  <p>Remember to run ${link('LiveUpdate', 'http://www.virusblaster.com/update')} to get the newest virus definitions.</p>`, { title: 'VirusBlaster 2001', bg: '#1a6a1a', icon: 'shield' }));
site('www.adbegone.com', () => pageShell('Ad-Be-Gone', `<p>Tired of a certain pink gorilla you can't get rid of?</p>
  <p><b>Ad-Be-Gone</b> finds and removes spyware, adware, and "desktop friends" that overstay their welcome.</p>
  <p>${S.adbegone ? 'You have Ad-Be-Gone installed. Open it from the desktop.' : dlink('<button class="btn">Download Ad-Be-Gone (free)</button>', 'adbegone')}</p>
  <p style="font-size:11px;color:#888">Warning: some adware fights back. You may need to run Ad-Be-Gone <b>and</b> Add/Remove Programs. Possibly more than once.</p>`, { title: 'Ad-Be-Gone', bg: '#206020', icon: 'adbegone' }));
site('www.gamezcheatz.com', () => pageShell('GameZ CheatZ 2001', `<div style="background:#000;color:#0f0;padding:10px;font-family:monospace">&gt;&gt;&gt; WELCOME 2 GAMEZ CHEATZ &lt;&lt;&lt;</div>
  <p>ALL the codes for ALL the games!!! ${hitCounter(60613)}</p>
  <ul><li><b>Mine Finder:</b> type <b>xyzzy</b> then press Shift. (We're not sure what it does.)</li>
  <li><b>Solitaire:</b> hold Ctrl+Alt+Shift and click a card to pull any card.</li>
  <li><b>The famous Blue Screen prank:</b> ${dlink('download bsod.exe', 'bsod')} and send it to your friends! LOL</li></ul>
  <p style="font-size:11px;color:#888">Site best viewed in Internet Exploder at 800x600. Sign my ${link('guestbook', 'http://www.geopages.com/area51/7734/')}!</p>`, { title: 'GameZ CheatZ', bg: '#600060' }));
site('www.lyricz-dungeon.com', (w) => { after(0.2, () => { bongoAdPopup(); }); return pageShell('The Lyricz Dungeon', `<div style="background:#101030;color:#c0c0ff;padding:14px;margin:-14px;font-family:'Comic Sans MS',cursive"><h2 style="color:#ff40c0">~*~ The Lyricz Dungeon ~*~</h2><p>welcome 2 the dungeon!!! every lyric EVER!!!</p><marquee style="color:#ffd400">*** now playing a MIDI you cannot turn off ***</marquee><p>${['*NSYNK', 'Britnee Spearz', 'Blink-183', 'Creeed'].map((a) => link(a + ' lyrics', 'http://www.lyricz-dungeon.com/' + a) + '<br>').join('')}</p><p style="font-size:10px">this site has 14 pop-ups. sorry!!!</p></div>`, { raw: true }); });
site('www.windozeupdate.com', () => pageShell('Windoze Update', `<p>Checking your computer for the latest updates...</p><p><b>Your copy of Windoze Millennium is up to date!</b></p><p>Recommended: a reboot. And another reboot. Then reboot.</p><p style="font-size:11px;color:#888">Critical update: do not install Bongo Buddy. (This warning arrived too late.)</p>`, { title: 'Windoze Update' }));

// GeoPages personal sites + guestbooks
const GUESTBOOK = { 'area51/7734': { owner: 'xXDarkAngelXx', theme: 'dark', title: '~ angel\'s domain ~', tag: 'the rain that nobody sees', entries: [['dreamcatcher_99', 'luv ur poems!!!'], ['anonymous', 'ur so deep'], ['SkaterDude182', 'dude cheer up lol']] } };
site('geopages.com', (w, host, url) => {
  const path = hostOf(url).replace(/^(www\.)?(geopages|angelfyre)\.com\/?/, '');
  if (!path) return pageShell('GeoPages', `<p>GeoPages — build your FREE home page! Pick a neighborhood:</p><ul>${['Area51', 'SunsetStrip', 'Heartland', 'Hollywood', 'Tokyo'].map((n) => `<li>${link(n, 'http://www.geopages.com/' + n.toLowerCase() + '/')}</li>`).join('')}</ul><p>${hitCounter(9442101)} pages created!</p>`, { title: 'GeoPages', bg: '#5a4e94' });
  const g = GUESTBOOK[path.replace(/\/$/, '')] || GUESTBOOK[path.replace(/\/.*$/, '/7734').replace(/\/$/, '')];
  if (/guestbook/i.test(path) || url.includes('#sign')) return guestbookPage(w, path.replace(/\/guestbook.*/, ''));
  const key = path.replace(/\/$/, '');
  if (GUESTBOOK[key]) return geoPage(w, key, GUESTBOOK[key]);
  // generic under-construction page
  return pageShell(path, `<div style="text-align:center;font-family:'Comic Sans MS',cursive;padding:20px"><img src="${icon('gear', 32)}" style="width:48px"><h2>Under Construction!</h2><p>This page is coming soon! Check back later!</p><p>${hitCounter(irnd(12, 900))}</p></div>`, { title: 'GeoPages: ' + path, bg: '#5a4e94' });
});
function geoPage(w, key, g) {
  return pageShell('', `<div style="background:#000;color:#c0c0ff;padding:16px;margin:-14px;font-family:'Comic Sans MS',cursive;min-height:300px">
    <div style="text-align:center"><h1 style="color:#ff2040;text-shadow:2px 2px #400">${esc(g.title)}</h1><marquee style="color:#8080ff">${esc(g.tag)} &nbsp; ~*~ &nbsp; ${esc(g.tag)}</marquee></div>
    <p>welcome to my page. not much here yet. the world is dark and so am i.</p>
    <p>${link('&#9733; sign my guestbook &#9733;', 'http://www.geopages.com/' + key + '/guestbook')} &nbsp; (${g.entries.length} have signed)</p>
    <p>${link('read my poems', 'http://www.geopages.com/' + key + '/poems')}</p>
    <div style="margin-top:20px;font-size:11px">best viewed at 800x600 • ${hitCounter(1337)} • made with GeoPages</div></div>`, { raw: true, title: g.title });
}
function guestbookPage(w, key) {
  const g = GUESTBOOK[key.replace(/\/$/, '')] || GUESTBOOK['area51/7734'];
  const list = () => g.entries.map(([n, m]) => `<div style="border-bottom:1px dashed #668;padding:5px 0"><b style="color:#ff6080">${esc(n)}</b> wrote:<br>${esc(m)}</div>`).join('');
  after(0.05, () => {
    const b = w.page.querySelector('#gbsign'), n = w.page.querySelector('#gbname'), m = w.page.querySelector('#gbmsg');
    if (b) b.onclick = () => { const msg = (m.value || '').trim(); if (!msg) { msgBox({ title: 'Guestbook', icon: 'warn', text: 'Please write a message!' }); return; } g.entries.unshift([(n.value || S.sn || 'anonymous').trim(), msg]); S.guestbook = true; save(); stat('guestbook'); unlock('guestbook'); emit('guestbook', key); w.page.querySelector('#gblist').innerHTML = list(); m.value = ''; SFX.ding(); msgBox({ title: 'Guestbook', icon: 'info', text: 'Thanks for signing! Your message is at the top.' }); };
  });
  return pageShell('', `<div style="background:#101030;color:#c0c0ff;padding:16px;margin:-14px;font-family:'Comic Sans MS',cursive">
    <h2 style="color:#ff40c0">${esc(g.title)} — Guestbook</h2>
    <div style="background:#1a1a40;padding:8px;border:1px solid #448"><b>Sign the guestbook:</b><br>Name: <input type="text" id="gbname" value="${esc(S.sn || '')}" style="width:140px"><br>Message:<br><textarea id="gbmsg" style="width:95%;height:44px"></textarea><br><button class="btn sm" id="gbsign">Sign it!</button></div>
    <h3>Entries (${g.entries.length}):</h3><div id="gblist">${list()}</div></div>`, { raw: true, title: g.title + ' Guestbook' });
}
window.__amerinet = () => { openAmeriNet(); connect(); };
window.__snap = () => openSnapster();
window.__vb = () => openVirusBlaster();
