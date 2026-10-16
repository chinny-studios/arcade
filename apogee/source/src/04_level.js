// 04_level: levels are ASCII grids of 2 m cells (see 06_levels.js). Each map character is one cell:
//   ' ' void (outside the map; space beyond a viewport)    '#' '%' '|' walls A/B/C    '&' cliff / tall outer wall
//   '.' floor A  ',' floor B  '+' floor A with a ceiling lamp  '1'-'4' raised floor B (0.5 m per step)
//   '_' '=' '~' outdoor ground A/B/C (no ceiling, open sky)
//   'D' sliding door   'L' locked door (level.locks['c,r'] names the key)   'W' window (breakable glass on a sill)
//   'V' viewport (armoured glass, usually onto space)   'F' chain-link fence (blocks feet, not bullets or eyes)
//   props:  'x' crate  'b' explosive barrel  'o' fuel tank  'c' console  'k' tape mainframe  'u' bunk  'h' hydroponic trough
//           'l' locker  'A' alarm panel (mounts on a neighbouring wall)
//   people: 'g' guard  'p' patrolling guard  'e' elite guard  's' technician   'r' reinforcement spawn point
//   items:  'a' body armour  'm' ammo crate   'P' player start   'X' exit
//   Any other character is looked up in level.marks (objective props, named guards, scenery).
// Entity and prop cells take the floor of their neighbours. Geometry is merged into a few meshes with baked
// per-vertex light; the same grid answers collision, line of sight and bullet traces.
const T_VOID = 0, T_WALL = 1, T_FLOOR = 2, T_DOOR = 3, T_WINDOW = 4, T_FENCE = 5, T_VIEWPORT = 6;
const DOOR_H = 3.0, SILL_H = 0.9, LINTEL_H = 2.6;
const TEXSCALE = { wall_green: [2, 4], wall_panel: [2, 4], door: [2, 3], door_lock: [2, 3], door_st: [2, 3], corrugated: [2, 4], hull_stripe: [2, 3.5], cliff: [4, 4], fence: [2, 3] };

const L = { def: null };   // the current level (one at a time)

function cellIdx(c, r) { return r * L.W + c; }
function inMap(c, r) { return c >= 0 && r >= 0 && c < L.W && r < L.H; }
function cellOf(x) { return Math.floor(x / CELL); }
function idxAt(x, z) { const c = cellOf(x), r = cellOf(z); return inMap(c, r) ? cellIdx(c, r) : -1; }
const cx2 = (c) => c * CELL + CELL / 2;

const FLOORCH = { '.': ['fA', 0], ',': ['fB', 0], '+': ['fA', 0, 1], '_': ['outA', 1], '=': ['outB', 1], '~': ['outC', 1], '1': ['fB', 0], '2': ['fB', 0], '3': ['fB', 0], '4': ['fB', 0] };

function parseLevel(def) {
  const rows = def.map, H = rows.length, W = Math.max(...rows.map((r) => r.length));
  Object.assign(L, {
    def, W, H, type: new Uint8Array(W * H), fh: new Float32Array(W * H), ceil: new Float32Array(W * H), out: new Uint8Array(W * H),
    wtex: new Int16Array(W * H), wtexOut: new Int16Array(W * H), ftex: new Int16Array(W * H), ctex: new Int16Array(W * H),
    wallTop: new Float32Array(W * H), lamp: new Uint8Array(W * H), blocked: new Uint8Array(W * H), ch: [],
    props: [], cellProps: [], doors: [], doorAt: new Map(), windows: new Map(), exits: new Set(), lights: [],
    spawns: [], items: [], reinf: [], patrols: def.patrols || [], start: null, alarms: [], fences: [], spawnProps: [],
  });
  for (let i = 0; i < W * H; i++) L.cellProps.push(null);
  const tx = def.tex, T = (n) => TILE[n];
  const zoneAt = (c, r) => { for (const z of def.zones || []) if (c >= z.c0 && c <= z.c1 && r >= z.r0 && r <= z.r1) return z; return null; };
  const ceilAt = (c, r) => { const z = zoneAt(c, r); return z && z.ceil ? z.ceil : def.ceil; };
  const chAt = (c, r) => (rows[r] && rows[r][c]) || ' ';
  // pass 1: types
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const ch = chAt(c, r), i = cellIdx(c, r);
    L.ch[i] = ch;
    if (ch === ' ') { L.type[i] = T_VOID; continue; }
    if ('#%|&'.includes(ch)) {
      L.type[i] = T_WALL;
      const key = { '#': 'A', '%': 'B', '|': 'C', '&': 'cliff' }[ch];
      const w = tx[key] || tx.A;
      L.wtex[i] = T(typeof w === 'string' ? w : w[0]);
      L.wtexOut[i] = T(typeof w === 'string' ? w : w[1]);
      continue;
    }
    L.type[i] = ch === 'D' || ch === 'L' ? T_DOOR : ch === 'W' ? T_WINDOW : ch === 'V' ? T_VIEWPORT : ch === 'F' ? T_FENCE : T_FLOOR;
  }
  // pass 2: floors, ceilings, outdoors (entity cells copy the most common floor among their neighbours)
  const floorSpec = (c, r) => {
    const ch = chAt(c, r);
    if (FLOORCH[ch]) return FLOORCH[ch];
    const counts = {};
    let best = null, bn = 0;
    for (let rad = 1; rad <= 3 && !best; rad++) {
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const f = FLOORCH[chAt(c + dc, r + dr)];
        if (!f) continue;
        const k = f[0];
        counts[k] = (counts[k] || 0) + (Math.abs(dr) + Math.abs(dc) === 1 ? 3 : 1);
        if (counts[k] > bn) { bn = counts[k]; best = [f[0], f[1]]; }
      }
    }
    return best || ['fA', 0];
  };
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = cellIdx(c, r), t = L.type[i];
    if (t === T_VOID || t === T_WALL) continue;
    const ch = chAt(c, r);
    const fs = floorSpec(c, r);
    L.out[i] = fs[1];
    if (t === T_FENCE) L.out[i] = 1;
    const zn = zoneAt(c, r);
    L.ftex[i] = T((zn && zn[fs[0]]) || tx[fs[0]] || tx.fA);
    L.ctex[i] = T(tx.ceil || 'ceil');
    if ('1234'.includes(ch)) L.fh[i] = (+ch) * 0.5;
    L.ceil[i] = L.out[i] ? 1e9 : ceilAt(c, r);
    if (ch === '+') { L.lamp[i] = 1; L.ctex[i] = T(tx.lamp || 'lamp'); }
  }
  // doors and windows take the floor of their open neighbours and lower their own "ceiling" to the lintel
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = cellIdx(c, r), t = L.type[i];
    if (t !== T_DOOR && t !== T_WINDOW && t !== T_VIEWPORT) continue;
    const side = (cc, rr) => isWallish(cc, rr) || 'DLWV'.includes(chAt(cc, rr));
    const wallX = side(c - 1, r) && side(c + 1, r) && !(isWallish(c, r - 1) && isWallish(c, r + 1));
    let fh = 0, n = 0;
    for (const [dc, dr] of wallX ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) {
      const j = inMap(c + dc, r + dr) ? cellIdx(c + dc, r + dr) : -1;
      if (j >= 0 && (L.type[j] === T_FLOOR)) { fh += L.fh[j]; n++; }
    }
    L.fh[i] = n ? fh / n : 0;
    L.out[i] = 0;
    if (t === T_DOOR) {
      L.ceil[i] = L.fh[i] + DOOR_H;
      const key = chAt(c, r) === 'L' ? ((def.locks || {})[c + ',' + r] || 'key') : null;
      const door = { i, c, r, axis: wallX ? 'x' : 'z', open: 0, target: 0, timer: 0, locked: key, mesh: null, y0: L.fh[i] };
      L.doors.push(door); L.doorAt.set(i, door);
    } else {
      L.ceil[i] = L.fh[i] + LINTEL_H;
      L.windows.set(i, { i, c, r, axis: wallX ? 'x' : 'z', intact: true, armoured: t === T_VIEWPORT, mesh: null, y0: L.fh[i] });
      L.fh[i] += SILL_H;
    }
  }
  // wall heights: up to the tallest neighbouring ceiling, or the outdoor wall height if they face outside
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = cellIdx(c, r);
    if (L.type[i] !== T_WALL) continue;
    let top = chAt(c, r) === '&' ? (def.cliff || 14) : 0;
    for (const [dc, dr] of N8) {
      if (!inMap(c + dc, r + dr)) continue;
      const j = cellIdx(c + dc, r + dr), t = L.type[j];
      if (t === T_VOID || t === T_WALL) continue;
      if (L.out[j]) top = Math.max(top, def.outWall || 6);
      else top = Math.max(top, L.ceil[j]);
    }
    L.wallTop[i] = top || def.ceil;
  }
  // entities
  const marks = def.marks || {};
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const ch = chAt(c, r), i = cellIdx(c, r);
    const at = { c, r, x: cx2(c), z: cx2(r), y: L.fh[i], i };
    if (ch === 'P') L.start = at;
    else if (ch === 'X') L.exits.add(i);
    else if ('gpes'.includes(ch)) L.spawns.push(Object.assign({ kind: { g: 'guard', p: 'patrol', e: 'elite', s: 'tech' }[ch] }, at));
    else if (ch === 'r') L.reinf.push(at);
    else if (ch === 'a') L.items.push(Object.assign({ item: 'armor' }, at));
    else if (ch === 'm') L.items.push(Object.assign({ item: 'ammo' }, at));
    else if ('xbockuhlA'.includes(ch)) L.spawnProps.push(Object.assign({ prop: { x: 'crate', b: 'barrel', o: 'tank', c: 'console', k: 'bank', u: 'bunk', h: 'trough', l: 'locker', A: 'alarm' }[ch] }, at));
    else if (marks[ch]) {
      const m = marks[ch];
      if (m.prop || m.scenery) L.spawnProps.push(Object.assign({}, m, at));
      if (m.actor) L.spawns.push(Object.assign({ kind: m.actor }, m, at));
      if (m.item) L.items.push(Object.assign({}, m, at));
      if (m.exit) L.exits.add(i);
    }
  }
  for (const d of def.extraProps || []) L.spawnProps.push(Object.assign({ x: cx2(d.c), z: cx2(d.r), y: 0, i: -1 }, d));
}
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function isWallish(c, r) { if (!inMap(c, r)) return true; const t = L.type[cellIdx(c, r)]; return t === T_WALL || t === T_VOID; }
function isOpenT(t) { return t === T_FLOOR || t === T_DOOR || t === T_WINDOW || t === T_VIEWPORT || t === T_FENCE; }

// ---------------------------------------------------------------- lighting
// Static light: ambient (indoor or outdoor), the sun with ray-marched shadows, point lights with grid line of
// sight, and a little ambient occlusion from neighbouring walls. Returned colours may exceed 1 (overbright).
function prepLights() {
  const def = L.def;
  L.lights = [];
  // levels without hand-placed '+' lamps get ceiling lamps spread evenly over indoor floors
  if (def.autoLamps) {
    const n = def.autoLamps;
    for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
      const i = cellIdx(c, r);
      if (L.type[i] !== T_FLOOR || L.out[i] || L.cellProps[i]) continue;
      let near = false;
      for (let dr = -n + 1; dr < n && !near; dr++) for (let dc = -n + 1; dc < n; dc++) if (inMap(c + dc, r + dr) && L.lamp[cellIdx(c + dc, r + dr)]) { near = true; break; }
      if (!near) { L.lamp[i] = 1; L.ctex[i] = TILE[def.tex.lamp || 'lamp']; }
    }
  }
  for (const l of def.lights || []) {
    const [c, r, h, col, rad, k] = l;
    L.lights.push({ x: cx2(c), y: h, z: cx2(r), col: hex3(col).map((v) => v * (k || 1)), rad });
  }
  const lc = hex3(def.lampCol || 0xfff0d0).map((v) => v * (def.lampK || 1));
  for (let i = 0; i < L.W * L.H; i++) if (L.lamp[i]) {
    const c = i % L.W, r = (i / L.W) | 0;
    L.lights.push({ x: cx2(c), y: L.ceil[i] - 0.3, z: cx2(r), col: lc, rad: def.lampRad || 8 });
  }
  L.amb = hex3(def.amb || 0x404040); L.outAmb = hex3(def.outAmb || def.amb || 0x606060);
  L.sun = def.sun ? { dir: new THREE.Vector3(...def.sun.dir).normalize(), col: hex3(def.sun.col) } : null;
  // bucket lights by cell for speed
  L.lightBuckets = new Map();
  for (const l of L.lights) {
    const c0 = cellOf(l.x - l.rad), c1 = cellOf(l.x + l.rad), r0 = cellOf(l.z - l.rad), r1 = cellOf(l.z + l.rad);
    for (let r = Math.max(0, r0); r <= Math.min(L.H - 1, r1); r++) for (let c = Math.max(0, c0); c <= Math.min(L.W - 1, c1); c++) {
      const k = cellIdx(c, r);
      if (!L.lightBuckets.has(k)) L.lightBuckets.set(k, []);
      L.lightBuckets.get(k).push(l);
    }
  }
}
function blocksLight(i, y) {
  const t = L.type[i];
  if (t === T_WALL) return y < L.wallTop[i];
  if (t === T_VOID) return true;
  if (t === T_DOOR) return y > L.ceil[i] && y < L.ceil[i] + 1.5;
  return false;
}
function segClear2D(x0, y0, z0, x1, y1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.4);
  for (let k = 1; k < n; k++) {
    const t = k / n, i = idxAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
    if (i < 0) return false;
    if (blocksLight(i, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}
function sunShadow(x, y, z) {
  const d = L.sun.dir;
  for (let s = 0.4; s < 60; s += 0.5) {
    const px = x + d.x * s, py = y + d.y * s, pz = z + d.z * s;
    if (py > (L.def.cliff || 14) + 1) return 1;
    const i = idxAt(px, pz);
    if (i < 0) return 1;
    const t = L.type[i];
    if (t === T_WALL && py < L.wallTop[i]) return 0;
    if (!L.out[i] && t !== T_VOID && t !== T_WALL && py < Math.max(L.ceil[i] + 0.5, L.def.outWall || 6)) return 0;
    if (L.cellProps[i]) for (const p of L.cellProps[i]) { if (p.seeThrough) continue; const b = p.box; if (b && px > b[0] && px < b[3] && py > b[1] && py < b[4] && pz > b[2] && pz < b[5]) return 0; }
  }
  return 1;
}
function lightAt(x, y, z, nx, ny, nz) {
  const sx = x + nx * 0.12, sy = y + ny * 0.12, sz = z + nz * 0.12;
  const i = idxAt(sx, sz);
  const outdoor = i >= 0 && L.out[i];
  const A = outdoor ? L.outAmb : L.amb;
  // hemisphere: faces pointing down get less ambient, up more
  const hemi = 0.85 + 0.15 * ny;
  let r = A[0] * hemi, g = A[1] * hemi, b = A[2] * hemi;
  if (L.sun && outdoor) {
    const d = nx * L.sun.dir.x + ny * L.sun.dir.y + nz * L.sun.dir.z;
    if (d > 0 && sunShadow(sx, sy, sz)) { r += L.sun.col[0] * d; g += L.sun.col[1] * d; b += L.sun.col[2] * d; }
  }
  const bucket = i >= 0 ? L.lightBuckets.get(i) : null;
  if (bucket) for (const l of bucket) {
    const dx = l.x - sx, dy = l.y - sy, dz = l.z - sz, dist = Math.hypot(dx, dy, dz);
    if (dist >= l.rad) continue;
    const ndl = (dx * nx + dy * ny + dz * nz) / (dist || 1);
    const wrap = Math.max(0, (ndl + 0.3) / 1.3);
    if (wrap <= 0) continue;
    if (!segClear2D(l.x, l.y, l.z, sx, sy, sz)) continue;
    const att = Math.pow(1 - dist / l.rad, 1.6) * wrap;
    r += l.col[0] * att; g += l.col[1] * att; b += l.col[2] * att;
  }
  // ambient occlusion: corners and wall feet are darker
  let ao = 1;
  for (const [ox, oz] of [[0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]]) {
    const j = idxAt(sx + ox, sz + oz);
    if (j < 0 || L.type[j] === T_WALL || L.type[j] === T_VOID) ao -= 0.07;
  }
  if (i >= 0) {
    const above = y - L.fh[i];
    if (above < 0.15 && ny < 0.5) ao *= 0.8;
    if (!outdoor && L.ceil[i] - y < 0.15 && ny > -0.5) ao *= 0.85;
  }
  return [r * ao, g * ao, b * ao];
}
// Light for moving things (people, doors, pickups): ambient plus point lights, no normal; sun handled in shader.
function buildLightGrid() {
  L.lgrid = new Float32Array(L.W * L.H * 3);
  L.sunGrid = new Uint8Array(L.W * L.H);
  for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
    const i = cellIdx(c, r);
    if (!isOpenT(L.type[i])) continue;
    const x = cx2(c), y = L.fh[i] + 1.1, z = cx2(r);
    const A = L.out[i] ? L.outAmb : L.amb;
    let R = A[0], Gc = A[1], B = A[2];
    for (const l of L.lightBuckets.get(i) || []) {
      const dist = Math.hypot(l.x - x, l.y - y, l.z - z);
      if (dist >= l.rad || !segClear2D(l.x, l.y, l.z, x, y, z)) continue;
      const att = Math.pow(1 - dist / l.rad, 1.6) * 0.8;
      R += l.col[0] * att; Gc += l.col[1] * att; B += l.col[2] * att;
    }
    L.lgrid[i * 3] = R; L.lgrid[i * 3 + 1] = Gc; L.lgrid[i * 3 + 2] = B;
    L.sunGrid[i] = L.sun && L.out[i] && sunShadow(x, y, z) ? 1 : 0;
  }
}
function lightGridAt(x, z, out) {
  const i = idxAt(x, z);
  if (i < 0 || !L.lgrid) { out[0] = out[1] = out[2] = 0.6; return 0; }
  out[0] = L.lgrid[i * 3]; out[1] = L.lgrid[i * 3 + 1]; out[2] = L.lgrid[i * 3 + 2];
  return L.sunGrid[i];
}

// ---------------------------------------------------------------- geometry
function texScale(tile) {
  for (const k in TEXSCALE) if (TILE[k] === tile) return TEXSCALE[k];
  return [2, 2];
}
// a vertical face along a cell edge, split into <=2 m bands so the vertex lighting has something to hold onto
function vface(g, x0, z0, x1, z1, ya, yb, n, tile, uOff) {
  if (yb - ya < 0.01) return;
  const [su, sv] = texScale(tile);
  const len = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(1, Math.ceil((yb - ya) / 2 - 0.01));
  for (let k = 0; k < steps; k++) {
    const y0 = ya + (yb - ya) * k / steps, y1 = ya + (yb - ya) * (k + 1) / steps;
    g.quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0],
      [uOff / su, -y0 / sv, (uOff + len) / su, -y0 / sv, (uOff + len) / su, -y1 / sv, uOff / su, -y1 / sv], tile, n);
  }
}
// the face on the boundary between cell (c,r) and its neighbour in direction (dc,dr), facing back into (c,r)
function edgeFace(g, c, r, dc, dr, ya, yb, tile) {
  const x0 = c * CELL, z0 = r * CELL, x1 = x0 + CELL, z1 = z0 + CELL;
  if (dr === -1) vface(g, x0, z0, x1, z0, ya, yb, [0, 0, 1], tile, x0);       // wall to the north, face looks south
  else if (dr === 1) vface(g, x1, z1, x0, z1, ya, yb, [0, 0, -1], tile, -x1);
  else if (dc === -1) vface(g, x0, z1, x0, z0, ya, yb, [1, 0, 0], tile, -z1);
  else vface(g, x1, z0, x1, z1, ya, yb, [-1, 0, 0], tile, z0);
}
function roofTop(i) {
  const t = L.type[i];
  if (t === T_DOOR || t === T_WINDOW || t === T_VIEWPORT) {
    const c = i % L.W, r = (i / L.W) | 0, w = L.windows.get(i) || L.doorAt.get(i);
    let top = 0;
    for (const [dc, dr] of w.axis === 'x' ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]]) if (inMap(c + dc, r + dr)) top = Math.max(top, L.wallTop[cellIdx(c + dc, r + dr)]);
    return top || L.ceil[i] + 1;
  }
  return Math.max(L.ceil[i], L.def.outWall || 6);
}
function buildLevelGeometry() {
  const g = new Geo(), glassG = new Geo();
  g.lit = lightAt;
  const def = L.def;
  const stepTile = TILE[def.tex.step || (typeof def.tex.A === 'string' ? def.tex.A : def.tex.A[0])];
  for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
    const i = cellIdx(c, r), t = L.type[i];
    if (!isOpenT(t)) continue;
    const x0 = c * CELL, z0 = r * CELL, x1 = x0 + CELL, z1 = z0 + CELL, fh = L.fh[i];
    // floor (sills and door thresholds included)
    const ft = t === T_WINDOW || t === T_VIEWPORT ? stepTile : L.ftex[i];
    g.quad([x0, fh, z0], [x0, fh, z1], [x1, fh, z1], [x1, fh, z0], [x0 / 2, z0 / 2, x0 / 2, z1 / 2, x1 / 2, z1 / 2, x1 / 2, z0 / 2], ft, [0, 1, 0]);
    if (!L.out[i]) {
      const ce = L.ceil[i], ct = t === T_FLOOR ? L.ctex[i] : stepTile;
      g.quad([x0, ce, z0], [x1, ce, z0], [x1, ce, z1], [x0, ce, z1], [x0 / 2, z0 / 2, x1 / 2, z0 / 2, x1 / 2, z1 / 2, x0 / 2, z1 / 2], ct, [0, -1, 0]);
    }
    for (const [dc, dr] of N4) {
      const nc = c + dc, nr = r + dr;
      if (!inMap(nc, nr)) continue;
      const j = cellIdx(nc, nr), tj = L.type[j];
      if (tj === T_VOID) continue;
      if (tj === T_WALL) {
        const top = L.out[i] ? L.wallTop[j] : L.ceil[i];
        edgeFace(g, c, r, dc, dr, fh, top, L.out[i] ? L.wtexOut[j] : L.wtex[j]);
        continue;
      }
      // neighbour is open: a step face if it is higher, a lintel/roof edge if its ceiling is lower than ours
      if (L.fh[j] > fh + 0.001) edgeFace(g, c, r, dc, dr, fh, L.fh[j], stepTile);
      const myTop = L.out[i] ? roofTop(j) : L.ceil[i];
      const theirCeil = L.out[j] ? 1e9 : L.ceil[j];
      if (theirCeil < myTop - 0.001) {
        // the wall above a doorway or window: use the texture of the walls beside that opening
        let tile = stepTile;
        const w = L.windows.get(j) || L.doorAt.get(j);
        if (w) {
          const [ac, ar] = w.axis === 'x' ? [nc - 1, nr] : [nc, nr - 1];
          if (inMap(ac, ar)) { const k = cellIdx(ac, ar); if (L.type[k] === T_WALL) tile = L.out[i] ? L.wtexOut[k] : L.wtex[k]; }
        }
        edgeFace(g, c, r, dc, dr, theirCeil, myTop, tile);
      }
    }
    // tops of the walls next to open sky (seen from a distance or from raised ground)
  }
  for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
    const i = cellIdx(c, r);
    if (L.type[i] !== T_WALL) continue;
    let nearOut = false;
    for (const [dc, dr] of N8) if (inMap(c + dc, r + dr) && L.out[cellIdx(c + dc, r + dr)]) nearOut = true;
    if (!nearOut) continue;
    const x0 = c * CELL, z0 = r * CELL, x1 = x0 + CELL, z1 = z0 + CELL, y = L.wallTop[i];
    g.quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [0, 0, 0, 1, 1, 1, 1, 0], L.wtexOut[i], [0, 1, 0]);
    // the outward faces of tall walls above lower neighbours (cliff steps, building corners)
    for (const [dc, dr] of N4) {
      const nc = c + dc, nr = r + dr;
      if (!inMap(nc, nr)) continue;
      const j = cellIdx(nc, nr);
      if (L.type[j] === T_WALL && L.wallTop[j] < y - 0.01) {
        if (dc === 1) vface(g, x1, z1, x1, z0, L.wallTop[j], y, [1, 0, 0], L.wtexOut[i], -z1);
        else if (dc === -1) vface(g, x0, z0, x0, z1, L.wallTop[j], y, [-1, 0, 0], L.wtexOut[i], z0);
        else if (dr === 1) vface(g, x0, z1, x1, z1, L.wallTop[j], y, [0, 0, 1], L.wtexOut[i], x0);
        else vface(g, x1, z0, x0, z0, L.wallTop[j], y, [0, 0, -1], L.wtexOut[i], -x1);
      }
    }
  }
  // glass panes and fences
  for (const w of L.windows.values()) {
    const wg = new Geo(); wg.lit = lightAt;
    const x = cx2(w.c), z = cx2(w.r), y0 = L.fh[w.i], y1 = L.ceil[w.i];
    const tile = TILE[w.armoured ? 'viewport' : 'glass'];
    if (w.axis === 'x') { wg.quad([x - 1, y0, z], [x + 1, y0, z], [x + 1, y1, z], [x - 1, y1, z], [0, 1, 1, 1, 1, 0, 0, 0], tile, [0, 0, 1]); }
    else wg.quad([x, y0, z + 1], [x, y0, z - 1], [x, y1, z - 1], [x, y1, z + 1], [0, 1, 1, 1, 1, 0, 0, 0], tile, [1, 0, 0]);
    w.mesh = wg.mesh(MAT.glass);
    w.mesh.renderOrder = 2;
    scene.add(w.mesh);
  }
  const fg = new Geo(); fg.lit = lightAt;
  for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
    const i = cellIdx(c, r);
    if (L.type[i] !== T_FENCE) continue;
    const fx = isFenceLike(c - 1, r) || isFenceLike(c + 1, r);
    const x = cx2(c), z = cx2(r), h = 3, y0 = L.fh[i];
    const ft = TILE.fence, wt = TILE.wire;
    if (fx) { fg.quad([x - 1, y0, z], [x + 1, y0, z], [x + 1, y0 + h, z], [x - 1, y0 + h, z], [0, 1.5, 1, 1.5, 1, 0, 0, 0], ft, [0, 0, 1]); fg.quad([x - 1, y0 + h, z], [x + 1, y0 + h, z], [x + 1, y0 + h + 0.6, z], [x - 1, y0 + h + 0.6, z], [0, 1, 1, 1, 1, 0, 0, 0], wt, [0, 0, 1]); }
    else { fg.quad([x, y0, z + 1], [x, y0, z - 1], [x, y0 + h, z - 1], [x, y0 + h, z + 1], [0, 1.5, 1, 1.5, 1, 0, 0, 0], ft, [1, 0, 0]); fg.quad([x, y0 + h, z + 1], [x, y0 + h, z - 1], [x, y0 + h + 0.6, z - 1], [x, y0 + h + 0.6, z + 1], [0, 1, 1, 1, 1, 0, 0, 0], wt, [1, 0, 0]); }
    fg.box(x - 0.08, y0, z - 0.08, x + 0.08, y0 + h + 0.3, z + 0.08, TILE.metal_dk, 0);
  }
  if (!fg.empty) scene.add(fg.mesh(MAT.cutout2));
  const m = g.mesh(MAT.level);
  scene.add(m);
  L.mesh = m;
}
function isFenceLike(c, r) { if (!inMap(c, r)) return false; const t = L.type[cellIdx(c, r)]; return t === T_FENCE || t === T_WALL; }

// ---------------------------------------------------------------- doors
function buildDoors() {
  const def = L.def;
  for (const d of L.doors) {
    const g = new Geo();
    const tile = TILE[d.locked ? (def.tex.doorLock || 'door_lock') : (def.tex.door || 'door')];
    const w = CELL / 2, h = DOOR_H, t = 0.12;
    if (d.axis === 'x') g.box(-w, 0, -t, w, h, t, { front: tile, back: tile, side: TILE.metal_dk }, 0);
    else g.box(-t, 0, -w, t, h, w, { left: tile, right: tile, side: TILE.metal_dk }, 0);
    // stretch the tile across the slab: box() uses one tile per face already
    d.mesh = g.mesh(makeMat({ dyn: true }));
    d.mesh.position.set(cx2(d.c), d.y0, cx2(d.r));
    setDynLight(d.mesh.material, d.mesh.position.x, d.mesh.position.z);
    scene.add(d.mesh);
  }
}
function setDynLight(mat, x, z) {
  const tmp = [0, 0, 0];
  const sun = lightGridAt(x, z, tmp);
  mat.uniforms.uAmb.value.setRGB(tmp[0], tmp[1], tmp[2]);
  if (L.sun && sun) { mat.uniforms.uSunDir.value.copy(L.sun.dir); mat.uniforms.uSunCol.value.setRGB(...L.sun.col); }
  else { mat.uniforms.uSunDir.value.set(0.3, 0.8, 0.5).normalize(); mat.uniforms.uSunCol.value.setRGB(0.12, 0.12, 0.12); }
}
function updateDoors(dt) {
  for (const d of L.doors) {
    const busy = cellOccupied(d.i);
    if (d.target > 0) {
      d.timer -= dt;
      if (d.timer <= 0 && !busy) d.target = 0;
    }
    const prev = d.open;
    d.open = clamp(d.open + Math.sign(d.target - d.open) * dt * 1.6, 0, 1);
    if (Math.abs(d.target - d.open) < 0.01) d.open = d.target;
    if (d.open !== prev && (prev === 0 || prev === 1)) sfx('door', d.mesh.position);
    d.mesh.position.y = d.y0 + smooth(d.open) * (DOOR_H - 0.12);
  }
}
function openDoor(d, who) {
  if (d.locked && who === 'player') {
    if (!G.player.items[d.locked]) { hudMsg(L.def.lockMsg && L.def.lockMsg[d.locked] || 'Door is locked'); sfx('deny'); return false; }
    hudMsg('Unlocked with ' + (ITEMS[d.locked] ? ITEMS[d.locked].name : 'key')); d.locked = null;
    d.mesh.material.uniforms.uTint.value.setRGB(1, 1, 1);
  }
  if (d.locked && who !== 'player' && !who.keys) return false;
  d.target = 1; d.timer = 3.5;
  return true;
}
function cellOccupied(i) {
  const c = i % L.W, r = (i / L.W) | 0, x0 = c * CELL - 0.4, x1 = x0 + CELL + 0.8, z0 = r * CELL - 0.4, z1 = z0 + CELL + 0.8;
  const p = G.player;
  if (p && p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) return true;
  for (const a of G.actors) if (!a.dead && a.x > x0 && a.x < x1 && a.z > z0 && a.z < z1) return true;
  return false;
}
function doorSlabY(d) { return d.y0 + smooth(d.open) * (DOOR_H - 0.12); }

// ---------------------------------------------------------------- collision
// Does cell i stop something whose feet are at y and can step up `step`?
function cellBlocks(i, y, step = 0.55) {
  if (i < 0) return true;
  const t = L.type[i];
  if (t === T_WALL || t === T_VOID || t === T_FENCE || t === T_WINDOW || t === T_VIEWPORT) return true;
  if (t === T_DOOR) { const d = L.doorAt.get(i); if (doorSlabY(d) - d.y0 < 2.0) return true; }
  if (L.fh[i] > y + step) return true;
  return false;
}
// Push a circle out of blocking cells and props. Returns the corrected {x, z} via the passed object.
function collideCircle(o, rad, y, step = 0.55, height = 1.7) {
  for (let it = 0; it < 3; it++) {
    let moved = false;
    const c0 = cellOf(o.x - rad), c1 = cellOf(o.x + rad), r0 = cellOf(o.z - rad), r1 = cellOf(o.z + rad);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const i = inMap(c, r) ? cellIdx(c, r) : -1;
      if (cellBlocks(i, y, step)) moved = pushOutBox(o, rad, c * CELL, r * CELL, c * CELL + CELL, r * CELL + CELL) || moved;
      if (i >= 0 && L.cellProps[i]) for (const p of L.cellProps[i]) {
        if (!p.solid || !p.box) continue;
        const b = p.box;
        if (b[4] <= y + step || b[1] >= y + height) continue;
        moved = pushOutBox(o, rad, b[0], b[2], b[3], b[5]) || moved;
      }
    }
    if (!moved) break;
  }
  return o;
}
function pushOutBox(o, rad, x0, z0, x1, z1) {
  const px = clamp(o.x, x0, x1), pz = clamp(o.z, z0, z1);
  let dx = o.x - px, dz = o.z - pz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= rad * rad) return false;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2), k = (rad - d) / d;
    o.x += dx * k; o.z += dz * k;
  } else {
    // centre inside the box: leave by the nearest side
    const l = o.x - x0, rr = x1 - o.x, u = o.z - z0, dd = z1 - o.z, m = Math.min(l, rr, u, dd);
    if (m === l) o.x = x0 - rad; else if (m === rr) o.x = x1 + rad; else if (m === u) o.z = z0 - rad; else o.z = z1 + rad;
  }
  return true;
}
// Highest floor under a circle (ignores cells that would block it)
function groundUnder(x, z, rad, y, step = 0.55) {
  let best = -1e9;
  const c0 = cellOf(x - rad * 0.7), c1 = cellOf(x + rad * 0.7), r0 = cellOf(z - rad * 0.7), r1 = cellOf(z + rad * 0.7);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (!inMap(c, r)) continue;
    const i = cellIdx(c, r);
    if (!isOpenT(L.type[i]) || L.fh[i] > y + step) continue;
    best = Math.max(best, L.fh[i]);
  }
  if (best < -1e8) { const i = idxAt(x, z); best = i >= 0 ? L.fh[i] : 0; }
  return best;
}

// ---------------------------------------------------------------- ray casting
// Trace a ray through the grid. Returns the first hit or null:
//  { t, x, y, z, nx, ny, nz, kind: 'wall'|'floor'|'ceil'|'door'|'glass'|'prop'|'sky', i, prop, door, win }
// opts.sight: intact glass does not stop it (eyes see through windows); fences never stop rays.
function rayWorld(ox, oy, oz, dx, dy, dz, maxT, opts = {}) {
  let c = cellOf(ox), r = cellOf(oz);
  const stepC = dx > 0 ? 1 : -1, stepR = dz > 0 ? 1 : -1;
  const tdC = Math.abs(dx) > 1e-9 ? CELL / Math.abs(dx) : 1e9, tdR = Math.abs(dz) > 1e-9 ? CELL / Math.abs(dz) : 1e9;
  let tmC = Math.abs(dx) > 1e-9 ? ((dx > 0 ? (c + 1) * CELL - ox : ox - c * CELL) / Math.abs(dx)) : 1e9;
  let tmR = Math.abs(dz) > 1e-9 ? ((dz > 0 ? (r + 1) * CELL - oz : oz - r * CELL) / Math.abs(dz)) : 1e9;
  let tEnter = 0, enterAxis = -1, best = null;
  for (let guard = 0; guard < 400; guard++) {
    if (best && best.t <= tEnter) return best;
    if (tEnter > maxT) return best;
    const tExit = Math.min(tmC, tmR);
    if (!inMap(c, r)) return best || mkHit(tEnter, ox, oy, oz, dx, dy, dz, enterAxis, stepC, stepR, 'wall', -1);
    const i = cellIdx(c, r), t = L.type[i];
    const yIn = oy + dy * tEnter;
    if (t === T_VOID) {
      if (!(L.def.voidOpen)) return best || mkHit(tEnter, ox, oy, oz, dx, dy, dz, enterAxis, stepC, stepR, 'wall', i);
    } else if (t === T_WALL) {
      if (yIn < L.wallTop[i]) return best || mkHit(tEnter, ox, oy, oz, dx, dy, dz, enterAxis, stepC, stepR, 'wall', i);
      // above the wall: does the ray come down onto its top inside this cell?
      if (dy < 0) { const tt = (L.wallTop[i] - oy) / dy; if (tt >= tEnter && tt <= tExit) return best || mkHitF(tt, ox, oy, oz, dx, dy, dz, 0, 1, 0, 'wall', i); }
    } else {
      const fh = L.fh[i], ce = L.out[i] ? 1e9 : L.ceil[i];
      if (enterAxis >= 0 && yIn < fh) return best || mkHit(tEnter, ox, oy, oz, dx, dy, dz, enterAxis, stepC, stepR, 'wall', i);
      if (enterAxis >= 0 && yIn > ce && !L.out[i]) {
        // entered above the lintel: is it inside the structure?
        return best || mkHit(tEnter, ox, oy, oz, dx, dy, dz, enterAxis, stepC, stepR, 'wall', i);
      }
      if (dy < 0) { const tt = (fh - oy) / dy; if (tt >= tEnter && tt <= tExit && (!best || tt < best.t)) best = mkHitF(tt, ox, oy, oz, dx, dy, dz, 0, 1, 0, 'floor', i); }
      if (dy > 0 && ce < 1e8) { const tt = (ce - oy) / dy; if (tt >= tEnter && tt <= tExit && (!best || tt < best.t)) best = mkHitF(tt, ox, oy, oz, dx, dy, dz, 0, -1, 0, 'ceil', i); }
      if (t === T_DOOR) {
        const d = L.doorAt.get(i), sy = doorSlabY(d), x = cx2(c), z = cx2(r);
        const b = d.axis === 'x' ? [x - 1, sy, z - 0.12, x + 1, sy + DOOR_H, z + 0.12] : [x - 0.12, sy, z - 1, x + 0.12, sy + DOOR_H, z + 1];
        const h = rayBox(ox, oy, oz, dx, dy, dz, b);
        if (h && h.t >= 0 && (!best || h.t < best.t)) best = mkHitF(h.t, ox, oy, oz, dx, dy, dz, h.nx, h.ny, h.nz, 'door', i), best.door = d;
      }
      if ((t === T_WINDOW || t === T_VIEWPORT)) {
        const w = L.windows.get(i);
        if (w.intact && !opts.sight) {
          const x = cx2(c), z = cx2(r);
          let tt;
          if (w.axis === 'x') tt = Math.abs(dz) > 1e-9 ? (z - oz) / dz : -1; else tt = Math.abs(dx) > 1e-9 ? (x - ox) / dx : -1;
          const yy = oy + dy * tt;
          if (tt >= tEnter - 1e-6 && tt <= tExit + 1e-6 && yy > fh && yy < ce && (!best || tt < best.t)) {
            best = mkHitF(tt, ox, oy, oz, dx, dy, dz, w.axis === 'x' ? 0 : -Math.sign(dx), 0, w.axis === 'x' ? -Math.sign(dz) : 0, 'glass', i);
            best.win = w;
          }
        }
      }
    }
    const props = L.cellProps[i];
    if (props) for (const p of props) {
      if (!p.box || p.gone || (opts.ignore && opts.ignore === p)) continue;
      if (opts.sight && p.seeThrough) continue;
      const h = rayBox(ox, oy, oz, dx, dy, dz, p.box);
      if (h && h.t >= 0 && (!best || h.t < best.t)) { best = mkHitF(h.t, ox, oy, oz, dx, dy, dz, h.nx, h.ny, h.nz, 'prop', i); best.prop = p; }
    }
    if (tmC < tmR) { c += stepC; tEnter = tmC; tmC += tdC; enterAxis = 0; }
    else { r += stepR; tEnter = tmR; tmR += tdR; enterAxis = 1; }
  }
  return best;
}
function mkHit(t, ox, oy, oz, dx, dy, dz, axis, sc, sr, kind, i) {
  return { t, x: ox + dx * t, y: oy + dy * t, z: oz + dz * t, nx: axis === 0 ? -sc : 0, ny: 0, nz: axis === 1 ? -sr : 0, kind, i };
}
function mkHitF(t, ox, oy, oz, dx, dy, dz, nx, ny, nz, kind, i) {
  return { t, x: ox + dx * t, y: oy + dy * t, z: oz + dz * t, nx, ny, nz, kind, i };
}
// slab test; returns entry t and the normal of the entered face
function rayBox(ox, oy, oz, dx, dy, dz, b) {
  let tmin = -1e9, tmax = 1e9, nx = 0, ny = 0, nz = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let a = 0; a < 3; a++) {
    const lo = b[a], hi = b[a + 3];
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < lo || o[a] > hi) return null; continue; }
    let t1 = (lo - o[a]) / d[a], t2 = (hi - o[a]) / d[a], s = -1;
    if (t1 > t2) { const k = t1; t1 = t2; t2 = k; s = 1; }
    if (t1 > tmin) { tmin = t1; nx = a === 0 ? s : 0; ny = a === 1 ? s : 0; nz = a === 2 ? s : 0; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return { t: Math.max(tmin, 0), nx, ny, nz };
}
function losClear(x0, y0, z0, x1, y1, z1) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, d = Math.hypot(dx, dy, dz);
  if (d < 0.01) return true;
  const h = rayWorld(x0, y0, z0, dx / d, dy / d, dz / d, d, { sight: true });
  return !h || h.t >= d - 0.05;
}

// ---------------------------------------------------------------- pathfinding (A* on the grid, 8 directions)
function walkable(i) {
  if (i < 0) return false;
  const t = L.type[i];
  if (t !== T_FLOOR && t !== T_DOOR) return false;
  if (t === T_DOOR && L.doorAt.get(i).locked) return false;
  return !L.blocked[i];
}
function findPath(x0, z0, x1, z1, maxNodes = 1600) {
  const s = idxAt(x0, z0), e = idxAt(x1, z1);
  if (s < 0 || e < 0) return null;
  if (!walkable(e)) return null;
  if (s === e) return [[x1, z1]];
  const W = L.W, n = W * L.H;
  if (!L._pf || L._pf.n !== n) L._pf = { n, g: new Float32Array(n), from: new Int32Array(n), stamp: new Int32Array(n), closed: new Int32Array(n), run: 0 };
  const pf = L._pf; pf.run++;
  const run = pf.run;
  const ec = e % W, er = (e / W) | 0;
  const hfn = (i) => { const dc = Math.abs(i % W - ec), dr = Math.abs(((i / W) | 0) - er); return Math.max(dc, dr) + 0.41 * Math.min(dc, dr); };
  const open = [s]; const f = new Map(); pf.g[s] = 0; pf.stamp[s] = run; pf.from[s] = -1; f.set(s, hfn(s));
  let count = 0;
  while (open.length && count++ < maxNodes) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (f.get(open[k]) < f.get(open[bi])) bi = k;
    const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (cur === e) break;
    pf.closed[cur] = run;
    const c = cur % W, r = (cur / W) | 0;
    for (const [dc, dr] of N8) {
      const nc = c + dc, nr = r + dr;
      if (!inMap(nc, nr)) continue;
      const ni = cellIdx(nc, nr);
      if (pf.closed[ni] === run || !walkable(ni)) continue;
      if (Math.abs(L.fh[ni] - L.fh[cur]) > 0.6) continue;
      if (dc && dr) { // no corner cutting, and no diagonal moves through doors
        if (!walkable(cellIdx(c + dc, r)) || !walkable(cellIdx(c, r + dr))) continue;
        if (L.type[ni] === T_DOOR || L.type[cur] === T_DOOR) continue;
      }
      const ng = pf.g[cur] + (dc && dr ? 1.41 : 1);
      if (pf.stamp[ni] !== run || ng < pf.g[ni]) {
        if (pf.stamp[ni] !== run) open.push(ni);
        pf.stamp[ni] = run; pf.g[ni] = ng; pf.from[ni] = cur; f.set(ni, ng + hfn(ni));
      }
    }
  }
  if (pf.stamp[e] !== run) return null;
  const path = [];
  for (let k = e; k !== s && k >= 0; k = pf.from[k]) path.push([cx2(k % W), cx2((k / W) | 0)]);
  path.reverse();
  path[path.length - 1] = [x1, z1];
  return path;
}
