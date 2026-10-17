// Event: the Wright brothers' first powered flights at Kill Devil Hills, near Kitty Hawk, North Carolina, 17 December 1903.
// You're the brothers' helper at camp on a freezing, windy morning.

(() => {
  const RAILX = -14, RAIL0 = 4.5, RAIL1 = -13.5, LIFT = -8, LAND = -45;
  const SAND = 0xd8ccac, SAND2 = 0xcabd9a;
  const bigHill = (x, z) => { const d = Math.hypot(x + 75, z - 70) / 62; return d < 1 ? 26 * (1 - d * d) * (1 - d * d * 0.3) : 0; };
  const dune = (x, z) => { const d = Math.hypot(x - 30, z - 44) / 18; return d < 1 ? 4 * (1 - d * d) : 0; };
  function height(x, z) {
    if (x > 125) return -1.5 - (x - 125) * 0.05;
    let h = bigHill(x, z) + dune(x, z) + fbm(x * 0.03, z * 0.03, 3, 21) * 1.2 * smooth(30, 70, Math.hypot(x + 10, z));
    if (x > 110) h = lerp(h, -1.2, (x - 110) / 15);
    return h;
  }
  // the 1903 Flyer: model faces -z; spans x; lower wing at y 0.55
  function buildFlyer(b, glider) {
    const span = glider ? 9.8 : 12.3, chord = glider ? 1.5 : 1.98, gap = glider ? 1.45 : 1.85, y0 = 0.55;
    const C = 0xf0e8d4, WOODC = 0x8a6a44;
    for (const y of [y0, y0 + gap]) {
      b.box(0, y, 0, span, 0.05, chord, C);
      for (let i = -6; i <= 6; i++) b.box(i * span / 13, y + 0.025, 0, 0.03, 0.03, chord, 0xd8ccb0);
      // the wingtips droop a little and are rounded off
      b.box(-span / 2 - 0.15, y - 0.03, 0, 0.3, 0.04, chord * 0.85, C); b.box(span / 2 + 0.15, y - 0.03, 0, 0.3, 0.04, chord * 0.85, C);
    }
    for (let i = -4; i <= 4; i++) { const x = i * span / 9; b.rod([x, y0, -chord / 2 + 0.05], [x, y0 + gap, -chord / 2 + 0.05], 0.02, WOODC, 4); b.rod([x, y0, chord / 2 - 0.05], [x, y0 + gap, chord / 2 - 0.05], 0.02, WOODC, 4); }
    // front elevator (two small wings) on outriggers
    const ez = glider ? -2.2 : -3.0;
    for (const y of [y0 + 0.5, y0 + 1.05]) b.box(0, y, ez, glider ? 2.6 : 4.4, 0.04, glider ? 0.6 : 0.9, C);
    b.rod([-0.6, y0, -chord / 2], [-0.4, y0 + 0.5, ez], 0.02, WOODC, 4); b.rod([0.6, y0, -chord / 2], [0.4, y0 + 0.5, ez], 0.02, WOODC, 4);
    b.rod([-0.6, y0 + gap, -chord / 2], [-0.4, y0 + 1.05, ez], 0.02, WOODC, 4); b.rod([0.6, y0 + gap, -chord / 2], [0.4, y0 + 1.05, ez], 0.02, WOODC, 4);
    // rudder(s) behind
    const rz = glider ? 2.2 : 2.9;
    for (const x of glider ? [0] : [-0.32, 0.32]) b.box(x, y0 + 0.2, rz, 0.04, 1.6, 0.55, C);
    b.rod([-0.5, y0, chord / 2], [0, y0 + 0.4, rz], 0.02, WOODC, 4); b.rod([0.5, y0 + gap, chord / 2], [0, y0 + 1.6, rz], 0.02, WOODC, 4);
    // skids
    b.box(-0.5, 0, -0.6, 0.06, 0.06, 4.2, WOODC); b.box(0.5, 0, -0.6, 0.06, 0.06, 4.2, WOODC);
    b.rod([-0.5, 0.05, -2.6], [-0.5, y0, -1.6], 0.02, WOODC, 4); b.rod([0.5, 0.05, -2.6], [0.5, y0, -1.6], 0.02, WOODC, 4);
    if (!glider) {
      // the engine (right of centre), the radiator and the chains to the propellers
      b.box(0.45, y0 + 0.05, 0.1, 0.55, 0.38, 0.6, 0x4a4a4e); b.box(0.45, y0 + 0.43, 0.2, 0.3, 0.3, 0.12, 0x6a6a6e);
      b.rod([0.45, y0 + 0.25, 0.4], [-1.6, y0 + 0.9, 1.15], 0.012, 0x2a2a2a, 4); b.rod([0.45, y0 + 0.25, 0.4], [1.6, y0 + 0.9, 1.15], 0.012, 0x2a2a2a, 4);
      b.box(-0.35, y0 + 0.05, 0.2, 0.5, 0.05, 1.3, 0x8a6a44); // the hip cradle where the pilot lies
    }
  }
  function buildCamp(S) {
    S.bounds(-150, -150, 135, 150);
    S.ground(height);
    S.add(terrainMesh(-180, -180, 200, 180, 4, height, (x, z, y) => (y < -1 ? 0x7a8a8a : vnoise(x * 0.12, z * 0.12, 3) > 0.25 ? SAND2 : x > 95 ? 0xe0d6b8 : SAND)));
    const m = S.gb('main'), gl = S.gb('glow'), sh = S.gb('shell');
    // the cold grey Atlantic
    const wb = new GB(); wb.box(400, -1.6, 0, 560, 0.05, 600, 0xffffff); const sea = wb.mesh(R.mat.water, { cast: false }); sea.material = sea.material.clone(); sea.material.color.set(0x5a7078); S.add(sea);
    const surf = S.obj((b) => { for (let i = 0; i < 12; i++) b.box(126 + (i % 3) * 2, -1.45, -280 + i * 48, 1.2, 0.08, 46, 0xf4f4f0); }, 0, 0, 0);
    S.tick((dt, t) => { surf.position.x = Math.sin(t * 0.6) * 2.5; });
    // icy puddles
    for (const [x, z, r] of [[-4, -4, 2.2], [6, 8, 1.6], [-26, -20, 2.8], [10, -24, 2], [-30, 2, 1.4]]) m.cyl(x, height(x, z) + 0.02, z, r, 0.02, 0xa8bcc8, { seg: 12 });
    // tufts of dune grass
    for (let i = 0; i < 160; i++) { const x = rnd(-120, 100), z = rnd(-120, 120); if (Math.abs(x - RAILX) < 6 && z < 8 && z > -50) continue; const h = height(x, z); for (let k = 0; k < 4; k++) m.box(x + rnd(-0.3, 0.3), h, z + rnd(-0.3, 0.3), 0.05, rnd(0.3, 0.6), 0.05, 0x8a8a5a, { rx: rnd(-0.4, 0.4), rz: rnd(-0.4, 0.4) }); }
    // ---- the camp: the 1903 hangar (open on its north side) and the living shed ----
    const hx = RAILX, hz = 12.5;
    const shed = (x, z, w, d, h, open) => {
      sh.box(x, 0, z + d / 2, w, h, 0.12, 0xa89a80); sh.box(x - w / 2, 0, z, 0.12, h, d, 0xa89a80); sh.box(x + w / 2, 0, z, 0.12, h, d, 0xa89a80);
      if (!open) sh.box(x, 0, z - d / 2, w, h, 0.12, 0xa89a80);
      for (let i = 0; i <= w; i += 0.4) sh.box(x - w / 2 + i, 0, z + d / 2 + 0.07, 0.04, h, 0.02, 0x8a7a64);
      sh.box(x, 0, z, w, 0.06, d, 0x9a8a6a);
      m.shape([[-d / 2 - 0.4, 0], [0, 1.6], [d / 2 + 0.4, 0]], w + 0.6, 0x6a6058, { x, y: h, z, ry: -Math.PI / 2 });
      S.solidBox(x, z + d / 2, w, 0.3); S.solidBox(x - w / 2, z, 0.3, d); S.solidBox(x + w / 2, z, 0.3, d);
      if (!open) S.solidBox(x, z - d / 2, w, 0.3);
    };
    shed(hx, hz, 14, 7, 2.9, true);
    m.box(hx - 3.5, 2.9, hz - 3.6, 7, 0.08, 2.4, 0x9a8a6a, { rx: -0.5 }); m.box(hx + 3.5, 2.9, hz - 3.6, 7, 0.08, 2.4, 0x9a8a6a, { rx: -0.5 }); // doors propped up
    shed(hx, 23, 7.6, 4.9, 2.6, false);
    m.box(hx + 2, 0, 20.5, 1.0, 1.9, 0.08, 0x6a5a48); gl.box(hx - 1.6, 1.2, 20.52, 0.8, 0.6, 0.02, 0xc8d4d8);
    m.cyl(hx + 3.2, 2.6, 23.6, 0.12, 1.2, 0x5a5a5a, { seg: 6 });
    S.emitter(hx + 3.2, 4, 23.6, { color: 0xb8b8b8, size: 1.2, rise: 0.8, life: 3, n: 10, opacity: 0.35, drift: [0.8, 1.4] });
    // barrels, crates and a workbench
    for (const [x, z] of [[-5, 18], [-4.2, 18.6], [-22.5, 18]]) { m.cyl(x, 0, z, 0.35, 0.9, 0x7a5a3a, { seg: 8 }); S.solidCircle(x, z, 0.4); }
    m.box(-6, 0, 15.5, 1.6, 0.85, 0.7, 0x8a6a44); S.solidBox(-6, 15.5, 1.6, 0.7);
    // ---- the Flyer, waiting in the hangar ----
    const flyer = S.obj((b) => buildFlyer(b, false), hx, height(hx, hz), hz);
    const props = [-1.6, 1.6].map((x) => { const p = S.obj((b) => { b.box(0, 0, 0, 2.6, 0.12, 0.05, 0x8a6a44); }, x, 1.45, 1.2); flyer.add(p); p.position.set(x, 1.45, 1.2); return p; });
    const dolly = S.obj((b) => { b.box(0, 0, 0, 0.6, 0.18, 0.5, 0x6a4a2a); b.box(0, 0.18, 0, 1.4, 0.08, 0.3, 0x7a5a34); }, hx, 0.12, hz);
    S.data.flyer = flyer;
    S.data.spin = 0;
    S.tick((dt) => { S.data.spin = lerp(S.data.spin, S.data.spinTo || 0, Math.min(1, dt * 1.5)); for (const p of props) p.rotation.z += S.data.spin * dt * 30; if (S.data.spin > 0.2 && Math.random() < dt * 14) AU.burst(0.08, { f: 140 + S.data.spin * 60, q: 0.6, v: 0.04 * S.data.spin }); });
    // ---- the launching rail: four 15-foot sections, laid when you carry them out ----
    const railSlots = [];
    for (let i = 0; i < 4; i++) {
      const z = RAIL0 - 2.25 - i * 4.5;
      const piece = S.obj((b) => { b.box(0, 0, 0, 0.15, 0.1, 4.45, 0x6a4a2a); b.box(0, 0.1, 0, 0.05, 0.04, 4.45, 0x8a8a8a); for (let k = -2; k <= 2; k++) b.box(0, -0.02, k * 1, 0.6, 0.04, 0.12, 0x5a3a20); }, RAILX, height(RAILX, z) + 0.02, z);
      piece.visible = false;
      railSlots.push(piece);
      S.spot('slot' + (i + 1), RAILX + 0.9, z, { r: 2, dy: 0.4, label: 'Lay the rail here', reach: 3.4, place: { x: -999, y: -999, z: -999 }, onDrop: (it) => { piece.visible = true; if (it) it.obj.visible = false; } });
      // the pile of rail pieces by the hangar
      const it = S.obj((b) => { b.box(0, 0, 0, 0.15, 0.1, 4.45, 0x6a4a2a); b.box(0, 0.1, 0, 0.05, 0.04, 4.45, 0x8a8a8a); }, -4.5, 0.05 + i * 0.12, 9 + (i % 2) * 0.3, 0.05);
      S.item('rail' + (i + 1), it, { kind: 'rail', label: 'a section of rail', dy: 0.3, carryScale: 0.22, carryYaw: Math.PI / 2 });
    }
    S.data.layRails = () => { for (const p of railSlots) p.visible = true; for (let i = 1; i <= 4; i++) { const it = S.items['rail' + i]; it.gone = true; it.obj.visible = false; } };
    // ---- the signal flag that calls the lifesaving station ----
    m.cyl(-6, 0, 20, 0.06, 6, 0x8a7a6a, { seg: 6 });
    const flag = S.obj((b) => { b.box(0.45, 0, 0, 0.9, 0.55, 0.02, 0xc8302a); }, -6, 0.6, 20);
    S.spot('flag', -6.6, 20.8, { r: 2, dy: 0.6, label: 'Raise the signal flag' });
    S.data.raiseFlag = () => new Promise((res) => { let y = 0.6; const f = (dt, t) => { if (y < 5.4) { y += dt * 2; flag.position.y = y; } else if (!S.data.flagUp) { S.data.flagUp = true; res(); } flag.rotation.y = Math.sin(t * 5) * 0.25; flag.scale.x = 0.9 + Math.sin(t * 9) * 0.1; }; S.tick(f); });
    S.tick((dt, t) => { flag.rotation.y = Math.sin(t * 5) * 0.25; });
    // ---- the 1902 glider, tethered by the dune for kite flying ----
    const glider = S.obj((b) => buildFlyer(b, true), 26, height(26, 38) + 1.4, 38, 0.15);
    glider.rotation.x = -0.12;
    S.tick((dt, t) => { glider.rotation.z = Math.sin(t * 1.3) * 0.08 + Math.sin(t * 3.1) * 0.03; glider.position.y = height(26, 38) + 1.4 + Math.sin(t * 0.9) * 0.2; });
    for (const s of [-1, 1]) m.rod([26 + s * 4.5, height(26, 38) + 2, 38], [26 + s * 1.2, height(26, 40.5), 40.5], 0.01, 0x3a3a3a, 3);
    // ---- the camera Orville set up on its tripod, aimed at the end of the rail ----
    const cx = RAILX - 9, cz = -10;
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; m.rod([cx + Math.cos(a) * 0.4, 0, cz + Math.sin(a) * 0.4], [cx, 1.2, cz], 0.02, 0x5a4a3a, 4); }
    m.box(cx, 1.2, cz, 0.35, 0.3, 0.45, 0x3a2a1a, { ry: 0.8 }); m.cyl(cx + 0.2, 1.3, cz - 0.2, 0.08, 0.15, 0x2a2a2a, { rx: Math.PI / 2, seg: 8 });
    S.spot('camera', cx + 0.8, cz + 1.2, { r: 2.2 });
    S.data.cam = { pos: [cx - 0.3, 1.45, cz + 0.6], look: [RAILX + 1, 1.3, -13], fov: 58 };
    // ---- the lifesaving station, far off near the beach, with its lookout tower ----
    m.box(92, height(92, -30), -30, 12, 4, 7, 0x8a8a7a); m.frustum(92, height(92, -30) + 4, -30, 12.4, 2.5, 7.4, 0.2, 0x5a4a4a);
    m.box(98, height(98, -30), -30, 3, 9, 3, 0x9a9a8a); m.frustum(98, height(98, -30) + 9, -30, 3.6, 1.5, 3.6, 0.1, 0x5a4a4a);
    // the weather station mast at Kitty Hawk far to the north
    m.cyl(40, 0, -140, 0.15, 14, 0x6a6a6a, { seg: 5 });
    // ---- people ----
    S.actor('wilbur', -10, 19, -0.6);
    S.actor('orville', -11, 10.5, 0.4);
    const men = ['daniels', 'etheridge', 'moore'];
    men.forEach((id, i) => S.actor(id, 40 + i * 1.5, -4 + i, -1.6).show(false));
    S.data.menArrive = () => Promise.all(men.map((id, i) => { const a = S.actors[id]; a.show(true); a.tp(22 + i * 1.6, -2 + i * 1.2); a.speed = 3.2; return a.walkTo(-7 - i * 1.4, -6 + i * 1.4, { face: [RAILX, -6] }); }));
    S.data.menHere = () => men.forEach((id, i) => { const a = S.actors[id]; a.show(true); a.tp(-7 - i * 1.4, -6 + i * 1.4); a.face(RAILX, -6); });
    // the Flyer comes out of the hangar onto the rail
    S.data.flyerOut = (instant) => {
      const z0 = flyer.position.z, z1 = RAIL0 - 3.2;
      if (instant) { flyer.position.set(RAILX, 0.12, z1); dolly.position.set(RAILX, 0.12, z1 + 0.4); return Promise.resolve(); }
      return new Promise((res) => { let k = 0; S.tick((dt) => { if (k >= 1) return; k = Math.min(1, k + dt / 4); const z = lerp(z0, z1, smooth(0, 1, k)); flyer.position.set(RAILX, 0.12, z); dolly.position.set(RAILX, 0.12, z + 0.4); if (k >= 1) res(); }); });
    };
    // the flight: the run along the rail, the lift-off, twelve seconds of up-and-down, the landing
    S.data.fly = (o = {}) => new Promise((res) => {
      const pilot = S.actors[o.pilot || 'orville'], runner = S.actors[o.runner || 'wilbur'];
      const z0 = flyer.position.z, dist = o.dist || (LIFT - LAND);
      let t = 0, z = z0, v = 0, y = 0.12, phase = 'rail';
      S.data.spinTo = 1.5;
      pilot.anim = 'lie'; pilot.seated = true;
      S.tick((dt) => {
        if (phase === 'done') return;
        t += dt;
        if (phase === 'rail') { v = Math.min(v + dt * 2.2, 3.4); z -= v * dt; runner.x = RAILX + 6.2; runner.z = z + 0.3; runner.anim = 'walk'; runner.t += dt; runner.yaw = runner.wantYaw = Math.PI; if (z <= LIFT) { phase = 'air'; t = 0; } }
        else if (phase === 'air') {
          const k = (LIFT - z) / dist;
          z -= dist / (o.time || 12) * dt;
          y = 0.12 + Math.sin(Math.min(1, k) * Math.PI) * 2.6 + Math.sin(k * 14) * 0.5 * Math.sin(Math.min(1, k) * Math.PI);
          flyer.rotation.x = Math.cos(k * 14) * 0.08;
          runner.anim = 'cheer';
          if (k >= 1) { phase = 'done'; y = 0.12; flyer.rotation.x = 0; S.data.spinTo = 0; AU.ui('thud'); res(); }
        }
        flyer.position.set(RAILX, y, z); dolly.position.z = Math.max(z + 0.4, RAIL1 + 0.5);
        pilot.x = RAILX - 0.35; pilot.z = z + 0.6; pilot.fixedY = y + 0.62; pilot.yaw = pilot.wantYaw = Math.PI;
      });
    });
    S.data.flyerAt = (z) => { flyer.position.set(RAILX, 0.12, z); };
  }

  const look = (o) => Object.assign({ skin: SKIN.fair, shoes: 0x2a1a10, h: 1.75 }, o);
  Scenarios.add({
    id: 'kittyhawk', title: 'The first flight', place: 'Kill Devil Hills, near Kitty Hawk, North Carolina', when: 'December 17, 1903', year: 1903, color: 0x3a8ac8,
    blurb: 'Test wings in a wind tunnel, fly a glider like a kite, lay the launching rail and take the famous photograph as the Wright brothers fly for the first time.',
    role: "You're the Wright brothers' helper at their camp.",
    homeLine: "You look frozen! Kill Devil Hills in December, I'll bet. Did they fly?",
    souvenir: { name: 'a scrap of wing fabric', text: 'A little square of the fine cotton cloth that covered the wings of the 1903 Flyer.', build(b) { b.box(0, 0, 0, 0.3, 0.03, 0.3, 0x5a4a3a); b.box(0, 0.03, 0, 0.24, 0.01, 0.2, 0xf0e8d4, { ry: 0.2 }); b.box(0.02, 0.04, 0, 0.2, 0.004, 0.012, 0xd8ccb0, { ry: 0.2 }); } },
    note: 'Wilbur and Orville Wright, John T. Daniels, Adam Etheridge, Johnny Moore and Charlie Taylor were real people. You, the helper, are the only made-up person here. The camp, the rail and the four flights follow the brothers\' own diaries and letters.',
    cast: {
      wilbur: { name: 'Wilbur Wright', title: 'the older brother', real: true, about: 'Born in 1867. He watched birds for hours and came up with wing-warping.', voice: { pitch: 0.85, rate: 1 },
        look: look({ hair: 0x5a4a3a, hairStyle: 'balding', top: 0x3a3a40, topStyle: 'suit', tie: 0x2a2a2a, bottom: 0x3a3a40, hat: 'cap', hatCol: 0x4a4a4a, h: 1.78, w: 0.92 }),
        lines: ['We read every book about flying we could find. Then we decided to find out for ourselves.', 'We came to Kitty Hawk because it has strong, steady winds and soft sand to land on.'] },
      orville: { name: 'Orville Wright', title: 'the younger brother', real: true, about: 'Born in 1871. He flew the first flight and lived until 1948, long enough to see jet planes.', voice: { pitch: 1.0, rate: 1.05 },
        look: look({ hair: 0x4a3a2a, hairStyle: 'short', beard: 'moustache', top: 0x4a4038, topStyle: 'suit', tie: 0x6a2a2a, bottom: 0x4a4038, hat: 'flatcap', hatCol: 0x5a5048, h: 1.72 }),
        lines: ['We make our own tools, our own engine, even our own propellers. If you can\'t buy it, build it!', 'Our sister Katharine looks after the shop in Dayton while we are away.'] },
      daniels: { name: 'John T. Daniels', title: 'Kill Devil Hills Life-Saving Station', real: true, about: 'A surfman at the lifesaving station who took the famous photograph of the first flight, the first time he ever used a camera.', voice: { pitch: 0.9 },
        look: look({ skin: SKIN.light, hair: 0x2a2a2a, beard: 'moustache', top: 0x2a3050, topStyle: 'jacket', bottom: 0x2a3050, hat: 'cap', hatCol: 0x2a3050, h: 1.8, w: 1.1 }),
        lines: [{ t: 'We\'re surfmen. When a ship runs aground out there, we row out in the storm and bring the sailors home.', fact: 'station' }, 'The boys at the station think these Wright fellows are a little bit crazy. Good crazy, mind.'] },
      etheridge: { name: 'Adam Etheridge', title: 'Kill Devil Hills Life-Saving Station', real: true, about: 'Another surfman from the station who helped carry the Flyer and watched the flights.', voice: { pitch: 0.8 },
        look: look({ skin: SKIN.fair, hair: 0x6a4a2a, top: 0x2a3050, topStyle: 'jacket', bottom: 0x2a3050, hat: 'cap', hatCol: 0x2a3050 }),
        lines: ['Cold enough to freeze the ears off a rabbit this morning!'] },
      moore: { name: 'Johnny Moore', title: 'a boy from Nags Head', real: true, about: 'A teenage boy who happened to come along and saw the first flights.', voice: { pitch: 1.35, rate: 1.1 },
        look: look({ hair: 0xb07a3a, hairStyle: 'short', top: 0x6a5a3a, topStyle: 'jacket', bottom: 0x4a4a4a, hat: 'flatcap', hatCol: 0x5a4a3a, h: 1.55, kid: true }),
        lines: ['I just came along to see what all the fuss was about. Wait till I tell everybody in Nags Head!'] },
    },
    facts: {
      bikes: { t: 'Bicycle makers', x: 'Wilbur and Orville Wright ran a *bicycle shop* in Dayton, Ohio. They used the money, tools and skills from building bicycles to build their flying machines.' },
      tunnel: { t: 'The wind tunnel', x: 'In 1901 the Wrights built a *wind tunnel*, a wooden box with a fan, and tested about 200 little model wings. They found that long, narrow wings with a gentle curve worked best.' },
      glides: { t: 'Learning to glide', x: 'In 1902 the brothers made *hundreds of glides* from the dunes here, learning to fly before they ever added an engine.' },
      warp: { t: 'Wing-warping', x: 'To keep their machine balanced, the Wrights twisted the wingtips in opposite directions, an idea from watching birds. They called it *wing-warping*. Planes today use flaps on the wings called *ailerons* to do the same job.' },
      rail: { t: 'The Junction Railroad', x: 'The Flyer took off from a *60-foot wooden rail*, rolling along on a little wheeled truck. The brothers jokingly called the rail the "Junction Railroad".' },
      engine: { t: 'A home-made engine', x: 'No company could sell the Wrights an engine that was light and strong enough, so their mechanic *Charlie Taylor* built one in about six weeks. It made about 12 horsepower.' },
      coin: { t: 'The coin toss', x: 'On December 14, Wilbur won a *coin toss* to go first. The Flyer stalled and bumped down after about three seconds. After repairs, it was Orville\'s turn on December 17.' },
      photo: { t: 'The famous photo', x: '*John T. Daniels* had never used a camera before. He squeezed the bulb at just the right moment and took one of the most famous photographs in history.' },
      first: { t: 'Twelve seconds', x: 'At 10:35 in the morning on December 17, 1903, Orville flew for *12 seconds* and *120 feet* (37 metres). It was the first controlled flight of a powered airplane with a pilot.' },
      four: { t: 'Four flights', x: 'The brothers made four flights that day. The longest, by Wilbur, went *852 feet* (260 metres) in 59 seconds. Then a gust of wind flipped the Flyer over and broke it. It never flew again.' },
      telegram: { t: 'The telegram', x: 'Orville sent a telegram home to their father: *"Success four flights thursday morning … home Christmas."*' },
      moon: { t: 'From Kitty Hawk to the Moon', x: 'In 1969, *Neil Armstrong* carried a piece of the 1903 Flyer\'s wing fabric and a piece of its propeller to the Moon on Apollo 11.' },
      station: { t: 'The lifesavers', x: 'The men who helped the Wrights came from the *Kill Devil Hills Life-Saving Station*. They rowed out in storms to rescue sailors from shipwrecks on this dangerous coast.' },
    },
    sets: {
      camp: { amb: 'wind', surf: 'sand', build: buildCamp,
        env: { top: 0x7a8a9a, hor: 0xc4c8c4, bot: 0xa8a490, sun: [0.55, 0.35, 0.6], sunCol: 0xf0ece0, sunI: 0.55, sunSize: 3, hemiSky: 0xd0d8e0, hemiGround: 0x9a9480, hemiI: 0.62, amb: 0.1, fog: 0xbcc0bc, fogD: 0.0045, clouds: 0.85, cloudCol: 0xd8dcdc } },
    },
    chapters: [
      { title: 'Camp', set: 'camp', start: [-7, 16, 'wilbur'], steps: [
        { chat: [
          ['wilbur', "Brrr! Good morning! You must be our new helper. I'm Wilbur Wright."],
          ['wilbur', 'It\'s freezing, and the wind is blowing more than twenty miles an hour. Those puddles have ice on them!'],
          ['wilbur', 'My brother Orville is in the hangar with our machine. Go and say hello.'],
        ] },
        { goal: 'Find *Orville* in the hangar', talk: 'orville' },
        { chat: [
          ['orville', 'Hello there! Mind the wires. This is our *Flyer*.'],
          ['orville', 'Back home in Dayton, Ohio, we run a bicycle shop. We build bicycles, and now flying machines!'],
        ], fact: 'bikes' },
        { chat: [
          ['orville', 'A couple of years ago we found that the numbers everyone used for designing wings were wrong. So we built our own *wind tunnel* to test wing shapes.'],
          ['orville', 'Here are our test models. See if you can find the best wing, the way we did!'],
        ] },
        { play: 'tunnel', need: 3, wings: [
          { name: 'Flat plate', camber: 0, aspect: 3, lift: 3, note: 'A flat wing hardly lifts at all.' },
          { name: 'Deep curve', camber: 0.12, aspect: 3, lift: 5, note: 'More lift, but it pushes hard against the air. That\'s called drag.' },
          { name: 'Gentle curve', camber: 0.05, aspect: 2, lift: 6, note: 'Better! A gentle curve works well.' },
          { name: 'Long and narrow', camber: 0.05, aspect: 6, lift: 9, note: 'The best so far! A long, narrow wing with a gentle curve.' },
        ], winText: "That's just what we found: long, narrow wings with a gentle curve. We built the Flyer's wings that way!", fact: 'tunnel' },
        { chat: [['orville', 'We tested about two hundred little wings in that tunnel.'], ['orville', 'Wilbur is out by the old glider, near the dune. He\'ll show you how we keep our balance in the air.']] },
      ] },
      { title: 'Balancing act', set: 'camp', start: [-2, 18, 'wilbur'], setup(S) { S.actors.wilbur.tp(23, 34.5, -0.4); }, steps: [
        { goal: 'Find *Wilbur* by the old glider', talk: 'wilbur' },
        { chat: [
          ['wilbur', 'This is our glider from last year. We made hundreds of glides with it from Big Kill Devil Hill, over there.'],
          ['wilbur', "The hardest part of flying isn't getting up into the air. It's *balance*. A gust can tip you over in a second."],
        ], fact: 'glides' },
        { ask: 'wilbur', q: "Birds don't fall over in the wind. How do you think they keep their balance?", a: [
          ['They twist the tips of their wings', true, 'Exactly! I watched buzzards do it. We twist our wingtips too. We call it *wing-warping*.'],
          ['They flap faster', false, "Flapping keeps them up, but it doesn't keep them level. Watch the tips of a bird's wings in a gust…"],
          ['They hold their tail very still', false, 'The tail helps a little, but watch what the tips of their wings do when a gust hits…'],
        ], fact: 'warp' },
        { chat: [['wilbur', 'I got the idea twisting a long cardboard box in our shop. When I twisted the ends in opposite directions, I could see how a wing could twist too!'], ['wilbur', "Let's fly the glider like a kite. Pull the cords to twist the wings and keep it level."]] },
        { play: 'kite', time: 14, winText: "Steady as a bird! That's exactly how the pilot keeps the Flyer level." },
        { chat: [['wilbur', "You're a natural! Now, help us lay the track. The Flyer takes off from a rail."]] },
      ] },
      { title: 'The launching rail', set: 'camp', start: [-8, 10, 0], steps: [
        { goal: 'Lay the four sections of the *launching rail*', each: [{ bring: 'rail', use: 'slot1' }, { bring: 'rail', use: 'slot2' }, { bring: 'rail', use: 'slot3' }, { bring: 'rail', use: 'slot4' }], hint: 'Carry a section from the pile by the hangar.' },
        { chat: [['wilbur', 'Sixty feet of track, pointing straight into the wind. We call it the *Junction Railroad*!'], ['wilbur', 'Now raise the *signal flag* on the pole by the shed. It tells the men at the lifesaving station to come and help.']], fact: 'rail' },
        { goal: 'Raise the *signal flag*', use: 'flag' },
        { do: (S) => S.data.raiseFlag() },
        { do: (S) => S.data.menArrive() },
        { chat: [['daniels', "Morning, boys! Cold enough for you? We saw your flag."], ['wilbur', "Thank you for coming, John. We think today's the day."]] },
        { do: (S) => S.data.flyerOut() },
        { chat: [
          ['orville', 'We couldn\'t buy an engine light enough, so our mechanic *Charlie Taylor* built one in just six weeks. Twelve horsepower!'],
          ['orville', 'And we designed the propellers ourselves. They\'re really just spinning wings.'],
        ], fact: 'engine' },
      ] },
      { title: 'Twelve seconds', set: 'camp', start: [-9, -2, 'orville'], setup(S) { S.data.layRails(); S.data.menHere(); S.data.flyerOut(true); S.actors.orville.tp(-12.5, 0, Math.PI * 0.7); S.actors.wilbur.tp(-8.5, -0.5, -Math.PI / 2); }, steps: [
        { chat: [
          ['orville', 'On Monday Wilbur won the coin toss and tried first, but the machine stalled. So today it\'s my turn!'],
          ['orville', "I've set up my camera, pointing at the end of the rail. Mr. Daniels, would you squeeze the bulb when it lifts off?"],
          ['daniels', "Me? I've never worked one of those contraptions in my life!"],
          ['orville', 'Our helper will show you. Go to the camera!'],
        ], fact: 'coin' },
        { goal: 'Go to the *camera* with Mr. Daniels', to: 'camera' },
        { do: (S) => { const d = S.actors.daniels; d.tp(S.spots.camera.x - 0.6, S.spots.camera.z - 0.4); S.actors.wilbur.tp(RAILX + 6.2, RAIL0 - 3); S.data.spinTo = 1; AU.ui('engine'); }, wait: 1.5 },
        { play: 'photo', winText: 'Click! You got it, just as it lifted off. One of the most famous photographs ever taken!', fact: 'photo' },
        { do: (S) => { PL.cut = S.data.cam; return S.data.fly({ pilot: 'orville', runner: 'wilbur' }); } },
        { do: (S) => { AU.ui('cheer'); for (const id of ['daniels', 'etheridge', 'moore']) S.actors[id].set('cheer'); const o = S.actors.orville; o.fixedY = null; o.seated = false; o.tp(RAILX - 2.5, LAND + 1.5, Math.PI).set('cheer'); }, wait: 1.5 },
        { do: () => { PL.cut = null; } },
        { chat: [
          ['wilbur', 'He did it! Twelve seconds in the air!'],
          ['orville', 'A hundred and twenty feet! Nobody has ever flown a powered machine with a pilot, under control, before!'],
          ['daniels', "Well, I'll be. I reckon I just saw history."],
        ], fact: 'first' },
      ] },
      { title: 'Four flights', set: 'camp', start: [-8, -30, 'orville'], setup(S) { S.data.layRails(); S.data.menHere(); S.data.flyerAt(LAND); S.actors.orville.tp(-11, -40, 0.5); S.actors.wilbur.tp(-17, -42, -0.4); }, steps: [
        { chat: [['wilbur', 'We took turns, all morning. Each flight went a little farther.'], ['orville', 'Wilbur\'s last one went eight hundred and fifty-two feet, almost a whole minute in the air!']] },
        { say: 'narrator', text: 'Then a strong gust caught the Flyer on the ground and tumbled it over, breaking it. It never flew again, but it had done its job.', fact: 'four' },
        { goal: 'Talk to *Orville*', talk: 'orville' },
        { chat: [['orville', "I'm going to walk to the weather station at Kitty Hawk and send a telegram to our father. Help me write it!"]] },
        { ask: 'orville', q: "What's the most important thing to tell Father?", a: [
          ['Success: four flights this morning!', true, "That's it! \"Success four flights thursday morning\"… and we'll tell him we'll be home for Christmas."],
          ['The weather is terribly cold', false, 'True, but Father will want to know something much more important than the weather!'],
          ['We need more money', false, "Ha! Maybe we do, but that's not the big news today."],
        ], fact: 'telegram' },
        { chat: [['orville', 'Thank you, helper. Pop will be so proud.']] },
        { say: 'narrator', text: 'Sixty-six years later, when Apollo 11 flew to the Moon, Neil Armstrong carried a piece of the Flyer\'s wing fabric with him.', fact: 'moon' },
      ] },
    ],
  });
})();
