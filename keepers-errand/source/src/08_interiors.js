// ---- interiors: rooms seen from fixed cameras that cut as you move. Walls near the camera are cut away. ----
const INT = {};
(function () {
  const WALL_H = 3.4;
  // floor + four walls with door gaps. doors: [{ side: 'n'|'s'|'e'|'w', at, w }]
  function rectRoom(a, x0, z0, x1, z1, o = {}) {
    const b = new Batch();
    const fl = o.floor || 0x9a7a58, wc = o.wall || 0xe8dcc4, trim = o.trim || 0x6e4a2e;
    b.p('box', fl, (x0 + x1) / 2, -0.5, (z0 + z1) / 2, x1 - x0 + 0.6, 1, z1 - z0 + 0.6);
    // floorboards
    if (o.boards !== false) for (let x = x0 + 0.5; x < x1; x += 1) b.p('box', 0x5a3e28, x, 0.005, (z0 + z1) / 2, 0.025, 0.01, z1 - z0);
    a.group.add(b.build());
    boxCol(a, (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2 + 1.6, (z1 - z0) / 2 + 1.6, -1, 0);   // reaches past the doorways
    const doors = o.doors || [];
    const sides = { n: [x0, z0, x1, z0], s: [x0, z1, x1, z1], w: [x0, z0, x0, z1], e: [x1, z0, x1, z1] };
    for (const sd in sides) {
      const [ax, az, bx, bz] = sides[sd];
      const horiz = az === bz, len = horiz ? bx - ax : bz - az;
      // segments between door gaps
      const gaps = doors.filter((d) => d.side === sd).map((d) => [d.at - (d.w || 1.6) / 2, d.at + (d.w || 1.6) / 2]).sort((p, q) => p[0] - q[0]);
      let cur = horiz ? ax : az;
      const segs = [];
      for (const [g0, g1] of gaps) { if (g0 > cur) segs.push([cur, g0]); cur = g1; }
      if (cur < (horiz ? bx : bz)) segs.push([cur, horiz ? bx : bz]);
      for (const [s0, s1] of segs) {
        const mid = (s0 + s1) / 2, L = s1 - s0;
        const wx = horiz ? mid : ax, wz = horiz ? az : mid;
        const g = new Batch();
        g.p('box', wc, wx, WALL_H / 2, wz, horiz ? L : 0.3, WALL_H, horiz ? 0.3 : L);
        g.p('box', trim, wx, 0.2, wz, horiz ? L : 0.34, 0.4, horiz ? 0.34 : L);
        g.p('box', trim, wx, WALL_H - 0.1, wz, horiz ? L : 0.36, 0.2, horiz ? 0.36 : L);
        const m = g.build(); a.group.add(m);
        (a.cut = a.cut || []).push({ m, x: wx, z: wz });
        boxCol(a, wx, wz, horiz ? L / 2 : 0.15, horiz ? 0.15 : L / 2, -1, WALL_H + 3, 0, { noStand: true });
      }
      void len;
      for (const d of doors.filter((q) => q.side === sd)) {
        const g = new Batch(), w = d.w || 1.6;
        const dx = horiz ? d.at : ax, dz = horiz ? az : d.at;
        g.p('box', trim, dx, WALL_H - 0.6, dz, horiz ? w : 0.3, 1.2, horiz ? 0.3 : w);
        g.p('box', d.color || 0x3a2a1e, dx, 1.1, dz + (horiz ? (sd === 's' ? 0.2 : -0.2) : 0) * 1, horiz ? w - 0.2 : 0.1, 2.2, horiz ? 0.1 : w - 0.2);
        const m = g.build(); a.group.add(m); (a.cut = a.cut || []).push({ m, x: dx, z: dz });
      }
    }
  }
  // a round room (the lighthouse floors, the windmill). doorAngles in radians (0 = +z, south)
  function roundRoom(a, r, o = {}) {
    const b = new Batch();
    if (o.floor !== false) { b.add(new THREE.CylinderGeometry(r + 0.4, r + 0.4, 1, 24), o.floorColor || 0x8a8478, M4(0, -0.5, 0)); addCol(a, { t: 'cyl', x: 0, z: 0, r: r + 1.6, y0: -1, y1: 0 }); }
    a.group.add(b.build());
    addCol(a, { t: 'ring', x: 0, z: 0, r });
    const n = o.segs || 18, wc = o.wall || 0xd8d0c0, h = o.h || 4.2;
    for (let i = 0; i < n; i++) {
      const an = (i + 0.5) / n * TAU;
      if ((o.doors || []).some((d) => Math.abs(angDiff(an, d)) < Math.PI / n * 1.05)) continue;
      const x = Math.sin(an) * (r + 0.2), z = Math.cos(an) * (r + 0.2), L = 2 * Math.PI * (r + 0.2) / n + 0.05;
      const g = new Batch();
      g.p('box', wc, x, h / 2 + (o.wallY || 0), z, L, h, 0.4, an);
      g.p('box', o.trim || 0x6a645a, x, 0.25 + (o.wallY || 0), z, L, 0.5, 0.5, an);
      if (o.window && i % 3 === 1) g.p('box', 0x2a3a5a, x * 0.995, h * 0.6 + (o.wallY || 0), z * 0.995, L * 0.45, 1.2, 0.42, an);
      const m = g.build(); a.group.add(m);
      (a.cut = a.cut || []).push({ m, x, z });
    }
    for (const d of o.doors || []) {
      const g = new Batch(), x = Math.sin(d) * (r + 0.1), z = Math.cos(d) * (r + 0.1);
      g.p('box', 0x3a2a1e, x, 1.1 + (o.wallY || 0), z, 1.5, 2.2, 0.15, d); g.p('box', 0x6a645a, x, 2.4 + (o.wallY || 0), z, 1.9, 0.3, 0.5, d);
      const m = g.build(); a.group.add(m); (a.cut = a.cut || []).push({ m, x, z });
    }
  }
  function light(a, x, y, z, color = 0xffd8a0, i = 1.2, d = 16) { const l = new THREE.PointLight(color, i, d); l.position.set(x, y, z); a.group.add(l); return l; }
  INT.cutaway = function (a) {
    if (!a.cut || CAM.mode !== 'fixed') return;
    const c = R.camera.position, cx = a.center ? a.center[0] : 0, cz = a.center ? a.center[1] : 0;
    const dc = Math.hypot(c.x - cx, c.z - cz);
    for (const s of a.cut) s.m.visible = Math.hypot(c.x - s.x, c.z - s.z) > dc * 0.82;
  };
  const furn = (a, b, kind, x, z, ry = 0, solid = true) => {
    const add = (name, col, ox, oy, oz, sx, sy, sz) => partAt(b, name, col, ox, oy, oz, sx, sy, sz, [x, 0, z, ry]);
    let hx = 0.5, hz = 0.5, h = 1;
    switch (kind) {
      case 'bed': add('box', 0x7a5232, 0, 0.3, 0, 1.4, 0.6, 2.2); add('box', 0xf4ecd8, 0, 0.65, 0.1, 1.3, 0.2, 1.9); add('box', 0x3a6aa8, 0, 0.7, 0.35, 1.32, 0.18, 1.4); add('box', 0xffffff, 0, 0.78, -0.75, 0.9, 0.16, 0.4); add('box', 0x7a5232, 0, 0.8, -1.05, 1.4, 1.0, 0.12); hx = 0.7; hz = 1.1; h = 0.8; break;
      case 'table': add('box', 0x8a5a32, 0, 0.75, 0, 1.6, 0.1, 1.0); for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) add('box', 0x6e4a2e, sx, 0.37, sz, 0.1, 0.74, 0.1); hx = 0.8; hz = 0.5; h = 0.8; break;
      case 'chair': add('box', 0x8a5a32, 0, 0.45, 0, 0.5, 0.08, 0.5); add('box', 0x8a5a32, 0, 0.75, -0.22, 0.5, 0.6, 0.06); for (const sx of [-0.2, 0.2]) for (const sz of [-0.2, 0.2]) add('box', 0x6e4a2e, sx, 0.22, sz, 0.06, 0.45, 0.06); hx = 0.25; hz = 0.25; h = 0.5; break;
      case 'stove': add('box', 0x2e2e34, 0, 0.5, 0, 1.0, 1.0, 0.8); add('box', 0xff8a3a, 0, 0.45, 0.41, 0.4, 0.3, 0.02); add('cyl', 0x2e2e34, 0.3, 2.2, -0.2, 0.25, 2.6, 0.25); hx = 0.5; hz = 0.4; h = 1; break;
      case 'shelf': add('box', 0x7a5232, 0, 1.0, 0, 1.8, 2.0, 0.4); for (let i = 0; i < 4; i++) add('box', 0x6e4a2e, 0, 0.25 + i * 0.55, 0.02, 1.7, 0.05, 0.42); for (let i = 0; i < 6; i++) add('box', pick([0x4a6aa8, 0xa84a4a, 0x4a8a4a, 0xd6b25a, 0xe8e0d0]), -0.6 + i * 0.24, 0.45 + (i % 3) * 0.55, 0.05, 0.16, 0.36, 0.3); hx = 0.9; hz = 0.22; h = 2; break;
      case 'chest': add('box', 0x8a5a32, 0, 0.3, 0, 1.0, 0.6, 0.6); add('box', 0xd6b25a, 0, 0.3, 0.31, 0.2, 0.2, 0.02); add('box', 0x6e4a2e, 0, 0.62, 0, 1.04, 0.08, 0.64); hx = 0.5; hz = 0.3; h = 0.6; break;
      case 'barrel': PROPS.barrel(b, x, 0, z); hx = 0.42; hz = 0.42; h = 1; break;
      case 'counter': add('box', 0x7a4a2a, 0, 0.55, 0, 1, 1.1, 1); add('box', 0x9a6a3a, 0, 1.12, 0, 1.1, 0.06, 1.1); hx = 0.5; hz = 0.5; h = 1.15; break;
      case 'cabinet': add('box', 0x6a6a62, 0, 0.8, 0, 0.9, 1.6, 0.6); for (let i = 0; i < 3; i++) add('box', 0xd6b25a, 0, 0.35 + i * 0.5, 0.31, 0.2, 0.05, 0.02); hx = 0.45; hz = 0.3; h = 1.6; break;
      case 'crate': PROPS.crate(b, x, 0, z, 1, ry); hx = 0.5; hz = 0.5; h = 1; break;
      case 'crate2': PROPS.crate(b, x, 0, z, 1, ry); PROPS.crate(b, x, 1, z, 1, ry + 0.2); hx = 0.5; hz = 0.5; h = 2; break;
      case 'rug': add('box', 0xa84a3a, 0, 0.01, 0, 2.2, 0.02, 1.5); add('box', 0xd6b25a, 0, 0.015, 0, 1.8, 0.02, 1.1); solid = false; break;
    }
    if (solid) boxCol(a, x, z, Math.abs(Math.cos(ry)) > 0.5 ? hx : hz, Math.abs(Math.cos(ry)) > 0.5 ? hz : hx, -1, h);
  };
  INT.furn = furn;

  // ===================== the keeper's cottage =====================
  defArea('cottage', {
    kind: 'indoor', sky: 'indoor', title: "The Keeper's Cottage", spawn: [0, 1.6, Math.PI], killY: -6, windows: true,
    cams: [{ box: [-9, -9, 9, 9], pos: [1.5, 6.8, 7.6], fov: 48 }],
    build(a) {
      rectRoom(a, -4, -3, 4, 3, { doors: [{ side: 's', at: 0, w: 1.4, color: 0x3a6aa8 }], wall: 0xe6e0d0 });
      const b = new Batch();
      furn(a, b, 'bed', -3, -1.6); furn(a, b, 'chest', -1.4, -2.3); furn(a, b, 'table', 1.8, -0.4); furn(a, b, 'chair', 1.2, 0.4, Math.PI); furn(a, b, 'chair', 2.4, 0.4, Math.PI);
      furn(a, b, 'stove', 3.2, -2.3); furn(a, b, 'shelf', 0.6, -2.7); furn(a, b, 'rug', -0.6, 0.6);
      // window with storm outside, portrait, barometer, a model ship
      b.p('box', 0x2a3a5a, -2.2, 2.0, -2.84, 1.2, 1.0, 0.04); b.p('box', 0xf4ecd8, -2.2, 2.0, -2.82, 1.3, 0.08, 0.06); b.p('box', 0xf4ecd8, -2.2, 2.0, -2.82, 0.08, 1.1, 0.06);
      b.p('box', 0x7a5232, -3.84, 2.0, 0.8, 0.06, 1.0, 0.8); b.p('box', 0xe0c8a0, -3.82, 2.0, 0.8, 0.04, 0.8, 0.6); b.p('sph', 0xf0f0f0, -3.8, 2.15, 0.8, 0.05, 0.35, 0.35);
      b.p('cyl12', 0xd6b25a, 3.84, 2.0, 0.6, 0.6, 0.06, 0.6, 0, 0, Math.PI / 2); b.p('cyl12', 0xf4ecd8, 3.8, 2.0, 0.6, 0.48, 0.06, 0.48, 0, 0, Math.PI / 2);
      b.p('box', 0x8a5a32, 1.8, 0.95, -0.5, 0.8, 0.25, 0.25); b.p('box', 0xf4ecd8, 1.8, 1.25, -0.5, 0.05, 0.5, 0.4);
      b.p('cyl', 0xd6b25a, -0.6, 0.85, -2.6, 0.2, 0.5, 0.2); b.p('sph', MAT.glow ? 0xffe8a0 : 0xffe8a0, -0.6, 1.2, -2.6, 0.22, 0.25, 0.22);
      a.group.add(b.build());
      light(a, 1, 2.6, 0, 0xffd8a0, 1.3, 14); light(a, 3.2, 0.8, -1.6, 0xff8a3a, 0.8, 5);
      a.interacts.push({ x: -1.4, z: -1.6, r: 1.5, label: "Open Grandma's sea chest", fn: () => Story.chest() });
      a.interacts.push({ x: -3.2, z: 0.8, r: 1.5, label: 'Look at the portrait', fn: () => Dialog.say(['Wick: Grandma Tess, Keeper of the Brindle light for fifty-one years. She never once let it go dark.', "Wick: ...I'm going to fix this, Grandma."]) });
      a.interacts.push({ x: 3.2, z: 0.6, r: 1.5, label: 'Tap the barometer', fn: () => Dialog.say(['The needle points to STORMY. It has been pointing there for nine days and has started to look bored.']) });
      a.interacts.push({ x: 1.8, z: -0.2, r: 1.4, label: 'Read the logbook', fn: () => Story.logbook() });
      a.doors.push({ box: [-0.8, 2.4, 0.8, 3.3], to: 'isle', at: [-74, 16.2, Math.PI] });
    },
  });
  // ===================== the Gull & Kettle =====================
  defArea('tavern', {
    kind: 'indoor', sky: 'indoor', title: 'The Gull & Kettle', spawn: [0, 3.4, Math.PI], killY: -6, windows: true,
    cams: [{ box: [-9, -9, 0, 9], pos: [-5.5, 6.4, 8.2], fov: 50 }, { box: [0, -9, 9, 9], pos: [5.5, 6.4, 8.2], fov: 50 }],
    build(a) {
      rectRoom(a, -6, -4.5, 6, 4.5, { doors: [{ side: 's', at: 0, w: 1.4 }], wall: 0xe8d4b0, floor: 0x7a5a3a });
      const b = new Batch();
      for (let x = -4.5; x <= 1.5; x += 1) furn(a, b, 'counter', x, -2.6);
      for (let x = -5; x <= 2; x += 1.4) furn(a, b, 'barrel', x, -4.0);
      for (const [x, z] of [[-3.5, 1.4], [2.5, 1.6]]) { furn(a, b, 'table', x, z); furn(a, b, 'chair', x - 0.6, z + 0.8, Math.PI); furn(a, b, 'chair', x + 0.6, z - 0.8); }
      // fireplace
      b.p('box', 0x8a8478, 5.6, 1.3, -1.5, 0.8, 2.6, 2.4); b.p('box', 0x2a1a12, 5.25, 0.6, -1.5, 0.1, 1.0, 1.2); b.p('box', 0xff8a3a, 5.2, 0.35, -1.5, 0.1, 0.4, 0.8);
      boxCol(a, 5.6, -1.5, 0.4, 1.2, -1, 2.6);
      // mugs and a ship in a bottle, a big kettle over the bar
      for (let i = 0; i < 6; i++) b.p('cyl', 0xd6c8a8, -4 + i * 1.1, 1.3, -2.6, 0.18, 0.22, 0.18);
      b.p('sph', 0x8a8a92, -1, 3.0, -3.8, 0.9, 0.7, 0.9); b.p('cyl', 0x8a8a92, -0.4, 3.2, -3.8, 0.12, 0.6, 0.12, 0, 0, -0.8);
      a.group.add(b.build());
      light(a, -2, 2.8, 0, 0xffc890, 1.2, 14); light(a, 5, 1, -1.5, 0xff7a2a, 1.4, 9);
      a.doors.push({ box: [-0.8, 3.9, 0.8, 4.8], to: 'isle', at: [42, 19.8, Math.PI] });
    },
    populate: (a) => Story.populateTavern(a),
  });
  // ===================== the Weather Office: front hall =====================
  defArea('office', {
    kind: 'indoor', sky: 'indoor', title: 'The Weather Office', spawn: [-3.4, 0, Math.PI / 2], killY: -6,
    cams: [{ box: [-9, -9, 9, 9], pos: [-1, 6.6, 7.8], fov: 50 }],
    build(a) {
      rectRoom(a, -4.5, -4, 4.5, 4, { doors: [{ side: 'w', at: 0, w: 1.4 }, { side: 'e', at: -2.4, w: 1.3, color: 0x4a4a50 }], wall: 0xd8cfc0, floor: 0x6a6a72, boards: false });
      const b = new Batch();
      for (let z = -3.0; z <= 1.0; z += 1) furn(a, b, 'counter', 1.6, z);
      b.p('box', 0x8a8a92, 1.6, 1.6, -1, 0.06, 1.0, 4.0);                // a brass grille along the counter
      for (let z = -3.0; z <= 1.0; z += 0.5) b.p('box', 0xd6b25a, 1.6, 1.6, z, 0.08, 1.0, 0.04);
      furn(a, b, 'cabinet', 3.9, 1.6, -Math.PI / 2); furn(a, b, 'cabinet', 3.9, 2.6, -Math.PI / 2);
      // queue posts with a rope
      for (const z of [0.8, 2.6]) for (const x of [-2.2, 0]) { b.p('cyl', 0xd6b25a, x, 0.5, z, 0.12, 1.0, 0.12); boxCol(a, x, z, 0.12, 0.12, -1, 1.0); }
      b.p('box', 0xa83a3a, -1.1, 0.85, 0.8, 2.2, 0.06, 0.06); b.p('box', 0xa83a3a, -1.1, 0.85, 2.6, 2.2, 0.06, 0.06);
      // waiting bench, ticket machine, portrait of the Baron
      b.p('box', 0x7a5232, -3.6, 0.45, 2.8, 1.2, 0.1, 1.8); boxCol(a, -3.6, 2.8, 0.6, 0.9, -1, 0.5);
      b.p('box', 0xa83a3a, -0.6, 0.6, -3.5, 0.6, 1.2, 0.5); b.p('box', 0xf4ecd8, -0.6, 1.0, -3.24, 0.3, 0.2, 0.02); boxCol(a, -0.6, -3.5, 0.3, 0.25, -1, 1.2);
      b.p('box', 0xd6b25a, -2.4, 2.2, -3.84, 1.3, 1.6, 0.06); b.p('box', 0x7a5aa8, -2.4, 2.2, -3.8, 1.1, 1.4, 0.04); b.p('sph', 0xf2c9a0, -2.4, 2.4, -3.76, 0.4, 0.45, 0.04); b.p('box', 0x2a2228, -2.4, 2.85, -3.76, 0.5, 0.35, 0.04);
      // the barred gate to the records room
      for (let z = -3.0; z <= -1.8; z += 0.2) b.p('cyl', 0x4a4a50, 4.45, 1.2, z, 0.06, 2.4, 0.06);
      a.group.add(b.build());
      light(a, 0, 2.8, 0, 0xfff0d0, 1.2, 14);
      a.interacts.push({ x: -2.4, z: -3.2, r: 1.5, label: 'Look at the portrait', fn: () => Dialog.say(['A portrait of BARON HALCYON PLUME, Lord of the Upper Airs, Owner of Weather (Registered). He is posing with a cloud on a leash.']) });
      a.interacts.push({ x: -0.6, z: -2.9, r: 1.4, label: 'Take a ticket', fn: () => Story.ticket() });
      a.interacts.push({ x: 3.9, z: -2.4, r: 1.6, label: 'Try the gate', fn: () => Dialog.say(['Ledgerby: STAFF ONLY! That gate leads to the records room, and the records room leads to RECORDS. Away with you.']) });
      a.doors.push({ box: [-4.8, -0.8, -3.9, 0.8], to: 'isle', at: [53.0, -8, -Math.PI / 2] });
    },
    populate: (a) => Story.populateOffice(a),
  });
  // ===================== the records room (stealth) =====================
  defArea('records', {
    kind: 'indoor', sky: 'indoor', title: 'The Records Room', spawn: [0, 3.5, Math.PI], killY: -6,
    cams: [{ box: [-9, 0, 9, 9], pos: [0, 9.5, 9.8], fov: 46 }, { box: [-9, -9, 9, 0], pos: [0, 10.5, 5.2], fov: 50 }],
    build(a) {
      rectRoom(a, -3.6, -5, 3.6, 5, { doors: [{ side: 'e', at: 1, w: 1.3 }, { side: 'w', at: 3.6, w: 1.2, color: 0x4a4a50 }], wall: 0xc8bca8, floor: 0x6a5a4a });
      const b = new Batch();
      // rows of shelving make a little maze
      for (const [x, z, ry] of [[-1.3, 1.6, 0], [1.1, -0.8, 0], [-1.7, -1.7, 0], [2.6, 2.7, Math.PI / 2]]) furn(a, b, 'shelf', x, z, ry);
      // the desk with the PAID stamp
      furn(a, b, 'table', 0, -4.2); b.p('box', 0xf4ecd8, -0.4, 0.82, -4.2, 0.5, 0.04, 0.4);
      b.p('cyl', 0x6b3f26, 0.3, 0.95, -4.2, 0.12, 0.25, 0.12);
      // the skylight above
      b.p('box', 0x9fd8f0, -2.6, 3.4, 4.0, 1.4, 0.05, 1.4);
      for (let z = 3.0; z <= 4.2; z += 0.2) b.p('cyl', 0x4a4a50, -3.55, 1.2, z, 0.06, 2.4, 0.06);
      a.group.add(b.build());
      light(a, 0, 2.8, -2, 0xfff0d0, 0.9, 12); light(a, -2.6, 3.2, 4.0, 0x9fc8ff, 0.6, 8);
      a.interacts.push({ x: 0.3, z: -3.5, r: 1.3, label: 'Take the PAID stamp', fn: () => Story.takeStamp(), cond: () => !hasItem('stamp') });
      a.interacts.push({ x: -3.0, z: 3.6, r: 1.4, label: 'Try the gate', fn: () => Dialog.say(['The gate to the front hall is barred. Through it you can hear Ledgerby humming the Baron\'s anthem.']) });
      a.doors.push({ box: [2.9, 0.2, 3.9, 1.8], to: 'isle', at: [68.4, -7, Math.PI / 2], fn: () => Story.backDoor() });
    },
    populate: (a) => Story.populateRecords(a),
  });
  // ===================== Auntie Cumula's windmill =====================
  defArea('windmill', {
    kind: 'indoor', sky: 'indoor', title: "Auntie Cumula's Windmill", spawn: [0, 3.6, Math.PI], killY: -6, windows: true,
    cams: [{ box: [-9, -9, 9, 9], pos: [2.5, 7.4, 8.8], fov: 50 }],
    build(a) {
      roundRoom(a, 5.5, { doors: [0], wall: 0xe8e0d0, floorColor: 0x9a7a58, window: true });
      const b = new Batch();
      // cauldron, telescope, cloud jars, a bed in an alcove, a spiral stair
      b.p('cyl12', 0x2e2e34, -1.5, 0.5, -1.0, 1.6, 1.0, 1.6); b.p('cyl12', 0x7ad0a0, -1.5, 0.98, -1.0, 1.3, 0.06, 1.3);
      cylCol(a, -1.5, -1.0, 0.85, -1, 1.0);
      b.p('cyl', 0xd6b25a, 2.6, 1.6, -2.8, 0.25, 2.2, 0.25, 0, 0.6); b.p('cyl', 0x6e4a2e, 2.6, 0.5, -2.8, 0.1, 1.0, 0.1);
      for (let i = 0; i < 5; i++) { const an = -1.9 + i * 0.32; const x = Math.sin(an) * 5.0, z = Math.cos(an) * 5.0; b.p('box', 0x7a5232, x, 1.4, z, 1.0, 0.08, 0.5, an); b.p('cyl', 0xbfe4ff, x, 1.75, z, 0.4, 0.6, 0.4); b.p('ico', 0xffffff, x, 1.8, z, 0.3, 0.25, 0.3); }
      furn(a, b, 'bed', 3.6, 0.6, 0.4);
      for (let i = 0; i < 10; i++) { const an = Math.PI * 0.85 + i * 0.22; b.p('box', 0x8a6a48, Math.sin(an) * 4.4, 0.2 + i * 0.35, Math.cos(an) * 4.4, 1.2, 0.12, 0.6, an); }
      a.group.add(b.build());
      light(a, -1.5, 2, -1, 0x7ad0a0, 1.2, 9); light(a, 1, 3.5, 1, 0xfff0d0, 1.0, 14);
      a.interacts.push({ x: 2.6, z: -2.2, r: 1.5, label: 'Look through the telescope', fn: () => Dialog.say(["Through the telescope you can see the lighthouse. Its lamp room flickers a sick purple. High above, something glints between the clouds: a gilded airship."]) });
      a.interacts.push({ x: -1.5, z: 0.2, r: 1.6, label: 'Sniff the cauldron', fn: () => Dialog.say(['It smells of rain on hot stones, peppermint and, oddly, toast.']) });
      a.doors.push({ box: [-0.8, 4.7, 0.8, 5.8], to: 'isle', at: [10, -54.9, 0] });
    },
    populate: (a) => Story.populateWindmill(a),
  });

  // ===================== the lighthouse =====================
  // Floor 0: flooded. Turn the valve (Normal mode) to drain it.
  defArea('lh0', {
    kind: 'indoor', sky: 'lighthouse', title: 'The Lighthouse: Pump Room', spawn: [0, 5.2, Math.PI], killY: -6, music: 'lighthouse',
    cams: [{ box: [-9, 0.5, 9, 9], pos: [3, 7.4, 10.4], fov: 52 }, { box: [-9, -9, 9, 0.5], pos: [-3, 8.4, 6.4], fov: 54 }],
    build(a) {
      roundRoom(a, 7, { doors: [0, Math.PI], wall: 0xd0c8b8, floorColor: 0x7a7468, window: true });
      const b = new Batch();
      // pipes and the drain valve
      b.p('cyl', 0x6a6a72, -6.3, 1.6, 0, 0.5, 3.2, 0.5); b.p('cyl', 0x6a6a72, -6.3, 3.2, -2, 0.4, 4, 0.4, 0, Math.PI / 2);
      for (const z of [-4.5, 4.5]) { b.p('cyl12', 0x5a5a62, z * 0.8, 1.2, -4.4, 1.6, 2.4, 1.6); cylCol(a, z * 0.8, -4.4, 0.85, -1, 2.4); }
      b.p('box', 0x8a8478, 0, 0.4, -6.2, 2.2, 0.8, 1.0); boxCol(a, 0, -6.2, 1.1, 0.5, -1, 0.3);
      a.group.add(b.build());
      const valve = new THREE.Group(); valve.position.set(-5.6, 1.4, 0); valve.rotation.z = Math.PI / 2;
      valve.add(mesh(GEO.torus, 0xc0302a, 0, 0, 0, 1.4, 1.4, 1.4)); for (let i = 0; i < 3; i++) { const s = mesh(GEO.box, 0xc0302a, 0, 0, 0, 0.1, 1.3, 0.1); s.rotation.y = 0; s.rotation.z = i * Math.PI / 3; valve.add(s); }
      valve.rotation.order = 'ZYX';
      a.group.add(valve); a.valve = valve;
      // flood water
      const water = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.1, 24), new THREE.MeshLambertMaterial({ color: 0x3a6a7a, transparent: true, opacity: 0.75 }));
      water.position.y = 0.55; a.group.add(water); a.waterMesh = water;
      light(a, 0, 3.4, 0, 0xc0d8ff, 1.0, 16); light(a, -5, 2, 0, 0xffa060, 0.6, 6);
      a.interacts.push({ x: -5.2, z: 0, r: 1.7, label: 'Turn the drain valve', fn: () => Story.valve(), cond: () => !F('lhDrained') });
      a.doors.push({ box: [-0.8, 6.0, 0.8, 7.2], to: 'isle', at: [-83.0, 6, Math.PI / 2] });
      a.doors.push({ box: [-0.8, -7.2, 0.8, -6.3], to: 'lh1', at: [0, 5.2, Math.PI], locked: () => (F('lhDrained') ? null : "The stair door won't budge: the flood water is pressing it shut."), y: 0.3 });
    },
    populate: (a) => Story.populateLh(a, 0),
  });
  // Floor 1: the storeroom, where two heavy bailiffs are sleeping.
  defArea('lh1', {
    kind: 'indoor', sky: 'lighthouse', title: 'The Lighthouse: Storeroom', spawn: [0, 5.2, Math.PI], killY: -6, music: 'sneak',
    cams: [{ box: [-9, 1, 9, 9], pos: [0, 9.4, 10.6], fov: 50 }, { box: [-9, -9, 9, 1], pos: [0, 10.4, 5.4], fov: 54 }],
    build(a) {
      roundRoom(a, 7, { doors: [0, Math.PI], wall: 0xc8c0b0, floorColor: 0x8a6a4a, window: true });
      const b = new Batch();
      // crates make a winding path past the sleepers
      for (const [x, z, k] of [[-3, 3, 'crate2'], [-2, 3, 'crate'], [3, 2.6, 'crate2'], [-4.5, 0.5, 'crate2'], [0.4, 0.8, 'crate2'], [1.4, 0.8, 'crate'], [4.6, -0.6, 'crate2'], [-1.6, -2.6, 'crate2'], [-0.6, -2.6, 'crate'], [2.8, -3.8, 'crate2'], [-4.4, -3.2, 'crate']]) furn(a, b, k, x, z);
      for (const [x, z] of [[-5.6, 2.6], [5.4, 2.8], [5.6, -3]]) furn(a, b, 'barrel', x, z);
      b.p('box', 0x8a8478, 0, 0.4, -6.2, 2.2, 0.8, 1.0); boxCol(a, 0, -6.2, 1.1, 0.5, -1, 0.3);
      a.group.add(b.build());
      light(a, 0, 3.4, 1, 0xbfd0ff, 0.9, 16); light(a, -3, 1.4, -3, 0xffb070, 0.6, 6);
      a.doors.push({ box: [-0.8, 6.0, 0.8, 7.2], to: 'lh0', at: [0, -5.2, 0] });
      a.doors.push({ box: [-0.8, -7.2, 0.8, -6.3], to: 'lh2', at: [0, 6.4, Math.PI], y: 0.3 });
    },
    populate: (a) => Story.populateLh(a, 1),
  });
  // Floor 2: the gear room. A pit full of turning gears and a Sporty climb to the top.
  defArea('lh2', {
    kind: 'indoor', sky: 'lighthouse', title: 'The Lighthouse: Gear Room', spawn: [0, 6.4, Math.PI], killY: -5, music: 'lighthouse',
    cams: [{ box: [-10, 2.5, 10, 10], pos: [0, 12.5, 12.5], fov: 50 }, { box: [-10, -10, 10, 2.5], pos: [-6, 13.5, 6.5], fov: 52 }],
    unsafe: (x, z, y) => false,
    build(a) {
      roundRoom(a, 8, { doors: [0, Math.PI], wall: 0xbab2a2, floor: false, h: 7, wallY: -3, segs: 20, window: true });
      const b = new Batch();
      // entry ledge (south) and the top ledge (north)
      b.p('box', 0x8a8478, 0, -0.5, 6.6, 9.2, 1, 3.6); b.p('box', 0x6a645a, 0, -2.6, 6.6, 9.2, 3.2, 3.6);
      addCol(a, { t: 'box', x: 0, z: 6.6, hx: 4.6, hz: 1.8, y0: -1, y1: 0 });
      b.p('box', 0x8a8478, 0, 1.4, -6.6, 9, 1.2, 3.6); addCol(a, { t: 'box', x: 0, z: -6.6, hx: 4.5, hz: 1.8, y0: -4, y1: 2.0 });
      b.p('box', 0x6a645a, 0, -2.4, -6.6, 9, 3.6, 3.6);
      // stepping platforms (cylinders with gear-tooth rims)
      const plats = [[2.6, 3.2, 0.5], [5.0, 0.6, 1.0], [-4.8, -1.2, 1.5], [-2.6, -3.6, 1.8]];
      for (const [x, z, top] of plats) {
        b.add(new THREE.CylinderGeometry(1.05, 1.05, top + 4, 10), 0x7a6a50, M4(x, (top - 4) / 2, z));
        b.p('cyl12', 0xc49a4a, x, top + 0.02, z, 2.3, 0.08, 2.3);
        addCol(a, { t: 'cyl', x, z, r: 1.05, y0: -6, y1: top });
      }
      // the pit: a huge horizontal gear far below
      b.add(new THREE.CylinderGeometry(6.5, 6.5, 0.6, 20), 0x5a4a3a, M4(0, -4.5, 0));
      for (let i = 0; i < 20; i++) { const an = i / 20 * TAU; b.p('box', 0x6a5a42, Math.sin(an) * 6.8, -4.5, Math.cos(an) * 6.8, 0.8, 0.5, 0.9, an); }
      a.group.add(b.build());
      // the moving platform shuttles between the low and high sides
      const mp = new THREE.Group(); mp.add(mesh(GEO.cyl12, 0xc49a4a, 0, -0.15, 0, 2.2, 0.3, 2.2)); mp.add(mesh(GEO.cyl, 0x5a5a62, 0, -2.3, 0, 0.3, 4.2, 0.3));
      a.group.add(mp);
      const mcol = addCol(a, { t: 'cyl', x: 2, z: -2.2, r: 1.1, y0: 0.6, y1: 0.9, moving: true, dx: 0, dz: 0 });
      a.mover = { mesh: mp, col: mcol, t: 0 };
      // turning wall gears (decor)
      a.gears = [];
      for (const [an, y, s] of [[1.2, 2.5, 2.2], [-1.4, 1.5, 1.6], [2.4, 3.6, 1.4]]) {
        const g = new THREE.Group(); g.position.set(Math.sin(an) * 7.6, y, Math.cos(an) * 7.6); g.rotation.y = an;
        g.add(mesh(GEO.cyl12, 0xa88a4a, 0, 0, 0, s * 2, 0.3, s * 2)); g.children[0].rotation.x = Math.PI / 2;
        for (let i = 0; i < 10; i++) { const t = mesh(GEO.box, 0xa88a4a, Math.sin(i / 10 * TAU) * s, Math.cos(i / 10 * TAU) * s, 0, 0.4, 0.4, 0.3); g.add(t); }
        a.group.add(g); a.gears.push(g);
      }
      light(a, 0, 4, 0, 0xc0d8ff, 1.1, 20); light(a, 0, -3, 0, 0xff8a40, 1.0, 10);
      a.doors.push({ box: [-0.8, 7.0, 0.8, 8.2], to: 'lh1', at: [0, -5.2, 0] });
      a.doors.push({ box: [-0.8, -8.2, 0.8, -7.3], to: 'lh3', at: [0, 7.4, Math.PI], y: 2.0, locked: () => (F('fuseBroken') ? null : 'Crackling purple bars block the stairs. A fuse box above them hums angrily.') });
    },
    populate: (a) => Story.populateLh(a, 2),
    onUpdate(a, dt) {
      const m = a.mover; m.t += dt;
      const k = (Math.sin(m.t * 0.7) + 1) / 2;
      const nx = lerp(2.4, -0.6, k), nz = lerp(-1.6, -2.0, k), ny = lerp(1.2, 1.9, k);
      m.col.dx = nx - m.col.x; m.col.dz = nz - m.col.z;
      const dy = ny - m.col.y1;
      if (Hero.platform === m.col) Hero.y += dy;
      m.col.x = nx; m.col.z = nz; m.col.y1 = ny; m.col.y0 = ny - 0.3;
      m.mesh.position.set(nx, ny, nz);
      for (let i = 0; i < a.gears.length; i++) a.gears[i].rotation.z += dt * (i % 2 ? -0.6 : 0.8);
    },
  });
  // Floor 3: the lamp room, where the Storm Engine stands. Boss fight.
  defArea('lh3', {
    kind: 'indoor', sky: 'lamp', title: 'The Lamp Room', spawn: [0, 7.4, Math.PI], killY: -6, music: 'boss',
    cams: [{ box: [-12, -12, 12, 12], pos: [0, 21, 9.5], fov: 52, lockLook: [0, 0, 0.6] }],
    build(a) {
      roundRoom(a, 9, { doors: [0], wall: 0x56606e, floorColor: 0x5e5c64, h: 5, segs: 22, window: true, trim: 0x2e2e38 });
      const b = new Batch();
      // big windows around the top, the lens rails
      for (let i = 0; i < 22; i++) { const an = (i + 0.5) / 22 * TAU; b.p('box', 0x1c2438, Math.sin(an) * 9.05, 3.4, Math.cos(an) * 9.05, 2.2, 2.4, 0.3, an); }
      b.add(new THREE.TorusGeometry(3.2, 0.12, 6, 24), 0xd6b25a, M4(0, 0.15, 0, 0, 1, 1, 1, Math.PI / 2));
      a.group.add(b.build());
      light(a, 0, 4, 4, 0xc8d4ff, 1.0, 22);
      a.doors.push({ box: [-0.8, 8.2, 0.8, 9.2], to: 'lh2', at: [0, -6.4, 0], cond: () => !G.bossActive });
    },
    populate: (a) => Story.populateLh(a, 3),
  });
})();
