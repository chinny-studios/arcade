// ---- world: areas, collision, entities, interactables, doors and transitions ----
// Every area is built in its own coordinates and only the current one is visible.
// Collider shapes (all with y0/y1):
//   { t: 'box', x, z, hx, hz, ry?, y0, y1 }   oriented box
//   { t: 'cyl', x, z, r, y0, y1 }
//   { t: 'ring', x, z, r }                     keeps bodies inside a round room
const W = {
  area: null,          // current area object
  ents: [],            // live entities in the current area
  cols: [],            // colliders in the current area (static + dynamic entries pushed by entities)
  STEP: 0.42,          // highest ledge you walk up without jumping
  MAXSLOPE: 1.15,      // steepest terrain you can walk up (rise / run)
};

// ---------- collision ----------
function colTop(c, x, z, r) {
  // returns the collider's top if (x,z) with radius r stands on it, else -Infinity
  if (c.t === 'box') {
    let lx = x - c.x, lz = z - c.z;
    if (c.ry) { const cs = Math.cos(-c.ry), sn = Math.sin(-c.ry); const ax = lx * cs + lz * sn, az = -lx * sn + lz * cs; lx = ax; lz = az; }
    return (Math.abs(lx) <= c.hx + r * 0.4 && Math.abs(lz) <= c.hz + r * 0.4) ? c.y1 : -Infinity;
  }
  if (c.t === 'cyl') return Math.hypot(x - c.x, z - c.z) <= c.r + r * 0.4 ? c.y1 : -Infinity;
  return -Infinity;
}
function groundAt(x, z, y, r = 0.35) {
  let g = W.area.ground ? W.area.ground(x, z) : -50;
  for (const c of W.cols) {
    if (c.off || c.noStand) continue;
    const top = colTop(c, x, z, r);
    if (top > g && top <= y + W.STEP + 0.01) g = top;
  }
  return g;
}
// pushes a body out of walls. Returns the collider it hit last (or null)
function resolveWalls(b) {
  let hit = null;
  for (const c of W.cols) {
    if (c.off || c === b.ignore) continue;
    if (c.t === 'ring') {
      const dx = b.x - c.x, dz = b.z - c.z, d = Math.hypot(dx, dz), lim = c.r - b.r;
      if (d > lim) { b.x = c.x + dx / d * lim; b.z = c.z + dz / d * lim; hit = c; b.wallN = [-dx / d, -dz / d]; }
      continue;
    }
    if (c.y1 <= b.y + W.STEP || c.y0 >= b.y + (b.h || 1.6)) continue;
    if (c.t === 'cyl') {
      const dx = b.x - c.x, dz = b.z - c.z, d = Math.hypot(dx, dz), lim = c.r + b.r;
      if (d < lim) { const nx = d ? dx / d : 1, nz = d ? dz / d : 0; b.x = c.x + nx * lim; b.z = c.z + nz * lim; hit = c; b.wallN = [nx, nz]; }
    } else if (c.t === 'box') {
      let lx = b.x - c.x, lz = b.z - c.z;
      const cs = Math.cos(c.ry || 0), sn = Math.sin(c.ry || 0);
      if (c.ry) { const ax = lx * cs - lz * sn, az = lx * sn + lz * cs; lx = ax; lz = az; }
      const px = clamp(lx, -c.hx, c.hx), pz = clamp(lz, -c.hz, c.hz);
      let dx = lx - px, dz = lz - pz, d = Math.hypot(dx, dz);
      if (d < b.r) {
        let nx, nz;
        if (d > 1e-5) { nx = dx / d; nz = dz / d; }
        else { // centre inside the box: push out the shortest way
          const ex = c.hx - Math.abs(lx), ez = c.hz - Math.abs(lz);
          if (ex < ez) { nx = Math.sign(lx) || 1; nz = 0; d = -ex; } else { nx = 0; nz = Math.sign(lz) || 1; d = -ez; }
        }
        lx += nx * (b.r - d); lz += nz * (b.r - d);
        if (c.ry) { const ax = lx * cs + lz * sn, az = -lx * sn + lz * cs; lx = ax; lz = az; const wx = nx * cs + nz * sn, wz = -nx * sn + nz * cs; nx = wx; nz = wz; }
        b.x = c.x + lx; b.z = c.z + lz; hit = c; b.wallN = [nx, nz];
      }
    }
  }
  return hit;
}
// move a body horizontally with terrain slope limits, then resolve walls
function moveBody(b, dx, dz) {
  const g0 = W.area.ground ? W.area.ground(b.x, b.z) : -50;
  const tryMove = (nx, nz) => {
    if (W.area.ground && b.onGround) {
      const g1 = W.area.ground(nx, nz), run = Math.hypot(nx - b.x, nz - b.z) || 1e-6;
      if (g1 > b.y + W.STEP && (g1 - g0) / run > W.MAXSLOPE) return false;
    }
    b.x = nx; b.z = nz; return true;
  };
  b.wallN = null;
  if (!tryMove(b.x + dx, b.z + dz)) { if (!tryMove(b.x + dx, b.z)) tryMove(b.x, b.z + dz); b.slopeBlocked = true; } else b.slopeBlocked = false;
  return resolveWalls(b);
}
// vertical integration for a body with gravity; sets onGround
function fallBody(b, dt, grav = 22) {
  const g = groundAt(b.x, b.z, b.y, b.r);
  b.ground = g;
  if (b.y <= g + 0.001 && b.vy <= 0) {
    // snap down small steps when walking downhill
    b.y = g; b.vy = 0; b.onGround = true;
  } else if (b.onGround && b.vy <= 0 && b.y - g < 0.45) {
    b.y = g; b.vy = 0;
  } else {
    b.onGround = false;
    b.vy -= grav * dt;
    b.y += b.vy * dt;
    if (b.y <= g) { b.landSpeed = -b.vy; b.y = g; b.vy = 0; b.onGround = true; b.justLanded = true; }
    // bump head on things above
    if (b.vy > 0) for (const c of W.cols) { if (c.off || c.t === 'ring' || c.y0 <= b.y) continue; if (colTop(c, b.x, b.z, b.r) > -Infinity && b.y + (b.h || 1.6) > c.y0) { b.vy = 0; break; } }
  }
}

// ---------- entities ----------
// An entity: { x, y, z, update(dt), dead, obj (THREE.Object3D), hit?(dmg, from), r, kind }
function addEnt(e) { W.ents.push(e); if (e.obj) W.area.group.add(e.obj); if (e.col) W.cols.push(e.col); return e; }
function removeEnt(e) { e.dead = true; }
function entsOf(kind) { return W.ents.filter((e) => !e.dead && e.kind === kind); }

// ---------- areas ----------
function buildArea(a) {
  if (a.built) return;
  a.group = new THREE.Group(); a.group.name = a.id; a.group.visible = false;
  R.scene.add(a.group);
  a.build(a);
  a.built = true;
}
let transitioning = false;
function enterArea(id, at, opt = {}) {
  const a = AREAS[id];
  if (!a) throw new Error('no area ' + id);
  buildArea(a);
  if (W.area && W.area !== a) W.area.group.visible = false;
  // clear old entities
  for (const e of W.ents) { if (e.obj && e.obj.parent) e.obj.parent.remove(e.obj); if (e.destroy) e.destroy(); }
  W.ents.length = 0;
  Fader.clear();
  W.area = a; G.area = id; G.save.area = id;
  a.group.visible = true;
  W.cols = a.colliders.slice();
  for (const f of a.faders || []) Fader.list.push(f);
  for (const f of Fader.list) { f.op = 1; for (const m of f.mats) { m.opacity = 1; m.depthWrite = true; } }
  // weather / lighting / music
  applySky(a.sky === 'outdoor' ? (G.weather === 'sun' ? 'sun' : 'storm') : a.sky);
  if (a.kind === 'outdoor') camIso(true); else camFixed(a.cams);
  Hero.place(at ? at[0] : a.spawn[0], at ? at[1] : a.spawn[1], at && at[2] != null ? at[2] : (a.spawn[2] || 0));
  W.doorGrace = 0.5; W.enterT = G.t;
  for (const d of a.doors) d.inside = inBox(d.box, Hero.x, Hero.z);
  W.area.populate && W.area.populate(a);
  FX.onArea(a);
  if (a.onEnter) a.onEnter(a, opt);
  Story.music();
  updateAmbience();
  if (!opt.quiet && a.title) HUD.banner(a.title);
  G.save.x = Hero.x; G.save.z = Hero.z; G.save.ry = Hero.ry;
  if (!opt.nosave) writeSave();
}
function updateAmbience() {
  const a = W.area; if (!a) return;
  const storm = G.weather !== 'sun';
  if (a.kind === 'outdoor') Audio2.ambience(storm ? 1 : 0, storm ? 1 : 0.3, 1, false);
  else Audio2.ambience(storm && a.hearRain !== false ? 0.7 : 0, storm ? 0.5 : 0, a.id.startsWith('lh') ? 0.6 : 0, true);
}
// fade to black, switch area, fade back
function goArea(id, at, opt = {}) {
  if (transitioning) return;
  transitioning = true;
  G.lockInput++;
  if (opt.sfx !== false) Audio2.sfx('door');
  HUD.fade(1, 0.25);
  Timers.after(0.28, () => {
    enterArea(id, at, opt);
    HUD.fade(0, 0.35);
    Timers.after(0.2, () => { transitioning = false; G.lockInput = Math.max(0, G.lockInput - 1); if (opt.then) opt.then(); });
  });
}

// ---------- interactables ----------
// { x, z, y?, r, label, verb?, cond?(), fn(), mode? ('normal' to need Normal mode) }
function nearestInteract() {
  const a = W.area; if (!a) return null;
  let best = null, bd = 1e9;
  const fx = Math.sin(Hero.ry), fz = Math.cos(Hero.ry);
  const consider = (it) => {
    if (it.cond && !it.cond()) return;
    const dx = it.x - Hero.x, dz = it.z - Hero.z, d = Math.hypot(dx, dz);
    if (d > (it.r || 1.6)) return;
    if (it.y != null && Math.abs(it.y - Hero.y) > 1.6) return;
    const facing = d < 0.6 ? 1 : (dx * fx + dz * fz) / d;
    if (facing < -0.2) return;
    const score = d - facing * 0.6;
    if (score < bd) { bd = score; best = it; }
  };
  for (const it of a.interacts) consider(it);
  for (const e of W.ents) if (!e.dead && e.interact) { e.interact.x = e.x; e.interact.z = e.z; e.interact.y = e.y; consider(e.interact); }
  return best;
}

// ---------- doors and triggers (checked every step against the hero) ----------
function inBox(b, x, z) { return x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]; }
function checkDoors() {
  if (transitioning || G.lockInput) return;
  if (W.doorGrace > 0) { W.doorGrace -= STEP; return; }
  const a = W.area;
  for (const d of a.doors) {
    if (d.cond && !d.cond()) continue;
    if (d.y != null && Math.abs(Hero.y - d.y) > 1.5) continue;
    if (!inBox(d.box, Hero.x, Hero.z)) { d.inside = false; continue; }
    if (d.inside) continue;
    d.inside = true;
    const msg = d.locked && d.locked();
    if (msg) { if (typeof msg === 'string') HUD.toast(msg); continue; }
    if (d.fn) { d.fn(); continue; }
    goArea(d.to, d.at, { sfx: d.sfx });
    return;
  }
  for (const t of a.triggers) {
    if (t.done) continue;
    if (t.cond && !t.cond()) continue;
    if (t.y != null && Math.abs(Hero.y - t.y) > 2) continue;
    if (inBox(t.box, Hero.x, Hero.z)) { if (t.once !== false) t.done = true; t.fn(); }
  }
}

// helpers used by area builders
function addCol(a, c) { a.colliders.push(c); return c; }
function boxCol(a, x, z, hx, hz, y0, y1, ry = 0, extra) { return addCol(a, Object.assign({ t: 'box', x, z, hx, hz, y0, y1, ry }, extra)); }
function cylCol(a, x, z, r, y0, y1, extra) { return addCol(a, Object.assign({ t: 'cyl', x, z, r, y0, y1 }, extra)); }
