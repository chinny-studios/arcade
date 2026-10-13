// Ashreach — combat: auto-attack, specials, nano casting, buffs/debuffs, damage, healing, death, XP and loot

const RANGED_SKILLS = new Set(['pistol', 'assault_rifle', 'rifle', 'smg', 'shotgun', 'bow', 'heavy_weapons', 'ranged_energy', 'grenade']);
const FISTS = { name: 'Fists', skill: 'martial_arts', dmgType: 'melee', atk: 1.0, rech: 1.0, range: 2.6, specials: ['brawl', 'pressure'], model: 'fists' };
const SPECIALS = {
  quick: { name: 'Quick Shot', skill: 'quick_shot', glyph: '»', desc: 'An extra snap shot.' },
  burst: { name: 'Burst', skill: 'burst', glyph: '≡', desc: 'Three rounds in quick succession.' },
  fullauto: { name: 'Full Auto', skill: 'full_auto', glyph: '⋙', desc: 'Empty the magazine. Long recharge.' },
  aimed: { name: 'Aimed Shot', skill: 'aimed_shot', glyph: '◎', desc: 'A carefully placed shot. Strongest as an opener.' },
  fast: { name: 'Fast Attack', skill: 'fast_attack', glyph: '⚡', desc: 'A lightning-quick extra strike.' },
  brawl: { name: 'Brawl', skill: 'brawl', glyph: '✊', desc: 'A dirty hit that may stun.' },
  pressure: { name: 'Pressure Point', skill: 'pressure_pt', glyph: '✦', desc: 'Strike a nerve cluster for massive damage.' },
  backstab: { name: 'Backstab', skill: 'sneak_attack', glyph: '†', desc: 'Huge damage from behind or from stealth.' },
};

// ---------- attack numbers ----------
function weaponOf(e) { return e.char ? (e.char.equip.rhand || e.char.equip.lhand || null) : null; }
function isRangedWeapon(w) { return !!w && RANGED_SKILLS.has(w.skill); }
function attackStats(e) {
  if (e.char) {
    const w = weaponOf(e) || FISTS, S = e.S;
    const ranged = isRangedWeapon(w);
    const init = ranged ? S.ranged_init || 0 : S.melee_init || 0;
    let dmg = w.dmg;
    if (w === FISTS || w.skill === 'martial_arts') {
      // martial arts damage grows with the skill itself, gloves add on top
      const ma = S.martial_arts || 0, pro = e.char.prof === 'martialist' ? 1 : 0.45;
      dmg = [Math.round((2 + ma * 0.05) * pro + (w.dmg ? w.dmg[0] : 0)), Math.round((5 + ma * 0.18) * pro + (w.dmg ? w.dmg[1] : 0))];
    }
    const cycle = Math.max(0.8, ((w.atk || 1.2) + (w.rech || 1.2)) / 2 * (1 - clamp(init / 900, 0, 0.45)) / (1 + (S.atkPct || 0) / 100));
    return { ar: (S[w.skill] || 0) + (S.addAR || 0), dmg: dmg || [1, 3], cycle, range: w.range || (ranged ? 25 : 2.8), type: w.dmgType || (ranged ? 'proj' : 'melee'), ranged, w, specials: w.specials || [] };
  }
  const M = e.mob, T = e.tpl;
  const ranged = T.arch === 'ranged' || T.arch === 'caster';
  return { ar: M.ar + (e.S.addAR || 0), dmg: M.dmg, cycle: (M.atk || T.atk || 2) / (1 + (e.S.atkPct || 0) / 100), range: T.range || (ranged ? 20 : 2.6), type: T.dmgType || 'melee', ranged, w: null, specials: [] };
}
function defenseRating(e, kind) {
  if (e.char) {
    const S = e.S;
    const base = kind === 'nano' ? S.nano_resist : kind === 'ranged' ? (S.dodge_ranged || 0) + (S.duck_exp || 0) * 0.3 : (S.evade_close || 0) + (S.parry || 0) * 0.4;
    return (base || 0) + 4 + e.level * 3.6 + (S.addDef || 0);
  }
  return ((e.mob && e.mob.dr) || e.level * 5) * (kind === 'nano' ? 0.8 : 1) + (e.S.addDef || 0);
}
function hitChance(ar, dr) { return clamp(0.5 + (ar - dr) / (2 * Math.max(ar, dr, 1)), 0.06, 0.95); }
function mitigate(tgt, amt, type, srcLevel) {
  const ac = Math.max(0, tgt.S['ac_' + type] || 0);
  return amt * (1 - Math.min(0.75, ac / (ac + 60 + srcLevel * 12)));
}
function rollWeaponDamage(src, A, mult = 1) {
  let d = frand(A.dmg[0], A.dmg[1]);
  // attack rating beyond the weapon's needs turns into damage, as in the classics
  if (src.char) d *= 1.25 + Math.max(0, A.ar) / 250;
  d = d * mult * (1 + (src.S.dmgPct || 0) / 100) + (src.S.addDmg || 0);
  return d;
}

// ---------- targeting helpers ----------
function canAttack(e, t) { return !!t && !t.dead && !t.removed && !t.invulnerable && isHostile(e, t); }
function tagCombat(e) { e.combatT = 0; if (e.sitting) standUp(e); if (e.stealth) breakStealth(e); }
function standUp(e) { e.sitting = false; }
function breakStealth(e) { e.stealth = false; e.buffs = e.buffs.filter((b) => !b.stealth); if (e.rig && e.rig.root) e.rig.root.visible = true; }
function startAttack(e, target) {
  target = target || e.target;
  if (!canAttack(e, target)) { if (e === PLAYER && target) EV.emit('log', 'You cannot attack that.', 'warn'); return false; }
  e.target = target;
  if (!e.attacking) { e.attacking = true; e.atkT = Math.max(e.atkT, 0.15); }
  if (e === PLAYER) EV.emit('stats', e);
  return true;
}
function stopAttack(e) { e.attacking = false; if (e === PLAYER) EV.emit('stats', e); }

// ---------- auto-attack ----------
let oorMsgT = 0;
function updateAttack(e, dt) {
  if (e.atkT > 0) e.atkT -= dt;
  if (!e.attacking || e.dead || e.stunned > 0) return;
  const t = e.target;
  if (!canAttack(e, t)) { e.attacking = false; if (e === PLAYER) EV.emit('stats', e); return; }
  if (e.atkT > 0 || e.cast) return;
  const A = attackStats(e);
  const d = reachDist(e, t);
  if (d > A.range) {
    if (e === PLAYER && oorMsgT <= 0) { EV.emit('log', 'Target is out of range.', 'warn'); oorMsgT = 3; }
    return;
  }
  if (A.ranged && !losClear(e.pos.x, e.pos.y + 1.5, e.pos.z, t.pos.x, t.pos.y + 1.2, t.pos.z)) {
    if (e === PLAYER && oorMsgT <= 0) { EV.emit('log', 'You cannot see your target.', 'warn'); oorMsgT = 3; }
    return;
  }
  if (e !== PLAYER || !PLAYER.moving) faceTo(e, t.pos.x, t.pos.z, 0);
  e.atkT = A.cycle;
  // dual wielding: the off-hand weapon adds a weaker second strike
  swing(e, t, A, 1, null);
  const off = e.char && e.char.equip.lhand && e.char.equip.rhand && e.char.equip.lhand.kind === 'weapon' ? e.char.equip.lhand : null;
  if (off) {
    const B = Object.assign({}, A, { w: off, dmg: off.dmg, ar: (e.S[off.skill] || 0) * 0.85, type: off.dmgType || A.type });
    setTimeout(() => { if (!e.dead && canAttack(e, t)) swing(e, t, B, 0.7, null); }, 250);
  }
}
// One weapon hit: roll to hit, damage, crit, mitigation.
function swing(e, t, A, mult, special) {
  tagCombat(e); tagCombat(t);
  if (e.rig && e.rig.play) e.rig.play(A.ranged ? 'shoot' : 'attack');
  shotFx(e, t, A);
  const dr = defenseRating(t, A.ranged ? 'ranged' : 'melee');
  const hit = special === 'aimed' || special === 'pressure' || special === 'backstab' ? Math.random() < Math.max(0.8, hitChance(A.ar, dr)) : Math.random() < hitChance(A.ar, dr);
  if (!hit) { EV.emit('dmg', e, t, 0, A.type, { miss: true, special }); addHate(t, e, 1); return 0; }
  let d = rollWeaponDamage(e, A, mult);
  let crit = false;
  if (Math.random() * 100 < (e.S.critPct || 3)) { crit = true; d = Math.max(d, A.dmg[1]) * 1.6 + (e.S.addDmg || 0); }
  d = mitigate(t, d, A.type, e.level);
  return dealDamage(e, t, Math.max(1, Math.round(d)), A.type, { crit, special, weapon: true });
}

// ---------- specials ----------
function specialsFor(e) {
  if (!e.char) return [];
  const w = weaponOf(e) || FISTS, out = [];
  const sp = new Set(w.specials || []);
  const off = e.char.equip.lhand;
  if (off && off.specials) for (const s of off.specials) sp.add(s);
  if (!weaponOf(e) || w.skill === 'martial_arts') { sp.add('brawl'); if (e.char.prof === 'martialist') sp.add('pressure'); }
  if (e.char.prof === 'wraith' || e.char.prof === 'infiltrator') sp.add('backstab');
  for (const s of sp) if (SPECIALS[s] && (e.S[SPECIALS[s].skill] || 0) >= 6) out.push(s);
  return out;
}
function specialRecharge(e, id, A) {
  const sk = e.S[SPECIALS[id].skill] || 0;
  switch (id) {
    case 'quick': return Math.max(5, 16 - sk / 30);
    case 'burst': return Math.max(8, A.cycle * 7 - sk / 25);
    case 'fullauto': return Math.max(25, 70 - sk / 8);
    case 'aimed': return Math.max(15, 60 - sk / 8);
    case 'fast': return Math.max(5, 15 - sk / 40);
    case 'brawl': return 15;
    case 'pressure': return Math.max(30, 120 - sk / 4);
    case 'backstab': return Math.max(20, 60 - sk / 8);
  }
  return 20;
}
function useSpecial(e, id) {
  const S = SPECIALS[id];
  if (!S) return { ok: false, msg: 'Unknown special.' };
  const fail = (msg) => { if (e === PLAYER) EV.emit('log', msg, 'warn'); return { ok: false, msg }; };
  if (e.dead || e.stunned > 0) return fail('You cannot do that now.');
  if (!specialsFor(e).includes(id)) return fail('Your weapon cannot ' + S.name + '.');
  if (e.cds[id] > 0) return fail(S.name + ' is recharging.');
  const t = e.target;
  if (!canAttack(e, t)) return fail('You need a hostile target.');
  const A = attackStats(e);
  if (reachDist(e, t) > A.range) return fail('Target is out of range.');
  if (A.ranged && !losClear(e.pos.x, e.pos.y + 1.5, e.pos.z, t.pos.x, t.pos.y + 1.2, t.pos.z)) return fail('You cannot see your target.');
  const sk = e.S[S.skill] || 0;
  const fresh = e.combatT > 6;
  const behind = Math.abs(angWrap(Math.atan2(e.pos.x - t.pos.x, e.pos.z - t.pos.z) - t.yaw)) > 2.0;
  faceTo(e, t.pos.x, t.pos.z, 0);
  e.cds[id] = e.cdMax[id] = specialRecharge(e, id, A);
  if (!e.attacking) startAttack(e, t);
  const hitN = (n, mult, gap) => { for (let i = 0; i < n; i++) setTimeout(() => { if (!e.dead && canAttack(e, t)) swing(e, t, A, mult, id); }, i * gap); };
  switch (id) {
    case 'quick': hitN(1, 1.0, 0); break;
    case 'burst': hitN(3, 0.75 + sk / 1200, 110); break;
    case 'fullauto': hitN(Math.min(14, 5 + Math.floor(sk / 50)), 0.6, 80); break;
    case 'aimed': hitN(1, (fresh ? 2.2 : 1.1) + sk / 150, 0); break;
    case 'fast': hitN(1, 1.25 + sk / 600, 0); break;
    case 'brawl': hitN(1, 1.0 + sk / 600, 0); if (Math.random() < 0.3) setTimeout(() => { if (!t.dead && t.kind === 'mob' && !(t.tpl && t.tpl.named)) t.stunned = Math.max(t.stunned, 2); }, 50); break;
    case 'pressure': hitN(1, 2 + sk / 150, 0); break;
    case 'backstab': hitN(1, (behind || e.stealth ? 2.5 : 1.0) + sk / 120, 0); break;
  }
  if (e === PLAYER) EV.emit('log', 'You use ' + S.name + '.', 'info');
  return { ok: true };
}

// ---------- damage, healing, hate ----------
function addHate(mob, src, amt) {
  if (!mob || mob.kind === 'player' || mob.kind === 'sim' || mob.dead) return;
  if (mob.calmed > 0) { mob.calmed = 0; }
  mob.hate.set(src, (mob.hate.get(src) || 0) + amt);
}
function dealDamage(src, tgt, amt, type, opts = {}) {
  if (!tgt || tgt.dead || tgt.invulnerable) return 0;
  // shields soak, reflects bounce part back, damage shields burn melee attackers
  for (const b of tgt.buffs) {
    if (b.absorb > 0 && amt > 0) { const s = Math.min(b.absorb, amt); b.absorb -= s; amt -= s; }
  }
  if (src && src !== tgt && !opts.reflected && !opts.dot) {
    for (const b of tgt.buffs) {
      if (b.reflect) { const r = Math.round(amt * b.reflect / 100); if (r > 0) setTimeout(() => dealDamage(tgt, src, r, type, { reflected: true }), 30); }
      if (b.dmgshield && opts.weapon && !attackStats(src).ranged) { const ds = b.dmgshield; setTimeout(() => dealDamage(tgt, src, ds.amt, ds.type || 'energy', { reflected: true }), 30); }
    }
  }
  amt = Math.max(0, Math.round(amt));
  tgt.hp -= amt;
  if (src) { tagCombat(src); tagCombat(tgt); addHate(tgt, src, amt * (src.threatMul || 1)); if (!tgt.tagger && tgt.kind === 'mob') tgt.tagger = src.kind === 'pet' ? src.owner : src; }
  if (tgt.rig && tgt.rig.play && amt > 0 && Math.random() < 0.5) tgt.rig.play('hit');
  if (tgt.calmed > 0) tgt.calmed = 0;
  EV.emit('dmg', src, tgt, amt, type, opts);
  if (typeof sfx === 'function' && (src === PLAYER || tgt === PLAYER || (src && src.owner === PLAYER))) sfx(opts.crit ? 'crit' : type === 'energy' ? 'hit_energy' : type === 'proj' ? 'hit_proj' : 'hit_melee', tgt.pos);
  // weapon procs: life drain, heal-on-hit auras
  if (src && opts.weapon) for (const b of src.buffs) {
    if (b.procDrain) { const h = Math.round(amt * b.procDrain / 100); if (h > 0) heal(src, src, h, { quiet: true }); }
    if (b.procTeamHeal) for (const m of teamOf(src)) if (!m.dead && entDist(m, src) < 30) heal(src, m, b.procTeamHeal, { quiet: true });
  }
  if (tgt.hp <= 0) kill(src, tgt);
  return amt;
}
function heal(src, tgt, amt, opts = {}) {
  if (!tgt || tgt.dead) return 0;
  const before = tgt.hp;
  tgt.hp = Math.min(tgt.S.maxHp, tgt.hp + Math.round(amt));
  const got = tgt.hp - before;
  if (got > 0 && src) {
    // healing someone in a fight draws the mobs' attention
    for (const m of ENTS) if (m.kind === 'mob' && !m.dead && m.hate.has(tgt)) addHate(m, src, got * 0.5);
  }
  if (!opts.quiet || src === PLAYER || tgt === PLAYER) EV.emit('heal', src, tgt, got, opts);
  return got;
}

// ---------- death, XP, loot ----------
function conXpMul(lvl, mobLvl) {
  const grey = lvl <= 10 ? 5 : Math.max(5, Math.floor(lvl * 0.3));
  const d = mobLvl - lvl;
  if (d <= -grey) return 0;
  return clamp(1 + d * 0.1, 0.35, 1.6);
}
function kill(src, tgt) {
  if (tgt.dead) return;
  tgt.dead = true; tgt.hp = 0; tgt.deadT = 0; tgt.attacking = false; tgt.cast = null; tgt.sitting = false;
  tgt.buffs = tgt.buffs.filter((b) => b.keepOnDeath);
  if (tgt.rig && tgt.rig.play) tgt.rig.play('die');
  EV.emit('kill', src, tgt);
  for (const p of tgt.pets.slice()) { p.hp = 0; p.dead = true; p.deadT = CORPSE_T - 2; }
  for (const o of ENTS) { if (o.target === tgt && o !== PLAYER) { o.target = null; o.attacking = false; } }
  if (PLAYER && PLAYER.target === tgt) stopAttack(PLAYER);
  if (tgt.kind === 'mob') {
    if (typeof sfx === 'function') sfx('mob_die', tgt.pos);
    const killer = tgt.tagger || (src && (src.kind === 'pet' ? src.owner : src));
    if (killer && !killer.removed) awardKill(killer, tgt);
  } else if (tgt.kind === 'player') {
    EV.emit('death', tgt);
    EV.emit('log', 'You have been killed' + (src ? ' by ' + src.name : '') + '.', 'warn');
    if (typeof sfx === 'function') sfx('death');
  } else if (tgt.kind === 'sim') {
    EV.emit('death', tgt);
  }
}
function awardKill(killer, mob) {
  const T = mob.tpl, base = (mob.mob && mob.mob.xp) || mobXp(mob.level);
  const mem = teamOf(killer).filter((m) => !m.dead && !m.removed && entDist(m, mob) < 80);
  if (!mem.length) mem.push(killer);
  const share = mem.length === 1 ? 1 : 1.25 / mem.length;
  for (const m of mem) {
    const x = Math.round(base * share * conXpMul(m.level, mob.level));
    if (x > 0) giveXp(m, x);
    else if (m === PLAYER) EV.emit('log', mob.name + ' was too weak to teach you anything.', 'xp');
  }
  if (mem.includes(PLAYER) || killer === PLAYER) {
    const credits = typeof rollCredits === 'function' ? rollCredits(mob.level, makeRng(mob.id * 7919 + 1)) : Math.round(mob.level * frand(2, 6));
    const c = Math.round(credits * (T.named ? 4 : 1) / (mem.length > 1 ? Math.max(1, mem.filter((m) => m.kind !== 'pet').length * 0.6) : 1));
    if (c > 0 && T.loot) { PLAYER.char.credits += c; EV.emit('log', 'You picked up ' + fmtInt(c) + ' credits.', 'loot'); if (typeof sfx === 'function') sfx('coin'); }
    if (T.loot && typeof rollLoot === 'function') {
      let items = [];
      try { items = rollLoot(T.loot, mob.level, makeRng((mob.id * 104729 + Date.now()) >>> 0)) || []; } catch (err) { console.error(err); }
      if (T.named) items = items.concat(rollLoot(T.loot, mob.level + 3, makeRng(mob.id * 31 + 5)) || []);
      for (const it of items) if (addItem(PLAYER, it)) { EV.emit('loot', PLAYER, it); EV.emit('log', 'You received ' + it.name + ' (QL ' + it.ql + ').', 'loot'); if (typeof sfx === 'function') sfx('loot'); }
    }
  }
}
function giveXp(e, amt) {
  if (!e.char) return;
  const c = e.char;
  if (c.level >= MAX_LEVEL) { c.xp = 0; return; }
  c.xp += amt;
  if (e === PLAYER) { EV.emit('xp', e, amt); EV.emit('log', 'You gained ' + fmtInt(amt) + ' experience.', 'xp'); }
  while (c.level < MAX_LEVEL && c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    levelUp(c);
    refreshStats(e);
    e.hp = e.S.maxHp; e.np = e.S.maxNp;
    EV.emit('levelup', e, c.level);
    if (e === PLAYER) { EV.emit('log', 'You reached level ' + c.level + '! You have ' + c.ip + ' unspent IP.', 'xp'); if (typeof sfx === 'function') sfx('levelup'); levelFx(e); }
  }
  if (c.level >= MAX_LEVEL) c.xp = 0;
}

// ---------- nanos ----------
function nanoDef(id) { return NANOS[id] || (typeof MOB_ABILITIES !== 'undefined' && MOB_ABILITIES[id]) || null; }
function nanoCostFor(e, n) { return Math.max(1, Math.round((n.cost || 0) * (1 - clamp((e.S.nanoCost || 0) / 100, 0, 0.6)))); }
function nanoTargetOk(e, n, t) {
  switch (n.target) {
    case 'self': return true;
    case 'pet': return e.pets.length > 0;
    case 'team': case 'friend': return true;
    case 'enemy': return canAttack(e, t);
  }
  return true;
}
function resolveNanoTarget(e, n, t) {
  if (n.target === 'self') return e;
  if (n.target === 'pet') return e.pets[0] || null;
  // friendly programs on an invalid target (a hostile, an NPC) land on the caster instead, as in the classics
  if (n.target === 'team' || n.target === 'friend') return (t && !t.dead && !isHostile(e, t) && sideOf(t) === sideOf(e)) ? t : e;
  return t;
}
function castNano(e, id, target) {
  const n = nanoDef(id);
  const fail = (msg) => { if (e === PLAYER) { EV.emit('log', msg, 'warn'); if (typeof sfx === 'function') sfx('error'); } return { ok: false, msg }; };
  if (!n) return fail('Unknown nano program.');
  if (e.dead || e.stunned > 0) return fail('You cannot cast now.');
  if (e.cast) return fail('You are already executing a nano program.');
  if (e.char && NANOS[id] && !e.char.nanos.includes(id)) return fail('You do not know ' + n.name + '.');
  if (e.char && NANOS[id] && !nanoReqMet(e.S, n)) return fail('Your nano skills are too low to execute ' + n.name + '.');
  if (e.cds['n:' + id] > 0) return fail(n.name + ' is recharging.');
  const cost = nanoCostFor(e, n);
  if (e.np < cost) return fail('Not enough nano energy.');
  target = target === undefined ? e.target : target;
  if (!nanoTargetOk(e, n, target)) return fail(n.target === 'enemy' ? 'You need a hostile target.' : n.target === 'pet' ? 'You have no pet.' : 'Invalid target.');
  const t = resolveNanoTarget(e, n, target);
  if (!t) return fail('Invalid target.');
  if (t !== e && reachDist(e, t) > (n.range || 25)) return fail('Target is out of range.');
  if (t !== e && !losClear(e.pos.x, e.pos.y + 1.5, e.pos.z, t.pos.x, t.pos.y + 1.2, t.pos.z)) return fail('You cannot see your target.');
  if (n.target === 'enemy') { tagCombat(e); if (!e.attacking && e !== PLAYER) startAttack(e, t); }
  if (e.sitting) standUp(e);
  const castT = (n.cast || 0) * Math.max(0.35, 1 - (e.S.nano_init || e.S.nanoInit || 0) / 700);
  e.cast = { nano: id, t: castT, total: castT, target: t };
  if (t !== e && n.target !== 'self') faceTo(e, t.pos.x, t.pos.z, 0);
  if (e.rig && e.rig.play) e.rig.play('cast');
  EV.emit('cast', e, n, t);
  if (typeof sfx === 'function' && (e === PLAYER || entDist(e, PLAYER) < 30)) sfx('cast_start', e.pos);
  if (castT <= 0.01) finishCast(e);
  return { ok: true };
}
function updateCast(e, dt) {
  if (!e.cast) return;
  e.cast.t -= dt;
  if (e.dead || e.stunned > 0) { e.cast = null; return; }
  if (e.cast.t <= 0) finishCast(e);
}
function finishCast(e) {
  const C = e.cast; e.cast = null;
  const n = nanoDef(C.nano), t = C.target;
  if (!n) return;
  const cost = nanoCostFor(e, n);
  if (!t || t.removed || (t.dead && n.target !== 'self') || e.np < cost) { EV.emit('castdone', e, n, t, false); return; }
  e.np -= cost;
  e.cds['n:' + C.nano] = e.cdMax['n:' + C.nano] = n.recharge || 1;
  // hostile programs can be resisted
  if (n.target === 'enemy') {
    const school = Object.keys(n.reqs || {})[0];
    const ar = e.char ? (e.S[school] || e.level * 5) : (e.mob ? e.mob.ar : e.level * 5);
    const hasDirect = n.fx.some((f) => f.t === 'dmg');
    if (!hasDirect && Math.random() > hitChance(ar * 1.1, defenseRating(t, 'nano'))) {
      EV.emit('castdone', e, n, t, false);
      if (e === PLAYER || t === PLAYER || e.owner === PLAYER) EV.emit('log', (e === PLAYER ? 'Your ' : e.name + "'s ") + n.name + ' was resisted by ' + (t === PLAYER ? 'you' : t.name) + '.', e === PLAYER ? 'warn' : 'info');
      addHate(t, e, 20);
      return;
    }
  }
  let targets = n.target === 'team' ? teamOf(e).filter((m) => !m.dead && !m.removed && entDist(m, e) < (n.range || 30)) : [t];
  if (n.target === 'team') for (const m of targets.slice()) for (const p of m.pets) targets.push(p);
  if (n.aoe) { const c = n.target === 'self' ? e : t; targets = entsNear(c.pos.x, c.pos.z, n.aoe, (o) => !o.dead && isHostile(e, o)); }
  for (const tt of targets) applyNano(e, tt, n.rel && e.mob ? Object.assign({}, n, { fx: mobAbilityFx(n, e.mob, tt.S.maxHp) }) : n, C.nano);
  EV.emit('castdone', e, n, t, true);
  if (typeof sfx === 'function' && (e === PLAYER || t === PLAYER)) sfx('cast_done', t.pos);
  nanoFx(e, t, n);
}
function applyNano(src, t, n, id) {
  let buffSpec = null;
  for (const f of n.fx) {
    switch (f.t) {
      case 'dmg': {
        const d = mitigate(t, amtOf(f.amt) * (1 + (src.S.nanoDmg || 0) / 100), f.type || 'energy', src.level * 0.5);
        dealDamage(src, t, Math.max(1, Math.round(d)), f.type || 'energy', { nano: n.name });
        break;
      }
      case 'heal': heal(src, t, amtOf(f.amt), { nano: n.name }); break;
      case 'taunt': addHate(t, src, f.amt || 200); t.target = src; break;
      case 'pet': {
        for (const p of src.pets.slice()) if (p.petId === f.pet) removeEnt(p);
        const p = spawnPet(src, f.pet, Math.max(1, Math.min(src.level, (n.lvl || 1) + 6)));
        if (src === PLAYER) EV.emit('log', 'You assemble ' + p.name.replace(src.name + "'s ", 'your ') + '.', 'nano');
        break;
      }
      case 'summon': summonAdds(src, f.n || 2); break;
      case 'lattice': if (src === PLAYER) EV.emit('interact', { role: 'hopper', name: 'The Lattice', destinations: latticeDestinations(), lattice: true }); break;
      default: buffSpec = buffSpec || { mods: {}, fx: [] }; buffSpec.fx.push(f);
    }
  }
  if (buffSpec && (n.dur || 0) > 0) applyBuffRaw(src, t, { id, name: n.name, line: n.line || id, str: n.str || n.lvl || 1, dur: n.dur, ncu: n.target !== 'enemy' ? (n.ncu || 0) : 0, fx: buffSpec.fx, icon: n.icon, hostile: n.target === 'enemy' });
}
function summonAdds(src, n) {
  const id = (src.tpl && src.tpl.adds) || src.tplId;
  const foe = src.kind === 'mob' ? topHate(src) : null;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const m = spawnMob(id, Math.max(1, src.level - 2), src.pos.x + Math.sin(a) * 4, src.pos.z + Math.cos(a) * 4, { leash: 60 });
    if (m && foe) addHate(m, foe, 5);
  }
  if (entDist(src, PLAYER) < 50) EV.emit('chat', 'vicinity', src.name, 'To me! Now!');
}
function latticeDestinations() {
  const out = [];
  for (const id in ZONE_DEFS) for (const p of ZONE_DEFS[id].pois || []) if (p.type === 'hopper' || p.type === 'clonebay') out.push({ zone: id, poi: p.id, name: ZONE_DEFS[id].name + ' · ' + (p.name || p.type), cost: 0 });
  return out;
}
const amtOf = (a) => Array.isArray(a) ? Math.round(frand(a[0], a[1])) : (a || 0);
// Buffs: one per nanoline on a target; a stronger program replaces a weaker one.
function applyBuffRaw(src, t, B) {
  const same = t.buffs.find((b) => b.line === B.line);
  if (same) {
    if ((same.str || 0) > (B.str || 0)) { if (src === PLAYER) EV.emit('log', 'A stronger program of that kind is already running on ' + (t === PLAYER ? 'you' : t.name) + '.', 'warn'); return false; }
    removeBuff(t, same, true);
  }
  if (B.ncu && t.char && ncuUsed(t) + B.ncu > (t.S.ncu || 0)) {
    if (src === PLAYER || t === PLAYER) EV.emit('log', (t === PLAYER ? 'You do' : t.name + ' does') + ' not have enough free Nano Memory for ' + B.name + '.', 'warn');
    return false;
  }
  const b = { nano: B.id, name: B.name, line: B.line, str: B.str, t: B.dur, dur: B.dur, src, ncu: B.ncu || 0, icon: B.icon, hostile: !!B.hostile, mods: Object.assign({}, B.mods || {}), ticks: [] };
  for (const f of B.fx || []) {
    switch (f.t) {
      case 'buff': case 'debuff': sumMods(b.mods, f.mods); break;
      case 'hot': b.ticks.push({ kind: 'heal', amt: amtOf(f.amt), every: f.every || 2, t: f.every || 2 }); break;
      case 'dot': b.ticks.push({ kind: 'dmg', type: f.type || 'poison', amt: amtOf(f.amt), every: f.every || 2, t: f.every || 2 }); break;
      case 'root': b.root = true; break;
      case 'snare': b.snare = f.pct || 40; break;
      case 'stun': b.stun = true; break;
      case 'calm': b.calm = true; break;
      case 'shield': b.absorb = f.absorb; break;
      case 'reflect': b.reflect = f.pct; break;
      case 'dmgshield': b.dmgshield = { type: f.type, amt: f.amt }; break;
      case 'speed': b.mods.runSpeedPct = (b.mods.runSpeedPct || 0) + (f.pct || 0); break;
      case 'stealth': b.stealth = true; break;
      case 'morph': b.morph = f; if (f.mods) sumMods(b.mods, f.mods); break;
      case 'proc': if (f.drain) b.procDrain = f.drain; if (f.teamHeal) b.procTeamHeal = f.teamHeal; break;
      case 'drain': {
        sumMods(b.mods, { [f.stat]: -(f.amt || 10) });
        if (src !== t) applyBuffRaw(src, src, { id: B.id + ':gain', name: B.name, line: (B.line || B.id) + ':gain', str: B.str, dur: B.dur, mods: { [f.stat]: f.amt || 10 }, icon: B.icon });
        break;
      }
    }
  }
  t.buffs.push(b);
  if (b.calm && t.kind === 'mob') { t.hate.clear(); t.attacking = false; t.target = null; }
  if (b.morph && t.char) setMorph(t, b.morph);
  if (b.stealth) { t.stealth = true; }
  refreshStats(t);
  if (t === PLAYER || src === PLAYER) EV.emit('log', (t === PLAYER ? 'You are' : t.name + ' is') + ' affected by ' + B.name + '.', b.hostile ? 'dmg-out' : 'nano');
  if (typeof sfx === 'function' && t === PLAYER) sfx(b.hostile ? 'debuff' : 'buff');
  return true;
}
function removeBuff(t, b, quiet) {
  const i = t.buffs.indexOf(b);
  if (i < 0) return;
  t.buffs.splice(i, 1);
  if (b.morph && t.char) setMorph(t, null);
  if (b.stealth) breakStealth(t);
  refreshStats(t);
  if (!quiet && t === PLAYER) EV.emit('log', b.name + ' has worn off.', 'info');
}
function cancelBuff(e, nanoId) { const b = e.buffs.find((x) => x.nano === nanoId && !x.hostile); if (b) removeBuff(e, b); }
function setMorph(e, f) {
  e.morph = f;
  if (f && typeof makeCreature === 'function') {
    if (e.rig) { e.rig.root.parent && e.rig.root.parent.remove(e.rig.root); e.rig.dispose && e.rig.dispose(); }
    e.rig = makeCreature(f.model || 'beast', { colors: f.colors || [0x8a6a4a, 0x4a3a2a, 0xffd27a], scale: f.scale || 1.1 });
    e.rig.root.traverse((o) => { o.userData.ent = e; });
    e.rig.root.position.copy(e.pos); scene.add(e.rig.root);
  } else buildRig(e);
}
function updateBuffs(e, dt) {
  e.rooted = 0; e.snared = 0; e.stunned = Math.max(0, e.stunned - dt); e.calmed = 0;
  for (let i = e.buffs.length - 1; i >= 0; i--) {
    const b = e.buffs[i];
    if (!b) continue;   // a tick can kill and clear the list mid-loop
    if (b.root) e.rooted = 1;
    if (b.snare) e.snared = Math.max(e.snared, b.snare);
    if (b.stun) e.stunned = Math.max(e.stunned, 0.1);
    if (b.calm) e.calmed = 1;
    for (const k of b.ticks) {
      k.t -= dt;
      if (k.t <= 0) {
        k.t += k.every;
        if (k.kind === 'heal') heal(b.src, e, k.amt, { hot: true, quiet: true });
        else if (!e.dead) dealDamage(b.src && !b.src.removed ? b.src : null, e, Math.round(mitigate(e, k.amt, k.type, (b.src && b.src.level || 1) * 0.3)), k.type, { dot: true, nano: b.name });
      }
    }
    if (b.absorb !== undefined && b.absorb <= 0 && !b.mods) { removeBuff(e, b); continue; }
    b.t -= dt;
    if (b.t <= 0) removeBuff(e, b);
  }
}

// ---------- regen ----------
function updateRegen(e, dt) {
  if (e.dead) return;
  e.combatT += dt;
  e.regenT += dt;
  if (e.regenT < 1) return;
  const k = e.regenT; e.regenT = 0;
  const inC = e.combatT < 6;
  let m = inC ? 0.5 : 1.5;
  if (e.sitting && !inC) m = 5;
  if (e.kind === 'mob' && !inC) m = 6;
  e.hp = Math.min(e.S.maxHp, e.hp + (e.S.hpRegen || 1) * m * k);
  e.np = Math.min(e.S.maxNp, e.np + (e.S.npRegen || 1) * m * k);
}
function updateCooldowns(e, dt) { for (const k in e.cds) { if (e.cds[k] > 0) { e.cds[k] -= dt; if (e.cds[k] <= 0) e.cds[k] = 0; } } }

// ---------- small combat visuals ----------
const FX = [];
const fxLineMat = new THREE.LineBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: 0.9 });
const fxGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
const fxSphere = new THREE.SphereGeometry(1, 10, 8);
function shotFx(e, t, A) {
  if (!A.ranged || !e.rig) return;
  const g = new THREE.BufferGeometry().setFromPoints([new V3(e.pos.x, e.pos.y + e.rig.height * 0.72, e.pos.z), new V3(t.pos.x + frand(-0.3, 0.3), t.pos.y + ((t.rig && t.rig.height) || 1.6) * 0.55, t.pos.z + frand(-0.3, 0.3))]);
  const mat = fxLineMat.clone();
  if (A.type === 'energy') mat.color.setHex(0x7ff0ff);
  const l = new THREE.Line(g, mat);
  scene.add(l);
  FX.push({ o: l, t: 0.07, max: 0.07, kind: 'line' });
  if (typeof sfx === 'function' && (e === PLAYER || entDist(e, PLAYER) < 40)) {
    const m = A.w ? A.w.model : null;
    sfx(A.type === 'energy' ? 'shoot_energy' : m === 'pistol' ? 'shoot_pistol' : m === 'smg' ? 'shoot_smg' : m === 'shotgun' ? 'shoot_shotgun' : m === 'heavy' ? 'shoot_heavy' : 'shoot_rifle', e.pos);
  }
}
const SCHOOL_COL = { fab: 0xffb347, trn: 0x7fd0ff, bio: 0x7dff9a, psi: 0xd07fff, sen: 0xfff07f, spt: 0x7f9fff };
function nanoFx(e, t, n) {
  const school = Object.keys(n.reqs || {})[0];
  const col = (n.icon && n.icon.color) || SCHOOL_COL[school] || 0x9fe8ff;
  const m = new THREE.Mesh(fxSphere, fxGlowMat.clone());
  m.material.color.set(col);
  m.position.set(t.pos.x, t.pos.y + ((t.rig && t.rig.height) || 1.7) * 0.5, t.pos.z);
  scene.add(m);
  FX.push({ o: m, t: 0.6, max: 0.6, kind: 'burst', r: ((t.rig && t.rig.radius) || 0.5) + 0.6 });
}
function levelFx(e) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 20, 1, true), fxGlowMat.clone());
  m.material.color.setHex(0xffd27a); m.material.side = THREE.DoubleSide;
  m.position.copy(e.pos); m.position.y += 3;
  scene.add(m);
  FX.push({ o: m, t: 1.6, max: 1.6, kind: 'pillar', own: true });
}
function updateFx(dt) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i];
    f.t -= dt;
    const k = Math.max(0, f.t / f.max);
    if (f.kind === 'burst') { f.o.scale.setScalar(f.r * (1.4 - k * 0.8)); f.o.material.opacity = k * 0.7; }
    else if (f.kind === 'pillar') { f.o.scale.set(0.6 + (1 - k) * 0.8, 1, 0.6 + (1 - k) * 0.8); f.o.material.opacity = k * 0.6; }
    else f.o.material.opacity = k;
    if (f.t <= 0) {
      scene.remove(f.o);
      if (f.kind === 'line' || f.own) f.o.geometry.dispose();
      f.o.material.dispose();
      FX.splice(i, 1);
    }
  }
}
