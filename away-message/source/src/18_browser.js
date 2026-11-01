// Internet Exploder 5.5 and the 2001 web: a portal, a butler search engine, two personal home pages with
// guestbooks, a dancing-gerbil page, and the download sites for Ad-Be-Gone, ZapAmp skins and virus definitions.
// Adware toolbars stack up under the address bar. Also: installApp (the setup wizard) and the gerbil joke program.
const B_ = { n: 0 };
const page = (body, o = {}) => `<div style="background:${o.bg || '#fff'};color:${o.fg || '#000'};min-height:100%;padding:${o.pad ?? 10}px;font:${o.font || '15px \'Times New Roman\', Times, serif'}">${body}</div>`;
const L = (href, text) => `<a data-href="${href}">${text}</a>`;
const DL = (key, text) => `<a data-dl="${key}">${text}</a>`;
const counter = (n) => `<span style="background:#000;color:#0f0;font:16px var(--mono);padding:0 4px;letter-spacing:2px">${String(n).padStart(6, '0')}</span>`;
const construction = `<div style="display:inline-block;background:repeating-linear-gradient(45deg,#ffd400 0 8px,#000 8px 16px);padding:3px"><div style="background:#ffd400;padding:2px 8px;font:bold 12px Arial">UNDER CONSTRUCTION</div></div>`;
const blinkTxt = (t, c = '#f00') => `<span class="blink" style="color:${c}">${t}</span>`;
const SITES = {
  'www.amerinet.com': { title: 'AmeriNet.com - Welcome!', html: () => page(`<table width="100%" cellpadding="6" style="border-collapse:collapse;font:13px Arial"><tr><td colspan="2" style="background:linear-gradient(90deg,#0b2a7a,#1a6ad0);color:#fff;font:bold italic 24px Arial">Ameri<span style="color:#ffd400">Net</span>.com <span style="font:12px Arial;float:right;margin-top:8px">${dateStr()}</span></td></tr>
    <tr><td valign="top" width="62%"><b style="color:#0b2a7a;font-size:15px">Top Stories</b><ul style="padding-left:18px;line-height:1.6"><li>Y2K: 18 months later, toasters still working fine</li><li>Snapster: band ${L('http://www.snapster.com/', 'Metallicuh sues')}, users keep downloading</li><li>Study: teens spend 4 hours a day on BuddyChat; parents "can't get a dial tone"</li><li>New "DVD" players could replace the VCR, experts say. Others: "Be kind, rewind"</li><li>Dancing gerbils sweep the web: ${L('http://www.gerbiljamboree.com/', 'see what the fuss is about')}</li></ul>
      <form data-search="1" style="background:#eef3ff;padding:8px;border:1px solid #9ab"><b>Search the Web:</b> <input name="q" type="text" style="width:55%"> <button class="btn sm">Search</button> <span style="font-size:10px">powered by Ask Geeves</span></form></td>
    <td valign="top" style="background:#f4f4f4"><b>Channels</b><br>${['Music', 'Teens', 'Games', 'News', 'Shopping'].map((c) => '• ' + L('http://www.askgeeves.com/?q=' + c.toLowerCase(), c)).join('<br>')}<br><br><b>Cool Sites</b><br>• ${L('http://www.geopages.com/sunsetstrip/2341/', 'Jenny\'s World')}<br>• ${L('http://www.zapamp.com/skins/', 'ZapAmp Skins')}<br>• ${L('http://www.adbegone.com/', 'Ad-Be-Gone')}<br>• ${L('http://www.virusblaster.com/', 'VirusBlaster')}<br>• ${L('http://www.windozeupdate.com/', 'Windoze Update')}</td></tr></table>`, { pad: 0 }) },
  'www.askgeeves.com': { title: 'Ask Geeves - Have a question? Just ask!', html: (q) => {
    const res = q ? searchSites(q) : [];
    return page(`<div style="text-align:center"><div style="font:bold 34px Georgia,serif;color:#7a1a1a">Ask Geeves<span style="font-size:14px;vertical-align:super">™</span></div><div style="font-size:40px">🤵</div><i>Have a question? Just ask. I'll fetch the answer, sir or madam.</i>
      <form data-search="1" style="margin:12px"><input name="q" type="text" value="${esc(q || '')}" style="width:60%"> <button class="btn">Ask!</button></form></div>
      ${q ? `<hr><b>Geeves found ${res.length} answer(s) to "${esc(q)}":</b><ol>${res.map((r) => `<li style="margin:8px 0">${L('http://' + r.url, '<b>' + esc(r.title) + '</b>')}<br><span style="font-size:13px">${esc(r.desc)}</span><br><span style="color:#080;font-size:12px">http://${r.url}</span></li>`).join('') || '<li>Geeves is terribly sorry, but he could not find anything. Perhaps try "music", "gerbils" or "virus"?</li>'}</ol>` : ''}`);
  } },
  'www.geopages.com/sunsetstrip/2341': { title: '~*~ JeNnY\'s WoRlD ~*~', midi: 'jenny', html: () => page(`<div style="text-align:center"><marquee style="color:#ff00ff;font:bold 22px Comic Sans MS,cursive">~*~*~ WeLcOmE 2 JeNnY's WoRlD!!! ~*~*~</marquee>${construction}<br><br>
    <img src="${icon('heart')}" width="32"> <img src="${icon('star')}" width="32"> <img src="${icon('heart')}" width="32"><br><br>hi!!! this is my page. i made it myself!!! i love *NSYNK, the mall, and my BFFs!!!<br><br>
    ${blinkTxt('NEW!!!')} my fave songs: Bye Bye Bye Bye, Gonnabe, Gerbil in a Bottle<br><br>
    <table border="3" cellpadding="6" style="margin:auto;border-color:#ff00ff;background:#fff0ff"><tr><td>BFFs 4 EVER: ${esc(S.sn || 'u')} &lt;3 ashley &lt;3 meg</td></tr></table><br>
    u r visitor # ${counter(1337 + B_.n)}<br><br>${guestbookHTML('jenny')}<br>${webring('Teen Pop Webring')}</div>`, { bg: '#ffe0f8', fg: '#8000a0', font: '15px Comic Sans MS, cursive' }) },
  'www.geopages.com/area51/7734': { title: '..::the rain falls::..', midi: 'angel', html: () => page(`<div style="text-align:center"><div style="font:italic 28px Georgia,serif;color:#c00">the rain falls</div><br><i>the rain falls<br>like my tears<br>but nobody sees the rain<br>because they are inside<br>watching tv</i><br><br>- xx angel xx<br><br><span style="font-size:12px;color:#600">best viewed in 800x600. or not. whatever.</span><br><br>visitors: ${counter(41 + B_.n)}<br><br>${guestbookHTML('angel')}</div>`, { bg: '#000', fg: '#c00', font: '15px Georgia, serif' }) },
  'www.gerbiljamboree.com': { title: 'THE GERBIL JAMBOREE!!!', midi: 'gerbil', html: () => page(`<div style="text-align:center"><div style="font:bold 26px Arial;color:#c00">WELCOME TO THE GERBIL JAMBOREE!!!</div><div data-gerbils="1" style="height:200px;margin:10px 0"></div><b>DO THE GERBIL DANCE!!!</b><br><br>${DL('gerbil', 'Download the Gerbil Dance for your desktop!')} (284 KB)</div>`, { bg: '#ffffe0', font: '15px Arial' }), on: () => unlock('gerbils') },
  'www.snapster.com': { title: 'Snapster', html: () => page(`<div style="background:#000;color:#fff;padding:10px;font:bold italic 28px Arial">snap<span style="color:#9be05a">ster</span></div><h3>News</h3><p><b>June 2001:</b> The band Metallicuh is suing Snapster. Their songs are now blocked. Everything else is still FREE!</p><p><b>Tip:</b> Fake files are out there. If a song is 300 KB, it isn't a song.</p><p>Snapster is already installed on your computer. Look for the turtle on your desktop!</p>`, { font: '14px Arial' }) },
  'www.bongobuddy.com': { title: 'Bongo Buddy - Your FREE Desktop Friend!', html: () => page(`<div style="text-align:center"><img src="${icon('bongo')}" width="96"><div style="font:bold 30px Arial;color:#c0207a">Bongo Buddy!!!</div><p>He talks! He sings! He tells jokes! He's <b>100% FREE</b>!*</p>${S.bongo.installed ? '<p><b>You already have Bongo! He loves you!</b></p>' : `<p>${DL('bongo', '<b style="font-size:20px">DOWNLOAD BONGO NOW!</b>')}</p>`}<p style="font-size:10px;color:#888">*Bongo Buddy is supported by special offers. By downloading you agree to the license agreement.</p></div>`, { bg: '#fff0f8', font: '15px Arial' }) },
  'www.bongosearch.com': { title: 'BongoSearch - Search with Bongo!', html: () => page(`<div style="text-align:center"><img src="${icon('bongo')}" width="64"><div style="font:bold 30px Arial;color:#c0207a">BongoSearch</div><form data-search="1"><input name="q" type="text" style="width:60%"> <button class="btn">Bongo It!</button></form><br><b>Sponsored links:</b><br>${L('http://www.luckycasino2001.com/', 'Lucky Casino 2001')} • ${L('http://www.free-ringtonez.com/', 'FREE Ringtones')} • ${L('http://www.bongobuddy.com/', 'Bongo Deluxe')}<br><br><span style="font-size:11px">Not your home page? Change it in Control Panel &gt; Internet Options. Bongo might change it back.</span></div>`, { bg: '#fff0f8', font: '14px Arial' }) },
  'www.adbegone.com': { title: 'Ad-Be-Gone: kill the spyware!', html: () => page(`<div style="font:bold 28px Arial;color:#c00">Ad-Be-Gone 1.0</div><p>Is your computer slow? Is a cartoon animal singing at you? You might have <b>adware</b>: programs that show ads, change your home page and install toolbars without asking.</p><p>Ad-Be-Gone scans your computer and removes it. It's free, for real (we're a college student in a dorm).</p><p>${S.adbegone ? '<b>Ad-Be-Gone is already installed. Find it on your desktop.</b>' : DL('adbegone', '<b style="font-size:18px">Download Ad-Be-Gone (1.1 MB)</b>')}</p>`, { font: '14px Arial' }) },
  'www.virusblaster.com': { title: 'VirusBlaster - LiveUpdate', html: () => page(`<div style="background:#ffd400;padding:10px;font:bold 26px Arial"><img src="${icon('shield')}" width="32" style="vertical-align:-6px"> VirusBlaster 2001</div><p>Keep your virus definitions up to date! New viruses show up every day.</p><p>${S.defs ? '<b>Your virus definitions are up to date.</b>' : '<a data-defs="1"><b style="font-size:17px">Run LiveUpdate now</b></a> (2.1 MB)'}</p><p style="font-size:12px">Remember: never open attachments you weren't expecting, even from friends. And "song.mp3.exe" is not a song.</p>`, { font: '14px Arial' }) },
  'www.zapamp.com/skins': { title: 'ZapAmp Skins', html: () => page(`<div style="background:#22222e;color:#ffd400;padding:10px;font:bold 24px Arial">⚡ ZapAmp Skins</div><p>Make ZapAmp look however you want!</p><table cellpadding="8">${['toxic', 'ocean', 'matrix'].map((k) => `<tr><td><div style="width:60px;height:24px;background:${SKINS[k].bg};border:1px solid #000"></div></td><td><b>${SKINS[k].name}</b></td><td>${S.skins.includes(k) ? 'Installed' : DL('skin:' + k, 'Download')}</td></tr>`).join('')}</table>`, { font: '14px Arial' }) },
  'www.windozeupdate.com': { title: 'Windoze Update', html: () => page(`<div style="background:linear-gradient(90deg,#000080,#1084d0);color:#fff;padding:10px;font:bold 22px Arial">Windoze Update</div><p>Scanning your computer...</p><p><b>Your computer is up to date.</b> (For 2001.)</p><p>Critical updates available: 0<br>Updates that would make the modem faster: 0<br>Updates that would remove Bongo: 0 (try ${L('http://www.adbegone.com/', 'Ad-Be-Gone')})</p>`, { font: '14px Arial' }) },
  'www.free-ringtonez.com': { title: 'FREE RINGTONES!!!', popups: 2, html: () => page(`<div style="text-align:center;font:bold 26px Arial;color:#f0f">${blinkTxt('FREE RINGTONES!!!', '#f0f')}</div><p style="text-align:center">Get the HOTTEST ringtones for your cell phone!!! Text CRAZYFROG to... wait, cell phones can't download ringtones yet. Check back in 2004!</p>`, { bg: '#000', fg: '#ff0', font: '15px Arial' }) },
  'www.luckycasino2001.com': { title: 'Lucky Casino 2001', popups: 1, html: () => page(`<div style="text-align:center"><div style="font:bold 28px Arial;color:#ffd400">LUCKY CASINO 2001</div><p>Play money only! Pull the lever!</p><div data-slots="1"></div></div>`, { bg: '#600', fg: '#fff', font: '15px Arial' }) },
};
const SITE_INDEX = [
  ['www.snapster.com', 'Snapster', 'Free music sharing. Find any song.', 'music mp3 snapster songs download'],
  ['www.zapamp.com/skins', 'ZapAmp Skins', 'Download skins for ZapAmp.', 'zapamp skins music player mp3'],
  ['www.gerbiljamboree.com', 'The Gerbil Jamboree', 'Dancing gerbils. That is all.', 'gerbil gerbils hamster dance funny animals'],
  ['www.geopages.com/sunsetstrip/2341', '~*~ Jenny\'s World ~*~', 'my page!!! *NSYNK, the mall, BFFs', 'jenny nsynk teens pop homepage'],
  ['www.geopages.com/area51/7734', 'the rain falls', 'poetry. dont read it.', 'poem poetry angel dark rain'],
  ['www.virusblaster.com', 'VirusBlaster LiveUpdate', 'Update your virus definitions.', 'virus antivirus virusblaster update definitions security'],
  ['www.adbegone.com', 'Ad-Be-Gone', 'Remove adware and spyware for free.', 'adware spyware bongo remove popup ads toolbar'],
  ['www.bongobuddy.com', 'Bongo Buddy', 'Your FREE desktop friend!', 'bongo gorilla buddy assistant free'],
  ['www.windozeupdate.com', 'Windoze Update', 'Keep Windoze up to date.', 'windoze update windows computer'],
  ['www.amerinet.com', 'AmeriNet.com', 'News, chat and more.', 'news amerinet teens games'],
];
function searchSites(q) { const w = q.toLowerCase().split(/\W+/).filter(Boolean); return SITE_INDEX.filter((s) => w.some((x) => (s[1] + ' ' + s[2] + ' ' + s[3]).toLowerCase().includes(x))).map(([url, title, desc]) => ({ url, title, desc })); }
function guestbookHTML(id) {
  const signed = S.guestbooks && S.guestbooks[id];
  const entries = { jenny: ['<b>ashley</b>: HI JEN!!! cute page!!!', '<b>meg_the_great</b>: luv the colors!!!'], angel: [] }[id];
  return `<div style="border:2px ridge #888;padding:8px;max-width:360px;margin:auto;text-align:left;background:rgba(255,255,255,.08)"><b>Sign My Guestbook!</b><br>${entries.concat(signed ? [`<b>${esc(S.sn)}</b>: ${esc(signed)}`] : []).join('<br>') || '<i>no entries yet</i>'}<br>${signed ? '' : `<form data-guest="${id}" style="margin-top:6px"><input name="m" type="text" placeholder="say something nice" style="width:70%"> <button class="btn sm">Sign</button></form>`}</div>`;
}
const webring = (n) => `<div style="font-size:12px;margin-top:10px">&lt;&lt; ${L('http://www.geopages.com/area51/7734/', 'prev')} | <b>${n}</b> | ${L('http://www.gerbiljamboree.com/', 'next')} &gt;&gt;</div>`;
const MIDIS = { jenny: [72, 76, 79, 76, 77, 74, 71, 74, 72, 76, 79, 84, 83, 79, 76, 72], angel: [57, 60, 64, 60, 55, 59, 62, 59, 53, 57, 60, 57, 52, 55, 59, 55], gerbil: [76, 76, 79, 76, 81, 79, 76, 72, 74, 74, 76, 74, 79, 76, 74, 71] };
function normURL(u) { u = String(u || '').trim(); if (!u) return 'about:blank'; if (!/^[a-z]+:/i.test(u)) u = 'http://' + u; return u; }
function siteKey(u) { return u.replace(/^https?:\/\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/\/index\.html?$/i, '').toLowerCase(); }

function openBrowser(url) {
  url = normURL(url || S.homepage);
  const hist = [], fwd = [];
  const addr = h('input', { type: 'text', class: 'grow', style: 'min-width:0' });
  const view = h('div', { class: 'sel-text', style: 'flex:1;min-height:0;overflow:auto;background:#fff;box-shadow:var(--in);position:relative' });
  const bars = h('div', { class: 'col', style: 'gap:2px;flex:none' });
  const throb = h('div', { style: 'width:38px;height:38px;flex:none;background:#000;display:flex;align-items:center;justify-content:center' }, img('globe', 24));
  let w, midi = 0, cur = null, loadT = 0;
  const tb = (ic, t, fn) => h('button', { class: 'btn', style: 'min-width:0;height:38px;padding:0 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px', onclick: fn }, img(ic, 16), t);
  const stopMidi = () => { clearInterval(midi); midi = 0; };
  const go = async (u, push = true) => {
    u = normURL(u); stopMidi(); clearTimeout(loadT);
    if (push && cur) { hist.push(cur); fwd.length = 0; }
    cur = u; addr.value = u;
    const key = siteKey(u), q = (/[?&]q=([^&]*)/.exec(u) || [])[1];
    if (u === 'about:blank') { view.innerHTML = ''; w.setTitle('about:blank - Internet Exploder'); return; }
    if (!netOn()) { view.innerHTML = errPage('The page cannot be displayed', 'You are not connected to the Internet. Click <b>Connect</b> in AmeriNet, then click Refresh.', true); w.setTitle('Cannot find server