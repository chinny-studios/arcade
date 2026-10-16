// Nullwake — weapons. Each weapon instance { id, lvl, t, st } fires on its own cooldown; BEHAV[id] holds its
// fire(w) (return false to retry soon, or a number to set the next cooldown itself) and an optional tick(w, dt).
const PR = [], POOLS = [], LOBS = [];

function calcWeapon(w) {
  const d = WEAPONS[w.id], s = Object.assign({}, d.base);
  if (d.up) for (let i = 0; i < w.lvl - 1; i++) for (const k in d.up[i]) if (k !== 't') s[k] = (s[k] || 0) + d.up[i][k];
  const p = P.st;
  w.st = { dmg: s.dmg * p.might, cd: Math.max(0.05, s.cd * p.cooldown), amount: (s.amount || 0) + p.amount, area: s.area * p.area,
    speed: (s.speed || 1) * p.speed, dur: (s.dur || 1) * p.duration, pierce: s.pierce || 1, chain: s.chain || 0, kb: s.kb || 0 };
}
function addWeapon(id) {
  const w = { id, lvl: 1, t: 0.3, st: null, dealt: 0, kills: 0, ang: 0, on: 0, pend: [], lx: P.x, ly: P.y };
  P.weapons.push(w); calcWeapon(w); G.invDirty = true; SAVE.seen[id] = 1;
  return w;
}
function updateWeapons(dt) {
  for (const w of P.weapons) {
    const b = BEHAV[w.id];
    if (b.tick) b.tick(w, dt);
    for (const p of w.pend) { p.t -= dt; if (p.t <= 0) p.fn(); }
    if (w.pend.length) compact(w.pend, (p) => p.t > 0);
    w.t -= dt;
    if (w.t <= 0 && b.fire) { const r = b.fire(w); w.t = r === false ? 0.15 : typeof r === 'number' ? r : w.t + w.st.cd; if (w.t < 0) w.t = 0; }
  }
  // Event Horizon implosions queued by kills, resolved here so chains don't recurse
  if (G.implode.length) {
    const q = G.implode.splice(0, G.implode.length), w = P.weapons.find((x) => x.id === 'horizon');
    for (let i = 0; i < q.length; i += 3) { const x = q[i], y = q[i + 1], dm = q[i + 2]; FX.ring(x, y, 34, '#9fb4ff', 0.3, 3); queryCircle(x, y, 34, (e) => hurt(e, dm, x, y, 0, w)); }
  }
}
const faceAngle = () => Math.atan2(P.fy, P.fx);

function shoot(o) { PR.push(o); return o; }
function bolt(w, a, col) {
  const s = w.st;
  shoot({ kind: 'bolt', x: P.x + Math.cos(a) * 10, y: P.y - 3 + Math.sin(a) * 10, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, r: 5 * Math.sqrt(s.area),
    dmg: s.dmg, pierce: s.pierce, life: s.dur, w, col, hits: [] });
}
function slash(w, side, yoff, big) {
  const s = w.st, W = 140 * s.area, H = (big ? 52 : 40) * s.area, cx = P.x + side * (W / 2 + 6), cy = P.y + yoff - 4;
  let healed = 0;
  queryBox(cx - W / 2, cy - H / 2, cx + W / 2, cy + H / 2, (e) => {
    if (Math.abs(e.x - cx) < W / 2 + e.r && Math.abs(e.y - cy) < H / 2 + e.r) {
      hurt(e, s.dmg, P.x, P.y, s.kb, w);
      if (w.id === 'siphon' && !e.prop && healed < 4 && P.hp < P.st.maxHp) { P.hp = Math.min(P.st.maxHp, P.hp + 1); healed++; }
    }
  });
  FX.slash(cx, cy, side, W, H, WEAPONS[w.id].color);
  if (healed) FX.text(P.x, P.y - 22, '+' + healed, '#7dffa8');
  sfx('lash', 0, 0.06);
}
function beam(w, a, len, width) {
  const s = w.st, x2 = P.x + Math.cos(a) * len, y2 = P.y + Math.sin(a) * len;
  queryBox(Math.min(P.x, x2) - width, Math.min(P.y, y2) - width, Math.max(P.x, x2) + width, Math.max(P.y, y2) + width, (e) => {
    if (segDist(e.x, e.y, P.x, P.y, x2, y2) < width / 2 + e.r) hurt(e, s.dmg, e.x - Math.cos(a) * 10, e.y - Math.sin(a) * 10, s.kb, w);
  });
  FX.beam(P.x, P.y, x2, y2, width, WEAPONS[w.id].color, 0.28);
}
function strike(w, e, hit, splash) { // one lightning strike plus its chain
  const s = w.st;
  FX.bolt(e.x + rr(-30, 30), e.y - 260, e.x, e.y, WEAPONS[w.id].color);
  hurt(e, s.dmg, e.x, e.y - 1, 0, w); hit.push(e);
  if (splash) { FX.ring(e.x, e.y, splash, WEAPONS[w.id].color, 0.3, 3); queryCircle(e.x, e.y, splash, (o) => { if (o !== e) hurt(o, s.dmg * 0.5, e.x, e.y, 0, w); }); }
  let cur = e;
  for (let c = 0; c < s.chain; c++) {
    let best = null, bd = (110 * s.area) ** 2;
    queryCircle(cur.x, cur.y, 110 * s.area, (o) => { if (o.prop || hit.includes(o)) return; const d = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2; if (d < bd) { bd = d; best = o; } });
    if (!best) break;
    FX.bolt(cur.x, cur.y, best.x, best.y, WEAPONS[w.id].color);
    hurt(best, s.dmg * 0.85, cur.x, cur.y, 0, w); hit.push(best); cur = best;
  }
}
function visibleEnemies() {
  const hw = G.view.w / 2, hh = G.view.h / 2, out = [];
  for (const e of E) if (!e.dead && !e.prop && Math.abs(e.x - P.x) < hw && Math.abs(e.y - P.y) < hh) out.push(e);
  return out;
}
function lobMine(w, tx, ty, r, life) { LOBS.push({ x0: P.x, y0: P.y, x1: tx, y1: ty, t: 0, T: 0.4, w, r, life }); }
function addPool(w, x, y, r, life) { POOLS.push({ x, y, r, life, max: life, tick: 0, w, col: WEAPONS[w.id].color }); }

const BEHAV = {
  blaster: { fire(w) {
    const n = w.st.amount, t = nearestEnemies(P.x, P.y, n, 560);
    if (!t.length) return false;
    for (let i = 0; i < n; i++) {
      const e = t[i % t.length]; let a = Math.atan2(e.y - P.y, e.x - P.x);
      if (i >= t.length) a += rr(-0.25, 0.25);
      w.pend.push({ t: i * 0.06, fn: () => bolt(w, a, '#5ef0ff') });
    }
    sfx('shoot', 0, 0.05);
  } },
  storm: { fire(w) {
    const n = w.st.amount, t = nearestEnemies(P.x, P.y, n, 620);
    if (!t.length) return false;
    for (let i = 0; i < n; i++) { const e = t[i % t.length]; bolt(w, Math.atan2(e.y - P.y, e.x - P.x) + (i >= t.length ? rr(-0.2, 0.2) : 0), '#9ffcff'); }
    sfx('shoot', 0, 0.07);
  } },
  lash: { fire(w) {
    const n = w.st.amount, f = P.side;
    for (let i = 0; i < n; i++) { const side = i % 2 ? -f : f, yoff = Math.floor(i / 2) * (i % 4 < 2 ? -22 : 22); w.pend.push({ t: i * 0.12, fn: () => slash(w, side, yoff) }); }
  } },
  siphon: { fire(w) {
    const n = w.st.amount, f = P.side;
    for (let i = 0; i < n; i++) { const side = i % 2 ? -f : f, yoff = Math.floor(i / 2) * (i % 4 < 2 ? -26 : 26); w.pend.push({ t: i * 0.1, fn: () => slash(w, side, yoff, true) }); }
  } },
  drones: {
    fire(w) { w.on = w.st.dur; return w.st.cd + w.st.dur; },
    tick(w, dt) { if (w.on > 0) { w.on -= dt; droneTick(w, dt); } },
  },
  halo: { tick(w, dt) { w.on = 1; droneTick(w, dt); } },
  rail: { fire(w) {
    const n = w.st.amount, a0 = faceAngle();
    for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.16; w.pend.push({ t: i * 0.05, fn: () => beam(w, a, 380 * w.st.area, 10 * w.st.area) }); }
    sfx('beam', 0, 0.08);
  } },
  sunspear: { fire(w) {
    const n = w.st.amount, a0 = faceAngle(), pairs = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) { const k = Math.floor(i / 2), a = a0 + (i % 2 ? Math.PI : 0) + (k - (pairs - 1) / 2) * 0.14; beam(w, a, 700 * w.st.area, 18 * w.st.area); }
    G.shake = Math.max(G.shake, 2); sfx('beam', 0, 0.08);
  } },
  mines: { fire(w) {
    const s = w.st, t = nearestEnemies(P.x, P.y, 12, 320);
    for (let i = 0; i < s.amount; i++) {
      let tx, ty; if (t.length) { const e = t[Math.floor(R() * t.length)]; tx = e.x + rr(-20, 20); ty = e.y + rr(-20, 20); } else { const a = rr(0, TAU), d = rr(60, 180); tx = P.x + Math.cos(a) * d; ty = P.y + Math.sin(a) * d; }
      w.pend.push({ t: i * 0.1, fn: () => lobMine(w, tx, ty, 38 * s.area, s.dur) });
    }
    sfx('mine', 0, 0.08);
  } },
  nullwake: {
    fire(w) { BEHAV.mines.fire(w); },
    tick(w) { const s = w.st; if (Math.hypot(P.x - w.lx, P.y - w.ly) > 20 * s.area) { w.lx = P.x; w.ly = P.y; addPool(w, P.x, P.y + 4, 26 * s.area, s.dur * 0.8); } },
  },
  missiles: { fire(w) {
    const s = w.st, a0 = faceAngle();
    for (let i = 0; i < s.amount; i++) {
      const a = a0 + Math.PI + (i - (s.amount - 1) / 2) * 0.6 + rr(-0.2, 0.2);
      w.pend.push({ t: i * 0.08, fn: () => shoot({ kind: 'missile', x: P.x, y: P.y, a, spd: s.speed, vx: 0, vy: 0, r: 6, dmg: s.dmg, life: s.dur, w, target: null, rt: 0, splash: 46 * s.area, trail: 0 }) });
    }
    sfx('missile', 0, 0.1);
  } },
  barrage: { fire(w) {
    const s = w.st;
    for (let i = 0; i < s.amount; i++) { const a = i / s.amount * TAU + rr(-0.2, 0.2); w.pend.push({ t: i * 0.03, fn: () => shoot({ kind: 'missile', x: P.x, y: P.y, a, spd: s.speed, vx: 0, vy: 0, r: 5, dmg: s.dmg, life: s.dur, w, target: null, rt: 0, splash: 40 * s.area, trail: 0, mini: true }) }); }
    sfx('missile', 0, 0.1);
  } },
  tesla: { fire(w) { return teslaFire(w, 0); } },
  thunder: { fire(w) { return teslaFire(w, 40 * w.st.area); } },
  gravity: { fire(w) { auraPulse(w, 0.75); } },
  horizon: { fire(w) { auraPulse(w, 0.5); } },
};
function droneTick(w, dt) {
  const s = w.st, n = Math.max(1, s.amount), R0 = 70 * s.area, dr = 11 * Math.sqrt(s.area);
  w.ang += dt * 3.0 * s.speed;
  for (let i = 0; i < n; i++) {
    const a = w.ang + i * TAU / n, x = P.x + Math.cos(a) * R0, y = P.y + Math.sin(a) * R0;
    queryCircle(x, y, dr, (e) => { if (e.hd <= G.t) { e.hd = G.t + 0.4; hurt(e, s.dmg, P.x, P.y, s.kb, w); } });
  }
}
function teslaFire(w, splash) {
  const vis = visibleEnemies(); if (!vis.length) return false;
  const hit = [];
  for (let i = 0; i < w.st.amount && vis.length; i++) {
    const k = Math.floor(R() * vis.length), e = vis[k]; vis[k] = vis[vis.length - 1]; vis.pop();
    if (e.dead || hit.includes(e)) continue;
    w.pend.push({ t: i * 0.07, fn: () => { if (!e.dead) strike(w, e, hit, splash); } });
  }
  sfx('zap', 0, 0.08);
}
function auraPulse(w, slow) {
  const s = w.st, R0 = 58 * s.area;
  queryCircle(P.x, P.y, R0, (e) => { hurt(e, s.dmg, P.x, P.y, 0, w); e.slowT = 0.6; e.slowF = slow; });
}

// ---- projectiles, mines in flight and pools ----
function updateProjectiles(dt) {
  for (const p of PR) {
    p.life -= dt;
    if (p.kind === 'bolt') {
      p.x += p.vx * dt; p.y += p.vy * dt;
      queryCircle(p.x, p.y, p.r, (e) => {
        if (p.pierce <= 0 || p.hits.includes(e)) return;
        p.hits.push(e); hurt(e, p.dmg, p.x - p.vx * 0.05, p.y - p.vy * 0.05, p.w.st.kb, p.w);
        if (--p.pierce <= 0) { p.life = 0; FX.burst(p.x, p.y, p.col, 3, 60, 0.18, 1.8); }
      });
    } else if (p.kind === 'missile') {
      p.rt -= dt;
      if (!p.target || p.target.dead || p.rt <= 0) { p.rt = 0.25; const t = nearestEnemies(p.x, p.y, p.mini ? 6 : 3, 520); p.target = t.length ? t[Math.floor(R() * t.length)] : null; }
      if (p.target) {
        const want = Math.atan2(p.target.y - p.y, p.target.x - p.x); let da = want - p.a;
        while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        p.a += clamp(da, -6 * dt, 6 * dt);
      }
      const sp = p.spd * Math.min(1, 0.35 + (p.w.st.dur - p.life) * 2.2);
      p.vx = Math.cos(p.a) * sp; p.vy = Math.sin(p.a) * sp; p.x += p.vx * dt; p.y += p.vy * dt;
      p.trail -= dt; if (p.trail <= 0) { p.trail = 0.03; FX.puff(p.x - p.vx * 0.03, p.y - p.vy * 0.03); }
      let boom = p.life <= 0;
      if (!boom) queryCircle(p.x, p.y, p.r, (e) => { if (!e.prop) boom = true; });
      if (boom) {
        p.life = 0;
        queryCircle(p.x, p.y, p.splash, (e) => hurt(e, p.dmg, p.x, p.y, p.w.st.kb, p.w));
        FX.explode(p.x, p.y, p.splash, '#ff8a5e'); sfx('boom', 0, 0.09);
      }
    }
  }
  compact(PR, (p) => p.life > 0);
  for (const m of LOBS) {
    m.t += dt;
    if (m.t >= m.T) { addPool(m.w, m.x1, m.y1, m.r, m.life); FX.ring(m.x1, m.y1, m.r, WEAPONS[m.w.id].color, 0.3, 3); }
  }
  compact(LOBS, (m) => m.t < m.T);
}
function updatePools(dt) {
  for (const p of POOLS) {
    p.life -= dt; p.tick -= dt;
    if (p.tick <= 0) { p.tick = 0.33; const s = p.w.st; queryCircle(p.x, p.y, p.r, (e) => hurt(e, s.dmg, p.x, p.y, 0, p.w)); }
  }
  compact(POOLS, (p) => p.life > 0);
}
