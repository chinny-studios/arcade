// ---- 10_combat: bolts, torpedoes, flak and how hits are resolved ----
// Capital-ship bolts are real projectiles tested against hull boxes every frame. Small-craft shots and flak
// are decided when fired (hit or miss) and their damage lands when the visible bolt arrives.
const BOLT_COL = [new THREE.Color(0.5, 0.8, 1.6), new THREE.Color(1.6, 0.55, 0.25)];
const CRAFT_COL = [new THREE.Color(0.55, 1.0, 1.4), new THREE.Color(1.5, 0.35, 0.3)];
const FLAK_COL = new THREE.Color(1.4, 1.1, 0.55);
const _kp = new V3(), _kd = new V3(), _kl = new V3(), _kw = new V3();
const Combat = { bolts: [], torps: [] };
Combat.clear = function () { Combat.bolts.length = 0; Combat.torps.length = 0; };
Combat.bolt = function (o, d, owner, dmg) {
  Combat.bolts.push({ kind: 'cap', p: o.clone(), d: d.clone(), speed: BOLT_SPEED, life: BOLT_RANGE / BOLT_SPEED, dmg, owner, team: owner.team, len: 60, w: 2.4, col: BOLT_COL[owner.team] });
  if (!G.simming) { Fx.flash(o, 12, BOLT_COL[owner.team].r * 0.5, BOLT_COL[owner.team].g * 0.5, BOLT_COL[owner.team].b * 0.5); Sfx.battery(o, owner.isPlayer); }
};
// A pre-resolved shot: flies from o toward aim; if hit, onHit runs when it arrives.
function shot(kind, o, aim, speed, hit, col, len, w, onHit) {
  const d = _kd.copy(aim).sub(o), dist = d.length(); d.divideScalar(dist || 1);
  if (!hit) { d.x += gauss() * 0.025; d.y += gauss() * 0.025; d.z += gauss() * 0.025; d.normalize(); }
  const life = hit ? dist / speed : Math.min(1.2, (dist + 300) / speed);
  Combat.bolts.push({ kind, p: o.clone(), d: d.clone(), speed, life, len, w, col, onHit: hit ? onHit : null, end: !hit && kind === 'flak' });
}
Combat.craftShot = function (c, t, hit, g, aim) {
  const o = _kp.copy(c.fwd).multiplyScalar(8).add(c.pos);
  shot('craft', o, aim, g.speed, hit, CRAFT_COL[c.team], 14, 0.55, () => { if (t.alive) { Combat.craftDamage(t, g.dmg, c); if (!G.simming) Fx.spark(t.pos, t.vel, 0.2, 6, 10, 1, 0.8, 0.5, 1); } });
  if (!G.simming) Sfx.blaster(c.pos, c.team);
};
Combat.craftShotShip = function (c, s, aimL, wp, hit, g) {
  const o = _kp.copy(c.fwd).multiplyScalar(8).add(c.pos), lp = aimL.clone();
  lp.x += rnd(-1, 1) * 8; lp.y += rnd(-1, 1) * 8; lp.z += rnd(-1, 1) * 8;
  const at = s.toWorld(lp, _kw);
  shot('craft', o, at, g.speed, hit, CRAFT_COL[c.team], 14, 0.55, () => {
    if (!s.alive) return;
    const res = s.damage(g.capDmg, lp, c, 'gun');
    if (!G.simming && res) Fx.impact(s.toWorld(lp, _kw), null, res === 'shield', BOLT_COL[s.team], 0.35);
  });
  if (!G.simming) Sfx.blaster(c.pos, c.team);
};
Combat.flak = function (s, t, hit, d) {
  if (G.simming) { if (hit) Combat.flakHit(t, s); return; }
  const o = s.randomPoint(_kp);
  const aim = _kw.copy(t.pos).addScaledVector(t.vel, d / 1400);
  if (!hit) { aim.x += rnd(-1, 1) * 40; aim.y += rnd(-1, 1) * 40; aim.z += rnd(-1, 1) * 40; }
  shot('flak', o, aim, 1400, hit || rand() < 0.5, FLAK_COL, 9, 0.7, () => { if (hit) Combat.flakHit(t, s); Fx.spark(aim, null, 0.3, 10, 22, 1, 0.75, 0.35, 0.9); });
  Sfx.flak(o);
};
Combat.flakHit = function (t, s) { if (!t.alive) return; if (t.isTorp) { t.hp -= 14; if (t.hp <= 0) Combat.killTorp(t, true); } else Combat.craftDamage(t, 14, s); };
Combat.craftDamage = function (c, dmg, by) {
  if (!c.alive || c.mode === 'docked') return;
  if (G.god && c.squad && c.squad.ship && c.squad.ship.isPlayer && c.type === 'shuttle') dmg *= 0.1;
  c.hp -= dmg; if (by && by.stats) by.stats.dmg += dmg;
  if (c.hp <= 0) c.die(by);
};
Combat.torpedo = function (owner, p, target, aimL) {
  const fwd = owner.fwd.clone();
  Combat.torps.push({ isTorp: true, alive: true, pos: p.clone(), vel: fwd.multiplyScalar(TORP.speed * 0.6 + (owner.speed || 0)), target, aimL: (aimL || target.model.centre).clone(),
    hp: TORP.hp, life: Math.max(TORP.life, p.distanceTo(target.pos) / TORP.speed + 3), team: owner.team, owner: owner.squad ? owner.squad.ship || owner : owner, from: owner });
  if (!G.simming) Sfx.torp(p);
};
Combat.killTorp = function (t, shotDown) {
  t.alive = false;
  if (shotDown && !G.simming) { Fx.explode(t.pos, 7, t.vel); Sfx.small(t.pos); }
};
Combat.update = function (dt) {
  const B = Combat.bolts;
  for (let i = B.length - 1; i >= 0; i--) {
    const b = B[i], step = Math.min(b.life, dt) * b.speed;
    if (b.kind === 'cap') {
      // Segment test against every hostile ship.
      let best = -1, bs = null;
      for (const s of G.ships) {
        if (s === b.owner || s.team === b.team || !s.alive || !s.arrived) continue;
        const t = s.raycast(b.p, b.d, step, _kl);
        if (t >= 0 && (best < 0 || t < best)) { best = t; bs = s; _kp.copy(_kl); }
      }
      if (bs) {
        const lp = _kp.clone();
        const res = bs.damage(b.dmg, lp, b.owner, 'bolt');
        if (b.owner && b.owner.stats) b.owner.stats.hits++;
        const wp = bs.toWorld(lp, _kw);
        if (!G.simming) { Fx.impact(wp, _kd.copy(b.d).negate(), res === 'shield', BOLT_COL[bs.team], 1.4); Sfx.hit(wp, res === 'shield', true); }
        Mission.event('hit', bs, res, b.owner);
        B[i] = B[B.length - 1]; B.pop(); continue;
      }
    }
    b.p.addScaledVector(b.d, step); b.life -= dt;
    if (b.life <= 0) {
      if (b.onHit) b.onHit(); else if (b.end && !G.simming) Fx.spark(b.p, null, 0.3, 10, 22, 1, 0.75, 0.35, 0.8);
      B[i] = B[B.length - 1]; B.pop();
    }
  }
  const T = Combat.torps;
  for (let i = T.length - 1; i >= 0; i--) {
    const t = T[i];
    if (!t.alive) { T.splice(i, 1); continue; }
    t.life -= dt;
    if (t.life <= 0 || !t.target.alive) { Combat.killTorp(t, true); T.splice(i, 1); continue; }
    const aim = t.target.toWorld(t.aimL, _kw);
    _kd.copy(aim).sub(t.pos).normalize();
    const v = t.vel, sp = Math.min(TORP.speed, v.length() + 220 * dt);
    _kp.copy(v).normalize();
    const ang = _kp.angleTo(_kd), k = ang > 1e-4 ? Math.min(1, TORP.turn * dt / ang) : 1;
    _kp.lerp(_kd, k).normalize(); v.copy(_kp).multiplyScalar(sp);
    t.pos.addScaledVector(v, dt);
    if (!G.simming) {
      Fx.spark(t.pos, null, 0.5, 5, 2, t.team ? 1 : 0.6, t.team ? 0.4 : 0.8, t.team ? 0.2 : 1, 0.8);
    }
    if (t.pos.distanceToSquared(aim) < 45 * 45 || t.target.inside(t.pos, 6)) {
      const lp = t.target.toLocal(t.pos, new V3());
      const res = t.target.damage(TORP.dmg, lp, t.owner, 'torp');
      if (!G.simming) { Fx.explode(t.pos, 34, t.target.vel); if (res !== 'hull') Fx.impact(t.pos, null, true, BOLT_COL[t.target.team], 3); Sfx.explosion(t.pos, 1.3); }
      Mission.event('torp', t.target, res, t.owner);
      t.alive = false; T.splice(i, 1);
    }
  }
};
Combat.draw = function () {
  for (const b of Combat.bolts) {
    Fx.bolt(b.p, b.d, b.len, b.w, b.col);
    if (b.kind === 'cap') Fx.glow(b.p, 14, b.col.r * 0.45, b.col.g * 0.45, b.col.b * 0.45, 0.9);
  }
  for (const t of Combat.torps) Fx.glow(t.pos, 22, t.team ? 1 : 0.7, t.team ? 0.45 : 0.85, t.team ? 0.3 : 1, 1);
};
