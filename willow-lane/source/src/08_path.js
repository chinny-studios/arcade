// Willow Lane — navigation grid and A* over tiles (8 directions, no corner cutting, walls and doors on edges).
// The grid covers the lot plus a margin of neighbouring lawn and the sidewalk in front (z = LOT_D .. LOT_D+1).

const NX0 = -9, NZ0 = -3, NW = LOT_W + 18, ND = LOT_D + 5;
const NAV = {
  dirty: true,
  inGrid: (x, z) => x >= NX0 && z >= NZ0 && x < NX0 + NW && z < NZ0 + ND,
  walk(x, z) { if (!NAV.inGrid(x, z)) return false; if (inLot(x, z)) return !OCC[tidx(x, z)]; return true; },
};
const SIDEWALK_Z = LOT_D + 0.9; // where sims walk along the street
const gi = (x, z) => (z - NZ0) * NW + (x - NX0);

// can a sim move from tile a to neighbour b (8-connected)?
function stepOK(ax, az, bx, bz) {
  if (!NAV.walk(bx, bz)) return false;
  const dx = bx - ax, dz = bz - az;
  if (dx && dz) {
    if (!NAV.walk(ax + dx, az) || !NAV.walk(ax, az + dz)) return false;
    return edgeOpen(ax, az, ax + dx, az) && edgeOpen(ax + dx, az, bx, bz) && edgeOpen(ax, az, ax, az + dz) && edgeOpen(ax, az + dz, bx, bz);
  }
  return edgeOpen(ax, az, bx, bz);
}

const _g = new Float32Array(NW * ND), _from = new Int32Array(NW * ND), _closed = new Uint8Array(NW * ND), _stamp = new Uint32Array(NW * ND);
let _gen = 1;
const N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
// A* to the nearest of several goal tiles. Returns { path: [[x,z]...tile coords], goal: index } or null.
function findPath(sx, sz, goals, allowStartBlocked = true) {
  if (!goals.length) return null;
  sx = Math.floor(sx); sz = Math.floor(sz);
  if (!NAV.inGrid(sx, sz)) return null;
  const gset = new Map();
  goals.forEach(([x, z], i) => { if (NAV.inGrid(x, z) && NAV.walk(x, z) && !gset.has(gi(x, z))) gset.set(gi(x, z), i); });
  if (!gset.size) return null;
  if (gset.has(gi(sx, sz))) return { path: [[sx, sz]], goal: gset.get(gi(sx, sz)) };
  const gen = ++_gen;
  const h = (x, z) => { let m = 1e9; for (const [gx, gz] of goals) { const dx = Math.abs(gx - x), dz = Math.abs(gz - z); const d = Math.max(dx, dz) + 0.414 * Math.min(dx, dz); if (d < m) m = d; } return m; };
  // binary heap of [f, idx]
  const heap = [];
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const s = gi(sx, sz);
  _stamp[s] = gen; _g[s] = 0; _from[s] = -1; _closed[s] = 0;
  push(h(sx, sz), s);
  let found = -1, iter = 0;
  while (heap.length && iter++ < 6000) {
    const [, cur] = pop();
    if (_closed[cur] && _stamp[cur] === gen) continue;
    _closed[cur] = 1;
    if (gset.has(cur)) { found = cur; break; }
    const cx = (cur % NW) + NX0, cz = Math.floor(cur / NW) + NZ0;
    for (const [dx, dz, cost] of N8) {
      const nx = cx + dx, nz = cz + dz;
      if (!NAV.inGrid(nx, nz)) continue;
      const ni = gi(nx, nz);
      if (_stamp[ni] === gen && _closed[ni]) continue;
      if (!stepOK(cx, cz, nx, nz)) continue;
      // prefer floors and paths a little (sims keep off the lawn when they can)
      const ng = _g[cur] + cost + (inLot(nx, nz) && !LOT.floor[tidx(nx, nz)] ? 0.15 : 0);
      if (_stamp[ni] !== gen || ng < _g[ni]) { _stamp[ni] = gen; _g[ni] = ng; _from[ni] = cur; _closed[ni] = 0; push(ng + h(nx, nz), ni); }
    }
  }
  if (found < 0) return null;
  const path = [];
  for (let c = found; c >= 0; c = _from[c]) path.push([(c % NW) + NX0, Math.floor(c / NW) + NZ0]);
  path.reverse();
  return { path, goal: gset.get(found) };
}
// straight-line test between two tile centres (no blocked tile, no closed edge) for path smoothing
function lineClear(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, n = Math.ceil(Math.hypot(dx, dz) * 4);
  let px = Math.floor(ax), pz = Math.floor(az);
  for (let i = 1; i <= n; i++) {
    const x = ax + dx * i / n, z = az + dz * i / n, tx = Math.floor(x), tz = Math.floor(z);
    if (tx !== px || tz !== pz) {
      if (!NAV.walk(tx, tz)) return false;
      if (tx !== px && tz !== pz) { if (!stepOK(px, pz, tx, tz)) return false; }
      else if (!edgeOpen(px, pz, tx, tz)) return false;
      // keep clear of blocked neighbours when cutting diagonally near them
      px = tx; pz = tz;
    }
  }
  return true;
}
// a sim is about half a metre wide: test the centre line and two lines either side of it
function wideClear(a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, px = -dz / L * 0.24, pz = dx / L * 0.24;
  return lineClear(a[0], a[1], b[0], b[1]) && lineClear(a[0] + px, a[1] + pz, b[0] + px, b[1] + pz) && lineClear(a[0] - px, a[1] - pz, b[0] - px, b[1] - pz);
}
// Turn a tile path into world waypoints, dropping corners where a straight walk is clear
function smoothPath(path) {
  const pts = path.map(([x, z]) => [x + 0.5, z + 0.5]);
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !wideClear(pts[i], pts[j])) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}
