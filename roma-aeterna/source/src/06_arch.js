// Roma Aeterna — Roman building types: temples (rectangular and round), triumphal arches, arcaded halls, porticoes,
// walls, bridges, fountains, altars, obelisks. Each takes a Frame whose -v side is the building's front.

// facing helpers: sub-frame angles in the parent frame
const FACE = { '-v': 0, '+u': Math.PI / 2, '+v': Math.PI, '-u': -Math.PI / 2 };
// a frame at (u, v) of parent P, turned by a, sitting on the ground there
function site(P, u, v, a = 0, dy = 0) { const x = P.wx(u, v), z = P.wz(u, v); return new Frame(x, z, P.ang + a, groundAt(x, z) + dy); }
// a frame in world coordinates facing a bearing (radians clockwise from north)
function siteW(x, z, bearing = 0, dy = 0) { return new Frame(x, z, bearing, groundAt(x, z) + dy); }

// straight wall between local points (u0, v0) and (u1, v1), solid
function wall(gb, F, u0, v0, u1, v1, y, h, t, hex, o = {}) {
  const du = u1 - u0, dv = v1 - v0, L = Math.hypot(du, dv);
  K.box(gb, F, (u0 + u1) / 2, y, (v0 + v1) / 2, L + (o.ext || 0), h, t, hex, { ra: Math.atan2(dv, du), solid: o.solid === false ? false : true, top: o.top });
}

// ---------- temple ----------
// o: w, d (podium), podH, cols (front), colH, order, peri (columns all round), back (columns at the back too),
//    pron (rows of the porch, prostyle), stairs ('front' | 'none' | 'wide'), stairW, roof, cella, pod, side (engaged), gilt
function temple(F, o) {
  const gb = gbF(o.layer || 'mon', F);
  const w = o.w, d = o.d, ph = o.podH, ch = o.colH, r = o.colR || ch / 19, m = o.margin || r * 2.2;
  const order = o.order || 'c', mar = o.marble || C.marble;
  if (!o.noRes) reserve(F, 0, -2, w, d + 6, 3);
  const [lo] = groundRange(F, 0, 0, w, d);
  if (lo < F.y - 0.2) K.box(gb, F, 0, lo - F.y, 0, w, F.y - lo, d, o.pod || C.trav2);
  // podium with mouldings
  K.box(gb, F, 0, 0, 0, w, ph, d, o.pod || C.trav2, { solid: true, top: o.floor || C.trav });
  K.box(gb, F, 0, 0, 0, w + 0.5, Math.min(0.7, ph * 0.18), d + 0.5, shadeHex(o.pod || C.trav2, 0.95));
  K.box(gb, F, 0, ph - 0.45, 0, w + 0.35, 0.45, d + 0.35, mar);
  if (o.stairs !== 'none') {
    const sw = o.stairW || w - 2, n = Math.max(2, Math.ceil(ph / 0.3));
    K.stairs(gb, F, 0, 0, -d / 2, sw, n, ph / n, 0.36, -1, o.stairCol || mar);
    if (o.stairW && o.stairW < w - 2) { // side cheek walls
      for (const s of [-1, 1]) K.tbox(gb, F, s * (sw / 2 + 0.6), 0, -d / 2 - n * 0.18, 1.2, n * 0.36, 1.2, 0.01, ph, o.pod || C.trav2, { ov: n * 0.18 - 0.2, solid: true });
    }
  }
  const nc = o.cols, sp = (w - 2 * m) / (nc - 1);
  const v0 = -d / 2 + m, top = ph;
  let v1; // back edge of the colonnade/roof
  if (o.peri) {
    const ns = o.peri;
    const spv = (d - 2 * m) / (ns - 1);
    v1 = d / 2 - m;
    K.colonnade(gb, F, -(w / 2 - m), v0, w / 2 - m, v0, nc, top, ch, r, order, mar);
    if (o.back !== false) K.colonnade(gb, F, -(w / 2 - m), v1, w / 2 - m, v1, nc, top, ch, r, order, mar);
    for (const s of [-1, 1]) K.colonnade(gb, F, s * (w / 2 - m), v0 + spv, s * (w / 2 - m), v1 - (o.back !== false ? spv : 0), ns - (o.back !== false ? 2 : 1), top, ch, r, order, mar);
  } else {
    const pr = o.pron || 2;
    K.colonnade(gb, F, -(w / 2 - m), v0, w / 2 - m, v0, nc, top, ch, r, order, mar);
    for (let k = 1; k < pr; k++) for (const s of [-1, 1]) K.column(gb, F, s * (w / 2 - m), top, v0 + k * sp, ch, r, order, mar);
    v1 = d / 2 - m * 0.5;
  }
  // cella
  const cw = o.cellaW || (o.peri ? w - 2 * m - 2 * sp * 0.9 : w - 2 * m + r * 2);
  const c0 = o.peri ? v0 + sp * (o.pronDeep || 1.6) : v0 + (o.pron || 2) * sp - sp * 0.4, c1 = o.peri ? v1 - sp * 0.8 : v1;
  const cellaCol = o.cella || mar;
  K.box(gb, F, 0, top, (c0 + c1) / 2, cw, ch, c1 - c0, cellaCol, { solid: true });
  K.panel(gb, F, 0, top, c0 - 0.03, Math.min(cw * 0.3, 7), ch * 0.62, o.door || 0x2a1d14, -1);
  if (o.side) for (let k = 0; k <= Math.floor((c1 - c0) / sp); k++) for (const s of [-1, 1]) K.box(gb, F, s * (cw / 2 + 0.05), top, c0 + k * sp + 0.2, r * 1.2, ch, r * 1.6, mar);
  // entablature, pediment, roof
  const eh = ch * 0.21, ew = w - 2 * m + r * 2.8, ed = v1 - v0 + r * 2.8, ev = (v0 + v1) / 2;
  K.box(gb, F, 0, top + ch, ev, ew, eh, ed, mar, { skip: '' });
  const rh = ew * 0.2;
  K.gable(gb, F, 0, top + ch + eh, ev, ew + 0.6, ed + 0.6, rh, o.roof || C.tile, { alongV: true, side: o.tymp || mar });
  // acroteria
  const ac = o.gilt ? C.gilt : mar;
  K.box(gb, F, 0, top + ch + eh + rh - 0.2, ev - ed / 2 - 0.3, 1.2, 2.2, 0.8, ac);
  for (const s of [-1, 1]) K.box(gb, F, s * ew / 2, top + ch + eh, ev - ed / 2 - 0.3, 0.9, 1.8, 0.7, ac);
  if (o.quadriga) { // gilded chariot group on the apex
    K.box(gb, F, 0, top + ch + eh + rh, ev - ed / 2 + 1, 3.4, 1.6, 2.2, C.gilt);
    K.box(gb, F, 0, top + ch + eh + rh + 1.6, ev - ed / 2 + 1.5, 0.7, 1.5, 0.6, C.gilt);
  }
  mapRect(F, 0, 0, w, d, '#e6dccb');
  return { top, ch, front: -d / 2, gb, entTop: top + ch + eh, roofTop: top + ch + eh + rh };
}

// round temple (tholos): podium radius rp, n columns, cella radius rc, conical roof
function tholos(F, o) {
  const gb = gbF(o.layer || 'mon', F);
  const rp = o.r, ph = o.podH, ch = o.colH, n = o.n, cr = o.colR || ch / 19, rc = o.rc || rp * 0.62, mar = o.marble || C.marble;
  reserveC(F.x, F.z, rp + 4);
  K.cyl(gb, F, 0, 0, 0, rp, rp, ph, 24, o.pod || C.trav2, { solid: true, topHex: C.trav });
  K.cyl(gb, F, 0, ph - 0.4, 0, rp + 0.2, rp + 0.2, 0.4, 24, mar, { top: false });
  const n2 = Math.max(2, Math.ceil(ph / 0.3)), front = o.front == null ? -Math.PI / 2 : o.front;
  // steps on the front side (local -v)
  K.stairs(gb, F, 0, 0, -rp + 0.5, o.stairW || rp * 0.9, n2, ph / n2, 0.36, -1, mar);
  const rr = rp - cr * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    K.column(gb, F, Math.cos(a) * rr, ph, Math.sin(a) * rr, ch, cr, o.order || 'c', mar);
  }
  K.cyl(gb, F, 0, ph, 0, rc, rc, ch, 20, o.cella || mar, { solid: true });
  K.cyl(gb, F, 0, ph + ch, 0, rr + cr * 1.4, rr + cr * 1.4, ch * 0.18, 24, mar, { bot: true }); // seen from the colonnade
  K.cyl(gb, F, 0, ph + ch * 1.18, 0, rr + cr * 1.8, 0.8, o.roofH || rr * 0.55, 24, o.roof || C.bronze, { top: false, bot: true });
  if (o.smoke) K.cyl(gb, F, 0, ph + ch * 1.18 + (o.roofH || rr * 0.55) - 0.4, 0, 0.9, 0.7, 0.8, 8, shadeHex(o.roof || C.bronze, 0.8));
  K.panel(gb, F, 0, ph, -rc - 0.03, 2.2, ch * 0.55, 0x2a1d14, -1);
  mapCircle(F.x, F.z, rp, '#e6dccb');
}

// triumphal arch; passage along the frame's v axis. o: w (across, u), d (along passage), h, pw, ph (passage), attic, three (side passages)
function triArch(F, o) {
  const gb = gbF(o.layer || 'mon', F), mar = o.marble || C.marble;
  const w = o.w, d = o.d, h = o.h, pw = o.pw, ph = o.ph, at = o.attic || h * 0.28;
  const body = h - at;
  reserve(F, 0, 0, w, d, 1);
  const pierW = o.three ? (w - pw - 2 * o.spw) / 4 : (w - pw) / 2;
  // central opening: two piers and the vault above
  const lay = o.three ? [-(pw / 2 + pierW + o.spw + pierW / 2), -(pw / 2 + pierW / 2), pw / 2 + pierW / 2, pw / 2 + pierW + o.spw + pierW / 2] : [-(pw / 2 + pierW / 2), pw / 2 + pierW / 2];
  for (const u of lay) K.box(gb, F, u, 0, 0, pierW, body, d, mar, { solid: true });
  const S = F.sub(0, 0, 0); // arch tops are along u with thickness along v
  K.archTop(gb, S, 0, 0, ph - pw / 2, pw / 2, body, d, mar, 8);
  if (o.three) for (const s of [-1, 1]) K.archTop(gb, S, s * (pw / 2 + pierW + o.spw / 2), 0, o.sph - o.spw / 2, o.spw / 2, body, d, mar, 6);
  // engaged columns on both faces
  const cols = o.three ? [-w / 2 + 0.6, -(pw / 2 + pierW - 0.3), -(pw / 2 + 0.6), pw / 2 + 0.6, pw / 2 + pierW - 0.3, w / 2 - 0.6] : [-w / 2 + 0.7, -(pw / 2 + 0.7), pw / 2 + 0.7, w / 2 - 0.7];
  for (const s of [-1, 1]) for (const u of cols) K.column(gb, F, u, 0.4, s * (d / 2 + 0.45), body - 1.6, 0.5, 'c', mar, { solid: false });
  K.box(gb, F, 0, body - 1.2, 0, w + 0.4, 1.2, d + 1.4, mar);
  K.box(gb, F, 0, body, 0, w * 0.96, at, d * 0.94, mar);
  if (o.quadriga) {
    K.box(gb, F, 0, h, 0, w * 0.4, 0.5, d * 0.5, C.bronze);
    for (let i = 0; i < 4; i++) K.box(gb, F, -1.8 + i * 1.2, h + 0.5, -0.3, 0.45, 1.6, 2.2, C.bronze);
    K.box(gb, F, 0, h + 0.5, 1.2, 2.4, 1.4, 1.4, C.bronze);
    K.box(gb, F, 0, h + 1.9, 1.2, 0.6, 1.6, 0.6, C.gilt);
  }
  mapRect(F, 0, 0, w, d, '#e6dccb');
  return { body, attic: at };
}

// a rectangle of arcades (two storeys optional): basilicas, the Tabularium, warehouses. Bays along u (nu) and v (nv).
function arcadeRect(gb, F, w, d, y, h, nu, nv, pierW, t, hex, o = {}) {
  const side = (S, L, n, skip) => { if (!skip) K.arcade(gb, S, -L / 2, L / 2, 0, y, n, pierW, y + h * 0.58, y + h, t, hex, { halfCol: o.halfCol, solid: o.solid }); };
  side(F.sub(0, -d / 2, 0, F.y), w, nu, o.skip && o.skip.includes('f'));
  side(F.sub(0, d / 2, Math.PI, F.y), w, nu, o.skip && o.skip.includes('k'));
  side(F.sub(-w / 2, 0, -Math.PI / 2, F.y), d, nv, o.skip && o.skip.includes('l'));
  side(F.sub(w / 2, 0, Math.PI / 2, F.y), d, nv, o.skip && o.skip.includes('r'));
}

// basilica: stepped platform, two storeys of arcades all round, an inner hall with clerestory and roofs
function basilica(F, o) {
  const gb = gbF('mon', F), w = o.w, d = o.d, b = o.base || 1.2, h1 = o.h1 || 9, h2 = o.h2 || 7, aisle = o.aisle || 8;
  const col = o.col || C.marble2;
  reserve(F, 0, 0, w + 2, d + 6, 3);
  // platform and front steps
  K.box(gb, F, 0, 0, 0, w + 2, b, d + 2, C.trav2, { solid: true, top: C.trav });
  const ns = Math.ceil(b / 0.25);
  K.stairs(gb, F, 0, 0, -d / 2 - 1, w + 2, ns, b / ns, 0.4, -1, C.trav);
  arcadeRect(gb, F, w, d, b, h1, o.nu, o.nv, 1.4, 1.4, col, { halfCol: C.marble });
  arcadeRect(gb, F, w, d, b + h1 + 0.8, h2, o.nu, o.nv, 1.2, 1.0, col, { halfCol: C.marble, solid: false });
  // floor slab between storeys over the aisles (seen from below as the ceiling of the walkway)
  const iw = w - 2 * aisle, id = d - 2 * aisle;
  for (const [u, v, ww, dd] of [[0, -(d / 2 - aisle / 2), w, aisle], [0, d / 2 - aisle / 2, w, aisle], [-(w / 2 - aisle / 2), 0, aisle, id], [w / 2 - aisle / 2, 0, aisle, id]])
    K.box(gb, F, u, b + h1, v, ww, 0.8, dd, shadeHex(col, 0.85), { skip: '' });
  // inner piers carrying the clerestory
  const nI = Math.max(2, Math.round(o.nu * 0.7));
  for (let i = 0; i <= nI; i++) for (const s of [-1, 1]) K.box(gb, F, -iw / 2 + (i / nI) * iw, b, s * id / 2, 1.3, h1 + h2 + 0.8, 1.3, col, { solid: true });
  for (let i = 1; i < Math.round(nI * id / iw); i++) for (const s of [-1, 1]) K.box(gb, F, s * iw / 2, b, -id / 2 + (i / Math.round(nI * id / iw)) * id, 1.3, h1 + h2 + 0.8, 1.3, col, { solid: true });
  // clerestory walls with windows, roofs
  const ch = o.hc || 6, yc = b + h1 + h2 + 0.8;
  K.box(gb, F, 0, yc, 0, iw + 1.2, ch, id + 1.2, col, { skip: 'b' });
  for (let i = 0; i < nI; i++) for (const s of [-1, 1]) K.panel(gb, F, -iw / 2 + (i + 0.5) * (iw / nI), yc + 1.4, s * (id / 2 + 0.62), 2.2, 2.8, 0x2a2018, s);
  K.gable(gb, F, 0, yc + ch, 0, iw + 2.4, id + 2.4, (id + 2.4) * 0.16, C.tile, { side: col });
  // aisle roofs: low lean-to tiles round the clerestory
  K.tbox(gb, F, 0, b + h1 + 0.8 + h2, 0, w + 0.6, d + 0.6, iw + 1.2, id + 1.2, 0.01, C.tile2);
  // ceiling over the nave (inside you look up into timber beams)
  K.box(gb, F, 0, yc - 0.2, 0, iw, 0.2, id, C.woodD, { skip: 't' });
  pavement(F, 0, 0, w - 1, d - 1, o.floor || 0xcfc3a8, { y: b, yo: 0.02, slab: 2.5, layer: 'mon' });
  mapRect(F, 0, 0, w, d, '#e0d6c4');
}

// porticus: a colonnaded enclosure around a rectangle (w × d), open courtyard inside. sides: which sides have porticoes
// (default all four). gaps: [{ side: 'f'|'k'|'l'|'r', w }] doorways in the back wall (centred).
function porticus(F, o) {
  const gb = gbF(o.layer || 'mon', F), w = o.w, d = o.d, dep = o.depth || 7, ch = o.colH || 7, cr = o.colR || ch / 20;
  const wallH = ch + 1.4, sp = o.sp || 4.5, mar = o.marble || C.marble, wc = o.wall || C.trav;
  const sides = o.sides || 'fklr';
  if (!o.noRes) reserve(F, 0, 0, w, d, 2);
  const run = (S, L, key) => {
    if (!sides.includes(key)) return;
    const gap = (o.gaps || []).find((g) => g.side === key);
    if (gap) {
      const a = (L - gap.w) / 2;
      wall(gb, S, -L / 2, 0, -L / 2 + a, 0, 0, wallH, 1, wc);
      wall(gb, S, L / 2 - a, 0, L / 2, 0, 0, wallH, 1, wc);
      K.box(gb, S, 0, ch, 0, gap.w, wallH - ch, 1, wc);
      if (gap.prop) { // a gateway in front of the opening: two piers and the beam across
        for (const k of [-1, 1]) K.box(gb, S, k * (gap.w / 2 + 0.5), 0, -dep - 1.2, 1, ch + 3.2, 1.6, mar, { solid: true });
        K.box(gb, S, 0, ch, -dep - 1.2, gap.w, 3.2, 1.6, mar);
      }
    } else wall(gb, S, -L / 2, 0, L / 2, 0, 0, wallH, 1, wc);
    if (o.exedra && o.exedra.includes(key)) K.ring(gb, S, 0, 0, 0.5, o.exR - 1, o.exR, wallH, 18, wc, { solid: true, gaps: [[S.ang - Math.PI + 0.01, S.ang - 0.01]] });
    const n = Math.max(2, Math.round((L - 2 * dep) / sp));
    K.colonnade(gb, S, -L / 2 + dep, -dep, L / 2 - dep, -dep, n + 1, 0, ch, cr, o.order || 'c', mar);
    K.box(gb, S, 0, ch, -dep / 2 + 0.1, L - (key === 'l' || key === 'r' ? 0 : 0), 0.8, dep + 0.6, mar, { skip: '' });
    K.tbox(gb, S, 0, ch + 0.8, -dep / 2 + 0.1, L, dep + 0.6, L, 0.01, 1.4, C.tile, { ov: dep / 2 + 0.1 }); // back edge inside the wall
    if (o.floor !== false) pavement(S, 0, -dep / 2, L - 0.5, dep - 0.5, C.trav, { yo: 0.08, slab: 2.5, layer: 'mon' });
  };
  // each side's own frame has the back wall on its v = 0 line and the colonnade toward -v (the courtyard)
  run(F.sub(0, -d / 2, Math.PI, F.y), w, 'f');
  run(F.sub(0, d / 2, 0, F.y), w, 'k');
  run(F.sub(-w / 2, 0, Math.PI / 2, F.y), d, 'l');
  run(F.sub(w / 2, 0, -Math.PI / 2, F.y), d, 'r');
}

// bridge from world A to B: arched deck stepped so it can be walked, parapets, piers into the water
function bridge(ax, az, bx, bz, w, o = {}) {
  const L = Math.hypot(bx - ax, bz - az), F = new Frame(ax, az, Math.atan2(bz - az, bx - ax) - Math.PI / 2, 0);
  // in F: v runs from A (v=0) to B (v=L)... Frame u axis = (c, s); with ang = atan2 - 90°, the v axis points A→B
  const gb = gbF('mon', F), ya = o.ya != null ? o.ya : groundAt(ax, az), yb = o.yb != null ? o.yb : groundAt(bx, bz);
  const rise = o.rise || 3, n = Math.ceil(L / 1.6), col = o.col || C.tuff;
  reserve(F, 0, L / 2, w + 4, L + 16, 2);
  const prof = (t) => lerp(ya, yb, t) + Math.sin(t * Math.PI) * rise;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, y = prof((t0 + t1) / 2);
    K.box(gb, F, 0, y - 1.2, (t0 + t1) / 2 * L, w, 1.2, L / n + 0.02, col, { solid: true, top: C.basalt });
    for (const s of [-1, 1]) K.box(gb, F, s * (w / 2 - 0.25), y, (t0 + t1) / 2 * L, 0.5, 1.05, L / n + 0.02, C.trav, { solid: true });
  }
  // arches below
  const na = o.arches || Math.max(2, Math.round(L / 26)), span = L / na;
  for (let k = 0; k <= na; k++) {
    const v = k * span, y = prof(k / na) - 1.2;
    const g = Math.min(groundAt(F.wx(0, v), F.wz(0, v)), WATER_Y - 1);
    if (k > 0 && k < na) K.box(gb, F, 0, g - F.y, v, w + 1.2, y - g, 4.2, col);
  }
  for (let k = 0; k < na; k++) {
    const vc = (k + 0.5) * span, y = prof((k + 0.5) / na) - 1.2;
    const S = F.sub(0, vc, Math.PI / 2, 0);
    for (const s of [-1, 1]) K.archTop(gb, S, 0, s * (w / 2 - 0.4), y - span * 0.45 - 0.2, (span - 4.2) / 2, y, 0.8, col, 6);
  }
  mapLine([[ax, az], [bx, bz]], w, '#9a8f7c');
  addPath([[ax, az], [lerp(ax, bx, 0.5), lerp(az, bz, 0.5)], [bx, bz]], { hw: w / 2 - 0.9, kind: 'road', cart: true, dens: 1.2 });
  return F;
}

// a basin fountain: o.big for a nymphaeum-sized one
function fountain(F, u, v, o = {}) {
  const gb = gbF('city', F), r = o.r || 1.4;
  const S = site(F, u, v, o.a || 0);
  if (o.round) {
    K.ring(gb, S, 0, 0, 0, r - 0.3, r, 0.75, 16, C.trav, { solid: true });
    K.cyl(gb, S, 0, 0, 0, r - 0.3, r - 0.3, 0.55, 16, C.water);
    K.cyl(gb, S, 0, 0, 0, 0.35, 0.3, 1.8, 8, C.marble);
  } else {
    K.box(gb, S, 0, 0, 0, r * 2, 0.8, r * 1.2, C.trav, { solid: true });
    K.box(gb, S, 0, 0.8, 0, r * 2 - 0.4, 0.02, r * 1.2 - 0.4, C.water);
    K.box(gb, S, 0, 0, r * 0.6 + 0.2, 0.6, 1.6, 0.4, C.trav2, { solid: true });
    K.box(gb, S, 0, 1.15, r * 0.6 - 0.05, 0.2, 0.2, 0.3, C.bronze);
  }
  W.fountains.push({ x: S.x, z: S.z, big: !!o.big });
  return S;
}
function altar(gb, F, u, v, s = 1) {
  K.box(gb, F, u, 0, v, 2.4 * s, 0.3 * s, 1.6 * s, C.trav, { solid: true });
  K.box(gb, F, u, 0.3 * s, v, 2.0 * s, 0.9 * s, 1.2 * s, C.marble, { solid: true });
  K.box(gb, F, u, 1.2 * s, v, 2.3 * s, 0.2 * s, 1.5 * s, C.marble);
  for (const a of [-1, 1]) K.cyl(gb, F, u + a * 1.0 * s, 1.4 * s, v, 0.22 * s, 0.22 * s, 1.3 * s, 6, C.marble);
}
function obelisk(gb, F, u, v, h, o = {}) {
  const b = h * 0.09;
  K.box(gb, F, u, 0, v, b * 2.6, h * 0.12, b * 2.6, o.base || C.marble2, { solid: true });
  K.tbox(gb, F, u, h * 0.12, v, b, b, b * 0.62, b * 0.62, h * 0.82, o.col || 0xc9876a);
  K.tbox(gb, F, u, h * 0.94, v, b * 0.62, b * 0.62, 0.01, 0.01, h * 0.06, o.tip || C.gilt);
}
// a timber scaffold tower: poles and planks
function scaffold(gb, F, u, v, w, d, h) {
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box(gb, F, u + a * w / 2, 0, v + b * d / 2, 0.2, h, 0.2, C.wood);
  for (let y = 2; y < h; y += 2.2) {
    K.box(gb, F, u, y, v - d / 2, w, 0.12, 0.12, C.wood); K.box(gb, F, u, y, v + d / 2, w, 0.12, 0.12, C.wood);
    K.box(gb, F, u, y, v, w, 0.08, d, 0x8a6a44);
  }
}
