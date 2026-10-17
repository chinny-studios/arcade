// Ricky Rescue — traffic: AI cars on the road graph (signals, stop signs, following, yielding to lights and sirens),
// parked cars and sidewalk pedestrians. Cars and pedestrians are drawn with instanced meshes.

const TRAFFIC = { cars: [], parked: [], peds: [], inst: {}, pedInst: null, t: 0, enabled: true, density: 1, sigTick: 0 };
const MAX_MOVING = 64, PER_TYPE = 260;
const CAR_TYPE_IDS = Object.keys(CAR_TYPES);

function initTraffic() {
  // instanced meshes: one set per car type, shared by parked and moving cars
  for (const t of CAR_TYPE_IDS) {
    const G = getCarGeo(t);
    const body = new THREE.InstancedMesh(G.body, new THREE.MeshLambertMaterial({ color: 0xffffff }), PER_TYPE);
    const dark = new THREE.InstancedMesh(G.dark, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), PER_TYPE);
    const lights = new THREE.InstancedMesh(G.lights, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }), PER_TYPE);
    for (const m of [body, dark, lights]) { m.count = 0; m.frustumCulled = false; R.scene.add(m); }
    body.castShadow = true; body.receiveShadow = true; dark.castShadow = true;
    TRAFFIC.inst[t] = { body, dark, lights, used: 0, free: [] };
  }
  spawnParked();
  // pedestrians: a body, head and legs, instanced
  const n = 90;
  const bodyG = new THREE.BoxGeometry(0.42, 0.62, 0.26).translate(0, 1.2, 0), headG = new THREE.BoxGeometry(0.22, 0.25, 0.23).translate(0, 1.66, 0), legG = new THREE.BoxGeometry(0.34, 0.88, 0.2).translate(0, 0.44, 0);
  TRAFFIC.pedInst = {
    body: new THREE.InstancedMesh(bodyG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n),
    head: new THREE.InstancedMesh(headG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n),
    legs: new THREE.InstancedMesh(legG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n),
  };
  for (const m of Object.values(TRAFFIC.pedInst)) { m.frustumCulled = false; m.castShadow = true; R.scene.add(m); }
  const r = RNG('peds');
  for (let i = 0; i < n; i++) {
    const L = civilianLook(r);
    TRAFFIC.peds.push({ i, b: null, p: 0, dir: r.chance(0.5) ? 1 : -1, v: r.range(1.1, 1.6), off: r.range(0.9, 2.6), x: 0, z: 0, yaw: 0, dodge: 0, ph: r() * 10, look: L, h: L.h });
    TRAFFIC.pedInst.body.setColorAt(i, new THREE.Color(L.shirt)); TRAFFIC.pedInst.head.setColorAt(i, new THREE.Color(L.skin)); TRAFFIC.pedInst.legs.setColorAt(i, new THREE.Color(L.pants));
  }
}
function allocInst(type) {
  const I = TRAFFIC.inst[type];
  let idx = I.free.pop();
  if (idx === undefined) { if (I.used >= PER_TYPE) return -1; idx = I.used++; }
  I.body.count = I.dark.count = I.lights.count = Math.max(I.body.count, idx + 1);
  return idx;
}
function freeInst(type, idx) { const I = TRAFFIC.inst[type]; I.free.push(idx); _m4.makeScale(0, 0, 0); I.body.setMatrixAt(idx, _m4); I.dark.setMatrixAt(idx, _m4); I.lights.setMatrixAt(idx, _m4); markInst(I); }
function markInst(I) { I.body.instanceMatrix.needsUpdate = I.dark.instanceMatrix.needsUpdate = I.lights.instanceMatrix.needsUpdate = true; }
function setInst(type, idx, x, y, z, yaw, rx = 0, rz = 0) {
  const I = TRAFFIC.inst[type];
  _q.setFromEuler(_eul.set(rx, yaw, rz, 'YXZ'));
  _m4.compose(_v3.set(x, y, z), _q, _sc.set(1, 1, 1));
  I.body.setMatrixAt(idx, _m4); I.dark.setMatrixAt(idx, _m4); I.lights.setMatrixAt(idx, _m4);
}
const _eul = new THREE.Euler();

function spawnParked() {
  const r = RNG('parked-3');
  for (const e of CITY.edges) {
    if (e.lanes !== 1) continue;
    const A = CITY.nodes[e.a], B = CITY.nodes[e.b];
    const hA = e.axis === 'x' ? halfOf(A.i) : halfOf(A.j), hB = e.axis === 'x' ? halfOf(B.i) : halfOf(B.j);
    for (const side of [1, -1]) {
      // side +1: the right-hand side when driving a→b
      const dist = districtAt(A.x, A.z);
      const occ = dist === 'downtown' ? 0.5 : dist === 'harbor' ? 0.25 : 0.32;
      for (let s = hA + 12; s < CP - hB - 10; s += 7.2) {
        if (!r.chance(occ)) continue;
        const type = r.wpick(['sedan', 'hatch', 'suv', 'pickup', 'van'], (t) => ({ sedan: 4, hatch: 3, suv: 3, pickup: 1.5, van: dist === 'harbor' ? 2 : 0.6 }[t]));
        const T = CAR_TYPES[type];
        let x, z, yaw;
        const off = parkOff(e.line) - 0.15;
        if (e.axis === 'x') { x = A.x + s; z = A.z + side * off; yaw = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
        else { z = A.z + s; x = A.x - side * off; yaw = side > 0 ? 0 : Math.PI; }
        // keep curbs in front of call places clear
        if (CITY.places.some((p) => dist2(p.curb.x, p.curb.z, x, z) < 9 * 9)) continue;
        const idx = allocInst(type); if (idx < 0) continue;
        const col = r.pick(CAR_COLORS);
        TRAFFIC.inst[type].body.setColorAt(idx, new THREE.Color(col));
        setInst(type, idx, x, 0, z, yaw);
        const hl = T.len / 2, hw = T.wid / 2;
        const sol = e.axis === 'x' ? addSolid(x - hl, z - hw, x + hl, z + hw, 1.5, 'car') : addSolid(x - hw, z - hl, x + hw, z + hl, 1.5, 'car');
        TRAFFIC.parked.push({ type, idx, x, z, yaw, sol });
      }
    }
  }
  for (const I of Object.values(TRAFFIC.inst)) { markInst(I); if (I.body.instanceColor) I.body.instanceColor.needsUpdate = true; }
}

// ---------- moving cars ----------
function edgeEnds(e, dir) { return dir > 0 ? [CITY.nodes[e.a], CITY.nodes[e.b]] : [CITY.nodes[e.b], CITY.nodes[e.a]]; }
function crossHalf(e, node) { return e.axis === 'x' ? halfOf(node.i) : halfOf(node.j); }
// world position on an edge at distance s from its start node (in travel direction), lateral offset (to the right)
function edgePos(e, dir, s, off) {
  const [S] = edgeEnds(e, dir);
  const dx = e.axis === 'x' ? dir : 0, dz = e.axis === 'z' ? dir : 0;
  return { x: S.x + dx * s - dz * off, z: S.z + dz * s + dx * off, yaw: Math.atan2(dx, dz), dx, dz };
}
function spawnCar(e, dir, s, r = rnd) {
  const type = r.wpick(CAR_TYPE_IDS, (t) => ({ sedan: 4, hatch: 3, suv: 3, pickup: 1.4, van: 1 }[t]));
  const idx = allocInst(type); if (idx < 0) return null;
  const col = r.pick(CAR_COLORS);
  TRAFFIC.inst[type].body.setColorAt(idx, new THREE.Color(col)); TRAFFIC.inst[type].body.instanceColor.needsUpdate = true;
  const c = { type, idx, e, dir, s, lane: r.int(0, e.lanes - 1), v: e.speed * 0.6, vmax: e.speed * r.range(0.85, 1.08), pull: 0, pullT: 0, state: 'drive', wait: 0, len: CAR_TYPES[type].len, wid: CAR_TYPES[type].wid, x: 0, z: 0, yaw: 0, turn: null, crashT: 0, honkT: 0 };
  placeCar(c);
  TRAFFIC.cars.push(c);
  return c;
}
function despawnCar(c) { freeInst(c.type, c.idx); TRAFFIC.cars.splice(TRAFFIC.cars.indexOf(c), 1); }
function placeCar(c) {
  if (c.turn) {
    const T = c.turn, u = clamp(T.d / T.len, 0, 1), a = 1 - u;
    const x = a * a * T.p0.x + 2 * a * u * T.p1.x + u * u * T.p2.x, z = a * a * T.p0.z + 2 * a * u * T.p1.z + u * u * T.p2.z;
    const tx = 2 * a * (T.p1.x - T.p0.x) + 2 * u * (T.p2.x - T.p1.x), tz = 2 * a * (T.p1.z - T.p0.z) + 2 * u * (T.p2.z - T.p1.z);
    c.x = x; c.z = z; c.yaw = Math.atan2(tx, tz);
  } else {
    const p = edgePos(c.e, c.dir, c.s, laneOff(c.lane) + c.pull);
    c.x = p.x; c.z = p.z; c.yaw = p.yaw;
  }
}
// choose where to go at the end node: returns {e, dir, lane, kind}
function chooseNext(c, node) {
  const opts = [];
  for (const e of node.edges) {
    const dir = e.a === node.id ? 1 : -1;
    if (e === c.e) continue; // no U-turns
    // turn kind from the cross product of headings
    const dx0 = c.e.axis === 'x' ? c.dir : 0, dz0 = c.e.axis === 'z' ? c.dir : 0;
    const dx1 = e.axis === 'x' ? dir : 0, dz1 = e.axis === 'z' ? dir : 0;
    const cross = dx0 * dz1 - dz0 * dx1; // >0: right turn (x→z), <0: left turn
    const kind = cross === 0 ? 'straight' : cross > 0 ? 'right' : 'left';
    opts.push({ e, dir, kind, w: kind === 'straight' ? 3 : 1 });
  }
  if (!opts.length) return { e: c.e, dir: -c.dir, kind: 'uturn', lane: 0 };
  const o = rnd.wpick(opts, (q) => q.w);
  o.lane = o.kind === 'right' ? o.e.lanes - 1 : o.kind === 'left' ? 0 : Math.min(c.lane, o.e.lanes - 1);
  return o;
}
function beginTurn(c, node) {
  const n = chooseNext(c, node);
  const hEnd = crossHalf(c.e, node);
  const p0 = edgePos(c.e, c.dir, CP - hEnd, laneOff(c.lane));
  const h1 = crossHalf(n.e, node);
  const p2 = edgePos(n.e, n.dir, h1, laneOff(n.lane));
  // control point: where the two lane lines cross (or the middle for straight on)
  let p1;
  if (n.kind === 'straight' || n.kind === 'uturn') p1 = { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 };
  else p1 = c.e.axis === 'x' ? { x: p2.x, z: p0.z } : { x: p0.x, z: p2.z };
  const len = Math.hypot(p1.x - p0.x, p1.z - p0.z) + Math.hypot(p2.x - p1.x, p2.z - p1.z);
  c.turn = { p0, p1, p2, len: len * 0.92, d: 0, node, next: n };
  node.busy = (node.busy || 0) + 1;
}
function endTurn(c) {
  const T = c.turn; T.node.busy = Math.max(0, (T.node.busy || 1) - 1);
  c.e = T.next.e; c.dir = T.next.dir; c.lane = T.next.lane; c.s = crossHalf(c.e, T.node); c.turn = null; c.wait = 0; c.stopped = false;
  c.vmax = c.e.speed * rnd.range(0.85, 1.08);
}

// is the rig a threat that this car should yield to?
function sirenYield(c) {
  let best = 0;
  for (const A of sirenVehicles()) { const y = yieldTo(c, A); if (y === 2 || y === 1) return y; if (y) best = y; }
  return best;
}
// how car c should react to one emergency vehicle A: 2 pull over (behind), 1 pull over (oncoming), 3 hold (crossing)
function yieldTo(c, A) {
  const dx = A.x - c.x, dz = A.z - c.z, d = Math.hypot(dx, dz);
  if (d > 70) return 0;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const along = dx * fx + dz * fz, lat = -dx * fz + dz * fx;
  const afx = Math.sin(A.yaw), afz = Math.cos(A.yaw);
  const same = afx * fx + afz * fz;
  if (along < 2 && along > -55 && Math.abs(lat) < 9 && same > 0.5) return 2;    // coming up behind: pull over
  if (along > 0 && along < 45 && Math.abs(lat) < 12 && same < -0.5) return 1;   // oncoming: ease right and slow
  if (d < 40 && Math.abs(same) < 0.5) { // crossing traffic near an intersection
    const toCar = -(dx * afx + dz * afz);
    if (toCar > -6) return 3;
  }
  return 0;
}
function carAhead(c) {
  // nearest car in front in the same lane, or the rig
  let best = null, bd = 60;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const test = (x, z, len, v) => {
    const dx = x - c.x, dz = z - c.z, along = dx * fx + dz * fz, lat = Math.abs(-dx * fz + dz * fx);
    if (along > 0 && along - (len + c.len) / 2 < bd && lat < 2.1) { bd = along - (len + c.len) / 2; best = { d: bd, v, rig }; }
  };
  let rig = false;
  for (const o of TRAFFIC.cars) if (o !== c && Math.abs(o.x - c.x) < 60 && Math.abs(o.z - c.z) < 60) test(o.x, o.z, o.len, o.v);
  rig = true;
  for (const b of SCENE.blockers) test(b.x, b.z, b.len, 0);
  for (const u of RESP.units) if (u.state === 'enroute' || u.state === 'returning' || u.state === 'leaving') test(u.x, u.z, u.kind === 'fire' ? 9.5 : 4.6, u.v);
  if (RIG && RIG.active) test(RIG.x, RIG.z, RIG.len, Math.max(0, RIG.v * (Math.sin(RIG.yaw) * fx + Math.cos(RIG.yaw) * fz)));
  return best;
}
function updateCar(c, dt, now) {
  if (c.crashT > 0) { c.crashT -= dt; c.v = 0; placeCar(c); return; }
  let vt = c.vmax;
  // yielding
  const y = sirenYield(c);
  if (y === 2 || y === 1) { c.pullT = 3.5; }
  if (c.pullT > 0) {
    c.pullT -= dt;
    if (!c.turn) {
      const curbPull = parkOff(c.e.line) - laneOff(c.lane) - 0.2;
      // single-lane roads: hug the curb; multi-lane: the inner lane moves over a whole lane
      c.pull = lerp(c.pull, c.e.lanes === 1 ? Math.min(curbPull, 2.1) : (c.lane === c.e.lanes - 1 ? 1.5 : 3.5 + 1.2), 1 - Math.exp(-dt * 2.5));
    }
    vt = y === 2 || y === 1 ? 0 : vt * 0.4;
  } else if (c.pull !== 0 && !c.turn) { c.pull = lerp(c.pull, 0, 1 - Math.exp(-dt * 1.5)); if (Math.abs(c.pull) < 0.02) c.pull = 0; }
  if (c.turn) {
    // in the intersection: finish the turn, slower on tight turns
    if (c.turn.next.kind !== 'straight') vt = Math.min(vt, 7);
    const a = carAhead(c); if (a) vt = Math.min(vt, Math.max(0, (a.d - 2.5) * 1.2));
    c.v = approach(c.v, vt, dt);
    c.turn.d += c.v * dt;
    if (c.turn.d >= c.turn.len) endTurn(c);
  } else {
    const [, E] = edgeEnds(c.e, c.dir);
    const hEnd = crossHalf(c.e, E);
    const stopS = CP - hEnd - (E.signal ? 3.6 : 1.0) - c.len / 2;
    // intersection control ahead
    let mustStop = false;
    if (E.signal) {
      const st = signalState(E, c.e.axis, TRAFFIC.t);
      if (st === 'r' || (st === 'y' && stopS - c.s > c.v * 1.2 + 1)) mustStop = true;
      if (c.s > stopS + 0.5) mustStop = false; // already committed
    } else {
      // four-way stop: stop at the line once, then go when the box is clear (or after a while)
      if (!c.stopped) mustStop = true;
      else if (E.busy > 0 && c.wait < 5) mustStop = true;
    }
    if (y === 3 && stopS - c.s > -1) mustStop = true; // the rig is crossing
    if (mustStop) {
      vt = Math.min(vt, Math.max(0, (stopS - c.s) * 0.9));
      if (stopS - c.s < 0.8 && c.v < 0.4) { c.wait += dt; if (!E.signal && c.wait > 0.7) c.stopped = true; }
    }
    const a = carAhead(c);
    if (a) {
      // a stopped rig blocking the lane: after a moment, swing out round it
      if (a.rig && a.v < 0.5 && c.v < 0.5) { c.blockT = (c.blockT || 0) + dt; if (c.blockT > 2.5) c.passT = 6; }
      if (!(a.rig && c.passT > 0)) vt = Math.min(vt, Math.max(0, (a.d - 3) * 1.1));
    } else c.blockT = 0;
    if (c.passT > 0) { c.passT -= dt; c.pull = lerp(c.pull, c.e.lanes === 1 ? -3.4 : (c.lane ? -3.5 : 3.5), 1 - Math.exp(-dt * 2)); vt = Math.min(vt, 6); }
    c.v = approach(c.v, vt, dt);
    c.s += c.v * dt;
    if (c.s >= CP - hEnd && !mustStop) { c.pull = 0; c.passT = 0; beginTurn(c, E); }
    else if (c.s > CP - hEnd) c.s = CP - hEnd;
  }
  placeCar(c);
  if (c.honkT > 0) c.honkT -= dt;
}
function approach(v, vt, dt) { return v < vt ? Math.min(vt, v + 3.2 * dt) : Math.max(vt, v - 7.5 * dt); }

function updateTraffic(dt, focusX, focusZ) {
  TRAFFIC.t += dt;
  TRAFFIC.sigTick -= dt;
  if (TRAFFIC.sigTick <= 0) { TRAFFIC.sigTick = 0.25; updateSignalLamps(TRAFFIC.t); }
  if (!TRAFFIC.enabled) return;
  // keep about MAX_MOVING cars within range of the focus
  const target = Math.round(MAX_MOVING * TRAFFIC.density);
  for (let i = TRAFFIC.cars.length - 1; i >= 0; i--) {
    const c = TRAFFIC.cars[i];
    if (dist2(c.x, c.z, focusX, focusZ) > 380 * 380 && !c.keep) { if (c.turn) c.turn.node.busy = Math.max(0, c.turn.node.busy - 1); despawnCar(c); }
  }
  let tries = 0;
  while (TRAFFIC.cars.length < target && tries++ < 6) {
    const e = CITY.edges[Math.floor(Math.random() * CITY.edges.length)];
    const A = CITY.nodes[e.a];
    const d = dist(A.x + (e.axis === 'x' ? 40 : 0), A.z + (e.axis === 'z' ? 40 : 0), focusX, focusZ);
    if (d > 340 || (d < 150 && TRAFFIC.warm)) continue;
    const dir = Math.random() < 0.5 ? 1 : -1, s = rnd.range(15, CP - 20);
    const p = edgePos(e, dir, s, laneOff(0));
    if (TRAFFIC.cars.some((o) => dist2(o.x, o.z, p.x, p.z) < 12 * 12)) continue;
    if (RIG && dist2(RIG.x, RIG.z, p.x, p.z) < 20 * 20) continue;
    spawnCar(e, dir, s);
  }
  TRAFFIC.warm = true;
  for (const c of TRAFFIC.cars) updateCar(c, dt);
  for (const c of TRAFFIC.cars) setInst(c.type, c.idx, c.x, 0, c.z, c.yaw, c.crashT > 0 ? 0.02 : 0, 0);
  for (const I of Object.values(TRAFFIC.inst)) markInst(I);
  updatePeds(dt, focusX, focusZ);
}
function clearTraffic() { for (const c of [...TRAFFIC.cars]) despawnCar(c); for (const n of CITY.nodes) n.busy = 0; TRAFFIC.warm = false; }

// ---------- pedestrians ----------
function pedPos(p) {
  // walk a rectangle around a block's sidewalk, `off` metres in from the curb
  const b = p.b, x0 = b.sx0 + p.off, x1 = b.sx1 - p.off, z0 = b.sz0 + p.off, z1 = b.sz1 - p.off;
  const w = x1 - x0, h = z1 - z0, per = 2 * (w + h);
  let s = ((p.p % per) + per) % per;
  let x, z, dx, dz;
  if (s < w) { x = x0 + s; z = z0; dx = 1; dz = 0; }
  else if ((s -= w) < h) { x = x1; z = z0 + s; dx = 0; dz = 1; }
  else if ((s -= h) < w) { x = x1 - s; z = z1; dx = -1; dz = 0; }
  else { s -= w; x = x0; z = z1 - s; dx = 0; dz = -1; }
  return { x, z, yaw: Math.atan2(dx * p.dir, dz * p.dir) };
}
function updatePeds(dt, fx, fz) {
  const I = TRAFFIC.pedInst; if (!I) return;
  const nightCut = R.night > 0.6 ? 0.45 : 1; // fewer people out at night
  TRAFFIC.peds.forEach((p, i) => {
    const active = i < TRAFFIC.peds.length * nightCut;
    if (!p.b || dist2(p.x, p.z, fx, fz) > 260 * 260 || !active) {
      if (!active) { _m4.makeScale(0, 0, 0); I.body.setMatrixAt(i, _m4); I.head.setMatrixAt(i, _m4); I.legs.setMatrixAt(i, _m4); p.b = null; return; }
      // respawn on a block near the focus
      const bi = clamp(Math.floor(fx / CP) + rnd.int(-3, 3), 0, CN - 1), bj = clamp(Math.floor(fz / CP) + rnd.int(-3, 3), 0, CN - 1);
      p.b = CITY.blocks[bj * CN + bi]; p.p = rnd.range(0, 400);
    }
    p.p += p.v * p.dir * dt; p.ph += dt * p.v * 6;
    const q = pedPos(p);
    // step aside from the rig
    if (RIG && RIG.active && dist2(q.x, q.z, RIG.x, RIG.z) < 16 && Math.abs(RIG.v) > 2) p.dodge = Math.min(1, p.dodge + dt * 4); else p.dodge = Math.max(0, p.dodge - dt);
    p.x = q.x; p.z = q.z; p.yaw = q.yaw;
    const bob = Math.abs(Math.sin(p.ph)) * 0.04;
    _q.setFromAxisAngle(_up, p.yaw);
    _m4.compose(_v3.set(p.x, CURB + bob + p.dodge * 0.3, p.z), _q, _sc.set(p.h, p.h, p.h));
    I.body.setMatrixAt(i, _m4); I.head.setMatrixAt(i, _m4);
    _m4.compose(_v3.set(p.x, CURB + p.dodge * 0.3, p.z), _q, _sc.set(p.h, p.h * (0.96 + bob), p.h));
    I.legs.setMatrixAt(i, _m4);
  });
  for (const m of Object.values(I)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
}
