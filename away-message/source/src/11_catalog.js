// The song catalog (parody bands and songs, all composed by 04_music.js) and the fake Snapster network: peers,
// their connections, and search results with mislabeled files, fakes, incomplete rips and the odd virus.
const SONGS = [
  ['blink', 'Blink-183', 'All the Small Thongs', 'poppunk'], ['blink2', 'Blink-183', 'What\'s My Age Again Again', 'poppunk'],
  ['nsynk', '*NSYNK', 'Bye Bye Bye Bye', 'boyband'], ['nsynk2', '*NSYNK', 'It\'s Gonna Be Mayonnaise', 'boyband'],
  ['britnee', 'Britnee Spearz', 'Oops!... I Did It Once More', 'teenpop'], ['britnee2', 'Britnee Spearz', '...Baby One More Thyme', 'teenpop'],
  ['biscuit', 'Limp Biscuit', 'Breakfast Stuff', 'numetal'], ['biscuit2', 'Limp Biscuit', 'Rollin\' (Grocery Cart)', 'numetal'],
  ['mouse', 'Smash Mouse', 'All Cheese', 'altrock'], ['lincoln', 'Lincoln Parking', 'In the Endzone', 'numetal'],
  ['eiffel', 'Eiffel 66', 'Bluer (Da Ba Dah)', 'eurodance'], ['sisko', 'Sisko', 'The Sock Song', 'rnb'],
  ['density', 'Density\'s Child', 'Fills, Fills, Fills', 'rnb'], ['daroot', 'Daroot', 'Dust Storm', 'trance'],
  ['sugar', 'Sugar Rae', 'Every Monday', 'altrock'], ['fourth', 'Fourth Eye Blind', 'Semi-Charged Battery', 'altrock'],
  ['creeed', 'Creeed', 'Highest', 'grunge'], ['backalley', 'Backalley Boys', 'I Want It That Day', 'boyband'],
  ['agua', 'Kristeena Agua', 'Gerbil in a Bottle', 'teenpop'], ['begga', 'Lou Begga', 'Mambo No. 6', 'latin'],
  ['venga', 'Vengabus Boys', 'We Like to Carpool', 'eurodance'], ['hamster', 'Bloodhamster Gang', 'The Bad Couch', 'altrock'],
  ['mn', 'M&N', 'The Real Slim Sandy', 'hiphop'], ['outcast', 'Outcast Kids', 'Ms. Johnson', 'hiphop'],
  ['wheezer', 'Wheezer', 'Hash Brown', 'altrock'], ['incubator', 'Incubator', 'Parallel Park', 'altrock'],
  ['dodo', 'Dodo', 'Thanks a Lot', 'ballad'], ['shaggee', 'Shaggee', 'It Wasn\'t My Turn', 'ska'],
  ['drey', 'Dr. Drey', 'Still R.E.D.', 'hiphop'], ['semisonix', 'Semisonix', 'Closing Tab', 'altrock'],
  ['handsome', 'Handsome', 'MMMBap', 'teenpop'], ['spicy', 'Spicy Gals', 'Gonnabe', 'teenpop'],
  ['aquae', 'Aquae', 'Bargain Girl', 'eurodance'], ['offsprung', 'The Offsprung', 'Pretty Fly (For a Housefly)', 'poppunk'],
  ['crazyvillage', 'Crazy Village', 'Moth', 'numetal'], ['chumba', 'Chumbalumba', 'Tubthumping Again', 'ska'],
  ['moby', 'Mobie', 'Linoleum', 'trance'], ['goo', 'The Goo Goo Bolls', 'Iris Scan', 'ballad'],
  ['mettallicuh', 'Metallicuh', 'Enter Sandwich', 'numetal'],
].map(([id, artist, title, genre]) => ({ id, artist, title, genre }));
const findSong = (id) => SONGS.find((s) => s.id === id);
const BLOCKED = ['mettallicuh'];
const CONNS = [['14.4', 1.4, 0.02], ['28.8', 2.7, 0.08], ['33.6', 3.2, 0.06], ['56K', 4.6, 0.3], ['ISDN', 7, 0.04], ['Cable', 40, 0.22], ['DSL', 28, 0.14], ['T1', 150, 0.11], ['T3', 400, 0.02], ['Unknown', 3, 0.03]];
function rollConn() { let r = Math.random(); for (const c of CONNS) { r -= c[2]; if (r <= 0) return c; } return CONNS[3]; }
const PEER_A = ['dj', 'mp3', 'lil', 'big', 'xX', 'the', 'phat', 'cool', 'sk8', 'punk', 'rave', 'emo', 'jam', 'beat', 'kid', 'sweet', 'mad', 'hot', 'ice', 'dark', 'super', 'mega', 'pimp', 'lazy', 'dorm'];
const PEER_B = ['mike', 'boi', 'grrl', 'shorty', 'dawg', 'freak', 'master', 'king', 'queen', 'rider', 'monkey', 'ninja', 'skater', 'angel', 'llama', 'tunes', 'wizard', 'collector', 'rat', 'jock', 'ster', 'phreak', 'pirate', 'leech', 'room214'];
function peerName(R = Math.random) { const a = PEER_A[Math.floor(R() * PEER_A.length)], b = PEER_B[Math.floor(R() * PEER_B.length)]; const n = R() < 0.6 ? Math.floor(R() * (R() < 0.5 ? 100 : 3000)) : ''; return a === 'xX' ? 'xX' + b + n + 'Xx' : a + (R() < 0.3 ? '_' : '') + b + n; }
const _durCache = {};
function songDur(t) { const k = [t.songId, t.version, t.kind, t.realOf, t.cut && t.cut.toFixed(3)].join('|'); if (!_durCache[k]) _durCache[k] = compileSong(t).dur; return _durCache[k]; }
function fileNameFor(s, version, R) {
  const a = s.artist, t = s.title.replace(/[?!:*"/\\|<>]/g, '');
  const v = version ? ' (' + version + ')' : '';
  return [
    `${a} - ${t}${v}.mp3`, `${a.toLowerCase()} - ${t.toLowerCase()}${v.toLowerCase()}.mp3`, `${a.replace(/ /g, '_')}-${t.replace(/ /g, '_')}${v.replace(/ /g, '_')}.mp3`,
    `${t}${v} - ${a}.mp3`, `${String(1 + Math.floor(R() * 14)).padStart(2, '0')} - ${t}${v}.mp3`, `${a} - ${t}${v} [www.mp3z4free.net].mp3`,
  ][Math.floor(R() * 6)];
}
// search → array of results { name, size, kbps, khz, dur, user, conn, speed, ping, track, payload }
function snapSearch(artist, title) {
  const qa = artist.trim().toLowerCase(), qt = title.trim().toLowerCase();
  const words = (qa + ' ' + qt).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return { results: [] };
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const match = (s) => words.every((w) => norm(s.artist + ' ' + s.title).includes(w.replace(/[^a-z0-9]/g, '')));
  let hits = SONGS.filter(match);
  if (!hits.length) hits = SONGS.filter((s) => words.some((w) => w.length > 2 && norm(s.artist + ' ' + s.title).includes(w.replace(/[^a-z0-9]/g, ''))));
  const blocked = hits.some((s) => BLOCKED.includes(s.id));
  const out = [];
  for (const s of hits) {
    const n = BLOCKED.includes(s.id) ? 2 : irnd(5, 11);
    for (let i = 0; i < n; i++) {
      const R = Math.random;
      let version = R() < 0.14 ? 'Live' : R() < 0.12 ? 'Remix' : R() < 0.05 ? 'Acoustic' : '';
      let kind = 'song', realOf = null, payload = null, cut = 0, name;
      const roll = R();
      if (BLOCKED.includes(s.id)) kind = R() < 0.5 ? 'talk' : 'silence';
      else if (roll < 0.07) kind = 'talk';
      else if (roll < 0.11) kind = 'silence';
      else if (roll < 0.18) { kind = 'wrong'; realOf = pick(SONGS.filter((x) => x.id !== s.id && !BLOCKED.includes(x.id))).id; }
      else if (roll < 0.24) { kind = 'incomplete'; cut = rnd(0.3, 0.6); }
      else if (roll < 0.27) { payload = pick(['runaway', 'flip', 'trails', 'cursor', 'popups', 'melt']); }
      if (version === 'Live') kind = kind === 'song' ? 'live' : kind;
      name = fileNameFor(s, version, R);
      if (payload) name = name.replace(/\.mp3$/, pick(['.mp3.exe', '.mp3.vbs', '.mp3.exe', ' .exe', '.mp3.scr']));
      const kbps = pick([64, 96, 112, 128, 128, 128, 128, 160, 192, 192, 256, 320]);
      const track = { songId: s.id, artist: s.artist, title: s.title, genre: s.genre, version, kind, realOf, cut, kbps };
      const dur = kind === 'talk' ? 14 : kind === 'silence' ? 34 : songDur(track);
      const claimed = kind === 'song' || kind === 'live' || kind === 'wrong' ? dur : kind === 'incomplete' ? dur / cut : rnd(150, 260);
      const c = rollConn();
      let size = Math.round(claimed * kbps * 1000 / 8 * rnd(0.98, 1.02));
      if (kind === 'incomplete') size = Math.round(size * cut);
      if (kind === 'talk') size = irnd(180000, 420000);
      if (payload) size = irnd(28000, 260000);
      out.push({ id: uid('r'), name, size, kbps, khz: kbps <= 64 ? 22050 : 44100, dur: claimed, user: peerName(), conn: c[0], speed: c[1], ping: c[1] > 20 ? irnd(30, 160) : irnd(140, 900), track, payload });
    }
  }
  return { results: shuffle(out).sort((a, b) => (b.speed > 20) - (a.speed > 20) || a.ping - b.ping).slice(0, 80), blocked };
}
