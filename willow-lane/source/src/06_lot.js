// Willow Lane — the lot: floor tiles, walls on tile edges (with doors and windows), rooms, room scores and their meshes.
// Edges: 'h:x:z' is the wall along the north edge of tile (x, z), between (x, z-1) and (x, z).
//        'v:x:z' is the wall along the west edge of tile (x, z), between (x-1, z) and (x, z).
// A wall has a paper on side a (toward the lower coordinate) and side b (toward tile x,z), and an optional opening.

const DOORS = [
  { id: 1, name: 'Panel Door', price: 150, color: 0xf2efe6 },
  { id: 2, name: 'Glass French Door', price: 320, color: 0x6e4a30, glass: true },
  { id: 3, name: 'Open Archway', price: 80, arch: true },
];
const WINDOWS = [
  { id: 1, name: 'Sash Window', price: 90, y0: 0.9, y1: 2.1 },
  { id: 2, name: 'Picture Window', price: 180, y0: 0.5, y1: 2.35 },
  { id: 3, name: 'Porthole Window', price: 130, y0: 1.2, y1: 1.9, round: true },
];
const DOOR = Object.fromEntries(DOORS.map((d) => [d.id, d]));
const WINDOW = Object.fromEntries(WINDOWS.map((d) => [d.id, d]));
const WALL_PRICE = 10;

const LOT = {
  floor: new Uint8Array(LOT_W * LOT_D),
  walls: new Map(),
  room: new Int16Array(LOT_W * LOT_D), // 0 = outdoors
  rooms: [],
  group: null, wallObjs: new Map(), posts: [], floorMesh: null, dirty: true,
};
const inLot = (x, z) => x >= 0 && z >= 0 && x < LOT_W && z < LOT_D;
const tidx = (x, z) => z * LOT_W + x;
const wkey = (o, x, z) => o + ':' + x + ':' + z;
const wallGet = (o, x, z) => LOT.walls.get(wkey(o, x, z));
function wallSet(o, x, z, w) { const k = wkey(o, x, z); if (w) LOT.walls.set(k, w); else LOT.walls.delete(k); LOT.dirty = true; }
// the edge crossed by an orthogonal step from (x,z) to (nx,nz)
function edgeOf(x, z, nx, nz) {
  if (nx === x + 1) return ['v', nx, z]; if (nx === x - 1) return ['v', x, z];
  if (nz === z + 1) return ['h', x, nz]; if (nz === z - 1) return ['h', x, z];
  return null;
}
function edgeWall(x, z, nx, nz) { const e = edgeOf(x, z, nx, nz); return e ? wallGet(e[0], e[1], e[2]) : null; }
// can a sim walk across this edge?
function edgeOpen(x, z, nx, nz) { const w = edgeWall(x, z, nx, nz); return !w || (w.open && w.open.type === 'door'); }
const roomAt = (x, z) => (inLot(Math.floor(x), Math.floor(z)) ? LOT.room[tidx(Math.floor(x), Math.floor(z))] : 0);

function lotClear() { LOT.floor.fill(0); LOT.walls.clear(); LOT.dirty = true; }

// ---------- rooms ----------
function computeRooms() {
  const W = LOT_W, D = LOT_D, room = LOT.room;
  room.fill(-1);
  const q = [];
  const solid = (x, z, nx, nz) => !!edgeWall(x, z, nx, nz); // any wall separates rooms, doors included
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    if (x > 0 && z > 0 && x < W - 1 && z < D - 1) continue;
    let open = false;
    if (x === 0 && !wallGet('v', 0, z)) open = true; if (x === W - 1 && !wallGet('v', W, z)) open = true;
    if (z === 0 && !wallGet('h', x, 0)) open = true; if (z === D - 1 && !wallGet('h', x, D)) open = true;
    if (open && room[tidx(x, z)] < 0) { room[tidx(x, z)] = 0; q.push(x, z); }
  }
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const flood = (id) => { while (q.length) { const z = q.pop(), x = q.pop(); for (const [dx, dz] of N4) { const nx = x + dx, nz = z + dz; if (!inLot(nx, nz) || room[tidx(nx, nz)] >= 0 || solid(x, z, nx, nz)) continue; room[tidx(nx, nz)] = id; q.push(nx, nz); } } };
  flood(0);
  LOT.rooms = [{ id: 0, tiles: 0, outdoor: true }];
  let id = 1;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (room[tidx(x, z)] < 0) { room[tidx(x, z)] = id; q.push(x, z); flood(id); LOT.rooms.push({ id, tiles: 0 }); id++; }
  for (let i = 0; i < room.length; i++) LOT.rooms[room[i]].tiles++;
  // windows per room
  for (const r of LOT.rooms) { r.windows = 0; r.doors = 0; }
  for (const [k, w] of LOT.walls) {
    if (!w.open) continue;
    const [o, xs, zs] = k.split(':'); const x = +xs, z = +zs;
    const sides = o === 'h' ? [[x, z - 1], [x, z]] : [[x - 1, z], [x, z]];
    for (const [sx, sz] of sides) if (inLot(sx, sz)) { const r = LOT.rooms[room[tidx(sx, sz)]]; if (w.open.type === 'window') r.windows++; else r.doors++; }
  }
}

// Room score 0..100, recalculated a few times a game hour. Feeds every sim's Room need.
function roomScore(id) {
  const r = LOT.rooms[id]; if (!r) return 50;
  const dark = isDark();
  let s;
  let decor = 0, dirt = 0, lamps = 0;
  for (const o of G.objects) {
    if (o.room !== id) continue;
    if (o.def.room) decor += o.def.room * (o.dead ? -1 : 1) * (o.broken ? 0.3 : 1);
    if (o.def.lamp) lamps++;
    if (o.dirt > 60) dirt += 4;
    if (o.broken) dirt += 3;
    if (o.trash >= 100) dirt += 8;
  }
  for (const it of G.items) {
    if (it.room !== id) continue;
    if (it.kind === 'plate' && it.dirty) dirt += 6; else if (it.kind === 'puddle') dirt += 8; else if (it.kind === 'fire') dirt += 40;
    else if (it.kind === 'pizza' && it.dirty) dirt += 5; else if (it.kind === 'trashbag') dirt += 6;
  }
  if (r.outdoor) {
    s = (dark ? 40 : 58) + Math.min(28, decor * 1.6) - dirt;
  } else {
    s = 34 + Math.min(16, r.tiles * 0.6) - (r.tiles < 6 ? 10 : 0);
    if (dark) s += lamps ? Math.min(18, lamps * 9) : -16; else s += Math.min(18, r.windows * 6) - (r.windows ? 0 : 10) + (lamps ? 3 : 0);
    s += Math.min(34, decor * 2.6) - dirt;
  }
  return clamp(s, 0, 100);
}
function updateRoomScores() { for (const r of LOT.rooms) r.score = roomScore(r.id); }

// ---------- meshes ----------
const TRIM = 0xf4f2ec;
function wallPieceGeo(x0, x1, y0, y1, t) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, t);
  g.translate((x0 + x1) / 2 - 0.5, (y0 + y1) / 2, 0);
  const uv = g.attributes.uv;
  for (let i = 16; i < 24; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const uu = i < 20 ? x0 + u * (x1 - x0) : (1 - x1) + u * (x1 - x0);
    uv.setXY(i, uu, (y0 + v * (y1 - y0)) / WALL_H);
  }
  return g;
}
function buildWallGroup(o, x, z, w) {
  const g = new THREE.Group();
  const trim = mat(TRIM), top = mat(0xdedad2);
  const pa = TEX.paper[w.a] || TEX.paper[1], pb = TEX.paper[w.b] || TEX.paper[1];
  const mats = [trim, trim, top, top, pb, pa];
  const piece = (x0, x1, y0, y1, t = WALL_T) => { const m = new THREE.Mesh(wallPieceGeo(x0, x1, y0, y1, t), mats); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const op = w.open;
  if (!op) piece(0, 1, 0, WALL_H);
  else if (op.type === 'door') {
    const D = DOOR[op.style] || DOORS[0];
    piece(0, 0.06, 0, WALL_H); piece(0.94, 1, 0, WALL_H); piece(0.06, 0.94, 2.15, WALL_H);
    // frame
    for (const s of [-1, 1]) { const f = new THREE.Mesh(boxGeo(0.06, 2.15, WALL_T + 0.04), trim); f.position.set(s * 0.44, 1.075, 0); g.add(f); }
    const hf = new THREE.Mesh(boxGeo(0.94, 0.06, WALL_T + 0.04), trim); hf.position.set(0, 2.15, 0); g.add(hf);
    if (!D.arch) {
      const hinge = new THREE.Group(); hinge.position.set(-0.41, 0, 0); g.add(hinge);
      const leaf = new THREE.Mesh(boxGeo(0.82, 2.08, 0.045), mat(D.color)); leaf.position.set(0.41, 1.04, 0); leaf.castShadow = true; hinge.add(leaf);
      if (D.glass) { for (const yy of [0.7, 1.45]) { const gl = new THREE.Mesh(boxGeo(0.6, 0.55, 0.05), new THREE.MeshLambertMaterial({ color: 0xa8d0e8, transparent: true, opacity: 0.5 })); gl.position.set(0.41, yy, 0); hinge.add(gl); } }
      else for (const yy of [0.55, 1.45]) for (const ss of [-1, 1]) { const p = new THREE.Mesh(boxGeo(0.66, 0.6, 0.012), mat(shadeHex(D.color, 0.93))); p.position.set(0.41, yy, ss * 0.026); hinge.add(p); }
      const kn = new THREE.Mesh(sphGeo(0.03, 8, 6), mat(0xd8b048)); kn.position.set(0.74, 1.0, 0.04); hinge.add(kn);
      g.userData.hinge = hinge; g.userData.open = 0; hinge.userData.live = true;
      mergeStatic(hinge);
    }
  } else {
    const Wd = WINDOW[op.style] || WINDOWS[0];
    piece(0, 0.08, 0, WALL_H); piece(0.92, 1, 0, WALL_H); piece(0.08, 0.92, 0, Wd.y0); piece(0.08, 0.92, Wd.y1, WALL_H);
    const h = Wd.y1 - Wd.y0, cy = (Wd.y0 + Wd.y1) / 2;
    const gl = new THREE.Mesh(boxGeo(0.84, h, 0.02), new THREE.MeshLambertMaterial({ color: 0xa8d8f0, transparent: true, opacity: 0.38, emissive: 0xffc870, emissiveIntensity: 0 }));
    gl.position.set(0, cy, 0); g.add(gl); g.userData.glass = gl; R.nightGlow.push(gl.material);
    const frameM = trim;
    for (const yy of [Wd.y0, Wd.y1]) { const f = new THREE.Mesh(boxGeo(0.88, 0.05, WALL_T + 0.03), frameM); f.position.set(0, yy, 0); g.add(f); }
    for (const xx of [-0.43, 0.43]) { const f = new THREE.Mesh(boxGeo(0.05, h, WALL_T + 0.03), frameM); f.position.set(xx, cy, 0); g.add(f); }
    if (!Wd.round) { const m1 = new THREE.Mesh(boxGeo(0.03, h, 0.05), frameM); m1.position.set(0, cy, 0); g.add(m1); const m2 = new THREE.Mesh(boxGeo(0.84, 0.03, 0.05), frameM); m2.position.set(0, cy, 0); g.add(m2); }
    const sill = new THREE.Mesh(boxGeo(0.96, 0.04, WALL_T + 0.12), frameM); sill.position.set(0, Wd.y0 - 0.02, 0); g.add(sill);
  }
  if (op) mergeStatic(g, true);
  if (o === 'h') g.position.set(x + 0.5, 0, z);
  else { g.position.set(x, 0, z + 0.5); g.rotation.y = Math.PI / 2; }
  g.userData.pick = { type: 'wall', o, x, z, key: wkey(o, x, z) };
  g.userData.low = false;
  return g;
}

function rebuildLot() {
  if (!LOT.group) { LOT.group = new THREE.Group(); R.scene.add(LOT.group); }
  for (const g of LOT.wallObjs.values()) LOT.group.remove(g);
  LOT.wallObjs.clear();
  if (LOT.postMesh) { LOT.group.remove(LOT.postMesh); LOT.postMesh.dispose && LOT.postMesh.dispose(); LOT.postMesh = null; }
  LOT.posts = [];
  if (LOT.floorMesh) { LOT.group.remove(LOT.floorMesh); LOT.floorMesh.geometry.dispose(); }
  // the glass materials are recreated, so drop the old ones from the night glow list
  R.nightGlow = R.nightGlow.filter((m) => !m.userData || !m.userData.lotGlass);
  // floor
  const pos = [], uv = [], idx = [];
  for (let z = 0; z < LOT_D; z++) for (let x = 0; x < LOT_W; x++) {
    const f = LOT.floor[tidx(x, z)]; if (!f) continue;
    const [u0, v0, u1, v1] = TEX.floorUV[f] || TEX.floorUV[1];
    const n = pos.length / 3, y = 0.025;
    pos.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1);
    uv.push(u0, v1, u1, v1, u1, v0, u0, v0);
    idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  fg.setIndex(idx); fg.computeVertexNormals();
  LOT.floorMesh = new THREE.Mesh(fg, TEX.floorMat); LOT.floorMesh.receiveShadow = true;
  LOT.group.add(LOT.floorMesh);
  // walls
  for (const [k, w] of LOT.walls) {
    const [o, xs, zs] = k.split(':');
    const g = buildWallGroup(o, +xs, +zs, w);
    if (g.userData.glass) g.userData.glass.material.userData.lotGlass = true;
    LOT.group.add(g); LOT.wallObjs.set(k, g);
  }
  // corner posts
  const vertex = new Set();
  for (const k of LOT.walls.keys()) { const [o, xs, zs] = k.split(':'); const x = +xs, z = +zs; if (o === 'h') { vertex.add(x + ',' + z); vertex.add(x + 1 + ',' + z); } else { vertex.add(x + ',' + z); vertex.add(x + ',' + (z + 1)); } }
  // corner posts: one instanced mesh, a unit-high box scaled per post by the cutaway
  if (vertex.size) {
    const geo = new THREE.BoxGeometry(WALL_T + 0.03, 1, WALL_T + 0.03); geo.translate(0, 0.5, 0);
    LOT.postMesh = new THREE.InstancedMesh(geo, mat(TRIM), vertex.size); LOT.postMesh.castShadow = true;
    for (const v of vertex) { const [x, z] = v.split(',').map(Number); LOT.posts.push({ x, z }); }
    LOT.group.add(LOT.postMesh);
  }
  computeRooms();
  buildRoof();
  for (const o of G.objects) o.room = roomAt(o.x + 0.5, o.z + 0.5);
  for (const it of G.items) it.room = roomAt(it.x, it.z);
  updateRoomScores();
  LOT.dirty = false;
  LOT.cutKey = '';
}

// A hip roof over every indoor tile, shown in walls-up view. Each corner's height grows with its
// (chessboard) distance from the outdoors, which gives ridges and hips for any floor plan.
const ROOF_PITCH = 0.55;
function buildRoof() {
  if (LOT.roof) { LOT.group.remove(LOT.roof); LOT.roof.geometry.dispose(); LOT.roof = null; }
  const VW = LOT_W + 1, VD = LOT_D + 1, dist = new Float32Array(VW * VD).fill(1e9), q = [];
  const outside = (x, z) => !inLot(x, z) || LOT.room[tidx(x, z)] === 0;
  for (let z = 0; z <= LOT_D; z++) for (let x = 0; x <= LOT_W; x++) {
    if (outside(x - 1, z - 1) || outside(x, z - 1) || outside(x - 1, z) || outside(x, z)) { dist[z * VW + x] = 0; q.push(x, z); }
  }
  for (let i = 0; i < q.length; i += 2) {
    const x = q[i], z = q[i + 1], d = dist[z * VW + x];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx > LOT_W || nz > LOT_D) continue;
      if (dist[nz * VW + nx] > d + 1) { dist[nz * VW + nx] = d + 1; q.push(nx, nz); }
    }
  }
  const pos = [];
  const H = (x, z) => WALL_H + 0.02 + Math.min(dist[z * VW + x], 7) * ROOF_PITCH;
  for (let z = 0; z < LOT_D; z++) for (let x = 0; x < LOT_W; x++) {
    if (outside(x, z)) continue;
    const v = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]].map(([a, b]) => [a, H(a, b), b]);
    const tri = (a, b, c) => pos.push(...v[a], ...v[b], ...v[c]);
    // split along the diagonal with the bigger rise, so hips and valleys stay sharp
    if (Math.abs(v[0][1] - v[2][1]) >= Math.abs(v[1][1] - v[3][1])) { tri(0, 2, 1); tri(0, 3, 2); } else { tri(0, 3, 1); tri(1, 3, 2); }
  }
  if (!pos.length) return;
  // shingle rows run parallel to each face's eave: map v along the downhill direction
  const uv = [];
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i], ay = pos[i + 1], az = pos[i + 2], bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5], cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, nz = ux * vy - uy * vx; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
    for (let k = 0; k < 9; k += 3) { const x = pos[i + k], z = pos[i + k + 2]; uv.push((x * -nz + z * nx) * 0.5, (x * nx + z * nz) * 1.25); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  if (!TEX.shingle) {
    TEX.shingle = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#9a4e3c'; c.fillRect(0, 0, w, h);
      for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) { c.fillStyle = cssHex(shadeHex(0x9a4e3c, 0.85 + Math.random() * 0.25)); c.fillRect(k * 32 + (r % 2) * 16 + 1, r * 16, 30, 15); }
      c.fillStyle = 'rgba(40,10,5,.45)'; for (let r = 0; r < 4; r++) c.fillRect(0, r * 16 + 14, w, 2);
    }, true);
    TEX.roofMat = new THREE.MeshLambertMaterial({ map: TEX.shingle });
  }
  LOT.roof = new THREE.Mesh(g, TEX.roofMat); LOT.roof.castShadow = true; LOT.roof.visible = false;
  LOT.group.add(LOT.roof);
}

// Lower walls that hide the inside of a room from the camera ('cut'), or all of them ('down').
function updateCutaway(force) {
  const [vx, vz] = viewDir();
  const key = G.walls + ':' + Math.round(R.cam.yaw * 20) + ':' + (G.mode);
  if (!force && key === LOT.cutKey) return;
  LOT.cutKey = key;
  const mode = G.walls;
  for (const [k, g] of LOT.wallObjs) {
    let low = mode === 'down';
    if (mode === 'cut') {
      const { o, x, z } = g.userData.pick;
      let far = null;
      if (o === 'h') { if (Math.abs(vz) > 0.25) far = vz < 0 ? [x, z - 1] : [x, z]; }
      else if (Math.abs(vx) > 0.25) far = vx < 0 ? [x - 1, z] : [x, z];
      if (far && inLot(far[0], far[1]) && LOT.room[tidx(far[0], far[1])] > 0) low = true;
      // a wall on the camera side of the house with the outdoors behind it stays up only if it faces away
    }
    g.userData.low = low;
    g.scale.y = low ? WALL_LOW / WALL_H : 1;
  }
  const M = new THREE.Matrix4();
  LOT.posts.forEach(({ x, z }, i) => {
    let up = false;
    for (const k of [wkey('h', x - 1, z), wkey('h', x, z), wkey('v', x, z - 1), wkey('v', x, z)]) { const g = LOT.wallObjs.get(k); if (g && !g.userData.low) up = true; }
    M.makeScale(1, (up ? WALL_H : WALL_LOW) + 0.01, 1); M.setPosition(x, 0, z);
    LOT.postMesh.setMatrixAt(i, M);
  });
  if (LOT.postMesh) LOT.postMesh.instanceMatrix.needsUpdate = true;
  for (const o of G.objects) if (o.def.wall && o.model) { const g = LOT.wallObjs.get(o.wallKey); o.model.visible = !(g && g.userData.low); }
  if (LOT.roof) LOT.roof.visible = mode === 'up' && G.mode === 'live';
}
const wallIsLow = (k) => { const g = LOT.wallObjs.get(k); return !!(g && g.userData.low); };

// swing doors open as sims walk through
function updateDoors(dt) {
  for (const g of LOT.wallObjs.values()) {
    const h = g.userData.hinge; if (!h) continue;
    let near = false;
    for (const s of G.sims) { if (!s.onLot) continue; const dx = s.x - g.position.x, dz = s.z - g.position.z; if (dx * dx + dz * dz < 0.8) { near = true; break; } }
    g.userData.open = lerp(g.userData.open, near ? 1 : 0, Math.min(1, dt * 6));
    h.rotation.y = -g.userData.open * 1.45;
  }
}

// ---------- serialization ----------
function lotToJSON() {
  return { floor: Array.from(LOT.floor), walls: [...LOT.walls].map(([k, w]) => [k, w.a, w.b, w.open ? w.open.type[0] + w.open.style : '', (w.autoA ? 1 : 0) | (w.autoB ? 2 : 0)]) };
}
function lotFromJSON(j) {
  LOT.floor.set(j.floor);
  LOT.walls.clear();
  for (const [k, a, b, op, au] of j.walls) LOT.walls.set(k, { a, b, open: op ? { type: op[0] === 'd' ? 'door' : 'window', style: +op.slice(1) } : null, autoA: !!(au & 1), autoB: !!(au & 2) });
  LOT.dirty = true;
}
