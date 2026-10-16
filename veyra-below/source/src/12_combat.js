// Veyra Below — combat: weapon attacks, hit resolution, projectiles, area zones, psionic arts, skills, overdrives

const PROJ = [], ZONES = [], TRAPS = [];

// ---------- party damage ----------
function partyAccuracy(a, t, p) {
  const ata = a.S.ata + ((a.weapon && a.weapon.attrs && a.weapon.attrs.keen) || 0) * 0.6;
  let mod = p.heavy ? -0.1 : 0; if (p.special) mod -= 0.15; if (p.step === 1) mod += 0.04; if (p.step >= 2) mod += 0.08;
  return clamp(0.88 + (ata - t.evp) / 250 + mod, 0.4, 0.99);
}
function weaponRoll(a) { const w = a.weapon; if (!w) return LCURVE(a.lvl) * 0.5; const d = weaponDamage(w); return lerp(d.min, d.max, Math.random()); }
function atpEff(a) { return a.S.atp * (1 + (a.buffs.fervor ? a.buffs.fervor.v : 0) + (a.buffs.warcry ? a.buffs.warcry.v : 0)); }
// one "unit" of psionic power at the caster's level: skills quote their damage in multiples of this
function techUnit(a) { return techPower(a, 'ember', Math.max(1, Math.floor(a.lvl / 2.5) + 1)) / TECHS.ember.pow * 0.5; }
function techPower(a, id, lv) {
  // an art of level lv hits like a monster-level curve at (lv-1)*2.5+1, scaled by how much PSY you have for that level
  const T_ = TECHS[id], S = a.S, mst = S.mst * (1 + (a.buffs.fervor ? a.buffs.fervor.v * 0.5 : 0));
  const Lt = (lv - 1) * 2.5 + 1;
  let p = T_.pow * LCURVE(Lt) * (1 + Lt / 80) * (mst / (40 + 3.6 * Lt)) * 2.2 * (1 + S.techPct);
  if (a.race === 'construct' && T_.elem) p *= RACES.construct.techMul;
  return p;
}
// Resolve one party hit on a monster. Returns damage dealt (0 on a miss).
function partyHit(a, t, p) {
  if (!alive(t) || t.team === a.team) return 0;
  const S = a.S;
  if (p.kind !== 'tech' && !p.noMiss && Math.random() > partyAccuracy(a, t, p)) { HUD.float(t.x, (t.h || 1.8) + 0.2, t.z, 'MISS', '#9aa', 14); AUDIO.sfx('miss', t.x, t.z, 0.6); return 0; }
  let dmg, crit = false, elem = p.elem || 'phys';
  const fam = enemyFamily(t);
  if (p.kind === 'tech') {
    dmg = (p.power != null ? p.power : techPower(a, p.techId, p.techLv)) * (p.mult || 1);
    if (S.techCrit && Math.random() < S.techCrit) { crit = true; dmg *= 1.5 + S.techCritDmg; }
  } else {
    const w = a.weapon;
    dmg = weaponRoll(a) * (1 + atpEff(a) / 400) * (p.mult || 1) * (1 + S.dmgPct + (p.kind === 'melee' ? S.meleePct : 0));
    if (w && w.attrs && fam && w.attrs[fam]) dmg *= 1 + w.attrs[fam] / 100;
    if (p.just) dmg *= 1.25 + S.justBonus;
    if (a.rollBonus) { dmg *= 1 + a.rollBonus; }
    const critCh = S.crit + ((w && w.attrs && w.attrs.keen) || 0) / 250;
    if (Math.random() < critCh) { crit = true; dmg *= S.critMul; }
    if (p.special && w && w.special) {
      const sp = w.special;
      if (sp === 'frenzy') { dmg *= 2; a.hp = Math.max(1, a.hp - a.maxHp * 0.05); }
      if (sp === 'reaper' && !t.boss && Math.random() < 0.08) { dmg = t.hp + 1; HUD.float(t.x, (t.h || 1.8) + 0.8, t.z, 'REAPED', '#c060ff', 18); }
    }
  }
  if (t.hp > 0) {
    const dealt = dealDamage(p.origin || a, t, dmg, { elem, crit, kind: p.kind, kb: p.kb || (p.heavy ? 4 : 1.5), heavy: p.heavy, status: p.status });
    // flat elemental damage from gear rides on weapon hits
    if (p.kind !== 'tech' && alive(t)) {
      for (const [k, el] of [['fireDmg', 'fire'], ['iceDmg', 'ice'], ['boltDmg', 'bolt']]) if (S[k] > 0) dealDamage(a, t, S[k] * (p.mult || 1) * (0.8 + Math.random() * 0.4), { elem: el, kind: 'dot', noNumber: true });
    }
    if (p.special && a.weapon && a.weapon.special && alive(t)) applySpecial(a, t, a.weapon.special, dealt);
    if (dealt > 0) {
      let lee = S.leech + (p.kind === 'melee' ? S.meleeLeech : 0);
      if (lee > 0) heal(a, dealt * lee, false);
      if (S.tpLeech > 0) restoreTp(a, dealt * S.tpLeech * 0.1);
      if (p.kind === 'ranged' && S.overchargeTp) restoreTp(a, S.overchargeTp);
      if (a === PL || p.origin === PL) chargePB(dealt / Math.max(1, t.maxHp) * 14 * (1 + S.pbGain));
      FX.hit(t.x, (t.h || 1.6) * 0.6, t.z, crit ? 0xffd040 : elem !== 'phys' ? ELEM_COLORS[elem] : 0xffffff, crit);
      AUDIO.sfx(crit ? 'crit' : 'hit', t.x, t.z, a === PL ? 1 : 0.5);
      if (crit && a === PL) CAM.shake = Math.min(0.6, CAM.shake + 0.12);
      if (a === PL) GAME.hitStop = Math.max(GAME.hitStop, p.heavy || crit ? 0.06 : 0.025);
    }
    return dealt;
  }
  return 0;
}
function applySpecial(a, t, sp, dealt) {
  const pw = Math.max(1, dealt);
  switch (sp) {
    case 'ignite': dealDamage(a, t, pw * 0.4, { elem: 'fire', kind: 'dot' }); applyStatus(t, 'burn', 3, pw * 0.12, a, 0.6); FX.burst(t.x, 1, t.z, 0xff7020, 8, 3, 0.4, 0.4); break;
    case 'frostbite': dealDamage(a, t, pw * 0.3, { elem: 'ice', kind: 'dot' }); applyStatus(t, 'freeze', 2, 0, a, 0.3); FX.burst(t.x, 1, t.z, 0x90e0ff, 8, 3, 0.4, 0.4); break;
    case 'overload': dealDamage(a, t, pw * 0.3, { elem: 'bolt', kind: 'dot' }); applyStatus(t, 'shock', 2.5, 0, a, 0.3); FX.bolt(t.x, 4, t.z, t.x, 0.5, t.z); break;
    case 'siphon': heal(a, pw * 0.15); break;
    case 'psiphon': restoreTp(a, Math.max(2, pw * 0.05)); HUD.float(a.x, 2.2, a.z, '+PSI', '#80b0ff', 12); break;
    case 'shackle': applyStatus(t, 'shock', 2.5, 0, a, 0.4); break;
  }
}

// ---------- enemy damage ----------
function enemyHit(e, t, p) {
  if (!alive(t) || t.team === e.team) return 0;
  if (t.state === 'dodge' && t.inv > 0) { HUD.float(t.x, 2.2, t.z, 'Dodge', '#a0e0ff', 13); return 0; }
  if (!p.sure && t.S) {
    const ch = clamp(0.92 - (t.S.evp - (e.ata || 40)) / 300, 0.55, 0.97);
    if (Math.random() > ch) { HUD.float(t.x, 2.2, t.z, 'Miss', '#a0e0ff', 13); return 0; }
  }
  const st = p.status || (e.elite && e.elite.includes('cold') ? { type: 'slow', dur: 2, v: 0.4 } : e.elite && e.elite.includes('fire') ? { type: 'burn', dur: 3, v: e.atk * 0.1, chance: 0.5 } : null);
  let dmg = (p.dmg || e.atk) * (0.9 + Math.random() * 0.2);
  if (e.status && e.status.enfeeble) dmg *= 1 - e.status.enfeeble.v;
  const d = dealDamage(e, t, dmg, { elem: p.elem || (e.elite && e.elite.includes('fire') ? 'fire' : null) || 'phys', kind: 'enemy', kb: p.kb || 0, status: st });
  if (d > 0 && e.elite && e.elite.includes('vamp')) heal(e, d * 0.5, false);
  return d;
}

// ---------- attacks with the equipped weapon ----------
const ATK_MULT = { N: 1, H: 1.8, S: 1.5 };
const STEP_MULT = [1, 1.1, 1.3];
function attackDuration(a, kind) {
  const wt = WTYPES[a.wtype] || WTYPES.blade;
  const base = wt.cls === 'melee' ? 0.5 : wt.cls === 'gun' ? 0.44 : wt.cls === 'thrown' ? 0.62 : 0.5;
  const spd = wt.speed * (1 + (a.S ? a.S.atkSpd : 0)) * (a.elite && a.elite.includes('fast') ? 1.3 : 1);
  return base / spd * (kind === 'H' ? 1.45 : kind === 'S' ? 1.55 : 1);
}
// called at the moment the swing or shot lands
function attackRelease(a, act) {
  const wt = WTYPES[a.wtype] || WTYPES.blade, kind = act.kind, step = act.step;
  const mult = ATK_MULT[kind] * STEP_MULT[step] * (wt.hits || 1);
  const p = { mult, kind: wt.cls === 'melee' ? 'melee' : 'ranged', heavy: kind === 'H', special: kind === 'S', step, just: act.just };
  if (kind === 'S' && a.weapon && a.weapon.special) { const sp = SPECIALS[a.weapon.special]; if (sp.elem) p.elem = sp.elem; }
  const dx = Math.sin(act.yaw), dz = Math.cos(act.yaw);
  const glow = weaponGlow(a);
  if (wt.cls === 'melee') {
    const range = wt.range + (kind === 'H' ? 0.3 : 0), arc = wt.arc;
    FX.slash(a.x + dx * 0.3, a.z + dz * 0.3, act.yaw, a.wtype === 'lance' ? 0.5 : arc, range, glow, 1.0, step % 2 === 1);
    if (a.wtype === 'lance') FX.beam(a.x + dx * 0.5, 1.0, a.z + dz * 0.5, a.x + dx * range, 1.0, a.z + dz * range, glow, 0.25, 0.12);
    AUDIO.sfx(kind === 'H' ? 'heavy' : 'swing', a.x, a.z, a === PL ? 1 : 0.4);
    const hits = targetsInArc(a, range, arc, wt.targets + (kind === 'H' ? 1 : 0), a.wtype === 'lance' ? 0.8 : 0, dx, dz);
    for (const t of hits) partyHit(a, t, p);
  } else if (wt.cls === 'gun') {
    const speed = a.wtype === 'rifle' ? 40 : 30, n = wt.pellets || 1, burst = wt.burst || 1;
    const aimT = foeInDir(a, dx, dz, wt.range, 0.35);
    let yaw = act.yaw;
    if (aimT) yaw = Math.atan2(aimT.x - a.x, aimT.z - a.z);
    for (let b = 0; b < burst; b++) for (let k = 0; k < n; k++) {
      const sp = n > 1 ? (k / (n - 1) - 0.5) * wt.spread : (Math.random() - 0.5) * 0.06;
      const yy = yaw + sp, delay = b * 0.07;
      const fire = () => { if (a.dead) return; shootProj(a, { x: a.x + Math.sin(yy) * 0.6, z: a.z + Math.cos(yy) * 0.6, y: 1.25, dx: Math.sin(yy), dz: Math.cos(yy), speed, life: wt.range / speed, r: a.wtype === 'rifle' ? 0.35 : 0.3, team: a.team, color: glow, kind: a.wtype === 'rifle' ? 'beam' : 'bullet', pierce: wt.pierce || 0, payload: { ...p, mult: mult / (n > 1 ? 1 : 1) } }); };
      if (delay) GAME.later(delay, fire); else fire();
    }
    AUDIO.sfx(a.wtype === 'rifle' ? 'rifle' : a.wtype === 'scatter' ? 'shotgun' : 'shoot', a.x, a.z, a === PL ? 1 : 0.4);
  } else if (wt.cls === 'staff') {
    const aimT = foeInDir(a, dx, dz, wt.range, 0.5);
    shootProj(a, { x: a.x + dx * 0.6, z: a.z + dz * 0.6, y: 1.3, dx, dz, speed: a.wtype === 'sigil' ? 20 : 15, life: wt.range / 15 + 0.2, r: 0.4, team: a.team, color: glow, kind: 'orb', homing: aimT ? 6 : 0, target: aimT, payload: p });
    AUDIO.sfx('orb', a.x, a.z, a === PL ? 1 : 0.4);
  } else if (wt.cls === 'thrown') {
    shootProj(a, { x: a.x + dx * 0.6, z: a.z + dz * 0.6, y: 1.1, dx, dz, speed: 16, life: 2.2, r: 0.55, team: a.team, color: glow, kind: 'chakram', pierce: wt.pierce, returns: wt.range, payload: p });
    AUDIO.sfx('chakram', a.x, a.z, a === PL ? 1 : 0.4);
  }
  if (a.rollBonus) a.rollBonus = 0;
}
function weaponGlow(a) {
  const w = a.weapon; if (!w) return 0x60d8ff;
  if (w.special && SPECIALS[w.special].elem) return ELEM_COLORS[SPECIALS[w.special].elem];
  return [0x60d8ff, 0x70a0ff, 0xffe060, 0x60f080, 0xffa040, 0xff5050][w.rar || 0];
}
function targetsInArc(a, range, arc, max, lineW, dx, dz) {
  const out = [];
  for (const e of ENTS) {
    if (e.team === a.team || !alive(e) || e.untargetable) continue;
    const ex = e.x - a.x, ez = e.z - a.z, d = Math.hypot(ex, ez);
    if (d > range + e.r) continue;
    if (lineW) { const along = ex * dx + ez * dz, lat = Math.abs(ex * dz - ez * dx); if (along < -0.3 || lat > lineW + e.r) continue; }
    else if (d > e.r + 0.3) { const c = (ex * dx + ez * dz) / d; if (Math.acos(clamp(c, -1, 1)) > arc / 2 + Math.atan2(e.r, d)) continue; }
    if (!los(a.x, a.z, e.x, e.z) && d > 1.2) continue;
    out.push([d, e]);
  }
  return out.sort((p, q) => p[0] - q[0]).slice(0, max).map((q) => q[1]);
}
function foesInRadius(team, x, z, r) { return ENTS.filter((e) => e.team !== team && alive(e) && !e.untargetable && dist2(e.x, e.z, x, z) < (r + e.r) ** 2); }
function friendsInRadius(team, x, z, r, downed = false) { return ENTS.filter((e) => e.team === team && !e.dead && !e.summon && (downed ? e.downed : !e.downed) && dist2(e.x, e.z, x, z) < r * r); }

// ---------- projectiles ----------
const PROJ_GEO = {};
function projMesh(kind, color) {
  const g = new THREE.Group();
  if (kind === 'beam' || kind === 'laser') { const m = mesh(GM.box(), glowMat(color, 0.95), 0, 0, 0, 0.12, 0.12, kind === 'beam' ? 1.6 : 1.0); g.add(m); }
  else if (kind === 'chakram') { const m = mesh(GM.tor(), glowMat(color, 0.95), 0, 0, 0, 0.9, 0.9, 1.6); m.rotation.x = Math.PI / 2; g.add(m); g.userData.spin = m; }
  else if (kind === 'fireball' || kind === 'magma' || kind === 'darkorb' || kind === 'orb' || kind === 'umbra' || kind === 'grenade' || kind === 'tempest' || kind === 'spark') {
    const s = kind === 'orb' ? 0.32 : kind === 'grenade' ? 0.3 : kind === 'spark' ? 0.25 : 0.42;
    g.add(mesh(GM.sph(), mat(color, { basic: true }), 0, 0, 0, s, s, s)); g.add(mesh(GM.sph(), glowMat(color, 0.4), 0, 0, 0, s * 2.4, s * 2.4, s * 2.4));
  } else g.add(mesh(GM.sph(), glowMat(color, 0.95), 0, 0, 0, 0.2, 0.2, 0.5));
  R.root.add(g);
  return g;
}
// o: { x, z, y, dx, dz, speed, life, r, team, color, kind, pierce, homing, target, returns, arc:{ tx, tz, dur, h }, payload, onHit(target), onEnd() }
function shootProj(owner, o) {
  const p = Object.assign({ owner, hits: new Set(), t: 0, y: 1.2 }, o);
  p.mesh = projMesh(o.kind, o.color);
  p.mesh.position.set(p.x, p.y, p.z);
  p.mesh.rotation.y = Math.atan2(p.dx, p.dz);
  if (p.arc) { p.sx = p.x; p.sz = p.z; }
  PROJ.push(p);
  return p;
}
function updateProjectiles(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i];
    p.t += dt;
    let end = p.t >= p.life;
    if (p.arc) {
      // lobbed: travel to a fixed spot along a parabola
      const k = Math.min(1, p.t / p.arc.dur);
      p.x = lerp(p.sx, p.arc.tx, k); p.z = lerp(p.sz, p.arc.tz, k); p.y = 0.5 + Math.sin(k * Math.PI) * p.arc.h;
      if (k >= 1) end = true;
    } else {
      if (p.homing && p.target && alive(p.target)) {
        const want = Math.atan2(p.target.x - p.x, p.target.z - p.z), cur = Math.atan2(p.dx, p.dz), ny = angTo(cur, want, p.homing * dt);
        p.dx = Math.sin(ny); p.dz = Math.cos(ny);
      } else if (p.homing && !p.target && p.t > 0.1) {
        p.target = p.team === 0 ? nearestFoe(p.owner || { x: p.x, z: p.z, team: 0 }, 12) : nearestPartyTo(p.x, p.z, 14);
      }
      if (p.returns && p.t > p.returns / p.speed && p.owner && !p.back) { p.back = true; p.hits.clear(); }
      if (p.back && p.owner) { const dx = p.owner.x - p.x, dz = p.owner.z - p.z, l = Math.hypot(dx, dz); if (l < 0.8) end = true; else { p.dx = dx / l; p.dz = dz / l; } }
      p.x += p.dx * p.speed * dt; p.z += p.dz * p.speed * dt;
      if (!p.back && solidAt(p.x, p.z)) { end = true; if (p.returns) { p.back = true; end = false; p.hits.clear(); } }
      // hits
      if (!end) for (const e of ENTS) {
        if (e.team === p.team || !alive(e) || e.untargetable || p.hits.has(e)) continue;
        if (e.burrowed) continue;
        if (dist2(e.x, e.z, p.x, p.z) > (e.r + p.r) ** 2) continue;
        p.hits.add(e);
        if (p.onHit) p.onHit(e, p);
        else if (p.team === 0) partyHit(p.owner || PL, e, Object.assign({ origin: p }, p.payload));
        else enemyHit(p.owner || {}, e, p.payload);
        if (p.kind === 'fireball' || p.kind === 'magma') FX.burst(p.x, p.y, p.z, p.color, 10, 4, 0.35, 0.4);
        if (!p.pierce || p.hits.size > p.pierce) { end = true; break; }
      }
    }
    p.mesh.position.set(p.x, p.y, p.z);
    if (!p.arc) p.mesh.rotation.y = Math.atan2(p.dx, p.dz);
    if (p.mesh.userData.spin) p.mesh.userData.spin.rotation.z += dt * 25;
    if (Math.random() < 0.6) FX.spawn(p.x, p.y, p.z, 0, 0.2, 0, p.color, 0.25, p.kind === 'bullet' || p.kind === 'laser' ? 0.18 : 0.3);
    if (end) {
      if (p.onEnd) p.onEnd(p);
      R.root.remove(p.mesh);
      PROJ.splice(i, 1);
    }
  }
}
function nearestPartyTo(x, z, r) { let b = null, bd = r * r; for (const e of ENTS) { if (e.team !== 0 || !alive(e)) continue; const d = dist2(x, z, e.x, e.z); if (d < bd) { bd = d; b = e; } } return b; }
function clearCombat() {
  for (const p of PROJ) R.root.remove(p.mesh); PROJ.length = 0;
  for (const z of ZONES) if (z.tele) FX.kill(z.tele); ZONES.length = 0;
  for (const t of TRAPS) if (t.mesh) R.root.remove(t.mesh); TRAPS.length = 0;
}

// ---------- zones (delayed area hits, lingering pools) ----------
// o: { x, z, r, shape ('circle'|'line'), len, yaw, delay, team, owner, onHit(e), dur (lingering), tick, color, tele (bool), fx }
function addZone(o) {
  const z = Object.assign({ t: 0, fired: false, hits: new Set(), shape: 'circle', delay: 0 }, o);
  if (z.tele && z.delay > 0) z.teleFx = FX.tele(z.x, z.z, z.r, z.delay, z.color || 0xff3030, z.shape, z.len, z.yaw);
  ZONES.push(z); return z;
}
function inZone(z, e) {
  if (z.shape === 'line') {
    const dx = Math.sin(z.yaw), dz = Math.cos(z.yaw), ex = e.x - z.x, ez = e.z - z.z;
    const along = ex * dx + ez * dz, lat = Math.abs(ex * dz - ez * dx);
    return along > -e.r && along < z.len + e.r && lat < z.r + e.r;
  }
  if (z.shape === 'ring') { const d = Math.sqrt(dist2(e.x, e.z, z.x, z.z)); return d < z.r + e.r && d > z.r0 - e.r; }
  return dist2(e.x, e.z, z.x, z.z) < (z.r + e.r) ** 2;
}
function updateZones(dt) {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    const z = ZONES[i];
    z.t += dt;
    if (!z.fired && z.t >= z.delay) {
      z.fired = true;
      if (z.teleFx) { FX.kill(z.teleFx); z.teleFx = null; }
      if (z.fx) z.fx(z);
      if (!z.dur) { for (const e of [...ENTS]) if (e.team !== z.team && alive(e) && !e.untargetable && !e.burrowed && inZone(z, e)) z.onHit(e, z); }
      z.nextTick = 0;
    }
    if (z.fired && z.dur) {
      z.nextTick -= dt;
      if (z.nextTick <= 0) { z.nextTick = z.tick || 0.5; for (const e of [...ENTS]) if (e.team !== z.team && alive(e) && !e.untargetable && inZone(z, e)) z.onHit(e, z); if (z.fxTick) z.fxTick(z); }
    }
    if (z.fired && (!z.dur || z.t >= z.delay + z.dur)) { if (z.onEnd) z.onEnd(z); ZONES.splice(i, 1); }
  }
}

// ---------- psionic arts ----------
function techTarget(a, aim, range) {
  // aim: { x, z } point on the ground; prefer a foe near it
  const dx = aim.x - a.x, dz = aim.z - a.z;
  let t = null, best = 9;
  for (const e of ENTS) { if (e.team === a.team || !alive(e) || e.untargetable) continue; if (dist2(a.x, a.z, e.x, e.z) > range * range) continue; const d = dist2(e.x, e.z, aim.x, aim.z); if (d < best) { best = d; t = e; } }
  if (!t) t = foeInDir(a, dx, dz, range, 0.6);
  return t;
}
function clampAim(a, aim, range) {
  const dx = aim.x - a.x, dz = aim.z - a.z, d = Math.hypot(dx, dz);
  if (d <= range) return { x: aim.x, z: aim.z };
  return { x: a.x + dx / d * range, z: a.z + dz / d * range };
}
function castTechEffect(a, id, lv, aim, free = false) {
  const T_ = TECHS[id], color = T_.elem ? ELEM_COLORS[T_.elem] : 0xa0ffc0;
  const tp = { kind: 'tech', techId: id, techLv: lv, elem: T_.elem };
  const yaw = Math.atan2(aim.x - a.x, aim.z - a.z), dx = Math.sin(yaw), dz = Math.cos(yaw);
  const sfx = { fire: 'fire', ice: 'ice', bolt: 'zap', light: 'light', dark: 'dark' }[T_.elem] || (T_.kind === 'heal' || T_.kind === 'revive' ? 'heal' : 'buff');
  AUDIO.sfx(sfx, a.x, a.z, a === PL ? 1 : 0.5);
  switch (T_.kind) {
    case 'bolt': {
      const tgt = techTarget(a, aim, T_.range);
      const ty = tgt ? Math.atan2(tgt.x - a.x, tgt.z - a.z) : yaw;
      shootProj(a, { x: a.x + Math.sin(ty) * 0.6, z: a.z + Math.cos(ty) * 0.6, y: 1.3, dx: Math.sin(ty), dz: Math.cos(ty), speed: 18, life: T_.range / 18 + 0.2, r: 0.45, team: a.team, color, kind: 'fireball', homing: 3, target: tgt,
        onHit: (e, p) => { partyHit(a, e, { ...tp, status: { type: 'burn', dur: 3, v: techPower(a, id, lv) * 0.1, chance: 0.25 } }); for (const o of foesInRadius(a.team, p.x, p.z, 1.6)) if (o !== e) partyHit(a, o, { ...tp, mult: 0.5 }); FX.explode(p.x, p.z, 1.4, color); } });
      break;
    }
    case 'ring': {
      FX.ring(a.x, a.z, color, 0.5, T_.radius, 0.45, 0.3); FX.ring(a.x, a.z, color, 0.3, T_.radius * 0.8, 0.35, 0.8);
      FX.burst(a.x, 0.8, a.z, color, 40, T_.radius * 2.5, 0.5, 0.5, { flat: true, drag: 2 });
      const st = T_.elem === 'ice' ? { type: 'slow', dur: 3, v: 0.4 } : { type: 'burn', dur: 3, v: techPower(a, id, lv) * 0.08, chance: 0.4 };
      for (const e of foesInRadius(a.team, a.x, a.z, T_.radius)) { partyHit(a, e, { ...tp, status: st, kb: 3 }); if (T_.elem === 'ice') applyStatus(e, 'freeze', 2, 0, a, 0.12); }
      break;
    }
    case 'burst': {
      const tgt = techTarget(a, aim, T_.range), pt = tgt ? { x: tgt.x, z: tgt.z } : clampAim(a, aim, T_.range);
      addZone({ x: pt.x, z: pt.z, r: T_.radius, delay: 0.3, team: a.team, owner: a,
        fx: (z) => { FX.explode(z.x, z.z, z.r, color); if (T_.elem === 'ice') FX.burst(z.x, 1, z.z, 0xffffff, 20, 4, 0.8, 0.4, { grav: 3 }); },
        onHit: (e) => { partyHit(a, e, { ...tp, kb: 3 }); if (T_.elem === 'ice') applyStatus(e, 'freeze', 2, 0, a, 0.15); if (T_.elem === 'fire') applyStatus(e, 'burn', 3, techPower(a, id, lv) * 0.1, a, 0.3); } });
      FX.ring(pt.x, pt.z, color, T_.radius, T_.radius * 0.2, 0.3, 0.06, 0.6);
      break;
    }
    case 'wave': {
      const n = Math.floor(T_.range / 1.3);
      const hit = new Set();
      for (let k = 1; k <= n; k++) {
        const x = a.x + dx * k * 1.3, z = a.z + dz * k * 1.3;
        if (solidAt(x, z)) break;
        GAME.later(k * 0.035, () => {
          FX.burst(x, 0.5, z, color, 6, 2, 0.6, 0.45, { up: 3, grav: 6 }); FX.orb(x, 0.4, z, 0.5, 0xd0f0ff, 0.4, 1.3);
          for (const e of foesInRadius(a.team, x, z, 1.1)) if (!hit.has(e)) { hit.add(e); partyHit(a, e, tp); applyStatus(e, 'freeze', 2, 0, a, 0.15); applyStatus(e, 'slow', 3, 0.35, a); }
        });
      }
      break;
    }
    case 'strike': {
      const tgt = techTarget(a, aim, T_.range); if (!tgt) { FX.bolt(a.x + dx * 4, 6, a.z + dz * 4, a.x + dx * 4, 0, a.z + dz * 4, color); break; }
      FX.bolt(tgt.x, 7, tgt.z, tgt.x, 0.3, tgt.z, color); flash(tgt.x, 2, tgt.z, color, 3, 0.15);
      partyHit(a, tgt, { ...tp, status: { type: 'shock', dur: 2, chance: 0.12 } });
      for (const o of foesInRadius(a.team, tgt.x, tgt.z, 1.3)) if (o !== tgt) partyHit(a, o, { ...tp, mult: 0.4 });
      break;
    }
    case 'chain': {
      let cur = techTarget(a, aim, T_.range), from = a, mult = 1;
      const hit = new Set();
      for (let k = 0; cur && k <= T_.jumps; k++) {
        hit.add(cur);
        FX.bolt(from.x, 1.3, from.z, cur.x, 1.0, cur.z, color);
        partyHit(a, cur, { ...tp, mult, status: { type: 'shock', dur: 2, chance: 0.08 } });
        from = cur; mult *= 0.85;
        cur = nearestFoe(from, 6, (e) => !hit.has(e)); if (cur && cur.team === a.team) cur = null;
      }
      break;
    }
    case 'storm': {
      const pt = clampAim(a, aim, T_.range);
      for (let k = 0; k < 8; k++) GAME.later(k * 0.13, () => {
        const near = foesInRadius(a.team, pt.x, pt.z, T_.radius);
        const tg = near.length ? near[(Math.random() * near.length) | 0] : null;
        const x = tg ? tg.x : pt.x + (Math.random() - 0.5) * T_.radius, z = tg ? tg.z : pt.z + (Math.random() - 0.5) * T_.radius;
        FX.bolt(x, 8, z, x, 0.2, z, color); FX.ring(x, z, color, 0.2, 1.4, 0.25);
        for (const e of foesInRadius(a.team, x, z, 1.4)) partyHit(a, e, { ...tp, status: { type: 'shock', dur: 1.5, chance: 0.06 } });
      });
      FX.ring(pt.x, pt.z, color, T_.radius, T_.radius, 1.1, 0.05, 0.4);
      break;
    }
    case 'pillar': {
      const tgt = techTarget(a, aim, T_.range), pt = tgt ? { x: tgt.x, z: tgt.z } : clampAim(a, aim, T_.range);
      FX.pillar(pt.x, pt.z, T_.radius, 9, 0xfff8d0, 0.7); FX.ring(pt.x, pt.z, 0xffffff, 0.5, T_.radius * 1.4, 0.5); flash(pt.x, 3, pt.z, 0xfff0c0, 5, 0.4);
      for (const e of foesInRadius(a.team, pt.x, pt.z, T_.radius)) partyHit(a, e, tp);
      break;
    }
    case 'orb': {
      const tgt = techTarget(a, aim, T_.range);
      shootProj(a, { x: a.x + dx * 0.6, z: a.z + dz * 0.6, y: 1.3, dx, dz, speed: 9, life: 3, r: 0.6, team: a.team, color, kind: 'umbra', homing: 4, target: tgt,
        onHit: (e) => { if (!e.boss && Math.random() < 0.02 + lv * 0.003) { dealDamage(a, e, e.hp + 1, { elem: 'dark' }); HUD.float(e.x, 2.6, e.z, 'DOOM', '#c060ff', 18); } else partyHit(a, e, tp); FX.explode(e.x, e.z, 1.5, color); } });
      break;
    }
    case 'heal': {
      const amt = (lv * 5 + 10 + a.S.mst * 0.35) * (1 + a.S.techPct);
      FX.ring(a.x, a.z, 0x90ffb0, 0.5, T_.radius, 0.6, 0.06, 0.7);
      for (const f of friendsInRadius(a.team, a.x, a.z, T_.radius)) { heal(f, amt + f.maxHp * (0.08 + lv * 0.006)); FX.burst(f.x, 1, f.z, 0x90ffb0, 12, 1.5, 0.8, 0.4, { up: 2 }); }
      break;
    }
    case 'cure': {
      FX.ring(a.x, a.z, 0xfff0a0, 0.5, T_.radius, 0.5);
      for (const f of friendsInRadius(a.team, a.x, a.z, T_.radius)) { for (const k of ['burn', 'freeze', 'shock', 'poison', 'slow', 'stun', 'confuse']) delete f.status[k]; FX.burst(f.x, 1, f.z, 0xfff0a0, 8, 1.5, 0.6, 0.35, { up: 2 }); }
      break;
    }
    case 'buff': {
      const v = 0.1 + lv * 0.012, dur = 30 + lv * 2, col = T_.stat === 'atp' ? 0xff6050 : 0x5090ff;
      FX.ring(a.x, a.z, col, 0.5, T_.radius, 0.5);
      for (const f of friendsInRadius(a.team, a.x, a.z, T_.radius)) { f.buffs[id === 'fervor' ? 'fervor' : 'bulwark'] = { t: dur, v }; FX.burst(f.x, 1, f.z, col, 10, 1.5, 0.7, 0.35, { up: 2.5 }); HUD.float(f.x, 2.4, f.z, T_.stat === 'atp' ? 'ATK up' : 'DEF up', hexCss(col), 13); }
      break;
    }
    case 'debuff': {
      const pt = clampAim(a, aim, T_.range), v = 0.1 + lv * 0.01;
      FX.ring(pt.x, pt.z, 0xc080ff, 0.3, T_.radius, 0.5);
      for (const e of foesInRadius(a.team, pt.x, pt.z, T_.radius)) applyStatus(e, id === 'enfeeble' ? 'enfeeble' : 'expose', 15, v, a);
      break;
    }
    case 'revive': {
      const d = friendsInRadius(a.team, a.x, a.z, T_.radius, true);
      if (d.length) reviveActor(d[0], 0.5); else HUD.float(a.x, 2.4, a.z, 'No one to revive', '#aaa', 12);
      break;
    }
    case 'portal': if (a === PL) GAME.openPortal(); break;
  }
  // Chain Cast: a free echo of attack arts
  if (!free && T_.elem && a.S.chain && Math.random() < a.S.chain) { GAME.later(0.25, () => { if (!a.dead) { HUD.float(a.x, 2.5, a.z, 'Chain!', '#d0a0ff', 13); castTechEffect(a, id, lv, aim, true); } }); }
}

// ---------- skills ----------
function skillWeaponHit(a, mult, kind = 'melee', extra = {}) { return { mult, kind, noMiss: true, kb: 3, heavy: true, ...extra }; }
function useSkillEffect(a, id, rank, aim) {
  const yaw = Math.atan2(aim.x - a.x, aim.z - a.z), dx = Math.sin(yaw), dz = Math.cos(yaw), glow = weaponGlow(a);
  switch (id) {
    case 'risingslash': {
      const pt = clampAim(a, aim, 5.5);
      a.dash = { tx: pt.x, tz: pt.z, t: 0, dur: 0.28, onEnd: () => {
        FX.ring(a.x, a.z, glow, 0.5, 2.8, 0.35); FX.slash(a.x, a.z, a.yaw, TAU * 0.9, 2.6, glow, 0.8); FX.burst(a.x, 0.5, a.z, glow, 20, 5, 0.4, 0.4, { flat: true });
        AUDIO.sfx('heavy', a.x, a.z); CAM.shake = Math.min(0.7, CAM.shake + 0.3);
        for (const e of foesInRadius(a.team, a.x, a.z, 2.7)) partyHit(a, e, skillWeaponHit(a, 1.8 + 0.3 * rank));
      } };
      a.inv = Math.max(a.inv, 0.3);
      break;
    }
    case 'whirlwind': a.spin = { t: 0, dur: 1.6, next: 0, mult: 0.7 + 0.1 * rank }; break;
    case 'warcry': {
      FX.ring(a.x, a.z, 0xff6040, 0.5, 8, 0.6); AUDIO.sfx('roar', a.x, a.z, 0.6);
      for (const f of friendsInRadius(a.team, a.x, a.z, 12)) f.buffs.warcry = { t: 12, v: 0.1 + 0.04 * rank };
      for (const e of foesInRadius(a.team, a.x, a.z, 8)) { e.aggro = a; applyStatus(e, 'slow', 4, 0.3, a); }
      break;
    }
    case 'sunder': {
      GAME.later(0.3, () => {
        if (a.dead) return;
        FX.explode(a.x, a.z, 4, glow); FX.ring(a.x, a.z, 0xffffff, 0.5, 4.5, 0.4); CAM.shake = 1;
        for (const e of foesInRadius(a.team, a.x, a.z, 4)) { partyHit(a, e, skillWeaponHit(a, 3 + 0.5 * rank, 'melee', { kb: 6 })); applyStatus(e, 'stun', 1.2, 0, a); }
      });
      break;
    }
    case 'volley': {
      const n = 5 + rank;
      for (let k = 0; k < n; k++) { const yy = yaw + (k / (n - 1) - 0.5) * 0.9; shootProj(a, { x: a.x, z: a.z, y: 1.25, dx: Math.sin(yy), dz: Math.cos(yy), speed: 28, life: 0.5, r: 0.35, team: a.team, color: glow, kind: 'bullet', payload: skillWeaponHit(a, 0.8 + 0.08 * rank, 'ranged', { heavy: false, kb: 1.5 }) }); }
      AUDIO.sfx('shotgun', a.x, a.z);
      break;
    }
    case 'piercinglance': {
      GAME.later(0.45, () => {
        if (a.dead) return;
        const len = 16; let ex = a.x, ez = a.z;
        for (let s = 0; s < len; s += 0.5) { const x = a.x + Math.sin(a.yaw) * s, z = a.z + Math.cos(a.yaw) * s; if (solidAt(x, z)) break; ex = x; ez = z; }
        FX.beam(a.x, 1.25, a.z, ex, 1.25, ez, glow, 0.5, 0.35); FX.beam(a.x, 1.25, a.z, ex, 1.25, ez, 0xffffff, 0.15, 0.25);
        AUDIO.sfx('rifle', a.x, a.z); CAM.shake = 0.4;
        const z = { x: a.x, z: a.z, r: 0.8, shape: 'line', len: Math.hypot(ex - a.x, ez - a.z), yaw: a.yaw };
        for (const e of [...ENTS]) if (e.team !== a.team && alive(e) && inZone(z, e)) partyHit(a, e, skillWeaponHit(a, 2.5 + 0.4 * rank, 'ranged'));
      });
      FX.burst(a.x + dx * 0.6, 1.25, a.z + dz * 0.6, glow, 16, 1.5, 0.45, 0.3, { drag: 1 });
      break;
    }
    case 'grenade': {
      const pt = clampAim(a, aim, 12);
      shootProj(a, { x: a.x, z: a.z, y: 1.2, dx, dz, speed: 0, life: 9, r: 0.3, team: a.team, color: 0xff8030, kind: 'grenade', arc: { tx: pt.x, tz: pt.z, dur: 0.6, h: 3 }, onHit: () => {},
        onEnd: (p) => { FX.explode(p.x, p.z, 3, 0xff7020); AUDIO.sfx('explode', p.x, p.z); CAM.shake = Math.min(0.8, CAM.shake + 0.3); for (const e of foesInRadius(a.team, p.x, p.z, 3)) partyHit(a, e, skillWeaponHit(a, 2 + 0.3 * rank, 'ranged', { elem: 'fire' })); } });
      break;
    }
    case 'predatorsmark': {
      const t = techTarget(a, aim, 16); if (!t) { HUD.float(a.x, 2.4, a.z, 'No target', '#aaa', 12); return false; }
      applyStatus(t, 'mark', 10, 0.15 + 0.05 * rank, a); FX.ring(t.x, t.z, 0xff4040, 1.5, 0.6, 0.5, 0.1); HUD.float(t.x, 2.8, t.z, 'Marked', '#ff6060', 14);
      break;
    }
    case 'sentry': spawnSummon(a, 'sentry', a.x + dx * 1.2, a.z + dz * 1.2, { dur: 15, mult: 0.6 + 0.1 * rank }); break;
    case 'plasmarain': {
      const pt = clampAim(a, aim, 14);
      FX.ring(pt.x, pt.z, glow, 4, 4, 2.2, 0.05, 0.5);
      for (let k = 0; k < 8; k++) GAME.later(0.2 + k * 0.22, () => {
        const x = pt.x + (Math.random() - 0.5) * 6, z = pt.z + (Math.random() - 0.5) * 6;
        FX.beam(x, 9, z, x, 0, z, glow, 0.35, 0.2); FX.ring(x, z, glow, 0.3, 1.6, 0.3); AUDIO.sfx('laser', x, z, 0.6);
        for (const e of foesInRadius(a.team, x, z, 1.6)) partyHit(a, e, skillWeaponHit(a, 0.7 + 0.12 * rank, 'ranged', { heavy: false }));
      });
      break;
    }
    case 'psibolt': {
      const lvl = Math.max(1, Math.floor(a.lvl / 2.5) + 1);
      for (let k = 0; k < 3; k++) {
        const yy = yaw + (k - 1) * 0.35, tgt = techTarget(a, aim, 14);
        shootProj(a, { x: a.x, z: a.z, y: 1.3, dx: Math.sin(yy), dz: Math.cos(yy), speed: 16, life: 1.4, r: 0.35, team: a.team, color: 0xc0a0ff, kind: 'orb', homing: 7, target: tgt,
          onHit: (e) => partyHit(a, e, { kind: 'tech', power: techUnit(a) * (0.9 + 0.2 * rank) }) });
      }
      AUDIO.sfx('orb', a.x, a.z);
      break;
    }
    case 'barrier': a.buffs.barrier = { t: 10, hp: a.maxHp * (0.2 + 0.08 * rank) }; FX.orb(a.x, 1, a.z, 1.2, 0x80c0ff, 0.5, 1.5); AUDIO.sfx('buff', a.x, a.z); break;
    case 'familiar': spawnSummon(a, 'wisp', a.x - dx, a.z - dz, { dur: 30, mult: 0.5 + 0.1 * rank }); break;
    case 'umbralrite': {
      const pt = clampAim(a, aim, 13);
      addZone({ x: pt.x, z: pt.z, r: 4, delay: 0.5, team: a.team, owner: a, tele: false,
        fx: (z) => { FX.orb(z.x, 1, z.z, 2, 0xa040ff, 0.6, 2.2); FX.ring(z.x, z.z, 0x8020ff, 0.5, 4.2, 0.5); FX.burst(z.x, 1, z.z, 0x8020ff, 30, 4, 0.8, 0.5); AUDIO.sfx('dark', z.x, z.z); },
        onHit: (e) => { if (!e.boss && Math.random() < 0.03 * rank) { dealDamage(a, e, e.hp + 1, { elem: 'dark' }); HUD.float(e.x, 2.6, e.z, 'DOOM', '#c060ff', 18); } else partyHit(a, e, { kind: 'tech', elem: 'dark', power: techUnit(a) * (2.2 + 0.4 * rank) }); } });
      FX.ring(pt.x, pt.z, 0x8020ff, 4, 0.5, 0.5, 0.05, 0.6);
      break;
    }
    case 'meteor': {
      const pt = clampAim(a, aim, 14), pw = techUnit(a);
      addZone({ x: pt.x, z: pt.z, r: 4.5, delay: 1.0, team: a.team, owner: a, tele: true, color: 0xff8030,
        fx: (z) => { FX.beam(z.x + 6, 14, z.z - 6, z.x, 0, z.z, 0xff8030, 1.4, 0.25); FX.explode(z.x, z.z, 4.5, 0xff6020); AUDIO.sfx('explode', z.x, z.z); CAM.shake = 1;
          addZone({ x: z.x, z: z.z, r: 3.2, delay: 0, dur: 4, tick: 0.5, team: a.team, owner: a, onHit: (e) => partyHit(a, e, { kind: 'tech', elem: 'fire', power: pw * 0.3, noMiss: true }), fxTick: (q) => FX.burst(q.x, 0.3, q.z, 0xff6020, 10, 2, 0.6, 0.5, { flat: true, up: 1 }) }); },
        onHit: (e) => partyHit(a, e, { kind: 'tech', elem: 'fire', power: pw * (4 + 0.6 * rank) }) });
      break;
    }
    case 'trapburst': case 'trapfreeze': {
      const mine = TRAPS.filter((q) => q.owner === a); if (mine.length >= 3) { R.root.remove(mine[0].mesh); TRAPS.splice(TRAPS.indexOf(mine[0]), 1); }
      const m = new THREE.Group(); const col = id === 'trapfreeze' ? 0x80d8ff : 0xff7030;
      m.add(mesh(GM.cyl6(), mat(0x404850), 0, 0.08, 0, 0.7, 0.16, 0.7)); m.add(mesh(GM.cyl6(), mat(col, { e: col, ei: 1.4 }), 0, 0.18, 0, 0.36, 0.06, 0.36));
      m.position.set(a.x, 0, a.z); R.root.add(m);
      TRAPS.push({ owner: a, kind: id, x: a.x, z: a.z, arm: 0.5, life: 40, mesh: m });
      AUDIO.sfx('ui', a.x, a.z);
      break;
    }
  }
  return true;
}
function updateTraps(dt) {
  for (let i = TRAPS.length - 1; i >= 0; i--) {
    const t = TRAPS[i]; t.arm -= dt; t.life -= dt;
    t.mesh.children[1].material.emissiveIntensity = 1 + Math.sin(GAME.time * 8) * 0.5;
    let fire = t.life <= 0;
    if (t.arm <= 0 && foesInRadius(0, t.x, t.z, 2).length) fire = true;
    if (!fire) continue;
    if (t.life > 0) {
      if (t.kind === 'trapfreeze') { FX.ring(t.x, t.z, 0x80d8ff, 0.5, 3, 0.4); FX.burst(t.x, 0.5, t.z, 0xd0f0ff, 30, 4, 0.8, 0.4); AUDIO.sfx('ice', t.x, t.z); for (const e of foesInRadius(0, t.x, t.z, 3)) { applyStatus(e, 'freeze', 3, 0, t.owner); partyHit(t.owner, e, skillWeaponHit(t.owner, 0.5, 'ranged', { elem: 'ice', kb: 0 })); } }
      else { FX.explode(t.x, t.z, 3, 0xff7030); AUDIO.sfx('explode', t.x, t.z); for (const e of foesInRadius(0, t.x, t.z, 3)) partyHit(t.owner, e, skillWeaponHit(t.owner, 2.5, 'ranged', { elem: 'fire' })); }
    }
    R.root.remove(t.mesh); TRAPS.splice(i, 1);
  }
}

// ---------- summons (sentry turret, familiar wisp) ----------
function spawnSummon(owner, kind, x, z, o) {
  const s = makeActor('summon', x, z, { team: owner.team, owner, summon: true, untargetable: true, life: o.dur, mult: o.mult, S: owner.S, weapon: owner.weapon, lvl: owner.lvl, static: kind === 'sentry', r: 0.4, cdT: 0.5 });
  s.skind = kind;
  if (kind === 'sentry') { const def = { shape: 'turret', color: 0x5a7080, color2: 0x60e0ff, size: 0.75 }; s.rig = makeMonster(def); }
  else { s.rig = makeMonster(ENEMIES.wisp); s.fly = true; }
  s.model = s.rig.g; s.model.position.set(x, 0, z); R.root.add(s.model);
  FX.teleIn(x, z, 0x60e0ff);
  return s;
}
function updateSummon(s, dt) {
  s.life -= dt; s.t += dt;
  if (s.life <= 0 || !s.owner || s.owner.dead) { FX.burst(s.x, 1, s.z, 0x60e0ff, 10, 2, 0.5, 0.3); removeActor(s); return; }
  if (s.skind === 'wisp') {
    const o = s.owner, ang = s.t * 1.2, tx = o.x + Math.cos(ang) * 1.6, tz = o.z + Math.sin(ang) * 1.6;
    s.x = lerp(s.x, tx, 1 - Math.exp(-dt * 3)); s.z = lerp(s.z, tz, 1 - Math.exp(-dt * 3));
  }
  s.cdT -= dt;
  const tgt = nearestFoe(s, s.skind === 'sentry' ? 13 : 11);
  if (tgt) faceTo(s, tgt.x, tgt.z, 8, dt);
  if (tgt && s.cdT <= 0 && los(s.x, s.z, tgt.x, tgt.z)) {
    if (s.skind === 'sentry') {
      s.cdT = 0.7;
      const yy = Math.atan2(tgt.x - s.x, tgt.z - s.z);
      shootProj(s, { x: s.x, z: s.z, y: 1.0, dx: Math.sin(yy), dz: Math.cos(yy), speed: 30, life: 0.6, r: 0.3, team: s.team, color: 0x60e0ff, kind: 'bullet', onHit: (e) => partyHit(s.owner, e, { mult: s.mult, kind: 'ranged', noMiss: true, origin: s }) });
      AUDIO.sfx('shoot', s.x, s.z, 0.4);
    } else {
      s.cdT = 1.4;
      const lv = Math.max(1, Math.floor(s.owner.lvl / 2.5) + 1);
      if (Math.random() < 0.5) { FX.bolt(tgt.x, 6, tgt.z, tgt.x, 0.3, tgt.z, 0xfff060); partyHit(s.owner, tgt, { kind: 'tech', elem: 'bolt', power: techPower(s.owner, 'jolt', lv) * s.mult }); AUDIO.sfx('zap', tgt.x, tgt.z, 0.5); }
      else { const yy = Math.atan2(tgt.x - s.x, tgt.z - s.z); shootProj(s, { x: s.x, z: s.z, y: 1.4, dx: Math.sin(yy), dz: Math.cos(yy), speed: 14, life: 1, r: 0.4, team: s.team, color: 0xff7030, kind: 'fireball', homing: 4, target: tgt, onHit: (e) => { partyHit(s.owner, e, { kind: 'tech', elem: 'fire', power: techPower(s.owner, 'ember', lv) * s.mult }); FX.explode(e.x, e.z, 1, 0xff7030); } }); }
    }
  }
  s.model.position.set(s.x, 0, s.z); s.model.rotation.y = s.yaw;
  animMonster(s.rig, { t: s.t, move: 0, state: 'idle' });
}

// ---------- overdrives ----------
function chargePB(v) {
  if (!GAME.char || !GAME.char.sprite.pbs.length) return;
  const m = GAME.char.sprite; const before = m.pbCharge;
  m.pbCharge = Math.min(100, m.pbCharge + v * (0.6 + m.syn / 200));
  if (before < 100 && m.pbCharge >= 100) { HUD.toast('Overdrive ready! [R]', '#ffe080'); AUDIO.sfx('just'); }
}
function usePB(a) {
  const m = GAME.char.sprite;
  if (m.pbCharge < 100 || !m.pbs.length) return false;
  const pb = m.pbs[m.pbSel % m.pbs.length];
  m.pbCharge = 0;
  const col = SPRITE_FORMS[m.form].color;
  AUDIO.sfx('pb', a.x, a.z); CAM.shake = 1; FX.pillar(a.x, a.z, 1.5, 12, col, 1); FX.ring(a.x, a.z, col, 0.5, 8, 0.8);
  HUD.toast(PBS[pb].name + '!', hexCss(col));
  const power = Math.max(weaponRoll(a) * (1 + atpEff(a) / 400), techPower(a, 'ember', Math.max(1, Math.floor(a.lvl / 2.5))) * 1.4);
  if (pb === 'nova') GAME.later(0.4, () => { FX.explode(a.x, a.z, 7, col); for (const e of foesInRadius(a.team, a.x, a.z, 7)) partyHit(a, e, { kind: 'tech', power: power * 5, noMiss: true, kb: 8 }); });
  if (pb === 'tempest') for (let k = 0; k < 16; k++) { const yy = k / 16 * TAU; GAME.later(k * 0.05, () => shootProj(a, { x: a.x, z: a.z, y: 2, dx: Math.sin(yy), dz: Math.cos(yy), speed: 11, life: 3, r: 0.45, team: a.team, color: col, kind: 'tempest', homing: 5, onHit: (e) => { partyHit(a, e, { kind: 'tech', power: power * 1.4, noMiss: true }); FX.explode(e.x, e.z, 1.2, col); } })); }
  if (pb === 'seraph') for (const f of friendsOf(a)) { if (f.downed) reviveActor(f, 1); heal(f, f.maxHp); restoreTp(f, f.maxTp * 0.5); FX.burst(f.x, 1, f.z, 0xa0ffc0, 20, 2, 1, 0.5, { up: 3 }); }
  if (pb === 'aegis') for (const f of friendsOf(a)) { f.buffs.aegis = { t: 6 }; f.buffs.regen = { t: 6, v: f.maxHp * 0.05 }; FX.orb(f.x, 1, f.z, 1.3, 0xffe080, 0.6, 1.4); }
  return true;
}
