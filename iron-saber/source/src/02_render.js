// Iron Saber — renderer, camera, afternoon lighting, sky dome and per-biome atmosphere

const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 9000);
camera.rotation.order = 'YXZ';

const SUN_DIR = new V3(-0.55, 0.6, 0.42).normalize();
scene.fog = new THREE.Fog(0xc9d6e3, 600, 6200);
renderer.setClearColor(scene.fog.color);

const hemi = new THREE.HemisphereLight(0xc4d8f0, 0x6b6150, 0.78);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 1.0);
sun.castShadow = true;
let SHADOW_R = 220;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -SHADOW_R, right: SHADOW_R, top: SHADOW_R, bottom: -SHADOW_R, near: 10, far: 2400 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.25;
scene.add(sun, sun.target);

// Shadows cover a smaller, crisper area on foot than in a suit.
function setShadowRange(r) {
  if (Math.abs(r - SHADOW_R) < 1) return;
  SHADOW_R = r;
  const c = sun.shadow.camera;
  c.left = -r; c.right = r; c.top = r; c.bottom = -r;
  c.updateProjectionMatrix();
  sun.shadow.normalBias = r < 100 ? 0.06 : 0.25;
}
function placeSun(x, y, z) {
  const texel = (SHADOW_R * 2) / sun.shadow.mapSize.x;
  x = Math.round(x / texel) * texel; z = Math.round(z / texel) * texel;
  sun.target.position.set(x, y, z);
  sun.position.set(x + SUN_DIR.x * 1000, y + SUN_DIR.y * 1000, z + SUN_DIR.z * 1000);
}

// Sky dome: horizon-to-zenith gradient, sun glow and drifting cloud bands.
const HORIZON = new THREE.Color(0xd4e0ec), ZENITH = new THREE.Color(0x3d6fb4);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSun: { value: SUN_DIR }, uHor: { value: HORIZON }, uZen: { value: ZENITH }, uTime: { value: 0 } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; uniform vec3 uHor; uniform vec3 uZen; uniform float uTime; varying vec3 vD;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main(){
    float h = clamp(vD.y, -0.2, 1.0);
    vec3 c = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.5));
    c = mix(c, uHor * 0.85, clamp(-h * 5.0, 0.0, 1.0));
    float s = max(dot(vD, uSun), 0.0);
    c += vec3(1.0, 0.85, 0.6) * pow(s, 8.0) * 0.3 + vec3(1.0, 0.97, 0.9) * pow(s, 1200.0) * 3.0;
    vec2 p = vD.xz / max(vD.y + 0.05, 0.05) * 1.4 + vec2(uTime * 0.008, uTime * 0.003);
    float n = vn(p) * 0.55 + vn(p * 2.3 + 3.7) * 0.3 + vn(p * 5.1 - 1.3) * 0.15;
    float cl = smoothstep(0.55, 0.8, n) * smoothstep(0.02, 0.25, h);
    vec3 cc = mix(vec3(0.88, 0.9, 0.94), vec3(1.0), smoothstep(0.6, 0.9, n)) + vec3(0.2, 0.15, 0.08) * pow(s, 4.0);
    c = mix(c, cc, cl * 0.8);
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), skyMat);
sky.frustumCulled = false; sky.renderOrder = -1;
scene.add(sky);

// Each region tints the haze: dusty desert, crisp mountain air, damp forest.
const ATMOS = {
  city: { fog: new THREE.Color(0xc9d6e3), near: 600, far: 6200 },
  desert: { fog: new THREE.Color(0xe3d2b4), near: 350, far: 5200 },
  mtn: { fog: new THREE.Color(0xcad8ea), near: 800, far: 7000 },
  forest: { fog: new THREE.Color(0xb5c7bd), near: 300, far: 4600 },
  plains: { fog: new THREE.Color(0xcfdce6), near: 700, far: 6500 },
};
const _fc = new THREE.Color();
function updateAtmosphere(x, z, dt) {
  const W = biomeW(x, z, BW_TMP);
  const tc = _fc.setRGB(0, 0, 0);
  let near = 0, far = 0;
  const wts = [['city', W.city], ['desert', (1 - W.city) * W.desert], ['mtn', (1 - W.city) * W.mtn], ['forest', (1 - W.city) * W.forest], ['plains', (1 - W.city) * W.plains]];
  for (const [k, w] of wts) {
    const A = ATMOS[k];
    tc.r += A.fog.r * w; tc.g += A.fog.g * w; tc.b += A.fog.b * w;
    near += A.near * w; far += A.far * w;
  }
  const k = 1 - Math.exp(-dt * 0.8);
  scene.fog.color.lerp(tc, k);
  scene.fog.near = lerp(scene.fog.near, near, k);
  scene.fog.far = lerp(scene.fog.far, far, k);
  HORIZON.copy(scene.fog.color).lerp(_fc.setRGB(1, 1, 1), 0.08);
  renderer.setClearColor(scene.fog.color);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  for (const p of PS) p.mat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  resizeCockpit(w, h);
  resizeHud(w, h);
}
