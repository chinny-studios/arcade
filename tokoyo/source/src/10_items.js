// Tokoyo — inventory, item stats, drops in the world, crafting & upgrades, food, skills

class Inventory {
  constructor(w, h) { this.w = w; this.h = h; this.slots = new Array(w * h).fill(null); }
  get size() { return this.slots.length; }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.n; return n; }
  has(req) { for (const k in req) if (this.count(k) < req[k]) return false; return true; }
  // add n of id; returns how many didn't fit
  add(id, n = 1, q = 1, dur = null, extra = null) {
    const def = ITEMS[id]; if (!def) return n;
    if (def.stack > 1) for (const s of this.slots) {
      if (n <= 0) break;
      if (s && s.id === id && s.n < def.stack) { const k = Math.min(n, def.stack - s.n); s.n += k; n -= k; }
    }
    for (let i = 0; i < this.slots.length && n > 0; i++) {
      if (this.slots[i]) continue;
      const k = Math.min(n, def.stack);
      this.slots[i] = newStack(id, k, q, dur, extra); n -= k;
    }
    return n;
  }
  addStack(st) { // keep quality/durability; returns leftover stack or null
    const left = this.add(st.id, st.n, st.q, st.dur, st);
    if (left <= 0) return null;
    return Object.assign({}, st, { n: left });
  }
  room(id, n = 1) {
    const def = ITEMS[id]; let free = 0;
    for (const s of this.slots) { if (!s) free += def.stack; else if (s.id === id && def.stack > 1) free += def.stack - s.n; if (free >= n) return true; }
    return free >= n;
  }
  remove(id, n = 1) {
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id && !s.eq) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) this.slots[i] = null; }
    }
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) { if (s.eq) unequip(s); this.slots[i] = null; } }
    }
    return n <= 0;
  }
  take(req) { for (const k in req) this.remove(k, req[k]); }
  weight() { let w = 0; for (const s of this.slots) if (s) w += (ITEMS[s.id].weight || 0) * s.n; return w; }
  firstFree() { return this.slots.indexOf(null); }
  toJSON() { return { w: this.w, h: this.h, s: this.slots.map((s) => s && { id: s.id, n: s.n, q: s.q, d: s.dur, e: s.eq ? 1 : 0, x: s.x || undefined }) }; }
  static from(o) {
    const inv = new Inventory(o.w, o.h);
    o.s.forEach((s, i) => { if (s && ITEMS[s.id]) { inv.slots[i] = newStack(s.id, s.n, s.q, s.d); if (s.e) inv.slots[i].eq = true; if (s.x) inv.slots[i].x = s.x; } });
    return inv;
  }
}
function newStack(id, n, q = 1, dur = null, extra = null) {
  const def = ITEMS[id];
  const s = { id, n, q: q || 1 };
  if (def.dur) s.dur = dur == null ? maxDur(id, s.q) : dur;
  if (extra && extra.x) s.x = extra.x;
  return s;
}
const maxDur = (id, q) => { const d = ITEMS[id]; return d.dur ? d.dur + (d.dur * 0.5) * ((q || 1) - 1) : 0; };
function itemDamage(st) {
  const d = ITEMS[st.id], out = {};
  for (const k in d.dmg || {}) out[k] = d.dmg[k] + ((d.per && d.per[k]) || 0) * ((st.q || 1) - 1);
  return out;
}
function itemArmor(st) { const d = ITEMS[st.id]; return d.armor + (d.per || 0) * ((st.q || 1) - 1); }
function itemBlock(st) { const d = ITEMS[st.id]; if (d.type === 'shield') return d.block + (d.perBlock || 0) * ((st.q || 1) - 1); return d.block || 0; }
function itemName(st) { const d = ITEMS[st.id]; return d.name + (d.maxQ > 1 && st.q > 1 ? ' ★' + st.q : ''); }

// ---------- equipping ----------
function equipSlotOf(id) {
  const d = ITEMS[id];
  if (d.type === 'weapon' || d.type === 'tool') return d.id === 'torch' ? 'left' : 'right';
  if (d.type === 'shield') return 'left';
  if (d.type === 'armor') return d.slot;
  if (d.type === 'ammo') return 'ammo';
  return null;
}
function equip(st) {
  const slot = equipSlotOf(st.id); if (!slot) return;
  const eq = PLAYER.eq;
  if (eq[slot] === st) { unequip(st); return; }
  if (eq[slot]) unequip(eq[slot]);
  const d = ITEMS[st.id];
  if (slot === 'right' && d.hands === 2 && eq.left) unequip(eq.left);
  if (slot === 'left' && eq.right && ITEMS[eq.right.id].hands === 2) unequip(eq.right);
  eq[slot] = st; st.eq = true;
  AU.play('pickup');
  bus.emit('equip');
}
function unequip(st) {
  const eq = PLAYER.eq;
  for (const k in eq) if (eq[k] === st) eq[k] = null;
  st.eq = false;
  bus.emit('equip');
}
function useItem(st) {
  const d = ITEMS[st.id];
  if (d.type === 'food') return eatFood(st);
  if (d.type === 'potion') return drinkPotion(st);
  if (d.type === 'trophy' && (st.id === 'shirokiba_trophy' || st.id === 'osugi_trophy')) { HUD.msg('Offer it at the spirit shrine.'); return; }
  if (equipSlotOf(st.id)) equip(st);
}

// ---------- food ----------
function foodValue(f) { const k = Math.min(1, (2 * f.t) / f.dur); return 0.35 + 0.65 * k; }
function canEat(id) {
  const P = PLAYER, ex = P.food.find((f) => f.id === id);
  if (ex) return ex.t < ex.dur * 0.25 ? ex : false;
  if (P.food.length < 3) return true;
  let w = null; for (const f of P.food) if (f.t < f.dur * 0.25 && (!w || f.t < w.t)) w = f;
  return w || false;
}
function eatFood(st) {
  const d = ITEMS[st.id], P = PLAYER;
  const ok = canEat(st.id);
  if (!ok) { HUD.msg(P.food.find((f) => f.id === st.id) ? 'You have eaten that recently.' : 'You are too full to eat more.'); return; }
  if (ok !== true) P.food.splice(P.food.indexOf(ok), 1);
  P.food.push({ id: st.id, t: d.food.dur, dur: d.food.dur, hp: d.food.hp, st: d.food.st, regen: d.food.regen });
  P.inv.remove(st.id, 1);
  P.hp = Math.min(P.hp + 5, maxHp()); P.st = Math.min(P.st + d.food.st * 0.3, maxSt());
  AU.play('eat');
  HUD.msg('You ate ' + d.name + '.');
}
function drinkPotion(st) {
  const d = ITEMS[st.id], P = PLAYER;
  if (P.potionCd > 0) { HUD.msg('Wait ' + Math.ceil(P.potionCd) + ' s before another.'); return; }
  P.inv.remove(st.id, 1);
  P.potionCd = d.potion.cd;
  addStatus('healing', d.potion.time, { rate: d.potion.heal / d.potion.time });
  AU.play('drink');
}
function maxHp() { let v = BASE_HP; for (const f of PLAYER.food) v += f.hp * foodValue(f); return v; }
function maxSt() { let v = BASE_ST; for (const f of PLAYER.food) v += f.st * foodValue(f); return v; }

// ---------- skills ----------
const skillNeed = (lv) => Math.pow(lv + 1, 1.5) * 0.5 + 0.5;
function skillLv(id) { return (PLAYER.skills[id] && PLAYER.skills[id].lv) || 0; }
function skillF(id) { return skillLv(id) / 100; }
function raiseSkill(id, amt = 1) {
  const P = PLAYER;
  const s = P.skills[id] || (P.skills[id] = { lv: 0, xp: 0 });
  if (s.lv >= 100) return;
  s.xp += amt * (hasStatus('rested') ? 1.5 : 1);
  while (s.xp >= skillNeed(Math.floor(s.lv)) && s.lv < 100) {
    s.xp -= skillNeed(Math.floor(s.lv)); s.lv = Math.floor(s.lv) + 1;
    HUD.msg('Skill improved: ' + SKILLS[id] + ' ' + s.lv, 'skill');
    AU.play('skill');
  }
}

// ---------- world drops ----------
const DROPS = [];
function dropItems(id, n, x, y, z, q = 1, dur = null, thrown = false) {
  if (!ITEMS[id] || n <= 0) return;
  const def = ITEMS[id];
  while (n > 0) {
    const k = Math.min(n, def.stack);
    const st = newStack(id, k, q, dur);
    dropStack(st, x, y, z, thrown);
    n -= k;
  }
}
function dropStack(st, x, y, z, thrown = false) {
  const mesh = new THREE.Mesh(itemGeo(st.id), R.mat.vc);
  mesh.castShadow = true;
  mesh.position.set(x, y, z);
  R.scene.add(mesh);
  const a = Math.random() * TAU, sp = thrown ? 2.5 : 1.2 + Math.random();
  const dr = { st, x, y, z, vx: Math.cos(a) * sp, vy: 3 + Math.random() * 2, vz: Math.sin(a) * sp, mesh, rest: false, t: 0, noPick: thrown ? 1.5 : 0.4, rot: Math.random() * TAU };
  if (thrown) { dr.vx = Math.sin(CAM.yaw + Math.PI) * -3; dr.vz = Math.cos(CAM.yaw + Math.PI) * -3; }
  DROPS.push(dr);
  if (DROPS.length > 400) removeDrop(DROPS[0]);
  return dr;
}
function removeDrop(d) { R.scene.remove(d.mesh); const i = DROPS.indexOf(d); if (i >= 0) DROPS.splice(i, 1); }
function groundY(x, z, y) {
  // the highest surface under (x, y, z): terrain or a building piece
  let g = Math.max(heightAt(x, z), -50);
  const b = BUILD.surfaceBelow(x, y + 0.3, z);
  if (b != null && b > g) g = b;
  return g;
}
function updateDrops(dt) {
  const P = PLAYER;
  for (let i = DROPS.length - 1; i >= 0; i--) {
    const d = DROPS[i];
    d.t += dt; d.noPick -= dt;
    if (!d.rest) {
      d.vy -= 18 * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      const g = groundY(d.x, d.z, d.y);
      const wl = (ITEMS[d.st.id].weight || 1) < 3 && d.y < 0.3 && g < -0.2;
      if (wl) { d.y = waveH(d.x, d.z) - 0.05; d.vy = 0; d.vx *= 0.95; d.vz *= 0.95; d.float = true; }
      else if (d.y <= g) { d.y = g; d.vy = Math.abs(d.vy) > 2 ? -d.vy * 0.3 : 0; d.vx *= 0.5; d.vz *= 0.5; if (Math.abs(d.vy) < 0.5 && Math.hypot(d.vx, d.vz) < 0.3) d.rest = true; }
    } else if (d.t % 1 < dt) {
      // re-settle if the ground moved (dug, piece removed)
      const g = groundY(d.x, d.z, d.y + 0.2);
      if (g < d.y - 0.05) d.rest = false;
    }
    if (d.float) d.y = waveH(d.x, d.z) - 0.05;
    d.rot += dt * 1.2;
    d.mesh.position.set(d.x, d.y + 0.1 + (d.rest ? Math.sin(d.t * 2) * 0.03 : 0), d.z);
    d.mesh.rotation.y = d.rot;
    // auto pickup
    if (P.alive && d.noPick <= 0 && !d.st.x) {
      const dx = d.x - P.pos.x, dy = d.y - P.pos.y - 0.6, dz = d.z - P.pos.z;
      if (dx * dx + dz * dz < 2.2 * 2.2 && Math.abs(dy) < 2) {
        if (P.inv.room(d.st.id, d.st.n) || P.inv.room(d.st.id, 1)) {
          // pull in, then take
          const dd = Math.hypot(dx, dz);
          if (dd > 0.5) { d.x -= dx / dd * dt * 8; d.z -= dz / dd * dt * 8; d.rest = false; d.vy = Math.max(d.vy, 0); }
          else pickDrop(d);
        }
      }
    }
  }
}
function pickDrop(d) {
  const P = PLAYER;
  const left = P.inv.addStack(d.st);
  const got = d.st.n - (left ? left.n : 0);
  if (got > 0) { HUD.pickup(d.st.id, got); AU.play('pickup'); bus.emit('got', d.st.id, got); }
  if (left) d.st = left; else removeDrop(d);
}

// ---------- crafting ----------
function recipeFor(id) { return RECIPES.find((r) => r.id === id); }
// station levels available at the player: { workbench: 2, forge: 1, ... }
function stationLevels(x, z, y) { return BUILD.stationsAt(x, z, y); }
function canCraft(r, levels, inv = PLAYER.inv) {
  if (r.st && (levels[r.st] || 0) < r.lv) return false;
  return inv.has(r.req);
}
function craft(r, levels) {
  const P = PLAYER;
  if (!canCraft(r, levels)) return false;
  if (!P.inv.room(r.id, r.n)) { HUD.msg('Your inventory is full.'); return false; }
  P.inv.take(r.req);
  P.inv.add(r.id, r.n);
  AU.play('craft');
  HUD.pickup(r.id, r.n);
  bus.emit('crafted', r.id);
  return true;
}
function upgradeCost(r, q) { const o = {}; for (const k in r.req) o[k] = Math.max(1, Math.ceil(r.req[k] / 2)); return o; }
function canUpgrade(st, levels) {
  const r = recipeFor(st.id), d = ITEMS[st.id];
  if (!r || !(d.maxQ > 1) || st.q >= d.maxQ) return false;
  if (r.st && (levels[r.st] || 0) < r.lv + st.q) return false;
  if (!r.st && (levels.workbench || 0) < st.q) return false;
  return PLAYER.inv.has(upgradeCost(r, st.q));
}
function upgrade(st, levels) {
  if (!canUpgrade(st, levels)) return false;
  const r = recipeFor(st.id);
  PLAYER.inv.take(upgradeCost(r, st.q));
  st.q++; if (ITEMS[st.id].dur) st.dur = maxDur(st.id, st.q);
  AU.play('craft');
  HUD.msg(ITEMS[st.id].name + ' upgraded to quality ' + st.q + '.');
  bus.emit('equip');
  return true;
}
function repairAll(station) {
  let n = 0;
  for (const s of PLAYER.inv.slots) {
    if (!s || !ITEMS[s.id].dur) continue;
    const r = recipeFor(s.id), st = r ? (r.st || 'workbench') : 'workbench';
    if (st !== station) continue;
    const m = maxDur(s.id, s.q);
    if (s.dur < m) { s.dur = m; n++; }
  }
  if (n) { AU.play('craft'); HUD.msg('Repaired ' + n + ' item' + (n > 1 ? 's' : '') + '.'); }
  else HUD.msg('Nothing here needs repair.');
}
function wear(st, amt = 1) {
  if (!st || !ITEMS[st.id].dur) return;
  st.dur = Math.max(0, st.dur - amt);
  if (st.dur <= 0 && st.id === 'torch') { HUD.msg('Your torch burned out.'); removeStack(st); }
}
const broken = (st) => st && ITEMS[st.id].dur && st.dur <= 0;
