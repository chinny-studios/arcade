// Willow Lane — low-poly models: furniture (one builder per catalog id), sims with a jointed rig and poses, cars, items

// ---------- primitive helpers ----------
const GEO = {};
const boxGeo = (w, h, d) => GEO['b' + w + ',' + h + ',' + d] || (GEO['b' + w + ',' + h + ',' + d] = new THREE.BoxGeometry(w, h, d));
const cylGeo = (rt, rb, h, n = 12) => GEO['c' + rt + ',' + rb + ',' + h + ',' + n] || (GEO['c' + rt + ',' + rb + ',' + h + ',' + n] = new THREE.CylinderGeometry(rt, rb, h, n));
const sphGeo = (r, n = 12, m = 10) => GEO['s' + r + ',' + n + ',' + m] || (GEO['s' + r + ',' + n + ',' + m] = new THREE.SphereGeometry(r, n, m));
function box(g, w, h, d, color, x = 0, y = 0, z = 0, opts) {
  const m = new THREE.Mesh(boxGeo(w, h, d), typeof color === 'object' ? color : mat(color, opts));
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
function cyl(g, rt, rb, h, color, x = 0, y = 0, z = 0, n = 12) {
  const m = new THREE.Mesh(cylGeo(rt, rb, h, n), typeof color === 'object' ? color : mat(color));
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
function sph(g, r, color, x = 0, y = 0, z = 0, n = 12) {
  const m = new THREE.Mesh(sphGeo(r, n, Math.max(6, n - 2)), typeof color === 'object' ? color : mat(color));
  m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
}
const glowMat = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || c, emissiveIntensity: 0 });

const WOOD = 0xb8875a, WOOD_D = 0x6e4a30, WHITE = 0xf2f0ea, STEEL = 0xc8ccd0, DARK = 0x2a2c30, FABRIC = 0x5a7aa0;

// ---------- furniture ----------
// Each builder returns a group centred on its footprint with the front toward +z, sized in metres.
const MODELS = {
  chair(g) { legs4(g, 0.38, 0.38, 0.44, WOOD_D); box(g, 0.44, 0.06, 0.44, WOOD, 0, 0.42, 0); box(g, 0.44, 0.5, 0.05, WOOD, 0, 0.48, -0.2); },
  chair_modern(g) { legs4(g, 0.36, 0.36, 0.44, STEEL, 0.015); box(g, 0.46, 0.06, 0.44, 0xe8683a, 0, 0.42, 0); const b = box(g, 0.46, 0.42, 0.05, 0xe8683a, 0, 0.5, -0.2); b.rotation.x = -0.12; },
  armchair(g) { box(g, 0.8, 0.36, 0.78, 0x8a5a7a, 0, 0.06, 0); box(g, 0.8, 0.5, 0.18, 0x8a5a7a, 0, 0.3, -0.31); box(g, 0.14, 0.26, 0.7, 0x7a4a6a, -0.34, 0.36, 0.02); box(g, 0.14, 0.26, 0.7, 0x7a4a6a, 0.34, 0.36, 0.02); box(g, 0.56, 0.1, 0.56, 0x9a6a8a, 0, 0.38, 0.06); legs4(g, 0.66, 0.6, 0.06, WOOD_D); },
  loveseat(g) { sofa(g, 2, 0x8a6a40); },
  sofa(g) { sofa(g, 3, 0x4a6a8a); },
  bench(g) { for (const x of [-0.85, 0.85]) { box(g, 0.08, 0.44, 0.5, DARK, x, 0, 0); box(g, 0.08, 0.5, 0.08, DARK, x, 0.44, -0.22); } for (let i = 0; i < 4; i++) box(g, 1.8, 0.04, 0.1, WOOD, 0, 0.42, -0.18 + i * 0.12); for (let i = 0; i < 3; i++) box(g, 1.8, 0.09, 0.03, WOOD, 0, 0.56 + i * 0.12, -0.24); },
  bed_single(g) { bed(g, 1, 0x6a8ac0); },
  bed_double(g) { bed(g, 2, 0xc06a6a); },
  bed_kids(g) {
    bed(g, 1, 0x3a8ae0);
    const r = cyl(g, 0.12, 0.12, 0.9, 0xe04040, 0.36, 0.45, -0.7, 10); r.rotation.z = 0; cyl(g, 0, 0.12, 0.3, 0xf0f0f0, 0.36, 1.35, -0.7, 10);
    for (const s of [-1, 1]) box(g, 0.02, 0.2, 0.2, 0xe8c840, 0.36 + s * 0.12, 0.45, -0.7);
  },
  crib(g) {
    const b = cyl(g, 0.38, 0.3, 0.42, 0xd8b880, 0, 0.3, 0, 14); b.material = mat(0xd8b880);
    cyl(g, 0.34, 0.34, 0.06, 0xf4f0f8, 0, 0.66, 0, 14);
    for (const x of [-0.25, 0.25]) for (const z of [-0.25, 0.25]) cyl(g, 0.02, 0.02, 0.32, WOOD_D, x, 0, z, 6);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 8, 0, Math.PI, 0, Math.PI / 2), mat(0xd8b880, { side: THREE.DoubleSide }));
    hood.position.set(0, 0.72, -0.05); hood.rotation.y = Math.PI; hood.rotation.x = -0.4; g.add(hood);
  },
  counter(g) { counter(g, WOOD, 0xe8d8b8); },
  counter_marble(g) { counter(g, 0x5a6a7a, 0xf4f2ee); },
  table(g) { legs4(g, 1.7, 0.7, 0.72, WOOD_D, 0.05); box(g, 1.9, 0.06, 0.86, WOOD, 0, 0.72, 0); },
  table_round(g) { cyl(g, 0.04, 0.04, 0.7, DARK, 0, 0.02, 0, 8); cyl(g, 0.25, 0.25, 0.03, DARK, 0, 0, 0, 12); cyl(g, 0.42, 0.42, 0.05, 0xe8e4dc, 0, 0.72, 0, 20); },
  coffee_table(g) { legs4(g, 1.3, 0.5, 0.36, WOOD_D, 0.04); box(g, 1.5, 0.06, 0.66, WOOD, 0, 0.36, 0); box(g, 1.3, 0.03, 0.5, WOOD_D, 0, 0.12, 0); },
  end_table(g) { legs4(g, 0.4, 0.4, 0.55, WOOD_D, 0.035); box(g, 0.5, 0.06, 0.5, WOOD, 0, 0.55, 0); },
  desk(g) {
    // desk on the back tile, chair on the front tile facing back
    legs4(g, 0.82, 0.5, 0.72, WOOD_D, 0.035, 0, -0.5); box(g, 0.94, 0.05, 0.62, WOOD, 0, 0.72, -0.48); box(g, 0.3, 0.3, 0.55, WOOD, 0.3, 0.42, -0.5);
    box(g, 0.24, 0.02, 0.32, WHITE, -0.12, 0.77, -0.45); box(g, 0.08, 0.08, 0.08, 0x3a7ac8, 0.25, 0.77, -0.6);
    deskChair(g, 0.5);
  },
  fridge(g) { box(g, 0.78, 1.86, 0.72, 0xe8ecee, 0, 0, -0.08); box(g, 0.76, 0.02, 0.02, 0x9aa0a6, 0, 1.25, 0.29); box(g, 0.04, 0.4, 0.04, 0x9aa0a6, -0.3, 1.36, 0.31); box(g, 0.04, 0.5, 0.04, 0x9aa0a6, -0.3, 0.6, 0.31); },
  stove(g) {
    box(g, 0.86, 0.9, 0.7, 0xe8e8ea, 0, 0, -0.06); box(g, 0.86, 0.02, 0.7, DARK, 0, 0.9, -0.06);
    for (const x of [-0.2, 0.2]) for (const z of [-0.22, 0.1]) cyl(g, 0.11, 0.11, 0.015, 0x444448, x, 0.92, z, 14);
    box(g, 0.66, 0.42, 0.02, 0x30343a, 0, 0.18, 0.3); box(g, 0.5, 0.03, 0.03, STEEL, 0, 0.68, 0.31);
    box(g, 0.86, 0.18, 0.06, 0xe8e8ea, 0, 0.92, -0.38);
  },
  ksink(g) {
    counter(g, 0xf0ece0, 0xc8ccd0);
    box(g, 0.56, 0.02, 0.4, 0x8a9096, 0, 0.905, -0.04);
    const f = cyl(g, 0.02, 0.02, 0.28, STEEL, 0, 0.9, -0.32, 6); const sp = box(g, 0.03, 0.03, 0.18, STEEL, 0, 1.15, -0.24); sp.position.y = 1.17;
  },
  trash(g) { cyl(g, 0.18, 0.16, 0.5, 0xb8bcc2, 0, 0, 0, 14); cyl(g, 0.19, 0.19, 0.04, 0x8a9096, 0, 0.5, 0, 14); },
  toilet(g) {
    box(g, 0.4, 0.4, 0.2, WHITE, 0, 0.4, -0.3); cyl(g, 0.16, 0.12, 0.4, WHITE, 0, 0, 0.02, 14);
    const seat = cyl(g, 0.2, 0.2, 0.05, WHITE, 0, 0.4, 0.04, 16); seat.scale.z = 1.25;
    box(g, 0.08, 0.03, 0.03, STEEL, 0.12, 0.72, -0.19);
  },
  shower(g) {
    box(g, 0.9, 0.08, 0.9, 0xe8eef2, 0, 0, 0);
    const glass = new THREE.MeshLambertMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.32, depthWrite: false });
    box(g, 0.02, 2.0, 0.9, glass, -0.44, 0.08, 0); box(g, 0.02, 2.0, 0.9, glass, 0.44, 0.08, 0); box(g, 0.88, 2.0, 0.02, glass, 0, 0.08, 0.44);
    box(g, 0.9, 2.08, 0.04, 0xe0e8ec, 0, 0, -0.44);
    for (const x of [-0.44, 0.44]) box(g, 0.04, 2.08, 0.04, STEEL, x, 0, 0.44);
    cyl(g, 0.012, 0.012, 0.3, STEEL, 0, 1.85, -0.38, 6); cyl(g, 0.08, 0.06, 0.03, STEEL, 0, 1.95, -0.25, 10);
  },
  tub(g) {
    const outer = box(g, 0.78, 0.5, 1.8, WHITE, 0, 0.14, 0); box(g, 0.62, 0.02, 1.62, 0xbfe4f4, 0, 0.6, 0);
    for (const x of [-0.3, 0.3]) for (const z of [-0.75, 0.75]) sph(g, 0.06, 0xd8b048, x, 0.07, z, 8);
    cyl(g, 0.02, 0.02, 0.3, STEEL, 0, 0.6, -0.84, 6);
  },
  sink(g) { cyl(g, 0.09, 0.12, 0.78, WHITE, 0, 0, -0.08, 12); const b = cyl(g, 0.28, 0.2, 0.14, WHITE, 0, 0.76, -0.04, 16); b.scale.z = 0.8; cyl(g, 0.015, 0.015, 0.16, STEEL, 0, 0.88, -0.24, 6); },
  tv(g) {
    box(g, 0.8, 0.5, 0.5, WOOD_D, 0, 0, -0.1);
    box(g, 0.66, 0.5, 0.42, 0x3a3c40, 0, 0.5, -0.12);
    const scr = box(g, 0.56, 0.4, 0.02, glowMat(0x1a2028, 0x8ab8ff), 0, 0.55, 0.1); scr.userData.screen = true;
  },
  tv_big(g) {
    box(g, 1.7, 0.45, 0.45, 0x30302e, 0, 0, -0.15);
    box(g, 0.1, 0.18, 0.08, DARK, 0, 0.45, -0.2);
    box(g, 1.62, 0.92, 0.06, DARK, 0, 0.6, -0.2);
    const scr = box(g, 1.54, 0.84, 0.01, glowMat(0x1a2028, 0x8ab8ff), 0, 0.64, -0.16); scr.userData.screen = true;
  },
  computer(g) {
    legs4(g, 0.82, 0.5, 0.72, DARK, 0.03, 0, -0.5); box(g, 0.94, 0.04, 0.62, 0xe8e4dc, 0, 0.72, -0.48);
    box(g, 0.42, 0.32, 0.36, 0xe8e0c8, 0, 0.76, -0.6); const scr = box(g, 0.32, 0.24, 0.01, glowMat(0x1a2028, 0x80e0a0), 0, 0.8, -0.415); scr.userData.screen = true;
    box(g, 0.38, 0.02, 0.14, 0xd8d0b8, 0, 0.76, -0.3); box(g, 0.18, 0.4, 0.4, 0xe8e0c8, 0.34, 0, -0.55);
    deskChair(g, 0.5);
  },
  stereo(g) {
    box(g, 0.6, 0.62, 0.4, WOOD_D, 0, 0, -0.1); box(g, 0.56, 0.24, 0.3, 0x30323a, 0, 0.62, -0.1);
    for (const x of [-0.18, 0.18]) { const s = cyl(g, 0.08, 0.08, 0.02, 0x101014, x, 0.74, 0.06, 14); s.rotation.x = Math.PI / 2; s.position.y = 0.74; }
    box(g, 0.1, 0.06, 0.02, glowMat(0x2a2020, 0xff8040), 0, 0.8, 0.06).userData.screen = true;
  },
  phone(g) { box(g, 0.18, 0.3, 0.08, 0xe8d8b8, 0, 1.3, -0.44); box(g, 0.06, 0.24, 0.06, 0xd8c8a8, -0.12, 1.33, -0.42); },
  bookshelf(g) {
    box(g, 0.86, 1.9, 0.36, WOOD_D, 0, 0, -0.3);
    const cols = [0xc84a3a, 0x3a6ac8, 0xe8c040, 0x4a9a5a, 0x8a4ac8, 0xe8e0d0, 0xd87a3a];
    for (let s = 0; s < 4; s++) { box(g, 0.78, 0.02, 0.3, WOOD, 0, 0.18 + s * 0.44, -0.27); let x = -0.36; while (x < 0.32) { const w = 0.04 + Math.random() * 0.04, h = 0.24 + Math.random() * 0.12; box(g, w, h, 0.22, cols[Math.floor(Math.random() * cols.length)], x + w / 2, 0.2 + s * 0.44, -0.24); x += w + 0.005; } }
  },
  mirror(g) { const m = cyl(g, 0.3, 0.3, 0.03, 0xd8b048, 0, 0, -0.46, 20); m.rotation.x = Math.PI / 2; m.position.y = 1.45; m.scale.set(1, 1, 1.5); const gl = cyl(g, 0.26, 0.26, 0.03, glowMat(0xc8e0ee, 0xffffff), 0, 0, -0.44, 20); gl.rotation.x = Math.PI / 2; gl.position.y = 1.45; gl.scale.set(1, 1, 1.5); },
  gym(g) {
    box(g, 0.36, 0.08, 1.3, 0x2a2c34, 0, 0.42, 0.1); for (const z of [-0.4, 0.6]) box(g, 0.06, 0.42, 0.3, STEEL, 0, 0, z);
    for (const x of [-0.42, 0.42]) box(g, 0.05, 1.1, 0.05, STEEL, x, 0, -0.5);
    const bar = cyl(g, 0.02, 0.02, 1.4, STEEL, 0, 0, -0.5, 6); bar.rotation.z = Math.PI / 2; bar.position.y = 1.0;
    for (const x of [-0.6, 0.6]) { const p = cyl(g, 0.18, 0.18, 0.06, DARK, x, 0, -0.5, 14); p.rotation.z = Math.PI / 2; p.position.y = 1.0; }
  },
  chess(g) {
    cyl(g, 0.05, 0.05, 0.7, DARK, 0, 0, 0, 8); cyl(g, 0.22, 0.22, 0.03, DARK, 0, 0, 0, 12);
    box(g, 0.66, 0.05, 0.66, WOOD_D, 0, 0.7, 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) box(g, 0.13, 0.006, 0.13, (i + j) % 2 ? 0x2a2420 : 0xf0e8d8, -0.2 + i * 0.133, 0.75, -0.2 + j * 0.133);
    for (let i = 0; i < 6; i++) { cyl(g, 0.02, 0.025, 0.06, 0xf4f0e8, -0.24 + i * 0.1, 0.756, -0.25, 6); cyl(g, 0.02, 0.025, 0.06, 0x2a2420, -0.24 + i * 0.1, 0.756, 0.25, 6); }
    for (const x of [-1, 1]) { cyl(g, 0.18, 0.18, 0.06, WOOD, x, 0.4, 0, 12); cyl(g, 0.03, 0.03, 0.4, DARK, x, 0, 0, 6); }
  },
  easel(g) {
    for (const x of [-0.25, 0.25]) { const l = box(g, 0.04, 1.6, 0.04, WOOD, x, 0, 0); l.rotation.z = x > 0 ? -0.08 : 0.08; }
    const back = box(g, 0.04, 1.5, 0.04, WOOD, 0, 0, -0.3); back.rotation.x = 0.25;
    box(g, 0.6, 0.04, 0.08, WOOD, 0, 0.75, 0.02);
    const cv = box(g, 0.56, 0.6, 0.03, 0xf8f6f0, 0, 0.8, 0.0); cv.userData.canvas = true;
  },
  piano(g) {
    box(g, 1.5, 1.2, 0.5, 0x2a1a14, 0, 0, -0.22); box(g, 1.5, 0.06, 0.32, 0x2a1a14, 0, 0.7, 0.16);
    box(g, 1.3, 0.03, 0.16, WHITE, 0, 0.74, 0.12); for (let i = 0; i < 18; i++) if (i % 7 !== 2 && i % 7 !== 6) box(g, 0.03, 0.03, 0.09, DARK, -0.6 + i * 0.07, 0.77, 0.08);
    for (const x of [-0.68, 0.68]) box(g, 0.06, 0.7, 0.06, 0x2a1a14, x, 0, 0.26);
    box(g, 0.6, 0.06, 0.32, 0x2a1a14, 0, 0.44, 0.78); for (const x of [-0.25, 0.25]) for (const z of [0.66, 0.9]) box(g, 0.04, 0.44, 0.04, 0x2a1a14, x, 0, z);
  },
  telescope(g) {
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; const l = box(g, 0.03, 1.1, 0.03, WOOD_D, Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2); l.rotation.set(Math.cos(a) * 0.18, 0, -Math.sin(a) * 0.18); }
    const tube = cyl(g, 0.07, 0.09, 1.0, 0xc8a048, 0, 0, 0, 12); tube.position.set(0, 1.25, 0.05); tube.rotation.x = 0.9;
  },
  aquarium(g) {
    box(g, 1.6, 0.7, 0.55, WOOD_D, 0, 0, 0);
    const water = box(g, 1.5, 0.6, 0.45, new THREE.MeshLambertMaterial({ color: 0x60b8e8, transparent: true, opacity: 0.55, emissive: 0x2080c0, emissiveIntensity: 0.3 }), 0, 0.7, 0);
    box(g, 1.5, 0.05, 0.45, 0xe8d8a0, 0, 0.7, 0);
    for (let i = 0; i < 5; i++) { const f = sph(g, 0.04, [0xff8030, 0xffe040, 0x40c0ff][i % 3], -0.5 + i * 0.25, 0.95 + (i % 2) * 0.12, (i % 3 - 1) * 0.1, 6); f.scale.set(1.6, 1, 0.6); f.userData.fish = i; }
    for (const x of [-0.6, 0.55]) { const p = cyl(g, 0.02, 0.04, 0.35, 0x3a9a4a, x, 0.75, -0.1, 5); }
    box(g, 1.56, 0.06, 0.5, 0x2a2a2e, 0, 1.3, 0);
  },
  toybox(g) { box(g, 0.7, 0.42, 0.46, 0x3a8ae0, 0, 0, 0); box(g, 0.72, 0.06, 0.48, 0xe04040, 0, 0.42, 0); sph(g, 0.09, 0xf0c040, 0.15, 0.56, 0, 10); box(g, 0.12, 0.12, 0.12, 0x40c060, -0.18, 0.48, 0.05); },
  dollhouse(g) {
    box(g, 0.7, 0.18, 0.5, WOOD, 0, 0, 0); box(g, 0.6, 0.5, 0.36, 0xf0d8e0, 0, 0.18, -0.02);
    for (const s of [-1, 1]) { const r = box(g, 0.66, 0.03, 0.26, 0xc84a5a, 0, 0.78, s * 0.09); r.rotation.x = s * 0.6; }
    box(g, 0.12, 0.2, 0.02, 0x6a3a2a, -0.1, 0.18, 0.17); box(g, 0.1, 0.1, 0.02, 0x8ac8f0, 0.15, 0.38, 0.17);
  },
  plant(g) { cyl(g, 0.16, 0.12, 0.3, 0xc0663e, 0, 0, 0, 10); leaves(g, 0.3, 0.3, 0x3a8a3a, 8); },
  plant_big(g) { cyl(g, 0.2, 0.15, 0.36, 0xe8e4dc, 0, 0, 0, 12); cyl(g, 0.025, 0.03, 1.2, WOOD_D, 0, 0.3, 0, 5); for (let i = 0; i < 14; i++) { const l = sph(g, 0.13, 0x2a7a3a, Math.sin(i * 2.4) * 0.22, 0.9 + (i / 14) * 0.8, Math.cos(i * 2.4) * 0.22, 6); l.scale.set(1, 0.4, 1.4); l.rotation.y = i * 2.4; l.userData.leaf = true; } },
  painting_a(g) { frame(g, 0.7, 0.5, 0xd8c8a0, (c, w, h) => { c.fillStyle = '#9ad0f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a7ab0'; c.fillRect(0, h * 0.6, w, h); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(w * 0.4, h * 0.6); c.lineTo(w * 0.5, h * 0.2); c.lineTo(w * 0.6, h * 0.6); c.fill(); c.fillStyle = '#8a4a2a'; c.fillRect(w * 0.35, h * 0.6, w * 0.3, h * 0.06); }); },
  painting_b(g) { frame(g, 0.7, 0.9, 0x2a2a2a, (c, w, h) => { c.fillStyle = '#f4ead8'; c.fillRect(0, 0, w, h); c.fillStyle = '#e86a2a'; c.beginPath(); c.arc(w * 0.4, h * 0.4, w * 0.28, 0, TAU); c.fill(); c.fillStyle = '#2a4a8a'; c.fillRect(w * 0.5, h * 0.5, w * 0.4, h * 0.35); c.fillStyle = '#f0c030'; c.fillRect(w * 0.1, h * 0.75, w * 0.5, h * 0.06); }); },
  painting_c(g) { frame(g, 0.7, 0.9, 0xd8a838, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a2a1a'); gr.addColorStop(1, '#6a4a2a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#c89050'; c.beginPath(); c.ellipse(w * 0.5, h * 0.45, w * 0.22, h * 0.2, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(w * 0.3, h * 0.35, w * 0.08, h * 0.14, -0.4, 0, TAU); c.ellipse(w * 0.7, h * 0.35, w * 0.08, h * 0.14, 0.4, 0, TAU); c.fill(); c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(w * 0.42, h * 0.42, 3, 0, TAU); c.arc(w * 0.58, h * 0.42, 3, 0, TAU); c.fill(); c.fillStyle = '#7a2a2a'; c.fillRect(w * 0.25, h * 0.7, w * 0.5, h * 0.3); }, 0.3); },
  rug(g) {
    const t = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#b8483a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f0d8a0'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#2a4a6a'; c.beginPath(); c.moveTo(w / 2, 24); c.lineTo(w - 24, h / 2); c.lineTo(w / 2, h - 24); c.lineTo(24, h / 2); c.fill(); c.fillStyle = '#f0d8a0'; c.beginPath(); c.arc(w / 2, h / 2, 12, 0, TAU); c.fill(); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshLambertMaterial({ map: t })); m.rotation.x = -Math.PI / 2; m.position.y = 0.035; m.receiveShadow = true; g.add(m);
  },
  dresser(g) { box(g, 0.86, 1.1, 0.5, WOOD, 0, 0, -0.2); for (let i = 0; i < 3; i++) for (const x of [-0.21, 0.21]) { box(g, 0.38, 0.3, 0.02, shadeHex(WOOD, 1.08), x, 0.08 + i * 0.34, 0.06); box(g, 0.06, 0.03, 0.03, 0xd8b048, x, 0.22 + i * 0.34, 0.08); } },
  lamp_floor(g) { cyl(g, 0.16, 0.18, 0.04, DARK, 0, 0, 0, 12); cyl(g, 0.015, 0.015, 1.5, DARK, 0, 0, 0, 6); const sh = cyl(g, 0.12, 0.22, 0.26, glowMat(0xf4e8c8, 0xffd890), 0, 1.4, 0, 14); sh.userData.lampShade = true; },
  lamp_table(g) { MODELS.end_table(g); cyl(g, 0.08, 0.1, 0.06, 0x3a8a8a, 0, 0.61, 0, 10); cyl(g, 0.012, 0.012, 0.25, 0xd8b048, 0, 0.66, 0, 6); const sh = cyl(g, 0.1, 0.16, 0.2, glowMat(0xf4e8c8, 0xffd890), 0, 0.86, 0, 14); sh.userData.lampShade = true; },
  lamp_wall(g) { box(g, 0.1, 0.16, 0.04, 0xd8b048, 0, 1.8, -0.47); const sh = cyl(g, 0.08, 0.12, 0.16, glowMat(0xf4e8c8, 0xffd890), 0, 1.9, -0.38, 12); sh.userData.lampShade = true; },
  tree(g) { g.add(makeTreeModel(1, 0)); },
  shrub(g) { const s = sph(g, 0.42, 0x3a7a32, 0, 0.42, 0, 10); s.scale.y = 0.85; },
  flowers(g) {
    box(g, 0.9, 0.12, 0.9, 0x5a3a24, 0, 0, 0);
    const cols = [0xe84a6a, 0xf0c030, 0xf08030, 0xe8e0f0, 0xb04ac8];
    for (let i = 0; i < 16; i++) { const x = -0.32 + (i % 4) * 0.21, z = -0.32 + Math.floor(i / 4) * 0.21; cyl(g, 0.008, 0.008, 0.22, 0x3a8a3a, x, 0.12, z, 4); sph(g, 0.045, cols[i % 5], x, 0.36, z, 6).userData.leaf = true; }
  },
  flamingo(g) {
    for (const x of [-0.03, 0.03]) cyl(g, 0.008, 0.008, 0.45, 0x2a2a2a, x, 0, 0, 4);
    const b = sph(g, 0.12, 0xf070a8, 0, 0.55, 0, 10); b.scale.set(0.8, 0.8, 1.4);
    const n = cyl(g, 0.02, 0.025, 0.3, 0xf070a8, 0, 0.6, 0.12, 6); n.rotation.x = -0.3;
    sph(g, 0.05, 0xf070a8, 0, 0.9, 0.18, 8); const bk = cyl(g, 0.0, 0.02, 0.07, 0x2a2a2a, 0, 0.88, 0.25, 5); bk.rotation.x = Math.PI / 2 + 0.6;
  },
  swing(g) {
    for (const x of [-0.95, 0.95]) for (const z of [-0.35, 0.35]) { const l = box(g, 0.06, 2.0, 0.06, 0xd04040, x, 0, z * 0.9); l.rotation.x = z > 0 ? 0.17 : -0.17; }
    const bar = cyl(g, 0.05, 0.05, 2.0, 0xd04040, 0, 0, 0, 8); bar.rotation.z = Math.PI / 2; bar.position.y = 1.98;
    for (const x of [-0.45, 0.45]) { const sw = new THREE.Group(); sw.position.set(x, 1.95, 0); g.add(sw); sw.userData.swing = true; for (const dx of [-0.16, 0.16]) box(sw, 0.01, 1.45, 0.01, 0x8a8a8a, dx, -1.5, 0); box(sw, 0.38, 0.04, 0.16, 0x3a3a3a, 0, -1.52, 0); }
  },
  mailbox(g) { box(g, 0.08, 1.0, 0.08, WOOD_D, 0, 0, 0); const b = box(g, 0.24, 0.24, 0.42, 0x3a5a8a, 0, 1.0, 0); const flag = box(g, 0.02, 0.18, 0.06, 0xe03030, 0.14, 1.12, -0.1); flag.userData.flag = true; },
  garbage(g) { box(g, 0.6, 0.9, 0.6, 0x3a6a3a, 0, 0, 0); box(g, 0.64, 0.06, 0.64, 0x2a5a2a, 0, 0.9, 0); for (const x of [-0.24, 0.24]) { const w = cyl(g, 0.07, 0.07, 0.04, DARK, x, 0.07, 0.3, 10); w.rotation.x = Math.PI / 2; } },
  urn(g) { box(g, 0.5, 0.12, 0.3, 0x8a8a8a, 0, 0, 0); const s = box(g, 0.44, 0.7, 0.14, 0x9a9a9e, 0, 0.12, 0); const top = cyl(g, 0.22, 0.22, 0.14, 0x9a9a9e, 0, 0.75, 0, 14); top.rotation.x = Math.PI / 2; top.position.y = 0.82; top.scale.set(1, 1, 1); },
};

function legs4(g, sx, sz, h, color, r = 0.03, ox = 0, oz = 0) { for (const x of [-sx / 2, sx / 2]) for (const z of [-sz / 2, sz / 2]) box(g, r * 1.6, h, r * 1.6, color, ox + x, 0, oz + z); }
function sofa(g, n, col) {
  const w = n - 0.1;
  box(g, w, 0.3, 0.86, shadeHex(col, 0.85), 0, 0.08, -0.02); box(g, w, 0.5, 0.22, col, 0, 0.3, -0.34);
  for (const x of [-w / 2 + 0.09, w / 2 - 0.09]) box(g, 0.18, 0.32, 0.86, shadeHex(col, 0.9), x, 0.28, -0.02);
  for (let i = 0; i < n; i++) box(g, (w - 0.36) / n - 0.02, 0.1, 0.62, shadeHex(col, 1.1), -w / 2 + 0.18 + ((w - 0.36) / n) * (i + 0.5), 0.36, 0.06);
  legs4(g, w - 0.16, 0.7, 0.08, WOOD_D, 0.025);
}
function bed(g, n, col) {
  const w = n - 0.12, L = 1.92;
  box(g, w, 0.32, L, WOOD, 0, 0.06, 0);
  box(g, w - 0.06, 0.16, L - 0.08, 0xf4f2ee, 0, 0.38, 0);
  box(g, w + 0.04, 0.17, L * 0.62, col, 0, 0.385, L * 0.17);
  box(g, w, 0.9, 0.08, WOOD_D, 0, 0, -L / 2 - 0.02);
  box(g, w, 0.45, 0.06, WOOD_D, 0, 0, L / 2);
  for (let i = 0; i < n; i++) box(g, 0.56, 0.1, 0.3, WHITE, -w / 2 + (w / n) * (i + 0.5), 0.54, -L / 2 + 0.25);
}
function counter(g, body, top) {
  box(g, 0.98, 0.84, 0.64, body, 0, 0.04, -0.16); box(g, 0.94, 0.04, 0.02, shadeHex(body, 0.7), 0, 0.42, 0.17);
  box(g, 1.0, 0.05, 0.7, top, 0, 0.86, -0.15);
  box(g, 0.98, 0.04, 0.6, DARK, 0, 0, -0.16);
}
function deskChair(g, z) {
  cyl(g, 0.22, 0.22, 0.04, DARK, 0, 0, z, 10); cyl(g, 0.03, 0.03, 0.4, DARK, 0, 0, z, 6);
  box(g, 0.44, 0.07, 0.42, 0x3a4a6a, 0, 0.4, z); box(g, 0.42, 0.42, 0.06, 0x3a4a6a, 0, 0.5, z + 0.2);
}
function leaves(g, y, r, col, n) { for (let i = 0; i < n; i++) { const a = i / n * TAU; const l = sph(g, r * 0.45, col, Math.sin(a) * r * 0.45, y + 0.15 + (i % 2) * 0.08, Math.cos(a) * r * 0.45, 6); l.scale.set(0.6, 0.5, 1.3); l.rotation.y = a; l.userData.leaf = true; } sph(g, r * 0.5, col, 0, y + 0.25, 0, 7).userData.leaf = true; }
function frame(g, w, h, fcol, draw, depthY) {
  const t = canvasTex(128, Math.round(128 * h / w), (c, cw, ch) => draw(c, cw, ch));
  box(g, w + 0.08, h + 0.08, 0.04, fcol, 0, 1.6 - h / 2 - 0.04, -0.47);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t })); p.position.set(0, 1.6, -0.448); g.add(p);
}
function makeTreeModel(s = 1, kind = 0) {
  const g = new THREE.Group();
  if (kind === 1) { // conifer
    cyl(g, 0.12 * s, 0.16 * s, 1.0 * s, 0x5a3a24, 0, 0, 0, 6);
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.3 - i * 0.3) * s, 1.6 * s, 8), mat(0x2a5a3a)); c.position.y = (1.4 + i * 0.9) * s; c.castShadow = true; g.add(c); }
    return g;
  }
  cyl(g, 0.13 * s, 0.2 * s, 1.8 * s, 0x6a4a30, 0, 0, 0, 7);
  const cols = [0x4a8a3a, 0x5a9a40, 0x3a7a34];
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.7 + (i % 2) * 0.25) * s, 0), mat(cols[i % 3])); b.position.set(Math.sin(i * 1.3) * 0.5 * s, (2.2 + (i % 3) * 0.35) * s, Math.cos(i * 1.3) * 0.5 * s); b.castShadow = true; g.add(b); }
  return g;
}
function buildObjectModel(id) {
  const g = new THREE.Group();
  (MODELS[id] || MODELS.end_table)(g);
  // leaves merge into one mesh per colour that keeps the leaf tag (for wilting)
  const leaves = new THREE.Group(); leaves.userData.leaves = true;
  for (const m of g.children.slice()) if (m.userData.leaf) { g.remove(m); leaves.add(m); m.userData = {}; }
  if (leaves.children.length) { mergeStatic(leaves); leaves.children.forEach((m) => { m.userData.leaf = true; }); g.add(leaves); }
  return mergeStatic(g);
}

// ---------- sims ----------
// A sim model is a jointed rig. Joint pivots are groups whose rotation the pose code drives.
function buildSimModel(s) {
  const L = s.look, root = new THREE.Group();
  const skin = mat(L.skin), hairM = mat(s.age === 'elder' ? mixHex(L.hairColor, 0xd8d8d8, 0.75) : L.hairColor);
  const top = mat(L.top), bot = mat(L.outfit === 'dress' ? L.top : L.bottom), shoe = mat(L.shoes || 0x2a2a2e);
  const body = new THREE.Group(); root.add(body);
  const J = { root, body };
  if (s.age === 'baby') { // a swaddled bundle
    const b = sph(body, 0.15, mat(L.top), 0, 0.12, 0, 10); b.scale.set(0.9, 0.8, 1.5);
    const head = new THREE.Group(); head.position.set(0, 0.16, -0.18); body.add(head); J.head = head;
    sph(head, 0.1, skin, 0, 0, 0, 12); const hr = sph(head, 0.102, hairM, 0, 0.03, -0.01, 10); hr.scale.set(1, 0.6, 1);
    face(head, 0.1, L);
    root.userData.height = 0.4;
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    J.kind = 'baby';
    root.userData.J = J;
    return root;
  }
  const W = L.body === 'm' ? 1.12 : L.body === 'f' ? 1.0 : 0.94;
  const hips = new THREE.Group(); hips.position.y = 0.9; body.add(hips); J.hips = hips;
  // torso
  const torso = new THREE.Group(); hips.add(torso); J.torso = torso;
  const chest = cyl(torso, 0.19 * W, 0.15 * W, 0.42, top, 0, 0.08, 0, 12); chest.scale.z = 0.62;
  const pelvis = cyl(torso, 0.15 * W, 0.16 * (L.body === 'f' ? 1.1 : 1) * W, 0.14, bot, 0, -0.06, 0, 12); pelvis.scale.z = 0.66;
  if (L.body === 'f') { const b = sph(torso, 0.13, top, 0, 0.36, 0.02, 10); b.scale.set(1.25 * W, 0.6, 0.62); }
  if (L.outfit === 'dress' || L.outfit === 'skirt') { const sk = cyl(torso, 0.16 * W, 0.28 * W, 0.42, L.outfit === 'dress' ? top : bot, 0, -0.44, 0, 14); sk.scale.z = 0.8; J.skirt = sk; }
  // neck & head
  cyl(torso, 0.05, 0.06, 0.1, skin, 0, 0.48, 0, 8);
  const head = new THREE.Group(); head.position.y = 0.66; torso.add(head); J.head = head;
  const hs = s.age === 'child' ? 1.18 : 1;
  head.scale.setScalar(hs);
  const skull = sph(head, 0.125, skin, 0, 0, 0, 16); skull.scale.set(0.92, 1.05, 0.98);
  sph(head, 0.022, skin, -0.115, -0.01, 0, 6); sph(head, 0.022, skin, 0.115, -0.01, 0, 6);
  face(head, 0.125, L);
  hair(head, L.hair, hairM, s);
  // arms
  J.arm = []; J.elbow = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.21 * W, 0.44, 0); torso.add(sh);
    const ua = cyl(sh, 0.05, 0.045, 0.3, top, 0, -0.3, 0, 8);
    sph(sh, 0.055, top, 0, -0.01, 0, 8);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    cyl(el, 0.042, 0.036, 0.26, skin, 0, -0.26, 0, 8);
    sph(el, 0.045, skin, 0, -0.29, 0.005, 8);
    J.arm.push(sh); J.elbow.push(el);
  }
  // legs
  J.leg = []; J.knee = [];
  const shorts = L.outfit === 'shorts', bare = L.outfit === 'skirt' || L.outfit === 'dress';
  for (const side of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(side * 0.085 * W, -0.06, 0); hips.add(hp);
    cyl(hp, 0.075 * W, 0.058, 0.42, bare ? skin : bot, 0, -0.42, 0, 8);
    if (shorts) cyl(hp, 0.08 * W, 0.07, 0.2, bot, 0, -0.2, 0, 8);
    if (bare && L.outfit === 'skirt') cyl(hp, 0.076 * W, 0.07, 0.12, bot, 0, -0.12, 0, 8);
    const kn = new THREE.Group(); kn.position.y = -0.42; hp.add(kn);
    cyl(kn, 0.055, 0.045, 0.4, shorts || bare ? skin : bot, 0, -0.4, 0, 8);
    box(kn, 0.09, 0.07, 0.22, shoe, 0, -0.43, 0.04);
    J.leg.push(hp); J.knee.push(kn);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  // fewer draw calls: merge the meshes hanging directly off each joint
  for (const g of [J.torso, J.head, J.hips, ...J.arm, ...J.elbow, ...J.leg, ...J.knee]) mergeStatic(g, true);
  // an invisible, generous click target
  const hit = new THREE.Mesh(cylGeo(0.36, 0.36, 1.8, 8), mat(0xffffff)); hit.position.y = 0.9; hit.visible = false; hit.castShadow = false; root.add(hit);
  const sc = AGES[s.age].scale;
  root.scale.setScalar(sc);
  root.userData.height = 1.78 * sc * (s.age === 'child' ? 1.08 : 1);
  J.kind = 'body';
  root.userData.J = J;
  return root;
}
function face(head, r, L) {
  const eye = mat(0x1a1410), white = mat(0xfafaf6);
  for (const s of [-1, 1]) {
    const w = sph(head, r * 0.2, white, s * r * 0.36, r * 0.12, r * 0.84, 8); w.scale.set(1, 1.1, 0.4);
    const p = sph(head, r * 0.12, eye, s * r * 0.36, r * 0.11, r * 0.92, 6); p.scale.set(1, 1.2, 0.5);
    const b = box(head, r * 0.34, r * 0.06, r * 0.05, mat(shadeHex(L.hairColor, 0.8)), s * r * 0.36, r * 0.34, r * 0.86); b.rotation.z = -s * 0.1;
  }
  // a smile: half a torus whose y-scale flips to a frown when the mood sinks
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(r * 0.2, r * 0.045, 5, 10, Math.PI), mat(0x8a3a3a));
  mouth.rotation.z = Math.PI; mouth.position.set(0, -r * 0.36, r * 0.9); mouth.userData.live = true; head.add(mouth);
  head.userData.mouth = mouth;
  const nose = sph(head, r * 0.13, mat(shadeHex(L.skin, 0.94)), 0, -r * 0.1, r * 0.97, 6); nose.scale.set(0.8, 1, 0.8);
}
function hair(head, style, m, s) {
  const r = 0.125;
  const cap = (sy = 0.7, oy = 0.03, oz = -0.01, k = 1.07) => { const c = sph(head, r * k, m, 0, oy, oz, 14); c.scale.set(0.95, sy, 1.02); return c; };
  switch (style) {
    case 'bald': break;
    case 'buzz': { const c = cap(0.78, 0.015, -0.005, 1.025); break; }
    case 'short': cap(); break;
    case 'side': { cap(0.72, 0.035); const f = sph(head, r * 0.5, m, -0.05, 0.1, 0.06, 8); f.scale.set(1.4, 0.5, 1); break; }
    case 'bob': { cap(0.75, 0.03); const b = sph(head, r * 1.12, m, 0, -0.04, -0.02, 12); b.scale.set(1.0, 0.75, 0.95); break; }
    case 'long': { cap(0.75, 0.03); box(head, 0.26, 0.36, 0.1, m, 0, -0.33, -0.08); for (const sx of [-1, 1]) box(head, 0.06, 0.26, 0.1, m, sx * 0.11, -0.24, 0.0); break; }
    case 'pony': { cap(0.72, 0.03); sph(head, 0.05, m, 0, 0.06, -0.14, 8); const p = cyl(head, 0.045, 0.02, 0.26, m, 0, -0.2, -0.17, 8); break; }
    case 'bun': { cap(0.7, 0.03); sph(head, 0.07, m, 0, 0.15, -0.06, 10); break; }
    case 'curly': { cap(0.72, 0.03); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; sph(head, 0.045, m, Math.sin(a) * 0.11, 0.06 + Math.cos(i) * 0.03, Math.cos(a) * 0.1 - 0.01, 6); } break; }
    case 'afro': { const c = sph(head, r * 1.5, m, 0, 0.07, -0.03, 14); c.scale.set(1, 0.92, 0.95); break; }
    case 'mohawk': { cap(0.7, 0.01, -0.005, 1.02); box(head, 0.04, 0.1, 0.24, m, 0, 0.12, -0.02); break; }
    case 'pigtails': { cap(0.72, 0.03); for (const sx of [-1, 1]) { sph(head, 0.055, m, sx * 0.14, 0.0, -0.06, 8); cyl(head, 0.04, 0.015, 0.16, m, sx * 0.15, -0.16, -0.06, 6); } break; }
    default: cap();
  }
}

// Pose a rig. a = animation name, t = seconds into it, extra = { talk, mood }
function poseSim(model, a, t, extra) {
  const J = model.userData.J; if (!J) return;
  if (J.kind === 'baby') { J.head.rotation.y = Math.sin(t * 0.8) * 0.3; J.body.position.y = 0; J.body.rotation.set(0, 0, 0); if (a === 'cry') { J.body.rotation.z = Math.sin(t * 14) * 0.08; } return; }
  // reset
  J.body.position.set(0, 0, 0); J.body.rotation.set(0, 0, 0);
  J.hips.position.set(0, 0.9, 0); J.hips.rotation.set(0, 0, 0); J.torso.rotation.set(0, 0, 0); J.head.rotation.set(0, 0, 0);
  for (let i = 0; i < 2; i++) { J.arm[i].rotation.set(0, 0, (i ? -1 : 1) * 0.08); J.elbow[i].rotation.set(0, 0, 0); J.leg[i].rotation.set(0, 0, 0); J.knee[i].rotation.set(0, 0, 0); }
  const sw = Math.sin(t * 7.5);
  const breathe = Math.sin(t * 1.6) * 0.015;
  const talk = extra && extra.talk;
  switch (a) {
    case 'walk': case 'run': {
      const k = a === 'run' ? 1.5 : 1, f = a === 'run' ? 11 : 7.5, s = Math.sin(t * f);
      J.leg[0].rotation.x = s * 0.5 * k; J.leg[1].rotation.x = -s * 0.5 * k;
      J.knee[0].rotation.x = Math.max(0, -Math.cos(t * f)) * 0.7 * k; J.knee[1].rotation.x = Math.max(0, Math.cos(t * f)) * 0.7 * k;
      J.arm[0].rotation.x = -s * 0.45 * k; J.arm[1].rotation.x = s * 0.45 * k;
      J.elbow[0].rotation.x = -0.25 * k; J.elbow[1].rotation.x = -0.25 * k;
      J.hips.position.y = 0.9 + Math.abs(Math.cos(t * f)) * 0.03; J.torso.rotation.y = s * 0.06; J.torso.rotation.x = a === 'run' ? 0.15 : 0.03;
      break;
    }
    case 'sit': case 'sitTalk': case 'sitEat': case 'sitType': case 'sitRead': case 'sitWatch': case 'sitToilet': case 'sitPiano': case 'sitChess': case 'sitWrite': {
      const h = extra && extra.seatH != null ? extra.seatH : 0.46;
      J.hips.position.y = h + 0.07; J.hips.position.z = -0.08;
      for (let i = 0; i < 2; i++) { J.leg[i].rotation.x = -1.5; J.knee[i].rotation.x = 1.5; }
      J.torso.rotation.x = -0.05 + breathe;
      for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.4; J.elbow[i].rotation.x = -0.6; }
      if (a === 'sitEat') { const e = Math.max(0, Math.sin(t * 2.2)); J.arm[1].rotation.x = -0.6 - e * 0.9; J.elbow[1].rotation.x = -1.2 - e * 0.8; J.head.rotation.x = 0.15 - e * 0.15; }
      if (a === 'sitType' || a === 'sitPiano') { for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.9; J.elbow[i].rotation.x = -0.7 + Math.sin(t * 14 + i * 2) * 0.08; J.arm[i].rotation.z = (i ? -1 : 1) * 0.15; } J.torso.rotation.x = 0.08; if (a === 'sitPiano') J.torso.rotation.z = Math.sin(t * 2) * 0.06; }
      if (a === 'sitRead') { for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.9; J.elbow[i].rotation.x = -1.2; J.arm[i].rotation.z = (i ? 1 : -1) * 0.3; } J.head.rotation.x = 0.35; }
      if (a === 'sitWrite') { J.arm[1].rotation.x = -0.9; J.elbow[1].rotation.x = -0.8 + Math.sin(t * 9) * 0.05; J.arm[0].rotation.x = -0.8; J.elbow[0].rotation.x = -0.9; J.head.rotation.x = 0.4; J.torso.rotation.x = 0.15; }
      if (a === 'sitWatch') { J.torso.rotation.x = -0.18; for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.3; J.elbow[i].rotation.x = -0.9; J.arm[i].rotation.z = (i ? -1 : 1) * 0.25; } }
      if (a === 'sitChess') { J.torso.rotation.x = 0.2; J.head.rotation.x = 0.3; J.arm[1].rotation.x = -0.8 - Math.max(0, Math.sin(t * 0.7)) * 0.4; J.elbow[1].rotation.x = -0.5; }
      if (a === 'sitTalk' || talk) { J.arm[0].rotation.x = -0.6 + Math.sin(t * 3) * 0.25; J.elbow[0].rotation.x = -1 + Math.sin(t * 4) * 0.2; J.head.rotation.y = Math.sin(t * 1.3) * 0.15; }
      break;
    }
    case 'lie': case 'sleep': case 'nap': case 'bathe': case 'bench': case 'cuddle': {
      J.body.rotation.x = -Math.PI / 2;
      J.body.position.set(0, (extra && extra.seatH) || 0.55, 0);
      J.torso.rotation.x = breathe * 2;
      if (a === 'sleep' || a === 'nap') { J.head.rotation.z = 0.3; J.arm[0].rotation.z = 0.25; J.arm[1].rotation.z = -0.25; J.leg[0].rotation.x = 0.05; }
      if (a === 'cuddle') { J.arm[0].rotation.z = 1.2; J.head.rotation.z = 0.4; }
      if (a === 'bathe') { J.torso.rotation.x = 0.7; J.head.rotation.x = -0.2; for (let i = 0; i < 2; i++) { J.leg[i].rotation.x = -0.25; J.knee[i].rotation.x = 0.5; } }
      if (a === 'bench') { const p = (Math.sin(t * 2.4) + 1) / 2; for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -Math.PI + 0.2; J.elbow[i].rotation.x = -1.4 * (1 - p); J.arm[i].rotation.z = (i ? -1 : 1) * 0.5; J.leg[i].rotation.x = -1.1; J.knee[i].rotation.x = 1.4; } }
      break;
    }
    case 'eat': { J.torso.rotation.x = 0.05; const e = Math.max(0, Math.sin(t * 2.2)); J.arm[1].rotation.x = -0.7 - e * 0.9; J.elbow[1].rotation.x = -1.3 - e * 0.7; J.arm[0].rotation.x = -0.7; J.elbow[0].rotation.x = -1.2; break; }
    case 'cook': case 'counter': case 'wash': {
      J.torso.rotation.x = 0.15;
      for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.8; J.elbow[i].rotation.x = -0.6; }
      J.elbow[1].rotation.x = -0.6 + Math.sin(t * (a === 'wash' ? 8 : 10)) * 0.25; J.elbow[0].rotation.x = -0.6 + Math.cos(t * 7) * (a === 'wash' ? 0.25 : 0.05);
      J.head.rotation.x = 0.3;
      break;
    }
    case 'fridge': { J.arm[1].rotation.x = -1.3; J.elbow[1].rotation.x = -0.3; J.torso.rotation.x = 0.1 + Math.sin(t * 2) * 0.05; J.head.rotation.x = 0.2; break; }
    case 'shower': { J.head.rotation.x = -0.3; for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -2.6 + Math.sin(t * 6 + i) * 0.3; J.elbow[i].rotation.x = -1.4; } break; }
    case 'toilet': break;
    case 'workout': { const p = (Math.sin(t * 3) + 1) / 2; J.hips.position.y = 0.9 - p * 0.35; for (let i = 0; i < 2; i++) { J.leg[i].rotation.x = -p * 1.1; J.knee[i].rotation.x = p * 1.8; J.arm[i].rotation.x = -1.4 * p - 0.2; } J.torso.rotation.x = p * 0.5; break; }
    case 'dance': {
      const b = Math.sin(t * 8.4), c = Math.sin(t * 4.2);
      J.hips.position.y = 0.9 - Math.abs(b) * 0.06; J.hips.rotation.y = c * 0.4; J.torso.rotation.z = c * 0.15;
      for (let i = 0; i < 2; i++) { const s = i ? -1 : 1; J.arm[i].rotation.x = -1.2 + Math.sin(t * 4.2 + i * Math.PI) * 0.9; J.arm[i].rotation.z = s * (0.4 + b * 0.3); J.elbow[i].rotation.x = -1; J.leg[i].rotation.x = Math.max(0, Math.sin(t * 4.2 + i * Math.PI)) * -0.6; J.knee[i].rotation.x = Math.max(0, Math.sin(t * 4.2 + i * Math.PI)) * 1.0; }
      J.head.rotation.x = b * 0.1;
      break;
    }
    case 'talk': case 'listen': case 'chat': {
      J.torso.rotation.x = breathe;
      if (talk || a === 'talk') { J.arm[0].rotation.x = -0.5 + Math.sin(t * 3) * 0.35; J.elbow[0].rotation.x = -1.1 + Math.sin(t * 4.3) * 0.3; J.arm[1].rotation.x = -0.2 + Math.sin(t * 2.3 + 1) * 0.2; J.elbow[1].rotation.x = -0.5; J.head.rotation.y = Math.sin(t * 1.7) * 0.12; J.head.rotation.x = Math.sin(t * 3.1) * 0.05; }
      else { J.arm[0].rotation.z = 0.12; J.head.rotation.x = Math.sin(t * 0.9) * 0.08 - 0.03; J.head.rotation.z = 0.08; }
      break;
    }
    case 'laugh': { J.torso.rotation.x = -0.15 + Math.sin(t * 12) * 0.05; J.head.rotation.x = -0.3; for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.4; J.elbow[i].rotation.x = -1.6; } break; }
    case 'cheer': { const b = Math.abs(Math.sin(t * 6)); J.body.position.y = b * 0.12; for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -2.8; J.arm[i].rotation.z = (i ? -1 : 1) * 0.4; J.elbow[i].rotation.x = -0.2; } break; }
    case 'angry': { J.torso.rotation.x = 0.12; J.head.rotation.x = 0.1; J.arm[0].rotation.x = -1.2 + Math.sin(t * 9) * 0.4; J.elbow[0].rotation.x = -0.8; J.arm[1].rotation.z = -0.5; J.elbow[1].rotation.x = -1.8; break; }
    case 'sad': { J.torso.rotation.x = 0.25; J.head.rotation.x = 0.45; for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.6; J.elbow[i].rotation.x = -1.8; J.arm[i].rotation.z = (i ? -1 : 1) * -0.3; } break; }
    case 'shy': { J.head.rotation.x = 0.3; J.head.rotation.y = 0.3; J.arm[0].rotation.x = -0.4; J.elbow[0].rotation.x = -1.4; break; }
    case 'wave': { J.arm[1].rotation.z = -2.6; J.elbow[1].rotation.z = Math.sin(t * 9) * 0.4; J.head.rotation.z = 0.1; break; }
    case 'hug': case 'kiss': case 'slowdance': {
      for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -1.4; J.arm[i].rotation.z = (i ? 1 : -1) * 0.5; J.elbow[i].rotation.y = (i ? -1 : 1) * 0.9; J.elbow[i].rotation.x = -0.6; }
      J.torso.rotation.x = 0.1; J.head.rotation.x = a === 'kiss' ? 0.08 : 0.15; J.head.rotation.y = a === 'kiss' ? 0.25 : 0.4;
      if (a === 'slowdance') J.hips.rotation.y = Math.sin(t * 1.2) * 0.15;
      break;
    }
    case 'tickle': { for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -1.3; J.elbow[i].rotation.x = -0.3 + Math.sin(t * 16 + i) * 0.3; } break; }
    case 'giggle': { J.torso.rotation.x = 0.35 + Math.sin(t * 14) * 0.08; J.hips.rotation.y = Math.sin(t * 9) * 0.2; for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.3; J.elbow[i].rotation.x = -2; } break; }
    case 'slap': { const p = Math.min(1, (t % 2) * 2); J.arm[1].rotation.z = -1.5 + p * 1.2; J.arm[1].rotation.x = -1.3 * p; J.torso.rotation.y = -0.3 + p * 0.5; break; }
    case 'flinch': { J.head.rotation.y = -0.6; J.torso.rotation.y = -0.2; J.torso.rotation.x = -0.1; break; }
    case 'propose': { J.body.position.y = -0.4; J.leg[0].rotation.x = -1.5; J.knee[0].rotation.x = 1.5; J.leg[1].rotation.x = 0.1; J.knee[1].rotation.x = 1.6; J.arm[0].rotation.x = -1.4; J.elbow[0].rotation.x = -0.2; J.head.rotation.x = -0.25; J.hips.position.y = 0.95; break; }
    case 'read': { for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -1; J.elbow[i].rotation.x = -1.1; J.arm[i].rotation.z = (i ? 1 : -1) * 0.25; } J.head.rotation.x = 0.35; break; }
    case 'paint': { J.arm[1].rotation.x = -1.4 + Math.sin(t * 2.5) * 0.25; J.arm[1].rotation.z = Math.cos(t * 2.5) * 0.25; J.elbow[1].rotation.x = -0.4; J.arm[0].rotation.x = -0.6; J.elbow[0].rotation.x = -1.2; break; }
    case 'speech': { J.arm[0].rotation.x = -1 + Math.sin(t * 3) * 0.4; J.arm[0].rotation.z = 0.4; J.elbow[0].rotation.x = -0.4; J.arm[1].rotation.x = -0.6 + Math.sin(t * 2.4 + 1) * 0.4; J.arm[1].rotation.z = -0.3; J.head.rotation.x = -0.1; break; }
    case 'stargaze': { J.torso.rotation.x = 0.1; J.head.rotation.x = 0.1; for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -1.4; J.elbow[i].rotation.x = -0.6; } break; }
    case 'play': case 'toys': { J.body.position.y = -0.45; for (let i = 0; i < 2; i++) { J.leg[i].rotation.x = -1.9; J.knee[i].rotation.x = 2.4; J.arm[i].rotation.x = -0.9 + Math.sin(t * 5 + i * 2) * 0.4; J.elbow[i].rotation.x = -0.6; } J.torso.rotation.x = 0.3; J.head.rotation.x = 0.3; break; }
    case 'swing': { const p = Math.sin(t * 2.2); J.hips.position.y = 0.47; for (let i = 0; i < 2; i++) { J.leg[i].rotation.x = -1.5 - p * 0.4; J.knee[i].rotation.x = 1.5 + p * 0.5; J.arm[i].rotation.x = -2.6; J.elbow[i].rotation.x = 0.4; } J.torso.rotation.x = p * 0.2; break; }
    case 'tend': case 'water': case 'clean': case 'repair': {
      const low = a === 'repair' || a === 'clean';
      if (low) { J.hips.position.y = 0.55; for (let i = 0; i < 2; i++) { J.leg[i].rotation.x = -1.1; J.knee[i].rotation.x = 2.0; } J.torso.rotation.x = 0.5; }
      J.arm[1].rotation.x = -1 + Math.sin(t * (low ? 9 : 2)) * 0.25; J.elbow[1].rotation.x = -0.4; J.arm[0].rotation.x = -0.7; J.elbow[0].rotation.x = -0.6;
      break;
    }
    case 'phone': { J.arm[1].rotation.x = -0.6; J.arm[1].rotation.z = -0.3; J.elbow[1].rotation.x = -2.3; J.head.rotation.z = -0.12; if (talk) J.arm[0].rotation.x = -0.5 + Math.sin(t * 3) * 0.3; break; }
    case 'pass': { J.body.rotation.x = -Math.PI / 2; J.body.position.y = 0.14; J.head.rotation.z = 0.6; J.arm[0].rotation.z = 1.4; J.arm[1].rotation.z = -1.4; break; }
    case 'panic': { const b = Math.sin(t * 12); J.arm[0].rotation.x = -2.6 + b * 0.4; J.arm[1].rotation.x = -2.6 - b * 0.4; J.elbow[0].rotation.x = -0.3; J.elbow[1].rotation.x = -0.3; J.body.position.y = Math.abs(b) * 0.05; break; }
    case 'carry': { for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -0.9; J.elbow[i].rotation.x = -0.9; } break; }
    case 'baby': { for (let i = 0; i < 2; i++) { J.arm[i].rotation.x = -1.0 + Math.sin(t * 2) * 0.1; J.elbow[i].rotation.x = -1.2; J.arm[i].rotation.z = (i ? 1 : -1) * 0.2; } J.head.rotation.x = 0.35; J.torso.rotation.x = 0.25; break; }
    default: { // idle
      J.torso.rotation.x = breathe; J.head.rotation.y = Math.sin(t * 0.37) * 0.2; J.head.rotation.x = Math.sin(t * 0.23) * 0.05;
      J.arm[0].rotation.x = Math.sin(t * 0.8) * 0.04; J.arm[1].rotation.x = -Math.sin(t * 0.8) * 0.04;
      if (extra && extra.mood < -40) { J.torso.rotation.x = 0.15; J.head.rotation.x = 0.25; }
    }
  }
  if (J.head.userData.mouth) {
    const m = J.head.userData.mouth, mood = extra ? extra.mood || 0 : 0;
    const k = clamp(mood / 60, -1, 1);
    m.scale.set(1 + (talk ? Math.abs(Math.sin(t * 13)) * 0.2 : 0), talk ? 0.6 + Math.abs(Math.sin(t * 13)) * 1.2 : (Math.abs(k) < 0.15 ? 0.15 : k) * 0.9, 1);
  }
}

// ---------- vehicles ----------
function buildCar(color, kind) {
  const g = new THREE.Group();
  if (kind === 'bus') {
    box(g, 2.3, 1.9, 7.0, 0xf0c020, 0, 0.45, 0);
    box(g, 2.32, 0.6, 6.2, 0x2a3a4a, 0, 1.55, -0.2);
    box(g, 2.34, 0.08, 7.0, 0x1a1a1a, 0, 1.0, 0);
    box(g, 2.0, 0.5, 0.06, 0x1a1a1a, 0, 0.7, 3.52);
    for (const z of [-2.5, 2.5]) for (const x of [-1.05, 1.05]) { const w = cyl(g, 0.42, 0.42, 0.3, DARK, x, 0, z, 12); w.rotation.z = Math.PI / 2; w.position.y = 0.42; }
    g.userData.len = 7;
    return g;
  }
  if (kind === 'van') {
    box(g, 1.9, 1.5, 4.4, color, 0, 0.35, 0); box(g, 1.92, 0.5, 1.0, 0x2a3a4a, 0, 1.2, 1.6);
    for (const z of [-1.5, 1.5]) for (const x of [-0.92, 0.92]) { const w = cyl(g, 0.34, 0.34, 0.24, DARK, x, 0, z, 12); w.rotation.z = Math.PI / 2; w.position.y = 0.34; }
    g.userData.len = 4.4; return g;
  }
  box(g, 1.8, 0.62, 4.2, color, 0, 0.32, 0);
  box(g, 1.6, 0.56, 2.1, shadeHex(color, 1.05), 0, 0.94, -0.2);
  box(g, 1.62, 0.44, 1.9, 0x2a3a4a, 0, 0.98, -0.2);
  box(g, 1.7, 0.12, 0.05, 0xf0f0e0, 0, 0.62, 2.11);
  for (const z of [-1.35, 1.35]) for (const x of [-0.88, 0.88]) { const w = cyl(g, 0.32, 0.32, 0.24, DARK, x, 0, z, 12); w.rotation.z = Math.PI / 2; w.position.y = 0.32; }
  g.userData.len = 4.2;
  return g;
}

// small items: plates, puddles, fire, pizza, cake
function buildItemModel(it) {
  const g = new THREE.Group();
  switch (it.kind) {
    case 'plate': { cyl(g, 0.14, 0.11, 0.02, WHITE, 0, 0, 0, 14); if (!it.dirty) sph(g, 0.08, it.food || 0xc87a3a, 0, 0.03, 0, 8).scale.y = 0.5; else { const c = cyl(g, 0.08, 0.08, 0.005, 0x8a6a3a, 0, 0.02, 0, 10); } break; }
    case 'puddle': { const p = new THREE.Mesh(new THREE.CircleGeometry(0.4, 14), new THREE.MeshLambertMaterial({ color: 0x8ac8e8, transparent: true, opacity: 0.6 })); p.rotation.x = -Math.PI / 2; p.position.y = 0.04; p.scale.set(1, 0.7, 1); g.add(p); break; }
    case 'fire': {
      for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.14 + (i % 2) * 0.06, 0.6, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffc020 : 0xff5010, transparent: true, opacity: 0.85 })); f.position.set(Math.sin(i * 1.3) * 0.18, 0.3, Math.cos(i * 1.3) * 0.18); f.userData.flame = i; g.add(f); }
      const L = new THREE.PointLight(0xff8020, 1.4, 6, 1.5); L.position.y = 0.8; g.add(L);
      break;
    }
    case 'meal': { cyl(g, 0.24, 0.2, 0.03, WHITE, 0, 0, 0, 16); if (!it.dirty) { const m = sph(g, 0.17, it.food || 0xc8742e, 0, 0.04, 0, 10); m.scale.y = 0.45; for (let i = 0; i < 4; i++) sph(g, 0.04, 0x4a9a3a, Math.sin(i * 1.6) * 0.12, 0.08, Math.cos(i * 1.6) * 0.12, 5); } break; }
    case 'pizza': { box(g, 0.42, 0.06, 0.42, 0xe8d8b0, 0, 0, 0); if (!it.dirty) { const p = cyl(g, 0.18, 0.18, 0.02, 0xe8a040, 0, 0.06, 0, 14); } break; }
    case 'cake': { cyl(g, 0.17, 0.17, 0.02, WHITE, 0, 0, 0, 16); cyl(g, 0.14, 0.14, 0.14, 0xf0d8e0, 0, 0.02, 0, 16); cyl(g, 0.145, 0.145, 0.03, 0xe86a9a, 0, 0.14, 0, 16); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; cyl(g, 0.006, 0.006, 0.07, 0xf0f0ff, Math.sin(a) * 0.08, 0.16, Math.cos(a) * 0.08, 4); sph(g, 0.012, new THREE.MeshBasicMaterial({ color: 0xffc040 }), Math.sin(a) * 0.08, 0.24, Math.cos(a) * 0.08, 4); } break; }
    case 'gift': { box(g, 0.3, 0.24, 0.3, 0x3a8ae0, 0, 0, 0); box(g, 0.32, 0.25, 0.06, 0xf0d040, 0, 0, 0); box(g, 0.06, 0.25, 0.32, 0xf0d040, 0, 0, 0); break; }
    case 'trashbag': { const s = sph(g, 0.22, 0x2a2a2e, 0, 0.18, 0, 8); s.scale.y = 0.8; break; }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Merge a model's static meshes into one mesh per material to save draw calls.
// Meshes carrying userData (screens, lamp shades, swings, leaves…) and their subtrees stay separate.
function mergeStatic(root, shallow) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), remove = [];
  const live = (o) => { for (let p = o; p && p !== root; p = p.parent) if (Object.keys(p.userData).length) return true; return false; };
  const visit = shallow ? (f) => root.children.slice().forEach(f) : (f) => root.traverse(f);
  visit((m) => {
    if (!m.isMesh || Array.isArray(m.material) || live(m) || m.material.transparent || !m.visible) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const key = m.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: m.material, geos: [], cast: false, recv: false });
    const b = buckets.get(key); b.geos.push(g); b.cast = b.cast || m.castShadow; b.recv = b.recv || m.receiveShadow;
    remove.push(m);
  });
  for (const m of remove) m.parent.remove(m);
  for (const b of buckets.values()) {
    let n = 0; for (const g of b.geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of b.geos) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += c; g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
    root.add(mesh);
  }
  return root;
}
