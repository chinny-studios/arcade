// Nullwake — enemies, the spatial hash, enemy bullets, boss hazards and pickups.
const MAX_E = 650;
const E = [], EB = [], HZ = [], GEMS = [], ITEMS = [];

// ---- spatial hash: rebuilt each step; lists hold indices into E, valid until cleanup() at the end of the step ----
const CELL = 64, GN = 4096;
const gHead = new Int32Array(GN), gNext = new Int32Array(MAX_E * 4);
let qStamp = 1;
const gKey = (cx, cy) => (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) & (GN - 1);
function buildGrid() {
  gHead.fill(-1);
  const n = Math.min(E.length, gNext.length);
  for (let i = 0; i < n; i++) { const e = E[i]; if (e.dead) continue; const k = gKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL)); gNext[i] = gHead[k]; gHead[k] = i; }
}
// Calls fn(e) once for each live enemy whose cell overlaps the box. Callers test the exact shape.
function queryBox(x0, y0, x1, y1, fn) {
  const s = ++qStamp, cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL), cy0 = Math.floor(y0 / CELL), cy1 = Math.floor(y1 / CELL);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    for (let i = gHead[gKey(cx, cy)]; i >= 0; i = gNext[i]) { const e = E[i]; if (e.qs === s || e.dead) continue; e.qs = s; fn(e); }
  }
}
function queryCircle(x, y, r, fn) {
  queryBox(x - r - 40, y - r - 40, x + r + 40, y + r + 40, (e) => { const rr2 = r + e.r, dx = e.x - x, dy = e.y - y; if (dx * dx + dy * dy < rr2 * rr2) fn(e); });
}
// Up to k nearest live, non-prop enemies within maxR, nearest first (reuses one array).
const _near = [], _nd = [];
function nearestEnemies(x, y, k, maxR) {
  _near.length = 0; _nd.length = 0; const m2 = maxR * maxR;
  for (const e of E) {
    if (e.dead || e.prop) continue;
    const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y); if (d > m2) continue;
    if (_near.length === k && d >= _nd[k - 1]) continue;
    let i = _near.length < k ? _near.length : k - 1;
    while (i > 0 && _nd[i - 1] > d) { _near[i] = _near[i - 1]; _nd[i] = _nd[i - 1]; i--; }
    _near[i] = e; _nd[i] = d;
  }
  return _near;
}

// ---- enemies ----
function spawnEnemy(type, x, y, o = {}) {
  const d = ENEMIES[type];
  if (!d.attacks && type !== 'pod' && !o.force && G.aliveAll >= MAX_E) return null;
  const min = G.t / 60, tm = 1 + min * 0.12;
  const hpMul = (o.elite ? 12 : 1) * (d.attacks && !d.mid ? 1 : tm) * G.stage.hpMul;
  const e = { id: G.nextId++, def: d, type, x, y, vx: 0, vy: 0, kx: 0, ky: 0,
    hp: d.hp * hpMul, maxHp: d.hp * hpMul, spd: d.spd * (o.elite ? 1.1 : 1) * (0.92 + R() * 0.16),
    dmg: d.dmg * (o.elite ? 1.5 : 1) * (1 + min * 0.04), r: d.r * (o.elite ? 1.6 : 1), xp: d.xp * (o.elite ? 12 : 1) * G.stage.xpMul,
    ai: o.ai || d.ai, elite: !!o.elite, boss: !!d.attacks, prop: d.ai === 'prop', flash: 0, slowT: 0, slowF: 1, hitT: 0,
    face: 1, anim: R() * 2, t: 0, st: 0, at: d.dash ? d.dash.cd * R() : d.shoot ? d.shoot.cd * (0.5 + R()) : 0, dx: 0, dy: 0,
    dead: false, qs: 0, hd: 0, a: 0 };
  E.push(e); G.aliveAll++;
  return e;
}
function spawnRing(viewPad) { return Math.hypot(G.view.w, G.view.h) / 2 + (viewPad || 40); }
function spawnAtEdge(type, o) {
  let a = rr(0, TAU);
  if ((P.mvx || P.mvy) && R() < 0.45) a = Math.atan2(P.mvy, P.mvx) + rr(-0.9, 0.9); // more ahead of you
  const d = spawnRing() + ENEMIES[type].r;
  return spawnEnemy(type, P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, o);
}

function updateEnemies(dt) {
  const px = P.x, py = P.y, far = spawnRing(0) * 1.7;
  let alive = 0, all = 0;
  for (let i = 0; i < E.length; i++) {
    const e = E[i]; if (e.dead) continue;
    all++;
    e.t += dt; if (e.flash > 0) e.flash -= dt;
    if (e.prop) continue;
    let sp = e.spd; if (e.slowT > 0) { e.slowT -= dt; sp *= e.slowF; }
    const dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy) || 1;
    let mx = dx / d, my = dy / d;
    if (e.ai === 'swarm') { mx = e.dx; my = e.dy; if (e.t > 16) { e.dead = true; continue; } }
    else if (e.ai === 'ranged') {
      if (d < 190) { mx = -mx * 0.7; my = -my * 0.7; } else if (d < 260) { mx *= 0.1; my *= 0.1; }
      e.at -= dt;
      if (e.at <= 0 && d < 430) { const s = e.def.shoot; e.at = s.cd * (0.85 + R() * 0.3); enemyShot(e.x, e.y, Math.atan2(dy, dx), s.spd, e.dmg, e.def.c3); }
    } else if (e.ai === 'dash') {
      const s = e.def.dash;
      if (e.st === 0) { e.at -= dt; if (e.at <= 0 && d < 330) { e.st = 1; e.at = 0.6; e.dx = mx; e.dy = my; } }
      else if (e.st === 1) { mx = my = 0; e.at -= dt; if (e.at <= 0) { e.st = 2; e.at = 0.45; } }
      else { mx = e.dx; my = e.dy; sp *= s.mult; e.at -= dt; if (e.at <= 0) { e.st = 0; e.at = s.cd * (0.8 + R() * 0.4); } }
    } else if (e.ai === 'boss') { const r = bossUpdate(e, dt, dx, dy, d); mx = r[0]; my = r[1]; sp = r[2]; }
    e.vx = mx * sp; e.vy = my * sp;
    e.x += (e.vx + e.kx) * dt; e.y += (e.vy + e.ky) * dt;
    const kd = Math.min(1, dt * 9); e.kx -= e.kx * kd; e.ky -= e.ky * kd;
    if (e.vx > 2) e.face = 1; else if (e.vx < -2) e.face = -1;
    e.anim += dt * (2.5 + sp / 30);
    if (!P.dead) { const rr2 = e.r * 0.85 + P.r; if (dx * dx + dy * dy < rr2 * rr2 && e.hitT <= G.t) { e.hitT = G.t + 0.7; hurtPlayer(e.dmg, e.type); } }
    if (!e.boss && e.ai !== 'swarm') {
      alive++;
      if (d > far) { // fell too far behind: bring it back in ahead of the player
        let a = R() < 0.6 && (P.mvx || P.mvy) ? Math.atan2(P.mvy, P.mvx) + rr(-1, 1) : rr(0, TAU);
        const r = spawnRing() + e.r; e.x = px + Math.cos(a) * r; e.y = py + Math.sin(a) * r; e.kx = e.ky = 0;
      }
    }
  }
  G.alive = alive; G.aliveAll = all;
}

function separate() {
  for (let i = 0; i < E.length; i++) {
    const e = E[i]; if (e.dead || e.prop || e.boss) continue;
    const R2 = e.r * 2;
    const cx0 = Math.floor((e.x - R2) / CELL), cx1 = Math.floor((e.x + R2) / CELL), cy0 = Math.floor((e.y - R2) / CELL), cy1 = Math.floor((e.y + R2) / CELL);
    let n = 0;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      for (let j = gHead[gKey(cx, cy)]; j >= 0; j = gNext[j]) {
        if (j === i) continue;
        const o = E[j]; if (o.dead || o.prop) continue;
        if (!o.boss && j < i) continue; // each pair once
        const dx = e.x - o.x, dy = e.y - o.y, min = (e.r + o.r) * 0.8, d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01, push = (min - d) * 0.5, nx = dx / d, ny = dy / d;
        if (o.boss) { e.x += nx * push * 2; e.y += ny * push * 2; }
        else { e.x += nx * push; e.y += ny * push; o.x -= nx * push; o.y -= ny * push; }
        if (++n > 8) break;
      }
    }
  }
}

function hurt(e, dmg, sx, sy, kb, w) {
  if (e.dead) return false;
  e.hp -= dmg; e.flash = 0.1;
  if (w) w.dealt += dmg + Math.min(0, e.hp);
  if (kb && e.def.kbRes < 1) {
    const dx = e.x - sx, dy = e.y - sy, d = Math.hypot(dx, dy) || 1, k = kb * 3 * (1 - e.def.kbRes) * (e.elite ? 0.3 : 1);
    e.kx += dx / d * k; e.ky += dy / d * k;
  }
  if (SAVE.opts.nums && !e.prop) FX.num(e.x, e.y - e.r * 0.6, dmg);
  sfx('hit', 0, 0.045);
  if (e.hp <= 0) killEnemy(e, w);
  return true;
}
function killEnemy(e, w) {
  e.dead = true;
  if (e.prop) { podLoot(e.x, e.y); FX.burst(e.x, e.y, '#c8d0e0', 10, 120, 0.4, 2.5); FX.burst(e.x, e.y, '#ff8a3d', 6, 80, 0.5, 2); sfx('pop', 0, 0.05); return; }
  G.kills++; if (w) w.kills++;
  if (e.xp) dropGem(e.x, e.y, e.xp);
  if (R() < 0.006 * (e.xp + 1)) dropItem(e.x, e.y, 'coin');
  if (e.elite) { dropItem(e.x, e.y, 'chest', 'elite'); FX.ring(e.x, e.y, 60, '#ffd25e', 0.5, 4); }
  if (e.boss) bossDied(e);
  const s = e.def.split;
  if (s) for (let i = 0; i < s.n; i++) { const a = i / s.n * TAU + R(); const c = spawnEnemy(s.type, e.x + Math.cos(a) * e.r * 0.6, e.y + Math.sin(a) * e.r * 0.6, { force: true }); if (c) { c.kx = Math.cos(a) * 160; c.ky = Math.sin(a) * 160; } }
  FX.burst(e.x, e.y, e.def.c1, e.r > 20 ? 16 : 6, e.r > 20 ? 160 : 100, 0.35, e.r > 20 ? 3.5 : 2.2);
  if (e.r > 20) { FX.burst(e.x, e.y, e.def.c3, 8, 120, 0.5, 2.5); sfx('boom', 0, 0.12); } else sfx('kill', 0, 0.05);
  if (w && w.id === 'horizon') G.implode.push(e.x, e.y, w.st.dmg * 0.7);
}

// ---- enemy bullets and boss hazards ----
function enemyShot(x, y, a, spd, dmg, col) { EB.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 6, dmg, life: 7, col: col || '#ff5e6c' }); }
function updateEnemyBullets(dt) {
  for (const b of EB) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (!P.dead && (b.x - P.x) ** 2 + (b.y - P.y) ** 2 < (b.r + P.r * 0.75) ** 2) { hurtPlayer(b.dmg, 'bullet'); b.life = 0; FX.burst(b.x, b.y, b.col, 5, 80, 0.25, 2); }
  }
  compact(EB, (b) => b.life > 0);
}
// Hazards: 'blast' is a telegraphed circle that bursts after `delay` (acid ones leave a pool); 'pool' hurts while you
// stand in it; 'beam' is a telegraphed line that fires once.
function updateHazards(dt) {
  for (const h of HZ) {
    if (h.delay > 0) {
      h.delay -= dt;
      if (h.delay <= 0) {
        if (h.kind === 'blast') {
          if (!P.dead && Math.hypot(P.x - h.x, P.y - h.y) < h.r + P.r * 0.6) hurtPlayer(h.dmg, 'blast');
          FX.ring(h.x, h.y, h.r, h.col, 0.4, 5); FX.burst(h.x, h.y, h.col, 14, 160, 0.4, 3); sfx('boom', 0, 0.1); G.shake = Math.max(G.shake, 3);
          if (h.acid) HZ.push({ kind: 'pool', x: h.x, y: h.y, r: h.r * 0.85, delay: 0, life: 3.5, dmg: h.dmg * 0.35, tick: 0, col: h.col });
          h.life = 0;
        } else if (h.kind === 'beam') {
          const ex = h.x + Math.cos(h.a) * h.len, ey = h.y + Math.sin(h.a) * h.len;
          if (!P.dead && segDist(P.x, P.y, h.x, h.y, ex, ey) < h.w / 2 + P.r * 0.6) hurtPlayer(h.dmg, 'beam');
          FX.beam(h.x, h.y, ex, ey, h.w, h.col, 0.35); sfx('beam', 0, 0.1); G.shake = Math.max(G.shake, 4);
        }
      }
      continue;
    }
    h.life -= dt;
    if (h.kind === 'pool') { h.tick -= dt; if (h.tick <= 0 && !P.dead && Math.hypot(P.x - h.x, P.y - h.y) < h.r + P.r * 0.4) { h.tick = 0.5; hurtPlayer(h.dmg, 'pool'); } }
  }
  compact(HZ, (h) => h.delay > 0 || h.life > 0);
}
function segDist(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1, l2 = vx * vx + vy * vy || 1, t = clamp(((px - x1) * vx + (py - y1) * vy) / l2, 0, 1);
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}

// ---- pickups ----
function dropGem(x, y, v) {
  if (GEMS.length >= 450) { // too many on the floor: fold the rest into one big gem, as the genre does
    if (G.bigGem && !G.bigGem.gone) { G.bigGem.v += v; return; }
    const g = { x, y, v, tier: 3, mag: false, sp: 0, gone: false }; GEMS.push(g); G.bigGem = g; return;
  }
  GEMS.push({ x: x + rr(-4, 4), y: y + rr(-4, 4), v, tier: v < 2 ? 0 : v < 5 ? 1 : v < 25 ? 2 : 3, mag: false, sp: 0, gone: false });
}
function dropItem(x, y, kind, arg) { ITEMS.push({ x, y, kind, arg, mag: false, sp: 0, t: 0, gone: false }); }
function podLoot(x, y) {
  const r = R();
  const kind = r < 0.38 ? 'coin' : r < 0.52 ? 'bag' : r < 0.82 ? 'heal' : r < 0.92 ? 'magnet' : 'emp';
  dropItem(x, y, kind);
}
function updatePickups(dt) {
  const mr = P.st.magnetR, mr2 = mr * mr, pr = P.r + 6;
  G.gemChainT -= dt; if (G.gemChainT <= 0) G.gemChain = 0;
  for (const g of GEMS) {
    const dx = P.x - g.x, dy = P.y - g.y, d2 = dx * dx + dy * dy;
    if (!g.mag) { if (d2 < mr2 && !P.dead) { g.mag = true; g.sp = -60; } continue; }
    g.sp = Math.min(900, g.sp + 1100 * dt); const d = Math.sqrt(d2) || 1;
    g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
    if (d < pr) { g.gone = true; addXp(g.v); G.gemChain++; G.gemChainT = 0.5; sfx('gem', 1 + Math.min(G.gemChain, 30) * 0.025, 0.03); }
  }
  compact(GEMS, (g) => !g.gone);
  for (const it of ITEMS) {
    it.t += dt;
    const dx = P.x - it.x, dy = P.y - it.y, d2 = dx * dx + dy * dy;
    if (!it.mag) { if (d2 < (it.kind === 'chest' ? (P.r + 16) ** 2 : mr2) && !P.dead) { it.mag = true; it.sp = -40; } continue; }
    it.sp = Math.min(800, it.sp + 900 * dt); const d = Math.sqrt(d2) || 1;
    it.x += dx / d * it.sp * dt; it.y += dy / d * it.sp * dt;
    if (d < pr + 4) { it.gone = true; collect(it); }
  }
  compact(ITEMS, (it) => !it.gone);
}
function collect(it) {
  const k = it.kind;
  if (k === 'coin' || k === 'bag') { const v = Math.round((k === 'bag' ? 25 : rr(1, 4) | 0 || 1) * P.st.greed * G.stage.goldMul); G.gold += v; FX.text(P.x, P.y - 24, '+' + v, '#ffd25e'); sfx('coin', 0, 0.05); }
  else if (k === 'heal') { const v = Math.min(30, P.st.maxHp - P.hp); P.hp += v; FX.text(P.x, P.y - 24, '+' + Math.round(v), '#7dffa8'); sfx('heal'); }
  else if (k === 'magnet') { for (const g of GEMS) { g.mag = true; g.sp = Math.max(g.sp, 200); } FX.ring(P.x, P.y, 200, '#ff5e6c', 0.5, 4); sfx('pickup'); }
  else if (k === 'emp') {
    const hw = G.view.w / 2 + 30, hh = G.view.h / 2 + 30;
    for (const e of E) if (!e.dead && !e.boss && !e.prop && Math.abs(e.x - P.x) < hw && Math.abs(e.y - P.y) < hh) killEnemy(e, null);
    G.empFlash = 1; G.shake = Math.max(G.shake, 8); sfx('boom'); sfx('zap');
  }
  else if (k === 'chest') { G.chestQ.push(it.arg); sfx('chest'); }
}
function compact(arr, keep) { let j = 0; for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i]; arr.length = j; }
function cleanup() { compact(E, (e) => !e.dead); }
