// Nullwake — boss behaviour. A boss walks at you and runs the attacks listed in its ENEMIES entry, each on its own
// timer; below half health every timer runs 30% faster. Returns [moveX, moveY, speed].
const _bossOut = [0, 0, 0];
function bossUpdate(e, dt, dx, dy, dist) {
  const d = e.def;
  if (!e.atk) e.atk = d.attacks.map((a) => ({ a, t: a.cd * (0.4 + R() * 0.5) }));
  let mx = dx / dist, my = dy / dist, sp = e.spd;
  let want = Math.atan2(dy, dx), da = want - e.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; e.a += clamp(da, -2 * dt, 2 * dt);
  if (dist > spawnRing(0) * 1.6) { // keep up with a fleeing player
    const r = spawnRing() + e.r, a = Math.atan2(-dy, -dx) + rr(-0.5, 0.5); e.x = P.x + Math.cos(a) * r; e.y = P.y + Math.sin(a) * r;
  }
  if (e.busy) {
    e.busyT -= dt;
    if (e.busy === 'wind') { mx = my = 0; if (e.busyT <= 0) { e.busy = 'dash'; e.busyT = 0.75; } }
    else if (e.busy === 'dash') { mx = e.dx; my = e.dy; sp = e.spd * 5.5; if (e.busyT <= 0) e.busy = null; }
    else if (e.busy === 'spiral') {
      sp *= 0.25; e.spT -= dt;
      while (e.spT <= 0) { const s = e.sp; e.spT += 0.07; for (let k = 0; k < 2; k++) enemyShot(e.x, e.y, e.spA + k * Math.PI, s.spd, s.dmg, d.c3); e.spA += 0.33; }
      if (e.busyT <= 0) e.busy = null;
    }
    _bossOut[0] = mx; _bossOut[1] = my; _bossOut[2] = sp; return _bossOut;
  }
  const rage = e.hp < e.maxHp * 0.5 ? 0.7 : 1;
  for (const s of e.atk) { s.t -= dt; if (s.t <= 0) { s.t = s.a.cd * rage * (0.85 + R() * 0.3); bossAttack(e, s.a, dx, dy, dist); break; } }
  _bossOut[0] = mx; _bossOut[1] = my; _bossOut[2] = sp; return _bossOut;
}
function bossAttack(e, a, dx, dy, dist) {
  const d = e.def, aim = Math.atan2(dy, dx), col = d.c3;
  if (a.k === 'ring') { const o = R() * TAU; for (let i = 0; i < a.n; i++) enemyShot(e.x, e.y, o + i * TAU / a.n, a.spd, a.dmg, col); sfx('zap', 0, 0.1); }
  else if (a.k === 'fan') { for (let i = 0; i < a.n; i++) enemyShot(e.x, e.y, aim + (i - (a.n - 1) / 2) * 0.17, a.spd, a.dmg, col); sfx('shoot'); }
  else if (a.k === 'spiral') { e.busy = 'spiral'; e.busyT = a.n * 0.07 / 2; e.spT = 0; e.spA = R() * TAU; e.sp = a; }
  else if (a.k === 'summon') {
    for (let i = 0; i < a.n; i++) { const k = i / a.n * TAU, r = e.r + 20; spawnEnemy(a.type, e.x + Math.cos(k) * r, e.y + Math.sin(k) * r, { force: true }); }
    FX.ring(e.x, e.y, e.r + 30, col, 0.5, 4);
  }
  else if (a.k === 'dash') { if (dist < 600) { e.busy = 'wind'; e.busyT = 0.85; e.dx = dx / dist; e.dy = dy / dist; } }
  else if (a.k === 'lob') {
    for (let i = 0; i < a.n; i++) {
      const tx = P.x + (i ? rr(-110, 110) : P.mvx * 60), ty = P.y + (i ? rr(-110, 110) : P.mvy * 60);
      HZ.push({ kind: 'blast', x: tx, y: ty, r: a.r, delay: 1.15 + i * 0.12, max: 1.15 + i * 0.12, life: 0, dmg: a.dmg, col, acid: G.stage.look === 'brood' });
    }
  }
  else if (a.k === 'beam') {
    for (let i = 0; i < a.n; i++) HZ.push({ kind: 'beam', x: e.x, y: e.y, a: aim + (i - (a.n - 1) / 2) * 0.55, len: 1500, w: 30, delay: 1.0, max: 1.0, life: 0.01, dmg: a.dmg, col });
  }
}
