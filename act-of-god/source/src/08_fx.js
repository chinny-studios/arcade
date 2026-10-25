// Act of God — effects: two particle pools (additive fire and light, alpha-blended smoke, dust, snow, ash and swarms),
// rain streaks, flying debris, lightning bolts, shockwave rings, light beams, the tornado funnel, shield domes, the
// rainbow and the cursor ring that hugs the ground.

const PSHADER = {
  vertexShader: `attribute float aSize; attribute vec4 aC; attribute float aSeed; varying vec4 vC; varying float vSeed; varying vec3 vW; uniform float uScale; uniform float uLit;
    ${'uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uSky; uniform vec3 uGnd;'}
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vW = position;
      gl_PointSize = clamp(aSize * uScale / max(1.0, -mv.z), 0.0, 900.0);
      gl_Position = projectionMatrix * mv;
      vec3 light = mix(vec3(1.0), mix(uGnd, uSky, 0.6) + uSunCol * 0.55, uLit);
      vC = vec4(aC.rgb * light, aC.a); vSeed = aSeed;
    }`,
  fragmentShader: `uniform float uSoft; uniform vec3 uFog; uniform float uFogN; uniform float uFogF; varying vec4 vC; varying float vSeed; varying vec3 vW;
    float hh(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float r = length(c) * 2.0;
      float a;
      if (uSoft > 0.5) {
        float n = vn(c * 4.0 + vSeed * 13.0) * 0.6 + vn(c * 9.0 - vSeed * 7.0) * 0.4;
        a = smoothstep(1.0, 0.25 + 0.5 * n, r + 0.15 * n);
      } else a = smoothstep(1.0, 0.0, r);
      a *= vC.a;
      if (a < 0.01) discard;
      float dd = length(vW - cameraPosition);
      float fo = smoothstep(uFogN, uFogF * 1.2, dd);
      gl_FragColor = vec4(mix(vC.rgb, uFog, fo * uSoft), a * (1.0 - fo * (1.0 - uSoft) * 0.8));
    }`,
};
class Particles {
  constructor(cap, additive, soft, lit) {
    this.cap = cap; this.n = 0; this.next = 0;
    this.p = new Float32Array(cap * 3); this.v = new Float32Array(cap * 3); this.life = new Float32Array(cap); this.max = new Float32Array(cap);
    this.s0 = new Float32Array(cap); this.s1 = new Float32Array(cap); this.c = new Float32Array(cap * 4); this.a0 = new Float32Array(cap);
    this.drag = new Float32Array(cap); this.grav = new Float32Array(cap); this.fadeIn = new Float32Array(cap);
    this.size = new Float32Array(cap); this.seed = new Float32Array(cap);
    for (let i = 0; i < cap; i++) { this.seed[i] = Math.random(); this.p[i * 3 + 1] = -1e5; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aC', new THREE.BufferAttribute(this.c, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ uScale: { value: 400 }, uSoft: { value: soft ? 1 : 0 }, uLit: { value: lit ? 1 : 0 } }, U),
      vertexShader: PSHADER.vertexShader, fragmentShader: PSHADER.fragmentShader,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.pts = new THREE.Points(g, this.mat);
    this.pts.frustumCulled = false;
    this.pts.renderOrder = additive ? 6 : 5;
    R.scene.add(this.pts);
    this.alive = 0;
  }
  // position, velocity, life (s), start and end size (m), colour, alpha, drag, gravity (negative rises)
  emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, drag = 0, grav = 0, fadeIn = 0) {
    const i = this.next; this.next = (this.next + 1) % this.cap;
    const o = i * 3;
    this.p[o] = x; this.p[o + 1] = y; this.p[o + 2] = z;
    this.v[o] = vx; this.v[o + 1] = vy; this.v[o + 2] = vz;
    this.life[i] = life; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    this.c[i * 4] = r; this.c[i * 4 + 1] = g; this.c[i * 4 + 2] = b; this.a0[i] = a;
    this.drag[i] = drag; this.grav[i] = grav; this.fadeIn[i] = fadeIn;
    return i;
  }
  update(dt) {
    const p = this.p, v = this.v, life = this.life, c = this.c;
    let alive = 0;
    for (let i = 0; i < this.cap; i++) {
      if (life[i] <= 0) { if (this.size[i] !== 0) { this.size[i] = 0; c[i * 4 + 3] = 0; p[i * 3 + 1] = -1e5; } continue; }
      alive++;
      life[i] -= dt;
      const o = i * 3, dr = Math.exp(-this.drag[i] * dt);
      v[o] *= dr; v[o + 1] = v[o + 1] * dr - this.grav[i] * dt; v[o + 2] *= dr;
      p[o] += v[o] * dt; p[o + 1] += v[o + 1] * dt; p[o + 2] += v[o + 2] * dt;
      const t = 1 - life[i] / this.max[i];
      this.size[i] = lerp(this.s0[i], this.s1[i], t);
      const fi = this.fadeIn[i] > 0 ? Math.min(1, t / this.fadeIn[i]) : 1;
      c[i * 4 + 3] = this.a0[i] * fi * (1 - t) * (t > 0.7 ? (1 - t) / 0.3 * 0.7 + 0.3 * (1 - t) : 1);
    }
    this.alive = alive;
    const g = this.pts.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aC.needsUpdate = true;
    this.mat.uniforms.uScale.value = R.h * R.pr / (2 * Math.tan(R.camera.fov * Math.PI / 360));
  }
  clear() { this.life.fill(0); }
}

const FX = { add: null, smoke: null, debris: [], bolts: [], rings: [], beams: [], meshes: [], rain: null, cursor: null };
function initFx() {
  FX.add = new Particles(9000, true, false, false);
  FX.smoke = new Particles(9000, false, true, true);
  FX.fine = new Particles(7000, false, false, true); // snow, hail, locusts, sparks of dirt
  // debris chunks: instanced boxes flung by explosions, tornadoes and collapses
  FX.deb = new Batch(SHAPES.box, 900);
  for (let i = 0; i < 900; i++) FX.deb.alloc();
  FX.debN = 0;
  FX.debris = Array.from({ length: 900 }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, s: 1, sp: 0, t: 0, col: 0x888888, orbit: null }));
  R.scene.add(FX.deb.mesh);
  // rain streaks around the camera
  const n = 2400, pos = new Float32Array(n * 6);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  FX.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaab4c0, transparent: true, opacity: 0.35, depthWrite: false }));
  FX.rain.frustumCulled = false; FX.rain.visible = false;
  FX.rainN = n; FX.rainDrops = Array.from({ length: n }, () => ({ x: 0, y: -1e5, z: 0 }));
  R.scene.add(FX.rain);
  // the cursor ring
  const cg = new THREE.BufferGeometry();
  const CN = 72;
  cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array((CN + 1) * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const ci = []; for (let i = 0; i < CN; i++) { const a = i * 2; ci.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  cg.setIndex(ci);
  FX.cursor = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0.8, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
  FX.cursor.frustumCulled = false; FX.cursor.renderOrder = 20; FX.cursorN = CN;
  R.scene.add(FX.cursor);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
  FX.cursorDot = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }));
  FX.cursorDot.renderOrder = 21;
  R.scene.add(FX.cursorDot);
}
function clearFx() {
  FX.add.clear(); FX.smoke.clear(); FX.fine.clear();
  for (const d of FX.debris) if (d.on) { d.on = false; FX.deb.mesh.setMatrixAt(FX.debris.indexOf(d), ZERO_M); }
  FX.deb.lo = 0; FX.deb.hi = FX.deb.cap - 1;
  for (const o of FX.bolts.concat(FX.rings, FX.beams, FX.meshes)) { R.scene.remove(o.m); o.m.geometry.dispose(); }
  FX.bolts = []; FX.rings = []; FX.beams = []; FX.meshes = [];
}

// ---------- particle helpers ----------
function puffSmoke(x, y, z, size, dark = 0.2, life = 8, rise = 4) {
  const c = dark;
  FX.smoke.emit(x, y, z, rr(-1, 1) + G.wind.x * 0.5, rise * rr(0.6, 1.2), rr(-1, 1) + G.wind.z * 0.5, life * rr(0.7, 1.3), size, size * 3.2, c, c * 0.97, c * 0.94, 0.75, 0.3, -0.05, 0.15);
}
function puffDust(x, y, z, size, life = 6, col = [0.55, 0.5, 0.44]) {
  const a = rr(0, TAU), s = rr(2, 8);
  FX.smoke.emit(x, y, z, Math.cos(a) * s, rr(1, 5), Math.sin(a) * s, life * rr(0.7, 1.3), size, size * 3, col[0], col[1], col[2], 0.7, 0.6, 0.1, 0.05);
}
function flame(x, y, z, size, life = 1.1) {
  const hot = Math.random();
  FX.add.emit(x + rr(-1, 1) * size * 0.3, y, z + rr(-1, 1) * size * 0.3, rr(-0.5, 0.5) + G.wind.x * 0.2, rr(3, 7) * (0.5 + size * 0.05), rr(-0.5, 0.5) + G.wind.z * 0.2, life * rr(0.6, 1.2), size, size * 0.3,
    1.0, lerp(0.3, 0.75, hot), lerp(0.05, 0.25, hot), 0.9, 0.5, -1.5);
}
function spark(x, y, z, sp = 12, col = [1, 0.7, 0.3], life = 1.2, size = 1.2) {
  const a = rr(0, TAU), e = rr(0.2, 1.3);
  FX.add.emit(x, y, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, life * rr(0.5, 1.2), size, size * 0.2, col[0], col[1], col[2], 1, 0.4, 9.8);
}
function glowAt(x, y, z, size, col, life = 0.4, a = 1) { FX.add.emit(x, y, z, 0, 0, 0, life, size, size * 1.4, col[0], col[1], col[2], a, 0, 0); }
function steam(x, y, z) { FX.smoke.emit(x + rr(-3, 3), y, z + rr(-3, 3), rr(-1, 1), rr(3, 6), rr(-1, 1), rr(3, 6), 4, 16, 0.85, 0.87, 0.9, 0.5, 0.4, -0.2, 0.1); }
bus.on('steam', (x, y, z) => steam(x, y, z));

// ---------- debris ----------
function throwDebris(x, y, z, n, speed, col, size = 2, orbit = null) {
  for (let k = 0; k < n; k++) {
    let i = -1;
    for (let q = 0; q < 40; q++) { const j = (FX.debN + q) % FX.debris.length; if (!FX.debris[j].on) { i = j; break; } }
    if (i < 0) i = FX.debN % FX.debris.length;
    FX.debN = (i + 1) % FX.debris.length;
    const d = FX.debris[i];
    const a = rr(0, TAU), e = rr(0.3, 1.2), s = speed * rr(0.4, 1.1);
    Object.assign(d, { on: true, x: x + rr(-2, 2), y, z: z + rr(-2, 2), vx: Math.cos(a) * Math.cos(e) * s, vy: Math.sin(e) * s, vz: Math.sin(a) * Math.cos(e) * s, rx: rr(0, TAU), ry: rr(0, TAU), sp: rr(-6, 6), s: size * rr(0.4, 1.3), t: rr(4, 8), col: Array.isArray(col) ? pick(col) : col, orbit });
    _col.setHex(d.col);
    FX.deb.aCol.setXYZ(i, _col.r, _col.g, _col.b);
    FX.deb.aSt.setXYZW(i, 0.3, 0, 0, 0);
    FX.deb.aSt2.setXYZW(i, 6, i, -100, 0);
  }
}
function updateDebris(dt) {
  const B = FX.deb;
  for (let i = 0; i < FX.debris.length; i++) {
    const d = FX.debris[i];
    if (!d.on) continue;
    d.t -= dt;
    if (d.orbit && d.orbit.alive) { // swept around a tornado
      const o = d.orbit, dx = d.x - o.x, dz = d.z - o.z, r = Math.hypot(dx, dz) + 0.01;
      const tx = -dz / r, tz = dx / r;
      const want = o.r * 0.9;
      d.vx = damp(d.vx, tx * o.spin + (dx / r) * (want - r) * 0.8 + o.vx, 3, dt);
      d.vz = damp(d.vz, tz * o.spin + (dz / r) * (want - r) * 0.8 + o.vz, 3, dt);
      d.vy = damp(d.vy, d.y < o.top * 0.7 ? 8 : -2, 1, dt);
      if (Math.random() < dt * 0.15) d.orbit = null;
    } else d.vy -= 9.8 * dt;
    d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    d.rx += d.sp * dt; d.ry += d.sp * 0.7 * dt;
    const gy = heightAt(d.x, d.z);
    if (d.y < gy + d.s * 0.3) { d.y = gy + d.s * 0.3; d.vy *= -0.25; d.vx *= 0.5; d.vz *= 0.5; d.sp *= 0.5; if (Math.abs(d.vy) < 1) d.t = Math.min(d.t, 2.5); }
    if (d.t <= 0) { d.on = false; B.mesh.setMatrixAt(i, ZERO_M); B.touch(i); continue; }
    const sc = d.s * Math.min(1, d.t);
    _m.compose(_p4.set(d.x, d.y, d.z), _q4.setFromEuler(new THREE.Euler(d.rx, d.ry, 0)), _s4.set(sc, sc * 0.6, sc * 0.8));
    B.mesh.setMatrixAt(i, _m); B.touch(i);
  }
}

// ---------- lightning ----------
const BOLT_MAT = new THREE.MeshBasicMaterial({ color: 0xdde8ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
function bolt(x0, y0, z0, x1, y1, z1, width = 2.5, branches = 4) {
  const pos = [];
  const cam = R.camera.position;
  const seg = (ax, ay, az, bx, by, bz, w, depth) => {
    const n = Math.max(4, Math.round(Math.hypot(bx - ax, by - ay, bz - az) / 25));
    let px = ax, py = ay, pz = az;
    const L = Math.hypot(bx - ax, by - ay, bz - az);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const j = i === n ? 0 : L * 0.04;
      const qx = lerp(ax, bx, t) + rr(-j, j), qy = lerp(ay, by, t) + rr(-j, j) * 0.3, qz = lerp(az, bz, t) + rr(-j, j);
      // ribbon facing the camera
      _v1.set(qx - px, qy - py, qz - pz); _v2.set(cam.x - px, cam.y - py, cam.z - pz); _v3.crossVectors(_v1, _v2).normalize().multiplyScalar(w * (1 - t * 0.5));
      pos.push(px - _v3.x, py - _v3.y, pz - _v3.z, px + _v3.x, py + _v3.y, pz + _v3.z, qx + _v3.x, qy + _v3.y, qz + _v3.z);
      pos.push(px - _v3.x, py - _v3.y, pz - _v3.z, qx + _v3.x, qy + _v3.y, qz + _v3.z, qx - _v3.x, qy - _v3.y, qz - _v3.z);
      if (depth < 2 && Math.random() < branches / n) {
        const bl = L * rr(0.1, 0.3);
        seg(qx, qy, qz, qx + rr(-1, 1) * bl, qy - bl * rr(0.4, 0.9), qz + rr(-1, 1) * bl, w * 0.45, depth + 1);
      }
      px = qx; py = qy; pz = qz;
    }
  };
  seg(x0, y0, z0, x1, y1, z1, width, 0);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(g, BOLT_MAT.clone());
  m.frustumCulled = false; m.renderOrder = 8;
  R.scene.add(m);
  FX.bolts.push({ m, t: 0.35 });
  U.uFlash.value = Math.max(U.uFlash.value, 0.6);
  for (let k = 0; k < 6; k++) glowAt(x1, y1 + 4, z1, rr(30, 60), [0.7, 0.8, 1.0], 0.3);
}

// ---------- rings, beams and meshes ----------
function ring(x, z, r0, r1, life, col, opacity = 0.7, y) {
  const g = new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
  m.position.set(x, y === undefined ? heightAt(x, z) + 3 : y, z);
  m.renderOrder = 7;
  R.scene.add(m);
  FX.rings.push({ m, t: 0, life, r0, r1, op: opacity });
}
const BEAM_GEO = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0);
function beam(x, z, r, h, col, life, o = {}) {
  const m = new THREE.Mesh(BEAM_GEO, new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 0 }, uTime: U.uTime },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA; uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 vd = normalize(cameraPosition - vW); float edge = pow(1.0 - abs(dot(vd, normalize(vec3(vN.x, 0.0, vN.z)))), 1.5);
        float a = (1.0 - edge) * uA * (1.0 - vUv.y) * (0.75 + 0.25 * sin(vUv.y * 40.0 - uTime * 8.0 + vUv.x * 30.0));
        gl_FragColor = vec4(uCol * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  m.position.set(x, o.y !== undefined ? o.y : heightAt(x, z) - 2, z);
  m.scale.set(r, h, r);
  m.renderOrder = 9; m.frustumCulled = false;
  R.scene.add(m);
  const B = { m, t: 0, life, a: o.a || 0.8, r, grow: o.grow || 0 };
  FX.beams.push(B);
  return B;
}
function updateFxMeshes(dt) {
  for (const b of FX.bolts) { b.t -= dt; b.m.material.opacity = Math.max(0, b.t / 0.35) * (0.6 + 0.4 * Math.random()); }
  FX.bolts = FX.bolts.filter((b) => { if (b.t > 0) return true; R.scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); return false; });
  for (const r of FX.rings) { r.t += dt; const k = r.t / r.life, s = lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 2)); r.m.scale.set(s, 1, s); r.m.material.opacity = r.op * (1 - k); }
  FX.rings = FX.rings.filter((r) => { if (r.t < r.life) return true; R.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); return false; });
  for (const b of FX.beams) {
    b.t += dt;
    const k = b.t / b.life;
    b.m.material.uniforms.uA.value = b.a * smooth(0, 0.12, k) * (1 - smooth(0.7, 1, k));
    if (b.grow) { const s = b.r * (1 + b.grow * k); b.m.scale.x = b.m.scale.z = s; }
  }
  FX.beams = FX.beams.filter((b) => { if (b.t < b.life) return true; R.scene.remove(b.m); b.m.material.dispose(); return false; });
  U.uFlash.value = Math.max(0, U.uFlash.value - dt * 3);
}

// ---------- rain ----------
function updateRain(dt, amount) {
  FX.rain.visible = amount > 0.02;
  if (!FX.rain.visible) return;
  const p = FX.rain.geometry.attributes.position.array, cam = R.camera.position;
  const span = clamp(cam.y * 0.8, 60, 400), n = Math.floor(FX.rainN * clamp(amount, 0, 1));
  const wx = G.wind.x * 0.6, wz = G.wind.z * 0.6, len = 0.06;
  for (let i = 0; i < FX.rainN; i++) {
    const d = FX.rainDrops[i], o = i * 6;
    if (i >= n) { p[o + 1] = p[o + 4] = -1e5; continue; }
    d.y -= 60 * dt; d.x += wx * dt; d.z += wz * dt;
    if (d.y < cam.y - span || Math.abs(d.x - cam.x) > span || Math.abs(d.z - cam.z) > span) { d.x = cam.x + rr(-span, span); d.z = cam.z + rr(-span, span); d.y = cam.y + rr(-span * 0.3, span * 0.8); }
    p[o] = d.x; p[o + 1] = d.y; p[o + 2] = d.z;
    p[o + 3] = d.x - wx * len; p[o + 4] = d.y + 60 * len; p[o + 5] = d.z - wz * len;
  }
  FX.rain.geometry.attributes.position.needsUpdate = true;
  FX.rain.material.opacity = 0.18 + 0.25 * clamp(amount, 0, 1);
}

// ---------- the cursor ring ----------
function updateCursor(x, z, r, col, visible) {
  FX.cursor.visible = FX.cursorDot.visible = visible;
  if (!visible) return;
  const p = FX.cursor.geometry.attributes.position.array, N = FX.cursorN;
  const w = Math.max(1.5, r * 0.035) * (1 + R.camera.position.distanceTo(_v1.set(x, heightAt(x, z), z)) / 1500);
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU, c = Math.cos(a), s = Math.sin(a);
    const x0 = x + c * (r - w), z0 = z + s * (r - w), x1 = x + c * r, z1 = z + s * r;
    const y0 = Math.max(heightAt(x0, z0), waterSurface(x0, z0)) + 1.2, y1 = Math.max(heightAt(x1, z1), waterSurface(x1, z1)) + 1.2;
    p.set([x0, y0, z0, x1, y1, z1], i * 6);
  }
  FX.cursor.geometry.attributes.position.needsUpdate = true;
  FX.cursor.material.color.setHex(col);
  FX.cursor.material.opacity = 0.55 + 0.25 * Math.sin(G.t * 5);
  const d = R.camera.position.distanceTo(_v1.set(x, heightAt(x, z), z));
  FX.cursorDot.position.set(x, Math.max(heightAt(x, z), waterSurface(x, z)) + 1, z);
  FX.cursorDot.scale.setScalar(Math.max(0.8, d * 0.004));
  FX.cursorDot.material.color.setHex(col);
}
