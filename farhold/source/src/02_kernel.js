// Farhold — the terrain kernel: seeded 3D noise, planet height and colour, and chunk mesh building.
// KERNEL is self-contained (no outside references) so its source can also run inside Web Workers.

function KERNEL() {
  // ---------- seeded 3D simplex noise ----------
  const perm = new Uint8Array(512), permMod12 = new Uint8Array(512);
  const grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
  let curSeed = -1;
  function seed(s) {
    if (s === curSeed) return;
    curSeed = s;
    let a = s >>> 0;
    const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
  }
  const F3 = 1 / 3, G3 = 1 / 6;
  function s3(xin, yin, zin) {
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { const g = permMod12[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n0 = t0 * t0 * (grad3[g] * x0 + grad3[g + 1] * y0 + grad3[g + 2] * z0); }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) { const g = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n1 = t1 * t1 * (grad3[g] * x1 + grad3[g + 1] * y1 + grad3[g + 2] * z1); }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) { const g = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n2 = t2 * t2 * (grad3[g] * x2 + grad3[g + 1] * y2 + grad3[g + 2] * z2); }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) { const g = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n3 = t3 * t3 * (grad3[g] * x3 + grad3[g + 1] * y3 + grad3[g + 2] * z3); }
    return 32 * (n0 + n1 + n2 + n3); // ~[-1,1]
  }
  function fbm(x, y, z, oct) {
    let s = 0, a = 1, n = 0, f = 1;
    for (let o = 0; o < oct; o++) { s += s3(x * f + o * 17.3, y * f - o * 9.1, z * f + o * 5.7) * a; n += a; a *= 0.5; f *= 2.02; }
    return s / n;
  }
  function ridged(x, y, z, oct) {
    let s = 0, a = 0.5, n = 0, f = 1, w = 1;
    for (let o = 0; o < oct; o++) {
      let v = 1 - Math.abs(s3(x * f + o * 31.7, y * f - o * 13.3, z * f + o * 7.1));
      v *= v; v *= w; w = Math.min(1, v * 2);
      s += v * a; n += a; a *= 0.5; f *= 2.1;
    }
    return s / n;
  }
  function h3(x, y, z) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1442695041) + curSeed) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // crater field: sum of bowl-and-rim profiles at jittered lattice points (value roughly -1..0.3)
  function craters(x, y, z, density) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let acc = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const cx = ix + a, cy = iy + b, cz = iz + c;
      const r0 = h3(cx, cy, cz);
      if (r0 > density) continue;
      const fx = cx + h3(cx + 11, cy, cz), fy = cy + h3(cx, cy + 7, cz), fz = cz + h3(cx, cy, cz + 3);
      const rad = 0.18 + 0.32 * h3(cx + 5, cy + 5, cz + 5);
      const dx = x - fx, dy = y - fy, dz = z - fz, d = Math.sqrt(dx * dx + dy * dy + dz * dz) / rad;
      if (d > 1.6) continue;
      let v = d < 1 ? d * d - 1 : 0;
      const e = (d - 1) / 0.22; v += 0.28 * Math.exp(-e * e);
      acc += v * (0.5 + rad);
    }
    return acc;
  }
  const smooth = (a, b, v) => { let t = (v - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };

  // ---------- planet height (metres above the base radius) ----------
  // P: { seed, R, amp, sea (metres or null), cont, mtn, hills, terr, crat, warp, canyon, spikes, pois: [x,y,z,r1,r2,h, ...] }
  function heightRaw(P, x, y, z) {
    const sc = P.R / 700;
    let px = x * sc, py = y * sc, pz = z * sc;
    if (P.warp) {
      const w = P.warp * 0.6;
      const wx = s3(px * 0.7 + 3.1, py * 0.7, pz * 0.7), wy = s3(px * 0.7, py * 0.7 + 7.7, pz * 0.7), wz = s3(px * 0.7, py * 0.7, pz * 0.7 + 1.9);
      px += wx * w; py += wy * w; pz += wz * w;
    }
    const c = fbm(px * 0.45, py * 0.45, pz * 0.45, 4);
    let h = c * P.cont;
    if (P.mtn) {
      const r = ridged(px * 1.3, py * 1.3, pz * 1.3, 5);
      const mask = smooth(-0.15, 0.45, c + 0.1);
      h += r * r * P.mtn * mask * 1.6;
    }
    h += fbm(px * 4, py * 4, pz * 4, 4) * P.hills;
    if (P.canyon) {
      const cv = Math.abs(s3(px * 0.9 + 40, py * 0.9, pz * 0.9));
      h -= (1 - smooth(0, 0.09, cv)) * P.canyon;
    }
    if (P.terr) {
      const k = h * P.terr, f = Math.floor(k), fr = k - f;
      h = (f + smooth(0.3, 0.7, fr)) / P.terr * 0.85 + h * 0.15;
    }
    if (P.crat) h += craters(px * 1.6, py * 1.6, pz * 1.6, 0.35) * P.crat * 0.35 + craters(px * 5, py * 5, pz * 5, 0.25) * P.crat * 0.1;
    if (P.spikes) { const sp = ridged(px * 6, py * 6, pz * 6, 2); h += Math.pow(sp, 6) * P.spikes; }
    // fine detail, ~10 m and ~2 m features
    const fx = x * P.R, fy = y * P.R, fz = z * P.R;
    h += s3(fx * 0.045, fy * 0.045, fz * 0.045) * 0.022 + s3(fx * 0.21, fy * 0.21, fz * 0.21) * 0.006;
    return h * P.amp;
  }
  function height(P, x, y, z) {
    let h = heightRaw(P, x, y, z);
    const L = P.pois;
    if (L && L.length) {
      for (let i = 0; i < L.length; i += 6) {
        const dx = x - L[i], dy = y - L[i + 1], dz = z - L[i + 2];
        const d2 = (dx * dx + dy * dy + dz * dz) * P.R * P.R;
        const r2 = L[i + 4];
        if (d2 < r2 * r2) { const t = smooth(r2, L[i + 3], Math.sqrt(d2)); h = h + (L[i + 5] - h) * t; }
      }
    }
    return h;
  }
  // ---------- planet colour ----------
  // palette arrays are [r,g,b] in 0..1: low, low2, high, rock, rock2, snow, sand, bed
  function color(P, x, y, z, h, slope, out) {
    const C = P.pal, sc = P.R / 700;
    const px = x * sc, py = y * sc, pz = z * sc;
    const m = fbm(px * 1.6 + 31, py * 1.6, pz * 1.6, 3);
    const v = s3(px * 14, py * 14, pz * 14) * 0.5 + 0.5;
    const t1 = smooth(-0.35, 0.35, m + (v - 0.5) * 0.5);
    let r = C.low[0] + (C.low2[0] - C.low[0]) * t1, g = C.low[1] + (C.low2[1] - C.low[1]) * t1, b = C.low[2] + (C.low2[2] - C.low[2]) * t1;
    const alt = (h - (P.sea || 0)) / P.amp;
    const th = smooth(P.hiStart, P.hiStart + 0.25, alt + (v - 0.5) * 0.08);
    r += (C.high[0] - r) * th; g += (C.high[1] - g) * th; b += (C.high[2] - b) * th;
    if (P.snow != null) {
      const ts = smooth(P.snow, P.snow + 0.06, alt + (v - 0.5) * 0.06) * (1 - smooth(0.3, 0.5, slope));
      r += (C.snow[0] - r) * ts; g += (C.snow[1] - g) * ts; b += (C.snow[2] - b) * ts;
    }
    if (P.sea != null) {
      const ts = 1 - smooth(P.sea + 0.6, P.sea + 2.2 + v * 1.5, h);
      r += (C.sand[0] - r) * ts; g += (C.sand[1] - g) * ts; b += (C.sand[2] - b) * ts;
      const tb = 1 - smooth(P.sea - 3, P.sea - 0.5, h);
      r += (C.bed[0] - r) * tb; g += (C.bed[1] - g) * tb; b += (C.bed[2] - b) * tb;
    }
    const tr = smooth(0.2, 0.36, slope + (v - 0.5) * 0.08);
    const rk = smooth(0.3, 0.7, v);
    const rr = C.rock[0] + (C.rock2[0] - C.rock[0]) * rk, rg = C.rock[1] + (C.rock2[1] - C.rock[1]) * rk, rb = C.rock[2] + (C.rock2[2] - C.rock[2]) * rk;
    r += (rr - r) * tr; g += (rg - g) * tr; b += (rb - b) * tr;
    const sh = 0.92 + v * 0.16;
    out[0] = r * sh; out[1] = g * sh; out[2] = b * sh;
    return out;
  }

  // ---------- cube-sphere mapping ----------
  // face basis: normal n, axes a (u) and b (v) with a x b = n
  const FACES = [
    [1, 0, 0, 0, 0, -1, 0, 1, 0], [-1, 0, 0, 0, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 0, 0, 0, -1], [0, -1, 0, 1, 0, 0, 0, 0, 1],
    [0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, -1, 0, 0, 0, 1, 0],
  ];
  const Q = Math.PI / 4;
  function cubeDir(f, u, v, out) {
    const F = FACES[f], tu = Math.tan(u * Q), tv = Math.tan(v * Q);
    const x = F[0] + F[3] * tu + F[6] * tv, y = F[1] + F[4] * tu + F[7] * tv, z = F[2] + F[5] * tu + F[8] * tv;
    const l = Math.sqrt(x * x + y * y + z * z);
    out[0] = x / l; out[1] = y / l; out[2] = z / l;
    return out;
  }
  // direction -> face, u, v
  function dirFace(x, y, z, out) {
    const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
    let f, a, b, n;
    if (ax >= ay && ax >= az) { f = x > 0 ? 0 : 1; n = ax; } else if (ay >= az) { f = y > 0 ? 2 : 3; n = ay; } else { f = z > 0 ? 4 : 5; n = az; }
    const F = FACES[f];
    a = (x * F[3] + y * F[4] + z * F[5]) / n; b = (x * F[6] + y * F[7] + z * F[8]) / n;
    out[0] = f; out[1] = Math.atan(a) / Q; out[2] = Math.atan(b) / Q;
    return out;
  }

  // ---------- chunk mesh ----------
  // job: { face, u0, v0, size (in face units, full face = 2), N (segments), skirt (m), water (bool), ws (water segments) }
  function buildChunk(P, job) {
    seed(P.seed);
    const N = job.N, M = N + 3, R = P.R;
    const H = new Float32Array(M * M), D = new Float32Array(M * M * 3);
    const d = [0, 0, 0];
    const step = job.size / N;
    let hmin = 1e9, hmax = -1e9;
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      cubeDir(job.face, job.u0 + (i - 1) * step, job.v0 + (j - 1) * step, d);
      const k = j * M + i;
      D[k * 3] = d[0]; D[k * 3 + 1] = d[1]; D[k * 3 + 2] = d[2];
      const h = height(P, d[0], d[1], d[2]);
      H[k] = h;
      if (i >= 1 && i <= N + 1 && j >= 1 && j <= N + 1) { if (h < hmin) hmin = h; if (h > hmax) hmax = h; }
    }
    // centre of the chunk (planet-local)
    cubeDir(job.face, job.u0 + job.size / 2, job.v0 + job.size / 2, d);
    const hc = height(P, d[0], d[1], d[2]);
    const cx = d[0] * (R + hc), cy = d[1] * (R + hc), cz = d[2] * (R + hc);
    const NV = (N + 1) * (N + 1), NS = 4 * (N + 1);
    const pos = new Float32Array((NV + NS) * 3), nor = new Float32Array((NV + NS) * 3), col = new Float32Array((NV + NS) * 3), pl = new Float32Array((NV + NS) * 3);
    const W = (k, o) => { const r = R + H[k]; return D[k * 3 + o] * r; };
    const c3 = [0, 0, 0];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const k = (j + 1) * M + (i + 1), o = (j * (N + 1) + i) * 3;
      const r = R + H[k];
      const wx = D[k * 3] * r, wy = D[k * 3 + 1] * r, wz = D[k * 3 + 2] * r;
      pos[o] = wx - cx; pos[o + 1] = wy - cy; pos[o + 2] = wz - cz;
      pl[o] = wx; pl[o + 1] = wy; pl[o + 2] = wz;
      const kl = k - 1, kr = k + 1, kd = k - M, ku = k + M;
      const ax = W(kr, 0) - W(kl, 0), ay = W(kr, 1) - W(kl, 1), az = W(kr, 2) - W(kl, 2);
      const bx = W(ku, 0) - W(kd, 0), by = W(ku, 1) - W(kd, 1), bz = W(ku, 2) - W(kd, 2);
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= l; ny /= l; nz /= l;
      nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
      const slope = 1 - (nx * D[k * 3] + ny * D[k * 3 + 1] + nz * D[k * 3 + 2]);
      color(P, D[k * 3], D[k * 3 + 1], D[k * 3 + 2], H[k], slope, c3);
      col[o] = c3[0]; col[o + 1] = c3[1]; col[o + 2] = c3[2];
    }
    // skirts: copies of the edge vertices pulled towards the planet centre
    const sk = job.skirt;
    let s = NV;
    const edge = (i, j) => {
      const src = (j * (N + 1) + i) * 3, o = s * 3;
      const k = (j + 1) * M + (i + 1);
      pos[o] = pos[src] - D[k * 3] * sk; pos[o + 1] = pos[src + 1] - D[k * 3 + 1] * sk; pos[o + 2] = pos[src + 2] - D[k * 3 + 2] * sk;
      pl[o] = pl[src]; pl[o + 1] = pl[src + 1]; pl[o + 2] = pl[src + 2];
      nor[o] = nor[src]; nor[o + 1] = nor[src + 1]; nor[o + 2] = nor[src + 2];
      col[o] = col[src]; col[o + 1] = col[src + 1]; col[o + 2] = col[src + 2];
      s++;
    };
    for (let i = 0; i <= N; i++) edge(i, 0);
    for (let i = 0; i <= N; i++) edge(i, N);
    for (let j = 0; j <= N; j++) edge(0, j);
    for (let j = 0; j <= N; j++) edge(N, j);
    const res = { pos, nor, col, pl, center: [cx, cy, cz], hmin, hmax, hc };
    // water surface for chunks that dip below sea level
    if (P.sea != null && hmin < P.sea + 0.5) {
      const WS = job.ws, wv = (WS + 1) * (WS + 1);
      const wpos = new Float32Array(wv * 3), wnor = new Float32Array(wv * 3), wdep = new Float32Array(wv);
      const ws = job.size / WS, rs = R + P.sea;
      for (let j = 0; j <= WS; j++) for (let i = 0; i <= WS; i++) {
        cubeDir(job.face, job.u0 + i * ws, job.v0 + j * ws, d);
        const o = (j * (WS + 1) + i) * 3;
        wpos[o] = d[0] * rs - cx; wpos[o + 1] = d[1] * rs - cy; wpos[o + 2] = d[2] * rs - cz;
        wnor[o] = d[0]; wnor[o + 1] = d[1]; wnor[o + 2] = d[2];
        // sample terrain depth below the surface (nearest grid height)
        const gi = Math.min(N, Math.round(i * N / WS)), gj = Math.min(N, Math.round(j * N / WS));
        wdep[o / 3] = P.sea - H[(gj + 1) * M + (gi + 1)];
      }
      res.wpos = wpos; res.wnor = wnor; res.wdep = wdep;
    }
    return res;
  }
  function surfaceR(P, x, y, z) { seed(P.seed); return P.R + height(P, x, y, z); }
  return { seed, s3, fbm, ridged, height, heightRaw, color, cubeDir, dirFace, buildChunk, surfaceR, FACES };
}
const K = KERNEL();

// ---------- worker pool for chunk building ----------
const TERRAIN_POOL = (() => {
  const workers = [];
  const pending = new Map();
  let nextId = 1, ok = false, rr = 0;
  const queue = [];
  function init() {
    if (typeof Worker === 'undefined' || DEBUG && /nowork/.test(location.hash)) return;
    const src = 'const K = (' + KERNEL.toString() + ')();\nconst PL = {};\n' +
      'onmessage = (e) => { const m = e.data; if (m.planet) { PL[m.planet.id] = m.planet; return; }\n' +
      ' const r = K.buildChunk(PL[m.pid], m.job); r.id = m.id; const t = [r.pos.buffer, r.nor.buffer, r.col.buffer, r.pl.buffer]; if (r.wpos) t.push(r.wpos.buffer, r.wnor.buffer, r.wdep.buffer); postMessage(r, t); };';
    try {
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 1));
      for (let i = 0; i < n; i++) {
        const w = new Worker(url);
        w.onmessage = (e) => { const r = e.data, cb = pending.get(r.id); pending.delete(r.id); w.busy--; if (cb) cb(r); pump(); };
        w.onerror = () => { ok = false; };
        w.busy = 0; w.planets = new Set();
        workers.push(w);
      }
      ok = true;
    } catch (e) { ok = false; }
  }
  function pump() {
    while (queue.length) {
      let best = null;
      for (const w of workers) if (w.busy < 2 && (!best || w.busy < best.busy)) best = w;
      if (!best) return;
      const q = queue.shift();
      if (q.cancelled && q.cancelled()) continue;
      if (!best.planets.has(q.P.id)) { best.postMessage({ planet: q.P }); best.planets.add(q.P.id); }
      const id = nextId++;
      pending.set(id, q.cb); best.busy++;
      best.postMessage({ id, pid: q.P.id, job: q.job });
    }
  }
  return {
    forceSync: false,
    init,
    get async() { return ok; },
    get busy() { return queue.length + pending.size; },
    // request a chunk; cb(result). Falls back to building synchronously.
    request(P, job, cb, cancelled, sync) {
      if (!ok || sync || this.forceSync) { cb(K.buildChunk(P, job)); return; }
      queue.push({ P, job, cb, cancelled });
      pump();
    },
    forget(pid) { for (const w of workers) w.planets.delete(pid); },
    clear() { queue.length = 0; },
  };
})();
