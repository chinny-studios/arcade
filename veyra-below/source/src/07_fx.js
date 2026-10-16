// Veyra Below — visual effects: additive particles, rings, telegraphs, beams, lightning, slash arcs

const FX = (() => {
  const MAXP = 3000;
  let pts, pos, col, siz, P = [], free = [];
  const pools = { ring: [], tele: [], beam: [], bolt: [], slash: [], pillar: [], orb: [] };
  const live = [];
  let uni;
  function init() {
    const g = new THREE.BufferGeometry();
    pos = new Float32Array(MAXP * 3); col = new Float32Array(MAXP * 4); siz = new Float32Array(MAXP);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('col', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(siz, 1).setUsage(THREE.DynamicDrawUsage));
    uni = { uScale: { value: 600 } };
    const m = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float size; attribute vec4 col; varying vec4 vC; uniform float uScale; void main(){ vC = col; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = smoothstep(0.5, 0.05, r); gl_FragColor = vec4(vC.rgb, a * vC.a); }',
    });
    pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 10;
    R.scene.add(pts);
    for (let i = 0; i < MAXP; i++) { P.push({ a: false }); free.push(MAXP - 1 - i); siz[i] = 0; }
    bus.on('resize', () => { uni.uScale.value = R.renderer.domElement.height / (2 * Math.tan(R.camera.fov * Math.PI / 360)); });
    uni.uScale.value = R.renderer.domElement.height / (2 * Math.tan(R.camera.fov * Math.PI / 360));
  }
  const _c = new THREE.Color();
  function spawn(x, y, z, vx, vy, vz, color, life, size, opt = {}) {
    if (!free.length) return;
    const i = free.pop(), p = P[i];
    _c.setHex(color);
    Object.assign(p, { a: true, x, y, z, vx, vy, vz, r: _c.r, g: _c.g, b: _c.b, life, max: life, size, grav: opt.grav || 0, drag: opt.drag || 0, grow: opt.grow || 0, alpha: opt.alpha || 1 });
  }
  function burst(x, y, z, color, n = 12, speed = 4, life = 0.5, size = 0.35, opt = {}) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU, u = opt.flat ? Math.random() * 0.4 : Math.random() * 2 - 1, s = speed * (0.4 + Math.random() * 0.6);
      const h = Math.sqrt(1 - u * u);
      spawn(x, y, z, Math.cos(a) * h * s, (opt.up || 0) + u * s, Math.sin(a) * h * s, color, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), opt);
    }
  }
  function updateParticles(dt) {
    for (let i = 0; i < MAXP; i++) {
      const p = P[i];
      if (!p.a) { if (siz[i]) { siz[i] = 0; col[i * 4 + 3] = 0; } continue; }
      p.life -= dt;
      if (p.life <= 0) { p.a = false; siz[i] = 0; col[i * 4 + 3] = 0; free.push(i); continue; }
      p.vy -= p.grav * dt;
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= d; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02 && p.grav) { p.y = 0.02; p.vy *= -0.3; }
      const k = p.life / p.max;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      col[i * 4] = p.r; col[i * 4 + 1] = p.g; col[i * 4 + 2] = p.b; col[i * 4 + 3] = Math.min(1, k * 2) * p.alpha;
      siz[i] = p.size * (p.grow ? 1 + (1 - k) * p.grow : 0.4 + 0.6 * k);
    }
    const g = pts.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.col.needsUpdate = true; g.attributes.size.needsUpdate = true;
  }
  // ---- pooled meshes ----
  function take(kind, make) {
    let o = pools[kind].find((q) => !q.userData.on);
    if (!o) { o = make(); o.userData.kind = kind; pools[kind].push(o); R.scene.add(o); }
    o.userData.on = true; o.visible = true; o.userData.t = 0;
    live.push(o);
    return o;
  }
  const ringGeo = new THREE.RingGeometry(0.88, 1, 48);
  function ring(x, z, color, r0, r1, dur = 0.4, y = 0.06, o0 = 0.9) {
    const o = take('ring', () => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; return m; });
    o.position.set(x, y, z); o.material.color.setHex(color);
    Object.assign(o.userData, { dur, r0, r1, o0, upd: (o, k) => { const r = lerp(o.userData.r0, o.userData.r1, 1 - (1 - k) * (1 - k)); o.scale.set(r, r, 1); o.material.opacity = o.userData.o0 * (1 - k); } });
    o.scale.set(r0, r0, 1); o.material.opacity = o0;
    return o;
  }
  // ground telegraph for enemy attacks: an outline plus a fill that grows until the hit lands
  const discGeo = new THREE.CircleGeometry(1, 40), sqGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  function tele(x, z, r, dur, color = 0xff3030, shape = 'circle', len = 0, yaw = 0) {
    const o = take('tele', () => {
      const g = new THREE.Group();
      const edge = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const fill = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const rect = new THREE.Mesh(sqGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const rfill = new THREE.Mesh(sqGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      for (const m of [edge, fill, rect, rfill]) { m.rotation.x = -Math.PI / 2; g.add(m); }
      g.userData.parts = { edge, fill, rect, rfill }; return g;
    });
    const p = o.userData.parts;
    o.position.set(x, 0.05, z); o.rotation.y = shape === 'circle' ? 0 : yaw + Math.PI;
    for (const m of Object.values(p)) { m.material.color.setHex(color); m.visible = false; }
    if (shape === 'circle') { p.edge.visible = p.fill.visible = true; p.edge.scale.set(r, r, 1); }
    else { p.rect.visible = p.rfill.visible = true; p.rect.scale.set(r * 2, len, 1); p.rect.position.z = 0; }
    Object.assign(o.userData, { dur, r, len, shape, upd: (o, k) => {
      const q = o.userData.parts;
      if (o.userData.shape === 'circle') { q.edge.material.opacity = 0.75; q.fill.scale.set(o.userData.r * k, o.userData.r * k, 1); q.fill.material.opacity = 0.18 + 0.2 * k; }
      else { q.rect.material.opacity = 0.16; q.rfill.scale.set(o.userData.r * 2, o.userData.len * k, 1); q.rfill.material.opacity = 0.22 + 0.2 * k; }
    } });
    o.userData.upd(o, 0);
    return o;
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
  function beam(x1, y1, z1, x2, y2, z2, color, width = 0.15, dur = 0.15) {
    const o = take('beam', () => new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    o.position.set(x1, y1, z1); o.lookAt(x2, y2, z2);
    const d = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    o.scale.set(width, width, d); o.material.color.setHex(color); o.material.opacity = 1;
    Object.assign(o.userData, { dur, w: width, upd: (o, k) => { o.material.opacity = 1 - k; o.scale.x = o.scale.y = o.userData.w * (1 - k * 0.5); } });
    return o;
  }
  function bolt(x1, y1, z1, x2, y2, z2, color = 0xfff080, dur = 0.18) {
    const o = take('bolt', () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3)); return new THREE.Line(g, new THREE.LineBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); });
    const a = o.geometry.attributes.position.array;
    for (let k = 0; k < 14; k++) {
      const t = k / 13, j = k === 0 || k === 13 ? 0 : 0.5;
      a[k * 3] = lerp(x1, x2, t) + (Math.random() - 0.5) * j; a[k * 3 + 1] = lerp(y1, y2, t) + (Math.random() - 0.5) * j; a[k * 3 + 2] = lerp(z1, z2, t) + (Math.random() - 0.5) * j;
    }
    o.geometry.attributes.position.needsUpdate = true; o.geometry.computeBoundingSphere();
    o.material.color.setHex(color); o.material.opacity = 1;
    Object.assign(o.userData, { dur, upd: (o, k) => { o.material.opacity = 1 - k; } });
    burst(x2, y2, z2, color, 5, 3, 0.25, 0.3);
    return o;
  }
  const slashGeos = {};
  function slashGeo(arc) {
    const k = Math.round(arc * 10);
    return slashGeos[k] || (slashGeos[k] = new THREE.RingGeometry(0.55, 1, 24, 1, -Math.PI / 2 - arc / 2, arc));
  }
  function slash(x, z, yaw, arc, radius, color, y = 1.0, flip = false) {
    const o = take('slash', () => new THREE.Mesh(slashGeo(1.6), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    o.geometry = slashGeo(Math.max(0.3, arc));
    o.position.set(x, y, z);
    o.rotation.order = 'YXZ'; o.rotation.set(-Math.PI / 2 + (flip ? 0.35 : -0.35), yaw, 0);
    o.scale.set(radius, radius, 1); o.material.color.setHex(color); o.material.opacity = 0.85;
    Object.assign(o.userData, { dur: 0.16, r: radius, upd: (o, k) => { o.material.opacity = 0.85 * (1 - k); const s = o.userData.r * (1 + k * 0.15); o.scale.set(s, s, 1); } });
    return o;
  }
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true).translate(0, 0.5, 0);
  function pillar(x, z, r, h, color, dur = 0.6) {
    const o = take('pillar', () => new THREE.Mesh(cylGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    o.position.set(x, 0, z); o.scale.set(r, h, r); o.material.color.setHex(color); o.material.opacity = 0.8;
    Object.assign(o.userData, { dur, r, upd: (o, k) => { o.material.opacity = 0.8 * (1 - k); const s = o.userData.r * (1 - k * 0.5); o.scale.x = o.scale.z = s; } });
    return o;
  }
  const sphGeo = new THREE.SphereGeometry(1, 16, 12);
  function orb(x, y, z, r, color, dur = 0.3, grow = 1.6) {
    const o = take('orb', () => new THREE.Mesh(sphGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    o.position.set(x, y, z); o.scale.setScalar(r); o.material.color.setHex(color); o.material.opacity = 0.7;
    Object.assign(o.userData, { dur, r, grow, upd: (o, k) => { o.material.opacity = 0.7 * (1 - k); o.scale.setScalar(o.userData.r * (1 + k * (o.userData.grow - 1))); } });
    return o;
  }
  function kill(o) { if (!o) return; o.userData.on = false; o.visible = false; }
  function update(dt) {
    updateParticles(dt);
    for (let i = live.length - 1; i >= 0; i--) {
      const o = live[i];
      if (!o.userData.on) { live.splice(i, 1); continue; }
      o.userData.t += dt;
      const k = Math.min(1, o.userData.t / o.userData.dur);
      if (o.userData.upd) o.userData.upd(o, k);
      if (k >= 1 && !o.userData.hold) { o.userData.on = false; o.visible = false; live.splice(i, 1); }
    }
  }
  function clear() {
    for (const o of live) { o.userData.on = false; o.visible = false; }
    live.length = 0;
    for (let i = 0; i < MAXP; i++) if (P[i].a) { P[i].a = false; free.push(i); }
  }
  // composite effects
  function hit(x, y, z, color = 0xffffff, big = false) {
    burst(x, y, z, color, big ? 16 : 8, big ? 7 : 5, 0.3, big ? 0.45 : 0.3, { drag: 4 });
    burst(x, y, z, 0xffffff, 3, 2, 0.12, 0.7);
  }
  function explode(x, z, r, color) {
    ring(x, z, color, r * 0.3, r * 1.1, 0.4);
    orb(x, 0.8, z, r * 0.4, color, 0.35, 2.4);
    burst(x, 0.6, z, color, 30, r * 3, 0.6, 0.6, { drag: 3, up: 2 });
    burst(x, 0.3, z, 0x333333, 10, r * 1.5, 1.2, 1.0, { drag: 2, up: 1.5, alpha: 0.4 });
    flash(x, 1.5, z, color, 4, 0.3);
  }
  function teleIn(x, z, color = 0xc060ff) {
    pillar(x, z, 0.8, 3.5, color, 0.6); ring(x, z, color, 0.2, 1.6, 0.5);
    burst(x, 1, z, color, 14, 2.5, 0.6, 0.4, { up: 2 });
  }
  return { init, update, clear, burst, spawn, ring, tele, beam, bolt, slash, pillar, orb, kill, hit, explode, teleIn };
})();
