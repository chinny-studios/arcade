// Tokoyo — renderer, camera, lights, sky dome, settings

const SETTINGS = Object.assign({
  sens: 1, invertY: false, fov: 65, view: 260, shadows: 2, grass: 1, vol: 0.8, music: 0.5, scale: 1, autoQ: true,
}, (() => { try { return JSON.parse(localStorage.getItem('tokoyo.settings') || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem('tokoyo.settings', JSON.stringify(SETTINGS)); } catch (e) { /* ignore */ } }

const R = {};
function initRender() {
  const canvas = document.getElementById('c');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5) * SETTINGS.scale);
  renderer.shadowMap.enabled = SETTINGS.shadows > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = renderer;
  const scene = new THREE.Scene();
  R.scene = scene;
  scene.fog = new THREE.FogExp2(0x9fb4c0, 0.006);
  const cam = new THREE.PerspectiveCamera(SETTINGS.fov, 1, 0.1, 1600);
  R.camera = cam;
  scene.add(cam);

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a5236, 0.55);
  scene.add(hemi); R.hemi = hemi;
  const amb = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(amb); R.amb = amb;
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.0);
  sun.castShadow = SETTINGS.shadows > 0;
  const ss = SETTINGS.shadows >= 2 ? 2048 : 1024;
  sun.shadow.mapSize.set(ss, ss);
  const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target); R.sun = sun;

  // pool of point lights for fires, torches and lanterns (constant count = no shader recompiles)
  R.lights = [];
  for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xff9a4a, 0, 14, 1.6); scene.add(l); R.lights.push(l); }

  // shared materials
  R.mat = {
    vc: new THREE.MeshLambertMaterial({ vertexColors: true }),
    vcDS: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    ghost: new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.45, depthWrite: false }),
    ghostBad: new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.45, depthWrite: false }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }),
    hurt: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x7a1a10 }),
  };
  R.mat.vcWind = windMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.12);
  // integrity tint materials (blue → green → yellow → red)
  R.mat.integ = [0x3a7bff, 0x45d062, 0xf2d43a, 0xff8a2a, 0xff3030].map((c) => new THREE.MeshLambertMaterial({ vertexColors: true, color: c, emissive: c, emissiveIntensity: 0.25 }));

  makeSky();
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
// Sway vertices by height (foliage). Amount scales with world wind.
const WIND = { t: { value: 0 }, str: { value: 0.4 }, dir: { value: new THREE.Vector2(1, 0.3) } };
function windMaterial(mat, amp) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WIND.t; sh.uniforms.uWind = WIND.str; sh.uniforms.uWDir = WIND.dir;
    sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform vec2 uWDir;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      #ifdef USE_INSTANCING
        vec3 wp = (instanceMatrix * vec4(position, 1.0)).xyz;
      #else
        vec3 wp = position;
      #endif
      float hgt = max(position.y, 0.0);
      float ph = wp.x * 0.21 + wp.z * 0.17;
      float sw = (sin(uTime * 1.7 + ph) * 0.6 + sin(uTime * 3.1 + ph * 1.7) * 0.25) * uWind * ${amp.toFixed(3)} * hgt;
      transformed.x += sw * uWDir.x; transformed.z += sw * uWDir.y;`);
  };
  return mat;
}

// ---------- sky ----------
function makeSky() {
  const g = new THREE.SphereGeometry(1400, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x3d6fb0) }, uHor: { value: new THREE.Color(0xbcd2e0) }, uBot: { value: new THREE.Color(0x6d7f8a) },
      uSun: { value: new V3(0, 1, 0) }, uSunCol: { value: new THREE.Color(0xfff0c0) }, uMoon: { value: new V3(0, -1, 0) },
      uNight: { value: 0 }, uCloud: { value: 0.4 }, uCloudCol: { value: new THREE.Color(0xffffff) }, uTime: { value: 0 },
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
        vec3 col = y > 0.0 ? mix(uHor, uTop, pow(clamp(y,0.0,1.0), 0.55)) : mix(uHor, uBot, clamp(-y*4.0,0.0,1.0));
        float sd = max(dot(d, uSun), 0.0);
        col += uSunCol * (pow(sd, 6.0) * 0.25 + pow(sd, 64.0) * 0.6) * (1.0 - uNight * 0.9);
        col += uSunCol * smoothstep(0.9993, 0.9997, sd) * 2.0 * (1.0 - uNight);
        float md = max(dot(d, uMoon), 0.0);
        col += vec3(0.85,0.9,1.0) * smoothstep(0.9988, 0.9992, md) * uNight * 1.4 + vec3(0.25,0.3,0.4) * pow(md, 24.0) * uNight;
        if (y > 0.0) {
          vec2 sp = d.xz / (y + 0.05) * 60.0;
          float st = step(0.9965, h(floor(sp))) * uNight * smoothstep(0.0, 0.3, y);
          col += vec3(st) * (0.6 + 0.4 * sin(uTime * 3.0 + h(floor(sp)) * 40.0));
          vec2 cp = d.xz / (y + 0.12) * 1.4 + vec2(uTime * 0.006, uTime * 0.002);
          float c = fbm(cp * 1.3);
          float cov = smoothstep(1.0 - uCloud * 0.95 - 0.1, 1.05 - uCloud * 0.6, c + 0.35);
          vec3 cc = uCloudCol * (0.75 + 0.35 * fbm(cp * 2.6 + 3.0)) + uSunCol * pow(sd, 8.0) * 0.4 * (1.0 - uNight);
          col = mix(col, cc, cov * smoothstep(0.0, 0.18, y) * 0.92);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(g, m);
  sky.frustumCulled = false; sky.renderOrder = -10;
  R.scene.add(sky); R.sky = sky;
}

// Assign the pool of point lights to the light sources nearest the camera.
// sources: [{ x, y, z, i (intensity), c (color hex), r (range) }]
function updateLightPool(sources) {
  const cp = R.camera.position;
  sources.sort((a, b) => dist2(a.x, a.z, cp.x, cp.z) - dist2(b.x, b.z, cp.x, cp.z));
  for (let i = 0; i < R.lights.length; i++) {
    const l = R.lights[i], s = sources[i];
    if (s && dist2(s.x, s.z, cp.x, cp.z) < 90 * 90) {
      l.position.set(s.x, s.y, s.z); l.intensity = s.i; l.color.setHex(s.c || 0xff9a4a); l.distance = s.r || 14;
    } else l.intensity = 0;
  }
}
