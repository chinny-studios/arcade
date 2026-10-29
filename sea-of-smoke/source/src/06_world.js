// ---- 06_world: island heightmap, terrain mesh, palms, forts, navigation grid ----
// World.h(x, z) is the terrain height (sea floor below zero). World.path(draft, ...) runs A* on a 25 m grid
// whose cells are marked passable per draft, so reefs stop deep-keeled ships but not sloops.
const World = { S: 2600, N: 257, hm: null, objs: [], navs: {} };

// Merge several geometries into one non-indexed BufferGeometry with vertex colours.
// parts: [{ geo, color: [r,g,b], m: Matrix4 }]
function mergeParts(parts) {
  let n = 0; const gs = parts.map((p) => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; if (p.m) g.applyMatrix4(p.m); n += g.attributes.position.count; return g; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  gs.forEach((g, i) => {
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = parts[i].color, cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    const vc = g.attributes.color;
    for (let k = 0; k < cnt; k++) {
      const s = parts[i].jitter ? 1 + (rand() - 0.5) * parts[i].jitter : 1;
      col[(o + k) * 3] = (vc ? vc.getX(k) : c[0]) * s; col[(o + k) * 3 + 1] = (vc ? vc.getY(k) : c[1]) * s; col[(o + k) * 3 + 2] = (vc ? vc.getZ(k) : c[2]) * s;
    }
    o += cnt;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
const M4 = (x, y, z, ry, sx, sy, sz, rx, rz) => new THREE.Matrix4().compose(new THREE.Vector3(x || 0, y || 0, z || 0),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1));

World.h = function (x, z) {
  const N = World.N, c = World.S / (N - 1);
  const fx = clamp((x + World.S / 2) / c, 0, N - 1.001), fz = clamp((z + World.S / 2) / c, 0, N - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, hm = World.hm;
  const a = hm[j * N + i], b = hm[j * N + i + 1], d = hm[(j + 1) * N + i], e = hm[(j + 1) * N + i + 1];
  return lerp(lerp(a, b, u), lerp(d, e, u), v);
};

function islandHeight(isl, x, z, k) {
  const [cx, cz, rx, rz, peak, rot] = isl;
  const dx = x - cx, dz = z - cz, cr = Math.cos(-rot || 0), sr = Math.sin(-rot || 0);
  const lx = (dx * cr - dz * sr) / rx, lz = (dx * sr + dz * cr) / rz;
  let d = Math.hypot(lx, lz); if (d > 2.2) return -99;
  const a = Math.atan2(lz, lx);
  d /= 1 + 0.42 * (fbm(Math.cos(a) * 1.4 + k * 7.3, Math.sin(a) * 1.4 + k * 3.1, 3) - 0.5);
  d += (fbm(x * 0.02, z * 0.02, 3) - 0.5) * 0.18;
  const t = 1 - d;
  if (peak < 0) { // reef
    if (t < -0.5) return -99;
    if (t < 0) return lerp(-26, peak, smoothstep(-0.5, 0, t));
    const n = fbm(x * 0.03 + 50, z * 0.03, 3);
    return Math.min(peak + (n - 0.5) * 1.4, -0.5) + (n > 0.74 ? (n - 0.74) * 40 : 0);
  }
  if (t < -0.6) return -99;
  if (t < 0) return lerp(-26, -1.5, smoothstep(-0.6, 0, t));
  if (t < 0.1) return lerp(-1.5, 2.2, t / 0.1);
  return 2.2 + peak * Math.pow(smoothstep(0.1, 1, t), 1.25) * (0.7 + 0.6 * fbm(x * 0.008 + k, z * 0.008, 4));
}

World.build = function (map) {
  World.clear();
  World.S = map.size; noiseSeed = map.seed;
  const N = World.N, S = World.S, c = S / (N - 1), hm = World.hm = new Float32Array(N * N);
  const isl = map.islands.slice(); World.forts = [];
  for (const cap of map.caps) if (cap.fort) isl.push([cap.fort[0], cap.fort[1], 46, 40, 10, 0]);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -S / 2 + i * c, z = -S / 2 + j * c;
    let h = -28 + (fbm(x * 0.004, z * 0.004, 2) - 0.5) * 6;
    for (let k = 0; k < isl.length; k++) { const v = islandHeight(isl[k], x, z, k); if (v > h) h = v; }
    for (const cap of map.caps) if (cap.fort) { // flat plateau for the fort
      const d = Math.hypot(x - cap.fort[0], z - cap.fort[1]); if (d < 30) h = lerp(8, h, smoothstep(18, 30, d));
    }
    hm[j * N + i] = h;
  }
  // Depth texture for the water shader (height encoded in 0..255 over -40..40 m)
  const data = new Uint8Array(N * N * 4);
  for (let k = 0; k < N * N; k++) { data[k * 4] = clamp(Math.round((hm[k] + 40) / 80 * 255), 0, 255); data[k * 4 + 3] = 255; }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  R.water.material.uniforms.depth.value = tex; R.water.material.uniforms.mapSize.value = S;
  World.depthTex = tex;
  buildTerrainMesh(); buildPlants(); buildMinimap(map);
  for (const cap of map.caps) if (cap.fort) World.forts.push(buildFort(cap.fort[0], cap.fort[1]));
  World.navs = {};
  World.map = map;
};
World.clear = function () {
  for (const o of World.objs) { R.scene.remove(o); if (o.geometry) o.geometry.dispose(); }
  World.objs = [];
};
function addObj(o) { R.scene.add(o); World.objs.push(o); return o; }

function buildTerrainMesh() {
  const N = World.N, S = World.S, c = S / (N - 1), hm = World.hm;
  const pos = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i; pos[k * 3] = -S / 2 + i * c; pos[k * 3 + 1] = hm[k]; pos[k * 3 + 2] = -S / 2 + j * c;
  }
  const idx = [];
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = j * N + i, b = a + 1, d = a + N, e = d + 1;
    if (Math.max(hm[a], hm[b], hm[d], hm[e]) < -3) continue;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const nor = g.attributes.normal.array;
  for (let k = 0; k < N * N; k++) {
    const h = hm[k], ny = nor[k * 3 + 1], x = pos[k * 3], z = pos[k * 3 + 2], n = fbm(x * 0.03, z * 0.03, 2);
    let r, gg, b;
    if (h < 0.3) { r = 0.62; gg = 0.56; b = 0.4; }
    else if (h < 2.6) { r = 0.88; gg = 0.8; b = 0.6; }
    else { const t = smoothstep(2.6, 5, h); r = lerp(0.88, 0.2 + n * 0.12, t); gg = lerp(0.8, 0.38 + n * 0.14, t); b = lerp(0.6, 0.13, t); }
    const rock = smoothstep(0.82, 0.62, ny) * (h > 2 ? 1 : 0) + smoothstep(55, 90, h) * 0.6;
    if (rock > 0) { const rr = clamp(rock, 0, 1); r = lerp(r, 0.46 + n * 0.1, rr); gg = lerp(gg, 0.42 + n * 0.08, rr); b = lerp(b, 0.36, rr); }
    col[k * 3] = r; col[k * 3 + 1] = gg; col[k * 3 + 2] = b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = addObj(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
  World.terrain = m;
}

function buildPlants() {
  const N = World.N, S = World.S, c = S / (N - 1), hm = World.hm, palms = [], trees = [];
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const h = hm[j * N + i]; if (h < 2.4 || h > 70) continue;
    const slope = Math.abs(hm[j * N + i + 1] - hm[j * N + i - 1]) + Math.abs(hm[(j + 1) * N + i] - hm[(j - 1) * N + i]);
    if (slope > 14) continue;
    const x = -S / 2 + i * c, z = -S / 2 + j * c, n = fbm(x * 0.02 + 9, z * 0.02, 2);
    for (let q = 0; q < 2; q++) {
      const px = x + rnd(-c / 2, c / 2), pz = z + rnd(-c / 2, c / 2);
      if (h < 9 && rand() < 0.35) palms.push([px, World.h(px, pz), pz]);
      else if (h >= 6 && rand() < 0.2 + n * 0.7) trees.push([px, World.h(px, pz), pz]);
    }
  }
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true });
  const trunk = mergeParts([
    { geo: new THREE.CylinderGeometry(0.22, 0.38, 9, 5), color: [0.45, 0.35, 0.22], m: M4(0, 4.5, 0, 0, 1, 1, 1, 0.12) },
    { geo: new THREE.ConeGeometry(4.2, 2.2, 7), color: [0.2, 0.42, 0.12], m: M4(0.5, 8.6, 0, 0, 1, 1, 1, Math.PI) },
    { geo: new THREE.ConeGeometry(2.6, 1.6, 6), color: [0.25, 0.5, 0.15], m: M4(0.5, 9.4, 0, 0.5, 1, 1, 1, 0) },
  ]);
  const canopy = mergeParts([
    { geo: new THREE.CylinderGeometry(0.4, 0.6, 5, 5), color: [0.35, 0.27, 0.18], m: M4(0, 2.5, 0) },
    { geo: new THREE.IcosahedronGeometry(4, 0), color: [0.16, 0.33, 0.12], m: M4(0, 7, 0, 0, 1, 0.8, 1) },
    { geo: new THREE.IcosahedronGeometry(3, 0), color: [0.2, 0.38, 0.14], m: M4(1.8, 8.5, 1, 0.7, 1, 0.8, 1) },
  ]);
  const place = (geo, list, smin, smax) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, lam, list.length), m = new THREE.Matrix4();
    list.forEach((p, i) => { const s = rnd(smin, smax); m.copy(M4(p[0], p[1] - 0.3, p[2], rnd(0, TAU), s, s * rnd(0.85, 1.2), s)); im.setMatrixAt(i, m); });
    addObj(im);
  };
  World.plants = [palms.length, trees.length];
  place(trunk, shuffle(palms).slice(0, 1800), 0.8, 1.3); place(canopy, shuffle(trees).slice(0, 2600), 0.8, 1.6);
}

// Forts: a square stone work with bastions, a tower, guns and a flag that shows the owner.
function buildFort(x, z) {
  const y = World.h(x, z), st = [0.72, 0.68, 0.6], dk = [0.55, 0.52, 0.46], parts = [];
  parts.push({ geo: new THREE.BoxGeometry(34, 6, 34), color: st, m: M4(0, 3, 0), jitter: 0.06 });
  for (const [bx, bz] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) parts.push({ geo: new THREE.BoxGeometry(9, 7.5, 9), color: dk, m: M4(bx, 3.75, bz, Math.PI / 4) });
  parts.push({ geo: new THREE.CylinderGeometry(4.5, 5.5, 14, 8), color: st, m: M4(0, 7, 0) });
  parts.push({ geo: new THREE.CylinderGeometry(5.2, 5.2, 1.2, 8), color: dk, m: M4(0, 14.4, 0) });
  for (let i = 0; i < 16; i++) {
    const s = i % 4, t = (Math.floor(i / 4) - 1.5) * 7, ang = s * Math.PI / 2;
    const px = Math.sin(ang) * 17 + Math.cos(ang) * t, pz = Math.cos(ang) * 17 - Math.sin(ang) * t;
    parts.push({ geo: new THREE.BoxGeometry(2.4, 1.4, 1.4), color: st, m: M4(px, 6.7, pz, ang) });
  }
  const guns = [];
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2 + Math.PI / 4, gx = Math.sin(ang) * 23, gz = Math.cos(ang) * 23;
    parts.push({ geo: new THREE.CylinderGeometry(0.35, 0.5, 4, 6), color: [0.12, 0.12, 0.13], m: M4(gx, 7.4, gz, ang, 1, 1, 1, Math.PI / 2) });
    guns.push([x + gx, y + 7.4, z + gz]);
  }
  parts.push({ geo: new THREE.CylinderGeometry(0.15, 0.2, 10, 4), color: [0.3, 0.25, 0.2], m: M4(0, 20, 0) });
  const mesh = addObj(new THREE.Mesh(mergeParts(parts), new THREE.MeshLambertMaterial({ vertexColors: true })));
  mesh.position.set(x, y - 0.5, z);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshLambertMaterial({ map: flagTex(-1), side: THREE.DoubleSide }));
  flag.position.set(x + 3, y + 22.5, z); addObj(flag);
  return { x, z, y, mesh, flag, guns, owner: -1 };
}

// Minimap background: land and shallows painted once per map.
function buildMinimap(map) {
  const N = World.N, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const h = World.hm[j * N + i], k = ((N - 1 - j) * N + (N - 1 - i)) * 4; // north (+z) up, east (-x) right
    let c;
    if (h > 2.4) c = [92 + h, 112 + h * 0.6, 70]; else if (h > 0) c = [214, 196, 150]; else if (h > -3) c = [70, 150, 150]; else if (h > -12) c = [38, 92, 112]; else c = [24, 58, 80];
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0); World.mapCanvas = cv;
}

// ---- Navigation ----
const NAV = 104;
function navGrid(draft) {
  const key = draft.toFixed(1); if (World.navs[key]) return World.navs[key];
  const S = World.S, cs = S / NAV, block = new Uint8Array(NAV * NAV), clear = new Uint8Array(NAV * NAV);
  for (let j = 0; j < NAV; j++) for (let i = 0; i < NAV; i++) {
    const x = -S / 2 + (i + 0.5) * cs, z = -S / 2 + (j + 0.5) * cs;
    let bad = Math.abs(x) > S / 2 - 70 || Math.abs(z) > S / 2 - 70;
    for (const [ox, oz] of [[0, 0], [-9, -9], [9, -9], [-9, 9], [9, 9]]) if (World.h(x + ox, z + oz) > -(draft + 0.8)) bad = true;
    block[j * NAV + i] = bad ? 1 : 0;
  }
  // Distance in cells to the nearest blocked cell (BFS), so big ships keep off the shore.
  const q = []; clear.fill(255);
  for (let k = 0; k < NAV * NAV; k++) if (block[k]) { clear[k] = 0; q.push(k); }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % NAV, j = (k / NAV) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NAV || b >= NAV) continue;
      const kk = b * NAV + a; if (clear[kk] > clear[k] + 1) { clear[kk] = clear[k] + 1; q.push(kk); }
    }
  }
  const need = draft >= 4 ? 2 : 1, ok = new Uint8Array(NAV * NAV);
  for (let k = 0; k < NAV * NAV; k++) ok[k] = clear[k] >= need ? 1 : 0;
  const g = { ok, cs, clear, draft };
  World.navs[key] = g; return g;
}
const navCell = (g, x, z) => [clamp(Math.floor((x + World.S / 2) / g.cs), 0, NAV - 1), clamp(Math.floor((z + World.S / 2) / g.cs), 0, NAV - 1)];
const navPos = (g, i, j) => [-World.S / 2 + (i + 0.5) * g.cs, -World.S / 2 + (j + 0.5) * g.cs];
World.passable = (draft, x, z) => { const g = navGrid(draft), [i, j] = navCell(g, x, z); return !!g.ok[j * NAV + i]; };
World.lineClear = function (draft, ax, az, bx, bz) {
  const g = navGrid(draft), d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (g.cs * 0.5));
  for (let s = 0; s <= n; s++) { const t = s / Math.max(1, n), [i, j] = navCell(g, lerp(ax, bx, t), lerp(az, bz, t)); if (!g.ok[j * NAV + i]) return false; }
  return true;
};
function nearestOk(g, i, j) {
  if (g.ok[j * NAV + i]) return [i, j];
  for (let r = 1; r < 20; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < NAV && b < NAV && g.ok[b * NAV + a]) return [a, b];
  }
  return [i, j];
}
World.path = function (draft, ax, az, bx, bz) {
  const g = navGrid(draft);
  if (World.lineClear(draft, ax, az, bx, bz)) return [[bx, bz]];
  const [si, sj] = nearestOk(g, ...navCell(g, ax, az)), [ti, tj] = nearestOk(g, ...navCell(g, bx, bz));
  const start = sj * NAV + si, goal = tj * NAV + ti, n = NAV * NAV;
  const gs = new Float32Array(n).fill(1e9), from = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const hfn = (k) => { const dx = Math.abs(k % NAV - ti), dz = Math.abs(((k / NAV) | 0) - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  gs[start] = 0; push(start, hfn(start)); let found = false, iter = 0;
  while (heap.length && iter++ < 12000) {
    const [, k] = pop(); if (closed[k]) continue; closed[k] = 1; if (k === goal) { found = true; break; }
    const i = k % NAV, j = (k / NAV) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NAV || b >= NAV) continue;
      const kk = b * NAV + a; if (!g.ok[kk] || closed[kk]) continue;
      if (di && dj && (!g.ok[j * NAV + a] || !g.ok[b * NAV + i])) continue;
      const cost = gs[k] + (di && dj ? 1.414 : 1) + (g.clear[kk] < 3 ? 0.6 : 0);
      if (cost < gs[kk]) { gs[kk] = cost; from[kk] = k; push(kk, cost + hfn(kk)); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = goal; k !== -1; k = from[k]) cells.push(k); cells.reverse();
  const pts = cells.map((k) => navPos(g, k % NAV, (k / NAV) | 0)); pts[pts.length - 1] = [bx, bz];
  // String-pull: drop waypoints that can be skipped in a straight line.
  const out = []; let cur = [ax, az], i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1; while (j > i + 1 && !World.lineClear(draft, cur[0], cur[1], pts[j][0], pts[j][1])) j--;
    out.push(pts[j]); cur = pts[j]; i = j;
  }
  if (!out.length) out.push(pts[pts.length - 1]);
  return out;
};
