// Valor Bay — crooks: thugs with bats, punks, gunmen, brutes with pipes and Overclock's drones. They hang about
// their crime until a hero shows up, then come at you a couple at a time (the rest circle and wait their turn),
// telegraphing every swing with a "!" while gunmen keep their distance. Hits stagger, knock flying or knock out;
// webbing, ice, fire and wind each have their own state. Knocked-out crooks are cuffed and taken away.

const FOES = { list: [] };
const alive = (f) => !f.dead && !f.ko && !f.bound;

function droneMesh() {
  const M = new Mesher();
  M.geo(P_SPH(12, 8), 0x50545c, 0, 0, 0, 0, 0, 0, 0.9, 0.6, 0.9);
  M.geo(P_CYL(10), 0xd02020, 0, 0.05, 0, 0, 0, 0, 0.95, 0.12, 0.95);
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * TAU + Math.PI / 4, x = Math.cos(a) * 0.65, z = Math.sin(a) * 0.65;
    M.box(x / 2, 0.1, z / 2, Math.abs(x) + 0.08, 0.06, Math.abs(z) + 0.08, 0x3a3a40);
    M.geo(P_CYL(10), 0x18181c, x, 0.16, z, 0, 0, 0, 0.55, 0.03, 0.55);
  }
  M.geo(P_SPH(8, 6), 0x40ff60, 0, -0.05, -0.42, 0, 0, 0, 0.25, 0.25, 0.15);
  return M.build();
}
function spawnFoe(type, gang, x, z, o = {}) {
  const T = CROOKS[type];
  const e = { kind: 'foe', type, T, gang, x, y: o.y || 0, z, yaw: o.yaw || rr(-3, 3), vx: 0, vy: 0, vz: 0, hp: T.hp * (o.hpMul || 1), maxHp: T.hp * (o.hpMul || 1),
    state: o.state || 'loiter', t: 0, cool: rr(0.5, 1.5), ph: Math.random() * 6, r: type === 'brute' ? 0.6 : 0.4, h: T.h, crime: o.crime || null,
    anchor: { x, z }, aggro: false, web: 0, frozen: 0, burn: 0, lift: 0, stun: 0, onGround: true, air: false, lie: 0, ko: false, bound: false, flashT: 0, slot: Math.random() * TAU,
    flying: !!T.flying, gun: T.weapon === 'gun' || T.weapon === 'laser', hasGun: T.weapon === 'gun', mass: type === 'brute' ? 2.2 : type === 'drone' ? 0.6 : 1, says: 0 };
  if (type === 'drone') {
    e.mesh = new THREE.Mesh(droneMesh(), MATS.vc); e.root = new THREE.Group(); e.root.add(e.mesh); R.scene.add(e.root);
    e.y = o.y || 9; e.h = 0.8;
  } else {
    const mat = MATS.skin.clone();
    e.M = buildRig(crookLook(gang, type), { h: T.h * rr(0.96, 1.04), bulk: T.bulk, legs: 0.49 }, { weapon: T.weapon === 'none' ? null : T.weapon, mat });
    R.scene.add(e.M.root);
  }
  FOES.list.push(e);
  return e;
}
function removeFoe(f) {
  f.dead = true;
  if (f.M) disposeRig(f.M); else if (f.root) { R.scene.remove(f.root); f.mesh.geometry.dispose(); }
  if (f.ice) { R.scene.remove(f.ice); f.ice = null; }
  const i = FOES.list.indexOf(f); if (i >= 0) FOES.list.splice(i, 1);
}

// ---------- damage ----------
// dmg points, knock velocity (kx, ky, kz), o: { big, word ('punch', 'big', 'zap', ... or null), status: { web, freeze, burn }, stun, src }
function damageFoe(f, dmg, kx = 0, ky = 0, kz = 0, o = {}) {
  if (f.kind === 'car') { hitCar(f, dmg, kx, ky, kz); return true; }
  if (f.dead || (f.ko && !f.boss)) return false;
  if (f.boss) return damageBoss(f, dmg, kx, ky, kz, o);
  const wasFrozen = f.frozen > 0;
  if (f.lift > 0 && !o.lift) dmg *= 1.3;
  f.hp -= dmg * (G.rampage ? 1.5 : 1);
  f.flashT = 0.12;
  f.aggro = true; f.hitT = 0;
  if (f.crime) f.crime.alerted = true;
  const cx = f.x, cy = f.y + f.h * 0.6, cz = f.z;
  if (o.word !== null) { const w = POWS[o.word || 'punch']; if (w && (o.big || chance(0.45))) pow(cx, cy + 0.6, cz, pick(w), { size: o.big ? 56 : 42 }); }
  if (o.spark !== false) hitSpark(cx, cy, cz, o.big);
  if (o.status) {
    if (o.status.web) { f.web += o.status.web; if (f.web >= 3 || f.hp <= 0) return bindFoe(f, 'web'); }
    if (o.status.freeze) { if (!wasFrozen) freezeFoe(f, o.status.freeze); if (f.hp <= 0) f.hp = 1; return true; }
    if (o.status.burn) f.burn = Math.max(f.burn, o.status.burn);
  }
  // a frozen crook shatters out of the ice and is out cold
  if (wasFrozen && !o.status) { thaw(f, true); f.hp = 0; }
  if (f.flying) {
    if (f.hp <= 0) { f.ko = true; f.state = 'fall'; f.vx = kx * 0.5; f.vz = kz * 0.5; f.vy = 4; scoreKO(f); }
    else { f.vx += kx * 0.3; f.vz += kz * 0.3; }
    AUDIO.sfx('clang', cx, cz);
    return true;
  }
  const force = Math.hypot(kx, ky, kz) / f.mass;
  if (f.hp <= 0) {
    f.ko = true; f.state = 'ko'; f.t = 0;
    knock(f, kx / f.mass + rr(-1, 1), Math.max(ky / f.mass, 4), kz / f.mass + rr(-1, 1));
    if (chance(0.5)) HUD.say(f, pick(LINES.crookKO));
    scoreKO(f);
    AUDIO.sfx(o.big ? 'punchBig' : 'punch', cx, cz);
  } else if (force > 9 || (o.big && f.type !== 'brute')) {
    f.state = 'down'; knock(f, kx / f.mass, Math.max(ky / f.mass, 3), kz / f.mass);
    AUDIO.sfx('punchBig', cx, cz);
  } else {
    if (f.state !== 'down') { f.state = 'hurt'; f.t = 0; }
    f.x += kx * 0.04; f.z += kz * 0.04;
    if (chance(0.2)) HUD.say(f, pick(LINES.crookHurt));
    AUDIO.sfx('punch', cx, cz);
  }
  if (o.stun) f.stun = Math.max(f.stun, o.stun);
  return true;
}
function scoreKO(f) {
  addScore(f.T.pts, f);
  G.arrests++; SAVE.arrests[G.heroId] = (SAVE.arrests[G.heroId] || 0) + 1;
  f.koT = 0;
  bus.emit('ko', f);
}
// webbed or frozen solid: out of the fight
function bindFoe(f, how) {
  if (f.ko || f.dead) return false;
  f.bound = how; f.ko = true; f.state = 'bound'; f.t = 0; f.hp = 0;
  if (how === 'web') {
    f.webCocoon = true;
    burst('web', f.x, f.y + f.h * 0.5, f.z, 3, { speed: 0.3, life: 9, size: f.h * 0.9, size1: f.h * 0.9, col: 0xffffff, alpha: 0.95 });
    pow(f.x, f.y + f.h + 0.5, f.z, pick(POWS.web), { size: 44, col: '#ffffff' });
  }
  if (f.flying) { f.state = 'fall'; f.vy = 0; }
  scoreKO(f);
  return true;
}
function freezeFoe(f, sec) {
  f.frozen = sec; f.state = 'frozen'; f.t = 0;
  if (!f.ice) {
    const g = new THREE.BoxGeometry(f.r * 3, f.h * 1.1, f.r * 3);
    f.ice = new THREE.Mesh(g, MATS.ice || (MATS.ice = new THREE.MeshToonMaterial({ color: 0xa8e8ff, transparent: true, opacity: 0.6, gradientMap: toonGrad(), emissive: 0x2a6a8a })));
    R.scene.add(f.ice);
  }
  f.ice.position.set(f.x, f.y + f.h * 0.55, f.z); f.ice.rotation.y = f.yaw;
  pow(f.x, f.y + f.h + 0.6, f.z, pick(POWS.ice), { col: '#a8f0ff', size: 44 });
  AUDIO.sfx('freeze', f.x, f.z);
}
function thaw(f, shatter) {
  f.frozen = 0;
  if (f.ice) { R.scene.remove(f.ice); f.ice = null; }
  if (shatter) {
    debris(f.x, f.y + f.h * 0.5, f.z, 14, { speed: 7, up: 7, size: 0.35, col: [0xa8e8ff, 0xe8f8ff, 0x6ac8f0], life: 1.6 });
    AUDIO.sfx('shatter', f.x, f.z);
  }
  if (f.state === 'frozen') { f.state = 'hurt'; f.t = 0; }
}

// ---------- the brains ----------
function updateFoes(dt) {
  // two melee crooks at a time get to swing at the hero
  let tokens = 0;
  for (const f of FOES.list) if (!f.ko && (f.state === 'windup' || f.state === 'strike') && f.tgt === P) tokens++;
  FOES.tokens = tokens;
  for (let i = FOES.list.length - 1; i >= 0; i--) {
    const f = FOES.list[i];
    if (f.boss) { updateBoss(f, dt); continue; }
    f.t += dt; f.cool -= dt; f.flashT -= dt; f.says -= dt;
    if (f.flying) updateDrone(f, dt);
    else updateCrook(f, dt);
    if (f.dead) continue;
    // cuffed and taken away a while after going down, or straight away when far off
    if (f.ko) {
      f.koT = (f.koT || 0) + dt;
      const far = P ? dist(f.x, f.z, P.x, P.z) > 120 : true;
      if ((f.koT > 9 && !f.air) || (far && f.koT > 2)) {
        burst('spark', f.x, f.y + 0.6, f.z, 14, { speed: 3, up: 2, life: 0.6, size: 0.6, col: [0x4a8aff, 0xff4a4a, 0xffffff] });
        if (!far) pow(f.x, f.y + 1.5, f.z, 'CUFFED!', { col: '#4a9aff', size: 30, life: 1 });
        removeFoe(f);
      }
    }
  }
}
function heroReachable(f) { return P && !P.downed && P.y - f.y < 2.6 && Math.abs(P.y - f.y) < 3; }
function pickTarget(f) {
  // a gang war: hit the other gang until a hero shows up
  if (f.crime && f.crime.type === 'gangwar' && !f.aggro) {
    let b = null, bd = 1e9;
    for (const o of FOES.list) if (o !== f && alive(o) && o.gang !== f.gang && o.crime === f.crime) { const d = dist2(o.x, o.z, f.x, f.z); if (d < bd) { bd = d; b = o; } }
    return b;
  }
  return f.aggro && P && !P.downed ? P : null;
}
function updateCrook(f, dt) {
  const M = f.M;
  // statuses first
  if (f.frozen > 0) {
    f.frozen -= dt;
    if (f.ice) f.ice.position.set(f.x, f.y + f.h * 0.55, f.z);
    if (f.frozen <= 0) thaw(f, false);
    placeRig(f, dt);
    shadow(f.x, f.y, f.z, 0.6);
    return;
  }
  if (f.burn > 0) {
    f.burn -= dt;
    if (G.frame % 2 === 0) particle('spark', f.x + rr(-0.3, 0.3), f.y + rr(0.3, f.h), f.z + rr(-0.3, 0.3), { vy: 3, life: 0.5, size: 0.9, size1: 0.2, col: pick([0xff8a20, 0xffd040, 0xff4a10]) });
    if (!f.ko) { f.hp -= dt * 5; if (f.hp <= 0) damageFoe(f, 1, 0, 3, 0, { word: null, spark: false }); }
  }
  if (f.lift > 0) {
    f.lift -= dt;
    const c = f.liftC;
    f.liftA += dt * 7;
    const r = Math.max(0.6, 2.2 - f.t * 0.3);
    f.x = lerp(f.x, c.x + Math.cos(f.liftA) * r, 1 - Math.exp(-dt * 8)); f.z = lerp(f.z, c.z + Math.sin(f.liftA) * r, 1 - Math.exp(-dt * 8));
    f.y = Math.min(f.y + dt * 4, c.y + 7);
    f.yaw += dt * 12; f.air = false; f.lie = 0;
    poseReset(M); poseTumble(M, f.t); poseApply(M, dt, 10);
    M.root.position.set(f.x, f.y + f.h * 0.5, f.z); M.root.rotation.set(Math.sin(f.t * 5) * 0.8, f.yaw, 0);
    if (f.lift <= 0) { const a = f.liftA; knock(f, Math.cos(a) * 9, 9, Math.sin(a) * 9); f.state = f.ko ? 'ko' : 'down'; f.lie = 0; }
    return;
  }
  if (f.air || f.state === 'down' || f.state === 'ko') {
    updateBody(f, dt);
    poseReset(M);
    if (f.air) poseTumble(M, f.t); else if (f.ko) poseKO(M); else { poseKO(M); }
    // get back up
    if (!f.air && !f.ko && f.state === 'down' && f.t > 1.3) { f.state = 'chase'; f.lie = 0; f.cool = rr(0.6, 1.2); }
    poseApply(M, dt, 10);
    placeRig(f, dt);
    if (f.ko && !f.air && G.frame % 20 === 0) particle('star', f.x + rr(-0.3, 0.3), f.y + 0.6, f.z + rr(-0.3, 0.3), { vy: 0.6, life: 0.6, size: 0.6, size1: 0.2 });
    shadow(f.x, f.gy === undefined ? f.y : f.gy, f.z, 0.5 * (f.lie > 0.5 ? 1.7 : 1));
    tintFoe(f);
    return;
  }
  if (f.state === 'bound') {
    poseReset(M); poseBound(M); poseApply(M, dt, 10);
    f.y = supportY(f.x, f.z, f.y + 0.5, 0.2);
    f.lie = Math.min(1, f.t * 3); f.lieYaw = f.yaw;
    placeRig(f, dt);
    shadow(f.x, f.y, f.z, 0.7);
    return;
  }
  if (f.stun > 0) { f.stun -= dt; }
  // perception: a hero close by, or one who has started a fight nearby, draws the whole crew
  if (!f.aggro && P && !P.downed) {
    const d = dist(f.x, f.z, P.x, P.z);
    if ((d < 22 && Math.abs(P.y - f.y) < 25) || (f.crime && f.crime.alerted)) {
      f.aggro = true;
      if (f.crime) f.crime.alerted = true;
      if (f.says <= 0 && chance(0.5)) { HUD.say(f, pick(LINES.crookSee).replace('{hero}', P.D.name)); f.says = 6; }
      AUDIO.sfx('alert', f.x, f.z);
    }
  }
  if (f.aggro && P && (P.downed || dist(f.x, f.z, P.x, P.z) > 90)) f.aggro = false;
  const tgt = pickTarget(f);
  f.tgt = tgt;
  poseReset(M);
  let moving = 0, wantX = f.x, wantZ = f.z, sp = f.T.speed;
  if (f.stun > 0) { poseHurt(M, 0.6); }
  else if (f.state === 'hurt') { poseHurt(M, 1 - f.t / 0.4); if (f.t > 0.4) f.state = 'chase'; }
  else if (!tgt) {
    // loiter about the crime
    const c = f.crime;
    if (c && c.type === 'mugging' && c.victim) { f.yaw = angTo(f.yaw, yawOf(c.victim.x - f.x, c.victim.z - f.z), 4 * dt); if (f.hasGun) poseAimGun(M, 0.1); else { setT(M, B.armR, 1.8 + Math.sin(f.t * 4) * 0.2, 0, 0.3); armsRest(M); setT(M, B.armR, 1.8, 0, 0.2); } }
    else if (c && c.type === 'robbery' && f.hasGun) { poseAimGun(M, 0.05); f.yaw = angTo(f.yaw, f.anchorYaw === undefined ? f.yaw : f.anchorYaw, 3 * dt); }
    else {
      if (dist(f.x, f.z, f.anchor.x, f.anchor.z) > 3) { wantX = f.anchor.x; wantZ = f.anchor.z; moving = 0.4; sp = 1.6; }
      else poseIdle(M, f.t);
    }
  } else {
    const tx = tgt.x, tz = tgt.z, d = dist(f.x, f.z, tx, tz), face = yawOf(tx - f.x, tz - f.z);
    if (f.gun) {
      // keep at range, strafe, shoot
      if (f.state === 'aim') {
        f.yaw = angTo(f.yaw, face, 8 * dt);
        poseAimGun(M, clamp(Math.atan2((tgt.y + 1.2) - (f.y + 1.5), d), -1, 1.2));
        if (f.t > 0.5) { crookShoot(f, tgt); f.state = 'chase'; f.cool = rr(1.6, 2.6); }
      } else {
        const want = 12;
        if (d > 22 || !losClear(f.x, f.y + 1.5, f.z, tx, tgt.y + 1, tz)) { wantX = tx; wantZ = tz; moving = 1; }
        else if (d < 7) { wantX = f.x - (tx - f.x); wantZ = f.z - (tz - f.z); moving = 1; }
        else { const a = face + Math.PI / 2 * (Math.sin(f.slot + f.t * 0.3) > 0 ? 1 : -1); wantX = f.x + fwdX(a) * 3; wantZ = f.z + fwdZ(a) * 3; moving = 0.45; sp = 2.2; }
        if (f.cool <= 0 && d < 30 && d > 3) { f.state = 'aim'; f.t = 0; }
        if (!moving) f.yaw = angTo(f.yaw, face, 6 * dt);
        if (moving < 1) poseAimGun(M, 0);
      }
    } else if (f.state === 'windup') {
      f.yaw = angTo(f.yaw, face, 6 * dt);
      const wt = f.type === 'brute' ? 0.75 : 0.5;
      const k = f.t / wt;
      setT(M, B.armR, 2.6 * k, 0, 0.4); setT(M, B.foreR, 0.8 * k, 0, 0); setT(M, B.spine, 0.2 * k, 0.4 * k, 0); armsRest(M); setT(M, B.armR, 2.7 * k, 0, 0.4);
      if (f.t > wt) { f.state = 'strike'; f.t = 0; }
    } else if (f.state === 'strike') {
      posePunch(M, 3, 0.3 + f.t / 0.35 * 0.7);
      if (!f.struck && f.t > 0.08) {
        f.struck = true;
        const reach = f.T.reach + 0.8;
        const fx = fwdX(f.yaw), fz = fwdZ(f.yaw);
        if (d < reach && ((tx - f.x) * fx + (tz - f.z) * fz) > 0 && (tgt === P ? heroReachable(f) : true)) {
          if (tgt === P) hurtHero(f.T.dmg, f.x, f.z, f.type === 'brute' ? 12 : 4, f);
          else damageFoe(tgt, 2, fx * 3, 1, fz * 3, { word: chance(0.3) ? 'punch' : null });
        }
        AUDIO.sfx('swish', f.x, f.z);
      }
      if (f.t > 0.35) { f.state = 'chase'; f.cool = rr(1.0, 2.0) * (f.type === 'brute' ? 1.4 : 1); f.struck = false; }
    } else {
      // melee: close in to striking range if there's a token, otherwise circle at a distance
      const canSwing = tgt !== P || FOES.tokens < 2;
      const ring = canSwing && f.cool <= 0 ? f.T.reach * 0.8 : 4 + (f.slot % 1) * 1.5;
      f.slot += dt * 0.25;
      const ax = tx + Math.cos(f.slot) * ring, az = tz + Math.sin(f.slot) * ring;
      if (dist(f.x, f.z, ax, az) > 0.6) { wantX = ax; wantZ = az; moving = 1; if (d > 8) sp *= 1.1; else sp *= 0.7; }
      else f.yaw = angTo(f.yaw, face, 6 * dt);
      if (canSwing && f.cool <= 0 && d < f.T.reach + 0.3 && (tgt !== P || heroReachable(f))) { f.state = 'windup'; f.t = 0; f.struck = false; if (tgt === P) FOES.tokens++; }
      // the hero is up on a roof: shout up at him
      if (tgt === P && !heroReachable(f) && d < 10) { moving = 0; f.yaw = angTo(f.yaw, face, 6 * dt); poseCheer(M, f.t * 0.6); if (f.says <= 0 && chance(0.01)) { HUD.say(f, pick(['Come down here!', 'Coward!', 'Get down here!'])); f.says = 8; } }
    }
  }
  // move toward want, keeping apart from each other
  if (moving > 0) {
    let dx = wantX - f.x, dz = wantZ - f.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    for (const o of FOES.list) { if (o === f || o.ko || o.flying) continue; const ox = f.x - o.x, oz = f.z - o.z, od = Math.hypot(ox, oz); if (od < 1.4 && od > 0.01) { dx += ox / od * (1.4 - od); dz += oz / od * (1.4 - od); } }
    const l2 = Math.hypot(dx, dz) || 1;
    const s = sp * moving * (f.burn > 0 ? 1.4 : 1) * (f.web > 0 ? 0.6 : 1);
    f.x += dx / l2 * s * dt; f.z += dz / l2 * s * dt;
    f.yaw = angTo(f.yaw, yawOf(dx, dz), 8 * dt);
    f.ph += dt * s * 2.4;
    if (!(f.gun && moving < 1)) poseRun(M, f.ph, clamp(s / 7, 0, 0.8), 0.05);
  } else if (f.state === 'chase' && !f.gun && tgt === P && heroReachable(f)) {
    // guard stance between swings
    setT(M, B.armL, 0.9, 0, -0.3); setT(M, B.foreL, 1.6, 0, 0); if (f.T.weapon === 'none') { setT(M, B.armR, 0.9, 0, 0.3); setT(M, B.foreR, 1.6, 0, 0); } else { setT(M, B.armR, 0.6, 0, 0.35); setT(M, B.foreR, 0.9, 0, 0); }
  }
  if (f.burn > 0 && !f.ko) { setT(M, B.armL, 2.8, 0, -0.4); setT(M, B.armR, 2.8, 0, 0.4); }
  f.onGround = true;
  f.y = supportY(f.x, f.z, f.y + 0.5, 0.25);
  collide(f, f.r, f.h);
  carCollide(f, f.r);
  if (!onLand(f.x, f.z)) { f.x = clamp(f.x, -CITY.EDGE + 1, CITY.EDGE - 1); f.z = clamp(f.z, -CITY.EDGE + 1, CITY.EDGE - 1); }
  poseApply(M, dt, 14);
  placeRig(f, dt);
  shadow(f.x, f.y, f.z, f.r * 1.2);
  tintFoe(f);
}
function tintFoe(f) { if (f.M) f.M.mat.emissive.setHex(f.flashT > 0 ? 0xffffff : f.burn > 0 ? 0x5a1a00 : 0); }
// a pistol shot (or a drone's laser): a tracer, and maybe a hit
function crookShoot(f, tgt) {
  const fx = fwdX(f.yaw), fz = fwdZ(f.yaw);
  const ox = f.x + fx * 0.5 + Math.cos(f.yaw) * 0.25, oy = f.y + (f.flying ? 0 : f.h * 0.75), oz = f.z + fz * 0.5 - Math.sin(f.yaw) * 0.25;
  const ty = tgt.y + (tgt.h || 1.8) * 0.6;
  const d = Math.hypot(tgt.x - ox, ty - oy, tgt.z - oz);
  // harder to hit a hero who is far away or moving fast
  const hv = tgt === P ? Math.hypot(P.vx, P.vy, P.vz) : 0;
  let hitP = clamp(0.85 - d / 50 - hv / 40, 0.12, 0.85);
  if (tgt === P && (P.dodge > 0 || P.invuln > 0)) hitP = 0;
  const hit = chance(hitP) && losClear(ox, oy, oz, tgt.x, ty, tgt.z);
  const ex = hit ? tgt.x : tgt.x + rr(-2, 2), ey = hit ? ty : ty + rr(-1, 2), ez = hit ? tgt.z : tgt.z + rr(-2, 2);
  beam(new V3(ox, oy, oz), new V3(ex, ey, ez), { w: f.flying ? 0.12 : 0.06, col: f.flying ? 0x40ff60 : 0xfff0a0, life: f.flying ? 0.15 : 0.08, add: true });
  particle('spark', ox, oy, oz, { life: 0.08, size: 1.2, col: 0xffd060 });
  AUDIO.sfx(f.flying ? 'laser' : 'gun', f.x, f.z);
  alarm(f.x, f.z, 30, 'gun');
  if (hit) { if (tgt === P) hurtHero(f.T.dmg, f.x, f.z, 1, f); else damageFoe(tgt, 3, 0, 0, 0, { word: null }); }
}
// drones: hover above the hero in a loose ring, strafe and fire; dead ones drop and burst
function updateDrone(f, dt) {
  if (f.ko || f.state === 'fall') {
    f.vy -= 20 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    f.root.rotation.x += dt * 6; f.root.rotation.z += dt * 4;
    if (f.y <= supportY(f.x, f.z, f.y + 1, 0.3) + 0.3) {
      burst('spark', f.x, f.y, f.z, 20, { speed: 8, life: 0.4, size: 0.8, col: [0xffa040, 0xffffff] });
      burst('puff', f.x, f.y, f.z, 8, { speed: 3, life: 0.8, size: 1.2, size1: 2.5, col: 0x3a3a40, alpha: 0.7 });
      debris(f.x, f.y, f.z, 6, { speed: 5, up: 5, size: 0.25, col: [0x50545c, 0xd02020] });
      AUDIO.sfx('boom', f.x, f.z);
      removeFoe(f);
      return;
    }
    f.root.position.set(f.x, f.y, f.z);
    return;
  }
  if (f.frozen > 0) { f.frozen -= dt; if (f.frozen <= 0) thaw(f, false); f.root.position.set(f.x, f.y, f.z); if (f.ice) f.ice.position.set(f.x, f.y, f.z); return; }
  if (f.lift > 0) { f.lift -= dt; f.liftA += dt * 7; f.x = f.liftC.x + Math.cos(f.liftA) * 2; f.z = f.liftC.z + Math.sin(f.liftA) * 2; f.y += dt * 3; if (f.lift <= 0) damageFoe(f, 999, 0, 0, 0, { word: 'zap' }); f.root.position.set(f.x, f.y, f.z); return; }
  if (P && !P.downed && dist(f.x, f.z, P.x, P.z) < 60) f.aggro = true;
  if (f.aggro && P) {
    f.slot += dt * 0.5;
    const tx = P.x + Math.cos(f.slot) * 10, tz = P.z + Math.sin(f.slot) * 10, ty = Math.max(P.y + 6, supportY(tx, tz, 999) + 5);
    f.vx = damp(f.vx, (tx - f.x) * 1.2, 2, dt); f.vz = damp(f.vz, (tz - f.z) * 1.2, 2, dt); f.vy = damp(f.vy, (ty - f.y) * 1.2, 2, dt);
    const sp = Math.hypot(f.vx, f.vz); if (sp > f.T.speed) { f.vx *= f.T.speed / sp; f.vz *= f.T.speed / sp; }
    f.yaw = angTo(f.yaw, yawOf(P.x - f.x, P.z - f.z), 4 * dt);
    if (f.cool <= 0) { if (f.state !== 'aim') { f.state = 'aim'; f.t = 0; } if (f.t > 0.6) { crookShoot(f, P); f.state = 'fly'; f.cool = rr(1.8, 3); } }
  } else { f.vx = damp(f.vx, 0, 2, dt); f.vz = damp(f.vz, 0, 2, dt); f.vy = damp(f.vy, Math.sin(f.t) * 0.5, 2, dt); }
  f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
  const e = { x: f.x, y: f.y - 0.3, z: f.z, onGround: false }; collide(e, 0.6, 0.6, 0); f.x = e.x; f.z = e.z;
  f.root.position.set(f.x, f.y + Math.sin(f.t * 3) * 0.1, f.z);
  f.root.rotation.set(-f.vz * 0.02, f.yaw, f.vx * 0.02);
  if (f.flashT > 0) f.mesh.material = MATS.glow; else f.mesh.material = MATS.vc;
  shadow(f.x, supportY(f.x, f.z, f.y), f.z, 0.6, 0.8);
}
// all the crooks a point could hit: within r of (x, y, z)
function foesNear(x, y, z, r, includeKO = false) {
  const out = [];
  for (const f of FOES.list) { if (f.dead || (!includeKO && (f.ko || f.bound))) continue; if (Math.hypot(f.x - x, (f.y + f.h * 0.5) - y, f.z - z) < r + f.r) out.push(f); }
  return out;
}
