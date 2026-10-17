// Ricky Rescue — the rig: arcade driving physics, collisions with buildings and traffic, lights and sirens,
// ride comfort for whoever is in the back, and an autopilot that follows a route (Marisol driving).

let RIG = null;
function createRig(type, x, z, yaw) {
  if (RIG && RIG.model) R.scene.remove(RIG.model.root);
  const C = G.career;
  const model = buildRig(type, C ? C.livery : 'classic', C ? C.lightPat : 'alt', C ? C.lightCol : 'redwhite');
  R.scene.add(model.root);
  const S = RIGS[type];
  RIG = {
    type, S, model, x, z, yaw, v: 0, vl: 0, yawRate: 0, steer: 0, active: true,
    siren: false, tone: 'wail', horn: false, damage: 0, accLat: 0, accLong: 0, rough: 0, bump: 0, pitch: 0, roll: 0, y: 0,
    len: S.len, wid: S.wid, wb: model.axF - model.axR, doors: 0, doorsT: 0, auto: null, lightT: 0, lastV: 0, crashes: 0, airT: 0,
    stock: fullStock(S.cap), stretcherIn: true, gearIn: { chair: true, board: true, scoop: true },
  };
  placeRigModel(0);
  return RIG;
}
// rebuild the model after a cosmetic change, keeping the physics state
function refreshRigModel() {
  if (!RIG) return;
  R.scene.remove(RIG.model.root);
  const C = G.career;
  RIG.model = buildRig(RIG.type, C.livery, C.lightPat, C.lightCol);
  R.scene.add(RIG.model.root); placeRigModel(0);
}

// inputs: { thr 0..1, brk 0..1, steer -1..1 (+1 = left, which turns the yaw up), hand }
function driveRig(dt, inp) {
  const A = RIG, S = A.S;
  if (inp.park) { A.v = 0; A.vl = 0; A.yawRate = 0; A.accLong = A.accLat = 0; A.rough = 0; placeRigModel(dt); return; }
  const vmax = S.speed * (A.damage > 70 ? 0.8 : 1);
  let acc = 0;
  if (inp.thr > 0) {
    if (A.v < -0.4) acc += 9 * inp.thr;
    else acc += S.accel * inp.thr * Math.max(0, 1 - Math.pow(Math.max(0, A.v) / vmax, 2));
  }
  if (inp.brk > 0) {
    if (A.v > 0.4) acc -= 10.5 * inp.brk;
    else acc -= 3.2 * inp.brk * (A.v > -7 ? 1 : 0);
  }
  if (inp.hand) acc -= Math.sign(A.v) * 6;
  // rolling resistance and drag
  acc -= A.v * 0.035 + Math.sign(A.v) * 0.25;
  if (!inp.thr && !inp.brk && Math.abs(A.v) < 0.3) { A.v = 0; acc = 0; }
  const v0 = A.v;
  A.v += acc * dt;
  if (Math.sign(v0) !== Math.sign(A.v) && v0 !== 0 && !(inp.brk && v0 <= 0.4) && !(inp.thr && v0 < 0)) A.v = 0;
  A.v = clamp(A.v, -7, vmax);
  // steering: less lock at speed, centring when released
  const lock = lerp(0.6, 0.1, clamp(Math.abs(A.v) / 28, 0, 1));
  A.steer = approachAng(A.steer, inp.steer * lock, dt * (inp.steer ? 2.2 : 3.2));
  let yr = A.v / A.wb * Math.tan(A.steer);
  const maxLat = 8.5 * S.grip * (inp.hand ? 0.6 : 1);
  if (Math.abs(yr * A.v) > maxLat) yr = Math.sign(yr) * maxLat / Math.max(1, Math.abs(A.v));
  A.yawRate = lerp(A.yawRate, yr, 1 - Math.exp(-dt * 9));
  A.yaw = angWrap(A.yaw + A.yawRate * dt);
  // a little slide when the rear lets go under the handbrake
  if (inp.hand && Math.abs(A.v) > 6) A.vl += -A.yawRate * A.v * 0.06 * dt * 10;
  A.vl *= Math.exp(-dt * 6);
  A.accLong = lerp(A.accLong, (A.v - A.lastV) / Math.max(dt, 1e-3), 1 - Math.exp(-dt * 8)); A.lastV = A.v;
  A.accLat = lerp(A.accLat, A.v * A.yawRate, 1 - Math.exp(-dt * 8));
  const fx = Math.sin(A.yaw), fz = Math.cos(A.yaw), rx = -fz, rz = fx;
  A.x += (fx * A.v + rx * A.vl) * dt;
  A.z += (fz * A.v + rz * A.vl) * dt;
  collideRig(dt);
  // curbs: a bump when the ground under the rig changes height
  const gy = groundY(A.x + fx * A.len * 0.3, A.z + fz * A.len * 0.3) * 0.5 + groundY(A.x - fx * A.len * 0.3, A.z - fz * A.len * 0.3) * 0.5;
  if (Math.abs(gy - A.y) > 0.05 && Math.abs(A.v) > 3) { A.bump = Math.min(1, A.bump + Math.abs(A.v) * 0.04); bus.emit('bump', Math.abs(A.v)); }
  A.y = lerp(A.y, gy, 1 - Math.exp(-dt * 12));
  A.bump = Math.max(0, A.bump - dt * 2);
  // ride comfort: hard braking, hard cornering and bumps hurt the patient and slow treatment in back
  const harsh = Math.max(0, Math.abs(A.accLat) - 3.8) * 0.6 + Math.max(0, -A.accLong - 5) * 0.5 + A.bump * 2;
  A.rough = lerp(A.rough, harsh, 1 - Math.exp(-dt * 3));
  placeRigModel(dt);
}
function approachAng(a, b, s) { return Math.abs(b - a) <= s ? b : a + Math.sign(b - a) * s; }

function rigCircles() {
  const A = RIG, fx = Math.sin(A.yaw), fz = Math.cos(A.yaw), r = A.wid / 2, n = A.len > 7 ? 4 : 3, out = [];
  for (let i = 0; i < n; i++) { const t = (i / (n - 1) - 0.5) * (A.len - A.wid); out.push({ x: A.x + fx * t, z: A.z + fz * t, r, t }); }
  return out;
}
function collideRig(dt) {
  const A = RIG;
  const fx = Math.sin(A.yaw), fz = Math.cos(A.yaw), rx = -fz, rz = fx;
  let hit = false, nx = 0, nz = 0, px = 0, pz = 0, torque = 0, depth = 0;
  for (const c of rigCircles()) {
    const res = collideCircle(c.x, c.z, c.r, 0.5);
    if (res.hit) {
      hit = true; px += res.x - c.x; pz += res.z - c.z;
      if (res.depth > depth) { depth = res.depth; nx = res.nx; nz = res.nz; }
      torque += c.t * (res.nx * rx + res.nz * rz) * 0.02;
    }
  }
  // traffic: two circles per car
  let carHit = null;
  for (const c of TRAFFIC.cars) {
    if (A.auto) break; // Marisol threads through; the player is in the back
    if (Math.abs(c.x - A.x) > 12 || Math.abs(c.z - A.z) > 12) continue;
    const cf = Math.sin(c.yaw), cz = Math.cos(c.yaw);
    for (const k of [-0.28, 0.28]) {
      const ox = c.x + cf * c.len * k, oz = c.z + cz * c.len * k, orr = c.wid / 2;
      for (const q of rigCircles()) {
        const dx = q.x - ox, dz = q.z - oz, d = Math.hypot(dx, dz), m = q.r + orr;
        if (d < m && d > 1e-4) {
          const kk = m - d; px += dx / d * kk * 0.7; pz += dz / d * kk * 0.7; hit = true;
          if (kk > depth) { depth = kk; nx = dx / d; nz = dz / d; }
          carHit = c;
          // shove the car a little
          c.x -= dx / d * kk * 0.3; c.z -= dz / d * kk * 0.3;
        }
      }
    }
  }
  if (!hit) return;
  A.x += px; A.z += pz;
  // velocity response
  let wx = fx * A.v + rx * A.vl, wz = fz * A.v + rz * A.vl;
  const vn = wx * nx + wz * nz;
  if (vn < 0) {
    wx -= nx * vn * 1.25; wz -= nz * vn * 1.25;
    const impact = -vn;
    A.v = wx * fx + wz * fz; A.vl = (wx * rx + wz * rz) * 0.3;
    A.v *= 0.82;
    A.yaw = angWrap(A.yaw + clamp(torque, -0.05, 0.05));
    if (impact > 2.2 && !A.auto) {
      A.damage = Math.min(100, A.damage + impact * 1.6);
      A.crashes++;
      CAM.shake = Math.min(1.5, impact * 0.12);
      bus.emit('crash', impact, carHit);
      if (carHit) { carHit.crashT = 4; carHit.v = 0; }
    }
  }
}

function placeRigModel(dt) {
  const A = RIG, M = A.model;
  M.root.position.set(A.x, A.y, A.z);
  M.root.rotation.y = A.yaw;
  A.roll = lerp(A.roll, clamp(-A.accLat * 0.011, -0.07, 0.07), 1 - Math.exp(-dt * 6));
  A.pitch = lerp(A.pitch, clamp(A.accLong * 0.006, -0.05, 0.04), 1 - Math.exp(-dt * 6));
  M.body.rotation.z = A.roll;
  M.body.rotation.x = A.pitch + Math.sin(performance.now() * 0.03) * A.bump * 0.02;
  for (const w of M.wheels) { w.spin.rotation.x += A.v * dt / M.wr; if (w.front) w.g.rotation.y = A.steer; }
  // rear doors
  const open = clamp(A.doors, 0, 1);
  M.doorL.rotation.y = -2.7 * open; M.doorR.rotation.y = 2.7 * open;
  M.mTail.color.setHex(A.v > 0.5 && A.accLong < -2 ? 0xff2020 : 0x701010);
}
function updateRigLights(dt) {
  const A = RIG; if (!A) return;
  A.lightT += dt;
  const st = animRigLights(A.model, A.siren, A.lightT, R.night);
  // two point lights on the bar, stronger at night
  const fx = Math.sin(A.yaw), fz = Math.cos(A.yaw), rx = -fz, rz = fx;
  const k = A.siren && R.env === 'city' ? (0.15 + R.night * 0.9) : 0;
  const lx = A.x + fx * (A.len / 2 - 1.3), lz = A.z + fz * (A.len / 2 - 1.3), ly = A.model.hgt + 0.5;
  R.eLights[0].position.set(lx - rx * 0.7, ly, lz - rz * 0.7); R.eLights[0].color.setHex(A.model.onA.getHex()); R.eLights[0].intensity = st.a * k;
  R.eLights[1].position.set(lx + rx * 0.7, ly, lz + rz * 0.7); R.eLights[1].color.setHex(A.model.onB.getHex()); R.eLights[1].intensity = st.b * k;
  // headlights after dark
  const hl = R.env === 'city' ? smooth(0.2, 0.7, R.night) : 0;
  R.head.intensity = hl * 2.2;
  R.head.position.set(A.x + fx * (A.len / 2), 1.1, A.z + fz * (A.len / 2));
  R.head.target.position.set(A.x + fx * (A.len / 2 + 22), 0, A.z + fz * (A.len / 2 + 22));
  R.head.target.updateMatrixWorld();
}

// ---------- autopilot ----------
// Follows ROUTE.pts with pure pursuit; respects lights only when the siren is off; stops at the end.
function autopilot(dt) {
  const A = RIG, route = A.auto;
  if (!route || !route.pts || route.pts.length < 2) return { park: true };
  const pts = route.pts;
  // advance the cursor to the nearest point ahead
  // advance the cursor only past segments the rig has actually passed (projection beyond the segment's end)
  let i = route.i || 0;
  while (i < pts.length - 1) {
    const ax = pts[i].x, az = pts[i].z, bx = pts[i + 1].x, bz = pts[i + 1].z, L2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
    if (((A.x - ax) * (bx - ax) + (A.z - az) * (bz - az)) / L2 > 1) i++; else break;
  }
  route.i = i;
  const look = 5 + Math.abs(A.v) * 0.55;
  // look-ahead measured along the path from where the rig projects onto the current segment
  let tgt = pts[pts.length - 1], acc = 0, t0 = 0;
  if (i < pts.length - 1) { const ax = pts[i].x, az = pts[i].z, bx = pts[i + 1].x, bz = pts[i + 1].z, L2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1; t0 = clamp(((A.x - ax) * (bx - ax) + (A.z - az) * (bz - az)) / L2, 0, 1); }
  for (let k = i; k < pts.length - 1; k++) {
    const seg = Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z), from = k === i ? t0 : 0, d = seg * (1 - from);
    if (acc + d >= look) { const u = from + (look - acc) / Math.max(seg, 1e-6); tgt = { x: lerp(pts[k].x, pts[k + 1].x, u), z: lerp(pts[k].z, pts[k + 1].z, u) }; break; }
    acc += d;
  }
  const fx = Math.sin(A.yaw), fz = Math.cos(A.yaw);
  // steer round wrecks and parked emergency vehicles at a scene
  let avoid = false;
  for (const b of SCENE.blockers) {
    const ox = b.x - A.x, oz = b.z - A.z, al = ox * fx + oz * fz, lat = -ox * fz + oz * fx;
    if (al > -2 && al < 24 && Math.abs(lat) < 3.4) { const sh = (3.6 - Math.abs(lat)) * (lat > 0 ? -1 : 1); tgt = { x: tgt.x - fz * sh, z: tgt.z + fx * sh }; avoid = true; }
  }
  const dx = tgt.x - A.x, dz = tgt.z - A.z;
  const ang = angWrap(Math.atan2(dx, dz) - A.yaw);
  const steerAng = Math.atan(2 * A.wb * Math.sin(ang) / Math.max(4, look));
  const lock = lerp(0.6, 0.1, clamp(Math.abs(A.v) / 28, 0, 1));
  const steer = clamp(steerAng / lock, -1, 1);
  // speed: slow for bends ahead and for the end of the route
  let vt = A.siren ? 17 : 12;
  // corners ahead: the sharper and nearer, the slower
  let ahead = 0;
  const angAt = (k) => Math.atan2(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z);
  for (let k = Math.max(0, i - 1); k < pts.length - 2 && ahead < 70; k++) {
    let turn = 0;
    for (let q = k; q < Math.min(pts.length - 2, k + 3); q++) turn += Math.abs(angWrap(angAt(q + 1) - angAt(q)));
    if (turn > 0.3) vt = Math.min(vt, lerp(14, 5.5, clamp((turn - 0.3) / 1.0, 0, 1)) + Math.max(0, ahead - 4) * 0.45);
    ahead += Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z);
  }
  let remain = 0; for (let k = i; k < pts.length - 1; k++) remain += Math.hypot(pts[k + 1].x - pts[k].x, pts[k + 1].z - pts[k].z);
  vt = Math.min(vt, Math.sqrt(Math.max(0, remain - 1.5) * 5));
  if (Math.abs(ang) > 1.4) vt = Math.min(vt, 3);
  if (avoid) vt = Math.min(vt, 5);
  // traffic in front; a car that stays in the way (usually one yielding to us) gets eased past
  A.ghostT = Math.max(0, (A.ghostT || 0) - dt);
  let blocked = false;
  if (A.ghostT <= 0) for (const c of TRAFFIC.cars) {
    const ox = c.x - A.x, oz = c.z - A.z, along = ox * fx + oz * fz, lat = Math.abs(-ox * fz + oz * fx);
    if (along > 0 && along < 30 && lat < (A.wid + c.wid) / 2 + 0.25) { const v = Math.max(0, (along - A.len / 2 - c.len / 2 - 2.5) * 0.9); if (v < 0.5) blocked = true; vt = Math.min(vt, v); }
  }
  A.blockT = blocked && Math.abs(A.v) < 0.5 ? (A.blockT || 0) + dt : 0;
  if (A.blockT > 1.5) { A.ghostT = 4; A.blockT = 0; }
  if (A.ghostT > 0) vt = Math.min(vt, 5);
  // red lights when running without the siren
  if (!A.siren) {
    const ne = nearestEdge(A.x, A.z, A.yaw);
    if (ne) {
      const [, E] = edgeEnds(ne.edge, ne.dir);
      const dN = (ne.edge.axis === 'x' ? (E.x - A.x) * ne.dir : (E.z - A.z) * ne.dir) - crossHalf(ne.edge, E) - 4 - A.len / 2;
      if (E.signal && dN > -1 && dN < 25) { const st = signalState(E, ne.edge.axis, TRAFFIC.t); if (st !== 'g') vt = Math.min(vt, Math.max(0, dN * 0.8)); }
    }
  } else vt = Math.min(vt, 15);
  route.remain = remain;
  if (remain < 2.5 && Math.abs(A.v) < 0.6) { route.done = true; return { park: true }; }
  const dv = vt - A.v;
  return { thr: dv > 0.3 ? clamp(dv * 0.35, 0, 1) : 0, brk: dv < -0.5 ? clamp(-dv * 0.25, 0, 1) : 0, steer };
}
