// Profile and away-message culture: song lyrics for your profile and away messages, the "Get 2 Know Me" survey,
// the Away Message Board (everyone's away messages at a glance) and the Deep-o-Meter, which ranks them.
const LYR = {
  open: ['and i', 'cuz baby', 'oh', 'tonight i', 'sometimes i', 'yeah i', 'and now i', 'whoa', 'so i', 'every time i'],
  verb: ['dream about', 'drive past', 'wait for', 'think about', 'sing to', 'cry over', 'run from', 'dance with', 'remember', 'scream at'],
  noun: ['the rain', 'your window', 'the radio', 'the empty mall', 'the stars', 'my old sneakers', 'the parking lot', 'your voice', 'the summer', 'the ceiling'],
  tail: ['all night long', 'and it hurts so good', 'like it\'s 1999', 'one more time', 'til the sun comes up', 'and you don\'t even know', 'forever and ever', 'but you\'re not there', 'yeah yeah yeah', 'so far away'],
};
function lyricsFor(s) {
  const R = mulberry(hash32('lyr|' + s.id));
  const p = (a) => a[Math.floor(R() * a.length)];
  const lines = [];
  for (let i = 0; i < 4; i++) lines.push(i === 3 ? s.title.toLowerCase().replace(/\(.*?\)/g, '').trim() + ', ' + p(LYR.tail) : `${p(LYR.open)} ${p(LYR.verb)} ${p(LYR.noun)} ${p(LYR.tail)}`);
  return lines;
}
function ownedSongs() { const ids = new Set(); for (const f of filesIn('music')) if (f.track) ids.add(f.track.kind === 'wrong' ? f.track.realOf : f.track.songId); return SONGS.filter((s) => ids.has(s.id)); }
// lyric picker: calls back with an HTML snippet
function pickLyrics(cb) {
  const songs = ownedSongs();
  if (!songs.length) { msgBox({ title: 'Insert Lyrics', icon: 'info', text: 'You need some songs first! Download a few with Snapster, then you can quote them.' }); return; }
  const pre = h('div', { class: 'field', style: 'height:84px;overflow:auto;font:italic 12px Arial;white-space:pre-wrap' });
  const sel = h('select', { size: 6, style: 'width:100%' }, songs.map((s) => h('option', { value: s.id, text: s.artist + ' - ' + s.title })));
  const show = () => { const s = findSong(sel.value); pre.textContent = s ? lyricsFor(s).join('\n') : ''; };
  sel.addEventListener('change', show); sel.selectedIndex = 0; show();
  const w = openWin({ title: 'Insert Lyrics', icon: 'mp3', w: 340, small: true, body: h('div', { class: 'col pad' }, h('div', { text: 'Quote a song you\'ve downloaded:' }), sel, pre,
    h('div', { class: 'btns' }, h('button', { class: 'btn def', text: 'Insert', onclick: () => { const s = findSong(sel.value); if (!s) return; w.close(); stat('lyrics'); unlock('lyrics'); cb(`<i>"${lyricsFor(s).slice(0, 2).map(esc).join('<br>')}..."</i><br>~ ${esc(s.artist)} ~`, s); } }), h('button', { class: 'btn', text: 'Cancel', onclick: () => w.close() }))) });
}

// ---- the survey ----
const SURVEY_Q = ['NAME', 'AGE', 'FAVE COLOR', 'FAVE BAND', 'FAVE MOVIE', 'BEST FRIEND', 'CRUSH', 'WHAT R U WEARING RITE NOW', 'LAST SONG U DOWNLOADED', 'DO U BELIEVE IN LOVE AT 1ST SITE'];
function openSurvey() {
  const ans = S.survey || {};
  const last = ownedSongs()[0];
  const inputs = SURVEY_Q.map((q) => h('input', { type: 'text', value: ans[q] || (q === 'NAME' ? S.sn : q === 'LAST SONG U DOWNLOADED' && last ? last.title : ''), style: 'width:100%' }));
  const grid = h('div', { style: 'display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center;overflow:auto;flex:1;min-height:0' }, SURVEY_Q.flatMap((q, i) => [h('b', { text: q + ':' }), inputs[i]]));
  const w = openWin({ key: 'survey', title: 'Get 2 Know Me Survey!!!', icon: 'txt', w: 420, h: 420, small: true, body: h('div', { class: 'col grow pad', style: 'min-height:0' },
    h('div', { style: 'color:#c000c0;font-weight:bold', text: '~*~*~ fill it out and put it in ur profile!!! ~*~*~' }), grid,
    h('div', { class: 'btns' }, h('button', { class: 'btn def', text: 'Add to Profile', onclick: () => {
      S.survey = {}; SURVEY_Q.forEach((q, i) => { S.survey[q] = inputs[i].value.trim(); });
      const filled = SURVEY_Q.filter((q) => S.survey[q]).length;
      const html = '<br>~*~*~*~*~*~*~<br>' + SURVEY_Q.filter((q) => S.survey[q]).map((q) => `${q}: ${esc(S.survey[q])}`).join('<br>') + '<br>~*~*~*~*~*~*~';
      S.profile = (S.profile || `<b>~*~ ${esc(S.sn)} ~*~</b>`).replace(/<br>~\*~\*~\*~\*~\*~\*~<br>[\s\S]*?~\*~\*~\*~\*~\*~\*~/, '') + html;
      save(); w.close(); if (filled >= 8) unlock('survey');
      buddyComment('survey');
    } }), h('button', { class: 'btn', text: 'Cancel', onclick: () => w.close() }))) });
}

// ---- the Deep-o-Meter ----
function deepScore(html) {
  const t = String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ');
  if (!t.trim()) return 0;
  let s = 10;
  s += Math.min(25, (t.match(/\.\.\./g) || []).length * 8);
  s += /~\*~|\*~\*/.test(t) ? 10 : 0;
  s += /["“].+["”]/.test(t) ? 18 : 0;
  s += /\n/.test(t) ? 8 : 0;
  s += t === t.toLowerCase() ? 8 : 0;
  s += Math.min(15, (t.match(/\b(rain|alone|tears|dark|nobody|forever|wonder|heart|stars|night|why|lost|empty|remember)\b/gi) || []).length * 5);
  s += /<i>/.test(html) ? 5 : 0;
  s -= Math.min(30, (t.match(/!/g) || []).length * 4);
  s -= /\b(brb|lol|eating|shower|mall|pizza|dinner)\b/i.test(t) ? 15 : 0;
  return clamp(Math.round(s), 0, 100);
}
function deepLabel(n) { return n >= 80 ? 'Poet Laureate of BuddyChat' : n >= 60 ? 'Very Deep' : n >= 40 ? 'Kinda Deep' : n >= 20 ? 'Shallow End' : 'Puddle'; }
function awayBoardRows() {
  const rows = [];
  for (const b of BUDDIES) { const r = bcRow(b.sn); if (r.state !== 'off' && r.away && !S.blocked[b.sn]) rows.push({ sn: b.sn, msg: r.away, score: deepScore(r.away), color: b.color }); }
  if (BC.away) rows.push({ sn: S.sn, msg: BC.away, score: deepScore(BC.away), color: '#0000ff', me: true });
  return rows.sort((a, b) => b.score - a.score);
}
function openAwayBoard() {
  if (!BC.on) { openBuddyChat(); return; }
  const list = h('div', { class: 'lv', style: 'padding:6px;font:12px Arial' });
  const render = () => {
    list.textContent = '';
    const rows = awayBoardRows();
    if (!rows.length) list.append(h('div', { class: 'dim', text: 'Nobody is away right now. Check back in a bit, or set your own away message!' }));
    rows.forEach((r, i) => list.append(h('div', { style: `padding:6px;margin-bottom:6px;background:${r.me ? '#eef4ff' : '#ffffe0'};box-shadow:var(--thin)` },
      h('div', { class: 'row' }, h('b', { style: 'color:' + r.color, text: (i + 1) + '. ' + r.sn }), h('div', { class: 'grow' }), h('span', { text: 'Deep-o-Meter: ' + r.score + '% (' + deepLabel(r.score) + ')' })),
      h('div', { class: 'bar', style: 'margin:3px 0' }, h('i', { style: `width:${r.score}%;background:linear-gradient(90deg,#4060ff,#a000c0)` })),
      h('div', { html: r.msg }))));
    const me = rows.findIndex((r) => r.me);
    if (me === 0 && rows.length >= 3) unlock('deepest');
  };
  const w = openWin({ key: 'awayboard', title: 'Away Message Board', icon: 'away', w: 400, h: 420, body: h('div', { class: 'col grow pad', style: 'min-height:0' },
    h('div', { class: 'row' }, img('away', 32), h('div', null, h('b', { text: 'Who\'s away, and how deep is it?' }), h('div', { class: 'dim', text: 'Ranked by the patented BuddyChat Deep-o-Meter.' }))), list,
    h('div', { class: 'btns' }, h('button', { class: 'btn', text: 'Refresh', onclick: render }), h('button', { class: 'btn', text: 'Set My Away Message...', onclick: awayDialog }))) });
  render(); unlock('awayboard');
  const iv = every(5, () => { if (w.closed) { cancel(iv); return; } render(); });
}

// buddies notice what you write
function buddyComment(kind, extra) {
  if (!BC.on) return;
  after(rnd(10, 25), () => {
    const avail = BUDDIES.filter((b) => buddyAvailable(b.sn) && !bcRow(b.sn).away && !BC.busy[b.sn]);
    if (!avail.length) return;
    let b = pick(avail), line;
    if (kind === 'survey') line = pick(['omg u did the survey!!! ur crush answer tho...', 'lol ur survey', 'i read ur survey. we have the same fave color!!', 'did u steal that survey from jenny lol']);
    else if (kind === 'lyrics' && extra) {
      const fan = avail.find((x) => x.likes.includes(extra.genre)); if (fan) b = fan;
      line = b.likes.includes(extra.genre) ? pick([extra.artist + ' lyrics!!! i love that song', 'omg ur quoting ' + extra.title, 'that song is SO us']) : pick(['did u really put ' + extra.artist + ' in ur profile', 'lol ' + extra.artist + '?? really?', 'ur lyrics r kinda cheesy lol']);
    } else if (kind === 'deep') line = b.sn === 'xXDarkAngelXx' ? pick(['ur away message. it speaks to me.', 'finally someone who gets it.']) : pick(['ur away message is so deep lol', 'r u ok?? ur away msg is so sad', 'whoa deep away message']);
    else if (kind === 'fader') line = b.sn === 'cousinTJ' ? 'nice fader lol. is that phantom?' : pick(['how did u make ur away message all rainbow??', 'r u using progz?? lol', 'ur away message is so l33t', 'my eyes. MY EYES. lol']);
    else line = pick(['nice profile lol', 'omg i love ur new profile', 'lol whats with ur profile']);
    buddySay(b.sn, line);
  });
}
