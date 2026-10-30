// ---- 05_render: renderer, sky, sea, lights, particle effects ----
// waveH(x, z) is the same swell the water shader draws, so ships ride the visible waves.
const R = { waveAmp: 1, wt: 0 };
const WAVES = [ // dirX, dirZ, wavelength, amplitude, speed
  [0.8, 0.6, 62, 0.55, 1.0], [-0.4, 0.9, 37, 0.32, 1.25], [0.95, -0.3, 21, 0.18, 1.6], [-0.7, -0.7, 13, 0.08, 2.1],
];
function waveH(x, z) {
  let y = 0;
  for (const w of WAVES) { const k = TAU / w[2]; y += w[3] * Math.sin((w[0] * x + w[1] * z) * k + R.wt * w[4] * Math.sqrt(9.8 * k)); }
  return y * R.waveAmp;
}

R.init = function () {
  const canvas = $('c');
  const r = R.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.outputEncoding = THREE.sRGBEncoding;
  R.quality = settings.quality === 'auto' ? (Math.min(devicePixelRatio || 1, 1.5)) : settings.quality === 'low' ? 0.75 : Math.min(devicePixelRatio || 1, 2);
  r.setPixelRatio(R.quality);
  const s = R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 9000);
  s.fog = new THREE.Fog(0xa8c4d4, 500, 3400);
  R.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x5a4a32, 0.75); s.add(R.hemi);
  R.sun = new THREE.DirectionalLight(0xfff1d8, 1.05); s.add(R.sun); s.add(R.sun.target);
  R.sunDir = new THREE.Vector3(0.55, 0.42, 0.72).normalize();
  makeSky(); makeWater(); Fx.init();
  addEventListener('resize', R.resize); R.resize();
};
R.resize = function () {
  const w = innerWidth, h = innerHeight;
  R.renderer.setSize(w, h, false); R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  Fx.scale = h * R.renderer.getPixelRatio();
  if (typeof Hud !== 'undefined' && Hud.resize) Hud.resize();
};
R.setLook = function (mapDef, squall) {
  // Time of day per map, darkened and fogged by the squall (0..1).
  const looks = {
    day: { top: [0.24, 0.47, 0.78], hor: [0.70, 0.82, 0.90], sea: [0.04, 0.20, 0.30], sun: [1, 0.95, 0.86], amb: 0.75 },
    evening: { top: [0.20, 0.30, 0.55], hor: [0.95, 0.70, 0.50], sea: [0.05, 0.15, 0.24], sun: [1, 0.78, 0.55], amb: 0.62 },
    noon: { top: [0.18, 0.45, 0.82], hor: [0.75, 0.88, 0.95], sea: [0.03, 0.22, 0.33], sun: [1, 0.98, 0.92], amb: 0.8 },
  };
  const L = looks[mapDef.time] || looks.day, q = squall || 0;
  const gray = [0.42, 0.46, 0.5];
  const mix = (a, b) => a.map((v, i) => lerp(v, b[i], q * 0.85));
  const top = mix(L.top, [0.3, 0.33, 0.37]), hor = mix(L.hor, gray), sea = mix(L.sea, [0.06, 0.12, 0.15]);
  R.sunDir.set(mapDef.sun[0], mapDef.sun[1], mapDef.sun[2]).normalize();
  R.sky.material.uniforms.top.value.setRGB(...top); R.sky.material.uniforms.hor.value.setRGB(...hor);
  R.sky.material.uniforms.sunDir.value.copy(R.sunDir); R.sky.material.uniforms.cloud.value = 0.35 + q * 0.6;
  R.scene.fog.color.setRGB(...hor);
  R.scene.fog.near = lerp(500, 120, q); R.scene.fog.far = lerp(3400, 1100, q);
  const wu = R.water.material.uniforms;
  wu.deep.value.setRGB(...sea); wu.sky.value.setRGB(...hor); wu.sunDir.value.copy(R.sunDir); wu.sunCol.value.setRGB(...L.sun).multiplyScalar(1 - q * 0.8);
  R.sun.color.setRGB(...L.sun); R.sun.intensity = lerp(1.05, 0.35, q); R.hemi.intensity = lerp(L.amb, 0.55, q);
  R.waveAmp = 1 + q * 0.9; wu.amp.value = R.waveAmp;
  R.renderer.setClearColor(R.scene.fog.color);
};

function makeSky() {
  const geo = new THREE.SphereGeometry(8000, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, cloud: { value: 0.35 }, t: { value: 0 } },
    vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w*0.9999; }',
    fragmentShader: `uniform vec3 top, hor, sunDir; uniform float cloud, t; varying vec3 vd;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ vec3 d = normalize(vd); float y = max(d.y, 0.);
        vec3 c = mix(hor, top, pow(y, 0.55));
        float s = max(dot(d, sunDir), 0.); c += vec3(1.,.9,.7)*(pow(s, 900.)*3. + pow(s, 12.)*0.25);
        if (d.y > 0.0) { vec2 uv = d.xz / (d.y + 0.12) * 1.6 + vec2(t*0.004, 0.);
          float cl = n(uv)*0.55 + n(uv*2.3)*0.3 + n(uv*5.1)*0.15; cl = smoothstep(1. - cloud, 1.15 - cloud*0.5, cl) * smoothstep(0., 0.25, d.y);
          c = mix(c, mix(vec3(1.), hor*0.8, cloud*0.7), cl*0.85); }
        if (d.y < 0.) c = hor;
        gl_FragColor = vec4(c, 1.); }`,
  });
  R.sky = new THREE.Mesh(geo, mat); R.sky.frustumCulled = false; R.sky.renderOrder = -10; R.scene.add(R.sky);
}

function makeWater() {
  const geo = new THREE.PlaneGeometry(7000, 7000, 220, 220); geo.rotateX(-Math.PI / 2);
  // Denser vertices near the centre: squash grid toward the middle.
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 3500, z = p.getZ(i) / 3500; p.setX(i, Math.sign(x) * Math.pow(Math.abs(x), 1.8) * 3500); p.setZ(i, Math.sign(z) * Math.pow(Math.abs(z), 1.8) * 3500); }
  // Unrolled so the shader also compiles as GLSL ES 1.0.
  const wcode = WAVES.map((w) => { const k = (TAU / w[2]).toFixed(5), d = `vec2(${w[0].toFixed(3)},${w[1].toFixed(3)})`;
    return `ph = dot(${d}, w.xz)*${k} + t*${(w[4] * Math.sqrt(9.8 * TAU / w[2])).toFixed(5)}; y += ${w[3].toFixed(3)}*sin(ph); g += ${(w[3] * TAU / w[2]).toFixed(5)}*cos(ph)*${d};`; }).join('\n');
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      t: { value: 0 }, amp: { value: 1 }, deep: { value: new THREE.Color(0.04, 0.2, 0.3) }, sky: { value: new THREE.Color(0.7, 0.8, 0.9) },
      sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color(1, 1, 1) }, depth: { value: null }, mapSize: { value: 2600 },
    }]),
    vertexShader: `uniform float t, amp; varying vec3 wp; varying vec3 nrm;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix*vec4(position,1.); float y=0., ph; vec2 g=vec2(0.);
        ${wcode}
        w.y = y*amp; g *= amp; nrm = normalize(vec3(-g.x, 1., -g.y)); wp = w.xyz;
        vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 deep, sky, sunDir, sunCol; uniform float t, mapSize; uniform sampler2D depth; varying vec3 wp; varying vec3 nrm;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 q = wp.xz*0.35; float e = 0.6;
        vec3 dn = vec3(n(q+vec2(t*0.6,0.))-n(q+vec2(e+t*0.6,0.)), 0., n(q+vec2(0.,t*0.5))-n(q+vec2(0.,e+t*0.5)));
        vec3 N = normalize(nrm + dn*0.35);
        vec3 V = normalize(cameraPosition - wp);
        float fr = 0.03 + 0.97*pow(1. - max(dot(N, V), 0.), 5.);
        vec2 uv = wp.xz/mapSize + 0.5; float dep = 30.;
        if (uv.x>0. && uv.x<1. && uv.y>0. && uv.y<1.) dep = -(texture2D(depth, uv).r*80. - 40.);
        vec3 shallow = vec3(0.12, 0.62, 0.62);
        vec3 water = mix(shallow, deep, smoothstep(0.5, 16., dep));
        water = mix(water, vec3(0.85,0.8,0.6), smoothstep(1.2, -0.5, dep)*0.6);
        vec3 c = mix(water, sky, fr*0.75);
        vec3 H = normalize(sunDir + V); c += sunCol*pow(max(dot(N, H), 0.), 220.)*1.6;
        float foam = smoothstep(2.2, 0.2, dep) * (0.5 + 0.5*n(wp.xz*0.15 + t*0.3));
        foam += smoothstep(0.85, 1.25, wp.y) * 0.25;
        c = mix(c, vec3(0.92,0.95,0.95), clamp(foam, 0., 0.85));
        gl_FragColor = vec4(c, 1.);
        #include <fog_fragment>
      }`,
  });
  R.water = new THREE.Mesh(geo, mat); R.water.frustumCulled = false; R.water.renderOrder = -5; R.scene.add(R.water);
}

R.update = function (dt) {
  R.wt += dt;
  const cam = R.camera.position;
  R.water.position.set(Math.round(cam.x / 40) * 40, 0, Math.round(cam.z / 40) * 40);
  R.water.material.uniforms.t.value = R.wt;
  R.sky.position.copy(cam); R.sky.material.uniforms.t.value = R.wt;
  R.sun.position.copy(cam).addScaledVector(R.sunDir, 500); R.sun.target.position.copy(cam);
};
R.render = function () { Fx.upload(); R.renderer.render(R.scene, R.camera); };

// ---- Particles: CPU-simulated points in a few pools (smoke: normal blend; glow: additive; ball: dark dots) ----
const Fx = (() => {
  const F = { scale: 720, pools: {} };
  function softTex(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    if (kind === 'smoke') {
      for (let i = 0; i < 9; i++) {
        const x = 32 + (Math.random() - 0.5) * 22, y = 32 + (Math.random() - 0.5) * 22, r = 12 + Math.random() * 14;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      }
    } else {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      if (kind === 'ball') { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0)'); }
      else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }
    const t = new THREE.CanvasTexture(c); return t;
  }
  function pool(name, max, blending, tex, minPx) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 3), col = new Float32Array(max * 4), size = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: tex }, scale: { value: 720 }, minPx: { value: minPx || 0 } }]),
      vertexShader: `attribute float size; attribute vec4 color; uniform float scale, minPx; varying vec4 vc;
        #include <fog_pars_vertex>
        void main(){ vc = color; vec4 mvPosition = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mvPosition;
          gl_PointSize = clamp(size*scale/max(-mvPosition.z, 0.5), minPx, 900.);
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vc;
        #include <fog_pars_fragment>
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vc.rgb, vc.a*t.a); if (gl_FragColor.a < 0.004) discard;
          #include <fog_fragment>
        }`,
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = name === 'glow' ? 3 : name === 'ball' ? 1 : 2;
    R.scene.add(pts);
    const p = { name, max, n: 0, geo, mat, pts, pos, col, size, d: [] };
    F.pools[name] = p; return p;
  }
  F.init = () => {
    pool('smoke', 6000, THREE.NormalBlending, softTex('smoke'));
    pool('glow', 2500, THREE.AdditiveBlending, softTex('glow'));
    pool('ball', 2400, THREE.NormalBlending, softTex('ball'), 2.5);
    pool('rain', 900, THREE.NormalBlending, softTex('ball'), 1.5);
    pool('fog', 400, THREE.NormalBlending, softTex('smoke'));
  };
  // A particle: x,y,z, vx,vy,vz, size, grow, life, maxLife, r,g,b,a, grav, drag, wind
  F.emit = (pn, x, y, z, vx, vy, vz, size, grow, life, r, g, b, a, grav, drag, wind) => {
    const p = F.pools[pn]; if (p.d.length >= p.max) { if (pn !== 'smoke') return null; p.d.splice(0, 64); } // drop the oldest smoke in a batch
    const q = { x, y, z, vx, vy, vz, s: size, gr: grow || 0, l: life, ml: life, r, g, b, a, grav: grav || 0, drag: drag || 0, wind: wind || 0 };
    p.d.push(q); return q;
  };
  F.wind = { x: 0, z: 0 };
  F.update = (dt) => {
    for (const pn in F.pools) {
      const p = F.pools[pn], d = p.d; let j = 0;
      for (let i = 0; i < d.length; i++) {
        const q = d[i]; q.l -= dt; if (q.l <= 0) continue;
        const k = Math.max(0, 1 - q.drag * dt);
        q.vx = q.vx * k + F.wind.x * q.wind * dt; q.vz = q.vz * k + F.wind.z * q.wind * dt; q.vy = q.vy * k - q.grav * dt;
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.s += q.gr * dt;
        if (q.grav > 0 && q.y < -0.5) { q.l = 0; continue; }
        d[j++] = q;
      }
      d.length = j;
    }
  };
  F.upload = () => {
    for (const pn in F.pools) {
      const p = F.pools[pn], d = p.d, n = Math.min(d.length, p.max);
      for (let i = 0; i < n; i++) {
        const q = d[i], t = q.l / q.ml, fade = pn === 'fog' ? 1 : Math.min(1, t * 2.2) * Math.min(1, (1 - t) * 12 + 0.25);
        p.pos[i * 3] = q.x; p.pos[i * 3 + 1] = q.y; p.pos[i * 3 + 2] = q.z;
        p.col[i * 4] = q.r; p.col[i * 4 + 1] = q.g; p.col[i * 4 + 2] = q.b; p.col[i * 4 + 3] = q.a * fade;
        p.size[i] = q.s;
      }
      p.geo.setDrawRange(0, n);
      p.geo.attributes.position.needsUpdate = p.geo.attributes.color.needsUpdate = p.geo.attributes.size.needsUpdate = true;
      p.mat.uniforms.scale.value = F.scale / (2 * Math.tan(R.camera.fov * DEG / 2));
    }
  };
  F.clear = () => { for (const pn in F.pools) F.pools[pn].d.length = 0; };

  // ---- Effect recipes ----
  F.muzzle = (x, y, z, dx, dz, s) => {
    s = s || 1;
    F.emit('glow', x, y, z, dx * 20, 1, dz * 20, 3.5 * s, 6, 0.12, 1, 0.75, 0.35, 1);
    for (let i = 0; i < 4; i++) {
      const v = rnd(6, 16) * s;
      F.emit('smoke', x + dx * 2, y, z + dz * 2, dx * v + rnd(-1, 1), rnd(0.2, 1.5), dz * v + rnd(-1, 1), 4 * s, 3.2 * s, rnd(7, 11), 0.86, 0.86, 0.84, 0.55, 0, 0.6, 0.35);
    }
  };
  F.splash = (x, z, s) => {
    s = s || 1;
    for (let i = 0; i < 7; i++) F.emit('smoke', x + rnd(-1, 1), 0.5, z + rnd(-1, 1), rnd(-2, 2) * s, rnd(9, 15) * s, rnd(-2, 2) * s, 2.2 * s, 2.2 * s, rnd(1.2, 1.8), 0.95, 0.97, 1, 0.8, 14, 0.2);
    F.emit('smoke', x, 0.4, z, 0, 0.5, 0, 4 * s, 4 * s, 2.2, 0.9, 0.95, 0.95, 0.5, 0, 0.5);
  };
  F.splinters = (x, y, z, s) => {
    s = s || 1;
    F.emit('glow', x, y, z, 0, 0, 0, 4.5 * s, 10, 0.14, 1, 0.82, 0.5, 1);
    for (let i = 0; i < 12; i++) F.emit('ball', x, y, z, rnd(-9, 9) * s, rnd(3, 13) * s, rnd(-9, 9) * s, rnd(0.3, 0.75) * s, 0, rnd(0.7, 1.5), 0.5, 0.33, 0.17, 1, 18, 0.25);
    F.emit('smoke', x, y, z, 0, 1.5, 0, 3 * s, 3.5, 3, 0.48, 0.42, 0.36, 0.6, 0, 0.5, 0.3);
    F.emit('smoke', x, y + 0.5, z, rnd(-1, 1), 2.5, rnd(-1, 1), 2 * s, 2.5, 2, 0.25, 0.22, 0.2, 0.45, 0, 0.5, 0.3);
  };
  F.dust = (x, y, z) => {
    for (let i = 0; i < 4; i++) F.emit('smoke', x, y, z, rnd(-3, 3), rnd(2, 6), rnd(-3, 3), 3, 3, rnd(1.5, 3), 0.62, 0.55, 0.42, 0.6, 3, 0.6, 0.2);
  };
  F.fire = (x, y, z, k) => {
    F.emit('glow', x + rnd(-1, 1), y, z + rnd(-1, 1), rnd(-0.5, 0.5), rnd(3, 6), rnd(-0.5, 0.5), rnd(2, 3.5) * k, -1, rnd(0.4, 0.7), 1, rnd(0.45, 0.7), 0.15, 0.9, 0, 0.5, 0.4);
    if (rand() < 0.4) F.emit('smoke', x, y + 2, z, rnd(-0.5, 0.5), rnd(3, 5), rnd(-0.5, 0.5), 3 * k, 3.2 * k, rnd(4, 6), 0.22, 0.2, 0.19, 0.4, 0, 0.3, 0.7);
  };
  F.explosion = (x, y, z, s) => {
    s = s || 1;
    for (let i = 0; i < 18; i++) F.emit('glow', x, y, z, rnd(-12, 12) * s, rnd(2, 18) * s, rnd(-12, 12) * s, rnd(5, 9) * s, 4, rnd(0.5, 1.1), 1, rnd(0.4, 0.75), 0.15, 1, 4, 1.5);
    for (let i = 0; i < 16; i++) F.emit('smoke', x, y, z, rnd(-8, 8) * s, rnd(2, 12) * s, rnd(-8, 8) * s, rnd(6, 10) * s, 4 * s, rnd(6, 12), 0.15, 0.13, 0.12, 0.75, 0, 0.6, 0.6);
    for (let i = 0; i < 14; i++) F.emit('ball', x, y, z, rnd(-15, 15), rnd(8, 25), rnd(-15, 15), 0.6, 0, rnd(1, 2.2), 0.3, 0.2, 0.1, 1, 18, 0.1);
    F.splash(x, z, 1.6 * s);
  };
  F.wake = (x, z, vx, vz, s) => {
    F.emit('smoke', x, 0.3, z, vx, 0.05, vz, 2.5 * s, 2.2 * s, rnd(3, 5), 0.95, 0.98, 1, 0.38, 0, 0.6);
  };
  F.bubbles = (x, z, s) => {
    F.emit('smoke', x + rnd(-s, s), 0.4, z + rnd(-s, s), 0, 0.6, 0, 3, 3, 2.5, 0.92, 0.96, 0.96, 0.5, 0, 0.5);
  };
  F.rain = (cx, cz, k) => {
    for (let i = 0; i < 10 * k; i++) F.emit('rain', cx + rnd(-60, 60), rnd(20, 40), cz + rnd(-60, 60), F.wind.x * 0.4, -38, F.wind.z * 0.4, 0.12, 0, 1.1, 0.75, 0.8, 0.85, 0.5, 0, 0);
  };
  return F;
})();
