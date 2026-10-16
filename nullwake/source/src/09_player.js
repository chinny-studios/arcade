// Nullwake — the player: stats, movement, taking damage, experience, level-up choices, chests and evolutions.
const P = { x: 0, y: 0, r: 11, fx: 1, fy: 0, side: 1, mvx: 0, mvy: 0, hp: 100, lvl: 1, xp: 0, next: 5, weapons: [], passives: [], st: null,
  dead: false, hurtT: 0, anim: 0, revives: 0, rerolls: 0, skips: 0, dmgTaken: 0, moving: false };

function recomputeStats() {
  const s = { hpMul: 1, armor: 0, regen: 0, might: 1, cooldown: 1, area: 1, speed: 1, duration: 1, amount: 0, move: 1, magnet: 1, growth: 1, greed: 1, revival: 0, rerolls: 0, skips: 0 };
  const pb = PILOTS[G.pilotId].bonus; for (const k in pb) s[k] += pb[k];
  for (const m of META) { const r = SAVE.meta[m.id] || 0; if (r) s[m.stat] += m.per * r; }
  for (const p of P.passives) { const d = PASSIVES[p.id]; s[d.stat] += d.per * p.lvl; }
  s.cooldown = Math.max(0.4, s.cooldown);
  s.maxHp = Math.round(100 * s.hpMul); s.magnetR = 52 * s.magnet; s.moveSpd = 128 * s.move;
  const old = P.st ? P.st.maxHp : s.maxHp;
  P.st = s;
  if (s.maxHp > old) P.hp += s.maxHp - old;
  P.hp = Math.min(P.hp, s.maxHp);
  for (const w of P.weapons) calcWeapon(w);
  G.invDirty = true;
}

function playerUpdate(dt) {
  if (P.dead) return;
  const m = G.bot ? botMove() : INPUT.move();
  P.mvx = m.x; P.mvy = m.y; P.moving = Math.hypot(m.x, m.y) > 0.1;
  if (P.moving) {
    const l = Math.hypot(m.x, m.y); P.fx = m.x / l; P.fy = m.y / l;
    if (Math.abs(m.x) > 0.15) P.side = m.x < 0 ? -1 : 1;
    P.x += m.x * P.st.moveSpd * dt; P.y += m.y * P.st.moveSpd * dt; P.anim += dt * 8;
  }
  if (P.st.regen && P.hp < P.st.maxHp) P.hp = Math.min(P.st.maxHp, P.hp + P.st.regen * dt);
  if (P.hurtT > 0) P.hurtT -= dt;
}

function hurtPlayer(dmg, src) {
  if (G.god || P.dead || G.won) return;
  const d = Math.max(1, dmg - P.st.armor);
  if (G.dmgLog) G.dmgLog[src] = (G.dmgLog[src] || 0) + d;
  P.hp -= d; P.dmgTaken += d; P.hurtT = 0.2;
  G.hurtFlash = Math.min(0.9, G.hurtFlash + 0.25); if (SAVE.opts.shake) G.shake = Math.max(G.shake, 3);
  sfx('hurt', 0, 0.12);
  if (P.hp <= 0) {
    if (P.revives > 0) {
      P.revives--; P.hp = P.st.maxHp * 0.5;
      for (const e of E) if (!e.dead && !e.boss && !e.prop && Math.hypot(e.x - P.x, e.y - P.y) < 320) killEnemy(e, null);
      EB.length = 0; FX.ring(P.x, P.y, 320, '#7dffa8', 0.7, 8); G.empFlash = 1; banner('BACKUP CLONE ONLINE', 'Hull restored to half', 'info', 2.2); sfx('evolve');
    } else {
      P.hp = 0; P.dead = true; G.overT = 1.8;
      FX.explode(P.x, P.y, 60, '#ffffff'); FX.burst(P.x, P.y, PILOTS[G.pilotId].suit, 30, 220, 0.9, 3); sfx('lose');
    }
  }
}

function addXp(v) {
  P.xp += v * P.st.growth;
  while (P.xp >= P.next) { P.xp -= P.next; P.lvl++; P.next = xpFor(P.lvl); G.pendingLv++; }
}

// ---- level-up choices ----
const ownsWeapon = (id) => P.weapons.some((w) => w.id === id || WEAPONS[w.id].from === id);
const passiveOf = (id) => P.passives.find((p) => p.id === id);
function rollChoices(n = 3) {
  const pool = [];
  for (const w of P.weapons) if (!WEAPONS[w.id].from && w.lvl < MAX_WLV) pool.push({ kind: 'w', id: w.id, wt: 10 });
  for (const p of P.passives) if (p.lvl < PASSIVES[p.id].max) pool.push({ kind: 'p', id: p.id, wt: 7 });
  if (P.weapons.length < MAX_SLOTS) for (const id of BASE_WEAPONS) if (!ownsWeapon(id)) pool.push({ kind: 'w', id, wt: 6, isNew: true });
  if (P.passives.length < MAX_SLOTS) for (const id in PASSIVES) if (!passiveOf(id)) {
    const pairs = P.weapons.some((w) => WEAPONS[w.id].needs === id);
    pool.push({ kind: 'p', id, wt: pairs ? 8 : 4, isNew: true });
  }
  const out = [];
  while (out.length < n && pool.length) {
    let tot = 0; for (const c of pool) tot += c.wt;
    let r = R() * tot, i = 0; for (; i < pool.length - 1; i++) { r -= pool[i].wt; if (r <= 0) break; }
    out.push(pool[i]); pool.splice(i, 1);
  }
  if (!out.length) out.push({ kind: 'heal' }, { kind: 'gold' });
  return out;
}
function choiceInfo(c) {
  if (c.kind === 'w') {
    const d = WEAPONS[c.id], w = P.weapons.find((x) => x.id === c.id);
    const evo = d.evo ? WEAPONS[d.evo] : null;
    return { icon: icon(c.id), name: d.name, lv: c.isNew ? 'NEW' : `Lv ${w.lvl} → ${w.lvl + 1}`, d: c.isNew ? d.d : d.up[w.lvl - 1].t,
      x: evo ? `Evolves into ${SAVE.seen[d.evo] ? evo.name : '???'} with ${PASSIVES[d.needs].name}.` : '' };
  }
  if (c.kind === 'p') {
    const d = PASSIVES[c.id], p = passiveOf(c.id), pairs = Object.values(WEAPONS).filter((w) => w.needs === c.id);
    return { icon: icon(c.id), name: d.name, lv: c.isNew ? 'NEW' : `Lv ${p.lvl} → ${p.lvl + 1}`, d: d.d + (d.max > 1 ? ` Max level ${d.max}.` : ''),
      x: pairs.length ? `Evolves ${pairs.map((w) => w.name).join(', ')}.` : '' };
  }
  if (c.kind === 'heal') return { icon: icon('repair'), name: 'Field Repair', lv: '', d: 'Repair 30 hull.', x: '' };
  return { icon: icon('cache'), name: 'Salvage Cache', lv: '', d: 'Gain 25 gold.', x: '' };
}
function applyChoice(c) {
  if (c.kind === 'w') { const w = P.weapons.find((x) => x.id === c.id); if (w) { w.lvl++; calcWeapon(w); } else addWeapon(c.id); }
  else if (c.kind === 'p') { const p = passiveOf(c.id); if (p) p.lvl++; else P.passives.push({ id: c.id, lvl: 1 }); recomputeStats(); }
  else if (c.kind === 'heal') P.hp = Math.min(P.st.maxHp, P.hp + 30);
  else G.gold += Math.round(25 * P.st.greed);
  G.invDirty = true;
}

// ---- chests ----
const canEvolve = (w) => { const d = WEAPONS[w.id]; return d.evo && w.lvl >= MAX_WLV && passiveOf(d.needs); };
function openChest(kind) {
  const n = kind === 'boss' ? (R() < 0.12 ? 5 : R() < 0.45 ? 3 : 1) : 1, out = [];
  for (let i = 0; i < n; i++) {
    const ev = P.weapons.find(canEvolve);
    if (ev) { const from = ev.id; ev.id = WEAPONS[from].evo; ev.lvl = 1; calcWeapon(ev); SAVE.seen[ev.id] = 1; out.push({ kind: 'evo', id: ev.id, from }); continue; }
    const ups = [];
    for (const w of P.weapons) if (!WEAPONS[w.id].from && w.lvl < MAX_WLV) ups.push(w);
    for (const p of P.passives) if (p.lvl < PASSIVES[p.id].max) ups.push(p);
    if (ups.length) {
      const u = ups[Math.floor(R() * ups.length)]; u.lvl++;
      if (WEAPONS[u.id]) calcWeapon(u); else recomputeStats();
      out.push({ kind: 'up', id: u.id, lvl: u.lvl });
    } else { const g = Math.round(40 * P.st.greed); G.gold += g; out.push({ kind: 'gold', n: g }); }
  }
  const gold = Math.round(rr(20, 50) * (kind === 'boss' ? 3 : 1) * P.st.greed * G.stage.goldMul);
  G.gold += gold; G.invDirty = true;
  return { items: out, gold, evo: out.some((o) => o.kind === 'evo') };
}

// ---- autopilot for tests and balance runs: flee crowds, collect nearby gems, pick upgrades greedily ----
const _bm = { x: 0, y: 0 }, _bn = [];
function botMove() {
  // Score 16 headings: danger from enemies, bullets and hazards near two points along each one, a pull toward
  // the chosen pickup, and a little momentum. Take the best.
  _bn.length = 0;
  for (const e of E) if (!e.dead && !e.prop && Math.abs(e.x - P.x) < 320 && Math.abs(e.y - P.y) < 320) _bn.push(e);
  let goal = null, gd = 560 * 560;
  if (P.hp < P.st.maxHp * 0.7) for (const e of E) if (e.prop && !e.dead) { const d = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d < 900 * 900 && d * 0.3 < gd) { gd = d * 0.3; goal = e; } }
  for (const it of ITEMS) { const d = (it.x - P.x) ** 2 + (it.y - P.y) ** 2; if (d < 1400 * 1400 && d * 0.2 < gd) { gd = d * 0.2; goal = it; } }
  for (const g of GEMS) { if (g.mag) continue; const d = (g.x - P.x) ** 2 + (g.y - P.y) ** 2; if (d < gd) { gd = d; goal = g; } }
  let best = -1e9, bx = 0, by = 0;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let danger = 0;
    for (const k of [28, 70, 130]) {
      const px = P.x + dx * k, py = P.y + dy * k, wt = k === 28 ? 1.6 : k === 70 ? 1 : 0.45;
      for (const e of _bn) { const R0 = e.r + (e.boss ? 90 : 34), d2 = (e.x - px) ** 2 + (e.y - py) ** 2; if (d2 < R0 * R0) danger += (1 - Math.sqrt(d2) / R0) * wt * (e.boss ? 3 : 1) * (e.ai === 'dash' && e.st ? 2 : 1); }
      for (const b of EB) { const d2 = (b.x + b.vx * k / 160 - px) ** 2 + (b.y + b.vy * k / 160 - py) ** 2; if (d2 < 30 * 30) danger += 1.2 * wt; }
      for (const h of HZ) {
        if (h.kind === 'beam') { if (h.delay > 0 && segDist(px, py, h.x, h.y, h.x + Math.cos(h.a) * h.len, h.y + Math.sin(h.a) * h.len) < h.w / 2 + 16) danger += 3 * wt; }
        else if ((h.x - px) ** 2 + (h.y - py) ** 2 < (h.r + 16) ** 2) danger += 3 * wt;
      }
    }
    let sc = -danger * 3 + (dx * P.fx + dy * P.fy) * 0.15;
    if (goal) { const gx = goal.x - P.x, gy = goal.y - P.y, gl = Math.hypot(gx, gy) || 1; sc += (dx * gx + dy * gy) / gl * 0.8; }
    else { sc += dx * Math.cos(G.t * 0.1) * 0.3 + dy * Math.sin(G.t * 0.13) * 0.3; }
    if (sc > best) { best = sc; bx = dx; by = dy; }
  }
  _bm.x = bx; _bm.y = by;
  return _bm;
}
function botPick(ch) {
  const score = (c) => c.kind === 'w' ? (c.isNew ? (P.weapons.length < 4 ? 30 : 8) : 25)
    : c.kind === 'p' ? (P.weapons.some((w) => WEAPONS[w.id].needs === c.id) ? 22 : c.id === 'plating' || c.id === 'nanite' ? 18 : 10) : 1;
  let bi = 0; ch.forEach((c, i) => { if (score(c) > score(ch[bi])) bi = i; });
  return bi;
}
