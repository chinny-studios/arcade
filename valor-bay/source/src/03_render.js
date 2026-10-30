// Valor Bay — renderer, the comic-book look (toon shading, a post pass that inks outlines from the depth buffer and
// lays halftone dots in the shadows), the sky and the day cycle, materials, and Mesher: the vertex-coloured
// geometry builder used for the city, the people and the cars (walls carry window coordinates for the city shader)

const R = {
  renderer: null, scene: null, camera: null, hemi: null, sun: null, sky: null, w: 1, h: 1, ratio: 1,
  sunDir: new V3(0.4, 0.8, 0.3).normalize(), night: 0, rt: null, post: null, postScene: null, postCam: null,
};

function initRender() {
  const canvas = $('#c');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
  if (!renderer) { $('#nogl').hidden = false; throw new Error('WebGL unavailable'); }
  R.renderer = renderer;
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(OPTS.fov, 16 / 9, 0.5, 2400);
  R.hemi = new THREE.HemisphereLight(0xbfe0ff, 0x6a6458, 0.75);
  R.sun = new THREE.DirectionalLight(0xfff4e0, 0.95);
  R.scene.add(R.hemi, R.sun, R.sun.target);
  R.scene.fog = new THREE.Fog(0xbfe4ff, 250, 1500);
  makeSky();
  initPost();
  addEventListener('resize', resize);
  resize();
}
function quality() { return OPTS.quality; }
function resize() {
  const w = innerWidth, h = innerHeight, q = quality();
  const dpr = devicePixelRatio || 1;
  R.ratio = q === 'low' ? Math.min(dpr, 1) * 0.75 : q === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.25);
  R.renderer.setPixelRatio(R.ratio);
  R.renderer.setSize(w, h, false);
  R.w = w; R.h = h;
  R.camera.aspect = w / h;
  R.camera.updateProjectionMatrix();
  const pw = Math.max(1, Math.floor(w * R.ratio)), ph = Math.max(1, Math.floor(h * R.ratio));
  if (R.rt) { R.rt.setSize(pw, ph); R.post.uniforms.res.value.set(pw, ph); }
  bus.emit('resize', w, h);
}

// ---------- the post pass: ink lines where depth jumps or creases, halftone dots in the shade ----------
function initPost() {
  const gl2 = R.renderer.capabilities.isWebGL2;
  if (!gl2 && !R.renderer.extensions.get('WEBGL_depth_texture')) return;
  R.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  R.rt.depthTexture = new THREE.DepthTexture(4, 4);
  R.rt.depthTexture.type = THREE.UnsignedIntType;
  R.post = new THREE.ShaderMaterial({
    uniforms: {
      tCol: { value: R.rt.texture }, tDep: { value: R.rt.depthTexture }, res: { value: new THREE.Vector2(4, 4) },
      near: { value: R.camera.near }, far: { value: R.camera.far }, ink: { value: 1 }, dots: { value: 1 }, flash: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tCol, tDep; uniform vec2 res; uniform float near, far, ink, dots, flash; uniform vec3 tint; varying vec2 vUv;
      float lin(vec2 uv){ float d = texture2D(tDep, uv).x; return (near * far) / (far - d * (far - near)); }
      void main(){
        vec3 c = texture2D(tCol, vUv).rgb;
        vec2 px = 1.0 / res;
        float z = lin(vUv);
        // inverse depth is linear across a flat surface, so its second difference is zero on planes and spikes at
        // silhouettes and creases
        float w = 1.0 / z;
        float wl = 1.0 / lin(vUv - vec2(px.x, 0.0)), wr = 1.0 / lin(vUv + vec2(px.x, 0.0)), wd = 1.0 / lin(vUv - vec2(0.0, px.y)), wu = 1.0 / lin(vUv + vec2(0.0, px.y));
        float lap = (abs(wl + wr - 2.0 * w) + abs(wd + wu - 2.0 * w)) / w;
        float e = smoothstep(0.012, 0.04, lap);
        e *= ink * (1.0 - smoothstep(500.0, 1100.0, z));
        // halftone: dots on a 45-degree screen grid, bigger where it's darker
        float lum = dot(c, vec3(0.299, 0.587, 0.114));
        vec2 q = gl_FragCoord.xy * 0.7071; q = vec2(q.x - q.y, q.x + q.y) / 4.5;
        float r = length(fract(q) - 0.5);
        float shade = smoothstep(0.55, 0.15, lum);
        float dot1 = smoothstep(shade * 0.55 + 0.02, shade * 0.55 - 0.04, r) * shade;
        c *= 1.0 - dot1 * 0.32 * dots * (1.0 - smoothstep(120.0, 400.0, z));
        // a touch of extra punch in the colours
        float g = dot(c, vec3(0.333));
        c = mix(vec3(g), c, 1.18);
        c = mix(c, vec3(0.06, 0.05, 0.09), e);
        c = c * tint + flash;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  R.postScene = new THREE.Scene();
  R.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), R.post); q.frustumCulled = false;
  R.postScene.add(q);
}
function renderFrame() {
  const usePost = R.rt && quality() !== 'low' && OPTS.outline;
  R.renderer.info.autoReset = false; R.renderer.info.reset();
  if (usePost) {
    R.post.uniforms.near.value = R.camera.near; R.post.uniforms.far.value = R.camera.far;
    R.renderer.setRenderTarget(R.rt);
    R.renderer.render(R.scene, R.camera);
    R.renderer.setRenderTarget(null);
    R.renderer.render(R.postScene, R.postCam);
  } else R.renderer.render(R.scene, R.camera);
}

// ---------- sky: a shader dome with the sun and moon, stars at night, comic clouds ----------
const SKY = { top: new THREE.Color(), hor: new THREE.Color(), fog: new THREE.Color(), clouds: [] };
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color(0x3a8ae8) }, hor: { value: new THREE.Color(0xbfe4ff) }, sunDir: { value: R.sunDir }, sunCol: { value: new THREE.Color(0xfff8d0) }, night: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; uniform float night; varying vec3 vP;
      void main(){
        float y = vP.y;
        vec3 c = mix(hor, top, smoothstep(-0.02, 0.45, y));
        float s = dot(vP, sunDir);
        c += sunCol * (smoothstep(0.9985, 0.9992, s) * 1.2 + pow(max(s, 0.0), 24.0) * 0.25);
        float m = dot(vP, -sunDir);
        c += vec3(0.85, 0.9, 1.0) * smoothstep(0.9988, 0.9993, m) * night;
        if (y < 0.0) c = mix(c, hor * 0.85, smoothstep(0.0, -0.1, y));
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  R.sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), mat);
  R.sky.renderOrder = -10; R.sky.frustumCulled = false;
  R.scene.add(R.sky);
  const sp = [], rnd = RNG(7);
  for (let i = 0; i < 1100; i++) {
    const u = rnd.range(0.05, 1), a = rnd() * TAU, r = Math.sqrt(1 - u * u);
    sp.push(Math.cos(a) * r * 1900, u * 1900, Math.sin(a) * r * 1900);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  R.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe0e8ff, size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false }));
  R.stars.frustumCulled = false;
  R.sky.add(R.stars);
}
function makeClouds() {
  const rnd = RNG(11);
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, fog: false, transparent: true, depthWrite: false }));
    const a = rnd() * TAU, r = rnd.range(500, 1500), s = rnd.range(160, 320);
    m.position.set(Math.cos(a) * r, rnd.range(260, 420), Math.sin(a) * r);
    m.scale.set(s, s * 0.5, 1);
    m.renderOrder = -9;
    R.scene.add(m); SKY.clouds.push(m);
  }
}
// keyframes of the day: hour, sky top, horizon, sun colour, sun intensity, hemi sky, hemi ground, hemi intensity, night (0..1)
const DAY_KEYS = [
  [0, 0x050a1e, 0x1a2448, 0x8090c0, 0.25, 0x405080, 0x101018, 0.55, 1],
  [5, 0x0a1430, 0x2a3058, 0x8090c0, 0.25, 0x405080, 0x101018, 0.55, 1],
  [6.3, 0x3a5aa0, 0xf0a070, 0xffa060, 0.6, 0x90a0d0, 0x403830, 0.6, 0.45],
  [8, 0x3a86e0, 0xb8dcff, 0xfff0d8, 0.85, 0xbfe0ff, 0x5a5448, 0.55, 0],
  [12, 0x2a7ae8, 0xc0e4ff, 0xfff8e8, 0.85, 0xc8e8ff, 0x5a5448, 0.55, 0],
  [16.5, 0x3a82e0, 0xc8e0ff, 0xfff0d0, 0.85, 0xbfe0ff, 0x5a5448, 0.55, 0],
  [18.3, 0x4a60b0, 0xffa060, 0xff8a40, 0.75, 0xe0b0a0, 0x605048, 0.75, 0.12],
  [19.4, 0x1c2a60, 0xc05a60, 0xa060a0, 0.35, 0x605a90, 0x201820, 0.55, 0.65],
  [20.5, 0x060c24, 0x1e2850, 0x8090c0, 0.25, 0x405080, 0x101018, 0.55, 1],
  [24, 0x050a1e, 0x1a2448, 0x8090c0, 0.25, 0x405080, 0x101018, 0.55, 1],
];
const _ca = new THREE.Color(), _cb = new THREE.Color();
function lerpHex(a, b, t, out) { _ca.setHex(a); _cb.setHex(b); return out.copy(_ca).lerp(_cb, t); }
function setTimeOfDay(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i < DAY_KEYS.length - 2 && DAY_KEYS[i + 1][0] <= h) i++;
  const A = DAY_KEYS[i], B = DAY_KEYS[i + 1], t = smooth(0, 1, (h - A[0]) / (B[0] - A[0]));
  const u = R.sky.material.uniforms;
  lerpHex(A[1], B[1], t, u.top.value); lerpHex(A[2], B[2], t, u.hor.value);
  lerpHex(A[3], B[3], t, R.sun.color); R.sun.intensity = lerp(A[4], B[4], t);
  lerpHex(A[5], B[5], t, R.hemi.color); lerpHex(A[6], B[6], t, R.hemi.groundColor); R.hemi.intensity = lerp(A[7], B[7], t);
  R.night = lerp(A[8], B[8], t);
  u.night.value = R.night;
  if (R.post) R.post.uniforms.dots.value = 1 - R.night * 0.75;
  if (CITY.pools) CITY.pools.material.opacity = R.night * 0.55;
  // the sun swings east to west; at night the same light is the moon from the opposite side
  const a = ((h - 6) / 12) * Math.PI, day = Math.sin(a) > -0.05;
  R.sunDir.set(Math.cos(a) * 0.8, Math.max(Math.sin(a), -0.6), 0.45).normalize();
  u.sunCol.value.copy(R.sun.color).multiplyScalar(day ? 1 : 0);
  const L = day ? R.sunDir : _v1.copy(R.sunDir).multiplyScalar(-1);
  if (L.y < 0.25) L.y = 0.25;
  R.lightDir = (R.lightDir || new V3()).copy(L).normalize();
  R.scene.fog.color.copy(u.hor.value).lerp(u.top.value, 0.15);
  R.renderer.setClearColor(R.scene.fog.color);
  R.stars.material.opacity = R.night * 0.9;
  for (const c of SKY.clouds) c.material.color.setRGB(lerp(1, 0.28, R.night), lerp(1, 0.3, R.night), lerp(1, 0.42, R.night)).lerp(R.sun.color, 0.15 * (1 - R.night));
  if (MATS.city && MATS.city.userData.u) MATS.city.userData.u.uNight.value = R.night;
  if (MATS.glowLamp) MATS.glowLamp.color.setRGB(lerp(0.75, 1.0, R.night), lerp(0.75, 0.92, R.night), lerp(0.7, 0.6, R.night));
  bus.emit('tod', h);
}
function updateSky() {
  R.sky.position.copy(R.camera.position);
  R.sun.target.position.set(R.camera.position.x, 0, R.camera.position.z);
  if (R.lightDir) R.sun.position.copy(R.sun.target.position).addScaledVector(R.lightDir, 200);
}

// ---------- materials ----------
const MATS = {};
let GRAD = null;
function toonGrad() {
  if (GRAD) return GRAD;
  const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  GRAD = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true;
  return GRAD;
}
function toon(o = {}) { return new THREE.MeshToonMaterial(Object.assign({ gradientMap: toonGrad() }, o)); }
function initMats() {
  MATS.vc = toon({ vertexColors: true });
  MATS.skin = toon({ vertexColors: true, skinning: true });
  MATS.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MATS.glowLamp = new THREE.MeshBasicMaterial({ vertexColors: true });
  MATS.city = makeCityMat();
  MATS.water = new THREE.MeshToonMaterial({ color: 0x2a7ad0, gradientMap: toonGrad(), transparent: true, opacity: 0.92 });
}
// the city material: toon shading plus windows drawn in the fragment shader from the wuv attribute (u, v in window
// cells, style). Style 0 is a blank wall or roof; 1 punched windows, 2 ribbon bands, 3 curtain wall, 4 tall and narrow.
// The ground floor of every style is shopfront glass. At night a random half of the windows light up.
function makeCityMat() {
  const m = toon({ vertexColors: true });
  m.userData.u = { uNight: { value: 0 } };
  m.extensions = { derivatives: true };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = m.userData.u.uNight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', 'attribute vec3 wuv; varying vec3 vWuv;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWuv = wuv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWuv; uniform float uNight;
      float wh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float winMask(vec3 w, out float lit, out float fy){
        lit = 0.0; fy = 0.0;
        if (w.z < 0.5) return 0.0;
        vec2 g = w.xy, f = fract(g), id = floor(g), fw = fwidth(g);
        vec2 hs = vec2(0.3, 0.3);
        if (w.z < 1.5) hs = vec2(0.28, 0.3); else if (w.z < 2.5) hs = vec2(0.5, 0.28); else if (w.z < 3.5) hs = vec2(0.46, 0.46); else hs = vec2(0.18, 0.38);
        vec2 c = vec2(0.5, 0.55);
        if (g.y < 1.0) { hs = vec2(0.44, 0.34); c = vec2(0.5, 0.42); }
        vec2 d = abs(f - c) - hs;
        vec2 aa = smoothstep(fw * 0.8, -fw * 0.8, d);
        float m = aa.x * aa.y;
        m = mix(m, 4.0 * hs.x * hs.y, smoothstep(0.3, 0.7, max(fw.x, fw.y)));
        lit = step(0.62, wh(id + vec2(w.z * 13.0, 0.0))) * (w.z > 2.5 && w.z < 3.5 ? 0.55 : 1.0);
        if (g.y < 1.0) lit = step(0.25, wh(id));
        fy = clamp((f.y - c.y + hs.y) / (2.0 * hs.y), 0.0, 1.0);
        return m;
      }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float wLit, wFy; float wm = winMask(vWuv, wLit, wFy);
        vec3 glass = mix(vec3(0.22, 0.42, 0.7), vec3(0.62, 0.84, 0.98), wFy);
        glass += 0.35 * step(0.82, fract(vWuv.x * 0.5 + wFy * 0.6 + vWuv.y * 0.13));
        glass = mix(glass, vec3(0.05, 0.07, 0.14), uNight);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, wm);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += mix(vec3(1.0, 0.78, 0.42), vec3(0.95, 0.9, 0.75), step(0.5, fract(vWuv.x * 0.37 + floor(vWuv.y) * 0.21))) * wm * wLit * uNight * 0.85;`);
  };
  return m;
}

// ---------- Mesher: builds one vertex-coloured BufferGeometry from many primitives ----------
const _col = new THREE.Color();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s3 = new V3(), _p3 = new V3();
class Mesher {
  // win: windows on walls; set to { style, x0, z0, cwx, cwz, ch, base, off } before adding wall geometry (null for none).
  // Window columns start at x0 / z0 and are cwx / cwz wide, so a footprint that is a whole number of columns lines up.
  constructor(withWin = false) { this.p = []; this.n = []; this.c = []; this.wv = withWin ? [] : null; this.win = null; this.sk = null; this.bone = 0; }
  get empty() { return this.p.length === 0; }
  _rgb(col) { if (typeof col === 'number') _col.setHex(col); else _col.copy(col); return _col; }
  _push(v, nx, ny, nz, k) {
    this.p.push(v[0], v[1], v[2]); this.n.push(nx, ny, nz); this.c.push(k.r, k.g, k.b);
    if (this.wv) {
      const W = this.win;
      if (!W || Math.abs(ny) > 0.5) this.wv.push(0, 0, 0);
      else {
        const u = Math.abs(nx) > Math.abs(nz) ? (v[2] - W.z0) / W.cwz : (v[0] - W.x0) / W.cwx;
        this.wv.push(u + W.off, (v[1] - W.base) / W.ch, W.style);
      }
    }
    if (this.sk) this.sk.push(this.bone);
  }
  tri(a, b, c, col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const k = this._rgb(col);
    this._push(a, nx, ny, nz, k); this._push(b, nx, ny, nz, k); this._push(c, nx, ny, nz, k);
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  // an axis-aligned box rotated by ry about its centre; nb: skip the bottom face
  box(cx, cy, cz, sx, sy, sz, col, ry = 0, nb = true, topCol) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (x, y, z) => [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(-hx, hy, hz)];
    this.quad(v[3], v[2], v[6], v[7], col);
    this.quad(v[1], v[0], v[4], v[5], col);
    this.quad(v[2], v[1], v[5], v[6], col);
    this.quad(v[0], v[3], v[7], v[4], col);
    this.quad(v[7], v[6], v[5], v[4], topCol === undefined ? col : topCol);
    if (!nb) this.quad(v[0], v[1], v[2], v[3], col);
  }
  // any three.js geometry, transformed by position / rotation (euler) / scale
  geo(g, col, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _m4.compose(_p3.set(px, py, pz), _q.setFromEuler(_e.set(rx, ry, rz)), _s3.set(sx, sy, sz));
    this.geoM(g, col, _m4);
  }
  geoM(g, col, m4) {
    const src = g.index ? g.toNonIndexed() : g;
    const pos = src.attributes.position, nor = src.attributes.normal;
    const nm = new THREE.Matrix3().getNormalMatrix(m4), k = this._rgb(col);
    const W = this.win; this.win = null;
    for (let i = 0; i < pos.count; i++) {
      _v1.fromBufferAttribute(pos, i).applyMatrix4(m4);
      _v2.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      this._push([_v1.x, _v1.y, _v1.z], _v2.x, _v2.y, _v2.z, k);
    }
    this.win = W;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.wv) g.setAttribute('wuv', new THREE.Float32BufferAttribute(this.wv, 3));
    if (this.sk) {
      const n = this.sk.length, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = this.sk[i]; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    }
    g.computeBoundingSphere();
    return g;
  }
}
// cached unit primitives for Mesher.geo
const PRIM = {};
const prim = (k, f) => PRIM[k] || (PRIM[k] = f());
const P_CYL = (n = 8) => prim('cyl' + n, () => new THREE.CylinderGeometry(0.5, 0.5, 1, n));
const P_CONE = (n = 8) => prim('cone' + n, () => new THREE.ConeGeometry(0.5, 1, n));
const P_SPH = (a = 8, b = 6) => prim('sph' + a + '_' + b, () => new THREE.SphereGeometry(0.5, a, b));
const P_TAPER = (t, n = 8) => prim('tap' + t + '_' + n, () => new THREE.CylinderGeometry(0.5 * t, 0.5, 1, n));
