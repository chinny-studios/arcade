// Veyra Below — bosses: Vharn the Rotwing, the Maw Below, CUSTODIAN-7, Kharzael the Sleeper

const BOSS_MODELS = {
  vharn(B) {
    const r = rigBase(), c = mat(B.color, { flat: true }), c2 = mat(B.color2, { e: B.color2, ei: 1 }), bone = mat(0xd8d0b0, { flat: true }), wing = mat(0x34502a, { ds: true });
    part(r.body, GM.sphMid(), c, 0, 1.6, 0, 1.6, 1.3, 2.6);
    for (let i = 0; i < 6; i++) part(r.body, GM.cone4(), bone, 0, 2.2 - i * 0.05, 0.9 - i * 0.45, 0.2, 0.5, 0.2).rotation.x = -0.4;
    const neck = pivot(r.body, 0, 2.0, 1.1); part(neck, GM.cyl6(), c, 0, 0.5, 0.4, 0.6, 1.4, 0.6).rotation.x = 0.9; r.neck = neck;
    r.head = pivot(neck, 0, 1.0, 1.0); part(r.head, GM.box(), c, 0, 0, 0.3, 0.8, 0.6, 1.1); part(r.head, GM.box(), mat(0x2a3420), 0, -0.3, 0.45, 0.7, 0.2, 1.0);
    part(r.head, GM.cone4(), bone, 0.3, 0.4, -0.1, 0.12, 0.7, 0.12).rotation.x = -0.8; part(r.head, GM.cone4(), bone, -0.3, 0.4, -0.1, 0.12, 0.7, 0.12).rotation.x = -0.8;
    part(r.head, GM.sph(), c2, 0.25, 0.12, 0.7, 0.14, 0.12, 0.12); part(r.head, GM.sph(), c2, -0.25, 0.12, 0.7, 0.14, 0.12, 0.12);
    r.jaw = pivot(r.head, 0, -0.2, -0.1); part(r.jaw, GM.box(), c, 0, -0.1, 0.45, 0.6, 0.15, 0.9); part(r.jaw, GM.sph(), mat(0xff6020, { e: 0xff5010, ei: 1.5 }), 0, 0.05, 0.4, 0.4, 0.1, 0.6);
    const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0.2); wingShape.lineTo(4.6, 0.9); wingShape.lineTo(4.2, -0.4); wingShape.lineTo(3.2, -1.2); wingShape.lineTo(2.4, -0.9); wingShape.lineTo(1.4, -1.9); wingShape.lineTo(0.2, -1.2);
    const wingGeo = new THREE.ShapeGeometry(wingShape); wingGeo.rotateX(-Math.PI / 2);
    for (const s of [-1, 1]) { const w = pivot(r.body, s * 0.7, 2.3, 0.2); const p = part(w, wingGeo, wing, 0, 0, 0, s * 0.75, 1, 0.75); p.userData.keepGeo = true; const bn = part(w, GM.cyl6(), bone, s * 1.7, 0.05, 0.25, 0.1, 3.5, 0.1); bn.rotation.z = Math.PI / 2; bn.rotation.y = -s * 0.12; r.wings.push(w); }
    for (const [x, z] of [[0.8, 0.9], [-0.8, 0.9], [0.8, -0.8], [-0.8, -0.8]]) { const l = pivot(r.body, x, 1.2, z); part(l, GM.box(), c, 0, -0.55, 0, 0.45, 1.1, 0.5); part(l, GM.box(), bone, 0, -1.1, 0.25, 0.5, 0.15, 0.6); r.legs.push(l); }
    r.tail = pivot(r.body, 0, 1.4, -1.3); let tp = r.tail; r.tailSegs = [];
    for (let i = 0; i < 5; i++) { const s = pivot(tp, 0, 0, -0.7); part(s, GM.box(), c, 0, 0, -0.3, 0.5 - i * 0.08, 0.4 - i * 0.06, 0.8); r.tailSegs.push(s); tp = s; }
    r.h = 3.4; return r;
  },
  maw(B) {
    const r = rigBase(), c = mat(B.color, { flat: true }), c2 = mat(B.color2, { e: B.color2, ei: 1.3 }), t = mat(0xe8dcc0, { flat: true });
    r.segs = [];
    for (let i = 0; i < 9; i++) { const s = new THREE.Group(); const sz = 1.5 - i * 0.1; part(s, GM.sphMid(), c, 0, 0, 0, sz, sz, sz * 0.9); part(s, GM.box(), c2, 0, sz * 0.42, 0, sz * 0.5, 0.1, sz * 0.5); for (const k of [-1, 1]) part(s, GM.cone4(), t, k * sz * 0.4, sz * 0.2, 0, 0.15, 0.6, 0.15).rotation.z = -k * 0.8; r.g.add(s); r.segs.push(s); }
    r.head = r.segs[0];
    const mouth = part(r.head, GM.sph(), c2, 0, 0, 0.6, 0.9, 0.9, 0.3); r.mouth = mouth;
    r.mand = [];
    for (let k = 0; k < 4; k++) { const m = pivot(r.head, 0, 0, 0.55); part(m, GM.cone4(), t, 0, 0.6, 0.2, 0.25, 1.2, 0.25).rotation.x = 0.6; m.rotation.z = k * Math.PI / 2 + Math.PI / 4; r.mand.push(m); }
    r.h = 3; return r;
  },
  custodian(B) {
    const r = rigBase(), c = mat(B.color, { flat: true }), dk = mat(0x22262c), c2 = mat(B.color2, { e: B.color2, ei: 1.5 }), cy = mat(0x40e0ff, { e: 0x40e0ff, ei: 1.2 });
    part(r.body, GM.cyl6(), dk, 0, 0.4, 0, 5, 0.8, 5); part(r.body, GM.cyl6(), cy, 0, 0.82, 0, 4.2, 0.06, 4.2);
    r.core = pivot(r.body, 0, 3.0, 0);
    part(r.core, GM.sphMid(), c, 0, 0, 0, 2.2, 2.2, 2.2); r.eye = part(r.core, GM.sph(), c2, 0, 0, 0.95, 0.9, 0.9, 0.5);
    r.ring = pivot(r.core, 0, 0, 0); for (let i = 0; i < 3; i++) { const t = part(r.ring, GM.tor(), dk, 0, 0, 0, 3.6 - i * 0.5, 3.6 - i * 0.5, 3.6 - i * 0.5); t.rotation.x = Math.PI / 2 + i * 0.5; }
    r.shield = mesh(GM.sph(), glowMat(0x40e0ff, 0.22), 0, 0, 0, 3.2, 3.2, 3.2); r.core.add(r.shield);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; const p = part(r.body, GM.box(), c, Math.cos(a) * 2.2, 1.6, Math.sin(a) * 2.2, 0.4, 2.4, 0.4); p.rotation.y = -a; }
    r.h = 4.2; return r;
  },
  pod(B) {
    const r = rigBase(), c = mat(0x5a6470, { flat: true }), c2 = mat(0xff3040, { e: 0xff3040, ei: 1.4 });
    part(r.body, GM.cyl6(), mat(0x22262c), 0, 0.4, 0, 1.4, 0.8, 1.4);
    r.head = pivot(r.body, 0, 1.3, 0); part(r.head, GM.sphMid(), c, 0, 0, 0, 1.1, 1.0, 1.1); part(r.head, GM.box(), c2, 0, 0.1, 0.5, 0.5, 0.15, 0.1);
    part(r.head, GM.cyl(), c, 0, 0, 0.8, 0.14, 0.8, 0.14).rotation.x = Math.PI / 2;
    r.h = 1.9; return r;
  },
  sleeper(B) {
    const r = rigBase(), c = mat(B.color, { flat: true }), c2 = mat(B.color2, { e: B.color2, ei: 1.4 }), bone = mat(0xd8d0c0, { flat: true });
    r.robe = pivot(r.body, 0, 0, 0);
    part(r.robe, GM.cone(), c, 0, 1.8, 0, 2.4, 3.6, 2.0); part(r.robe, GM.cyl(), c, 0, 3.7, 0, 1.1, 0.9, 0.9);
    r.head = pivot(r.robe, 0, 4.5, 0.1); part(r.head, GM.sphMid(), bone, 0, 0, 0, 0.8, 0.95, 0.85); part(r.head, GM.cone(), c, 0, 0.3, -0.1, 1.1, 1.3, 1.1).rotation.x = -0.25;
    for (const s of [-1, 1]) part(r.head, GM.sph(), c2, s * 0.2, 0, 0.36, 0.16, 0.12, 0.1);
    r.halo = part(r.head, GM.tor(), c2, 0, 0.9, -0.2, 2.2, 2.2, 2.2); r.halo.rotation.x = Math.PI / 2 - 0.3;
    for (const s of [-1, 1]) { const a = pivot(r.robe, s * 0.9, 3.8, 0.1); part(a, GM.box(), c, 0, -0.9, 0, 0.4, 1.8, 0.4); part(a, GM.cyl(), bone, 0, -1.9, 0.6, 0.08, 1.6, 0.08).rotation.x = Math.PI / 2; const bl = part(a, GM.cone4(), c2, 0, -1.9, 1.7, 0.6, 1.4, 0.08); bl.rotation.x = Math.PI / 2; bl.rotation.z = s * 0.4; r.arms.push(a); }
    // the heart, revealed in the second phase
    r.heart = pivot(r.body, 0, 2.6, 0); r.heart.visible = false;
    part(r.heart, GM.sphMid(), mat(0x6a1a3a, { flat: true }), 0, 0, 0, 2.6, 3.0, 2.6); r.heartGlow = part(r.heart, GM.sph(), c2, 0, 0, 0, 1.8, 2.2, 1.8);
    r.tendrils = [];
    for (let i = 0; i < 8; i++) { const t = pivot(r.heart, 0, -0.5, 0); t.rotation.y = i / 8 * TAU; let p = t; for (let k = 0; k < 4; k++) { const s = pivot(p, 0, 0, 0.8); part(s, GM.box(), mat(0x3a1028, { flat: true }), 0, 0, 0.4, 0.4 - k * 0.07, 0.4 - k * 0.07, 0.9); p = s; } r.tendrils.push(t); }
    r.h = 5.5; return r;
  },
};

function spawnBoss(id, x, z, lvl) {
  const B = BOSSES[id], D = DIFFS[GAME.diff], party = 1 + 0.32 * ALLIES.length;
  const hp = Math.round(B.hp * LCURVE(lvl) * (1 + lvl / 80) * D.hp * party);
  const e = makeActor('enemy', x, z, { team: 1, boss: true, bossId: id, def: { name: B.name, family: AREAS[B.area].family, attacks: [], color: B.color, color2: B.color2 }, lvl, hp, maxHp: hp,
    atk: B.atk * ECURVE(lvl) * D.dmg, xp: Math.round(B.xp * (5 + 2 * lvl) * (1 + lvl / 40) * D.xp), ata: 40 + lvl * 2.4, evp: 20 + lvl * 1.6, res: B.res, r: B.size * 0.55, area: B.area,
    name: B.name, phase: 1, timer: 2, cds: {}, aggro: null, cx: x, cz: z });
  e.rig = BOSS_MODELS[id](B); e.model = e.rig.g; e.h = e.rig.h;
  e.model.position.set(x, 0, z); R.root.add(e.model);
  e.yaw = -Math.PI / 2;
  BOSS_INIT[id] && BOSS_INIT[id](e);
  return e;
}
const BOSS_INIT = {
  maw(e) { e.trail = []; e.mode = 'surface'; e.timer = 3; e.r = 1.4; },
  custodian(e) {
    e.static = true; e.mode = 'shield'; e.bossShield = true; e.r = 2.4; e.pods = [];
    spawnPods(e);
  },
  sleeper(e) { e.r = 1.4; },
};
function spawnPods(e) {
  e.pods = [];
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + Math.PI / 6, x = e.cx + Math.cos(a) * 8, z = e.cz + Math.sin(a) * 8;
    const p = makeActor('enemy', x, z, { team: 1, def: { name: 'Turret Pod', family: 'machine', attacks: [], color2: 0xff3040 }, lvl: e.lvl, hp: Math.round(e.maxHp * 0.07), maxHp: Math.round(e.maxHp * 0.07), atk: e.atk * 0.45, xp: Math.round(e.xp * 0.05), ata: e.ata, evp: e.evp * 0.6, res: { bolt: -0.3 }, r: 0.8, static: true, name: 'Turret Pod', pod: true, owner: e, cd: rnd.range(1, 2.5), area: 'mines', noDrop: true });
    p.rig = BOSS_MODELS.pod({}); p.model = p.rig.g; p.h = 2; p.model.position.set(x, 0, z); R.root.add(p.model); FX.teleIn(x, z, 0xff3040);
    e.pods.push(p);
  }
}

function bossTarget(e) {
  if (e.aggro && alive(e.aggro) && Math.random() > 0.01) return e.aggro;
  const opts = ENTS.filter((p) => p.team === 0 && alive(p) && !p.summon);
  e.aggro = opts.length ? rnd.pick(opts) : null;
  return e.aggro;
}
function bossZone(e, o) { return addZone(Object.assign({ team: 1, owner: e, tele: true, onHit: (p) => { if (!p.summon) enemyHit(e, p, { dmg: e.atk * (o.mult || 1), elem: o.elem, kb: o.kb || 3, sure: true, status: o.status }); } }, o)); }
function bossShot(e, tgt, o) {
  const yy = Math.atan2(tgt.x - e.x, tgt.z - e.z) + (o.spread || 0);
  return shootProj(e, Object.assign({ x: e.x + Math.sin(yy) * (o.off || 1.5), z: e.z + Math.cos(yy) * (o.off || 1.5), y: o.y || 2, dx: Math.sin(yy), dz: Math.cos(yy), speed: 10, life: 3, r: 0.5, team: 1, color: 0xff7030, kind: 'fireball', payload: { dmg: e.atk * (o.mult || 0.8), elem: o.elem } }, o));
}
// expanding shockwave rings that must be dodged or rolled through
const WAVES = [];
function shockwave(e, x, z, speed, max, mult, color) {
  WAVES.push({ e, x, z, r: 0.5, speed, max, mult, hit: new Set(), color });
  FX.ring(x, z, color, 0.5, max, max / speed, 0.15, 0.9);
}
function updateWaves(dt) {
  for (let i = WAVES.length - 1; i >= 0; i--) {
    const w = WAVES[i]; w.r += w.speed * dt;
    for (const p of ENTS) {
      if (p.team !== 0 || !alive(p) || p.summon || w.hit.has(p)) continue;
      const d = Math.sqrt(dist2(p.x, p.z, w.x, w.z));
      if (Math.abs(d - w.r) < 0.5 + p.r) { w.hit.add(p); enemyHit(w.e, p, { dmg: w.e.atk * w.mult, elem: 'dark', kb: 5, sure: true }); }
    }
    if (w.r >= w.max) WAVES.splice(i, 1);
  }
}

function updateBoss(e, dt) {
  e.t += dt; e.st += dt;
  if (e.dead) {
    e.deadT = (e.deadT || 0) + dt;
    if (Math.random() < 0.3 && e.deadT < 2.5) FX.explode(e.x + rnd.range(-2, 2), e.z + rnd.range(-2, 2), 2, e.def.color2);
    e.model.position.y = -Math.max(0, e.deadT - 1.5) * 1.5; e.model.rotation.z = Math.min(0.4, e.deadT * 0.2);
    if (e.deadT > 3.5) removeActor(e);
    return;
  }
  updateStatus(e, dt);
  if (!e.awake) { finishBoss(e, dt, 0); return; }
  const frozen = !canAct(e);
  if (!frozen) BOSS_AI[e.bossId](e, dt);
  finishBoss(e, dt, frozen ? 0 : 1);
}
function finishBoss(e, dt, rate) {
  e.model.position.set(e.x, e.burrowY || 0, e.z);
  e.model.rotation.y = e.yaw;
  const r = e.rig;
  if (e.bossId === 'vharn') {
    const fly = e.flyH || 0; r.body.position.y = fly + Math.sin(e.t * 2) * 0.05;
    const flap = fly > 0.2 ? Math.sin(e.t * 7) * 0.7 : Math.sin(e.t * 1.5) * 0.1 - 0.2;
    r.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * flap; });
    r.legs.forEach((l, i) => { l.rotation.x = (e.moving ? Math.sin(e.t * 6 + i * Math.PI) * 0.5 : 0); });
    r.tailSegs.forEach((s, i) => { s.rotation.y = Math.sin(e.t * 2 + i * 0.6) * 0.25 + (e.sweep || 0) * 0.3; });
    r.jaw.rotation.x = e.breath ? 0.6 : e.biting ? 0.5 : 0.05;
    r.neck.rotation.x = e.biting ? 0.5 : e.breath ? 0.2 : 0;
  } else if (e.bossId === 'maw') {
    // segments trail behind the head
    const segs = r.segs;
    const hx = 0, hy = e.headY !== undefined ? e.headY : 2.5;
    segs[0].position.set(hx, hy, 0);
    for (let i = 1; i < segs.length; i++) {
      const a = e.t * 2 - i * 0.5;
      segs[i].position.set(Math.sin(a) * 0.4 * i * 0.3, Math.max(-3, hy - i * (e.mode === 'surface' ? 0.32 : 0.9)), -i * 0.85);
    }
    r.mand.forEach((m, k) => { m.rotation.x = e.mouthOpen ? -0.6 : 0.1; });
    if (r.mouth) r.mouth.material.emissiveIntensity = 1 + Math.sin(e.t * 6) * 0.4;
  } else if (e.bossId === 'custodian') {
    r.ring.rotation.y += dt * (e.mode === 'exposed' ? 3 : 0.8); r.ring.rotation.x = Math.sin(e.t * 0.5) * 0.3;
    r.shield.visible = !!e.bossShield; r.shield.scale.setScalar(3.2 + Math.sin(e.t * 4) * 0.1);
    r.core.position.y = e.mode === 'hunt' ? 3.6 + Math.sin(e.t * 2) * 0.3 : 3.0;
    if (e.lookYaw !== undefined) r.core.rotation.y = e.lookYaw - e.yaw;
  } else if (e.bossId === 'sleeper') {
    r.body.position.y = Math.sin(e.t * 1.2) * 0.2;
    r.halo.rotation.z += dt * 0.8;
    r.arms.forEach((a, i) => { a.rotation.x = e.swing ? lerp(-2.2, 0.6, e.swingK || 0) : Math.sin(e.t + i) * 0.1 - 0.3; a.rotation.z = (i ? -1 : 1) * 0.2; });
    if (e.phase >= 2) { r.robe.visible = false; r.heart.visible = true; const p = 1 + Math.sin(e.t * 5) * 0.08; r.heart.scale.setScalar(p); r.tendrils.forEach((t, i) => { t.rotation.x = Math.sin(e.t * 2 + i) * 0.3 - 0.2; t.children.forEach((s) => { }); }); }
  }
  if (e.flash > 0) e.flash -= dt;
}
function bossDash(e, tx, tz, speed, dt) {
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz); if (d < 0.2) return true;
  const s = Math.min(d, speed * dt); moveCircle(e, dx / d * s, dz / d * s, e.r); e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 6 * dt);
  return d < 0.5;
}

const BOSS_AI = {
  vharn(e, dt) {
    const tgt = bossTarget(e); if (!tgt) return;
    const hpK = e.hp / e.maxHp, rage = hpK < 0.3 ? 1.35 : 1;
    e.timer -= dt * rage; e.moving = false;
    // take to the air at 66% and 33%
    if ((hpK < 0.66 && e.phase === 1) || (hpK < 0.33 && e.phase === 2)) { e.phase++; e.mode = 'takeoff'; e.st = 0; AUDIO.sfx('roar', e.x, e.z); HUD.toast('Vharn takes to the air!', '#ff9060'); }
    const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz);
    switch (e.mode || 'ground') {
      case 'ground': {
        e.breath = false; e.biting = false;
        if (e.timer > 0) { if (d > 4.5) { bossDash(e, tgt.x, tgt.z, 3.4 * rage, dt); e.moving = true; } else e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 3 * dt); break; }
        const opts = d < 5 ? ['bite', 'bite', 'sweep', 'breath'] : ['breath', 'charge', 'fireballs'];
        e.mode = rnd.pick(opts); e.st = 0;
        if (e.mode === 'sweep') bossZone(e, { x: e.x, z: e.z, r: 6, delay: 1.0, mult: 1.3, kb: 8, fx: (z) => { FX.ring(z.x, z.z, 0xd0c080, 1, 6, 0.4); e.sweep = 1; CAM.shake = 0.5; AUDIO.sfx('heavy', z.x, z.z); } });
        if (e.mode === 'breath') { e.breathYaw = Math.atan2(dx, dz); e.yaw = e.breathYaw; e.tele = FX.tele(e.x, e.z, 2.2, 0.9, 0xff5020, 'line', 12, e.breathYaw); }
        if (e.mode === 'charge') { e.chargeYaw = Math.atan2(dx, dz); e.yaw = e.chargeYaw; e.tele = FX.tele(e.x, e.z, 2, 0.9, 0xff3030, 'line', 16, e.chargeYaw); e.hitSet = new Set(); }
        break;
      }
      case 'bite': {
        e.biting = e.st > 0.5;
        if (e.st < 0.6) e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 3 * dt);
        if (e.st >= 0.65 && !e.bitDone) { e.bitDone = true; const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw); AUDIO.sfx('heavy', e.x, e.z); FX.slash(e.x + fx * 2.5, e.z + fz * 2.5, e.yaw, 1.4, 2.5, 0xff8060, 1.5);
          for (const p of foesInRadius(1, e.x + fx * 3, e.z + fz * 3, 2.4)) if (!p.summon) enemyHit(e, p, { dmg: e.atk * 1.2, kb: 6 }); }
        if (e.st > 1.1) { e.mode = 'ground'; e.timer = rnd.range(0.8, 1.6); e.bitDone = false; }
        break;
      }
      case 'sweep': if (e.st > 1.5) { e.sweep = 0; e.mode = 'ground'; e.timer = 1.2; } break;
      case 'breath': {
        if (e.st < 0.9) break;
        if (e.tele) { FX.kill(e.tele); e.tele = null; }
        e.breath = true;
        e.breathYaw = angTo(e.breathYaw, Math.atan2(dx, dz), 0.5 * dt); e.yaw = e.breathYaw;
        const fx = Math.sin(e.breathYaw), fz = Math.cos(e.breathYaw);
        for (let k = 0; k < 3; k++) { const s = rnd.range(2, 12); FX.spawn(e.x + fx * 2.5, 2.2, e.z + fz * 2.5, fx * 14 + rnd.range(-2, 2), rnd.range(-1.5, 0.5), fz * 14 + rnd.range(-2, 2), rnd() < 0.5 ? 0xff7020 : 0xffc040, 0.7, 0.9, { grow: 2, drag: 1 }); }
        e.btick = (e.btick || 0) - dt;
        if (e.btick <= 0) { e.btick = 0.2; const z = { x: e.x + fx * 1.5, z: e.z + fz * 1.5, r: 1.8, shape: 'line', len: 11, yaw: e.breathYaw }; for (const p of ENTS) if (p.team === 0 && alive(p) && !p.summon && inZone(z, p)) enemyHit(e, p, { dmg: e.atk * 0.35, elem: 'fire', sure: true, status: { type: 'burn', dur: 3, v: e.atk * 0.08, chance: 0.4 } }); }
        if (e.st > 2.4) { e.breath = false; e.mode = 'ground'; e.timer = 1.4; }
        break;
      }
      case 'charge': {
        if (e.st < 0.9) break;
        if (e.tele) { FX.kill(e.tele); e.tele = null; }
        const sp = 15 * dt, ox = e.x, oz = e.z;
        moveCircle(e, Math.sin(e.chargeYaw) * sp, Math.cos(e.chargeYaw) * sp, e.r); e.moving = true;
        for (const p of foesInRadius(1, e.x, e.z, e.r + 1)) if (!e.hitSet.has(p) && !p.summon) { e.hitSet.add(p); enemyHit(e, p, { dmg: e.atk * 1.4, kb: 9 }); }
        if (Math.hypot(e.x - ox, e.z - oz) < sp * 0.3 || e.st > 2.2) { CAM.shake = 0.7; AUDIO.sfx('explode', e.x, e.z, 0.6); e.mode = 'ground'; e.timer = 1.6; }
        break;
      }
      case 'fireballs': {
        if (e.st > 0.4 && !e.fbDone) { e.fbDone = true; e.breath = true; for (let k = -2; k <= 2; k++) bossShot(e, tgt, { spread: k * 0.22, speed: 11, mult: 0.8, elem: 'fire', y: 2.4, off: 2.6, onHit: null }); AUDIO.sfx('fire', e.x, e.z); }
        if (e.st > 1.2) { e.fbDone = false; e.breath = false; e.mode = 'ground'; e.timer = 1.2; }
        break;
      }
      case 'takeoff': {
        e.flyH = Math.min(7, e.st * 4); e.untargetable = e.flyH > 3;
        if (e.st > 2) { e.mode = 'air'; e.st = 0; e.volleys = 0; }
        break;
      }
      case 'air': {
        e.flyH = 7; e.untargetable = true;
        bossDash(e, e.cx + Math.cos(e.t * 0.6) * 7, e.cz + Math.sin(e.t * 0.6) * 7, 6, dt);
        e.timer -= dt;
        if (e.timer <= 0) {
          e.timer = 0.75; e.volleys++;
          for (const p of ENTS) if (p.team === 0 && alive(p) && !p.summon) {
            const x = p.x + rnd.range(-1, 1), z = p.z + rnd.range(-1, 1);
            bossZone(e, { x, z, r: 2.2, delay: 1.1, mult: 1.0, elem: 'fire', fx: (q) => { FX.beam(e.x, 7, e.z, q.x, 0, q.z, 0xff7020, 0.6, 0.15); FX.explode(q.x, q.z, 2.2, 0xff7020); AUDIO.sfx('explode', q.x, q.z, 0.5); } });
          }
        }
        if (e.volleys >= 9) { e.mode = 'land'; e.st = 0; e.landAt = { x: tgt.x, z: tgt.z }; bossZone(e, { x: tgt.x, z: tgt.z, r: 5, delay: 1.6, mult: 1.6, kb: 10, fx: (q) => { FX.explode(q.x, q.z, 5, 0xd0c080); CAM.shake = 1; AUDIO.sfx('explode', q.x, q.z); } }); }
        break;
      }
      case 'land': {
        bossDash(e, e.landAt.x, e.landAt.z, 10, dt);
        e.flyH = Math.max(0, 7 - e.st * 4.5);
        if (e.st > 1.6) { e.flyH = 0; e.untargetable = false; e.mode = 'ground'; e.timer = 2; }
        break;
      }
    }
  },
  maw(e, dt) {
    const tgt = bossTarget(e); if (!tgt) return;
    const hpK = e.hp / e.maxHp, rage = hpK < 0.5 ? 1.4 : 1;
    e.timer -= dt * rage;
    const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz);
    switch (e.mode) {
      case 'surface': {
        e.headY = lerp(e.headY ?? -3, 2.6 + Math.sin(e.t * 2) * 0.3, 1 - Math.exp(-dt * 6)); e.burrowY = 0; e.untargetable = false; e.burrowed = false;
        e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 2.5 * dt);
        e.atkT = (e.atkT ?? 1.2) - dt * rage;
        if (e.atkT <= 0) {
          const pick = rnd.pick(d < 5 ? ['slam', 'spit', 'slam'] : ['spit', 'spit', 'grubs']);
          if (pick === 'spit') { e.mouthOpen = true; const n = hpK < 0.5 ? 7 : 5; for (let k = 0; k < n; k++) GAME.later(0.2 + k * 0.08, () => { if (!e.dead && alive(tgt)) bossShot(e, tgt, { spread: (k - (n - 1) / 2) * 0.16, speed: 10, mult: 0.75, color: 0xa0ff40, kind: 'magma', y: 2.5, off: 1.2, status: null }); }); GAME.later(0.8, () => { e.mouthOpen = false; }); AUDIO.sfx('fire', e.x, e.z, 0.7); e.atkT = 2.2; }
          if (pick === 'slam') { bossZone(e, { x: e.x, z: e.z, r: 5.5, delay: 1.0, mult: 1.4, kb: 9, fx: (z) => { FX.explode(z.x, z.z, 5.5, 0xffa060); CAM.shake = 0.8; AUDIO.sfx('explode', z.x, z.z); } }); e.atkT = 2.4; }
          if (pick === 'grubs') { for (let k = 0; k < 2; k++) { const a = rnd() * TAU, x = e.x + Math.cos(a) * 3, z = e.z + Math.sin(a) * 3; if (!solidAt(x, z)) { const m = spawnEnemy('cindergrub', x, z, { lvl: e.lvl - 2, teleIn: true, summoner: e }); m.aggro = tgt; m.noDrop = true; m.xp = Math.round(m.xp * 0.3); } } AUDIO.sfx('roar', e.x, e.z, 0.6); e.atkT = 2; }
        }
        if (e.timer <= 0) { e.mode = 'dive'; e.st = 0; AUDIO.sfx('roar', e.x, e.z, 0.7); }
        break;
      }
      case 'dive': {
        e.headY = 2.6 - e.st * 6; e.mouthOpen = false;
        if (e.st > 0.9) { e.mode = 'burrow'; e.st = 0; e.untargetable = true; e.burrowed = true; e.headY = -3; e.timer = rnd.range(1.6, 2.6) / rage; }
        break;
      }
      case 'burrow': {
        // a dust trail moves under the floor toward the target
        bossDash(e, tgt.x, tgt.z, 7 * rage, dt);
        if (Math.random() < 0.7) FX.burst(e.x, 0.1, e.z, 0x8a6a50, 2, 2, 0.6, 0.6, { flat: true, up: 2, grav: 6 });
        if (e.timer <= 0) { e.mode = 'emerge'; e.st = 0; e.emAt = { x: e.x, z: e.z }; bossZone(e, { x: e.x, z: e.z, r: 3.6, delay: 1.0 / rage, mult: 1.6, kb: 10, fx: (z) => { FX.explode(z.x, z.z, 3.6, 0xffa060); FX.burst(z.x, 1, z.z, 0x8a6a50, 30, 6, 1, 0.6, { up: 6, grav: 10 }); CAM.shake = 1; AUDIO.sfx('explode', z.x, z.z); AUDIO.sfx('roar', z.x, z.z); } }); }
        break;
      }
      case 'emerge': {
        if (e.st > 1.0 / rage) { e.mode = 'surface'; e.st = 0; e.timer = rnd.range(5, 7); e.atkT = 1.2; e.headY = 0; }
        break;
      }
    }
  },
  custodian(e, dt) {
    const tgt = bossTarget(e); if (!tgt) return;
    const hpK = e.hp / e.maxHp;
    e.lookYaw = angTo(e.lookYaw ?? 0, Math.atan2(tgt.x - e.x, tgt.z - e.z), 2 * dt);
    e.pods = e.pods.filter((p) => !p.dead);
    // pods fire lasers on their own
    for (const p of e.pods) {
      p.cd -= dt; faceTo(p, tgt.x, tgt.z, 4, dt);
      if (p.cd <= 0 && los(p.x, p.z, tgt.x, tgt.z)) { p.cd = rnd.range(1.6, 2.6); for (let k = 0; k < 3; k++) GAME.later(k * 0.12, () => { if (!p.dead && alive(tgt)) bossShot(p, tgt, { speed: 16, mult: 0.7, color: 0xff3040, kind: 'laser', y: 1.4, off: 1, elem: 'bolt' }); }); AUDIO.sfx('laser', p.x, p.z, 0.5); }
      p.model.position.set(p.x, 0, p.z); p.model.rotation.y = p.yaw;
    }
    if (e.mode === 'shield' && !e.pods.length) { e.mode = 'exposed'; e.st = 0; e.bossShield = false; HUD.toast('The Custodian\'s shield is down!', '#60e0ff'); AUDIO.sfx('open'); }
    if (e.mode === 'exposed' && e.st > 12 && hpK > 0.4) { e.mode = 'shield'; e.bossShield = true; spawnPods(e); AUDIO.sfx('door'); HUD.toast('Turret pods redeployed.', '#ff6060'); }
    if (hpK <= 0.4 && e.mode !== 'hunt') { e.mode = 'hunt'; e.bossShield = false; e.static = false; for (const p of e.pods) killActor(p, null); e.pods = []; HUD.toast('CUSTODIAN: CONTAINMENT PROTOCOL OVERRIDDEN', '#ff4040'); AUDIO.sfx('roar', e.x, e.z); }
    e.timer -= dt * (e.mode === 'hunt' ? 1.3 : 1);
    if (e.mode === 'hunt') { const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz); if (d > 5) bossDash(e, tgt.x, tgt.z, 2.2, dt); }
    if (e.timer <= 0) {
      const pick = rnd.pick(e.mode === 'hunt' ? ['sweep', 'missiles', 'floor', 'drones', 'missiles'] : ['sweep', 'floor', 'drones', 'sweep']);
      e.timer = pick === 'sweep' ? 4.2 : 3.2;
      if (pick === 'sweep') {
        // a laser that sweeps a full turn, telegraphed first
        const y0 = e.lookYaw;
        e.tele = FX.tele(e.x, e.z, 0.6, 1.0, 0xff3040, 'line', 16, y0);
        GAME.later(1.0, () => { if (e.dead) return; FX.kill(e.tele); e.tele = null; e.sweepL = { yaw: y0, t: 0, dir: rnd() < 0.5 ? 1 : -1 }; AUDIO.sfx('laser', e.x, e.z); });
      }
      if (pick === 'floor') for (let k = 0; k < 6; k++) { const a = rnd() * TAU, r = rnd.range(2, 12), x = e.cx + Math.cos(a) * r, z = e.cz + Math.sin(a) * r; bossZone(e, { x, z, r: 2.4, delay: 1.2, mult: 0.9, elem: 'bolt', status: { type: 'shock', dur: 1.5, chance: 0.3 }, color: 0x40e0ff, fx: (q) => { FX.bolt(q.x, 6, q.z, q.x, 0, q.z, 0x80f0ff); FX.ring(q.x, q.z, 0x40e0ff, 0.5, 2.4, 0.3); AUDIO.sfx('zap', q.x, q.z, 0.5); } }); }
      if (pick === 'drones') for (let k = 0; k < 2; k++) { const a = rnd() * TAU, x = e.x + Math.cos(a) * 4, z = e.z + Math.sin(a) * 4; if (!solidAt(x, z)) { const m = spawnEnemy('gundrone', x, z, { lvl: e.lvl - 2, teleIn: true, summoner: e }); m.aggro = tgt; m.noDrop = true; m.xp = Math.round(m.xp * 0.3); } }
      if (pick === 'missiles') for (let k = 0; k < 8; k++) GAME.later(k * 0.1, () => { if (e.dead) return; const yy = k / 8 * TAU; shootProj(e, { x: e.x, z: e.z, y: 3.5, dx: Math.sin(yy), dz: Math.cos(yy), speed: 7, life: 4, r: 0.45, team: 1, color: 0xff6040, kind: 'tempest', homing: 1.6, target: tgt, payload: { dmg: e.atk * 0.6, elem: 'fire' } }); });
    }
    if (e.sweepL) {
      const s = e.sweepL; s.t += dt; s.yaw += s.dir * dt * 1.5; e.lookYaw = s.yaw;
      let ex = e.x, ez = e.z; for (let k = 0; k < 18; k += 0.5) { const x = e.x + Math.sin(s.yaw) * k, z = e.z + Math.cos(s.yaw) * k; if (solidAt(x, z)) break; ex = x; ez = z; }
      FX.beam(e.x, 3, e.z, ex, 0.6, ez, 0xff3040, 0.45, 0.06);
      s.tick = (s.tick || 0) - dt;
      if (s.tick <= 0) { s.tick = 0.12; const z = { x: e.x, z: e.z, r: 0.7, shape: 'line', len: Math.hypot(ex - e.x, ez - e.z), yaw: s.yaw }; for (const p of ENTS) if (p.team === 0 && alive(p) && !p.summon && inZone(z, p)) enemyHit(e, p, { dmg: e.atk * 0.45, elem: 'bolt', sure: true }); }
      if (s.t > TAU / 1.5) e.sweepL = null;
    }
  },
  sleeper(e, dt) {
    const tgt = bossTarget(e); if (!tgt) return;
    const hpK = e.hp / e.maxHp;
    if (e.phase === 1 && hpK < 0.55) { e.phase = 2; e.mode = 'transform'; e.st = 0; e.untargetable = true; HUD.toast('Kharzael\'s true form awakens!', '#c060ff'); AUDIO.sfx('roar', e.x, e.z); CAM.shake = 1; FX.pillar(e.x, e.z, 4, 14, 0xc060ff, 2); }
    const rage = hpK < 0.2 ? 1.4 : 1;
    const dx = tgt.x - e.x, dz = tgt.z - e.z, d = Math.hypot(dx, dz);
    e.timer -= dt * rage;
    if (e.mode === 'transform') { if (e.st > 2.5) { e.mode = null; e.untargetable = false; e.timer = 1; bossDash(e, e.cx, e.cz, 100, 1); e.static = true; } return; }
    if (e.phase === 1) {
      if (e.swing) { e.swingK = Math.min(1, (e.swingK || 0) + dt * 2.2); if (e.swingK >= 1) e.swing = false; }
      if (d > 4 && !e.swing) bossDash(e, tgt.x, tgt.z, 2.6, dt); else e.yaw = angTo(e.yaw, Math.atan2(dx, dz), 3 * dt);
      if (e.timer <= 0) {
        const pick = rnd.pick(d < 6 ? ['scythe', 'scythe', 'orbs', 'blink'] : ['orbs', 'blink', 'summon', 'rain']);
        e.timer = 2.6;
        if (pick === 'scythe') { const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw); bossZone(e, { x: e.x + fx * 3, z: e.z + fz * 3, r: 4, delay: 0.85, mult: 1.4, kb: 8, elem: 'dark', fx: (q) => { e.swing = true; e.swingK = 0; FX.slash(e.x, e.z, e.yaw, 2.4, 6, 0xc060ff, 2); AUDIO.sfx('heavy', e.x, e.z); } }); }
        if (pick === 'orbs') { for (let k = 0; k < 5; k++) GAME.later(k * 0.2, () => { if (!e.dead) bossShot(e, tgt, { spread: (k - 2) * 0.3, speed: 6, mult: 0.8, color: 0xb050ff, kind: 'darkorb', homing: 1.2, target: tgt, y: 3.5, off: 1.5, life: 5, elem: 'dark' }); }); AUDIO.sfx('dark', e.x, e.z); }
        if (pick === 'blink') { FX.teleIn(e.x, e.z, 0xc060ff); const a = rnd() * TAU, nx = e.cx + Math.cos(a) * 8, nz = e.cz + Math.sin(a) * 8; e.x = nx; e.z = nz; FX.teleIn(e.x, e.z, 0xc060ff); shockwave(e, e.x, e.z, 8, 10, 0.9, 0xc060ff); AUDIO.sfx('tele', e.x, e.z); }
        if (pick === 'summon') { for (let k = 0; k < 3; k++) { const a = rnd() * TAU, x = e.x + Math.cos(a) * 3, z = e.z + Math.sin(a) * 3; if (!solidAt(x, z)) { const m = spawnEnemy('penitent', x, z, { lvl: e.lvl - 3, teleIn: true, summoner: e }); m.aggro = tgt; m.noDrop = true; m.xp = Math.round(m.xp * 0.3); } } }
        if (pick === 'rain') for (const p of ENTS) if (p.team === 0 && alive(p) && !p.summon) for (let k = 0; k < 2; k++) bossZone(e, { x: p.x + rnd.range(-2, 2), z: p.z + rnd.range(-2, 2), r: 2, delay: 1.2 + k * 0.4, mult: 0.9, elem: 'dark', color: 0xa040ff, fx: (q) => { FX.orb(q.x, 0.5, q.z, 1.4, 0xa040ff, 0.4, 2); AUDIO.sfx('dark', q.x, q.z, 0.4); } });
      }
    } else {
      // the heart: sweeping beams, shockwaves, rains of darkness, adds
      e.beamYaw = (e.beamYaw || 0) + dt * 0.55 * rage;
      if (e.beamsOn) {
        const n = hpK < 0.3 ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const yy = e.beamYaw + k * TAU / n; let ex = e.x, ez = e.z;
          for (let s = 0; s < 16; s += 0.5) { const x = e.x + Math.sin(yy) * s, z = e.z + Math.cos(yy) * s; if (solidAt(x, z)) break; ex = x; ez = z; }
          FX.beam(e.x, 2.6, e.z, ex, 0.5, ez, 0xc060ff, 0.5, 0.06);
          const z = { x: e.x, z: e.z, r: 0.7, shape: 'line', len: Math.hypot(ex - e.x, ez - e.z), yaw: yy };
          e.btick = e.btick || {}; e.btick[k] = (e.btick[k] || 0) - dt;
          if (e.btick[k] <= 0) { e.btick[k] = 0.15; for (const p of ENTS) if (p.team === 0 && alive(p) && !p.summon && inZone(z, p)) enemyHit(e, p, { dmg: e.atk * 0.4, elem: 'dark', sure: true }); }
        }
      }
      if (e.timer <= 0) {
        const pick = rnd.pick(['beams', 'wave', 'rain', 'eyes', 'wave', 'rain']);
        e.timer = 3;
        if (pick === 'beams' && !e.beamsOn && !e.beamsPending) {
          const n = hpK < 0.3 ? 3 : 2; e.beamsPending = true;
          for (let k = 0; k < n; k++) FX.tele(e.x, e.z, 0.7, 1, 0xc060ff, 'line', 16, e.beamYaw + 0.55 * rage + k * TAU / n);
          GAME.later(1, () => { e.beamsOn = true; e.beamsPending = false; }); GAME.later(7, () => { e.beamsOn = false; });
        }
        if (pick === 'wave') { shockwave(e, e.x, e.z, 7, 15, 1.0, 0xc060ff); GAME.later(1.2, () => !e.dead && shockwave(e, e.x, e.z, 7, 15, 1.0, 0xc060ff)); AUDIO.sfx('dark', e.x, e.z); }
        if (pick === 'rain') for (const p of ENTS) if (p.team === 0 && alive(p) && !p.summon) for (let k = 0; k < 3; k++) bossZone(e, { x: p.x + rnd.range(-2.5, 2.5), z: p.z + rnd.range(-2.5, 2.5), r: 2.2, delay: 1.1 + k * 0.35, mult: 1.0, elem: 'dark', color: 0xa040ff, fx: (q) => { FX.pillar(q.x, q.z, 1.8, 6, 0xa040ff, 0.5); AUDIO.sfx('dark', q.x, q.z, 0.4); } });
        if (pick === 'eyes' && ENTS.filter((o) => o.summoner === e && !o.dead).length < 4) for (let k = 0; k < 2; k++) { const a = rnd() * TAU, x = e.x + Math.cos(a) * 5, z = e.z + Math.sin(a) * 5; if (!solidAt(x, z)) { const m = spawnEnemy('eye', x, z, { lvl: e.lvl - 3, teleIn: true, summoner: e }); m.aggro = tgt; m.noDrop = true; m.xp = Math.round(m.xp * 0.3); } }
      }
    }
  },
};
