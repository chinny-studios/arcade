// Veyra Below — monsters: spawning, champion and unique packs, generic attack AI

function enemyLevelStats(def, lvl, o = {}) {
  const D = DIFFS[GAME.diff], party = 1 + 0.32 * ALLIES.length;
  let hp = def.hp * LCURVE(lvl) * (1 + lvl / 80) * D.hp * party;
  let atk = def.atk * ECURVE(lvl) * D.dmg;
  let xp = (def.xp || 1) * (5 + 2 * lvl) * (1 + lvl / 40) * D.xp;
  if (o.elite) { hp *= 2.6; atk *= 1.25; xp *= 3; if (o.elite.includes('strong')) atk *= 1.4; }
  if (o.unique) { hp *= 4.5; atk *= 1.4; xp *= 6; }
  if (o.variant) { hp *= RARE_VARIANT.hp; xp *= RARE_VARIANT.xp; }
  return { hp: Math.round(hp), atk, xp: Math.round(xp), ata: 30 + lvl * 2.2, evp: (def.evp || 1) * (20 + lvl * 1.8) };
}
function spawnEnemy(id, x, z, o = {}) {
  const def0 = ENEMIES[id];
  const def = o.variant ? Object.assign({}, def0, { color: 0xf0d050, color2: 0xffffff }) : def0;
  const lvl = Math.max(1, Math.round(o.lvl || 1));
  const st = enemyLevelStats(def, lvl, o);
  const scale = o.unique ? 1.3 : o.elite ? 1.12 : 1;
  const e = makeActor('enemy', x, z, {
    team: 1, def, defId: id, lvl, hp: st.hp, maxHp: st.hp, atk: st.atk, xp: st.xp, ata: st.ata, evp: st.evp,
    res: def.res || {}, armored: def.armored || 0, block: def.block || 0, poise: def.poise || 0, fly: !!def.fly, static: def.move === 'static',
    r: Math.max(0.35, 0.5 * (def.size || 1) * scale), speed: def.speed * (o.elite && o.elite.includes('fast') ? 1.4 : 1),
    elite: o.elite || null, unique: o.unique || null, variant: !!o.variant, room: o.room || null, area: LV ? LV.area : 'forest', quest: o.quest || null,
    cds: def.attacks.map((a) => rnd.range(0.4, 1.2) * (a.cd || 1) * 0.5), aggro: null, sleep: !!o.sleep, wanderT: 0, home: { x, z }, summoner: o.summoner || null,
  });
  e.name = o.unique ? o.unique : o.variant ? RARE_VARIANT.name(def.name) : def.name;
  e.rig = makeMonster(def, scale);
  e.model = e.rig.g; e.h = (e.rig.h || 1.5) * (def.size || 1) * scale;
  if (o.elite || o.unique) {
    const ring = mesh(GM.ring(), glowMat(o.unique ? 0xffc040 : 0x5090ff, 0.7), 0, 0.06, 0, e.r * 2.6 / e.model.scale.x, e.r * 2.6 / e.model.scale.x, 1);
    ring.rotation.x = -Math.PI / 2; e.model.add(ring); e.aura = ring;
  }
  if (def.stealth) e.stealthed = true;
  e.model.position.set(x, 0, z); e.yaw = rnd() * TAU; e.model.rotation.y = e.yaw;
  R.root.add(e.model);
  if (o.teleIn) { e.state = 'spawn'; e.st = 0; e.untargetable = true; FX.teleIn(x, z, 0xc060ff); AUDIO.sfx('spawn', x, z, 0.5); e.model.scale.multiplyScalar(0.01); e.spawnScale = scale * (def.size || 1); }
  return e;
}
function eliteName(e) { return e.elite ? e.elite.map((m) => ELITE_MODS[m].name).join(', ') : ''; }

// ---------- AI ----------
function pickTarget(e) {
  if (e.aggro && alive(e.aggro) && dist2(e.x, e.z, e.aggro.x, e.aggro.z) < 30 * 30) return e.aggro;
  let best = null, bd = 30 * 30;
  for (const p of ENTS) { if (p.team !== 0 || !alive(p) || p.summon) continue; const d = dist2(e.x, e.z, p.x, p.z); if (d < bd) { bd = d; best = p; } }
  return best;
}
function alertNear(e, tgt) {
  for (const o of ENTS) if (o.team === 1 && !o.dead && !o.aggro && o !== e && dist2(o.x, o.z, e.x, e.z) < 9 * 9 && (!o.room || o.room === e.room)) { o.aggro = tgt; o.sleep = false; }
}
function updateEnemy(e, dt) {
  e.t += dt; e.st += dt;
  if (e.dead) {
    e.deadT = (e.deadT || 0) + dt;
    animMonster(e.rig, { t: e.t, state: 'dead', ph: e.deadT / 1.2 });
    if (e.deadT > 0.6) e.model.position.y = -(e.deadT - 0.6) * 1.2;
    if (e.deadT > 1.4) removeActor(e);
    return;
  }
  updateStatus(e, dt); if (e.dead) return;
  if (e.pod) { if (e.flash > 0) e.flash -= dt; return; } // turret pods are driven by their boss
  if (e.state === 'spawn') {
    const k = Math.min(1, e.st / 0.6); e.model.scale.setScalar(Math.max(0.01, k * e.spawnScale));
    if (k >= 1) { e.state = 'chase'; e.untargetable = false; e.aggro = e.aggro || pickTarget(e); }
    e.model.position.set(e.x, 0, e.z); animMonster(e.rig, { t: e.t, state: 'idle' });
    return;
  }
  if (e.tele && e.state !== 'wind') { FX.kill(e.tele); e.tele = null; }
  const def = e.def;
  let move = 0;
  if (!canAct(e)) {
    if (e.status.freeze && Math.random() < 0.2) FX.spawn(e.x + rnd.range(-0.4, 0.4), rnd.range(0.3, e.h), e.z + rnd.range(-0.4, 0.4), 0, 0.3, 0, 0xc0f0ff, 0.5, 0.3);
    if (e.status.shock && Math.random() < 0.2) FX.spawn(e.x, e.h * 0.6, e.z, rnd.range(-2, 2), rnd.range(0, 2), rnd.range(-2, 2), 0xfff060, 0.2, 0.25);
    if (e.state === 'wind') { e.state = 'chase'; if (e.tele) { FX.kill(e.tele); e.tele = null; } }
    applyKnockback(e, dt);
    finishEnemyFrame(e, 0, dt, e.status.freeze ? 0 : 1);
    return;
  }
  for (let i = 0; i < e.cds.length; i++) e.cds[i] -= dt * (e.elite && e.elite.includes('fast') ? 1.3 : 1);
  if (e.hitT > 0) { e.hitT -= dt; applyKnockback(e, dt); finishEnemyFrame(e, 0, dt); return; }
  // stealth: shimmer until close
  if (def.stealth) {
    const near = ENTS.some((p) => p.team === 0 && alive(p) && dist2(p.x, p.z, e.x, e.z) < 3.6 * 3.6);
    e.stealthed = !(near || e.state === 'wind' || e.state === 'strike' || e.lastHurt < 2);
  }
  e.lastHurt += dt;
  // sleeping packs wake when someone comes into view
  if (!e.aggro) {
    for (const p of ENTS) {
      if (p.team !== 0 || !alive(p) || p.summon) continue;
      const d2 = dist2(p.x, p.z, e.x, e.z), sight = e.sleep ? 8 : 12;
      if (d2 < sight * sight && los(e.x, e.z, p.x, p.z)) { e.aggro = p; e.sleep = false; alertNear(e, p); if (e.unique || e.elite) AUDIO.sfx('roar', e.x, e.z, 0.4); break; }
    }
    if (!e.aggro) {
      // idle wander near home
      e.wanderT -= dt;
      if (!e.sleep && !e.static && e.wanderT <= 0) { e.wanderT = rnd.range(2, 5); e.goal = { x: e.home.x + rnd.range(-3, 3), z: e.home.z + rnd.range(-3, 3) }; }
      if (e.goal && !e.static) { const dx = e.goal.x - e.x, dz = e.goal.z - e.z, l = Math.hypot(dx, dz); if (l > 0.3) { moveCircle(e, dx / l * e.speed * 0.3 * dt, dz / l * e.speed * 0.3 * dt, e.r); faceTo(e, e.goal.x, e.goal.z, 5, dt); move = 0.4; } else e.goal = null; }
      applyKnockback(e, dt); finishEnemyFrame(e, move, dt); return;
    }
  }
  const tgt = pickTarget(e);
  if (!tgt) { e.aggro = null; finishEnemyFrame(e, 0, dt); return; }
  e.aggro = tgt;
  const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz), see = los(e.x, e.z, tgt.x, tgt.z);
  // the current attack
  if (e.state === 'wind' || e.state === 'strike' || e.state === 'act') {
    const a = e.atk_;
    if (e.state === 'wind') {
      if (a.type !== 'charge' && a.type !== 'beam' && a.type !== 'lob' && a.type !== 'cast') faceTo(e, tgt.x, tgt.z, 3, dt);
      const wind = a.windup * (e.elite && e.elite.includes('fast') ? 0.75 : 1);
      if (e.st >= wind) { e.state = 'act'; e.st = 0; executeAttack(e, a, tgt); }
      finishEnemyFrame(e, 0, dt, 1, { state: 'wind', ph: Math.min(1, e.st / wind) });
      return;
    }
    if (e.state === 'act') {
      // multi-frame attacks: charge, pounce leap, beam
      const done = actAttack(e, a, tgt, dt);
      if (done) { e.state = 'strike'; e.st = 0; }
      finishEnemyFrame(e, a.type === 'charge' ? 1 : 0, dt, 1, { state: 'strike', ph: 0.1 });
      return;
    }
    if (e.state === 'strike') {
      if (e.st >= 0.4) { e.state = 'chase'; e.st = 0; }
      finishEnemyFrame(e, 0, dt, 1, { state: 'strike', ph: e.st / 0.4 });
      return;
    }
  }
  // flee (rare birds)
  if (def.move === 'flee') {
    e.fleeT = (e.fleeT || 0) + dt;
    const l = d || 1; let fx = -dx / l, fz = -dz / l;
    if (clearance(LV, e.x + fx * 2, e.z + fz * 2) < 0.6) { fx = -fz; fz = dx / l; }
    if (d < 9) { moveCircle(e, fx * e.speed * dt, fz * e.speed * dt, e.r); move = 1; e.yaw = Math.atan2(fx, fz); }
    if (e.fleeT > 25) { FX.teleIn(e.x, e.z, 0xffe060); HUD.toast(`The ${e.name} got away!`, '#ffe060'); removeActor(e); return; }
    finishEnemyFrame(e, move, dt); return;
  }
  // blinking elites
  if (e.elite && e.elite.includes('blink')) { e.blinkT = (e.blinkT || 3) - dt; if (e.blinkT <= 0 && d > 4) { e.blinkT = rnd.range(3, 5); const a = rnd() * TAU; const nx = tgt.x + Math.cos(a) * 2.5, nz = tgt.z + Math.sin(a) * 2.5; if (!solidAt(nx, nz)) { FX.teleIn(e.x, e.z, 0x6090ff); e.x = nx; e.z = nz; FX.teleIn(e.x, e.z, 0x6090ff); } } }
  // choose an attack
  if (see) for (let i = 0; i < def.attacks.length; i++) {
    const a = def.attacks[i];
    if (e.cds[i] > 0 || d > a.range + tgt.r || d < (a.min || 0)) continue;
    if (a.type === 'summon' && ENTS.filter((o) => o.summoner === e && !o.dead).length >= 4) continue;
    e.atk_ = a; e.cds[i] = a.cd * rnd.range(0.85, 1.2); e.state = 'wind'; e.st = 0;
    startWindup(e, a, tgt);
    break;
  }
  if (e.state === 'wind') { finishEnemyFrame(e, 0, dt, 1, { state: 'wind', ph: 0 }); return; }
  // movement
  if (!e.static) {
    let want = 0;
    const main = def.attacks.find((a) => a.type === 'melee' || a.type === 'pounce' || a.type === 'explode') || def.attacks[0];
    if (def.move === 'close') want = main ? Math.max(0.8, main.range * 0.75) : 1.5;
    else if (def.move === 'kite') want = Math.min(7, (main ? main.range : 8) - 2);
    let mx = 0, mz = 0;
    if (!see || d > want + 0.5) {
      if (see && d < 14) { mx = dx / d; mz = dz / d; }
      else { updateFlow(LV, tgt.x, tgt.z); const f = flowDir(LV, e.x, e.z); if (f) { mx = f.x; mz = f.z; } }
    } else if (def.move === 'kite' && d < want - 2) { mx = -dx / d; mz = -dz / d; }
    else if (def.move === 'kite') { const s = Math.sin(e.t * 0.7 + e.id) > 0 ? 1 : -1; mx = -dz / d * s * 0.6; mz = dx / d * s * 0.6; }
    if (mx || mz) { const sp = e.speed * speedMul(e) * (e.sleep ? 0 : 1); moveCircle(e, mx * sp * dt, mz * sp * dt, e.r); move = 1; }
    faceTo(e, see ? tgt.x : e.x + mx, see ? tgt.z : e.z + mz, 6, dt);
  } else faceTo(e, tgt.x, tgt.z, 4, dt);
  applyKnockback(e, dt);
  finishEnemyFrame(e, move, dt);
}
function finishEnemyFrame(e, move, dt, animRate = 1, st) {
  e.model.position.set(e.x, e.burrowY || 0, e.z);
  e.model.rotation.y = e.yaw;
  if (e.stealthed !== undefined) e.model.visible = !e.stealthed || Math.random() < 0.06;
  const s = st || { state: e.hitT > 0 ? 'hit' : move ? 'move' : 'idle' };
  animMonster(e.rig, { t: animRate ? e.t : e.frozenT || e.t, move, state: s.state, ph: s.ph });
  if (!animRate) e.frozenT = e.frozenT || e.t; else e.frozenT = 0;
  if (e.aura) e.aura.rotation.z += dt;
  if (e.flash > 0) { e.flash -= dt; const k = 1 + e.flash * 0.8; e.rig.body.scale.set(k, 1 / k, k); } else if (!e.rig.squish) e.rig.body.scale.set(1, 1, 1);
}
function startWindup(e, a, tgt) {
  const w = a.windup;
  if (a.type === 'slam' || a.type === 'explode') e.tele = FX.tele(e.x, e.z, a.radius, w, 0xff3030);
  else if (a.type === 'charge') { e.chargeYaw = Math.atan2(tgt.x - e.x, tgt.z - e.z); e.yaw = e.chargeYaw; e.tele = FX.tele(e.x, e.z, e.r + 0.4, w, 0xff3030, 'line', a.range, e.chargeYaw); }
  else if (a.type === 'beam') { e.beamYaw = Math.atan2(tgt.x - e.x, tgt.z - e.z); e.yaw = e.beamYaw; e.tele = FX.tele(e.x, e.z, 0.5, w, 0xff3060, 'line', a.range, e.beamYaw); }
  else if (a.type === 'cast') { e.castAt = { x: tgt.x + (tgt.vx || 0), z: tgt.z }; e.tele = FX.tele(e.castAt.x, e.castAt.z, a.radius, w + (a.delay || 0), 0xff3030); }
  else if (a.type === 'summon') FX.burst(e.x, e.h, e.z, e.def.color2, 16, 2, 0.8, 0.4, { up: 1 });
  if (a.type === 'explode') AUDIO.sfx('door', e.x, e.z, 0.4);
}
function executeAttack(e, a, tgt) {
  const dmg = e.atk * (a.mult || 1);
  const elem = e.def.elem;
  switch (a.type) {
    case 'melee': {
      AUDIO.sfx('swing', e.x, e.z, 0.5);
      const arc = a.arc || 1.4, range = a.range + 0.3, fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
      FX.slash(e.x + fx * 0.3, e.z + fz * 0.3, e.yaw, arc, range, 0xff8060, e.h * 0.5);
      for (const p of ENTS) {
        if (p.team !== 0 || !alive(p) || p.summon) continue;
        const ex = p.x - e.x, ez = p.z - e.z, dd = Math.hypot(ex, ez); if (dd > range + p.r) continue;
        if (dd > p.r + 0.3 && Math.acos(clamp((ex * fx + ez * fz) / dd, -1, 1)) > arc / 2 + 0.3) continue;
        enemyHit(e, p, { dmg, kb: 2 });
      }
      e.actDone = true;
      break;
    }
    case 'pounce': e.leap = { sx: e.x, sz: e.z, tx: tgt.x, tz: tgt.z, t: 0, dur: 0.32 }; AUDIO.sfx('swing', e.x, e.z, 0.4); break;
    case 'charge': e.charge = { t: 0, dist: 0, max: a.range, hit: new Set() }; AUDIO.sfx('roar', e.x, e.z, 0.3); break;
    case 'slam': {
      FX.explode(e.x, e.z, a.radius, 0xffa060); AUDIO.sfx('explode', e.x, e.z, 0.6); CAM.shake = Math.min(0.6, CAM.shake + 0.25);
      for (const p of foesInRadius(1, e.x, e.z, a.radius)) if (!p.summon) enemyHit(e, p, { dmg, kb: 6, sure: true });
      e.actDone = true; break;
    }
    case 'proj': {
      const n = a.burst || 1, col = a.proj === 'laser' ? 0xff4040 : a.proj === 'darkorb' ? 0xb050ff : ELEM_COLORS[elem] || 0xff7030;
      for (let k = 0; k < n; k++) GAME.later(k * 0.13, () => {
        if (e.dead || !alive(tgt)) return;
        const yy = Math.atan2(tgt.x - e.x, tgt.z - e.z) + (n > 1 ? rnd.range(-0.08, 0.08) : 0);
        const shots = e.elite && e.elite.includes('multi') ? [-0.25, 0, 0.25] : [0];
        for (const s of shots) shootProj(e, { x: e.x, z: e.z, y: e.fly ? e.h * 0.7 : e.h * 0.6, dx: Math.sin(yy + s), dz: Math.cos(yy + s), speed: a.speed || 10, life: (a.range + 4) / (a.speed || 10), r: 0.35, team: 1, color: col, kind: a.proj || 'fireball', homing: a.homing || 0, target: tgt, payload: { dmg, elem } });
        AUDIO.sfx(a.proj === 'laser' ? 'laser' : 'orb', e.x, e.z, 0.4);
      });
      e.actDone = true; break;
    }
    case 'lob': {
      const tx = tgt.x + (tgt.vx || 0) * 0.5, tz = tgt.z + (tgt.vz || 0) * 0.5, dur = 0.9;
      const tele = FX.tele(tx, tz, a.radius, dur, 0xff5020);
      shootProj(e, { x: e.x, z: e.z, y: 1, dx: 0, dz: 1, speed: 0, life: 9, r: 0.3, team: 1, color: ELEM_COLORS[elem] || 0xff7030, kind: 'magma', arc: { tx, tz, dur, h: 4 }, onHit: () => {},
        onEnd: (p) => { FX.kill(tele); FX.explode(p.x, p.z, a.radius, 0xff7030); AUDIO.sfx('explode', p.x, p.z, 0.4);
          for (const q of foesInRadius(1, p.x, p.z, a.radius)) if (!q.summon) enemyHit(e, q, { dmg, elem, sure: true });
          if (a.pool) addZone({ x: p.x, z: p.z, r: a.radius * 0.8, dur: 3, tick: 0.5, team: 1, owner: e, onHit: (q) => { if (!q.summon) dealDamage(e, q, dmg * 0.15, { elem: 'fire', kind: 'dot' }); }, fxTick: (z) => FX.burst(z.x, 0.2, z.z, 0xff6020, 6, 1.5, 0.6, 0.5, { flat: true, up: 1 }) }); } });
      e.actDone = true; break;
    }
    case 'cast': {
      const pt = e.castAt || { x: tgt.x, z: tgt.z };
      const fxk = a.fx;
      addZone({ x: pt.x, z: pt.z, r: a.radius, delay: a.delay || 0.8, team: 1, owner: e,
        fx: (z) => { const c = fxk === 'thorns' ? 0x80d040 : fxk === 'dark' ? 0xb050ff : 0xff7030; FX.explode(z.x, z.z, z.r, c); if (fxk === 'thorns') FX.burst(z.x, 0.5, z.z, 0x5a8a30, 16, 3, 0.6, 0.5, { up: 4, grav: 8 }); AUDIO.sfx(fxk === 'dark' ? 'dark' : 'explode', z.x, z.z, 0.5); },
        onHit: (q) => { if (!q.summon) enemyHit(e, q, { dmg, elem, sure: true, status: fxk === 'thorns' ? { type: 'poison', dur: 4, v: dmg * 0.1 } : null }); } });
      if (e.tele) { e.teleCarry = e.tele; e.tele = null; GAME.later(a.delay || 0.8, () => FX.kill(e.teleCarry)); }
      AUDIO.sfx('orb', e.x, e.z, 0.4); e.actDone = true; break;
    }
    case 'summon': {
      for (let k = 0; k < (a.n || 2); k++) {
        const ang = rnd() * TAU, x = e.x + Math.cos(ang) * 1.8, z = e.z + Math.sin(ang) * 1.8;
        if (solidAt(x, z)) continue;
        const m = spawnEnemy(a.what, x, z, { lvl: e.lvl, teleIn: true, room: e.room, summoner: e }); m.aggro = tgt; m.xp = Math.round(m.xp * 0.3); m.noDrop = true;
      }
      e.actDone = true; break;
    }
    case 'explode': {
      FX.explode(e.x, e.z, a.radius, ELEM_COLORS[elem] || 0xff7030); AUDIO.sfx('explode', e.x, e.z); CAM.shake = Math.min(0.7, CAM.shake + 0.3);
      for (const p of foesInRadius(1, e.x, e.z, a.radius)) if (!p.summon) enemyHit(e, p, { dmg, elem, kb: 5, sure: true });
      e.selfDestruct = true; killActor(e, null); e.actDone = true; break;
    }
    case 'beam': e.beam = { t: 0, dur: a.dur || 1.2, tick: 0, len: a.range }; AUDIO.sfx('laser', e.x, e.z, 0.6); break;
  }
}
// attacks that play out over several frames; returns true when finished
function actAttack(e, a, tgt, dt) {
  if (e.actDone) { e.actDone = false; return true; }
  if (e.leap) {
    const L_ = e.leap; L_.t += dt; const k = Math.min(1, L_.t / L_.dur);
    const nx = lerp(L_.sx, L_.tx, k), nz = lerp(L_.sz, L_.tz, k); moveCircle(e, nx - e.x, nz - e.z, e.r);
    e.burrowY = Math.sin(k * Math.PI) * 1.0;
    if (k >= 1) { e.burrowY = 0; e.leap = null; for (const p of foesInRadius(1, e.x, e.z, 1.3 + e.r)) if (!p.summon) enemyHit(e, p, { dmg: e.atk * (a.mult || 1), kb: 3 }); FX.burst(e.x, 0.2, e.z, 0xc0a080, 8, 2, 0.4, 0.4, { flat: true }); return true; }
    return false;
  }
  if (e.charge) {
    const c = e.charge, sp = 13 * dt, ox = e.x, oz = e.z;
    moveCircle(e, Math.sin(e.chargeYaw) * sp, Math.cos(e.chargeYaw) * sp, e.r);
    const moved = Math.hypot(e.x - ox, e.z - oz); c.dist += sp; c.t += dt;
    for (const p of foesInRadius(1, e.x, e.z, e.r + 0.6)) if (!c.hit.has(p) && !p.summon) { c.hit.add(p); enemyHit(e, p, { dmg: e.atk * (a.mult || 1), kb: 7 }); }
    if (Math.random() < 0.5) FX.burst(e.x, 0.2, e.z, 0x907060, 2, 1, 0.4, 0.4, { flat: true });
    if (c.dist >= c.max || moved < sp * 0.3 || c.t > 1.5) { e.charge = null; if (moved < sp * 0.3) { e.hitT = 0.8; CAM.shake = Math.min(0.5, CAM.shake + 0.15); } return true; }
    return false;
  }
  if (e.beam) {
    const b = e.beam; b.t += dt; b.tick -= dt;
    let ex = e.x, ez = e.z;
    for (let s = 0; s < b.len; s += 0.5) { const x = e.x + Math.sin(e.beamYaw) * s, z = e.z + Math.cos(e.beamYaw) * s; if (solidAt(x, z)) break; ex = x; ez = z; }
    FX.beam(e.x, e.h * 0.75, e.z, ex, 1, ez, 0xff3060, 0.25, 0.06);
    if (b.tick <= 0) { b.tick = 0.15; const z = { x: e.x, z: e.z, r: 0.5, shape: 'line', len: Math.hypot(ex - e.x, ez - e.z), yaw: e.beamYaw }; for (const p of ENTS) if (p.team === 0 && alive(p) && !p.summon && inZone(z, p)) enemyHit(e, p, { dmg: e.atk * (a.mult || 0.4), elem: 'dark', sure: true }); }
    if (b.t >= b.dur) { e.beam = null; return true; }
    return false;
  }
  return true;
}
