// ---- 08_ship: capital ships: flight, shields, subsystems, batteries, flak, damage, breaking apart ----
const FACING_CAP = { on: 1.6, off: 0.8 };
const _sl = new V3(), _sd = new V3(), _sw = new V3(), _sinv = new M4();
let shipSeq = 0;
class Ship {
  constructor(cls, team, o) {
    o = o || {};
    const C = this.C = CLASSES[cls];
    this.id = ++shipSeq; this.cls = cls; this.team = team; this.tag = o.tag || null;
    this.name = o.name || SHIP_NAMES[team][(shipSeq * 5 + team * 3) % SHIP_NAMES[team].length];
    this.className = CLASS_NAMES[team][cls];
    this.model = Models.ship(cls, team);
    this.len = C.len; this.radius = this.model.radius;
    this.pos = new V3(); this.vel = new V3(); this.fwd = new V3(0, 0, 1);
    this.yaw = 0; this.pitch = 0; this.roll = 0; this.speed = 0; this.thr = 0; this.yawCmd = 0; this.pitchCmd = 0; this.yawRate = 0; this.pitchRate = 0;
    this.maxHull = this.hull = C.hull;
    this.shieldBase = C.shield; this.reinforce = null;
    this.shield = { fore: C.shield, aft: C.shield, port: C.shield, stbd: C.shield };
    this.shDelay = { fore: 0, aft: 0, port: 0, stbd: 0 };
    this.subs = {};
    for (const k of SUB_ORDER) {
      const m = this.model.subs[k]; if (!m) continue;
      if (k === 'hangar' && !C.hangar.length) continue;
      if ((k === 'port' || k === 'stbd') && !C.side) continue;
      const hp = SUBSYS[k].hp * C.hull;
      this.subs[k] = { type: k, p: m.p, r: m.r, hp, max: hp, down: false, repair: 0 };
    }
    if (cls === 'station') delete this.subs.engines;
    this.bat = {};
    for (const side of ['port', 'stbd', 'bow']) {
      const spec = side === 'bow' ? C.bow : C.side; const guns = this.model.guns[side];
      if (spec && guns.length) this.bat[side] = { side, guns, dmg: spec.dmg, reload: spec.reload, t: rnd(0, spec.reload) };
    }
    this.torps = C.torps; this.torpCd = 0; this.torpMax = C.torps;
    this.flakCd = 0; this.flakList = []; this.flakScan = 0;
    this.squads = [];
    this.pending = [];
    this.alive = true; this.arrived = true; this.dying = -1; this.escaped = false;
    this.stats = { dmg: 0, kills: 0, shots: 0, hits: 0, subs: 0 };
    this.lastHitBy = null; this.hitT = 0; this.underFire = 0;
    this.burns = []; this.isPlayer = false;
    this.buildMeshes();
  }
  buildMeshes() {
    const root = this.root = new THREE.Group(); this.secs = [];
    for (const s of this.model.secs) {
      if (!s.geo) continue;
      const g = new THREE.Group(); g.position.copy(s.c);
      const hull = new THREE.Mesh(s.geo, Models.hullMat); g.add(hull);
      let lit = null; if (s.lit) { lit = new THREE.Mesh(s.lit, Models.lightMat); g.add(lit); }
      root.add(g); this.secs.push({ g, hull, lit, c: s.c.clone(), vel: new V3(), spin: new V3() });
    }
    const half = this.model.half, cen = this.model.centre;
    this.shieldMesh = makeShieldMesh(this.team ? 0xff9a5a : 0x7fc8ff);
    this.shieldMesh.scale.set(half.x * 1.2 + 6, half.y * 1.35 + 6, half.z * 1.08 + 6); this.shieldMesh.position.copy(cen);
    root.add(this.shieldMesh); this.shHits = this.shieldMesh.material.uniforms.hits.value; this.shHitI = 0;
    R.scene.add(root);
  }
  place(x, y, z, yawDeg, pitch) {
    this.pos.set(x, y, z); this.yaw = (yawDeg || 0) * DEG; this.pitch = pitch || 0;
    dirFrom(this.yaw, this.pitch, this.fwd); this.vel.copy(this.fwd).multiplyScalar(this.speed); this.sync();
  }
  sync() { const r = this.root; r.position.copy(this.pos); r.rotation.set(-this.pitch, this.yaw, this.roll, 'YXZ'); r.updateMatrixWorld(true); }
  toWorld(lp, out) { return (out || new V3()).copy(lp).applyMatrix4(this.root.matrixWorld); }
  toLocal(wp, out) { _sinv.copy(this.root.matrixWorld).invert(); return (out || new V3()).copy(wp).applyMatrix4(_sinv); }
  dirToLocal(wd, out) { _q1.copy(this.root.quaternion).invert(); return (out || new V3()).copy(wd).applyQuaternion(_q1); }
  subWorld(type, out) { return this.toWorld(this.subs[type] ? this.subs[type].p : this.model.centre, out); }
  centre(out) { return this.toWorld(this.model.centre, out); }
  // Subsystem state helpers.
  ok(type) { const s = this.subs[type]; return !s || !s.down; }
  get disabled() { return !!(this.subs.engines && this.subs.engines.down && this.subs.shields && this.subs.shields.down); }
  shieldCap(f) { return this.shieldBase * (this.reinforce ? (this.reinforce === f ? FACING_CAP.on : FACING_CAP.off) : 1); }
  setReinforce(f) {
    if (f === this.reinforce) f = null;
    const old = {}; for (const k of FACINGS) old[k] = this.shield[k] / this.shieldCap(k);
    this.reinforce = f;
    for (const k of FACINGS) this.shield[k] = old[k] * this.shieldCap(k);
    return f;
  }
  facingOf(lp) {
    const h = this.model.half, nx = lp.x / h.x, nz = (lp.z - this.model.centre.z) / h.z;
    if (Math.abs(nz) * 1.1 > Math.abs(nx)) return nz > 0 ? 'fore' : 'aft';
    return nx > 0 ? 'port' : 'stbd';
  }
  // Does a battery bear on a world point? Returns false if out of arc, out of range or knocked out.
  bears(side, wp) {
    const b = this.bat[side]; if (!b) return false;
    if ((side === 'port' || side === 'stbd') && !this.ok(side)) return false;
    _sd.copy(wp).sub(this.pos); const d = _sd.length(); if (d > BOLT_RANGE * 0.98 || d < 20) return false;
    this.dirToLocal(_sd.divideScalar(d), _sl);
    if (this.C.ring) return side === 'port' ? _sl.x > -0.15 : side === 'stbd' ? _sl.x < 0.15 : false;
    if (side === 'port') return _sl.x > 0.26;
    if (side === 'stbd') return _sl.x < -0.26;
    return _sl.z > 0.86;
  }
  // Fire one battery at a world point: guns ripple over half a second. err = spread in radians.
  fireBattery(side, wp, err, target) {
    const b = this.bat[side]; if (!b || b.t > 0 || !this.bears(side, wp)) return false;
    b.t = b.reload;
    for (let i = 0; i < b.guns.length; i++) this.pending.push({ t: i * 0.06 + rand() * 0.12, side, gun: i, aim: wp.clone(), err: err || 0, target });
    return true;
  }
  fireTorps(target) {
    if (!this.torps || this.torpCd > 0 || !target || !target.alive) return false;
    _sd.copy(target.pos).sub(this.pos); const d = _sd.length();
    if (d > 3600 || this.dirToLocal(_sd.divideScalar(d), _sl).z < 0.5) return false;
    this.torpCd = 26;
    this.model.tubes.forEach((tp, i) => { this.pending.push({ t: i * 0.25, torp: true, tube: i, target }); });
    return true;
  }
  update(dt) {
    if (!this.arrived) return;
    if (this.jumpAnim != null) { this.updateJump(dt); return; }
    if (this.dying >= 0) { this.updateDying(dt); return; }
    const C = this.C;
    // Engines knocked out: a crawl and a slow turn.
    const eng = this.ok('engines') ? 1 : 0.25, steer = this.ok('engines') ? 1 : 0.4;
    const maxTurn = C.turn * DEG * steer, maxPitch = C.pitch * DEG * steer;
    const want = clamp(this.thr, -0.25, 1) * C.speed * eng;
    this.speed = approach(this.speed, want, C.accel * dt * (want < this.speed ? 1.4 : 1));
    this.yawRate = approach(this.yawRate, clamp(this.yawCmd, -1, 1) * maxTurn, maxTurn * 0.9 * dt);
    this.pitchRate = approach(this.pitchRate, clamp(this.pitchCmd, -1, 1) * maxPitch, maxPitch * 0.9 * dt);
    this.yaw = angNorm(this.yaw + this.yawRate * dt);
    this.pitch = clamp(this.pitch + this.pitchRate * dt, -0.85, 0.85);
    if (Math.abs(this.pitch) >= 0.85) this.pitchRate = 0;
    this.roll = lerp(this.roll, (maxTurn ? this.yawRate / maxTurn : 0) * -0.1, Math.min(1, dt * 1.2));
    dirFrom(this.yaw, this.pitch, this.fwd);
    _sw.copy(this.fwd).multiplyScalar(this.speed);
    this.vel.lerp(_sw, 1 - Math.exp(-dt * 1.2));
    this.pos.addScaledVector(this.vel, dt);
    if (C.ring) this.yaw = angNorm(this.yaw + dt * 0.02);
    this.sync();
    // Shields: per-facing delay after a hit, then regenerate. A dead generator lets them bleed away.
    const gen = this.ok('shields');
    for (const f of FACINGS) {
      const cap = this.shieldCap(f);
      if (!gen) this.shield[f] = Math.max(0, this.shield[f] - cap * 0.12 * dt);
      else if ((this.shDelay[f] -= dt) <= 0) this.shield[f] = Math.min(cap, this.shield[f] + this.shieldBase * 0.055 * dt);
      else if (this.shield[f] > cap) this.shield[f] = cap;
    }
    for (const k in this.bat) this.bat[k].t -= dt;
    this.torpCd -= dt;
    this.hitT += dt; this.underFire = Math.max(0, this.underFire - dt * 0.25);
    // Ripple-fire queued guns and torpedoes.
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i]; p.t -= dt; if (p.t > 0) continue;
      this.pending.splice(i, 1);
      if (p.torp) { if (p.target.alive) Combat.torpedo(this, this.toWorld(this.model.tubes[p.tube]), p.target); continue; }
      const b = this.bat[p.side]; if (!b) continue;
      const o = this.toWorld(b.guns[p.gun], _sw);
      _sd.copy(p.aim).sub(o).normalize();
      if (p.err) { _sd.x += gauss() * p.err; _sd.y += gauss() * p.err; _sd.z += gauss() * p.err; _sd.normalize(); }
      Combat.bolt(o, _sd, this, b.dmg, true);
      this.stats.shots++;
    }
    // Damage control (the player's ship only): knocked-out systems come back after a while.
    if (this.isPlayer) for (const k in this.subs) {
      const s = this.subs[k];
      if (s.down) { s.repair -= dt; if (s.repair <= 0) { s.down = false; s.hp = s.max * 0.35; Hud.ribbon(SUBSYS[k].name + ' back online', 'good'); } }
      else if (s.hp < s.max) s.hp = Math.min(s.max, s.hp + s.max * 0.006 * dt);
    }
    this.updateFlak(dt);
    for (const q of this.squads) q.update(dt);
  }
  // Point defence: automatic flak at small craft and torpedoes within 950 m.
  updateFlak(dt) {
    const C = this.C; if (!C.flak) return;
    if ((this.flakScan -= dt) <= 0) {
      this.flakScan = 0.4; this.flakList.length = 0;
      for (const c of G.craft) if (c.alive && c.team !== this.team && c.pos.distanceToSquared(this.pos) < (950 + this.radius) ** 2) this.flakList.push(c);
      for (const t of Combat.torps) if (t.alive && t.team !== this.team && t.pos.distanceToSquared(this.pos) < (950 + this.radius) ** 2) this.flakList.push(t);
    }
    if (!this.flakList.length) return;
    this.flakCd -= dt;
    while (this.flakCd <= 0) {
      this.flakCd += 0.3 / C.flak;
      // Torpedoes first, then bombers, then whatever is closest.
      let best = null, bs = 1e18;
      for (const c of this.flakList) {
        if (!c.alive) continue;
        const d = c.pos.distanceToSquared(this.pos) * (c.isTorp ? 0.25 : c.type === 'bmb' ? 0.6 : 1) * (0.6 + rand() * 0.8);
        if (d < bs) { bs = d; best = c; }
      }
      if (!best) return;
      const d = Math.sqrt(bs) | 0;
      const pHit = 0.11 * (best.isTorp ? 1.5 : best.type === 'bmb' ? 1.25 : 1) * clamp(1.15 - best.pos.distanceTo(this.pos) / (1000 + this.radius), 0.15, 1);
      Combat.flak(this, best, rand() < pHit, d);
    }
  }
  hitShield(lp) {
    const h = this.model.half, c = this.model.centre, s = this.shieldMesh.scale;
    const v = this.shHits[this.shHitI]; this.shHitI = (this.shHitI + 1) % 6;
    _sl.set((lp.x - c.x) / s.x, (lp.y - c.y) / s.y, (lp.z - c.z) / s.z).normalize();
    v.set(_sl.x, _sl.y, _sl.z, 0);
  }
  // Apply damage at a local point. kind: 'bolt' | 'torp' | 'gun' (small craft) | 'ram'. Returns 'shield' or 'hull'.
  damage(amount, lp, by, kind) {
    if (!this.alive || this.jumpAnim != null) return null;
    // The player's ship has a veteran crew: it shrugs off a third of every hit. God mode (tests) almost all.
    if (this.isPlayer) amount *= G.god ? 0.05 : 0.68;
    const f = this.facingOf(lp);
    let rest = amount, res = 'hull';
    if (this.shield[f] > 1) {
      const can = kind === 'torp' ? amount * 0.5 : amount, a = Math.min(this.shield[f], can);
      this.shield[f] -= a; rest = amount - a; this.shDelay[f] = 3.2; res = rest > 0.5 ? 'both' : 'shield';
      this.hitShield(lp);
    }
    if (by && by.team !== this.team) { this.lastHitBy = by; this.hitT = 0; this.underFire = Math.min(3, this.underFire + amount / 400); this.lastHitFacing = f; }
    if (by && by.stats) by.stats.dmg += amount;
    if (rest > 0.5) {
      this.hull -= rest;
      for (const k in this.subs) {
        const s = this.subs[k]; if (s.down) continue;
        const reach = s.r + (kind === 'torp' ? 30 : 0);
        if (s.p.distanceToSquared(lp) < reach * reach) {
          s.hp -= rest * (kind === 'gun' ? 1.6 : 1);
          if (s.hp <= 0) this.subDown(k, by);
        }
      }
      if (this.hull <= 0) { this.hull = 0; this.die(by); }
    }
    return res;
  }
  subDown(k, by) {
    const s = this.subs[k]; s.hp = 0; s.down = true; s.repair = 35;
    if (by && by.stats) by.stats.subs++;
    Fx.explode(this.toWorld(s.p, _sw), Math.max(18, s.r * 0.8), this.vel);
    Sfx.explosion(_sw, 1.2);
    if (k === 'shields') for (const f of FACINGS) this.shDelay[f] = 0;
    Damage.wreck(this, k);
    Mission.event('sub', this, k, by);
  }
  die(by) {
    if (!this.alive) return;
    this.alive = false; this.dying = 0; this.killer = by;
    if (by && by.stats && by.team !== this.team) by.stats.kills++;
    // Break in two: the halves drift apart, tumbling, while the hull burns and explodes.
    for (const [i, s] of this.secs.entries()) {
      const k = this.secs.length > 1 ? (i === 0 ? 1 : -1) : 0;
      s.vel.set(rnd(-6, 6), rnd(-10, -3), k * rnd(8, 18)); s.spin.set(rnd(-0.06, 0.06) + k * 0.04, rnd(-0.03, 0.03), rnd(-0.08, 0.08));
      if (this.secs.length === 1) s.spin.multiplyScalar(0.4);
    }
    this.dyingMat = Models.hullMat.clone(); for (const s of this.secs) s.hull.material = this.dyingMat;
    this.shieldMesh.visible = false;
    for (const q of this.squads) q.orphan();
    Fx.explode(this.centre(_sw), this.len * 0.16, this.vel);
    Sfx.explosion(_sw, 2.2);
    if (!G.simming) for (let i = 0; i < 4; i++) { this.randomPoint(_sd); _sl.copy(_sd).sub(_sw).normalize(); Damage.spray(this, _sd, _sl, rndi(4, 7), this.len * 0.012); }
    Mission.event('kill', this, null, by);
  }
  updateDying(dt) {
    const t0 = this.dying; this.dying += dt;
    this.pos.addScaledVector(this.vel, dt); this.vel.multiplyScalar(Math.exp(-dt * 0.15)); this.vel.y -= dt * 2;
    this.sync();
    for (const s of this.secs) {
      s.g.position.addScaledVector(s.vel, dt);
      s.g.rotation.x += s.spin.x * dt; s.g.rotation.y += s.spin.y * dt; s.g.rotation.z += s.spin.z * dt;
    }
    if (this.dyingMat) { const k = Math.max(0.28, 1 - this.dying * 0.12); this.dyingMat.color.setRGB(k, k * 0.95, k * 0.9); }
    if (this.dying > 1.6) for (const s of this.secs) if (s.lit) s.lit.visible = ((this.dying * 7) | 0) % 3 === 0 && this.dying < 3.2;
    if (G.simming) return;
    // Secondary explosions for six seconds, a big one at 5.5 s.
    if (this.dying < 6 && rand() < dt * 5) { this.randomPoint(_sw); Fx.explode(_sw, this.len * rnd(0.03, 0.07), this.vel); Sfx.explosion(_sw, 1); }
    if (t0 < 5.5 && this.dying >= 5.5) { this.centre(_sw); Fx.explode(_sw, this.len * 0.3, this.vel, true); Sfx.explosion(_sw, 3); }
    if (this.dying < 30 && rand() < dt * 8) { this.randomPoint(_sw); Fx.puff(_sw, this.vel, rnd(3, 6), this.len * 0.03, this.len * 0.12, 0.08, 0.07, 0.07, 0.6, 0.2); if (rand() < 0.5) Fx.spark(_sw, this.vel, 0.8, this.len * 0.02, this.len * 0.05, 1, 0.45, 0.15, 0.9); }
  }
  // A random point on (roughly) the hull surface, in world space. Follows the drifting halves after death.
  randomPoint(out) {
    const cl = pick(this.model.colliders);
    out.set(cl.c.x + rnd(-1, 1) * cl.h.x, cl.c.y + rnd(-1, 1) * cl.h.y, cl.c.z + rnd(-1, 1) * cl.h.z);
    if (this.dying >= 0 && this.secs.length) {
      const s = this.secs[out.z >= this.model.split || this.secs.length < 2 ? 0 : 1];
      s.g.updateMatrix(); out.sub(s.c).applyMatrix4(s.g.matrix);
    }
    return out.applyMatrix4(this.root.matrixWorld);
  }
  // Ray test against the hull boxes. o, d in world space. Returns the distance, and the local hit point in hitL.
  raycast(o, d, maxT, hitL) {
    if (!this.alive || !this.arrived || this.jumpAnim != null) return -1;
    // Bounding sphere first.
    const c = this.centre(_sw), r = this.radius * 1.05;
    const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
    const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r;
    if (cc > 0 && (b > 0 || b * b - cc < 0)) return -1;
    if (-b - Math.sqrt(Math.max(0, b * b - cc)) > maxT) return -1;
    const lo = this.toLocal(o, _sl), ld = this.dirToLocal(d, _sd);
    let best = -1;
    for (const cl of this.model.colliders) {
      let tmin = 0, tmax = maxT, hit = true;
      for (let a = 0; a < 3; a++) {
        const oa = a === 0 ? lo.x - cl.c.x : a === 1 ? lo.y - cl.c.y : lo.z - cl.c.z, da = a === 0 ? ld.x : a === 1 ? ld.y : ld.z, ha = a === 0 ? cl.h.x : a === 1 ? cl.h.y : cl.h.z;
        if (Math.abs(da) < 1e-9) { if (Math.abs(oa) > ha) { hit = false; break; } continue; }
        let t1 = (-ha - oa) / da, t2 = (ha - oa) / da; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) { hit = false; break; }
      }
      if (hit && (best < 0 || tmin < best)) best = tmin;
    }
    if (best >= 0 && hitL) hitL.copy(lo).addScaledVector(ld, best);
    return best;
  }
  // Is a world point inside the hull boxes (with margin m)?
  inside(wp, m) {
    if (wp.distanceToSquared(this.pos) > (this.radius + m) ** 2) return false;
    const lp = this.toLocal(wp, _sl);
    for (const cl of this.model.colliders) if (Math.abs(lp.x - cl.c.x) < cl.h.x + m && Math.abs(lp.y - cl.c.y) < cl.h.y + m && Math.abs(lp.z - cl.c.z) < cl.h.z + m) return true;
    return false;
  }
  // Jump arrival: the ship streaks in from 3 km behind its spawn point.
  startJump(dur) {
    this.arrived = true; this.jumpAnim = 0; this.jumpDur = dur || 1.1;
    this.jumpTo = this.pos.clone(); this.jumpFrom = this.pos.clone().addScaledVector(this.fwd, -3200);
    this.root.visible = true;
  }
  updateJump(dt) {
    this.jumpAnim += dt; const f = Math.min(1, this.jumpAnim / this.jumpDur), e = 1 - Math.pow(1 - f, 3);
    if (this.escaping) {
      this.pos.addScaledVector(this.fwd, dt * (300 + 9000 * f * f)); this.root.scale.set(1, 1, 1 + 18 * f * f); this.sync();
      if (f >= 1) { this.jumpAnim = null; this.root.visible = false; this.alive = false; this.escaped = true; Mission.event('escape', this); }
      return;
    }
    this.pos.lerpVectors(this.jumpFrom, this.jumpTo, e);
    this.root.scale.set(1, 1, 1 + 16 * (1 - e) * (1 - e)); this.sync();
    if (f >= 1) {
      this.jumpAnim = null; this.root.scale.set(1, 1, 1); this.speed = this.C.speed * 0.5; this.vel.copy(this.fwd).multiplyScalar(this.speed);
      if (!G.simming) { Fx.flash(this.centre(_sw), this.len * 0.6, 0.7, 0.85, 1); Sfx.jump(_sw); }
    } else if (!G.simming && f < 0.25) Fx.jump(this.jumpFrom, this.pos, this.len);
  }
  jumpOut() {
    if (!this.alive || this.escaping) return;
    this.escaping = true; this.jumpAnim = 0; this.jumpDur = 1.4;
    if (!G.simming) { Fx.flash(this.centre(_sw), this.len * 0.5, 0.7, 0.85, 1); Sfx.jump(_sw); }
  }
  // Per-frame visuals: engine glows, beacons, shield ripples, burning.
  draw(dt) {
    if (!this.arrived) { this.root.visible = false; return; }
    this.root.visible = !this.escaped;
    if (this.escaped) return;
    Damage.burn(this, dt);
    const P = PALETTE[this.team];
    if (this.alive) {
      const thr = Math.abs(this.speed) / (this.C.speed || 1), on = this.ok('engines') ? 1 : 0.25;
      for (const n of this.model.nozzles) {
        this.toWorld(n.p, _sw);
        Fx.glow(_sw, n.r * (2.2 + 1.6 * thr), P.engine[0] * on, P.engine[1] * on, P.engine[2] * on, 0.55 + 0.45 * thr);
        _sd.copy(this.fwd).multiplyScalar(-n.r * (1.2 + thr * 2.5)).add(_sw);
        Fx.glow(_sd, n.r * 1.6 * thr, P.engine[0] * 0.6 * on, P.engine[1] * 0.6 * on, P.engine[2] * on, 0.35);
      }
      for (const b of this.model.beacons) {
        const a = b.blink ? (((R.t * b.blink + this.id * 0.37) % 1) < 0.18 ? 1 : 0.12) : 0.9;
        Fx.glow(this.toWorld(b.p, _sw), Math.max(6, this.len * 0.012), b.col.r, b.col.g, b.col.b, a);
      }
      // Shield ripples age and fade.
      let any = false;
      for (const h of this.shHits) { if (h.w < 1.2) { h.w += dt; any = true; } }
      this.shieldMesh.material.uniforms.glow.value = Math.max(0, this.shieldMesh.material.uniforms.glow.value - dt * 1.5);
      this.shieldMesh.visible = any || this.shieldMesh.material.uniforms.glow.value > 0.01;
      // Knocked-out systems smoulder (fires and vents from hull hits burn in Damage.burn).
      if (!G.simming) for (const k in this.subs) {
        const s = this.subs[k]; if (!s.down || rand() > dt * 6) continue;
        this.toWorld(s.p, _sw); _sw.x += rnd(-1, 1) * s.r * 0.4; _sw.y += rnd(-1, 1) * s.r * 0.4; _sw.z += rnd(-1, 1) * s.r * 0.4;
        Fx.spark(_sw, this.vel, rnd(0.4, 1), s.r * 0.25, s.r * 0.6, 1, 0.55, 0.2, 1);
        Fx.puff(_sw, this.vel, rnd(2, 4), s.r * 0.3, s.r * 1.2, 0.08, 0.08, 0.08, 0.5, 0.2);
      }
    }
  }
  remove() { R.scene.remove(this.root); if (this.dyingMat) this.dyingMat.dispose(); this.shieldMesh.material.dispose(); }
}
