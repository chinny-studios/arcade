// Creature Feature — cars: parked at kerbs, in lots, at the drive-in and lovers' lane (some with people inside),
// driven away by people escaping, arriving with new people, stopped and pulled open by monsters, and thrown

const CARS = { list: [] };
// state: 'parked' | 'drive' | 'stopped' | 'wreck' | 'held' | 'flying'
function parkCar(x, z, yaw, o = {}) {
  if (!TOWN.built) TOWN.carSpecs.push([x, z, yaw, o]);
  const scheme = o.police ? [0x101012, 0xf0f0f0] : pick(CAR_SCHEMES);
  const mesh = group();
  const body = meshOf(carGeo(scheme, !!o.police)); mesh.add(body);
  const lights = new THREE.Mesh(carLightsGeo(), MATS.glow); lights.visible = false; mesh.add(lights);
  const y = o.y === undefined ? terrainH(x, z) : o.y;
  const c = { x, z, y, yaw, vy: 0, vx: 0, vz: 0, spin: 0, mesh, body, lights, beam: null, state: 'parked', occ: [], lot: o.lot || null, want: o.occ || 0, police: !!o.police,
    speed: 0, path: null, pi: 0, top: 1.65, hp: 2, dead: false, honk: 0, i: CARS.list.length };
  mesh.position.set(x, y, z); mesh.rotation.y = yaw;
  R.scene.add(mesh);
  CARS.list.push(c);
  return c;
}
function carHeadlights(c, on) {
  c.lights.visible = on;
  if (on && !c.beam) {
    const g = new THREE.ConeGeometry(2.2, 14, 10, 1, true); g.translate(0, -7, 0); g.rotateX(-Math.PI / 2 + Math.PI);
    const b = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    b.position.set(0, 0.8, -2.7); b.rotation.x = -0.06; c.mesh.add(b); c.beam = b;
    c.light = { x: c.x, y: 1, z: c.z, color: 0xfff0c0, i: 1.4, r: 18, on: true };
    LIGHTS.extra.push(c.light);
  }
  if (c.beam) c.beam.visible = on;
  if (c.light) c.light.on = on;
}
const carFwd = (c) => [fwdX(c.yaw), fwdZ(c.yaw)];
// a person (already beside it) gets in and drives for the nearest way out of town away from the monster
function startDriving(c) {
  if (c.state === 'wreck' || c.dead) return false;
  let best = null, bd = 1e9;
  for (const ex of WORLD.exits) {
    const d = dist(c.x, c.z, ex.x, ex.z);
    // avoid exits whose road leads past the monster
    const dm = P ? segDist(P.x, P.z, c.x, c.z, ex.x, ex.z) : 99;
    const score = d + (dm < 25 ? 400 : 0);
    if (score < bd) { bd = score; best = ex; }
  }
  c.path = driveRoute(c.x, c.z, best.i); c.pi = 0; c.state = 'drive'; c.target = best;
  carHeadlights(c, true);
  AUDIO.sfx('engine', c.x, c.z);
  return true;
}
// a car arriving from outside with a few people, heading for a spot in town
function arriveCar(nodeIdx, dest, n) {
  const from = TOWN.arrive[nodeIdx], ex = WORLD.nodes.find((q) => q.exit && dist(q.x, q.z, from.x, from.z) < 200) || from;
  const c = parkCar(ex.x, ex.z, 0, {});
  c.path = driveRoute(ex.x + (from.x - ex.x) * 0.05, ex.z + (from.z - ex.z) * 0.05, nearestRoadNode(dest.x, dest.z).i);
  c.path.push([dest.x, dest.z]);
  c.pi = 0; c.state = 'drive'; c.arriving = true; c.dest = dest; c.want = n;
  c.yaw = yawOf(c.path[1][0] - c.x, c.path[1][1] - c.z);
  carHeadlights(c, true);
  return c;
}
function nearestRoadNode(x, z) { let b = null, bd = 1e9; for (const n of WORLD.nodes) { if (n.exit) continue; const d = dist2(x, z, n.x, n.z); if (d < bd) { bd = d; b = n; } } return b; }

function updateCars(dt) {
  for (const c of CARS.list) {
    if (c.dead) continue;
    if (c.state === 'drive') driveCar(c, dt);
    else if (c.state === 'flying') flyCar(c, dt);
    else if (c.state === 'held') continue;
    c.honk = Math.max(0, c.honk - dt);
    c.mesh.position.set(c.x, c.y, c.z); c.mesh.rotation.y = c.yaw;
    if (c.light) { const [fx, fz] = carFwd(c); c.light.x = c.x + fx * 6; c.light.z = c.z + fz * 6; }
  }
}
function driveCar(c, dt) {
  const tgt = c.path[c.pi];
  if (!tgt) return endDrive(c);
  const dx = tgt[0] - c.x, dz = tgt[1] - c.z, d = Math.hypot(dx, dz);
  const last = c.pi === c.path.length - 1;
  if (d < (last ? 2 : 5)) { c.pi++; if (c.pi >= c.path.length) return endDrive(c); return; }
  const want = yawOf(dx, dz);
  const err = angWrap(want - c.yaw);
  const top = c.arriving ? 11 : 17;
  const slow = Math.abs(err) > 0.5 ? 6 : last && d < 25 ? Math.max(3, d * 0.5) : top;
  // brake for the monster standing in the road
  let block = 1;
  if (P) { const [fx, fz] = carFwd(c); const px = P.x - c.x, pz = P.z - c.z, ahead = px * fx + pz * fz, side = Math.abs(px * fz - pz * fx); if (ahead > 0 && ahead < 9 && side < 1.8 && P.y < c.y + 2) block = c.arriving ? 0 : 0.35; }
  c.speed = damp(c.speed, slow * block, c.speed < slow ? 1.5 : 4, dt);
  c.yaw = angTo(c.yaw, want, dt * clamp(c.speed / 4, 0.4, 2.2));
  const [fx, fz] = carFwd(c);
  c.x += fx * c.speed * dt; c.z += fz * c.speed * dt;
  c.y = terrainH(c.x, c.z);
  // run into the monster: a shove for it, a jolt for the car
  if (P && P.y < c.y + 1.5 && dist2(c.x + fx * 2, c.z + fz * 2, P.x, P.z) < 2.2 * 2.2 && c.speed > 6) {
    P.vx += fx * c.speed * 0.6; P.vz += fz * c.speed * 0.6; P.vy = 3; c.speed *= 0.2; FX.shake = 0.6; AUDIO.sfx('thud', c.x, c.z);
  }
  // knock people out of the way rather than through them
  if (c.honk <= 0 && c.speed > 4) for (const v of PEOPLE.list) if (v.state === 'walk' && dist2(v.x, v.z, c.x + fx * 6, c.z + fz * 6) < 9) { c.honk = 2; AUDIO.sfx('horn', c.x, c.z); break; }
}
function endDrive(c) {
  c.speed = 0;
  if (c.arriving) {
    c.arriving = false; c.state = 'parked'; carHeadlights(c, false);
    // everyone gets out at the destination
    for (let i = 0; i < c.want; i++) spawnPerson(null, c.x + rr(-2, 2), c.z + rr(-2, 2), { dest: c.dest, car: c });
    c.want = 0;
    return;
  }
  if (c.target && c.target.exit) {
    // gone: whoever was inside escaped
    for (const v of c.occ) escapePerson(v);
    c.occ.length = 0; c.dead = true; R.scene.remove(c.mesh); if (c.light) c.light.on = false;
    return;
  }
  c.state = 'parked';
}
// the monster hits a car: it stops dead, glass flies; returns the people inside
function smashCar(c, power = 1) {
  if (c.dead) return [];
  c.hp -= power;
  const out = c.occ.slice();
  if (c.state === 'drive') { c.state = 'stopped'; c.speed = 0; }
  spray(c.x, c.y + 1.3, c.z, 12, { kind: 'debris', col: [0xa8d0e8, 0xd8f0ff, 0x6a8a9a], speed: 4, up: 0.8, spread: 1, size: 0.06, life: 3 });
  AUDIO.sfx('crash', c.x, c.z);
  if (c.hp <= 0 && c.state !== 'wreck') wreckCar(c);
  return out;
}
function wreckCar(c) {
  c.state = 'wreck'; c.speed = 0;
  c.body.scale.set(1.04, 0.72, 0.94); c.body.rotation.z = rr(-0.12, 0.12);
  carHeadlights(c, false);
  puff(c.x, c.y + 1.5, c.z, { col: 0x3a3a3a, size: 2, grow: 2, life: 3, vy: 1.2, op: 0.5 });
}
function flyCar(c, dt) {
  c.vy -= 16 * dt;
  c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
  c.yaw += c.spin * dt; c.mesh.rotation.x += c.spin * 0.5 * dt;
  const gy = supportY(c.x, c.z, c.y + 0.5, 1);
  hitByThrown(c.x, c.y + 0.6, c.z, 3.2, { kind: 'car', vx: c.vx, vz: c.vz });
  if (c.y <= gy && c.vy < 0) {
    c.y = gy; c.state = 'wreck'; c.mesh.rotation.x = Math.random() < 0.4 ? Math.PI : 0; if (c.mesh.rotation.x) c.y += 1.6;
    c.top = c.mesh.rotation.x ? 0.5 : c.top;
    wreckCar(c);
    FX.shake = Math.max(FX.shake, 0.8); dustRing(c.x, c.z, 6, 16); AUDIO.sfx('crash', c.x, c.z);
    hitByThrown(c.x, c.y + 0.5, c.z, 3.6, { kind: 'car', vx: c.vx, vz: c.vz, land: true });
  }
}
function clearCars() { for (const c of CARS.list) { R.scene.remove(c.mesh); if (c.light) c.light.on = false; } CARS.list.length = 0; LIGHTS.extra.length = 0; }
