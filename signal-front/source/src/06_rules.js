// Signal Front — game rules: state, movement, fog of war, combat, capture, production, turns, CO powers
// Rules are synchronous and side-agnostic; the UI and the AI both drive the game through these calls.

let S = null; // the current game

const disp = (hp) => Math.ceil(hp / 10); // displayed HP 0-10 from internal 0-100
const tileAt = (S, x, y) => S.tiles[y * S.w + x];
const inb = (S, x, y) => x >= 0 && y >= 0 && x < S.w && y < S.h;
const coOf = (S, side) => COS[S.sides[side].co];
function bump(S) { S.ver = (S.ver || 0) + 1; }

function unitAt(S, x, y) {
  for (const u of S.units) if (u.x === x && u.y === y) return u;
  return null;
}
function occGrid(S) {
  const g = new Array(S.w * S.h).fill(null);
  for (const u of S.units) g[u.y * S.w + u.x] = u;
  return g;
}
function mkUnit(S, t, side, x, y) {
  const U = UNITS[t];
  return { id: S.nextId++, t, s: side, x, y, hp: 100, fuel: U.fuel, ammo: U.w1 ? U.w1.ammo : 0, done: false, cargo: [], cap: false };
}

function newGame(o) {
  const def = MAPS.find((m) => m.id === o.map) || MAPS[0];
  const m = buildMap(def);
  const side = (i, co) => ({ co, funds: o.funds || 0, meter: 0, uses: 0, pw: 0, ever: false, ai: i === 1 || !!o.allAI,
    stats: { built: 0, lost: 0, kills: 0, dealt: 0, captured: 0 } });
  S = { v: 1, ver: 0, map: def.id, name: def.name, w: m.w, h: m.h, tiles: m.tiles, units: [], nextId: 1,
    day: 1, turn: 0, fog: !!o.fog, income: o.income || 1000, diff: o.diff || 'normal',
    sides: [side(0, o.coP || 'kade'), side(1, o.coE || 'volsk')], winner: -1, over: false };
  S.firstEvents = startTurn(S);
  return S;
}

// ---------------- commander modifiers ----------------
function pwOf(S, side) { return S.sides[side].pw; }
function moveRange(S, u) {
  const co = coOf(S, u.s);
  return UNITS[u.t].move + (co.move ? co.move(S, u, pwOf(S, u.s)) : 0);
}
function attackRange(S, u) {
  const w = UNITS[u.t].w1 && UNITS[u.t].w1.range ? UNITS[u.t].w1.range : [1, 1];
  const co = coOf(S, u.s);
  const ext = isIndirect(u.t) && co.range ? co.range(S, u, pwOf(S, u.s)) : 0;
  return [w[0], w[1] + ext];
}
function visionOf(S, u) {
  const co = coOf(S, u.s);
  let v = UNITS[u.t].vis + (co.vision ? co.vision(S, u) : 0);
  if (tileAt(S, u.x, u.y).k === 'mount' && (UNITS[u.t].mt === 'foot' || UNITS[u.t].mt === 'boot')) v += 3;
  return v;
}
function unitCost(S, side, t) {
  const co = coOf(S, side);
  return Math.round(UNITS[t].cost * (co.cost ? co.cost(t) : 1));
}
function towersOf(S, side) {
  if (S._twv !== S.ver) { S._twv = S.ver; S._tw = [0, 0]; for (const t of S.tiles) if (t.k === 'tower' && t.o >= 0) S._tw[t.o]++; }
  return S._tw[side];
}
function nearUnit(S, side, x, y, r, pred) {
  for (const u of S.units) if (u.s === side && pred(u) && mdist(u.x, u.y, x, y) <= r) return true;
  return false;
}
const meshed = (S, u, x, y) => nearUnit(S, u.s, x, y, 2, (w) => UNITS[w.t].mesh && w !== u);
const jammed = (S, u, x, y) => isDrone(u.t) && nearUnit(S, 1 - u.s, x, y, 2, (w) => UNITS[w.t].jam);
function atkMod(S, u, x, y) {
  const co = coOf(S, u.s), pw = pwOf(S, u.s);
  let m = (co.atk ? co.atk(S, u, pw) : 0) + (pw ? 10 : 0) + towersOf(S, u.s) * 10;
  if (meshed(S, u, x, y)) m += 10;
  if (jammed(S, u, x, y)) m -= 30;
  return m;
}
function defMod(S, u, x, y) {
  const co = coOf(S, u.s), pw = pwOf(S, u.s);
  let m = (co.def ? co.def(S, u, pw) : 0) + (pw ? 10 : 0);
  if (meshed(S, u, x, y)) m += 10;
  return m;
}

// ---------------- fog of war ----------------
const VIS = { ver: -1, maps: [] };
function visMap(S, side) {
  if (VIS.ver !== S.ver || VIS.S !== S) { VIS.ver = S.ver; VIS.S = S; VIS.maps = []; }
  if (VIS.maps[side]) return VIS.maps[side];
  const v = new Uint8Array(S.w * S.h);
  const co = coOf(S, side);
  if (!S.fog || (co.reveal && co.reveal(S, pwOf(S, side)))) v.fill(1);
  else {
    S.tiles.forEach((t, i) => { if (t.o === side) v[i] = 1; });
    for (const u of S.units) {
      if (u.s !== side) continue;
      const r = visionOf(S, u), deep = UNITS[u.t].mesh ? 2 : 1;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const d = Math.abs(dx) + Math.abs(dy), x = u.x + dx, y = u.y + dy;
        if (d > r || !inb(S, x, y)) continue;
        if (TER[tileAt(S, x, y).k].cover && d > deep) continue;
        v[y * S.w + x] = 1;
      }
    }
  }
  VIS.maps[side] = v;
  return v;
}
function canSee(S, side, u) {
  if (u.s === side) return true;
  if (!visMap(S, side)[u.y * S.w + u.x]) return false;
  if (UNITS[u.t].stealth) return nearUnit(S, side, u.x, u.y, 1, () => true);
  return true;
}

// ---------------- movement ----------------
function moveCost(t, k) { return MOVE[UNITS[t].mt][k] || 0; }
// Dijkstra over movement points. Enemies the mover's side can see block; hidden ones don't (ambush).
function reach(S, u, opts = {}) {
  const W = S.w, N = S.w * S.h;
  const mp = opts.mp != null ? opts.mp : Math.min(moveRange(S, u), u.fuel);
  const dist = new Int16Array(N).fill(-1), prev = new Int32Array(N).fill(-1);
  const occ = occGrid(S), costs = MOVE[UNITS[u.t].mt];
  const blockAll = opts.blockAll;
  const start = u.y * W + u.x;
  dist[start] = 0;
  const buckets = [[start]];
  for (let c = 0; c <= mp; c++) {
    const b = buckets[c]; if (!b) continue;
    for (const i of b) {
      if (dist[i] !== c) continue;
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!inb(S, nx, ny)) continue;
        const j = ny * W + nx;
        const mc = costs[S.tiles[j].k];
        if (!mc) continue;
        const nc = c + mc;
        if (nc > mp) continue;
        const o = occ[j];
        if (o && o.s !== u.s && (blockAll || canSee(S, u.s, o))) continue;
        if (dist[j] === -1 || nc < dist[j]) { dist[j] = nc; prev[j] = i; (buckets[nc] = buckets[nc] || []).push(j); }
      }
    }
  }
  return { dist, prev, mp, sx: u.x, sy: u.y };
}
function pathTo(S, r, x, y) {
  const W = S.w; let i = y * W + x;
  if (r.dist[i] < 0) return null;
  const p = [];
  while (i !== -1) { p.push({ x: i % W, y: (i / W) | 0 }); i = r.prev[i]; }
  return p.reverse();
}
function pathCost(S, u, path) {
  let c = 0; for (let i = 1; i < path.length; i++) c += moveCost(u.t, tileAt(S, path[i].x, path[i].y).k);
  return c;
}
// What a unit could do by stopping at (x,y): 'stay' | 'move' | 'load' | 'join' | null
function stopKind(S, u, x, y) {
  const o = unitAt(S, x, y);
  if (!o || o === u) return o === u ? 'stay' : 'move';
  if (o.s !== u.s) return null;
  const U = UNITS[o.t];
  if (U.carry && U.carry.includes(u.t) && o.cargo.length === 0) return 'load';
  if (o.t === u.t && (o.hp < 100 || u.hp < 100) && !o.cargo.length && !u.cargo.length) return 'join';
  return null;
}
// Walk a path; stop short if a hidden enemy is in the way. Returns the truncated path and whether we were trapped.
function trapCheck(S, u, path) {
  for (let i = 1; i < path.length; i++) {
    const o = unitAt(S, path[i].x, path[i].y);
    if (o && o.s !== u.s) {
      let k = i - 1;
      while (k > 0 && unitAt(S, path[k].x, path[k].y) && unitAt(S, path[k].x, path[k].y) !== u) k--;
      return { path: path.slice(0, k + 1), trapped: true, by: o };
    }
  }
  return { path, trapped: false };
}
function commitMove(S, u, path) {
  const last = path[path.length - 1];
  if (last.x !== u.x || last.y !== u.y) {
    if (u.cap) { tileAt(S, u.x, u.y).cp = 20; u.cap = false; }
    u.fuel = Math.max(0, u.fuel - pathCost(S, u, path));
    u.x = last.x; u.y = last.y;
  }
  bump(S);
}

// ---------------- combat ----------------
function weaponFor(S, a, d) {
  const U = UNITS[a.t], cls = UNITS[d.t].cls;
  if (U.w1 && a.ammo > 0 && U.w1.dmg[cls]) return 1;
  if (U.w2 && U.w2.dmg[cls]) return 2;
  return 0;
}
function baseDmg(a, d, w) { const U = UNITS[a.t]; return (w === 1 ? U.w1 : U.w2).dmg[UNITS[d.t].cls] || 0; }
function calcDmg(S, a, ax, ay, d, dx, dy, luck, ahp = a.hp, dhp = d.hp) {
  const w = weaponFor(S, a, d);
  if (!w) return -1;
  const B = baseDmg(a, d, w);
  const atk = 100 + atkMod(S, a, ax, ay), def = 100 + defMod(S, d, dx, dy);
  const stars = isAir(d.t) ? 0 : TER[tileAt(S, dx, dy).k].def;
  const hpd = disp(dhp);
  const v = (B * atk / 100 + luck) * disp(ahp) / 10 * (200 - (def + stars * hpd)) / 100;
  return clamp(Math.floor(v), 0, dhp);
}
function canCounter(S, a, d, dist) {
  if (UNITS[a.t].kamikaze) return false;
  if (dist !== 1 || isIndirect(d.t)) return false;
  return weaponFor(S, d, a) > 0;
}
// Damage preview for the UI and AI: attacker at (ax,ay) hits d.
function forecast(S, a, ax, ay, d) {
  const lo = calcDmg(S, a, ax, ay, d, d.x, d.y, 0), hi = calcDmg(S, a, ax, ay, d, d.x, d.y, 9);
  const mid = calcDmg(S, a, ax, ay, d, d.x, d.y, 4.5);
  let clo = 0, chi = 0;
  if (canCounter(S, a, d, mdist(ax, ay, d.x, d.y))) {
    const lefthi = d.hp - lo, leftlo = d.hp - hi;
    if (leftlo > 0) clo = calcDmg(S, d, d.x, d.y, a, ax, ay, 0, leftlo, a.hp);
    if (lefthi > 0) chi = calcDmg(S, d, d.x, d.y, a, ax, ay, 9, lefthi, a.hp);
    clo = Math.max(0, clo); chi = Math.max(0, chi);
  }
  return { lo, hi, mid, clo, chi, counter: chi > 0 };
}
function targetsFrom(S, u, x, y, moved) {
  if (isIndirect(u.t) && moved) return [];
  const [r0, r1] = attackRange(S, u);
  const out = [];
  for (const e of S.units) {
    if (e.s === u.s || !canSee(S, u.s, e)) continue;
    const d = mdist(x, y, e.x, e.y);
    if (d < r0 || d > r1) continue;
    if (weaponFor(S, u, e) > 0) out.push(e);
  }
  return out;
}
function chargeMeters(S, att, def, lost) {
  if (lost <= 0) return;
  const value = lost * UNITS[def.t].cost / 10;
  const add = (side, v) => { const sd = S.sides[side]; if (!sd.pw) sd.meter = Math.min(sd.meter + v, powerCost(S, side, 2)); };
  add(att.s, value * 0.5); add(def.s, value);
  S.sides[att.s].stats.dealt += value;
}
// One direction of an exchange. Applies damage, ammo and meters. Dead units are removed by removeDead.
function strike(S, a, d) {
  const w = weaponFor(S, a, d);
  const dmg = calcDmg(S, a, a.x, a.y, d, d.x, d.y, irand(0, 9));
  const before = disp(d.hp);
  d.hp -= dmg;
  if (w === 1) a.ammo--;
  chargeMeters(S, a, d, before - disp(Math.max(0, d.hp)));
  if (UNITS[a.t].kamikaze) a.hp = 0;
  if (d.hp <= 0) { S.sides[a.s].stats.kills++; }
  bump(S);
  return { dmg, w, killed: d.hp <= 0, shown: before - disp(Math.max(0, d.hp)) };
}
function removeDead(S) {
  const dead = S.units.filter((u) => u.hp <= 0);
  for (const u of dead) {
    if (u.cap) { tileAt(S, u.x, u.y).cp = 20; }
    S.sides[u.s].stats.lost += 1 + u.cargo.length;
  }
  if (dead.length) { S.units = S.units.filter((u) => u.hp > 0); bump(S); }
  return dead;
}

// ---------------- other actions ----------------
function canCapture(S, u) {
  const t = tileAt(S, u.x, u.y);
  return !!UNITS[u.t].cap && !!TER[t.k].prop && t.o !== u.s;
}
function doCapture(S, u) {
  const t = tileAt(S, u.x, u.y);
  t.cp -= disp(u.hp); u.cap = true; u.done = true;
  let done = false, old = t.o;
  if (t.cp <= 0) {
    done = true; t.o = u.s; t.cp = 20; u.cap = false;
    S.sides[u.s].stats.captured++;
    if (t.k === 'hq' && old >= 0) { S.hqLost = old; }
  }
  bump(S);
  return { done, old, left: Math.max(0, t.cp) };
}
function doJoin(S, u, o) {
  const U = UNITS[u.t];
  const total = disp(u.hp) + disp(o.hp);
  const refund = Math.max(0, total - 10) * U.cost / 10;
  o.hp = Math.min(100, o.hp + u.hp);
  o.fuel = Math.max(o.fuel, u.fuel); o.ammo = Math.max(o.ammo, u.ammo);
  S.sides[u.s].funds += refund;
  S.units = S.units.filter((w) => w !== u);
  o.done = true; bump(S);
  return refund;
}
function doLoad(S, u, o) {
  if (u.cap) { tileAt(S, u.x, u.y).cp = 20; u.cap = false; }
  S.units = S.units.filter((w) => w !== u);
  u.done = true; u.x = o.x; u.y = o.y; o.cargo.push(u);
  bump(S);
}
function dropTiles(S, t) {
  if (!t.cargo.length) return [];
  const c = t.cargo[0], out = [];
  for (const [dx, dy] of DIRS) {
    const x = t.x + dx, y = t.y + dy;
    if (!inb(S, x, y) || unitAt(S, x, y)) continue;
    if (!moveCost(c.t, tileAt(S, x, y).k)) continue;
    out.push({ x, y });
  }
  return out;
}
function doDrop(S, t, x, y) {
  const c = t.cargo.shift();
  c.x = x; c.y = y; c.done = true; S.units.push(c); bump(S);
  return c;
}
function resupply(u) { u.fuel = UNITS[u.t].fuel; if (UNITS[u.t].w1) u.ammo = UNITS[u.t].w1.ammo; }
function needsSupply(u) { const U = UNITS[u.t]; return u.fuel < U.fuel * 0.6 || (U.w1 && u.ammo < U.w1.ammo * 0.5); }
function supplyAround(S, s) {
  const got = [];
  for (const u of S.units) if (u.s === s.s && u !== s && mdist(u.x, u.y, s.x, s.y) === 1) {
    const U = UNITS[u.t];
    if (u.fuel < U.fuel || (U.w1 && u.ammo < U.w1.ammo)) { resupply(u); got.push(u); }
  }
  return got;
}
function buildTilesFor(S, side) {
  const out = [];
  S.tiles.forEach((t, i) => {
    if (t.o !== side || !TER[t.k].build) return;
    const x = i % S.w, y = (i / S.w) | 0;
    if (!unitAt(S, x, y)) out.push({ x, y, kind: TER[t.k].build });
  });
  return out;
}
function buildList(S, side, kind) {
  return FACTIONS[side].roster.filter((t) => buildKind(t) === kind);
}
function doBuild(S, side, t, x, y) {
  const cost = unitCost(S, side, t);
  if (S.sides[side].funds < cost || unitAt(S, x, y)) return null;
  S.sides[side].funds -= cost;
  const u = mkUnit(S, t, side, x, y);
  u.done = true;
  S.units.push(u);
  S.sides[side].ever = true; S.sides[side].stats.built++;
  bump(S);
  return u;
}

// ---------------- CO powers ----------------
function powerCost(S, side, level) {
  const co = coOf(S, side), st = level === 2 ? co.super.stars : co.power.stars;
  return st * STAR * (1 + 0.2 * Math.min(S.sides[side].uses, 5));
}
function canPower(S, side, level) {
  const sd = S.sides[side];
  return !sd.pw && sd.meter >= powerCost(S, side, level) - 0.5;
}
function activatePower(S, side, level) {
  const sd = S.sides[side];
  sd.meter = 0; sd.uses++; sd.pw = level;
  const co = coOf(S, side);
  const res = co.onPower ? co.onPower(S, side, level) : null;
  bump(S);
  return res || null;
}
function healAll(S, side, amt) {
  const hit = [];
  for (const u of S.units) if (u.s === side) { u.hp = Math.min(100, u.hp + amt); resupply(u); hit.push(u); }
  return { kind: 'heal', units: hit };
}
function damageAll(S, side, amt) {
  const hit = [];
  for (const u of S.units) if (u.s === side) { u.hp = Math.max(1, u.hp - amt); hit.push(u); }
  return { kind: 'hurt', units: hit };
}
// Strike the 2-radius diamond holding the most enemy value; non-lethal.
function clusterStrike(S, side, amt, r) {
  let best = null, bv = -1;
  for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
    let v = 0;
    for (const u of S.units) if (u.s !== side && mdist(u.x, u.y, x, y) <= r) v += Math.min(amt, u.hp - 1) * UNITS[u.t].cost;
    if (v > bv) { bv = v; best = { x, y }; }
  }
  const hit = [];
  for (const u of S.units) if (u.s !== side && mdist(u.x, u.y, best.x, best.y) <= r) { u.hp = Math.max(1, u.hp - amt); hit.push(u); }
  return { kind: 'strike', x: best.x, y: best.y, r, units: hit };
}

// ---------------- turns ----------------
function income(S, side) {
  let n = 0;
  for (const t of S.tiles) if (t.o === side && TER[t.k].income) n++;
  let v = n * S.income;
  if (side === 1 && S.sides[1].ai && S.diff === 'hard') v = Math.round(v * 1.25);
  return v;
}
// Start of a side's turn: power ends, income, fuel drain, repairs, supply, jamming.
function startTurn(S) {
  const p = S.turn, sd = S.sides[p], ev = [];
  sd.pw = 0; sd.usedThisTurn = false;
  const inc = income(S, p); sd.funds += inc; ev.push({ kind: 'income', amount: inc });
  for (const u of S.units) if (u.s === p) {
    u.done = false;
    const burn = UNITS[u.t].burn || 0;
    if (burn) {
      u.fuel -= burn;
      if (u.fuel <= 0) { u.hp = 0; ev.push({ kind: 'crash', unit: u }); }
    }
  }
  removeDead(S);
  const co = coOf(S, p), rep = (co.repair || 2) * 10;
  for (const u of S.units) if (u.s === p) {
    const t = tileAt(S, u.x, u.y);
    if (t.o !== p || !TER[t.k].prop || TER[t.k].repair !== repairKind(u.t)) continue;
    resupply(u);
    if (u.hp < 100) {
      const want = Math.min(rep, (10 - disp(u.hp)) * 10);
      const per = UNITS[u.t].cost / 10;
      const afford = Math.min(want / 10, Math.floor(sd.funds / per));
      if (afford > 0) { u.hp = Math.min(100, (disp(u.hp) + afford) * 10); sd.funds -= afford * per; ev.push({ kind: 'repair', unit: u, hp: afford }); }
    }
  }
  for (const u of S.units) if (u.s === p && UNITS[u.t].supply) supplyAround(S, u);
  for (const u of S.units) if (u.s === p && UNITS[u.t].jam) {
    for (const e of S.units) if (e.s !== p && isDrone(e.t) && mdist(e.x, e.y, u.x, u.y) <= 2 && e.hp > 10) {
      e.hp = Math.max(10, e.hp - 10); ev.push({ kind: 'jam', unit: e });
    }
  }
  bump(S);
  return ev;
}
function endTurn(S) {
  for (const u of S.units) if (u.s === S.turn) u.done = false;
  S.turn = 1 - S.turn;
  if (S.turn === 0) S.day++;
  return startTurn(S);
}
function checkVictory(S) {
  if (S.over) return S.winner;
  if (S.hqLost != null) { S.winner = 1 - S.hqLost; S.over = true; S.how = 'hq'; return S.winner; }
  for (let p = 0; p < 2; p++) {
    const sd = S.sides[p];
    const n = S.units.filter((u) => u.s === p).length;
    if (sd.ever && n === 0) { S.winner = 1 - p; S.over = true; S.how = 'rout'; return S.winner; }
  }
  return -1;
}
function unitValue(S, side) {
  let v = 0;
  for (const u of S.units) if (u.s === side) v += UNITS[u.t].cost * disp(u.hp) / 10;
  return v;
}
function propCount(S, side) { let n = 0; for (const t of S.tiles) if (t.o === side && TER[t.k].prop) n++; return n; }
