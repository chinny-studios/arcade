// Ashreach — procedural interiors (rooms and corridors on a tile grid): mission instances, Smuggler's Den and the Sunken Foundry

const IN_THEME = {
  office: { H: 4.2, wall: 0xc9c5b8, base: 0x4a4e54, floor: [0x7c828a, 0x737980], hall: 0x8e9196, ceil: 0xa8a8a2, light: 0xe8f0ff, panel: 0xf0f4ff, trim: 0x5fe0d0,
    atmos: { fog: 0x1a1d22, near: 18, far: 90, sky: false, hemiSky: 0xdde4ee, hemiGround: 0x4a4a48, hemiInt: 0.95, sunInt: 0.18, sunColor: 0xffffff, sunDir: [0.3, 1, 0.2] } },
  warehouse: { H: 7, wall: 0x8a8478, base: 0x55504a, floor: [0x67635c, 0x615d57], hall: 0x6e6a62, ceil: 0x3e3e3c, light: 0xffe0b0, panel: 0xffe8c0, trim: 0xffb347,
    atmos: { fog: 0x1c1a17, near: 18, far: 95, sky: false, hemiSky: 0xe0d8c8, hemiGround: 0x3a3630, hemiInt: 0.85, sunInt: 0.15, sunColor: 0xffe8c8, sunDir: [0.3, 1, 0.2] } },
  lab: { H: 4.6, wall: 0xdde3e5, base: 0x5a6a72, floor: [0xbcc5ca, 0xb2bcc2], hall: 0xc8d0d4, ceil: 0xc8ccce, light: 0xc8fff0, panel: 0xe0fff8, trim: 0x7dff9a,
    atmos: { fog: 0x141c1e, near: 18, far: 90, sky: false, hemiSky: 0xe0f4f0, hemiGround: 0x404a4c, hemiInt: 0.95, sunInt: 0.15, sunColor: 0xe8fff8, sunDir: [0.3, 1, 0.2] } },
  bunker: { H: 4, wall: 0x6e6c60, base: 0x3a3a34, floor: [0x5a5a52, 0x54544c], hall: 0x606058, ceil: 0x45453e, light: 0xffc880, panel: 0xffd090, trim: 0xd84a3a,
    atmos: { fog: 0x16150f, near: 14, far: 80, sky: false, hemiSky: 0xd8d0b8, hemiGround: 0x34322a, hemiInt: 0.8, sunInt: 0.12, sunColor: 0xffe0b0, sunDir: [0.3, 1, 0.2] } },
  cave: { H: 7, wall: 0x5a4a3c, base: 0x3a3028, floor: [0x5a4c3e, 0x524436], hall: 0x5e5040, ceil: 0x2e261f, light: 0xffa050, panel: null, trim: null,
    atmos: { fog: 0x0e0c0a, near: 12, far: 75, sky: false, hemiSky: 0xb8a890, hemiGround: 0x2a2018, hemiInt: 0.75, sunInt: 0.1, sunColor: 0xffd8a8, sunDir: [0.3, 1, 0.2] } },
  foundry: { H: 9, wall: 0x5c5852, base: 0x34302c, floor: [0x4a4642, 0x45413d], hall: 0x504a44, ceil: 0x2a2826, light: 0xff8a3a, panel: 0xffa050, trim: 0xff7a30,
    atmos: { fog: 0x1a100a, near: 16, far: 95, sky: false, hemiSky: 0xd8b8a0, hemiGround: 0x3a2418, hemiInt: 0.8, sunInt: 0.12, sunColor: 0xffb080, sunDir: [0.3, 1, 0.2] } },
};
const IN_SIZE = { s: { n: 30, rooms: [5, 6], rw: [4, 7] }, m: { n: 40, rooms: [7, 9], rw: [4, 8] }, l: { n: 50, rooms: [10, 12], rw: [4, 9] }, xl: { n: 64, rooms: [14, 17], rw: [5, 11] } };
const IN_CELL = 3;
const IN_NAMES = { office: 'Abandoned Offices', warehouse: 'Storage Depot', lab: 'Research Lab', bunker: 'Fortified Bunker', cave: 'Cave System', foundry: 'Foundry Works' };

// ---------- layout ----------
function in_layout(seed, theme, sz) {
  const rng = makeRng(seed >>> 0), S = IN_SIZE[sz], n = S.n;
  const solid = new Uint8Array(n * n).fill(1), room = new Int16Array(n * n).fill(-1);
  const cave = theme === 'cave';
  const rooms = [{ i: 2, j: (n >> 1) - 3, w: 6, d: 6, kind: 'entry' }];
  const want = rng.i(S.rooms[0], S.rooms[1]);
  for (let t = 0; t < 600 && rooms.length < want; t++) {
    const w = rng.i(S.rw[0], S.rw[1]), d = rng.i(S.rw[0], S.rw[1]), i = rng.i(2, n - w - 2), j = rng.i(2, n - d - 2);
    if (rooms.some((r) => i < r.i + r.w + 2 && i + w + 2 > r.i && j < r.j + r.d + 2 && j + d + 2 > r.j)) continue;
    rooms.push({ i, j, w, d, kind: 'room' });
  }
  const open = (i, j, k) => { if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1) return; solid[j * n + i] = 0; if (k !== undefined && room[j * n + i] < 0) room[j * n + i] = k; };
  rooms.forEach((r, k) => {
    for (let j = r.j; j < r.j + r.d; j++) for (let i = r.i; i < r.i + r.w; i++) {
      if (cave) {   // ragged ellipse
        const u = (i + 0.5 - r.i - r.w / 2) / (r.w / 2), v = (j + 0.5 - r.j - r.d / 2) / (r.d / 2);
        if (u * u + v * v > 1.1 + (hash2(i * 3 + seed, j * 7) - 0.5) * 0.5) continue;
      }
      open(i, j, k);
    }
  });
  // spanning tree over room centres plus a couple of loops
  const cx = (r) => r.i + (r.w >> 1), cz = (r) => r.j + (r.d >> 1);
  const edges = [], inT = [0];
  while (inT.length < rooms.length) {
    let best = null, bd = 1e9;
    for (const a of inT) rooms.forEach((b, bi) => { if (inT.includes(bi)) return; const d = Math.abs(cx(rooms[a]) - cx(b)) + Math.abs(cz(rooms[a]) - cz(b)); if (d < bd) { bd = d; best = [a, bi]; } });
    edges.push(best); inT.push(best[1]);
  }
  for (let t = 0; t < 2 && rooms.length > 4; t++) { const a = rng.i(1, rooms.length - 1), b = rng.i(1, rooms.length - 1); if (a !== b) edges.push([a, b]); }
  for (const [a, b] of edges) {
    let i = cx(rooms[a]), j = cz(rooms[a]);
    const i1 = cx(rooms[b]), j1 = cz(rooms[b]), hFirst = rng.chance(0.5);
    const step = (di, dj) => { open(i, j); open(i + 1, j); open(i, j + 1); open(i + 1, j + 1); if (cave && rng.chance(0.3)) open(i + (dj ? rng.i(-1, 2) : 0), j + (di ? rng.i(-1, 2) : 0)); i += di; j += dj; };
    if (hFirst) { while (i !== i1) step(Math.sign(i1 - i), 0); while (j !== j1) step(0, Math.sign(j1 - j)); }
    else { while (j !== j1) step(0, Math.sign(j1 - j)); while (i !== i1) step(Math.sign(i1 - i), 0); }
    step(0, 0);
  }
  // distances from the entry (for level scaling and the boss room)
  const dist = new Int32Array(n * n).fill(-1), q = [cz(rooms[0]) * n + cx(rooms[0])];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % n, j = (k / n) | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k2 = (j + b) * n + i + a; if (!solid[k2] && dist[k2] < 0) { dist[k2] = dist[k] + 1; q.push(k2); } }
  }
  let maxD = 1, boss = 1;
  rooms.forEach((r, k) => { r.dist = Math.max(0, dist[cz(r) * n + cx(r)]); if (k && r.dist > maxD) { maxD = r.dist; boss = k; } });
  if (rooms.length > 1) rooms[boss].kind = 'boss';
  for (const r of rooms) if (r.kind === 'room' && r.w * r.d >= 56) r.kind = 'hall';
  return { n, solid, room, rooms, maxD, rng };
}

// size accepts 's'|'m'|'l'|'xl' or 1..4
function makeInteriorDef(o) {
  const theme = IN_THEME[o.theme] ? o.theme : 'warehouse', T = IN_THEME[theme];
  const sz = typeof o.size === 'number' ? ['s', 's', 'm', 'l', 'xl'][clamp(Math.round(o.size), 1, 4)] : IN_SIZE[o.size] ? o.size : 'm';
  const seed = (o.seed ?? strSeed(String(o.id))) >>> 0;
  const L = in_layout(seed, theme, sz), n = L.n, C = IN_CELL, x0 = -(n * C) / 2;
  const lvl = Array.isArray(o.lvl) ? o.lvl : [Math.max(1, (o.lvl || 10) - 1), (o.lvl || 10) + 1];
  const W = (i) => x0 + i * C;
  const rooms = L.rooms.map((r) => ({ x: W(r.i + r.w / 2), z: W(r.j + r.d / 2), w: r.w * C, d: r.d * C, kind: r.kind }));
  const id = o.id || 'mission', E = L.rooms[0];
  const ez = W(E.j + E.d / 2);
  const arriveId = o.arriveId || id + '_arrive';
  const pois = [
    { id: arriveId, type: 'arrive', x: W(E.i) + 3.5, z: ez, yaw: Math.PI / 2, name: 'Entrance' },
    { id: id + '_exit', type: 'door', x: W(E.i) + 0.9, z: ez, yaw: Math.PI / 2, name: 'Exit', data: o.back ? { to: o.back.zone, poi: o.back.poi } : {}, noProp: true, clear: 0 },
  ];
  const mobs = o.mobs && o.mobs.length ? o.mobs : ['merc'];
  const spawns = [];
  const rsp = o.respawn ?? 1e9;
  L.rooms.forEach((r, k) => {
    if (!k) return;
    const R = rooms[k], f = r.dist / L.maxD, lv = [Math.round(lerp(lvl[0], lvl[1], f * 0.7)), Math.round(lerp(lvl[0], lvl[1], Math.min(1, f * 0.7 + 0.35)))];
    if (r.kind === 'boss' && o.boss) {
      spawns.push({ x: R.x, z: R.z, r: 2, mobs: [o.boss], n: 1, lvl: [lvl[1], lvl[1]], respawn: o.bossRespawn ?? rsp, boss: true });
      spawns.push({ x: R.x, z: R.z, r: Math.min(R.w, R.d) * 0.3, mobs, n: 2, lvl: [lvl[1] - 1, lvl[1]], camp: true, respawn: rsp });
    } else spawns.push({ x: R.x, z: R.z, r: Math.max(2, Math.min(R.w, R.d) * 0.3), mobs, n: r.kind === 'hall' ? L.rng.i(3, 5) : L.rng.i(2, 3), lvl: lv, camp: true, respawn: rsp });
  });
  const def = {
    id, name: o.name || IN_NAMES[theme], kind: 'interior', theme, seed, lvl, size: n * C, safe: false, music: 'dungeon',
    atmos: T.atmos, spawns, pois, exits: [], rooms, entry: arriveId,
    bounds: { x0: x0 + C, z0: x0 + C, x1: -x0 - C, z1: -x0 - C },
    returnTo: o.back ? { zone: o.back.zone, poi: o.back.poi } : null,
    build: in_build,
  };
  Object.defineProperty(def, '_L', { value: L, enumerable: false });
  return def;
}

// ---------- building ----------
function in_build(def) {
  const T = IN_THEME[def.theme], L = def._L || in_layout(def.seed, def.theme, 'm'), n = L.n, C = IN_CELL, x0 = -(n * C) / 2, H = T.H;
  const rng = makeRng((def.seed ^ 0x5bd1e995) >>> 0);
  const S = L.solid, cave = def.theme === 'cave';
  const sol = (i, j) => i < 0 || j < 0 || i >= n || j >= n || S[j * n + i] === 1;
  const fl = T.floor.map((c) => wdC(c));
  WD.tiles = { x0, z0: x0, cell: C, nx: n, nz: n, solid: S, mapCol: (i, j) => (L.room[j * n + i] >= 0 ? '#6a747c' : '#4e565c') };
  // floors + ceilings (per row runs)
  for (let j = 0; j < n; j++) {
    let i = 0;
    while (i < n) {
      if (sol(i, j)) { i++; continue; }
      let e = i; while (e < n && !sol(e, j)) e++;
      const za = x0 + j * C, zb = za + C;
      for (let k = i; k < e; k++) {
        const xa = x0 + k * C, xb = xa + C, inRoom = L.room[j * n + k] >= 0;
        const c = inRoom ? fl[(k + j) & 1] : wdC(T.hall);
        const jt = cave ? 0.85 + hash2(k, j) * 0.3 : 1;
        wdPoly('flat', [[xa, 0, za], [xa, 0, zb], [xb, 0, zb], [xb, 0, za]], [c[0] * jt, c[1] * jt, c[2] * jt]);
      }
      const xa = x0 + i * C, xb = x0 + e * C;
      wdPoly('flat', [[xa, H, za], [xb, H, za], [xb, H, zb], [xa, H, zb]], T.ceil);
      i = e;
    }
  }
  // walls: runs of solid tiles that touch open space
  const edge = (i, j) => { if (!sol(i, j)) return false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!sol(i + a, j + b)) return true; return false; };
  const rocks = [];
  for (let j = 0; j < n; j++) {
    let i = 0;
    while (i < n) {
      if (!edge(i, j)) { i++; continue; }
      let e = i; while (e < n && edge(e, j)) e++;
      const xa = x0 + i * C, w = (e - i) * C, zc = x0 + j * C + C / 2;
      wdBox(xa + w / 2, 0, zc, w, H, C, T.wall, 0, 'lit', 0x1a1a1a);
      if (!cave) {
        wdBox(xa + w / 2, 0, zc, w + 0.16, 0.35, C + 0.16, T.base, 0, 'flat');
        if (T.trim) wdBox(xa + w / 2, H * 0.72, zc, w + 0.1, 0.09, C + 0.1, T.trim, 0, def.theme === 'office' || def.theme === 'lab' ? 'glow' : 'flat');
        if (def.theme === 'warehouse' || def.theme === 'foundry') for (let k = i; k < e; k += 2) wdBox(x0 + k * C + C / 2, 0, zc, 0.5, H, C + 0.3, T.base, 0, 'lit');
      } else for (let k = i; k < e; k++) {
        if (rng.chance(0.75)) rocks.push({ x: x0 + k * C + C / 2 + rng.r(-0.4, 0.4), z: zc + rng.r(-0.4, 0.4), y: rng.r(0.2, H * 0.6), s: rng.r(1.5, 2.3), tint: rng.chance(0.5) ? 0x8a7460 : 0x6e5e4e, col: 0 });
      }
      i = e;
    }
  }
  if (rocks.length) wdScatter('rock', rocks, { cast: false });
  // exit door on the entry wall
  const ex = def.pois.find((p) => p.type === 'door');
  if (ex) {
    const dx = ex.x - 0.9;
    wdBox(dx + 0.05, 0, ex.z, 0.2, 3.3, 3.2, cave ? 0x3a3028 : 0x3a3e44);
    wdBox(dx + 0.17, 0, ex.z, 0.06, 2.9, 2.4, 0x0c0e10, 0, 'flat');
    wdBox(dx + 0.2, 3.0, ex.z, 0.05, 0.18, 2.4, cave ? 0xffd890 : 0x7dff9a, 0, 'glow');
    wdLight(dx + 1.5, 2.6, ex.z, cave ? 0xffd890 : 0x7dff9a, 1, 9);
  }
  // per-room lights, ceiling panels and furniture
  L.rooms.forEach((r, k) => {
    const R = def.rooms[k];
    wdLight(R.x, H - 0.8, R.z, T.light, r.kind === 'boss' ? 1.8 : 1.3, Math.max(R.w, R.d) * 0.9 + 6);
    if (T.panel && !cave) for (let j = r.j + 1; j < r.j + r.d - 1; j += 2) for (let i = r.i + 1; i < r.i + r.w - 1; i += 2) {
      const x = x0 + i * C + C / 2, z = x0 + j * C + C / 2;
      if (def.theme === 'warehouse' || def.theme === 'foundry') { wdBox(x, H - 2.2, z, 0.05, 2.2, 0.05, 0x2a2a2a); wdPrism(x, H - 2.6, z, 0.7, 0.25, 0.4, 6, 0x3a3a3a); wdPrism(x, H - 2.62, z, 0.55, 0.55, 0.03, 6, T.panel, 0, 'glow'); }
      else wdPoly('glow', [[x - 0.7, H - 0.03, z - 0.5], [x + 0.7, H - 0.03, z - 0.5], [x + 0.7, H - 0.03, z + 0.5], [x - 0.7, H - 0.03, z + 0.5]], T.panel);
    }
    in_furnish(def, r, R, k, L, rng);
  });
  // corridors get sparse lights
  for (let j = 1; j < n - 1; j += 7) for (let i = 1; i < n - 1; i += 7) {
    if (sol(i, j) || L.room[j * n + i] >= 0) continue;
    const x = x0 + i * C + C / 2, z = x0 + j * C + C / 2;
    wdLight(x, H - 0.6, z, T.light, 0.8, 12);
    if (!cave) wdPoly('glow', [[x - 0.4, H - 0.03, z - 0.4], [x + 0.4, H - 0.03, z - 0.4], [x + 0.4, H - 0.03, z + 0.4], [x - 0.4, H - 0.03, z + 0.4]], T.panel || T.light);
  }
  if (cave) {
    const stal = [];
    for (let t = 0; t < n * n * 0.35; t++) {
      const i = rng.i(1, n - 2), j = rng.i(1, n - 2); if (sol(i, j)) continue;
      const x = x0 + i * C + rng.r(0.3, C - 0.3), z = x0 + j * C + rng.r(0.3, C - 0.3), up = rng.chance(0.35);
      if (up) { if (in_nearDoor(def, x, z)) continue; stal.push([x, z]); wdPrism(x, 0, z, rng.r(0.3, 0.6), 0, rng.r(1, 2.6), 5, 0x6a5a48); wdColCyl(x, z, 0.35, 0, 2).nomap = true; }
      else {   // stalactite: inverted pyramid
        const L2 = rng.r(1, 2.8), r2 = rng.r(0.3, 0.6), tip = [x, H - L2, z], B = [];
        for (let q = 0; q < 4; q++) { const a = (q / 4) * TAU + i; B.push([x + Math.cos(a) * r2, H, z + Math.sin(a) * r2]); }
        for (let q = 0; q < 4; q++) wdPoly('lit', [B[q], B[(q + 1) % 4], tip], 0x4a3e32, [x, H - L2 * 0.4, z]);
      }
    }
    wdScatter('lumen', wdSpread(rng, 160, { x0: x0, z0: x0, x1: -x0, z1: -x0 }, (x, z, r) => {
      const i = Math.floor((x - x0) / C), j = Math.floor((z - x0) / C);
      return !sol(i, j) && (sol(i + 1, j) || sol(i - 1, j) || sol(i, j + 1) || sol(i, j - 1)) ? { x, z, s: r.r(0.8, 1.5), glowTint: r.chance(0.6) ? 0x5fe0d0 : 0xb080ff, col: 0 } : null;
    }, 0));
    wdMotes({ color: 0xc8b8a0, n: 160, size: 0.08, r: 25, h: 7, opacity: 0.4, drift: 0.2 });
  } else if (def.theme === 'foundry') wdMotes({ color: 0xffa050, n: 220, size: 0.12, r: 30, h: 9, opacity: 0.8, glow: true, vy: 0.6, drift: 0.3 });
  else wdMotes({ color: 0xdde4ee, n: 120, size: 0.06, r: 20, h: 5, opacity: 0.3, drift: 0.1 });
}
function in_nearDoor(def, x, z) { return def.pois.some((p) => Math.hypot(p.x - x, p.z - z) < 5); }

// ---------- furniture ----------
const IN_PROPS = {
  office: {
    wall: (x, z, yaw, r) => r.chance(0.5) ? in_desk(x, z, yaw, r) : r.chance(0.5) ? in_cabinet(x, z, yaw, 0x8a9096) : in_plant(x, z),
    mid: (x, z, yaw, r) => { in_desk(x, z, yaw, r); in_desk(x + Math.sin(yaw) * 2.2, z + Math.cos(yaw) * 2.2, yaw + Math.PI, r); },
  },
  warehouse: {
    wall: (x, z, yaw, r) => r.chance(0.6) ? in_shelf(x, z, yaw, r) : in_crates(x, z, r),
    mid: (x, z, yaw, r) => r.chance(0.6) ? in_crates(x, z, r, 3) : in_barrels(x, z, r),
  },
  lab: {
    wall: (x, z, yaw, r) => r.chance(0.45) ? in_bench(x, z, yaw, r) : r.chance(0.5) ? in_tank(x, z, r) : in_server(x, z, yaw, r),
    mid: (x, z, yaw, r) => r.chance(0.5) ? in_tank(x, z, r, 1.3) : in_bench(x, z, yaw, r),
  },
  bunker: {
    wall: (x, z, yaw, r) => r.chance(0.4) ? in_bunk(x, z, yaw) : r.chance(0.5) ? in_cabinet(x, z, yaw, 0x5a6a50) : in_crates(x, z, r),
    mid: (x, z, yaw, r) => r.chance(0.5) ? in_sandbags(x, z, yaw) : in_crates(x, z, r, 2),
  },
  cave: {
    wall: (x, z, yaw, r) => r.chance(0.5) ? in_crates(x, z, r) : in_barrels(x, z, r),
    mid: (x, z, yaw, r) => r.chance(0.4) ? in_campfire(x, z) : in_crates(x, z, r, 2),
  },
  foundry: {
    wall: (x, z, yaw, r) => r.chance(0.5) ? in_machine(x, z, yaw, r) : in_pipes(x, z, yaw),
    mid: (x, z, yaw, r) => r.chance(0.6) ? in_vat(x, z) : in_machine(x, z, yaw, r),
  },
};
function in_furnish(def, r, R, k, L, rng) {
  const n = L.n, C = IN_CELL, x0 = -(n * C) / 2, S = L.solid, P = IN_PROPS[def.theme];
  const sol = (i, j) => i < 0 || j < 0 || i >= n || j >= n || S[j * n + i] === 1;
  const used = [];
  const free = (x, z, d) => !used.some((u) => Math.hypot(u[0] - x, u[1] - z) < d) && !in_nearDoor(def, x, z);
  // against walls: ring tiles whose outer neighbour is solid and whose ring neighbours are not doorways
  for (let j = r.j; j < r.j + r.d; j++) for (let i = r.i; i < r.i + r.w; i++) {
    if (sol(i, j) || L.room[j * n + i] !== k) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!sol(i + a, j + b)) continue;
      if (!sol(i + a - b, j + b - a) || !sol(i + a + b, j + b + a)) continue;
      if (!sol(i - b + a * 0, j - a) && L.room[(j - a) * n + i - b] < 0) continue;
      if (!sol(i + b, j + a) && L.room[(j + a) * n + i + b] < 0) continue;
      if (!rng.chance(def.theme === 'cave' ? 0.18 : 0.42)) continue;
      const x = x0 + i * C + C / 2 + a * 0.55, z = x0 + j * C + C / 2 + b * 0.55, yaw = Math.atan2(-a, -b);
      if (!free(x, z, 2.6)) continue;
      used.push([x, z]);
      P.wall(x, z, yaw, rng);
    }
  }
  // centre pieces in halls and the boss room's dais
  if (r.kind === 'hall' || (r.kind === 'room' && r.w >= 6 && r.d >= 6)) {
    const m = Math.floor(Math.min(r.w, r.d) / 3);
    for (let t = 0; t < m * 2; t++) {
      const x = R.x + rng.r(-R.w / 2 + 4, R.w / 2 - 4), z = R.z + rng.r(-R.d / 2 + 4, R.d / 2 - 4);
      if (!free(x, z, 4.5) || Math.hypot(x - R.x, z - R.z) < 2.5) continue;
      used.push([x, z]);
      P.mid(x, z, rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), rng);
    }
  }
  if (r.kind === 'boss') {
    const T = IN_THEME[def.theme];
    wdPrism(R.x, 0, R.z, Math.min(R.w, R.d) * 0.32, Math.min(R.w, R.d) * 0.3, 0.12, 12, T.base, 0, 'flat');
    wdPrism(R.x, 0, R.z, Math.min(R.w, R.d) * 0.3 + 0.05, Math.min(R.w, R.d) * 0.3, 0.14, 12, T.trim || 0xffa050, 0, 'glow', undefined, false);
  }
}
const in_solid = (x, z, w, h, d, col, yaw, top, mat) => { wdBox(x, 0, z, w, h, d, col, yaw, mat || 'lit', top); wdColObb(x, z, w, d, yaw, 0, h).nomap = true; };
function in_desk(x, z, yaw, r) {
  const f = ctFrame(x, z, yaw);
  in_solid(x, z, 1.8, 0.76, 0.9, 0x6a5a48, yaw, 0x8a7a64);
  const [mx, mz] = f(0, -0.2); wdBox(mx, 0.76, mz, 0.7, 0.45, 0.08, 0x22262a, yaw);
  const [sx, sz] = f(0, -0.15); wdBox(sx, 0.82, sz, 0.6, 0.34, 0.02, r.chance(0.7) ? 0x6fc8ff : 0x7dff9a, yaw, 'glow');
  const [cx, cz] = f(0.2, 0.9); wdBox(cx, 0, cz, 0.55, 0.5, 0.55, 0x2a2e34, yaw + r.r(-0.4, 0.4)); wdBox(...[f(0.2, 1.15)].map((p) => p[0]), 0.5, f(0.2, 1.15)[1], 0.55, 0.6, 0.08, 0x2a2e34, yaw);
}
function in_cabinet(x, z, yaw, col) { in_solid(x, z, 1.2, 1.9, 0.6, col, yaw); const f = ctFrame(x, z, yaw); for (let i = 0; i < 3; i++) { const [hx, hz] = f(0, 0.31); wdBox(hx, 0.4 + i * 0.55, hz, 0.4, 0.05, 0.02, 0x222222, yaw); } }
function in_plant(x, z) { wdPrism(x, 0, z, 0.35, 0.28, 0.6, 6, 0x8a6a4a); wdGeo(new THREE.IcosahedronGeometry(0.55, 0), new THREE.Matrix4().makeTranslation(x, 1.05, z), 0x4a7a3a); wdColCyl(x, z, 0.4, 0, 1.4).nomap = true; }
function in_shelf(x, z, yaw, r) {
  const f = ctFrame(x, z, yaw);
  for (const s of [-1, 1]) { const [px, pz] = f(s * 1.3, 0); wdBox(px, 0, pz, 0.12, 4, 1.0, 0x3a6a9a, yaw); }
  for (let k = 0; k < 4; k++) {
    wdBox(x, 0.2 + k * 1.2, z, 2.7, 0.08, 1.0, 0xd88a2a, yaw);
    if (k < 3) for (let q = 0; q < 2; q++) if (r.chance(0.75)) { const [bx, bz] = f(-0.65 + q * 1.3, 0); wdBox(bx, 0.28 + k * 1.2, bz, 1.0, 0.8, 0.8, r.pick([0x8a7050, 0x6a6a5a, 0x7a5a3a]), yaw + r.r(-0.1, 0.1)); }
  }
  wdColObb(x, z, 2.8, 1.0, yaw, 0, 4).nomap = true;
}
function in_crates(x, z, r, n = 2) {
  for (let k = 0; k < n; k++) {
    const s = r.r(1.0, 1.5), ox = r.r(-0.8, 0.8), oz = r.r(-0.8, 0.8), col = r.pick([0x7a6a4a, 0x5a6a50, 0x6a5a40, 0x4a5a6a]);
    in_solid(x + ox, z + oz, s, s, s, col, r.r(0, 1), 0x8a7a5a);
    if (r.chance(0.45)) wdBox(x + ox, s, z + oz, s * 0.8, s * 0.8, s * 0.8, col, r.r(0, 1), 'lit', 0x9a8a6a);
  }
}
function in_barrels(x, z, r) { for (let k = 0; k < 3; k++) { const bx = x + r.r(-0.9, 0.9), bz = z + r.r(-0.9, 0.9), c = r.pick([0x5a6a4a, 0x8a3a2a, 0x3a5a7a]); wdPrism(bx, 0, bz, 0.42, 0.42, 1.1, 8, c, 0, 'lit', 0x3a3a3a); wdColCyl(bx, bz, 0.42, 0, 1.1).nomap = true; } }
function in_bench(x, z, yaw, r) {
  const f = ctFrame(x, z, yaw);
  in_solid(x, z, 2.6, 0.9, 0.9, 0xd8dee0, yaw, 0x8a9aa0);
  for (let i = 0; i < 3; i++) { const [tx, tz] = f(-0.8 + i * 0.8, 0); wdPrism(tx, 0.9, tz, 0.08, 0.08, 0.35, 6, r.pick([0x7dff9a, 0x6fc8ff, 0xffd27a]), 0, 'glow'); }
  const [sx, sz] = f(0.6, -0.3); wdBox(sx, 0.9, sz, 0.6, 0.45, 0.06, 0x22262a, yaw);
}
function in_tank(x, z, r, s = 1) {
  wdPrism(x, 0, z, 0.75 * s, 0.75 * s, 0.4, 10, 0x5a6a72); wdPrism(x, 0.4, z, 0.62 * s, 0.62 * s, 2.0 * s, 10, r.chance(0.5) ? 0x6fe8a0 : 0x5fd0e0, 0, 'glow');
  wdPrism(x, 0.4 + 2 * s, z, 0.75 * s, 0.55 * s, 0.4, 10, 0x5a6a72);
  if (r.chance(0.6)) wdBox(x, 0.9, z, 0.35 * s, 0.9 * s, 0.25 * s, 0x2a4038);
  wdColCyl(x, z, 0.75 * s, 0, 2.8 * s).nomap = true;
}
function in_server(x, z, yaw, r) {
  const f = ctFrame(x, z, yaw);
  in_solid(x, z, 1.0, 2.2, 0.9, 0x2a2e34, yaw);
  for (let i = 0; i < 6; i++) { const [lx, lz] = f(r.r(-0.35, 0.35), 0.46); wdBox(lx, 0.3 + i * 0.3, lz, 0.08, 0.05, 0.02, r.pick([0x7dff9a, 0xff5a4a, 0x6fc8ff]), yaw, 'glow'); }
}
function in_bunk(x, z, yaw) {
  const f = ctFrame(x, z, yaw);
  for (const y of [0.4, 1.5]) { wdBox(x, y, z, 2.1, 0.2, 0.9, 0x4a4e44, yaw); wdBox(x, y + 0.2, z, 1.9, 0.12, 0.8, 0x8a8a70, yaw); }
  for (const s of [-1, 1]) for (const t of [-1, 1]) { const [px, pz] = f(s * 1.0, t * 0.4); wdBox(px, 0, pz, 0.08, 2.0, 0.08, 0x3a3a34, yaw); }
  wdColObb(x, z, 2.1, 0.9, yaw, 0, 2).nomap = true;
}
function in_sandbags(x, z, yaw) {
  const f = ctFrame(x, z, yaw);
  for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < 4 - (r2 & 1); i++) { const [bx, bz] = f(-1.2 + i * 0.8 + (r2 & 1) * 0.4, 0); wdBox(bx, r2 * 0.32, bz, 0.78, 0.32, 0.6, 0x8a7a5a, yaw); }
  wdColObb(x, z, 3.2, 0.7, yaw, 0, 1).nomap = true;
}
function in_campfire(x, z) { ctFire(x, z, 0xff9a40); wdColCyl(x, z, 0.9, 0, 0.5).nomap = true; }
function in_machine(x, z, yaw, r) {
  const f = ctFrame(x, z, yaw);
  in_solid(x, z, 2.8, 2.6, 2.0, 0x5a5650, yaw, 0x6a6660);
  const [px, pz] = f(0, 1.02); wdBox(px, 1.2, pz, 1.4, 0.8, 0.05, 0xff8a3a, yaw, 'glow');
  const [cx, cz] = f(-0.8, -0.4); wdPrism(cx, 2.6, cz, 0.35, 0.3, 2.6, 8, 0x4a4642);
  if (r.chance(0.5)) { const [gx, gz] = f(0.8, 0); wdPrism(gx, 2.6, gz, 0.6, 0.6, 0.5, 10, 0x8a8a84); }
}
function in_pipes(x, z, yaw) {
  const f = ctFrame(x, z, yaw);
  for (let i = 0; i < 3; i++) { const [px, pz] = f(-0.9 + i * 0.9, -0.1); wdPrism(px, 0, pz, 0.3, 0.3, 8, 8, i === 1 ? 0x8a5a3a : 0x6a6a64); }
  const [vx, vz] = f(0, 0.25); wdBox(vx, 1.2, vz, 0.5, 0.5, 0.3, 0xc8a040, yaw);
  wdColObb(x, z, 2.6, 0.8, yaw, 0, 8).nomap = true;
}
function in_vat(x, z) {
  wdPrism(x, 0, z, 2.2, 2.2, 2.4, 12, 0x4a4642, 0, 'lit', 0x3a3632);
  wdPrism(x, 2.4, z, 1.9, 1.9, 0.06, 12, 0xff7a20, 0, 'glow');
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; wdBox(x + Math.cos(a) * 2.25, 0, z + Math.sin(a) * 2.25, 0.3, 3.4, 0.3, 0x2a2826, -a); }
  wdBox(x, 3.4, z, 4.8, 0.3, 0.4, 0x2a2826); wdBox(x, 3.4, z, 0.4, 0.3, 4.8, 0x2a2826);
  wdLight(x, 3.5, z, 0xff7a20, 1.4, 16);
  wdColCyl(x, z, 2.3, 0, 3.4).nomap = true;
}

// ---------- the two hand-made dungeons ----------
registerZone(Object.assign(makeInteriorDef({ id: 'smugglers_den', seed: 1107, theme: 'cave', size: 'l', lvl: [6, 11], mobs: ['smuggler'], boss: 'smuggler_boss', name: "Smuggler's Den",
  back: { zone: 'landfall', poi: 'landfall_den_out' }, arriveId: 'den_arrive', respawn: 150, bossRespawn: 600 }), { lvl: [6, 11] }));
registerZone(Object.assign(makeInteriorDef({ id: 'sunken_foundry', seed: 4630, theme: 'foundry', size: 'xl', lvl: [30, 46], mobs: ['foundry_bot', 'foundry_tech', 'slag_golem'], boss: 'overseer', name: 'Sunken Foundry',
  back: { zone: 'broken_mesa', poi: 'mesa_foundry_out' }, arriveId: 'foundry_arrive', respawn: 180, bossRespawn: 900 }), { lvl: [30, 46] }));
