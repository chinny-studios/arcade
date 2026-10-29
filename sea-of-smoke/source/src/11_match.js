// ---- 11_match: fleets, capture points, forts, spotting, weather, points, victory ----
// Domination rules: both fleets start at MATCH.start points; each held point adds MATCH.capPts every MATCH.tick s;
// a ship sunk or captured moves points from its team to the other. First to MATCH.win, the last fleet afloat,
// or the most points when the clock runs out wins.
const Match = { phase: 'none', time: 0, left: 0, wind: { a: 0, s: 5 }, squall: 0, caps: [], forts: [], pts: [0, 0], fog: [], log: [] };

Match.start = function (o) {
  o = o || {};
  rand = o.seed != null ? mulberry32(o.seed) : Math.random;
  const map = MAPS[o.map || 0];
  for (const s of G.ships) { R.scene.remove(s.model.root); }
  for (const r of Combat.rafts) R.scene.remove(r.mesh);
  G.ships = []; Combat.reset(); Fx.clear();
  if (World.map !== map) World.build(map); else World.forts.forEach((f) => { f.owner = -1; });
  Match.map = map; Match.phase = 'countdown'; Match.cd = o.countdown != null ? o.countdown : MATCH.countdown;
  Match.time = 0; Match.left = o.time || MATCH.time; Match.pts = [MATCH.start, MATCH.start]; Match.tickT = MATCH.tick;
  Match.wind = { a: rnd(0, TAU), s: rnd(4, 7) }; Match.squall = 0; Match.squallAt = o.squallAt != null ? o.squallAt : rnd(150, 270); Match.squallDur = 85;
  Match.viewTeam = 0; Match.result = null; Match.spotT = 0; Match.log = []; Match.lastSeen = [[], []]; Match.overT = 0; Match.playerLost = null;
  Match.caps = map.caps.map((c, i) => ({ id: c.id, x: c.x, z: c.z, r: MATCH.capR, owner: -1, prog: 0, capTeam: -1, contested: false, fort: null, n: [0, 0] }));
  Match.forts = World.forts.map((f, i) => {
    const cap = Match.caps.filter((c) => map.caps.find((mc) => mc.id === c.id).fort)[i];
    const F = { x: f.x, z: f.z, y: f.y, w: f, hp: 3500, maxHp: 3500, owner: -1, team: -1, silenced: 0, rl: [0, 3, 6, 9], name: 'Fort ' + cap.id, isFort: true, C: {}, stats: { dmg: 0, hits: 0, fires: 0, kills: 0 }, alive: true };
    cap.fort = F; f.flag.material.map = flagTex(-1); return F;
  });
  // fog banks
  Match.fog = map.fog.map(([x, z, r]) => {
    const b = { x, z, r, puffs: [] };
    for (let i = 0; i < 24; i++) {
      const a = rnd(0, TAU), d = Math.sqrt(rand()) * r * 0.85, ox = Math.cos(a) * d, oz = Math.sin(a) * d;
      const p = Fx.emit('fog', x + ox, rnd(12, 40), z + oz, 0, 0, 0, rnd(110, 170), 0, Infinity, 0.9, 0.92, 0.93, 0.32);
      if (p) b.puffs.push([p, ox, oz]);
    }
    return b;
  });
  // fleets
  const pc = o.cls || settings.ship;
  for (let team = 0; team < 2; team++) {
    const fleet = (o.fleet && o.fleet[team]) || FLEET.slice();
    if (team === 0 && !o.noPlayer) { const k = fleet.indexOf(pc); if (k >= 0) fleet.splice(k, 1); else fleet.pop(); fleet.splice(Math.floor(fleet.length / 2), 0, pc); }
    const names = shuffle(SHIP_NAMES[team].slice());
    const sp = map.spawns[team], h = team === 0 ? 0 : Math.PI;
    // fast ships on the wings, heavies in the middle
    const order = fleet.map((c, i) => [c, i]).sort((a, b) => CLASSES[a[0]].speed - CLASSES[b[0]].speed);
    const slots = []; order.forEach((e, k) => slots.push(k % 2 ? slots.length : 0));
    const lineup = []; order.forEach(([c, i], k) => { if (k % 2) lineup.push([c, i]); else lineup.unshift([c, i]); });
    lineup.forEach(([cls, i], k) => {
      const isP = team === 0 && !o.noPlayer && cls === pc && !G.ships.some((s) => s.isPlayer);
      let x = sp.x + (k - (lineup.length - 1) / 2) * 120 * (team === 0 ? 1 : -1), z = sp.z + (rand() - 0.5) * 60;
      for (let tries = 0; tries < 30 && World.h(x, z) > -(CLASSES[cls].draft + 3); tries++) z += team === 0 ? 25 : -25;
      const s = new Ship(cls, team, isP ? CLASSES[cls].ship : names.pop(), { x, z, h, player: isP });
      if (isP) G.player = s; else s.bot = new Bot(s);
      G.ships.push(s);
    });
  }
  if (o.noPlayer) G.player = null;
  for (const s of G.ships) s.updateModel(0.016, 0);
  R.setLook(map, 0); Match.lookQ = 0;
  if (typeof PC !== 'undefined') PC.reset();
  if (typeof Hud !== 'undefined') Hud.reset();
  return { map: map.id, ships: G.ships.length, player: G.player && G.player.cls };
};

Match.feed = function (text, team) { Match.log.push({ text, team, t: Match.time }); if (typeof Hud !== 'undefined') Hud.feed(text, team); };
Match.isSeen = (o, team) => o.team === team || o.seen[team];
Match.inFog = function (x, z) { let k = 0; for (const b of Match.fog) { const d = Math.hypot(x - b.x, z - b.z); if (d < b.r) k = Math.max(k, smoothstep(b.r, b.r * 0.6, d)); } return k; };
Match.lastSeenEnemy = function (s) {
  let best = null;
  for (const o of G.ships) if (o.alive && o.team !== s.team && o.lastPos && o.lastPos[s.team]) {
    const p = o.lastPos[s.team]; if (!best || p.t > best.t) best = p;
  }
  return best;
};

Match.update = function (dt) {
  if (Match.phase === 'none') return;
  if (Match.phase === 'countdown') {
    Match.cd -= dt;
    if (Match.cd <= 0) { Match.phase = 'battle'; Sfx.bell(3); if (typeof Hud !== 'undefined') Hud.banner('Battle stations!', 'Take the points or sink them all'); }
  } else if (Match.phase === 'battle') { Match.time += dt; Match.left -= dt; }
  else if (Match.phase === 'over') Match.overT += dt;
  // wind veers slowly; the squall comes and goes
  Match.wind.a += Math.sin(Match.time * 0.013) * 0.004 * dt;
  const sq = Match.time > Match.squallAt && Match.time < Match.squallAt + Match.squallDur ? 1 : 0;
  Match.squall = approach(Match.squall, sq, dt / 12);
  if (sq && !Match.squallSaid) { Match.squallSaid = true; if (typeof Hud !== 'undefined') Hud.banner('A squall is coming in', 'Rain and spray: ships are spotted at half range'); }
  const ws = Match.wind.s * (1 + Match.squall * 1.5);
  Fx.wind.x = Math.sin(Match.wind.a) * ws; Fx.wind.z = Math.cos(Match.wind.a) * ws;
  if (Math.abs(Match.squall - Match.lookQ) > 0.01) { Match.lookQ = Match.squall; R.setLook(Match.map, Match.squall); }
  for (const b of Match.fog) {
    b.x += Fx.wind.x * dt * 0.3; b.z += Fx.wind.z * dt * 0.3;
    const lim = World.S / 2 + 200;
    if (b.x > lim) b.x -= 2 * lim; if (b.x < -lim) b.x += 2 * lim; if (b.z > lim) b.z -= 2 * lim; if (b.z < -lim) b.z += 2 * lim;
    for (const [p, ox, oz] of b.puffs) { p.x = b.x + ox; p.z = b.z + oz; }
  }
  for (const s of G.ships) { if (s.bot && s.alive && Match.phase !== 'over') s.bot.update(dt); s.update(dt); }
  collide(dt);
  Combat.update(dt);
  Match.spotT -= dt; if (Match.spotT <= 0) { Match.spotT = 0.25; spot(); }
  if (Match.phase === 'battle') { updateCaps(dt); updateForts(dt); }
  // points
  if (Match.phase === 'battle') {
    Match.tickT -= dt;
    if (Match.tickT <= 0) { Match.tickT += MATCH.tick; for (const c of Match.caps) if (c.owner >= 0) Match.pts[c.owner] += MATCH.capPts; }
    checkEnd();
  }
};

function detectRange(o, sp) {
  let r = o.C.conceal;
  if (Match.time - o.lastFire < 15) r = Math.max(r, o.C.guns.range * 1.1);
  if (o.ignited > 0 || o.fires.some((f) => f > 0)) r = Math.max(r * 1.15, o.ignited > 0 ? 1300 : 0);
  r *= 1 - 0.45 * Match.squall;
  r *= 1 - 0.5 * Math.max(Match.inFog(o.x, o.z), Match.inFog(sp.x, sp.z));
  if (sp.spec && sp.spec.id === 'lookout' && sp.spec.t > 0) r *= 1.35;
  return Math.max(r, 180);
}
function spot() {
  for (const o of G.ships) {
    if (!o.alive) continue;
    for (let T = 0; T < 2; T++) {
      if (T === o.team) { o.seen[T] = true; continue; }
      let seen = false;
      for (const sp of G.ships) {
        if (!sp.alive || sp.team !== T) continue;
        const d = Math.hypot(o.x - sp.x, o.z - sp.z);
        if (d > detectRange(o, sp)) continue;
        if (d > 150 && Combat.smokeBlocks(sp.x, sp.z, o.x, o.z)) continue;
        seen = true; break;
      }
      if (!seen) for (const f of Match.forts) {
        if (f.owner !== T || f.silenced > 0) continue;
        if (Math.hypot(o.x - f.x, o.z - f.z) < 700 * (1 - 0.4 * Match.squall) && !Combat.smokeBlocks(f.x, f.z, o.x, o.z)) { seen = true; break; }
      }
      o.seen[T] = seen;
      if (seen) { o.lastPos = o.lastPos || []; o.lastPos[T] = { x: o.x, z: o.z, t: Match.time }; o.seenT[T] = Match.time; }
    }
    // Like the real thing: an enemy nobody on your side can see is not drawn at all.
    if (!o.gone) o.model.root.visible = o.team === Match.viewTeam || o.seen[Match.viewTeam];
  }
}

// Each hull is three circles along the keel; overlapping circles push apart. Rams hurt; a lit fireship explodes.
function collide(dt) {
  const ss = G.ships.filter((s) => s.alive);
  for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++) {
    const a = ss[i], b = ss[j], lim = (a.C.len + b.C.len) / 2 + 4;
    if (Math.abs(a.x - b.x) > lim || Math.abs(a.z - b.z) > lim) continue;
    let hit = null;
    for (const fa of [-0.32, 0, 0.32]) for (const fb of [-0.32, 0, 0.32]) {
      const ax = a.wx(0, fa * a.C.len), az = a.wz(0, fa * a.C.len), bx = b.wx(0, fb * b.C.len), bz = b.wz(0, fb * b.C.len);
      const d = Math.hypot(ax - bx, az - bz), r = (a.C.beam + b.C.beam) / 2 + 1;
      if (d < r && (!hit || r - d > hit.o)) hit = { o: r - d, nx: (ax - bx) / (d || 1), nz: (az - bz) / (d || 1) };
    }
    if (!hit) continue;
    const ma = a.maxHp, mb = b.maxHp, ka = mb / (ma + mb), kb = ma / (ma + mb);
    a.x += hit.nx * hit.o * ka; a.z += hit.nz * hit.o * ka; b.x -= hit.nx * hit.o * kb; b.z -= hit.nz * hit.o * kb;
    const rv = (Math.sin(a.h) * a.v - Math.sin(b.h) * b.v) * -hit.nx + (Math.cos(a.h) * a.v - Math.cos(b.h) * b.v) * -hit.nz;
    a.v *= 0.97; b.v *= 0.97;
    if (a.team !== b.team) {
      for (const [f, t] of [[a, b], [b, a]]) if (f.ignited > 0 && f.alive) {
        t.damage(7500, f, 'raft'); t.startFire(0, f); t.startFire(1, f); t.startFire(2, f); t.crew = Math.max(1, t.crew - 25);
        if (!G.simming) { Fx.explosion(f.x, 3, f.z, 1.8); Sfx.explosion(f.x, f.z); }
        if (f.isPlayer) Hud.ribbon('Fireship strike!', 'good'); if (t.isPlayer) Hud.ribbon('Rammed by a fireship!', 'bad');
        f.die(null, 'expended');
      }
    }
    if (rv > 3 && a.alive && b.alive && G.t - (a.ramT || 0) > 2) {
      a.ramT = b.ramT = G.t;
      a.damage(rv * 30 * Math.sqrt(mb / ma), a.team !== b.team ? b : null, 'ram');
      b.damage(rv * 30 * Math.sqrt(ma / mb), a.team !== b.team ? a : null, 'ram');
      if (!G.simming) Sfx.crack((a.x + b.x) / 2, (a.z + b.z) / 2);
    }
  }
}

function updateCaps(dt) {
  for (const c of Match.caps) {
    c.n = [0, 0];
    for (const s of G.ships) if (s.alive && Math.hypot(s.x - c.x, s.z - c.z) < c.r) c.n[s.team]++;
    c.contested = c.n[0] > 0 && c.n[1] > 0;
    if (c.contested) continue;
    const T = c.n[0] ? 0 : c.n[1] ? 1 : -1;
    if (T < 0 || T === c.owner) { if (c.capTeam >= 0) { c.prog -= dt / (MATCH.capTime * 1.5); if (c.prog <= 0) { c.prog = 0; c.capTeam = -1; } } continue; }
    if (c.capTeam !== T) { c.prog -= dt / (MATCH.capTime * 0.5); if (c.prog <= 0) { c.prog = 0; c.capTeam = T; } continue; }
    c.prog += dt / MATCH.capTime * Math.min(1 + 0.25 * (c.n[T] - 1), 1.5);
    if (c.prog >= 1) {
      const lost = c.owner; c.owner = T; c.prog = 0; c.capTeam = -1;
      if (c.fort) { c.fort.owner = c.fort.team = T; c.fort.w.flag.material.map = flagTex(T); c.fort.w.flag.material.needsUpdate = true; c.fort.hp = c.fort.maxHp; c.fort.silenced = 0; }
      for (const s of G.ships) if (s.alive && s.team === T && Math.hypot(s.x - c.x, s.z - c.z) < c.r) s.stats.caps++;
      Match.feed(`${TEAM_NAMES[T]} took point ${c.id}` + (lost >= 0 ? '' : ''), T);
      if (G.player) { const mine = T === G.player.team; Hud.banner(mine ? `Point ${c.id} is ours` : `Point ${c.id} lost`, c.fort ? (mine ? 'The fort now fires for us' : 'Its fort turns its guns on us') : ''); Sfx.bell(1); }
    }
  }
}

function updateForts(dt) {
  for (const f of Match.forts) {
    if (f.owner < 0) continue;
    if (f.silenced > 0) { f.silenced -= dt; if (f.silenced <= 0) { f.hp = f.maxHp * 0.5; Match.feed(`${f.name} is firing again`, f.owner); } continue; }
    for (let g = 0; g < 4; g++) {
      f.rl[g] -= dt; if (f.rl[g] > 0) continue;
      const gp = f.w.guns[g]; let tgt = null, bd = 680;
      for (const s of G.ships) {
        if (!s.alive || s.team === f.owner || !s.seen[f.owner]) continue;
        const d = Math.hypot(s.x - gp[0], s.z - gp[2]); if (d < bd) { bd = d; tgt = s; }
      }
      if (!tgt) { f.rl[g] = 1; continue; }
      f.rl[g] = 12;
      const [px, pz] = leadPoint({ x: gp[0], z: gp[2], C: { guns: { vel: 230 } } }, tgt), sig = bd * 0.02 + 3;
      Combat.spawnBall(gp[0], gp[1], gp[2], px + gauss() * sig, pz + gauss() * sig * 1.5, 230, 150, 0, f.owner, f, false);
      if (!G.simming) { Fx.muzzle(gp[0], gp[1], gp[2], (px - gp[0]) / bd, (pz - gp[2]) / bd, 1); if (rand() < 0.5) Sfx.boom(gp[0], gp[2], 0.8); }
    }
  }
}
Match.hitFort = function (f, dmg, by) {
  if (f.silenced > 0) return;
  f.hp -= dmg; if (by && by.stats) by.stats.dmg += dmg * 0.3;
  if (f.hp <= 0) { f.silenced = 60; f.hp = 0; Match.feed(`${f.name} has been silenced`, by ? by.team : -1); if (by && by.isPlayer) Hud.ribbon(`${f.name} silenced`, 'good'); }
};

Match.onSunk = function (s, by, cause) {
  const v = s.C.value;
  Match.pts[s.team] -= Math.round(v * 0.9);
  if (cause !== 'expended') Match.pts[1 - s.team] += Math.round(v * 0.6);
  if (by && by.team !== s.team && !by.isFort) by.stats.kills++;
  const how = cause === 'fire' ? 'burned' : cause === 'leak' ? 'flooded' : cause === 'raft' ? 'set ablaze' : cause === 'ram' ? 'rammed' : 'sank';
  if (cause === 'expended') Match.feed(`${s.name} went up in flames against the enemy`, s.team);
  else if (cause === 'burned') Match.feed(`${s.name} burned to the waterline`, 1 - s.team);
  else Match.feed(by ? `${by.name} ${how} ${s.name}` : `${s.name} sank`, 1 - s.team);
  if (by && by.isPlayer) Hud.ribbon(`Sank ${s.name}!`, 'kill');
  if (s.isPlayer) { Match.playerLost = cause === 'expended' ? 'expended' : 'sunk'; Hud.dead(by); }
};
Match.onCaptured = function (o, by, old) {
  const v = o.C.value;
  Match.pts[old] -= v; Match.pts[by.team] += v;
  Match.feed(`${by.name} captured ${o.name}!`, by.team);
  if (by.isPlayer) Hud.ribbon(`Captured ${o.name}!`, 'kill');
  if (o.isPlayer) { o.isPlayer = false; Match.playerLost = 'captured'; Hud.dead(by, true); }
  o.bot = new Bot(o);
};

function checkEnd() {
  const alive = [0, 1].map((T) => G.ships.some((s) => s.alive && s.team === T));
  let win = -2, why = '';
  if (Match.pts[0] >= MATCH.win || Match.pts[1] >= MATCH.win) { win = Match.pts[0] >= Match.pts[1] ? 0 : 1; why = `${TEAM_NAMES[win]} reached ${MATCH.win} points`; }
  else if (Match.pts[0] <= 0 || Match.pts[1] <= 0) { win = Match.pts[0] <= 0 ? 1 : 0; why = `${TEAM_NAMES[1 - win]} ran out of points`; }
  else if (!alive[0] || !alive[1]) { win = alive[0] ? 0 : alive[1] ? 1 : -1; why = win < 0 ? 'Both fleets lie on the bottom' : `${TEAM_NAMES[1 - win]} has been sunk to the last ship`; }
  else if (Match.left <= 0) { win = Match.pts[0] > Match.pts[1] ? 0 : Match.pts[1] > Match.pts[0] ? 1 : -1; why = 'Time ran out'; }
  if (win === -2) return;
  Match.phase = 'over'; Match.overT = 0;
  Match.result = { win, why, pts: Match.pts.slice(), time: Match.time };
  if (typeof Hud !== 'undefined') Hud.banner(win < 0 ? 'Draw' : (win === 0 ? 'Victory' : 'Defeat'), why);
}
