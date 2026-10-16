// Veyra Below — party actors (player and AI wardens): combos, dodge, psionic arts, skills, items

const COMBO_GRACE = 0.4;
const SKILL_DUR = { risingslash: 0.45, whirlwind: 0.2, warcry: 0.5, sunder: 0.6, volley: 0.4, piercinglance: 0.7, grenade: 0.45, predatorsmark: 0.3, sentry: 0.4, plasmarain: 0.5,
  psibolt: 0.32, barrier: 0.4, familiar: 0.5, umbralrite: 0.6, meteor: 0.65, trapburst: 0.3, trapfreeze: 0.3 };

function makePartyActor(c, x, z, isPlayer) {
  const a = makeActor(isPlayer ? 'player' : 'ally', x, z, { team: 0, char: c, role: c.role, race: c.race, name: c.name, h: 1.9 });
  a.rig = makeHumanoid({ suit: c.look.suit, suit2: c.look.suit2, hair: c.look.hair, race: c.race, role: c.role, build: c.look.build, glow: c.look.glow || 0x60e0ff });
  a.model = a.rig.g; a.baseScale = a.model.scale.x; R.root.add(a.model);
  a.combo = { step: -1, endT: 99 };
  refreshPartyActor(a, true);
  return a;
}
// re-read stats and equipment (after level ups, equipment changes, materials)
function refreshPartyActor(a, full) {
  const c = a.char, hpFrac = a.maxHp > 1 ? a.hp / a.maxHp : 1, tpFrac = a.maxTp > 0 ? a.tp / a.maxTp : 1;
  a.S = computeStats(c); a.lvl = c.level;
  a.maxHp = a.S.maxHp; a.maxTp = a.S.maxTp;
  if (full) { a.hp = a.maxHp; a.tp = a.maxTp; } else { a.hp = Math.min(a.maxHp, Math.max(a.downed ? 0 : 1, Math.round(a.maxHp * hpFrac))); a.tp = Math.min(a.maxTp, a.maxTp * tpFrac); }
  const w = c.equip.weapon && !c.equip.weapon.unid && ROLES[c.role].weapons.includes(c.equip.weapon.base) && reqLevel(c.equip.weapon) <= c.level ? c.equip.weapon : null;
  a.weapon = w; a.wtype = w ? w.base : null;
  if (a.rig.wtype !== a.wtype || a.rigGlowFor !== (w && w.uid)) { equipWeaponModel(a.rig, a.wtype, weaponGlow(a)); a.rigGlowFor = w && w.uid; }
}
const wcls = (a) => (a.wtype ? WTYPES[a.wtype].cls : 'melee');

// ctrl: { mx, mz, aim: {x,z}, atk: 'N'|'H'|'S'|null, atkHeld: bool, dodge, slot: index|null, run }
function updatePartyActor(a, dt, ctrl) {
  a.t += dt; a.st += dt;
  updateStatus(a, dt);
  if (a.buffs.regen) heal(a, a.buffs.regen.v * dt, false);
  a.lastHurt += dt;
  if (a.downed) { a.downT = (a.downT || 0) + dt; animParty(a, dt, 0); return; }
  // regeneration
  const S = a.S;
  a.tp = Math.min(a.maxTp, a.tp + S.tpRegenTotal * dt);
  if (S.hpRegen) heal(a, S.hpRegen * dt, false);
  if (a.lastHurt > 6 && !GAME.inCombat) heal(a, a.maxHp * 0.01 * dt, false);
  for (const k in a.cd) if (a.cd[k] > 0) a.cd[k] -= dt;
  if (a.hitT > 0) a.hitT -= dt;
  const free = canAct(a);
  let moveMul = 1, mvState = null;
  const act = a.act;
  // ----- current action -----
  if (act) {
    act.t += dt;
    if (act.type === 'attack') {
      moveMul = wcls(a) === 'melee' ? 0 : 0.25;
      if (!act.released && act.t >= act.dur * act.hitAt) {
        act.released = true;
        if (wcls(a) === 'melee') { const l = WTYPES[a.wtype || 'blade'].cls === 'melee' ? 0.5 : 0; moveCircle(a, Math.sin(act.yaw) * l, Math.cos(act.yaw) * l, a.r); }
        attackRelease(a, act);
      }
      if (ctrl.atk && act.t > act.dur * 0.2 && !act.queued) { act.queued = ctrl.atk; act.queuedAt = act.t / act.dur; }
      if (act.t >= act.dur) {
        a.act = null; a.combo.endT = 0;
        if (!act.queued && ctrl.atkHeld && a.combo.step < 2) { act.queued = a.lastAtkKind || 'N'; act.queuedAt = 0; }
        if (act.queued && a.combo.step < 2 && free) startAttack(a, act.queued, a.combo.step + 1, ctrl.aim, act.queuedAt >= 0.62 && act.queuedAt <= 0.97);
        else if (a.combo.step >= 2) a.combo.step = -1;
      }
    } else if (act.type === 'cast' || act.type === 'skill' || act.type === 'use') {
      moveMul = 0;
      if (!act.fired && act.t >= act.dur * (act.fireAt || 0.5)) {
        act.fired = true;
        if (act.type === 'cast') castTechEffect(a, act.id, act.lv, act.aim);
        else if (act.type === 'skill') useSkillEffect(a, act.id, act.rank, act.aim);
        else useItemEffect(a, act.item);
      }
      if (act.t >= act.dur) a.act = null;
    } else if (act.type === 'dodge') {
      moveMul = 0;
      const k = 1 - act.t / act.dur, sp = act.dist / act.dur * 1.6 * k;
      moveCircle(a, act.dx * sp * dt, act.dz * sp * dt, a.r);
      if (act.t >= act.dur) { a.act = null; if (S.rollDmg) a.rollBonus = S.rollDmg; }
    }
  }
  // dash (rising slash) and spin (whirlwind)
  if (a.dash) {
    const d = a.dash; d.t += dt; const k = Math.min(1, d.t / d.dur);
    if (!d.sx) { d.sx = a.x; d.sz = a.z; }
    const nx = lerp(d.sx, d.tx, k), nz = lerp(d.sz, d.tz, k); moveCircle(a, nx - a.x, nz - a.z, a.r);
    if (k >= 1) { a.dash = null; d.onEnd && d.onEnd(); }
  }
  if (a.spin) {
    const sp = a.spin; sp.t += dt; sp.next -= dt; moveMul = Math.min(moveMul, 0.6);
    a.yaw += dt * 18;
    if (sp.next <= 0) { sp.next = 0.32; FX.slash(a.x, a.z, a.yaw, TAU * 0.95, 2.8, weaponGlow(a), 0.9); AUDIO.sfx('swing', a.x, a.z); for (const e of foesInRadius(a.team, a.x, a.z, 2.8)) partyHit(a, e, skillWeaponHit(a, sp.mult, 'melee', { heavy: false, kb: 2 })); }
    if (sp.t >= sp.dur) a.spin = null;
  }
  if (!free) moveMul = 0;
  if (a.hitT > 0 && !a.act) moveMul *= 0.3;
  // ----- new inputs -----
  if (free && !a.dash) {
    if (ctrl.dodge && (a.cd.dodge || 0) <= 0 && (!a.act || (a.act.type === 'attack' && a.act.released))) startDodge(a, ctrl);
    else if (!a.act && !a.spin) {
      if (ctrl.slot != null) useSlot(a, ctrl.slot, ctrl.aim);
      else if (ctrl.atk || (ctrl.atkHeld && a.combo.endT > 0.05)) {
        const kind = ctrl.atk || a.lastAtkKind || 'N';
        const cont = a.combo.step >= 0 && a.combo.step < 2 && a.combo.endT < COMBO_GRACE;
        startAttack(a, kind, cont ? a.combo.step + 1 : 0, ctrl.aim, false);
      }
    }
  }
  a.combo.endT += dt;
  if (a.combo.endT > COMBO_GRACE && !a.act) a.combo.step = -1;
  // ----- movement -----
  const ml = Math.hypot(ctrl.mx, ctrl.mz);
  const sp = S.speed * speedMul(a) * moveMul * (ctrl.walk ? 0.5 : 1);
  if (ml > 0.05 && sp > 0) {
    const mx = ctrl.mx / Math.max(1, ml), mz = ctrl.mz / Math.max(1, ml);
    moveCircle(a, mx * sp * dt, mz * sp * dt, a.r);
    if (!a.act && !a.spin) a.yaw = angTo(a.yaw, Math.atan2(mx, mz), 14 * dt);
  }
  applyKnockback(a, dt);
  animParty(a, dt, ml > 0.05 && sp > 0 ? Math.min(1, ml) * (moveMul > 0.5 ? 1 : 0.5) : 0);
}
function startAttack(a, kind, step, aim, just) {
  if (kind === 'S') {
    const cost = 4 + Math.floor(a.lvl / 8);
    if (a.weapon && a.weapon.special && a.tp < cost) kind = 'H';
    else if (a.weapon && a.weapon.special) a.tp -= cost;
  }
  const yaw = aim ? Math.atan2(aim.x - a.x, aim.z - a.z) : a.yaw;
  a.yaw = yaw;
  const dur = attackDuration(a, kind);
  a.act = { type: 'attack', kind, step, t: 0, dur, hitAt: wcls(a) === 'melee' ? 0.42 : 0.3, yaw, just };
  a.combo.step = step; a.lastAtkKind = kind;
  if (just) { FX.ring(a.x, a.z, 0xfff0a0, 0.6, 1.4, 0.25, 1); if (a === PL) { AUDIO.sfx('just'); HUD.float(a.x, 2.3, a.z, 'PERFECT', '#fff0a0', 13); } }
}
function startDodge(a, ctrl) {
  let dx = ctrl.mx, dz = ctrl.mz; const l = Math.hypot(dx, dz);
  if (l < 0.1) { dx = Math.sin(a.yaw); dz = Math.cos(a.yaw); } else { dx /= l; dz /= l; }
  a.act = { type: 'dodge', t: 0, dur: 0.38, dx, dz, dist: 5.2 };
  a.yaw = Math.atan2(dx, dz); a.inv = Math.max(a.inv, 0.3);
  a.cd.dodge = 0.75 * (1 - a.S.rollCd);
  a.combo.step = -1;
  FX.burst(a.x, 0.3, a.z, 0xc0e0ff, 6, 2, 0.3, 0.4, { flat: true });
  AUDIO.sfx('miss', a.x, a.z, 0.6);
}
// use hotbar slot i: an art, skill or consumable
function useSlot(a, i, aim) {
  const e = a.char.hotbar[i]; if (!e) return false;
  if (e.t === 'tech') return startTech(a, e.id, aim);
  if (e.t === 'skill') return startSkill(a, e.id, aim);
  if (e.t === 'item') return startItem(a, e.id);
  return false;
}
function startTech(a, id, aim) {
  const lv = a.char.techs[id] || 0;
  if (!lv) { if (a === PL) HUD.toast(`You don't know ${TECHS[id].name}.`, '#ff9090'); return false; }
  if ((a.cd['t_' + id] || 0) > 0) return false;
  const cost = Math.round(techCost(id, lv) * (1 + a.S.tpCost));
  if (a.tp < cost) { if (a === PL) { HUD.float(a.x, 2.3, a.z, 'Not enough PSI', '#80a0ff', 13); AUDIO.sfx('error'); } return false; }
  if (id === 'recall' && (GAME.mode !== 'field' || LV.kind === 'boss')) { if (a === PL) HUD.toast('Recall only works down on Veyra, away from bosses.', '#ff9090'); return false; }
  a.tp -= cost;
  const T_ = TECHS[id], dur = a.role === 'psion' ? 0.42 : 0.55;
  a.act = { type: 'cast', id, lv, t: 0, dur, fireAt: 0.55, aim: aim || { x: a.x + Math.sin(a.yaw) * 5, z: a.z + Math.cos(a.yaw) * 5 } };
  a.yaw = Math.atan2(a.act.aim.x - a.x, a.act.aim.z - a.z);
  a.cd['t_' + id] = 0.2;
  a.combo.step = -1;
  const col = T_.elem ? ELEM_COLORS[T_.elem] : 0xa0ffc0;
  FX.burst(a.x, 1.4, a.z, col, 8, 1.5, 0.4, 0.3, { up: 1 });
  return true;
}
function startSkill(a, id, aim) {
  const sk = SKILLS[id]; if (!sk) return false;
  const rank = sk.role === 'race' ? (knowsSkill(a.char, id) ? 1 : 0) : a.char.skills[id] || 0;
  if (!rank) return false;
  if ((a.cd['s_' + id] || 0) > 0) { if (a === PL) HUD.float(a.x, 2.3, a.z, 'Not ready', '#aaa', 12); return false; }
  const cost = Math.round((sk.tp || 0) * (1 + a.S.tpCost));
  if (a.tp < cost) { if (a === PL) { HUD.float(a.x, 2.3, a.z, 'Not enough PSI', '#80a0ff', 13); AUDIO.sfx('error'); } return false; }
  if ((sk.tags || '').includes('melee') && wcls(a) !== 'melee') return false;
  a.tp -= cost;
  a.cd['s_' + id] = (sk.cd || 1) * (1 - a.S.cdr);
  const aimPt = aim || { x: a.x + Math.sin(a.yaw) * 5, z: a.z + Math.cos(a.yaw) * 5 };
  a.yaw = Math.atan2(aimPt.x - a.x, aimPt.z - a.z);
  a.act = { type: 'skill', id, rank, t: 0, dur: SKILL_DUR[id] || 0.4, fireAt: id === 'risingslash' || id === 'whirlwind' ? 0.05 : 0.4, aim: aimPt };
  a.combo.step = -1;
  return true;
}
function startItem(a, id) {
  const c = a.char;
  if (invCount(c.inv, id) <= 0) { if (a === PL) { HUD.float(a.x, 2.3, a.z, `No ${TOOLS[id].name}s`, '#aaa', 12); AUDIO.sfx('error'); } return false; }
  const use = TOOLS[id].use;
  if (use === 'heal' && a.hp >= a.maxHp) return false;
  if (use === 'tp' && a.tp >= a.maxTp) return false;
  if (use === 'revive' && !friendsInRadius(a.team, a.x, a.z, 6, true).length && !a.downed) { if (a === PL) HUD.float(a.x, 2.3, a.z, 'No one to revive', '#aaa', 12); return false; }
  if (use === 'portal' && (GAME.mode !== 'field' || LV.kind === 'boss')) { if (a === PL) HUD.toast('Recall Beacons only work down on Veyra, away from bosses.', '#ff9090'); return false; }
  if (use === 'none' || use === 'mat') return false;
  a.act = { type: 'use', item: id, t: 0, dur: 0.3, fireAt: 0.3 };
  return true;
}
function useItemEffect(a, id) {
  const c = a.char, T_ = TOOLS[id];
  if (!invTake(c.inv, id, 1)) return;
  switch (T_.use) {
    case 'heal': heal(a, a.maxHp * T_.v); FX.burst(a.x, 1, a.z, 0x70f090, 12, 1.5, 0.7, 0.35, { up: 2 }); AUDIO.sfx('heal', a.x, a.z, 0.6); break;
    case 'tp': restoreTp(a, a.maxTp * T_.v); HUD.float(a.x, 2.3, a.z, '+PSI', '#80b0ff', 14); FX.burst(a.x, 1, a.z, 0x80b0ff, 12, 1.5, 0.7, 0.35, { up: 2 }); AUDIO.sfx('heal', a.x, a.z, 0.6); break;
    case 'cure': for (const k of ['burn', 'freeze', 'shock', 'poison', 'slow', 'stun']) delete a.status[k]; FX.burst(a.x, 1, a.z, 0xfff0a0, 12, 1.5, 0.7, 0.35, { up: 2 }); AUDIO.sfx('buff', a.x, a.z); break;
    case 'revive': { const d = friendsInRadius(a.team, a.x, a.z, 6, true); if (d.length) reviveActor(d[0], 0.5); break; }
    case 'party': for (const f of friendsOf(a)) { if (f.downed) reviveActor(f, 1); f.hp = f.maxHp; f.tp = f.maxTp; FX.burst(f.x, 1, f.z, 0xffd0ff, 16, 2, 0.8, 0.4, { up: 2 }); } AUDIO.sfx('heal'); break;
    case 'portal': GAME.openPortal(); break;
  }
}
// called when downed with a Revive Shot
function selfRevive(a) { if (!a.downed || invCount(a.char.inv, 'reviveShot') <= 0) return false; invTake(a.char.inv, 'reviveShot', 1); reviveActor(a, 0.5); return true; }

function animParty(a, dt, move) {
  const act = a.act;
  let state = 'idle', ph = 0, step = 0;
  if (a.downed) state = 'down';
  else if (a.spin) state = 'spin';
  else if (act && act.type === 'attack') { state = 'attack'; ph = act.t / act.dur; step = act.step; }
  else if (act && act.type === 'cast') { state = 'cast'; ph = act.t / act.dur; }
  else if (act && act.type === 'skill') { state = wcls(a) === 'melee' && ['risingslash', 'sunder', 'warcry'].includes(act.id) ? 'skill' : 'cast'; ph = act.t / act.dur; }
  else if (act && act.type === 'use') { state = 'cast'; ph = act.t / act.dur * 0.5; }
  else if (act && act.type === 'dodge') { state = 'dodge'; ph = act.t / act.dur; }
  else if (a.hitT > 0) state = 'hit';
  animHumanoid(a.rig, { t: a.t, move, state, ph, step, wcls: wcls(a) }, dt);
  a.model.position.set(a.x, 0, a.z);
  a.model.rotation.y = a.yaw;
  const bs = a.baseScale || 1; if (a.flash > 0) { a.flash -= dt; const k = 1 + a.flash * 0.6; a.model.scale.set(bs * k, bs / k, bs * k); } else a.model.scale.setScalar(bs);
  if (a.blink > 0) a.blink -= dt;
  a.model.visible = !(a.blink > 0 && Math.floor(a.t * 20) % 2 === 0);
}
