// Roma Aeterna — the people of Rome: who they are (roles), where they walk (the navigation graph), what they do at
// their posts (spots), the carts, litters, riders and processions, the races in the Circus, and drawing them all.

// ---------- roles: appearance, title, what they say ----------
const P_ = (a, rng) => a[Math.floor(rng() * a.length)];
const ROLES = {
  citizen: { dress: (L, r, p) => (r() < 0.07 ? { over: 'toga', overCol: p(CLOTH.white) } : r() < 0.15 ? { over: 'paenula', overCol: p(CLOTH.plain) } : r() < 0.15 ? { hat: 'pileus', hatCol: p(CLOTH.plain) } : {}), g: 'm' },
  woman: { g: 'f', dress: (L, r, p) => (r() < 0.55 ? { hat: 'palla', hatCol: p(CLOTH.bright.concat(CLOTH.white)) } : {}) },
  matron: { g: 'f', cloth: 'white', dress: (L, r, p) => ({ hat: 'palla', hatCol: p(CLOTH.bright) }) },
  freedman: { g: 'm', dress: (L, r, p) => (r() < 0.5 ? { hat: 'pileus', hatCol: p(CLOTH.plain) } : {}) },
  slave: { g: 'm', cloth: 'dark', beard: 0.2, dress: (L, r, p) => ({ item: p(['amphora', 'sack', 'basket', null, 'amphora']) }) },
  slavegirl: { g: 'f', cloth: 'plain', dress: (L, r, p) => ({ item: p(['jar', 'basket', null]) }) },
  child: { child: true, dress: (L, r, p) => ({ cloth: p(CLOTH.plain.concat(CLOTH.white)), body: 'tunic', beard: false }) },
  senator: { g: 'm', cloth: 'white', beard: 0.6, dress: (L, r, p) => ({ body: 'tunicClavus', cloth: 0xeee8dc, over: 'toga', overCol: p(CLOTH.white), boots: true }) },
  equestrian: { g: 'm', cloth: 'white', dress: (L, r, p) => (r() < 0.6 ? { over: 'toga', overCol: p(CLOTH.white) } : {}) },
  magistrate: { g: 'm', cloth: 'white', beard: 0.5, dress: () => ({ body: 'tunicClavus', cloth: 0xeee8dc, over: 'togaP', overCol: 0xf0ece0, boots: true }) },
  lictor: { g: 'm', cloth: 'white', dress: (L, r, p) => ({ over: 'toga', overCol: 0xe8e2d4, item: 'fasces' }) },
  priest: { g: 'm', cloth: 'white', dress: () => ({ over: 'toga', overCol: 0xf0ece0, hat: 'palla', hatCol: 0xf0ece0 }) },
  vestal: { g: 'f', cloth: 'white', dress: () => ({ cloth: 0xf4f0e8, hat: 'palla', hatCol: 0xf4f0e8 }) },
  soldier: { g: 'm', beard: 0.3, dress: (L, r, p) => ({ cloth: p([0xa83a2a, 0x9a3428, 0xb8402e]), over: 'lorica', overCol: 0xc8c8c8, hat: 'helmet', hatCol: 0xc8b070, item: 'spear', item2: 'shield', boots: true }) },
  praetorian: { g: 'm', dress: () => ({ cloth: 0xe8e0d0, over: 'lorica', overCol: 0xd8c890, hat: 'helmet', hatCol: 0xd8c070, item: 'spear', item2: 'shield', boots: true }) },
  vigil: { g: 'm', dress: (L, r, p) => ({ cloth: p(CLOTH.dark), hat: 'pileus', hatCol: 0x5a4a3a, item: 'bucket', item2: 'torch' }) },
  merchant: { g: 'm', beard: 0.6, dress: (L, r, p) => ({ over: 'paenula', overCol: p(CLOTH.bright), item: r() < 0.3 ? 'scroll' : null }) },
  porter: { g: 'm', cloth: 'dark', dress: (L, r, p) => ({ item: p(['sack', 'amphora']) }) },
  philosopher: { g: 'm', beard: 1, dress: (L, r, p) => ({ age: 'old', over: 'cloak', overCol: p(CLOTH.dark), item: 'staff' }) },
  traveller: { g: 'm', dress: (L, r, p) => ({ over: 'paenula', overCol: p(CLOTH.plain), hat: 'petasus', hatCol: p(CLOTH.plain), item: 'staff', boots: true }) },
  farmer: { g: 'm', beard: 0.5, cloth: 'plain', dress: (L, r, p) => ({ hat: r() < 0.6 ? 'petasus' : 'pileus', hatCol: p(CLOTH.plain), item: p(['staff', 'basket', null]) }) },
  farmwife: { g: 'f', cloth: 'plain', dress: (L, r, p) => ({ hat: 'palla', hatCol: p(CLOTH.plain) }) },
  shepherd: { g: 'm', beard: 0.8, cloth: 'dark', dress: (L, r, p) => ({ over: 'paenula', overCol: 0x6a5a48, hat: 'petasus', hatCol: 0x6a5a48, item: 'staff' }) },
  courier: { g: 'm', dress: (L, r, p) => ({ over: 'cloak', overCol: 0xa83a2a, hat: 'petasus', hatCol: 0x8a7a5a, boots: true }) },
  carter: { g: 'm', cloth: 'plain', beard: 0.6, dress: (L, r, p) => ({ hat: r() < 0.5 ? 'pileus' : null, hatCol: p(CLOTH.plain), item: 'staff' }) },
  bearer: { g: 'm', cloth: 'dark', scale: 1.06, dress: (L, r, p) => ({ cloth: p([0x7a2a2a, 0x2a4a6a, 0x5a4a3a]) }) },
  gladiator: { g: 'm', beard: 0.5, scale: 1.05, dress: (L, r, p) => ({ cloth: 0xd0b890, hat: 'helmet', hatCol: 0xb89a50, item: 'sword', item2: r() < 0.5 ? 'shield' : 'parma' }) },
  athlete: { g: 'm', dress: (L) => ({ cloth: L.skin }) },
  charioteer: { g: 'm', dress: () => ({ hat: 'helmet', hatCol: 0x8a8a8a }) },
  shopkeeper: { dress: (L, r, p) => ({ cloth: p(CLOTH.plain.concat(CLOTH.bright)) }) },
  worker: { g: 'm', cloth: 'dark', beard: 0.4, dress: (L, r, p) => (r() < 0.4 ? { hat: 'pileus', hatCol: p(CLOTH.plain) } : {}) },
  housemaid: { g: 'f', cloth: 'plain' },
  orator: { g: 'm', beard: 0.6, dress: () => ({ body: 'tunicClavus', cloth: 0xeee8dc, over: 'toga', overCol: 0xf2eee4, boots: true }) },
};
// spot roles → [base role for looks, title noun, dialogue key]
const JOBS = {
  baker: ['shopkeeper', 'a baker', 'baker'], cook: ['shopkeeper', 'who keeps a hot-food bar', 'cook'], wineseller: ['shopkeeper', 'a wine seller', 'wine'],
  butcher: ['shopkeeper', 'a butcher', 'butcher'], cobbler: ['shopkeeper', 'a cobbler', 'cobbler'], grocer: ['shopkeeper', 'a greengrocer', 'grocer'],
  greengrocer: ['shopkeeper', 'a greengrocer', 'grocer'], potter: ['shopkeeper', 'a potter', 'potter'], smith: ['worker', 'a smith', 'smith'],
  weaver: ['shopkeeper', 'a cloth seller', 'weaver'], vendor: ['shopkeeper', 'a stallholder', 'vendor'], barber: ['shopkeeper', 'a barber', 'barber'],
  lampmaker: ['shopkeeper', 'a lamp seller', 'lamps'], fishmonger: ['shopkeeper', 'a fishmonger', 'fish'], bookseller: ['freedman', 'a bookseller', 'books'],
  perfumer: ['shopkeeper', 'a perfume seller', 'vendor'], jeweller: ['freedman', 'a jeweller', 'vendor'], slavetrader: ['merchant', 'a slave dealer', 'slavetrader'],
  oilseller: ['shopkeeper', 'an oil seller', 'vendor'], banker: ['freedman', 'a money-changer', 'banker'], fuller: ['worker', 'a fuller', 'fuller'],
  spicer: ['shopkeeper', 'a spice seller', 'vendor'], patron: ['senator', 'master of the house', 'patron'], client: ['citizen', 'waiting on his patron', 'client'],
  doorkeeper: ['slave', 'the doorkeeper', 'doorkeeper'], housemaid: ['housemaid', 'a household slave', 'housemaid'], teacher: ['philosopher', 'a schoolmaster', 'teacher'],
  pupil: ['child', 'a schoolboy', 'pupil'], mason: ['worker', 'a stonemason', 'mason'], architect: ['equestrian', 'an architect', 'architect'],
  arenaslave: ['slave', 'an arena slave', 'arenaslave'], arenaguard: ['soldier', 'on guard', 'arenaguard'], docker: ['porter', 'a docker', 'docker'],
  drover: ['farmer', 'a cattle drover', 'drover'], gamer: ['citizen', 'playing at dice', 'gamer'], advocate: ['equestrian', 'an advocate', 'advocate'],
  sick: ['citizen', 'hoping for a cure', 'sick'], gossip: ['woman', 'catching up on news', 'gossip'], poet: ['citizen', 'a poet', 'poet'],
  beggar: ['slave', 'a beggar', 'beggar'], customer: ['citizen', 'eating at the counter', 'customer'], drinker: ['freedman', 'drinking', 'drinker'],
  latrine: ['citizen', 'at the latrine', 'latrine'], shaved: ['citizen', 'getting a shave', 'shaved'], innkeeper: ['shopkeeper', 'the innkeeper', 'innkeeper'],
  groom: ['slave', 'a groom', 'groom'], gardener: ['slave', 'a gardener', 'gardener'], vilicus: ['freedman', 'the steward of the villa', 'vilicus'],
  farmwife: ['farmwife', 'a farmer\'s wife', 'farmwife'], farmer: ['farmer', 'a farmer', 'farmer'], shepherd: ['shepherd', 'a shepherd', 'shepherd'],
  bathattendant: ['slave', 'a bath attendant', 'bath'], waterbearer: ['slavegirl', 'fetching water', 'water'], orator: ['orator', 'speaking from the Rostra', 'orator'],
  listener: ['citizen', 'listening to the speech', 'listener'], gladiator: ['gladiator', 'a gladiator', 'gladiator'], lanista: ['freedman', 'the trainer', 'lanista'],
  athlete: ['athlete', 'an athlete', 'athlete'], praetorian: ['praetorian', 'a Praetorian guardsman', 'praetorian'], vigil: ['vigil', 'of the night watch', 'vigil'],
  child: ['child', 'playing', 'child'], traveller: ['traveller', 'a traveller', 'traveller'], fuller2: ['worker', 'a fuller', 'fuller'],
  // walkers
  citizen: ['citizen', 'a citizen', 'citizen'], woman: ['woman', '', 'woman'], matron: ['matron', 'a Roman matron', 'woman'], freedman: ['freedman', 'a freedman', 'freedman'],
  slave: ['slave', 'a slave', 'slave'], slavegirl: ['slavegirl', 'a slave', 'slavegirl'], senator: ['senator', 'senator', 'senator'], equestrian: ['equestrian', 'a knight', 'equestrian'],
  magistrate: ['magistrate', 'consul', 'magistrate'], lictor: ['lictor', 'a lictor', 'lictor'], priest: ['priest', 'a priest', 'priest'], vestal: ['vestal', 'a Vestal Virgin', 'vestal'],
  soldier: ['soldier', 'a legionary', 'soldier'], merchant: ['merchant', 'a merchant', 'merchant'], porter: ['porter', 'a porter', 'porter'], philosopher: ['philosopher', 'a philosopher', 'philosopher'],
  courier: ['courier', 'a courier of the imperial post', 'courier'], carter: ['carter', 'a carter', 'carter'], bearer: ['bearer', 'a litter bearer', 'bearer'], charioteer: ['charioteer', 'a charioteer', 'charioteer'],
};
// ---------- names ----------
const NAMES = {
  prae: ['Gaius', 'Lucius', 'Marcus', 'Publius', 'Quintus', 'Titus', 'Gnaeus', 'Sextus', 'Aulus', 'Decimus', 'Tiberius', 'Manius', 'Servius'],
  nom: ['Iulius', 'Cornelius', 'Valerius', 'Claudius', 'Aemilius', 'Fabius', 'Sempronius', 'Licinius', 'Caecilius', 'Flavius', 'Ulpius', 'Aelius', 'Antonius', 'Sulpicius', 'Iunius', 'Pompeius', 'Domitius', 'Calpurnius', 'Vettius', 'Plautius'],
  cog: ['Rufus', 'Felix', 'Severus', 'Maximus', 'Paullus', 'Secundus', 'Celer', 'Priscus', 'Saturninus', 'Fronto', 'Crispus', 'Niger', 'Longus', 'Verus', 'Gallus', 'Fuscus', 'Agricola', 'Macer', 'Proculus', 'Varus'],
  greekM: ['Eros', 'Hermes', 'Philargyrus', 'Onesimus', 'Daphnus', 'Hilarus', 'Primus', 'Syrus', 'Thallus', 'Epaphroditus', 'Narcissus', 'Pallas', 'Zosimus', 'Abascantus', 'Dionysius', 'Antiochus'],
  greekF: ['Chrysis', 'Phoebe', 'Tyche', 'Doris', 'Anthis', 'Myrtale', 'Nike', 'Chloe', 'Iris', 'Helena', 'Thais', 'Daphne', 'Lais', 'Galatea'],
  fem: ['Iulia', 'Cornelia', 'Valeria', 'Claudia', 'Caecilia', 'Fabia', 'Antonia', 'Livia', 'Iunia', 'Octavia', 'Sulpicia', 'Aemilia', 'Domitia', 'Flavia', 'Calpurnia'],
  femCog: ['Prima', 'Secunda', 'Tertia', 'Maxima', 'Paulla', 'Rufina', 'Severa', 'Faustina', 'Procula', 'Lucilla'],
  boys: ['Marcus', 'Gaius', 'Lucius', 'Titus', 'Quintus', 'Publius'], girls: ['Tullia', 'Iulia', 'Prima', 'Lucilla', 'Claudia'],
};
function nameFor(base, L, rng) {
  const p = (a) => P_(a, rng);
  if (L.age === 'child') return (L.g === 'f' ? 'little ' + p(NAMES.girls) : 'little ' + p(NAMES.boys));
  const servile = ['slave', 'slavegirl', 'porter', 'bearer', 'housemaid'].includes(base);
  if (servile) return L.g === 'f' ? p(NAMES.greekF) : p(NAMES.greekM);
  if (L.g === 'f') return p(NAMES.fem) + ' ' + p(NAMES.femCog);
  if (base === 'freedman' || base === 'shopkeeper' || base === 'worker') return rng() < 0.5 ? p(NAMES.prae) + ' ' + p(NAMES.nom) + ' ' + p(NAMES.greekM) : p(NAMES.prae) + ' ' + p(NAMES.nom);
  if (['senator', 'magistrate', 'equestrian', 'orator'].includes(base)) return p(NAMES.prae) + ' ' + p(NAMES.nom) + ' ' + p(NAMES.cog);
  return rng() < 0.6 ? p(NAMES.prae) + ' ' + p(NAMES.nom) : p(NAMES.prae) + ' ' + p(NAMES.nom) + ' ' + p(NAMES.cog);
}
function makePerson(job, rng = Math.random) {
  const J = JOBS[job] || JOBS.citizen;
  const L = makeLook(J[0], rng);
  if (job === 'gossip' || job === 'waterbearer' || job === 'housemaid' || job === 'farmwife') L.g = 'f';
  if (job === 'pupil') { L.g = 'm'; L.item = 'tablet'; }
  if (job === 'teacher') L.item = 'scroll';
  if (job === 'waterbearer') L.item = 'jar';
  if (job === 'mason') L.item = rng() < 0.5 ? 'sack' : null;
  if (L.g === 'f') { L.body = 'dress'; L.beard = false; if (L.hairT !== 'hairLong') L.hairT = 'hairLong'; }
  const name = nameFor(J[0], L, rng);
  const title = J[1] ? (J[1].startsWith('a ') || J[1].startsWith('an ') || J[1].startsWith('the ') || J[1].startsWith('who') || J[1].includes('ing') ? name + ', ' + J[1] : name + ', ' + J[1]) : name;
  return { look: L, who: { name, title: title.charAt(0).toUpperCase() + title.slice(1), key: J[2], job } };
}

// ---------- agents ----------
let _aid = 1;
const NPC = {
  agents: [], near: 0, cartNear: 0, edgesNear: [], edgeW: 0, roadsNear: [], roadW: 0, scanT: 0, spotT: 0, spawnT: 0,
  race: null, raceOn: false,
  init() { initParts(); },
  count() { return this.agents.length; },
  reset() {
    this.agents.length = 0;
    for (const s of W.spots) s.agent = null;
    this.race = null; this.scanT = 0; this.spotT = 0;
  },
  // fill the surroundings at once (after loading or a teleport)
  fill() {
    this.scan(); this.updateSpots(true);
    const n = this.targetWalkers();
    let made = 0;
    for (let i = 0; i < n * 4 && made < n; i++) if (this.spawnWalker(true)) made++;
    const v = this.targetVehicles();
    for (const k in v) for (let i = 0; i < v[k]; i++) this.spawnVehicle(k, true);
  },
  scan() { // edges near the player, weighted for spawning
    const R2 = 150 * 150; this.edgesNear = []; this.roadsNear = []; let w = 0, rw = 0;
    for (let i = 0; i < W.edges.length; i++) {
      const e = W.edges[i], A = W.nodes[e.a], B = W.nodes[e.b];
      const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
      if (dist2(mx, mz, PL.x, PL.z) > R2 + e.len * e.len * 0.25) continue;
      if (e.kind === 'house' || e.off) continue;
      const zf = ZONEF[e.zone] || 1, near = clamp(1.7 - Math.sqrt(dist2(mx, mz, PL.x, PL.z)) / 90, 0.25, 1.7);
      const ww = e.len * e.dens * zf * near * (e.kind === 'plaza' ? 0.6 : 1);
      this.edgesNear.push([i, ww]); w += ww;
      if (e.cart) { this.roadsNear.push([i, e.len]); rw += e.len; }
    }
    this.edgeW = w; this.roadW = rw;
  },
  timeF() { const h = G.hour; return h < 4 ? 0.07 : h < 5.5 ? lerp(0.07, 0.4, (h - 4) / 1.5) : h < 7 ? lerp(0.4, 1, (h - 5.5) / 1.5) : h < 18 ? 1 : h < 21 ? lerp(1, 0.35, (h - 18) / 3) : lerp(0.35, 0.07, (h - 21) / 3); },
  targetWalkers() { return Math.round(Q.crowd * 230 * this.timeF() * clamp(this.edgeW / 2800, 0.05, 1)); },
  cartsAllowed() { return G.hour >= 16 || G.hour < 5.8; }, // the Lex Julia: no carts in the city in the first ten hours of daylight
  targetVehicles() {
    const urb = urbanAt(PL.x, PL.z), day = G.hour > 6 && G.hour < 19;
    const k = Q.crowd * clamp(this.roadW / 1500, 0, 1);
    if (urb > 0.5) return { cart: Math.round(k * (this.cartsAllowed() ? 9 : 0)), litter: Math.round(k * (day ? 2 : 0)), pack: Math.round(k * (day ? 3 : 1)), rider: Math.round(k * (day ? 1 : 0)), patrol: Math.round((SKY.night > 0.5 ? 2 : 0) * Math.min(1, k * 2)), lictors: day && this.inZone('forum') ? 1 : 0, march: 0, vestal: day && this.inZone('forum') ? 1 : 0 };
    return { cart: Math.round(k * (day ? 4 : 1)), raeda: Math.round(k * (day ? 1.5 : 0)), rider: Math.round(k * (day ? 3 : 0.5)), pack: Math.round(k * (day ? 2 : 0)), march: day && this.roadW > 600 ? 1 : 0 };
  },
  inZone(z) { for (const [i] of this.edgesNear) if (W.edges[i].zone === z) return true; return false; },

  // pick a role for a walker on an edge
  walkerJob(e) {
    const z = e.zone, night = SKY.night > 0.6;
    if (night) return wpick([[3, 'citizen'], [1, 'freedman'], [2, 'slave'], [0.5, 'woman'], [0.6, 'vigil'], [0.3, 'soldier']], Math.random());
    if (z === 'appia') return wpick([[3, 'traveller'], [2, 'farmer'], [1.5, 'slave'], [1, 'merchant'], [0.6, 'woman'], [0.4, 'soldier'], [0.6, 'citizen'], [0.4, 'courier']], Math.random());
    if (z === 'town') return wpick([[3, 'citizen'], [3, 'woman'], [1.6, 'farmer'], [1.2, 'child'], [1.2, 'slave'], [0.8, 'slavegirl'], [0.5, 'traveller'], [0.3, 'priest']], Math.random());
    if (z === 'forum') return wpick([[3, 'citizen'], [2, 'woman'], [1.4, 'senator'], [1.6, 'equestrian'], [1.5, 'slave'], [0.6, 'slavegirl'], [0.7, 'freedman'], [0.4, 'soldier'], [0.5, 'priest'], [0.5, 'philosopher'], [0.4, 'merchant'], [0.5, 'child'], [0.4, 'matron']], Math.random());
    if (z === 'subura') return wpick([[3, 'citizen'], [3, 'woman'], [2.4, 'slave'], [1.6, 'slavegirl'], [1.6, 'freedman'], [1.6, 'child'], [1.2, 'porter'], [0.4, 'merchant'], [0.3, 'soldier'], [0.3, 'philosopher']], Math.random());
    return wpick([[3, 'citizen'], [3, 'woman'], [2, 'slave'], [1.2, 'slavegirl'], [1.4, 'freedman'], [1.2, 'child'], [0.8, 'porter'], [0.5, 'merchant'], [0.3, 'soldier'], [0.2, 'philosopher'], [0.25, 'equestrian'], [0.2, 'matron']], Math.random());
  },
  pickEdge(list, total) { let t = Math.random() * total; for (const [i, w] of list) { t -= w; if (t <= 0) return i; } return list.length ? list[list.length - 1][0] : -1; },
  // a place on an edge out of the player's sight (or anywhere, when filling)
  spawnSpot(ei, anywhere) {
    const e = W.edges[ei], A = W.nodes[e.a], B = W.nodes[e.b];
    for (let k = 0; k < 4; k++) {
      const t = Math.random() * e.len, x = lerp(A.x, B.x, t / e.len), z = lerp(A.z, B.z, t / e.len);
      const dx = x - PL.x, dz = z - PL.z, d = Math.hypot(dx, dz);
      if (d < 6 || d > 165) continue;
      if (!anywhere) { const fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw); if (d < 60 && (dx * fx + dz * fz) / d > 0.2) continue; }
      return t;
    }
    return -1;
  },
  spawnWalker(anywhere) {
    if (!this.edgesNear.length) return;
    const ei = this.pickEdge(this.edgesNear, this.edgeW); if (ei < 0) return;
    const t = this.spawnSpot(ei, anywhere); if (t < 0) return;
    const e = W.edges[ei];
    const job = this.walkerJob(e);
    const P = makePerson(job);
    const a = this.newAgent('walk', P);
    const fwd = Math.random() < 0.5;
    a.from = fwd ? e.a : e.b; a.to = fwd ? e.b : e.a; a.e = ei; a.t = fwd ? t : e.len - t;
    a.side = e.kind === 'plaza' ? (Math.random() * 2 - 1) : (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.4);
    a.v = (P.look.age === 'old' ? 0.85 : P.look.age === 'child' ? 1.25 : 1.2) * (0.85 + Math.random() * 0.35);
    if (job === 'courier') a.v = 1.6;
    // a slave with a torch lights the way for his master at night
    if (SKY.night > 0.6 && Math.random() < 0.35 && !P.look.item2) P.look.item2 = 'torch';
    this.placeOnEdge(a, true);
    if (job === 'child' && Math.random() < 0.5) { // a mother with her child
      const M = makePerson('woman'); const b = this.newAgent('follow', M); b.lead = a; b.fo = [0.7, -0.5]; this.placeFollower(b, true);
    }
    return a;
  },
  newAgent(type, P) {
    const a = { id: _aid++, type, look: P ? P.look : null, who: P ? P.who : null, x: 0, y: 0, z: 0, yaw: 0, ph: Math.random() * 10, spd: 0, v: 1.2, side: 0.6, t: 0, e: -1, from: 0, to: 0, talk: false, stop: 0, yT: 0, yv: 0 };
    this.agents.push(a); return a;
  },
  // position on the current edge
  edgePoint(a, t) {
    const A = W.nodes[a.from], B = W.nodes[a.to], e = W.edges[a.e];
    const dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len;
    const off = a.side * (e.kind === 'plaza' ? e.hw : e.hw);
    return [A.x + dx * t - dz * off, A.z + dz * t + dx * off, dx, dz, Math.abs(off) > (e.cw || 99) ? 0.16 : 0.04];
  },
  placeOnEdge(a, snap) {
    const [x, z, dx, dz, up] = this.edgePoint(a, a.t);
    if (snap) { a.x = x; a.z = z; a.yaw = Math.atan2(dx, dz); }
    a.tx = x; a.tz = z; a.up = up;
  },
  nextEdge(a) {
    const node = W.nodes[a.to], cands = [];
    let tw = 0;
    for (const ei of node.e) {
      if (ei === a.e) continue;
      const e = W.edges[ei];
      if (a.vehicle && !e.cart) continue;
      if (e.kind === 'house' && Math.random() > 0.15) continue;
      const other = e.a === a.to ? e.b : e.a, N2 = W.nodes[other];
      let w = e.dens * (ZONEF[e.zone] || 1) + 0.05;
      const d = Math.hypot(N2.x - PL.x, N2.z - PL.z);
      if (d > 140) w *= 0.25;
      cands.push([ei, w, other]); tw += w;
    }
    if (!cands.length) { const t = a.from; a.from = a.to; a.to = t; a.t = 0; return; } // dead end: turn back
    let r = Math.random() * tw, pick = cands[0];
    for (const c of cands) { r -= c[1]; if (r <= 0) { pick = c; break; } }
    a.e = pick[0]; a.from = a.to; a.to = pick[2]; a.t = 0;
    const e = W.edges[a.e];
    if (e.kind === 'plaza') a.side = clamp(a.side * 0.8 + (Math.random() - 0.5) * 0.6, -0.95, 0.95);
    else if (Math.abs(a.side) < 0.4) a.side = (a.side < 0 ? -1 : 1) * (0.55 + Math.random() * 0.4);
  },
  placeFollower(b, snap) {
    const L = b.lead, c = Math.cos(L.yaw), s = Math.sin(L.yaw);
    // fo: [right offset, back offset] in the leader's frame (model forward +z, left +x)
    const tx = L.x - c * b.fo[0] + s * b.fo[1], tz = L.z + s * b.fo[0] + c * b.fo[1];
    b.tx = tx; b.tz = tz;
    if (snap) { b.x = tx; b.z = tz; b.yaw = L.yaw; }
  },

  // vehicles and processions
  spawnVehicle(kind, anywhere) {
    let list = this.roadsNear, total = this.roadW;
    if (kind === 'lictors' || kind === 'vestal' || kind === 'patrol') { list = this.edgesNear.filter(([i]) => kind === 'patrol' || W.edges[i].zone === 'forum'); total = list.reduce((s, x) => s + x[1], 0); }
    if (!list.length) return;
    const ei = this.pickEdge(list, total); if (ei < 0) return;
    const t = this.spawnSpot(ei, anywhere); if (t < 0) return;
    const e = W.edges[ei], fwd = Math.random() < 0.5;
    const setEdge = (a) => { a.from = fwd ? e.a : e.b; a.to = fwd ? e.b : e.a; a.e = ei; a.t = fwd ? t : e.len - t; this.placeOnEdge(a, true); };
    if (kind === 'cart') {
      const a = this.newAgent('cart', makePerson('carter')); a.vehicle = true; a.v = 1.0 + Math.random() * 0.3; a.side = -0.45;
      a.load = fpick(['loadAmph', 'loadSacks', 'loadBarrels', 'loadHay', 'loadAmph']); a.team = Math.random() < 0.6 ? 'ox' : 'mule';
      a.teamCol = fpick([0xb8a890, 0x8a6a4a, 0xd8cfc0, 0x6a5040]); setEdge(a); a.kind2 = 'cart';
    } else if (kind === 'raeda') {
      const a = this.newAgent('raeda', makePerson('carter')); a.vehicle = true; a.v = 2.2; a.side = -0.45; a.hood = fpick([0xa83a2a, 0xd8c8a8, 0x3d5a80, 0x8a6a4a]);
      a.teamCol = fpick([0x6a4a30, 0x8a6a4a, 0x3a2a20]); setEdge(a);
    } else if (kind === 'rider') {
      const P = makePerson(Math.random() < 0.4 ? 'courier' : fpick(['equestrian', 'traveller', 'soldier']));
      const a = this.newAgent('rider', P); a.vehicle = true; a.v = P.who.job === 'courier' ? 4.5 : 2.2; a.side = -0.4; a.horseCol = fpick([0x6a4028, 0x8a5a34, 0x3a2a20, 0xb8b0a0, 0x9a6a3a, 0x2a2420]); setEdge(a);
    } else if (kind === 'pack') {
      const a = this.newAgent('pack', makePerson(fpick(['slave', 'farmer', 'carter']))); a.v = 1.0; a.side = -0.5; a.donkey = true; a.horseCol = fpick([0x8a8478, 0x6a6058, 0x9a8a78]); setEdge(a); a.look.item = null;
    } else if (kind === 'litter') {
      const a = this.newAgent('litter', makePerson('bearer')); a.v = 1.0; a.side = -0.2; a.vehicle = true; a.cur = fpick([0xa83a2a, 0x6a2a56, 0xd8c070, 0x3d5a80]); setEdge(a);
      a.bearers = [0, 1, 2, 3].map(() => makePerson('bearer').look);
      const guide = this.newAgent('follow', makePerson('slave')); guide.lead = a; guide.fo = [0, -4.2]; guide.look.item = null; this.placeFollower(guide, true);
    } else if (kind === 'lictors') { // a consul preceded by his twelve lictors, in single file
      const a = this.newAgent('walk', makePerson('magistrate')); a.v = 1.05; a.side = 0; setEdge(a);
      for (let i = 0; i < 12; i++) { const b = this.newAgent('follow', makePerson('lictor')); b.lead = a; b.fo = [0, 2.0 + i * 1.4]; this.placeFollower(b, true); }
      const c = this.newAgent('follow', makePerson('slave')); c.lead = a; c.fo = [0.8, 1.6]; c.look.item = 'scroll'; this.placeFollower(c, true);
    } else if (kind === 'vestal') {
      const a = this.newAgent('walk', makePerson('vestal')); a.v = 1.0; a.side = 0.2; setEdge(a);
      const b = this.newAgent('follow', makePerson('lictor')); b.lead = a; b.fo = [0, -2.2]; this.placeFollower(b, true);
    } else if (kind === 'patrol') { // three vigiles with torches
      const a = this.newAgent('walk', makePerson('vigil')); a.v = 1.1; a.side = 0; setEdge(a);
      for (let i = 0; i < 2; i++) { const b = this.newAgent('follow', makePerson('vigil')); b.lead = a; b.fo = [i ? 0.8 : -0.8, 1.4]; this.placeFollower(b, true); }
    } else if (kind === 'march') { // a contubernium of eight legionaries on the road
      const a = this.newAgent('walk', makePerson('soldier')); a.v = 1.45; a.side = -0.1; a.vehicle = true; setEdge(a); a.march = true;
      for (let i = 0; i < 7; i++) { const b = this.newAgent('follow', makePerson('soldier')); b.lead = a; b.fo = [(i % 2 ? 0.55 : -0.55), -1.3 * (Math.floor((i + 1) / 2) + (i % 2 ? 0 : 0))]; b.fo[1] = -1.3 * Math.ceil((i + 1) / 2); if (i === 6) b.fo = [-0.55, 0]; this.placeFollower(b, true); }
    }
  },

  // ---------- stationary people (spots) ----------
  updateSpots(force) {
    for (const s of W.spots) {
      const d = Math.hypot(s.x - PL.x, s.z - PL.z);
      const on = d < 115 && (!s.h || (G.hour >= s.h[0] && G.hour < s.h[1]));
      if (on && !s.agent && (force || d > 30 || !this.inView(s.x, s.z))) this.spawnAtSpot(s);
      else if (!on && s.agent && (d > 140 || !this.inView(s.x, s.z) || d > 60)) this.removeSpot(s);
    }
  },
  inView(x, z) { const dx = x - PL.x, dz = z - PL.z, d = Math.hypot(dx, dz) || 1; return (dx * -Math.sin(PL.yaw) + dz * -Math.cos(PL.yaw)) / d > 0.3; },
  spawnAtSpot(s) {
    const y = s.y != null ? s.y : groundAt(s.x, s.z);
    if (s.kind === 'animal' || s.kind === 'mill' || s.kind === 'cart') {
      const a = this.newAgent(s.kind === 'cart' ? 'parked' : 'animal', null);
      a.x = s.x; a.z = s.z; a.y = y; a.yaw = s.yaw; a.spot = s; a.role = s.role; a.horseCol = fpick([0x8a8478, 0x6a4028, 0x8a5a34, 0xb8a890]);
      if (s.role === 'ox') a.horseCol = fpick([0xb8a890, 0x8a6a4a, 0xd8cfc0]);
      if (s.kind === 'cart') { a.load = fpick(['loadAmph', 'loadSacks', 'loadHay']); a.team = 'none'; }
      s.agent = [a]; return;
    }
    if (s.kind === 'flock') {
      const P = makePerson('shepherd'); const a = this.newAgent('spot', P); a.spot = s; a.x = s.x; a.z = s.z; a.y = y; a.yaw = s.yaw; a.pose = 'stand';
      const list = [a];
      for (let i = 0; i < s.n; i++) { const b = this.newAgent('sheep', null); b.cx = s.x; b.cz = s.z; b.x = s.x + frand(-10, 10); b.z = s.z + frand(-10, 10); b.y = groundAt(b.x, b.z); b.yaw = frand(0, TAU); b.wt = frand(0, 4); list.push(b); }
      const dog = this.newAgent('dog', null); dog.lead = a; dog.x = s.x + 3; dog.z = s.z; dog.y = y; list.push(dog);
      s.agent = list; return;
    }
    const P = makePerson(s.role);
    const a = this.newAgent('spot', P);
    a.spot = s; a.x = s.x; a.z = s.z; a.y = y; a.yaw = s.yaw; a.yaw0 = s.yaw;
    a.pose = { shop: 'stand', stand: 'stand', queue: 'stand', work: 'work', teach: 'teach', fetch: 'stand', beg: 'sitground', tread: 'tread', hammer: 'hammer', sit: 'sit', spar: 'spar', run: 'run', play: 'play', orator: 'orate' }[s.kind] || 'stand';
    const list = [a];
    if (s.kind === 'orator') { // a crowd gathers to listen
      for (let i = 0; i < 16; i++) {
        const b = this.newAgent('spot', makePerson(Math.random() < 0.3 ? 'senator' : Math.random() < 0.5 ? 'citizen' : fpick(['woman', 'freedman', 'equestrian']))); b.who.title = b.who.name + ', listening to the speech'; b.who.key = 'listener';
        // an arc in front of the platform, three deep
        const [cx, cz] = s.crowd; const fx = cx - s.x, fz = cz - s.z, fl = Math.hypot(fx, fz) || 1;
        const ux = fx / fl, uz = fz / fl; // from the speaker out toward the square
        const ang = ((i % 6) / 5 - 0.5) * 1.5 + (Math.random() - 0.5) * 0.12, r = 11 + Math.floor(i / 6) * 1.5 + Math.random() * 0.6;
        b.x = s.x + (ux * Math.cos(ang) - uz * Math.sin(ang)) * r; b.z = s.z + (uz * Math.cos(ang) + ux * Math.sin(ang)) * r;
        b.y = groundAt(b.x, b.z) + 0.06; b.yaw = Math.atan2(s.x - b.x, s.z - b.z); b.pose = 'stand'; b.spot = s; list.push(b);
      }
      a.pose = 'orate';
    }
    if (s.kind === 'run') { a.cx = s.x; a.cz = s.z; }
    s.agent = list;
  },
  removeSpot(s) { for (const a of s.agent) { const i = this.agents.indexOf(a); if (i >= 0) this.agents.splice(i, 1); } s.agent = null; },

  // ---------- the races in the Circus Maximus ----------
  updateRace(dt) {
    const C2 = W.circus; if (!C2) return;
    const d = Math.hypot(C2.F.x - PL.x, C2.F.z - PL.z);
    const on = G.hour >= 8.5 && G.hour < 16.5 && d < 900;
    this.raceOn = on;
    AU.env.roar = on ? clamp(1 - (d - 60) / 500, 0, 1) * (0.6 + 0.4 * Math.sin(G.hour * 40) ** 2) : 0;
    if (!on) { this.race = null; return; }
    if (!this.race) {
      const cols = [0xc8302a, 0xe8e4dc, 0x3a8a3a, 0x2a5aa8]; // the Reds, Whites, Greens and Blues
      this.race = [];
      for (let i = 0; i < 8; i++) { const P = makePerson('charioteer'); P.look.cloth = cols[i % 4]; P.who.title = P.who.name + ', charioteer of the ' + ['Reds', 'Whites', 'Greens', 'Blues'][i % 4]; this.race.push({ s: i * 9 + Math.random() * 6, lane: C2.lanes[i % 4] + (i > 3 ? 2 : 0), v: 13 + Math.random() * 3, col: cols[i % 4], P, horses: [0x6a4028, 0x3a2a20, 0x8a5a34, 0xd8d0c4][i % 4], ph: Math.random() * 6 }); }
    }
    for (const c of this.race) { c.v += (14.5 + Math.sin(G.hour * 13 + c.lane) * 2 - c.v) * dt * 0.3; c.s += c.v * dt; c.ph += dt * c.v * 0.6; }
  },
  racePos(c) {
    const C2 = W.circus, SL = C2.SL, R1 = c.lane, L1 = 2 * SL, L2 = Math.PI * R1, per = 2 * L1 + 2 * L2;
    let s = c.s % per, u, v, du, dv;
    if (s < L1) { u = -SL + s; v = R1; du = 1; dv = 0; }
    else if ((s -= L1) < L2) { const a = Math.PI / 2 - s / R1; u = SL + Math.cos(a) * R1; v = Math.sin(a) * R1; du = Math.sin(a); dv = -Math.cos(a); }
    else if ((s -= L2) < L1) { u = SL - s; v = -R1; du = -1; dv = 0; }
    else { s -= L1; const a = -Math.PI / 2 - s / R1; u = -SL + Math.cos(a) * R1; v = Math.sin(a) * R1; du = Math.sin(a); dv = -Math.cos(a); }
    const F = C2.F, x = F.wx(u, v), z = F.wz(u, v);
    return [x, z, F.yawOf(du, dv)];
  },

  // ---------- per frame ----------
  update(dt) {
    this.scanT -= dt; if (this.scanT <= 0) { this.scanT = 1.5; this.scan(); }
    this.spotT -= dt; if (this.spotT <= 0) { this.spotT = 0.5; this.updateSpots(false); }
    // keep the numbers up
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.25;
      let walkers = 0; const veh = {};
      for (const a of this.agents) { if (a.type === 'walk' && !a.vehicle) walkers++; const k = a.kind2 || (a.type === 'walk' ? null : a.type); if (k) veh[k] = (veh[k] || 0) + 1; }
      if (walkers < this.targetWalkers()) for (let i = 0; i < 3; i++) this.spawnWalker(false);
      const tv = this.targetVehicles();
      const have = { cart: veh.cart || 0, raeda: veh.raeda || 0, rider: veh.rider || 0, pack: veh.pack || 0, litter: veh.litter || 0,
        lictors: this.agents.filter((a) => a.who && a.who.job === 'magistrate').length, vestal: this.agents.filter((a) => a.who && a.who.job === 'vestal').length,
        patrol: this.agents.filter((a) => a.type === 'walk' && a.who && a.who.job === 'vigil').length, march: this.agents.filter((a) => a.march).length };
      for (const k in tv) if ((have[k] || 0) < tv[k] && Math.random() < 0.35) this.spawnVehicle(k, false);
    }
    this.updateRace(dt);
    // move
    let near = 0, cartNear = 0;
    const px = PL.x, pz = PL.z;
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      const d = Math.hypot(a.x - px, a.z - pz);
      if (d < 22 && a.look) near++;
      if ((a.type === 'cart' || a.type === 'raeda') && d < 40) cartNear = Math.max(cartNear, 1 - d / 40);
      if (a.type === 'walk' || a.type === 'cart' || a.type === 'raeda' || a.type === 'rider' || a.type === 'pack' || a.type === 'litter') {
        if (d > (a.vehicle ? 230 : 175)) { this.remove(i); continue; }
        this.moveOnGraph(a, dt, d);
      } else if (a.type === 'follow') {
        if (!this.agents.includes(a.lead)) { this.agents.splice(i, 1); continue; }
        this.placeFollower(a, false); this.steer(a, dt, a.lead.spd);
      } else if (a.type === 'animal' && a.spot && a.spot.kind === 'mill') {
        a.ang = (a.ang || 0) + dt * 0.55; const r = a.spot.r || 1.3;
        a.x = a.spot.x + Math.cos(a.ang) * r; a.z = a.spot.z + Math.sin(a.ang) * r; a.yaw = Math.atan2(-Math.sin(a.ang), Math.cos(a.ang)) + Math.PI; a.spd = 0.7; a.ph += dt * 3;
      } else if (a.type === 'sheep') {
        a.wt -= dt; if (a.wt <= 0) { a.wt = frand(2, 7); a.goal = [a.cx + frand(-12, 12), a.cz + frand(-12, 12)]; }
        if (a.goal) { const gx = a.goal[0] - a.x, gz = a.goal[1] - a.z, gd = Math.hypot(gx, gz); if (gd > 0.5) { a.x += gx / gd * dt * 0.5; a.z += gz / gd * dt * 0.5; a.yaw = angTo(a.yaw, Math.atan2(gx, gz), dt * 2); a.y = groundAt(a.x, a.z); } }
      } else if (a.type === 'dog') {
        a.ph += dt; const L = a.lead; const tx = L.x + Math.cos(a.ph * 0.3) * 6, tz = L.z + Math.sin(a.ph * 0.3) * 6; const gx = tx - a.x, gz = tz - a.z, gd = Math.hypot(gx, gz);
        if (gd > 0.5) { a.x += gx / gd * dt * Math.min(3, gd); a.z += gz / gd * dt * Math.min(3, gd); a.yaw = Math.atan2(gx, gz); a.y = groundAt(a.x, a.z); a.spd = Math.min(3, gd); } else a.spd = 0;
      } else if (a.type === 'spot') {
        a.ph += dt;
        if (a.pose === 'run' && a.cx != null) { a.ang = (a.ang || 0) + dt * 0.08; a.x = a.cx + Math.sin(a.ang) * 4; a.z = a.cz + Math.cos(a.ang * 1.0) * 60; a.yaw = Math.atan2(Math.cos(a.ang) * 4 * 0.08, -Math.sin(a.ang) * 60 * 0.08); a.y = groundAt(a.x, a.z); a.spd = 3; }
        if (a.talk) a.yaw = angTo(a.yaw, Math.atan2(PL.x - a.x, PL.z - a.z), dt * 3);
        else if (a.yaw0 != null) a.yaw = angTo(a.yaw, a.yaw0, dt * 1.5);
      }
    }
    this.near = near; this.cartNear = cartNear;
    // the Colosseum and Venus & Rome building site sound
    AU.env.build = 0;
    if (W.crane) { const d = Math.hypot(W.crane.F.x - PL.x, W.crane.F.z - PL.z); if (d < 90 && G.hour > 6 && G.hour < 17) AU.env.build = 1 - d / 90; }
  },
  remove(i) {
    const a = this.agents[i]; this.agents.splice(i, 1);
    for (let k = this.agents.length - 1; k >= 0; k--) if (this.agents[k].lead === a) this.agents.splice(k, 1);
  },
  moveOnGraph(a, dt, dplayer) {
    if (a.talk) { a.spd = 0; a.yaw = angTo(a.yaw, Math.atan2(PL.x - a.x, PL.z - a.z), dt * 3); return; }
    // stop for the player standing in the way
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), dx = PL.x - a.x, dz = PL.z - a.z;
    const ahead = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
    let want = a.v;
    const block = a.vehicle ? (ahead > 0 && ahead < 6 && lat < 1.6) : (ahead > 0 && ahead < 1.6 && lat < 0.7);
    if (block) { want = 0; if (!a.vehicle && Math.random() < dt) a.side = clamp(a.side + (dx * fz - dz * fx > 0 ? -0.4 : 0.4), -0.95, 0.95); }
    a.spd += (want - a.spd) * Math.min(1, dt * 3);
    a.t += a.spd * dt;
    const e = W.edges[a.e];
    if (a.t >= e.len) { a.t -= e.len; this.nextEdge(a); }
    this.placeOnEdge(a, false);
    this.steer(a, dt, a.spd);
    if (a.type === 'pack' || a.type === 'rider' || a.type === 'cart' || a.type === 'raeda') { // hoofbeats
      a.hoofT = (a.hoofT || 0) - dt * a.spd; if (a.hoofT <= 0) { a.hoofT = a.type === 'rider' && a.v > 3 ? 0.9 : 0.75; if (dplayer < 45) AU.hoof(a.x, a.z, a.type === 'cart' ? 0.7 : 1); }
    }
  },
  // ease toward the target point, turn to face the way of travel, follow the ground
  steer(a, dt, spd) {
    const gx = a.tx - a.x, gz = a.tz - a.z, gd = Math.hypot(gx, gz);
    const k = Math.min(1, dt * (a.vehicle ? 3 : 5));
    a.x += gx * k; a.z += gz * k;
    if (gd > 0.02 && spd > 0.05) a.yaw = angTo(a.yaw, Math.atan2(gx, gz), dt * (a.vehicle ? 1.8 : 4));
    if (a.type === 'follow') { a.spd = spd; if (gd < 0.05 && spd < 0.1) a.spd = 0; }
    a.ph += dt * Math.max(a.spd, 0) * (a.type === 'rider' && a.v > 3 ? 1.6 : 2.6);
    a.yT -= dt;
    if (a.yT <= 0) { a.yT = 0.3 + Math.random() * 0.2; a.yv = surfaceAt(a.x, a.z, groundAt(a.x, a.z) + 0.6) + (a.up || 0.04); }
    a.y += (a.yv - a.y) * Math.min(1, dt * 8);
  },

  // ---------- talking ----------
  pick(ex, ey, ez, fx, fy, fz) {
    let best = null, bs = -1;
    for (const a of this.agents) {
      if (!a.who || a.type === 'cart' || a.type === 'raeda' || a.type === 'litter') continue;
      const dx = a.x - ex, dz = a.z - ez, d = Math.hypot(dx, dz);
      if (d > 3.4) continue;
      const hy = a.y + (a.type === 'rider' ? 2.2 : 1.35) - ey, l = Math.hypot(d, hy) || 1;
      const dot = (dx * fx + hy * fy + dz * fz) / l;
      const sc = dot - d * 0.03;
      if (dot > 0.86 && sc > bs) { bs = sc; best = a; }
    }
    return best ? { a: best, score: bs } : null;
  },
  pushPlayer(x, z) {
    for (const a of this.agents) {
      const r = a.type === 'cart' || a.type === 'raeda' ? 1.3 : a.type === 'rider' || a.type === 'animal' || a.type === 'pack' ? 0.7 : a.type === 'sheep' ? 0.4 : a.look ? 0.3 : 0;
      if (!r) continue;
      const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz), m = r + PR;
      if (d < m && d > 1e-4) { x += dx / d * (m - d); z += dz / d * (m - d); }
    }
    return [x, z];
  },

  // ---------- draw ----------
  draw() {
    partsBegin();
    const cx = R.camera.position.x, cz = R.camera.position.z, fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw);
    const maxD = Q.npcDraw, torches = SKY.night > 0.35;
    const vis = (x, z, pad = 4) => { const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz); return d < maxD && (d < 12 + pad || (dx * fx + dz * fz) / d > -0.25); };
    for (const a of this.agents) {
      if (!vis(a.x, a.z, a.type === 'cart' ? 8 : 4)) continue;
      const lod = Math.hypot(a.x - cx, a.z - cz) > 55;
      switch (a.type) {
        case 'walk': case 'follow': drawHuman(a, a.x, a.y, a.z, a.yaw, a.look, a.march ? 'march' : 'walk', a.spd, a.ph, lod, torches); break;
        case 'spot': drawHuman(a, a.x, a.y, a.z, a.yaw, a.look, a.pose, a.spd || 0, a.ph, lod, torches); break;
        case 'rider': drawHorse(a.x, a.y, a.z, a.yaw, a.horseCol, a.spd, a.ph, false, true); drawHuman(a, a.x, a.y + 0.55, a.z, a.yaw, a.look, 'ride', 0, a.ph, lod, torches); break;
        case 'pack': drawHorse(a.x, a.y, a.z, a.yaw, a.horseCol, a.spd, a.ph, true, false, 0.8); drawHuman(a, a.x - Math.cos(a.yaw) * 0.7 + Math.sin(a.yaw) * 1.2, a.y, a.z + Math.sin(a.yaw) * 0.7 + Math.cos(a.yaw) * 1.2, a.yaw, a.look, 'lead', a.spd, a.ph, lod, torches); IP.sack.put(a.x, a.y, a.z, a.yaw, 0.8, 0.32, 1.0, 0, 0, 0, 0.2, 0xb8a888); IP.sack.put(a.x, a.y, a.z, a.yaw, 0.8, -0.32, 1.0, 0, 0, 0, -0.2, 0xa89878); break;
        case 'cart': drawCart(a, lod, torches); break;
        case 'parked': drawCart(a, true, false); break;
        case 'raeda': drawRaeda(a, lod); break;
        case 'litter': drawLitter(a, lod); break;
        case 'animal': {
          const r = a.role;
          if (r === 'ox') drawOx(a.x, a.y, a.z, a.yaw, a.horseCol, 0, a.ph);
          else drawHorse(a.x, a.y, a.z, a.yaw, a.horseCol, a.spd || 0, a.ph, r !== 'horse', false, r === 'horse' ? 1 : 0.8);
          break;
        }
        case 'sheep': IP.sheep.put(a.x, a.y, a.z, a.yaw, 1, 0, 0, 0, 0, 0, 0, 0xffffff); break;
        case 'dog': IP.dog.put(a.x, a.y, a.z, a.yaw, 1, 0, Math.abs(Math.sin(a.ph * 8)) * 0.05 * (a.spd > 0.3 ? 1 : 0), 0, 0, 0, 0, 0x8a6a4a); break;
      }
    }
    // the races and the crowd
    if (this.race) {
      for (const c of this.race) {
        const [x, z, yaw] = this.racePos(c), y = groundAt(x, z) + 0.05;
        if (!vis(x, z, 10)) continue;
        IP.chariot.put(x, y, z, yaw, 1, 0, 0, 0, 0, 0, 0, c.col);
        for (const s of [-1, 1]) IP.wheelSpoke.put(x, y, z, yaw, 0.9, s * 0.65, 0.5, 0, -c.s * 1.9, 0, 0, 0xffffff);
        for (let i = 0; i < 4; i++) drawHorse(x + Math.cos(yaw) * (-0.9 + i * 0.6) + Math.sin(yaw) * 2.6, y, z - Math.sin(yaw) * (-0.9 + i * 0.6) + Math.cos(yaw) * 2.6, yaw, c.horses, 6, c.ph + i * 0.7, false, false, 0.95);
        drawHuman(null, x, y + 0.5, z, yaw, c.P.look, 'drive', 0, c.ph, false, false);
      }
      const n = W.seatPts.length;
      for (let i = 0; i < n; i++) {
        const s = W.seatPts[i]; if (!s.circus) continue;
        const dx = s.x - cx, dz = s.z - cz; if (dx * dx + dz * dz > 450 * 450) continue;
        const h = hash2(i, 7, 1), jump = Math.max(0, Math.sin(G.hour * 300 + i)) * 0.15 * (h > 0.7 ? 1 : 0);
        IP.spect.put(s.x, s.y + jump, s.z, s.yaw, 1, 0, 0, 0, 0, 0, 0, h < 0.15 ? 0xc8302a : h < 0.3 ? 0x3a8a3a : h < 0.4 ? 0x2a5aa8 : CLOTH.plain[(i * 7) % 8]);
      }
    }
    partsEnd();
  },
};
const ZONEF = { subura: 1.7, forum: 1.3, city: 1.0, appia: 0.35, town: 0.9 };

// ---------- drawing ----------
const HIP = 0.9, SH = 1.42, NECK = 1.45;
function drawHuman(a, x, y, z, yaw, L, pose, spd, ph, lod, torches) {
  const s = L.s, skin = L.skin;
  let tL = 0, tR = 0, kL = 0, kR = 0, aL = 0.05, aR = 0.05, rL = 0, rR = 0, bob = 0, lean = 0, headP = 0, headY = 0, by = 0;
  let thL = 0, thR = 0; // thigh roll (spread)
  switch (pose) {
    case 'walk': case 'lead': case 'march': {
      const sw = clamp(spd / 1.3, 0, 1.4) * (pose === 'march' ? 0.6 : 0.5);
      const sn = Math.sin(ph);
      tL = sn * sw; tR = -sn * sw; kL = Math.max(0, -Math.sin(ph - 0.6)) * sw * 1.6; kR = Math.max(0, Math.sin(ph - 0.6)) * sw * 1.6;
      aL = -tL * 0.8; aR = -tR * 0.8; bob = Math.abs(Math.cos(ph)) * 0.035 * Math.min(1, sw * 2);
      if (pose === 'lead') aR = -0.6;
      break;
    }
    case 'run': { const sn = Math.sin(ph * 1.6); tL = sn * 0.9; tR = -tL; kL = Math.max(0, -sn) * 1.6; kR = Math.max(0, sn) * 1.6; aL = -tL; aR = -tR; bob = Math.abs(Math.cos(ph * 1.6)) * 0.08; lean = 0.15; break; }
    case 'sit': tL = tR = -1.45; kL = kR = 1.45; by = -0.85; aL = aR = -0.35; break;
    case 'sitground': tL = tR = -1.5; kL = kR = 0.2; by = -0.86; aL = -0.5; aR = -0.9; headP = 0.25; break;
    case 'ride': tL = tR = -1.15; kL = kR = 1.25; thL = 0.4; thR = -0.4; aL = aR = -0.7; break;
    case 'drive': aL = aR = -1.1; lean = 0.25; tL = -0.3; tR = 0.3; kL = kR = 0.4; by = -0.08; break;
    case 'work': { const w = Math.sin(ph * 2.2); aL = -0.9 + w * 0.45; aR = -0.9 - w * 0.45; lean = 0.32; headP = 0.25; break; }
    case 'hammer': { const w = Math.max(0, Math.sin(ph * 3.2)); aR = -2.6 + w * 2.0; aL = -0.8; lean = 0.15; headP = 0.3; break; }
    case 'tread': { const w = Math.sin(ph * 3); tL = Math.max(0, w) * -0.6; tR = Math.max(0, -w) * -0.6; kL = -tL * 1.6; kR = -tR * 1.6; aL = aR = -0.2; rL = 0.3; rR = -0.3; break; }
    case 'teach': { const w = Math.sin(ph * 1.3); aR = -1.2 + w * 0.5; rR = -0.3; aL = -0.4; tL = tR = -1.45; kL = kR = 1.45; by = -0.85; break; }
    case 'orate': { const w = Math.sin(ph * 0.9), w2 = Math.sin(ph * 2.1); aR = -1.6 + w * 0.7; rR = -0.5 + w2 * 0.3; aL = -0.5; headY = Math.sin(ph * 0.4) * 0.5; break; }
    case 'spar': { const w = Math.sin(ph * 2.4), w2 = Math.sin(ph * 1.1); aR = -1.4 + w * 0.9; aL = -1.1; tL = -0.35 + w2 * 0.15; tR = 0.35; kR = 0.5; lean = 0.18; break; }
    case 'play': { const w = Math.sin(ph * 2); tL = tR = -1.5; kL = kR = 2.6; by = -0.62; aR = -1.0 + w * 0.5; lean = 0.4; headP = 0.4; break; }
    default: { const w = Math.sin(ph * 0.7 + (a ? a.id : 0)); aL = 0.08 + w * 0.03; aR = 0.08 - w * 0.03; headY = Math.sin(ph * 0.23 + (a ? a.id : 0)) * 0.35; if (a && a.talk) { aR = -0.7 + Math.sin(ph * 2) * 0.35; headY = 0; } }
  }
  if (a && a.talk && pose === 'walk') { aR = -0.6 + Math.sin(ph * 2) * 0.3; }
  y += by + bob;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  // legs: thigh from the hip, shin from the knee
  const leg = (side, t, k, roll) => {
    const hx = side * 0.1;
    IP.thigh.put(x, y, z, yaw, s, hx, HIP, 0, t, 0, roll, skin);
    const ky = HIP - Math.cos(t) * 0.44 * Math.cos(roll), kz = -Math.sin(t) * 0.44, kx = hx + Math.sin(roll) * 0.44;
    (L.boots ? IP.boot : IP.shin).put(x, y, z, yaw, s, kx, ky, kz, t + k, 0, roll * 0.5, skin);
  };
  if (L.body !== 'dress' || pose === 'sit' || pose === 'ride' || pose === 'play') { leg(1, tL, kL, thL); leg(-1, tR, kR, thR); }
  else { // a long dress hides the knees: draw just the shins swinging under the hem
    IP.shin.put(x, y, z, yaw, s, 0.09, 0.42, 0, tL * 0.6, 0, 0, skin); IP.shin.put(x, y, z, yaw, s, -0.09, 0.42, 0, tR * 0.6, 0, 0, skin);
  }
  // body
  const bodyP = IP[L.body] || IP.tunic;
  const lx = 0, ly = 0, lz = 0;
  bodyP.put(x, y, z, yaw, s, 0, 0, 0, lean * 0.6, 0, 0, L.cloth);
  if (L.over) IP[L.over].put(x, y, z, yaw, s, 0, 0, 0, lean * 0.6, 0, 0, L.overCol);
  // arms (a toga covers the left)
  const shz = Math.sin(lean * 0.6) * 1.0;
  const toga = L.over === 'toga' || L.over === 'togaP';
  if (!toga) IP.arm.put(x, y, z, yaw, s, 0.24, SH, shz, aL, 0, -0.08 + rL, skin);
  IP.arm.put(x, y, z, yaw, s, -0.24, SH, shz, aR, 0, 0.08 + rR, skin);
  // head
  const hz = Math.sin(lean * 0.6) * 1.1;
  IP.head.put(x, y, z, yaw, s, 0, NECK - (lean > 0.2 ? 0.03 : 0), hz, headP, headY, 0, skin);
  if (L.hat !== 'helmet' && !(L.hat === 'palla' && L.g === 'f' && false)) IP[L.hairT].put(x, y, z, yaw, s, 0, NECK, hz, headP, headY, 0, L.hair);
  if (L.beard && !lod) IP.beard.put(x, y, z, yaw, s, 0, NECK, hz, headP, headY, 0, L.hair);
  if (L.hat) IP[L.hat].put(x, y, z, yaw, s, 0, NECK, hz, headP, headY, 0, L.hatCol);
  if (lod && pose !== 'ride') return;
  // things carried
  const hand = (side, ap) => { const r = 0.62; return [SH - Math.cos(ap) * r, -Math.sin(ap) * r + shz]; }; // [y, z] of the hand
  const item = L.item, item2 = L.item2;
  if (item === 'amphora') IP.amphora.put(x, y, z, yaw, s, -0.22, 1.42, -0.05, 0.9, 0, 0.35, 0xffffff);
  else if (item === 'sack') IP.sack.put(x, y, z, yaw, s, -0.18, 1.38, -0.08, 0.6, 0, 0.3, 0xffffff);
  else if (item === 'basket') IP.basket.put(x, y, z, yaw, s, 0, NECK + 0.31, 0, 0, 0, 0, 0xffffff);
  else if (item === 'jar') IP.jar.put(x, y, z, yaw, s, 0, NECK + 0.31, 0, 0, 0, 0, 0xffffff);
  else if (item === 'staff') { const [hy, hz2] = hand(-1, aR, 0); IP.staff.put(x, y, z, yaw, s, -0.27, hy, hz2 + 0.05, 0, 0, 0, 0xffffff); }
  else if (item === 'spear') { const [hy, hz2] = hand(-1, aR, 0); IP.spear.put(x, y, z, yaw, s, -0.27, hy + 0.2, hz2 + 0.05, 0, 0, 0, 0xffffff); }
  else if (item === 'fasces') IP.fasces.put(x, y, z, yaw, s, 0.26, 0.95, 0.05, -0.25, 0, 0.2, 0xffffff);
  else if (item === 'bucket') { const [hy, hz2] = hand(-1, aR, 0); IP.bucket.put(x, y, z, yaw, s, -0.27, hy - 0.25, hz2, 0, 0, 0, 0xffffff); }
  else if (item === 'scroll') { const [hy, hz2] = hand(-1, aR, 0); IP.scroll.put(x, y, z, yaw, s, -0.25, hy, hz2 + 0.06, 0, 0, 0, 0xffffff); }
  else if (item === 'tablet') IP.tablet.put(x, y, z, yaw, s, 0, pose === 'sit' ? 0.62 + 0.42 : 0.9, 0.3, 0, 0, 0, 0xffffff);
  else if (item === 'sword') { const [hy, hz2] = hand(-1, aR, 0); IP.sword.put(x, y, z, yaw, s, -0.25, hy + 0.05, hz2, aR + Math.PI, 0, 0, 0xffffff); }
  if (item2 === 'shield') IP.shield.put(x, y, z, yaw, s, 0.36, 0.95, 0.18, 0, -0.5, 0, 0xffffff);
  else if (item2 === 'parma') IP.parma.put(x, y, z, yaw, s, 0.34, 1.05, 0.25, Math.PI / 2, -0.4, 0, 0xffffff);
  else if (item2 === 'torch' && torches) {
    const ap = -1.1; IP.torch.put(x, y, z, yaw, s, 0.3, SH - Math.cos(ap) * 0.6, -Math.sin(ap) * 0.6, -0.3, 0, 0, 0xffffff);
    const fy = SH - Math.cos(ap) * 0.6 + 0.55, fz2 = -Math.sin(ap) * 0.6 + 0.18;
    IP.flame.put(x, y, z, yaw, s * (1 + Math.sin(ph * 9 + x) * 0.15), 0.3, fy, fz2, 0, ph * 3, 0, 0xffffff);
  }
}
function drawHorse(x, y, z, yaw, col, spd, ph, donkey, saddle, sc = 1) {
  const s = sc, g = Math.min(1, spd / 1.4), gal = spd > 3;
  const sn = Math.sin(ph * (gal ? 1.4 : 1)), cs = Math.cos(ph * (gal ? 1.4 : 1));
  const bob = (gal ? Math.abs(sn) * 0.08 : Math.abs(cs) * 0.03) * g;
  IP.horseBody.put(x, y + bob, z, yaw, s, 0, 0, 0, 0, 0, 0, col);
  if (saddle) IP.saddle.put(x, y + bob, z, yaw, s, 0, 0, 0, 0, 0, 0, 0x8a2a20);
  (donkey ? IP.donkeyHead : IP.horseHead).put(x, y + bob, z, yaw, s, 0, 1.38, 0.68, (gal ? sn * 0.15 : cs * 0.06 * g) + (spd < 0.1 ? Math.max(0, Math.sin(ph * 0.3)) * 0.6 : 0), 0, 0, col);
  const sw = (gal ? 0.75 : 0.42) * g;
  const legs = [[0.16, 0.6, sn], [-0.16, 0.6, -sn], [0.16, -0.6, -sn], [-0.16, -0.6, sn]];
  for (const [lx, lz, p] of legs) IP.horseLeg.put(x, y + bob, z, yaw, s, lx, 0.86, lz, p * sw, 0, 0, col);
  IP.horseTail.put(x, y + bob, z, yaw, s, 0, 1.3, -0.78, Math.sin(ph * 0.7) * 0.15, Math.sin(ph * 0.5) * 0.2, 0, shadeHex(col, 0.55));
}
function drawOx(x, y, z, yaw, col, spd, ph) {
  const sn = Math.sin(ph), sw = Math.min(1, spd / 1) * 0.35;
  IP.oxBody.put(x, y, z, yaw, 1, 0, 0, 0, 0, 0, 0, col);
  IP.oxHead.put(x, y, z, yaw, 1, 0, 1.12, 0.92, (spd < 0.1 ? Math.max(0, Math.sin(ph * 0.25)) * 0.5 : 0) + 0.1, 0, 0, col);
  for (const [lx, lz, p] of [[0.22, 0.6, sn], [-0.22, 0.6, -sn], [0.22, -0.65, -sn], [-0.22, -0.65, sn]]) IP.oxLeg.put(x, y, z, yaw, 1, lx, 0.66, lz, p * sw, 0, 0, col);
}
function drawCart(a, lod, torches) {
  const { x, y, z, yaw } = a, c = Math.cos(yaw), s = Math.sin(yaw);
  IP.cartBed.put(x, y, z, yaw, 1, 0, 0, 0, 0, 0, 0, 0xffffff);
  const spin = (a.t || 0) / 0.55;
  for (const sd of [-1, 1]) IP.wheelSolid.put(x, y, z, yaw, 1, sd * 0.76, 0.55, 0, spin, 0, 0, 0xffffff);
  if (a.load) IP[a.load].put(x, y, z, yaw, 1, 0, 0, 0, 0, 0, 0, 0xffffff);
  if (a.team === 'none') return;
  const at = (lx, lz) => [x + c * lx + s * lz, z - s * lx + c * lz];
  if (a.team === 'ox') for (const sd of [-1, 1]) { const [ox, oz] = at(sd * 0.5, 3.4); drawOx(ox, y, oz, yaw, a.teamCol, a.spd, a.ph + sd); }
  else { const [mx, mz] = at(0, 3.2); drawHorse(mx, y, mz, yaw, a.teamCol, a.spd, a.ph, true, false, 0.85); }
  if (a.look) { const [dx, dz] = at(-1.25, 3.9); drawHuman(a, dx, y, dz, yaw, a.look, 'lead', a.spd, a.ph * 0.9, lod, torches); }
}
function drawRaeda(a, lod) {
  const { x, y, z, yaw } = a, c = Math.cos(yaw), s = Math.sin(yaw);
  IP.raeda.put(x, y, z, yaw, 1, 0, 0, 0, 0, 0, 0, a.hood);
  const spin = (a.t || 0) / 0.55;
  for (const sd of [-1, 1]) for (const fz of [-1.1, 1.1]) IP.wheelSpoke.put(x, y, z, yaw, 1, sd * 0.78, 0.55, fz, spin, 0, 0, 0xffffff);
  const at = (lx, lz) => [x + c * lx + s * lz, z - s * lx + c * lz];
  for (const sd of [-1, 1]) { const [hx, hz] = at(sd * 0.45, 3.4); drawHorse(hx, y, hz, yaw, a.teamCol, a.spd, a.ph + sd * 0.5, true, false, 0.85); }
  if (a.look) drawHuman(a, x + s * 1.3, y + 1.3, z + c * 1.3, yaw, a.look, 'sit', 0, a.ph, lod, false);
}
function drawLitter(a, lod) {
  const { x, y, z, yaw } = a, c = Math.cos(yaw), s = Math.sin(yaw);
  IP.litter.put(x, y + 1.1 + Math.abs(Math.sin(a.ph)) * 0.03, z, yaw, 1, 0, 0, 0, 0, 0, 0, a.cur);
  const at = (lx, lz) => [x + c * lx + s * lz, z - s * lx + c * lz];
  const pos = [[0.52, 1.75], [-0.52, 1.75], [0.52, -1.75], [-0.52, -1.75]];
  for (let i = 0; i < 4; i++) {
    const [bx, bz] = at(pos[i][0], pos[i][1]);
    const L = a.bearers[i];
    drawHuman(null, bx, y, bz, yaw, L, 'walk', a.spd, a.ph + (i % 2) * 3.14, lod, false);
  }
}
