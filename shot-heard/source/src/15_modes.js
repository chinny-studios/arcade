// Shot Heard — matches: Conquest (hold the flags, bleed their tickets) and Breakthrough (attackers take the field
// sector by sector). Flags and capture, tickets, spawning, scoring, the officers' colours.

const MATCH = { on: false, mode: 'conquest', map: null, diff: 1, size: 32, tixMul: 1, side: US, tickets: [300, 300], maxT: [300, 300], flags: [], attacker: GB, sector: 0,
  over: false, winner: -1, time: 0, overT: 0, flagAcc: 0, bleed: [0, 0], navT: 0, started: false };
const COLOURS = [];
const RESPAWN = 7;
function flagById(id) { return MATCH.flags.find((f) => f.id === id); }
function flagOwner(id) { const f = flagById(id); return f ? f.owner : -1; }
function flagStyle(team) { return team < 0 ? 'neutral' : TER.map.flagStyle[TEAMS[team].key]; }

function buildFlags(map) {
  MATCH.flags = map.flags.map((d) => {
    const g = heightAt(d.x, d.z);
    const grp = new THREE.Group(); grp.position.set(d.x, g, d.z);
    const pole = new THREE.Mesh(mergeParts([part(GEO.cyl(0.07, 0.1, 9, 6), col(0x6a5034), [0, 4.5, 0]), part(GEO.sph(0.14, 6, 4), col(0xc8a050), [0, 9.1, 0])]), new THREE.MeshLambertMaterial({ vertexColors: true }));
    pole.castShadow = true; grp.add(pole);
    const cloth = makeFlagCloth(); cloth.position.set(0.08, 8.6, 0); grp.add(cloth);
    WORLD.add(grp);
    // a ring of little stakes marks the ground to hold
    const n = Math.round(d.r * 1.3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU, x = d.x + Math.cos(a) * d.r, z = d.z + Math.sin(a) * d.r;
      if (waterDepth(x, z) > 0) continue;
      addInst('box', x, heightAt(x, z) + 0.25, z, a, 0.07, 0.5, 0.07, [0.9, 0.86, 0.75]);
    }
    // an ammunition box at every flag
    const ax = d.x + 2.5, az = d.z + 2.5;
    if (waterDepth(ax, az) < -0.2) { addInst('box', ax, heightAt(ax, az) + 0.3, az, 0.4, 1.0, 0.6, 0.6, col(0x5a4630)); addInst('box', ax, heightAt(ax, az) + 0.62, az, 0.4, 1.02, 0.06, 0.62, col(0x3a2a1c)); }
    AMMO_POINTS.push({ x: ax, z: az, team: -1, flag: d.id });
    return Object.assign({}, d, { owner: -1, ctrl: 0, capTeam: -1, threat: 0, count: [0, 0], contested: false, active: true, locked: false, sectorI: -1, grp, cloth, tex: 'neutral', capFlash: 0 });
  });
  finalizeSI();
}
function setupModeFlags() {
  const M = MATCH, map = M.map;
  for (const f of M.flags) { f.owner = -1; f.ctrl = 0; f.capTeam = -1; f.active = true; f.locked = false; f.sectorI = -1; }
  if (M.mode === 'conquest') {
    // each side starts holding the flags nearest its headquarters; the middle one is open
    const hq = map.hq, lean = (f) => Math.hypot(f.x - hq[US].x, f.z - hq[US].z) - Math.hypot(f.x - hq[GB].x, f.z - hq[GB].z);
    const order = M.flags.slice().sort((a, b) => lean(a) - lean(b)), k = Math.floor((order.length - 1) / 2);
    order.forEach((f, i) => { if (i < k) { f.owner = US; f.ctrl = 1; } else if (i >= order.length - k) { f.owner = GB; f.ctrl = 1; } });
  }
  if (M.mode === 'breakthrough') {
    const bt = map.breakthrough; M.attacker = bt.attacker; M.sector = 0;
    const def = 1 - bt.attacker;
    bt.sectors.forEach((ids, i) => ids.forEach((id) => { const f = flagById(id); f.sectorI = i; f.owner = def; f.ctrl = 1; }));
    for (const f of M.flags) if (f.sectorI < 0) { f.owner = bt.attacker; f.ctrl = 1; f.locked = true; }
    activateSector(0);
  }
}
function activateSector(i) {
  const M = MATCH;
  M.sector = i;
  for (const f of M.flags) {
    if (f.sectorI < 0) { f.active = false; continue; }
    f.active = f.sectorI === i;
    f.locked = f.sectorI !== i;
    if (f.sectorI < i) { f.owner = M.attacker; f.ctrl = 1; }
  }
}

// ---------- start ----------
function startMatch(cfg) {
  const M = MATCH, map = cfg.map;
  M.map = map; M.mode = cfg.mode; M.diff = cfg.diff; M.size = cfg.size; M.tixMul = cfg.tix; M.side = cfg.side;
  M.over = false; M.winner = -1; M.time = 0; M.overT = 0; M.bleed = [0, 0]; M.started = true;
  const T = buildWorld(map);
  initSmoke(); clearParticles(); clearProjectiles();
  for (const c of COLOURS) removeColours(c);
  COLOURS.length = 0;
  initVehicles(map);
  buildFlags(map);
  setupModeFlags();
  if (M.mode === 'conquest') { const t = Math.round(220 * M.tixMul * (M.size / 32 * 0.5 + 0.5)); M.tickets = [t, t]; M.maxT = [t, t]; }
  else { const t = Math.round(300 * M.tixMul * (M.size / 32 * 0.5 + 0.5)); M.tickets = [t, t]; M.tickets[1 - M.attacker] = Infinity; M.maxT = [t, t]; }
  // the men
  for (let i = 0; i < KIT.slots; i++) hideSlot(i);
  CORPSES.age.fill(999); CORPSES.i = 0;
  SOLDIERS.length = 0;
  PL.s = null;
  if (cfg.player !== false) {
    const p = createSoldier(cfg.side, PL.cls, true);
    setLoadout(p, PL.cls, PL.primary[PL.cls]);
    PL.s = p;
  }
  for (const team of [US, GB]) {
    const n = M.size - (PL.s && PL.s.team === team ? 1 : 0);
    const counts = {}; for (const c of CLASS_ORDER) counts[c] = 0;
    for (let i = 0; i < n; i++) {
      // fill classes to the mix
      let cls = 'line', worst = 1e9;
      for (const c of CLASS_ORDER) { const v = counts[c] / Math.max(1, i) - CLASS_MIX[c]; if (v < worst) { worst = v; cls = c; } }
      counts[cls]++;
      const s = createSoldier(team, cls, false);
      makeBot(s);
      setLoadout(s, cls, botWeapon(cls, team));
      s.respawnT = 0.2 + i * 0.12;
    }
  }
  initAI();
    M.on = true;
  M.wind = Math.random() * TAU;
  WIND.x = Math.cos(M.wind) * 0.9; WIND.z = Math.sin(M.wind) * 0.9;
  return T;
}
function endMatch() { MATCH.on = false; }
// bots mostly carry the standard-issue piece of their class; the odd ones are rarer
function botWeapon(cls, team) {
  const list = CLASSES[cls].primary[TEAMS[team].key], r = Math.random();
  return list[r < 0.6 || list.length === 1 ? 0 : r < 0.88 || list.length === 2 ? 1 : 2];
}

// ---------- spawn points ----------
function spawnPoints(team, s) {
  const M = MATCH, map = M.map, out = [];
  const hq = map.hq[team];
  out.push({ id: 'hq', kind: 'hq', label: 'Headquarters', x: hq.x, z: hq.z, r: hq.r });
  for (const f of M.flags) {
    if (f.owner !== team) continue;
    if (M.mode === 'breakthrough' && team === M.attacker && f.sectorI >= 0 && f.sectorI < M.sector - 1) continue;
    const ok = f.count[1 - team] === 0;
    out.push({ id: 'F' + f.id, kind: 'flag', label: f.id + ' · ' + f.name, x: f.x, z: f.z, r: f.r, f, ok, why: ok ? '' : 'under attack' });
  }
  if (M.mode === 'breakthrough' && team === M.attacker) { const fa = forwardAssembly(); if (fa) out.push(fa); }
  for (const c of COLOURS) if (c.alive && c.team === team) out.push({ id: 'C' + c.owner.id, kind: 'colours', label: 'Colours of ' + shortName(c.owner), x: c.x, z: c.z, r: 4, ok: true, c });
  if (s && s.squad) for (const m of s.squad.members) if (m !== s && m.state === 'up' && !m.mount && clock - m.lastHurtT > 6) {
    out.push({ id: 'S' + m.id, kind: 'squad', label: 'Squadmate ' + shortName(m), x: m.pos.x, z: m.pos.z, r: 2, ok: true, m });
  }
  for (const h of HORSES) if (h.team === team && h.alive && !h.rider && !h.claim) { out.push({ id: 'H', kind: 'horse', label: 'Horse (at headquarters)', x: h.pos.x, z: h.pos.z, r: 2, ok: true, h }); break; }
  for (const sh of SHIPS) if (sh.team === team && sh.alive && !sh.crew) out.push({ id: 'B', kind: 'ship', label: 'Gunboat', x: sh.pos.x, z: sh.pos.z, r: 2, ok: true, sh });
  for (const p of out) if (p.ok === undefined) p.ok = true;
  return out;
}
// Breakthrough: the attackers form up about 95 m short of the sector they are attacking.
function forwardAssembly() {
  const M = MATCH, act = M.flags.filter((f) => f.active && f.owner !== M.attacker);
  if (!act.length) return null;
  let cx = 0, cz = 0; for (const f of act) { cx += f.x; cz += f.z; } cx /= act.length; cz /= act.length;
  const hq = M.map.hq[M.attacker], dx = hq.x - cx, dz = hq.z - cz, L = Math.hypot(dx, dz) || 1;
  if (L < 140) return null;
  for (let d = 95; d < Math.min(L - 30, 200); d += 10) {
    const x = cx + dx / L * d, z = cz + dz / L * d, ni = navIndex(x, z);
    if (ni >= 0 && NAV.cost[ni] && NAV.cost[ni] < 4 && waterDepth(x, z) < -0.3 && Math.abs(x) < TER.half - 20 && Math.abs(z) < TER.half - 20)
      return { id: 'FA' + M.sector, kind: 'forward', label: 'Forward assembly', x, z, r: 16, ok: true };
  }
  return null;
}
// find standing room near a point, away from enemies and walls
function spawnSpot(x, z, r) {
  for (let k = 0; k < 20; k++) {
    const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r;
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    const ni = navIndex(px, pz);
    if (ni < 0 || !NAV.cost[ni] || NAV.cost[ni] > 4) continue;
    if (waterDepth(px, pz) > 0.4) continue;
    queryCols(px, pz, 1, _cq);
    if (_cq.some((C) => C.alive && (C.f & CF_MOVE) && colContains(C, px, pz, 0.4) && !C.deck)) continue;
    return [px, pz];
  }
  return [x, z];
}
function deploy(s, p) {
  const M = MATCH;
  let x = p.x, z = p.z, yaw;
  // face the nearest flag that is not ours
  let tgt = null, bd = 1e9;
  for (const f of M.flags) if (f.owner !== s.team && !f.locked) { const d = Math.hypot(f.x - x, f.z - z); if (d < bd) { bd = d; tgt = f; } }
  if (p.kind === 'squad') { const m = p.m; x = m.pos.x - Math.sin(m.yaw) * 1.5; z = m.pos.z - Math.cos(m.yaw) * 1.5; yaw = m.yaw; }
  else if (p.kind === 'horse') { x = p.h.pos.x + 1.4; z = p.h.pos.z; }
  else if (p.kind !== 'ship') [x, z] = spawnSpot(x, z, p.kind === 'hq' ? p.r * 0.7 : p.kind === 'colours' ? 3 : p.r * 0.6);
  if (yaw === undefined) yaw = tgt ? Math.atan2(tgt.x - x, tgt.z - z) : 0;
  spawnSoldier(s, x, z, yaw);
  if (p.kind === 'horse' && !p.h.rider) mountHorse(p.h, s);
  if (p.kind === 'ship' && !p.sh.crew) boardShip(p.sh, s);
  if (s.isPlayer) { PL.yaw = yaw; PL.pitch = 0; dressViewmodel(s.dress); }
}
function botDeploy(s) {
  const pts = spawnPoints(s.team, s).filter((p) => p.ok);
  const B = s.bot;
  if (B.sailor) { const p = pts.find((q) => q.kind === 'ship'); if (p) { deploy(s, p); return; } }
  if (B.rider) { const p = pts.find((q) => q.kind === 'horse'); if (p) { deploy(s, p); return; } }
  const obj = (s.squad && s.squad.obj) || null;
  let best = pts[0], bs = 1e9;
  for (const p of pts) {
    if (p.kind === 'horse' || p.kind === 'ship') continue;
    const d = obj ? Math.hypot(p.x - obj.x, p.z - obj.z) : 0;
    const sc = d + (p.kind === 'hq' ? 40 : 0) + Math.random() * 40 - (p.kind === 'squad' ? 20 : 0) - (p.kind === 'forward' ? 25 : 0);
    if (sc < bs) { bs = sc; best = p; }
  }
  deploy(s, best);
}

// ---------- the round ----------
function updateMatch(dt) {
  const M = MATCH;
  if (!M.on) return;
  M.time += dt;
  // respawns for the bots
  for (const s of SOLDIERS) {
    if (!s.bot || s.state !== 'dead') continue;
    s.respawnT -= dt;
    if (s.respawnT <= 0 && !M.over) botDeploy(s);
  }
  for (let i = AMMO_POINTS.length - 1; i >= 0; i--) { const a = AMMO_POINTS[i]; if (a.ttl !== undefined && (a.ttl -= dt) <= 0) AMMO_POINTS.splice(i, 1); }
  M.flagAcc += dt;
  if (M.flagAcc >= 0.1) { updateFlags(M.flagAcc); M.flagAcc = 0; }
  for (const f of M.flags) {
    const h = f.ctrl * 7.4 + 0.4;
    f.cloth.position.y = lerp(f.cloth.position.y, h + 0.9, 0.2);
    const tex = f.owner >= 0 ? flagStyle(f.owner) : f.capTeam >= 0 && f.ctrl > 0 ? flagStyle(f.capTeam) : 'neutral';
    if (tex !== f.tex) { f.tex = tex; f.cloth.material.map = flagTexture(tex); f.cloth.material.needsUpdate = true; }
    if (camera.position.distanceTo(f.grp.position) < 220) waveFlag(f.cloth, clock + f.x, 0.9);
  }
  for (const c of COLOURS) if (c.alive && camera.position.distanceTo(c.mesh.position) < 120) waveFlag(c.cloth, clock * 1.1 + c.x, 0.8);
  // tickets
  if (!M.over) {
    if (M.mode === 'conquest') {
      const own = [0, 0]; for (const f of M.flags) if (f.owner >= 0) own[f.owner]++;
      for (const t of [US, GB]) {
        const diff = own[1 - t] - own[t];
        if (diff > 0) { M.bleed[t] += dt * (0.12 * diff + (own[t] === 0 ? 0.35 : 0)); while (M.bleed[t] >= 1) { M.bleed[t] -= 1; M.tickets[t] = Math.max(0, M.tickets[t] - 1); } }
      }
      if (M.tickets[US] <= 0 || M.tickets[GB] <= 0) finishMatch(M.tickets[US] <= 0 ? GB : US);
    } else if (M.tickets[M.attacker] <= 0) {
      // the attack fails once the tickets are gone and nobody is left on the active flags
      const active = M.flags.filter((f) => f.active);
      if (!active.some((f) => f.count[M.attacker] > 0 && f.owner !== M.attacker)) finishMatch(1 - M.attacker);
    }
  } else {
    M.overT += dt;
  }
}
function updateFlags(dt) {
  const M = MATCH;
  for (const f of M.flags) {
    f.count[0] = 0; f.count[1] = 0;
    if (!f.active && M.mode === 'breakthrough') continue;
    forSoldiersIn(f.x - f.r, f.z - f.r, f.x + f.r, f.z + f.r, (s) => {
      if (s.state !== 'up' || (s.mount && s.mount.type === 'ship')) return;
      if (Math.hypot(s.pos.x - f.x, s.pos.z - f.z) > f.r || Math.abs(s.pos.y - heightAt(f.x, f.z)) > 8) return;
      f.count[s.team]++;
    });
    const a = f.count[0], b = f.count[1];
    f.threat = f.owner >= 0 ? f.count[1 - f.owner] : Math.max(a, b);
    f.contested = a > 0 && b > 0;
    if (f.locked || a === b) continue;
    const T = a > b ? US : GB, net = Math.abs(a - b);
    const rate = 0.075 * (1 + 0.3 * Math.min(net - 1, 4)) * dt;
    if (f.owner === T) { f.ctrl = Math.min(1, f.ctrl + rate); continue; }
    if (f.owner >= 0) {
      f.ctrl -= rate;
      if (f.ctrl <= 0) { const was = f.owner; f.owner = -1; f.ctrl = 0; f.capTeam = T; flagEvent(f, 'neutral', T, was); }
    } else {
      if (f.capTeam !== T && f.ctrl > 0) { f.ctrl -= rate; if (f.ctrl <= 0) { f.ctrl = 0; f.capTeam = T; } }
      else {
        f.capTeam = T; f.ctrl += rate;
        if (f.ctrl >= 1) { f.ctrl = 1; f.owner = T; flagEvent(f, 'capture', T); }
      }
    }
  }
}
function flagEvent(f, kind, team, was) {
  const M = MATCH;
  const pl = PL.s ? PL.s.team : M.side;
  for (const s of SOLDIERS) if (s.team === team && s.state === 'up' && Math.hypot(s.pos.x - f.x, s.pos.z - f.z) < f.r) {
    if (kind === 'capture') { s.sc.caps++; addScore(s, 150, 'Captured ' + f.id); } else addScore(s, 75, 'Neutralized ' + f.id);
  }
  if (kind === 'capture') {
    hudFeedText((team === pl ? 'We have taken ' : 'The enemy has taken ') + f.name, team === pl ? 'fr' : 'fo');
    if (camera.position.distanceTo(f.grp.position) < 200 || (PL.s && Math.hypot(PL.s.pos.x - f.x, PL.s.pos.z - f.z) < f.r * 2)) sHuzzah(f.grp.position, 6);
    if (M.mode === 'breakthrough' && team === M.attacker) {
      const act = M.flags.filter((x) => x.active);
      if (act.every((x) => x.owner === M.attacker)) sectorFallen();
    }
  } else hudFeedText(f.name + ' has been neutralized', team === pl ? 'fr' : 'fo');
}
function sectorFallen() {
  const M = MATCH, bt = M.map.breakthrough;
  const pl = PL.s ? PL.s.team : M.side;
  if (M.sector + 1 >= bt.sectors.length) { finishMatch(M.attacker); return; }
  activateSector(M.sector + 1);
  M.tickets[M.attacker] += Math.round(140 * M.tixMul * (M.size / 32 * 0.5 + 0.5));
  M.maxT[M.attacker] = Math.max(M.maxT[M.attacker], M.tickets[M.attacker]);
  const msg = pl === M.attacker ? ['Sector taken', 'Press on to the next line'] : ['Fall back', 'The line has broken. Hold the next one.'];
  hudBanner(msg[0], msg[1], pl === M.attacker ? 'fr' : 'fo');
  for (const team of [US, GB]) for (const sq of SQUADS[team]) { sq.objT = 0; sq.order = null; }
}
function finishMatch(winner) {
  const M = MATCH;
  if (M.over) return;
  M.over = true; M.winner = winner; M.overT = 0;
  const pl = PL.s ? PL.s.team : M.side;
  hudBanner(winner === pl ? 'Victory' : 'Defeat', endLine(M.map, winner), winner === pl ? 'gold' : 'fo');
  stopMusic();
  if (AC) setTimeout(() => playTune(TEAMS[winner].tune, false, true), 1500);
}
function endLine(map, w) {
  const L = {
    lexington: ['The regulars are driven back down the Battle Road to Boston.', 'The King\'s troops hold the road and the militia scatter to their farms.'],
    bunker: ['The provincials hold the hill, and Gage counts a dear-bought victory.', 'The redoubt falls and the provincials fall back across the Neck.'],
    saratoga: ['Burgoyne\'s army is broken in the woods; the surrender is days away.', 'The Crown forces its way south toward Albany.'],
    yorktown: ['The redoubts fall, and Cornwallis asks for terms. The world turned upside down.', 'The siege lines are thrown back and the garrison holds.'],
  };
  const l = L[map.id] || ['The Patriots carry the day.', 'The Crown carries the day.'];
  return w === US ? l[0] : l[1];
}

// ---------- kills and score ----------
const FEED = [];
function matchOnKill(att, v, how, head) {
  if (!MATCH.on) return;
  if (att && att !== v && att.team !== v.team) {
    att.sc.kills++;
    addScore(att, head ? 125 : 100, head ? 'Headshot' : 'Enemy down');
    for (const [o, d] of v.dmgBy) if (o !== att && o.team === att.team && d >= 25) { o.sc.assists++; addScore(o, 50, 'Assist'); }
  }
  hudFeed(att, v, how, head);
}
function matchOnDeath(v) {
  if (!MATCH.on) return;
  v.sc.deaths++;
  const M = MATCH;
  if (!M.over) {
    if (M.mode === 'conquest') M.tickets[v.team] = Math.max(0, M.tickets[v.team] - 1);
    else if (v.team === M.attacker) M.tickets[v.team] = Math.max(0, M.tickets[v.team] - 1);
  }
  v.respawnT = v.bot ? (M.mode === 'breakthrough' ? (v.team === M.attacker ? frand(5, 8) : frand(9, 13)) : frand(6, 11)) : RESPAWN;
  if (v.isPlayer) PL.deadT = 0;
}
function addScore(s, pts, label) {
  if (!s) return;
  s.sc.score += pts;
  if (s.isPlayer && label) hudPop(label, pts);
}

// ---------- regimental colours (officer's spawn beacon) ----------
function plantColours(s, x, z) {
  if (s.colours) removeColours(s.colours);
  const g = groundBelow(x, z, heightAt(x, z) + 2);
  const grp = new THREE.Group(); grp.position.set(x, g, z);
  grp.add(new THREE.Mesh(mergeParts([part(GEO.cyl(0.04, 0.05, 3.2, 5), col(0x6a5034), [0, 1.6, 0]), part(GEO.cone(0.07, 0.25, 4), col(0xc8a050), [0, 3.3, 0])]), new THREE.MeshLambertMaterial({ vertexColors: true })));
  const cloth = makeFlagCloth(1.3, 0.9); cloth.position.set(0.05, 3.1, 0);
  cloth.material.map = flagTexture(flagStyle(s.team));
  grp.add(cloth);
  scene.add(grp);
  const c = { team: s.team, owner: s, x, z, alive: true, hp: 3, mesh: grp, cloth };
  c.col = addCylCol(x, z, 0.25, g, g + 3.2, CF_SHOT, 'wood', null); c.col.colours = c;
  COLOURS.push(c); s.colours = c;
  sDrill('cast', grp.position);
  return c;
}
function removeColours(c) {
  c.alive = false; scene.remove(c.mesh);
  c.mesh.traverse((n) => { if (n.geometry) n.geometry.dispose(); });
  if (c.col) c.col.alive = false;
  const i = COLOURS.indexOf(c); if (i >= 0) COLOURS.splice(i, 1);
  if (c.owner && c.owner.colours === c) c.owner.colours = null;
}
function hitColours(c, att, heavy) {
  if (!c.alive || (att && att.team === c.team)) return;
  c.hp -= heavy ? 3 : 1;
  if (c.hp <= 0) { if (att) addScore(att, 60, 'Colours taken'); removeColours(c); }
}
