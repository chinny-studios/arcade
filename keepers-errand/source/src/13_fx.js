// ---- fx: particles, debris, rain, lightning, icons over heads ----
const FX = {
  N: 700, pts: null, pos: null, col: null, life: null, vel: null, i: 0,
  debris: [], icons: [], rings: [], rain: null, bolts: [], boltT: 4,
  init() {
    const N = this.N;
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.life = new Float32Array(N); this.vel = new Float32Array(N * 3); this.grav = new Float32Array(N);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 1, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, map: tex, transparent: true, depthWrite: false, sizeAttenuation: true }));
    this.pts.frustumCulled = false;
    for (let i = 0; i < N; i++) this.pos[i * 3 + 1] = -999;
    R.scene.add(this.pts);
    // rain streaks
    const RN = 900, rp = new Float32Array(RN * 6);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaabbd0, transparent: true, opacity: 0.45 }));
    this.rain.frustumCulled = false; this.rainN = RN; this.rainP = rp;
    this.rainSeed = new Float32Array(RN * 3); for (let i = 0; i < RN * 3; i++) this.rainSeed[i] = Math.random();
    R.scene.add(this.rain);
    // debris pool (little gears and splinters)
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(i % 2 ? GEO.cyl6 : GEO.box, MAT.col(0xc49a4a)); m.visible = false; m.scale.set(0.2, 0.06, 0.2);
      R.scene.add(m); this.debris.push({ m, life: 0, vx: 0, vy: 0, vz: 0, spin: 0 });
    }
    // lightning bolt lines
    for (let i = 0; i < 2; i++) {
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
      const l = new THREE.Line(g2, new THREE.LineBasicMaterial({ color: 0xeef4ff, transparent: true })); l.visible = false; l.frustumCulled = false;
      R.scene.add(l); this.bolts.push({ l, life: 0 });
    }
  },
  emit(x, y, z, color, vx, vy, vz, life, grav = 9) {
    const i = this.i = (this.i + 1) % this.N, c = new THREE.Color(color);
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    this.life[i] = life; this.grav[i] = grav;
  },
  burst(x, y, z, color, n = 8, sp = 3) { for (let k = 0; k < n; k++) this.emit(x, y, z, color, rnd(-sp, sp), rnd(0, sp * 1.2), rnd(-sp, sp), rnd(0.3, 0.7)); },
  spark(x, y, z, color, life = 0.3) { this.emit(x, y, z, color, rnd(-0.3, 0.3), rnd(-0.2, 0.4), rnd(-0.3, 0.3), life, 0); },
  dust(x, y, z) { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; this.emit(x + Math.sin(a) * 0.3, y + 0.1, z + Math.cos(a) * 0.3, 0xd8c8a8, Math.sin(a) * 2, 0.5, Math.cos(a) * 2, 0.45, 0); } },
  splash(x, y, z, s = 1) { for (let k = 0; k < 10 * s; k++) this.emit(x + rnd(-0.3, 0.3) * s, y + 0.1, z + rnd(-0.3, 0.3) * s, 0xdff0ff, rnd(-1.5, 1.5) * s, rnd(2, 5) * s, rnd(-1.5, 1.5) * s, rnd(0.4, 0.8)); },
  zzz(x, y, z) { this.icon({ x, y, z, fixed: true }, 'z', 1.6); },
  gears(x, y, z, n = 8, color = 0xc49a4a) {
    for (let k = 0; k < n; k++) {
      const d = this.debris.find((q) => q.life <= 0) || this.debris[k % this.debris.length];
      d.life = rnd(0.8, 1.4); d.m.visible = true; d.m.material = MAT.col(k % 3 ? color : 0x3a3430);
      d.m.position.set(x, y, z); d.vx = rnd(-4, 4); d.vy = rnd(3, 7); d.vz = rnd(-4, 4); d.spin = rnd(-10, 10);
      const s = rnd(0.12, 0.3); d.m.scale.set(s, 0.06, s);
      if (d.m.parent !== W.area.group) W.area.group.add(d.m);
    }
    this.burst(x, y, z, 0xffd36a, 10, 5);
  },
  ring(x, y, z, color = 0xffffff, maxR = 3) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); W.area.group.add(m);
    this.rings.push({ m, t: 0, maxR });
  },
  // an icon over an entity's head: '!' '?' 'z' or a heart
  _iconTex: {},
  iconTex(ch) {
    if (this._iconTex[ch]) return this._iconTex[ch];
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.font = 'bold 50px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 8; x.strokeStyle = '#2a1e14';
    const col = ch === '!' ? '#ff5a3a' : ch === '?' ? '#ffd24a' : ch === 'z' ? '#bfe0ff' : '#ffffff';
    x.strokeText(ch === 'z' ? 'z' : ch, 32, 34); x.fillStyle = col; x.fillText(ch === 'z' ? 'z' : ch, 32, 34);
    return (this._iconTex[ch] = new THREE.CanvasTexture(c));
  },
  icon(ent, ch, life = 1.2) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.iconTex(ch), depthTest: false, transparent: true }));
    s.scale.setScalar(ch === 'z' ? 0.6 : 0.9); s.renderOrder = 10;
    W.area.group.add(s);
    this.icons.push({ s, ent, life, max: life, ch, ox: ent.fixed ? ent.x : 0, oy: ent.fixed ? ent.y : 0, oz: ent.fixed ? ent.z : 0 });
  },
  bolt(x, z, top = 60) {
    const b = this.bolts.find((q) => q.life <= 0) || this.bolts[0];
    const a = b.l.geometry.attributes.position.array;
    let px = x + rnd(-6, 6), pz = z + rnd(-6, 6);
    for (let i = 0; i < 16; i++) { const t = i / 15; a[i * 3] = lerp(px, x, t) + (i && i < 15 ? rnd(-1.5, 1.5) : 0); a[i * 3 + 1] = lerp(top, 0, t); a[i * 3 + 2] = lerp(pz, z, t) + (i && i < 15 ? rnd(-1.5, 1.5) : 0); }
    b.l.geometry.attributes.position.needsUpdate = true; b.l.visible = true; b.life = 0.18;
  },
  onArea(a) {
    // move pooled objects into the current area's group so they are visible
    for (const d of this.debris) { d.life = 0; d.m.visible = false; }
    for (const i of this.icons) if (i.s.parent) i.s.parent.remove(i.s);
    for (const r of this.rings) if (r.m.parent) r.m.parent.remove(r.m);
    this.icons.length = 0; this.rings.length = 0;
    for (let i = 0; i < this.N; i++) { this.life[i] = 0; this.pos[i * 3 + 1] = -999; }
    this.rain.visible = a.kind === 'outdoor' && G.weather !== 'sun';
  },
  update(dt) {
    const N = this.N, p = this.pos, v = this.vel, l = this.life;
    for (let i = 0; i < N; i++) {
      if (l[i] <= 0) continue;
      l[i] -= dt;
      if (l[i] <= 0) { p[i * 3 + 1] = -999; continue; }
      v[i * 3 + 1] -= this.grav[i] * dt;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
    }
    this.pts.geometry.attributes.position.needsUpdate = true;
    this.pts.geometry.attributes.color.needsUpdate = true;
    for (const d of this.debris) {
      if (d.life <= 0) continue;
      d.life -= dt; d.vy -= 18 * dt;
      d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
      const g = W.area ? groundAt(d.m.position.x, d.m.position.z, d.m.position.y + 0.3, 0.05) : -99;
      if (d.m.position.y < g) { d.m.position.y = g; d.vy = -d.vy * 0.35; d.vx *= 0.6; d.vz *= 0.6; }
      d.m.rotation.x += d.spin * dt; d.m.rotation.z += d.spin * 0.7 * dt;
      if (d.life <= 0) d.m.visible = false;
    }
    for (let k = this.icons.length - 1; k >= 0; k--) {
      const ic = this.icons[k]; ic.life -= dt;
      const e = ic.ent;
      if (ic.life <= 0 || (e.dead && !e.fixed)) { ic.s.parent && ic.s.parent.remove(ic.s); this.icons.splice(k, 1); continue; }
      const age = ic.max - ic.life;
      if (e.fixed) ic.s.position.set(ic.ox + Math.sin(age * 3) * 0.2, ic.oy + age * 0.6, ic.oz);
      else ic.s.position.set(e.x, e.y + (e.h || 1.6) + 0.9 + Math.min(age, 0.15) * 2, e.z);
      ic.s.material.opacity = Math.min(1, ic.life * 3);
    }
    for (let k = this.rings.length - 1; k >= 0; k--) {
      const r = this.rings[k]; r.t += dt;
      const s = 0.5 + r.t * r.maxR * 2.5; r.m.scale.set(s, s, s); r.m.material.opacity = Math.max(0, 0.7 - r.t * 1.6);
      if (r.t > 0.45) { r.m.parent && r.m.parent.remove(r.m); r.m.geometry.dispose(); this.rings.splice(k, 1); }
    }
    for (const b of this.bolts) { if (b.life > 0) { b.life -= dt; b.l.material.opacity = b.life / 0.18; if (b.life <= 0) b.l.visible = false; } }
  },
  // per rendered frame: rain follows the camera target; lightning on its own clock
  frame(dt) {
    if (this.rain.visible) {
      const cx = CAM.look.x, cy = CAM.look.y, cz = CAM.look.z, rp = this.rainP, sd = this.rainSeed, t = performance.now() / 1000;
      const W2 = 34, Hh = 22, fall = 26, wind = 5;
      for (let i = 0; i < this.rainN; i++) {
        const fy = ((sd[i * 3 + 1] * Hh - t * fall) % Hh + Hh) % Hh;
        const x = cx + (sd[i * 3] - 0.5) * W2 + (Hh - fy) * wind / fall * 1.5, z = cz + (sd[i * 3 + 2] - 0.5) * W2, y = cy - 4 + fy;
        rp[i * 6] = x; rp[i * 6 + 1] = y; rp[i * 6 + 2] = z;
        rp[i * 6 + 3] = x - wind * 0.025; rp[i * 6 + 4] = y + 0.7; rp[i * 6 + 5] = z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    // distant storm
    if (W.area && G.weather !== 'sun' && (W.area.kind === 'outdoor' || W.area.id.startsWith('lh') || W.area.windows)) {
      this.boltT -= dt;
      if (this.boltT <= 0) {
        this.boltT = rnd(5, 13);
        const d = rnd(0.2, 1);
        lightning(W.area.kind === 'outdoor' ? 0.9 * (1.1 - d) + 0.2 : 0.35);
        if (W.area.kind === 'outdoor' && d < 0.6) { const a = rnd(0, TAU); this.bolt(Hero.x + Math.sin(a) * rnd(40, 70), Hero.z + Math.cos(a) * rnd(40, 70)); }
        Audio2.sfx('thunder', d);
      }
    }
  },
};
