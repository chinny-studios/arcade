// 09_ai: guards stand post or patrol until they see you (view cone, fog distance, darkness and crouching all count)
// or hear something (gunfire, glass, explosions; silenced shots carry a few metres). Then some run for the nearest
// alarm panel; the rest fight: stop, aim, fire bursts, sometimes kneel or sidestep, chase your last known position.
// An alarm brings reinforcements until its panel is shot or the timer runs out. Technicians surrender or cower.
const AI = { reinfT: 0, reinfAlive: 0, nextId: 1 };

function spawnActors() {
  G.actors = [];
  const def = L.def;
  let seed = 1;
  for (const s of L.spawns) {
    const letter = { guard: 'g', patrol: 'p', elite: 'e', tech: 's' }[s.kind];
    const type = letter ? def.types[letter] : s.kind;
    const a = makeActor(type, s.x, s.z, seed++, s);
    if (s.kind === 'patrol' || s.patrolWide) a.patrol = makePatrol(a, s.patrolWide ? 16 : 8);
  }
}
function makeActor(type, x, z, seed, s = {}) {
  const T = ACTOR_TYPES[type];
  const P = buildPerson(type, seed + G.mission * 31);
  const i = idxAt(x, z);
  const a = {
    id: s.id || ('a' + AI.nextId++), name: s.name || null, type, T, P, x, z, y: i >= 0 ? L.fh[i] : 0, yaw: 0, vx: 0, vz: 0,
    hp: DIFF.guardHp[G.diff] * T.hp, dead: false, deadT: 0, state: 'idle', weapon: T.weapon, civilian: !!T.civilian, boss: !!T.boss,
    mag: 0, fireT: 0, burst: 0, reactT: 0, aiming: false, kneel: false, recoil: 0, phase: Math.random() * TAU, animSpeed: 0,
    action: null, t: Math.random() * 10, seed: seed, hit: null, stunT: 0, path: null, pathT: 0, goal: null, lastSeen: null,
    sees: false, losT: Math.random() * 0.3, alarmRunner: Math.random() < (T.alarm || 0), drops: s.drops || null,
    home: { x, z }, patrol: null, patrolI: 0, waitT: 0, dodgeT: rand(2, 5), strafe: 0, searchT: 0, lightT: 0, pose: newPose(), hp0: 0,
    reinforcement: !!s.reinforcement, hatOff: false, aimPitch: 0, seenT: 0,
  };
  a.hp0 = a.hp;
  a.yaw = s.yaw !== undefined ? s.yaw : openYaw(x, z) + rand(-0.3, 0.3);
  a.homeYaw = a.yaw;
  if (a.weapon) a.mag = WEAPONS[a.weapon].mag;
  a.P.root.position.set(x, a.y, z);
  scene.add(a.P.root);
  G.actors.push(a);
  return a;
}
function openYaw(x, z) {
  let best = 0, bd = -1;
  for (let k = 0; k < 8; k++) {
    const yaw = k / 8 * TAU, dx = fwdX(yaw), dz = fwdZ(yaw);
    let d = 0;
    for (; d < 12; d += 0.5) { const i = idxAt(x + dx * d, z + dz * d); if (i < 0 || cellBlocks(i, L.fh[idxAt(x, z)] || 0)) break; }
    if (d > bd) { bd = d; best = yaw; }
  }
  return best;
}
function makePatrol(a, radius) {
  const pts = [[a.x, a.z]];
  const c0 = cellOf(a.x), r0 = cellOf(a.z);
  for (let tries = 0; tries < 60 && pts.length < 3; tries++) {
    const c = c0 + irand(-radius, radius), r = r0 + irand(-radius, radius);
    if (!inMap(c, r) || !walkable(cellIdx(c, r)) || L.out[cellIdx(c, r)] !== L.out[idxAt(a.x, a.z)]) continue;
    const x = cx2(c), z = cx2(r);
    if (Math.hypot(x - pts[pts.length - 1][0], z - pts[pts.length - 1][1]) < radius * 0.8) continue;
    const p = findPath(pts[pts.length - 1][0], pts[pts.length - 1][1], x, z);
    if (p && p.length < radius * 2.5) pts.push([x, z]);
  }
  return pts.length > 1 ? pts : null;
}

// ---------------------------------------------------------------- perception
const _lg = [0, 0, 0];
function playerVisibleTo(a) {
  const p = G.player;
  if (!p || p.dead) return false;
  const dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz);
  let range = Math.min(UNI.uFogFar.value * 0.85, 48);
  lightGridAt(p.x, p.z, _lg);
  const lum = (_lg[0] + _lg[1] + _lg[2]) / 3 + (L.sun && L.out[idxAt(p.x, p.z)] ? 0.3 : 0);
  if (lum < 0.45) range *= 0.55 + lum;
  if (p.crouch) range *= 0.7;
  if (a.state !== 'idle' && a.state !== 'patrol') range = Math.max(range, 30);
  if (d > range) return false;
  const fov = a.state === 'idle' || a.state === 'patrol' ? 1.15 : Math.PI;
  if (d > 2.5 && Math.abs(angDiff(a.yaw, yawTo(dx, dz))) > fov) return false;
  return losClear(a.x, a.y + 1.6, a.z, p.x, p.y + p.eye - 0.1, p.z) || losClear(a.x, a.y + 1.6, a.z, p.x, p.y + 0.9, p.z);
}
function noiseEvent(x, z, radius, src) {
  for (const a of G.actors) {
    if (a.dead || a === src) continue;
    const d = Math.hypot(a.x - x, a.z - z);
    if (d > radius) continue;
    if (d > radius * 0.55 && !losClear(a.x, a.y + 1.6, a.z, x, a.y + 1.2, z)) continue;
    hear(a, x, z);
  }
}
function hear(a, x, z) {
  if (a.civilian) { if (a.state !== 'surrender') { a.state = 'cower'; a.action = 'cower'; a.waitT = rand(6, 12); } return; }
  if (a.state === 'idle' || a.state === 'patrol') { a.state = 'search'; a.reactT = DIFF.reaction[G.diff]; sfx('alert', a); }
  if (a.state === 'search' || a.state === 'alert') { a.lastSeen = { x, z }; a.path = null; a.searchT = 10; }
}
function spot(a) {
  const p = G.player;
  a.lastSeen = { x: p.x, z: p.z };
  if (a.civilian) {
    const d = Math.hypot(p.x - a.x, p.z - a.z);
    if (d < 9 && a.state !== 'surrender') { a.state = 'surrender'; a.action = 'surrender'; a.waitT = 1e9; }
    return;
  }
  if (a.state === 'idle' || a.state === 'patrol' || a.state === 'search') {
    const fresh = a.state !== 'search';
    a.reactT = DIFF.reaction[G.diff] * (fresh ? 1 : 0.5);
    if (fresh) sfx('alert', a);
    if (a.alarmRunner && L.alarms.some((q) => !q.dead) && !(G.alarm && G.alarm.on)) a.state = 'alarm';
    else a.state = 'combat';
    // shout to friends nearby
    for (const b of G.actors) {
      if (b === a || b.dead || b.civilian) continue;
      if (Math.hypot(b.x - a.x, b.z - a.z) < 11 && (b.state === 'idle' || b.state === 'patrol')) { b.state = 'search'; b.lastSeen = { x: p.x, z: p.z }; b.reactT = DIFF.reaction[G.diff]; b.searchT = 10; }
    }
  }
}

// ---------------------------------------------------------------- update
function updateActors(dt) {
  const p = G.player;
  for (const a of G.actors) {
    a.t += dt;
    if (a.dead) { updateCorpse(a, dt); continue; }
    a.stunT -= dt; a.reactT -= dt; a.fireT -= dt; a.recoil = Math.max(0, a.recoil - dt * 6);
    if (a.hit) { a.hit.t += dt; if (a.hit.t > a.hit.len) a.hit = null; }
    // perception
    a.losT -= dt;
    if (a.losT <= 0) {
      a.losT = 0.18 + Math.random() * 0.1;
      a.sees = !G.peace && playerVisibleTo(a);
      if (a.sees) { spot(a); a.seenT = G.time; }
    }
    if (a.sees && p) a.lastSeen = { x: p.x, z: p.z };
    let want = null, speed = 0, face = null;
    a.aiming = false;
    switch (a.state) {
      case 'idle':
        if (a.patrol) { a.state = 'patrol'; break; }
        face = a.homeYaw + Math.sin(a.t * 0.4 + a.seed) * 0.5;
        if (Math.hypot(a.home.x - a.x, a.home.z - a.z) > 1) { want = a.home; speed = 1.4; face = null; }
        break;
      case 'patrol': {
        const pt = a.patrol[a.patrolI];
        if (a.waitT > 0) { a.waitT -= dt; face = a.yaw; break; }
        if (Math.hypot(pt[0] - a.x, pt[1] - a.z) < 0.6) { a.patrolI = (a.patrolI + 1) % a.patrol.length; a.waitT = rand(1.5, 4); a.path = null; break; }
        want = { x: pt[0], z: pt[1] }; speed = 1.3;
        break;
      }
      case 'surrender':
        face = p ? yawTo(p.x - a.x, p.z - a.z) : a.yaw;
        if (p && Math.hypot(p.x - a.x, p.z - a.z) > 14) { a.state = 'cower'; a.action = 'cower'; a.waitT = 8; }
        break;
      case 'cower':
        a.waitT -= dt;
        if (a.waitT <= 0) { a.state = 'idle'; a.action = null; }
        break;
      case 'search':
        if (a.reactT > 0) { face = a.lastSeen ? yawTo(a.lastSeen.x - a.x, a.lastSeen.z - a.z) : a.yaw; break; }
        a.searchT -= dt;
        if (a.lastSeen && Math.hypot(a.lastSeen.x - a.x, a.lastSeen.z - a.z) > 1.5) { want = a.lastSeen; speed = 3.2; }
        else { face = a.yaw + dt * 1.5; if (a.searchT < 0) { a.state = 'alert'; } }
        if (a.searchT < -8) { a.state = 'alert'; }
        break;
      case 'alert':  // stays wary: 360 degree view, returns home slowly
        if (Math.hypot(a.home.x - a.x, a.home.z - a.z) > 1) { want = a.home; speed = 1.6; } else face = a.homeYaw + Math.sin(a.t * 0.8) * 1.2;
        break;
      case 'alarm': {
        const panel = nearestAlarm(a);
        if (!panel || (G.alarm && G.alarm.on)) { a.state = 'combat'; break; }
        if (Math.hypot(panel.front[0] - a.x, panel.front[1] - a.z) < 0.9) { triggerAlarm(a); a.state = 'combat'; break; }
        want = { x: panel.front[0], z: panel.front[1] }; speed = 4.0;
        break;
      }
      case 'combat': {
        if (!p || p.dead) { a.state = 'alert'; break; }
        const dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz);
        if (a.sees) {
          face = yawTo(dx, dz);
          a.aiming = !!a.weapon;
          a.aimPitch = clamp(Math.atan2((p.y + 1.2) - (a.y + 1.4), d), -0.6, 0.6);
          // reposition: close in from far away, sometimes sidestep
          a.dodgeT -= dt;
          if (a.dodgeT <= 0) { a.dodgeT = rand(2.5, 5.5) / (a.boss ? 1.8 : 1); a.strafe = chance(0.55) ? (chance(0.5) ? 1 : -1) * rand(0.6, 1.1) : 0; a.kneel = !a.strafe && chance(a.weapon === 'ar62' || a.weapon === 'zeus' ? 0.35 : 0.15) && !a.boss; }
          if (a.strafe) {
            const sx = -fwdZ(face), sz = fwdX(face);
            want = { x: a.x + sx * a.strafe * 2, z: a.z + sz * a.strafe * 2, direct: true }; speed = 2.4; a.strafe -= Math.sign(a.strafe) * dt; if (Math.abs(a.strafe) < 0.05) a.strafe = 0; a.kneel = false;
          } else if (d > (a.weapon === 'tk33' || a.weapon === 'pk9' ? 12 : 18)) { want = { x: p.x, z: p.z }; speed = 2.6; a.kneel = false; }
          if (a.weapon && a.reactT <= 0 && a.stunT <= 0 && a.fireT <= 0) actorFire(a, d);
        } else {
          a.kneel = false;
          if (a.lastSeen) { want = a.lastSeen; speed = 3.4; if (Math.hypot(a.lastSeen.x - a.x, a.lastSeen.z - a.z) < 1.2) { a.state = 'search'; a.searchT = 8; a.lastSeen = null; } }
          else a.state = 'search';
        }
        break;
      }
    }
    if (a.stunT > 0) { want = null; speed = 0; }
    if (a.kneel || (a.aiming && !a.strafe && !want)) speed = Math.min(speed, 0);
    moveActor(a, want, speed, dt);
    if (face !== null && face !== undefined) a.yaw += angDiff(a.yaw, face) * Math.min(1, dt * (a.state === 'combat' ? 8 : 3));
    animateActor(a, dt);
  }
  separateActors();
  if (G.alarm) updateAlarm(dt);
}
function moveActor(a, want, speed, dt) {
  let mx = 0, mz = 0;
  if (want && speed > 0) {
    let tx = want.x, tz = want.z;
    if (!want.direct) {
      a.pathT -= dt;
      const goalKey = Math.round(want.x) + ',' + Math.round(want.z);
      if (!a.path || a.pathT <= 0 || a.goal !== goalKey) {
        a.path = findPath(a.x, a.z, want.x, want.z); a.pathT = 1.2 + Math.random(); a.goal = goalKey;
        if (!a.path) a.path = [[want.x, want.z]];
      }
      while (a.path.length > 1 && Math.hypot(a.path[0][0] - a.x, a.path[0][1] - a.z) < 0.5) a.path.shift();
      [tx, tz] = a.path[0];
      // open doors in the way
      const i = idxAt(tx, tz);
      if (i >= 0 && L.type[i] === T_DOOR) { const d = L.doorAt.get(i); if (d.open < 0.7) { openDoor(d, a); if (Math.hypot(tx - a.x, tz - a.z) < 1.6) { tx = a.x; tz = a.z; } } }
    }
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    if (d > 0.05) {
      mx = dx / d * speed; mz = dz / d * speed;
      if (!a.aiming) a.yaw += angDiff(a.yaw, yawTo(dx, dz)) * Math.min(1, dt * 7);
    }
  }
  a.vx = lerp(a.vx, mx, Math.min(1, dt * 8)); a.vz = lerp(a.vz, mz, Math.min(1, dt * 8));
  const o = { x: a.x + a.vx * dt, z: a.z + a.vz * dt };
  collideCircle(o, 0.3, a.y);
  const moved = Math.hypot(o.x - a.x, o.z - a.z);
  a.x = o.x; a.z = o.z;
  const gy = groundUnder(a.x, a.z, 0.3, a.y);
  a.y = gy > a.y ? Math.min(gy, a.y + dt * 4) : Math.max(gy, a.y - dt * 6);
  const sp = dt > 0 ? moved / dt : 0;
  a.animSpeed = lerp(a.animSpeed, sp < 0.2 ? 0 : sp < 2.2 ? sp / 1.6 : 1 + (sp - 2.2) / 1.6, Math.min(1, dt * 6));
  a.phase += dt * (sp * 2.6 + 0.0);
}
function separateActors() {
  const list = G.actors, p = G.player;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.6 && d > 1e-4) { const k = (0.6 - d) / d * 0.5; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
    }
    if (p && !p.dead) {
      const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.65 && d > 1e-4) { const k = (0.65 - d) / d; a.x += dx * k; a.z += dz * k; }
    }
  }
}
function animateActor(a, dt) {
  const P = a.P, pose = a.pose;
  if (a.state === 'surrender') a.action = 'surrender';
  else if (a.state !== 'cower') a.action = null;
  basePose(a, pose);
  if (a.hit) {
    const t = a.hit.t / a.hit.len, e = Math.sin(Math.min(1, t) * Math.PI) * (t < 0.3 ? 1 : 1);
    hitPose(a.hit.where, e, a.hit.side, pose);
  }
  applyPose(P, pose);
  P.root.position.set(a.x, a.y, a.z);
  P.root.rotation.y = a.yaw;
  a.lightT -= dt;
  if (a.lightT <= 0) { a.lightT = 0.25; setDynLight(P.mat, a.x, a.z); }
}

// ---------------------------------------------------------------- shooting
function actorFire(a, dist) {
  const W = WEAPONS[a.weapon], p = G.player;
  if (a.burst <= 0) a.burst = W.auto ? irand(2, 5) : irand(1, 2);
  a.burst--;
  a.fireT = a.burst > 0 ? W.rate * 1.15 : W.rate + rand(0.5, 1.3) * (a.boss ? 0.6 : 1);
  a.recoil = 1;
  a.P.root.updateMatrixWorld(true);
  const mz = new THREE.Vector3(); a.P.muzzle.getWorldPosition(mz);
  muzzleFlashAt(mz.x, mz.y, mz.z, W.id === 'zeus' ? 0.6 : 0.8);
  sfx(W.snd, a);
  if (W.noise) noiseEvent(a.x, a.z, W.noise * 0.6, a);
  let acc = (W.npcAcc || 0.5) * DIFF.accuracy[G.diff] * clamp(1.15 - dist / 40, 0.15, 1.1);
  const ps = Math.hypot(p.vx || 0, p.vz || 0);
  if (ps > 3) acc *= 0.6; else if (ps > 1) acc *= 0.8;
  if (p.crouch) acc *= 0.8;
  if (a.kneel) acc *= 1.15;
  if (a.boss) acc *= 1.2;
  acc = clamp(acc, 0.04, 0.88);
  const pellets = W.pellets || 1;
  const first = !a.firedOnce;
  for (let k = 0; k < pellets; k++) {
    // the first shot from each guard is a warning that always misses
    const hitIt = !G.god && a.firedOnce && Math.random() < acc / (pellets > 1 ? 1.6 : 1);
    // trace toward the player (or near them on a miss) so bullets hit walls around you
    const tx = p.x + (hitIt ? 0 : rand(-1.2, 1.2)), ty = p.y + (hitIt ? 1.2 : rand(0.2, 2.2)), tz = p.z + (hitIt ? 0 : rand(-1.2, 1.2));
    let dx = tx - mz.x, dy = ty - mz.y, dz = tz - mz.z; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    const h = rayWorld(mz.x, mz.y, mz.z, dx, dy, dz, 120, { ignore: null });
    const pd = Math.hypot(p.x - mz.x, p.y + 1 - mz.y, p.z - mz.z);
    if (hitIt && (!h || h.t > pd - 0.4)) {
      damagePlayer(W.npcDmg * DIFF.dmgToPlayer[G.diff], a.x, a.z, false);
      if (W.beam) beamFx(mz.x, mz.y, mz.z, p.x, p.y + 1.2, p.z, W.beamCol);
    } else if (h) {
      if (W.beam) beamFx(mz.x, mz.y, mz.z, h.x, h.y, h.z, W.beamCol);
      impactFx(h);
      if (h.kind === 'glass') shatterWindow(h.win);
      if (h.prop) damageProp(h.prop, W.dmg * 0.5, false, h);
      if (!W.beam && Math.random() < 0.4) sfx('ric', h);
    }
  }
  if (first) a.firedOnce = true;
}

// ---------------------------------------------------------------- taking damage
function damageActor(a, dmg, part, src, opts = {}) {
  if (a.dead) return;
  const byPlayer = src === 'player';
  if (part === 'hat') {
    knockHat(a, opts);
    if (byPlayer) G.stats.hits++, G.stats.hat++;
    if (!a.civilian) { a.state = a.state === 'idle' || a.state === 'patrol' ? 'combat' : a.state; a.lastSeen = { x: G.player.x, z: G.player.z }; }
    a.hit = { where: 'hat', t: 0, len: 0.35, side: 1 };
    return;
  }
  let mul = 1;
  if (part === 'head') mul = a.boss ? 2.5 : 100;
  else if (part === 'groin') mul = 1.25;
  else if (part && (part.startsWith('arm') || part.startsWith('leg'))) mul = 0.6;
  const d = dmg * mul;
  a.hp -= d;
  if (byPlayer) {
    G.stats.hits++;
    if (part === 'head') G.stats.head++;
    else if (part === 'torso' || part === 'groin') G.stats.body++;
    else if (part) G.stats.limb++;
  }
  sfx(opts.explosive ? 'thud' : 'flesh', a);
  if (opts.hitPos) bloodPuff(opts.hitPos.x, opts.hitPos.y, opts.hitPos.z);
  if (a.hp <= 0) { killActor(a, part, opts, byPlayer); return; }
  a.hit = { where: part || 'torso', t: 0, len: part === 'head' ? 0.4 : 0.5, side: Math.random() < 0.5 ? 1 : -1 };
  a.stunT = a.boss ? 0.15 : 0.45;
  if (a.civilian) { a.state = 'cower'; a.action = 'cower'; a.waitT = 12; return; }
  if (byPlayer || opts.explosive) {
    a.lastSeen = { x: G.player.x, z: G.player.z };
    if (a.state !== 'alarm') a.state = 'combat';
    a.reactT = Math.min(a.reactT, 0.3);
    if (!a.sees) a.yaw = yawTo(G.player.x - a.x, G.player.z - a.z);
  }
}
function knockHat(a, opts) {
  const P = a.P;
  if (!P.hat || a.hatOff) return;
  a.hatOff = true;
  P.root.updateMatrixWorld(true);
  const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
  P.hat.getWorldPosition(wp); P.hat.getWorldQuaternion(wq);
  P.neck.remove(P.hat);
  P.parts.splice(P.parts.indexOf(P.hat), 1);
  P.hat.position.copy(wp); P.hat.quaternion.copy(wq);
  scene.add(P.hat);
  const dir = opts.dir || [fwdX(a.yaw + Math.PI), 0, fwdZ(a.yaw + Math.PI)];
  DEBRIS.push({ m: P.hat, vx: dir[0] * 2.5 + rand(-0.5, 0.5), vy: 2.5, vz: dir[2] * 2.5 + rand(-0.5, 0.5), spin: rand(5, 10), floor: a.y, t: 0 });
  sfx('ping', a);
}
const DEBRIS = [];
function updateDebris(dt) {
  for (let k = DEBRIS.length - 1; k >= 0; k--) {
    const d = DEBRIS[k];
    d.t += dt;
    if (d.rest) continue;
    d.vy -= 12 * dt;
    d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
    d.m.rotation.x += d.spin * dt; d.m.rotation.z += d.spin * 0.6 * dt;
    if (d.m.position.y < d.floor - 0.2) { d.m.position.y = d.floor - 0.2; d.vy *= -0.3; d.vx *= 0.5; d.vz *= 0.5; d.spin *= 0.5; if (Math.abs(d.vy) < 0.5) d.rest = true; }
  }
}
function killActor(a, part, opts, byPlayer) {
  a.dead = true; a.deadT = 0; a.hp = 0; a.aiming = false; a.kneel = false;
  const fromFront = opts.fromX !== undefined ? Math.abs(angDiff(a.yaw, yawTo(opts.fromX - a.x, opts.fromZ - a.z))) < Math.PI / 2 : true;
  let k;
  if (opts.explosive) k = fromFront ? 'back' : 'front';
  else if (part === 'head') k = chance(0.6) ? 'back' : 'crumple';
  else if (part === 'armL' || part === 'armR') k = 'spin';
  else if (part === 'legL' || part === 'legR') k = chance(0.5) ? 'crumple' : 'front';
  else if (part === 'groin') k = 'front';
  else k = fromFront ? pick(['back', 'back', 'front', 'side']) : 'front';
  a.deathKind = k;
  if (byPlayer) G.stats.kills++;
  sfx(a.civilian ? 'dieCiv' : 'die', a);
  // drops: the gun with what's left in it, plus any key item
  if (a.weapon && !a.reinforcement || (a.weapon && chance(0.5))) {
    const W = WEAPONS[a.weapon];
    spawnPickup({ weapon: a.weapon, ammo: Math.max(4, Math.round((W.mag * 0.7) * DIFF.ammoMul[G.diff])) }, a.x + fwdX(a.yaw) * 0.6, a.y, a.z + fwdZ(a.yaw) * 0.6);
  }
  if (a.drops) spawnPickup({ item: a.drops }, a.x - fwdX(a.yaw) * 0.4, a.y, a.z - fwdZ(a.yaw) * 0.4);
  if (a.civilian) G.stats.civKilled++;
  objectiveEvent('kill', a);
  if (a.reinforcement) AI.reinfAlive--;
  const corpses = G.actors.filter((b) => b.dead && !b.gone);
  if (corpses.length > 16) corpses[0].fadeOut = true;
}
function updateCorpse(a, dt) {
  if (a.gone) return;
  a.deadT += dt;
  if (a.deadT < 2) {
    const pose = a.pose;
    for (const k of POSE_KEYS) pose[k] = 0;
    deathPose(a.deathKind, a.deadT, pose);
    // keep the gun arm loose
    applyPose(a.P, pose);
    if (a.deadT > 0.5 && a.P.gun) { a.P.handR.remove(a.P.gun); a.P.gun = null; }
  }
  if (a.fadeOut) {
    a.P.root.position.y -= dt * 0.4;
    if (a.P.root.position.y < a.y - 0.5) { a.gone = true; scene.remove(a.P.root); }
  }
}

// ---------------------------------------------------------------- alarms and reinforcements
function nearestAlarm(a) {
  let best = null, bd = 1e9;
  for (const q of L.alarms) { if (q.dead) continue; const d = Math.hypot(q.front[0] - a.x, q.front[1] - a.z); if (d < bd) { bd = d; best = q; } }
  return best;
}
function triggerAlarm(who) {
  if (G.alarm && G.alarm.on) return;
  G.alarm = { on: true, t: 0, len: 75, pulse: 0 };
  AI.reinfT = 4;
  hudMsg('Alarm activated!');
  sfx('alarmStart');
  objectiveEvent('alarm', who);
  for (const b of G.actors) if (!b.dead && !b.civilian && (b.state === 'idle' || b.state === 'patrol')) { b.state = 'search'; b.lastSeen = { x: G.player.x, z: G.player.z }; b.searchT = 14; }
}
function stopAlarm(msg) {
  if (!G.alarm || !G.alarm.on) return;
  G.alarm.on = false;
  UNI.uAlarm.value = 0;
  if (msg) hudMsg(msg);
  stopLoop('alarm');
}
function alarmPanelDestroyed(p) {
  if (G.alarm && G.alarm.on && !L.alarms.some((q) => !q.dead)) stopAlarm('Alarm system disabled');
  else if (G.alarm && G.alarm.on && Math.hypot(p.front[0] - G.player.x, p.front[1] - G.player.z) < 30) stopAlarm('Alarm deactivated');
}
function updateAlarm(dt) {
  const A = G.alarm;
  if (!A.on) return;
  A.t += dt;
  UNI.uAlarm.value = (Math.sin(A.t * 6) * 0.5 + 0.5) * (L.def.alarmTint !== undefined ? L.def.alarmTint : 0.45);
  loopSfx('alarm');
  if (A.t > A.len) { stopAlarm('The alarm has stopped'); return; }
  AI.reinfT -= dt;
  if (AI.reinfT <= 0 && L.reinf.length) {
    AI.reinfT = rand(6, 9);
    if (AI.reinfAlive >= 5) return;
    const p = G.player;
    const opts = L.reinf.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) > 12 && !losClear(s.x, 1.6, s.z, p.x, p.y + 1.5, p.z));
    if (!opts.length) return;
    const s = pick(opts);
    const type = L.def.types[chance(0.25) ? 'e' : 'g'];
    const a = makeActor(type, s.x, s.z, irand(1, 999), { reinforcement: true });
    a.state = 'search'; a.lastSeen = { x: p.x, z: p.z }; a.searchT = 20; a.reactT = 0.5;
    AI.reinfAlive++;
  }
}
