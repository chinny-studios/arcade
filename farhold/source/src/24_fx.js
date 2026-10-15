// Farhold — particles (in the current frame so they ride a spinning planet), scan pulse, weather, re-entry flames

const FX = {
  N: 2400, f: undefined, pts: null, p: [], scan: null, scanT: -1, wx: null, wxN: 1400, entry: null,
  init() {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.N * 3); this.col = new Float32Array(this.N * 3); this.size = new Float32Array(this.N);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: `#include <common>
        #include <logdepthbuf_pars_vertex>
        attribute float size; attribute vec3 color; varying vec3 vC; uniform float uScale;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * uScale / max(0.5, -mv.z);
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `#include <common>
        #include <logdepthbuf_pars_fragment>
        varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vC * a, 1.0);
        #include <logdepthbuf_fragment>
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.pts = new THREE.Points(g, m); this.pts.frustumCulled = false; this.pts.renderOrder = 8;
    R.scene.add(this.pts);
    for (let i = 0; i < this.N; i++) this.p.push({ life: 0 });
    this.free = 0;
    // scan pulse shell
    const sm = new THREE.MeshBasicMaterial({ color: 0x60e0ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, wireframe: true });
    this.scan = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), sm); this.scan.visible = false; this.scan.frustumCulled = false;
    R.scene.add(this.scan);
    // weather particles
    const wg = new THREE.BufferGeometry(); this.wpos = new Float32Array(this.wxN * 6);
    wg.setAttribute('position', new THREE.BufferAttribute(this.wpos, 3));
    this.wx = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.5, depthWrite: false }));
    this.wx.frustumCulled = false; this.wx.visible = false;
    R.scene.add(this.wx);
    this.wp = []; for (let i = 0; i < this.wxN; i++) this.wp.push(new V3((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 50));
    // re-entry flames
    const eg = new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2); eg.rotateX(-Math.PI / 2); eg.scale(7, 7, 14);
    this.entry = new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ color: 0xff7030, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.entry.frustumCulled = false;
  },
  // particles live in a frame; switching frames clears them
  setFrame(f) {
    if (f === this.f) return;
    this.f = f;
    for (const q of this.p) q.life = 0;
    const g = frameGroup(f) || R.scene;
    g.add(this.pts); g.add(this.scan); g.add(this.wx);
  },
  emit(world, vel, life, color, size, grav = 0) {
    const i = this.free; this.free = (this.free + 1) % this.N;
    const q = this.p[i];
    q.pos = toLocal(this.f, world, q.pos || new V3());
    q.vel = dirToLocal(this.f, vel, q.vel || new V3());
    q.life = q.max = life; q.c = hex3(color); q.s = size; q.g = grav;
  },
  sparks(world, color, n = 4, speed = 3) { for (let i = 0; i < n; i++) this.emit(world, new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random())), 0.3 + Math.random() * 0.4, color, 0.06 + Math.random() * 0.05, 1); },
  flash(world, color) { this.emit(world, new V3(), 0.06, color, 0.25); },
  explosion(world, size, color = 0xffa040) {
    const n = Math.min(160, 30 + size * 4);
    for (let i = 0; i < n; i++) { const v = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(size * (0.4 + Math.random() * 1.6)); this.emit(world, v, 0.6 + Math.random() * 0.9, i % 3 ? color : 0xffe0a0, size * (0.04 + Math.random() * 0.06)); }
    for (let i = 0; i < 6; i++) this.emit(world, new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(size * 0.3), 0.35, 0xfff0c0, size * 0.35);
  },
  hearts(world) { for (let i = 0; i < 10; i++) this.emit(world, new V3(Math.random() - 0.5, 1.5 + Math.random(), Math.random() - 0.5), 1.5, 0xff70b0, 0.18, -0.5); },
  scanPulse() { this.scanT = 0; },
  update(dt) {
    const up = this.f && this.f.kind === 'planet' ? null : _v6.set(0, 1, 0);
    let n = 0;
    for (let i = 0; i < this.N; i++) {
      const q = this.p[i];
      if (q.life <= 0) { this.size[i] = 0; continue; }
      q.life -= dt;
      if (q.g) { const g = up || _v5.copy(q.pos).normalize(); q.vel.addScaledVector(g, -q.g * 9 * dt); }
      q.vel.multiplyScalar(1 - dt * 1.2);
      q.pos.addScaledVector(q.vel, dt);
      const k = Math.max(0, q.life / q.max);
      this.pos[i * 3] = q.pos.x; this.pos[i * 3 + 1] = q.pos.y; this.pos[i * 3 + 2] = q.pos.z;
      this.col[i * 3] = q.c[0] * k; this.col[i * 3 + 1] = q.c[1] * k; this.col[i * 3 + 2] = q.c[2] * k;
      this.size[i] = q.s * (0.5 + k * 0.5); n++;
    }
    const g = this.pts.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true;
    this.pts.material.uniforms.uScale.value = innerHeight * 0.8 / Math.tan(R.camera.fov * Math.PI / 360);
    // scan pulse around the player
    if (this.scanT >= 0) {
      this.scanT += dt;
      const k = this.scanT / 1.6;
      this.scan.visible = k < 1;
      const c = PLAYER.inShip ? SHIP.pos : PLAYER.pos;
      this.scan.position.copy(c); this.scan.scale.setScalar(1 + k * 150 * techFx('scan'));
      this.scan.material.opacity = 0.35 * (1 - k);
      if (k >= 1) this.scanT = -1;
    }
    this.updateWeather(dt);
    // re-entry
    if (SHIP.obj) {
      if (this.entry.parent !== SHIP.obj.root) SHIP.obj.root.add(this.entry);
      const want = SHIP.entry ? 0.55 : 0;
      this.entry.material.opacity = lerp(this.entry.material.opacity, want, Math.min(1, dt * 3));
      this.entry.visible = this.entry.material.opacity > 0.01;
      this.entry.position.set(0, 2.5, -SHIP.obj.S.len * 0.3);
      this.entry.scale.setScalar(1 + Math.sin(G.time * 30) * 0.05);
    }
  },
  updateWeather(dt) {
    const pl = ENV.pl, W = pl ? WEATHER.get(pl) : null;
    const on = W && W.k > 0.05 && this.f && this.f.kind === 'planet' && ENV.alt < 600;
    this.wx.visible = !!on;
    if (!on) return;
    const kind = /Blizzard/.test(W.name) ? 'snow' : /Dust|Fire|Static|Radiation/.test(W.name) ? 'dust' : 'rain';
    this.wx.material.color.setHex(kind === 'snow' ? 0xffffff : kind === 'dust' ? W.col : 0x9ab8e0);
    this.wx.material.opacity = W.k * (kind === 'rain' ? 0.45 : 0.6);
    const camL = toLocal(this.f, R.camera.position, _v4);
    const up = _v5.copy(camL).normalize();
    const t1 = perpOf(up, _v6), t2 = _v3.crossVectors(up, t1);
    const fall = kind === 'snow' ? 3 : kind === 'dust' ? 2 : 22, wind = kind === 'rain' ? 3 : 9;
    const len = kind === 'rain' ? 0.9 : 0.15;
    for (let i = 0; i < this.wxN; i++) {
      const p = this.wp[i];
      p.y -= fall * dt; p.x += wind * dt * (kind === 'dust' ? 1.5 : 0.4);
      if (p.y < -15) p.y += 30; if (p.x > 25) p.x -= 50;
      const o = i * 6;
      const wx = camL.x + t1.x * p.x + up.x * p.y + t2.x * p.z, wy = camL.y + t1.y * p.x + up.y * p.y + t2.y * p.z, wz = camL.z + t1.z * p.x + up.z * p.y + t2.z * p.z;
      this.wpos[o] = wx; this.wpos[o + 1] = wy; this.wpos[o + 2] = wz;
      this.wpos[o + 3] = wx + up.x * len + t1.x * len * 0.2; this.wpos[o + 4] = wy + up.y * len + t1.y * len * 0.2; this.wpos[o + 5] = wz + up.z * len + t1.z * len * 0.2;
    }
    this.wx.geometry.attributes.position.needsUpdate = true;
  },
};
