// ---- 11_ai: capital ship captains ----
// Close to a preferred range, then turn to present a broadside and keep it there. Reinforce the shield
// facing the threat, fire whatever bears, launch the squadrons and send bombers at the biggest ship near.
const _av = new V3(), _aw = new V3(), _ax = new V3(), _ay = new V3();
class ShipAI {
  constructor(ship, o) {
    o = o || {};
    this.s = ship; this.target = null; this.retarget = 0; this.side = rand() < 0.5 ? 'port' : 'stbd'; this.sideT = 0;
    this.launchT = o.launchDelay != null ? o.launchDelay : rnd(3, 9); this.squadT = 0; this.shieldT = rnd(0, 3);
    this.goto = o.goto || null; this.passive = !!o.passive; this.cruise = o.throttle != null ? o.throttle : null; this.cruiseT = o.throttle != null ? 25 : 0;
    const C = ship.C;
    this.pref = !C.side ? 2600 : ship.cls === 'carrier' ? 2400 : 900 + C.len * 1.3;
    this.err = 0.009 + (ship.team ? 0.003 : 0.0015);
  }
  pickTarget() {
    const s = this.s; let best = null, bs = 0;
    for (const t of G.ships) {
      if (!t.alive || !t.arrived || t.team === s.team || t.jumpAnim != null) continue;
      if (t.noAllyFire && s.team === 0) continue;
      const d = t.pos.distanceTo(s.pos);
      let score = (t.C.value + (t.isPlayer ? 1.5 : 0) + (t.tag === 'protect' || t.tag === 'convoy' ? 3 : 0)) / (d + 900);
      if (t === this.target) score *= 1.4;
      // Spread fire: a ship that half the fleet is already shooting is a worse pick.
      let n = 0; for (const o of G.ships) if (o !== s && o.ai && o.alive && o.ai.target === t) n++;
      score /= 1 + 0.45 * n;
      if (score > bs) { bs = score; best = t; }
    }
    this.target = best;
  }
  update(dt) {
    const s = this.s;
    if (!s.alive || s.jumpAnim != null) return;
    if ((this.retarget -= dt) <= 0) { this.retarget = 3 + rand() * 2; this.pickTarget(); }
    const t = this.target && this.target.alive ? this.target : null;
    if (!this.passive) this.steer(dt, t); else { s.thr = 0; s.yawCmd = 0; s.pitchCmd = 0; }
    if (s.disabled) { s.thr = 0; s.yawCmd *= 0.3; }
    this.shields(dt, t);
    this.fire(t);
    this.squads(dt, t);
  }
  steer(dt, t) {
    const s = this.s, C = s.C;
    if (!C.speed) return;
    const want = _av.set(0, 0, 0);
    let thr = 0.8;
    if (this.goto) {
      want.copy(this.goto).sub(s.pos); const d = want.length(); want.divideScalar(d || 1); thr = this.cruise != null ? this.cruise : 0.8;
      if (d < 200) this.goto = null;
    } else if (t && !C.side) {
      // Unarmed ships keep their distance.
      want.copy(s.pos).sub(t.pos).normalize(); thr = t.pos.distanceTo(s.pos) < 3500 ? 0.8 : 0.3;
    } else if (t) {
      _aw.copy(t.pos).sub(s.pos); const d = _aw.length(); _aw.divideScalar(d);
      if (d > this.pref * 1.4) { want.copy(_aw); thr = 1; _ax.crossVectors(UP, _aw).multiplyScalar(this.side === 'port' ? 0.35 : -0.35); want.add(_ax); }
      else {
        // Broadside: put the target on the chosen beam.
        if (this.side === 'port') want.crossVectors(_aw, UP); else want.crossVectors(UP, _aw);
        if (want.lengthSq() < 0.01) want.copy(s.fwd);
        want.normalize();
        if (d < this.pref * 0.6) want.addScaledVector(_aw, -0.6);
        else if (d > this.pref * 1.1) want.addScaledVector(_aw, 0.4);
        want.y += clamp((t.pos.y - s.pos.y) / 1200, -0.35, 0.35);
        thr = 0.65;
        // Swap sides if this battery is out or its shields are gone.
        if ((this.sideT -= dt) <= 0 && (!s.ok(this.side) || s.shield[this.side] < s.shieldBase * 0.1)) {
          const other = this.side === 'port' ? 'stbd' : 'port';
          if (s.ok(other) && s.shield[other] > s.shield[this.side]) { this.side = other; this.sideT = 25; }
        }
      }
    } else want.copy(s.fwd);
    // Opening cruise: hold course and speed for a while so the lines meet like they do in the films.
    if (this.cruiseT > 0) { this.cruiseT -= dt; want.copy(s.fwd); thr = this.cruise; if (t && t.pos.distanceTo(s.pos) < this.pref * 0.9) this.cruiseT = 0; }
    // Keep clear of other hulls.
    for (const o of G.ships) {
      if (o === s || !o.alive || !o.arrived) continue;
      _ax.copy(o.pos).sub(s.pos); const d = _ax.length(), min = (o.radius + s.radius) * 0.9 + 120;
      if (d < min) { const k = (1 - d / min) * 3; want.addScaledVector(_ax.divideScalar(d || 1), -k); if (_ax.dot(s.fwd) > 0.3) thr = Math.min(thr, 0.35); }
    }
    const r = s.pos.length();
    if (r > ARENA_R * 0.82) want.addScaledVector(s.pos, -2 * (r / ARENA_R - 0.8) / r * 4);
    if (want.lengthSq() < 1e-6) want.copy(s.fwd);
    want.normalize();
    const dy = angNorm(yawOf(want) - s.yaw), pt = clamp(pitchOf(want), -0.55, 0.55);
    s.yawCmd = clamp(dy * 2.2, -1, 1); s.pitchCmd = clamp((pt - s.pitch) * 2.5, -1, 1);
    s.thr = thr;
  }
  shields(dt, t) {
    const s = this.s;
    if ((this.shieldT -= dt) > 0) return;
    this.shieldT = 3 + rand() * 2;
    let f = null;
    if (s.underFire > 0.5 && s.lastHitFacing) f = s.lastHitFacing;
    else if (t) { _aw.copy(t.pos).sub(s.pos); f = s.facingOf(s.dirToLocal(_aw, _ax).multiplyScalar(10)); }
    if (f !== s.reinforce) s.setReinforce(f);
  }
  fire(t) {
    const s = this.s, spread = this.err * (s.ok('bridge') ? 1 : 3.5);
    for (const side in s.bat) {
      const b = s.bat[side]; if (b.t > 0) continue;
      // The main target if it bears, else the closest enemy that does.
      let tgt = null;
      if (t && this.aimAt(t, _ay) && s.bears(side, _ay)) tgt = t;
      else {
        let bd = BOLT_RANGE * BOLT_RANGE;
        for (const o of G.ships) {
          if (!o.alive || !o.arrived || o.team === s.team || o.jumpAnim != null || (o.noAllyFire && s.team === 0)) continue;
          const d = o.pos.distanceToSquared(s.pos); if (d >= bd) continue;
          this.aimAt(o, _aw); if (s.bears(side, _aw)) { bd = d; tgt = o; _ay.copy(_aw); }
        }
      }
      if (tgt) s.fireBattery(side, _ay, spread, tgt);
    }
    if (t && s.torps && s.torpCd <= 0 && t.pos.distanceTo(s.pos) < 2600) s.fireTorps(t);
  }
  // Lead the target's centre or one of its systems, from the ship's own position.
  aimAt(t, out) {
    const lp = (this.aimSub && t === this.target && t.subs[this.aimSub] && !t.subs[this.aimSub].down) ? t.subs[this.aimSub].p : t.model.colliders[(this.s.id + (R.t * 0.3 | 0)) % t.model.colliders.length].c;
    t.toWorld(lp, _ax);
    leadPoint(this.s.pos, _ax, t.vel, BOLT_SPEED, out);
    return true;
  }
  squads(dt, t) {
    const s = this.s;
    if (!s.squads.length || !s.ok('bridge')) return;
    if ((this.launchT -= dt) > 0) return;
    if ((this.squadT -= dt) > 0) return;
    this.squadT = 8 + rand() * 4;
    // Bombers go for the most valuable ship within reach; interceptors split between escort and sweep.
    let bt = null, bs = 0;
    for (const o of G.ships) {
      if (!o.alive || !o.arrived || o.team === s.team || o.jumpAnim != null || (o.noAllyFire && s.team === 0)) continue;
      const d = o.pos.distanceTo(s.pos); if (d > 5500) continue;
      const sc = (o.C.value + (o.isPlayer ? 2 : 0) + (o.tag === 'protect' || o.tag === 'convoy' ? 4 : 0)) / (d + 1500);
      if (sc > bs) { bs = sc; bt = o; }
    }
    if (!bt && !t) return;
    s.squads.forEach((q, i) => {
      if (q.type === 'shuttle') return;
      if (q.type === 'bmb') { if (bt && (q.order.kind !== 'attack' || !q.order.target || !q.order.target.alive)) q.command('attack', bt); else if (!q.out.length && q.ready) q.launch(); }
      else if (i % 2 === 0) { if (q.order.kind !== 'escort' || !q.out.length) q.command('escort', s); }
      else if (t && (q.order.kind !== 'attack' || !q.order.target || !q.order.target.alive)) q.command('attack', t);
      else if (!q.out.length && q.ready) q.launch();
    });
  }
}
