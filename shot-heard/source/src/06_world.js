// Shot Heard — colliders and ray casts, breakable structures (houses of panels, stone walls, fences, gabions), trees,
// camps and props, debris and destruction.

// ---------- colliders ----------
// k 0 = box turned by yaw (c, s), half sizes hx/hz; k 1 = vertical cylinder r. y0..y1 vertical extent.
// f flags: 1 blocks movement, 2 stops shot, 4 blocks sight. deck: walkable top (bridges).
const CF_MOVE = 1, CF_SHOT = 2, CF_SIGHT = 4, CF_ALL = 7;
const COL = [];
const CG = new Map();
const CG_CELL = 8;
let colStamp = 1;
const cgKey = (i, j) => (i + 4096) * 8192 + (j + 4096);
function addCol(C) {
  C.alive = true; C.id = COL.length; C.stamp = 0;
  COL.push(C);
  const r = C.k === 1 ? C.r : Math.hypot(C.hx, C.hz);
  const i0 = Math.floor((C.x - r) / CG_CELL), i1 = Math.floor((C.x + r) / CG_CELL), j0 = Math.floor((C.z - r) / CG_CELL), j1 = Math.floor((C.z + r) / CG_CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = cgKey(i, j); let a = CG.get(k); if (!a) CG.set(k, (a = [])); a.push(C);
  }
  return C;
}
function addBoxCol(x, z, yaw, hx, hz, y0, y1, f, mat, piece) {
  return addCol({ k: 0, x, z, c: Math.cos(yaw), s: Math.sin(yaw), hx, hz, y0, y1, f, mat, piece: piece || null });
}
function addCylCol(x, z, r, y0, y1, f, mat, piece) { return addCol({ k: 1, x, z, r, y0, y1, f, mat, piece: piece || null }); }
function queryCols(x, z, r, out) {
  out.length = 0; colStamp++;
  const i0 = Math.floor((x - r) / CG_CELL), i1 = Math.floor((x + r) / CG_CELL), j0 = Math.floor((z - r) / CG_CELL), j1 = Math.floor((z + r) / CG_CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const a = CG.get(cgKey(i, j)); if (!a) continue;
    for (const C of a) if (C.alive && C.stamp !== colStamp) { C.stamp = colStamp; out.push(C); }
  }
  return out;
}
// Ray against colliders: nearest hit within maxT whose flags match mask. Writes RAYHIT.
const RAYHIT = { t: 0, col: null, nx: 0, ny: 0, nz: 0 };
function rayBox(C, ox, oy, oz, dx, dy, dz, maxT) {
  const px = ox - C.x, pz = oz - C.z;
  const lox = px * C.c - pz * C.s, loz = px * C.s + pz * C.c, ldx = dx * C.c - dz * C.s, ldz = dx * C.s + dz * C.c;
  let t0 = 0, t1 = maxT, ax = 0;
  const slab = (o, d, mn, mx, axis) => {
    if (Math.abs(d) < 1e-9) return o >= mn && o <= mx;
    let a = (mn - o) / d, b = (mx - o) / d, s = -1;
    if (a > b) { const t = a; a = b; b = t; s = 1; }
    if (a > t0) { t0 = a; ax = axis * s; }
    if (b < t1) t1 = b;
    return t0 <= t1;
  };
  if (!slab(lox, ldx, -C.hx, C.hx, 1)) return -1;
  if (!slab(oy, dy, C.y0, C.y1, 2)) return -1;
  if (!slab(loz, ldz, -C.hz, C.hz, 3)) return -1;
  if (t0 <= 0) return -1;
  const a = Math.abs(ax), sg = Math.sign(ax);
  let nx = 0, ny = 0, nz = 0;
  if (a === 1) nx = sg; else if (a === 2) ny = sg; else nz = sg;
  RAYHIT.nx = nx * C.c + nz * C.s; RAYHIT.ny = ny; RAYHIT.nz = -nx * C.s + nz * C.c;
  return t0;
}
function rayCyl(C, ox, oy, oz, dx, dy, dz, maxT) {
  const px = ox - C.x, pz = oz - C.z;
  const a = dx * dx + dz * dz; if (a < 1e-9) return -1;
  const b = 2 * (px * dx + pz * dz), c = px * px + pz * pz - C.r * C.r;
  const disc = b * b - 4 * a * c; if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t <= 0 || t > maxT) return -1;
  const y = oy + dy * t; if (y < C.y0 || y > C.y1) return -1;
  const hx = px + dx * t, hz = pz + dz * t, l = Math.hypot(hx, hz) || 1;
  RAYHIT.nx = hx / l; RAYHIT.ny = 0; RAYHIT.nz = hz / l;
  return t;
}
function rayCols(ox, oy, oz, dx, dy, dz, maxT, mask) {
  let best = maxT, bc = null, bnx = 0, bny = 0, bnz = 0;
  colStamp++;
  // walk the 8 m cells along the ray (2D DDA)
  let i = Math.floor(ox / CG_CELL), j = Math.floor(oz / CG_CELL);
  const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1;
  const tdx = Math.abs(dx) > 1e-9 ? CG_CELL / Math.abs(dx) : 1e9, tdz = Math.abs(dz) > 1e-9 ? CG_CELL / Math.abs(dz) : 1e9;
  let tmx = Math.abs(dx) > 1e-9 ? ((dx > 0 ? (i + 1) * CG_CELL - ox : ox - i * CG_CELL) / Math.abs(dx)) : 1e9;
  let tmz = Math.abs(dz) > 1e-9 ? ((dz > 0 ? (j + 1) * CG_CELL - oz : oz - j * CG_CELL) / Math.abs(dz)) : 1e9;
  let tc = 0;
  for (let n = 0; n < 400; n++) {
    const a = CG.get(cgKey(i, j));
    if (a) for (const C of a) {
      if (!C.alive || C.stamp === colStamp || !(C.f & mask)) continue;
      C.stamp = colStamp;
      const t = C.k === 1 ? rayCyl(C, ox, oy, oz, dx, dy, dz, best) : rayBox(C, ox, oy, oz, dx, dy, dz, best);
      if (t > 0 && t < best) { best = t; bc = C; bnx = RAYHIT.nx; bny = RAYHIT.ny; bnz = RAYHIT.nz; }
    }
    // a hit closer than the next cell boundary cannot be beaten (colliders span cells, so allow one extra cell)
    if (bc && best < tc) break;
    if (tmx < tmz) { tc = tmx; tmx += tdx; i += si; } else { tc = tmz; tmz += tdz; j += sj; }
    if (tc > maxT + CG_CELL) break;
  }
  if (!bc) return null;
  RAYHIT.t = best; RAYHIT.col = bc; RAYHIT.nx = bnx; RAYHIT.ny = bny; RAYHIT.nz = bnz;
  return RAYHIT;
}
// March a ray over the heightfield; returns t of the first point below ground or -1.
function rayTerrain(ox, oy, oz, dx, dy, dz, maxT, step = 1) {
  let tPrev = 0, prevAbove = oy - heightAt(ox, oz);
  if (prevAbove < 0) return 0;
  for (let t = step; t <= maxT + step; t += step) {
    const tt = Math.min(t, maxT);
    const x = ox + dx * tt, y = oy + dy * tt, z = oz + dz * tt;
    const above = y - heightAt(x, z);
    if (above < 0) {
      let a = tPrev, b = tt;
      for (let k = 0; k < 6; k++) { const m = (a + b) / 2; if (oy + dy * m - heightAt(ox + dx * m, oz + dz * m) < 0) b = m; else a = m; }
      return b;
    }
    tPrev = tt; prevAbove = above;
    if (tt >= maxT) break;
  }
  return -1;
}
// Clear line of sight between two points (terrain and sight-blocking colliders).
function losClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
  if (L < 0.01) return true;
  const ux = dx / L, uy = dy / L, uz = dz / L;
  if (rayTerrain(ax, ay, az, ux, uy, uz, L - 0.3, L > 60 ? 2 : 1) >= 0) return false;
  return !rayCols(ax, ay, az, ux, uy, uz, L - 0.3, CF_SIGHT);
}
// Push a standing body (circle r, feet y, height h) out of colliders; returns the highest walkable top under it.
const _cq = [];
function collideBody(p, r, h, stepUp) {
  let floor = -1e9;
  queryCols(p.x, p.z, r + 2, _cq);
  for (const C of _cq) {
    if (!(C.f & CF_MOVE)) continue;
    if (p.y + h < C.y0 || p.y > C.y1) continue;
    const walkable = C.y1 <= p.y + stepUp;
    if (C.k === 1) {
      const dx = p.x - C.x, dz = p.z - C.z, d = Math.hypot(dx, dz), m = C.r + r;
      if (d >= m) continue;
      if (walkable && C.deck) { floor = Math.max(floor, C.y1); continue; }
      if (walkable && d < C.r) { floor = Math.max(floor, C.y1); continue; }
      const k = (m - d) / (d || 1);
      p.x += dx * k; p.z += dz * k;
    } else {
      const dx = p.x - C.x, dz = p.z - C.z;
      let lx = dx * C.c - dz * C.s, lz = dx * C.s + dz * C.c;
      const ox = Math.abs(lx) - C.hx, oz = Math.abs(lz) - C.hz;
      if (ox >= r || oz >= r) continue;
      if (walkable && (C.deck || (ox < 0 && oz < 0))) { if (ox < r * 0.3 && oz < r * 0.3) floor = Math.max(floor, C.y1); continue; }
      if (ox > 0 && oz > 0) {
        const d = Math.hypot(ox, oz); if (d >= r) continue;
        const k = (r - d) / d; lx += Math.sign(lx) * ox * k; lz += Math.sign(lz) * oz * k;
      } else if (ox > oz) lx = Math.sign(lx) * (C.hx + r);
      else lz = Math.sign(lz) * (C.hz + r);
      p.x = C.x + lx * C.c + lz * C.s; p.z = C.z - lx * C.s + lz * C.c;
    }
  }
  return floor;
}
// Highest collider top (deck or roof of a wall) at a point between y-lo and y+up; for mantling and placement.
function topAt(x, z, ylo, yhi, r = 0.3) {
  let best = -1e9;
  queryCols(x, z, r + 1, _cq);
  for (const C of _cq) {
    if (!(C.f & CF_MOVE) || C.y1 < ylo || C.y1 > yhi) continue;
    if (colContains(C, x, z, r)) best = Math.max(best, C.y1);
  }
  return best;
}

// ---------- instanced structure meshes ----------
const SI = {};
// Structures and greenery are split into 160 m chunks, each its own InstancedMesh with a bounding sphere, so the
// camera and the sun's shadow camera both skip what they cannot see. Instances are collected first and the meshes
// built by finalizeSI(); anything added later goes into small overflow meshes.
const SI_CHUNK = 160;
let SI_FINAL = false;
function makeSI(name, geo, cap, shadow = true, chunked = true) {
  SI[name] = { name, geo, shadow, chunked, cap, mat: new THREE.MeshLambertMaterial({ vertexColors: !!geo.attributes.color }), chunks: new Map(), count: 0, meshes: [] };
  return SI[name];
}
const _ic = new THREE.Color();
function siChunk(S, x, z) {
  const key = S.chunked ? cgKey(Math.floor(x / SI_CHUNK), Math.floor(z / SI_CHUNK)) : 0;
  let ch = S.chunks.get(key);
  if (!ch) { ch = { S, key, m: null, n: 0, cap: 0, mats: [], cols: [], over: null }; S.chunks.set(key, ch); }
  // after the build, a full chunk spills into an overflow chunk of its own
  while (ch.m && ch.n >= ch.cap) { if (!ch.over) { ch.over = { S, key, m: null, n: 0, cap: 0, mats: [], cols: [], over: null }; buildChunkMesh(ch.over, 64); } ch = ch.over; }
  if (SI_FINAL && !ch.m) buildChunkMesh(ch, S.chunked ? 64 : S.cap);
  return ch;
}
function addInst(name, x, y, z, yaw, sx, sy, sz, c, pitch = 0, roll = 0) {
  const S = SI[name];
  if (S.count >= S.cap) return null;
  S.count++;
  const ch = siChunk(S, x, z);
  _e1.set(pitch, yaw, roll, 'YXZ');
  _m1.compose(_v1.set(x, y, z), _q1.setFromEuler(_e1), _v2.set(sx, sy, sz));
  const i = ch.n++;
  if (ch.m && i === 0) { ch.m.geometry.boundingSphere.center.set(x, y, z); ch.m.geometry.boundingSphere.radius = 0; }
  if (ch.m) { ch.m.setMatrixAt(i, _m1); ch.m.setColorAt(i, _ic.setRGB(c[0], c[1], c[2])); ch.m.count = ch.n; ch.m.instanceMatrix.needsUpdate = true; ch.m.instanceColor.needsUpdate = true; growSphere(ch, x, y, z, Math.max(sx, sy, sz)); }
  else { ch.mats.push(_m1.clone()); ch.cols.push(c[0], c[1], c[2]); }
  return { ch, i };
}
function growSphere(ch, x, y, z, s) {
  const bs = ch.m.geometry.boundingSphere, r = (ch.S.geo.boundingSphere ? ch.S.geo.boundingSphere.radius : 1) * s;
  const d = bs.center.distanceTo(_v3.set(x, y, z)) + r;
  if (d > bs.radius) bs.radius = d;
}
function buildChunkMesh(ch, spare) {
  const S = ch.S;
  if (!S.geo.boundingSphere) S.geo.computeBoundingSphere();
  // a geometry that shares the attributes but has the chunk's own bounding sphere
  const g = new THREE.BufferGeometry();
  for (const k in S.geo.attributes) g.setAttribute(k, S.geo.attributes[k]);
  if (S.geo.index) g.setIndex(S.geo.index);
  const cap = ch.n + spare;
  const m = new THREE.InstancedMesh(g, S.mat, cap);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.setColorAt(0, _ic.setRGB(1, 1, 1));
  let cx = 0, cy = 0, cz = 0;
  for (const M of ch.mats) { cx += M.elements[12]; cy += M.elements[13]; cz += M.elements[14]; }
  const n = Math.max(1, ch.mats.length);
  g.boundingSphere = new THREE.Sphere(new V3(cx / n, cy / n, cz / n), 0);
  if (!ch.mats.length) { g.boundingSphere.center.set(0, 0, 0); g.boundingSphere.radius = 0.01; }
  ch.m = m; ch.cap = cap;
  ch.mats.forEach((M, i) => {
    m.setMatrixAt(i, M);
    m.setColorAt(i, _ic.setRGB(ch.cols[i * 3], ch.cols[i * 3 + 1], ch.cols[i * 3 + 2]));
    const sx = Math.hypot(M.elements[0], M.elements[1], M.elements[2]), sy = Math.hypot(M.elements[4], M.elements[5], M.elements[6]), sz = Math.hypot(M.elements[8], M.elements[9], M.elements[10]);
    growSphere(ch, M.elements[12], M.elements[13], M.elements[14], Math.max(sx, sy, sz, 0.01));
  });
  ch.mats = []; ch.cols = [];
  m.count = ch.n;
  m.castShadow = S.shadow; m.receiveShadow = true;
  m.frustumCulled = true;
  WORLD.add(m); S.meshes.push(m);
}
function finalizeSI() {
  for (const k in SI) for (const ch of SI[k].chunks.values()) if (!ch.m) buildChunkMesh(ch, SI[k].chunked ? 16 : Math.max(16, SI[k].cap - SI[k].count));
  SI_FINAL = true;
}
function hideInst(h) {
  if (!h) return;
  if (h.ch.m) { h.ch.m.setMatrixAt(h.i, ZERO_M); h.ch.m.instanceMatrix.needsUpdate = true; }
  else h.ch.mats[h.i].copy(ZERO_M);
}
function instPos(h, out) {
  if (h.ch.m) { h.ch.m.getMatrixAt(h.i, _m1); return out.setFromMatrixPosition(_m1); }
  return out.setFromMatrixPosition(h.ch.mats[h.i]);
}
function setSIShadow(name, on) { if (SI[name]) { SI[name].shadow = on; for (const m of SI[name].meshes) m.castShadow = on; } }

// ---------- pieces (breakable parts) ----------
const PIECES = [];
const MAT_HP = { wood: 140, plank: 110, brick: 300, stone: 340, earth: 260, rail: 50, hay: 70, log: 220 };
function newPiece(mat, bld) {
  const P = { id: PIECES.length, inst: [], cols: [], hp: MAT_HP[mat] || 150, max: MAT_HP[mat] || 150, mat, bld: bld || null, alive: true, x: 0, y: 0, z: 0, c: [0.6, 0.5, 0.4], vol: 1 };
  PIECES.push(P);
  return P;
}
function pieceInst(P, name, x, y, z, yaw, sx, sy, sz, c, pitch = 0, roll = 0) {
  const h = addInst(name, x, y, z, yaw, sx, sy, sz, c, pitch, roll);
  if (h) P.inst.push([h, sx, sy, sz, c]);
  return h;
}
function finishPiece(P, x, y, z, c) { P.x = x; P.y = y; P.z = z; P.c = c; let v = 0; for (const it of P.inst) v += it[1] * it[2] * it[3]; P.vol = v; }
let NAV_DIRTY = 0;
function damagePiece(P, dmg, dirx = 0, diry = 0, dirz = 0) {
  if (!P || !P.alive) return false;
  P.hp -= dmg;
  if (P.hp > 0) return false;
  destroyPiece(P, dirx, diry, dirz, Math.min(1, dmg / 300));
  return true;
}
function destroyPiece(P, dirx, diry, dirz, force = 0.5, quiet = false) {
  if (!P.alive) return;
  P.alive = false;
  for (const it of P.inst) {
    const [h, sx, sy, sz, c] = it;
    instPos(h, _v3);
    hideInst(h);
    const n = clamp(Math.round(sx * sy * sz * 3), 1, 5);
    for (let k = 0; k < n; k++) spawnDebris(_v3.x + frand(-sx, sx) * 0.4, _v3.y + frand(-sy, sy) * 0.4, _v3.z + frand(-sz, sz) * 0.4,
      Math.max(0.12, sx / (n + 0.5)) * frand(0.6, 1), Math.max(0.1, Math.min(sy, 0.5) * frand(0.5, 1)), Math.max(0.08, sz * frand(0.5, 1)), c,
      dirx * 6 * force + frand(-2, 2), diry * 4 * force + frand(1, 4), dirz * 6 * force + frand(-2, 2));
  }
  for (const C of P.cols) C.alive = false;
  if (!quiet) {
    fxDebrisDust(P.x, P.y, P.z, P.mat);
    sBreak(_v4.set(P.x, P.y, P.z), P.mat);
  }
  NAV_DIRTY++;
  if (P.bld) buildingDamaged(P.bld);
  if (P.onBreak) P.onBreak(P);
}
// Damage every piece with a collider near a point (explosions, round shot).
function blastPieces(x, y, z, radius, dmg) {
  const seen = new Set();
  queryCols(x, z, radius + 1, _cq);
  const list = _cq.slice();
  for (const C of list) {
    if (!C.alive || !C.piece || seen.has(C.piece)) continue;
    const P = C.piece; seen.add(P);
    const d = Math.hypot(P.x - x, P.y - y, P.z - z);
    if (d > radius + 1.2) continue;
    const k = 1 - clamp((d - 0.5) / (radius + 0.7), 0, 1);
    damagePiece(P, dmg * k, (P.x - x) / (d || 1), 0.5, (P.z - z) / (d || 1));
  }
}

// ---------- debris ----------
const DEB = { mesh: null, list: [], free: [] };
function initDebris() {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), 700);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.setColorAt(0, new THREE.Color(1, 1, 1));
  m.castShadow = true; m.frustumCulled = false;
  for (let i = 0; i < 700; i++) { m.setMatrixAt(i, ZERO_M); DEB.free.push(699 - i); }
  WORLD.add(m);
  DEB.mesh = m; DEB.list = [];
}
function spawnDebris(x, y, z, sx, sy, sz, c, vx, vy, vz) {
  if (!DEB.mesh) return;
  let i = DEB.free.pop();
  if (i === undefined) { const old = DEB.list.shift(); if (!old) return; i = old.i; }
  DEB.mesh.setColorAt(i, _ic.setRGB(c[0] * frand(0.75, 1), c[1] * frand(0.75, 1), c[2] * frand(0.75, 1)));
  DEB.mesh.instanceColor.needsUpdate = true;
  DEB.list.push({ i, x, y, z, vx, vy, vz, rx: frand(0, 6), ry: frand(0, 6), rz: frand(0, 6), wx: frand(-8, 8), wy: frand(-8, 8), wz: frand(-8, 8), sx, sy, sz, t: 0, rest: 0 });
}
function updateDebris(dt) {
  if (!DEB.mesh) return;
  const m = DEB.mesh;
  for (let n = DEB.list.length - 1; n >= 0; n--) {
    const d = DEB.list[n];
    d.t += dt;
    if (d.rest < 1) {
      d.vy -= 9.8 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      d.rx += d.wx * dt; d.ry += d.wy * dt; d.rz += d.wz * dt;
      const g = heightAt(d.x, d.z) + d.sy * 0.4;
      if (d.y < g) {
        d.y = g;
        if (d.vy < -2) { d.vy *= -0.3; d.vx *= 0.55; d.vz *= 0.55; d.wx *= 0.5; d.wy *= 0.5; d.wz *= 0.5; }
        else { d.vy = 0; d.vx *= 0.7; d.vz *= 0.7; d.wx *= 0.6; d.wy *= 0.6; d.wz *= 0.6; if (Math.hypot(d.vx, d.vz) < 0.3) d.rest = 1; }
      }
    }
    let sink = 0;
    if (d.t > 40) sink = (d.t - 40) * 0.25;
    if (d.t > 44) { m.setMatrixAt(d.i, ZERO_M); DEB.free.push(d.i); DEB.list.splice(n, 1); continue; }
    if (d.rest >= 1 && d.t > 2 && !sink && d.done) continue;
    _e1.set(d.rx, d.ry, d.rz);
    _m1.compose(_v1.set(d.x, d.y - sink, d.z), _q1.setFromEuler(_e1), _v2.set(d.sx, d.sy, d.sz));
    m.setMatrixAt(d.i, _m1);
    if (d.rest >= 1) d.done = true;
  }
  m.instanceMatrix.needsUpdate = true;
}

// ---------- buildings ----------
const BLD = [];
const STYLES = {
  clap: { wall: 0xe6dfcd, roof: 0x5c524a, trim: 0x2e3e30, mat: 'plank' },
  clapred: { wall: 0x8c3828, roof: 0x4e463e, trim: 0xe6dfcd, mat: 'plank' },
  clapgrey: { wall: 0x958e82, roof: 0x544e48, trim: 0x3e3a34, mat: 'plank' },
  brick: { wall: 0x93462f, roof: 0x45403c, trim: 0xe6dfcd, mat: 'brick' },
  stone: { wall: 0x9c968a, roof: 0x48484a, trim: 0x3e3a34, mat: 'stone' },
  log: { wall: 0x7a5a3a, roof: 0x5a4a38, trim: 0x4a3a28, mat: 'log' },
  barn: { wall: 0x7e3626, roof: 0x5a4c40, trim: 0xe6dfcd, mat: 'plank' },
};
function buildHouse(b) {
  const st = STYLES[b.style] || STYLES.clap;
  const church = b.kind === 'church', barn = b.kind === 'barn';
  const SH = church ? 6.2 : barn ? 4.2 : 2.9;
  const floors = church || barn ? 1 : b.floors;
  const H = SH * floors, T = 0.24;
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw), y0 = b.y;
  const B = { b, pieces: [], walls: 0, broken: 0, collapsed: false, roof: [], upper: [], x: b.x, z: b.z, y: y0, H };
  BLD.push(B);
  const W = (lx, lz) => [b.x + lx * c + lz * s, b.z - lx * s + lz * c];
  const burnt = b.burn ? 0.55 : 1;
  const wallC = shadeC(col(st.wall), burnt), roofC = shadeC(col(st.roof), burnt), trimC = col(st.trim), glass = [0.16, 0.19, 0.22];
  const vary = (cc) => shadeC(cc, 0.92 + rand() * 0.14);
  // floor
  const fl = newPiece('plank', null); fl.alive = true;
  pieceInst(fl, 'box', b.x, y0 + 0.04, b.z, b.yaw, b.w - 0.2, 0.12, b.d - 0.2, vary([0.45, 0.36, 0.26]));
  // walls: sides along x (front z<0 / back z>0) span full width; ends along z are inset
  const sides = [
    { len: b.w, ox: 0, oz: -b.d / 2 + T / 2, yaw: b.yaw, ax: 1, front: true },
    { len: b.w, ox: 0, oz: b.d / 2 - T / 2, yaw: b.yaw, ax: 1, back: true },
    { len: b.d - T * 2, ox: -b.w / 2 + T / 2, oz: 0, yaw: b.yaw + Math.PI / 2, ax: 0, end: true },
    { len: b.d - T * 2, ox: b.w / 2 - T / 2, oz: 0, yaw: b.yaw + Math.PI / 2, ax: 0, end: true },
  ];
  for (const sd of sides) {
    const n = Math.max(1, Math.round(sd.len / (barn ? 3 : 2.2))), pw = sd.len / n;
    for (let f = 0; f < floors; f++) {
      for (let j = 0; j < n; j++) {
        const off = -sd.len / 2 + pw * (j + 0.5);
        const lx = sd.ax ? off : sd.ox, lz = sd.ax ? sd.oz : off;
        const [wx, wz] = W(lx, lz);
        const yb = y0 + f * SH;
        let type = 'wall';
        const mid = Math.floor(n / 2);
        if (f === 0 && (sd.front || (sd.back && !church)) && j === mid && n >= 1) type = barn ? 'bigdoor' : 'door';
        else if (!barn && n > 1 && (j % 2 === (sd.end ? 0 : 1) || church)) type = 'window';
        else if (!barn && sd.end && n === 1 && f > 0) type = 'window';
        if (barn && sd.end && f === 0 && j === mid && n > 2) type = 'window';
        const P = newPiece(st.mat, B);
        const wc = vary(wallC);
        const add = (cy, h, w = pw, x2 = 0) => {
          const [px, pz] = W(sd.ax ? lx + x2 : lx, sd.ax ? lz : lz + x2);
          if (b.style === 'log' && h > 0.6) {
            const nl = Math.max(1, Math.round(h / 0.36)), lh = h / nl;
            for (let q = 0; q < nl; q++) pieceInst(P, 'log', px, cy - h / 2 + lh * (q + 0.5), pz, sd.yaw, lh * 0.55, w + 0.3, lh * 0.55, vary(wc), 0, Math.PI / 2);
          } else pieceInst(P, 'box', px, cy, pz, sd.yaw, w, h, T, wc);
          P.cols.push(addBoxCol(px, pz, sd.yaw, w / 2, T / 2 + 0.02, cy - h / 2, cy + h / 2, CF_ALL, st.mat, P));
        };
        if (type === 'wall') add(yb + SH / 2, SH);
        else if (type === 'window') {
          const sill = church ? 1.3 : 0.95, wh = church ? 3.3 : 1.15, ww = Math.min(pw * 0.55, church ? 1.3 : 0.95);
          add(yb + sill / 2, sill);
          const top = SH - sill - wh; add(yb + sill + wh + top / 2, top);
          const sw = (pw - ww) / 2;
          add(yb + sill + wh / 2, wh, sw, -(ww / 2 + sw / 2));
          add(yb + sill + wh / 2, wh, sw, ww / 2 + sw / 2);
          const [gx, gz] = W(lx, lz);
          pieceInst(P, 'box', gx, yb + sill + wh / 2, gz, sd.yaw, ww, wh, 0.05, glass);
          if (b.style === 'clap' || b.style === 'clapgrey') for (const sx of [-1, 1]) {
            const [hx, hz] = W(sd.ax ? lx + sx * (ww / 2 + 0.22) : lx + (sd.ox < 0 ? -0.16 : 0.16), sd.ax ? lz + (sd.oz < 0 ? -0.16 : 0.16) : lz + sx * (ww / 2 + 0.22));
            pieceInst(P, 'box', hx, yb + sill + wh / 2, hz, sd.yaw, 0.42, wh, 0.05, trimC);
          }
        } else {
          const dw = type === 'bigdoor' ? Math.min(pw * 0.8, 2.6) : 1.15, dh = type === 'bigdoor' ? 3.2 : 2.25, sw = (pw - dw) / 2;
          add(yb + dh + (SH - dh) / 2, SH - dh);
          if (sw > 0.05) { add(yb + dh / 2, dh, sw, -(dw / 2 + sw / 2)); add(yb + dh / 2, dh, sw, dw / 2 + sw / 2); }
        }
        finishPiece(P, wx, yb + SH / 2, wz, wallC);
        B.pieces.push(P); B.walls++;
        if (f > 0) B.upper.push(P);
      }
    }
  }
  // gables and roof (ridge along local x)
  const pitch = barn ? 0.62 : church ? 0.6 : 0.58, rise = (b.d / 2) * Math.tan(pitch), top = y0 + H;
  for (const sx of [-1, 1]) {
    const P = newPiece(st.mat, B);
    const [gx, gz] = W(sx * (b.w / 2 - T / 2), 0);
    pieceInst(P, 'prism', gx, top, gz, b.yaw + Math.PI / 2, b.d, rise, T, wallC);
    P.cols.push(addBoxCol(gx, gz, b.yaw + Math.PI / 2, b.d / 4, T / 2, top, top + rise * 0.6, CF_SHOT | CF_SIGHT, st.mat, P));
    finishPiece(P, gx, top + rise / 3, gz, wallC);
    B.roof.push(P);
  }
  const slabW = (b.d / 2) / Math.cos(pitch) + 0.45;
  for (const sz of [-1, 1]) {
    const P = newPiece('plank', B);
    const [rx, rz] = W(0, sz * (b.d / 4 + 0.06));
    pieceInst(P, 'box', rx, top + rise / 2 + 0.08, rz, b.yaw, b.w + 0.7, 0.16, slabW, vary(roofC), sz * pitch);
    P.cols.push(addBoxCol(rx, rz, b.yaw, b.w / 2, b.d / 4, top, top + rise, CF_SHOT | CF_SIGHT, 'plank', P));
    finishPiece(P, rx, top + rise / 2, rz, roofC);
    B.roof.push(P);
  }
  if (!barn) {
    const P = newPiece('brick', B);
    const [cx, cz] = W(church ? 0 : b.w / 2 - 0.9, church ? b.d / 2 - 1 : 0);
    const ch = church ? 0 : rise + 1.4;
    if (ch) { pieceInst(P, 'box', cx, top + ch / 2, cz, b.yaw, 0.9, ch, 0.9, vary(col(0x8a4a36))); finishPiece(P, cx, top + ch / 2, cz, col(0x8a4a36)); B.roof.push(P); }
  }
  if (church) {
    // tower at the front end with a belfry and spire
    const tw = 4.2, th = H + 5.5;
    const [tx, tz] = W(-b.w / 2 - tw / 2 + 0.3, 0);
    const P = newPiece(st.mat === 'plank' ? 'wood' : st.mat, B);
    pieceInst(P, 'box', tx, y0 + th / 2, tz, b.yaw, tw, th, tw, wallC);
    P.cols.push(addBoxCol(tx, tz, b.yaw, tw / 2, tw / 2, y0, y0 + th, CF_ALL, st.mat, P));
    pieceInst(P, 'box', tx, y0 + th + 1.6, tz, b.yaw, tw * 0.7, 3.2, tw * 0.7, wallC);
    pieceInst(P, 'box', tx, y0 + th + 1.6, tz, b.yaw, tw * 0.5, 2.0, tw * 0.75, [0.1, 0.1, 0.1]);
    pieceInst(P, 'cone4', tx, y0 + th + 3.2 + 3.5, tz, b.yaw + Math.PI / 4, tw * 0.55, 7, tw * 0.55, roofC);
    P.hp = P.max = 700;
    finishPiece(P, tx, y0 + th / 2, tz, wallC);
    B.pieces.push(P);
  }
  if (b.burn) {
    addFire(b.x + frand(-b.w / 4, b.w / 4), top + rise * 0.5, b.z + frand(-1, 1), 1.6 + b.w * 0.12, true);
    // the fire has already taken part of the roof
    destroyPiece(B.roof[B.roof.length > 3 ? 3 : 2], 0, 0, 0, 0.1, true);
  }
}
function buildingDamaged(B) {
  B.broken = B.pieces.filter((p) => !p.alive).length;
  if (B.collapsed || B.broken / B.walls < 0.38) return;
  B.collapsed = true;
  for (const P of B.roof.concat(B.upper)) if (P.alive) destroyPiece(P, frand(-0.3, 0.3), -1, frand(-0.3, 0.3), 0.3, true);
  fxCollapse(B.x, B.y + B.H * 0.5, B.z, Math.max(B.b.w, B.b.d));
  sCollapse(_v4.set(B.x, B.y, B.z));
}

// ---------- walls and fences ----------
function buildStoneWall(pts) {
  walkLine(pts, 1.8, (x, z, yaw) => {
    const g = heightAt(x, z);
    const P = newPiece('stone', null);
    const base = col(0x8e887c);
    for (let row = 0; row < 3; row++) {
      const n = row === 2 ? 2 : 3, h = row === 2 ? 0.26 : 0.36, y = g + 0.02 + (row === 0 ? 0.18 : row === 1 ? 0.54 : 0.86);
      for (let k = 0; k < n; k++) {
        const off = -0.9 + (1.8 / n) * (k + 0.5) + rr(-0.08, 0.08);
        const sc = shadeC(mixC(base, col(0x9a8a6a), rand() * 0.5), 0.78 + rand() * 0.3);
        pieceInst(P, 'box', x + Math.sin(yaw) * off + rr(-0.05, 0.05), y, z + Math.cos(yaw) * off + rr(-0.05, 0.05), yaw + rr(-0.12, 0.12), rr(0.5, 0.62) * (row === 2 ? 0.9 : 1), h, 1.8 / n * 1.05, sc, rr(-0.08, 0.08), rr(-0.06, 0.06));
      }
    }
    P.cols.push(addBoxCol(x, z, yaw + Math.PI / 2, 0.92, 0.34, g - 0.3, g + 1.0, CF_ALL, 'stone', P));
    finishPiece(P, x, g + 0.5, z, base);
  });
}
function buildRailFence(pts, hay) {
  walkLine(pts, 3, (x, z, yaw, dist) => {
    const g = heightAt(x, z), wood = col(0x7a6448);
    const P = newPiece('rail', null);
    const ax = Math.sin(yaw), az = Math.cos(yaw);
    for (const e of [-1.5, 1.5]) pieceInst(P, 'box', x + ax * e, g + 0.62, z + az * e, yaw, 0.13, 1.3, 0.13, shadeC(wood, 0.85 + rand() * 0.2));
    for (const hy of [0.38, 0.74, 1.08]) pieceInst(P, 'box', x, g + hy + rr(-0.03, 0.03), z, yaw, 0.07, 0.11, 3.05, shadeC(wood, 0.9 + rand() * 0.2), rr(-0.03, 0.03));
    P.cols.push(addBoxCol(x, z, yaw + Math.PI / 2, 1.5, 0.1, g - 0.2, g + 1.2, CF_MOVE, 'rail', P));
    finishPiece(P, x, g + 0.6, z, wood);
    if (hay) {
      const Hp = newPiece('hay', null), hc = col(0xc8b26a);
      pieceInst(Hp, 'box', x + Math.cos(yaw) * 0.32, g + 0.5, z - Math.sin(yaw) * 0.32, yaw, 0.6, 1.0, 2.9, shadeC(hc, 0.85 + rand() * 0.25), 0, rr(-0.06, 0.06));
      Hp.cols.push(addBoxCol(x + Math.cos(yaw) * 0.32, z - Math.sin(yaw) * 0.32, yaw + Math.PI / 2, 1.45, 0.3, g - 0.1, g + 1.0, CF_SHOT | CF_SIGHT | CF_MOVE, 'hay', Hp));
      finishPiece(Hp, x, g + 0.5, z, hc);
    }
  });
}
function buildWormFence(pts) {
  walkLine(pts, 3, (x, z, yaw, dist) => {
    const g = heightAt(x, z), wood = col(0x806a4c);
    const P = newPiece('rail', null);
    const zig = (Math.round(dist / 3) % 2 ? 1 : -1) * 0.34;
    for (let k = 0; k < 5; k++) pieceInst(P, 'box', x, g + 0.18 + k * 0.22, z, yaw + zig, 0.1, 0.1, 3.3, shadeC(wood, 0.85 + rand() * 0.25), rr(-0.04, 0.04));
    P.cols.push(addBoxCol(x, z, yaw + Math.PI / 2, 1.55, 0.35, g - 0.2, g + 1.15, CF_MOVE, 'rail', P));
    finishPiece(P, x, g + 0.6, z, wood);
  });
}
function addGabion(x, z, keepNav) {
  const g = heightAt(x, z);
  const P = newPiece('earth', null);
  pieceInst(P, 'gabion', x, g + 0.55, z, rand() * 6, 0.52, 1.1, 0.52, shadeC(col(0x8a6a42), 0.85 + rand() * 0.25));
  P.cols.push(addCylCol(x, z, 0.52, g - 0.2, g + 1.15, CF_ALL, 'earth', P));
  finishPiece(P, x, g + 0.55, z, col(0x8a6a42));
  if (!keepNav) NAV_DIRTY++;
  return P;
}
function buildBridge(br) {
  const c = Math.cos(br.yaw), s = Math.sin(br.yaw), L = br.len;
  const end = (k) => [br.x + Math.sin(br.yaw) * k * L / 2, br.z + Math.cos(br.yaw) * k * L / 2];
  const [ax, az] = end(-1), [bx, bz] = end(1);
  const ha = heightAt(ax, az), hb = heightAt(bx, bz), mid = Math.max(ha, hb, TER.water + 1) + 0.5;
  const n = Math.round(L / 1.6), wood = col(0x6a5238);
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, x = lerp(ax, bx, t), z = lerp(az, bz, t);
    const y = lerp(lerp(ha, hb, t), mid, Math.sin(t * Math.PI)) + 0.05;
    const P = newPiece('wood', null);
    pieceInst(P, 'box', x, y - 0.1, z, br.yaw, br.w, 0.2, L / n + 0.05, shadeC(wood, 0.85 + rand() * 0.2));
    for (const e of [-1, 1]) {
      pieceInst(P, 'box', x + c * e * br.w / 2, y + 0.5, z - s * e * br.w / 2, br.yaw, 0.1, 1.0, 0.1, wood);
      pieceInst(P, 'box', x + c * e * br.w / 2, y + 0.95, z - s * e * br.w / 2, br.yaw, 0.08, 0.1, L / n + 0.05, wood);
    }
    if (k % 3 === 1) for (const e of [-1, 1]) pieceInst(P, 'log', x + c * e * br.w * 0.4, (y + TER.water - 3) / 2, z - s * e * br.w * 0.4, 0, 0.18, y - TER.water + 3, 0.18, shadeC(wood, 0.7));
    const C = addBoxCol(x, z, br.yaw, br.w / 2, L / n / 2 + 0.05, y - 0.6, y, CF_MOVE | CF_SHOT, 'wood', P);
    C.deck = true; P.cols.push(C);
    for (const e of [-1, 1]) P.cols.push(addBoxCol(x + c * e * (br.w / 2 + 0.05), z - s * e * (br.w / 2 + 0.05), br.yaw, 0.06, L / n / 2, y, y + 1.0, CF_MOVE, 'wood', P));
    P.hp = P.max = 400;
    finishPiece(P, x, y, z, wood);
  }
}

// ---------- trees and greenery ----------
function treeGeos() {
  const trunk = mergeParts([part(GEO.cyl(0.6, 1, 1, 6), [0.42, 0.32, 0.22], [0, 0.5, 0])]);
  const crown = mergeParts([
    part(wobble(GEO.ico(1, 1), 0.25, 1), [1, 1, 1], [0, 0, 0], null, [1, 0.8, 1], { cv: (x, y, z) => 0.82 + y * 0.18 }),
    part(wobble(GEO.ico(0.7, 0), 0.2, 2), [1, 1, 1], [0.55, -0.15, 0.25], null, [1, 0.85, 1], { cv: (x, y, z) => 0.85 + y * 0.15 }),
    part(wobble(GEO.ico(0.65, 0), 0.2, 3), [1, 1, 1], [-0.5, -0.1, -0.3], null, [1, 0.85, 1], { cv: (x, y, z) => 0.85 + y * 0.15 }),
    part(wobble(GEO.ico(0.6, 0), 0.2, 4), [1, 1, 1], [-0.1, 0.45, 0.5], null, [1, 0.9, 1]),
  ]);
  const pine = mergeParts([
    part(GEO.cone(1, 1.1, 7), [1, 1, 1], [0, 0.0, 0], null, null, { cv: (x, y) => 0.85 + y * 0.2 }),
    part(GEO.cone(0.78, 0.95, 7), [1, 1, 1], [0, 0.55, 0], [0, 0.4, 0], null, { cv: (x, y) => 0.9 + (y - 0.5) * 0.2 }),
    part(GEO.cone(0.55, 0.85, 7), [1, 1, 1], [0, 1.05, 0], [0, 0.9, 0]),
  ]);
  const bush = mergeParts([part(wobble(GEO.ico(1, 0), 0.25, 5), [1, 1, 1], [0, 0, 0], null, [1, 0.7, 1]), part(wobble(GEO.ico(0.7, 0), 0.2, 6), [1, 1, 1], [0.6, -0.1, 0.2], null, [1, 0.7, 1])]);
  // a tuft is six single-triangle blades leaning out from the root
  const tp = [], tc = [];
  for (let k = 0; k < 6; k++) {
    const a = k * 2.4, r = 0.06 + (k % 3) * 0.05, h = 0.6 + (k % 3) * 0.2, lean = 0.25 + (k % 2) * 0.15;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a) * 0.05, pz = Math.cos(a) * 0.05;
    tp.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, cx + Math.cos(a) * lean, h, cz + Math.sin(a) * lean);
    tc.push(0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 1.1, 1.1, 1.1);
  }
  const tuft = new THREE.BufferGeometry();
  tuft.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); tuft.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
  tuft.computeVertexNormals(); tuft.computeBoundingSphere();
  return { trunk, crown, pine, bush, tuft };
}
function plantTrees(map) {
  const G = treeGeos();
  const n = FOREST.n, cell = FOREST.cell;
  let sum = 0;
  for (let k = 0; k < n * n; k++) sum += FOREST.d[k];
  const budget = QUAL.low ? 1600 : 3000;
  const kf = Math.min(0.55, budget / Math.max(1, sum));
  makeSI('trunk', G.trunk, budget + 1400);
  makeSI('crown', G.crown, budget + 1400);
  makeSI('pine', G.pine, budget + 400);
  makeSI('bush', G.bush, 2600, false, false);
  makeSI('tuft', G.tuft, QUAL.low ? 5000 : 11000, false, false);
  SI.tuft.mat.side = THREE.DoubleSide;
  const leaf = map.leaf.map(col);
  const plant = (x, z, scale, kind) => {
    const g = heightAt(x, z);
    if (waterDepth(x, z) > -0.4) return;
    const pine = kind === 'pine';
    const h = (pine ? rr(9, 15) : rr(7, 12)) * scale, tr = pine ? 0.24 : 0.3 * scale + 0.08;
    addInst('trunk', x, g - 0.2, z, rand() * 6, tr, pine ? h * 0.55 : h * 0.55, tr, shadeC([1, 1, 1], 0.8 + rand() * 0.3));
    if (pine) addInst('pine', x, g + h * 0.42, z, rand() * 6, h * 0.24, h * 0.55, h * 0.24, shadeC(mixC(col(0x2c4a2c), col(0x3e5a32), rand()), 0.85 + rand() * 0.25));
    else {
      const R = h * 0.36;
      let lc = pick(leaf);
      if (map.autumn && rand() < 0.3) lc = mixC(lc, pick(leaf), 0.5);
      addInst('crown', x + rr(-0.3, 0.3), g + h * 0.62, z + rr(-0.3, 0.3), rand() * 6, R * rr(0.9, 1.15), R * rr(0.85, 1.1), R * rr(0.9, 1.15), shadeC(lc, 0.85 + rand() * 0.25));
    }
    addCylCol(x, z, tr + 0.08, g - 0.5, g + h * 0.5, CF_ALL, 'tree', null);
  };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const d = FOREST.d[j * n + i];
    if (!d || rand() > d * kf) continue;
    const x = -TER.ext + (i + rand()) * cell, z = -TER.ext + (j + rand()) * cell;
    plant(x, z, rr(0.85, 1.25), rand() < map.pines ? 'pine' : 'broad');
  }
  // scattered field trees, hedgerow trees along walls, orchards
  for (let k = 0; k < map.trees * 0.25; k++) {
    const x = rr(-TER.ext, TER.ext), z = rr(-TER.ext, TER.ext);
    if (roadAt(x, z) > 0 || earthAt(x, z) > 0 || forestAt(x, z) > 0.1 || nearBuilding(x, z, 9) || nearFlag(map, x, z, 0.6)) continue;
    plant(x, z, rr(0.9, 1.3), rand() < map.pines * 0.6 ? 'pine' : 'broad');
  }
  for (const w of map.walls) {
    if (w.kind !== 'stone' || rand() < 0.3) continue;
    walkLine(w.pts, 22, (x, z, yaw) => { const ox = Math.cos(yaw) * rr(2, 3) * (rand() < 0.5 ? -1 : 1), oz = -Math.sin(yaw) * rr(2, 3); if (rand() < 0.55 && !nearBuilding(x + ox, z + oz, 6) && roadAt(x + ox, z + oz) <= 0) plant(x + ox, z + oz, rr(0.8, 1.2), 'broad'); });
  }
  for (const f of map.fields) if (f.kind === 'orchard') {
    const [x0, z0, x1, z1] = polyBounds(f.poly);
    for (let x = x0 + 3; x < x1; x += 6.5) for (let z = z0 + 3; z < z1; z += 6.5) if (pointInPoly(x, z, f.poly)) plant(x + rr(-0.6, 0.6), z + rr(-0.6, 0.6), 0.55, 'broad');
  }
  for (const st of map.stumps || []) {
    const [x0, z0, x1, z1, cnt] = st;
    for (let k = 0; k < cnt; k++) {
      const x = rr(x0, x1), z = rr(z0, z1);
      if (roadAt(x, z) > 0 || earthAt(x, z) > 0 || nearBuilding(x, z, 5)) continue;
      const g = heightAt(x, z);
      addInst('trunk', x, g - 0.1, z, rand() * 6, rr(0.22, 0.36), rr(0.4, 0.8), rr(0.22, 0.36), [0.75, 0.68, 0.6]);
    }
  }
  // undergrowth and tufts of grass
  const gr = map.grass.map(col);
  for (let k = 0; k < 2400; k++) {
    const x = rr(-TER.ext, TER.ext), z = rr(-TER.ext, TER.ext), fo = forestAt(x, z);
    if ((fo < 0.15 && rand() > 0.15) || roadAt(x, z) > 0 || earthAt(x, z) > 0.2 || waterDepth(x, z) > -0.3 || nearBuilding(x, z, 4)) continue;
    const s = rr(0.6, 1.4);
    addInst('bush', x, heightAt(x, z) + s * 0.3, z, rand() * 6, s, s, s, shadeC(map.autumn && rand() < 0.5 ? pick(leaf) : mixC(pick(leaf), gr[2], 0.5), 0.7 + rand() * 0.25));
  }
  const tufts = SI.tuft.cap;
  for (let k = 0, placed = 0; k < tufts * 3 && placed < tufts; k++) {
    const x = rr(-TER.half - 40, TER.half + 40), z = rr(-TER.half - 40, TER.half + 40);
    if (roadAt(x, z) > 0.1 || waterDepth(x, z) > -0.25 || nearBuilding(x, z, 2)) continue;
    const s = rr(0.4, 0.8);
    addInst('tuft', x, heightAt(x, z) - 0.06, z, rand() * 6, s, s * rr(0.5, 0.9), s, shadeC(mixC(pick(gr), col(map.autumn ? 0xc0b060 : 0xb4bc68), 0.25 + rand() * 0.4), 1.0 + rand() * 0.2));
    placed++;
  }
}
function nearBuilding(x, z, pad) {
  for (const b of LAYOUT.buildings) if (Math.abs(x - b.x) < b.w / 2 + b.d / 2 + pad && Math.abs(z - b.z) < b.w / 2 + b.d / 2 + pad) {
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw), dx = x - b.x, dz = z - b.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < b.w / 2 + pad && Math.abs(lz) < b.d / 2 + pad) return true;
  }
  return false;
}
function nearFlag(map, x, z, k) { for (const f of map.flags) if (Math.hypot(f.x - x, f.z - z) < f.r * k) return true; return false; }

// ---------- camps, props, works dressing ----------
const AMMO_POINTS = [];
function buildCamp(cp) {
  const g0 = heightAt(cp.x, cp.z), canvasC = col(0xe4ddca);
  const cols = Math.ceil(Math.sqrt(cp.n * 2));
  for (let k = 0; k < cp.n; k++) {
    const x = cp.x + (k % cols - cols / 2) * 4.2, z = cp.z + Math.floor(k / cols) * 5.5;
    if (roadAt(x, z) > 0.2) continue;
    const g = heightAt(x, z);
    addInst('prism', x, g, z, 0, 2.2, 1.9, 2.6, shadeC(canvasC, 0.9 + rand() * 0.12));
    addBoxCol(x, z, 0, 1.15, 1.3, g, g + 1.6, CF_MOVE | CF_SIGHT, 'cloth', null);
  }
  addFire(cp.x + 3, g0 + 0.2, cp.z - 4, 0.5, false);
  buildWagon(cp.x - 6, cp.z - 5, 0.6);
  for (let k = 0; k < 4; k++) addInst('box', cp.x - 9 + k * 0.9, heightAt(cp.x - 9, cp.z + 2) + 0.3, cp.z + 2, 0.1, 0.8, 0.6, 0.6, col(0x6a5034));
  AMMO_POINTS.push({ x: cp.x - 7.5, z: cp.z + 2, team: cp.team, flag: null });
}
function buildWagon(x, z, yaw) {
  const g = heightAt(x, z), wood = col(0x6e5638);
  const geo = mergeParts([
    part(GEO.box(1.6, 0.5, 3.2), wood, [0, 0.95, 0]),
    part(GEO.box(1.7, 0.08, 3.3), shadeC(wood, 0.8), [0, 0.7, 0]),
    part(GEO.cyl(0.55, 0.55, 0.1, 10), shadeC(wood, 0.7), [0.9, 0.55, -1.0], [0, 0, Math.PI / 2]),
    part(GEO.cyl(0.55, 0.55, 0.1, 10), shadeC(wood, 0.7), [-0.9, 0.55, -1.0], [0, 0, Math.PI / 2]),
    part(GEO.cyl(0.65, 0.65, 0.1, 10), shadeC(wood, 0.7), [0.9, 0.65, 1.0], [0, 0, Math.PI / 2]),
    part(GEO.cyl(0.65, 0.65, 0.1, 10), shadeC(wood, 0.7), [-0.9, 0.65, 1.0], [0, 0, Math.PI / 2]),
    part(GEO.box(0.08, 0.08, 2.4), wood, [0, 0.7, -2.6], [0.1, 0, 0]),
    part(GEO.box(1.5, 0.5, 2.2), col(0xddd6c2), [0, 1.45, 0.3]),
  ]);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.position.set(x, g, z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true;
  WORLD.add(m);
  addBoxCol(x, z, yaw, 0.85, 1.7, g, g + 1.8, CF_ALL, 'wood', null);
}
function buildBoat(x, z, yaw) {
  const g = Math.max(heightAt(x, z), TER.water - 0.2), wood = col(0x7a5e40);
  const geo = mergeParts([
    part(GEO.box(1.8, 0.6, 6), wood, [0, 0.3, 0]), part(GEO.cone(0.9, 1.6, 4), wood, [0, 0.3, 3.6], [Math.PI / 2, Math.PI / 4, 0], [1, 1, 0.6]),
    part(GEO.box(1.7, 0.08, 0.3), shadeC(wood, 0.8), [0, 0.55, -1]), part(GEO.box(1.7, 0.08, 0.3), shadeC(wood, 0.8), [0, 0.55, 1]),
    part(GEO.box(0.08, 0.08, 3.4), col(0xb8a888), [0.5, 0.65, 0], [0, 0.2, 0]),
  ]);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.position.set(x, g, z); m.rotation.set(0.05, yaw, 0.12); m.castShadow = true;
  WORLD.add(m);
}
function dressWorks(map) {
  for (const w of map.works || []) {
    if (w.logs) {
      walkLine(w.pts, 3.2, (x, z, yaw) => {
        if ((w.gaps || []).some((g) => Math.hypot(x - g[0], z - g[1]) < 6)) return;
        // push the logs to the outside face of the parapet
        const sx = Math.cos(yaw), sz = -Math.sin(yaw);
        const side = (w.inside[0] - x) * sx + (w.inside[1] - z) * sz > 0 ? -1 : 1;
        const lx = x + sx * side * 0.9, lz = z + sz * side * 0.9;
        const g = heightAt(lx, lz);
        addInst('log', lx, g + 0.15, lz, yaw, 0.2, 3.3, 0.2, shadeC(col(0x6a5034), 0.85 + rand() * 0.2), Math.PI / 2, 0);
      });
    }
    if (w.fraise) {
      walkLine(w.pts, 0.75, (x, z, yaw) => {
        if ((w.gaps || []).some((g) => Math.hypot(x - g[0], z - g[1]) < 6)) return;
        const sx = Math.cos(yaw), sz = -Math.sin(yaw);
        const side = (w.inside[0] - x) * sx + (w.inside[1] - z) * sz > 0 ? -1 : 1;
        const lx = x + sx * side * 1.6, lz = z + sz * side * 1.6;
        const g = heightAt(lx, lz);
        const out = Math.atan2(sx * side, sz * side);
        addInst('box', lx + sx * side * 0.5, g + 0.35, lz + sz * side * 0.5, out, 0.09, 0.09, 2.0, col(0x7a6448), -0.45);
      });
      // a belt of abatis beyond the ditch
      walkLine(w.pts, 4.5, (x, z, yaw) => {
        if (rand() < 0.35 || (w.gaps || []).some((g) => Math.hypot(x - g[0], z - g[1]) < 7)) return;
        const sx = Math.cos(yaw), sz = -Math.sin(yaw);
        const side = (w.inside[0] - x) * sx + (w.inside[1] - z) * sz > 0 ? -1 : 1;
        const ax = x + sx * side * 8.5, az = z + sz * side * 8.5, g = heightAt(ax, az);
        const out = Math.atan2(sx * side, sz * side) + rr(-0.4, 0.4);
        addInst('log', ax, g + 0.25, az, out, 0.18, 4, 0.18, col(0x5e4a34), Math.PI / 2 - 0.15);
        for (let b = 0; b < 3; b++) addInst('box', ax + Math.sin(out) * rr(0, 1.6), g + 0.5, az + Math.cos(out) * rr(0, 1.6), out + rr(-0.9, 0.9), 0.06, 0.06, 1.6, col(0x5e4a34), rr(-0.6, -0.2));
      });
    }
  }
  // batteries: gabions around guns that sit in trenches or redoubts
  for (const cn of map.cannons) {
    if (earthAt(cn.x, cn.z) <= 0 && !(map.trenches && map.trenches.length)) continue;
    const fx = Math.sin(cn.yaw), fz = Math.cos(cn.yaw), px = Math.cos(cn.yaw), pz = -Math.sin(cn.yaw);
    for (const e of [-1, 1]) for (let k = 0; k < 2; k++) addGabion(cn.x + fx * 2.2 + px * e * (1.6 + k * 1.05), cn.z + fz * 2.2 + pz * e * (1.6 + k * 1.05), true);
  }
}
function buildWreck(w) {
  const geo = shipGeometry(GB, true);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.position.set(w.x, TER.water - 1.4, w.z); m.rotation.set(0.12, w.yaw, 0.32);
  WORLD.add(m);
  if (w.fire) { addFire(w.x, TER.water + 1.5, w.z, 3.5, true); addFire(w.x + Math.sin(w.yaw) * 5, TER.water + 2, w.z + Math.cos(w.yaw) * 5, 2.5, true); }
}

// ---------- build everything ----------
function clearWorld() {
  for (const o of WORLD.children.slice()) {
    WORLD.remove(o);
    o.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) { const ms = Array.isArray(n.material) ? n.material : [n.material]; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } } });
  }
  COL.length = 0; CG.clear(); PIECES.length = 0; BLD.length = 0; AMMO_POINTS.length = 0;
  for (const k in SI) delete SI[k];
  SI_FINAL = false;
  DEB.mesh = null; DEB.list = []; DEB.free = [];
  WATER.mat = null; WATER.mesh = null;
  clearFires();
}
function buildWorld(map) {
  const t0 = performance.now();
  clearWorld();
  setSeed(map.seed);
  applyLight(map.light);
  layoutMap(map);
  buildTerrain(map);
  buildForestMask(map);
  buildTerrainMesh(map);
  const T = { terrain: performance.now() - t0 };
  makeSI('box', new THREE.BoxGeometry(1, 1, 1), 40000);
  makeSI('log', new THREE.CylinderGeometry(1, 1, 1, 7, 1), 6000);
  makeSI('gabion', mergeParts([part(GEO.cyl(1, 1, 1, 9), [1, 1, 1], [0, 0, 0], null, null, { cv: (x, y) => (y > 0.49 ? 0.62 : 0.9 + 0.12 * Math.sin(y * 40)) })]), 1200, true, false);
  makeSI('prism', GEO.prism(1, 1, 1), 1200);
  makeSI('cone4', GEO.cone(0.71, 1, 4), 60, true, false);
  initDebris();
  for (const b of LAYOUT.buildings) buildHouse(b);
  for (const w of map.walls) {
    if (w.kind === 'stone') buildStoneWall(w.pts);
    else if (w.kind === 'rail') buildRailFence(w.pts, w.hay);
    else buildWormFence(w.pts);
  }
  for (const br of map.bridges || []) buildBridge(br);
  dressWorks(map);
  for (const cp of map.camps || []) buildCamp(cp);
  for (const bt of map.boats || []) buildBoat(bt.x, bt.z, bt.yaw);
  for (const w of map.wrecks || []) buildWreck(w);
  // haystacks in the hayfields
  for (const f of map.fields) if (f.kind === 'hay' || f.kind === 'wheat') {
    const [x0, z0, x1, z1] = polyBounds(f.poly);
    for (let k = 0; k < 5; k++) {
      const x = rr(x0, x1), z = rr(z0, z1);
      if (!pointInPoly(x, z, f.poly) || nearFlag(map, x, z, 0.4)) continue;
      const g = heightAt(x, z), P = newPiece('hay', null), hc = col(0xc6ae62);
      pieceInst(P, 'cone4', x, g + 1.1, z, rand(), 2.6, 2.4, 2.6, shadeC(hc, 0.9 + rand() * 0.15));
      P.cols.push(addCylCol(x, z, 1.2, g - 0.2, g + 1.7, CF_ALL, 'hay', P));
      finishPiece(P, x, g + 0.8, z, hc);
    }
  }
  plantTrees(map);
  T.props = performance.now() - t0 - T.terrain;
  buildNav();
    T.total = performance.now() - t0;
  return T;
}
