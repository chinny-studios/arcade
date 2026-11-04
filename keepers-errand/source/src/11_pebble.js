// ---- the tide-pebble: thrown with an arc that depends on the mode, bounces, then flies home ----
// Normal: a medium arc. Sporty: a high lob. Aggressive: hard and flat. Sneaky: a low skim along the ground.
const ARCS = {
  normal: { sp: 11, up: 4.2 },
  sporty: { sp: 8.5, up: 9.5 },
  aggressive: { sp: 17, up: 1.8 },
  sneaky: { sp: 8, up: 0.6 },
};
const Pebble = {
  active: false, returning: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0.16, h: 0.3, life: 0, bounces: 0, hitSet: null,
  obj: null, trailT: 0,
  build() {
    const g = new THREE.Group();
    this.stone = mesh(GEO.ico1, 0x8fb4c8, 0, 0, 0, 0.34, 0.3, 0.34);
    this.glow = mesh(GEO.ico1, MAT.glow(0xffd36a), 0, 0, 0, 0.42, 0.38, 0.42);
    this.glow.material = new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.45, depthWrite: false });
    g.add(this.stone); g.add(this.glow);
    g.visible = false;
    this.obj = g; R.scene.add(g);
  },
  get sun() { return F('pebbleUp'); },
  get dmg() { return this.sun ? 3 : 2; },
  throw() {
    if (!hasItem('pebble')) { HUD.toast("You don't have anything to throw yet."); return false; }
    if (this.active) return false;
    const H = Hero, arc = ARCS[H.mode];
    let ang = H.ry;
    // gentle auto-aim toward something worth hitting in front
    const tgt = Actors.aimTarget(H.x, H.z, H.ry, 16);
    let up = arc.up, sp = arc.sp;
    if (tgt) {
      ang = Math.atan2(tgt.x - H.x, tgt.z - H.z);
      // for a high target (like a nest) solve for a lob that reaches it
      const dh = (tgt.aimY != null ? tgt.aimY : tgt.y + 0.8) - (H.y + 1.4);
      if (dh > 2) { const d = Math.hypot(tgt.x - H.x, tgt.z - H.z); const tFlight = Math.max(0.5, d / sp); up = Math.max(up, (dh + 0.5 * 18 * tFlight * tFlight) / tFlight); up = Math.min(up, 14); }
    }
    H.ry = ang;
    H.state = 'throw'; H.anim.throwT = 0;
    Audio2.sfx('throw');
    Timers.after(0.13, () => {
      this.active = true; this.returning = false; this.life = 0; this.bounces = 0; this.hitSet = new Set();
      this.x = H.x + Math.sin(ang) * 0.5; this.z = H.z + Math.cos(ang) * 0.5; this.y = H.y + 1.5;
      this.vx = Math.sin(ang) * sp; this.vz = Math.cos(ang) * sp; this.vy = up;
      this.obj.visible = true;
      this.obj.parent !== W.area.group && W.area.group.add(this.obj);
    });
    return true;
  },
  recall() { if (this.active) this.returning = true; },
  reset() { this.active = false; this.returning = false; this.obj.visible = false; },
  update(dt) {
    if (!this.active) { this.obj.visible = false; return; }
    const sun = this.sun, maxB = sun ? 6 : 3;
    this.life += dt;
    this.glow.visible = sun;
    this.stone.material = MAT.col(sun ? 0xffe9a8 : 0x8fb4c8);
    if (this.returning) {
      const hx = Hero.x, hy = Hero.y + 1.2, hz = Hero.z;
      const dx = hx - this.x, dy = hy - this.y, dz = hz - this.z, d = Math.hypot(dx, dy, dz);
      const sp = 20 + this.life * 4;
      if (d < 0.7 || this.life > 6) { this.reset(); Audio2.sfx('catch'); return; }
      this.x += dx / d * sp * dt; this.y += dy / d * sp * dt; this.z += dz / d * sp * dt;
    } else {
      this.vy -= 18 * dt;
      // sub-steps so fast throws don't tunnel through thin walls
      const n = Math.ceil(Math.hypot(this.vx, this.vy, this.vz) * dt / 0.15);
      const h = dt / n;
      for (let i = 0; i < n && !this.returning; i++) {
        this.x += this.vx * h; this.y += this.vy * h; this.z += this.vz * h;
        // walls
        const wasX = this.x, wasZ = this.z;
        const hit = resolveWalls(this);
        if (hit) {
          const [nx, nz] = this.wallN || [0, 0];
          const vn = this.vx * nx + this.vz * nz;
          if (vn < 0) { this.vx -= 2 * vn * nx; this.vz -= 2 * vn * nz; this.vx *= 0.85; this.vz *= 0.85; this.bounce(hit); }
        }
        // ground
        const g = groundAt(this.x, this.z, this.y, 0.1);
        if (this.y - this.r < g) {
          this.y = g + this.r;
          if (this.vy < 0) { this.vy = -this.vy * 0.62; this.vx *= 0.88; this.vz *= 0.88; if (Math.abs(this.vy) > 1.2) this.bounce(null); else this.vy = Math.max(this.vy, 2.5); }
        }
        // the sea swallows momentum
        if (W.area.kind === 'outdoor' && this.y < 0.1 && W.area.ground(this.x, this.z) < -0.2) { FX.splash(this.x, 0, this.z, 0.4); this.returning = true; }
        // anything that reacts to the pebble
        const res = Actors.pebbleTouch(this);
        if (res === 'bounce') { this.vx = -this.vx * 0.6; this.vz = -this.vz * 0.6; this.vy = Math.abs(this.vy) * 0.5 + 2; this.bounce(null, true); }
        else if (res === 'stop') this.returning = true;
      }
      if (this.bounces >= maxB || this.life > (sun ? 3.4 : 2.6)) this.returning = true;
    }
    this.obj.position.set(this.x, this.y, this.z);
    this.obj.rotation.x += dt * 12; this.obj.rotation.y += dt * 9;
    this.trailT -= dt;
    if (this.trailT <= 0) { this.trailT = 0.03; FX.spark(this.x, this.y, this.z, sun ? 0xffd36a : 0xbfe4ff, 0.35); }
  },
  bounce(c, quiet) {
    this.bounces++;
    if (!quiet) Audio2.sfx('bounce', this.bounces);
    if (c && c.onPebble) c.onPebble(this);
  },
};
