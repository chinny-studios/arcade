// Tokoyo — time of day, sun & moon, weather (rain, mist, storms), wind, fog

const WEATHERS = {
  clear: { name: 'Clear', cloud: 0.25, dark: 0, fog: 1, rain: 0, wind: 0.35, wave: 0.22 },
  overcast: { name: 'Overcast', cloud: 0.8, dark: 0.22, fog: 1.25, rain: 0, wind: 0.5, wave: 0.3 },
  lightrain: { name: 'Light rain', cloud: 0.85, dark: 0.28, fog: 1.5, rain: 0.4, wind: 0.55, wave: 0.32 },
  rain: { name: 'Rain', cloud: 1, dark: 0.4, fog: 1.9, rain: 1, wind: 0.75, wave: 0.45 },
  mist: { name: 'Mist', cloud: 0.6, dark: 0.12, fog: 3.2, rain: 0, wind: 0.15, wave: 0.15, white: 1 },
  storm: { name: 'Thunderstorm', cloud: 1, dark: 0.45, fog: 2.1, rain: 1, wind: 1, wave: 0.7, lightning: 1 },
};
const WEATHER_TABLE = {
  0: [['clear', 4], ['overcast', 2.5], ['rain', 2], ['storm', 1.5]],
  1: [['clear', 6], ['overcast', 2], ['lightrain', 1.6], ['mist', 0.8], ['rain', 0.6]],
  2: [['clear', 2.5], ['overcast', 2.5], ['rain', 2.5], ['mist', 1.5], ['storm', 1]],
};
const SKY = {
  tod: 0.3, day: 0, sun: new V3(), moon: new V3(), night: 0, isNight: false,
  cur: Object.assign({}, WEATHERS.clear), wname: 'clear', rain: 0, windA: 0.6, windS: 0.35, flash: 0, nextBolt: 10, biome: 1,
};
// map game time to time of day with a 65 % day and a 35 % night
function todAt(t) {
  const p = ((t % DAY_LEN) + DAY_LEN) % DAY_LEN / DAY_LEN;
  return p < 0.65 ? 0.23 + (p / 0.65) * 0.54 : (0.77 + ((p - 0.65) / 0.35) * 0.46) % 1;
}
function dayIndex(t) { return Math.floor(t / DAY_LEN) + 1; }
function weatherFor(biome, t) {
  const slot = Math.floor(t / 300);
  const r = hash2(slot, biome, W.seed);
  const tab = WEATHER_TABLE[biome] || WEATHER_TABLE[1];
  let tot = 0; for (const [, w] of tab) tot += w;
  let x = r * tot;
  for (const [n, w] of tab) { x -= w; if (x <= 0) return n; }
  return tab[0][0];
}
// colour keys by sun elevation
const SKY_KEYS = [
  { e: -0.35, top: 0x050a16, hor: 0x111b2c, fog: 0x0e1726, sun: 0x6680b0, si: 0.18, hs: 0x2a3a5a, hg: 0x101410, hi: 0.32 },
  { e: -0.08, top: 0x1a2648, hor: 0x5a4a66, fog: 0x3a3a52, sun: 0x8a7aa0, si: 0.25, hs: 0x5a5a80, hg: 0x2a2620, hi: 0.32 },
  { e: 0.06, top: 0x3a5a92, hor: 0xf0a878, fog: 0xc89a82, sun: 0xffa868, si: 0.75, hs: 0xffd0a0, hg: 0x4a4030, hi: 0.45 },
  { e: 0.3, top: 0x4a7cbc, hor: 0xc0d4de, fog: 0xa9c0ca, sun: 0xfff0d8, si: 0.92, hs: 0xc8dcf0, hg: 0x4a4430, hi: 0.5 },
  { e: 1.0, top: 0x3d72b8, hor: 0xb8d0de, fog: 0xa8c0cc, sun: 0xfff6e6, si: 0.98, hs: 0xccdff2, hg: 0x4c4632, hi: 0.52 },
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function lerpHex(a, b, t, out) { return out.setHex(a).lerp(_c2.setHex(b), t); }
function skyKey(e) {
  let i = 0; while (i < SKY_KEYS.length - 2 && e > SKY_KEYS[i + 1].e) i++;
  const A = SKY_KEYS[i], B = SKY_KEYS[i + 1], t = clamp((e - A.e) / (B.e - A.e), 0, 1);
  return { A, B, t };
}
let rainMesh, rainPos, rainVel;
function initSky() {
  const n = 2600;
  rainPos = new Float32Array(n * 6); rainVel = new Float32Array(n);
  for (let i = 0; i < n; i++) { rainVel[i] = 18 + Math.random() * 8; const x = (Math.random() - 0.5) * 50, y = Math.random() * 30, z = (Math.random() - 0.5) * 50; rainPos.set([x, y, z, x, y - 0.6, z], i * 6); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rainMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.35, depthWrite: false }));
  rainMesh.frustumCulled = false;
  R.scene.add(rainMesh);
}
function updateSky(dt, px, pz) {
  SKY.tod = todAt(G.time);
  SKY.day = dayIndex(G.time);
  const a = (SKY.tod - 0.25) * TAU;
  SKY.sun.set(Math.cos(a) * 0.9, Math.sin(a), 0.42).normalize();
  SKY.moon.copy(SKY.sun).multiplyScalar(-1); SKY.moon.y = Math.abs(SKY.moon.y) * 0.8 + 0.15; SKY.moon.normalize();
  const e = SKY.sun.y;
  SKY.night = 1 - smooth(-0.12, 0.08, e);
  SKY.isNight = e < -0.05;
  // weather follows the biome under the player
  const biome = biomeAt(px, pz);
  SKY.biome = biome;
  const wn = G.forceWeather || weatherFor(biome, G.time);
  SKY.wname = wn;
  const tw = WEATHERS[wn], k = Math.min(1, dt * 0.12);
  for (const key of ['cloud', 'dark', 'fog', 'rain', 'wind', 'wave']) SKY.cur[key] = lerp(SKY.cur[key] || 0, tw[key], k);
  SKY.cur.white = lerp(SKY.cur.white || 0, tw.white || 0, k);
  SKY.cur.lightning = tw.lightning || 0;
  SKY.rain = SKY.cur.rain;
  SKY.windA += (Noise.s2(G.time * 0.002, 3.3)) * dt * 0.02;
  SKY.windS = SKY.cur.wind;
  WIND.str.value = 0.35 + SKY.windS * 1.4; WIND.dir.value.set(Math.cos(SKY.windA), Math.sin(SKY.windA));
  WAVE.amp.value = SKY.cur.wave * (biome === 0 ? 1.4 : 1);

  // colours
  const { A, B, t } = skyKey(e);
  const dark = SKY.cur.dark, cl = SKY.cur.cloud, white = SKY.cur.white;
  const grey = (c, amt) => { const l = (c.r + c.g + c.b) / 3; c.r = lerp(c.r, l, amt); c.g = lerp(c.g, l, amt); c.b = lerp(c.b, l, amt); return c; };
  const u = R.sky.material.uniforms;
  grey(lerpHex(A.top, B.top, t, u.uTop.value), cl * 0.6).multiplyScalar(1 - dark * 0.5);
  grey(lerpHex(A.hor, B.hor, t, u.uHor.value), cl * 0.5).multiplyScalar(1 - dark * 0.4);
  const fogC = grey(lerpHex(A.fog, B.fog, t, _c1), cl * 0.5).multiplyScalar(1 - dark * 0.45);
  if (biome === 2) fogC.multiply(_c2.setRGB(0.82, 0.9, 0.86));
  if (white) fogC.lerp(_c2.setRGB(0.75, 0.78, 0.8).multiplyScalar(1 - SKY.night * 0.85), white * 0.6);
  u.uHor.value.lerp(fogC, 0.5);
  u.uBot.value.copy(fogC);
  R.scene.fog.color.copy(fogC);
  R.renderer.setClearColor(fogC);
  u.uSun.value.copy(SKY.sun); u.uMoon.value.copy(SKY.moon); u.uNight.value = SKY.night; u.uCloud.value = cl; u.uTime.value = G.time;
  lerpHex(A.sun, B.sun, t, u.uSunCol.value);
  u.uCloudCol.value.setRGB(1, 1, 1).lerp(_c2.setRGB(0.45, 0.48, 0.52), dark).multiplyScalar(lerp(1, 0.12, SKY.night)).lerp(fogC, 0.25);
  // fog density
  const base = biome === 2 ? 0.0085 : biome === 0 ? 0.0045 : 0.005;
  const dens = Math.max(base * SKY.cur.fog, 1.8 / SETTINGS.view);
  R.scene.fog.density = dens * (1 + SKY.night * 0.35);
  // lights
  const sunUp = e > -0.05;
  const ld = sunUp ? SKY.sun : SKY.moon;
  R.sun.position.set(px + ld.x * 150, ld.y * 150, pz + ld.z * 150);
  R.sun.target.position.set(px, 0, pz);
  lerpHex(A.sun, B.sun, t, R.sun.color);
  R.sun.intensity = lerp(A.si, B.si, t) * (1 - dark * 0.7) * (sunUp ? smooth(-0.05, 0.08, e) : smooth(-0.05, -0.15, e) * 0.9 + 0.1);
  lerpHex(A.hs, B.hs, t, R.hemi.color); lerpHex(A.hg, B.hg, t, R.hemi.groundColor);
  R.hemi.intensity = lerp(A.hi, B.hi, t) * (1 - dark * 0.3);
  R.amb.intensity = 0.1 + dark * 0.05;
  // lightning
  SKY.flash = Math.max(0, SKY.flash - dt * 3);
  if (SKY.cur.lightning > 0.5 && G.time > SKY.nextBolt) {
    SKY.nextBolt = G.time + 6 + Math.random() * 14;
    SKY.flash = 1;
    setTimeout(() => AU.thunder(0.6 + Math.random() * 0.4), 300 + Math.random() * 1500);
  }
  if (SKY.flash > 0) { R.hemi.intensity += SKY.flash * 1.2; R.scene.fog.color.lerp(_c2.setRGB(0.8, 0.85, 1), SKY.flash * 0.4); }
  // water
  const wu = R.water.material.uniforms;
  wu.uSun.value.copy(ld); wu.uSunCol.value.copy(R.sun.color).multiplyScalar(R.sun.intensity);
  wu.uSky.value.copy(u.uHor.value); wu.uDark.value = Math.max(SKY.night, dark * 0.6);
  wu.uDeep.value.setHex(0x163845).multiplyScalar(lerp(1, 0.25, SKY.night) * (1 - dark * 0.4));
  wu.uShallow.value.setHex(0x3f8c84).multiplyScalar(lerp(1, 0.22, SKY.night) * (1 - dark * 0.4));
  updateRain(dt);
}
function updateRain(dt) {
  const cp = R.camera.position, n = rainVel.length;
  const active = Math.floor(n * clamp(SKY.rain, 0, 1));
  rainMesh.visible = active > 10;
  if (!rainMesh.visible) return;
  rainMesh.position.set(Math.round(cp.x), Math.round(cp.y) - 10, Math.round(cp.z));
  const wx = WIND.dir.value.x * SKY.windS * 4, wz = WIND.dir.value.y * SKY.windS * 4;
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    if (i >= active) { rainPos[o + 1] = rainPos[o + 4] = -999; continue; }
    if (rainPos[o + 1] < -50) { rainPos[o + 1] = Math.random() * 30; }
    const v = rainVel[i] * dt;
    rainPos[o] += wx * dt; rainPos[o + 2] += wz * dt; rainPos[o + 1] -= v;
    if (rainPos[o + 1] < 0) { rainPos[o] = (Math.random() - 0.5) * 50; rainPos[o + 2] = (Math.random() - 0.5) * 50; rainPos[o + 1] = 30; }
    rainPos[o + 3] = rainPos[o] - wx * 0.03; rainPos[o + 4] = rainPos[o + 1] - 0.6; rainPos[o + 5] = rainPos[o + 2] - wz * 0.03;
  }
  rainMesh.geometry.attributes.position.needsUpdate = true;
  rainMesh.material.opacity = 0.25 + SKY.rain * 0.15 - SKY.night * 0.1;
}
