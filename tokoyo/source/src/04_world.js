// Tokoyo — world: seeded island heightfield, biomes, points of interest, chunked terrain meshes, terrain edits, water

const W = {
  N: WORLD.size + 1,          // samples per side at 1 m
  C: (WORLD.size >> 2) + 1,   // coarse samples per side at 4 m
  H: null, paint: null, wf: null, isl: null, h4: null, mods: new Map(), paintMods: new Map(), orig: new Map(),
  islands: [], pois: [], chunks: [], seed: 1,
};
const CH = WORLD.chunk, NCH = WORLD.size / CH;

function genWorld(seed, progress) {
  W.seed = seed;
  Noise.seed(seed);
  const rnd = mulberry32(seed ^ 0x5eed);
  const N = W.N, C = W.C, half = WORLD.half;
  // islands: the mainland plus satellites. The largest satellite is Shinboku, the elder cedar's isle.
  const isl = [{ x: 0, z: 0, r: 560, main: true }];
  const a0 = rnd() * TAU;
  const sats = 4;
  for (let i = 0; i < sats; i++) {
    const a = a0 + (i / sats) * TAU + (rnd() - 0.5) * 0.6;
    const big = i === 0;
    const r = big ? 210 : 100 + rnd() * 70;
    const d = big ? 800 : 760 + rnd() * 90;
    const lim = half - r - 40;
    isl.push({ x: clamp(Math.cos(a) * d, -lim, lim), z: clamp(Math.sin(a) * d, -lim, lim), r, shinboku: big });
  }
  W.islands = isl;

  // ---- coarse fields at 4 m ----
  const h4 = new Float32Array(C * C), wf = new Float32Array(C * C), isle = new Uint8Array(C * C), pond = new Float32Array(C * C);
  for (let j = 0; j < C; j++) {
    const z = j * 4 - half;
    for (let i = 0; i < C; i++) {
      const x = i * 4 - half, k = j * C + i;
      const wx = x + 90 * Noise.fbm(x / 340, z / 340, 2), wz = z + 90 * Noise.fbm(x / 340 + 50, z / 340 - 20, 2);
      let e = -9, best = 0;
      for (let n = 0; n < isl.length; n++) {
        const I = isl[n];
        const d = Math.hypot(wx - I.x, wz - I.z) / I.r;
        const v = 1 - d + 0.08 * Noise.s2(x / 90 + n * 7, z / 90);
        if (v > e) { e = v; best = n; }
      }
      isle[k] = best;
      // forest-ness: the mainland's outer ring and every satellite isle
      let f;
      if (best === 0) {
        const dm = Math.hypot(wx, wz) / isl[0].r;
        f = smooth(0.4, 0.56, dm + 0.22 * Noise.fbm(x / 170, z / 170, 3));
      } else f = smooth(-0.1, 0.25, e + 0.15 * Noise.fbm(x / 120, z / 120, 2)) * 0.6 + 0.4;
      wf[k] = f;
      let h;
      if (e < 0) {
        h = -2 - 34 * smooth(0, 0.3, -e) + 2 * Noise.s2(x / 60, z / 60);
      } else {
        const hm = 3 + 7 * (Noise.fbm(x / 230, z / 230, 4) * 0.5 + 0.5) + 2.2 * Noise.fbm(x / 70, z / 70, 2);
        const hf = 5 + 26 * Noise.ridged(x / 330, z / 330, 4) + 9 * (Noise.fbm(x / 150 + 9, z / 150, 3) * 0.5 + 0.5);
        const land = lerp(hm, hf, f);
        const k2 = smooth(0.0, 0.22, e);
        h = lerp(-2 + 34 * e, land, k2);
        // meadow ponds
        const pd = smooth(0.42, 0.62, Noise.fbm(x / 110 + 33, z / 110 - 17, 3)) * (1 - f) * smooth(0.15, 0.35, e);
        pond[k] = pd;
        h -= pd * 9;
      }
      h4[k] = h;
    }
    if (progress && (j & 31) === 0) progress(0.3 * j / C);
  }
  W.h4 = h4; W.wf = wf; W.isl = isle; W.pond = pond;

  // ---- points of interest (decided on coarse fields, then flattened) ----
  placePOIs(rnd);
  for (const p of W.pois) if (p.flat) flatten4(p.x, p.z, p.flat, p.flat + 14, p.y);

  // ---- full 1 m heightfield: bilinear coarse + fine detail ----
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    const z = j - half, cj = j / 4, j0 = Math.min(cj | 0, C - 2), fz = cj - j0;
    for (let i = 0; i < N; i++) {
      const ci = i / 4, i0 = Math.min(ci | 0, C - 2), fx = ci - i0;
      const k = j0 * C + i0;
      const hb = lerp(lerp(h4[k], h4[k + 1], fx), lerp(h4[k + C], h4[k + C + 1], fx), fz);
      const f = lerp(lerp(wf[k], wf[k + 1], fx), lerp(wf[k + C], wf[k + C + 1], fx), fz);
      const x = i - half;
      const amp = hb > 0.5 ? 0.35 + f * 0.6 : 0.15;
      H[j * N + i] = hb + amp * Noise.s2(x / 9, z / 9);
    }
    if (progress && (j & 63) === 0) progress(0.3 + 0.5 * j / N);
  }
  W.H = H;
  // re-flatten POIs precisely at 1 m
  for (const p of W.pois) if (p.flat) flatten1(p.x, p.z, p.flat, p.flat + 8, p.y);
  W.paint = new Uint8Array(N * N);
  const PAVE = { shrine: [9.6, 2], altar1: [5.6, 2], altar2: [8.6, 1], haunted: [10, 1], nest: [2.2, 1], ruin: [5, 1], ema: [1.6, 1] };
  for (const p of W.pois) {
    const pv = PAVE[p.type]; if (!pv) continue;
    const [r, t] = pv;
    for (let j = Math.floor(p.z - r); j <= Math.ceil(p.z + r); j++) for (let i = Math.floor(p.x - r); i <= Math.ceil(p.x + r); i++) {
      if ((i - p.x) ** 2 + (j - p.z) ** 2 > r * r) continue;
      const k = (j + half) * N + (i + half); if (k >= 0 && k < N * N) W.paint[k] = t;
    }
  }
  W.mods = new Map(); W.paintMods = new Map(); W.orig = new Map();
  return W;
}

function flatten4(x, z, r0, r1, y) {
  const C = W.C, half = WORLD.half;
  const i0 = Math.max(0, Math.floor((x - r1 + half) / 4)), i1 = Math.min(C - 1, Math.ceil((x + r1 + half) / 4));
  const j0 = Math.max(0, Math.floor((z - r1 + half) / 4)), j1 = Math.min(C - 1, Math.ceil((z + r1 + half) / 4));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const d = Math.hypot(i * 4 - half - x, j * 4 - half - z);
    const t = 1 - smooth(r0, r1, d);
    const k = j * W.C + i;
    W.h4[k] = lerp(W.h4[k], y, t);
  }
}
function flatten1(x, z, r0, r1, y) {
  const N = W.N, half = WORLD.half;
  const i0 = Math.max(0, Math.floor(x - r1 + half)), i1 = Math.min(N - 1, Math.ceil(x + r1 + half));
  const j0 = Math.max(0, Math.floor(z - r1 + half)), j1 = Math.min(N - 1, Math.ceil(z + r1 + half));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const d = Math.hypot(i - half - x, j - half - z);
    const t = 1 - smooth(r0, r1, d);
    W.H[j * N + i] = lerp(W.H[j * N + i], y, t);
  }
}

// coarse lookups (valid before the fine field exists)
function coarse(arr, x, z) {
  const C = W.C, ci = clamp((x + WORLD.half) / 4, 0, C - 1.001), cj = clamp((z + WORLD.half) / 4, 0, C - 1.001);
  const i0 = ci | 0, j0 = cj | 0, fx = ci - i0, fz = cj - j0, k = j0 * C + i0;
  return lerp(lerp(arr[k], arr[k + 1], fx), lerp(arr[k + C], arr[k + C + 1], fx), fz);
}
function islandAt(x, z) {
  const C = W.C, i = clamp(Math.round((x + WORLD.half) / 4), 0, C - 1), j = clamp(Math.round((z + WORLD.half) / 4), 0, C - 1);
  return W.isl[j * C + i];
}
const forestAt = (x, z) => coarse(W.wf, x, z);
// 0 ocean, 1 meadows, 2 forest
function biomeAt(x, z) {
  const h = W.H ? heightAt(x, z) : coarse(W.h4, x, z);
  if (h < -1.5 && coarse(W.pond, x, z) < 0.2) return 0;
  return forestAt(x, z) > 0.5 ? 2 : 1;
}
const BIOME_NAME = ['Ocean', 'Satoyama meadows', 'Sugi no mori'];

function placePOIs(rnd) {
  const P = W.pois = [];
  const okLand = (x, z, minH = 2.5, maxH = 40) => { const h = coarse(W.h4, x, z); return h > minH && h < maxH; };
  const avgH = (x, z, r) => { let s = 0, n = 0; for (let a = 0; a < TAU; a += TAU / 8) { s += coarse(W.h4, x + Math.cos(a) * r, z + Math.sin(a) * r); n++; } return (s / n + coarse(W.h4, x, z)) / 2; };
  const find = (test, tries = 4000) => { for (let i = 0; i < tries; i++) { const r = test(i); if (r) return r; } return null; };
  // spawn shrine
  const sy = Math.max(4, avgH(0, 0, 18));
  P.push({ type: 'shrine', x: 0, z: 0, y: sy, flat: 16, name: 'Spirit shrine' });
  // Shirokiba's shrine: meadows, 160-260 m from the spawn
  const b1 = find(() => {
    const a = rnd() * TAU, d = 170 + rnd() * 100, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (forestAt(x, z) > 0.25 || !okLand(x, z, 3.5)) return null;
    if (coarse(W.pond, x, z) > 0.05) return null;
    return { x, z };
  }) || { x: 200, z: 0 };
  P.push({ type: 'altar1', x: b1.x, z: b1.z, y: Math.max(3.5, avgH(b1.x, b1.z, 12)), flat: 14, name: 'Shrine of the White Tusk', boss: 'shirokiba' });
  // Ōsugi's grove: the middle of Shinboku isle
  const sh = W.islands.find((i) => i.shinboku);
  const b2 = find(() => {
    const x = sh.x + (rnd() - 0.5) * sh.r * 0.5, z = sh.z + (rnd() - 0.5) * sh.r * 0.5;
    return okLand(x, z, 4) ? { x, z } : null;
  }) || { x: sh.x, z: sh.z };
  P.push({ type: 'altar2', x: b2.x, z: b2.z, y: Math.max(5, avgH(b2.x, b2.z, 16)), flat: 20, name: 'Grove of the Elder Cedar', boss: 'osugi' });
  // ema plaques (reveal boss locations): one at the meadow/forest edge, one on the mainland's coast facing Shinboku
  const e1 = find(() => {
    const a = rnd() * TAU, d = 80 + rnd() * 120, x = Math.cos(a) * d, z = Math.sin(a) * d;
    return forestAt(x, z) < 0.3 && okLand(x, z, 3) && coarse(W.pond, x, z) < 0.05 ? { x, z } : null;
  }) || { x: 60, z: 60 };
  P.push({ type: 'ema', x: e1.x, z: e1.z, y: avgH(e1.x, e1.z, 3), flat: 4, reveals: 'altar1', name: 'Ema plaque' });
  const ang = Math.atan2(sh.z, sh.x);
  const e2 = find((i) => {
    const a = ang + (rnd() - 0.5) * 0.8, d = 380 + rnd() * 140, x = Math.cos(a) * d, z = Math.sin(a) * d;
    return forestAt(x, z) > 0.5 && okLand(x, z, 3) && islandAt(x, z) === 0 ? { x, z } : null;
  }) || { x: Math.cos(ang) * 420, z: Math.sin(ang) * 420 };
  P.push({ type: 'ema', x: e2.x, z: e2.z, y: avgH(e2.x, e2.z, 3), flat: 4, reveals: 'altar2', name: 'Ema plaque' });
  // haunted shrines (ochimusha + hi-no-tama) and gaki nests (hokora) in the forest
  const farFrom = (x, z, d) => P.every((p) => dist2(p.x, p.z, x, z) > d * d);
  let hs = 0;
  for (let i = 0; i < 6000 && hs < 7; i++) {
    const x = (rnd() - 0.5) * 1900, z = (rnd() - 0.5) * 1900;
    if (forestAt(x, z) < 0.65 || !okLand(x, z, 4, 30) || !farFrom(x, z, 140)) continue;
    P.push({ type: 'haunted', x, z, y: avgH(x, z, 10), flat: 12, name: 'Haunted shrine', rot: rnd() * TAU });
    hs++;
  }
  let nests = 0;
  for (let i = 0; i < 8000 && nests < 22; i++) {
    const x = (rnd() - 0.5) * 1900, z = (rnd() - 0.5) * 1900;
    if (forestAt(x, z) < 0.6 || !okLand(x, z, 3, 34) || !farFrom(x, z, 70)) continue;
    P.push({ type: 'nest', x, z, y: avgH(x, z, 3), flat: 3.5, name: 'Cursed hokora' });
    nests++;
  }
  // a few small meadow ruins for flavour
  let ru = 0;
  for (let i = 0; i < 3000 && ru < 6; i++) {
    const x = (rnd() - 0.5) * 900, z = (rnd() - 0.5) * 900;
    if (forestAt(x, z) > 0.35 || !okLand(x, z, 3, 20) || !farFrom(x, z, 90) || coarse(W.pond, x, z) > 0.05) continue;
    P.push({ type: 'ruin', x, z, y: avgH(x, z, 5), flat: 6, rot: rnd() * TAU, name: 'Abandoned farmstead' });
    ru++;
  }
}

// ---------- height queries (match the mesh triangulation) ----------
function heightAt(x, z) {
  const N = W.N, half = WORLD.half;
  const fx0 = clamp(x + half, 0, N - 1.0001), fz0 = clamp(z + half, 0, N - 1.0001);
  const i = fx0 | 0, j = fz0 | 0, fx = fx0 - i, fz = fz0 - j, k = j * N + i, H = W.H;
  const h00 = H[k], h10 = H[k + 1], h01 = H[k + N], h11 = H[k + N + 1];
  // quads split along (0,0)-(1,1)
  if (fx > fz) return h00 + (h10 - h00) * fx + (h11 - h10) * fz;
  return h00 + (h01 - h00) * fz + (h11 - h01) * fx;
}
function normalAt(x, z, out = new V3()) {
  const e = 1;
  const hx = heightAt(x + e, z) - heightAt(x - e, z), hz = heightAt(x, z + e) - heightAt(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}
// Ray vs terrain: returns distance or -1
function rayTerrain(o, d, maxD = 200) {
  let t = 0, step = 0.5, prev = o.y - heightAt(o.x, o.z);
  if (prev < 0) return 0;
  while (t < maxD) {
    const nt = t + step;
    const x = o.x + d.x * nt, y = o.y + d.y * nt, z = o.z + d.z * nt;
    if (Math.abs(x) > WORLD.half || Math.abs(z) > WORLD.half) return -1;
    const cur = y - heightAt(x, z);
    if (cur <= 0) {
      let a = t, b = nt;
      for (let i = 0; i < 8; i++) { const m = (a + b) / 2; const yy = o.y + d.y * m - heightAt(o.x + d.x * m, o.z + d.z * m); if (yy > 0) a = m; else b = m; }
      return (a + b) / 2;
    }
    t = nt; prev = cur;
    step = Math.min(2, 0.5 + t * 0.02);
  }
  return -1;
}

// ---------- terrain edits ----------
function editTerrain(x, z, r, fn) {
  const N = W.N, half = WORLD.half, H = W.H;
  const i0 = Math.max(1, Math.floor(x - r + half)), i1 = Math.min(N - 2, Math.ceil(x + r + half));
  const j0 = Math.max(1, Math.floor(z - r + half)), j1 = Math.min(N - 2, Math.ceil(z + r + half));
  let changed = false;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const d = Math.hypot(i - half - x, j - half - z);
    if (d > r) continue;
    const k = j * N + i, nh = fn(H[k], d / r, i - half, j - half);
    if (nh !== H[k] && isFinite(nh)) { if (!W.orig.has(k)) W.orig.set(k, H[k]); H[k] = nh; W.mods.set(k, nh); changed = true; }
  }
  if (changed) dirtyTerrain(x, z, r);
  return changed;
}
function paintTerrain(x, z, r, type) {
  const N = W.N, half = WORLD.half;
  const i0 = Math.max(0, Math.floor(x - r + half)), i1 = Math.min(N - 1, Math.ceil(x + r + half));
  const j0 = Math.max(0, Math.floor(z - r + half)), j1 = Math.min(N - 1, Math.ceil(z + r + half));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (Math.hypot(i - half - x, j - half - z) > r) continue;
    const k = j * N + i;
    if (W.paint[k] !== type) { W.paint[k] = type; W.paintMods.set(k, type); }
  }
  dirtyTerrain(x, z, r);
}
function paintAt(x, z) { const N = W.N, i = clamp(Math.round(x + WORLD.half), 0, N - 1), j = clamp(Math.round(z + WORLD.half), 0, N - 1); return W.paint[j * N + i]; }
function dirtyTerrain(x, z, r) {
  const half = WORLD.half;
  const c0 = Math.max(0, Math.floor((x - r - 1 + half) / CH)), c1 = Math.min(NCH - 1, Math.floor((x + r + 1 + half) / CH));
  const d0 = Math.max(0, Math.floor((z - r - 1 + half) / CH)), d1 = Math.min(NCH - 1, Math.floor((z + r + 1 + half) / CH));
  for (let j = d0; j <= d1; j++) for (let i = c0; i <= c1; i++) { const c = W.chunks[j * NCH + i]; if (c) c.dirty = true; }
  bus.emit('terrain', x, z, r);
}

// ---------- terrain meshes ----------
const T_COL = {
  grass: hex3(0x5f8a36), grass2: hex3(0x7a9a42), forest: hex3(0x3e5a2b), forest2: hex3(0x53492f), rock: hex3(0x7b7a72), rock2: hex3(0x5f6160),
  sand: hex3(0xcbb98a), wetsand: hex3(0x8d7d58), dirt: hex3(0x6b5436), paved: hex3(0x737069), seabed: hex3(0x5c5a48),
};
let terrainMat;
function initTerrain() {
  terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  terrainMat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vWP;\nfloat th(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }\n' + sh.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float gn = th(floor(vWP.xz * 3.0)) * 0.6 + th(floor(vWP.xz * 0.9)) * 0.4;
      diffuseColor.rgb *= 0.9 + gn * 0.2;`);
  };
  W.chunks = [];
  for (let j = 0; j < NCH; j++) for (let i = 0; i < NCH; i++) W.chunks.push({ i, j, x0: i * CH - WORLD.half, z0: j * CH - WORLD.half, mesh: null, lod: -1, dirty: false });
  R.terrainGroup = new THREE.Group();
  R.scene.add(R.terrainGroup);
}
function vertColor(x, z, h, ny, out, o) {
  const f = forestAt(x, z), p = paintAt(x, z);
  const n1 = Noise.s2(x / 23, z / 23) * 0.5 + 0.5, n2 = Noise.s2(x / 7 + 40, z / 7) * 0.5 + 0.5;
  let r, g, b;
  const gm = T_COL.grass, gm2 = T_COL.grass2, fo = T_COL.forest, fo2 = T_COL.forest2;
  const t = n1 * 0.7 + n2 * 0.3;
  const mr = lerp(gm[0], gm2[0], t), mg = lerp(gm[1], gm2[1], t), mb = lerp(gm[2], gm2[2], t);
  const fr = lerp(fo[0], fo2[0], t * t), fg = lerp(fo[1], fo2[1], t * t), fb = lerp(fo[2], fo2[2], t * t);
  r = lerp(mr, fr, f); g = lerp(mg, fg, f); b = lerp(mb, fb, f);
  // beaches and the sea floor
  const sandT = 1 - smooth(1.0, 2.4 + n2, h);
  if (sandT > 0) { const s = h < 0 ? T_COL.wetsand : T_COL.sand; r = lerp(r, s[0], sandT); g = lerp(g, s[1], sandT); b = lerp(b, s[2], sandT); }
  if (h < -3) { const tt = smooth(-3, -10, h); r = lerp(r, T_COL.seabed[0], tt); g = lerp(g, T_COL.seabed[1], tt); b = lerp(b, T_COL.seabed[2], tt); }
  // cliffs
  const rk = smooth(0.82, 0.68, ny);
  if (rk > 0) { const c = n2 > 0.5 ? T_COL.rock : T_COL.rock2; r = lerp(r, c[0], rk); g = lerp(g, c[1], rk); b = lerp(b, c[2], rk); }
  if (p === 1 || p === 3) { const c = T_COL.dirt; r = lerp(r, c[0], 0.85); g = lerp(g, c[1], 0.85); b = lerp(b, c[2], 0.85); }
  else if (p === 2) { const c = T_COL.paved; const v = 0.85 + 0.15 * ((Math.floor(x) + Math.floor(z)) & 1); r = c[0] * v; g = c[1] * v; b = c[2] * v; }
  out[o] = r; out[o + 1] = g; out[o + 2] = b;
}
function buildChunk(c, lod) {
  const step = 1 << lod, n = CH / step + 1, N = W.N, half = WORLD.half, H = W.H;
  const nv = n * n + 4 * n; // + skirt
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
  const gi0 = c.x0 + half, gj0 = c.z0 + half;
  const hAt = (gi, gj) => H[clamp(gj, 0, N - 1) * N + clamp(gi, 0, N - 1)];
  let o = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const gi = gi0 + i * step, gj = gj0 + j * step;
    const h = hAt(gi, gj);
    const nx = hAt(gi - step, gj) - hAt(gi + step, gj), nz = hAt(gi, gj - step) - hAt(gi, gj + step), ny = 2 * step;
    const l = Math.hypot(nx, ny, nz);
    pos[o] = i * step; pos[o + 1] = h; pos[o + 2] = j * step;
    nor[o] = nx / l; nor[o + 1] = ny / l; nor[o + 2] = nz / l;
    vertColor(c.x0 + i * step, c.z0 + j * step, h, ny / l, col, o);
    o += 3;
  }
  const idx = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
    idx.push(a, e, b, a, d, e);
  }
  // skirts hide cracks between LODs
  const skirt = 2 + step * 1.5;
  const edges = [[(k) => k, 0], [(k) => (n - 1) * n + k, 1], [(k) => k * n, 2], [(k) => k * n + n - 1, 3]];
  let base = n * n;
  for (const [f, side] of edges) {
    for (let k = 0; k < n; k++) {
      const s = f(k) * 3;
      pos[o] = pos[s]; pos[o + 1] = pos[s + 1] - skirt; pos[o + 2] = pos[s + 2];
      nor[o] = nor[s]; nor[o + 1] = nor[s + 1]; nor[o + 2] = nor[s + 2];
      col[o] = col[s]; col[o + 1] = col[s + 1]; col[o + 2] = col[s + 2];
      o += 3;
    }
    for (let k = 0; k < n - 1; k++) {
      const a = f(k), b = f(k + 1), sa = base + k, sb = base + k + 1;
      if (side === 0 || side === 3) idx.push(a, b, sb, a, sb, sa); else idx.push(a, sb, b, a, sa, sb);
    }
    base += n;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  if (c.mesh) { c.mesh.geometry.dispose(); c.mesh.geometry = g; }
  else {
    c.mesh = new THREE.Mesh(g, terrainMat);
    c.mesh.position.set(c.x0, 0, c.z0);
    c.mesh.receiveShadow = true;
    c.mesh.matrixAutoUpdate = false; c.mesh.updateMatrix();
    R.terrainGroup.add(c.mesh);
  }
  c.lod = lod; c.dirty = false;
}
function updateTerrain(cx, cz, budget = 3) {
  const view = SETTINGS.view + 60;
  const list = [];
  for (const c of W.chunks) {
    const mx = c.x0 + CH / 2, mz = c.z0 + CH / 2;
    const d = Math.max(0, Math.hypot(mx - cx, mz - cz) - CH * 0.7);
    if (d > view) { if (c.mesh) c.mesh.visible = false; continue; }
    const lod = d < 60 ? 0 : d < 160 ? 1 : d < 320 ? 2 : 3;
    if (c.mesh) c.mesh.visible = true;
    if (!c.mesh || c.lod !== lod || c.dirty) list.push([c, lod, d + (c.mesh ? 1000 : 0)]);
  }
  list.sort((a, b) => a[2] - b[2]);
  for (let k = 0; k < list.length && k < budget; k++) buildChunk(list[k][0], list[k][1]);
  return list.length;
}

// ---------- water ----------
const WAVE = { amp: { value: 0.25 }, t: { value: 0 } };
function waveH(x, z, t = WAVE.t.value) {
  const a = WAVE.amp.value;
  return a * (Math.sin(x * 0.09 + t * 0.9) * 0.6 + Math.sin(z * 0.11 - t * 1.1) * 0.5 + Math.sin((x + z) * 0.21 + t * 1.7) * 0.25);
}
function initWater() {
  // shore texture: terrain height encoded in 8 bits (−20…+5 m)
  const C = W.C, data = new Uint8Array(C * C);
  for (let k = 0; k < C * C; k++) data[k] = clamp((W.h4[k] + 20) / 25, 0, 1) * 255;
  const tex = new THREE.DataTexture(data, C, C, THREE.LuminanceFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  W.shoreTex = tex;
  const segs = 160, size = 1400;
  const g = new THREE.PlaneGeometry(size, size, segs, segs);
  g.rotateX(-Math.PI / 2);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uT: WAVE.t, uAmp: WAVE.amp, uShore: { value: tex }, uSun: { value: new V3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) },
    uDeep: { value: new THREE.Color(0x163845) }, uShallow: { value: new THREE.Color(0x3f8c84) }, uSky: { value: new THREE.Color(0xa0c0d0) }, uDark: { value: 0 },
  }]);
  uniforms.uT = WAVE.t; uniforms.uAmp = WAVE.amp; uniforms.uShore.value = tex;
  const m = new THREE.ShaderMaterial({
    uniforms, transparent: true, fog: true, depthWrite: false,
    vertexShader: `
      uniform float uT, uAmp; varying vec3 vWP; varying vec3 vN;
      #include <fog_pars_vertex>
      float wv(vec2 p){ return uAmp * (sin(p.x*0.09+uT*0.9)*0.6 + sin(p.y*0.11-uT*1.1)*0.5 + sin((p.x+p.y)*0.21+uT*1.7)*0.25); }
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float e = 0.6;
        wp.y = wv(wp.xz);
        float hx = wv(wp.xz + vec2(e,0.0)) - wv(wp.xz - vec2(e,0.0)), hz = wv(wp.xz + vec2(0.0,e)) - wv(wp.xz - vec2(0.0,e));
        vN = normalize(vec3(-hx, 2.0*e, -hz));
        vWP = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uT, uDark; uniform sampler2D uShore; uniform vec3 uSun, uSunCol, uDeep, uShallow, uSky; varying vec3 vWP; varying vec3 vN;
      #include <fog_pars_fragment>
      float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x), mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 suv = (vWP.xz + 1024.0) / 2048.0;
        float th = texture2D(uShore, suv).r * 25.0 - 20.0;
        float depth = max(-th, 0.0);
        vec2 q = vWP.xz * 0.35;
        float a = n2(q + vec2(uT*0.3, uT*0.2)), b = n2(q*1.7 - vec2(uT*0.25, -uT*0.31));
        vec3 n = normalize(vN + vec3(a - 0.5, 0.0, b - 0.5) * 0.35);
        vec3 V = normalize(cameraPosition - vWP);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 col = mix(uShallow, uDeep, smoothstep(0.5, 9.0, depth));
        col = mix(col, uSky, fres * 0.6);
        vec3 Hh = normalize(uSun + V);
        col += uSunCol * pow(max(dot(n, Hh), 0.0), 120.0) * 1.4 * (1.0 - uDark);
        float foam = smoothstep(1.4, 0.2, depth) * (0.55 + 0.45 * sin(depth * 6.0 - uT * 2.2 + a * 3.0));
        foam *= step(0.35, n2(vWP.xz * 1.3 + uT * 0.4) + 0.2);
        col = mix(col, vec3(0.92, 0.95, 0.95) * (1.0 - uDark * 0.7), clamp(foam, 0.0, 1.0) * 0.75);
        float alpha = mix(0.55, 0.93, smoothstep(0.0, 4.0, depth));
        alpha = max(alpha, fres * 0.9);
        gl_FragColor = vec4(col, alpha);
        #include <fog_fragment>
      }`,
  });
  const water = new THREE.Mesh(g, m);
  water.frustumCulled = false; water.renderOrder = 2;
  R.scene.add(water); R.water = water;
}
function refreshShoreTex(x, z, r) {
  // only the coarse grid near an edit
  const C = W.C, half = WORLD.half, tex = W.shoreTex;
  const i0 = Math.max(0, Math.floor((x - r + half) / 4)), i1 = Math.min(C - 1, Math.ceil((x + r + half) / 4));
  const j0 = Math.max(0, Math.floor((z - r + half) / 4)), j1 = Math.min(C - 1, Math.ceil((z + r + half) / 4));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) tex.image.data[j * C + i] = clamp((heightAt(i * 4 - half, j * 4 - half) + 20) / 25, 0, 1) * 255;
  tex.needsUpdate = true;
}
function updateWater(cam) {
  const s = 1400 / 160;
  R.water.position.set(Math.round(cam.x / s) * s, 0, Math.round(cam.z / s) * s);
}
