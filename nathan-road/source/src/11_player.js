// 11_player: first-person walking. Keyboard and mouse, touch (left stick, drag to look) and gamepad. The player is in
// one "space" at a time: the street, the inside of Milton Mansion, or the deck of a Star Ferry. Each space gives
// ground height, collision and limits.
const PL = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, eye: 1.62, vy: 0, speed: 0, bob: 0, space: null, free: false, moved: 0, run: false, frozen: false };
const OPT = { sens: 1, invert: false, fov: 62, lines: 240, wobble: 1, crowd: 1, volume: 0.8, timeSpeed: 30, music: 0.5 };
const WALK_SPEED = 4.2, RUN_SPEED = 8.5;

const STREET = {
  name: 'street',
  ground: (x, z) => groundAt(x, z),
  collide: (x, z, r) => collide(x, z, r),
  allowed(x, z) {
    const c = gclass(x, z);
    if (c === G.SEA || c === G.NONE || c === G.BUILD) return false;
    return x > W.walk[0] && x < W.walk[2] && z > W.walk[1] && z < W.walk[3];
  },
  scene: () => scene,
};

function placePlayer(x, z, yaw, space = STREET) {
  PL.space = space; PL.x = x; PL.z = z; if (yaw !== undefined) PL.yaw = yaw; PL.pitch = 0;
  PL.y = space.ground(x, z);
}

let edgeMsgT = 0;
function updatePlayer(dt) {
  const S = PL.space;
  // look
  const [mx, my] = Input.mouse();
  const inv = OPT.invert ? -1 : 1;
  PL.yaw -= mx * 0.0022 * OPT.sens; PL.pitch -= my * 0.0022 * OPT.sens * inv;
  const t = Input.touch, p = Input.pad;
  PL.yaw -= t.lx * 0.006 * OPT.sens; PL.pitch -= t.ly * 0.006 * OPT.sens * inv; t.lx = t.ly = 0;
  PL.yaw -= p.lx * dt * 2.6 * OPT.sens; PL.pitch -= p.ly * dt * 2.0 * OPT.sens * inv;
  if (Input.key('ArrowLeft')) PL.yaw += dt * 2; if (Input.key('ArrowRight')) PL.yaw -= dt * 2;
  PL.pitch = clamp(PL.pitch, -1.45, 1.45);
  if (PL.frozen) return;
  // move
  let fx = 0, fz = 0;
  if (Input.key('KeyW') || Input.key('ArrowUp')) fz += 1;
  if (Input.key('KeyS') || Input.key('ArrowDown')) fz -= 1;
  if (Input.key('KeyA')) fx -= 1;
  if (Input.key('KeyD')) fx += 1;
  fx += t.mx + p.mx; fz -= t.my + p.my;
  const len = Math.hypot(fx, fz);
  if (len > 1) { fx /= len; fz /= len; }
  PL.run = Input.key('ShiftLeft') || Input.key('ShiftRight') || Input.key('PadLS') || t.run || Input.key('PadRT');
  const sp = (PL.run ? RUN_SPEED : WALK_SPEED) * (PL.space.speed || 1);
  const sn = Math.sin(PL.yaw), cs = Math.cos(PL.yaw);
  // forward is -z when yaw = 0
  const vx = (fx * cs - fz * sn) * sp, vz = (-fx * sn - fz * cs) * sp;
  PL.speed = Math.hypot(vx, vz);
  if (PL.free) {
    const fy = (Input.key('KeyE') ? 1 : 0) - (Input.key('KeyQ') ? 1 : 0);
    PL.x += vx * dt * 4; PL.z += vz * dt * 4; PL.y += fy * dt * 20;
    return;
  }
  if (PL.speed > 0.01) {
    let nx = PL.x + vx * dt, nz = PL.z + vz * dt;
    [nx, nz] = S.collide(nx, nz, 0.3);
    if (S.allowed(nx, nz)) { PL.x = nx; PL.z = nz; }
    else if (S.allowed(nx, PL.z)) PL.x = nx;
    else if (S.allowed(PL.x, nz)) PL.z = nz;
    else if (S === STREET && performance.now() - edgeMsgT > 6000) {
      const out = !(nx > W.walk[0] && nx < W.walk[2] && nz > W.walk[1] && nz < W.walk[3]);
      if (out) { edgeMsgT = performance.now(); bus.emit('toast', 'This is the edge of the map for now. More of Hong Kong later.'); }
    }
    PL.moved += PL.speed * dt;
    PL.bob += dt * PL.speed * 1.9;
  }
  const gy = S.ground(PL.x, PL.z);
  PL.y = gy > PL.y ? lerp(PL.y, gy, clamp(dt * 14, 0, 1)) : Math.max(gy, PL.y - dt * 6);
}
const _look = new V3();
function updateCamera() {
  const bob = PL.free ? 0 : Math.sin(PL.bob) * 0.035 * clamp(PL.speed / 4, 0, 1.4);
  camera.position.set(PL.x, PL.y + PL.eye + bob, PL.z);
  if (PL.space && PL.space.camOffset) PL.space.camOffset(camera.position);
  camera.rotation.set(0, 0, 0);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = PL.yaw + (PL.space && PL.space.yawOffset ? PL.space.yawOffset() : 0);
  camera.rotation.x = PL.pitch;
  if (camera.fov !== OPT.fov) { camera.fov = OPT.fov; camera.updateProjectionMatrix(); }
}
// what the player is looking at, for interaction: returns dir vector
function lookDir(out = _look) { return out.set(-Math.sin(PL.yaw) * Math.cos(PL.pitch), Math.sin(PL.pitch), -Math.cos(PL.yaw) * Math.cos(PL.pitch)); }
