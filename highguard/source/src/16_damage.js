// ---- 16_damage: what hits leave behind: scorch marks, charred hull, debris, fires and venting gas ----
// Visual only (nothing here runs while sim() fast-forwards). A hull hit is traced onto the real hull mesh to find
// the exact surface point and normal; there it leaves a glowing burn that cools to char, darkens the hull and
// windows around it, may knock chunks loose and may start a fire or a gas vent that keeps going.
const Damage = { budget: 0, debris: [] };
const _dr = new THREE.Raycaster(), _dp = new V3(), _dn = new V3(), _dw = new V3(), _dq = new Q4(), _dq2 = new Q4(), _dm = new M4(), _ds = new V3(), _dz = new V3(0, 0, 1);
const DECALS_PER_SECTION = 140, BURNS_PER_SHIP = 12, DEBRIS_MAX = 420;
Damage.init = function () {
  Damage.mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } }, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    vertexShader: 'attribute vec2 info; varying vec2 vu; varying vec2 vi; void main(){ vu = uv; vi = info; gl_Position = projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float t; varying vec2 vu; varying vec2 vi;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ vec2 p = vu - .5; float d = length(p)*2., a = atan(p.y, p.x);
        float rough = n(vec2(a*2.2 + vi.y*17., vi.y*5.))*.38 + n(p*9. + vi.y*31.)*.22;
        float burnt = 1. - smoothstep(.45, 1., d + rough - .15);
        if (burnt < .01) discard;
        // Soot stains (seed above 1.5) are wide, faint and never glow.
        if (vi.y > 1.5) { gl_FragColor = vec4(vec3(.03, .027, .025), burnt * (.62 - .3*n(p*5. + vi.y))); return; }
        float age = t - vi.x, heat = exp(-age/3.5);
        float hole = 1. - smoothstep(.12, .36, d + rough*.4);
        float rim = (1. - smoothstep(.3, .6, d + rough*.5)) * (1. - hole*.5);
        float ember = smoothstep(.55, .78, n(p*14. + vec2(t*.5, vi.y*9.))) * exp(-age/45.);
        vec3 glow = vec3(1., .4, .1) * (rim*1.7*heat + hole*(.8*heat + .35*ember));
        gl_FragColor = vec4(vec3(.022, .019, .017) + glow*1.4, burnt*.93); }`,
  });
  Damage.plane = new THREE.PlaneGeometry(1, 1);
  const m = Damage.chunks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 12, specular: 0x222222 }), DEBRIS_MAX);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DEBRIS_MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  m.count = 0; m.frustumCulled = false; R.scene.add(m);
};
Damage.clear = function () { Damage.debris.length = 0; Damage.chunks.count = 0; };
// Give a mesh its own colour attribute (positions, normals and uvs stay shared with the class model).
function ownColors(mesh) {
  if (!mesh.userData.own) {
    const g0 = mesh.geometry, g = new THREE.BufferGeometry();
    for (const k in g0.attributes) g.setAttribute(k, k === 'color' ? g0.attributes.color.clone() : g0.attributes[k]);
    g.boundingSphere = g0.boundingSphere; g.boundingBox = g0.boundingBox;
    mesh.geometry = g; mesh.userData.own = true;
  }
  return mesh.geometry.attributes.color;
}
// Darken a mesh's vertices within r of a section-local point: k = how much at the centre (0..1).
function charMesh(mesh, lp, r, k) {
  const col = ownColors(mesh), pos = mesh.geometry.attributes.position, r2 = r * r;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - lp.x, dy = pos.getY(i) - lp.y, dz = pos.getZ(i) - lp.z, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r2) continue;
    const f = 1 - k * (1 - Math.sqrt(d2) / r) ** 1.5;
    col.setXYZ(i, Math.max(0.035, col.getX(i) * f), Math.max(0.03, col.getY(i) * f), Math.max(0.028, col.getZ(i) * f));
  }
  col.needsUpdate = true;
}
Damage.char = function (sec, lp, r, k) { charMesh(sec.hull, lp, r, k); if (sec.lit) charMesh(sec.lit, lp, r * 1.25, Math.min(1, k * 2.5)); };
Damage.decal = function (sec, lp, n, size, soot) {
  if (!sec.dec) {
    const g = Damage.plane.clone();
    g.setAttribute('info', new THREE.InstancedBufferAttribute(new Float32Array(DECALS_PER_SECTION * 2), 2));
    const m = sec.dec = new THREE.InstancedMesh(g, Damage.mat, DECALS_PER_SECTION);
    m.count = 0; m.frustumCulled = false; m.renderOrder = 1; sec.decI = 0; sec.g.add(m);
  }
  const m = sec.dec, i = sec.decI; sec.decI = (i + 1) % DECALS_PER_SECTION; m.count = Math.max(m.count, i + 1);
  _dq.setFromUnitVectors(_dz, n); _dq2.setFromAxisAngle(n, rnd(0, TAU)); _dq.premultiply(_dq2);
  _dp.copy(lp).addScaledVector(n, 0.35); _ds.set(size, size, 1);
  _dm.compose(_dp, _dq, _ds); m.setMatrixAt(i, _dm); m.instanceMatrix.needsUpdate = true;
  const info = m.geometry.attributes.info; info.setXY(i, R.t, rand() + (soot ? 2 : 0)); info.needsUpdate = true;
};
// Trace a ray along dir onto the ship's hull meshes. Returns { sec, lp (section-local), n (section-local), wp, wn }.
function traceHull(ship, from, dir, far) {
  _dr.set(from, dir); _dr.far = far;
  let best = null;
  for (const s of ship.secs) {
    const hits = _dr.intersectObject(s.hull, false);
    if (hits.length && (!best || hits[0].distance < best.distance)) { best = hits[0]; best.sec = s; }
  }
  if (!best || !best.face) return null;
  const s = best.sec;
  return { sec: s, lp: s.g.worldToLocal(best.point.clone()), n: best.face.normal.clone(), wp: best.point.clone(), wn: best.face.normal.clone().transformDirection(s.g.matrixWorld) };
}
// A hit that reached the hull. kind: 'bolt' | 'torp' | 'gun'. dir may be null (then aimed at the ship's centre).
Damage.hit = function (ship, wp, dir, amount, kind) {
  if (G.simming || !ship.secs.length || Damage.budget <= 0) return;
  if (kind === 'gun' && rand() > 0.12) return;
  Damage.budget--;
  const d = dir ? _dw.copy(dir).normalize() : ship.centre(_dw).sub(wp).normalize();
  const from = wp.clone().addScaledVector(d, -60), h = traceHull(ship, from, d, 160);
  if (!h) return;
  const size = kind === 'torp' ? 58 : kind === 'gun' ? 8 : clamp(amount / 1.9, 18, 44);
  Damage.decal(h.sec, h.lp, h.n, size * rnd(0.8, 1.2));
  if (kind !== 'gun' && rand() < (kind === 'torp' ? 1 : 0.4)) Damage.decal(h.sec, _ds.copy(h.lp).addScaledVector(h.n, 0.05), h.n, size * rnd(2.2, 3.2), true);
  Damage.char(h.sec, h.lp, size * 1.5, kind === 'torp' ? 0.55 : kind === 'gun' ? 0.08 : 0.22);
  if (kind === 'torp') Damage.spray(ship, h.wp, h.wn, rndi(5, 8), 4.5);
  else if (kind === 'bolt' && rand() < 0.35) Damage.spray(ship, h.wp, h.wn, rndi(1, 3), 2.4);
  const hurt = 1.6 - ship.hull / ship.maxHull;
  if (ship.burns.length < BURNS_PER_SHIP && rand() < (kind === 'torp' ? 0.55 : kind === 'bolt' ? 0.07 : 0) * hurt)
    ship.burns.push({ sec: h.sec, lp: h.lp, n: h.n, kind: rand() < 0.62 ? 'fire' : 'vent', size: size * rnd(0.45, 0.7), seed: rand() * 10 });
};
// A knocked-out subsystem: charred black where it stands, scorched from every side, blown open and burning.
Damage.wreck = function (ship, key) {
  if (G.simming || !ship.secs.length) return;
  const sub = ship.subs[key]; if (!sub) return;
  const r = Math.max(sub.r, 12);
  for (const s of ship.secs) { s.g.updateMatrixWorld(true); Damage.char(s, _dp.copy(sub.p).sub(s.c), r * 1.35, 0.9); }
  const cw = ship.toWorld(sub.p, new V3());
  let first = null;
  for (const v of [[0, 1, 0], [1, 0.3, 0], [-1, 0.3, 0], [0, 0.3, 1], [0, 0.3, -1], [0, -1, 0], [0.7, 0.7, 0.4], [-0.7, 0.7, -0.4]]) {
    const dirL = new V3(...v).normalize(), from = ship.toWorld(sub.p.clone().addScaledVector(dirL, r * 3)), d = cw.clone().sub(from).normalize();
    const h = traceHull(ship, from, d, r * 5);
    if (!h || h.wp.distanceTo(cw) > r * 1.6) continue;
    Damage.decal(h.sec, h.lp, h.n, r * rnd(0.9, 1.2)); Damage.decal(h.sec, h.lp, h.n, r * rnd(2, 2.6), true);
    if (!first) first = h;
  }
  Damage.spray(ship, cw, first ? first.wn : UP, rndi(9, 14), clamp(r * 0.09, 3, 7));
  if (first) ship.burns.push({ sec: first.sec, lp: first.lp, n: first.n, kind: 'fire', size: r * 0.55, seed: rand() * 10, big: true });
};
// Chunks of hull blown off at a world point, flung out along the surface normal.
Damage.spray = function (ship, wp, wn, n, size) {
  const P = PALETTE[ship.team], base = new THREE.Color(P.base), dark = new THREE.Color(P.dark);
  for (let i = 0; i < n; i++) {
    if (Damage.debris.length >= DEBRIS_MAX) Damage.debris.shift();
    const v = new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(30).addScaledVector(wn, rnd(25, 80)).add(ship.vel);
    const col = (rand() < 0.5 ? base : dark).clone().multiplyScalar(rnd(0.2, 0.5));
    Damage.debris.push({ p: wp.clone().addScaledVector(wn, 2), v, q: new Q4().setFromEuler(new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6))),
      axis: new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(), spin: rnd(0.8, 4), s: new V3(size * rnd(0.5, 1.6), size * rnd(0.15, 0.5), size * rnd(0.5, 1.8)),
      life: rnd(7, 13), age: 0, col, hot: rand() < 0.55 });
  }
};
Damage.update = function (dt) {
  Damage.budget = 12;
  Damage.mat.uniforms.t.value = R.t;
  const m = Damage.chunks, D = Damage.debris;
  let w = 0;
  for (let i = 0; i < D.length; i++) {
    const c = D[i]; c.age += dt;
    if (c.age >= c.life) continue;
    c.p.addScaledVector(c.v, dt); c.v.multiplyScalar(Math.exp(-dt * 0.05));
    _dq.setFromAxisAngle(c.axis, c.spin * dt); c.q.premultiply(_dq);
    const k = Math.min(1, (c.life - c.age) / 1.5);
    _ds.copy(c.s).multiplyScalar(k); _dm.compose(c.p, c.q, _ds); m.setMatrixAt(w, _dm);
    const heat = c.hot ? Math.max(0, 1 - c.age / 2.5) : 0;
    m.instanceColor.setXYZ(w, lerp(c.col.r, 1, heat * 0.7), lerp(c.col.g, 0.35, heat * 0.7), lerp(c.col.b, 0.1, heat * 0.7));
    if (heat > 0 && dt > 0) {
      Fx.glow(c.p, c.s.x * 2.2, 1, 0.45, 0.12, heat);
      if (rand() < dt * 12) Fx.puff(c.p, null, rnd(1.5, 3), c.s.x * 0.8, c.s.x * 3, 0.1, 0.09, 0.08, 0.4 * heat, 0.3);
    }
    D[w++] = c;
  }
  D.length = w; m.count = w;
  m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
};
// Per-frame emission of a ship's fires and vents (called from Ship.draw).
Damage.burn = function (ship, dt) {
  if (!ship.burns.length || dt <= 0 || G.simming) return;
  const cam = R.camera.position;
  if (ship.pos.distanceToSquared(cam) > 7000 * 7000) return;
  const fade = ship.alive ? 1 : Math.max(0, 1 - ship.dying / 30);
  for (const b of ship.burns) {
    const p = b.sec.g.localToWorld(_dp.copy(b.lp)), n = _dn.copy(b.n).transformDirection(b.sec.g.matrixWorld), s = b.size;
    if (b.kind === 'fire') {
      if (rand() < dt * 16 * fade) { _dw.copy(n).multiplyScalar(rnd(6, 16) * s / 10).add(ship.vel); Fx.spark(_ds.copy(p).addScaledVector(n, s * 0.3), _dw, rnd(0.5, 1.1), s * 0.7, s * 1.5, 1, rnd(0.35, 0.55), 0.12, 0.9, 1.2); }
      if (rand() < dt * 5 * fade) { _dw.copy(n).multiplyScalar(s * 0.7).add(ship.vel); Fx.puff(p, _dw, rnd(3, 5), s * 0.8, s * 4, 0.09, 0.085, 0.08, 0.5, 0.15); }
      Fx.glow(p, s * (1.4 + 0.4 * Math.sin(R.t * 9 + b.seed)), 1, 0.45, 0.12, 0.7 * fade);
    } else if (Math.sin(R.t * 0.8 + b.seed * 9) > -0.25) {
      // Venting atmosphere: a fast pale jet that comes and goes, with a spark now and then.
      if (rand() < dt * 20 * fade) { _dw.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(12).addScaledVector(n, rnd(60, 110)).add(ship.vel); Fx.puff(p, _dw, rnd(1.2, 2), s * 0.35, s * 2.6, 0.62, 0.66, 0.72, 0.35, 0.9); }
      if (rand() < dt * 3 * fade) { _dw.copy(n).multiplyScalar(rnd(40, 90)).add(ship.vel); Fx.spark(p, _dw, rnd(0.3, 0.6), s * 0.25, s * 0.1, 1, 0.8, 0.5, 1); }
    }
  }
};
