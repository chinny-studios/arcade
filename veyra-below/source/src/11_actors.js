// Veyra Below — actors: shared entity data, the damage pipeline, status effects, death

const ENTS = [];
let PL = null; // the player's actor
let ENT_ID = 0;
function makeActor(kind, x, z, o = {}) {
  const a = Object.assign({ id: ++ENT_ID, kind, team: kind === 'enemy' ? 1 : 0, x, z, y: 0, vx: 0, vz: 0, yaw: 0, r: 0.45,
    hp: 1, maxHp: 1, tp: 0, maxTp: 0, lvl: 1, state: 'idle', st: 0, act: null, cd: {}, status: {}, buffs: {},
    t: Math.random() * 10, flash: 0, dead: false, downed: false, inv: 0, kbx: 0, kbz: 0, hitT: 0, lastHurt: 99, model: null, rig: null }, o);
  ENTS.push(a);
  return a;
}
function removeActor(a) {
  const i = ENTS.indexOf(a); if (i >= 0) ENTS.splice(i, 1);
  if (a.model && a.model.parent) a.model.parent.remove(a.model);
}
const isFoe = (a, b) => a.team !== b.team;
const alive = (a) => a && !a.dead && !a.downed;
function foesOf(a) { return ENTS.filter((e) => e.team !== a.team && alive(e) && !e.untargetable); }
function friendsOf(a) { return ENTS.filter((e) => e.team === a.team && !e.dead && !e.summon); }
function nearestFoe(a, range, filter) {
  let best = null, bd = range * range;
  for (const e of ENTS) { if (e.team === a.team || !alive(e) || e.untargetable || (e.stealthed && dist2(a.x, a.z, e.x, e.z) > 9)) continue; if (filter && !filter(e)) continue; const d = dist2(a.x, a.z, e.x, e.z); if (d < bd) { bd = d; best = e; } }
  return best;
}
// a foe roughly in the direction (dx,dz) from a, preferring ones near the aim line
function foeInDir(a, dx, dz, range, cone = 0.6) {
  let best = null, bs = Infinity;
  const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  for (const e of ENTS) {
    if (e.team === a.team || !alive(e) || e.untargetable) continue;
    const ex = e.x - a.x, ez = e.z - a.z, d = Math.hypot(ex, ez); if (d > range + e.r) continue;
    const c = (ex * dx + ez * dz) / (d || 1); if (c < Math.cos(cone)) continue;
    const s = d * (2 - c); if (s < bs) { bs = s; best = e; }
  }
  return best;
}
function enemyFamily(e) { return e.def && e.def.family ? e.def.family : (e.area ? AREAS[e.area].family : null); }

// ---------- damage ----------
// o: { elem, crit, kind ('melee','ranged','tech','enemy','dot'), kb, status: { type, chance, dur, v }, src, noNumber, special }
function dealDamage(src, tgt, amount, o = {}) {
  if (!tgt || tgt.dead || tgt.downed) return 0;
  if (tgt.inv > 0 || (tgt.buffs.aegis && tgt.buffs.aegis.t > 0)) { if (!o.noNumber) HUD.float(tgt.x, (tgt.h || 1.8) + 0.3, tgt.z, 'Guard', '#a0e0ff', 14); return 0; }
  let dmg = amount;
  const elem = o.elem || 'phys';
  if (tgt.team === 1) {
    // monster side
    const res = tgt.res || {};
    if (elem !== 'phys') dmg *= 1 - (res[elem] || 0);
    else if (tgt.armored) dmg *= 1 - tgt.armored;
    if (tgt.elite && tgt.elite.includes('stone') && elem === 'phys') dmg *= 0.5;
    if (tgt.block && src && o.kind !== 'dot' && o.kind !== 'tech') {
      const ang = Math.abs(angWrap(Math.atan2(src.x - tgt.x, src.z - tgt.z) - tgt.yaw));
      if (ang < 1.1 && tgt.state !== 'wind' && tgt.state !== 'hit') { dmg *= 1 - tgt.block; AUDIO.sfx('block', tgt.x, tgt.z); if (!o.noNumber) HUD.float(tgt.x, (tgt.h || 1.8) + 0.4, tgt.z, 'Blocked', '#c8d0e0', 13); }
    }
    if (tgt.status.mark) dmg *= 1 + tgt.status.mark.v;
    if (tgt.status.expose) dmg *= 1 + tgt.status.expose.v;
    if (tgt.boss && tgt.bossShield) dmg *= 0.1;
  } else {
    // party side
    const S = tgt.S;
    if (o.kind !== 'dot') {
      const dfp = (S ? S.dfp : 20) * (1 + (tgt.buffs.bulwark ? tgt.buffs.bulwark.v : 0));
      dmg *= 120 / (120 + dfp);
    }
    if (S) {
      if (elem !== 'phys') dmg *= 1 - (S[RES_KEYS[elem]] || 0);
      dmg *= 1 - S.dmgReduce;
      if (tgt.hp < tgt.maxHp * 0.3) dmg *= 1 - S.lowHpReduce;
    }
    if (src && src.status && src.status.enfeeble) dmg *= 1 - src.status.enfeeble.v;
    if (tgt.buffs.barrier && tgt.buffs.barrier.t > 0) {
      const b = tgt.buffs.barrier, take = Math.min(b.hp, dmg); b.hp -= take; dmg -= take;
      if (b.hp <= 0) { b.t = 0; FX.ring(tgt.x, tgt.z, 0x80c0ff, 0.5, 2, 0.4, 1); }
      FX.burst(tgt.x, 1.2, tgt.z, 0x80c0ff, 4, 2, 0.2, 0.3);
      if (dmg <= 0) return 0;
    }
  }
  dmg = Math.max(1, Math.round(dmg));
  // a lethal blow on a vanguard with Last Stand
  if (tgt === PL && tgt.hp - dmg <= 0 && tgt.S && tgt.S.lastStand && !GAME.lastStandUsed) { GAME.lastStandUsed = true; dmg = tgt.hp - 1; tgt.inv = 2; tgt.blink = 2; HUD.float(tgt.x, 2.4, tgt.z, 'LAST STAND', '#ffd060', 18); AUDIO.sfx('buff'); }
  tgt.hp -= dmg;
  tgt.flash = 0.12; tgt.lastHurt = 0;
  if (!o.noNumber) {
    const big = o.crit || dmg > tgt.maxHp * 0.25;
    const col = tgt.team === 0 ? '#ff6060' : o.crit ? '#ffd040' : elem !== 'phys' ? hexCss(ELEM_COLORS[elem]) : '#ffffff';
    HUD.float(tgt.x + (Math.random() - 0.5) * 0.4, (tgt.h || 1.8) + 0.2, tgt.z, String(dmg) + (o.crit ? '!' : ''), col, big ? 22 : 16, o.crit);
  }
  // reactions
  if (o.kb && !tgt.boss && !tgt.static) { const kbm = tgt.team === 1 ? (tgt.poise ? o.kb / (1 + tgt.poise) : o.kb) : o.kb * 0.5; const dx = tgt.x - (src ? src.x : tgt.x), dz = tgt.z - (src ? src.z : tgt.z), l = Math.hypot(dx, dz) || 1; tgt.kbx += dx / l * kbm; tgt.kbz += dz / l * kbm; }
  if (tgt.team === 1 && !tgt.boss) {
    const stagger = o.kind === 'dot' ? false : !tgt.poise || (o.heavy && tgt.poise <= 2) || dmg > tgt.maxHp * 0.2 * tgt.poise;
    if (stagger && tgt.state !== 'dead') { tgt.hitT = o.heavy ? 0.4 : 0.22; if (tgt.state === 'wind' && (o.heavy || !tgt.poise)) { tgt.state = 'hit'; tgt.st = 0; tgt.act = null; } }
    if (!tgt.aggro && src) tgt.aggro = src;
  } else if (tgt.team === 0 && dmg > tgt.maxHp * 0.08 && tgt.state !== 'attack' && tgt.state !== 'dodge' && tgt.state !== 'skill') { tgt.hitT = 0.25; }
  if (o.status) applyStatus(tgt, o.status.type, o.status.dur, o.status.v, src, o.status.chance);
  if (tgt.team === 0) { AUDIO.sfx('hurt', tgt.x, tgt.z, tgt === PL ? 1 : 0.5); if (tgt === PL) { CAM.shake = Math.min(1, CAM.shake + 0.25); HUD.hurtFlash(); chargePB(dmg / tgt.maxHp * 30); } }
  // thorns
  if (tgt.S && tgt.S.thorns && src && src.team !== tgt.team && o.kind === 'enemy' && alive(src)) dealDamage(tgt, src, tgt.S.thorns, { kind: 'dot', noNumber: false });
  if (tgt.team === 1 && tgt.elite && tgt.elite.includes('shock') && src && src.team === 0 && Math.random() < 0.25) { spawnSpark(tgt); }
  if (tgt.hp <= 0) killActor(tgt, src);
  return dmg;
}
function spawnSpark(e) {
  // lightning-enchanted elites shed seeking sparks when hit
  const a = Math.random() * TAU;
  shootProj(e, { x: e.x, z: e.z, y: 1, dx: Math.cos(a), dz: Math.sin(a), speed: 5, life: 2.5, r: 0.35, team: 1, color: 0xfff060, kind: 'spark', homing: 2,
    payload: { dmg: e.atk * 0.4, elem: 'bolt' } });
}
function heal(a, v, show = true) {
  if (!a || a.dead) return 0;
  const before = a.hp; a.hp = Math.min(a.maxHp, a.hp + v);
  const d = Math.round(a.hp - before);
  if (show && d > 0) HUD.float(a.x, (a.h || 1.8) + 0.3, a.z, '+' + d, '#70f090', 15);
  return d;
}
function restoreTp(a, v) { a.tp = Math.min(a.maxTp, a.tp + v); }

// ---------- status effects ----------
function applyStatus(t, type, dur, v, src, chance = 1) {
  if (!t || t.dead || Math.random() > chance) return;
  if (t.boss && (type === 'freeze' || type === 'stun' || type === 'shock')) { dur *= 0.25; if (t.statusImmuneT > 0) return; t.statusImmuneT = 6; }
  if (t.S && t.race === 'construct' && (type === 'poison' || type === 'shock')) return;
  if (t.immune && t.immune.includes(type)) return;
  const s = t.status[type];
  if (s) { s.t = Math.max(s.t, dur); s.v = Math.max(s.v || 0, v || 0); s.src = src || s.src; return; }
  t.status[type] = { t: dur, v: v || 0, src, tick: 0 };
  const label = { burn: 'Burn', freeze: 'Frozen', shock: 'Paralysed', poison: 'Poison', slow: 'Slowed', stun: 'Stunned', mark: 'Marked', enfeeble: 'Weakened', expose: 'Exposed', confuse: 'Confused' }[type];
  if (label && type !== 'mark') HUD.float(t.x, (t.h || 1.8) + 0.6, t.z, label, type === 'burn' ? '#ff9040' : type === 'freeze' ? '#90e0ff' : type === 'shock' ? '#fff060' : type === 'poison' ? '#a0ff60' : '#d0c0ff', 13);
}
function canAct(a) { return !(a.status.freeze || a.status.shock || a.status.stun); }
function updateStatus(a, dt) {
  for (const [k, s] of Object.entries(a.status)) {
    s.t -= dt;
    if (k === 'burn' || k === 'poison') {
      s.tick -= dt;
      if (s.tick <= 0) { s.tick = 0.5; dealDamage(s.src, a, Math.max(1, s.v * 0.5), { kind: 'dot', elem: k === 'burn' ? 'fire' : 'phys', noNumber: false }); if (k === 'burn') FX.burst(a.x, 1, a.z, 0xff7020, 3, 1.5, 0.4, 0.4, { up: 1.5 }); }
      if (a.dead) return;
    }
    if (s.t <= 0) delete a.status[k];
  }
  for (const [k, b] of Object.entries(a.buffs)) { b.t -= dt; if (b.t <= 0) delete a.buffs[k]; }
  if (a.statusImmuneT > 0) a.statusImmuneT -= dt;
  if (a.inv > 0) a.inv -= dt;
}
function speedMul(a) {
  let m = 1;
  if (a.status.slow) m *= 1 - (a.status.slow.v || 0.4);
  if (a.status.freeze || a.status.shock || a.status.stun) m = 0;
  return m;
}

// ---------- death ----------
function killActor(a, src) {
  if (a.dead || a.downed) return;
  a.hp = 0;
  if (a.team === 0) {
    // party members go down and can be revived
    if (a === PL && invCount(GAME.char.inv, 'lifeCharm') > 0) { invTake(GAME.char.inv, 'lifeCharm', 1); a.hp = a.maxHp; a.inv = 3; a.blink = 3; FX.teleIn(a.x, a.z, 0xff80c0); HUD.toast('The Lifeward Charm saved you!', '#ff90d0'); AUDIO.sfx('heal'); return; }
    a.downed = true; a.state = 'down'; a.st = 0; a.act = null; a.status = {}; a.downT = 0;
    bus.emit('down', a);
    return;
  }
  a.dead = true; a.state = 'dead'; a.st = 0; a.act = null;
  if (a.tele) { FX.kill(a.tele); a.tele = null; }
  bus.emit('kill', a, src);
}
function reviveActor(a, frac = 0.5) {
  if (!a.downed) return;
  a.downed = false; a.dead = false; a.hp = Math.max(1, Math.round(a.maxHp * frac)); a.state = 'idle'; a.st = 0; a.inv = 2; a.blink = 2;
  FX.pillar(a.x, a.z, 0.8, 3, 0xa0ffc0, 0.7); FX.burst(a.x, 1, a.z, 0xa0ffc0, 16, 2, 0.8, 0.4, { up: 2 });
  AUDIO.sfx('heal', a.x, a.z);
  bus.emit('revive', a);
}

// ---------- shared movement ----------
function separateActors(dt) {
  for (let i = 0; i < ENTS.length; i++) {
    const a = ENTS[i]; if (a.dead || a.static || a.burrowed) continue;
    for (let j = i + 1; j < ENTS.length; j++) {
      const b = ENTS[j]; if (b.dead || b.static || b.burrowed || (a.fly && !b.fly) || (b.fly && !a.fly)) continue;
      const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), push = (rr - d) * 0.5, nx = dx / d, nz = dz / d;
      const wa = a.boss ? 0 : b.boss ? 1 : a.team !== b.team ? 0.5 : 0.5, wb = 1 - wa;
      if (!a.boss) { a.x -= nx * push * (b.boss ? 2 : wa * 2); a.z -= nz * push * (b.boss ? 2 : wa * 2); }
      if (!b.boss) { b.x += nx * push * (a.boss ? 2 : wb * 2); b.z += nz * push * (a.boss ? 2 : wb * 2); }
    }
  }
}
function applyKnockback(a, dt) {
  if (Math.abs(a.kbx) + Math.abs(a.kbz) < 0.01) { a.kbx = a.kbz = 0; return; }
  moveCircle(a, a.kbx * dt, a.kbz * dt, a.r);
  const d = Math.exp(-dt * 9); a.kbx *= d; a.kbz *= d;
}
function faceTo(a, x, z, rate, dt) { const y = Math.atan2(x - a.x, z - a.z); a.yaw = rate ? angTo(a.yaw, y, rate * dt) : y; }
