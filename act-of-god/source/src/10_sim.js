// Act of God — the city's life: damage, collapse and casualties, fire spreading through buildings, trees and grass,
// disease, the injured and their treatment, panic and evacuation, the power grid, snow and vegetation, wind, and mood.

const SIM = { burning: [], trees: [], cells: new Map(), fuel: null, sites: [], infected: [], dark: [], shields: [], acc: 0, acc2: 0, falling: [], growing: [], moodLog: [] };
G.wind = { x: 3, z: 1, a: 0.3, s: 4 };

function resetSim() {
  Object.assign(SIM, { burning: [], trees: [], cells: new Map(), sites: [], infected: [], dark: [], shields: [], acc: 0, acc2: 0, falling: [], growing: [], moodLog: [] });
  G.threats = []; G.deaths = []; G.deathMap = new Map(); G.incidents = []; G.effects = []; G.gather = null; G.quake = 0; G.storm = 0; G.snowAt = false;
  G.wind = { x: 3, z: 1, a: rr(0, TAU), s: rr(2, 6) };
  const S = G.stats = newStats();
  S.pop0 = S.pop = W.popCap;
  // what can burn on the ground
  const V = W.V; SIM.fuel = new Float32Array(V * V);
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const t = tileAt(i * W.cs, j * W.cs), h = W.h[j * V + i];
    SIM.fuel[j * V + i] = h < 0.5 ? 0 : t === T_FOREST ? 1 : t === T_FIELD ? 0.8 : t === T_PARK || t === T_GRASS ? 0.6 : t === T_YARD ? 0.35 : 0;
  }
  if (W.gen.biome === 'desert') for (let k = 0; k < V * V; k++) SIM.fuel[k] *= 0.4;
}
// how readily a building catches fire from its neighbours
const FLAMMABLE = { house: 1, shop: 0.7, church: 0.6, ind: 0.6, apt: 0.3, station: 0.3, tower: 0.1, hospital: 0.15, hall: 0.2, stadium: 0.2, bridge: 0 };
const FLAM = (b) => (b.special === 'barn' ? 1 : FLAMMABLE[b.kind] ?? 0.4);
const popScale = () => G.stats.pop / Math.max(1, W.popCap);
// how many of a building's people are inside at this hour
function presence(b) {
  const day = G.hour > 7.5 && G.hour < 19;
  switch (b.kind) {
    case 'tower': case 'shop': case 'ind': case 'hall': return day ? 0.9 : 0.2;
    case 'house': case 'apt': return day ? 0.5 : 0.95;
    case 'stadium': return G.hour > 13 && G.hour < 22 ? 0.9 : 0.02;
    case 'church': return (G.day % 7 === 6 && G.hour > 9 && G.hour < 12) ? 1 : 0.3;
    default: return 0.7;
  }
}
const occupants = (b) => b.pop * popScale() * presence(b) * (1 - b.evac * 0.92) * (b.occ === undefined ? 1 : b.occ);

// ---------- incidents (what the news reports) ----------
function newIncident(type, x, z, o = {}) {
  const inc = Object.assign({ type, x, z, district: districtName_(x, z), t0: G.t, deaths: 0, injured: 0, destroyed: 0, damage: 0, saved: 0, healed: 0, built: 0, reported: 0, lastNews: 0, last: { deaths: 0, destroyed: 0 }, mag: 0 }, o);
  G.incidents.push(inc);
  if (G.incidents.length > 60) G.incidents.shift();
  bus.emit('incident', inc);
  return inc;
}

// ---------- casualties ----------
function kill(n, x, z, inc) {
  const S = G.stats;
  if (!(n > 0) || !isFinite(x + z)) { if (DEBUG && !(n === 0 || n < 0)) console.error('kill: bad input', n, x, z, new Error().stack); return 0; }
  n = Math.min(n, S.pop - 1);
  if (n < 0.5) return 0;
  n = Math.round(n);
  S.pop -= n; S.dead += n;
  if (inc) inc.deaths += n;
  const k = Math.floor(x / 80) * 1000 + Math.floor(z / 80);
  let d = G.deathMap.get(k);
  if (!d) { d = { x, z, n: 0, t: G.t }; G.deathMap.set(k, d); G.deaths.push(d); }
  d.n += n; d.t = G.t;
  SIM.moodLog.push([G.t, n]);
  return n;
}
function injure(n, x, z, inc) {
  n = Math.round(n);
  if (n < 1) return;
  const S = G.stats;
  S.injured += n;
  if (inc) inc.injured += n;
  let s = SIM.sites.find((q) => dist2(q.x, q.z, x, z) < 200 * 200);
  if (!s) { s = { x, z, injured: 0, amb: 0, t: G.t }; SIM.sites.push(s); }
  s.injured += n;
}
function treatInjured(n) { const S = G.stats; n = Math.min(n, S.injured); S.injured -= n; S.treated += n; }
function healArea(x, z, r) { // the Heal power: everyone injured nearby recovers
  let n = 0;
  for (const s of SIM.sites) if (dist2(s.x, s.z, x, z) < (r + 120) ** 2) { n += s.injured; s.injured = 0; }
  treatInjured(n);
  return n;
}

// ---------- damage ----------
function shielded(x, z) { for (const s of SIM.shields) if (dist2(s.x, s.z, x, z) < s.r * s.r) return s; return null; }
function hurt(b, amt, cause, inc) {
  if (b.state !== 0 || amt <= 0) return false;
  const sh = shielded(b.x, b.z);
  if (sh) { sh.hits = (sh.hits || 0) + amt; return false; }
  const before = b.hp;
  b.hp -= amt;
  const S = G.stats;
  const loss = b.value * Math.min(amt, Math.max(0, before));
  S.damage += loss; if (inc) inc.damage += loss;
  if (before >= 0.98 && b.hp < 0.98) S.damaged++;
  b.dmg = Math.max(b.dmg, clamp((1 - b.hp) * 0.75, 0, 0.8));
  if (b.hp <= 0) { collapse(b, cause, inc); return true; }
  bUpdate(b);
  return false;
}
const LETHAL = { quake: 0.3, tornado: 0.25, meteor: 0.7, vapor: 1, fire: 0.12, flood: 0.18, tsunami: 0.45, lava: 0.6, sink: 0.7, wind: 0.12, smite: 1, blizzard: 0.08, volcano: 0.6 };
// a building comes down: casualties, rubble, dust and blocked roads
function collapse(b, cause, inc, o = {}) {
  if (b.state !== 0) return;
  const S = G.stats;
  const occ = occupants(b);
  const leth = (LETHAL[cause] || 0.25) * (o.leth || 1);
  const dead = occ * leth * rr(0.75, 1.15);
  kill(dead, b.x, b.z, inc);
  if (leth < 1) injure(occ * (1 - leth) * 0.35, b.x, b.z, inc);
  b.occ = 0;
  S.destroyed++; if (inc) inc.destroyed++;
  const rest = b.value * Math.max(0, b.hp + 1) * 0.5;
  S.damage += rest; if (inc) inc.damage += rest;
  b.hp = 0; b.fire = o.vapor ? 0 : b.fire; b.dmg = Math.max(b.dmg, 0.55);
  b.tilt = o.vapor ? 0 : rr(0.05, b.h > 60 ? 0.35 : 0.2); b.tiltA = o.dir !== undefined ? o.dir : rr(0, TAU);
  b.state = 1; b.cv = 0; b.c = 0; b.sinkTo = o.sink || 0;
  b.fallSpeed = o.vapor ? 2.5 : o.fast ? 1.4 : clamp(9 / Math.sqrt(b.h + 8), 0.4, 1.6);
  if (o.vapor) { b.state = 3; b.c = 1; bUpdate(b); S.vaporized = (S.vaporized || 0) + 1; return; }
  SIM.falling.push(b);
  if (b.kind === 'bridge' && b.edge) { b.edge.open = false; }
  // rubble spills onto nearby roads
  const spill = Math.min(80, b.h * 0.45 + 6);
  edgesNear(b.x, b.z, spill + 60, (e) => { if (segDist(b.x, b.z, e) < spill) { e.rubble = (e.rubble || 0) + 1; e.open = false; } });
  if (FX_NEAR(b.x, b.z) || b.h > 40) {
    const n = clamp(Math.round(b.h / 4), 4, 30);
    for (let i = 0; i < n; i++) puffDust(b.x + rr(-b.w, b.w) * 0.5, b.y + rr(0, b.h * 0.3), b.z + rr(-b.d, b.d) * 0.5, clamp(b.w * 0.6, 8, 40), rr(8, 16));
    throwDebris(b.x, b.y + b.h * 0.5, b.z, clamp(Math.round(b.h / 6), 3, 16), 10, b.parts.map((p) => p.col), clamp(b.w * 0.12, 1.2, 4));
  }
  AUDIO.crash(b.x, b.z, clamp(b.h / 80, 0.3, 1.5));
  bus.emit('collapse', b);
}
function segDist(x, z, e) {
  const ax = e.a.x, az = e.a.z, dx = e.b.x - ax, dz = e.b.z - az, L2 = dx * dx + dz * dz;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
  return dist(x, z, ax + dx * t, az + dz * t);
}
function ignite(b, f = 0.3, inc) {
  if (b.state !== 0 || b.burnt || b.kind === 'bridge' || shielded(b.x, b.z)) return false;
  if (b.snow > 0.6 || waterDepth(b.x, b.z) > 0.8) return false;
  if (b.fire <= 0) { SIM.burning.push(b); b.fireInc = inc || b.fireInc || null; G.stats.burning++; }
  b.fire = Math.max(b.fire, f);
  bUpdate(b);
  return true;
}
function igniteTree(t) {
  if (t.state !== 0 || t.snow > 0.5) return;
  t.state = 1; t.burn = 1; t.bt = rr(10, 22);
  SIM.trees.push(t);
  tUpdate(t);
}
function igniteCell(x, z, inc) {
  const k = cellK(x, z);
  if (SIM.fuel[k] <= 0.05 || SIM.cells.has(k) || W.ov[k * 4] > 120 || WATER.d[k] > 0.1) return false;
  SIM.cells.set(k, { t: rr(6, 14) * SIM.fuel[k], inc });
  return true;
}
function douse(x, z, r, amt) { // put fires out in a disc
  let n = 0;
  forBuildings(x, z, r, (b) => { if (b.fire > 0) { b.fire = Math.max(0, b.fire - amt); n++; if (b.fire <= 0) bUpdate(b); } });
  forTrees(x, z, r, (t) => { if (t.state === 1) { t.state = 0; t.burn = 0; t.leaf = Math.min(t.leaf, 0.6); tUpdate(t); n++; } });
  for (const [k] of SIM.cells) { const i = k % W.V, j = (k / W.V) | 0; if (dist2(i * W.cs, j * W.cs, x, z) < r * r) { SIM.cells.delete(k); n++; } }
  return n;
}

// ---------- restoring ----------
// raises a fallen or burnt building back to new (the Restore power)
function rebuild(b) {
  if (b.state === 0 && b.hp > 0.98 && !b.burnt && b.dmg < 0.02 && b.fire <= 0) return false;
  const was = b.state;
  b.hp = 1; b.dmg = 0; b.fire = 0; b.burnt = false; b.inf = 0; b.evac = 0; b.occ = 1; b.sink = 0; b.sinkTo = 0;
  const r = reseat(b);
  if (was >= 1) { b.state = 0; b.c = 1; b.cv = -1; b.tilt = 0; SIM.growing.push(b); G.stats.destroyed = Math.max(0, G.stats.destroyed - 1); }
  if (b.kind === 'bridge' && b.edge) { b.y = 0; b.edge.open = true; b.edge.rubble = 0; }
  bUpdate(b);
  return true;
}
function reopenEdges(x, z, r) {
  edgesNear(x, z, r + 60, (e) => {
    if (segDist(x, z, e) > r) return;
    e.rubble = 0;
    if (e.bridge && e.bridgeB && e.bridgeB.state !== 0) return;
    e.open = true;
  });
}

// ---------- threats (what people run from) ----------
function addThreat(x, z, r, t, o = {}) { const th = Object.assign({ x, z, r, t }, o); G.threats.push(th); return th; }
function nearestThreat(x, z, maxD = 1e9) {
  let best = null, bd = maxD * maxD;
  for (const t of G.threats) { const d = dist2(t.x, t.z, x, z) - t.r * t.r; if (d < bd) { bd = d; best = t; } }
  return best;
}

// ---------- the per-frame and per-tick simulation ----------
function simUpdate(dt) {
  const S = G.stats;
  // wind wanders
  G.wind.a += (vnoise(G.t * 0.01, 0, 5) - 0.5) * dt * 0.05;
  const ws = G.wind.s * (1 + G.storm * 3);
  G.wind.x = Math.cos(G.wind.a) * ws; G.wind.z = Math.sin(G.wind.a) * ws;
  // falling and rising buildings animate every frame
  for (const b of SIM.falling) {
    b.c = Math.min(1, b.c + dt * b.fallSpeed * (0.3 + b.c));
    b.sink = lerp(0, b.sinkTo || 0, b.c);
    if (Math.random() < dt * 8 && FX_NEAR(b.x, b.z)) puffDust(b.x + rr(-b.w, b.w) * 0.6, b.y + 2, b.z + rr(-b.d, b.d) * 0.6, clamp(b.w * 0.5, 6, 30), 10);
    if (b.c >= 1) { b.state = 2; if (b.kind === 'bridge') b.vis = false; }
    bUpdate(b);
  }
  SIM.falling = SIM.falling.filter((b) => b.state === 1);
  for (const b of SIM.growing) {
    b.c = Math.max(0, b.c - dt * 0.6);
    if (Math.random() < dt * 6 && FX_NEAR(b.x, b.z)) FX.add.emit(b.x + rr(-b.w, b.w) * 0.5, b.y + b.h * (1 - b.c), b.z + rr(-b.d, b.d) * 0.5, 0, rr(2, 6), 0, 1.4, 4, 0, 1, 0.85, 0.5, 0.8);
    bUpdate(b);
  }
  SIM.growing = SIM.growing.filter((b) => b.c > 0);
  // fire visuals for the burning buildings near the camera
  let shown = 0;
  for (const b of SIM.burning) {
    if (b.fire <= 0 || b.state >= 2) continue;
    if (!FX_NEAR(b.x, b.z) && b.h < 50) continue;
    if (shown++ > 70) break;
    const f = b.fire, top = b.y + b.h * (1 - b.c * 0.9);
    const rate = f * clamp(b.w * b.d / 300, 0.5, 4) * 6;
    if (Math.random() < rate * dt) flame(b.x + rr(-0.5, 0.5) * b.w, b.y + rr(0.2, 1) * (top - b.y), b.z + rr(-0.5, 0.5) * b.d, clamp(b.w * 0.35, 3, 14) * (0.6 + f));
    if (Math.random() < rate * dt * 0.5) puffSmoke(b.x + rr(-0.3, 0.3) * b.w, top + 2, b.z + rr(-0.3, 0.3) * b.d, clamp(b.w * 0.5, 6, 26) * (0.5 + f), 0.12, 12, 6);
  }
  for (const t of SIM.trees) if (t.state === 1 && Math.random() < dt * 3 && FX_NEAR(t.x, t.z)) flame(t.x, t.y + 3 * t.s, t.z, 4 * t.s);
  let ci = 0;
  for (const [k] of SIM.cells) {
    if (ci++ > 220) break;
    if (Math.random() > dt * 2.5) continue;
    const x = (k % W.V) * W.cs + rr(-0.5, 0.5) * W.cs, z = ((k / W.V) | 0) * W.cs + rr(-0.5, 0.5) * W.cs;
    if (!FX_NEAR(x, z)) continue;
    flame(x, heightAt(x, z), z, rr(3, 6) * (W.cs / 12));
    if (Math.random() < 0.3) puffSmoke(x, heightAt(x, z) + 3, z, 10, 0.2, 10, 4);
  }
  // threats expire
  for (const t of G.threats) t.t -= dt;
  G.threats = G.threats.filter((t) => t.t > 0);
  if (G.gather) { G.gather.t -= dt; if (G.gather.t <= 0) G.gather = null; }
  SIM.acc += dt;
  if (SIM.acc >= 0.25) { simTick(SIM.acc); SIM.acc = 0; }
  SIM.acc2 += dt;
  if (SIM.acc2 >= 1) { simSlow(SIM.acc2); SIM.acc2 = 0; }
}
// four times a second: fire
function simTick(dt) {
  const S = G.stats;
  const wx = G.wind.x, wz = G.wind.z, wl = Math.hypot(wx, wz) + 0.01;
  for (const b of SIM.burning) {
    if (b.fire <= 0 || b.state >= 2) continue;
    const wet = waterDepth(b.x, b.z) > 0.6 || G.rainAt && G.rainAt(b.x, b.z) > 0.3;
    if (wet) { b.fire = Math.max(0, b.fire - dt * 0.15); continue; }
    if (b.snow > 0.4) b.fire = Math.max(0, b.fire - dt * 0.05);
    b.fire = Math.min(1, b.fire + dt * 0.05 * (1 - b.fire * 0.5));
    // the building burns down
    const burnRate = b.kind === 'house' || b.kind === 'shop' || b.kind === 'church' ? 0.012 : b.kind === 'ind' ? 0.01 : 0.005;
    b.hp -= dt * burnRate * b.fire;
    b.dmg = Math.max(b.dmg, (1 - b.hp) * 0.95);
    const loss = b.value * dt * burnRate * b.fire;
    S.damage += loss; if (b.fireInc) b.fireInc.damage += loss;
    b.evac = Math.min(1, b.evac + dt * 0.08);
    if (Math.random() < dt * 0.5) { const occ = occupants(b); kill(occ * 0.01 * b.fire, b.x, b.z, b.fireInc); injure(occ * 0.01 * b.fire, b.x, b.z, b.fireInc); }
    if (b.hp <= 0.15) {
      if (b.h > 25 && Math.random() < 0.7) collapse(b, 'fire', b.fireInc);
      else { b.burnt = true; b.fire = 0; b.hp = 0; b.dmg = 1; b.occ = 0; S.destroyed++; if (b.fireInc) b.fireInc.destroyed++; bUpdate(b); }
      continue;
    }
    // spread to neighbours, downwind more
    if (Math.random() < dt * b.fire * (0.25 + 0.6 * FLAM(b))) {
      const r = clamp(Math.max(b.w, b.d) * 0.5 + 9, 10, 40);
      const cx = b.x + wx / wl * r * 0.35, cz = b.z + wz / wl * r * 0.35;
      forBuildings(cx, cz, r, (o, d) => { if (o !== b && o.fire <= 0 && o.state === 0 && !o.burnt && Math.random() < 0.35 * FLAM(o) * (1 - d / (r + 10))) ignite(o, 0.12, b.fireInc); });
      forTrees(b.x, b.z, r * 0.8, (t) => { if (Math.random() < 0.25) igniteTree(t); });
    }
    bUpdate(b);
  }
  const before = SIM.burning.length;
  SIM.burning = SIM.burning.filter((b) => b.fire > 0 && b.state < 2);
  S.burning = SIM.burning.length;
  // trees
  for (const t of SIM.trees) {
    if (t.state !== 1) continue;
    t.bt -= dt;
    if (Math.random() < dt * 0.8) {
      const r = 16 + Math.hypot(wx, wz) * 1.5;
      forTrees(t.x + wx * 1.2, t.z + wz * 1.2, r, (o) => { if (Math.random() < 0.25) igniteTree(o); });
      forBuildings(t.x, t.z, 18, (b) => { if (Math.random() < 0.15 * FLAM(b)) ignite(b, 0.1); });
      if (Math.random() < 0.35) igniteCell(t.x + rr(-12, 12), t.z + rr(-12, 12));
    }
    if (t.bt <= 0) { t.state = 2; t.burn = 0; tUpdate(t); }
  }
  SIM.trees = SIM.trees.filter((t) => t.state === 1);
  // ground fires
  const V = W.V, cs = W.cs;
  const add = [];
  for (const [k, c] of SIM.cells) {
    c.t -= dt;
    if (WATER.d[k] > 0.1 || W.ov[k * 4] > 120) { SIM.cells.delete(k); continue; }
    if (Math.random() < dt * 0.6) {
      const i = k % V, j = (k / V) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = 0.25 + 0.5 * Math.max(0, (di * wx + dj * wz) / wl) * Math.min(1, wl / 6);
        if (Math.random() < p) add.push([(i + di) * cs, (j + dj) * cs, c.inc]);
      }
      const x = i * cs, z = j * cs;
      forTrees(x, z, cs * 0.8, (t) => { if (Math.random() < 0.4) igniteTree(t); });
      forBuildings(x, z, cs * 0.6, (b) => { if (Math.random() < 0.12 * FLAM(b)) ignite(b, 0.1, c.inc); });
    }
    if (c.t <= 0) {
      SIM.cells.delete(k); SIM.fuel[k] = 0;
      W.ov[k * 4 + 1] = Math.max(W.ov[k * 4 + 1], 170); W.ov[k * 4 + 3] = Math.min(W.ov[k * 4 + 3], 40); W.ovDirty = true;
    }
  }
  for (const [x, z, inc] of add) if (inWorld(x, z, 1)) igniteCell(x, z, inc);
}
// once a second: disease, the injured, panic, power, snow, vegetation and mood
function simSlow(dt) {
  const S = G.stats;
  // disease: an SIR model in each building, spreading to neighbours and further by commuters
  let infected = 0;
  for (const b of SIM.infected) {
    if (b.inf <= 0.001) continue;
    if (b.state >= 2) { b.inf = 0; continue; }
    const s = Math.max(0, 1 - b.inf - b.rec);
    const beta = 0.11 * (G.goldAt && G.goldAt(b.x, b.z) ? 0 : 1), gamma = 0.03;
    const near = nearestHospital(b.x, b.z);
    const care = near && dist2(near.x, near.z, b.x, b.z) < 600 * 600 ? 0.4 : 1;
    const ni = beta * b.inf * s * dt, nr = gamma * b.inf * dt;
    const pop = b.pop * popScale();
    kill(pop * b.inf * 0.0035 * care * dt * (b.virulence || 1), b.x, b.z, b.infInc);
    b.inf = clamp(b.inf + ni - nr, 0, 1); b.rec = clamp(b.rec + nr, 0, 1);
    infected += pop * b.inf;
    if (Math.random() < b.inf * dt * 1.2) forBuildings(b.x, b.z, 70, (o) => { if (o !== b && o.inf <= 0.001 && o.rec < 0.5 && o.state === 0 && Math.random() < 0.2) infect(o, 0.02, b.infInc, b.virulence); });
    if (Math.random() < b.inf * dt * 0.08) { const o = pick(W.buildings); if (o.state === 0 && o.rec < 0.5 && o.pop > 0) infect(o, 0.02, b.infInc, b.virulence); }
    bUpdate(b);
  }
  SIM.infected = SIM.infected.filter((b) => b.inf > 0.001);
  S.infected = infected;
  // the injured: treated in hospitals, or some die waiting
  const hospOk = W.hospitals.filter((h) => h.state === 0).length / Math.max(1, W.hospitals.length);
  for (const s of SIM.sites) {
    if (s.injured <= 0) continue;
    const t = Math.min(s.injured, s.injured * 0.02 * hospOk * dt + (hospOk > 0 ? 0.2 : 0));
    s.injured -= t; treatInjured(t);
    const d = s.injured * 0.003 * (1.5 - hospOk) * dt;
    if (d > 0.3) { s.injured -= d; S.injured = Math.max(0, S.injured - d); kill(d, s.x, s.z, null); }
  }
  SIM.sites = SIM.sites.filter((s) => s.injured > 0.5 || G.t - s.t < 20);
  // panic: people near danger evacuate; calm returns slowly
  for (const th of G.threats) {
    if (th.calm) continue;
    forBuildings(th.x, th.z, th.r * 2.2, (b) => { b.evac = Math.min(1, b.evac + dt * 0.12); b.panic = Math.min(1, b.panic + dt * 0.3); });
  }
  // power comes back as crews repair it
  for (const d of SIM.dark) {
    d.t -= dt;
    if (d.t <= 0) {
      forBuildings(d.x, d.z, d.r, (b) => { if (b.power < 1 && !shieldedDark(b)) { b.power = 1; bUpdate(b); } });
      ovPaint(d.x, d.z, d.r, 2, 1, 'set', 0.2);
    }
  }
  SIM.dark = SIM.dark.filter((d) => d.t > 0);
  // saplings from Bloom grow in
  if (SIM.sprout) { for (const t of SIM.sprout) if (t.leaf < 1 && t.state === 0) { t.leaf = Math.min(1, t.leaf + 0.2); tUpdate(t); } SIM.sprout = SIM.sprout.filter((t) => t.leaf < 1 && t.state === 0); }
  // snow melts and plants recover a little every second
  if (G.t % 4 < dt) slowFields();
  // dispatch the emergency services
  dispatch();
  // mood: deaths in the last minute weigh most, then fear, then the city's state
  const now = G.t;
  SIM.moodLog = SIM.moodLog.filter((m) => now - m[0] < 90);
  const recentN = SIM.moodLog.reduce((a, m) => a + m[1], 0);
  const recent = Math.log10(1 + recentN) * 2 + recentN / Math.max(1, S.pop0) * 1000;
  const threat = G.threats.filter((t) => !t.calm).length;
  const lost = S.destroyed / Math.max(1, W.buildings.length);
  const target = clamp(70 - Math.min(40, recent * 6) - Math.min(18, threat * 4) - lost * 60 - (S.infected / Math.max(1, S.pop)) * 200 - S.dark * 0.5 + (G.joy || 0), 0, 100);
  S.mood = damp(S.mood, target, 0.15, dt);
  G.joy = Math.max(0, (G.joy || 0) - dt * 0.12);
  S.panic = threat;
}
function shieldedDark(b) { return SIM.dark.some((d) => d.t > 0 && dist2(d.x, d.z, b.x, b.z) < d.r * d.r); }
function infect(b, amt, inc, vir = 1) {
  if (b.state !== 0 || shielded(b.x, b.z)) return;
  if (b.inf <= 0.001) SIM.infected.push(b);
  b.inf = Math.min(1, b.inf + amt); b.infInc = inc || b.infInc; b.virulence = vir;
  bUpdate(b);
}
// snow melts, scorched and eaten land greens back toward normal, very slowly
function slowFields() {
  const ov = W.ov, n = W.V * W.V;
  const cold = G.coldAt;
  for (let k = 0; k < n; k++) {
    const o = k * 4;
    if (ov[o] > 0 && !(cold && cold((k % W.V) * W.cs, ((k / W.V) | 0) * W.cs))) ov[o] = Math.max(0, ov[o] - 2);
    if (ov[o + 3] < 128 && ov[o + 1] < 100) ov[o + 3]++;
    else if (ov[o + 3] > 128 && Math.random() < 0.3) ov[o + 3]--;
  }
  W.ovDirty = true;
  for (const b of W.buildings) if (b.snow > 0 && !(cold && cold(b.x, b.z))) { b.snow = Math.max(0, b.snow - 0.02); bUpdate(b); }
  for (const t of W.trees) if (t.snow > 0 && !(cold && cold(t.x, t.z))) { t.snow = Math.max(0, t.snow - 0.02); tUpdate(t); }
}
