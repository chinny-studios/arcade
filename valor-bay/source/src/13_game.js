// Valor Bay — the rules of the sandbox: a director that keeps crimes breaking out around the hero (muggings, store
// robberies that turn into getaways, gang wars, armored-truck heists) and sends a supervillain now and then; the
// crime-wave meter that rises while crimes go unanswered and falls as you stop them; score, combo and hero ranks;
// starting a patrol and switching heroes

const CRIME = { list: [], next: 4, villainT: 150, seq: 0, villainIdx: 0 };

function addScore(pts, at) {
  const mul = comboMul();
  const n = Math.round(pts * mul);
  G.score += n;
  if (at && P) HUD.floatScore(at, n, mul);
  if (G.score > (SAVE.best[G.heroId] || 0)) SAVE.best[G.heroId] = G.score;
}
const comboMul = () => 1 + Math.floor(Math.min(G.combo, 60) / 10) * 0.5;
function comboHit(n = 1) { G.combo += n; G.comboT = 3; if (G.combo > G.bestCombo) G.bestCombo = G.combo; }
function updateRules(dt) {
  G.t += dt;
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  if (OPTS.time === 'cycle') G.tod = (G.tod + dt * 24 / 960) % 24;
  director(dt);
}
function threatName(w) { return w < 25 ? 'Calm' : w < 50 ? 'Restless' : w < 75 ? 'Crime wave' : 'Chaos'; }

// ---------- the director ----------
function director(dt) {
  if (!P) return;
  CRIME.next -= dt; CRIME.villainT -= dt;
  const active = CRIME.list.filter((c) => c.state === 'active');
  // unanswered crimes stir the city up
  G.wave = clamp(G.wave + dt * (0.04 + active.filter((c) => !c.engaged).length * 0.05), 0, 100);
  const cap = 2 + Math.floor(G.wave / 25);
  if (CRIME.next <= 0 && active.length < cap) {
    CRIME.next = lerp(26, 9, G.wave / 100) * rr(0.8, 1.2);
    startCrime(pickCrime());
  }
  if ((CRIME.villainT <= 0 || G.wave >= 80) && !active.some((c) => c.type === 'villain') && !FOES.list.some((f) => f.boss && !f.ko)) {
    CRIME.villainT = rr(200, 280);
    startCrime('villain');
  }
  for (const c of CRIME.list) if (c.state === 'active') updateCrime(c, dt);
  for (let i = CRIME.list.length - 1; i >= 0; i--) if (CRIME.list[i].state !== 'active' && G.t - CRIME.list[i].endT > 3) CRIME.list.splice(i, 1);
}
function pickCrime() {
  const tot = Object.values(CRIMES).reduce((a, c) => a + c.w, 0);
  let r = Math.random() * tot;
  for (const [k, c] of Object.entries(CRIMES)) { r -= c.w; if (r <= 0) return k; }
  return 'mugging';
}
function crimeSpot(r0 = 70, r1 = 240) {
  for (let k = 0; k < 30; k++) { const s = sidewalkSpot(P.x, P.z, r0, r1); if (!CRIME.list.some((c) => c.state === 'active' && dist(c.x, c.z, s.x, s.z) < 50)) return s; }
  return sidewalkSpot(P.x, P.z, r0, r1);
}
const gangPick = () => pick(Object.keys(GANGS));
function startCrime(type, at) {
  const c = { id: ++CRIME.seq, type, state: 'active', t: 0, foes: [], alerted: false, engaged: false, x: 0, z: 0, name: type === 'villain' ? 'Supervillain' : CRIMES[type].name };
  let s;
  switch (type) {
    case 'mugging': {
      s = at || crimeSpot(55, 200);
      c.x = s.x; c.z = s.z;
      const v = PEOPLE.list.reduce((a, b) => (dist2(b.x, b.z, P.x, P.z) > dist2(a.x, a.z, P.x, P.z) && b.state !== 'victim' ? b : a), PEOPLE.list[0]);
      v.x = s.x; v.z = s.z; v.y = 0; v.air = false; v.lie = 0; v.state = 'victim'; v.victim = c; v.t = 0; c.victim = v;
      const g = gangPick(), n = chance(0.5) ? 2 : 1;
      for (let i = 0; i < n; i++) { const a = rr(0, TAU); const f = spawnFoe(i === 0 && chance(0.5) ? 'gunman' : pick(['thug', 'punk']), g, s.x + Math.cos(a) * 1.6, s.z + Math.sin(a) * 1.6, { crime: c }); f.yaw = yawOf(s.x - f.x, s.z - f.z); c.foes.push(f); }
      c.life = 80;
      break;
    }
    case 'robbery': {
      const shops = CITY.shops.filter((sh) => { const d = dist(sh.x, sh.z, P.x, P.z); return d > 60 && d < 240; });
      const sh = pick(shops.length ? shops : CITY.shops);
      c.x = sh.x; c.z = sh.z; c.shop = sh;
      const g = gangPick(), n = rr(3, 5) | 0;
      const ox = -fwdX(sh.yaw), oz = -fwdZ(sh.yaw);
      for (let i = 0; i < n; i++) {
        const side = (i - (n - 1) / 2) * 1.8;
        const f = spawnFoe(i < 2 ? 'gunman' : pick(['thug', 'punk', 'thug']), g, sh.x + ox * rr(1.5, 3) + Math.cos(sh.yaw) * side, sh.z + oz * rr(1.5, 3) - Math.sin(sh.yaw) * side, { crime: c });
        f.yaw = sh.yaw + Math.PI; f.anchorYaw = f.yaw; c.foes.push(f);
      }
      alarm(sh.x, sh.z, 18);
      c.life = 60; c.toGetaway = true;
      AUDIO.sfx('alarmBell', sh.x, sh.z);
      break;
    }
    case 'getaway': {
      const car = getawayCar();
      if (!car) return null;
      c.car = car; car.crew = c; c.x = car.x; c.z = car.z; c.life = 100; c.crew = 3;
      break;
    }
    case 'gangwar': {
      s = at || crimeSpot(70, 240);
      c.x = s.x; c.z = s.z;
      const g1 = gangPick(); let g2 = gangPick(); while (g2 === g1) g2 = gangPick();
      for (const [g, side] of [[g1, -1], [g2, 1]]) for (let i = 0; i < 3 + (chance(0.5) ? 1 : 0); i++) {
        const f = spawnFoe(i === 0 && chance(0.4) ? 'brute' : pick(['thug', 'punk', 'thug']), g, s.x + side * rr(2, 5), s.z + rr(-4, 4), { crime: c });
        c.foes.push(f);
      }
      alarm(s.x, s.z, 25);
      c.life = 120;
      break;
    }
    case 'heist': {
      const car = getawayCar('armored');
      if (!car) return null;
      car.state = 'parked'; car.speed = 0; car.crew = null; car.heist = c;
      c.x = car.x; c.z = car.z; c.truck = car;
      const g = gangPick(), fx = fwdX(car.yaw), fz = fwdZ(car.yaw), rx = -fz, rz = fx;
      const types = ['brute', 'gunman', 'gunman', 'thug', 'thug', 'punk'];
      for (let i = 0; i < 5 + (chance(0.5) ? 1 : 0); i++) {
        const back = -car.l / 2 - 1.5 - (i % 3) * 1.6, side = (i < 3 ? -1 : 1) * rr(1.5, 3.5);
        const f = spawnFoe(types[i], g, car.x + fx * back + rx * side, car.z + fz * back + rz * side, { crime: c });
        c.foes.push(f);
      }
      alarm(c.x, c.z, 30);
      c.life = 110;
      AUDIO.sfx('alarmBell', c.x, c.z);
      break;
    }
    case 'villain': {
      const id = VILLAIN_ORDER[CRIME.villainIdx++ % VILLAIN_ORDER.length];
      s = at || crimeSpot(110, 260);
      c.x = s.x; c.z = s.z; c.villain = id;
      const V = VILLAINS[id];
      c.name = V.name; c.boss = spawnBoss(id, s.x, s.z, c); c.foes.push(c.boss);
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; c.foes.push(spawnFoe(pick(['thug', 'gunman', 'punk']), V.crew, s.x + Math.cos(a) * 5, s.z + Math.sin(a) * 5, { crime: c })); }
      alarm(s.x, s.z, 40);
      c.life = 1e9;
      HUD.villain(c);
      AUDIO.sfx('villain', P.x, P.z);
      break;
    }
  }
  c.district = districtOf(c.x, c.z);
  CRIME.list.push(c);
  if (type !== 'villain') HUD.toast(`${CRIMES[type].desc} in ${c.district}!`, 'crime');
  bus.emit('crime', c);
  return c;
}
// a car from the pool for a getaway (or the armored truck), on a road away from the hero
function getawayCar(type = 'getaway') {
  let car = CARS.list.find((o) => o.type === type && o.state === 'gone');
  if (!car) { car = makeCar(type); CARS.list.push(car); }
  if (!placeCar(car, P.x, P.z, 90, 220)) return null;
  car.state = type === 'getaway' ? 'getaway' : 'parked'; car.speed = type === 'getaway' ? 20 : 0;
  return car;
}
function updateCrime(c, dt) {
  c.t += dt;
  const d = P ? dist(c.x, c.z, P.x, P.z) : 999;
  if (d < 45 || c.alerted) c.engaged = true;
  if (c.car) { c.x = c.car.x; c.z = c.car.z; }
  else { const live = c.foes.filter((f) => !f.dead && !f.ko); if (live.length) { c.x = live.reduce((a, f) => a + f.x, 0) / live.length; c.z = live.reduce((a, f) => a + f.z, 0) / live.length; } }
  // a robbery nobody stopped piles into a getaway car
  if (c.type === 'robbery' && c.toGetaway && !c.alerted && c.t > c.life) {
    for (const f of c.foes) if (!f.dead) removeFoe(f);
    c.foes = [];
    const car = getawayCar();
    if (car) { placeNear(car, c.shop.x, c.shop.z); c.type = 'getaway'; c.car = car; car.crew = c; c.crew = 3; c.life = c.t + 90; c.name = CRIMES.getaway.name; HUD.toast(`The robbers are getting away in ${c.district}!`, 'crime'); }
    else endCrime(c, false);
    return;
  }
  if (c.type === 'getaway') {
    if (!c.bailed && (c.car.state === 'gone' || (c.t > c.life && (d > 80 || c.t > c.life + 30)))) { c.car.crew = null; if (c.car.state === 'getaway') c.car.state = 'drive'; endCrime(c, false, 'The getaway car escaped!'); return; }
    if (c.bailed && c.foes.every((f) => f.dead || f.ko)) endCrime(c, true);
    return;
  }
  if (c.foes.length && c.foes.every((f) => f.dead || f.ko)) { endCrime(c, true); return; }
  // nobody came: the crooks slip away
  if (!c.engaged && c.t > c.life) {
    for (const f of c.foes) if (!f.dead) removeFoe(f);
    if (c.victim) { c.victim.state = 'walk'; c.victim.to = null; c.victim.victim = null; }
    endCrime(c, false, `${CRIMES[c.type] ? CRIMES[c.type].name : c.name} in ${c.district}: they got away.`);
  }
}
function placeNear(car, x, z) {
  const n = nearestNode(CITY.nodes, x, z), m = pick(n.nb);
  car.from = n; car.to = m; car.leg = straightLeg(car, n, m, 0.3);
  const p = legPos(car.leg, 0); car.x = p[0]; car.z = p[1]; car.yaw = yawOf(m.x - n.x, m.z - n.z);
}
// the getaway car is stopped: the crew bails out and fights
bus.on('getawayStopped', (car) => {
  const c = car.crew; if (!c || c.bailed) return;
  c.bailed = true; car.crew = null;
  if (car.state === 'getaway') { car.state = 'wreck'; car.t = 0; car.smoke = 1; car.speed = 0; }
  const g = gangPick();
  for (let i = 0; i < c.crew; i++) {
    const a = rr(0, TAU), x = car.x + Math.cos(a) * 2.5, z = car.z + Math.sin(a) * 2.5;
    const f = spawnFoe(pick(['thug', 'gunman', 'punk']), g, x, z, { crime: c }); f.aggro = true; f.y = supportY(x, z, car.y + 2); c.foes.push(f);
  }
  c.alerted = true;
  pow(car.x, car.y + 3, car.z, 'SCREEECH!', { size: 50 });
  HUD.toast('Getaway car stopped! Round up the crew.', 'good');
});
function endCrime(c, won, msg) {
  c.state = won ? 'done' : 'failed'; c.endT = G.t;
  if (c.truck) c.truck.heist = null;
  if (won) {
    const base = c.type === 'villain' ? 0 : CRIMES[c.type].pts;
    if (base) addScore(base, { x: c.x, y: 3, z: c.z, h: 1 });
    G.saves++;
    G.wave = Math.max(0, G.wave - (c.type === 'villain' ? 35 : c.type === 'gangwar' || c.type === 'heist' ? 14 : 9));
    c.done = true;
    HUD.toast(c.type === 'villain' ? `${c.name} is going to Stonegate!` : `${CRIMES[c.type].name} stopped!`, 'good');
    AUDIO.sfx('win', P ? P.x : 0, P ? P.z : 0);
    AUDIO.sfx('siren', c.x, c.z);
    writeSave();
  } else {
    G.wave = Math.min(100, G.wave + 6);
    if (msg) HUD.toast(msg, 'bad');
  }
}
bus.on('bossDown', (f) => { if (f.crime) { for (const o of f.crime.foes) if (!o.ko && !o.dead && !o.boss) o.aggro = true; } });

// ---------- starting, switching, quitting ----------
function startPatrol(id, o = {}) {
  const at = o.at || (P ? { x: P.x, y: P.y, z: P.z, yaw: P.yaw } : null);
  if (P) { endPatrol(); despawnHero(); }
  G.heroId = id; SAVE.hero = id;
  G.score = 0; G.combo = 0; G.comboT = 0; G.bestCombo = 0; G.arrests = 0; G.saves = 0; G.bosses = 0; G.t = 0; G.speedForce = 0; G.rampage = false; G.slow = 0;
  if (!o.keepCity) { for (const f of FOES.list.slice()) removeFoe(f); CRIME.list.length = 0; G.wave = 20; CRIME.next = 3; CRIME.villainT = o.villainSoon ? 40 : 150; }
  const pl = CITY.landmarks.find((l) => l.name === 'Heroes Plaza');
  const s = at || { x: pl.x + 6, z: pl.z - 14, yaw: 0 };
  spawnHero(id, s.x, s.z, at ? at.y : undefined);
  P.yaw = s.yaw || 0; CAM.yaw = P.yaw; CAM.pitch = 0.2; CAM.snap = true;
  if (OPTS.time !== 'cycle') G.tod = { day: 11, sunset: 18.3, night: 22.5 }[OPTS.time] || G.tod;
  document.body.dataset.state = 'play';
  $('#title').hidden = true; $('#select').hidden = true;
  HUD.reset();
  if (!o.quiet) { HUD.banner(HEROES[id].name.toUpperCase(), HEROES[id].color, HEROES[id].tag); if (OPTS.tips) HUD.heroTips(id); }
  AUDIO.music(true);
  writeSave();
}
function endPatrol() {
  if (!P) return;
  if (G.score > (SAVE.best[G.heroId] || 0)) SAVE.best[G.heroId] = G.score;
  writeSave();
}
