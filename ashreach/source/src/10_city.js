// Ashreach — structures (huts, outposts, camps, kiosks, machinery, pylons, ships) and Halden Crossing, the Concord city

// Palette (sRGB hex; wdC converts).
const CT = {
  sand: 0xd9c19a, sand2: 0xc9a97c, sandD: 0xa88a62, white: 0xe9e6dc, white2: 0xd2d0c8, grey: 0x8a8d90, greyD: 0x55595e, dark: 0x2a2e33,
  steel: 0x9aa2a8, rust: 0x8a4a2c, rust2: 0x6e3b26, teal: 0x5fe0d0, amber: 0xffb347, glass: 0x2c4a5e, glassL: 0x6f9fc0,
  wood: 0x7a5a3a, cloth: 0xb8865a, red: 0xa83a2a, blue: 0x2f5fa8, mblue: 0x3d7fd8, black: 0x16191c, roof: 0x6b6258,
};
// ---------- building parts ----------
// Facade windows on one face of a box (local frame f, face at lz = d/2 facing +z).
function ctWindows(f, y0, w, h, d, yaw, o = {}) {
  const fh = o.floor || 3.6, cw = o.cell || 3.2, ww = o.ww || 1.4, wh = o.wh || 1.5, glowP = o.glow ?? 0.18;
  const nx = Math.max(1, Math.floor((w - 1.5) / cw)), ny = Math.max(1, Math.floor((h - 1) / fh));
  const s0 = -((nx - 1) * cw) / 2;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (o.skip && o.skip(i, j)) continue;
    const lx = s0 + i * cw, ly = y0 + 1.2 + j * fh + (o.yoff || 0);
    if (ly + wh > y0 + h - 0.3) continue;
    const lit = hash2(Math.round(f(lx, 0)[0] * 7 + j * 31), Math.round(f(lx, 0)[1] * 3 + i)) < glowP;
    const p = (ax, ay) => { const q = f(lx + ax, d / 2 + 0.06); return [q[0], ly + ay, q[1]]; };
    wdPoly(lit ? 'glow' : 'flat', [p(-ww / 2, 0), p(ww / 2, 0), p(ww / 2, wh), p(-ww / 2, wh)], lit ? (o.litCol || 0xffd890) : (o.col || CT.glass), [f(0, 0)[0], ly, f(0, 0)[1]]);
  }
  void yaw;
}
// A door on the front face: dark recess, frame, glow strip. Returns nothing.
function ctDoor(f, y0, d, yaw, o = {}) {
  const w = o.w || 1.8, h = o.h || 2.6, glow = o.glow ?? CT.teal, lx = o.x || 0;
  const [x, z] = f(lx, d / 2 + 0.05);
  wdBox(x, y0, z, w + 0.5, h + 0.35, 0.16, o.frame || CT.greyD, yaw);
  const [x2, z2] = f(lx, d / 2 + 0.14);
  wdBox(x2, y0, z2, w, h, 0.05, o.col || CT.dark, yaw, 'flat');
  const [x3, z3] = f(lx, d / 2 + 0.18);
  wdBox(x3, y0 + h + 0.05, z3, w * 0.9, 0.12, 0.05, glow, yaw, 'glow');
  if (o.step !== false) { const [x4, z4] = f(lx, d / 2 + 0.6); wdBox(x4, y0 - 0.3, z4, w + 1.2, 0.42, 1.0, o.stepCol || CT.grey, yaw, 'flat'); }
}
// Prefab hut / small building. o: { w, d, h, col, roof, trim, door: bool, style: 'prefab'|'sand'|'scrap'|'bunker' , win }
function ctHut(cx, cz, yaw, o = {}) {
  const w = o.w || 12, d = o.d || 10, h = o.h || 4.5, st = o.style || 'prefab';
  const y0 = o.y ?? (Math.min(groundY(cx, cz), groundY(...ctFrame(cx, cz, yaw)(w / 2, d / 2)), groundY(...ctFrame(cx, cz, yaw)(-w / 2, -d / 2)), groundY(...ctFrame(cx, cz, yaw)(-w / 2, d / 2)), groundY(...ctFrame(cx, cz, yaw)(w / 2, -d / 2))) - 0.15);
  const f = ctFrame(cx, cz, yaw);
  const col = o.col ?? (st === 'sand' ? CT.sand : st === 'scrap' ? CT.rust : st === 'bunker' ? 0x6f6a5c : CT.white2);
  const trim = o.trim ?? (st === 'scrap' ? CT.rust2 : st === 'sand' ? CT.sandD : CT.greyD);
  // plinth down to the slope, body, roof slab
  wdBox(cx, y0 - 3, cz, w + 0.6, 3.2, d + 0.6, trim, yaw, 'lit', trim);
  if (st === 'scrap') {
    for (let i = 0; i < 4; i++) { const [x, z] = f(-w / 2 + w * (i + 0.5) / 4, 0); wdBox(x, y0, z, w / 4 + 0.05, h - (i % 2) * 0.4, d, i % 2 ? CT.rust : CT.rust2, yaw, 'lit', CT.roof); }
  } else wdBox(cx, y0, cz, w, h, d, col, yaw, 'lit', o.roof ?? CT.grey);
  wdColObb(cx, cz, w, d, yaw, y0, y0 + h + 1);
  if (st === 'prefab') {
    const [x1, z1] = f(0, 0);
    wdBox(x1, y0 + h, z1, w + 0.8, 0.35, d + 0.8, o.roof ?? CT.grey, yaw);
    // ribbed stripe
    wdBox(cx, y0 + h * 0.62, cz, w + 0.08, 0.35, d + 0.08, o.stripe ?? CT.amber, yaw, 'lit');
    const [ax, az] = f(w * 0.25, -d * 0.1); wdBox(ax, y0 + h + 0.35, az, 1.6, 0.9, 1.4, CT.steel, yaw); // AC unit
  } else if (st === 'sand') {
    wdBox(cx, y0 + h, cz, w + 0.4, 0.5, d + 0.4, CT.white, yaw);
  } else if (st === 'bunker') {
    wdBox(cx, y0 + h, cz, w + 1.2, 0.6, d + 1.2, 0x5a564a, yaw);
  } else {
    const [x1, z1] = f(0, 0.4); wdBox(x1, y0 + h, z1, w + 1.2, 0.2, d + 1.6, CT.rust2, yaw);
  }
  if (o.door !== false) ctDoor(f, y0, d, yaw, { glow: o.doorGlow ?? (st === 'scrap' ? CT.amber : CT.teal), x: o.doorX || 0 });
  if (o.win !== false) {
    const g = (lx, lz) => f(lx, lz);
    ctWindows(g, y0, w, h, d, yaw, { glow: o.glowWin ?? 0.25, skip: (i, j) => j === 0 && Math.abs(-((Math.max(1, Math.floor((w - 1.5) / 3.2)) - 1) * 3.2) / 2 + i * 3.2 - (o.doorX || 0)) < 2 });
    const back = ctFrame(cx, cz, yaw + Math.PI); ctWindows(back, y0, w, h, d, yaw + Math.PI, { glow: 0.1 });
  }
  return { y0, f };
}
// A pre-placed building with a usable door, from a ctDoorRec.
function ctMissionBuilding(rec, style) {
  ctHut(rec.bx, rec.bz, rec.by, { w: 12, d: rec.bd || 10, h: style === 'sand' ? 7 : 4.6, style, glowWin: 0.15 });
}
function ctLamp(x, z, h = 5, col = CT.amber, light = false, y) {
  const g = y ?? groundY(x, z);
  wdBox(x, g, z, 0.22, h, 0.22, CT.greyD);
  wdBox(x, g + h - 0.1, z, 0.9, 0.12, 0.3, CT.greyD);
  wdBox(x, g + h - 0.45, z, 0.55, 0.35, 0.4, col, 0, 'glow');
  wdColCyl(x, z, 0.2, g, g + h).nomap = true;
  if (light) wdLight(x, g + h - 0.6, z, col, 1.4, 22);
}
// Fence along a polyline of [x,z] points.
function ctFence(pts, h = 2.2, col = CT.steel, post = CT.greyD) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bz - az, bx - ax) * -1;
    const n = Math.max(1, Math.round(L / 4));
    for (let k = 0; k <= n; k++) {
      const x = lerp(ax, bx, k / n), z = lerp(az, bz, k / n), g = groundY(x, z);
      wdBox(x, g - 0.5, z, 0.25, h + 0.5, 0.25, post);
      if (k < n) {
        const x2 = lerp(ax, bx, (k + 0.5) / n), z2 = lerp(az, bz, (k + 0.5) / n), g2 = groundY(x2, z2);
        wdBox(x2, g2 + 0.5, z2, L / n, 0.12, 0.08, col, yaw);
        wdBox(x2, g2 + h * 0.8, z2, L / n, 0.12, 0.08, col, yaw);
        wdBox(x2, g2 + 0.3, z2, L / n, h * 0.55, 0.03, 0x707478, yaw, 'flat');
      }
    }
    wdColObb((ax + bx) / 2, (az + bz) / 2, L, 0.4, yaw, groundY((ax + bx) / 2, (az + bz) / 2) - 1, groundY((ax + bx) / 2, (az + bz) / 2) + h);
  }
}
// Octagonal landing pad (walkable floor), with a glow ring.
function ctPad(x, z, r, y, ringCol = CT.amber) {
  const g = y ?? groundY(x, z);
  wdPrism(x, g - 2.5, z, r + 0.6, r + 0.3, 2.95, 8, CT.greyD, Math.PI / 8, 'lit', CT.grey);
  wdPrism(x, g + 0.44, z, r * 0.92, r * 0.92, 0.04, 8, 0x6d7177, Math.PI / 8, 'flat');
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; wdBox(x + Math.cos(a) * r * 0.82, g + 0.46, z + Math.sin(a) * r * 0.82, 0.9, 0.05, 0.3, ringCol, -a, 'glow'); }
  wdBox(x, g + 0.47, z, r * 0.9, 0.04, 0.6, 0xe8e2d0, 0, 'flat'); wdBox(x, g + 0.47, z, 0.6, 0.04, r * 0.9, 0xe8e2d0, 0, 'flat');
  wdFloor(x - r * 0.9, z - r * 0.9, x + r * 0.9, z + r * 0.9, g + 0.45);
  wdLight(x, g + 4, z, ringCol, 0.8, 26);
  return g + 0.45;
}
function ctTank(x, z, r, h, col = CT.white2, y) {
  const g = y ?? groundY(x, z) - 0.3;
  wdPrism(x, g, z, r, r, h, 10, col, 0, 'lit', CT.grey);
  wdPrism(x, g + h, z, r, r * 0.4, r * 0.4, 10, CT.grey);
  wdBox(x, g + h * 0.7, z, r * 2.05, 0.3, r * 2.05, CT.amber, 0.39, 'lit');
  wdColCyl(x, z, r, g, g + h + r * 0.4);
}
// Mining derrick: tapering lattice tower with a drill string and a pump house.
function ctDerrick(x, z, yaw = 0, h = 22, col = CT.rust) {
  const g = groundY(x, z) - 0.2, b = 3.2, t = 0.8;
  const f = ctFrame(x, z, yaw);
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [a, c] of C) {
    const p0 = f(a * b, c * b), p1 = f(a * t, c * t);
    wdBeam([p0[0], g, p0[1]], [p1[0], g + h, p1[1]], 0.35, col);
  }
  for (let k = 1; k < 6; k++) {
    const y = g + (h * k) / 6, r = lerp(b, t, k / 6);
    for (let i = 0; i < 4; i++) {
      const [a, c] = C[i], [a2, c2] = C[(i + 1) % 4], p0 = f(a * r, c * r), p1 = f(a2 * r, c2 * r);
      wdBeam([p0[0], y, p0[1]], [p1[0], y, p1[1]], 0.22, col);
      const rn = lerp(b, t, (k - 1) / 6), q0 = f(a * rn, c * rn);
      wdBeam([q0[0], y - h / 6, q0[1]], [p1[0], y, p1[1]], 0.14, CT.rust2);
    }
  }
  wdBox(x, g + h, x === x ? z : z, t * 2.8, 1.2, t * 2.8, CT.greyD, yaw);
  wdBox(x, g + h + 1.2, z, 0.6, 0.6, 0.6, CT.amber, yaw, 'glow');
  wdPrism(x, g, z, 0.3, 0.3, h, 6, CT.steel);
  const [px, pz] = f(0, b + 3.5);
  wdBox(px, g, pz, 5, 3.4, 4, CT.white2, yaw, 'lit', CT.grey);
  wdColObb(px, pz, 5, 4, yaw, g, g + 3.4);
  wdColCyl(x, z, b * 0.9, g, g + h);
}
// Pipeline on trestles along a polyline.
function ctPipeline(pts, hgt = 1.6, r = 0.6, col = 0x8c8f88) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 12));
    for (let k = 0; k < n; k++) {
      const x0 = lerp(ax, bx, k / n), z0 = lerp(az, bz, k / n), x1 = lerp(ax, bx, (k + 1) / n), z1 = lerp(az, bz, (k + 1) / n);
      const y0 = groundY(x0, z0) + hgt, y1 = groundY(x1, z1) + hgt;
      wdBeam([x0, y0, z0], [x1, y1, z1], r * 1.6, col);
      wdBeam([x0, y0 - r, z0], [x0, y0 - hgt - 0.5, z0], 0.3, CT.greyD);
      if (k % 3 === 0) wdBox(x0, y0 - r * 1.1, z0, r * 2.6, r * 2.2, r * 2.6, CT.rust, Math.atan2(bz - az, bx - ax) * -1);
      wdColCyl(x0, z0, 0.5, y0 - hgt, y0 + r);
    }
  }
}

// ---------- POI furniture ----------
function ctKiosk(x, z, yaw, glow = CT.amber, body = CT.greyD) {
  const g = groundY(x, z), f = ctFrame(x, z, yaw);
  wdBox(x, g - 0.2, z, 1.4, 0.3, 1.0, CT.grey, yaw);
  wdBox(x, g, z, 0.9, 1.3, 0.6, body, yaw);
  const [sx, sz] = f(0, 0.05);
  wdBox(sx, g + 1.25, sz, 1.1, 0.95, 0.35, body, yaw);
  const [gx, gz] = f(0, 0.24);
  wdBox(gx, g + 1.35, gz, 0.9, 0.7, 0.04, glow, yaw, 'glow');
  wdBox(x, g + 2.2, z, 1.1, 0.08, 0.4, glow, yaw, 'glow');
  wdColCyl(x, z, 0.55, g, g + 2.2).nomap = true;
}
function ctCounter(p, col = CT.wood, top = CT.sandD) {
  const f = ctFrame(p.x, p.z, p.yaw || 0), [x, z] = f(0, 1.15), g = groundY(x, z);
  wdBox(x, g, z, 2.6, 1.05, 0.7, col, p.yaw || 0, 'lit', top);
  wdColObb(x, z, 2.6, 0.7, p.yaw || 0, g, g + 1.05).nomap = true;
}
function ctCloneBay(x, z, yaw) {
  const g = groundY(x, z), f = ctFrame(x, z, yaw);
  const [tx, tz] = f(0, -0.6);
  wdPrism(tx, g, tz, 1.2, 1.2, 0.35, 10, CT.greyD);
  wdPrism(tx, g + 0.35, tz, 0.95, 0.95, 2.2, 10, 0x9ff0e8, 0, 'glow');
  wdPrism(tx, g + 2.55, tz, 1.2, 0.9, 0.5, 10, CT.greyD);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; wdBox(tx + Math.cos(a) * 1.05, g + 0.35, tz + Math.sin(a) * 1.05, 0.18, 2.2, 0.18, CT.white2, -a); }
  const [cx, cz] = f(1.7, 0.2);
  wdBox(cx, g, cz, 0.8, 1.1, 0.6, CT.white2, yaw, 'lit', CT.grey);
  const [sx, sz] = f(1.7, 0.52); wdBox(sx, g + 0.8, sz, 0.6, 0.25, 0.04, CT.teal, yaw, 'glow');
  // the Concord sign: a teal ring
  const [rx, rz] = f(0, -0.6);
  wdPrism(rx, g + 3.3, rz, 0.55, 0.55, 0.12, 12, CT.teal, 0, 'glow');
  wdColCyl(tx, tz, 1.2, g, g + 3).nomap = true;
  wdLight(tx, g + 2, tz, CT.teal, 0.9, 10);
}
function ctConsole(x, z, yaw, glow = 0x8fc8ff) {
  const g = groundY(x, z), f = ctFrame(x, z, yaw);
  wdBox(x, g, z, 1.6, 1.0, 0.9, CT.white2, yaw, 'lit', CT.grey);
  const [sx, sz] = f(0, 0.2);
  wdBox(sx, g + 1.0, sz, 1.3, 0.08, 0.5, glow, yaw, 'glow');
  const [ax, az] = f(0.6, -0.3);
  wdBox(ax, g + 1.0, az, 0.08, 2.4, 0.08, CT.greyD, yaw);
  wdBox(ax, g + 3.4, az, 0.25, 0.25, 0.25, glow, yaw, 'glow');
  wdColCyl(x, z, 0.7, g, g + 1).nomap = true;
}
// Called by loadZone for every POI that does not set noProp.
function ctPoiProp(p, def) {
  const y = p.yaw || 0;
  switch (p.type) {
    case 'terminal': ctKiosk(p.x, p.z, y, CT.amber); break;
    case 'bank': ctKiosk(p.x, p.z, y, 0xffe08a, 0x4a4030); break;
    case 'clonebay': ctCloneBay(p.x, p.z, y); break;
    case 'hopper': ctConsole(p.x, p.z, y, 0x8fc8ff); break;
    case 'shuttle': ctConsole(p.x, p.z, y, 0xffd27a); break;
    case 'vendor': if (p.counter !== false) ctCounter(p); break;
  }
  void def;
}

// ---------- camps ----------
const CT_CAMP = {
  raider: { cloth: [0x9a6a3a, 0x7a3a28, 0x5a5a48], wall: CT.rust, fire: 0xff8a3a },
  smuggler: { cloth: [0x4a5a50, 0x6a6048, 0x3a4048], wall: 0x5a5048, fire: 0xffa050 },
  cultist: { cloth: [0x5a3a6a, 0x3a5a5a, 0x6a6a5a], wall: 0x4a3a30, fire: 0x7ff0e0 },
  canyon: { cloth: [0x8a4a2a, 0x6a5040, 0xa0703a], wall: CT.rust2, fire: 0xff7a30 },
  deserter: { cloth: [0x3a4a6a, 0x5a6070, 0x2a3040], wall: 0x50565e, fire: 0x9fc8ff },
};
function ctTent(x, z, yaw, w, d, h, col) {
  const g = groundY(x, z) - 0.1;
  wdGable(x, g, z, w, d, h, col, yaw, 'lit', wdMul(col, 0.7));
  wdColObb(x, z, w, d * 0.9, yaw, g, g + h);
}
function ctCrate(x, z, s = 1.2, col = 0x7a6a4a, yaw = 0, y) {
  const g = y ?? groundY(x, z) - 0.05;
  wdBox(x, g, z, s, s, s, col, yaw, 'lit', wdMul(col, 1.15));
  wdColObb(x, z, s, s, yaw, g, g + s).nomap = true;
}
function ctBarrel(x, z, col = 0x5a6a4a) {
  const g = groundY(x, z) - 0.05;
  wdPrism(x, g, z, 0.45, 0.45, 1.1, 8, col);
  wdColCyl(x, z, 0.45, g, g + 1.1).nomap = true;
}
function ctFire(x, z, col) {
  const g = groundY(x, z);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; wdBox(x + Math.cos(a) * 0.9, g - 0.1, z + Math.sin(a) * 0.9, 0.5, 0.35, 0.4, 0x5a5550, -a); }
  wdPrism(x, g, z, 0.55, 0, 1.1, 5, col, 0.3, 'glow');
  wdPrism(x, g, z, 0.35, 0, 1.6, 4, 0xffe0a0, 1.1, 'glow');
  wdLight(x, g + 1.5, z, col, 1.6, 20).flicker = true;
}
// A camp ringed around a spawn point (tents, crates, fire, barricades, banner).
function ctCamp(sp, def, i) {
  const S = CT_CAMP[sp.campStyle || def.campStyle || 'raider'];
  const rng = makeRng(strSeed(def.id + 'camp' + i));
  const R = Math.min(sp.r, 18);
  ctFire(sp.x, sp.z, S.fire);
  const n = 3 + rng.i(0, 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + rng.r(-0.3, 0.3), r = R * rng.r(0.55, 0.8);
    const x = sp.x + Math.sin(a) * r, z = sp.z + Math.cos(a) * r;
    ctTent(x, z, a + Math.PI / 2, rng.r(3.5, 5), rng.r(3, 4), rng.r(2.2, 3), rng.pick(S.cloth));
    const a2 = a + 0.5, r2 = R * 0.9;
    ctCrate(sp.x + Math.sin(a2) * r2, sp.z + Math.cos(a2) * r2, rng.r(0.9, 1.4), 0x7a6a4a, rng.r(0, 3));
    if (rng.chance(0.6)) ctBarrel(sp.x + Math.sin(a2 + 0.12) * (r2 - 1.6), sp.z + Math.cos(a2 + 0.12) * (r2 - 1.6));
  }
  // barricade arcs
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.8 + rng.r(-0.2, 0.2), r = R + 4;
    const x = sp.x + Math.sin(a) * r, z = sp.z + Math.cos(a) * r, g = groundY(x, z);
    const yaw = a + Math.PI / 2;
    wdBox(x, g - 0.3, z, 6, 1.6, 0.6, S.wall, yaw, 'lit');
    for (let q = -1; q <= 1; q += 2) { const f = ctFrame(x, z, yaw), [sx, sz] = f(q * 2.2, 0.6); wdBeam([sx, g, sz], [sx + Math.sin(yaw) * 0.6, g + 2.2, sz + Math.cos(yaw) * 0.6], 0.15, 0x6a5a48); }
    wdColObb(x, z, 6, 0.8, yaw, g, g + 1.3);
  }
  const bx = sp.x + R * 0.3, bz = sp.z - R * 0.3, bg = groundY(bx, bz);
  wdBox(bx, bg, bz, 0.18, 6, 0.18, CT.greyD);
  wdBox(bx + 0.8, bg + 4.2, bz, 1.5, 1.6, 0.05, rng.pick(S.cloth), 0);
}

// ---------- vehicles and set pieces ----------
// Parked shuttle (decor) facing yaw, on ground y.
function ctShuttle(x, z, yaw, y) {
  const f = ctFrame(x, z, yaw), g = y ?? groundY(x, z);
  const P = (lx, ly, lz) => { const q = f(lx, lz); return [q[0], g + ly, q[1]]; };
  const ctr = P(0, 3, 0);
  const hull = [[-3, 1.2, -9], [3, 1.2, -9], [3.4, 1.2, 4], [1.6, 1.2, 10], [-1.6, 1.2, 10], [-3.4, 1.2, 4]];
  const top = [[-2.2, 4.4, -8], [2.2, 4.4, -8], [2.4, 4.6, 3], [1, 3.6, 8.5], [-1, 3.6, 8.5], [-2.4, 4.6, 3]];
  wdPoly('lit', hull.map((p) => P(...p)), CT.greyD, ctr);
  wdPoly('lit', top.map((p) => P(...p)), CT.white, ctr);
  for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; wdPoly('lit', [P(...hull[i]), P(...hull[j]), P(...top[j]), P(...top[i])], i === 3 ? 0x34404a : CT.white2, ctr); }
  // cockpit glass, wings, engines, legs
  wdPoly('glow', [P(-0.9, 3.75, 8.4), P(0.9, 3.75, 8.4), P(1.4, 2.6, 9.5), P(-1.4, 2.6, 9.5)], 0x7fb8d8);
  for (const s of [-1, 1]) {
    wdPoly('lit', [P(s * 3.2, 2.2, -6), P(s * 9, 2.0, -7), P(s * 9, 2.0, -4.5), P(s * 3.3, 2.4, 2)], CT.white2, P(s * 5, 0, -3));
    wdPoly('lit', [P(s * 3.2, 2.0, -6), P(s * 9, 1.8, -7), P(s * 9, 1.8, -4.5), P(s * 3.3, 2.0, 2)], CT.greyD, P(s * 5, 5, -3));
    const e = P(s * 2, 1.6, -9.6);
    wdBox(e[0], e[1], e[2], 1.6, 1.6, 1.4, CT.greyD, yaw);
    const e2 = P(s * 2, 1.8, -10.35);
    wdBox(e2[0], e2[1], e2[2], 1.1, 1.1, 0.1, 0x8fd8ff, yaw, 'glow');
    for (const lz of [-5, 5]) { const l = P(s * 2.2, 0, lz); wdBox(l[0], g, l[2], 0.3, 1.3, 0.3, CT.dark, yaw); }
    const st = P(s * 9, 2.1, -5.7); wdBox(st[0], st[1], st[2], 0.3, 0.12, 2.8, s < 0 ? 0xff5040 : 0x50ff80, yaw, 'glow');
  }
  wdColObb(...f(0, 0), 7.2, 19, yaw, g, g + 4.5);
  for (const s of [-1, 1]) { const w = f(s * 6.2, -5.5); wdColObb(w[0], w[1], 6, 4, yaw, g + 1.5, g + 2.5).nomap = true; }
}
// Hovering hopper craft (animated mesh, bobs above its pad).
function ctHopperCraft(x, y, z, yaw) {
  const parts = [];
  const W = wdC(CT.white), D = wdC(CT.greyD), B = wdC(0x8fc8ff), A = wdC(CT.amber);
  parts.push({ geo: new THREE.CylinderGeometry(4.5, 5.5, 2.2, 8), p: [0, 1.1, 0], c: W });
  parts.push({ geo: new THREE.CylinderGeometry(3, 4.5, 1.6, 8), p: [0, 3, 0], c: W });
  parts.push({ geo: new THREE.CylinderGeometry(5.6, 5.6, 0.4, 8), p: [0, 0.2, 0], c: D });
  parts.push({ geo: new THREE.CylinderGeometry(2.2, 3, 0.9, 8), p: [0, 4.2, 0], c: wdC(0x34404a) });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    parts.push({ geo: new THREE.BoxGeometry(1.6, 1.2, 4), p: [Math.cos(a) * 6, 1.2, Math.sin(a) * 6], r: [0, -a + Math.PI / 2, 0], c: D });
  }
  const m = new THREE.Mesh(mergeParts(parts), WD_MAT.lit);
  m.castShadow = true;
  const glow = [];
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; glow.push({ geo: new THREE.CylinderGeometry(0.6, 0.6, 0.2, 8), p: [Math.cos(a) * 6, 0.55, Math.sin(a) * 6], c: B }); }
  glow.push({ geo: new THREE.CylinderGeometry(5.62, 5.62, 0.15, 8), p: [0, 2.0, 0], c: A });
  const gm = new THREE.Mesh(mergeParts(glow), WD_MAT.glow);
  const grp = new THREE.Group(); grp.add(m, gm);
  grp.position.set(x, y, z); grp.rotation.y = yaw;
  zoneRoot.add(grp);
  WD.anims.push((t) => { grp.position.y = y + Math.sin(t * 0.8) * 0.35; grp.rotation.y = yaw + Math.sin(t * 0.3) * 0.05; });
}
// Lumen pylon: a tall lattice spire with a glowing core and four guard posts.
function ctPylon(x, z, faction) {
  const g = groundY(x, z);
  const fc = faction === 'meridian' ? CT.mblue : faction === 'freehold' ? 0xd8603a : 0xc0a0ff;
  wdPrism(x, g - 1, z, 9, 8, 2, 6, CT.greyD, 0, 'lit', CT.grey);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    wdBeam([x + Math.cos(a) * 7, g + 1, z + Math.sin(a) * 7], [x + Math.cos(a) * 1.4, g + 38, z + Math.sin(a) * 1.4], 0.9, CT.steel);
    wdBeam([x + Math.cos(a) * 4.5, g + 14, z + Math.sin(a) * 4.5], [x + Math.cos(a + TAU / 3) * 4.5, g + 14, z + Math.sin(a + TAU / 3) * 4.5], 0.4, CT.greyD);
    wdBeam([x + Math.cos(a) * 2.8, g + 26, z + Math.sin(a) * 2.8], [x + Math.cos(a + TAU / 3) * 2.8, g + 26, z + Math.sin(a + TAU / 3) * 2.8], 0.35, CT.greyD);
  }
  wdPrism(x, g + 1, z, 1.6, 1.0, 34, 6, 0x9a80ff, 0, 'glow');
  wdPrism(x, g + 35, z, 1.0, 0, 9, 6, 0xe0d0ff, 0, 'glow');
  wdPrism(x, g + 20, z, 3.2, 3.2, 0.6, 12, fc, 0, 'glow');
  wdLight(x, g + 6, z, 0xa080ff, 2.2, 40);
  wdColCyl(x, z, 8.5, g, g + 40);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, px = x + Math.cos(a) * 30, pz = z + Math.sin(a) * 30, pg = groundY(px, pz);
    wdBox(px, pg - 1, pz, 4, 7, 4, CT.greyD, -a, 'lit', CT.grey);
    wdBox(px, pg + 6, pz, 5, 0.6, 5, CT.steel, -a);
    wdBox(px, pg + 4, pz, 4.05, 0.4, 4.05, fc, -a, 'glow');
    wdColObb(px, pz, 4, 4, -a, pg, pg + 6.6);
  }
}

// ---------- Halden Crossing ----------
const CT_HW = 215;   // wall half-size
function ctHalden(def) {
  const rng = makeRng(strSeed('halden'));
  wdTerrain({
    cell: 5, margin: 120, chunk: 400,
    height: (x, z) => {
      const e = Math.max(Math.abs(x), Math.abs(z));
      return smooth(CT_HW + 10, CT_HW + 60, e) * (2 + 5 * fbm(x * 0.01, z * 0.01, 3) + Math.pow(Math.abs(Math.sin(x * 0.03 + z * 0.012)), 2) * 2.5);
    },
    edge: { h: 40, w: 40, gap: 30 },
    color: (x, y, z, ny, out) => {
      const e = Math.max(Math.abs(x), Math.abs(z));
      const c = e < CT_HW ? wdMix(0xc8b08a, 0xb89c74, vnoise(x * 0.05, z * 0.05)) : wdMix(0xd8bc8c, 0xc4a070, vnoise(x * 0.03, z * 0.03));
      const r = ny < 0.8 ? wdMix(c, 0xa07a58, 0.6) : c;
      out[0] = r[0]; out[1] = r[1]; out[2] = r[2];
    },
    roadCol: 0xa89478,
  });
  const PAVE = 0xcfc6b4, PAVE2 = 0xb8ae9c, CURB = 0x9a9488;
  // avenues, sidewalks, plaza
  wdBox(0, 0, 0, 2 * CT_HW, 0.05, 22, 0x6e6a64, 0, 'flat');
  wdBox(0, 0, 0, 22, 0.05, 2 * CT_HW, 0x6e6a64, 0, 'flat');
  for (const s of [-1, 1]) {
    wdBox(0, 0, s * 13.5, 2 * CT_HW, 0.1, 5, PAVE2, 0, 'flat');
    wdBox(s * 13.5, 0, 0, 5, 0.1, 2 * CT_HW, PAVE2, 0, 'flat');
    for (let k = -CT_HW + 6; k < CT_HW; k += 6) { wdBox(k, 0.05, s * 0.3, 2.4, 0.02, 0.18, 0xd8c070, 0, 'flat'); wdBox(s * 0.3, 0.05, k, 0.18, 0.02, 2.4, 0xd8c070, 0, 'flat'); }
  }
  wdPrism(0, 0, 0, 46, 46, 0.12, 32, PAVE, 0, 'flat');
  for (let k = 0, r = 38; r > 10; r -= 8, k++) { wdPrism(0, 0, 0, r + 0.6, r + 0.6, 0.14 + k * 0.04, 32, PAVE2, 0, 'flat'); wdPrism(0, 0, 0, r, r, 0.16 + k * 0.04, 32, PAVE, 0, 'flat'); }
  // fountain + statue of the Arbiter
  wdPrism(0, 0, 0, 9, 9, 0.9, 16, 0xbfb5a2, 0, 'lit', 0xd8d0c0);
  wdColCyl(0, 0, 9.1, 0, 0.9);
  const wtr = new THREE.Mesh(new THREE.CircleGeometry(8.2, 24).rotateX(-Math.PI / 2), WD_MAT.water.clone());
  wtr.material.color.set(0x3a8aa0); wtr.position.y = 0.93; wtr.userData.ownMat = true; zoneRoot.add(wtr);
  wdPrism(0, 0, 0, 2.6, 2.2, 3.2, 8, 0xd8d0c0, 0, 'lit', 0xe8e0d0);
  wdColCyl(0, 0, 2.8, 0, 12);
  // the figure: robed, arms raised, holding a teal orb
  wdPrism(0, 3.2, 0, 1.3, 0.7, 3.8, 8, 0xb8c0c4);
  wdPrism(0, 7.0, 0, 0.75, 0.55, 1.2, 8, 0xc4ccd0);
  wdPrism(0, 8.2, 0, 0.42, 0.38, 0.7, 8, 0xc4ccd0);
  wdBeam([0.6, 7.6, 0], [1.6, 9.4, 0.2], 0.32, 0xb8c0c4); wdBeam([-0.6, 7.6, 0], [-1.6, 9.4, 0.2], 0.32, 0xb8c0c4);
  wdPrism(0, 9.4, 0.2, 0.55, 0.55, 1.1, 8, CT.teal, 0, 'glow');
  wdLight(0, 9, 0, CT.teal, 1.4, 22);
  // jets
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; wdPrism(Math.cos(a) * 5.4, 0.7, Math.sin(a) * 5.4, 0.18, 0.03, 1.8, 4, 0xbfe8f0, 0, 'glow'); }

  // ----- walls, towers, gates -----
  const WALL = CT.sand, WALLT = CT.white, WH = 13;
  const wallSeg = (x0, z0, x1, z1) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = Math.hypot(x1 - x0, z1 - z0), yaw = x0 === x1 ? Math.PI / 2 : 0;
    wdSolid(cx, -1, cz, L, WH + 1, 5, WALL, yaw, WALLT);
    wdBox(cx, WH, cz, L, 0.8, 5.6, WALLT, yaw);
    for (const s of [-1, 1]) {
      const ox = yaw ? s * 2.86 : 0, oz = yaw ? 0 : s * 2.86;
      wdBox(cx + ox, WH - 2.2, cz + oz, yaw ? 0.06 : L, 0.25, yaw ? L : 0.06, CT.teal, 0, 'glow');
      const n = Math.floor(L / 9);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n - 0.5, px = yaw ? cx + ox * 1.01 : cx + t * L, pz = yaw ? cz + t * L : cz + oz * 1.01;
        wdBox(px, 0, pz, yaw ? 0.6 : 1.2, WH - 1, yaw ? 1.2 : 0.6, CT.sand2, 0);
      }
    }
  };
  const G = 11;  // gate half width
  wallSeg(-CT_HW, -CT_HW, -G, -CT_HW); wallSeg(G, -CT_HW, CT_HW, -CT_HW);   // north (gate)
  wallSeg(-CT_HW, CT_HW, CT_HW, CT_HW);                                       // south
  wallSeg(-CT_HW, -CT_HW, -CT_HW, CT_HW);                                     // west
  wallSeg(CT_HW, -CT_HW, CT_HW, -G); wallSeg(CT_HW, G, CT_HW, CT_HW);        // east (gate)
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = x * CT_HW, pz = z * CT_HW;
    wdSolid(px, -1, pz, 14, 24, 14, WALL, 0, WALLT);
    wdBox(px, 23, pz, 15.5, 1.2, 15.5, WALLT);
    wdBox(px, 18, pz, 14.1, 0.4, 14.1, CT.amber, 0, 'glow');
    wdPrism(px, 24.2, pz, 2.5, 0.6, 6, 6, CT.greyD);
    wdBox(px, 30, pz, 0.6, 0.6, 0.6, 0xff5040, 0, 'glow');
  }
  const gate = (x, z, yaw) => {
    const f = ctFrame(x, z, yaw);
    for (const s of [-1, 1]) {
      const [tx, tz] = f(s * (G + 4), 0);
      wdSolid(tx, -1, tz, 8, 22, 9, WALL, yaw, WALLT);
      wdBox(tx, 21, tz, 9, 1, 10, WALLT, yaw);
      const [lx, lz] = f(s * (G + 0.2), 4.6);
      wdBox(lx, 0, lz, 0.3, 14, 0.3, CT.teal, yaw, 'glow');
      const [lx2, lz2] = f(s * (G + 0.2), -4.6);
      wdBox(lx2, 0, lz2, 0.3, 14, 0.3, CT.teal, yaw, 'glow');
      const lp = f(s * (G - 2), 6); wdLight(lp[0], 6, lp[1], CT.amber, 1.2, 20);
    }
    wdBox(x, 15, z, 2 * G + 2, 5, 9, WALL, yaw, WALLT);
    for (const s of [-1, 1]) { const [bx, bz] = f(0, s * 4.55); wdBox(bx, 16.5, bz, 2 * G - 2, 1.4, 0.1, CT.amber, yaw, 'glow'); }
    wdBox(x, 14.6, z, 2 * G + 2, 0.4, 9.2, CT.greyD, yaw);
  };
  gate(CT_HW, 0, Math.PI / 2); gate(0, -CT_HW, 0);

  // ----- Clone Bay (NW, faces the plaza) -----
  {
    const yaw = Math.PI / 4, cx = -58, cz = -58, f = ctFrame(cx, cz, yaw);
    wdSolid(cx, 0, cz, 24, 10, 16, CT.white, yaw, CT.white2);
    wdPrism(cx, 10, cz, 8, 3, 5, 12, CT.white2, 0, 'lit', CT.teal);
    wdPrism(cx, 15, cz, 3, 3, 0.6, 12, CT.teal, 0, 'glow');
    ctWindows(f, 0, 24, 10, 16, yaw, { glow: 0.5, litCol: 0xa8f0ff, col: 0x3a6070, skip: (i, j) => j === 0 && i > 2 && i < 4 });
    const [px, pz] = f(0, 10.5);
    wdBox(px, 6, pz, 16, 0.6, 6, CT.white2, yaw);
    wdBox(px, 5.7, pz, 16.2, 0.3, 6.2, CT.teal, yaw, 'glow');
    for (const s of [-1, 1]) { const [qx, qz] = f(s * 7.3, 12.8); wdSolid(qx, 0, qz, 0.8, 6, 0.8, CT.white2, yaw); }
    const [sx, sz] = f(0, 8.06);
    wdBox(sx, 7.6, sz, 1.4, 1.4, 0.1, CT.teal, yaw, 'glow'); wdBox(sx, 7.6 + 0.45, sz, 4, 0.5, 0.1, CT.teal, yaw, 'glow');
    ctDoor(f, 0, 16, yaw, { w: 4, h: 3.4, glow: CT.teal, step: false });
  }
  // ----- shop row (north side of Concord Avenue, east) -----
  const SHOP = [
    { role: 'weapons', glow: CT.amber, col: 0xc8a882 }, { role: 'armor', glow: CT.teal, col: CT.white2 },
    { role: 'nanos', glow: 0xc080ff, col: 0xd8ccb8 }, { role: 'implants', glow: 0x7dff9a, col: CT.white },
    { role: 'general', glow: 0xffd27a, col: CT.sand },
  ];
  SHOP.forEach((S, i) => {
    const cx = 52 + i * 26, cz = -30;
    const f = ctFrame(cx, cz, 0);
    wdSolid(cx, 0, cz, 22, 9 + (i % 2) * 3, 14, S.col, 0, CT.white);
    ctWindows(f, 3.6, 22, 5 + (i % 2) * 3, 14, 0, { glow: 0.3 });
    // awning + sign + counter-backdrop
    wdBox(cx, 4.2, -18.5, 20, 0.25, 7, CT.greyD, 0);
    wdBox(cx, 4.0, -15.05, 20, 0.2, 0.1, S.glow, 0, 'glow');
    for (const s of [-1, 1]) wdSolid(cx + s * 9.6, 0, -15.6, 0.35, 4.2, 0.35, CT.greyD, 0);
    wdBox(cx, 6.0, -22.9, 12, 1.6, 0.25, CT.dark, 0);
    wdBox(cx, 6.2, -22.7, 11, 1.2, 0.1, S.glow, 0, 'glow');
    wdBox(cx - 6, 0, -22.4, 6, 2.2, 1.2, CT.wood, 0, 'lit', CT.sandD);
    wdBox(cx + 6, 0, -22.4, 6, 2.2, 1.2, CT.wood, 0, 'lit', CT.sandD);
    wdLight(cx, 3.6, -18.5, S.glow, 0.8, 12);
  });
  // ----- bank (south side, east) -----
  {
    const cx = 62, cz = 34, yaw = Math.PI, f = ctFrame(cx, cz, yaw);
    wdSolid(cx, 0, cz, 34, 12, 20, 0xe6dccb, yaw, CT.white);
    wdBox(cx, 12, cz, 36, 1.2, 22, 0xc9b996, yaw);
    for (let k = 0; k < 6; k++) { const [px, pz] = f(-14 + k * 5.6, 12); wdSolid(px, 0, pz, 1.2, 9, 1.2, CT.white, yaw); }
    const [ex, ez] = f(0, 12); wdBox(ex, 9, ez, 32, 1.4, 5, CT.white2, yaw);
    const [gx, gz] = f(0, 14.56); wdBox(gx, 9.4, gz, 10, 0.6, 0.1, 0xffe08a, yaw, 'glow');
    ctDoor(f, 0, 20, yaw, { w: 4, h: 4, glow: 0xffe08a, step: false });
    ctWindows(f, 0, 34, 12, 20, yaw, { glow: 0.2, ww: 1.2, wh: 2.6, floor: 5, skip: (i) => i > 3 && i < 6 });
  }
  // ----- the Rusty Lumen (south side, further east) -----
  {
    const cx = 124, cz = 44, yaw = Math.PI, f = ctFrame(cx, cz, yaw);
    wdSolid(cx, 0, cz, 36, 8, 22, CT.rust, yaw, CT.rust2);
    wdBox(cx, 8, cz, 30, 3, 16, 0x7a4a30, yaw, 'lit', CT.roof);
    ctWindows(f, 0, 36, 8, 22, yaw, { glow: 0.7, litCol: 0xffa050, col: 0x3a2a20, wh: 1.2 });
    // terrace canopy, bar counter, stools, tables
    wdBox(cx, 4.5, 25, 34, 0.3, 16, 0x5a3a28, yaw);
    wdBox(cx, 4.3, 17.1, 34, 0.2, 0.12, CT.amber, yaw, 'glow');
    for (const s of [-1, 1]) wdSolid(cx + s * 16.6, 0, 17.4, 0.4, 4.5, 0.4, CT.rust2, yaw);
    wdBox(cx, 0, 29.8, 18, 1.15, 1.2, 0x5a3a28, yaw, 'lit', 0x8a6a48);
    wdColBox(cx - 9, 29.2, cx + 9, 30.4, 0, 1.15).nomap = true;
    for (let k = 0; k < 6; k++) wdPrism(cx - 7.5 + k * 3, 0, 28.3, 0.25, 0.25, 0.75, 6, CT.greyD);
    for (let k = 0; k < 5; k++) wdBox(cx - 6 + k * 3, 1.5, 32.7, 1.6, 0.12, 0.5, 0x6a4a30, yaw);
    for (let k = 0; k < 4; k++) {
      const tx = cx - 12 + k * 8, tz = 21;
      wdPrism(tx, 0, tz, 1.1, 1.1, 0.95, 8, CT.wood, 0, 'lit', 0x8a6a48);
      wdColCyl(tx, tz, 1.1, 0, 1).nomap = true;
    }
    // neon sign "the Rusty Lumen": a lumen crystal glyph + bars
    wdBox(cx, 9.5, 32.95, 14, 2.4, 0.3, CT.dark, yaw);
    wdBox(cx - 4, 9.9, 32.7, 6, 0.45, 0.1, CT.amber, yaw, 'glow');
    wdBox(cx + 2.5, 9.9, 32.7, 5, 0.45, 0.1, CT.teal, yaw, 'glow');
    wdBox(cx - 1, 10.6, 32.7, 10, 0.3, 0.1, CT.amber, yaw, 'glow');
    wdPrism(cx + 6, 9.6, 32.6, 0.6, 0, 2.2, 6, CT.teal, 0, 'glow');
    wdLight(cx, 3.5, 24, CT.amber, 1.4, 20).flicker = true;
  }
  // ----- port: hopper pad, shuttle pad, control tower -----
  {
    const hy = ctPad(-38, 164, 16, 0, 0x8fc8ff);
    ctHopperCraft(-38, hy + 7, 164, 0.3);
    const sy = ctPad(44, 164, 16, 0, CT.amber);
    ctShuttle(44, 166, Math.PI * 0.85, sy);
    wdSolid(0, 0, 196, 10, 26, 10, CT.white, 0, CT.white2);
    wdBox(0, 26, 196, 16, 5, 16, 0x3a5a70, 0.4, 'lit', CT.white);
    wdBox(0, 27, 196, 16.2, 2.4, 16.2, 0x8fc8ff, 0.4, 'glow');
    wdBox(0, 31, 196, 0.3, 8, 0.3, CT.greyD); wdBox(0, 39, 196, 0.6, 0.6, 0.6, 0xff5040, 0, 'glow');
    for (const x of [-60, -16, 22, 66]) ctLamp(x, 140, 7, 0x8fc8ff, true);
  }
  // ----- Meridian embassy (west end of Concord Avenue) -----
  {
    const cx = -176, cz = 0, yaw = Math.PI / 2, f = ctFrame(cx, cz, yaw);
    wdSolid(cx, 0, cz, 40, 8, 28, CT.white, yaw, CT.white2);
    wdSolid(cx - 4, 8, cz, 22, 54, 18, 0x9ab8d8, yaw, CT.white);
    const tw = ctFrame(cx - 4, cz, yaw);
    ctWindows(tw, 8, 22, 54, 18, yaw, { glow: 0.35, cell: 2.2, ww: 1.9, wh: 2.8, floor: 3.4, col: 0x2f5a88, litCol: 0xcfe8ff });
    ctWindows(ctFrame(cx - 4, cz, yaw + Math.PI), 8, 22, 54, 18, yaw, { glow: 0.3, cell: 2.2, ww: 1.9, wh: 2.8, floor: 3.4, col: 0x2f5a88, litCol: 0xcfe8ff });
    for (const s of [-1, 1]) { const [x, z] = tw(s * 11.05, 0); wdBox(x, 8, z, 0.2, 54, 18.2, CT.mblue, yaw, 'lit'); }
    wdBox(cx - 4, 62, cz, 24, 1.2, 20, CT.white, yaw);
    wdBox(cx - 4, 63.2, cz, 6, 10, 6, CT.white2, yaw);
    wdBox(cx - 4, 73, cz, 1, 1, 1, CT.mblue, yaw, 'glow');
    const [bx, bz] = f(0, 14.06);
    wdBox(bx, 5, bz, 12, 2, 0.1, CT.mblue, yaw, 'glow');
    ctDoor(f, 0, 28, yaw, { w: 5, h: 4, glow: CT.mblue, step: false });
    for (const s of [-1, 1]) {
      const [x, z] = f(s * 12, 22); wdBox(x, 0, z, 0.3, 10, 0.3, CT.greyD, yaw);
      wdBox(...f(s * 12 + 1.2, 22).slice(0, 1), 6, f(s * 12 + 1.2, 22)[1], 2.2, 3.6, 0.05, CT.mblue, yaw);
      wdColCyl(x, z, 0.3, 0, 10).nomap = true;
    }
  }
  // ----- Freehold lodge (south-west) -----
  {
    const cx = -118, cz = 112, yaw = Math.PI, f = ctFrame(cx, cz, yaw);
    wdSolid(cx, 0, cz, 40, 7, 22, CT.rust, yaw, CT.rust2);
    wdGable(cx, 7, cz, 42, 24, 6, 0x7a4430, yaw, 'lit', CT.rust2);
    for (let k = 0; k < 8; k++) { const [x, z] = f(-17.5 + k * 5, 11.2); wdBox(x, 0, z, 4.6, 6.5, 0.3, k % 2 ? 0x8a5a3a : 0x6a3a28, yaw); }
    const [px, pz] = f(0, 15); wdBox(px, 4.6, pz, 16, 0.3, 7, 0x5a3a28, yaw);
    for (const s of [-1, 1]) { const [x, z] = f(s * 7.5, 18); wdSolid(x, 0, z, 0.6, 4.6, 0.6, 0x4a3020, yaw); }
    ctDoor(f, 0, 22, yaw, { w: 3.5, h: 3.4, glow: 0xff7a40, step: false });
    const [sx, sz] = f(0, 11.6); wdBox(sx, 5.2, sz, 9, 1.4, 0.2, 0xd8603a, yaw, 'glow');
    ctFire(cx - 10, 90, 0xff8a3a);
    wdTank(cx + 26, cz + 4);
  }
  function wdTank(x, z) { ctTank(x, z, 4, 9, 0x8a5a3a, 0); }

  // ----- skybridges -----
  const bridge = (ax, az, bx, bz, y) => {
    const yaw = Math.atan2(bz - az, bx - ax) * -1, L = Math.hypot(bx - ax, bz - az);
    for (const [x, z] of [[ax, az], [bx, bz]]) { wdSolid(x, 0, z, 7, y + 6, 7, CT.white2, yaw, CT.white); wdBox(x, y + 6, z, 7.6, 0.5, 7.6, CT.teal, yaw, 'glow'); }
    wdBox((ax + bx) / 2, y, (az + bz) / 2, L - 7, 3.2, 4, 0x6f9fc0, yaw, 'lit', CT.white);
    wdBox((ax + bx) / 2, y - 0.4, (az + bz) / 2, L - 7, 0.4, 4.4, CT.white, yaw);
    wdBox((ax + bx) / 2, y + 3.2, (az + bz) / 2, L - 7, 0.15, 4.2, CT.teal, yaw, 'glow');
  };
  bridge(-30, -112, 30, -112, 15);
  bridge(-104, -30, -104, 30, 13);

  // ----- filler blocks -----
  const RES = [[-18, -CT_HW, 18, CT_HW], [-CT_HW, -18, CT_HW, 18], [-52, -52, 52, 52], [-84, -84, -28, -28], [36, -42, 178, -14], [38, 14, 84, 52],
    [96, 16, 150, 58], [-72, 120, 84, 210], [-205, -36, -146, 36], [-150, 86, -84, 132], [-38, -120, -22, -104], [22, -120, 38, -104], [-112, -38, -96, -22], [-112, 22, -96, 38],
    [150, -46, 205, -14]];
  const free = (x0, z0, x1, z1) => !RES.some((r) => x0 < r[2] && x1 > r[0] && z0 < r[3] && z1 > r[1]);
  const doors = def.doors.slice();
  for (let gz = -200; gz < 200; gz += 34) for (let gx = -200; gx < 200; gx += 34) {
    const lx0 = gx + 3, lz0 = gz + 3, lx1 = gx + 31, lz1 = gz + 31;
    if (!free(lx0, lz0, lx1, lz1)) continue;
    const rec = doors.find((q) => Math.abs(q.bx - gx - 17) < 1 && Math.abs(q.bz - gz - 17) < 1);
    if (rec) { ctCityBlock(rec.bx, rec.bz, 22, rec.bd, rng.r(10, 22), rec.by, rng, true); continue; }
    if (rng.chance(0.12)) {   // little square with palms and a stall
      const cx = gx + 17, cz = gz + 17;
      wdBox(cx, 0, cz, 26, 0.1, 26, PAVE, 0, 'flat');
      ctStall(cx - 5, cz, rng);
      wdScatter('palm', [{ x: cx + 6, z: cz - 6, s: 1.1 }, { x: cx + 7, z: cz + 6, s: 1 }, { x: cx - 8, z: cz + 8, s: 1.2 }]);
      continue;
    }
    const w = rng.r(18, 27), d = rng.r(18, 27), cx = gx + 17 + rng.r(-1.5, 1.5), cz = gz + 17 + rng.r(-1.5, 1.5);
    // face the nearest avenue
    const yaw = Math.abs(cx) < Math.abs(cz) ? (cx > 0 ? -Math.PI / 2 : Math.PI / 2) : (cz > 0 ? Math.PI : 0);
    ctCityBlock(cx, cz, w, d, rng.r(9, 26), yaw, rng, false);
  }
  // street lamps
  for (let k = -195; k <= 195; k += 26) {
    if (Math.abs(k) < 50) continue;
    for (const s of [-1, 1]) {
      const c = (k / 26) % 2 ? CT.teal : CT.amber;
      ctLamp(k, s * 16.5, 6, c, Math.abs(k) % 52 === 0 && s > 0);
      ctLamp(s * 16.5, k, 6, c, Math.abs(k) % 52 === 0 && s < 0);
    }
  }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + TAU / 16; ctLamp(Math.cos(a) * 44, Math.sin(a) * 44, 6, i % 2 ? CT.teal : CT.amber, i % 2 === 0); }
  // market stalls around the plaza
  for (const a of [0.45, 1.1, 2.05, 2.7, 3.6, 4.25, 5.15, 5.8]) {
    const x = Math.cos(a) * 36, z = Math.sin(a) * 36;
    if (z > 20 && Math.abs(x) < 14) continue;
    ctStall(x, z, rng, wdYaw(-x, -z));
  }
  // outside the walls: road out of each gate, a few wrecks and rocks
  const rocks = wdSpread(rng, 500, { x0: -300, z0: -300, x1: 300, z1: 300 }, (x, z, r) => (Math.max(Math.abs(x), Math.abs(z)) > CT_HW + 14 ? { x, z, s: r.r(0.6, 2.4), tint: 0xb89a74 } : null), 8);
  wdScatter('rock', rocks);
  wdScatter('shrub', wdSpread(rng, 400, { x0: -300, z0: -300, x1: 300, z1: 300 }, (x, z, r) => (Math.max(Math.abs(x), Math.abs(z)) > CT_HW + 10 ? { x, z, s: r.r(0.8, 1.6), tint: 0x9a9a62 } : null), 4));
  wdScatter('palm', [[-30, -30], [30, -30], [-30, 30], [30, 30]].map(([x, z]) => ({ x: x * 1.45, z: z * 1.45, s: 1.3, col: 0 })));
  wdMotes({ color: 0xf0d8a8, n: 300, size: 0.18, r: 50, h: 18, opacity: 0.45 });
}
// Market stall: counter, posts and a striped awning.
function ctStall(x, z, rng, yaw = 0) {
  const f = ctFrame(x, z, yaw), C = rng.pick([0xc0503a, 0x3a8a8a, 0xd8a040, 0x5a7ac0, 0x8a5aa0]);
  wdBox(x, 0, z, 4.4, 1.0, 1.6, CT.wood, yaw, 'lit', CT.sandD);
  for (const [a, b] of [[-2, -0.8], [2, -0.8], [-2, 1.4], [2, 1.4]]) { const [px, pz] = f(a, b); wdBox(px, 0, pz, 0.15, 2.8, 0.15, CT.greyD, yaw); }
  for (let i = 0; i < 4; i++) { const [px, pz] = f(-1.65 + i * 1.1, 0.3); wdBox(px, 2.8, pz, 1.1, 0.15, 3.2, i % 2 ? C : CT.white, yaw, 'flat'); }
  for (let i = 0; i < 3; i++) { const [px, pz] = f(-1.4 + i * 1.4, -0.1); wdBox(px, 1.0, pz, 0.7, 0.35, 0.6, rng.pick([0x8a6a3a, 0x6a8a4a, 0xa04a3a, 0x4a6a8a]), yaw + i); }
  wdColObb(x, z, 4.4, 1.6, yaw, 0, 1.2);
}
// A city block building: sandstone or white composite, stepped, with roof clutter and neon.
function ctCityBlock(cx, cz, w, d, h, yaw, rng, door) {
  const sand = rng.chance(0.55);
  const col = sand ? rng.pick([CT.sand, 0xd2b48a, 0xc8a47a, 0xdcc8a4]) : rng.pick([CT.white, 0xdedbd2, 0xc9ccc8]);
  const trim = sand ? CT.white : 0x9aa0a4;
  const f = ctFrame(cx, cz, yaw);
  wdSolid(cx, 0, cz, w, h, d, col, yaw, trim);
  wdBox(cx, h, cz, w + 0.4, 0.6, d + 0.4, trim, yaw);
  ctWindows(f, 0, w, h, d, yaw, { glow: 0.15, col: sand ? 0x34444e : 0x2c4a5e, skip: (i, j) => j === 0 && Math.abs(i - (Math.max(1, Math.floor((w - 1.5) / 3.2)) - 1) / 2) < 1 });
  for (const side of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const g = ctFrame(cx, cz, yaw + side), sw = Math.abs(side) === Math.PI / 2 ? d : w, sd = Math.abs(side) === Math.PI / 2 ? w : d;
    ctWindows(g, 0, sw, h, sd, yaw + side, { glow: 0.1, col: sand ? 0x34444e : 0x2c4a5e });
  }
  // stepped upper storey
  if (h > 16 && rng.chance(0.6)) {
    const h2 = rng.r(5, 10), [ux, uz] = f(rng.r(-2, 2), -d * 0.12);
    wdBox(ux, h + 0.6, uz, w * 0.6, h2, d * 0.6, col, yaw, 'lit', trim);
    ctWindows(ctFrame(ux, uz, yaw), h + 0.6, w * 0.6, h2, d * 0.6, yaw, { glow: 0.2 });
  }
  // neon band and sign
  const neon = rng.chance(0.5) ? CT.teal : CT.amber;
  if (rng.chance(0.7)) { const [nx, nz] = f(0, d / 2 + 0.08); wdBox(nx, 3.9, nz, w * 0.94, 0.18, 0.06, neon, yaw, 'glow'); }
  if (rng.chance(0.4)) { const [sx, sz] = f(w / 2 - 1, d / 2 + 0.7); wdBox(sx, 5, sz, 0.2, 3.5, 1.1, neon, yaw, 'glow'); }
  // roof clutter
  for (let i = 0; i < 3; i++) {
    const [rx, rz] = f(rng.r(-w / 3, w / 3), rng.r(-d / 3, d / 3));
    if (rng.chance(0.5)) wdBox(rx, h + 0.6, rz, rng.r(1.5, 3), rng.r(1, 2), rng.r(1.5, 3), CT.steel, yaw);
    else wdPrism(rx, h + 0.6, rz, 1.2, 1.2, 2.4, 8, CT.white2);
  }
  if (rng.chance(0.3)) { const [ax, az] = f(w / 3, d / 3); wdBox(ax, h + 0.6, az, 0.15, 7, 0.15, CT.greyD, yaw); wdBox(ax, h + 7.6, az, 0.35, 0.35, 0.35, 0xff5040, 0, 'glow'); }
  // canopy over the door
  const [cx2, cz2] = f(0, d / 2 + 1.3);
  wdBox(cx2, 3.2, cz2, 5, 0.22, 2.6, trim, yaw);
  ctDoor(f, 0, d, yaw, { w: 2.2, h: 2.8, glow: door ? CT.amber : neon, step: false });
}

// Halden Crossing definition. Mission buildings are city blocks whose door faces a street.
const CT_HALDEN_DOORS = [
  ctDoorRec('halden_md1', 89, -115, -Math.PI / 2, 22), ctDoorRec('halden_md2', -149, -149, 0, 22), ctDoorRec('halden_md3', 157, 89, Math.PI, 22),
  ctDoorRec('halden_md4', -183, 157, Math.PI / 2, 22), ctDoorRec('halden_md5', 123, -183, 0, 22), ctDoorRec('halden_md6', -81, -149, 0, 22),
];
registerZone({
  id: 'halden', name: 'Halden Crossing', kind: 'city', lvl: [1, 50], size: 640, safe: true, music: 'city', entry: 'halden_shuttle_arrive',
  atmos: { fog: 0xe2c494, near: 140, far: 720, horizon: 0xf2cc94, zenith: 0x5f7aa8, sunColor: 0xffdcaa, sunInt: 1.12, hemiSky: 0xd8d4c8, hemiGround: 0x8a6a48, hemiInt: 0.72, sunDir: [0.55, 0.5, 0.42], clouds: 0.6 },
  bounds: { x0: -300, z0: -300, x1: 300, z1: 300 },
  roads: [{ pts: [[CT_HW, 0], [290, 0]], w: 16 }, { pts: [[0, -CT_HW], [0, -290]], w: 16 }],
  doors: CT_HALDEN_DOORS,
  areas: [
    { name: 'Plaza of Accord', x: 0, z: 0, r: 50, label: true }, { name: 'Merchant Row', x: 110, z: -26, r: 60, label: true },
    { name: 'Halden Port', x: 0, z: 165, r: 70, label: true }, { name: 'Meridian Embassy', x: -176, z: 0, r: 40, label: true },
    { name: 'Freehold Lodge', x: -118, z: 112, r: 35, label: true }, { name: 'The Rusty Lumen', x: 124, z: 40, r: 30, label: true },
    { name: 'Clone Bay', x: -58, z: -58, r: 25, label: true }, { name: 'East Gate', x: CT_HW, z: 0, r: 30 }, { name: 'North Gate', x: 0, z: -CT_HW, r: 30 },
  ],
  spawns: [
    { x: 196, z: 0, r: 4, mobs: ['guard'], n: 2, lvl: [60, 60], respawn: 60 },
    { x: 0, z: -196, r: 4, mobs: ['guard'], n: 2, lvl: [60, 60], respawn: 60 },
    { x: 26, z: 26, r: 6, mobs: ['guard'], n: 2, lvl: [60, 60], respawn: 60 },
    { x: 0, z: 128, r: 6, mobs: ['guard'], n: 1, lvl: [60, 60], respawn: 60 },
  ],
  pois: [
    { id: 'halden_arrive_e', type: 'arrive', x: 196, z: 6, yaw: -Math.PI / 2, name: 'East Gate' },
    { id: 'halden_arrive_n', type: 'arrive', x: 6, z: -196, yaw: 0, name: 'North Gate' },
    { id: 'halden_clonebay', type: 'clonebay', x: -47.4, z: -47.4, yaw: Math.PI / 4, name: 'Halden Clone Bay' },
    { id: 'halden_clone_tech', type: 'npc', x: -42, z: -50.5, yaw: Math.PI / 4, name: 'Clone Technician Mira Sato', role: 'flavour' },
    { id: 'halden_terminal_1', type: 'terminal', x: -9, z: 31, yaw: Math.PI, name: 'Mission Terminal' },
    { id: 'halden_terminal_2', type: 'terminal', x: 0, z: 33, yaw: Math.PI, name: 'Mission Terminal' },
    { id: 'halden_terminal_3', type: 'terminal', x: 9, z: 31, yaw: Math.PI, name: 'Mission Terminal' },
    { id: 'halden_vendor_weapons', type: 'vendor', role: 'weapons', x: 52, z: -18.6, yaw: 0, name: 'Gunsmith Tarek Moll' },
    { id: 'halden_vendor_armor', type: 'vendor', role: 'armor', x: 78, z: -18.6, yaw: 0, name: 'Outfitter Sabine Roe' },
    { id: 'halden_vendor_nanos', type: 'vendor', role: 'nanos', x: 104, z: -18.6, yaw: 0, name: 'Nanovendor Quill Arden' },
    { id: 'halden_vendor_implants', type: 'vendor', role: 'implants', x: 130, z: -18.6, yaw: 0, name: 'Implant Surgeon Dr. Hesk' },
    { id: 'halden_vendor_general', type: 'vendor', role: 'general', x: 156, z: -18.6, yaw: 0, name: 'Trader Nim Basset' },
    { id: 'halden_bank', type: 'bank', x: 62, z: 19.5, yaw: Math.PI, name: 'Concord Savings & Vault' },
    { id: 'halden_hopper', type: 'hopper', x: -38, z: 142, yaw: Math.PI, name: 'Hopper Controller Pell Ostrava',
      data: { destinations: [{ zone: 'broken_mesa', poi: 'mesa_hopper_arrive', name: 'Mesa Outpost', cost: 120 }, { zone: 'lumen_scar', poi: 'scar_hopper_arrive', name: 'Scar Outpost', cost: 240 }] } },
    { id: 'halden_hopper_arrive', type: 'arrive', x: -24, z: 136, yaw: Math.PI, name: 'Hopper Pad' },
    { id: 'halden_shuttle', type: 'shuttle', x: 44, z: 142, yaw: Math.PI, name: 'Shuttle Pilot Ren Okafor',
      data: { destinations: [{ zone: 'landfall', poi: 'landfall_shuttle_arrive', name: 'Landfall Isle', cost: 0 }] } },
    { id: 'halden_shuttle_arrive', type: 'arrive', x: 30, z: 134, yaw: Math.PI, name: 'Shuttle Pad' },
    { id: 'halden_meridian', type: 'npc', role: 'faction', data: { faction: 'meridian' }, x: -150, z: 4, yaw: Math.PI / 2, name: 'Liaison Dorian Kade' },
    { id: 'halden_freehold', type: 'npc', role: 'faction', data: { faction: 'freehold' }, x: -112, z: 92, yaw: Math.PI, name: 'Speaker Jonah Rusk' },
    { id: 'halden_barkeep', type: 'npc', role: 'flavour', x: 124, z: 31.6, yaw: Math.PI, name: 'Barkeep Mags Tolliver' },
    { id: 'halden_prospector', type: 'npc', role: 'flavour', x: 106, z: 20, yaw: 2.6, name: 'Prospector Gil Marrow' },
    { id: 'halden_arbiter', type: 'npc', role: 'flavour', x: 12, z: -14, yaw: -0.8, name: 'Arbiter Celes Varga' },
    { id: 'halden_courier', type: 'npc', role: 'flavour', x: 6, z: 150, yaw: 0.4, name: 'Courier Fen Halloran' },
  ],
  exits: [
    { x: 282, z: 0, r: 14, to: 'dustbowl', poi: 'dustbowl_arrive_halden_e', label: 'Dustbowl Flats' },
    { x: 0, z: -282, r: 14, to: 'dustbowl', poi: 'dustbowl_arrive_halden_n', label: 'Dustbowl Flats' },
  ],
  build: ctHalden,
});
