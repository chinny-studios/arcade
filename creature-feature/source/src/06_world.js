// Creature Feature — the world's rules: terrain height, colliders and the queries on them (movement, standing on
// roofs, line of sight), the road graph people and cars follow, and how lit any spot is

const WORLD = {
  boxes: [], circles: [], grid: new Map(), cell: 16, stamp: 0,
  nodes: [], edges: [], next: null, exits: [], segs: [],
  lightGrid: new Map(),
};
// the town rectangle (flat), the north road, the drive-in lot and the hill at lovers' lane
const TOWN_HX = 168, TOWN_HZ = 138;
const DRIVEIN = { x0: -18, x1: 78, z0: -246, z1: -158 };
const CORN = { x0: -292, x1: -198, z0: 34, z1: 142 };
const HILL = { x: 90, z: 238, h: 11, s: 46 };
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
  return dist(px, pz, ax + dx * t, az + dz * t);
}
function rectDist(px, pz, r) { const dx = Math.max(r.x0 - px, 0, px - r.x1), dz = Math.max(r.z0 - pz, 0, pz - r.z1); return Math.hypot(dx, dz); }
function terrainH(x, z) {
  const ox = Math.max(0, Math.abs(x) - TOWN_HX), oz = Math.max(0, Math.abs(z) - TOWN_HZ);
  const out = Math.hypot(ox, oz);
  if (out <= 0) return 0;
  const edge = smooth(0, 55, out);
  let n = vnoise(x / 70, z / 70, 3) * 16 + vnoise(x / 23, z / 23, 5) * 3;
  // flat along the roads out of town, the drive-in and the cornfield; smooth (just the hill) along lovers' lane
  let d = Math.min(segDist(x, z, -420, 0, -TOWN_HX, 0), segDist(x, z, TOWN_HX, 0, 420, 0), segDist(x, z, -30, -TOWN_HZ, -30, -420), rectDist(x, z, DRIVEIN), rectDist(x, z, CORN));
  n *= smooth(5, 30, d);
  n *= smooth(8, 40, segDist(x, z, 90, TOWN_HZ, 90, 240));
  const hd2 = dist2(x, z, HILL.x, HILL.z);
  const hill = HILL.h * Math.exp(-hd2 / (2 * HILL.s * HILL.s));
  return (n + hill) * edge;
}

// ---------- colliders ----------
// box: { x0, x1, z0, z1, y1 (wall top), ridge (extra height to a gable ridge), rx (ridge runs along x), kind, ref }
// circle: { x, z, r, h, kind }
function cellKey(i, j) { return i * 4096 + j; }
function gridAdd(o, x0, z0, x1, z1) {
  const c = WORLD.cell;
  for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
    const k = cellKey(i, j); let a = WORLD.grid.get(k);
    if (!a) WORLD.grid.set(k, (a = []));
    a.push(o);
  }
}
function addBox(x0, z0, x1, z1, y1, o = {}) {
  const b = Object.assign({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0: o.y0 || 0, y1, ridge: 0, rx: true, kind: 'wall', box: true, _q: 0 }, o);
  WORLD.boxes.push(b);
  gridAdd(b, b.x0, b.z0, b.x1, b.z1);
  return b;
}
function addCircle(x, z, r, h, kind = 'tree') {
  const c = { x, z, r, h, kind, box: false, _q: 0, y0: terrainH(x, z) };
  WORLD.circles.push(c);
  gridAdd(c, x - r, z - r, x + r, z + r);
  return c;
}
function removeCollider(o) {
  const c = WORLD.cell;
  const x0 = o.box ? o.x0 : o.x - o.r, x1 = o.box ? o.x1 : o.x + o.r, z0 = o.box ? o.z0 : o.z - o.r, z1 = o.box ? o.z1 : o.z + o.r;
  for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
    const a = WORLD.grid.get(cellKey(i, j)); if (!a) continue;
    const k = a.indexOf(o); if (k >= 0) a.splice(k, 1);
  }
  o.dead = true;
}
// call f(o) for every collider whose cell is within r of (x, z), once each
function nearColliders(x, z, r, f) {
  const c = WORLD.cell, s = ++WORLD.stamp;
  for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) {
    const a = WORLD.grid.get(cellKey(i, j)); if (!a) continue;
    for (const o of a) { if (o._q === s) continue; o._q = s; if (f(o) === true) return true; }
  }
  return false;
}
// the top of a box at (x, z), following a gable roof
function boxTop(b, x, z) {
  if (!b.ridge) return b.y1;
  const t = b.rx ? 1 - Math.abs(z - (b.z0 + b.z1) / 2) / ((b.z1 - b.z0) / 2) : 1 - Math.abs(x - (b.x0 + b.x1) / 2) / ((b.x1 - b.x0) / 2);
  return b.y1 + b.ridge * clamp(t, 0, 1);
}
// where something at height y standing at (x, z) rests: the terrain or a roof it is above
function supportY(x, z, y, r = 0.3) {
  let g = terrainH(x, z);
  nearColliders(x, z, r + 1, (o) => {
    if (o.box) {
      if (x < o.x0 - r * 0.5 || x > o.x1 + r * 0.5 || z < o.z0 - r * 0.5 || z > o.z1 + r * 0.5) return;
      const t = boxTop(o, clamp(x, o.x0, o.x1), clamp(z, o.z0, o.z1));
      if (t <= y + 0.6 && t > g) g = t;
    } else if (o.kind === 'car' && dist2(x, z, o.x, o.z) < o.r * o.r) {
      const t = o.y0 + o.h; if (t <= y + 0.6 && t > g) g = t;
    }
  });
  for (const c of CARS.list) {
    if (c.dead || !c.mesh.visible) continue;
    if (Math.abs(x - c.x) > 3 || Math.abs(z - c.z) > 3) continue;
    const lx = (x - c.x) * Math.cos(c.yaw) - (z - c.z) * Math.sin(c.yaw), lz = (x - c.x) * Math.sin(c.yaw) + (z - c.z) * Math.cos(c.yaw);
    if (Math.abs(lx) < 1.0 && Math.abs(lz) < 2.6) { const t = c.y + c.top; if (t <= y + 0.7 && t > g) g = t; }
  }
  return g;
}
// push a circle (x, z, radius r) at height y out of walls, trees and cars; returns the corrected position in out
const _mv = { x: 0, z: 0, hit: false };
function collide(x, z, r, y, ignoreCars = false) {
  let hit = false;
  for (let pass = 0; pass < 2; pass++) {
    nearColliders(x, z, r + 1, (o) => {
      if (o.box) {
        if (y >= boxTop(o, clamp(x, o.x0, o.x1), clamp(z, o.z0, o.z1)) - 0.45 || y + 1.6 < o.y0) return;
        const cx = clamp(x, o.x0, o.x1), cz = clamp(z, o.z0, o.z1);
        const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) return;
        hit = true;
        if (d2 > 1e-8) { const d = Math.sqrt(d2), p = r - d; x += dx / d * p; z += dz / d * p; }
        else {
          // inside: out along the shallowest side
          const l = x - o.x0, rr_ = o.x1 - x, t = z - o.z0, b = o.z1 - z, m = Math.min(l, rr_, t, b);
          if (m === l) x = o.x0 - r; else if (m === rr_) x = o.x1 + r; else if (m === t) z = o.z0 - r; else z = o.z1 + r;
        }
      } else {
        if (y >= o.y0 + o.h - 0.3) return;
        const dx = x - o.x, dz = z - o.z, d2 = dx * dx + dz * dz, rr2 = r + o.r;
        if (d2 >= rr2 * rr2 || d2 < 1e-8) return;
        const d = Math.sqrt(d2); x += dx / d * (rr2 - d); z += dz / d * (rr2 - d); hit = true;
      }
    });
    if (!ignoreCars) for (const c of CARS.list) {
      if (c.dead || !c.mesh.visible || y >= c.y + c.top - 0.3) continue;
      if (Math.abs(x - c.x) > 4 || Math.abs(z - c.z) > 4) continue;
      // the car as an oriented box
      const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
      let lx = (x - c.x) * cs - (z - c.z) * sn, lz = (x - c.x) * sn + (z - c.z) * cs;
      const hx = 1.0, hz = 2.6, qx = clamp(lx, -hx, hx), qz = clamp(lz, -hz, hz), dx = lx - qx, dz = lz - qz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); lx = qx + dx / d * r; lz = qz + dz / d * r; }
      else if (hx - Math.abs(lx) < hz - Math.abs(lz)) lx = Math.sign(lx || 1) * (hx + r); else lz = Math.sign(lz || 1) * (hz + r);
      x = c.x + lx * cs + lz * sn; z = c.z - lx * sn + lz * cs; hit = true;
    }
  }
  _mv.x = x; _mv.z = z; _mv.hit = hit;
  return _mv;
}
// is the straight line between two points free of buildings? (trees and cars don't block sight)
function losClear(ax, ay, az, bx, by, bz) {
  const minx = Math.min(ax, bx), maxx = Math.max(ax, bx), minz = Math.min(az, bz), maxz = Math.max(az, bz);
  const c = WORLD.cell, s = ++WORLD.stamp;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  for (let i = Math.floor(minx / c); i <= Math.floor(maxx / c); i++) for (let j = Math.floor(minz / c); j <= Math.floor(maxz / c); j++) {
    const a = WORLD.grid.get(cellKey(i, j)); if (!a) continue;
    for (const o of a) {
      if (o._q === s || !o.box || o.noSight) continue; o._q = s;
      // slab test against the box up to its eaves plus half the roof
      let t0 = 0, t1 = 1;
      const top = o.y1 + o.ridge * 0.5;
      const sl = (p, d, lo, hi) => {
        if (Math.abs(d) < 1e-9) return p >= lo && p <= hi;
        let u = (lo - p) / d, v = (hi - p) / d; if (u > v) { const w = u; u = v; v = w; }
        if (u > t0) t0 = u; if (v < t1) t1 = v; return t0 <= t1;
      };
      if (sl(ax, dx, o.x0, o.x1) && sl(az, dz, o.z0, o.z1) && sl(ay, dy, o.y0, top)) return false;
    }
  }
  return true;
}
// how far along a ray from (ax, ay, az) a building is hit, as a fraction 0..1 (1 = clear); for the camera
function rayHit(ax, ay, az, bx, by, bz, pad = 0.25) {
  const minx = Math.min(ax, bx) - pad, maxx = Math.max(ax, bx) + pad, minz = Math.min(az, bz) - pad, maxz = Math.max(az, bz) + pad;
  const c = WORLD.cell, s = ++WORLD.stamp;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  let best = 1;
  for (let i = Math.floor(minx / c); i <= Math.floor(maxx / c); i++) for (let j = Math.floor(minz / c); j <= Math.floor(maxz / c); j++) {
    const a = WORLD.grid.get(cellKey(i, j)); if (!a) continue;
    for (const o of a) {
      if (o._q === s || !o.box || o.noCam) continue; o._q = s;
      let t0 = 0, t1 = 1;
      const top = o.y1 + o.ridge * 0.6 + pad;
      const sl = (p, d, lo, hi) => {
        if (Math.abs(d) < 1e-9) return p >= lo && p <= hi;
        let u = (lo - p) / d, v = (hi - p) / d; if (u > v) { const w = u; u = v; v = w; }
        if (u > t0) t0 = u; if (v < t1) t1 = v; return t0 <= t1;
      };
      if (sl(ax, dx, o.x0 - pad, o.x1 + pad) && sl(az, dz, o.z0 - pad, o.z1 + pad) && sl(ay, dy, -5, top) && t0 < best) best = t0;
    }
  }
  return best;
}

// ---------- road graph ----------
function addNode(x, z, o = {}) { const n = Object.assign({ x, z, i: WORLD.nodes.length, nb: [] }, o); WORLD.nodes.push(n); return n; }
function linkNodes(a, b) { a.nb.push(b.i); b.nb.push(a.i); WORLD.edges.push([a.i, b.i]); WORLD.segs.push({ a, b }); }
// all-pairs next hop (Floyd-Warshall over a few dozen nodes)
function buildPaths() {
  const N = WORLD.nodes.length, D = [], NX = [];
  for (let i = 0; i < N; i++) { D.push(new Float32Array(N).fill(1e9)); NX.push(new Int16Array(N).fill(-1)); D[i][i] = 0; NX[i][i] = i; }
  for (const [a, b] of WORLD.edges) { const d = dist(WORLD.nodes[a].x, WORLD.nodes[a].z, WORLD.nodes[b].x, WORLD.nodes[b].z); D[a][b] = D[b][a] = d; NX[a][b] = b; NX[b][a] = a; }
  for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (D[i][k] + D[k][j] < D[i][j]) { D[i][j] = D[i][k] + D[k][j]; NX[i][j] = NX[i][k]; }
  WORLD.next = NX; WORLD.ndist = D;
}
// the nearest point on any road to (x, z): { x, z, seg, d }
function nearestRoad(x, z) {
  let best = null, bd = 1e9;
  for (const s of WORLD.segs) {
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, l2 = dx * dx + dz * dz;
    const t = clamp(((x - s.a.x) * dx + (z - s.a.z) * dz) / l2, 0, 1);
    const px = s.a.x + dx * t, pz = s.a.z + dz * t, d = dist2(x, z, px, pz);
    if (d < bd) { bd = d; best = { x: px, z: pz, seg: s, t, d: Math.sqrt(d) }; }
  }
  return best;
}
// a walking route from (x, z) to (tx, tz), both off-road spots with a road nearby: a list of [x, z] points.
// side: the pavement offset so people walk along the side of the road rather than down the middle.
function route(x, z, tx, tz, side = 4.5) {
  const A = nearestRoad(x, z), B = nearestRoad(tx, tz);
  const pts = [];
  const off = (px, pz, nx, nz) => [px + nx * side, pz + nz * side];
  // pavement offset: the side of the road the walker is already on
  const sideOf = (r, px, pz) => {
    const s = r.seg, dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
    const sd = (px - r.x) * nx + (pz - r.z) * nz >= 0 ? 1 : -1;
    return [nx * sd, nz * sd];
  };
  const [ax, az] = sideOf(A, x, z);
  pts.push(off(A.x, A.z, ax, az));
  if (A.seg === B.seg) {
    const [bx, bz] = sideOf(B, tx, tz);
    pts.push(off(B.x, B.z, bx, bz));
  } else {
    // choose the end of each segment that makes the shortest trip
    let best = null, bd = 1e9;
    for (const na of [A.seg.a, A.seg.b]) for (const nb of [B.seg.a, B.seg.b]) {
      const d = dist(A.x, A.z, na.x, na.z) + WORLD.ndist[na.i][nb.i] + dist(nb.x, nb.z, B.x, B.z);
      if (d < bd) { bd = d; best = [na, nb]; }
    }
    let n = best[0].i;
    const cornerOff = (nd) => [nd.x + Math.sign(x - nd.x || 1) * side * 0.9, nd.z + Math.sign(z - nd.z || 1) * side * 0.9];
    let guard = 0;
    while (guard++ < 60) {
      const nd = WORLD.nodes[n];
      pts.push(cornerOff(nd));
      if (n === best[1].i) break;
      n = WORLD.next[n][best[1].i];
      if (n < 0) break;
    }
    const [bx, bz] = sideOf(B, tx, tz);
    pts.push(off(B.x, B.z, bx, bz));
  }
  pts.push([tx, tz]);
  return pts;
}
// a driving route from (x, z) to node index ni, down the right-hand lane
function driveRoute(x, z, ni) {
  const A = nearestRoad(x, z), pts = [];
  pts.push([A.x, A.z]);
  const a = dist(A.x, A.z, A.seg.a.x, A.seg.a.z) + WORLD.ndist[A.seg.a.i][ni], b = dist(A.x, A.z, A.seg.b.x, A.seg.b.z) + WORLD.ndist[A.seg.b.i][ni];
  let n = a < b ? A.seg.a.i : A.seg.b.i, guard = 0;
  while (guard++ < 60) { const nd = WORLD.nodes[n]; pts.push([nd.x, nd.z]); if (n === ni) break; n = WORLD.next[n][ni]; if (n < 0) break; }
  // keep right: shift each leg 2.4 m to its right
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    let dx = q[0] - o[0], dz = q[1] - o[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    out.push([p[0] - dz * 2.4, p[1] + dx * 2.4]);
  }
  return out;
}

// ---------- light ----------
function indexLights() {
  WORLD.lightGrid.clear();
  for (const s of LIGHTS.src) {
    const r = s.r;
    for (let i = Math.floor((s.x - r) / 20); i <= Math.floor((s.x + r) / 20); i++) for (let j = Math.floor((s.z - r) / 20); j <= Math.floor((s.z + r) / 20); j++) {
      const k = cellKey(i, j); let a = WORLD.lightGrid.get(k); if (!a) WORLD.lightGrid.set(k, (a = [])); a.push(s);
    }
  }
}
// 0 (pitch dark) .. 1 (right under a lamp); the moon gives a little everywhere
function lightAt(x, z) {
  let l = 0.18;
  const a = WORLD.lightGrid.get(cellKey(Math.floor(x / 20), Math.floor(z / 20)));
  if (a) for (const s of a) {
    if (!s.on) continue;
    const d = dist(x, z, s.x, s.z);
    if (d < s.r) l = Math.max(l, s.i * 0.7 * (1 - d / s.r));
  }
  return clamp(l, 0, 1);
}
const inCorn = (x, z) => x > CORN.x0 && x < CORN.x1 && z > CORN.z0 && z < CORN.z1;
