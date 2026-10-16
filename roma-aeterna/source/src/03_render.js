// Roma Aeterna — renderer, camera, lights, sky dome, materials, settings

const SETTINGS = Object.assign({
  sens: 1, invertY: false, fov: 70, quality: 'auto', vol: 0.8, daySpeed: 1, bob: true, fps: false,
}, (() => { try { return JSON.parse(localStorage.getItem('roma-aeterna.settings') || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem('roma-aeterna.settings', JSON.stringify(SETTINGS)); } catch (e) { /* ignore */ } }
// quality presets: view distance for ordinary cells, shadow map, pixel ratio, crowd size
const QUALITY = {
  low: { view: 420, far: 1800, shadow: 0, pr: 0.75, crowd: 0.55, npcDraw: 70 },
  med: { view: 650, far: 2600, shadow: 1024, pr: 1, crowd: 0.8, npcDraw: 95 },
  high: { view: 900, far: 4200, shadow: 2048, pr: 1.5, crowd: 1, npcDraw: 130 },
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
  scene.fog = new THREE.FogExp2(0xc9d3d6, 0.0011);
  const cam = new THREE.PerspectiveCamera(SETTINGS.fov, 1, 0.12, 9000);
  R.camera = cam; scene.add(cam);

  const hemi = new THREE.HemisphereLight(0xd6e4f2, 0x8a7a5c, 0.6); scene.add(hemi); R.hemi = hemi;
  const amb = new THREE.AmbientLight(0xffffff, 0.1); scene.add(amb); R.amb = amb;
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.0);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 700;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target); R.sun = sun;

  R.mat = {
    vc: new THREE.MeshLambertMaterial({ vertexColors: true }),
    vcDS: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    // lit windows and lamps: dark by day, warm at night (the colour is animated by the sky)
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x1a140f }),
    flame: new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }),
    water: new THREE.MeshPhongMaterial({ color: 0x6f7a55, specular: 0x666655, shininess: 40, transparent: true, opacity: 0.93 }),
    person: new THREE.MeshLambertMaterial({ vertexColors: true }),
  };
  R.mat.foliage = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
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
  R.camera.far = Q.far; R.camera.updateProjectionMatrix();
  resize();
}
function resize() {
  const w = innerWidth, h = innerHeight;
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h; R.camera.fov = SETTINGS.fov; R.camera.updateProjectionMatrix();
}

// ---------- sky ----------
function makeSky() {
  const g = new THREE.SphereGeometry(8000, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x3d6fb0) }, uHor: { value: new THREE.Color(0xbcd2e0) }, uBot: { value: new THREE.Color(0x9a9a88) },
      uSun: { value: new V3(0, 1, 0) }, uSunCol: { value: new THREE.Color(0xfff0c0) }, uMoon: { value: new V3(0, -1, 0) },
      uNight: { value: 0 }, uCloud: { value: 0.3 }, uCloudCol: { value: new THREE.Color(0xffffff) }, uTime: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uTop, uHor, uBot, uSun, uSunCol, uMoon, uCloudCol; uniform float uNight, uCloud, uTime; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=n(p)*a; p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = y > 0.0 ? mix(uHor, uTop, pow(clamp(y,0.0,1.0), 0.5)) : mix(uHor, uBot, clamp(-y*5.0,0.0,1.0));
        float sd = max(dot(d, uSun), 0.0);
        col += uSunCol * (pow(sd, 5.0) * 0.28 + pow(sd, 60.0) * 0.6) * (1.0 - uNight * 0.9);
        col += uSunCol * smoothstep(0.9994, 0.9997, sd) * 2.0 * (1.0 - uNight);
        float md = max(dot(d, uMoon), 0.0);
        col += vec3(0.85,0.9,1.0) * smoothstep(0.9989, 0.9993, md) * uNight * 1.4 + vec3(0.25,0.3,0.42) * pow(md, 20.0) * uNight;
        if (y > 0.0) {
          vec2 sp = d.xz / (y + 0.05) * 70.0;
          float st = step(0.9968, h(floor(sp))) * uNight * smoothstep(0.0, 0.3, y);
          col += vec3(st) * (0.6 + 0.4 * sin(uTime * 3.0 + h(floor(sp)) * 40.0));
          vec2 cp = d.xz / (y + 0.12) * 1.3 + vec2(uTime * 0.004, uTime * 0.0015);
          float c = fbm(cp * 1.3);
          float cov = smoothstep(1.0 - uCloud * 0.95 - 0.1, 1.05 - uCloud * 0.6, c + 0.3);
          vec3 cc = uCloudCol * (0.78 + 0.32 * fbm(cp * 2.6 + 3.0)) + uSunCol * pow(sd, 8.0) * 0.4 * (1.0 - uNight);
          col = mix(col, cc, cov * smoothstep(0.0, 0.2, y) * 0.9);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(g, m);
  sky.frustumCulled = false; sky.renderOrder = -10;
  R.scene.add(sky); R.sky = sky;
}
