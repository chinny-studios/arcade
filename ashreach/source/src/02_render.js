// Ashreach — renderer, camera, sun and sky dome, per-zone atmosphere, day and night cycle

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
  uniforms: { uSun: { value: SUN_DIR }, uHor: { value: HORIZON }, uZen: { value: ZENITH }, uTime: { value: 0 }, uCloud: { value: 0.8 },
    uNight: { value: 0 }, uMoon: { value: new V3(0.3, 0.6, -0.7).normalize() }, uSunVis: { value: 1 } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uSun; uniform vec3 uHor; uniform vec3 uZen; uniform float uTime; uniform float uCloud; uniform float uNight; uniform vec3 uMoon; uniform float uSunVis; varying vec3 vD;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main(){
    float h = clamp(vD.y, -0.2, 1.0);
    vec3 c = mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.55));
    c = mix(c, uHor * 0.8, clamp(-h * 5.0, 0.0, 1.0));
    float s = max(dot(vD, uSun), 0.0);
    c += (vec3(1.0, 0.8, 0.55) * pow(s, 8.0) * 0.35 + vec3(1.0, 0.97, 0.9) * pow(s, 900.0) * 3.0) * uSunVis;
    vec2 p = vD.xz / max(vD.y + 0.05, 0.05) * 1.3 + vec2(uTime * 0.006, uTime * 0.002);
    float n = vn(p) * 0.55 + vn(p * 2.3 + 3.7) * 0.3 + vn(p * 5.1 - 1.3) * 0.15;
    float cl = smoothstep(0.55, 0.82, n) * smoothstep(0.02, 0.25, h) * uCloud;
    vec3 cc = (mix(uHor * 1.05, vec3(1.0), smoothstep(0.6, 0.9, n)) + vec3(0.25, 0.15, 0.05) * pow(s, 4.0) * uSunVis) * (1.0 - 0.82 * uNight);
    c = mix(c, cc, cl * 0.75);
    // night: twinkling stars above the haze and a pale moon opposite the sun
    if (uNight > 0.01) {
      vec2 sp = floor(vD.xz / (vD.y + 1.05) * 260.0);
      float st = step(0.9965, h2(sp)) * smoothstep(0.04, 0.3, h) * (0.6 + 0.4 * sin(uTime * 2.0 + h2(sp + 7.0) * 40.0));
      c += vec3(0.9, 0.93, 1.0) * st * uNight * (1.0 - cl);
      float m = dot(vD, uMoon);
      c += (vec3(0.86, 0.9, 1.0) * smoothstep(0.99925, 0.99955, m) * (1.0 - cl * 0.7) + vec3(0.35, 0.42, 0.6) * pow(max(m, 0.0), 60.0) * 0.25) * uNight;
    }
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat);
sky.frustumCulled = false; sky.renderOrder = -1;
scene.add(sky);

// ---------- day and night ----------
// DN.t runs 0..1 over a day: 0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset; a day lasts DAY_LEN real seconds.
// Each zone's atmos is its noon look; night colours are derived from it, so every zone keeps its own tint after dark.
// atmos.dayCycle (0..1) scales how strongly the cycle applies; interiors (sky: false) ignore it.
const DAY_LEN = 2400;
const DN = { t: 0.3, base: null, amount: 1, night: 0, twi: 0, lampMul: 1, phase: '', frozen: false };
const DN_C = { fogN: new THREE.Color(0x0b1120), zenN: new THREE.Color(0x02050e), horN: new THREE.Color(0x0f1a30), moon: new THREE.Color(0x9fb4ea),
  hemiN: new THREE.Color(0x3c4a7c), hemiGN: new THREE.Color(0x121420), twi: new THREE.Color(0xff8a4a), twiSun: new THREE.Color(0xffa060) };
const _dc = new THREE.Color(), _dv = new V3(), _dw = new V3();

// Apply a zone's atmosphere (see ZONE_DEFS[].atmos in API.md). Missing fields keep defaults.
function setAtmosphere(a) {
  a = a || {};
  const col = (v, d) => new THREE.Color(v === undefined ? d : v);
  DN.base = {
    fog: col(a.fog, 0xd8c7a8), near: a.near ?? 120, far: a.far ?? 900,
    hor: col(a.horizon, a.fog ?? 0xe6d3b3), zen: col(a.zenith, 0x4f7fb8),
    sunCol: col(a.sunColor, 0xfff0d8), sunInt: a.sunInt ?? 1.0,
    hemiSky: col(a.hemiSky, 0xcfe0e8), hemiGround: col(a.hemiGround, 0x6a5a48), hemiInt: a.hemiInt ?? 0.75,
    dir: a.sunDir ? new V3(a.sunDir[0], a.sunDir[1], a.sunDir[2]).normalize() : new V3(-0.5, 0.7, 0.35).normalize(),
  };
  DN.amount = a.sky === false ? 0 : clamp(a.dayCycle ?? 1, 0, 1);
  scene.fog.near = DN.base.near; scene.fog.far = DN.base.far;
  skyMat.uniforms.uCloud.value = a.clouds ?? 0.8;
  sky.visible = a.sky !== false;
  applyDayNight();
}
function dnPhase(t) { return t < 0.21 || t >= 0.81 ? 'night' : t < 0.29 ? 'dawn' : t < 0.71 ? 'day' : 'dusk'; }
// Recompute sun/moon direction, light colours, fog and sky for the current time of day.
function applyDayNight() {
  const B = DN.base;
  if (!B) return;
  const k = DN.amount, th = (DN.t - 0.25) * TAU, el = Math.sin(th);
  const night = k * smooth(0.12, -0.14, el), twi = k * Math.max(0, 1 - Math.abs(el) / 0.32) * (el > -0.2 ? 1 : 0);
  DN.night = night; DN.twi = twi;
  // the sun arcs east to west through the zone's own noon direction; the moon rides opposite
  const e0 = Math.asin(clamp(B.dir.y, 0.2, 0.98)), az0 = Math.atan2(B.dir.x, B.dir.z), az = az0 + (DN.t - 0.5) * Math.PI * 1.2;
  const sunEl = e0 * el, moonEl = e0 * 0.85 * Math.max(0.12, -el);
  _dv.set(Math.cos(sunEl) * Math.sin(az), Math.sin(sunEl), Math.cos(sunEl) * Math.cos(az));
  _dw.set(-Math.cos(moonEl) * Math.sin(az), Math.sin(moonEl), -Math.cos(moonEl) * Math.cos(az));
  skyMat.uniforms.uMoon.value.copy(_dw);
  skyMat.uniforms.uNight.value = night;
  skyMat.uniforms.uSunVis.value = 1 - smooth(0.02, -0.08, el) * k;
  // the directional light follows the sun by day and the moon by night, never grazing the ground
  const useSun = el >= 0 || k < 0.5;
  const L = useSun ? _dv : _dw;
  if (useSun && L.y < 0.12) { L.y = 0.12; L.normalize(); }
  SUN_DIR.copy(B.dir).lerp(L, k).normalize();
  // sky dome sun glow uses the true sun position (it sinks below the horizon at night)
  // (SUN_DIR doubles as uSun, so the glow follows the light; uSunVis hides it once the sun is down)
  const sunUp = smooth(-0.02, 0.22, el), moonUp = smooth(0.0, 0.25, -el);
  sun.color.copy(B.sunCol).lerp(DN_C.twiSun, twi * 0.55);
  if (!useSun) sun.color.copy(DN_C.moon);
  sun.intensity = lerp(B.sunInt, useSun ? B.sunInt * sunUp * (1 - 0.25 * twi) : 0.2 * moonUp, k);
  hemi.color.copy(B.hemiSky).lerp(DN_C.hemiN, night);
  hemi.groundColor.copy(B.hemiGround).lerp(DN_C.hemiGN, night);
  hemi.intensity = B.hemiInt * lerp(1, 0.32, night);
  _dc.copy(B.fog).multiplyScalar(0.18).add(DN_C.fogN);
  scene.fog.color.copy(B.fog).lerp(_dc, night).lerp(DN_C.twi, twi * 0.18);
  _dc.copy(B.hor).multiplyScalar(0.15).add(DN_C.horN);
  HORIZON.copy(B.hor).lerp(_dc, night).lerp(DN_C.twi, twi * 0.42);
  ZENITH.copy(B.zen).lerp(DN_C.zenN, night).lerp(_dc.set(0x3a4a7a), twi * 0.25);
  renderer.setClearColor(scene.fog.color);
  DN.lampMul = 0.5 + 0.65 * night + 0.2 * twi;
}
// Advance the clock; announce dawn/dusk transitions (EV 'daynight').
function updateDayNight(dt) {
  if (!DN.frozen) DN.t = (DN.t + dt / DAY_LEN) % 1;
  applyDayNight();
  const ph = dnPhase(DN.t);
  if (ph !== DN.phase) { const was = DN.phase; DN.phase = ph; if (was) EV.emit('daynight', ph, was); }
}
function setTimeOfDay(t) { DN.t = ((t % 1) + 1) % 1; DN.phase = dnPhase(DN.t); applyDayNight(); }
function clockText(t = DN.t) { const m = Math.floor(t * 1440); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
