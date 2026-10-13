// Ashreach — outdoor zones: prop prototypes, terrain shapes, landmarks, spawns, POIs and exits for Landfall Isle, Dustbowl Flats, Greenhollow, Broken Mesa and the Lumen Scar

// ---------- prop prototypes (unit sized; tinted per instance) ----------
const zn_c = (h) => wdC(h);
const zn_YXZ = (x, y) => [x, y, 0, 'YXZ'];
wdDefProp('rock', () => ({ geo: mergeParts([{ geo: new THREE.DodecahedronGeometry(1, 0), c: [1, 1, 1] }]), sink: 0.3, col: 0.85, h: 1.2, map: true }));
wdDefProp('slab', () => ({ geo: mergeParts([{ geo: new THREE.IcosahedronGeometry(1, 0), s: [1.4, 0.55, 1], c: [1, 1, 1] }]), sink: 0.2, col: 1.0, h: 0.6 }));
wdDefProp('hoodoo', () => ({
  geo: mergeParts([
    { geo: taperBox(1.6, 1.5, 1.1, 1.0, 2.2), p: [0, 1.1, 0], c: zn_c(0xb06a48) },
    { geo: taperBox(1.1, 1.0, 0.8, 0.8, 1.6), p: [0, 3.0, 0], c: zn_c(0xc88a60) },
    { geo: taperBox(0.8, 0.8, 0.6, 0.55, 1.4), p: [0.05, 4.5, 0], c: zn_c(0xa05a3c) },
    { geo: taperBox(1.2, 1.1, 1.4, 1.2, 0.6), p: [0.08, 5.5, 0], c: zn_c(0x8a4a32) },
  ]), sink: 0.2, col: 0.75, h: 5.8, map: true,
}));
wdDefProp('deadtree', () => ({
  geo: mergeParts([
    { geo: new THREE.CylinderGeometry(0.05, 0.11, 1.5, 5), p: [0, 0.75, 0], c: zn_c(0x8a7a66) },
    { geo: new THREE.CylinderGeometry(0.025, 0.05, 0.75, 4), p: [0.22, 1.25, 0], r: [0, 0, -0.9], c: zn_c(0x7a6a58) },
    { geo: new THREE.CylinderGeometry(0.02, 0.045, 0.65, 4), p: [-0.2, 1.35, 0.05], r: [0.2, 0, 0.95], c: zn_c(0x7a6a58) },
    { geo: new THREE.CylinderGeometry(0.015, 0.03, 0.45, 4), p: [0.05, 1.62, -0.12], r: [-0.6, 0, 0.1], c: zn_c(0x8a7a66) },
  ]), col: 0.08, h: 1.8,
}));
wdDefProp('scrubtree', () => ({
  geo: mergeParts([
    { geo: new THREE.CylinderGeometry(0.05, 0.09, 1.1, 5), p: [0.06, 0.55, 0], r: [0, 0, -0.12], c: zn_c(0x6a5a44) },
    { geo: new THREE.CylinderGeometry(0.03, 0.05, 0.5, 4), p: [-0.12, 1.0, 0], r: [0, 0, 0.7], c: zn_c(0x6a5a44) },
    { geo: new THREE.IcosahedronGeometry(0.62, 0), p: [0.12, 1.22, 0], s: [1.3, 0.38, 1.1], c: zn_c(0x6f7f3e) },
    { geo: new THREE.IcosahedronGeometry(0.45, 0), p: [-0.35, 1.12, 0.1], s: [1.2, 0.4, 1.1], c: zn_c(0x7c8a44) },
  ]), col: 0.08, h: 1.4,
}));
wdDefProp('shrub', () => ({
  geo: mergeParts([
    { geo: new THREE.IcosahedronGeometry(0.5, 0), p: [0, 0.3, 0], s: [1, 0.7, 1], c: zn_c(0x7c8040) },
    { geo: new THREE.IcosahedronGeometry(0.38, 0), p: [0.38, 0.22, 0.15], s: [1, 0.7, 1], c: zn_c(0x8a8a48) },
    { geo: new THREE.IcosahedronGeometry(0.32, 0), p: [-0.3, 0.2, -0.2], s: [1, 0.8, 1], c: zn_c(0x6e7238) },
  ]), cast: false, sink: 0.05, h: 0.7,
}));
wdDefProp('grass', () => {
  const P = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; P.push({ geo: new THREE.ConeGeometry(0.05, 0.7, 3), p: [Math.cos(a) * 0.15, 0.3, Math.sin(a) * 0.15], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35], c: zn_c(i % 2 ? 0xa8a060 : 0x8a9050) }); }
  return { geo: mergeParts(P), cast: false, h: 0.7 };
});
wdDefProp('palm', () => {
  const P = [{ geo: new THREE.CylinderGeometry(0.1, 0.17, 3, 6), p: [0.1, 1.5, 0], r: [0, 0, -0.07], c: zn_c(0x8a7458) }];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    P.push({ geo: taperBox(0.5, 0.03, 0.08, 0.02, 1.5), p: [0.2 + Math.sin(a) * 0.6, 2.95, Math.cos(a) * 0.6], r: zn_YXZ(1.15, a), c: zn_c(i % 2 ? 0x5a7a34 : 0x6a8a3a) });
  }
  return { geo: mergeParts(P), col: 0.15, h: 3.3 };
});
wdDefProp('fern', () => {
  const P = [{ geo: new THREE.CylinderGeometry(0.04, 0.08, 0.55, 6), p: [0, 0.27, 0], c: zn_c(0x4a5a2a) }];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + (i % 2) * 0.2, t1 = 0.5 + (i % 3) * 0.14, t2 = 1.5;
    const d1 = [Math.sin(a) * Math.sin(t1), Math.cos(t1), Math.cos(a) * Math.sin(t1)], L1 = 0.62;
    const m1 = [d1[0] * L1 / 2, 0.5 + d1[1] * L1 / 2, d1[2] * L1 / 2], e1 = [d1[0] * L1, 0.5 + d1[1] * L1, d1[2] * L1];
    const d2 = [Math.sin(a) * Math.sin(t2), Math.cos(t2), Math.cos(a) * Math.sin(t2)], L2 = 0.55;
    P.push({ geo: taperBox(0.07, 0.02, 0.16, 0.02, L1), p: m1, r: zn_YXZ(t1, a), c: zn_c(i % 2 ? 0x4a7a2e : 0x3f6e28) });
    P.push({ geo: taperBox(0.16, 0.02, 0.02, 0.02, L2), p: [e1[0] + d2[0] * L2 / 2, e1[1] + d2[1] * L2 / 2, e1[2] + d2[2] * L2 / 2], r: zn_YXZ(t2, a), c: zn_c(0x6a9a3a) });
  }
  return { geo: mergeParts(P), col: 0.06, h: 1.1 };
});
wdDefProp('bigtree', () => ({
  geo: mergeParts([
    { geo: new THREE.CylinderGeometry(0.13, 0.26, 1.3, 7), p: [0, 0.65, 0], c: zn_c(0x5a4a34) },
    { geo: new THREE.CylinderGeometry(0.05, 0.1, 0.6, 5), p: [0.25, 1.2, 0], r: [0, 0, -0.8], c: zn_c(0x5a4a34) },
    { geo: new THREE.IcosahedronGeometry(0.62, 0), p: [0, 1.6, 0], s: [1.1, 0.8, 1.1], c: zn_c(0x4a6a2a) },
    { geo: new THREE.IcosahedronGeometry(0.45, 0), p: [0.5, 1.4, 0.2], c: zn_c(0x557a30) },
    { geo: new THREE.IcosahedronGeometry(0.42, 0), p: [-0.45, 1.45, -0.25], c: zn_c(0x3f5f26) },
    { geo: new THREE.IcosahedronGeometry(0.36, 0), p: [0.1, 2.05, -0.15], c: zn_c(0x5f8236) },
  ]), col: 0.2, h: 2.4,
}));
wdDefProp('reed', () => {
  const P = [];
  for (let i = 0; i < 8; i++) { const a = i * 2.4; P.push({ geo: new THREE.ConeGeometry(0.03, 1.2 + (i % 3) * 0.3, 3), p: [Math.cos(a) * 0.25 * (i % 3), 0.6, Math.sin(a) * 0.25 * (i % 3)], r: [Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15], c: zn_c(i % 2 ? 0x7a8a48 : 0x8a7a48) }); }
  return { geo: mergeParts(P), cast: false, h: 1.4 };
});
wdDefProp('mushroom', () => ({
  geo: mergeParts([
    { geo: new THREE.CylinderGeometry(0.07, 0.1, 0.8, 6), p: [0, 0.4, 0], c: zn_c(0xd8d0b0) },
    { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.5, 6), p: [0.3, 0.25, 0.1], c: zn_c(0xd8d0b0) },
  ]),
  geoGlow: mergeParts([
    { geo: new THREE.ConeGeometry(0.42, 0.3, 7), p: [0, 0.92, 0], c: zn_c(0xd8e070) },
    { geo: new THREE.ConeGeometry(0.26, 0.2, 6), p: [0.3, 0.56, 0.1], c: zn_c(0xb8e080) },
  ]), cast: true, col: 0.1, h: 1.1,
}));
wdDefProp('sporepod', () => ({
  geo: mergeParts([
    { geo: new THREE.ConeGeometry(0.35, 0.5, 5), p: [0, 0.25, 0], c: zn_c(0x5a6a2a) },
    { geo: new THREE.CylinderGeometry(0.03, 0.05, 0.9, 4), p: [0.1, 0.6, 0], r: [0, 0, -0.2], c: zn_c(0x6a7a30) },
    { geo: new THREE.CylinderGeometry(0.03, 0.05, 0.7, 4), p: [-0.12, 0.5, 0.05], r: [0.1, 0, 0.3], c: zn_c(0x6a7a30) },
  ]),
  geoGlow: mergeParts([
    { geo: new THREE.IcosahedronGeometry(0.17, 0), p: [0.2, 1.08, 0], c: zn_c(0xe8f080) },
    { geo: new THREE.IcosahedronGeometry(0.14, 0), p: [-0.24, 0.85, 0.08], c: zn_c(0xc8f070) },
    { geo: new THREE.IcosahedronGeometry(0.1, 0), p: [0.05, 0.62, 0.2], c: zn_c(0xf0f0a0) },
  ]), cast: false, h: 1.2,
}));
// Lumen growth: rock with a cluster of glowing hexagonal crystals.
function zn_crystals(n, len, spread, seed) {
  const P = [], r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, t = 0.15 + r() * 0.45, L = len * (0.5 + r() * 0.6), w = 0.06 + r() * 0.05;
    const dx = Math.sin(a) * Math.sin(t), dy = Math.cos(t), dz = Math.cos(a) * Math.sin(t), ox = Math.sin(a) * spread * r(), oz = Math.cos(a) * spread * r();
    P.push({ geo: new THREE.CylinderGeometry(w, w * 1.1, L, 6), p: [ox + dx * L / 2, dy * L / 2, oz + dz * L / 2], r: zn_YXZ(t, a), c: [0.35, 0.35, 0.35] });
    P.push({ geo: new THREE.ConeGeometry(w, L * 0.3, 6), p: [ox + dx * L * 1.15, dy * L * 1.15, oz + dz * L * 1.15], r: zn_YXZ(t, a), c: [1, 1, 1] });
  }
  return mergeParts(P);
}
wdDefProp('lumen', () => ({
  geo: mergeParts([{ geo: new THREE.DodecahedronGeometry(0.35, 0), p: [0, 0.05, 0], s: [1.3, 0.6, 1], c: zn_c(0x55505a) }]),
  geoGlow: zn_crystals(6, 0.9, 0.25, 7), cast: false, h: 1.1,
}));
wdDefProp('spire', () => ({
  geo: mergeParts([
    { geo: new THREE.DodecahedronGeometry(0.7, 0), p: [0, 0.1, 0], s: [1.3, 0.6, 1.2], c: zn_c(0x3a3444) },
    { geo: new THREE.DodecahedronGeometry(0.4, 0), p: [0.7, 0.05, 0.3], c: zn_c(0x2e2a38) },
  ]),
  geoGlow: mergeParts([
    { geo: new THREE.CylinderGeometry(0.22, 0.34, 3.2, 6), p: [0, 1.6, 0], c: [0.42, 0.42, 0.48] },
    { geo: new THREE.ConeGeometry(0.22, 1.1, 6), p: [0, 3.75, 0], c: [1, 1, 1] },
    { geo: new THREE.CylinderGeometry(0.12, 0.16, 1.5, 6), p: [0.35, 0.7, 0.1], r: [0, 0, -0.35], c: [0.5, 0.5, 0.55] },
    { geo: new THREE.ConeGeometry(0.12, 0.5, 6), p: [0.63, 1.55, 0.1], r: [0, 0, -0.35], c: [1, 1, 1] },
    { geo: new THREE.CylinderGeometry(0.1, 0.14, 1.1, 6), p: [-0.3, 0.5, -0.15], r: [0.3, 0, 0.35], c: [0.5, 0.5, 0.55] },
  ]), col: 0.4, h: 4.3, map: true,
}));
wdDefProp('lcactus', () => ({
  geo: mergeParts([
    { geo: new THREE.CylinderGeometry(0.14, 0.17, 1.4, 6), p: [0, 0.7, 0], c: zn_c(0x4a6a6a) },
    { geo: new THREE.CylinderGeometry(0.09, 0.09, 0.4, 6), p: [0.22, 0.75, 0], r: [0, 0, Math.PI / 2], c: zn_c(0x4a6a6a) },
    { geo: new THREE.CylinderGeometry(0.09, 0.1, 0.55, 6), p: [0.4, 1.0, 0], c: zn_c(0x557575) },
    { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6), p: [-0.18, 0.55, 0], r: [0, 0, Math.PI / 2], c: zn_c(0x4a6a6a) },
    { geo: new THREE.CylinderGeometry(0.08, 0.09, 0.42, 6), p: [-0.32, 0.78, 0], c: zn_c(0x557575) },
  ]),
  geoGlow: mergeParts([
    { geo: new THREE.ConeGeometry(0.13, 0.32, 6), p: [0, 1.56, 0], c: [1, 1, 1] },
    { geo: new THREE.ConeGeometry(0.09, 0.25, 6), p: [0.4, 1.4, 0], c: [1, 1, 1] },
    { geo: new THREE.ConeGeometry(0.08, 0.22, 6), p: [-0.32, 1.1, 0], c: [1, 1, 1] },
  ]), col: 0.18, h: 1.7,
}));
wdDefProp('ribs', () => {
  const P = [{ geo: new THREE.CylinderGeometry(0.06, 0.08, 3.2, 5), p: [0, 0.25, 0], r: [Math.PI / 2, 0, 0], c: zn_c(0xd8d0bc) }];
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
    const z = -1.3 + i * 0.5, L = 1.4 - Math.abs(i - 2.5) * 0.15;
    P.push({ geo: new THREE.CylinderGeometry(0.035, 0.05, L, 4), p: [s * 0.35, 0.25 + L * 0.35, z], r: [0, 0, -s * 0.5], c: zn_c(0xe0d8c4) });
    P.push({ geo: new THREE.CylinderGeometry(0.03, 0.035, L * 0.7, 4), p: [s * 0.62, 0.25 + L * 0.85, z], r: [0, 0, s * 0.35], c: zn_c(0xd0c8b4) });
  }
  P.push({ geo: new THREE.DodecahedronGeometry(0.3, 0), p: [0, 0.3, 1.9], s: [1, 0.7, 1.5], c: zn_c(0xd8d0bc) });
  return { geo: mergeParts(P), col: 0.5, h: 1.6 };
});
wdDefProp('scrap', () => ({
  geo: mergeParts([
    { geo: new THREE.BoxGeometry(1.2, 0.5, 0.8), p: [0, 0.2, 0], r: [0.1, 0.3, 0.2], c: zn_c(0x7a4a30) },
    { geo: new THREE.BoxGeometry(0.8, 0.3, 1.1), p: [0.6, 0.15, 0.4], r: [0.2, -0.4, 0], c: zn_c(0x6a6a64) },
    { geo: new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), p: [-0.4, 0.15, 0.5], r: [0, 0.7, Math.PI / 2], c: zn_c(0x8a8a84) },
    { geo: new THREE.BoxGeometry(0.5, 0.6, 0.5), p: [-0.5, 0.3, -0.4], r: [0, 0.5, 0.15], c: zn_c(0x5a3a28) },
  ]), col: 0.7, h: 0.7,
}));

// ---------- helpers ----------
const zn_poi = (id, type, x, z, yaw, name, o) => Object.assign({ id, type, x, z, yaw, name }, o || {});
// 0..1: how strongly (x,z) is near a gameplay spot that must stay low and flat.
function zn_near(list, x, z) {
  let k = 0;
  for (const p of list) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r + 60) k = Math.max(k, 1 - smooth(p.r, p.r + 60, d)); }
  return k;
}
function zn_spots(def, extra = []) {
  return [...def.spawns.map((s) => ({ x: s.x, z: s.z, r: s.r + 10 })), ...def.pois.map((p) => ({ x: p.x, z: p.z, r: 20 })),
    ...(def.doors || []).map((d) => ({ x: d.bx, z: d.bz, r: 18 })), ...def.exits.map((e) => ({ x: e.x, z: e.z, r: 40 })), ...extra];
}
function zn_set(c, out, g = 0) { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; out[3] = g; }
function zn_doors(def, style) { for (const d of def.doors || []) ctMissionBuilding(d, style); }
// Generic natural scatter over the zone (plus a band of the cliff margin).
function zn_fill(rng, def, kind, n, fn, pad = 3) {
  const h = def.size / 2 + 60;
  wdScatter(kind, wdSpread(rng, n, { x0: -h, z0: -h, x1: h, z1: h }, fn, pad));
}
const zn_slope = (x, z) => { const h = groundY(x, z); return (Math.abs(groundY(x + 3, z) - h) + Math.abs(groundY(x, z + 3) - h)) / 3; };

// Extruded hull section: convex ship profile, tapered toward the bow, posed by a matrix (centre, YXZ angles).
function zn_hull(cx, cy, cz, len, w, h, yaw, pitch, roll, taper = 1, endCol = 0x1e1a18) {
  _e1.set(pitch, yaw, roll, 'YXZ');
  const M = new THREE.Matrix4().compose(_v2.set(cx, cy, cz), _q1.setFromEuler(_e1), _v3.set(1, 1, 1));
  _e1.order = 'XYZ';
  const PR = [[-1, 0.3], [-0.9, 1], [0.9, 1], [1, 0.3], [0.5, 0], [-0.5, 0]];
  const ring = (lz, k) => PR.map(([px, py]) => { const v = new V3(px * w / 2 * k, (py - 0.5) * h + (k < 1 ? (1 - k) * h * 0.25 : 0), lz).applyMatrix4(M); return [v.x, v.y, v.z]; });
  const A = ring(-len / 2, 1), B = ring(len / 2, taper), ctr = [cx, cy, cz];
  const COL = [0x7a6a5c, 0x5a4e46, 0x7a6a5c, 0x8a3a2a, 0x8a3a2a, 0x8a3a2a];
  for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; wdPoly('lit', [A[i], A[j], B[j], B[i]], i === 1 ? 0x5a5048 : i === 0 || i === 2 ? 0x7a6a5c : i === 3 || i === 5 ? 0x84604a : 0x8a3a2a, ctr); }
  wdPoly('lit', A, endCol, ctr); wdPoly('lit', B, taper < 0.3 ? 0x7a6a5c : endCol, ctr);
  // a rust-gold stripe along both flanks
  for (const s of [-1, 1]) {
    const p = (lz, k) => { const v = new V3(s * (w / 2 * k + 0.08), h * 0.2, lz).applyMatrix4(M); return [v.x, v.y, v.z]; };
    const q = (lz, k) => { const v = new V3(s * (w / 2 * k + 0.08), h * 0.28, lz).applyMatrix4(M); return [v.x, v.y, v.z]; };
    wdPoly('flat', [p(-len / 2, 1), p(len / 2, lerp(1, taper, 0.98)), q(len / 2, lerp(1, taper, 0.98)), q(-len / 2, 1)], 0xc8a040, [cx, cy, cz]);
  }
  wdColObb(cx, cz, w * 0.95, len * Math.cos(pitch) * 0.95, yaw, cy - h / 2, cy + h / 2);
}
// Wrecked ore freighter, broken in three, half buried in sand.
function zn_freighter(x, z, yaw) {
  const f = ctFrame(x, z, yaw), g = groundY(x, z);
  // bow, nose in the air
  const [bx, bz] = f(0, 30); zn_hull(bx, g + 4, bz, 24, 17, 13, yaw, -0.14, 0.2);
  const [nx, nz] = f(0, 50); zn_hull(nx, g + 7.2, nz, 16, 17, 13, yaw, -0.2, 0.2, 0.08);
  // midships: shattered frames and keel
  for (let i = 0; i < 6; i++) {
    const [rx, rz] = f((i % 2 ? 1 : -1) * 6.8, 12 - i * 4);
    wdTBox(rx, g + 3, rz, 0.9, 9 - (i % 3) * 2, 1.0, 0x5a4a3e, yaw, 0, (i % 2 ? -1 : 1) * 0.3);
  }
  const [kx, kz] = f(0, -2); wdTBox(kx, g + 0.6, kz, 13, 2, 26, 0x5a4a3e, yaw, 0.02, 0.1);
  // stern with the bridge tower and engines
  const [sx, sz] = f(0, -28); zn_hull(sx, g + 5, sz, 30, 18, 15, yaw, 0.05, -0.12);
  const [tx, tz] = f(0, -34), ty = g + 17;
  wdTBox(tx, ty, tz, 12, 9, 10, 0xb8b0a0, yaw, 0.05, -0.12);
  wdTBox(tx, ty + 1.6, tz, 12.3, 1.8, 10.3, 0x2a3a44, yaw, 0.05, -0.12);
  wdTBox(tx, ty + 5.2, tz, 14, 0.6, 11, 0x8a8478, yaw, 0.05, -0.12);
  const [mx, mz] = f(-2.5, -36); wdTBox(mx, ty + 9, mz, 0.6, 8, 0.6, 0x5a5a58, yaw, 0, -0.2);
  const [fx, fz] = f(3, -38); wdTBox(fx, ty + 6, fz, 2.4, 6, 2.4, 0x8a3a2a, yaw, 0.1, -0.15);
  for (const s of [-1, 1]) { const [ex, ez] = f(s * 4.5, -44); wdTBox(ex, g + 4, ez, 4.4, 4.4, 3, 0x3e3834, yaw, 0.05, -0.12); }
  // spilled ore containers
  for (let i = 0; i < 9; i++) {
    const a = i * 1.7, r = 14 + (i * 7) % 18, [cx, cz] = f(Math.sin(a) * r + 16, Math.cos(a) * r);
    const cg = groundY(cx, cz);
    wdTBox(cx, cg + 1, cz, 2.5, 2.6, 6, [0x8a5a3a, 0x3a6a7a, 0x9a8a3a, 0x6a6a6a][i % 4], yaw + a, 0, (i % 3 - 1) * 0.3);
    wdColObb(cx, cz, 2.5, 6, yaw + a, cg, cg + 2.6);
  }
}
// Cave mouth set into a bluff: rock frame around a dark opening that faces `yaw`.
function zn_caveMouth(x, z, yaw, rng, tint = 0x8a8070, w = 7, h = 6) {
  const f = ctFrame(x, z, yaw), g = groundY(x, z);
  const [vx, vz] = f(0, -1.6);
  wdBox(vx, g - 0.5, vz, w, h + 0.5, 0.4, 0x0a0a0c, yaw, 'flat');
  const [ix, iz] = f(0, -5);
  wdBox(ix, g - 1, iz, w + 4, h + 4, 7, 0x2a2622, yaw);
  const rocks = [];
  for (let i = 0; i < 16; i++) {
    const t = i / 15, a = Math.PI * t;
    const lx = Math.cos(a) * (w / 2 + 1.3), ly = Math.sin(a) * (h - 0.5);
    const [rx, rz] = f(lx, -0.6 + rng.r(-0.5, 0.5));
    rocks.push({ x: rx, z: rz, y: g + ly - 0.6, s: rng.r(1.4, 2.4), tint, col: 0 });
  }
  for (let i = 0; i < 8; i++) { const [rx, rz] = f(rng.r(-w, w), rng.r(-4, -1)); rocks.push({ x: rx, z: rz, y: g + h + rng.r(0, 2), s: rng.r(2.5, 4), tint, col: 0 }); }
  wdScatter('rock', rocks);
  for (const s of [-1, 1]) { const [cx, cz] = f(s * (w / 2 + 1.6), -1); wdColCyl(cx, cz, 1.8, g, g + h); }
  const [lx, lz] = f(w / 2 + 0.4, 0.6);
  wdBox(lx, g, lz, 0.2, 2.6, 0.2, 0x4a4038); wdBox(lx, g + 2.6, lz, 0.5, 0.4, 0.4, 0xffa050, 0, 'glow');
  wdLight(lx, g + 2.5, lz, 0xffa050, 1.0, 14).flicker = true;
}
// Industrial gate cut into a cliff face (dungeon entrance), facing yaw.
function zn_bunkerGate(x, z, yaw, glow = 0xff8a3a) {
  const f = ctFrame(x, z, yaw), g = groundY(x, z);
  const [bx, bz] = f(0, -7);
  wdSolid(bx, g - 2, bz, 26, 16, 14, 0x5a5650, yaw, 0x4a4640);
  const [ux, uz] = f(0, -12); wdBox(ux, g + 14, uz, 40, 12, 16, 0x4e4a44, yaw, 'lit', 0x3a3632);
  for (let i = 0; i < 4; i++) { const [px, pz] = f(-18 + i * 12, -4.2); wdBox(px, g + 14.5, pz, 1.5, 11, 1.5, 0x6a665e, yaw); }
  const [sx2, sz2] = f(0, -3.9); wdBox(sx2, g + 20, sz2, 22, 2.2, 0.2, 0x2a2826, yaw); wdBox(sx2, g + 20.5, sz2, 18, 1.2, 0.3, glow, yaw, 'glow');
  for (const s of [-1, 1]) { const [qx, qz] = f(s * 15, 0); ctPipeline([[qx, qz], [qx + Math.sin(yaw) * 30, qz + Math.cos(yaw) * 30]], 1.2, 0.8, 0x6a5040); }
  for (const s of [-1, 1]) { const [px, pz] = f(s * 8, -0.2); wdSolid(px, g - 1, pz, 4, 13, 2, 0x6a665e, yaw, 0x7a766e); }
  const [dx, dz] = f(0, -0.1);
  wdBox(dx, g, dz, 10, 8, 0.3, 0x2a2826, yaw);
  for (let i = 0; i < 5; i++) { const [sx, sz] = f(-4 + i * 2, 0.1); wdBox(sx, g + 0.4, sz, 1.1, 7, 0.1, i % 2 ? 0xc8a040 : 0x2a2826, yaw); }
  const [lx, lz] = f(0, 0.25); wdBox(lx, g + 8.4, lz, 10, 0.4, 0.1, glow, yaw, 'glow');
  const [hx, hz] = f(0, -2); wdBox(hx, g + 11, hz, 14, 1.6, 4, 0x4a4640, yaw);
  wdLight(lx, g + 7, lz, glow, 1.6, 26);
  for (const s of [-1, 1]) { const [sx, sz] = f(s * 9, -10); wdPrism(sx, g + 10, sz, 1.6, 1.3, 22, 8, 0x5a5048); wdBox(sx, g + 31.5, sz, 0.8, 0.8, 0.8, 0xff5040, 0, 'glow'); }
}
function zn_beacon(x, z, h = 26, col = 0xff5040) {
  const g = groundY(x, z) - 0.5;
  wdPrism(x, g, z, 3.2, 1.6, h, 8, 0xd8d0c0, 0, 'lit', 0x8a8478);
  for (let i = 1; i < 4; i++) wdPrism(x, g + (h * i) / 4, z, lerp(3.2, 1.6, i / 4) + 0.05, lerp(3.2, 1.6, i / 4) + 0.05, 1.4, 8, 0xa83a2a);
  wdPrism(x, g + h, z, 2.2, 2.2, 0.5, 8, 0x5a5a58);
  wdPrism(x, g + h + 0.5, z, 1.2, 1.2, 2, 8, col, 0, 'glow');
  wdPrism(x, g + h + 2.5, z, 1.6, 0.2, 1.4, 8, 0x5a5a58);
  wdColCyl(x, z, 3.2, g, g + h);
  wdLight(x, g + h + 1.5, z, col, 1.6, 40);
}
// Giant bucket-wheel excavator, long dead.
function zn_excavator(x, z, yaw) {
  const f = ctFrame(x, z, yaw), g = groundY(x, z);
  const Y = 0xc8a040, D = 0x4a4844, R = 0x8a4a2c;
  for (const s of [-1, 1]) { const [tx, tz] = f(s * 7, 0); wdSolid(tx, g - 0.5, tz, 5, 4, 22, D, yaw); }
  const [bx, bz] = f(0, 0);
  wdSolid(bx, g + 3.5, bz, 16, 10, 16, Y, yaw, 0x8a7030);
  wdBox(bx, g + 13.5, bz, 8, 6, 8, 0xd8d0c0, yaw); wdBox(...f(0, 4.05).slice(0, 1), g + 15, f(0, 4.05)[1], 6, 2, 0.1, 0x2a3a44, yaw);
  const p0 = f(0, 6), p1 = f(0, 44);
  wdBeam([p0[0], g + 10, p0[1]], [p1[0], g + 20, p1[1]], 3, Y);
  wdBeam([p0[0], g + 18, p0[1]], [p1[0], g + 22, p1[1]], 0.6, D);
  const [mx, mz] = f(0, -6); wdBeam([mx, g + 13, mz], [f(0, -32)[0], g + 6, f(0, -32)[1]], 2, Y);
  const [cx, cz] = f(0, -34); wdBox(cx, g, cz, 6, 6, 6, D, yaw);
  // the wheel
  const [wx, wz] = f(0, 47);
  const m = new THREE.Matrix4().compose(_v1.set(wx, g + 19, wz), _q1.setFromEuler(_e1.set(0, yaw + Math.PI / 2, Math.PI / 2)), _v2.set(1, 1, 1));
  wdGeo(new THREE.CylinderGeometry(10, 10, 2.4, 14).toNonIndexed(), m, R);
  wdGeo(new THREE.CylinderGeometry(3, 3, 3.2, 8).toNonIndexed(), m, D);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU, [ex, ez] = f(0, 47 + Math.cos(a) * 11);
    wdTBox(ex, g + 19 + Math.sin(a) * 11, ez, 3.4, 2, 2.6, R, yaw, a, 0);
  }
  wdColCyl(wx, wz, 3, g, g + 30);
}
// Atmospheric processor ruin (Greenhollow): cylinder tower, vents, moss.
function zn_processor(x, z) {
  const g = groundY(x, z) - 1;
  wdPrism(x, g, z, 18, 15, 46, 12, 0x8a908a, 0, 'lit', 0x6a706a);
  for (let i = 0; i < 4; i++) wdPrism(x, g + 8 + i * 10, z, 16.5 - i * 0.6, 16.5 - i * 0.6, 1.2, 12, 0x5a6a50);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; wdPrism(x + Math.cos(a) * 10, g + 46, z + Math.sin(a) * 10, 2.4, 2, 9, 8, 0x6a706a); }
  wdPrism(x, g + 46, z, 6, 4, 6, 10, 0x5a605a);
  for (let i = 0; i < 18; i++) { const a = i * 2.1, h = 6 + (i * 13) % 34; wdTBox(x + Math.cos(a) * 15.6, g + h, z + Math.sin(a) * 15.6, 6, 4 + (i % 3) * 3, 3, 0x4a6a2a, -a, 0.1, 0); }
  wdColCyl(x, z, 18, g, g + 50);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.2 + 0.4, ex = x + Math.cos(a) * 40, ez = z + Math.sin(a) * 40;
    ctPipeline([[x + Math.cos(a) * 18, z + Math.sin(a) * 18], [ex, ez], [ex + Math.cos(a + 0.6) * 50, ez + Math.sin(a + 0.6) * 50]], 2, 0.9, 0x6a7066);
  }
}
// Natural rock arch spanning (ax,az)->(bx,bz).
function zn_arch(ax, az, bx, bz, h, col = 0xa86040) {
  const ga = groundY(ax, az), gb = groundY(bx, bz), yaw = Math.atan2(bz - az, bx - ax) * -1;
  for (const [x, z, g] of [[ax, az, ga], [bx, bz, gb]]) { wdSolid(x, g - 2, z, 12, h + 4, 10, col, yaw, 0x8a4a32); }
  const n = 14, L = Math.hypot(bx - ax, bz - az);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(ax, bx, t), z = lerp(az, bz, t), y = lerp(ga, gb, t) + h + Math.sin(t * Math.PI) * 10;
    const slope = (Math.cos(t * Math.PI) * Math.PI * 10 + (gb - ga)) / L;
    wdTBox(x, y, z, L / n * 1.5, 7 - Math.sin(t * Math.PI) * 2.5, 9 - Math.sin(t * Math.PI) * 2, i % 3 ? col : 0x9a5838, yaw, 0, Math.atan(slope));
  }
}

// =====================================================================
// Landfall Isle (1-10)
// =====================================================================
const ZN_LF_DOORS = [
  ctDoorRec('lf_md1', -150, 150, 0.6, 10), ctDoorRec('lf_md2', 185, 40, -1.2, 10), ctDoorRec('lf_md3', -90, -215, 2.6, 10),
  ctDoorRec('lf_md4', 125, -135, -2.2, 10), ctDoorRec('lf_md5', -250, 240, 0.9, 10),
];
function zn_lfCoast(x, z) {
  const a = Math.atan2(z, x), r = Math.hypot(x, z);
  const R = 455 + 70 * (vnoise(Math.cos(a) * 2 + 7, Math.sin(a) * 2 + 3) - 0.5) * 2 + 30 * Math.sin(a * 3 + 1) + 18 * Math.sin(a * 7 + 2);
  return R - r;
}
function zn_lfHeight(x, z) {
  const d = zn_lfCoast(x, z);
  let h;
  if (d < 0) h = lerp(0.6, -14, smooth(0, 110, -d));
  else h = 0.6 + smooth(0, 50, d) * 2.4 + smooth(25, 200, d) * (6 + 44 * fbm(x * 0.0045 + 3, z * 0.0045, 4)) + smooth(60, 260, d) * 34 * Math.pow(ridged(x * 0.003, z * 0.003, 3), 2);
  const db = Math.hypot(x + 432, z + 60) + (vnoise(x * 0.05, z * 0.05) - 0.5) * 6;
  h += 30 * (1 - smooth(28, 50, db)) * smooth(-30, 10, d);
  return h;
}
function zn_lfBuild(def) {
  const rng = makeRng(strSeed('landfall'));
  const low = zn_spots(def);
  wdTerrain({
    cell: 6, margin: 260,
    height: (x, z) => { const h = zn_lfHeight(x, z), k = zn_near(low, x, z) * smooth(-5, 20, zn_lfCoast(x, z)); return lerp(h, Math.min(h, 4 + h * 0.4), k * 0.6); },
    flats: [{ x: 0, z: 310, r: 72, fall: 45 }, { x: -384, z: -60, r: 6, fall: 10 }, { x: 300, z: -280, r: 40, fall: 30 }, ...def.doors.map((d) => ({ x: d.bx, z: d.bz, r: 10, fall: 14 }))],
    color: (x, y, z, ny, out) => {
      const n = vnoise(x * 0.03, z * 0.03);
      let c;
      if (y < -0.6) c = wdMix(0x9a9a80, 0x5a7a78, smooth(-0.6, -8, y));
      else if (y < 1.6) c = wdMix(0xc8b890, 0xe0d0a8, smooth(-0.6, 1.6, y));
      else if (y < 3.2) c = wdMix(0xe0d0a8, 0xb8b078, smooth(1.6, 3.2, y));
      else {
        const m = fbm(x * 0.008, z * 0.008, 3);
        c = wdMix(0x8f9a54, 0xa89a62, smooth(0.35, 0.7, n + m * 0.4 - 0.2));
        c = wdMix(c, 0x6a7a3c, smooth(0.55, 0.7, vnoise(x * 0.012 + 9, z * 0.012)) * 0.7);
        c = wdMix(c, 0xa08a62, smooth(0.6, 0.75, vnoise(x * 0.02 - 4, z * 0.02)) * 0.6);
      }
      if (ny < 0.82 && y > 1) c = wdMix(c, 0x8a7a66, smooth(0.82, 0.66, ny));
      zn_set(c, out);
    },
    roadCol: 0xb8a480,
  });
  WD.deepY = -1.3;
  wdWater(0, 0x2a7a8c, 9000, 0, 0, 0.82);
  // shuttleport
  const SP = { x: 0, z: 310 }, gy = groundY(SP.x, SP.z);
  ctHut(-2, 352, Math.PI, { w: 34, d: 14, h: 7, style: 'prefab', y: gy - 0.1, stripe: 0x5fe0d0, glowWin: 0.5 });
  wdBox(-2, gy + 7, 352, 12, 4, 8, 0xd2d0c8, 0, 'lit', 0x8a8d90);
  wdBox(-2, gy + 8.5, 347.95, 10, 1, 0.1, 0x5fe0d0, 0, 'glow');
  const py = ctPad(58, 300, 14, gy, 0xffd27a);
  ctShuttle(58, 302, -Math.PI / 2 + 0.3, py);
  for (let i = 0; i < 4; i++) { wdBox(-16 + i * 12, gy + 3.2, 330, 9, 0.2, 5, 0x55595e); wdBox(-16 + i * 12, gy + 3.0, 327.6, 9, 0.15, 0.1, [0xffd27a, 0xffb347, 0x5fe0d0, 0xc080ff][i], 0, 'glow'); for (const s of [-1, 1]) wdBox(-16 + i * 12 + s * 4.3, gy, 328, 0.2, 3.2, 0.2, 0x55595e); }
  ctFence([[-72, 262], [-72, 372], [80, 372], [86, 340]]); ctFence([[86, 262], [40, 250]]);
  for (const [x, z] of [[-60, 270], [-60, 330], [30, 270], [80, 330], [-30, 255], [40, 340]]) ctLamp(x, z, 5.5, 0xffd27a, x === -60 || x === 30);
  const ax = -52, az = 362, ag = groundY(ax, az);
  wdBox(ax, ag, az, 0.6, 22, 0.6, 0x55595e); wdBox(ax, ag + 22, az, 0.8, 0.8, 0.8, 0xff5040, 0, 'glow');
  wdBeam([ax, ag + 18, az], [ax + 6, ag, az + 4], 0.08, 0x9aa2a8); wdBeam([ax, ag + 18, az], [ax - 6, ag, az - 3], 0.08, 0x9aa2a8);
  wdPrism(ax, ag + 16, az, 1.8, 0.3, 1.2, 8, 0xd2d0c8);
  ctTank(-58, 290, 3.5, 6);
  for (let i = 0; i < 6; i++) ctCrate(68 + (i % 3) * 1.6, 330 + Math.floor(i / 3) * 1.6, 1.4, 0x6a7a8a, 0.1);
  // set pieces
  zn_freighter(300, -280, 0.6);
  zn_caveMouth(-385, -60, Math.PI / 2, rng, 0x8a8070);
  zn_beacon(-40, -405, 24);
  ctDerrick(220, 70, 0.3, 20); ctDerrick(262, 118, 0.9, 16);
  ctPipeline([[220, 82], [180, 140], [110, 190], [60, 240]]);
  zn_doors(def, 'prefab');
  // smugglers' crates near the cove
  for (let i = 0; i < 5; i++) ctCrate(-360 + i * 2, -30 + (i % 2) * 2, 1.2, 0x5a6a50, i);
  // vegetation and rocks
  const land = (x, z, minD = 8) => zn_lfCoast(x, z) > minD;
  zn_fill(rng, def, 'shrub', 4200, (x, z, r) => (land(x, z, 12) && zn_slope(x, z) < 0.6 ? { x, z, s: r.r(0.8, 2.0) } : null));
  zn_fill(rng, def, 'grass', 7000, (x, z, r) => (land(x, z, 6) ? { x, z, s: r.r(0.8, 1.6) } : null), 2);
  zn_fill(rng, def, 'scrubtree', 520, (x, z, r) => (land(x, z, 40) && vnoise(x * 0.008, z * 0.008) > 0.45 && zn_slope(x, z) < 0.5 ? { x, z, s: r.r(3, 6) } : null), 5);
  zn_fill(rng, def, 'palm', 140, (x, z, r) => { const d = zn_lfCoast(x, z); return d > 6 && d < 40 ? { x, z, s: r.r(2.2, 3.4), yaw: r.r(0, 6) } : null; }, 5);
  zn_fill(rng, def, 'deadtree', 90, (x, z, r) => (land(x, z, 50) ? { x, z, s: r.r(3, 5) } : null), 5);
  zn_fill(rng, def, 'rock', 900, (x, z, r) => (zn_lfCoast(x, z) > -10 ? { x, z, s: r.r(0.5, 2.2) * (r.chance(0.08) ? 3 : 1), tint: r.chance(0.5) ? 0x9a8c78 : 0x8a8478 } : null), 3);
  zn_fill(rng, def, 'slab', 260, (x, z, r) => (land(x, z, 30) && zn_slope(x, z) > 0.35 ? { x, z, s: r.r(2, 6), tint: 0x9a9080 } : null), 4);
  zn_fill(rng, def, 'lumen', 50, (x, z, r) => (Math.hypot(x + 400, z + 60) < 160 && land(x, z, 10) ? { x, z, s: r.r(0.8, 1.6), glowTint: 0x5fe0d0 } : null));
  wdMotes({ color: 0xffffff, n: 200, size: 0.12, r: 50, h: 15, opacity: 0.35 });
}
registerZone({
  id: 'landfall', name: 'Landfall Isle', kind: 'island', lvl: [1, 10], size: 1400, safe: false, music: 'calm', entry: 'landfall_start',
  atmos: { fog: 0xc9d8de, near: 170, far: 820, horizon: 0xdbe6e8, zenith: 0x3f7fc4, sunColor: 0xfff2da, sunInt: 1.08, hemiSky: 0xcfe0f0, hemiGround: 0x7a6a50, hemiInt: 0.72, sunDir: [-0.5, 0.72, 0.38], clouds: 0.75 },
  waterCol: 0x2a7a8c,
  roads: [
    { pts: [[0, 270], [10, 200], [-20, 120], [-60, 40], [-140, -20], [-300, -60], [-372, -60]], w: 7 },
    { pts: [[10, 200], [110, 150], [200, 60], [240, -40], [285, -230]], w: 7 },
    { pts: [[-60, 40], [-50, -150], [-40, -380]], w: 6 },
  ],
  doors: ZN_LF_DOORS,
  areas: [
    { name: 'Landfall Shuttleport', x: 0, z: 310, r: 90, label: true }, { name: 'Wreck of the Calloway', x: 300, z: -280, r: 90, label: true },
    { name: "Smuggler's Cove", x: -360, z: -80, r: 100, label: true }, { name: 'Cape Beacon', x: -40, z: -405, r: 60, label: true },
    { name: 'Old Pumpworks', x: 230, z: 100, r: 70, label: true }, { name: 'Scrub Hills', x: -60, z: -60, r: 200 },
  ],
  spawns: [
    { x: 60, z: 190, r: 40, mobs: ['chitterling'], n: 6, lvl: [1, 2], respawn: 45 },
    { x: -90, z: 190, r: 40, mobs: ['chitterling'], n: 6, lvl: [1, 3], respawn: 45 },
    { x: 0, z: 110, r: 45, mobs: ['chitterling', 'dust_scuttler'], n: 6, lvl: [2, 4], respawn: 50 },
    { x: 150, z: 110, r: 45, mobs: ['dust_scuttler'], n: 5, lvl: [2, 4], respawn: 60 },
    { x: -190, z: 60, r: 50, mobs: ['dust_scuttler'], n: 5, lvl: [3, 5], respawn: 60 },
    { x: 60, z: 10, r: 50, mobs: ['dust_scuttler', 'rust_hound'], n: 5, lvl: [4, 6], respawn: 60 },
    { x: -130, z: -90, r: 40, mobs: ['rust_hound'], n: 4, lvl: [4, 6], respawn: 75 },
    { x: 170, z: -40, r: 40, mobs: ['rust_hound'], n: 4, lvl: [5, 7], respawn: 75 },
    { x: -10, z: -200, r: 45, mobs: ['rust_hound'], n: 4, lvl: [6, 8], respawn: 75 },
    { x: 260, z: -200, r: 45, mobs: ['scav_drone'], n: 5, lvl: [5, 8], respawn: 80 },
    { x: 330, z: -330, r: 35, mobs: ['scav_drone'], n: 4, lvl: [7, 9], respawn: 80 },
    { x: -320, z: -110, r: 22, mobs: ['smuggler'], n: 4, lvl: [6, 9], camp: true, campStyle: 'smuggler', respawn: 90 },
    { x: -300, z: -190, r: 22, mobs: ['smuggler'], n: 4, lvl: [8, 10], camp: true, campStyle: 'smuggler', respawn: 90 },
    { x: 20, z: 285, r: 4, mobs: ['guard'], n: 2, lvl: [60, 60], respawn: 60 },
  ],
  pois: [
    zn_poi('landfall_start', 'start', 0, 278, Math.PI, 'Landfall Shuttleport'),
    zn_poi('landfall_clonebay', 'clonebay', -36, 322, Math.PI, 'Landfall Clone Bay'),
    zn_poi('landfall_terminal', 'terminal', -22, 296, Math.PI, 'Mission Terminal'),
    zn_poi('landfall_vendor_general', 'vendor', -16, 330.5, Math.PI, 'Supply Clerk Hollis Bray', { role: 'general' }),
    zn_poi('landfall_vendor_weapons', 'vendor', -4, 330.5, Math.PI, 'Armsmaster Dena Kroll', { role: 'weapons' }),
    zn_poi('landfall_vendor_armor', 'vendor', 8, 330.5, Math.PI, 'Fitter Oren Vasquez', { role: 'armor' }),
    zn_poi('landfall_vendor_nanos', 'vendor', 20, 330.5, Math.PI, 'Nanoclerk Ivy Tallis', { role: 'nanos' }),
    zn_poi('landfall_recruiter', 'npc', -44, 300, Math.PI / 2, 'Recruiter Anya Voss', { role: 'faction' }),
    zn_poi('landfall_dockmaster', 'npc', 30, 318, -Math.PI / 2, 'Dockmaster Ilse Brandt', { role: 'flavour' }),
    zn_poi('landfall_medic', 'npc', -48, 318, 2.2, 'Field Medic Tomas Reyes', { role: 'flavour' }),
    zn_poi('landfall_shuttle', 'shuttle', 40, 288, -Math.PI / 2, 'Shuttle Pilot Cass Merrin', { data: { destinations: [{ zone: 'halden', poi: 'halden_shuttle_arrive', name: 'Halden Crossing', cost: 0 }] } }),
    zn_poi('landfall_shuttle_arrive', 'arrive', 28, 300, Math.PI, 'Shuttle Pad'),
    zn_poi('landfall_den_door', 'door', -387, -60, Math.PI / 2, "Smuggler's Den", { data: { to: 'smugglers_den', poi: 'den_arrive' }, clear: 8 }),
    zn_poi('landfall_den_out', 'arrive', -374, -60, Math.PI / 2, "Smuggler's Cove"),
    zn_poi('landfall_hermit', 'npc', 280, -230, -2.4, 'Salvager Old Pike', { role: 'flavour' }),
  ],
  exits: [],
  build: zn_lfBuild,
});

// =====================================================================
// Dustbowl Flats (5-20)
// =====================================================================
const zn_dbRiver = (z) => 120 + 90 * Math.sin(z * 0.004 + 1) + 40 * Math.sin(z * 0.011);
function zn_dbBuild(def) {
  const rng = makeRng(strSeed('dustbowl'));
  const low = zn_spots(def, [{ x: -80, z: 430, r: 60 }]);
  wdTerrain({
    cell: 7, margin: 200,
    height: (x, z) => {
      const n = fbm(x * 0.004, z * 0.004, 3);
      let h = 5 + 6 * n + Math.pow(Math.abs(Math.sin(x * 0.02 + z * 0.008 + n * 6)), 2) * 2.5 * fbm(x * 0.01 + 5, z * 0.01, 2);
      const rd = Math.abs(x - zn_dbRiver(z)), road = wdRoadDist(x, z);
      const m = fbm(x * 0.0026 + 40, z * 0.0026 - 10, 3);
      let mesa = smooth(0.585, 0.6, m) * 34 + smooth(0.655, 0.67, m) * 20;
      mesa *= smooth(20, 70, road) * smooth(40, 90, rd) * (1 - zn_near(low, x, z));
      h += mesa;
      h -= 9 * (1 - smooth(14, 30, rd)) * (1 - 0.7 * (1 - smooth(4, 18, road)));
      return h;
    },
    flats: [{ x: -420, z: 40, r: 62, fall: 40 }, { x: 440, z: -430, r: 40, fall: 30 }, ...def.doors.map((d) => ({ x: d.bx, z: d.bz, r: 10, fall: 14 }))],
    edge: { h: 70, w: 120, gap: 45 },
    color: (x, y, z, ny, out) => {
      const n = vnoise(x * 0.02, z * 0.02), rd = Math.abs(x - zn_dbRiver(z));
      let c = wdMix(0xd9b98a, 0xc8a070, n);
      c = wdMix(c, 0xa88e6a, smooth(0.62, 0.75, vnoise(x * 0.015 + 3, z * 0.015)) * 0.7);
      c = wdMix(c, 0xe4c898, smooth(0.6, 0.72, vnoise(x * 0.04 - 7, z * 0.04)) * 0.5);
      if (rd < 32) c = wdMix(wdMix(0x8a7e6c, 0x9c8e78, vnoise(x * 0.25, z * 0.25)), c, smooth(14, 32, rd));
      if (ny < 0.8) c = wdMix(c, Math.sin(y * 0.6) > 0 ? 0xb06a48 : 0xc88a60, smooth(0.8, 0.62, ny));
      else if (y > 22) c = wdMix(c, 0xb8946a, 0.5);
      zn_set(c, out);
    },
    roadCol: 0xb09a78,
  });
  // outpost
  const O = { x: -420, z: 40 }, og = groundY(O.x, O.z);
  ctHut(-440, 12, 0.1, { w: 14, d: 10, h: 5, style: 'prefab', y: og - 0.1, stripe: 0x5fe0d0 });
  ctHut(-398, 14, -0.1, { w: 12, d: 9, h: 4.5, style: 'prefab', y: og - 0.1 });
  ctHut(-446, 72, Math.PI, { w: 12, d: 9, h: 4.5, style: 'sand', y: og - 0.1 });
  ctPad(-385, 74, 11, og);
  ctTank(-455, 45, 3.5, 9, 0xd2d0c8);
  ctFence([[-470, 0], [-470, 90], [-370, 90], [-370, 60]]); ctFence([[-370, 20], [-370, -10], [-470, -10], [-470, 0]]);
  for (const [x, z] of [[-460, 30], [-380, 30], [-460, 80], [-400, 50]]) ctLamp(x, z, 5.5, 0xffb347, true);
  // raider camp palisade
  const R = { x: 440, z: -430 };
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU; if (Math.abs(angWrap(a - 2.6)) < 0.25) continue;
    const x = R.x + Math.cos(a) * 58, z = R.z + Math.sin(a) * 58, g = groundY(x, z);
    wdSolid(x, g - 0.5, z, 16.8, 3.2 + (i % 3) * 0.6, 0.8, i % 2 ? 0x8a4a2c : 0x6e5a48, -a + Math.PI / 2, 0x5a3a28);
  }
  const tw = (x, z) => { const g = groundY(x, z); for (const [a, b] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) wdBox(x + a, g, z + b, 0.4, 8, 0.4, 0x5a4a38); wdBox(x, g + 8, z, 4.4, 0.4, 4.4, 0x6a5a48); wdGable(x, g + 10, z, 4.6, 4.6, 1.6, 0x8a4a2c); wdBox(x, g + 8.4, z, 4.4, 1.4, 0.2, 0x6a5a48); wdColBox(x - 1.7, z - 1.7, x + 1.7, z + 1.7, g, g + 10); };
  tw(R.x + 40, R.z - 40); tw(R.x - 45, R.z + 30);
  // mining relics
  zn_excavator(-80, 430, 0.5);
  ctDerrick(-560, 320, 0.2, 24); ctDerrick(-250, 360, 1.1, 20); ctDerrick(40, 300, 0.4, 22); ctDerrick(560, 300, 0.7, 18);
  ctPipeline([[-560, 332], [-420, 360], [-250, 372], [-100, 340], [40, 312], [260, 330], [560, 312]], 1.8, 0.7);
  zn_doors(def, 'sand');
  zn_fill(rng, def, 'rock', 1800, (x, z, r) => ({ x, z, s: r.r(0.5, 2.2) * (r.chance(0.07) ? 3.5 : 1), tint: r.chance(0.6) ? 0xb88a64 : 0x9a7a5a }), 3);
  zn_fill(rng, def, 'rock', 900, (x, z, r) => (Math.abs(x - zn_dbRiver(z)) < 26 ? { x, z, s: r.r(0.3, 0.9), tint: 0x8a8070 } : null), 1);
  zn_fill(rng, def, 'grass', 3000, (x, z, r) => ({ x, z, s: r.r(0.8, 1.5), tint: 0xd8c088 }), 2);
  zn_fill(rng, def, 'shrub', 3000, (x, z, r) => (zn_slope(x, z) < 0.4 ? { x, z, s: r.r(0.6, 1.4), tint: 0xb8a070 } : null), 3);
  zn_fill(rng, def, 'deadtree', 260, (x, z, r) => (Math.abs(x - zn_dbRiver(z)) < 60 || r.chance(0.3) ? { x, z, s: r.r(2.5, 5) } : null), 4);
  zn_fill(rng, def, 'lcactus', 500, (x, z, r) => (zn_slope(x, z) < 0.5 ? { x, z, s: r.r(1.2, 2.6), glowTint: r.chance(0.7) ? 0x5fe0d0 : 0x9ff0a0 } : null), 4);
  zn_fill(rng, def, 'ribs', 18, (x, z, r) => ({ x, z, s: r.r(5, 9) }), 10);
  zn_fill(rng, def, 'scrap', 140, (x, z, r) => (Math.abs(x - 440) < 120 && Math.abs(z + 430) < 120 || r.chance(0.3) ? { x, z, s: r.r(1, 2.5) } : null), 3);
  wdMotes({ color: 0xf0d8a0, n: 450, size: 0.2, r: 55, h: 16, opacity: 0.5, drift: 1.4 });
}
registerZone({
  id: 'dustbowl', name: 'Dustbowl Flats', kind: 'outdoor', lvl: [5, 20], size: 1600, safe: false, music: 'calm', entry: 'dustbowl_arrive_halden_e',
  atmos: { fog: 0xd8bf98, near: 130, far: 800, horizon: 0xe8d2aa, zenith: 0x6a8cb8, sunColor: 0xfff0d0, sunInt: 1.15, hemiSky: 0xe0d8c8, hemiGround: 0x8a6a48, hemiInt: 0.7, sunDir: [-0.3, 0.85, 0.28], clouds: 0.5 },
  campStyle: 'raider',
  roads: [
    { pts: [[-790, -120], [-600, -100], [-480, -10], [-420, 40]], w: 9 }, { pts: [[-790, 160], [-600, 140], [-480, 80], [-420, 40]], w: 9 },
    { pts: [[-420, 40], [-250, 60], [-50, 30], [150, 0], [350, -40], [600, -60], [790, -60]], w: 9 },
    { pts: [[350, -40], [400, -250], [425, -372]], w: 6 },
  ],
  doors: [ctDoorRec('db_md1', -560, -230, 1.2), ctDoorRec('db_md2', -300, 200, -0.4), ctDoorRec('db_md3', 60, -180, 2.2), ctDoorRec('db_md4', 260, 150, -2.0), ctDoorRec('db_md5', 600, 180, 0.3), ctDoorRec('db_md6', -150, -420, 1.8)],
  areas: [
    { name: 'Dustbowl Outpost', x: -420, z: 40, r: 70, label: true }, { name: 'Raider Hold', x: 440, z: -430, r: 80, label: true },
    { name: 'Dry Riverbed', x: 160, z: 200, r: 60, label: true }, { name: 'Old Bucketwheel', x: -80, z: 430, r: 70, label: true },
    { name: 'Derrick Line', x: -250, z: 360, r: 120 },
  ],
  spawns: [
    { x: -620, z: -230, r: 55, mobs: ['dust_scuttler'], n: 6, lvl: [5, 6], respawn: 60 },
    { x: -620, z: 300, r: 55, mobs: ['dust_scuttler'], n: 6, lvl: [5, 6], respawn: 60 },
    { x: -470, z: -250, r: 50, mobs: ['rust_hound'], n: 4, lvl: [6, 8], respawn: 70 },
    { x: -320, z: 250, r: 50, mobs: ['rust_hound'], n: 4, lvl: [6, 8], respawn: 70 },
    { x: -250, z: -110, r: 55, mobs: ['scav_drone'], n: 5, lvl: [7, 9], respawn: 70 },
    { x: -120, z: 300, r: 50, mobs: ['scav_drone'], n: 5, lvl: [7, 9], respawn: 70 },
    { x: -60, z: -300, r: 60, mobs: ['sand_wyrm'], n: 4, lvl: [9, 13], respawn: 80 },
    { x: 140, z: 160, r: 55, mobs: ['sand_wyrm'], n: 4, lvl: [10, 14], respawn: 80 },
    { x: 220, z: -170, r: 70, mobs: ['dune_strider'], n: 4, lvl: [11, 15], respawn: 80 },
    { x: 330, z: 300, r: 70, mobs: ['dune_strider'], n: 4, lvl: [12, 16], respawn: 80 },
    { x: 440, z: 110, r: 55, mobs: ['scorpod'], n: 5, lvl: [13, 17], respawn: 80 },
    { x: 580, z: -200, r: 55, mobs: ['scorpod'], n: 5, lvl: [14, 18], respawn: 80 },
    { x: 620, z: 400, r: 55, mobs: ['rogue_drone'], n: 4, lvl: [15, 19], respawn: 90 },
    { x: 660, z: 40, r: 45, mobs: ['rogue_drone'], n: 4, lvl: [16, 20], respawn: 90 },
    { x: 440, z: -430, r: 22, mobs: ['dust_raider'], n: 5, lvl: [15, 18], camp: true, respawn: 100 },
    { x: 470, z: -470, r: 14, mobs: ['dust_raider'], n: 3, lvl: [17, 20], respawn: 100 },
    { x: 400, z: -470, r: 14, mobs: ['dust_raider'], n: 3, lvl: [16, 19], respawn: 100 },
    { x: -420, z: 30, r: 4, mobs: ['guard'], n: 2, lvl: [60, 60], respawn: 60 },
  ],
  pois: [
    zn_poi('dustbowl_arrive_halden_e', 'arrive', -745, -118, Math.PI / 2, 'Halden Road'),
    zn_poi('dustbowl_arrive_halden_n', 'arrive', -745, 158, Math.PI / 2, 'Halden North Road'),
    zn_poi('dustbowl_arrive_green', 'arrive', 745, -60, -Math.PI / 2, 'Greenhollow Track'),
    zn_poi('dustbowl_clonebay', 'clonebay', -428, 25, Math.PI, 'Dustbowl Clone Bay'),
    zn_poi('dustbowl_terminal', 'terminal', -408, 30, Math.PI, 'Mission Terminal'),
    zn_poi('dustbowl_vendor', 'vendor', -424, 52, 0, 'Quartermaster Reza Ibarra', { role: 'general' }),
    zn_poi('dustbowl_npc_scout', 'npc', -392, 44, -Math.PI / 2, 'Scout Lena Farrow', { role: 'flavour' }),
    zn_poi('dustbowl_npc_driller', 'npc', -238, 352, 0.4, 'Driller Bao Nakamura', { role: 'flavour' }),
  ],
  exits: [
    { x: -786, z: -120, r: 12, to: 'halden', poi: 'halden_arrive_e', label: 'Halden Crossing (East Gate)' },
    { x: -786, z: 160, r: 12, to: 'halden', poi: 'halden_arrive_n', label: 'Halden Crossing (North Gate)' },
    { x: 786, z: -60, r: 12, to: 'greenhollow', poi: 'greenhollow_arrive_w', label: 'Greenhollow' },
  ],
  build: zn_dbBuild,
});

// =====================================================================
// Greenhollow (15-30)
// =====================================================================
const ZN_GH = { bog: { x: -260, z: 230, r: 210 }, spore: { x: 90, z: -300, r: 160 }, cult: { x: 430, z: 140 }, proc: { x: -330, z: -320 } };
function zn_ghBog(x, z) { const B = ZN_GH.bog; return Math.hypot(x - B.x, z - B.z) + (vnoise(x * 0.012, z * 0.012) - 0.5) * 90; }
function zn_ghBuild(def) {
  const rng = makeRng(strSeed('greenhollow'));
  const WY = 1.6;
  wdTerrain({
    cell: 6, margin: 200,
    height: (x, z) => {
      let h = 6 + 26 * fbm(x * 0.003, z * 0.003, 4) + 5 * vnoise(x * 0.025, z * 0.025);
      const road = wdRoadDist(x, z);
      h = lerp(h, 6 + 12 * fbm(x * 0.003, z * 0.003, 2), 1 - smooth(10, 50, road));
      const db = zn_ghBog(x, z);
      const bog = WY - 0.9 + 0.6 * vnoise(x * 0.04, z * 0.04) + 1.6 * smooth(0.62, 0.78, vnoise(x * 0.018 + 4, z * 0.018));
      h = lerp(h, bog, 1 - smooth(ZN_GH.bog.r * 0.7, ZN_GH.bog.r * 1.1, db));
      const ds = Math.hypot(x - ZN_GH.spore.x, z - ZN_GH.spore.z);
      h = lerp(h, 8 + 4 * vnoise(x * 0.02, z * 0.02), 1 - smooth(ZN_GH.spore.r * 0.6, ZN_GH.spore.r * 1.2, ds));
      return h;
    },
    flats: [{ x: ZN_GH.cult.x, z: ZN_GH.cult.z, r: 45, fall: 30 }, { x: ZN_GH.proc.x, z: ZN_GH.proc.z, r: 30, fall: 30 }, ...def.doors.map((d) => ({ x: d.bx, z: d.bz, r: 10, fall: 14 }))],
    edge: { h: 70, w: 110, gap: 45 },
    color: (x, y, z, ny, out) => {
      const n = vnoise(x * 0.025, z * 0.025);
      let c = wdMix(0x5a7a32, 0x7a8a3a, n);
      const ds = Math.hypot(x - ZN_GH.spore.x, z - ZN_GH.spore.z);
      if (ds < ZN_GH.spore.r * 1.2) c = wdMix(wdMix(0x8a8a3a, 0xa09640, vnoise(x * 0.08, z * 0.08)), c, smooth(ZN_GH.spore.r * 0.7, ZN_GH.spore.r * 1.2, ds));
      c = wdMix(c, 0x46602a, smooth(0.6, 0.75, vnoise(x * 0.013 + 2, z * 0.013)) * 0.6);
      if (y < WY + 0.6) c = wdMix(0x4a4a2a, 0x5a6030, smooth(WY - 1, WY + 0.6, y));
      if (ny < 0.8) c = wdMix(c, 0x5a5444, smooth(0.8, 0.62, ny));
      let g = 0;
      if (ds < ZN_GH.spore.r) g = smooth(0.7, 0.85, vnoise(x * 0.06, z * 0.06)) * 0.35;
      zn_set(c, out, g);
    },
    roadCol: 0x7a6a4a,
  });
  WD.deepY = WY - 1.6;
  const B = ZN_GH.bog;
  wdWater(WY, 0x3a4a2e, new THREE.CircleGeometry(B.r * 1.25, 40).rotateX(-Math.PI / 2), B.x, B.z, 0.85);
  zn_processor(ZN_GH.proc.x, ZN_GH.proc.z);
  // cultist shrine: a ring of totems around a lumen monolith
  const C = ZN_GH.cult, cg = groundY(C.x, C.z);
  wdPrism(C.x, cg - 1, C.z, 6, 5, 1.6, 8, 0x4a4038);
  wdPrism(C.x, cg + 0.6, C.z, 1.6, 0.8, 9, 6, 0x7ff0e0, 0, 'glow'); wdPrism(C.x, cg + 9.6, C.z, 0.8, 0, 3, 6, 0xc0fff8, 0, 'glow');
  wdColCyl(C.x, C.z, 5.5, cg, cg + 12);
  wdLight(C.x, cg + 6, C.z, 0x7ff0e0, 2, 34);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, x = C.x + Math.cos(a) * 30, z = C.z + Math.sin(a) * 30, g = groundY(x, z);
    wdPrism(x, g - 0.5, z, 0.7, 0.5, 6, 5, 0x5a4434); wdBox(x, g + 5.5, z, 2.6, 0.5, 0.5, 0x5a4434, -a);
    wdPrism(x, g + 6, z, 0.35, 0, 0.9, 5, 0x7ff0e0, 0, 'glow');
    wdColCyl(x, z, 0.7, g, g + 6);
  }
  // a fallen Meridian survey walker in the bog
  {
    const x = -200, z = 300, g = Math.max(groundY(x, z), WY - 1);
    wdTBox(x, g + 2, z, 8, 5, 10, 0xd2d0c8, 0.6, 0.2, 0.5); wdTBox(x + 5, g + 1, z + 4, 1.5, 9, 1.5, 0x55595e, 0.6, 1.1, 0.3);
    wdTBox(x - 3, g + 1, z - 5, 1.5, 8, 1.5, 0x55595e, 0.6, -0.9, 0.2); wdTBox(x + 1, g + 3.5, z + 1, 3, 1.4, 0.2, 0x3d7fd8, 0.6, 0.2, 0.5);
    wdColObb(x, z, 8, 10, 0.6, g, g + 5);
  }
  zn_doors(def, 'bunker');
  const bog = (x, z) => groundY(x, z) < WY + 0.2;
  const inSpore = (x, z) => Math.hypot(x - ZN_GH.spore.x, z - ZN_GH.spore.z) < ZN_GH.spore.r;
  zn_fill(rng, def, 'fern', 1300, (x, z, r) => (!bog(x, z) && !inSpore(x, z) && zn_slope(x, z) < 0.7 ? { x, z, s: r.r(4, 9), tilt: 0.15 } : null), 4);
  zn_fill(rng, def, 'bigtree', 520, (x, z, r) => (!bog(x, z) && !inSpore(x, z) && vnoise(x * 0.01, z * 0.01) > 0.42 ? { x, z, s: r.r(7, 14), tint: r.chance(0.5) ? 0xd0e0b0 : null } : null), 6);
  zn_fill(rng, def, 'grass', 2200, (x, z, r) => (!bog(x, z) ? { x, z, s: r.r(1, 2), tint: 0xa8c070 } : null), 2);
  zn_fill(rng, def, 'reed', 1500, (x, z, r) => (zn_ghBog(x, z) < B.r * 1.05 && groundY(x, z) < WY + 0.9 ? { x, z, s: r.r(0.8, 1.6) } : null), 1);
  zn_fill(rng, def, 'deadtree', 200, (x, z, r) => (zn_ghBog(x, z) < B.r ? { x, z, s: r.r(4, 8), tint: 0x9a9a7a } : null), 4);
  wdScatter('mushroom', wdSpread(rng, 900, ZN_GH.spore, (x, z, r) => ({ x, z, s: r.r(1, 4), glowTint: r.chance(0.6) ? 0xe0f070 : 0xf0b060 }), 3));
  wdScatter('sporepod', wdSpread(rng, 1300, { x: ZN_GH.spore.x, z: ZN_GH.spore.z, r: ZN_GH.spore.r * 1.1 }, (x, z, r) => ({ x, z, s: r.r(0.8, 2) }), 1));
  zn_fill(rng, def, 'rock', 500, (x, z, r) => ({ x, z, s: r.r(0.6, 2.4), tint: 0x7a8068 }), 3);
  wdMotes({ color: 0xe8f080, n: 500, size: 0.22, r: 50, h: 14, opacity: 0.7, glow: true, vy: 0.25, drift: 0.3 });
}
registerZone({
  id: 'greenhollow', name: 'Greenhollow', kind: 'outdoor', lvl: [15, 30], size: 1400, safe: false, music: 'tense', entry: 'greenhollow_arrive_w',
  atmos: { fog: 0x9aae88, near: 60, far: 520, horizon: 0xb4c49a, zenith: 0x5f8a84, sunColor: 0xf4f0c4, sunInt: 0.85, hemiSky: 0xc0d8b0, hemiGround: 0x3a4a28, hemiInt: 0.8, sunDir: [0.3, 0.75, -0.4], clouds: 1.0 },
  campStyle: 'cultist', waterCol: 0x4a5a38,
  roads: [{ pts: [[-690, 0], [-450, 20], [-200, -40], [0, -80], [200, -60], [400, -120], [690, -150]], w: 8 }, { pts: [[200, -60], [300, 40], [395, 120]], w: 6 }],
  doors: [ctDoorRec('gh_md1', -480, -180, 1.4), ctDoorRec('gh_md2', -60, 30, 0.2), ctDoorRec('gh_md3', 260, 260, -2.6), ctDoorRec('gh_md4', 540, -320, 2.3), ctDoorRec('gh_md5', -520, 380, 0.8)],
  areas: [
    { name: 'Mirewater Bog', x: -260, z: 230, r: 220, label: true }, { name: 'Spore Fields', x: 90, z: -300, r: 170, label: true },
    { name: 'Shrine of the Lattice-Born', x: 430, z: 140, r: 70, label: true }, { name: 'Processor Nine', x: -330, z: -320, r: 70, label: true },
  ],
  spawns: [
    { x: -400, z: 160, r: 60, mobs: ['mire_lurker'], n: 5, lvl: [15, 18], respawn: 75 },
    { x: -220, z: 260, r: 70, mobs: ['mire_lurker'], n: 5, lvl: [17, 20], respawn: 75 },
    { x: -120, z: 380, r: 50, mobs: ['mire_lurker'], n: 4, lvl: [19, 22], respawn: 75 },
    { x: 20, z: -260, r: 60, mobs: ['spore_beetle'], n: 5, lvl: [18, 21], respawn: 80 },
    { x: 170, z: -340, r: 60, mobs: ['spore_beetle'], n: 5, lvl: [21, 24], respawn: 80 },
    { x: 110, z: -190, r: 45, mobs: ['spore_beetle'], n: 4, lvl: [22, 25], respawn: 80 },
    { x: -480, z: -60, r: 60, mobs: ['thornback'], n: 4, lvl: [20, 23], respawn: 80 },
    { x: -200, z: -170, r: 60, mobs: ['thornback'], n: 4, lvl: [22, 25], respawn: 80 },
    { x: 280, z: -40, r: 60, mobs: ['thornback'], n: 4, lvl: [25, 28], respawn: 80 },
    { x: -330, z: -400, r: 50, mobs: ['feral_mutant'], n: 4, lvl: [22, 26], respawn: 90 },
    { x: 470, z: -330, r: 60, mobs: ['feral_mutant'], n: 4, lvl: [26, 30], respawn: 90 },
    { x: 430, z: 140, r: 22, mobs: ['lumen_cultist'], n: 5, lvl: [24, 27], camp: true, respawn: 100 },
    { x: 500, z: 230, r: 20, mobs: ['lumen_cultist'], n: 4, lvl: [26, 29], camp: true, respawn: 100 },
    { x: 360, z: 240, r: 20, mobs: ['lumen_cultist'], n: 4, lvl: [28, 30], camp: true, respawn: 100 },
  ],
  pois: [
    zn_poi('greenhollow_arrive_w', 'arrive', -650, 2, Math.PI / 2, 'Dustbowl Track'),
    zn_poi('greenhollow_arrive_e', 'arrive', 650, -148, -Math.PI / 2, 'Mesa Pass'),
    zn_poi('greenhollow_npc_ranger', 'npc', -600, 20, Math.PI / 2, 'Ranger Wen Ashby', { role: 'flavour' }),
    zn_poi('greenhollow_npc_botanist', 'npc', -280, -280, 2.0, 'Dr. Imke Sorensen', { role: 'flavour' }),
  ],
  exits: [
    { x: -686, z: 0, r: 12, to: 'dustbowl', poi: 'dustbowl_arrive_green', label: 'Dustbowl Flats' },
    { x: 686, z: -150, r: 12, to: 'broken_mesa', poi: 'mesa_arrive_w', label: 'Broken Mesa' },
  ],
  build: zn_ghBuild,
});

// =====================================================================
// Broken Mesa (25-40)
// =====================================================================
const ZN_BM_CANYONS = [
  { pts: [[-790, 0], [-560, 10], [-380, -20], [-220, 10], [-100, 20]], w: 64 },
  { pts: [[-100, 20], [60, -60], [220, -150], [420, -240], [600, -300], [790, -300]], w: 62 },
  { pts: [[-100, 20], [-60, 180], [60, 300], [230, 420]], w: 56 },
  { pts: [[-220, 10], [-200, -200], [-170, -440]], w: 50 },
  { pts: [[60, -60], [250, 60], [420, 220]], w: 52 },
  { pts: [[-380, -20], [-500, -250], [-560, -420]], w: 36 }, { pts: [[230, 420], [450, 520]], w: 36 },
  { pts: [[420, -240], [500, -50]], w: 34 }, { pts: [[-60, 180], [-300, 330], [-420, 480]], w: 40 },
];
const ZN_BM_BASINS = [{ x: -100, z: 20, r: 120 }, { x: 420, z: 220, r: 90 }, { x: -170, z: -460, r: 70 }, { x: 235, z: 430, r: 62 }, { x: 600, z: -300, r: 50 }];
function zn_bmCanyon(x, z) {
  let d = wdRoadDist(x, z, ZN_BM_CANYONS);
  for (const b of ZN_BM_BASINS) d = Math.min(d, Math.hypot(x - b.x, z - b.z) - b.r);
  return d + (vnoise(x * 0.012, z * 0.012) - 0.5) * 26;
}
function zn_bmBuild(def) {
  const rng = makeRng(strSeed('broken_mesa'));
  wdTerrain({
    cell: 6, margin: 200,
    height: (x, z) => {
      const top = 64 + 12 * fbm(x * 0.004, z * 0.004, 3), fl = 6 + 4 * fbm(x * 0.012, z * 0.012, 2);
      const t = smooth(-2, 34, zn_bmCanyon(x, z));
      const s = t * 3, k = Math.floor(s), fr = s - k;
      const st = Math.min(1, (k + smooth(0.55, 0.95, fr)) / 3);
      return fl + (top - fl) * lerp(t, st, 0.75) + (t > 0.98 ? 3 * ridged(x * 0.01, z * 0.01, 2) : 0);
    },
    flats: [{ x: -100, z: 20, r: 70, fall: 40 }, ...def.doors.map((d) => ({ x: d.bx, z: d.bz, r: 10, fall: 14 }))],
    color: (x, y, z, ny, out) => {
      const n = vnoise(x * 0.03, z * 0.03);
      let c;
      if (ny < 0.85) { const b = Math.sin(y * 0.55 + n * 1.5); c = b > 0.4 ? wdC(0xb85a38) : b > -0.3 ? wdC(0xd08a58) : wdC(0x9a4a30); }
      else if (y > 50) c = wdMix(0x8a4a30, 0x9a6a48, n);
      else c = wdMix(0xc87a50, 0xd8946a, n);
      zn_set(c, out);
    },
    roadCol: 0xb0805a, roadFlat: false,
  });
  // Mesa Outpost
  const og = groundY(-100, 20);
  ctHut(-130, -10, 0.5, { w: 14, d: 10, h: 5, style: 'prefab', y: og - 0.1, stripe: 0xff8a3a });
  ctHut(-70, -15, -0.6, { w: 12, d: 9, h: 4.5, style: 'prefab', y: og - 0.1 });
  ctHut(-132, 50, 2.6, { w: 12, d: 9, h: 4.5, style: 'scrap', y: og - 0.1 });
  const hy = ctPad(-70, 55, 14, og, 0x8fc8ff);
  ctHopperCraft(-70, hy + 7, 55, 1.0);
  ctTank(-150, 18, 4, 10, 0xc8b8a0, og - 0.3);
  ctFence([[-160, -40], [-40, -40], [-30, 0]]); ctFence([[-160, -40], [-165, 70], [-120, 85]]);
  for (const [x, z] of [[-110, 0], [-80, 30], [-140, 30], [-50, 10]]) ctLamp(x, z, 5.5, 0xffb347, true);
  // radio mast on the mesa top above the outpost
  const mx = -150, mz = -110, mg = groundY(mx, mz);
  wdBox(mx, mg, mz, 0.7, 30, 0.7, 0x55595e); wdBox(mx, mg + 30, mz, 1, 1, 1, 0xff5040, 0, 'glow');
  // Sunken Foundry gate in the south cliff
  zn_bunkerGate(240, 490, Math.PI, 0xff8a3a);
  zn_arch(-424, -52, -396, 36, 16);
  zn_doors(def, 'scrap');
  // canyon raider stockade
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; if (Math.abs(angWrap(a + Math.PI / 2)) < 0.35) continue; const x = -170 + Math.cos(a) * 48, z = -460 + Math.sin(a) * 48, g = groundY(x, z); if (g > 25) continue; wdSolid(x, g - 0.5, z, 20, 3.4, 0.9, i % 2 ? 0x8a4a2c : 0x6a5040, -a + Math.PI / 2, 0x5a3a28); }
  const floor = (x, z) => groundY(x, z) < 22;
  zn_fill(rng, def, 'hoodoo', 260, (x, z, r) => (floor(x, z) && zn_bmCanyon(x, z) > 4 ? { x, z, s: r.r(2, 5), sy: r.r(2.5, 6) } : null), 6);
  zn_fill(rng, def, 'rock', 1300, (x, z, r) => ({ x, z, s: r.r(0.6, 2.6) * (r.chance(0.1) ? 3 : 1), tint: r.chance(0.5) ? 0xa85a3a : 0x8a5038 }), 3);
  zn_fill(rng, def, 'shrub', 900, (x, z, r) => ({ x, z, s: r.r(0.6, 1.3), tint: 0xa09060 }), 3);
  zn_fill(rng, def, 'deadtree', 160, (x, z, r) => (floor(x, z) ? { x, z, s: r.r(3, 6), tint: 0x9a8a7a } : null), 4);
  zn_fill(rng, def, 'scrap', 80, (x, z, r) => (floor(x, z) ? { x, z, s: r.r(1, 2.4) } : null), 3);
  zn_fill(rng, def, 'lumen', 120, (x, z, r) => (floor(x, z) && x > 0 ? { x, z, s: r.r(0.8, 1.8), glowTint: 0xffa060 } : null), 3);
  wdMotes({ color: 0xf0b080, n: 380, size: 0.2, r: 55, h: 16, opacity: 0.5, drift: 1.2 });
}
registerZone({
  id: 'broken_mesa', name: 'Broken Mesa', kind: 'outdoor', lvl: [25, 40], size: 1500, safe: false, music: 'tense', entry: 'mesa_arrive_w',
  atmos: { fog: 0xc88e66, near: 120, far: 760, horizon: 0xeaa274, zenith: 0x56588a, sunColor: 0xffb878, sunInt: 1.1, hemiSky: 0xd8b0a0, hemiGround: 0x6a3a28, hemiInt: 0.72, sunDir: [0.7, 0.38, -0.25], clouds: 0.55 },
  campStyle: 'canyon',
  roads: [
    { pts: [[-745, 0], [-560, 10], [-380, -20], [-220, 10], [-100, 20]], w: 8 }, { pts: [[-100, 20], [60, -60], [220, -150], [420, -240], [600, -300], [745, -300]], w: 8 },
    { pts: [[-100, 20], [-60, 180], [60, 300], [235, 455]], w: 7 },
  ],
  doors: [ctDoorRec('bm_md1', -560, -12, 2.9), ctDoorRec('bm_md2', 245, 66, 2.6), ctDoorRec('bm_md3', -210, -230, 1.6), ctDoorRec('bm_md4', 80, 286, -0.9), ctDoorRec('bm_md5', -300, 352, 2.2)],
  areas: [
    { name: 'Mesa Outpost', x: -100, z: 20, r: 90, label: true }, { name: 'The Sunken Foundry', x: 240, z: 470, r: 60, label: true },
    { name: 'Redcut Stockade', x: -170, z: -460, r: 70, label: true }, { name: 'Golem Hollow', x: 420, z: 220, r: 90, label: true },
    { name: "Wind's Arch", x: -410, z: -10, r: 50, label: true },
  ],
  spawns: [
    { x: -480, z: 0, r: 50, mobs: ['mesa_stalker'], n: 4, lvl: [25, 28], respawn: 80 },
    { x: -260, z: 0, r: 40, mobs: ['mesa_stalker'], n: 4, lvl: [27, 30], respawn: 80 },
    { x: 120, z: -90, r: 45, mobs: ['mesa_stalker'], n: 4, lvl: [29, 32], respawn: 80 },
    { x: -170, z: -460, r: 22, mobs: ['canyon_raider'], n: 5, lvl: [28, 32], camp: true, respawn: 100 },
    { x: -190, z: -300, r: 22, mobs: ['canyon_raider'], n: 4, lvl: [31, 34], camp: true, respawn: 100 },
    { x: -140, z: -500, r: 14, mobs: ['canyon_raider'], n: 3, lvl: [33, 36], respawn: 100 },
    { x: 380, z: 200, r: 55, mobs: ['rock_golem'], n: 4, lvl: [30, 34], respawn: 90 },
    { x: 460, z: 250, r: 45, mobs: ['rock_golem'], n: 4, lvl: [33, 38], respawn: 90 },
    { x: 0, z: 240, r: 45, mobs: ['hover_sentry'], n: 4, lvl: [32, 36], respawn: 90 },
    { x: 180, z: 390, r: 40, mobs: ['hover_sentry'], n: 4, lvl: [35, 40], respawn: 90 },
    { x: 420, z: -240, r: 50, mobs: ['brute_mutant'], n: 3, lvl: [34, 37], respawn: 100 },
    { x: 610, z: -300, r: 45, mobs: ['brute_mutant'], n: 3, lvl: [37, 40], respawn: 100 },
    { x: -100, z: 10, r: 4, mobs: ['guard'], n: 2, lvl: [60, 60], respawn: 60 },
  ],
  pois: [
    zn_poi('mesa_arrive_w', 'arrive', -700, 4, Math.PI / 2, 'Greenhollow Pass'),
    zn_poi('mesa_arrive_e', 'arrive', 700, -300, -Math.PI / 2, 'Scar Road'),
    zn_poi('mesa_clonebay', 'clonebay', -112, 2, 0.5, 'Mesa Outpost Clone Bay'),
    zn_poi('mesa_vendor', 'vendor', -84, 2, -0.6, 'Trader Sol Ferreira', { role: 'general' }),
    zn_poi('mesa_terminal', 'terminal', -100, 30, Math.PI, 'Mission Terminal'),
    zn_poi('mesa_hopper', 'hopper', -88, 48, -Math.PI / 2, 'Hopper Controller Ada Quist', { data: { destinations: [{ zone: 'halden', poi: 'halden_hopper_arrive', name: 'Halden Crossing', cost: 120 }, { zone: 'lumen_scar', poi: 'scar_hopper_arrive', name: 'Scar Outpost', cost: 160 }] } }),
    zn_poi('mesa_hopper_arrive', 'arrive', -92, 62, Math.PI / 2, 'Mesa Hopper Pad'),
    zn_poi('mesa_foundry_door', 'door', 240, 486, 0, 'Sunken Foundry', { data: { to: 'sunken_foundry', poi: 'foundry_arrive' }, clear: 10 }),
    zn_poi('mesa_foundry_out', 'arrive', 236, 470, Math.PI, 'Foundry Gate'),
    zn_poi('mesa_npc_warden', 'npc', -120, 34, 1.2, 'Outrider Kasia Dunmore', { role: 'flavour' }),
  ],
  exits: [
    { x: -736, z: 0, r: 12, to: 'greenhollow', poi: 'greenhollow_arrive_e', label: 'Greenhollow' },
    { x: 736, z: -300, r: 12, to: 'lumen_scar', poi: 'scar_arrive_w', label: 'Lumen Scar' },
  ],
  build: zn_bmBuild,
});

// =====================================================================
// Lumen Scar (35-50)
// =====================================================================
const ZN_LS = {
  craters: [{ x: 560, z: 470, r: 120, d: 20 }, { x: 120, z: -220, r: 70, d: 10 }, { x: -380, z: -60, r: 50, d: 8 }, { x: 330, z: 420, r: 40, d: 6 }, { x: -200, z: 560, r: 60, d: 8 }],
  fields: [{ id: 'alpha', name: 'Pylon Field Alpha', x: -250, z: -380, faction: 'meridian' }, { id: 'beta', name: 'Pylon Field Beta', x: 280, z: 80, faction: 'freehold' }, { id: 'gamma', name: 'Pylon Field Gamma', x: 480, z: -420, faction: 'unaligned' }],
  out: { x: -560, z: 380 },
};
function zn_lsBuild(def) {
  const rng = makeRng(strSeed('lumen_scar'));
  wdTerrain({
    cell: 7, margin: 200,
    height: (x, z) => {
      let h = 4 + 14 * fbm(x * 0.003, z * 0.003, 4) + 16 * Math.pow(ridged(x * 0.004 + 9, z * 0.004, 3), 3);
      for (const c of ZN_LS.craters) {
        const d = Math.hypot(x - c.x, z - c.z) / c.r;
        if (d < 1.6) h += d < 1 ? -c.d * (1 - d * d) + c.d * 0.35 * d * d * d : c.d * 0.35 * (1 - smooth(1, 1.6, d));
      }
      return h;
    },
    flats: [{ ...ZN_LS.out, r: 60, fall: 40 }, ...ZN_LS.fields.map((f) => ({ x: f.x, z: f.z, r: 45, fall: 40 })), { x: -80, z: 420, r: 30, fall: 25 }, ...def.doors.map((d) => ({ x: d.bx, z: d.bz, r: 10, fall: 14 }))],
    edge: { h: 70, w: 110, gap: 45 },
    color: (x, y, z, ny, out) => {
      const n = vnoise(x * 0.02, z * 0.02);
      let c = wdMix(0x3a3440, 0x4a4250, n);
      if (ny < 0.85) c = wdMix(c, 0x2a2630, 0.6);
      const v = ridged(x * 0.009 + 3, z * 0.009, 2), vg = smooth(0.84, 0.94, v);
      c = wdMix(c, 0x5e5866, smooth(0.62, 0.78, vnoise(x * 0.01 + 5, z * 0.01)) * 0.7);
      let g = 0;
      if (vg > 0) { c = wdMix(c, (vnoise(x * 0.004, z * 0.004) > 0.5 ? 0x7ff0e0 : 0xb080ff), vg); g = vg * 0.8; }
      const cr = ZN_LS.craters[0], dc = Math.hypot(x - cr.x, z - cr.z);
      if (dc < cr.r) { c = wdMix(c, 0x6a4a8a, 0.4 * (1 - dc / cr.r)); g = Math.max(g, 0.25 * (1 - dc / cr.r)); }
      zn_set(c, out, g);
    },
    roadCol: 0x5a5260,
  });
  const O = ZN_LS.out, og = groundY(O.x, O.z);
  ctHut(-585, 360, 0.3, { w: 14, d: 10, h: 5, style: 'bunker', y: og - 0.1, doorGlow: 0xb080ff });
  ctHut(-530, 350, -0.3, { w: 12, d: 9, h: 4.5, style: 'bunker', y: og - 0.1 });
  const hy = ctPad(-540, 412, 13, og, 0x8fc8ff);
  ctHopperCraft(-540, hy + 7, 412, 2.2);
  ctFence([[-620, 330], [-500, 330], [-495, 350]], 3.2, 0x7a7f88); ctFence([[-620, 330], [-622, 450], [-590, 452]], 3.2, 0x7a7f88);
  for (const [x, z] of [[-600, 380], [-560, 360], [-520, 380], [-580, 420]]) ctLamp(x, z, 6, 0xb080ff, true);
  for (const f of ZN_LS.fields) ctPylon(f.x, f.z, f.faction);
  // the Colossus' crater rim: broken Meridian machinery
  for (let i = 0; i < 6; i++) { const a = i * 1.1, x = 560 + Math.cos(a) * 130, z = 470 + Math.sin(a) * 130, g = groundY(x, z); wdTBox(x, g + 2, z, 6, 4, 12, 0x55595e, a, 0.2, 0.3); }
  zn_doors(def, 'bunker');
  zn_fill(rng, def, 'spire', 420, (x, z, r) => (zn_slope(x, z) < 0.6 ? { x, z, s: r.r(1.5, 4.5), sy: r.r(2, 6), glowTint: r.chance(0.55) ? 0xb080ff : 0x6ff0e0, tint: 0x8a80a0 } : null), 6);
  zn_fill(rng, def, 'lumen', 1300, (x, z, r) => ({ x, z, s: r.r(0.8, 2.4), glowTint: r.chance(0.5) ? 0xc090ff : 0x7ff0e0, tint: 0x8a80a0 }), 2);
  zn_fill(rng, def, 'rock', 1000, (x, z, r) => ({ x, z, s: r.r(0.6, 2.6) * (r.chance(0.08) ? 3 : 1), tint: 0x5a5262 }), 3);
  zn_fill(rng, def, 'deadtree', 120, (x, z, r) => ({ x, z, s: r.r(3, 6), tint: 0x6a6070 }), 4);
  zn_fill(rng, def, 'scrap', 120, (x, z, r) => ({ x, z, s: r.r(1, 2.5), tint: 0x8a8aa0 }), 3);
  wdMotes({ color: 0xb090ff, n: 500, size: 0.25, r: 55, h: 18, opacity: 0.8, glow: true, vy: 0.4, drift: 0.2 });
}
registerZone({
  id: 'lumen_scar', name: 'Lumen Scar', kind: 'outdoor', lvl: [35, 50], size: 1600, safe: false, pvp: true, music: 'tense', entry: 'scar_arrive_w',
  atmos: { fog: 0x2c2444, near: 70, far: 620, horizon: 0x4e3e70, zenith: 0x100c24, sunColor: 0xb8a8ff, sunInt: 0.62, hemiSky: 0x7a70b0, hemiGround: 0x241c34, hemiInt: 0.7, sunDir: [-0.3, 0.6, -0.5], clouds: 0.4 },
  campStyle: 'deserter',
  roads: [
    { pts: [[-790, 300], [-640, 330], [-560, 380]], w: 8 }, { pts: [[-560, 380], [-300, 200], [-260, -330]], w: 8 },
    { pts: [[-300, 200], [230, 100]], w: 7 }, { pts: [[280, 80], [450, -380]], w: 7 },
  ],
  doors: [ctDoorRec('ls_md1', -420, 120, 1.1), ctDoorRec('ls_md2', 0, -100, 0.4), ctDoorRec('ls_md3', 120, 330, -1.6), ctDoorRec('ls_md4', 620, -120, -2.2), ctDoorRec('ls_md5', -560, -300, 0.9)],
  areas: [
    { name: 'Scar Outpost', x: -560, z: 380, r: 80, label: true }, ...ZN_LS.fields.map((f) => ({ name: f.name, x: f.x, z: f.z, r: 70, label: true })),
    { name: "Colossus' Crater", x: 560, z: 470, r: 130, label: true }, { name: 'Deserter Camp', x: -80, z: 420, r: 50, label: true },
  ],
  spawns: [
    { x: -380, z: 220, r: 60, mobs: ['lumen_wisp'], n: 5, lvl: [36, 40], respawn: 90 },
    { x: -60, z: 120, r: 60, mobs: ['lumen_wisp'], n: 5, lvl: [38, 42], respawn: 90 },
    { x: -420, z: -160, r: 55, mobs: ['lumen_wisp'], n: 5, lvl: [40, 44], respawn: 90 },
    { x: 100, z: -220, r: 60, mobs: ['scar_worm'], n: 4, lvl: [40, 44], respawn: 100 },
    { x: 560, z: -160, r: 70, mobs: ['scar_worm'], n: 4, lvl: [44, 48], respawn: 100 },
    { x: -80, z: 420, r: 22, mobs: ['deserter'], n: 5, lvl: [40, 44], camp: true, respawn: 100 },
    { x: 10, z: 500, r: 20, mobs: ['deserter'], n: 4, lvl: [44, 48], camp: true, respawn: 100 },
    { x: 150, z: 0, r: 260, mobs: ['scar_titan'], n: 1, lvl: [45, 50], respawn: 900 },
    { x: 560, z: 470, r: 15, mobs: ['colossus'], n: 1, lvl: [55, 55], respawn: 1800 },
    { x: -560, z: 380, r: 4, mobs: ['guard'], n: 2, lvl: [60, 60], respawn: 60 },
  ],
  pois: [
    zn_poi('scar_arrive_w', 'arrive', -748, 302, Math.PI / 2, 'Mesa Road'),
    zn_poi('scar_clonebay', 'clonebay', -582, 377, Math.PI / 2, 'Scar Outpost Clone Bay'),
    zn_poi('scar_vendor', 'vendor', -534, 366, -0.3, 'Sutler Mara Okonkwo', { role: 'general' }),
    zn_poi('scar_terminal', 'terminal', -556, 392, 0, 'Mission Terminal'),
    zn_poi('scar_hopper', 'hopper', -560, 410, Math.PI / 2, 'Hopper Controller Ivo Brask', { data: { destinations: [{ zone: 'halden', poi: 'halden_hopper_arrive', name: 'Halden Crossing', cost: 240 }, { zone: 'broken_mesa', poi: 'mesa_hopper_arrive', name: 'Mesa Outpost', cost: 160 }] } }),
    zn_poi('scar_hopper_arrive', 'arrive', -545, 390, Math.PI, 'Scar Hopper Pad'),
    ...ZN_LS.fields.map((f) => zn_poi('scar_pylon_' + f.id, 'pylon', f.x + 12, f.z + 12, Math.PI / 4, f.name, { data: { faction: f.faction, field: f.id }, noProp: true, clear: 12 })),
    zn_poi('scar_npc_arbiter', 'npc', -520, 395, -2.2, 'Concord Observer Tamsin Vale', { role: 'flavour' }),
  ],
  exits: [{ x: -786, z: 300, r: 12, to: 'broken_mesa', poi: 'mesa_arrive_e', label: 'Broken Mesa' }],
  build: zn_lsBuild,
});
