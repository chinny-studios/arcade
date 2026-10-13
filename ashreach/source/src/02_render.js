// Ashreach — renderer, camera, sun and sky dome, per-zone atmosphere

const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 4000);
camera.rotation.order = 'YXZ';

const SUN_DIR = new V3(-0.5, 0.7, 0.35).normalize();
scene.fog = new THREE.Fog(0xd8c7a8, 120, 900);
renderer.setClearColor(scene.fog.color);
const hemi = new THREE.HemisphereLight(0xcfd8e8, 0x6a5a48, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 1.0);
sun.castShadow = true;
const SHADOW_R = 60;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -SHADOW_R, right: SHADOW_R, top: SHADOW_R, bottom: -SHADOW_R, near: 5, far: 600 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
// Shadow frustum follows the player, snapped to texels so shadows don't shimmer.
function placeSun(x, y, z) {
  const texel = (SHADOW_R * 2) / sun.shadow.mapSize.x;
  x = Math.round(x / texel) * texel; z = Math.round(z / texel) * texel;
  sun.target.position.set(x, y, z);
  sun.position.set(x + SUN_DIR.x * 300, y + SUN_DIR.y * 300, z + SUN_DIR.z * 300);
}

// Sky dome: horizon-to-zenith gradient, sun glow, drifting cloud bands. Interiors hide it.
const HORIZON = new THREE.Color(0xe6d3b3), ZENITH = new THREE.Color(0x4f7fb8);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSun: { value: SUN_DIR }, uHor: { value: HORIZON }, uZen: { value: ZENITH }, uTime: { value: 0 }, uCloud: { value: 0.8 } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; uniform vec3 uHor; uniform vec3 uZen; uniform float uTime; uniform float uCloud; varying vec3 vD;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main(){
    float h = clamp(vD.y, -0.2, 1.0);
    vec3 c = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.55));
    c = mix(c, uHor * 0.8, clamp(-h * 5.0, 0.0, 1.0));
    float s = max(dot(vD, uSun), 0.0);
    c += vec3(1.0, 0.8, 0.55) * pow(s, 8.0) * 0.35 + vec3(1.0, 0.97, 0.9) * pow(s, 900.0) * 3.0;
    vec2 p = vD.xz / max(vD.y + 0.05, 0.05) * 1.3 + vec2(uTime * 0.006, uTime * 0.002);
    float n = vn(p) * 0.55 + vn(p * 2.3 + 3.7) * 0.3 + vn(p * 5.1 - 1.3) * 0.15;
    float cl = smoothstep(0.55, 0.82, n) * smoothstep(0.02, 0.25, h) * uCloud;
    vec3 cc = mix(uHor * 1.05, vec3(1.0), smoothstep(0.6, 0.9, n)) + vec3(0.25, 0.15, 0.05) * pow(s, 4.0);
    c = mix(c, cc, cl * 0.75);
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat);
sky.frustumCulled = false; sky.renderOrder = -1;
scene.add(sky);

// Apply a zone's atmosphere (see ZONE_DEFS[].atmos in API.md). Missing fields keep defaults.
function setAtmosphere(a) {
  a = a || {};
  const col = (v, d) => new THREE.Color(v === undefined ? d : v);
  scene.fog.color.copy(col(a.fog, 0xd8c7a8));
  scene.fog.near = a.near ?? 120; scene.fog.far = a.far ?? 900;
  renderer.setClearColor(scene.fog.color);
  HORIZON.copy(col(a.horizon, a.fog ?? 0xe6d3b3));
  ZENITH.copy(col(a.zenith, 0x4f7fb8));
  sun.color.copy(col(a.sunColor, 0xfff0d8)); sun.intensity = a.sunInt ?? 1.0;
  hemi.color.copy(col(a.hemiSky, 0xcfd8e8)); hemi.groundColor.copy(col(a.hemiGround, 0x6a5a48)); hemi.intensity = a.hemiInt ?? 0.75;
  if (a.sunDir) SUN_DIR.set(a.sunDir[0], a.sunDir[1], a.sunDir[2]).normalize();
  skyMat.uniforms.uCloud.value = a.clouds ?? 0.8;
  sky.visible = a.sky !== false;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
