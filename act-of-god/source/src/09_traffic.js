// Act of God — life on the streets: cars and pedestrians in a pool that follows the camera, and the emergency services
// (fire engines, ambulances, police) that drive the road graph to wherever something has gone wrong.

const TR = { cars: [], peds: [], ems: [], ehash: null, ecell: 120, focus: { x: 0, z: 0, r: 500 }, body: null, cab: null, ped: null, light: null };
const CAR_COLS = [0xd8d8d8, 0x202020, 0x8a1a1a, 0x1a3a7a, 0x9a9a9a, 0xe8e8e0, 0x2a5a3a, 0xc8a020, 0x5a5a60, 0x4a2a1a, 0xb04020, 0x304a6a];
const PED_COLS = [0x3a4a6a, 0x8a3030, 0x2a2a2a, 0xd8d0c0, 0x5a7a4a, 0x7a5a3a, 0x4a6a8a, 0xb89060, 0x6a3a6a, 0xa0a0a0];

function buildTraffic() {
  for (const k of ['body', 'cab', 'ped']) if (TR[k]) { R.scene.remove(TR[k].mesh); TR[k].dispose(); }
  const nCars = { mega: 1100, metro: 950, city: 800, town: 450, small: 160 }[W.sizeKey];
  const nPeds = { mega: 1200, metro: 1100, city: 900, town: 600, small: 260 }[W.sizeKey];
  const nEms = W.fireSt.length * 2 + W.hospitals.length * 2 + W.police.length * 2;
  TR.body = new Batch(SHAPES.box, nCars + nEms + 10); TR.cab = new Batch(SHAPES.box, nCars + nEms + 10); TR.ped = new Batch(SHAPES.box, nPeds + 10);
  for (const k of ['body', 'cab', 'ped']) R.scene.add(TR[k].mesh);
  // edges by grid cell
  const n = Math.ceil(W.M / TR.ecell) + 1;
  TR.en = n; TR.ehash = Array.from({ length: n * n }, () => []);
  for (const e of W.edges) {
    const mx = (e.a.x + e.b.x) / 2, mz = (e.a.z + e.b.z) / 2;
    TR.ehash[clamp(Math.floor(mz / TR.ecell), 0, n - 1) * n + clamp(Math.floor(mx / TR.ecell), 0, n - 1)].push(e);
  }
  TR.cars = []; TR.peds = []; TR.ems = [];
  for (let i = 0; i < nCars; i++) { const c = { kind: 'car', bi: TR.body.alloc(), ci: TR.cab.alloc(), on: false, col: pick(CAR_COLS) }; TR.cars.push(c); }
  for (let i = 0; i < nPeds; i++) TR.peds.push({ pi: TR.ped.alloc(), on: false, col: pick(PED_COLS) });
  const mkEm = (kind, home) => {
    const nd = nearestNode(home.x, home.z);
    if (!nd) return;
    const v = { kind, home, homeNode: nd, bi: TR.body.alloc(), ci: TR.cab.alloc(), on: true, em: true, task: null, state: 'idle', path: null, col: kind === 'fire' ? 0xb81a10 : kind === 'amb' ? 0xf0f0ec : 0x1a1e2a, wait: 0, siren: 0 };
    placeAtNode(v, nd);
    TR.ems.push(v);
  };
  for (const s of W.fireSt) { mkEm('fire', s); mkEm('fire', s); }
  for (const h of W.hospitals) { mkEm('amb', h); mkEm('amb', h); }
  for (const p of W.police) { mkEm('police', p); mkEm('police', p); }
}
function nearestNode(x, z, openOnly = true) {
  let best = null, bd = 1e18;
  for (const n of W.nodes) { if (openOnly && !n.edges.some((e) => e.open)) continue; const d = dist2(n.x, n.z, x, z); if (d < bd) { bd = d; best = n; } }
  return best;
}
function edgesNear(x, z, r, fn) {
  const n = TR.en, c = TR.ecell;
  const i0 = clamp(Math.floor((x - r) / c), 0, n - 1), i1 = clamp(Math.floor((x + r) / c), 0, n - 1), j0 = clamp(Math.floor((z - r) / c), 0, n - 1), j1 = clamp(Math.floor((z + r) / c), 0, n - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const e of TR.ehash[j * n + i]) fn(e);
}
function placeAtNode(v, nd) {
  const e = nd.edges.find((q) => q.open) || nd.edges[0];
  v.e = e; v.dir = e.a === nd ? 1 : -1; v.s = 0; v.v = 0; v.lane = 0;
  carPos(v);
}
const laneOff = (e, lane) => (e.cls === 0 ? 2.6 : e.cls === 1 ? 2.8 + lane * 3.6 : 2.8 + lane * 3.8);
function carPos(c) {
  const e = c.e, t = c.dir > 0 ? c.s : e.len - c.s;
  const dx = e.dx * c.dir, dz = e.dz * c.dir;
  const off = c.ped ? (e.w / 2 + 1.6) * c.side : laneOff(e, c.lane);
  c.x = e.a.x + e.dx * t - dz * off; c.z = e.a.z + e.dz * t + dx * off;
  c.yaw = Math.atan2(dx, dz);
  c.y = e.bridge && e.bridgeB && e.bridgeB.state === 0 && t > 6 && t < e.len - 6 ? e.deckY : heightAt(c.x, c.z);
}
// the next edge at a node: follow the path if there is one, else a random open road (avoiding danger when panicked)
function nextEdge(c, nd) {
  if (c.path && c.path.length) { const e = c.path.shift(); if (e.open) return e; c.path = null; }
  const opts = nd.edges.filter((q) => q !== c.e && q.open);
  if (!opts.length) return c.e.open ? c.e : null;
  if (c.flee) {
    const th = nearestThreat(nd.x, nd.z);
    if (th) { let best = opts[0], bd = -1; for (const q of opts) { const o = q.a === nd ? q.b : q.a; const d = dist2(o.x, o.z, th.x, th.z); if (d > bd) { bd = d; best = q; } } return best; }
  }
  // keep going straight more often than turning
  const straight = opts.find((q) => q.axis === c.e.axis);
  if (straight && Math.random() < 0.55) return straight;
  return pick(opts);
}

// ---------- the pool around the camera ----------
function spawnCar(c) {
  const f = TR.focus;
  for (let tries = 0; tries < 12; tries++) {
    const a = rr(0, TAU), d = Math.sqrt(Math.random()) * f.r;
    const x = f.x + Math.cos(a) * d, z = f.z + Math.sin(a) * d;
    let cand = null;
    edgesNear(x, z, 60, (e) => { if (e.open && !cand) cand = e; });
    if (!cand) continue;
    const I = urbanI(x, z);
    if (Math.random() > 0.25 + I) continue;
    c.e = cand; c.dir = Math.random() < 0.5 ? 1 : -1; c.s = rr(0, cand.len); c.lane = cand.cls === 0 ? 0 : Math.floor(rr(0, cand.cls + 1)); c.v = rr(8, 15); c.vmax = (cand.cls === 2 ? 26 : cand.cls === 1 ? 16 : 12) * rr(0.8, 1.15);
    c.on = true; c.flee = false; c.stop = 0; c.col = pick(CAR_COLS); c.path = null;
    carPos(c);
    return true;
  }
  return false;
}
function spawnPed(p) {
  const f = TR.focus;
  for (let tries = 0; tries < 10; tries++) {
    const a = rr(0, TAU), d = Math.sqrt(Math.random()) * Math.min(f.r, 420);
    const x = f.x + Math.cos(a) * d, z = f.z + Math.sin(a) * d;
    let cand = null;
    edgesNear(x, z, 60, (e) => { if (!cand && !e.bridge) cand = e; });
    if (!cand) continue;
    if (Math.random() > 0.15 + urbanI(x, z) * 1.2) continue;
    Object.assign(p, { ped: true, e: cand, dir: Math.random() < 0.5 ? 1 : -1, s: rr(0, cand.len), side: Math.random() < 0.5 ? 1 : -1, v: rr(1.1, 1.7), on: true, mode: 'walk', col: pick(PED_COLS), fx: 0, fz: 0, lane: 0, dead: 0 });
    carPos(p);
    p.x += rr(-0.8, 0.8); p.z += rr(-0.8, 0.8);
    return true;
  }
  return false;
}

const _eul = new THREE.Euler();
function updateTraffic(dt) {
  const f = TR.focus;
  const cam = CAM;
  f.x = cam.tx; f.z = cam.tz; f.r = clamp(cam.dist * 1.1, 260, 1600);
  const showPeds = cam.dist < 900;
  const quake = G.quake || 0;
  // cars
  let k = 0;
  for (const c of TR.cars) {
    if (!c.on) { if (k++ < 6) spawnCar(c); writeCar(c); continue; }
    if (dist2(c.x, c.z, f.x, f.z) > f.r * f.r * 1.7) { c.on = false; writeCar(c); continue; }
    driveCar(c, dt, quake);
    writeCar(c);
  }
  for (const v of TR.ems) { emsUpdate(v, dt, quake); writeCar(v); }
  // pedestrians
  k = 0;
  for (const p of TR.peds) {
    if (!showPeds) { if (p.on) { p.on = false; writePed(p); } continue; }
    if (!p.on) { if (k++ < 8) spawnPed(p); writePed(p); continue; }
    if (dist2(p.x, p.z, f.x, f.z) > Math.min(f.r, 420) ** 2 * 1.8) { p.on = false; writePed(p); continue; }
    walkPed(p, dt);
    writePed(p);
  }
}
function driveCar(c, dt, quake) {
  const e = c.e;
  // hazards where the car is
  const wd = waterDepth(c.x, c.z);
  if ((wd > 0.9 && !(e.bridge && c.y > 3)) || lavaAt(c.x, c.z) > 0.2) { wreckCar(c, wd > 0.9 ? 'water' : 'lava'); return; }
  const th = nearestThreat(c.x, c.z);
  c.flee = !!(th && dist2(th.x, th.z, c.x, c.z) < (th.r * 2.5) ** 2);
  let target = c.flee ? c.vmax * 1.4 : c.vmax;
  if (G.snowAt && ovGet(c.x, c.z, 0) > 0.3) target *= 0.35;
  if (quake > 0.1 || c.stop > 0) target = 0;
  if (!e.open) target = Math.min(target, 3);
  c.stop = Math.max(0, (c.stop || 0) - dt);
  c.v = damp(c.v, target, 1.5, dt);
  c.s += c.v * dt;
  if (c.s >= e.len) {
    const nd = c.dir > 0 ? e.b : e.a;
    const ne = nextEdge(c, nd);
    if (!ne) { c.dir = -c.dir; c.s = 0; }
    else { c.e = ne; c.dir = ne.a === nd ? 1 : -1; c.s -= e.len; if (c.s > ne.len) c.s = 0; c.lane = Math.min(c.lane, ne.cls); }
  }
  carPos(c);
}
function wreckCar(c, why) {
  c.on = false;
  throwDebris(c.x, c.y + 1, c.z, 1, why === 'water' ? 2 : 6, c.col, 3);
  if (why === 'lava') { for (let i = 0; i < 4; i++) flame(c.x, c.y + 1, c.z, 4); }
}
function writeCar(c) {
  const B = TR.body, C = TR.cab;
  if (!c.on) { B.mesh.setMatrixAt(c.bi, ZERO_M); C.mesh.setMatrixAt(c.ci, ZERO_M); B.touch(c.bi); C.touch(c.ci); return; }
  const big = c.kind === 'fire', van = c.kind === 'amb';
  const L = big ? 8.5 : van ? 6 : 4.4, Wd = big ? 2.5 : van ? 2.2 : 1.85, Hh = big ? 2.2 : van ? 2.4 : 1.0;
  _q4.setFromAxisAngle(_ax.set(0, 1, 0), c.yaw);
  _m.compose(_p4.set(c.x, c.y + 0.35, c.z), _q4, _s4.set(Wd, Hh, L)); B.mesh.setMatrixAt(c.bi, _m);
  const cabL = big ? 2.4 : van ? 1.6 : 2.3;
  _v1.set(0, 0, big ? L * 0.32 : van ? L * 0.34 : -0.2).applyQuaternion(_q4);
  _m.compose(_p4.set(c.x + _v1.x, c.y + 0.35 + (big || van ? Hh * 0.45 : Hh), c.z + _v1.z), _q4, _s4.set(Wd * 0.94, big || van ? Hh * 0.6 : 0.75, cabL)); C.mesh.setMatrixAt(c.ci, _m);
  _col.setHex(c.col);
  B.aCol.setXYZ(c.bi, _col.r, _col.g, _col.b);
  B.aSt.setXYZW(c.bi, 0, 0, 0, 0); B.aSt2.setXYZW(c.bi, 6, 0, -100, 0);
  _col.setHex(c.kind === 'police' ? 0xf0f0f0 : c.kind === 'fire' ? 0xd02010 : 0x2a3440);
  C.aCol.setXYZ(c.ci, _col.r, _col.g, _col.b);
  C.aSt.setXYZW(c.ci, 0, 0, 0, 0); C.aSt2.setXYZW(c.ci, 6, 0, -100, 0);
  B.touch(c.bi); C.touch(c.ci);
}
function walkPed(p, dt) {
  const th = nearestThreat(p.x, p.z);
  const dang = th && dist2(th.x, th.z, p.x, p.z) < (th.r * 2.2) ** 2;
  if (p.mode === 'gather' && G.gather) {
    const gx = G.gather.x, gz = G.gather.z, d = dist(p.x, p.z, gx, gz);
    if (d > G.gather.r * 0.5) { p.x += (gx - p.x) / d * 1.6 * dt; p.z += (gz - p.z) / d * 1.6 * dt; }
    p.yaw = Math.atan2(gx - p.x, gz - p.z); p.y = heightAt(p.x, p.z);
    if (G.gather.t <= 0) p.mode = 'walk';
    return;
  }
  if (dang) {
    p.mode = 'flee';
    const dx = p.x - th.x, dz = p.z - th.z, d = Math.hypot(dx, dz) + 0.1;
    p.fx = damp(p.fx, dx / d * 4.5, 4, dt); p.fz = damp(p.fz, dz / d * 4.5, 4, dt);
  }
  if (p.mode === 'flee') {
    p.x += p.fx * dt; p.z += p.fz * dt; p.yaw = Math.atan2(p.fx, p.fz); p.y = heightAt(p.x, p.z);
    if (!dang && Math.random() < dt * 0.3) p.mode = 'walk', p.on = false;
    if (waterDepth(p.x, p.z) > 1.2 || lavaAt(p.x, p.z) > 0.1) p.on = false;
    return;
  }
  if (G.gather && dist2(p.x, p.z, G.gather.x, G.gather.z) < (G.gather.r * 3) ** 2) { p.mode = 'gather'; return; }
  p.s += p.v * dt;
  const e = p.e;
  if (p.s >= e.len) {
    const nd = p.dir > 0 ? e.b : e.a;
    const opts = nd.edges.filter((q) => q !== e && !q.bridge);
    if (opts.length && Math.random() < 0.8) { const ne = pick(opts); p.e = ne; p.dir = ne.a === nd ? 1 : -1; p.s = 0; } else { p.dir = -p.dir; p.s = 0; }
  }
  carPos(p);
  if (waterDepth(p.x, p.z) > 1.2 || lavaAt(p.x, p.z) > 0.1) p.on = false;
}
function writePed(p) {
  const B = TR.ped;
  if (!p.on) { B.mesh.setMatrixAt(p.pi, ZERO_M); B.touch(p.pi); return; }
  _q4.setFromAxisAngle(_ax.set(0, 1, 0), p.yaw || 0);
  const bob = p.mode === 'flee' ? Math.abs(Math.sin(G.t * 14 + p.pi)) * 0.15 : 0;
  _m.compose(_p4.set(p.x, p.y + 0.1 + bob, p.z), _q4, _s4.set(0.55, 1.75, 0.38)); B.mesh.setMatrixAt(p.pi, _m);
  _col.setHex(p.col);
  B.aCol.setXYZ(p.pi, _col.r, _col.g, _col.b); B.aSt.setXYZW(p.pi, 0, 0, 0, 0); B.aSt2.setXYZW(p.pi, 6, 0, -100, 0);
  B.touch(p.pi);
}
// people and cars in a disc are killed or flung (tornado cores, blasts)
function sweepStreets(x, z, r, mode = 'kill', orbit = null) {
  const r2 = r * r;
  for (const c of TR.cars) if (c.on && dist2(c.x, c.z, x, z) < r2) { c.on = false; throwDebris(c.x, c.y + 1, c.z, 1, mode === 'fling' ? 14 : 22, c.col, 3.2, orbit); }
  for (const p of TR.peds) if (p.on && dist2(p.x, p.z, x, z) < r2) { p.on = false; if (mode === 'fling') throwDebris(p.x, p.y + 1, p.z, 1, 10, p.col, 0.9, orbit); }
}

// ---------- emergency services ----------
function findPath(from, to) {
  if (!from || !to) return null;
  if (from === to) return [];
  const N = W.nodes.length, g = new Float32Array(N).fill(1e18), prev = new Array(N), seen = new Uint8Array(N);
  const heap = [[0, from.id]];
  g[from.id] = 0;
  const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [, id] = pop();
    if (seen[id]) continue; seen[id] = 1;
    if (id === to.id) break;
    const n = W.nodes[id];
    for (const e of n.edges) {
      if (!e.open) continue;
      const o = e.a === n ? e.b : e.a;
      const ng = g[id] + e.len * (e.cls === 2 ? 0.6 : e.cls === 1 ? 0.8 : 1);
      if (ng < g[o.id]) { g[o.id] = ng; prev[o.id] = e; push([ng + dist(o.x, o.z, to.x, to.z) * 0.6, o.id]); }
    }
  }
  if (!prev[to.id]) return null;
  const path = [];
  let cur = to;
  while (cur !== from) { const e = prev[cur.id]; path.unshift(e); cur = e.a === cur ? e.b : e.a; }
  return path;
}
function sendVehicle(v, x, z, task) {
  const cur = v.dir > 0 ? v.e.b : v.e.a;
  const to = nearestNode(x, z);
  const path = findPath(cur, to);
  if (!path) return false;
  v.path = path; v.task = task; v.state = 'go'; v.tx = x; v.tz = z; v.dest = to;
  // finish the current edge first
  return true;
}
function emsUpdate(v, dt, quake) {
  if (v.state === 'idle') {
    // parked by the station; tidy into the kerb
    v.v = 0;
    carPos(v);
    return;
  }
  const atDest = () => v.dest && (v.dir > 0 ? v.e.b : v.e.a) === v.dest && v.s >= v.e.len - 10;
  if (v.state === 'go' || v.state === 'home') {
    const target = quake > 0.3 ? 2 : v.e.open ? (v.e.cls === 2 ? 30 : 20) : 4;
    v.v = damp(v.v, target, 2, dt);
    if (!(atDest() && (!v.path || !v.path.length))) {
      v.s += v.v * dt;
      if (v.s >= v.e.len) {
        const nd = v.dir > 0 ? v.e.b : v.e.a;
        if (v.path && v.path.length) { const ne = v.path.shift(); if (ne.open) { v.e = ne; v.dir = ne.a === nd ? 1 : -1; v.s = 0; } else { v.path = null; v.s = v.e.len; if (!sendVehicle(v, v.tx, v.tz, v.task)) v.state = 'idle'; } }
        else v.s = v.e.len;
      }
    }
    carPos(v);
    if (atDest() && (!v.path || !v.path.length)) {
      if (v.state === 'home') { v.state = 'idle'; v.task = null; return; }
      v.state = 'work'; v.wait = 0;
    }
    v.siren = 1;
  } else if (v.state === 'work') {
    v.wait += dt;
    const t = v.task;
    if (v.kind === 'fire') {
      const b = t && t.b;
      if (!b || b.fire <= 0.01 || b.state >= 2) {
        // look for another fire nearby before going home
        const nb = findFireNear(v.x, v.z, 400, v);
        if (nb) { v.task = { b: nb }; nb.truck = v; if (!sendVehicle(v, nb.x, nb.z, v.task)) goHome(v); }
        else goHome(v);
      } else {
        b.fire = Math.max(0, b.fire - dt * 0.035 * (G.storm > 0.5 ? 2 : 1));
        if (b.fire <= 0.01) { b.fire = 0; bUpdate(b); G.stats.saved += b.pop * 0.2; }
        if (FX_NEAR(v.x, v.z)) for (let i = 0; i < 2; i++) FX.smoke.emit(v.x, v.y + 3.5, v.z, (b.x - v.x) * 0.5 + rr(-2, 2), 10 + rr(0, 4), (b.z - v.z) * 0.5 + rr(-2, 2), 2.2, 1.2, 6, 0.85, 0.9, 0.95, 0.5, 0.2, 7);
      }
    } else if (v.kind === 'amb') {
      if (v.wait > 6) {
        const site = t && t.site;
        if (site && !t.loaded) {
          const take = Math.min(site.injured, Math.max(1, Math.ceil(site.injured * 0.15)));
          site.injured -= take; t.loaded = take;
          const h = nearestHospital(v.x, v.z);
          if (!h || !sendVehicle(v, h.x, h.z, t)) { treatInjured(take); goHome(v); }
        } else { if (t && t.loaded) treatInjured(t.loaded); goHome(v); }
      }
    } else if (v.kind === 'police') {
      if (v.wait > 25 || !nearestThreat(v.x, v.z, 500)) goHome(v);
    }
  }
  // flashing lights near the camera
  if (v.siren && FX_NEAR(v.x, v.z) && v.state !== 'idle') {
    const ph = Math.sin(G.t * 18 + v.bi) > 0;
    const col = v.kind === 'fire' ? [1, 0.15, 0.1] : ph ? [1, 0.15, 0.1] : [0.2, 0.4, 1];
    glowAt(v.x, v.y + (v.kind === 'police' ? 1.9 : 3.0), v.z, 3.2, col, 0.06, ph ? 1 : 0.6);
  }
}
function goHome(v) {
  v.task = null;
  if (!sendVehicle(v, v.homeNode.x, v.homeNode.z, null)) { v.state = 'idle'; return; }
  v.state = 'home'; v.dest = v.homeNode;
}
const FX_NEAR = (x, z) => dist2(x, z, CAM.tx, CAM.tz) < Math.max(400, CAM.dist * 1.2) ** 2;
function nearestHospital(x, z) {
  let best = null, bd = 1e18;
  for (const h of W.hospitals) if (h.state === 0) { const d = dist2(h.x, h.z, x, z); if (d < bd) { bd = d; best = h; } }
  return best;
}
function findFireNear(x, z, r, v) {
  let best = null, bd = 1e18;
  forBuildings(x, z, r, (b) => { if (b.fire > 0.05 && b.state < 2 && (!b.truck || b.truck === v || b.truck.task?.b !== b)) { const d = dist2(b.x, b.z, x, z); if (d < bd) { bd = d; best = b; } } });
  return best;
}
// called a few times a second: free vehicles head for the worst fires, the injured and the panic
function dispatch() {
  const free = (kind) => TR.ems.filter((v) => v.kind === kind && (v.state === 'idle' || v.state === 'home'));
  const fires = SIM.burning.filter((b) => b.state < 2 && b.fire > 0.08 && !(b.truck && b.truck.task && b.truck.task.b === b));
  for (const v of free('fire')) {
    if (!fires.length) break;
    let best = null, bd = 1e18;
    for (const b of fires) { const d = dist2(b.x, b.z, v.x, v.z) / (0.3 + b.fire * b.h * 0.02); if (d < bd) { bd = d; best = b; } }
    if (!best) break;
    if (sendVehicle(v, best.x, best.z, { b: best })) { best.truck = v; fires.splice(fires.indexOf(best), 1); }
  }
  const sites = SIM.sites.filter((s) => s.injured > 0 && (s.amb || 0) < 3);
  for (const v of free('amb')) {
    if (!sites.length) break;
    const s = sites.sort((a, b) => dist2(a.x, a.z, v.x, v.z) - dist2(b.x, b.z, v.x, v.z))[0];
    if (sendVehicle(v, s.x + rr(-30, 30), s.z + rr(-30, 30), { site: s })) { s.amb = (s.amb || 0) + 1; if (s.amb >= 3) sites.splice(sites.indexOf(s), 1); }
  }
  const hot = G.threats.filter((t) => !t.calm);
  for (const v of free('police')) {
    if (!hot.length) break;
    const t = pick(hot);
    sendVehicle(v, t.x + rr(-t.r, t.r) * 1.5, t.z + rr(-t.r, t.r) * 1.5, { threat: t });
  }
}
