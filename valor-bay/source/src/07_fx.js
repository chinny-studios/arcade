// Valor Bay — effects: point-sprite particles (sparks, puffs, stars), camera-facing ribbons for webs, lines,
// lightning, lasers and beams, shockwave rings, instanced debris, blob shadows, the comic sound-word pops, shake,
// flashes and slow motion

const FX = { shake: 0, flash: 0, tint: new THREE.Color(1, 1, 1), pools: {}, beams: [], rings: [], debris: null, shadows: null, pops: [] };

// ---------- particles ----------
function makePool(name, tex, cap, blending) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 4), size = new Float32Array(cap);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('pcol', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('psize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, scale: { value: 400 } },
    vertexShader: `attribute vec4 pcol; attribute float psize; uniform float scale; varying vec4 vC;
      void main(){ vC = pcol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(psize * scale / max(0.5, -mv.z), scale * 0.35); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a); if (gl_FragColor.a < 0.01) discard; }`,
    transparent: true, depthWrite: false, blending: blending || THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
  R.scene.add(pts);
  const P = { pts, geo, pos, col, size, cap, list: [] };
  FX.pools[name] = P;
  return P;
}
function initFX() {
  makePool('spark', TEX.soft, 900, THREE.AdditiveBlending);
  makePool('puff', TEX.puff, 700);
  makePool('star', TEX.star, 60);
  makePool('web', TEX.web, 40);
  // ribbons: one additive mesh (energy) and one normal (webs, smoke trails)
  for (const k of ['add', 'norm']) {
    const g = new THREE.BufferGeometry(), cap = 3000;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: k === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false }));
    m.frustumCulled = false; m.renderOrder = 6; R.scene.add(m);
    FX['rib_' + k] = { m, g, cap };
  }
  // rings
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TEX.ring, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.visible = false; m.renderOrder = 4; R.scene.add(m);
    FX.rings.push({ m, life: 0 });
  }
  // debris cubes
  const dm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon({}), 260);
  dm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dm.count = 0; dm.frustumCulled = false;
  dm.setColorAt(0, new THREE.Color()); R.scene.add(dm);
  FX.debris = { m: dm, list: [] };
  // blob shadows
  const sm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.blob, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }), 160);
  sm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); sm.count = 0; sm.frustumCulled = false; sm.renderOrder = 1;
  R.scene.add(sm);
  FX.shadows = { m: sm, n: 0 };
  // sound-word pops
  const host = $('#pops');
  for (let i = 0; i < 12; i++) { const e = el('div', 'pow'); e.hidden = true; host.appendChild(e); FX.pops.push({ e, life: 0, x: 0, y: 0, z: 0 }); }
  bus.on('resize', () => { for (const p of Object.values(FX.pools)) p.pts.material.uniforms.scale.value = R.h * R.ratio * 0.5 / Math.tan(R.camera.fov * Math.PI / 360); });
}
const _pc = new THREE.Color();
// emit one particle: o = { vx, vy, vz, life, size, size1, col, alpha, grav, drag, spin }
function particle(pool, x, y, z, o) {
  const P = FX.pools[pool];
  if (P.list.length >= P.cap) P.list.shift();
  _pc.setHex(o.col === undefined ? 0xffffff : o.col);
  P.list.push({ x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, t: 0, life: o.life || 1, s0: o.size || 1, s1: o.size1 === undefined ? (o.size || 1) : o.size1,
    r: _pc.r, g: _pc.g, b: _pc.b, a: o.alpha === undefined ? 1 : o.alpha, grav: o.grav || 0, drag: o.drag || 0 });
}
function burst(pool, x, y, z, n, o) {
  for (let i = 0; i < n; i++) {
    const sp = o.speed || 5, a = Math.random() * TAU, u = rr(-1, 1) * (o.flat ? 0.2 : 1), r = Math.sqrt(1 - u * u), s = sp * rr(0.4, 1);
    particle(pool, x + rr(-1, 1) * (o.spread || 0), y + rr(-1, 1) * (o.spread || 0) * 0.5, z + rr(-1, 1) * (o.spread || 0), Object.assign({}, o, {
      vx: Math.cos(a) * r * s + (o.vx || 0), vy: u * s + (o.up || 0) + (o.vy || 0), vz: Math.sin(a) * r * s + (o.vz || 0),
      life: (o.life || 1) * rr(0.6, 1.2), size: (o.size || 1) * rr(0.7, 1.3), col: Array.isArray(o.col) ? pick(o.col) : o.col,
    }));
  }
}
function updatePools(dt) {
  for (const P of Object.values(FX.pools)) {
    let n = 0;
    const L2 = P.list;
    for (let i = L2.length - 1; i >= 0; i--) {
      const p = L2[i];
      p.t += dt;
      if (p.t >= p.life) { L2[i] = L2[L2.length - 1]; L2.pop(); continue; }
      p.vy -= p.grav * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    for (const p of L2) {
      const f = p.t / p.life;
      P.pos[n * 3] = p.x; P.pos[n * 3 + 1] = p.y; P.pos[n * 3 + 2] = p.z;
      P.col[n * 4] = p.r; P.col[n * 4 + 1] = p.g; P.col[n * 4 + 2] = p.b; P.col[n * 4 + 3] = p.a * (f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3);
      P.size[n] = lerp(p.s0, p.s1, f);
      n++;
    }
    P.geo.setDrawRange(0, n);
    P.geo.attributes.position.needsUpdate = true; P.geo.attributes.pcol.needsUpdate = true; P.geo.attributes.psize.needsUpdate = true;
  }
}

// ---------- ribbons: segments that face the camera ----------
// beam(ax, ay, az, bx, by, bz, { w, col, alpha, life, add, jag (lightning jitter), follow: fn() -> [a, b] })
function beam(a, b, o = {}) {
  const r = { a: a.clone ? a.clone() : new V3(a.x, a.y, a.z), b: b.clone ? b.clone() : new V3(b.x, b.y, b.z), w: o.w || 0.1, col: o.col === undefined ? 0xffffff : o.col, alpha: o.alpha === undefined ? 1 : o.alpha,
    life: o.life || 0.1, t: 0, add: !!o.add, jag: o.jag || 0, follow: o.follow || null, fade: o.fade !== false, seg: o.jag ? Math.max(3, Math.round(r_len(a, b) / 2.5)) : 1, seed: Math.random() * 100 };
  FX.beams.push(r);
  return r;
}
const r_len = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
const _ra = new V3(), _rb = new V3(), _rs = new V3(), _rd = new V3(), _rc = new V3();
function updateBeams(dt) {
  const bufs = { add: { i: 0, R: FX.rib_add }, norm: { i: 0, R: FX.rib_norm } };
  const cam = R.camera.position;
  for (let k = FX.beams.length - 1; k >= 0; k--) {
    const b = FX.beams[k];
    b.t += dt;
    // a beam lives at least one drawn frame, however long the frame was
    if (b.t > b.life && b.drawn) { FX.beams[k] = FX.beams[FX.beams.length - 1]; FX.beams.pop(); continue; }
    if (b.follow) { const f = b.follow(); if (!f) { b.t = b.life; continue; } b.a.copy(f[0]); b.b.copy(f[1]); }
  }
  for (const b of FX.beams) {
    const buf = bufs[b.add ? 'add' : 'norm'], pos = buf.R.g.attributes.position.array, col = buf.R.g.attributes.color.array;
    _pc.setHex(b.col);
    b.drawn = true;
    const al = b.alpha * (b.fade ? Math.max(0.15, 1 - b.t / b.life) : 1);
    const n = b.seg;
    // jittered points along the line (lightning re-rolls every frame)
    let px = b.a.x, py = b.a.y, pz = b.a.z;
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      let qx = lerp(b.a.x, b.b.x, t), qy = lerp(b.a.y, b.b.y, t), qz = lerp(b.a.z, b.b.z, t);
      if (b.jag && s < n) { qx += rr(-b.jag, b.jag); qy += rr(-b.jag, b.jag); qz += rr(-b.jag, b.jag); }
      if (buf.i + 6 > buf.R.cap) break;
      _ra.set(px, py, pz); _rb.set(qx, qy, qz);
      _rd.subVectors(_rb, _ra); _rc.subVectors(cam, _ra);
      _rs.crossVectors(_rd, _rc).normalize().multiplyScalar(b.w / 2);
      const v = [[_ra.x - _rs.x, _ra.y - _rs.y, _ra.z - _rs.z], [_ra.x + _rs.x, _ra.y + _rs.y, _ra.z + _rs.z], [_rb.x + _rs.x, _rb.y + _rs.y, _rb.z + _rs.z], [_rb.x - _rs.x, _rb.y - _rs.y, _rb.z - _rs.z]];
      for (const idx of [0, 1, 2, 0, 2, 3]) {
        const i = buf.i++;
        pos[i * 3] = v[idx][0]; pos[i * 3 + 1] = v[idx][1]; pos[i * 3 + 2] = v[idx][2];
        col[i * 4] = _pc.r; col[i * 4 + 1] = _pc.g; col[i * 4 + 2] = _pc.b; col[i * 4 + 3] = al;
      }
      px = qx; py = qy; pz = qz;
    }
  }
  for (const k of ['add', 'norm']) {
    const g = bufs[k].R.g;
    g.setDrawRange(0, bufs[k].i);
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
  }
}

// ---------- rings ----------
// ring(x, y, z, { r0, r1, life, col, flat (lies on the ground), alpha })
function ring(x, y, z, o = {}) {
  let r = FX.rings.find((q) => q.life <= 0) || FX.rings[0];
  r.life = r.max = o.life || 0.5; r.r0 = o.r0 || 1; r.r1 = o.r1 || 10; r.flat = o.flat !== false; r.alpha = o.alpha || 0.9;
  r.m.position.set(x, y, z); r.m.material.color.setHex(o.col === undefined ? 0xffffff : o.col);
  r.m.rotation.set(r.flat ? -Math.PI / 2 : 0, 0, 0);
  r.m.visible = true;
}
function updateRings(dt) {
  for (const r of FX.rings) {
    if (r.life <= 0) continue;
    r.life -= dt;
    if (r.life <= 0) { r.m.visible = false; continue; }
    const f = 1 - r.life / r.max, s = lerp(r.r0, r.r1, 1 - (1 - f) * (1 - f)) * 2;
    r.m.scale.set(s, s, s);
    if (!r.flat) r.m.quaternion.copy(R.camera.quaternion);
    r.m.material.opacity = r.alpha * (1 - f);
  }
}

// ---------- debris ----------
const _dm = new THREE.Matrix4(), _dq = new THREE.Quaternion(), _de = new THREE.Euler(), _ds = new V3(), _dp = new V3();
function debris(x, y, z, n, o = {}) {
  const D2 = FX.debris;
  for (let i = 0; i < n; i++) {
    if (D2.list.length >= 260) D2.list.shift();
    const a = Math.random() * TAU, s = (o.speed || 8) * rr(0.4, 1);
    D2.list.push({ x: x + rr(-0.5, 0.5), y: y + rr(0, 0.5), z: z + rr(-0.5, 0.5), vx: Math.cos(a) * s, vy: rr(0.4, 1) * (o.up || 8), vz: Math.sin(a) * s,
      rx: rr(0, 6), ry: rr(0, 6), wx: rr(-12, 12), wy: rr(-12, 12), s: (o.size || 0.4) * rr(0.5, 1.4), t: 0, life: o.life || rr(2, 3.5), col: Array.isArray(o.col) ? pick(o.col) : (o.col || 0x9a968e) });
  }
}
function updateDebris(dt) {
  const D2 = FX.debris;
  let n = 0;
  for (let i = D2.list.length - 1; i >= 0; i--) {
    const d = D2.list[i];
    d.t += dt;
    if (d.t > d.life) { D2.list.splice(i, 1); continue; }
    d.vy -= 22 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    const gy = supportY(d.x, d.z, d.y + 0.5, 0.05);
    if (d.y < gy + d.s / 2) { d.y = gy + d.s / 2; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; d.wx *= 0.5; d.wy *= 0.5; }
    d.rx += d.wx * dt; d.ry += d.wy * dt;
  }
  for (const d of D2.list) {
    const sc = d.s * (d.t > d.life - 0.4 ? (d.life - d.t) / 0.4 : 1);
    _dm.compose(_dp.set(d.x, d.y, d.z), _dq.setFromEuler(_de.set(d.rx, d.ry, 0)), _ds.set(sc, sc, sc));
    D2.m.setMatrixAt(n, _dm); _pc.setHex(d.col); D2.m.setColorAt(n, _pc); n++;
  }
  D2.m.count = n;
  D2.m.instanceMatrix.needsUpdate = true; if (D2.m.instanceColor) D2.m.instanceColor.needsUpdate = true;
}

// ---------- blob shadows: queued each frame by whoever casts one ----------
function shadow(x, y, z, r, a = 1) {
  const S = FX.shadows;
  if (S.n >= 160) return;
  const s = r * 2 * a;
  _dm.compose(_dp.set(x, y + 0.03, z), _dq.identity(), _ds.set(s, 1, s));
  S.m.setMatrixAt(S.n++, _dm);
}
function flushShadows() { const S = FX.shadows; S.m.count = S.n; S.m.instanceMatrix.needsUpdate = true; S.n = 0; }

// ---------- sound-word pops ----------
function pow(x, y, z, text, o = {}) {
  let p = FX.pops.find((q) => q.life <= 0);
  if (!p) p = FX.pops.reduce((a, b) => (a.life < b.life ? a : b));
  p.x = x; p.y = y; p.z = z; p.life = p.max = o.life || 0.8;
  p.e.textContent = text;
  p.e.style.setProperty('--c', o.col || pick(['#ffd820', '#ff4a3a', '#4ad8ff', '#ff8a20', '#b0ff40']));
  p.e.style.fontSize = (o.size || 46) + 'px';
  p.rot = rr(-14, 14);
  p.e.hidden = false;
}
function updatePops(dt) {
  for (const p of FX.pops) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.e.hidden = true; continue; }
    _v1.set(p.x, p.y, p.z).project(R.camera);
    if (_v1.z > 1) { p.e.style.opacity = 0; continue; }
    const f = 1 - p.life / p.max, sc = f < 0.15 ? lerp(2.2, 1, f / 0.15) : 1 + f * 0.15;
    p.e.style.opacity = f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1;
    p.e.style.transform = `translate(${(_v1.x * 0.5 + 0.5) * R.w}px, ${(-_v1.y * 0.5 + 0.5) * R.h - f * 30}px) translate(-50%, -50%) rotate(${p.rot}deg) scale(${sc})`;
  }
}

// ---------- the screen ----------
function addShake(a) { if (OPTS.shake) FX.shake = Math.min(2.5, FX.shake + a); }
function flash(a, col) { FX.flash = Math.max(FX.flash, a); if (col !== undefined) FX.flashCol = col; }
function updateFX(dt) {
  updatePools(dt); updateBeams(dt); updateRings(dt); updateDebris(dt); updatePops(dt);
  FX.shake = Math.max(0, FX.shake - dt * 4);
  FX.flash = Math.max(0, FX.flash - dt * 3);
  if (R.post) {
    R.post.uniforms.flash.value = FX.flash * 0.6;
    const tt = R.post.uniforms.tint.value;
    if (G.freeze > 0) tt.setRGB(0.75, 0.85, 1.15); else if (G.speedForce > 0) tt.setRGB(1.1, 1.0, 0.75); else tt.setRGB(1, 1, 1);
  }
}

// a hit: spark burst, a star, maybe a sound word
function hitSpark(x, y, z, big = false, col = 0xffe060) {
  burst('spark', x, y, z, big ? 26 : 12, { speed: big ? 14 : 8, life: 0.3, size: big ? 0.9 : 0.55, size1: 0.1, col: [col, 0xffffff], drag: 4 });
  particle('star', x, y, z, { life: 0.22, size: big ? 3.6 : 2.2, size1: big ? 1.5 : 0.8 });
}
