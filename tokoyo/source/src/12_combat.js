// Tokoyo — combat: damage & resistances, melee hits on mobs, trees, logs and rocks, blocking & parry, projectiles

const PHYS = ['blunt', 'slash', 'pierce'];
const DMG_COL = { blunt: '#ffffff', slash: '#ffffff', pierce: '#ffffff', fire: '#ffa040', poison: '#90e050', lightning: '#9fd8ff', true: '#ffffff' };
function sumDamage(dmg, res) {
  let t = 0, weak = false, resist = false;
  for (const k in dmg) {
    if (k === 'chop' || k === 'pick') continue;
    const r = res && res[k] != null ? res[k] : 1;
    if (r > 1) weak = true; if (r < 1) resist = true;
    t += dmg[k] * r;
  }
  return { t, weak, resist };
}
const armorReduce = (d, armor) => (armor < d / 2 ? d - armor : (d * d) / (armor * 4));

// ---------- player → world ----------
function playerMeleeHit(a) {
  const P = PLAYER, st = a.st, d = st ? ITEMS[st.id] : null;
  const dmg = st ? itemDamage(st) : { blunt: 6 };
  const skill = d ? d.skill : 'unarmed';
  const range = (d && d.range) || (d ? 2.3 : 1.7);
  const thrust = d && (d.anim === 'thrust' || d.anim === 'stab') && !a.secondary;
  const arc = thrust ? 0.55 : 1.15;
  const ox = P.pos.x, oy = P.pos.y + 1.0, oz = P.pos.z;
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  const hits = [];
  for (const m of MOBS_LIVE) {
    if (m.dead) continue;
    const dx = m.pos.x - ox, dz = m.pos.z - oz, dist = Math.hypot(dx, dz) - m.def.r * m.scale;
    if (dist > range) continue;
    const dy = m.pos.y + m.def.h * m.scale * 0.5 - oy;
    if (Math.abs(dy) > m.def.h * m.scale * 0.6 + 1.2) continue;
    const ang = Math.abs(angWrap(Math.atan2(dx, dz) - P.yaw));
    if (ang > arc + Math.atan2(m.def.r * m.scale, Math.max(0.5, dist))) continue;
    hits.push([m, dist]);
  }
  hits.sort((a, b) => a[1] - b[1]);
  const targets = thrust ? hits.slice(0, 1) : hits.slice(0, 4);
  let landed = false;
  for (const [m] of targets) {
    const f = lerp(0.5 + 0.5 * skillF(skill), 1, Math.random()) * a.mult;
    const out = {};
    for (const k in dmg) out[k] = dmg[k] * f;
    let mult = 1, crit = false;
    if (!m.aware && m.def.mood !== 'flee' && !m.def.boss) { mult = d && d.backstab ? d.backstab : 3; crit = true; HUD.msg('Sneak attack ×' + mult, 'crit'); }
    for (const k in out) out[k] *= mult;
    damageMob(m, out, { from: 'player', knock: ((d && d.knock) || 20) * (a.secondary ? 2 : 1), dirX: fx, dirZ: fz, stagger: (d && d.stagger) || 1, crit });
    landed = true;
  }
  // breakable world objects: urns, nests, bone piles
  for (const t of TARGETS.slice()) {
    const dx = t.x - ox, dz = t.z - oz, dist = Math.hypot(dx, dz) - t.r;
    if (dist > range || Math.abs(t.y + t.h * 0.5 - oy) > t.h + 1.2) continue;
    if (Math.abs(angWrap(Math.atan2(dx, dz) - P.yaw)) > arc + 0.3) continue;
    let tot = 0; for (const k in dmg) if (k !== 'chop' && k !== 'pick') tot += dmg[k]; tot += (dmg.pick || 0) + (dmg.chop || 0) * 0.5;
    t.hit(tot * a.mult); landed = true;
    if (thrust) break;
  }
  if (landed) {
    raiseSkill(skill, 1); wear(st, 1);
    CAM.shake = Math.max(CAM.shake, 0.15);
    return;
  }
  // tools: trees, logs, rocks
  if (dmg.chop) {
    let best = null, bd = 1e9;
    natQuery(ox, oz, range + 1.5, (o, kind, C) => {
      if (kind !== 'tree') return;
      const dx = o.x - ox, dz = o.z - oz, dist = Math.hypot(dx, dz) - treeRadius(o);
      if (dist > range + 0.3 || Math.abs(angWrap(Math.atan2(dx, dz) - P.yaw)) > 1.0) return;
      if (dist < bd) { bd = dist; best = [o, C]; }
    });
    let bestLog = null;
    for (const l of NAT.logs) {
      const ax = Math.cos(l.rot), az = -Math.sin(l.rot);
      const t = clamp((ox - l.x) * ax + (oz - l.z) * az, -l.len / 2, l.len / 2);
      const cx = l.x + ax * t, cz = l.z + az * t, dist = Math.hypot(cx - ox, cz - oz) - l.r;
      if (dist < range + 0.3 && dist < bd && Math.abs(angWrap(Math.atan2(cx - ox, cz - oz) - P.yaw)) < 1.1) { bd = dist; bestLog = l; }
    }
    const chop = dmg.chop * (1 + skillF('woodcutting')) * a.mult * (P.power === 'osugi' ? 1.6 : 1);
    if (bestLog) { natDamageLog(bestLog, chop); raiseSkill('woodcutting', 1); wear(st, 1); return; }
    if (best) {
      const r = natDamageTree(best[0], best[1], chop, d.tier || 0, ox, oz);
      if (r === 'tooHard') { HUD.msg('Your axe isn\'t strong enough for this tree.'); AU.play('block', best[0].x, best[0].y + 1, best[0].z, 0.6); }
      else { raiseSkill('woodcutting', 1); wear(st, 1); }
      return;
    }
  }
  if (dmg.pick) {
    let best = null, bd = 1e9;
    natQuery(ox, oz, range + 3, (o, kind, C) => {
      if (kind !== 'rock') return;
      const dx = o.x - ox, dz = o.z - oz, dist = Math.hypot(dx, dz) - rockRadius(o);
      if (dist > range + 0.5 || Math.abs(angWrap(Math.atan2(dx, dz) - P.yaw)) > 1.1) return;
      if (dist < bd) { bd = dist; best = [o, C]; }
    });
    const pick = dmg.pick * (1 + skillF('pickaxes')) * a.mult;
    if (best) {
      const r = natDamageRock(best[0], best[1], pick, d.tier || 0);
      if (r === 'tooHard') HUD.msg('Your pickaxe isn\'t strong enough.');
      else { raiseSkill('pickaxes', 1); wear(st, 1); }
      return;
    }
    // pick up stone from the terrain itself
    const ray = aimRay();
    const t = rayTerrain(ray.o, ray.d, 12);
    if (t > 0) {
      const hx = ray.o.x + ray.d.x * t, hz = ray.o.z + ray.d.z * t, hy = ray.o.y + ray.d.y * t;
      if (Math.hypot(hx - P.pos.x, hz - P.pos.z) < 3.5 && Math.abs(hy - P.pos.y) < 3) {
        editTerrain(hx, hz, 1.4, (h, k) => h - 0.4 * (1 - k * k));
        paintTerrain(hx, hz, 1.2, 1);
        refreshShoreTex(hx, hz, 4);
        FX.chips(hx, hy + 0.2, hz, 0x6b5436, 8);
        AU.play('pick', hx, hy, hz);
        if (Math.random() < 0.6) dropItems('stone', 1, hx, hy + 0.5, hz);
        raiseSkill('pickaxes', 0.5); wear(st, 1);
      }
    }
  }
}

// ---------- damage a mob ----------
function damageMob(m, dmg, o = {}) {
  if (m.dead || m.invuln > 0) return 0;
  const res = m.def.res || {};
  let { t, weak, resist } = sumDamage(dmg, res);
  if (m.staggered > 0) t *= 2;
  if (m.stars) t /= 1 + m.stars * 0.15;
  t = Math.max(t, 0);
  m.hp -= t;
  m.hurtT = 0.25;
  const hy = m.pos.y + m.def.h * m.scale * 0.8;
  FX.text(m.pos.x, hy, m.pos.z, Math.max(1, Math.round(t)), o.crit || m.staggered > 0 ? '#ff6050' : weak ? '#ffe060' : resist ? '#a0a0a0' : '#ffffff', o.crit);
  FX.blood(m.pos.x, m.pos.y + m.def.h * m.scale * 0.5, m.pos.z, m.def.undead ? COL.bone : m.type === 'osugi' || m.type === 'root' ? 0xc9a576 : m.type === 'kappa' ? 0x5f8a3a : 0x8a1a1a, 6);
  AU.play(m.def.undead ? 'bones' : 'hit', m.pos.x, m.pos.y + 1, m.pos.z);
  if (dmg.poison) m.poison = (m.poison || 0) + dmg.poison;
  if (dmg.fire && !m.def.water) m.burn = Math.max(m.burn || 0, 3);
  // knockback & stagger
  if (o.knock && !m.def.fixed) { const k = o.knock / (m.def.mass * 40); m.vel.x += (o.dirX || 0) * k; m.vel.z += (o.dirZ || 0) * k; }
  m.stag = (m.stag || 0) + t * (o.stagger || 1);
  if (m.stag > m.maxHp * (m.def.boss ? 0.15 : 0.35) && m.staggered <= 0) { mobStagger(m, 1.6); }
  if (o.from === 'player') mobAlert(m, PLAYER, true);
  if (m.hp <= 0) killMob(m, o.from === 'player');
  return t;
}
function mobStagger(m, t) { m.staggered = t; m.stag = 0; m.act = null; FX.magic(m.pos.x, m.pos.y + m.def.h * m.scale, m.pos.z, [1, 1, 0.6], 6, 1.2); }

// ---------- damage the player ----------
function damagePlayer(dmg, src, raw = false, opts = {}) {
  const P = PLAYER;
  if (!P.alive || (DEBUG && G.god)) return 0;
  if (P.invuln > 0 && !raw) { FX.text(P.pos.x, P.pos.y + 2, P.pos.z, 'dodged', '#9fd8ff'); return 0; }
  let total = 0;
  const parts = {};
  for (const k in dmg) { parts[k] = dmg[k]; total += dmg[k]; }
  if (!raw && P.block > 0 && src) {
    const ang = Math.abs(angWrap(Math.atan2(src.x - P.pos.x, src.z - P.pos.z) - P.yaw));
    if (ang < 1.6) {
      const right = P.eq.right, left = P.eq.left;
      const shield = left && ITEMS[left.id].type === 'shield' ? left : null;
      const blocker = shield || right;
      let bp = blocker ? itemBlock(blocker) : 4;
      if (blocker && broken(blocker)) bp *= 0.3;
      bp *= 1 + skillF('blocking') * 0.5;
      const parry = P.blockT < 0.25;
      const pm = blocker ? (ITEMS[blocker.id].parry || 2) : 1.5;
      if (parry && total <= bp * pm) {
        AU.play('parry', P.pos.x, P.pos.y + 1, P.pos.z);
        FX.sparks(P.pos.x + Math.sin(P.yaw) * 0.6, P.pos.y + 1.2, P.pos.z + Math.cos(P.yaw) * 0.6, 16);
        HUD.msg('Parry!', 'crit');
        raiseSkill('blocking', 1.5);
        if (src.mob) mobStagger(src.mob, src.mob.def.boss ? 1.4 : 2.2);
        wear(blocker, 0.5);
        return 0;
      }
      raiseSkill('blocking', 0.6);
      wear(blocker, 0.5);
      AU.play('block', P.pos.x, P.pos.y + 1, P.pos.z);
      FX.sparks(P.pos.x + Math.sin(P.yaw) * 0.6, P.pos.y + 1.2, P.pos.z + Math.cos(P.yaw) * 0.6, 6);
      if (total <= bp) {
        if (!useStamina(5 + total * 0.6)) { P.stagger = 1.0; HUD.msg('Guard broken!', 'bad'); total *= 0.5; }
        else { if (opts.knock) knockPlayer(src, opts.knock * 0.3); return 0; }
      } else {
        useStamina(10);
        const f = (total - bp) / total;
        for (const k in parts) parts[k] *= f;
        total -= bp;
        if (total > maxHp() * 0.25) P.stagger = 0.6;
      }
    }
  }
  // armour on physical damage
  if (!raw) {
    const armor = playerArmor();
    let phys = 0; for (const k of PHYS) if (parts[k]) phys += parts[k];
    if (phys > 0 && armor > 0) { const after = armorReduce(phys, armor), f = after / phys; for (const k of PHYS) if (parts[k]) parts[k] *= f; }
    for (const k of ['head', 'chest', 'legs', 'cape']) if (P.eq[k]) wear(P.eq[k], 0.3);
  }
  // over-time types
  if (parts.poison) { addStatus('poisoned', 10, { rate: parts.poison / 10 }); parts.poison = 0; }
  if (parts.fire) { addStatus('burning', 3, { rate: parts.fire * 0.5 / 3 }); parts.fire *= 0.5; }
  let d = 0; for (const k in parts) d += parts[k];
  if (d <= 0) return 0;
  P.hp -= d;
  P.lastHit = G.time;
  if (!raw || d >= 1) {
    FX.text(P.pos.x, P.pos.y + 2, P.pos.z, Math.round(d), '#ff6050');
    FX.blood(P.pos.x, P.pos.y + 1.2, P.pos.z);
    AU.play('hurt', P.pos.x, P.pos.y + 1, P.pos.z);
    HUD.hurt(Math.min(1, d / 20));
    CAM.shake = Math.max(CAM.shake, Math.min(0.6, d / 30));
  }
  if (opts.stagger && P.block <= 0) P.stagger = 0.8;
  if (opts.knock) knockPlayer(src, opts.knock);
  P.sit = false;
  if (P.hp <= 0) playerDie(src);
  return d;
}
function knockPlayer(src, k) {
  const P = PLAYER;
  if (!src) return;
  const dx = P.pos.x - src.x, dz = P.pos.z - src.z, l = Math.hypot(dx, dz) || 1;
  P.vel.x += dx / l * k * 0.06; P.vel.z += dz / l * k * 0.06;
  if (k > 80) { P.vel.y = Math.max(P.vel.y, 3.5); P.grounded = false; }
}

// ---------- projectiles ----------
const PROJ = [];
function projMesh(kind, extra) {
  let parts;
  switch (kind) {
    case 'arrow': parts = [P_.cyl(0.012, 0.012, 0.8, 3, 0x9ab25a, [0, 0, 0], [Math.PI / 2, 0, 0]), P_.cone(0.03, 0.09, 4, extra || 0x3e4046, [0, 0, 0.44], [Math.PI / 2, 0, 0]), P_.box(0.06, 0.005, 0.14, 0xeeeeee, [0, 0, -0.34])]; break;
    case 'rock': parts = [P_.dod(0.14, COL.stone, [0, 0, 0])]; break;
    case 'boulder': parts = [P_.dod(0.6, COL.stone2, [0, 0, 0])]; break;
    case 'poison': parts = [P_.ico(0.18, 1, 0x80e040, [0, 0, 0])]; break;
    case 'thunder': parts = [P_.ico(0.35, 1, 0x9fe8ff, [0, 0, 0], 0, [0.6, 0.6, 2])]; break;
    case 'vine': parts = [P_.cyl(0.07, 0.04, 1.4, 5, 0x5a6a2a, [0, 0, 0], [Math.PI / 2, 0, 0]), P_.cone(0.08, 0.2, 4, 0x4a7a3a, [0, 0, 0.8], [Math.PI / 2, 0, 0])]; break;
    case 'spear': parts = heldParts(extra).map((p) => Object.assign({}, p, { p: [p.p[0], p.p[2], p.p[1] - 0.8], r: [Math.PI / 2, 0, 0] })); break;
  }
  const geo = model('proj:' + kind + (extra || ''), () => buildModel(parts));
  const glow = kind === 'poison' || kind === 'thunder';
  const m = new THREE.Mesh(geo, glow ? R.mat.glow : R.mat.vc);
  m.castShadow = !glow;
  R.scene.add(m);
  return m;
}
function spawnProj(kind, x, y, z, vx, vy, vz, o) {
  const p = Object.assign({ kind, pos: new V3(x, y, z), vel: new V3(vx, vy, vz), grav: 9.8, life: 8, mesh: projMesh(kind, o.tint || o.item), stuck: 0 }, o);
  p.mesh.position.copy(p.pos);
  PROJ.push(p);
  return p;
}
function shootArrow(bow, draw) {
  const P = PLAYER, ammo = findAmmo();
  if (!ammo) return;
  const ad = ITEMS[ammo.id], bd = ITEMS[bow.id];
  const dmg = itemDamage(bow);
  for (const k in ad.dmg) dmg[k] = (dmg[k] || 0) + ad.dmg[k];
  const f = (0.35 + 0.65 * draw) * lerp(0.5 + 0.5 * skillF('bows'), 1, Math.random());
  for (const k in dmg) dmg[k] *= f;
  P.inv.remove(ammo.id, 1);
  const ray = aimRay();
  // aim at what the crosshair is on
  const far = 120;
  let tgt = _v1.copy(ray.o).addScaledVector(ray.d, far);
  const tt = rayTerrain(ray.o, ray.d, far); if (tt > 0) tgt = _v1.copy(ray.o).addScaledVector(ray.d, tt);
  const from = new V3(P.pos.x + Math.sin(P.yaw) * 0.5 - Math.cos(P.yaw) * 0.1, P.pos.y + 1.45, P.pos.z + Math.cos(P.yaw) * 0.5 + Math.sin(P.yaw) * 0.1);
  const dir = tgt.clone().sub(from).normalize();
  const spread = (1 - draw) * 0.06 + 0.004 * (1 - skillF('bows'));
  dir.x += (Math.random() - 0.5) * spread; dir.y += (Math.random() - 0.5) * spread; dir.z += (Math.random() - 0.5) * spread; dir.normalize();
  const sp = lerp(18, 55, draw);
  spawnProj('arrow', from.x, from.y, from.z, dir.x * sp, dir.y * sp, dir.z * sp, { owner: 'player', dmg, tint: { arrow_bamboo: 0x7ea74a, arrow_flint: 0x3e4046, arrow_fire: 0xd88a1e, arrow_bronze: COL.bronze }[ammo.id], fire: ad.id === 'arrow_fire', skill: 'bows', knock: 10 });
  AU.play('release', P.pos.x, P.pos.y + 1, P.pos.z);
  raiseSkill('bows', 0.25);
  wear(bow, 1);
}
function throwSpear(st) {
  const P = PLAYER;
  if (!st || !P.inv.slots.includes(st)) return;
  const ray = aimRay();
  let tgt = _v1.copy(ray.o).addScaledVector(ray.d, 60);
  const tt = rayTerrain(ray.o, ray.d, 60); if (tt > 0) tgt = _v1.copy(ray.o).addScaledVector(ray.d, tt);
  const from = new V3(P.pos.x + Math.sin(P.yaw) * 0.4, P.pos.y + 1.7, P.pos.z + Math.cos(P.yaw) * 0.4);
  const dir = tgt.clone().sub(from).normalize();
  const dmg = itemDamage(st); for (const k in dmg) dmg[k] *= 1.5;
  // take the spear out of the inventory; it lands as a drop
  const i = P.inv.slots.indexOf(st); unequip(st); P.inv.slots[i] = null;
  spawnProj('spear', from.x, from.y, from.z, dir.x * 26, dir.y * 26 + 1, dir.z * 26, { owner: 'player', dmg, item: st.id, stack: st, skill: 'spears', knock: 40 });
  AU.play('swing', P.pos.x, P.pos.y + 1, P.pos.z);
}
function updateProjectiles(dt) {
  const P = PLAYER;
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i];
    p.life -= dt;
    if (p.stuck) {
      p.stuck -= dt;
      if (p.stuck <= 0 || p.life <= 0) { R.scene.remove(p.mesh); PROJ.splice(i, 1); }
      continue;
    }
    if (p.life <= 0) { endProj(p, i, null); continue; }
    const ox = p.pos.x, oy = p.pos.y, oz = p.pos.z;
    p.vel.y -= p.grav * dt;
    p.pos.addScaledVector(p.vel, dt);
    // trail
    if (p.kind === 'poison') FX.poison(p.pos.x, p.pos.y, p.pos.z);
    if (p.kind === 'thunder') FX.magic(p.pos.x, p.pos.y, p.pos.z, [0.6, 0.9, 1], 3, 1);
    if (p.fire) FX.fire(p.pos.x, p.pos.y, p.pos.z, 0.3);
    p.mesh.position.copy(p.pos);
    if (p.kind !== 'rock' && p.kind !== 'boulder') p.mesh.lookAt(_v2.copy(p.pos).add(p.vel));
    else p.mesh.rotation.x += dt * 8;
    // hits
    let hit = null;
    if (p.owner === 'player') {
      for (const m of MOBS_LIVE) {
        if (m.dead) continue;
        const cy = m.pos.y + m.def.h * m.scale * 0.5, rr = m.def.r * m.scale + 0.15, hh = m.def.h * m.scale * 0.5 + 0.1;
        const dx = p.pos.x - m.pos.x, dz = p.pos.z - m.pos.z;
        if (dx * dx + dz * dz < rr * rr && Math.abs(p.pos.y - cy) < hh) { hit = m; break; }
      }
      if (!hit) for (const t of TARGETS) {
        const dx = p.pos.x - t.x, dz = p.pos.z - t.z;
        if (dx * dx + dz * dz < (t.r + 0.1) ** 2 && p.pos.y > t.y - 0.1 && p.pos.y < t.y + t.h + 0.1) { t.hit(sumDamage(p.dmg).t); endProj(p, i, 'mob'); hit = 'target'; break; }
      }
      if (hit === 'target') continue;
      if (hit) {
        const out = {}; for (const k in p.dmg) out[k] = p.dmg[k];
        if (p.fire) out.fire = (out.fire || 0);
        let crit = false;
        if (!hit.aware && !hit.def.boss && hit.def.mood !== 'flee') { for (const k in out) out[k] *= 3; crit = true; HUD.msg('Sneak attack ×3', 'crit'); }
        const l = Math.hypot(p.vel.x, p.vel.z) || 1;
        damageMob(hit, out, { from: 'player', knock: p.knock, dirX: p.vel.x / l, dirZ: p.vel.z / l, crit });
        raiseSkill(p.skill, 1);
        AU.play('arrowHit', p.pos.x, p.pos.y, p.pos.z);
        endProj(p, i, 'mob');
        continue;
      }
    } else if (P.alive) {
      const dx = p.pos.x - P.pos.x, dz = p.pos.z - P.pos.z;
      const rr = p.kind === 'boulder' ? 1.0 : p.kind === 'thunder' ? 0.9 : 0.45;
      if (dx * dx + dz * dz < rr * rr && p.pos.y > P.pos.y - 0.3 && p.pos.y < P.pos.y + 1.9) {
        damagePlayer(p.dmg, { x: ox, z: oz, mob: p.src }, false, { knock: p.knock || 20, stagger: p.kind === 'boulder' });
        if (p.kind === 'thunder') AU.play('zap', p.pos.x, p.pos.y, p.pos.z);
        endProj(p, i, 'player');
        continue;
      }
    }
    // pieces
    const seg = _v3.set(p.pos.x - ox, p.pos.y - oy, p.pos.z - oz);
    const sl = seg.length();
    if (sl > 0) {
      const hb = BUILD.raycast(_v4.set(ox, oy, oz), seg.clone().divideScalar(sl), sl, false);
      if (hb) {
        p.pos.set(ox, oy, oz).addScaledVector(seg, hb.t / sl);
        p.mesh.position.copy(p.pos);
        if (p.owner !== 'player') BUILD.damagePiece(hb.piece, sumDamage(p.dmg).t * (p.kind === 'boulder' ? 2 : 0.5));
        endProj(p, i, 'piece');
        continue;
      }
    }
    // ground & water
    const g = heightAt(p.pos.x, p.pos.z);
    if (p.pos.y <= g) { p.pos.y = g + 0.02; endProj(p, i, 'ground'); continue; }
    if (p.pos.y < 0 && oy >= 0) FX.splash(p.pos.x, p.pos.z, 6);
  }
}
function endProj(p, i, what) {
  if (p.kind === 'spear') {
    R.scene.remove(p.mesh); PROJ.splice(i, 1);
    const y = Math.max(heightAt(p.pos.x, p.pos.z), p.pos.y - 0.3);
    const d = dropStack(p.stack, p.pos.x, y + 0.3, p.pos.z); d.noPick = 0.5; d.vx = d.vz = 0; d.vy = 0;
    return;
  }
  if (p.kind === 'boulder' || p.kind === 'rock') {
    FX.dust(p.pos.x, p.pos.y, p.pos.z, p.kind === 'boulder' ? 10 : 3);
    if (p.kind === 'boulder') { AU.play('thud', p.pos.x, p.pos.y, p.pos.z); CAM.shake = Math.max(CAM.shake, 0.3); }
    R.scene.remove(p.mesh); PROJ.splice(i, 1); return;
  }
  if (p.kind === 'poison') {
    FX.magic(p.pos.x, p.pos.y, p.pos.z, [0.4, 0.85, 0.2], 14, 2);
    const P = PLAYER; if (what !== 'player' && P.alive && P.pos.distanceTo(p.pos) < 2.2) damagePlayer({ poison: p.dmg.poison * 0.6 }, null, true);
    R.scene.remove(p.mesh); PROJ.splice(i, 1); return;
  }
  if (p.kind === 'thunder' || p.kind === 'vine') { FX.magic(p.pos.x, p.pos.y, p.pos.z, p.kind === 'thunder' ? [0.6, 0.9, 1] : [0.4, 0.6, 0.2], 12, 3); R.scene.remove(p.mesh); PROJ.splice(i, 1); return; }
  if (what === 'mob' || what === 'player') { R.scene.remove(p.mesh); PROJ.splice(i, 1); return; }
  // arrows stick into the ground or wood
  p.stuck = 6; p.vel.set(0, 0, 0);
  if (p.fire) FX.fire(p.pos.x, p.pos.y, p.pos.z, 0.5);
  AU.play('arrowHit', p.pos.x, p.pos.y, p.pos.z, 0.5);
}
