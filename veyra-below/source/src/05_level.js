// Veyra Below — procedural floors: rooms and corridors on a tile grid, meshes, collision, flow fields

const T = 2; // tile size in metres
let LV = null; // the level the party is standing in

function newLevel(w, h, kind) {
  return { w, h, kind, cells: new Uint8Array(w * h), room: new Int16Array(w * h).fill(-1), block: new Uint8Array(w * h), seen: new Uint8Array(w * h),
    rooms: [], start: { x: 0, z: 0 }, colliders: [], walls: [], wallAt: null, objects: [], fences: [], flows: null, flowVer: 0, group: null };
}
const tIdx = (L, i, j) => j * L.w + i;
const tileOf = (x) => Math.floor(x / T);
const tileCenter = (i) => (i + 0.5) * T;
function cellAt(L, i, j) { return i < 0 || j < 0 || i >= L.w || j >= L.h ? 0 : L.cells[j * L.w + i]; }
function solidTile(L, i, j) { if (i < 0 || j < 0 || i >= L.w || j >= L.h) return true; const k = j * L.w + i; return L.cells[k] === 0 || L.block[k] === 1; }
function solidAt(x, z, L = LV) { return solidTile(L, tileOf(x), tileOf(z)); }
function roomAt(x, z, L = LV) { const i = tileOf(x), j = tileOf(z); if (i < 0 || j < 0 || i >= L.w || j >= L.h) return null; const r = L.room[j * L.w + i]; return r >= 0 ? L.rooms[r] : null; }

// ---------- layout ----------
function carveRoom(L, rm, style, rng) {
  const { x0, y0, x1, y1 } = rm;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0 + 1) / 2, ry = (y1 - y0 + 1) / 2;
  const ph = rng() * 10;
  let n = 0;
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    let ok = true;
    if (style === 'organic') {
      const dx = (i - cx) / rx, dy = (j - cy) / ry, a = Math.atan2(dy, dx);
      const wob = 1 + 0.18 * Math.sin(a * 3 + ph) + 0.1 * Math.sin(a * 5 - ph * 2);
      ok = dx * dx + dy * dy <= wob * wob * 0.98;
    } else if (rm.notch) {
      // cut the corners for some variety
      const c = rm.notch;
      ok = !((i - x0 < c || x1 - i < c) && (j - y0 < c || y1 - j < c));
    }
    if (ok) { const k = tIdx(L, i, j); L.cells[k] = 1; L.room[k] = rm.id; n++; }
  }
  rm.tiles = n;
}
function carveCorridor(L, a, b, wdt, style, rng) {
  // L-shaped corridor between room centres, with a jog for organic levels
  let x = a.ci, y = a.cj;
  const pts = [];
  if (style === 'organic') { const mx = Math.round(lerp(a.ci, b.ci, rng.range(0.3, 0.7))) + rng.int(-2, 2), my = Math.round(lerp(a.cj, b.cj, rng.range(0.3, 0.7))) + rng.int(-2, 2); pts.push([mx, y], [mx, my], [b.ci, my], [b.ci, b.cj]); }
  else if (rng() < 0.5) pts.push([b.ci, y], [b.ci, b.cj]); else pts.push([x, b.cj], [b.ci, b.cj]);
  const off0 = -Math.floor((wdt - 1) / 2);
  for (const [tx, ty] of pts) {
    while (x !== tx || y !== ty) {
      for (let o = off0; o < off0 + wdt; o++) for (let p = off0; p < off0 + wdt; p++) {
        const i = x + o, j = y + p;
        if (i > 0 && j > 0 && i < L.w - 1 && j < L.h - 1) { const k = tIdx(L, i, j); if (!L.cells[k]) L.cells[k] = 1; }
      }
      if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
    }
  }
  for (let o = off0; o < off0 + wdt; o++) for (let p = off0; p < off0 + wdt; p++) { const k = tIdx(L, x + o, y + p); if (!L.cells[k]) L.cells[k] = 1; }
}
function findDoors(L) {
  for (const rm of L.rooms) rm.doors = [];
  for (let j = 1; j < L.h - 1; j++) for (let i = 1; i < L.w - 1; i++) {
    const k = tIdx(L, i, j);
    if (!L.cells[k] || L.room[k] >= 0) continue;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = L.room[tIdx(L, i + di, j + dj)];
      if (r >= 0) L.rooms[r].doors.push({ i, j, di, dj });
    }
  }
}
function roomGraph(L, edges) {
  for (const rm of L.rooms) rm.links = [];
  for (const [a, b] of edges) { L.rooms[a].links.push(b); L.rooms[b].links.push(a); }
}
function roomDistances(L, from) {
  const d = L.rooms.map(() => Infinity); d[from] = 0; const q = [from];
  while (q.length) { const a = q.shift(); for (const b of L.rooms[a].links) if (d[b] === Infinity) { d[b] = d[a] + 1; q.push(b); } }
  return d;
}

// A normal floor: rooms in a 4x4 grid of slots joined by a random spanning tree plus a loop or two.
function genFloorLayout(areaId, seed, nRooms) {
  const A = AREAS[areaId], rng = RNG(seed), style = A.style;
  const SL = 15, GX = 4, GY = 4, L = newLevel(GX * SL + 4, GY * SL + 4, 'floor');
  L.area = areaId; L.style = style; L.seed = seed;
  const slot = new Int16Array(GX * GY).fill(-1), order = [], edges = [];
  const s0 = rng.int(0, GX * GY - 1); slot[s0] = 0; order.push(s0);
  while (order.length < nRooms) {
    const from = rng.pick(order), fx = from % GX, fy = Math.floor(from / GX);
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [fx + dx, fy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < GX && y < GY && slot[y * GX + x] < 0);
    if (!opts.length) continue;
    const [nx, ny] = rng.pick(opts), s = ny * GX + nx;
    slot[s] = order.length; order.push(s); edges.push([slot[from], slot[s]]);
  }
  // extra loops between adjacent slots
  for (let k = 0; k < 2; k++) {
    const a = rng.pick(order), ax = a % GX, ay = Math.floor(a / GX);
    for (const [dx, dy] of rng.shuffle([[1, 0], [0, 1], [-1, 0], [0, -1]])) {
      const bx = ax + dx, by = ay + dy; if (bx < 0 || by < 0 || bx >= GX || by >= GY) continue;
      const b = by * GX + bx; if (slot[b] < 0) continue;
      const e = [slot[a], slot[b]]; if (!edges.some(([p, q]) => (p === e[0] && q === e[1]) || (p === e[1] && q === e[0]))) { edges.push(e); break; }
    }
  }
  order.forEach((s, id) => {
    const sx = (s % GX) * SL + 2, sy = Math.floor(s / GX) * SL + 2;
    const w = rng.int(7, 12), h = rng.int(7, 12);
    const x0 = sx + 2 + rng.int(0, SL - 4 - w), y0 = sy + 2 + rng.int(0, SL - 4 - h);
    const rm = { id, x0, y0, x1: x0 + w - 1, y1: y0 + h - 1, notch: style === 'grid' && rng() < 0.4 ? rng.int(1, 2) : 0 };
    rm.ci = Math.floor((rm.x0 + rm.x1) / 2); rm.cj = Math.floor((rm.y0 + rm.y1) / 2);
    L.rooms.push(rm);
    carveRoom(L, rm, style, rng);
  });
  for (const [a, b] of edges) carveCorridor(L, L.rooms[a], L.rooms[b], style === 'organic' ? rng.int(2, 3) : 2, style, rng);
  roomGraph(L, edges);
  findDoors(L);
  return { L, rng };
}

// Boss floor: an antechamber, a corridor, and a big round arena.
function genBossLayout(areaId, seed) {
  const A = AREAS[areaId], rng = RNG(seed), L = newLevel(52, 40, 'boss');
  L.area = areaId; L.style = A.style; L.seed = seed;
  const a = { id: 0, x0: 3, y0: 15, x1: 11, y1: 23 }, b = { id: 1, x0: 22, y0: 5, x1: 49, y1: 33 };
  for (const rm of [a, b]) { rm.ci = Math.floor((rm.x0 + rm.x1) / 2); rm.cj = Math.floor((rm.y0 + rm.y1) / 2); L.rooms.push(rm); }
  carveRoom(L, a, 'grid', rng);
  // arena: a circle
  const cx = (b.x0 + b.x1 + 1) / 2, cy = (b.y0 + b.y1 + 1) / 2, rr = 13.6;
  let n = 0;
  for (let j = b.y0; j <= b.y1; j++) for (let i = b.x0; i <= b.x1; i++) { const dx = i + 0.5 - cx, dy = j + 0.5 - cy; if (dx * dx + dy * dy <= rr * rr) { const k = tIdx(L, i, j); L.cells[k] = 1; L.room[k] = 1; n++; } }
  b.tiles = n;
  carveCorridor(L, a, { ci: b.ci, cj: a.cj }, 3, 'grid', rng);
  roomGraph(L, [[0, 1]]);
  findDoors(L);
  a.type = 'start'; b.type = 'boss';
  L.start = { x: tileCenter(a.ci), z: tileCenter(a.cj) };
  return { L, rng };
}

// ---------- population ----------
// Decide what each room holds. Monsters themselves are spawned by the game when the floor loads.
function planFloor(L, rng, opts) {
  const start = L.rooms[0];
  start.type = 'start';
  const d = roomDistances(L, 0);
  let exit = 0; d.forEach((v, i) => { if (v > d[exit]) exit = i; });
  L.rooms[exit].type = 'exit';
  for (const rm of L.rooms) {
    if (rm.type) continue;
    const x = rng();
    rm.type = x < 0.46 ? 'lock' : x < 0.86 ? 'pack' : 'treasure';
  }
  // the exit room is guarded by a final locked fight
  L.rooms[exit].guard = true;
  const others = L.rooms.filter((r) => r.type !== 'start' && r.type !== 'exit');
  if (opts.capsule !== undefined && others.length) rng.pick(others).capsule = opts.capsule;
  if (opts.questObject && others.length) rng.pick(others.filter((r) => !r.capsule).length ? others.filter((r) => !r.capsule) : others).quest = opts.questObject;
  L.start = { x: tileCenter(start.ci), z: tileCenter(start.cj) };
  L.exitRoom = L.rooms[exit];
}
function randomRoomPoint(L, rm, rng, margin = 1.2) {
  for (let k = 0; k < 60; k++) {
    const i = rng.int(rm.x0, rm.x1), j = rng.int(rm.y0, rm.y1);
    if (L.room[tIdx(L, i, j)] !== rm.id) continue;
    const x = (i + rng.range(0.2, 0.8)) * T, z = (j + rng.range(0.2, 0.8)) * T;
    if (clearance(L, x, z) < margin) continue;
    if (L.colliders.some((c) => dist2(c.x, c.z, x, z) < (c.r + 0.8) ** 2)) continue;
    return { x, z };
  }
  return { x: tileCenter(rm.ci), z: tileCenter(rm.cj) };
}
function clearance(L, x, z) {
  let best = 9;
  const i0 = tileOf(x), j0 = tileOf(z);
  for (let j = j0 - 2; j <= j0 + 2; j++) for (let i = i0 - 2; i <= i0 + 2; i++) {
    if (!solidTile(L, i, j)) continue;
    const nx = clamp(x, i * T, i * T + T), nz = clamp(z, j * T, j * T + T);
    best = Math.min(best, Math.hypot(x - nx, z - nz));
  }
  return best;
}

// ---------- meshes ----------
function buildLevelMeshes(L, pal) {
  const grp = new THREE.Group(); L.group = grp;
  const rng = RNG(L.seed + ':mesh');
  const floorCount = L.cells.reduce((a, c) => a + (c ? 1 : 0), 0);
  // floor tiles
  const fgeo = new THREE.BoxGeometry(T, 0.4, T);
  const fmesh = new THREE.InstancedMesh(fgeo, mat(0xffffff), floorCount);
  fmesh.receiveShadow = true;
  const col = new THREE.Color();
  let n = 0;
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (!L.cells[tIdx(L, i, j)]) continue;
    _m4.makeTranslation(tileCenter(i), -0.2, tileCenter(j));
    fmesh.setMatrixAt(n, _m4);
    const base = pal.floor[(hash2(i, j, 7) * pal.floor.length) | 0];
    col.setHex(base).multiplyScalar(0.92 + hash2(i, j, 3) * 0.16);
    if (L.style === 'grid' && (i + j) % 2) col.multiplyScalar(0.93);
    fmesh.setColorAt(n, col);
    n++;
  }
  fmesh.instanceMatrix.needsUpdate = true; if (fmesh.instanceColor) fmesh.instanceColor.needsUpdate = true;
  grp.add(fmesh);
  // ground below everything, so gaps read as earth/void
  const ground = mesh(GM.plane(), mat(L.style === 'organic' ? pal.wall : 0x050608), L.w * T / 2, -0.45, L.h * T / 2, L.w * T * 1.5, L.h * T * 1.5, 1);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; grp.add(ground);
  // wall tiles: solid tiles touching a floor tile
  const wallTiles = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.cells[tIdx(L, i, j)]) continue;
    let near = false;
    for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) if (cellAt(L, i + di, j + dj)) { near = true; break; }
    if (near) wallTiles.push([i, j]);
  }
  L.wallAt = new Int32Array(L.w * L.h).fill(-1);
  const style = L.kind === 'hub' ? 'hub' : L.area === 'forest' ? 'forest' : L.style;
  const parts = []; // { geo, mat, list: [ [pos, quat, scale, wallIndex, shrink] ] }
  const addPart = (key, g, m) => { let p = parts.find((q) => q.key === key); if (!p) { p = { key, g, m, list: [] }; parts.push(p); } return p; };
  const wallH = style === 'hub' ? 3.2 : 2.8;
  for (const [i, j] of wallTiles) {
    const x = tileCenter(i), z = tileCenter(j), w = { x, z, i, j, cur: 1, tgt: 1, parts: [] };
    const wi = L.walls.length; L.walls.push(w); L.wallAt[tIdx(L, i, j)] = wi;
    const put = (p, px, py, pz, sx, sy, sz, ry = 0, shrink = false) => { const e = [new V3(px, py, pz), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(sx, sy, sz), wi, shrink]; p.list.push(e); w.parts.push([p, p.list.length - 1]); };
    const h = hash2(i, j, 11);
    if (style === 'grid' || style === 'hub') {
      const p = addPart('wall', GM.box(), mat(0xffffff));
      put(p, x, wallH / 2, z, T, wallH, T);
      p.colors = p.colors || []; p.colors.push(new THREE.Color(pal.wall).multiplyScalar(0.85 + h * 0.3));
      // a dark cap with a thin light strip, so wall tops don't read as glowing slabs
      const cap = addPart('cap', GM.box(), mat(style === 'hub' ? 0x6a7484 : 0x16181e));
      put(cap, x, wallH + 0.03, z, T * 1.01, 0.06, T * 1.01);
      if ((i + j) % 2 === 0) { const t = addPart('trim', GM.box(), mat(pal.glow, { e: pal.glow, ei: 0.8 })); put(t, x, wallH + 0.07, z, T * 0.18, 0.04, T * 0.18); }
      if (L.area === 'ruins' && h < 0.18) { const c = addPart('pillar', GM.cyl6(), mat(pal.wall2, { flat: true })); put(c, x, wallH / 2 + 0.3, z, 1.3, wallH + 0.8, 1.3); }
      if (L.area === 'mines' && h < 0.15) { const c = addPart('pipe', GM.cyl(), mat(0x6a7480)); put(c, x, wallH * 0.6, z, 0.5, wallH * 1.2, 0.5); }
    } else {
      const p = addPart('rock', GM.dodec(), mat(0xffffff, { flat: true }));
      const hh = lerp(1.6, 3.0, h);
      put(p, x, hh * 0.45, z, T * 1.45, hh, T * 1.45, h * 6);
      p.colors = p.colors || []; p.colors.push(new THREE.Color(h < 0.5 ? pal.wall : pal.wall2).multiplyScalar(0.8 + h * 0.4));
      if (style === 'forest' && hash2(i, j, 5) < 0.55) {
        const tr = addPart('trunk', GM.cyl6(), mat(0x4a3424, { flat: true }));
        const th = 2.2 + hash2(i, j, 9) * 1.6;
        put(tr, x, th / 2, z, 0.45, th, 0.45);
        const cn = addPart('canopy', GM.cone(), mat(0xffffff, { flat: true }));
        put(cn, x, th + 0.5, z, 2.8, 2.2, 2.8, h * 4, true); cn.colors = cn.colors || []; cn.colors.push(new THREE.Color([0x2f5a2a, 0x3a6a30, 0x2a4e2e, 0x4a5a26][(h * 4) | 0]));
        put(cn, x, th + 1.5, z, 1.9, 1.7, 1.9, h * 4, true); cn.colors.push(new THREE.Color([0x3a6a30, 0x2f5a2a, 0x4a6a2a, 0x2a4e2e][(h * 4) | 0]));
      } else if (L.area === 'caves' && hash2(i, j, 5) < 0.3) {
        const st = addPart('stal', GM.cone(), mat(pal.wall2, { flat: true }));
        put(st, x, 2.6, z, 1.2, 3.4, 1.2);
      }
    }
  }
  for (const p of parts) {
    const im = new THREE.InstancedMesh(p.g, p.m, p.list.length);
    im.castShadow = true; im.receiveShadow = true; im.userData.keepGeo = true;
    p.list.forEach((e, k) => { _m4.compose(e[0], e[1], e[2]); im.setMatrixAt(k, _m4); if (p.colors) im.setColorAt(k, p.colors[k]); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    p.im = im; grp.add(im);
  }
  L.wallParts = parts;
  // ceiling-light glow strips along grid corridors are implied by wall trim; decorate rooms with props
  decorateRooms(L, pal, rng, grp);
  R.root.add(grp);
  return grp;
}

const PROP_SETS = {
  forest: { deco: ['bush', 'flower', 'mushroom', 'rock', 'flower'], block: ['tree', 'rock'] },
  caves: { deco: ['lavarock', 'crystal', 'rock', 'bones'], block: ['stalagmite', 'lavarock'] },
  mines: { deco: ['barrel', 'console', 'lamp', 'pipe'], block: ['barrel', 'console'] },
  ruins: { deco: ['candles', 'bones', 'brokencolumn', 'candles'], block: ['column', 'statue'] },
};
function decorateRooms(L, pal, rng, grp) {
  if (L.kind === 'hub') return;
  const set = PROP_SETS[L.area];
  for (const rm of L.rooms) {
    const big = rm.tiles > 50;
    // a few blocking features in larger rooms
    if (rm.type !== 'boss' && big) {
      const nb = rng.int(0, 2);
      for (let k = 0; k < nb; k++) {
        const p = randomRoomPoint(L, rm, rng, 3.2);
        if (dist2(p.x, p.z, tileCenter(rm.ci), tileCenter(rm.cj)) < 9) continue;
        const kind = rng.pick(set.block), o = PROPS[kind](pal, rng);
        o.position.set(p.x, 0, p.z); o.rotation.y = rng() * TAU; grp.add(o);
        L.colliders.push({ x: p.x, z: p.z, r: kind === 'tree' || kind === 'column' || kind === 'statue' ? 0.6 : 0.75 });
      }
    }
    // small decorations near the edges
    const nd = Math.round(rm.tiles / (rm.type === 'boss' ? 30 : 14));
    for (let k = 0; k < nd; k++) {
      const p = randomRoomPoint(L, rm, rng, 0.6);
      if (clearance(L, p.x, p.z) > 2.6 && rng() < 0.7) continue;
      const kind = rng.pick(set.deco), o = PROPS[kind](pal, rng);
      o.position.set(p.x, 0, p.z); o.rotation.y = rng() * TAU; o.scale.setScalar(rng.range(0.8, 1.15));
      o.traverse((c) => { c.castShadow = false; });
      grp.add(o);
    }
  }
}

// Hide walls between the camera and the player (cutaway view)
function updateCutaway(L, px, pz, dt) {
  if (!L || !L.wallParts) return;
  const cx = Math.sin(CAM.yaw), cz = Math.cos(CAM.yaw);
  const i0 = tileOf(px), j0 = tileOf(pz), R_ = 10;
  const touched = L._cut || (L._cut = new Set());
  for (let j = j0 - R_; j <= j0 + R_; j++) for (let i = i0 - R_; i <= i0 + R_; i++) {
    if (i < 0 || j < 0 || i >= L.w || j >= L.h) continue;
    const wi = L.wallAt[tIdx(L, i, j)]; if (wi < 0) continue;
    const w = L.walls[wi], dx = w.x - px, dz = w.z - pz;
    const along = dx * cx + dz * cz, lat = Math.abs(dx * cz - dz * cx);
    w.tgt = along > -1.5 && along < 18 && lat < 3.4 + along * 0.42 ? 0.1 : 1;
    if (w.tgt < 1 || w.cur < 1) touched.add(wi);
  }
  const k = 1 - Math.exp(-dt * 8), dirty = new Set();
  for (const wi of touched) {
    const w = L.walls[wi];
    const dx = w.x - px, dz = w.z - pz;
    if (Math.abs(dx) > R_ * T || Math.abs(dz) > R_ * T) w.tgt = 1;
    w.cur = lerp(w.cur, w.tgt, k);
    if (Math.abs(w.cur - w.tgt) < 0.01) w.cur = w.tgt;
    for (const [p, idx] of w.parts) {
      const e = p.list[idx];
      _v1.copy(e[0]); _v1.y *= w.cur; _v2.copy(e[2]); _v2.y *= w.cur; if (e[4]) { _v2.x *= w.cur; _v2.z *= w.cur; }
      _m4.compose(_v1, e[1], _v2); p.im.setMatrixAt(idx, _m4); dirty.add(p);
    }
    if (w.cur === 1 && w.tgt === 1) touched.delete(wi);
  }
  for (const p of dirty) p.im.instanceMatrix.needsUpdate = true;
}

// ---------- collision ----------
function moveCircle(o, dx, dz, r, L = LV) {
  const len = Math.hypot(dx, dz), steps = Math.max(1, Math.ceil(len / (r * 0.8)));
  for (let s = 0; s < steps; s++) {
    o.x += dx / steps; o.z += dz / steps;
    pushOut(o, r, L);
  }
}
function pushOut(o, r, L = LV) {
  for (let it = 0; it < 2; it++) {
    const i0 = tileOf(o.x - r), i1 = tileOf(o.x + r), j0 = tileOf(o.z - r), j1 = tileOf(o.z + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (!solidTile(L, i, j)) continue;
      const nx = clamp(o.x, i * T, i * T + T), nz = clamp(o.z, j * T, j * T + T);
      let ddx = o.x - nx, ddz = o.z - nz, d2 = ddx * ddx + ddz * ddz;
      if (d2 >= r * r) continue;
      if (d2 < 1e-8) { // centre inside the tile: push toward the nearest open neighbour
        const cx = i * T + T / 2, cz = j * T + T / 2; ddx = o.x - cx || 0.01; ddz = o.z - cz; d2 = ddx * ddx + ddz * ddz;
        const d = Math.sqrt(d2); o.x = cx + ddx / d * (T / 2 + r); o.z = cz + ddz / d * (T / 2 + r); continue;
      }
      const d = Math.sqrt(d2), push = r - d;
      o.x += ddx / d * push; o.z += ddz / d * push;
    }
    for (const c of L.colliders) {
      const ddx = o.x - c.x, ddz = o.z - c.z, rr = r + c.r, d2 = ddx * ddx + ddz * ddz;
      if (d2 >= rr * rr || d2 < 1e-8) continue;
      const d = Math.sqrt(d2); o.x = c.x + ddx / d * rr; o.z = c.z + ddz / d * rr;
    }
  }
}
// line of sight across tiles (fences block too)
function los(ax, az, bx, bz, L = LV) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.5);
  for (let k = 1; k < n; k++) { const t = k / n; if (solidAt(lerp(ax, bx, t), lerp(az, bz, t), L)) return false; }
  return true;
}
// Distance along open tiles from a target tile (a flow field). Fields are cached per target tile, so monsters
// chasing different party members don't keep recomputing each other's field.
function updateFlow(L, x, z, cap = 60) {
  const ti = clamp(tileOf(x), 0, L.w - 1), tj = clamp(tileOf(z), 0, L.h - 1), src = tIdx(L, ti, tj);
  const cache = L.flows || (L.flows = new Map());
  let e = cache.get(src);
  if (e && e.ver === L.flowVer && e.cap >= cap) { e.used = GAME.time; return e.f; }
  if (!e && cache.size >= 8) { let old = null; for (const [k, v] of cache) if (!old || v.used < old[1].used) old = [k, v]; cache.delete(old[0]); }
  const f = e ? e.f : new Uint16Array(L.w * L.h);
  f.fill(65535);
  const q = L._flowQ || (L._flowQ = new Int32Array(L.w * L.h)); let h = 0, t = 0;
  f[src] = 0; q[t++] = src;
  while (h < t) {
    const k = q[h++], i = k % L.w, j = (k / L.w) | 0, d = f[k];
    if (d > cap) continue;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj; if (solidTile(L, ni, nj)) continue;
      const nk = nj * L.w + ni; if (f[nk] !== 65535) continue;
      f[nk] = d + 1; q[t++] = nk;
    }
  }
  cache.set(src, { f, ver: L.flowVer, cap, used: GAME.time });
  return f;
}
// best direction to step along a flow field from (x,z); null if unreachable
function flowDir(L, f, x, z) {
  if (!f) return null;
  const i = tileOf(x), j = tileOf(z); if (i < 0 || j < 0 || i >= L.w || j >= L.h) return null;
  const here = f[tIdx(L, i, j)];
  let best = here, bx = 0, bz = 0;
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const ni = i + di, nj = j + dj; if (solidTile(L, ni, nj)) continue;
    if (di && dj && (solidTile(L, i + di, j) || solidTile(L, i, j + dj))) continue;
    const v = f[tIdx(L, ni, nj)] + (di && dj ? 0.4 : 0);
    if (v < best) { best = v; bx = tileCenter(ni) - x; bz = tileCenter(nj) - z; }
  }
  if (best === here || best >= 65535) return null;
  const l = Math.hypot(bx, bz) || 1; return { x: bx / l, z: bz / l, d: here };
}
function markSeen(L, x, z, r = 9) {
  const i0 = tileOf(x), j0 = tileOf(z), rt = Math.ceil(r / T);
  for (let j = j0 - rt; j <= j0 + rt; j++) for (let i = i0 - rt; i <= i0 + rt; i++) {
    if (i < 0 || j < 0 || i >= L.w || j >= L.h) continue;
    if ((i - i0) ** 2 + (j - j0) ** 2 <= rt * rt) L.seen[tIdx(L, i, j)] = 1;
  }
  const rm = roomAt(x, z, L); if (rm && !rm.seenAll) { rm.seenAll = true; for (let j = rm.y0 - 1; j <= rm.y1 + 1; j++) for (let i = rm.x0 - 1; i <= rm.x1 + 1; i++) if (i >= 0 && j >= 0 && i < L.w && j < L.h) L.seen[tIdx(L, i, j)] = 1; }
}

// ---------- fences ----------
function buildFences(L, rm, color) {
  rm.fenceObjs = [];
  for (const d of rm.doors) {
    const f = makeFence(color);
    // fence sits on the edge between the door tile and the room tile
    const x = tileCenter(d.i) + d.di * T / 2, z = tileCenter(d.j) + d.dj * T / 2;
    f.position.set(x, 0, z); f.rotation.y = d.di ? Math.PI / 2 : 0;
    f.visible = false; L.group.add(f); rm.fenceObjs.push(f);
  }
}
function setFences(L, rm, on) {
  rm.locked = on;
  for (const d of rm.doors) L.block[tIdx(L, d.i, d.j)] = on ? 1 : 0;
  // a door tile shared with another locked room stays blocked
  if (!on) for (const o of L.rooms) if (o !== rm && o.locked) for (const d of o.doors) L.block[tIdx(L, d.i, d.j)] = 1;
  if (rm.fenceObjs) rm.fenceObjs.forEach((f) => { f.visible = on; });
  L.flowVer++;
}
