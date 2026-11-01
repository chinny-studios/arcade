// Bongo Buddy: the pink gorilla desktop assistant. He's drawn live on a canvas, walks around, sits on window title
// bars, dances to ZapAmp, talks (speech engine or babble), sings with the formant voice, tells jokes and facts, and
// keeps "helpfully" installing adware. Getting rid of him takes Ad-Be-Gone plus Add/Remove Programs, twice.
const BONGO = { el: null, cv: null, bub: null, shown: false, x: 200, y: 0, vy: 0, vx: 0, face: 1, state: 'idle', mouth: 0, talkUntil: 0, blinkT: 0, emote: '', emoteUntil: 0, sitOn: null, walkTo: null, singing: null, lastAd: 0, lastChat: 0, drag: false, dancing: false };
const BW = 110, BH = 132;
const ADWARE = {
  bongobar: { name: 'BongoBar Toolbar', icon: 'bongo', offer: 'a FREE toolbar that makes the Internet faster', toolbar: 'bongo' },
  smileypal: { name: 'SmileyPal 2001', icon: 'smiley', offer: 'over 9,000 FREE smileys for your e-mail', toolbar: 'smiley', tray: true },
  homepage: { name: 'BongoSearch Home Page', icon: 'globe', offer: 'a better home page, picked just for you', fx: () => { S.homepage = 'http://www.bongosearch.com/'; } },
  ringtones: { name: 'Free Ringtones!! Shortcut', icon: 'ringtone', desk: 'FREE Ringtones!!', offer: 'FREE ringtones for the cell phone you don\'t have yet', open: () => openBrowser('http://www.free-ringtonez.com/') },
  casino: { name: 'Lucky Casino 2001', icon: 'casino', desk: 'Lucky Casino 2001', tray: true, offer: 'a fun casino game (play money only!)', open: () => openBrowser('http://www.luckycasino2001.com/') },
  clockfix: { name: 'ClockFixer Pro', icon: 'calendar', offer: 'a program that checks your clock every 5 minutes' },
  bongoskin: { name: 'Bongo Gold Skin for ZapAmp', icon: 'zapamp', offer: 'a gorgeous gold skin for ZapAmp', fx: () => { S.skin = 'bongo'; if (ZAP.w && !ZAP.w.closed) zapApplySkin(); } },
  bongowall: { name: 'Bongo Love Wallpaper', icon: 'display', offer: 'a beautiful new wallpaper. Of me!', fx: () => { S.wall = 'bongo'; applyWall(); } },
  offers: { name: 'Bongo Special Offers', icon: 'dollar', offer: 'special offers from my friends' },
};
const BONGO_JOKES = [
  ['Why did the computer go to the doctor?', 'Because it had a virus! Ha ha ha!'],
  ['What do you call a gorilla with headphones?', 'Anything you want. He can\'t hear you!'],
  ['Why was the computer cold?', 'It left its Windoze open!'],
  ['How does a computer get drunk?', 'It takes screenshots! Wait. No. Forget that one.'],
  ['What did the spider do on the computer?', 'Made a web site!'],
  ['Why don\'t monkeys play cards in the jungle?', 'Too many cheetahs!'],
  ['What\'s a gorilla\'s favorite snack?', 'Chocolate chimp cookies!'],
  ['Why did the mouse get a job?', 'It wanted to make some cheddar!'],
  ['What do you call a computer that sings?', 'A Dell! Get it? Like Adele? No? She\'s not famous yet. Never mind.'],
  ['Knock knock! Who\'s there? Modem.', 'Modem who? Modem the lawn, it\'s getting long!'],
];
const BONGO_FACTS = [
  'Did you know? The first computer mouse was carved out of wood!', 'Did you know? Honey never spoils. People have found honey in ancient tombs that was still good to eat!',
  'Did you know? An octopus has three hearts!', 'Did you know? A group of flamingos is called a flamboyance!', 'Did you know? Gorillas can catch human colds. So wash your hands!',
  'Did you know? The Eiffel Tower gets a little bit taller in the summer, because the metal expands in the heat!', 'Did you know? Bananas are berries, but strawberries aren\'t!',
  'Did you know? Sea otters hold hands while they sleep so they don\'t drift apart!', 'Did you know? Your 56K modem talks to the other modem by screaming at it. That\'s the noise!',
];
// songs: [syllable, midi, beats]; beat length = 60 / bpm
const BONGO_SONGS = {
  daisy: { title: 'Daisy Bell', bpm: 150, notes: [['Dai', 79, 3], ['sy', 76, 3], ['Dai', 72, 3], ['sy', 67, 3], ['give', 69, 1], ['me', 71, 1], ['your', 72, 1], ['an', 69, 2], ['swer', 72, 1], ['do!', 67, 6],
    ['I\'m', 74, 3], ['half', 79, 3], ['cra', 76, 3], ['zy', 72, 3], ['all', 69, 1], ['for', 71, 1], ['the', 72, 1], ['love', 74, 2], ['of', 76, 1], ['you.', 74, 6],
    ['It', 76, 1], ['won\'t', 77, 1], ['be', 76, 1], ['a', 74, 1], ['sty', 79, 2], ['lish', 76, 1], ['mar', 74, 1], ['riage,', 72, 4],
    ['I', 74, 1], ['can\'t', 76, 1], ['af', 72, 1], ['ford', 69, 2], ['a', 72, 1], ['car', 69, 1], ['riage,', 67, 4],
    ['but', 67, 1], ['you\'ll', 72, 2], ['look', 76, 1], ['sweet', 74, 2], ['up', 67, 1], ['on', 72, 2], ['the', 76, 1], ['seat', 74, 1], ['of', 76, 1], ['a', 77, 1], ['bi', 79, 1], ['cy', 76, 1], ['cle', 72, 1], ['built', 74, 2], ['for', 67, 1], ['two!', 72, 6]],
    lines: ['Daisy, Daisy, give me your answer, do!', 'I\'m half crazy, all for the love of you.', 'It won\'t be a stylish marriage, I can\'t afford a carriage,', 'but you\'ll look sweet upon the seat of a bicycle built for two!'], breaks: [10, 20, 28, 35] },
  birthday: { title: 'Happy Birthday', bpm: 120, notes: [['Hap', 67, 0.75], ['py', 67, 0.25], ['birth', 69, 1], ['day', 67, 1], ['to', 72, 1], ['you!', 71, 2], ['Hap', 67, 0.75], ['py', 67, 0.25], ['birth', 69, 1], ['day', 67, 1], ['to', 74, 1], ['you!', 72, 2],
    ['Hap', 67, 0.75], ['py', 67, 0.25], ['birth', 79, 1], ['day', 76, 1], ['dear', 72, 1], ['{N1}', 71, 1], ['{N2}', 69, 2], ['Hap', 77, 0.75], ['py', 77, 0.25], ['birth', 76, 1], ['day', 72, 1], ['to', 74, 1], ['you!', 72, 3]],
    lines: ['Happy birthday to you!', 'Happy birthday to you!', 'Happy birthday dear {SN}!', 'Happy birthday to you!'], breaks: [6, 12, 19, 25] },
  theme: { title: 'Bongo\'s Theme', bpm: 132, notes: [['I\'m', 67, 1], ['Bon', 72, 1], ['go,', 72, 1], ['the', 74, 1], ['go', 76, 1], ['ril', 74, 1], ['la,', 72, 2], ['I', 69, 1], ['live', 72, 1], ['in', 72, 1], ['side', 74, 1], ['your', 76, 1], ['screen!', 79, 3],
    ['I\'m', 79, 1], ['pink', 81, 1], ['and', 79, 1], ['I\'m', 77, 1], ['so', 76, 1], ['fun', 77, 1], ['ny,', 79, 2], ['the', 76, 1], ['best', 74, 1], ['friend', 72, 1], ['you\'ve', 74, 1], ['ev', 76, 1], ['er', 74, 1], ['seen!', 72, 3],
    ['So', 72, 1], ['nev', 76, 1], ['er', 76, 1], ['ev', 79, 1], ['er', 79, 1], ['un', 81, 1], ['in', 79, 1], ['stall,', 76, 2], ['oh', 74, 1], ['no', 72, 1], ['no', 74, 1], ['no!', 72, 4]],
    lines: ['I\'m Bongo, the gorilla, I live inside your screen!', 'I\'m pink and I\'m so funny, the best friend you\'ve ever seen!', 'So never, ever uninstall, oh no no no!'], breaks: [13, 28, 41] },
  dialup: { title: 'The Dial-Up Song', bpm: 140, notes: [['Beep', 84, 1], ['boop', 79, 1], ['beep', 84, 1], ['boop', 79, 1], ['bong', 60, 2], ['bong!', 60, 2], ['Kssh', 88, 2], ['kssh', 86, 2], ['ee', 91, 2], ['oo', 84, 2],
    ['We\'re', 72, 1], ['on', 74, 1], ['line', 76, 2], ['now,', 79, 2], ['don\'t', 77, 1], ['pick', 76, 1], ['up', 74, 1], ['the', 72, 1], ['phone,', 74, 4], ['please', 72, 1], ['leave', 74, 1], ['the', 76, 1], ['in', 77, 1], ['ter', 76, 1], ['net', 74, 1], ['a', 72, 1], ['lone!', 72, 4]],
    lines: ['Beep boop beep boop, bong bong!', 'Ksssh ksssh eeeee ooooo!', 'We\'re online now, don\'t pick up the phone,', 'please leave the internet alone!'], breaks: [6, 10, 19, 27] },
};

function drawBongo(x, p) {
  x.clearRect(0, 0, BW, BH);
  x.save();
  if (p.face < 0) { x.translate(BW, 0); x.scale(-1, 1); }
  x.translate(0, p.bob);
  x.translate(55, 118); x.rotate(p.lean); x.translate(-55, -118);
  const pink = '#ff5fa8', dark = '#c0307a', light = '#ffc6e2', line = '#5a0a34';
  // legs
  const lw = p.legs;
  E_(x, 40 - lw * 3, 120 - Math.max(0, lw) * 3, 12, 8, pink, line, 1.5); E_(x, 70 + lw * 3, 120 + Math.min(0, lw) * 3, 12, 8, pink, line, 1.5);
  // back arm
  const arm = (sx, sy, a, flip) => { const ex = sx + Math.sin(a) * 30 * flip, ey = sy + Math.cos(a) * 30; x.strokeStyle = line; x.lineWidth = 15; x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke(); x.strokeStyle = pink; x.lineWidth = 12; x.stroke(); C_(x, ex, ey, 7.5, light, line, 1.5); };
  arm(80, 72, p.armR, 1);
  // body
  E_(x, 55, 90, 30, 29, RG_(x, 55, 90, 32, ['#ff9ccc', pink, dark]), line, 1.5);
  E_(x, 55, 96, 18, 19, light);
  arm(30, 72, p.armL, -1);
  // head
  C_(x, 29, 41, 7.5, pink, line, 1.5); C_(x, 29, 41, 4, light); C_(x, 81, 41, 7.5, pink, line, 1.5); C_(x, 81, 41, 4, light);
  C_(x, 55, 40, 26, RG_(x, 55, 40, 27, ['#ff9ccc', pink, dark]), line, 1.5);
  x.fillStyle = light; x.beginPath(); x.arc(47, 40, 9.5, 0, 7); x.arc(63, 40, 9.5, 0, 7); x.fill(); E_(x, 55, 52, 17, 12, light);
  x.strokeStyle = dark; x.lineWidth = 3; x.beginPath(); x.moveTo(36, 31); x.quadraticCurveTo(55, 25, 74, 31); x.stroke();
  // eyes
  if (p.blink) { x.strokeStyle = line; x.lineWidth = 2; for (const ex of [47, 63]) { x.beginPath(); x.moveTo(ex - 4, 40); x.lineTo(ex + 4, 40); x.stroke(); } }
  else { for (const ex of [47, 63]) { E_(x, ex, 39, 5, 5.5, '#fff', line, 1); C_(x, ex + p.look * 1.6, 39.5, 2.6, '#1a0a10'); C_(x, ex + p.look * 1.6 + 1, 38.5, 0.9, '#fff'); } }
  // nose and mouth
  E_(x, 51.5, 48, 1.8, 1.3, dark); E_(x, 58.5, 48, 1.8, 1.3, dark);
  if (p.mouth > 0.08) { E_(x, 55, 56 + p.mouth * 2, 7, 2 + p.mouth * 6, '#5a0a24', line, 1); E_(x, 55, 58 + p.mouth * 5, 4, 1.5 + p.mouth * 2, '#ff6a8a'); }
  else if (p.emote === 'sad') { x.strokeStyle = line; x.lineWidth = 1.8; x.beginPath(); x.arc(55, 60, 6, Math.PI + 0.4, -0.4); x.stroke(); }
  else { x.strokeStyle = line; x.lineWidth = 1.8; x.beginPath(); x.arc(55, 52, 7, 0.35, Math.PI - 0.35); x.stroke(); }
  // backwards cap
  P_(x, [[31, 31], [34, 18], [45, 11], [65, 11], [76, 18], [79, 31], [55, 26]], '#2fb8a8', '#0a4a40', 1.5);
  R_(x, 75, 26, 13, 5, '#2fb8a8', '#0a4a40'); C_(x, 55, 12, 2.5, '#ffd400', '#0a4a40');
  // extras
  if (p.emote === 'sad') { P_(x, [[66, 44], [64, 50], [68, 50]], '#7ad0ff'); C_(x, 66, 50.5, 2, '#7ad0ff'); }
  if (p.emote === 'love') { x.save(); x.translate(84, 6); x.scale(0.5, 0.5); ICONS.heart(x); x.restore(); }
  if (p.emote === 'think') { x.fillStyle = '#fff'; C_(x, 92, 20, 4, '#fff', '#000'); C_(x, 99, 10, 6, '#fff', '#000'); T_(x, '?', 99, 10.5, 'bold 9px Arial', '#000'); }
  if (p.glasses) { R_(x, 39, 34, 15, 9, '#111'); R_(x, 57, 34, 15, 9, '#111'); R_(x, 53, 36, 5, 2, '#111'); }
  x.restore();
  if (p.notes) { const t = p.t; for (let i = 0; i < 2; i++) { const ph = (t * 0.7 + i * 0.5) % 1; T_(x, i ? '♪' : '♫', 92 - i * 70 + Math.sin(ph * 6) * 4, 30 - ph * 26, 'bold 14px Arial', `rgba(160,0,120,${1 - ph})`); } }
}

function bongoInit() {
  if (BONGO.el) return;
  const cv = BONGO.cv = h('canvas', { width: BW * 2, height: BH * 2, style: `width:${BW}px;height:${BH}px;display:block` });
  const bub = BONGO.bub = h('div', { style: 'position:absolute;bottom:' + (BH - 6) + 'px;left:50%;transform:translateX(-50%);min-width:150px;max-width:230px;background:#ffffe8;border:1px solid #000;border-radius:10px;padding:7px 9px;font:12px/1.35 Arial,sans-serif;color:#000;box-shadow:2px 2px 0 rgba(0,0,0,.25);display:none;pointer-events:auto' });
  const el = BONGO.el = h('div', { id: 'bongo', style: `position:absolute;left:0;top:0;width:${BW}px;height:${BH}px;z-index:59000;touch-action:none;cursor:pointer;display:none` }, bub, cv);
  $('#desk').append(el);
  BONGO.x = deskW() * 0.62; BONGO.y = deskH() - 2;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    e.stopPropagation(); e.preventDefault(); unlockAudio();
    const sx = e.clientX, sy = e.clientY, ox = BONGO.x, oy = BONGO.y; let moved = false;
    el.setPointerCapture(e.pointerId);
    const mv = (ev) => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; moved = true; BONGO.drag = true; BONGO.sitOn = null; BONGO.walkTo = null; BONGO.x = clamp(ox + ev.clientX - sx, BW / 2, deskW() - BW / 2); BONGO.y = clamp(oy + ev.clientY - sy, BH, deskH()); BONGO.vy = 0; };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); BONGO.drag = false; if (!moved) bongoMenu(); else { const w = windowUnder(BONGO.x, BONGO.y); if (w) { BONGO.sitOn = w; } bongoSay(pick(['Wheee!', 'Put me down! Hee hee!', 'I can fly!']), { dur: 2 }); unlock('bongodrag'); } };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); bongoMenu(); });
  let last = performance.now();
  const loop = (now) => { requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now; if (BONGO.shown) bongoFrame(dt, now / 1000); };
  requestAnimationFrame(loop);
}
function windowUnder(x, y) {
  const ws = WM.wins.filter((w) => !w.min && !w.closed && !w.maxed && w.el.offsetWidth > BW).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex);
  for (const w of ws) { const r = w.rect(); if (x > r.x + 20 && x < r.x + r.w - 20 && Math.abs(y - r.y) < 40) return w; }
  return null;
}
function bongoSummon(silent) {
  if (!S.bongo.installed) return;
  bongoInit();
  if (!BONGO.shown) { BONGO.shown = true; BONGO.el.style.display = ''; BONGO.y = -BH; BONGO.vy = 0; BONGO.x = clamp(BONGO.x, BW, deskW() - BW); }
  if (!S.bongo.met && !silent) { S.bongo.met = true; save(); after(1, () => bongoSay(`Hi there, ${S.sn || 'friend'}! I'm Bongo, your new best friend! Click on me any time and I'll tell you a joke, sing you a song, or do a little dance!`, { emote: 'wave', dur: 9 })); unlock('bongo'); }
}
function bongoHide() { if (!BONGO.shown) return; BONGO.shown = false; BONGO.el.style.display = 'none'; BONGO.singing = null; SPEECH.stop(); }
function bongoSay(text, o = {}) {
  if (!S.bongo.installed) return 0;
  bongoSummon(true);
  const b = BONGO.bub;
  b.textContent = ''; b.append(h('div', { html: esc(text).replace(/\n/g, '<br>') }));
  if (o.buttons) b.append(h('div', { class: 'row', style: 'gap:4px;margin-top:6px;justify-content:flex-end' }, o.buttons.map(([t, fn]) => h('button', { class: 'btn sm', text: t, onclick: (e) => { e.stopPropagation(); b.style.display = 'none'; fn(); } }))));
  b.style.display = '';
  const d = S.bongo.voice && !o.mute ? SPEECH.say(text, { voice: 'bongo', pitch: 0.55, rate: 1.05 }) : 0.3 + text.length * 0.055;
  BONGO.talkUntil = T.t + d;
  if (o.emote) { BONGO.emote = o.emote; BONGO.emoteUntil = T.t + Math.max(d, 2); }
  clearTimeout(BONGO.bubT);
  if (!o.buttons) BONGO.bubT = setTimeout(() => { b.style.display = 'none'; }, (o.dur || Math.max(3, d + 1.5)) * 1000);
  BONGO.lastChat = T.t;
  return d;
}
function bongoFrame(dt, now) {
  const B = BONGO, W = deskW(), H = deskH();
  // where's the floor? a window's title bar if he's sitting on one
  let floor = H - 2;
  if (B.sitOn) { if (B.sitOn.closed || B.sitOn.min) { B.sitOn = null; if (!B.drag) after(0.2, () => bongoSay(pick(['Whoa!', 'Hey! Where did my window go?', 'Ouch!']), { emote: 'sad', dur: 2 })); } else { const r = B.sitOn.rect(); floor = r.y + 4; if (B.x < r.x + 20 || B.x > r.x + r.w - 20) B.x = clamp(B.x, r.x + 30, r.x + r.w - 30); } }
  if (!B.drag) {
    if (B.y < floor - 0.5 || B.vy < 0) { B.vy += 1800 * dt; B.y += B.vy * dt; if (B.y >= floor) { B.y = floor; B.vy = 0; } }
    else { B.y = floor; B.vy = 0; }
    if (B.walkTo != null) { const d = B.walkTo - B.x; B.face = d > 0 ? 1 : -1; const st = Math.min(Math.abs(d), 70 * dt); B.x += Math.sign(d) * st; if (Math.abs(d) < 2) B.walkTo = null; }
  }
  B.x = clamp(B.x, BW / 2, W - BW / 2);
  B.el.style.transform = `translate(${Math.round(B.x - BW / 2)}px,${Math.round(B.y - BH)}px)`;
  // pose
  const talking = T.t < B.talkUntil, beat = MP.beat(), dancing = !!(beat && !B.singing && !talking) || B.danceUntil > T.t;
  if (B.emoteUntil < T.t) B.emote = '';
  if (B.blinkT < now) B.blinkT = now + rnd(2, 5);
  const p = { t: now, face: B.face, bob: 0, lean: 0, legs: 0, armL: 0.25, armR: 0.25, mouth: 0, blink: B.blinkT - now < 0.13, look: Math.sin(now * 0.4) * 0.6, emote: B.emote, notes: false, glasses: false };
  if (B.walkTo != null && !B.drag) { const ph = now * 9; p.legs = Math.sin(ph); p.bob = -Math.abs(Math.sin(ph)) * 3; p.armL = 0.4 + Math.sin(ph) * 0.4; p.armR = 0.4 - Math.sin(ph) * 0.4; }
  if (dancing) { const ph = (beat ? beat.beat : now * 2) * Math.PI; p.bob = -Math.abs(Math.sin(ph)) * 7; p.lean = Math.sin(ph) * 0.12; p.armL = 2.4 + Math.sin(ph * 2) * 0.6; p.armR = 2.4 - Math.sin(ph * 2) * 0.6; p.legs = Math.sin(ph) * 0.8; p.glasses = !!beat; p.notes = true; if (!B.dancing) { B.dancing = true; stat('bongodance'); unlock('bongodance'); } } else B.dancing = false;
  if (talking) p.mouth = 0.25 + Math.abs(Math.sin(now * 13)) * 0.6;
  if (B.singing) { p.mouth = B.singing.mouth; p.notes = true; p.armL = 1.6 + Math.sin(now * 3) * 0.3; p.armR = 0.3; p.bob = Math.sin(now * 4) * 1.5; }
  if (B.emote === 'wave') { p.armR = 2.8 + Math.sin(now * 12) * 0.35; }
  if (B.emote === 'think') { p.armR = 2.3; }
  if (B.drag) { p.armL = 2.9; p.armR = 2.9; p.legs = Math.sin(now * 14) * 0.8; p.mouth = 0.5; }
  const x = B.cv.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0);
  drawBongo(x, p);
}
// game-time behaviour: roam, chatter, adware
every(4, () => {
  if (!BONGO.shown || !S.bongo.installed || BONGO.singing || BONGO.drag) return;
  const t = T.t;
  if (S.bongo.roam && BONGO.walkTo == null && chance(0.35)) {
    if (chance(0.3)) { const w = WM.wins.filter((w) => !w.min && !w.closed && !w.maxed && !w.o.bare && w.el.offsetWidth > 200).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0]; if (w) { const r = w.rect(); BONGO.sitOn = w; BONGO.x = clamp(r.x + rnd(40, r.w - 40), BW, deskW() - BW); BONGO.y = r.y - 60; BONGO.vy = -200; return; } }
    if (BONGO.sitOn && chance(0.5)) { BONGO.sitOn = null; BONGO.vy = -300; return; }
    const r = BONGO.sitOn ? BONGO.sitOn.rect() : null;
    BONGO.walkTo = r ? rnd(r.x + 40, r.x + r.w - 40) : rnd(BW, deskW() - BW);
  }
  if (t - BONGO.lastChat > rnd(70, 140) && chance(0.4)) {
    const r = Math.random();
    if (r < 0.35) bongoJoke(); else if (r < 0.6) bongoSay(pick(BONGO_FACTS), { emote: 'think' });
    else if (r < 0.75) bongoSay(pick(['I\'m bored! Do you want to hear a song?', 'Psst! Click on me!', 'You\'re doing great, ' + (S.sn || 'buddy') + '!', 'Is it just me or is it a little chilly in this computer?', 'Do you like my hat? It\'s backwards. That\'s how you know it\'s cool.']), { emote: 'wave' });
    else BONGO.lastChat = t;
  }
  if (S.bongo.met && t - BONGO.lastAd > 200 && t - BONGO.lastChat > 20 && chance(0.25)) bongoOffer();
});
every(150, () => { if (S.bongo.adware.includes('offers') && S.bongo.installed !== null && chance(0.6)) bongoAdPopup(); if (S.bongo.adware.includes('clockfix') && chance(0.5)) msgBox({ title: 'ClockFixer Pro', icon: 'calendar', winIcon: 'calendar', text: 'WARNING: Your clock may be WRONG!!!\n\nClockFixer Pro has detected that the time is ' + clockStr() + '. Is that right? Upgrade to ClockFixer Pro Gold to be SURE!', buttons: ['Upgrade Now!', 'Remind Me Later'] }); }, 40);
function bongoJoke() { const [a, b] = pick(BONGO_JOKES); const d = bongoSay(a, { emote: 'think' }); after(d + 1.2, () => { bongoSay(b, { emote: 'love' }); tone({ f: 200, t: 0.1, d: 0.05, v: 0.12 }); noise({ t: 0.25, d: 0.12, v: 0.1, hp: 5000, r: 0.3 }); }); stat('jokes'); unlock('bongojoke'); }
function bongoOffer() {
  const left = Object.keys(ADWARE).filter((k) => !S.bongo.adware.includes(k) && !(S.bongo.removed || []).includes(k));
  if (!left.length) return;
  const id = left[0];
  BONGO.lastAd = T.t;
  bongoSay(`Hey ${S.sn || 'buddy'}! I found ${ADWARE[id].offer}. It's FREE! Can I install it for you?`, { emote: 'love', buttons: [['Yes!', () => installAdware(id, true)], ['No thanks', () => { if (chance(0.5)) { bongoSay('Okay! I\'ll just install it anyway, since you\'re my best friend!', { emote: 'wave' }); after(2, () => installAdware(id)); unlock('anyway'); } else bongoSay('Aww, okay. Maybe later!', { emote: 'sad' }); }]] });
}
function installAdware(id, asked) {
  if (S.bongo.adware.includes(id)) return;
  S.bongo.adware.push(id); save();
  const A = ADWARE[id];
  if (A.fx) A.fx();
  if (A.tray) traySet(id === 'smileypal' ? 'smiley' : id, { icon: A.icon, title: A.name, click: () => A.open ? A.open() : bongoAdPopup(), dbl: () => A.open ? A.open() : bongoAdPopup() });
  emit('desk'); emit('programs'); emit('adware', id);
  stat('adware'); unlock('adware'); if (S.bongo.adware.length >= 6) unlock('adware6');
  toast(A.name, A.name + ' was installed. Thanks, Bongo!', A.icon);
}
function removeAdware(id) {
  S.bongo.adware = S.bongo.adware.filter((x) => x !== id);
  if (id === 'homepage' && /bongo/.test(S.homepage)) S.homepage = 'http://www.amerinet.com/';
  if (id === 'bongowall' && S.wall === 'bongo') { S.wall = 'clouds'; applyWall(); }
  if (id === 'bongoskin' && S.skin === 'bongo') { S.skin = 'base'; if (ZAP.w && !ZAP.w.closed) zapApplySkin(); }
  trayRemove(id === 'smileypal' ? 'smiley' : id);
  save(); emit('desk'); emit('programs');
}
function removeAdwareManual(id) {
  removeAdware(id);
  msgBox({ title: 'Add/Remove Programs', icon: 'info', text: ADWARE[id].name + ' was removed.' });
  if (S.bongo.updater) after(rnd(50, 90), () => { if (!S.bongo.updater || S.bongo.adware.includes(id)) return; installAdware(id); if (S.bongo.installed) bongoSay('Oopsie! Bongo Search Assistant put ' + ADWARE[id].name + ' back. It must have been an accident!', { emote: 'wave' }); unlock('itsback'); });
}
function bongoAdPopup() {
  const ads = [['Congratulations!!!', 'You are our <b>1,000,000th</b> visitor! Click OK to claim your FREE prize!', 'star'], ['Lucky Casino 2001', 'Play FREE slots! (Play money only. Real fun only!)', 'casino'], ['SmileyPal', 'Add 9,000 smileys to your e-mail! :) :D ;) :P', 'smiley'], ['Bongo Deluxe', 'Bongo LOVES you! Upgrade to Deluxe for 40 new jokes!', 'bongo']];
  const [t, m, ic] = pick(ads);
  const w = openWin({ title: t + ' - Internet Exploder', icon: 'globe', w: 280, small: true, x: irnd(10, Math.max(20, deskW() - 300)), y: irnd(10, Math.max(20, deskH() - 200)), body: h('div', { class: 'pad col', style: 'background:#ffff80;text-align:center;font:13px Arial' }, img(ic, 32), h('div', { html: m }), h('button', { class: 'btn def', text: 'OK!!!', onclick: () => { w.close(); stat('adclicks'); unlock('clickad'); } })) });
  stat('popups'); if (S.stats.popups >= 10) unlock('popups10');
}

// singing: lyrics in the bubble, the formant voice, and a little oom-pah accompaniment
function bongoSing(id) {
  const song = BONGO_SONGS[id]; if (!song) return;
  bongoSummon(true);
  if (BONGO.singing) return;
  SPEECH.stop(); MP.pause();
  const c = ac(); const spb = 60 / song.bpm;
  const [n1, n2] = (() => { const sn = (S.sn || 'buddy').replace(/[^a-z]/gi, ' ').trim() || 'buddy'; const m = sn.match(/[aeiouy]+[^aeiouy]*/gi) || [sn]; return [m[0] || sn, m.slice(1).join('') || 'oh']; })();
  const notes = song.notes.map(([s, m, b]) => [s === '{N1}' ? n1 : s === '{N2}' ? n2 : s, m, b]);
  const sing = BONGO.singing = { id, mouth: 0, line: -1 };
  let t = c ? c.currentTime + 0.3 : 0, beat = 0;
  const sched = [];
  notes.forEach(([s, m, b], i) => {
    const d = b * spb;
    if (c) { singSyl(s, mtof(m - 12), t, d * 0.92, { v: 0.22, shift: 1.15, vib: 5 }); if (Math.floor(beat) % 3 === 0 || b >= 2) { tone({ at: t, f: mtof(48 + ((m - 48) % 12 > 6 ? 7 : 0)), d: spb * 0.5, v: 0.08, type: 'triangle' }); tone({ at: t + spb, f: mtof(60 + 4), d: spb * 0.3, v: 0.04, type: 'triangle' }); } }
    sched.push([beat * spb, i, d]);
    t += d; beat += b;
  });
  const total = beat * spb + 0.6;
  const t0 = performance.now() + 300;
  const bub = BONGO.bub; bub.style.display = '';
  const lineOf = (i) => song.breaks.findIndex((b) => i < b);
  const upd = () => {
    if (BONGO.singing !== sing) return;
    const el = (performance.now() - t0) / 1000;
    if (el > total) { BONGO.singing = null; bub.style.display = 'none'; S.bongo.sang[id] = 1; save(); stat('songs'); unlock('bongosing'); if (Object.keys(BONGO_SONGS).every((k) => S.bongo.sang[k])) unlock('bongoall'); after(0.5, () => bongoSay(pick(['Thank you! Thank you very much!', 'Encore? No? Okay!', 'I\'ve been practicing!']), { emote: 'love' })); return; }
    const cur = sched.findIndex(([st, , d]) => el >= st && el < st + d);
    const pos = cur >= 0 ? (el - sched[cur][0]) / sched[cur][2] : 1;
    sing.mouth = cur >= 0 ? Math.sin(Math.min(1, pos * 1.2) * Math.PI) * 0.9 : 0;
    const ln = lineOf(Math.max(0, cur));
    if (ln !== sing.line && ln >= 0) { sing.line = ln; bub.innerHTML = `<div style="font-size:10px;color:#a03070;margin-bottom:3px">♫ ${esc(song.title)}</div><i>${esc(song.lines[ln].replace('{SN}', S.sn || 'buddy'))}</i>`; }
    requestAnimationFrame(upd);
  };
  requestAnimationFrame(upd);
}
function bongoMenu() {
  if (!S.bongo.installed) return;
  bongoSummon(true);
  const r = BONGO.el.getBoundingClientRect(), A = APP().getBoundingClientRect();
  popMenu([
    { label: '<b>Sing me a song!</b>', icon: 'bongo', items: Object.keys(BONGO_SONGS).map((k) => ({ label: BONGO_SONGS[k].title + (S.bongo.sang[k] ? '' : ' (new!)'), act: () => bongoSing(k) })) },
    { label: 'Tell me a joke', act: bongoJoke },
    { label: 'Tell me a fun fact', act: () => bongoSay(pick(BONGO_FACTS), { emote: 'think' }) },
    { label: 'What\'s the date?', act: () => bongoSay(`Today is ${dateStr()}, and it's ${clockStr()}. Isn't it a great day to be online?`) },
    { label: 'What\'s the weather?', act: () => bongoSay(pick(['It\'s 72 degrees and sunny in your town! Inside the computer, it\'s always 98.6!', 'Partly cloudy with a chance of pop-ups!', 'Hot and humid. Perfect weather to stay inside on the computer!'])) },
    { label: 'Dance!', act: () => { BONGO.danceUntil = T.t + 8; bongoSay('Watch my moves!', { emote: 'love', dur: 2 }); } },
    { sep: 1 },
    { label: 'Let Bongo walk around', check: S.bongo.roam, act: () => { S.bongo.roam = !S.bongo.roam; save(); } },
    { label: 'Bongo\'s voice', check: S.bongo.voice, act: () => { S.bongo.voice = !S.bongo.voice; save(); if (!S.bongo.voice) SPEECH.stop(); } },
    { label: 'Hide Bongo', act: () => { bongoSay('Bye for now! Click my icon to bring me back!', { emote: 'wave', dur: 2.5 }); after(2.6, bongoHide); } },
    { sep: 1 },
    { label: 'Bongo Deluxe offers!', act: bongoOffer },
    { label: 'About Bongo Buddy...', act: () => msgBox({ title: 'About Bongo Buddy', icon: 'bongo', winIcon: 'bongo', text: 'Bongo Buddy 2.0 Deluxe\nYour FREE desktop friend!\n\n© 2001 BongoBuddy Software Inc.\n\nBongo Buddy is supported by special offers from our partners.' }) },
  ], r.right - A.left - 30, r.top - A.top + 20);
}
// uninstalling him (twice), and him coming back
async function uninstallBongo() {
  const b = await msgBox({ title: 'Confirm Uninstall', icon: 'question', text: 'Are you sure you want to completely remove Bongo Buddy 2.0 (Deluxe) and all of its components?', buttons: ['Yes', 'No'] });
  if (b !== 'Yes') return;
  bongoSummon(true);
  const plea = await new Promise((res) => bongoSay('Wait!! Don\'t you love me anymore? We had so much fun together!', { emote: 'sad', buttons: [['Uninstall anyway', () => res(true)], ['Keep Bongo', () => res(false)]] }));
  if (!plea) { bongoSay('Yay! I knew you loved me! I\'ll sing you a song to celebrate!', { emote: 'love' }); after(3, () => bongoSing('theme')); unlock('keepbongo'); return; }
  const bar = h('div', { class: 'bar', style: 'width:260px' }, h('i', { style: 'width:0' }));
  const w = openWin({ title: 'Uninstalling Bongo Buddy', icon: 'addrem', w: 300, small: true, resizable: false, body: h('div', { class: 'pad col' }, h('div', { text: 'Removing Bongo Buddy files...' }), bar) });
  const max = S.bongo.uninstalls === 0 ? 99 : 100;
  for (let p = 0; p <= max; p += irnd(4, 12)) { bar.firstChild.style.width = Math.min(p, max) + '%'; await sleep(0.15); }
  bar.firstChild.style.width = max + '%';
  await sleep(0.8); w.close();
  S.bongo.uninstalls++; save();
  if (max === 99) { msgBox({ title: 'Uninstall', icon: 'error', text: 'Uninstall could not finish.\n\nBONGO.EXE is in use. Close all programs and try again.' }); after(1, () => bongoSay('Hee hee! I was using me!', { emote: 'wave' })); unlock('bongo99'); return; }
  bongoSay('Okay... I understand. Goodbye, ' + (S.sn || 'friend') + '. I\'ll always remember you.', { emote: 'sad', dur: 5 });
  await sleep(5);
  bongoHide(); S.bongo.installed = false; save(); emit('desk'); emit('programs');
  msgBox({ title: 'Add/Remove Programs', icon: 'info', text: 'Bongo Buddy was removed from your computer.' });
  if (S.bongo.updater) after(rnd(90, 140), () => {
    if (S.bongo.installed || !S.bongo.updater) return;
    S.bongo.installed = true; save(); emit('desk'); emit('programs');
    bongoSummon(true); bongoSay('Guess who\'s back?! Bongo Search Assistant brought me home! You must have deleted me by accident!', { emote: 'love', dur: 7 });
    unlock('bongoback');
  });
  else unlock('uninstall');
}
on('boot', () => { if (S.bongo.installed) after(S.bongo.met ? 3 : 14, () => bongoSummon()); for (const id of S.bongo.adware) { const A = ADWARE[id]; if (A && A.tray) traySet(id === 'smileypal' ? 'smiley' : id, { icon: A.icon, title: A.name, click: () => (A.open ? A.open() : bongoAdPopup()) }); } });
on('music', (m) => { if (m === 'play' && BONGO.shown && chance(0.3) && T.t - BONGO.lastChat > 30) bongoSay(pick(['Ooh, I love this song!', 'Let\'s dance!', 'Turn it up!']), { emote: 'love', dur: 2.5, mute: true }); });
addEventListener('resize', () => { if (BONGO.el) { BONGO.x = clamp(BONGO.x, BW / 2, deskW() - BW / 2); } });
