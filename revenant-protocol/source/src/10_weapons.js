// Revenant Protocol — firing, projectiles (bolts, grenades, mortar, missiles, mines), explosions and effects

const PROJ = [];
const FX = [];
const W = { cd: 0, altCd: 0, charging: false, aimT: 0 };
const PLANE_C = new THREE.PlaneGeometry(1, 1);
const boltGeo = new THREE.BoxGeometry(0.06, 0.06, 1);
const glowGeo = new THREE.BoxGeometry(0.16, 0.16, 1.1);
const boltMats = {};
function boltMat(color, glow) {
  const k = color + (glow ? 'g' : '');
  return boltMats[k] || (boltMats[k] = new THREE.MeshBasicMaterial({ color: glow ? color : 0xffffff, transparent: !!glow, opacity: glow ? 0.55 : 1, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !glow }));
}
function hasAmmo(w, alt) {
  const a = alt && w.alt && w.alt.ammo ? w.alt.ammo : w.ammo;
  const cost = alt && w.alt && w.alt.cost ? w.alt.cost : w.cost || 0;
  return !a || (P.ammo[a] || 0) >= cost;
}
function selectWeapon(id, quiet) {
  if (!P.weapons.has(id)) return false;
  const w = WEAPON[id];
  if (w.ammo && !hasAmmo(w) && !(w.alt && w.alt.ammo && hasAmmo(w, true))) { if (!quiet) { msg(w.name + ': NO AMMO'); sfx('empty', 0.4); } return false; }
  if (P.cur === id) return true;
  P.cur = id; VM.swapTo = id; VM.swap = 0; W.cd = Math.max(W.cd, 0.3); W.charging = false; VM.charge = 0;
  return true;
}
function cycleWeapon(dir) {
  const ids = WEAPONS.map((w) => w.id);
  let i = ids.indexOf(P.cur);
  for (let n = 0; n < ids.length; n++) { i = (i + dir + ids.length) % ids.length; if (selectWeapon(ids[i], true)) return; }
}
function autoSwitch() {
  // best weapon with ammo, preferring the everyday guns over explosives
  for (const id of ['carbine', 'repeater', 'fusion', 'cannon', 'pistol', 'concussion', 'fists']) if (selectWeapon(id, true)) return;
}

function updateWeapons(dt) {
  if (P.dead) return;
  for (const w of WEAPONS) if (take(w.key)) selectWeapon(w.id);
  if (mouse.wheel) { cycleWeapon(mouse.wheel > 0 ? 1 : -1); mouse.wheel = 0; }
  if (take('KeyQ')) cycleWeapon(-1);
  W.cd -= dt; W.altCd -= dt;
  if (VM.swapTo) return;
  const w = WEAPON[P.cur];
  const fire = mouse.b0 || VI.fire, alt = mouse.b2 || VI.alt;
  const rateK = P.boostW > 0 ? 0.5 : 1;
  if (w.kind === 'throw') {
    // hold to wind up, release to throw
    if ((fire || alt) && W.cd <= 0 && hasAmmo(w)) { W.charging = true; W.chAlt = alt && !fire; VM.charge = Math.min(1, VM.charge + dt * 1.2); }
    else if (W.charging) { W.charging = false; throwCharge(w, VM.charge, W.chAlt); VM.charge = 0; W.cd = w.rate * rateK; }
    return;
  }
  if ((fire || alt) && W.cd <= 0) {
    const useAlt = alt && !fire && w.alt;
    if (!hasAmmo(w, useAlt)) {
      sfx('empty', 0.4); W.cd = 0.4; autoSwitch(); return;
    }
    const spec = useAlt ? Object.assign({}, w, w.alt) : w;
    if (spec.ammo) P.ammo[spec.ammo] -= spec.cost || 0;
    W.cd = spec.rate * rateK;
    fireSpec(spec, useAlt);
    makeNoise(P.x, P.z, spec.kind === 'melee' ? 4 : 22);
  }
}

function aimDir() {
  const cp = R.camera.position, d = new THREE.Vector3();
  R.camera.getWorldDirection(d);
  if (SETTINGS.aim) {
    // vertical aim assist: lock pitch onto an enemy close to the crosshair horizontally
    let best = null, bs = 0.12;
    for (const e of ENEMY_LIST) {
      if (e.dead) continue;
      const ex = e.x - cp.x, ez = e.z - cp.z, ey = e.y + e.h * 0.55 - cp.y, hd = Math.hypot(ex, ez);
      if (hd > 40) continue;
      const ang = Math.abs(angNorm(Math.atan2(-ex, -ez) - P.yaw));
      if (ang < bs && traceTo(cp.x, cp.y, cp.z, e.x, e.y + e.h * 0.55, e.z)) { bs = ang; best = [ex, ey, ez]; }
    }
    if (best) { const l = Math.hypot(...best); const hd = Math.hypot(d.x, d.z); d.y = best[1] / l; const k = Math.sqrt(1 - d.y * d.y) / (hd || 1); d.x *= k; d.z *= k; }
  }
  return d;
}
function muzzle(dist) {
  // a point offset toward the weapon's barrel, in world space
  const cp = R.camera.position, yaw = P.yaw;
  return [cp.x + Math.cos(yaw) * 0.12 - Math.sin(yaw) * dist, cp.y - 0.12, cp.z - Math.sin(yaw) * 0.12 - Math.cos(yaw) * dist];
}
function fireSpec(w, alt) {
  const d = aimDir(), cp = R.camera.position;
  if (w.kind === 'melee') {
    VM.punch = 1; VM.fistSide ^= 1;
    const e = rayEnemies(cp.x, cp.y, cp.z, d.x, d.y, d.z, w.range);
    if (e && e.t < trace(cp.x, cp.y, cp.z, d.x, d.y, d.z, w.range)) { damageEnemy(e.e, w.dmg * (P.boostW > 0 ? 2 : 1), P); sfx('punch', 0.7); }
    else sfx('whiff', 0.5);
    return;
  }
  VM.recoil = 1; VM.flashT = 0.06;
  addLight(cp.x + d.x, cp.y, cp.z + d.z, 6, w.color || 0xffaa55, 0.8);
  if (w.kind === 'bolt') {
    const n = w.count || 1;
    sfx(w.id === 'pistol' ? 'pistol' : w.id === 'carbine' ? 'carbine' : w.id === 'repeater' ? 'repeater' : w.id === 'fusion' ? 'fusion' : 'cannon', 0.55);
    // bolts leave the muzzle but converge on whatever the crosshair points at
    const reach = Math.min(80, trace(cp.x, cp.y, cp.z, d.x, d.y, d.z, 80));
    const tgt = [cp.x + d.x * reach, cp.y + d.y * reach, cp.z + d.z * reach];
    for (let i = 0; i < n; i++) {
      const m = muzzle(0.4);
      const off = n > 1 ? (i - (n - 1) / 2) * (w.fan || 0.05) : 0;
      let dx = tgt[0] - m[0], dy = tgt[1] - m[1], dz = tgt[2] - m[2];
      const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      const sp = w.spread || 0;
      const yawOff = off + (Math.random() - 0.5) * sp * 2, pitOff = (Math.random() - 0.5) * sp * 2;
      const cs = Math.cos(yawOff), sn = Math.sin(yawOff);
      const rx = dx * cs + dz * sn, rz = -dx * sn + dz * cs;
      spawnProj({ kind: 'bolt', owner: P, x: m[0], y: m[1], z: m[2], vx: rx * w.speed, vy: (dy + pitOff) * w.speed, vz: rz * w.speed, dmg: w.dmg * (P.boostW > 0 ? 1.5 : 1), color: w.color, ttl: 3 });
    }
  } else if (w.kind === 'missile') {
    sfx('missile', 0.6);
    const m = muzzle(0.5);
    spawnProj({ kind: 'missile', owner: P, x: m[0], y: m[1], z: m[2], vx: d.x * w.speed, vy: d.y * w.speed, vz: d.z * w.speed, dmg: w.dmg, radius: w.radius, color: 0xffa040, ttl: 6 });
  } else if (w.kind === 'mortar') {
    sfx('mortar', 0.7);
    const m = muzzle(0.5);
    spawnProj({ kind: 'mortar', owner: P, x: m[0], y: m[1], z: m[2], vx: d.x * 17, vy: d.y * 17 + 4.5, vz: d.z * 17, dmg: w.dmg, radius: w.radius, grav: 1, color: 0xffb060, ttl: 8 });
  } else if (w.kind === 'mine') {
    VM.flashT = 0; VM.recoil = 0.5;
    const [fx, fz] = playerForward();
    let x = P.x + fx * 0.9, z = P.z + fz * 0.9;
    if (cellAt(x, z).solid) { x = P.x; z = P.z; }
    spawnProj({ kind: 'mine', owner: P, x, y: P.y + 0.6, z, vx: 0, vy: 0, vz: 0, grav: 1, dmg: w.dmg, radius: w.radius, arm: 1.6, timed: alt ? 3 : 0, ttl: 9999, color: 0xff3020 });
    sfx('beepmine');
    if (P.ammo.mines <= 0) autoSwitch();
  } else if (w.kind === 'hitscan') {
    sfx('concussion', 0.8); P.shake = Math.min(1, P.shake + 0.3);
    const tw = trace(cp.x, cp.y, cp.z, d.x, d.y, d.z, 60);
    const e = rayEnemies(cp.x, cp.y, cp.z, d.x, d.y, d.z, tw);
    const t = e ? e.t : tw;
    for (let s = 1.5; s < t; s += 1.8) spawnFx(cp.x + d.x * s, cp.y + d.y * s - 0.2, cp.z + d.z * s, 0.5 + s * 0.04, 1, 0.25, 0.7);
    if (e) damageEnemy(e.e, w.dmg, P);
    explode(cp.x + d.x * (t - 0.3), cp.y + d.y * (t - 0.3), cp.z + d.z * (t - 0.3), w.radius, w.dmg * 0.6, P, true);
  }
}
function throwCharge(w, k, impact) {
  if (!hasAmmo(w)) return;
  P.ammo[w.ammo] -= 1;
  const d = aimDir(), m = muzzle(0.4), sp = 8 + k * 14;
  sfx('throw', 0.6);
  spawnProj({ kind: 'thermal', owner: P, x: m[0], y: m[1] + 0.1, z: m[2], vx: d.x * sp + P.vx * 0.5, vy: d.y * sp + 3, vz: d.z * sp + P.vz * 0.5, grav: 1, dmg: w.dmg, radius: w.radius, fuse: impact ? 99 : 3, impact, ttl: 30 });
  makeNoise(P.x, P.z, 10);
  if (P.ammo.thermal <= 0) autoSwitch();
}

// Ray against enemy cylinders. Returns {e, t} nearest within max.
function rayEnemies(ox, oy, oz, dx, dy, dz, max, ignore) {
  let best = null;
  for (const e of ENEMY_LIST) {
    if (e.dead || e === ignore || e.submerged) continue;
    const t = rayCyl(ox, oy, oz, dx, dy, dz, e.x, e.z, e.r + 0.08, e.y, e.y + e.h);
    if (t !== null && t <= max && (!best || t < best.t)) best = { e, t };
  }
  return best;
}
function rayCyl(ox, oy, oz, dx, dy, dz, cx, cz, r, y0, y1) {
  const px = ox - cx, pz = oz - cz;
  const a = dx * dx + dz * dz, b = 2 * (px * dx + pz * dz), c = px * px + pz * pz - r * r;
  let t;
  if (a < 1e-8) { if (c > 0) return null; t = 0; }
  else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    t = (-b - sq) / (2 * a);
    if (t < 0) { t = (-b + sq) / (2 * a); if (t < 0) return null; t = 0; }
  }
  const y = oy + dy * t;
  if (y >= y0 && y <= y1) return t;
  // could still enter through the top or bottom cap
  if (dy !== 0) for (const cy of [y0, y1]) { const tc = (cy - oy) / dy; if (tc >= 0) { const x = px + dx * tc, z = pz + dz * tc; if (x * x + z * z <= r * r) return tc; } }
  return null;
}

// ---------- projectiles ----------
function spawnProj(p) {
  p.r = p.r || 0.1;
  if (p.kind === 'bolt' || p.kind === 'missile' || p.kind === 'pulse') {
    const g = new THREE.Group();
    const core = new THREE.Mesh(boltGeo, p.kind === 'bolt' ? boltMat(p.color, false) : boltMat(0x7a7d84, false)), glow = new THREE.Mesh(glowGeo, boltMat(p.color, true));
    if (p.kind === 'missile') { core.scale.set(1.6, 1.6, 0.5); glow.scale.set(0.9, 0.9, 0.25); glow.position.z = -0.35; }
    else if (p.kind !== 'bolt') { core.visible = false; glow.scale.set(2.4, 2.4, 0.5); }
    g.add(core, glow); g.scale.z = p.kind === 'bolt' ? 0.9 : 1;
    p.mesh = g;
  } else {
    const g = new THREE.Group();
    if (p.kind === 'thermal') GUNS.thermal(g); else if (p.kind === 'mine') GUNS.mine(g); else Sp(g, 0.1, 0x4a5a3a, 0, 0, 0);
    p.mesh = g; g.traverse((o) => { if (o.material && o.material.type === 'MeshLambertMaterial') o.material = new THREE.MeshBasicMaterial({ color: o.material.color.clone().multiplyScalar(0.7) }); });
  }
  R.scene.add(p.mesh);
  PROJ.push(p);
  return p;
}
function removeProj(i) { R.scene.remove(PROJ[i].mesh); PROJ.splice(i, 1); }
function updateProjectiles(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i];
    p.ttl -= dt;
    if (p.ttl <= 0) { if (p.radius) explode(p.x, p.y, p.z, p.radius, p.dmg, p.owner); removeProj(i); continue; }
    if (p.kind === 'missile' && p.homing && !P.dead) {
      // gentle homing toward the player
      const tx = P.x - p.x, ty = P.y + 1.1 - p.y, tz = P.z - p.z, tl = Math.hypot(tx, ty, tz), sp = Math.hypot(p.vx, p.vy, p.vz);
      p.vx = lerp(p.vx, (tx / tl) * sp, dt * 1.2); p.vy = lerp(p.vy, (ty / tl) * sp, dt * 1.2); p.vz = lerp(p.vz, (tz / tl) * sp, dt * 1.2);
    }
    if (p.grav) p.vy -= GRAV * 0.8 * dt;
    if (p.kind === 'mine') { updateMine(p, dt, i); continue; }
    if (p.kind === 'thermal') { p.fuse -= dt; if (p.fuse <= 0) { explode(p.x, p.y, p.z, p.radius, p.dmg, p.owner); removeProj(i); continue; } }
    const sp = Math.hypot(p.vx, p.vy, p.vz), step = sp * dt;
    if (step < 1e-5) { p.mesh.position.set(p.x, p.y, p.z); continue; }
    const dx = p.vx / sp, dy = p.vy / sp, dz = p.vz / sp;
    const tw = trace(p.x, p.y, p.z, dx, dy, dz, step);
    const wallHit = tw < step;
    // actors along the segment
    let hitE = null, ht = Infinity;
    if (p.owner === P) { const e = rayEnemies(p.x, p.y, p.z, dx, dy, dz, wallHit ? tw : step); if (e) { hitE = e.e; ht = e.t; } }
    else if (!P.dead) {
      const t = rayCyl(p.x, p.y, p.z, dx, dy, dz, P.x, P.z, P.r + 0.1, P.y, P.y + P.h);
      if (t !== null && t <= (wallHit ? tw : step)) { hitE = P; ht = t; }
    }
    if (hitE) {
      p.x += dx * ht; p.y += dy * ht; p.z += dz * ht;
      if (p.kind === 'thermal' && !p.impact) { p.vx *= -0.3; p.vz *= -0.3; continue; }
      if (p.radius) explode(p.x, p.y, p.z, p.radius, p.dmg, p.owner, false, hitE);
      else { if (hitE === P) hurtPlayer(p.dmg, p.owner); else damageEnemy(hitE, p.dmg, p.owner); spawnFx(p.x, p.y, p.z, 0.5, 1, 0.18, 1); }
      removeProj(i); continue;
    }
    if (wallHit) {
      const hx = p.x + dx * tw, hy = p.y + dy * tw, hz = p.z + dz * tw;
      if (p.kind === 'thermal' && !p.impact) {
        // bounce
        const nx = TR.nx, ny = TR.ny, nz = TR.nz, vn = p.vx * nx + p.vy * ny + p.vz * nz;
        p.vx = (p.vx - 2 * vn * nx) * 0.45; p.vy = (p.vy - 2 * vn * ny) * 0.45; p.vz = (p.vz - 2 * vn * nz) * 0.45;
        p.x = hx + nx * 0.05; p.y = hy + ny * 0.05; p.z = hz + nz * 0.05;
        if (Math.abs(vn) > 2) sfxAt('land', p.x, p.y, p.z, 0.4);
      } else {
        p.x = hx - dx * 0.05; p.y = hy - dy * 0.05; p.z = hz - dz * 0.05;
        if (p.radius) explode(p.x, p.y, p.z, p.radius, p.dmg, p.owner);
        else { spawnFx(p.x, p.y, p.z, 0.45, 1, 0.18, 1); if (Math.random() < 0.3) sfxAt('spark', p.x, p.y, p.z, 0.5); }
        removeProj(i); continue;
      }
    } else { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
    p.mesh.position.set(p.x, p.y, p.z);
    if (p.kind === 'bolt' || p.kind === 'missile' || p.kind === 'pulse') p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
    else p.mesh.rotation.x += dt * 8;
    if (p.color) addLight(p.x, p.y, p.z, p.kind === 'bolt' ? 3.2 : 5, p.color, p.kind === 'bolt' ? 0.7 : 1);
    if (p.kind === 'missile' && Math.random() < 0.5) spawnFx(p.x - p.vx * 0.03, p.y, p.z - p.vz * 0.03, 0.35, 0, 0.3, 0.6, 3);
  }
}
function updateMine(p, dt, i) {
  // fall to the floor, then wait
  const c = cellAt(p.x, p.z), fl = floorOf(c);
  p.y += p.vy * dt; if (p.y <= fl + 0.03) { p.y = fl + 0.03; p.vy = 0; }
  p.mesh.position.set(p.x, p.y, p.z);
  p.arm -= dt;
  if (p.timed) { p.timed -= dt; if (p.timed <= 0) { explode(p.x, p.y + 0.3, p.z, p.radius, p.dmg, p.owner); removeProj(i); } return; }
  if (p.arm > 0) return;
  if (Math.floor(p.arm * 2) !== Math.floor((p.arm + dt) * 2)) addLight(p.x, p.y + 0.2, p.z, 1.5, 0xff2010, 1);
  for (const e of ENEMY_LIST) {
    if (e.dead || e.def.fly) continue;
    if (Math.hypot(e.x - p.x, e.z - p.z) < 2.2 && Math.abs(e.y - p.y) < 1.5) { explode(p.x, p.y + 0.3, p.z, p.radius, p.dmg, p.owner); removeProj(i); return; }
  }
}

// Splash damage with line of sight; damage falls off toward the edge.
function explode(x, y, z, radius, dmg, owner, small, direct) {
  sfxAt(small ? 'smallboom' : 'explode', x, y, z, 1);
  spawnFx(x, y, z, radius * (small ? 0.6 : 0.9), 0, 0.6, 1);
  addFlash(x, y + 0.3, z, radius * 3, 0xffa040, 1.6, 0.5);
  const d = Math.hypot(P.x - x, P.y + 1 - y, P.z - z);
  if (d < radius * 4) P.shake = Math.min(1, P.shake + (1 - d / (radius * 4)) * 0.8);
  makeNoise(x, z, 30);
  const hitOne = (tx, ty, tz, h, fn, isDirect) => {
    const dist = Math.hypot(tx - x, ty + h * 0.5 - y, tz - z);
    if (dist > radius && !isDirect) return;
    if (!isDirect && !traceTo(x, y + 0.2, z, tx, ty + h * 0.5, tz)) return;
    fn(isDirect ? dmg : dmg * (1 - 0.6 * (dist / radius)));
  };
  for (const e of ENEMY_LIST) if (!e.dead) hitOne(e.x, e.y, e.z, e.h, (a) => damageEnemy(e, a, owner, true), e === direct);
  if (!P.dead) hitOne(P.x, P.y, P.z, P.h, (a) => hurtPlayer(a * (owner === P ? 0.7 : 1), owner, 'blast'), direct === P);
}

// ---------- effects ----------
function spawnFx(x, y, z, size, row, dur, bright, frames = 8) {
  const m = new THREE.Mesh(PLANE_C, spriteMat(SPR.fx.tex, 1));
  m.position.set(x, y, z); m.scale.setScalar(size * 2);
  sprRect(SPR.fx, 0, row, m.material.uniforms.uRect.value); m.quaternion.copy(R.camera.quaternion);
  R.scene.add(m);
  FX.push({ m, t: 0, dur, row, frames, bright });
}
const FLASHES = [];
function addFlash(x, y, z, r, color, k, dur) { FLASHES.push({ x, y, z, r, color, k, dur, t: 0 }); }
function updateFx(dt) {
  const q = R.camera.quaternion;
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i]; f.t += dt;
    const k = f.t / f.dur;
    if (k >= 1) { R.scene.remove(f.m); f.m.material.dispose(); FX.splice(i, 1); continue; }
    const fr = Math.min(f.frames - 1, Math.floor(k * f.frames));
    sprRect(SPR.fx, fr, f.row, f.m.material.uniforms.uRect.value);
    f.m.quaternion.copy(q);
  }
  for (let i = FLASHES.length - 1; i >= 0; i--) {
    const f = FLASHES[i]; f.t += dt;
    if (f.t >= f.dur) { FLASHES.splice(i, 1); continue; }
    addLight(f.x, f.y, f.z, f.r, f.color, f.k * (1 - f.t / f.dur));
  }
}
function clearProjectiles() {
  for (const p of PROJ) R.scene.remove(p.mesh); PROJ.length = 0;
  for (const f of FX) R.scene.remove(f.m); FX.length = 0; FLASHES.length = 0;
}
