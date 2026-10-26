// Event: Kowloon City, Hong Kong, in two visits. Spring 1990: the Kowloon Walled City, a year before most of its people
// moved out. Sunday 5 July 1998: the last day of Kai Tak airport, whose planes flew just over the rooftops.
// You're the helper of Mei Chan, a newspaper photographer, with a camera of your own (the album: "shots for the paper").
// Kowloon City in 1998 is a hub to explore, with odd jobs from the shopkeepers.

(() => {
  // ================= shared builders: blocks of flats, shop signs, planes =================
  const CONC = [0xc8c0b0, 0xb8b4a8, 0xd0c8b8, 0xa8a8a0, 0xc0b098, 0xb8c0b8, 0xd8d0c0, 0xc8b8a8, 0xa8b0b0];
  // a block of flats: a box with rows of windows on the named faces ('n' faces -z, 's' faces +z, 'e' +x, 'w' -x),
  // air conditioners, laundry poles and window cages. o: { y0, shop (no windows on the ground floor), night, faces, rough }
  function block(S, x, z, w, d, h, col, o = {}) {
    const m = S.gb(o.layer || 'main'), gl = S.gb('glow'), y0 = o.y0 || 0;
    m.box(x, y0, z, w, h, d, col, { j: 0.02 });
    if (o.roof !== false) m.box(x, y0 + h, z, w + 0.1, 0.5, d + 0.1, mixHex(col, 0x6a6a68, 0.35));
    const put = (f, u, yy, bw, bh, bd, c, L, out = 0.03) => {
      if (f === 's') L.box(x + u, yy, z + d / 2 + out, bw, bh, bd, c);
      else if (f === 'n') L.box(x - u, yy, z - d / 2 - out, bw, bh, bd, c);
      else if (f === 'e') L.box(x + w / 2 + out, yy, z + u, bd, bh, bw, c);
      else L.box(x - w / 2 - out, yy, z - u, bd, bh, bw, c);
    };
    for (const f of o.faces || 'nsew') {
      const len = f === 'n' || f === 's' ? w : d, nW = Math.max(1, Math.floor(len / (o.wsp || 2)));
      for (let yy = y0 + (o.shop ? 4.2 : 1.1); yy < y0 + h - 1.6; yy += 2.9) {
        for (let i = 0; i < nW; i++) {
          const u = -len / 2 + (i + 0.5) * len / nW, lit = o.night && RNG() < 0.6;
          put(f, u, yy, Math.min(1.3, len / nW - 0.4), 1.3, 0.06, lit ? rpick([0xffe2a8, 0xfff2d8, 0xd8ecff, 0xffd090]) : rpick([0x3a4450, 0x4a5460, 0x2e3844, 0x56606a]), lit ? gl : m);
          const r = RNG();
          if (r < 0.18) put(f, u + 0.2, yy - 0.5, 0.7, 0.45, 0.45, 0xd8d8d0, m, 0.25); // an air conditioner
          else if (r < 0.28 && o.rough) put(f, u, yy - 0.2, 1.4, 1.6, 0.5, 0x5a5a58, m, 0.25); // a window cage
          else if (r < 0.36) { for (let k = 0; k < 3; k++) put(f, u - 0.5 + k * 0.5, yy - 0.7, 0.35, 0.55, 0.04, rpick([0xe84a4a, 0xf4f4f0, 0x4a7ad8, 0xf4d84a, 0x6ab86a]), m, 0.7); }
        }
      }
    }
  }
  // a shop sign with Chinese characters (and maybe English), drawn on a canvas. Vertical signs read top to bottom.
  // o: { zh, en, w, h, vert, bg, fg, neon (glowing outline colour), ds (readable from both sides) }
  function sign(S, x, y, z, ry, o) {
    const vert = !!o.vert, W = o.w || (vert ? 1.1 : 3.2), H = o.h || (vert ? 3.4 : 1.1), px = 110;
    const tex = canvasTex(Math.round(W * px), Math.round(H * px), (c, w, h) => {
      const zh = [...(o.zh || '')], neon = o.neon;
      c.fillStyle = neon ? '#140c14' : o.bg || '#a8221e'; c.fillRect(0, 0, w, h);
      c.strokeStyle = neon || o.edge || '#e8c060'; c.lineWidth = neon ? 6 : 8; c.strokeRect(8, 8, w - 16, h - 16);
      const enH = o.en ? (vert ? 0 : h * 0.22) : 0;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (neon) { c.shadowColor = neon; c.shadowBlur = 18; }
      if (vert) {
        const s = Math.min(w * 0.72, (h - 30) / Math.max(1, zh.length) * 0.86);
        c.font = `700 ${s}px ${CJK}`; c.fillStyle = neon ? '#fff4e8' : o.fg || '#ffe08a';
        zh.forEach((ch, i) => c.fillText(ch, w / 2, 15 + (i + 0.5) * (h - 30) / zh.length));
      } else {
        const s = Math.min((h - enH) * 0.62, (w - 30) / Math.max(1, zh.length) * 0.9);
        c.font = `700 ${s}px ${CJK}`; c.fillStyle = neon ? '#fff4e8' : o.fg || '#ffe08a';
        if (neon) { c.lineWidth = 3; c.strokeStyle = neon; c.strokeText(zh.join(''), w / 2, (h - enH) / 2 + 4); }
        c.fillText(zh.join(''), w / 2, (h - enH) / 2 + 4);
        if (o.en) { c.font = `800 ${enH * 0.62}px Nunito, sans-serif`; c.fillStyle = neon ? neon : o.fg2 || '#fff'; c.fillText(o.en, w / 2, h - enH * 0.62); }
      }
    });
    const mk = (rot) => { const p = texPlane(tex, W, H); p.position.set(x, y, z); p.rotation.y = rot; S.add(p); return p; };
    const p = mk(ry); if (o.ds) mk(ry + Math.PI);
    return p;
  }
  // a jumbo jet, nose toward +z, about 70 m long. tail: the colour of the fin
  function jumbo(b, tail = 0x2a7a6a, lights = false) {
    const W = 0xf2f2ee, G = 0xb8bcc0;
    b.ccyl(0, 0, 0, 3.2, 58, W, { rx: Math.PI / 2, seg: 12 });
    b.ball(0, 0, 29, 3.2, W, { sz: 2.2, det: 1 });
    b.ball(0, 1.6, 18, 2.5, W, { sz: 4.2, sy: 0.9, det: 1 }); // the upper deck hump
    b.cbox(0, 0.9, 31.5, 2.6, 0.9, 1.2, 0x2a3440, { rx: 0.4 }); // cockpit windows
    b.ball(0, -0.6, -28, 3.0, W, { sz: 3, det: 1, sy: 0.8 });
    b.cbox(0, -2.4, 4, 4.6, 1.2, 30, G); // belly
    for (const s of [1, -1]) {
      // shapes are drawn in x / y and laid flat: y becomes -z, so positive y sweeps the wings back
      b.shape([[0, 0], [30 * s, 14], [30 * s, 18], [0, 12]], 0.7, W, { x: 0, y: -1.2, z: 8, rx: -Math.PI / 2 });
      b.shape([[0, 0], [10 * s, 6], [10 * s, 8.5], [0, 6]], 0.4, W, { x: 0, y: 0.6, z: -24, rx: -Math.PI / 2 });
      for (const k of [10, 19]) b.ccyl(k * s, -3.2, 8 - k * 0.48, 1.3, 4.2, G, { rx: Math.PI / 2, seg: 10 });
    }
    b.shape([[0, 0], [0, 13], [-4, 13], [-12, 0]], 0.6, tail, { x: 0, y: 2.5, z: -20, ry: Math.PI / 2 });
    if (lights) { b.ball(30, -1.2, -9, 0.5, 0x3aff6a); b.ball(-30, -1.2, -9, 0.5, 0xff3a3a); }
  }
  // planes flying over the set: S.data.fly(o) sends one along a straight line from `a` to `b` over `sec` seconds
  function planes(S, o = {}) {
    const fleet = (o.tails || [0x2a7a6a, 0xc8302a, 0x2a4a9a]).map((t) => {
      const g = S.obj((b) => jumbo(b, t), 0, -500, 0, 0, { cast: false });
      if (o.night) { const lt = S.obj(() => {}, 0, 0, 0, 0, { cast: false, glow: (gg) => { gg.ball(0, -3.5, 30, 1.2, 0xfff8e0, { det: 1 }); gg.ball(30, -1.2, -9, 0.6, 0x3aff6a, { det: 0 }); gg.ball(-30, -1.2, -9, 0.6, 0xff3a3a, { det: 0 }); gg.ball(0, 3, -4, 0.5, 0xff2a2a, { det: 0 }); } }); g.add(lt); lt.position.set(0, 0, 0); }
      g.visible = false; return g;
    });
    let cur = null, next = o.first != null ? o.first : 25, fi = 0;
    const path = o.path || { a: [-260, 70, -260], b: [260, 22, 260] };
    S.data.fly = (q = {}) => new Promise((res) => {
      const g = fleet[fi++ % fleet.length], a = q.a || path.a, b = q.b || path.b, sec = q.sec || 9;
      g.visible = true; g.rotation.order = 'YXZ';
      g.rotation.set(-Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])), Math.atan2(b[0] - a[0], b[2] - a[2]), 0);
      cur = { g, a, b, sec, t: 0, res };
      if (q.sound !== false) AU.jet(sec * 0.95, q.v || 0.4);
    });
    S.data.planeLow = () => !!cur && cur.t > cur.sec * 0.2 && cur.t < cur.sec * 0.8;
    S.data.plane = () => cur && cur.g;
    S.tick((dt) => {
      if (cur) {
        cur.t += dt; const k = cur.t / cur.sec;
        cur.g.position.set(lerp(cur.a[0], cur.b[0], k), lerp(cur.a[1], cur.b[1], k), lerp(cur.a[2], cur.b[2], k));
        if (S.spots.planecam) { const s = S.spots.planecam; if (k > 0.15 && k < 0.85) { s.x = cur.g.position.x; s.z = cur.g.position.z; s.y = cur.g.position.y - 1; } else s.x = 1e5; }
        if (k >= 1) { cur.g.visible = false; const r = cur.res; cur = null; r(); }
      } else {
        // the story is waiting for you to photograph a plane: send one soon
        if (Story.wants('spot', 'planecam')) next = Math.min(next, 3);
        else if (o.auto === false) return;
        next -= dt; if (next <= 0) { next = rnd(35, 60); S.data.fly(); }
      }
    });
  }
  // walk an extra round a loop of points for ever
  function wander(a, pts, o) { const go = (i) => a.walkTo(pts[i][0], pts[i][1], o).then(() => go((i + 1) % pts.length)); go(0); return a; }
  const SIGNCOL = [['#a8221e', '#ffe08a'], ['#1a5a3a', '#f4f4f0'], ['#f4f4f0', '#a8221e'], ['#f4d84a', '#1a1a1a'], ['#1a3a8a', '#ffe08a'], ['#f4f4f0', '#1a1a1a'], ['#2a2a2a', '#f4d84a']];
  const signCol = () => { const [bg, fg] = rpick(SIGNCOL); return { bg, fg }; };
  const folk = (o = {}) => Object.assign({ skin: rpick([SKIN.light, SKIN.fair, SKIN.tan, SKIN.light]), hair: rpick([0x1a1410, 0x2a2018, 0x1a1a1a, 0x8a8a88]), hairStyle: rpick(['short', 'short', 'flat', 'long', 'bun', 'balding']),
    top: rpick([0xf4f4f0, 0x4a6a9a, 0xd84a4a, 0x6a8a5a, 0xe8d8b0, 0x3a3a48, 0xf4b8c8, 0x8a6a9a]), topStyle: rpick(['shirt', 'shirt', 'jacket', 'vest']), bottom: rpick([0x2a2a3a, 0x3a3a3a, 0x4a5a7a, 0x6a5a4a, 0x2a3a5a]), h: rnd(1.55, 1.8), shortSleeves: RNG() < 0.6 }, o);

  // the hills of Kowloon to the north, with Lion Rock's lump on top: a smooth ridge for the backdrop
  const hills = (x, z) => { const ridge = Math.exp(-((z + 380) * (z + 380)) / 9000) * (90 + fbm(x * 0.006, 1, 3, 9) * 60); const rock = Math.exp(-((x - 60) * (x - 60) + (z + 360) * (z + 360)) / 2500) * 50; return ridge + rock - 25; };

  // ================= 1990: Tung Tau Tsuen Road, outside the Walled City =================
  function buildStreet90(S) {
    S.bounds(-28, -3.2, 28, 13.5);
    S.ground(() => 0);
    const m = S.gb('main'), sh = S.gb('shell'), gl = S.gb('glow');
    sh.box(0, -0.1, 4, 120, 0.1, 30, 0x5a5a58); // road
    sh.box(0, 0, -2.4, 120, 0.15, 2.4, 0x9a968c); sh.box(0, 0, 9.6, 120, 0.15, 2.6, 0x9a968c); // pavements
    for (let x = -50; x < 50; x += 6) sh.box(x, 0.0, 4, 3, 0.02, 0.15, 0xe8e0b0);
    // the Walled City: one wall of buildings grown together, all about the same height (the planes!)
    for (let x = -46; x < 46; x += rnd(4, 7)) {
      const w = rnd(4, 7), h = rnd(30, 40);
      block(S, x + w / 2, -8.8, w, 12, h, rpick(CONC), { faces: 's', shop: true, rough: true, wsp: 1.6 });
      // a forest of aerials and water tanks on top
      for (let k = 0; k < 3; k++) { const ax = x + rnd(0, w), az = rnd(-14, -4); m.rod([ax, h, az], [ax, h + rnd(2, 4), az], 0.04, 0x6a6a6a); m.box(ax, h + 2.4, az, 1.2, 0.05, 0.05, 0x6a6a6a); }
    }
    S.solidBox(0, -8.8, 120, 12);
    // shopfronts and clinics at street level, with the dentists' signs crowded above
    const clinics = [['牙科', 'DENTIST'], ['牙醫', 'DENTAL'], ['診所', 'CLINIC'], ['牙科', 'DENTIST'], ['鑲牙', 'DENTURES'], ['醫務所', 'DOCTOR'], ['牙科', 'DENTIST'], ['牙醫', 'DENTAL']];
    clinics.forEach(([zh, en], i) => {
      const x = -24 + i * 6.2 + (i >= 5 ? 3.2 : 0);
      m.box(x, 0, -2.75, 4.2, 2.8, 0.1, rpick([0x8a7a6a, 0x6a7a7a, 0x9a8a7a]));
      gl.box(x, 0.4, -2.68, 2.4, 1.8, 0.04, 0xf4f0d8);
      const c1 = signCol(), c2 = signCol();
      sign(S, x, 3.6, -2.6, 0, Object.assign({ zh, en, w: 3.6, h: 1.2, fg2: c1.fg }, c1));
      sign(S, x + 1.6, 6.6, -1.2, Math.PI / 2, Object.assign({ zh: zh + (i % 2 ? '專科' : '醫生'), vert: true, w: 0.9, h: 3, ds: true }, c2));
    });
    // the lane into the City: a dark slot between two buildings
    sh.box(6, 0, -3.1, 1.8, 3.2, 0.6, 0x0a0806);
    m.box(4.8, 0, -2.75, 0.6, 3.4, 0.4, 0x7a7a72); m.box(7.2, 0, -2.75, 0.6, 3.4, 0.4, 0x7a7a72);
    sign(S, 6, 3.7, -2.6, 0, { zh: '九龍城寨', en: 'WALLED CITY', w: 2.6, h: 0.9, bg: '#2a2a2a', fg: '#f4f0e0' });
    S.spot('gate', 6, -2.4, { r: 1.6 });
    // the other side of the road: lower shops and flats
    for (let x = -46; x < 46; x += 8) { const h = rnd(14, 24); block(S, x + 4, 15.5, 7.6, 7, h, rpick(CONC), { faces: 'n', shop: true }); sign(S, x + 4, 3.6, 11.9, Math.PI, Object.assign({ zh: rpick(['涼茶', '士多', '茶樓', '米舖', '五金', '藥房']), w: 3, h: 1 }, signCol())); }
    S.solidBox(0, 15.5, 120, 7);
    // people, a cart, a bus stop
    for (let i = 0; i < 9; i++) { const x = rnd(-24, 24), z = rpick([-1.8, 9.8]); wander(S.extra(folk(), x, z), [[x + rnd(6, 12), z], [x - rnd(6, 12), z]], { speed: rnd(0.8, 1.3) }); }
    for (let i = 0; i < 4; i++) S.extra(folk(), rnd(-22, 22), rnd(-2.1, -1.6), 0, { anim: 'idle' });
    m.box(-12, 0, 10.4, 1.4, 0.9, 0.8, 0x6a5a3a); m.box(-12, 0.9, 10.4, 1.5, 0.1, 0.9, 0x8a7a5a);
    for (let k = 0; k < 6; k++) m.ball(-12.4 + (k % 3) * 0.4, 1.05, 10.2 + Math.floor(k / 3) * 0.4, 0.15, 0xf4a83a);
    S.extra(folk({ hairStyle: 'bun', top: 0x4a6a9a }), -12, 11.2, Math.PI, { anim: 'idle' });
    // the camera Mei gives you, in your hand
    S.shot('dentists', -10, -2.6, { dy: 4, reach: 14 });
    planes(S, { path: { a: [-300, 120, -300], b: [300, 70, 300] }, first: 30 });
    S.actor('mei', 1.5, 3.2, Math.PI);
    S.actor('wong', -11.8, -1.6, 0.3);
    S.actor('tsang', 7.8, -1.6, -0.5, { anim: 'sit' });
  }

  // ================= 1990: inside the lanes =================
  // the lanes, as rectangles you may walk in: [x0, z0, x1, z1]
  const LANES = [[-20, -0.8, 20, 0.8], [-8.8, -12, -7.2, 10], [5.2, -12, 6.8, 10], [-8.8, -11.8, 6.8, -10.2], [-8.8, 8.2, 6.8, 9.8]];
  const inLane = (x, z, pad = 0) => LANES.some((l) => x > l[0] - pad && x < l[2] + pad && z > l[1] - pad && z < l[3] + pad);
  function buildLanes(S) {
    S.bounds(-20, -12, 20, 10);
    S.ground(() => 0);
    const m = S.gb('main'), sh = S.gb('shell'), gl = S.gb('glow');
    sh.box(0, -0.1, -1, 44, 0.1, 26, 0x3a3630);
    // the solid blocks between the lanes (walls to the ceiling), with grimy tiles and doors
    const BLOCKS = [[-20, -12, -8.8, -0.8], [-20, 0.8, -8.8, 10], [-7.2, -10.2, 5.2, -0.8], [-7.2, 0.8, 5.2, 8.2], [6.8, -12, 20, -0.8], [6.8, 0.8, 20, 10]];
    for (const [x0, z0, x1, z1] of BLOCKS) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
      sh.box(cx, 0, cz, w, 3.2, d, rpick([0x6a645a, 0x5a5a52, 0x6e6658]));
      S.solidBox(cx, cz, w, d);
      // tiles, stains and doors along the faces that meet a lane
      for (let k = 0; k < (w + d) * 0.8; k++) {
        const side = Math.floor(RNG() * 4), t = RNG();
        let px, pz, ry = 0;
        if (side === 0) { px = x0 + t * w; pz = z0 - 0.02; } else if (side === 1) { px = x0 + t * w; pz = z1 + 0.02; } else if (side === 2) { px = x0 - 0.02; pz = z0 + t * d; ry = Math.PI / 2; } else { px = x1 + 0.02; pz = z0 + t * d; ry = Math.PI / 2; }
        if (!inLane(px, pz, 0.3)) continue;
        const dark = RNG() < 0.35;
        m.box(px, dark ? 0 : rnd(0.2, 1.8), pz, dark ? 0.9 : rnd(0.3, 1.2), dark ? 2.1 : rnd(0.2, 0.8), 0.05, dark ? rpick([0x3a2a1e, 0x4a3a2a, 0x2a3a3a, 0x5a2a20]) : rpick([0x8a8a7a, 0x4a4438, 0x9aa09a, 0x5a5248]), { ry });
      }
    }
    // the ceiling: pipes, wires and fluorescent tubes over every lane; a slit of sky here and there
    sh.box(0, 3.2, -1, 44, 0.3, 26, 0x2a2622);
    for (const [x0, z0, x1, z1] of LANES) {
      const along = x1 - x0 > z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, len = along ? x1 - x0 : z1 - z0;
      for (let k = 0; k < 5; k++) {
        const off = -0.6 + k * 0.3, y = 2.5 + (k % 3) * 0.18, col = k < 3 ? 0x8a9098 : rpick([0x1a1a1a, 0x2a2a2a, 0x3a4a3a]), r = k < 3 ? 0.05 : 0.015;
        if (along) m.rod([x0, y, cz + off], [x1, y, cz + off], r, col, k < 3 ? 6 : 4); else m.rod([cx + off, y, z0], [cx + off, y, z1], r, col, k < 3 ? 6 : 4);
      }
      for (let s = 2; s < len; s += 4.5) { const px = along ? x0 + s : cx, pz = along ? cz : z0 + s; gl.box(px, 2.9, pz, along ? 1.2 : 0.08, 0.06, along ? 0.08 : 1.2, rpick([0xe8f4f0, 0xd8f0e8, 0xf4f0d8])); }
    }
    // a few warm and cold lights; the rest of the dark is left dark
    for (const [x, z, c] of [[-14, 0, 0xc8ffe8], [-8, -6, 0xffe0b0], [0, 0, 0xc8ffe8], [6, -5, 0xffd8a0], [-1, 9, 0xffe8c0], [-1, -11, 0xc8e8ff], [14, 0, 0xc8ffe8]]) { const l = new THREE.PointLight(c, 0.9, 11, 1.6); l.position.set(x, 2.6, z); S.add(l); }
    // dripping water
    for (const [x, z] of [[-12, 0.2], [-8, 4], [3, 0], [6, -8], [-3, 9], [12, -0.3]]) S.emitter(x, 2.5, z, { color: 0x9ab8d8, size: 0.06, rise: -1.6, life: 1.5, n: 6, spread: 0.05, drift: [0, 0] });
    // just inside the gate: rows of letterboxes
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) m.box(-16.5 + i * 0.42, 0.8 + j * 0.36, 0.82, 0.38, 0.32, 0.12, rpick([0x4a6a5a, 0x5a6a6a, 0x6a5a4a, 0x3a5a4a]));
    S.shot('mail', -15.5, 0.85, { dy: 1.2, reach: 4 });
    sign(S, -15.4, 2.2, 0.75, Math.PI, { zh: '信箱', en: 'LETTERS', w: 1.2, h: 0.5, bg: '#1a5a3a', fg: '#fff' });
    // Mr Ho's fish ball factory: an opening on the west side of the east lane, steam from the pots
    sh.box(4.95, 0, -5, 0.1, 2.4, 2.6, 0x101010);
    m.box(4.0, 0, -5, 1.6, 0.9, 2.2, 0x9aa0a0); for (let k = 0; k < 3; k++) m.cyl(4.0, 0.9, -5.8 + k * 0.8, 0.32, 0.3, 0xb8bcbc, { seg: 10 });
    for (let k = 0; k < 14; k++) m.ball(3.6 + rnd(0, 0.8), 1.25, -5.8 + rnd(0, 1.6), 0.06, 0xf4f0e0, { det: 0 });
    S.emitter(4.0, 1.3, -5, { color: 0xf0f0f0, size: 0.8, rise: 0.4, life: 2.5, n: 14, spread: 0.4, drift: [0.2, 0] });
    sign(S, 5.1, 2.3, -5, Math.PI / 2, { zh: '何記魚蛋', en: 'HO KEE', w: 1.6, h: 0.6, bg: '#f4d84a', fg: '#a8221e', fg2: '#1a1a1a' });
    S.shot('fishballs', 4.2, -5, { dy: 1.2, reach: 4.5 });
    // a noodle maker on the main lane, noodles hanging to dry
    for (let k = 0; k < 8; k++) m.box(11 + k * 0.18, 1.2, 0.86, 0.02, 0.9, 0.02, 0xf0e4c0);
    sign(S, 11.6, 2.3, 0.85, Math.PI, { zh: '麵家', w: 1.1, h: 0.5, bg: '#a8221e' });
    // the pump and the tanks where the lanes meet in the north-west
    m.cyl(-8, 0, -11.3, 0.4, 1.0, 0x4a6a8a, { seg: 10 }); m.box(-7.6, 0, -11.3, 0.5, 0.5, 0.5, 0x3a3a3a); m.rod([-8, 1.0, -11.3], [-8, 2.6, -11.3], 0.06, 0x8a9098);
    for (let k = 0; k < 7; k++) m.rod([-8.6 + k * 0.1, 2.6, -11.9], [-8.6 + k * 0.1, 2.6 - k * 0.05, 10], 0.03, 0x8a9098, 5);
    S.spot('pump', -7.6, -11, { label: 'Look at the water pump', dy: 1.0, r: 1.5 });
    S.shot('pipes', -8, -9, { dy: 2.6, reach: 5 });
    // Grandma Lau's door in the south lane; the kite string she leaves for Ming
    m.box(-2, 0, 8.18, 1.0, 2.1, 0.06, 0x8a2a1e); m.box(-2, 2.15, 8.17, 1.2, 0.3, 0.06, 0xa8221e);
    sign(S, -2, 2.3, 8.25, 0, { zh: '福', w: 0.5, h: 0.5, bg: '#c8302a', fg: '#ffd76a', edge: '#c8302a' });
    S.item('string', S.obj((b) => { b.cyl(0, 0, 0, 0.09, 0.08, 0xc8a050, { seg: 8 }); b.cyl(0, 0.02, 0, 0.1, 0.04, 0xf4f0e0, { seg: 8 }); }, -1.2, 0.75, 8.5), { label: 'the kite string' });
    m.box(-1.2, 0, 8.5, 0.5, 0.75, 0.4, 0x6a4a2a);
    // the stairs up to the roof at the top of the east lane
    for (let k = 0; k < 6; k++) m.box(6, k * 0.4, -11.6 - 0.0, 1.5, 0.4, 0.3, 0x5a564e);
    gl.box(6, 2.6, -11.9, 1.2, 0.5, 0.05, 0xd8e8ff);
    sign(S, 6, 2.2, -10.4, 0, { zh: '天台', en: 'ROOF', w: 1.0, h: 0.5, bg: '#1a1a1a', fg: '#fff' });
    S.spot('stairs', 6, -11, { label: 'Climb the stairs to the roof', dy: 1.2, r: 1.4 });
    // people in the lanes
    for (const [x, z, a] of [[-12, 0.3, 'idle'], [9, -0.4, 'work'], [-8, 6, 'sit'], [6, 4, 'idle'], [1, 8.7, 'work']]) S.extra(folk(), x, z, rnd(-3, 3), { anim: a });
    wander(S.extra(folk({ kid: true, h: 1.25 }), -6, 0), [[14, 0], [-6, 0]], { speed: 1.8, anim: 'walk' });
    S.actor('mei', -16.5, 0.4, -Math.PI / 2);
    S.actor('ho', 6, -4.6, -Math.PI / 2 + 0.4);
    S.actor('lau', -2, 8.9, Math.PI);
  }

  // ================= 1990: on the roof =================
  function roofH(x, z) {
    if (x < -6 && z < 2) return 0.4;
    if (x > 8 && z < -2) return 0.8;
    if (x > 8) return 0.4;
    return 0;
  }
  function buildRoof90(S) {
    S.bounds(-17, -14, 17, 12);
    S.ground(roofH);
    const m = S.gb('main'), sh = S.gb('shell');
    // our roofs, a little up and down, with low walls at the edges
    for (const [x0, z0, x1, z1] of [[-18, -15, -6, 2], [-6, -15, 8, 13], [-18, 2, -6, 13], [8, -15, 18, -2], [8, -2, 18, 13]]) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = roofH(cx, cz); sh.box(cx, -3, cz, x1 - x0, 3 + h, z1 - z0, rpick([0x8a867c, 0x7e7a72, 0x908a80])); }
    for (const [x, z, w, d] of [[0, -14.2, 36, 0.3], [0, 12.2, 36, 0.3], [-17.2, -1, 0.3, 26], [17.2, -1, 0.3, 26]]) m.box(x, 0, z, w, 1.0, d, 0x7a766e);
    // the rest of the City's roofs all around, about the same height, then the lower town and Lion Rock beyond
    for (let i = 0; i < 90; i++) {
      const a = RNG() * TAU, r = rnd(22, 70), x = Math.cos(a) * r, z = Math.sin(a) * r, h = rnd(-4, 1.5), w = rnd(6, 14);
      m.box(x, -30, z, w, 30 + h, rnd(6, 14), rpick(CONC));
      for (let k = 0; k < 4; k++) { const ax = x + rnd(-w / 2, w / 2), az = z + rnd(-3, 3); m.rod([ax, h, az], [ax, h + rnd(2, 4), az], 0.04, 0x5a5a5a, 4); m.box(ax, h + 2.5, az, 1.4, 0.05, 0.05, 0x5a5a5a); }
    }
    S.add(terrainMesh(-500, -560, 500, -150, 20, hills, (x, z, y) => (y > 70 ? 0x7a8068 : 0x5e7450)));
    // TV aerials, water tanks, a pigeon coop, laundry, pots of plants
    for (let i = 0; i < 70; i++) {
      const x = rnd(-16, 16), z = rnd(-13, 11); if (Math.hypot(x, z - 9) < 3) continue;
      const h0 = roofH(x, z), hh = rnd(2.5, 5);
      m.rod([x, h0, z], [x, h0 + hh, z], 0.04, 0x6a6a6a, 4);
      for (let k = 0; k < 3; k++) m.box(x, h0 + hh - k * 0.5, z, rnd(0.8, 1.8), 0.04, 0.04, 0x6a6a6a, { ry: rnd(0, 3) });
    }
    for (const [x, z] of [[12, -8], [-12, -10], [14, 6], [-14, 8]]) { const h0 = roofH(x, z); m.cyl(x, h0, z, 1.1, 2.2, 0x4a6a8a, { seg: 12 }); m.cyl(x, h0 + 2.2, z, 1.15, 0.15, 0x3a5a7a, { seg: 12 }); S.solidCircle(x, z, 1.2); }
    m.box(-12, 0.4, -4, 2.4, 1.6, 1.4, 0x8a6a4a); m.box(-12, 2.0, -4, 2.6, 0.1, 1.6, 0x6a4a2a); S.solidBox(-12, -4, 2.5, 1.5);
    for (let k = 0; k < 6; k++) m.ball(-12.8 + k * 0.3, 2.15, -4 + rnd(-0.4, 0.4), 0.12, rpick([0x9a9aa8, 0xd8d8d8, 0x6a6a7a]), { det: 0 });
    for (const [x0, z0, x1, z1] of [[2, -6, 8, -6], [-4, 4, 4, 6], [10, 2, 16, 3]]) {
      const h0 = roofH(x0, z0) + 2; m.rod([x0, h0, z0], [x1, h0, z1], 0.015, 0x3a3a3a, 3);
      for (let k = 0; k < 6; k++) {
        const t = (k + 0.5) / 6, ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, col = rpick([0xf4f4f0, 0xe84a4a, 0x4a7ad8, 0xf4d84a, 0x6ab86a, 0xf4a0c0]);
        const shirt = [[-0.28, 0], [0.28, 0], [0.28, -0.12], [0.18, -0.16], [0.18, -0.6], [-0.18, -0.6], [-0.18, -0.16], [-0.28, -0.12]];
        const pants = [[-0.18, 0], [0.18, 0], [0.18, -0.7], [0.04, -0.7], [0, -0.3], [-0.04, -0.7], [-0.18, -0.7]];
        m.shape(k % 3 === 2 ? pants : shirt, 0.02, col, { x: lerp(x0, x1, t), y: h0 - 0.02, z: lerp(z0, z1, t), ry: ry - Math.PI });
      }
      m.rod([x0, 0, z0], [x0, h0, z0], 0.03, 0x5a5a5a); m.rod([x1, 0, z1], [x1, h0, z1], 0.03, 0x5a5a5a);
    }
    for (let i = 0; i < 12; i++) { const x = rnd(-15, 15), z = rnd(-12, 10), h0 = roofH(x, z); m.cyl(x, h0, z, 0.25, 0.35, 0xa85a3a, { seg: 6 }); m.ball(x, h0 + 0.55, z, 0.3, 0x4a8a3a, { det: 0 }); }
    // the stair hut where you come up
    m.box(0, 0, 10.5, 3, 2.6, 2.4, 0x7a766e); m.box(0, 0, 9.28, 1.2, 2.1, 0.06, 0x2a2018); S.solidBox(0, 10.5, 3, 2.4);
    // Ming's kite, high over the roofs, on a long string
    const kite = S.obj((b) => { b.shape([[0, 0.7], [0.5, 0], [0, -0.9], [-0.5, 0]], 0.03, 0xe84a3a); b.shape([[0, 0.7], [0.5, 0], [0, 0]], 0.035, 0xf4d84a); for (let k = 0; k < 5; k++) b.box(0.05 * k, -1 - k * 0.35, 0, 0.18, 0.12, 0.02, k % 2 ? 0xf4f4f0 : 0x4a7ad8); }, -6, 16, -24);
    const str = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(-7.6, 1.6, -6), new V3(-6, 16, -24)]), new THREE.LineBasicMaterial({ color: 0xf4f0e0 })); S.add(str);
    S.tick((dt, t) => { kite.position.set(-6 + Math.sin(t * 0.7) * 1.5, 16 + Math.sin(t * 1.1) * 0.8, -24); kite.rotation.z = Math.sin(t * 1.3) * 0.25; const p = str.geometry.attributes.position; p.setXYZ(1, kite.position.x, kite.position.y - 0.5, kite.position.z); p.needsUpdate = true; });
    S.shot('kite', -6, -24, { dy: 0, reach: 40, y: 16 });
    // kids playing, a man with his pigeons, an auntie with the laundry
    wander(S.extra(folk({ kid: true, h: 1.2, top: 0xe84a4a }), -2, -2), [[4, -2], [4, 3], [-2, 3], [-2, -2]], { speed: 2.2 });
    wander(S.extra(folk({ kid: true, h: 1.3, top: 0x4a7ad8 }), 3, 3), [[-2, -2], [4, -2], [4, 3], [-2, 3]], { speed: 2.0 });
    S.extra(folk({ hairStyle: 'balding', top: 0xf4f4f0 }), -12, -2.4, Math.PI, { anim: 'point' });
    S.extra(folk({ hairStyle: 'bun', top: 0x8a6a9a }), 3, -5.4, 0, { anim: 'work' });
    planes(S, { path: { a: [-240, 48, -240], b: [240, 22, 240] }, first: 50 });
    S.spot('planecam', 1e5, 0, { label: 'Take a photo of the plane', dy: 1, reach: 400, r: 0.1 });
    S.shot('roofplane', 0, 0, { dy: 30, reach: 400, when: (S2) => S2.data.planeLow() || 'Wait for a plane to come over!' });
    S.actor('ming', -7.6, -6, Math.PI * 0.9, { anim: 'hands', y: 0.4 });
    S.actor('mei', 2, 7.5, Math.PI);
  }

  // ================= 1998: Kowloon City, the hub =================
  // the main street runs east-west (road z -5..5); Walled City Park is to the north-west, shops on both sides
  function tree(m, S, x, z, s = 1) { m.cyl(x, 0, z, 0.18 * s, 2.2 * s, 0x6a4a2e, { seg: 6 }); m.ball(x, 2.8 * s, z, 1.5 * s, rpick([0x3a7a3a, 0x4a8a3a, 0x2e6a32]), { det: 1, sy: 0.8, j: 0.08 }); m.ball(x + 0.6 * s, 2.4 * s, z + 0.3, 1.0 * s, 0x3a7a3a, { det: 0 }); S.solidCircle(x, z, 0.3 * s); }
  // the back of a shop seen from the street: a lit wall with shelves of goods, a door, a poster or two. dir: +1 faces +z
  function shopGoods(S, cx, z, w, dir) {
    const m = S.gb('main'), gl = S.gb('glow');
    gl.box(cx, 0.15, z, w, 2.9, 0.04, rpick([0xd8ccb0, 0xc8d0d4, 0xd8c8b0, 0xc8c0a8]));
    for (let y = 0.5; y < 2.6; y += 0.7) {
      m.box(cx, y, z + dir * 0.18, w, 0.05, 0.35, 0x6a5a48);
      for (let x = cx - w / 2 + 0.2; x < cx + w / 2 - 0.2; x += rnd(0.18, 0.45)) m.box(x, y + 0.05, z + dir * 0.18, rnd(0.12, 0.3), rnd(0.15, 0.4), 0.22, rpick([0xc8302a, 0xf4d84a, 0x2a6a9a, 0xf4f4f0, 0x3a8a4a, 0xd88a3a, 0x8a5a9a]));
    }
    if (w > 4) m.box(cx + w / 2 - 1.0, 0, z + dir * 0.03, 1.0, 2.2, 0.05, 0x3a2a20);
    gl.box(cx - w / 2 + 0.9, 2.65, z + dir * 0.04, 1.0, 0.5, 0.02, rpick([0xe84a4a, 0x4a8ae8, 0xf4c84a]));
  }
  function car(S, col, roof) {
    return S.obj((b) => {
      b.box(0, 0.25, 0, 1.75, 0.65, 4.3, col); b.box(0, 0.9, -0.2, 1.6, 0.55, 2.2, roof || col); b.box(0, 0.95, -0.2, 1.62, 0.4, 2.0, 0x2a3440);
      for (const [x, z] of [[0.8, 1.4], [-0.8, 1.4], [0.8, -1.4], [-0.8, -1.4]]) b.ccyl(x, 0.3, z, 0.3, 0.2, 0x1a1a1a, { rz: Math.PI / 2, seg: 8 });
      if (roof) b.box(0, 1.47, -0.2, 0.5, 0.15, 0.3, 0xf4f0d8);
    });
  }
  function minibus(b) {
    b.box(0, 0.3, 0, 2.0, 1.7, 5.8, 0xf4f0e0); b.box(0, 2.0, -0.2, 2.0, 0.55, 5.4, 0xc8302a); b.box(0, 1.15, 0, 2.02, 0.7, 5.2, 0x2a3440);
    b.box(0, 0.3, 2.9, 1.9, 1.0, 0.06, 0xd8d8d0);
    for (const [x, z] of [[0.95, 1.9], [-0.95, 1.9], [0.95, -1.9], [-0.95, -1.9]]) b.ccyl(x, 0.35, z, 0.35, 0.22, 0x1a1a1a, { rz: Math.PI / 2, seg: 8 });
  }
  // the neon teacup for Lam Kee: a cup, a handle and three wisps of steam (also the pattern for the neon minigame)
  const TEACUP = [[60, 120], [100, 330], [380, 330], [420, 120], [500, 140], [500, 230], [410, 250]];
  function buildKC(S) {
    S.bounds(-57, -47, 57, 19);
    S.ground(() => 0);
    const m = S.gb('main'), sh = S.gb('shell'), gl = S.gb('glow');
    sh.box(0, -0.1, -14, 130, 0.1, 80, 0x8a8a84);
    sh.box(0, -0.06, 0, 130, 0.06, 10, 0x4a4a4c); // the road
    for (let x = -60; x < 60; x += 5) sh.box(x, 0.0, 0, 2.5, 0.02, 0.14, 0xf4f4f0);
    for (const z of [-5.1, 5.1]) sh.box(0, 0, z, 130, 0.14, 0.2, 0xb8b8b0);
    for (let k = 0; k < 7; k++) sh.box(12, 0.005, -4 + k * 1.3, 4, 0.02, 0.7, 0xf4f4f0); // a zebra crossing
    // ---- Walled City Park ----
    sh.box(-35, 0.0, -28, 46, 0.04, 40, 0x6a9a50);
    for (const [x, z, w, d] of [[-35, -8.4, 46, 0.5], [-35, -47.6, 46, 0.5], [-57.6, -28, 0.5, 40], [-12.2, -28, 0.5, 40]]) {
      if (z === -8.4) { for (const [cx, ww] of [[-45.975, 23.75], [-19.05, 13.7]]) { m.box(cx, 0, z, ww, 2.2, d, 0xb8b0a0); m.box(cx, 2.2, z, ww + 0.2, 0.25, d + 0.2, 0x5a6a5a); S.solidBox(cx, z, ww, d); } }
      else { m.box(x, 0, z, w, 2.2, d, 0xb8b0a0); S.solidBox(x, z, w, d); }
    }
    // the park gate, with its name
    for (const x of [-33.6, -26.4]) { m.box(x, 0, -8.4, 1.0, 3.6, 1.0, 0x9a9088); S.solidBox(x, -8.4, 1.0, 1.0); }
    m.box(-30, 3.6, -8.4, 8.4, 0.6, 1.2, 0x5a6a5a); m.frustum(-30, 4.2, -8.4, 8.8, 0.7, 1.8, 0.5, 0x3a4a4a);
    sign(S, -30, 3.1, -7.7, 0, { zh: '九龍寨城公園', en: 'KOWLOON WALLED CITY PARK', w: 5.6, h: 1.0, bg: '#2a3a32', fg: '#f4e8c8', fg2: '#d8d0b8' });
    // paths, ponds, trees and rocks
    sh.box(-30, 0.05, -24, 3, 0.03, 30, 0xc8bca8); sh.box(-35, 0.05, -21, 40, 0.03, 2.4, 0xc8bca8);
    const wb = new GB(); for (const [x, z, w, d] of [[-46, -34, 12, 8], [-17, -20, 7, 6]]) { wb.box(x, 0.02, z, w, 0.06, d, 0xffffff); m.box(x, 0, z, w + 0.6, 0.15, d + 0.6, 0x8a8478); S.solidBox(x, z, w, d); }
    S.add(wb.mesh(R.mat.water, { cast: false }));
    for (let i = 0; i < 26; i++) { const x = rnd(-55, -14), z = rnd(-45, -11); if (Math.abs(x + 30) < 4 || Math.abs(z + 21) < 2.5 || (x < -39 && x > -53 && z < -29 && z > -39) || Math.hypot(x + 30, z + 34) < 10) continue; tree(m, S, x, z, rnd(0.9, 1.4)); }
    for (let i = 0; i < 10; i++) m.ball(rnd(-55, -15), 0.2, rnd(-45, -12), rnd(0.3, 0.7), 0x9a968c, { det: 0, sy: 0.7 });
    // the foundations of the old South Gate, dug up when the City came down, and its stone name plaque
    for (const [x, w] of [[-34.5, 3], [-25.5, 3]]) m.box(x, 0, -13.5, w, 0.5, 2.2, 0x8a8478);
    m.box(-30, 0, -14.6, 2.2, 0.9, 0.3, 0x7a756c); sign(S, -30, 0.55, -14.44, 0, { zh: '南門', w: 1.2, h: 0.6, bg: '#8a8478', fg: '#3a3630', edge: '#7a756c' });
    // the yamen: a low hall with a grey tiled roof on red pillars, the only building of the fort still standing
    const yx = -30, yz = -34;
    m.box(yx, 0, yz, 16, 0.5, 10, 0x9a948a); S.solidBox(yx, yz, 15, 9);
    m.box(yx, 0.5, yz - 0.5, 14, 3.4, 7, 0x8a8a84);
    for (let k = -3; k <= 3; k++) m.cyl(yx + k * 2.2, 0.5, yz + 3.4, 0.18, 3.4, 0x9a2a1e, { seg: 8 });
    m.frustum(yx, 3.9, yz, 16.4, 1.8, 10.4, 0.55, 0x4e5458); m.box(yx, 5.7, yz, 9.6, 0.35, 0.5, 0x3e4448);
    for (const s of [-1, 1]) m.box(yx + s * 4.9, 5.75, yz, 0.6, 0.5, 0.5, 0x3e4448, { rz: s * 0.4 });
    m.box(yx, 0.5, yz + 3.52, 2.2, 2.6, 0.05, 0x2a1a12);
    sign(S, yx, 3.2, yz + 3.55, 0, { zh: '衙門', w: 1.6, h: 0.6, bg: '#2a1a12', fg: '#e8c060' });
    m.box(yx + 4, 0, yz + 6.5, 1.6, 1.3, 0.12, 0x3a4a3a); gl.box(yx + 4, 0.25, yz + 6.57, 1.4, 0.95, 0.02, 0xf4f0e0);
    S.spot('yamen', yx + 4, yz + 7.2, { label: 'Read the sign by the yamen', dy: 1.0, r: 1.6 });
    S.shot('yamen', yx, yz, { dy: 3, reach: 22 });
    // an old man's bird, out of her cage, in a tree near the yamen
    tree(m, S, -21, -38, 1.1);
    S.item('bird', S.obj((b) => { b.ball(0, 0, 0, 0.09, 0x8aa83a, { sz: 1.4 }); b.ball(0, 0.06, 0.1, 0.06, 0x8aa83a); b.ball(0.025, 0.08, 0.15, 0.015, 0xf4f4f0, { det: 0 }); b.box(0, -0.02, -0.15, 0.04, 0.02, 0.1, 0x6a8a2a); }, -21.6, 2.2, -37.2, 0.6), { label: 'the little white-eye', dy: 0 });
    // ---- the shops on the north side of the street ----
    const north = [[-10, -2, 'shop'], [0, 12, 'lamkee'], [12, 20, 'bakery'], [20, 30, 'neon'], [30, 36, 'barber'], [36, 46, 'hardware'], [46, 57, 'shop']];
    // each shop is open to the street under the flats above: three metres of shop floor, then a back wall
    for (const [x0, x1, kind] of north) {
      const cx = (x0 + x1) / 2, w = x1 - x0, h = rnd(19, 25), col = rpick(CONC);
      block(S, cx, -14, w - 0.2, 12, h - 3.6, col, { faces: 's', y0: 3.6 });
      m.box(x0 + 0.1, 0, -13, 0.2, 3.6, 10, mixHex(col, 0x5a5a58, 0.3)); S.solidBox(x0 + 0.1, -13, 0.3, 10);
      sh.box(cx, 3.45, -13, w, 0.15, 10, 0xd8d4c8);
      if (kind === 'lamkee') continue;
      sh.box(cx, 0, -15.5, w - 0.2, 3.6, 9, mixHex(col, 0x3a3a38, 0.4)); S.solidBox(cx, -15.5, w, 9);
      shopGoods(S, cx, -10.95, w - 1.2, 1);
      sh.box(cx, 0, -8.0, w - 0.2, 0.15, 0.2, 0x8a8478);
    }
    m.box(56.9, 0, -13, 0.2, 3.6, 10, 0x9a9488); S.solidBox(56.9, -13, 0.3, 10);
    // Lam Kee: an open shopfront you can walk into, booths, a counter, menus on the wall and fans
    sh.box(6, 0, -18.1, 12, 3.6, 0.2, 0x3a6a5a); sh.box(6, 3.6, -13, 12, 0.2, 10.4, 0xe8e4d8); // back wall, ceiling
    for (let i = 0; i < 12; i++) for (let j = 0; j < 10; j++) sh.box(0.5 + i, 0.01, -17.5 + j, 1, 0.02, 1, (i + j) % 2 ? 0xf4f0e8 : 0x3a6a5a);
    for (const z of [-10, -12.6, -15.2]) for (const x of [1.4, 10.6]) {
      m.box(x, 0, z, 1.6, 0.75, 1.0, 0xa8724a); m.box(x, 0.75, z, 1.7, 0.05, 1.1, 0xf4f0e8); S.solidBox(x, z, 1.6, 1.0);
      for (const dz of [-0.95, 0.95]) { m.box(x, 0, z + dz, 1.6, 0.45, 0.5, 0x8a2a2a); m.box(x, 0.45, z + dz + Math.sign(dz) * 0.2, 1.6, 0.6, 0.1, 0x8a2a2a); }
    }
    m.box(6, 0, -16.4, 7, 1.1, 0.8, 0x8a5a3a); m.box(6, 1.1, -16.4, 7.2, 0.06, 1.0, 0xd8d0c0); S.solidBox(6, -16.4, 7, 0.8);
    for (let k = 0; k < 3; k++) { m.cyl(3.6 + k * 0.5, 1.16, -16.6, 0.13, 0.4, 0xd8dcdc, { seg: 8 }); }
    m.cyl(8, 1.16, -16.5, 0.18, 0.28, 0xc8ccc8, { seg: 10 }); // the hot water urn
    sign(S, 3.6, 2.6, -17.95, 0, { zh: '奶茶 菠蘿油', en: 'MILK TEA · BO LO YAU', w: 3.4, h: 0.9, bg: '#f4f0e0', fg: '#a8221e', fg2: '#3a3a3a', edge: '#3a6a5a' });
    sign(S, 8.4, 2.6, -17.95, 0, { zh: '西多士 餐蛋麵', en: 'FRENCH TOAST · NOODLES', w: 3.4, h: 0.9, bg: '#f4f0e0', fg: '#a8221e', fg2: '#3a3a3a', edge: '#3a6a5a' });
    sign(S, 6, 4.4, -7.9, 0, { zh: '林記冰室', en: 'LAM KEE CAFE', w: 6, h: 1.4, bg: '#1a5a4a', fg: '#ffe8a0' });
    const fans = [];
    for (const x of [3, 9]) { const f = S.obj((b) => { b.box(0, 0, 0, 1.6, 0.02, 0.18, 0xe8e8e0); b.box(0, 0, 0, 0.18, 0.02, 1.6, 0xe8e8e0); b.cyl(0, -0.05, 0, 0.12, 0.12, 0xb8b8b0); }, x, 3.3, -12.5); fans.push(f); }
    S.tick((dt) => { for (const f of fans) f.rotation.y += dt * 6; });
    // a breakfast on the front table: milk tea and a pineapple bun with butter
    m.cyl(1.2, 0.8, -10, 0.06, 0.1, 0xf4f4f0, { seg: 10 }); m.cyl(1.2, 0.84, -10, 0.055, 0.07, 0xc89a6a, { seg: 10 });
    m.ball(1.6, 0.86, -10.1, 0.12, 0xd8a050, { sy: 0.6 }); m.box(1.6, 0.88, -10.1, 0.12, 0.03, 0.06, 0xfff0a0);
    S.shot('milktea', 1.4, -10, { dy: 0.85, reach: 3.5 });
    S.spot('lamkee', 6, -10, { r: 2.4 });
    S.spot('counter', 6, -15.4, { label: 'Go behind the counter', dy: 1.0, r: 1.4 });
    // Master Fung's teacup sign, not lit yet, on its frame over Lam Kee
    const cup = S.obj((b) => { for (let i = 0; i < TEACUP.length - 1; i++) { const a = TEACUP[i], c = TEACUP[i + 1]; b.rod([(a[0] - 280) / 160, (240 - a[1]) / 160, 0], [(c[0] - 280) / 160, (240 - c[1]) / 160, 0], 0.03, 0xc8d4d8, 5); } }, 10.5, 6.6, -7.6);
    cup.visible = false; S.data.cup = cup;
    // the bakery, the neon workshop, the barber's, the hardware shop
    m.box(16, 0, -8.8, 7, 1.0, 0.8, 0xc8a878); gl.box(16, 1.0, -8.8, 7, 0.4, 0.8, 0xfff0d0); S.solidBox(16, -8.8, 7, 0.8);
    for (let k = 0; k < 14; k++) m.ball(13.4 + (k % 7) * 0.8, 1.15, -8.95 + Math.floor(k / 7) * 0.35, 0.14, 0xd8a050, { sy: 0.6 });
    S.item('buns', S.obj((b) => { b.box(0, 0, 0, 0.3, 0.28, 0.18, 0xd8c8a0); b.box(0, 0.28, 0, 0.32, 0.04, 0.2, 0xc8b890); }, 18.6, 1.4, -8.6), { label: 'the bag of pineapple buns' });
    sign(S, 16, 4.2, -7.9, 0, { zh: '周記餅店', en: 'CHOW KEE BAKERY', w: 5, h: 1.1, bg: '#f4d84a', fg: '#a8221e', fg2: '#3a2a1a' });
    m.box(25, 0, -10.4, 4, 0.9, 1.0, 0x5a5a5e); gl.cyl(24, 0.9, -10.4, 0.06, 0.25, 0x6ab8ff, { seg: 6 }); S.solidBox(25, -10.4, 4, 1.0);
    for (let k = 0; k < 6; k++) m.rod([21.5 + k * 0.6, 2.2, -10.85], [21.5 + k * 0.6, 3.2, -10.85], 0.03, 0xc8d8e0, 4);
    sign(S, 25, 4.2, -7.9, 0, { zh: '馮記霓虹', en: 'FUNG NEON SIGNS', w: 5.5, h: 1.1, neon: '#ff4ac8' });
    sign(S, 33, 4.2, -7.9, 0, { zh: '葉記理髮', en: 'BARBER', w: 3.6, h: 1.1, bg: '#f4f4f0', fg: '#1a4a8a', fg2: '#a8221e' });
    const pole = S.obj((b) => { for (let k = 0; k < 8; k++) b.cyl(0, k * 0.15, 0, 0.12, 0.15, [0xd8302a, 0xf4f4f0, 0x2a4a9a, 0xf4f4f0][k % 4], { seg: 8 }); }, 35.5, 1.2, -7.7);
    S.tick((dt) => { pole.rotation.y += dt * 2; });
    m.box(42, 0, -8.8, 6, 1.2, 0.6, 0x7a6a5a); S.solidBox(42, -8.8, 6, 0.6); for (let k = 0; k < 10; k++) m.box(39.5 + k * 0.5, 1.2, -8.8, 0.3, rnd(0.2, 0.6), 0.3, rpick([0xc8302a, 0x2a6a9a, 0xd8b83a, 0x8a8a8a]));
    sign(S, 41, 4.2, -7.9, 0, { zh: '張記五金', en: 'CHEUNG HARDWARE', w: 5, h: 1.1, bg: '#a8221e' });
    sign(S, 44.6, 1.9, -10.92, 0, { zh: '颱風信號', en: 'TYPHOON SIGNALS', w: 1.8, h: 1.0, bg: '#f4f4f0', fg: '#1a1a1a', fg2: '#a8221e' });
    // ---- the south side: a Thai restaurant opening today, the sign painter, more shops ----
    const south = [[-57, -20, 'shop'], [-20, -8, 'thai'], [-8, 0, 'kwok'], [0, 14, 'shop'], [14, 24, 'shop'], [24, 36, 'shop'], [36, 57, 'shop']];
    for (const [x0, x1, kind] of south) {
      const cx = (x0 + x1) / 2, w = x1 - x0, h = rnd(17, 24);
      block(S, cx, 14, w - 0.2, 12, h, rpick(CONC), { faces: 'n', shop: true });
      S.solidBox(cx, 14, w, 12);
      sh.box(cx, 0, 7.96, w - 0.4, 3.4, 0.06, 0x2a2622); shopGoods(S, cx, 7.9, w - 1.2, -1);
    }
    sign(S, -14, 4.2, 7.9, Math.PI, { zh: '泰國菜館', en: 'MALEE THAI KITCHEN', w: 6, h: 1.2, bg: '#2a4a9a', fg: '#ffe08a' });
    for (let k = 0; k < 8; k++) m.ball(-17.5 + k, 3.6, 7.6, 0.18, k % 2 ? 0xd8302a : 0xf4d84a, { det: 0 }); // flower garlands for the opening
    const lion = S.obj((b) => {
      b.ball(0, 1.2, 0, 0.6, 0xd83a2a, { sy: 0.8, det: 1 }); b.box(0, 1.5, 0.35, 0.9, 0.25, 0.2, 0xf4d84a); b.ball(0.22, 1.35, 0.5, 0.12, 0xf4f4f0, { det: 0 }); b.ball(-0.22, 1.35, 0.5, 0.12, 0xf4f4f0, { det: 0 });
      b.ball(0, 1.75, 0.1, 0.15, 0xf4d84a, { det: 0 }); b.box(0, 0.4, -1.1, 0.9, 0.9, 1.8, 0xd8a03a); for (let k = 0; k < 5; k++) b.box(0, 0.85, -0.3 - k * 0.35, 0.95, 0.05, 0.1, 0xf4f4f0);
    }, -16, 0, 6.6, Math.PI / 2);
    S.tick((dt, t) => { lion.position.y = Math.abs(Math.sin(t * 2.5)) * 0.15; lion.rotation.z = Math.sin(t * 1.7) * 0.06; });
    m.cyl(-10.6, 0, 6.8, 0.45, 0.6, 0xc8302a, { seg: 12 }); m.cyl(-10.6, 0.6, 6.8, 0.46, 0.04, 0xf4e8c8, { seg: 12 }); // the drum
    sign(S, -4, 4.2, 7.9, Math.PI, { zh: '郭記招牌', en: 'KWOK SIGN PAINTING', w: 5, h: 1.1, bg: '#1a1a1a', fg: '#f4d84a' });
    m.box(-2.4, 0, 6.9, 0.1, 1.8, 0.8, 0x6a4a2a); m.box(-2.4, 0.5, 6.9, 1.6, 1.0, 0.06, 0xa8221e, { ry: Math.PI / 2 });
    // the egg waffle cart on the pavement
    m.box(6, 0, 6.4, 1.6, 0.9, 0.9, 0xd8d8d0); m.box(6, 0.9, 6.4, 1.7, 0.08, 1.0, 0xb8b8b0); m.cyl(5.6, 0.98, 6.4, 0.25, 0.12, 0x3a3a3a, { seg: 10 }); m.cyl(6.4, 0.98, 6.4, 0.25, 0.12, 0x3a3a3a, { seg: 10 });
    m.box(6, 0.98, 6.4, 1.6, 1.3, 0.04, 0xf4d84a, { rx: 0 }); S.solidBox(6, 6.4, 1.6, 0.9);
    sign(S, 6, 2.5, 5.9, Math.PI, { zh: '雞蛋仔', en: 'EGG WAFFLES', w: 1.8, h: 0.7, bg: '#f4d84a', fg: '#a8221e', fg2: '#3a2a1a' });
    S.emitter(6, 1.2, 6.4, { color: 0xf4f0e8, size: 0.5, rise: 0.5, life: 2, n: 8, spread: 0.2 });
    // the minibus stop, with a red minibus waiting
    m.rod([30, 0, 5.6], [30, 2.6, 5.6], 0.05, 0x8a8a8a); sign(S, 30, 2.8, 5.6, Math.PI / 2, { zh: '小巴站', en: 'MINIBUS', w: 1.4, h: 0.7, bg: '#f4f0e0', fg: '#c8302a', fg2: '#1a1a1a', ds: true });
    S.obj(minibus, 30, 0, 3.2, Math.PI / 2); S.solidBox(30, 3.2, 5.8, 2.1);
    S.shot('minibus', 30, 3.2, { dy: 1.5, reach: 12 });
    S.spot('busstop', 29, 6.4, { r: 2 });
    // projecting signs over the street on both sides
    const zhs = ['酒家', '藥房', '金行', '茶樓', '涼茶', '麵家', '燒臘', '士多', '海鮮', '冰室', '雜貨', '眼鏡', '時裝', '電器', '火鍋', '粥麵'];
    for (let x = -6; x < 56; x += 3.6) for (const side of [-1, 1]) {
      if (RNG() < 0.35) continue;
      sign(S, x + rnd(-0.5, 0.5), rnd(5.5, 11), side * 6.5, Math.PI / 2, Object.assign({ zh: rpick(zhs) + rpick(['', '', '館', '店']), vert: true, w: 1.0, h: rnd(2.6, 3.6), ds: true }, signCol()));
    }
    // traffic: red Kowloon taxis and other cars, which wait if you stand in the road
    const cars = [];
    for (let i = 0; i < 6; i++) { const dir = i % 2 ? 1 : -1, c = car(S, i < 4 ? 0xc8302a : rpick([0xf4f4f0, 0x3a4a6a, 0x8a8a8a]), i < 4 ? 0xd8d8d0 : null); c.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; cars.push({ c, dir, x: -60 + i * 21, z: dir * 2.5, v: rnd(7, 10) }); }
    S.tick((dt) => {
      for (const q of cars) {
        const ahead = (PL.x - q.x) * q.dir, blocked = Math.abs(PL.z - q.z) < 1.8 && ahead > 0 && ahead < 7;
        if (!blocked) q.x += q.dir * q.v * dt;
        if (q.x > 62) q.x = -62; if (q.x < -62) q.x = 62;
        q.c.position.set(q.x, 0, q.z);
      }
    });
    // people on the pavements
    for (let i = 0; i < 14; i++) { const z = rpick([-6.5, 6.6]), x = rnd(-6, 50); wander(S.extra(folk(), x, z), [[x + rnd(6, 14), z], [x - rnd(6, 14), z]], { speed: rnd(0.9, 1.3) }); }
    for (let i = 0; i < 6; i++) { const x = rnd(-50, -16), z = rnd(-44, -12); wander(S.extra(folk({ hairStyle: rpick(['balding', 'bun', 'short']), hair: 0x9a9a98 }), x, z), [[-30, -21], [x, z]], { speed: 0.7 }); }
    for (const [x, z] of [[-3, 12.4], [2, -9.6]]) S.extra(folk(), x, z, 0, { anim: 'idle' });
    S.extra(folk(), 10.6, -12.6, 0, { anim: 'sit', seated: true }); S.extra(folk({ hairStyle: 'bun' }), 1.4, -15.2, 0, { anim: 'sit', seated: true });
    planes(S, { path: { a: [-300, 95, -300], b: [300, 30, 300] }, first: 20 });
    S.shot('lowplane', 0, 0, { dy: 55, reach: 400, when: (S2) => S2.data.planeLow() || 'Wait for a plane to come over!' });
    // the cast who live and work here
    S.actor('mei98', -28, -6.2, -0.4);
    S.actor('ming98', 6, -17.2, 0, { anim: 'idle' });
    S.actor('lam', 9.6, -17.2, 0.2, { anim: 'idle' });
    S.actor('fung', 26.6, -9.4, 0.3, { anim: 'idle' });
    S.actor('chow', 17.6, -9.8, 0);
    S.actor('yip', 33.8, -9.4, 0.2);
    S.actor('cheung', 42.6, -9.6, -0.3);
    S.actor('kwok', -3.4, 7.4, Math.PI);
    S.actor('kam', 6, 7.4, Math.PI);
    S.actor('malee', -13, 7.2, Math.PI - 0.3);
    S.actor('tang', -11.4, 7.3, Math.PI + 0.3);
    S.actor('pak', -42, -22.4, 0.4, { anim: 'sit' });
    m.box(-42, 0, -23.2, 2.2, 0.45, 0.6, 0x6a4a2a); m.box(-42, 0.45, -23.5, 2.2, 0.5, 0.1, 0x6a4a2a);
    m.rod([-39.6, 0, -22.6], [-39.6, 2.2, -22.6], 0.03, 0x5a3a20); S.obj((b) => { b.cyl(0, 0, 0, 0.22, 0.4, 0xc8a050, { seg: 10 }); b.cone(0, 0.4, 0, 0.22, 0.2, 0xb8904a, { seg: 10 }); }, -39.6, 1.6, -22.6);
  }

  // ================= 1998: on the Star Ferry, crossing to Central =================
  // the deck runs north-south; Hong Kong Island's towers are ahead (+z), Tsim Sha Tsui behind
  function skyline(S, z0, o = {}) {
    const g = S.obj((b) => {
      for (let x = -520; x < 520; x += rnd(14, 30)) {
        const h = rnd(30, 120) * (Math.abs(x) < 240 ? 1.5 : 1), w = rnd(14, 26), d = rnd(14, 24), z = rnd(0, 60);
        b.box(x, 0, z, w, h, d, rpick([0x8a98a8, 0xa8b0b8, 0xc8c8c0, 0x6a7a8a, 0xb8b0a0, 0x9aa8b0]));
        for (let y = 6; y < h - 4; y += 9) b.box(x, y, z - d / 2 - 0.3, w * 0.86, 2.5, 0.4, o.night ? 0xffe0a0 : 0x5a6878);
      }
      // the Bank of China Tower: a tall glass prism criss-crossed with white lines
      b.box(-40, 0, 40, 40, 200, 40, 0x6a8aa8); b.frustum(-40, 200, 40, 40, 70, 40, 0, 0x7a9ab8, { ry: Math.PI / 4 });
      for (let y = 20; y < 200; y += 50) { b.rod([-60, y, 19.4], [-20, y + 50, 19.4], 0.9, 0xf4f4f0, 4); b.rod([-20, y, 19.4], [-60, y + 50, 19.4], 0.9, 0xf4f4f0, 4); }
      b.rod([-40, 270, 40], [-40, 320, 40], 1.2, 0xd8d8d8, 4);
      // Central Plaza across the bay, with its golden top; the round windows of Jardine House by the water
      b.box(330, 0, 30, 46, 230, 46, 0xc8a860); b.frustum(330, 230, 30, 46, 30, 46, 0.3, 0xd8b870); b.rod([330, 260, 30], [330, 300, 30], 1, 0xd8d8d8, 4);
      b.box(60, 0, -10, 40, 130, 30, 0xc8c8c0); for (let y = 8; y < 125; y += 6) for (let x = 44; x < 78; x += 5) b.ccyl(x, y, -25.3, 1.4, 0.3, 0x3a4a5a, { rx: Math.PI / 2, seg: 8 });
      // the Convention Centre's new wing, like a bird about to fly, opened for the Handover in 1997
      b.ball(230, 6, -40, 50, 0xd8dcd8, { sy: 0.18, sz: 0.5 });
      // Victoria Peak behind it all
      b.ball(0, -60, 520, 520, 0x4a6a48, { sy: 0.65, sz: 0.4, det: 2 });
    }, 0, -3, z0, 0, { cast: false });
    return g;
  }
  function buildFerry(S) {
    S.bounds(-3.4, -13.4, 3.4, 13.4);
    S.ground(() => 0);
    const m = S.gb('main'), sh = S.gb('shell');
    // the water, with whitecaps sliding past so you can feel the boat moving
    const wb = new GB(); wb.box(0, -3.2, 0, 3000, 0.1, 3000, 0xffffff); const sea = wb.mesh(R.mat.water, { cast: false }); sea.material = sea.material.clone(); sea.material.color.set(0x3a6a7a); S.add(sea);
    const caps = S.obj((b) => { for (let i = 0; i < 80; i++) b.box(rnd(-120, 120), -3.1, rnd(-150, 150), rnd(0.5, 2), 0.04, rnd(0.2, 0.5), 0xe8f0f0); }, 0, 0, 0, 0, { cast: false });
    S.tick((dt, t) => { caps.position.z = -((t * 6) % 40); });
    // the hull below and the green-and-white upper deck
    m.box(0, -3.2, 0, 8.6, 3.0, 30, 0x2a6a4a); m.box(0, -0.3, 0, 8.8, 0.3, 30.2, 0xf4f4f0);
    sh.box(0, -0.05, 0, 8, 0.05, 28, 0xa87a4a);
    for (let z = -13.5; z <= 13.5; z += 0.9) for (const x of [-4.1, 4.1]) m.box(x, 0, z, 0.06, 1.0, 0.06, 0xf4f4f0);
    for (const x of [-4.1, 4.1]) { m.box(x, 1.0, 0, 0.12, 0.08, 28, 0x8a5a2a); S.solidBox(x + Math.sign(x) * 0.2, 0, 0.4, 30); }
    for (const z of [-14.2, 14.2]) { m.box(0, 0, z, 8.2, 1.0, 0.1, 0xf4f4f0); m.box(0, 1.0, z, 8.4, 0.08, 0.15, 0x8a5a2a); S.solidBox(0, z + Math.sign(z) * 0.2, 9, 0.4); }
    // the roof on its posts, and the wheelhouse in the middle of it
    sh.box(0, 2.6, 0, 8.6, 0.15, 20, 0xf4f4f0); m.box(0, 2.75, 0, 3, 1.2, 4, 0x2a6a4a); m.box(0, 3.3, 2.01, 2.6, 0.5, 0.04, 0x2a3440);
    for (const z of [-9.8, -3, 3, 9.8]) for (const x of [-4, 4]) m.box(x, 0, z, 0.12, 2.6, 0.12, 0xf4f4f0);
    // rows of wooden benches whose backs flip over, so you always face the way you're going
    for (let z = -8; z <= 8; z += 1.6) for (const x of [-2.2, 2.2]) {
      m.box(x, 0, z, 2.6, 0.45, 0.45, 0x6a4a2a); m.box(x, 0.45, z, 2.6, 0.06, 0.5, 0x9a6a3a); m.box(x, 0.5, z - 0.25, 2.6, 0.55, 0.06, 0x9a6a3a, { rx: -0.2 });
      S.solidBox(x, z, 2.6, 0.5);
    }
    for (const z of [-12, 12]) m.ccyl(4.25, 0.8, z, 0.35, 0.1, 0xe84a3a, { rz: Math.PI / 2, seg: 12 }); // life rings
    // ahead: Hong Kong Island, coming closer; behind: Tsim Sha Tsui's clock tower
    const isl = skyline(S, 480);
    S.tick((dt, t) => { isl.position.z = Math.max(330, 480 - t * 2.5); });
    m.box(-30, -3, -260, 8, 44, 8, 0xc88a6a); m.frustum(-30, 41, -260, 8, 6, 8, 0, 0x8a5a4a); m.box(60, -3, -280, 80, 18, 40, 0xc89a8a);
    for (let i = 0; i < 6; i++) { const z = rpick([1, -1]) * rnd(40, 200), x = rnd(-200, 200); S.obj((b) => { b.box(0, 0, 0, 3, 1.2, 9, 0x5a3a2a); b.shape([[0, 0], [0, 6], [4, 1]], 0.05, 0xb85a2a, { x: 0, y: 1.2, z: 0, ry: Math.PI / 2 }); }, x, -3, z, rnd(0, 3)); } // junks with red sails
    S.spot('rail', 0, 13.4, { r: 1.5 });
    S.shot('harbour', 0, 30, { dy: 30, reach: 400 });
    for (let i = 0; i < 8; i++) S.extra(folk(), rpick([-2.2, 2.2]) + rnd(-0.8, 0.8), -8 + Math.floor(rnd(0, 10)) * 1.6 + 0.4, 0, { anim: 'sit', seated: true });
    S.actor('keung', 1.6, 13.2, Math.PI);
    S.actor('mei98', -1.2, 11.6, 0.4);
  }

  // ================= 1998: Central, Des Voeux Road, the Harbour Daily =================
  function tram(b) {
    const G = 0x2a6a4a, C = 0xf4ecd0;
    b.box(0, 0.3, 0, 2.1, 2.1, 11.5, G); b.box(0, 2.4, 0, 2.1, 1.9, 11.5, G); b.box(0, 4.3, 0, 1.9, 0.18, 11.3, C);
    b.box(0, 1.2, 0, 2.12, 0.9, 10.6, 0x2a3440); b.box(0, 3.1, 0, 2.12, 0.8, 10.8, 0x2a3440);
    b.box(0, 2.15, 0, 2.14, 0.22, 11.5, C);
    b.rod([0, 4.4, -2], [0, 6.2, 2.5], 0.04, 0x2a2a2a, 4);
    for (const z of [-4, 4]) for (const x of [0.75, -0.75]) b.ccyl(x, 0.3, z, 0.3, 0.15, 0x1a1a1a, { rz: Math.PI / 2, seg: 8 });
  }
  function buildCentral(S) {
    S.bounds(-40, -21.4, 40, 6.5);
    S.ground(() => 0);
    const m = S.gb('main'), sh = S.gb('shell'), gl = S.gb('glow');
    sh.box(0, -0.1, -8, 120, 0.1, 40, 0x8a8a84); sh.box(0, -0.05, 0, 120, 0.06, 10, 0x4a4a4c);
    for (const z of [-2.2, -0.8, 0.8, 2.2]) sh.box(0, 0, z, 120, 0.02, 0.08, 0x9a9aa0); // tram rails
    m.rod([-60, 6.2, -1.5], [60, 6.2, -1.5], 0.02, 0x2a2a2a, 3); m.rod([-60, 6.2, 1.5], [60, 6.2, 1.5], 0.02, 0x2a2a2a, 3);
    // tall office towers: Central has no height limit
    for (let x = -60; x < 60; x += rnd(12, 18)) for (const side of [-1, 1]) {
      if (side < 0 && x > -2 && x < 22) continue;
      const w = rnd(10, 16), h = rnd(40, 110);
      block(S, x + w / 2, side * 14, w, 14, h, rpick([0x8a98a8, 0xa8b0b8, 0xc8c0b0, 0x7a8a9a]), { faces: side < 0 ? 's' : 'n', shop: true, wsp: 1.5 });
      S.solidBox(x + w / 2, side * 14, w, 14);
    }
    // the Harbour Daily building, with its newsroom on the ground floor
    block(S, 10, -14, 22, 14, 60, 0xb8b0a0, { faces: 's', y0: 4 });
    sh.box(10, 0, -21.2, 22, 4, 0.4, 0xd8d4c8); sh.box(-0.9, 0, -14, 0.4, 4, 14, 0xd8d4c8); sh.box(20.9, 0, -14, 0.4, 4, 14, 0xd8d4c8);
    S.solidBox(10, -21.6, 22, 1); S.solidBox(-1.2, -14, 1, 14); S.solidBox(21.2, -14, 1, 14);
    sh.box(4.2, 0, -7.6, 10.2, 4, 0.3, 0x5a6a7a); sh.box(16.6, 0, -7.6, 8.6, 4, 0.3, 0x5a6a7a); S.solidBox(4.2, -7.6, 10.2, 0.4); S.solidBox(16.6, -7.6, 8.6, 0.4);
    for (let i = 0; i < 20; i++) for (let j = 0; j < 13; j++) sh.box(0.5 + i, 0.01, -20.5 + j, 1, 0.02, 1, (i + j) % 2 ? 0x6a6a72 : 0x5a5a62);
    sign(S, 10.5, 4.6, -7.4, 0, { zh: '海港日報', en: 'THE HARBOUR DAILY', w: 7, h: 1.4, bg: '#1a1a2a', fg: '#f4f4f0', fg2: '#e8c060' });
    // desks with computers and piles of paper
    for (const [x, z] of [[3, -11], [7, -11], [3, -14.5], [7, -14.5], [11, -11], [11, -14.5]]) {
      m.box(x, 0, z, 2.4, 0.75, 1.2, 0x8a7a6a); S.solidBox(x, z, 2.4, 1.2);
      m.box(x - 0.4, 0.75, z - 0.2, 0.5, 0.45, 0.45, 0xd8d4c8); gl.box(x - 0.4, 0.82, z + 0.03, 0.4, 0.3, 0.02, 0x3a8a6a);
      for (let k = 0; k < 4; k++) m.box(x + 0.6, 0.75 + k * 0.03, z, 0.5, 0.03, 0.7, 0xf4f4f0, { ry: rnd(-0.2, 0.2) });
    }
    m.box(6, 0, -18.6, 3, 0.75, 1.4, 0x6a4a2a); S.solidBox(6, -18.6, 3, 1.4); m.box(6, 0.75, -18.6, 0.6, 0.3, 0.5, 0xf4f4f0);
    sign(S, 6, 2.8, -20.95, 0, { zh: '再見啟德', en: 'FRONT PAGE', w: 3, h: 1, bg: '#f4f4f0', fg: '#1a1a1a', fg2: '#a8221e' });
    // the darkroom in the corner, under its red light
    sh.box(17, 0, -15.8, 7.6, 4, 0.2, 0x3a3a40); S.solidBox(15.6, -15.8, 4.8, 0.3);
    sh.box(17, 0, -15.69, 1.2, 2.2, 0.05, 0x1a1010);
    gl.box(17, 2.5, -15.65, 0.5, 0.3, 0.05, 0xff3a2a);
    const red = new THREE.PointLight(0xff3a2a, 1.0, 6, 1.5); red.position.set(17.5, 2.6, -18.5); S.add(red);
    m.box(18, 0, -19.5, 4, 0.9, 1.2, 0x3a3a40); for (let k = 0; k < 3; k++) m.box(16.6 + k * 1.3, 0.9, -19.5, 1.0, 0.1, 0.8, 0x8a8a8a);
    S.spot('darkroom', 17, -15, { label: 'Go into the darkroom', dy: 1.2, r: 1.2 });
    // the tram stop, and the ding ding itself
    m.box(-20, 0, 0, 14, 0.2, 1.6, 0xb8b8b0); m.box(-20, 2.4, 0, 6, 0.1, 1.4, 0x2a6a4a); for (const x of [-22.8, -17.2]) m.box(x, 0.2, 0, 0.1, 2.2, 0.1, 0x8a8a8a);
    sign(S, -20, 2.0, 0.75, 0, { zh: '電車站', en: 'TRAM STOP', w: 1.6, h: 0.6, bg: '#2a6a4a', fg: '#fff', ds: true });
    const tr = S.obj(tram, -70, 0, -1.5, Math.PI / 2); S.data.tram = tr;
    S.data.tramTo = (x, sec) => new Promise((res) => { const x0 = tr.position.x; let t = 0; AU.ui('ding'); S.tick((dt) => { if (t >= sec) return; t = Math.min(sec, t + dt); tr.position.x = lerp(x0, x, smooth(0, 1, t / sec)); if (t >= sec) res(); }); });
    S.shot('tram', -40, -1.5, { dy: 2.5, reach: 60, when: (S2) => (Math.abs(S2.data.tram.position.x - PL.x) < 40 ? true : 'Wait for a tram!') });
    for (let i = 0; i < 12; i++) { const z = rpick([-6.5, 5.6]), x = rnd(-36, 36); wander(S.extra(folk({ topStyle: rpick(['suit', 'shirt']), tie: RNG() < 0.5 ? 0x2a2a4a : null }), x, z), [[x + rnd(8, 16), z], [x - rnd(8, 16), z]], { speed: rnd(1.1, 1.5) }); }
    for (const [x, z] of [[3, -12], [7, -15.5], [11, -12]]) S.extra(folk({ glasses: RNG() < 0.5 }), x, z, Math.PI, { anim: 'type', seated: true });
    S.actor('leung', 6, -19.6, 0, { anim: 'idle' });
    S.actor('mei98', -18.6, 1.2, -Math.PI / 2);
  }

  // ================= 1998: yum cha at a big restaurant =================
  function buildTeahouse(S) {
    S.bounds(-13.6, -9.6, 13.6, 9.6);
    S.ground(() => 0);
    const m = S.gb('main'), sh = S.gb('shell'), gl = S.gb('glow');
    sh.box(0, -0.05, 0, 28, 0.05, 20, 0x8a2a2a);
    for (const [x, z, w, d] of [[0, -10, 28, 0.3], [0, 10, 28, 0.3], [-14, 0, 0.3, 20], [14, 0, 0.3, 20]]) { sh.box(x, 0, z, w, 4.4, d, 0xe8d8b8); S.solidBox(x, z, w, d); }
    sh.box(0, 4.4, 0, 28, 0.2, 20, 0xe8dcc0);
    for (let x = -12; x <= 12; x += 3) gl.box(x, 0.9, 9.82, 2.2, 2.4, 0.04, 0xd8e8f0); // windows
    // the dragon and the phoenix on the wall, for good luck
    const dp = canvasTex(900, 300, (c, w, h) => {
      c.fillStyle = '#a8221e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8b84a'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
      c.strokeStyle = '#f4c850'; c.lineWidth = 18; c.lineCap = 'round';
      c.beginPath(); c.moveTo(60, 200); c.bezierCurveTo(140, 60, 220, 260, 300, 120); c.bezierCurveTo(340, 60, 380, 120, 400, 90); c.stroke();
      c.fillStyle = '#f4c850'; c.beginPath(); c.arc(410, 90, 26, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(840, 200); c.bezierCurveTo(760, 120, 700, 220, 600, 120); c.stroke();
      for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(840, 200); c.quadraticCurveTo(880, 120 + k * 25, 860 - k * 10, 60 + k * 30); c.stroke(); }
      c.beginPath(); c.arc(590, 112, 22, 0, TAU); c.fill();
      c.font = `700 120px ${CJK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('龍鳳', w / 2, h / 2 + 40);
    });
    const dpp = texPlane(dp, 9, 3); dpp.position.set(-2, 2.5, -9.83); S.add(dpp);
    for (let x = -10; x <= 10; x += 5) for (const z of [-5, 3]) { gl.ball(x, 3.9, z, 0.35, 0xfff0c8, { det: 1 }); m.rod([x, 4.3, z], [x, 4.4, z], 0.02, 0xc8a040); }
    // round tables
    const TABLES = [[-6, 4], [-10, -5], [-2, -5], [-10, 4], [2, 4], [6, -1], [-6, -1]];
    for (const [x, z] of TABLES) {
      m.cyl(x, 0.72, z, 1.1, 0.04, 0xf4f4f0, { seg: 16 }); m.cyl(x, 0, z, 0.15, 0.72, 0x6a4a2a, { seg: 8 }); m.cyl(x, 0.76, z, 0.45, 0.04, 0xd8d0c0, { seg: 14 });
      S.solidCircle(x, z, 1.15);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; m.box(x + Math.cos(a) * 1.4, 0, z + Math.sin(a) * 1.4, 0.45, 0.48, 0.45, 0xb8301e); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4; m.cyl(x + Math.cos(a) * 0.75, 0.76, z + Math.sin(a) * 0.75, 0.05, 0.06, 0xf4f4f0, { seg: 8 }); }
      m.ball(x + 0.2, 0.86, z - 0.2, 0.1, 0xd8d8d0, { sy: 0.8 }); // the teapot
    }
    for (const [x, z] of TABLES.slice(1)) for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.6; S.extra(folk(), x + Math.cos(a) * 1.45, z + Math.sin(a) * 1.45, Math.atan2(-Math.cos(a), -Math.sin(a)), { anim: 'sit', seated: true }); }
    S.spot('table', -6, 4, { label: 'Put the basket on our table', dy: 0.8, r: 1.8, reach: 3.2, onDrop: (it) => { const n = (S.data.served = (S.data.served || 0) + 1); it.obj.position.set(-6.3 + n * 0.3, 0.76, 4 - 0.25 + (n % 2) * 0.4); } });
    // the trolleys, pushed round by the aunties, with steamer baskets on top
    const loops = [[[-12, 0.5], [9, 0.5], [9, -8], [-12, -8]], [[10, 7.5], [-12, 7.5], [-12, 1.5], [10, 1.5]], [[4, -7.5], [12, -7.5], [12, 7.8], [4, 7.8]]];
    const goods = [['hargow', 'a basket of har gow (shrimp dumplings)', 0xf4ecd8], ['siumai', 'a basket of siu mai (pork dumplings)', 0xe8b860], ['bao', 'a basket of char siu bao (roast pork buns)', 0xf8f4f0]];
    S.data.carts = loops.map((pts, i) => {
      const aunt = S.extra(folk({ hairStyle: 'bun', top: 0xf4f4f0, apron: 0xc8302a, bottom: 0x2a2a3a }), pts[0][0], pts[0][1]); aunt.speed = 0.8; aunt.solid = false;
      const cart = S.obj((b) => { b.box(0, 0.2, 0, 0.8, 0.7, 1.1, 0xc8ccd0); b.box(0, 0.9, 0, 0.84, 0.05, 1.14, 0xb8bcc0); for (const [x, z] of [[0.3, 0.4], [-0.3, 0.4], [0.3, -0.4], [-0.3, -0.4]]) b.ccyl(x, 0.08, z, 0.08, 0.05, 0x2a2a2a, { rz: Math.PI / 2, seg: 6 }); for (let k = 0; k < 3; k++) b.cyl(0.18 - (k % 2) * 0.36, 0.95, -0.3 + k * 0.3, 0.17, 0.12, 0xc8a060, { seg: 10 }); });
      const [id, label, col] = goods[i];
      const basket = new THREE.Group(); const bgb = new GB(); bgb.cyl(0, 0, 0, 0.17, 0.12, 0xc8a060, { seg: 10 }); bgb.cyl(0, 0.12, 0, 0.17, 0.02, 0xb89050, { seg: 10 }); for (let k = 0; k < 3; k++) bgb.ball(-0.07 + k * 0.07, 0.08, 0, 0.05, col, { det: 0 });
      basket.add(bgb.mesh(R.mat.vc)); basket.position.set(0, 1.07, 0.32); cart.add(basket);
      S.item(id, basket, { label });
      wander(aunt, pts.slice(1).concat([pts[0]]));
      S.tick(() => { const a = aunt, dx = Math.sin(a.yaw), dz = Math.cos(a.yaw); cart.position.set(a.x + dx * 0.9, 0, a.z + dz * 0.9); cart.rotation.y = a.yaw; });
      return { aunt, cart };
    });
    S.shot('dimsum', 0, 0, { dy: 1.0, reach: 4 });
    S.tick(() => { const s = S.spots['shot:dimsum'], c = S.data.carts[0].cart; s.x = c.position.x; s.z = c.position.z; });
    // the mahjong room behind a screen in the corner
    sh.box(8, 0, -4, 0.2, 2.6, 0.1, 0xd8c8a8);
    for (const [x, z, w, d] of [[11, -3.6, 6, 0.2], [8, -7.6, 0.2, 4]]) { m.box(x, 0, z, w, 2.6, d, 0x8a5a3a); S.solidBox(x, z, w, d); }
    m.box(11, 0, -7, 1.6, 0.75, 1.6, 0x6a4a2a); m.box(11, 0.75, -7, 1.7, 0.04, 1.7, 0x2a7a4a); S.solidBox(11, -7, 1.7, 1.7);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 8; i++) { const a = k * Math.PI / 2; m.box(11 + Math.cos(a) * 0.62 + Math.sin(a) * (i - 3.5) * 0.12, 0.79, -7 + Math.sin(a) * 0.62 - Math.cos(a) * (i - 3.5) * 0.12, 0.1, 0.14, 0.06, 0xf4eedc, { ry: -a }); }
    for (const [x, z, y] of [[12.2, -7, -Math.PI / 2], [11, -8.2, 0], [9.8, -7, Math.PI / 2]]) S.extra(folk({ hairStyle: rpick(['bun', 'curly', 'short']), hair: rpick([0x9a9a98, 0x3a2a20]), h: 1.58 }), x, z, y, { anim: 'sit', seated: true });
    S.spot('mjtable', 11, -5.6, { label: 'Sit down at the mahjong table', dy: 0.8, r: 1.2 });
    S.actor('lau98', -6, 5.45, Math.PI, { anim: 'sit', seated: true });
    S.actor('ming98', -7.4, 4.0, Math.PI / 2, { anim: 'sit', seated: true });
    S.actor('mei98', -4.6, 4.0, -Math.PI / 2, { anim: 'sit', seated: true });
  }

  // ================= 1998: a rooftop in Kowloon City on Kai Tak's last night =================
  function buildRoof98(S) {
    S.bounds(-11.5, -8.5, 11.5, 8.5);
    S.ground(() => 0);
    const m = S.gb('main'), sh = S.gb('shell'), gl = S.gb('glow');
    sh.box(0, -24, 0, 24, 24, 18, 0x8a867c);
    for (const [x, z, w, d] of [[0, -9, 24, 0.3], [0, 9, 24, 0.3], [-12, 0, 0.3, 18], [12, 0, 0.3, 18]]) m.box(x, 0, z, w, 1.05, d, 0x7a766e);
    // the street below and the blocks all around, windows lit, neon signs glowing
    sh.box(0, -24.1, -14, 300, 0.1, 10, 0x2a2a2c);
    // across the street to the north: tall blocks, some with big neon boards on their roofs
    const tops = [];
    for (let x = -80; x < 80; x += rnd(9, 13)) { const w = rnd(8, 12), h = rnd(18, 30); block(S, x + w / 2, -26, w, 14, h, rpick(CONC), { y0: -24, faces: 's', night: true }); tops.push([x + w / 2, h - 24, w]); }
    // to the west and south, more blocks; to the south-east they stay low, so you can see all the way to Kai Tak
    for (let x = -80; x < 80; x += rnd(9, 13)) { const w = rnd(8, 12); if (x > -2) { block(S, x + w / 2, 26, w, 14, rnd(8, 14), rpick(CONC), { y0: -24, faces: 'n', night: true }); continue; } block(S, x + w / 2, 26, w, 14, rnd(18, 30), rpick(CONC), { y0: -24, faces: 'n', night: true }); }
    for (let x = -80; x < 0; x += rnd(9, 13)) { if (Math.abs(x) < 16) continue; const w = rnd(8, 12); block(S, x + w / 2, 0, w, 16, rnd(18, 26), rpick(CONC), { y0: -24, faces: 'ns', night: true }); }
    for (let i = 0; i < 40; i++) { const x = rnd(20, 160), z = rnd(10, 140); if (Math.abs(x - z) < 30 && x > 60) continue; block(S, x, z, rnd(8, 14), rnd(8, 14), rnd(6, 14), rpick(CONC), { y0: -24, faces: 'nw', night: true, roof: false }); }
    const neon = ['#ff3a5a', '#3affd8', '#ffd23a', '#ff6ac8', '#6ab8ff', '#7aff6a'];
    const nz = ['酒家', '夜總會', '海鮮', '金行', '涼茶', '冰室', '麻雀', '時鐘', '燒鵝', '泰國菜'];
    for (let i = 0; i < 16; i++) { const x = rnd(-50, 50); if (Math.abs(x - 8) < 6) continue; sign(S, x, rnd(-16, -4), -18.9, 0, { zh: rpick(nz), w: rnd(4, 7), h: rnd(1.4, 2.2), neon: rpick(neon) }); }
    for (let i = 0; i < 6; i++) { const x = rnd(-60, -14); sign(S, x, rnd(-14, -6), 18.9, Math.PI, { zh: rpick(nz), w: rnd(4, 7), h: rnd(1.4, 2.2), neon: rpick(neon) }); }
    for (let i = 0; i < 12; i++) sign(S, rnd(-40, 40), rnd(-14, -5), rnd(-17, -11), Math.PI / 2, { zh: rpick(nz), vert: true, w: 1.3, h: rnd(3, 4.5), neon: rpick(neon), ds: true });
    for (const [x, top, w] of tops) { if (RNG() < 0.45 || Math.abs(x) > 50) continue; m.box(x, top, -24, 0.2, 2.4, 0.2, 0x3a3a3a); m.box(x - w * 0.3, top, -24, 0.2, 2.4, 0.2, 0x3a3a3a); const [zh, en] = rpick([['酒家', 'RESTAURANT'], ['夜總會', 'NIGHT CLUB'], ['電器', 'ELECTRICAL'], ['手錶', 'WATCHES'], ['金行', 'GOLD']]); sign(S, x - w * 0.15, top + 3.2, -23.8, 0, { zh, en, w: w * 0.8, h: 2.6, neon: rpick(neon) }); }
    // Lam Kee's new sign across the street: Master Fung's teacup, lit at last
    S.obj(() => {}, 8, -6, -18.8, 0, { cast: false, glow: (gg) => { for (let i = 0; i < TEACUP.length - 1; i++) { const a = TEACUP[i], c = TEACUP[i + 1]; gg.rod([(a[0] - 280) / 55, (240 - a[1]) / 55, 0], [(c[0] - 280) / 55, (240 - c[1]) / 55, 0], 0.12, 0xff4a3a, 6); } for (let k = 0; k < 3; k++) gg.rod([-2 + k * 2, 3.2, 0], [-1.6 + k * 2, 5.0, 0], 0.09, 0xffd0c0, 4); } });
    sign(S, 8, -11.5, -18.9, 0, { zh: '林記冰室', w: 7, h: 1.8, neon: '#3affd8' });
    const glowL = new THREE.PointLight(0xff5a6a, 0.8, 30, 1.5); glowL.position.set(0, -6, -14); S.add(glowL);
    // the roof itself: tiles, a drain, pots of plants, folding chairs
    for (let x = -11; x < 12; x += 1.5) sh.box(x, 0.005, 0, 0.04, 0.01, 18, 0x4a4a52);
    for (let z = -8.5; z < 9; z += 1.5) sh.box(0, 0.005, z, 24, 0.01, 0.04, 0x4a4a52);
    for (const [x, z] of [[10, -7.5], [-10, 7.5], [10.5, 1], [-3, 7.8], [6, 7.8]]) { m.cyl(x, 0, z, 0.3, 0.4, 0x8a4a2a, { seg: 8 }); m.ball(x, 0.75, z, 0.45, 0x2a5a2a, { det: 0 }); }
    for (const [x, z] of [[4.6, -6.8], [-0.6, -7]]) { m.box(x, 0.42, z, 0.5, 0.05, 0.5, 0x8a8a90); m.box(x, 0.45, z + 0.24, 0.5, 0.5, 0.05, 0x8a8a90); for (const dx of [-0.22, 0.22]) m.rod([x + dx, 0, z - 0.2], [x + dx, 0.42, z + 0.2], 0.02, 0x5a5a60, 4); }
    // far off to the south-east: Kai Tak, its runway lights running out into the harbour
    // (its own material, without fog, so the lights shine through the haze)
    const rg = new GB();
    for (let k = 0; k < 70; k++) { const t = k * 5; for (const s of [-1, 1]) rg.box(90 + t * 0.707 + s * 16, -23.2, 90 + t * 0.707 - s * 16, 1.4, 0.6, 1.4, k % 10 < 2 ? 0xff4a3a : 0xfff4d0); }
    for (let k = 0; k < 24; k++) { rg.box(60 + k * 1.3, -23 + k * 0.1, 60 + k * 1.3, 1.6, 0.6, 1.6, 0xffd23a); }
    const runway = new THREE.Mesh(rg.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); S.add(runway);
    const tg = new GB();
    for (let k = 0; k < 40; k++) tg.box(250 + rnd(-40, 40), -22 + rnd(0, 10), 120 + rnd(-30, 30), 4, 1.6, 0.4, 0xf4e8c8);
    tg.box(230, -24, 150, 3, 30, 3, 0x9aa0a8); tg.box(230, 6, 150, 7, 4, 7, 0x8ad8ff);
    const term = new THREE.Mesh(tg.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); S.add(term);
    S.data.runway = runway;
    S.add(terrainMesh(-700, -900, 700, -250, 40, (x, z) => hills(x, z * 0.8 - 80) * 1.2, () => 0x10141a));
    // the neighbours' TV on a table, and plastic stools
    m.box(-6.5, 0, 3.5, 1.4, 0.75, 0.8, 0x8a6a4a); m.box(-6.5, 0.75, 3.4, 0.9, 0.7, 0.6, 0x2a2a2a);
    const tvTex = canvasTex(256, 192, (c, w, h) => { c.fillStyle = '#1a2a4a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 26px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('KAI TAK', w / 2, 80); c.fillText('LIVE', w / 2, 120); });
    const tv = texPlane(tvTex, 0.72, 0.54); tv.position.set(-6.5, 1.1, 3.71); S.add(tv);
    S.data.tv = (draw) => { const c = tvTex.userData.ctx; draw(c, 256, 192); tvTex.needsUpdate = true; };
    S.spot('tv', -6.5, 4.6, { r: 1.6, dy: 1.1 });
    for (const [x, z] of [[-7.6, 5.2], [-6.2, 5.6], [-5, 5.1], [-8.4, 4.4]]) m.cyl(x, 0, z, 0.2, 0.42, rpick([0xd8302a, 0x2a6ac8, 0xf4d84a]), { seg: 8 });
    for (const [x, z] of [[-6.2, 5.6], [-5, 5.1], [-8.4, 4.4]]) S.extra(folk(), x, z, Math.PI, { anim: 'sit', seated: true, y: 0 });
    // Mei's camera on its tripod at the edge, water tanks, more aerials
    m.rod([1.2, 0, -7.6], [1.5, 1.3, -7.8], 0.02, 0x2a2a2a); m.rod([1.8, 0, -7.6], [1.5, 1.3, -7.8], 0.02, 0x2a2a2a); m.rod([1.5, 0, -8.2], [1.5, 1.3, -7.8], 0.02, 0x2a2a2a); m.box(1.5, 1.3, -7.8, 0.25, 0.18, 0.15, 0x1a1a1a);
    for (const [x, z] of [[9, 5.5], [-9, -5.5]]) { m.cyl(x, 0, z, 1.0, 2.0, 0x4a5a6a, { seg: 12 }); S.solidCircle(x, z, 1.1); }
    for (let i = 0; i < 14; i++) { const x = rnd(-11, 11), z = rnd(-8, 8); if (Math.hypot(x + 6.5, z - 4) < 3) continue; m.rod([x, 0, z], [x, rnd(2.5, 4), z], 0.03, 0x4a4a4a, 4); }
    S.shot('neon', 0, -19, { dy: -12, reach: 30 });
    // planes with their lights on, landing and taking off; the trucks of the overnight move below
    planes(S, { night: true, auto: false, path: { a: [-240, 75, -240], b: [200, -21, 200] } });
    S.spot('planecam', 1e5, 0, { label: 'Take a photo of the plane', dy: 1, reach: 400, r: 0.1 });
    S.shot('lastplane', 0, 0, { dy: 30, reach: 400, when: (S2) => (S2.data.plane() ? true : 'Wait for a plane!') });
    S.data.convoy = () => {
      const trucks = [];
      for (let i = 0; i < 9; i++) trucks.push(S.obj((b) => { b.box(0, 0, 0, 2.4, 3, 7, rpick([0xf4f4f0, 0x2a4a8a, 0xd8d8d0])); b.box(0, 0, 4.2, 2.4, 2.4, 1.8, 0x3a3a3a); }, -120 - i * 14, -24, -14, Math.PI / 2, { glow: (gg) => { gg.box(0.8, 0.6, 5.12, 0.4, 0.3, 0.05, 0xfff8d0); gg.box(-0.8, 0.6, 5.12, 0.4, 0.3, 0.05, 0xfff8d0); } }));
      S.tick((dt) => { for (const t of trucks) { t.position.x += dt * 9; if (t.position.x > 140) t.position.x -= 260; } });
    };
    S.actor('ko', 3.6, -7.2, Math.PI, { anim: 'point' });
    S.actor('mei98', 1.5, -6.6, Math.PI);
    S.actor('lau98', -5.2, 5.1, Math.PI, { anim: 'sit', seated: true, y: 0 });
    S.actor('ming98', -3.4, -6.8, Math.PI);
  }

  // ================= drawings for the reused minigames =================
  // rhythm: a lion dance in front of the new Thai restaurant, to drum and cymbals
  function lionScene(c, g, k) {
    D.sky(c, '#8ab8d8', '#f0e8d8', 340);
    c.fillStyle = '#c8b8a0'; c.fillRect(0, 0, 960, 200); c.fillStyle = '#2a4a9a'; c.fillRect(260, 40, 440, 70);
    D.text(c, '泰國菜館', 480, 92, { size: 44, align: 'center', color: '#ffe08a', font: CJK });
    c.fillStyle = '#9a968c'; c.fillRect(0, 300, 960, 40); c.fillStyle = '#b8b0a0'; c.fillRect(0, 200, 960, 100);
    for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#d8302a' : '#f4d84a'; c.beginPath(); c.arc(280 + i * 50, 120, 12, 0, TAU); c.fill(); }
    // the lettuce and a red packet hanging over the door, for the lion to "eat"
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(640, 110); c.lineTo(640, 170 + (k > 0.9 ? -40 : 0)); c.stroke();
    if (k < 0.95) { c.fillStyle = '#5ab83a'; c.beginPath(); c.arc(640, 180, 18, 0, TAU); c.fill(); c.fillStyle = '#d8302a'; c.fillRect(632, 196, 16, 22); }
    // the lion: a big head with eyes that blink, a long body over two dancers' legs
    const lx = 200 + k * 380, hop = Math.abs(Math.sin(g.t * 5)) * (12 + g.act[0] * 20), rear = g.act[1] * 40;
    c.fillStyle = '#d8a03a'; D.rr(c, lx - 170, 230 - hop * 0.5, 180, 70, 30); c.fill();
    for (let i = 0; i < 5; i++) { c.fillStyle = '#f4f4f0'; c.fillRect(lx - 160 + i * 34, 236 - hop * 0.5, 14, 60); }
    for (const x of [lx - 140, lx - 100, lx - 30, lx + 10]) { c.fillStyle = '#d8302a'; c.fillRect(x, 290, 16, 40); c.fillStyle = '#1a1a1a'; c.fillRect(x - 2, 326, 22, 8); }
    c.save(); c.translate(lx + 40, 220 - hop - rear); c.rotate(-g.act[1] * 0.3);
    c.fillStyle = '#d83a2a'; D.rr(c, -60, -60, 120, 110, 40); c.fill(); c.fillStyle = '#f4d84a'; c.fillRect(-60, -64, 120, 18);
    const blink = Math.sin(g.t * 3) > 0.9 ? 0.2 : 1;
    for (const s of [-1, 1]) { c.fillStyle = '#f4f4f0'; c.beginPath(); c.ellipse(s * 24, -18, 16, 16 * blink, 0, 0, TAU); c.fill(); c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(s * 24, -18, 6 * blink, 0, TAU); c.fill(); }
    c.fillStyle = '#f4f4f0'; c.fillRect(-40, 24, 80, 14); c.fillStyle = '#5a1a1a'; c.fillRect(-36, 38, 72, 10 + g.act[0] * 10);
    c.fillStyle = '#f4d84a'; c.beginPath(); c.arc(0, -66, 12, 0, TAU); c.fill();
    c.restore();
    // the drummer and the cymbal player
    D.person(c, 800, 330, 100, '#c8302a', '#e8c8a0', { arms: -0.6 - g.act[0], hair: '#1a1a1a' });
    c.fillStyle = '#c8302a'; c.beginPath(); c.ellipse(760, 280, 40, 24, 0, 0, TAU); c.fill(); c.fillStyle = '#f4e8c8'; c.beginPath(); c.ellipse(760, 268, 40, 14, 0, 0, TAU); c.fill();
    D.person(c, 900, 330, 96, '#1a1a1a', '#e8c8a0', { arms: -1.2 + g.act[1] * 0.8, hair: '#1a1a1a' });
    c.fillStyle = '#e8c050'; c.beginPath(); c.ellipse(925, 240 + g.act[1] * 8, 22, 6, 0.3, 0, TAU); c.fill();
  }
  // rhythm: the Star Ferry coming alongside the pier, the deckhand's hook catching the rope
  function ferryScene(c, g, k) {
    D.sky(c, '#9ac0d8', '#e0e8ea', 340);
    for (let i = 0; i < 12; i++) { c.fillStyle = ['#8a98a8', '#a8b0b8', '#c8c8c0'][i % 3]; const h = 60 + (i * 37) % 90; c.fillRect(i * 85, 180 - h, 70, h); }
    c.fillStyle = '#3a6a7a'; c.fillRect(0, 230, 960, 110);
    c.fillStyle = '#e8e0d0'; c.fillRect(620, 150, 340, 120); c.fillStyle = '#2a6a4a'; c.fillRect(620, 140, 340, 16);
    D.text(c, '天星碼頭  STAR FERRY', 790, 196, { size: 22, align: 'center', color: '#2a6a4a', font: CJK });
    for (let i = 0; i < 5; i++) { c.fillStyle = '#6a4a2a'; c.fillRect(630 + i * 66, 250, 14, 60); }
    // the ferry slides in as you go
    const fx = -200 + k * 360;
    c.fillStyle = '#2a6a4a'; c.fillRect(fx, 240, 520, 50); c.fillStyle = '#f4f4f0'; c.fillRect(fx, 196, 520, 44); c.fillStyle = '#2a6a4a'; c.fillRect(fx + 30, 150, 460, 12);
    for (let i = 0; i < 9; i++) { c.fillStyle = '#2a3440'; c.fillRect(fx + 40 + i * 52, 206, 34, 22); }
    for (let x = -40; x < 960; x += 60) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + (g.t * 30) % 60, 300); c.lineTo(x + 30 + (g.t * 30) % 60, 300); c.stroke(); }
    // the deckhand with his hook pole, and the rope
    const dx = fx + 480;
    D.person(c, dx, 240, 90, '#1a2a5a', '#e8c4a0', { arms: -1.0 - g.act[0] * 0.8, lean: -g.act[1] * 0.3, hair: '#1a1a1a' });
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 5; c.beginPath(); c.moveTo(dx + 10, 170); c.lineTo(dx + 70 + g.act[0] * 40, 120 - g.act[0] * 20); c.stroke();
    c.strokeStyle = '#d8c890'; c.lineWidth = 4; c.beginPath(); c.moveTo(dx, 200); c.quadraticCurveTo((dx + 650) / 2, 260 - k * 60, 650, 250); c.stroke();
  }
  // pour: batter into an egg waffle iron, filling its bubbles
  function waffleScene(c, g) {
    c.fillStyle = '#2a2a2e'; c.fillRect(0, 60, 960, 480);
    const lv = clamp(g.level, 0, 1.05), x0 = 300, y0 = 150, W = 360, H = 260;
    D.rr(c, x0 - 20, y0 - 20, W + 40, H + 40, 20); c.fillStyle = '#4a4a4e'; c.fill();
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) {
      const cx = x0 + 30 + i * 60, cy = y0 + 30 + j * 50, f = clamp(lv * 1.15 - (4 - j) * 0.06 - (i % 2) * 0.03, 0, 1);
      c.fillStyle = '#1a1a1e'; c.beginPath(); c.arc(cx, cy, 22, 0, TAU); c.fill();
      if (f > 0) { c.fillStyle = mixCss('#f4e0a0', '#e8b050', g.state2 === 'good' ? 1 : 0); c.beginPath(); c.arc(cx, cy, 22 * Math.sqrt(f), 0, TAU); c.fill(); }
    }
    if (lv > 1) { c.fillStyle = 'rgba(244,224,160,.85)'; D.rr(c, x0 - 30, y0 + H + 10, W + 60, 30, 10); c.fill(); }
    // the gauge: how full the bubbles are, and the gold band
    const gx = 720, gy = 150, gh = 260;
    c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(gx, gy, 30, gh);
    c.fillStyle = 'rgba(255,210,90,.3)'; c.fillRect(gx - 6, gy + gh * (1 - g.band[1]), 42, gh * (g.band[1] - g.band[0]));
    c.fillStyle = '#f4e0a0'; c.fillRect(gx, gy + gh * (1 - Math.min(1, lv)), 30, gh * Math.min(1, lv));
    // the jug
    const tilt = g.state2 === 'pour' ? 1.0 : 0.3;
    c.save(); c.translate(560, 90); c.rotate(-tilt); c.fillStyle = '#d8dcdc'; D.rr(c, -30, -50, 60, 80, 10); c.fill(); c.fillStyle = '#f4e0a0'; c.fillRect(-26, -40, 52, 12); c.restore();
    if (g.state2 === 'pour') { c.strokeStyle = '#f4e0a0'; c.lineWidth = 8; c.beginPath(); c.moveTo(530, 110); c.lineTo(480, y0 + 40); c.stroke(); }
    D.text(c, 'Fill the bubbles to the gold band', 480, 520, { size: 20, align: 'center', color: '#f4e4c4' });
  }

  // ================= the story =================
  const L = (o) => Object.assign({ skin: SKIN.light, hair: 0x1a1410, shoes: 0x2a2a2a, h: 1.7 }, o);
  Scenarios.add({
    id: 'kowloon', title: 'The Walled City and Kai Tak', place: 'Kowloon City, Hong Kong', when: '1990 and 1998', year: 1990, color: 0xc8302a,
    blurb: 'Deliver letters through the dark lanes of the Kowloon Walled City, then come back eight years later for Kai Tak airport\'s last day. Pull milk tea, ride a minibus and the Star Ferry, bend neon, play mahjong and fly the famous checkerboard turn.',
    role: "You're a newspaper photographer's helper, with a camera of your own.",
    homeLine: 'Two trips in one! The Walled City and Kai Tak. Did you bring me a photo?',
    souvenir: { name: 'a photo of a jumbo jet over the rooftops', text: 'Mei Chan\'s print of a plane roaring over the TV aerials of the Kowloon Walled City, 1990. A sight nobody will see again.', build(b) { b.box(0, 0, 0, 0.36, 0.26, 0.03, 0x3a2a1a); b.box(0, 0.02, 0.016, 0.32, 0.22, 0.01, 0xf4f4f0); b.box(0, 0.04, 0.022, 0.28, 0.14, 0.01, 0x8ab0d0); b.box(0, 0.03, 0.026, 0.28, 0.04, 0.01, 0x6a6a6a); b.box(0.02, 0.13, 0.027, 0.12, 0.02, 0.01, 0xf4f4f0); b.box(0.02, 0.13, 0.028, 0.02, 0.06, 0.01, 0xf4f4f0); b.box(0, -0.05, -0.08, 0.05, 0.1, 0.16, 0x3a2a1a, { rx: 0.4 }); } },
    note: 'Mei Chan, the Harbour Daily, Grandma Lau and Ming, Captain Ko and the shopkeepers are made up. Richard Siegel was real, and the places, the last flights and their times are as they happened. The Walled City was cleared of its people in 1991 and 1992 and knocked down in 1993 and 1994.',
    extraSpeakers: [],
    cast: {
      // ---- 1990 ----
      mei: { name: 'Mei Chan', title: 'photographer, the Harbour Daily', voice: { pitch: 1.15, rate: 1.05 },
        look: L({ hairStyle: 'long', top: 0x6a7a5a, topStyle: 'jacket', shirt: 0xf4f0e0, bottom: 0x3a3a48, h: 1.62 }),
        lines: ['I\'ve been photographing the City for months. Every week someone else moves out.', { t: 'Two other photographers, *Greg Girard* and *Ian Lambot*, have spent years taking pictures in here. They\'re making a book called City of Darkness.', fact: 'photographers' }, 'Take a photo whenever you see something on my list. Press *J* to see what you\'ve got.'] },
      wong: { name: 'Dr Wong', title: 'dentist', voice: { pitch: 0.9 },
        look: L({ hairStyle: 'balding', hair: 0x2a2a2a, top: 0xf4f4f0, topStyle: 'jacket', shirt: 0xd8e8f4, glasses: true, bottom: 0x3a3a3a, h: 1.68 }),
        lines: ['Open wide! Ha, only joking.', 'My grandfather pulled teeth too. With pliers, in the street!'] },
      tsang: { name: 'Uncle Tsang', title: 'postman', voice: { pitch: 0.85 },
        look: L({ hairStyle: 'short', hair: 0x4a4a48, top: 0x2a5a3a, topStyle: 'shirt', bottom: 0x2a3a2a, hat: 'cap', hatCol: 0x2a5a3a, h: 1.66 }),
        lines: ['Twenty years I\'ve walked these lanes. I could do it with my eyes shut. Some days it feels like I do!', 'Mind the drips. And the stairs. And the dogs.'] },
      ho: { name: 'Mr Ho', title: 'fish ball maker', voice: { pitch: 0.95, rate: 1.1 },
        look: L({ hairStyle: 'short', top: 0xf4f4f0, topStyle: 'shirt', shortSleeves: true, apron: 0xe8e8e0, bottom: 0x3a3a48, w: 1.1 }),
        lines: ['Fish, a little flour, salt, and a lot of beating. That\'s a good fish ball: bouncy!', 'We start at four in the morning. The noodle shop next door starts at three!'] },
      lau: { name: 'Grandma Lau', title: 'lives in the Walled City', voice: { pitch: 1.2, rate: 0.92 },
        look: L({ hair: 0x8a8a88, hairStyle: 'bun', top: 0x5a7a9a, topStyle: 'shirt', bottom: 0x2a2a3a, h: 1.52 }),
        lines: ['When I came here as a young bride, the lanes were full of chickens!', 'Ming is always on the roof. That boy would live up there if I let him.'] },
      ming: { name: 'Ming', title: 'Grandma Lau\'s grandson, aged 9', voice: { pitch: 1.45, rate: 1.1 },
        look: L({ kid: true, h: 1.28, top: 0xf4d84a, topStyle: 'shirt', shortSleeves: true, bottom: 0x3a5a8a }),
        lines: ['I can tell which airline it is from the tail! Red ones, green ones, blue ones...', 'Grandma says we\'re moving to a flat with a window. A whole window!'] },
      clio: { name: 'Aunt Clio', title: 'on the time radio', radio: true, voice: { pitch: 1.15, rate: 1.02 } },
      // ---- 1998 ----
      mei98: { name: 'Mei Chan', title: 'photographer, the Harbour Daily', voice: { pitch: 1.12, rate: 1.05 },
        look: L({ hairStyle: 'bun', top: 0x4a5a6a, topStyle: 'shirt', vest: 0x8a7a5a, glasses: 0x3a3a3a, bottom: 0x3a3a48, h: 1.62 }),
        lines: ['Eight years! The Walled City is a garden now. Strange, isn\'t it?', { t: 'Last September Hong Kong got the *Octopus card*. Tap it on the MTR and the buses. Most minibuses still want coins, though!', fact: 'octopus' }, 'Don\'t forget my shot list. Press *J* to see it.'] },
      ming98: { name: 'Ming', title: 'works at Lam Kee, aged 17', voice: { pitch: 1.0, rate: 1.1 },
        look: L({ hairStyle: 'flat', top: 0xf4f4f0, topStyle: 'shirt', shortSleeves: true, apron: 0x3a6a5a, bottom: 0x2a2a3a, h: 1.72 }),
        lines: ['I still look up every time a plane goes over. Tomorrow there won\'t be any. Weird.', 'Yuenyeung is half coffee, half milk tea. Sounds strange, tastes great!'] },
      lam: { name: 'Mr Lam', title: 'owner of Lam Kee cha chaan teng', voice: { pitch: 0.85 },
        look: L({ hairStyle: 'balding', hair: 0x6a6a68, top: 0xf4f4f0, topStyle: 'vest', bottom: 0x3a3a3a, w: 1.15, h: 1.66 }),
        lines: ['Forty years of milk tea on this street. Planes or no planes, people need breakfast!', 'When a jumbo goes over, everyone stops talking. Then they all carry on, mid-sentence.'] },
      lau98: { name: 'Grandma Lau', title: 'used to live in the Walled City', voice: { pitch: 1.22, rate: 0.9 },
        look: L({ hair: 0xc8c8c4, hairStyle: 'bun', top: 0x9a5a7a, topStyle: 'shirt', bottom: 0x2a2a3a, glasses: 0x6a4a2a, h: 1.5 }),
        lines: ['Our new flat is in a tall estate, with a lift! I still miss my old neighbours.', 'Have some more tea. Tap, tap, that\'s it.'] },
      fung: { name: 'Master Fung', title: 'neon sign maker', voice: { pitch: 0.8, rate: 0.95 },
        look: L({ hair: 0x9a9a98, hairStyle: 'short', top: 0x5a5a6a, topStyle: 'shirt', apron: 0x6a5a4a, glasses: true, bottom: 0x3a3a3a, h: 1.68 }),
        lines: ['Forty years I\'ve bent glass. Some of my signs are bigger than a bus!', 'Hong Kong at night is my gallery. Look up and you see my work everywhere.'] },
      chow: { name: 'Mrs Chow', title: 'baker', voice: { pitch: 1.2 },
        look: L({ hairStyle: 'bun', top: 0xf4b8c8, topStyle: 'shirt', apron: 0xf4f4f0, bottom: 0x3a3a48, h: 1.58 }),
        lines: ['Egg tarts at eleven, pineapple buns all day!', 'The planes make the windows rattle, but my buns still rise.'] },
      yip: { name: 'Mr Yip', title: 'barber', voice: { pitch: 0.95 },
        look: L({ hairStyle: 'flat', top: 0xf4f4f0, topStyle: 'jacket', shirt: 0xf4f4f0, bottom: 0x2a2a3a, h: 1.7 }),
        lines: ['Short back and sides? No? Come back when you need a trim!'] },
      cheung: { name: 'Mr Cheung', title: 'hardware shop', voice: { pitch: 0.9 },
        look: L({ hairStyle: 'short', top: 0x4a6a9a, topStyle: 'shirt', glasses: true, bottom: 0x3a3a3a, h: 1.72 }),
        lines: ['Tape, torches, rope: everyone buys them when a typhoon is coming.'] },
      kwok: { name: 'Mr Kwok', title: 'sign painter', voice: { pitch: 0.9, rate: 0.95 },
        look: L({ hairStyle: 'balding', hair: 0x8a8a88, top: 0xe8d8b0, topStyle: 'shirt', apron: 0x8a2a2a, bottom: 0x3a3a3a, h: 1.66 }),
        lines: ['A good sign must be read from across the street, in the rain, by a man in a hurry!'] },
      kam: { name: 'Auntie Kam', title: 'egg waffle stall', voice: { pitch: 1.15, rate: 1.1 },
        look: L({ hairStyle: 'curly', hair: 0x3a2a20, top: 0xf4d84a, topStyle: 'shirt', apron: 0xf4f4f0, bottom: 0x2a3a5a, h: 1.56 }),
        lines: ['Crispy outside, soft inside. That\'s a gai daan jai!'] },
      malee: { name: 'Khun Malee', title: 'Thai restaurant owner', voice: { pitch: 1.15 },
        look: L({ skin: SKIN.tan, hairStyle: 'long', top: 0xd8a03a, topStyle: 'shirt', bottom: 0x6a2a6a, bottomStyle: 'dress', h: 1.6 }),
        lines: [{ t: 'So many Thai families live and work around here that people call Kowloon City *Little Thailand*.', fact: 'thai' }, 'Try the mango sticky rice. My mother\'s recipe!'] },
      tang: { name: 'Master Tang', title: 'lion dance teacher', voice: { pitch: 0.8 },
        look: L({ hairStyle: 'short', top: 0xc8302a, topStyle: 'tunic', bottom: 0x1a1a1a, h: 1.74 }),
        lines: ['Lion dancers learn kung fu first. The lion must be strong, and very nimble!'] },
      pak: { name: 'Uncle Pak', title: 'bird keeper', voice: { pitch: 0.82, rate: 0.9 },
        look: L({ hair: 0xc8c8c4, hairStyle: 'balding', top: 0xe8e0d0, topStyle: 'shirt', bottom: 0x5a5a5a, h: 1.64 }),
        lines: ['Every morning I bring my bird to the park, so she can hear the other birds and sing.'] },
      keung: { name: 'Ah Keung', title: 'Star Ferry deckhand', voice: { pitch: 0.9, rate: 1.05 },
        look: L({ skin: SKIN.tan, hairStyle: 'short', top: 0x1a2a5a, topStyle: 'shirt', shortSleeves: true, bottom: 0x1a2a5a, hat: 'cap', hatCol: 0xf4f4f0, h: 1.7 }),
        lines: ['Ten minutes across, all day, every day. Best view in Hong Kong, and only a couple of dollars!'] },
      leung: { name: 'Mr Leung', title: 'editor, the Harbour Daily', voice: { pitch: 0.85, rate: 1.1 },
        look: L({ hairStyle: 'balding', hair: 0x3a3a3a, top: 0xf4f4f0, topStyle: 'shirt', tie: 0x8a2a2a, glasses: true, bottom: 0x3a3a48, h: 1.72 }),
        lines: ['Deadline is eight o\'clock. News doesn\'t wait!'] },
      ko: { name: 'Captain Ko', title: 'retired airline pilot', voice: { pitch: 0.85, rate: 0.98 },
        look: L({ hair: 0xb8b8b4, hairStyle: 'short', top: 0x2a2a4a, topStyle: 'jacket', shirt: 0xf4f4f0, bottom: 0x2a2a3a, h: 1.75 }),
        lines: [{ t: 'People fly in from all over the world just to stand on a rooftop here and watch the planes. They call themselves *plane spotters*.', fact: 'spotters' }, 'From the cockpit you could see people watching TV in their flats. Very close!'] },
      siegel: { name: 'Richard Siegel', title: 'Director of Civil Aviation, on TV', real: true, radio: true, about: 'The head of Hong Kong\'s Civil Aviation Department in 1998. He switched off Kai Tak\'s runway lights for the last time.' },
    },
    facts: {
      // 1990
      walled: { t: 'The Walled City', x: 'The *Kowloon Walled City* (九龍寨城) was squeezed onto a patch of land about the size of four football pitches. Around 1990 more than *30,000 people* lived there, in about 300 buildings all joined together.' },
      fort: { t: 'From fort to city', x: 'It began as a small Chinese army fort. When Britain leased the land around it in 1898, the fort was left out, so for almost a hundred years *nobody fully ran it*. People built homes, shops and factories, higher and higher.' },
      dentists: { t: 'Dentists on the edge', x: 'Dozens of *dentists and doctors* had clinics along the edge of the Walled City. Many had trained in mainland China, and Hong Kong didn\'t accept their certificates, but its rules didn\'t reach in here.' },
      post: { t: 'Postmen in the maze', x: 'The lanes had no names on any map, but *postmen* still delivered letters to every flat, learning the maze by heart.' },
      factories: { t: 'Little factories', x: 'Hundreds of tiny factories worked inside the City, making *fish balls*, noodles, sweets, plastic toys and metal parts. Restaurants all over Kowloon bought food made here.' },
      water: { t: 'Water and wires', x: 'There were no proper water mains. People pumped water up from *wells*, and later used a few government taps. Water pipes and electric wires ran everywhere along the lane ceilings.' },
      dark: { t: 'City of Darkness', x: 'The buildings stood so close together that sunlight hardly reached the lanes at the bottom. Lights were on all day and water dripped from the pipes. Some people called it the *City of Darkness*.' },
      height: { t: 'Fourteen floors', x: 'Kai Tak Airport was right next door, so buildings here could only be about *fourteen floors* tall. Planes flew just over the rooftops as they came in to land.' },
      roof: { t: 'Life on the roof', x: 'The rooftops were the City\'s park and playground. Children played and flew kites among forests of *TV aerials*, and people hung out laundry and kept pigeons.' },
      clearance: { t: 'The end of the Walled City', x: 'In 1987 the governments of Britain and China agreed that the Walled City would be cleared. Families were paid to move out, most of them by the end of 1991, and the buildings were knocked down in *1993 and 1994*.' },
      photographers: { t: 'Remembering it', x: 'Photographers *Greg Girard* and *Ian Lambot* spent years taking pictures of the Walled City and its people before it was pulled down. Their book is called *City of Darkness*.' },
      // 1998
      park: { t: 'Walled City Park', x: 'Where the Walled City stood there is now a *garden*, opened in December 1995. Diggers found the stone name plaque of the old *South Gate* (南門) and the foundations of the fort\'s walls.' },
      yamen: { t: 'The yamen', x: 'The *yamen* was the office of the officials who ran the fort in the 1800s. It was the only old building still standing when the City came down. Over the years it had been a school, a clinic and a home for old people.' },
      handover: { t: 'The Handover', x: 'On *1 July 1997*, after 156 years as a British colony, Hong Kong was handed back to China. It became a *Special Administrative Region* with its own laws and money, an idea called "one country, two systems".' },
      kaitak: { t: 'Kai Tak', x: 'Kai Tak Airport (啟德) was named after two businessmen, *Ho Kai* and *Au Tak*, who began building on the land in the 1910s. Its one runway stuck out into Victoria Harbour, and by the 1990s nearly *30 million* passengers a year used it.' },
      newairport: { t: 'The new airport', x: 'Kai Tak was too small, and too close to the city. A new airport was built on the island of *Chek Lap Kok*, made much bigger with rock and sand. It opened on *6 July 1998*, the morning after Kai Tak closed.' },
      milktea: { t: 'Silk stocking milk tea', x: 'Hong Kong *milk tea* is strong black tea strained through a cloth bag that looks like a stocking, then mixed with evaporated milk. Pouring it from pot to pot makes it extra smooth.' },
      chachaanteng: { t: 'Cha chaan teng', x: 'A *cha chaan teng* (茶餐廳, "tea restaurant") is a Hong Kong café. They serve milk tea, toast, macaroni soup and noodles, quickly and cheaply, from early morning to late at night.' },
      cantonese: { t: 'Cantonese', x: 'Most people in Hong Kong speak *Cantonese*. It has *six tones*: the same sound said higher or lower can mean a different word. *M goi* is thank you for a service, *do je* is thank you for a gift, and *jo san* is good morning.' },
      checker: { t: 'The checkerboard', x: 'Planes landing at Kai Tak from the west flew toward a hill with a huge *orange and white checkerboard* painted on it. Close to the hill the pilot made a sharp *47 degree* right turn, low over the rooftops, to line up with the runway.' },
      spotters: { t: 'Plane spotters', x: 'People came from all over the world to watch planes land at Kai Tak. They stood on rooftops in Kowloon City, where jumbo jets passed so low you could see their wheels.' },
      minibus: { t: 'Red minibuses', x: 'Hong Kong\'s red *public light buses* carry 16 passengers and have no fixed stops. Shout *"Yau lok!"* (有落, "getting off!") and the driver pulls in. You pay as you get off.' },
      octopus: { t: 'The Octopus card', x: 'In September 1997 Hong Kong began using the *Octopus card*, one of the first touch-and-go travel cards in the world. You tap it to pay on trains, buses and ferries.' },
      starferry: { t: 'The Star Ferry', x: 'The *Star Ferry* has carried passengers across Victoria Harbour since 1888. Its wooden seat backs flip over, so passengers can always face the way the boat is going.' },
      skyline: { t: 'The skyline', x: 'Hong Kong Island has one of the most famous skylines on Earth. The *Bank of China Tower*, with its pattern of triangles, opened in 1990. *Central Plaza*, with its golden top, was the tallest building in Asia when it was finished in 1992.' },
      tram: { t: 'Ding ding', x: 'Hong Kong Island\'s double-decker *trams* have run since 1904. People call them *ding ding*, after the sound of their bells.' },
      film: { t: 'Developing film', x: 'Before digital cameras, photos were taken on *film*. In a darkroom the film was soaked in *developer*, then *stop bath* and *fixer*, then washed and hung up to dry before prints could be made.' },
      headline: { t: 'Goodbye in Chinese', x: '*再見* (joi gin) means goodbye. Word by word it says "again see", just like "see you again". Each Chinese character is a whole word or idea.' },
      yumcha: { t: 'Yum cha', x: '*Yum cha* (飲茶) means "drink tea". Families meet in big, busy restaurants to share tea and *dim sum*: little dishes in bamboo steamer baskets, wheeled around on trolleys.' },
      tap: { t: 'Tapping for tea', x: 'When someone pours you tea, you can *tap two fingers* on the table to say thank you. A story says an emperor travelling in disguise poured tea for his servant, who tapped his fingers instead of bowing, to keep the secret.' },
      dimsum: { t: 'Dim sum favourites', x: '*Har gow* are shrimp dumplings with see-through skins, *siu mai* are open-topped pork dumplings, and *char siu bao* are fluffy buns filled with sweet roast pork.' },
      mahjong: { t: 'Mahjong', x: '*Mahjong* is played by four people with 144 tiles. You win with *four sets and a pair*. In Hong Kong you can hear the click-clack of tiles from flats, restaurants and mahjong parlours.' },
      neon: { t: 'Neon signs', x: 'Hong Kong\'s neon signs were bent by hand from glass tubes softened in a flame. Real *neon* gas glows red-orange; for other colours, makers used other gases and coated tubes. Thousands of them lit up the streets at night.' },
      lastflights: { t: 'The last flights', x: 'The last plane to land at Kai Tak came from Chongqing at *11:38 at night* on 5 July 1998. The last to leave, a jumbo jet to London, took off at *two minutes past midnight*.' },
      lightsout: { t: 'Goodbye Kai Tak', x: 'At about a quarter past one in the morning, the head of civil aviation, *Richard Siegel*, said *"Goodbye Kai Tak, and thank you"*, and the runway lights went out for the last time.' },
      move: { t: 'The overnight move', x: 'That same night, long convoys of trucks and barges carried everything the new airport still needed from Kai Tak to Chek Lap Kok. Hong Kong called it the *overnight move*. By morning, planes were landing at the new airport.' },
      afterwards: { t: 'After the airport', x: 'Without planes overhead, Kowloon City could build taller. Today the old runway is home to parks, flats, a cruise ship terminal and a big new sports stadium.' },
      thai: { t: 'Little Thailand', x: 'Kowloon City has so many Thai restaurants, grocers and families that people call it *Little Thailand*.' },
      // odd jobs
      bolo: { t: 'Pineapple buns', x: 'A *bo lo baau* (菠蘿包, "pineapple bun") has no pineapple in it! Its crunchy sugar top just looks like a pineapple\'s skin. With a slice of cold butter inside, it\'s a *bo lo yau*.' },
      signs: { t: 'Nine dragons', x: '*九龍* (Kowloon) means "nine dragons". A story says a boy emperor counted eight hills here and called them dragons, and a servant told him he was the ninth, because emperors were dragons too.' },
      eggwaffle: { t: 'Egg waffles', x: '*Gai daan jai* (雞蛋仔) are egg waffles, baked in an iron full of little round bubbles. They became a Hong Kong street snack in the 1950s.' },
      lion: { t: 'Lion dance', x: 'A *lion dance* brings good luck to a new shop or a new year. Two dancers make one lion, dancing to drums, cymbals and a gong, and the lion "eats" lettuce and a red packet hung over the door.' },
      birds: { t: 'Bird walks', x: 'Many older men in Hong Kong keep *songbirds* in bamboo cages and take them out every morning to parks and tea houses, where the birds can hear each other and sing.' },
      typhoon: { t: 'Typhoon signals', x: 'When a typhoon comes near, the *Hong Kong Observatory* raises warning signals. *Signal No. 8* means gales: schools, offices and shops close and everyone heads home. *No. 10*, the strongest, is rare.' },
    },
    album: {
      title: 'Shots for the paper',
      text: 'Mei\'s shot list. When you see one, look at it and press E to take a photo.',
      shots: {
        dentists: { t: 'The dentists\' signs', x: 'Tung Tau Tsuen Road, 1990: dentists and doctors, side by side.' },
        mail: { t: 'The letterboxes', x: 'Rows of letterboxes inside the gate.' },
        pipes: { t: 'Pipes and wires', x: 'Water pipes crowding the ceiling of a lane.' },
        fishballs: { t: 'The fish ball factory', x: 'Steam and fish balls at Ho Kee.' },
        roofplane: { t: 'A jet over the rooftops', x: 'A plane roars over the Walled City\'s aerials, 1990.' },
        kite: { t: 'Ming\'s kite', x: 'A kite among the aerials: the roof was the City\'s playground.' },
        yamen: { t: 'The old yamen', x: 'The only building of the old fort still standing, 1998.' },
        milktea: { t: 'Breakfast at Lam Kee', x: 'Milk tea and a pineapple bun with butter.' },
        lowplane: { t: 'A plane over the street', x: 'A jet drops toward Kai Tak over Kowloon City\'s shop signs.' },
        minibus: { t: 'A red minibus', x: 'Sixteen seats and no fixed stops.' },
        harbour: { t: 'The harbour', x: 'Hong Kong Island\'s towers from the Star Ferry.' },
        tram: { t: 'A ding ding', x: 'A double-decker tram in Central.' },
        dimsum: { t: 'The dim sum trolley', x: 'Steamer baskets on their way round.' },
        neon: { t: 'Neon at night', x: 'Kowloon City\'s signs on Kai Tak\'s last night.' },
        lastplane: { t: 'One of the last planes', x: 'Landing lights over Kowloon City, 5 July 1998.' },
      },
    },
    jobs: {
      buns: { t: 'Buns for the barber', giver: 'chow', set: 'kc98', fact: 'bolo',
        intro: [['chow', 'Jo san! Fresh pineapple buns, still warm. Oh, could you do me a favour?'], ['chow', 'Mr Yip the barber has two every morning, but I can\'t leave my oven. Would you take him this bag?'], ['you', 'Sure! Is there pineapple in them?'], ['chow', 'Ha! Not a bit. The crunchy sugar top just looks like a pineapple. The bag is on the end of my counter.']],
        busy: 'The buns are getting cold! Mr Yip is at the barber\'s, with the stripy pole.',
        steps: [{ goal: 'Take the *pineapple buns* to Mr Yip the barber', bring: 'buns', talk: 'yip', say: [['yip', 'My bo lo baau! Warm and crunchy. M goi!'], ['yip', 'With a slice of cold butter inside it\'s called a bo lo yau. The best breakfast in Hong Kong.']] }] },
      sign: { t: 'The sign painter\'s sign', giver: 'kwok', set: 'kc98', fact: 'signs',
        intro: [['kwok', 'Young one! My eyes are tired and this sign is due today. It must say *Kowloon City*: 九龍城.'], ['kwok', 'Pick the characters for me, in order. Careful: some look alike, and some sound alike!']],
        steps: [{ play: 'spell', frame: 'sign', title: 'Paint the sign', how: 'Pick the characters for 九龍城 (Kowloon City), in order.', prompt: 'Kowloon City: 九龍城 (gau lung sing)',
          target: ['gau', 'lung', 'sing'], decoys: ['tin', 'star', 'cha'],
          tiles: { gau: { label: '九', sound: 'gau', mean: 'nine' }, lung: { label: '龍', sound: 'lung', mean: 'dragon' }, sing: { label: '城', sound: 'sing', mean: 'city' }, tin: { label: '天', sound: 'tin', mean: 'sky' }, star: { label: '星', sound: 'sing', mean: 'star' }, cha: { label: '茶', sound: 'cha', mean: 'tea' } },
          wrong: (t, want) => (t.id === 'star' && want === 'sing' ? '星 is also said *sing*, but it means *star*. In Chinese, many words share a sound: the character tells you which one!' : null),
          winText: 'Nine, dragon, city: 九龍城!' }],
        end: [['kwok', 'Beautiful. Kowloon means nine dragons. They say a boy emperor counted eight hills here, and a servant told him he was the ninth dragon!']] },
      waffle: { t: 'Egg waffles', giver: 'kam', set: 'kc98', fact: 'eggwaffle',
        intro: [['kam', 'Gai daan jai! Egg waffles! Aiya, my arm is so tired from pouring.'], ['kam', 'You pour the batter for me? Fill every bubble, but don\'t let it overflow!']],
        steps: [{ play: 'pour', title: 'Pour the egg waffles', how: 'Hold to pour batter into the hot iron. Let go when the bubbles are full, in the gold band.', rounds: 3, band: [0.7, 0.88], speed: 0.42, scene: waffleScene, bg: '#2a2a2e', bg2: '#1a1a1e',
          goodText: 'Perfect bubbles!', shortText: 'Not enough batter: the bubbles will be hollow! Pour a little longer.', spillText: 'Too much! Batter everywhere. Let\'s try that one again.', winText: 'Crispy outside, fluffy inside!' }],
        end: [['kam', 'Here, the first one is yours. Careful, it\'s hot! Pull off a bubble at a time.']] },
      lion: { t: 'The lion dance', giver: 'malee', set: 'kc98', fact: 'lion',
        intro: [['malee', 'Sawasdee ka! My restaurant opens today. For good luck we have a lion dance, but our drummer is stuck in traffic!'], ['tang', 'You there! Can you keep a beat? The lion dances to the drum and the cymbals. Drum on the beat, cymbals when I shout.']],
        steps: [{ play: 'rhythm', title: 'Drum for the lion', how: 'Hit the drum and crash the cymbals when the circles reach the line.', lanes: [{ label: 'Drum', color: '#e84a3a' }, { label: 'Cymbal', color: '#ffd25a' }],
          pattern: '0.0.0.1.0.0.0.1.0.0.1.1.0.0.0.1.', bpm: 92, need: 0.6, scene: lionScene, chant: ['Dong!', 'Dong!', 'Dong!', 'Chang!'], winText: 'The lion leaps up and snatches the lettuce and the red packet!' }],
        end: [['tang', 'Good luck for the new shop! You have a drummer\'s heart.'], ['malee', 'Thank you! Come back any time for mango sticky rice.']] },
      bird: { t: 'The lost songbird', giver: 'pak', set: 'kc98', fact: 'birds',
        intro: [['pak', 'Oh dear, oh dear. My little white-eye slipped out of her cage when I opened it to give her water.'], ['pak', 'Every morning I bring her to the park to sing with the other birds. Could you find her? She likes the trees by the old yamen.']],
        busy: 'She\'s small and green, with a white ring round her eye. Try the trees near the yamen.',
        steps: [{ goal: 'Find Uncle Pak\'s *songbird* in the park and bring her back', bring: 'bird', talk: 'pak', say: [['pak', 'There you are, little one! Back in your cage. Listen, she\'s singing already.']] }] },
      typhoon: { t: 'The typhoon chart', giver: 'cheung', set: 'kc98', fact: 'typhoon',
        intro: [['cheung', 'I\'m making a chart of the typhoon signals for my window, so customers know what to do. But I\'ve mixed up my cards!'], ['cheung', 'Can you put them in order, from the mildest to the worst?']],
        steps: [{ play: 'order', title: 'Typhoon signals', prompt: 'From the mildest to the worst', bg: '#2a3a4a', bg2: '#1a2430',
          steps: [{ t: 'No. 1: a typhoon is within 800 km. Stand by.' }, { t: 'No. 3: strong winds are blowing.', hint: 'Signal 1 just says a typhoon is around. What comes when the wind starts?' }, { t: 'No. 8: gales! Schools and shops close.', hint: 'Count up: which signal comes after 3?' }, { t: 'No. 9: the storm is getting stronger.', hint: 'Nearly there. The strongest signal of all comes last.' }, { t: 'No. 10: hurricane winds. Stay indoors!', hint: 'Number 10 is the very worst.' }],
          winText: 'One, three, eight, nine, ten. Now everyone will know what to do!' }],
        end: [['cheung', 'Thank you! When the No. 8 goes up, everyone rushes home, and I sell all my tape.']] },
    },
    sets: {
      street90: { amb: 'city', surf: 'stone', build: buildStreet90,
        env: { top: 0x6a9ad0, hor: 0xd8dcd8, bot: 0x9a968c, sun: [0.3, 0.75, 0.4], sunCol: 0xfff0d8, sunI: 0.9, hemiSky: 0xdfeaf6, hemiGround: 0x8a8478, hemiI: 0.6, fog: 0xc8ccd0, fogD: 0.006, clouds: 0.45 } },
      lanes: { amb: 'lanes', surf: 'stone', build: buildLanes,
        env: { sky: false, fog: 0x0c0a08, fogD: 0.05, sun: [0.2, 1, 0.1], sunI: 0.1, hemiSky: 0x9aaaa8, hemiGround: 0x4a4434, hemiI: 0.55, amb: 0.16 } },
      roof90: { amb: 'wind', surf: 'stone', build: buildRoof90,
        env: { top: 0x5a8ad0, hor: 0xd8dce0, bot: 0x9a968c, sun: [0.5, 0.6, 0.3], sunCol: 0xfff0d0, sunI: 1.0, hemiI: 0.6, fog: 0xc8d0d8, fogD: 0.004, clouds: 0.5 } },
      kc98: { amb: 'city', surf: 'stone', build: buildKC,
        env: { top: 0x5a8ad8, hor: 0xdce4ea, bot: 0x9a968c, sun: [0.35, 0.8, 0.45], sunCol: 0xfff4e0, sunI: 1.0, hemiI: 0.62, fog: 0xd0d8e0, fogD: 0.005, clouds: 0.35 } },
      ferry: { amb: 'harbour', surf: 'wood', build: buildFerry,
        env: { top: 0x6a9ad8, hor: 0xe0e6ea, bot: 0x5a7a8a, sun: [0.4, 0.6, 0.6], sunCol: 0xfff0d8, sunI: 0.95, hemiI: 0.65, fog: 0xd0dce4, fogD: 0.0012, clouds: 0.4 } },
      central: { amb: 'city', surf: 'stone', build: buildCentral,
        env: { top: 0x6a9ad8, hor: 0xe0e4e8, bot: 0x9a968c, sun: [0.6, 0.55, 0.3], sunCol: 0xffe8c8, sunI: 0.9, hemiI: 0.62, fog: 0xd0d4d8, fogD: 0.004, clouds: 0.4 } },
      teahouse: { amb: 'workshop', surf: 'carpet', build: buildTeahouse,
        env: { sky: false, fog: 0x3a2a20, fogD: 0.0, sun: [0.3, 0.9, 0.5], sunI: 0.35, sunCol: 0xfff0d8, hemiSky: 0xfff4e0, hemiGround: 0x8a4a3a, hemiI: 0.75, amb: 0.25 } },
      roof98: { amb: 'citynight', surf: 'stone', build: buildRoof98,
        env: { top: 0x080c1c, hor: 0x3a2a34, bot: 0x1a1418, sun: [-0.3, 0.7, -0.4], sunCol: 0x8a9ac8, sunI: 0.25, hemiSky: 0x4a5a8a, hemiGround: 0x3a2a2a, hemiI: 0.45, amb: 0.15, fog: 0x1e1820, fogD: 0.004, stars: 0.35, clouds: 0.15, cloudCol: 0x4a3a4a } },
    },
    chapters: [
      // ---------------- 1990 ----------------
      { title: 'City of Darkness', set: 'street90', when: 'Spring 1990', place: 'Tung Tau Tsuen Road, Kowloon City', year: 1990, start: [0.5, 7, 'mei'], steps: [
        { chat: [
          ['mei', 'Jo san! Good morning! You must be the helper the paper sent. I\'m Mei Chan, photographer for the Harbour Daily.'],
          ['you', 'Jo san! Where are we?'],
          ['mei', 'Kowloon, in Hong Kong. And that wall of buildings across the road is the *Kowloon Walled City*.'],
          ['mei', 'More than thirty thousand people live in there, on a patch of land you could walk around in ten minutes.'],
        ], fact: 'walled' },
        { chat: [
          ['mei', 'Here, this camera is yours today. My editor wants a page of *shots for the paper*.'],
          ['mei', 'Whenever you see something on my list, look at it and press *E* to take a picture. The list is in your journal: press *J*.'],
          ['mei', 'There\'s one right here: all those dentists\' signs! And look who\'s outside his clinic. Go and say hello.'],
        ] },
        { goal: 'Talk to the *dentist* outside his clinic', talk: 'wong' },
        { chat: [['wong', 'Come in, come in! Toothache? No? Ah, a photographer\'s helper.'], ['wong', 'Look along this road: dentist, dentist, doctor, dentist! There are dozens of us.']] },
        { ask: 'wong', q: 'Why do you think so many dentists work right here, at the edge of the Walled City?', a: [
          ['Hong Kong\'s rules didn\'t reach inside, so dentists trained in China could work here', true, 'Clever! I trained in Guangzhou, but Hong Kong won\'t accept my certificate. Here nobody checks, so my prices are cheap and people come from all over.'],
          ['The noise of the planes is good for teeth', false, 'Ha! The planes are loud, but they don\'t do anything for your teeth! Think about who makes the rules here...'],
          ['All the dentists were born in the City', false, 'Some were, but that\'s not why. Think about who makes the rules here, and who doesn\'t...'],
        ], fact: 'dentists' },
        { chat: [
          ['mei', 'The City started as a little Chinese fort. When Britain leased the land around it in 1898, the fort was left out of the deal.'],
          ['mei', 'So for nearly a hundred years, nobody really ran it. People built wherever they could: rooms on top of rooms, higher and higher.'],
          ['mei', 'Come on, the postman is by the lane. Uncle Tsang knows the way in better than anyone.'],
        ], fact: 'fort' },
        { goal: 'Find *Uncle Tsang* the postman by the lane into the City', talk: 'tsang' },
        { chat: [
          ['tsang', 'Aiya, my ankle! I slipped on the wet steps this morning.'],
          ['tsang', 'Young helper, would you deliver these letters for me? Three of them, deep inside.'],
          ['tsang', 'There are no street names in there, so look at the shop signs and follow the *water pipes*. Take my torch, too: some lanes are dark as night.'],
          ['you', 'I\'ll try!'],
        ] },
        { play: 'maze', title: 'Deliver the letters', how: 'Walk the lanes with the arrows, or tap where you want to go. Find the three doors on your list before the torch runs out.',
          listTitle: 'Letters for:', start: 'Gate', seed: 1990, w: 13, h: 9, battery: 380,
          stops: [{ label: 'Grandma Lau', short: '劉', cjk: true, color: '#ff9a7a', found: 'A letter for *Grandma Lau*. She waves from her doorway.' }, { label: 'Ho Kee fish balls', short: '魚', cjk: true, color: '#ffd25a', found: 'A parcel for *Mr Ho*. The whole lane smells of fish!' }, { label: 'The noodle maker', short: '麵', cjk: true, color: '#9ae8a0', found: 'A letter for *the noodle maker*. Noodles are hanging up to dry.' }],
          winText: 'All three delivered! Uncle Tsang would be proud.', fact: 'post' },
        { chat: [['tsang', 'Back already? Wah, you have a postman\'s nose!'], ['mei', 'Now let\'s go inside properly. I want pictures of the lanes.']] },
      ] },
      { title: 'Inside the lanes', set: 'lanes', when: 'Spring 1990', place: 'Inside the Kowloon Walled City', year: 1990, start: [-18.6, 0, -Math.PI / 2], steps: [
        { chat: [['mei', 'Mind your head, and watch out for the drips!'], ['mei', 'It\'s nearly noon, but look how dark it is. The buildings are so close together that the sun can\'t reach the bottom.']], fact: 'dark' },
        { goal: 'Explore the lanes: find three places', each: [
          { talk: 'ho', say: ['ho', 'Fish balls! We make thousands every day. Restaurants all over Kowloon buy them.', 'There are hundreds of little factories in the City. Noodles, sweets, toys, you name it.'], fact: 'factories' },
          { use: 'pump', say: ['mei', 'There are no proper water mains in here, so people pump water up from wells. Look at all those pipes, running along every lane!'], fact: 'water' },
          { talk: 'lau', say: ['lau', 'Ah, the young postman! Thank you for my letter, dear.'] },
        ] },
        { chat: [
          ['lau', 'We have lived here for thirty years. But the government says the whole City will be cleared, and pulled down.'],
          ['you', 'Where will you go?'],
          ['lau', 'They are paying us to move to a new flat, next year. Lifts, windows, a kitchen of our own! But I will miss my neighbours.'],
        ], fact: 'clearance' },
        { chat: [['lau', 'Could you do me a favour? My grandson Ming is up on the roof with his kite, and he forgot his spare string.'], ['lau', 'It\'s on the box by my door. The stairs up are at the end of the other lane.']] },
        { goal: 'Take Ming\'s *kite string* up the stairs to the roof', bring: 'string', use: 'stairs', hint: 'Grandma Lau left the kite string by her door.' },
      ] },
      { title: 'On the roof', set: 'roof90', when: 'Spring 1990', place: 'On the roof of the Kowloon Walled City', year: 1990, start: [0, 8.6, 'ming'], steps: [
        { chat: [['mei', 'Phew, all those stairs! Welcome to the City\'s park.'], ['mei', 'There\'s no room down below, so the roofs are where everyone comes for air: kids, laundry, pigeons, everybody.']], fact: 'roof' },
        { goal: 'Give the kite string to *Ming*', talk: 'ming' },
        { chat: [['ming', 'My string! Thanks! Grandma always remembers.'], ['ming', 'Shh, listen. Here comes one!']] },
        { do: (S) => { S.data.fly({ sec: 10 }); }, wait: 3 },
        { look: 'mei' },
        { chat: [['ming', 'Woooow! Did you see the wheels? They come over every couple of minutes.'], ['mei', 'That\'s why every building here stops at about fourteen floors. Any higher and the planes would hit them!']], fact: 'height' },
        { chat: [['mei', 'I want that shot: a jumbo over the aerials. Get ready, there\'ll be another one in a minute.']] },
        { goal: 'Point your camera at the next *plane* and take a photo', use: 'planecam', then: () => Album.snap('kowloon', 'roofplane') },
        { chat: [['mei', 'Let me see... Beautiful! That\'s going in the paper.'], ['ming', 'Can I have a copy? For our new flat?'], ['mei', 'Of course, Ming.']] },
        { say: 'narrator', text: 'Something tugs at your sleeve. The time machine is crackling.' },
        { chat: [['clio', 'Apprentice! The machine has a second stop for you: these very same streets, eight years from now. Hold on to that camera!'], ['you', 'Bye, Mei! Bye, Ming!']] },
        { do: () => warpTo(1998, 'Kowloon City, eight years later') },
      ] },
      // ---------------- 1998 ----------------
      { title: 'Eight years later', set: 'kc98', when: 'Sunday 5 July 1998', place: 'Kowloon City, Hong Kong', year: 1998, start: [-30, -1.5, 'mei98'], steps: [
        { do: () => warpEnd() },
        { say: 'narrator', text: 'The Walled City is gone. Where it stood there\'s a quiet garden, with ponds, old stones and a park gate.' },
        { goal: 'Talk to *Mei* by the park gate', talk: 'mei98' },
        { chat: [
          ['mei98', 'Sorry, do I know you? You look exactly like a helper I had in the Walled City, eight years ago. You haven\'t grown a centimetre!'],
          ['you', 'Er... that was my cousin?'],
          ['mei98', 'Well, it runs in the family! I\'m Mei Chan, still at the Harbour Daily.'],
          ['mei98', 'Behind me is *Kowloon Walled City Park*. They pulled the City down in 1993, and planted this garden where it stood.'],
        ], fact: 'park' },
        { chat: [['mei98', 'A lot has changed. Last summer, on *1 July 1997*, Hong Kong was handed back to China, after 156 years as a British colony.']], fact: 'handover' },
        { do: (S) => { S.data.fly({ sec: 9 }); }, wait: 3.5 },
        { chat: [['mei98', 'Hear that? Today is the last day of *Kai Tak* airport. Tonight it closes for ever.'], ['mei98', 'Tomorrow morning, every plane will land at the new airport at *Chek Lap Kok* instead.']], fact: 'kaitak' },
        { ask: 'mei98', q: 'What do you think will change in Kowloon City when the planes stop?', a: [
          ['It will be quieter, and new buildings can be taller', true, 'Exactly. No more stopping in the middle of a sentence while a jumbo jet goes over, and no more height limit.'],
          ['The planes will land in the park instead', false, 'Ha! No, they\'re going to a brand new airport on an island far to the west.'],
          ['Nothing at all', false, 'Oh, a lot will change! Think about the noise, and why the buildings here are all so short...'],
        ], fact: 'newairport' },
        { chat: [
          ['mei98', 'My editor wants a photo story: *Kowloon City\'s last day under the planes*. You keep your camera and my shot list. Press *J* to see it.'],
          ['mei98', 'But first, breakfast! Lam Kee is the cha chaan teng across the road. Best milk tea in Kowloon.'],
        ] },
        { goal: 'Go into *Lam Kee* cha chaan teng', to: 'lamkee' },
        { chat: [
          ['ming98', 'Welcome to Lam Kee! Sit anywhere... wait. Mei? Is that you?'],
          ['mei98', 'Ming? Little Ming from the Walled City roof?'],
          ['ming98', 'Not so little now. I\'m seventeen! I work here in the holidays.'],
          ['ming98', 'And you... You look just like the kid who brought my kite string. That\'s so weird.'],
        ], fact: 'chachaanteng' },
        { chat: [['ming98', 'Do you want to learn to make milk tea? Mr Lam says I\'m the best tea puller on the street. Come round behind the counter!']] },
        { goal: 'Go behind the *counter*', use: 'counter' },
        { play: 'milktea', winText: 'Silky smooth! Mr Lam would hire you on the spot.', fact: 'milktea' },
        { ask: 'ming98', q: 'A customer says thank you as you hand them the tea. In Cantonese there are two kinds of thank you. Which one is for when someone does a job for you?', a: [
          ['M goi', true, 'Right! *M goi* is for a service, like pouring tea. *Do je* is for a present. And *jo san* means good morning.'],
          ['Do je', false, 'Close! *Do je* is thank you for a present. For a service, like pouring tea, there\'s another word...'],
          ['Sik wu', false, 'Ha! That\'s what you shout when you win at mahjong!'],
        ], fact: 'cantonese' },
        { chat: [
          ['mei98', 'Lovely breakfast. I\'m going to photograph the plane spotters. Take the morning to explore Kowloon City.'],
          ['mei98', 'Look for people who could use a hand. And visit the old *yamen* in the park, and *Master Fung*, the neon sign maker down the street.'],
          ['mei98', 'Meet me at the minibus stop when you\'re done.'],
        ] },
      ] },
      { title: 'Under the flight path', set: 'kc98', when: 'Sunday 5 July 1998', place: 'Kowloon City, Hong Kong', year: 1998, start: [6, -7, Math.PI], setup(S) { S.actors.mei98.tp(28, 7, Math.PI / 2); }, steps: [
        { goal: 'Visit the old *yamen* in Walled City Park', use: 'yamen' },
        { chat: [['narrator', 'The sign says: *The yamen* was the office of the officials who ran the fort in the 1800s. When the Walled City was pulled down, it was the only old building still standing.'], ['narrator', 'Over the years it was a school, a clinic and a home for old people. Now it is a museum of the City.']], fact: 'yamen' },
        { goal: 'Find *Master Fung* in his neon workshop', talk: 'fung' },
        { chat: [
          ['fung', 'Ah, Ming\'s friend! I\'m making Lam Kee\'s new sign: a teacup, with steam.'],
          ['fung', 'A glass tube, a hot flame and patience. Hold it in the flame until it glows orange. Too cold and it cracks; too hot and it sags.'],
        ] },
        { play: 'neon', pattern: TEACUP.map((p) => [p[0] + 50, p[1]]), label: 'Lam Kee\'s teacup', color: '#ff4a3a', gas: 'Neon gas',
          winText: 'Look at that glow! Real neon glows red-orange. For blue, we use argon gas.', fact: 'neon' },
        { do: (S) => { S.data.cup.visible = true; } },
        { chat: [['fung', 'I\'ll hang it tonight. Look for it after dark.'], ['fung', 'Now go and explore! People round here always need a hand. Just talk to them.']] },
        { goal: 'Explore Kowloon City: help people and take photos. Meet *Mei* at the minibus stop when you\'re ready', talk: 'mei98' },
      ] },
      { title: 'Across the harbour', set: 'kc98', when: 'Sunday 5 July 1998', place: 'Kowloon and Central, Hong Kong', year: 1998, start: [26, 6.6, 'mei98'], setup(S) { S.actors.mei98.tp(28, 7, -Math.PI / 2); S.data.cup.visible = true; }, steps: [
        { chat: [
          ['mei98', 'The paper wants my film by this afternoon, so we\'re taking it to the office in Central, across the harbour.'],
          ['mei98', 'Red minibus to the Star Ferry, then the ferry. On a red minibus there are no bells: you shout *"Yau lok!"* when you want to get off.'],
        ], fact: 'minibus' },
        { play: 'minibus', rides: [
          { stop: 'Kowloon City Market', sign: '街市', before: ['Thai grocer', 'Temple'], after: 'Bus station', who: 'for the old lady next to you', thanks: 'The old lady gets off with her shopping. "M goi!" she says.' },
          { stop: 'Star Ferry', sign: '天星碼頭', before: ['Mong Kok', 'Nathan Road', 'Museum'], after: 'Harbour', fare: 6.5, intro: 'The old lady couldn\'t shout loud enough, so you helped. Now your own stop: the Star Ferry!' },
        ], winText: 'Off at the Star Ferry, with the exact fare. Like a real Hongkonger!' },
        { scene: 'ferry', at: [-0.6, 10, Math.PI] },
        { chat: [['mei98', 'The Star Ferry! People have been crossing the harbour on these since 1888.'], ['mei98', 'See how the seat backs flip over? So you always face the way you\'re going.']], fact: 'starferry' },
        { goal: 'Look at the view from the front *rail*', to: 'rail' },
        { chat: [['mei98', 'Hong Kong Island. See the tall one with the triangles? That\'s the *Bank of China Tower*. And the one with the golden top, over by the water, is *Central Plaza*.']], fact: 'skyline' },
        { goal: 'Talk to *Ah Keung*, the deckhand', talk: 'keung' },
        { chat: [['keung', 'Hello, little sailor! When we reach the pier, I catch the rope with my hook and we tie her up.'], ['keung', 'Want to help? Hook when the circles reach the line, then pull!']] },
        { play: 'rhythm', title: 'Tie up the ferry', how: 'Hook the rope, then pull, in time.', lanes: [{ label: 'Hook!', color: '#6ab8ff' }, { label: 'Pull!', color: '#ffd25a' }], pattern: '0.1.0.1.0.1..0.1.0.1.', bpm: 80, need: 0.6, scene: ferryScene, chant: ['Hook!', 'Pull!'], winText: 'Tied up tight! Mind the gap as you step off.' },
        { scene: 'central', at: [-21, 1.5, 'mei98'] },
        { chat: [['mei98', 'Now a *ding ding* to the office. Hear the bell?']] },
        { do: (S) => S.data.tramTo(-20, 5) },
        { chat: [['mei98', 'Upstairs, at the front. Best seat in Hong Kong!']], fact: 'tram' },
        { do: (S) => { const tr = S.data.tram; PL.cut = { pos: [tr.position.x + 4.6, 3.3, -1.5], look: [tr.position.x + 30, 3, -1.5], fov: 62 }; S.actors.mei98.show(false); S.tick(() => { if (PL.cut && S.data.riding) { PL.cut.pos[0] = tr.position.x + 4.6; PL.cut.look[0] = tr.position.x + 30; } }); S.data.riding = true; return S.data.tramTo(9, 8); } },
        { do: (S) => { S.data.riding = false; PL.cut = null; placePlayer(10.4, -5.4, 0); S.actors.mei98.show(true).tp(9, -5.6, Math.PI); AU.ui('ding'); } },
        { chat: [['mei98', 'Here we are: the Harbour Daily. The darkroom is in the back corner.']] },
        { goal: 'Go into the *darkroom*', use: 'darkroom' },
        { chat: [['mei98', 'Only the red light in here, or the film is ruined! Help me develop it.']] },
        { play: 'order', title: 'Develop the film', prompt: 'Develop the film, in the right order', bg: '#4a1a1a', bg2: '#2a0a0a', steps: [
          { t: 'In total darkness, wind the film onto the reel' }, { t: 'Developer: the pictures appear', hint: 'The film is on the reel. Now the chemical that makes the pictures appear.' },
          { t: 'Stop bath: stop the developer working', hint: 'The pictures are there. Now stop the developer before it goes too far.' }, { t: 'Fixer: now light can\'t spoil it', hint: 'After the stop bath, the film must be made safe from light.' }, { t: 'Wash it, and hang it up to dry', hint: 'Last of all, wash off the chemicals.' },
        ], winText: 'Perfect negatives! Now we can print them.', fact: 'film' },
        { goal: 'Show the photos to *Mr Leung*, the editor', talk: 'leung' },
        { chat: [['leung', 'Mei! Let\'s see them. Hmm. Spotters, the minibus... and what\'s this one, from 1990?']] },
        { ask: 'leung', q: 'Which photo should go on the front page, for Kai Tak\'s last day?', a: [
          ['A jumbo jet skimming the rooftops of Kowloon City', true, 'That\'s the one. Everyone in Hong Kong knows that sight, and after tonight nobody will ever see it again.'],
          ['A bowl of noodles', false, 'Delicious, but not quite front page news today!'],
          ['An empty car park', false, 'Hmm. Maybe tomorrow, when the airport is empty...'],
        ] },
        { chat: [['leung', 'Now the headline. Our typesetter has gone home. Can you set it? Four characters: *goodbye, Kai Tak*.']] },
        { play: 'spell', frame: 'sign', title: 'Set the headline', how: 'Pick the characters in order.', prompt: 'Goodbye, Kai Tak: 再見啟德 (joi gin Kai Tak)',
          target: ['joi', 'gin', 'kai', 'tak'], decoys: ['sing', 'cha', 'lung'],
          tiles: { joi: { label: '再', sound: 'joi', mean: 'again' }, gin: { label: '見', sound: 'gin', mean: 'see' }, kai: { label: '啟', sound: 'kai', mean: 'open' }, tak: { label: '德', sound: 'tak', mean: 'virtue' }, sing: { label: '星', sound: 'sing', mean: 'star' }, cha: { label: '茶', sound: 'cha', mean: 'tea' }, lung: { label: '龍', sound: 'lung', mean: 'dragon' } },
          winText: '再見啟德: goodbye, Kai Tak. Word by word: again, see, Kai Tak.', fact: 'headline' },
        { chat: [['leung', 'Perfect. Off you go.'], ['mei98', 'Grandma Lau has invited us for yum cha. Back to Kowloon City!']] },
      ] },
      { title: 'Yum cha', set: 'teahouse', when: 'Sunday 5 July 1998', place: 'A restaurant in Kowloon City', year: 1998, start: [-3, 7.6, 'lau98'], steps: [
        { chat: [
          ['lau98', 'There you are! Sit, sit! Ming told me everything. You look just like that kind child from the Walled City.'],
          ['lau98', 'We moved out in 1991, to a flat with a window and our own kitchen. I still miss my old neighbours.'],
          ['ming98', 'Grandma, the helper has never had yum cha!'], ['lau98', 'Never? Aiya! Then today you will learn.'],
        ], fact: 'yumcha' },
        { ask: 'lau98', q: 'Grandma pours you some tea. How can you say thank you without interrupting the conversation?', a: [
          ['Tap two fingers on the table', true, 'Very polite! An old story says an emperor in disguise once poured tea for his servant, who tapped his fingers instead of bowing, to keep the secret.'],
          ['Clap your hands loudly', false, 'Oh my, everyone would turn around! There\'s a quieter way, with your fingers...'],
          ['Turn your cup upside down', false, 'Then I can\'t pour you any more! Try something with your fingers on the table...'],
        ], fact: 'tap' },
        { chat: [['ming98', 'Now the best part. The aunties push trolleys of dim sum around. Grab us some baskets!']] },
        { goal: 'Bring three baskets of *dim sum* from the trolleys to our table', hint: 'Pick up a basket from a trolley first.', each: [
          { bring: 'hargow', use: 'table', say: ['ming98', 'Har gow! Shrimp dumplings. See how the skin is almost see-through?'] },
          { bring: 'siumai', use: 'table', say: ['lau98', 'Siu mai, with pork and mushroom. My favourite.'] },
          { bring: 'bao', use: 'table', say: ['mei98', 'Char siu bao! Fluffy buns with sweet roast pork inside.'] },
        ], fact: 'dimsum' },
        { chat: [['lau98', 'Ho mei! Delicious. Now, mahjong! My friends are waiting in the corner.'], ['ming98', 'Grandma always wins. Good luck!']] },
        { goal: 'Sit down at the *mahjong table*', use: 'mjtable' },
        { chat: [['lau98', 'A winning hand is *four sets and a pair*. A set is three the same, like three red dragons, or three in a row of one suit, like 4, 5, 6 of bamboo.'], ['lau98', 'Let me show you. These are your tiles.']] },
        { play: 'mahjong', seed: 1998, winText: 'Sik wu! Grandma\'s friends clap. "Beginner\'s luck!" says Auntie Wai.', fact: 'mahjong' },
        { chat: [['lau98', 'Tonight we watch the last planes from my friend\'s rooftop. You must come!']] },
      ] },
      { title: 'The last night', set: 'roof98', when: 'Night, 5 to 6 July 1998', place: 'A rooftop in Kowloon City', year: 1998, start: [0, -2, 'ko'], steps: [
        { chat: [
          ['ko', 'Good evening! Captain Ko. I flew jumbo jets into Kai Tak for thirty years. Tonight I came to say goodbye.'],
          ['ko', 'Do you know about the checkerboard? Coming from the west, we flew straight at a hill with a big orange and white checkerboard on it.'],
          ['ko', 'Then, very low, a sharp turn to the right, 47 degrees, and there was the runway, sticking out into the harbour. Here, try it on my old chart.'],
        ] },
        { play: 'approach', winText: 'Touchdown! A perfect checkerboard turn. You\'d make a fine pilot.', fact: 'checker' },
        { chat: [['ko', 'Ha! The passengers would have clapped. Look, here comes a real one.']] },
        { goal: 'Take a photo of one of the last planes coming in', use: 'planecam', then: () => Album.snap('kowloon', 'lastplane') },
        { chat: [['mei98', 'Got it? Good. And look across the street!'], ['ming98', 'It\'s Lam Kee\'s new sign! The teacup!'], ['mei98', 'Master Fung did it. With a little help, I hear.']] },
        { say: 'narrator', text: 'It is 11:38 at night. The very last plane ever to land at Kai Tak, from Chongqing, comes in over the rooftops.' },
        { do: (S) => { PL.cut = { pos: [0, 1.6, -3], look: [-60, 30, -60], fov: 58 }; S.data.follow = true; S.tick(() => { const p = S.data.plane(); if (S.data.follow && p && PL.cut) PL.cut.look = [p.position.x, p.position.y, p.position.z]; }); return S.data.fly({ sec: 13, a: [-240, 75, -240], b: [200, -21, 200] }); } },
        { do: (S) => { S.data.follow = false; PL.cut = null; AU.ui('cheer'); for (const id of ['ming98', 'mei98', 'ko']) S.actors[id].set('cheer'); }, wait: 2 },
        { do: (S) => { for (const id of ['ming98', 'mei98']) S.actors[id].set('idle'); S.actors.ko.set('point'); } },
        { chat: [['ko', 'Two minutes past midnight. Now the last one out: a jumbo jet to London. Watch the runway!']] },
        { do: (S) => { PL.cut = { pos: [2, 1.8, 2], look: [150, -20, 150], fov: 40 }; S.data.follow = true; return S.data.fly({ sec: 12, a: [130, -22, 130], b: [700, 140, 700], v: 0.25 }); } },
        { do: (S) => { S.data.follow = false; PL.cut = null; } },
        { chat: [['ko', 'Gone. That\'s the last plane that will ever take off from Kai Tak.'], ['ming98', 'The TV! They\'re going to switch off the lights!']], fact: 'lastflights' },
        { goal: 'Watch the *TV* with the neighbours', to: 'tv' },
        { look: 'tv' },
        { do: (S) => S.data.tv((c, w, h) => { c.fillStyle = '#20283a'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8d8d0'; c.fillRect(70, 50, 116, 110); c.fillStyle = '#c8a888'; c.beginPath(); c.arc(128, 70, 26, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = '700 18px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('1:16 am  KAI TAK', w / 2, 184); }) },
        { chat: [['narrator', 'On the TV, the head of civil aviation stands in the control tower.'], ['siegel', 'Goodbye Kai Tak, and thank you.']] },
        { do: (S) => { S.data.runway.visible = false; AU.ui('thud'); S.data.tv((c, w, h) => { c.fillStyle = '#05060a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '700 18px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('LIGHTS OUT', w / 2, h / 2); }); }, wait: 1.5 },
        { look: 'ko' },
        { chat: [['lau98', 'So quiet.'], ['ming98', 'Listen. No planes. I\'ve never heard Kowloon City this quiet in my whole life.']], fact: 'lightsout' },
        { do: (S) => { S.data.convoy(); } },
        { chat: [['ko', 'Look down there: trucks, all heading west. The *overnight move*. By morning the new airport will have everything it needs.']], fact: 'move' },
        { chat: [
          ['mei98', 'Thank you, helper. Or cousin. Whoever you really are.'],
          ['mei98', 'Here: a print of that roof shot from 1990. The plane over the aerials. Keep it.'],
          ['you', 'Thank you, Mei. Joi gin!'],
        ] },
        { say: 'narrator', text: 'Without planes overhead, Kowloon City could build taller. Today the old runway is home to parks, flats, a cruise ship terminal and a big new stadium.', fact: 'afterwards' },
      ] },
    ],
  });
})();
