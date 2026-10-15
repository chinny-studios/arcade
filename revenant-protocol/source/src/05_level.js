// Revenant Protocol — level engine: ASCII sector maps with floor/ceiling heights, doors, lifts, force fields,
// moving platforms, collision, ray tracing and pathfinding fields.
//
// A level is an ASCII grid (one char = one 2 m cell) plus a legend. Each legend entry describes a sector:
//   f/c floor & ceiling height, fl/cl/w floor/ceiling/wall textures, s riser texture (when this cell is higher than
//   its neighbour), u upper texture (when its ceiling is lower), l light 0..1, sky, liq ('water'|'sludge'|'lava'),
//   sink, dmg, gas, ice, kill, door (true|'r'|'b'|'y'), lift [stops], field, id, secret, tag, x (inherit from char).
// Upper-case letters and anything listed in `things` place an actor/item; the cell copies its neighbour's sector.

const CELL_DEF = { f: 0, c: 4, fl: 'floor', cl: 'ceil', w: 'panel', s: null, u: null, l: 0.8, sink: 0 };
const NO_INHERIT = ['door', 'lift', 'field', 'id', 'tag', 'secret', 'locked', 'mode', 'speed', 'start', 'wait', 'auto', 'dt'];
const OOB = { solid: true, d: { solid: true }, x: -1, z: -1 };
const SCROLL = { water: [0.04, 0.09], sludge: [0.02, 0.04], lava: [0.015, 0.03] };
const SINK = { water: 0.55, sludge: 0.6, lava: 0.35 };
let LV = null;

const THING_DEFAULTS = {
  P: 'start', T: 'trooper', O: 'officer', C: 'raider', B: 'brute', H: 'hunter', S: 'seeker', I: 'orb', U: 'turret',
  R: 'rev1', M: 'rev2', Z: 'boss', G: 'maw',
  E: 'energy', W: 'power', K: 'shield', V: 'medkit', A: 'battery', D: 'thermal', N: 'mines', Q: 'mortar', L: 'plasma', X: 'missile',
};

function parseLevel(def) {
  const rows = def.map.replace(/^\s*\n/, '').replace(/\n\s*$/, '').split('\n');
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const things = Object.assign({}, THING_DEFAULTS, def.things || {});
  const legend = Object.assign({ '#': null, ' ': null }, def.legend);
  const base = Object.assign({}, CELL_DEF, def.base || {});
  const resolved = {};
  const resolve = (ch) => {
    if (resolved[ch]) return resolved[ch];
    if (!(ch in legend)) throw new Error('legend has no entry for "' + ch + '"');
    const e = legend[ch];
    let r;
    if (e === null || e.solid) r = Object.assign({ solid: true }, e || {});
    else {
      const b = Object.assign({}, e.x ? resolve(e.x) : base);
      if (e.x) for (const k of NO_INHERIT) delete b[k];
      r = Object.assign(b, e); delete r.x;
      if (r.liq && r.sink === 0 && e.sink === undefined) r.sink = SINK[r.liq];
      if (r.liq === 'lava' && r.dmg === undefined) r.dmg = 25;
      if (r.lift) r.f = Math.min(...r.lift);
      r.ch = ch;
    }
    return (resolved[ch] = r);
  };
  const charAt = (i, j) => (j >= 0 && j < h && i >= 0 && i < rows[j].length ? rows[j][i] : '#');
  const isThing = (ch) => ch in things && !(ch in legend);
  const L = { def, w, h, cells: new Array(w * h), groups: [], things: [], plats: [], flowG: null, flowA: null, flowCell: -1, flowT: 0, switches: [] };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let ch = charAt(i, j);
    if (isThing(ch)) {
      const t = things[ch];
      L.things.push(Object.assign({ ch }, typeof t === 'string' ? { t } : t, { i, j, x: (i + 0.5) * CELL, z: (j + 0.5) * CELL }));
      // a thing stands in the sector of a neighbouring open cell
      let g = null;
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-2, 0], [2, 0]]) {
        const n = charAt(i + di, j + dj);
        if (!isThing(n) && !resolve(n).solid && !resolve(n).door && !resolve(n).lift) { g = n; break; }
      }
      if (!g) throw new Error('thing "' + ch + '" at ' + i + ',' + j + ' has no open neighbour');
      ch = g;
    }
    const d = resolve(ch);
    L.cells[j * w + i] = d.solid ? { solid: true, d, x: i, z: j, ch } : { solid: false, d, x: i, z: j, ch, door: null, lift: null, field: null, seen: false, found: false };
  }
  // Group connected cells that share a char into doors, lifts and fields.
  const seen = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const c = L.cells[k];
    if (c.solid || seen[k] || !(c.d.door || c.d.lift || c.d.field)) continue;
    const cells = [], q = [k]; seen[k] = 1;
    while (q.length) {
      const m = q.pop(), cm = L.cells[m]; cells.push(cm);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const i = cm.x + di, j = cm.z + dj;
        if (i < 0 || j < 0 || i >= w || j >= h) continue;
        const n = j * w + i;
        if (!seen[n] && L.cells[n].ch === c.ch) { seen[n] = 1; q.push(n); }
      }
    }
    const d = c.d;
    let g;
    if (d.door) g = { type: 'door', key: d.door === true ? null : d.door, f: d.f, c: d.c, open: 0, target: 0, hold: 0, locked: !!d.locked, auto: !!d.auto, secret: !!d.secret };
    else if (d.lift) g = { type: 'lift', stops: d.lift, idx: d.start || 0, mode: d.mode || 'toggle', speed: d.speed || 2.6, wait: d.wait || 2.5, timer: 0, locked: !!d.locked };
    else g = { type: 'field', on: true };
    if (g.type === 'lift') { g.cur = g.stops[g.idx]; g.target = g.idx; }
    Object.assign(g, { id: d.id || null, cells, meshes: [], d });
    for (const cc of cells) cc[g.type] = g;
    L.groups.push(g);
  }
  for (const p of def.plats || []) {
    const pl = Object.assign({ speed: 2, wait: 1.5, t: 0, seg: 0, dir: 1, hold: 0, dx: 0, dz: 0, thick: 0.5 }, p);
    pl.pts = p.path.map(([i, j]) => [i * CELL, j * CELL]);
    pl.ox = pl.pts[0][0]; pl.oz = pl.pts[0][1];
    L.plats.push(pl);
  }
  return L;
}

// ---------- queries ----------
function cellIJ(i, j) { return i < 0 || j < 0 || i >= LV.w || j >= LV.h ? OOB : LV.cells[j * LV.w + i]; }
function cellAt(x, z) { return cellIJ(Math.floor(x / CELL), Math.floor(z / CELL)); }
function floorOf(c) { return c.lift ? c.lift.cur : c.d.f; }
function ceilOf(c) {
  if (c.door) return c.door.f + Math.max(0.0, c.door.open) * (c.door.c - c.door.f);
  return c.d.sky ? 999 : c.d.c;
}
function blocksAll(c) { return c.solid || (c.field && c.field.on); }
function bodyFloor(c) { return floorOf(c) - (c.d.sink || 0); }
function groupById(id) { return LV.groups.find((g) => g.id === id) || null; }

// ---------- mesh building ----------
function buildLevelMeshes(L) {
  const root = new THREE.Group();
  const buckets = {};
  const bucket = (tex) => buckets[tex] || (buckets[tex] = { pos: [], uv: [], li: [], idx: [] });
  const quad = (tex, p, uv, l) => {
    const b = bucket(tex), n = b.pos.length / 3;
    for (const v of p) b.pos.push(v[0], v[1], v[2]);
    for (const t of uv) b.uv.push(t[0], t[1]);
    b.li.push(l, l, l, l);
    b.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  const baseF = (c) => (c.lift ? Math.min(...c.lift.stops) : c.d.f);
  const baseC = (c) => c.d.c;
  // a wall at the boundary of `c` facing into it, from y0 to y1; dir = 0 E, 1 W, 2 S, 3 N
  const wall = (c, dir, y0, y1, tex, l) => {
    if (y1 - y0 < 0.001) return;
    const x0 = c.x * CELL, x1 = x0 + CELL, z0 = c.z * CELL, z1 = z0 + CELL;
    let a, b;
    if (dir === 0) { a = [x1, z0]; b = [x1, z1]; } else if (dir === 1) { a = [x0, z1]; b = [x0, z0]; }
    else if (dir === 2) { a = [x1, z1]; b = [x0, z1]; } else { a = [x0, z0]; b = [x1, z0]; }
    const rx = Math.sign(b[0] - a[0]), rz = Math.sign(b[1] - a[1]);
    const ua = (a[0] * rx + a[1] * rz) / CELL, ub = (b[0] * rx + b[1] * rz) / CELL;
    quad(tex, [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]],
      [[ua, y0 / CELL], [ub, y0 / CELL], [ub, y1 / CELL], [ua, y1 / CELL]], l);
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const c of L.cells) {
    if (c.solid) continue;
    const d = c.d, l = d.l;
    const x0 = c.x * CELL, x1 = x0 + CELL, z0 = c.z * CELL, z1 = z0 + CELL;
    const f = baseF(c), cc = baseC(c);
    if (!c.lift) {
      quad(d.fl, [[x0, f, z0], [x0, f, z1], [x1, f, z1], [x1, f, z0]], [[x0 / CELL, -z0 / CELL], [x0 / CELL, -z1 / CELL], [x1 / CELL, -z1 / CELL], [x1 / CELL, -z0 / CELL]], d.liq ? Math.max(l, 0.5) : l);
    }
    if (!d.sky) quad(d.cl, [[x0, cc, z0], [x1, cc, z0], [x1, cc, z1], [x0, cc, z1]], [[x0 / CELL, z0 / CELL], [x1 / CELL, z0 / CELL], [x1 / CELL, z1 / CELL], [x0 / CELL, z1 / CELL]], l * 0.9);
    for (let k = 0; k < 4; k++) {
      const n = cellIJ2(L, c.x + DIRS[k][0], c.z + DIRS[k][1]);
      if (n.solid) { wall(c, k, f, cc, n.d.w || d.w, l); continue; }
      const nf = baseF(n), nc = baseC(n);
      if (nf > f) wall(c, k, f, Math.min(nf, cc), n.d.s || d.w, l);
      if (nc < cc && !(d.sky && n.d.sky)) wall(c, k, Math.max(nc, f), cc, n.d.u || d.w, l);
    }
  }
  for (const tex in buckets) {
    const b = buckets[tex];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    g.setAttribute('aLight', new THREE.Float32BufferAttribute(b.li, 1));
    g.setIndex(b.idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, worldMat(tex, { scroll: SCROLL[tex] }));
    m.matrixAutoUpdate = false;
    root.add(m);
  }
  // Doors, lifts and fields are separate meshes moved every frame.
  for (const g of L.groups) {
    for (const c of g.cells) {
      const cx = (c.x + 0.5) * CELL, cz = (c.z + 0.5) * CELL, l = c.d.l;
      if (g.type === 'door') {
        const H = g.c - g.f;
        const side = worldMat(c.d.dt || (g.key ? 'door_' + g.key : g.secret ? c.d.w : 'door'));
        const geo = boxGeo(CELL - 0.03, H, CELL - 0.03, l, g.secret ? H / CELL : 1);
        const m = new THREE.Mesh(geo, [side, side, worldMat('ceil2'), worldMat('ceil2'), side, side]);
        m.position.set(cx, g.f + H / 2, cz);
        g.meshes.push(m); root.add(m);
      } else if (g.type === 'lift') {
        const lo = Math.min(...g.stops), hi = Math.max(...g.stops), H = hi - lo + 1.2;
        const side = worldMat(c.d.s || 'lift'), top = worldMat(c.d.lt || 'lifttop');
        const m = new THREE.Mesh(boxGeo(CELL - 0.03, H, CELL - 0.03, l, H / CELL), [side, side, top, top, side, side]);
        m.userData.H = H; m.userData.cx = cx; m.userData.cz = cz;
        g.meshes.push(m); root.add(m);
      } else {
        const H = c.d.c - c.d.f;
        const ew = cellIJ2(L, c.x - 1, c.z).solid && cellIJ2(L, c.x + 1, c.z).solid;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL, H), glowMat('field', c.d.fc || 0x66ccff, 0.75));
        m.position.set(cx, c.d.f + H / 2, cz);
        if (!ew) m.rotation.y = Math.PI / 2;
        g.meshes.push(m); root.add(m);
      }
    }
  }
  for (const p of L.plats) {
    const w = (p.x1 - p.x0) * CELL, dd = (p.z1 - p.z0) * CELL;
    const side = worldMat('lift'), top = worldMat('lifttop');
    p.mesh = new THREE.Mesh(boxGeo(w - 0.02, p.thick, dd - 0.02, p.l || 0.9, p.thick / CELL), [side, side, top, top, side, side]);
    root.add(p.mesh);
  }
  return root;
}
function cellIJ2(L, i, j) { return i < 0 || j < 0 || i >= L.w || j >= L.h ? OOB : L.cells[j * L.w + i]; }
// Box with an aLight attribute; side faces tile vertically `vs` times, anchored at the top edge.
function boxGeo(w, h, d, light, vs = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  for (const face of [0, 1, 4, 5]) for (let k = 0; k < 4; k++) { const i = face * 4 + k; uv.setY(i, 1 - (1 - uv.getY(i)) * vs); }
  g.setAttribute('aLight', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(light), 1));
  return g;
}

// ---------- dynamic sectors ----------
function anyBodyIn(cells) {
  for (const b of allBodies()) {
    for (const c of cells) {
      const x0 = c.x * CELL, z0 = c.z * CELL;
      if (b.x + b.r > x0 && b.x - b.r < x0 + CELL && b.z + b.r > z0 && b.z - b.r < z0 + CELL) return true;
    }
  }
  return false;
}
function openDoor(g, byPlayer) {
  if (g.target === 1 && g.open > 0) { g.hold = 4; return true; }
  g.target = 1; g.hold = 4;
  sfxAt('door', g.cells[0].x * CELL + 1, g.f + 1, g.cells[0].z * CELL + 1);
  return true;
}
function activateLift(g) {
  if (g.mode === 'cycle') return false;
  const next = (g.target + 1) % g.stops.length;
  if (g.stops[g.target] === g.cur) { g.target = next; g.timer = 0; sfxAt('lift', g.cells[0].x * CELL + 1, g.cur, g.cells[0].z * CELL + 1); return true; }
  return false;
}
function updateGroups(dt) {
  for (const g of LV.groups) {
    if (g.type === 'door') {
      if (g.target === 1) {
        g.open = Math.min(1, g.open + dt * 1.6);
        if (g.open >= 1) { g.hold -= dt; if (g.hold <= 0 && !g.stay && !anyBodyIn(g.cells)) { g.target = 0; sfxAt('door', g.cells[0].x * CELL + 1, g.f + 1, g.cells[0].z * CELL + 1); } }
      } else if (g.open > 0) {
        if (anyBodyIn(g.cells)) g.target = 1; else g.open = Math.max(0, g.open - dt * 1.3);
      }
      const H = g.c - g.f;
      for (const m of g.meshes) m.position.y = g.f + g.open * H + H / 2;
    } else if (g.type === 'lift') {
      const tgt = g.stops[g.target];
      if (g.cur !== tgt) {
        const prev = g.cur;
        const st = g.speed * dt;
        g.cur = Math.abs(tgt - g.cur) <= st ? tgt : g.cur + Math.sign(tgt - g.cur) * st;
        g.moving = true;
        // ride: bodies standing on the lift move with it
        for (const b of allBodies()) if (b.onLift === g) { b.y += g.cur - prev; }
        if (g.cur === tgt) sfxAt('liftstop', g.cells[0].x * CELL + 1, g.cur, g.cells[0].z * CELL + 1);
      } else {
        g.moving = false;
        if (g.mode === 'cycle') { g.timer += dt; if (g.timer > g.wait) { g.timer = 0; g.target = (g.target + 1) % g.stops.length; } }
      }
      for (const m of g.meshes) m.position.set((m.userData.cx), g.cur - m.userData.H / 2, m.userData.cz);
    } else if (g.type === 'field') {
      for (const m of g.meshes) m.visible = g.on;
    }
  }
  for (const p of LV.plats) {
    const a = p.pts[p.seg], b = p.pts[(p.seg + 1) % p.pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const px = p.ox, pz = p.oz;
    if (p.hold > 0) p.hold -= dt;
    else {
      p.t += (p.speed * dt) / len;
      if (p.t >= 1) { p.t = 0; p.seg = (p.seg + 1) % p.pts.length; p.hold = p.wait; }
    }
    const a2 = p.pts[p.seg], b2 = p.pts[(p.seg + 1) % p.pts.length];
    p.ox = lerp(a2[0], b2[0], p.t); p.oz = lerp(a2[1], b2[1], p.t);
    p.dx = p.ox - px; p.dz = p.oz - pz;
    for (const bd of allBodies()) if (bd.onPlat === p) { bd.x += p.dx; bd.z += p.dz; }
    const w = (p.x1 - p.x0) * CELL, dd = (p.z1 - p.z0) * CELL;
    p.mesh.position.set(p.x0 * CELL + p.ox + w / 2, p.top - p.thick / 2, p.z0 * CELL + p.oz + dd / 2);
  }
}
function platBox(p) { const x0 = p.x0 * CELL + p.ox, z0 = p.z0 * CELL + p.oz; return [x0, z0, x0 + (p.x1 - p.x0) * CELL, z0 + (p.z1 - p.z0) * CELL]; }

// ---------- collision ----------
// Bodies are axis-aligned boxes: {x, z, y (feet), r, h, step, onGround}.
function cellBlocks(c, feet, h, step) {
  if (blocksAll(c)) return true;
  const fl = bodyFloor(c);
  if (fl > feet + step) return true;
  if (ceilOf(c) - Math.max(feet, fl) < h) return true;
  return false;
}
function blockedAt(b, x, z, ox, oz, step) {
  const i0 = Math.floor((x - b.r) / CELL), i1 = Math.floor((x + b.r) / CELL), j0 = Math.floor((z - b.r) / CELL), j1 = Math.floor((z + b.r) / CELL);
  const oi0 = Math.floor((ox - b.r) / CELL), oi1 = Math.floor((ox + b.r) / CELL), oj0 = Math.floor((oz - b.r) / CELL), oj1 = Math.floor((oz + b.r) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i >= oi0 && i <= oi1 && j >= oj0 && j <= oj1) continue; // already inside this cell
    if (cellBlocks(cellIJ(i, j), b.y, b.h, step)) return true;
    if (b.avoid && b.avoid(cellIJ(i, j))) return true;
  }
  for (const p of LV.plats) {
    const [px0, pz0, px1, pz1] = platBox(p);
    if (x + b.r > px0 && x - b.r < px1 && z + b.r > pz0 && z - b.r < pz1) {
      const top = p.top, bot = p.top - p.thick;
      if (top > b.y + step && bot < b.y + b.h) return true;
    }
  }
  return false;
}
function moveBody(b, dx, dz) {
  const step = b.onGround ? b.step : 0.3;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.15));
  let hx = false, hz = false;
  for (let s = 0; s < n; s++) {
    const nx = b.x + dx / n;
    if (!hx) { if (!blockedAt(b, nx, b.z, b.x, b.z, step)) b.x = nx; else hx = true; }
    const nz = b.z + dz / n;
    if (!hz) { if (!blockedAt(b, b.x, nz, b.x, b.z, step)) b.z = nz; else hz = true; }
  }
  return hx || hz;
}
// Highest standable surface under the body that is not above feet+step.
function groundUnder(b, step, prevY) {
  const lim = Math.max(b.y + step, prevY === undefined ? -1e9 : prevY + 0.001);
  let g = -1e9, lift = null, plat = null, cell = null;
  const i0 = Math.floor((b.x - b.r) / CELL), i1 = Math.floor((b.x + b.r) / CELL), j0 = Math.floor((b.z - b.r) / CELL), j1 = Math.floor((b.z + b.r) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const c = cellIJ(i, j);
    if (blocksAll(c)) continue;
    const fl = bodyFloor(c);
    if (fl <= lim && fl > g) { g = fl; lift = c.lift; cell = c; }
  }
  for (const p of LV.plats) {
    const [px0, pz0, px1, pz1] = platBox(p);
    if (b.x + b.r > px0 && b.x - b.r < px1 && b.z + b.r > pz0 && b.z - b.r < pz1 && p.top <= lim && p.top > g) { g = p.top; plat = p; lift = null; }
  }
  return { g, lift, plat, cell };
}
function ceilOver(b) {
  let m = 1e9;
  const i0 = Math.floor((b.x - b.r) / CELL), i1 = Math.floor((b.x + b.r) / CELL), j0 = Math.floor((b.z - b.r) / CELL), j1 = Math.floor((b.z + b.r) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const c = cellIJ(i, j); if (!blocksAll(c)) m = Math.min(m, ceilOf(c)); }
  return m;
}
// Vertical physics for walkers: gravity, landing, stair snapping, lifts and platforms.
function fallBody(b, dt) {
  const wasGround = b.onGround;
  const prevY = b.y;
  b.vy -= GRAV * dt;
  b.y += b.vy * dt;
  const gu = groundUnder(b, wasGround ? b.step : 0.3, prevY);
  if (b.y <= gu.g) { b.y = gu.g; if (b.vy < 0) { b.landV = b.vy; b.vy = 0; } b.onGround = true; }
  else if (wasGround && b.vy <= 0 && b.y - gu.g < 0.75) { b.y = gu.g; b.vy = 0; b.onGround = true; }
  else b.onGround = false;
  b.onLift = b.onGround ? gu.lift : null;
  b.onPlat = b.onGround ? gu.plat : null;
  b.ground = gu.cell;
  const cl = ceilOver(b);
  if (b.y + b.h > cl) { b.y = Math.max(gu.g, cl - b.h); if (b.vy > 0) b.vy = 0; }
}

// ---------- ray tracing ----------
// March a segment through the grid (2D DDA) checking floors and ceilings. Returns distance to the first hit
// (or max) and fills out {kind, cell, nx, ny, nz}.
const TR = { kind: null, cell: null, nx: 0, ny: 0, nz: 0 };
function trace(ox, oy, oz, dx, dy, dz, max) {
  const hl = Math.hypot(dx, dz);
  let i = Math.floor(ox / CELL), j = Math.floor(oz / CELL);
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? CELL / Math.abs(dx) : Infinity, tdz = dz !== 0 ? CELL / Math.abs(dz) : Infinity;
  let tmx = dx !== 0 ? (dx > 0 ? (i + 1) * CELL - ox : ox - i * CELL) / Math.abs(dx) : Infinity;
  let tmz = dz !== 0 ? (dz > 0 ? (j + 1) * CELL - oz : oz - j * CELL) / Math.abs(dz) : Infinity;
  let t0 = 0, axis = -1;
  TR.kind = null; TR.cell = null;
  for (let guard = 0; guard < 400; guard++) {
    const c = cellIJ(i, j);
    if (blocksAll(c)) { TR.kind = 'wall'; TR.cell = c; setNorm(axis, sx, sz); return t0; }
    const fl = floorOf(c), cl = ceilOf(c);
    const t1 = Math.min(tmx, tmz, max);
    const y0 = oy + dy * t0, y1 = oy + dy * t1;
    if (t0 > 0 && (y0 < fl - 0.001 || y0 > cl + 0.001)) { TR.kind = 'wall'; TR.cell = c; setNorm(axis, sx, sz); return t0; }
    if (y1 < fl && dy < 0) { TR.kind = 'floor'; TR.cell = c; TR.nx = 0; TR.ny = 1; TR.nz = 0; return Math.max(t0, t0 + (fl - y0) / dy); }
    if (y1 > cl && dy > 0) { TR.kind = 'ceil'; TR.cell = c; TR.nx = 0; TR.ny = -1; TR.nz = 0; return Math.max(t0, t0 + (cl - y0) / dy); }
    if (t1 >= max) return max;
    if (tmx < tmz) { i += sx; t0 = tmx; tmx += tdx; axis = 0; } else { j += sz; t0 = tmz; tmz += tdz; axis = 1; }
  }
  return max;
  function setNorm(ax, sx, sz) { TR.ny = 0; if (ax === 0) { TR.nx = -sx; TR.nz = 0; } else if (ax === 1) { TR.nx = 0; TR.nz = -sz; } else { TR.nx = -dx / (hl || 1); TR.nz = -dz / (hl || 1); } }
}
function traceTo(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz) || 1e-6;
  return trace(ax, ay, az, dx / l, dy / l, dz / l, l) >= l - 0.05;
}

// ---------- pathfinding fields ----------
// Breadth-first distance from the player's cell. Walkers respect steps and ceilings, fliers only walls.
function canWalk(a, b) {
  if (blocksAll(b) || b.d.kill || (b.d.dmg && !b.d.gas)) return false;
  if (b.door && (b.door.key || b.door.locked || b.door.secret) && b.door.open < 0.9) return false;
  const fa = bodyFloor(a), fb = bodyFloor(b);
  if (fb - fa > 0.7) return false;
  const top = b.door ? b.door.c : ceilOf(b);
  return top - Math.max(fa, fb) >= 1.9;
}
function canFly(a, b) {
  if (blocksAll(b)) return false;
  if (b.door && b.door.open < 0.9 && (b.door.key || b.door.locked || b.door.secret)) return false;
  const top = b.door ? b.door.c : ceilOf(b);
  return top - floorOf(b) >= 1.2;
}
function buildFlow(start, ok) {
  const n = LV.w * LV.h, dist = new Int16Array(n).fill(-1);
  const q = new Int32Array(n);
  let h = 0, t = 0;
  dist[start] = 0; q[t++] = start;
  while (h < t) {
    const k = q[h++], c = LV.cells[k], dk = dist[k];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const i = c.x + di, j = c.z + dj;
      if (i < 0 || j < 0 || i >= LV.w || j >= LV.h) continue;
      const m = j * LV.w + i;
      if (dist[m] >= 0) continue;
      const nb = LV.cells[m];
      if (nb.solid) continue;
      // reverse edge: an actor in nb moves into c
      if (!ok(nb, c)) continue;
      if (di && dj && (!ok(nb, cellIJ(c.x, nb.z)) || !ok(nb, cellIJ(nb.x, c.z)))) continue;
      dist[m] = dk + 1; q[t++] = m;
    }
  }
  return dist;
}
function updateFlow(dt, px, pz) {
  LV.flowT -= dt;
  const c = cellAt(px, pz);
  const k = c.z * LV.w + c.x;
  if (c.solid) return;
  if (k !== LV.flowCell || LV.flowT <= 0) {
    LV.flowCell = k; LV.flowT = 0.6;
    LV.flowG = buildFlow(k, canWalk);
    LV.flowA = buildFlow(k, canFly);
  }
}
// Best neighbouring cell to step toward, or null.
function flowStep(field, ok, x, z) {
  if (!field) return null;
  const c = cellAt(x, z); if (c.solid) return null;
  let best = null, bd = field[c.z * LV.w + c.x];
  if (bd < 0) bd = 1e9;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    if (!di && !dj) continue;
    const i = c.x + di, j = c.z + dj;
    if (i < 0 || j < 0 || i >= LV.w || j >= LV.h) continue;
    const v = field[j * LV.w + i];
    if (v < 0 || v >= bd) continue;
    const nb = LV.cells[j * LV.w + i];
    if (!ok(c, nb)) continue;
    if (di && dj && (!ok(c, cellIJ(c.x + di, c.z)) || !ok(c, cellIJ(c.x, c.z + dj)))) continue;
    bd = v; best = nb;
  }
  return best;
}

// ---------- automap exploration ----------
function markSeen(x, z) {
  const c0 = cellAt(x, z); if (!c0.solid) c0.seen = true;
  for (let a = 0; a < 48; a++) {
    const ang = (a / 48) * TAU, dx = Math.cos(ang), dz = Math.sin(ang);
    for (let t = 0.5; t < 26; t += 0.9) {
      const c = cellAt(x + dx * t, z + dz * t);
      if (c !== OOB) c.seen = true;
      if (c.solid || (c.door && c.door.open < 0.5)) break;
    }
  }
}
