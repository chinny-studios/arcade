// Act of God — water and lava. Both are height fields on the terrain grid moved by a virtual-pipe model: every cell
// keeps an outflow to each neighbour that grows with the difference in surface height. The sea at the world's edge is
// held at sea level (raised for a tsunami); shields and parted water block cells. Lava is slow and thick, cools from
// orange to black crust, and when cold becomes part of the terrain.

const WMAT = new THREE.ShaderMaterial({
  uniforms: U,
  transparent: true, depthWrite: false,
  vertexShader: `attribute float aD; attribute float aMud; attribute float aFoam; varying vec3 vW; varying float vD; varying float vMud; varying float vFoam;
    void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vD = aD; vMud = aMud; vFoam = aFoam; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: GLSL_COMMON + `varying vec3 vW; varying float vD; varying float vMud; varying float vFoam;
    void main() {
      if (vD < 0.02) discard;
      float t = uTime;
      vec2 p = vW.xz;
      // ripples: a few oblique waves, so no grid shows
      vec2 d1 = vec2(0.83, 0.56), d2 = vec2(-0.41, 0.91), d3 = vec2(0.97, -0.24), d4 = vec2(-0.7, -0.71);
      float a1 = dot(p, d1) * 0.09 + t * 1.1, a2 = dot(p, d2) * 0.13 - t * 1.4, a3 = dot(p, d3) * 0.27 + t * 2.2, a4 = dot(p, d4) * 0.41 - t * 2.9;
      vec2 g = d1 * cos(a1) * 0.09 + d2 * cos(a2) * 0.13 * 0.8 + d3 * cos(a3) * 0.27 * 0.4 + d4 * cos(a4) * 0.41 * 0.25;
      vec3 n = normalize(vec3(g.x * 0.35, 1.0, g.y * 0.35));
      vec3 vd = normalize(cameraPosition - vW);
      float fr = pow(1.0 - max(dot(vd, n), 0.0), 4.0);
      vec3 deep = vec3(0.02, 0.1, 0.16), shallow = vec3(0.12, 0.3, 0.34);
      vec3 col = mix(shallow, deep, smoothstep(0.5, 14.0, vD));
      col = mix(col, vec3(0.3, 0.24, 0.15), vMud * 0.85);
      vec3 c = col * (mix(uGnd, uSky, 0.7) + uSunCol * 0.45 * max(uSun.y, 0.0));
      c = mix(c, mix(uFog, uSky * 1.1, 0.5), fr * 0.5);
      vec3 h = normalize(uSun + vd);
      c += uSunCol * pow(max(dot(n, h), 0.0), 90.0) * 0.45;
      c = mix(c, vec3(0.85, 0.88, 0.9) * (mix(uGnd, uSky, 0.7) + uSunCol * 0.5), clamp(vFoam, 0.0, 1.0) * (0.55 + 0.25 * sin(p.x * 0.21 + p.y * 0.17 + t * 3.0)));
      float a = smoothstep(0.02, 0.9, vD) * mix(0.82, 0.95, smoothstep(1.0, 8.0, vD));
      a = max(a, fr * 0.6 * step(0.05, vD));
      gl_FragColor = vec4(fogit(c, vW), a);
    }`,
});
const LMAT = new THREE.ShaderMaterial({
  uniforms: U,
  vertexShader: `attribute float aL; attribute float aT; varying vec3 vW; varying float vL; varying float vT; varying vec3 vN;
    void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vL = aL; vT = aT; vN = normal; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: GLSL_COMMON + `varying vec3 vW; varying float vL; varying float vT; varying vec3 vN;
    void main() {
      if (vL < 0.05) discard;
      float n1 = h21(floor(vW.xz * 0.35));
      float cr = sin(vW.x * 0.6 + uTime * 0.4) * sin(vW.z * 0.55 - uTime * 0.3);
      float hot = clamp(vT * (1.1 + 0.3 * cr) - 0.15 * n1, 0.0, 1.0);
      vec3 crust = vec3(0.07, 0.06, 0.055) * (0.8 + 0.4 * n1);
      vec3 c = lit(crust, normalize(vN));
      vec3 glow = mix(vec3(0.8, 0.1, 0.0), vec3(1.0, 0.75, 0.2), hot * hot);
      c = mix(c, glow * 1.6, smoothstep(0.08, 0.6, hot));
      gl_FragColor = vec4(fogit(c, vW), 1.0);
    }`,
});

const WATER = {
  d: null, f: null, b: null, blk: null, mesh: null, sea: 0, seaT: 0, acc: 0, quiet: 0, asleep: false, maxV: null,
  L: null, T: null, lf: null, lmesh: null, lacc: 0, lavaOn: false, lavaQuiet: 0, flooded: 0, sources: [],
  wake() { this.asleep = false; this.quiet = 0; },
};

function buildWater() {
  const V = W.V, n = V * V;
  for (const k of ['mesh', 'lmesh']) if (WATER[k]) { R.scene.remove(WATER[k]); WATER[k].geometry.dispose(); }
  WATER.d = new Float32Array(n); WATER.f = new Float32Array(n * 4); WATER.blk = new Uint8Array(n); WATER.spd = new Float32Array(n);
  WATER.L = new Float32Array(n); WATER.T = new Float32Array(n); WATER.lf = new Float32Array(n * 4);
  WATER.sea = 0; WATER.seaT = 0; WATER.asleep = false; WATER.quiet = 0; WATER.lavaOn = false; WATER.sources = [];
  for (let k = 0; k < n; k++) WATER.d[k] = Math.max(0, -W.h[k]);
  WATER.edge = new Uint8Array(n);
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) if (i === 0 || j === 0 || i === V - 1 || j === V - 1) WATER.edge[j * V + i] = W.h0[j * V + i] < 0 ? 1 : 2;
  // meshes share the terrain grid's index
  const idx = TER.mesh.geometry.index;
  const mk = (names) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    for (const nm of names) g.setAttribute(nm, new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setIndex(idx);
    const p = g.attributes.position.array;
    for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) { const k = (j * V + i) * 3; p[k] = i * W.cs; p[k + 2] = j * W.cs; }
    return g;
  };
  WATER.mesh = new THREE.Mesh(mk(['aD', 'aMud', 'aFoam']), WMAT);
  WATER.mesh.frustumCulled = false; WATER.mesh.renderOrder = 3;
  R.scene.add(WATER.mesh);
  const lg = mk(['aL', 'aT']);
  lg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  WATER.lmesh = new THREE.Mesh(lg, LMAT);
  WATER.lmesh.frustumCulled = false;
  R.scene.add(WATER.lmesh);
  waterMesh(); lavaMesh();
}

// one step of the virtual-pipe model for water (dt in seconds)
function waterStep(dt) {
  const V = W.V, cs = W.cs, A = cs * cs, h = W.h, d = WATER.d, f = WATER.f, blk = WATER.blk, edge = WATER.edge, L = WATER.L;
  const gk = dt * 9.81 * cs, damp = 0.995;
  let change = 0;
  // fixed edges: sea held at sea level, land edges drain away
  for (let k = 0; k < V * V; k++) {
    const e = edge[k];
    if (!e) continue;
    if (e === 1) d[k] = Math.max(0, WATER.sea - h[k]);
    else if (d[k] > 0) d[k] *= 0.9;
  }
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const k = j * V + i, o = k * 4;
    if (blk[k] || (d[k] <= 0 && f[o] + f[o + 1] + f[o + 2] + f[o + 3] === 0)) { f[o] = f[o + 1] = f[o + 2] = f[o + 3] = 0; if (d[k] <= 0) continue; }
    if (blk[k]) continue;
    const H = h[k] + L[k] + d[k];
    let q = k - 1;
    f[o] = i > 0 && !blk[q] ? Math.max(0, f[o] * damp + gk * (H - h[q] - L[q] - d[q])) : 0;
    q = k + 1;
    f[o + 1] = i < V - 1 && !blk[q] ? Math.max(0, f[o + 1] * damp + gk * (H - h[q] - L[q] - d[q])) : 0;
    q = k - V;
    f[o + 2] = j > 0 && !blk[q] ? Math.max(0, f[o + 2] * damp + gk * (H - h[q] - L[q] - d[q])) : 0;
    q = k + V;
    f[o + 3] = j < V - 1 && !blk[q] ? Math.max(0, f[o + 3] * damp + gk * (H - h[q] - L[q] - d[q])) : 0;
    const out = (f[o] + f[o + 1] + f[o + 2] + f[o + 3]) * dt;
    if (out > d[k] * A && out > 0) { const s = d[k] * A / out; f[o] *= s; f[o + 1] *= s; f[o + 2] *= s; f[o + 3] *= s; }
  }
  const spd = WATER.spd;
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const k = j * V + i, o = k * 4;
    if (blk[k]) { d[k] = 0; continue; }
    const inflow = (i > 0 ? f[(k - 1) * 4 + 1] : 0) + (i < V - 1 ? f[(k + 1) * 4] : 0) + (j > 0 ? f[(k - V) * 4 + 3] : 0) + (j < V - 1 ? f[(k + V) * 4 + 2] : 0);
    const outflow = f[o] + f[o + 1] + f[o + 2] + f[o + 3];
    const dd = dt * (inflow - outflow) / A;
    if (dd !== 0) { d[k] = Math.max(0, d[k] + dd); change += Math.abs(dd); }
    spd[k] = d[k] > 0.05 ? (outflow + inflow) * 0.5 / (cs * Math.max(d[k], 0.3)) : 0;
  }
  return change;
}
// lava: the same model, much thicker, only flowing over a yield height, and cooling
function lavaStep(dt) {
  const V = W.V, cs = W.cs, A = cs * cs, h = W.h, L = WATER.L, T = WATER.T, f = WATER.lf, d = WATER.d;
  const gk = dt * 9.81 * cs * 0.05, damp = 0.85, yieldH = 0.25;
  let any = 0, solid = null;
  for (let j = 1; j < V - 1; j++) for (let i = 1; i < V - 1; i++) {
    const k = j * V + i, o = k * 4;
    if (L[k] <= 0.001) { f[o] = f[o + 1] = f[o + 2] = f[o + 3] = 0; continue; }
    any++;
    const vis = 0.2 + 0.8 * T[k]; // cold lava barely moves
    const H = h[k] + L[k];
    const fl = (kk) => { const dh = H - (h[kk] + L[kk]); return dh > yieldH ? dh - yieldH : 0; };
    f[o] = Math.max(0, f[o] * damp + gk * vis * fl(k - 1)); f[o + 1] = Math.max(0, f[o + 1] * damp + gk * vis * fl(k + 1));
    f[o + 2] = Math.max(0, f[o + 2] * damp + gk * vis * fl(k - V)); f[o + 3] = Math.max(0, f[o + 3] * damp + gk * vis * fl(k + V));
    const out = (f[o] + f[o + 1] + f[o + 2] + f[o + 3]) * dt;
    if (out > L[k] * A) { const s = L[k] * A / out; f[o] *= s; f[o + 1] *= s; f[o + 2] *= s; f[o + 3] *= s; }
  }
  if (!any) return 0;
  for (let j = 1; j < V - 1; j++) for (let i = 1; i < V - 1; i++) {
    const k = j * V + i, o = k * 4;
    const inflow = f[(k - 1) * 4 + 1] + f[(k + 1) * 4] + f[(k - V) * 4 + 3] + f[(k + V) * 4 + 2];
    const outflow = f[o] + f[o + 1] + f[o + 2] + f[o + 3];
    if (inflow === 0 && outflow === 0 && L[k] <= 0) continue;
    const L0 = L[k];
    L[k] = Math.max(0, L[k] + dt * (inflow - outflow) / A);
    // temperature mixes with what flows in, and falls with time (fast in water)
    if (L[k] > 0.001) {
      const tin = inflow > 0 ? (f[(k - 1) * 4 + 1] * T[k - 1] + f[(k + 1) * 4] * T[k + 1] + f[(k - V) * 4 + 3] * T[k - V] + f[(k + V) * 4 + 2] * T[k + V]) / inflow : T[k];
      const add = Math.max(0, L[k] - L0);
      T[k] = (T[k] * Math.max(0, L0 - outflow * dt / A) + tin * add) / Math.max(1e-4, L[k]);
      T[k] -= dt * (0.012 + 0.04 / (1 + L[k]) + (d[k] > 0.2 ? 0.5 : 0));
      if (d[k] > 0.2) { d[k] = Math.max(0, d[k] - dt * 0.6); if (Math.random() < 0.02) bus.emit('steam', (k % V) * cs, h[k] + L[k], Math.floor(k / V) * cs); }
      if (T[k] <= 0) { T[k] = 0; (solid || (solid = [])).push(k); }
    } else T[k] = 0;
  }
  // cold lava becomes rock
  if (solid) {
    let i0 = V, j0 = V, i1 = 0, j1 = 0;
    for (const k of solid) {
      W.h[k] += L[k]; L[k] = 0;
      const i = k % V, j = (k / V) | 0; i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j);
      W.ov[k * 4 + 1] = Math.max(W.ov[k * 4 + 1], 200);
    }
    W.ovDirty = true;
    terrainTouch(i0, j0, i1, j1);
  }
  return any;
}
function waterUpdate(dt) {
  // tsunami: the sea level eases back after the wave
  if (WATER.seaT > 0) { WATER.seaT -= dt; if (WATER.seaT <= 0) WATER.seaTarget = 0; }
  if (TER.skirtSea) TER.skirtSea.position.y = WATER.sea;
  if (WATER.seaTarget !== undefined) { WATER.sea = damp(WATER.sea, WATER.seaTarget, WATER.seaTarget > WATER.sea ? 1.5 : 0.25, dt); if (Math.abs(WATER.sea - WATER.seaTarget) > 0.01) WATER.wake(); }
  for (const s of WATER.sources) { addWater(s.x, s.z, s.r, s.rate * dt); }
  WATER.sources = WATER.sources.filter((s) => (s.t -= dt) > 0);
  if (!WATER.asleep) {
    const st = 0.05;
    WATER.acc = Math.min(WATER.acc + dt * 2.2, st * 6);
    let ch = 0, steps = 0;
    while (WATER.acc >= st) { ch += waterStep(st); WATER.acc -= st; steps++; }
    if (steps) {
      waterMesh();
      if (ch < 0.5) { WATER.quiet += dt; if (WATER.quiet > 4 && !WATER.sources.length) WATER.asleep = true; } else WATER.quiet = 0;
    }
  }
  if (WATER.lavaOn) {
    WATER.lacc = Math.min(WATER.lacc + dt * 1.5, 0.6);
    let any = 0;
    while (WATER.lacc >= 0.1) { any = lavaStep(0.1); WATER.lacc -= 0.1; }
    lavaMesh();
    if (!any) WATER.lavaOn = false;
  }
}
const _mudMin = 0.3;
function waterMesh() {
  const V = W.V, g = WATER.mesh.geometry, p = g.attributes.position.array, aD = g.attributes.aD.array, aM = g.attributes.aMud.array, aF = g.attributes.aFoam.array;
  const h = W.h, h0 = W.h0, d = WATER.d, L = WATER.L, spd = WATER.spd;
  let flooded = 0;
  for (let k = 0; k < V * V; k++) {
    const dk = d[k], base = h[k] + L[k];
    p[k * 3 + 1] = dk > 0.02 ? base + dk : base - 0.4;
    aD[k] = dk;
    const m = h0[k] > _mudMin ? 1 : 0;
    aM[k] = m * smooth(0, 1.5, dk);
    if (m && dk > 0.4) flooded++;
    aF[k] = clamp((spd[k] - 1.5) * 0.25, 0, 1);
  }
  WATER.flooded = flooded;
  g.attributes.position.needsUpdate = true; g.attributes.aD.needsUpdate = true; g.attributes.aMud.needsUpdate = true; g.attributes.aFoam.needsUpdate = true;
}
function lavaMesh() {
  const V = W.V, g = WATER.lmesh.geometry, p = g.attributes.position.array, aL = g.attributes.aL.array, aT = g.attributes.aT.array, nor = g.attributes.normal.array;
  const h = W.h, L = WATER.L, T = WATER.T, cs = W.cs;
  for (let k = 0; k < V * V; k++) { p[k * 3 + 1] = L[k] > 0.05 ? h[k] + L[k] : h[k] - 0.5; aL[k] = L[k]; aT[k] = T[k]; }
  for (let j = 1; j < V - 1; j++) for (let i = 1; i < V - 1; i++) {
    const k = j * V + i, nx = p[(k - 1) * 3 + 1] - p[(k + 1) * 3 + 1], nz = p[(k - V) * 3 + 1] - p[(k + V) * 3 + 1], ny = 2 * cs, l = Math.hypot(nx, ny, nz);
    nor[k * 3] = nx / l; nor[k * 3 + 1] = ny / l; nor[k * 3 + 2] = nz / l;
  }
  for (const k of ['position', 'aL', 'aT', 'normal']) g.attributes[k].needsUpdate = true;
}

// ---------- queries and edits ----------
const cellK = (x, z) => clamp(Math.round(z / W.cs), 0, W.V - 1) * W.V + clamp(Math.round(x / W.cs), 0, W.V - 1);
function waterDepth(x, z) { return WATER.d[cellK(x, z)]; }
function waterSpeed(x, z) { return WATER.spd[cellK(x, z)]; }
function lavaAt(x, z) { const k = cellK(x, z); return WATER.L[k] > 0.15 ? WATER.T[k] : 0; }
function waterSurface(x, z) { const k = cellK(x, z); return WATER.d[k] > 0.02 ? W.h[k] + WATER.L[k] + WATER.d[k] : -Infinity; }
// adds `vol` metres of water depth spread over a disc (more in the middle)
function addWater(x, z, r, depth) {
  const cs = W.cs, V = W.V;
  const i0 = clamp(Math.floor((x - r) / cs), 1, V - 2), i1 = clamp(Math.ceil((x + r) / cs), 1, V - 2);
  const j0 = clamp(Math.floor((z - r) / cs), 1, V - 2), j1 = clamp(Math.ceil((z + r) / cs), 1, V - 2);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dd = dist(i * cs, j * cs, x, z);
    if (dd > r) continue;
    const k = j * V + i;
    if (!WATER.blk[k]) WATER.d[k] += depth * (1 - smooth(r * 0.3, r, dd));
  }
  WATER.wake();
}
function removeWater(x, z, r, rate) {
  const cs = W.cs, V = W.V;
  const i0 = clamp(Math.floor((x - r) / cs), 0, V - 1), i1 = clamp(Math.ceil((x + r) / cs), 0, V - 1);
  const j0 = clamp(Math.floor((z - r) / cs), 0, V - 1), j1 = clamp(Math.ceil((z + r) / cs), 0, V - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * V + i;
    if (dist(i * cs, j * cs, x, z) > r || W.h0[k] < 0.2) continue; // the sea and rivers stay
    WATER.d[k] = Math.max(0, WATER.d[k] - rate);
  }
  WATER.wake();
}
function addLava(x, z, r, depth, temp = 1) {
  const cs = W.cs, V = W.V;
  const i0 = clamp(Math.floor((x - r) / cs), 1, V - 2), i1 = clamp(Math.ceil((x + r) / cs), 1, V - 2);
  const j0 = clamp(Math.floor((z - r) / cs), 1, V - 2), j1 = clamp(Math.ceil((z + r) / cs), 1, V - 2);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dd = dist(i * cs, j * cs, x, z);
    if (dd > r) continue;
    const k = j * V + i, a = depth * (1 - smooth(r * 0.2, r, dd));
    if (a <= 0 || WATER.blk[k]) continue;
    WATER.T[k] = (WATER.T[k] * WATER.L[k] + temp * a) / (WATER.L[k] + a);
    WATER.L[k] += a;
  }
  WATER.lavaOn = true;
}
// cools lava near a point (Quench); it hardens on the next lava step
function coolLava(x, z, r, amt) {
  const cs = W.cs, V = W.V;
  const i0 = clamp(Math.floor((x - r) / cs), 1, V - 2), i1 = clamp(Math.ceil((x + r) / cs), 1, V - 2);
  const j0 = clamp(Math.floor((z - r) / cs), 1, V - 2), j1 = clamp(Math.ceil((z + r) / cs), 1, V - 2);
  let n = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * V + i; if (WATER.L[k] > 0 && dist(i * cs, j * cs, x, z) <= r) { WATER.T[k] = Math.max(0, WATER.T[k] - amt); n++; } }
  if (n) WATER.lavaOn = true;
  return n;
}
// blocks or frees cells in a disc (shields) or along a strip (parting)
function setBlockedDisc(x, z, r, v) {
  const cs = W.cs, V = W.V;
  const i0 = clamp(Math.floor((x - r) / cs), 1, V - 2), i1 = clamp(Math.ceil((x + r) / cs), 1, V - 2);
  const j0 = clamp(Math.floor((z - r) / cs), 1, V - 2), j1 = clamp(Math.ceil((z + r) / cs), 1, V - 2);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (dist(i * cs, j * cs, x, z) <= r) WATER.blk[j * V + i] += v;
  WATER.wake();
}
function setBlockedStrip(ax, az, bx, bz, hw, v) {
  const cs = W.cs, V = W.V, L = Math.max(1, dist(ax, az, bx, bz)), dx = (bx - ax) / L, dz = (bz - az) / L;
  const i0 = clamp(Math.floor((Math.min(ax, bx) - hw) / cs), 1, V - 2), i1 = clamp(Math.ceil((Math.max(ax, bx) + hw) / cs), 1, V - 2);
  const j0 = clamp(Math.floor((Math.min(az, bz) - hw) / cs), 1, V - 2), j1 = clamp(Math.ceil((Math.max(az, bz) + hw) / cs), 1, V - 2);
  const cells = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const px = i * cs - ax, pz = j * cs - az, t = clamp(px * dx + pz * dz, 0, L);
    if (dist(px, pz, t * dx, t * dz) <= hw) { WATER.blk[j * V + i] += v; cells.push(j * V + i); }
  }
  WATER.wake();
  return cells;
}
// volume-preserving push of water out of blocked cells into the nearest free neighbours
function pushOutBlocked(cells) {
  const V = W.V;
  for (const k of cells) {
    const vol = WATER.d[k];
    if (vol <= 0) continue;
    WATER.d[k] = 0;
    const nb = [k - 1, k + 1, k - V, k + V].filter((q) => q > 0 && q < V * V && !WATER.blk[q]);
    for (const q of nb) WATER.d[q] += vol / nb.length;
  }
}
