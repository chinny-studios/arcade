// ---- 09_craft: fighters, bombers and shuttles, their squadrons and dogfighting AI ----
// A Squadron lives in a capital ship's hangar. Its craft launch, follow the squadron's order
// (escort a ship, attack a ship, or recall), come home to rearm, and are rebuilt when lost.
const _cv = new V3(), _cw = new V3(), _cx = new V3(), _cy = new V3(), _cm = new M4(), _cq = new Q4();
let craftSeq = 0;
class Craft {
  constructor(type, team, squad) {
    const T = this.T = CRAFT[type];
    this.id = ++craftSeq; this.type = type; this.team = team; this.squad = squad;
    this.hp = T.hp; this.alive = true; this.torps = T.torps;
    this.pos = new V3(); this.fwd = new V3(0, 0, 1); this.up = new V3(0, 1, 0); this.vel = new V3();
    this.speed = T.speed * 0.6; this.gunCd = rand() * 0.3; this.target = null; this.mode = 'launch'; this.timer = 1.4; this.retarget = 0;
    this.jink = new V3(); this.jinkT = rnd(1, 3); this.want = new V3(0, 0, 1); this.wantSpeed = T.speed;
    this.stats = { dmg: 0, kills: 0 };
  }
  get isTorp() { return false; }
  // Turn toward this.want at the craft's turn rate, bank into the turn, and move.
  fly(dt) {
    const T = this.T, w = this.want, f = this.fwd;
    const ang = f.angleTo(w);
    if (ang > 1e-4) {
      const step = Math.min(ang, T.turn * dt);
      _cx.crossVectors(f, w); if (_cx.lengthSq() < 1e-8) _cx.set(0, 1, 0); _cx.normalize();
      _cq.setFromAxisAngle(_cx, step); _cw.copy(f); f.applyQuaternion(_cq).normalize();
      // Bank: lean the up vector toward the inside of the turn.
      _cv.subVectors(f, _cw).multiplyScalar(1 / Math.max(dt, 1e-3) * 1.4);
      _cy.copy(UP).multiplyScalar(0.6).add(_cv);
    } else _cy.copy(UP).multiplyScalar(0.6).addScaledVector(this.up, 0.6);
    _cy.addScaledVector(f, -_cy.dot(f));
    if (_cy.lengthSq() > 1e-6) this.up.lerp(_cy.normalize(), 1 - Math.exp(-dt * 5)).normalize();
    this.speed = approach(this.speed, this.wantSpeed, 90 * dt);
    this.vel.copy(f).multiplyScalar(this.speed);
    this.pos.addScaledVector(this.vel, dt);
  }
  steerTo(p, speedK) { this.want.copy(p).sub(this.pos).normalize(); this.wantSpeed = this.T.speed * (speedK == null ? 1 : speedK); }
  homeShip() { return this.squad ? this.squad.ship : null; }
  update(dt) {
    const T = this.T, sq = this.squad, home = this.homeShip();
    this.gunCd -= dt; this.timer -= dt; this.retarget -= dt; this.age = (this.age || 0) + dt;
    const order = sq ? sq.order : { kind: 'escort', target: null };
    switch (this.mode) {
      case 'launch':
        this.wantSpeed = T.speed; if (this.timer <= 0) this.mode = 'order';
        break;
      case 'rtb': {
        if (!home || !home.alive || !home.ok('hangar')) { this.mode = 'order'; break; }
        const hp = home.toWorld(home.model.hangar.p, _cw);
        const d = hp.distanceTo(this.pos);
        this.steerTo(hp, d < 400 ? 0.5 : 1);
        if (d < 70) { sq.dock(this); return; }
        break;
      }
      case 'break':
        this.wantSpeed = T.speed; if (this.timer <= 0) this.mode = 'order';
        break;
      case 'dogfight': {
        const t = this.target;
        if (!t || !t.alive || t.pos.distanceTo(this.pos) > 2600 || this.timer <= 0) { this.mode = 'order'; this.target = null; break; }
        leadPoint(this.pos, t.pos, t.vel, T.gun ? T.gun.speed : 1400, _cw);
        _cw.addScaledVector(this.jink, 40);
        const d = this.pos.distanceTo(t.pos);
        this.steerTo(_cw, d < 200 ? 0.75 : 1);
        if (d < 70) { this.mode = 'break'; this.timer = 1.2; this.want.addScaledVector(this.up, 0.8).normalize(); }
        this.tryShoot(t, _cw, d);
        break;
      }
      case 'strafe': {
        const t = this.target;
        if (!t || !t.alive) { this.mode = 'order'; break; }
        const aim = this.aimPoint || t.model.centre, wp = t.toWorld(aim, _cw);
        const d = wp.distanceTo(this.pos);
        this.steerTo(wp, 1);
        if (d < Math.max(260, t.radius * 0.6) || t.inside(_cx.copy(this.fwd).multiplyScalar(this.speed * 1.2).add(this.pos), 40)) { this.mode = 'break'; this.timer = 3; this.want.copy(this.up).multiplyScalar(0.9).add(this.fwd).normalize(); break; }
        if (d < 850) this.tryShootShip(t, aim, wp, d);
        break;
      }
      case 'bomb': {
        const t = this.target;
        if (!t || !t.alive) { this.mode = 'order'; break; }
        const aim = this.aimPoint || t.model.centre, wp = t.toWorld(aim, _cw), d = wp.distanceTo(this.pos);
        this.steerTo(wp, 1);
        _cv.copy(wp).sub(this.pos).normalize();
        if (d < TORP.range && this.fwd.dot(_cv) > 0.9 && this.torps > 0 && this.gunCd <= 0) {
          Combat.torpedo(this, this.pos.clone().addScaledVector(this.fwd, 12), t, aim); this.torps--; this.gunCd = 0.5;
          if (this.torps <= 0) { this.mode = 'break'; this.timer = 4.5; this.want.copy(this.fwd).addScaledVector(this.up, 1.2).normalize(); }
        }
        if (d < 300) { this.mode = 'break'; this.timer = 3; this.want.copy(this.up).add(this.fwd).normalize(); }
        break;
      }
      case 'orbit': {
        const E = this.guard;
        if (!E || !E.alive || this.timer <= 0) { this.mode = 'order'; break; }
        const a = R.t * 0.12 + this.id * 1.7, r = E.radius + 260 + (this.id % 3) * 80;
        _cw.set(Math.sin(a) * r, Math.sin(a * 0.7 + this.id) * r * 0.35, Math.cos(a) * r).add(E.pos);
        this.steerTo(_cw, 0.65);
        if (this.retarget <= 0) { this.retarget = 0.7; const foe = Craft.nearestFoe(this, E.pos, 1700); if (foe) { this.target = foe; this.mode = 'dogfight'; this.timer = 14; } }
        break;
      }
      case 'board': case 'docked': Mission.shuttle(this, dt); break;
      default: this.think(order);
    }
    // Random jinking so dogfights don't fly on rails.
    if ((this.jinkT -= dt) <= 0) { this.jinkT = rnd(1.2, 3.5); this.jink.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)); }
    this.avoid();
    this.fly(dt);
  }
  // Pick a new mode from the squadron's order.
  think(order) {
    const home = this.homeShip();
    if (this.type === 'shuttle') return;
    if (order.kind === 'recall' || (this.type === 'bmb' && this.torps <= 0)) {
      if (home && home.alive && home.ok('hangar')) { this.mode = 'rtb'; return; }
    }
    const t = order.target;
    if (order.kind === 'attack' && t && t.alive) {
      if (this.type === 'bmb' && this.torps > 0) { this.mode = 'bomb'; this.target = t; this.aimPoint = this.pickAim(t, order.sub); return; }
      const foe = Craft.nearestFoe(this, t.pos, t.radius + 900) || Craft.nearestFoe(this, this.pos, 700);
      if (foe) { this.mode = 'dogfight'; this.target = foe; this.timer = 12; return; }
      this.mode = 'strafe'; this.target = t; this.aimPoint = this.pickAim(t, order.sub); return;
    }
    // Escort: guard the order's ship (or home), fighting whatever comes near it.
    const E = (t && t.alive && t.team === this.team) ? t : (home && home.alive ? home : Craft.nearestAllyShip(this));
    const foe = Craft.nearestFoe(this, E ? E.pos : this.pos, 1800, true);
    if (foe) { this.mode = 'dogfight'; this.target = foe; this.timer = 14; return; }
    if (E) { this.mode = 'orbit'; this.guard = E; this.timer = 6; return; }
    this.mode = 'break'; this.timer = 2;
  }
  pickAim(t, sub) {
    if (sub && t.subs[sub] && !t.subs[sub].down) return t.subs[sub].p;
    const live = Object.keys(t.subs).filter((k) => !t.subs[k].down && k !== 'bridge');
    return live.length && rand() < 0.6 ? t.subs[pick(live)].p : t.model.centre;
  }
  tryShoot(t, aim, d) {
    const g = this.T.gun; if (!g || this.gunCd > 0 || d > g.range) return;
    _cv.copy(aim).sub(this.pos).normalize();
    const err = this.fwd.angleTo(_cv); if (err > 0.12) return;
    this.gunCd = g.rate;
    const p = 0.34 * (1 - err / 0.12) * (1 - 0.55 * d / g.range) * (t.type === 'bmb' || t.type === 'shuttle' ? 1.3 : 1) * (t.mode === 'docked' ? 0 : 1);
    Combat.craftShot(this, t, rand() < p, g, aim);
  }
  tryShootShip(t, aimL, wp, d) {
    const g = this.T.gun; if (!g || this.gunCd > 0) return;
    _cv.copy(wp).sub(this.pos).normalize(); if (this.fwd.dot(_cv) < 0.97) return;
    this.gunCd = g.rate;
    Combat.craftShotShip(this, t, aimL, wp, rand() < 0.75, g);
  }
  // Swerve away from capital hulls ahead, and stay inside the battle area.
  avoid() {
    _cx.copy(this.fwd).multiplyScalar(Math.max(150, this.speed * 1.4)).add(this.pos);
    for (const s of G.ships) {
      if (!s.alive || !s.arrived) continue;
      if (s.pos.distanceToSquared(this.pos) > (s.radius + 400) ** 2) continue;
      if ((this.mode === 'rtb' || this.mode === 'launch' || this.age < 3) && s === this.homeShip()) continue;
      if ((this.mode === 'board' || this.mode === 'docked') && s === this.target) continue;
      if (s.inside(_cx, 40)) { s.centre(_cv); _cv.subVectors(this.pos, _cv).normalize(); this.want.addScaledVector(_cv, 2).normalize(); }
      if (s.inside(this.pos, 5) && this.mode !== 'rtb') this.crash(s);
    }
    const r = this.pos.length();
    if (r > ARENA_R + 400) this.want.addScaledVector(this.pos, -1.5 / r).normalize();
  }
  crash(s) { Combat.craftDamage(this, 1e4, null); }
  die(by) {
    if (!this.alive) return;
    this.alive = false;
    if (by && by.stats && by.team !== this.team) by.stats.kills++;
    if (by && by.squad && by.squad.ship && by.squad.ship.stats) by.squad.ship.stats.craftKills = (by.squad.ship.stats.craftKills || 0) + 1;
    Fx.explode(this.pos, this.type === 'bmb' ? 12 : this.type === 'shuttle' ? 20 : 8, this.vel);
    Sfx.small(this.pos);
    if (this.squad) this.squad.lost(this);
    Mission.event('craft', this, null, by);
  }
}
// Helpers that search all craft. Lists are rebuilt once per frame in Craft.updateAll.
Craft.byTeam = [[], []];
Craft.nearestFoe = function (me, around, r, preferBombers) {
  let best = null, bd = r * r;
  for (const c of Craft.byTeam[1 - me.team]) {
    if (!c.alive || c.mode === 'docked') continue;
    let d = c.pos.distanceToSquared(around);
    if (preferBombers && (c.type === 'bmb' || c.type === 'shuttle')) d *= 0.4;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
};
Craft.nearestAllyShip = function (me) {
  let best = null, bd = 1e18;
  for (const s of G.ships) if (s.alive && s.arrived && s.team === me.team) { const d = s.pos.distanceToSquared(me.pos); if (d < bd) { bd = d; best = s; } }
  return best;
};
Craft.updateAll = function (dt) {
  Craft.byTeam[0].length = 0; Craft.byTeam[1].length = 0;
  for (const c of G.craft) if (c.alive) Craft.byTeam[c.team].push(c);
  for (const c of G.craft) if (c.alive) c.update(dt);
  G.craft = G.craft.filter((c) => c.alive);
};
Craft.init = function () {
  Craft.meshes = {};
  for (const team of [0, 1]) for (const type of ['int', 'bmb', 'shuttle']) {
    if (type === 'shuttle' && team === 1) continue;
    const m = new THREE.InstancedMesh(Models.craft(type, team), Models.craftMat, 160);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false;
    R.scene.add(m); Craft.meshes[type + team] = m;
  }
};
Craft.draw = function (dt) {
  for (const k in Craft.meshes) Craft.meshes[k].count = 0;
  for (const c of G.craft) {
    if (!c.alive) continue;
    const m = Craft.meshes[c.type + c.team]; if (!m || m.count >= 160) continue;
    _cx.crossVectors(c.up, c.fwd).normalize(); _cy.crossVectors(c.fwd, _cx);
    _cm.makeBasis(_cx, _cy, c.fwd); _cm.setPosition(c.pos);
    m.setMatrixAt(m.count++, _cm);
    const P = PALETTE[c.team], back = _cv.copy(c.fwd).multiplyScalar(-c.T.len * 0.7).add(c.pos);
    Fx.glow(back, c.T.len * (c.type === 'bmb' ? 1.6 : 1.3), P.engine[0], P.engine[1], P.engine[2], 0.9);
    // Short engine trails, so the dogfights read as streaks.
    if (dt > 0 && !G.simming) Fx.spark(back, null, 0.5, c.T.len * 0.55, c.T.len * 0.15, P.engine[0] * 0.5, P.engine[1] * 0.5, P.engine[2] * 0.5, 0.55);
  }
  for (const k in Craft.meshes) Craft.meshes[k].instanceMatrix.needsUpdate = true;
};

class Squadron {
  constructor(ship, type, idx, name) {
    this.ship = ship; this.type = type; this.idx = idx; this.size = CRAFT[type].size;
    this.ready = this.size; this.out = []; this.building = 0; this.buildT = 0;
    this.order = { kind: 'escort', target: ship }; this.launchQ = 0; this.launchT = 0; this.rearmT = 0;
    this.name = name || SQUAD_NAMES[ship.team][idx % SQUAD_NAMES[ship.team].length];
    this.lostCount = 0;
  }
  get total() { return this.ready + this.out.length; }
  get status() {
    if (!this.ship.ok('hangar') && !this.out.length) return 'Hangar down';
    if (this.out.length) {
      if (this.order.kind === 'recall') return 'Returning';
      if (this.order.kind === 'attack') return 'Attack · ' + (this.order.target ? this.order.target.name : '');
      return this.order.target && this.order.target !== this.ship ? 'Escort · ' + this.order.target.name : 'Escort';
    }
    if (this.ready < this.size) return 'Rebuilding';
    return 'Docked';
  }
  launch() {
    if (!this.ship.alive || !this.ship.ok('hangar') || !this.ship.model.hangar) return false;
    if (this.ready <= 0) return false;
    this.launchQ = this.ready; return true;
  }
  command(kind, target, sub) {
    this.order = { kind, target: target || this.ship, sub: sub || null };
    if (kind === 'recall') { this.launchQ = 0; for (const c of this.out) if (c.mode !== 'rtb') c.mode = 'order'; return; }
    for (const c of this.out) if (c.mode !== 'launch') c.mode = 'order';
    if (this.ready > 0) this.launch();
  }
  dock(c) {
    c.alive = false; const i = this.out.indexOf(c); if (i >= 0) this.out.splice(i, 1);
    this.ready++; this.rearmT = 7;
  }
  lost(c) { const i = this.out.indexOf(c); if (i >= 0) this.out.splice(i, 1); this.lostCount++; }
  orphan() {
    // Home ship destroyed: craft in flight fight on, escorting the nearest friendly ship.
    this.ready = 0; this.launchQ = 0; this.order = { kind: 'escort', target: null };
    for (const c of this.out) { c.mode = 'order'; c.squad = this; }
  }
  update(dt) {
    const s = this.ship;
    if (!s.alive) return;
    if (this.order.target && !this.order.target.alive) this.order = { kind: 'escort', target: s };
    const hangar = s.ok('hangar');
    if (this.launchQ > 0 && hangar && this.ready > 0) {
      if ((this.launchT -= dt) <= 0 && Craft.byTeam[s.team].length < CRAFT_CAP) {
        this.launchT = 0.45; this.launchQ--; this.ready--;
        const c = new Craft(this.type, s.team, this), h = s.model.hangar;
        s.toWorld(h.p, c.pos); c.fwd.copy(h.dir).applyQuaternion(s.root.quaternion).normalize();
        c.want.copy(c.fwd); c.speed = s.speed + 60; c.timer = 1.2 + rand() * 0.4;
        this.out.push(c); G.craft.push(c); Craft.byTeam[s.team].push(c);
        if (!G.simming && s.isPlayer) Sfx.launch(c.pos);
      }
    }
    // Rearmed craft go back out on the same order (bombers cycling torpedo runs).
    if (this.launchQ <= 0 && this.ready > 0 && this.order.kind !== 'recall' && (this.out.length || this.order.kind === 'attack') && hangar) {
      if ((this.rearmT -= dt) <= 0) this.launch();
    }
    // Replace losses.
    if (hangar && this.total < this.size) {
      if ((this.buildT += dt) >= REBUILD_TIME) { this.buildT = 0; this.ready++; }
    } else this.buildT = 0;
  }
}
