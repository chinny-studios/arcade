// 05_props: furniture, objective machines and big scenery. Every prop is built from boxes and prisms in world space
// with baked light (same lightAt as the walls) and registers an axis-aligned box in each grid cell it touches, so
// bullets, eyes and feet all see it. Wall-mounted props turn to face away from the nearest wall.
const MAT = {};
function initMaterials() {
  MAT.level = makeMat({});
  MAT.cutout2 = makeMat({ side: THREE.DoubleSide });
  MAT.levelNoFog = makeMat({ fog: false });
  MAT.cutoutNoFog = makeMat({ side: THREE.DoubleSide, fog: false });
  MAT.glass = makeMat({ blend: 'alpha', side: THREE.DoubleSide });
  MAT.add = makeMat({ blend: 'add', side: THREE.DoubleSide });
  MAT.addNoFog = makeMat({ blend: 'add', side: THREE.DoubleSide, fog: false, alarm: false });
  MAT.fxAlpha = makeMat({ blend: 'alpha', side: THREE.DoubleSide });
  MAT.decal = makeMat({ side: THREE.DoubleSide });
  MAT.sky = makeMat({ fog: false, alarm: false, side: THREE.DoubleSide });
  MAT.skyAlpha = makeMat({ blend: 'alpha', fog: false, alarm: false, side: THREE.DoubleSide });
  for (const k in MAT) MAT[k].userData.shared = true;
}

function wallDir(c, r) {
  for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) if (isWallish(c + dc, r + dr) && inMap(c + dc, r + dr) && L.type[cellIdx(c + dc, r + dr)] === T_WALL) return [dc, dr];
  for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) if (isWallish(c + dc, r + dr)) return [dc, dr];
  return [0, -1];
}
// matrix placing a local model (front = -z, back against +z) at a cell, backed against wall direction (dc, dr)
function wallXf(s, depth, dir) {
  const [dc, dr] = dir || wallDir(s.c, s.r);
  const yaw = yawTo(-dc, -dr);
  const m = new THREE.Matrix4().makeRotationY(yaw);
  // move so the back face (local +z = depth/2) touches the wall edge
  const px = s.x + dc * (CELL / 2 - depth / 2 - 0.02), pz = s.z + dr * (CELL / 2 - depth / 2 - 0.02);
  m.setPosition(px, s.y, pz);
  return { m, yaw, px, pz };
}
function xfBox(m, x0, y0, z0, x1, y1, z1) {
  const v = new THREE.Vector3(), b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
    v.set(x, y, z).applyMatrix4(m);
    b[0] = Math.min(b[0], v.x); b[1] = Math.min(b[1], v.y); b[2] = Math.min(b[2], v.z);
    b[3] = Math.max(b[3], v.x); b[4] = Math.max(b[4], v.y); b[5] = Math.max(b[5], v.z);
  }
  return b;
}
function registerProp(p) {
  L.props.push(p);
  if (!p.box) return p;
  const b = p.box;
  const c0 = cellOf(b[0] + 0.01), c1 = cellOf(b[3] - 0.01), r0 = cellOf(b[2] + 0.01), r1 = cellOf(b[5] - 0.01);
  p.cells = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (!inMap(c, r)) continue;
    const i = cellIdx(c, r);
    (L.cellProps[i] = L.cellProps[i] || []).push(p);
    p.cells.push(i);
    // a prop that covers the cell centre blocks pathing through it
    if (p.solid && b[4] - L.fh[i] > 0.6) {
      const x = cx2(c), z = cx2(r);
      if (x > b[0] - 0.3 && x < b[3] + 0.3 && z > b[2] - 0.3 && z < b[5] + 0.3) L.blocked[i] = 1;
    }
  }
  return p;
}
function unregisterProp(p) {
  p.gone = true;
  for (const i of p.cells || []) {
    const a = L.cellProps[i];
    if (a) { const k = a.indexOf(p); if (k >= 0) a.splice(k, 1); }
    let still = false;
    for (const q of L.cellProps[i] || []) if (q.solid) still = true;
    if (!still) L.blocked[i] = 0;
  }
}
function propMesh(p, build, mat) {
  const g = new Geo(); g.lit = lightAt;
  build(g);
  if (p.mesh) { scene.remove(p.mesh); p.mesh.geometry.dispose(); }
  p.mesh = g.mesh(mat || MAT.level);
  scene.add(p.mesh);
}

// ---------------------------------------------------------------- prop builders
const PROPS = {
  crate(s) {
    const h = s.h || 1.5, w = s.w || 1.5, tile = TILE[s.tile || (hash2(s.c, s.r, 1) > 0.5 ? 'crate' : 'crate_mil')];
    const x = s.x + (hash2(s.c, s.r, 2) - 0.5) * 0.3, z = s.z + (hash2(s.c, s.r, 3) - 0.5) * 0.3;
    const p = { kind: 'crate', box: [x - w / 2, s.y, z - w / 2, x + w / 2, s.y + h, z + w / 2], solid: true, hp: Infinity, mat: 'wood' };
    propMesh(p, (g) => {
      g.box(...p.box, tile, 0);
      if (hash2(s.c, s.r, 4) > 0.7 && !s.h) { const w2 = 0.9; g.box(x - w2 / 2, s.y + h, z - w2 / 2, x + w2 / 2, s.y + h + w2, z + w2 / 2, TILE.crate_mil, 0); p.box[4] += w2; }
    });
    return p;
  },
  barrel(s) {
    const p = { kind: 'barrel', box: [s.x - 0.42, s.y, s.z - 0.42, s.x + 0.42, s.y + 1.15, s.z + 0.42], solid: true, hp: 18, explosive: { r: 4.5, dmg: 160 }, mat: 'metal' };
    propMesh(p, (g) => g.cyl(s.x, s.y, s.z, 0.42, 1.15, 10, TILE.barrel, TILE.barrel_top, 2));
    return p;
  },
  tank(s) {
    const p = { kind: 'tank', box: [s.x - 0.9, s.y, s.z - 0.9, s.x + 0.9, s.y + 2.3, s.z + 0.9], solid: true, hp: 45, explosive: { r: 7, dmg: 220 }, mat: 'metal' };
    propMesh(p, (g) => {
      g.box(s.x - 0.7, s.y, s.z - 0.6, s.x + 0.7, s.y + 0.5, s.z + 0.6, TILE.metal_dk, 0);
      g.cyl(s.x, s.y + 0.5, s.z, 0.85, 1.8, 10, TILE.barrel, TILE.barrel_top, 3);
    });
    return p;
  },
  console(s, dead) {
    const { m } = wallXf(s, 0.8, s.dir);
    const p = s._p || { kind: 'console', box: xfBox(m, -0.85, 0, -0.4, 0.85, 1.05, 0.4), solid: true, hp: 40, smash: true, mat: 'metal', s };
    propMesh(p, (g) => {
      g.setXf(m);
      g.box(-0.85, 0, -0.4, 0.85, 1.05, 0.4, { front: TILE[dead ? 'console_dead' : (s.screen ? 'screen' : 'console')], top: TILE[dead ? 'console_dead' : 'console_top'], side: TILE.metal }, 0);
      g.box(-0.6, 1.05, 0.1, 0.6, 1.5, 0.4, { front: TILE[dead ? 'console_dead' : 'screen'], side: TILE.metal_dk, top: TILE.metal_dk }, 0);
    });
    return p;
  },
  terminal(s) {
    const p = PROPS.console(Object.assign({ screen: true }, s));
    p.kind = 'terminal'; p.hp = Infinity; p.smash = false;
    return p;
  },
  bank(s, dead) {
    const { m } = wallXf(s, 0.7, s.dir);
    const p = s._p || { kind: 'bank', box: xfBox(m, -0.9, 0, -0.35, 0.9, 2.3, 0.35), solid: true, hp: 60, smash: true, mat: 'metal', s };
    propMesh(p, (g) => { g.setXf(m); g.box(-0.9, 0, -0.35, 0.9, 2.3, 0.35, { front: TILE[dead ? 'console_dead' : 'tape'], side: TILE.metal, top: TILE.metal_dk }, 0); });
    return p;
  },
  locker(s) {
    const { m } = wallXf(s, 0.5, s.dir);
    const p = { kind: 'locker', box: xfBox(m, -0.8, 0, -0.25, 0.8, 2, 0.25), solid: true, hp: Infinity, mat: 'metal' };
    propMesh(p, (g) => { g.setXf(m); g.box(-0.8, 0, -0.25, 0, 2, 0.25, { front: TILE.hull_dk, side: TILE.metal }, 0); g.box(0, 0, -0.25, 0.8, 2, 0.25, { front: TILE.hull_dk, side: TILE.metal }, 0); });
    return p;
  },
  bunk(s) {
    const { m } = wallXf(s, 0.95, s.dir);
    const p = { kind: 'bunk', box: xfBox(m, -0.95, 0, -0.45, 0.95, 1.9, 0.45), solid: true, hp: Infinity, mat: 'wood' };
    propMesh(p, (g) => {
      g.setXf(m);
      for (const y of [0.35, 1.3]) g.box(-0.95, y, -0.45, 0.95, y + 0.25, 0.45, { top: TILE.bunk, side: TILE.metal }, 0);
      for (const x of [-0.92, 0.88]) for (const z of [-0.42, 0.38]) g.box(x, 0, z, x + 0.05, 1.9, z + 0.05, TILE.metal_dk, 0);
    });
    return p;
  },
  trough(s) {
    const p = { kind: 'trough', box: [s.x - 0.9, s.y, s.z - 0.45, s.x + 0.9, s.y + 0.8, s.z + 0.45], solid: true, hp: Infinity, mat: 'wood', seeThrough: false };
    propMesh(p, (g) => {
      g.box(s.x - 0.9, s.y, s.z - 0.45, s.x + 0.9, s.y + 0.8, s.z + 0.45, { top: TILE.soil, side: TILE.hull_dk }, 0);
      for (let k = -1; k <= 1; k++) {
        const x = s.x + k * 0.6, y = s.y + 0.8;
        g.quad([x - 0.4, y, s.z], [x + 0.4, y, s.z], [x + 0.4, y + 0.8, s.z], [x - 0.4, y + 0.8, s.z], [0, 1, 1, 1, 1, 0, 0, 0], TILE.plant, [0, 0, 1]);
        g.quad([x, y, s.z + 0.4], [x, y, s.z - 0.4], [x, y + 0.8, s.z - 0.4], [x, y + 0.8, s.z + 0.4], [0, 1, 1, 1, 1, 0, 0, 0], TILE.plant, [1, 0, 0]);
      }
    }, MAT.cutout2);
    return p;
  },
  alarm(s, dead) {
    const { m } = wallXf(s, 0.14, s.dir);
    const p = s._p || { kind: 'alarm', box: xfBox(m, -0.35, 1.2, -0.07, 0.35, 2.0, 0.07), solid: false, hp: 12, smash: true, mat: 'metal', s };
    if (!s._p) { const [dc, dr] = s.dir || wallDir(s.c, s.r); p.front = [s.x - dc * 0.6, s.z - dr * 0.6]; L.alarms.push(p); }
    propMesh(p, (g) => { g.setXf(m); g.box(-0.35, 1.2, -0.07, 0.35, 2.0, 0.07, { front: TILE[dead ? 'alarm_dead' : 'alarm'], side: TILE.metal_dk }, 0); });
    return p;
  },
  // ---- objective machines
  payload(s) {
    const x = s.x + CELL / 2, z = s.z + CELL / 2; // sits on the corner shared by a 2x2 block of cells
    const p = { kind: 'payload', box: [x - 1.6, s.y, z - 1.6, x + 1.6, s.y + 4.4, z + 1.6], solid: true, hp: Infinity, mat: 'metal', center: [x, s.y + 2.4, z] };
    propMesh(p, (g) => {
      g.box(x - 1.5, s.y, z - 1.2, x + 1.5, s.y + 0.6, z + 1.2, TILE.steel_red, 0);              // cradle
      g.cyl(x, s.y + 0.6, z, 0.95, 2.4, 8, TILE.gold, TILE.metal, 2);
      g.cyl(x, s.y + 3.0, z, 0.95, 0.5, 8, TILE.metal, null, 2, false, 0.4);
      g.cyl(x, s.y + 3.5, z, 0.08, 0.9, 4, TILE.chrome, TILE.chrome, 1);
      for (let k = 0; k < 6; k++) {         // folded mirror petals
        const a0 = k / 6 * TAU, a1 = (k + 1) / 6 * TAU, r0 = 0.95, r1 = 1.5;
        g.quad([x + Math.sin(a0) * r0, s.y + 2.9, z + Math.cos(a0) * r0], [x + Math.sin(a1) * r0, s.y + 2.9, z + Math.cos(a1) * r0], [x + Math.sin(a1) * r1, s.y + 4.1, z + Math.cos(a1) * r1], [x + Math.sin(a0) * r1, s.y + 4.1, z + Math.cos(a0) * r1], [0, 1, 1, 1, 1, 0, 0, 0], TILE.mirror, [Math.sin((a0 + a1) / 2), 0.4, Math.cos((a0 + a1) / 2)]);
      }
      g.box(x - 3.2, s.y + 1.6, z - 0.04, x - 0.95, s.y + 2.2, z + 0.04, TILE.solar, 0);
      g.box(x + 0.95, s.y + 1.6, z - 0.04, x + 3.2, s.y + 2.2, z + 0.04, TILE.solar, 0);
    }, MAT.cutout2);
    return p;
  },
  radar(s, dead) {
    const x = s.x + CELL / 2, z = s.z + CELL / 2;
    const p = s._p || { kind: 'radar', box: [x - 1.4, s.y, z - 1.4, x + 1.4, s.y + 5.5, z + 1.4], solid: true, hp: 1, explosiveOnly: true, mat: 'metal', s, center: [x, s.y + 4, z] };
    propMesh(p, (g) => {
      g.box(x - 1.2, s.y, z - 1.2, x + 1.2, s.y + 1.0, z + 1.2, TILE.concrete_dk, 0);
      g.cyl(x, s.y + 1, z, 0.35, 2.2, 6, TILE.metal, TILE.metal, 1);
      if (!dead) {
        const m = new THREE.Matrix4().makeRotationX(-0.9).premultiply(new THREE.Matrix4().makeRotationY(0.6)).setPosition(x, s.y + 3.4, z);
        g.setXf(m);
        g.cyl(0, -0.2, 0, 0.3, 0.6, 10, TILE.radar, null, 3, false, 2.4);
        g.cyl(0, 0.4, 0, 2.4, 0.01, 10, TILE.radar, null, 3, false, 2.4);
        g.cyl(0, -0.2, 0, 0.06, 1.8, 4, TILE.metal_dk, TILE.metal_dk, 1);
        g.box(-0.2, 1.6, -0.2, 0.2, 1.9, 0.2, TILE.metal_dk, 0);
        g.setXf(null);
      } else {
        g.box(x - 0.5, s.y + 3.2, z - 0.6, x + 0.6, s.y + 3.5, z + 0.5, TILE.console_dead, 0);
      }
    }, MAT.cutout2);
    return p;
  },
  transmitter(s, dead) {
    const x = s.x, z = s.z;
    const p = s._p || { kind: 'transmitter', box: [x - 0.9, s.y, z - 0.9, x + 0.9, s.y + 3.2, z + 0.9], solid: true, hp: 1, explosiveOnly: true, mat: 'metal', s, center: [x, s.y + 1.6, z] };
    propMesh(p, (g) => {
      g.box(x - 0.9, s.y, z - 0.9, x + 0.9, s.y + 1.4, z + 0.9, { side: TILE[dead ? 'console_dead' : 'console'], top: TILE.metal_dk }, 0);
      if (!dead) {
        g.cyl(x, s.y + 1.4, z, 0.5, 1.2, 8, TILE.chrome, TILE.metal_dk, 2, true, 0.3);
        for (let k = 0; k < 4; k++) g.cyl(x, s.y + 1.6 + k * 0.25, z, 0.42 - k * 0.04, 0.08, 8, TILE.gold, null, 2, false);
        g.cyl(x, s.y + 2.6, z, 0.06, 0.6, 4, TILE.chrome, TILE.chrome, 1);
      }
    });
    return p;
  },
  servo(s, dead) {
    const x = s.x, z = s.z;
    const p = s._p || { kind: 'servo', box: [x - 1, s.y, z - 1, x + 1, s.y + 2.4, z + 1], solid: true, hp: 1, explosiveOnly: true, mat: 'metal', s, center: [x, s.y + 1.4, z] };
    propMesh(p, (g) => {
      g.box(x - 1, s.y, z - 1, x + 1, s.y + 0.5, z + 1, { top: TILE.hazard, side: TILE.metal_dk }, 0);
      if (!dead) {
        g.cyl(x, s.y + 0.5, z, 0.85, 1.3, 12, TILE.metal, TILE.metal_dk, 3);
        for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.box(x + Math.sin(a) * 0.85 - 0.08, s.y + 0.6, z + Math.cos(a) * 0.85 - 0.08, x + Math.sin(a) * 0.85 + 0.08, s.y + 1.7, z + Math.cos(a) * 0.85 + 0.08, TILE.gunmetal, 0); }
        g.cyl(x, s.y + 1.8, z, 0.25, 0.6, 6, TILE.chrome, TILE.chrome, 1);
        g.box(x - 0.15, s.y + 2.3, z - 0.15, x + 0.15, s.y + 2.4, z + 0.15, TILE.alarm, 0);
      } else g.box(x - 0.8, s.y + 0.5, z - 0.7, x + 0.6, s.y + 0.9, z + 0.8, TILE.console_dead, 0);
    });
    return p;
  },
  computer(s) {
    const { m } = wallXf(s, 1.0, s.dir);
    const p = { kind: 'computer', box: xfBox(m, -1.9, 0, -0.5, 1.9, 2.6, 0.5), solid: true, hp: Infinity, mat: 'metal' };
    propMesh(p, (g) => {
      g.setXf(m);
      g.box(-1.9, 0, -0.5, 1.9, 1.0, 0.5, { front: TILE.console, top: TILE.console_top, side: TILE.metal }, 0);
      for (let k = -1; k <= 1; k++) g.box(k * 1.25 - 0.6, 1.0, 0.05, k * 1.25 + 0.6, 2.6, 0.5, { front: TILE[k ? 'tape' : 'screen'], side: TILE.metal_dk, top: TILE.metal_dk }, 0);
    });
    return p;
  },
  // ---- pickups that sit in the world as props (the master tape)
  // ---- big scenery
  rocket(s) {
    const x = s.x + CELL / 2, z = s.z + CELL / 2, y = s.y;
    const p = { kind: 'rocket', box: [x - 2.6, y, z - 2.6, x + 2.6, y + 44, z + 2.6], solid: true, hp: Infinity, mat: 'metal' };
    propMesh(p, (g) => {
      const roll = (i) => (i % 4 === 0 || i % 4 === 1) ? TILE.rocket_b : TILE.rocket_w;
      for (let k = 0; k < 4; k++) { // fins
        const a = k * Math.PI / 2 + Math.PI / 4, fx = Math.sin(a), fz = Math.cos(a);
        const m = new THREE.Matrix4().makeRotationY(a).setPosition(x, y, z);
        g.setXf(m); g.box(-0.05, 0.4, 1.7, 0.05, 4.2, 3.1, { side: TILE.rocket_w, front: TILE.rocket_b, back: TILE.rocket_b, top: TILE.rocket_b }, 0); g.setXf(null);
        void fx; void fz;
      }
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.cyl(x + Math.sin(a) * 0.9, y + 0.2, z + Math.cos(a) * 0.9, 0.55, 1.2, 8, TILE.gunmetal, TILE.black, 1, true, 0.3); }
      g.cyl(x, y + 1.4, z, 2.0, 17, 8, TILE.rocket_w, TILE.rocket_w, 2);
      ROCKET_SEG(g, x, y + 1.4, z, 2.0, 17, roll);
      g.cyl(x, y + 18.4, z, 2.0, 1.2, 8, TILE.gunmetal, null, 2, false, 1.6);
      ROCKET_SEG(g, x, y + 19.6, z, 1.6, 10, (i) => i === 2 ? TILE.rocket_flag : TILE.rocket_w);
      g.cyl(x, y + 29.6, z, 1.6, 6.5, 8, TILE.rocket_w, null, 2, false, 0.15);
      g.cyl(x, y + 36.1, z, 0.08, 3, 4, TILE.chrome, TILE.chrome, 1);
      // launch table
      g.box(x - 3, y, z - 3, x + 3, y + 0.25, z + 3, TILE.metal_dk, 2);
    });
    return p;
  },
  gantry(s) {
    const x0 = s.x - CELL / 2, z0 = s.z - CELL / 2, y = s.y, w = s.w || 4, d = s.d || 4, h = s.h || 38;
    const p = { kind: 'gantry', box: [x0, y, z0, x0 + w, y + h, z0 + d], solid: true, hp: Infinity, mat: 'metal', seeThrough: true };
    propMesh(p, (g) => {
      const T = TILE.steel_red, b = 0.22;
      for (const [cx, cz] of [[x0, z0], [x0 + w, z0], [x0, z0 + d], [x0 + w, z0 + d]]) g.box(cx - b, y, cz - b, cx + b, y + h, cz + b, T, 2);
      for (let yy = 3; yy < h; yy += 3.2) {
        g.box(x0, yy, z0 - 0.1, x0 + w, yy + 0.25, z0 + 0.1, T, 2); g.box(x0, yy, z0 + d - 0.1, x0 + w, yy + 0.25, z0 + d + 0.1, T, 2);
        g.box(x0 - 0.1, yy, z0, x0 + 0.1, yy + 0.25, z0 + d, T, 2); g.box(x0 + w - 0.1, yy, z0, x0 + w + 0.1, yy + 0.25, z0 + d, T, 2);
      }
      // diagonal bracing on each face (thin rotated boxes)
      for (let yy = 0; yy < h - 3; yy += 3.2) {
        for (const face of [0, 1, 2, 3]) {
          const len = Math.hypot(face < 2 ? w : d, 3.2), ang = Math.atan2(3.2, face < 2 ? w : d);
          const m = new THREE.Matrix4();
          if (face === 0) m.makeRotationZ(ang).setPosition(x0, yy, z0);
          if (face === 1) m.makeRotationZ(ang).setPosition(x0, yy, z0 + d);
          if (face === 2) m.makeRotationX(-ang).premultiply(new THREE.Matrix4().makeRotationY(0)).setPosition(x0, yy, z0);
          if (face === 3) m.makeRotationX(-ang).setPosition(x0 + w, yy, z0);
          g.setXf(m);
          if (face < 2) g.box(0, -0.07, -0.07, len, 0.07, 0.07, T, 0); else g.box(-0.07, -0.07, 0, 0.07, 0.07, len, T, 0);
          g.setXf(null);
        }
      }
      // service arms toward the rocket
      for (const yy of [12, 22, 31]) g.box(x0 - (s.arm || 4), yy, z0 + d / 2 - 0.6, x0, yy + 0.4, z0 + d / 2 + 0.6, { top: TILE.grate, side: T }, 2);
      g.box(x0 - 0.5, y + h, z0 - 0.5, x0 + w + 0.5, y + h + 0.4, z0 + d + 0.5, T, 2);
    }, MAT.cutout2);
    return p;
  },
  lift(s) { // the gantry lift cage: the mission 1 exit
    const x = s.x, z = s.z, y = s.y;
    const p = { kind: 'lift', box: null, solid: false, hp: Infinity };
    propMesh(p, (g) => {
      g.box(x - 0.9, y, z - 0.9, x + 0.9, y + 0.12, z + 0.9, { top: TILE.grate, side: TILE.hazard }, 0);
      for (const [cx, cz] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) g.box(x + cx - 0.06, y, z + cz - 0.06, x + cx + 0.06, y + 2.8, z + cz + 0.06, TILE.hazard, 0);
      g.box(x - 0.9, y + 2.8, z - 0.9, x + 0.9, y + 2.95, z + 0.9, TILE.steel_red, 0);
      g.quad([x - 0.9, y + 0.1, z + 0.9], [x + 0.9, y + 0.1, z + 0.9], [x + 0.9, y + 2.8, z + 0.9], [x - 0.9, y + 2.8, z + 0.9], [0, 1, 1, 1, 1, 0, 0, 0], TILE.fence, [0, 0, 1]);
    }, MAT.cutout2);
    return p;
  },
  shuttle(s) { // a 1960s spaceplane parked in the docking bay
    const x = s.x, z = s.z, y = s.y + 0.6, L0 = s.len || 9;
    const p = { kind: 'shuttle', box: [x - 2.4, s.y, z - L0 / 2, x + 2.4, s.y + 3, z + L0 / 2], solid: true, hp: Infinity, mat: 'metal' };
    propMesh(p, (g) => {
      g.box(x - 1.1, y, z - L0 / 2 + 1.5, x + 1.1, y + 2.0, z + L0 / 2, { side: TILE.hull, top: TILE.hull, back: TILE.metal_dk }, 2);
      // nose wedge
      g.quad([x - 1.1, y, z - L0 / 2 + 1.5], [x + 1.1, y, z - L0 / 2 + 1.5], [x + 0.3, y + 0.8, z - L0 / 2], [x - 0.3, y + 0.8, z - L0 / 2], [0, 1, 1, 1, 1, 0, 0, 0], TILE.rocket_b, [0, -0.3, -1]);
      g.quad([x - 0.3, y + 0.8, z - L0 / 2], [x + 0.3, y + 0.8, z - L0 / 2], [x + 1.1, y + 2.0, z - L0 / 2 + 1.5], [x - 1.1, y + 2.0, z - L0 / 2 + 1.5], [0, 1, 1, 1, 1, 0, 0, 0], TILE.viewport, [0, 0.8, -0.6]);
      g.tri([x - 1.1, y, z - L0 / 2 + 1.5], [x - 0.3, y + 0.8, z - L0 / 2], [x - 1.1, y + 2, z - L0 / 2 + 1.5], [0, 1, 1, 0.5, 0, 0], TILE.hull, [-1, 0, 0]);
      g.tri([x + 1.1, y, z - L0 / 2 + 1.5], [x + 1.1, y + 2, z - L0 / 2 + 1.5], [x + 0.3, y + 0.8, z - L0 / 2], [0, 1, 0, 0, 1, 0.5], TILE.hull, [1, 0, 0]);
      // delta wings
      for (const sx of [-1, 1]) {
        g.quad(sx < 0 ? [x - 1.1, y + 0.2, z - 0.5] : [x + 1.1, y + 0.2, z + L0 / 2], sx < 0 ? [x - 1.1, y + 0.2, z + L0 / 2] : [x + 1.1, y + 0.2, z - 0.5], sx < 0 ? [x - 2.4, y + 0.2, z + L0 / 2] : [x + 2.4, y + 0.2, z + L0 / 2 - 0.4], sx < 0 ? [x - 2.4, y + 0.2, z + L0 / 2 - 0.4] : [x + 2.4, y + 0.2, z + L0 / 2], [0, 0, 1, 0, 1, 1, 0, 1], TILE.rocket_b, [0, -1, 0]);
        g.quad(sx < 0 ? [x - 2.4, y + 0.35, z + L0 / 2 - 0.4] : [x + 2.4, y + 0.35, z + L0 / 2], sx < 0 ? [x - 2.4, y + 0.35, z + L0 / 2] : [x + 2.4, y + 0.35, z + L0 / 2 - 0.4], sx < 0 ? [x - 1.1, y + 0.35, z + L0 / 2] : [x + 1.1, y + 0.35, z - 0.5], sx < 0 ? [x - 1.1, y + 0.35, z - 0.5] : [x + 1.1, y + 0.35, z + L0 / 2], [0, 1, 1, 1, 1, 0, 0, 0], TILE.hull, [0, 1, 0]);
        g.box(x + sx * 2.3 - 0.05, y + 0.3, z + L0 / 2 - 1.2, x + sx * 2.3 + 0.05, y + 1.6, z + L0 / 2, TILE.hull_stripe, 0);
      }
      g.box(x - 0.9, s.y, z - 0.5, x - 0.7, y, z - 0.3, TILE.metal_dk, 0); g.box(x + 0.7, s.y, z - 0.5, x + 0.9, y, z - 0.3, TILE.metal_dk, 0);
      g.box(x - 0.1, s.y, z - L0 / 2 + 2, x + 0.1, y, z - L0 / 2 + 2.2, TILE.metal_dk, 0);
    }, MAT.cutout2);
    return p;
  },
  pod(s) { // escape capsule: exit of mission 2
    const x = s.x, z = s.z, y = s.y;
    const p = { kind: 'pod', box: [x - 1.4, y, z - 1.4, x + 1.4, y + 3, z + 1.4], solid: true, hp: Infinity, mat: 'metal' };
    propMesh(p, (g) => {
      g.cyl(x, y, z, 1.4, 0.4, 10, TILE.metal_dk, TILE.metal_dk, 2);
      g.cyl(x, y + 0.4, z, 1.4, 2.2, 10, TILE.hull_stripe, null, 3, false, 0.5);
      g.cyl(x, y + 2.6, z, 0.5, 0.4, 8, TILE.metal, TILE.metal, 1);
    });
    return p;
  },
  lander(s) { // lunar ascent stage: exit of mission 3
    const x = s.x + CELL / 2, z = s.z + CELL / 2, y = s.y;
    const p = { kind: 'lander', box: [x - 1.8, y, z - 1.8, x + 1.8, y + 5, z + 1.8], solid: true, hp: Infinity, mat: 'metal' };
    propMesh(p, (g) => {
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.box(x + Math.sin(a) * 2.3 - 0.1, y, z + Math.cos(a) * 2.3 - 0.1, x + Math.sin(a) * 2.3 + 0.1, y + 2.0, z + Math.cos(a) * 2.3 + 0.1, TILE.gold, 0); g.cyl(x + Math.sin(a) * 2.3, y, z + Math.cos(a) * 2.3, 0.4, 0.08, 6, TILE.metal, TILE.metal, 1); }
      g.cyl(x, y + 1.0, z, 1.8, 1.4, 8, TILE.gold, TILE.gold, 2);
      g.cyl(x, y + 2.4, z, 1.5, 1.8, 8, TILE.metal, null, 2, false, 1.2);
      g.cyl(x, y + 4.2, z, 1.2, 0.6, 8, TILE.metal, TILE.metal_dk, 2, true, 0.6);
      g.box(x - 0.5, y + 2.6, z - 1.55, x + 0.5, y + 3.6, z - 1.3, TILE.viewport, 0);
      g.cyl(x + 0.8, y + 4.8, z, 0.05, 1.2, 4, TILE.chrome, TILE.chrome, 1);
    });
    return p;
  },
  rover(s) {
    const x = s.x + CELL / 2, z = s.z, y = s.y;
    const p = { kind: 'rover', box: [x - 1.3, y, z - 2, x + 1.3, y + 1.6, z + 2], solid: true, hp: Infinity, mat: 'metal' };
    propMesh(p, (g) => {
      g.box(x - 1.1, y + 0.6, z - 1.8, x + 1.1, y + 0.9, z + 1.8, { top: TILE.grate, side: TILE.gold }, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(x + sx * 1.15, y + 0.45, z + sz * 1.3);
        g.setXf(m); g.cyl(0, -0.15, 0, 0.45, 0.3, 8, TILE.grate, TILE.metal_dk, 2); g.setXf(null);
      }
      g.box(x - 0.9, y + 0.9, z - 0.2, x + 0.9, y + 1.5, z + 0.1, TILE.metal, 0);
      g.cyl(x + 0.6, y + 0.9, z - 1.5, 0.04, 1.2, 4, TILE.chrome, TILE.chrome, 1);
      g.cyl(x + 0.6, y + 2.1, z - 1.5, 0.05, 0.02, 8, TILE.radar, TILE.radar, 1, true, 0.5);
    }, MAT.cutout2);
    return p;
  },
  mirror(s) { // the Helios array outside the lunar base: huge, far, no collision
    const x = s.x, z = s.z, y = s.y;
    const p = { kind: 'mirror', box: null, solid: false, hp: Infinity };
    propMesh(p, (g) => {
      g.cyl(x, y, z, 4, 30, 8, TILE.steel_red, TILE.metal_dk, 3, true, 2.5);
      const m = new THREE.Matrix4().makeRotationX(-0.6).premultiply(new THREE.Matrix4().makeRotationY(s.yaw || 0)).setPosition(x, y + 32, z);
      g.setXf(m);
      const rings = 4, R = 34;
      for (let ri = 0; ri < rings; ri++) {
        const n = 6 + ri * 6;
        for (let k = 0; k < n; k++) {
          const a0 = (k + 0.04) / n * TAU, a1 = (k + 0.96) / n * TAU, r0 = R * (ri + 0.06) / rings, r1 = R * (ri + 0.96) / rings;
          const dip = (r) => (r / R) * (r / R) * 8;
          g.quad([Math.sin(a0) * r0, dip(r0), Math.cos(a0) * r0], [Math.sin(a1) * r0, dip(r0), Math.cos(a1) * r0], [Math.sin(a1) * r1, dip(r1), Math.cos(a1) * r1], [Math.sin(a0) * r1, dip(r1), Math.cos(a0) * r1], [0, 1, 1, 1, 1, 0, 0, 0], TILE.mirror, [0, 1, 0]);
        }
      }
      g.cyl(0, -6, 0, 3, 6, 8, TILE.metal_dk, TILE.metal_dk, 2);
      g.cyl(0, 0, 0, 0.6, 26, 6, TILE.steel_red, TILE.gold, 2, true, 0.3);
      g.cyl(0, 26, 0, 2.4, 3, 8, TILE.gold, TILE.metal, 2);
      g.setXf(null);
    }, MAT.cutoutNoFog);
    return p;
  },
  dome(s) { // lunar surface habitat domes seen through the windows
    const p = { kind: 'dome', box: null, solid: false, hp: Infinity };
    propMesh(p, (g) => {
      g.sphere(s.x, s.y - 1, s.z, s.rad || 8, 10, 6, () => TILE.moon_wall, 4, 2);
      g.cyl(s.x, s.y - 1, s.z, (s.rad || 8) + 0.5, 1.5, 10, TILE.metal_dk, null, 4, false);
    }, MAT.levelNoFog);
    return p;
  },
};
function ROCKET_SEG(g, x, y, z, r, h, tileFn) {
  const sides = 8;
  for (let i = 0; i < sides; i++) {
    const a0 = i / sides * TAU, a1 = (i + 1) / sides * TAU, am = (a0 + a1) / 2;
    g.quad([x + Math.sin(a0) * r * 1.002, y, z + Math.cos(a0) * r * 1.002], [x + Math.sin(a1) * r * 1.002, y, z + Math.cos(a1) * r * 1.002], [x + Math.sin(a1) * r * 1.002, y + h, z + Math.cos(a1) * r * 1.002], [x + Math.sin(a0) * r * 1.002, y + h, z + Math.cos(a0) * r * 1.002],
      [0, h / 4, 1, h / 4, 1, 0, 0, 0], tileFn(i), [Math.sin(am), 0, Math.cos(am)]);
  }
}
function spawnProps() {
  for (const s of L.spawnProps) {
    const kind = s.prop || s.scenery;
    const b = PROPS[kind];
    if (!b) { console.warn('unknown prop', kind); continue; }
    const p = b(s);
    p.id = s.id || null; p.builder = kind; p.spec = s;
    if (s.label) p.label = s.label;
    registerProp(p);
  }
}

// ---------------------------------------------------------------- damage and destruction
function damageProp(p, dmg, explosive, hit) {
  if (p.dead || p.hp === Infinity) return;
  if (p.explosiveOnly && !explosive) { if (hit) spark(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz); return; }
  p.hp -= dmg;
  if (p.hp > 0) return;
  p.dead = true;
  const c = p.box ? [(p.box[0] + p.box[3]) / 2, (p.box[1] + p.box[4]) / 2, (p.box[2] + p.box[5]) / 2] : [0, 0, 0];
  if (p.explosive) {
    unregisterProp(p);
    if (p.mesh) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh = null; }
    later(0.06, () => explode(c[0], p.box[1] + 0.6, c[2], p.explosive.r, p.explosive.dmg, null));
  } else if (p.smash || p.explosiveOnly) {
    p.spec._p = p;
    PROPS[p.builder](p.spec, true);
    for (let k = 0; k < 10; k++) spark(c[0] + rand(-0.4, 0.4), c[1] + rand(0, 0.5), c[2] + rand(-0.4, 0.4), rand(-1, 1), 1, rand(-1, 1));
    smokePuff(c[0], c[1] + 0.5, c[2], 4);
    sfx(p.explosiveOnly ? 'boom' : 'smash', { x: c[0], y: c[1], z: c[2] });
    if (p.kind === 'alarm') alarmPanelDestroyed(p);
  }
  objectiveEvent('destroy', p);
}
