// Signal Front — computer opponent
// aiNext() returns one action at a time so the UI can animate each move. It is side-agnostic:
// the Drovic AI uses it, and the debug autoplay can drive Meridian with it too.
// Units are scored greedily: damage traded in funds, capture progress, and a positional score
// built from distance-to-goal fields and the enemy's threat coverage for next turn.

const EXPECTED = [
  ['crawler', 'crawler', 'strider', 'wraith', 'spark', 'mallet'],
  ['rifle', 'rifle', 'atgm', 'tank', 'howitzer', 'fpv'],
];
const PROP_VALUE = { hq: 9000, base: 6000, airport: 5000, port: 2500, city: 2500, tower: 3500 };

function aiContext(S, side) {
  const enemies = S.units.filter((u) => u.s !== side && canSee(S, side, u));
  const mine = S.units.filter((u) => u.s === side);
  const covers = [];
  for (const e of enemies) {
    if (!UNITS[e.t].w1 && !UNITS[e.t].w2) continue;
    covers.push({ e, cover: threatCover(S, e) });
  }
  const claims = new Set();
  for (const u of mine) if (u.cap) claims.add(u.y * S.w + u.x);
  // press harder when ahead, hang back when behind
  const mv = mine.reduce((a, u) => a + UNITS[u.t].cost * disp(u.hp) / 10, 0) + S.sides[side].funds * 0.5;
  const ev = enemies.reduce((a, u) => a + UNITS[u.t].cost * disp(u.hp) / 10, 0) + 1;
  const ratio = mv / ev;
  const caution = ratio > 2 ? 0.45 : ratio > 1.3 ? 0.7 : ratio < 0.7 ? 1.2 : 1;
  return { side, enemies, mine, covers, claims, caution, fields: {} };
}

function threatCover(S, e) {
  const W = S.w, cov = new Uint8Array(S.w * S.h);
  const [r0, r1] = attackRange(S, e);
  const mark = (cx, cy, a, b) => {
    for (let dy = -b; dy <= b; dy++) for (let dx = -b; dx <= b; dx++) {
      const d = Math.abs(dx) + Math.abs(dy), x = cx + dx, y = cy + dy;
      if (d >= a && d <= b && inb(S, x, y)) cov[y * W + x] = 1;
    }
  };
  if (isIndirect(e.t)) mark(e.x, e.y, r0, r1);
  else {
    const r = reach(S, e, { blockAll: true, mp: moveRange(S, e) });
    for (let i = 0; i < r.dist.length; i++) if (r.dist[i] >= 0) mark(i % W, (i / W) | 0, 1, UNITS[e.t].kamikaze ? 1 : r1);
  }
  return cov;
}

// Expected damage next turn: the worst single attacker counts fully, the rest partly
// (they rarely all get a clear shot at the same unit).
function threatAt(S, ctx, u, x, y) {
  let tot = 0, mx = 0;
  const i = y * S.w + x;
  for (const c of ctx.covers) {
    if (!c.cover[i] || c.e.hp <= 0) continue;
    const d = calcDmg(S, c.e, c.e.x, c.e.y, u, x, y, 4.5, c.e.hp, u.hp);
    if (d > 0) { tot += d; if (d > mx) mx = d; }
  }
  return Math.min(mx + 0.35 * (tot - mx), u.hp);
}

// Multi-source distance field (movement cost) toward goal tiles for a movement type.
function distField(S, mt, sources) {
  const N = S.w * S.h, W = S.w, d = new Int16Array(N).fill(-1);
  const costs = MOVE[mt];
  const q = [];
  for (const i of sources) { if (d[i] !== 0) { d[i] = 0; q.push(i); } }
  // small integer costs: simple label-correcting queue is plenty for these map sizes
  let h = 0;
  while (h < q.length) {
    const i = q[h++], x = i % W, y = (i / W) | 0;
    const ci = costs[S.tiles[i].k] || 1;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!inb(S, nx, ny)) continue;
      const j = ny * W + nx;
      if (!costs[S.tiles[j].k]) continue;
      const nd = d[i] + ci;
      if (d[j] === -1 || nd < d[j]) { d[j] = nd; q.push(j); }
    }
  }
  return d;
}

function bestBase(t, cls) {
  const U = UNITS[t];
  return Math.max(U.w1 ? U.w1.dmg[cls] || 0 : 0, U.w2 ? U.w2.dmg[cls] || 0 : 0);
}
const hasWeapon = (t) => !!(UNITS[t].w1 || UNITS[t].w2);

function goalSources(S, ctx, u) {
  const W = S.w, side = ctx.side, U = UNITS[u.t], src = [];
  const own = (k) => S.tiles.forEach((t, i) => { if (t.o === side && TER[t.k].repair === k) src.push(i); });
  // retreat for repairs or fuel
  if (disp(u.hp) <= 3 && !U.cap) { own(repairKind(u.t)); if (src.length) return { src, w: 350, why: 'repair' }; }
  if (isAir(u.t) && u.fuel <= (U.burn || 1) * 4 + 6) { own('air'); if (src.length) return { src, w: 600, why: 'fuel' }; }
  if (U.w1 && u.ammo === 0 && !U.w2) { own(repairKind(u.t)); if (src.length) return { src, w: 300, why: 'ammo' }; }
  if (U.cap) {
    S.tiles.forEach((t, i) => { if (TER[t.k].prop && t.o !== side && !ctx.claims.has(i)) src.push(i); });
    if (src.length) return { src, w: 260, why: 'capture' };
  }
  if (U.jam) {
    for (const e of ctx.enemies) if (isDrone(e.t)) src.push(e.y * W + e.x);
    if (src.length) return { src, w: 160, why: 'jam' };
  }
  if (!hasWeapon(u.t)) {
    for (const m of ctx.mine) if (m !== u && hasWeapon(m.t) && !isAir(m.t)) src.push(m.y * W + m.x);
    if (src.length) return { src, w: 140, why: 'escort' };
  }
  if (hasWeapon(u.t)) {
    for (const e of ctx.enemies) if (bestBase(u.t, UNITS[e.t].cls) >= 25) src.push(e.y * W + e.x);
    if (src.length) return { src, w: 200, why: 'hunt' };
  }
  S.tiles.forEach((t, i) => { if (t.k === 'hq' && t.o >= 0 && t.o !== side) src.push(i); });
  S.tiles.forEach((t, i) => { if (TER[t.k].prop && t.o >= 0 && t.o !== side) src.push(i); });
  return { src, w: 120, why: 'advance' };
}

function goalField(S, ctx, u) {
  const g = goalSources(S, ctx, u);
  const key = UNITS[u.t].mt + '|' + g.why + '|' + g.src.join(',');
  if (!ctx.fields[key]) ctx.fields[key] = distField(S, UNITS[u.t].mt, g.src);
  return { d: ctx.fields[key], w: g.w, why: g.why };
}

function riskOf(ctx, u) {
  const U = UNITS[u.t];
  let r = U.cap ? 0.4 : isIndirect(u.t) ? 1.1 : !hasWeapon(u.t) ? 1.3 : 0.6;
  return r * ctx.caution;
}

function posScore(S, ctx, u, x, y, goal) {
  const i = y * S.w + x, t = S.tiles[i], U = UNITS[u.t];
  let s = 0;
  const d = goal.d[i];
  s -= (d >= 0 ? d : 60) * goal.w;
  const thr = threatAt(S, ctx, u, x, y);
  s -= thr / 100 * U.cost * riskOf(ctx, u);
  if (!isAir(u.t)) s += TER[t.k].def * 45;
  if (t.o === ctx.side && TER[t.k].build) s -= 2500;
  if (t.o === ctx.side && TER[t.k].prop && TER[t.k].repair === repairKind(u.t) && u.hp < 70) s += (100 - u.hp) * 40;
  if (isIndirect(u.t)) {
    // like to sit where enemies will be in range next turn
    const [r0, r1] = attackRange(S, u);
    for (const e of ctx.enemies) { const dd = mdist(x, y, e.x, e.y); if (dd >= r0 && dd <= r1 && bestBase(u.t, UNITS[e.t].cls)) { s += 600; break; } }
  }
  if (UNITS[u.t].mesh || UNITS[u.t].jam) {
    let near = 0; for (const m of ctx.mine) if (m !== u && mdist(m.x, m.y, x, y) <= 2) near++;
    s += Math.min(near, 4) * 250;
  }
  return s;
}

function propValue(S, side, t) {
  let v = PROP_VALUE[t.k] || 2000;
  if (t.k === 'hq' && t.o >= 0) v = 60000;
  if (t.o >= 0 && t.o !== side) v *= 1.4; // taking from the enemy is a double swing
  return v;
}

function evalUnit(S, ctx, u) {
  const U = UNITS[u.t], W = S.w;
  const r = reach(S, u);
  const goal = goalField(S, ctx, u);
  const base = posScore(S, ctx, u, u.x, u.y, goal);
  let best = { score: 0, act: 'wait', x: u.x, y: u.y };
  const consider = (c) => { if (c.score > best.score) best = c; };
  for (let i = 0; i < r.dist.length; i++) {
    if (r.dist[i] < 0) continue;
    const x = i % W, y = (i / W) | 0;
    const kind = stopKind(S, u, x, y);
    if (kind !== 'stay' && kind !== 'move') continue;
    const moved = kind === 'move';
    const pos = posScore(S, ctx, u, x, y, goal);
    const dpos = pos - base;
    consider({ score: dpos, act: 'wait', x, y });
    if (hasWeapon(u.t)) {
      for (const e of targetsFrom(S, u, x, y, moved)) {
        const f = forecast(S, u, x, y, e);
        if (f.hi <= 0) continue;
        const ev = UNITS[e.t].cost;
        let val = Math.min(f.mid, e.hp) / 100 * ev;
        if (f.lo >= e.hp) val += ev * 0.35;
        if (e.cap) val += 3000 + (tileAt(S, e.x, e.y).k === 'hq' ? 30000 : 0);
        let cost = (f.counter ? (f.clo + f.chi) / 2 : 0) / 100 * U.cost;
        if (U.kamikaze) { cost = U.cost * 0.75; if (val < U.cost * 1.1) continue; }
        consider({ score: val - cost + dpos * 0.25 + 1, act: 'attack', x, y, target: e.id });
      }
    }
    if (U.cap) {
      const t = S.tiles[i];
      if (TER[t.k].prop && t.o !== ctx.side) {
        const prog = Math.min(1, disp(u.hp) / t.cp);
        let sc = propValue(S, ctx.side, t) * (0.35 + 0.65 * prog);
        if (prog >= 1) sc *= 1.5;
        if (u.cap && !moved) sc += 2500;
        consider({ score: sc + dpos * 0.3, act: 'capture', x, y });
      }
    }
    if (U.supply && !moved) {
      let need = 0; for (const m of ctx.mine) if (m !== u && mdist(m.x, m.y, x, y) === 1 && needsSupply(m)) need += 800;
      if (need) consider({ score: need + dpos, act: 'supply', x, y });
    }
  }
  best.id = u.id;
  return best;
}

function aiPowerChoice(S, side, ctx) {
  const sd = S.sides[side];
  if (sd.pw || sd.usedThisTurn) return 0;
  const engaged = ctx.mine.filter((u) => ctx.enemies.some((e) => mdist(u.x, u.y, e.x, e.y) <= moveRange(S, u) + 2)).length;
  if (canPower(S, side, 2) && (engaged >= 2 || ctx.enemies.length >= 4)) return 2;
  if (canPower(S, side, 1) && sd.meter < powerCost(S, side, 2) * 0.7 && engaged >= 3) return 1;
  return 0;
}

function capturerCount(ctx) { return ctx.mine.filter((u) => UNITS[u.t].cap).length; }

function chooseBuild(S, ctx, kind, funds) {
  const side = ctx.side, co = coOf(S, side);
  const roster = buildList(S, side, kind).filter((t) => !UNITS[t].carry && !UNITS[t].supply && unitCost(S, side, t) <= funds);
  if (!roster.length) return null;
  let neutral = 0;
  for (const t of S.tiles) if (TER[t.k].prop && t.o < 0) neutral++;
  const caps = capturerCount(ctx);
  const enemyDrones = ctx.enemies.filter((e) => isDrone(e.t)).length;
  const myCombat = ctx.mine.filter((u) => hasWeapon(u.t) && !UNITS[u.t].cap).length;
  // Weight the enemy mix by value. Before scouting much, assume the opponent fields its usual staples.
  const foes = ctx.enemies.map((e) => ({ t: e.t, v: UNITS[e.t].cost * disp(e.hp) / 10 }));
  if (foes.length < 4) for (const t of EXPECTED[1 - side]) foes.push({ t, v: UNITS[t].cost * 0.6 });
  const tot = foes.reduce((a, f) => a + f.v, 0) || 1;
  const count = {};
  for (const u of ctx.mine) count[u.t] = (count[u.t] || 0) + 1;
  const wantCaps = Math.min(5, 2 + Math.ceil(neutral / 2));
  let best = null, bs = -1e9;
  for (const t of roster) {
    const U = UNITS[t], cost = unitCost(S, side, t);
    let eff = 0, vul = 0;
    for (const f of foes) {
      const w = f.v / tot;
      eff += w * bestBase(t, UNITS[f.t].cls) / 100;
      vul += w * bestBase(f.t, U.cls) / 100;
    }
    // combat quality (what it hits, how hard it is hit), scaled up for pricier units so money gets spent
    let sc = Math.min(eff, 1.1) * (1.25 - Math.min(vul, 1.2) * 0.6) * Math.pow(cost, 0.6);
    sc /= 1 + 0.18 * (count[t] || 0);
    if (U.cap) {
      if (caps < wantCaps) sc = Math.max(sc, 180 + (wantCaps - caps) * 35 - cost / 100);
      else if (myCombat < 3) sc *= 0.5;
    }
    if (U.mesh) sc = myCombat >= 4 && !count[t] ? 120 : -1;
    if (U.jam) sc = enemyDrones >= 2 && !count[t] ? 160 + enemyDrones * 10 : -1;
    if (U.kamikaze) sc *= 0.8;
    if (isNaval(t) && !ctx.enemies.some((e) => isNaval(e.t))) sc *= 0.3;
    if (co.cost && co.cost(t) < 1) sc *= 1.15;
    if (S.diff !== 'hard') sc *= frand(0.88, 1.12);
    if (sc > bs) { bs = sc; best = t; }
  }
  return bs > 20 ? best : null;
}

// Returns the next action, or {kind:'end'}.
function aiNext(S, side) {
  const ctx = aiContext(S, side);
  const lvl = aiPowerChoice(S, side, ctx);
  if (lvl) { S.sides[side].usedThisTurn = true; return { kind: 'power', level: lvl }; }
  let best = null;
  for (const u of ctx.mine) {
    if (u.done) continue;
    const c = evalUnit(S, ctx, u);
    // nudge: units standing on our own factories move first so production isn't blocked
    const t = tileAt(S, u.x, u.y);
    if (t.o === side && TER[t.k].build) c.score += 1;
    if (!best || c.score > best.score) best = c;
  }
  if (best) {
    const u = S.units.find((w) => w.id === best.id);
    const r = reach(S, u);
    return { kind: 'unit', id: u.id, path: pathTo(S, r, best.x, best.y), act: best.act, target: best.target };
  }
  // production
  const free = buildTilesFor(S, side);
  const hq = S.tiles.findIndex((t) => t.k === 'hq' && t.o === 1 - side);
  const hx = hq % S.w, hy = (hq / S.w) | 0;
  const rank = { ground: 0, air: 1, sea: 2 };
  free.sort((a, b) => rank[a.kind] - rank[b.kind] || mdist(a.x, a.y, hx, hy) - mdist(b.x, b.y, hx, hy));
  for (const f of free) {
    const t = chooseBuild(S, ctx, f.kind, S.sides[side].funds);
    if (t) return { kind: 'build', t, x: f.x, y: f.y };
  }
  return { kind: 'end' };
}
