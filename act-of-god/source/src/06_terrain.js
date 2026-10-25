// Act of God — the terrain mesh draped with the painted ground texture, the overlay texture (snow, scorch, power, vegetation)
// at terrain-grid resolution, the low-detail land and sea outside the world, and terrain edits (craters, cones, raising).

const TMAT = new THREE.ShaderMaterial({
  uniforms: Object.assign({ uMap: { value: null }, uOv: { value: null }, uRoad: { value: null }, uM: { value: 1 }, uCs: { value: 1 }, uV: { value: 1 }, uSnowLine: { value: 300 }, uRock: { value: new THREE.Color() } }, U),
  vertexShader: `varying vec3 vW; varying vec3 vN;
    void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: GLSL_COMMON + `
    uniform sampler2D uMap; uniform sampler2D uOv; uniform sampler2D uRoad; uniform float uM; uniform float uCs; uniform float uV; uniform float uSnowLine; uniform vec3 uRock;
    varying vec3 vW; varying vec3 vN;
    void main() {
      vec3 n = normalize(vN);
      vec2 uv = vW.xz / uM;
      vec3 base = texture2D(uMap, uv).rgb;
      vec4 ov = texture2D(uOv, (vW.xz / uCs + 0.5) / uV);
      float road = texture2D(uRoad, uv).r;
      float nz = h21(floor(vW.xz * 0.5));
      float green = clamp((base.g - max(base.r, base.b)) * 7.0, 0.0, 1.0);
      float veg = ov.a * 2.0 - 1.0;
      base = mix(base, base * vec3(1.5, 1.08, 0.62) + vec3(0.07, 0.03, 0.0), green * max(-veg, 0.0));
      base = mix(base, base * vec3(0.78, 1.22, 0.72), green * max(veg, 0.0));
      float sl = 1.0 - n.y;
      base = mix(base, uRock * (0.9 + 0.2 * nz), smoothstep(0.3, 0.55, sl) * (1.0 - road));
      float sn = smoothstep(uSnowLine, uSnowLine + 40.0, vW.y + nz * 25.0) * (1.0 - smoothstep(0.55, 0.85, sl));
      base = mix(base, vec3(0.92, 0.93, 0.96), sn);
      base = mix(base, vec3(0.05, 0.045, 0.04) * (0.8 + 0.4 * nz), ov.g);
      base = mix(base, vec3(0.9, 0.92, 0.96) * (0.95 + 0.05 * nz), ov.r * (1.0 - road * 0.25));
      vec3 c = lit(base, n);
      c += vec3(1.0, 0.7, 0.36) * road * ov.b * uNight * 0.5 * (1.0 - ov.r * 0.4);
      gl_FragColor = vec4(fogit(c, vW), 1.0);
    }`,
});
// the land outside the world: vertex colours only
const SKMAT = new THREE.ShaderMaterial({
  uniforms: U,
  vertexShader: `attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
    void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normal; vC = color; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: GLSL_COMMON + `varying vec3 vW; varying vec3 vN; varying vec3 vC;
    void main() { vec3 c = lit(vC, normalize(vN)); gl_FragColor = vec4(fogit(c, vW), 1.0); }`,
});

const TER = { mesh: null, skirt: null, skirtSea: null, ovTex: null, groundTex: null, roadTex: null, dirty: null, ovT: 0 };

function buildTerrain() {
  for (const k of ['mesh', 'skirt', 'skirtSea']) if (TER[k]) { R.scene.remove(TER[k]); TER[k].geometry.dispose(); TER[k] = null; }
  const V = W.V, N = W.N, cs = W.cs;
  const pos = new Float32Array(V * V * 3), nor = new Float32Array(V * V * 3);
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) { const k = (j * V + i) * 3; pos[k] = i * cs; pos[k + 1] = W.h[j * V + i]; pos[k + 2] = j * cs; }
  const idx = new (V * V > 65535 ? Uint32Array : Uint16Array)(N * N * 6);
  let q = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * V + i, b = a + 1, c = a + V, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  TER.mesh = new THREE.Mesh(g, TMAT);
  TER.mesh.frustumCulled = false;
  R.scene.add(TER.mesh);
  terrainNormals(0, 0, N, N);
  // textures
  if (TER.groundTex) TER.groundTex.dispose();
  if (TER.roadTex) TER.roadTex.dispose();
  if (TER.ovTex) TER.ovTex.dispose();
  TER.groundTex = new THREE.CanvasTexture(W.groundCanvas);
  TER.groundTex.anisotropy = Math.min(8, R.renderer.capabilities.getMaxAnisotropy());
  TER.groundTex.minFilter = THREE.LinearMipmapLinearFilter;
  TER.roadTex = new THREE.CanvasTexture(W.roadCanvas);
  TER.ovTex = new THREE.DataTexture(W.ov, V, V, THREE.RGBAFormat);
  TER.ovTex.magFilter = TER.ovTex.minFilter = THREE.LinearFilter;
  TER.ovTex.needsUpdate = true;
  const u = TMAT.uniforms;
  u.uMap.value = TER.groundTex; u.uOv.value = TER.ovTex; u.uRoad.value = TER.roadTex;
  u.uM.value = W.M; u.uCs.value = cs; u.uV.value = V; u.uSnowLine.value = W.biome.snow;
  u.uRock.value.setRGB(...W.biome.rock);
  buildSkirt();
}
function terrainNormals(i0, j0, i1, j1) {
  const V = W.V, cs = W.cs, h = W.h, nor = TER.mesh.geometry.attributes.normal.array;
  for (let j = Math.max(0, j0); j <= Math.min(V - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(V - 1, i1); i++) {
    const hl = h[j * V + Math.max(0, i - 1)], hr = h[j * V + Math.min(V - 1, i + 1)], hu = h[Math.max(0, j - 1) * V + i], hd = h[Math.min(V - 1, j + 1) * V + i];
    let nx = (hl - hr), ny = 2 * cs, nz = (hu - hd);
    const l = Math.hypot(nx, ny, nz); const k = (j * V + i) * 3;
    nor[k] = nx / l; nor[k + 1] = ny / l; nor[k + 2] = nz / l;
  }
}
// marks a terrain region as changed; the mesh is rewritten at most a few times a second
function terrainTouch(i0, j0, i1, j1) {
  const d = TER.dirty;
  if (!d) TER.dirty = [i0, j0, i1, j1];
  else { d[0] = Math.min(d[0], i0); d[1] = Math.min(d[1], j0); d[2] = Math.max(d[2], i1); d[3] = Math.max(d[3], j1); }
}
function terrainFlush(force) {
  const d = TER.dirty;
  if (!d) return;
  const V = W.V, pos = TER.mesh.geometry.attributes.position;
  const i0 = clamp(d[0] - 1, 0, V - 1), j0 = clamp(d[1] - 1, 0, V - 1), i1 = clamp(d[2] + 1, 0, V - 1), j1 = clamp(d[3] + 1, 0, V - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) pos.array[(j * V + i) * 3 + 1] = W.h[j * V + i];
  terrainNormals(i0, j0, i1, j1);
  pos.needsUpdate = true; TER.mesh.geometry.attributes.normal.needsUpdate = true;
  TER.dirty = null;
  bus.emit('terrain', i0, j0, i1, j1);
}

// ---------- terrain edits ----------
// fn(oldHeight, distance) returns the new height for every vertex within r of (x, z). The world's outer cells stay put.
function editTerrain(x, z, r, fn) {
  const cs = W.cs, V = W.V;
  const i0 = clamp(Math.floor((x - r) / cs), 2, V - 3), i1 = clamp(Math.ceil((x + r) / cs), 2, V - 3);
  const j0 = clamp(Math.floor((z - r) / cs), 2, V - 3), j1 = clamp(Math.ceil((z + r) / cs), 2, V - 3);
  if (i1 < i0 || j1 < j0) return;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const d = dist(i * cs, j * cs, x, z);
    if (d > r) continue;
    const k = j * V + i;
    W.h[k] = fn(W.h[k], d, k);
  }
  terrainTouch(i0, j0, i1, j1);
  WATER.wake();
}

// ---------- overlay (snow, scorch, power, vegetation) ----------
// adds `amt` (0..1 scale) to channel ch (0 snow, 1 scorch, 2 power, 3 vegetation) within r of (x, z), with a soft edge.
// mode 'set' moves the value toward amt instead.
function ovPaint(x, z, r, ch, amt, mode = 'add', soft = 0.4) {
  const cs = W.cs, V = W.V, ov = W.ov;
  const i0 = clamp(Math.floor((x - r) / cs), 0, V - 1), i1 = clamp(Math.ceil((x + r) / cs), 0, V - 1);
  const j0 = clamp(Math.floor((z - r) / cs), 0, V - 1), j1 = clamp(Math.ceil((z + r) / cs), 0, V - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const d = dist(i * cs, j * cs, x, z);
    if (d > r) continue;
    const w = 1 - smooth(r * (1 - soft), r, d);
    const k = (j * V + i) * 4 + ch;
    const cur = ov[k] / 255;
    const nv = mode === 'set' ? lerp(cur, amt, w) : cur + amt * w;
    ov[k] = clamp(Math.round(nv * 255), 0, 255);
  }
  W.ovDirty = true;
}
function ovGet(x, z, ch) { const i = clamp(Math.round(x / W.cs), 0, W.V - 1), j = clamp(Math.round(z / W.cs), 0, W.V - 1); return W.ov[(j * W.V + i) * 4 + ch] / 255; }
function ovFlush(dt) {
  TER.ovT -= dt;
  if (!W.ovDirty || TER.ovT > 0) return;
  TER.ovTex.needsUpdate = true; W.ovDirty = false; TER.ovT = 0.2;
}

// ---------- outside the world ----------
function buildSkirt() {
  const V = W.V, M = W.M, cs = W.cs, K = 26, gr = 1.24;
  const ax = [];
  for (let k = K; k >= 1; k--) ax.push(-cs * (Math.pow(gr, k) - 1) / (gr - 1));
  for (let i = 0; i < V; i++) ax.push(i * cs);
  for (let k = 1; k <= K; k++) ax.push(M + cs * (Math.pow(gr, k) - 1) / (gr - 1));
  const n = ax.length;
  const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), dep = new Float32Array(n * n), spos = new Float32Array(n * n * 3);
  const c3 = [0, 0, 0];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = ax[i], z = ax[j], k = j * n + i;
    const inside = i >= K && i < K + V && j >= K && j < K + V;
    const h = inside ? W.h[(j - K) * V + (i - K)] : terrainFn(x, z);
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    spos[k * 3] = x; spos[k * 3 + 1] = 0; spos[k * 3 + 2] = z;
    dep[k] = Math.max(0, -h);
    groundColor(x, z, h, 0, c3, !inside);
    const far = smooth(M * 0.1, M * 0.8, Math.max(-x, -z, x - M, z - M));
    col[k * 3] = lerp(c3[0], W.biome.forest[0] * 1.1, far * 0.5 * (h > 1 ? 1 : 0)); col[k * 3 + 1] = lerp(c3[1], W.biome.forest[1] * 1.1, far * 0.5 * (h > 1 ? 1 : 0)); col[k * 3 + 2] = lerp(c3[2], W.biome.forest[2], far * 0.5 * (h > 1 ? 1 : 0));
    if (h > W.biome.snow) { col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = 0.9; }
    // the city carries on past the edge as a grey haze of rooftops
    const u = h > 0.6 ? clamp((urbanI(x, z) - 0.12) * 2.2, 0, 0.8) * (1 - far * 0.6) : 0;
    if (u > 0) { const g = 0.44 + hash2(i, j, 3) * 0.1; col[k * 3] = lerp(col[k * 3], g, u); col[k * 3 + 1] = lerp(col[k * 3 + 1], g * 0.98, u); col[k * 3 + 2] = lerp(col[k * 3 + 2], g * 0.96, u); }
  }
  const idx = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    if (i >= K && i < K + V - 1 && j >= K && j < K + V - 1) continue;
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  TER.skirt = new THREE.Mesh(g, SKMAT);
  TER.skirt.frustumCulled = false;
  R.scene.add(TER.skirt);
  // the sea outside the world
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  sg.setAttribute('aD', new THREE.BufferAttribute(dep, 1));
  sg.setAttribute('aMud', new THREE.BufferAttribute(new Float32Array(n * n), 1));
  sg.setAttribute('aFoam', new THREE.BufferAttribute(new Float32Array(n * n), 1));
  sg.setIndex(idx);
  TER.skirtSea = new THREE.Mesh(sg, WMAT);
  TER.skirtSea.frustumCulled = false;
  TER.skirtSea.renderOrder = 2;
  R.scene.add(TER.skirtSea);
}
