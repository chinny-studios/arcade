// Copter City — particles: two pools of point sprites (additive for fire and sparks, blended for smoke, water,
// gas and dust), plus a few one-off effects built on them.

const FX = { pools: {} };
const PV = `
attribute float size; attribute vec4 rgba;
varying vec4 vC; varying float vFog;
uniform float uH;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(256.0, size * projectionMatrix[1][1] * uH * 0.5 / max(0.5, -mv.z));
  vC = rgba; vFog = -mv.z;
}`;
const PF = `
varying vec4 vC; varying float vFog;
uniform vec3 uFog; uniform float uNear; uniform float uFar; uniform float uAdd;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float a = vC.a * (1.0 - r * r);
  float f = smoothstep(uNear, uFar, vFog);
  vec3 c = mix(vC.rgb, uFog, f * (1.0 - uAdd));
  gl_FragColor = vec4(c, a * (1.0 - f * uAdd));
}`;
function makePool(name, max, additive) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(max * 3), size = new Float32Array(max), rgba = new Float32Array(max * 4);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('rgba', new THREE.BufferAttribute(rgba, 4).setUsage(THREE.DynamicDrawUsage));
  g.setDrawRange(0, 0);
  const m = new THREE.ShaderMaterial({
    vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uH: { value: 360 }, uFog: { value: new THREE.Color() }, uNear: { value: 200 }, uFar: { value: 900 }, uAdd: { value: additive ? 1 : 0 } },
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 3 : 2;
  R.scene.add(pts);
  FX.pools[name] = { pts, g, pos, size, rgba, max, list: [] };
}
function initFX() { makePool('add', 2500, true); makePool('mix', 3500, false); }
// spawn one particle. o: { x, y, z, vx, vy, vz, life, s0, s1, c0: [r,g,b,a], c1, drag, grav, add }
function spark(o) {
  const p = FX.pools[o.add ? 'add' : 'mix'];
  if (p.list.length >= p.max) return null;
  const q = { x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, t: 0, life: o.life || 1, s0: o.s0 || 1, s1: o.s1 === undefined ? o.s0 || 1 : o.s1, c0: o.c0, c1: o.c1 || o.c0, drag: o.drag || 0, grav: o.grav || 0, onDie: o.onDie, floor: o.floor };
  p.list.push(q);
  return q;
}
function updateFX(dt) {
  const fog = R.scene.fog;
  for (const p of Object.values(FX.pools)) {
    const u = p.pts.material.uniforms; u.uH.value = R.h; u.uFog.value.copy(fog.color); u.uNear.value = fog.near; u.uFar.value = fog.far;
    let n = 0;
    const L = p.list;
    for (let i = 0; i < L.length; i++) {
      const q = L[i];
      q.t += dt;
      if (q.t >= q.life) { if (q.onDie) q.onDie(q); continue; }
      const k = Math.exp(-q.drag * dt);
      q.vx *= k; q.vy = q.vy * k - q.grav * dt; q.vz *= k;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.floor !== undefined && q.y < q.floor) { q.y = q.floor; q.vy = 0; q.vx *= 0.5; q.vz *= 0.5; }
      L[n++] = q;
      const f = q.t / q.life, j = n - 1;
      p.pos[j * 3] = q.x; p.pos[j * 3 + 1] = q.y; p.pos[j * 3 + 2] = q.z;
      p.size[j] = lerp(q.s0, q.s1, f);
      const a = q.c0, b = q.c1;
      p.rgba[j * 4] = lerp(a[0], b[0], f); p.rgba[j * 4 + 1] = lerp(a[1], b[1], f); p.rgba[j * 4 + 2] = lerp(a[2], b[2], f);
      p.rgba[j * 4 + 3] = lerp(a[3], b[3], f) * Math.min(1, q.t * 8);
    }
    L.length = n;
    p.g.setDrawRange(0, n);
    p.g.attributes.position.needsUpdate = p.g.attributes.size.needsUpdate = p.g.attributes.rgba.needsUpdate = true;
  }
}
function clearFX() { for (const p of Object.values(FX.pools)) p.list.length = 0; }

// ---------- effects ----------
const C_FIRE0 = [1, 0.75, 0.3, 0.95], C_FIRE1 = [0.9, 0.2, 0.05, 0];
const C_SMOKE0 = [0.22, 0.2, 0.2, 0.7], C_SMOKE1 = [0.4, 0.4, 0.42, 0];
function flame(x, y, z, s = 1) {
  spark({ add: true, x: x + rr(-0.5, 0.5) * s, y, z: z + rr(-0.5, 0.5) * s, vx: rr(-0.6, 0.6), vy: rr(2.5, 5) * s, vz: rr(-0.6, 0.6), life: rr(0.5, 0.9), s0: 3.2 * s, s1: 1.2 * s, c0: C_FIRE0, c1: C_FIRE1, drag: 0.5 });
}
function smoke(x, y, z, s = 1, dark = 1) {
  const c0 = dark ? C_SMOKE0 : [0.85, 0.85, 0.85, 0.5];
  spark({ x: x + rr(-1, 1) * s, y, z: z + rr(-1, 1) * s, vx: rr(-0.5, 0.5) + WIND.x, vy: rr(3, 6), vz: rr(-0.5, 0.5) + WIND.z, life: rr(4, 7), s0: 4 * s, s1: 14 * s, c0, c1: dark ? C_SMOKE1 : [0.9, 0.9, 0.9, 0], drag: 0.25 });
}
function splash(x, y, z, n = 14, s = 1) {
  for (let i = 0; i < n; i++) { const a = rr(0, TAU), v = rr(1, 5) * s; spark({ x, y, z, vx: Math.cos(a) * v, vy: rr(3, 7) * s, vz: Math.sin(a) * v, life: rr(0.6, 1.1), s0: 1.2 * s, s1: 2.2 * s, c0: [0.85, 0.92, 1, 0.8], c1: [0.9, 0.95, 1, 0], grav: 12 }); }
}
function steam(x, y, z, s = 1) { for (let i = 0; i < 2; i++) spark({ x: x + rr(-2, 2) * s, y: y + 1, z: z + rr(-2, 2) * s, vx: rr(-1, 1) + WIND.x, vy: rr(4, 7), vz: rr(-1, 1) + WIND.z, life: rr(1.2, 2.2), s0: 2.5 * s, s1: 6 * s, c0: [0.95, 0.95, 0.95, 0.32], c1: [1, 1, 1, 0], drag: 0.4 }); }
function explosion(x, y, z, s = 1) {
  for (let i = 0; i < 40; i++) { const a = rr(0, TAU), e = rr(-0.3, 1.2), v = rr(4, 14) * s; spark({ add: true, x, y, z, vx: Math.cos(a) * Math.cos(e) * v, vy: Math.sin(e) * v, vz: Math.sin(a) * Math.cos(e) * v, life: rr(0.4, 1), s0: 4 * s, s1: 1, c0: [1, 0.85, 0.4, 1], c1: [1, 0.25, 0.05, 0], drag: 2.5 }); }
  for (let i = 0; i < 16; i++) smoke(x, y, z, s * 1.2);
}
function dust(x, y, z, s = 1) { spark({ x: x + rr(-1, 1), y, z: z + rr(-1, 1), vx: rr(-3, 3) * s, vy: rr(0.3, 1.5), vz: rr(-3, 3) * s, life: rr(0.8, 1.6), s0: 2 * s, s1: 6 * s, c0: [0.6, 0.55, 0.45, 0.45], c1: [0.65, 0.6, 0.5, 0], drag: 1.5 }); }
function gasPuff(x, y, z, s = 1) { spark({ x: x + rr(-1, 1) * s, y: y + rr(0, 1), z: z + rr(-1, 1) * s, vx: rr(-1.5, 1.5) * s, vy: rr(0.2, 1.2), vz: rr(-1.5, 1.5) * s, life: rr(2.5, 4), s0: 3 * s, s1: 9 * s, c0: [0.85, 0.9, 0.75, 0.55], c1: [0.9, 0.95, 0.85, 0], drag: 0.8 }); }
function toxic(x, y, z, s = 1) { spark({ x: x + rr(-2, 2) * s, y: y + rr(0, 1), z: z + rr(-2, 2) * s, vx: rr(-1, 1) + WIND.x * 0.5, vy: rr(0.2, 1), vz: rr(-1, 1) + WIND.z * 0.5, life: rr(3, 5), s0: 4 * s, s1: 12 * s, c0: [0.55, 0.85, 0.2, 0.5], c1: [0.6, 0.8, 0.3, 0], drag: 0.6 }); }
const WIND = { x: 0.8, z: 0.4 };
