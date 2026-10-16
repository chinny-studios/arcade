// Roma Aeterna — time of day: sun and moon, sky and fog colours, the night glow of windows and lamps, Roman hours.
// G.hour runs 0..24 (6 = sunrise, 18 = sunset, as at the equinox). One game hour lasts a real minute at speed 1.

const SKYK = [ // hour: sky top, horizon, fog, sun colour, sun intensity, hemi intensity, cloud colour
  [0, 0x0a1224, 0x1a2436, 0x161e2c, 0x8899cc, 0.0, 0.24, 0x2a3040],
  [4.8, 0x101a30, 0x2a3046, 0x1e2534, 0x8899cc, 0.0, 0.26, 0x30364a],
  [5.6, 0x2c3e66, 0xd99a6a, 0x9a8a80, 0xff9a5a, 0.35, 0.3, 0xe0a080],
  [6.6, 0x4a78b8, 0xf0c79a, 0xc9c0b0, 0xffd29a, 0.7, 0.42, 0xfff0e0],
  [9, 0x3f74c0, 0xbcd4e6, 0xc8d4dc, 0xfff2dc, 0.88, 0.52, 0xffffff],
  [15, 0x3f74c0, 0xc4d6e2, 0xcad4da, 0xfff0d6, 0.85, 0.5, 0xffffff],
  [17.2, 0x4a70b0, 0xf2c08a, 0xd0bca0, 0xffc888, 0.72, 0.42, 0xffe6cc],
  [18.2, 0x34467a, 0xe8885a, 0x9c7a70, 0xff8a4a, 0.35, 0.3, 0xe89a7a],
  [19.2, 0x141e3a, 0x40405a, 0x2a2c3c, 0x8899cc, 0.0, 0.28, 0x3a3a50],
  [24, 0x0a1224, 0x1a2436, 0x161e2c, 0x8899cc, 0.0, 0.24, 0x2a3040],
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function skyLerp(h, idx) {
  let i = 0; while (i < SKYK.length - 2 && SKYK[i + 1][0] <= h) i++;
  const a = SKYK[i], b = SKYK[i + 1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  if (idx === 5 || idx === 6) return lerp(a[idx], b[idx], t);
  return _c1.setHex(a[idx]).lerp(_c2.setHex(b[idx]), t).getHex();
}
const SKY = { night: 0, sunDir: new V3(), dayFactor: 1 };
function updateSky(dt) {
  const h = G.hour;
  const th = ((h - 6) / 12) * Math.PI; // 0 at sunrise, PI at sunset
  SKY.sunDir.set(Math.cos(th), Math.sin(th) * 0.86, Math.sin(th) * 0.5 + 0.12).normalize();
  const moon = _v2.copy(SKY.sunDir).multiplyScalar(-1); moon.y = Math.abs(moon.y) * 0.8 + 0.25; moon.normalize();
  const night = 1 - smooth(-0.12, 0.12, SKY.sunDir.y);
  SKY.night = night;
  const u = R.sky.material.uniforms;
  u.uTop.value.setHex(skyLerp(h, 1)); u.uHor.value.setHex(skyLerp(h, 2));
  u.uBot.value.setHex(skyLerp(h, 3)).multiplyScalar(0.9);
  u.uSun.value.copy(SKY.sunDir); u.uMoon.value.copy(moon); u.uNight.value = night;
  u.uSunCol.value.setHex(skyLerp(h, 4)); u.uCloudCol.value.setHex(skyLerp(h, 7)); u.uTime.value += dt;
  const fog = skyLerp(h, 3);
  R.scene.fog.color.setHex(fog);
  R.scene.fog.density = lerp(0.00055, 0.0011, night) * (G.mist || 1);
  // sun or moon light
  const sunI = skyLerp(h, 5);
  const lightDir = sunI > 0.05 ? SKY.sunDir : moon;
  R.sun.intensity = sunI > 0.05 ? sunI : 0.3;
  R.sun.color.setHex(sunI > 0.05 ? skyLerp(h, 4) : 0x8fa4d8);
  R.hemi.intensity = skyLerp(h, 6);
  R.hemi.color.setHex(night > 0.5 ? 0x6a7aa8 : 0xd6e4f2);
  R.hemi.groundColor.setHex(night > 0.5 ? 0x2a2620 : 0x8a7a5c);
  R.amb.intensity = 0.08 + night * 0.06;
  // shadow box follows the player, snapped to texels so edges don't crawl
  const ext = 70, snap = (ext * 2) / Math.max(512, Q.shadow || 1024);
  const px = Math.round(PL.x / snap) * snap, pz = Math.round(PL.z / snap) * snap;
  R.sun.target.position.set(px, PL.y, pz);
  R.sun.position.set(px + lightDir.x * 350, PL.y + lightDir.y * 350, pz + lightDir.z * 350);
  R.sun.target.updateMatrixWorld();
  // windows, lamps and torches glow after dusk
  const glow = smooth(0.25, 0.85, night);
  SKY.glow = glow;
  R.mat.glow.color.setRGB(lerp(0.1, 1.0, glow), lerp(0.08, 0.86, glow), lerp(0.06, 0.62, glow));
  R.horizon.material.color.setHex(skyLerp(h, 3)).lerp(_c1.setHex(0xffffff), 0.35 * (1 - night));
}
const HORAE = ['prima', 'secunda', 'tertia', 'quarta', 'quinta', 'sexta', 'septima', 'octava', 'nona', 'decima', 'undecima', 'duodecima'];
const VIGILIAE = ['prima', 'secunda', 'tertia', 'quarta'];
function romanHour(h) {
  if (h >= 6 && h < 18) return { day: true, n: Math.floor(h - 6) + 1, text: 'Hora ' + HORAE[Math.floor(h - 6)] };
  const nh = (h - 18 + 24) % 24; const v = Math.floor(nh / 3);
  return { day: false, n: v + 1, text: 'Vigilia ' + VIGILIAE[v] };
}
function clockText(h) {
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
