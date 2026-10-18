// Roma Aeterna — the city where people lived: apartment blocks (insulae) with shops on the ground floor, town houses
// (domus), warehouses, neighbourhood fountains and shrines; a district generator for the neighbourhoods; and the hand-made
// street of the Subura with shops you can walk into.

const WALLS = [0xd9c49a, 0xe2d2b0, 0xcf9f6a, 0xc77f5a, 0xe8dcc4, 0xd8b88a, 0xbf8a5e];
const BANDS = [0x8a3a2a, 0xa0522d, 0x9a6a3a, 0x6a3a2a, 0x2e2622];
const SHOP_ROLES = ['baker', 'cook', 'wineseller', 'butcher', 'cobbler', 'grocer', 'potter', 'smith', 'weaver', 'vendor', 'barber', 'lampmaker', 'fishmonger'];
// a window (dark by day; lit ones glow warm at night)
function winPanel(gl, S, u, y, v, w, h, fac, alongU = true, litP = 0.35) {
  const lit = RNG() < litP;
  const col = lit ? mixHex(0xffc070, 0xffe0a0, RNG()) : 0x1e1812;
  if (alongU) K.panel(gl, S, u, y, v, w, h, col, fac); else K.panelU(gl, S, u, y, v, w, h, col, fac);
}
// rows of windows on one face of a block from y0 up through n floors
function windowRows(gl, g, S, face, len, off, y0, n, fh, o = {}) {
  const per = Math.max(1, Math.floor(len / (o.spacing || 3.4)));
  for (let f = 0; f < n; f++) for (let i = 0; i < per; i++) {
    if (RNG() < (o.skip || 0.12)) continue;
    const t = -len / 2 + (i + 0.5) * len / per, y = y0 + f * fh + 0.9, wh = f === n - 1 ? 0.9 : 1.25;
    if (face === 'f') winPanel(gl, S, t, y, -off - 0.04, 0.95, wh, -1);
    else if (face === 'k') winPanel(gl, S, t, y, off + 0.04, 0.95, wh, 1);
    else if (face === 'l') winPanel(gl, S, -off - 0.04, y, t, 0.95, wh, -1, false);
    else winPanel(gl, S, off + 0.04, y, t, 0.95, wh, 1, false);
    if (o.shutters && RNG() < 0.3 && (face === 'f' || face === 'k')) { const s = face === 'f' ? -1 : 1; K.box(g, S, t + 0.75, y, s * (off + 0.08), 0.5, wh, 0.06, C.woodD); }
  }
}

// ---------- insula: an apartment block, shops below. Frame S centred on the footprint, front toward -v ----------
function insula(S, w, d, o = {}) {
  const g = gbF('city', S), gl = gbF('glow', S), ds = gbF('ds', S);
  const [lo, hi] = groundRange(S, 0, 0, w, d);
  const base = lo - S.y - 0.4, gf = hi - S.y;
  const n = o.floors || rint(3, 5), fh = 3.0, g0 = gf + 4.0, top = g0 + n * fh;
  const brick = o.brick != null ? o.brick : chance(0.45);
  const wall = brick ? shadeHex(rpick([C.brick, C.brick2, 0xb07a58, 0xa8704e]), rnd(0.92, 1.05)) : rpick(WALLS);
  K.box(g, S, 0, base, 0, w, top - base, d, wall, { solid: true });
  if (!brick) K.box(g, S, 0, base, 0, w + 0.06, gf - base + 1.3, d + 0.06, rpick(BANDS));
  K.box(g, S, 0, g0 - 0.1, 0, w + 0.3, 0.25, d + 0.3, brick ? C.trav2 : shadeHex(wall, 0.85));
  K.hip(g, S, 0, top, 0, w + 0.8, d + 0.8, Math.min(w, d) * 0.16, rpick([C.tile, C.tile2, 0xae6444]));
  // ground floor: shops on the front (and on a side if it's a corner)
  const fy = Math.min(groundAt(S.wx(-w / 2, -d / 2), S.wz(-w / 2, -d / 2)), groundAt(S.wx(w / 2, -d / 2), S.wz(w / 2, -d / 2))) - S.y;
  const ns = Math.max(1, Math.floor(w / 4.4));
  const door = rint(0, ns - 1);
  const portico = o.portico != null ? o.portico : chance(0.3);
  for (let i = 0; i < ns; i++) {
    const u = -w / 2 + (i + 0.5) * w / ns;
    if (i === door) { K.panel(gl, S, u, fy, -d / 2 - 0.04, 1.3, 2.4, 0x14100c, -1); K.box(g, S, u, fy + 2.4, -d / 2 - 0.08, 1.8, 0.3, 0.2, C.trav); continue; }
    const lit = chance(0.45);
    K.panel(gl, S, u, fy, -d / 2 - 0.04, 3.1, 3.0, lit ? 0xc88a48 : 0x231a12, -1);
    K.box(g, S, u, fy + 3.0, -d / 2 - 0.1, 3.5, 0.32, 0.26, C.wood);
    if (chance(0.5)) K.box(g, S, u - 0.7, fy, -d / 2 - 0.4, 1.6, 0.95, 0.8, chance(0.5) ? C.plaster : C.trav, { solid: true });
    if (!portico && chance(0.3)) K.tbox(ds, S, u, fy + 3.1, -d / 2 - 0.9, 3.2, 1.8, 3.2, 0.2, 0.25, rpick([0xcfb48a, 0xb85a3a, 0xd8cfb4, 0x9a7a5a]), { ov: 0.8 });
    if (chance(o.shopP == null ? 0.16 : o.shopP)) W.spots.push({ kind: 'shop', x: S.wx(u + 0.4, -d / 2 - 0.9), z: S.wz(u + 0.4, -d / 2 - 0.9), yaw: S.yaw + Math.PI, role: rpick(SHOP_ROLES), h: [6.5, 19.5] });
  }
  // Nero's rule after the fire: porticoes in front of apartment blocks
  if (portico) {
    const np = Math.max(2, Math.round(w / 4));
    for (let i = 0; i <= np; i++) K.box(g, S, -w / 2 + 0.4 + i * (w - 0.8) / np, fy, -d / 2 - 2.3, 0.6, g0 - fy, 0.6, brick ? wall : C.trav2, { solid: true });
    K.box(g, S, 0, g0 - 0.35, -d / 2 - 1.2, w, 0.35, 2.5, brick ? shadeHex(wall, 0.9) : C.trav2, { skip: '' });
    K.box(g, S, 0, g0, -d / 2 - 2.35, w, 0.9, 0.12, C.woodD);
  } else if (chance(0.45)) { // a wooden balcony on the first floor
    const bw = w * rnd(0.4, 0.85);
    K.box(g, S, 0, g0 + 0.1, -d / 2 - 0.65, bw, 0.18, 1.3, C.wood, { skip: '' });
    K.box(g, S, 0, g0 + 0.28, -d / 2 - 1.28, bw, 0.9, 0.08, C.woodD);
    for (let i = 0; i < 3; i++) K.box(g, S, -bw / 2 + i * bw / 2, g0 - 0.6, -d / 2 - 0.65, 0.15, 0.7, 1.2, C.woodD);
    if (chance(0.4)) for (let i = 0; i < 3; i++) K.panel(ds, S, -bw / 2 + 0.8 + i * 1.1, g0 + 1.2, -d / 2 - 1.2, 0.8, 1.2, rpick([0xe8e0d0, 0xb85a3a, 0x8a9ab0, 0xd8c070]), -1);
  }
  windowRows(gl, g, S, 'f', w, d / 2, g0, n, fh, { shutters: true });
  windowRows(gl, g, S, 'k', w, d / 2, g0, n, fh, { skip: 0.3 });
  windowRows(gl, g, S, 'l', d, w / 2, g0, n, fh, { skip: 0.45 });
  windowRows(gl, g, S, 'r', d, w / 2, g0, n, fh, { skip: 0.45 });
  if (chance(0.12)) { // a roof garden
    for (let i = 0; i < 4; i++) K.box(g, S, -w / 4 + i * w / 6, top, -d / 4, 0.6, 0.6, 0.6, C.tile2);
  }
  mapRect(S, 0, 0, w, d, brick ? '#b88a6a' : '#c8a882');
  return { top, g0, fy };
}

// ---------- domus: a town house, blank walls to the street, shops either side of the door, an atrium and a garden ----------
function domus(S, w, d, o = {}) {
  const g = gbF('city', S), gl = gbF('glow', S);
  const [lo, hi] = groundRange(S, 0, 0, w, d);
  const base = lo - S.y - 0.4, fy = hi - S.y, h = 6.5;
  const wc = rpick(WALLS), band = rpick(BANDS);
  const ad = d * 0.55; // front part (atrium) depth
  K.box(g, S, 0, base, -d / 2 + ad / 2, w, fy - base + h, ad, wc, { solid: true });
  K.box(g, S, 0, base, -d / 2 + ad / 2, w + 0.06, fy - base + 1.2, ad + 0.06, band);
  // roof round the atrium, with the opening of the compluvium
  const aw = Math.min(6, w * 0.3), aa = Math.min(5, ad * 0.35);
  K.tbox(g, S, 0, fy + h, -d / 2 + ad / 2, w + 0.6, ad + 0.6, aw, aa, 1.8, C.tile);
  K.box(g, S, 0, fy + h + 1.75, -d / 2 + ad / 2, aw, 0.05, aa, 0x2a2018);
  // back: the peristyle garden inside high walls, roofed walks round it
  const pv = d / 2 - (d - ad) / 2;
  for (const [u0, v0, u1, v1] of [[-w / 2, d / 2, w / 2, d / 2], [-w / 2, -d / 2 + ad, -w / 2, d / 2], [w / 2, -d / 2 + ad, w / 2, d / 2]]) wall(g, S, u0, v0, u1, v1, base, fy - base + h - 1, 0.6, wc, { ext: 0.6 });
  K.box(g, S, 0, fy, pv, w - 1.2, 0.12, d - ad - 1.2, 0x6f8a45);
  for (const s of [-1, 1]) K.tbox(g, S, s * (w / 2 - 1.8), fy + h - 1.5, pv, 3.6, d - ad, 0.1, d - ad, 1.0, C.tile2, { ou: -s * 1.7 });
  const cn = Math.max(2, Math.floor((d - ad) / 3.2));
  for (let i = 0; i < cn; i++) for (const s of [-1, 1]) K.column(g, S, s * (w / 2 - 3.6), fy, -d / 2 + ad + 1.6 + i * ((d - ad - 3.2) / Math.max(1, cn - 1)), h - 1.5, 0.2, 'd', C.plaster, { solid: false, seg: 6 });
  treeAt(S.wx(rnd(-w / 5, w / 5), pv), S.wz(rnd(-w / 5, w / 5), pv), rpick(['laurel', 'fig', 'plane', 'cypress']), 0.8, S.y + fy);
  // the door, with pilasters and a little pediment
  const DF = S.sub(0, -d / 2, 0, S.y);
  K.panel(gl, DF, 0, fy, -0.04, 2.0, 3.4, 0x2a1d14, -1);
  for (const s of [-1, 1]) K.box(g, DF, s * 1.45, fy, -0.15, 0.5, 3.8, 0.3, C.trav);
  K.box(g, DF, 0, fy + 3.8, -0.2, 3.6, 0.4, 0.4, C.trav);
  // shops either side
  const ns = Math.max(0, Math.floor((w / 2 - 2.5) / 4));
  for (const s of [-1, 1]) for (let i = 0; i < ns; i++) {
    const u = s * (2.6 + (i + 0.5) * 4);
    K.panel(gl, S, u, fy, -d / 2 - 0.04, 3.0, 2.9, chance(0.45) ? 0xc88a48 : 0x231a12, -1);
    K.box(g, S, u, fy + 2.9, -d / 2 - 0.1, 3.4, 0.3, 0.24, C.wood);
    if (chance(0.15)) W.spots.push({ kind: 'shop', x: S.wx(u, -d / 2 - 0.9), z: S.wz(u, -d / 2 - 0.9), yaw: S.yaw + Math.PI, role: rpick(SHOP_ROLES), h: [6.5, 19.5] });
  }
  if (o.clients || chance(0.12)) for (let i = 0; i < rint(2, 5); i++) W.spots.push({ kind: 'queue', x: S.wx(-1.5 + i * 0.8, -d / 2 - 1.4 - (i % 2) * 0.5), z: S.wz(-1.5 + i * 0.8, -d / 2 - 1.4 - (i % 2) * 0.5), yaw: S.yaw, role: 'client', h: [6, 9.5] });
  mapRect(S, 0, 0, w, d, '#c9a98a');
}

// ---------- warehouse (horrea) ----------
function horrea(S, w, d) {
  const g = gbF('city', S), gl = gbF('glow', S);
  const [lo, hi] = groundRange(S, 0, 0, w, d);
  const base = lo - S.y - 0.4, fy = hi - S.y, h = rnd(7, 11);
  K.box(g, S, 0, base, 0, w, fy - base + h, d, C.brick, { solid: true });
  K.hip(g, S, 0, fy + h, 0, w + 0.6, d + 0.6, Math.min(w, d) * 0.14, C.tile2);
  K.panel(gl, S, 0, fy, -d / 2 - 0.04, 3.4, 4, 0x1e1812, -1);
  for (const s of [-1, 1]) K.box(g, S, s * 2.1, fy, -d / 2 - 0.15, 0.6, 4.6, 0.3, C.trav);
  K.box(g, S, 0, fy + 4.4, -d / 2 - 0.2, 4.8, 0.6, 0.4, C.trav);
  for (let i = 0; i < Math.floor(w / 5); i++) K.panel(gl, S, -w / 2 + 2.5 + i * 5, fy + h - 2.4, -d / 2 - 0.04, 0.8, 0.8, 0x1e1812, -1);
  mapRect(S, 0, 0, w, d, '#a87a5c');
}

// ---------- neighbourhood fountain (lacus) and crossroads shrine (compitum) ----------
function lacus(x, z, ang) {
  const S = siteW(x, z, ang), g = gbF('city', S);
  K.box(g, S, 0, 0, 0, 2.6, 0.85, 1.6, C.trav, { solid: true });
  K.box(g, S, 0, 0.85, 0, 2.3, 0.02, 1.3, C.water);
  K.box(g, S, 0, 0, 1.0, 0.7, 1.7, 0.45, C.trav2, { solid: true });
  K.box(g, S, 0, 1.25, 0.72, 0.35, 0.35, 0.2, C.marble);
  K.box(g, S, 0, 1.25, 0.55, 0.06, 0.06, 0.25, C.bronze);
  W.fountains.push({ x, z });
  W.spots.push({ kind: 'fetch', x: S.wx(0, -1.3), z: S.wz(0, -1.3), yaw: S.yaw, role: 'waterbearer', h: [5.5, 20] });
}
function compitum(x, z, ang) {
  const S = siteW(x, z, ang), g = gbF('city', S);
  K.box(g, S, 0, 0, 0.4, 1.8, 1.2, 0.8, C.plaster, { solid: true });
  K.box(g, S, 0, 1.2, 0.6, 1.6, 1.6, 0.4, 0x9c3a2a);
  K.panel(g, S, -0.4, 1.4, 0.38, 0.35, 0.9, 0xd9b24a, -1); K.panel(g, S, 0.4, 1.4, 0.38, 0.35, 0.9, 0xd9b24a, -1);
  K.gable(g, S, 0, 2.8, 0.6, 1.9, 0.7, 0.5, C.tile, { side: C.plaster });
  altar(g, S, 0, -0.6, 0.35);
  for (let i = 0; i < 3; i++) K.box(g, S, -0.5 + i * 0.5, 1.2, 0.1, 0.12, 0.12, 0.12, rpick([0xd8607a, 0xe8d050, 0xffffff]));
  W.lamps.push({ x: S.wx(0, 0.2), y: S.y + 2.2, z: S.wz(0, 0.2) });
}

// ======================= the district generator =======================
// A grid of streets in frame F over [u0, u1] × [v0, v1]; blocks filled according to the style.
const STYLES = {
  dense: { bu: [26, 40], bv: [22, 34], sw: [5, 6], side: 1.1, floors: [4, 6], mix: [[8, 'insula'], [1, 'domus'], [0.6, 'horrea']], dens: 1.3, portico: 0.3 },
  mixed: { bu: [28, 46], bv: [24, 38], sw: [5, 7], side: 1.2, floors: [3, 5], mix: [[5, 'insula'], [3, 'domus'], [0.8, 'horrea'], [0.6, 'garden']], dens: 1.0, portico: 0.25 },
  rich: { bu: [34, 54], bv: [30, 46], sw: [5, 6], side: 1.0, floors: [2, 3], mix: [[2, 'insula'], [5, 'domus'], [2, 'garden']], dens: 0.6, portico: 0.1 },
  trans: { bu: [24, 38], bv: [20, 32], sw: [4.5, 6], side: 0.8, floors: [3, 5], mix: [[6, 'insula'], [1, 'domus'], [2, 'horrea'], [1, 'workshop']], dens: 1.0, portico: 0.15 },
  docks: { bu: [30, 50], bv: [26, 40], sw: [6, 7], side: 0.8, floors: [2, 3], mix: [[2, 'insula'], [5, 'horrea']], dens: 0.7, portico: 0 },
};
function district(F, u0, u1, v0, v1, styleName, name) {
  const st = STYLES[styleName];
  rseed('district:' + name);
  const us = [u0], vs = [v0];
  while (us[us.length - 1] < u1 - st.bu[0]) us.push(us[us.length - 1] + rnd(st.bu[0], st.bu[1]));
  while (vs[vs.length - 1] < v1 - st.bv[0]) vs.push(vs[vs.length - 1] + rnd(st.bv[0], st.bv[1]));
  const swU = us.map(() => rnd(st.sw[0], st.sw[1])), swV = vs.map(() => rnd(st.sw[0], st.sw[1]));
  // a street segment is usable if no monument stands on it, it stays out of the river and isn't too steep
  const segOK = (a, b) => {
    for (let t = 0.0; t <= 1.0001; t += 0.1) {
      const u = lerp(a[0], b[0], t), v = lerp(a[1], b[1], t), x = F.wx(u, v), z = F.wz(u, v);
      if (monAt(x, z) || inWater(x, z) || x < T.X0 + 50 || x > T.X1 - 50 || z < T.Z0 + 50 || z > T.Z1 - 50) return false;
    }
    const ga = groundAt(F.wx(...a), F.wz(...a)), gb = groundAt(F.wx(...b), F.wz(...b));
    return Math.abs(ga - gb) / Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.22;
  };
  const okU = [], okV = []; // which segments became streets
  // streets along v (constant u)
  for (let i = 0; i < us.length; i++) {
    okU.push([]);
    for (let j = 0; j < vs.length - 1; j++) {
      const a = [us[i], vs[j]], b = [us[i], vs[j + 1]], ok = segOK(a, b);
      okU[i].push(ok);
      if (ok) fstreet(F, [a, b], { w: swU[i], side: st.side, kind: swU[i] > 5.6 ? 'road' : 'street', cart: swU[i] > 5.6, zone: 'city', dens: st.dens, trim0: swV[j] / 2 + st.side, trim1: swV[j + 1] / 2 + st.side, pave: chance(0.85) ? 'basalt' : 'earth' });
    }
  }
  for (let j = 0; j < vs.length; j++) {
    okV.push([]);
    for (let i = 0; i < us.length - 1; i++) {
      const a = [us[i], vs[j]], b = [us[i + 1], vs[j]], ok = segOK(a, b);
      okV[j].push(ok);
      if (ok) fstreet(F, [a, b], { w: swV[j], side: st.side, kind: swV[j] > 5.6 ? 'road' : 'street', cart: swV[j] > 5.6, zone: 'city', dens: st.dens, trim0: swU[i] / 2 + st.side, trim1: swU[i + 1] / 2 + st.side, pave: chance(0.85) ? 'basalt' : 'earth' });
    }
  }
  // fountains and shrines at some crossroads
  for (let i = 0; i < us.length; i++) for (let j = 0; j < vs.length; j++) {
    const nOK = (okU[i][j - 1] ? 1 : 0) + (okU[i][j] ? 1 : 0) + (okV[j][i - 1] ? 1 : 0) + (okV[j][i] ? 1 : 0);
    if (nOK < 3) continue;
    const r = RNG(), cu = us[i] + swU[i] / 2 + st.side + 1.3, cv = vs[j] + swV[j] / 2 + st.side + 1.0;
    if (r < 0.22) lacus(F.wx(cu, cv), F.wz(cu, cv), F.ang + Math.PI);
    else if (r < 0.32) compitum(F.wx(cu, cv), F.wz(cu, cv), F.ang + Math.PI);
  }
  // blocks
  const ds = (W.dstats = W.dstats || {})[name] = { lots: 0, built: 0, free: 0, slope: 0, small: 0, streets: okU.flat().filter(Boolean).length + okV.flat().filter(Boolean).length };
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) {
    const m = 0.9;
    const bu0 = us[i] + swU[i] / 2 + st.side + m, bu1 = us[i + 1] - swU[i + 1] / 2 - st.side - m;
    const bv0 = vs[j] + swV[j] / 2 + st.side + m, bv1 = vs[j + 1] - swV[j + 1] / 2 - st.side - m;
    const bw = bu1 - bu0, bd = bv1 - bv0;
    if (bw < 8 || bd < 8) { ds.small++; continue; }
    const nu = bw > 30 ? 2 : 1, nv = bd > 26 ? 2 : 1;
    for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
      let lw = bw / nu - 0.3, ld = bd / nv - 0.3;
      const cu = bu0 + (a + 0.5) * bw / nu, cv = bv0 + (b + 0.5) * bd / nv;
      const flip = nv === 2 ? b === 1 : chance(0.5);
      const S = site(F, cu, cv, flip ? Math.PI : 0);
      let type = wpick(st.mix);
      ds.lots++;
      if (!rectFree(F, cu, cv, lw, ld)) {
        // try a smaller building in the same lot
        lw *= 0.7; ld *= 0.7;
        if (!rectFree(F, cu, cv, lw, ld)) { ds.free++; continue; }
      }
      const [glo, ghi] = groundRange(F, cu, cv, lw, ld);
      if (ghi - glo > 7) { ds.slope++; continue; }
      ds.built++;
      reserve(F, cu, cv, lw, ld, 0.2);
      if (type === 'insula') insula(S, lw, ld, { floors: rint(st.floors[0], st.floors[1]), portico: chance(st.portico) });
      else if (type === 'domus') domus(S, lw, ld);
      else if (type === 'horrea' || type === 'workshop') horrea(S, lw, ld);
      else if (type === 'garden') garden(S, lw, ld);
    }
  }
}
// a walled garden (horti) with trees and a little summer house
function garden(S, w, d) {
  const g = gbF('city', S);
  for (const [u0, v0, u1, v1] of [[-w / 2, -d / 2, w / 2, -d / 2], [-w / 2, d / 2, w / 2, d / 2], [-w / 2, -d / 2, -w / 2, d / 2], [w / 2, -d / 2, w / 2, d / 2]]) wall(g, S, u0, v0, u1, v1, -0.4, 2.8, 0.5, rpick(WALLS));
  field(S, 0, 0, w - 1, d - 1, 'garden');
  for (let i = 0; i < Math.floor(w * d / 90); i++) treeAt(S.wx(rnd(-w / 2 + 2, w / 2 - 2), rnd(-d / 2 + 2, d / 2 - 2)), S.wz(rnd(-w / 2 + 2, w / 2 - 2), rnd(-d / 2 + 2, d / 2 - 2)), rpick(['pine', 'cypress', 'laurel', 'fig', 'olive', 'plane']));
  if (w > 18) { K.box(g, S, w / 4, 0, d / 4, 5, 3.5, 4, C.plaster, { solid: true }); K.hip(g, S, w / 4, 3.5, d / 4, 5.6, 4.6, 1.2, C.tile); }
}

// ======================= the neighbourhoods =======================
function buildCity() {
  // main roads first, so the district grids weave round them
  const lata = [[-150, -228], [-180, -420], [-215, -620], [-250, -820], [-290, -1050], [-320, -1300]];
  street(lata, { w: 8, side: 2, kind: 'road', cart: true, zone: 'city', dens: 1.4 });
  place('vialata', 'Via Lata', 'Via Lata', -215, -620, 40, 'district');
  street([[-150, -228], [-100, -190], [-48, -150]], { w: 7, side: 1.6, kind: 'road', cart: true, zone: 'city', dens: 1.3 });
  // Vicus Longus and Alta Semita up the valleys to the north-east
  fstreet(FF, [[5, -432], [40, -520], [80, -640], [120, -760]], { w: 6, side: 1.4, kind: 'road', cart: true, zone: 'city', dens: 1.2 });
  // Clivus Suburanus over the Esquiline, then the Via Labicana out east from the Colosseum
  fstreet(FF, [[5, -432], [90, -440], [200, -420], [300, -380], [420, -400], [600, -420], [800, -380]], { w: 6, side: 1.4, kind: 'road', cart: true, zone: 'city', dens: 1.2 });
  fstreet(FF, [[505, 10], [600, 0], [720, -20], [900, -60], [1100, -80]], { w: 7, side: 1.6, kind: 'road', cart: true, zone: 'city', dens: 1.1 });
  // the triumphal way between the Palatine and the Caelian, from the Colosseum down to Porta Capena
  fstreet(FF, [[330, 70], [320, 160], [330, 300], [370, 420], [420, 500], [445, 520]], { w: 7, side: 1.8, kind: 'road', cart: true, zone: 'city', dens: 1.3 });
  street([FFw(445, 520), [APPIA[0][0], APPIA[0][1]]], { w: 7, side: 1.8, kind: 'road', cart: true, zone: 'city', dens: 1.3 });
  // round the Velabrum to the river
  fstreet(FF, [[-128, 170], [-180, 260], [-250, 360], [-282, 420]], { w: 6, side: 1.4, kind: 'road', cart: true, zone: 'city', dens: 1.1 });
  street([FFw(-110, 190), FFw(-170, 300), [-450, 290]], { w: 6, side: 1.2, kind: 'road', cart: true, zone: 'city', dens: 1.1 });
  // along the Campus Martius
  street([[-150, -228], [-260, -180], [-380, -120], [-470, -100], [-560, -120], [-660, -160], [-780, -150]], { w: 7, side: 1.6, kind: 'road', cart: true, zone: 'city', dens: 1.2 });
  street([[-470, -100], [-440, 10], [-440, 80]], { w: 6, side: 1.2, kind: 'road', cart: true, zone: 'city' });
  street([[-560, -120], [-600, -300], [-610, -480], [-600, -650], [-640, -800]], { w: 6, side: 1.4, kind: 'road', cart: true, zone: 'city', dens: 1.2 });
  street([[-180, -420], [-400, -420], [-520, -430]], { w: 6, side: 1.4, kind: 'road', cart: true, zone: 'city', dens: 1.1 });
  street([[-215, -620], [-480, -640], [-600, -650]], { w: 6, side: 1.4, kind: 'road', cart: true, zone: 'city' });
  // Trastevere: the road from the bridges toward the Janiculum
  street([[-650, 175], [-760, 180], [-900, 220], [-1050, 260]], { w: 6, side: 1.2, kind: 'road', cart: true, zone: 'city', dens: 1.1 });
  street([[-649, 280], [-760, 300], [-900, 380], [-1000, 450]], { w: 6, side: 1.2, kind: 'road', cart: true, zone: 'city' });

  // the districts (frames angled a little differently, as the real street grids were)
  const D = (x, z, a) => new Frame(x, z, a, 0);
  district(FF, -150, 160, -660, -200, 'dense', 'subura');
  place('subura', 'The Subura', 'Subura', ...FFw(20, -330), 210, 'district', { major: true });
  district(FF.sub(0, 0, 0.12), 150, 470, -640, -330, 'mixed', 'esquiline');
  place('esquiline', 'The Esquiline', 'Mons Esquilinus', ...FFw(330, -480), 160, 'district', { major: true });
  district(FF, 330, 620, -330, -60, 'mixed', 'oppian');
  district(FF.sub(0, 0, -0.08), -330, -40, -560, -270, 'rich', 'quirinal');
  place('quirinal', 'The Quirinal', 'Collis Quirinalis', ...FFw(-170, -400), 150, 'district', { major: true });
  district(D(0, 0, 0.02), -980, -170, -1000, -90, 'trans', 'campus');
  place('campus', 'The Campus Martius', 'Campus Martius', -600, -560, 330, 'district', { major: true });
  district(FF, -260, -60, 110, 290, 'trans', 'velabrum');
  place('velabrum', 'The Velabrum', 'Velabrum', ...FFw(-160, 200), 80, 'district');
  district(FF.sub(0, 0, 0.1), -300, 140, 560, 860, 'rich', 'aventine');
  place('aventine', 'The Aventine', 'Mons Aventinus', ...FFw(-90, 700), 170, 'district', { major: true });
  district(FF.sub(0, 0, -0.05), 360, 760, 100, 560, 'rich', 'caelian');
  place('caelian', 'The Caelian', 'Mons Caelius', ...FFw(560, 330), 170, 'district', { major: true });
  district(FF, 140, 360, 540, 700, 'mixed', 'capena');
  district(D(-900, 300, 0.25), -260, 220, -420, 520, 'trans', 'trastevere');
  place('trastevere', 'Trastevere', 'Transtiberim', -930, 330, 280, 'district', { major: true });
  district(D(-560, 700, 0.1), -60, 260, -60, 260, 'docks', 'emporium');
  district(FF, 600, 900, -500, -150, 'mixed', 'esquiline2');
  district(D(-1150, -650, 0), -220, 220, -260, 260, 'rich', 'vatican');
  district(FF.sub(0, 0, 0), -380, -150, 100, 360, 'trans', 'aventinefoot');
  district(D(-370, 10, 0.05), -190, 170, -90, 110, 'trans', 'flaminius');
  place('flaminius', 'The Circus Flaminius', 'Circus Flaminius', -420, 0, 120, 'district');
  district(FF.sub(0, 0, 0.04), 270, 400, 80, 320, 'mixed', 'triumphalis');
  district(FF.sub(0, 0, -0.1), 620, 940, 280, 760, 'rich', 'lateran');
  district(FF.sub(0, 0, 0.06), 100, 330, -820, -620, 'mixed', 'viminal');
  district(D(-300, -1150, 0), -250, 330, -180, 120, 'rich', 'pincian');
}

// ======================= the Subura: a street made by hand =======================
// Frame SB runs up the street (u) from the Forum of Nerva toward the Esquiline; v < 0 is the west side.
let SB = null;
function buildSubura() {
  rseed('subura-street');
  const [ax, az] = FFw(-28, -178), [bx, bz] = FFw(5, -432);
  const L = Math.hypot(bx - ax, bz - az);
  SB = new Frame(ax, az, Math.atan2(bz - az, bx - ax), groundAt(ax, az));
  const hw = 2.8, side = 1.6, front = hw + side; // facade line
  // the street itself, with its two crossings
  street([[ax, az], [bx, bz]], { w: hw * 2, side, kind: 'road', cart: true, zone: 'subura', dens: 4.5 });
  for (const uc of [92, 178]) {
    fstreet(SB, [[uc, -70], [uc, -front - 0.2]], { w: 5, side: 1, kind: 'street', zone: 'subura', dens: 1.6, trim1: 0 });
    fstreet(SB, [[uc, front + 0.2], [uc, 70]], { w: 5, side: 1, kind: 'street', zone: 'subura', dens: 1.6, trim0: 0 });
    addPath([fw(SB, uc, -front - 0.2), fw(SB, uc, 0), fw(SB, uc, front + 0.2)], { hw: 2.5, kind: 'street', zone: 'subura', dens: 1.2 });
    // stepping stones across the carriageway, so you needn't wade through the muck
    for (const v of [-1.4, 0, 1.4]) { const S = site(SB, uc + 5.5, v, 0); K.box(gbF('city', S), S, 0, -0.1, 0, 0.9, 0.42, 0.7, 0x77736a, { solid: true }); }
  }
  placard('steppingstones', ...fw(SB, 178 + 5.5, -front + 0.6));
  // shops, side by side; [type, width]
  const west = [
    [['thermopolium', 5.5], ['books', 5], ['books', 5], ['cobbler', 5], ['stairs', 2.4], ['barber', 5], ['textile', 5], ['domus', 20], ['lamps', 5], ['grocer', 5], ['wine', 6], ['stairs', 2.4], ['potter', 5]],
    [['latrine', 9], ['smith', 6], ['butcher', 5], ['stairs', 2.4], ['bakery', 9], ['thermopolium', 6], ['fish', 5], ['stairs', 2.4], ['textile', 5], ['wine', 6], ['grocer', 5]],
    [['school', 10], ['fullonica', 12], ['thermopolium', 5.5], ['stairs', 2.4], ['barber', 5], ['lamps', 5], ['cobbler', 5], ['stairs', 2.4], ['wine', 6], ['grocer', 5]],
  ];
  const east = [
    [['wine', 6], ['butcher', 5], ['bakery', 10], ['stairs', 2.4], ['grocer', 5], ['thermopolium', 6], ['stairs', 2.4], ['smith', 6], ['textile', 5], ['books', 5], ['perfume', 5], ['stairs', 2.4], ['cobbler', 5]],
    [['balneum', 14], ['cobbler', 5], ['wine', 6], ['stairs', 2.4], ['fullonica', 12], ['potter', 5], ['grocer', 5], ['lamps', 5], ['stairs', 2.4], ['barber', 5]],
    [['vigiles', 14], ['thermopolium', 6], ['stairs', 2.4], ['bakery', 9], ['lamps', 5], ['fish', 5], ['barber', 5], ['wine', 6]],
  ];
  const segs = [[3, 88], [97, 174], [183, L - 3]];
  for (const [list, sgn] of [[west, -1], [east, 1]]) {
    for (let k = 0; k < 3; k++) {
      let u = segs[k][0];
      // group shops into buildings of 12-22 m
      let group = [], gw = 0;
      const flush = () => { if (group.length) heroBuilding(sgn, u - gw, group, front); group = []; gw = 0; };
      for (const lot of list[k]) {
        if (u + lot[1] > segs[k][1]) break;
        if (lot[0] === 'domus' || lot[0] === 'latrine' || lot[0] === 'balneum' || lot[0] === 'vigiles' || lot[0] === 'school') { flush(); heroBuilding(sgn, u, [lot], front); u += lot[1] + 0.3; continue; }
        group.push(lot); gw += lot[1]; u += lot[1];
        if (gw > rnd(12, 22)) { flush(); u += 0.3; }
      }
      flush();
    }
  }
  // the crossroads: a public fountain on one corner, the shrine of the Lares of the crossroads on another
  lacus(SB.wx(92 + 5.5, -front + 0.9), SB.wz(92 + 5.5, -front + 0.9), SB.ang + Math.PI / 2 + Math.PI);
  placard('lacus', ...fw(SB, 92 + 8, -front + 0.6));
  compitum(SB.wx(92 - 5.5, front - 0.9), SB.wz(92 - 5.5, front - 0.9), SB.ang - Math.PI / 2 + Math.PI);
  placard('compitum', ...fw(SB, 92 - 8.5, front - 0.6));
  lacus(SB.wx(178 - 5.5, front - 0.9), SB.wz(178 - 5.5, front - 0.9), SB.ang - Math.PI / 2 + Math.PI);
  reserve(SB, L / 2, 0, L, 60, 0);
  place('suburastreet', 'A street in the Subura', 'Vicus in Subura', ...fw(SB, 90, 0), 40, 'scene', { area: 'The Subura', spawn: fw(SB, 10, 0), spawnYaw: SB.yawOf(1, 0) + Math.PI, major: true });
  placard('subura', ...fw(SB, 8, -front + 0.6));
  placard('insula', ...fw(SB, 60, front - 0.6));
  placard('graffiti', ...fw(SB, 140, -front + 0.6));
  W.spots.push({ kind: 'beg', x: SB.wx(30, front - 0.7), z: SB.wz(30, front - 0.7), yaw: SB.yawOf(0, -1), role: 'beggar', h: [6, 20] });
  W.spots.push({ kind: 'stand', x: SB.wx(110, -front + 0.8), z: SB.wz(110, -front + 0.8), yaw: SB.yawOf(0, 1), role: 'poet', h: [8, 17] });
  W.spots.push({ kind: 'stand', x: SB.wx(200, front - 0.8), z: SB.wz(200, front - 0.8), yaw: SB.yawOf(0, -1), role: 'gossip', h: [7, 19] });
  W.spots.push({ kind: 'stand', x: SB.wx(201, front - 0.9), z: SB.wz(201, front - 0.9), yaw: SB.yawOf(-1, 0), role: 'gossip', h: [7, 19] });
  W.spots.push({ kind: 'play', x: SB.wx(150, front - 0.7), z: SB.wz(150, front - 0.7), yaw: SB.yawOf(0, -1), role: 'child', h: [8, 17] });
  W.spots.push({ kind: 'play', x: SB.wx(151, front - 0.8), z: SB.wz(151, front - 0.8), yaw: SB.yawOf(-1, 0), role: 'child', h: [8, 17] });
}

// one building on the hero street: the given shops on the ground floor, apartments above.
// sgn: -1 west side, 1 east side; u: street position of the building's first lot
function heroBuilding(sgn, u, lots, front) {
  const W1 = lots.reduce((s, l) => s + l[1], 0);
  const deep = lots[0][0] === 'domus' ? 28 : lots[0][0] === 'latrine' || lots[0][0] === 'balneum' || lots[0][0] === 'vigiles' ? 14 : 15;
  const uc = u + W1 / 2, vc = sgn * (front + deep / 2);
  // building frame: front (-v) toward the street
  const S = site(SB, uc, vc, sgn < 0 ? Math.PI : 0);
  const g = gbF('city', S), gl = gbF('glow', S), ds = gbF('ds', S), p = gbF('prop', S);
  // local u of a street position (the west side is turned round)
  const lu = (su) => (sgn > 0 ? 1 : -1) * (su - uc);
  const [lo, hi] = groundRange(S, 0, 0, W1, deep);
  const base = lo - S.y - 0.4, fy = Math.max(0, hi - S.y - 0.3), gh = 4.2;
  const brick = chance(0.4), wallC = brick ? rpick([C.brick, C.brick2, 0xb07a58]) : rpick(WALLS), band = rpick(BANDS);
  const n = lots[0][0] === 'domus' ? 1 : rint(3, 5), fh = 3.0, top = fy + gh + n * fh;
  const D2 = deep / 2, RD = 4.8; // shop room depth
  if (lots[0][0] === 'domus') { heroDomus(S, W1, deep, fy, base); return; }
  // upper floors (overhanging nothing; you see their underside as the shop ceilings)
  K.box(g, S, 0, fy + gh, 0, W1, top - fy - gh, deep, wallC, { skip: '' });
  K.box(g, S, 0, fy + gh - 0.1, 0, W1 + 0.3, 0.25, deep + 0.3, brick ? C.trav2 : shadeHex(wallC, 0.85));
  K.hip(g, S, 0, top, 0, W1 + 0.8, deep + 0.8, Math.min(W1, deep) * 0.15, rpick([C.tile, C.tile2]));
  windowRows(gl, g, S, 'f', W1, D2, fy + gh, n, fh, { shutters: true, skip: 0.08 });
  windowRows(gl, g, S, 'k', W1, D2, fy + gh, n, fh, { skip: 0.3 });
  windowRows(gl, g, S, 'l', deep, W1 / 2, fy + gh, n, fh, { skip: 0.4 });
  windowRows(gl, g, S, 'r', deep, W1 / 2, fy + gh, n, fh, { skip: 0.4 });
  // balconies and laundry
  if (chance(0.6)) {
    const bw = W1 * rnd(0.5, 0.9), by = fy + gh + (n > 3 && chance(0.5) ? fh : 0);
    K.box(g, S, 0, by + 0.05, -D2 - 0.7, bw, 0.18, 1.4, C.wood, { skip: '' });
    K.box(g, S, 0, by + 0.23, -D2 - 1.38, bw, 0.9, 0.08, C.woodD);
    for (let i = 0; i <= 3; i++) K.box(g, S, -bw / 2 + i * bw / 3, by - 0.7, -D2 - 0.7, 0.14, 0.75, 1.3, C.woodD);
    for (let i = 0; i < Math.floor(bw / 1.3); i++) if (chance(0.5)) K.panel(ds, S, -bw / 2 + 0.6 + i * 1.3, by + 1.3, -D2 - 1.32, 0.9, rnd(0.8, 1.4), rpick([0xe8e0d0, 0xb85a3a, 0x8a9ab0, 0xd8c070, 0x6a8a5a]), -1);
    for (let i = 0; i < 3; i++) if (chance(0.6)) { K.cyl(p, S, -bw / 2 + 0.5 + i * bw / 3, by + 0.23, -D2 - 1.1, 0.2, 0.15, 0.3, 6, C.tile); blob(p, S, -bw / 2 + 0.5 + i * bw / 3, by + 0.6, -D2 - 1.1, 0.3, 0.25, 0x5a7a3a, 5, 1); }
  }
  // ground floor: the back part is solid, the front rooms are open shops
  // the solid back block sits behind the shop rooms: from v = -D2 + RD to D2
  K.box(g, S, 0, base, RD / 2, W1, fy + gh - base, deep - RD, wallC, { solid: true });
  K.box(g, S, 0, base, -D2 + RD / 2, W1, fy - base, RD, 0x7a6a58, { solid: true, top: 0x9a8a72 }); // floor of the shops
  K.box(g, S, 0, fy + gh - 0.35, -D2 + RD / 2, W1, 0.35, RD, C.woodD, { skip: 't' }); // shop ceilings
  let su = u;
  const piers = [];
  for (const [type, w] of lots) {
    const a = lu(su), b = lu(su + w), u0 = Math.min(a, b), u1 = Math.max(a, b), mu = (u0 + u1) / 2;
    piers.push(u0, u1);
    shopRoom(S, type, u0, u1, -D2, RD, fy, gh, wallC, band, brick);
    su += w;
  }
  // piers and partition walls between shops
  const ps = [...new Set(piers.map((x) => Math.round(x * 100) / 100))];
  for (const x of ps) {
    K.box(g, S, x, fy, -D2 + RD / 2, 0.5, gh, RD, wallC, { solid: true });
    if (!brick) K.box(g, S, x, fy, -D2 - 0.02, 0.54, 1.3, 0.1, band);
  }
  mapRect(S, 0, 0, W1, deep, brick ? '#b88a6a' : '#c8a882');
}

// the interior of one shop room between local u0 and u1, its open front at v0, depth rd
function shopRoom(S, type, u0, u1, v0, rd, fy, gh, wallC, band, brick) {
  const g = gbF('city', S), gl = gbF('glow', S), p = gbF('prop', S), ds = gbF('ds', S);
  const w = u1 - u0, mu = (u0 + u1) / 2, vb = v0 + rd; // back wall line
  const inner = shadeHex(rpick([0xd9c49a, 0xe2d2b0, 0xd8b88a, 0xc8a87a]), 0.95);
  // back wall face (painted), lintel over the opening
  K.panel(g, S, mu, fy, vb - 0.02, w - 0.5, gh - 0.35, inner, -1);
  K.panel(g, S, mu, fy, vb - 0.03, w - 0.5, 1.0, band, -1);
  K.box(g, S, mu, fy + gh - 0.9, v0 - 0.1, w, 0.9, 0.3, brick ? wallC : shadeHex(wallC, 0.95));
  K.box(g, S, mu, fy + gh - 1.05, v0 - 0.12, w, 0.18, 0.34, C.wood);
  const spot = (role, du, dv, yaw = 0, o = {}) => W.spots.push(Object.assign({ kind: 'shop', x: S.wx(mu + du, v0 + dv), z: S.wz(mu + du, v0 + dv), y: S.y + fy, yaw: S.yaw + Math.PI + yaw, role, h: [6, 20] }, o));
  const lamp = (du, dv) => { K.box(gl, S, mu + du, fy + gh - 1.0, v0 + dv, 0.18, 0.12, 0.3, 0xffc070); };
  const counter = (col = C.plaster, l = w * 0.55) => { K.box(g, S, mu - w * 0.18, fy, v0 + 0.6, l, 1.0, 0.75, col, { solid: true, top: C.marble }); };
  switch (type) {
    case 'stairs':
      K.box(g, S, mu, fy, v0 + rd / 2, w, gh - 0.35, rd, wallC, { solid: true });
      K.panel(gl, S, mu, fy, v0 - 0.04, 1.3, 2.5, 0x14100c, -1);
      return;
    case 'thermopolium': { // L-shaped counter with jars sunk into it, marble veneer, a painted lararium
      K.box(g, S, mu - w * 0.15, fy, v0 + 0.55, w * 0.65, 1.0, 0.8, 0xc6b48e, { solid: true, top: C.marble });
      K.box(g, S, mu - w * 0.15 - w * 0.325 + 0.4, fy, v0 + 1.6, 0.8, 1.0, 1.6, 0xc6b48e, { solid: true, top: C.marble });
      for (let i = 0; i < 3; i++) K.cyl(gl, S, mu - w * 0.38 + i * w * 0.2, fy + 1.0, v0 + 0.55, 0.22, 0.22, 0.02, 8, 0x3a2416);
      for (let i = 0; i < 5; i++) K.box(p, S, mu - w * 0.3 + i * 0.35, fy + 1.0, v0 + 0.5, 0.12, 0.08, 0.12, rpick([0xc0a070, 0x8a6a4a]));
      for (let i = 0; i < 6; i++) K.cyl(p, S, mu - w * 0.35 + i * 0.5, fy + 1.9, vb - 0.3, 0.12, 0.1, 0.3, 6, rpick([C.tile, 0xc0a070, 0x7a5a3a]));
      K.box(p, S, mu, fy + 1.8, vb - 0.3, w - 0.6, 0.06, 0.4, C.wood);
      K.panel(g, S, mu + w * 0.25, fy + 1.4, vb - 0.04, 1.4, 1.3, 0x9c2a22, -1);
      K.panel(g, S, mu + w * 0.25, fy + 1.55, vb - 0.05, 0.4, 0.8, 0xe0c060, -1);
      spot('cook', w * 0.1, 1.6, Math.PI * 0); lamp(0, 1.5);
      if (chance(0.7)) { W.spots.push({ kind: 'stand', x: S.wx(mu - w * 0.1, v0 - 0.6), z: S.wz(mu - w * 0.1, v0 - 0.6), yaw: S.yaw, role: 'customer', h: [10, 21] }); }
      W.placards.length < 999 && !W._thermo && (W._thermo = placard('thermopolium', S.wx(mu, v0 - 1.4), S.wz(mu, v0 - 1.4)));
      break;
    }
    case 'bakery': { // pistrinum: lava-stone mills turned by a donkey, the domed oven, loaves on the counter
      for (const k of [-1, 1]) {
        const M = S.sub(mu + k * w * 0.22, v0 + 2.4, 0, S.y + fy);
        K.cyl(g, M, 0, 0, 0, 0.75, 0.75, 0.5, 10, 0x5a5652, { solid: true });
        K.cyl(g, M, 0, 0.5, 0, 0.55, 0.15, 0.8, 10, 0x5a5652);
        K.cyl(g, M, 0, 1.0, 0, 0.2, 0.55, 0.6, 10, 0x4a4642); K.cyl(g, M, 0, 1.6, 0, 0.55, 0.2, 0.5, 10, 0x4a4642);
        K.box(g, M, 0, 1.2, 0, 2.4, 0.12, 0.12, C.wood);
      }
      W.spots.push({ kind: 'mill', x: S.wx(mu + w * 0.22, v0 + 2.4), z: S.wz(mu + w * 0.22, v0 + 2.4), y: S.y + fy, yaw: 0, role: 'donkey', r: 1.35 });
      const O = S.sub(mu, vb - 0.4, 0, S.y + fy);
      K.box(g, O, 0, 0, -0.6, w * 0.6, 1.0, 1.6, C.brick, { solid: true });
      K.dome(g, O.sub(0, -0.6, 0, O.y + 1.0), 0, 0, 0, 1.0, 10, 3, C.brick);
      K.panel(gl, O, 0, 1.05, -1.42, 0.7, 0.5, 0xff7a30, -1);
      K.box(g, S, mu - w * 0.2, fy, v0 + 0.5, w * 0.5, 0.95, 0.6, C.plaster, { solid: true });
      for (let i = 0; i < 7; i++) K.cyl(p, S, mu - w * 0.4 + i * 0.32, fy + 0.95, v0 + 0.5, 0.15, 0.13, 0.08, 7, 0xb8803a);
      spot('baker', -w * 0.2, 1.3); lamp(0, 2);
      if (!W._bakery) W._bakery = placard('bakery', S.wx(mu, v0 - 1.4), S.wz(mu, v0 - 1.4));
      break;
    }
    case 'fullonica': { // fullers: treading vats, cloth drying on poles, a jar for urine at the door
      for (let i = 0; i < 3; i++) { const V = S.sub(mu - w * 0.3 + i * w * 0.3, v0 + 2.2, 0, S.y + fy); K.ring(g, V, 0, 0, 0, 0.5, 0.65, 0.85, 10, C.plaster, { solid: true }); K.cyl(g, V, 0, 0, 0, 0.5, 0.5, 0.6, 10, 0x8aa0a8); }
      W.spots.push({ kind: 'tread', x: S.wx(mu, v0 + 2.2), z: S.wz(mu, v0 + 2.2), y: S.y + fy + 0.3, yaw: S.yaw, role: 'fuller', h: [6, 18] });
      for (let i = 0; i < 2; i++) { K.box(p, S, mu - w * 0.3 + i * w * 0.6, fy, vb - 0.6, 0.1, 2.6, 0.1, C.wood); }
      K.box(p, S, mu, fy + 2.5, vb - 0.6, w * 0.6, 0.06, 0.06, C.wood);
      for (let i = 0; i < 4; i++) K.panel(ds, S, mu - w * 0.25 + i * w * 0.17, fy + 1.0, vb - 0.6, w * 0.15, 1.5, rpick([0xf0e8d8, 0xe8d8c0, 0xc8a0a0, 0xa0b0c8]), -1);
      K.cyl(p, S, mu + w / 2 - 0.7, fy, v0 - 0.4, 0.3, 0.22, 0.75, 8, 0xb8724a, { solid: true });
      spot('fuller', -w * 0.3, 3.2);
      if (!W._fuller) W._fuller = placard('fullonica', S.wx(mu, v0 - 1.4), S.wz(mu, v0 - 1.4));
      break;
    }
    case 'butcher':
      counter(0xc6b48e);
      K.box(g, S, mu + w * 0.2, fy, v0 + 2.6, 0.8, 0.85, 0.8, C.woodD, { solid: true });
      K.box(p, S, mu, fy + 2.9, v0 + 1.6, w - 0.8, 0.06, 0.06, 0x3a3a3a);
      for (let i = 0; i < 5; i++) K.box(p, S, mu - w * 0.35 + i * w * 0.17, fy + 2.1, v0 + 1.6, 0.35, 0.7, 0.25, i % 2 ? 0x9a3a32 : 0xb85a4a);
      spot('butcher', w * 0.1, 1.5); break;
    case 'wine': {
      counter(0xb8a07a);
      for (let i = 0; i < Math.floor(w / 0.55); i++) for (let r = 0; r < 2; r++) K.cyl(p, S, u0 + 0.4 + i * 0.55, fy + 0.6 + r * 1.0, vb - 0.4, 0.22, 0.16, 0.9, 6, 0xb8724a);
      K.box(p, S, mu, fy + 1.5, vb - 0.4, w - 0.6, 0.08, 0.6, C.wood);
      spot('wineseller', w * 0.15, 1.6); lamp(0, 1.4);
      if (!W._wine) { W._wine = 1; decal(S, mu, fy + 2.4, v0 - 0.27, Math.min(4, w - 0.6), 0.75, ['EDONE · DICIT · ASSIBVS · HIC · BIBITVR', 'DIPVNDIVM · SI · DEDERIS · MELIORA · BIBES', 'QVATTVS · SI · DEDERIS · VINA · FALERNA · BIBES'], { pw: 768, ph: 140, bg: '#e0d0b0', ink: '#8a2018', size: 0.58, font: '"EB Garamond", Georgia, serif' }); placard('wineshop', S.wx(mu, v0 - 1.4), S.wz(mu, v0 - 1.4)); }
      if (chance(0.6)) W.spots.push({ kind: 'stand', x: S.wx(mu + w * 0.2, v0 - 0.5), z: S.wz(mu + w * 0.2, v0 - 0.5), yaw: S.yaw, role: 'drinker', h: [11, 23] });
      break;
    }
    case 'books': // booksellers of the Argiletum: pigeonholes of scrolls, titles posted on the door posts
      for (let i = 0; i < Math.floor(w / 0.55); i++) for (let r = 0; r < 4; r++) { K.box(p, S, u0 + 0.45 + i * 0.55, fy + 0.4 + r * 0.6, vb - 0.3, 0.5, 0.04, 0.45, C.woodD); K.cyl(p, S, u0 + 0.45 + i * 0.55, fy + 0.6 + r * 0.6, vb - 0.3, 0.08, 0.08, 0.04, 6, 0xe8dcbc); }
      counter(C.wood, w * 0.4);
      decal(S, u0 + 0.3, fy + 1.2, v0 - 0.28, 0.42, 1.4, ['MARTIAL', 'EPIGR', 'LIB · I', '—', 'VERGIL', 'AENEIS', '—', 'OVID'], { pw: 64, ph: 220, bg: '#efe4c9', ink: '#3a2a1a', size: 0.7, weight: 600 });
      spot('bookseller', 0, 1.6);
      if (!W._books) W._books = placard('books', S.wx(mu, v0 - 1.4), S.wz(mu, v0 - 1.4));
      break;
    case 'cobbler':
      K.box(g, S, mu, fy, v0 + 2.2, 1.6, 0.5, 0.6, C.wood, { solid: true });
      for (let i = 0; i < 6; i++) K.box(p, S, u0 + 0.6 + i * 0.5, fy + 1.4, vb - 0.3, 0.18, 0.12, 0.35, 0x6a4a2a);
      K.box(p, S, mu, fy + 1.35, vb - 0.3, w - 0.6, 0.05, 0.45, C.wood);
      W.spots.push({ kind: 'sit', x: S.wx(mu, v0 + 2.6), z: S.wz(mu, v0 + 2.6), y: S.y + fy + 0.5, yaw: S.yaw + Math.PI, role: 'cobbler', h: [6, 18] });
      break;
    case 'barber': // the tonstrina: a stool for the customer, a polished bronze mirror, gossip
      K.box(g, S, mu, fy, v0 + 2, 0.6, 0.55, 0.6, C.wood, { solid: true });
      K.panel(g, S, mu, fy + 1.3, vb - 0.04, 0.6, 0.8, 0xc8a050, -1);
      for (let i = 0; i < 2; i++) K.box(g, S, u0 + 0.8, fy, v0 + 1.4 + i * 1.6, 0.5, 0.45, 1.2, C.wood);
      W.spots.push({ kind: 'sit', x: S.wx(mu, v0 + 2), z: S.wz(mu, v0 + 2), y: S.y + fy + 0.55, yaw: S.yaw, role: 'shaved', h: [7, 16] });
      spot('barber', 0.2, 1.1, Math.PI); break;
    case 'lamps':
      counter(C.plaster);
      for (let i = 0; i < Math.floor(w / 0.35); i++) for (let r = 0; r < 3; r++) K.box(p, S, u0 + 0.3 + i * 0.35, fy + 0.9 + r * 0.55, vb - 0.25, 0.22, 0.08, 0.14, 0xb07a4a);
      for (let r = 0; r < 3; r++) K.box(p, S, mu, fy + 0.85 + r * 0.55, vb - 0.25, w - 0.5, 0.04, 0.35, C.wood);
      spot('lampmaker', w * 0.15, 1.5); lamp(-0.5, 1.5); lamp(0.5, 2.5); break;
    case 'grocer':
      for (let i = 0; i < Math.floor(w / 0.8); i++) { K.cyl(p, S, u0 + 0.5 + i * 0.8, fy, v0 + 0.4, 0.32, 0.26, 0.45, 7, 0x8a6a3a, { solid: true }); K.cyl(p, S, u0 + 0.5 + i * 0.8, fy + 0.45, v0 + 0.4, 0.28, 0.2, 0.12, 7, rpick([0x6a8a3a, 0xd28a32, 0xa83a2a, 0x8a6a2a, 0x5a7a3a, 0xc8b060])); }
      spot('grocer', 0, 1.6); break;
    case 'fish':
      counter(C.marble);
      for (let i = 0; i < 6; i++) K.box(p, S, mu - w * 0.35 + i * 0.4, fy + 1.0, v0 + 0.6, 0.3, 0.06, 0.12, 0xa0aab0);
      spot('fishmonger', 0, 1.5); break;
    case 'smith':
      K.box(g, S, mu + w * 0.25, fy, vb - 0.9, 1.4, 1.0, 1.2, C.brick, { solid: true });
      K.box(gl, S, mu + w * 0.25, fy + 1.0, vb - 0.9, 0.9, 0.1, 0.7, 0xff6a20);
      K.box(g, S, mu - w * 0.1, fy, v0 + 2, 0.4, 0.8, 0.4, C.woodD, { solid: true }); K.box(g, S, mu - w * 0.1, fy + 0.8, v0 + 2, 0.7, 0.2, 0.3, C.iron);
      W.spots.push({ kind: 'hammer', x: S.wx(mu - w * 0.1, v0 + 2.7), z: S.wz(mu - w * 0.1, v0 + 2.7), y: S.y + fy, yaw: S.yaw + Math.PI, role: 'smith', h: [6, 18] }); break;
    case 'textile': case 'perfume': case 'potter':
      counter(C.plaster);
      if (type === 'textile') for (let i = 0; i < Math.floor(w / 0.5); i++) K.box(p, S, u0 + 0.35 + i * 0.5, fy + 0.3, vb - 0.4, 0.42, 2.2, 0.5, rpick([0xa83a2a, 0x3d5a80, 0xd8c070, 0x6a2a56, 0xe8dcc4, 0x55703a]));
      else if (type === 'potter') for (let i = 0; i < 12; i++) K.cyl(p, S, u0 + 0.4 + (i % 6) * (w - 0.8) / 6, fy + (i < 6 ? 0 : 1.2), vb - 0.5, 0.2, 0.15, 0.5, 6, rpick([C.tile, 0xc08a5a, 0x9a6a4a]));
      else for (let i = 0; i < 10; i++) K.cyl(p, S, u0 + 0.4 + i * 0.4, fy + 1.0, v0 + 0.6, 0.06, 0.06, 0.18, 6, rpick([0xd0e0e8, 0xe0c0d0, 0xc0d0b0]));
      spot(type === 'textile' ? 'weaver' : type === 'perfume' ? 'perfumer' : 'potter', w * 0.15, 1.6); break;
    case 'latrine': { // public latrine: marble benches with holes, a water channel for the sponge-sticks
      for (const [a, b, ww, dd] of [[mu, vb - 0.4, w - 1, 0.8], [u0 + 0.6, v0 + rd / 2 + 0.6, 0.8, rd - 2], [u1 - 0.6, v0 + rd / 2 + 0.6, 0.8, rd - 2]]) K.box(g, S, a, fy, b, ww, 0.45, dd, C.marble, { solid: true });
      for (let i = 0; i < Math.floor((w - 1.4) / 0.6); i++) K.box(gl, S, u0 + 0.9 + i * 0.6, fy + 0.46, vb - 0.4, 0.22, 0.01, 0.3, 0x14100c);
      K.box(g, S, mu, fy, vb - 1.0, w - 1.2, 0.08, 0.25, C.water);
      for (let i = 0; i < 2; i++) W.spots.push({ kind: 'sit', x: S.wx(u0 + 1.5 + i * 2.2, vb - 0.55), z: S.wz(u0 + 1.5 + i * 2.2, vb - 0.55), y: S.y + fy + 0.45, yaw: S.yaw + Math.PI, role: 'latrine', h: [6, 20] });
      K.panel(g, S, mu, fy + 2.6, v0 - 0.27, 2.6, 0.5, 0xe0d0b0, -1);
      decal(S, mu, fy + 2.6, v0 - 0.28, 2.4, 0.45, ['FORICAE'], { pw: 256, ph: 48, bg: '#e0d0b0', ink: '#5a2a18', size: 0.8 });
      placard('latrine', S.wx(mu, v0 - 1.3), S.wz(mu, v0 - 1.3));
      return;
    }
    case 'school': { // a schoolmaster teaching in an open room under an awning; boys with wax tablets
      K.tbox(ds, S, mu, fy + gh - 1.1, v0 - 1.4, w, 2.8, w, 0.2, 0.3, 0xd8c8a0, { ov: 1.2 });
      for (let r = 0; r < 2; r++) K.box(g, S, mu, fy, v0 + 1.6 + r * 1.2, w * 0.7, 0.42, 0.35, C.wood);
      K.box(g, S, mu, fy, vb - 0.8, 0.9, 0.55, 0.7, C.wood);
      W.spots.push({ kind: 'teach', x: S.wx(mu, vb - 0.8), z: S.wz(mu, vb - 0.8), y: S.y + fy + 0.55, yaw: S.yaw + Math.PI, role: 'teacher', h: [6.5, 12.5] });
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) W.spots.push({ kind: 'sit', x: S.wx(mu - w * 0.3 + i * w * 0.2, v0 + 1.6 + r * 1.2), z: S.wz(mu - w * 0.3 + i * w * 0.2, v0 + 1.6 + r * 1.2), y: S.y + fy + 0.42, yaw: S.yaw, role: 'pupil', h: [6.5, 12.5] });
      placard('school', S.wx(mu, v0 - 1.4), S.wz(mu, v0 - 1.4));
      break;
    }
    case 'balneum': { // a small private bath-house: a door, its sign, smoke from the furnace
      K.box(g, S, mu, fy, v0 + rd / 2, w, gh - 0.35, rd, wallC, { solid: true });
      K.panel(gl, S, mu, fy, v0 - 0.04, 1.8, 2.8, 0x2a1d14, -1);
      decal(S, mu, fy + 3.0, v0 - 0.06, 4.4, 0.6, ['BALNEVM · LAVATIO · CALDA'], { pw: 512, ph: 64, bg: '#e8dcc0', ink: '#7a1a14', size: 0.8 });
      K.cyl(g, S, u1 - 1, fy + gh, vb + 2, 0.4, 0.3, 4, 6, C.brick);
      W.spots.push({ kind: 'stand', x: S.wx(mu + 1.6, v0 - 0.6), z: S.wz(mu + 1.6, v0 - 0.6), yaw: S.yaw + Math.PI, role: 'bathattendant', h: [10, 18] });
      return;
    }
    case 'vigiles': { // a station of the night watch: buckets, ladders, axes, the pump
      K.box(g, S, mu, fy, v0 + rd / 2, w, gh - 0.35, rd, wallC, { solid: true });
      K.panel(gl, S, mu, fy, v0 - 0.04, 3.0, 3.2, 0x2a1d14, -1);
      decal(S, mu, fy + 3.3, v0 - 0.06, 4.6, 0.55, ['EXCVBITORIVM · COH · II · VIGILVM'], { pw: 512, ph: 56, bg: '#e8dcc0', ink: '#3a2a1a', size: 0.75 });
      for (let i = 0; i < 6; i++) K.cyl(p, S, u0 + 1 + i * 0.5, fy, v0 - 0.4, 0.17, 0.14, 0.35, 6, 0x6a5a3a);
      K.box(p, S, u1 - 1.4, fy, v0 - 0.3, 0.5, 4.2, 0.12, C.wood, { ra: 0.0 });
      K.box(p, S, u0 + 4.2, fy, v0 - 0.8, 1.2, 0.9, 0.6, C.bronze, { solid: true });
      W.spots.push({ kind: 'stand', x: S.wx(mu - 2, v0 - 0.8), z: S.wz(mu - 2, v0 - 0.8), yaw: S.yaw + Math.PI, role: 'vigil', h: [0, 24] });
      placard('vigiles', S.wx(mu + 2, v0 - 1.3), S.wz(mu + 2, v0 - 1.3));
      return;
    }
  }
  // graffiti and painted notices on some piers
  if (chance(0.25)) {
    const txt = rpick([['C · IVLIVM · POLYBIVM', 'AED · O · V · F'], ['ADMIROR · O · PARIES · TE · NON', 'CECIDISSE · RVINIS'], ['VENIMVS · HVC · CVPIDI', 'MVLTO · MAGIS · DISCEDERE · CVPIDI'], ['M · CERRINIVM · VATIAM', 'AED · VICINI · ROGANT'], ['SALVE · LVCRVM'], ['CELADVS · SVSPIRIVM · PVELLARVM']]);
    decal(S, mu, fy + gh + 0.15, v0 - 0.04, Math.min(w - 0.4, 3.4), 0.55, txt, { pw: 512, ph: 80, bg: brick ? '#b08060' : '#' + (wallC >>> 0).toString(16).padStart(6, '0'), ink: '#8a1a14', size: 0.62, font: '"EB Garamond", Georgia, serif', weight: 500 });
  }
}

// the town house on the Subura street: you can walk in through the fauces into the atrium and on to the garden
function heroDomus(S, w, d, fy, base) {
  const g = gbF('city', S), gl = gbF('glow', S), p = gbF('prop', S);
  const h = 7, red = C.pomp, och = 0xc8963a, black = 0x2a2420;
  const D2 = d / 2, fa = 6;               // fauces (entrance passage) depth
  const aD = 12, aW = w - 4;               // atrium
  const a0 = -D2 + fa, a1 = a0 + aD;       // atrium v range
  const t1 = a1 + 4;                        // tablinum / back rooms
  // outer shell (thick walls), front wall with the door, interior partitions
  K.box(g, S, 0, base, -D2 + fa / 2, w, fy - base, fa, 0x8a7a68, { solid: true, top: 0xb8a888 });
  K.box(g, S, 0, base, (a0 + D2) / 2, w, fy - base + 0.02, D2 - a0, 0x8a7a68, { solid: true, top: 0xb8a888 });
  const wallC = rpick([0xd9c49a, 0xe2d2b0]);
  for (const [u0, v0, u1, v1, hh] of [
    [-w / 2, -D2, -1.2, -D2, h], [1.2, -D2, w / 2, -D2, h], [-w / 2, -D2, -w / 2, D2, h], [w / 2, -D2, w / 2, D2, h], [-w / 2, D2, w / 2, D2, h],
    [-1.6, -D2, -1.6, a0, h], [1.6, -D2, 1.6, a0, h],                     // fauces walls
    [-w / 2, a0, -1.6, a0, h], [1.6, a0, w / 2, a0, h],                   // front rooms behind the street wall
    [-w / 2, a1, -3, a1, h], [3, a1, w / 2, a1, h],                       // tablinum opening
    [-w / 2, t1, -1.2, t1, h], [1.2, t1, w / 2, t1, h],                   // to the peristyle
  ]) wall(g, S, u0, v0, u1, v1, fy, hh, 0.45, wallC, { ext: 0.45 });
  // shops in the street front either side of the door, opening outward
  for (const s of [-1, 1]) { K.panel(gl, S, s * (w / 4 + 0.8), fy, -D2 - 0.25, 3, 2.9, 0x2a1a10, -1); K.box(g, S, s * (w / 4 + 0.8), fy + 2.9, -D2 - 0.3, 3.4, 0.3, 0.2, C.wood); }
  K.box(g, S, 0, fy + 3.6, -D2 - 0.3, 3.2, 0.4, 0.4, C.trav);
  for (const s of [-1, 1]) K.box(g, S, s * 1.35, fy, -D2 - 0.3, 0.45, 3.6, 0.3, C.trav);
  // the fauces floor: "CAVE CANEM"
  decal(S, 0, fy + 0.03, -D2 + 1.6, 2.6, 1.6, ['CAVE · CANEM'], { floor: true, pw: 256, ph: 160, bg: '#e8e0d0', ink: '#1a1612', size: 0.5 });
  // painted walls inside: red panels over a black dado, ochre in the tablinum
  const paint = (u0, v0, u1, v1, col) => { const L = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(v1 - v0, u1 - u0); K.box(g, S, (u0 + u1) / 2, fy, (v0 + v1) / 2, L, 1.1, 0.06, black, { ra: a }); K.box(g, S, (u0 + u1) / 2, fy + 1.1, (v0 + v1) / 2, L, 3.4, 0.06, col, { ra: a }); };
  paint(-w / 2 + 0.3, a0 + 0.5, -w / 2 + 0.3, a1 - 0.5, red); paint(w / 2 - 0.3, a0 + 0.5, w / 2 - 0.3, a1 - 0.5, red);
  paint(-w / 2 + 0.3, a1 + 0.5, -w / 2 + 0.3, t1 - 0.5, och); paint(w / 2 - 0.3, a1 + 0.5, w / 2 - 0.3, t1 - 0.5, och);
  // floors: mosaic black and white in the atrium
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) K.box(g, S, -aW / 2 + (i + 0.5) * aW / 8, fy, a0 + (j + 0.5) * aD / 6, aW / 8, 0.05, aD / 6, (i + j) % 2 ? 0xe8e0d0 : 0x2a2622);
  // the impluvium under the opening of the roof
  { const iv = (a0 + a1) / 2; // the sunken pool: a marble kerb round the water
    for (const [u, v, w2, d2] of [[0, iv - 1.3, 3.6, 0.2], [0, iv + 1.3, 3.6, 0.2], [-1.7, iv, 0.2, 2.8], [1.7, iv, 0.2, 2.8]]) K.box(g, S, u, fy, v, w2, 0.22, d2, C.marble);
    K.box(g, S, 0, fy + 0.02, iv, 3.2, 0.06, 2.4, C.water); }
  // roof over the atrium sloping inward, the compluvium open to the sky
  for (const s of [-1, 1]) {
    K.tbox(g, S, s * (aW / 4 + 1.3), fy + h, (a0 + a1) / 2, aW / 2 - 1.4, aD + 1, aW / 2 - 1.4, aD + 1, 0.6, C.tile);
    K.box(g, S, s * (aW / 4 + 1.3), fy + h - 0.3, (a0 + a1) / 2, aW / 2 - 1.6, 0.3, aD, C.woodD, { skip: 't' });
  }
  for (const s of [-1, 1]) { K.box(g, S, 0, fy + h, (a0 + a1) / 2 + s * (aD / 4 + 0.9), 3.8, 0.6, aD / 2 - 1.2, C.tile); K.box(g, S, 0, fy + h - 0.3, (a0 + a1) / 2 + s * (aD / 4 + 0.9), 3.6, 0.3, aD / 2 - 1.4, C.woodD, { skip: 't' }); }
  K.hip(g, S, 0, fy + h, -D2 + fa / 2, w + 0.6, fa + 0.6, 1.2, C.tile);
  K.hip(g, S, 0, fy + h, (a1 + t1) / 2, w + 0.6, t1 - a1 + 0.6, 1.0, C.tile);
  K.box(g, S, 0, fy + h - 0.2, (a1 + t1) / 2, w - 1, 0.2, t1 - a1 - 0.6, C.woodD, { skip: 't' });
  K.box(g, S, 0, fy + h - 0.2, -D2 + fa / 2, w - 1, 0.2, fa - 0.6, C.woodD, { skip: 't' });
  // the lararium, the household shrine, and the strongbox
  const Lr = S.sub(-aW / 2 + 0.6, a0 + 2, Math.PI / 2, S.y + fy);
  K.box(g, Lr, 0, 0, 0, 1.4, 1.2, 0.6, C.plaster, { solid: true }); K.box(g, Lr, 0, 1.2, 0.1, 1.2, 1.2, 0.4, red); K.gable(g, Lr, 0, 2.4, 0.1, 1.5, 0.6, 0.4, C.tile, { side: C.plaster });
  K.box(g, S, aW / 2 - 0.8, fy, a0 + 2, 1.0, 0.8, 0.7, C.bronze, { solid: true });
  // the peristyle garden at the back
  const pv0 = t1, pv1 = D2;
  K.box(g, S, 0, fy, (pv0 + pv1) / 2, w - 4, 0.15, pv1 - pv0 - 3, 0x6f8a45);
  const pc = 4;
  for (let i = 0; i < pc; i++) for (const s of [-1, 1]) K.column(g, S, s * (w / 2 - 2.2), fy, pv0 + 1.6 + i * ((pv1 - pv0 - 3.2) / (pc - 1)), 4.2, 0.2, 'd', 0xd8c49a, { seg: 6 });
  for (const s of [-1, 1]) K.tbox(g, S, s * (w / 2 - 1.2), fy + 4.2, (pv0 + pv1) / 2, 2.6, pv1 - pv0, 0.1, pv1 - pv0, 0.8, C.tile2, { ou: -s * 1.2 });
  fountain(S, 0, (pv0 + pv1) / 2, { round: true, r: 1.2 });
  treeAt(S.wx(-3, pv1 - 2.5), S.wz(-3, pv1 - 2.5), 'laurel', 0.7, S.y + fy); treeAt(S.wx(3.2, pv1 - 2.2), S.wz(3.2, pv1 - 2.2), 'fig', 0.7, S.y + fy);
  for (let i = 0; i < 6; i++) treeAt(S.wx(-w / 2 + 3 + i * (w - 6) / 5, pv0 + 2.4), S.wz(-w / 2 + 3 + i * (w - 6) / 5, pv0 + 2.4), 'rose', 0.8, S.y + fy);
  // the household: the master receives clients in the morning; they wait outside
  W.spots.push({ kind: 'stand', x: S.wx(0, a1 + 1.6), z: S.wz(0, a1 + 1.6), y: S.y + fy, yaw: S.yaw + Math.PI, role: 'patron', h: [6, 13] });
  W.spots.push({ kind: 'stand', x: S.wx(-1.2, a0 + 1.2), z: S.wz(-1.2, a0 + 1.2), y: S.y + fy, yaw: S.yaw, role: 'doorkeeper', h: [0, 24] });
  W.spots.push({ kind: 'work', x: S.wx(2, pv0 + 3.7), z: S.wz(2, pv0 + 3.7), y: S.y + fy, yaw: 0, role: 'housemaid', h: [6, 20] }); // clear of the roses
  for (let i = 0; i < 5; i++) W.spots.push({ kind: 'queue', x: S.wx(-2 + i * 0.9, -D2 - 1.5 - (i % 2) * 0.6), z: S.wz(-2 + i * 0.9, -D2 - 1.5 - (i % 2) * 0.6), yaw: S.yaw, role: 'client', h: [6, 9.5] });
  addPath([fw(S, 0, -D2 - 2.5), fw(S, 0, -D2 + 2), fw(S, 0, a0 + 2), fw(S, -2.5, (a0 + a1) / 2), fw(S, 0, a1 + 1), fw(S, 0, t1 + 2)], { hw: 0.7, kind: 'house', zone: 'subura', dens: 0.15 });
  place('domus', 'A town house', 'Domus', S.wx(0, (a0 + a1) / 2), S.wz(0, (a0 + a1) / 2), 9, 'scene', { area: 'The Subura' });
  placard('domus', S.wx(1.6, a0 + 1.8), S.wz(1.6, a0 + 1.8));
  mapRect(S, 0, 0, w, d, '#c9a98a');
}
