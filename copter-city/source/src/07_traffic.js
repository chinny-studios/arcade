// Copter City — traffic on the road graph and pedestrians on the sidewalks, both drawn as instanced meshes.
// A car travels along an edge from node A to node B in the right-hand lane; at B it picks a new edge.
// Jammed nodes stop cars that reach them; the megaphone clears them.

const TRAFFIC = { cars: [], peds: [], carMesh: null, busMesh: null, pedCloth: null, pedSkin: null, lane: 2.8 };

function carGeometry(big) {
  const M = new Merger();
  if (big) { M.box(0, 0.4, 0, 2.4, 2.6, 8, 0xffffff); M.box(0, 1.9, -3.95, 2.2, 0.8, 0.1, 0x303840); for (const z of [-2.8, 2.8]) for (const x of [-1, 1]) M.geom(GM.cyl(), x * 1.1, 0.45, z, 0.9, 0.3, 0.9, 0x181818, 0, 0, Math.PI / 2); M.box(0, 2.0, 0, 2.42, 0.5, 7.4, 0x404850); }
  else {
    M.box(0, 0.3, 0, 1.8, 0.75, 4.2, 0xffffff); M.box(0, 1.05, 0.2, 1.6, 0.6, 2.2, 0x8a8a8a); M.box(0, 1.08, -0.9, 1.5, 0.5, 0.1, 0x283440);
    for (const z of [-1.35, 1.35]) for (const x of [-1, 1]) M.geom(GM.cyl(), x * 0.86, 0.33, z, 0.66, 0.22, 0.66, 0x181818, 0, 0, Math.PI / 2);
  }
  return M.build();
}
function personGeometry(part) {
  const M = new Merger();
  if (part === 'cloth') { M.box(-0.14, 0, 0, 0.2, 0.85, 0.22, 0x505060); M.box(0.14, 0, 0, 0.2, 0.85, 0.22, 0x505060); M.box(0, 0.85, 0, 0.5, 0.66, 0.28, 0xffffff); M.box(-0.33, 0.9, 0, 0.14, 0.6, 0.16, 0xffffff); M.box(0.33, 0.9, 0, 0.14, 0.6, 0.16, 0xffffff); }
  else { M.box(0, 1.52, 0, 0.3, 0.32, 0.3, 0xffffff); M.box(0, 1.82, 0.02, 0.32, 0.08, 0.32, 0x403020); }
  return M.build();
}
function initTraffic() {
  const T = TRAFFIC;
  for (const m of [T.carMesh, T.busMesh, T.pedCloth, T.pedSkin]) if (m) { CITY.group.remove(m); }
  T.cars = []; T.peds = [];
  const c = CITY;
  const nCars = Math.min(170, Math.round(c.edges.length * 0.9)), nBus = Math.round(nCars * 0.12);
  T.carMesh = new THREE.InstancedMesh(carGeometry(false), new THREE.MeshLambertMaterial({ vertexColors: true }), nCars);
  T.busMesh = new THREE.InstancedMesh(carGeometry(true), new THREE.MeshLambertMaterial({ vertexColors: true }), nBus);
  const col = new THREE.Color();
  for (let i = 0; i < nCars + nBus; i++) {
    const big = i >= nCars, k = big ? i - nCars : i;
    const car = { i: k, big, mesh: big ? T.busMesh : T.carMesh, len: big ? 8 : 4.2, vmax: big ? rr(9, 11) : rr(11, 15), v: 0, x: 0, z: 0, yaw: 0, stop: 0, horn: 0 };
    placeCarRandom(car);
    car.mesh.setColorAt(k, col.setHex(big ? pick([0xe8c040, 0xe8e8e8, 0x3a6ac8, 0xd8d8d0]) : pick(CAR_COLS)));
    T.cars.push(car);
  }
  for (const m of [T.carMesh, T.busMesh]) { m.instanceColor.needsUpdate = true; m.frustumCulled = false; c.group.add(m); }
  // pedestrians
  const loops = c.walkLoops.filter((l) => !['farm', 'hangar'].includes(l.b.kind));
  const nPed = Math.min(160, loops.length * 3);
  T.pedCloth = new THREE.InstancedMesh(personGeometry('cloth'), new THREE.MeshLambertMaterial({ vertexColors: true }), nPed);
  T.pedSkin = new THREE.InstancedMesh(personGeometry('skin'), new THREE.MeshLambertMaterial({ vertexColors: true }), nPed);
  for (let i = 0; i < nPed; i++) {
    const l = pick(loops), per = 2 * (l.x1 - l.x0 + l.z1 - l.z0);
    T.peds.push({ i, loop: l, per, t: rr(0, per), v: rr(1.1, 1.6) * (chance(0.5) ? 1 : -1), x: 0, z: 0, yaw: 0, flee: 0, ph: rr(0, 9) });
    T.pedCloth.setColorAt(i, col.setHex(pick(CLOTHES))); T.pedSkin.setColorAt(i, col.setHex(pick(SKIN)));
  }
  for (const m of [T.pedCloth, T.pedSkin]) { m.instanceColor.needsUpdate = true; m.frustumCulled = false; c.group.add(m); }
}
function placeCarRandom(car) {
  const es = CITY.edges.filter((e) => !e.blocked);
  car.e = pick(es); car.dir = chance(0.5) ? 1 : -1; car.t = rr(0, P); car.v = car.vmax * 0.5; car.dead = false; car.stop = 0;
}
const carFrom = (car) => (car.dir > 0 ? car.e.a : car.e.b);
const carTo = (car) => (car.dir > 0 ? car.e.b : car.e.a);
// move a road follower along the graph. choose(node, options, car) can pick the next edge (default random).
function followRoad(car, dt, choose) {
  car.t += car.v * dt;
  while (car.t > car.e.len) {
    car.t -= car.e.len;
    const n = carTo(car);
    let opts = n.edges.filter((e) => e !== car.e && !e.blocked);
    if (!opts.length) opts = [car.e];
    const ne = choose ? choose(n, opts, car) : pick(opts);
    car.dir = ne.a === n ? 1 : -1; car.e = ne;
  }
  const A = carFrom(car), B = carTo(car), dx = (B.x - A.x) / car.e.len, dz = (B.z - A.z) / car.e.len;
  const lane = car.lane !== undefined ? car.lane : TRAFFIC.lane;
  car.x = A.x + dx * car.t - dz * lane; car.z = A.z + dz * car.t + dx * lane;
  car.yaw = Math.atan2(-dx, -dz);
}
function updateTraffic(dt) {
  const T = TRAFFIC;
  // leaders: bucket cars by edge and direction
  const lanes = new Map();
  for (const car of T.cars) { if (car.dead) continue; const k = car.e.id * 2 + (car.dir > 0 ? 1 : 0); let l = lanes.get(k); if (!l) lanes.set(k, (l = [])); l.push(car); }
  for (const l of lanes.values()) l.sort((a, b) => a.t - b.t);
  const hx = HELI.x, hz = HELI.z, heliLow = HELI.y - surfaceY(HELI.x, HELI.z) < 3, onFoot = G.where === 'foot' && PILOT.y < 1.5;
  for (const l of lanes.values()) {
    for (let i = 0; i < l.length; i++) {
      const car = l[i], lead = l[i + 1];
      let target = car.vmax;
      const left = car.e.len - car.t;
      if (lead) { const gap = lead.t - car.t - (lead.len + car.len) / 2; target = Math.min(target, Math.max(0, (gap - 2.5) * 1.2)); }
      const n = carTo(car);
      if (n.jam > 0 && left < 14 + (n.jamQ || 0)) target = Math.min(target, Math.max(0, (left - 10) * 0.8));
      else if (left < 10 && n.edges.length > 2) target = Math.min(target, 7);
      if (car.stop > 0) { car.stop -= dt; target = 0; }
      if (heliLow && dist2(car.x - Math.sin(car.yaw) * 6, car.z - Math.cos(car.yaw) * 6, hx, hz) < 49) target = 0;
      if (onFoot && dist2(car.x - Math.sin(car.yaw) * 5, car.z - Math.cos(car.yaw) * 5, PILOT.x, PILOT.z) < 12) target = 0;
      car.v = target < car.v ? Math.max(target, car.v - 14 * dt) : Math.min(target, car.v + 4 * dt);
      car.horn = car.v < 0.5 && n.jam > 0 ? car.horn + dt : 0;
    }
  }
  const m4 = new THREE.Matrix4();
  for (const car of T.cars) {
    if (car.dead) { car.respawn = (car.respawn || 0) - dt; if (car.respawn <= 0) placeCarRandom(car); m4.makeScale(0, 0, 0); car.mesh.setMatrixAt(car.i, m4); continue; }
    followRoad(car, dt);
    m4.compose(_v1.set(car.x, 0.03, car.z), _q.setFromAxisAngle(_up, car.yaw), _sc.set(1, 1, 1));
    car.mesh.setMatrixAt(car.i, m4);
  }
  T.carMesh.instanceMatrix.needsUpdate = true; T.busMesh.instanceMatrix.needsUpdate = true;
  // jams count their queue
  for (const n of CITY.nodes) if (n.jam > 0) n.jamQ = Math.min(40, n.jamQ + dt * 2);
  updatePeds(dt);
}
function updatePeds(dt) {
  const T = TRAFFIC, m4 = new THREE.Matrix4();
  const night = R.night > 0.6;
  const fleeFrom = G.fleePoints || [];
  for (const p of T.peds) {
    const L = p.loop, w = L.x1 - L.x0, d = L.z1 - L.z0;
    let v = p.v;
    if (p.flee > 0) { p.flee -= dt; v *= 2.4; }
    p.t = ((p.t + v * dt) % p.per + p.per) % p.per;
    let t = p.t, x, z, yaw;
    if (t < w) { x = L.x0 + t; z = L.z0; yaw = -Math.PI / 2; }
    else if ((t -= w) < d) { x = L.x1; z = L.z0 + t; yaw = Math.PI; }
    else if ((t -= d) < w) { x = L.x1 - t; z = L.z1; yaw = Math.PI / 2; }
    else { t -= w; x = L.x0; z = L.z1 - t; yaw = 0; }
    if (v < 0) yaw += Math.PI;
    p.x = x; p.z = z;
    for (const f of fleeFrom) if (dist2(x, z, f.x, f.z) < f.r * f.r && p.flee <= 0) { p.flee = 6; if (Math.random() < 0.5) p.v = -p.v; }
    const hide = (night && (p.i % 3 !== 0)) || L.b.kind === 'hangar';
    const bob = Math.abs(Math.sin((p.t + p.ph) * 4)) * 0.06;
    m4.compose(_v1.set(x, CURB + bob, z), _q.setFromAxisAngle(_up, yaw), _sc.setScalar(hide ? 0 : 1));
    T.pedCloth.setMatrixAt(p.i, m4); T.pedSkin.setMatrixAt(p.i, m4);
  }
  T.pedCloth.instanceMatrix.needsUpdate = true; T.pedSkin.instanceMatrix.needsUpdate = true;
}
// cars as obstacles: three or four upright cylinders along each car. Traffic plus any moving call cars in G.dynCars
// ({ x, z, yaw, big }: a getaway car, police cruisers).
const _carCyl = [];
function carCylinders(x, z, r) {
  _carCyl.length = 0;
  const add = (c) => {
    if (c.dead || dist2(c.x, c.z, x, z) > (r + 6) * (r + 6)) return;
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), big = c.big;
    for (const k of big ? [-2.8, -0.9, 0.9, 2.8] : [-1.3, 0, 1.3]) _carCyl.push({ x: c.x + fx * k, z: c.z + fz * k, r: big ? 1.25 : 0.95, y0: 0, y1: big ? 3.0 : 1.7, car: c });
  };
  for (const c of TRAFFIC.cars) add(c);
  for (const c of G.dynCars || []) add(c);
  return _carCyl;
}
// push a sphere out of nearby cars (into res, the same shape collideSphere returns)
function pushFromCars(res, r) {
  let car = null;
  for (const cy of carCylinders(res.x, res.z, r)) if (pushOut(res, r, cy)) car = cy.car;
  return car;
}
function carsNear(x, z, r) { return TRAFFIC.cars.filter((c) => !c.dead && dist2(c.x, c.z, x, z) < r * r); }
function pedsNear(x, z, r) { return TRAFFIC.peds.filter((p) => dist2(p.x, p.z, x, z) < r * r); }
function kickCar(car, respawn = 30) { car.dead = true; car.respawn = respawn; }
// block or unblock the edges touching a point (a crash site): cars on them are moved elsewhere
function blockEdgeAt(x, z, on) {
  let best = null, bd = 1e9;
  for (const e of CITY.edges) { const mx = (e.a.x + e.b.x) / 2, mz = (e.a.z + e.b.z) / 2; const d = dist2(mx, mz, x, z); if (d < bd) { bd = d; best = e; } }
  if (!best) return null;
  best.blocked = on;
  if (on) for (const car of TRAFFIC.cars) if (car.e === best) placeCarRandom(car);
  return best;
}
