// Creature Feature — the people of Pine Hollow: who they are, where they go, what they notice, how they run, hide,
// bolt doors and drive away, and how they look afterwards

const PEOPLE = { list: [], next: 1, corpses: [] };
const CALM = { idle: 1, walk: 1, sit: 1 };
// states: idle, walk, flee, inside, incar, trance, cower, down, blind, held, snared, thrown, dead, gone
function spawnPerson(type, x, z, o = {}) {
  if (!type) type = Math.random() < 0.035 ? 'scientist' : pick(FOLK_COMMON);
  const look = folkLook(type, RNG((Math.random() * 1e9) | 0));
  const M = buildHuman(look);
  const F = FOLK[type];
  const v = {
    id: PEOPLE.next++, type, look, M, x, z, y: terrainH(x, z), yaw: o.yaw === undefined ? rr(-Math.PI, Math.PI) : o.yaw, speed: 0, state: 'idle', t: 0,
    path: null, pi: 0, dest: null, alert: 0, stam: F.stam, stamMax: F.stam, spd: F.spd, phase: rr(0, 6), mode: 'idle', refuge: null, inside: null, car: o.car || null,
    scared: 0, screamT: 0, plan: 0, stuckT: 0, lx: x, lz: z, tripT: 0, flushedT: -99, spurt: 0, fed: false, perc: Math.random() * 0.2, lookYaw: 0,
    sayT: 0, line: '', idleT: rr(15, 50), sit: false, lastMx: 0, lastMz: 0, hidden: false, by: null,
  };
  M.root.position.set(x, v.y, z); M.root.rotation.y = v.yaw;
  R.scene.add(M.root);
  PEOPLE.list.push(v);
  if (o.incar) { boardCar(v, o.incar, true); }
  else if (o.dest) goTo(v, o.dest);
  else if (o.state) v.state = o.state;
  if (o.sit) { v.sit = true; v.y += o.sitY || 0; }
  if (o.face !== undefined) v.yaw = o.face;
  return v;
}
function setHidden(v, h) { v.hidden = h; v.M.root.visible = !h; }
function say(v, text, dur = 2.2) { v.line = text; v.sayT = dur; }
function monsterWord() { return pick(LINES.monster[G.monster]); }
function goTo(v, dest) {
  v.dest = dest; v.path = route(v.x, v.z, dest.x, dest.z); v.pi = 0; v.state = 'walk'; v.sit = false;
}
function randomPoi(v, near = 160) {
  const opts = TOWN.pois.filter((p) => dist(p.x, p.z, v.x, v.z) < near && dist(p.x, p.z, v.x, v.z) > 8 && p.kind !== 'grave');
  return opts.length ? pick(opts) : pick(TOWN.pois);
}
function boardCar(v, c, quiet) {
  v.state = 'incar'; v.car = c; c.occ.push(v); setHidden(v, true); v.x = c.x; v.z = c.z;
  if (!quiet && c.state === 'parked' && c.state !== 'wreck') { c.startT = 0.9; }
}
function escapePerson(v) {
  if (v.state === 'gone' || v.state === 'dead') return;
  v.state = 'gone'; setHidden(v, true); R.scene.remove(v.M.root);
  bus.emit('escaped', v);
}

// ---------- perception ----------
// how far this person could make you out right now
function sightRange(v) {
  if (!P) return 0;
  let r = 26 * (0.45 + lightAt(P.x, P.z) * 1.1) * MONSTERS[G.monster].sight;
  if (P.stalk) r *= 0.5; else if (P.running) r *= 1.25;
  if (P.form === 'bat') r *= P.y - terrainH(P.x, P.z) > 8 ? 0.35 : 0.7;
  if (P.storm > 0) r *= 0.25;
  if (inCorn(P.x, P.z)) r *= 0.3;
  return r * (1 + G.panic / 160);
}
function canSee(v, d) {
  const dx = P.x - v.x, dz = P.z - v.z;
  const fa = Math.abs(angWrap(yawOf(dx, dz) - v.yaw));
  const hear = P.stalk ? 1.5 : P.running && P.onGround ? 9 : 3.5;
  if (d > hear && fa > 1.35) return false;
  return losClear(v.x, v.y + 1.6, v.z, P.x, P.y + 1.2, P.z);
}
function perceive(v, dt) {
  if (!P || P.dead || v.state === 'dead' || v.state === 'gone') return;
  const calm = CALM[v.state] || v.state === 'inside' || v.state === 'incar';
  if (!calm) return;
  if (v.state === 'inside') return;
  if (P.storm > 0 && dist2(v.x, v.z, P.x, P.z) < 16 * 16) return;
  const d = dist(v.x, v.z, P.x, P.z);
  const sr = sightRange(v);
  if (d > sr && d > 9) { v.alert = Math.max(0, v.alert - dt * 0.15); return; }
  if (canSee(v, d)) {
    v.alert += dt * (2.2 * (1 - d / Math.max(sr, 1)) + 0.5) * (d < 5 ? 3 : 1);
    v.lastMx = P.x; v.lastMz = P.z;
    if (v.alert > 0.3 && v.state !== 'incar') { v.lookYaw = yawOf(P.x - v.x, P.z - v.z); if (v.sayT <= 0 && v.alert < 0.8 && chance(0.15)) say(v, pick(["Who's there?", 'Hello?', 'Is somebody there?', 'Harold, is that you?'])); }
    if (v.alert >= 1) startle(v, P.x, P.z);
  } else v.alert = Math.max(0, v.alert - dt * 0.1);
}
// they've seen you (or heard a scream): run, and scream so others know
function startle(v, mx, mz, quiet) {
  if (v.state === 'dead' || v.state === 'gone' || v.state === 'held' || v.state === 'snared' || v.state === 'thrown') return;
  v.alert = 1; v.lastMx = mx; v.lastMz = mz;
  if (v.state === 'incar') {
    const c = v.car;
    if (c && c.state === 'parked' && c.occ[0] === v) { c.startT = 0.6 + Math.random() * 0.6; say(v, pick(LINES.car)); }
    return;
  }
  if (v.state === 'inside') return;
  const was = v.state;
  v.state = 'flee'; v.t = 0; v.plan = 0; v.sit = false;
  // caught face to face: a moment frozen in horror before the legs work
  if (P && (was === 'idle' || was === 'walk') && dist(v.x, v.z, P.x, P.z) < 4.5) { v.state = 'cower'; v.cowerT = 0.7; v.howled = false; }
  if (was === 'idle' || was === 'walk') { v.y = supportY(v.x, v.z, v.y + 0.5); }
  if (!quiet && v.screamT <= 0) {
    v.screamT = 6;
    say(v, pick(LINES.spot).replace('{m}', monsterWord()), 2.6);
    AUDIO.scream(v.x, v.z, v.look.f, 0.7);
    bus.emit('scream', v);
    // everyone in earshot hears it
    for (const o of PEOPLE.list) {
      if (o === v || !(CALM[o.state] || o.state === 'incar')) continue;
      const d = dist(o.x, o.z, v.x, v.z);
      if (d < 14) startle(o, mx, mz, true);
      else if (d < 32) { o.alert = Math.max(o.alert, 0.65); o.lookYaw = yawOf(v.x - o.x, v.z - o.z); }
    }
  }
}
// anyone who can see the spot where someone just died runs
function witness(x, z) {
  for (const o of PEOPLE.list) {
    if (!(CALM[o.state] || o.state === 'incar' || o.state === 'flee')) continue;
    const d = dist(o.x, o.z, x, z);
    if (d > 45 || o.state === 'flee') continue;
    if (d < 12 || losClear(o.x, o.y + 1.6, o.z, x, 1, z)) startle(o, x, z, d > 20);
  }
}

// ---------- fleeing ----------
function planFlee(v) {
  const mx = P ? P.x : v.lastMx, mz = P ? P.z : v.lastMz;
  const dm = dist(v.x, v.z, mx, mz);
  let best = null, bc = 1e9;
  const danger = (tx, tz) => {
    const dv = dist(v.x, v.z, tx, tz), dmt = dist(mx, mz, tx, tz);
    let c = dv;
    if (dmt < dv) c += 120;
    const a = Math.abs(angWrap(yawOf(tx - v.x, tz - v.z) - yawOf(mx - v.x, mz - v.z)));
    if (a < 0.8 && dm < dv) c += 90;
    if (dmt < 12) c += 60;
    return c;
  };
  for (const r of TOWN.refuges) {
    if (r.broken || r.occ.length >= r.cap) continue;
    const d = dist(v.x, v.z, r.ax, r.az);
    if (d > 75) continue;
    const c = danger(r.ax, r.az) * 1.15 + (r.lastBroke && G.t - r.lastBroke < 60 ? 80 : 0);
    if (c < bc) { bc = c; best = { kind: 'refuge', r }; }
  }
  const cars = v.car ? [v.car] : [];
  for (const c of CARS.list) if (!c.dead && c.state === 'parked' && !c.occ.length && dist2(c.x, c.z, v.x, v.z) < 25 * 25 && !c.police) cars.push(c);
  for (const c of cars) {
    if (c.dead || c.state === 'wreck' || c.state === 'flying' || c.state === 'held') continue;
    const d = dist(v.x, v.z, c.x, c.z);
    if (d > 45) continue;
    const cc = danger(c.x, c.z) * 0.9 - (c === v.car ? 12 : 0);
    if (cc < bc) { bc = cc; best = { kind: 'car', c }; }
  }
  if (!best || bc > 160) {
    // just run: the road node that gets furthest from the monster
    let bn = null, bs = -1e9;
    for (const n of WORLD.nodes) {
      const dn = dist(v.x, v.z, n.x, n.z); if (dn > 110 || dn < 10) continue;
      const s = dist(mx, mz, n.x, n.z) - dn * 0.6;
      if (s > bs) { bs = s; bn = n; }
    }
    if (bn) best = { kind: 'run', x: bn.x, z: bn.z };
  }
  v.goal = best; v.plan = 1.5;
  if (!best) { v.path = [[v.x + (v.x - mx), v.z + (v.z - mz)]]; v.pi = 0; return; }
  if (best.kind === 'refuge') { v.path = route(v.x, v.z, best.r.ax, best.r.az); v.path.push([best.r.x + best.r.nx * 0.5, best.r.z + best.r.nz * 0.5]); }
  else if (best.kind === 'car') { const c = best.c, sx = c.x + Math.cos(c.yaw) * -1.6, sz = c.z - Math.sin(c.yaw) * -1.6; v.path = dist(v.x, v.z, c.x, c.z) < 18 ? [[sx, sz]] : route(v.x, v.z, sx, sz); }
  else v.path = route(v.x, v.z, best.x, best.z);
  // if the first leg runs at the monster, skip to a later point
  v.pi = 0;
  while (v.pi < v.path.length - 1) {
    const p = v.path[v.pi];
    if (dist(p[0], p[1], mx, mz) < dist(p[0], p[1], v.x, v.z) && dist(v.x, v.z, mx, mz) < 25) v.pi++; else break;
  }
}
function fleeStep(v, dt) {
  v.plan -= dt;
  const mx = P ? P.x : v.lastMx, mz = P ? P.z : v.lastMz, dm = dist(v.x, v.z, mx, mz);
  if (v.plan <= 0 || !v.path) planFlee(v);
  // sprint while there's breath, then jog
  const sprint = v.stam > 0;
  if (sprint) v.stam = Math.max(0, v.stam - dt); else v.stam = Math.min(v.stamMax, v.stam + dt * 0.25);
  let sp = (sprint ? 5.7 : 3.4) * v.spd * (v.blind > 0 ? 0.45 : 1);
  if (v.stam <= 0 && dm < 5 && !v.adrenaline) { v.adrenaline = true; v.stam = 1.2; }
  const wp = v.path && v.path[v.pi];
  let dx = 0, dz = 0;
  if (wp) {
    dx = wp[0] - v.x; dz = wp[1] - v.z; const d = Math.hypot(dx, dz);
    if (d < 1.0) { v.pi++; if (v.pi >= v.path.length) { arriveFlee(v); return; } }
    dx /= d || 1; dz /= d || 1;
  }
  if (dm < 9) { const w = (9 - dm) / 9 * 1.3; dx += (v.x - mx) / dm * w; dz += (v.z - mz) / dm * w; }
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  if (v.blind > 0) { dx = Math.sin(G.t * 0.7 + v.id); dz = Math.cos(G.t * 0.9 + v.id * 2); }
  moveAgent(v, dx * sp, dz * sp, dt);
  v.mode = dm < 12 && !sprint ? 'panic' : dm < 12 ? (v.id % 3 === 0 ? 'panic' : 'run') : 'run';
  // stumbling in the dark with a monster on your heels
  v.tripT -= dt;
  if (dm < 7 && v.tripT <= 0) { v.tripT = 1; if (chance(0.05 * (v.spd < 0.9 ? 1.6 : 1))) knockDown(v, 1.5, true); }
  // stuck on something: shake loose and re-plan
  v.stuckT += dt;
  if (v.stuckT > 1) { if (dist(v.x, v.z, v.lx, v.lz) < 0.5) { v.plan = 0; v.x += rr(-1, 1); v.z += rr(-1, 1); } v.stuckT = 0; v.lx = v.x; v.lz = v.z; }
  // calm down if the monster is long gone
  if (dm > 70 && v.t > 12) { v.state = 'walk'; goTo(v, randomPoi(v)); v.alert = 0.4; }
}
function arriveFlee(v) {
  const g = v.goal;
  if (g && g.kind === 'refuge' && !g.r.broken && g.r.occ.length < g.r.cap) {
    v.state = 'inside'; v.inside = g.r; g.r.occ.push(v); setHidden(v, true); v.insideT = 0;
    AUDIO.sfx('slam', g.r.x, g.r.z);
    bus.emit('hid', v, g.r);
    return;
  }
  if (g && g.kind === 'car' && !g.c.dead && g.c.state !== 'wreck' && g.c.state !== 'flying' && g.c.state !== 'held') {
    boardCar(v, g.c);
    if (g.c.state === 'parked') g.c.startT = 0.7;
    AUDIO.sfx('slam', v.x, v.z);
    return;
  }
  v.plan = 0;
}
// move with collisions, face the way you're going
function moveAgent(v, vx, vz, dt) {
  let r = collide(v.x + vx * dt, v.z + vz * dt, 0.3, v.y);
  // blocked head-on: try veering left or right
  const want = Math.hypot(vx, vz) * dt;
  if (r.hit && want > 0 && dist(r.x, r.z, v.x, v.z) < want * 0.3) {
    const s = v.id % 2 ? 1 : -1;
    for (const a of [s * 1.0, -s * 1.0, s * 1.8]) {
      const c = Math.cos(a), sn = Math.sin(a), ax = vx * c - vz * sn, az = vx * sn + vz * c;
      const q = collide(v.x + ax * dt, v.z + az * dt, 0.3, v.y);
      if (dist(q.x, q.z, v.x, v.z) > want * 0.5) { r = q; vx = ax; vz = az; break; }
    }
  }
  v.x = r.x; v.z = r.z;
  v.y = damp(v.y, supportY(v.x, v.z, v.y + 0.4), 20, dt);
  v.speed = Math.hypot(vx, vz);
  if (v.speed > 0.2) v.yaw = angTo(v.yaw, yawOf(vx, vz), dt * 10);
  v.phase += dt * v.speed * 2.6;
}
function knockDown(v, t, tripped) {
  if (v.state === 'dead' || v.state === 'gone' || v.state === 'held') return;
  v.state = 'down'; v.t = 0; v.downT = t; v.tripped = tripped; v.fallDir = rr(-0.3, 0.3);
  if (tripped) { say(v, pick(['Ow! My ankle!', 'No, no, no!', 'Help me up!'])); AUDIO.sfx('thud', v.x, v.z); }
}

// ---------- the main update ----------
function updatePeople(dt) {
  for (const v of PEOPLE.list) {
    if (v.state === 'gone') continue;
    v.t += dt; v.sayT -= dt; v.screamT -= dt;
    if (v.state === 'dead') { updateCorpse(v, dt); continue; }
    v.perc -= dt;
    if (v.perc <= 0) { v.perc = 0.2; perceive(v, 0.2); }
    switch (v.state) {
      case 'idle': {
        v.speed = 0; v.mode = v.sit ? 'sit' : v.talk ? 'talk' : 'idle';
        if (v.alert > 0.3) v.yaw = angTo(v.yaw, v.lookYaw, dt * 3);
        v.idleT -= dt;
        if (v.idleT <= 0 && v.alert < 0.3) { v.idleT = rr(20, 60); if (chance(0.7)) goTo(v, randomPoi(v)); }
        break;
      }
      case 'walk': {
        const wp = v.path && v.path[v.pi];
        if (!wp) { v.state = 'idle'; v.idleT = rr(15, 45); if (v.dest) { if (v.dest.face !== undefined) v.yaw = v.dest.face; v.talk = ['diner', 'crowd', 'gas', 'drivein', 'street'].includes(v.dest.kind) && chance(0.6); v.sit = (v.dest.kind === 'porch' || v.dest.kind === 'park') && chance(0.5); } break; }
        const dx = wp[0] - v.x, dz = wp[1] - v.z, d = Math.hypot(dx, dz);
        if (d < 0.8) { v.pi++; break; }
        const sp = 1.35 * (v.type === 'grandpa' ? 0.7 : 1);
        if (v.alert > 0.3) { v.speed = 0; v.yaw = angTo(v.yaw, v.lookYaw, dt * 4); v.mode = 'idle'; break; }
        moveAgent(v, dx / d * sp, dz / d * sp, dt); v.mode = 'walk';
        break;
      }
      case 'flee': fleeStep(v, dt); break;
      case 'inside': {
        v.insideT += dt;
        // when things are quiet again they may come back out
        if (v.insideT > 40 && G.panic < 35 && P && dist(P.x, P.z, v.inside.x, v.inside.z) > 45 && chance(dt * 0.02)) leaveRefuge(v, false);
        break;
      }
      case 'incar': { const c = v.car; if (c) { v.x = c.x; v.z = c.z; v.y = c.y; if (c.startT !== undefined && c.occ[0] === v) { c.startT -= dt; if (c.startT <= 0) { c.startT = undefined; startDriving(c); } } } break; }
      case 'trance': {
        v.mode = 'trance';
        v.tranceT -= dt;
        if (P) { const dx = P.x - v.x, dz = P.z - v.z, d = Math.hypot(dx, dz); if (d > 1.4) moveAgent(v, dx / d * 2.6, dz / d * 2.6, dt); else { v.speed = 0; v.yaw = yawOf(dx, dz); } }
        if (v.tranceT <= 0) { v.alert = 1; startle(v, v.lastMx, v.lastMz); }
        break;
      }
      case 'cower': { v.speed = 0; v.mode = 'cower'; v.cowerT -= dt; if (v.cowerT <= 0) startle(v, P ? P.x : v.lastMx, P ? P.z : v.lastMz, true); break; }
      case 'down': {
        v.speed = 0; v.downT -= dt; v.mode = 'down';
        if (v.downT <= 0) { v.state = 'flee'; v.plan = 0; v.M.root.rotation.x = 0; v.M.root.rotation.z = 0; }
        break;
      }
      case 'blind': {
        v.blindT -= dt; v.mode = 'trance';
        const a = G.t * 0.8 + v.id * 1.7;
        moveAgent(v, Math.sin(a) * 1.4, Math.cos(a * 1.3) * 1.4, dt);
        if (v.blindT <= 0) { v.blind = 0; startle(v, P ? P.x : v.lastMx, P ? P.z : v.lastMz, true); }
        break;
      }
      case 'snared': {
        // reeled in by the bandage
        if (!P) { v.state = 'flee'; break; }
        const dx = P.x - v.x, dz = P.z - v.z, d = Math.hypot(dx, dz);
        v.mode = 'drag';
        if (d > 1.3) { const sp = Math.min(d / dt, 16); v.x += dx / d * sp * dt; v.z += dz / d * sp * dt; v.y = supportY(v.x, v.z, v.y + 0.5); v.yaw = yawOf(dx, dz) + Math.PI; }
        else { v.state = 'held'; v.by = P; }
        break;
      }
      case 'held': v.mode = 'held'; break;
      case 'thrown': throwStep(v, dt); break;
    }
    // the poses
    if (v.state === 'down') {
      const k = clamp(v.t / 0.35, 0, 1);
      v.M.root.rotation.x = -k * Math.PI / 2 * 0.95; v.M.root.rotation.z = v.fallDir;
      poseHuman(v.M, 'idle', 0, 0, G.t);
      v.M.armL.rotation.x = -2.6; v.M.armR.rotation.x = -2.2; v.M.root.position.y = v.y + 0.12 * k;
    } else if (v.state !== 'thrown') {
      poseHuman(v.M, v.mode, v.phase, v.speed, G.t + v.id);
      v.M.root.position.y = v.y;
    }
    if (v.state !== 'thrown') { v.M.root.position.x = v.x; v.M.root.position.z = v.z; if (v.state !== 'down') v.M.root.rotation.y = v.yaw; }
  }
}
function leaveRefuge(v, flushed) {
  const r = v.inside;
  if (!r) return;
  r.occ.splice(r.occ.indexOf(v), 1);
  v.inside = null;
  v.x = r.x + r.nx * rr(0.8, 1.6) + rr(-0.6, 0.6); v.z = r.z + r.nz * rr(0.8, 1.6) + rr(-0.6, 0.6); v.y = supportY(v.x, v.z, 2);
  v.yaw = yawOf(r.nx, r.nz); v.state = 'idle';
  setHidden(v, false);
  if (flushed) { v.flushedT = G.t; startle(v, P ? P.x : v.x, P ? P.z : v.z, false); v.stam = v.stamMax; }
  else { v.alert = 0; goTo(v, randomPoi(v)); }
}
// the monster tears the door off: everyone inside bolts
function breakRefuge(r) {
  r.broken = true; r.lastBroke = G.t;
  if (r.door) { r.door.broken = true; setDoorMatrix(TOWN.doorIM, r.door); }
  spray(r.x, 1.4, r.z, 26, { kind: 'debris', col: [0x6a4a2e, 0x8a6a4a, 0x4a3420], dx: -r.nx, dz: -r.nz, speed: 5, up: 0.5, spread: 0.8, size: 0.14, life: 4, g: 14 });
  AUDIO.sfx('smash', r.x, r.z);
  FX.shake = Math.max(FX.shake, 0.4);
  const who = r.occ.slice();
  for (const v of who) { leaveRefuge(v, true); say(v, pick(LINES.out)); }
  bus.emit('broke', r, who.length);
  return who.length;
}
// a flying body
function throwStep(v, dt) {
  const f = v.fly;
  f.vy -= 15 * dt; v.x += f.vx * dt; v.y += f.vy * dt; v.z += f.vz * dt;
  v.M.root.rotation.x += f.spin * dt; v.M.root.rotation.z += f.spin * 0.4 * dt;
  v.M.root.position.set(v.x, v.y, v.z);
  poseHuman(v.M, 'held', 0, 0, G.t * 1.5);
  if (f.lethal) hitByThrown(v.x, v.y + 0.5, v.z, 1.6, { kind: 'body', vx: f.vx, vz: f.vz, except: v });
  const r = collide(v.x, v.z, 0.3, v.y); if (r.hit) { f.vx *= -0.3; f.vz *= -0.3; v.x = r.x; v.z = r.z; }
  const gy = supportY(v.x, v.z, v.y + 0.3);
  if (v.y <= gy && f.vy < 0) {
    v.y = gy;
    v.M.root.rotation.set(0, v.yaw, 0);
    killPerson(v, 'thrown', f.vx, f.vz, { bonus: f.by ? ['thrown'] : [] });
  }
}

// ---------- the dead ----------
const MATS_BLOOD = {};
function bloodyMat() { return MATS_BLOOD.m || (MATS_BLOOD.m = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xd07070 })); }
function makeCorpse(v, how, dx, dz) {
  const M = v.M;
  v.state = 'dead'; v.deadT = 0; v.how = how; v.fallK = 0;
  v.fallYaw = yawOf(dx || 0.01, dz || 0.01);
  M.root.rotation.set(0, v.fallYaw + Math.PI, 0);
  M.root.position.set(v.x, v.y, v.z);
  poseHuman(M, 'idle', 0, 0, 0);
  M.armL.rotation.set(-rr(0.3, 2.8), 0, rr(0.3, 1.2)); M.armR.rotation.set(-rr(0.3, 2.8), 0, -rr(0.3, 1.2));
  M.legL.rotation.set(rr(-0.3, 0.2), 0, 0.15); M.legR.rotation.set(rr(-0.2, 0.3), 0, -0.2);
  M.head.rotation.set(rr(-0.3, 0.3), rr(-0.8, 0.8), 0);
  const gore = OPTS.gore === 'full';
  if (gore) { M.parts.torso.material = bloodyMat(); M.parts.head.material = bloodyMat(); }
  const hx = v.x, hz = v.z;
  const nx = dx || 0, nz = dz || 0, nl = Math.hypot(nx, nz) || 1;
  const ux = nx / nl, uz = nz / nl;
  bloodPool(hx - ux * 0.9, hz - uz * 0.9, how === 'strangle' ? 0.5 : how === 'bite' ? 1.0 : 1.3, v.y);
  if (how === 'bite') { v.spurt = 1.6; }
  else if (how === 'claw' || how === 'pounce') {
    bloodBurst(hx, v.y + 1.2, hz, ux, uz, 1.2);
    if (gore) { const part = chance(0.5) ? M.head : chance(0.5) ? M.armL : M.armR; gib(part, ux * 5 + rr(-1, 1), 4 + rr(0, 2), uz * 5 + rr(-1, 1), v); v.spurt = 1.2; }
  } else if (how === 'smash' || how === 'thrown' || how === 'car') {
    bloodBurst(hx, v.y + 1, hz, ux, uz, 1.6);
    if (gore) { for (const part of [M.armL, M.legR, chance(0.5) ? M.head : M.armR]) if (chance(0.7)) gib(part, ux * 6 + rr(-2, 2), 4 + rr(0, 3), uz * 6 + rr(-2, 2), v); v.spurt = 1; }
    if (how === 'smash') { v.fly = { vx: ux * 9, vy: 5, vz: uz * 9, spin: rr(-8, 8) }; }
  } else if (how === 'strangle') { spray(hx, v.y + 1.5, hz, 10, { speed: 1.5, up: 0.3, spread: 0.5 }); }
  PEOPLE.corpses.push(v);
  if (PEOPLE.corpses.length > 36) removeCorpse(PEOPLE.corpses[0]);
}
function updateCorpse(v, dt) {
  v.deadT += dt;
  const M = v.M;
  if (v.fly) {
    const f = v.fly; f.vy -= 15 * dt; v.x += f.vx * dt; v.y += f.vy * dt; v.z += f.vz * dt;
    const r = collide(v.x, v.z, 0.3, v.y); if (r.hit) { f.vx *= -0.3; f.vz *= -0.3; v.x = r.x; v.z = r.z; }
    M.root.rotation.x += f.spin * dt;
    const gy = supportY(v.x, v.z, v.y + 0.3);
    if (v.y <= gy && f.vy < 0) { v.y = gy; v.fly = null; M.root.rotation.x = 0; bloodPool(v.x, v.z, 1.1, gy); spray(v.x, v.y + 0.3, v.z, 12, { speed: 3, up: 0.6 }); AUDIO.sfx('thud', v.x, v.z); }
    M.root.position.set(v.x, v.y + 0.3, v.z);
    return;
  }
  // topple over onto the back
  if (v.fallK < 1) { v.fallK = Math.min(1, v.fallK + dt / 0.45); const k = v.fallK * v.fallK; M.root.rotation.x = k * Math.PI / 2; M.root.position.set(v.x, v.y + 0.12 * k, v.z); }
  if (v.spurt > 0) {
    v.spurt -= dt;
    if (G.frame % 2 === 0 && OPTS.gore === 'full') {
      const src = M.head.parent === R.scene ? M.torso : M.head; src.updateWorldMatrix(true, false); _v1.setFromMatrixPosition(src.matrixWorld);
      spray(_v1.x, _v1.y + 0.1, _v1.z, 2, { speed: 2.5 * Math.min(1, v.spurt + 0.3), up: 1.4, spread: 0.35, size: 0.06, decal: true });
    }
  }
}
function removeCorpse(v) {
  const i = PEOPLE.corpses.indexOf(v); if (i >= 0) PEOPLE.corpses.splice(i, 1);
  R.scene.remove(v.M.root);
  for (const g of FX.gibs) if (g.owner === v && g.o.parent) g.o.parent.remove(g.o);
  FX.gibs = FX.gibs.filter((g) => g.owner !== v);
  v.state = 'gone'; v.removed = true;
}
function clearPeople() {
  for (const v of PEOPLE.list) R.scene.remove(v.M.root);
  PEOPLE.list.length = 0; PEOPLE.corpses.length = 0;
  for (const r of TOWN.refuges) { r.occ.length = 0; r.broken = false; r.lastBroke = 0; if (r.door) { r.door.broken = false; setDoorMatrix(TOWN.doorIM, r.door); } }
}
// tidy the list now and then
function prunePeople() { PEOPLE.list = PEOPLE.list.filter((v) => v.state !== 'gone'); }

// ---------- the town's first evening ----------
function populate() {
  const pois = TOWN.pois.slice();
  for (const p of pois) {
    const prob = { diner: 0.9, crowd: 0.9, gas: 0.8, park: 0.75, drivein: 0.8, motel: 0.6, grave: 0.3, farm: 0.8, porch: 0.55, street: 0.7, shop: 0.35 }[p.kind] || 0.5;
    if (!chance(prob)) continue;
    const type = p.kind === 'diner' && chance(0.3) ? 'waitress' : p.kind === 'gas' && chance(0.5) ? 'mechanic' : null;
    const v = spawnPerson(type, p.x + rr(-0.5, 0.5), p.z + rr(-0.5, 0.5), { face: p.face + rr(-0.6, 0.6) });
    v.state = 'idle'; v.idleT = rr(10, 70); v.dest = p;
    v.talk = ['diner', 'crowd', 'gas', 'drivein', 'street'].includes(p.kind);
    if (p.kind === 'porch' || (p.kind === 'park' && chance(0.4))) { v.sit = true; v.talk = false; }
    if (p.y) v.y = p.y;
  }
  // people in parked cars at the drive-in and up at lovers' lane
  for (const c of CARS.list) if (c.want && c.state === 'parked') { for (let i = 0; i < c.want; i++) spawnPerson(c.lot === 'lovers' ? (i ? 'sweetheart' : pick(['greaser', 'jock'])) : null, c.x, c.z, { incar: c }); c.want = 0; }
  // and people out walking
  for (let i = 0; i < 12; i++) {
    const a = pick(TOWN.pois), v = spawnPerson(null, a.x + rr(-3, 3), a.z + rr(-3, 3));
    goTo(v, randomPoi(v));
  }
}
