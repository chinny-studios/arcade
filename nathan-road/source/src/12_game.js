// 12_game: what there is to do. Discover landmarks (each adds a note to the notebook), run errands for people around
// Tsim Sha Tsui, take photos (some famous views are listed in the notebook), ride the Star Ferry, and go up on the
// roof of Milton Mansion once the guard trusts you. Money, items and progress save to localStorage.
const SAVE_KEY = 'nathan-road-save';
const ST = { money: 300, items: {}, found: {}, er: {}, photos: [], vps: {}, roofKey: false, zoom: false, freeRide: false, walked: 0, t: 16.5, day: 0 };
const NPC = {};          // street characters: { mesh, x, z, yaw, name, zh, role }
let DLG = null;          // open dialogue
let PHOTO = { on: false, fov: 62 };

// ---------------------------------------------------------------- characters on the street
function placeNPC(id, name, zh, x, z, yaw, look) {
  const y = groundAt(x, z);
  const m = makePerson(look, x, y, z, yaw);
  NPC[id] = { id, name, zh, x, z, yaw, mesh: m, base: yaw };
  addCircle(x, z, 0.3, 5, 6);
  return NPC[id];
}
// a street stall (a green kiosk with a sign), with its keeper standing behind it, facing the road
function stall(id, name, zh, x, z, signKey, look) {
  const [E] = nearestEdge(x, z, 40);
  const [px, pz] = findClass(x, z, G.PAVE, 30);
  let fx = 1, fz = 0;                                  // unit vector from the stall towards the road
  if (E) { const q = nearestOnEdge(E, px, pz), L = Math.hypot(q[0] - px, q[1] - pz) || 1; fx = (q[0] - px) / L; fz = (q[1] - pz) / L; }
  const g = new Geo(), ux = -fz, uz = fx;
  g.setXf(new THREE.Matrix4().makeTranslation(px, KERB, pz).multiply(new THREE.Matrix4().makeRotationY(Math.atan2(-fx, -fz))));
  g.col = [0.2, 0.42, 0.3]; g.box(-1.1, 0, -0.7, 1.1, 1.1, 0.7, T.white);
  g.col = [0.9, 0.88, 0.8]; g.box(-1.3, 2.2, -1.0, 1.3, 2.32, 1.0, T.white);
  g.col = [0.6, 0.6, 0.62]; for (const sx of [-1.1, 1.1]) g.box(sx - 0.04, 1.1, 0.6, sx + 0.04, 2.2, 0.68, T.white);
  g.setXf(null); g.col = [1, 1, 1];
  const m = g.mesh(MAT.world); m.name = 'stall'; scene.add(m);
  board(W.signGeo, px + fx * 0.02, KERB + 2.62, pz + fz * 0.02, -fz, fx, 2.4, 0.6, SIGNS.special[signKey], 1);
  board(W.signGeo, px - fx * 0.02, KERB + 2.62, pz - fz * 0.02, fz, -fx, 2.4, 0.6, SIGNS.special[signKey], 1);
  lmGlow(px, pz, 6, '#ffe8b0', 0.6);
  addBox(px, pz, 1.1, 0.7, -Math.atan2(-fx, -fz), 5);
  // the keeper stands behind the counter, facing the road
  return placeNPC(id, name, zh, px - fx * 1.2, pz - fz * 1.2, Math.atan2(-fx, -fz), look);
}
function nearestOnEdge(E, x, z) {
  const p = E.pts; let best = [p[0], p[1]], bd = 1e9;
  for (let k = 2; k < p.length; k += 2) {
    const ax = p[k - 2], az = p[k - 1], dx = p[k] - ax, dz = p[k + 1] - az, l = dx * dx + dz * dz;
    const t = l ? clamp(((x - ax) * dx + (z - az) * dz) / l, 0, 1) : 0, qx = ax + dx * t, qz = az + dz * t, d = (qx - x) ** 2 + (qz - z) ** 2;
    if (d < bd) { bd = d; best = [qx, qz]; }
  }
  return best;
}
// a clear pavement spot beside a named street near (x, z)
function streetSpot(x, z, re) {
  let best = null, bd = 1e9;
  for (const E of W.edges) { if (!re.test(E.name)) continue; const q = nearestOnEdge(E, x, z), d = dist2(q[0], q[1], x, z); if (d < bd) { bd = d; best = [E, q]; } }
  if (!best) return [x, z];
  const [E, q] = best, [, , dx, dz] = polyAt(E.pts, 0);
  const clear = (px, pz) => gclass(px, pz) === G.PAVE && [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]].every(([a, b]) => gclass(px + a, pz + b) !== G.BUILD);
  for (let off = E.w / 2 + 1.6; off < E.w / 2 + 6; off += 0.4) for (const s of [1, -1]) { const px = q[0] - dz * off * s, pz = q[1] + dx * off * s; if (clear(px, pz)) return [px, pz]; }
  return findClass(q[0], q[1], G.PAVE, 10);
}
function placeStreetNPCs() {
  const look = (o) => Object.assign({ shirt: [0.8, 0.8, 0.8], pants: [0.2, 0.2, 0.25], hair: [0.05, 0.05, 0.05], skin: 0.1, h: 1 }, o);
  // an egg tart stall on Granville Road, a block east of Milton
  const [bx, bz] = streetSpot(55, -6, /Granville Road/);
  stall('baker', 'Mrs Ho', '何太', bx, bz, 'tarts', look({ shirt: [0.95, 0.95, 0.9], skin: 0.1, h: 0.94 }));
  // touts outside Chungking Mansions: a curry seller and a tailor's man
  const ck = facadeFacing(W.byName['Chungking Mansions'], -1, 0);
  placeNPC('raj', 'Raj', '', ck[6] + ck[4] * 3 + 4, ck[7] + ck[5] * 3 + 3, Math.atan2(-ck[4], -ck[5]), look({ shirt: [0.85, 0.75, 0.4], pants: [0.25, 0.22, 0.2], skin: 0.65 }));
  placeNPC('tailor', 'Mr Ali', '', ck[6] + ck[4] * 3.5 - 6, ck[7] + ck[5] * 3.5 - 4, Math.atan2(-ck[4], -ck[5]), look({ shirt: [0.92, 0.92, 0.88], pants: [0.2, 0.2, 0.22], skin: 0.55, h: 1.02 }));
  // Granny Chan on a bench by the lotus pond
  const [gx, gz] = findClass(-160, 70, G.PAVE, 30);
  placeNPC('granny', 'Granny Chan', '陳婆婆', gx, gz, 0, look({ shirt: [0.45, 0.32, 0.5], pants: [0.15, 0.15, 0.18], hair: [0.75, 0.75, 0.75], skin: 0.12, h: 0.9 }));
  // the park warden at Bird Lake
  const bl = W.LP.birdlake, [wx, wz] = findClass(bl[0] + 16, bl[1], G.PAVE, 30);
  placeNPC('warden', 'Mr Leung', '梁先生', wx, wz, Math.atan2(-(bl[0] - wx), -(bl[1] - wz)), look({ shirt: [0.3, 0.45, 0.3], pants: [0.25, 0.3, 0.25], skin: 0.15 }));
  // the doorman at The Peninsula, at the front facing the harbour
  let pen = null; for (const k in W.byName) if (/Peninsula/.test(k) && W.byName[k].h < 60 && (!pen || W.byName[k].area > pen.area)) pen = W.byName[k];
  if (pen) { const f = facadeFacing(pen, 0, 1); placeNPC('doorman', 'The doorman', '門僮', f[6] + f[4] * 2.2, f[7] + f[5] * 2.2, Math.atan2(-f[4], -f[5]), look({ shirt: [0.95, 0.95, 0.95], pants: [0.95, 0.95, 0.95], skin: 0.2 })); }
  else placeNPC('doorman', 'The doorman', '門僮', -55, 505, Math.PI, look({ shirt: [0.95, 0.95, 0.95], pants: [0.95, 0.95, 0.95] }));
  // a visitor at the Clock Tower
  const ct = LM_BY.clocktower, [ix, iz] = findClass(ct.x + 14, ct.z - 10, G.PAVE, 20);
  placeNPC('ingrid', 'Ingrid', '', ix, iz, Math.atan2(-(ct.x - ix), -(ct.z - iz)), look({ shirt: [0.3, 0.55, 0.75], pants: [0.75, 0.7, 0.6], hair: [0.85, 0.75, 0.45], skin: 0.0, h: 1.0 }));
  // a milk tea stall on Peking Road
  const [cx, cz] = streetSpot(-90, 300, /Peking Road/);
  stall('fai', 'Ah Fai', '阿輝', cx, cz, 'tea', look({ shirt: [0.9, 0.9, 0.85], pants: [0.15, 0.15, 0.15], skin: 0.12 }));
  // Uncle Sam, the ferry deckhand, at the pier entrance
  const fd = W.LP.ferryDoor || [-400, 615];
  placeNPC('sam', 'Uncle Sam', '森叔', fd[0] + 3, fd[1] - 2, Math.atan2(-(LM_BY.clocktower.x - fd[0]), -(LM_BY.clocktower.z - fd[1])), look({ shirt: [0.2, 0.3, 0.55], pants: [0.2, 0.3, 0.55], hair: [0.6, 0.6, 0.6], skin: 0.18 }));
  // Kit, a photographer, on the Avenue of Stars
  const av = LM_BY.avenue;
  placeNPC('kit', 'Kit', '阿傑', av.x, av.z - 2, Math.PI, look({ shirt: [0.1, 0.1, 0.12], pants: [0.25, 0.3, 0.4], skin: 0.1 }));
  // the news stand
  const nw = W.LP.news;
  placeNPC('news', 'Newsagent', '報販', nw[0] - 0.5, nw[1], -Math.PI / 2, look({ shirt: [0.6, 0.55, 0.45], pants: [0.2, 0.2, 0.2], hair: [0.5, 0.5, 0.5], skin: 0.15 }));
}

// ---------------------------------------------------------------- errands
// stage 0 = not started; done when stage === 'done'. target(): [space, x, z] for the marker.
const ERRANDS = [
  { id: 'tarts', title: 'Egg tarts for the guard', giver: 'guard',
    steps: ['Buy egg tarts at the stall on Granville Road.', 'Take the egg tarts to Uncle Keung in Milton Mansion.'],
    target(s) { return s === 1 ? ['street', NPC.baker.x, NPC.baker.z] : ['milton', ...MILTON.guardPos]; } },
  { id: 'curry', title: 'Lunch for the tailor', giver: 'tailor',
    steps: ['Get a mutton curry from Raj outside Chungking Mansions.', 'Take the curry to Mr Ali, a few steps along Nathan Road.', 'Deliver Mr Fenwick\'s suit to the doorman at The Peninsula.'],
    target(s) { return s === 1 ? ['street', NPC.raj.x, NPC.raj.z] : s === 2 ? ['street', NPC.tailor.x, NPC.tailor.z] : ['street', NPC.doorman.x, NPC.doorman.z]; } },
  { id: 'paper', title: 'The racing pages', giver: 'granny',
    steps: ['Buy a newspaper at the stand by the Kowloon Park gate on Nathan Road.', 'Bring the paper to Granny Chan by the lotus pond.'],
    target(s) { return s === 1 ? ['street', NPC.news.x, NPC.news.z] : ['street', NPC.granny.x, NPC.granny.z]; } },
  { id: 'flamingo', title: 'Count the flamingos', giver: 'warden',
    steps: ['Count the flamingos in Bird Lake and tell Mr Leung the number.'],
    target() { return ['street', NPC.warden.x, NPC.warden.z]; } },
  { id: 'ingrid', title: 'A photo for Ingrid', giver: 'ingrid',
    steps: ['Take a photo of Ingrid with the Clock Tower behind her (C for the camera).', 'Show Ingrid the photo.'],
    target() { return ['street', NPC.ingrid.x, NPC.ingrid.z]; } },
  { id: 'milktea', title: 'Milk tea for Uncle Sam', giver: 'fai',
    steps: ['Take two milk teas from Ah Fai\'s stall on Peking Road to Uncle Sam at the Star Ferry pier.'],
    target() { return ['street', NPC.sam.x, NPC.sam.z]; } },
  { id: 'show', title: 'A Symphony of Lights', giver: 'kit',
    steps: ['Photograph A Symphony of Lights from the waterfront at 8 pm.', 'Show Kit the photo on the Avenue of Stars.'],
    target() { return ['street', NPC.kit.x, NPC.kit.z]; } },
];
const ER_BY = {}; for (const e of ERRANDS) ER_BY[e.id] = e;
const erStage = (id) => ST.er[id] || 0;
function setStage(id, s) {
  ST.er[id] = s; save();
  const e = ER_BY[id];
  if (s === 'done') { bus.emit('sfx', 'done'); banner('ERRAND DONE', e.title, ''); }
  else if (s === 1) toast('New errand: ' + e.title);
}
function activeErrand() {
  if (ST.track && erStage(ST.track) && erStage(ST.track) !== 'done') return ER_BY[ST.track];
  for (const e of ERRANDS) { const s = erStage(e.id); if (s && s !== 'done') return e; }
  return null;
}
const hasItem = (k) => (ST.items[k] || 0) > 0;
function giveItem(k, n = 1) { ST.items[k] = (ST.items[k] || 0) + n; }
function takeItem(k) { if (ST.items[k]) ST.items[k]--; if (!ST.items[k]) delete ST.items[k]; }
// with an Octopus card that has the value, you tap it; otherwise cash
function pay(n, what) {
  if (ST.octopus && ST.octopus.balance >= n) return octoPay(n, what);
  if (ST.money < n) { toast('Not enough money.'); return false; } ST.money -= n; bus.emit('sfx', 'coins'); return true;
}
function earn(n) { ST.money += n; bus.emit('sfx', 'coins'); toast(`+HK$${n}`); }
const ITEM_NAMES = { tarts: 'Box of egg tarts', curry: 'Mutton curry (takeaway)', suit: 'Mr Fenwick\'s suit', paper: 'Newspaper', milktea: 'Two milk teas', postcard: 'Postcard from Ingrid' };

// what each character says, given the state of things
function talk(id) {
  const n = NPC[id] || {};
  const say = (text, opts) => openDialog(n.name || MILTON_NAMES[id] && MILTON_NAMES[id][0], n.zh || MILTON_NAMES[id] && MILTON_NAMES[id][1], text, opts);
  const s = (k) => erStage(k);
  switch (id) {
    case 'guard':
      if (!s('tarts')) return say('Ah, 你好. Uncle Keung, I keep the door here. Been on since six and I\'m starving. Mrs Ho\'s stall on Granville Road has egg tarts fresh out of the oven about now. Would you fetch me a box? I\'ll make it worth your while.', [['Sure, I\'ll go.', () => setStage('tarts', 1)], ['Maybe later.', null]]);
      if (s('tarts') === 1 && !hasItem('tarts')) return say('Mrs Ho\'s stall, yellow sign, just along Granville Road from the corner. Go on, before they sell out!');
      if (s('tarts') === 1 && hasItem('tarts')) return say('Still warm! 唔該晒. Here, take this: the key to the roof door. Lift to R, then the stairs. Don\'t tell the management. The view of Nathan Road at night is something.', [['Thanks, Uncle Keung!', () => { takeItem('tarts'); ST.roofKey = true; setStage('tarts', 'done'); }]]);
      return say(rpick2(['Roof key working all right? Mind the edge.', 'Typhoon season\'s nearly over. Good.', 'Lift\'s slow today. It\'s always slow.']));
    case 'tailor':
      if (!s('curry')) return say('Suit, sir? Madam? Tailor-made in twenty-four hours! I\'m Mr Ali: I find the customers, my cousin does the cutting upstairs. But I haven\'t eaten since breakfast and I can\'t leave my spot. Raj sells mutton curry just along here. Here\'s fifty dollars.', [['I\'ll get it.', () => { setStage('curry', 1); earn(50); }], ['Not now.', null]]);
      if (s('curry') === 1 && !hasItem('curry')) return say('Raj, right outside Chungking Mansions. Ask for mutton, extra rice.');
      if (s('curry') === 1 && hasItem('curry')) return say('Wonderful, wonderful. While you\'re being so kind: Mr Fenwick\'s suit is finished and he is staying at The Peninsula. Would you leave it with the doorman? Mind the creases.', [['Of course.', () => { takeItem('curry'); giveItem('suit'); setStage('curry', 2); }]]);
      if (s('curry') === 2) return say('The Peninsula is at the bottom of Nathan Road, facing the harbour. Look for the Rolls-Royces.');
      return say(rpick2(['Mr Fenwick sent a thank-you note. Very proper.', 'Suit, sir? Ah, it\'s you. Thanks again.', 'Shirts too! Any design!']));
    case 'raj':
      if (s('curry') === 1 && !hasItem('curry')) return say('Mutton curry for Mr Ali? He always forgets to eat. Forty-eight dollars, extra rice free.', [['Pay HK$48', () => { if (pay(48)) { giveItem('curry'); toast('Got: ' + ITEM_NAMES.curry); } }], ['Not yet.', null]]);
      return say(rpick2(['Curry, my friend? Best on Nathan Road!', 'You need a room? Cheap room, very clean!', 'Change money? SIM card? No? OK, OK.']));
    case 'doorman':
      if (s('curry') === 2 && hasItem('suit')) return say('For Mr Fenwick? Very good. He did say someone might call. He left this for whoever brought it.', [['Thank you.', () => { takeItem('suit'); setStage('curry', 'done'); earn(200); }]]);
      return say(rpick2(['Good afternoon. Welcome to The Peninsula.', 'Afternoon tea is served in the lobby. There may be a queue.', 'The cars? Rolls-Royces, in Peninsula green.']));
    case 'granny':
      if (!s('paper')) return say('Aiya, young one, my knees. Would you buy me today\'s paper from the stand by the park gate on Nathan Road? The racing pages are on Wednesday. Here, ten dollars.', [['Of course, Granny.', () => { setStage('paper', 1); earn(10); }], ['Sorry, I\'m busy.', null]]);
      if (s('paper') === 1 && !hasItem('paper')) return say('The news stand, by the gate on Nathan Road, next to the mosque.');
      if (s('paper') === 1 && hasItem('paper')) return say('Good child! Now, have you been to see the flamingos? Mr Leung, the warden, keeps saying one has gone missing. Go and count them for him, he can never keep track.', [['I\'ll go and count them.', () => { takeItem('paper'); setStage('paper', 'done'); setStage('flamingo', 1); }]]);
      return say(rpick2(['Number seven in the third race. You\'ll see.', 'In my day this was all army barracks, you know.', 'Eat something! You\'re too thin.']));
    case 'warden': {
      if (s('flamingo') === 'done') return say('All present and correct, thanks to you.');
      const n = W.flamingoCount;
      const opts = [n - 2, n - 1, n, n + 1].sort(() => Math.random() - 0.5).map((k) => [String(k), () => {
        if (k === n) { say(`${n}. Then nobody\'s missing: I keep counting the one behind the rock twice. Thank you!`, [['Glad to help.', () => { setStage('flamingo', 'done'); earn(30); }]]); }
        else say('Hmm. That\'s not what I get. Count again, slowly.');
      }]);
      if (!s('flamingo')) setStage('flamingo', 1);
      return say('Granny Chan sent you? Then help me count. How many flamingos are in the lake right now?', opts.concat([['I\'ll count again.', null]]));
    }
    case 'ingrid':
      if (!s('ingrid')) return say('Hej! Could you take my picture with the Clock Tower behind me? My grandmother left Hong Kong from this spot in 1962, on the train to Canton. She asked me to stand here.', [['Sure (press C for the camera).', () => setStage('ingrid', 1)], ['Not right now.', null]]);
      if (s('ingrid') === 1) return say('Get the whole tower in, and me too. Press C for your camera.');
      if (s('ingrid') === 2) return say('Oh, that\'s perfect. Mormor will cry. Here, a postcard from home, for you. Tack!', [['You\'re welcome.', () => { giveItem('postcard'); setStage('ingrid', 'done'); }]]);
      return say('I\'m going to ride the Star Ferry next. Everyone says to sit on the upper deck.');
    case 'fai':
      if (!s('milktea')) return say('Yo! You look like you have legs. Uncle Sam at the Star Ferry pier takes two milk teas every afternoon and my nephew who runs them over is off sick. Take them over? Quick, before they go cold!', [['On my way.', () => { giveItem('milktea'); setStage('milktea', 1); }], ['Can\'t now.', null]]);
      if (s('milktea') === 1) return say('Star Ferry pier, down by the Clock Tower! Go, go!');
      return say(rpick2(['Milk tea, hot or iced?', 'Hot lemon tea, less sugar, coming up!', 'Milk tea: silk-stocking strained, like it should be.']));
    case 'sam':
      if (s('milktea') === 1 && hasItem('milktea')) return say('Ha! Fai sent you? Still hot, too. 唔該. Here, your next crossing is on me.', [['Thanks, Uncle Sam!', () => { takeItem('milktea'); ST.freeRide = true; setStage('milktea', 'done'); earn(20); }]]);
      return say(rpick2(['Forty years on these boats. Never once turned one round: no need, they go both ways.', 'Upper deck has the view. Flip the seat back so you face where you\'re going.', 'Typhoon signal 8 and we stop. Otherwise, every few minutes, all day.']));
    case 'kit':
      if (!s('show')) return say('My camera died, and tonight\'s the night I promised the magazine a shot of A Symphony of Lights. It starts at eight, every night. Get it for me from the waterfront and I\'ll lend you my zoom lens.', [['Deal.', () => setStage('show', 1)], ['Not tonight.', null]]);
      if (s('show') === 1) return say(`It starts at 8 pm${CLOCK.t > 19 && CLOCK.t < 20 ? ', any minute now' : ''}. Face the Island, frame the towers, and shoot when the beams are up.`);
      if (s('show') === 2) return say('Look at those beams! That\'s the cover. Here, the zoom lens is yours for as long as you\'re in town: in camera mode, use the mouse wheel, or Q and E.', [['Thanks, Kit!', () => { ST.zoom = true; setStage('show', 'done'); }]]);
      return say(rpick2(['The haze makes the skyline look like a painting, some days.', 'Bruce Lee is further along. Everyone does the pose.', 'Golden hour here is magic. Then the neon comes on.']));
    case 'news':
      if (s('paper') === 1 && !hasItem('paper')) return say('Paper? Ten dollars.', [['Pay HK$10', () => { if (pay(10)) { giveItem('paper'); toast('Got: ' + ITEM_NAMES.paper); } }], ['No thanks.', null]]);
      return say('Papers, magazines, racing guide. Octopus or cash.', [['Buy a paper (HK$10)', () => { if (pay(10)) { giveItem('paper'); toast('Got: ' + ITEM_NAMES.paper); } }], ['Just looking.', null]]);
    case 'baker':
      if (s('tarts') === 1 && !hasItem('tarts')) return say('Egg tarts, fresh this minute. Box of four, thirty-six dollars.', [['Pay HK$36', () => { if (pay(36)) { giveItem('tarts'); toast('Got: ' + ITEM_NAMES.tarts); } }], ['No thanks.', null]]);
      return say('Egg tarts, pineapple buns, cocktail buns, wife cakes! Everything fresh.', [['Buy an egg tart (HK$10)', () => { if (pay(10)) toast('You eat the egg tart. The pastry shatters. Still warm.'); }], ['Just looking.', null]]);
  }
}
const MILTON_NAMES = { guard: ['Uncle Keung', '強叔'] };
function rpick2(a) { return a[Math.floor(Math.random() * a.length)]; }
function skipTo(h) {
  fadeOut(() => { let d = h - CLOCK.t; if (d <= 0) d += 24; CLOCK.t = h; if (CLOCK.t < h) CLOCK.day++; ST.t = CLOCK.t; toast(`You wake at ${clockStr()}.`); fadeIn(); });
}

// ---------------------------------------------------------------- interactions
function buildInteractions() {
  // street characters
  for (const id in NPC) addInteract({ id: 'npc_' + id, x: NPC[id].x, z: NPC[id].z, r: 2.6, label: () => 'Talk to ' + NPC[id].name, use: () => talk(id), npc: id });
  // Milton Mansion's door
  const d = W.LP.miltonDoor;
  addInteract({ id: 'milton', x: d[0], z: d[1], r: 3.2, label: () => 'Enter Milton Mansion', use: () => fadeOut(() => { enterMilton('G'); fadeIn(); }) });
  // inside
  addInteract({ id: 'mexit', space: 'milton', x: 0.6, z: 0, r: 1.8, cond: () => MILTON.floor === 'G', label: () => 'Out to Nathan Road', use: () => fadeOut(() => { exitMilton(); fadeIn(); }) });
  addInteract({ id: 'lift', space: 'milton', x: MILTON.liftPos[0], z: MILTON.liftPos[1], r: 2.2, label: () => 'Call the lift', use: () => openLift() });
  addInteract({ id: 'liftUp', space: 'milton', x: 30.2, z: 0, r: 2.2, cond: () => MILTON.floor !== 'G', label: () => 'Call the lift', use: () => openLift() });
  addInteract({ id: 'm_guard', space: 'milton', x: MILTON.guardPos[0], z: MILTON.guardPos[1], r: 2.4, cond: () => MILTON.floor === 'G', label: () => 'Talk to Uncle Keung', use: () => talk('guard') });
  addInteract({ id: 'm_dir', space: 'milton', x: MILTON.dirPos[0], z: MILTON.dirPos[1], r: 2.2, cond: () => MILTON.floor === 'G', label: () => 'Read the directory', use: () => {
    const list = miltonTenants().map((t) => `${t.floor ? t.floor + '/F ' + t.unit : '(floor not listed)'}: ${[t.zh, t.en].filter(Boolean).join(' ')}`);
    openDialog('Directory', '住戶名錄', 'Milton Mansion, 96 Nathan Road. ' + (list.length ? list.join(' · ') : 'The board is empty.'));
  } });
  for (const D of UNITS) addInteract({ id: 'm_door' + D.u, space: 'milton', x: D.cx, z: D.cz, r: 1.6, cond: () => MILTON.floor !== 'G', label: () => { const t = tenantAt(MILTON.floor, D.u); return t ? 'Knock: ' + [t.zh, t.en].filter(Boolean).join(' ') : `Knock at ${MILTON.floor}${D.u}`; }, use: () => {
    const t = tenantAt(MILTON.floor, D.u), open = CLOCK.t > 9.5 && CLOCK.t < 19;
    toast(t ? (open ? 'You hear voices behind the door. You don\'t have an appointment.' : 'No answer. They must be closed for the day.') : 'No answer.');
  } });
  addInteract({ id: 'm_stairs', space: 'milton', x: MILTON.stairsPos[0], z: MILTON.stairsPos[1], r: 1.8, cond: () => MILTON.floor !== 'G', label: () => MILTON.floor === '16' ? 'Stairs to the roof' : 'Stairs (locked)', use: () => {
    if (MILTON.floor !== '16') return toast('The stair door only opens onto the roof from the top floor.');
    if (!ST.roofKey) return toast('Locked. "ROOF: NO ADMITTANCE". The guard downstairs might have a key.');
    fadeOut(() => { enterRoof(); fadeIn(); });
  } });
  addInteract({ id: 'roofdoor', space: 'roof', x: 0, z: 0, r: 2.2, label: () => 'Back down the stairs', use: () => fadeOut(() => { enterMilton('16'); PL.x = 3.6; PL.z = 0; PL.yaw = -Math.PI / 2; fadeIn(); }) });
  // the Star Ferry
  const fd = W.LP.ferryDoor || [-400, 615];
  addInteract({ id: 'ferry', x: fd[0], z: fd[1], r: 4, label: () => {
    const [t] = nextFerryAtTST();
    return t === 0 ? `Board the Star Ferry to Central (${ST.freeRide ? 'free ride' : 'HK$5'})` : `Star Ferry to Central: next boat in ${Math.ceil(t / 60)} min`;
  }, use: () => {
    const [t, b] = nextFerryAtTST();
    if (t > 0) { toast(`The next ferry docks in about ${Math.ceil(t / 60)} minute${t > 60 ? 's' : ''}. The board shows ${b.name[0]}.`); return; }
    if (!ST.freeRide && !pay(5, 'Star Ferry')) return;
    if (ST.freeRide) { ST.freeRide = false; toast('Uncle Sam waves you through.'); }
    bus.emit('sfx', 'turnstile');
    fadeOut(() => { boardFerry(b); fadeIn(); banner('THE STAR FERRY', b.name[0], b.name[1]); });
  } });
  addInteract({ id: 'ferryOff', space: 'ferry', x: 0, z: 0, r: 99, cond: () => FERRY_SPACE.boat && FERRY_SPACE.boat.state === 'tst', label: () => 'Get off at Tsim Sha Tsui', use: () => fadeOut(() => { leaveFerry(); fadeIn(); }) });
}
let IFOCUS = null;
function findInteract() {
  const sp = PL.space && PL.space.name;
  const f = lookDir();
  let best = null, bs = 0;
  for (const it of INTERACT) {
    if (it.space !== sp) continue;
    if (it.cond && !it.cond()) continue;
    let x = it.x, z = it.z;
    if (it.id === 'roofdoor') { x = MILTON.roofDoor[0]; z = MILTON.roofDoor[1]; }
    if (it.id === 'ferryOff') return it;
    if (it.near) { if (it.near()) return it; continue; }
    const dx = x - PL.x, dz = z - PL.z, d = Math.hypot(dx, dz);
    if (d > it.r) continue;
    const dot = d < 0.8 ? 1 : (dx * f.x + dz * f.z) / (d * Math.hypot(f.x, f.z) || 1);
    if (dot < 0.55) continue;
    const s = dot - d * 0.05;
    if (s > bs) { bs = s; best = it; }
  }
  return best;
}

// ---------------------------------------------------------------- lift
function openLift() {
  const el = $('#liftBtns'); el.innerHTML = '';
  for (const f of FLOORS) {
    const b = document.createElement('button'); b.textContent = f; if (f === MILTON.floor) b.className = 'cur';
    b.onclick = () => { closePanel('lift'); rideLift(f); };
    el.appendChild(b);
  }
  bus.emit('sfx', 'ding');
  openPanel('lift');
}
function rideLift(f) {
  if (f === MILTON.floor) return;
  if (f === 'R') { if (!ST.roofKey) { toast('The R button won\'t light up. The roof needs a key.'); return; } }
  bus.emit('sfx', 'liftHum');
  fadeOut(() => {
    if (f === 'R') { enterRoof(); }
    else { enterMilton(f); }
    bus.emit('sfx', 'ding');
    toast(f === 'R' ? 'Roof' : f === 'G' ? 'Ground floor' : `Floor ${f}${['5', '6', '7', '8'].includes(f) ? ': Harbour Guest House' : ''}`);
    fadeIn();
  }, 900);
}

// ---------------------------------------------------------------- landmarks
function checkLandmarks() {
  if (PL.space !== STREET && PL.space !== ROOF && PL.space !== FERRY_SPACE) return;
  for (const L of LANDMARKS) {
    if (ST.found[L.id]) continue;
    if (L.id === 'nathan' && ST.walked < 25) continue;
    if (dist2(PL.x, PL.z, L.x, L.z) < L.r * L.r) {
      ST.found[L.id] = true; save();
      banner('DISCOVERED', L.en, L.zh);
      bus.emit('sfx', 'discover');
      const n = Object.keys(ST.found).length;
      toast(`${n} of ${LANDMARKS.length} places found. The note is in your notebook (J).`);
    }
  }
}

// ---------------------------------------------------------------- photos and viewpoints
const _pv = new V3();
function inFrame(x, y, z, margin = 0.8) { _pv.set(x, y, z).project(camera); return _pv.z < 1 && Math.abs(_pv.x) < margin && Math.abs(_pv.y) < margin; }
const camDist = (x, z) => Math.hypot(x - camera.position.x, z - camera.position.z);
function onWaterfront() { return PL.space === STREET && gclass(PL.x, PL.z + 25) === G.SEA || gclass(PL.x, PL.z + 15) === G.SEA; }
function lookingSouth() { const f = lookDir(); return f.z > 0.6; }
const VIEWPOINTS = [
  { id: 'clock', label: 'The Clock Tower against the sky', test: () => { const L = LM_BY.clocktower, d = camDist(L.x, L.z); return d > 20 && d < 180 && inFrame(L.x, 40, L.z, 0.7) && inFrame(L.x, 3, L.z, 0.95); } },
  { id: 'skyline', label: 'Hong Kong Island across the harbour', test: () => onWaterfront() && lookingSouth() && SKY.show < 0.01 },
  { id: 'show', label: 'A Symphony of Lights (8 pm)', test: () => SKY.show > 0.2 && lookingSouth() && (onWaterfront() || PL.space === FERRY_SPACE || PL.space === ROOF) },
  { id: 'nathan', label: 'Nathan Road after dark', test: () => { if (SKY.night < 0.6 || PL.space !== STREET) return false; const [E, d] = nearestEdge(PL.x, PL.z, 25); if (!E || !/Nathan/.test(E.name)) return false; const p = E.pts, dx = p[p.length - 2] - p[0], dz = p[p.length - 1] - p[1], L = Math.hypot(dx, dz), f = lookDir(); return Math.abs((dx * f.x + dz * f.z) / L) > 0.85; } },
  { id: 'ferry', label: 'A Star Ferry at the pier', test: () => FERRY.boats.some((b) => (b.state === 'tst') && inFrame(b.x, 2, b.z, 0.75) && camDist(b.x, b.z) < 160) },
  { id: 'onferry', label: 'The skyline from the Star Ferry', test: () => PL.space === FERRY_SPACE && FERRY_SPACE.boat.state !== 'tst' && FERRY_SPACE.boat.state !== 'central' },
  { id: 'chungking', label: 'The Chungking Mansions sign', test: () => { const p = LM_BY.chungking, d = camDist(p.x, p.z); return d > 8 && d < 70 && inFrame(p.x + 4, 6.5, p.z, 0.6); } },
  { id: 'brucelee', label: 'Bruce Lee on the Avenue of Stars', test: () => { const p = LM_BY.brucelee, d = camDist(p.x, p.z); return d > 2.5 && d < 16 && inFrame(p.x, 2, p.z, 0.6); } },
  { id: 'peninsula', label: 'The Peninsula from Salisbury Road', test: () => { const p = LM_BY.peninsula, d = camDist(p.x, p.z); return d > 30 && d < 170 && inFrame(p.x, 20, p.z, 0.6); } },
  { id: 'flamingos', label: 'Flamingos in Kowloon Park', test: () => { const p = W.LP.birdlake, d = camDist(p[0], p[1]); return d < 30 && inFrame(p[0], 1, p[1], 0.75); } },
  { id: 'roof', label: 'Nathan Road from the roof of Milton Mansion', test: () => { if (PL.space !== ROOF) return false; const f = lookDir(); return Math.abs(f.z) > 0.8 && f.y < 0.1; } },
  { id: 'mosque', label: 'The Kowloon Mosque', test: () => { const p = LM_BY.mosque, d = camDist(p.x, p.z); return d > 20 && d < 120 && inFrame(p.x, 15, p.z, 0.6); } },
];
function togglePhoto(on = !PHOTO.on) {
  if (DLG) return;
  PHOTO.on = on;
  $('#vf').hidden = !on;
  document.body.classList.toggle('photo', on);
  if (!on) OPT.fov = PHOTO.fov0 || OPT.fov;
  else { PHOTO.fov0 = OPT.fov; updateVfInfo(); }
}
function updateVfInfo() {
  const hits = VIEWPOINTS.filter((v) => !ST.vps[v.id] && v.test()).map((v) => v.label);
  $('#vfInfo').textContent = (hits.length ? '★ ' + hits[0] : 'Click or Space to take a photo · C to put the camera away') + (ST.zoom ? ' · zoom: wheel / Q E' : '');
}
function takePhoto() {
  renderNow();
  const img = grabFrame(192);
  const flash = $('#flash'); flash.style.transition = 'none'; flash.style.opacity = 0.9; requestAnimationFrame(() => { flash.style.transition = 'opacity .35s'; flash.style.opacity = 0; });
  bus.emit('sfx', 'shutter');
  const got = VIEWPOINTS.filter((v) => v.test());
  let label = got.length ? got[0].label : (nearestPlaceName() || 'Tsim Sha Tsui');
  for (const v of got) if (!ST.vps[v.id]) { ST.vps[v.id] = true; toast('★ Famous view: ' + v.label); }
  // errand photos
  if (erStage('ingrid') === 1 && NPC.ingrid) {
    const L = LM_BY.clocktower, n = NPC.ingrid;
    if (inFrame(n.x, 1, n.z, 0.85) && inFrame(L.x, 40, L.z, 0.9) && camDist(n.x, n.z) < 25) { setStage('ingrid', 2); toast('That\'s the one. Show Ingrid.'); label = 'Ingrid at the Clock Tower'; }
    else if (camDist(n.x, n.z) < 40) toast('Ingrid: "Can you get all of me and the whole tower?"');
  }
  if (erStage('show') === 1 && got.some((v) => v.id === 'show')) { setStage('show', 2); toast('Got it! Take it to Kit on the Avenue of Stars.'); }
  ST.photos.push({ img, label, t: clockStr() });
  while (ST.photos.length > 24) ST.photos.shift();
  save();
}
function nearestPlaceName() {
  let best = null, bd = 1e9;
  for (const L of LANDMARKS) { const d = dist2(L.x, L.z, PL.x, PL.z); if (d < bd) { bd = d; best = L; } }
  return best && bd < 150 * 150 ? best.en : null;
}

// ---------------------------------------------------------------- save
function save() {
  ST.t = CLOCK.t; ST.day = CLOCK.day;
  ST.pos = { space: PL.space ? PL.space.name : 'street', x: PL.x, z: PL.z, yaw: PL.yaw, floor: MILTON.floor, level: MET.level };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(ST)); } catch (e) { /* storage full or blocked */ }
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && typeof s === 'object') return s; } catch (e) { /* ignore */ }
  return null;
}
function hasSave() { return !!load(); }

// ---------------------------------------------------------------- per frame
let vfT = 0, saveT = 0;
function updateGame(dt) {
  if (GAME.state !== 'play') return;
  for (const id in NPC) {      // characters turn to face you when you're close
    const n = NPC[id], d2 = dist2(n.x, n.z, PL.x, PL.z);
    const want = d2 < 36 && PL.space === STREET ? Math.atan2(-(PL.x - n.x), -(PL.z - n.z)) : n.base;
    n.yaw += angWrap(want - n.yaw) * clamp(dt * 3, 0, 1);
    posePerson(n.mesh, n.x, groundAt(n.x, n.z), n.z, n.yaw, 0, 0);
  }
  if (PL.space === MILTON_SPACE) for (const k in MILTON.npcs) { const m = MILTON.npcs[k]; }
  if (PL.speed > 0.1) ST.walked += PL.speed * dt;
  checkLandmarks();
  IFOCUS = DLG ? null : findInteract();
  if (PHOTO.on && (vfT -= dt) < 0) { vfT = 0.4; updateVfInfo(); }
  if ((saveT += dt) > 20) { saveT = 0; save(); }
}
// keys handled in play
function updateGameInput(dt) {
  if (DLG) {
    for (let i = 0; i < DLG.opts.length; i++) if (Input.hit('Digit' + (i + 1))) { chooseOpt(i); return; }
    if (Input.any('KeyE', 'Enter', 'Space', 'PadA', 'Mouse0') && !DLG.opts.length) closeDialog();
    if (Input.any('Escape', 'PadB')) closeDialog();
    return;
  }
  if (Input.any('KeyC', 'PadX')) togglePhoto();
  if (PHOTO.on) {
    if (Input.any('Space', 'Mouse0', 'PadA', 'PadRT')) takePhoto();
    if (ST.zoom) {
      const w = Input.wheel();
      if (Input.key('KeyE') || w < 0 || Input.key('PadRB')) OPT.fov = Math.max(14, OPT.fov - dt * 40 - (w < 0 ? 6 : 0));
      if (Input.key('KeyQ') || w > 0 || Input.key('PadLB')) OPT.fov = Math.min(PHOTO.fov0 || 62, OPT.fov + dt * 40 + (w > 0 ? 6 : 0));
    }
    if (Input.any('Escape', 'PadB')) togglePhoto(false);
    return;
  }
  if (IFOCUS && Input.any('KeyE', 'Enter', 'PadA', 'Mouse0')) { IFOCUS.use(); return; }
  if (Input.any('KeyM', 'PadY')) openMap();
  if (Input.any('KeyJ', 'PadBack')) openJournal();
  if (Input.any('KeyT')) { CLOCK.t += 1; if (CLOCK.t >= 24) { CLOCK.t -= 24; CLOCK.day++; } toast(`You wait an hour. It is ${clockStr()}.`); }
  if (Input.any('PadStart')) openPause();
  crowdPush(); trafficPush();
}
function startGame(o = {}) {
  const s = o.fresh ? null : load();
  if (s) {
    Object.assign(ST, s);
    CLOCK.t = s.t !== undefined ? s.t : 16.5; CLOCK.day = s.day || 0;
    const p = s.pos;
    if (p && p.space === 'milton') enterMilton(p.floor || 'G');
    else if (p && (p.space === 'metro' || p.space === 'ride')) resumeMetro(p);
    else if (p && p.space === 'street' && STREET.allowed(p.x, p.z)) placePlayer(p.x, p.z, p.yaw, STREET);
    else setStartPos();
  } else {
    Object.assign(ST, { money: 300, items: {}, found: {}, er: {}, photos: [], vps: {}, roofKey: false, zoom: false, freeRide: false, walked: 0, octopus: null, metroIn: null });
    if (o.hour === undefined) CLOCK.t = 16.5;
    setStartPos();
  }
  if (o.hour !== undefined) CLOCK.t = o.hour;
  GAME.state = 'play'; GAME.started = true;
  document.body.dataset.state = 'play';
  $('#title').hidden = true;
  if (!s) {
    setTimeout(() => banner('TSIM SHA TSUI', 'Nathan Road', '彌敦道'), 600);
    const touch = document.body.classList.contains('touch');
    setTimeout(() => { if (PL.space === STREET && dist2(PL.x, PL.z, W.LP.miltonDoor[0], W.LP.miltonDoor[1]) < 30 * 30) toast(`Milton Mansion's door is just behind you. ${touch ? 'Tap USE' : 'Press E'} there to go in.`); }, 5000);
    setTimeout(() => toast(touch ? 'MAP for the map, BOOK for your notebook, CAM for the camera.' : 'M for the map, J for your notebook, C for the camera, T to wait an hour.'), 12000);
  }
  bus.emit('start');
  return NR_state();
}
const NR_state = () => ({ x: +PL.x.toFixed(2), z: +PL.z.toFixed(2), space: PL.space && PL.space.name, time: clockStr() });

function initGame() {
  buildMilton();
  buildMiltonRoof();
  initCrowd();
  initTraffic();
  initFerry();
  buildMetroExits();
  buildMetro();
  placeStreetNPCs();
  buildInteractions();
  metroInteractions();
}
function initWorldLife() { }
function updateWorldLife(dt) {
  if (!GAME.ready) return;
  updateFerry(dt);
  updateMetro(dt);
  if (GAME.state === 'play' || GAME.state === 'title') { updateCrowd(dt); updateTraffic(dt); }
}
