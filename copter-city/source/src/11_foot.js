// Copter City — the pilot on foot: get out wherever you've landed, walk the streets or the roof you're on, chat with
// people, pick up tokens, climb back in.

const PILOT = { x: 0, y: 0, z: 0, vy: 0, yaw: 0, model: null, ground: true, fallFrom: 0, chatT: 0 };

function initPilot() {
  if (PILOT.model) R.scene.remove(PILOT.model.group);
  PILOT.model = buildPerson({ shirt: 0x5a6a3a, pants: 0x3a3a30, hat: 0x2a2a2a, skin: 0xe0b890 });
  PILOT.model.group.visible = false;
  R.scene.add(PILOT.model.group);
}
function canExit() { return HELI.landed && !HELI.crashing && G.where === 'heli'; }
function exitHeli() {
  if (!canExit()) { if (!HELI.landed) toast('Land first to get out.'); return; }
  const H = HELI, rx = Math.cos(H.yaw), rz = -Math.sin(H.yaw), off = H.model.r * 0.45 + 1.2;
  let x = H.x + rx * off, z = H.z + rz * off;
  // if the side is blocked (a roof edge, a wall), try the other side and the back
  for (const [sx, sz] of [[rx, rz], [-rx, -rz], [Math.sin(H.yaw), Math.cos(H.yaw)]]) {
    const tx = H.x + sx * off, tz = H.z + sz * off, s = surfaceY(tx, tz, H.y + 1);
    if (Math.abs(s - H.y) < 0.8 && !isWaterAt(tx, tz)) { x = tx; z = tz; break; }
  }
  Object.assign(PILOT, { x, z, y: surfaceY(x, z, H.y + 1), vy: 0, yaw: H.yaw, ground: true });
  PILOT.fallFrom = PILOT.y;
  H.engine = false;
  G.where = 'foot'; document.body.dataset.where = 'foot';
  PILOT.model.group.visible = true;
  H.spot = false;
  CAM.userYaw = 0; CAM.userPitch = 0; CAM.yaw = H.yaw; CAM.snap = true;
  AUDIO.sfx('door');
  bus.emit('foot', true);
}
function enterHeli() {
  G.where = 'heli'; document.body.dataset.where = 'heli';
  PILOT.model.group.visible = false;
  CAM.snap = true;
  AUDIO.sfx('door');
  bus.emit('foot', false);
}
function footControls(dt) {
  const p = PILOT, H = HELI;
  const mv = Input.move(), run = Input.held('run');
  const sp = run ? 8 : 4.2;
  // camera-relative movement
  const cy = CAM.yaw + CAM.userYaw;
  const fx = -Math.sin(cy), fz = -Math.cos(cy), rx = -fz, rz = fx;
  let vx = (fx * -mv.y + rx * mv.x) * sp, vz = (fz * -mv.y + rz * mv.x) * sp;
  const moving = Math.hypot(vx, vz) > 0.2;
  if (moving) p.yaw = angTo(p.yaw, Math.atan2(-vx, -vz), dt * 10);
  let nx = p.x + vx * dt, nz = p.z + vz * dt;
  // no swimming
  if (isWaterAt(nx, nz) && surfaceY(nx, nz, p.y + 0.6) <= WATER_Y + 0.01) { nx = p.x; nz = p.z; }
  const c = collideSphere(nx, p.y + 0.9, nz, 0.45, p.y + 0.6);
  pushFromCars(c, 0.45);
  nx = c.x; nz = c.z;
  // don't walk into the helicopter's body
  const hd = dist(nx, nz, H.x, H.z), hr = H.model.r * 0.35 + 0.5;
  if (hd < hr && hd > 0.01) { nx = H.x + (nx - H.x) / hd * hr; nz = H.z + (nz - H.z) / hd * hr; }
  p.x = nx; p.z = nz;
  // gravity, jumping and falls
  const s = surfaceY(p.x, p.z, p.y + 0.6);
  if (p.ground && Input.pressed('jump')) { p.vy = 5.5; p.ground = false; }
  p.vy -= GRAV * dt; p.y += p.vy * dt;
  if (p.y <= s) {
    const fell = p.fallFrom - s;
    p.y = s; p.vy = 0;
    if (!p.ground && fell > 9) hurtPilot(fell);
    p.ground = true; p.fallFrom = s;
  } else { if (p.ground && p.y > s + 0.4) { p.ground = false; } if (p.ground) { p.y = s; } else p.fallFrom = Math.max(p.fallFrom, p.y); }
  if (p.y < WATER_Y - 2) hurtPilot(20);
  const m = p.model;
  m.pose = !p.ground ? 'stand' : moving ? (run ? 'run' : 'walk') : 'stand';
  posePerson(m, dt);
  placePerson(m, p.x, p.y, p.z, p.yaw);
  // tokens
  for (const t of CITY.tokens) if (!t.got && dist3(t.x, t.y - 1.2, t.z, p.x, p.y, p.z) < 1.8) collectToken(t);
  // interactions
  if (Input.pressed('use')) {
    if (dist(p.x, p.z, H.x, H.z) < H.model.r * 0.6 + 3 && Math.abs(p.y - H.y) < 2) enterHeli();
    else {
      const ped = pedsNear(p.x, p.z, 3)[0];
      if (ped) { ped.v = 0; ped.flee = 0; setTimeout(() => { ped.v = rr(1.1, 1.5); }, 4000); bubble(pick(CHATTER)); AUDIO.sfx('blip'); }
      else bus.emit('footUse', p);
    }
  }
}
function hurtPilot(fell) {
  const fee = 400;
  msg(`Ouch! That was a ${Math.round(fell)} m fall. The paramedics patched you up (${fmtMoney(fee)}).`, 'bad');
  pay(-fee, 'Medical bill');
  const H = HELI;
  Object.assign(PILOT, { x: H.x + 3, z: H.z + 3, y: surfaceY(H.x + 3, H.z + 3, H.y + 1), vy: 0, ground: true });
  PILOT.fallFrom = PILOT.y;
}
function collectToken(t) {
  t.got = true; t.mesh.visible = false;
  const n = CITY.tokens.filter((k) => k.got).length;
  pay(250, 'Gold rotor token');
  toast(`Gold rotor token ${n} of ${CITY.tokens.length}! +$250`, 'good');
  AUDIO.sfx('coin');
  if (G.career && !G.free) { const cs = G.career.cities[CITY.def.id]; cs.tokens = cs.tokens || []; if (!cs.tokens.includes(t.i)) cs.tokens.push(t.i); saveGame(); }
}
function updateTokens(dt) { for (const t of CITY.tokens) if (!t.got) { t.mesh.rotation.y += dt * 2; t.mesh.position.y = t.y + Math.sin(G.t * 2 + t.i) * 0.2; } }
function updateFootCam(dt) {
  const p = PILOT;
  CAM.orbitT = Math.max(0, CAM.orbitT - dt);
  const d = 6.5 * CAM.zoom, pi = clamp(0.35 + CAM.userPitch, -0.2, 1.3);
  if (Input.move().y < -0.3 && CAM.orbitT <= 0) CAM.yaw = angTo(CAM.yaw, p.yaw, dt * 1.2);
  const ya = CAM.yaw + CAM.userYaw;
  let cx = p.x + Math.sin(ya) * Math.cos(pi) * d, cz = p.z + Math.cos(ya) * Math.cos(pi) * d, cy = p.y + 1.6 + Math.sin(pi) * d;
  // pull in if a wall is in the way
  for (let i = 1; i <= 8; i++) {
    const u = i / 8, x = lerp(p.x, cx, u), z = lerp(p.z, cz, u), y = lerp(p.y + 1.6, cy, u);
    if (roofBelow(x, z, 1e9) > y) { cx = lerp(p.x, cx, (i - 1) / 8); cz = lerp(p.z, cz, (i - 1) / 8); cy = lerp(p.y + 1.6, cy, (i - 1) / 8) + 0.5; break; }
  }
  cy = Math.max(cy, surfaceY(cx, cz, cy + 1) + 0.6);
  const k = CAM.snap ? 1 : 1 - Math.exp(-dt * 10);
  CAM.x = lerp(CAM.x, cx, k); CAM.y = lerp(CAM.y, cy, k); CAM.z = lerp(CAM.z, cz, k); CAM.snap = false;
  placeCam(CAM.x, CAM.y, CAM.z, p.x, p.y + 1.4, p.z);
  $('#cockpit').hidden = true;
  HELI.model.group.visible = !HELI.crashed;
}
