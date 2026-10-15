// Tokoyo — creatures: spawning, perception, wandering, chasing, attacks, bosses, death & drops

const MOBS_LIVE = [];
const HAZARDS = [];   // delayed ground attacks (roots, stomps)
const SPAWN_TABLE = {
  1: { day: [['deer', 4, 1, 3], ['boar', 4, 1, 3], ['gaki', 1.6, 1, 2]], night: [['gaki', 5, 1, 3], ['boar', 1.5, 1, 2], ['deer', 1, 1, 1]], max: 8, water: [['kappa', 1, 1, 2]] },
  2: { day: [['gaki_f', 5, 1, 3], ['deer', 2, 1, 2], ['gaki_shaman', 0.8, 1, 1], ['gaki_brute', 0.8, 1, 1], ['oni', 0.45, 1, 1], ['boar', 0.8, 1, 2]],
    night: [['gaki_f', 6, 2, 4], ['ochimusha', 2, 1, 2], ['gaki_brute', 1.2, 1, 1], ['gaki_shaman', 1, 1, 1], ['oni', 0.5, 1, 1]], max: 10, water: [['kappa', 0.6, 1, 1]] },
};
let spawnT = 2;

function spawnMob(type, x, z, o = {}) {
  const def = MOBS[type];
  let stars = o.stars != null ? o.stars : 0;
  if (o.stars == null && !def.boss && type !== 'root') { const r = Math.random(), night = SKY.isNight ? 1.5 : 1; stars = r < 0.02 * night ? 2 : r < 0.1 * night ? 1 : 0; }
  const rig = mobRig(type, stars);
  rig.root.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  const y = o.y != null ? o.y : groundY(x, z, heightAt(x, z) + 50);
  const m = {
    type, def, rig, stars, scale: 1 + stars * 0.1, pos: new V3(x, y, z), vel: new V3(), yaw: o.yaw != null ? o.yaw : Math.random() * TAU,
    hp: def.hp * (1 + stars), maxHp: def.hp * (1 + stars), state: 'wander', aware: false, target: null, home: { x, z }, act: null, cd: {}, phase: Math.random() * 10,
    staggered: 0, hurtT: 0, dead: false, deathT: 0, wanderT: Math.random() * 4, goal: null, invuln: 0, seenT: 0, lastD: 1e9, stuckT: 0, spawner: o.spawner || null, raid: !!o.raid, boss: !!def.boss, life: 0,
  };
  if (o.aware) mobAlert(m, PLAYER, false);
  rig.root.position.copy(m.pos);
  R.scene.add(rig.root);
  MOBS_LIVE.push(m);
  if (def.boss) { m.invuln = 2.5; AU.play('roar', x, y + 2, z, 1); for (const at of def.at) m.cd[at.id] = 3 + Math.random() * 4; }
  return m;
}
function removeMob(m) { R.scene.remove(m.rig.root); const i = MOBS_LIVE.indexOf(m); if (i >= 0) MOBS_LIVE.splice(i, 1); if (m.spawner) m.spawner.alive--; }
function mobAlert(m, who, hurt) {
  if (m.dead) return;
  const first = !m.aware;
  m.aware = true; m.target = who; m.seenT = G.time;
  if (m.def.mood === 'flee') { m.state = 'flee'; m.fleeT = 8 + Math.random() * 4; }
  else if (m.def.mood === 'neutral' && !hurt && !m.angry) return;
  else { m.state = 'chase'; if (hurt) m.angry = true; }
  if (first) mobCry(m);
}
function mobCry(m) {
  const s = { deer: 'deer', boar: 'boar', gaki: 'gaki', gaki_f: 'gaki', gaki_brute: 'gaki', gaki_shaman: 'gaki', kappa: 'kappa', oni: 'oni', ochimusha: 'bones', ochimusha_archer: 'bones', shirokiba: 'roar', osugi: 'roar' }[m.type];
  if (s) AU.play(s, m.pos.x, m.pos.y + 1, m.pos.z, m.def.boss ? 1 : 0.8);
}
function killMob(m, byPlayer) {
  if (m.dead) return;
  m.dead = true; m.deathT = 0; m.act = null;
  AU.play(m.def.undead ? 'bones' : 'death', m.pos.x, m.pos.y + 1, m.pos.z, 0.8);
  // drops (more from starred creatures)
  for (const [id, a, b, ch] of m.def.drops) {
    for (let s = 0; s <= m.stars; s++) if (Math.random() < ch) dropItems(id, a + Math.floor(Math.random() * (b - a + 1)), m.pos.x, m.pos.y + 0.8, m.pos.z);
  }
  if (m.def.boss) EVENTS.bossDefeated(m);
  bus.emit('mobKilled', m, byPlayer);
}

// line of sight over the terrain
function losTo(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz), n = Math.ceil(d / 3);
  for (let i = 1; i < n; i++) { const t = i / n; if (heightAt(ax + dx * t, az + dz * t) > ay + dy * t + 0.2) return false; }
  return true;
}

function updateMobs(dt) {
  const P = PLAYER;
  // spawning
  spawnT -= dt;
  if (spawnT <= 0) { spawnT = 2.5; ambientSpawn(); }
  for (let i = MOBS_LIVE.length - 1; i >= 0; i--) {
    const m = MOBS_LIVE[i];
    m.life += dt;
    const dP = Math.hypot(m.pos.x - P.pos.x, m.pos.z - P.pos.z);
    if (m.dead) {
      m.deathT += dt;
      animMob(m, dt);
      if (m.deathT > 2.2) { m.rig.root.position.y -= dt * 0.8; }
      if (m.deathT > 3.5) removeMob(m);
      continue;
    }
    if (!m.boss && !m.raid && dP > 150) { removeMob(m); continue; }
    if (m.boss && dP > 200) { removeMob(m); EVENTS.bossLeft(m); continue; }
    m.staggered = Math.max(0, m.staggered - dt); m.hurtT = Math.max(0, m.hurtT - dt); m.invuln = Math.max(0, m.invuln - dt);
    for (const k in m.cd) m.cd[k] -= dt;
    // damage over time
    if (m.poison > 0) { const t = Math.min(m.poison, 6 * dt); m.poison -= t; m.hp -= t; FX.poison(m.pos.x, m.pos.y + 1, m.pos.z); if (m.hp <= 0) { killMob(m, true); continue; } }
    if (m.burn > 0) { m.burn -= dt; m.hp -= 4 * dt; FX.fire(m.pos.x, m.pos.y + 0.5, m.pos.z, 0.4); if (m.hp <= 0) { killMob(m, true); continue; } }
    if (dP > 110) { m.rig.root.visible = false; continue; } // far: freeze
    m.rig.root.visible = true;
    thinkMob(m, dt, dP);
    moveMob(m, dt);
    animMob(m, dt);
  }
  // ground hazards
  for (let i = HAZARDS.length - 1; i >= 0; i--) {
    const h = HAZARDS[i];
    h.t -= dt;
    if (!h.fired) {
      if (Math.random() < dt * 20) FX.emit(h.x + (Math.random() - 0.5) * h.r * 2, h.y + 0.1, h.z + (Math.random() - 0.5) * h.r * 2, 0, 1, 0, h.col || [0.6, 0.45, 0.3], 0.25, 0.4, 0, 0, 0);
      if (h.t <= 0) {
        h.fired = true; h.t = 0.9;
        if (h.mesh) { h.mesh.visible = true; }
        AU.play(h.sound || 'roots', h.x, h.y, h.z);
        FX.dust(h.x, h.y, h.z, 6);
        if (P.alive && !(h.volley && h.volley.hit) && dist2(P.pos.x, P.pos.z, h.x, h.z) < h.r * h.r && Math.abs(P.pos.y - h.y) < 2 && (h.volley ? (h.volley.hit = true) : true)) damagePlayer(h.dmg, { x: h.x, z: h.z, mob: h.src }, false, { knock: h.knock || 60, stagger: true });
        BUILD.near(h.x, h.z, h.r + 1, (p) => { if (dist2(p.x, p.z, h.x, h.z) < (h.r + 0.5) ** 2) BUILD.damagePiece(p, 30); });
      }
    } else {
      if (h.mesh) h.mesh.scale.y = Math.min(1, h.mesh.scale.y + dt * 8) * (h.t < 0.3 ? h.t / 0.3 : 1);
      if (h.t <= 0) { if (h.mesh) R.scene.remove(h.mesh); HAZARDS.splice(i, 1); }
    }
  }
}
function ambientSpawn() {
  const P = PLAYER;
  if (!P.alive || G.peaceful) return;
  const biome = biomeAt(P.pos.x, P.pos.z);
  const T = SPAWN_TABLE[biome]; if (!T) return;
  let near = 0;
  for (const m of MOBS_LIVE) if (!m.dead && !m.spawner && !m.boss && !m.raid && dist2(m.pos.x, m.pos.z, P.pos.x, P.pos.z) < 90 * 90) near++;
  const cap = T.max + (SKY.isNight ? 2 : 0);
  if (near >= cap) return;
  if (Math.random() > 0.55) return;
  // pick a spot 40–80 m away
  for (let tries = 0; tries < 8; tries++) {
    const a = Math.random() * TAU, d = 42 + Math.random() * 38;
    const x = P.pos.x + Math.cos(a) * d, z = P.pos.z + Math.sin(a) * d;
    if (Math.abs(x) > WORLD.half - 10 || Math.abs(z) > WORLD.half - 10) continue;
    const h = heightAt(x, z), b = biomeAt(x, z);
    if (b === 0) continue;
    if (BUILD.inRangeOf('workbench', x, z, h)) continue;
    // kappa at the water's edge
    if (h < 1.2 && h > -0.6 && T.water && Math.random() < 0.5) { const [type, , a1, b1] = T.water[0]; spawnGroup(type, x, z, a1, b1); return; }
    if (h < 0.8) continue;
    const tab = SKY.isNight ? T.night : T.day;
    const ST = SPAWN_TABLE[b] || T;
    const list = SKY.isNight ? ST.night : ST.day;
    let tot = 0; for (const e of list) tot += e[1];
    let r = Math.random() * tot;
    for (const [type, w, g0, g1] of list) {
      r -= w; if (r > 0) continue;
      if (type === 'oni' && MOBS_LIVE.some((m) => m.type === 'oni' && !m.dead)) return;
      spawnGroup(type, x, z, g0, g1);
      if (type === 'gaki_f' && Math.random() < 0.3) spawnGroup('gaki_shaman', x + 2, z + 2, 1, 1);
      return;
    }
    void tab;
    return;
  }
}
function spawnGroup(type, x, z, a, b, o = {}) {
  const n = a + Math.floor(Math.random() * (b - a + 1));
  const out = [];
  for (let i = 0; i < n; i++) {
    const xx = x + (Math.random() - 0.5) * 6, zz = z + (Math.random() - 0.5) * 6;
    if (!MOBS[type].water && heightAt(xx, zz) < 0.3) continue;
    out.push(spawnMob(type, xx, zz, o));
  }
  return out;
}

// ---------- decisions ----------
function thinkMob(m, dt, dP) {
  const P = PLAYER, def = m.def;
  m.act && (m.act.t += dt);
  if (m.staggered > 0) { m.goal = null; return; }
  if (m.act) { updateMobAct(m, dt); return; }
  // perception
  const night = SKY.isNight ? 0.65 : 1;
  if (P.alive) {
    const sight = def.sight * night * (P.crouch ? 0.5 * (1 - skillF('sneak') * 0.5) * (1 - sneakMod()) : 1);
    const hear = def.hear * P.noise / 12;
    if (!m.aware || m.state === 'wander') {
      const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z;
      const ang = Math.abs(angWrap(Math.atan2(dx, dz) - m.yaw));
      let det = dP < hear;
      if (!det && dP < sight && ang < 1.1) det = losTo(m.pos.x, m.pos.y + def.h * 0.8, m.pos.z, P.pos.x, P.pos.y + 1.5, P.pos.z);
      if (det) {
        if (def.mood === 'neutral') { if (dP < 4.5) { m.angry = true; mobAlert(m, P, false); } else if (!m.aware) { m.aware = true; m.target = P; } }
        else mobAlert(m, P, false);
      }
    } else if (m.target === P) {
      if (dP < sight * 1.5 || dP < hear * 1.5) m.seenT = G.time;
    }
  }
  if (m.target === P && (!P.alive || dP > 60 || G.time - m.seenT > (m.raid || m.boss ? 60 : 14))) { m.aware = false; m.target = null; m.state = 'wander'; m.angry = false; }
  if (m.def.mood === 'neutral' && !m.angry && m.state === 'chase') m.state = 'wander';
  // states
  if (m.state === 'flee') {
    m.fleeT -= dt;
    const dx = m.pos.x - P.pos.x, dz = m.pos.z - P.pos.z, l = Math.hypot(dx, dz) || 1;
    m.goal = { x: m.pos.x + dx / l * 10, z: m.pos.z + dz / l * 10, run: true };
    if (m.fleeT <= 0 || dP > 50) { m.state = 'wander'; m.aware = false; }
    return;
  }
  if (m.state === 'chase' && m.target) {
    const tx = P.pos.x, tz = P.pos.z, d = dP;
    // choose an attack
    let pick = null;
    for (const at of def.at) {
      if ((m.cd[at.id] || 0) > 0) continue;
      if (at.self) { if (at.heal && MOBS_LIVE.some((o) => !o.dead && o !== m && o.hp < o.maxHp * 0.8 && dist2(o.pos.x, o.pos.z, m.pos.x, m.pos.z) < 144)) { pick = at; break; } continue; }
      if (at.summon) { if (d < at.range) { pick = at; break; } continue; }
      const reach = at.proj ? at.range : at.range + def.r * m.scale * 0.5 + 0.4;
      if (d <= reach && d >= (at.min || 0)) {
        if (at.proj && !losTo(m.pos.x, m.pos.y + def.h * 0.8, m.pos.z, tx, P.pos.y + 1.2, tz)) continue;
        if (!at.proj && !at.aoe && Math.abs(angWrap(Math.atan2(tx - m.pos.x, tz - m.pos.z) - m.yaw)) > 0.8) continue;
        pick = at; break;
      }
    }
    // ranged attacks are a chance per second, so creatures still advance between volleys
    if (pick && (!pick.proj || Math.random() < dt * (def.keep ? 2.5 : 1.2))) { startMobAct(m, pick); return; }
    // keep distance for ranged creatures
    if (def.keep && d < def.keep * 0.7) {
      const dx = m.pos.x - tx, dz = m.pos.z - tz, l = Math.hypot(dx, dz) || 1;
      m.goal = { x: m.pos.x + dx / l * 4, z: m.pos.z + dz / l * 4, run: false, face: true };
    } else if (def.keep && d < def.keep) m.goal = { x: m.pos.x, z: m.pos.z, face: true };
    else m.goal = { x: tx, z: tz, run: d > 4, stop: def.r * m.scale + 0.9 };
    // stuck against a building: break through
    if (d >= m.lastD - 0.05) m.stuckT += dt; else m.stuckT = Math.max(0, m.stuckT - dt * 2);
    m.lastD = d;
    if (m.stuckT > 1.2 && def.at.length && !def.fixed) {
      const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
      let piece = null;
      BUILD.near(m.pos.x + fx, m.pos.z + fz, 2, (p) => { if (!piece && p.def.kind !== 'raft' && dist2(p.x, p.z, m.pos.x + fx * 1.2, m.pos.z + fz * 1.2) < 6) piece = p; });
      if (piece) { const at = def.at.find((a) => !a.proj && !a.self && !a.summon); if (at) { startMobAct(m, at, piece); m.stuckT = 0; return; } }
    }
    return;
  }
  // wander
  m.wanderT -= dt;
  if (m.wanderT <= 0) {
    m.wanderT = 4 + Math.random() * 7;
    if (Math.random() < 0.4 || def.fixed) m.goal = null;
    else {
      const a = Math.random() * TAU, d = 4 + Math.random() * 12;
      let gx = m.home.x + Math.cos(a) * d, gz = m.home.z + Math.sin(a) * d;
      if (def.water) { gx = m.pos.x + Math.cos(a) * 5; gz = m.pos.z + Math.sin(a) * 5; }
      m.goal = { x: gx, z: gz, run: false };
    }
  }
  if (m.goal && dist2(m.goal.x, m.goal.z, m.pos.x, m.pos.z) < 1) m.goal = null;
}
function startMobAct(m, at, piece = null) {
  m.act = { at, t: 0, done: false, piece, tx: PLAYER.pos.x, tz: PLAYER.pos.z };
  m.cd[at.id] = at.cd * (0.8 + Math.random() * 0.4);
  m.goal = null;
  if (at.anim === 'roar' || at.summon) mobCry(m);
  if (at.id === 'charge') { const dx = PLAYER.pos.x - m.pos.x, dz = PLAYER.pos.z - m.pos.z, l = Math.hypot(dx, dz) || 1; m.act.dx = dx / l; m.act.dz = dz / l; }
}
function updateMobAct(m, dt) {
  const a = m.act, at = a.at, P = PLAYER, def = m.def;
  const mult = 1 + m.stars * 0.5;
  // face the target while winding up
  if (a.t < at.wind && !a.piece) m.yaw = angTo(m.yaw, Math.atan2(P.pos.x - m.pos.x, P.pos.z - m.pos.z), dt * (def.boss ? 2.5 : 6));
  if (at.id === 'charge' && a.t > at.wind && a.t < at.dur - 0.4) {
    m.vel.x = a.dx * 15; m.vel.z = a.dz * 15; m.yaw = Math.atan2(a.dx, a.dz);
    FX.dust(m.pos.x, m.pos.y, m.pos.z, 1);
    if (!a.done && P.alive && dist2(P.pos.x, P.pos.z, m.pos.x, m.pos.z) < (def.r * m.scale + 1) ** 2) { a.done = true; damagePlayer(scaleDmg(at.dmg, mult), { x: m.pos.x, z: m.pos.z, mob: m }, false, { knock: at.knock, stagger: true }); }
    BUILD.near(m.pos.x, m.pos.z, 3, (p) => { if (dist2(p.x, p.z, m.pos.x, m.pos.z) < 6) BUILD.damagePiece(p, 40 * dt * 10); });
  }
  if (!a.done && a.t >= at.wind && at.id !== 'charge') {
    a.done = true;
    const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
    if (at.heal) {
      for (const o of MOBS_LIVE) if (!o.dead && dist2(o.pos.x, o.pos.z, m.pos.x, m.pos.z) < at.range * at.range) { o.hp = Math.min(o.maxHp, o.hp + at.heal); FX.magic(o.pos.x, o.pos.y + 1, o.pos.z, [0.6, 1, 0.6], 10, 1.5); }
    } else if (at.summon) {
      for (let i = 0; i < 3; i++) { const ang = Math.random() * TAU, d = 3 + Math.random() * 4; const x = P.pos.x + Math.cos(ang) * d, z = P.pos.z + Math.sin(ang) * d; FX.dust(x, heightAt(x, z), z, 6); spawnMob(at.summon, x, z, { aware: true, raid: true }); }
    } else if (at.proj === 'roots') {
      // eruptions marching toward and around the target
      const volley = { hit: false };
      for (let i = 0; i < 6; i++) {
        const t = 0.25 + i * 0.22;
        const x = lerp(m.pos.x, P.pos.x, (i + 1) / 6) + (Math.random() - 0.5) * 1.2, z = lerp(m.pos.z, P.pos.z, (i + 1) / 6) + (Math.random() - 0.5) * 1.2;
        addHazard(x, z, t, 1.4, scaleDmg(at.dmg, mult), m, 'spike', volley);
      }
      addHazard(P.pos.x, P.pos.z, 1.6, 1.6, scaleDmg(at.dmg, mult), m, 'spike', volley);
    } else if (at.proj) {
      mobShoot(m, at, mult);
    } else if (a.piece) {
      BUILD.damagePiece(a.piece, sumDamage(at.dmg).t * mult);
    } else {
      // melee or area strike
      const cx = at.aoe ? m.pos.x + fx * Math.min(at.range * 0.6, 3) : m.pos.x, cz = at.aoe ? m.pos.z + fz * Math.min(at.range * 0.6, 3) : m.pos.z;
      if (at.aoe) { FX.dust(cx, m.pos.y, cz, 14); CAM.shake = Math.max(CAM.shake, dist2(cx, cz, P.pos.x, P.pos.z) < 400 ? 0.5 : 0); AU.play('thud', cx, m.pos.y, cz); }
      if (P.alive) {
        const dx = P.pos.x - m.pos.x, dz = P.pos.z - m.pos.z, d = Math.hypot(dx, dz);
        let hit = false;
        if (at.aoe) hit = dist2(P.pos.x, P.pos.z, cx, cz) < at.aoe * at.aoe && Math.abs(P.pos.y - m.pos.y) < 2.5;
        else hit = d < at.range + def.r * m.scale * 0.5 + 0.5 && Math.abs(angWrap(Math.atan2(dx, dz) - m.yaw)) < at.arc + 0.2 && Math.abs(P.pos.y + 0.9 - (m.pos.y + def.h * m.scale * 0.5)) < def.h * m.scale * 0.5 + 1.2;
        if (hit) damagePlayer(scaleDmg(at.dmg, mult), { x: m.pos.x, z: m.pos.z, mob: m }, false, { knock: at.knock, stagger: at.stagger });
      }
      if (at.aoe) BUILD.near(cx, cz, at.aoe, (p) => { if (dist2(p.x, p.z, cx, cz) < at.aoe * at.aoe) BUILD.damagePiece(p, sumDamage(at.dmg).t * 0.5); });
    }
  }
  if (a.t >= at.dur) m.act = null;
}
function scaleDmg(d, k) { const o = {}; for (const t in d) o[t] = d[t] * k; return o; }
function addHazard(x, z, delay, r, dmg, src, look, volley = null) {
  const y = groundY(x, z, heightAt(x, z) + 10);
  let mesh = null;
  if (look === 'spike') {
    mesh = new THREE.Mesh(model('spikes', () => buildModel([0, 1, 2, 3, 4].map((i) => P_.cone(0.18, 1.6 + (i % 2) * 0.6, 5, i % 2 ? COL.cedarBark : 0x5a3a24, [Math.cos(i * 1.3) * 0.5, 0.8, Math.sin(i * 1.3) * 0.5], [Math.cos(i) * 0.25, 0, Math.sin(i) * 0.25])))), R.mat.vc);
    mesh.position.set(x, y, z); mesh.scale.set(1, 0.01, 1); mesh.visible = false; R.scene.add(mesh);
  }
  HAZARDS.push({ x, y, z, t: delay, r, dmg, src, mesh, fired: false, volley });
}
function mobShoot(m, at, mult) {
  const P = PLAYER, def = m.def;
  const sx = m.pos.x + Math.sin(m.yaw) * def.r * m.scale, sy = m.pos.y + def.h * m.scale * 0.85, sz = m.pos.z + Math.cos(m.yaw) * def.r * m.scale;
  const tx = P.pos.x + P.vel.x * 0.4, ty = P.pos.y + 1.0, tz = P.pos.z + P.vel.z * 0.4;
  const dx = tx - sx, dy = ty - sy, dz = tz - sz, dh = Math.hypot(dx, dz);
  const kind = at.proj;
  const o = { owner: 'mob', src: m, dmg: scaleDmg(at.dmg, mult), knock: at.knock || 20 };
  if (kind === 'thunder' || kind === 'vine') {
    const sp = kind === 'thunder' ? 26 : 22, l = Math.hypot(dx, dy, dz) || 1;
    spawnProj(kind, sx, sy, sz, dx / l * sp, dy / l * sp, dz / l * sp, Object.assign(o, { grav: 0, life: 2 }));
    if (kind === 'thunder') AU.play('zap', sx, sy, sz);
    return;
  }
  // ballistic arc
  const sp = kind === 'arrow' ? 32 : kind === 'boulder' ? 17 : 15, g = kind === 'arrow' ? 9.8 : 14;
  const t = dh / (sp * 0.85);
  const vy = dy / t + 0.5 * g * t;
  spawnProj(kind, sx, sy, sz, dx / t + (Math.random() - 0.5) * 0.8, vy, dz / t + (Math.random() - 0.5) * 0.8, Object.assign(o, { grav: g }));
  AU.play(kind === 'arrow' ? 'release' : 'swing', sx, sy, sz, 0.7);
}

// ---------- movement ----------
function moveMob(m, dt) {
  const def = m.def, P = PLAYER;
  let spd = 0, tx = 0, tz = 0;
  if (m.goal && !def.fixed && m.staggered <= 0 && (!m.act || m.act.at.id === 'charge')) {
    const dx = m.goal.x - m.pos.x, dz = m.goal.z - m.pos.z, d = Math.hypot(dx, dz);
    if (d > (m.goal.stop || 0.3)) { tx = dx / d; tz = dz / d; spd = m.goal.run ? def.run : def.speed; }
    if (m.goal.face) m.yaw = angTo(m.yaw, Math.atan2(P.pos.x - m.pos.x, P.pos.z - m.pos.z), dt * 5);
    else if (spd > 0) m.yaw = angTo(m.yaw, Math.atan2(tx, tz), dt * (def.boss ? 3 : 6));
  } else if (def.fixed && m.aware) m.yaw = angTo(m.yaw, Math.atan2(P.pos.x - m.pos.x, P.pos.z - m.pos.z), dt * 2);
  if (m.act && m.act.at.id !== 'charge') spd = 0;
  const k = Math.min(1, dt * 6);
  if (!(m.act && m.act.at.id === 'charge' && m.act.t > m.act.at.wind)) {
    m.vel.x = lerp(m.vel.x, tx * spd, k); m.vel.z = lerp(m.vel.z, tz * spd, k);
  }
  let nx = m.pos.x + m.vel.x * dt, nz = m.pos.z + m.vel.z * dt;
  // keep land creatures out of deep water, kappa near it
  const nh = heightAt(nx, nz);
  if (!def.water && nh < -0.9 && !m.boss) { nx = m.pos.x; nz = m.pos.z; m.vel.x *= -0.5; m.vel.z *= -0.5; if (m.state === 'wander') m.goal = null; }
  if (def.water && nh > 3.5 && m.state === 'wander') { nx = m.pos.x; nz = m.pos.z; m.goal = null; }
  m.pos.x = nx; m.pos.z = nz;
  // trees & rocks
  const r = def.r * m.scale;
  if (!def.fixed) {
    natQuery(m.pos.x, m.pos.z, 1.5 + r, (o, kind) => {
      const rad = kind === 'tree' ? treeRadius(o) : rockRadius(o) * 0.85;
      if (kind === 'tree' && m.boss && m.type === 'osugi') return;
      const dx = m.pos.x - o.x, dz = m.pos.z - o.z, d = Math.hypot(dx, dz), mm = rad + r * 0.8;
      if (d < mm && d > 1e-4) { m.pos.x = o.x + dx / d * mm; m.pos.z = o.z + dz / d * mm; }
    });
    BUILD.pushOut(m.pos, Math.min(r, 0.9), def.h * m.scale, true);
    // bamboo stakes
    BUILD.near(m.pos.x, m.pos.z, 2, (p) => {
      if (!p.def.damage || dist2(p.x, p.z, m.pos.x, m.pos.z) > 2.2) return;
      m.stakeT = (m.stakeT || 0) - dt;
      if (m.stakeT <= 0) { m.stakeT = 0.8; damageMob(m, { pierce: p.def.damage }, {}); BUILD.damagePiece(p, 4); }
    });
    // separate from each other
    for (const o of MOBS_LIVE) {
      if (o === m || o.dead) continue;
      const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z, d2 = dx * dx + dz * dz, mm = (r + o.def.r * o.scale) * 0.9;
      if (d2 < mm * mm && d2 > 1e-6) { const d = Math.sqrt(d2), push = (mm - d) * 0.5 * (o.def.mass / (m.def.mass + o.def.mass)) * 2; m.pos.x += dx / d * push; m.pos.z += dz / d * push; }
    }
    // keep off the player
    const dx = m.pos.x - P.pos.x, dz = m.pos.z - P.pos.z, d = Math.hypot(dx, dz), mm = r + 0.35;
    if (d < mm && d > 1e-4 && P.alive) { m.pos.x = P.pos.x + dx / d * mm; m.pos.z = P.pos.z + dz / d * mm; }
  }
  const gy = groundY(m.pos.x, m.pos.z, m.pos.y + 0.8);
  const water = waveH(m.pos.x, m.pos.z);
  if (def.water && gy < water - 0.6) m.pos.y = lerp(m.pos.y, water - 0.6, Math.min(1, dt * 4));
  else m.pos.y = lerp(m.pos.y, gy, Math.min(1, dt * 12));
  m.speed = Math.hypot(m.vel.x, m.vel.z);
}

// ---------- animation ----------
function animMob(m, dt) {
  const rig = m.rig;
  rig.root.position.copy(m.pos);
  rig.root.rotation.y = m.yaw;
  m.phase += dt * m.speed * (rig.type === 'quad' ? 2.4 : 2.0) / m.scale;
  if (rig.type === 'biped') {
    animBiped(rig, dt, { phase: m.phase, speed: m.speed, run: m.speed > m.def.speed + 0.5, act: m.act ? { anim: m.act.at.anim, t: m.act.t, dur: m.act.at.dur, hitT: m.act.at.wind, combo: 0 } : null, dead: m.dead, stagger: m.staggered, crouch: m.type === 'gaki' || m.type === 'gaki_f' });
    if (m.dead) { rig.hips.rotation.x = lerp(rig.hips.rotation.x, -Math.PI / 2, Math.min(1, dt * 4)); rig.hips.position.y = lerp(rig.hips.position.y, 0.2, Math.min(1, dt * 4)); }
  } else if (rig.type === 'quad') {
    const ph = m.phase, run = m.speed > m.def.speed + 0.5, amp = 0.35 + (run ? 0.35 : 0);
    const moving = m.speed > 0.2;
    const leg = (i) => moving ? Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * amp : 0;
    let bodyX = 0, headX = 0, by = rig.hipY + (moving ? Math.abs(Math.sin(ph)) * 0.04 : 0);
    const a = m.act;
    if (a) {
      const p = clamp(a.t / a.at.dur, 0, 1), hp = a.at.wind / a.at.dur;
      if (a.at.anim === 'gore') headX = p < hp ? -0.4 * (p / hp) : 0.6 * (1 - smooth(hp, 1, p));
      if (a.at.anim === 'stomp') { bodyX = p < hp ? -0.6 * smooth(0, hp, p) : -0.6 * (1 - smooth(hp, hp + 0.1, p)); }
      if (a.at.anim === 'roar') headX = -0.5 * Math.sin(p * Math.PI);
      if (a.at.anim === 'charge') headX = 0.4;
    }
    if (m.dead) { rig.root.rotation.z = lerp(rig.root.rotation.z, Math.PI / 2, Math.min(1, dt * 4)); }
    else rig.root.rotation.z = 0;
    rig.body.position.y = by * m.scale / m.scale;
    rig.body.rotation.x = lerp(rig.body.rotation.x, bodyX, Math.min(1, dt * 10));
    rig.head.rotation.x = lerp(rig.head.rotation.x, headX + (m.state === 'wander' && !moving ? 0.5 + Math.sin(G.time * 0.7 + m.phase) * 0.2 : 0), Math.min(1, dt * 8));
    for (let i = 0; i < 4; i++) rig.legs[i].rotation.x = leg(i);
    if (rig.tail) rig.tail.rotation.x = Math.sin(G.time * 6) * 0.3;
  } else if (rig.type === 'root') {
    const a = m.act, p = a ? clamp(a.t / a.at.dur, 0, 1) : 0;
    rig.seg.forEach((s, i) => { s.rotation.x = Math.sin(G.time * 2 + i) * 0.15 + (a ? (p < 0.5 ? -0.5 : 0.9) * Math.sin(p * Math.PI) : 0); s.rotation.z = Math.cos(G.time * 1.7 + i) * 0.1; });
    if (m.dead) rig.root.scale.y = Math.max(0.01, rig.root.scale.y - dt);
  }
  // flash when hurt
  if (m.hurtT > 0 !== m.flashed) {
    m.flashed = m.hurtT > 0;
    rig.root.traverse((c) => { if (c.isMesh) c.material = m.flashed ? R.mat.hurt : R.mat.vc; });
  }
}
