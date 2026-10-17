// The Time Apprentice — the player: first-person walking, collisions, the camera, what you're looking at, what you carry

const PL = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, vy: 0, ground: true, bob: 0, stepT: 0, speed: 0, eye: 1.5, target: null,
  carry: null, cut: null, turn: null, free: false, frozen: false };
const PR = 0.3, WALK = 3.4, RUN = 6.2;

function placePlayer(x, z, yaw = 0, pitch = 0) {
  PL.x = x; PL.z = z; PL.y = Stage.height(x, z); PL.vx = PL.vz = PL.vy = 0; PL.yaw = yaw; PL.pitch = pitch; PL.turn = null;
  const [nx, nz] = Stage.collide(x, z, PR, PL.y); PL.x = nx; PL.z = nz; PL.y = Stage.height(nx, nz);
}
// turn the view smoothly toward a point (used by story "look" steps)
function turnTo(x, y, z, sec = 0.7) {
  const dx = x - PL.x, dy = y - (PL.y + PL.eye), dz = z - PL.z;
  PL.turn = { y0: PL.yaw, p0: PL.pitch, y1: PL.yaw + angWrap(Math.atan2(-dx, -dz) - PL.yaw), p1: clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.8, 0.8), t: 0, d: sec };
  return wait(sec);
}

function updatePlayer(dt) {
  const busy = HUD.blocking() || PL.frozen || !!PL.cut;
  if (PL.turn) {
    const tr = PL.turn; tr.t += dt; const k = smooth(0, 1, tr.t / tr.d);
    PL.yaw = lerp(tr.y0, tr.y1, k); PL.pitch = lerp(tr.p0, tr.p1, k);
    if (tr.t >= tr.d) PL.turn = null;
  } else if (!HUD.blocking() && !PL.cut) {
    const sens = 0.0022 * SETTINGS.sens, inv = SETTINGS.invertY ? -1 : 1;
    if (Input.locked) { PL.yaw -= Input.m.dx * sens; PL.pitch -= Input.m.dy * sens * inv; }
    PL.yaw -= Input.an.lx * SETTINGS.sens; PL.pitch -= Input.an.ly * SETTINGS.sens * inv;
    PL.pitch = clamp(PL.pitch, -1.4, 1.4);
  }
  let mx = 0, mz = 0;
  if (!busy) {
    if (Input.down('KeyW') || Input.down('ArrowUp')) mz -= 1;
    if (Input.down('KeyS') || Input.down('ArrowDown')) mz += 1;
    if (Input.down('KeyA') || Input.down('ArrowLeft')) mx -= 1;
    if (Input.down('KeyD') || Input.down('ArrowRight')) mx += 1;
    mx += Input.an.mx; mz += Input.an.mz;
  }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const run = Input.down('ShiftLeft') || Input.down('ShiftRight') || Input.an.run;
  let spd = run ? RUN : WALK;
  if (PL.free) spd = run ? 40 : 14;
  const sy = Math.sin(PL.yaw), cy = Math.cos(PL.yaw);
  const wx = (sy * mz + cy * mx) * spd, wz = (cy * mz - sy * mx) * spd;
  const acc = PL.ground ? 12 : 3;
  PL.vx += (wx - PL.vx) * Math.min(1, acc * dt); PL.vz += (wz - PL.vz) * Math.min(1, acc * dt);
  if (PL.free) {
    PL.x += PL.vx * dt; PL.z += PL.vz * dt;
    if (Input.down('Space')) PL.y += spd * dt; if (Input.down('KeyC')) PL.y -= spd * dt;
    return;
  }
  const dist = Math.hypot(PL.vx, PL.vz) * dt, n = Math.max(1, Math.ceil(dist / 0.2));
  for (let i = 0; i < n; i++) {
    let nx = PL.x + PL.vx * dt / n, nz = PL.z + PL.vz * dt / n;
    // steps up to 0.45 m are climbable; anything taller stops you
    const h = Stage.height(nx, nz);
    if (h - PL.y > 0.45) { PL.vx *= 0.5; PL.vz *= 0.5; break; }
    [nx, nz] = Stage.collide(nx, nz, PR, PL.y);
    PL.x = nx; PL.z = nz;
  }
  const g = Stage.height(PL.x, PL.z);
  if (PL.ground && Input.hit('Space') && !busy) { PL.vy = 4.2; PL.ground = false; }
  if (PL.ground && PL.y - g < 0.5 && PL.vy <= 0) { PL.y = lerp(PL.y, g, Math.min(1, dt * 18)); PL.vy = 0; }
  else {
    PL.vy -= 16 * dt; PL.y += PL.vy * dt;
    if (PL.y <= g) { if (!PL.ground && PL.vy < -5) AU.step(1.2); PL.y = g; PL.vy = 0; PL.ground = true; } else PL.ground = false;
  }
  PL.speed = Math.hypot(PL.vx, PL.vz);
  if (PL.ground && PL.speed > 0.5) {
    PL.bob += dt * PL.speed * 2.2;
    PL.stepT -= dt * PL.speed; if (PL.stepT <= 0) { PL.stepT = run ? 1.6 : 1.3; AU.step(run ? 1 : 0.7); }
  } else PL.bob *= 0.9;
}

function updateCamera() {
  const cam = R.camera;
  if (PL.cut) {
    const c = PL.cut;
    cam.position.set(c.pos[0], c.pos[1], c.pos[2]);
    cam.lookAt(c.look[0], c.look[1], c.look[2]);
    if (c.fov && cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    return;
  }
  if (cam.fov !== SETTINGS.fov) { cam.fov = SETTINGS.fov; cam.updateProjectionMatrix(); }
  const b = SETTINGS.bob && !PL.free ? Math.sin(PL.bob * 2) * 0.03 * Math.min(1, PL.speed / 3) : 0;
  cam.position.set(PL.x, PL.y + PL.eye + b, PL.z);
  cam.rotation.set(PL.pitch, PL.yaw, 0, 'YXZ');
}

// What the player is looking at: a person, an item to pick up, or a place to use.
function findTarget() {
  if (PL.cut) { PL.target = null; return null; }
  const fx = -Math.sin(PL.yaw) * Math.cos(PL.pitch), fz = -Math.cos(PL.yaw) * Math.cos(PL.pitch), fy = Math.sin(PL.pitch);
  const ex = PL.x, ey = PL.y + PL.eye, ez = PL.z;
  let best = null, bs = -1e9;
  const consider = (kind, ref, x, y, z, reach, label) => {
    const dx = x - ex, dy = y - ey, dz = z - ez, d = Math.hypot(dx, dz);
    if (d > reach) return;
    const l = Math.hypot(d, dy) || 1e-6, dot = (dx * fx + dy * fy + dz * fz) / l;
    if (dot < (d < 1.2 ? 0.55 : 0.82)) return;
    const sc = dot * 2 - d * 0.08 + (Story.wants(kind, ref.id) ? 0.4 : 0);
    if (sc > bs) { bs = sc; best = { kind, ref, label }; }
  };
  for (const a of Stage.actorList()) if (a.talkable && a.g.visible) consider('actor', a, a.x, a.headY - 0.25, a.z, 3.6, 'Talk to ' + a.name);
  if (!PL.carry) for (const id in Stage.items) { const it = Stage.items[id]; if (it.taken || it.gone || !it.obj.visible) continue; if (!Story.wants('item', id) && !it.free) continue; const p = it.obj.getWorldPosition(new V3()); consider('item', it, p.x, p.y + (it.dy || 0.2), p.z, 3.2, 'Pick up ' + it.label); }
  for (const id in Stage.spots) {
    const s = Stage.spots[id];
    if (!s.label || (!s.use && !Story.wants('spot', id))) continue;
    consider('spot', s, s.x, s.y + (s.dy != null ? s.dy : 1), s.z, s.reach || 3.4, s.label);
  }
  PL.target = best;
  return best;
}
function interact() {
  const t = PL.target; if (!t) return;
  if (Story.interact(t.kind, t.ref)) return;
  if (t.kind === 'actor') Story.chatter(t.ref);
  else if (t.kind === 'spot' && typeof t.ref.use === 'function') t.ref.use(t.ref);
  else if (t.kind === 'item' && t.ref.free) carryItem(t.ref);
}

// ---------- carrying ----------
const HAND = new THREE.Group();
function carryItem(it) {
  it.taken = true; PL.carry = it;
  const o = it.obj; o.parent && o.parent.remove(o);
  HAND.add(o); o.position.set(0, 0, 0); o.rotation.set(0, it.carryYaw || 0, 0);
  const s = it.carryScale || 1; o.scale.setScalar(s);
  AU.ui('pick');
  HUD.carry(it.label);
}
function dropItem(at) {
  const it = PL.carry; if (!it) return null;
  PL.carry = null; HUD.carry(null);
  HAND.remove(it.obj);
  if (at) { it.obj.scale.setScalar(1); it.obj.position.set(at.x + (at.ox || 0), at.y + (at.oy || 0), at.z + (at.oz || 0)); it.obj.rotation.set(0, at.ry || 0, 0); Stage.root.add(it.obj); }
  it.gone = true;
  AU.ui('drop');
  return it;
}
function initHand() {
  HAND.position.set(0.32, -0.32, -0.62);
  R.camera.add(HAND);
}
