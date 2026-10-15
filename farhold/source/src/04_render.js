// Farhold — renderer, camera, lights, shared materials, settings, starfield and sun

const SETTINGS = Object.assign({
  sens: 1, invertY: false, fov: 72, quality: 1, vol: 0.8, music: 0.55, autoQ: true, hints: true, fpv: true,
}, (() => { try { return JSON.parse(localStorage.getItem('farhold.settings') || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem('farhold.settings', JSON.stringify(SETTINGS)); } catch (e) { /* ignore */ } }
// quality presets: terrain segments, split factor, flora range, shadows, pixel ratio, clouds
const QUALITY = [
  { name: 'Low', N: 16, split: 1.05, flora: 260, shadow: 0, pr: 0.75, clouds: false, grass: 0 },
  { name: 'Medium', N: 24, split: 1.25, flora: 360, shadow: 1024, pr: 1, clouds: true, grass: 1 },
  { name: 'High', N: 32, split: 1.5, flora: 480, shadow: 2048, pr: 1.5, clouds: true, grass: 2 },
];
const Qset = () => QUALITY[clamp(SETTINGS.quality | 0, 0, 2)];

const R = {};
function initRender() {
  const canvas = document.getElementById('c');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;
  R.renderer = renderer;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Qset().pr));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  R.scene = scene;
  scene.fog = new THREE.FogExp2(0x88aacc, 0);
  const cam = new THREE.PerspectiveCamera(SETTINGS.fov, 1, 0.08, 6e6);
  R.camera = cam;
  scene.add(cam);

  R.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5a5236, 0.5); scene.add(R.hemi);
  R.amb = new THREE.AmbientLight(0x8890a8, 0.12); scene.add(R.amb);
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.25);
  sun.castShadow = Qset().shadow > 0;
  const ss = Math.max(512, Qset().shadow);
  sun.shadow.mapSize.set(ss, ss);
  const sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.05;
  scene.add(sun); scene.add(sun.target); R.sun = sun;
  // flashlight and a small pool of point lights for base lamps, muzzle flashes and engines
  R.torch = new THREE.SpotLight(0xfff2dd, 0, 60, 0.5, 0.5, 1.2);
  cam.add(R.torch); R.torch.position.set(0.3, -0.2, 0); R.torch.target.position.set(0, 0, -10); cam.add(R.torch.target);
  R.lights = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffc080, 0, 20, 1.6); scene.add(l); R.lights.push(l); }

  R.noiseTex = makeNoiseTex();
  R.mat = {
    vc: glowMat(new THREE.MeshLambertMaterial({ vertexColors: true })),
    vcDS: glowMat(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    phong: glowMat(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 12, specular: 0x202020 })),
    flora: floraMat(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    basic: new THREE.MeshBasicMaterial({ vertexColors: true }),
    ghost: new THREE.MeshBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.4, depthWrite: false }),
    ghostBad: new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.4, depthWrite: false }),
    hurt: glowMat(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xaa2010 })),
    scanned: glowMat(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x206a80 })),
    beam: new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    bolt: new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    red: new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    glass: new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.35, depthWrite: false }),
  };
  makeStars();
  makeSun();
  addEventListener('resize', resize);
  resize();
  return true;
}
function resize() {
  const w = innerWidth, h = innerHeight;
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  const hc = document.getElementById('hud2d');
  if (hc) { hc.width = w; hc.height = h; }
}
function applyQuality() {
  const q = Qset();
  R.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pr));
  R.sun.castShadow = q.shadow > 0;
  if (q.shadow > 0 && R.sun.shadow.mapSize.x !== q.shadow) { R.sun.shadow.mapSize.set(q.shadow, q.shadow); if (R.sun.shadow.map) { R.sun.shadow.map.dispose(); R.sun.shadow.map = null; } }
  resize();
}

// tileable value-noise texture for terrain detail
function makeNoiseTex() {
  const S = 256, data = new Uint8Array(S * S * 4);
  const rnd = mulberry32(99);
  const lat = (n) => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = rnd(); return a; };
  const octs = [[8, 0.4], [16, 0.25], [32, 0.18], [64, 0.1], [128, 0.07]].map(([n, w]) => ({ n, w, a: lat(n) }));
  const octs2 = [[4, 0.5], [12, 0.3], [48, 0.2]].map(([n, w]) => ({ n, w, a: lat(n) }));
  const sample = (o, x, y) => {
    const fx = x * o.n / S, fy = y * o.n / S, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const g = (i, j) => o.a[((j % o.n + o.n) % o.n) * o.n + ((i % o.n + o.n) % o.n)];
    return lerp(lerp(g(ix, iy), g(ix + 1, iy), sx), lerp(g(ix, iy + 1), g(ix + 1, iy + 1), sx), sy);
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0, v2 = 0; for (const o of octs) v += sample(o, x, y) * o.w; for (const o of octs2) v2 += sample(o, x, y) * o.w;
    const i = (y * S + x) * 4;
    data[i] = clamp(v * 255, 0, 255); data[i + 1] = clamp(v2 * 255, 0, 255); data[i + 2] = clamp(Math.abs(v - 0.5) * 2 * 255, 0, 255); data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// vertex-colour Lambert with an optional per-vertex 'glow' attribute that adds emissive light
function glowMat(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float glow;\nvarying float vGlow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow;');
    sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow * 1.6;');
  };
  mat.customProgramCacheKey = () => 'glow' + mat.side;
  return mat;
}
// flora: sway by a per-vertex 'sw' attribute (xyz = bend direction × weight, w = phase), plus glow
const WIND = { t: { value: 0 }, str: { value: 0.5 } };
function floraMat(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WIND.t; sh.uniforms.uWind = WIND.str;
    sh.vertexShader = 'attribute vec4 sw;\nattribute float glow;\nvarying float vGlow;\nuniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      float swv = (sin(uTime * 1.6 + sw.w) * 0.7 + sin(uTime * 2.9 + sw.w * 1.7) * 0.3) * uWind;
      transformed += sw.xyz * swv;
      vGlow = glow;`);
    sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow * 1.6;');
  };
  mat.customProgramCacheKey = () => 'flora';
  return mat;
}
// terrain: vertex colours + triplanar detail from the noise texture using planet-local positions ('pl')
function terrainMat(opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const U = { uNoise: { value: R.noiseTex }, uDetail: { value: opts.detail || 1 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec3 pl;\nvarying vec3 vPl; varying vec3 vNo; varying float vDist;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPl = pl; vNo = normal;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvDist = -mvPosition.z;');
    sh.fragmentShader = 'uniform sampler2D uNoise; uniform float uDetail;\nvarying vec3 vPl; varying vec3 vNo; varying float vDist;\n' +
      sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 w = abs(normalize(vNo)); w = pow(w, vec3(4.0)); w /= (w.x + w.y + w.z);
        vec3 p1 = vPl * 0.35, p2 = vPl * 0.045;
        float d1 = texture2D(uNoise, p1.yz).r * w.x + texture2D(uNoise, p1.xz).r * w.y + texture2D(uNoise, p1.xy).r * w.z;
        float d2 = texture2D(uNoise, p2.yz).g * w.x + texture2D(uNoise, p2.xz).g * w.y + texture2D(uNoise, p2.xy).g * w.z;
        float fadeN = 1.0 - smoothstep(25.0, 90.0, vDist);
        float d = mix(0.5, d1, fadeN) * 0.55 + d2 * 0.45;
        diffuseColor.rgb *= mix(1.0, 0.62 + d * 0.8, uDetail);
      }`);
  };
  mat.customProgramCacheKey = () => 'terrain';
  return mat;
}
// water: transparent, fresnel-ish, animated sparkle; depth attribute fades the shallows
const WATER_T = { value: 0 };
function waterMat(color, deep) {
  const mat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.85, shininess: 90, specular: 0x9aa8b0, depthWrite: true });
  const U = { uTime: WATER_T, uDeep: { value: new THREE.Color(deep) }, uNoise: { value: R.noiseTex } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute float wdep;\nvarying float vDep; varying vec3 vLp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvDep = wdep; vLp = position;');
    sh.fragmentShader = 'uniform float uTime; uniform vec3 uDeep; uniform sampler2D uNoise;\nvarying float vDep; varying vec3 vLp;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float dk = smoothstep(0.0, 10.0, vDep);
        diffuseColor.rgb = mix(diffuseColor.rgb * 1.2, uDeep, dk);
        diffuseColor.a = mix(0.4, 0.92, smoothstep(0.0, 3.0, vDep));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 q = vLp.xz * 0.08 + vLp.y * 0.05;
          float n1 = texture2D(uNoise, q + vec2(uTime * 0.03, uTime * 0.02)).r - 0.5;
          float n2 = texture2D(uNoise, q * 1.7 - vec2(uTime * 0.025, -uTime * 0.01)).r - 0.5;
          normal = normalize(normal + vec3(n1, 0.0, n2) * 0.35);
        }`);
  };
  mat.customProgramCacheKey = () => 'water';
  return mat;
}

// ---------- background stars (follow the camera, drawn first) ----------
function makeStars() {
  const n = 7000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n);
  const rnd = mulberry32(4242);
  for (let i = 0; i < n; i++) {
    // denser band along a galactic plane
    let x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1;
    if (rnd() < 0.55) y *= 0.12;
    const l = Math.hypot(x, y, z) || 1;
    pos[i * 3] = x / l; pos[i * 3 + 1] = y / l; pos[i * 3 + 2] = z / l;
    const t = rnd(), c = t < 0.6 ? [1, 1, 1] : t < 0.75 ? [1, 0.8, 0.6] : t < 0.9 ? [0.7, 0.8, 1] : [1, 0.6, 0.8];
    const b = 0.35 + rnd() * rnd() * 0.9;
    col[i * 3] = c[0] * b; col[i * 3 + 1] = c[1] * b; col[i * 3 + 2] = c[2] * b;
    sz[i] = 1 + rnd() * rnd() * 2.5;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(sz, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 1 }, uPx: { value: 1 } },
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; uniform float uPx;
      void main(){ vC = color; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; gl_PointSize = size * uPx; }`,
    fragmentShader: `varying vec3 vC; uniform float uFade; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.1, length(d)); gl_FragColor = vec4(vC * a * uFade, 1.0); }`,
    depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, transparent: false,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false; pts.renderOrder = -100;
  R.scene.add(pts); R.stars = pts;
  // nebula backdrop: a big sphere with soft coloured clouds
  const ng = new THREE.SphereGeometry(1, 32, 16);
  const nm = new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 1 }, uA: { value: new THREE.Color(0x3a1a60) }, uB: { value: new THREE.Color(0x0a3a5a) }, uNoise: { value: R.noiseTex } },
    vertexShader: `varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `varying vec3 vD; uniform float uFade; uniform vec3 uA, uB; uniform sampler2D uNoise;
      void main(){ vec3 d = normalize(vD); float band = exp(-d.y * d.y * 10.0);
        float n1 = texture2D(uNoise, vec2(atan(d.z, d.x) * 0.5, d.y * 0.9) ).g;
        float n2 = texture2D(uNoise, vec2(atan(d.z, d.x) * 1.3 + 0.3, d.y * 2.0) ).r;
        vec3 c = uA * smoothstep(0.35, 0.8, n1) + uB * smoothstep(0.4, 0.85, n2);
        gl_FragColor = vec4((c * (0.25 + band * 0.6)) * uFade, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, transparent: false, blending: THREE.AdditiveBlending,
  });
  const neb = new THREE.Mesh(ng, nm); neb.frustumCulled = false; neb.renderOrder = -101;
  R.scene.add(neb); R.nebula = neb;
}
// ---------- the system's star: a glowing billboard at its real position ----------
function makeSun() {
  const g = new THREE.PlaneGeometry(2, 2);
  const m = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0xfff0c0) }, uSize: { value: 4000 }, uDim: { value: 1 } },
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      uniform float uSize; varying vec2 vUv;
      void main(){ vUv = position.xy; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * uSize; gl_Position = projectionMatrix * mv;
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uCol; uniform float uDim; varying vec2 vUv;
      void main(){ float r = length(vUv); float core = smoothstep(0.13, 0.1, r); float glow = pow(max(0.0, 1.0 - r), 4.0) * 0.8;
        float rays = pow(max(0.0, 1.0 - r), 6.0) * (0.5 + 0.5 * sin(atan(vUv.y, vUv.x) * 12.0)) * 0.4;
        vec3 c = mix(uCol, vec3(1.0), core * 0.85) * (core * 2.5 + glow + rays);
        gl_FragColor = vec4(c * uDim, 1.0);
        #include <logdepthbuf_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false; mesh.renderOrder = -50;
  R.scene.add(mesh); R.sunMesh = mesh;
}
// Assign the point-light pool to the light sources nearest the camera.
// sources: [{ p: V3 world, i, c, r }]
function updateLightPool(sources) {
  const cp = R.camera.position;
  sources.sort((a, b) => a.p.distanceToSquared(cp) - b.p.distanceToSquared(cp));
  for (let i = 0; i < R.lights.length; i++) {
    const l = R.lights[i], s = sources[i];
    if (s && s.p.distanceToSquared(cp) < 120 * 120) { l.position.copy(s.p); l.intensity = s.i; l.color.setHex(s.c || 0xffc080); l.distance = s.r || 20; }
    else l.intensity = 0;
  }
}
