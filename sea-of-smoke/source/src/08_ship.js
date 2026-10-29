// ---- 08_ship: ship state, sailing physics, damage, fires and leaks, consumables, boarding ----
// tele: sail setting -1 (backed) .. 4 (full). rudderCmd: -1 (hard to port) .. 1 (hard to starboard).
// Batteries: port, star(board), bow and stern chasers; rl[b] is seconds left to reload.
const STRAKES = [[0.72, 0.56, 0.2], [0.55, 0.12, 0.1], [0.2, 0.32, 0.5], [0.2, 0.4, 0.25], [0.8, 0.78, 0.7], [0.1, 0.1, 0.1]];
const BATTERIES = ['port', 'star', 'bow', 'stern'];
let shipSeq = 0;
class Ship {
  constructor(cls, team, name, o) {
    const C = this.C = CLASSES[cls];
    this.cls = cls; this.team = team; this.name = name; this.id = ++shipSeq; this.isPlayer = !!o.player;
    this.x = o.x; this.z = o.z; this.h = o.h; this.v = 0; this.y = 0; this.pitch = 0; this.roll = 0; this.omega = 0;
    this.tele = 0; this.rudderCmd = 0; this.rudder = 0;
    this.hp = this.maxHp = C.hp; this.sails = 1; this.crew = this.maxCrew = C.crew;
    this.fires = [0, 0, 0]; this.leaks = [0, 0]; this.fireBy = null;
    this.ammo = 0; this.weapon = 0;
    this.rl = { port: 0, star: 0, bow: 0, stern: 0 }; this.rlMax = { port: 1, star: 1, bow: 1, stern: 1 };
    this.raftRl = 0;
    this.repair = { n: C.repair.charges, cd: 0, t: 0 };
    const sp = SPECIALS[C.special]; this.spec = { id: C.special, n: sp.charges, cd: 0, t: 0, puff: 0 };
    this.ignited = 0;
    this.alive = true; this.sinkT = 0; this.gone = false;
    this.board = null; this.lastBy = null; this.lastFire = -99; this.groundT = 0; this.ramT = 0;
    this.seen = [false, false]; this.seenT = [-99, -99];
    this.stats = { dmg: 0, kills: 0, fires: 0, caps: 0, captures: 0, shots: 0, hits: 0, spotDmg: 0 };
    this.model = buildShip(cls, { team, strake: o.strake || pick(STRAKES) });
    R.scene.add(this.model.root);
    this.sailOrder = shuffle(this.model.sails.map((_, i) => i));
    this.sailSet = 0.15; this.wakeT = 0;
  }
  get hpf() { return this.hp / this.maxHp; }
  get crewf() { return this.crew / this.maxCrew; }
  range(ammo) { const a = AMMO[ammo == null ? this.ammo : ammo]; return this.C.guns.range * a.range * (this.spec.id === 'lookout' && this.spec.t > 0 ? 1.08 : 1); }
  // local <-> world (heading only, tilt ignored)
  wx(lx, lz) { return this.x + lx * Math.cos(this.h) + lz * Math.sin(this.h); }
  wz(lx, lz) { return this.z - lx * Math.sin(this.h) + lz * Math.cos(this.h); }
  lx(x, z) { const dx = x - this.x, dz = z - this.z; return dx * Math.cos(this.h) - dz * Math.sin(this.h); }
  lz(x, z) { const dx = x - this.x, dz = z - this.z; return dx * Math.sin(this.h) + dz * Math.cos(this.h); }
  // Relative bearing of a point: 0 ahead, +PI/2 starboard, -PI/2 port.
  bearing(x, z) { return Math.atan2(-this.lx(x, z), this.lz(x, z)); }
  bears(bat, x, z) {
    const b = this.bearing(x, z), a = Math.abs(b);
    if (bat === 'port') return b < -40 * DEG && b > -140 * DEG;
    if (bat === 'star') return b > 40 * DEG && b < 140 * DEG;
    if (bat === 'bow') return a < 38 * DEG;
    return a > 148 * DEG;
  }
  reloadRate() {
    const crew = 0.4 + 0.6 * clamp(this.crewf / 0.65, 0, 1);
    return crew * (this.spec.id === 'rally' && this.spec.t > 0 ? 1.25 : 1);
  }
  reloadTime(ammo) {
    let t = this.C.guns.reload * AMMO[ammo].reload;
    if (ammo === 1 && this.C.chainBonus) t /= this.C.chainBonus;
    return t;
  }
  strength() { return this.crew * (this.spec.id === 'rally' && this.spec.t > 0 ? 1.4 : 1) * (this.cls === 'galleon' ? 1.15 : 1); }
  maxSpeed() {
    const C = this.C, rel = angNorm(this.h - Match.wind.a), ca = Math.cos(rel);
    const wind = 0.95 + 0.06 * (0.5 + 0.5 * ca) + 0.04 * Math.sin(rel) ** 2;
    let v = C.speed * wind * (0.3 + 0.7 * this.sails) * (1 - LEAK.slow * this.leaks.filter((l) => l > 0).length);
    if (this.spec.id === 'studding' && this.spec.t > 0) v *= 1.16;
    if (this.ignited > 0) v *= 1.15;
    if (this.crewf < 0.25) v *= 0.8;
    return v;
  }
  setWeapon(i) {
    if (!this.alive) return;
    if (i === RAFT_SLOT) { if (this.C.rafts) this.weapon = i; return; }
    if (i < 0 || i > 2) return;
    this.weapon = i;
    if (this.ammo === i) return;
    for (const b of BATTERIES) if (this.rl[b] <= 0) { this.rl[b] = this.reloadTime(i) * 0.5; this.rlMax[b] = this.rl[b]; }
    this.ammo = i;
  }

  // ---------- per-frame update ----------
  update(dt) {
    const C = this.C, m = this.model;
    if (!this.alive) { this.updateSinking(dt); return; }
    const locked = Match.phase === 'countdown';
    // sails and speed
    let frac = this.tele === -1 ? -0.25 : this.tele / 4;
    if (locked) frac = 0;
    let target = this.maxSpeed() * frac * (1 - 0.12 * Math.abs(this.rudder));
    if (this.board) target = 0;
    const acc = C.speed / C.accel;
    this.v = approach(this.v, target, acc * dt * (Math.abs(this.v) > Math.abs(target) ? 1.4 : 1));
    this.rudder = approach(this.rudder, this.board ? 0 : this.rudderCmd, dt / C.rudderT);
    const vs = Math.max(Math.abs(this.v), C.speed * 0.18) * Math.sign(this.v || 1);
    this.omega = this.rudder * vs / C.turnR;
    this.h = angNorm(this.h - this.omega * dt);
    const ox = this.x, oz = this.z;
    this.x += Math.sin(this.h) * this.v * dt; this.z += Math.cos(this.h) * this.v * dt;
    // grounding: sample bow, stern and the bilges
    this.groundT -= dt;
    const L = C.len, B = C.beam, probes = [[0, L * 0.48], [0, -L * 0.45], [B * 0.45, 0], [-B * 0.45, 0], [B * 0.35, L * 0.3], [-B * 0.35, L * 0.3]];
    let hit = false;
    for (const [px, pz] of probes) if (World.h(this.wx(px, pz), this.wz(px, pz)) > -C.draft * 0.75) { hit = true; break; }
    if (hit) {
      this.x = ox; this.z = oz;
      if (Math.abs(this.v) > C.speed * 0.3 && this.groundT <= 0) {
        this.damage(C.hp * 0.02 * Math.abs(this.v) / C.speed, null, 'ground');
        this.groundT = 2; if (this.isPlayer) Hud.ribbon('Aground!', 'bad'); if (!G.simming) Sfx.crack(this.x, this.z);
      }
      this.v *= -0.25;
    }
    const lim = World.S / 2 - 30;
    if (Math.abs(this.x) > lim || Math.abs(this.z) > lim) { this.x = clamp(this.x, -lim, lim); this.z = clamp(this.z, -lim, lim); this.v *= 0.6; }

    // reloads and consumables
    const rr = this.reloadRate();
    for (const b of BATTERIES) if (this.rl[b] > 0) this.rl[b] = Math.max(0, this.rl[b] - dt * rr);
    if (this.raftRl > 0) this.raftRl = Math.max(0, this.raftRl - dt);
    const rp = this.repair, sp = this.spec;
    if (rp.cd > 0) rp.cd -= dt;
    if (sp.cd > 0) sp.cd -= dt;
    if (rp.t > 0) { rp.t -= dt; this.hp = Math.min(this.maxHp, this.hp + this.maxHp * REPAIR.heal * dt); this.sails = Math.min(1, this.sails + 0.02 * dt); }
    if (sp.t > 0) {
      sp.t -= dt;
      if (sp.id === 'smoke' && (sp.puff -= dt) <= 0) { sp.puff = 1.1; Combat.smokeAt(this.wx(0, -L * 0.6), this.wz(0, -L * 0.6), this); }
    }
    // fire, leaks, mending
    let burning = 0;
    for (let i = 0; i < 3; i++) if (this.fires[i] > 0) { this.fires[i] -= dt; burning++; }
    for (let i = 0; i < 2; i++) if (this.leaks[i] > 0) this.leaks[i] -= dt;
    const leaking = this.leaks.filter((l) => l > 0).length;
    if (burning) { this.damage(this.maxHp * FIRE.dps * burning * dt, this.fireBy, 'fire'); this.crew = Math.max(this.maxCrew * 0.08, this.crew - burning * 0.15 * dt); this.sails = Math.max(0.05, this.sails - 0.004 * burning * dt); }
    if (leaking && this.alive) this.damage(this.maxHp * LEAK.dps * leaking * dt, this.fireBy, 'leak');
    if (!burning) this.sails = Math.min(1, this.sails + 0.005 * dt);
    if (this.ignited > 0) {
      this.ignited -= dt;
      if (this.ignited <= 0 && this.alive) { this.hp = 0; this.die(this.lastBy, 'burned'); }
    }
    if (this.board && this.board.att) this.updateBoarding(dt);
    if (!this.alive) return;

    // waves and heel
    const hb = waveH(this.wx(0, L * 0.4), this.wz(0, L * 0.4)), hs = waveH(this.wx(0, -L * 0.4), this.wz(0, -L * 0.4));
    const hp = waveH(this.wx(B * 0.5, 0), this.wz(B * 0.5, 0)), hst = waveH(this.wx(-B * 0.5, 0), this.wz(-B * 0.5, 0));
    const ky = 1 / (1 + L / 40);
    this.y = lerp(this.y, (hb + hs + hp + hst) / 4 * (0.6 + ky), Math.min(1, dt * 4));
    this.pitch = lerp(this.pitch, (hb - hs) / (L * 0.8) * 0.8, Math.min(1, dt * 3));
    const heel = -this.rudder * clamp(this.v / C.speed, -1, 1) * 0.07 + 0.025 * Math.sin(angNorm(Match.wind.a - this.h)) * (this.tele > 0 ? 1 : 0);
    this.roll = lerp(this.roll, (hp - hst) / B * 0.5 + heel, Math.min(1, dt * 2));
    this.updateModel(dt, burning, leaking);
  }

  updateModel(dt, burning) {
    const m = this.model;
    m.root.position.set(this.x, this.y, this.z); m.root.rotation.y = this.h;
    m.tilt.rotation.set(-this.pitch, 0, this.roll);
    // sails: set or furled, shot away as sail health drops, braced to the wind
    const want = !this.alive ? 0.1 : this.tele <= 0 ? 0.14 : 0.35 + 0.1625 * this.tele;
    this.sailSet = approach(this.sailSet, want, dt * 0.5);
    const n = m.sails.length, keep = Math.ceil(n * (0.2 + 0.8 * this.sails));
    const brace = clamp(angNorm(Match.wind.a - this.h) * 0.25, -0.45, 0.45);
    this.sailOrder.forEach((si, k) => {
      const s = m.sails[si], vis = k < keep;
      s.visible = vis;
      if (vis) { s.scale.y = this.sailSet; if (s.userData.kind === 'sq') s.rotation.y = brace; s.scale.x = s.userData.kind === 'sq' ? 1 : 1 + 0.05 * Math.sin(G.t * 3 + si); }
    });
    const wrel = angNorm(Match.wind.a - this.h);
    m.flags.forEach((f, i) => { f.rotation.y = wrel + Math.PI / 2 + Math.sin(G.t * 7 + i * 2 + this.id) * 0.12; });
    if (G.simming) return;
    // wake and fire effects
    const L = this.C.len;
    this.wakeT -= dt;
    const sp = Math.abs(this.v);
    if (sp > 1.5 && this.wakeT <= 0 && this.model.root.visible) {
      this.wakeT = 0.12 * (20 / (sp + 4));
      const s = this.C.beam * 0.35;
      Fx.wake(this.wx(0, L * 0.45), this.wz(0, L * 0.45), Math.sin(this.h) * this.v * 0.4 + rnd(-1, 1), Math.cos(this.h) * this.v * 0.4, s * 0.7);
      Fx.wake(this.wx(rnd(-1, 1), -L * 0.5), this.wz(0, -L * 0.5), 0, 0, s);
    }
    if ((burning || this.ignited > 0) && this.model.root.visible) {
      for (let i = 0; i < 3; i++) if (this.fires[i] > 0 || this.ignited > 0) {
        const f = this.model.fires[i]; const k = this.ignited > 0 ? 2.2 : 1 + L / 60;
        Fx.fire(this.wx(f[0] + rnd(-1, 1), f[2]), f[1] + this.y + 0.5, this.wz(f[0], f[2] + rnd(-2, 2)), k);
      }
    }
  }

  updateSinking(dt) {
    const m = this.model;
    this.sinkT += dt;
    const k = clamp(this.sinkT / 14, 0, 1);
    m.root.position.y = this.y - this.sinkT * (0.25 + this.sinkT * 0.03) * (1 + 20 / this.C.len);
    m.tilt.rotation.set(-this.pitch - 0.18 * k, 0, this.roll + this.sinkSide * 0.55 * k);
    this.v *= 1 - dt * 0.5; this.x += Math.sin(this.h) * this.v * dt; this.z += Math.cos(this.h) * this.v * dt;
    m.root.position.x = this.x; m.root.position.z = this.z;
    if (!G.simming && m.root.visible && this.sinkT < 20) {
      if (rand() < 0.6) Fx.bubbles(this.x, this.z, this.C.len * 0.3);
      if (this.sinkT < 12 && rand() < 0.5) Fx.fire(this.x + rnd(-3, 3), 3 + m.root.position.y + this.C.fb, this.z + rnd(-3, 3), 1.5);
    }
    if (this.sinkT > 35 && !this.gone) { this.gone = true; m.root.visible = false; }
  }

  // ---------- combat ----------
  fire(ax, az) {
    if (!this.alive || Match.phase !== 'battle') return 0;
    if (this.weapon === RAFT_SLOT) return Combat.launchRafts(this, ax, az) ? 1 : 0;
    if (this.crewf < 0.05) return 0;
    const ammo = AMMO[this.ammo], range = this.range();
    let fired = 0;
    const dx = ax - this.x, dz = az - this.z, d = Math.hypot(dx, dz);
    const dd = clamp(d, 20, range), tx = this.x + dx / (d || 1) * dd, tz = this.z + dz / (d || 1) * dd;
    for (const b of BATTERIES) {
      if (this.rl[b] > 0 || !this.bears(b, tx, tz)) continue;
      const guns = this.model.guns[b]; if (!guns.length) continue;
      const sig = (dd * 0.016 + 2) * this.C.guns.disp * ammo.disp * (this.spec.id === 'lookout' && this.spec.t > 0 ? 0.82 : 1) * (1 + Match.squall * 0.25);
      const ux = (tx - this.x) / dd, uz = (tz - this.z) / dd;
      const order = guns.map((_, i) => i); if (rand() < 0.5) order.reverse();
      order.forEach((gi, k) => {
        const lat = gauss() * sig, lon = gauss() * sig * 1.7;
        Combat.queueShot(this, guns[gi], tx + ux * lon - uz * lat, tz + uz * lon + ux * lat, this.ammo, k * 0.05 + rnd(0, 0.03));
      });
      this.rl[b] = this.rlMax[b] = this.reloadTime(this.ammo);
      this.stats.shots += guns.length; fired++;
    }
    if (fired) this.lastFire = Match.time;
    return fired;
  }
  hitHull(dmg, ammoId, by, ly, lz) {
    const a = AMMO[ammoId];
    this.damage(dmg * a.hull, by, 'hull');
    this.crew = Math.max(this.maxCrew * 0.08, this.crew - dmg * a.crew * 0.045); // only boarding finishes a crew
    if (by && by.team !== this.team) by.stats.hits++;
    if (!this.alive) return;
    const sec = lz > this.C.len * 0.17 ? 0 : lz < -this.C.len * 0.17 ? 2 : 1;
    if (rand() < a.fire) this.startFire(sec, by);
    if (ly < this.C.fb * 0.4 && rand() < a.leak * 1.6) this.startLeak(lz > 0 ? 0 : 1, by);
  }
  hitSails(dmg, ammoId, by) {
    const a = AMMO[ammoId];
    const mult = ammoId === 1 && by && by.C.chainBonus ? by.C.chainBonus : 1;
    this.sails = Math.max(0.05, this.sails - dmg * a.sail * mult / (this.maxHp * 0.22));
    this.crew = Math.max(this.maxCrew * 0.08, this.crew - dmg * a.crew * 0.012);
    if (by && by.team !== this.team) { by.stats.dmg += dmg * a.sail * 0.15; this.lastBy = by; }
  }
  startFire(sec, by) {
    if (this.fires[sec] > 0 || !this.alive) return;
    this.fires[sec] = FIRE.dur; this.fireBy = by || this.fireBy;
    if (by && by.team !== this.team) by.stats.fires++;
    if (by && by.isPlayer) Hud.ribbon('Fire started', 'good');
    if (this.isPlayer) Hud.ribbon('Fire aboard!', 'bad');
  }
  startLeak(sec, by) {
    if (this.leaks[sec] > 0 || !this.alive) return;
    this.leaks[sec] = LEAK.dur; this.fireBy = by || this.fireBy;
    if (by && by.isPlayer) Hud.ribbon('Holed below the waterline', 'good');
    if (this.isPlayer) Hud.ribbon('Taking on water!', 'bad');
  }
  damage(d, by, cause) {
    if (!this.alive || d <= 0) return;
    if (G.god && this.isPlayer) return;
    d = Math.min(d, this.hp); this.hp -= d;
    if (by && by.team !== this.team) { by.stats.dmg += d; this.lastBy = by; if (cause === 'hull' || cause === 'raft') this.hitT = Match.time; }
    if (this.hp <= 0.5) this.die(by || this.lastBy, cause);
  }
  die(by, cause) {
    if (!this.alive) return;
    this.alive = false; this.hp = 0; this.sinkSide = rand() < 0.5 ? -1 : 1;
    if (this.board) this.endBoard(false);
    if (!G.simming) { Fx.explosion(this.x, this.C.fb + 1, this.z, 0.6 + this.C.len / 60); Sfx.explosion(this.x, this.z); }
    Match.onSunk(this, by, cause);
  }
  useRepair() {
    const r = this.repair; if (!this.alive || r.n <= 0 || r.cd > 0) return false;
    r.n--; r.t = REPAIR.dur; r.cd = this.C.repair.cd + REPAIR.dur;
    this.fires.fill(0); this.leaks.fill(0);
    return true;
  }
  useSpecial() {
    const s = this.spec, def = SPECIALS[s.id]; if (!this.alive || s.n <= 0 || s.cd > 0) return false;
    s.n--; s.t = def.dur; s.cd = def.cd + def.dur; s.puff = 0;
    return true;
  }
  ignite() {
    if (!this.C.ignite || this.ignited > 0 || !this.alive || Match.phase !== 'battle') return false;
    this.ignited = 30; this.fires.fill(0); this.tele = 4;
    if (!G.simming) Sfx.boom(this.x, this.z, 0.6);
    return true;
  }

  // ---------- boarding ----------
  // Distance from this ship's side to the other's side (rough capsule test).
  gap(o) {
    const lz = clamp(o.lz(this.x, this.z), -o.C.len / 2, o.C.len / 2), px = o.wx(0, lz), pz = o.wz(0, lz);
    return Math.hypot(this.x - px, this.z - pz) - o.C.beam / 2 - this.C.beam / 2;
  }
  canBoard(o) {
    if (!o || !o.alive || !this.alive || o.team === this.team || this.board || o.board || Match.phase !== 'battle') return false;
    if (this.gap(o) > 18) return false;
    const rv = Math.hypot(Math.sin(this.h) * this.v - Math.sin(o.h) * o.v, Math.cos(this.h) * this.v - Math.cos(o.h) * o.v);
    if (rv > 8) return false;
    return o.hpf < 0.4 || this.strength() > o.strength() * 1.4 || o.crewf < 0.3;
  }
  boardReason(o) {
    if (!o || !o.alive) return 'No target';
    if (this.gap(o) > 18) return 'Too far to board';
    const rv = Math.hypot(Math.sin(this.h) * this.v - Math.sin(o.h) * o.v, Math.cos(this.h) * this.v - Math.cos(o.h) * o.v);
    if (rv > 8) return 'Match her speed to board';
    if (!(o.hpf < 0.4 || this.strength() > o.strength() * 1.4 || o.crewf < 0.3)) return 'Her crew is too strong. Batter her first';
    return '';
  }
  startBoard(o) {
    if (!this.canBoard(o)) return false;
    this.board = { other: o, t: 0, tick: 0, att: true, start: this.crew };
    o.board = { other: this, t: 0, att: false, start: o.crew };
    if (!G.simming) Sfx.clash();
    Match.feed(`${this.name} is boarding ${o.name}!`, this.team);
    if (this.isPlayer) Hud.ribbon('Away boarders!', 'good');
    if (o.isPlayer) Hud.ribbon('Repel boarders!', 'bad');
    return true;
  }
  updateBoarding(dt) {
    const b = this.board, o = b.other;
    b.t += dt; b.tick -= dt;
    // hold the two hulls together
    if (o.alive) { o.v *= 1 - dt * 2; this.v *= 1 - dt * 2; }
    if (!o.alive || this.gap(o) > 30) { this.endBoard(false); return; }
    if (b.tick > 0) return;
    b.tick = 1;
    if (!G.simming && rand() < 0.7) Sfx.clash();
    const a = this.strength(), d = o.strength() * 1.15;
    this.crew = Math.max(1, this.crew - d * rnd(0.035, 0.07));
    o.crew = Math.max(1, o.crew - a * rnd(0.05, 0.09));
    if (o.crew < Math.max(6, o.maxCrew * 0.1)) { this.capture(o); return; }
    if (this.crew < b.start * 0.55 || b.t > 22) {
      if (this.isPlayer) Hud.ribbon('Boarders driven off', 'bad');
      if (o.isPlayer) Hud.ribbon('Boarders repelled!', 'good');
      Match.feed(`${o.name} drove off ${this.name}'s boarders`, o.team);
      this.endBoard(false);
    }
  }
  endBoard() {
    const o = this.board && this.board.other;
    if (o && o.board && o.board.other === this) o.board = null;
    this.board = null;
  }
  capture(o) {
    const old = o.team; this.endBoard(true);
    const moved = Math.min(this.crew * 0.3, o.maxCrew * 0.45);
    this.crew -= moved; o.crew += moved; o.fires.fill(0); o.ignited = 0;
    o.team = this.team; o.lastBy = null; o.seen = [false, false];
    o.model.flags[0].material.map = flagTex(this.team); o.model.flags[0].material.needsUpdate = true;
    this.stats.captures++;
    if (!G.simming) Sfx.cheer();
    Match.onCaptured(o, this, old);
  }
}
