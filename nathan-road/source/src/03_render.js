// 03_render: the PS1 pipeline. The scene is drawn into a small render target (240 lines by default) with one shader:
// clip-space vertex snapping (the wobble), nearest-sampled atlas tiles with a three-step mip chain, Gouraud light from
// the sun and sky, linear fog, and 15-bit colour with ordered dither. Then it is stretched to the screen unfiltered.
// Night light comes from two places: window glass in the atlas (alpha 128..230) that lights up per window, and a
// ground light map (lamps, shop spill, neon) sampled by world x/z and faded with height.
let renderer = null, rt = null, camera = null, scene = null;
let postScene = null, postCam = null, postMat = null;
const VIEW = { lines: 240, w: 427, h: 240, fov: 62, wobble: 1 };
const ATLAS_N = 16, TILE = 64;
const UNI = {
  uA0: { value: null }, uA1: { value: null }, uA2: { value: null }, uLM: { value: null },
  uLMBox: { value: new THREE.Vector4(-1000, -1000, 2000, 2000) },
  uFogCol: { value: new THREE.Color(0.6, 0.65, 0.7) }, uFogNear: { value: 60 }, uFogFar: { value: 1800 },
  uAmb: { value: new THREE.Color(0.55, 0.57, 0.62) }, uSunDir: { value: new V3(0.3, 0.8, 0.4).normalize() }, uSunCol: { value: new THREE.Color(0.65, 0.62, 0.55) },
  uNight: { value: 0 }, uTime: { value: 0 }, uSnap: { value: new THREE.Vector2(213, 120) }, uShow: { value: 0 },
};

const VERT = `
attribute float tile;
attribute vec3 color;
attribute vec2 aux;            // x: self light (signs, lamps, lit interiors), y: seed for window lighting
uniform vec3 uAmb, uSunDir, uSunCol, uTint;
uniform float uFogNear, uFogFar, uNight, uTime;
uniform vec2 uSnap;
#ifdef PEOPLE
PEOPLE_DECL
#endif
varying vec2 vUv; varying vec3 vCol; varying vec3 vLight; varying float vFog; varying vec2 vTile; varying vec3 vW; varying vec2 vAux;
void main() {
  mat4 M = modelMatrix;
#ifdef USE_INSTANCING
  M = modelMatrix * instanceMatrix;
#endif
  vec3 pos = position;
#ifdef PEOPLE
  pos = personPose(pos);
#endif
  vec4 wp = M * vec4(pos, 1.0);
  vec4 mv = viewMatrix * wp;
  vec4 p = projectionMatrix * mv;
#ifndef NOSNAP
  if (p.w > 0.0) { p.xy = floor(p.xy / p.w * uSnap + 0.5) / uSnap * p.w; }
#endif
  gl_Position = p;
  vUv = uv; vW = wp.xyz; vAux = aux;
#ifdef WATER
  vUv += vec2(uTime * 0.021, uTime * 0.013) + 0.04 * sin(wp.zx * 0.05 + uTime * 0.7);
#endif
  vTile = vec2(mod(tile, ${ATLAS_N}.0), floor(tile / ${ATLAS_N}.0 + 0.01));
#ifdef PEOPLE
  vCol = personColor() * uTint;
#else
  vCol = color * uTint;
#endif
#ifdef UNLIT
  vLight = vec3(1.0);
#else
  vec3 n = normalize(mat3(M) * normal);
  float sd = max(dot(n, uSunDir), 0.0);
  float sky = 0.75 + 0.25 * n.y;
  vLight = uAmb * sky + uSunCol * sd + vec3(aux.x) * (0.25 + 0.75 * uNight);
#endif
#ifdef NOFOG
  vFog = 0.0;
#else
  vFog = clamp((-mv.z - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
#endif
}`;

const FRAG = `
uniform sampler2D uA0, uA1, uA2, uLM;
uniform vec4 uLMBox;
uniform vec3 uFogCol;
uniform float uNight, uOpacity, uTime, uShow;
varying vec2 vUv; varying vec3 vCol; varying vec3 vLight; varying float vFog; varying vec2 vTile; varying vec3 vW; varying vec2 vAux;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec4 tx(sampler2D t, float ts, float as) {
  vec2 f = clamp(fract(vUv) * ts, 0.5, ts - 0.5);
  return texture2D(t, (vTile * ts + f) / as);
}
float b2(vec2 p) { return mod(2.0 * p.x + 3.0 * p.y, 4.0); }
float bayer(vec2 p) { p = mod(floor(p), 4.0); return (4.0 * b2(mod(p, 2.0)) + b2(floor(p / 2.0)) + 0.5) / 16.0; }
void main() {
  vec4 c = vec4(1.0);
#ifdef SPAN
  c = texture2D(uA0, vUv);                 // signs: uv are absolute coordinates in the sign atlas
#elif !defined(NOTEX)
  vec2 dx = dFdx(vUv * ${TILE}.0), dy = dFdy(vUv * ${TILE}.0);
  float lod = 0.5 * log2(max(max(dot(dx, dx), dot(dy, dy)), 1e-8));
  if (lod < 1.0) c = tx(uA0, ${TILE}.0, ${TILE * ATLAS_N}.0);
  else if (lod < 2.0) c = tx(uA1, ${TILE / 2}.0, ${TILE * ATLAS_N / 2}.0);
  else c = tx(uA2, ${TILE / 4}.0, ${TILE * ATLAS_N / 4}.0);
#endif
#ifdef BLEND_ALPHA
  if (c.a < 0.03) discard;
#else
  if (c.a < 0.25) discard;
#endif
  vec3 base = c.rgb * vCol;
  vec3 col = base * vLight;
#ifndef NOLM
  vec2 lmuv = (vW.xz - uLMBox.xy) / uLMBox.zw;
  if (lmuv.x > 0.0 && lmuv.y > 0.0 && lmuv.x < 1.0 && lmuv.y < 1.0) {
    vec3 lm = texture2D(uLM, lmuv).rgb;
    col += base * lm * uNight * 2.2 * clamp(1.0 - vW.y / 9.0, 0.0, 1.0);
  }
#endif
#if !defined(BLEND_ALPHA) && !defined(SPAN)
  if (c.a < 0.92) {                       // window glass: some windows light up at night
    // a per-window random number; the inputs are whole numbers so it can't shimmer pixel to pixel
    vec2 cell = floor(vUv + 0.001);
    float seed = floor(fract(vAux.y) * 251.0 + 0.5);
    float r = fract(sin(dot(cell + vec2(seed * 7.0, seed * 13.0), vec2(12.9898, 78.233))) * 43758.5453);
    float lit = step(r, 0.42 + 0.25 * c.a) * uNight;
    vec3 wc = mix(vec3(1.0, 0.82, 0.55), vec3(0.75, 0.9, 1.0), step(0.7, fract(r * 13.0)));
    if (fract(r * 29.0) > 0.93) wc = vec3(0.4, 0.75, 1.0) * (0.7 + 0.3 * sin(uTime * 3.0 + r * 40.0));
    col = mix(col, wc * (0.65 + 0.35 * fract(r * 7.0)), lit);
#ifdef SHOW
    float band = step(0.5, fract(vW.y / 24.0 - uTime * 0.4 + vAux.y * 3.0));
    col += uShow * step(9.5, vAux.y) * mix(vec3(0.9, 0.2, 0.8), vec3(0.2, 0.7, 1.0), band) * 0.8;
#endif
  }
#endif
#ifdef ADDITIVE
  col *= 1.0 - vFog;
#elif !defined(NOFOG)
  col = mix(col, uFogCol, vFog);
#endif
  col = floor(clamp(col, 0.0, 1.0) * 31.0 + bayer(gl_FragCoord.xy)) / 31.0;
#ifdef BLEND_ALPHA
  gl_FragColor = vec4(col, c.a * uOpacity);
#else
  gl_FragColor = vec4(col, 1.0);
#endif
}`;

// opts: { unlit, blend: 'opaque'|'alpha'|'add', fog, side, depthWrite, notex, nosnap, nolm, show, tint }
const MATS = [];
function makeMat(opts = {}) {
  const defines = {};
  if (opts.unlit) defines.UNLIT = 1;
  if (opts.blend === 'alpha' || opts.blend === 'add') defines.BLEND_ALPHA = 1;
  if (opts.fog === false) defines.NOFOG = 1;
  if (opts.notex) defines.NOTEX = 1;
  if (opts.nosnap) defines.NOSNAP = 1;
  if (opts.nolm) defines.NOLM = 1;
  if (opts.show) defines.SHOW = 1;
  if (opts.span) defines.SPAN = 1;
  if (opts.blend === 'add') defines.ADDITIVE = 1;
  if (opts.water) defines.WATER = 1;
  if (opts.pose) defines.PEOPLE = 1;          // opts.pose: GLSL declaring attributes/uniforms and vec3 personPose(vec3)
  const uniforms = Object.assign({}, UNI, opts.uniforms || {}, { uTint: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: opts.opacity !== undefined ? opts.opacity : 1 } });
  if (opts.tint) uniforms.uTint.value.setRGB(opts.tint[0], opts.tint[1], opts.tint[2]);
  const m = new THREE.ShaderMaterial({
    uniforms, defines, vertexShader: VERT.replace('PEOPLE_DECL', opts.pose || ''), fragmentShader: FRAG,
    side: opts.side || THREE.FrontSide,
    transparent: !!defines.BLEND_ALPHA,
    blending: opts.blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : !defines.BLEND_ALPHA,
    polygonOffset: !!opts.offset, polygonOffsetFactor: opts.offset ? -1 : 0, polygonOffsetUnits: opts.offset ? -opts.offset : 0,
  });
  m.extensions = { derivatives: true };
  MATS.push(m);
  return m;
}

// ---------------------------------------------------------------- geometry builder
// Vertices carry position, uv (in tile repeats), atlas tile, colour, normal and aux (self light, window seed).
class Geo {
  constructor() { this.p = []; this.u = []; this.t = []; this.c = []; this.n = []; this.a = []; this.ix = []; this.col = [1, 1, 1]; this.aux = [0, 0]; this.xf = null; }
  setXf(m) { this.xf = m; this.nxf = m ? new THREE.Matrix3().getNormalMatrix(m) : null; return this; }
  vert(x, y, z, u, v, tile, nx, ny, nz) {
    if (this.xf) {
      const e = this.xf.elements;
      const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
      x = X; y = Y; z = Z;
      const f = this.nxf.elements;
      const NX = f[0] * nx + f[3] * ny + f[6] * nz, NY = f[1] * nx + f[4] * ny + f[7] * nz, NZ = f[2] * nx + f[5] * ny + f[8] * nz;
      const l = Math.hypot(NX, NY, NZ) || 1; nx = NX / l; ny = NY / l; nz = NZ / l;
    }
    this.p.push(x, y, z); this.u.push(u, v); this.t.push(tile); this.n.push(nx, ny, nz);
    this.c.push(this.col[0], this.col[1], this.col[2]); this.a.push(this.aux[0], this.aux[1]);
    return this.p.length / 3 - 1;
  }
  // quad from 4 corners counter-clockwise seen from the front; uv = [u0,v0,u1,v1,u2,v2,u3,v3]
  quad(a, b, c, d, uv, tile, n) {
    if (!n) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2]; n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / l, n[1] / l, n[2] / l]; }
    const i0 = this.vert(a[0], a[1], a[2], uv[0], uv[1], tile, n[0], n[1], n[2]);
    const i1 = this.vert(b[0], b[1], b[2], uv[2], uv[3], tile, n[0], n[1], n[2]);
    const i2 = this.vert(c[0], c[1], c[2], uv[4], uv[5], tile, n[0], n[1], n[2]);
    const i3 = this.vert(d[0], d[1], d[2], uv[6], uv[7], tile, n[0], n[1], n[2]);
    this.ix.push(i0, i1, i2, i0, i2, i3);
  }
  tri(a, b, c, uv, tile, n) {
    if (!n) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]; n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / l, n[1] / l, n[2] / l]; }
    const i0 = this.vert(a[0], a[1], a[2], uv[0], uv[1], tile, n[0], n[1], n[2]);
    const i1 = this.vert(b[0], b[1], b[2], uv[2], uv[3], tile, n[0], n[1], n[2]);
    const i2 = this.vert(c[0], c[1], c[2], uv[4], uv[5], tile, n[0], n[1], n[2]);
    this.ix.push(i0, i1, i2);
  }
  // vertical wall from (ax,az) to (bx,bz), facing right of a->b when walking with z south... front = outward for CCW rings
  // The front faces (dz, -dx): outward for the edges of a counter-clockwise ring (in x/z maths terms), and into the
  // courtyard for the clockwise hole rings the bake writes.
  wall(ax, az, bx, bz, y0, y1, tile, uScale, vScale, u0 = 0, v0 = 0) {
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-4) return;
    const nx = (bz - az) / L, nz = -(bx - ax) / L;
    const U1 = u0 + L / uScale, V0 = v0, V1 = v0 + (y1 - y0) / vScale;
    this.quad([bx, y0, bz], [ax, y0, az], [ax, y1, az], [bx, y1, bz], [u0, V0, U1, V0, U1, V1, u0, V1], tile, [nx, 0, nz]);
  }
  // axis-aligned box; tiles: number or {top,bottom,side,front,back,left,right}; uvScale 0 = one tile per face, else metres per repeat
  box(x0, y0, z0, x1, y1, z1, tiles, uvScale = 0, skip = '') {
    const T = typeof tiles === 'number' ? { top: tiles, bottom: tiles, side: tiles } : tiles;
    const side = T.side !== undefined ? T.side : T.top;
    const tf = T.front !== undefined ? T.front : side, tb = T.back !== undefined ? T.back : side;
    const tl = T.left !== undefined ? T.left : side, tr = T.right !== undefined ? T.right : side;
    const tt = T.top !== undefined ? T.top : side, tbo = T.bottom !== undefined ? T.bottom : side;
    const uvf = (w, h) => uvScale ? [0, 0, w / uvScale, 0, w / uvScale, h / uvScale, 0, h / uvScale] : [0, 0, 1, 0, 1, 1, 0, 1];
    const W = x1 - x0, H = y1 - y0, D = z1 - z0;
    if (!skip.includes('f')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], uvf(W, H), tf, [0, 0, -1]);
    if (!skip.includes('b')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], uvf(W, H), tb, [0, 0, 1]);
    if (!skip.includes('l')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], uvf(D, H), tl, [-1, 0, 0]);
    if (!skip.includes('r')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], uvf(D, H), tr, [1, 0, 0]);
    if (!skip.includes('t')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], uvf(W, D), tt, [0, 1, 0]);
    if (!skip.includes('u')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], uvf(W, D), tbo, [0, -1, 0]);
  }
  cyl(cx, y0, cz, r, h, sides, tSide, tCap, uRep = 1, caps = true, r1) {
    const rt = r1 === undefined ? r : r1;
    for (let i = 0; i < sides; i++) {
      const a0 = i / sides * TAU, a1 = (i + 1) / sides * TAU, am = (a0 + a1) / 2;
      const s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1);
      const u0 = i / sides * uRep, u1 = (i + 1) / sides * uRep;
      const ny = (r - rt) / h, nl = Math.hypot(1, ny);
      this.quad([cx + s0 * r, y0, cz + c0 * r], [cx + s1 * r, y0, cz + c1 * r], [cx + s1 * rt, y0 + h, cz + c1 * rt], [cx + s0 * rt, y0 + h, cz + c0 * rt],
        [u0, 0, u1, 0, u1, 1, u0, 1], tSide, [Math.sin(am) / nl, ny / nl, Math.cos(am) / nl]);
      if (caps && tCap !== undefined && tCap !== null) {
        if (rt > 0) this.tri([cx, y0 + h, cz], [cx + s0 * rt, y0 + h, cz + c0 * rt], [cx + s1 * rt, y0 + h, cz + c1 * rt], [0.5, 0.5, 0.5 + s0 * 0.5, 0.5 + c0 * 0.5, 0.5 + s1 * 0.5, 0.5 + c1 * 0.5], tCap, [0, 1, 0]);
      }
    }
  }
  sphere(cx, cy, cz, rx, ry, rz, segW, segH, tile, uRep = 1, vRep = 1, phiMax = Math.PI) {
    for (let j = 0; j < segH; j++) for (let i = 0; i < segW; i++) {
      const pt = (ii, jj) => { const th = ii / segW * TAU, ph = jj / segH * phiMax; return [cx + Math.sin(ph) * Math.sin(th) * rx, cy + Math.cos(ph) * ry, cz + Math.sin(ph) * Math.cos(th) * rz]; };
      const a = pt(i, j + 1), b = pt(i + 1, j + 1), c = pt(i + 1, j), d = pt(i, j);
      const u0 = (i / segW) * uRep, u1 = ((i + 1) / segW) * uRep, v0 = (1 - j / segH) * vRep, v1 = (1 - (j + 1) / segH) * vRep;
      const th = (i + 0.5) / segW * TAU, ph = (j + 0.5) / segH * phiMax;
      this.quad(a, b, c, d, [u0, v1, u1, v1, u1, v0, u0, v0], tile, [Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th)]);
    }
  }
  // flat polygon (rings in metres) at height y, facing up
  flat(rings, y, tile, uvScale, uvRot = 0) {
    const T = triangulate(rings);
    const base = this.p.length / 3;
    const cs = Math.cos(uvRot), sn = Math.sin(uvRot);
    for (const [x, z] of T.pts) this.vert(x, y, z, (x * cs - z * sn) / uvScale, (x * sn + z * cs) / uvScale, tile, 0, 1, 0);
    for (let i = 0; i < T.tris.length; i += 3) {
      // ShapeUtils returns triangles clockwise in x/z maths terms = counter-clockwise seen from above (y up, z south)
      const a = T.tris[i], b = T.tris[i + 1], c = T.tris[i + 2];
      const ax = T.pts[a][0], az = T.pts[a][1], bx = T.pts[b][0], bz = T.pts[b][1], cx = T.pts[c][0], cz = T.pts[c][1];
      const cross = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      if (cross < 0) this.ix.push(base + a, base + b, base + c); else this.ix.push(base + a, base + c, base + b);
    }
  }
  get empty() { return this.ix.length === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('tile', new THREE.Float32BufferAttribute(this.t, 1));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aux', new THREE.Float32BufferAttribute(this.a, 2));
    if (this.p.length / 3 > 65535) g.setIndex(new THREE.Uint32BufferAttribute(this.ix, 1)); else g.setIndex(this.ix);
    g.computeBoundingSphere();
    return g;
  }
  mesh(mat) { return new THREE.Mesh(this.build(), mat); }
}

// ---------------------------------------------------------------- renderer
function initRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG });
  renderer.setPixelRatio(1);
  renderer.autoClear = true;
  rt = new THREE.WebGLRenderTarget(16, 16, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  camera = new THREE.PerspectiveCamera(VIEW.fov, 16 / 9, 0.12, 9000);
  scene = new THREE.Scene();
  postScene = new THREE.Scene();
  postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: rt.texture }, uFade: { value: 0 }, uVig: { value: 0.25 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D uT; uniform float uFade, uVig; varying vec2 vUv;
      void main(){ vec3 c = texture2D(uT, vUv).rgb; vec2 q = vUv - 0.5; c *= 1.0 - uVig * dot(q, q) * 2.0; gl_FragColor = vec4(c * (1.0 - uFade), 1.0); }`,
    depthTest: false, depthWrite: false,
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  onResize();
  addEventListener('resize', onResize);
}
function onResize() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false);
  const lines = VIEW.lines;
  VIEW.h = lines; VIEW.w = Math.round(lines * W / H);
  rt.setSize(VIEW.w, VIEW.h);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  UNI.uSnap.value.set(VIEW.wobble ? VIEW.w / 2 : 4096, VIEW.wobble ? VIEW.h / 2 : 4096);
}
function setLines(n) { VIEW.lines = n; if (renderer) onResize(); }
// The street scene is drawn in two depth ranges (far, then near over a cleared depth buffer) so the harbour, the
// city floor and the hills 5 km away keep their order without z-fighting. Things marked userData.farOnly (the sky)
// are drawn in the far pass only.
const FAR_ONLY = [];
function renderFrame(sc) {
  sc = sc || scene;
  renderer.setRenderTarget(rt);
  if (sc === scene) {
    const n0 = camera.near, f0 = camera.far;
    camera.near = 300; camera.far = 12000; camera.updateProjectionMatrix();
    renderer.autoClear = true;
    renderer.render(sc, camera);
    for (const o of FAR_ONLY) o.visible = false;
    renderer.autoClear = false; renderer.clearDepth();
    camera.near = 0.15; camera.far = 320; camera.updateProjectionMatrix();
    renderer.render(sc, camera);
    for (const o of FAR_ONLY) o.visible = o.userData.want !== false;
    renderer.autoClear = true;
    camera.near = n0; camera.far = f0; camera.updateProjectionMatrix();
  } else {
    renderer.render(sc, camera);
  }
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
}
// low-res copy of the current view for the photo album (and covers)
function grabFrame(w = 192) {
  const h = Math.round(w * VIEW.h / VIEW.w);
  const buf = new Uint8Array(VIEW.w * VIEW.h * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, VIEW.w, VIEW.h, buf);
  const c = document.createElement('canvas'); c.width = VIEW.w; c.height = VIEW.h;
  const x = c.getContext('2d'), id = x.createImageData(VIEW.w, VIEW.h);
  for (let y = 0; y < VIEW.h; y++) id.data.set(buf.subarray((VIEW.h - 1 - y) * VIEW.w * 4, (VIEW.h - y) * VIEW.w * 4), y * VIEW.w * 4);
  x.putImageData(id, 0, 0);
  const o = document.createElement('canvas'); o.width = w; o.height = h;
  const ox = o.getContext('2d'); ox.imageSmoothingEnabled = false; ox.drawImage(c, 0, 0, w, h);
  return o.toDataURL('image/jpeg', 0.82);
}
