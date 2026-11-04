// ---- outdoor: Brindle Isle. Terrain mesh, sea, buildings, nature, colliders, doors and interactables ----
const OUT = { sea: null, seaBase: null, sails: null, engineMat: null, lampMat: null, seal: null, stackTop: null, pillars: [], regions: [] };
(function () {
  const P = ISLE.P;
  const H = (x, z) => ISLE.H(x, z);
  function setupPads() {
    const pad = (k, r, dh = 0) => { const [x, z] = Array.isArray(k) ? k : P[k]; ISLE.pad(x, z, r, ISLE.rawH(x, z) + dh); };
    pad('cottage', 5.5); pad('lighthouse', 6);
    ISLE.pad(48, 8, 17, 2.4); ISLE.pad(62, -8, 11, 2.4); ISLE.pad(42, 24, 6.5, 2.4);
    ISLE.pad(24, -4, 5, 2.4); ISLE.pad(30, 24, 5, 2.4); ISLE.pad(54, 24, 5.5, 2.4); ISLE.pad(44, -12, 5, 2.4);
    pad('windmill', 5.5, 0.4); pad([26, 44], 4);
  }
  // ---------- terrain ----------
  function buildTerrain(group) {
    const S = 240, N = 160, step = S / N, half = S / 2;
    const hs = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hs[j * (N + 1) + i] = H(-half + i * step, -half + j * step);
    const pos = [], col = [];
    const hAt = (i, j) => hs[j * (N + 1) + i];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x0 = -half + i * step, z0 = -half + j * step, x1 = x0 + step, z1 = z0 + step;
      const a = hAt(i, j), b = hAt(i + 1, j), c = hAt(i, j + 1), d = hAt(i + 1, j + 1);
      if (Math.max(a, b, c, d) < -8.5) continue;
      const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
        const mx = (ax + bx + cx) / 3, mz = (az + bz + cz) / 3, my = (ay + by + cy) / 3;
        const slope = (Math.max(ay, by, cy) - Math.min(ay, by, cy)) / step;
        const k = ISLE.color(mx, mz, my, slope);
        const n = 0.94 + Math.random() * 0.08;
        pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        for (let q = 0; q < 3; q++) col.push(k[0] * n, k[1] * n, k[2] * n);
      };
      if ((i + j) % 2) { tri(x0, a, z0, x0, c, z1, x1, b, z0); tri(x1, b, z0, x0, c, z1, x1, d, z1); }
      else { tri(x0, a, z0, x0, c, z1, x1, d, z1); tri(x0, a, z0, x1, d, z1, x1, b, z0); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, MAT.vc); m.matrixAutoUpdate = false;
    group.add(m);
  }
  function buildSea(group) {
    const g = new THREE.PlaneGeometry(700, 700, 90, 90); g.rotateX(-Math.PI / 2);
    const ng = g.toNonIndexed(); g.dispose();
    OUT.seaBase = Float32Array.from(ng.attributes.position.array);
    const mat = new THREE.MeshLambertMaterial({ color: 0x3f6f86, transparent: true, opacity: 0.86 });
    const sea = new THREE.Mesh(ng, mat); sea.frustumCulled = false;
    OUT.sea = sea; OUT.seaMat = mat;
    group.add(sea);
  }
  OUT.animateSea = function (t) {
    const sea = OUT.sea; if (!sea || !sea.visible) return;
    const p = sea.geometry.attributes.position.array, b = OUT.seaBase;
    const storm = G.weather !== 'sun' ? 1 : 0.45;
    for (let i = 0; i < p.length; i += 3) {
      const x = b[i], z = b[i + 2];
      p[i + 1] = (Math.sin(x * 0.11 + t * 1.3) * 0.22 + Math.sin(z * 0.13 - t * 1.1) * 0.2 + Math.sin((x + z) * 0.31 + t * 2.1) * 0.07) * storm;
    }
    sea.geometry.attributes.position.needsUpdate = true;
    sea.geometry.computeVertexNormals();
  };
  OUT.setWeather = function () {
    if (!OUT.seaMat) return;
    const sun = G.weather === 'sun';
    OUT.seaMat.color.setHex(sun ? 0x3f9fc4 : 0x3f6f86);
    if (OUT.engineMat) OUT.engineMat.color.setHex(sun ? 0xfff2b0 : 0x9a5aff);
    if (OUT.engineLight) OUT.engineLight.color.setHex(sun ? 0xffe8a0 : 0xa070ff);
  };

  // ---------- helpers ----------
  function house(a, x, z, ry, o, nb) {
    const y = H(x, z), b = nb || new Batch();
    PROPS.house(b, x, y, z, ry, o);
    const w = o.w || 6, d = o.d || 5, h = o.h || 3.2;
    const side = Math.abs(Math.sin(ry)) > 0.5;
    boxCol(a, x, z, (side ? d : w) / 2 + 0.15, (side ? w : d) / 2 + 0.15, y - 2, y + h + 2.5, 0, { noStand: true });
    if (!nb) { const g = new THREE.Group(); g.add(b.build()); a.group.add(g); fadeReg(a, g); }
    // the door position (local +z face)
    const [dx, dz] = rot(o.doorX || 0, d / 2 + 0.6, ry);
    return { y, door: [x + dx, z + dz] };
  }
  function fadeReg(a, g) {
    const mats = [];
    g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    g.updateMatrixWorld(true);
    a.faders.push({ obj: g, mats, box: new THREE.Box3().setFromObject(g), op: 1 });
  }
  function doorBox(x, z, w = 1.6) { return [x - w / 2, z - w / 2, x + w / 2, z + w / 2]; }

  function build(a) {
    a.faders = [];
    setupPads();
    buildTerrain(a.group);
    buildSea(a.group);
    const nat = new Batch();      // nature: trees, rocks, bushes
    const deco = new Batch();     // small man-made bits
    const yAt = (x, z) => H(x, z);

    // ===== Lighthouse Point =====
    {
      const [lx, lz] = P.lighthouse, y = H(lx, lz);
      const b = new Batch();
      b.p('cyl12', 0xa89c80, lx, y + 0.4, lz, 8, 0.8, 8);
      const bands = 6, hT = 15;
      for (let i = 0; i < bands; i++) {
        const r0 = lerp(3.4, 2.6, i / bands), r1 = lerp(3.4, 2.6, (i + 1) / bands);
        const geo = new THREE.CylinderGeometry(r1, r0, hT / bands, 12);
        b.add(geo, i % 2 ? 0xd94a3a : 0xf4f0e6, M4(lx, y + 0.8 + (i + 0.5) * hT / bands, lz));
      }
      b.p('cyl12', 0x3a3a40, lx, y + hT + 0.95, lz, 7.2, 0.3, 7.2);
      for (let i = 0; i < 16; i++) { const an = i / 16 * TAU; b.p('box', 0x2e2e34, lx + Math.sin(an) * 3.5, y + hT + 1.6, lz + Math.cos(an) * 3.5, 0.1, 1.0, 0.1); }
      b.p('torus', 0x2e2e34, lx, y + hT + 2.05, lz, 7.0, 7.0, 0.6, 0, Math.PI / 2);
      b.p('cyl12', 0x2e2e34, lx, y + hT + 4.6, lz, 4.4, 0.25, 4.4);
      b.p('cone', 0xd94a3a, lx, y + hT + 5.6, lz, 5.0, 2.0, 5.0);
      b.p('sph', 0x2e2e34, lx, y + hT + 6.8, lz, 0.6, 0.6, 0.6);
      // door arch on the east side
      b.p('box', 0x4a3424, lx + 3.3, y + 1.9, lz, 0.5, 2.6, 1.6);
      b.p('cyl', 0x4a3424, lx + 3.3, y + 3.2, lz, 0.5, 1.6, 1.6, 0, 0, Math.PI / 2);
      b.p('box', 0xe6dccb, lx + 3.2, y + 6.5, lz, 0.4, 0.9, 0.7);
      b.p('box', 0xe6dccb, lx + 2.9, y + 10.5, lz + 0.8, 0.4, 0.9, 0.7, 0.3);
      const g = new THREE.Group(); g.add(b.build());
      // the lamp room: the Storm Engine glows purple until it is broken
      OUT.engineMat = new THREE.MeshBasicMaterial({ color: 0x9a5aff });
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 2.4, 12), OUT.engineMat); glass.position.set(lx, y + hT + 3.2, lz); g.add(glass);
      const cage = new Batch(); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; cage.p('box', 0x2e2e34, lx + Math.sin(an) * 2.05, y + hT + 3.2, lz + Math.cos(an) * 2.05, 0.12, 2.5, 0.12); }
      g.add(cage.build());
      OUT.engineLight = new THREE.PointLight(0xa070ff, 1.4, 40); OUT.engineLight.position.set(lx, y + hT + 3.2, lz); g.add(OUT.engineLight);
      // the bailiff's seal on the door
      const seal = new THREE.Group();
      seal.add(mesh(GEO.cyl12, 0xc0302a, 0, 0, 0, 1.1, 0.12, 1.1)); seal.children[0].rotation.z = Math.PI / 2;
      seal.add(mesh(GEO.cyl12, 0xd6b25a, 0.05, 0, 0, 0.7, 0.12, 0.7)); seal.children[1].rotation.z = Math.PI / 2;
      seal.add(mesh(GEO.box, 0x8a6a3a, 0, 0.9, 0, 0.06, 0.06, 2.0)); seal.add(mesh(GEO.box, 0x8a6a3a, 0, -0.9, 0, 0.06, 0.06, 2.0));
      seal.add(mesh(GEO.box, 0xf4ecd8, 0.08, -0.1, 0.55, 0.04, 0.9, 0.6));
      seal.position.set(lx + 3.6, y + 1.7, lz); g.add(seal); OUT.seal = seal;
      a.group.add(g); fadeReg(a, g);
      cylCol(a, lx, lz, 3.5, y - 2, y + 30, { noStand: true });
      a.interacts.push({ x: lx + 4.3, z: lz, r: 1.8, label: 'Read the notice', fn: () => Story.seal(), cond: () => !F('lighthouseOpen') });
      a.doors.push({ box: [lx + 3.6, lz - 0.9, lx + 4.4, lz + 0.9], to: 'lh0', at: [0, 5.2, Math.PI], cond: () => F('lighthouseOpen') });
    }
    // the keeper's cottage
    {
      const r = house(a, P.cottage[0], P.cottage[1], Math.PI, { w: 6, d: 5, h: 3, wall: 0xe8e2d4, roof: 0x3f6a8a, door: 0x3a6aa8, shutter: 0x3a6aa8 });
      a.doors.push({ box: doorBox(r.door[0], r.door[1] + 0.3, 1.4), to: 'cottage', at: [0, 1.6, Math.PI] });
      const y = r.y;
      // washing line, bench, flower beds, a little shed
      deco.p('cyl', 0x6e4a2e, -69, y + 1.1, 22, 0.12, 2.2, 0.12); deco.p('cyl', 0x6e4a2e, -69, y + 1.1, 27, 0.12, 2.2, 0.12);
      deco.p('box', 0xdddddd, -69, y + 2.1, 24.5, 0.03, 0.03, 5);
      for (const [zz, c] of [[23, 0xf2c230], [24.4, 0xd2453a], [25.8, 0x3b4a6b]]) deco.p('box', c, -69, y + 1.7, zz, 0.05, 0.7, 0.8);
      deco.p('box', 0x8a6a48, -79, y + 0.45, 16, 2, 0.12, 0.6); deco.p('box', 0x6e4a2e, -79.8, y + 0.22, 16, 0.12, 0.45, 0.5); deco.p('box', 0x6e4a2e, -78.2, y + 0.22, 16, 0.12, 0.45, 0.5);
      PROPS.flowers(deco, -76, y, 16.6); PROPS.flowers(deco, -72, y, 16.6); PROPS.flowers(deco, -71, y, 23);
      PROPS.fence(deco, -66, 30, -82, 30, yAt);
      a.interacts.push({ x: -79, z: 16.6, r: 1.6, label: "Grandma's bench", fn: () => Story.bench() });
      PROPS.sign(deco, -66, H(-66, 12), 11, -0.4);
      a.interacts.push({ x: -66, z: 11.4, r: 1.6, label: 'Read the signpost', fn: () => Dialog.say(['Signpost: ← Lighthouse Point.   → Pottle Harbour, 2 bends and a puddle.']) });
    }
    // ===== Pottle Harbour =====
    const vy = 2.4;
    {
      const t = house(a, P.tavern[0], P.tavern[1], Math.PI, { w: 9, d: 6, h: 3.6, wall: 0xf0dcb8, roof: 0x8a4a2e, door: 0x5a3220, doorX: 0 });
      a.doors.push({ box: doorBox(t.door[0], t.door[1] + 0.3, 1.4), to: 'tavern', at: [0, 3.4, Math.PI] });
      // tavern sign
      deco.p('box', 0x5a3a22, 45, vy + 3.2, 20.6, 0.1, 0.1, 1.6); deco.p('box', 0xe8c87a, 45, vy + 2.6, 21.3, 1.3, 0.9, 0.08);
      deco.p('sph', 0xf4f4f0, 45, vy + 2.65, 21.36, 0.4, 0.3, 0.05);
      const houses = [
        [24, -4, 0, { w: 6, d: 5, wall: 0xf4e2c4, roof: 0x5a8a4a, shutter: 0xc85a3a }, 'The Trimbles. "Gone to Gran\'s until the storm passes."'],
        [30, 24, Math.PI, { w: 6, d: 5, wall: 0xe6d0e8, roof: 0x6a4a8a, shutter: 0x4a8a8a }, "Pip's house. Someone has drawn a lighthouse on the door in chalk."],
        [54, 24, Math.PI, { w: 7, d: 5, wall: 0xd8e8f0, roof: 0xc0573e, shutter: 0x3a6aa8 }, "The Mayor's house. A brass plate says BUNTING. Locked."],
        [44, -12, 0, { w: 6, d: 5, wall: 0xf2e8c8, roof: 0x3f6a8a, shutter: 0xd2a03a }, "Noddy's store room. Full of umbrellas, by the look of it."],
      ];
      for (const [x, z, ry, o, msg] of houses) { const r = house(a, x, z, ry, o); a.interacts.push({ x: r.door[0], z: r.door[1], r: 1.6, label: 'Knock', fn: () => Dialog.say([msg]) }); }
      // the square and fountain
      const [sx, sz] = P.square;
      deco.p('cyl12', 0xb8b0a0, sx, vy + 0.35, sz, 4, 0.7, 4); deco.p('cyl12', 0x5a9ac0, sx, vy + 0.62, sz, 3.4, 0.1, 3.4);
      deco.p('cyl', 0xb8b0a0, sx, vy + 1.4, sz, 0.6, 1.6, 0.6);
      deco.p('sph', 0xf4f4f0, sx, vy + 2.5, sz, 0.8, 0.6, 1.1); deco.p('cone', 0xe8a83a, sx, vy + 2.55, sz + 0.65, 0.2, 0.4, 0.2, 0, Math.PI / 2);
      cylCol(a, sx, sz, 2.0, vy - 1, vy + 0.7);
      a.interacts.push({ x: sx, z: sz + 2.4, r: 1.6, label: 'Read the plaque', fn: () => Dialog.say(['Plaque: "To the Gull of Pottle, who stole the first mayor\'s sandwich and thereby founded this town."']) });
      for (const [x, z] of [[40, 2], [56, 2], [40, 14], [56, 14], [34, 8], [66, 2], [30, -2]]) { const ly = H(x, z); PROPS.lamp(deco, x, ly, z); cylCol(a, x, z, 0.25, ly, ly + 3.5); }
      PROPS.stall(deco, P.shop[0], vy, P.shop[1], 0, 0x3a7ad0);
      boxCol(a, P.shop[0], P.shop[1], 1.6, 0.8, vy - 1, vy + 1.1);
      deco.p('box', 0xe8d8b0, P.shop[0], vy + 3.0, P.shop[1] + 0.6, 2.4, 0.5, 0.08);
      // benches and flower tubs
      for (const [x, z, ry] of [[44, 13, 0], [52, 13, 0], [44, 3, 0], [52, 3, 0]]) { deco.p('box', 0x8a6a48, x, vy + 0.45, z, 1.8, 0.1, 0.5, ry); deco.p('box', 0x6e4a2e, x, vy + 0.22, z, 1.6, 0.44, 0.1, ry); }
      for (const [x, z] of [[38, 4], [58, 12], [36, 18], [60, 20]]) { deco.p('cyl', 0x8a5a3a, x, vy + 0.3, z, 1.0, 0.6, 1.0); PROPS.flowers(deco, x, vy + 0.4, z); }
      // the Weather Office: main hall + records annex behind it
      {
        const b = new Batch(), y = vy;
        b.p('box', 0x8a8478, 58, y + 0.15, -8, 8.4, 0.3, 8.4);
        b.p('box', 0xa8604a, 58, y + 2.1, -8, 8, 4.2, 8);
        b.p('prism', 0x4a5568, 58, y + 4.2, -8, 8.8, 2.6, 8.8);
        for (const zz of [-11.2, -4.8]) b.p('box', 0x7a3a2a, 58, y + 2.1, zz, 8.1, 4.2, 0.25);
        b.p('box', 0x5a3220, 53.97, y + 1.1, -8, 0.1, 2.2, 1.3);                     // front door (west)
        b.p('box', 0xe8d8b0, 53.9, y + 3.2, -8, 0.1, 0.7, 4.0);                      // sign board
        b.p('box', 0x2a2a2a, 53.85, y + 3.2, -8, 0.05, 0.25, 3.4);
        for (const zz of [-10.5, -5.5]) b.p('box', 0x3f6d8e, 53.97, y + 2.0, zz, 0.1, 1.0, 0.9);
        // annex (the records room) with a flat roof and a skylight
        b.p('box', 0x9a5a44, 64.5, y + 1.5, -8.5, 5, 3.0, 7);
        b.p('box', 0x6e6a62, 64.5, y + 3.05, -8.5, 5.2, 0.15, 7.2);
        b.p('box', 0x9fd8f0, 64.5, y + 3.2, -8.5, 1.4, 0.2, 1.4); b.p('box', 0x4a4a44, 64.5, y + 3.25, -8.5, 1.6, 0.1, 0.12); b.p('box', 0x4a4a44, 64.5, y + 3.25, -8.5, 0.12, 0.1, 1.6);
        b.p('box', 0x4a3424, 67.0, y + 1.0, -7, 0.1, 2.0, 1.2);                      // back door (east)
        b.p('box', 0x2a2a2a, 67.07, y + 1.0, -7, 0.06, 0.12, 1.25);                  // its bolt bar
        const g = new THREE.Group(); g.add(b.build()); a.group.add(g); fadeReg(a, g);
        boxCol(a, 58, -8, 4.1, 4.1, y - 2, y + 7, 0, { noStand: true });
        boxCol(a, 64.5, -8.5, 2.5, 3.5, y - 2, y + 3.0);
        // barrel stack by the annex (two barrels high)
        for (const [bx, bz] of [[67.6, -11.6], [68.4, -11.6], [67.6, -10.8], [68.4, -10.8]]) PROPS.barrel(deco, bx, y, bz, 0.95);
        for (const [bx, bz] of [[67.6, -11.2], [68.4, -11.2]]) PROPS.barrel(deco, bx, y + 1.0, bz, 0.95);
        boxCol(a, 68.0, -11.2, 0.85, 0.85, y - 1, y + 2.0);
        a.doors.push({ box: [53.0, -8.8, 54.0, -7.2], to: 'office', at: [-3.4, 0, Math.PI / 2] });
        a.doors.push({ box: [67.0, -7.8, 67.8, -6.2], to: 'records', at: [2.0, 0.2, -Math.PI / 2], locked: () => (F('backUnbolted') ? null : 'The back door is bolted from the inside.') });
        a.interacts.push({ x: 64.5, z: -8.5, y: y + 3.0, r: 1.5, label: 'Drop through the skylight', fn: () => Story.skylight() });
      }
      // the docks
      {
        const y = 1.6;
        boxCol(a, 79, 4, 9, 1.5, -6, y);
        for (let x = 70.5; x <= 88; x += 1) deco.p('box', x % 2 ? 0x9a7a52 : 0x8a6a48, x, y - 0.1, 4, 0.95, 0.2, 3.0);
        for (let x = 71; x <= 88; x += 3.4) for (const zz of [2.6, 5.4]) deco.p('cyl', 0x5e4a36, x, y - 2.5, zz, 0.3, 5.2, 0.3);
        PROPS.boat(deco, 82, -0.1, 7.6, 0.08, 0xc85040); PROPS.boat(deco, 76, -0.1, 0.0, -0.1, 0x3a7ad0); PROPS.boat(deco, 88, -0.1, 0.5, 0.2, 0xf2c230);
        for (const [x, z] of [[72, 2.8], [72.8, 2.8]]) PROPS.barrel(deco, x, y, z, 0.9);
        deco.p('cyl', 0x3a3a3a, 87.5, y + 0.4, 2.8, 0.4, 0.8, 0.4); deco.p('cyl', 0x3a3a3a, 87.5, y + 0.4, 5.2, 0.4, 0.8, 0.4);
      }
    }
    // ===== Thunder Hill and the windmill =====
    {
      const [wx, wz] = P.windmill, y = H(wx, wz);
      const b = new Batch();
      b.p('cyl12', 0xe8e0d0, wx, y + 3.5, wz, 6.2, 7, 6.2);
      b.add(new THREE.CylinderGeometry(2.6, 3.2, 7, 12), 0xeee6d6, M4(wx, y + 3.5, wz));
      b.p('cone', 0x5a6a9a, wx, y + 8.0, wz, 6.6, 2.4, 6.6);
      b.p('box', 0x4a5a8a, wx, y + 1.1, wz + 3.05, 1.2, 2.2, 0.2);
      for (const [dx, dy] of [[-1.5, 4.5], [1.5, 4.5], [0, 6]]) b.p('box', 0x3f6d8e, wx + dx, y + dy, wz + 2.85, 0.6, 0.7, 0.1);
      b.p('box', 0xd6b25a, wx, y + 9.6, wz, 0.08, 1.4, 0.08); b.p('box', 0xd6b25a, wx + 0.4, y + 10.1, wz, 0.8, 0.3, 0.05);
      const g = new THREE.Group(); g.add(b.build()); a.group.add(g); fadeReg(a, g);
      const sails = new THREE.Group(); sails.position.set(wx, y + 6.2, wz + 3.4);
      for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(mesh(GEO.box, 0x7a5a38, 0, 2.6, 0, 0.2, 5.4, 0.15)); arm.add(mesh(GEO.box, 0xf4ecd8, 0.55, 3.0, 0.05, 0.9, 4.0, 0.06)); sails.add(arm); }
      sails.add(mesh(GEO.sph, 0x5a3a22, 0, 0, 0, 0.6, 0.6, 0.6));
      a.group.add(sails); OUT.sails = sails;
      cylCol(a, wx, wz, 3.3, y - 2, y + 12, { noStand: true });
      a.doors.push({ box: doorBox(wx, wz + 3.6, 1.5), to: 'windmill', at: [0, 3.6, Math.PI] });
      PROPS.sign(deco, 4, H(4, -16), -16, 0.3);
      a.interacts.push({ x: 4, z: -15.5, r: 1.6, label: 'Read the signpost', fn: () => Dialog.say(['Signpost: ↑ Thunder Hill (Auntie Cumula: knock loudly, she is usually on the roof).  ↖ Old Quarry: KEEP OUT, by order of the Baron.']) });
      PROPS.sign(deco, 13, H(13, 24), 24, 0);
      a.interacts.push({ x: 13, z: 24.5, r: 1.6, label: 'Read the signpost', fn: () => Dialog.say(["Signpost: ↓ Smuggler's Cove. Fresh fish (when Gubbins is in a good mood)."]) });
    }
    // ===== the quarry =====
    {
      const [qx, qz] = P.quarry;
      for (let i = 0; i < 18; i++) { const an = i / 18 * TAU + 0.3, rr = rnd(12.5, 14); const x = qx + Math.cos(an) * rr, z = qz + Math.sin(an) * rr; if (Math.abs(angDiff(an, Math.atan2(1, 0.55))) < 0.45) continue; PROPS.rock(nat, x, H(x, z) - 0.5, z, rnd(1.4, 2.4), rnd(0, 6), 0x8a8072); }
      // mine cart on rails
      for (let i = 0; i < 6; i++) deco.p('box', 0x5e4a36, qx - 4 + i * 1.2, 2.45, qz + 4, 0.2, 0.08, 1.4);
      deco.p('box', 0x4a4a50, qx - 2, 3.0, qz + 4, 1.8, 0.9, 1.2); deco.p('box', 0x7a6a58, qx - 2, 3.5, qz + 4, 1.5, 0.3, 0.9);
      boxCol(a, qx - 2, qz + 4, 0.95, 0.65, 2.4, 3.5);
      deco.p('box', 0x8a6a48, qx + 6, 3.4, qz - 5, 2.8, 2.0, 0.15); deco.p('box', 0xe8d8b0, qx + 6, 3.6, qz - 4.9, 2.2, 1.2, 0.08);
      a.interacts.push({ x: qx + 6, z: qz - 4, r: 1.6, label: 'Read the notice', fn: () => Dialog.say(['Notice: "PROPERTY OF BARON HALCYON PLUME. Anything shiny that falls from the sky is mine. — H.P."']) });
      PROPS.sign(deco, -38, H(-38, -14), -14, 0.5);
      a.interacts.push({ x: -38, z: -13.5, r: 1.6, label: 'Read the signpost', fn: () => Dialog.say(['Signpost: "OLD QUARRY. Closed for business. Also closed for fun."']) });
    }
    // ===== the cove =====
    {
      const hut = house(a, 26, 44, -Math.PI / 2, { w: 4, d: 4, h: 2.6, wall: 0xc8b090, roof: 0x6a7a5a, chimney: false, shutter: 0x4a6a5a });
      a.interacts.push({ x: hut.door[0], z: hut.door[1], r: 1.6, label: 'Knock', fn: () => Dialog.say(["Gubbins' hut. It smells strongly of fish and faintly of more fish."]) });
      const [gx, gz] = P.gullPole, gy = H(gx, gz);
      deco.p('cyl', 0x6e5a42, gx, gy + 3.3, gz, 0.4, 6.6, 0.4);
      deco.p('box', 0x6e5a42, gx, gy + 6.0, gz, 1.6, 0.12, 0.12);
      cylCol(a, gx, gz, 0.35, gy - 1, gy + 6.6, { noStand: true });
      PROPS.boat(deco, -2, H(-2, 47) + 0.2, 47, 1.2, 0x4a8a6a);
      boxCol(a, -2, 47, 1.2, 2.2, H(-2, 47) - 1, H(-2, 47) + 0.9, 1.2);
      // nets and a drying rack
      deco.p('cyl', 0x6e4a2e, 18, H(18, 46) + 1, 46, 0.12, 2, 0.12); deco.p('cyl', 0x6e4a2e, 21, H(21, 46) + 1, 46, 0.12, 2, 0.12);
      deco.p('box', 0x8a9a7a, 19.5, H(19.5, 46) + 1.4, 46, 3, 1.2, 0.05);
    }
    // ===== the sea stack (a Sporty jumping course) =====
    {
      let [x, z] = P.stackBeach; const dx = -0.672, dz = 0.74;
      while (H(x, z) > -0.45) { x += dx * 0.5; z += dz * 0.5; }
      const tops = [0.4, 1.1, 1.8, 2.5, 3.2];
      OUT.pillars = [];
      for (let i = 0; i < tops.length; i++) {
        const px = x + dx * (0.8 + i * 2.7) + (i % 2 ? 0.6 : -0.6) * dz, pz = z + dz * (0.8 + i * 2.7) - (i % 2 ? 0.6 : -0.6) * dx;
        nat.add(new THREE.CylinderGeometry(0.85, 1.15, tops[i] + 6, 7), 0x7e7a72, M4(px, (tops[i] - 6) / 2, pz, i));
        nat.p('cyl', 0x5a9a4a, px, tops[i] + 0.02, pz, 1.6, 0.06, 1.6);
        cylCol(a, px, pz, 0.85, -8, tops[i]);
        OUT.pillars.push([px, pz, tops[i]]);
      }
      const sx = x + dx * (0.8 + tops.length * 2.7 + 1.6), sz = z + dz * (0.8 + tops.length * 2.7 + 1.6), top = 4.1;
      nat.add(new THREE.CylinderGeometry(2.4, 3.4, top + 8, 8), 0x8a847a, M4(sx, (top - 8) / 2, sz));
      nat.p('cyl', 0x5aa04a, sx, top + 0.05, sz, 4.6, 0.12, 4.6);
      PROPS.bush(nat, sx + 1.2, top, sz - 0.8, 0.6);
      cylCol(a, sx, sz, 2.4, -9, top);
      OUT.stackTop = [sx, sz, top];
    }
    // ===== nature =====
    srand(424242);
    const keepOut = [[...P.cottage, 9], [...P.lighthouse, 9], [48, 8, 26], [62, -8, 14], [...P.windmill, 8], [...P.quarry, 16], [26, 44, 5], [...P.gullPole, 4], [...P.pond, 10], [-60, 8, 6], [10, 52, 8]];
    const okSpot = (x, z, pad = 0) => {
      const h = H(x, z); if (h < 0.6) return false;
      if (ISLE.roadDist(x, z) < 3.2 + pad) return false;
      for (const [kx, kz, r] of keepOut) if (Math.hypot(x - kx, z - kz) < r) return false;
      const sl = Math.abs(H(x + 1, z) - H(x - 1, z)) + Math.abs(H(x, z + 1) - H(x, z - 1));
      return sl < 1.6;
    };
    let trees = 0;
    for (let k = 0; k < 1400 && trees < 190; k++) {
      const x = srnd(-95, 85), z = srnd(-90, 70);
      if (!okSpot(x, z)) continue;
      const h = H(x, z), s = landish(x, z);
      const onHill = Math.hypot(x - P.hill[0], z - P.hill[1]) < 26;
      const beachy = s < 0.12;
      const sc = srnd(0.8, 1.3);
      if (beachy) PROPS.palm(nat, x, h, z, sc, srnd(0, 6));
      else if (onHill || srnd() < 0.3) PROPS.pine(nat, x, h, z, sc);
      else PROPS.tree(nat, x, h, z, sc, (srnd() * 4) | 0);
      cylCol(a, x, z, 0.45 * sc, h - 1, h + 3, { seeThrough: false });
      trees++;
    }
    function landish(x, z) { return ISLE.landness(x, z); }
    for (let k = 0; k < 400; k++) {
      const x = srnd(-100, 90), z = srnd(-95, 75);
      if (!okSpot(x, z, -1)) continue;
      const h = H(x, z), r = srnd();
      if (r < 0.35) { const s = srnd(0.5, 1.4); PROPS.rock(nat, x, h - 0.2, z, s, srnd(0, 6)); if (s > 0.9) cylCol(a, x, z, s * 0.7, h - 1, h + s * 0.7); }
      else if (r < 0.7) PROPS.bush(nat, x, h, z, srnd(0.6, 1.2));
      else PROPS.flowers(nat, x, h, z);
    }
    // the pond: reeds and lily pads
    for (let i = 0; i < 14; i++) { const an = i / 14 * TAU, x = P.pond[0] + Math.cos(an) * 6.5, z = P.pond[1] + Math.sin(an) * 5; nat.p('cyl', 0x6a8a3a, x, H(x, z) + 0.5, z, 0.08, 1.2, 0.08); nat.p('box', 0x8a5a3a, x, H(x, z) + 1.15, z, 0.12, 0.3, 0.12); }
    for (let i = 0; i < 6; i++) nat.p('cyl', 0x4a9a4a, P.pond[0] + rnd(-3, 3), -0.62, P.pond[1] + rnd(-2, 2), 0.9, 0.04, 0.9);
    // fences along the headland cliffs
    PROPS.fence(deco, -92, -6, -78, -8, yAt);
    // headland shed + crates
    deco.p('box', 0x8a6a48, -64, H(-64, 25) + 1.1, 25, 3, 2.2, 2.5); deco.p('prism', 0x5a4a3a, -64, H(-64, 25) + 2.2, 25, 3.2, 0.9, 2.8, Math.PI / 2);
    boxCol(a, -64, 25, 1.5, 1.25, H(-64, 25) - 1, H(-64, 25) + 2.5, 0, { noStand: true });
    const nm = nat.build(); a.group.add(nm);
    const dm = deco.build(); a.group.add(dm);
    // regions for banners and music
    OUT.regions = [
      { id: 'point', name: 'Lighthouse Point', x: -80, z: 12, r: 18 },
      { id: 'harbour', name: 'Pottle Harbour', x: 52, z: 6, r: 24 },
      { id: 'hill', name: 'Thunder Hill', x: 10, z: -58, r: 20 },
      { id: 'quarry', name: 'The Old Quarry', x: -50, z: -42, r: 17 },
      { id: 'cove', name: "Smuggler's Cove", x: 8, z: 52, r: 16 },
      { id: 'stack', name: 'The Needle', x: -56, z: 62, r: 12 },
    ];
  }
  OUT.regionAt = function (x, z) { for (const r of OUT.regions) if (Math.hypot(x - r.x, z - r.z) < r.r) return r; return null; };

  defArea('isle', {
    kind: 'outdoor', sky: 'outdoor', title: 'Brindle Isle', spawn: [-74, 16, Math.PI], killY: -30,
    ground: (x, z) => ISLE.H(x, z),
    build,
    populate: (a) => Story.populateIsle(a),
    onEnter: () => { OUT.setWeather(); OUT.region = null; },
  });
})();
