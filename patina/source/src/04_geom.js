// Geometry helpers. Masks live on vertices, so every paintable mesh must be dense and fairly even:
// lathes are resampled along their profile, flat shapes are subdivided until no edge is longer than a limit.

// Profile for a lathe: pts = [[r, y, fillet], ...] walked counter-clockwise in (r, y) so normals face out.
// Corners with a fillet are rounded with a quadratic curve, then the path is resampled every `step` metres.
function prof(pts, step) {
  const raw = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y, rad = 0] = pts[i];
    if (!rad || i === 0 || i === pts.length - 1) { raw.push([x, y]); continue; }
    const a = pts[i - 1], b = pts[i + 1];
    let ax = a[0] - x, ay = a[1] - y, bx = b[0] - x, by = b[1] - y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    ax /= la; ay /= la; bx /= lb; by /= lb;
    const r = Math.min(rad, la * 0.5, lb * 0.5);
    const p1 = [x + ax * r, y + ay * r], p2 = [x + bx * r, y + by * r];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, u = 1 - t;
      raw.push([u * u * p1[0] + 2 * u * t * x + t * t * p2[0], u * u * p1[1] + 2 * u * t * y + t * t * p2[1]]);
    }
  }
  const len = [0];
  for (let i = 1; i < raw.length; i++) len.push(len[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const L = len[len.length - 1], n = Math.max(2, Math.ceil(L / step));
  const out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = (k / n) * L;
    while (j < raw.length - 2 && len[j + 1] < s) j++;
    const t = len[j + 1] > len[j] ? (s - len[j]) / (len[j + 1] - len[j]) : 0;
    out.push(new THREE.Vector2(Math.max(0, lerp(raw[j][0], raw[j + 1][0], t)), lerp(raw[j][1], raw[j + 1][1], t)));
  }
  return out;
}
// lathe around +Y. The seam is welded so masks and normals match across it.
function lathe(pts, step, segs) {
  return weld(new THREE.LatheGeometry(prof(pts, step), segs));
}

// Weld vertices that share a position and (nearly) a normal; keeps hard edges hard.
function weld(geom, tol = 1e-6) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const P = g.attributes.position.array, Nn = g.attributes.normal ? g.attributes.normal.array : null;
  const n = P.length / 3, map = new Map(), idx = new Uint32Array(n);
  const pos = [], nor = [];
  const q = 1 / tol;
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    let key = Math.round(x * q) + ',' + Math.round(y * q) + ',' + Math.round(z * q);
    if (Nn) key += ',' + Math.round(Nn[i * 3] * 6) + ',' + Math.round(Nn[i * 3 + 1] * 6) + ',' + Math.round(Nn[i * 3 + 2] * 6);
    let k = map.get(key);
    if (k === undefined) {
      k = pos.length / 3; map.set(key, k); pos.push(x, y, z);
      if (Nn) nor.push(Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]); else nor.push(0, 0, 0);
    } else if (Nn) { nor[k * 3] += Nn[i * 3]; nor[k * 3 + 1] += Nn[i * 3 + 1]; nor[k * 3 + 2] += Nn[i * 3 + 2]; }
    idx[i] = k;
  }
  for (let k = 0; k < nor.length; k += 3) { const l = Math.hypot(nor[k], nor[k + 1], nor[k + 2]) || 1; nor[k] /= l; nor[k + 1] /= l; nor[k + 2] /= l; }
  // drop degenerate triangles (lathe poles)
  const tris = [];
  for (let i = 0; i < n; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; if (a !== b && b !== c && a !== c) tris.push(a, b, c); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(tris);
  if (!Nn) out.computeVertexNormals();
  return out;
}

// Split edges longer than maxEdge (recursively), so flat faces carry enough vertices for painting.
function tess(geom, maxEdge) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const P = g.attributes.position.array, Nn = g.attributes.normal.array;
  const pos = [], nor = [], m2 = maxEdge * maxEdge;
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const midn = (a, b) => { const v = [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  // bisect the longest edge until none is too long: every long edge is still split at its own midpoint (so
  // neighbours agree and nothing cracks), and slivers cost linear, not quadratic, triangles
  function emit(a, b, c, na, nb, nc, depth) {
    const ab = d2(a, b), bc = d2(b, c), ca = d2(c, a), mx = Math.max(ab, bc, ca);
    if (depth > 40 || mx <= m2) { pos.push(...a, ...b, ...c); nor.push(...na, ...nb, ...nc); return; }
    const D = depth + 1;
    if (mx === ab) { const m = mid(a, b), nm = midn(na, nb); emit(a, m, c, na, nm, nc, D); emit(m, b, c, nm, nb, nc, D); }
    else if (mx === bc) { const m = mid(b, c), nm = midn(nb, nc); emit(a, b, m, na, nb, nm, D); emit(a, m, c, na, nm, nc, D); }
    else { const m = mid(c, a), nm = midn(nc, na); emit(a, b, m, na, nb, nm, D); emit(m, b, c, nm, nb, nc, D); }
  }
  for (let i = 0; i < P.length; i += 9) {
    emit([P[i], P[i + 1], P[i + 2]], [P[i + 3], P[i + 4], P[i + 5]], [P[i + 6], P[i + 7], P[i + 8]],
      [Nn[i], Nn[i + 1], Nn[i + 2]], [Nn[i + 3], Nn[i + 4], Nn[i + 5]], [Nn[i + 6], Nn[i + 7], Nn[i + 8]], 0);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return weld(out);
}

// Box with rounded edges, built as a subdivided cube pushed out from an inner box: dense and even everywhere.
function roundBox(w, h, d, r, step) {
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  const pos = [], nor = [], idx = [];
  const faces = [[0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1]];
  const ext = [w, h, d];
  for (const [ax, u, v, s] of faces) {
    const nu = Math.max(4, Math.ceil(ext[u] / step)), nv = Math.max(4, Math.ceil(ext[v] / step));
    const base = pos.length / 3;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = [0, 0, 0];
      p[ax] = s * ext[ax] / 2;
      // bunch samples toward the edges so the rounded corners get their share
      const fu = i / nu, fv = j / nv;
      const eu = 0.5 - 0.5 * Math.cos(fu * Math.PI), ev = 0.5 - 0.5 * Math.cos(fv * Math.PI);
      p[u] = (lerp(fu, eu, 0.5) - 0.5) * ext[u]; p[v] = (lerp(fv, ev, 0.5) - 0.5) * ext[v];
      const c = [clamp(p[0], -hx, hx), clamp(p[1], -hy, hy), clamp(p[2], -hz, hz)];
      let nx = p[0] - c[0], ny = p[1] - c[1], nz = p[2] - c[2];
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      pos.push(c[0] + nx * r, c[1] + ny * r, c[2] + nz * r); nor.push(nx, ny, nz);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = base + j * (nu + 1) + i, b = a + 1, c2 = a + nu + 1, d2 = c2 + 1;
      if (s > 0) idx.push(a, b, d2, a, d2, c2); else idx.push(a, d2, b, a, c2, d2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  // fix winding per face so normals and triangles agree
  const out = weld(g, 1e-6);
  fixWinding(out);
  return out;
}
function fixWinding(g) {
  const P = g.attributes.position.array, Nn = g.attributes.normal.array, I = g.index.array;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    if (cx * (Nn[a] + Nn[b] + Nn[c]) + cy * (Nn[a + 1] + Nn[b + 1] + Nn[c + 1]) + cz * (Nn[a + 2] + Nn[b + 2] + Nn[c + 2]) < 0) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
  }
}

function merge(list) {
  const pos = [], nor = [], idx = [];
  for (const g0 of list) {
    const g = g0.index ? g0 : weld(g0);
    const base = pos.length / 3;
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    for (const i of g.index.array) idx.push(i + base);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

// ---- BVH over a mesh's triangles, in the mesh's local space
function buildBVH(geom) {
  const P = geom.attributes.position.array, I = geom.index.array, nt = I.length / 3;
  const cen = new Float32Array(nt * 3), bb = new Float32Array(nt * 6);
  for (let t = 0; t < nt; t++) {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    for (let k = 0; k < 3; k++) {
      const mn = Math.min(P[a + k], P[b + k], P[c + k]), mx = Math.max(P[a + k], P[b + k], P[c + k]);
      bb[t * 6 + k] = mn; bb[t * 6 + 3 + k] = mx; cen[t * 3 + k] = (mn + mx) / 2;
    }
  }
  const order = new Uint32Array(nt); for (let i = 0; i < nt; i++) order[i] = i;
  const nodes = []; // [minx,miny,minz,maxx,maxy,maxz, left|start, right|count, leaf]
  function build(s, e) {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = s; i < e; i++) { const t = order[i]; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], bb[t * 6 + k]); mx[k] = Math.max(mx[k], bb[t * 6 + 3 + k]); } }
    const id = nodes.length; nodes.push(null);
    if (e - s <= 8) { nodes[id] = [...mn, ...mx, s, e - s, 1]; return id; }
    const ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    const ax = ext[0] > ext[1] ? (ext[0] > ext[2] ? 0 : 2) : (ext[1] > ext[2] ? 1 : 2);
    const sub = Array.from(order.subarray(s, e)).sort((p, q) => cen[p * 3 + ax] - cen[q * 3 + ax]);
    order.set(sub, s);
    const m = (s + e) >> 1;
    const l = build(s, m), r = build(m, e);
    nodes[id] = [...mn, ...mx, l, r, 0];
    return id;
  }
  build(0, nt);
  return { nodes, order, P, I, N: geom.attributes.normal.array };
}
// ray in local space; returns { t, tri, u, v } or null
function rayBVH(bvh, o, d, tMax) {
  const { nodes, order, P, I } = bvh;
  const inv = [1 / d.x, 1 / d.y, 1 / d.z];
  let best = null, bt = tMax;
  const stack = [0];
  while (stack.length) {
    const n = nodes[stack.pop()];
    let t0 = 0, t1 = bt;
    const oo = [o.x, o.y, o.z];
    let miss = false;
    for (let k = 0; k < 3; k++) {
      let a = (n[k] - oo[k]) * inv[k], b = (n[3 + k] - oo[k]) * inv[k];
      if (a > b) { const t = a; a = b; b = t; }
      t0 = a > t0 ? a : t0; t1 = b < t1 ? b : t1;
      if (t0 > t1) { miss = true; break; }
    }
    if (miss) continue;
    if (n[8]) {
      for (let i = n[6]; i < n[6] + n[7]; i++) {
        const t = order[i], a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
        const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
        const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
        const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-14) continue;
        const id = 1 / det;
        const sx = o.x - P[a], sy = o.y - P[a + 1], sz = o.z - P[a + 2];
        const u = (sx * px + sy * py + sz * pz) * id; if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const v = (d.x * qx + d.y * qy + d.z * qz) * id; if (v < 0 || u + v > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * id;
        if (tt > 1e-7 && tt < bt) { bt = tt; best = { t: tt, tri: t, u, v }; }
      }
    } else { stack.push(n[6], n[7]); }
  }
  return best;
}

// ---- spatial grid over vertices, for brushing
function buildGrid(P, cell) {
  const n = P.length / 3, map = new Map(), inv = 1 / cell;
  for (let i = 0; i < n; i++) {
    const k = cellKey(Math.floor(P[i * 3] * inv), Math.floor(P[i * 3 + 1] * inv), Math.floor(P[i * 3 + 2] * inv));
    let a = map.get(k); if (!a) map.set(k, a = []); a.push(i);
  }
  return { map, cell, inv, P };
}
function cellKey(x, y, z) { return ((x + 4096) * 8192 + (y + 4096)) * 8192 + (z + 4096); }
function gridQuery(g, x, y, z, r, fn) {
  const r2 = r * r, P = g.P;
  const x0 = Math.floor((x - r) * g.inv), x1 = Math.floor((x + r) * g.inv);
  const y0 = Math.floor((y - r) * g.inv), y1 = Math.floor((y + r) * g.inv);
  const z0 = Math.floor((z - r) * g.inv), z1 = Math.floor((z + r) * g.inv);
  for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) for (let c = z0; c <= z1; c++) {
    const list = g.map.get(cellKey(a, b, c)); if (!list) continue;
    for (const i of list) {
      const dx = P[i * 3] - x, dy = P[i * 3 + 1] - y, dz = P[i * 3 + 2] - z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < r2) fn(i, d2 / r2);
    }
  }
}

// Smooth normals across edges flatter than `angle` degrees, keep sharper ones hard (for extrusions, which three
// gives flat per-face normals). Returns non-indexed geometry, ready for tess().
function creaseNormals(geom, angle = 35) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const P = g.attributes.position.array, nt = P.length / 9;
  const fn = new Float32Array(nt * 3), fu = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    const o = t * 9;
    const ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2];
    const vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, l = Math.hypot(cx, cy, cz) || 1e-12;
    fn[t * 3] = cx; fn[t * 3 + 1] = cy; fn[t * 3 + 2] = cz;
    fu[t * 3] = cx / l; fu[t * 3 + 1] = cy / l; fu[t * 3 + 2] = cz / l;
  }
  const groups = new Map(), q = 1e6;
  for (let c = 0; c < nt * 3; c++) {
    const k = Math.round(P[c * 3] * q) + ',' + Math.round(P[c * 3 + 1] * q) + ',' + Math.round(P[c * 3 + 2] * q);
    let a = groups.get(k); if (!a) groups.set(k, a = []); a.push(c);
  }
  const cos = Math.cos((angle * Math.PI) / 180), N = new Float32Array(nt * 9);
  for (const list of groups.values()) {
    for (const c of list) {
      const t = (c / 3) | 0;
      let x = 0, y = 0, z = 0;
      for (const c2 of list) {
        const t2 = (c2 / 3) | 0;
        if (fu[t * 3] * fu[t2 * 3] + fu[t * 3 + 1] * fu[t2 * 3 + 1] + fu[t * 3 + 2] * fu[t2 * 3 + 2] >= cos) { x += fn[t2 * 3]; y += fn[t2 * 3 + 1]; z += fn[t2 * 3 + 2]; }
      }
      const l = Math.hypot(x, y, z) || 1;
      N[c * 3] = x / l; N[c * 3 + 1] = y / l; N[c * 3 + 2] = z / l;
    }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  return g;
}
// Shape helpers in the XY plane. A rounded rectangle with its own radius for the top and bottom corners.
function rrect(w, h, rt, rb, cx = 0, cy = 0, path) {
  const s = path || new THREE.Shape(), x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  s.moveTo(x0 + rb, y0); s.lineTo(x1 - rb, y0); s.quadraticCurveTo(x1, y0, x1, y0 + rb);
  s.lineTo(x1, y1 - rt); s.quadraticCurveTo(x1, y1, x1 - rt, y1);
  s.lineTo(x0 + rt, y1); s.quadraticCurveTo(x0, y1, x0, y1 - rt);
  s.lineTo(x0, y0 + rb); s.quadraticCurveTo(x0, y0, x0 + rb, y0);
  return s;
}
// ---- even meshes for extruded slabs
// three's extrude caps are ear-clipped fans and its walls one quad per contour segment: long slivers that
// subdivide badly. slab() resamples every outline to an even spacing, extrudes the walls in steps of that size,
// and replaces the caps with a Delaunay mesh of the outline plus a hexagonal grid of interior points.
function resampleLoop(pts, s) {
  const loop = pts.slice();
  if (loop.length > 1 && loop[0].distanceTo(loop[loop.length - 1]) < 1e-9) loop.pop();
  const out = [];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], k = Math.max(1, Math.ceil(a.distanceTo(b) / s));
    for (let j = 0; j < k; j++) out.push(new THREE.Vector2().lerpVectors(a, b, j / k));
  }
  return out;
}
function inLoop(loop, x, y) {
  let c = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i], b = loop[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
// Bowyer-Watson, sweeping in x so finished triangles drop out early. Returns a flat index list.
function delaunay(X, Y) {
  const n = X.length;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]); }
  const dm = Math.max(x1 - x0, y1 - y0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const px = [...X, mx - 20 * dm, mx, mx + 20 * dm], py = [...Y, my - dm, my + 20 * dm, my - dm];
  const tri = (a, b, c) => {
    const ax = px[a], ay = py[a], bx = px[b], by = py[b], cx = px[c], cy = py[c];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) || 1e-30;
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { a, b, c, x: ux, y: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };
  const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => px[p] - px[q]);
  let open = [tri(n, n + 1, n + 2)];
  const done = [], edges = new Map();
  for (const i of order) {
    const x = px[i], y = py[i];
    edges.clear();
    for (let j = open.length - 1; j >= 0; j--) {
      const t = open[j], dx = x - t.x;
      if (dx > 0 && dx * dx > t.r2) { done.push(t); open[j] = open[open.length - 1]; open.pop(); continue; }
      const dy = y - t.y;
      if (dx * dx + dy * dy - t.r2 > 1e-14) continue;
      for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) { const k = u < v ? u * 1e7 + v : v * 1e7 + u; edges.set(k, edges.has(k) ? null : [u, v]); }
      open[j] = open[open.length - 1]; open.pop();
    }
    for (const e of edges.values()) if (e) open.push(tri(e[0], e[1], i));
  }
  const out = [];
  for (const t of done.concat(open)) if (t.a < n && t.b < n && t.c < n) out.push(t.a, t.b, t.c);
  return out;
}
// flat cap at height z facing +Z (up) or -Z, over `outer` minus `holes` (loops of Vector2, already resampled)
function capTris(outer, holes, s, z, up, pos) {
  const X = [], Y = [];
  for (const loop of [outer, ...holes]) for (const p of loop) { X.push(p.x); Y.push(p.y); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of outer) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const inside = (x, y) => inLoop(outer, x, y) && !holes.some((h) => inLoop(h, x, y));
  // outline points (no more than s apart) bucketed by cell, to keep grid points off the outline
  const bucket = new Map(), cell = (x, y) => Math.floor(x / s) * 100003 + Math.floor(y / s);
  for (let i = 0; i < X.length; i++) { const k = cell(X[i], Y[i]); if (!bucket.has(k)) bucket.set(k, []); bucket.get(k).push(i); }
  const lim = (s * 0.7) ** 2;
  const near = (x, y) => {
    const cx = Math.floor(x / s), cy = Math.floor(y / s);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const l = bucket.get((cx + a) * 100003 + cy + b); if (!l) continue;
      for (const i of l) if ((X[i] - x) ** 2 + (Y[i] - y) ** 2 < lim) return true;
    }
    return false;
  };
  const rh = s * 0.866;
  for (let r = 0, y = y0 + rh * 0.5; y < y1; y += rh, r++) {
    for (let x = x0 + (r % 2 ? s * 0.5 : 0); x < x1; x += s) if (!near(x, y) && inside(x, y)) { X.push(x); Y.push(y); }
  }
  const T = delaunay(X, Y);
  for (let i = 0; i < T.length; i += 3) {
    let a = T[i], b = T[i + 1], c = T[i + 2];
    if (!inside((X[a] + X[b] + X[c]) / 3, (Y[a] + Y[b] + Y[c]) / 3)) continue;
    const ccw = (X[b] - X[a]) * (Y[c] - Y[a]) - (Y[b] - Y[a]) * (X[c] - X[a]) > 0;
    if (ccw !== up) { const t = b; b = c; c = t; }
    pos.push(X[a], Y[a], z, X[b], Y[b], z, X[c], Y[c], z);
  }
}
// extrude shapes along +Z (from z0, `depth` deep, plus `bevel` rounding at both ends), evenly meshed at about s
function slab(shapes, depth, z0, bevel, s, curveSegments = 18) {
  const pos = [];
  for (const sh of shapes) {
    const ex = sh.extractPoints(curveSegments);
    const outer = resampleLoop(ex.shape, s), holes = ex.holes.map((h) => resampleLoop(h, s));
    const shape = new THREE.Shape(outer);
    for (const h of holes) shape.holes.push(new THREE.Path(h));
    const g = new THREE.ExtrudeGeometry(shape, { depth, steps: Math.max(1, Math.ceil(depth / s)), curveSegments: 1,
      bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 4 });
    const P = g.attributes.position.array;
    for (const gr of g.groups) if (gr.materialIndex === 1) for (let i = gr.start * 3; i < (gr.start + gr.count) * 3; i++) pos.push(P[i]);
    g.dispose();
    capTris(outer, holes, s, -(bevel || 0), false, pos);
    capTris(outer, holes, s, depth + (bevel || 0), true, pos);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.translate(0, 0, z0);
  return tess(creaseNormals(g, 40), s * 1.6);
}

// ---- swept, lofted and arched surfaces (the violin)
// flip triangle winding if the normals mostly point toward the reference points (ref(i) -> Vector3 for vertex i)
function orientOut(g, ref) {
  g.computeVertexNormals();
  const P = g.attributes.position.array, N = g.attributes.normal.array, r = V3();
  let s = 0;
  for (let i = 0; i < P.length / 3; i++) { ref(i, r); s += N[i * 3] * (P[i * 3] - r.x) + N[i * 3 + 1] * (P[i * 3 + 1] - r.y) + N[i * 3 + 2] * (P[i * 3 + 2] - r.z); }
  if (s < 0) {
    const I = g.index.array;
    for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
    g.index.needsUpdate = true; g.computeVertexNormals();
  }
  return g;
}
// outward normals of a closed loop of Vector2 (counter-clockwise loops get normals pointing out)
function loopNormals(loop) {
  let area = 0;
  for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length]; area += a.x * b.y - b.x * a.y; }
  const sg = area > 0 ? 1 : -1, n = loop.length;
  return loop.map((p, i) => {
    const a = loop[(i + n - 1) % n], b = loop[(i + 1) % n];
    const v = new THREE.Vector2((b.y - a.y) * sg, -(b.x - a.x) * sg);
    return v.normalize();
  });
}
function offsetLoop(loop, d) { const N = loopNormals(loop); return loop.map((p, i) => p.clone().addScaledVector(N[i], d)); }
// sweep a profile [[offset along the outward normal, z], ...] around a closed loop in the XY plane
function sweepLoop(loop, prof, refOff = -0.01, refZ = 0) {
  const N = loopNormals(loop), n = loop.length, m = prof.length, pos = [], idx = [];
  for (let i = 0; i < n; i++) for (const [o, z] of prof) pos.push(loop[i].x + N[i].x * o, loop[i].y + N[i].y * o, z);
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = i2 * m + j; idx.push(a, b, b + 1, a, b + 1, a + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return orientOut(g, (k, r) => { const i = Math.floor(k / m); r.set(loop[i].x + N[i].x * refOff, loop[i].y + N[i].y * refOff, refZ); });
}
// loft through rings (arrays of Vector3, each a closed loop of the same length); ends are capped with fans
function loft(rings, caps = true) {
  const n = rings[0].length, pos = [], idx = [], cen = [];
  for (const r of rings) { const c = V3(); for (const p of r) c.add(p); c.divideScalar(n); cen.push(c); for (const p of r) pos.push(p.x, p.y, p.z); }
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < n; i++) {
    const a = k * n + i, b = k * n + (i + 1) % n, c = a + n, d = b + n; idx.push(a, b, d, a, d, c);
  }
  const ends = [];
  if (caps) for (const k of [0, rings.length - 1]) {
    const ci = pos.length / 3; pos.push(cen[k].x, cen[k].y, cen[k].z); ends.push(ci);
    for (let i = 0; i < n; i++) { const a = k * n + i, b = k * n + (i + 1) % n; if (k === 0) idx.push(ci, b, a); else idx.push(ci, a, b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return orientOut(g, (v, r) => r.copy(cen[Math.min(rings.length - 1, Math.floor(v / n))]));
}
function distToLoop(loop, x, y) {
  let best = Infinity;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], vx = b.x - a.x, vy = b.y - a.y;
    const t = sat(((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy || 1));
    const d = (x - a.x - vx * t) ** 2 + (y - a.y - vy * t) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
// an arched plate: the loop's interior meshed evenly, lifted by zfn(x, y); faces +Z if up
function heightCap(loop, s, zfn, up) {
  const pos = [];
  capTris(loop, [], s, 0, up, pos);
  for (let i = 0; i < pos.length; i += 3) pos[i + 2] = zfn(pos[i], pos[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const w = weld(g);
  w.computeVertexNormals();
  return w;
}
// a lathe over part of a turn (phi from phiStart, phiLength radians; phi 0 faces +Z), with the profile capped at
// both cut ends so thin plates don't show their hollow edges
function plathe(pts, step, segs, phiStart, phiLength) {
  const pr = prof(pts, step);
  const body = new THREE.LatheGeometry(pr, segs, phiStart, phiLength);
  const loop = pr.slice(); if (loop[0].distanceTo(loop[loop.length - 1]) < 1e-9) loop.pop();
  const tris = THREE.ShapeUtils.triangulateShape(loop, []);
  const caps = [];
  for (const [phi, sg] of [[phiStart, -1], [phiStart + phiLength, 1]]) {
    const s = Math.sin(phi), c = Math.cos(phi), nx = c * sg, nz = -s * sg, pos = [], nor = [];
    for (const t of tris) {
      const order = sg > 0 ? t : [t[0], t[2], t[1]];
      for (const k of order) { pos.push(loop[k].x * s, loop[k].y, loop[k].x * c); nor.push(nx, 0, nz); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const cg = tess(g, step * 2); fixWinding(cg); caps.push(cg);
  }
  return merge([weld(body), ...caps]);
}
// closed profile of a thin curved plate from (r0, y0) (top, inner) to (r1, y1) (bottom, outer), th thick
function plateProf(r0, y0, r1, y1, th, bulge = 0) {
  const ux = r0 - r1, uy = y0 - y1, L = Math.hypot(ux, uy), nx = uy / L, ny = -ux / L;
  const mx = (r0 + r1) / 2 + nx * bulge, my = (y0 + y1) / 2 + ny * bulge;
  return [[r1, y1], [mx, my], [r0, y0, th * 0.45], [r0 - nx * th, y0 - ny * th, th * 0.45], [mx - nx * th, my - ny * th], [r1 - nx * th, y1 - ny * th, th * 0.45], [r1, y1]];
}
