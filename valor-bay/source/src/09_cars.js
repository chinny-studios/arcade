// Valor Bay — cars: traffic that keeps right and turns at random at the intersections, cars parked along the curbs,
// getaway cars, the armored truck; cars knocked flying by powers or thrown by Bulwark, and the smoking wrecks they leave.
// Like the people, a fixed pool recycled around the camera.

const CARS = { list: [], cap: 26, parkedCap: 10 };
const CAR_TYPES = {
  sedan: { l: 4.4, w: 1.85, h: 1.45, cols: [0xd83a2a, 0x2a6ad8, 0xe8e8e8, 0x3a3a40, 0x3aa85a, 0xe8b020, 0x8a3ac8, 0xa0a8b0] },
  taxi: { l: 4.5, w: 1.85, h: 1.5, cols: [0xf8c818] },
  van: { l: 5.0, w: 2.0, h: 2.3, cols: [0xf0f0f0, 0x6a8ac8, 0xc8603a, 0x5a8a5a] },
  sports: { l: 4.3, w: 1.95, h: 1.2, cols: [0xff2a2a, 0xffa020, 0x20c0ff, 0x18181e] },
  police: { l: 4.6, w: 1.9, h: 1.5, cols: [0x1a2a5a] },
  armored: { l: 6.6, w: 2.5, h: 2.9, cols: [0x5a6a5a] },
  getaway: { l: 4.5, w: 1.9, h: 1.4, cols: [0x18181e, 0x3a1a4a] },
};
function carMesh(type, col) {
  const T = CAR_TYPES[type], M = new Mesher(), l = T.l, w = T.w, h = T.h;
  const glass = 0x2a3a5a, dark = 0x1a1a1e;
  const wheel = (x, z) => { M.geo(P_CYL(10), 0x18181c, x, 0.36, z, 0, 0, Math.PI / 2, 0.72, 0.32, 0.72); M.geo(P_CYL(8), 0xb8bcc4, x + Math.sign(x) * 0.17, 0.36, z, 0, 0, Math.PI / 2, 0.36, 0.02, 0.36); };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(sx * (w / 2 - 0.12), sz * (l / 2 - (type === 'armored' ? 1.1 : 0.85)));
  if (type === 'van' || type === 'armored') {
    M.box(0, 0.45 + (h - 0.45) / 2, 0.15, w, h - 0.45, l - 0.3, col);
    M.box(0, h * 0.68, -l / 2 + 0.17, w - 0.2, h * 0.32, 0.06, glass);
    for (const s of [-1, 1]) M.box(s * w / 2, h * 0.7, -l / 2 + 0.9, 0.04, h * 0.28, 0.9, glass);
    M.box(0, 0.65, -l / 2 + 0.1, w * 0.9, 0.3, 0.2, dark);
    if (type === 'armored') { M.box(0, h * 0.5, 0.3, w + 0.02, 0.35, l - 1.5, 0xe8c040); M.box(0, h + 0.05, 0.4, w * 0.7, 0.1, l * 0.6, 0x4a5a4a); }
  } else {
    const bh = type === 'sports' ? 0.5 : 0.65, cab = h - bh - 0.3;
    M.box(0, 0.3 + bh / 2, 0, w, bh, l, col);
    const cl = type === 'sports' ? l * 0.42 : l * 0.5, cz = type === 'sports' ? 0.2 : 0.15;
    M.box(0, 0.3 + bh + cab / 2, cz, w * 0.86, cab, cl, col);
    M.box(0, 0.3 + bh + cab * 0.5, cz - cl / 2 - 0.01, w * 0.8, cab * 0.8, 0.04, glass); M.box(0, 0.3 + bh + cab * 0.5, cz + cl / 2 + 0.01, w * 0.8, cab * 0.8, 0.04, glass);
    for (const s of [-1, 1]) M.box(s * (w * 0.43 + 0.01), 0.3 + bh + cab * 0.5, cz, 0.04, cab * 0.7, cl * 0.9, glass);
    if (type === 'sports') M.box(0, 0.3 + bh + 0.25, l / 2 - 0.25, w, 0.08, 0.4, dark);
    if (type === 'taxi') { M.box(0, h + 0.12, cz, 0.9, 0.25, 0.35, 0xffffff); M.box(0, 0.3 + bh * 0.5, 0, w + 0.02, 0.12, l * 0.6, dark); }
    if (type === 'police') { for (const s of [-1, 1]) M.box(s * (w / 2 + 0.005), 0.3 + bh * 0.55, cz, 0.02, bh * 0.7, l * 0.42, 0xf0f0f0); M.box(-0.35, h + 0.06, cz, 0.6, 0.18, 0.3, 0xff2020); M.box(0.35, h + 0.06, cz, 0.6, 0.18, 0.3, 0x2050ff); }
  }
  // lights and bumpers
  for (const s of [-1, 1]) { M.box(s * (w / 2 - 0.3), 0.75, -l / 2 - 0.01, 0.35, 0.16, 0.04, 0xfff8d0); M.box(s * (w / 2 - 0.3), 0.75, l / 2 + 0.01, 0.35, 0.16, 0.04, 0xd02020); }
  M.box(0, 0.38, -l / 2, w, 0.18, 0.12, 0x6a6a70); M.box(0, 0.38, l / 2, w, 0.18, 0.12, 0x6a6a70);
  return M.build();
}
function makeCar(type) {
  const T = CAR_TYPES[type];
  const col = pick(T.cols);
  const mesh = new THREE.Mesh(carMesh(type, col), MATS.vc);
  const root = new THREE.Group(); root.rotation.order = 'YXZ'; root.add(mesh);
  R.scene.add(root);
  return { kind: 'car', type, root, mesh, l: T.l, w: T.w, h: T.h, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, speed: 0, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0,
    state: 'drive', hp: type === 'armored' ? 260 : type === 'getaway' ? 50 : 80, r: 1.6, t: 0, leg: null, honk: 0, crew: null, smoke: 0, siren: type === 'police' };
}
function initCars() {
  const types = ['sedan', 'sedan', 'sedan', 'taxi', 'taxi', 'van', 'sports', 'police'];
  for (let i = 0; i < CARS.cap; i++) { const c = makeCar(types[i % types.length]); CARS.list.push(c); placeCar(c, 0, 0, 0, 220, i < CARS.parkedCap); }
}
// drive mode: put the car on a road leg between r0 and r1 from (x, z)
function placeCar(c, x, z, r0, r1, parked = false) {
  for (let k = 0; k < 40; k++) {
    const a = pick(CITY.nodes), b = pick(a.nb);
    const t = rr(0.25, 0.75), px = lerp(a.x, b.x, t), pz = lerp(a.z, b.z, t), d = dist(px, pz, x, z);
    if (d < r0 || d > r1) continue;
    if (CARS.list.some((o) => o !== c && o.state !== 'gone' && dist2(o.x, o.z, px, pz) < 100)) continue;
    c.from = a; c.to = b; c.state = parked ? 'parked' : 'drive'; c.air = false; c.hp = c.type === 'armored' ? 260 : c.type === 'getaway' ? 50 : 80; c.mesh.material = MATS.vc; c.smoke = 0; c.crew = null; c.honk = 0; c.held = false;
    c.pitch = c.roll = 0; c.y = 0; c.vx = c.vy = c.vz = 0; c.t = 0; c.root.visible = true;
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    // right of the centre line when driving; against the curb when parked
    const off = parked ? 4.1 : 2.5;
    c.x = px - dz / l * off; c.z = pz + dx / l * off;
    c.yaw = yawOf(dx, dz);
    c.speed = parked ? 0 : 9;
    c.leg = parked ? null : straightLeg(c, a, b, t);
    return true;
  }
  c.state = 'gone'; c.root.visible = false;
  return false;
}
// legs: a straight run along the lane, then a turn through the intersection (a quadratic curve)
function laneAt(a, b, d) { const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l; return [a.x + ux * d - uz * 2.5, a.z + uz * d + ux * 2.5]; }
function straightLeg(c, a, b, t0 = 0) {
  const l = dist(a.x, a.z, b.x, b.z);
  const s = laneAt(a, b, Math.max(9, l * t0)), e = laneAt(a, b, l - 9);
  return { kind: 's', p0: s, p2: e, p1: null, len: dist(s[0], s[1], e[0], e[1]), d: 0 };
}
function turnLeg(c, a, b, n) {
  const l1 = dist(a.x, a.z, b.x, b.z), l2 = dist(b.x, b.z, n.x, n.z);
  const s = laneAt(a, b, l1 - 9), e = laneAt(b, n, 9);
  // the control point: where the two lanes would cross
  const [bx1, bz1] = laneAt(a, b, l1), [bx2, bz2] = laneAt(b, n, 0);
  const u1x = (b.x - a.x) / l1, u1z = (b.z - a.z) / l1, u2x = (n.x - b.x) / l2, u2z = (n.z - b.z) / l2;
  const den = u1x * u2z - u1z * u2x;
  let cx = (s[0] + e[0]) / 2, cz = (s[1] + e[1]) / 2;
  if (Math.abs(den) > 0.1) { const t = ((bx2 - s[0]) * u2z - (bz2 - s[1]) * u2x) / den; cx = s[0] + u1x * t; cz = s[1] + u1z * t; }
  const len = dist(s[0], s[1], cx, cz) + dist(cx, cz, e[0], e[1]);
  return { kind: 't', p0: s, p1: [cx, cz], p2: e, len: Math.max(1, len * 0.9), d: 0 };
}
function legPos(L2, t) {
  if (!L2.p1) return [lerp(L2.p0[0], L2.p2[0], t), lerp(L2.p0[1], L2.p2[1], t)];
  const u = 1 - t;
  return [u * u * L2.p0[0] + 2 * u * t * L2.p1[0] + t * t * L2.p2[0], u * u * L2.p0[1] + 2 * u * t * L2.p1[1] + t * t * L2.p2[1]];
}
function nextNode(c, avoid) {
  const opts = c.to.nb.filter((n) => n !== c.from);
  if (!opts.length) return c.from;
  if (avoid) {
    // getaway: prefer the exit that leads away from the hero
    let best = opts[0], bd = -1;
    for (const n of opts) { const d = dist(n.x, n.z, avoid.x, avoid.z) + rr(0, 40); if (d > bd) { bd = d; best = n; } }
    return best;
  }
  return pick(opts);
}

function updateCars(dt) {
  const cx = R.camera.position.x, cz = R.camera.position.z;
  for (const c of CARS.list) {
    if (c.state === 'gone') { if (G.frame % 30 === 0) placeCar(c, cx, cz, 120, 220, CARS.list.filter((o) => o.state === 'parked').length < CARS.parkedCap); continue; }
    const far = dist2(c.x, c.z, cx, cz) > 240 * 240;
    if (far && !c.crew && !c.held && c.state !== 'flying') { placeCar(c, cx, cz, 110, 220, c.state === 'parked'); continue; }
    c.t += dt;
    if (c.state === 'drive' || c.state === 'getaway') drive(c, dt);
    else if (c.state === 'flying') flyCar(c, dt);
    else if (c.state === 'wreck' && c.t > 40 && dist2(c.x, c.z, cx, cz) > 90 * 90) placeCar(c, cx, cz, 120, 220);
    if (c.smoke > 0 && G.frame % 4 === 0) particle('puff', c.x + rr(-0.5, 0.5), c.y + c.h + 0.3, c.z + rr(-0.5, 0.5), { vy: 2.5, vx: rr(-0.5, 0.5), life: 1.6, size: 1.2, size1: 3.5, col: c.smoke > 1 ? 0x2a2a2e : 0x6a6a70, alpha: 0.55 });
    if (!c.held) { c.root.position.set(c.x, c.y, c.z); c.root.rotation.set(c.pitch, c.yaw, c.roll); }
    if (c.state !== 'flying' && !c.held) shadow(c.x, c.y, c.z, Math.max(c.l, c.w) * 0.55, 1);
  }
}
const _near = [];
function drive(c, dt) {
  const get = c.state === 'getaway';
  const vmax = get ? 24 : c.type === 'armored' ? 9 : 11;
  // anything in front? (cars, people on the road, the hero, crooks)
  let block = 0;
  const fx = fwdX(c.yaw), fz = fwdZ(c.yaw), look = 6 + c.speed * 0.9;
  if (!get) {
    for (const o of CARS.list) {
      if (o === c || o.state === 'gone') continue;
      const dx = o.x - c.x, dz = o.z - c.z, f = dx * fx + dz * fz, s = Math.abs(-dx * fz + dz * fx);
      if (f > 0 && f < look && s < 2.4) block = Math.max(block, 1 - (f - 5) / look);
    }
    const ents = [P, ...PEOPLE.list, ...FOES.list];
    for (const o of ents) {
      if (!o || o.dead || o.y > 3) continue;
      const dx = o.x - c.x, dz = o.z - c.z, f = dx * fx + dz * fz, s = Math.abs(-dx * fz + dz * fx);
      if (f > 0 && f < look * 0.8 && s < 1.9) { block = 1; if (o === P) { c.honk -= dt; if (c.honk <= 0) { AUDIO.sfx('horn', c.x, c.z); c.honk = rr(2, 4); } } }
    }
  }
  const target = vmax * (1 - clamp(block, 0, 1)) * (c.leg && c.leg.kind === 't' ? 0.65 : 1);
  c.speed = damp(c.speed, target, target < c.speed ? 6 : 1.5, dt);
  if (!c.leg) c.leg = straightLeg(c, c.from, c.to);
  const L2 = c.leg;
  L2.d += c.speed * dt;
  if (L2.d >= L2.len) {
    if (L2.kind === 's') { c.next = nextNode(c, get ? P : null); c.leg = turnLeg(c, c.from, c.to, c.next); }
    else { c.from = c.to; c.to = c.next; c.leg = straightLeg(c, c.from, c.to); }
    return;
  }
  const t = L2.d / L2.len, [x, z] = legPos(L2, t), [x2, z2] = legPos(L2, Math.min(1, t + 0.02));
  c.x = x; c.z = z; c.y = 0;
  if (Math.hypot(x2 - x, z2 - z) > 1e-4) c.yaw = yawOf(x2 - x, z2 - z);
  c.pitch = damp(c.pitch, 0, 8, dt); c.roll = damp(c.roll, 0, 8, dt);
  // a getaway car ploughs through people
  if (get) {
    for (const o of [...PEOPLE.list, ...FOES.list]) {
      if (o.air || o.dead || (o.car === c)) continue;
      if (Math.abs(o.x - c.x) < 2.5 && Math.abs(o.z - c.z) < 2.5 && o.y < 2) { knock(o, fx * c.speed * 0.6 + rr(-2, 2), 6, fz * c.speed * 0.6 + rr(-2, 2)); AUDIO.sfx('thud', o.x, o.z); }
    }
    if (G.frame % 2 === 0) particle('puff', c.x - fx * c.l / 2, 0.3, c.z - fz * c.l / 2, { vy: 0.8, life: 0.8, size: 0.8, size1: 2, col: 0x8a8a90, alpha: 0.4 });
  }
}
// hit a car with a power: hp loss and a shove; enough force sends it flying
function hitCar(c, dmg, fx, fy, fz, src) {
  if (c.state === 'gone' || c.held) return;
  c.hp -= dmg;
  const force = Math.hypot(fx, fy, fz);
  if (c.hp < 30) c.smoke = c.hp < 0 ? 2 : 1;
  if (force > 14 || c.hp <= 0) {
    launchCar(c, fx * 0.7, Math.max(fy, force * 0.35), fz * 0.7);
  } else if (c.state === 'drive') { c.speed *= 0.3; }
  if (c.crew && c.hp <= 0) bus.emit('getawayStopped', c);
  hitSpark(c.x, c.y + c.h * 0.7, c.z, force > 14);
  AUDIO.sfx(force > 14 ? 'crash' : 'clang', c.x, c.z);
}
function launchCar(c, vx, vy, vz) {
  c.state = 'flying'; c.vx = vx; c.vy = vy; c.vz = vz; c.wx = rr(-3, 3); c.wy = rr(-2, 2); c.wz = rr(-3, 3); c.t = 0; c.thrown = false; c.thrownBy = null; c.hitHero = false;
  if (c.crew) bus.emit('getawayStopped', c);
}
function flyCar(c, dt) {
  c.vy -= 24 * dt;
  c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
  c.pitch += c.wx * dt; c.yaw += c.wy * dt; c.roll += c.wz * dt;
  // smash into crooks along the way
  const sp = Math.hypot(c.vx, c.vy, c.vz);
  if (sp > 8) for (const f of FOES.list) {
    if (f.dead || f.hitBy === c || f === c.thrownBy) continue;
    if (Math.abs(f.x - c.x) < c.l * 0.6 + f.r && Math.abs(f.z - c.z) < c.l * 0.6 + f.r && f.y < c.y + c.h && f.y + f.h > c.y) {
      f.hitBy = c; damageFoe(f, c.thrown ? 70 : 35, c.vx * 0.6, 10, c.vz * 0.6, { big: true, word: 'big' });
    }
  }
  // a car thrown by a villain at the hero
  if (sp > 8 && c.thrownBy && c.thrownBy !== P && P && !c.hitHero && Math.abs(P.x - c.x) < c.l * 0.6 + 0.5 && Math.abs(P.z - c.z) < c.l * 0.6 + 0.5 && P.y < c.y + c.h && P.y + P.h > c.y) {
    c.hitHero = true; hurtHero(24, c.x - c.vx, c.z - c.vz, 16);
  }
  const e = { x: c.x, y: c.y, z: c.z, onGround: false };
  const w = collide(e, Math.min(c.l, c.w) * 0.6, c.h, 0);
  if (w) {
    c.x = e.x; c.z = e.z;
    const vn = c.vx * w.nx + c.vz * w.nz;
    if (vn < 0) { c.vx -= 1.5 * vn * w.nx; c.vz -= 1.5 * vn * w.nz; c.vx *= 0.4; c.vz *= 0.4; carCrash(c, Math.abs(vn)); }
  }
  const gy = supportY(c.x, c.z, c.y + 0.5, 1, 0.6);
  if (c.y <= gy && c.vy < 0) {
    c.y = gy;
    if (c.vy < -8) { carCrash(c, -c.vy); c.vy *= -0.25; c.vx *= 0.6; c.vz *= 0.6; c.wx *= 0.5; c.wz *= 0.5; }
    else {
      // settle the right way up, or on the roof if it landed that way
      c.vy = 0; c.vx *= 0.5; c.vz *= 0.5;
      const up = Math.cos(c.pitch) * Math.cos(c.roll) > 0;
      c.pitch = Math.round(c.pitch / Math.PI) * Math.PI; c.roll = up ? 0 : Math.PI; if (!up) c.pitch = 0;
      if (Math.hypot(c.vx, c.vz) < 1) { c.state = 'wreck'; c.t = 0; c.smoke = 2; c.mesh.material = MATS.wreck || (MATS.wreck = toon({ vertexColors: true, color: 0x5a5250 })); if (c.crew) bus.emit('getawayStopped', c); }
    }
  }
  if (!onLand(c.x, c.z) && c.y < CITY.WATER_Y) { splash(c.x, c.z); c.state = 'gone'; c.root.visible = false; }
}
function carCrash(c, v) {
  if (v < 6) return;
  AUDIO.sfx('crash', c.x, c.z);
  addShake(Math.min(1, v / 25) * (dist(c.x, c.z, R.camera.position.x, R.camera.position.z) < 40 ? 1 : 0.2));
  debris(c.x, c.y + 0.5, c.z, 8, { speed: 6, up: 6, size: 0.35, col: [0x2a3a5a, 0x18181c, 0xb8bcc4] });
  burst('puff', c.x, c.y + 0.5, c.z, 10, { speed: 4, life: 0.9, size: 1.5, size1: 3, col: 0xb8b0a0, alpha: 0.7 });
  hitSpark(c.x, c.y + 0.6, c.z, true);
  pow(c.x, c.y + 2, c.z, pick(POWS.big), { size: 52 });
  // anyone close by is caught in it
  for (const f of FOES.list) if (!f.dead && dist(f.x, f.z, c.x, c.z) < 3.5 && f.hitBy !== c) { f.hitBy = c; damageFoe(f, 30, (f.x - c.x) * 4, 7, (f.z - c.z) * 4, { word: null }); }
  alarm(c.x, c.z, 25, 'crash');
}
// the car under a point (for standing on roofs) and pushing people out of cars
function carAt(x, z, pad = 0) {
  for (const c of CARS.list) {
    if (c.state === 'gone' || c.held || c.state === 'flying') continue;
    const dx = x - c.x, dz = z - c.z, s = Math.sin(c.yaw), co = Math.cos(c.yaw);
    const lx = dx * co - dz * s, lz = dx * s + dz * co;
    if (Math.abs(lx) < c.w / 2 + pad && Math.abs(lz) < c.l / 2 + pad) return c;
  }
  return null;
}
function carSupport(x, z, y) { const c = carAt(x, z, 0.1); return c && c.y + c.h <= y + 0.8 ? c.y + c.h : -Infinity; }
function carCollide(e, r) {
  for (const c of CARS.list) {
    if (c.state === 'gone' || c.held || c.state === 'flying') continue;
    if (e.y >= c.y + c.h - 0.05 || e.y + 1.5 < c.y) continue;
    const dx = e.x - c.x, dz = e.z - c.z, s = Math.sin(c.yaw), co = Math.cos(c.yaw);
    const lx = dx * co - dz * s, lz = dx * s + dz * co, hx = c.w / 2 + r, hz = c.l / 2 + r;
    if (Math.abs(lx) >= hx || Math.abs(lz) >= hz) continue;
    let nlx = lx, nlz = lz;
    if (hx - Math.abs(lx) < hz - Math.abs(lz)) nlx = Math.sign(lx || 1) * hx; else nlz = Math.sign(lz || 1) * hz;
    e.x = c.x + nlx * co + nlz * s; e.z = c.z - nlx * s + nlz * co;
    return c;
  }
  return null;
}
function nearestCar(x, z, r, filter) {
  let best = null, bd = r * r;
  for (const c of CARS.list) { if (c.state === 'gone' || c.held || (filter && !filter(c))) continue; const d = dist2(c.x, c.z, x, z); if (d < bd) { bd = d; best = c; } }
  return best;
}
