// Roma Aeterna — geometry: a growable flat-shaded triangle batch (GB), and the architectural kit built on it.
// Everything static is written straight into world-space batches, one per layer and map cell, so the city costs a
// few dozen draw calls. Kit calls take a Frame and local (u, y, v) coordinates; `o.solid` registers a collision box.

class GB {
  constructor(cap = 6144) {
    this.pos = new Float32Array(cap * 3); this.nor = new Int8Array(cap * 3); this.col = new Uint8Array(cap * 3);
    this.n = 0; this.cap = cap; this.jit = 0.06; this.k = 0;
  }
  grow(need) {
    let c = this.cap; while (c < need) c *= 2;
    const p = new Float32Array(c * 3); p.set(this.pos); this.pos = p;
    const n = new Int8Array(c * 3); n.set(this.nor); this.nor = n;
    const k = new Uint8Array(c * 3); k.set(this.col); this.col = k;
    this.cap = c;
  }
  // one triangle; colour hex; normal from winding (counter-clockwise seen from outside)
  tri(ax, ay, az, bx, by, bz, cx, cy, cz, hex, shade = 1) {
    if (this.n + 3 > this.cap) this.grow(this.n + 3);
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-9) return;
    nx = Math.round(nx / l * 127); ny = Math.round(ny / l * 127); nz = Math.round(nz / l * 127);
    const j = this.jit ? 1 + (hash2(this.k++, this.n, 77) - 0.5) * 2 * this.jit : 1;
    const f = 255 * shade * j;
    const r = Math.min(255, ((hex >> 16) & 255) / 255 * f), g = Math.min(255, ((hex >> 8) & 255) / 255 * f), b = Math.min(255, (hex & 255) / 255 * f);
    const P = this.pos, N = this.nor, C = this.col; let o = this.n * 3;
    P[o] = ax; P[o + 1] = ay; P[o + 2] = az; P[o + 3] = bx; P[o + 4] = by; P[o + 5] = bz; P[o + 6] = cx; P[o + 7] = cy; P[o + 8] = cz;
    for (let i = 0; i < 9; i += 3) { N[o + i] = nx; N[o + i + 1] = ny; N[o + i + 2] = nz; C[o + i] = r; C[o + i + 1] = g; C[o + i + 2] = b; }
    this.n += 3;
  }
  // quad a-b-c-d; if ref is given, the face is turned to point away from it (sgn 1) or toward it (sgn -1)
  quad(a, b, c, d, hex, ref, sgn = 1, shade = 1) {
    if (ref) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const mx = (a[0] + c[0]) / 2 - ref[0], my = (a[1] + c[1]) / 2 - ref[1], mz = (a[2] + c[2]) / 2 - ref[2];
      if ((nx * mx + ny * my + nz * mz) * sgn < 0) { const t = b; b = d; d = t; }
    }
    this.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], hex, shade);
    this.tri(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], hex, shade);
  }
  triR(a, b, c, hex, ref, sgn = 1) {
    if (ref) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const mx = (a[0] + b[0] + c[0]) / 3 - ref[0], my = (a[1] + b[1] + c[1]) / 3 - ref[1], mz = (a[2] + b[2] + c[2]) / 3 - ref[2];
      if ((nx * mx + ny * my + nz * mz) * sgn < 0) { const t = b; b = c; c = t; }
    }
    this.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], hex);
  }
  geometry() {
    const g = new THREE.BufferGeometry(), n = this.n;
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.slice(0, n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor.slice(0, n * 3), 3, true));
    g.setAttribute('color', new THREE.BufferAttribute(this.col.slice(0, n * 3), 3, true));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// ---------- palette ----------
const C = {
  marble: 0xe4ded0, marble2: 0xd6cdbb, marbleW: 0xece8de, trav: 0xcfc4aa, trav2: 0xc0b396, tuff: 0xb5a37f, peperino: 0x8f8a7c,
  brick: 0xa86a4c, brick2: 0x9a5e42, brickD: 0x84503a, plaster: 0xe2d2b0, plaster2: 0xd9c49a, ochre: 0xd3a560, red: 0xa5382a,
  pomp: 0x9c2a22, tile: 0xa65a3e, tile2: 0x965036, bronze: 0x8a6a3a, gilt: 0xd6aa48, wood: 0x7a5434, woodD: 0x5a3c24, dark: 0x1c1612,
  basalt: 0x5a5852, basalt2: 0x4d4b46, kerb: 0xb8ad94, earth: 0x9a8160, dust: 0xb59f78, grass: 0x6f8a45, water: 0x3f6f7a,
  cloth: 0xd9c9a8, linen: 0xe8dfc8, purple: 0x6a2a56, blue: 0x3d5a80, green: 0x55703a, iron: 0x55565a, gold: 0xd9b24a,
};
const shadeHex = (h, f) => { const r = Math.min(255, ((h >> 16) & 255) * f) | 0, g = Math.min(255, ((h >> 8) & 255) * f) | 0, b = Math.min(255, (h & 255) * f) | 0; return (r << 16) | (g << 8) | b; };
const mixHex = (a, b, t) => { const A = hex3(a), B = hex3(b); return ((lerp(A[0], B[0], t) * 255) << 16) | ((lerp(A[1], B[1], t) * 255) << 8) | (lerp(A[2], B[2], t) * 255 | 0); };

// ---------- kit ----------
// world point from frame + local, with an optional extra rotation (ra) about (cu, cv)
function _wp(F, u, y, v) { return [F.wx(u, v), F.y + y, F.wz(u, v)]; }
const K = {
  // axis-aligned (in frame) box: centre (u, v), bottom y, sizes w (u) × h × d (v). o: { ra, solid, skip:'b'|'bt', top }
  box(gb, F, u, y, v, w, h, d, hex, o) {
    const ra = (o && o.ra) || 0, ca = Math.cos(ra), sa = Math.sin(ra);
    const P = [];
    for (let k = 0; k < 8; k++) {
      const lu = (k & 1 ? 0.5 : -0.5) * w, lv = (k & 2 ? 0.5 : -0.5) * d, ly = k & 4 ? h : 0;
      const uu = u + lu * ca - lv * sa, vv = v + lu * sa + lv * ca;
      P.push([F.wx(uu, vv), F.y + y + ly, F.wz(uu, vv)]);
    }
    const ref = [F.wx(u, v), F.y + y + h / 2, F.wz(u, v)];
    const skip = (o && o.skip) || 'b';
    const top = o && o.top != null ? o.top : hex;
    gb.quad(P[4], P[5], P[7], P[6], top, ref);
    if (skip.indexOf('b') < 0) gb.quad(P[0], P[1], P[3], P[2], hex, ref);
    if (skip.indexOf('f') < 0) gb.quad(P[0], P[1], P[5], P[4], hex, ref);
    if (skip.indexOf('k') < 0) gb.quad(P[2], P[3], P[7], P[6], hex, ref);
    if (skip.indexOf('l') < 0) gb.quad(P[0], P[2], P[6], P[4], hex, ref);
    if (skip.indexOf('r') < 0) gb.quad(P[1], P[3], P[7], P[5], hex, ref);
    if (o && o.solid) solidBox(F, u, v, w, d, y, y + h, ra, o.solid === 'nowalk');
  },
  // tapered block: bottom wb×db, top wt×dt (top may be offset by ou, ov). Pyramids, wedges, hip roofs.
  tbox(gb, F, u, y, v, wb, db, wt, dt, h, hex, o) {
    const ou = (o && o.ou) || 0, ov = (o && o.ov) || 0, ra = (o && o.ra) || 0, ca = Math.cos(ra), sa = Math.sin(ra);
    wt = Math.max(wt, 0.002); dt = Math.max(dt, 0.002);
    const L = (lu, lv, ly) => { const uu = u + lu * ca - lv * sa, vv = v + lu * sa + lv * ca; return [F.wx(uu, vv), F.y + y + ly, F.wz(uu, vv)]; };
    const B = [L(-wb / 2, -db / 2, 0), L(wb / 2, -db / 2, 0), L(wb / 2, db / 2, 0), L(-wb / 2, db / 2, 0)];
    const T = [L(-wt / 2 + ou, -dt / 2 + ov, h), L(wt / 2 + ou, -dt / 2 + ov, h), L(wt / 2 + ou, dt / 2 + ov, h), L(-wt / 2 + ou, dt / 2 + ov, h)];
    const ref = L(ou / 2, ov / 2, h * 0.4);
    gb.quad(T[0], T[1], T[2], T[3], (o && o.top) || hex, ref);
    if (o && o.bottom) gb.quad(B[0], B[1], B[2], B[3], hex, ref);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; gb.quad(B[i], B[j], T[j], T[i], hex, ref); }
    if (o && o.solid) solidBox(F, u, v, wb, db, y, y + h, ra, true);
  },
  // gable roof: ridge along u (or along v with o.alongV). overhang included in w/d. eaves at y, ridge at y+h.
  gable(gb, F, u, y, v, w, d, h, hex, o) {
    const alongV = o && o.alongV;
    const L = (lu, lv, ly) => [F.wx(u + lu, v + lv), F.y + y + ly, F.wz(u + lu, v + lv)];
    const ref = L(0, 0, -1);
    const side = (o && o.side) || shadeHex(hex, 0.85);
    if (!alongV) {
      const a = L(-w / 2, -d / 2, 0), b = L(w / 2, -d / 2, 0), c = L(w / 2, 0, h), e = L(-w / 2, 0, h), f = L(-w / 2, d / 2, 0), g = L(w / 2, d / 2, 0);
      gb.quad(a, b, c, e, hex, ref); gb.quad(f, g, c, e, hex, ref);
      gb.triR(a, f, e, side, ref); gb.triR(b, g, c, side, ref);
      if (o && o.under) { gb.quad(a, b, g, f, o.under, L(0, 0, 1)); }
    } else {
      const a = L(-w / 2, -d / 2, 0), b = L(-w / 2, d / 2, 0), c = L(0, d / 2, h), e = L(0, -d / 2, h), f = L(w / 2, -d / 2, 0), g = L(w / 2, d / 2, 0);
      gb.quad(a, b, c, e, hex, ref); gb.quad(f, g, c, e, hex, ref);
      gb.triR(a, f, e, side, ref); gb.triR(b, g, c, side, ref);
      if (o && o.under) { gb.quad(a, b, g, f, o.under, L(0, 0, 1)); }
    }
  },
  // hipped/pyramidal tile roof
  hip(gb, F, u, y, v, w, d, h, hex) {
    const rw = Math.max(0.01, w - d), rd = 0.01;
    if (w >= d) K.tbox(gb, F, u, y, v, w, d, Math.max(0.01, w - d), rd, h, hex);
    else K.tbox(gb, F, u, y, v, w, d, rd, Math.max(0.01, d - w), h, hex);
    return rw;
  },
  // cylinder / frustum; seg sides; caps optional (o.top false to skip top, o.bot true for bottom)
  cyl(gb, F, u, y, v, rb, rt, h, seg, hex, o) {
    const cx = F.wx(u, v), cz = F.wz(u, v), y0 = F.y + y, y1 = y0 + h, a0 = (o && o.a0) || 0;
    const ref = [cx, y0 + h / 2, cz];
    const top = o && o.topHex != null ? o.topHex : hex;
    for (let i = 0; i < seg; i++) {
      const a = a0 + (i / seg) * TAU, b = a0 + ((i + 1) / seg) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const p0 = [cx + ca * rb, y0, cz + sa * rb], p1 = [cx + cb * rb, y0, cz + sb * rb], p2 = [cx + cb * rt, y1, cz + sb * rt], p3 = [cx + ca * rt, y1, cz + sa * rt];
      gb.quad(p0, p1, p2, p3, hex, ref, (o && o.inside) ? -1 : 1);
      if (!(o && o.top === false) && rt > 0.001) gb.triR([cx, y1, cz], p3, p2, top, [cx, y1 - 1, cz]);
      if (o && o.bot) gb.triR([cx, y0, cz], p0, p1, hex, [cx, y0 + 1, cz]);
    }
    if (o && o.solid) solidCircle(cx, cz, Math.max(rb, rt), y0, y1, o.solid === 'nowalk');
  },
  // annulus wall ring (thick round wall). gaps: [[a0, a1], ...] angles (world, radians) left open
  ring(gb, F, u, y, v, r0, r1, h, seg, hex, o) {
    const cx = F.wx(u, v), cz = F.wz(u, v), y0 = F.y + y, y1 = y0 + h;
    const gaps = (o && o.gaps) || [];
    const inGap = (a) => gaps.some((g) => angWrap(a - g[0]) >= 0 && angWrap(a - g[0]) <= angWrap(g[1] - g[0]));
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * TAU, b = ((i + 1) / seg) * TAU, m = (a + b) / 2;
      if (inGap(m)) continue;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const o0 = [cx + ca * r1, y0, cz + sa * r1], o1 = [cx + cb * r1, y0, cz + sb * r1], o2 = [cx + cb * r1, y1, cz + sb * r1], o3 = [cx + ca * r1, y1, cz + sa * r1];
      const i0 = [cx + ca * r0, y0, cz + sa * r0], i1 = [cx + cb * r0, y0, cz + sb * r0], i2 = [cx + cb * r0, y1, cz + sb * r0], i3 = [cx + ca * r0, y1, cz + sa * r0];
      const c = [cx, y0 + h / 2, cz];
      gb.quad(o0, o1, o2, o3, (o && o.outHex) || hex, c, 1);
      gb.quad(i0, i1, i2, i3, (o && o.inHex) || hex, c, -1);
      gb.quad(i3, i2, o2, o3, (o && o.topHex) || hex, [cx, y0, cz], 1);
      if (inGap(m + TAU / seg)) gb.quad(i1, o1, o2, i2, hex, [cx + Math.cos(m) * (r0 + r1) / 2, y0 + h / 2, cz + Math.sin(m) * (r0 + r1) / 2]);
      if (inGap(m - TAU / seg)) gb.quad(i0, o0, o3, i3, hex, [cx + Math.cos(m) * (r0 + r1) / 2, y0 + h / 2, cz + Math.sin(m) * (r0 + r1) / 2]);
    }
    if (o && o.solid) solidRing(cx, cz, r0, r1, y0, y1, gaps);
  },
  // hemisphere / spherical cap; o.inside renders the inner face (for the Pantheon), o.oculus leaves a hole (radius)
  dome(gb, F, u, y, v, r, seg, rings, hex, o) {
    const cx = F.wx(u, v), cz = F.wz(u, v), y0 = F.y + y, inside = o && o.inside, ocu = (o && o.oculus) || 0;
    const top = ocu ? Math.asin(Math.sqrt(1 - (ocu / r) * (ocu / r))) : Math.PI / 2;
    const h = (o && o.squash) || 1;
    const ref = [cx, y0, cz];
    for (let j = 0; j < rings; j++) {
      const p0 = (j / rings) * top, p1 = ((j + 1) / rings) * top;
      const rr0 = Math.cos(p0) * r, rr1 = Math.cos(p1) * r, yy0 = y0 + Math.sin(p0) * r * h, yy1 = y0 + Math.sin(p1) * r * h;
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * TAU, b = ((i + 1) / seg) * TAU;
        const A = [cx + Math.cos(a) * rr0, yy0, cz + Math.sin(a) * rr0], B = [cx + Math.cos(b) * rr0, yy0, cz + Math.sin(b) * rr0];
        const Cc = [cx + Math.cos(b) * rr1, yy1, cz + Math.sin(b) * rr1], D = [cx + Math.cos(a) * rr1, yy1, cz + Math.sin(a) * rr1];
        let hx = hex;
        if (o && o.coffer && j < rings - 1) hx = ((i + j) & 1) ? hex : shadeHex(hex, 0.86);
        if (rr1 < 0.01) gb.triR(A, B, Cc, hx, ref, inside ? -1 : 1); else gb.quad(A, B, Cc, D, hx, ref, inside ? -1 : 1);
      }
    }
  },
  // standing column. order: 'd' tuscan/doric, 'i' ionic, 'c' corinthian. o.solid registers a circle.
  column(gb, F, u, y, v, h, r, order, hex = C.marble, o) {
    const seg = (o && o.seg) || 8;
    const capH = order === 'c' ? r * 2.2 : order === 'i' ? r * 1.0 : r * 0.9;
    const baseH = order === 'd' ? r * 0.3 : r * 0.6;
    const shaft = (o && o.shaftHex) || hex;
    K.box(gb, F, u, y, v, r * 2.7, baseH * 0.5, r * 2.7, hex);
    K.cyl(gb, F, u, y + baseH * 0.5, v, r * 1.3, r * 1.12, baseH * 0.5, seg, hex, { top: false });
    K.cyl(gb, F, u, y + baseH, v, r, r * 0.86, h - baseH - capH, seg, shaft, { top: false });
    const cy = y + h - capH;
    if (order === 'c') {
      K.cyl(gb, F, u, cy, v, r * 0.9, r * 1.35, capH * 0.82, seg, hex, { top: false });
      K.box(gb, F, u, cy + capH * 0.82, v, r * 2.9, capH * 0.18, r * 2.9, hex);
    } else if (order === 'i') {
      K.cyl(gb, F, u, cy, v, r * 0.9, r * 1.1, capH * 0.45, seg, hex, { top: false });
      K.box(gb, F, u, cy + capH * 0.4, v, r * 3.0, capH * 0.42, r * 1.7, hex);
      K.box(gb, F, u, cy + capH * 0.82, v, r * 2.5, capH * 0.18, r * 2.5, hex);
    } else {
      K.cyl(gb, F, u, cy, v, r * 0.88, r * 1.25, capH * 0.5, seg, hex, { top: false });
      K.box(gb, F, u, cy + capH * 0.5, v, r * 2.6, capH * 0.5, r * 2.6, hex);
    }
    if (o && o.solid !== false) solidCircle(F.wx(u, v), F.wz(u, v), r * 1.25, F.y + y, F.y + y + h, true);
  },
  // row of columns from (u0, v) to (u1, v) in the frame, n columns (ends included)
  colonnade(gb, F, u0, v0, u1, v1, n, y, h, r, order, hex, o) {
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); K.column(gb, F, lerp(u0, u1, t), y, lerp(v0, v1, t), h, r, order, hex, o); }
  },
  // spandrel over one arched opening: wall thickness t (along v), opening centred at u, springing at ys, radius r,
  // the block reaching up to ytop. Leaves the semicircular hole open.
  archTop(gb, F, u, v, ys, r, ytop, t, hex, seg = 6, inner) {
    const L = (lu, ly, lv) => [F.wx(u + lu, v + lv), F.y + ly, F.wz(u + lu, v + lv)];
    const ref = L(0, ys + r * 0.5, 0);
    for (let i = 0; i < seg; i++) {
      const a = Math.PI - (i / seg) * Math.PI, b = Math.PI - ((i + 1) / seg) * Math.PI;
      const ax = Math.cos(a) * r, ay = ys + Math.sin(a) * r, bx = Math.cos(b) * r, by = ys + Math.sin(b) * r;
      for (const s of [-1, 1]) {
        const vv = s * t / 2;
        gb.quad(L(ax, ay, vv), L(bx, by, vv), L(bx, ytop, vv), L(ax, ytop, vv), hex, L(0, ys + r * 0.5, 0), 1);
      }
      // intrados (soffit) faces down/in toward the opening centre
      gb.quad(L(ax, ay, -t / 2), L(bx, by, -t / 2), L(bx, by, t / 2), L(ax, ay, t / 2), inner || shadeHex(hex, 0.8), L(0, ys, 0), -1);
    }
    gb.quad(L(-r, ytop, -t / 2), L(r, ytop, -t / 2), L(r, ytop, t / 2), L(-r, ytop, t / 2), hex, ref);
  },
  // wall with n arched openings along u (from u0 to u1) at v: piers + spandrels. Piers are solid.
  arcade(gb, F, u0, u1, v, y, n, pierW, ys, ytop, t, hex, o) {
    const bay = (u1 - u0) / n, r = (bay - pierW) / 2;
    for (let i = 0; i <= n; i++) {
      const pu = u0 + i * bay;
      const w = (i === 0 || i === n) ? pierW : pierW;
      K.box(gb, F, pu, y, v, w, ytop - y, t, hex, { solid: o && o.solid !== false ? true : false, skip: 'b' });
    }
    for (let i = 0; i < n; i++) {
      const cu = u0 + (i + 0.5) * bay;
      K.archTop(gb, F, cu, v, ys, r, ytop, t, hex, (o && o.seg) || 6, o && o.inner);
      if (o && o.halfCol) K.box(gb, F, u0 + i * bay, y, v - t / 2 - 0.25, pierW * 0.45, ytop - y, 0.5, o.halfCol);
    }
    if (o && o.halfCol) K.box(gb, F, u1, y, v - t / 2 - 0.25, pierW * 0.45, ytop - y, 0.5, o.halfCol);
  },
  // steps: n steps rising toward -v (toward the building front at v0 - depth) ... generic: from (u, v0) going in dir
  // along v by `dir` (±1), each step rise rh and tread td, width w. Each step is a walkable solid.
  stairs(gb, F, u, y, v0, w, n, rh, td, dir, hex) {
    for (let i = 0; i < n; i++) {
      const vv = v0 + dir * (i + 0.5) * td;
      const hh = (n - i) * rh;
      K.box(gb, F, u, y, vv, w, hh, td, hex, { solid: true, skip: 'b' });
    }
  },
  // flat polygon (convex or star-shaped around its centroid) at height y, facing up
  poly(gb, F, pts, y, hex) {
    let cu = 0, cv = 0; for (const p of pts) { cu += p[0]; cv += p[1]; } cu /= pts.length; cv /= pts.length;
    const c = _wp(F, cu, y, cv), ref = _wp(F, cu, y - 1, cv);
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; gb.triR(c, _wp(F, a[0], y, a[1]), _wp(F, b[0], y, b[1]), hex, ref); }
  },
  // vertical rectangle (decal-ish panel) on the plane v = const, facing -v (fac -1) or +v (fac 1)
  panel(gb, F, u, y, v, w, h, hex, fac = -1) {
    const a = _wp(F, u - w / 2, y, v), b = _wp(F, u + w / 2, y, v), c = _wp(F, u + w / 2, y + h, v), d = _wp(F, u - w / 2, y + h, v);
    gb.quad(a, b, c, d, hex, _wp(F, u, y + h / 2, v - fac));
  },
  // panel on plane u = const facing -u / +u
  panelU(gb, F, u, y, v, w, h, hex, fac = -1) {
    const a = _wp(F, u, y, v - w / 2), b = _wp(F, u, y, v + w / 2), c = _wp(F, u, y + h, v + w / 2), d = _wp(F, u, y + h, v - w / 2);
    gb.quad(a, b, c, d, hex, _wp(F, u - fac, y + h / 2, v));
  },
  // a statue on a plinth (low-poly figure). kind: 'man' | 'horse' | 'god'
  statue(gb, F, u, y, v, hex, kind = 'man', face = 0, s = 1) {
    const S = F.sub(u, v, face, F.y + y);
    K.box(gb, S, 0, 0, 0, 1.3 * s, 1.5 * s, 1.3 * s, C.marble2, { solid: true });
    const b = 1.5 * s;
    if (kind === 'horse') {
      K.box(gb, S, 0, b + 0.9 * s, 0, 0.7 * s, 0.7 * s, 2.0 * s, hex);
      for (const [du, dv] of [[-0.25, -0.8], [0.25, -0.8], [-0.25, 0.8], [0.25, 0.8]]) K.box(gb, S, du * s, b, dv * s, 0.18 * s, 0.95 * s, 0.18 * s, hex);
      K.tbox(gb, S, 0, b + 1.3 * s, 1.0 * s, 0.4 * s, 0.5 * s, 0.3 * s, 0.4 * s, 0.9 * s, hex, { ov: 0.3 * s });
      K.box(gb, S, 0, b + 1.55 * s, 0, 0.45 * s, 0.8 * s, 0.35 * s, hex);
      K.box(gb, S, 0, b + 2.35 * s, 0, 0.26 * s, 0.3 * s, 0.26 * s, hex);
    } else {
      K.tbox(gb, S, 0, b, 0, 0.62 * s, 0.42 * s, 0.5 * s, 0.32 * s, 1.35 * s, hex);
      K.box(gb, S, 0, b + 1.35 * s, 0, 0.26 * s, 0.32 * s, 0.28 * s, hex);
      K.box(gb, S, 0.36 * s, b + 0.75 * s, 0, 0.14 * s, 0.62 * s, 0.14 * s, hex, { ra: 0.2 });
      if (kind === 'god') K.box(gb, S, -0.4 * s, b + 0.5 * s, 0, 0.08 * s, 1.6 * s, 0.08 * s, hex);
    }
  },
};

// ---------- text decals (inscriptions, painted notices) ----------
const DECALS = [];
function textCanvas(lines, o) {
  const W = o.pw || 512, H = o.ph || 128, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = o.bg || '#e6dfcf'; g.fillRect(0, 0, W, H);
  if (o.noise) for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
  g.fillStyle = o.ink || '#3a2a20'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = lines.length, lh = H / (n + 0.4);
  for (let i = 0; i < n; i++) {
    let fs = Math.floor(lh * (o.size || 0.78));
    g.font = `${o.weight || 700} ${fs}px ${o.font || '"Cinzel", "Trajan Pro", "Times New Roman", serif'}`;
    while (g.measureText(lines[i]).width > W * 0.94 && fs > 6) { fs--; g.font = `${o.weight || 700} ${fs}px ${o.font || '"Cinzel", "Times New Roman", serif'}`; }
    g.fillText(lines[i], W / 2, lh * (i + 0.7));
  }
  return cv;
}
// A text panel on the plane v = const of frame F, facing -v (toward the viewer standing at smaller v) by default.
function decal(F, u, y, v, w, h, lines, o = {}) {
  DECALS.push({ F, u, y, v, w, h, lines, o });
}
