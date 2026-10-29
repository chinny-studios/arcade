// ---- 05_render: renderer, two-pass background (stars, nebula, sun, planet Aster), lights ----
// The background scene is drawn first with its own camera at 1/100 scale (so the planet can be 46 km away
// without depth trouble), then the depth buffer is cleared and the battle is drawn on top.
const BG_SCALE = 0.01;
const R = { t: 0, shake: 0 };
R.init = function () {
  const canvas = $('c');
  const r = R.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.outputEncoding = THREE.sRGBEncoding; r.autoClear = false;
  R.pixel = settings.quality === 'low' ? 0.7 : settings.quality === 'high' ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.25);
  r.setPixelRatio(R.pixel);
  const s = R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(55, 1, 2, 30000);
  R.bg = new THREE.Scene(); R.bgCam = new THREE.PerspectiveCamera(55, 1, 0.5, 3000);
  R.sunDir = new V3(-0.8, 0.22, 0.56).normalize();
  R.sun = new THREE.DirectionalLight(0xfff4e6, 1.15); R.sun.position.copy(R.sunDir); s.add(R.sun);
  // Light from below: Aster's oceans and cities, a cold blue.
  R.hemi = new THREE.HemisphereLight(0x303a55, 0x3d5c8c, 0.5); s.add(R.hemi);
  R.amb = new THREE.AmbientLight(0x1a1e28, 0.6); s.add(R.amb);
  makeStars(); makeNebula(); makeSun(); makePlanet();
  addEventListener('resize', R.resize); R.resize();
};
R.resize = function () {
  const w = innerWidth, h = innerHeight;
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  R.bgCam.aspect = w / h; R.bgCam.updateProjectionMatrix();
  R.pxScale = h * R.renderer.getPixelRatio() / (2 * Math.tan(R.camera.fov * DEG / 2));
  if (typeof Hud !== 'undefined' && Hud.resize) Hud.resize();
};
R.setFov = function (f) {
  if (Math.abs(R.camera.fov - f) < 0.01) return;
  R.camera.fov = f; R.camera.updateProjectionMatrix(); R.bgCam.fov = f; R.bgCam.updateProjectionMatrix();
  R.pxScale = innerHeight * R.renderer.getPixelRatio() / (2 * Math.tan(f * DEG / 2));
};
R.update = function (dt) {
  R.t += dt;
  R.planet.rotation.y += dt * 0.0012;
  R.clouds.rotation.y += dt * 0.0019;
  R.planet.material.uniforms.t.value = R.t;
};
R.render = function () {
  const c = R.camera, b = R.bgCam;
  b.quaternion.copy(c.quaternion); b.position.copy(c.position).multiplyScalar(BG_SCALE);
  R.renderer.clear();
  R.renderer.render(R.bg, b);
  R.renderer.clearDepth();
  R.renderer.render(R.scene, c);
};

function makeStars() {
  const n = 5200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), rr = modelRng(3);
  for (let i = 0; i < n; i++) {
    const u = rr() * 2 - 1, a = rr() * TAU, s = Math.sqrt(1 - u * u);
    // Denser band across the sky: the galaxy's disc.
    let x = s * Math.cos(a), y = u, z = s * Math.sin(a);
    if (i < n * 0.45) { const t = rr() * TAU, w = (rr() - 0.5) * 0.25; x = Math.cos(t); y = w + 0.25 * Math.sin(t); z = Math.sin(t); const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l; }
    pos[i * 3] = x * 2400; pos[i * 3 + 1] = y * 2400; pos[i * 3 + 2] = z * 2400;
    const k = rr(), w = 0.55 + rr() * 0.45;
    col[i * 3] = w * (k < 0.2 ? 1 : k < 0.5 ? 0.85 : 0.75); col[i * 3 + 1] = w * (k < 0.2 ? 0.85 : 0.88); col[i * 3 + 2] = w * (k < 0.2 ? 0.7 : 1);
    size[i] = rr() < 0.04 ? 3.2 : 1 + rr() * 1.4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { px: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float size; attribute vec3 color; varying vec3 vc; uniform float px; void main(){ vc = color; gl_PointSize = size * px; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vc; void main(){ vec2 d = gl_PointCoord - .5; float a = smoothstep(.5, 0., length(d)); gl_FragColor = vec4(vc*a, 1.); }',
  });
  m.uniforms.px.value = Math.max(1, R.pixel);
  R.stars = new THREE.Points(g, m); R.stars.frustumCulled = false; R.bg.add(R.stars);
}
const GLSL_NOISE = `
  float hh(vec3 p){ p = fract(p*0.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
    return mix(mix(mix(hh(i), hh(i+vec3(1,0,0)), f.x), mix(hh(i+vec3(0,1,0)), hh(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hh(i+vec3(0,0,1)), hh(i+vec3(1,0,1)), f.x), mix(hh(i+vec3(0,1,1)), hh(i+vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm3(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a*n3(p); p *= 2.03; a *= .5; } return s; }
`;
function makeNebula() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: GLSL_NOISE + `varying vec3 vd; void main(){ vec3 d = normalize(vd);
      float band = exp(-pow((d.y - 0.25*sin(atan(d.z, d.x)))*3.2, 2.));
      float n = fbm3(d*3.1 + vec3(4.,1.,2.)), m = fbm3(d*6.7 + vec3(1.,7.,3.));
      vec3 c = mix(vec3(.10,.05,.16), vec3(.05,.12,.2), m) * smoothstep(.35, .8, n) * (0.35 + band);
      c += vec3(.16,.08,.05) * smoothstep(.6, .9, m) * band * .5;
      gl_FragColor = vec4(c*0.75, 1.); }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), m); s.frustumCulled = false; R.bg.add(s);
}
function makeSun() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,250,1)'); gr.addColorStop(0.08, 'rgba(255,246,220,1)'); gr.addColorStop(0.22, 'rgba(255,210,150,.35)'); gr.addColorStop(1, 'rgba(255,180,120,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.position.copy(R.sunDir).multiplyScalar(2000); sp.scale.set(420, 420, 1); R.bg.add(sp);
}
function makePlanet() {
  // Aster: an ocean world wrapped in cities. Lit side shows seas and continents, night side the lights of the cities.
  const sun = R.sunDir.clone();
  const m = new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun }, t: { value: 0 } },
    vertexShader: 'varying vec3 vn; varying vec3 vp; varying vec3 vw; void main(){ vn = normalize(mat3(modelMatrix)*normal); vp = position; vec4 w = modelMatrix*vec4(position,1.); vw = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: GLSL_NOISE + `uniform vec3 sunDir; uniform float t; varying vec3 vn; varying vec3 vp; varying vec3 vw;
      void main(){ vec3 p = normalize(vp); vec3 N = normalize(vn);
        float land = fbm3(p*3.0 + 2.); float ln = smoothstep(.5, .53, land);
        vec3 sea = mix(vec3(.03,.1,.24), vec3(.06,.2,.36), fbm3(p*9.));
        vec3 gr = mix(vec3(.24,.27,.16), vec3(.46,.4,.28), fbm3(p*14.));
        float city = smoothstep(.45, .75, fbm3(p*22. + 5.)) * ln;
        vec3 c = mix(sea, mix(gr, vec3(.42,.42,.44), city*.8), ln);
        float ice = smoothstep(.78, .86, abs(p.y) + fbm3(p*6.)*.1);
        c = mix(c, vec3(.85,.9,.95), ice);
        float l = dot(N, sunDir), day = smoothstep(-.08, .25, l);
        vec3 V = normalize(cameraPosition - vw);
        vec3 H = normalize(sunDir + V); float spec = pow(max(dot(N, H), 0.), 60.) * (1. - ln) * day * .6;
        vec3 col = c * (0.03 + max(l, 0.) * 1.7) + vec3(1.,.9,.75)*spec;
        float grid = fbm3(p*80.); float lights = smoothstep(.52, .7, grid) * (city*1.4 + ln*.25) * (1. - ice);
        col += vec3(1.,.72,.38) * lights * (1. - smoothstep(-.25, .05, l)) * 1.3;
        float rim = pow(1. - max(dot(N, V), 0.), 5.);
        col = mix(col, vec3(.35,.6,1.) * (.15 + max(l + .25, 0.)), rim * .6);
        gl_FragColor = vec4(col, 1.); }`,
  });
  // Tilted on its axis, so the fleets fight over the temperate latitudes rather than the pole.
  const piv = new THREE.Group(); piv.position.set(0, -470, 120); piv.rotation.set(1.15, 0, 0.35); R.bg.add(piv);
  const p = R.planet = new THREE.Mesh(new THREE.SphereGeometry(400, 96, 64), m); piv.add(p);
  const cm = new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vn; varying vec3 vp; varying vec3 vw; void main(){ vn = normalize(mat3(modelMatrix)*normal); vp = position; vec4 w = modelMatrix*vec4(position,1.); vw = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: GLSL_NOISE + `uniform vec3 sunDir; varying vec3 vn; varying vec3 vp; varying vec3 vw;
      void main(){ vec3 p = normalize(vp); vec3 N = normalize(vn);
        float c = smoothstep(.56, .78, fbm3(p*5. + vec3(fbm3(p*3.)*2.)));
        float l = max(dot(N, sunDir), 0.);
        vec3 V = normalize(cameraPosition - vw);
        gl_FragColor = vec4(vec3(.95)*(0.03 + l), c*.55*smoothstep(0., .45, dot(N, V))); }`,
  });
  R.clouds = new THREE.Mesh(new THREE.SphereGeometry(402.5, 96, 64), cm); piv.add(R.clouds);
  const am = new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sun } }, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vn; varying vec3 vw; void main(){ vn = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vw = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 sunDir; varying vec3 vn; varying vec3 vw;
      void main(){ vec3 N = normalize(vn); vec3 V = normalize(cameraPosition - vw);
        float edge = pow(smoothstep(0., .32, -dot(N, V)), 1.6);
        float l = clamp(dot(N, sunDir) + .45, 0., 1.);
        gl_FragColor = vec4(vec3(.3,.55,1.) * edge * l * 1.1, 1.); }`,
  });
  const atm = new THREE.Mesh(new THREE.SphereGeometry(418, 96, 64), am); atm.position.copy(piv.position); R.bg.add(atm);
}
