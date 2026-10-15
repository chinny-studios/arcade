// Farhold — inventories, currency, crafting, refining, technology and recharging

class Inv {
  constructor(size, mul = 1, name = '') { this.size = size; this.mul = mul; this.name = name; this.slots = new Array(size).fill(null); }
  stackOf(id) { return ITEMS[id].stack * this.mul; }
  grow(n) { this.size += n; while (this.slots.length < this.size) this.slots.push(null); }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.n; return n; }
  space(id) { const st = this.stackOf(id); let n = 0; for (const s of this.slots) { if (!s) n += st; else if (s.id === id) n += st - s.n; } return n; }
  add(id, n) {
    const st = this.stackOf(id);
    for (const s of this.slots) if (s && s.id === id && s.n < st && n > 0) { const k = Math.min(n, st - s.n); s.n += k; n -= k; }
    for (let i = 0; i < this.slots.length && n > 0; i++) if (!this.slots[i]) { const k = Math.min(n, st); this.slots[i] = { id, n: k }; n -= k; }
    return n;
  }
  take(id, n) {
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) { const s = this.slots[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) this.slots[i] = null; } }
    return n;
  }
  sort() { const l = this.slots.filter(Boolean).sort((a, b) => (ITEMS[a.id].cat + a.id).localeCompare(ITEMS[b.id].cat + b.id)); this.slots = l.concat(new Array(this.size - l.length).fill(null)); }
  toJSON() { return { size: this.size, slots: this.slots }; }
  load(o) { if (!o) return; this.size = o.size; this.slots = o.slots.slice(0, o.size); while (this.slots.length < this.size) this.slots.push(null); }
}

const PLAYER = {
  units: 0, nanites: 0, alive: true,
  suit: new Inv(24, 1, 'Exosuit'),
  stats: { life: 100, haz: 100, shield: 100, hp: 100, jet: 100, stam: 100 },
  tech: {},
  name: 'Traveller',
};
// accessible inventories: the exosuit, plus starship cargo when the ship is in reach
function shipInReach() { return SHIP.cur && (PLAYER.inShip || (PLAYER.frame === SHIP.frame && PLAYER.pos.distanceTo(SHIP.pos) < 200)); }
const INV = {
  list() { const l = [PLAYER.suit]; if (shipInReach()) l.push(SHIP.cur.cargo); return l; },
  count(id) { let n = 0; for (const i of this.list()) n += i.count(id); return n; },
  has(id, n) { return this.count(id) >= n; },
  hasAll(req) { for (const k in req) if (!this.has(k, req[k])) return false; return true; },
  take(id, n) { for (const i of this.list()) { n = i.take(id, n); if (n <= 0) break; } return n <= 0; },
  takeAll(req) { if (!this.hasAll(req)) return false; for (const k in req) this.take(k, req[k]); return true; },
  space(id) { let n = 0; for (const i of this.list()) n += i.space(id); return n; },
};
function giveItem(id, n, quiet) {
  if (id === 'units') { PLAYER.units += n; if (!quiet) HUD.pickup('units', n); return 0; }
  if (id === 'nanites') { PLAYER.nanites += n; if (!quiet) HUD.pickup('nanites', n); return 0; }
  let left = PLAYER.suit.add(id, n);
  if (left > 0 && shipInReach()) left = SHIP.cur.cargo.add(id, left);
  const got = n - left;
  if (got > 0) { HUD.pickup(id, got); bus.emit('gotItem', id, got); }
  if (left > 0) HUD.msg('Inventory full — ' + left + ' ' + ITEMS[id].name + ' lost.', 'bad');
  return left;
}

// ---------- technology ----------
function techInit() {
  PLAYER.tech = {};
  for (const id in TECH) { const t = TECH[id]; if (t.base) PLAYER.tech[id] = { built: true, broken: !!t.broken }; }
}
const hasTech = (id) => { const t = PLAYER.tech[id]; return !!(t && t.built && !t.broken); };
function techFx(k) { let m = 1; for (const id in PLAYER.tech) { const t = TECH[id]; if (t.fx && t.fx[k] && hasTech(id)) m *= t.fx[k]; } return m; }
function repairTech(id) {
  const t = TECH[id], st = PLAYER.tech[id];
  if (!st || !st.broken) return false;
  if (!INV.takeAll(t.repair)) { HUD.msg('Missing materials to repair ' + t.name + '.', 'bad'); AU.sfx('deny'); return false; }
  st.broken = false;
  AU.sfx('craft');
  HUD.msg(t.name + ' repaired.', 'good');
  bus.emit('techRepaired', id);
  return true;
}
function buildTech(id) {
  const t = TECH[id];
  if (PLAYER.tech[id] && PLAYER.tech[id].built) return false;
  if (t.req && !hasTech(t.req)) { HUD.msg('Requires ' + TECH[t.req].name + '.', 'bad'); return false; }
  if (!PLAYER.known.has(id)) { HUD.msg('Blueprint not known.', 'bad'); return false; }
  if (!INV.takeAll(t.cost)) { HUD.msg('Missing materials for ' + t.name + '.', 'bad'); AU.sfx('deny'); return false; }
  PLAYER.tech[id] = { built: true, broken: false };
  AU.sfx('craft');
  HUD.msg(t.name + ' installed.', 'good');
  bus.emit('techBuilt', id);
  return true;
}

// ---------- crafting ----------
function canCraft(rec, times = 1) { for (const k in rec.in) if (!INV.has(k, rec.in[k] * times)) return false; return true; }
function craft(out, times = 1) {
  const rec = RECIPES.find((r) => r.out === out);
  if (!rec) return false;
  let made = 0;
  for (let i = 0; i < times; i++) {
    if (!canCraft(rec)) break;
    if (PLAYER.suit.space(out) + (shipInReach() ? SHIP.cur.cargo.space(out) : 0) < rec.n) { HUD.msg('No room for ' + ITEMS[out].name + '.', 'bad'); break; }
    for (const k in rec.in) INV.take(k, rec.in[k]);
    giveItem(out, rec.n, true);
    made++;
  }
  if (made) { AU.sfx('craft'); HUD.msg('Crafted ' + (made * rec.n > 1 ? made * rec.n + ' × ' : '') + ITEMS[out].name + '.', 'good'); bus.emit('crafted', out, made * rec.n); }
  else if (!made) AU.sfx('deny');
  return made > 0;
}

// ---------- refining ----------
// A refiner: { input: {id,n}, output: {id,n}, t (progress seconds), speed (s per batch) }
function refinerRecipe(id) { return REFINE.find((r) => r.in === id); }
function makeRefiner(speed = 0.35) { return { input: null, output: null, t: 0, speed }; }
function refinerTick(rf, dt) {
  if (!rf.input) return;
  const rec = refinerRecipe(rf.input.id);
  if (!rec || rf.input.n < rec.a) return;
  if (rf.output && rf.output.id !== rec.out) return;
  rf.t += dt;
  while (rf.t >= rf.speed && rf.input && rf.input.n >= rec.a) {
    rf.t -= rf.speed;
    rf.input.n -= rec.a;
    if (rec.rate == null || Math.random() < rec.rate || rec.out !== 'gold') { if (!rf.output) rf.output = { id: rec.out, n: 0 }; rf.output.n += rec.b; }
    if (rf.input.n < rec.a) { if (rf.input.n <= 0) rf.input = null; break; }
  }
}

// ---------- recharging ----------
// Each gauge lists items in the order they are spent and how many % each restores.
const RECHARGE = {
  life: { name: 'Life Support', items: [['oxygen', 1], ['lifegel', 100]], get: () => PLAYER.stats.life, set: (v) => { PLAYER.stats.life = v; } },
  haz: { name: 'Hazard Protection', items: [['sodium', 1], ['sodnit', 2], ['ioncell', 50]], get: () => PLAYER.stats.haz, set: (v) => { PLAYER.stats.haz = v; } },
  shield: { name: 'Exosuit Shield', items: [['shieldcell', 100], ['sodium', 0.5]], get: () => PLAYER.stats.shield / maxShield() * 100, set: (v) => { PLAYER.stats.shield = v / 100 * maxShield(); } },
  lift: { name: 'Lift Thrusters', items: [['dihydro', 1], ['jelly', 50], ['liftfuel', 100], ['uranium', 1.5]], get: () => SHIP.cur ? SHIP.cur.lift : 0, set: (v) => { SHIP.cur.lift = v; }, ship: true },
  pulse: { name: 'Pulse Drive', items: [['tritium', 1], ['uranium', 2]], get: () => SHIP.cur ? SHIP.cur.pulse : 0, set: (v) => { SHIP.cur.pulse = v; }, ship: true },
  dshield: { name: 'Deflector Shield', items: [['sodium', 1], ['sodnit', 2]], get: () => SHIP.cur ? SHIP.cur.shield / shipMaxShield() * 100 : 0, set: (v) => { SHIP.cur.shield = v / 100 * shipMaxShield(); }, ship: true },
};
function recharge(kind, onlyItem) {
  const R_ = RECHARGE[kind];
  if (R_.ship && !SHIP.cur) return false;
  let v = R_.get();
  if (v >= 99.5) { HUD.msg(R_.name + ' is full.'); return false; }
  let used = false;
  for (const [id, per] of R_.items) {
    if (onlyItem && id !== onlyItem) continue;
    while (v < 99.5 && INV.has(id, 1)) {
      const need = Math.ceil((100 - v) / per);
      const have = INV.count(id);
      const k = Math.max(1, Math.min(need, have, per >= 50 ? 1 : need));
      INV.take(id, k); v = Math.min(100, v + k * per); used = true;
    }
    if (v >= 99.5) break;
  }
  if (used) { R_.set(v); AU.sfx('recharge'); HUD.msg(R_.name + ' recharged to ' + Math.round(v) + '%.', 'good'); bus.emit('recharged', kind); return true; }
  HUD.msg('Nothing to recharge ' + R_.name + ' with.', 'bad'); AU.sfx('deny');
  return false;
}
const maxShield = () => 100 * techFx('shield');
// market value of an item in the current system
function priceOf(id, selling) {
  const it = ITEMS[id], S = SYS.cur;
  let v = it.val;
  if (S) {
    const E = ECONOMIES[S.economy];
    v *= selling ? E.sell : E.buy;
    if (E.favour.includes(id)) v *= selling ? 1.25 : 0.85;
    v *= 0.9 + S.wealth * 0.07;
  }
  return Math.max(1, Math.round(v * (selling ? 0.92 : 1.15)));
}
