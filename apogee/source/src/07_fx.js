// 07_fx: camera-facing particles (one additive and one alpha mesh rebuilt each frame), bullet-hole and scorch
// decals in a ring buffer, ray-gun beams, explosions and breaking glass.
const FX = { parts: [], addMesh: null, alphaMesh: null, decalMesh: null, decalN: 0, decalMax: 220, shake: 0 };
const PMAX = 500;
function dynGeo(nQuads) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nQuads * 12), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(nQuads * 8), 2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('tile', new THREE.BufferAttribute(new Float32Array(nQuads * 4), 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('lcol', new THREE.BufferAttribute(new Float32Array(nQuads * 12), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nQuads * 12), 3));
  const ix = [];
  for (let q = 0; q < nQuads; q++) ix.push(q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3);
  g.setIndex(ix);
  g.setDrawRange(0, 0);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}
function initFx() {
  FX.parts = []; FX.decalN = 0; FX.shake = 0;
  FX.addMesh = new THREE.Mesh(dynGeo(PMAX), MAT.add); FX.addMesh.frustumCulled = false; FX.addMesh.renderOrder = 5;
  FX.alphaMesh = new THREE.Mesh(dynGeo(PMAX), MAT.fxAlpha); FX.alphaMesh.frustumCulled = false; FX.alphaMesh.renderOrder = 4;
  MAT.decal.polygonOffset = true; MAT.decal.polygonOffsetFactor = -2; MAT.decal.polygonOffsetUnits = -4;
  FX.decalMesh = new THREE.Mesh(dynGeo(FX.decalMax), MAT.decal); FX.decalMesh.frustumCulled = false;
  FX.decalMesh.geometry.setDrawRange(0, 0);
  scene.add(FX.addMesh, FX.alphaMesh, FX.decalMesh);
}
// p: {x,y,z, vx,vy,vz, life, size, size1, tile|tiles, col, grav, drag, add, beam:[x1,y1,z1], spin}
function part(p) {
  if (FX.parts.length >= PMAX) FX.parts.shift();
  p.age = 0; p.max = p.life; p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0;
  p.size1 = p.size1 === undefined ? p.size : p.size1; p.col = p.col || [1, 1, 1];
  p.rot = p.rot === undefined ? Math.random() * TAU : p.rot;
  FX.parts.push(p);
  return p;
}
const _cr = new THREE.Vector3(), _cu = new THREE.Vector3(), _cf = new THREE.Vector3();
function updateFx(dt) {
  FX.shake = Math.max(0, FX.shake - dt * 2.5);
  const parts = FX.parts;
  for (let k = parts.length - 1; k >= 0; k--) {
    const p = parts[k];
    p.age += dt;
    if (p.age >= p.max) { parts.splice(k, 1); continue; }
    if (p.grav) p.vy -= p.grav * dt;
    if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; p.vz *= f; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.floor !== undefined && p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; }
    if (p.spin) p.rot += p.spin * dt;
  }
}
function drawFx() {
  camera.matrixWorld.extractBasis(_cr, _cu, _cf);
  const fill = (mesh, add) => {
    const g = mesh.geometry, P = g.attributes.position.array, U = g.attributes.uv.array, T = g.attributes.tile.array, Cc = g.attributes.lcol.array;
    let q = 0;
    for (const p of FX.parts) {
      if (!!p.add !== add) continue;
      const t = p.age / p.max, s = lerp(p.size, p.size1, t) * 0.5;
      const tile = p.tiles ? p.tiles[Math.min(p.tiles.length - 1, Math.floor(t * p.tiles.length))] : p.tile;
      const fade = p.fade === false ? 1 : add ? 1 - t * t : 1 - t * 0.6;
      let ax, ay, az, bx, by, bz;
      if (p.beam) {
        // ribbon from p to p.beam, widened across the view
        const dx = p.beam[0] - p.x, dy = p.beam[1] - p.y, dz = p.beam[2] - p.z;
        const vx = p.x - camera.position.x, vy = p.y - camera.position.y, vz = p.z - camera.position.z;
        let wx = dy * vz - dz * vy, wy = dz * vx - dx * vz, wz = dx * vy - dy * vx;
        const wl = Math.hypot(wx, wy, wz) || 1; wx *= s / wl; wy *= s / wl; wz *= s / wl;
        const o = q * 12;
        P[o] = p.x - wx; P[o + 1] = p.y - wy; P[o + 2] = p.z - wz;
        P[o + 3] = p.beam[0] - wx; P[o + 4] = p.beam[1] - wy; P[o + 5] = p.beam[2] - wz;
        P[o + 6] = p.beam[0] + wx; P[o + 7] = p.beam[1] + wy; P[o + 8] = p.beam[2] + wz;
        P[o + 9] = p.x + wx; P[o + 10] = p.y + wy; P[o + 11] = p.z + wz;
      } else {
        const cs = Math.cos(p.rot) * s, sn = Math.sin(p.rot) * s;
        ax = _cr.x * cs + _cu.x * sn; ay = _cr.y * cs + _cu.y * sn; az = _cr.z * cs + _cu.z * sn;
        bx = -_cr.x * sn + _cu.x * cs; by = -_cr.y * sn + _cu.y * cs; bz = -_cr.z * sn + _cu.z * cs;
        const o = q * 12;
        P[o] = p.x - ax - bx; P[o + 1] = p.y - ay - by; P[o + 2] = p.z - az - bz;
        P[o + 3] = p.x + ax - bx; P[o + 4] = p.y + ay - by; P[o + 5] = p.z + az - bz;
        P[o + 6] = p.x + ax + bx; P[o + 7] = p.y + ay + by; P[o + 8] = p.z + az + bz;
        P[o + 9] = p.x - ax + bx; P[o + 10] = p.y - ay + by; P[o + 11] = p.z - az + bz;
      }
      const u = q * 8;
      U[u] = 0; U[u + 1] = 0.999; U[u + 2] = 0.999; U[u + 3] = 0.999; U[u + 4] = 0.999; U[u + 5] = 0; U[u + 6] = 0; U[u + 7] = 0;
      if (p.beam) { U[u] = 0; U[u + 1] = 0; U[u + 2] = 0.999; U[u + 3] = 0; U[u + 4] = 0.999; U[u + 5] = 0.999; U[u + 6] = 0; U[u + 7] = 0.999; }
      for (let k = 0; k < 4; k++) { T[q * 4 + k] = tile; Cc[q * 12 + k * 3] = p.col[0] * fade; Cc[q * 12 + k * 3 + 1] = p.col[1] * fade; Cc[q * 12 + k * 3 + 2] = p.col[2] * fade; }
      if (++q >= PMAX) break;
    }
    g.setDrawRange(0, q * 6);
    for (const k of ['position', 'uv', 'tile', 'lcol']) g.attributes[k].needsUpdate = true;
  };
  fill(FX.addMesh, true); fill(FX.alphaMesh, false);
}

// ---------------------------------------------------------------- decals
const _dcol = [0, 0, 0];
function decal(x, y, z, nx, ny, nz, size, tileName) {
  const g = FX.decalMesh.geometry, P = g.attributes.position.array, U = g.attributes.uv.array, T = g.attributes.tile.array, Cc = g.attributes.lcol.array;
  const q = FX.decalN % FX.decalMax;
  FX.decalN++;
  let t1x, t1y, t1z;
  if (Math.abs(ny) > 0.9) { t1x = 1; t1y = 0; t1z = 0; } else { t1x = nz; t1y = 0; t1z = -nx; const l = Math.hypot(t1x, t1z) || 1; t1x /= l; t1z /= l; }
  const t2x = ny * t1z - nz * t1y, t2y = nz * t1x - nx * t1z, t2z = nx * t1y - ny * t1x;
  const a = Math.random() * TAU, ca = Math.cos(a) * size / 2, sa = Math.sin(a) * size / 2;
  const ux = t1x * ca + t2x * sa, uy = t1y * ca + t2y * sa, uz = t1z * ca + t2z * sa;
  const vx = -t1x * sa + t2x * ca, vy = -t1y * sa + t2y * ca, vz = -t1z * sa + t2z * ca;
  const px = x + nx * 0.012, py = y + ny * 0.012, pz = z + nz * 0.012;
  const o = q * 12;
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let k = 0; k < 4; k++) { const [i, j] = pts[k]; P[o + k * 3] = px + ux * i + vx * j; P[o + k * 3 + 1] = py + uy * i + vy * j; P[o + k * 3 + 2] = pz + uz * i + vz * j; }
  const u = q * 8;
  U[u] = 0; U[u + 1] = 0.999; U[u + 2] = 0.999; U[u + 3] = 0.999; U[u + 4] = 0.999; U[u + 5] = 0; U[u + 6] = 0; U[u + 7] = 0;
  lightGridAt(x + nx * 0.3, z + nz * 0.3, _dcol);
  for (let k = 0; k < 4; k++) { T[q * 4 + k] = TILE[tileName]; Cc[o + k * 3] = Math.min(_dcol[0], 1.2); Cc[o + k * 3 + 1] = Math.min(_dcol[1], 1.2); Cc[o + k * 3 + 2] = Math.min(_dcol[2], 1.2); }
  g.setDrawRange(0, Math.min(FX.decalN, FX.decalMax) * 6);
  for (const k of ['position', 'uv', 'tile', 'lcol']) g.attributes[k].needsUpdate = true;
}

// ---------------------------------------------------------------- impacts
function spark(x, y, z, nx, ny, nz, n = 4) {
  for (let k = 0; k < n; k++) part({ x, y, z, vx: nx * 3 + rand(-2.5, 2.5), vy: ny * 3 + rand(0, 3), vz: nz * 3 + rand(-2.5, 2.5), life: rand(0.15, 0.35), size: 0.12, size1: 0.02, tile: TILE.spark, grav: 12, add: true, col: [1, 0.85, 0.5] });
}
function dustPuff(x, y, z, nx, ny, nz, col) {
  part({ x: x + nx * 0.05, y: y + ny * 0.05, z: z + nz * 0.05, vx: nx * 0.8, vy: ny * 0.8 + 0.3, vz: nz * 0.8, life: 0.5, size: 0.25, size1: 0.7, tile: TILE.dust, col: col || [0.9, 0.9, 0.9], drag: 3 });
}
function smokePuff(x, y, z, n = 3, big = 1) {
  for (let k = 0; k < n; k++) part({ x: x + rand(-0.3, 0.3) * big, y: y + rand(0, 0.4) * big, z: z + rand(-0.3, 0.3) * big, vx: rand(-0.4, 0.4), vy: rand(0.5, 1.4), vz: rand(-0.4, 0.4), life: rand(1.2, 2.2), size: 0.6 * big, size1: 2.2 * big, tile: TILE.smoke, col: [0.6, 0.6, 0.6], drag: 1, spin: rand(-1, 1) });
}
function bloodPuff(x, y, z) {
  for (let k = 0; k < 3; k++) part({ x, y, z, vx: rand(-0.8, 0.8), vy: rand(-0.2, 1), vz: rand(-0.8, 0.8), life: 0.35, size: 0.12, size1: 0.35, tile: TILE.smoke, col: [0.55, 0.05, 0.04], drag: 4 });
}
function impactFx(h) {
  if (!h) return;
  const metal = h.kind === 'door' || (h.prop && h.prop.mat === 'metal') || (L.def.sky !== 'steppe' && h.kind !== 'floor');
  spark(h.x, h.y, h.z, h.nx, h.ny, h.nz, metal ? 5 : 2);
  dustPuff(h.x, h.y, h.z, h.nx, h.ny, h.nz, L.def.sky === 'steppe' && h.kind === 'floor' && L.out[h.i] ? [0.8, 0.7, 0.55] : [0.75, 0.75, 0.75]);
  if (h.kind === 'wall' || h.kind === 'floor' || h.kind === 'ceil' || (h.kind === 'prop' && h.prop && h.prop.hp === Infinity && !h.prop.seeThrough)) decal(h.x, h.y, h.z, h.nx, h.ny, h.nz, 0.13, 'hole');
}
function muzzleFlashAt(x, y, z, big = 1) {
  part({ x, y, z, life: 0.06, size: 0.5 * big, size1: 0.6 * big, tile: TILE.flash, add: true, col: [1, 0.9, 0.7], fade: false });
}
function beamFx(x0, y0, z0, x1, y1, z1, col) {
  part({ x: x0, y: y0, z: z0, beam: [x1, y1, z1], life: 0.14, size: 0.12, size1: 0.02, tile: TILE.beam, add: true, col: col || [0.6, 1, 1], rot: 0 });
  part({ x: x1, y: y1, z: z1, life: 0.2, size: 0.5, size1: 0.1, tile: TILE.glow, add: true, col: col || [0.5, 1, 1] });
}

// ---------------------------------------------------------------- glass
function shatterWindow(w, hx, hy, hz) {
  if (!w.intact || w.armoured) return false;
  w.intact = false;
  if (w.mesh) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh = null; }
  const x = cx2(w.c), z = cx2(w.r), y0 = L.fh[w.i], y1 = L.ceil[w.i];
  for (let k = 0; k < 34; k++) {
    const a = rand(-1, 1);
    const px = w.axis === 'x' ? x + a : x, pz = w.axis === 'x' ? z : z + a;
    part({ x: px, y: rand(y0, y1), z: pz, vx: rand(-2, 2), vy: rand(0, 2), vz: rand(-2, 2), life: rand(0.6, 1.2), size: rand(0.08, 0.2), tile: TILE.shard, grav: 14, floor: L.fh[w.i] - SILL_H + 0.02, col: [0.9, 1, 1], spin: rand(-8, 8), fade: false });
  }
  sfx('glass', { x, y: (y0 + y1) / 2, z });
  noiseEvent(x, z, 22, null);
  void hx; void hy; void hz;
  return true;
}

// ---------------------------------------------------------------- explosions
function explode(x, y, z, radius, dmg, owner) {
  sfx('boom', { x, y, z });
  for (let k = 0; k < 7; k++) part({ x: x + rand(-0.6, 0.6), y: y + rand(-0.2, 1), z: z + rand(-0.6, 0.6), vx: rand(-1, 1), vy: rand(0.5, 2), vz: rand(-1, 1), life: rand(0.5, 0.8), size: radius * rand(0.5, 0.8), size1: radius * rand(0.9, 1.3), tiles: [TILE.expl0, TILE.expl1, TILE.expl2, TILE.expl3], add: true, col: [1, 0.95, 0.85], fade: false, spin: rand(-2, 2) });
  smokePuff(x, y + 0.5, z, 7, radius / 3);
  for (let k = 0; k < 16; k++) part({ x, y: y + 0.3, z, vx: rand(-8, 8), vy: rand(2, 9), vz: rand(-8, 8), life: rand(0.4, 0.9), size: 0.15, size1: 0.05, tile: TILE.spark, grav: 14, add: true, col: [1, 0.7, 0.3] });
  const i = idxAt(x, z);
  if (i >= 0) decal(x, L.fh[i], z, 0, 1, 0, radius * 0.7, 'scorch');
  const dp = G.player ? Math.hypot(G.player.x - x, G.player.y + 1 - y, G.player.z - z) : 1e9;
  FX.shake = Math.max(FX.shake, clamp(1.4 - dp / (radius * 4), 0, 1.2));
  noiseEvent(x, z, 45, owner);
  // damage
  if (G.player && dp < radius && losClear(x, y + 0.3, z, G.player.x, G.player.y + 1.2, G.player.z)) damagePlayer(dmg * (1 - dp / radius) * 0.6, x, z, true);
  for (const a of G.actors) {
    if (a.dead) continue;
    const d = Math.hypot(a.x - x, a.y + 1 - y, a.z - z);
    if (d < radius && losClear(x, y + 0.3, z, a.x, a.y + 1.2, a.z)) damageActor(a, dmg * (1 - d / radius) + 20, 'torso', owner, { explosive: true, fromX: x, fromZ: z });
  }
  for (const p of L.props.slice()) {
    if (p.dead || !p.box) continue;
    const c = [(p.box[0] + p.box[3]) / 2, (p.box[1] + p.box[4]) / 2, (p.box[2] + p.box[5]) / 2];
    const hx = Math.max(p.box[3] - p.box[0], p.box[5] - p.box[2]) / 2;
    const d = Math.max(0, Math.hypot(c[0] - x, c[2] - z) - hx);
    if (d < radius * 0.8 && Math.abs(c[1] - y) < radius + 2) damageProp(p, dmg, true, null);
  }
  for (const w of L.windows.values()) if (w.intact && Math.hypot(cx2(w.c) - x, cx2(w.r) - z) < radius * 1.3) shatterWindow(w);
  for (const m of MINES.list.slice()) if (Math.hypot(m.x - x, m.y - y, m.z - z) < radius * 0.7 && !m.boom) { m.boom = true; later(0.12, () => detonateMine(m)); }
}
