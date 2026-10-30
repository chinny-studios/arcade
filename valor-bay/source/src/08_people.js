// Valor Bay — the people of the city: a fixed pool of pedestrians recycled around the camera, walking the sidewalk
// graph, scattering from fights, cowering, cheering when a hero lands nearby. Also the shared body physics for
// anyone sent flying (civilians and crooks): ballistic flight, tumbling, bouncing off walls, lying where they land.

const PEOPLE = { list: [], dangers: [], cap: 34 };

function makeCivilian() {
  const look = civLook();
  const h = rr(1.6, 1.9);
  const M = buildRig(look, { h, bulk: rr(0.85, 1.15), legs: 0.5 });
  R.scene.add(M.root);
  const e = { kind: 'civ', M, h, r: 0.35, x: 0, y: 0, z: 0, yaw: 0, vx: 0, vy: 0, vz: 0, state: 'walk', t: 0, speed: rr(1.2, 1.7), ph: Math.random() * 6,
    from: null, to: null, think: Math.random(), lie: 0, spin: 0, roll: 0, onGround: true, air: false, cool: 0, look };
  return e;
}
function initPeople() { for (let i = 0; i < PEOPLE.cap; i++) PEOPLE.list.push(makeCivilian()); for (const e of PEOPLE.list) placeCivilian(e, 0, 0, 0, 200); }
// put a civilian somewhere on the sidewalks between r0 and r1 from (x, z), walking
function placeCivilian(e, x, z, r0, r1) {
  const s = sidewalkSpot(x, z, r0, r1);
  e.x = s.x; e.z = s.z; e.y = 0; e.from = s.n; e.to = s.m; e.state = 'walk'; e.lie = 0; e.air = false; e.vx = e.vy = e.vz = 0;
  e.root = null; e.victim = null; e.t = 0; e.M.root.visible = true;
}
// somebody (a fight, a blast, gunfire) is scaring people around a point
function alarm(x, z, r, kind = 'fight') { PEOPLE.dangers.push({ x, z, r, t: 1.2, kind }); }

function updatePeople(dt) {
  const cx = R.camera.position.x, cz = R.camera.position.z;
  for (let i = PEOPLE.dangers.length - 1; i >= 0; i--) { const d = PEOPLE.dangers[i]; d.t -= dt; if (d.t <= 0) PEOPLE.dangers.splice(i, 1); }
  for (const e of PEOPLE.list) {
    // recycle the far ones ahead of the camera
    const dc = dist2(e.x, e.z, cx, cz);
    if (dc > 190 * 190 && e.state !== 'victim') { placeCivilian(e, cx, cz, 70, 150); continue; }
    const far = dc > 120 * 120;
    if (far && e.state === 'walk' && G.frame % 3 !== 0) { e.M.root.visible = false; continue; }
    e.M.root.visible = true;
    updateCivilian(e, far ? dt * 3 : dt);
    placeRig(e, dt);
    if (!far) shadow(e.x, e.gy === undefined ? 0 : e.gy, e.z, 0.45 * (e.lie > 0.5 ? 1.6 : 1));
  }
}
function updateCivilian(e, dt) {
  e.t += dt; e.think -= dt; e.cool -= dt;
  if (e.air || e.state === 'down') { updateBody(e, dt); poseCivBody(e, dt); return; }
  // look around for danger now and then
  if (e.think <= 0) {
    e.think = rr(0.25, 0.45);
    if (e.state !== 'victim') {
      let near = null, nd = 1e9;
      for (const d of PEOPLE.dangers) { const k = dist(e.x, e.z, d.x, d.z); if (k < d.r && k < nd) { nd = k; near = d; } }
      if (near) {
        if (e.state !== 'flee' && e.state !== 'cower') { if (chance(0.3)) HUD.say(e, pick(LINES.civScared)); }
        if (nd < 6 && chance(0.5)) { e.state = 'cower'; e.t = 0; }
        else { e.state = 'flee'; e.t = 0; e.fx = e.x - near.x; e.fz = e.z - near.z; const l = Math.hypot(e.fx, e.fz) || 1; e.fx /= l; e.fz /= l; }
      } else if (P && (e.state === 'walk' || e.state === 'idle') && e.cool <= 0 && P.onGround && dist(e.x, e.z, P.x, P.z) < 9 && Math.abs(P.y - e.y) < 3 && chance(0.15)) {
        e.state = 'cheer'; e.t = 0; e.cool = 25;
        HUD.say(e, pick(LINES.civCheer).replace('{hero}', P.D.name));
      }
    }
  }
  const M = e.M;
  poseReset(M);
  switch (e.state) {
    case 'walk': {
      if (!e.to) { const s = sidewalkSpot(e.x, e.z, 0, 30); e.from = s.n; e.to = s.m; }
      const dx = e.to.x - e.x, dz = e.to.z - e.z, d = Math.hypot(dx, dz);
      if (d < 0.6) {
        // pick the next leg: mostly along the block, sometimes across the street
        const prev = e.from; e.from = e.to;
        const opts = e.from.nb.filter((n) => n !== prev), cr = e.from.cross;
        e.to = (cr.length && chance(0.25)) ? pick(cr) : opts.length ? pick(opts) : (prev || pick(e.from.nb));
        if (chance(0.08)) { e.state = 'idle'; e.t = 0; e.idleFor = rr(2, 6); }
        break;
      }
      // keep to the right of the path so people pass each other
      const ox = -dz / d * 0.6, oz = dx / d * 0.6;
      const tx = e.to.x + ox, tz = e.to.z + oz, l = Math.hypot(tx - e.x, tz - e.z) || 1;
      e.x += (tx - e.x) / l * e.speed * dt; e.z += (tz - e.z) / l * e.speed * dt;
      e.yaw = angTo(e.yaw, yawOf(tx - e.x, tz - e.z), 6 * dt);
      e.ph += dt * e.speed * 3.6;
      poseRun(M, e.ph, 0, 0);
      break;
    }
    case 'idle': poseIdle(M, e.t); if (e.t > e.idleFor) e.state = 'walk'; break;
    case 'flee': {
      const sp = 5.2;
      e.x += e.fx * sp * dt; e.z += e.fz * sp * dt;
      e.y = 0; e.onGround = true;
      const w = collide(e, e.r, e.h);
      if (w) { const t = e.fx * w.nz - e.fz * w.nx > 0 ? 1 : -1; e.fx = -w.nz * t; e.fz = w.nx * t; }
      if (!onLand(e.x, e.z)) { e.fx = -e.fx; e.fz = -e.fz; e.x += e.fx; e.z += e.fz; }
      e.yaw = angTo(e.yaw, yawOf(e.fx, e.fz), 10 * dt);
      e.ph += dt * sp * 2.2;
      poseRun(M, e.ph, 0.8, 0.1);
      setT(M, B.armL, 2.6, 0, -0.5); setT(M, B.armR, 2.6, 0, 0.5);
      if (e.t > 6) { e.state = 'walk'; e.to = null; }
      break;
    }
    case 'cower': poseCower(M, e.t); if (e.t > 5) { e.state = 'walk'; e.to = null; } break;
    case 'victim': poseCower(M, e.t); if (e.victim && e.victim.done) { e.state = 'thank'; e.t = 0; HUD.say(e, pick(LINES.civSaved)); } break;
    case 'thank': {
      if (P) e.yaw = angTo(e.yaw, yawOf(P.x - e.x, P.z - e.z), 5 * dt);
      poseCheer(M, e.t);
      if (e.t > 3) { e.state = 'walk'; e.to = null; e.victim = null; }
      break;
    }
    case 'cheer': {
      if (P) e.yaw = angTo(e.yaw, yawOf(P.x - e.x, P.z - e.z), 6 * dt);
      if (e.t < 0.6) poseIdle(M, e.t); else poseCheer(M, e.t);
      if (e.t > 3) { e.state = 'walk'; e.to = null; }
      break;
    }
  }
  e.gy = 0;
  poseApply(M, dt, 12);
}
function poseCivBody(e, dt) {
  const M = e.M; poseReset(M);
  if (e.air) poseTumble(M, e.t); else poseKO(M);
  poseApply(M, dt, 10);
  if (e.state === 'down' && !e.air && e.t > 2.5) { e.state = 'walk'; e.to = null; e.lie = 0; }
}

// ---------- bodies ----------
// send someone flying (vx, vy, vz in m/s)
function knock(e, vx, vy, vz) {
  e.air = true; e.onGround = false; e.vx = vx; e.vy = vy; e.vz = vz; e.t = 0;
  e.spin = rr(4, 9) * (chance(0.5) ? 1 : -1); e.roll = rr(-3, 3);
  if (e.kind === 'civ') e.state = 'down';
}
// ballistic flight with tumbling; on landing they lie flat (lie → 1)
function updateBody(e, dt) {
  if (e.air) {
    e.vy -= 24 * dt;
    e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
    e.pitch = (e.pitch || 0) + e.spin * dt;
    const w = collide(e, e.r, e.h * 0.5, 0);
    if (w) { const vn = e.vx * w.nx + e.vz * w.nz; if (vn < 0) { e.vx -= 1.6 * vn * w.nx; e.vz -= 1.6 * vn * w.nz; e.vx *= 0.5; e.vz *= 0.5; if (-vn > 10) { hitSpark(e.x, e.y + 1, e.z, true); debris(e.x, e.y + 1, e.z, 6, { speed: 4, up: 3, size: 0.25 }); AUDIO.sfx('thud', e.x, e.z); } } }
    const gy = supportY(e.x, e.z, e.y, 0.2, 0.4);
    if (e.y <= gy && e.vy < 0) {
      if (e.vy < -9 && Math.hypot(e.vx, e.vz) + -e.vy > 12) {
        // bounce once
        e.vy *= -0.3; e.vx *= 0.5; e.vz *= 0.5; e.y = gy; e.spin *= 0.4;
        burst('puff', e.x, gy + 0.2, e.z, 5, { speed: 2, life: 0.6, size: 1.2, size1: 2, col: 0xd8d0c0, alpha: 0.7 });
        if (Math.abs(e.vy) < 3) { e.air = false; e.vy = 0; }
      } else { e.air = false; e.vy = 0; e.y = gy; }
      if (!e.air) { e.onGround = true; e.t = 0; e.pitch = 0; e.lieYaw = e.yaw; }
    }
    if (e.y < CITY.WATER_Y - 1 && !onLand(e.x, e.z)) { splash(e.x, e.z); e.air = false; e.y = CITY.WATER_Y - 0.6; e.vx = e.vz = 0; e.inWater = true; }
    e.lie = 0;
  } else {
    e.vx = e.vz = 0;
    e.lie = Math.min(1, e.lie + dt * 6);
    if (!e.inWater) e.y = supportY(e.x, e.z, e.y + 0.3, 0.2);
  }
  e.gy = e.inWater ? CITY.WATER_Y : supportY(e.x, e.z, e.y + 0.2, 0.2);
}
function splash(x, z) {
  burst('puff', x, CITY.WATER_Y + 0.2, z, 14, { speed: 5, up: 6, life: 0.7, size: 0.8, size1: 0.3, col: 0xe8f4ff, grav: 14 });
  ring(x, CITY.WATER_Y + 0.05, z, { r0: 0.5, r1: 4, life: 0.8, col: 0xe8f4ff });
  AUDIO.sfx('splash', x, z);
}
// place a rig from its entity: standing, flying through the air tumbling, or lying flat
function placeRig(e, dt) {
  const M = e.M, h = e.h;
  if (e.air) {
    M.root.position.set(e.x, e.y + h * 0.4, e.z);
    M.root.rotation.set(e.pitch || 0, e.yaw, (e.roll || 0) * 0.3);
  } else if (e.lie > 0) {
    const k = e.lie;
    M.root.position.set(e.x, e.y + lerp(h * 0.55, 0.16 * h * 0.6, k), e.z);
    M.root.rotation.set(Math.PI / 2 * k, e.lieYaw === undefined ? e.yaw : e.lieYaw, 0);
  } else {
    M.root.position.set(e.x, e.y + h * 0.55, e.z);
    M.root.rotation.set(0, e.yaw, 0);
  }
}
