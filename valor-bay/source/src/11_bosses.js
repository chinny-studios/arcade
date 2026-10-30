// Valor Bay — the supervillains. Mauler charges, smashes, stomps and throws cars; Kilowatt floats, blinks about and
// calls down lightning; Overclock flies, fires homing missiles, sweeps a laser and launches drones. Each telegraphs
// every move, gets angrier below half health, and goes down in a heap when beaten.

function spawnBoss(id, x, z, crime) {
  const V = VILLAINS[id];
  const mat = MATS.skin.clone();
  const M = buildRig(partsOf(id, V.look), { h: V.h, bulk: V.bulk, legs: id === 'mauler' ? 0.42 : 0.5 }, { mat });
  R.scene.add(M.root);
  const f = { kind: 'foe', boss: true, id, V, T: { pts: V.pts, h: V.h }, M, x, y: 0, z, yaw: 0, vx: 0, vy: 0, vz: 0, hp: V.hp, maxHp: V.hp, h: V.h, r: id === 'mauler' ? 1.3 : 0.6,
    state: 'idle', t: 0, cool: 1.5, ph: 0, crime, aggro: false, mass: id === 'mauler' ? 6 : 3, flashT: 0, onGround: true, air: false, lie: 0, ko: false, says: 0, move: null, stun: 0, frozen: 0, web: 0, lift: 0, burn: 0, hover: id === 'kilowatt' ? 1.6 : 0 };
  if (id === 'overclock') { f.y = 12; f.flyer = true; }
  FOES.list.push(f);
  return f;
}
function damageBoss(f, dmg, kx, ky, kz, o) {
  if (f.ko) return false;
  const mul = (f.stun > 0 ? 1.8 : 1) * (G.rampage ? 1.4 : 1) * (o.status && o.status.web ? 0.5 : 1);
  f.hp -= dmg * mul;
  f.flashT = 0.1; f.aggro = true;
  hitSpark(f.x, f.y + f.h * 0.6, f.z, o.big);
  if (o.word !== null && (o.big || chance(0.35))) pow(f.x, f.y + f.h + 0.5, f.z, pick(POWS[o.word || 'punch']), { size: o.big ? 60 : 44 });
  AUDIO.sfx(o.big ? 'punchBig' : 'punch', f.x, f.z);
  if (o.status && o.status.freeze && f.frozen <= 0 && f.id !== 'overclock') { f.frozen = 1.2; }
  if (o.status && o.status.burn) f.burn = Math.max(f.burn, 2);
  if (f.hp <= 0) { defeatBoss(f, kx, kz); return true; }
  // big hits stagger them; a quarter of their health gone also does
  const q = Math.floor(f.hp / (f.maxHp * 0.25));
  if (f.lastQ === undefined) f.lastQ = 4;
  if (q < f.lastQ || Math.hypot(kx, ky, kz) / f.mass > 6) { f.lastQ = q; if (f.state !== 'stunned') { f.state = 'stagger'; f.t = 0; f.move = null; } }
  return true;
}
function defeatBoss(f, kx, kz) {
  f.ko = true; f.state = 'ko'; f.t = 0; f.move = null;
  knock(f, kx / f.mass * 2, 6, kz / f.mass * 2);
  if (f.flyer) { f.vy = 2; }
  G.slow = 1.6;
  flash(0.6);
  pow(f.x, f.y + f.h + 1, f.z, 'KRA-KOOOM!', { size: 80, life: 1.6, col: '#ffd820' });
  burst('spark', f.x, f.y + f.h * 0.5, f.z, 50, { speed: 16, life: 0.6, size: 1.2, col: [0xffe060, 0xffffff, 0xff8a20] });
  ring(f.x, f.y + 0.2, f.z, { r0: 1, r1: 18, life: 0.8 });
  addShake(1.5);
  AUDIO.sfx('boom', f.x, f.z);
  HUD.say(f, f.id === 'overclock' ? 'SYSTEM... FAILURE...' : f.id === 'mauler' ? 'Mauler... sleepy...' : 'This isn\'t over!');
  addScore(f.V.pts, f);
  G.bosses++; SAVE.bosses[f.id] = (SAVE.bosses[f.id] || 0) + 1;
  G.arrests++;
  bus.emit('bossDown', f);
}

function updateBoss(f, dt) {
  const M = f.M;
  f.t += dt; f.cool -= dt; f.flashT -= dt; f.says -= dt;
  f.M.mat.emissive.setHex(f.flashT > 0 ? 0xffffff : f.stun > 0 ? 0x2a2a6a : 0);
  if (f.ko) {
    if (f.air || f.lie < 1) updateBody(f, dt);
    poseReset(M); if (f.air) poseTumble(M, f.t); else poseKO(M); poseApply(M, dt, 8);
    placeRig(f, dt);
    if (!f.air && G.frame % 15 === 0) particle('star', f.x + rr(-0.6, 0.6), f.y + 0.8, f.z + rr(-0.6, 0.6), { vy: 0.6, life: 0.8, size: 1, size1: 0.3 });
    f.koT = (f.koT || 0) + dt;
    if (f.koT > 10 && !f.air) {
      burst('spark', f.x, f.y + 1, f.z, 30, { speed: 4, up: 3, life: 0.8, size: 1, col: [0x4a8aff, 0xff4a4a, 0xffffff] });
      pow(f.x, f.y + 2, f.z, 'TO STONEGATE!', { col: '#4a9aff', size: 34, life: 1.4 });
      disposeRig(M); f.dead = true; FOES.list.splice(FOES.list.indexOf(f), 1);
    }
    shadow(f.x, f.gy === undefined ? f.y : f.gy, f.z, f.r * 1.5);
    return;
  }
  if (f.frozen > 0) { f.frozen -= dt; placeRig(f, dt); return; }
  if (f.burn > 0) { f.burn -= dt; f.hp -= dt * 4; if (G.frame % 2 === 0) particle('spark', f.x + rr(-0.5, 0.5), f.y + rr(0.5, f.h), f.z + rr(-0.5, 0.5), { vy: 3, life: 0.5, size: 1, col: pick([0xff8a20, 0xffd040]) }); }
  if (f.air) { updateBody(f, dt); if (!f.air) { f.state = 'stagger'; f.t = 0; f.lie = 0; } poseReset(M); poseTumble(M, f.t); poseApply(M, dt); placeRig(f, dt); return; }
  if (f.stun > 0) f.stun -= dt;
  if (!f.aggro && P && dist(f.x, f.z, P.x, P.z) < 45) {
    f.aggro = true;
    HUD.say(f, pick(f.V.lines)); f.says = 8;
    AUDIO.sfx(f.id === 'mauler' ? 'roar' : 'alert', f.x, f.z);
  }
  if (f.aggro && P && !P.downed && f.says <= 0 && chance(0.003)) { HUD.say(f, pick(f.V.lines)); f.says = 10; }
  const angry = f.hp < f.maxHp * 0.5;
  poseReset(M);
  if (f.state === 'stagger') { poseHurt(M, 1 - f.t / 0.8); if (f.t > 0.8) { f.state = 'idle'; f.cool = 0.5; } }
  else if (f.state === 'stunned') { poseHurt(M, 0.8); setT(M, B.head, 0.3, Math.sin(f.t * 6) * 0.5, 0); if (G.frame % 10 === 0) particle('star', f.x + rr(-0.5, 0.5), f.y + f.h + 0.3, f.z + rr(-0.5, 0.5), { vy: 0.4, life: 0.6, size: 1, size1: 0.3 }); if (f.t > 2.2) { f.state = 'idle'; f.stun = 0; } }
  else if (f.id === 'mauler') mauler(f, dt, angry);
  else if (f.id === 'kilowatt') kilowatt(f, dt, angry);
  else overclock(f, dt, angry);
  if (!f.flyer) {
    f.onGround = true;
    const gy = supportY(f.x, f.z, f.y + 1, f.r * 0.6);
    f.y = f.hover ? damp(f.y, gy + f.hover + Math.sin(f.t * 2) * 0.2, 6, dt) : gy;
    const e = { x: f.x, y: f.hover ? gy : f.y, z: f.z, onGround: true };
    const w = collide(e, f.r, f.h);
    f.x = e.x; f.z = e.z;
    if (w && f.state === 'charge') { f.state = 'stunned'; f.t = 0; f.stun = 2.2; addShake(1); AUDIO.sfx('crash', f.x, f.z); debris(f.x, f.y + 2, f.z, 16, { speed: 8, up: 8, size: 0.6 }); pow(f.x, f.y + f.h + 1, f.z, 'KRUNCH!', { size: 60 }); }
    if (!onLand(f.x, f.z)) { f.x = clamp(f.x, -CITY.EDGE + 2, CITY.EDGE - 2); f.z = clamp(f.z, -CITY.EDGE + 2, CITY.EDGE - 2); }
  }
  poseApply(M, dt, 10);
  placeRig(f, dt);
  if (f.hover || f.flyer) M.root.rotation.x = f.flyer ? clamp(Math.hypot(f.vx, f.vz) * 0.04, 0, 0.6) : 0;
  shadow(f.x, supportY(f.x, f.z, f.y + 0.5, 0.5), f.z, f.r * 1.4);
}
function bossWalk(f, tx, tz, sp, dt) {
  const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz);
  if (d < 0.3) return;
  f.x += dx / d * sp * dt; f.z += dz / d * sp * dt;
  f.yaw = angTo(f.yaw, yawOf(dx, dz), 5 * dt);
  f.ph += dt * sp * (f.id === 'mauler' ? 1.1 : 2.2);
  poseRun(f.M, f.ph, clamp(sp / 10, 0.1, 0.8), f.id === 'mauler' ? 0.25 : 0);
}
// a shockwave on the ground that hurts the hero if he's standing in it
function quake(x, z, r, dmg, kb) {
  ring(x, supportY(x, z, 999) + 0.1, z, { r0: 1, r1: r, life: 0.6, col: 0xffe0a0 });
  burst('puff', x, 0.3, z, 18, { speed: r * 1.2, flat: true, life: 0.8, size: 1.6, size1: 3, col: 0xd8d0c0, alpha: 0.7, drag: 2 });
  debris(x, 0.3, z, 12, { speed: 6, up: 8, size: 0.5 });
  addShake(P && dist(P.x, P.z, x, z) < 40 ? 1.2 : 0.3);
  AUDIO.sfx('stomp', x, z);
  if (P && !P.downed && P.onGround && dist(P.x, P.z, x, z) < r && Math.abs(P.y - supportY(x, z, P.y + 1)) < 1.5) hurtHero(dmg, x, z, kb);
  for (const c of CARS.list) if (c.state !== 'gone' && !c.held && dist(c.x, c.z, x, z) < r * 0.7) hitCar(c, 30, (c.x - x) * 1.5, 9, (c.z - z) * 1.5);
  alarm(x, z, 40);
}

function mauler(f, dt, angry) {
  const M = f.M, tgt = f.aggro && P && !P.downed ? P : null;
  if (!f.move) {
    if (!tgt) { poseIdle(M, f.t); setT(M, B.spine, -0.3, 0, 0); return; }
    const d = dist(f.x, f.z, P.x, P.z);
    if (f.cool <= 0) {
      const car = nearestCar(f.x, f.z, 22, (c) => c.state !== 'flying');
      if (d < 5.5 && P.y - f.y < 4) f.move = 'smash';
      else if (d > 12 && car && chance(0.5)) { f.move = 'grab'; f.car = car; }
      else if (d > 10 && d < 45 && chance(0.6) && losClear(f.x, 2, f.z, P.x, 2, P.z)) f.move = 'charge';
      else if (d < 14) f.move = 'stomp';
      if (f.move) { f.t = 0; f.state = f.move; }
    }
    if (!f.move) { if (d > 4) bossWalk(f, P.x, P.z, angry ? 6.5 : 5, dt); else { f.yaw = angTo(f.yaw, yawOf(P.x - f.x, P.z - f.z), 3 * dt); poseIdle(M, f.t); } setT(M, B.spine, -0.35, 0, 0); setT(M, B.head, 0.3, 0, 0); return; }
  }
  const face = P ? yawOf(P.x - f.x, P.z - f.z) : f.yaw;
  switch (f.move) {
    case 'smash': {
      const wt = angry ? 0.55 : 0.75;
      if (f.t < wt) { f.yaw = angTo(f.yaw, face, 4 * dt); poseLift(M); setT(M, B.spine, 0.2, 0, 0); f.warn = 1; }
      else { poseSlam(M, 1); f.warn = 0; if (!f.did) { f.did = true; const fx = fwdX(f.yaw), fz = fwdZ(f.yaw); quake(f.x + fx * 3, f.z + fz * 3, 6, 18, 14); } }
      if (f.t > wt + 0.6) endMove(f, angry ? 1.2 : 2);
      break;
    }
    case 'stomp': {
      if (f.t < 0.5) { poseCrouch(M, f.t / 0.5); f.warn = 1; }
      else if (f.t < 1.2) { f.y += (f.t < 0.85 ? 14 : -18) * dt; poseAir(M, f.t < 0.85 ? 5 : -5, f.t); f.warn = 0; }
      else { poseSlam(M, 1); if (!f.did) { f.did = true; quake(f.x, f.z, angry ? 14 : 11, 16, 12); } }
      if (f.t > 1.7) endMove(f, 2);
      break;
    }
    case 'charge': {
      if (f.t < 0.7) { f.yaw = angTo(f.yaw, face, 5 * dt); poseCrouch(M, 0.4); setT(M, B.head, -0.4, 0, 0); f.warn = 1; if (!f.roared) { f.roared = true; AUDIO.sfx('roar', f.x, f.z); } }
      else {
        f.warn = 0;
        const sp = angry ? 24 : 19, fx = fwdX(f.yaw), fz = fwdZ(f.yaw);
        f.x += fx * sp * dt; f.z += fz * sp * dt; f.ph += dt * 18;
        poseRun(M, f.ph, 1, 0.5);
        if (G.frame % 2 === 0) particle('puff', f.x, 0.3, f.z, { vy: 1, life: 0.6, size: 1.6, size1: 3, col: 0xd8d0c0, alpha: 0.6 });
        if (P && !f.did && dist(P.x, P.z, f.x, f.z) < f.r + 1.2 && Math.abs(P.y - f.y) < 3) { f.did = true; hurtHero(22, f.x - fx * 3, f.z - fz * 3, 22); }
        for (const c of CARS.list) if (c.state !== 'gone' && !c.held && dist(c.x, c.z, f.x, f.z) < 3) hitCar(c, 60, fx * 22, 10, fz * 22);
        if (f.t > 2.0) endMove(f, 1.5);
      }
      break;
    }
    case 'grab': {
      const c = f.car;
      if (!c || c.state === 'gone' || c.state === 'flying' || c.held && c.holder !== f) { endMove(f, 0.5); break; }
      if (!c.held) {
        const d = dist(f.x, f.z, c.x, c.z);
        if (d > 3.5) { bossWalk(f, c.x, c.z, 8, dt); if (f.t > 4) endMove(f, 1); }
        else { c.held = true; c.holder = f; c.state = 'held'; c.crew = null; f.t = 0; AUDIO.sfx('clang', c.x, c.z); }
      } else {
        poseLift(M);
        f.yaw = angTo(f.yaw, face, 4 * dt);
        c.x = f.x; c.z = f.z; c.y = f.y + f.h + 0.4; c.yaw = f.yaw + Math.PI / 2;
        c.root.position.set(c.x, c.y, c.z); c.root.rotation.set(0, c.yaw, 0);
        f.warn = 1;
        if (f.t > 1.0 && P) {
          const d = Math.max(4, dist(f.x, f.z, P.x, P.z)), tfl = d / 26;
          c.held = false; c.holder = null;
          launchCar(c, (P.x - c.x) / tfl, ((P.y + 1) - c.y) / tfl + 12 * tfl, (P.z - c.z) / tfl);
          c.thrownBy = f; c.wy = 0;
          poseCast(M, 0.2, true); f.warn = 0;
          AUDIO.sfx('swingBig', f.x, f.z);
          endMove(f, 2.5);
        }
      }
      break;
    }
  }
}
function endMove(f, cool) { f.move = null; f.state = 'idle'; f.cool = cool; f.did = false; f.roared = false; f.warn = 0; f.t = 0; }

function kilowatt(f, dt, angry) {
  const M = f.M, tgt = f.aggro && P && !P.downed ? P : null;
  setT(M, B.thighL, 0.2, 0, -0.1); setT(M, B.thighR, 0.05, 0, 0.1); setT(M, B.shinL, -0.4, 0, 0); setT(M, B.shinR, -0.2, 0, 0);
  if (G.frame % 3 === 0) beam(new V3(f.x + rr(-0.6, 0.6), f.y + rr(0, f.h), f.z + rr(-0.6, 0.6)), new V3(f.x + rr(-0.8, 0.8), f.y + rr(0, f.h), f.z + rr(-0.8, 0.8)), { w: 0.05, col: 0x80e0ff, life: 0.08, add: true, jag: 0.3 });
  if (!tgt) { poseHover(M, f.t); return; }
  const d = dist(f.x, f.z, P.x, P.z), face = yawOf(P.x - f.x, P.z - f.z);
  if (!f.move) {
    // drift around the hero at mid range
    f.slot = (f.slot || 0) + dt * 0.35;
    const want = 15, tx = P.x + Math.cos(f.slot) * want, tz = P.z + Math.sin(f.slot) * want;
    const dx = tx - f.x, dz = tz - f.z, l = Math.hypot(dx, dz);
    if (l > 1) { f.x += dx / l * Math.min(l, 7) * dt; f.z += dz / l * Math.min(l, 7) * dt; }
    f.yaw = angTo(f.yaw, face, 5 * dt);
    poseHover(M, f.t); setT(M, B.armR, 0.6, 0, 0.6); setT(M, B.armL, 0.6, 0, -0.6);
    if (f.cool <= 0) {
      f.move = d < 7 ? 'ring' : d > 30 ? 'blink' : pick(angry ? ['bolt', 'storm', 'storm', 'blink', 'chain'] : ['bolt', 'bolt', 'storm', 'blink']);
      f.t = 0; f.shots = 0; f.marks = null;
    }
    return;
  }
  f.yaw = angTo(f.yaw, face, 6 * dt);
  switch (f.move) {
    case 'bolt': case 'chain': {
      poseCast(M, 0.1, f.move === 'chain');
      const per = f.move === 'chain' ? 0.35 : 0.6, n = f.move === 'chain' ? 4 : 1;
      f.warn = 1;
      if (f.t > per * (f.shots + 1)) {
        f.shots++;
        const hx = f.x + fwdX(f.yaw) * 0.6, hy = f.y + f.h * 0.75, hz = f.z + fwdZ(f.yaw) * 0.6;
        const hv = Math.hypot(P.vx, P.vz), hit = P.dodge <= 0 && P.invuln <= 0 && chance(clamp(0.8 - hv / 35 - d / 80, 0.15, 0.8)) && losClear(hx, hy, hz, P.x, P.y + 1, P.z);
        const ex = hit ? P.x : P.x + rr(-3, 3), ez = hit ? P.z : P.z + rr(-3, 3), ey = hit ? P.y + 1 : supportY(ex, ez, P.y + 2);
        beam(new V3(hx, hy, hz), new V3(ex, ey, ez), { w: 0.35, col: 0xa0f0ff, life: 0.2, add: true, jag: 0.8 });
        beam(new V3(hx, hy, hz), new V3(ex, ey, ez), { w: 0.12, col: 0xffffff, life: 0.2, add: true, jag: 0.5 });
        burst('spark', ex, ey, ez, 14, { speed: 6, life: 0.3, size: 0.6, col: [0x80e0ff, 0xffffff] });
        AUDIO.sfx('zap', f.x, f.z);
        if (hit) hurtHero(f.move === 'chain' ? 7 : 12, f.x, f.z, 4);
        if (f.shots >= n) { f.warn = 0; endMove(f, angry ? 1.2 : 2); }
      }
      break;
    }
    case 'storm': {
      // marks on the ground around the hero, then lightning on each
      poseCheer(M, f.t * 0.3); f.warn = 1;
      if (!f.marks) {
        f.marks = [];
        const n = angry ? 6 : 4;
        for (let i = 0; i < n; i++) { const a = rr(0, TAU), r = i === 0 ? 0 : rr(2, 8), x = P.x + Math.cos(a) * r + P.vx * 0.6, z = P.z + Math.sin(a) * r + P.vz * 0.6; f.marks.push({ x, z, y: supportY(x, z, P.y + 2) }); ring(x, supportY(x, z, P.y + 2) + 0.08, z, { r0: 3, r1: 2.8, life: 1.2, col: 0x60d0ff, alpha: 0.9 }); }
      }
      if (f.t > 1.2 && !f.did) {
        f.did = true;
        for (const m of f.marks) {
          beam(new V3(m.x + rr(-2, 2), m.y + 40, m.z + rr(-2, 2)), new V3(m.x, m.y, m.z), { w: 0.6, col: 0xa0f0ff, life: 0.25, add: true, jag: 1.6 });
          burst('spark', m.x, m.y + 0.3, m.z, 16, { speed: 8, life: 0.35, size: 0.7, col: [0x80e0ff, 0xffffff] });
          ring(m.x, m.y + 0.1, m.z, { r0: 0.5, r1: 4, life: 0.4, col: 0xa0f0ff });
          if (dist(P.x, P.z, m.x, m.z) < 3 && Math.abs(P.y - m.y) < 3) hurtHero(16, m.x, m.z, 6);
          for (const o of foesNear(m.x, m.y + 1, m.z, 3)) if (!o.boss) damageFoe(o, 20, 0, 6, 0, { word: 'zap' });
        }
        flash(0.3); AUDIO.sfx('thunder', P.x, P.z); addShake(0.6);
      }
      if (f.t > 1.6) endMove(f, angry ? 1.5 : 2.5);
      break;
    }
    case 'blink': {
      poseCrouch(M, 0.3);
      if (f.t > 0.3 && !f.did) {
        f.did = true;
        burst('spark', f.x, f.y + 1, f.z, 26, { speed: 6, life: 0.4, size: 0.8, col: [0x80e0ff, 0xffffff] });
        const a = rr(0, TAU); let nx = P.x + Math.cos(a) * 13, nz = P.z + Math.sin(a) * 13;
        for (let k = 0; k < 8 && queryBoxes(nx - 1, nz - 1, nx + 1, nz + 1, _qb).some((b) => b.y0 < 3); k++) { const a2 = rr(0, TAU); nx = P.x + Math.cos(a2) * 13; nz = P.z + Math.sin(a2) * 13; }
        beam(new V3(f.x, f.y + 1, f.z), new V3(nx, f.y + 1, nz), { w: 0.4, col: 0x80e0ff, life: 0.2, add: true, jag: 0.6 });
        f.x = nx; f.z = nz;
        burst('spark', f.x, f.y + 1, f.z, 26, { speed: 6, life: 0.4, size: 0.8, col: [0x80e0ff, 0xffffff] });
        AUDIO.sfx('zap', f.x, f.z);
      }
      if (f.t > 0.5) { endMove(f, 0.3); f.cool = 0.4; }
      break;
    }
    case 'ring': {
      poseSpin(M); f.warn = 1;
      if (f.t > 0.55 && !f.did) {
        f.did = true; f.warn = 0;
        ring(f.x, f.y + 1, f.z, { r0: 1, r1: 9, life: 0.4, col: 0x80e0ff, flat: true });
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; beam(new V3(f.x, f.y + 1, f.z), new V3(f.x + Math.cos(a) * 8, f.y + 0.5, f.z + Math.sin(a) * 8), { w: 0.2, col: 0xa0f0ff, life: 0.2, add: true, jag: 0.6 }); }
        if (dist(P.x, P.z, f.x, f.z) < 8 && Math.abs(P.y - f.y) < 4) hurtHero(14, f.x, f.z, 16);
        AUDIO.sfx('zap', f.x, f.z);
      }
      if (f.t > 0.9) endMove(f, 1.5);
      break;
    }
  }
}

function overclock(f, dt, angry) {
  const M = f.M, tgt = f.aggro && P && !P.downed ? P : null;
  // jets under the boots
  if (G.frame % 2 === 0) for (const s of [-1, 1]) particle('spark', f.x + Math.cos(f.yaw) * s * 0.25, f.y - 0.1, f.z - Math.sin(f.yaw) * s * 0.25, { vy: -6, life: 0.25, size: 0.9, size1: 0.2, col: pick([0xffa040, 0xffe080]) });
  poseHover(M, f.t);
  const gy = supportY(f.x, f.z, 999);
  if (!tgt) { f.y = damp(f.y, gy + 12, 1, dt); return; }
  const d = dist(f.x, f.z, P.x, P.z), face = yawOf(P.x - f.x, P.z - f.z);
  f.yaw = angTo(f.yaw, face, 4 * dt);
  if (!f.move) {
    f.slot = (f.slot || 0) + dt * 0.3;
    const tx = P.x + Math.cos(f.slot) * 18, tz = P.z + Math.sin(f.slot) * 18, ty = Math.max(P.y + 8, supportY(tx, tz, 999) + 6);
    f.vx = damp(f.vx, clamp((tx - f.x) * 0.8, -14, 14), 2, dt); f.vz = damp(f.vz, clamp((tz - f.z) * 0.8, -14, 14), 2, dt);
    f.y = damp(f.y, ty, 1.5, dt);
    if (f.cool <= 0) {
      const drones = FOES.list.filter((o) => o.type === 'drone' && !o.ko).length;
      f.move = drones < (angry ? 4 : 2) && chance(0.4) ? 'drones' : pick(angry ? ['missiles', 'laser', 'missiles', 'dive'] : ['missiles', 'laser']);
      if (d < 8) f.move = 'dive';
      f.t = 0; f.shots = 0;
    }
  } else { f.vx = damp(f.vx, 0, 3, dt); f.vz = damp(f.vz, 0, 3, dt); }
  f.x += f.vx * dt; f.z += f.vz * dt;
  const e = { x: f.x, y: f.y - 1, z: f.z, onGround: false }; collide(e, 1, 2.5, 0); f.x = e.x; f.z = e.z;
  if (f.y < gy + 1.5) f.y = gy + 1.5;
  switch (f.move) {
    case 'missiles': {
      poseCast(M, -0.3, true); f.warn = 1;
      if (f.t > 0.5 + f.shots * 0.25 && f.shots < (angry ? 6 : 4)) {
        f.shots++;
        const s = f.shots % 2 ? 1 : -1;
        const ox = f.x + Math.cos(f.yaw) * s * 0.8, oz = f.z - Math.sin(f.yaw) * s * 0.8;
        spawnProj({ owner: 'foe', kind: 'missile', x: ox, y: f.y + f.h * 0.8, z: oz, vx: Math.cos(f.yaw) * s * 6, vy: 9, vz: -Math.sin(f.yaw) * s * 6, speed: 20, homing: 2.2, life: 5, r: 0.6, dmg: 11 });
        AUDIO.sfx('missile', f.x, f.z);
      }
      if (f.t > 2.4) endMove(f, angry ? 1.6 : 2.6);
      break;
    }
    case 'laser': {
      // a red beam from the visor raking across the ground toward the hero
      poseCast(M, -0.5, false); f.warn = 1;
      if (!f.lz) { const a = face + (chance(0.5) ? 1 : -1) * 0.7; f.lz = { x: f.x + fwdX(a) * 10, z: f.z + fwdZ(a) * 10 }; }
      const k = clamp((f.t - 0.6) / 1.8, 0, 1);
      if (f.t > 0.6 && k < 1) {
        f.lz.x = damp(f.lz.x, P.x, 1.5, dt); f.lz.z = damp(f.lz.z, P.z, 1.5, dt);
        const gy2 = supportY(f.lz.x, f.lz.z, P.y + 3), hy = f.y + f.h * 0.85;
        beam(new V3(f.x, hy, f.z), new V3(f.lz.x, gy2, f.lz.z), { w: 0.5, col: 0xff3020, life: 0.05, add: true });
        beam(new V3(f.x, hy, f.z), new V3(f.lz.x, gy2, f.lz.z), { w: 0.18, col: 0xffffff, life: 0.05, add: true });
        if (G.frame % 2 === 0) burst('spark', f.lz.x, gy2 + 0.1, f.lz.z, 3, { speed: 4, up: 3, life: 0.4, size: 0.6, col: [0xff6040, 0xffd040] });
        if (dist(P.x, P.z, f.lz.x, f.lz.z) < 1.8 && Math.abs(P.y - gy2) < 2.5) hurtHero(30 * dt, f.lz.x, f.lz.z, 0, null, true);
        for (const c of CARS.list) if (c.state !== 'gone' && dist(c.x, c.z, f.lz.x, f.lz.z) < 2.5 && chance(dt * 2)) hitCar(c, 40, 0, 12, 0);
        if (G.frame % 6 === 0) AUDIO.sfx('laser', f.lz.x, f.lz.z);
      }
      if (f.t > 2.6) { f.lz = null; endMove(f, 2); }
      break;
    }
    case 'drones': {
      poseCheer(M, f.t); f.warn = 0;
      if (f.t > 0.4 && !f.did) { f.did = true; for (let i = 0; i < (angry ? 3 : 2); i++) { const dr = spawnFoe('drone', 'suits', f.x + rr(-2, 2), f.z + rr(-2, 2), { y: f.y + 1, crime: f.crime }); dr.aggro = true; } AUDIO.sfx('alert', f.x, f.z); HUD.say(f, 'Drones: eliminate the pest.'); }
      if (f.t > 1) endMove(f, 2);
      break;
    }
    case 'dive': {
      f.warn = 1;
      if (f.t < 0.6) { f.y += dt * 4; poseCrouch(M, 0.5); f.tx = P.x; f.tz = P.z; }
      else if (!f.did) {
        const gy3 = supportY(f.tx, f.tz, P.y + 2);
        f.x = damp(f.x, f.tx, 6, dt); f.z = damp(f.z, f.tz, 6, dt); f.y -= dt * 40;
        poseSlam(M, 1);
        if (f.y <= gy3 + 0.5) { f.y = gy3 + 0.5; f.did = true; quake(f.x, f.z, angry ? 11 : 9, 18, 14); }
      } else { f.y += dt * 8; }
      if (f.t > 2.2) endMove(f, 2);
      break;
    }
  }
}
