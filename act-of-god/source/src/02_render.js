// Act of God — renderer, camera, the shared lighting uniforms every custom shader reads, the sky and day/night

const R = { renderer: null, scene: null, camera: null, sky: null, w: 1, h: 1, pr: 1, quality: 1 };
// shared uniforms: sun direction and colour, hemisphere ambient, fog, night (0..1), time, storm darkening
const U = {
  uSun: { value: new V3(0.4, 0.8, 0.3).normalize() }, uSunCol: { value: new THREE.Color(1, 0.96, 0.9) },
  uSky: { value: new THREE.Color(0.55, 0.65, 0.8) }, uGnd: { value: new THREE.Color(0.3, 0.28, 0.25) },
  uFog: { value: new THREE.Color(0.7, 0.78, 0.86) }, uFogN: { value: 400 }, uFogF: { value: 5000 },
  uNight: { value: 0 }, uTime: { value: 0 }, uStorm: { value: 0 }, uFlash: { value: 0 },
};
const GLSL_COMMON = `
uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uSky; uniform vec3 uGnd; uniform vec3 uFog;
uniform float uFogN; uniform float uFogF; uniform float uNight; uniform float uTime; uniform float uStorm; uniform float uFlash;
vec3 lit(vec3 base, vec3 n) {
  float d = max(dot(n, uSun), 0.0);
  vec3 amb = mix(uGnd, uSky, n.y * 0.5 + 0.5);
  return base * (amb + uSunCol * d + vec3(uFlash));
}
vec3 fogit(vec3 c, vec3 wp) {
  float dd = length(wp - cameraPosition);
  float f = smoothstep(uFogN, uFogF, dd);
  // thicker near the ground so distant suburbs fade into haze
  f = clamp(f + smoothstep(uFogN * 0.6, uFogF * 1.4, dd) * 0.25 * (1.0 - clamp(wp.y / 400.0, 0.0, 1.0)), 0.0, 1.0);
  return mix(c, uFog, f);
}
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

function initRender() {
  const canvas = $('#c');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG }); } catch (e) { renderer = null; }
  if (!renderer) { $('#nogl').hidden = false; throw new Error('WebGL unavailable'); }
  R.renderer = renderer;
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(50, 16 / 9, 2, 30000);
  makeSky();
  addEventListener('resize', resize);
  resize();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  R.pr = Math.min(devicePixelRatio || 1, 2) * R.quality;
  R.renderer.setPixelRatio(R.pr);
  R.renderer.setSize(w, h, false);
  R.w = w; R.h = h;
  R.camera.aspect = w / h;
  R.camera.fov = w / h < 1 ? 68 : 50;
  R.camera.updateProjectionMatrix();
  bus.emit('resize', w, h);
}
function setQuality(q) { R.quality = q; resize(); }

// ---------- sky ----------
function makeSky() {
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() } }, U),
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`,
    fragmentShader: GLSL_COMMON + `uniform vec3 uTop; uniform vec3 uHor; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD);
        float t = clamp(d.y, -0.2, 1.0);
        vec3 c = mix(uHor, uTop, pow(max(t, 0.0), 0.55));
        c = mix(c, uFog, smoothstep(0.08, -0.05, d.y));
        float s = max(dot(d, uSun), 0.0);
        float day = 1.0 - uNight;
        c += uSunCol * (pow(s, 900.0) * 3.0 * day * (1.0 - uStorm) + pow(s, 12.0) * 0.25 * day);
        // moon opposite the sun
        float mo = max(dot(d, -uSun), 0.0);
        c += vec3(0.85, 0.9, 1.0) * pow(mo, 1400.0) * 2.0 * uNight * (1.0 - uStorm);
        // stars
        if (uNight > 0.01 && d.y > 0.0) {
          vec2 g = floor(vec2(atan(d.z, d.x) * 220.0, asin(d.y) * 220.0));
          float st = h21(g);
          c += vec3(step(0.9965, st) * (0.4 + 0.6 * h21(g + 7.0))) * uNight * (1.0 - uStorm) * smoothstep(0.0, 0.2, d.y);
        }
        c += vec3(uFlash * 0.6);
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  R.sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), m);
  R.sky.frustumCulled = false;
  R.sky.renderOrder = -10;
  R.scene.add(R.sky);
}

// Sets the sun, sky, fog and ambient for the time of day and the storm cover over the camera.
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const SKY = { top: new THREE.Color(), hor: new THREE.Color() };
function updateSky(hour, storm, biome) {
  const a = (hour - 6) / 24 * TAU; // 6:00 sunrise in the east, 18:00 sunset
  const el = Math.sin(a), az = Math.cos(a);
  U.uSun.value.set(az * 0.9, Math.max(el, -1), 0.35).normalize();
  if (el < 0) U.uSun.value.set(-az * 0.9, -el, -0.35).normalize(); // the moon lights the night
  const day = smooth(-0.12, 0.25, el), dusk = smooth(0.35, 0.02, Math.abs(el)) * smooth(-0.2, 0.0, el);
  const night = 1 - day;
  U.uNight.value = night;
  U.uStorm.value = storm;
  const st = storm;
  // sky colours
  SKY.top.setRGB(lerp(0.02, 0.22, day), lerp(0.03, 0.42, day), lerp(0.08, 0.78, day));
  SKY.hor.setRGB(lerp(0.06, 0.66, day), lerp(0.08, 0.76, day), lerp(0.14, 0.9, day));
  if (biome === 'desert') SKY.hor.lerp(_c1.setRGB(0.86, 0.8, 0.68), 0.35 * day);
  SKY.hor.lerp(_c1.setRGB(1.0, 0.5, 0.25), dusk * 0.75);
  SKY.top.lerp(_c1.setRGB(0.35, 0.3, 0.45), dusk * 0.4);
  const grey = _c2.setRGB(lerp(0.04, 0.32, day), lerp(0.045, 0.34, day), lerp(0.05, 0.36, day));
  SKY.top.lerp(grey, st); SKY.hor.lerp(grey, st * 0.9);
  R.sky.material.uniforms.uTop.value.copy(SKY.top);
  R.sky.material.uniforms.uHor.value.copy(SKY.hor);
  U.uFog.value.copy(SKY.hor).lerp(_c1.setRGB(0.5, 0.5, 0.52), 0.1);
  // sun / moon light
  const sc = U.uSunCol.value;
  sc.setRGB(1.0, lerp(0.55, 0.95, smooth(0.0, 0.4, el)), lerp(0.3, 0.88, smooth(0.0, 0.4, el))).multiplyScalar(day * 1.05);
  sc.r += night * 0.1; sc.g += night * 0.12; sc.b += night * 0.2;
  sc.multiplyScalar(1 - st * 0.75);
  U.uSky.value.setRGB(lerp(0.06, 0.48, day), lerp(0.07, 0.54, day), lerp(0.13, 0.64, day)).multiplyScalar(1 - st * 0.3);
  U.uGnd.value.setRGB(lerp(0.04, 0.3, day), lerp(0.04, 0.28, day), lerp(0.05, 0.25, day));
}
