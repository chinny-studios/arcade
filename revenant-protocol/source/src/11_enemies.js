// Revenant Protocol — enemies: perception, pathing, ranged and melee attacks, pain, death, drops

const ENEMY_LIST = [];
function allBodies() { const a = ENEMY_LIST.filter((e) => !e.dead && !e.def.ceiling && !e.def.static); if (!P.dead) a.push(P); return a; }

function spawnEnemy(type, x, z, opt = {}) {
  const def = ENEMIES[type];
  const S = SPR[type];
  const e = {
    type, def, x, z, y: 0, vy: 0, r: def.r, h: def.h, step: 0.65, onGround: true, yaw: opt.a !== undefined ? opt.a : Math.random() * TAU,
    hp: def.hp * DIFF[G.diff].hp, state: 'idle', t: 0, cool: rr(0.5, 1.5), burst: 0, alert: false, dead: false, deadT: 0,
    walkT: Math.random() * 4, hitT: 0, seeT: 0, see: false, lastX: x, lastZ: z, strafe: 0, strafeT: 0, drop: opt.drop, tag: opt.tag,
    ambush: !!opt.ambush, fireT: 0, jetT: rr(3, 6), flying: !!def.fly, alt: def.fly || 0, submerged: type === 'maw', thinkT: Math.random() * 0.2,
  };
  const c = cellAt(x, z);
  if (def.ceiling) e.y = ceilOf(c) - e.h;
  else if (def.fly) e.y = floorOf(c) + def.fly;
  else e.y = bodyFloor(c);
  if (def.static || def.ceiling) e.avoidMove = true;
  e.mat = spriteMat(S.tex);
  e.mesh = new THREE.Mesh(PLANE, e.mat);
  e.mesh.scale.set(S.size, S.size, 1);
  R.scene.add(e.mesh);
  ENEMY_LIST.push(e);
  if (opt.alert) alertEnemy(e, true);
  return e;
}
function clearEnemies() { for (const e of ENEMY_LIST) { R.scene.remove(e.mesh); e.mat.dispose(); } ENEMY_LIST.length = 0; }

function alertEnemy(e, quiet) {
  if (e.alert || e.dead) return;
  e.alert = true; e.state = 'chase'; e.cool = rr(0.4, 1.2);
  if (!quiet) sfxAt(e.def.voice, e.x, e.y + 1.5, e.z, 0.9);
}
// Gunfire and explosions wake enemies: close ones always, farther ones only with line of sight.
function makeNoise(x, z, radius) {
  for (const e of ENEMY_LIST) {
    if (e.dead || e.alert || e.ambush) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < radius * 0.5 || (d < radius && traceTo(x, P.y + 1.4, z, e.x, e.y + e.h * 0.8, e.z))) alertEnemy(e);
  }
}

function damageEnemy(e, dmg, src, splash) {
  if (e.dead || (e.submerged && splash !== 'force')) return;
  if (e.def.boss && e.shieldT > 0) { spawnFx(e.x, e.y + e.h * 0.6, e.z, 0.5, 1, 0.2, 1); return; }
  e.hp -= dmg;
  e.hitT = 0.12;
  if (src === P) { alertEnemy(e); e.ambush = false; }
  if (e.hp <= 0) { killEnemy(e); return; }
  if (Math.random() < e.def.pain && e.state !== 'pain') { e.state = 'pain'; e.t = 0.28; if (Math.random() < 0.4) sfxAt(e.def.voice, e.x, e.y + 1.5, e.z, 0.5); }
}
function killEnemy(e) {
  e.dead = true; e.deadT = 0; e.state = 'dead';
  G.stats.kills++;
  const big = e.def.hp >= 150;
  sfxAt(e.def.explode !== undefined ? 'smallboom' : big ? 'diebig' : 'die', e.x, e.y + 1, e.z, 0.9);
  if (e.def.explode) explode(e.x, e.y + e.h * 0.5, e.z, 2.6, e.def.explode, e, true);
  else if (e.def.explode === 0) spawnFx(e.x, e.y + e.h * 0.5, e.z, 0.6, 1, 0.3, 1);
  // drops: the first trooper or hunter or Mk II you drop hands over its weapon
  let drop = e.drop || e.def.drop;
  const weap = { trooper: 'carbine', hunter: 'concussion', rev2: 'cannon' }[e.type];
  if (!e.drop && weap && !P.weapons.has(weap)) drop = 'w_' + weap;
  if (drop) {
    const fy = e.def.fly || e.def.ceiling ? floorOf(cellAt(e.x, e.z)) : e.y;
    spawnItem(drop, e.x, e.z, fy);
  }
  if (e.tag) levelEvent('kill:' + e.tag, e);
  if (e.def.boss) levelEvent('boss', e);
  if (e.def.fly || e.def.ceiling) { e.mesh.visible = false; }
}

function updateEnemies(dt) {
  updateFlow(dt, P.x, P.z);
  let combat = false;
  const eyeP = P.y + (P.crouch ? 0.9 : 1.5);
  for (const e of ENEMY_LIST) {
    if (e.dead) { e.deadT += dt; if (!e.def.fly && !e.def.ceiling) settleCorpse(e, dt); drawEnemy(e, dt); continue; }
    const def = e.def;
    e.hitT = Math.max(0, e.hitT - dt);
    const dx = P.x - e.x, dz = P.z - e.z, dist = Math.hypot(dx, dz);
    // perception, a few times a second
    e.thinkT -= dt;
    if (e.thinkT <= 0) {
      e.thinkT = 0.18;
      const fwd = Math.cos(angNorm(Math.atan2(dx, dz) - e.yaw));
      const inView = e.alert || fwd > -0.2 || dist < 3;
      e.see = !P.dead && dist < def.sight && inView && traceTo(e.x, e.y + e.h * 0.85, e.z, P.x, eyeP, P.z);
      if (e.type === 'maw') e.see = !P.dead && dist < def.sight && Math.abs(P.y - e.y) < 2.5;
      if (e.see) { e.lastX = P.x; e.lastZ = P.z; e.ambush = false; alertEnemy(e); }
    }
    if (e.alert && dist < 45) combat = true;
    if (e.state === 'pain') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; drawEnemy(e, dt); continue; }
    if (!e.alert) { idleEnemy(e, dt); drawEnemy(e, dt); continue; }
    const face = Math.atan2(dx, dz);
    if (e.type === 'maw') { updateMaw(e, dt, dist, face); drawEnemy(e, dt); continue; }
    if (e.def.boss) e.shieldT = Math.max(0, (e.shieldT || 0) - dt);
    e.cool -= dt;
    if (e.state === 'attack') {
      e.yaw = turnTo(e.yaw, face, dt * 8);
      e.t -= dt; e.fireT -= dt;
      if (def.melee) {
        if (e.t <= 0.22 && !e.struck) {
          e.struck = true;
          sfxAt(e.type === 'rev1' ? 'blade' : 'swing', e.x, e.y + 1, e.z, 0.8);
          if (dist < def.reach + P.r + 0.4 && Math.abs(P.y - e.y) < 1.6) { hurtPlayer(def.dmg, e, 'melee'); if (e.type === 'orb') P.shake = 0.4; }
        }
        if (e.t <= 0) { e.state = 'chase'; e.cool = rr(...def.cool); }
      } else if (e.t <= 0) {
        if (e.fireT <= 0 && e.burst > 0) { enemyShoot(e, eyeP); e.burst--; e.fireT = e.def.boss ? 0.09 : 0.16; }
        if (e.burst <= 0) { e.state = 'chase'; e.cool = rr(...def.cool); }
      }
      if (def.fly || e.flying) hover(e, dt); else if (!def.ceiling && !def.static) fallBody(e, dt);
      drawEnemy(e, dt); continue;
    }
    // chase: decide whether to attack
    if (def.melee) {
      if (dist < def.reach + P.r && e.cool <= 0 && Math.abs(P.y - e.y) < 1.8) { e.state = 'attack'; e.t = 0.45; e.struck = false; drawEnemy(e, dt); continue; }
    } else if (e.see && e.cool <= 0 && dist < def.sight) {
      e.state = 'attack'; e.t = 0.32; e.fireT = 0; e.burst = Math.round(rr(def.burst[0], def.burst[1]));
      if (def.missile && Math.random() < def.missile) { e.missileShot = true; e.burst = e.def.boss ? 3 : 1; } else e.missileShot = false;
      drawEnemy(e, dt); continue;
    }
    if (def.static || def.ceiling) { e.yaw = turnTo(e.yaw, face, dt * 3); drawEnemy(e, dt); continue; }
    // jet troopers alternate between walking and flying
    if (def.jet) {
      e.jetT -= dt;
      if (e.jetT <= 0) { e.flying = !e.flying; e.jetT = e.flying ? rr(3, 6) : rr(4, 8); if (e.flying) sfxAt('jet', e.x, e.y, e.z, 0.8); if (e.def.boss && e.flying) e.shieldT = 1.2; }
    }
    // movement
    let tx = e.lastX, tz = e.lastZ;
    const flies = def.fly || e.flying;
    const field = flies ? LV.flowA : LV.flowG, ok = flies ? canFly : canWalk;
    let want = 1;
    if (e.see && !def.melee) {
      // keep a fighting distance and sidestep
      e.strafeT -= dt; if (e.strafeT <= 0) { e.strafeT = rr(0.8, 2); e.strafe = pick([-1, 0, 1]); }
      if (dist < 6) want = -0.5; else if (dist < 14) want = 0.15;
    }
    let mx = 0, mz = 0;
    if (e.see || dist < 2.5) { mx = dx / (dist || 1); mz = dz / (dist || 1); }
    else {
      const nx = flowStep(field, ok, e.x, e.z);
      if (nx) { tx = (nx.x + 0.5) * CELL; tz = (nx.z + 0.5) * CELL; if (nx.door && nx.door.open < 1 && !nx.door.key && !nx.door.locked) openDoor(nx.door); }
      const ddx = tx - e.x, ddz = tz - e.z, dl = Math.hypot(ddx, ddz);
      if (dl > 0.1) { mx = ddx / dl; mz = ddz / dl; }
    }
    let vx = mx * want, vz = mz * want;
    if (e.see && !def.melee) { vx += -mz * e.strafe * 0.8; vz += mx * e.strafe * 0.8; }
    const sp = def.speed * (flies && def.jet ? 1.3 : 1);
    const vl = Math.hypot(vx, vz);
    if (vl > 0.01) {
      const k = Math.min(1, 1 / vl) * sp * dt;
      if (flies) e.avoid = (c) => c.d.c - floorOf(c) < 1.2;
      else e.avoid = (c) => c.d.kill || (c.d.dmg && !c.d.gas) || (c.door && c.door.open < 0.95);
      const bump = moveBody(e, vx * k, vz * k);
      if (bump && !e.see) { e.strafe = pick([-1, 1]); e.x += -mz * e.strafe * sp * dt * 0.5; }
      if (bump && e.see) e.strafe = -e.strafe || 1;
      e.walkT += dt * sp * 1.2;
      e.yaw = turnTo(e.yaw, e.see ? face : Math.atan2(vx, vz), dt * 6);
    }
    if (flies) hover(e, dt); else fallBody(e, dt);
    // stand clear of the player
    if (!flies && dist < e.r + P.r + 0.05 && dist > 0.001) { const push = e.r + P.r + 0.05 - dist; moveBody(e, -dx / dist * push, -dz / dist * push); }
    drawEnemy(e, dt);
  }
  // keep enemies from stacking up
  for (let i = 0; i < ENEMY_LIST.length; i++) {
    const a = ENEMY_LIST[i]; if (a.dead || a.def.static || a.def.ceiling) continue;
    for (let j = i + 1; j < ENEMY_LIST.length; j++) {
      const b = ENEMY_LIST[j]; if (b.dead || b.def.static || b.def.ceiling) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r;
      if (d < m && d > 0.001 && Math.abs(a.y - b.y) < 1.5) { const p = (m - d) * 0.5; moveBody(a, -dx / d * p, -dz / d * p); moveBody(b, dx / d * p, dz / d * p); }
    }
  }
  G.combatT = combat ? 6 : Math.max(0, G.combatT - dt);
  AU.intensity = G.combatT > 0 ? 1 : 0;
}
function turnTo(a, b, k) { const d = angNorm(b - a); return a + clamp(d, -k, k); }
function idleEnemy(e, dt) {
  if (!e.def.fly && !e.def.ceiling && !e.def.static) fallBody(e, dt);
  if (e.def.fly) { e.y += Math.sin(G.time * 2 + e.x) * dt * 0.15; }
}
function hover(e, dt) {
  const c = cellAt(e.x, e.z);
  const fl = floorOf(c), cl = ceilOf(c);
  const want = clamp((e.flying && e.def.jet ? P.y + 2.6 : P.y + 1.2), fl + 0.3, Math.min(cl, fl + 12) - e.h - 0.2);
  e.y += clamp(want - e.y, -3 * dt, 3 * dt);
  e.y = Math.max(e.y, fl + 0.1);
  e.onGround = false; e.vy = 0;
  if (e.def.jet && e.flying) addLight(e.x, e.y + 0.6, e.z, 3, 0xff9030, 0.8);
  if (e.def.jet && !e.flying) { e.vy = 0; fallBody(e, dt); }
}
function updateMaw(e, dt, dist, face) {
  e.yaw = face;
  const near = dist < 9 && Math.abs(P.y - e.y) < 3;
  e.submerged = !near && e.state !== 'attack';
  e.cool -= dt;
  if (e.state === 'attack') {
    e.t -= dt;
    if (e.t <= 0.25 && !e.struck) { e.struck = true; sfxAt('swing', e.x, e.y + 1, e.z); if (dist < e.def.reach + P.r) hurtPlayer(e.def.dmg, e, 'melee'); }
    if (e.t <= 0) { e.state = 'chase'; e.cool = rr(...e.def.cool); }
  } else if (near && dist < e.def.reach + P.r + 0.3 && e.cool <= 0) { e.state = 'attack'; e.t = 0.6; e.struck = false; sfxAt('gurgle', e.x, e.y, e.z); }
}
function settleCorpse(e, dt) { e.vy -= GRAV * dt; e.y += e.vy * dt; const g = bodyFloor(cellAt(e.x, e.z)); if (e.y < g) { e.y = g; e.vy = 0; } }

function enemyShoot(e, eyeP) {
  const def = e.def, s = Math.sin(e.yaw), c = Math.cos(e.yaw);
  const mx = e.x + s * (e.r + 0.25) + c * 0.12, my = e.y + e.h * (def.fly ? 0.45 : def.ceiling ? 0.2 : 0.68), mz = e.z + c * (e.r + 0.25) - s * 0.12;
  const ty = P.y + (P.crouch ? 0.6 : 1.1);
  // lead the target a little
  const d0 = Math.hypot(P.x - mx, ty - my, P.z - mz);
  const kind = e.missileShot ? 'missile' : def.atk;
  const speed = kind === 'missile' ? 15 : kind === 'pulse' ? 20 : kind === 'plasma' ? 32 : 27;
  const lead = (d0 / speed) * (Math.random() < 0.5 ? 0.6 : 0);
  let dx = P.x + P.vx * lead - mx, dy = ty - my, dz = P.z + P.vz * lead - mz;
  const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
  const err = def.acc * (P.crouch ? 1.3 : 1) * (G.diff === 0 ? 1.6 : 1);
  const ya = (Math.random() - 0.5) * 2 * err, pa = (Math.random() - 0.5) * 2 * err;
  const cs = Math.cos(ya), sn = Math.sin(ya);
  const rx = dx * cs + dz * sn, rz = -dx * sn + dz * cs;
  const color = kind === 'plasma' ? 0x8fdcff : kind === 'pulse' ? 0xffa030 : kind === 'missile' ? 0xffa040 : 0xff3a24;
  const p = { kind: kind === 'plasma' ? 'bolt' : kind, owner: e, x: mx, y: my, z: mz, vx: rx * speed, vy: (dy + pa) * speed, vz: rz * speed, dmg: def.dmg, color, ttl: 4 };
  if (kind === 'missile') { p.dmg = e.def.boss ? 35 : 28; p.radius = 3.5; p.homing = true; p.ttl = 6; }
  if (kind === 'pulse') { p.radius = 2.4; p.dmg = def.dmg; }
  spawnProj(p);
  e.fireT = 0.16; e.flashT = 0.08;
  sfxAt(kind === 'missile' ? 'missile' : kind === 'pulse' ? 'pulse' : kind === 'plasma' ? 'plasma' : 'ebolt', mx, my, mz, 0.8);
  addLight(mx, my, mz, 5, color, 0.9);
}

// Choose the atlas frame: direction from the camera's point of view, row from what the enemy is doing.
const _rect = new THREE.Vector4();
function drawEnemy(e, dt) {
  const S = SPR[e.type], m = e.mesh, cp = R.camera.position;
  let col = 0, row = 0;
  if (e.dead) { col = Math.min(4, Math.floor(e.deadT / 0.11)); row = 8; }
  else {
    if (S.dirs > 1) { const rel = angNorm(e.yaw - Math.atan2(cp.x - e.x, cp.z - e.z)); col = ((Math.round(rel / (TAU / 8)) % 8) + 8) % 8; }
    if (e.state === 'pain') row = 7;
    else if (e.state === 'attack') {
      if (e.def.melee) row = e.t > 0.22 ? 5 : 6;
      else row = e.flashT > 0 ? 6 : 5;
    } else if (e.alert) row = 1 + (Math.floor(e.walkT * 2) % 4);
    if (e.type === 'maw' && e.submerged) row = 0;
    if (e.def.fly && e.state !== 'attack' && e.state !== 'pain') row = 1 + (Math.floor(G.time * 6 + e.x) % 4);
  }
  e.flashT = Math.max(0, (e.flashT || 0) - dt);
  sprRect(S, col, row, e.mat.uniforms.uRect.value);
  const c = cellAt(e.x, e.z);
  e.mat.uniforms.uLight.value = c.solid ? 0.6 : c.d.l;
  e.mat.uniforms.uHit.value = e.hitT > 0 ? 0.6 : 0;
  m.position.set(e.x, e.y - S.anchor * S.size + (S.anchor === 0 ? 0 : e.h * S.anchor), e.z);
  if (e.def.ceiling) m.position.y = e.y + e.h - S.size;
  if (e.def.fly) m.position.y = e.y + e.h * 0.5 - S.size * 0.5;
  m.rotation.y = Math.atan2(cp.x - e.x, cp.z - e.z);
}
