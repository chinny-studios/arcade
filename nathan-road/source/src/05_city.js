// 05_city: turns the baked map (02_map.js) into the world: a 1 m ground raster for heights and walkability, wall
// segments for collision, and meshes for the ground, kerbs, road markings, buildings, signs, lamps, rails, trees,
// the harbour and the Hong Kong Island backdrop. Everything is in metres from Milton Mansion, x east, z south.
const W = {
  names: MAP.names, walk: MAP.walk, detail: MAP.detail,
  rx0: MAP.detail[0], rz0: MAP.detail[1], rw: 0, rh: 0, raster: null,   // ground classes, see G below
  cells: new Map(), cell: 16,                                         // collision segments by cell
  buildings: [], byName: {}, lamps: [], shopFronts: [], edges: [], nodes: [], stops: [], signals: [], trees: [],
  roadNames: [], meshes: [], farMeshes: [], signSpots: [],
};
const G = { ROAD: 0, PAVE: 1, BUILD: 2, SEA: 3, GREEN: 4, NONE: 5 };
const nameOf = (i) => (i >= 0 ? MAP.names[i] : '');
const enName = (s) => { const m = /[A-Za-z0-9].*$/.exec(s || ''); return m ? m[0].trim() : s; };
const zhName = (s) => { const m = /^[^A-Za-z]+/.exec(s || ''); return m ? m[0].trim() : ''; };

// ---------------------------------------------------------------- decode
function decodeBuildings() {
  for (const b of MAP.b) {
    const [kind, h, mh, flags, name, nr] = b;
    const lens = b.slice(6, 6 + nr);
    let o = 6 + nr; const rings = [];
    for (const n of lens) { rings.push(dmRing(b.slice(o, o + n * 2))); o += n * 2; }
    const [cx, cz] = ringCentroid(rings[0]);
    const B = { kind, h: h / 10, mh: mh / 10, guessed: !!(flags & 1), parkRoof: !!(flags & 2), name: nameOf(name), rings, cx, cz, area: Math.abs(ringArea(rings[0])) };
    B.inWalk = cx > W.walk[0] - 40 && cx < W.walk[2] + 40 && cz > W.walk[1] - 40 && cz < W.walk[3] + 40;
    W.buildings.push(B);
    const en = enName(B.name);
    if (en && (!W.byName[en] || W.byName[en].area < B.area)) W.byName[en] = B;
  }
}
function decodeGraph() {
  const N = MAP.nodes;
  for (let i = 0; i < N.length; i += 2) W.nodes.push({ x: N[i] / 10, z: N[i + 1] / 10, out: [], inn: [] });
  const CLS = ['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service', 'trunk', 'motorway', 'living_street'];
  MAP.edges.forEach((e, i) => {
    const [a, b, cls, ow, w, name] = e;
    const pts = [W.nodes[a].x, W.nodes[a].z];
    for (let k = 6; k < e.length; k++) pts.push(e[k] / 10);
    pts.push(W.nodes[b].x, W.nodes[b].z);
    let len = 0; for (let k = 2; k < pts.length; k += 2) len += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
    const E = { i, a, b, cls: CLS[cls], ow, w: w / 10, name: nameOf(name), pts, len };
    W.edges.push(E);
    W.nodes[a].out.push(E); W.nodes[b].inn.push(E);
  });
}
// point and heading at distance d along a polyline
function polyAt(pts, d) {
  for (let k = 2; k < pts.length; k += 2) {
    const dx = pts[k] - pts[k - 2], dz = pts[k + 1] - pts[k - 1], l = Math.hypot(dx, dz);
    if (d <= l || k === pts.length - 2) { const t = l > 0 ? clamp(d / l, 0, 1) : 0; return [pts[k - 2] + dx * t, pts[k - 1] + dz * t, dx / (l || 1), dz / (l || 1)]; }
    d -= l;
  }
  return [pts[0], pts[1], 1, 0];
}

// ---------------------------------------------------------------- raster (1 m) of ground classes
function buildRaster() {
  const D = MAP.detail, w = W.rw = D[2] - D[0], h = W.rh = D[3] - D[1];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = 'rgb(3,0,0)'; x.fillRect(0, 0, w, h);                      // sea
  const fillPolys = (list, col) => {
    x.fillStyle = col; x.beginPath();
    for (const P of list) for (const r of P) { for (let i = 0; i < r.length; i += 2) { const px = r[i] / 10 - D[0], pz = r[i + 1] / 10 - D[1]; if (i) x.lineTo(px, pz); else x.moveTo(px, pz); } x.closePath(); }
    x.fill('evenodd');
  };
  fillPolys(MAP.floor, 'rgb(0,0,0)');
  fillPolys(MAP.pave, 'rgb(1,0,0)');
  fillPolys(MAP.green, 'rgb(4,0,0)');
  x.fillStyle = 'rgb(2,0,0)';
  for (const B of W.buildings) {
    if (B.mh > 2.5) continue;                       // raised parts: you can walk under them
    x.beginPath();
    for (const r of B.rings) { for (let i = 0; i < r.length; i += 2) { const px = r[i] - D[0], pz = r[i + 1] - D[1]; if (i) x.lineTo(px, pz); else x.moveTo(px, pz); } x.closePath(); }
    x.fill('evenodd');
  }
  const d = x.getImageData(0, 0, w, h).data;
  const R = W.raster = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) R[i] = d[i * 4];
  // close hairline gaps between land polygons (sea pixels with land on both sides) so they don't block walking
  for (let pass = 0; pass < 2; pass++) for (let j = 2; j < h - 2; j++) for (let i = 2; i < w - 2; i++) {
    const k = j * w + i; if (R[k] !== G.SEA) continue;
    const L = (a) => a !== G.SEA && a !== G.NONE;
    if ((L(R[k - 1]) || L(R[k - 2])) && (L(R[k + 1]) || L(R[k + 2])) || (L(R[k - w]) || L(R[k - 2 * w])) && (L(R[k + w]) || L(R[k + 2 * w]))) R[k] = G.ROAD;
  }
}
function gclass(x, z) {
  const i = Math.floor(x - W.rx0), j = Math.floor(z - W.rz0);
  if (i < 0 || j < 0 || i >= W.rw || j >= W.rh) return G.NONE;
  return W.raster[j * W.rw + i];
}
const KERB = 0.15;
const GH = [0, KERB, KERB, -3, KERB + 0.02, 0];
// ground height with kerbs eased over half a metre
function groundAt(x, z) {
  const fx = x - W.rx0 - 0.5, fz = z - W.rz0 - 0.5, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const h = (a, b) => { if (a < 0 || b < 0 || a >= W.rw || b >= W.rh) return 0; return GH[W.raster[b * W.rw + a]]; };
  const s = (t) => smooth(0.25, 0.75, t);
  const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
  return lerp(lerp(a, b, s(tx)), lerp(c, d, s(tx)), s(tz));
}

// ---------------------------------------------------------------- collision segments
function addSeg(ax, az, bx, bz, tag) {
  const C = W.cell, s = [ax, az, bx, bz, tag || 0];
  const x0 = Math.floor(Math.min(ax, bx) / C), x1 = Math.floor(Math.max(ax, bx) / C), z0 = Math.floor(Math.min(az, bz) / C), z1 = Math.floor(Math.max(az, bz) / C);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
    const k = i * 65536 + j; let L = W.cells.get(k); if (!L) W.cells.set(k, L = []); L.push(s);
  }
}
function addRingSegs(r, tag) { for (let i = 0, n = r.length; i < n; i += 2) { const j = (i + 2) % n; addSeg(r[i], r[i + 1], r[j], r[j + 1], tag); } }
function addCircle(x, z, r, n = 6, tag) { for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU; addSeg(x + Math.cos(a0) * r, z + Math.sin(a0) * r, x + Math.cos(a1) * r, z + Math.sin(a1) * r, tag); } }
function addBox(x, z, hw, hd, rot, tag) {
  const c = Math.cos(rot), s = Math.sin(rot), P = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [x + u * c - v * s, z + u * s + v * c]);
  for (let i = 0; i < 4; i++) addSeg(P[i][0], P[i][1], P[(i + 1) % 4][0], P[(i + 1) % 4][1], tag);
}
function segsNear(x, z, out) {
  const C = W.cell, i = Math.floor(x / C), j = Math.floor(z / C);
  out.length = 0;
  for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) { const L = W.cells.get(a * 65536 + b); if (L) for (const s of L) out.push(s); }
  return out;
}
// push a circle out of walls; returns the corrected [x, z]
const _near = [];
function collide(x, z, r, skipTag) {
  for (let it = 0; it < 3; it++) {
    segsNear(x, z, _near);
    let moved = false;
    for (const s of _near) {
      if (skipTag && s[4] === skipTag) continue;
      const d2 = segDist2(x, z, s[0], s[1], s[2], s[3]);
      if (d2 < r * r) {
        const dx = s[2] - s[0], dz = s[3] - s[1], l = dx * dx + dz * dz;
        let t = l > 0 ? clamp(((x - s[0]) * dx + (z - s[1]) * dz) / l, 0, 1) : 0;
        let nx = x - (s[0] + dx * t), nz = z - (s[1] + dz * t);
        let d = Math.sqrt(d2);
        if (d < 1e-5) { nx = -dz; nz = dx; d = Math.hypot(nx, nz) || 1; }
        x += nx / d * (r - d); z += nz / d * (r - d); moved = true;
      }
    }
    if (!moved) break;
  }
  return [x, z];
}

// ---------------------------------------------------------------- night light map (2 m per pixel)
const LM = { c: null, x: null, s: 2 };
function lmInit() {
  const D = MAP.detail;
  LM.c = document.createElement('canvas'); LM.c.width = Math.ceil((D[2] - D[0]) / LM.s); LM.c.height = Math.ceil((D[3] - D[1]) / LM.s);
  LM.x = LM.c.getContext('2d'); LM.x.fillStyle = '#000'; LM.x.fillRect(0, 0, LM.c.width, LM.c.height);
  LM.x.globalCompositeOperation = 'lighter';
  UNI.uLMBox.value.set(D[0], D[1], LM.c.width * LM.s, LM.c.height * LM.s);
}
function lmGlow(x, z, r, col, a = 0.6) {
  const X = LM.x, px = (x - MAP.detail[0]) / LM.s, pz = (z - MAP.detail[1]) / LM.s, pr = r / LM.s;
  const g = X.createRadialGradient(px, pz, 0, px, pz, pr);
  const [R, Gc, B] = hex3(parseInt(col.slice(1), 16));
  g.addColorStop(0, `rgba(${R * 255 | 0},${Gc * 255 | 0},${B * 255 | 0},${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  X.fillStyle = g; X.fillRect(px - pr, pz - pr, pr * 2, pr * 2);
}
function lmDone() {
  const t = new THREE.CanvasTexture(LM.c); t.flipY = false; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  UNI.uLM.value = t;
}

// ---------------------------------------------------------------- materials
let MAT = null;
function makeMats() {
  MAT = {
    world: makeMat(),
    ground: makeMat(),
    cut: makeMat({ side: THREE.DoubleSide }),
    far: makeMat({ nolm: true, show: true }),
    terrain: makeMat({ nolm: true }),
    water: makeMat({ nolm: true, water: true }),
    sign: makeMat({ span: true, uniforms: { uA0: { value: SIGNS.tex } } }),
    glow: makeMat({ blend: 'add', unlit: true, side: THREE.DoubleSide, nolm: true }),
    mark: makeMat({ offset: 2 }),
    plain: makeMat({ notex: true }),
  };
}

// ---------------------------------------------------------------- ground
function buildGround() {
  const g = new Geo();
  // asphalt under everything on land in the detail area
  g.col = [0.92, 0.92, 0.94];
  for (const P of MAP.floor) g.flat(dmPoly(P), 0, T.asphalt, 6);
  // pavement blocks with kerbs
  rseed('pave');
  for (const P of MAP.pave) {
    const rings = dmPoly(P);
    const [cx, cz] = ringCentroid(rings[0]);
    const red = hash2(cx | 0, cz | 0, 3) < 0.35;
    g.col = red ? [1, 1, 1] : [1, 1, 1];
    g.flat(rings, KERB, red ? T.paveRed : T.pave, 2);
    g.col = [1, 1, 1];
    for (const r of rings) for (let i = 0, n = r.length; i < n; i += 2) { const j = (i + 2) % n; g.wall(r[i], r[i + 1], r[j], r[j + 1], 0, KERB, T.kerb, 1, 0.3); }
  }
  g.col = [0.95, 1, 0.95];
  for (const P of MAP.green) g.flat(dmPoly(P), KERB + 0.02, T.grass, 4);
  g.col = [1, 1, 1];
  for (const P of MAP.plaza) g.flat(dmPoly(P), KERB + 0.015, T.court, 6);
  for (const P of MAP.pools) g.flat(dmPoly(P), KERB + 0.03, T.pool, 4);
  // park paths and steps over the grass
  for (const p of MAP.paths) {
    const pts = dmRing(p.slice(1)), w = p[0] ? 2.5 : 2.2;
    ribbon(g, pts, w, KERB + 0.035, p[0] ? T.concrete : T.plaza, 2);
  }
  const m = g.mesh(MAT.ground); m.name = 'ground'; scene.add(m); W.meshes.push(m);
}
// flat strip along a polyline
function ribbon(g, pts, w, y, tile, uvs, n = [0, 1, 0]) {
  let u = 0;
  for (let k = 2; k < pts.length; k += 2) {
    const ax = pts[k - 2], az = pts[k - 1], bx = pts[k], bz = pts[k + 1], L = Math.hypot(bx - ax, bz - az);
    if (L < 0.01) continue;
    const px = -(bz - az) / L * w / 2, pz = (bx - ax) / L * w / 2;
    g.quad([ax + px, y, az + pz], [bx + px, y, bz + pz], [bx - px, y, bz - pz], [ax - px, y, az - pz], [u, 0, u + L / uvs, 0, u + L / uvs, 1, u, 1], tile, n);
    u += L / uvs;
  }
}
function buildMarkings() {
  const g = new Geo();
  g.col = [1, 1, 1];
  const Y = 0.012;
  const dash = (pts, len, gap, w, tile, off = 0) => {
    let total = 0; for (let k = 2; k < pts.length; k += 2) total += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
    for (let d = 3; d + len < total - 3; d += len + gap) {
      const [ax, az, dx, dz] = polyAt(pts, d), [bx, bz] = polyAt(pts, d + len);
      const ox = -dz * off, oz = dx * off;
      ribbon(g, [ax + ox, az + oz, bx + ox, bz + oz], w, Y, tile, 1);
    }
  };
  for (const E of W.edges) {
    if (E.cls === 'service' || E.len < 8) continue;
    if (!E.ow) {
      if (E.cls === 'primary' || E.cls === 'secondary') { dash(E.pts, 1e5, 0, 0.12, T.lane, 0.12); dash(E.pts, 1e5, 0, 0.12, T.lane, -0.12); }
      else dash(E.pts, 4, 5, 0.12, T.lane);
    } else {
      const lanes = Math.max(1, Math.round(E.w / 3.3));
      for (let l = 1; l < lanes; l++) dash(E.pts, 4, 6, 0.12, T.lane, -E.w / 2 + l * E.w / lanes);
    }
    // yellow no-stopping line along the kerb on the main roads
    if (E.cls === 'primary' || E.cls === 'secondary') {
      const s = E.ow ? 1 : 1;
      dash(E.pts, 1e5, 0, 0.1, T.yellow, s * (E.w / 2 - 0.35));
      if (E.ow) dash(E.pts, 1e5, 0, 0.1, T.yellow, -(E.w / 2 - 0.35));
    }
  }
  // zebra crossings: bars across the crossing line
  for (const c of MAP.cross) {
    const pts = dmRing(c);
    let total = 0; for (let k = 2; k < pts.length; k += 2) total += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
    for (let d = 0.4; d < total - 0.3; d += 1.0) {
      const [x, z, dx, dz] = polyAt(pts, d);
      const px = -dz * 1.5, pz = dx * 1.5;
      ribbon(g, [x + px, z + pz, x - px, z - pz], 0.5, Y + 0.002, T.lane, 1);
    }
  }
  const m = g.mesh(MAT.mark); m.name = 'markings'; scene.add(m); W.meshes.push(m);
}

// ---------------------------------------------------------------- buildings
const FACADES = {
  0: ['ten1', 'ten2', 'ten3', 'ten4', 'ten5', 'ten6'],
  1: ['office1', 'office2', 'office3', 'office2', 'mallGlass'],
  2: ['hotel1', 'office1', 'hotel1'],
  3: ['whiteRender', 'heritage', 'granite'],
  4: ['concrete'],
  5: ['mall', 'mallGlass'],
  6: ['whiteRender'],
  7: ['concrete', 'metal'],
};
const STYLE_BY_NAME = [
  [/Peninsula/, 'heritage'], [/1881|Marine Police/, 'heritage'], [/Observatory|1883/, 'heritage'], [/St\.? Andrew/, 'granite'],
  [/Cultural Centre/, 'pinkTile'], [/Chungking/, 'ten3'], [/Milton/, 'ten1'], [/Mirador/, 'ten5'], [/Kowloon British School|Antiquities/, 'heritage'],
  [/Ocean Terminal|Harbour City|Gateway|Ocean Centre/, 'mallGlass'], [/K11/, 'office3'], [/iSQUARE/, 'office1'], [/Sheraton/, 'hotel1'],
];
// unnamed parts of named places: [x, z, radius, style below 50 m, style above]
const STYLE_AT = [
  [-55, 470, 42, 'heritage', 'hotel1'],          // The Peninsula and its tower
  [-118, 612, 40, 'pinkTile', 'pinkTile'],       // Cultural Centre concert hall and theatre
  [-45, 580, 30, 'whiteRender', 'whiteRender'],  // Space Museum wings
  [-37, 664, 30, 'pinkTile', 'pinkTile'],        // Museum of Art
  [-252, 437, 35, 'heritage', 'heritage'],       // 1881 Heritage
];
const SKIP_NAMES = /Clock Tower|Space Museum|Kowloon Mosque|Star Ferry Pier/;
const SHOP_TILES = ['shopOpen', 'shopOpen', 'shopGlass', 'shopFood', 'shopShut', 'shopDark', 'lobby'];
function buildBuildings() {
  const CH = 200, chunks = new Map();
  const chunkGeo = (x, z) => { const k = Math.floor(x / CH) * 1000 + Math.floor(z / CH); let g = chunks.get(k); if (!g) chunks.set(k, g = new Geo()); return g; };
  const customs = W.buildings.filter((B) => SKIP_NAMES.test(enName(B.name)));
  W.buildings.forEach((B, bi) => {
    const en = enName(B.name);
    if (SKIP_NAMES.test(en)) { B.custom = true; for (const r of B.rings) addRingSegs(r, 0); return; }
    // unnamed parts inside a hand-built landmark (the mosque's dome and minarets are mapped as separate blocks)
    if (!B.name && customs.some((C) => pointInRing(B.cx, B.cz, C.rings[0]))) { B.custom = true; return; }
    rseed('b' + bi);
    let style = rpick(FACADES[B.kind] || FACADES[0]);
    if (B.kind === 0 && B.h > 70) style = rpick(['ten6', 'hotel1', 'office2']);
    if (B.kind === 1 && B.h < 14 && B.area < 400) style = rpick(['ten3', 'concrete']);
    for (const [re, s] of STYLE_BY_NAME) if (re.test(en)) style = s;
    for (const [x, z, r, lo, hi] of STYLE_AT) if (dist2(B.cx, B.cz, x, z) < r * r) style = B.h < 50 ? lo : hi;
    // single-storey shops along a park's edge, the park planted on their roof (Kowloon Park on Nathan Road)
    const shopStrip = B.parkRoof && B.kind === 5;
    if (shopStrip) style = 'mall';
    B.style = style;
    const g = chunkGeo(B.cx, B.cz);
    const tint = 0.84 + RNG() * 0.22;
    g.col = [tint, tint * (0.97 + RNG() * 0.06), tint * (0.95 + RNG() * 0.08)];
    g.aux = [0, RNG()];
    const y0 = B.mh, y1 = B.h;
    const low = y1 < 6 && !shopStrip, groundFloor = y0 < 0.5 && !low && B.inWalk && ['ten1', 'ten2', 'ten3', 'ten4', 'ten5', 'ten6', 'office2', 'hotel1', 'concrete', 'mall'].includes(style);
    const GF = shopStrip ? Math.min(4.6, y1 - 0.8) : 4.6, FL = 3.2, BAY = 3.6;
    for (const r of B.rings) {
      for (let i = 0, n = r.length; i < n; i += 2) {
        const j = (i + 2) % n, ax = r[i], az = r[i + 1], bx = r[j], bz = r[j + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 0.05) continue;
        const ftile = T[style];
        let gtile = -1;
        if (groundFloor && L > 2.5) {
          const mx = (ax + bx) / 2 + (bz - az) / L * 2.5, mz = (az + bz) / 2 - (bx - ax) / L * 2.5;    // 2.5 m in front
          const c = gclass(mx, mz);
          if (c === G.PAVE || c === G.ROAD) gtile = T[rpick(SHOP_TILES)];
        }
        if (gtile >= 0) {
          // shopfronts in bays of about 4 m, then the floors above
          const nb = Math.max(1, Math.round(L / 4));
          for (let k = 0; k < nb; k++) {
            const t0 = k / nb, t1 = (k + 1) / nb;
            g.wall(ax + (bx - ax) * t0, az + (bz - az) * t0, ax + (bx - ax) * t1, az + (bz - az) * t1, 0, GF, k === 0 ? gtile : T[rpick(SHOP_TILES)], L / nb, GF);
          }
          if (y1 > GF) g.wall(ax, az, bx, bz, GF, y1, ftile, BAY, FL, 0, 0);
          W.shopFronts.push([ax, az, bx, bz, bi]);
        } else {
          g.wall(ax, az, bx, bz, y0, y1, low ? T.concrete : ftile, BAY, FL, 0, 0);
        }
      }
      if (y0 < 2.5 && B.inWalk || y0 < 2.5 && gclass(B.cx, B.cz) !== G.NONE) addRingSegs(r, 0);
    }
    // roof, and the underside of raised parts
    g.col = [0.9, 0.9, 0.9];
    if (shopStrip) { g.col = [0.95, 1, 0.95]; g.flat(B.rings, y1, T.grass, 4); }
    else g.flat(B.rings, y1, B.kind === 3 || B.parkRoof ? T.roofGreen : T.roof, 4);
    if (y0 > 0.5) {
      const G2 = new Geo(); G2.flat(B.rings, y0, T.concrete, 4);
      // flip the underside to face down
      for (let i = 0; i < G2.ix.length; i += 3) { const t = G2.ix[i + 1]; G2.ix[i + 1] = G2.ix[i + 2]; G2.ix[i + 2] = t; }
      for (let i = 1; i < G2.n.length; i += 3) G2.n[i] = -1;
      mergeGeo(g, G2);
    }
    // rooftop clutter on tenements: water tanks, stair housings, aerials
    if (B.kind === 0 && B.area > 80 && B.inWalk) {
      g.col = [0.85, 0.85, 0.85];
      const r0 = B.rings[0];
      for (let k = 0; k < 3; k++) {
        const t = RNG(), i = Math.floor(RNG() * r0.length / 2) * 2, x = lerp(r0[i], B.cx, 0.35 + t * 0.4), z = lerp(r0[i + 1], B.cz, 0.35 + t * 0.4);
        if (!pointInRing(x, z, r0)) continue;
        const s = rnd(1.2, 2.6), hh = rnd(1.2, 3);
        g.box(x - s / 2, y1, z - s / 2, x + s / 2, y1 + hh, z + s / 2, chance(0.5) ? T.concrete : T.metal, 2);
      }
    }
    g.col = [1, 1, 1]; g.aux = [0, 0];
  });
  for (const [k, g] of chunks) { const m = g.mesh(MAT.world); m.name = 'bchunk'; scene.add(m); W.meshes.push(m); }
}
function mergeGeo(g, h) {
  const base = g.p.length / 3;
  g.p.push(...h.p); g.u.push(...h.u); g.t.push(...h.t); g.c.push(...h.c); g.n.push(...h.n); g.a.push(...h.a);
  for (const i of h.ix) g.ix.push(i + base);
}

// ---------------------------------------------------------------- shop signs, hanging signs, neon
const MAIN_STREETS = /Nathan|Granville|Carnarvon|Hankow|Peking|Lock Road|Kimberley|Mody|Cameron|Hart Avenue|Haiphong|Ashley|Prat|Chatham|Canton|Humphreys|Hillwood|Austin|Bristol|Minden/;
function nearestEdge(x, z, maxD = 30) {
  let best = null, bd = maxD * maxD;
  for (const E of W.edges) {
    const p = E.pts;
    if (Math.abs(p[0] - x) > 400 && Math.abs(p[p.length - 2] - x) > 400) continue;
    for (let k = 2; k < p.length; k += 2) { const d = segDist2(x, z, p[k - 2], p[k - 1], p[k], p[k + 1]); if (d < bd) { bd = d; best = E; } }
  }
  return best ? [best, Math.sqrt(bd)] : [null, 1e9];
}
// facade segment of building bi nearest to (x, z): returns [ax, az, bx, bz, nx, nz, t]
function facadeAt(x, z) {
  segsNear(x, z, _near);
  let best = null, bd = 9;
  for (const s of _near) { const d = segDist2(x, z, s[0], s[1], s[2], s[3]); if (d < bd) { bd = d; best = s; } }
  if (!best) return null;
  const [ax, az, bx, bz] = best, L = Math.hypot(bx - ax, bz - az); if (L < 1.5) return null;
  let nx = (bz - az) / L, nz = -(bx - ax) / L;
  const t = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L), 0, 1);
  const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
  if (gclass(px + nx * 1.5, pz + nz * 1.5) === G.BUILD) { nx = -nx; nz = -nz; }
  if (gclass(px + nx * 1.5, pz + nz * 1.5) === G.BUILD) return null;
  return [ax, az, bx, bz, nx, nz, t, px, pz, L];
}
function buildShopSigns() {
  const g = new Geo(), glow = new Geo();
  rseed('signs');
  for (const s of MAP.shops) {
    const x = s[0] / 10, z = s[1] / 10, cat = SIGN_CATS[s[2]] || 'shop', name = nameOf(s[3]);
    const f = facadeAt(x, z);
    if (!f) continue;
    const [ax, az, bx, bz, nx, nz, t, px, pz] = f;
    const ux = nz, uz = -nx;                     // right, for someone facing the shop
    // fascia board over the shopfront
    const sh = signH(name, cat);
    board(g, px + nx * 0.12, 4.0, pz + nz * 0.12, ux, uz, 3.6, 0.9, sh.uv, 0.9);
    lmGlow(px + nx * 2, pz + nz * 2, 5, '#ffe2b0', 0.55);
    W.signSpots.push([px, pz, nx, nz, cat, name]);
    // the same name on a hanging sign on the busy streets (bars and restaurants light theirs up)
    const [E] = nearestEdge(px, pz, 22);
    if (E && MAIN_STREETS.test(E.name) && RNG() < 0.7) {
      const vs = signV(name, cat);
      const out = rnd(1.2, 2.4), y = rnd(6.5, 13);
      const cx = px + nx * out, cz = pz + nz * out;
      board(g, cx, y, cz, nx, nz, 1.2, 4.8, vs.uv, vs.neon ? 1.1 : 0.6);
      board(g, cx, y, cz, -nx, -nz, 1.2, 4.8, vs.uv, vs.neon ? 1.1 : 0.6);
      if (vs.neon) { lmGlow(cx, cz, 9, vs.neon, 0.5); glowQuad(glow, cx, y, cz, 5.5, 7, vs.neon); }
    }
  }
  // building names over the entrances, as on every block in Hong Kong
  for (const B of W.buildings) {
    if (!B.inWalk || !B.name || B.custom || B.h < 8 || B.mh > 0.5 || /Milton|Chungking|Mirador/.test(B.name)) continue;
    if (W.buildings.indexOf(B) !== W.buildings.findIndex((C) => C.name === B.name)) continue;
    const r = B.rings[0]; let best = null, bl = 0;
    for (let i = 0, n = r.length; i < n; i += 2) {
      const j = (i + 2) % n, L = Math.hypot(r[j] - r[i], r[j + 1] - r[i + 1]); if (L < 4) continue;
      const nx = (r[j + 1] - r[i + 1]) / L, nz = -(r[j] - r[i]) / L, mx = (r[i] + r[j]) / 2, mz = (r[i + 1] + r[j + 1]) / 2;
      const c = gclass(mx + nx * 2.5, mz + nz * 2.5);
      if ((c === G.PAVE || c === G.ROAD) && L > bl) { bl = L; best = [mx, mz, nx, nz]; }
    }
    if (!best) continue;
    const [mx, mz, nx, nz] = best;
    const zh = zhName(B.name), en = enName(B.name);
    const sh = signH((zh || '') + '|' + (en && en !== zh ? en : ''), 'building');
    board(g, mx + nx * 0.1, 3.3, mz + nz * 0.1, nz, -nx, 3.0, 0.75, sh.uv, 0.7);
  }
  W.signGeo = g;
  W.signGlow = glow;
}
// a sign board centred at (cx, cy, cz) that reads left to right along (rx, rz) for someone facing it
function board(g, cx, cy, cz, rx, rz, w, h, uv, light = 0) {
  g.aux = [light, 0];
  const a = [cx - rx * w / 2, cy - h / 2, cz - rz * w / 2], b = [cx + rx * w / 2, cy - h / 2, cz + rz * w / 2];
  g.quad(a, b, [b[0], cy + h / 2, b[2]], [a[0], cy + h / 2, a[2]], [uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]], 0, [-rz, 0, rx]);
  g.aux = [0, 0];
}
function finishSigns() {
  const m = W.signGeo.mesh(MAT.sign); m.name = 'signs'; scene.add(m); W.meshes.push(m);
  W.glowMesh = W.signGlow.mesh(MAT.glow); W.glowMesh.name = 'glow'; W.glowMesh.renderOrder = 5; scene.add(W.glowMesh);
}
// soft additive halo (crossed quads) for night lights
function glowQuad(g, x, y, z, w, h, col) {
  const c = typeof col === 'string' ? hex3(parseInt(col.slice(1), 16)) : col;
  g.col = [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5];
  g.quad([x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z], [0, 0, 1, 0, 1, 1, 0, 1], T.glow, [0, 0, 1]);
  g.quad([x, y - h / 2, z - w / 2], [x, y - h / 2, z + w / 2], [x, y + h / 2, z + w / 2], [x, y + h / 2, z - w / 2], [0, 0, 1, 0, 1, 1, 0, 1], T.glow, [1, 0, 0]);
  g.col = [1, 1, 1];
}

// ---------------------------------------------------------------- street furniture: lamps, rails, stops, signals, trees
function buildStreet() {
  const g = new Geo(), cut = new Geo(), glow = new Geo();
  rseed('street');
  const inWalk = (x, z) => x > W.walk[0] - 60 && x < W.walk[2] + 60 && z > W.walk[1] - 60 && z < W.walk[3] + 60;
  const crossPts = []; for (const c of MAP.cross) crossPts.push([c[0] / 10, c[1] / 10], [c[c.length - 2] / 10, c[c.length - 1] / 10]);
  const nearCrossFast = (x, z, r) => crossPts.some((p) => dist2(p[0], p[1], x, z) < r * r);
  for (const E of W.edges) {
    if (E.cls === 'service' || E.len < 12) continue;
    const side = [1, -1];
    for (const s of side) {
      // lamps every ~32 m
      for (let d = 10; d < E.len - 6; d += 32) {
        const [x, z, dx, dz] = polyAt(E.pts, d);
        const ox = -dz * s, oz = dx * s, off = E.w / 2 + 0.7;
        const lx = x + ox * off, lz = z + oz * off;
        if (!inWalk(lx, lz) || gclass(lx, lz) !== G.PAVE) continue;
        lamp(g, glow, lx, lz, -ox, -oz);
      }
      // guard rails along the kerb of the main roads
      if (E.cls === 'primary' || E.cls === 'secondary' || E.cls === 'trunk') {
        const step = 2.4, off = E.w / 2 + 0.35;
        for (let d = 6; d + step < E.len - 6; d += step) {
          const [x0, z0, dx, dz] = polyAt(E.pts, d), [x1, z1] = polyAt(E.pts, d + step);
          const ox = -dz * s * off, oz = dx * s * off;
          const ax = x0 + ox, az = z0 + oz, bx = x1 + ox, bz = z1 + oz;
          if (!inWalk(ax, az) || gclass(ax, az) !== G.PAVE || gclass(bx, bz) !== G.PAVE || nearCrossFast(ax, az, 4) || nearCrossFast(bx, bz, 4)) continue;
          cut.wall(ax, az, bx, bz, KERB, KERB + 1.05, T.rail, 2.4, 1.05);
          addSeg(ax, az, bx, bz, 2);
        }
      }
    }
  }
  // bus stops
  for (const [xd, zd, ni] of MAP.stops) {
    const x = xd / 10, z = zd / 10; if (!inWalk(x, z)) continue;
    g.col = [0.75, 0.75, 0.78]; g.box(x - 0.05, KERB, z - 0.05, x + 0.05, KERB + 2.8, z + 0.05, T.metal);
    g.col = [1, 1, 1]; g.box(x - 0.35, KERB + 2.1, z - 0.03, x + 0.35, KERB + 2.8, z + 0.03, T.white);
    g.col = [0.8, 0.1, 0.1]; g.box(x - 0.35, KERB + 2.6, z - 0.04, x + 0.35, KERB + 2.8, z + 0.04, T.white);
    g.col = [1, 1, 1];
    W.stops.push({ x, z, name: nameOf(ni) });
    addCircle(x, z, 0.12, 4, 3);
  }
  // traffic signal poles
  for (const [xd, zd] of MAP.signals) {
    const x = xd / 10, z = zd / 10; if (!inWalk(x, z)) continue;
    W.signals.push({ x, z });
  }
  // trees
  const fol = new Geo();
  for (let i = 0; i < MAP.trees.length; i += 2) {
    const x = MAP.trees[i] / 10, z = MAP.trees[i + 1] / 10;
    const c = gclass(x, z); if (c === G.BUILD || c === G.SEA || c === G.ROAD) continue;
    const s = 0.8 + hash2(i, 7) * 0.6, palm = gclass(x, z) === G.PAVE && hash2(i, 9) < 0.25 && z > 380;
    g.col = [1, 1, 1];
    g.cyl(x, KERB, z, 0.18 * s, (palm ? 7 : 3.2) * s, 5, T.bark, null, 1, false, 0.12 * s);
    const y = (palm ? 6.6 : 3.0) * s, R = (palm ? 3.2 : 2.8) * s, hh = (palm ? 2.6 : 4.6) * s;
    const tl = palm ? T.palm : T.foliage;
    const k = 0.8 + hash2(i, 3) * 0.3; fol.col = [k, k, k];
    for (let a = 0; a < 3; a++) {
      const ang = a / 3 * Math.PI + hash2(i, 11) * 2, cx = Math.cos(ang) * R, cz = Math.sin(ang) * R;
      fol.quad([x - cx, y, z - cz], [x + cx, y, z + cz], [x + cx, y + hh, z + cz], [x - cx, y + hh, z - cz], [0, 0, 1, 0, 1, 1, 0, 1], tl, [0, 1, 0]);
    }
    fol.quad([x - R, y + hh * 0.55, z - R], [x + R, y + hh * 0.55, z - R], [x + R, y + hh * 0.55, z + R], [x - R, y + hh * 0.55, z + R], [0, 0, 1, 0, 1, 1, 0, 1], tl, [0, 1, 0]);
    if (inWalk(x, z)) addCircle(x, z, 0.3, 5, 4);
    W.trees.push([x, z]);
  }
  const m = g.mesh(MAT.world); m.name = 'street'; scene.add(m); W.meshes.push(m);
  const mc = cut.mesh(MAT.cut); mc.name = 'rails'; scene.add(mc); W.meshes.push(mc);
  const mf = fol.mesh(MAT.cut); mf.name = 'trees'; scene.add(mf); W.meshes.push(mf);
  const mg = glow.mesh(MAT.glow); mg.name = 'lampglow'; mg.renderOrder = 5; scene.add(mg); W.lampGlow = mg;
}
function lamp(g, glow, x, z, dx, dz) {
  g.col = [0.62, 0.64, 0.66];
  g.cyl(x, KERB, z, 0.09, 9.5, 5, T.metal, null, 1, false, 0.06);
  const ax = x + dx * 1.6, az = z + dz * 1.6;
  g.box(Math.min(x, ax) - 0.05, KERB + 9.4, Math.min(z, az) - 0.05, Math.max(x, ax) + 0.05, KERB + 9.55, Math.max(z, az) + 0.05, T.metal);
  g.aux = [1.4, 0]; g.col = [1, 0.97, 0.88];
  g.box(ax - 0.3, KERB + 9.25, az - 0.18, ax + 0.3, KERB + 9.4, az + 0.18, T.lamp);
  g.aux = [0, 0]; g.col = [1, 1, 1];
  lmGlow(ax, az, 11, '#ffe9c4', 0.7);
  glowQuad(glow, ax, KERB + 9.0, az, 3.2, 2.4, '#ffeedd');
  addCircle(x, z, 0.12, 4, 3);
  W.lamps.push([ax, az]);
}

// ---------------------------------------------------------------- harbour, sea walls, backdrop
function buildHarbour() {
  // the sea
  const g = new Geo(); g.col = [0.85, 0.95, 1];
  // a grid of tiles rather than one huge quad: some GPUs (and SwiftShader) mangle depth on giant triangles
  const S = 2500, N = 12, Y = -2.6;
  for (let j = -N; j < N; j++) for (let i = -N; i < N; i++) {
    const x0 = i * S, z0 = j * S, x1 = x0 + S, z1 = z0 + S;
    g.quad([x0, Y, z1], [x1, Y, z1], [x1, Y, z0], [x0, Y, z0], [x0 / 10, -z1 / 10, x1 / 10, -z1 / 10, x1 / 10, -z0 / 10, x0 / 10, -z0 / 10], T.water, [0, 1, 0]);
  }
  const mw = g.mesh(MAT.water); mw.name = 'sea'; mw.frustumCulled = false; scene.add(mw); W.sea = mw;
  // sea walls along every coast, with a railing along the walkable promenades
  const sw = new Geo(), rail = new Geo();
  const D = MAP.detail;
  for (const c of MAP.coast) {
    const r = dmRing(c);
    for (let i = 2; i < r.length; i += 2) {
      const ax = r[i - 2], az = r[i - 1], bx = r[i], bz = r[i + 1];
      const inD = ax > D[0] && ax < D[2] && az > D[1] && az < D[3];
      sw.wall(ax, az, bx, bz, -5, inD ? KERB : 0, T.seawall, 3, 2.5);
      if (inD && ax > W.walk[0] - 80 && ax < W.walk[2] + 80 && az > W.walk[1] - 80 && az < W.walk[3] + 80) {
        addSeg(ax, az, bx, bz, 1);
        rail.wall(bx, bz, ax, az, KERB, KERB + 1.1, T.railGreen, 2, 1.1);
      }
    }
  }
  const m = sw.mesh(MAT.world); m.name = 'seawall'; scene.add(m); W.meshes.push(m);
  const mr = rail.mesh(MAT.cut); mr.name = 'promrail'; scene.add(mr); W.meshes.push(mr);
}
function buildBackdrop() {
  // flat city floor outside the detail area
  const f = new Geo(); f.col = [0.62, 0.62, 0.6];
  for (const P of MAP.farFloor) f.flat(dmPoly(P), 0, T.concrete, 30);
  const mf = f.mesh(MAT.terrain); mf.name = 'farfloor'; scene.add(mf); W.farMeshes.push(mf);
  // hills
  const Tr = MAP.terr, t = new Geo();
  const hv = (i, j) => Tr.v[clamp(j, 0, Tr.h - 1) * Tr.w + clamp(i, 0, Tr.w - 1)];
  for (let j = 0; j < Tr.h - 1; j++) for (let i = 0; i < Tr.w - 1; i++) {
    const a = hv(i, j), b = hv(i + 1, j), c = hv(i + 1, j + 1), d = hv(i, j + 1);
    if (Math.max(a, b, c, d) <= 0) continue;
    const x0 = Tr.x0 + i * Tr.step, z0 = Tr.z0 + j * Tr.step, x1 = x0 + Tr.step, z1 = z0 + Tr.step;
    const col = (h) => { const k = clamp(h / 400, 0, 1); return [0.42 + k * 0.1, 0.55 - k * 0.05, 0.36]; };
    const hh = (h) => (h < 0 ? h * 0.3 - 0.5 : h);
    const v = (x, h, z) => { t.col = col(h); return [x, hh(h), z]; };
    // two triangles, colour per vertex
    const pa = v(x0, a, z0), pb = v(x1, b, z0), pc = v(x1, c, z1), pd = v(x0, d, z1);
    t.col = col((a + b + c + d) / 4);
    t.quad(pd, pc, pb, pa, [x0 / 40, z1 / 40, x1 / 40, z1 / 40, x1 / 40, z0 / 40, x0 / 40, z0 / 40], T.grass);
  }
  const mt = t.mesh(MAT.terrain); mt.name = 'hills'; scene.add(mt); W.farMeshes.push(mt);
  // distant towers
  const b = new Geo();
  rseed('far');
  for (const F of MAP.bf) {
    const [kind, h, mh, base] = F; const r = F.slice(4);
    if (r.length < 6) continue;
    const ring = Float32Array.from(r);
    if (ringArea(ring) < 0) { for (let i = 0, n = ring.length / 2; i < n / 2; i++) { const a = i * 2, c = (n - 1 - i) * 2; [ring[a], ring[c]] = [ring[c], ring[a]]; [ring[a + 1], ring[c + 1]] = [ring[c + 1], ring[a + 1]]; } }
    const glassy = (kind === 1 || kind === 2) && h > 50 && RNG() < 0.6;
    const k = 0.75 + RNG() * 0.3;
    b.col = glassy ? [k, k, k * 1.05] : [k, k * 0.98, k * 0.94];
    // towers along the Island's north shore join the light show
    const [cx, cz] = ringCentroid(ring);
    b.aux = [0, RNG() + (cz > 900 && cz < 2400 && h > 45 ? 10 : 0)];
    const y0 = base + mh, y1 = base + h;
    for (let i = 0, n = ring.length; i < n; i += 2) { const j = (i + 2) % n; b.wall(ring[i], ring[i + 1], ring[j], ring[j + 1], y0 - (mh ? 0 : 3), y1, glassy ? T.farGlass : T.farWin, glassy ? 8 : 10.8, glassy ? 6.4 : 6.4); }
    b.col = [0.6, 0.6, 0.6];
    b.flat([ring], y1, T.roof, 10);
  }
  b.aux = [0, 0];
  const mb = b.mesh(MAT.far); mb.name = 'far'; scene.add(mb); W.farMeshes.push(mb);
}

function buildCity() {
  decodeBuildings();
  decodeGraph();
  buildRaster();
  lmInit();
  makeMats();
  buildGround();
  buildMarkings();
  buildBuildings();
  buildHarbour();
  buildShopSigns();
  buildStreet();
  buildBackdrop();
}
