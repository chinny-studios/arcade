// Copter City — the helicopter: two flight models (arcade holds altitude and levels itself; sim flies on collective,
// cyclic and pedals with torque), landing on roofs, pads and streets, collisions, damage, fuel, crashing, and the
// cameras that follow it.

const GRAV = 9.8;
const HELI = {
  type: 'sparrow', st: null, model: null, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, roll: 0, yawRate: 0,
  rpm: 0, engine: false, fuel: 0, hp: 100, landed: true, landT: 0, surf: 0, pad: null, coll: 0, equip: null,
  bucket: { water: 0, out: false, x: 0, y: 0, z: 0, vx: 0, vz: 0 }, ladder: { out: false, len: 0 }, spot: false, gas: 0,
  seats: [], siren: false, crashing: 0, crashed: false, hitT: 0, warnT: 0, roughT: 0, shadow: null, beam: null, gforce: 0, stall: 0,
};
const heliFwd = () => _v1.set(-Math.sin(HELI.yaw), 0, -Math.cos(HELI.yaw));
const speedH = () => Math.hypot(HELI.vx, HELI.vz);
const altAGL = () => HELI.y - HELI.surf;

function spawnHeli(type, x, y, z, yaw) {
  const H = HELI;
  if (H.model) R.scene.remove(H.model.group);
  H.type = type; H.st = heliStats(type, (G.career && G.career.ups[type]) || {});
  H.model = buildHeli(type); R.scene.add(H.model.group);
  Object.assign(H, { x, y, z, vx: 0, vy: 0, vz: 0, yaw: yaw || 0, pitch: 0, roll: 0, yawRate: 0, rpm: 0, engine: false, landed: true, crashing: 0, crashed: false, coll: 0, stall: 0 });
  if (H.fuel <= 0 || H.fuel > H.st.fuel) H.fuel = H.st.fuel;
  if (H.hp <= 0 || H.hp > H.st.hp) H.hp = H.st.hp;
  H.gas = Math.min(H.gas || H.st.gas, H.st.gas);
  H.bucket.water = 0; H.bucket.out = false; H.ladder.out = false; H.ladder.len = 0; H.spot = false; H.siren = false;
  H.equip = H.st.equip[0]; H.bucket.out = H.equip === 'bucket'; H.ladder.out = H.equip === 'ladder';
  H.surf = surfaceY(x, z, y + 1);
  H.pad = H.landed ? padAt(x, y, z) : null;
  if (!H.shadow) { H.shadow = mesh(GM.plane(), mat(0xffffff, { basic: true, t: true, o: 1, map: TEX.shadow, dw: false }), 0, 0, 0); H.shadow.renderOrder = 1; R.scene.add(H.shadow); }
  if (!H.beam) { H.beam = mesh(new THREE.ConeGeometry(1, 1, 12, 1, true).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: 0xfff4d8, map: TEX.beam, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); H.beam.visible = false; R.scene.add(H.beam); }
  buildGear();
  bus.emit('heli', H);
}

// ---------- input to flight ----------
function flyHeli(dt, inp) {
  const H = HELI, st = H.st;
  if (H.crashing) { crashFall(dt); return; }
  // engine: starts when you ask for lift, spools up over a few seconds
  if (!H.engine && H.fuel > 0 && (inp.lift > 0.2 || inp.coll > 0.2 || (OPTS.flight === 'sim' && H.coll > 0.3))) { H.engine = true; bus.emit('engine', true); }
  H.rpm = H.engine ? Math.min(1, H.rpm + dt / 2.8) : Math.max(0, H.rpm - dt / (H.landed ? 4 : 14));
  const burn = H.engine ? st.burn * 0.7 * (0.45 + 0.55 * (H.landed ? 0.2 : 1)) * (1 + H.bucket.water / 3000) : 0;
  if (H.engine) { H.fuel = Math.max(0, H.fuel - burn * dt); if (H.fuel <= 0) { H.engine = false; bus.emit('engine', false); msg('Engine flameout! Out of fuel. Autorotate down!', 'bad'); } }
  const load = 1 - 0.32 * (H.bucket.water / Math.max(1, st.bucket || 1)) * (st.bucket ? 1 : 0) - 0.03 * H.seats.length;
  const power = smooth(0.55, 1, H.rpm) * (H.engine ? 1 : 0);
  if (OPTS.flight === 'sim') flySim(dt, inp, power, load); else flyArcade(dt, inp, power, load);
  // wind gusts and the airspace fence
  H.vx += WIND.x * 0.02 * dt * (H.landed ? 0 : 1); H.vz += WIND.z * 0.02 * dt * (H.landed ? 0 : 1);
  if (!inAirspace(H.x, H.z)) {
    const cx = CITY.size / 2, cz = CITY.size / 2, dx = cx - H.x, dz = cz - H.z, d = Math.hypot(dx, dz);
    H.vx += dx / d * 12 * dt; H.vz += dz / d * 12 * dt;
    if ((H.warnT -= dt) <= 0) { msg('You are leaving city airspace. Turn back.', 'bad'); H.warnT = 6; }
  }
  if (H.y > 420) H.vy = Math.min(H.vy, -1);
  H.x += H.vx * dt; H.y += H.vy * dt; H.z += H.vz * dt;
  collideHeli(dt);
  groundHeli(dt);
}
function flyArcade(dt, inp, power, load) {
  const H = HELI, st = H.st, f = heliFwd(), rx = -f.z, rz = f.x;
  let vf = H.vx * f.x + H.vz * f.z, vs = H.vx * rx + H.vz * rz;
  const air = !H.landed && power > 0.2 ? 1 : 0;
  const top = st.speed * (0.6 + 0.4 * load);
  const tf = inp.fwd >= 0 ? inp.fwd * top : inp.fwd * top * 0.4, ts = inp.strafe * top * 0.45;
  const pvf = vf;
  vf = damp(vf, air ? tf : vf * 0.2, inp.fwd ? 0.75 : 0.45, dt);
  vs = damp(vs, air ? ts : vs * 0.2, inp.strafe ? 1.5 : 1.0, dt);
  H.vx = f.x * vf + rx * vs; H.vz = f.z * vf + rz * vs;
  const climb = st.climb * load * power;
  let tvy = inp.lift > 0 ? inp.lift * climb : inp.lift * st.climb * 0.9;
  if (power < 0.5) tvy = Math.min(tvy, -4 - 6 * (1 - power)); // no engine: a steady autorotation
  if (H.landed && inp.lift <= 0) tvy = 0;
  const flare = tvy < 0 && power > 0.5 && tvy < -(1 + (H.y - H.surf) * 0.45);
  if (flare) tvy = -(1 + (H.y - H.surf) * 0.45); // flare near the ground
  H.vy = damp(H.vy, tvy, flare ? 5 : 2.4, dt);
  const turn = st.turn * (1 - 0.35 * Math.min(1, Math.abs(vf) / st.speed));
  H.yawRate = damp(H.yawRate, air || H.rpm > 0.8 ? inp.turn * turn : 0, 4, dt);
  H.yaw = angWrap(H.yaw + H.yawRate * dt);
  // attitude is only for show: nose down into speed and acceleration, bank into turns
  const acc = (vf - pvf) / Math.max(dt, 1e-3);
  H.pitch = damp(H.pitch, air ? clamp(-vf / st.speed * 0.22 - acc * 0.025, -0.45, 0.35) : 0, 4, dt);
  H.roll = damp(H.roll, air ? clamp(-H.yawRate * Math.max(0, vf) / st.speed * 0.7 - vs / st.speed * 0.5, -0.6, 0.6) : 0, 4, dt);
}
function flySim(dt, inp, power, load) {
  const H = HELI, st = H.st;
  // collective: keyboard nudges it, triggers set a rate
  H.coll = clamp(H.coll + inp.coll * dt * 0.55, 0, 1);
  const sas = OPTS.assist ? 1.6 : 0.15, rate = 1.3;
  H.pitch += (-inp.fwd * rate - H.pitch * sas) * dt * (H.landed ? 0 : 1);
  H.roll += (-inp.roll * rate - H.roll * sas) * dt * (H.landed ? 0 : 1);
  H.pitch = clamp(H.pitch, -0.75, 0.75); H.roll = clamp(H.roll, -0.9, 0.9);
  if (H.landed) { H.pitch = damp(H.pitch, 0, 6, dt); H.roll = damp(H.roll, 0, 6, dt); }
  const torque = OPTS.torque ? (H.coll - 0.5) * 0.35 * power : 0;
  H.yawRate = damp(H.yawRate, (inp.pedal * st.turn * 1.1 + torque) * (H.rpm > 0.6 ? 1 : 0), 3, dt);
  H.yaw = angWrap(H.yaw + H.yawRate * dt);
  // thrust along the rotor axis
  _e.set(H.pitch, H.yaw, H.roll, 'YXZ'); _q.setFromEuler(_e);
  const up = _v2.set(0, 1, 0).applyQuaternion(_q);
  const hover = GRAV / load;
  const spd = speedH(), etl = 1 + 0.12 * smooth(6, 18, spd); // translational lift
  const T = H.coll * hover * 1.9 * power * etl * (st.climb / 10) ** 0.3;
  const k = 3.6 / (st.speed * st.speed);
  H.vx += (up.x * T - H.vx * spd * k) * dt;
  H.vz += (up.z * T - H.vz * spd * k) * dt;
  H.vy += (up.y * T - GRAV - H.vy * Math.abs(H.vy) * 0.04) * dt;
  if (power < 0.5) H.vy = Math.max(H.vy, -9); // autorotation keeps the fall survivable
  if (H.landed && H.vy < 0) H.vy = 0;
  if (H.landed) { H.vx *= Math.exp(-6 * dt); H.vz *= Math.exp(-6 * dt); }
}

// ---------- collisions, ground and damage ----------
function collideHeli(dt) {
  const H = HELI, m = H.model, cy = H.y + m.skid + m.bodyH * 0.5;
  const r = Math.min(m.r, 6.5);
  const c = collideSphere(H.x, cy, H.z, r, H.y + 1.2);
  if (!c.hit) return;
  const vn = H.vx * c.nx + H.vy * c.ny + H.vz * c.nz;
  H.x = c.x; H.z = c.z; H.y = c.y - m.skid - m.bodyH * 0.5;
  if (c.ny > 0.7) { // resting on something's top: treat it as ground
    if (H.vy < 0) { if (H.vy < -7) damageHeli((-H.vy - 7) * 7, 'hard landing'); H.vy = 0; }
    return;
  }
  if (vn < 0) {
    H.vx -= 1.4 * vn * c.nx; H.vy -= 1.4 * vn * c.ny; H.vz -= 1.4 * vn * c.nz;
    if (vn < -2.5 && H.hitT <= 0) {
      G.lastHit = { x: H.x, y: H.y, z: H.z, vn, s: c.hit && c.hit.y1 !== undefined ? [c.hit.x0, c.hit.z0, c.hit.x1, c.hit.z1, c.hit.y0, c.hit.y1, c.hit.r, c.hit.b && c.hit.b.style] : null };
      damageHeli((-vn - 2.5) * 3.6 * (1 + H.st.hp / 400), 'collision');
      CAM.shake = Math.min(1, CAM.shake + 0.5); H.hitT = 0.4;
      for (let i = 0; i < 10; i++) spark({ add: true, x: H.x - c.nx * r, y: cy, z: H.z - c.nz * r, vx: rr(-6, 6), vy: rr(0, 6), vz: rr(-6, 6), life: 0.5, s0: 0.8, s1: 0.2, c0: [1, 0.9, 0.5, 1], c1: [1, 0.5, 0.1, 0], grav: 10 });
      AUDIO.sfx('crunch', Math.min(1, -vn / 12));
    }
  }
}
function groundHeli(dt) {
  const H = HELI;
  H.hitT -= dt;
  H.surf = surfaceY(H.x, H.z, H.y + 1.5);
  const water = H.surf <= WATER_Y + 0.01 && isWaterAt(H.x, H.z);
  if (H.y <= H.surf + 0.02) {
    if (water) { // you can't land on water
      if (H.vy < -1 || !H.splashT || H.splashT < G.t) { splash(H.x, WATER_Y, H.z, 30, 2); AUDIO.sfx('splash', 1); damageHeli(18 + Math.max(0, -H.vy) * 3, 'ditched'); msg('You hit the water! Keep her up!', 'bad'); H.splashT = G.t + 1.5; }
      H.y = H.surf + 0.3; H.vy = Math.max(H.vy, 5); H.landed = false; return;
    }
    const tilt = Math.abs(H.pitch) + Math.abs(H.roll);
    if (H.vy < -6.5) damageHeli((-H.vy - 6.5) * 9, 'hard landing');
    if (tilt > 0.55 && speedH() > 4) damageHeli(tilt * 20 * dt * 10, 'rollover');
    H.y = H.surf; if (H.vy < 0) H.vy = 0;
    const was = H.landed;
    H.vx *= Math.exp(-5 * dt); H.vz *= Math.exp(-5 * dt);
    H.landed = speedH() < 3;
    if (H.landed && !was) { H.landT = 0; H.pad = padAt(H.x, H.y, H.z); bus.emit('landed', H.pad); dust(H.x, H.y, H.z, 2); }
    if (H.landed) H.landT += dt;
  } else if (H.y > H.surf + 0.25) {
    if (H.landed) { H.landed = false; H.pad = null; bus.emit('takeoff'); }
  }
  // rotor wash kicks up dust and water spray near the ground
  const agl = H.y - H.surf;
  if (H.rpm > 0.7 && agl < 14 && Math.random() < 0.6) {
    const a = rr(0, TAU), d = rr(3, 7);
    if (water) spark({ x: H.x + Math.cos(a) * d, y: WATER_Y + 0.2, z: H.z + Math.sin(a) * d, vx: Math.cos(a) * 8, vy: rr(0.5, 2), vz: Math.sin(a) * 8, life: 1.2, s0: 1.5, s1: 4, c0: [0.85, 0.92, 1, 0.4], c1: [0.9, 0.95, 1, 0], drag: 1.2 });
    else if (agl < 9) spark({ x: H.x + Math.cos(a) * d, y: H.surf + 0.3, z: H.z + Math.sin(a) * d, vx: Math.cos(a) * 7, vy: rr(0.3, 1.2), vz: Math.sin(a) * 7, life: 1, s0: 1.5, s1: 4, c0: [0.6, 0.56, 0.48, 0.3], c1: [0.65, 0.6, 0.5, 0], drag: 1.4 });
  }
}
function damageHeli(n, why) {
  const H = HELI;
  if (H.crashing || n <= 0 || G.god) return;
  H.hp -= n;
  H.roughT = Math.max(H.roughT, Math.min(2, n / 10));
  bus.emit('damage', n, why);
  if (H.hp <= 0) { H.hp = 0; startCrash(why); }
  else if (H.hp < H.st.hp * 0.25 && !H.lowWarned) { H.lowWarned = true; msg('Hull critical! Get to the hangar for repairs.', 'bad'); AUDIO.sfx('alarm'); }
}
function startCrash(why) {
  const H = HELI;
  H.crashing = 1; H.engine = false;
  msg('Mayday! Mayday! We\'re going down!', 'bad');
  AUDIO.sfx('alarm'); bus.emit('crash', why);
}
function crashFall(dt) {
  const H = HELI;
  H.crashing += dt;
  H.yawRate = damp(H.yawRate, 4, 1, dt); H.yaw += H.yawRate * dt;
  H.vy -= GRAV * 0.7 * dt; H.vx *= Math.exp(-0.5 * dt); H.vz *= Math.exp(-0.5 * dt);
  H.roll = damp(H.roll, 0.5, 1, dt);
  H.x += H.vx * dt; H.y += H.vy * dt; H.z += H.vz * dt;
  smoke(H.x, H.y + 2, H.z, 0.6);
  const s = surfaceY(H.x, H.z, H.y + 1);
  if (H.y <= s || H.crashing > 12) {
    if (!H.crashed) { H.crashed = true; H.y = Math.max(s, H.y); explosion(H.x, H.y + 1, H.z, 1.5); AUDIO.sfx('boom'); CAM.shake = 1; H.vx = H.vy = H.vz = 0; setTimeout(() => bus.emit('crashed'), 2500); }
    H.y = Math.max(s, WATER_Y - 1); H.vy = 0;
  }
}

// ---------- the model each frame ----------
function updateHeliModel(dt) {
  const H = HELI, m = H.model;
  if (!m) return;
  m.group.position.set(H.x, H.y, H.z);
  m.group.rotation.set(H.pitch, H.yaw, H.roll, 'YXZ');
  m.group.updateMatrixWorld(true);
  const spin = H.rpm * 32 * dt;
  for (const r of m.rotors) r.rotation.y += m.rotors.length > 1 && r === m.rotors[1] ? -spin : spin;
  for (let i = 0; i < m.discs.length; i++) { m.discs[i].visible = H.rpm > 0.55; m.rotors[i].children.forEach((b, k) => { if (k < m.rotors[i].children.length - 1) b.visible = H.rpm < 0.55 || (G.frame % 2 === 0); }); }
  if (m.tail) m.tail.rotation.x += H.rpm * 70 * dt;
  const blink = (G.t * 1.6) % 1 < 0.12;
  m.beacons[0].visible = blink || !H.engine;
  for (let i = 1; i < m.beacons.length; i++) m.beacons[i].visible = H.siren && ((G.t * 4 + i * 0.5) % 1 < 0.5);
  if (H.crashed) m.group.visible = false;
  // the blob shadow
  const s = surfaceY(H.x, H.z, H.y + 1), agl = H.y - s;
  H.shadow.position.set(H.x, s + 0.08, H.z);
  const sz = m.r * 1.4 * (1 + agl / 60);
  H.shadow.scale.set(sz, 1, sz);
  H.shadow.material.opacity = clamp(1 - agl / 120, 0, 0.9);
  H.shadow.visible = !H.crashed;
  // the searchlight
  updateSpot(dt);
}
function updateSpot() {
  const H = HELI, on = H.spot && !H.crashed;
  const m = H.model, p = _v1.copy(m.spotAt).applyMatrix4(m.group.matrixWorld);
  // aim: the call's suspect if there is one in range, else ahead and down
  let tx, ty, tz;
  const tgt = G.target && G.target.spotTarget ? G.target.spotTarget() : null;
  if (tgt && dist(tgt.x, tgt.z, H.x, H.z) < 160) { tx = tgt.x; ty = tgt.y || 0; tz = tgt.z; }
  else { const f = heliFwd(), ah = Math.max(10, altAGL()); tx = H.x + f.x * ah * 0.9; tz = H.z + f.z * ah * 0.9; ty = surfaceY(tx, tz); }
  H.spotAim = { x: tx, y: ty, z: tz };
  R.spot.position.copy(p); R.spot.target.position.set(tx, ty, tz); R.spot.target.updateMatrixWorld();
  R.spot.intensity = on ? 2.2 + R.night * 1.5 : 0;
  const L = dist3(p.x, p.y, p.z, tx, ty, tz);
  H.beam.visible = on && R.night > 0.3;
  if (H.beam.visible) {
    H.beam.position.copy(p);
    H.beam.lookAt(tx, ty, tz); H.beam.rotateX(-Math.PI / 2);
    const w = L * Math.tan(0.2);
    H.beam.scale.set(w, L, w);
    H.beam.material.opacity = 0.18 * R.night;
  }
}

// ---------- cameras ----------
function updateHeliCam(dt) {
  const H = HELI, m = H.model;
  CAM.orbitT = Math.max(0, CAM.orbitT - dt);
  if (CAM.orbitT <= 0 && CAM.mode !== 'cockpit') { CAM.userYaw = damp(CAM.userYaw, 0, 1.5, dt); CAM.userPitch = damp(CAM.userPitch, 0, 1.5, dt); }
  m.group.visible = CAM.mode !== 'cockpit' && !H.crashed;
  $('#cockpit').hidden = CAM.mode !== 'cockpit' || H.crashed || G.where !== 'heli';
  if (CAM.mode === 'cockpit' && !H.crashed) {
    const e = _v1.copy(m.eye).applyMatrix4(m.group.matrixWorld);
    const ya = H.yaw + CAM.userYaw, pa = H.pitch - 0.12 + CAM.userPitch;
    const fx = -Math.sin(ya) * Math.cos(pa), fy = Math.sin(pa), fz = -Math.cos(ya) * Math.cos(pa);
    R.camera.position.copy(e);
    R.camera.up.set(Math.sin(H.roll) * Math.cos(H.yaw), Math.cos(H.roll), -Math.sin(H.roll) * Math.sin(H.yaw));
    R.camera.lookAt(e.x + fx * 10, e.y + fy * 10, e.z + fz * 10);
    return;
  }
  if (CAM.mode === 'belly') {
    const y = H.y - 1.2, k = CAM.snap ? 1 : 1 - Math.exp(-dt * 10);
    CAM.x = lerp(CAM.x, H.x, k); CAM.y = lerp(CAM.y, y, k); CAM.z = lerp(CAM.z, H.z, k);
    R.camera.position.set(CAM.x, CAM.y, CAM.z);
    const f = heliFwd();
    R.camera.up.set(f.x, 0, f.z);
    R.camera.lookAt(CAM.x + f.x * 0.01, CAM.y - 10, CAM.z + f.z * 0.01);
    CAM.snap = false;
    return;
  }
  const far = CAM.mode === 'far';
  const d = ((far ? 46 : 20) + m.r * 1.6) * CAM.zoom, h = far ? 0.62 : 0.28;
  // trail the direction of travel when moving, else the nose
  const spd = speedH();
  // the camera sits at H + (sin a, cos a)·d: behind the nose is a = yaw, behind the motion is atan2(-vx, -vz)
  const want = spd > 6 ? Math.atan2(-H.vx, -H.vz) : H.yaw;
  const want2 = spd > 6 && Math.abs(angWrap(want - H.yaw)) < 1.6 ? want : H.yaw;
  CAM.yaw = CAM.snap ? want2 : angTo(CAM.yaw, want2, dt * (1.2 + Math.abs(angWrap(want2 - CAM.yaw)) * 1.6));
  const ya = CAM.yaw + CAM.userYaw, p = clamp(h + CAM.userPitch, -0.15, 1.45);
  let cx = H.x + Math.sin(ya) * Math.cos(p) * d, cz = H.z + Math.cos(ya) * Math.cos(p) * d, cy = H.y + 3 + Math.sin(p) * d;
  // stay out of buildings: walk the line from the helicopter out to the camera and stop short of a wall
  const ty = H.y + 2.5, n = Math.ceil(d / 2);
  for (let i = 1; i <= n; i++) {
    const u = i / n, x = lerp(H.x, cx, u), z = lerp(H.z, cz, u), y = lerp(ty, cy, u);
    if (roofBelow(x, z, 1e9, 0.8) > y - 0.8) { const v = Math.max(0.12, (i - 1.5) / n); cx = lerp(H.x, cx, v); cz = lerp(H.z, cz, v); cy = lerp(ty, cy, v) + (1 - v) * 1.5; break; }
  }
  const gy = surfaceY(cx, cz, cy + 2);
  cy = Math.max(cy, gy + 2.5, WATER_Y + 2);
  const k = CAM.snap ? 1 : 1 - Math.exp(-dt * 7);
  CAM.x = lerp(CAM.x, cx, k); CAM.y = lerp(CAM.y, cy, k); CAM.z = lerp(CAM.z, cz, k);
  CAM.snap = false;
  placeCam(CAM.x, CAM.y, CAM.z, H.x, H.y + 2.5, H.z);
}
function cycleCam() {
  const i = CAM_MODES.indexOf(CAM.mode);
  CAM.mode = CAM_MODES[(i + 1) % CAM_MODES.length];
  CAM.userYaw = CAM.userPitch = 0; CAM.snap = true;
  toast(CAM_NAMES[CAM.mode]);
}
