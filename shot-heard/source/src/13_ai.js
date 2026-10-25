// Shot Heard — the bots. Squads pick objectives; each man follows the objective's flow field, looks for enemies
// (walls, terrain, woods and gunsmoke all hide them), presents and fires, reloads, charges with the bayonet,
// and does his class's work: revives, colours, grenades, crewing guns, riding and sailing.

const SQUADS = [[], []];
const DIFF = [
  { aim: [1.5, 2.6], err: 1.7, react: 1.1, see: 0.85 },
  { aim: [0.9, 1.7], err: 1.15, react: 0.7, see: 1.0 },
  { aim: [0.55, 1.1], err: 0.8, react: 0.4, see: 1.1 },
];
const _ad = new V3(), _af = { x: 0, z: 0 };
const diffOf = (s) => DIFF[PL.s && s.team === PL.s.team ? 1 : MATCH.diff];
function initAI() {
  SQUADS[0] = []; SQUADS[1] = [];
  for (const team of [US, GB]) {
    const men = SOLDIERS.filter((s) => s.team === team);
    // the player's squad first, so it has the player plus four
    if (PL.s && PL.s.team === team) { const i = men.indexOf(PL.s); men.splice(i, 1); men.unshift(PL.s); }
    for (let i = 0; i < men.length; i += 5) {
      const sq = { team, id: SQUADS[team].length, members: men.slice(i, i + 5), obj: null, objT: 0, volleyAt: -1, order: null, orderT: 0, huzzahT: 0 };
      for (const m of sq.members) m.squad = sq;
      SQUADS[team].push(sq);
    }
  }
  NAV.flows = {};
  for (const f of MATCH.flags) computeFlow('F' + f.id, f.x, f.z, Math.max(4, f.r * 0.5));
  // a few riders and one sailor per side where the map has horses or ships
  for (const team of [US, GB]) {
    const bots = SOLDIERS.filter((s) => s.team === team && s.bot);
    const horses = HORSES.filter((h) => h.team === team).length;
    let k = 0;
    for (const b of bots) { b.bot.rider = false; b.bot.sailor = false; }
    // keep one horse free for the player on his side
    const keep = PL.s && PL.s.team === team ? 1 : 0;
    for (const b of bots) { if (k >= Math.min(horses - keep, 3)) break; if (b.cls === 'line' || b.cls === 'officer') { b.bot.rider = true; k++; } }
    if (SHIPS.some((s) => s.team === team)) { const b = bots.find((x) => !x.bot.rider && x.cls === 'arty') || bots.find((x) => !x.bot.rider); if (b) b.bot.sailor = true; }
  }
}
function makeBot(s) {
  s.bot = { think: Math.random() * 0.5, state: 'move', goal: null, goalT: 0, obj: null, target: null, seenT: 0, aimT: 0, aimNeed: 1, threat: null, threatT: -99,
    stuckT: 0, sideT: 0, side: 0, charge: false, crouch: false, reviveT: 0, task: null, rider: false, sailor: false, thank: 0, nadeT: 10, coloursT: 0, reloadSpot: null, hold: 0, fireDelay: 0 };
}
function botSpawned(s, revived) {
  const B = s.bot;
  B.state = 'move'; B.goal = null; B.target = null; B.aimT = 0; B.charge = false; B.task = null; B.stuckT = 0; B.reviveT = 0;
  if (!revived) B.coloursT = 0;
}
function squadObjective(sq) {
  const M = MATCH, team = sq.team;
  if (sq.order && clock - sq.orderT < 90) return sq.order;
  const live = sq.members.filter((m) => m.alive);
  let cx = 0, cz = 0;
  if (live.length) { for (const m of live) { cx += m.pos.x; cz += m.pos.z; } cx /= live.length; cz /= live.length; }
  else { const hq = TER.map.hq[team]; cx = hq.x; cz = hq.z; }
  let best = null, bs = -1e9;
  for (const f of M.flags) {
    if (f.locked) continue;
    if (M.mode === 'breakthrough' && !f.active) continue;
    let sc;
    const mine = f.owner === team;
    if (!mine) sc = f.owner === -1 ? 120 : 100;
    else sc = f.threat > 0 ? 95 : 18;
    // breakthrough: attackers press the flags they do not hold; defenders hold what they have and retake the rest
    if (M.mode === 'breakthrough') {
      if (team === M.attacker) {
        // one squad garrisons each flag already taken; the rest press on
        const guards = SQUADS[team].filter((o) => o !== sq && o.obj === f).length;
        sc = mine ? (f.threat > 0 ? 115 : guards ? 5 : 100) : 130;
      } else sc = mine ? (f.threat > 0 ? 125 : 75) : 120;
    }
    sc -= Math.hypot(f.x - cx, f.z - cz) / 7;
    // spread out over the field, except attackers in breakthrough, who mass on one flag at a time
    const massing = M.mode === 'breakthrough' && team === M.attacker && !mine;
    for (const o of SQUADS[team]) if (o !== sq && o.obj === f) sc += massing ? 8 : -28;
    sc += Math.random() * 18;
    if (sc > bs) { bs = sc; best = f; }
  }
  return best;
}
function orderSquad(s, f) {
  const sq = s.squad; if (!sq) return;
  sq.order = f; sq.orderT = clock; sq.obj = f;
  for (const m of sq.members) if (m.bot) { m.bot.goal = null; m.bot.obj = f; }
  const verb = f.owner === s.team ? 'Defend' : 'Take';
  hudMsg('Squad: ' + verb + ' ' + f.name + ' (' + f.id + ')', 'gold');
  sHuzzah(s.pos, 3);
}
function updateSquads(dt) {
  for (const team of [US, GB]) for (const sq of SQUADS[team]) {
    sq.objT -= dt;
    if (sq.objT <= 0 || !sq.obj || sq.obj.locked || (sq.obj.owner === team && sq.obj.threat <= 0 && Math.random() < dt * 0.1) || (MATCH.mode === 'breakthrough' && !sq.obj.active)) {
      const o = squadObjective(sq);
      if (o !== sq.obj) for (const m of sq.members) if (m.bot) m.bot.goal = null;
      sq.obj = o; sq.objT = frand(12, 20);
    }
  }
}

// ---------- perception ----------
function botSees(s, o, maxD) {
  const e = soldierEye(s, _v1);
  const dx = o.hb.nx - e.x, dz = o.hb.nz - e.z, d = Math.hypot(dx, dz);
  if (d > maxD) return false;
  // hidden by gunsmoke, or by the woods at range
  if (smokeAlong(e.x, e.z, o.pos.x, o.pos.z) > 1.3 - (o.lastFireT > clock - 1 ? -0.8 : 0)) return false;
  const fo = (forestAt(e.x, e.z) + forestAt(o.pos.x, o.pos.z) + forestAt((e.x + o.pos.x) / 2, (e.z + o.pos.z) / 2)) / 3;
  if (d > 30 + (1 - fo) * 200) return false;
  // a crouched man behind a wall shows less
  const ty = o.crouch > 0.5 ? o.hb.hy - 0.05 : o.hb.ny - 0.15;
  if (losClear(e.x, e.y, e.z, o.hb.nx, ty, o.hb.nz)) return true;
  return losClear(e.x, e.y, e.z, o.hb.hx, o.hb.hy, o.hb.hz);
}
function perceive(s) {
  const B = s.bot, D = diffOf(s);
  const R = (s.cls === 'rifle' ? 230 : 150) * D.see;
  const e = s.pos, fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  let best = null, bs = 1e9;
  const keep = B.target && B.target.alive && B.target.state === 'up' ? B.target : null;
  forSoldiersIn(e.x - R, e.z - R, e.x + R, e.z + R, (o) => {
    if (o.team === s.team || o.state !== 'up') return;
    const dx = o.pos.x - e.x, dz = o.pos.z - e.z, d = Math.hypot(dx, dz);
    if (d > R * (o.spotT > 0 ? 1.4 : 1)) return;
    const front = (dx * fx + dz * fz) / (d || 1);
    const alert = clock - B.threatT < 6 || o.spotT > 0 || d < 12;
    if (front < -0.2 && !alert) return;
    let sc = d * (o === keep ? 0.6 : 1) * (front < 0.3 ? 1.5 : 1) - (o.spotT > 0 ? 25 : 0) - (o.lastFireT > clock - 2 ? 15 : 0);
    if (o.mount && o.mount.type === 'horse') sc -= 10;
    if (sc >= bs) return;
    if (!botSees(s, o, R * (o.spotT > 0 ? 1.4 : 1))) return;
    bs = sc; best = o;
  });
  if (best !== B.target) { B.target = best; B.seenT = clock; B.aimT = 0; B.aimNeed = frand(D.aim[0], D.aim[1]) * (s.cls === 'rifle' ? 1.3 : 1); }
  if (best) { B.threat = best.pos.clone(); B.threatT = clock; }
}
function botShotAt(s, att, hit) {
  const B = s.bot; if (!B || !att) return;
  B.threat = att.pos.clone(); B.threatT = clock;
  if (hit && !B.target && att.state === 'up' && att.pos.distanceTo(s.pos) < 200) { B.target = att; B.seenT = clock - 0.3; B.aimT = 0; B.aimNeed = frand(...diffOf(s).aim); }
}
function heardShot(sh) {
  for (const s of SOLDIERS) {
    if (!s.bot || !s.alive || s.team === sh.team || s.state !== 'up') continue;
    const d = Math.abs(s.pos.x - sh.pos.x) + Math.abs(s.pos.z - sh.pos.z);
    if (d < 160 && clock - s.bot.threatT > 3) { s.bot.threat = sh.pos.clone(); s.bot.threatT = clock; }
  }
}

// ---------- thinking ----------
function think(s) {
  const B = s.bot, M = MATCH;
  if (B.peace) { B.target = null; B.state = 'move'; return; }
  if (s.mount) {
    if (s.mount.type === 'horse') { if (!s.mount.h.alive) dismount(s); else perceive(s); }
    return;
  }
  perceive(s);
  const t = B.target, w = s.wp.def;
  const dT = t ? t.pos.distanceTo(s.pos) : 1e9;
  // tasks first: revive, crew a gun, plant colours, mount up
  if (s.cls === 'surgeon' && (!t || dT > 25)) {
    let best = null, bd = 32;
    for (const o of SOLDIERS) if (o.team === s.team && o.state === 'down' && o.downT > 2) { const d = o.pos.distanceTo(s.pos); if (d < bd) { bd = d; best = o; } }
    if (best) { B.state = 'revive'; B.task = best; return; }
  }
  if (s.cls === 'arty' && (!t || dT > 30)) {
    for (const c of CANNONS) {
      if (!c.alive || c.crew || c.claim && c.claim !== s) continue;
      const own = cannonOwner(c);
      if (own !== -1 && own !== s.team) continue;
      if (c.pos.distanceTo(s.pos) < 55) { B.state = 'crew'; B.task = c; c.claim = s; return; }
    }
  }
  if (B.rider && !s.mount) {
    for (const h of HORSES) if (h.alive && !h.rider && h.team === s.team && h.pos.distanceTo(s.pos) < 40 && (!h.claim || h.claim === s)) { B.state = 'mount'; B.task = h; h.claim = s; return; }
  }
  if (s.cls === 'officer' && clock > B.coloursT && B.obj) {
    const d = Math.hypot(B.obj.x - s.pos.x, B.obj.z - s.pos.z);
    if (d < 55 && d > 12 && (!t || dT > 40) && (!s.colours || !s.colours.alive || Math.hypot(s.colours.x - s.pos.x, s.colours.z - s.pos.z) > 90)) {
      plantColours(s, s.pos.x, s.pos.z); B.coloursT = clock + 60;
    }
  }
  // combat
  if (t) {
    const hasBay = w.bayonet || s.hand === 'melee';
    const empty = s.wp.loaded <= 0 || s.wp.reloading;
    // close in with cold steel: always at arm's length, and when empty and near with the drill barely begun
    const charge = dT < 3.2 || (dT < 9 && hasBay) || (empty && hasBay && dT < 16 && s.wp.rt < w.reload * 0.65) ||
      (B.state === 'charge' && dT < 30) || (empty && w.bayonet && (s.cls === 'line' || s.cls === 'officer') && dT < 34 && s.wp.rt < w.reload * 0.4 && Math.random() < 0.35);
    if (charge) {
      if (B.state !== 'charge') { STATS.charges++; if (dT > 6 && s.squad && clock - s.squad.huzzahT > 15) { s.squad.huzzahT = clock; sHuzzah(s.pos, 5); } }
      B.state = 'charge'; s.wp.reloading = false; s.wp.rt = 0; return;
    }
    // hold fire beyond the piece's useful range and close the distance instead
    const eff = w.model === 'rifle' || w.model === 'jaeger' ? 240 : w.model === 'pistol' ? 35 : w.model === 'blunder' ? 28 : w.model === 'carbine' ? 85 : 115;
    if (!empty && dT > eff) { B.state = 'advance'; return; }
    if (s.wp.loaded > 0 && !s.wp.reloading) {
      // grenadiers throw at close men behind cover
      if (s.cls === 'line' && s.gad[0] > 0 && dT > 12 && dT < 30 && clock > B.nadeT && Math.random() < 0.18) { botGrenade(s, t); B.nadeT = clock + frand(20, 40); }
      B.state = 'fight'; return;
    }
    if (s.wp.ammo > 0) { B.state = 'reload'; return; }
    B.state = hasBay ? 'charge' : 'move'; return;
  }
  if (s.wp.loaded < (w.shots || 1) && s.wp.ammo > 0 && clock - B.threatT > 2) { startReload(s); }
  B.state = 'move';
}
function botGrenade(s, t) {
  const dx = t.pos.x - s.pos.x, dz = t.pos.z - s.pos.z, d = Math.hypot(dx, dz);
  const e = soldierEye(s, _v1);
  const ang = 0.6, v = Math.sqrt(d * G_ACC / Math.sin(2 * ang)) * frand(0.92, 1.08);
  throwGrenade(s, e.x, e.y, e.z, (dx / d) * Math.cos(ang), Math.sin(ang) - 3 / Math.max(v, 1), (dz / d) * Math.cos(ang), v);
  s.gad[0]--;
}

// ---------- acting (every frame) ----------
function goalFor(s) {
  const B = s.bot, f = B.obj;
  if (!f) { const hq = TER.map.hq[s.team]; return { x: hq.x, z: hq.z }; }
  if (!B.goal || B.goalT < clock || Math.hypot(B.goal.x - f.x, B.goal.z - f.z) > f.r + 2) {
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * f.r * 0.8;
      const x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r, ni = navIndex(x, z);
      if (ni >= 0 && NAV.cost[ni] && NAV.cost[ni] < 6) { B.goal = { x, z }; break; }
    }
    if (!B.goal) B.goal = { x: f.x, z: f.z };
    B.goalT = clock + frand(10, 22);
  }
  return B.goal;
}
function steer(s, tx, tz, dt, flowKey) {
  const B = s.bot;
  let dx = tx - s.pos.x, dz = tz - s.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.6) return 0;
  const flow = flowKey && NAV.flows[flowKey];
  if (flow && d > 8) { flowDir(flow, s.pos.x, s.pos.z, tx, tz, _af); dx = _af.x; dz = _af.z; }
  else { dx /= d; dz /= d; }
  // keep a little apart from friends
  let sx = 0, sz = 0;
  forSoldiersIn(s.pos.x - 2, s.pos.z - 2, s.pos.x + 2, s.pos.z + 2, (o) => {
    if (o === s || o.state !== 'up') return;
    const ox = s.pos.x - o.pos.x, oz = s.pos.z - o.pos.z, od = Math.hypot(ox, oz);
    if (od < 1.4 && od > 0.01) { sx += ox / od * (1.4 - od); sz += oz / od * (1.4 - od); }
  });
  dx += sx * 0.8; dz += sz * 0.8;
  // unstick: sidestep along the obstacle, or vault it
  if (B.sideT > 0) { B.sideT -= dt; const px = -dz * B.side, pz = dx * B.side; dx = dx * 0.3 + px; dz = dz * 0.3 + pz; }
  const l = Math.hypot(dx, dz) || 1;
  _ad.set(dx / l, 0, dz / l);
  return d;
}
function actBot(s, dt) {
  const B = s.bot, D = diffOf(s), w = s.wp.def;
  if (s.state !== 'up') return;
  if (B.hold) { moveSoldier(s, 0, 0, 0, false, dt); return; }   // test hook: stand still
  if (s.mount) {
    if (s.mount.type === 'cannon') botCannon(s.mount.c, s, dt);
    else if (s.mount.type === 'horse') botHorse(s.mount.h, s, dt);
    else if (s.mount.type === 'ship') botShip(s.mount.s, s, dt);
    return;
  }
  let speed = 0, wantYaw = s.yaw, jump = false;
  s.wantAim = false; s.sprint = false; B.charge = false; s.crouching = false;
  const t = B.target;
  switch (B.state) {
    case 'fight': {
      if (!t || t.state !== 'up') { B.state = 'move'; break; }
      const e = soldierEye(s, _v1);
      const dx = t.hb.nx - e.x, dz = t.hb.nz - e.z, d = Math.hypot(dx, dz);
      wantYaw = Math.atan2(dx, dz);
      s.crouching = s.cls === 'rifle' || (d > 50 && (s.id & 1));
      const facing = Math.abs(angWrap(wantYaw - s.yaw)) < 0.25;
      if (facing && clock - B.seenT > D.react) { s.wantAim = true; B.aimT += dt; }
      if (B.aimT >= B.aimNeed && s.aimT > 0.8) {
        // volleys: line infantry of one squad fire together when they can
        if (s.cls === 'line' && s.squad) {
          const sq = s.squad;
          if (sq.volleyAt < clock - 3) {
            const ready = sq.members.filter((m) => m.bot && m.state === 'up' && m.bot.state === 'fight' && m.pos.distanceTo(s.pos) < 22).length;
            if (ready >= 2) { sq.volleyAt = clock + 0.9; if (sq.members.some((m) => m.cls === 'officer' && m.alive) || ready >= 3) volleyCall(s); }
          }
          if (sq.volleyAt > clock && sq.volleyAt - clock < 1.2) break;
        }
        if (canFire(s)) botFire(s, t, d);
      }
      break;
    }
    case 'reload': {
      if (!s.wp.reloading) startReload(s);
      if (s.wp.loaded > 0 && !s.wp.reloading) { B.state = 'move'; break; }
      if (B.threat) wantYaw = Math.atan2(B.threat.x - s.pos.x, B.threat.z - s.pos.z);
      s.crouching = s.cls === 'rifle' || earthAt(s.pos.x, s.pos.z) > 0.3;
      // fall back a few steps toward the objective if he is in the open and close to the enemy
      if (t && t.pos.distanceTo(s.pos) < 30 && B.obj) {
        const back = Math.hypot(B.obj.x - s.pos.x, B.obj.z - s.pos.z) > B.obj.r ? 1 : 0;
        if (back) { steer(s, B.obj.x, B.obj.z, dt, 'F' + B.obj.id); speed = SPEED.reload; }
      }
      break;
    }
    case 'charge': {
      if (!t || t.state === 'dead') { B.state = 'move'; break; }
      const dx = t.pos.x - s.pos.x, dz = t.pos.z - s.pos.z, d = Math.hypot(dx, dz);
      wantYaw = Math.atan2(dx, dz);
      steer(s, t.pos.x, t.pos.z, dt, null);
      speed = d > 3 ? SPEED.run : SPEED.walk; s.sprint = d > 3 && s.stamina > 0.1; B.charge = true;
      const reach = meleeFor(s).reach;
      if (d < reach + 0.2 && Math.abs(angWrap(wantYaw - s.yaw)) < 0.5) { startMelee(s); }
      if (d > 30) B.state = 'move';
      break;
    }
    case 'revive': {
      const o = B.task;
      if (!o || o.state !== 'down') { B.state = 'move'; B.task = null; break; }
      const d = steer(s, o.pos.x, o.pos.z, dt, null);
      wantYaw = Math.atan2(o.pos.x - s.pos.x, o.pos.z - s.pos.z);
      if (d > 1.4) { speed = SPEED.run; s.sprint = true; B.reviveT = 0; }
      else { s.crouching = true; B.reviveT += dt; if (B.reviveT > 1.5) { reviveSoldier(o, s); B.state = 'move'; B.task = null; } }
      break;
    }
    case 'crew': {
      const c = B.task;
      if (!c || !c.alive || (c.crew && c.crew !== s)) { B.state = 'move'; if (c && c.claim === s) c.claim = null; B.task = null; break; }
      const d = steer(s, c.pos.x - Math.sin(c.yaw) * 1.6, c.pos.z - Math.cos(c.yaw) * 1.6, dt, null);
      wantYaw = Math.atan2(_ad.x, _ad.z);
      speed = d > 8 ? SPEED.run : SPEED.walk; s.sprint = d > 8;
      if (d < 1.6) { crewCannon(c, s); }
      break;
    }
    case 'advance': {
      if (!t || t.state !== 'up') { B.state = 'move'; break; }
      // walk toward the enemy, keeping roughly to the objective's side of the field
      const f = B.obj;
      const tx = f && Math.hypot(f.x - s.pos.x, f.z - s.pos.z) > f.r ? lerp(t.pos.x, f.x, 0.4) : t.pos.x, tz = f && Math.hypot(f.x - s.pos.x, f.z - s.pos.z) > f.r ? lerp(t.pos.z, f.z, 0.4) : t.pos.z;
      steer(s, tx, tz, dt, f ? 'F' + f.id : null);
      wantYaw = Math.atan2(_ad.x, _ad.z); speed = SPEED.walk;
      break;
    }
    case 'mount': {
      const h = B.task;
      if (!h || !h.alive || h.rider) { B.state = 'move'; B.task = null; break; }
      const d = steer(s, h.pos.x, h.pos.z, dt, null);
      wantYaw = Math.atan2(_ad.x, _ad.z); speed = SPEED.run; s.sprint = true;
      if (d < 2) mountHorse(h, s);
      break;
    }
    default: {
      // move to the objective, then hold inside it
      const f = B.obj || (s.squad && s.squad.obj);
      B.obj = f;
      const g = goalFor(s);
      const inZone = f && Math.hypot(f.x - s.pos.x, f.z - s.pos.z) < f.r;
      const d = steer(s, g.x, g.z, dt, f ? 'F' + f.id : null);
      if (d > 0.6) {
        wantYaw = Math.atan2(_ad.x, _ad.z);
        const far = d > 45 && clock - B.threatT > 6;
        speed = s.wp.reloading ? SPEED.reload : far && s.stamina > 0.3 ? SPEED.run : SPEED.walk;
        s.sprint = speed === SPEED.run;
      } else {
        if (B.threat && clock - B.threatT < 10) wantYaw = Math.atan2(B.threat.x - s.pos.x, B.threat.z - s.pos.z);
        s.crouching = inZone && (s.id % 3 === 0 || earthAt(s.pos.x, s.pos.z) > 0.3);
        if (s.wp.loaded < (w.shots || 1) && s.wp.ammo > 0) startReload(s);
      }
    }
  }
  if (speed > 0 && B.state !== 'fight') {
    // stuck against something: try to vault, then sidestep
    if (s.moved !== undefined && s.moved < speed * 0.25) B.stuckT += dt; else B.stuckT = Math.max(0, B.stuckT - dt);
    if (B.stuckT > 0.5) { jump = true; }
    if (B.stuckT > 1.2) { B.sideT = frand(0.8, 1.6); B.side = Math.random() < 0.5 ? -1 : 1; B.stuckT = 0; }
  }
  s.yaw = angTo(s.yaw, wantYaw, dt * (B.state === 'fight' ? 3.5 : 6));
  if (B.state === 'fight' && t) {
    const e = soldierEye(s, _v1);
    s.pitch = Math.atan2(t.hb.ny - e.y, Math.hypot(t.hb.nx - e.x, t.hb.nz - e.z));
  } else s.pitch *= 0.9;
  moveSoldier(s, _ad.x, _ad.z, speed, jump, dt);
  if (speed === 0) _ad.set(0, 0, 0);
}
function volleyCall(s) {
  if (camera.position.distanceTo(s.pos) < 90 && Math.random() < 0.5) {
    const p = s.pos.clone();
    setTimeout(() => sHuzzah(p, 2), 50);
  }
}
// Aim at the chest with drop compensation, lead and skill error, then fire.
function botFire(s, t, d) {
  const D = diffOf(s), w = s.wp.def;
  const e = soldierEye(s, _v1);
  const tof = d / w.vel;
  const tx = t.hb.nx * 0.6 + t.hb.px * 0.4 + t.vel.x * tof * 0.8, tz = t.hb.nz * 0.6 + t.hb.pz * 0.4 + t.vel.z * tof * 0.8;
  const ty = (t.hb.ny * 0.6 + t.hb.py * 0.4) + 0.5 * G_ACC * tof * tof * 1.05;
  _v2.set(tx - e.x, ty - e.y, tz - e.z).normalize();
  const err = (0.35 + 1.0 / (1 + s.bot.aimT)) * D.err * (t.crouch > 0.5 ? 1.15 : 1) * Math.PI / 180;
  _v2.x += frand(-err, err); _v2.y += frand(-err, err) * 0.7; _v2.z += frand(-err, err);
  _v2.normalize();
  const m = s.muzzle;
  fireWeapon(s, e.x, e.y, e.z, _v2.x, _v2.y, _v2.z, m.x, m.y, m.z, D.err * 0.9);
  s.bot.aimT = 0; s.bot.aimNeed = frand(D.aim[0], D.aim[1]);
  if (s.wp.loaded <= 0) { s.bot.state = 'reload'; s.bot.think = Math.min(s.bot.think, 0.3); }
}
function updateAI(dt) {
  updateSquads(dt);
  if (NAV_DIRTY && (MATCH.navT = (MATCH.navT || 0) - dt) <= 0) {
    // rebuild nav after destruction, a few seconds at a time
    MATCH.navT = 6; NAV_DIRTY = 0; buildNav();
    for (const f of MATCH.flags) computeFlow('F' + f.id, f.x, f.z, Math.max(4, f.r * 0.5));
  }
  for (const s of SOLDIERS) {
    if (!s.bot || s.state !== 'up') continue;
    const B = s.bot;
    if (!B.obj && s.squad) B.obj = s.squad.obj;
    if (s.squad && B.obj !== s.squad.obj && B.state === 'move') { B.obj = s.squad.obj; B.goal = null; }
    B.think -= dt;
    if (B.think <= 0) { B.think = frand(0.25, 0.45); think(s); }
    actBot(s, dt);
  }
}
