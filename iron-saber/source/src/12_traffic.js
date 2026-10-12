// Iron Saber — city traffic (parked and moving cars) and street lamps: real-world scale references
// that crumple underfoot.

const CARS = [];
const LAMPS = [];
let carMesh = null, lampMesh = null;
const CAR_COLS = [[0.85, 0.85, 0.86], [0.12, 0.12, 0.14], [0.7, 0.12, 0.1], [0.15, 0.28, 0.6], [0.55, 0.57, 0.6], [0.9, 0.75, 0.2], [0.2, 0.45, 0.3], [0.95, 0.95, 0.95], [0.4, 0.22, 0.15]];
const roadLine = (k) => -CITY_HALF + k * BLOCK;

function buildTraffic() {
  const body = [0.9, 0.9, 0.9], glass = [0.16, 0.19, 0.24], tire = [0.08, 0.08, 0.08];
  const g = mergeParts([
    { geo: chamferBox(4.4, 0.75, 1.82, 0.15), p: [0, 0.62, 0], c: body },
    { geo: taperBox(2.5, 1.66, 1.9, 1.5, 0.62), p: [-0.15, 1.3, 0], c: glass },
    { geo: new THREE.CylinderGeometry(0.34, 0.34, 0.24, 6, 1, true), p: [1.4, 0.34, 0.86], r: [Math.PI / 2, 0, 0], c: tire },
    { geo: new THREE.CylinderGeometry(0.34, 0.34, 0.24, 6, 1, true), p: [-1.4, 0.34, 0.86], r: [Math.PI / 2, 0, 0], c: tire },
    { geo: new THREE.CylinderGeometry(0.34, 0.34, 0.24, 6, 1, true), p: [1.4, 0.34, -0.86], r: [Math.PI / 2, 0, 0], c: tire },
    { geo: new THREE.CylinderGeometry(0.34, 0.34, 0.24, 6, 1, true), p: [-1.4, 0.34, -0.86], r: [Math.PI / 2, 0, 0], c: tire },
  ]);
  // parked cars along the kerbs
  for (let k = 0; k <= 10; k++) for (let seg = 0; seg < 10; seg++) for (const side of [-1, 1]) for (const axis of ['x', 'z']) {
    const a0 = roadLine(seg) + ROAD_HW + 6, a1 = roadLine(seg + 1) - ROAD_HW - 6;
    for (let a = a0; a < a1; a += 6.5) {
      if (rand() < 0.7) continue;
      const line = roadLine(k) + side * 11.3;
      if (Math.abs(line) > CITY_HALF) continue;
      addCar(axis === 'z' ? line : a, axis === 'z' ? a : line, axis === 'z' ? Math.PI / 2 : 0, null);
    }
  }
  // moving traffic
  for (let i = 0; i < 90; i++) {
    const axis = rand() < 0.5 ? 'x' : 'z', k = ri(1, 9), dir = rand() < 0.5 ? 1 : -1;
    const along = rr(-CITY_HALF + 20, CITY_HALF - 20);
    const c = addCar(0, 0, 0, { axis, line: roadLine(k), dir, along, speed: rr(9, 14), stop: 0 });
    placeMover(c);
  }
  carMesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }), CARS.length);
  carMesh.receiveShadow = true; carMesh.frustumCulled = false;
  const col = new THREE.Color();
  CARS.forEach((c, i) => { carMesh.setColorAt(i, col.setRGB(...c.col)); writeCar(c); });
  scene.add(carMesh);
  // street lamps on every corner and along the blocks
  for (let k = 0; k <= 10; k++) for (let seg = 0; seg < 10; seg++) for (const side of [-1, 1]) for (const axis of ['x', 'z']) {
    for (let a = roadLine(seg) + 26; a < roadLine(seg + 1) - 20; a += 38) {
      const line = roadLine(k) + side * (ROAD_HW + 1.2);
      if (Math.abs(line) > CITY_HALF) continue;
      const x = axis === 'z' ? line : a, z = axis === 'z' ? a : line;
      LAMPS.push({ x, z, yaw: axis === 'z' ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : (side > 0 ? Math.PI : 0), alive: true, tilt: 0, tx: 0, tz: 0 });
    }
  }
  const lg = mergeParts([
    { geo: new THREE.CylinderGeometry(0.12, 0.18, 9, 6), p: [0, 4.5, 0], c: [0.32, 0.34, 0.36] },
    { geo: new THREE.BoxGeometry(0.16, 0.16, 2.4), p: [0, 8.9, 1.1], c: [0.32, 0.34, 0.36] },
    { geo: new THREE.BoxGeometry(0.4, 0.18, 0.8), p: [0, 8.8, 2.2], c: [0.95, 0.92, 0.8] },
  ]);
  lampMesh = new THREE.InstancedMesh(lg, new THREE.MeshLambertMaterial({ vertexColors: true }), LAMPS.length);
  lampMesh.frustumCulled = false;
  LAMPS.forEach((l, i) => { l.slot = i; writeLamp(l); });
  scene.add(lampMesh);
  for (const l of LAMPS) gridAdd(LAMP_GRID, l);
}
function addCar(x, z, yaw, mover) {
  const c = { x, z, y: 0, yaw, alive: true, crushed: false, burnt: false, col: pick(CAR_COLS), slot: CARS.length, mover, flip: 0 };
  CARS.push(c);
  return c;
}
function placeMover(c) {
  const m = c.mover;
  const lane = 4 * m.dir;
  if (m.axis === 'z') { c.x = m.line - lane; c.z = m.along; c.yaw = m.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
  else { c.x = m.along; c.z = m.line + lane; c.yaw = m.dir > 0 ? 0 : Math.PI; }
}
function writeCar(c) {
  _q1.setFromAxisAngle(UP, c.yaw);
  if (c.flip) _q1.multiply(_q2.setFromAxisAngle(_v3.set(1, 0, 0), c.flip));
  _m4.compose(_v1.set(c.x, c.y, c.z), _q1, _v2.set(1, c.crushed ? 0.32 : 1, c.crushed ? 1.15 : 1));
  carMesh.setMatrixAt(c.slot, _m4);
  carMesh.instanceMatrix.needsUpdate = true;
}
function writeLamp(l) {
  _q1.setFromAxisAngle(UP, l.yaw);
  if (l.tilt) { _q2.setFromAxisAngle(_v3.set(l.tz, 0, -l.tx), l.tilt); _q1.premultiply(_q2); }
  _m4.compose(_v1.set(l.x, 0, l.z), _q1, _v2.set(1, 1, 1));
  lampMesh.setMatrixAt(l.slot, _m4);
  lampMesh.instanceMatrix.needsUpdate = true;
}
const CAR_GRID = new Map(), LAMP_GRID = new Map();
const gKey = (x, z) => ((Math.floor(x / 16) + 300) << 10) | (Math.floor(z / 16) + 300);
function gridAdd(G, o) { const k = gKey(o.x, o.z); let l = G.get(k); if (!l) G.set(k, l = []); l.push(o); }
function gridNear(G, x, z, r, fn) {
  const x0 = Math.floor((x - r) / 16), x1 = Math.floor((x + r) / 16), z0 = Math.floor((z - r) / 16), z1 = Math.floor((z + r) / 16);
  for (let a = x0; a <= x1; a++) for (let c = z0; c <= z1; c++) {
    const l = G.get(((a + 300) << 10) | (c + 300));
    if (l) for (const o of l) if (Math.hypot(o.x - x, o.z - z) < r) fn(o);
  }
}

function updateTraffic(dt) {
  CAR_GRID.clear();
  for (const c of CARS) {
    if (c.alive && c.mover) {
      const m = c.mover;
      // drivers stop when a giant is close by
      let near = false;
      for (const s of SUITS) if (!s.dead && !s.gone && s.mode !== 'parked' && Math.abs(s.pos.x - c.x) < 45 && Math.abs(s.pos.z - c.z) < 45) { near = true; break; }
      if (near) m.stop = 3;
      m.stop -= dt;
      if (m.stop <= 0) {
        const prev = m.along;
        m.along += m.dir * m.speed * dt;
        // intersection: carry on, turn, or turn back at the edge
        const k0 = Math.floor((prev + CITY_HALF) / BLOCK), k1 = Math.floor((m.along + CITY_HALF) / BLOCK);
        if (k0 !== k1) {
          const kk = m.dir > 0 ? k1 : k0;
          const at = roadLine(kk);
          const edge = kk <= 0 || kk >= 10;
          const r = Math.random();
          if (edge || r < 0.35) {
            const newLine = at, oldLine = m.line;
            m.axis = m.axis === 'x' ? 'z' : 'x';
            m.line = newLine;
            const ok = Math.round((oldLine + CITY_HALF) / BLOCK);
            m.dir = ok <= 0 ? 1 : ok >= 10 ? -1 : Math.random() < 0.5 ? 1 : -1;
            m.along = oldLine;
          }
        }
        placeMover(c);
        writeCar(c);
      }
    }
    if (c.alive) gridAdd(CAR_GRID, c);
  }
  for (const l of LAMPS) {
    if (l.alive || l.tilt >= 1.5) continue;
    l.tilt = Math.min(1.5, l.tilt + dt * 2.5 * (0.3 + l.tilt));
    writeLamp(l);
  }
}
// Something big came down (or blew up) at (x,z): crush cars and knock over lamps.
function crushAt(x, z, r, fling) {
  let n = 0;
  gridNear(CAR_GRID, x, z, r, (c) => {
    if (!c.alive) return;
    c.alive = false; n++; STATS.cars++;
    if (c.mover) c.mover.stop = 1e9;
    if (fling) {
      c.flip = frand(-1, 1) < 0 ? Math.PI : 0.4; c.burnt = true;
      carMesh.setColorAt(c.slot, _fc.setRGB(0.1, 0.09, 0.08)); carMesh.instanceColor.needsUpdate = true;
      explosionFx(c.x, 1, c.z, 0.7);
      addEmitter({ kind: 'wreck', x: c.x, y: 1, z: c.z, life: rr(8, 16) });
    } else {
      c.crushed = true;
      carMesh.setColorAt(c.slot, _fc.setRGB(c.col[0] * 0.6, c.col[1] * 0.6, c.col[2] * 0.6)); carMesh.instanceColor.needsUpdate = true;
      sparkBurst(c.x, 0.5, c.z, 3);
    }
    writeCar(c);
  });
  gridNear(LAMP_GRID, x, z, r + 1.5, (l) => {
    if (!l.alive) return;
    l.alive = false;
    const dx = l.x - x, dz = l.z - z, d = Math.hypot(dx, dz) || 1;
    l.tx = dx / d; l.tz = dz / d; l.tilt = 0.05;
  });
  return n;
}
