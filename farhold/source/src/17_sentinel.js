// Farhold — Sentinels: patrol drones that police mining and hunting, escalating wanted levels, drones and quads

const SENT = { list: [], patrolT: 5, pl: null };
const WANTED = {
  level: 0, wave: 0, lostT: 0, sus: 0,
  clear() { this.level = 0; this.sus = 0; for (const s of SENT.list) if (s.state === 'hostile') { s.state = 'leave'; s.t = 6; } },
  raise(to, why) {
    if (this.level >= to) return;
    const was = this.level;
    this.level = clamp(to, 0, 5); this.lostT = 0;
    HUD.banner('Wanted · level ' + this.level, 'warn');
    AU.sfx('alarm');
    if (!was) SOLA_say('wanted');
    spawnWave();
    bus.emit('wanted', this.level, why);
  },
};
SENT.clear = function () { for (const s of this.list) s.m.parent && s.m.parent.remove(s.m); this.list = []; WANTED.level = 0; WANTED.sus = 0; };
function spawnSentinel(pl, type, near, hostile) {
  const up = near.clone().normalize();
  const t = perpOf(up).applyAxisAngle(up, Math.random() * TAU);
  const dir = up.clone().addScaledVector(t, (type === 'quad' ? 45 : 60 + Math.random() * 30) / pl.R).normalize();
  const h = surfaceH(pl, dir);
  const pos = dir.clone().multiplyScalar(pl.R + Math.max(h, pl.P.sea != null ? pl.P.sea : -1e9) + (type === 'quad' ? 0 : 12));
  const m = meshOf(type === 'quad' ? quadGeo() : droneGeo());
  if (type === 'quad') m.scale.setScalar(1.3);
  pl.group.add(m);
  const s = { type, pl, pos, vel: new V3(), m, hp: type === 'quad' ? 380 : 90, state: hostile ? 'hostile' : 'patrol', t: 0, fireT: 1 + Math.random() * 2, burst: 0, home: near.clone(), scanT: 0, hurtT: 0, off: Math.random() * TAU, alive: true };
  SENT.list.push(s);
  return s;
}
function spawnWave() {
  const P = PLAYER;
  if (!P.frame || P.frame.kind !== 'planet') return;
  const pl = P.frame.pl, L = WANTED.level;
  const nD = [0, 2, 3, 3, 2, 4][L], nQ = [0, 0, 0, 1, 2, 3][L];
  for (let i = 0; i < nD; i++) spawnSentinel(pl, 'drone', P.pos, true);
  for (let i = 0; i < nQ; i++) spawnSentinel(pl, 'quad', P.pos, true);
  WANTED.wave = nD + nQ;
}
function sentinelLevel(pl) { return pl ? SENTINEL_LV[pl.sentinel].k : 0; }
function updateSentinels(dt) {
  const P = PLAYER;
  const pl = P.frame && P.frame.kind === 'planet' ? P.frame.pl : (SHIP.frame && SHIP.frame.kind === 'planet' ? SHIP.frame.pl : null);
  if (SENT.pl !== pl) { SENT.clear(); SENT.pl = pl; }
  if (!pl) return;
  const k = sentinelLevel(pl);
  const pLocal = P.inShip ? SHIP.pos : P.pos;
  const alt = pLocal.length() - pl.R - surfaceH(pl, pLocal.clone().normalize());
  // patrols
  SENT.patrolT -= dt;
  if (k > 0 && SENT.patrolT <= 0 && !P.inShip && alt < 100) {
    SENT.patrolT = 25 / k;
    const patrols = SENT.list.filter((s) => s.state !== 'hostile').length;
    if (patrols < Math.ceil(k * 1.5)) spawnSentinel(pl, 'drone', P.pos, false);
  }
  // leaving in the ship ends pursuit
  if (WANTED.level && P.inShip && (SHIP.state === 'flight' && alt > 220 || SHIP.frame !== P.frame)) { WANTED.clear(); HUD.msg('You escaped the Sentinels.', 'good'); }
  let anySee = false, hostiles = 0;
  for (let i = SENT.list.length - 1; i >= 0; i--) {
    const s = SENT.list[i];
    if (!s.alive) { s.deadT += dt; s.pos.addScaledVector(s.up || s.pos.clone().normalize(), -dt * 8); s.m.position.copy(s.pos); s.m.rotation.x += dt * 4; if (s.deadT > 1.5) { s.m.parent && s.m.parent.remove(s.m); SENT.list.splice(i, 1); } continue; }
    s.t -= dt; s.hurtT = Math.max(0, s.hurtT - dt); s.fireT -= dt;
    const up = s.up = s.pos.clone().normalize();
    const toP = pLocal.clone().sub(s.pos), dist = toP.length();
    if (dist > 340) { s.m.parent && s.m.parent.remove(s.m); SENT.list.splice(i, 1); continue; }
    const sees = !P.inShip && P.alive && dist < 55;
    let goal = null, speed = 6;
    if (s.state === 'patrol') {
      const tng = perpOf(up).applyAxisAngle(up, s.off + G.time * 125 / 1000);
      goal = s.home.clone().normalize().multiplyScalar(s.pos.length()).addScaledVector(tng, 30);
      if (sees && s.watch) { s.scanT += dt; }
      s.watch = false;
      if (s.scanT > 0) s.scanT = Math.max(0, s.scanT - dt * 0.3);
    } else if (s.state === 'hostile') {
      hostiles++;
      if (sees) anySee = true;
      const side = perpOf(up).applyAxisAngle(up, s.off + G.time * 0.4);
      if (s.type === 'drone') {
        goal = pLocal.clone().addScaledVector(side, 16).addScaledVector(pLocal.clone().normalize(), 6 + Math.sin(s.off + G.time * 1.11) * 2);
        speed = 11;
      } else { goal = pLocal.clone().addScaledVector(side, 10); speed = 7; }
      // shoot
      if (sees && s.fireT <= 0 && dist < 50) { s.burst = s.type === 'quad' ? 6 : 3; s.fireT = s.type === 'quad' ? 3.2 : 2.6 + Math.random(); }
      if (s.burst > 0 && (s.bt = (s.bt || 0) - dt) <= 0) {
        s.burst--; s.bt = s.type === 'quad' ? 0.1 : 0.2;
        const start = s.pos.clone().addScaledVector(up, s.type === 'quad' ? 2.4 : 0);
        const target = pLocal.clone().addScaledVector(pLocal.clone().normalize(), 1.1).addScaledVector(P.vel, dist / 70 * 0.6);
        const dir = target.sub(start).normalize().add(new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.05)).normalize();
        spawnProjectile(P.frame, start, dir.multiplyScalar(70), s.type === 'quad' ? 9 : 6, 'enemy');
        AU.sfx('laser', 0.4);
      }
    } else if (s.state === 'leave') {
      goal = s.pos.clone().addScaledVector(up, 30); speed = 12;
      if (s.t <= 0) { s.m.parent && s.m.parent.remove(s.m); SENT.list.splice(i, 1); continue; }
    }
    if (goal) {
      const d = goal.sub(s.pos);
      if (s.type === 'quad') d.addScaledVector(up, -d.dot(up));
      const l = d.length();
      if (l > 0.5) s.vel.lerp(d.multiplyScalar(Math.min(speed, l * 2) / l), Math.min(1, dt * 2));
      else s.vel.multiplyScalar(0.9);
    }
    s.pos.addScaledVector(s.vel, dt);
    // keep drones above ground, quads on it
    const gr = pl.R + Math.max(surfaceH(pl, up), pl.P.sea != null ? pl.P.sea : -1e9);
    const r = s.pos.length();
    if (s.type === 'quad') s.pos.multiplyScalar(gr / r);
    else if (r < gr + 4) s.pos.multiplyScalar((gr + 4) / r);
    s.m.position.copy(s.pos);
    const face = s.state === 'hostile' ? pLocal.clone().sub(s.pos) : s.vel.clone();
    face.addScaledVector(up, -face.dot(up) * (s.type === 'quad' ? 1 : 0.6));
    if (face.lengthSq() > 0.01) basisQuat(up, face.normalize(), s.m.quaternion);
    if (s.type === 'drone') s.m.position.addScaledVector(up, Math.sin(G.time * 2.5 + s.off) * 0.15);
    s.m.material = s.hurtT > 0 ? R.mat.hurt : R.mat.vc;
  }
  // wanted: escaping and escalating
  if (WANTED.level) {
    if (anySee) WANTED.lostT = 0; else WANTED.lostT += dt;
    if (WANTED.lostT > 22) { WANTED.clear(); HUD.msg('The Sentinels lost track of you.', 'good'); }
    else if (hostiles === 0) {
      if (WANTED.level >= 5) { WANTED.clear(); giveItem('nanites', 60); HUD.banner('Sentinels repelled', 'win'); }
      else { WANTED.level++; HUD.banner('Wanted · level ' + WANTED.level, 'warn'); AU.sfx('alarm'); spawnWave(); }
    }
  }
  if (WANTED.sus > 0) WANTED.sus = Math.max(0, WANTED.sus - dt * 0.15);
}
// mining / hunting near a patrol draws attention
function sentinelNotice(kind, posLocal) {
  const pl = SENT.pl;
  if (!pl || WANTED.level) return;
  const k = sentinelLevel(pl);
  if (k <= 0) return;
  for (const s of SENT.list) {
    if (s.state !== 'patrol' || !s.alive) continue;
    const d = s.pos.distanceTo(posLocal);
    if (d > 45) continue;
    s.watch = true;
    if (kind === 'kill') { WANTED.raise(1, 'kill'); return; }
    WANTED.sus += (kind === 'deposit' ? 0.5 : 0.18) * k;
    if (WANTED.sus > 0.6 && !s.warned) { s.warned = true; HUD.msg('A Sentinel is watching you mine.', 'bad'); AU.sfx('scanBeep'); }
    if (WANTED.sus >= 1.5) { WANTED.raise(1, 'mining'); return; }
  }
}
let _noticeT = 0;
bus.on('mining', (o) => { if (G.time - _noticeT < 0.5) return; _noticeT = G.time; sentinelNotice(o.sp.kind === 'deposit' ? 'deposit' : 'mine', o.pos); });
bus.on('creatureKilled', (c) => sentinelNotice('kill', c.pos));
function damageSentinel(s, dmg) {
  if (!s.alive) return;
  s.hp -= dmg; s.hurtT = 0.15;
  AU.sfx('hitmark', 0.4);
  if (s.state !== 'hostile') { WANTED.raise(1, 'attack'); s.state = 'hostile'; }
  if (s.hp <= 0) {
    s.alive = false; s.deadT = 0;
    FX.explosion(toWorld(planetFrame(s.pl), s.pos), s.type === 'quad' ? 6 : 3);
    AU.sfx('explode', 0.6);
    giveItem('nanites', s.type === 'quad' ? 20 : 4 + Math.floor(Math.random() * 5));
    if (Math.random() < 0.25) giveItem('datapad', 1);
    bus.emit('sentinelKilled', s);
  }
}
function sentinelRaycast(f, o, d, maxD) {
  if (!f || f.kind !== 'planet') return null;
  let best = null, bt = maxD;
  for (const s of SENT.list) {
    if (!s.alive || s.pl !== f.pl) continue;
    const rad = s.type === 'quad' ? 2.2 : 1.25;
    _v1.copy(s.pos).sub(o);
    if (s.type === 'quad') _v1.addScaledVector(s.pos.clone().normalize(), 1.8);
    const tc = _v1.dot(d);
    if (tc < 0 || tc - rad > bt) continue;
    const d2 = _v1.lengthSq() - tc * tc;
    if (d2 > rad * rad) continue;
    const t = tc - Math.sqrt(rad * rad - d2);
    if (t < bt) { bt = t; best = s; }
  }
  return best ? { s: best, t: bt } : null;
}
