// Willow Lane — the action queue and every object interaction.
// An action runs as a generator: each tick the runner calls it.next(dt) with dt in game minutes.
// Loops check act.cancel and wind down gracefully (stand up, put the plate down). Hard stops call it.return(),
// which runs the finally blocks that release seats and reset the pose.

const MAX_QUEUE = 8;
function queueAct(s, id, target, arg, user = true, front = false) {
  const def = IX[id]; if (!def) return null;
  if (s.queue.length >= MAX_QUEUE) return null;
  const act = { id, def, target, arg, user, cancel: false, label: ixLabel(def, s, target, arg), icon: def.icon || '•', it: null };
  if (user) {
    // the player's orders push autonomous actions aside
    if (s.cur && !s.cur.user && !s.cur.def.keep) s.cur.cancel = true;
    s.queue = s.queue.filter((a) => a.user || a === s.cur);
  }
  if (front) { const i = s.cur && s.queue[0] === s.cur ? 1 : 0; s.queue.splice(i, 0, act); } else s.queue.push(act);
  if (s === G.selected) bus.emit('queue', s);
  return act;
}
const ixLabel = (def, s, target, arg) => (typeof def.label === 'function' ? def.label(s, target, arg) : def.label);
function cancelAct(s, act) {
  if (act === s.cur) act.cancel = true;
  else s.queue = s.queue.filter((a) => a !== act);
  if (s === G.selected) bus.emit('queue', s);
}
function cancelAll(s, hard) {
  for (const a of s.queue) a.cancel = true;
  s.queue = s.cur ? [s.cur] : [];
  if (hard) hardStop(s);
}
// Stop at once: run finally blocks, snap out of any seat
function hardStop(s) {
  // (a generator can't be returned from inside itself: when an action stops its own sim, it simply ends)
  if (s.cur && s.cur.it && !s.cur.running) { try { s.cur.it.return(); } catch (e) { console.error(e); } }
  s.cur = null; s.queue = []; s.path = null;
  leaveSeat(s, true);
  s.posture = 'stand'; s.anim = 'idle'; s.sleeping = false; s.talking = false; s.busy = false; s.carry = null; s.y = 0;
  if (s.carryModel) { s.model && s.model.remove(s.carryModel); s.carryModel = null; }
  if (s === G.selected) bus.emit('queue', s);
}
function tickActions(s, dt) {
  if (!s.cur && s.queue.length) {
    s.cur = s.queue[0];
    const t = s.cur.def.test ? s.cur.def.test(s, s.cur.target, s.cur.arg) : true;
    if (t !== true && !s.cur.def.force) { if (s.household && typeof t === 'string') thought(s, '❌', 2.5, t); s.queue.shift(); s.cur = null; if (s === G.selected) bus.emit('queue', s); return; }
    s.cur.it = s.cur.def.run(s, s.cur.target, s.cur, s.cur.arg);
    s.cur.t0 = G.t;
    s.busy = true;
    if (s === G.selected) bus.emit('queue', s);
  }
  if (s.cur) {
    let r;
    const act = s.cur;
    act.running = true;
    try { r = act.it.next(dt); } catch (e) { console.error('action', act.id, e); r = { done: true }; }
    act.running = false;
    if (s.cur !== act) { s.queue = s.queue.filter((a) => a !== act); return; } // stopped from inside
    // long activities count as done (for wants) once they've gone on a while
    if (!act.didEmit && !r.done && G.t - act.t0 > 15 && !act.cancel) { act.didEmit = true; bus.emit('did', s, 'ix', { id: act.id, target: act.target }); }
    if (r.done) {
      const done = s.cur;
      if (!done.user && G.t - done.t0 < 0.6) noteFailed(s, done);
      if (!done.didEmit && !done.cancel && G.t - done.t0 > 1.5) bus.emit('did', s, 'ix', { id: done.id, target: done.target });
      s.queue = s.queue.filter((a) => a !== done);
      s.cur = null; s.busy = false; s.talking = false;
      if (s.posture === 'stand' && !s.path) s.anim = 'idle';
      s.idleT = 0;
      if (s === G.selected) bus.emit('queue', s);
    }
  }
}

// ---------- primitives (yield* these inside runs) ----------
function* wait(s, act, min, anim, every) {
  let t = 0;
  if (anim) { s.anim = anim; s.animT = 0; }
  while (t < min && !act.cancel) { const dt = yield; t += dt; if (every) every(dt, t); }
  return t;
}
// loop until done(): applies need rates per hour, skill gain, and an every(dt) hook
function* useLoop(s, act, o) {
  let t = 0;
  if (o.anim) { s.anim = o.anim; s.animT = 0; }
  const min = o.min || 0, max = o.max || 600;
  while (!act.cancel && t < max) {
    const dt = yield; t += dt;
    if (o.rates) addNeeds(s, typeof o.rates === 'function' ? o.rates() : o.rates, dt);
    if (o.skill) gainSkill(s, o.skill, dt * (o.skillRate || 1));
    if (o.every && o.every(dt, t) === false) break;
    if (t >= min && o.until && o.until()) break;
    if (t >= min && !o.until && o.max == null) break;
  }
  return t;
}
function* turnTo(s, a, dur = 0.3) {
  const a0 = s.dir, d = angWrap(a - a0); let t = 0;
  if (Math.abs(d) < 0.05) { s.dir = a; return; }
  while (t < dur) { t += yield; s.dir = a0 + d * Math.min(1, t / dur); }
}
const angleTo = (s, x, z) => Math.atan2(x - s.x, z - s.z);
function* faceSim(s, o) { yield* turnTo(s, angleTo(s, o.x, o.z)); }
function* slide(s, x, z, a, dur = 0.5) {
  const x0 = s.x, z0 = s.z, a0 = s.dir, d = angWrap(a - a0); let t = 0;
  while (t < dur) { t += yield; const k = smooth(0, 1, Math.min(1, t / dur)); s.x = lerp(x0, x, k); s.z = lerp(z0, z, k); s.dir = a0 + d * k; }
}
function leaveSeat(s, instant) {
  if (s.seat) { const { o, key } = s.seat; if (o.users[key] === s.id) delete o.users[key]; s.seat = null; }
  if (instant && s.seatAp) { s.x = s.seatAp[0]; s.z = s.seatAp[1]; s.seatAp = null; }
  s.posture = 'stand'; s.seatH = null; s.sleeping = false;
}
function* getUp(s) {
  if (s.posture === 'stand' && !s.seat) return;
  const ap = s.seatAp;
  s.anim = 'idle';
  if (ap) yield* slide(s, ap[0], ap[1], s.dir + (s.posture === 'lie' ? 0 : 0), 0.45);
  leaveSeat(s); s.seatAp = null;
}
// Walk to the nearest reachable goal tile. goals: [[tx,tz],...]. Returns the goal index, or -1.
function* walkTo(s, act, goals, opts = {}) {
  if (s.posture !== 'stand' || s.seat) yield* getUp(s);
  for (let attempt = 0; attempt < 3; attempt++) {
    if (act.cancel) return -1;
    const res = findPath(s.x, s.z, goals);
    if (!res) { if (s.household && !opts.quiet) thought(s, '❓', 2.5, 'Can’t get there'); return -1; }
    const pts = smoothPath(res.path);
    pts[0] = [s.x, s.z];
    const end = opts.exact ? opts.exact(res.goal) : null;
    if (pts.length === 1) { if (!end) return res.goal; pts.push(end); }
    else if (end) pts[pts.length - 1] = end;
    s.path = pts; s.pathI = 1; s.anim = opts.run ? 'run' : 'walk';
    let stuck = 0;
    while (s.path) {
      if (act.cancel) { s.path = null; s.anim = 'idle'; return -1; }
      const dt = yield;
      if (!moveAlong(s, dt, opts.run ? 3.2 : 1.7)) { stuck += dt; if (stuck > 1.5) { s.path = null; break; } } else stuck = 0;
    }
    s.anim = 'idle';
    if (stuck <= 1.5) return res.goal;
  }
  return -1;
}
// advance along s.path; returns false if the next tile is blocked
function moveAlong(s, dt, speed) {
  let step = speed * dt;
  while (s.path && step > 0) {
    const [tx, tz] = s.path[s.pathI];
    const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz);
    if (d > 0.001) { const want = Math.atan2(dx, dz); s.dir += angWrap(want - s.dir) * Math.min(1, dt * 14); }
    if (d <= step) { s.x = tx; s.z = tz; step -= d; s.pathI++; if (s.pathI >= s.path.length) { s.path = null; } }
    else {
      const nx = s.x + dx / d * step, nz = s.z + dz / d * step;
      const cx = Math.floor(s.x), cz = Math.floor(s.z), ntx = Math.floor(nx), ntz = Math.floor(nz);
      if ((ntx !== cx || ntz !== cz) && !NAV.walk(ntx, ntz)) return false;
      s.x = nx; s.z = nz; step = 0;
    }
  }
  return true;
}
// walk next to another sim (any free neighbouring tile, never onto theirs)
function* walkToSim(s, act, b) {
  const bx = Math.floor(b.x), bz = Math.floor(b.z), goals = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) goals.push([bx + dx, bz + dz]);
  goals.sort((p, q) => Math.hypot(p[0] + 0.5 - s.x, p[1] + 0.5 - s.z) - Math.hypot(q[0] + 0.5 - s.x, q[1] + 0.5 - s.z));
  return yield* walkTo(s, act, goals);
}
function* walkNear(s, act, x, z, r = 1) {
  const goals = [];
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) goals.push([Math.floor(x) + dx, Math.floor(z) + dz]);
  goals.sort((a, b) => Math.hypot(a[0] + 0.5 - x, a[1] + 0.5 - z) - Math.hypot(b[0] + 0.5 - x, b[1] + 0.5 - z));
  return yield* walkTo(s, act, goals);
}
// Walk to a standing spot of an object and face it. Reserves the spot. Returns the spot or null.
function* goStand(s, act, o, spots0) {
  const all = spots0 || standSpots(o);
  if (!all.length) { if (s.household) thought(s, '🚫', 2.5, 'No room to use that'); return null; }
  let spots = all.filter((sp) => { const u = o.users['st' + sp.tx + ',' + sp.tz]; return !u || u === s.id; });
  // someone else is using it: wait nearby for a little while
  for (let w = 0; !spots.length && w < 12 && !act.cancel;) {
    if (w === 0) yield* walkNear(s, act, all[0].x, all[0].z, 2);
    w += yield; s.anim = 'idle';
    spots = all.filter((sp) => { const u = o.users['st' + sp.tx + ',' + sp.tz]; return !u || u === s.id; });
  }
  if (!spots.length) return null;
  const key = (sp) => 'st' + sp.tx + ',' + sp.tz;
  // reserve all candidates until we know which one we reach
  const i = yield* walkTo(s, act, spots.map((sp) => [sp.tx, sp.tz]), { exact: (g) => [spots[g].x, spots[g].z] });
  if (i < 0) return null;
  const sp = spots[i];
  if (o.users[key(sp)] && o.users[key(sp)] !== s.id) return null;
  o.users[key(sp)] = s.id; s.seat = { o, key: key(sp) }; s.seatAp = null;
  yield* turnTo(s, sp.a);
  return sp;
}
function* goSit(s, act, o, seats) {
  seats = (seats || seatSpots(o)).filter((sp) => !o.users[sp.i] || o.users[sp.i] === s.id);
  if (!seats.length) { if (s.household) thought(s, '🚫', 2.5, 'No free seat'); return null; }
  const i = yield* walkTo(s, act, seats.map((sp) => [sp.ap.tx, sp.ap.tz]));
  if (i < 0) return null;
  const sp = seats[i];
  if (o.users[sp.i] && o.users[sp.i] !== s.id) return null;
  o.users[sp.i] = s.id; s.seat = { o, key: sp.i }; s.seatAp = [sp.ap.tx + 0.5, sp.ap.tz + 0.5];
  yield* turnTo(s, Math.atan2(sp.x - s.x, sp.z - s.z), 0.2);
  s.posture = 'sit'; s.seatH = sp.h; s.anim = 'sit';
  yield* slide(s, sp.x, sp.z, sp.a, 0.5);
  return sp;
}
function* goLie(s, act, o, spot) {
  const spots = (spot ? [spot] : lieSpots(o)).filter((sp) => !o.users['L' + sp.i] || o.users['L' + sp.i] === s.id);
  if (!spots.length) { if (s.household) thought(s, '🚫', 2.5, 'Someone is already there'); return null; }
  const i = yield* walkTo(s, act, spots.map((sp) => [sp.ap.tx, sp.ap.tz]));
  if (i < 0) return null;
  const sp = spots[i];
  if (o.users['L' + sp.i] && o.users['L' + sp.i] !== s.id) return null;
  o.users['L' + sp.i] = s.id; s.seat = { o, key: 'L' + sp.i }; s.seatAp = [sp.ap.tx + 0.5, sp.ap.tz + 0.5];
  s.posture = 'lie'; s.seatH = sp.h; s.anim = 'lie';
  yield* slide(s, sp.x, sp.z, sp.a, 0.6);
  return sp;
}
// step into an object's own tile (shower, tub)
function* goInside(s, act, o, lie) {
  const fronts = standSpots(o);
  if (!fronts.length) return null;
  // occupied: wait outside for a bit
  for (let w = 0; o.users.in && o.users.in !== s.id && w < 20 && !act.cancel;) { if (w === 0) yield* walkNear(s, act, fronts[0].x, fronts[0].z, 2); w += yield; s.anim = 'idle'; }
  if (o.users.in && o.users.in !== s.id) { if (s.household) thought(s, '🚫', 2.5, 'Occupied'); return null; }
  const i = yield* walkTo(s, act, fronts.map((sp) => [sp.tx, sp.tz]));
  if (i < 0 || (o.users.in && o.users.in !== s.id)) return null;
  o.users.in = s.id; s.seat = { o, key: 'in' }; s.seatAp = [fronts[i].x, fronts[i].z];
  if (lie) { const [x, z] = localToWorld(o, 0, 0.8); s.posture = 'lie'; s.seatH = 0.3; yield* slide(s, x, z, worldAngle(o, 0), 0.7); }
  else { const [x, z] = localToWorld(o, 0, 0); yield* slide(s, x, z, worldAngle(o, 0), 0.6); }
  return true;
}
function carry(s, kind, extra) {
  if (s.carryModel && s.model) s.model.remove(s.carryModel);
  s.carry = kind ? Object.assign({ kind }, extra || {}) : null;
  s.carryModel = null;
  if (kind && s.model) { const m = buildItemModel({ kind, dirty: extra && extra.dirty, food: extra && extra.food }); m.position.set(0, 1.0, 0.32); m.scale.setScalar(1 / s.model.scale.x); s.model.add(m); s.carryModel = m; }
}

// ---------- helpers ----------
const distTo = (s, o) => { const [x, z] = o.def ? objCenter(o) : [o.x, o.z]; return Math.hypot(x - s.x, z - s.z); };
function nearestObjs(s, pred) { return G.objects.filter(pred).sort((a, b) => distTo(s, a) - distTo(s, b)); }
const canAdult = (s) => isGrown(s) || s.age === 'teen';
const ageOK = (s, list) => list.includes(s.age);
const notBaby = (s) => s.age !== 'baby';
function moneyOK(n) { return G.money >= n; }
function spend(n, why) { G.money -= n; floatMoney(-n); bus.emit('money'); }
function earn(n, s) { G.money += n; floatMoney(n, s); bus.emit('money'); }
const isOn = (o) => o.on && !o.broken;
const userOrNeed = (act, s, need, lvl = 99) => act.user ? s.needs[need] < lvl : s.needs[need] < lvl;

// a seat that faces a surface tile, nearest first
function eatingSeats(s) {
  const res = [];
  for (const o of G.objects) {
    if (!o.def.seats) continue;
    for (const sp of seatSpots(o)) {
      if (o.users[sp.i]) continue;
      if (sp.desk) { res.push({ o, sp, tx: Math.floor(sp.x - Math.sin(sp.a) * -0.0), table: o, px: sp.x + Math.sin(sp.a) * 0.6, pz: sp.z + Math.cos(sp.a) * 0.6, py: 0.76 }); continue; }
      const fx = Math.floor(sp.x + Math.sin(sp.a)), fz = Math.floor(sp.z + Math.cos(sp.a));
      const surf = surfaceAt(fx, fz);
      if (!surf || surf.o === o) continue;
      if (G.items.some((it) => Math.floor(it.x) === fx && Math.floor(it.z) === fz && Math.abs(it.x - (sp.x + Math.sin(sp.a) * 0.55)) < 0.3 && Math.abs(it.z - (sp.z + Math.cos(sp.a) * 0.55)) < 0.3)) continue;
      res.push({ o, sp, table: surf.o, px: sp.x + Math.sin(sp.a) * 0.55, pz: sp.z + Math.cos(sp.a) * 0.55, py: surf.h });
    }
  }
  for (const e of res) e.d = Math.hypot(e.sp.x - s.x, e.sp.z - s.z);
  return res.sort((a, b) => a.d - b.d);
}
// Carry a plate to a table and eat it. food: { hunger, quality, color, servings }
function* eatMeal(s, act, food) {
  carry(s, 'plate', { food: food.color });
  const seats = eatingSeats(s).slice(0, 6);
  let sp = null, place = null;
  for (const e of seats) { sp = yield* goSit(s, act, e.o, [e.sp]); if (sp) { place = e; break; } if (act.cancel) break; }
  let plate = null;
  if (place) {
    carry(s, null);
    plate = addItem('plate', place.px, place.pz, place.py, { food: food.color, owner: s.id });
    s.anim = 'sitEat';
  } else {
    s.anim = 'eat';
  }
  let eaten = 0;
  const total = food.hunger;
  yield* useLoop(s, act, { anim: place ? 'sitEat' : 'eat', max: 40, rates: { hunger: total * 2.2 }, every: (dt) => { eaten += total * 2.2 * dt / 60; if (chance(dt * 0.04)) thought(s, '😋', 1.5); return eaten < total && s.needs.hunger < 100; } });
  if (food.quality != null) { if (food.quality > 78) addMoodlet(s, 'greatMeal'); else if (food.quality < 25) addMoodlet(s, 'badMeal'); }
  if (place) {
    plate.dirty = true; refreshItem(plate);
    yield* getUp(s);
    if ((s.pers.neat >= 4 || chance(0.35)) && !act.cancel) yield* cleanPlate(s, act, plate);
  } else {
    carry(s, null);
    const sp2 = surfaceSpotNear(s.x, s.z, 2);
    const p = sp2 ? addItem('plate', sp2.x, sp2.z, sp2.y, { dirty: true }) : addItem('plate', s.x + Math.sin(s.dir) * 0.4, s.z + Math.cos(s.dir) * 0.4, 0.03, { dirty: true });
    if ((s.pers.neat >= 4 || chance(0.35)) && !act.cancel) yield* cleanPlate(s, act, p);
  }
}
function* cleanPlate(s, act, it) {
  if (!G.items.includes(it)) return;
  it.claim = s.id;
  const i = yield* walkNear(s, act, it.x, it.z, 1);
  if (i < 0 || !G.items.includes(it)) { it.claim = 0; return; }
  yield* turnTo(s, angleTo(s, it.x, it.z));
  yield* wait(s, act, 1, 'counter');
  const kind = it.kind;
  removeItem(it);
  carry(s, kind === 'pizza' ? 'pizza' : 'plate', { dirty: true });
  const sink = nearestObjs(s, (o) => o.type === 'ksink' && !o.broken)[0], trash = nearestObjs(s, (o) => o.type === 'trash')[0];
  const dest = kind !== 'pizza' && sink && (!trash || distTo(s, sink) < distTo(s, trash) + 4) ? sink : trash || sink;
  if (dest) {
    const sp = yield* goStand(s, { cancel: false }, dest);
    if (sp) {
      yield* wait(s, { cancel: false }, dest.type === 'ksink' ? 6 : 1.5, dest.type === 'ksink' ? 'wash' : 'counter');
      if (dest.type === 'trash') dest.trash = Math.min(100, dest.trash + 15);
      leaveSeat(s);
    }
  }
  carry(s, null);
}
const dirtyThings = () => G.items.filter((it) => (it.kind === 'plate' || it.kind === 'pizza') && it.dirty && !it.claim);

// ============================================================================================
// INTERACTIONS
// fields: label, icon, test(s, target, arg) -> true | 'reason' | false, adverts(s, target) -> {need: amount}
//         menu(s, target) -> [{ label, arg }] for entries with a choice, run: function*(s, target, act, arg)
// ============================================================================================
const IX = {};
const ADULTS = ['teen', 'adult', 'elder'], NOT_BABY = ['child', 'teen', 'adult', 'elder'];

IX.goHere = { label: 'Go here', icon: '👣', force: true, run: function* (s, p, act) { yield* walkNear(s, act, p.x, p.z, 0); } };

// ----- seating & beds -----
IX.sit = {
  label: 'Sit', icon: '🪑', test: (s, o) => notBaby(s) && seatSpots(o).some((sp) => !o.users[sp.i]) ? true : 'No free seat',
  adverts: (s, o) => ({ comfort: (o.def.stats.comfort || 2) * 6 + (s.pers.active < 4 ? 10 : 0) }),
  run: function* (s, o, act) {
    if (!(yield* goSit(s, act, o))) return;
    yield* useLoop(s, act, { anim: 'sit', rates: { comfort: 8 + (o.def.stats.comfort || 2) * 3 }, max: act.user ? 240 : 60, until: () => s.needs.comfort > 95 && !act.user });
    yield* getUp(s);
  },
};
IX.nap = {
  label: 'Nap', icon: '😴', test: (s, o) => (notBaby(s) ? (s.needs.energy > 75 ? 'Not tired' : true) : false),
  adverts: (s, o) => ({ energy: o.def.cat === 'beds' ? 35 : 22, comfort: 6 }),
  run: function* (s, o, act) {
    const spots = lieSpots(o);
    if (!(yield* goLie(s, act, o, o.def.cat === 'seating' ? spots[0] : null))) return;
    s.sleeping = true;
    yield* useLoop(s, act, { anim: 'nap', rates: { energy: 8 + (o.def.stats.energy || 3), comfort: 14 }, max: 120, every: (dt, t) => { if (chance(dt * 0.03)) thought(s, '💤', 2); } });
    s.sleeping = false;
    yield* getUp(s);
  },
};
IX.sleep = {
  label: 'Sleep', icon: '💤',
  test: (s, o) => { if (!notBaby(s)) return false; if (o.def.kidsOnly && isGrown(s)) return 'Too small for grown-ups'; const night = hourIn(hourF(), 21, 6); return s.needs.energy > (night ? 85 : 55) ? 'Not sleepy' : true; },
  adverts: (s, o) => ({ energy: 95 + (hourIn(hourF(), 21, 6) ? 30 : 0), comfort: 8 }),
  run: function* (s, o, act) {
    if (!(yield* goLie(s, act, o))) return;
    s.sleeping = true;
    const q = o.def.stats.energy || 6;
    let slept = 0;
    yield* useLoop(s, act, { anim: 'sleep', rates: { energy: 6 + q * 1.2, comfort: 12 }, max: 900, until: () => s.needs.energy >= 99.5 && (!hourIn(hourF(), 22, 5) || s.needs.bladder < 20 || s.needs.hunger < 20),
      every: (dt, t) => { slept = t; if (chance(dt * 0.02)) thought(s, '💤', 2.5); if (s.needs.bladder < 16 || s.needs.hunger < 8) return false; } });
    s.sleeping = false;
    if (slept > 300 && s.needs.energy > 90) addMoodlet(s, 'rested');
    yield* getUp(s);
  },
};
IX.cuddle = {
  label: (s, o, p) => 'Cuddle with ' + (p ? p.first : '…'), icon: '🥰',
  menu: (s, o) => romanticPartners(s).map((p) => ({ label: 'Cuddle with ' + p.first, arg: p })),
  test: (s, o, p) => (!p ? false : !isGrown(s) ? false : relGet(s, p).r < 40 ? 'Not close enough yet' : true),
  run: function* (s, o, act, p) { yield* bedTogether(s, o, act, p, false); },
};
IX.tryBaby = {
  label: (s, o, p) => 'Try for baby with ' + (p ? p.first : '…'), icon: '👶',
  menu: (s, o) => romanticPartners(s).map((p) => ({ label: 'Try for baby with ' + p.first, arg: p })),
  test: (s, o, p) => {
    if (!p || !isGrown(s) || !isGrown(p)) return false;
    if (relGet(s, p).r < 55) return 'Needs more romance first';
    if (household().length >= 8) return 'The house is full';
    if (s.age === 'elder' && p.age === 'elder') return 'Too old: try adoption';
    if (![s, p].some((x) => x.canCarry && x.age !== 'elder')) return 'Neither can carry: try adoption';
    if ([s, p].some((x) => x.preg)) return 'Already expecting!';
    if (!s.household || !p.household) return 'Move in together first';
    return true;
  },
  run: function* (s, o, act, p) { yield* bedTogether(s, o, act, p, true); },
};
function romanticPartners(s) { return onLotSims().filter((p) => p !== s && relGet(s, p).r >= 30 && romanceGroup(p) === 'adult' && romanceGroup(s) === 'adult' && !isFamily(s, p)); }
// Both sims get into the bed: the target is pulled out of what they were doing
function* bedTogether(s, o, act, p, baby) {
  const spots = lieSpots(o);
  if (spots.length < 2) { thought(s, '🛏️', 2.5, 'Needs a double bed'); return; }
  if (p.away || !p.onLot || p.sleeping && p.seat && p.seat.o !== o) return;
  cancelAll(p, true);
  const pAct = queueAct(p, 'beHeld', s, { o, spot: spots[1] }, false, true);
  const me = yield* goLie(s, act, o, spots[0]);
  if (!me) { if (pAct) pAct.cancel = true; return; }
  let t = 0;
  while (t < 30 && !act.cancel) { // wait for the partner to arrive
    t += yield;
    if (p.seat && p.seat.o === o && p.posture === 'lie') break;
  }
  if (!(p.seat && p.seat.o === o)) { if (pAct) pAct.cancel = true; yield* getUp(s); return; }
  s.anim = 'cuddle'; p.anim = 'cuddle';
  if (baby) {
    sfx('kiss'); hearts(s); hearts(p);
    // the covers do the talking
    o.model.userData.wiggle = 1;
    yield* wait(s, act, 30, 'cuddle', (dt) => { if (chance(dt * 0.3)) hearts(s); });
    o.model.userData.wiggle = 0;
    relAdd(s, p, 6, 8); addNeeds(s, { fun: 600, social: 600 }, 4); addNeeds(p, { fun: 600, social: 600 }, 4);
    const carrier = [s, p].find((x) => x.canCarry && x.age !== 'elder' && !x.preg);
    if (carrier && chance(0.6)) { startPregnancy(carrier, carrier === s ? p : s); }
    else if (s.household) notify(`No luck this time for ${s.first} and ${p.first}. Try again later.`, '💞', s);
  } else {
    yield* wait(s, act, 25, 'cuddle', (dt) => { relAdd(s, p, dt * 0.15, dt * 0.25); addNeeds(s, { social: 30, fun: 15, comfort: 20 }, dt); addNeeds(p, { social: 30, fun: 15, comfort: 20 }, dt); if (chance(dt * 0.15)) hearts(s); });
  }
  if (pAct) pAct.cancel = true;
  yield* getUp(s);
}
IX.beHeld = { label: 'Cuddling', icon: '🥰', keep: true, run: function* (s, by, act, a) {
  const sp = yield* goLie(s, act, a.o, a.spot);
  if (!sp) return;
  while (!act.cancel) { yield; s.anim = 'cuddle'; if (!by.cur || (by.cur.id !== 'tryBaby' && by.cur.id !== 'cuddle')) break; }
  yield* getUp(s);
} };

// ----- food -----
IX.snack = {
  label: 'Have a snack', icon: '🍎', test: (s) => notBaby(s),
  adverts: (s) => ({ hunger: 18 }),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    yield* wait(s, act, 3, 'fridge'); sfx('fridge');
    leaveSeat(s);
    carry(s, 'plate', { food: 0xd84a3a });
    yield* useLoop(s, act, { anim: 'eat', max: 8, rates: { hunger: 140 } });
    carry(s, null);
  },
};
IX.quickMeal = {
  label: 'Have a quick meal', icon: '🥪', test: (s) => notBaby(s) ? (s.needs.hunger > 92 ? 'Not hungry' : true) : false,
  adverts: (s) => ({ hunger: 45 }),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    yield* wait(s, act, 4, 'fridge'); sfx('fridge');
    leaveSeat(s);
    const counter = nearestObjs(s, (c) => (c.type === 'counter' || c.type === 'counter_marble') && distTo(s, c) < 8)[0];
    if (counter && !act.cancel) { if (yield* goStand(s, act, counter)) { yield* wait(s, act, 6, 'counter'); leaveSeat(s); } }
    if (act.cancel) return;
    yield* eatMeal(s, act, { hunger: 45, color: 0xe8b860, quality: 40 + skillLv(s, 'cooking') * 3 });
  },
};
IX.cookMeal = {
  label: 'Cook a group meal', icon: '🍲',
  test: (s, o) => { if (!ageOK(s, ['teen', 'adult', 'elder'])) return s.age === 'child' ? 'Too young to cook' : false; if (!G.objects.some((x) => x.type === 'stove')) return 'Needs a stove'; if (G.objects.find((x) => x.type === 'stove' && x.broken)) return 'The stove is broken'; return s.needs.hunger > 90 && !s.household ? false : true; },
  adverts: (s) => (s.household ? { hunger: 55 + skillLv(s, 'cooking') * 2 } : null),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    yield* wait(s, act, 5, 'fridge'); sfx('fridge');
    leaveSeat(s);
    if (act.cancel) return;
    const counter = nearestObjs(s, (c) => (c.type === 'counter' || c.type === 'counter_marble') && distTo(s, c) < 10)[0];
    if (counter) { if (yield* goStand(s, act, counter)) { yield* useLoop(s, act, { anim: 'counter', max: 18, skill: 'cooking', rates: {} }); leaveSeat(s); } }
    if (act.cancel) return;
    const stove = nearestObjs(s, (x) => x.type === 'stove' && !x.broken)[0];
    if (!stove) return;
    if (!(yield* goStand(s, act, stove))) return;
    stove.on = true; sfx('sizzle');
    const lv = skillLv(s, 'cooking');
    const fireChance = Math.max(0, 0.08 - lv * 0.02) * (1 + (5 - s.pers.neat) * 0.05);
    let fire = false;
    yield* useLoop(s, act, { anim: 'cook', max: 25, skill: 'cooking', skillRate: 1.4, every: (dt, t) => { if (!fire && t > 8 && chance(fireChance * dt / 17)) { fire = true; return false; } } });
    stove.on = false;
    leaveSeat(s);
    if (fire) { startFire(stove, s); return; }
    if (act.cancel) return;
    const q = clamp(32 + lv * 7 + rrange(-8, 10), 5, 100);
    const spot = surfaceSpotNear(s.x, s.z, 4);
    const n = Math.max(2, Math.min(8, onLotSims().filter((x) => x.age !== 'baby').length));
    const platter = spot ? addItem('meal', spot.x, spot.z, spot.y, { servings: n, quality: q, food: 0xc8742e }) : null;
    if (!platter) return;
    refreshItem(platter);
    if (s.household) { notify(`${s.first} cooked dinner. ${q > 75 ? 'It smells amazing!' : q < 30 ? 'It is… edible.' : 'Come and get it!'}`, '🍲', s); }
    platter.servings--;
    yield* eatMeal(s, act, { hunger: 55 + q * 0.3, color: 0xc8742e, quality: q });
  },
};
IX.serving = {
  label: 'Have a serving', icon: '🍽️', test: (s, it) => (notBaby(s) && it.servings > 0 ? (s.needs.hunger > 92 ? 'Not hungry' : true) : false),
  adverts: (s, it) => ({ hunger: 55 + it.quality * 0.3 }),
  run: function* (s, it, act) {
    const i = yield* walkNear(s, act, it.x, it.z, 1);
    if (i < 0 || it.servings <= 0 || !G.items.includes(it)) return;
    yield* turnTo(s, angleTo(s, it.x, it.z));
    yield* wait(s, act, 1.5, 'counter');
    it.servings--;
    if (it.servings <= 0) { it.dirty = true; it.kind = 'plate'; refreshItem(it); }
    yield* eatMeal(s, act, { hunger: 55 + it.quality * 0.3, color: it.food, quality: it.quality });
  },
};
IX.bakeCake = {
  label: 'Bake a birthday cake', icon: '🎂',
  test: (s) => (!ageOK(s, ['teen', 'adult', 'elder']) ? false : !s.household ? false : !moneyOK(30) ? 'Costs $30' : true),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    yield* wait(s, act, 4, 'fridge'); leaveSeat(s);
    const counter = nearestObjs(s, (c) => c.def.surface && distTo(s, c) < 10)[0];
    if (counter) { if (yield* goStand(s, act, counter)) { yield* useLoop(s, act, { anim: 'counter', max: 20, skill: 'cooking' }); leaveSeat(s); } }
    if (act.cancel) return;
    spend(30);
    const spot = surfaceSpotNear(s.x, s.z, 4);
    if (spot) addItem('cake', spot.x, spot.z, spot.y);
    notify(`${s.first} baked a birthday cake. Click it to celebrate someone’s birthday early.`, '🎂', s);
  },
};
IX.blowCandles = {
  label: (s, it, who) => (who === s ? 'Blow out the candles' : 'Help ' + who.first + ' blow out the candles'), icon: '🎂',
  menu: (s, it) => household().filter((h) => h.onLot && !h.away && AGES[h.age].next && h.age !== 'baby').map((h) => ({ label: h === s ? 'Blow out my candles' : 'Celebrate ' + h.first + '’s birthday', arg: h })),
  test: (s, it, who) => (who && notBaby(s) ? true : false),
  run: function* (s, it, act, who) {
    if (who !== s) { cancelAll(who, true); queueAct(who, 'blowCandles', it, who, false, true); return; }
    const i = yield* walkNear(s, act, it.x, it.z, 1);
    if (i < 0 || !G.items.includes(it)) return;
    yield* turnTo(s, angleTo(s, it.x, it.z));
    for (const o of onLotSims()) if (o !== s && o.age !== 'baby' && !o.sleeping && Math.hypot(o.x - s.x, o.z - s.z) < 9) { if (!o.cur || !o.cur.user) { cancelAll(o, false); queueAct(o, 'cheerFor', s, null, false, true); } }
    yield* wait(s, act, 3, 'idle');
    sfx('blow'); confetti(it.x, it.y + 0.4, it.z);
    removeItem(it);
    ageUp(s);
  },
};
IX.cheerFor = { label: 'Celebrate', icon: '🎉', run: function* (s, who, act) { if (Math.hypot(who.x - s.x, who.z - s.z) > 3) yield* walkToSim(s, act, who); yield* faceSim(s, who); yield* wait(s, act, 6, 'cheer'); } };

// ----- kitchen & cleaning -----
IX.washDishes = {
  label: 'Wash the dishes', icon: '🧽', test: (s) => (ageOK(s, ['teen', 'adult', 'elder']) ? (dirtyThings().length ? true : 'Nothing to wash') : false),
  adverts: (s) => (s.household && dirtyThings().length > 1 ? { room: 12 + dirtyThings().length * 3 + s.pers.neat * 2 } : null),
  run: function* (s, o, act) { for (let k = 0; k < 4; k++) { const it = dirtyThings().sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0]; if (!it || act.cancel) break; yield* cleanPlate(s, act, it); } },
};
IX.cleanUp = {
  label: 'Clean up', icon: '🧽', test: (s, it) => (notBaby(s) && it.dirty && !it.claim ? true : false),
  adverts: (s) => (s.household ? { room: 14 + s.pers.neat * 2.2 } : null),
  run: function* (s, it, act) { yield* cleanPlate(s, act, it); },
};
IX.washHands = {
  label: 'Wash hands', icon: '🫧', test: (s) => notBaby(s), adverts: (s) => ({ hygiene: 8 + s.pers.neat }),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o))) return; yield* useLoop(s, act, { anim: 'wash', max: 4, rates: { hygiene: 160 } }); leaveSeat(s); },
};
IX.emptyTrash = {
  label: 'Take out the trash', icon: '🗑️', test: (s, o) => (notBaby(s) ? (o.trash > 20 ? true : 'It’s nearly empty') : false),
  adverts: (s, o) => (s.household && o.trash > 70 ? { room: 15 + s.pers.neat * 2 } : null),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    yield* wait(s, act, 2, 'counter'); leaveSeat(s);
    o.trash = 0; carry(s, 'trashbag');
    const bin = G.objects.find((b) => b.type === 'garbage');
    if (bin) { const sp = yield* goStand(s, { cancel: false }, bin, aroundSpots(bin)); if (sp) { yield* wait(s, { cancel: false }, 1.5, 'counter'); leaveSeat(s); } }
    carry(s, null);
  },
};
IX.clean = {
  label: 'Clean', icon: '🧹', test: (s, o) => (notBaby(s) && s.age !== 'child' ? (o.dirt > 25 ? true : 'Already clean') : false),
  adverts: (s, o) => (s.household && o.dirt > 50 ? { room: 12 + s.pers.neat * 2.5 + (o.dirt - 50) * 0.3 } : null),
  run: function* (s, o, act) {
    const sp = yield* goStand(s, act, o); if (!sp) return;
    yield* useLoop(s, act, { anim: 'clean', max: 40, rates: { hygiene: -6 }, every: (dt) => { o.dirt = Math.max(0, o.dirt - dt * (3 + s.pers.neat * 0.3)); return o.dirt > 0; } });
    leaveSeat(s);
  },
};
const SERVES = { toilet: 'bladder', shower: 'hygiene', stove: 'hunger', tv: 'fun', tv_big: 'fun', computer: 'fun' };
IX.repair = {
  label: 'Repair', icon: '🔧', test: (s, o) => (o.broken ? (ageOK(s, ['teen', 'adult', 'elder']) ? true : 'Too young') : false),
  adverts: (s, o) => { if (!s.household) return null; const a = { room: 30 }; const n = SERVES[o.type]; if (n && !G.objects.some((x) => x !== o && x.type === o.type && !x.broken)) a[n] = Math.max(25, 100 - s.needs[n]); return a; },
  run: function* (s, o, act) {
    const sp = yield* goStand(s, act, o); if (!sp) return;
    let prog = 0;
    yield* useLoop(s, act, { anim: 'repair', max: 300, skill: 'mechanical', skillRate: 1.3, rates: { hygiene: -8 }, every: (dt) => { prog += dt * (1 + skillLv(s, 'mechanical') * 0.4) / 60; if (chance(dt * 0.02)) sfx('wrench'); return prog < 1; } });
    leaveSeat(s);
    if (prog >= 1) { o.broken = false; if (s.household) notify(`${s.first} fixed the ${o.def.name.toLowerCase()}.`, '🔧', s); }
  },
};
IX.unclog = Object.assign({}, IX.repair, { label: 'Unclog', icon: '🪠' });
IX.mop = {
  label: 'Mop up', icon: '🧽', test: (s, it) => (notBaby(s) && !it.claim ? true : false),
  adverts: (s) => (s.household ? { room: 18 + s.pers.neat * 2.2 } : null),
  run: function* (s, it, act) {
    it.claim = s.id;
    const i = yield* walkNear(s, act, it.x, it.z, 1);
    if (i < 0) { it.claim = 0; return; }
    yield* turnTo(s, angleTo(s, it.x, it.z));
    yield* wait(s, act, 8, 'clean');
    if (!act.cancel) removeItem(it); else it.claim = 0;
  },
};
IX.extinguish = {
  label: 'Put out the fire!', icon: '🧯', test: (s) => (ageOK(s, ['teen', 'adult', 'elder']) ? true : false),
  adverts: (s) => ({ room: 120 }),
  run: function* (s, it, act) {
    const i = yield* walkNear(s, act, it.x, it.z, 1);
    if (i < 0) return;
    yield* turnTo(s, angleTo(s, it.x, it.z));
    let t = 0;
    while (!act.cancel && G.items.includes(it)) { const dt = yield; t += dt; s.anim = 'panic'; if (t > 6 + rrange(0, 6)) { putOutFire(it, s); break; } }
  },
};

// ----- bathroom -----
IX.useToilet = {
  label: 'Use the toilet', icon: '🚽', test: (s, o) => (notBaby(s) ? (o.broken ? 'It’s clogged' : s.needs.bladder > 95 ? 'Doesn’t need to go' : true) : false),
  adverts: (s, o) => ({ bladder: 100 - s.needs.bladder + 10 }),
  run: function* (s, o, act) {
    // wait outside if someone else is in there
    for (let w = 0; o.users[0] && o.users[0] !== s.id && w < 25 && !act.cancel;) { if (w === 0) { const sp = seatSpots(o)[0]; if (sp) yield* walkNear(s, act, sp.ap.tx + 0.5, sp.ap.tz + 0.5, 1); } w += yield; s.anim = 'idle'; if (chance(0.02)) thought(s, '🚽', 1.5); }
    if (!(yield* goSit(s, act, o))) return;
    s.anim = 'sitToilet';
    yield* useLoop(s, act, { anim: 'sitToilet', max: 15, rates: { bladder: 600, comfort: 10 }, until: () => s.needs.bladder >= 100 });
    sfx('flush');
    o.dirt = Math.min(100, o.dirt + 7);
    if (chance(0.012 + o.dirt / 2500)) { o.broken = true; addItem('puddle', s.seatAp ? s.seatAp[0] : s.x, s.seatAp ? s.seatAp[1] : s.z, 0); if (s.household) notify('The toilet is clogged! Someone needs to unclog it.', '🪠', s); }
    yield* getUp(s);
    if (s.pers.neat > 3 && !act.cancel) { const sink = nearestObjs(s, (x) => (x.type === 'sink' || x.type === 'ksink') && distTo(s, x) < 6)[0]; if (sink) { if (yield* goStand(s, act, sink)) { yield* useLoop(s, act, { anim: 'wash', max: 3, rates: { hygiene: 160 } }); leaveSeat(s); } } }
  },
};
IX.shower = {
  label: 'Take a shower', icon: '🚿', test: (s, o) => (notBaby(s) ? (o.broken ? 'Broken' : s.needs.hygiene > 95 ? 'Already clean' : true) : false),
  adverts: (s, o) => ({ hygiene: 70 + s.pers.neat * 2 }),
  run: function* (s, o, act) {
    if (!(yield* goInside(s, act, o))) return;
    o.on = true; sfx('shower');
    s.model && (s.model.userData.towel = true);
    yield* useLoop(s, act, { anim: 'shower', max: 25, rates: { hygiene: 300, comfort: 10 }, until: () => s.needs.hygiene >= 100, every: (dt) => { if (chance(dt * 0.03)) thought(s, '🎶', 1.5); } });
    o.on = false;
    o.dirt = Math.min(100, o.dirt + 6);
    if (chance(0.015)) { o.broken = true; if (s.household) notify('The shower broke. Repair it before the next shower.', '🔧', s); }
    const ap = s.seatAp;
    yield* getUp(s);
    if (s.needs.hygiene > 95) addMoodlet(s, 'hotShower');
    if (s.pers.neat < 4 && chance(0.4) && ap) addItem('puddle', ap[0], ap[1], 0);
  },
};
IX.bath = {
  label: 'Take a bath', icon: '🛁', test: (s, o) => (notBaby(s) ? (s.needs.hygiene > 95 ? 'Already clean' : true) : false),
  adverts: (s, o) => ({ hygiene: 70, comfort: 30 }),
  run: function* (s, o, act) {
    if (!(yield* goInside(s, act, o, true))) return;
    sfx('shower');
    yield* useLoop(s, act, { anim: 'bathe', max: 50, rates: { hygiene: 160, comfort: 40, fun: 6 }, until: () => s.needs.hygiene >= 100 && s.needs.comfort > 90 });
    o.dirt = Math.min(100, o.dirt + 6);
    yield* getUp(s);
  },
};

// ----- electronics -----
function tvSeats(s, tv) {
  const [tx, tz] = objCenter(tv), fa = worldAngle(tv, 0);
  const out = [];
  for (const o of G.objects) {
    if (!o.def.seats || o.def.cat === 'bath' || o.type === 'computer' || o.type === 'desk' || o.type === 'chess') continue;
    for (const sp of seatSpots(o)) {
      if (o.users[sp.i]) continue;
      const dx = tx - sp.x, dz = tz - sp.z, d = Math.hypot(dx, dz);
      if (d < 1.5 || d > 8) continue;
      const toTv = Math.atan2(dx, dz);
      if (Math.abs(angWrap(toTv - sp.a)) > 0.9) continue;           // seat faces the tv
      if (Math.cos(angWrap(fa - Math.atan2(-dx, -dz))) < 0.3) continue; // tv faces the seat
      out.push({ o, sp, d });
    }
  }
  return out.sort((a, b) => a.d - b.d);
}
IX.watchTV = {
  label: 'Watch TV', icon: '📺', test: (s, o) => (o.broken ? 'Broken' : notBaby(s) ? true : false),
  adverts: (s, o) => ({ fun: (o.def.stats.fun || 4) * 5 + 6 + (s.pers.active < 4 ? 10 : 0), comfort: 10 }),
  run: function* (s, o, act) {
    const seats = tvSeats(s, o);
    let sat = null;
    for (const e of seats.slice(0, 4)) { sat = yield* goSit(s, act, e.o, [e.sp]); if (sat || act.cancel) break; }
    if (!sat) {
      const [cx, cz] = localToWorld(o, 0, 2.5);
      const i = yield* walkNear(s, act, cx, cz, 1); if (i < 0) return;
      const [tx, tz] = objCenter(o); yield* turnTo(s, angleTo(s, tx, tz));
    }
    o.on = true; o.watchers = (o.watchers || 0) + 1;
    try {
      const f = (o.def.stats.fun || 4) * 5;
      yield* useLoop(s, act, { anim: sat ? 'sitWatch' : 'idle', max: act.user ? 240 : 90, rates: { fun: f, comfort: sat ? 12 : 0 }, until: () => s.needs.fun > 97 && !act.user,
        every: (dt) => { if (o.broken) return false; if (chance(dt * 0.02)) { const r = rpick(['😂', '😮', '❤️', '🍳', '⚽']); thought(s, r, 1.8); if (r === '🍳') gainSkill(s, 'cooking', 3); } if (chance(dt * 0.0012)) { o.broken = true; sfx('pop'); if (s.household) notify('The TV broke!', '📺', s); return false; } } });
    } finally { o.watchers--; if (o.watchers <= 0) { o.on = false; o.watchers = 0; } }
    if (sat) yield* getUp(s);
  },
};
function* useDesk(s, act, o, anim, opts) {
  const seats = seatSpots(o);
  if (!(yield* goSit(s, act, o, seats))) return false;
  if (o.type === 'computer') o.on = true;
  try { yield* useLoop(s, act, Object.assign({ anim }, opts)); } finally { if (o.type === 'computer') o.on = false; }
  yield* getUp(s);
  return true;
}
IX.playGames = {
  label: 'Play video games', icon: '🎮', test: (s, o) => (o.broken ? 'Broken' : notBaby(s)), adverts: (s) => ({ fun: 30 + s.pers.playful * 2 }),
  run: function* (s, o, act) { yield* useDesk(s, act, o, 'sitType', { max: act.user ? 180 : 75, rates: { fun: 32, comfort: 10, energy: -2 }, skill: 'logic', skillRate: 0.2, until: () => s.needs.fun > 97 && !act.user, every: (dt) => { if (chance(dt * 0.02)) thought(s, rpick(['🕹️', '👾', '🏆']), 1.5); if (chance(dt * 0.0008)) { o.broken = true; return false; } } }); },
};
IX.chatOnline = {
  label: 'Chat online', icon: '💻', test: (s, o) => (o.broken ? 'Broken' : ageOK(s, ['child', 'teen', 'adult', 'elder'])), adverts: (s) => ({ social: 22, fun: 8 }),
  run: function* (s, o, act) { yield* useDesk(s, act, o, 'sitType', { max: 60, rates: { social: 26, fun: 10, comfort: 8 }, skill: 'charisma', skillRate: 0.15, until: () => s.needs.social > 97 && !act.user }); },
};
IX.findJob = {
  label: 'Look for a job', icon: '💼', test: (s, o) => (o.broken ? 'Broken' : !s.household ? false : isGrown(s) ? true : s.age === 'teen' || s.age === 'child' ? 'Goes to school' : false),
  run: function* (s, o, act) { if (yield* useDesk(s, act, o, 'sitType', { max: 10 })) jobDialog(s, 5); },
};
IX.writeNovel = {
  label: 'Write a novel', icon: '📖', test: (s, o) => (o.broken ? 'Broken' : ageOK(s, ['teen', 'adult', 'elder'])), adverts: (s) => (s.household ? { fun: 10 + s.pers.playful * -0.5 + 6 } : null),
  run: function* (s, o, act) {
    yield* useDesk(s, act, o, 'sitType', { max: act.user ? 180 : 60, rates: { fun: 8, comfort: 8 }, skill: 'creativity', every: (dt) => {
      s.novel += dt / 60 * (0.6 + skillLv(s, 'creativity') * 0.12);
      if (s.novel >= 8) { s.novel = 0; const pay = Math.round(120 + skillLv(s, 'creativity') * 140 * rrange(0.8, 1.3)); earn(pay, s); notify(`${s.first} finished a novel and sold it for ${fmtMoney(pay)}!`, '📚', s); addMoodlet(s, 'inspired'); return false; }
    } });
  },
};
IX.homework = {
  label: 'Do homework', icon: '📝', test: (s, o) => (o && o.broken ? 'Broken' : s.school ? (s.school.homework ? true : 'No homework today') : false),
  adverts: (s) => (s.school && s.school.homework ? { fun: 4, social: 0, room: 0, hunger: 0, homework: 1 } : null),
  run: function* (s, o, act) {
    const sc = s.school;
    yield* useDesk(s, act, o, o.type === 'computer' ? 'sitType' : 'sitWrite', { max: 70, rates: { fun: -6, comfort: 6 }, skill: 'logic', skillRate: 0.5, every: (dt) => { sc.hw = (sc.hw || 0) + dt; if (sc.hw >= 50) return false; } });
    if (sc.hw >= 50 && sc.homework) { sc.homework = false; sc.hw = 0; sc.perf += 1; if (s.household) floatText(s, '📝 Done!', '#8af0a0'); }
  },
};
IX.write = {
  label: 'Write in journal', icon: '✏️', test: (s) => ageOK(s, NOT_BABY), adverts: (s) => ({ fun: 12 }),
  run: function* (s, o, act) { yield* useDesk(s, act, o, 'sitWrite', { max: 45, rates: { fun: 14, comfort: 8 }, skill: 'creativity', skillRate: 0.4 }); },
};
IX.dance = {
  label: (s, o) => (o.on ? 'Dance' : 'Turn on & dance'), icon: '💃', test: (s, o) => ageOK(s, NOT_BABY),
  adverts: (s, o) => ({ fun: 22 + s.pers.active * 1.5 + (o.on ? 15 : 0), social: o.on ? 10 : 0 }),
  run: function* (s, o, act) {
    const [cx, cz] = localToWorld(o, rrange(-1.5, 1.5), rrange(1.4, 2.6));
    const i = yield* walkNear(s, act, cx, cz, 1);
    if (i < 0) return;
    if (!o.on) { o.on = true; music.stereo(true); }
    o.dancers = (o.dancers || 0) + 1;
    try {
      yield* useLoop(s, act, { anim: 'dance', max: act.user ? 120 : 60, rates: { fun: 34, energy: -6, hygiene: -3, social: 4 }, skill: 'body', skillRate: 0.25, until: () => s.needs.fun > 97 && !act.user, every: (dt) => { if (!o.on) return false; if (chance(dt * 0.02)) thought(s, '🎵', 1.5); } });
      if (s.needs.fun > 85) addMoodlet(s, 'partied');
    } finally { o.dancers--; }
  },
};
IX.stereoOff = { label: 'Turn off', icon: '🔇', test: (s, o) => (o.on ? true : false), run: function* (s, o, act) { if (!(yield* goStand(s, act, o, aroundSpots(o)))) return; yield* wait(s, act, 1, 'counter'); o.on = false; music.stereo(G.objects.some((x) => x.type === 'stereo' && x.on)); leaveSeat(s); } };

// ----- phone -----
IX.callFriend = {
  label: (s, o, p) => (p ? 'Call ' + p.first : 'Call a friend…'), icon: '📞',
  menu: (s, o) => knownSims(s).slice(0, 10).map((p) => ({ label: 'Call ' + p.first + ' (' + relLabel(s, p) + ')', arg: p })),
  test: (s, o, p) => (!p ? false : notBaby(s) && s.age !== 'child' ? (hourIn(hourF(), 7, 23) ? true : 'Too late to call') : false),
  adverts: (s) => null,
  run: function* (s, o, act, p) {
    if (!(yield* goStand(s, act, o))) return;
    sfx('dial');
    yield* wait(s, act, 1.5, 'phone');
    s.talking = true;
    const ok = chance(0.55 + relGet(p, s).f / 200 + p.pers.outgoing * 0.03);
    if (!ok) { s.talking = false; thought(s, '📵', 2, p.first + ' didn’t pick up'); leaveSeat(s); return; }
    yield* useLoop(s, act, { anim: 'phone', max: 25, rates: { social: 36, fun: 6 }, skill: 'charisma', skillRate: 0.2, every: (dt) => { relAdd(s, p, dt * 0.18); if (chance(dt * 0.25)) babble(s); if (chance(dt * 0.05)) speech(s, [INTEREST[rpick(s.interests)].icon], 1.6); } });
    s.talking = false;
    leaveSeat(s);
  },
};
IX.invite = {
  label: (s, o, p) => (p ? 'Invite ' + p.first + ' over' : 'Invite over…'), icon: '🏠',
  menu: (s, o) => knownSims(s).filter((p) => !p.onLot && !p.household).slice(0, 10).map((p) => ({ label: 'Invite ' + p.first + ' over (' + relLabel(s, p) + ')', arg: p })),
  test: (s, o, p) => (!p ? false : !canAdult(s) ? 'Too young' : p.onLot ? 'Already here' : !hourIn(hourF(), 8, 21) ? 'Too late to invite anyone' : true),
  run: function* (s, o, act, p) {
    if (!(yield* goStand(s, act, o))) return;
    sfx('dial'); yield* wait(s, act, 1.5, 'phone'); s.talking = true;
    yield* wait(s, act, 4, 'phone', (dt) => { if (chance(dt * 0.3)) babble(s); });
    s.talking = false; leaveSeat(s);
    const yes = relGet(p, s).f > -20 && chance(0.6 + relGet(p, s).f / 150 + p.pers.outgoing * 0.03);
    if (yes) { notify(`${p.first} is coming over.`, '🏠', s); scheduleVisit(p, G.t + rint(30, 70), s); }
    else notify(`${p.first} can’t come over right now.`, '📵', s);
  },
};
IX.party = {
  label: 'Throw a party ($150)', icon: '🎊',
  test: (s) => (!isGrown(s) || !s.household ? false : G.flags.party ? 'A party is already on' : !moneyOK(150) ? 'Costs $150 for food and drinks' : !hourIn(hourF(), 10, 21) ? 'Too late to throw a party' : knownSims(s).length < 2 ? 'Get to know some neighbours first' : true),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    sfx('dial'); yield* wait(s, act, 1.5, 'phone'); s.talking = true;
    yield* wait(s, act, 6, 'phone', (dt) => { if (chance(dt * 0.3)) babble(s, 0.6); }); s.talking = false; leaveSeat(s);
    spend(150);
    const until = Math.min(G.t + 330, Math.floor(G.t / 1440) * 1440 + 26 * 60);
    G.flags.party = { start: G.t, until, host: s.id };
    const guests = knownSims(s).filter((p) => !p.onLot).slice(0, 5);
    for (const p of rshuffle(G.sims.filter((p) => !p.household && !p.service && p.alive && !p.onLot && !guests.includes(p)))) { if (guests.length >= 7) break; if (chance(0.5)) guests.push(p); }
    guests.forEach((p) => scheduleVisit(p, G.t + rint(15, 70), s, true));
    const spot = surfaceSpotNear(s.x, s.z, 12) || surfaceSpotNear(s.x, s.z, 40);
    if (spot) addItem('meal', spot.x, spot.z, spot.y, { servings: 10, quality: 65, food: 0xd89a40 });
    const st = G.objects.find((x) => x.type === 'stereo'); if (st) { st.on = true; music.stereo(true); }
    notify(`${s.first} is throwing a party! ${guests.length} guests are on their way.`, '🎊', s, true);
  },
};
IX.pizza = {
  label: 'Order pizza ($40)', icon: '🍕', test: (s) => (!canAdult(s) ? 'Too young' : !moneyOK(40) ? 'Not enough money' : G.flags.pizzaComing ? 'Already on its way' : true),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    sfx('dial'); yield* wait(s, act, 1.5, 'phone'); s.talking = true;
    yield* wait(s, act, 3, 'phone', (dt) => { if (chance(dt * 0.3)) babble(s); }); s.talking = false; leaveSeat(s);
    G.flags.pizzaComing = G.t + rint(35, 55);
    notify('Pizza is on the way! Pay the delivery person at the door.', '🍕', s);
  },
};
IX.adopt = {
  label: 'Adopt a baby ($1,000)', icon: '🍼', test: (s) => (!isGrown(s) ? false : !s.household ? false : household().length >= 8 ? 'The house is full' : !moneyOK(1000) ? 'Costs $1,000' : G.flags.adoptDay ? 'Already arranged' : true),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    sfx('dial'); yield* wait(s, act, 1.5, 'phone'); s.talking = true; yield* wait(s, act, 8, 'phone', (dt) => { if (chance(dt * 0.3)) babble(s); }); s.talking = false; leaveSeat(s);
    spend(1000);
    G.flags.adoptDay = G.t + rint(600, 900); G.flags.adoptBy = s.id;
    notify('The adoption agency will bring a baby tomorrow.', '🍼', s);
  },
};
function knownSims(s) { return G.sims.filter((p) => p !== s && p.alive && !p.service && !p.household && relGet(s, p).met).sort((a, b) => relGet(s, b).f - relGet(s, a).f); }

// ----- skills & hobbies -----
function* readSomewhere(s, act, o, opts) {
  if (!(yield* goStand(s, act, o))) return;
  yield* wait(s, act, 1.5, 'counter'); leaveSeat(s);
  // find a comfy seat nearby to read in
  const seat = nearestObjs(s, (x) => x.def.seats && (x.def.cat === 'seating') && distTo(s, x) < 9 && seatSpots(x).some((sp) => !x.users[sp.i]))[0];
  let sat = null;
  if (seat && !act.cancel) sat = yield* goSit(s, act, seat);
  yield* useLoop(s, act, Object.assign({ anim: sat ? 'sitRead' : 'read' }, opts, { rates: Object.assign({}, opts.rates, sat ? { comfort: 10 } : {}) }));
  if (sat) yield* getUp(s);
}
IX.read = {
  label: 'Read a book', icon: '📗', test: (s) => ageOK(s, NOT_BABY), adverts: (s) => ({ fun: 14 + (10 - s.pers.playful) * 1.2 }),
  run: function* (s, o, act) { yield* readSomewhere(s, act, o, { max: act.user ? 120 : 60, rates: { fun: 18 }, until: () => s.needs.fun > 97 && !act.user, skill: 'logic', skillRate: 0.1 }); },
};
const skillTest = (s) => (s.age === 'baby' ? false : s.mood < -35 ? 'Not in the mood' : true);
IX.studyCooking = {
  label: 'Study cooking', icon: '🍳', test: (s) => (skillTest(s) === true && skillLv(s, 'cooking') >= 10 ? 'Already a master' : skillTest(s)),
  adverts: (s) => (s.household && s.mood > 0 ? { fun: 4, skill: 1 } : null),
  run: function* (s, o, act) { yield* readSomewhere(s, act, o, { max: act.user ? 180 : 60, rates: { fun: -4 }, skill: 'cooking' }); },
};
IX.studyMechanical = {
  label: 'Study mechanics', icon: '🔧', test: (s) => (skillTest(s) === true && skillLv(s, 'mechanical') >= 10 ? 'Already a master' : skillTest(s)),
  adverts: (s) => (s.household && s.mood > 0 ? { fun: 4, skill: 1 } : null),
  run: function* (s, o, act) { yield* readSomewhere(s, act, o, { max: act.user ? 180 : 60, rates: { fun: -4 }, skill: 'mechanical' }); },
};
IX.practiceSpeech = {
  label: 'Practise a speech', icon: '🗣️', test: (s) => (ageOK(s, ['teen', 'adult', 'elder', 'child']) ? skillTest(s) : false),
  adverts: (s) => (s.household && s.mood > 0 ? { fun: 5 + s.pers.outgoing * 0.5, skill: 1 } : null),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o))) return; s.talking = true; yield* useLoop(s, act, { anim: 'speech', max: act.user ? 180 : 60, rates: { fun: 4, social: 3 }, skill: 'charisma', every: (dt) => { if (chance(dt * 0.15)) babble(s, 0.5); } }); s.talking = false; leaveSeat(s); },
};
IX.workout = {
  label: 'Work out', icon: '🏋️', test: (s) => (ageOK(s, ['teen', 'adult', 'elder']) ? (s.needs.energy < 15 ? 'Too tired' : skillTest(s)) : false),
  adverts: (s) => (s.mood > -10 ? { fun: 6 + s.pers.active * 2, skill: 1 } : null),
  run: function* (s, o, act) {
    if (!(yield* goLie(s, act, o))) return;
    yield* useLoop(s, act, { anim: 'bench', max: act.user ? 120 : 60, rates: { fun: 6 + s.pers.active, energy: -12, hygiene: -14, hunger: -6 }, skill: 'body', skillRate: 1.2, every: (dt) => { if (s.needs.energy < 8 || s.needs.hygiene < 5) return false; if (chance(dt * 0.03)) thought(s, '💪', 1.5); } });
    addMoodlet(s, 'workedOut');
    yield* getUp(s);
  },
};
IX.chess = {
  label: 'Play chess', icon: '♟️', test: (s, o) => (ageOK(s, NOT_BABY) ? (seatSpots(o).some((sp) => !o.users[sp.i]) ? true : 'No free seat') : false),
  adverts: (s, o) => ({ fun: 14 + (10 - s.pers.playful) * 1.2 + (Object.keys(o.users).length ? 14 : 0), social: Object.keys(o.users).length ? 14 : 0, skill: 0.5 }),
  run: function* (s, o, act) {
    if (!(yield* goSit(s, act, o))) return;
    yield* useLoop(s, act, { anim: 'sitChess', max: act.user ? 120 : 60, skill: 'logic', rates: () => { const opp = chessOpponent(o, s); return opp ? { fun: 24, social: 16, comfort: 6 } : { fun: 12, comfort: 6 }; },
      every: (dt) => { const opp = chessOpponent(o, s); if (opp) { relAdd(s, opp, dt * 0.06); if (chance(dt * 0.02)) speech(s, ['♟️'], 1.4); } if (chance(dt * 0.01)) thought(s, '🤔', 1.5); } });
    yield* getUp(s);
  },
};
function chessOpponent(o, s) { for (const k in o.users) { const id = o.users[k]; if (id !== s.id) { const p = simById(id); if (p && p.posture === 'sit') return p; } } return null; }
IX.paint = {
  label: 'Paint', icon: '🎨', test: (s) => (ageOK(s, NOT_BABY) ? skillTest(s) : false),
  adverts: (s) => (s.mood > -10 ? { fun: 10 + s.pers.playful * 0.6, skill: 1 } : null),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o))) return;
    yield* useLoop(s, act, { anim: 'paint', max: act.user ? 180 : 60, rates: { fun: 12 }, skill: 'creativity', every: (dt) => {
      s.painting += dt / 60 * (0.7 + skillLv(s, 'creativity') * 0.1);
      if (o.canvasMesh) o.canvasMesh.material = mat(mixHex(0xf8f6f0, [0xe8883a, 0x3a7ac8, 0x5aa850, 0xd86aa0][o.id % 4], clamp(s.painting / 3, 0, 1)));
      if (s.painting >= 3) {
        s.painting = 0;
        const v = Math.round(20 + skillLv(s, 'creativity') ** 1.6 * 18 * rrange(0.7, 1.3));
        if (s.household) { earn(v, s); notify(`${s.first} finished a painting and sold it for ${fmtMoney(v)}.`, '🖼️', s); }
        if (o.canvasMesh) o.canvasMesh.material = mat(0xf8f6f0);
        addMoodlet(s, 'inspired');
      }
    } });
    leaveSeat(s);
  },
};
IX.piano = {
  label: 'Play the piano', icon: '🎹', test: (s) => (ageOK(s, NOT_BABY) ? skillTest(s) : false),
  adverts: (s) => (s.mood > -10 ? { fun: 14 + skillLv(s, 'creativity'), skill: 1 } : null),
  run: function* (s, o, act) {
    if (!(yield* goSit(s, act, o))) return;
    o.on = true;
    try {
      yield* useLoop(s, act, { anim: 'sitPiano', max: act.user ? 120 : 60, rates: { fun: 16 + skillLv(s, 'creativity') }, skill: 'creativity', every: (dt) => { if (chance(dt * 2.5)) pianoNote(s, skillLv(s, 'creativity'), o); if (chance(dt * 0.02)) thought(s, '🎵', 1.4); } });
    } finally { o.on = false; }
    yield* getUp(s);
  },
};
IX.stargaze = {
  label: 'Stargaze', icon: '🔭', test: (s) => (ageOK(s, NOT_BABY) ? (isDark() ? skillTest(s) : 'Wait until dark') : false),
  adverts: (s) => (isDark() && s.mood > -10 ? { fun: 12, skill: 1 } : null),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o))) return; yield* useLoop(s, act, { anim: 'stargaze', max: act.user ? 120 : 60, rates: { fun: 14 }, skill: 'logic', skillRate: 1.2, every: (dt) => { if (!isDark()) return false; if (chance(dt * 0.006)) { thought(s, '🛸', 2.5); addMoodlet(s, 'inspired'); } } }); leaveSeat(s); },
};
IX.watchFish = {
  label: 'Watch the fish', icon: '🐠', test: (s) => notBaby(s), adverts: (s) => ({ fun: 9, comfort: 0 }),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o))) return; yield* useLoop(s, act, { anim: 'idle', max: 25, rates: { fun: 14 } }); leaveSeat(s); },
};
IX.feedFish = {
  label: 'Feed the fish', icon: '🐟', test: (s, o) => (notBaby(s) ? (o.fish > 80 ? 'They’re full' : true) : false), adverts: (s, o) => (o.fish < 40 ? { room: 10 } : null),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o))) return; yield* wait(s, act, 3, 'water'); o.fish = 100; leaveSeat(s); },
};
IX.playToys = {
  label: 'Play with toys', icon: '🧸', test: (s) => (s.age === 'child' ? true : s.age === 'teen' ? 'Too cool for toys' : isGrown(s) ? 'For children' : false),
  adverts: (s) => ({ fun: 34, social: 0 }),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o))) return; yield* useLoop(s, act, { anim: 'toys', max: act.user ? 120 : 60, rates: { fun: 36 }, skill: 'creativity', skillRate: 0.4, until: () => s.needs.fun > 97 && !act.user }); leaveSeat(s); },
};
IX.playDollhouse = {
  label: 'Play with the doll house', icon: '🏠', test: (s) => ageOK(s, NOT_BABY), adverts: (s) => ({ fun: s.age === 'child' ? 30 : 12, skill: 0.5 }),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o))) return; yield* useLoop(s, act, { anim: s.age === 'child' ? 'toys' : 'counter', max: 60, rates: { fun: s.age === 'child' ? 30 : 14 }, skill: 'creativity' }); leaveSeat(s); },
};
IX.swing = {
  label: 'Swing', icon: '🎠', test: (s, o) => (ageOK(s, NOT_BABY) ? (Object.keys(o.users).length >= 2 ? 'Both swings taken' : true) : false),
  adverts: (s) => ({ fun: s.age === 'child' ? 40 : 18 + s.pers.playful }),
  run: function* (s, o, act) {
    const seat = o.users.L ? 'R' : 'L';
    const lx = seat === 'L' ? -0.45 : 0.45;
    const [ax, az] = localToWorld(o, lx, 1);
    const i = yield* walkTo(s, act, [[Math.floor(ax), Math.floor(az)]]); if (i < 0 || o.users[seat]) return;
    o.users[seat] = s.id; s.seat = { o, key: seat }; s.seatAp = [s.x, s.z];
    const [sx, sz] = localToWorld(o, lx, 0);
    s.posture = 'sit'; s.seatH = 0.45;
    yield* slide(s, sx, sz, worldAngle(o, 0), 0.5);
    const swingM = []; o.model.traverse((c) => { if (c.userData.swing) swingM.push(c); });
    const sw = swingM[seat === 'L' ? 0 : 1];
    try {
      yield* useLoop(s, act, { anim: 'swing', max: act.user ? 90 : 45, rates: { fun: s.age === 'child' ? 40 : 24 }, every: () => { const a = Math.sin(s.animT * 2.2) * 0.5; if (sw) sw.rotation.x = a; s.x = sx + Math.sin(worldAngle(o, 0)) * Math.sin(a) * 1.4; s.z = sz + Math.cos(worldAngle(o, 0)) * Math.sin(a) * 1.4; s.y = (1 - Math.cos(a)) * 1.45; } });
    } finally { if (sw) sw.rotation.x = 0; s.y = 0; }
    yield* getUp(s);
  },
};
IX.water = {
  label: 'Water', icon: '💧', test: (s, o) => (o.dead ? 'It’s too late…' : notBaby(s) ? (o.water > 85 ? 'Doesn’t need water' : true) : false),
  adverts: (s, o) => (s.household && o.water < 50 ? { room: 18 + s.pers.neat * 1.5 + (50 - o.water) * 0.4 } : null),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o, o.def.noblock ? aroundSpots(o).concat(standSpots(o)) : null))) return; yield* wait(s, act, 3, 'water'); o.water = 100; o._wilt = false; applyObjectLook(o); leaveSeat(s); },
};
IX.changeLook = {
  label: 'Change appearance', icon: '👕', test: (s) => (s.household && notBaby(s) ? true : false),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o))) return; yield* wait(s, act, 2, 'fridge'); leaveSeat(s); if (s.household) openLookEditor(s); },
};
IX.mourn = {
  label: 'Mourn', icon: '🖤', test: (s) => notBaby(s), adverts: (s) => (hasMoodlet(s, 'grieving') ? { social: 15 } : null),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o, aroundSpots(o)))) return; yield* useLoop(s, act, { anim: 'sad', max: 30, rates: { social: 10 } }); s.moodlets = s.moodlets.filter((m) => m.id !== 'grieving'); leaveSeat(s); },
};

// ----- mailbox -----
IX.payBills = {
  label: (s) => { const b = G.bills.filter((x) => !x.paid); return b.length ? 'Pay bills (' + fmtMoney(b.reduce((a, x) => a + x.amount, 0)) + ')' : 'Pay bills'; },
  icon: '🧾', test: (s) => (!s.household || !canAdult(s) ? false : !G.bills.some((b) => !b.paid) ? 'No bills to pay' : true),
  adverts: (s) => (s.household && isGrown(s) && G.bills.some((b) => !b.paid && G.t - b.t > 600) && G.money >= G.bills.filter((b) => !b.paid).reduce((a, b) => a + b.amount, 0) ? { room: 25 } : null),
  run: function* (s, o, act) {
    if (!(yield* goStand(s, act, o, aroundSpots(o)))) return;
    yield* wait(s, act, 3, 'water'); leaveSeat(s);
    let paid = 0, short = false;
    for (const b of G.bills) if (!b.paid) { if (G.money >= b.amount) { spend(b.amount); b.paid = true; paid += b.amount; } else short = true; }
    if (paid) notify(`${s.first} paid ${fmtMoney(paid)} in bills.`, '🧾', s);
    if (short) notify('Not enough money to pay all the bills!', '⚠️', s);
    G.bills = G.bills.filter((b) => !b.paid);
  },
};
IX.jobAds = {
  label: 'Read the job ads', icon: '📰', test: (s) => (!s.household ? false : isGrown(s) ? true : s.school ? 'Goes to school' : false),
  run: function* (s, o, act) { if (!(yield* goStand(s, act, o, aroundSpots(o)))) return; yield* wait(s, act, 4, 'read'); leaveSeat(s); jobDialog(s, 3); },
};

// ----- baby care -----
const babyIn = (o) => G.sims.find((b) => b.alive && b.age === 'baby' && b.crib === o.id);
function* babyCare(s, act, o, anim, rates, babyRates, min) {
  const baby = babyIn(o);
  if (!baby) return;
  if (!(yield* goStand(s, act, o))) return;
  s.talking = anim === 'speech';
  yield* useLoop(s, act, { anim: 'baby', max: min, rates, every: (dt) => { addNeeds(baby, babyRates, dt); relAdd(s, baby, dt * 0.15); if (chance(dt * 0.15)) hearts(baby); } });
  s.talking = false;
  leaveSeat(s);
}
const babyTest = (s, o, need) => (!babyIn(o) ? false : !ageOK(s, ['teen', 'adult', 'elder']) ? 'Too young' : true);
IX.babyFeed = { label: 'Feed baby', icon: '🍼', test: (s, o) => babyTest(s, o), adverts: (s, o) => { const b = babyIn(o); return b && b.needs.hunger < 60 ? { social: 10, room: 35 + (60 - b.needs.hunger) } : null; },
  run: function* (s, o, act) { yield* babyCare(s, act, o, 'baby', { social: 4 }, { hunger: 240 }, 12); } };
IX.babyPlay = { label: 'Play with baby', icon: '🧸', test: (s, o) => (babyIn(o) ? ageOK(s, NOT_BABY) || false : false), adverts: (s, o) => { const b = babyIn(o); return b && (b.needs.social < 60 || b.needs.fun < 60) ? { fun: 14, social: 14, room: 20 } : { fun: 6, social: 6 }; },
  run: function* (s, o, act) { yield* babyCare(s, act, o, 'baby', { fun: 18, social: 14 }, { social: 160, fun: 160 }, 15); } };
IX.babyChange = { label: 'Change diaper', icon: '🧷', test: (s, o) => babyTest(s, o), adverts: (s, o) => { const b = babyIn(o); return b && b.needs.hygiene < 50 ? { room: 30 + (50 - b.needs.hygiene) } : null; },
  run: function* (s, o, act) { yield* babyCare(s, act, o, 'baby', { hygiene: -5 }, { hygiene: 600 }, 8); } };
IX.babySing = { label: 'Sing a lullaby', icon: '🎶', test: (s, o) => babyTest(s, o), adverts: (s, o) => { const b = babyIn(o); return b && b.needs.energy < 50 ? { social: 6, room: 20 } : null; },
  run: function* (s, o, act) { yield* babyCare(s, act, o, 'speech', { social: 6 }, { energy: 200, social: 60 }, 12); } };

// ----- items & misc targets -----
IX.grabSlice = {
  label: 'Grab a slice', icon: '🍕', test: (s, it) => (notBaby(s) && it.servings > 0 ? true : false), adverts: (s, it) => ({ hunger: 40 }),
  run: function* (s, it, act) {
    const i = yield* walkNear(s, act, it.x, it.z, 1); if (i < 0 || it.servings <= 0 || !G.items.includes(it)) return;
    yield* turnTo(s, angleTo(s, it.x, it.z)); yield* wait(s, act, 1, 'counter');
    it.servings--; if (it.servings <= 0) { it.dirty = true; refreshItem(it); }
    yield* eatMeal(s, act, { hunger: 40, color: 0xe8a040, quality: 60 });
  },
};
