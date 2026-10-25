// Shot Heard — renderer, camera, light presets, painted sky, colour-grade pass and the first-person viewmodel scene

const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const QUAL = { low: SET.quality === 'low', pr: 1 };
QUAL.pr = QUAL.low ? 0.75 : Math.min(devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(QUAL.pr);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(SET.fov, 16 / 9, 0.06, 2600);
camera.rotation.order = 'YXZ';
scene.add(camera);

const SUN_DIR = new V3(0.5, 0.5, 0.3).normalize();
scene.fog = new THREE.Fog(0xd0c8b4, 80, 900);
const hemi = new THREE.HemisphereLight(0xc4d0e0, 0x5c5444, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe8c8, 1.0);
sun.castShadow = true;
let SHADOW_R = 70;
sun.shadow.mapSize.set(QUAL.low ? 1024 : 2048, QUAL.low ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -SHADOW_R, right: SHADOW_R, top: SHADOW_R, bottom: -SHADOW_R, near: 1, far: 900 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
// One pooled light for the nearest muzzle flash or burst.
const flashLight = new THREE.PointLight(0xffb060, 0, 22, 2);
scene.add(flashLight);
const LIGHT = { preset: null, smoke: new THREE.Color(1, 1, 1), ambient: new THREE.Color(1, 1, 1) };

function placeSun(x, y, z) {
  const texel = (SHADOW_R * 2) / sun.shadow.mapSize.x;
  x = Math.round(x / texel) * texel; z = Math.round(z / texel) * texel;
  sun.target.position.set(x, y, z);
  sun.position.set(x + SUN_DIR.x * 400, y + SUN_DIR.y * 400, z + SUN_DIR.z * 400);
}

// Sky: warm horizon, cool zenith, sun glow and soft painted clouds.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSun: { value: SUN_DIR }, uHor: { value: new THREE.Color() }, uZen: { value: new THREE.Color() }, uSunC: { value: new THREE.Color() }, uTime: { value: 0 }, uFog: { value: new THREE.Color() } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; uniform vec3 uHor; uniform vec3 uZen; uniform vec3 uSunC; uniform vec3 uFog; uniform float uTime; varying vec3 vD;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main(){
    float h = clamp(vD.y, -0.3, 1.0);
    vec3 c = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.55));
    c = mix(c, uFog, clamp(1.0 - h * 7.0, 0.0, 1.0) * 0.85);
    float s = max(dot(vD, uSun), 0.0);
    c += uSunC * (pow(s, 6.0) * 0.28 + pow(s, 60.0) * 0.4) + vec3(1.0, 0.97, 0.9) * pow(s, 900.0) * 2.5;
    vec2 p = vD.xz / max(vD.y + 0.08, 0.08) * 1.1 + vec2(uTime * 0.006, uTime * 0.002);
    float n = vn(p) * 0.55 + vn(p * 2.3 + 3.7) * 0.3 + vn(p * 5.1 - 1.3) * 0.15;
    float cl = smoothstep(0.5, 0.78, n) * smoothstep(0.0, 0.22, h);
    vec3 cc = mix(uHor * 0.92, vec3(1.0, 0.98, 0.95), smoothstep(0.55, 0.9, n)) + uSunC * pow(s, 3.0) * 0.35;
    c = mix(c, cc, cl * 0.75);
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat);
sky.frustumCulled = false; sky.renderOrder = -1;
scene.add(sky);

// ---------- colour grade (painterly warmth, gentle vignette, paper grain) ----------
let rt = null;
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: { tDiff: { value: null }, uGrade: { value: new V3(1, 1, 1) }, uSat: { value: 1 }, uWarm: { value: 0 }, uTime: { value: 0 }, uHurt: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uBlur: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiff; uniform vec3 uGrade; uniform float uSat; uniform float uWarm; uniform float uTime; uniform float uHurt; uniform vec2 uRes; uniform float uBlur; varying vec2 vUv;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 px = 1.0 / uRes;
    vec3 c = texture2D(tDiff, vUv).rgb;
    // a soft painterly smear: blend toward a small cross blur in flat areas
    vec3 b = (texture2D(tDiff, vUv + vec2(px.x, 0.0) * 1.5).rgb + texture2D(tDiff, vUv - vec2(px.x, 0.0) * 1.5).rgb + texture2D(tDiff, vUv + vec2(0.0, px.y) * 1.5).rgb + texture2D(tDiff, vUv - vec2(0.0, px.y) * 1.5).rgb) * 0.25;
    float edge = length(c - b);
    c = mix(c, b, clamp(0.35 - edge * 3.0, 0.0, 0.35) + uBlur);
    c *= uGrade;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, uSat);
    c += vec3(uWarm, uWarm * 0.45, -uWarm * 0.4) * (1.0 - l);
    c = c * (1.0 + 0.08) - 0.04 * c * c;           // a light S-curve
    vec2 q = vUv - 0.5;
    float v = 1.0 - dot(q, q) * 0.9;
    c *= mix(1.0, v, 0.85);
    float g = h2(vUv * uRes + fract(uTime) * 91.0) - 0.5;
    c += g * 0.025;
    c = mix(c, c * vec3(1.1, 0.35, 0.3), uHurt * smoothstep(0.1, 0.5, length(q)));
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`,
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

// ---------- first-person viewmodel (arms and weapon), drawn over the world ----------
const vmScene = new THREE.Scene();
const vmCamera = new THREE.PerspectiveCamera(55, 16 / 9, 0.01, 10);
const vmHemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.8);
const vmSun = new THREE.DirectionalLight(0xffffff, 0.7);
vmScene.add(vmHemi, vmSun, vmCamera);

function applyLight(name) {
  const L = LIGHTS[name];
  LIGHT.preset = L;
  SUN_DIR.set(...L.sun).normalize();
  sun.color.setHex(L.sunC); sun.intensity = L.sunI;
  hemi.color.setHex(L.sky); hemi.groundColor.setHex(L.gnd); hemi.intensity = L.hemiI;
  scene.fog.color.setHex(L.fog); scene.fog.near = L.near; scene.fog.far = L.far;
  // nothing past the fog can be seen, so let the frustum cull it
  camera.far = L.far * 1.08 + 40; camera.updateProjectionMatrix();
  renderer.setClearColor(scene.fog.color);
  skyMat.uniforms.uHor.value.setHex(L.hor); skyMat.uniforms.uZen.value.setHex(L.zen); skyMat.uniforms.uSunC.value.setHex(L.sunC); skyMat.uniforms.uFog.value.setHex(L.fog);
  postMat.uniforms.uGrade.value.set(...L.grade); postMat.uniforms.uSat.value = L.sat; postMat.uniforms.uWarm.value = L.warm;
  LIGHT.smoke.setHex(L.smoke);
  LIGHT.ambient.setHex(L.sky).lerp(new THREE.Color(L.sunC), 0.5);
  vmHemi.color.setHex(L.sky); vmHemi.groundColor.setHex(L.gnd); vmHemi.intensity = L.hemiI * 1.05;
  vmSun.color.setHex(L.sunC); vmSun.intensity = L.sunI * 0.75;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  vmCamera.aspect = w / h; vmCamera.updateProjectionMatrix();
  const pw = Math.floor(w * renderer.getPixelRatio()), ph = Math.floor(h * renderer.getPixelRatio());
  if (!QUAL.low) {
    if (!rt) rt = new THREE.WebGLRenderTarget(pw, ph, { depthBuffer: true });
    else rt.setSize(pw, ph);
    postMat.uniforms.tDiff.value = rt.texture;
    postMat.uniforms.uRes.value.set(pw, ph);
  }
  resizeHud(w, h);
}
function setQuality(low) {
  QUAL.low = low;
  QUAL.pr = low ? 0.75 : Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(QUAL.pr);
  sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  if (low && rt) { rt.dispose(); rt = null; }
  resize();
}
renderer.info.autoReset = false;
function renderFrame(withVm) {
  renderer.info.reset();
  sky.position.copy(camera.position);
  vmSun.position.copy(SUN_DIR).applyQuaternion(_q1.copy(camera.quaternion).invert());
  if (rt && !QUAL.low) {
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    if (withVm) { renderer.clearDepth(); renderer.render(vmScene, vmCamera); }
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCam);
  } else {
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
    if (withVm) { renderer.clearDepth(); renderer.render(vmScene, vmCamera); }
  }
}
