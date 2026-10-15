// 03_render: the N64 pipeline. Everything is drawn at 320x240 (or 640x480 "expansion pak") into a render target
// with one shader: tile-wrapped 3-point texture filtering, a three-step mip chain, Gouraud vertex colour (baked
// for the level, per-vertex sun + ambient for people), linear fog, and 5-bit-per-channel output with ordered
// dither. The result is stretched to the screen with bilinear filtering and a light horizontal blur (the VI filter).
let renderer = null, rt = null, camera = null, scene = null, skyScene = null, vmScene = null, vmCamera = null;
let postScene = null, postCam = null, postMat = null;
const VIEW = { w: 320, h: 240, fov: 54, aspect: 4 / 3 };
const UNI = {
  uA0: { value: null }, uA1: { value: null }, uA2: { value: null },
  uFogCol: { value: new THREE.Color(0.5, 0.5, 0.5) }, uFogNear: { value: 10 }, uFogFar: { value: 60 },
  uAlarm: { value: 0 }, uTime: { value: 0 },
};

const VERT = `
attribute float tile;
attribute vec3 lcol;
uniform vec3 uTint;
uniform float uFogNear, uFogFar;
#ifdef DYNLIT
uniform vec3 uAmb; uniform vec3 uSunDir; uniform vec3 uSunCol;
#endif
varying vec2 vUv; varying vec3 vCol; varying float vFog; varying vec2 vTile;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vTile = vec2(mod(tile, 16.0), floor(tile / 16.0 + 0.01));
  vec3 c = lcol * uTint;
#ifdef DYNLIT
  vec3 n = normalize(mat3(modelMatrix) * normal);
  c *= uAmb + uSunCol * max(dot(n, uSunDir), 0.0);
#endif
  vCol = c;
#ifdef NOFOG
  vFog = 0.0;
#else
  vFog = clamp((-mv.z - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
#endif
}`;
const FRAG = `
uniform sampler2D uA0, uA1, uA2;
uniform vec3 uFogCol;
uniform float uAlarm, uOpacity;
varying vec2 vUv; varying vec3 vCol; varying float vFog; varying vec2 vTile;
vec4 tx(sampler2D t, vec2 c, float ts, float as) { c = mod(c, ts); return texture2D(t, (vTile * ts + c + 0.5) / as); }
vec4 tri(sampler2D t, float ts, float as) {
  vec2 p = vUv * ts - 0.5; vec2 b = floor(p); vec2 f = p - b;
  vec4 A = tx(t, b, ts, as), B = tx(t, b + vec2(1.0, 0.0), ts, as), Cc = tx(t, b + vec2(0.0, 1.0), ts, as);
  if (f.x + f.y <= 1.0) return A + f.x * (B - A) + f.y * (Cc - A);
  vec4 D = tx(t, b + vec2(1.0, 1.0), ts, as);
  return D + (1.0 - f.x) * (Cc - D) + (1.0 - f.y) * (B - D);
}
float b2(vec2 p) { return mod(2.0 * p.x + 3.0 * p.y, 4.0); }
float bayer(vec2 p) { p = mod(floor(p), 4.0); return (4.0 * b2(mod(p, 2.0)) + b2(floor(p / 2.0)) + 0.5) / 16.0; }
void main() {
  vec2 dx = dFdx(vUv * 32.0), dy = dFdy(vUv * 32.0);
  float lod = 0.5 * log2(max(max(dot(dx, dx), dot(dy, dy)), 1e-8));
  vec4 c;
  if (lod < 0.75) c = tri(uA0, 32.0, 512.0);
  else if (lod < 1.75) c = tri(uA1, 16.0, 256.0);
  else c = tri(uA2, 8.0, 128.0);
#ifdef BLEND_ALPHA
  if (c.a < 0.03) discard;
#elif defined(BLEND_ADD)
#else
  if (c.a < 0.5) discard;
#endif
  vec3 col = c.rgb * vCol;
#ifndef NOALARM
  col *= mix(vec3(1.0), vec3(1.55, 0.5, 0.42), uAlarm);
#endif
#ifdef BLEND_ADD
  col *= 1.0 - vFog;
#else
  col = mix(col, uFogCol, vFog);
#endif
  col = floor(clamp(col, 0.0, 1.0) * 31.0 + bayer(gl_FragCoord.xy)) / 31.0;
#ifdef BLEND_ALPHA
  gl_FragColor = vec4(col, c.a * uOpacity);
#else
  gl_FragColor = vec4(col, 1.0);
#endif
}`;

// opts: { dyn, blend: 'opaque'|'alpha'|'add', fog, side, depthWrite, depthTest, alarm, tint }
function makeMat(opts = {}) {
  const defines = {};
  if (opts.dyn) defines.DYNLIT = 1;
  if (opts.blend === 'alpha') defines.BLEND_ALPHA = 1;
  if (opts.blend === 'add') defines.BLEND_ADD = 1;
  if (opts.fog === false) defines.NOFOG = 1;
  if (opts.alarm === false) defines.NOALARM = 1;
  const uniforms = {
    uA0: UNI.uA0, uA1: UNI.uA1, uA2: UNI.uA2, uFogCol: UNI.uFogCol, uFogNear: UNI.uFogNear, uFogFar: UNI.uFogFar, uAlarm: UNI.uAlarm,
    uTint: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 },
    uAmb: { value: new THREE.Color(0.6, 0.6, 0.6) }, uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() }, uSunCol: { value: new THREE.Color(0.5, 0.5, 0.5) },
  };
  if (opts.tint) uniforms.uTint.value.setRGB(opts.tint[0], opts.tint[1], opts.tint[2]);
  const m = new THREE.ShaderMaterial({
    uniforms, defines, vertexShader: VERT, fragmentShader: FRAG,
    side: opts.side || THREE.FrontSide,
    transparent: opts.blend === 'alpha' || opts.blend === 'add',
    blending: opts.blend === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : !(opts.blend === 'alpha' || opts.blend === 'add'),
    depthTest: opts.depthTest !== undefined ? opts.depthTest : true,
  });
  m.extensions = { derivatives: true };
  return m;
}

// ---------------------------------------------------------------- geometry builder
// Vertices carry position, uv (in tile repeats), tile index, a light colour and a normal.
class Geo {
  constructor() { this.p = []; this.u = []; this.t = []; this.c = []; this.n = []; this.ix = []; this.xf = null; this.nxf = null; this.lit = null; this.tint = [1, 1, 1]; }
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
    const L = this.lit ? this.lit(x, y, z, nx, ny, nz) : null, T = this.tint;
    if (L) this.c.push(L[0] * T[0], L[1] * T[1], L[2] * T[2]); else this.c.push(T[0], T[1], T[2]);
    return this.p.length / 3 - 1;
  }
  // a quad from 4 corners given counter-clockwise as seen from the front; uv = [u0,v0,u1,v1,u2,v2,u3,v3]
  quad(a, b, c, d, uv, tile, n) {
    const i0 = this.vert(a[0], a[1], a[2], uv[0], uv[1], tile, n[0], n[1], n[2]);
    const i1 = this.vert(b[0], b[1], b[2], uv[2], uv[3], tile, n[0], n[1], n[2]);
    const i2 = this.vert(c[0], c[1], c[2], uv[4], uv[5], tile, n[0], n[1], n[2]);
    const i3 = this.vert(d[0], d[1], d[2], uv[6], uv[7], tile, n[0], n[1], n[2]);
    this.ix.push(i0, i1, i2, i0, i2, i3);
  }
  tri(a, b, c, uv, tile, n) {
    const i0 = this.vert(a[0], a[1], a[2], uv[0], uv[1], tile, n[0], n[1], n[2]);
    const i1 = this.vert(b[0], b[1], b[2], uv[2], uv[3], tile, n[0], n[1], n[2]);
    const i2 = this.vert(c[0], c[1], c[2], uv[4], uv[5], tile, n[0], n[1], n[2]);
    this.ix.push(i0, i1, i2);
  }
  // Axis-aligned box. tiles: index or {top,bottom,side,front,back,left,right}. uvScale: 0 = one tile per face,
  // otherwise metres per tile repeat. front is -z (the way people and props face before rotation).
  box(x0, y0, z0, x1, y1, z1, tiles, uvScale = 0, skip = '') {
    const T = typeof tiles === 'number' ? { top: tiles, bottom: tiles, side: tiles } : tiles;
    const side = T.side !== undefined ? T.side : T.top;
    const tf = T.front !== undefined ? T.front : side, tb = T.back !== undefined ? T.back : side;
    const tl = T.left !== undefined ? T.left : side, tr = T.right !== undefined ? T.right : side;
    const tt = T.top !== undefined ? T.top : side, tbo = T.bottom !== undefined ? T.bottom : side;
    const uvf = (w, h) => uvScale ? [0, h / uvScale, w / uvScale, h / uvScale, w / uvScale, 0, 0, 0] : [0, 1, 1, 1, 1, 0, 0, 0];
    const W = x1 - x0, H = y1 - y0, D = z1 - z0;
    if (!skip.includes('f')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], uvf(W, H), tf, [0, 0, -1]);
    if (!skip.includes('b')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], uvf(W, H), tb, [0, 0, 1]);
    if (!skip.includes('l')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], uvf(D, H), tl, [-1, 0, 0]);
    if (!skip.includes('r')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], uvf(D, H), tr, [1, 0, 0]);
    if (!skip.includes('t')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], uvScale ? [0, D / uvScale, W / uvScale, D / uvScale, W / uvScale, 0, 0, 0] : [0, 1, 1, 1, 1, 0, 0, 0], tt, [0, 1, 0]);
    if (!skip.includes('u')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, 0, 1, 0, 1, 1, 0, 1], tbo, [0, -1, 0]);
  }
  // Vertical cylinder (n-sided prism) centred on (cx, cz). uRep = tile repeats around.
  cyl(cx, y0, cz, r, h, sides, tSide, tCap, uRep = 1, caps = true, r1) {
    const rt = r1 === undefined ? r : r1;
    for (let i = 0; i < sides; i++) {
      const a0 = i / sides * TAU, a1 = (i + 1) / sides * TAU, am = (a0 + a1) / 2;
      const s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1);
      const u0 = i / sides * uRep, u1 = (i + 1) / sides * uRep;
      const ny = (r - rt) / h, nl = Math.hypot(1, ny);
      this.quad([cx + s0 * r, y0, cz + c0 * r], [cx + s1 * r, y0, cz + c1 * r], [cx + s1 * rt, y0 + h, cz + c1 * rt], [cx + s0 * rt, y0 + h, cz + c0 * rt],
        [u0, 1, u1, 1, u1, 0, u0, 0], tSide, [Math.sin(am) / nl, ny / nl, Math.cos(am) / nl]);
      if (caps && tCap !== undefined && tCap !== null) {
        if (rt > 0) this.tri([cx, y0 + h, cz], [cx + s0 * rt, y0 + h, cz + c0 * rt], [cx + s1 * rt, y0 + h, cz + c1 * rt], [0.5, 0.5, 0.5 + s0 * 0.5, 0.5 + c0 * 0.5, 0.5 + s1 * 0.5, 0.5 + c1 * 0.5], tCap, [0, 1, 0]);
        this.tri([cx, y0, cz], [cx + s1 * r, y0, cz + c1 * r], [cx + s0 * r, y0, cz + c0 * r], [0.5, 0.5, 0.5 + s1 * 0.5, 0.5 + c1 * 0.5, 0.5 + s0 * 0.5, 0.5 + c0 * 0.5], tCap, [0, -1, 0]);
      }
    }
  }
  sphere(cx, cy, cz, r, segW, segH, tileFn, uRep = 1, vRep = 1, inside = false) {
    for (let j = 0; j < segH; j++) for (let i = 0; i < segW; i++) {
      const pt = (ii, jj) => { const th = ii / segW * TAU, ph = jj / segH * Math.PI; return [cx + Math.sin(ph) * Math.sin(th) * r, cy + Math.cos(ph) * r, cz + Math.sin(ph) * Math.cos(th) * r]; };
      const a = pt(i, j + 1), b = pt(i + 1, j + 1), c = pt(i + 1, j), d = pt(i, j);
      const u0 = (i / segW) * uRep, u1 = ((i + 1) / segW) * uRep, v0 = (j / segH) * vRep, v1 = ((j + 1) / segH) * vRep;
      const tile = tileFn(i, j);
      const m = pt(i + 0.5, j + 0.5), n = [(m[0] - cx) / r, (m[1] - cy) / r, (m[2] - cz) / r];
      if (inside) this.quad(d, c, b, a, [u0, v0, u1, v0, u1, v1, u0, v1], tile, [-n[0], -n[1], -n[2]]);
      else this.quad(a, b, c, d, [u0, v1, u1, v1, u1, v0, u0, v0], tile, n);
    }
  }
  get empty() { return this.ix.length === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('tile', new THREE.Float32BufferAttribute(this.t, 1));
    g.setAttribute('lcol', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setIndex(this.ix);
    g.computeBoundingSphere();
    return g;
  }
  mesh(mat) { const m = new THREE.Mesh(this.build(), mat); return m; }
}

// ---------------------------------------------------------------- setup and per-frame
let frameEl = null, canvasEl = null, hudCanvas = null;
function initRenderer() {
  frameEl = $('frame'); canvasEl = $('c'); hudCanvas = $('hud');
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG });
  renderer.autoClear = false;
  renderer.setPixelRatio(1);
  UNI.uA0.value = ATLAS[0]; UNI.uA1.value = ATLAS[1]; UNI.uA2.value = ATLAS[2];
  scene = new THREE.Scene(); skyScene = new THREE.Scene(); vmScene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(VIEW.fov, 4 / 3, 0.06, 900);
  camera.rotation.order = 'YXZ';
  vmCamera = new THREE.PerspectiveCamera(50, 4 / 3, 0.01, 10);
  postScene = new THREE.Scene(); postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2(1 / 320, 1 / 240) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * 0.5 + texture2D(tDiffuse, vUv + vec2(uTexel.x * 0.6, 0.0)).rgb * 0.25 + texture2D(tDiffuse, vUv - vec2(uTexel.x * 0.6, 0.0)).rgb * 0.25;
      gl_FragColor = vec4(c, 1.0); }`,
    depthTest: false, depthWrite: false,
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  applyVideoSettings();
  window.addEventListener('resize', layout);
}
function applyVideoSettings() {
  const hi = SET.res === 'high', wide = SET.aspect === '16:9';
  VIEW.h = hi ? 480 : 240;
  VIEW.w = Math.round(VIEW.h * (wide ? 16 / 9 : 4 / 3));
  VIEW.aspect = VIEW.w / VIEW.h;
  if (rt) rt.dispose();
  rt = new THREE.WebGLRenderTarget(VIEW.w, VIEW.h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: false });
  postMat.uniforms.tDiffuse.value = rt.texture;
  postMat.uniforms.uTexel.value.set(1 / VIEW.w, 1 / VIEW.h);
  camera.aspect = VIEW.aspect; camera.updateProjectionMatrix();
  vmCamera.aspect = VIEW.aspect; vmCamera.updateProjectionMatrix();
  layout();
}
// Fit the 4:3 (or 16:9) frame into the window with black bars, like a TV picture.
function layout() {
  const W = window.innerWidth, H = window.innerHeight;
  let w = W, h = Math.round(W / VIEW.aspect);
  if (h > H) { h = H; w = Math.round(H * VIEW.aspect); }
  frameEl.style.width = w + 'px'; frameEl.style.height = h + 'px';
  frameEl.style.left = Math.round((W - w) / 2) + 'px'; frameEl.style.top = Math.round((H - h) / 2) + 'px';
  frameEl.style.setProperty('--u', (h / 480) + 'px');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setSize(Math.round(w * dpr), Math.round(h * dpr), false);
  canvasEl.style.width = w + 'px'; canvasEl.style.height = h + 'px';
  hudCanvas.width = Math.round(480 * VIEW.aspect); hudCanvas.height = 480;
}
function renderFrame(withVm = true) {
  renderer.setRenderTarget(rt);
  renderer.setClearColor(UNI.uFogCol.value, 1);
  renderer.clear(true, true, false);
  if (skyScene.children.length) {
    skyScene.position.set(0, 0, 0);
    for (const c of skyScene.children) if (c.userData.follow) c.position.copy(camera.position);
    renderer.render(skyScene, camera);
    renderer.clearDepth();
  }
  renderer.render(scene, camera);
  if (withVm && vmScene.children.length) { renderer.clearDepth(); renderer.render(vmScene, vmCamera); }
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
}
function clearScene(s) {
  for (let i = s.children.length - 1; i >= 0; i--) {
    const o = s.children[i];
    s.remove(o);
    o.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material && !m.material.userData.shared) m.material.dispose(); });
  }
}
