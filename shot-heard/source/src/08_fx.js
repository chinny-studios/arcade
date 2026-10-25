// Shot Heard — effects: camera-facing instanced particles (gunsmoke, flashes, dirt, splinters, splashes, fire),
// a smoke density grid that blinds the bots, fires and camera shake.

function puffTex(kind) {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  if (kind === 'glow') {
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  } else {
    // a soft lumpy cloud made of overlapping blobs, brighter on top
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU, d = Math.random() * S * 0.2;
      const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.85, r = S * (0.16 + Math.random() * 0.18);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const sh = 200 + Math.floor((1 - (y / S)) * 55);
      gr.addColorStop(0, `rgba(${sh},${sh},${sh},0.55)`); gr.addColorStop(0.6, `rgba(${sh},${sh},${sh},0.25)`); gr.addColorStop(1, `rgba(${sh},${sh},${sh},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  return t;
}
const PSYS = [];
function makePS(cap, additive, tex) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const iCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const iSR = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', iPos); geo.setAttribute('iCol', iCol); geo.setAttribute('iSR', iSR);
  geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uTex: { value: tex }, uFogC: { value: scene.fog.color }, uFogN: { value: 100 }, uFogF: { value: 900 }, uLight: { value: LIGHT.smoke } },
    vertexShader: `attribute vec3 iPos; attribute vec4 iCol; attribute vec2 iSR; uniform float uFogN; uniform float uFogF;
      varying vec2 vUv; varying vec4 vCol; varying float vFog; varying float vNear;
      void main(){ vec4 mv = modelViewMatrix * vec4(iPos, 1.0); float c = cos(iSR.y), s = sin(iSR.y);
        vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * iSR.x; mv.xy += q;
        gl_Position = projectionMatrix * mv; vUv = uv; vCol = iCol; vFog = smoothstep(uFogN, uFogF, -mv.z);
        vNear = smoothstep(0.15, 0.25 + iSR.x * 0.6, -mv.z); }`,
    fragmentShader: additive
      ? `uniform sampler2D uTex; varying vec2 vUv; varying vec4 vCol; varying float vFog; varying float vNear;
         void main(){ vec4 t = texture2D(uTex, vUv); gl_FragColor = vec4(vCol.rgb * t.a * vCol.a * (1.0 - vFog) * vNear, 1.0); }`
      : `uniform sampler2D uTex; uniform vec3 uFogC; uniform vec3 uLight; varying vec2 vUv; varying vec4 vCol; varying float vFog; varying float vNear;
         void main(){ vec4 t = texture2D(uTex, vUv); float a = t.a * vCol.a * vNear; if (a < 0.005) discard;
           vec3 c = vCol.rgb * t.rgb * uLight; gl_FragColor = vec4(mix(c, uFogC, vFog), a); }`,
  });
  if (additive) mat.blendSrc = THREE.OneFactor;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = additive ? 6 : 5;
  scene.add(mesh);
  const s = { cap, n: 0, geo, mat, iPos, iCol, iSR,
    vel: new Float32Array(cap * 3), life: new Float32Array(cap), max: new Float32Array(cap), grow: new Float32Array(cap), size: new Float32Array(cap),
    drag: new Float32Array(cap), g: new Float32Array(cap), c0: new Float32Array(cap * 4), rot: new Float32Array(cap), spin: new Float32Array(cap), fin: new Float32Array(cap) };
  PSYS.push(s);
  return s;
}
const smokePS = makePS(9000, false, puffTex('smoke'));
const glowPS = makePS(3000, true, puffTex('glow'));
const dirtPS = makePS(3000, false, puffTex('smoke'));
// fin: fraction of life spent fading in (0 = pop in)
function emit(s, x, y, z, vx, vy, vz, size, grow, life, r, g, b, a, drag = 0.5, grav = 0, fin = 0.08) {
  let i = s.n;
  if (i >= s.cap) i = Math.floor(Math.random() * s.cap); else s.n++;
  s.iPos.array[i * 3] = x; s.iPos.array[i * 3 + 1] = y; s.iPos.array[i * 3 + 2] = z;
  s.vel[i * 3] = vx; s.vel[i * 3 + 1] = vy; s.vel[i * 3 + 2] = vz;
  s.size[i] = size; s.grow[i] = grow; s.life[i] = 0; s.max[i] = life; s.drag[i] = drag; s.g[i] = grav; s.fin[i] = fin;
  s.c0[i * 4] = r; s.c0[i * 4 + 1] = g; s.c0[i * 4 + 2] = b; s.c0[i * 4 + 3] = a;
  s.rot[i] = Math.random() * TAU; s.spin[i] = (Math.random() - 0.5) * 0.5;
}
const WIND = { x: 0.9, z: 0.35 };
function updatePS(s, dt) {
  const P = s.iPos.array, Cc = s.iCol.array, SR = s.iSR.array, { vel, life, max, grow, size, drag, g, c0, rot, spin, fin } = s;
  const wx = WIND.x, wz = WIND.z;
  for (let i = 0; i < s.n; i++) {
    life[i] += dt;
    if (life[i] >= max[i]) {
      const l = --s.n;
      if (i !== l) {
        for (let k = 0; k < 3; k++) { P[i * 3 + k] = P[l * 3 + k]; vel[i * 3 + k] = vel[l * 3 + k]; }
        for (let k = 0; k < 4; k++) c0[i * 4 + k] = c0[l * 4 + k];
        size[i] = size[l]; grow[i] = grow[l]; life[i] = life[l]; max[i] = max[l]; drag[i] = drag[l]; g[i] = g[l]; rot[i] = rot[l]; spin[i] = spin[l]; fin[i] = fin[l];
        i--;
      }
      continue;
    }
    const k = Math.exp(-drag[i] * dt), wk = 1 - k;
    vel[i * 3] = vel[i * 3] * k + wx * wk * (g[i] < 0 ? 1 : 0.2); vel[i * 3 + 1] = vel[i * 3 + 1] * k - g[i] * dt; vel[i * 3 + 2] = vel[i * 3 + 2] * k + wz * wk * (g[i] < 0 ? 1 : 0.2);
    P[i * 3] += vel[i * 3] * dt; P[i * 3 + 1] += vel[i * 3 + 1] * dt; P[i * 3 + 2] += vel[i * 3 + 2] * dt;
    if (g[i] > 0 && P[i * 3 + 1] < heightAt(P[i * 3], P[i * 3 + 2])) { P[i * 3 + 1] = heightAt(P[i * 3], P[i * 3 + 2]); vel[i * 3] *= 0.3; vel[i * 3 + 1] = 0; vel[i * 3 + 2] *= 0.3; }
    size[i] += grow[i] * dt * (1 - life[i] / max[i] * 0.7);
    rot[i] += spin[i] * dt;
    const t = life[i] / max[i];
    const fade = (fin[i] > 0 ? Math.min(1, t / fin[i]) : 1) * (1 - smooth(0.4, 1, t));
    Cc[i * 4] = c0[i * 4]; Cc[i * 4 + 1] = c0[i * 4 + 1]; Cc[i * 4 + 2] = c0[i * 4 + 2]; Cc[i * 4 + 3] = c0[i * 4 + 3] * fade;
    SR[i * 2] = size[i]; SR[i * 2 + 1] = rot[i];
  }
  s.geo.instanceCount = s.n;
  s.iPos.needsUpdate = true; s.iCol.needsUpdate = true; s.iSR.needsUpdate = true;
  s.mat.uniforms.uFogN.value = scene.fog.near; s.mat.uniforms.uFogF.value = scene.fog.far;
}

// ---------- smoke density (4 m cells) for line-of-sight ----------
const SMOKE = { n: 0, cell: 4, d: null, half: 0, acc: 0 };
function initSmoke() {
  SMOKE.half = TER.half + 40; SMOKE.n = Math.ceil((SMOKE.half * 2) / SMOKE.cell);
  SMOKE.d = new Float32Array(SMOKE.n * SMOKE.n);
}
function smokeAdd(x, z, amt) {
  const i = Math.floor((x + SMOKE.half) / SMOKE.cell), j = Math.floor((z + SMOKE.half) / SMOKE.cell);
  if (i < 0 || j < 0 || i >= SMOKE.n || j >= SMOKE.n) return;
  SMOKE.d[j * SMOKE.n + i] = Math.min(4, SMOKE.d[j * SMOKE.n + i] + amt);
}
function updateSmoke(dt) {
  if (!SMOKE.d) return;
  const k = Math.exp(-dt / 16), d = SMOKE.d;
  for (let i = 0; i < d.length; i++) if (d[i] > 0.001) d[i] *= k; else d[i] = 0;
  // drift with the wind a whole cell at a time
  SMOKE.acc += dt * Math.hypot(WIND.x, WIND.z) * 0.8;
  if (SMOKE.acc > SMOKE.cell) {
    SMOKE.acc = 0;
    const n = SMOKE.n, di = Math.abs(WIND.x) > Math.abs(WIND.z) ? Math.sign(WIND.x) : 0, dj = di ? 0 : Math.sign(WIND.z);
    const src = d.slice();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const si = i - di, sj = j - dj;
      d[j * n + i] = si < 0 || sj < 0 || si >= n || sj >= n ? 0 : src[sj * n + si];
    }
  }
}
// summed smoke along a line; above ~1.2 a bot cannot make out a man through it
function smokeAlong(ax, az, bx, bz) {
  if (!SMOKE.d) return 0;
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(L / SMOKE.cell));
  let s = 0;
  for (let k = 1; k < n; k++) {
    const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    const i = Math.floor((x + SMOKE.half) / SMOKE.cell), j = Math.floor((z + SMOKE.half) / SMOKE.cell);
    if (i < 0 || j < 0 || i >= SMOKE.n || j >= SMOKE.n) continue;
    s += SMOKE.d[j * SMOKE.n + i];
  }
  return s;
}

// ---------- effect recipes ----------
const SM = () => LIGHT.preset ? 1 : 1;
function fxMusket(x, y, z, dx, dy, dz, big = 1) {
  // pan flash and the muzzle cloud: a fast jet that slows into a lingering bank
  emit(glowPS, x, y, z, dx * 4, dy * 4, dz * 4, 0.55 * big, 2, 0.07, 1, 0.75, 0.4, 1, 3);
  emit(glowPS, x + dx * 0.3, y + dy * 0.3, z + dz * 0.3, dx * 8, dy * 8, dz * 8, 0.9 * big, 3, 0.05, 1, 0.6, 0.25, 0.8, 4);
  const n = Math.round(9 * big);
  for (let i = 0; i < n; i++) {
    const sp = frand(3, 14) * big, sh = frand(0.88, 1.0);
    emit(smokePS, x + frand(-0.1, 0.1), y + frand(-0.1, 0.1), z + frand(-0.1, 0.1), dx * sp + frand(-0.6, 0.6), dy * sp + frand(0, 0.8), dz * sp + frand(-0.6, 0.6),
      frand(0.4, 0.8) * big, frand(0.5, 1.0) * big, frand(14, 24), sh, sh, sh * 0.98, 0.42, 1.6, -0.05, 0.02);
  }
  emit(smokePS, x - dx * 0.8, y + 0.1, z - dz * 0.8, frand(-0.3, 0.3), 0.6, frand(-0.3, 0.3), 0.35, 0.5, 8, 0.95, 0.95, 0.93, 0.35, 1, -0.05, 0.02);
  smokeAdd(x + dx * 3, z + dz * 3, 0.55 * big); smokeAdd(x + dx * 7, z + dz * 7, 0.35 * big);
  flashAt(x, y, z, 1.2 * big);
}
function fxCannon(x, y, z, dx, dy, dz) {
  emit(glowPS, x, y, z, dx * 10, dy * 10, dz * 10, 2.4, 8, 0.12, 1, 0.7, 0.35, 1, 3);
  for (let i = 0; i < 26; i++) {
    const sp = frand(4, 26), sh = frand(0.85, 1.0);
    emit(smokePS, x, y, z, dx * sp + frand(-1.5, 1.5), dy * sp + frand(0, 2), dz * sp + frand(-1.5, 1.5), frand(1, 2.2), frand(1.2, 2.4), frand(18, 30), sh, sh, sh * 0.97, 0.5, 1.2, -0.04, 0.02);
  }
  for (let i = 0; i < 10; i++) emit(dirtPS, x - dx * 2 + frand(-2, 2), heightAt(x, z) + 0.3, z - dz * 2 + frand(-2, 2), frand(-3, 3), frand(0.5, 2), frand(-3, 3), frand(0.8, 1.6), 1.5, frand(2, 4), 0.62, 0.55, 0.45, 0.5, 1.5, 0);
  for (let k = 2; k < 18; k += 3) smokeAdd(x + dx * k, z + dz * k, 0.9);
  flashAt(x, y, z, 3);
  shakeAt(x, y, z, 0.6, 40);
}
function fxImpact(kind, x, y, z, nx, ny, nz) {
  if (kind === 'dirt' || kind === 'earth') {
    for (let i = 0; i < 4; i++) emit(dirtPS, x, y, z, nx * frand(1, 3) + frand(-1, 1), frand(1.5, 4), nz * frand(1, 3) + frand(-1, 1), frand(0.15, 0.35), 0.7, frand(0.6, 1.4), 0.42, 0.34, 0.24, 0.85, 1.5, 6, 0);
    emit(dirtPS, x, y + 0.1, z, 0, 0.4, 0, 0.3, 0.6, 1.6, 0.58, 0.5, 0.4, 0.45, 1.5, -0.1);
  } else if (kind === 'stone' || kind === 'brick') {
    const c = kind === 'brick' ? [0.62, 0.36, 0.28] : [0.7, 0.68, 0.64];
    for (let i = 0; i < 3; i++) emit(dirtPS, x, y, z, nx * frand(2, 5) + frand(-1, 1), ny * 2 + frand(0, 3), nz * frand(2, 5) + frand(-1, 1), frand(0.08, 0.16), 0.2, frand(0.4, 0.8), c[0], c[1], c[2], 1, 1, 9, 0);
    emit(dirtPS, x, y, z, nx, 0.4, nz, 0.3, 0.8, 1.2, c[0] + 0.1, c[1] + 0.1, c[2] + 0.1, 0.5, 1.5, -0.1);
    emit(glowPS, x, y, z, 0, 0, 0, 0.18, 0, 0.05, 1, 0.8, 0.5, 1);
  } else if (kind === 'water') {
    for (let i = 0; i < 5; i++) emit(dirtPS, x, TER.water + 0.05, z, frand(-0.6, 0.6), frand(2.5, 4.5), frand(-0.6, 0.6), frand(0.1, 0.22), 0.3, frand(0.5, 0.9), 0.85, 0.88, 0.9, 0.8, 0.5, 9, 0);
  } else if (kind === 'flesh') {
    for (let i = 0; i < 3; i++) emit(dirtPS, x, y, z, nx * frand(0.5, 1.5) + frand(-0.5, 0.5), frand(0.2, 1.2), nz * frand(0.5, 1.5) + frand(-0.5, 0.5), frand(0.06, 0.12), 0.3, frand(0.3, 0.6), 0.42, 0.06, 0.05, 0.75, 2, 6, 0);
  } else {
    // wood, plank, rail, hay, tree, cloth: splinters and a little dust
    const c = kind === 'hay' ? [0.85, 0.75, 0.42] : [0.62, 0.48, 0.32];
    for (let i = 0; i < 4; i++) emit(dirtPS, x, y, z, nx * frand(1, 4) + frand(-1, 1), frand(0.5, 3), nz * frand(1, 4) + frand(-1, 1), frand(0.05, 0.12), 0, frand(0.6, 1.2), c[0], c[1], c[2], 1, 0.6, 9, 0);
    emit(dirtPS, x, y, z, nx * 0.5, 0.3, nz * 0.5, 0.25, 0.5, 1.0, c[0] + 0.15, c[1] + 0.15, c[2] + 0.15, 0.35, 1.5, -0.1);
  }
}
function fxExplosion(x, y, z, r) {
  emit(glowPS, x, y + 0.5, z, 0, 2, 0, r * 1.4, r * 2, 0.22, 1, 0.65, 0.3, 1, 2);
  for (let i = 0; i < 10; i++) emit(glowPS, x, y + 0.3, z, frand(-6, 6), frand(2, 9), frand(-6, 6), frand(0.3, 0.7), 0, frand(0.3, 0.7), 1, 0.6, 0.25, 1, 0.8, 6);
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * TAU, sp = frand(2, 7);
    emit(dirtPS, x, y + 0.2, z, Math.cos(a) * sp * 0.6, frand(5, 14), Math.sin(a) * sp * 0.6, frand(0.25, 0.6), 0.6, frand(1.2, 2.4), 0.36, 0.3, 0.22, 0.95, 1.2, 9, 0);
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * TAU, sp = frand(1, 4), sh = frand(0.22, 0.42);
    emit(smokePS, x + Math.cos(a) * 0.5, y + frand(0.2, 1.5), z + Math.sin(a) * 0.5, Math.cos(a) * sp, frand(1.5, 4), Math.sin(a) * sp, frand(1.2, 2.2) * r / 3, r * 0.5, frand(8, 15), sh, sh * 0.95, sh * 0.9, 0.7, 0.9, -0.15, 0.02);
  }
  smokeAdd(x, z, 1.4);
  flashAt(x, y + 1, z, 4);
  shakeAt(x, y, z, 1.2, 60);
}
function fxDebrisDust(x, y, z, mat) {
  const c = mat === 'brick' ? [0.62, 0.42, 0.34] : mat === 'stone' ? [0.7, 0.68, 0.64] : mat === 'earth' ? [0.5, 0.4, 0.3] : mat === 'hay' ? [0.8, 0.72, 0.45] : [0.66, 0.56, 0.42];
  for (let i = 0; i < 6; i++) emit(dirtPS, x + frand(-1, 1), y + frand(-0.5, 0.5), z + frand(-1, 1), frand(-1.5, 1.5), frand(0.3, 2), frand(-1.5, 1.5), frand(0.8, 1.6), 1.0, frand(3, 6), c[0], c[1], c[2], 0.6, 1, -0.05, 0.05);
}
function fxCollapse(x, y, z, size) {
  for (let i = 0; i < 26; i++) emit(dirtPS, x + frand(-size / 2, size / 2), y + frand(-2, 2), z + frand(-size / 2, size / 2), frand(-3, 3), frand(0.5, 3), frand(-3, 3), frand(2, 4), 1.5, frand(5, 10), 0.68, 0.6, 0.5, 0.65, 0.8, -0.03, 0.05);
  shakeAt(x, y, z, 0.8, 60);
}
function fxSplash(x, z, big) {
  for (let i = 0; i < 14 * big; i++) emit(dirtPS, x + frand(-0.5, 0.5) * big, TER.water + 0.1, z + frand(-0.5, 0.5) * big, frand(-1.5, 1.5), frand(4, 10) * big, frand(-1.5, 1.5), frand(0.25, 0.5) * big, 0.6, frand(1, 1.8), 0.86, 0.9, 0.92, 0.85, 0.6, 9, 0);
}
function fxBlood(x, y, z) { fxImpact('flesh', x, y, z, frand(-1, 1), 0, frand(-1, 1)); }

// pooled flash light
let flashT = 0, flashPow = 0;
function flashAt(x, y, z, pow) {
  const d = camera.position.distanceTo(_v6.set(x, y, z));
  if (d > 60) return;
  if (pow / (1 + d * 0.1) < flashPow / (1 + camera.position.distanceTo(flashLight.position) * 0.1) && flashT > 0) return;
  flashLight.position.set(x, y + 0.3, z); flashPow = pow; flashT = 0.08;
}
function updateFlash(dt) {
  flashT -= dt;
  flashLight.intensity = flashT > 0 ? flashPow * 2.2 * (flashT / 0.08) : 0;
}

// ---------- fires (burning houses, camp fires, the wreck) ----------
const FIRES = [];
function addFire(x, y, z, size, smoky) { FIRES.push({ x, y, z, size, smoky, t: Math.random() * 10, acc: 0 }); }
function clearFires() { FIRES.length = 0; }
function updateFires(dt) {
  const cx = camera.position.x, cz = camera.position.z;
  for (const f of FIRES) {
    f.t += dt;
    const d = Math.hypot(f.x - cx, f.z - cz);
    if (d > 520) continue;
    const rate = (f.size * 10) * (d > 200 ? 0.35 : 1);
    f.acc += dt * rate;
    while (f.acc > 1) {
      f.acc -= 1;
      const s = f.size;
      emit(glowPS, f.x + frand(-s, s) * 0.5, f.y + frand(0, s * 0.3), f.z + frand(-s, s) * 0.5, frand(-0.4, 0.4), frand(1.5, 3.5) * Math.sqrt(s), frand(-0.4, 0.4), frand(0.5, 1.1) * s, -0.3 * s, frand(0.5, 1.1), 1, frand(0.42, 0.62), 0.18, 0.9, 0.6, -0.5, 0.1);
      if (f.smoky && Math.random() < 0.5) {
        const sh = frand(0.14, 0.3);
        emit(smokePS, f.x + frand(-s, s) * 0.4, f.y + s * 0.8, f.z + frand(-s, s) * 0.4, frand(-0.3, 0.3), frand(2, 4) * Math.sqrt(s), frand(-0.3, 0.3), frand(1, 2) * s, s * 0.8, frand(10, 18), sh, sh * 0.95, sh * 0.9, 0.7, 0.25, -0.18, 0.05);
      }
    }
  }
}

// ---------- camera shake ----------
const SHAKE = { a: 0, t: 0 };
function shakeAt(x, y, z, amt, range) {
  const d = camera.position.distanceTo(_v6.set(x, y, z));
  const k = amt * Math.max(0, 1 - d / range);
  if (k > SHAKE.a) SHAKE.a = k;
}
function updateFx(dt) {
  for (const s of PSYS) updatePS(s, dt);
  updateFires(dt);
  updateSmoke(dt);
  updateFlash(dt);
  SHAKE.t += dt;
  SHAKE.a = Math.max(0, SHAKE.a - dt * 2.2);
}
function clearParticles() { for (const s of PSYS) { s.n = 0; s.geo.instanceCount = 0; } }
