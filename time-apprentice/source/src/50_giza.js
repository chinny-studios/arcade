// Event: building the Great Pyramid of Khufu at Giza, about 2560 BC.
// You're a new helper with the boat crew of Merer, whose diary (found in 2013) is the oldest written papyrus known.

(() => {
  const PY = { x: 0, z: -165, half: 75, top: 52.5, slope: 1.272 }; // the pyramid: centre, half base, current height, rise per run
  const RAMP = { x0: -6, x1: 6, z0: -30, z1: -113.6, h: 30 };
  const BASIN = { x0: 64, x1: 120, z0: -12, z1: 42 };
  const SAND = 0xd4b47c, SAND2 = 0xc8a670, LIME = 0xe9e2cf, CORE = 0xc9b086, MUD = 0xa8845a;
  const pyrH = (x, z) => {
    const d = Math.max(Math.abs(x - PY.x), Math.abs(z - PY.z));
    if (d > PY.half) return -1;
    return Math.min(PY.top, Math.floor((PY.half - d) * PY.slope / 1.5) * 1.5);
  };
  const hill = (x, z) => Math.max(0, 6 - Math.hypot(x - 30, z - 72) * 0.28);
  function height(x, z) {
    if (x > BASIN.x0 && x < BASIN.x1 && z > BASIN.z0 && z < BASIN.z1) return -2.4;
    let h = 0;
    const far = Math.max(0, Math.hypot(x - 10, z + 40) - 150);
    h += fbm(x * 0.02, z * 0.02, 3, 5) * Math.min(1, far / 60) * 8 + Math.min(1, far / 80) * 3;
    h += hill(x, z);
    if (x > RAMP.x0 && x < RAMP.x1 && z < RAMP.z0 && z > RAMP.z1) h = Math.max(h, (RAMP.z0 - z) / (RAMP.z0 - RAMP.z1) * RAMP.h);
    const p = pyrH(x, z); if (p >= 0) h = Math.max(h, p);
    if (x > 150) h = Math.min(h, -1.5 + (x > 160 ? 0 : 1)); // the Nile floodplain
    return h;
  }
  const worker = (o = {}) => Object.assign({ skin: rpick([SKIN.brown, SKIN.olive, SKIN.dark, SKIN.tan]), hair: 0x1a120c, hairStyle: rpick(['short', 'short', 'bald']), topStyle: 'bare', bottom: 0xf2ecdc, bottomStyle: 'kilt', shoes: SKIN.brown, h: rnd(1.6, 1.72) }, o);

  function buildGiza(S, mode) {
    const night = mode === 'night', dusk = mode === 'dusk';
    S.bounds(-170, -260, 160, 130);
    S.ground(height);
    S.add(terrainMesh(-180, -260, 220, 140, 4, height, (x, z, y) => {
      if (x > 150) return x > 175 ? 0x5a8a3a : 0x7a9a4a;
      if (y < -1) return 0x9a8a6a;
      const n = vnoise(x * 0.15, z * 0.15, 9);
      const road = Math.abs((x - 25) * 0.62 + (z - 0) * 0.78) < 6 && z > -30 && z < 30;
      return road ? 0xcaa878 : n > 0.3 ? SAND2 : SAND;
    }));
    const m = S.gb('main'), gl = S.gb('glow');
    // ---- the pyramid, rising in courses; the lowest courses already cased in white ----
    for (let y = 0; y < PY.top; y += 1.5) {
      const hw = PY.half - y / PY.slope;
      m.box(PY.x, y, PY.z, hw * 2, 1.5, hw * 2, y % 3 ? CORE : 0xc0a67c, { j: 0.02 });
    }
    m.frustum(PY.x, 0, PY.z, PY.half * 2 + 0.6, 7.5, PY.half * 2 + 0.6, (PY.half - 7.5 / PY.slope) / PY.half, LIME);
    // the working platform on top: blocks, a shelter, tiny workers
    const tw = PY.half - PY.top / PY.slope;
    for (let i = 0; i < 26; i++) m.box(PY.x + rnd(-tw + 2, tw - 2), PY.top, PY.z + rnd(-tw + 2, tw - 2), 1.4, 1.0, 1.4, rpick([CORE, LIME]));
    for (let i = 0; i < 40; i++) { const x = PY.x + rnd(-tw + 1, tw - 1), z = PY.z + rnd(-tw + 1, tw - 1); m.box(x, PY.top, z, 0.35, 1.2, 0.3, 0xf2ecdc); m.ball(x, PY.top + 1.4, z, 0.18, 0x7a5030, { det: 0 }); }
    // ---- the construction ramp ----
    m.shape([[-RAMP.z0, 0], [-RAMP.z1, RAMP.h], [-RAMP.z1, 0]], 12, MUD, { x: 0, ry: Math.PI / 2 });
    m.shape([[-RAMP.z0 + 2, 0], [-RAMP.z1, RAMP.h - 0.5], [-RAMP.z1, 0]], 15, 0x9a7650, { x: 0, ry: Math.PI / 2 });
    for (const sx of [RAMP.x0 - 1.5, RAMP.x1 + 1.5]) S.solidBox(sx, (RAMP.z0 + RAMP.z1) / 2, 1.5, Math.abs(RAMP.z1 - RAMP.z0) - 4, 0, { y0: 1.5 });
    // timber cross-pieces on the ramp surface (where sledges slide)
    for (let z = RAMP.z0 - 3; z > RAMP.z1 + 2; z -= 2.5) { const y = (RAMP.z0 - z) / (RAMP.z0 - RAMP.z1) * RAMP.h; m.box(0, y - 0.05, z, 5, 0.12, 0.25, 0x7a5a34); }
    S.spot('ramptop', 0, RAMP.z1 + 6, { r: 5 });
    // ---- the harbour basin, with the boat that brought the Tura stone ----
    const wb = new GB(); wb.box((BASIN.x0 + BASIN.x1) / 2, -1.5, (BASIN.z0 + BASIN.z1) / 2, BASIN.x1 - BASIN.x0, 0.05, BASIN.z1 - BASIN.z0, 0xffffff);
    const water = wb.mesh(R.mat.water, { cast: false }); S.add(water);
    m.box(BASIN.x0 - 1.5, -2.5, (BASIN.z0 + BASIN.z1) / 2, 3, 2.6, BASIN.z1 - BASIN.z0 + 6, 0xc8b08a);
    m.box((BASIN.x0 + BASIN.x1) / 2, -2.5, BASIN.z0 - 1.5, BASIN.x1 - BASIN.x0 + 3, 2.6, 3, 0xc8b08a);
    S.solidBox((BASIN.x0 + BASIN.x1) / 2 + 0.5, (BASIN.z0 + BASIN.z1) / 2, BASIN.x1 - BASIN.x0, BASIN.z1 - BASIN.z0);
    // the boat: a long wooden hull with a mast and a furled sail
    const bx = BASIN.x0 + 6, bz = 16;
    m.shape([[-14, 0.5], [-11, -0.6], [11, -0.6], [14, 0.8], [11, 0.2], [-11, 0.2]], 4.2, 0x8a5a30, { x: bx, y: -1.4, z: bz, ry: Math.PI / 2 });
    m.box(bx, -1.0, bz, 3.6, 0.2, 20, 0xa87a48);
    m.cyl(bx, -1, bz - 2, 0.15, 9, 0x6a4a2a, { seg: 6 }); m.box(bx, 6.5, bz - 2, 0.25, 0.25, 7, 0x6a4a2a); m.box(bx, 6.1, bz - 2, 0.6, 0.6, 6.5, 0xe8dcc0);
    for (let i = 0; i < 4; i++) m.box(bx + rnd(-0.8, 0.8), -0.8, bz + 3 + i * 2.2, 1.3, 1.1, 1.3, LIME);
    m.cyl(bx, -1, bz + 9.5, 0.12, 2.5, 0x6a4a2a, { seg: 5, rx: -0.5 });
    S.spot('boat', BASIN.x0 - 2, bz, { r: 4 });
    // the stone yard by the quay, with water jars
    for (let i = 0; i < 14; i++) m.box(rnd(44, 58), 0, rnd(0, 34), rnd(1.3, 1.8), rnd(1.0, 1.4), rnd(1.3, 1.8), rpick([LIME, LIME, CORE]), { ry: rnd(-0.2, 0.2) });
    for (let i = 0; i < 6; i++) S.solidCircle(rnd(46, 56), rnd(2, 32), 0.8);
    const jarObj = () => S.obj((b) => { b.lathe(0, 0, 0, [[0, 0], [0.16, 0.02], [0.22, 0.2], [0.18, 0.42], [0.09, 0.5], [0.11, 0.56], [0, 0.56]], 0xb5683a, 10); });
    for (let i = 0; i < 5; i++) { const j = jarObj(); j.position.set(60 + i * 0.6, 0, 30 + (i % 2) * 0.5); }
    const jar = jarObj(); jar.position.set(61.5, 0, 26); S.item('jar', jar, { label: 'a water jar', dy: 0.6, carryScale: 0.9 });
    // ---- the haul road: crews dragging sledges from the harbour to the ramp and back ----
    const sledge = (loaded) => S.obj((b) => { b.box(-0.7, 0, -1.6, 0.18, 0.2, 3.4, 0x7a4f2a); b.box(0.7, 0, -1.6, 0.18, 0.2, 3.4, 0x7a4f2a); b.box(0, 0.2, -1.5, 1.7, 0.12, 2.6, 0x8a5f34); }, 0, 0, 0);
    const lane = [[50, 14], [28, -4], [6, -24], [5, -29], [12, -27], [31, -6], [53, 16]];
    const segs = []; let tot = 0; for (let i = 0; i < lane.length; i++) { const a = lane[i], b2 = lane[(i + 1) % lane.length], l = Math.hypot(b2[0] - a[0], b2[1] - a[1]); segs.push({ a, b: b2, l, s0: tot }); tot += l; }
    const at = (s) => { s = ((s % tot) + tot) % tot; for (const g of segs) if (s <= g.s0 + g.l) { const k = (s - g.s0) / g.l; return [lerp(g.a[0], g.b[0], k), lerp(g.a[1], g.b[1], k), Math.atan2(g.b[0] - g.a[0], g.b[1] - g.a[1]), g === segs[0] || g === segs[1] || g === segs[2]]; } return [lane[0][0], lane[0][1], 0, true]; };
    const crews = [];
    if (!night) for (let c = 0; c < 2; c++) {
      const sl = sledge(), block = S.obj((b) => b.box(0, 0, 0, 1.4, 1.1, 1.8, LIME), 0, 0.32, -1.5); sl.add(block); S.root.remove(block); block.position.set(0, 0.32, -1.5);
      const crew = { s: c * tot / 2, sl, block, men: [] };
      for (let i = 0; i < 6; i++) crew.men.push(S.extra(worker(), 0, 0, 0, { anim: 'haul', solid: false }));
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      crew.rope = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: 0x8a6a3a })); crew.rope.frustumCulled = false; S.add(crew.rope);
      crew.pour = S.extra(worker({ topStyle: 'bare' }), 0, 0, 0, { anim: 'pour', solid: false });
      crew.pour.hold(S.obj((b) => b.lathe(0, 0, 0, [[0, 0], [0.12, 0.02], [0.16, 0.15], [0.07, 0.32], [0, 0.32]], 0xb5683a, 8), 0, 0, 0));
      crews.push(crew);
    }
    S.tick((dt) => {
      for (const cr of crews) {
        cr.s += dt * 0.9;
        const [x, z, yaw, loaded] = at(cr.s);
        cr.sl.position.set(x, height(x, z), z); cr.sl.rotation.y = yaw; cr.block.visible = loaded;
        cr.men.forEach((a, i) => { const [mx, mz, my] = at(cr.s + 3 + (i >> 1) * 1.4); const off = (i % 2 ? 0.55 : -0.55); a.x = mx + Math.cos(my) * off; a.z = mz - Math.sin(my) * off; a.y = height(a.x, a.z); a.yaw = a.wantYaw = my; a.anim = loaded ? 'haul' : 'walk'; });
        const r = cr.rope.geometry.attributes.position; const lead = cr.men[0]; r.setXYZ(0, x + Math.sin(yaw) * 0.2, height(x, z) + 0.5, z + Math.cos(yaw) * 0.2); r.setXYZ(1, lead.x, lead.y + 1.3, lead.z); r.needsUpdate = true; cr.rope.visible = loaded;
        const [px, pz, py] = at(cr.s + 1.6); cr.pour.x = px + Math.cos(py) * 1.3; cr.pour.z = pz - Math.sin(py) * 1.3; cr.pour.y = height(cr.pour.x, cr.pour.z); cr.pour.yaw = cr.pour.wantYaw = py; cr.pour.anim = loaded ? 'pour' : 'walk';
      }
    });
    // the sledge you help with, waiting by the quay
    const mine = sledge(); mine.position.set(52, 0, 22); mine.rotation.y = -2.4;
    const mb = S.obj((b) => b.box(0, 0, 0, 1.4, 1.1, 1.8, LIME), 52, 0.32, 22, -2.4);
    mb.position.set(52 + Math.sin(-2.4) * -1.5, 0.32, 22 + Math.cos(-2.4) * -1.5);
    S.solidCircle(52, 22, 1.4);
    S.spot('sledge', 50.5, 24.5, { r: 2.5, label: 'Give the water to the crew', place: { x: 50.2, y: 0, z: 25 } });
    for (let i = 0; i < 5; i++) S.extra(worker(), 50 - Math.sin(-2.4) * (4 + i), 22 - Math.cos(-2.4) * (4 + i) + (i % 2 ? 0.7 : -0.7), -2.4 + Math.PI, { anim: 'idle' });
    // ---- Ankhhaf's shade by the ramp foot, and the block yard where the scribe works ----
    m.box(14, 2.6, -34, 6, 0.15, 4, 0xe8dcc0); for (const [sx, sz] of [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]]) m.cyl(14 + sx, 0, -34 + sz, 0.08, 2.6, 0x6a4a2a, { seg: 5 });
    m.box(14, 0, -35, 2, 0.8, 1, 0x8a6a40); m.box(14, 0.8, -35, 1.6, 0.04, 0.8, 0xe8dcc0);
    S.solidBox(14, -35, 2, 1);
    for (let i = 0; i < 10; i++) m.box(-14 + (i % 4) * 2.2, i >= 8 ? 1.2 : 0, -38 + Math.floor(i / 4) * 2.4, 1.8, 1.2, 1.8, i % 3 ? CORE : LIME);
    S.solidBox(-10.7, -36, 9, 6);
    m.box(-8, 0, -31, 1.8, 1.2, 1.8, LIME); S.solidBox(-8, -31, 1.8, 1.8);
    gl.box(-8.2, 0.5, -30.08, 1.0, 0.45, 0.02, 0xc8402a); // a painted crew mark
    // stone cutters at work near the quarry face
    for (let i = 0; i < 6; i++) { const x = -28 - i * 3.2, z = -60 + (i % 2) * 2; S.extra(worker(), x, z, Math.PI / 2, { anim: i % 2 ? 'work' : 'kneel' }); m.box(x + 1.1, 0, z, 1.4, 1, 1.4, CORE); }
    m.box(-40, 0, -66, 30, 3, 4, 0xb89a6c, { j: 0.03 });
    S.solidBox(-40, -66, 30, 4);
    // ---- the sighting circle: a ring of mud brick that makes a level skyline for watching stars ----
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; m.box(-40 + Math.cos(a) * 6, 0, -46 + Math.sin(a) * 6, 1.1, 1.3, 0.6, MUD, { ry: -a + Math.PI / 2 }); }
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; if (Math.abs(angWrap(a - Math.PI / 2)) > 0.3) S.solidCircle(-40 + Math.cos(a) * 6, -46 + Math.sin(a) * 6, 0.55); }
    m.box(-40, 0, -48.5, 0.15, 2.2, 0.15, 0x6a4a2a); m.box(-41, 2.2, -48.5, 2.2, 0.12, 0.12, 0x6a4a2a); m.rod([-41.9, 2.2, -48.5], [-41.9, 1.0, -48.5], 0.01, 0xe8dcc0); m.cone(-41.9, 0.85, -48.5, 0.05, 0.15, 0x8a6a2a, { seg: 6, rx: Math.PI });
    S.spot('circle', -40, -42, { r: 3 });
    // ---- the workers' town: walled galleries and a bakery full of smoke ----
    const tx = -78, tz = 58;
    for (const [x, z, w, d] of [[tx, tz - 22, 56, 1.2], [tx, tz + 22, 56, 1.2], [tx - 28, tz, 1.2, 45]]) { m.box(x, 0, z, w, 3, d, MUD); S.solidBox(x, z, w, d); }
    m.box(tx + 28, 0, tz - 14, 1.2, 3, 17, MUD); S.solidBox(tx + 28, tz - 14, 1.2, 17);
    m.box(tx + 28, 0, tz + 14, 1.2, 3, 17, MUD); S.solidBox(tx + 28, tz + 14, 1.2, 17);
    for (let i = 0; i < 3; i++) {
      const gz = tz - 14 + i * 9.5;
      m.box(tx - 8, 0, gz, 30, 2.8, 5, 0xb89468); m.box(tx - 8, 2.8, gz, 31, 0.3, 5.6, 0x9a7a50);
      for (let k = 0; k < 6; k++) m.box(tx - 21 + k * 5, 0, gz + 2.51, 1.0, 1.9, 0.05, 0x3a2a1a);
      S.solidBox(tx - 8, gz, 30, 5);
    }
    // the bakery yard: ovens, bread pots and dough tables
    const kx = tx + 12, kz = tz + 12;
    m.box(kx, 0, kz - 4, 12, 2.2, 0.8, MUD); S.solidBox(kx, kz - 4, 12, 0.8);
    for (let i = 0; i < 4; i++) {
      const ox = kx - 4.5 + i * 3; m.ball(ox, 0.3, kz - 2.4, 0.9, 0x9a6a44, { sy: 0.9 }); gl.ball(ox, 0.4, kz - 1.6, 0.3, 0xff8a3a, { det: 0, sy: 0.6 }); S.solidCircle(ox, kz - 2.4, 0.9);
      if (!night) S.emitter(ox, 1.4, kz - 2.4, { color: 0xb8b0a8, size: 1.6, rise: 1.2, life: 4, n: 12, opacity: 0.35 });
    }
    for (let i = 0; i < 20; i++) m.lathe(kx - 5 + (i % 10) * 1.0, 0, kz + 1.2 + Math.floor(i / 10) * 0.8, [[0, 0], [0.14, 0], [0.22, 0.26], [0.1, 0.4], [0, 0.4]], 0xb5683a, 8);
    m.box(kx + 2, 0, kz + 3.5, 4, 0.8, 1.2, 0x8a6a40); for (let i = 0; i < 8; i++) m.ball(kx + 0.5 + i * 0.45, 0.88, kz + 3.5, 0.15, 0xc8823a, { sy: 0.6, det: 0 });
    S.solidBox(kx + 2, kz + 3.5, 4, 1.2);
    // palms and the green Nile valley to the east
    for (let i = 0; i < 40; i++) { const x = rnd(152, 215), z = rnd(-240, 130), h = rnd(6, 10); m.cyl(x, height(x, z), z, 0.22, h, 0x7a5a3a, { seg: 5, rt: 0.7 }); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; m.box(x + Math.cos(a) * 1.4, height(x, z) + h - 0.4, z + Math.sin(a) * 1.4, 3, 0.1, 0.8, 0x4a7a2a, { ry: -a, rz: 0.4 }); } }
    m.box(240, -1.8, -50, 60, 0.3, 500, 0x4a7a8a);
    // a few tents and shades about the site
    for (const [x, z] of [[30, -20], [-24, -24], [36, 8], [-30, 10]]) { m.box(x, 0, z, 4, 2.0, 3, 0xe8dcc0); m.frustum(x, 2.0, z, 4.4, 0.8, 3.4, 0.1, 0xd8ccb0); S.solidBox(x, z, 4, 3); }
    // torches at night
    if (night) for (const [x, z] of [[-34, -42], [-46, -42], [-34, -50], [12, -30], [-60, 40]]) { m.cyl(x, 0, z, 0.06, 1.8, 0x5a3a20, { seg: 5 }); gl.ball(x, 1.95, z, 0.16, 0xffb050, { det: 0 }); S.emitter(x, 2.0, z, { color: 0xffa040, size: 0.6, rise: 1.2, life: 0.8, n: 8, opacity: 0.8, add: true, spread: 0.08 }); const l = new THREE.PointLight(0xffa050, 0.9, 14, 2); l.position.set(x, 2.2, z); S.add(l); }
    // ---- people ----
    S.actor('merer', 60, 19, -0.6);
    S.actor('ankhhaf', 13, -33, 0.3);
    S.actor('nebi', -9.5, -29.5, 0.6, { anim: 'stand' });
    S.actor('henut', kx + 1, kz + 2, Math.PI, { anim: 'work' });
    S.actor('medic', 22, -18, -1.2);
    S.actor('hauler', 46, 30, 2.2);
    S.actor('girl', kx - 2, kz + 4, 0.5);
    for (let i = 0; i < 4; i++) S.extra(worker({ topStyle: 'dress', bottomStyle: 'dress', bottom: 0xf4ecdc, hairStyle: 'long', h: 1.58 }), kx - 6 + i * 3.5, kz - 0.5, Math.PI, { anim: i % 2 ? 'work' : 'kneel' });
    for (let i = 0; i < 6; i++) S.extra(worker(), rnd(tx - 20, tx + 20), tz - 18 + rnd(0, 3), rnd(0, TAU), { anim: rpick(['idle', 'sit', 'talk']) });
    S.spot('bakery', kx, kz + 6, { r: 6 });
    S.spot('gate', tx + 32, tz, { r: 5 });
  }

  const nightEnv = { top: 0x050a1e, hor: 0x1a2848, bot: 0x0a0a14, sun: [-0.3, 0.6, -0.4], sunCol: 0x8aa0d8, sunI: 0.35, sunSize: 3, hemiSky: 0x3a4a7a, hemiGround: 0x1a1a24, hemiI: 0.45, amb: 0.1, fog: 0x0e1426, fogD: 0.004, stars: 1, clouds: 0.05, cloudCol: 0x2a3050 };
  const dayEnv = { top: 0x2f78d0, hor: 0xf0dfb4, bot: 0xd8c090, sun: [0.35, 0.85, 0.45], sunCol: 0xfff0d0, sunI: 0.85, hemiSky: 0xd8e8f8, hemiGround: 0xb09060, hemiI: 0.45, amb: 0.05, fog: 0xe8dcc0, fogD: 0.0028, clouds: 0.12 };
  const duskEnv = { top: 0x3a4a8a, hor: 0xff9a5a, bot: 0xa06a4a, sun: [-0.85, 0.16, 0.35], sunCol: 0xffa060, sunI: 1.1, sunSize: 2.5, hemiSky: 0xffb890, hemiGround: 0x7a5a4a, hemiI: 0.55, amb: 0.12, fog: 0xe8a070, fogD: 0.003, clouds: 0.35, cloudCol: 0xffc0a0 };

  Scenarios.add({
    id: 'giza', title: 'Building the Great Pyramid', place: 'Giza, Egypt', when: 'About 2560 BC', year: -2560, color: 0xd8962a,
    blurb: 'Haul white stone from the river, find north by the stars and count out bread in the workers\' town while the Great Pyramid of King Khufu rises.',
    role: "You're a new helper with Merer's boat crew.",
    homeLine: "You're back! And covered in sand. So, did you see the Great Pyramid going up?",
    souvenir: { name: 'a little model pyramid', text: 'Carved from a chip of the fine white Tura limestone that once covered the Great Pyramid.', build(b) { b.box(0, 0, 0, 0.32, 0.03, 0.32, 0x8a6a4a); b.frustum(0, 0.03, 0, 0.26, 0.17, 0.26, 0, 0xf2ece0); b.frustum(0, 0.165, 0, 0.035, 0.035, 0.035, 0, 0xffd25a); } },
    note: 'Merer, Ankhhaf and King Khufu were real people. Nebi the scribe, Henut the baker and the other workers are made up, but they do the jobs that real workers did. Nobody knows exactly how the ramps were built or how the builders found north; the game shows ideas that archaeologists think are likely.',
    cast: {
      merer: { name: 'Merer', title: 'inspector of a boat crew', real: true, about: 'An inspector who led a crew of about 40 men in Khufu\'s time. His diary on papyrus was found in 2013 at Wadi al-Jarf, an ancient harbour on the Red Sea.', voice: { pitch: 0.9, rate: 1 },
        look: { skin: SKIN.brown, hair: 0x14100c, hairStyle: 'wig', topStyle: 'bare', collar: 0x3a8a8a, bottom: 0xf4eedf, bottomStyle: 'kilt', shoes: 0x8a5a34, h: 1.72 },
        lines: ['Every ten days we make two or three trips between the quarry and Giza. I write it all down.', 'At high flood the river spreads right up to the edge of the desert. Then boats can sail almost to the pyramid!', 'My crew is about forty men. We row, we sail, we haul. And we eat a lot of bread!'] },
      ankhhaf: { name: 'Ankhhaf', title: "overseer of the King's works", real: true, about: "A prince, the half-brother of King Khufu. Merer's diary names him as the official in charge at the time.", voice: { pitch: 0.75, rate: 0.95 },
        look: { skin: SKIN.olive, hair: 0x14100c, hairStyle: 'wig', topStyle: 'bare', collar: 0xd8a83a, bottom: 0xfaf6ea, bottomStyle: 'robe', shoes: 0xc8a050, h: 1.78, w: 1.08 },
        lines: ['The King\'s architects plan every block. The base must be almost perfectly flat and square.', 'Each block has to be put in exactly the right place. A small mistake at the bottom would be a big mistake at the top.'] },
      nebi: { name: 'Nebi', title: 'scribe', voice: { pitch: 1.05, rate: 1.05 },
        look: { skin: SKIN.tan, hairStyle: 'bald', topStyle: 'bare', bottom: 0xf4eedf, bottomStyle: 'kilt', h: 1.66, w: 1.1 },
        lines: ['A scribe goes to school for years to learn hundreds of signs. It\'s hard work, but scribes never have to haul stone!', 'I write with a reed brush, using black ink made from soot and red ink made from ochre.'] },
      henut: { name: 'Henut', title: 'baker in the workers\' town', voice: { pitch: 1.3, rate: 1 },
        look: { skin: SKIN.brown, hair: 0x14100c, hairStyle: 'long', top: 0xf4eedf, topStyle: 'dress', bottom: 0xf4eedf, bottomStyle: 'dress', h: 1.58 },
        lines: ['We grind the grain by hand on flat stones. It takes hours!', 'The beer we brew is thick and not very strong. It is food too, full of goodness.'] },
      medic: { name: 'Seneb', title: 'physician', voice: { pitch: 0.95 }, look: worker({ hairStyle: 'short', collar: 0x8a3a3a, h: 1.68 }),
        lines: [{ t: 'I\'m a physician. When a worker breaks an arm, I set the bone with wooden splints and linen bandages, and it heals straight.', fact: 'doctors' }, 'I use honey on cuts. It helps keep wounds clean.'] },
      hauler: { name: 'Djedi', title: 'hauler, Friends of Khufu crew', voice: { pitch: 1.0 }, look: worker({ h: 1.7 }),
        lines: ['I come from a village far up the river. After three months here I will go home for the harvest.', 'Heave! Ho! Sorry, I practise our chant even when we are resting.'] },
      girl: { name: 'Tia', title: "Henut's daughter", voice: { pitch: 1.6, rate: 1.05 }, look: { skin: SKIN.brown, hair: 0x14100c, hairStyle: 'bun', topStyle: 'dress', top: 0xf4eedf, bottom: 0xf4eedf, bottomStyle: 'dress', h: 1.25, kid: true },
        lines: ['I help Mama carry flour. When I grow up I want to be a scribe like Nebi!', 'Do you want to see my toy? It\'s a wooden lion. Its jaw moves when you pull the string!'] },
    },
    facts: {
      tura: { t: 'Shining white stone', x: 'The outside of the Great Pyramid was covered with smooth, fine white limestone from the *Tura* quarries across the Nile. Most of it was taken away hundreds of years later to build the city of Cairo.' },
      merer: { t: "Merer's diary", x: "In 2013, archaeologists found papyrus scrolls at an ancient harbour on the Red Sea. They are the diary of an inspector called *Merer*, from Khufu's time. They are the oldest papyri with writing ever found, and they tell how his crew carried limestone to Giza." },
      wet: { t: 'Wet sand', x: 'An Egyptian tomb painting shows a man pouring water in front of a sledge carrying a giant statue. In 2014, scientists tested the idea: the right amount of water can make sand about *half as hard* to pull a sledge over!' },
      khufu: { t: 'King Khufu', x: 'The Great Pyramid was built as the tomb of the pharaoh *Khufu*, about 4,500 years ago. It was about 146 metres tall, the tallest building made by people for almost 4,000 years.' },
      blocks: { t: 'Millions of blocks', x: 'About *2.3 million* blocks of stone went into the Great Pyramid. Most came from a quarry right next to it. Huge granite beams for the King\'s burial chamber came by boat from Aswan, about 800 km up the Nile.' },
      ramps: { t: 'Ramps', x: 'Builders hauled blocks up ramps of mud brick, rubble and stone chips. Nobody knows exactly what shape the ramps were: straight, zigzag or wrapped around the pyramid. Archaeologists are still finding clues.' },
      north: { t: 'Pointing north', x: 'The sides of the Great Pyramid face north, south, east and west almost perfectly: they are off by less than a tenth of a degree! Nobody knows for sure how the builders did it. One idea is that they watched stars turning around the north pole of the sky.' },
      gangs: { t: 'Friends of Khufu', x: 'Work crews had team names. Red paint marks hidden inside the Great Pyramid say *Friends of Khufu*. Another pyramid has marks from a crew called the *Drunkards of Menkaure*!' },
      glyphs: { t: 'Sound signs', x: 'Hieroglyphs can stand for whole words or for sounds. Khufu\'s name is written with a sieve (*kh*), a quail chick (*w*), a horned viper (*f*) and another chick (*w*). Royal names were written inside an oval called a *cartouche*.' },
      numbers: { t: 'Egyptian numbers', x: 'Egyptians wrote numbers with signs: a stroke for 1, a heel bone for 10, a coil of rope for 100 and a lotus flower for 1,000. So 23 is two heel bones and three strokes.' },
      bread: { t: 'Bread in pots', x: 'Bakers in the workers\' town baked bread in heavy clay pots called *bedja*, heated in hot ashes. Archaeologists found whole bakeries here, with the pots still in place.' },
      paid: { t: 'Not slaves', x: 'For a long time people thought slaves built the pyramids. But archaeologists found the workers\' town and their tombs. The workers were paid in bread, beer and even meat, and many came in teams for a few months at a time.' },
      doctors: { t: 'Doctors on site', x: 'Skeletons of pyramid workers show broken bones that healed straight, so the workers had real medical care.' },
      years: { t: 'About twenty years', x: 'Building the Great Pyramid probably took about *20 years*. It is the oldest of the Seven Wonders of the Ancient World, and the only one still standing.' },
    },
    sets: {
      day: { env: dayEnv, amb: 'desert', surf: 'sand', build: (S) => buildGiza(S, 'day') },
      night: { env: nightEnv, amb: 'night', surf: 'sand', build: (S) => buildGiza(S, 'night') },
      dusk: { env: duskEnv, amb: 'desert', surf: 'sand', build: (S) => buildGiza(S, 'dusk') },
    },
    chapters: [
      { title: 'The harbour', set: 'day', start: [55, 24, 'merer'], steps: [
        { chat: [
          ['merer', "Ah, you must be the new helper! Welcome to Giza. I'm *Merer*, inspector of this boat crew."],
          ['merer', 'We just sailed across the Nile from the quarries at *Tura*. See that white stone? It\'s the finest limestone in all of Egypt.'],
          ['you', 'What is it for?'],
          ['merer', "For the outside of the King's pyramid! When it's finished, the whole thing will be covered in it and shine in the sun."],
        ], fact: 'tura' },
        { chat: [
          ['merer', 'I write down everything we do in my diary: every trip, every day. Maybe someone will read it one day!'],
          ['merer', "Now, let's get this block moving. Fetch one of the *water jars* by the quay and bring it to the sledge."],
        ], fact: 'merer' },
        { goal: 'Bring a *water jar* to the sledge', bring: 'jar', use: 'sledge', hint: 'Pick up a water jar first. They are by the quay.' },
        { chat: [
          ['merer', 'Good! Now, here\'s our secret: we pour water on the sand in front of the sledge. Wet sand is much easier to pull over.'],
          ['merer', 'Grab the rope with the crew, and keep time with our chant. And when it\'s your turn with the jar, pour!'],
        ] },
        { play: 'rhythm', title: 'Haul the block', how: 'Press *Heave!* (← or A) on the beat with the crew. When a blue circle comes, press *Water!* (→ or D) to wet the sand.',
          lanes: [{ label: 'Heave!', color: '#f0a83a' }, { label: 'Water!', color: '#4aa8e8' }], pattern: '0.0.1.0.0.0.1.0.0.1.0.0.0.1.0.0.1.0.', bpm: 78, chant: ['Heave!', 'ho!'], scene: 'sledge', need: 0.65,
          winText: 'The block slides along! The wet sand makes it so much easier.', fact: 'wet' },
        { chat: [
          ['merer', "You've got the knack! This block will go up the ramp to the pyramid."],
          ['merer', 'Go and find the overseer, *Ankhhaf*, at the foot of the ramp. He is the King\'s own brother! Tell him the Tura stone has arrived.'],
        ] },
      ] },
      { title: 'The pyramid', set: 'day', start: [36, -4, 'ankhhaf'], steps: [
        { goal: 'Find *Ankhhaf* at the foot of the ramp', talk: 'ankhhaf' },
        { chat: [
          ['ankhhaf', "The Tura stone is here? Excellent. So you are Merer's new helper."],
          ['ankhhaf', 'Look up, young one. This is the House of Eternity of King *Khufu*. When it is finished, it will be the tallest thing anyone has ever built.'],
        ], fact: 'khufu' },
        { chat: [
          ['ankhhaf', 'We need more than two million blocks. Most are cut from the quarry right here. The white ones come by boat, and the granite comes all the way from Aswan.'],
          ['you', 'How do you get them all the way up there?'],
          ['ankhhaf', "Ramps! Mud brick and rubble, built higher as the pyramid grows. Climb this one and see for yourself. Just stay out of the sledges' way!"],
        ], fact: 'blocks' },
        { goal: 'Climb the ramp and look out over the building site', to: 'ramptop' },
        { say: 'narrator', text: 'From up here you can see the river, the harbour, the workers\' town, and thousands of people hauling, cutting and building.', fact: 'ramps' },
        { goal: 'Go back down to *Ankhhaf*', talk: 'ankhhaf' },
        { ask: 'ankhhaf', q: 'Tell me, helper: why do we cover the outside with polished white stone?', a: [
          ['So it shines in the sun and looks splendid', true, "Yes! Covered in polished white limestone, the pyramid will gleam. People will see it shining from far away."],
          ['To keep the rain out', false, 'Hmm. It hardly ever rains here in the desert! Think about how it will look.'],
          ['Because white stone is light and easy to lift', false, 'Not at all: those blocks are still terribly heavy! Think about how it will look in the sunshine.'],
        ] },
        { chat: [['ankhhaf', 'The King wants each side of his pyramid to face exactly north, south, east or west. Tonight we check it by the stars.'], ['ankhhaf', 'Meet me at the *sighting circle* after dark.']] },
      ] },
      { title: 'The stars', set: 'night', start: [-30, -34, 'ankhhaf'], setup(S) { S.actors.ankhhaf.tp(-40, -45, 0); }, steps: [
        { goal: 'Meet Ankhhaf at the *sighting circle*', talk: 'ankhhaf' },
        { chat: [
          ['ankhhaf', 'Look north, over the wall. See how the stars turn slowly around one point in the sky?'],
          ['ankhhaf', 'Two bright stars go round it like the hands of a clock. When one is straight above the other, a plumb line through them points exactly north.'],
          ['ankhhaf', 'Hold the plumb line steady and tell me the moment they line up.'],
        ] },
        { play: 'align', stars: ['Kochab', 'Mizar'], winText: 'You marked true north! At dawn we will lay out a line along your mark.', fact: 'north' },
        { chat: [['ankhhaf', 'Well done. The pyramid will point north for thousands of years, and no one will know whose hands helped.'], ['ankhhaf', 'Get some sleep. Tomorrow *Nebi the scribe* needs a helper.']] },
      ] },
      { title: "The crew's mark", set: 'day', start: [-2, -24, 'nebi'], steps: [
        { goal: 'Find *Nebi the scribe* by the stone blocks', talk: 'nebi' },
        { chat: [
          ['nebi', "Ah, the new helper! I'm Nebi. I keep the records: blocks, crews, bread, everything."],
          ['nebi', 'Every crew paints its team name on its blocks. Our crew is called *Friends of Khufu*! See the red mark on that block?'],
        ], fact: 'gangs' },
        { chat: [
          ['nebi', 'The King\'s name goes inside a *cartouche*, an oval rope that protects it. Can you write it?'],
          ['nebi', 'We use sound signs. Khufu is *kh*, *w*, *f*, *w*: the sieve, the quail chick, the horned viper, and the chick again.'],
        ] },
        { play: 'spell', title: "Write the King's name", target: ['kh', 'w', 'f', 'w'], decoys: ['m', 'n', 'r', 'p', 't', 'b', 'i', 's'], frame: 'cartouche', prompt: "Write the King's name:  kh – w – f – w",
          tiles: { kh: { sound: 'kh' }, w: { sound: 'w' }, f: { sound: 'f' }, m: { sound: 'm' }, n: { sound: 'n' }, r: { sound: 'r' }, p: { sound: 'p' }, t: { sound: 't' }, b: { sound: 'b' }, i: { sound: 'i' }, s: { sound: 's' } },
          winText: "KHUFU! You wrote the King's name in hieroglyphs.", fact: 'glyphs' },
        { chat: [
          ['nebi', 'Beautiful! Now, the bakers in the workers\' town need someone who can read numbers. We write those with pictures too!'],
          ['nebi', 'Go to *Henut\'s bakery* in the workers\' town, past the long houses.'],
        ], fact: 'numbers' },
      ] },
      { title: "The workers' town", set: 'day', start: [-34, 40, 'henut'], steps: [
        { goal: "Go to *Henut's bakery* in the workers' town", talk: 'henut' },
        { chat: [
          ['henut', 'Hello, little one! Mind the ovens, they\'re hot.'],
          ['henut', 'We bake bread in clay pots set in hot ashes. Thousands of loaves every day!'],
        ], fact: 'bread' },
        { chat: [
          ['henut', 'The workers are paid in bread and beer, and sometimes meat. They are not slaves, you know. They are proud workers, and the town looks after them.'],
          ['henut', 'Here come the crews for their bread. Read the number on each tally and give them the right amount.'],
        ], fact: 'paid' },
        { play: 'count', rounds: [4, 12, 23], who: ['Friends of Khufu, team 1', 'Friends of Khufu, team 2', "Merer's boat crew"], winText: 'Every crew got the right amount of bread. Nebi would be proud!' },
        { chat: [['henut', "Clever! You'd make a fine scribe."], ['henut', 'The sun is going down. Merer is up on the hill, watching the pyramid. Go and say goodbye.']] },
        { scene: 'dusk', at: [22, 58, 0], setup(S) { S.actors.merer.tp(30, 70, Math.PI + 0.3); } },
        { goal: 'Find *Merer* on the hill', talk: 'merer' },
        { chat: [
          ['merer', 'Look at it, glowing in the evening sun. It will take about twenty years to finish.'],
          ['merer', "Tonight I'll write about you in my diary: a helper who hauled stone, found north, wrote the King's name and counted the bread!"],
          ['you', 'Will people really read your diary one day?'],
          ['merer', 'Who knows? Papyrus can last a very long time in the dry desert.'],
        ], fact: 'years' },
        { say: 'narrator', text: "Merer's diary was found in 2013, about 4,500 years later. It is the oldest papyrus with writing ever found." },
      ] },
    ],
  });
})();
