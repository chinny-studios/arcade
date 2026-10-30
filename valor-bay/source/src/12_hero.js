// Valor Bay — the hero: movement (running and jumping for everyone; web-swinging and wall-crawling for Spindle,
// flight for Skylark and Equinox, super speed and wall-running for Blitz, the super leap for Bulwark), free-flowing
// melee that lunges to the nearest crook, the ranged power, two powers and an ultimate per hero, projectiles,
// taking damage, going down and getting back up. The camera state lives here too.

let P = null;
const CAM = { yaw: 0, pitch: 0.22, zoom: 1, x: 0, y: 0, z: 0, snap: true, fov: 70 };
const PROJ = { list: [] };
const GRAV = 30;

function spawnHero(id, x, z, y) {
  const D = HEROES[id];
  const mat = MATS.skin.clone();
  const M = buildRig(partsOf(id, D.look), D.build, { mat, glowHands: id === 'equinox' });
  R.scene.add(M.root);
  P = { kind: 'hero', id, D, M, h: D.build.h, r: id === 'bulwark' ? 0.6 : 0.4, x, y: y === undefined ? supportY(x, z, 999) : y, z, vx: 0, vy: 0, vz: 0, yaw: 0,
    hp: D.hp, maxHp: D.hp, onGround: true, mode: 'ground', act: null, cds: { rmb: 0, q: 0, e: 0 }, meter: 0, dodge: 0, invuln: 0, downed: false, hurtT: 9,
    ph: 0, comboN: 0, comboWin: 0, jumps: 0, anchor: null, ropeL: 0, swingCd: 0, wall: null, charge: 0, held: null, flyBoost: 0, speedOn: false, t: 0, lastHit: 0,
    beam: 0, rampage: 0, whirl: 0, lap: 0, zero: 0, freeze: 0, aimT: null, landT: 0 };
  CAM.yaw = 0; CAM.snap = true;
  return P;
}
function despawnHero() { if (!P) return; if (P.held) dropHeld(); disposeRig(P.M); P = null; }

// ---------- aiming ----------
const _cf = new V3();
function camFwd() { R.camera.getWorldDirection(_cf); return _cf; }
// the crook nearest the crosshair (within `cone` radians and `range` metres, in sight)
function aimTarget(range = 70, cone = 0.2) {
  const cp = R.camera.position, f = camFwd();
  let best = null, ba = cone;
  for (const o of FOES.list) {
    if (o.dead || o.ko) continue;
    const tx = o.x - cp.x, ty = o.y + o.h * 0.55 - cp.y, tz = o.z - cp.z, d = Math.hypot(tx, ty, tz);
    if (d > range + 8 || dist(o.x, o.z, P.x, P.z) > range) continue;
    const a = Math.acos(clamp((tx * f.x + ty * f.y + tz * f.z) / d, -1, 1));
    if (a < ba && losClear(P.x, P.y + P.h * 0.8, P.z, o.x, o.y + o.h * 0.6, o.z)) { ba = a; best = o; }
  }
  // getaway cars are fair game too
  for (const c of CARS.list) {
    if (!c.crew || c.state === 'gone') continue;
    const tx = c.x - cp.x, ty = c.y + 0.8 - cp.y, tz = c.z - cp.z, d = Math.hypot(tx, ty, tz);
    if (d > range + 8) continue;
    const a = Math.acos(clamp((tx * f.x + ty * f.y + tz * f.z) / d, -1, 1));
    if (a < ba * 1.5) { ba = a; best = c; }
  }
  return best;
}
// where the crosshair is pointing in the world
function aimPoint(maxd = 160) {
  const cp = R.camera.position, f = camFwd();
  const t = raycast(cp.x, cp.y, cp.z, f.x, f.y, f.z, maxd);
  const d = Math.min(t, maxd);
  return new V3(cp.x + f.x * d, cp.y + f.y * d, cp.z + f.z * d);
}
function handPos(left = false) {
  const s = left ? -1 : 1;
  return new V3(P.x + fwdX(P.yaw) * 0.5 + Math.cos(P.yaw) * s * 0.3, P.y + P.h * 0.72, P.z + fwdZ(P.yaw) * 0.5 - Math.sin(P.yaw) * s * 0.3);
}
function aimDirFrom(o, tgt) {
  const p = tgt ? new V3(tgt.x, tgt.y + tgt.h * 0.55, tgt.z) : aimPoint();
  return p.sub(o).normalize();
}
function faceAim() { const f = camFwd(); P.yaw = yawOf(f.x, f.z); }

// ---------- the frame ----------
function updateHero(dt) {
  if (!P) return;
  const D = P.D;
  P.t += dt;
  for (const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dt);
  P.dodge -= dt; P.invuln -= dt; P.hurtT += dt; P.swingCd -= dt; P.comboWin -= dt; P.landT -= dt;
  if (P.comboWin <= 0) P.comboN = 0;
  if (P.downed) { heroDown(dt); return; }
  // regenerate after a few seconds out of harm's way
  if (P.hurtT > 5 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + dt * P.maxHp * 0.07);
  updatePowersOngoing(dt);
  // the controls, relative to the camera
  const mv = Input.move(), cy = CAM.yaw;
  const fx = fwdX(cy), fz = fwdZ(cy), rx = -fz, rz = fx;
  let wx = fx * -mv.y + rx * mv.x, wz = fz * -mv.y + rz * mv.x;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }
  P.wish = { x: wx, z: wz, l: Math.min(1, wl) };
  // actions
  if (!UI.blockInput()) heroActions(dt);
  switch (P.mode) {
    case 'swing': moveSwing(dt); break;
    case 'wall': moveWall(dt); break;
    case 'fly': moveFly(dt); break;
    case 'water': moveWater(dt); break;
    default: moveGround(dt); break;
  }
  if (P.y < -40) respawnHero(true);
  heroAnim(dt);
  heroFX(dt);
}

// ---------- moving ----------
function moveGround(dt) {
  const D = P.D, w = P.wish, id = P.id;
  const locked = P.act && P.act.lock;
  let top = D.run * (P.rampage > 0 ? 1.25 : 1);
  if (id === 'blitz' && Input.held('travel') && !P.held) { top = 55; P.speedOn = true; } else P.speedOn = false;
  if (P.held) top *= 0.75;
  if (id === 'bulwark' && P.charge > 0) top = 1;
  if (P.act && P.act.slow) top *= P.act.slow;
  const acc = P.onGround ? (P.speedOn ? 26 : 45) : 14;
  if (!locked) {
    let tx = w.x * top * w.l, tz = w.z * top * w.l;
    // at speed, Blitz turns in arcs instead of on the spot
    if (P.speedOn && P.onGround) {
      const sp = Math.hypot(P.vx, P.vz);
      if (sp > 15 && w.l > 0.1) {
        const cur = Math.atan2(P.vz, P.vx), want = Math.atan2(tz, tx), na = cur + clamp(angWrap(want - cur), -dt * 3.2, dt * 3.2);
        const ns = Math.min(top, sp + 40 * dt);
        P.vx = Math.cos(na) * ns; P.vz = Math.sin(na) * ns;
      } else { P.vx = damp(P.vx, tx, acc / 6, dt); P.vz = damp(P.vz, tz, acc / 6, dt); }
    } else if (P.onGround || w.l > 0.05) {
      const k = 1 - Math.exp(-acc / 6 * dt);
      if (P.onGround || Math.hypot(P.vx, P.vz) < top + 1) { P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k; }
      else { P.vx += tx * k * 0.15; P.vz += tz * k * 0.15; }
    }
  }
  P.vy -= GRAV * dt * (P.vy < 0 && Input.held('jump') && P.id === 'skylark' ? 0.35 : 1);
  P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
  const preSp = Math.hypot(P.vx, P.vz);
  resolveHero(dt);
  // Spindle sticks to any wall he walks or falls into
  if (P.touch && id === 'spindle' && !P.held && !(P.wallCd > 0) && P.touch.box.y1 - P.y > 1.6) {
    const into = -(P.wish.x * P.touch.nx + P.wish.z * P.touch.nz);
    if (into > 0.5 || (!P.onGround && into > 0.1)) enterWall(P.touch);
  }
  if (P.wallCd !== undefined) P.wallCd -= dt;
  // Blitz runs straight up a wall at speed
  if (P.touch && id === 'blitz' && P.speedOn && P.touch.box.y1 - P.y > 2) {
    const into = -(P.wish.x * P.touch.nx + P.wish.z * P.touch.nz);
    if ((into > 0.4 && preSp > 10) || into > 0.75) { P.vx = P.wish.x * Math.max(preSp, 20); P.vz = P.wish.z * Math.max(preSp, 20); enterWall(P.touch, true); }
  }
}
// push out of buildings and cars, land on whatever is underneath
function resolveHero(dt) {
  const w = collide(P, P.r, P.h * (P.mode === 'fly' ? 0.6 : 1), 0.7);
  P.touch = w ? { nx: w.nx, nz: w.nz, box: w.box } : null;
  if (w) {
    const vn = P.vx * w.nx + P.vz * w.nz;
    if (vn < 0) { P.vx -= vn * w.nx; P.vz -= vn * w.nz; }
    if (vn < -30 && P.mode !== 'fly') { addShake(0.4); AUDIO.sfx('thud', P.x, P.z); }
  }
  if (!P.held) { const c = carCollide(P, P.r); if (c && P.id === 'bulwark' && Math.hypot(P.vx, P.vz) > 9 && c.state !== 'wreck') hitCar(c, 40, P.vx * 1.2, 8, P.vz * 1.2); }
  // on the water at Blitz speed, or into it
  const land = onLand(P.x, P.z);
  let gy = Math.max(supportY(P.x, P.z, P.y, P.r * 0.7), carSupport(P.x, P.z, P.y));
  if (!land && P.id === 'blitz' && P.speedOn && Math.hypot(P.vx, P.vz) > 18 && P.y <= CITY.WATER_Y + 0.5) { gy = CITY.WATER_Y; if (G.frame % 2 === 0) particle('puff', P.x, gy + 0.2, P.z, { vy: 2, vx: -P.vx * 0.1, vz: -P.vz * 0.1, life: 0.5, size: 1, size1: 0.4, col: 0xe8f4ff }); }
  const was = P.onGround;
  if (P.y <= gy && P.vy <= 0) {
    const impact = -P.vy;
    P.y = gy; P.vy = 0; P.onGround = true; P.jumps = 0;
    if (!was) heroLand(impact);
  } else P.onGround = P.y <= gy + 0.05 && P.vy <= 0;
  if (!land && P.y < CITY.WATER_Y - 0.2 && gy < CITY.WATER_Y - 1) enterWater();
}
function heroLand(impact) {
  P.landT = 0.25;
  if (impact > 14) {
    burst('puff', P.x, P.y + 0.2, P.z, Math.min(18, impact / 2), { speed: impact * 0.25, flat: true, life: 0.6, size: 1.2, size1: 2.4, col: 0xd8d0c0, alpha: 0.7, drag: 3 });
    AUDIO.sfx('land', P.x, P.z);
  }
  // Bulwark's leaps come down like a meteor
  if (P.id === 'bulwark' && (impact > 22 || P.leaping)) {
    const big = P.pounding ? 1.6 : 1;
    heroQuake(P.x, P.z, (7 + Math.min(6, impact / 8)) * big, (18 + impact * 0.5) * big, 16 * big);
    pow(P.x, P.y + 2, P.z, pick(POWS.big), { size: 70 });
  }
  P.leaping = false; P.pounding = false;
}
// a hero's own shockwave: hurts crooks, flips cars
function heroQuake(x, z, r, dmg, kb) {
  const y = P.y;
  ring(x, y + 0.1, z, { r0: 1, r1: r, life: 0.55, col: 0xfff0c0 });
  ring(x, y + 0.15, z, { r0: 0.5, r1: r * 0.6, life: 0.4, col: 0xffffff });
  burst('puff', x, y + 0.3, z, 22, { speed: r * 1.4, flat: true, life: 0.7, size: 1.6, size1: 3, col: 0xd8d0c0, alpha: 0.75, drag: 2.5 });
  debris(x, y + 0.3, z, 16, { speed: r * 0.8, up: 9, size: 0.55 });
  addShake(1.1); AUDIO.sfx('stomp', x, z);
  for (const f of foesNear(x, y + 1, z, r)) { const dx = f.x - x, dz = f.z - z, d = Math.hypot(dx, dz) || 1; damageFoe(f, dmg * (1 - d / r * 0.5), dx / d * kb, kb * 0.8, dz / d * kb, { big: true, word: null }); }
  for (const c of CARS.list) if (c.state !== 'gone' && !c.held && dist(c.x, c.z, x, z) < r * 0.8) hitCar(c, 40, (c.x - x) * 2, 10, (c.z - z) * 2);
  for (const e of PEOPLE.list) if (dist(e.x, e.z, x, z) < r * 0.6 && !e.air) knock(e, (e.x - x) * 0.8, 4, (e.z - z) * 0.8);
  alarm(x, z, 30);
  gainMeter(3);
}

// --- Spindle's web-swing ---
function findAnchor() {
  const f = camFwd(), hl = Math.hypot(f.x, f.z) || 1;
  const hx = f.x / hl, hz = f.z / hl;
  const sp = Math.hypot(P.vx, P.vz);
  const ahead = 14 + Math.min(sp, 40) * 0.3;
  const tx = P.x + hx * ahead + P.vx * 0.15, tz = P.z + hz * ahead + P.vz * 0.15, ty = Math.max(P.y + 22, 30);
  let best = null, bs = 1e9;
  for (const b of queryBoxes(tx - 45, tz - 45, tx + 45, tz + 45, _qb)) {
    if (b.y1 < P.y + 8 || b.kind === 'tree') continue;
    const ax = clamp(tx, b.x0, b.x1), ay = clamp(ty, b.y0, b.y1), az = clamp(tz, b.z0, b.z1);
    if (ay < P.y + 6) continue;
    const hd = dist(ax, az, P.x, P.z);
    const L2 = Math.hypot(ax - P.x, ay - P.y, az - P.z);
    if (hd < 5 || L2 > 70 || L2 < 10) continue;
    // ahead of us, please
    if ((ax - P.x) * hx + (az - P.z) * hz < 2) continue;
    const s = Math.hypot(ax - tx, (ay - ty) * 0.6, az - tz);
    if (s < bs) { bs = s; best = new V3(ax, ay, az); }
  }
  if (best && !losClear(P.x, P.y + 1.4, P.z, best.x - (best.x - P.x) * 0.02, best.y - 0.3, best.z - (best.z - P.z) * 0.02)) best = null;
  return best;
}
function startSwing() {
  const a = findAnchor();
  if (!a) return false;
  P.mode = 'swing'; P.anchor = a;
  // swing about a pivot straight ahead on the line of travel, so the arc runs down the street
  // instead of into the building the web is stuck to (the web is still drawn to the real spot)
  const sp = Math.hypot(P.vx, P.vz), f = camFwd(), ux = sp > 3 ? P.vx / sp : f.x / (Math.hypot(f.x, f.z) || 1), uz = sp > 3 ? P.vz / sp : f.z / (Math.hypot(f.x, f.z) || 1);
  const lx = a.x - P.x, lz = a.z - P.z, along = lx * ux + lz * uz;
  P.pivot = new V3(P.x + ux * along, a.y, P.z + uz * along);
  // the rope is never so long that the bottom of the arc scrapes the street; any slack is reeled in fast
  const pv = P.pivot, d = Math.hypot(pv.x - P.x, pv.y - (P.y + P.h * 0.8), pv.z - P.z), gy = groundY(pv.x, pv.z);
  P.ropeL = d; P.ropeWant = Math.max(8, Math.min(d, (a.y - gy) * 0.55, a.y - gy - 6));
  P.swingT = 0;
  AUDIO.sfx('thwip', P.x, P.z);
  if (P.vy < -5) P.vy *= 0.6;
  return true;
}
function endSwing(boost) {
  P.mode = 'ground'; P.anchor = null;
  if (boost) {
    const sp = Math.hypot(P.vx, P.vz) || 1;
    P.vy = Math.max(P.vy, 0) + 7; P.vx += P.vx / sp * 4; P.vz += P.vz / sp * 4;
    P.jumps = 1;
  }
  P.swingCd = 0.18;
}
function moveSwing(dt) {
  const a = P.pivot, w = P.wish;
  P.swingT += dt;
  // gravity, a push from the controls, reel in a little for height
  P.vy -= GRAV * dt;
  const f = camFwd(), hl = Math.hypot(f.x, f.z) || 1;
  const push = 14 * (w.l > 0.1 ? 1 : 0.3);
  P.vx += (w.l > 0.1 ? w.x : f.x / hl) * push * dt; P.vz += (w.l > 0.1 ? w.z : f.z / hl) * push * dt;
  P.ropeWant = Math.max(8, P.ropeWant - dt * 1.5);
  P.ropeL = Math.max(P.ropeWant, P.ropeL - dt * 45);
  P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
  // the rope: stay within ropeL of the anchor
  const hy = P.y + P.h * 0.8;
  let dx = P.x - a.x, dy = hy - a.y, dz = P.z - a.z;
  const d = Math.hypot(dx, dy, dz);
  if (d > P.ropeL) {
    dx /= d; dy /= d; dz /= d;
    P.x = a.x + dx * P.ropeL; P.y = a.y + dy * P.ropeL - P.h * 0.8; P.z = a.z + dz * P.ropeL;
    const vr = P.vx * dx + P.vy * dy + P.vz * dz;
    if (vr > 0) { P.vx -= vr * dx; P.vy -= vr * dy; P.vz -= vr * dz; }
  }
  const sp = Math.hypot(P.vx, P.vy, P.vz);
  if (sp > 48) { P.vx *= 48 / sp; P.vy *= 48 / sp; P.vz *= 48 / sp; }
  resolveHero(dt);
  if (P.touch && P.touch.box.y1 - P.y > 1.6 && -(w.x * P.touch.nx + w.z * P.touch.nz) > 0.7) { endSwing(false); enterWall(P.touch); return; }
  if (P.onGround) { endSwing(false); return; }
  // past the anchor and climbing: let go with a boost and catch the next line
  const ahead = (P.x - a.x) * P.vx + (P.z - a.z) * P.vz;
  const hs = Math.hypot(P.vx, P.vz);
  if (!Input.held('travel')) { endSwing(true); return; }
  if (ahead > 0 && P.vy > 0 && dy > -0.45 * d && P.swingT > 0.5) { endSwing(true); P.autoSwing = 0.22; return; }
  if (P.swingT > 4 && hs < 3) endSwing(false);
}
// --- Spindle crawling (and Blitz running up a wall) ---
function enterWall(t, run = false) {
  P.mode = 'wall'; P.wall = { nx: t.nx, nz: t.nz, box: t.box, run };
  P.vy = run ? Math.max(P.vy, Math.hypot(P.vx, P.vz) * 0.6, 22) : 0;
  P.vx = P.vz = 0;
  P.yaw = yawOf(-t.nx, -t.nz);
  if (P.anchor) P.anchor = null;
  AUDIO.sfx(run ? 'whoosh' : 'grab', P.x, P.z);
}
function leaveWall(jump) {
  const W = P.wall; P.mode = 'ground'; P.wall = null; P.wallCd = 0.35;
  if (jump) { P.vx = W.nx * 9; P.vz = W.nz * 9; P.vy = 11; P.jumps = 1; P.yaw = yawOf(W.nx, W.nz); }
}
function moveWall(dt) {
  const W = P.wall, b = W.box;
  if (W.run) {
    // straight up at speed while the button is held
    P.vy = Math.max(P.vy - 2 * dt, 26);
    if (!Input.held('travel')) { leaveWall(false); P.vy *= 0.5; P.vx = W.nx * 4; P.vz = W.nz * 4; return; }
    P.y += P.vy * dt;
    if (G.frame % 2 === 0) particle('spark', P.x, P.y, P.z, { vy: -3, life: 0.3, size: 0.7, size1: 0.1, col: 0xffd23a });
  } else {
    const mv = Input.move();
    // up the wall is "forward"; sideways follows the camera's right projected on the wall
    const sx = -W.nz, sz = W.nx;
    const cr = Math.cos(CAM.yaw), cs = -Math.sin(CAM.yaw);
    const side = (cr * sx + cs * sz) >= 0 ? 1 : -1;
    const sp = Input.held('travel') ? 11 : 6;
    P.vy = -mv.y * sp; const lat = mv.x * sp * side;
    P.x += sx * lat * dt; P.z += sz * lat * dt; P.y += P.vy * dt;
    P.crawlPh = (P.crawlPh || 0) + dt * Math.hypot(mv.x, mv.y) * 9;
    if (Input.pressed('jump')) { leaveWall(true); AUDIO.sfx('jump', P.x, P.z); return; }
    if (Input.pressed('down')) { leaveWall(false); return; }
  }
  // stay pressed against the wall; fall off its sides
  const px = clamp(P.x, b.x0, b.x1), pz = clamp(P.z, b.z0, b.z1);
  const onFace = Math.abs(W.nx) > 0.5 ? (P.z > b.z0 - 0.2 && P.z < b.z1 + 0.2) : (P.x > b.x0 - 0.2 && P.x < b.x1 + 0.2);
  if (!onFace) { leaveWall(false); return; }
  P.x = Math.abs(W.nx) > 0.5 ? (W.nx > 0 ? b.x1 : b.x0) + W.nx * P.r : P.x;
  P.z = Math.abs(W.nz) > 0.5 ? (W.nz > 0 ? b.z1 : b.z0) + W.nz * P.r : P.z;
  // the top: vault onto the roof
  if (P.y + P.h * 0.5 > b.y1) {
    P.mode = 'ground'; P.wall = null; P.y = b.y1 + 0.05; P.x -= W.nx * 1.2; P.z -= W.nz * 1.2; P.vy = W.run ? 9 : 4; P.vx = -W.nx * 3; P.vz = -W.nz * 3; P.onGround = false;
    if (W.run) { P.vx = -W.nx * 12; P.vz = -W.nz * 12; }
    return;
  }
  // the bottom
  const gy = supportY(P.x - W.nx * 0.5, P.z - W.nz * 0.5, P.y, 0.2);
  if (P.y < gy) { P.y = gy; if (!W.run && Input.move().y > 0.3) leaveWall(false); }
  P.onGround = false;
  P.yaw = yawOf(-W.nx, -W.nz);
}
// --- Skylark and Equinox in the air ---
function startFly() { P.mode = 'fly'; P.flyBoost = 0; P.vy = Math.max(P.vy, 8); AUDIO.sfx(P.id === 'equinox' ? 'flame' : 'whoosh', P.x, P.z); }
function endFly() { P.mode = 'ground'; P.onGround = false; }
function moveFly(dt) {
  const fire = P.id === 'equinox';
  const mv = Input.move(), f = camFwd();
  const rx = -fwdZ(CAM.yaw), rz = fwdX(CAM.yaw);
  let wx = f.x * -mv.y + rx * mv.x, wy = f.y * -mv.y, wz = f.z * -mv.y + rz * mv.x;
  if (Input.held('jump')) wy += 1;
  if (Input.held('down')) wy -= 1;
  const l = Math.hypot(wx, wy, wz);
  if (l > 1) { wx /= l; wy /= l; wz /= l; }
  // pushing forward builds speed
  if (mv.y < -0.5) P.flyBoost = Math.min(1, P.flyBoost + dt * (Input.held('travel') ? 1.2 : 0.45)); else P.flyBoost = Math.max(0, P.flyBoost - dt * 1.5);
  const base = fire ? 14 : 18, max = fire ? 34 : 64;
  const sp = lerp(base, max, P.flyBoost * P.flyBoost) * (P.act && P.act.slow ? P.act.slow : 1);
  const k = 1 - Math.exp(-dt * (P.flyBoost > 0.5 ? 2.5 : 4));
  P.vx += (wx * sp - P.vx) * k; P.vy += (wy * sp - P.vy) * k + (l < 0.05 ? Math.sin(P.t * 2) * 0.02 : 0); P.vz += (wz * sp - P.vz) * k;
  P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
  if (P.y > 520) { P.y = 520; P.vy = Math.min(0, P.vy); }
  const prevGround = P.onGround;
  resolveHero(dt);
  if (P.onGround) {
    P.vy = 0;
    // touch down when slow and heading down
    if (Input.held('down') || (!prevGround && Math.hypot(P.vx, P.vz) < 6 && wy < -0.3)) { endFly(); P.onGround = true; }
  }
}
// --- in the bay ---
function enterWater() {
  if (P.mode === 'fly') return;
  P.mode = 'water'; P.vy = 0; splash(P.x, P.z); P.anchor = null; P.wall = null;
}
function moveWater(dt) {
  const w = P.wish;
  P.vx = damp(P.vx, w.x * 4, 3, dt); P.vz = damp(P.vz, w.z * 4, 3, dt);
  P.x += P.vx * dt; P.z += P.vz * dt;
  P.y = CITY.WATER_Y - P.h * 0.55;
  P.ph += dt * 4;
  collide(P, P.r, P.h, 0);
  // climb out at the sea wall or a pier
  const nearLand = onLand(P.x + w.x * 1.5, P.z + w.z * 1.5);
  if (Input.pressed('jump') && nearLand) { P.mode = 'ground'; P.vy = 12; P.vx = w.x * 6; P.vz = w.z * 6; AUDIO.sfx('splash', P.x, P.z); }
  if ((P.id === 'skylark' || P.id === 'equinox') && Input.pressed('travel')) { P.y = CITY.WATER_Y; startFly(); }
  if (P.id === 'blitz' && Input.held('travel') && w.l > 0.5) { P.mode = 'ground'; P.y = CITY.WATER_Y; P.vy = 6; P.vx = w.x * 25; P.vz = w.z * 25; P.speedOn = true; }
  if (G.frame % 8 === 0) ring(P.x, CITY.WATER_Y + 0.05, P.z, { r0: 0.5, r1: 2, life: 0.8, col: 0xe8f4ff, alpha: 0.6 });
  P.onGround = false;
}

// ---------- actions ----------
function heroActions(dt) {
  const id = P.id;
  // the travel power
  if (id === 'spindle') {
    if (P.mode !== 'swing' && P.mode !== 'wall' && P.mode !== 'water' && Input.held('travel') && P.swingCd <= 0 && !P.held) {
      if (P.onGround && Input.pressed('travel')) { P.vy = 17; P.onGround = false; P.y += 0.1; AUDIO.sfx('thwip', P.x, P.z); P.swingCd = 0.35; }
      else if (!P.onGround && (P.vy < 4 || P.autoSwing !== undefined)) startSwing();
    }
    if (P.autoSwing !== undefined) { P.autoSwing -= dt; if (P.autoSwing <= 0) P.autoSwing = undefined; }
    if (P.mode === 'wall' && Input.pressed('travel') && !Input.held('fwd')) { /* crawl faster while held */ }
  }
  // fliers take off with the travel button and hold it to go faster; they land by coming down onto something with C
  if ((id === 'skylark' || id === 'equinox') && Input.pressed('travel') && P.mode !== 'water' && P.mode !== 'fly') startFly();
  if (id === 'bulwark') {
    if (Input.held('travel') && P.onGround && !P.held) { P.charge = Math.min(1, P.charge + dt * 1.1); if (G.frame % 4 === 0) particle('puff', P.x + rr(-1, 1), P.y + 0.1, P.z + rr(-1, 1), { vy: 1, life: 0.5, size: 0.8, size1: 1.5, col: 0xd8d0c0, alpha: 0.6 }); }
    else if (P.charge > 0) {
      const c = P.charge, f = camFwd(), hl = Math.hypot(f.x, f.z) || 1;
      if (P.onGround) {
        P.vx = f.x / hl * (16 + 34 * c); P.vz = f.z / hl * (16 + 34 * c); P.vy = 13 + 22 * c + Math.max(0, f.y) * 20;
        P.onGround = false; P.leaping = true; P.yaw = yawOf(f.x, f.z);
        heroQuake(P.x, P.z, 3 + c * 3, 5, 6);
        AUDIO.sfx('leap', P.x, P.z);
      }
      P.charge = 0;
    }
  }
  // jumping
  if (Input.pressed('jump') && P.mode === 'ground') {
    if (P.onGround) { P.vy = P.D.jump * (P.rampage > 0 ? 1.3 : 1); P.onGround = false; P.jumps = 1; AUDIO.sfx('jump', P.x, P.z); }
    else if (P.jumps < 2 && (id === 'spindle' || id === 'blitz')) { P.vy = P.D.jump * 0.85; P.jumps = 2; P.flip = 0.5; AUDIO.sfx('jump', P.x, P.z); }
    else if (id === 'skylark' || id === 'equinox') startFly();
  }
  // dodge
  if (Input.pressed('down') && P.mode === 'ground' && P.onGround && P.dodge < -0.3) {
    const w = P.wish, dx = w.l > 0.2 ? w.x : -fwdX(P.yaw), dz = w.l > 0.2 ? w.z : -fwdZ(P.yaw);
    P.vx = dx * 22; P.vz = dz * 22; P.dodge = 0.4; P.dodgeDir = yawOf(dx, dz);
    AUDIO.sfx('whoosh', P.x, P.z);
  }
  if (Input.pressed('atk')) melee();
  if (Input.pressed('rmb') || (Input.held('rmb') && (id === 'spindle' || id === 'skylark'))) ranged();
  if (Input.pressed('q') || (id === 'skylark' && Input.held('q') && P.beam > 0)) powerQ();
  if (Input.pressed('e')) powerE();
  if (Input.pressed('ult')) ultimate();
  // a melee strike in progress
  if (P.act) { P.act.t += dt; if (P.act.kind === 'melee') meleeStep(dt); else if (P.act.t > P.act.dur) P.act = null; }
}

// --- melee: lunge to the nearest crook in the direction you're pushing, three hits and a finisher ---
function meleeTarget() {
  const w = P.wish, dx = w.l > 0.2 ? w.x : fwdX(CAM.yaw), dz = w.l > 0.2 ? w.z : fwdZ(CAM.yaw);
  let best = null, bs = 1e9;
  for (const f of FOES.list) {
    if (f.dead || f.ko) continue;
    const ox = f.x - P.x, oz = f.z - P.z, oy = (f.y + f.h * 0.5) - (P.y + P.h * 0.5), d = Math.hypot(ox, oy, oz);
    if (d > 11 + f.r) continue;
    if (Math.abs(oy) > 4 && P.onGround) continue;
    const s = d - ((ox * dx + oz * dz) / (Math.hypot(ox, oz) || 1)) * 5;
    if (s < bs) { bs = s; best = f; }
  }
  if (!best) for (const c of CARS.list) if (c.crew && c.state !== 'gone' && dist(c.x, c.z, P.x, P.z) < 14 && Math.abs(c.y - P.y) < 4) best = c;
  return best;
}
function melee() {
  if (P.held) { throwHeld(); return; }
  if (P.act && P.act.kind === 'melee' && P.act.t < 0.2) { P.act.queued = true; return; }
  if (P.act && P.act.kind !== 'melee' && P.act.t < P.act.dur * 0.6) return;
  const tgt = meleeTarget();
  const n = P.comboN % 4;
  P.act = { kind: 'melee', n, t: 0, tgt, struck: false, lunge: tgt ? 0.35 : 0, dur: n === 3 ? 0.42 : 0.3, lock: true };
  P.comboN++; P.comboWin = 0.9;
  if (tgt) P.yaw = yawOf(tgt.x - P.x, tgt.z - P.z);
  else if (P.wish.l > 0.2) P.yaw = yawOf(P.wish.x, P.wish.z);
  AUDIO.sfx('swish', P.x, P.z);
}
function meleeStep(dt) {
  const A = P.act, tgt = A.tgt && !A.tgt.dead ? A.tgt : null;
  const reach = (P.id === 'bulwark' ? 2.4 : 1.7) * (P.rampage > 0 ? 1.4 : 1);
  if (tgt && !A.struck) {
    const dx = tgt.x - P.x, dz = tgt.z - P.z, dy = (tgt.y + tgt.h * 0.4) - (P.y + P.h * 0.4), d = Math.hypot(dx, dz) - (tgt.kind === 'car' ? 1.2 : 0);
    P.yaw = yawOf(dx, dz);
    if (d > reach + tgt.r && A.lunge > 0) {
      // zip in
      const sp = P.id === 'blitz' ? 45 : 28;
      const step = Math.min(sp * dt, d - reach - tgt.r + 0.2);
      P.x += dx / d * step; P.z += dz / d * step;
      if (!P.onGround || Math.abs(dy) > 1) { P.y += clamp(dy, -sp * dt, sp * dt); P.vy = 0; }
      P.vx = dx / d * 4; P.vz = dz / d * 4;
      A.lunge -= dt; A.t = Math.min(A.t, 0.06);
      if (G.frame % 2 === 0 && P.id === 'blitz') particle('spark', P.x, P.y + 1, P.z, { life: 0.25, size: 1.2, size1: 0.2, col: 0xffd23a });
      return;
    }
  }
  if (!A.struck && A.t > 0.08) {
    A.struck = true;
    const fin = A.n === 3, D = P.D;
    const fx = fwdX(P.yaw), fz = fwdZ(P.yaw);
    const dmg = D.melee * (fin ? 1.8 : 1) * (P.rampage > 0 ? 1.6 : 1);
    const kb = (fin ? 15 : 3.5) * (P.id === 'bulwark' ? 1.8 : 1) * (P.rampage > 0 ? 1.6 : 1);
    let hits = 0;
    if (tgt && tgt.kind === 'car') { hitCar(tgt, dmg * 1.5, fx * kb, kb * 0.4, fz * kb); hits++; }
    for (const f of FOES.list) {
      if (f.dead || f.ko) continue;
      const ox = f.x - P.x, oz = f.z - P.z, oy = (f.y + f.h * 0.5) - (P.y + P.h * 0.5), d = Math.hypot(ox, oz);
      if (d > reach + f.r + 0.4 || Math.abs(oy) > Math.max(2, f.h * 0.6)) continue;
      if (d > 0.5 && (ox * fx + oz * fz) / d < 0.2 && f !== tgt) continue;
      damageFoe(f, dmg, fx * kb, fin ? kb * 0.55 : 1.5, fz * kb, { big: fin, word: P.id === 'blitz' && !fin ? 'wind' : 'punch' });
      hits++;
    }
    if (hits) { gainMeter(fin ? 6 : 3); comboHit(hits); if (fin) { G.slow = Math.max(G.slow, 0.08); addShake(0.35); } else addShake(0.12); }
    else {
      // nothing to hit but a car? Give it a dent (Bulwark sends it flying)
      const c = nearestCar(P.x + fx * 2, P.z + fz * 2, 2.6);
      if (c && Math.abs(c.y - P.y) < 2) hitCar(c, P.id === 'bulwark' ? 60 : 12, fx * (P.id === 'bulwark' ? 26 : 3), P.id === 'bulwark' ? 10 : 0, fz * (P.id === 'bulwark' ? 26 : 3));
    }
  }
  if (A.t > A.dur) { const q = A.queued; P.act = null; if (q) melee(); }
}

// --- the ranged power ---
function ranged() {
  if (P.cds.rmb > 0 || P.downed) return;
  const id = P.id, D = P.D;
  if (P.act && P.act.kind === 'melee' && !P.act.struck) return;
  const tgt = aimTarget(id === 'blitz' ? 35 : 80, id === 'blitz' ? 0.3 : 0.16);
  P.cds.rmb = D.rmb.cd;
  if (P.mode !== 'wall') faceAim();
  if (id === 'spindle') {
    const o = handPos(P.shotSide = !P.shotSide), d = aimDirFrom(o, tgt);
    spawnProj({ owner: 'hero', kind: 'web', x: o.x, y: o.y, z: o.z, vx: d.x * 75, vy: d.y * 75, vz: d.z * 75, life: 1.4, r: 0.6, dmg: 5, target: tgt });
    AUDIO.sfx('thwip', P.x, P.z);
    P.act = { kind: 'cast', t: 0, dur: 0.2, left: P.shotSide, slow: 0.8 };
  } else if (id === 'skylark') {
    const o = handPos(P.shotSide = !P.shotSide), d = aimDirFrom(o, tgt);
    spawnProj({ owner: 'hero', kind: 'bolt', x: o.x, y: o.y, z: o.z, vx: d.x * 85, vy: d.y * 85, vz: d.z * 85, life: 1.2, r: 0.7, dmg: 9, target: tgt, homing: tgt ? 6 : 0 });
    AUDIO.sfx('bolt', P.x, P.z);
    P.act = { kind: 'cast', t: 0, dur: 0.18, left: P.shotSide, slow: 0.85 };
  } else if (id === 'equinox') {
    const o = handPos(true), d = aimDirFrom(o, tgt);
    spawnProj({ owner: 'hero', kind: 'fire', x: o.x, y: o.y, z: o.z, vx: d.x * 48, vy: d.y * 48, vz: d.z * 48, life: 1.8, r: 0.7, dmg: 14, target: tgt, homing: tgt ? 2 : 0 });
    AUDIO.sfx('flame', P.x, P.z);
    P.act = { kind: 'cast', t: 0, dur: 0.3, left: true, slow: 0.7 };
  } else if (id === 'blitz') {
    if (tgt && tgt.kind === 'car') { trail(P.x, P.y + 1, P.z, tgt.x, tgt.y + 1, tgt.z); P.x = tgt.x - fwdX(tgt.yaw) * (tgt.l / 2 + 1); P.z = tgt.z - fwdZ(tgt.yaw) * (tgt.l / 2 + 1); hitCar(tgt, 22, fwdX(tgt.yaw) * 4, 2, fwdZ(tgt.yaw) * 4); }
    else if (tgt) blurTo(tgt);
    else { const f = camFwd(), hl = Math.hypot(f.x, f.z) || 1; const nx = P.x + f.x / hl * 12, nz = P.z + f.z / hl * 12; trail(P.x, P.y + 1, P.z, nx, P.y + 1, nz); P.x = nx; P.z = nz; resolveHero(0); AUDIO.sfx('whoosh', P.x, P.z); }
  } else if (id === 'bulwark') {
    if (P.held) throwHeld();
    else {
      const c = nearestCar(P.x, P.z, 7, (c) => c.state !== 'flying' && Math.abs(c.y - P.y) < 2);
      if (c) grabCar(c);
      else {
        // tear a slab out of the street and throw it
        const o = new V3(P.x, P.y + P.h + 0.6, P.z), d = aimDirFrom(o, tgt);
        spawnProj({ owner: 'hero', kind: 'rock', x: o.x, y: o.y, z: o.z, vx: d.x * 42, vy: d.y * 42 + 3, vz: d.z * 42, life: 3, r: 1, dmg: 32, grav: 10, target: tgt });
        debris(P.x + fwdX(P.yaw), P.y + 0.2, P.z + fwdZ(P.yaw), 6, { speed: 3, up: 5, size: 0.4 });
        AUDIO.sfx('crunch', P.x, P.z);
        P.act = { kind: 'cast', t: 0, dur: 0.4, both: true, lift: true, slow: 0.5 };
      }
    }
  }
}
function trail(ax, ay, az, bx, by, bz) {
  beam(new V3(ax, ay, az), new V3(bx, by, bz), { w: 0.8, col: 0xffd23a, life: 0.25, add: true });
  beam(new V3(ax, ay + 0.3, az), new V3(bx, by + 0.3, bz), { w: 0.25, col: 0xff4020, life: 0.35, add: true, jag: 0.4 });
}
function blurTo(tgt) {
  const dx = P.x - tgt.x, dz = P.z - tgt.z, d = Math.hypot(dx, dz) || 1;
  const nx = tgt.x + dx / d * (tgt.r + 1), nz = tgt.z + dz / d * (tgt.r + 1), ny = Math.max(tgt.y, supportY(nx, nz, tgt.y + 1));
  trail(P.x, P.y + 1, P.z, nx, ny + 1, nz);
  P.x = nx; P.z = nz; P.y = ny; P.vx = P.vz = 0; P.vy = 0;
  P.yaw = yawOf(tgt.x - P.x, tgt.z - P.z);
  damageFoe(tgt, 14, -dx / d * 9, 4, -dz / d * 9, { word: 'wind', big: true, stun: 0.6 });
  gainMeter(4); comboHit(1);
  AUDIO.sfx('whoosh', P.x, P.z);
  P.act = { kind: 'melee', n: 3, t: 0.2, tgt: null, struck: true, dur: 0.3, lock: true };
}

// --- Bulwark's cars ---
function grabCar(c) {
  c.held = true; c.state = 'held'; c.holder = P; P.held = c;
  if (c.crew) bus.emit('getawayStopped', c);
  P.act = { kind: 'cast', t: 0, dur: 0.35, both: true, lift: true };
  AUDIO.sfx('clang', c.x, c.z);
  pow(c.x, c.y + 2, c.z, 'HNNGH!', { size: 40, col: '#4ad860' });
}
function holdCar(dt) {
  const c = P.held;
  c.x = P.x; c.z = P.z; c.y = P.y + P.h + 0.3; c.yaw = P.yaw + Math.PI / 2; c.pitch = 0; c.roll = 0;
  c.root.position.set(c.x, c.y, c.z); c.root.rotation.set(0, c.yaw, 0);
}
function throwHeld() {
  const c = P.held; if (!c) return;
  faceAim();
  const tgt = aimTarget(90, 0.22), o = new V3(P.x, P.y + P.h + 1, P.z), d = aimDirFrom(o, tgt);
  c.held = false; c.holder = null; P.held = null;
  c.x = o.x + d.x * 1.5; c.z = o.z + d.z * 1.5; c.y = o.y;
  launchCar(c, d.x * 45, d.y * 45 + 5, d.z * 45);
  c.thrown = true; c.thrownBy = P;
  P.act = { kind: 'cast', t: 0, dur: 0.35, both: true };
  AUDIO.sfx('swingBig', P.x, P.z);
  P.cds.rmb = 0.5;
}
function dropHeld() { const c = P.held; if (!c) return; c.held = false; c.holder = null; P.held = null; launchCar(c, 0, 2, 0); }

// --- Q ---
function powerQ() {
  const id = P.id, D = P.D;
  if (id === 'skylark' && P.beam > 0) return;
  if (P.cds.q > 0) { if (Input.pressed('q')) HUD.cooldownBlink('q'); return; }
  faceAim();
  if (id === 'spindle') {
    const tgt = aimTarget(40, 0.25);
    if (!tgt) {
      // no one to yank: zip to where you're looking
      const a = aimPoint(60);
      if (dist3(a, P) > 4) { webLine(a, 0.25); P.vx = (a.x - P.x) * 1.6; P.vy = (a.y - P.y) * 1.6 + 6; P.vz = (a.z - P.z) * 1.6; P.mode = 'ground'; P.onGround = false; P.cds.q = 1; AUDIO.sfx('thwip', P.x, P.z); }
      return;
    }
    P.cds.q = D.q.cd;
    webLine(tgt, 0.3);
    AUDIO.sfx('thwip', P.x, P.z);
    if (tgt.boss) { P.vx = (tgt.x - P.x) * 2; P.vy = 8 + (tgt.y - P.y); P.vz = (tgt.z - P.z) * 2; P.onGround = false; P.mode = 'ground'; return; }
    if (tgt.hasGun) { tgt.hasGun = false; tgt.gun = false; tgt.T = Object.assign({}, tgt.T, { reach: 1.5, dmg: 5 }); pow(tgt.x, tgt.y + tgt.h + 0.4, tgt.z, 'YOINK!', { col: '#ffffff', size: 44 }); damageFoe(tgt, 4, 0, 0, 0, { word: null, status: { web: 1 } }); if (tgt.M) tgt.M.bones[B.prop].scale.setScalar(0.001); return; }
    const dx = P.x - tgt.x, dz = P.z - tgt.z, d = Math.hypot(dx, dz) || 1;
    if (tgt.flying) { damageFoe(tgt, 999, dx, 0, dz, { word: 'web' }); return; }
    damageFoe(tgt, 6, dx / d * Math.min(26, d * 1.6), 7, dz / d * Math.min(26, d * 1.6), { word: 'web', stun: 1.2 });
    P.act = { kind: 'cast', t: 0, dur: 0.3, left: false };
  } else if (id === 'skylark') {
    if (!Input.pressed('q')) return;
    P.beam = 2.6; P.cds.q = D.q.cd + 2.6;
    AUDIO.sfx('beamStart', P.x, P.z);
  } else if (id === 'blitz') {
    P.cds.q = D.q.cd;
    P.whirl = 2.6;
    const c = { x: P.x, y: P.y, z: P.z };
    for (const f of foesNear(P.x, P.y + 1, P.z, 10)) {
      if (f.boss) { damageFoe(f, 25, 0, 0, 0, { word: 'wind', stun: 1 }); continue; }
      f.lift = rr(1.8, 2.4); f.liftC = c; f.liftA = Math.atan2(f.z - P.z, f.x - P.x); f.t = 0; f.state = 'lifted'; f.air = false;
      damageFoe(f, 8, 0, 0, 0, { word: 'wind', lift: true });
    }
    pow(P.x, P.y + 3, P.z, pick(POWS.wind), { size: 56 });
    AUDIO.sfx('tornado', P.x, P.z);
    gainMeter(5);
  } else if (id === 'bulwark') {
    P.cds.q = D.q.cd;
    if (!P.onGround && P.y - supportY(P.x, P.z, P.y) > 3) { P.vy = -55; P.vx *= 0.2; P.vz *= 0.2; P.pounding = true; P.leaping = true; AUDIO.sfx('whoosh', P.x, P.z); }
    else { heroQuake(P.x, P.z, 9, 26, 14); P.act = { kind: 'cast', t: 0, dur: 0.5, slam: true, lock: true }; pow(P.x, P.y + 3, P.z, pick(POWS.big), { size: 64 }); }
  } else if (id === 'equinox') {
    P.cds.q = D.q.cd;
    // a lance of ice: everything along the line freezes
    const o = handPos(false), tgt = aimTarget(60, 0.2), d = aimDirFrom(o, tgt);
    const maxd = Math.min(60, raycast(o.x, o.y, o.z, d.x, d.y, d.z, 60));
    const end = o.clone().addScaledVector(d, maxd);
    beam(o, end, { w: 0.5, col: 0x80e8ff, life: 0.35, add: true });
    beam(o, end, { w: 0.15, col: 0xffffff, life: 0.35, add: true });
    for (let s = 2; s < maxd; s += 3) particle('spark', o.x + d.x * s, o.y + d.y * s, o.z + d.z * s, { vy: rr(-1, 1), life: 0.6, size: 0.8, size1: 0.2, col: pick([0xa8f0ff, 0xffffff]) });
    for (const f of FOES.list) {
      if (f.dead || f.ko) continue;
      const fx = f.x - o.x, fy = f.y + f.h * 0.5 - o.y, fz = f.z - o.z, t = fx * d.x + fy * d.y + fz * d.z;
      if (t < 0 || t > maxd) continue;
      const px = o.x + d.x * t - f.x, py = o.y + d.y * t - (f.y + f.h * 0.5), pz = o.z + d.z * t - f.z;
      if (Math.hypot(px, py, pz) < 1.3 + f.r) { damageFoe(f, 6, 0, 0, 0, { word: null, status: { freeze: 4.5 } }); }
    }
    AUDIO.sfx('freeze', P.x, P.z);
    P.act = { kind: 'cast', t: 0, dur: 0.35, left: false, slow: 0.5 };
  }
}
function webLine(t, life) {
  const o = handPos(false), tg = t.h !== undefined ? new V3(t.x, t.y + t.h * 0.6, t.z) : t;
  beam(o, tg, { w: 0.06, col: 0xffffff, life, follow: t.h !== undefined ? () => [handPos(false), new V3(t.x, t.y + t.h * 0.6, t.z)] : null });
}

// --- E ---
function powerE() {
  const id = P.id, D = P.D;
  if (P.cds.e > 0) { HUD.cooldownBlink('e'); return; }
  P.cds.e = D.e.cd;
  if (id === 'spindle') {
    const c = new V3(P.x, P.y + 1, P.z);
    burst('web', c.x, c.y, c.z, 6, { speed: 12, life: 0.4, size: 1.5, size1: 4, col: 0xffffff, alpha: 0.9 });
    ring(c.x, P.y + 0.2, c.z, { r0: 1, r1: 10, life: 0.4 });
    for (const f of foesNear(c.x, c.y, c.z, 10)) { if (f.boss) damageFoe(f, 25, 0, 0, 0, { word: 'web', stun: 1.5 }); else bindFoe(f, 'web'); }
    pow(c.x, c.y + 2, c.z, 'THWAPP!', { col: '#ffffff', size: 60 });
    AUDIO.sfx('webBomb', P.x, P.z);
    P.act = { kind: 'cast', t: 0, dur: 0.4, both: true };
    gainMeter(6);
  } else if (id === 'skylark') {
    // sonic boom: a dash along the aim line, bowling over everyone on it
    const f = camFwd(), o = new V3(P.x, P.y + 1, P.z);
    const L2 = Math.min(26, raycast(o.x, o.y, o.z, f.x, f.y, f.z, 26) - 1);
    const end = o.clone().addScaledVector(f, Math.max(0, L2));
    for (const fo of FOES.list) {
      if (fo.dead || fo.ko) continue;
      const fx = fo.x - o.x, fy = fo.y + 1 - o.y, fz = fo.z - o.z, t = clamp(fx * f.x + fy * f.y + fz * f.z, 0, L2);
      if (Math.hypot(o.x + f.x * t - fo.x, o.y + f.y * t - fo.y - 1, o.z + f.z * t - fo.z) < 3.5) {
        const side = Math.sign((fo.x - o.x) * -f.z + (fo.z - o.z) * f.x) || 1;
        damageFoe(fo, 22, (-f.z * side * 12 + f.x * 8), 8, (f.x * side * 12 + f.z * 8), { big: true, word: 'wind' });
      }
    }
    beam(o, end, { w: 2.2, col: 0xa0d8ff, life: 0.35, add: true });
    ring(o.x, o.y, o.z, { r0: 1, r1: 5, life: 0.35, flat: false });
    ring(end.x, end.y, end.z, { r0: 1, r1: 7, life: 0.45, flat: false });
    P.x = end.x; P.y = end.y - 1; P.z = end.z;
    const sp = P.mode === 'fly' ? 50 : 20; P.vx = f.x * sp; P.vy = f.y * sp; P.vz = f.z * sp;
    if (P.mode !== 'fly') { P.mode = 'fly'; P.flyBoost = 0.6; }
    P.flyBoost = Math.max(P.flyBoost, 0.8);
    AUDIO.sfx('boom', P.x, P.z); addShake(0.4);
    gainMeter(4);
  } else if (id === 'blitz') {
    P.lap = 1.3; P.lapC = { x: P.x, z: P.z, y: P.y }; P.lapA = Math.atan2(P.z - P.lapC.z, P.x - P.lapC.x); P.lapHits = new Map();
    AUDIO.sfx('whoosh', P.x, P.z);
  } else if (id === 'bulwark') {
    const fx = fwdX(CAM.yaw), fz = fwdZ(CAM.yaw); P.yaw = CAM.yaw;
    P.act = { kind: 'cast', t: 0, dur: 0.5, clap: true, lock: true };
    for (const f of FOES.list) {
      if (f.dead || f.ko) continue;
      const ox = f.x - P.x, oz = f.z - P.z, d = Math.hypot(ox, oz);
      if (d > 16 || d < 0.1 || (ox * fx + oz * fz) / d < 0.5) continue;
      damageFoe(f, 20 * (1 - d / 24), ox / d * 26 * (1 - d / 30), 9, oz / d * 26 * (1 - d / 30), { big: true, word: 'big' });
    }
    for (const c of CARS.list) { if (c.state === 'gone' || c.held) continue; const ox = c.x - P.x, oz = c.z - P.z, d = Math.hypot(ox, oz); if (d < 14 && d > 0.1 && (ox * fx + oz * fz) / d > 0.5) hitCar(c, 50, ox / d * 22, 9, oz / d * 22); }
    for (const e of PEOPLE.list) { const ox = e.x - P.x, oz = e.z - P.z, d = Math.hypot(ox, oz); if (d < 10 && d > 0.1 && (ox * fx + oz * fz) / d > 0.5 && !e.air) knock(e, ox / d * 8, 4, oz / d * 8); }
    const cx = P.x + fx * 1.5, cz = P.z + fz * 1.5;
    ring(cx, P.y + 1.6, cz, { r0: 0.5, r1: 6, life: 0.4, flat: false });
    burst('puff', cx, P.y + 1.4, cz, 20, { speed: 14, vx: fx * 18, vz: fz * 18, life: 0.6, size: 1.2, size1: 3, col: 0xf0f0f0, alpha: 0.6, drag: 3 });
    pow(cx, P.y + 2.5, cz, 'KLAP!', { size: 70 });
    AUDIO.sfx('clap', P.x, P.z); addShake(0.8);
    alarm(P.x, P.z, 25);
    gainMeter(5);
  } else if (id === 'equinox') {
    const tgt = aimTarget(70, 0.25);
    let p = tgt ? new V3(tgt.x, tgt.y, tgt.z) : aimPoint(70);
    p.y = supportY(p.x, p.z, p.y + 1);
    P.pillar = { x: p.x, y: p.y, z: p.z, t: 0 };
    ring(p.x, p.y + 0.1, p.z, { r0: 4, r1: 3.5, life: 0.5, col: 0xff8a20 });
    P.act = { kind: 'cast', t: 0, dur: 0.5, both: true, slow: 0.5 };
    faceAim();
    AUDIO.sfx('flame', P.x, P.z);
  }
}

// --- R ---
function ultimate() {
  if (P.meter < 100 && !G.god) { HUD.cooldownBlink('r'); return; }
  P.meter = 0;
  const id = P.id;
  flash(0.4);
  HUD.banner(P.D.r.name.toUpperCase() + '!', P.D.color);
  if (id === 'spindle') {
    for (const f of foesNear(P.x, P.y + 1, P.z, 32)) { webLine(f, 0.5); if (f.boss) damageFoe(f, 90, 0, 0, 0, { word: 'web', stun: 3, big: true }); else bindFoe(f, 'web'); }
    burst('web', P.x, P.y + 1, P.z, 12, { speed: 22, life: 0.6, size: 2, size1: 6, col: 0xffffff, alpha: 0.9 });
    AUDIO.sfx('webBomb', P.x, P.z);
  } else if (id === 'skylark') {
    P.act = { kind: 'cast', t: 0, dur: 1, nova: true, lock: true };
    for (const f of foesNear(P.x, P.y + 1, P.z, 28)) { const dx = f.x - P.x, dz = f.z - P.z, d = Math.hypot(dx, dz) || 1; damageFoe(f, f.boss ? 130 : 70, dx / d * 22, 12, dz / d * 22, { big: true, word: 'big' }); }
    for (const c of CARS.list) if (c.state !== 'gone' && !c.held && dist(c.x, c.z, P.x, P.z) < 22) hitCar(c, 100, (c.x - P.x) * 1.5, 14, (c.z - P.z) * 1.5);
    burst('spark', P.x, P.y + 1, P.z, 120, { speed: 30, life: 0.8, size: 2, size1: 0.3, col: [0xffe060, 0xffffff, 0x80c0ff], drag: 2 });
    ring(P.x, P.y + 1, P.z, { r0: 2, r1: 30, life: 0.8, flat: false, col: 0xffe8a0 }); ring(P.x, P.y + 0.2, P.z, { r0: 2, r1: 28, life: 0.7, col: 0xffffff });
    flash(1); addShake(2); AUDIO.sfx('nova', P.x, P.z);
    alarm(P.x, P.z, 40);
  } else if (id === 'blitz') {
    G.speedForce = 8;
    AUDIO.sfx('slowmo', P.x, P.z);
  } else if (id === 'bulwark') {
    P.rampage = 10; G.rampage = true;
    AUDIO.sfx('roar', P.x, P.z);
    heroQuake(P.x, P.z, 10, 20, 14);
  } else if (id === 'equinox') {
    P.zero = 1.4;
    for (const f of foesNear(P.x, P.y + 1, P.z, 24)) { if (f.boss) { f.frozen = 1.4; } else damageFoe(f, 1, 0, 0, 0, { word: null, status: { freeze: 3 } }); }
    ring(P.x, P.y + 0.2, P.z, { r0: 1, r1: 24, life: 1.2, col: 0xa8f0ff });
    burst('spark', P.x, P.y + 1, P.z, 90, { speed: 24, flat: true, life: 1, size: 1.2, size1: 0.3, col: [0xa8f0ff, 0xffffff], drag: 2 });
    AUDIO.sfx('freeze', P.x, P.z);
  }
}

// powers that last a while: the sunbeam, the whirlwind, the lightning lap, the fire pillar, rampage, absolute zero, speed force
function updatePowersOngoing(dt) {
  if (P.held) holdCar(dt);
  if (G.speedForce > 0) { G.speedForce -= dt; if (G.speedForce <= 0) G.speedForce = 0; }
  if (P.beam > 0) {
    P.beam -= dt;
    if (!Input.held('q') && P.beam < 2.4) P.beam = 0;
    faceAim();
    const o = handPos(false), tgt = aimTarget(70, 0.12), d = aimDirFrom(o, tgt);
    o.x = P.x + fwdX(P.yaw) * 0.6; o.z = P.z + fwdZ(P.yaw) * 0.6;
    const L2 = Math.min(70, raycast(o.x, o.y, o.z, d.x, d.y, d.z, 70));
    const end = o.clone().addScaledVector(d, L2);
    beam(o, end, { w: 0.9, col: 0xffc840, life: 0.04, add: true });
    beam(o, end, { w: 0.3, col: 0xffffff, life: 0.04, add: true });
    if (G.frame % 2 === 0) burst('spark', end.x, end.y, end.z, 3, { speed: 5, life: 0.3, size: 0.8, col: [0xffe060, 0xffffff] });
    for (const f of FOES.list) {
      if (f.dead || f.ko) continue;
      const fx = f.x - o.x, fy = f.y + f.h * 0.5 - o.y, fz = f.z - o.z, t = fx * d.x + fy * d.y + fz * d.z;
      if (t < 0 || t > L2) continue;
      if (Math.hypot(o.x + d.x * t - f.x, o.y + d.y * t - f.y - f.h * 0.5, o.z + d.z * t - f.z) < 1.2 + f.r) {
        f.beamT = (f.beamT || 0) + dt;
        if (f.beamT > 0.15) { f.beamT = 0; damageFoe(f, 6, d.x * 4, 2, d.z * 4, { word: chance(0.2) ? 'zap' : null, spark: true, status: { burn: 1 } }); gainMeter(0.5); comboHit(1); }
      }
    }
    for (const c of CARS.list) if (c.state !== 'gone' && !c.held && chance(dt * 3)) { const t = (c.x - o.x) * d.x + (c.z - o.z) * d.z; if (t > 0 && t < L2 && Math.hypot(o.x + d.x * t - c.x, o.z + d.z * t - c.z) < 2) hitCar(c, 25, d.x * 5, 3, d.z * 5); }
    if (G.frame % 8 === 0) AUDIO.sfx('beam', P.x, P.z);
    if (P.beam <= 0) P.beam = 0;
    P.act = { kind: 'cast', t: 0, dur: 0.1, both: true, slow: 0.4 };
  }
  if (P.whirl > 0) {
    P.whirl -= dt;
    for (let k = 0; k < 3; k++) { const a = rr(0, TAU), r = rr(0.5, 4), y = rr(0, 8); particle('puff', P.x + Math.cos(a) * r * (y / 8 + 0.3), P.y + y, P.z + Math.sin(a) * r * (y / 8 + 0.3), { vx: -Math.sin(a) * 8, vz: Math.cos(a) * 8, vy: 3, life: 0.5, size: 1, size1: 2, col: 0xe8e8f0, alpha: 0.5 }); }
    for (const f of foesNear(P.x, P.y + 1, P.z, 12)) if (!f.boss && f.lift <= 0 && !f.air) { f.lift = 1.2; f.liftC = { x: P.x, y: P.y, z: P.z }; f.liftA = Math.atan2(f.z - P.z, f.x - P.x); f.t = 0; }
    for (const e of PEOPLE.list) if (!e.air && dist(e.x, e.z, P.x, P.z) < 6) knock(e, (e.x - P.x), 6, (e.z - P.z));
  }
  if (P.lap > 0) {
    P.lap -= dt;
    const C = P.lapC;
    P.lapA += dt * 14;
    const r = 7, nx = C.x + Math.cos(P.lapA) * r, nz = C.z + Math.sin(P.lapA) * r;
    trail(P.x, P.y + 1, P.z, nx, P.y + 1, nz);
    P.x = nx; P.z = nz; P.y = supportY(nx, nz, P.y + 1, P.r);
    P.yaw = yawOf(-Math.sin(P.lapA), Math.cos(P.lapA));
    for (const f of foesNear(C.x, C.y + 1, C.z, 11)) {
      const n = P.lapHits.get(f) || 0, last = f.lapLast || 0;
      if (n < 3 && P.t - last > 0.3 && dist(f.x, f.z, P.x, P.z) < 5) { P.lapHits.set(f, n + 1); f.lapLast = P.t; damageFoe(f, 9, (f.x - C.x) * (n === 2 ? 3 : 0.5), n === 2 ? 8 : 1, (f.z - C.z) * (n === 2 ? 3 : 0.5), { word: 'wind', stun: 0.5, big: n === 2 }); comboHit(1); gainMeter(2); }
    }
    if (P.lap <= 0) { P.vx = P.vz = 0; collide(P, P.r, P.h); }
  }
  if (P.pillar) {
    const Q = P.pillar; Q.t += dt;
    if (Q.t > 0.4) {
      for (let k = 0; k < 4; k++) particle('spark', Q.x + rr(-1.8, 1.8), Q.y + rr(0, 2), Q.z + rr(-1.8, 1.8), { vy: rr(10, 20), life: 0.6, size: 2, size1: 0.6, col: pick([0xff8a20, 0xffd040, 0xff4a10, 0xffffff]) });
      if (!Q.hit) {
        Q.hit = true;
        for (const f of foesNear(Q.x, Q.y + 1, Q.z, 4)) damageFoe(f, 30, (f.x - Q.x) * 2, 16, (f.z - Q.z) * 2, { big: true, word: 'fire', status: { burn: 4 } });
        for (const c of CARS.list) if (c.state !== 'gone' && !c.held && dist(c.x, c.z, Q.x, Q.z) < 4) hitCar(c, 90, 0, 16, 0);
        ring(Q.x, Q.y + 0.1, Q.z, { r0: 1, r1: 6, life: 0.5, col: 0xffa040 });
        pow(Q.x, Q.y + 4, Q.z, pick(POWS.fire), { size: 60, col: '#ff8a20' });
        AUDIO.sfx('fireball', Q.x, Q.z); addShake(0.5); alarm(Q.x, Q.z, 25); gainMeter(5);
      }
      if (G.frame % 4 === 0) for (const f of foesNear(Q.x, Q.y + 1, Q.z, 3.5)) f.burn = Math.max(f.burn, 2);
    }
    if (Q.t > 2) P.pillar = null;
  }
  if (P.rampage > 0) {
    P.rampage -= dt;
    const s = P.rampage > 0 ? 1.35 : 1;
    P.M.root.scale.setScalar(damp(P.M.root.scale.x, s, 4, dt));
    if (G.frame % 3 === 0) particle('spark', P.x + rr(-1, 1), P.y + rr(0, P.h * 1.3), P.z + rr(-1, 1), { vy: 2, life: 0.4, size: 1, col: 0x6aff80 });
    if (P.rampage <= 0) { G.rampage = false; P.M.root.scale.setScalar(1); }
  }
  if (P.zero > 0) {
    P.zero -= dt;
    if (P.zero <= 0) {
      for (const f of FOES.list) if (f.frozen > 0 && dist(f.x, f.z, P.x, P.z) < 26) damageFoe(f, f.boss ? 110 : 60, (f.x - P.x) * 0.5, 6, (f.z - P.z) * 0.5, { big: true, word: 'ice' });
      for (const f of FOES.list) if (f.boss && dist(f.x, f.z, P.x, P.z) < 26) { f.frozen = 0; damageFoe(f, 110, 0, 0, 0, { big: true, word: 'ice' }); }
      AUDIO.sfx('shatter', P.x, P.z); flash(0.5); addShake(1);
    }
  }
}

// ---------- projectiles ----------
function spawnProj(o) { const p = Object.assign({ t: 0, homing: 0, grav: 0, hit: false }, o); PROJ.list.push(p); return p; }
function updateProj(dt) {
  for (let i = PROJ.list.length - 1; i >= 0; i--) {
    const p = PROJ.list[i];
    const sdt = p.owner === 'foe' && G.speedForce > 0 ? dt * 0.15 : dt;
    p.t += sdt;
    if (p.homing) {
      const tg = p.owner === 'hero' ? p.target : P;
      if (tg && !tg.dead && !tg.ko) {
        const sp = Math.hypot(p.vx, p.vy, p.vz);
        const dx = tg.x - p.x, dy = (tg.y + (tg.h || 1.8) * 0.55) - p.y, dz = tg.z - p.z, d = Math.hypot(dx, dy, dz) || 1;
        const k = 1 - Math.exp(-p.homing * sdt);
        const want = p.speed || sp;
        p.vx += (dx / d * want - p.vx) * k; p.vy += (dy / d * want - p.vy) * k; p.vz += (dz / d * want - p.vz) * k;
      }
    }
    p.vy -= p.grav * sdt;
    const nx = p.x + p.vx * sdt, ny = p.y + p.vy * sdt, nz = p.z + p.vz * sdt;
    const step = Math.hypot(nx - p.x, ny - p.y, nz - p.z);
    let done = p.t > p.life;
    // hit a crook (or the hero)?
    if (!done) {
      if (p.owner === 'hero') {
        for (const f of FOES.list) {
          if (f.dead || (f.ko && !f.boss) || (f.boss && f.ko)) continue;
          if (segDist(p.x, p.y, p.z, nx, ny, nz, f.x, f.y + f.h * 0.5, f.z) < p.r + f.r + (f.boss ? f.h * 0.2 : 0.25)) { projHit(p, f, nx, ny, nz); done = true; break; }
        }
      } else if (P && !P.downed && segDist(p.x, p.y, p.z, nx, ny, nz, P.x, P.y + P.h * 0.5, P.z) < p.r + 0.6) { projHit(p, P, nx, ny, nz); done = true; }
      if (!done && p.owner === 'hero') for (const c of CARS.list) {
        if (c.state === 'gone' || c.held || Math.abs(c.x - nx) > 8 || Math.abs(c.z - nz) > 8) continue;
        if (segDist(p.x, p.y, p.z, nx, ny, nz, c.x, c.y + c.h * 0.5, c.z) < p.r + c.w * 0.6) {
          if (p.kind === 'web' || p.kind === 'bolt') { hitCar(c, p.dmg * 1.6, p.vx * 0.03, 0, p.vz * 0.03); if (p.kind === 'web') particle('web', nx, ny, nz, { life: 3, size: 1.2, col: 0xffffff, alpha: 0.8 }); }
          else projHit(p, null, nx, ny, nz);
          done = true; break;
        }
      }
    }
    if (!done && step > 0) {
      const t = raycast(p.x, p.y, p.z, (nx - p.x) / step, (ny - p.y) / step, (nz - p.z) / step, step);
      if (t < step) { const hx = p.x + (nx - p.x) * t / step, hy = p.y + (ny - p.y) * t / step, hz = p.z + (nz - p.z) * t / step; projHit(p, null, hx, hy, hz); done = true; }
    }
    if (!done && !onLand(nx, nz) && ny < CITY.WATER_Y) { splash(nx, nz); done = true; }
    p.x = nx; p.y = ny; p.z = nz;
    if (!done) projFX(p, sdt);
    if (done) PROJ.list.splice(i, 1);
  }
}
function segDist(ax, ay, az, bx, by, bz, px, py, pz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz;
  const t = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / l2, 0, 1) : 0;
  return Math.hypot(ax + dx * t - px, ay + dy * t - py, az + dz * t - pz);
}
function projFX(p, dt) {
  switch (p.kind) {
    case 'web': beam(new V3(p.x, p.y, p.z), new V3(p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.z - p.vz * 0.03), { w: 0.18, col: 0xffffff, life: 0.03 }); break;
    case 'bolt': particle('spark', p.x, p.y, p.z, { life: 0.12, size: 1.6, size1: 0.6, col: 0xfff0a0 }); beam(new V3(p.x, p.y, p.z), new V3(p.x - p.vx * 0.04, p.y - p.vy * 0.04, p.z - p.vz * 0.04), { w: 0.35, col: 0xffd040, life: 0.03, add: true }); break;
    case 'fire': for (let k = 0; k < 2; k++) particle('spark', p.x + rr(-0.2, 0.2), p.y + rr(-0.2, 0.2), p.z + rr(-0.2, 0.2), { vx: rr(-1, 1), vy: rr(0, 2), vz: rr(-1, 1), life: 0.35, size: 1.8, size1: 0.3, col: pick([0xff8a20, 0xffd040, 0xff4a10]) }); break;
    case 'rock': particle('puff', p.x, p.y, p.z, { life: 0.4, size: 0.8, size1: 1.5, col: 0xb0aca4, alpha: 0.5 }); if (!p.mesh) { p.mesh = new THREE.Mesh(P_SPH(7, 5), MATS.rock || (MATS.rock = toon({ color: 0x9a968e }))); p.mesh.scale.set(1.6, 1.2, 1.4); R.scene.add(p.mesh); } p.mesh.position.set(p.x, p.y, p.z); p.mesh.rotation.x += dt * 5; break;
    case 'missile': particle('puff', p.x, p.y, p.z, { life: 0.6, size: 0.6, size1: 1.6, col: 0xd8d8d8, alpha: 0.6 }); particle('spark', p.x, p.y, p.z, { life: 0.08, size: 0.9, col: 0xffa040 }); break;
  }
}
function projHit(p, f, x, y, z) {
  if (p.mesh) { R.scene.remove(p.mesh); p.mesh = null; }
  switch (p.kind) {
    case 'web':
      if (f) { damageFoe(f, p.dmg, 0, 0, 0, { word: f.web >= 2 ? 'web' : null, status: { web: 1 }, stun: 0.3 }); comboHit(1); gainMeter(2); }
      else particle('web', x, y, z, { life: 3, size: 1.2, col: 0xffffff, alpha: 0.8 });
      break;
    case 'bolt':
      burst('spark', x, y, z, 10, { speed: 6, life: 0.25, size: 0.6, col: [0xffe060, 0xffffff] });
      if (f) { damageFoe(f, p.dmg, p.vx * 0.06, 1.5, p.vz * 0.06, { word: chance(0.4) ? 'zap' : null }); comboHit(1); gainMeter(2); }
      else for (const c of CARS.list) if (c.state !== 'gone' && dist(c.x, c.z, x, z) < 2.5) hitCar(c, 8, p.vx * 0.05, 0, p.vz * 0.05);
      break;
    case 'fire': case 'rock': {
      const r = p.kind === 'fire' ? 3.5 : 3.2;
      if (p.kind === 'fire') { burst('spark', x, y, z, 24, { speed: 9, life: 0.4, size: 1.6, size1: 0.3, col: [0xff8a20, 0xffd040, 0xff4a10, 0xffffff] }); burst('puff', x, y, z, 6, { speed: 3, life: 0.8, size: 1.5, size1: 3, col: 0x3a3030, alpha: 0.6 }); AUDIO.sfx('fireball', x, z); }
      else { debris(x, y, z, 12, { speed: 7, up: 7, size: 0.5 }); burst('puff', x, y, z, 10, { speed: 5, life: 0.8, size: 1.5, size1: 3, col: 0xd8d0c0, alpha: 0.7 }); AUDIO.sfx('crash', x, z); addShake(0.4); }
      ring(x, y, z, { r0: 0.5, r1: r * 1.4, life: 0.35, flat: false, col: p.kind === 'fire' ? 0xffa040 : 0xffffff });
      let n = 0;
      for (const fo of foesNear(x, y, z, r)) { const dx = fo.x - x, dz = fo.z - z, d = Math.hypot(dx, dz) || 1; damageFoe(fo, p.dmg * (fo === f ? 1 : 0.6), dx / d * 9, 6, dz / d * 9, { big: fo === f, word: p.kind === 'fire' ? 'fire' : 'big', status: p.kind === 'fire' ? { burn: 3 } : null }); n++; }
      if (n) { comboHit(n); gainMeter(3); }
      for (const c of CARS.list) if (c.state !== 'gone' && !c.held && dist(c.x, c.z, x, z) < r + 1.5) hitCar(c, p.kind === 'fire' ? 30 : 60, (c.x - x) * 3, 8, (c.z - z) * 3);
      alarm(x, z, 20);
      break;
    }
    case 'missile':
      burst('spark', x, y, z, 24, { speed: 9, life: 0.4, size: 1.5, size1: 0.3, col: [0xff8a20, 0xffd040, 0xffffff] });
      burst('puff', x, y, z, 8, { speed: 4, life: 0.9, size: 1.5, size1: 3.5, col: 0x3a3a40, alpha: 0.7 });
      ring(x, y, z, { r0: 0.5, r1: 5, life: 0.35, flat: false, col: 0xffa040 });
      AUDIO.sfx('boom', x, z); addShake(0.4);
      if (P && dist3(P, { x, y: y - 1, z }) < 4) hurtHero(p.dmg, x, z, 8);
      alarm(x, z, 25);
      break;
  }
}

// ---------- taking hits ----------
// dmg, where from, knockback speed, who, continuous (a beam: no flinch)
function hurtHero(dmg, fx, fz, kb = 0, src = null, cont = false) {
  if (!P || P.downed || G.god || P.invuln > 0 || P.dodge > 0 || P.rampage > 0) return;
  if (P.zero > 0 || P.lap > 0) return;
  P.hp -= dmg; P.hurtT = 0;
  if (!cont) {
    HUD.hurt(dmg);
    AUDIO.sfx('hurt', P.x, P.z);
    hitSpark(P.x, P.y + P.h * 0.6, P.z, dmg > 12, 0xff6040);
  }
  if (kb > 0) {
    const dx = P.x - fx, dz = P.z - fz, d = Math.hypot(dx, dz) || 1;
    if (P.mode === 'swing') endSwing(false);
    if (P.mode === 'wall') leaveWall(false);
    P.vx = dx / d * kb; P.vz = dz / d * kb; P.vy = Math.max(P.vy, kb * 0.45); P.onGround = false;
    if (P.mode === 'fly' && kb > 10) { P.flyBoost = 0; }
    if (kb > 10) P.stagger = 0.5;
  }
  G.combo = Math.max(0, Math.floor(G.combo * 0.5));
  if (P.hp <= 0) { P.hp = 0; heroKO(); }
}
function heroKO() {
  P.downed = true; P.downT = 0; P.mode = 'ground'; P.anchor = null; P.wall = null; P.beam = 0;
  if (P.held) dropHeld();
  P.vy = 6; P.onGround = false;
  G.combo = 0;
  HUD.banner('YOU\'RE DOWN!', '#ff4a3a');
  AUDIO.sfx('down', P.x, P.z);
  for (const f of FOES.list) f.aggro = false;
}
function heroDown(dt) {
  P.downT += dt;
  P.vy -= GRAV * dt; P.y += P.vy * dt; P.x += P.vx * dt; P.z += P.vz * dt;
  P.vx = damp(P.vx, 0, 3, dt); P.vz = damp(P.vz, 0, 3, dt);
  const gy = supportY(P.x, P.z, P.y, P.r);
  if (P.y < gy) { P.y = gy; P.vy = 0; }
  if (!onLand(P.x, P.z) && P.y < CITY.WATER_Y) P.y = CITY.WATER_Y - 0.5;
  poseReset(P.M); poseKO(P.M); poseApply(P.M, dt, 8);
  P.M.root.position.set(P.x, P.y + lerp(P.h * 0.55, 0.12 * P.h, Math.min(1, P.downT * 3)), P.z);
  P.M.root.rotation.set(Math.PI / 2 * Math.min(1, P.downT * 3), P.yaw, 0);
  if (P.downT > 4) respawnHero(!onLand(P.x, P.z));
}
// back on your feet (or, if lost at sea, on the nearest rooftop)
function respawnHero(moveToLand) {
  if (moveToLand) { const n = nearestNode(CITY.walk, clamp(P.x, -380, 380), clamp(P.z, -380, 380)); P.x = n.x; P.z = n.z; P.y = supportY(P.x, P.z, 999); }
  P.downed = false; P.hp = P.maxHp * 0.7; P.invuln = 2.5; P.mode = 'ground'; P.vx = P.vy = P.vz = 0;
  P.M.root.rotation.set(0, P.yaw, 0);
  HUD.banner('BACK IN ACTION', P.D.color);
}
function gainMeter(n) { if (P) P.meter = Math.min(100, P.meter + n); }

// ---------- animation ----------
function heroAnim(dt) {
  const M = P.M, D = P.D, hs = Math.hypot(P.vx, P.vz);
  poseReset(M);
  let rate = 14, pitch = 0, roll = 0;
  const A = P.act;
  if (P.mode === 'swing') {
    poseSwing(M, P.t, clamp(P.vy / -15, 0, 1));
    const a = P.pivot; P.yaw = angTo(P.yaw, hs > 1 ? yawOf(P.vx, P.vz) : P.yaw, 6 * dt);
    pitch = clamp(-P.vy * 0.02, -0.5, 0.5); roll = clamp(((a.x - P.x) * Math.cos(P.yaw) - (a.z - P.z) * Math.sin(P.yaw)) * 0.03, -0.6, 0.6);
  } else if (P.mode === 'wall') {
    if (P.wall.run) { poseRun(M, P.t * 30, 1, 0.3); pitch = -0.3; }
    else poseCrawl(M, P.crawlPh || 0, Input.move().y !== 0 || Input.move().x !== 0);
  } else if (P.mode === 'fly') {
    const k = clamp(Math.hypot(P.vx, P.vy, P.vz) / 14, 0, 1);
    if (k > 0.4) { poseFly(M, P.t, P.flyBoost > 0.6); pitch = -Math.PI / 2 * k * 0.95 - Math.asin(clamp(P.vy / (Math.hypot(P.vx, P.vy, P.vz) || 1), -1, 1)) * 0.6; }
    else poseHover(M, P.t);
    if (hs > 2) P.yaw = angTo(P.yaw, yawOf(P.vx, P.vz), 5 * dt);
    roll = clamp(angWrap(CAM.yaw - P.yaw) * 0.5, -0.6, 0.6) * k;
  } else if (P.mode === 'water') {
    poseFly(M, P.t, false); setT(M, B.armR, Math.PI * 0.8 + Math.sin(P.ph) * 0.6, 0, 0.2); setT(M, B.armL, Math.PI * 0.8 - Math.sin(P.ph) * 0.6, 0, -0.2); pitch = -1.2;
    if (hs > 0.5) P.yaw = angTo(P.yaw, yawOf(P.vx, P.vz), 4 * dt);
  } else if (P.onGround) {
    if (P.charge > 0) poseCrouch(M, P.charge);
    else if (P.dodge > 0) { poseCrouch(M, 0.6); }
    else if (hs > 0.8) {
      P.ph += dt * hs * (P.speedOn ? 0.9 : 1.6) * (D.build.h > 2 ? 0.8 : 1);
      const k = P.speedOn ? 1 : clamp(hs / 11, 0, 0.85);
      poseRun(M, P.ph, k, P.speedOn ? 0.5 : 0.05);
      if (!A || A.kind !== 'melee') P.yaw = angTo(P.yaw, yawOf(P.vx, P.vz), (P.speedOn ? 6 : 12) * dt);
    } else if (P.landT > 0) poseCrouch(M, P.landT * 2);
    else if (P.t % 14 < 4 && !A) poseHero(M, P.t); else poseIdle(M, P.t);
  } else {
    poseAir(M, P.vy, P.t);
    if (P.flip > 0) { P.flip -= dt; pitch = (1 - P.flip / 0.5) * -TAU; poseCrouch(M, 0.8); }
    if (P.leaping) { setT(M, B.armR, 2.8, 0, 0.3); setT(M, B.armL, 0.4, 0, -0.6); }
    if (hs > 2 && (!A || A.kind !== 'melee')) P.yaw = angTo(P.yaw, yawOf(P.vx, P.vz), 4 * dt);
  }
  // actions override the arms
  if (A) {
    if (A.kind === 'melee') posePunch(M, A.n, A.lunge > 0 && !A.struck ? 0.15 : clamp(A.t / A.dur, 0, 1));
    else if (A.lift) poseLift(M);
    else if (A.slam) poseSlam(M, 1 - A.t / A.dur);
    else if (A.clap) poseClap(M, clamp(A.t / 0.15, 0, 1));
    else if (A.nova) { poseCheer(M, 0); setT(M, B.armL, 2.2, 0, -1.2); setT(M, B.armR, 2.2, 0, 1.2); }
    else { const f = camFwd(); poseCast(M, Math.asin(clamp(-f.y, -1, 1)), A.both, A.left); }
    rate = 22;
  }
  if (P.held) poseLift(M);
  if (P.whirl > 0) { poseSpin(M); P.yaw += dt * 25; }
  if (P.stagger > 0) { P.stagger -= dt; poseHurt(M, P.stagger * 2); }
  if (D.look.cape !== undefined) poseCape(M, Math.hypot(P.vx, P.vy, P.vz) + (P.mode === 'fly' ? 10 : 0), P.t);
  poseApply(M, dt, rate);
  // place the rig
  const fly = P.mode === 'fly' || P.mode === 'water';
  M.root.position.set(P.x, P.y + P.h * 0.55, P.z);
  if (P.mode === 'wall' && !P.wall.run) M.root.position.set(P.x + P.wall.nx * 0.2, P.y + P.h * 0.55, P.z + P.wall.nz * 0.2);
  const k2 = 1 - Math.exp(-dt * (fly ? 6 : 12));
  P.rp = lerp(P.rp || 0, pitch, P.flip > 0 ? 1 : k2); P.rr = lerp(P.rr || 0, roll, k2);
  M.root.rotation.set(P.rp, P.yaw, P.rr);
  M.mat.emissive.setHex(P.invuln > 0 && Math.floor(P.t * 10) % 2 ? 0x404040 : P.hurtT < 0.1 ? 0x802020 : 0);
  const gy = P.mode === 'water' ? CITY.WATER_Y : Math.max(supportY(P.x, P.z, P.y + 0.1, 0.2), carSupport(P.x, P.z, P.y + 0.1));
  const above = P.y - gy;
  if (above < 60) shadow(P.x, gy, P.z, P.r * 1.4 * (P.D.build.h > 2 ? 1.4 : 1), clamp(1 - above / 60, 0.3, 1));
}
// trails and glows while moving
function heroFX(dt) {
  const hs = Math.hypot(P.vx, P.vy, P.vz);
  if (P.mode === 'swing' && P.anchor) beam(handPos(false), P.anchor, { w: 0.07, col: 0xffffff, life: 0.02, fade: false });
  if (P.id === 'blitz' && hs > 18) {
    particle('spark', P.x + rr(-0.3, 0.3), P.y + rr(0.3, P.h), P.z + rr(-0.3, 0.3), { vx: P.vx * 0.6, vy: P.vy * 0.6, vz: P.vz * 0.6, life: 0.25, size: 1.1, size1: 0.2, col: pick([0xffd23a, 0xff4020, 0xffffff]) });
    if (G.frame % 3 === 0) beam(new V3(P.x, P.y + 1, P.z), new V3(P.x - P.vx * 0.12 + rr(-0.5, 0.5), P.y + 1 + rr(-0.5, 0.5), P.z - P.vz * 0.12), { w: 0.12, col: 0xffe060, life: 0.12, add: true, jag: 0.4 });
    if (P.onGround && G.frame % 2 === 0) particle('puff', P.x, P.y + 0.2, P.z, { vx: P.vx * 0.7, vz: P.vz * 0.7, vy: 1, life: 0.35, size: 0.8, size1: 1.6, col: 0xd8d0c0, alpha: 0.45, drag: 3 });
  }
  if (P.id === 'skylark' && P.mode === 'fly' && P.flyBoost > 0.3) {
    particle('spark', P.x + rr(-0.3, 0.3), P.y + rr(0.3, 1.4), P.z + rr(-0.3, 0.3), { life: 0.5, size: 1.1, size1: 0.1, col: pick([0xffe080, 0x80c8ff, 0xffffff]) });
    if (P.flyBoost > 0.9 && G.frame % 20 === 0) { ring(P.x - P.vx * 0.1, P.y + 0.9, P.z - P.vz * 0.1, { r0: 0.5, r1: 3, life: 0.35, flat: false, alpha: 0.5 }); AUDIO.sfx('whoosh', P.x, P.z); }
  }
  if (P.id === 'equinox' && (P.mode === 'fly' || !P.onGround)) {
    for (const s of [-1, 1]) particle('spark', P.x + Math.cos(P.yaw) * s * 0.15, P.y - 0.05, P.z - Math.sin(P.yaw) * s * 0.15, { vy: -7 + P.vy * 0.5, vx: P.vx * 0.5, vz: P.vz * 0.5, life: 0.3, size: 1.3, size1: 0.2, col: pick([0xff8a20, 0xffd040, 0xff4a10]) });
  }
  if (P.id === 'equinox' && G.frame % 3 === 0) { const l = handPos(true), r = handPos(false); particle('spark', l.x, l.y - 0.4, l.z, { vy: 1.5, life: 0.3, size: 0.6, size1: 0.1, col: 0xff8a20 }); particle('spark', r.x, r.y - 0.4, r.z, { vy: -0.5, life: 0.4, size: 0.5, size1: 0.1, col: 0xa8f0ff }); }
}
