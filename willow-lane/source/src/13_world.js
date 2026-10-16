// Willow Lane — the world around the household: careers & carpools, school bus, visitors and walk-bys,
// bills and the repo man, pizza delivery, the adoption agency, fires, accidents and the daily clock.

const STREET_Z = LOT_D + 3.7, CURB_Z = LOT_D + 1.5;
const VEH = [];

// ---------- vehicles ----------
function spawnVehicle(kind, color, purpose) {
  const model = buildCar(color, kind);
  const slot = VEH.filter((v) => v.state !== 'leave' && v.purpose.type !== 'pass').length;
  const stopX = frontDoorTile()[0] + 0.5 - 3 + slot * 6;
  const v = { kind, model, x: -70, z: STREET_Z, stopX, state: 'arrive', purpose, t: 0, riders: [] };
  model.position.set(v.x, 0, v.z); model.rotation.y = Math.PI / 2;
  R.scene.add(model);
  VEH.push(v);
  return v;
}
function tickVehicles(dt) { // dt in game minutes; cars move in sim time too
  for (const v of VEH) {
    if (v.state === 'arrive') {
      const d = v.stopX - v.x, sp = Math.min(14, Math.max(2, d * 1.5));
      v.x += Math.min(d, sp * dt);
      if (d < 0.05) { v.state = 'wait'; v.t = 0; sfx(v.kind === 'bus' ? 'busHorn' : 'honk'); if (v.onArrive) v.onArrive(v); }
    } else if (v.state === 'wait') {
      v.t += dt;
      if (v.leaveAt != null && G.t >= v.leaveAt) v.state = 'leave';
      if (v.leaveAfter != null && v.t >= v.leaveAfter) v.state = 'leave';
    } else if (v.state === 'leave') {
      if (v.purpose.type !== 'pass') v.speed = Math.min(16, (v.speed || 0) + dt * 12);
      v.x += v.speed * dt * (v.dir || 1);
      if (v.x > 110 || v.x < -80) { R.scene.remove(v.model); v.dead = true; if (v.onGone) v.onGone(v); }
    }
    v.model.position.x = v.x;
  }
  for (let i = VEH.length - 1; i >= 0; i--) if (VEH[i].dead) VEH.splice(i, 1);
}
// traffic that just drives past
function tickTraffic() {
  if (chance(hourIn(hourF(), 7, 20) ? 1 / 18 : 1 / 70)) {
    const v = spawnVehicle(chance(0.15) ? 'van' : 'car', rpick([0xc83a3a, 0x3a6ac8, 0xe8e4dc, 0x2a2a2e, 0x5aa850, 0xe8c840, 0x8a8a8a]), { type: 'pass' });
    v.state = 'leave'; v.speed = rrange(8, 13); v.z = STREET_Z + (chance(0.5) && !VEH.some((x) => x.purpose.type !== 'pass' && !x.dead) ? 0 : 3.2);
    if (v.z > STREET_Z + 1) { v.x = 110; v.dir = -1; v.model.rotation.y = -Math.PI / 2; } else v.dir = 1;
    v.model.position.set(v.x, 0, v.z);
  }
}
function clearVehicles() { for (const v of VEH) R.scene.remove(v.model); VEH.length = 0; }

// The tile outside the front door (closest to the street), or the lot's front edge
function frontDoorTile() {
  let best = null, bz = -1;
  for (const [k, w] of LOT.walls) {
    if (!w.open || w.open.type !== 'door') continue;
    const [o, xs, zs] = k.split(':'); const x = +xs, z = +zs;
    const sides = o === 'h' ? [[x, z - 1], [x, z]] : [[x - 1, z], [x, z]];
    const [a, b] = sides;
    const ra = inLot(a[0], a[1]) ? LOT.room[tidx(a[0], a[1])] : 0, rb = inLot(b[0], b[1]) ? LOT.room[tidx(b[0], b[1])] : 0;
    if ((ra === 0) === (rb === 0)) continue;
    const out = ra === 0 ? a : b;
    if (out[1] > bz && NAV.walk(out[0], out[1])) { bz = out[1]; best = out; }
  }
  return best || [Math.floor(LOT_W / 2), LOT_D - 1];
}

// ---------- careers & school ----------
function meetsReq(s, job, level) {
  const L = CAREER[job.track].levels[level]; if (!L) return false;
  for (const k in L[4]) if (skillLv(s, k) < L[4][k]) return false;
  return friendCount(s) >= L[5];
}
function takeJob(s, track) {
  s.job = { track, level: 0, perf: 0, missed: 0 };
  const L = careerLevel(s.job);
  bus.emit('did', s, 'job', { track });
  notify(`${s.first} joined the ${CAREER[track].label} career as a ${L.title}. Work is ${L.start}:00–${(L.start + L.hours) % 24}:00 on weekdays, ${fmtMoney(L.pay)} a day.`, CAREER[track].icon, s, true);
  bus.emit('household');
}
function quitJob(s) { if (!s.job) return; notify(`${s.first} quit ${their(s)} job.`, '🚪', s); s.job = null; bus.emit('household'); }
function workToday(s) { return s.job && !isWeekend(); }

function checkSchedules() {
  const h = hourF();
  for (const s of household()) {
    if (s.away || !s.onLot || s.dying) continue;
    // carpool: arrives an hour before the shift
    if (s.job && !isWeekend()) {
      const L = careerLevel(s.job);
      const start = Math.floor(G.t / 1440) * 1440 + L.start * 60;
      const keyDay = dayNum();
      if (G.t >= start - 60 && G.t < start && s.job.carDay !== keyDay) {
        s.job.carDay = keyDay;
        const v = spawnVehicle('car', CAREER[s.job.track].car, { type: 'work', sim: s.id });
        v.leaveAt = start;
        v.onGone = () => { if (!v.riders.length && s.job && !s.away && s.alive) missedWork(s); };
        notify(`The carpool is here for ${s.first}.`, '🚗', s);
        if (!s.sleeping || s.needs.energy > 25) { cancelAll(s, false); queueAct(s, 'goToWork', v, null, false, true); }
        else thought(s, '😴', 4, 'Too tired to wake up for work!');
      }
    }
    // school bus at 7, back at 15
    if (s.school && !isWeekend() && s.age !== 'baby') {
      const busT = Math.floor(G.t / 1440) * 1440 + SCHOOL.bus * 60;
      if (G.t >= busT && G.t < busT + 60 && s.school.busDay !== dayNum()) {
        let v = VEH.find((x) => x.kind === 'bus' && x.state !== 'leave');
        if (!v) { v = spawnVehicle('bus', 0xf0c020, { type: 'school' }); v.leaveAt = busT + 60; v.onGone = () => { for (const k of household()) if (k.school && k.school.busDay === dayNum() && !v.riders.includes(k.id) && !k.away) missedSchool(k); }; notify('The school bus is here!', '🚌'); }
        s.school.busDay = dayNum();
        cancelAll(s, false); queueAct(s, 'goToWork', v, null, false, true);
      }
    }
  }
}
IX.goToWork = {
  label: (s, v) => (v && v.kind === 'bus' ? 'Catch the school bus' : 'Go to work'), icon: '💼', keep: true, force: true,
  run: function* (s, v, act) {
    act.icon = v.kind === 'bus' ? '🚌' : '💼';
    if (s.sleeping || s.seat) yield* getUp(s);
    // head for the kerb while the car pulls up
    const tz = Math.floor(CURB_Z);
    let goals = () => { const tx = Math.floor(v.state === 'arrive' ? v.stopX : v.x); const g = []; for (let dx = -2; dx <= 2; dx++) g.push([tx + dx, tz]); return g; };
    const i0 = yield* walkTo(s, act, goals());
    while (v.state === 'arrive' && !act.cancel) yield;
    const i = yield* walkTo(s, act, goals());
    if (i < 0 || act.cancel || v.state === 'leave' || v.dead) return;
    yield* turnTo(s, angleTo(s, v.x, v.z));
    // hop in
    v.riders.push(s.id);
    const mood = calcMood(s);
    if (v.kind === 'bus') { s.away = { kind: 'school', until: Math.floor(G.t / 1440) * 1440 + (SCHOOL.start + SCHOOL.hours) * 60, mood, homework: s.school.homework }; }
    else { const L = careerLevel(s.job); const start = Math.floor(G.t / 1440) * 1440 + L.start * 60; s.away = { kind: 'work', until: start + L.hours * 60, mood }; }
    s.onLot = false; s.model.visible = false;
    if (G.selected === s) { const o = household().find((h) => h.onLot && !h.away && h.age !== 'baby'); if (o) selectSim(o); }
    // the carpool leaves once its rider is in; the bus waits for every child it came for
    if (v.kind !== 'bus') v.leaveAfter = v.t + 1;
    else if (household().every((k) => !k.school || k.school.busDay !== dayNum() || k.away)) v.leaveAfter = v.t + 1;
    bus.emit('household');
  },
};
function missedWork(s) {
  if (!s.job) return;
  s.job.perf -= 20; s.job.missed++;
  if (s.job.missed >= 3) { notify(`${s.first} missed work three days running and was fired.`, '📉', s, true); addMoodlet(s, 'fired'); s.job = null; }
  else notify(`${s.first} missed the carpool! ${their(s)[0].toUpperCase() + their(s).slice(1)} boss is not pleased.`, '📉', s);
  bus.emit('household');
}
function missedSchool(s) { if (!s.school) return; s.school.perf -= 2; s.school.grade = Math.max(0, s.school.grade - 1); notify(`${s.first} missed the school bus. That won’t help the report card.`, '📉', s); }

// bring sims home by car or bus a few minutes before their shift or school day ends
function tickReturns() {
  for (const s of household()) {
    const a = s.away; if (!a || a.car) continue;
    if (G.t < a.until - 6) continue;
    if (a.kind === 'school') {
      const kids = household().filter((k) => k.away && k.away.kind === 'school' && !k.away.car);
      const v = spawnVehicle('bus', 0xf0c020, { type: 'drop' });
      for (const k of kids) k.away.car = v;
      v.onArrive = () => { for (const k of kids) if (k.away) returnHome(k); v.leaveAfter = v.t + 1; };
    } else {
      const v = spawnVehicle('car', s.job ? CAREER[s.job.track].car : 0x8a8a8a, { type: 'drop' });
      a.car = v;
      v.onArrive = () => { if (s.away) returnHome(s); v.leaveAfter = v.t + 1; };
    }
  }
}
function returnHome(s) {
  const a = s.away; s.away = null;
  const [dx] = frontDoorTile();
  s.x = clamp(dx + rrange(-2, 2), 0, LOT_W - 1) + 0.5; s.z = CURB_Z; s.dir = Math.PI; s.onLot = true; s.posture = 'stand'; s.anim = 'idle';
  s.model.visible = true;
  if (a.kind === 'work' && s.job) {
    const L = careerLevel(s.job);
    s.job.missed = 0;
    s.job.perf = clamp(s.job.perf + a.mood / 5 + (meetsReq(s, s.job, s.job.level + 1) ? 12 : 0) + rrange(-3, 5), -100, 100);
    earn(L.pay, s);
    addNeeds(s, { social: 15 }, 60);
    if (a.mood > 40) addMoodlet(s, 'bestDay'); else if (a.mood < -20) addMoodlet(s, 'badDay');
    const nextL = CAREER[s.job.track].levels[s.job.level + 1];
    if (nextL && s.job.perf >= 45 && meetsReq(s, s.job, s.job.level + 1)) {
      s.job.level++; s.job.perf = 10; G.stats.promotions++;
      const NL = careerLevel(s.job);
      notify(`${s.first} was promoted to ${NL.title}! The pay is now ${fmtMoney(NL.pay)} a day, ${NL.start}:00–${(NL.start + NL.hours) % 24}:00.`, '🎉', s, true);
      addMoodlet(s, 'promoted'); sfx('fanfare'); confetti(s.x, 2, s.z); bus.emit('did', s, 'promoted', {});
    } else if (s.job.perf <= -80) {
      notify(`${s.first} was fired for poor performance.`, '📉', s, true); addMoodlet(s, 'fired'); s.job = null;
    } else floatText(s, '+' + fmtMoney(L.pay), '#8af0a0');
  } else if (a.kind === 'school' && s.school) {
    const before = s.school.grade;
    const delta = (a.mood > 30 ? 1 : a.mood < -20 ? -1 : 0) + (a.homework ? -1 : 0) + (s.school.perf > 0 ? 1 : 0) - (chance(0.25) ? 1 : 0);
    s.school.perf = 0;
    s.school.grade = clamp(s.school.grade + delta, 0, 12);
    s.school.homework = true;
    bus.emit('did', s, 'grade', { grade: s.school.grade });
    if (s.school.grade !== before) notify(`${s.first}’s grade went ${s.school.grade > before ? 'up' : 'down'} to ${GRADES[s.school.grade]}.`, s.school.grade > before ? '📈' : '📉', s);
    if (s.school.grade >= 11 && before < 11) { addMoodlet(s, 'goodGrades'); earn(100, s); notify(`${s.first}’s grandparents sent ${fmtMoney(100)} for the A on the report card.`, '💌', s); }
    addNeeds(s, { social: 15 }, 60);
  }
  bus.emit('household');
}

// ---------- visitors ----------
function spawnAtEdge(s) {
  const left = chance(0.5);
  s.x = left ? NX0 + 0.5 : NX0 + NW - 0.5; s.z = LOT_D + 0.5 + (chance(0.5) ? 1 : 0); s.dir = left ? Math.PI / 2 : -Math.PI / 2;
  s.onLot = true; s.away = null; s.leaving = false; s.posture = 'stand'; s.anim = 'idle'; s.queue = []; s.cur = null;
  for (const n of NEEDS) s.needs[n.id] = Math.max(s.needs[n.id], rrange(55, 90));
  if (!s.model) makeSimModel(s); else s.model.visible = true;
}
function scheduleVisit(p, t, host, party) { G.flags.visits = G.flags.visits || []; G.flags.visits.push({ id: p.id, t, host: host ? host.id : 0, invited: true, party: !!party }); }
function startVisit(p, kind, invited, party) {
  if (p.onLot || !p.alive || p.household) return;
  spawnAtEdge(p);
  p.visit = { state: kind === 'pass' ? 'passing' : 'coming', since: G.t, until: party && G.flags.party ? G.flags.party.until : G.t + rint(150, 300), invited, party };
  if (kind === 'pass') queueAct(p, 'walkBy', null, null, false);
  else queueAct(p, 'visitDoor', null, null, false);
}
IX.walkBy = { label: 'Walking by', icon: '🚶', keep: true, run: function* (s, _, act) {
  const toLeft = s.x > LOT_W / 2;
  const endX = toLeft ? NX0 : NX0 + NW - 1;
  const z = Math.floor(s.z);
  // stroll along the sidewalk, stop to wave at anyone outside
  let waved = false;
  const pts = [[Math.floor(LOT_W / 2) + rint(-4, 4), z], [endX, z]];
  for (const [x, zz] of pts) {
    const i = yield* walkTo(s, act, [[x, zz]], { quiet: true });
    if (!waved) {
      waved = true;
      const near = household().find((h) => h.onLot && !h.away && roomAt(h.x, h.z) === 0 && Math.hypot(h.x - s.x, h.z - s.z) < 9 && h.age !== 'baby');
      if (near) { yield* faceSim(s, near); yield* wait(s, act, 4, 'wave'); babble(s, 0.3); yield* wait(s, act, 8, 'idle'); }
    }
    if (s.visit && s.visit.state === 'in') return; // invited in while passing
  }
  despawn(s);
} };
IX.visitDoor = { label: 'Visiting', icon: '🚪', keep: true, run: function* (s, _, act) {
  const [dx, dz] = frontDoorTile();
  const i = yield* walkTo(s, act, [[dx, dz], [dx - 1, dz], [dx + 1, dz], [dx, dz + 1]], { quiet: true });
  if (s.visit.invited) { s.visit.state = 'in'; s.visit.since = G.t; return; }
  s.visit.state = 'door';
  sfx('doorbell');
  notify(`${fullName(s)} is at the door. Click ${them(s)} to greet ${them(s)}.`, '🚪', s);
  let t = 0;
  while (s.visit && s.visit.state === 'door' && t < 60) { const dt = yield; t += dt; s.anim = 'idle'; if (Math.floor(t) % 20 === 0 && Math.floor(t - dt) % 20 !== 0) sfx('doorbell'); }
  if (s.visit && s.visit.state === 'door') { s.visit.until = G.t; thought(s, '😒', 2); }
} };
IX.leaveLot = { label: 'Going home', icon: '🏠', keep: true, force: true, run: function* (s, _, act) {
  s.leaving = true;
  if (s.seat) yield* getUp(s);
  const left = s.x < LOT_W / 2;
  const x = left ? NX0 : NX0 + NW - 1;
  yield* walkTo(s, act, [[x, LOT_D], [x, LOT_D + 1]], { quiet: true });
  despawn(s);
} };
function despawn(s) {
  hardStop(s);
  s.onLot = false; s.visit = null; s.leaving = false;
  if (s.model) s.model.visible = false;
  if (s.service) { R.scene.remove(s.model); s.model = null; s.alive = false; G.sims = G.sims.filter((x) => x !== s); }
}
function tickVisitors() {
  const h = hourF();
  // scheduled visits (invites)
  if (G.flags.visits) for (const v of G.flags.visits.slice()) if (G.t >= v.t) { G.flags.visits = G.flags.visits.filter((x) => x !== v); const p = simById(v.id); if (p) startVisit(p, 'visit', v.invited, v.party); }
  // walk-bys and drop-ins during the day
  if (hourIn(h, 8, 20) && chance(1 / 110)) {
    const free = G.sims.filter((p) => p.alive && !p.household && !p.service && !p.onLot);
    if (free.length && G.sims.filter((p) => p.onLot && !p.household).length < 5) {
      const p = rpick(free);
      const friend = household().some((hh) => relGet(hh, p).f >= 40);
      startVisit(p, friend && chance(0.35) && hourIn(h, 10, 19) ? 'visit' : 'pass', false);
    }
  }
  // the welcome wagon on the first afternoon
  if (!G.flags.welcomed && dayNum() === 1 && h >= 15) {
    G.flags.welcomed = true;
    const ns = G.sims.filter((p) => !p.household && !p.service && p.alive && isGrown(p)).slice(0, 3);
    ns.forEach((p, i) => scheduleVisit(p, G.t + i * 4, null));
    if (G.flags.visits) for (const v of G.flags.visits) if (ns.some((n) => n.id === v.id)) v.invited = false;
  }
  for (const s of G.sims) {
    if (!s.onLot || s.household || !s.visit) continue;
    if (s.visit.state === 'in') {
      const late = (hourF() >= 23.5 || hourF() < 6) && !(s.visit.party && G.flags.party);
      if ((G.t >= s.visit.until || late || calcMood(s) < -45 || s.needs.energy < 12) && !s.leaving) {
        if (s.cur && s.cur.id === 'beSocial') continue;
        cancelAll(s, false); queueAct(s, 'leaveLot', null, null, false, true);
        if (late && s.visit) notify(`${s.first} went home for the night.`, '🌙', s);
      }
    } else if (s.visit.state === 'door' && G.t >= s.visit.until && !s.leaving) { cancelAll(s, false); queueAct(s, 'leaveLot', null, null, false, true); }
  }
}

// ---------- parties ----------
function tickParty() {
  const P = G.flags.party; if (!P || G.t < P.until) return;
  G.flags.party = null;
  const guests = G.sims.filter((s) => s.onLot && s.visit && s.visit.party);
  const mood = guests.length ? guests.reduce((a, s) => a + calcMood(s), 0) / guests.length : -50;
  const hit = guests.length >= 3 && mood > 20;
  for (const h of household()) if (h.onLot && h.age !== 'baby') { addMoodlet(h, hit ? 'greatParty' : 'lameParty'); bus.emit('did', h, 'party', { hit }); }
  for (const g of guests) { g.visit.until = G.t; g.visit.party = false; for (const h of household()) relAdd(g, h, hit ? 6 : -3); }
  notify(hit ? 'The party was a hit! Everyone had a great time.' : guests.length < 3 ? 'Hardly anyone came to the party…' : 'The party fizzled out. Better music next time?', hit ? '🎊' : '😬', simById(P.host), true);
}

// ---------- service visits: pizza, adoption, social worker, repo ----------
function serviceSim(kind, top, label) {
  const s = makeSim({ role: 'service', age: 'adult', first: label, last: '', household: false });
  s.service = kind; s.look.top = top; s.look.outfit = 'pants'; s.look.bottom = 0x2a2e38;
  makeSimModel(s);
  spawnAtEdge(s);
  s.visit = { state: 'coming', since: G.t, until: G.t + 90 };
  return s;
}
function tickServices() {
  if (G.flags.pizzaComing && G.t >= G.flags.pizzaComing) {
    G.flags.pizzaComing = 0;
    const s = serviceSim('pizza', 0xd83a2a, 'Pizza Delivery');
    queueAct(s, 'serviceDoor', null, null, false);
  }
  if (G.flags.adoptDay && G.t >= G.flags.adoptDay && hourIn(hourF(), 9, 19)) {
    G.flags.adoptDay = 0;
    const s = serviceSim('adopt', 0x5a6a8a, 'Adoption Agent');
    queueAct(s, 'serviceDoor', null, null, false);
  }
  // neglected babies
  for (const b of household()) {
    if (b.age !== 'baby') continue;
    if (b.needs.hunger < 3) b.neglect = (b.neglect || 0) + 1; else b.neglect = Math.max(0, (b.neglect || 0) - 0.5);
    if (b.neglect === 120) notify(`${b.first} is starving! Feed the baby or the social worker will come.`, '⚠️', b, true);
    if (b.neglect >= 300 && !G.flags.socialWorker) { G.flags.socialWorker = b.id; const s = serviceSim('social', 0x6a5a4a, 'Social Worker'); queueAct(s, 'serviceDoor', null, null, false); }
  }
  // repo man for bills unpaid five days
  const old = G.bills.filter((b) => !b.paid && G.t - b.t > 5 * 1440);
  if (old.length && !G.flags.repo && hourIn(hourF(), 9, 17)) { G.flags.repo = 1; const s = serviceSim('repo', 0x3a3a42, 'Repo Officer'); queueAct(s, 'serviceDoor', null, null, false); }
}
IX.serviceDoor = { label: 'Working', icon: '🧾', keep: true, run: function* (s, _, act) {
  const [dx, dz] = frontDoorTile();
  yield* walkTo(s, act, [[dx, dz], [dx - 1, dz], [dx + 1, dz], [dx, dz + 1]], { quiet: true });
  s.visit.state = 'door';
  if (s.service === 'pizza') {
    sfx('doorbell'); notify('The pizza is here! Click the delivery person to pay $40.', '🍕', s);
    let t = 0; while (!s.paid && t < 60) t += yield;
    if (!s.paid) notify('The pizza delivery left. No pizza tonight.', '🍕');
  } else if (s.service === 'adopt') {
    sfx('doorbell'); yield* wait(s, act, 6, 'talk');
    const by = simById(G.flags.adoptBy) || household().find(isGrown);
    const baby = makeBaby(by, partnerOf(by) && partnerOf(by).household ? partnerOf(by) : null, true);
    notify(`The agency brought ${baby.first} home. Welcome to the family!`, '🍼', baby, true);
    for (const p of household()) if (isGrown(p)) { addMoodlet(p, 'newBaby'); bus.emit('did', p, 'baby', { baby }); }
    bus.emit('household');
  } else if (s.service === 'social') {
    sfx('doorbell'); yield* wait(s, act, 8, 'talk');
    const b = simById(G.flags.socialWorker);
    if (b && b.alive && b.neglect >= 300) {
      b.alive = false; b.household = false; b.onLot = false; if (b.model) b.model.visible = false; b.crib = 0;
      for (const p of household()) if (isGrown(p)) addMoodlet(p, 'missedBaby');
      notify(`The social worker took ${b.first} away to a home where ${they(b)} will be looked after.`, '😢', null, true);
      bus.emit('household');
    }
    G.flags.socialWorker = 0;
  } else if (s.service === 'repo') {
    sfx('doorbell'); yield* wait(s, act, 6, 'talk');
    let owe = G.bills.filter((b) => !b.paid).reduce((a, b) => a + b.amount, 0);
    const taken = [];
    for (const o of G.objects.filter((o) => !o.def.fixed && o.def.price > 0).sort((a, b) => b.price - a.price)) { if (owe <= 0) break; owe -= sellValue(o); taken.push(o.def.name); removeObject(o); }
    G.bills = [];
    G.flags.repo = 0;
    notify(`The repo officer took the ${taken.join(', ') || 'nothing'} to cover the unpaid bills.`, '🧾', null, true);
  }
  despawn(s);
} };
IX.payPizza = {
  label: 'Pay for the pizza ($40)', icon: '🍕', test: (s, p) => (p.service === 'pizza' && p.visit && p.visit.state === 'door' && !p.paid && canAdult(s) ? (moneyOK(40) ? true : 'Not enough money') : false),
  run: function* (s, p, act) {
    const i = yield* walkToSim(s, act, p); if (i < 0 || p.paid) return;
    yield* faceSim(s, p); p.paid = true; spend(40); yield* wait(s, act, 2, 'talk');
    carry(s, 'pizza');
    const spot = eatingSeats(s)[0];
    const surf = spot ? { x: spot.px, z: spot.pz, y: spot.py } : surfaceSpotNear(s.x, s.z, 30);
    if (surf) { yield* walkNear(s, act, surf.x, surf.z, 1); yield* turnTo(s, angleTo(s, surf.x, surf.z)); }
    carry(s, null);
    const it = addItem('pizza', surf ? surf.x : s.x + 0.4, surf ? surf.z : s.z, surf ? surf.y : 0.03, { servings: 6 });
    notify('Pizza’s here! Everyone can grab a slice.', '🍕', s);
  },
};

// ---------- fire ----------
function startFire(o, cook) {
  const [x, z] = objCenter(o);
  const it = addItem('fire', x, z, o.def.surface || 0.5, { src: o.id, until: G.t + 90 });
  sfx('alarm');
  notify('Fire! Get someone to put it out!', '🔥', cook, true);
  addMoodlet(cook, 'scared');
  for (const s of onLotSims()) if (s !== cook && s.age !== 'baby' && Math.hypot(s.x - x, s.z - z) < 12) { addMoodlet(s, 'scared'); if (!canAdult(s) || !s.household) { cancelAll(s, false); queueAct(s, 'panic', it, null, false, true); } }
  cancelAll(cook, false); queueAct(cook, 'extinguish', it, null, false, true);
}
function putOutFire(it, s) {
  removeItem(it);
  const o = objById(it.src); if (o) o.broken = true;
  if (s) notify(`${s.first} put out the fire. The ${o ? o.def.name.toLowerCase() : 'stove'} needs a repair.`, '🧯', s);
  else notify('The fire burned itself out. The stove needs a repair.', '🧯');
  G.items.filter((x) => x.kind === 'fire').length || sfx('stopAlarm');
}
IX.panic = { label: 'Panic!', icon: '😱', keep: true, run: function* (s, it, act) {
  for (let k = 0; k < 3 && G.items.includes(it) && !act.cancel; k++) {
    yield* walkNear(s, act, it.x + rrange(-4, 4), it.z + rrange(-4, 4), 1);
    yield* wait(s, act, 3, 'panic');
  }
} };
function tickFires() { for (const it of G.items.slice()) if (it.kind === 'fire' && G.t >= it.until) putOutFire(it, null); }

// ---------- bills ----------
function tickBills() {
  if (dayNum() % 3 === 0 && hourF() >= 9 && G.flags.billDay !== dayNum()) {
    G.flags.billDay = dayNum();
    const value = G.objects.reduce((a, o) => a + (o.def.fixed ? 0 : o.price), 0);
    const amount = Math.round(40 + value * 0.022 + LOT.walls.size * 0.6);
    G.bills.push({ t: G.t, amount, paid: false });
    sfx('mail');
    notify(`A bill for ${fmtMoney(amount)} arrived in the mailbox. Click the mailbox to pay it.`, '🧾', null, true);
  }
}

// ---------- needs emergencies ----------
function checkEmergencies(s) {
  if (s.age === 'baby' || s.away || !s.onLot || s.dying) return;
  if (s.needs.bladder <= 0.5 && !(s.cur && s.cur.id === 'useToilet' && s.posture === 'sit')) {
    hardStop(s);
    addItem('puddle', s.x, s.z, 0);
    s.needs.bladder = 100; s.needs.hygiene = Math.max(0, s.needs.hygiene - 45);
    addMoodlet(s, 'embarrassed');
    thought(s, '😳', 3);
    if (s.household) notify(`${s.first} couldn’t hold it any longer…`, '😳', s);
  }
  if (s.needs.energy <= 0.5 && !s.sleeping) {
    hardStop(s);
    queueAct(s, 'passOut', null, null, false, true);
    if (s.household) notify(`${s.first} passed out from exhaustion!`, '😵', s);
  }
  if (s.needs.hunger <= 2 && s.household && !s.starveNote) { s.starveNote = true; notify(`${s.first} is starving!`, '⚠️', s); }
  if (s.needs.hunger > 30) s.starveNote = false;
}
IX.passOut = { label: 'Passed out', icon: '😵', keep: true, force: true, run: function* (s, _, act) {
  s.sleeping = true; s.posture = 'lie';
  yield* useLoop(s, act, { anim: 'pass', max: 400, rates: { energy: 9, comfort: -4 }, until: () => s.needs.energy > 45 });
  s.sleeping = false; s.posture = 'stand';
} };

// ---------- the daily clock ----------
function tickDaily() {
  const d = dayNum();
  if (G.flags.lastDay !== d) {
    if (G.flags.lastDay) dailyAging();
    G.flags.lastDay = d;
    for (const s of household()) if (s.pension) earn(s.pension, s);
  }
  for (const s of household()) {
    if (s.birthdayDue && s.onLot && !s.away && !s.sleeping && hourIn(hourF(), 8, 21) && !s.dying) ageUp(s);
    if (s.deathDue && s.onLot && !s.away && hourIn(hourF(), 9, 21) && !s.dying) passAway(s);
  }
  if (hourF() >= 6 && G.flags.saveDay !== d) { G.flags.saveDay = d; if (G.state === 'play' && !DEBUG) saveGame(true); }
}

// ---------- neighbourhood ----------
function makeTownies() {
  const plan = ['adult', 'adult', 'adult', 'adult', 'adult', 'adult', 'teen', 'teen', 'child', 'elder', 'elder', 'adult'];
  for (const age of plan) {
    const s = makeSim({ age, household: false });
    s.money = rint(1000, 8000);
  }
}
