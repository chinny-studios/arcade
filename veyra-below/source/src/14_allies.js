// Veyra Below — AI party members: recruiting, following, fighting, healing, reviving, chatter

const ALLIES = [];
function genAllyCandidate(level, rng = rnd) {
  const role = rng.pick(Object.keys(ROLES)), race = rng.pick(Object.keys(RACES));
  const name = rng.pick(ALLY_NAMES);
  const weapons = ROLES[role].weapons.filter((w) => role !== 'vanguard' || w !== 'pistol');
  return {
    name, role, race, level: Math.max(1, level + rng.int(-1, 1)), weapon: rng.pick(weapons.slice(0, 4)), personality: rng.pick(PERSONALITIES),
    look: { suit: rng.pick(SUIT_COLORS), suit2: rng.pick([0x2a2e38, 0x3a3030, 0x30383a, 0xe8e8e8]), hair: rng.pick(HAIR_COLORS), build: rng.int(0, 1), glow: rng.pick([0x60e0ff, 0xff70a0, 0x80ff90, 0xffd060]) },
    sid: signFor(name).id,
  };
}
function spawnAllies(x, z) {
  ALLIES.length = 0;
  const c = GAME.char;
  c.allies.forEach((rec, i) => {
    rec.level = Math.max(1, c.level + (rec.lvOff || 0));
    const ac = allyChar(rec);
    const a = makePartyActor(ac, x + (i - 1) * 1.4, z + 1.6, false);
    a.rec = rec;
    a.ai = { think: 0, target: null, chatT: rnd.range(20, 40), moon: 2, reviveT: 0, healCd: 0, buffCd: 2, skillCd: 2, techCd: 0, stuckT: 0, lastPos: { x, z }, mode: 'follow' };
    ALLIES.push(a);
  });
}
function say(a, kind, force = false) {
  if (!a.rec) return;
  const lines = ALLY_LINES[a.rec.personality][kind]; if (!lines) return;
  if (!force && a.ai.lastSay && GAME.time - a.ai.lastSay < 6) return;
  a.ai.lastSay = GAME.time;
  HUD.say(a, rnd.pick(lines));
}
function allyChatter(kind, chance = 0.35) {
  const cands = ALLIES.filter((a) => !a.dead && !a.downed);
  if (!cands.length || Math.random() > chance) return;
  say(rnd.pick(cands), kind);
}
function inDanger(a) {
  for (const z of ZONES) if (z.team === 1 && !z.fired && z.teleFx && inZone(z, { x: a.x, z: a.z, r: a.r + 0.4 })) return z;
  return null;
}
function bestTechFor(a, t) {
  const opts = Object.entries(a.char.techs).filter(([id, lv]) => lv > 0 && TECHS[id].elem && techCost(id, lv) <= a.tp);
  if (!opts.length) return null;
  let best = null, bs = -9;
  for (const [id] of opts) {
    const T_ = TECHS[id], res = t.res ? t.res[T_.elem] || 0 : 0;
    const crowd = T_.kind === 'ring' ? foesInRadius(0, a.x, a.z, T_.radius).length : T_.kind === 'burst' || T_.kind === 'storm' ? foesInRadius(0, t.x, t.z, 3.5).length : 1;
    const s = -res * 2 + crowd * 0.5 + Math.random() * 0.6 + (T_.kind === 'ring' && crowd < 3 ? -2 : 0) + (T_.forceOnly ? 0.4 : 0);
    if (s > bs) { bs = s; best = id; }
  }
  return best;
}
function updateAlly(a, dt) {
  const ai = a.ai, ctrl = { mx: 0, mz: 0, aim: null, atk: null, atkHeld: false, dodge: false, slot: null };
  if (a.downed) { updatePartyActor(a, dt, ctrl); return; }
  ai.think -= dt; ai.healCd -= dt; ai.buffCd -= dt; ai.skillCd -= dt; ai.techCd -= dt; ai.chatT -= dt;
  const P = PL;
  const party = [PL, ...ALLIES].filter((p) => p && !p.dead);
  // teleport back if left far behind
  if (P && !P.downed && dist2(a.x, a.z, P.x, P.z) > 32 * 32) { a.x = P.x + rnd.range(-1, 1); a.z = P.z + rnd.range(-1, 1); pushOut(a, a.r); FX.teleIn(a.x, a.z, 0x60e0ff); }
  if (ai.think <= 0) {
    ai.think = 0.2;
    ai.down = party.find((p) => p !== a && p.downed && dist2(a.x, a.z, p.x, p.z) < 18 * 18) || null;
    ai.hurt = party.filter((p) => !p.downed && p.hp < p.maxHp * 0.55 && dist2(a.x, a.z, p.x, p.z) < 8 * 8);
    // a target near the player that we can see
    let best = null, bs = Infinity;
    for (const e of ENTS) {
      if (e.team !== 1 || !alive(e) || e.untargetable || e.stealthed) continue;
      const dp = P ? dist2(e.x, e.z, P.x, P.z) : 0, da = dist2(e.x, e.z, a.x, a.z);
      if (dp > 15 * 15 && da > 10 * 10) continue;
      if (!e.aggro && da > 8 * 8 && dp > 8 * 8) continue;
      if (!los(a.x, a.z, e.x, e.z) && da > 3) continue;
      const s = da + (e.aggro === a ? -10 : 0) + (e.boss ? -20 : 0) + (ai.target === e ? -8 : 0);
      if (s < bs) { bs = s; best = e; }
    }
    ai.target = best;
  }
  const danger = inDanger(a);
  const t = ai.target && alive(ai.target) ? ai.target : null;
  const cls = wcls(a), isPsion = a.role === 'psion';
  const has = (id) => (a.char.techs[id] || 0) > 0;
  let goal = null, stand = 0;
  if (danger) {
    const dx = a.x - danger.x, dz = a.z - danger.z, l = Math.hypot(dx, dz) || 1;
    ctrl.mx = dx / l; ctrl.mz = dz / l; if (Math.random() < 0.03) ctrl.dodge = true;
  } else if (ai.down) {
    // revive: Rekindle for those who know it, otherwise a Revive Shot
    const d = ai.down, dd = Math.sqrt(dist2(a.x, a.z, d.x, d.z));
    const canRev = has('rekindle') && a.tp >= techCost('rekindle', 1);
    if (canRev && dd < 5) { castAllyTech(a, 'rekindle', { x: d.x, z: d.z }); say(a, 'heal'); }
    else if (!canRev && ai.moon > 0 && dd < 1.6) { ai.reviveT += dt; if (ai.reviveT > 1.5) { ai.reviveT = 0; ai.moon--; reviveActor(d, 0.5); say(d.rec ? d : a, 'revive', true); } }
    else goal = d;
    if (!canRev && ai.moon <= 0) goal = null;
  } else if (ai.hurt.length && has('mend') && ai.healCd <= 0 && a.tp >= techCost('mend', a.char.techs.mend)) {
    if (castAllyTech(a, 'mend', { x: a.x, z: a.z })) { ai.healCd = 2.5; if (Math.random() < 0.3) say(a, 'heal'); }
  } else if (t && GAME.inCombat && ai.buffCd <= 0 && (has('fervor') || has('bulwark')) && a.tp > 30) {
    const id = has('fervor') && (!PL.buffs.fervor || PL.buffs.fervor.t < 5) ? 'fervor' : has('bulwark') && (!PL.buffs.bulwark || PL.buffs.bulwark.t < 5) ? 'bulwark' : null;
    if (id && dist2(a.x, a.z, PL.x, PL.z) < 36) castAllyTech(a, id, { x: a.x, z: a.z }); else if (id) goal = PL;
    ai.buffCd = id ? 4 : 6;
  } else if (t) {
    const d = Math.sqrt(dist2(a.x, a.z, t.x, t.z));
    ctrl.aim = { x: t.x, z: t.z };
    const range = cls === 'melee' ? WTYPES[a.wtype || 'blade'].range * 0.8 + t.r : isPsion ? 8 : Math.min(9, (WTYPES[a.wtype] || {}).range || 9);
    if (isPsion || cls !== 'melee') {
      const want = isPsion ? 6.5 : 6;
      if (d > range) goal = t; else if (d < want - 2.5) { const l = d || 1; ctrl.mx = (a.x - t.x) / l; ctrl.mz = (a.z - t.z) / l; }
      const techId = isPsion && ai.techCd <= 0 ? bestTechFor(a, t) : null;
      if (d <= range + 1 && los(a.x, a.z, t.x, t.z)) {
        if (techId && a.tp > a.maxTp * 0.25) { castAllyTech(a, techId, { x: t.x, z: t.z }); ai.techCd = rnd.range(0.4, 1.0); }
        else if (!a.act) ctrl.atk = 'N';
      }
    } else {
      if (d > range) goal = t;
      else { ctrl.atk = a.combo.step === 1 && Math.random() < 0.5 ? 'H' : a.combo.step === 1 && a.weapon && a.weapon.special && a.tp > 20 && Math.random() < 0.3 ? 'S' : 'N'; ctrl.atkHeld = true; }
    }
    // class skills now and then
    if (ai.skillCd <= 0 && !a.act) {
      const known = Object.entries(a.char.skills).filter(([id, r]) => r > 0 && SKILLS[id].type === 'active' && (a.cd['s_' + id] || 0) <= 0 && a.tp >= (SKILLS[id].tp || 0) + 8);
      if (known.length && d < (cls === 'melee' ? 4 : 10)) { const [id] = rnd.pick(known); if (id !== 'familiar' || !ENTS.some((e) => e.summon && e.owner === a)) { startSkill(a, id, { x: t.x, z: t.z }); } ai.skillCd = rnd.range(2, 5); }
    }
  } else if (a === PL) {
    if (ai.explore) goal = ai.explore;
  } else if (P) {
    // follow in formation behind the player
    const idx = ALLIES.indexOf(a), ang = P.yaw + Math.PI + (idx - (ALLIES.length - 1) / 2) * 0.9;
    const fx = P.x + Math.sin(ang) * 2.4, fz = P.z + Math.cos(ang) * 2.4;
    if (dist2(a.x, a.z, fx, fz) > 1.2) goal = { x: fx, z: fz }; stand = 1;
    if (ai.chatT <= 0) { ai.chatT = rnd.range(35, 80); if (GAME.mode === 'field') say(a, 'idle'); }
  }
  if (goal) {
    const d = Math.sqrt(dist2(a.x, a.z, goal.x, goal.z));
    let dx = goal.x - a.x, dz = goal.z - a.z;
    if ((d > 3 && !los(a.x, a.z, goal.x, goal.z)) || ai.stuckT > 0.8) {
      const f = flowDir(LV, updateFlow(LV, goal.x, goal.z, a === PL ? 400 : 60), a.x, a.z); if (f) { dx = f.x; dz = f.z; }
    }
    const l = Math.hypot(dx, dz) || 1;
    ctrl.mx = dx / l; ctrl.mz = dz / l;
    ctrl.walk = stand && d < 3;
  }
  // stuck detection
  const moved = dist2(a.x, a.z, ai.lastPos.x, ai.lastPos.z);
  if ((ctrl.mx || ctrl.mz) && moved < 0.0004) ai.stuckT += dt; else ai.stuckT = Math.max(0, ai.stuckT - dt);
  ai.lastPos.x = a.x; ai.lastPos.z = a.z;
  updatePartyActor(a, dt, ctrl);
}
function castAllyTech(a, id, aim) {
  if (a.act) return false;
  return startTech(a, id, aim);
}
