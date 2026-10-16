// Roma Aeterna — the player: first-person walking, collisions, steps, the camera, and what you're looking at.

const PL = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, vy: 0, ground: true, run: false, runToggle: false, bob: 0, stepT: 0, free: false, target: null, eye: 1.62, speed: 0 };
const PR = 0.32;
const WALK = 3.1, RUN = 6.6;

function placePlayer(x, z, yaw = 0) {
  PL.x = x; PL.z = z; PL.y = surfaceAt(x, z, 999); PL.vx = PL.vz = PL.vy = 0; PL.yaw = yaw; PL.pitch = 0;
  // never start inside a solid
  const [nx, nz] = collideCircle(x, z, PR, PL.y); PL.x = nx; PL.z = nz; PL.y = surfaceAt(nx, nz, PL.y + 0.3);
}

function updatePlayer(dt) {
  const busy = HUD.blocking();
  // ---- look ----
  const sens = 0.0022 * SETTINGS.sens;
  if (Input.locked && !busy) { PL.yaw -= Input.m.dx * sens; PL.pitch -= Input.m.dy * sens * (SETTINGS.invertY ? -1 : 1); }
  if (!busy) { PL.yaw -= Input.an.lx * SETTINGS.sens; PL.pitch -= Input.an.ly * SETTINGS.sens * (SETTINGS.invertY ? -1 : 1); }
  PL.pitch = clamp(PL.pitch, -1.45, 1.45);
  // ---- move ----
  let mx = 0, mz = 0;
  if (!busy) {
    if (Input.down('KeyW') || Input.down('ArrowUp')) mz -= 1;
    if (Input.down('KeyS') || Input.down('ArrowDown')) mz += 1;
    if (Input.down('KeyA') || Input.down('ArrowLeft')) mx -= 1;
    if (Input.down('KeyD') || Input.down('ArrowRight')) mx += 1;
    mx += Input.an.mx; mz += Input.an.mz;
  }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  if (Input.hit('CapsLock')) PL.runToggle = !PL.runToggle;
  PL.run = (Input.down('ShiftLeft') || Input.down('ShiftRight') || Input.an.run) !== PL.runToggle;
  let spd = PL.run ? RUN : WALK;
  if (PL.free) spd = Input.down('ShiftLeft') ? 60 : 20;
  const sy = Math.sin(PL.yaw), cy = Math.cos(PL.yaw);
  // camera forward is -z rotated by yaw
  const wx = (-sy * -mz + cy * mx) * spd, wz = (-cy * -mz - sy * mx) * spd;
  const acc = PL.ground ? 14 : 3;
  PL.vx += (wx - PL.vx) * Math.min(1, acc * dt); PL.vz += (wz - PL.vz) * Math.min(1, acc * dt);
  if (PL.free) { // debug fly
    PL.x += PL.vx * dt; PL.z += PL.vz * dt;
    if (Input.down('Space')) PL.y += spd * dt; if (Input.down('KeyC')) PL.y -= spd * dt;
    PL.speed = Math.hypot(PL.vx, PL.vz);
    return;
  }
  // ---- collide, in short steps so fast running can't tunnel through a pier ----
  const dist = Math.hypot(PL.vx, PL.vz) * dt, n = Math.max(1, Math.ceil(dist / 0.25));
  for (let i = 0; i < n; i++) {
    let nx = PL.x + PL.vx * dt / n, nz = PL.z + PL.vz * dt / n;
    nx = clamp(nx, T.X0 + 30, T.X1 - 30); nz = clamp(nz, T.Z0 + 30, T.Z1 - 30);
    [nx, nz] = NPC.pushPlayer(nx, nz);
    [nx, nz] = collideCircle(nx, nz, PR, PL.y);
    const sfc = surfaceAt(nx, nz, PL.y);
    // the Tiber: no swimming
    if (sfc < WATER_Y - 0.2) { PL.vx *= 0.2; PL.vz *= 0.2; break; }
    // climbing too high a ledge (terrain can be steep but walkable; solids are handled by collideCircle)
    PL.x = nx; PL.z = nz;
  }
  const g = surfaceAt(PL.x, PL.z, PL.y);
  if (PL.ground && Input.hit('Space') && !busy) { PL.vy = 4.3; PL.ground = false; }
  if (PL.ground && PL.y - g < 0.35 && PL.vy <= 0) { PL.y = g; PL.vy = 0; }
  else {
    PL.vy -= 18 * dt; PL.y += PL.vy * dt;
    if (PL.y <= g) { if (!PL.ground && PL.vy < -6) AU.step(1.4); PL.y = g; PL.vy = 0; PL.ground = true; } else PL.ground = false;
  }
  PL.speed = Math.hypot(PL.vx, PL.vz);
  // footsteps and head bob
  if (PL.ground && PL.speed > 0.5) {
    PL.bob += dt * PL.speed * 2.15;
    PL.stepT -= dt * PL.speed; if (PL.stepT <= 0) { PL.stepT = PL.run ? 1.55 : 1.25; AU.step(PL.run ? 1 : 0.7); }
  } else PL.bob *= 0.9;
}

function updateCamera() {
  const cam = R.camera;
  const b = SETTINGS.bob && !PL.free ? Math.sin(PL.bob * 2) * 0.035 * Math.min(1, PL.speed / 3) : 0;
  cam.position.set(PL.x, PL.y + PL.eye + b, PL.z);
  cam.rotation.set(PL.pitch, PL.yaw, Math.sin(PL.bob) * 0.004 * Math.min(1, PL.speed / 3), 'YXZ');
}

// What the player is looking at: an NPC to talk to, or a placard to read.
function findTarget() {
  const fx = -Math.sin(PL.yaw) * Math.cos(PL.pitch), fz = -Math.cos(PL.yaw) * Math.cos(PL.pitch), fy = Math.sin(PL.pitch);
  const ex = PL.x, ey = PL.y + PL.eye, ez = PL.z;
  let best = null, bs = -1;
  for (const p of W.placards) {
    const dx = p.x - ex, dz = p.z - ez, d = Math.hypot(dx, dz);
    if (d > 4.2) continue;
    const dy = p.y - ey, l = Math.hypot(d, dy), dot = (dx * fx + dy * fy + dz * fz) / l;
    const sc = dot - d * 0.02;
    if (dot > 0.8 && sc > bs) { bs = sc; best = { kind: 'placard', p }; }
  }
  const npc = NPC.pick(ex, ey, ez, fx, fy, fz);
  if (npc && (npc.score > bs || !best)) best = { kind: 'npc', a: npc.a };
  PL.target = best;
  return best;
}
