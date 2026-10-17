// The Time Apprentice — renderer, camera, lights, sky dome, environments, settings and quality

const SETTINGS = Object.assign({
  sens: 1, invertY: false, fov: 72, quality: 'auto', vol: 0.8, voice: true, bob: true, fps: false, text: 1,
}, (() => { try { return JSON.parse(localStorage.getItem('time-apprentice.settings') || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem('time-apprentice.settings', JSON.stringify(SETTINGS)); } catch (e) { /* ignore */ } }

const QUALITY = {
  low: { shadow: 0, pr: 0.75 },
  med: { shadow: 1024, pr: 1 },
  high: { shadow: 2048, pr: 1.5 },
};
let Q = QUALITY.high;

const R = {};
function initRender() {
  const canvas = document.getElementById('c');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return false; }
  if (!renderer.getContext()) return false;
  R.renderer = renderer;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  R.scene = scene;
  scene.fog = new THREE.FogExp2(0xdde3e6, 0.004);
  const cam = new THREE.PerspectiveCamera(SETTINGS.fov, 1, 0.08, 2400);
  R.camera = cam; scene.add(cam);
  const hemi = new THREE.HemisphereLight(0xdfeaf6, 0x9a8a6c, 0.65); scene.add(hemi); R.hemi = hemi;
  const amb = new THREE.AmbientLight(0xffffff, 0.12); scene.add(amb); R.amb = amb;
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.0);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target); R.sun = sun; R.sunDir = new V3(0.4, 0.8, 0.3).normalize();
  R.mat = {
    vc: new THREE.MeshLambertMaterial({ vertexColors: true }),
    vcDS: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    glowAdd: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    water: new THREE.MeshPhongMaterial({ color: 0x3f7f8f, specular: 0x88aabb, shininess: 60, transparent: true, opacity: 0.88 }),
    glass: new THREE.MeshPhongMaterial({ color: 0xbfd8ea, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.35 }),
    person: new THREE.MeshLambertMaterial({ vertexColors: true }),
  };
  makeSky();
  addEventListener('resize', resize);
  applyQuality(SETTINGS.quality === 'auto' ? 'high' : SETTINGS.quality);
  resize();
  return true;
}
function applyQuality(name) {
  Q = QUALITY[name] || QUALITY.high; R.qname = name;
  R.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Q.pr));
  const on = Q.shadow > 0;
  R.sun.castShadow = on;
  if (on && R.sun.shadow.mapSize.x !== Q.shadow) { R.sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (R.sun.shadow.map) { R.sun.shadow.map.dispose(); R.sun.shadow.map = null; } }
  resize();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h; R.camera.fov = SETTINGS.fov; R.camera.updateProjectionMatrix();
}

// ---------- sky ----------
function makeSky() {
  const g = new THREE.SphereGeometry(2000, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x3d7fd0) }, uHor: { value: new THREE.Color(0xd8e4ea) }, uBot: { value: new THREE.Color(0xb8b09a) },
      uSun: { value: new V3(0, 1, 0) }, uSunCol: { value: new THREE.Color(0xfff0c0) }, uSunSize: { value: 1 },
      uStars: { value: 0 }, uCloud: { value: 0.3 }, uCloudCol: { value: new THREE.Color(0xffffff) }, uTime: { value: 0 },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `
      uniform vec3 uTop, uHor, uBot, uSun, uSunCol, uCloudCol; uniform float uStars, uCloud, uTime, uSunSize; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=n(p)*a; p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = y > 0.0 ? mix(uHor, uTop, pow(clamp(y,0.0,1.0), 0.55)) : mix(uHor, uBot, clamp(-y*6.0,0.0,1.0));
        float sd = max(dot(d, uSun), 0.0);
        col += uSunCol * (pow(sd, 6.0) * 0.25 + pow(sd, 80.0) * 0.5);
        col += uSunCol * smoothstep(1.0 - 0.0005 * uSunSize, 1.0 - 0.0002 * uSunSize, sd) * 2.0;
        if (y > 0.0) {
          vec2 sp = d.xz / (y + 0.05) * 90.0;
          float st = step(0.996, h(floor(sp))) * uStars * smoothstep(0.0, 0.25, y);
          col += vec3(st) * (0.65 + 0.35 * sin(uTime * 2.0 + h(floor(sp)) * 40.0));
          vec2 cp = d.xz / (y + 0.12) * 1.2 + vec2(uTime * 0.006, uTime * 0.002);
          float c = fbm(cp * 1.3);
          float cov = smoothstep(1.0 - uCloud * 0.95 - 0.1, 1.05 - uCloud * 0.6, c + 0.3);
          vec3 cc = uCloudCol * (0.8 + 0.3 * fbm(cp * 2.6 + 3.0)) + uSunCol * pow(sd, 8.0) * 0.35;
          col = mix(col, cc, cov * smoothstep(0.0, 0.2, y) * 0.9 * step(0.01, uCloud));
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(g, m);
  sky.frustumCulled = false; sky.renderOrder = -10;
  R.scene.add(sky); R.sky = sky;
}

// An environment is plain data, so scenarios can describe their weather and time of day in a few lines:
// { top, hor, bot, sun: [x, y, z], sunCol, sunI, hemiSky, hemiGround, hemiI, amb, fog, fogD, stars, clouds, cloudCol, sky: false }
const ENV_DEFAULT = { top: 0x3d7fd0, hor: 0xd8e4ea, bot: 0xb8b09a, sun: [0.4, 0.8, 0.3], sunCol: 0xfff2dc, sunI: 1.0, sunSize: 1,
  hemiSky: 0xdfeaf6, hemiGround: 0x9a8a6c, hemiI: 0.65, amb: 0.12, fog: 0xdde3e6, fogD: 0.004, stars: 0, clouds: 0.3, cloudCol: 0xffffff, sky: true };
function setEnv(e) {
  const v = Object.assign({}, ENV_DEFAULT, e || {});
  R.env = v;
  const u = R.sky.material.uniforms;
  u.uTop.value.set(v.top); u.uHor.value.set(v.hor); u.uBot.value.set(v.bot);
  R.sunDir.set(v.sun[0], v.sun[1], v.sun[2]).normalize();
  u.uSun.value.copy(R.sunDir); u.uSunCol.value.set(v.sunCol); u.uStars.value = v.stars; u.uCloud.value = v.clouds; u.uCloudCol.value.set(v.cloudCol);
  u.uSunSize.value = v.sunSize;
  R.sky.visible = v.sky;
  R.sun.color.set(v.sunCol); R.sun.intensity = v.sunI;
  R.hemi.color.set(v.hemiSky); R.hemi.groundColor.set(v.hemiGround); R.hemi.intensity = v.hemiI;
  R.amb.intensity = v.amb;
  R.scene.fog.color.set(v.fog); R.scene.fog.density = v.fogD;
  R.renderer.setClearColor(v.fog);
}
// keep the shadow camera on the player
function updateSun(x, z, t) {
  R.sun.target.position.set(x, 0, z);
  R.sun.position.set(x + R.sunDir.x * 150, R.sunDir.y * 150, z + R.sunDir.z * 150);
  R.sky.position.copy(R.camera.position);
  R.sky.material.uniforms.uTime.value = t;
}
