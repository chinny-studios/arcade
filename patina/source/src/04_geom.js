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

// Split every edge longer than maxEdge (recursively), so flat faces carry enough vertices for painting.
// Works per triangle on non-indexed data: both sides of a shared edge split it at the same midpoint, so no cracks.
function tess(geom, maxEdge) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const P = g.attributes.position.array, Nn = g.attributes.normal.array;
  const pos = [], nor = [], m2 = maxEdge * maxEdge;
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const midn = (a, b) => { const v = [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  function emit(a, b, c, na, nb, nc, depth) {
    const ab = d2(a, b) > m2, bc = d2(b, c) > m2, ca = d2(c, a) > m2;
    if (depth > 12 || (!ab && !bc && !ca)) { pos.push(...a, ...b, ...c); nor.push(...na, ...nb, ...nc); return; }
    const k = (ab ? 1 : 0) + (bc ? 1 : 0) + (ca ? 1 : 0), D = depth + 1;
    if (k === 3) {
      const mab = mid(a, b), mbc = mid(b, c), mca = mid(c, a), nab = midn(na, nb), nbc = midn(nb, nc), nca = midn(nc, na);
      emit(a, mab, mca, na, nab, nca, D); emit(mab, b, mbc, nab, nb, nbc, D); emit(mca, mbc, c, nca, nbc, nc, D); emit(mab, mbc, mca, nab, nbc, nca, D);
    } else if (k === 1) {
      if (ab) { const m = mid(a, b), nm = midn(na, nb); emit(a, m, c, na, nm, nc, D); emit(m, b, c, nm, nb, nc, D); }
      else if (bc) { const m = mid(b, c), nm = midn(nb, nc); emit(a, b, m, na, nb, nm, D); emit(a, m, c, na, nm, nc, D); }
      else { const m = mid(c, a), nm = midn(nc, na); emit(a, b, m, na, nb, nm, D); emit(m, b, c, nm, nb, nc, D); }
    } else {
      // two long edges: rotate so the short one is c-a
      if (!ab) return emit(b, c, a, nb, nc, na, depth);
      if (!bc) return emit(c, a, b, nc, na, nb, depth);
      const mab = mid(a, b), mbc = mid(b, c), nab = midn(na, nb), nbc = midn(nb, nc);
      emit(mab, b, mbc, nab, nb, nbc, D); emit(a, mab, mbc, na, nab, nbc, D); emit(a, mbc, c, na, nbc, nc, D);
    }
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
