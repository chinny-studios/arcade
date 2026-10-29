// ---- 06_fx: particles, per-frame glows, laser bolts, shield bubbles ----
// Two particle pools (additive fire and light, alpha-blended smoke), one list of glows rebuilt every frame
// (engines, bolt heads, running lights) and one instanced mesh for every bolt in flight.
const Fx = {};
const PT_VS = `attribute float size; attribute vec4 rgba; varying vec4 vc; uniform float px;
  void main(){ vc = rgba; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = clamp(size * px / -mv.z, 1.5, 900.); gl_Position = projectionMatrix*mv; }`;
function makePool(max, additive) {
  const P = { max, n: 0,
    p: new Float32Array(max * 3), v: new Float32Array(max * 3), life: new Float32Array(max), ttl: new Float32Array(max),
    s0: new Float32Array(max), s1: new Float32Array(max), c: new Float32Array(max * 3), a: new Float32Array(max), drag: new Float32Array(max) };
  const g = new THREE.BufferGeometry();
  P.pos = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
  P.col = new THREE.BufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
  P.siz = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position', P.pos); g.setAttribute('rgba', P.col); g.setAttribute('size', P.siz);
  const m = new THREE.ShaderMaterial({
    uniforms: { px: { value: 600 } }, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: PT_VS,
    fragmentShader: additive
      ? 'varying vec4 vc; void main(){ float d = length(gl_PointCoord - .5)*2.; float a = pow(max(1. - d, 0.), 1.6); gl_FragColor = vec4(vc.rgb*vc.a*a, 1.); }'
      : 'varying vec4 vc; void main(){ float d = length(gl_PointCoord - .5)*2.; float a = smoothstep(1., .3, d); gl_FragColor = vec4(vc.rgb, vc.a*a); }',
  });
  P.mesh = new THREE.Points(g, m); P.mesh.frustumCulled = false; P.mesh.renderOrder = additive ? 3 : 2;
  return P;
}
function poolAdd(P, x, y, z, vx, vy, vz, ttl, s0, s1, r, g, b, a, drag) {
  if (P.n >= P.max) return;
  const i = P.n++, k = i * 3;
  P.p[k] = x; P.p[k + 1] = y; P.p[k + 2] = z; P.v[k] = vx; P.v[k + 1] = vy; P.v[k + 2] = vz;
  P.life[i] = 0; P.ttl[i] = ttl; P.s0[i] = s0; P.s1[i] = s1; P.c[k] = r; P.c[k + 1] = g; P.c[k + 2] = b; P.a[i] = a; P.drag[i] = drag || 0;
}
function poolUpdate(P, dt, additive) {
  let w = 0;
  const pa = P.pos.array, ca = P.col.array, sa = P.siz.array;
  for (let i = 0; i < P.n; i++) {
    P.life[i] += dt; if (P.life[i] >= P.ttl[i]) continue;
    const k = i * 3, f = P.life[i] / P.ttl[i], dr = Math.exp(-P.drag[i] * dt);
    P.v[k] *= dr; P.v[k + 1] *= dr; P.v[k + 2] *= dr;
    P.p[k] += P.v[k] * dt; P.p[k + 1] += P.v[k + 1] * dt; P.p[k + 2] += P.v[k + 2] * dt;
    if (w !== i) {
      const j = w * 3;
      P.p[j] = P.p[k]; P.p[j + 1] = P.p[k + 1]; P.p[j + 2] = P.p[k + 2]; P.v[j] = P.v[k]; P.v[j + 1] = P.v[k + 1]; P.v[j + 2] = P.v[k + 2];
      P.life[w] = P.life[i]; P.ttl[w] = P.ttl[i]; P.s0[w] = P.s0[i]; P.s1[w] = P.s1[i]; P.c[j] = P.c[k]; P.c[j + 1] = P.c[k + 1]; P.c[j + 2] = P.c[k + 2]; P.a[w] = P.a[i]; P.drag[w] = P.drag[i];
    }
    const j = w * 3;
    pa[j] = P.p[j]; pa[j + 1] = P.p[j + 1]; pa[j + 2] = P.p[j + 2];
    const fade = additive ? (1 - f) * (1 - f) : (f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85);
    // Additive fire cools from white-yellow to its colour, smoke just fades.
    const heat = additive ? Math.max(0, 1 - f * 3) : 0;
    ca[w * 4] = lerp(P.c[j], 1, heat * 0.6); ca[w * 4 + 1] = lerp(P.c[j + 1], 0.95, heat * 0.6); ca[w * 4 + 2] = lerp(P.c[j + 2], 0.8, heat * 0.5); ca[w * 4 + 3] = P.a[w] * fade;
    sa[w] = lerp(P.s0[w], P.s1[w], 1 - (1 - f) * (1 - f));
    w++;
  }
  P.n = w;
  P.mesh.geometry.setDrawRange(0, w);
  P.pos.needsUpdate = true; P.col.needsUpdate = true; P.siz.needsUpdate = true;
}

Fx.init = function () {
  Fx.add = makePool(9000, true); Fx.smoke = makePool(4000, false);
  R.scene.add(Fx.smoke.mesh); R.scene.add(Fx.add.mesh);
  // Glows: refilled every frame.
  const G2 = Fx.glows = { max: 6000, n: 0 };
  const g = new THREE.BufferGeometry();
  G2.pos = new THREE.BufferAttribute(new Float32Array(G2.max * 3), 3).setUsage(THREE.DynamicDrawUsage);
  G2.col = new THREE.BufferAttribute(new Float32Array(G2.max * 4), 4).setUsage(THREE.DynamicDrawUsage);
  G2.siz = new THREE.BufferAttribute(new Float32Array(G2.max), 1).setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position', G2.pos); g.setAttribute('rgba', G2.col); g.setAttribute('size', G2.siz);
  G2.mesh = new THREE.Points(g, Fx.add.mesh.material); G2.mesh.frustumCulled = false; G2.mesh.renderOrder = 4; R.scene.add(G2.mesh);
  // Bolts: a stretched octahedron per bolt, coloured per instance.
  const bg = new THREE.OctahedronGeometry(1, 0);
  const bm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  Fx.bolts = new THREE.InstancedMesh(bg, bm, 3000); Fx.bolts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  Fx.bolts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3000 * 3), 3).setUsage(THREE.DynamicDrawUsage);
  Fx.bolts.frustumCulled = false; Fx.bolts.count = 0; Fx.bolts.renderOrder = 5; R.scene.add(Fx.bolts);
  Fx.nb = 0;
};
Fx.update = function (dt) {
  const px = R.pxScale || 600;
  Fx.add.mesh.material.uniforms.px.value = px; Fx.smoke.mesh.material.uniforms.px.value = px;
  poolUpdate(Fx.add, dt, true); poolUpdate(Fx.smoke, dt, false);
};
Fx.clear = function () { Fx.add.n = 0; Fx.smoke.n = 0; Fx.glows.n = 0; Fx.nb = 0; poolUpdate(Fx.add, 0, true); poolUpdate(Fx.smoke, 0, false); Fx.flushGlows(); Fx.flushBolts(); };

Fx.glow = function (p, size, r, g, b, a) {
  const G2 = Fx.glows; if (G2.n >= G2.max) return;
  const i = G2.n++, pa = G2.pos.array, ca = G2.col.array;
  pa[i * 3] = p.x; pa[i * 3 + 1] = p.y; pa[i * 3 + 2] = p.z;
  ca[i * 4] = r; ca[i * 4 + 1] = g; ca[i * 4 + 2] = b; ca[i * 4 + 3] = a == null ? 1 : a; G2.siz.array[i] = size;
};
Fx.flushGlows = function () {
  const G2 = Fx.glows; G2.mesh.geometry.setDrawRange(0, G2.n);
  G2.pos.needsUpdate = true; G2.col.needsUpdate = true; G2.siz.needsUpdate = true; G2.n = 0;
};
const _fd = new V3(), _fj = new V3();
const _bq = new Q4(), _bs = new V3(), _bp = new V3(), _bm = new M4(), _bz = new V3(0, 0, 1);
// A bolt whose head is at p moving along unit dir, len metres long and w thick.
Fx.bolt = function (p, dir, len, w, col) {
  if (Fx.nb >= 3000) return;
  _bq.setFromUnitVectors(_bz, dir); _bs.set(w, w, len * 0.5); _bp.copy(p).addScaledVector(dir, -len * 0.5);
  _bm.compose(_bp, _bq, _bs); Fx.bolts.setMatrixAt(Fx.nb, _bm);
  Fx.bolts.instanceColor.setXYZ(Fx.nb, col.r, col.g, col.b); Fx.nb++;
};
Fx.flushBolts = function () { Fx.bolts.count = Fx.nb; Fx.bolts.instanceMatrix.needsUpdate = true; Fx.bolts.instanceColor.needsUpdate = true; Fx.nb = 0; };

// ---- Effects ----
Fx.spark = (p, v, ttl, s0, s1, r, g, b, a, drag) => poolAdd(Fx.add, p.x, p.y, p.z, v ? v.x : 0, v ? v.y : 0, v ? v.z : 0, ttl, s0, s1, r, g, b, a, drag);
Fx.puff = (p, v, ttl, s0, s1, r, g, b, a, drag) => poolAdd(Fx.smoke, p.x, p.y, p.z, v ? v.x : 0, v ? v.y : 0, v ? v.z : 0, ttl, s0, s1, r, g, b, a, drag);
// Explosion of size s metres (radius of the fireball). base: inherited velocity.
Fx.explode = function (p, s, base, hot) {
  if (G.simming) return;
  const bx = base ? base.x : 0, by = base ? base.y : 0, bz = base ? base.z : 0;
  poolAdd(Fx.add, p.x, p.y, p.z, bx, by, bz, 0.35, s * 2.5, s * 5, 1, 0.9, 0.7, 1.4);
  const n = Math.min(26, 6 + s * 0.35 | 0);
  for (let i = 0; i < n; i++) {
    const d = rndDir(_fd), sp = s * rnd(0.6, 2.2);
    poolAdd(Fx.add, p.x + d.x * s * 0.3, p.y + d.y * s * 0.3, p.z + d.z * s * 0.3, bx + d.x * sp, by + d.y * sp, bz + d.z * sp,
      rnd(0.6, 1.6), s * rnd(0.6, 1.2), s * rnd(1.4, 2.6), hot ? 0.6 : 1, hot ? 0.8 : 0.45, hot ? 1 : 0.12, 1, 1.6);
  }
  const m = Math.min(30, 4 + s * 0.4 | 0);
  for (let i = 0; i < m; i++) {
    const d = rndDir(_fd), sp = s * rnd(3, 9);
    poolAdd(Fx.add, p.x, p.y, p.z, bx + d.x * sp, by + d.y * sp, bz + d.z * sp, rnd(0.6, 1.8), s * 0.12, s * 0.05, 1, 0.65, 0.3, 1, 0.8);
  }
  const k = Math.min(14, 2 + s * 0.2 | 0);
  for (let i = 0; i < k; i++) {
    const d = rndDir(_fd), sp = s * rnd(0.2, 0.8);
    poolAdd(Fx.smoke, p.x, p.y, p.z, bx + d.x * sp, by + d.y * sp, bz + d.z * sp, rnd(2.5, 5), s * 0.8, s * rnd(2.5, 4), 0.09, 0.08, 0.08, 0.7, 0.4);
  }
};
Fx.flash = function (p, s, r, g, b) { if (!G.simming) poolAdd(Fx.add, p.x, p.y, p.z, 0, 0, 0, 0.16, s, s * 1.6, r, g, b, 1.2); };
// Shield or hull impact.
Fx.impact = function (p, n, shield, col, s) {
  if (G.simming) return;
  s = s || 1;
  if (shield) { poolAdd(Fx.add, p.x, p.y, p.z, 0, 0, 0, 0.25, 10 * s, 26 * s, col.r * 0.7, col.g * 0.85, 1, 1); return; }
  poolAdd(Fx.add, p.x, p.y, p.z, 0, 0, 0, 0.3, 14 * s, 30 * s, 1, 0.7, 0.35, 1.2);
  for (let i = 0; i < 6; i++) { const d = rndDir(_fd); if (n && d.dot(n) < 0) d.negate(); const sp = rnd(30, 120) * s; poolAdd(Fx.add, p.x, p.y, p.z, d.x * sp, d.y * sp, d.z * sp, rnd(0.4, 1.1), 3 * s, 1, 1, 0.6, 0.25, 1, 1); }
  poolAdd(Fx.smoke, p.x, p.y, p.z, n ? n.x * 8 : 0, n ? n.y * 8 : 0, n ? n.z * 8 : 0, rnd(2, 4), 8 * s, 30 * s, 0.1, 0.1, 0.1, 0.55, 0.3);
};
// Jump arrival: a white streak along the ship's path.
Fx.jump = function (from, to, s) {
  if (G.simming) return;
  for (let i = 0; i < 30; i++) { _fj.lerpVectors(from, to, i / 30); poolAdd(Fx.add, _fj.x, _fj.y, _fj.z, 0, 0, 0, 0.5 + i / 40, s * 0.3, s * 0.1, 0.7, 0.85, 1, 0.9); }
  poolAdd(Fx.add, to.x, to.y, to.z, 0, 0, 0, 0.6, s * 0.8, s * 2.2, 0.8, 0.9, 1, 1.5);
};
function rndDir(out) { const u = rnd(-1, 1), a = rnd(0, TAU), s = Math.sqrt(1 - u * u); return out.set(s * Math.cos(a), u, s * Math.sin(a)); }

// Shield bubble: an ellipsoid around a ship that ripples where it is hit. Up to 6 hits are shown at once.
const SHIELD_VS = 'varying vec3 vp; varying vec3 vn; varying vec3 vw; void main(){ vp = position; vn = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vw = mv.xyz; gl_Position = projectionMatrix*mv; }';
const SHIELD_FS = `uniform vec4 hits[6]; uniform vec3 col; uniform float glow;
  varying vec3 vp; varying vec3 vn; varying vec3 vw;
  void main(){ vec3 p = normalize(vp); float a = 0.;
    for (int i = 0; i < 6; i++) { vec4 h = hits[i]; if (h.w < 1.2) { float d = distance(p, h.xyz);
      float f = 1. - h.w/1.2; a += exp(-d*d*60.) * f * f * .9 + exp(-pow((d - h.w*.5)*18., 2.)) * f * .35; } }
    a = min(a, .9);
    float fr = pow(1. - abs(dot(normalize(vn), normalize(-vw))), 2.5);
    a += fr * glow;
    float hex = .75 + .25*sin(p.x*60.)*sin(p.y*60.)*sin(p.z*60.);
    gl_FragColor = vec4(col * a * hex, 1.); }`;
function makeShieldMesh(col) {
  const hits = []; for (let i = 0; i < 6; i++) hits.push(new THREE.Vector4(0, 0, 0, 9));
  const m = new THREE.ShaderMaterial({ uniforms: { hits: { value: hits }, col: { value: new THREE.Color(col) }, glow: { value: 0 } },
    vertexShader: SHIELD_VS, fragmentShader: SHIELD_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
  const mesh = new THREE.Mesh(Fx.shieldGeo || (Fx.shieldGeo = new THREE.SphereGeometry(1, 40, 20)), m);
  mesh.visible = false; mesh.renderOrder = 6;
  return mesh;
}
