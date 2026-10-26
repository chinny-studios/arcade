// 10_sky: the clock, the sun where it really is over Hong Kong in late October (22.3° N, UTC+8), sky colours, fog,
// stars, the moon, and A Symphony of Lights at 8 pm: towers along the Island waterfront flash and beams sweep the sky.
const CLOCK = { t: 16.5, speed: 30, day: 0 };      // hours; speed = game seconds per real second
const SKY = { mesh: null, mat: null, sun: null, moon: null, stars: null, beams: null, sunEl: 0, sunAz: 0, night: 0, show: 0 };
const LAT = 22.3 * D2R, DECL = -12.6 * D2R, NOON = 12.1;

function sunPos(t) {
  const H = (t - NOON) * 15 * D2R;
  const sinEl = Math.sin(LAT) * Math.sin(DECL) + Math.cos(LAT) * Math.cos(DECL) * Math.cos(H);
  const el = Math.asin(sinEl);
  // azimuth from north, clockwise
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(DECL) * Math.cos(LAT)) + Math.PI;
  return [el, az];
}
// direction to (elevation, azimuth) in world space: x east, z south, y up
function dirOf(el, az, out = new V3()) { return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)); }

const SKY_KEYS = [   // sun elevation (deg) -> zenith, horizon, fog, ambient, sun colour
  [-18, 0x05070f, 0x0b1020, 0x0d1222, 0x1c2238, 0x000000],
  [-8, 0x0a1022, 0x1a2038, 0x1b2236, 0x283048, 0x000000],
  [-3, 0x1c2850, 0x6a4a5a, 0x4a4050, 0x4a4a62, 0x301810],
  [2, 0x3a5a90, 0xe08a5a, 0x9a7a70, 0x7a7078, 0xc8603a],
  [8, 0x4a74b0, 0xe8b490, 0xb4a6a0, 0x8c8a90, 0xe8a070],
  [20, 0x5a88c0, 0xbfd0dc, 0xb8c4cc, 0x8a9098, 0xf0dcc0],
  [60, 0x4a80c4, 0xc8d8e4, 0xc0ccd4, 0x8c949c, 0xfff2e0],
];
function skyAt(elDeg) {
  let i = 0; while (i < SKY_KEYS.length - 2 && elDeg > SKY_KEYS[i + 1][0]) i++;
  const A = SKY_KEYS[i], B = SKY_KEYS[i + 1], t = clamp((elDeg - A[0]) / (B[0] - A[0]), 0, 1);
  const mix = (k) => { const a = hex3(A[k]), b = hex3(B[k]); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
  return { zen: mix(1), hor: mix(2), fog: mix(3), amb: mix(4), sun: mix(5) };
}

function buildSky() {
  SKY.mat = new THREE.ShaderMaterial({
    uniforms: { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new V3() }, uSunCol: { value: new THREE.Color() }, uNight: UNI.uNight },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uZen, uHor, uSunCol, uSun; uniform float uNight; varying vec3 vD;
      float b2(vec2 p) { return mod(2.0 * p.x + 3.0 * p.y, 4.0); }
      float bayer(vec2 p) { p = mod(floor(p), 4.0); return (4.0 * b2(mod(p, 2.0)) + b2(floor(p / 2.0)) + 0.5) / 16.0; }
      void main(){
        float h = clamp(vD.y, -0.2, 1.0);
        vec3 c = mix(uHor, uZen, pow(max(h, 0.0), 0.55));
        if (h < 0.0) c = uHor;
        float s = max(dot(normalize(vD), uSun), 0.0);
        c += uSunCol * (pow(s, 8.0) * 0.35 + pow(s, 600.0) * 2.5);
        c += vec3(0.25, 0.12, 0.2) * uNight * smoothstep(0.25, 0.0, h) * 0.6;   // city glow on the night haze
        c = floor(clamp(c, 0.0, 1.0) * 31.0 + bayer(gl_FragCoord.xy)) / 31.0;
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false,
  });
  SKY.mesh = new THREE.Mesh(new THREE.SphereGeometry(8000, 24, 12), SKY.mat);
  SKY.mesh.renderOrder = -10; SKY.mesh.frustumCulled = false;
  scene.add(SKY.mesh); FAR_ONLY.push(SKY.mesh);
  // stars
  const sp = [], r = mulberry32(5);
  for (let i = 0; i < 700; i++) { const a = r() * TAU, y = r() * 0.9 + 0.08, k = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * k * 7000, y * 7000, Math.sin(a) * k * 7000); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  SKY.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfc8e0, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
  SKY.stars.frustumCulled = false; scene.add(SKY.stars); FAR_ONLY.push(SKY.stars);
  // moon (a disc; late October 2026 is around full moon)
  const mg = new THREE.CircleGeometry(90, 16);
  SKY.moon = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0xe8e4d0, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  SKY.moon.frustumCulled = false; scene.add(SKY.moon); FAR_ONLY.push(SKY.moon);
  // light show beams: thin additive blades from tower tops on the Island waterfront
  const tops = [];
  for (const F of MAP.bf) {
    const [kind, h, mh, base] = F; const r2 = F.slice(4); if (h < 100) continue;
    const [cx, cz] = ringCentroid(r2); if (cz < 900 || cz > 2000) continue;
    tops.push([cx, base + h, cz]);
  }
  // the tallest tower in each 300 m stretch of the skyline, from Sheung Wan to Causeway Bay
  const bins = new Map();
  for (const t of tops) { if (t[0] < -1800 || t[0] > 1800) continue; const k = Math.floor(t[0] / 300); if (!bins.has(k) || bins.get(k)[1] < t[1]) bins.set(k, t); }
  SKY.beamTops = [...bins.values()].sort((a, b) => a[0] - b[0]);
  SKY.beamMeshes = SKY.beamTops.map((tp, i) => {
    const g = new Geo(); const c = hex3([0x3a8aff, 0x3aff8a, 0xffffff, 0xff3a8a][i % 4]);
    g.col = [c[0] * 0.45, c[1] * 0.45, c[2] * 0.45];
    // wide enough to show from across the harbour at 240 lines
    g.quad([-18, 0, 0], [18, 0, 0], [70, 1800, 0], [-70, 1800, 0], [0, 0, 1, 0, 1, 1, 0, 1], T.beam, [0, 0, 1]);
    g.quad([0, 0, -18], [0, 0, 18], [0, 1800, 70], [0, 1800, -70], [0, 0, 1, 0, 1, 1, 0, 1], T.beam, [1, 0, 0]);
    const m = g.mesh(MAT.glow); m.position.set(tp[0], tp[1], tp[2]); m.visible = false; m.frustumCulled = false; m.renderOrder = 6; scene.add(m);
    return m;
  });
}

const _sd = new V3();
function updateSky(dt) {
  CLOCK.t += dt * CLOCK.speed / 3600;
  if (CLOCK.t >= 24) { CLOCK.t -= 24; CLOCK.day++; }
  const [el, az] = sunPos(CLOCK.t);
  SKY.sunEl = el; SKY.sunAz = az;
  const elDeg = el / D2R;
  const k = skyAt(elDeg);
  // the fog and the sky meet at the horizon in one colour, so distant towers melt into it
  const hz = [lerp(k.hor[0], k.fog[0], 0.5), lerp(k.hor[1], k.fog[1], 0.5), lerp(k.hor[2], k.fog[2], 0.5)];
  dirOf(el, az, _sd);
  SKY.night = smooth(-1, -9, elDeg);
  // the moon rises in the east as the sun sets
  const [mel, maz] = sunPos(CLOCK.t + 12.2);
  const md = dirOf(mel, maz, new V3());
  if (SKY.mat) {
    SKY.mat.uniforms.uZen.value.setRGB(...k.zen); SKY.mat.uniforms.uHor.value.setRGB(...hz);
    SKY.mat.uniforms.uSun.value.copy(_sd); SKY.mat.uniforms.uSunCol.value.setRGB(...k.sun);
    SKY.mesh.position.copy(camera.position);
    SKY.stars.position.copy(camera.position); SKY.stars.material.opacity = SKY.night * 0.8;
    SKY.moon.position.copy(camera.position).addScaledVector(md, 6000); SKY.moon.lookAt(camera.position);
    SKY.moon.material.opacity = smooth(-0.05, 0.1, mel) * (0.3 + 0.7 * SKY.night);
  }
  // lighting for the PS1 shader
  const sunUp = smooth(-2, 6, elDeg);
  UNI.uSunDir.value.copy(_sd.y > 0.05 ? _sd : _sd.clone().setY(0.05).normalize());
  UNI.uSunCol.value.setRGB(k.sun[0] * sunUp * 0.85, k.sun[1] * sunUp * 0.85, k.sun[2] * sunUp * 0.85);
  UNI.uAmb.value.setRGB(k.amb[0] * 0.95, k.amb[1] * 0.95, k.amb[2] * 1.0);
  UNI.uFogCol.value.setRGB(...hz);
  UNI.uNight.value = SKY.night;
  // Hong Kong haze: shorter view by day, the far lights carry further at night
  UNI.uFogNear.value = 200; UNI.uFogFar.value = lerp(4200, 5200, SKY.night);
  // A Symphony of Lights, 8:00 to 8:10 pm
  const showT = (CLOCK.t - 20) * 60;   // minutes into the show
  SKY.show = showT > 0 && showT < 10 ? smooth(0, 0.3, showT) * smooth(10, 9.7, showT) : 0;
  UNI.uShow.value = SKY.show * (0.6 + 0.4 * Math.sin(UNI.uTime.value * 2.1));
  if (SKY.beamMeshes) SKY.beamMeshes.forEach((m, i) => {
    m.visible = SKY.show > 0.01;
    if (!m.visible) return;
    const t = UNI.uTime.value * 0.5 + i * 1.3;
    m.rotation.set(Math.sin(t) * 0.5, i * 0.7 + t * 0.3, Math.cos(t * 0.8) * 0.45);
  });
}
const clockStr = (t = CLOCK.t) => { const h = Math.floor(t), m = Math.floor((t - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
