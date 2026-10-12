// Ashreach — mob, pet and NPC behaviour, zone spawners and the per-frame entity update

// Move toward a point, stopping `stop` metres short. Returns the remaining distance.
function moveToward(e, x, z, dt, stop = 0.5, mul = 1) {
  const dx = x - e.pos.x, dz = z - e.pos.z, d = Math.hypot(dx, dz);
  if (d <= stop || e.rooted || e.stunned > 0) { e.speedNow = 0; moveEnt(e, 0, 0, dt); return d; }
  let sp = (e.S.runSpeed || 5) * mul * (1 + (e.S.runSpeedPct || 0) / 100) * (1 - (e.snared || 0) / 100);
  sp = Math.min(sp, (d - stop) / Math.max(dt, 1e-3));
  faceTo(e, x, z, dt, 10);
  e.speedNow = sp;
  moveEnt(e, dx / d * sp, dz / d * sp, dt);
  return d;
}
function idleEnt(e, dt) { e.speedNow = 0; moveEnt(e, 0, 0, dt); }

// ---------- mobs ----------
function aggroRange(mob, p) {
  const diff = mob.level - p.level;
  if (conXpMul(p.level, mob.level) === 0) return 0;
  let r = clamp(13 + diff * 1.2, 6, 22);
  if (p.stealth) r *= 0.25;
  return r;
}
function topHate(mob) {
  let best = null, bv = -1;
  for (const [e, v] of mob.hate) {
    if (e.dead || e.removed || !isHostile(mob, e) || Math.hypot(e.pos.x - mob.home.x, e.pos.z - mob.home.z) > mob.ai.leash + 30) { mob.hate.delete(e); continue; }
    if (v > bv) { bv = v; best = e; }
  }
  return best;
}
function alertFriends(mob, foe) {
  for (const o of entsNear(mob.pos.x, mob.pos.z, mob.tpl.social ? 14 : 0, (o) => o.kind === 'mob' && !o.dead && o !== mob && (o.tplId === mob.tplId || (mob.ai.camp && o.ai && o.ai.camp === mob.ai.camp)))) {
    if (!o.hate.size) addHate(o, foe, 1);
  }
}
function mobUpdate(e, dt) {
  const A = e.ai, T = e.tpl;
  if (A.evade) {
    // leashed: run home untouchable, then reset
    e.invulnerable = true; e.attacking = false; e.target = null;
    const d = moveToward(e, e.home.x, e.home.z, dt, 0.8, 1.6);
    if (d < 1) { A.evade = false; e.invulnerable = false; e.hp = e.S.maxHp; e.buffs = e.buffs.filter((b) => !b.hostile); refreshStats(e); }
    return;
  }
  if (e.stunned > 0 || e.calmed) { idleEnt(e, dt); return; }
  // look for trouble
  if (!e.hate.size && T.aggro) {
    A.scanT = (A.scanT || 0) - dt;
    if (A.scanT <= 0) {
      A.scanT = 0.4 + Math.random() * 0.3;
      for (const p of entsNear(e.pos.x, e.pos.z, 24, (o) => (o.kind === 'player' || o.kind === 'sim' || o.kind === 'pet') && !o.dead && isHostile(e, o))) {
        if (entDist(e, p) < aggroRange(e, p.kind === 'pet' ? p.owner : p) && losClear(e.pos.x, e.pos.y + 1, e.pos.z, p.pos.x, p.pos.y + 1, p.pos.z)) { addHate(e, p, 1); break; }
      }
    }
  }
  const foe = e.hate.size ? topHate(e) : null;
  if (foe) {
    if (!A.engaged) { A.engaged = true; alertFriends(e, foe); if (typeof sfx === 'function' && entDist(e, PLAYER) < 30) sfx(T.model === 'critter' ? 'chirp' : T.model === 'drone' ? 'drone_hum' : T.model === 'golem' ? 'golem_stomp' : T.model === 'worm' ? 'wyrm' : T.model === 'insect' ? 'screech' : 'growl', e.pos); }
    if (Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z) > A.leash) { A.evade = true; A.engaged = false; e.hate.clear(); return; }
    e.target = foe;
    if (!e.attacking) startAttack(e, foe);
    mobAbilities(e, foe, dt);
    fightMove(e, foe, dt);
    return;
  }
  if (A.engaged) { A.engaged = false; e.attacking = false; e.target = null; }
  // wander about the spawn point
  A.t -= dt;
  if (A.t <= 0) {
    A.t = 4 + Math.random() * 8;
    const r = Math.random() < 0.5 ? 0 : 7;
    A.wander.set(e.home.x + frand(-r, r), 0, e.home.z + frand(-r, r));
  }
  moveToward(e, A.wander.x, A.wander.z, dt, 0.5, 0.35);
}
// Close to weapon range (ranged fighters hold back) and keep facing the foe.
function fightMove(e, foe, dt) {
  if (e.cast) { idleEnt(e, dt); faceTo(e, foe.pos.x, foe.pos.z, dt); return; }
  const A = attackStats(e);
  const want = A.ranged ? Math.min(A.range * 0.75, 16) : Math.max(0.6, A.range * 0.7);
  const d = reachDist(e, foe);
  if (d > want || (A.ranged && !losClear(e.pos.x, e.pos.y + 1.5, e.pos.z, foe.pos.x, foe.pos.y + 1.2, foe.pos.z))) moveToward(e, foe.pos.x, foe.pos.z, dt, 0.2 + ((foe.rig && foe.rig.radius) || 0.4) + ((e.rig && e.rig.radius) || 0.4) + want * 0.9);
  else { idleEnt(e, dt); faceTo(e, foe.pos.x, foe.pos.z, dt); }
}
function mobAbilities(e, foe, dt) {
  const ab = e.tpl.abilities;
  if (!ab || !ab.length || e.cast) return;
  e.ai.abT = (e.ai.abT ?? 3 + Math.random() * 4) - dt;
  if (e.ai.abT > 0) return;
  e.ai.abT = 5 + Math.random() * 7;
  const opts = ab.filter((id) => { const n = nanoDef(id); return n && !(e.cds['n:' + id] > 0) && e.np >= nanoCostFor(e, n); });
  if (!opts.length) return;
  // prefer heals when hurt, otherwise anything offensive
  const heals = opts.filter((id) => nanoDef(id).fx.some((f) => f.t === 'heal' || f.t === 'hot'));
  let id;
  if (e.hp / e.S.maxHp < 0.45 && heals.length) id = pick(heals);
  else { const off = opts.filter((id) => !heals.includes(id)); if (!off.length) return; id = off[Math.floor(Math.random() * off.length)]; }
  const n = nanoDef(id);
  castNano(e, id, n.target === 'enemy' ? foe : e);
}

// ---------- pets ----------
function petUpdate(e, dt) {
  const o = e.owner;
  if (!o || o.removed) { removeEnt(e); return; }
  if (o.dead) { e.attacking = false; idleEnt(e, dt); return; }
  if (entDist(e, o) > 60) { e.pos.set(o.pos.x + 1.5, o.pos.y, o.pos.z + 1.5); e.pos.y = groundY(e.pos.x, e.pos.z); }
  const healer = e.tpl.arch === 'healer';
  if (healer) {
    e.ai.healT = (e.ai.healT || 0) - dt;
    if (e.ai.healT <= 0) {
      e.ai.healT = 6;
      const hurt = teamOf(o).filter((m) => !m.dead && entDist(m, e) < 25 && m.hp / m.S.maxHp < 0.8).sort((a, b) => a.hp / a.S.maxHp - b.hp / b.S.maxHp)[0];
      if (hurt) { heal(e, hurt, 15 + e.level * 6, { nano: 'Mending Pulse' }); if (e.rig && e.rig.play) e.rig.play('cast'); nanoFx(e, hurt, { icon: { color: 0x7dff9a }, reqs: {} }); }
    }
  }
  // fight what the owner fights, or what bites the owner
  let foe = o.attacking && canAttack(e, o.target) ? o.target : null;
  if (!foe && e.ai.guard !== false) for (const m of ENTS) if (m.kind === 'mob' && !m.dead && m.target === o && entDist(m, o) < 30) { foe = m; break; }
  if (e.ai.cmd === 'stop') foe = null;
  if (foe && !healer) {
    e.target = foe;
    if (!e.attacking) startAttack(e, foe);
    fightMove(e, foe, dt);
    return;
  }
  e.attacking = false;
  const a = o.yaw + Math.PI + 0.7;
  const fx = o.pos.x + Math.sin(a) * 2.5, fz = o.pos.z + Math.cos(a) * 2.5;
  const d = Math.hypot(fx - e.pos.x, fz - e.pos.z);
  if (d > 1.2) moveToward(e, fx, fz, dt, 0.6, d > 8 ? 1.3 : 1.05);
  else { idleEnt(e, dt); e.yaw = angTo(e.yaw, o.yaw, dt * 3); }
}

// ---------- npcs ----------
function npcUpdate(e, dt) {
  e.speedNow = 0;
  if (e.rig && e.rig.prop) return;
  if (PLAYER && entDist(e, PLAYER) < 6) faceTo(e, PLAYER.pos.x, PLAYER.pos.z, dt, 3);
  else if (e.poi) e.yaw = angTo(e.yaw, e.poi.yaw || 0, dt * 2);
}

// ---------- spawners ----------
const SPAWNERS = [];
function setupSpawners(def) {
  SPAWNERS.length = 0;
  (def.spawns || []).forEach((s, si) => {
    const sp = { def: s, slots: [], camp: s.camp ? 'camp' + si : null };
    for (let i = 0; i < (s.n || 3); i++) sp.slots.push({ ent: null, t: 0 });
    SPAWNERS.push(sp);
    for (const slot of sp.slots) spawnInto(sp, slot);
  });
}
function spawnInto(sp, slot) {
  const s = sp.def;
  const id = s.mobs[Math.floor(Math.random() * s.mobs.length)];
  const T = MOB_T[id];
  if (!T) return;
  const lr = s.lvl || T.lvl;
  const lvl = Math.round(frand(lr[0], lr[1]));
  for (let k = 0; k < 8; k++) {
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * (s.r || 10);
    const x = s.x + Math.sin(a) * r, z = s.z + Math.cos(a) * r;
    const res = collideMove(x, z, x, z, 0.6);
    if (Math.abs(res.x - x) > 0.01 || Math.abs(res.z - z) > 0.01) continue;
    slot.ent = spawnMob(id, lvl, x, z, { spawn: sp, camp: sp.camp, leash: Math.max(35, (s.r || 10) + 25) });
    return;
  }
}
function updateSpawners(dt) {
  for (const sp of SPAWNERS) for (const slot of sp.slots) {
    if (slot.ent && !slot.ent.removed) continue;
    if (slot.ent) { slot.ent = null; slot.t = sp.def.respawn || (MOB_T[sp.def.mobs[0]] && MOB_T[sp.def.mobs[0]].named ? 300 : 75); }
    slot.t -= dt;
    if (slot.t <= 0) {
      // don't pop a mob into existence in the player's face
      if (PLAYER && Math.hypot(PLAYER.pos.x - sp.def.x, PLAYER.pos.z - sp.def.z) < 18) { slot.t = 5; continue; }
      spawnInto(sp, slot);
      if (!slot.ent) slot.t = 10;
    }
  }
}

// ---------- per-frame entity update ----------
function updateEnts(dt) {
  if (oorMsgT > 0) oorMsgT -= dt;
  for (let i = ENTS.length - 1; i >= 0; i--) {
    const e = ENTS[i];
    if (!e || e.removed) continue;
    if (e.dead) {
      e.deadT += dt;
      e.speedNow = 0;
      if (e.kind === 'mob' || e.kind === 'pet') {
        if (e.deadT > CORPSE_T) removeEnt(e);
        else if (e.deadT > CORPSE_T - 2 && e.rig) e.rig.root.position.y = e.pos.y - (e.deadT - CORPSE_T + 2) * 0.8;
      } else if (e.kind === 'sim' && typeof simDeadUpdate === 'function') simDeadUpdate(e, dt);
      if (e.deadT < CORPSE_T - 2) syncRig(e, dt);
      continue;
    }
    updateBuffs(e, dt);
    if (e.dead) continue;
    updateCooldowns(e, dt);
    updateRegen(e, dt);
    updateCast(e, dt);
    switch (e.kind) {
      case 'mob': mobUpdate(e, dt); break;
      case 'pet': petUpdate(e, dt); break;
      case 'npc': npcUpdate(e, dt); break;
      case 'sim': if (typeof simUpdate === 'function') simUpdate(e, dt); else idleEnt(e, dt); break;
      case 'player': break;   // driven by 15_player.js
    }
    if (e.removed) continue;
    updateAttack(e, dt);
    syncRig(e, dt);
  }
}
