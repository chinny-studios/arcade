// ---- 09_combat: cannonballs, fire rafts, smoke screens, hit tests ----
// Balls fly ballistic arcs (GRAV) solved to land on a target point at sea level. Each frame a ball's path
// segment is tested against enemy hulls (box) and sail plans (box above deck); sails let the ball through.
const GRAV = 20;
const Combat = { balls: [], queue: [], rafts: [], clouds: [] };

Combat.reset = function () {
  Combat.balls.length = 0; Combat.queue.length = 0; Combat.rafts.length = 0; Combat.clouds.length = 0;
};
Combat.queueShot = function (ship, gun, tx, tz, ammo, delay) {
  Combat.queue.push({ ship, gun, tx, tz, ammo, t: delay });
};
function launchBall(s, gun, tx, tz, ammo) {
  const x = s.wx(gun[0], gun[2]), z = s.wz(gun[0], gun[2]), y = gun[1] + s.y;
  Combat.spawnBall(x, y, z, tx, tz, s.C.guns.vel, s.C.guns.dmg, ammo, s.team, s, s.isPlayer);
  if (!G.simming && s.model.root.visible) {
    const isSide = Math.abs(gun[0]) > 0.5, D = Math.hypot(tx - x, tz - z) || 1;
    const ux = isSide ? s.wx(Math.sign(gun[0]), 0) - s.x : (tx - x) / D, uz = isSide ? s.wz(Math.sign(gun[0]), 0) - s.z : (tz - z) / D;
    Fx.muzzle(x, y, z, ux, uz, 0.7 + s.C.guns.dmg / 200);
  }
}
// A ball from (x,y,z) on the low arc that passes through (tx, hT, tz): round shot is laid on the hull side,
// chain shot through the rigging, grapeshot across the decks (AIM_H).
const AIM_H = [2, 12, 3.5];
Combat.spawnBall = function (x, y, z, tx, tz, v, dmg, ammo, team, owner, mine) {
  const dx = tx - x, dz = tz - z, D = Math.max(1, Math.hypot(dx, dz)), dy = AIM_H[ammo] - y;
  const disc = v ** 4 - GRAV * (GRAV * D * D + 2 * dy * v * v);
  const th = disc > 0 ? Math.atan((v * v - Math.sqrt(disc)) / (GRAV * D)) : Math.PI / 4;
  const vh = v * Math.cos(th);
  Combat.balls.push({ x, y, z, vx: dx / D * vh, vy: v * Math.sin(th), vz: dz / D * vh, owner, team, ammo, dmg, t: 0, hitSails: null, mine });
};

// Segment p0->p1 against an axis-aligned box in ship-local space. Returns entry t in [0,1] or -1.
function segBox(ax, ay, az, bx, by, bz, x0, x1, y0, y1, z0, z1) {
  let t0 = 0, t1 = 1;
  const d = [bx - ax, by - ay, bz - az], o = [ax, ay, az], lo = [x0, y0, z0], hi = [x1, y1, z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return -1; continue; }
    let ta = (lo[i] - o[i]) / d[i], tb = (hi[i] - o[i]) / d[i]; if (ta > tb) { const q = ta; ta = tb; tb = q; }
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1;
  }
  return t0;
}

Combat.update = function (dt) {
  // ripple-fired guns
  for (let i = Combat.queue.length - 1; i >= 0; i--) {
    const q = Combat.queue[i]; q.t -= dt;
    if (q.t <= 0) {
      Combat.queue.splice(i, 1);
      if (q.ship.alive) {
        launchBall(q.ship, q.gun, q.tx, q.tz, q.ammo);
        if (!q.boomed && !G.simming && rand() < 0.35) Sfx.boom(q.ship.x, q.ship.z, 0.5 + q.ship.C.guns.dmg / 160);
      }
    }
  }
  const ships = G.ships;
  const balls = Combat.balls; let j = 0;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const ox = b.x, oy = b.y, oz = b.z;
    b.vy -= GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.t += dt;
    let dead = false;
    for (const s of ships) {
      if (!s.alive || s.team === b.team) continue;
      const C = s.C, rr = C.len * 0.6 + 30;
      if (Math.abs(s.x - b.x) > rr || Math.abs(s.z - b.z) > rr) continue;
      const alx = s.lx(ox, oz), alz = s.lz(ox, oz), blx = s.lx(b.x, b.z), blz = s.lz(b.x, b.z);
      const ay = oy - s.y, by = b.y - s.y;
      const hw = C.beam / 2 * 0.95;
      const th = segBox(alx, ay, alz, blx, by, blz, -hw, hw, -C.draft, C.fb + 0.6, -C.len / 2, C.len / 2 * 0.92);
      if (th >= 0) {
        const hy = lerp(ay, by, th), hz = lerp(alz, blz, th), hx = lerp(alx, blx, th);
        const u = (hz + C.len / 2) / C.len, w = s.model.halfW(clamp(u, 0, 1));
        if (Math.abs(hx) <= w + 0.6 || Math.abs(hx) < hw * 0.6) {
          s.hitHull(b.dmg, b.ammo, b.owner, hy, hz, hx);
          if (!G.simming) {
            const wx = lerp(ox, b.x, th), wz = lerp(oz, b.z, th);
            if (s.model.root.visible) Fx.splinters(wx, hy + s.y, wz, 0.7 + b.dmg / 130);
            if (b.mine) Sfx.hit(b.dmg); else if (s.isPlayer) Sfx.crack(wx, wz);
          }
          if (b.mine) Hud.hitMark();
          dead = true; break;
        }
      }
      if (b.hitSails !== s) {
        const ts = segBox(alx, ay, alz, blx, by, blz, -C.beam * 0.95, C.beam * 0.95, C.fb + 2, C.mastH * 0.95, -C.len * 0.38, C.len * 0.42);
        if (ts >= 0 && (s.tele !== 0 || rand() < 0.4)) { b.hitSails = s; s.hitSails(b.dmg, b.ammo, b.owner); if (b.mine) Hud.hitMark(true); }
      }
    }
    if (!dead) {
      // forts
      for (const f of Match.forts) {
        if (f.owner === b.team || f.owner < 0) continue;
        if (Math.abs(b.x - f.x) < 20 && Math.abs(b.z - f.z) < 20 && b.y < f.y + 8) { Match.hitFort(f, b.dmg * AMMO[b.ammo].hull, b.owner); dead = true; if (!G.simming) Fx.dust(b.x, b.y, b.z); break; }
      }
    }
    if (!dead) {
      const gh = World.h(b.x, b.z);
      if (b.y < gh && gh > -0.5) { dead = true; if (!G.simming) Fx.dust(b.x, gh + 0.5, b.z); }
      else if (b.y < 0.2) {
        dead = true;
        if (!G.simming) { Fx.splash(b.x, b.z, 0.6 + b.dmg / 160); Sfx.splash(b.x, b.z, 0.6); }
      } else if (b.t > 12) dead = true;
    }
    if (!dead) {
      balls[j++] = b;
      if (!G.simming) {
        Fx.emit('ball', b.x, b.y, b.z, 0, 0, 0, 0.5 + b.dmg / 300, 0, 0.07, 0.08, 0.07, 0.06, 1); // outlives one frame even at 20 fps: a short dark streak
        if (b.mine && rand() < 0.5) Fx.emit('smoke', b.x, b.y, b.z, 0, 0, 0, 0.6, 0.8, 0.8, 0.9, 0.9, 0.9, 0.25);
      }
    }
  }
  balls.length = j;
  updateRafts(dt);
  updateClouds(dt);
};

// ---- Fire rafts: three burning boats launched in a fan; they drift straight and explode against a hull ----
Combat.launchRafts = function (s, ax, az) {
  const RF = s.C.rafts; if (!RF || s.raftRl > 0 || !s.alive) return false;
  const a0 = Math.atan2(ax - s.x, az - s.z);
  const side = s.bearing(ax, az) > 0 ? -1 : 1; // launch from the side facing the target
  for (let i = 0; i < RF.n; i++) {
    const a = a0 + (i - (RF.n - 1) / 2) * 5 * DEG;
    const lx = side * (s.C.beam / 2 + 2), x = s.wx(lx, (i - 1) * 3), z = s.wz(lx, (i - 1) * 3);
    Combat.rafts.push({ x, z, a, v: RF.speed, owner: s, team: s.team, life: RF.range / RF.speed, dmg: RF.dmg, mesh: raftMesh() });
  }
  s.raftRl = RF.reload;
  if (!G.simming) Sfx.boom(s.x, s.z, 0.3);
  return true;
};
let RAFT_GEO = null;
function raftMesh() {
  if (!RAFT_GEO) RAFT_GEO = mergeParts([
    { geo: new THREE.BoxGeometry(2.6, 0.6, 5), color: [0.3, 0.2, 0.12] },
    { geo: new THREE.BoxGeometry(1.8, 1.2, 2.5), color: [0.18, 0.1, 0.05], m: M4(0, 0.8, 0) },
  ]);
  const m = new THREE.Mesh(RAFT_GEO, HULL_MAT); R.scene.add(m); return m;
}
function updateRafts(dt) {
  const rafts = Combat.rafts; let j = 0;
  for (const r of rafts) {
    r.life -= dt; r.x += Math.sin(r.a) * r.v * dt; r.z += Math.cos(r.a) * r.v * dt;
    let dead = r.life <= 0;
    if (!dead && World.h(r.x, r.z) > -0.8) dead = true;
    if (!dead) for (const s of G.ships) {
      if (!s.alive || s.team === r.team) continue;
      const lx = s.lx(r.x, r.z), lz = s.lz(r.x, r.z);
      if (Math.abs(lz) < s.C.len / 2 + 2 && Math.abs(lx) < s.C.beam / 2 + 2.5) {
        s.damage(r.dmg, r.owner, 'raft'); s.startFire(lz > s.C.len * 0.17 ? 0 : lz < -s.C.len * 0.17 ? 2 : 1, r.owner); s.startFire(1, r.owner);
        if (rand() < 0.4) s.startLeak(lz > 0 ? 0 : 1, r.owner);
        s.crew = Math.max(1, s.crew - 10);
        if (!G.simming) { Fx.explosion(r.x, 1.5, r.z, 1); Sfx.explosion(r.x, r.z); }
        if (r.owner.isPlayer) Hud.ribbon('Fire raft hit!', 'good');
        if (s.isPlayer) Hud.ribbon('Struck by a fire raft!', 'bad');
        dead = true; break;
      }
    }
    if (dead) { R.scene.remove(r.mesh); if (!G.simming && r.life > 0) Fx.splash(r.x, r.z, 1); continue; }
    r.mesh.position.set(r.x, waveH(r.x, r.z) + 0.2, r.z); r.mesh.rotation.y = r.a;
    if (!G.simming && rand() < 0.8) Fx.fire(r.x, 1.6, r.z, 1);
    rafts[j++] = r;
  }
  rafts.length = j;
}

// ---- Smoke screens ----
Combat.smokeAt = function (x, z, owner) {
  const c = { x, z, r: 58, life: 45, ml: 45, team: owner.team, puffs: [] };
  Combat.clouds.push(c);
  for (let i = 0; i < 7; i++) {
    const p = Fx.emit('smoke', x + rnd(-20, 20), rnd(4, 16), z + rnd(-20, 20), 0, 0.2, 0, rnd(26, 38), 1.2, 45, 0.82, 0.82, 0.8, 0.75, 0, 0, 1.0);
    if (p) c.puffs.push(p);
  }
};
function updateClouds(dt) {
  const cl = Combat.clouds; let j = 0;
  for (const c of cl) {
    c.life -= dt; if (c.life <= 0) continue;
    c.x += Fx.wind.x * dt * 0.6; c.z += Fx.wind.z * dt * 0.6;
    c.r = 58 * clamp(c.life / 6, 0.3, 1);
    cl[j++] = c;
  }
  cl.length = j;
}
// True if the straight line a->b passes through any smoke cloud (2D).
Combat.smokeBlocks = function (ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
  for (const c of Combat.clouds) {
    const t = clamp(((c.x - ax) * dx + (c.z - az) * dz) / L2, 0, 1);
    if (Math.hypot(ax + dx * t - c.x, az + dz * t - c.z) < c.r) return true;
  }
  return false;
};
Combat.inSmoke = function (x, z) { for (const c of Combat.clouds) if (Math.hypot(x - c.x, z - c.z) < c.r) return true; return false; };

// Lead: where to aim so a ball fired now meets a ship moving at its current course and speed.
function leadPoint(shooter, tgt) {
  const v = shooter.C.guns.vel; let px = tgt.x, pz = tgt.z;
  const vx = Math.sin(tgt.h) * tgt.v, vz = Math.cos(tgt.h) * tgt.v;
  for (let k = 0; k < 3; k++) {
    const D = Math.hypot(px - shooter.x, pz - shooter.z), th = 0.5 * Math.asin(clamp(GRAV * D / (v * v), -1, 1));
    const t = D / (v * Math.cos(th)) + 0.1;
    px = tgt.x + vx * t; pz = tgt.z + vz * t;
  }
  return [px, pz];
}
function raftLead(shooter, tgt) {
  const v = shooter.C.rafts.speed, vx = Math.sin(tgt.h) * tgt.v, vz = Math.cos(tgt.h) * tgt.v;
  let px = tgt.x, pz = tgt.z;
  for (let k = 0; k < 4; k++) { const t = Math.hypot(px - shooter.x, pz - shooter.z) / v; px = tgt.x + vx * t; pz = tgt.z + vz * t; }
  return [px, pz];
}
