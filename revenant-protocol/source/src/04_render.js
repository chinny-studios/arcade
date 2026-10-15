// Revenant Protocol — renderer, sector-light shader, sprite shader, sky, dynamic lights

const R = {};
R.canvas = $('#c');
R.renderer = new THREE.WebGLRenderer({ canvas: R.canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG });
R.renderer.autoClear = false;
R.renderer.setClearColor(0x000000, 1);
R.scene = new THREE.Scene();
R.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 500);
R.camera.rotation.order = 'YXZ';
R.vmScene = new THREE.Scene();
R.vmCam = new THREE.PerspectiveCamera(58, 16 / 9, 0.01, 10);
R.vmAmb = new THREE.AmbientLight(0xffffff, 0.6);
R.vmSun = new THREE.DirectionalLight(0xffffff, 0.7);
R.vmSun.position.set(-0.4, 1, 0.6);
R.vmFlash = new THREE.PointLight(0xffaa66, 0, 2);
R.vmFlash.position.set(0.1, 0, -0.6);
R.vmScene.add(R.vmAmb, R.vmSun, R.vmFlash);

const NLIGHTS = 8;
// Uniforms shared by every world and sprite material: one write updates all of them.
const U = {
  uTime: { value: 0 },
  uL: { value: Array.from({ length: NLIGHTS }, () => new THREE.Vector4(0, -999, 0, 0)) },
  uLC: { value: Array.from({ length: NLIGHTS }, () => new THREE.Vector3()) },
  uLamp: { value: 0 },
  uViewDir: { value: new THREE.Vector3(0, 0, -1) },
  uFogCol: { value: new THREE.Color(0, 0, 0) },
  uFogNear: { value: 40 },
  uFogFar: { value: 140 },
  uCue: { value: 0.55 },
};

const LIGHT_GLSL = `
uniform float uTime; uniform vec4 uL[${NLIGHTS}]; uniform vec3 uLC[${NLIGHTS}]; uniform float uLamp; uniform vec3 uViewDir;
uniform vec3 uFogCol; uniform float uFogNear; uniform float uFogFar; uniform float uCue;
vec3 lightAt(vec3 p, float base){
  float d = distance(p, cameraPosition);
  // Sector light fades with distance, the way the old engines "depth cued" their palettes.
  vec3 c = vec3(base * (1.0 - uCue * smoothstep(5.0, 46.0, d)));
  for (int i = 0; i < ${NLIGHTS}; i++) {
    float r = uL[i].w;
    float a = clamp(1.0 - distance(uL[i].xyz, p) / max(r, 0.001), 0.0, 1.0);
    c += uLC[i] * a * a;
  }
  if (uLamp > 0.0) {
    vec3 dir = (p - cameraPosition) / max(d, 0.001);
    float cone = smoothstep(0.78, 0.97, dot(dir, uViewDir));
    float fall = clamp(1.0 - d / 20.0, 0.0, 1.0);
    c += vec3(1.0, 0.95, 0.82) * uLamp * (0.18 + 0.95 * cone) * fall * fall;
  }
  return c;
}
vec3 finish(vec3 c, vec3 p){
  c = floor(clamp(c, 0.0, 1.0) * 30.0 + 0.5) / 30.0;
  return mix(c, uFogCol, smoothstep(uFogNear, uFogFar, distance(p, cameraPosition)));
}`;

const WORLD_VS = `
attribute float aLight;
varying vec2 vUv; varying float vLight; varying vec3 vWorld;
void main(){
  vUv = uv; vLight = aLight;
  vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const WORLD_FS = LIGHT_GLSL + `
uniform sampler2D map; uniform vec2 uScroll; uniform float uBright;
varying vec2 vUv; varying float vLight; varying vec3 vWorld;
void main(){
  vec4 t = texture2D(map, vUv + uScroll * uTime);
  float em = 1.0 - t.a;
  vec3 c = t.rgb * lightAt(vWorld, vLight * uBright);
  c = mix(c, t.rgb * 1.05, em);
  gl_FragColor = vec4(finish(c, vWorld), 1.0);
}`;
const matCache = {};
function worldMat(name, opt = {}) {
  const key = name + JSON.stringify(opt);
  if (matCache[key]) return matCache[key];
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { map: { value: TEX[name] }, uScroll: { value: new THREE.Vector2(...(opt.scroll || [0, 0])) }, uBright: { value: opt.bright || 1 } }),
    vertexShader: WORLD_VS, fragmentShader: WORLD_FS,
  });
  return (matCache[key] = m);
}

// Additive, unlit, animated (force fields, glows).
function glowMat(name, color, opacity = 0.6, scroll = [0, 0.6]) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: TEX[name] }, uTime: U.uTime, uCol: { value: new THREE.Color(color) }, uOp: { value: opacity }, uScroll: { value: new THREE.Vector2(...scroll) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform float uTime; uniform vec3 uCol; uniform float uOp; uniform vec2 uScroll; varying vec2 vUv; void main(){ vec3 t = texture2D(map, vUv + uScroll * uTime).rgb; gl_FragColor = vec4(t * uCol * uOp * (0.8 + 0.2 * sin(uTime * 9.0)), 1.0); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

// Billboard sprites: one atlas frame (uRect) lit like the sector the sprite stands in.
const SPRITE_VS = `
varying vec2 vUv; varying vec3 vWorld;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SPRITE_FS = LIGHT_GLSL + `
uniform sampler2D map; uniform vec4 uRect; uniform float uLight; uniform float uHit; uniform float uUnlit; uniform float uFlip;
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vec2 uv = vUv; if (uFlip > 0.5) uv.x = 1.0 - uv.x;
  vec4 t = texture2D(map, uRect.xy + uv * uRect.zw);
  if (t.a < 0.5) discard;
  vec3 c = t.rgb * mix(lightAt(vWorld, uLight), vec3(1.0), uUnlit);
  c = mix(c, vec3(1.0, 0.92, 0.85), uHit);
  gl_FragColor = vec4(finish(c, vWorld), 1.0);
}`;
function spriteMat(tex, unlit = 0) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { map: { value: tex }, uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uLight: { value: 1 }, uHit: { value: 0 }, uUnlit: { value: unlit }, uFlip: { value: 0 } }),
    vertexShader: SPRITE_VS, fragmentShader: SPRITE_FS,
  });
}
const PLANE = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // origin at bottom centre

// Sky: a gradient dome with stars and an optional planet, drawn behind everything.
R.skyMat = new THREE.ShaderMaterial({
  uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uStars: { value: 0 }, uPlanet: { value: new THREE.Vector4(0, 0.3, -1, 0) }, uPCol: { value: new THREE.Color() }, uTime: U.uTime, uHaze: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uHaze; uniform float uStars; uniform vec4 uPlanet; uniform vec3 uPCol; uniform float uTime; varying vec3 vDir;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    void main(){
      vec3 d = normalize(vDir);
      vec3 c = mix(uHor, uTop, smoothstep(-0.05, 0.6, d.y));
      c = mix(c, uHaze, smoothstep(0.12, -0.2, d.y));
      vec3 q = floor(d * 220.0);
      float s = h(q); if (s > 0.996 && uStars > 0.0) c += vec3(uStars * (s - 0.996) * 250.0 * smoothstep(-0.1, 0.25, d.y));
      if (uPlanet.w > 0.0) { float a = dot(d, normalize(uPlanet.xyz)); float r = cos(uPlanet.w); if (a > r) { float k = smoothstep(r, r + 0.004, a); float rim = smoothstep(r + 0.03, r, a); c = mix(c, uPCol * (0.6 + 0.6 * rim), k); } }
      gl_FragColor = vec4(floor(c * 30.0 + 0.5) / 30.0, 1.0);
    }`,
  depthWrite: false, depthTest: true, side: THREE.BackSide,
});
R.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), R.skyMat);
R.sky.renderOrder = -10;
R.sky.frustumCulled = false;
R.scene.add(R.sky);

function setSky(s) {
  R.skyMat.uniforms.uTop.value.set(s.top); R.skyMat.uniforms.uHor.value.set(s.hor); R.skyMat.uniforms.uHaze.value.set(s.haze || s.hor);
  R.skyMat.uniforms.uStars.value = s.stars || 0;
  const p = s.planet;
  if (p) { R.skyMat.uniforms.uPlanet.value.set(p.dir[0], p.dir[1], p.dir[2], p.size); R.skyMat.uniforms.uPCol.value.set(p.col); }
  else R.skyMat.uniforms.uPlanet.value.w = 0;
  R.renderer.setClearColor(s.hor, 1);
}

const SCALES = { low: 240, classic: 400, high: 720 };
function resize() {
  const w = innerWidth, h = innerHeight;
  const lines = SCALES[SETTINGS.scale];
  const pr = lines ? Math.min(1, lines / h) : Math.min(devicePixelRatio || 1, 2);
  R.renderer.setPixelRatio(pr);
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  R.vmCam.aspect = w / h; R.vmCam.updateProjectionMatrix();
  // The weapon sits lower-right on wide screens and centred-low on tall ones.
  R.vmAspect = w / h;
  if (typeof resizeMap === 'function') resizeMap();
}
addEventListener('resize', resize);

// Dynamic point lights: everything that glows registers here each frame; the closest NLIGHTS win.
const DYN = [];
function addLight(x, y, z, r, color, k = 1) { DYN.push({ x, y, z, r, c: color, k }); }
function flushLights() {
  const cp = R.camera.position;
  DYN.sort((a, b) => ((a.x - cp.x) ** 2 + (a.y - cp.y) ** 2 + (a.z - cp.z) ** 2) / (a.r * a.r) - ((b.x - cp.x) ** 2 + (b.y - cp.y) ** 2 + (b.z - cp.z) ** 2) / (b.r * b.r));
  for (let i = 0; i < NLIGHTS; i++) {
    const l = DYN[i];
    if (l) { U.uL.value[i].set(l.x, l.y, l.z, l.r); U.uLC.value[i].set(((l.c >> 16) & 255) / 255 * l.k, ((l.c >> 8) & 255) / 255 * l.k, (l.c & 255) / 255 * l.k); }
    else { U.uL.value[i].set(0, -999, 0, 0); U.uLC.value[i].set(0, 0, 0); }
  }
  DYN.length = 0;
}

function renderFrame() {
  const r = R.renderer;
  R.sky.position.copy(R.camera.position);
  R.camera.getWorldDirection(U.uViewDir.value);
  flushLights();
  r.clear();
  r.render(R.scene, R.camera);
  if (R.vmRoot && R.vmRoot.visible) { r.clearDepth(); r.render(R.vmScene, R.vmCam); }
}
