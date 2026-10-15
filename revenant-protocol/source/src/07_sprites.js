// Revenant Protocol — low-poly models baked into pixel sprite atlases (8 directions, outlined), plus weapon models.

const SPR = {};
const _mats = {};
function mm(color, emis) {
  const k = color + (emis ? 'e' : '');
  if (_mats[k]) return _mats[k];
  const c = Array.isArray(color) ? new THREE.Color(color[0] / 255, color[1] / 255, color[2] / 255) : new THREE.Color(color);
  return (_mats[k] = emis ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
}
function B(p, w, h, d, col, x = 0, y = 0, z = 0, emis) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm(col, emis)); m.position.set(x, y, z); p.add(m); return m; }
function Cy(p, rt, rb, h, col, x = 0, y = 0, z = 0, seg = 8, emis) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mm(col, emis)); m.position.set(x, y, z); p.add(m); return m; }
function Sp(p, r, col, x = 0, y = 0, z = 0, emis, ws = 10, hs = 8) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mm(col, emis)); m.position.set(x, y, z); p.add(m); return m; }
function J(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; }

// ---------- weapons (barrel along -z, origin at the grip) ----------
const GUNS = {
  pistol(g) { B(g, 0.05, 0.07, 0.24, 0x2c2e33, 0, 0.03, -0.08); Cy(g, 0.016, 0.016, 0.12, 0x55585e, 0, 0.045, -0.24).rotation.x = Math.PI / 2; B(g, 0.045, 0.12, 0.06, 0x3a2a20, 0, -0.04, 0.0).rotation.x = 0.25; B(g, 0.02, 0.03, 0.06, 0x8a8d94, 0, 0.08, -0.1); },
  carbine(g) {
    B(g, 0.055, 0.08, 0.44, 0x1c1d21, 0, 0.03, -0.14); Cy(g, 0.022, 0.022, 0.2, 0x3a3d44, 0, 0.04, -0.44).rotation.x = Math.PI / 2;
    Cy(g, 0.02, 0.02, 0.16, 0x16171a, 0, 0.1, -0.1).rotation.x = Math.PI / 2; B(g, 0.03, 0.1, 0.05, 0x111, 0, -0.04, -0.2);
    B(g, 0.045, 0.11, 0.06, 0x1c1d21, 0, -0.04, 0.02).rotation.x = 0.25; B(g, 0.03, 0.05, 0.16, 0x2a2b30, 0, 0.02, 0.14);
  },
  repeater(g) {
    B(g, 0.1, 0.12, 0.42, 0x50545c, 0, 0.03, -0.12); Cy(g, 0.07, 0.07, 0.1, 0x33363c, 0, -0.04, -0.06, 10).rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) Cy(g, 0.016, 0.016, 0.26, 0x2a2c30, Math.cos(i * 2.1) * 0.03, 0.05 + Math.sin(i * 2.1) * 0.03, -0.42).rotation.x = Math.PI / 2;
    B(g, 0.05, 0.12, 0.06, 0x2a2b30, 0, -0.07, 0.04).rotation.x = 0.25; B(g, 0.04, 0.02, 0.2, 0x7dff4a, 0, 0.1, -0.12, true);
  },
  fusion(g) {
    B(g, 0.12, 0.13, 0.36, 0x8a5a2a, 0, 0.03, -0.1); B(g, 0.1, 0.1, 0.12, 0x3a3a40, 0, 0.03, -0.32);
    for (const [x, y] of [[-0.03, 0.06], [0.03, 0.06], [-0.03, 0.0], [0.03, 0.0]]) Cy(g, 0.014, 0.014, 0.14, 0x222, x, y, -0.44).rotation.x = Math.PI / 2;
    B(g, 0.05, 0.12, 0.06, 0x2a2b30, 0, -0.07, 0.04).rotation.x = 0.25; B(g, 0.03, 0.04, 0.12, 0xffa21e, 0.065, 0.04, -0.1, true);
  },
  mortar(g) {
    Cy(g, 0.075, 0.075, 0.5, 0x4a5a3a, 0, 0.04, -0.18, 10).rotation.x = Math.PI / 2; Cy(g, 0.09, 0.09, 0.05, 0x2a2c30, 0, 0.04, -0.44, 10).rotation.x = Math.PI / 2;
    B(g, 0.05, 0.12, 0.06, 0x2a2b30, 0, -0.07, 0.02).rotation.x = 0.25; B(g, 0.12, 0.05, 0.1, 0x2a2b30, 0, -0.02, 0.06);
  },
  concussion(g) {
    B(g, 0.07, 0.1, 0.5, 0x7a6040, 0, 0.03, -0.14); Cy(g, 0.03, 0.03, 0.22, 0x3a3d44, 0, 0.04, -0.46).rotation.x = Math.PI / 2;
    Cy(g, 0.06, 0.06, 0.04, 0xb09060, 0, 0.04, -0.56, 10).rotation.x = Math.PI / 2; Cy(g, 0.03, 0.03, 0.12, 0x2a2b30, 0, 0.11, -0.12).rotation.x = Math.PI / 2;
    B(g, 0.05, 0.12, 0.06, 0x2a2b30, 0, -0.06, 0.02).rotation.x = 0.25; B(g, 0.04, 0.06, 0.18, 0x5a4530, 0, 0.0, 0.18);
  },
  cannon(g) {
    B(g, 0.16, 0.18, 0.56, 0x26282e, 0, 0.03, -0.14); Cy(g, 0.05, 0.05, 0.24, 0x3a3d44, 0, 0.03, -0.52, 10).rotation.x = Math.PI / 2;
    B(g, 0.05, 0.08, 0.3, 0x8fdcff, 0.085, 0.05, -0.14, true); B(g, 0.1, 0.06, 0.16, 0x3a3d44, 0, 0.14, -0.2);
    B(g, 0.06, 0.14, 0.08, 0x1a1b1e, 0, -0.1, 0.04).rotation.x = 0.25;
  },
  thermal(g) { Sp(g, 0.06, 0x9a9ea6, 0, 0, 0); B(g, 0.02, 0.02, 0.02, 0xff3020, 0, 0.055, 0, true); Cy(g, 0.064, 0.064, 0.02, 0x4a4d54, 0, 0, 0, 12); },
  mine(g) { Cy(g, 0.1, 0.12, 0.05, 0x4a4d54, 0, 0, 0, 12); Cy(g, 0.03, 0.03, 0.02, 0xff3020, 0, 0.035, 0, 8, true); },
};
function gunModel(id) { const g = new THREE.Group(); (GUNS[id] || GUNS.carbine)(g); return g; }

// ---------- actor rigs ----------
function humanoid(o) {
  const s = o.scale || 1, bw = o.bulk || 1;
  const root = new THREE.Group();
  const body = J(root); body.scale.setScalar(s);
  const hips = J(body, 0, 0.95, 0);
  const torso = J(hips);
  B(torso, 0.46 * bw, 0.34, 0.27 * Math.sqrt(bw), o.armor, 0, 0.44, 0);
  B(torso, 0.38 * bw, 0.24, 0.23 * Math.sqrt(bw), o.under, 0, 0.16, 0);
  B(hips, 0.4 * bw, 0.13, 0.25 * Math.sqrt(bw), o.belt || o.under, 0, 0.0, 0);
  if (o.chest) o.chest(torso, bw);
  const neck = J(torso, 0, 0.62, 0);
  o.head(neck);
  const arm = (side) => {
    const a = J(torso, side * 0.29 * bw, 0.56, 0);
    B(a, 0.14, 0.32, 0.14, o.sleeve || o.armor, 0, -0.15, 0);
    B(a, 0.12, 0.28, 0.12, o.fore || o.under, 0, -0.43, 0);
    B(a, 0.11, 0.1, 0.11, o.glove || o.under, 0, -0.6, 0);
    if (o.pad) B(a, 0.2, 0.08, 0.2, o.pad, 0, 0.03, 0);
    return a;
  };
  const armL = arm(-1), armR = arm(1);
  const leg = (side) => {
    const l = J(hips, side * 0.11 * bw, -0.04, 0);
    B(l, 0.17, 0.44, 0.19, o.thigh || o.armor, 0, -0.22, 0);
    B(l, 0.15, 0.36, 0.17, o.shin || o.armor, 0, -0.6, 0);
    B(l, 0.17, 0.12, 0.26, o.boot || 0x222, 0, -0.86, 0.04);
    return l;
  };
  const legL = leg(-1), legR = leg(1);
  const hand = J(armR, 0, -0.6, 0.02);
  let gun = null, flash = null;
  if (o.gun) {
    gun = o.gun === 'axe' || o.gun === 'blade' || o.gun === 'none' ? new THREE.Group() : gunModel(o.gun);
    if (o.gun === 'axe') { Cy(gun, 0.025, 0.025, 1.1, 0x5a3a20, 0, 0, -0.3).rotation.x = Math.PI / 2; B(gun, 0.04, 0.34, 0.26, 0x9a9ea6, 0, 0.12, -0.78); }
    if (o.gun === 'blade') { B(gun, 0.03, 0.08, 0.9, 0xc8ccd4, 0, 0, -0.45); B(gun, 0.01, 0.03, 0.9, 0xff4a30, 0, 0.05, -0.45, true); }
    gun.rotation.x = -Math.PI / 2;
    gun.scale.setScalar(o.gunScale || 1.25);
    hand.add(gun);
    if (o.gun !== 'axe' && o.gun !== 'blade' && o.gun !== 'none') { flash = Sp(hand, 0.09, 0xffe080, 0, -0.75 * (o.gunScale || 1.25), 0.02, true, 6, 4); flash.visible = false; }
  }
  if (o.shield) { const sh = J(armL, 0, -0.45, 0.1); B(sh, 0.08, 0.7, 0.5, o.shield, 0, 0, 0); B(sh, 0.09, 0.5, 0.06, 0xff3020, 0, 0, 0, true); }
  if (o.back) o.back(torso, bw);
  return { root, body, hips, torso, armL, armR, legL, legR, gun, flash, melee: o.gun === 'axe' || o.gun === 'blade' || o.gun === 'none' };
}
function poseHumanoid(r, frame, k) {
  const { root, body, hips, torso, armL, armR, legL, legR } = r;
  root.rotation.set(0, root.rotation.y, 0); body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
  hips.position.y = 0.95; hips.rotation.set(0, 0, 0); torso.rotation.set(0, 0, 0);
  for (const j of [armL, armR, legL, legR]) j.rotation.set(0, 0, 0);
  for (const l of [legL, legR]) for (const c of l.children) c.rotation.set(0, 0, 0);
  if (r.flash) r.flash.visible = false;
  const hold = () => { armR.rotation.x = -0.75; armL.rotation.x = -0.95; armL.rotation.y = 0.5; armL.rotation.z = 0.2; };
  if (frame === 'idle') hold();
  else if (frame === 'walk') {
    const p = (k / 4) * TAU;
    legL.rotation.x = Math.sin(p) * 0.55; legR.rotation.x = -Math.sin(p) * 0.55;
    hips.position.y = 0.95 - Math.abs(Math.cos(p)) * 0.04;
    if (r.melee) { armR.rotation.x = -Math.sin(p) * 0.4 - 0.2; armL.rotation.x = Math.sin(p) * 0.4; } else hold();
  } else if (frame === 'aim' || frame === 'fire') {
    if (r.melee) {
      if (frame === 'aim') { armR.rotation.x = -2.7; torso.rotation.x = -0.15; armL.rotation.x = -0.6; }
      else { armR.rotation.x = -0.9; torso.rotation.x = 0.25; armL.rotation.x = -1.2; legL.rotation.x = -0.4; legR.rotation.x = 0.3; }
    } else {
      armR.rotation.x = -Math.PI / 2 + (frame === 'fire' ? 0.12 : 0); armL.rotation.x = -1.35; armL.rotation.y = 0.55;
      if (frame === 'fire' && r.flash) r.flash.visible = true;
    }
  } else if (frame === 'pain') {
    torso.rotation.x = -0.3; armR.rotation.x = -0.4; armR.rotation.z = 0.5; armL.rotation.z = -0.5; armL.rotation.x = -0.3; legL.rotation.x = 0.2;
  } else if (frame === 'death') {
    // crumple sideways over five frames
    const t = k / 4;
    legL.rotation.x = -0.6 * Math.min(1, t * 2); legR.rotation.x = 0.3 * Math.min(1, t * 2);
    torso.rotation.x = 0.4 * Math.min(1, t * 2);
    armR.rotation.z = 0.8 * t; armL.rotation.z = -1.2 * t; armL.rotation.x = -0.6;
    body.rotation.z = -t * Math.PI / 2 * 0.98;
    body.position.y = -t * 0.12 + (t > 0 ? 0.1 * Math.sin(t * Math.PI) : 0);
    hips.position.y = 0.95 - Math.min(1, t * 2) * 0.25 * (1 - t);
  }
}

const ACTORS = {
  trooper: {
    size: 2.4, build: () => humanoid({
      armor: 0xdfe2e6, under: 0x2e3036, belt: 0x8a8d94, boot: 0xd0d3d8, glove: 0x2e3036, gun: 'carbine',
      head: (n) => { B(n, 0.27, 0.29, 0.3, 0xe6e8ec, 0, 0.13, 0); B(n, 0.28, 0.06, 0.05, 0x101114, 0, 0.17, 0.14); B(n, 0.12, 0.08, 0.04, 0x55585e, 0, 0.06, 0.15); B(n, 0.3, 0.04, 0.3, 0xc8ccd2, 0, 0.29, 0); },
      chest: (t) => { B(t, 0.2, 0.1, 0.03, 0x55585e, 0.08, 0.5, 0.14); },
      pad: 0xb0b4ba,
    }),
  },
  officer: {
    size: 2.4, build: () => humanoid({
      armor: 0x4e5650, under: 0x4a524c, belt: 0x18191b, boot: 0x141414, sleeve: 0x4e5650, fore: 0x4a524c, glove: 0x181818, thigh: 0x4a524c, shin: 0x18191b, gun: 'pistol',
      head: (n) => { B(n, 0.2, 0.24, 0.22, 0xd8ac8a, 0, 0.12, 0); B(n, 0.24, 0.08, 0.26, 0x3e4640, 0, 0.27, 0); B(n, 0.2, 0.02, 0.08, 0x18191b, 0, 0.23, 0.14); B(n, 0.14, 0.02, 0.02, 0x2a1a14, 0, 0.13, 0.11); },
      chest: (t) => { B(t, 0.1, 0.05, 0.03, 0xd03020, -0.12, 0.52, 0.14, true); B(t, 0.06, 0.05, 0.03, 0x3060d0, -0.02, 0.52, 0.14, true); },
    }),
  },
  raider: {
    size: 2.4, build: () => humanoid({
      armor: 0x2a2c31, under: 0x18191c, belt: 0x3a3d44, boot: 0x111, glove: 0x111, gun: 'carbine', pad: 0x3a3d44,
      head: (n) => { B(n, 0.27, 0.3, 0.3, 0x2a2c31, 0, 0.13, 0); B(n, 0.22, 0.04, 0.04, 0xff2a1a, 0, 0.17, 0.15, true); B(n, 0.06, 0.18, 0.06, 0x3a3d44, 0.13, 0.2, -0.05); },
      chest: (t) => { B(t, 0.3, 0.08, 0.04, 0x3a3d44, 0, 0.4, 0.15); },
    }),
  },
  brute: {
    size: 2.8, build: () => humanoid({
      scale: 1.12, bulk: 1.45, armor: 0x5a4028, under: 0x68784a, sleeve: 0x68784a, fore: 0x68784a, glove: 0x68784a, thigh: 0x5a4028, shin: 0x68784a, belt: 0x2a1c12, boot: 0x2a1c12, gun: 'axe', gunScale: 1,
      head: (n) => { B(n, 0.38, 0.32, 0.36, 0x6e7e4c, 0, 0.12, 0.04); B(n, 0.24, 0.14, 0.14, 0x7e8e5a, 0, 0.06, 0.25); B(n, 0.04, 0.1, 0.04, 0xeee8d0, -0.1, 0.12, 0.3); B(n, 0.04, 0.1, 0.04, 0xeee8d0, 0.1, 0.12, 0.3); B(n, 0.24, 0.03, 0.02, 0xffd040, 0, 0.2, 0.22, true); },
    }),
  },
  hunter: {
    size: 2.6, build: () => humanoid({
      scale: 1.05, armor: 0xc0702a, under: 0xa85e22, sleeve: 0x6a8a4c, fore: 0x6a8a4c, glove: 0x6a8a4c, thigh: 0xc0702a, shin: 0xa85e22, belt: 0x3a2a1a, boot: 0x5a7a40, gun: 'concussion',
      head: (n) => { B(n, 0.24, 0.26, 0.28, 0x6a8a4c, 0, 0.12, 0); B(n, 0.18, 0.12, 0.2, 0x7a9a5a, 0, 0.06, 0.2); B(n, 0.04, 0.04, 0.02, 0xff8a1a, -0.08, 0.17, 0.14, true); B(n, 0.04, 0.04, 0.02, 0xff8a1a, 0.08, 0.17, 0.14, true); },
      back: (t) => { B(t, 0.3, 0.4, 0.12, 0x5a4a3a, 0, 0.4, -0.2); },
    }),
  },
  rev1: {
    size: 3.0, build: () => humanoid({
      scale: 1.18, armor: 0x3a3c44, under: 0x22242a, sleeve: 0x3a3c44, fore: 0x55585e, glove: 0x22242a, thigh: 0x3a3c44, shin: 0x55585e, belt: 0x22242a, boot: 0x2a2c32, gun: 'blade', gunScale: 1, shield: 0x2a2c32, pad: 0x55585e,
      head: (n) => { B(n, 0.24, 0.3, 0.26, 0x2a2c32, 0, 0.13, 0); B(n, 0.06, 0.04, 0.03, 0xff2a1a, -0.06, 0.17, 0.13, true); B(n, 0.06, 0.04, 0.03, 0xff2a1a, 0.06, 0.17, 0.13, true); B(n, 0.04, 0.18, 0.3, 0x55585e, 0, 0.3, 0); },
      chest: (t) => { B(t, 0.12, 0.12, 0.03, 0xff3a20, 0, 0.46, 0.15, true); },
    }),
  },
  rev2: {
    size: 3.2, build: () => humanoid({
      scale: 1.26, bulk: 1.3, armor: 0x26282e, under: 0x1a1b1f, sleeve: 0x26282e, fore: 0x3a3d44, glove: 0x1a1b1f, thigh: 0x26282e, shin: 0x3a3d44, belt: 0x1a1b1f, boot: 0x26282e, gun: 'cannon', gunScale: 1.6, pad: 0x3a3d44,
      head: (n) => { B(n, 0.28, 0.3, 0.3, 0x26282e, 0, 0.13, 0); B(n, 0.24, 0.05, 0.03, 0xff2a1a, 0, 0.16, 0.15, true); },
      chest: (t) => { B(t, 0.14, 0.14, 0.03, 0xff3a20, 0, 0.46, 0.17, true); },
      back: (t) => { for (const x of [-0.12, 0.12]) { Cy(t, 0.08, 0.08, 0.5, 0x3a3d44, x, 0.38, -0.24); Cy(t, 0.06, 0.04, 0.06, 0xff9a30, x, 0.1, -0.24, 8, true); } },
    }),
  },
  boss: {
    size: 4.6, px: 96, build: () => humanoid({
      scale: 1.6, bulk: 1.4, armor: 0x4a2a28, under: 0x1e1a1c, sleeve: 0x4a2a28, fore: 0x2e2a2c, glove: 0x1e1a1c, thigh: 0x4a2a28, shin: 0x2e2a2c, belt: 0xb08a3a, boot: 0x2e2a2c, gun: 'cannon', gunScale: 1.7, pad: 0xb08a3a,
      head: (n) => { B(n, 0.3, 0.32, 0.32, 0x2e2a2c, 0, 0.14, 0); B(n, 0.26, 0.05, 0.03, 0xffd040, 0, 0.17, 0.16, true); B(n, 0.34, 0.06, 0.34, 0xb08a3a, 0, 0.3, 0); },
      chest: (t) => { B(t, 0.16, 0.16, 0.03, 0xffb030, 0, 0.46, 0.17, true); for (const x of [-0.34, 0.34]) { const pod = B(t, 0.2, 0.2, 0.28, 0x3a2a28, x, 0.74, -0.02); for (let i = 0; i < 4; i++) B(pod, 0.05, 0.05, 0.02, 0xff5030, (i % 2 - 0.5) * 0.08, (Math.floor(i / 2) - 0.5) * 0.08, 0.15, true); } },
      back: (t) => { for (const x of [-0.14, 0.14]) { Cy(t, 0.09, 0.09, 0.55, 0x2e2a2c, x, 0.36, -0.26); Cy(t, 0.07, 0.05, 0.06, 0xff9a30, x, 0.06, -0.26, 8, true); } },
    }),
  },
  seeker: {
    size: 1.4, px: 48, anchor: 0.5, build: () => {
      const root = new THREE.Group(), body = J(root);
      Sp(body, 0.26, 0x1e1f24, 0, 0.05, 0); Sp(body, 0.2, 0x2a2c32, 0, 0.2, 0).scale.y = 0.6;
      B(body, 0.09, 0.06, 0.05, 0xff2a1a, 0, 0.06, 0.24, true); B(body, 0.02, 0.3, 0.02, 0x55585e, 0.1, 0.42, -0.05);
      const legs = [];
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; const l = J(body, Math.cos(a) * 0.14, -0.15, Math.sin(a) * 0.14); B(l, 0.03, 0.42, 0.03, 0x3a3d44, 0, -0.2, 0); legs.push(l); }
      const flash = Sp(body, 0.08, 0xffe080, 0, 0.0, 0.32, true, 6, 4);
      return { root, body, legs, flash };
    },
    pose(r, frame, k) {
      r.body.position.y = frame === 'walk' ? Math.sin((k / 4) * TAU) * 0.05 : 0;
      r.body.rotation.set(frame === 'pain' ? -0.4 : 0, 0, 0);
      r.legs.forEach((l, i) => { l.rotation.x = Math.sin((k / 4) * TAU + i) * 0.2; l.rotation.z = Math.cos((k / 4) * TAU + i) * 0.2; });
      r.flash.visible = frame === 'fire';
      if (frame === 'death') { r.body.rotation.set(k * 0.3, 0, k * 0.4); r.body.position.y = -k * 0.12; r.body.scale.setScalar(1 - k * 0.12); } else r.body.scale.setScalar(1);
    },
  },
  orb: {
    size: 0.9, px: 32, anchor: 0.5, build: () => {
      const root = new THREE.Group(), body = J(root);
      Sp(body, 0.2, 0x1a1b1f, 0, 0, 0); Cy(body, 0.215, 0.215, 0.05, 0xb8bcc4, 0, 0, 0, 12);
      B(body, 0.06, 0.06, 0.04, 0xff2a1a, 0, 0.04, 0.19, true); B(body, 0.02, 0.02, 0.3, 0xd8dce4, 0.06, -0.08, 0.24);
      return { root, body };
    },
    pose(r, frame, k) { r.body.rotation.set(frame === 'fire' ? 0.5 : 0, 0, frame === 'walk' ? k * 0.4 : 0); r.body.scale.setScalar(frame === 'death' ? 1 - k * 0.2 : 1); },
  },
  turret: {
    size: 1.4, px: 48, anchor: 1, build: () => {
      const root = new THREE.Group(), body = J(root, 0, -0.05, 0);
      Cy(body, 0.34, 0.38, 0.12, 0x55585e, 0, 0, 0, 12); Sp(body, 0.26, 0x3a3d44, 0, -0.2, 0);
      for (const x of [-0.08, 0.08]) Cy(body, 0.03, 0.03, 0.4, 0x1a1b1f, x, -0.24, 0.24).rotation.x = Math.PI / 2;
      B(body, 0.12, 0.05, 0.04, 0xff2a1a, 0, -0.12, 0.24, true);
      const flash = Sp(body, 0.1, 0xffe080, 0, -0.24, 0.48, true, 6, 4);
      return { root, body, flash };
    },
    pose(r, frame, k) { r.flash.visible = frame === 'fire'; r.body.rotation.set(frame === 'death' ? 0.5 + k * 0.15 : 0, 0, frame === 'death' ? k * 0.2 : 0); r.body.position.y = frame === 'death' ? -0.05 - k * 0.05 : -0.05; },
  },
  maw: {
    size: 3.2, px: 64, dirs: 1, build: () => {
      const root = new THREE.Group(), body = J(root);
      const tent = [];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.6, t = J(body, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.3);
        let p = t; const segs = [];
        for (let s = 0; s < 5; s++) { const j = J(p, 0, s ? 0.32 : 0, 0); Cy(j, 0.07 - s * 0.01, 0.09 - s * 0.01, 0.34, 0x5e6a4a, 0, 0.17, 0); segs.push(j); p = j; }
        tent.push(segs);
      }
      const stalk = J(body);
      Cy(stalk, 0.12, 0.2, 1.2, 0x56604a, 0, 0.6, 0); const eye = Sp(stalk, 0.22, 0xdcd8b0, 0, 1.3, 0.05); B(eye, 0.14, 0.14, 0.06, 0x101010, 0, 0, 0.2); B(eye, 0.06, 0.06, 0.02, 0xffe040, 0, 0, 0.24, true);
      return { root, body, tent, stalk };
    },
    pose(r, frame, k) {
      const rise = frame === 'idle' ? 0.3 : frame === 'aim' ? 1.15 : frame === 'fire' ? 1.1 : frame === 'death' ? Math.max(0, 0.9 - k * 0.22) : 0.85;
      r.body.position.y = (rise - 1) * 1.4;
      r.tent.forEach((segs, i) => segs.forEach((s, n) => {
        s.rotation.z = Math.sin((k / 4) * TAU + i * 1.7 + n) * 0.25 + (i % 2 ? 0.12 : -0.12);
        s.rotation.x = frame === 'fire' ? 0.35 : frame === 'pain' ? -0.3 : Math.cos((k / 4) * TAU + i) * 0.15;
      }));
      r.stalk.rotation.x = frame === 'fire' ? 0.5 : 0;
    },
  },
};

// Render every frame of every actor into an atlas; rows: idle, walk0-3, aim, fire, pain; last row: 5 death frames.
const SPRITE_ROWS = { idle: 0, walk: 1, aim: 5, fire: 6, pain: 7, death: 8 };
function bakeAll() {
  const r = R.renderer;
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(-0.6, 1, 0.9); scene.add(sun);
  const prevClear = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha();
  for (const name in ACTORS) {
    const A = ACTORS[name], px = A.px || 64, dirs = A.dirs || 8;
    const cols = 8, rows = 9, W = cols * px, H = rows * px;
    const rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const rig = A.build();
    scene.add(rig.root);
    const size = A.size, anchor = A.anchor || 0;
    const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0.1, 40);
    const elev = 0.08, cy = size / 2 - anchor * size;
    cam.position.set(0, cy + Math.sin(elev) * 20, Math.cos(elev) * 20); cam.lookAt(0, cy, 0);
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(rt); rt.scissorTest = false; r.clear();
    const shot = (col, row) => {
      rt.viewport.set(col * px, row * px, px, px); rt.scissor.set(col * px, row * px, px, px); rt.scissorTest = true;
      r.setRenderTarget(rt); r.render(scene, cam);
    };
    const pose = A.pose || poseHumanoid;
    const frames = [['idle', 0], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['aim', 0], ['fire', 0], ['pain', 0]];
    frames.forEach(([f, k], row) => {
      for (let d = 0; d < dirs; d++) { rig.root.rotation.y = (d * TAU) / 8; pose(rig, f, k); shot(d, row); }
    });
    rig.root.rotation.y = name === 'maw' ? 0 : 0.35;
    for (let k = 0; k < 5; k++) { pose(rig, 'death', k); shot(k, 8); }
    const buf = new Uint8Array(W * H * 4);
    r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    r.setRenderTarget(null);
    rt.dispose();
    scene.remove(rig.root);
    SPR[name] = { tex: spriteTex(outline(buf, W, H, px), W, H), px, W, H, size, anchor, dirs };
  }
  r.setClearColor(prevClear, prevA);
}
// Hard alpha, a slightly reduced palette and a dark 1px outline: the look of hand-cleaned sprites.
function outline(buf, W, H, cell) {
  const out = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i += 4) {
    const a = buf[i + 3] >= 110;
    out[i] = (buf[i] >> 3) << 3; out[i + 1] = (buf[i + 1] >> 3) << 3; out[i + 2] = (buf[i + 2] >> 3) << 3; out[i + 3] = a ? 255 : 0;
  }
  const res = out.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (out[i + 3]) continue;
    const cx = Math.floor(x / cell) * cell, cy = Math.floor(y / cell) * cell;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < cx || ny < cy || nx >= cx + cell || ny >= cy + cell) continue;
      if (out[(ny * W + nx) * 4 + 3]) { res[i] = 14; res[i + 1] = 12; res[i + 2] = 16; res[i + 3] = 255; break; }
    }
  }
  return res;
}
function spriteTex(data, W, H) {
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
// uv rect for a frame
function sprRect(s, col, row, out) { out.set((col * s.px) / s.W, (row * s.px) / s.H, s.px / s.W, s.px / s.H); }

// ---------- pickups: one 3/4 view each ----------
const ITEM_MODELS = {
  energy: (g) => { B(g, 0.22, 0.14, 0.12, 0x2a2c32, 0, 0.07, 0); B(g, 0.16, 0.05, 0.13, 0x60c0ff, 0, 0.1, 0, true); },
  power: (g) => { for (const x of [-0.07, 0.07]) { Cy(g, 0.06, 0.06, 0.24, 0x5a5d64, x, 0.12, 0); Cy(g, 0.062, 0.062, 0.08, 0xffd040, x, 0.12, 0, 8, true); } },
  thermal: (g) => { for (const [x, z] of [[-0.08, 0], [0.08, 0], [0, 0.1]]) { const t = J(g, x, 0.07, z); GUNS.thermal(t); } },
  mines: (g) => { for (const [x, y] of [[0, 0.03], [0.02, 0.09], [-0.01, 0.15]]) { const t = J(g, x, y, 0); GUNS.mine(t); } },
  mortar: (g) => { for (const x of [-0.1, 0, 0.1]) { Cy(g, 0.05, 0.05, 0.22, 0x4a5a3a, x, 0.11, 0); Cy(g, 0.0, 0.05, 0.08, 0xc0a040, x, 0.26, 0); } },
  plasma: (g) => { Cy(g, 0.09, 0.09, 0.28, 0x2a2c32, 0, 0.14, 0, 10); Cy(g, 0.092, 0.092, 0.16, 0x8fdcff, 0, 0.14, 0, 10, true); },
  missile: (g) => { for (const x of [-0.08, 0.08]) { Cy(g, 0.04, 0.04, 0.36, 0x8a8d94, x, 0.18, 0); Cy(g, 0, 0.04, 0.1, 0xd03020, x, 0.41, 0); } },
  shield: (g) => { Sp(g, 0.14, 0x60c8ff, 0, 0.2, 0, true); Cy(g, 0.16, 0.18, 0.06, 0x3a3d44, 0, 0.03, 0, 10); },
  shieldbig: (g) => { Sp(g, 0.22, 0x60c8ff, 0, 0.28, 0, true); Cy(g, 0.24, 0.26, 0.08, 0xffd040, 0, 0.04, 0, 10); },
  medkit: (g) => { B(g, 0.26, 0.16, 0.18, 0xe8e8e0, 0, 0.08, 0); B(g, 0.1, 0.04, 0.19, 0x40d070, 0, 0.12, 0, true); },
  medbig: (g) => { B(g, 0.36, 0.22, 0.24, 0xe8e8e0, 0, 0.11, 0); B(g, 0.14, 0.06, 0.25, 0x40d070, 0, 0.16, 0, true); B(g, 0.12, 0.04, 0.04, 0x555, 0, 0.24, 0); },
  battery: (g) => { B(g, 0.12, 0.2, 0.08, 0x2a2c32, 0, 0.1, 0); B(g, 0.125, 0.06, 0.085, 0xffc020, 0, 0.14, 0, true); },
  life: (g) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 14), mm(0xffd040, true)); t.position.y = 0.22; g.add(t); Sp(g, 0.06, 0xffffff, 0, 0.22, 0, true); },
  superw: (g) => { B(g, 0.2, 0.2, 0.2, 0xff6a20, 0, 0.18, 0, true).rotation.set(0.6, 0.6, 0); },
  supers: (g) => { B(g, 0.2, 0.2, 0.2, 0x60e0ff, 0, 0.18, 0, true).rotation.set(0.6, 0.6, 0); },
  key_r: (g) => { B(g, 0.22, 0.03, 0.14, 0xe03a2a, 0, 0.02, 0, true); B(g, 0.06, 0.035, 0.05, 0xffd040, -0.06, 0.03, 0); },
  key_b: (g) => { B(g, 0.22, 0.03, 0.14, 0x3a80ff, 0, 0.02, 0, true); B(g, 0.06, 0.035, 0.05, 0xffd040, -0.06, 0.03, 0); },
  key_y: (g) => { B(g, 0.22, 0.03, 0.14, 0xffd02a, 0, 0.02, 0, true); B(g, 0.06, 0.035, 0.05, 0x555, -0.06, 0.03, 0); },
  mask: (g) => { Sp(g, 0.12, 0x3a3d44, 0, 0.14, 0); Cy(g, 0.05, 0.05, 0.08, 0x6a6d74, 0, 0.1, 0.12).rotation.x = Math.PI / 2; B(g, 0.16, 0.04, 0.04, 0x60c0ff, 0, 0.18, 0.1, true); },
  cleats: (g) => { for (const x of [-0.07, 0.07]) { B(g, 0.1, 0.06, 0.24, 0x4a4d54, x, 0.03, 0); B(g, 0.1, 0.02, 0.24, 0xb8ccd8, x, 0.0, 0); } },
  plans: (g) => { B(g, 0.22, 0.03, 0.3, 0x2a2c32, 0, 0.02, 0); B(g, 0.18, 0.031, 0.24, 0x60c0ff, 0, 0.025, 0, true); },
  datacore: (g) => { Cy(g, 0.08, 0.08, 0.22, 0x8a8d94, 0, 0.11, 0, 6); Cy(g, 0.06, 0.06, 0.24, 0x60ff90, 0, 0.11, 0, 6, true); },
  navcard: (g) => { B(g, 0.2, 0.03, 0.14, 0xffd02a, 0, 0.02, 0, true); B(g, 0.12, 0.035, 0.06, 0x111, 0.02, 0.03, 0); },
};
for (const [k, v] of Object.entries({ energy_s: 'energy', power_s: 'power', plasma_s: 'plasma' })) ITEM_MODELS[k] = ITEM_MODELS[v];
for (const w of ['pistol', 'carbine', 'repeater', 'fusion', 'mortar', 'concussion', 'cannon']) ITEM_MODELS['w_' + w] = (g) => { const m = gunModel(w); m.rotation.y = Math.PI / 2; m.position.y = 0.1; m.scale.setScalar(1.3); g.add(m); };
const ITEM_FRAME = {};
function bakeItems() {
  const r = R.renderer, names = Object.keys(ITEM_MODELS), px = 32, cols = 8, rows = Math.ceil(names.length / cols);
  const W = cols * px, H = rows * px, size = 0.9;
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(-0.6, 1, 0.9); scene.add(sun);
  const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0.1, 40);
  const el = 0.5; cam.position.set(0, size / 2 + Math.sin(el) * 20, Math.cos(el) * 20); cam.lookAt(0, size / 2 - 0.05, 0);
  const rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const prevClear = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha();
  r.setClearColor(0x000000, 0); r.setRenderTarget(rt); rt.scissorTest = false; r.clear();
  names.forEach((n, i) => {
    const g = new THREE.Group(); ITEM_MODELS[n](g); g.rotation.y = 0.6; g.scale.setScalar(1.4); scene.add(g);
    const c = i % cols, rw = Math.floor(i / cols);
    rt.viewport.set(c * px, rw * px, px, px); rt.scissor.set(c * px, rw * px, px, px); rt.scissorTest = true;
    r.setRenderTarget(rt); r.render(scene, cam); scene.remove(g);
    ITEM_FRAME[n] = [c, rw];
  });
  const buf = new Uint8Array(W * H * 4);
  r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  r.setRenderTarget(null); rt.dispose(); r.setClearColor(prevClear, prevA);
  SPR.items = { tex: spriteTex(outline(buf, W, H, px), W, H), px, W, H, size, anchor: 0 };
}

// ---------- effects: explosion and impact frames drawn procedurally ----------
function bakeFx() {
  const px = 64, n = 8, W = px * n, H = px * 2, d = new Uint8Array(W * H * 4);
  const put = (x, y, c, a) => { const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; };
  for (let f = 0; f < n; f++) {
    const t = f / (n - 1), rad = 10 + t * 20;
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      const dx = x - 32, dy = y - 32, r = Math.hypot(dx, dy);
      const nz = fbmW((x + f * 7) / 8, (y + f * 3) / 8, 8, 3);
      const k = r / rad + (nz - 0.5) * 0.7;
      if (k > 1) continue;
      const heat = clamp(1 - k - t * 0.9, 0, 1);
      const smoke = t > 0.45 && k > 0.3 && nz > 0.45;
      let c = heat > 0.6 ? [255, 250, 210] : heat > 0.35 ? [255, 200, 70] : heat > 0.12 ? [240, 110, 30] : [150, 50, 20];
      if (smoke) c = [70, 64, 60];
      if (t > 0.8 && heat < 0.1 && !smoke) continue;
      put(f * px + x, y, c, 255);
    }
    // row 2: small impact spark
    const sr = 3 + f * 2.2;
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      const dx = x - 32, dy = y - 32, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const spike = 0.6 + 0.4 * Math.abs(Math.sin(a * 3 + f));
      if (r > sr * spike || (f > 4 && r < sr * 0.6)) continue;
      put(f * px + x, px + y, r < sr * 0.4 ? [255, 255, 220] : [255, 190, 90], 255);
    }
  }
  SPR.fx = { tex: spriteTex(d, W, H), px, W, H, size: 3, anchor: 0.5 };
}
