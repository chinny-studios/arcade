// Shot Heard — ballistics and damage: musket balls with drop and drag, buckshot, round shot that bounces and ploughs
// through fences, canister, grenades, powder kegs, explosions and melee.

const BALLS = [], ROUNDS = [], GRENADES = [], KEGS = [];
const G_ACC = 9.8;
// ---------- body hit test ----------
// segment AB against capsule CD (radius r): returns t on AB of the closest approach if within r, else -1
function segCapsule(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, r) {
  const ux = bx - ax, uy = by - ay, uz = bz - az, vx = dx - cx, vy = dy - cy, vz = dz - cz, wx = ax - cx, wy = ay - cy, wz = az - cz;
  const a = ux * ux + uy * uy + uz * uz, b = ux * vx + uy * vy + uz * vz, c = vx * vx + vy * vy + vz * vz, d = ux * wx + uy * wy + uz * wz, e = vx * wx + vy * wy + vz * wz;
  const D = a * c - b * b;
  let s, t;
  if (D < 1e-8) { s = 0; t = c > 1e-8 ? e / c : 0; }
  else { s = (b * e - c * d) / D; t = (a * e - b * d) / D; }
  s = clamp(s, 0, 1); t = clamp(t, 0, 1);
  // refine once
  t = c > 1e-8 ? clamp((b * s + e) / c, 0, 1) : 0;
  s = a > 1e-8 ? clamp((b * t - d) / a, 0, 1) : 0;
  const px = ax + ux * s - (cx + vx * t), py = ay + uy * s - (cy + vy * t), pz = az + uz * s - (cz + vz * t);
  if (px * px + py * py + pz * pz > r * r) return -1;
  // back off to the surface entry point
  const L = Math.sqrt(a);
  return clamp(s - r / Math.max(L, 0.01) * 0.5, 0, 1);
}
const HITB = { t: 1, s: null, part: '', h: null };
function hitBodies(ax, ay, az, bx, by, bz, owner, rad = 0) {
  HITB.t = 2; HITB.s = null; HITB.h = null;
  const x0 = Math.min(ax, bx) - 2, x1 = Math.max(ax, bx) + 2, z0 = Math.min(az, bz) - 2, z1 = Math.max(az, bz) + 2;
  forSoldiersIn(x0, z0, x1, z1, (s) => {
    if (s === owner || !s.alive || s.state !== 'up' || (owner && s.team === owner.team)) return;
    const B = s.hb;
    let t = segCapsule(ax, ay, az, bx, by, bz, B.hx, B.hy, B.hz, B.hx, B.hy, B.hz, 0.13 + rad);
    if (t >= 0 && t < HITB.t) { HITB.t = t; HITB.s = s; HITB.part = 'head'; }
    t = segCapsule(ax, ay, az, bx, by, bz, B.px, B.py, B.pz, B.nx, B.ny, B.nz, 0.2 + rad);
    if (t >= 0 && t < HITB.t) { HITB.t = t; HITB.s = s; HITB.part = 'body'; }
    t = segCapsule(ax, ay, az, bx, by, bz, B.fx, B.fy, B.fz, B.px, B.py - 0.1, B.pz, 0.16 + rad);
    if (t >= 0 && t < HITB.t) { HITB.t = t; HITB.s = s; HITB.part = 'legs'; }
  });
  for (const h of HORSES) {
    if (!h.alive) continue;
    if (Math.abs(h.pos.x - ax) > 40 && Math.abs(h.pos.x - bx) > 40) continue;
    const fx = Math.sin(h.yaw) * 0.85, fz = Math.cos(h.yaw) * 0.85;
    const t = segCapsule(ax, ay, az, bx, by, bz, h.pos.x - fx, h.pos.y + 1.3, h.pos.z - fz, h.pos.x + fx, h.pos.y + 1.4, h.pos.z + fz, 0.45 + rad);
    if (t >= 0 && t < HITB.t) {
      // a rider sits above the horse; let the soldier test win if he was hit too
      HITB.t = t; HITB.s = null; HITB.h = h; HITB.part = 'horse';
    }
  }
  return HITB.t <= 1;
}

// ---------- musket balls ----------
function fireBall(owner, ox, oy, oz, dx, dy, dz, w, spreadDeg) {
  const sp = spreadDeg * Math.PI / 180;
  // random cone around d
  // most balls fly near the line of aim; a few go wide
  const g = Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * 0.5;
  const a = Math.random() * TAU, r = Math.min(1, g) * Math.tan(sp);
  _v1.set(dx, dy, dz).normalize();
  _v2.set(0, 1, 0); if (Math.abs(_v1.y) > 0.95) _v2.set(1, 0, 0);
  _v3.crossVectors(_v1, _v2).normalize(); _v2.crossVectors(_v3, _v1);
  _v1.addScaledVector(_v3, Math.cos(a) * r).addScaledVector(_v2, Math.sin(a) * r).normalize();
  const v = w.vel * frand(0.97, 1.03);
  BALLS.push({ x: ox, y: oy, z: oz, vx: _v1.x * v, vy: _v1.y * v, vz: _v1.z * v, owner, w, dmg: w.dmg, dist: 0, life: 0, whiz: false, buck: !!w.pellets });
}
function updateBalls(dt) {
  for (let i = BALLS.length - 1; i >= 0; i--) {
    const b = BALLS[i];
    b.life += dt;
    const k = Math.exp(-(b.buck ? 0.9 : 0.16) * dt);
    b.vx *= k; b.vz *= k; b.vy = b.vy * k - G_ACC * dt;
    const ax = b.x, ay = b.y, az = b.z, bx = ax + b.vx * dt, by = ay + b.vy * dt, bz = az + b.vz * dt;
    const L = Math.hypot(bx - ax, by - ay, bz - az);
    if (b.life > 3 || L < 0.01) { BALLS.splice(i, 1); continue; }
    const ux = (bx - ax) / L, uy = (by - ay) / L, uz = (bz - az) / L;
    let tHit = L, kind = null, nx = 0, ny = 1, nz = 0, col = null;
    const tt = rayTerrain(ax, ay, az, ux, uy, uz, L, 1.2);
    if (tt >= 0 && tt < tHit) { tHit = tt; kind = earthAt(ax + ux * tt, az + uz * tt) > 0.3 ? 'earth' : 'dirt'; normalAt(ax + ux * tt, az + uz * tt, _v4); nx = _v4.x; ny = _v4.y; nz = _v4.z; }
    const rc = rayCols(ax, ay, az, ux, uy, uz, tHit, CF_SHOT);
    if (rc) { tHit = rc.t; kind = rc.col.mat; nx = rc.nx; ny = rc.ny; nz = rc.nz; col = rc.col; }
    // water surface
    if (WATER.mesh && ay > TER.water && ay + uy * tHit < TER.water && uy < 0) {
      const tw = (TER.water - ay) / uy;
      if (tw < tHit && waterDepth(ax + ux * tw, az + uz * tw) > 0.05) { tHit = tw; kind = 'water'; col = null; }
    }
    if (hitBodies(ax, ay, az, ax + ux * tHit, ay + uy * tHit, az + uz * tHit, b.owner) && HITB.t * tHit < tHit) {
      const hx = ax + ux * tHit * HITB.t, hy = ay + uy * tHit * HITB.t, hz = az + uz * tHit * HITB.t;
      const fall = b.dist < b.w.range ? 1 : Math.max(b.buck ? 0.3 : 0.75, 1 - (b.dist - b.w.range) / (b.w.range * (b.buck ? 2 : 4)));
      if (HITB.s) {
        const mult = HITB.part === 'head' ? 2.2 : HITB.part === 'legs' ? 0.75 : 1;
        hurtSoldier(HITB.s, b.dmg * fall * mult, b.owner, b.w.name, HITB.part, ux, uz);
        fxImpact('flesh', hx, hy, hz, -ux, 0, -uz);
        sImpact('flesh', _v4.set(hx, hy, hz));
      } else if (HITB.h) { hurtHorse(HITB.h, b.dmg * fall * 0.7, b.owner); fxImpact('flesh', hx, hy, hz, -ux, 0, -uz); }
      BALLS.splice(i, 1);
      continue;
    }
    // whizz past the listener
    if (!b.whiz && b.owner !== PL.s) {
      const cx = camera.position.x - ax, cy = camera.position.y - ay, cz = camera.position.z - az;
      const proj = cx * ux + cy * uy + cz * uz;
      if (proj > 0 && proj < L) {
        const px = cx - ux * proj, py = cy - uy * proj, pz = cz - uz * proj, d = Math.hypot(px, py, pz);
        if (d < 3.5) { b.whiz = true; sWhiz(_v4.set(ax + ux * proj, ay + uy * proj, az + uz * proj)); if (PL.s && PL.s.alive) PL.suppress = Math.min(1, PL.suppress + 0.35); }
      }
    }
    for (const s of SOLDIERS) if (s.bot && s.alive && b.owner && s.team !== b.owner.team && Math.abs(s.pos.x - bx) < 6 && Math.abs(s.pos.z - bz) < 6) botShotAt(s, b.owner);
    if (kind) {
      const hx = ax + ux * tHit, hy = ay + uy * tHit, hz = az + uz * tHit;
      fxImpact(kind, hx, hy, hz, nx, ny, nz);
      if (Math.random() < (b.buck ? 0.25 : 1)) sImpact(kind, _v4.set(hx, hy, hz));
      if (col && col.piece) damagePiece(col.piece, col.piece.mat === 'rail' || col.piece.mat === 'hay' ? 9 : 3, ux, 0, uz);
      if (col && col.colours) hitColours(col.colours, b.owner);
      if (kind === 'water') fxSplash(hx, hz, 0.3);
      BALLS.splice(i, 1);
      continue;
    }
    b.x = bx; b.y = by; b.z = bz; b.dist += L;
  }
}

// ---------- round shot and canister ----------
function fireRound(owner, ox, oy, oz, dx, dy, dz, speed, team) {
  ROUNDS.push({ x: ox, y: oy, z: oz, vx: dx * speed, vy: dy * speed, vz: dz * speed, owner, team, life: 0, bounces: 0, whiz: false, hitShips: new Set() });
}
function fireCanister(owner, ox, oy, oz, dx, dy, dz) {
  const w = { name: 'Canister', vel: 210, dmg: 70, range: 60, pellets: 1 };
  for (let k = 0; k < 28; k++) fireBall(owner, ox, oy, oz, dx, dy, dz, w, 5.5);
}
function updateRounds(dt) {
  for (let i = ROUNDS.length - 1; i >= 0; i--) {
    const r = ROUNDS[i];
    r.life += dt;
    const steps = 3, h = dt / steps;
    let dead = false;
    for (let st = 0; st < steps && !dead; st++) {
      r.vy -= G_ACC * h;
      const ax = r.x, ay = r.y, az = r.z, bx = ax + r.vx * h, by = ay + r.vy * h, bz = az + r.vz * h;
      const L = Math.hypot(bx - ax, by - ay, bz - az), ux = (bx - ax) / L, uy = (by - ay) / L, uz = (bz - az) / L;
      // soldiers and horses in the path: a round shot takes off whatever it meets and keeps going
      for (let n = 0; n < 3; n++) {
        if (!hitBodies(ax, ay, az, bx, by, bz, null, 0.25)) break;
        if (HITB.s) { if (!r.owner || HITB.s.team !== r.team) hurtSoldier(HITB.s, 220, r.owner, 'Round shot', 'body', ux, uz); else break; }
        else if (HITB.h) { hurtHorse(HITB.h, 200, r.owner); break; }
        else break;
      }
      for (const sh of SHIPS) {
        if (!sh.alive || r.hitShips.has(sh) || (r.owner && sh.team === r.team && sh.crew === r.owner)) continue;
        if (Math.hypot(sh.pos.x - bx, sh.pos.z - bz) < 9 && by < TER.water + 4 && shipContains(sh, bx, bz)) { r.hitShips.add(sh); hurtShip(sh, 140, r.owner); fxImpact('wood', bx, by, bz, -ux, 0.4, -uz); sBreak(_v4.set(bx, by, bz), 'wood'); }
      }
      for (const c of CANNONS) if (c.alive && Math.hypot(c.pos.x - bx, c.pos.z - bz) < 1.4 && by < c.pos.y + 1.6 && c !== r.src) { hurtCannon(c, 120, r.owner); }
      const rc = rayCols(ax, ay, az, ux, uy, uz, L, CF_SHOT);
      if (rc) {
        const hx = ax + ux * rc.t, hy = ay + uy * rc.t, hz = az + uz * rc.t;
        fxImpact(rc.col.mat, hx, hy, hz, rc.nx, rc.ny, rc.nz);
        let broke = false;
        if (rc.col.piece) broke = damagePiece(rc.col.piece, 420, ux, 0.3, uz);
        else if (rc.col.mat === 'tree') fxImpact('wood', hx, hy, hz, -ux, 0.5, -uz);
        if (rc.col.colours) hitColours(rc.col.colours, r.owner, true);
        const thin = rc.col.mat === 'rail' || rc.col.mat === 'hay' || rc.col.mat === 'plank' || rc.col.mat === 'cloth';
        if (broke && thin) { r.vx *= 0.7; r.vy *= 0.7; r.vz *= 0.7; }
        else { blastPieces(hx, hy, hz, 1.2, 160); dead = true; break; }
      }
      const g = heightAt(bx, bz);
      if (WATER.mesh && by < TER.water && waterDepth(bx, bz) > 0.3) { fxSplash(bx, bz, 1.2); sImpact('water', _v4.set(bx, TER.water, bz)); dead = true; break; }
      if (by < g) {
        const sp = Math.hypot(r.vx, r.vy, r.vz), steep = -r.vy / sp;
        fxImpact('dirt', bx, g, bz, 0, 1, 0); for (let k = 0; k < 6; k++) emit(dirtPS, bx, g, bz, frand(-2, 2) + r.vx * 0.05, frand(4, 9), frand(-2, 2) + r.vz * 0.05, frand(0.3, 0.6), 0.8, frand(0.8, 1.6), 0.4, 0.33, 0.24, 0.9, 1, 9, 0);
        sImpact('dirt', _v4.set(bx, g, bz)); shakeAt(bx, g, bz, 0.35, 35);
        if (steep > 0.5 || sp < 25 || r.bounces > 4) { craterAt(bx, bz, 1.6, 0.45); dead = true; break; }
        craterAt(bx, bz, 1.0, 0.18);
        r.bounces++; r.y = g + 0.05; r.vy = -r.vy * 0.35; r.vx *= 0.62; r.vz *= 0.62;
        r.x = bx; r.z = bz;
        continue;
      }
      if (!r.whiz) {
        const d = camera.position.distanceTo(_v4.set(bx, by, bz));
        if (d < 12) { r.whiz = true; sWhiz(_v4, true); if (PL.s) PL.suppress = 1; }
      }
      r.x = bx; r.y = by; r.z = bz;
    }
    if (dead || r.life > 12 || Math.abs(r.x) > TER.ext || Math.abs(r.z) > TER.ext) ROUNDS.splice(i, 1);
  }
}

// ---------- grenades and powder kegs ----------
function throwGrenade(owner, ox, oy, oz, dx, dy, dz, power = 17) {
  GRENADES.push({ x: ox, y: oy, z: oz, vx: dx * power, vy: dy * power + 3, vz: dz * power, fuse: 3.0, owner, team: owner.team, rest: false });
  sDrill('prime', _v4.set(ox, oy, oz));
}
function placeKeg(owner, x, z) {
  const g = Math.max(heightAt(x, z), topAt(x, z, heightAt(x, z) - 0.2, heightAt(x, z) + 1.6));
  const m = new THREE.Mesh(weaponGeo('keg').geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.position.set(x, g + 0.18, z); m.castShadow = true;
  scene.add(m);
  KEGS.push({ x, y: g + 0.18, z, fuse: 5, owner, team: owner.team, mesh: m });
  sDrill('prime', m.position);
}
const _gm = [];
function updateGrenades(dt) {
  for (let i = GRENADES.length - 1; i >= 0; i--) {
    const g = GRENADES[i];
    g.fuse -= dt;
    if (!g.rest) {
      g.vy -= G_ACC * dt;
      const nx = g.x + g.vx * dt, ny = g.y + g.vy * dt, nz = g.z + g.vz * dt;
      const L = Math.hypot(nx - g.x, ny - g.y, nz - g.z);
      if (L > 0.001) {
        const rc = rayCols(g.x, g.y, g.z, (nx - g.x) / L, (ny - g.y) / L, (nz - g.z) / L, L + 0.1, CF_MOVE | CF_SHOT);
        if (rc) {
          const vn = g.vx * rc.nx + g.vy * rc.ny + g.vz * rc.nz;
          g.vx = (g.vx - 2 * vn * rc.nx) * 0.4; g.vy = (g.vy - 2 * vn * rc.ny) * 0.4; g.vz = (g.vz - 2 * vn * rc.nz) * 0.4;
          sImpact('wood', _v4.set(g.x, g.y, g.z));
        } else { g.x = nx; g.y = ny; g.z = nz; }
      }
      const gh = heightAt(g.x, g.z) + 0.06;
      if (g.y < gh) { g.y = gh; if (g.vy < -2) { g.vy *= -0.3; g.vx *= 0.5; g.vz *= 0.5; } else { g.vy = 0; g.vx *= 0.8; g.vz *= 0.8; if (Math.hypot(g.vx, g.vz) < 0.2) g.rest = true; } }
    }
    if (Math.random() < dt * 30) emit(glowPS, g.x, g.y + 0.08, g.z, frand(-0.5, 0.5), frand(0.5, 1.5), frand(-0.5, 0.5), 0.08, 0, 0.25, 1, 0.7, 0.3, 1, 1, 2);
    if (Math.random() < dt * 8) emit(smokePS, g.x, g.y + 0.1, g.z, 0, 0.6, 0, 0.12, 0.3, 1.5, 0.6, 0.6, 0.6, 0.4, 1, -0.2);
    if (g.fuse <= 0) { explode(g.x, g.y + 0.1, g.z, 6.5, 140, g.owner, 'Grenado'); GRENADES.splice(i, 1); }
  }
  for (let i = KEGS.length - 1; i >= 0; i--) {
    const k = KEGS[i];
    k.fuse -= dt;
    if (Math.random() < dt * 40) emit(glowPS, k.x + frand(-0.05, 0.05), k.y + 0.25, k.z, frand(-0.8, 0.8), frand(0.5, 2), frand(-0.8, 0.8), 0.08, 0, 0.3, 1, 0.75, 0.3, 1, 1, 3);
    if (k.fuse <= 0) {
      explode(k.x, k.y, k.z, 9, 320, k.owner, 'Powder keg', 3.2);
      scene.remove(k.mesh); k.mesh.geometry.dispose();
      KEGS.splice(i, 1);
    }
  }
}
// Burst: men in the open take the full blast, men behind cover much less; breaks structures nearby.
function explode(x, y, z, r, dmg, owner, how, structMult = 1.5) {
  fxExplosion(x, y, z, r / 2.2);
  sExplode(_v4.set(x, y, z), r > 7 ? 1.4 : 1);
  for (const s of SOLDIERS) {
    if (!s.alive || s.state === 'dead') continue;
    const d = Math.hypot(s.pos.x - x, s.pos.y + 1 - y, s.pos.z - z);
    if (d > r) continue;
    let k = 1 - d / r;
    if (!losClear(x, y + 0.4, z, s.pos.x, s.pos.y + 1.1, s.pos.z)) k *= 0.3;
    if (owner && s.team === owner.team && s !== owner) continue;
    hurtSoldier(s, dmg * k * k * 1.3 + (d < r * 0.3 ? dmg : 0), owner, how, 'blast', (s.pos.x - x) / (d || 1), (s.pos.z - z) / (d || 1));
  }
  for (const h of HORSES) if (h.alive) { const d = h.pos.distanceTo(_v4.set(x, y, z)); if (d < r) hurtHorse(h, dmg * (1 - d / r) * 1.5, owner); }
  for (const c of CANNONS) if (c.alive) { const d = c.pos.distanceTo(_v4.set(x, y, z)); if (d < r * 0.8) hurtCannon(c, dmg * structMult * (1 - d / r), owner); }
  for (const sh of SHIPS) if (sh.alive) { const d = Math.hypot(sh.pos.x - x, sh.pos.z - z); if (d < r + 5 && shipContains(sh, x, z, r * 0.5)) hurtShip(sh, dmg * structMult * 0.6, owner); }
  for (const c of COLOURS) if (c.alive && Math.hypot(c.x - x, c.z - z) < r * 0.6) hitColours(c, owner, true);
  blastPieces(x, y, z, r * 0.65, dmg * structMult);
  const g = heightAt(x, z);
  if (y - g < 1.2) craterAt(x, z, r * 0.32, r * 0.08);
  for (const s of SOLDIERS) if (s.bot && s.alive && Math.hypot(s.pos.x - x, s.pos.z - z) < 30 && owner && s.team !== owner.team) botShotAt(s, owner);
}

// ---------- melee ----------
// Strike the nearest enemy in a cone in front; returns the victim or null.
function meleeStrike(s, def, charging) {
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  let best = null, bd = 1e9;
  const reach = def.reach + (charging ? 0.4 : 0) + (s.mount && s.mount.type === 'horse' ? 0.6 : 0);
  for (const o of SOLDIERS) {
    if (!o.alive || o.team === s.team || o.state === 'dead') continue;
    const dx = o.pos.x - s.pos.x, dz = o.pos.z - s.pos.z, d = Math.hypot(dx, dz);
    if (d > reach + 0.35 || Math.abs(o.pos.y - s.pos.y) > (s.mount ? 2.4 : 1.6)) continue;
    const dot = (dx * fx + dz * fz) / (d || 1);
    if (dot < 0.55 && d > 0.8) continue;
    if (d < bd) { bd = d; best = o; }
  }
  let hitHorse = null;
  if (!best) for (const h of HORSES) {
    if (!h.alive || (h.rider && h.rider.team === s.team)) continue;
    const dx = h.pos.x - s.pos.x, dz = h.pos.z - s.pos.z, d = Math.hypot(dx, dz);
    if (d < reach + 0.8 && (dx * fx + dz * fz) / (d || 1) > 0.5) { hitHorse = h; break; }
  }
  for (const c of COLOURS) if (c.alive && c.team !== s.team && Math.hypot(c.x - s.pos.x, c.z - s.pos.z) < reach + 0.4) { hitColours(c, s, true); }
  const ex = s.pos.x + fx * 1.2, ez = s.pos.z + fz * 1.2;
  if (best) {
    const mult = charging ? 1.3 : 1, behind = (Math.sin(best.yaw) * fx + Math.cos(best.yaw) * fz) > 0.5 ? 1.4 : 1;
    hurtSoldier(best, def.dmg * mult * behind, s, def.name, best.state === 'down' ? 'finish' : 'melee', fx, fz);
    fxBlood(best.pos.x, best.pos.y + 1.2, best.pos.z);
    sMelee(_v4.set(ex, s.pos.y + 1.2, ez), true, false);
    return best;
  }
  if (hitHorse) { hurtHorse(hitHorse, def.dmg, s); sMelee(_v4.set(ex, s.pos.y + 1.2, ez), true, false); return null; }
  // strike a fence rail or gabion in front
  const rc = rayCols(s.pos.x, s.pos.y + 1.0, s.pos.z, fx, 0, fz, reach, CF_MOVE);
  if (rc && rc.col.piece) { damagePiece(rc.col.piece, rc.col.mat === 'rail' ? 30 : 8, fx, 0, fz); fxImpact(rc.col.mat, s.pos.x + fx * rc.t, s.pos.y + 1, s.pos.z + fz * rc.t, -fx, 0, -fz); sImpact(rc.col.mat, _v4.set(s.pos.x + fx * rc.t, s.pos.y + 1, s.pos.z + fz * rc.t)); }
  sMelee(_v4.set(ex, s.pos.y + 1.2, ez), false, false);
  return null;
}
function updateProjectiles(dt) { updateBalls(dt); updateRounds(dt); updateGrenades(dt); }
function clearProjectiles() {
  BALLS.length = 0; ROUNDS.length = 0; GRENADES.length = 0;
  for (const k of KEGS) { scene.remove(k.mesh); k.mesh.geometry.dispose(); }
  KEGS.length = 0;
}
