// The Time Apprentice — Aunt Clio's workshop in the present day: the time machine, its dial (one mark per registered
// event), the souvenir shelf and the journal desk. Everything here is built from the Scenarios registry, so a new event
// shows up on the dial and the shelf without touching this file.

const HUB = Scenarios.add({
  id: 'hub', hub: true, title: "Aunt Clio's workshop", place: "Aunt Clio's workshop", when: 'Today', year: new Date().getFullYear(), color: 0xffc94a,
  cast: {
    clio: { name: 'Aunt Clio', title: 'inventor of the time machine', voice: { pitch: 1.15, rate: 1.02 },
      look: { skin: SKIN.fair, hair: 0xd8d4d0, hairStyle: 'curly', top: 0x7a3a6a, topStyle: 'jacket', shirt: 0xf4ecd8, bottom: 0x3a3a52, bottomStyle: 'dress', apron: 0x8a6a4a, hat: 'goggles', h: 1.66, glasses: 0x8a6a2a },
      lines: [
        'The dial shows every moment I have tuned the machine to. More will appear as I find them!',
        'Remember the golden rule of time travel: we never change history. We help, we watch, and we learn.',
        'Your journal fills up with pages as you learn things. Talk to everyone. People in the past know a lot!',
        'Tock the cat came back from ancient Egypt with me once. Or maybe he was always here. Hard to say with cats.',
      ] },
  },
  facts: {},
  sets: {
    workshop: { amb: 'hub', surf: 'wood', start: [0, 3.6, 0],
      env: { sky: false, fog: 0x2a2030, fogD: 0.0, sun: [0.3, 0.9, 0.5], sunI: 0.35, sunCol: 0xffe8c8, hemiSky: 0xfff0dc, hemiGround: 0x6a4a3a, hemiI: 0.7, amb: 0.22 },
      build: buildWorkshop },
  },
  chapters: [{ title: 'The workshop', set: 'workshop', quiet: true, steps: [] }],
});

function fmtYear(y) { return y < 0 ? (-y) + ' BC' : String(y); }

function buildWorkshop(S) {
  const W = 8, Dp = 6, H = 4.2;
  S.bounds(-W + 0.4, -Dp + 0.4, W - 0.4, Dp - 0.4);
  S.ground(() => 0);
  const sh = S.gb('shell'), m = S.gb('main'), gl = S.gb('glow');
  // floor boards, walls, beams
  for (let i = 0; i < 16; i++) sh.box(-W + i + 0.5, -0.05, 0, 0.98, 0.05, Dp * 2, i % 2 ? 0x9a6a42 : 0x8e6240, { j: 0.05 });
  sh.box(0, H, 0, W * 2, 0.2, Dp * 2, 0x5a4030);
  for (const z of [-Dp, Dp]) sh.box(0, 0, z, W * 2, H, 0.2, 0xb87a5a);
  for (const x of [-W, W]) sh.box(x, 0, 0, 0.2, H, Dp * 2, 0xb87a5a);
  for (const z of [-Dp + 0.12, Dp - 0.12]) sh.box(0, 0, z, W * 2, 1.0, 0.06, 0x6a4a34);
  for (const x of [-W + 0.12, W - 0.12]) sh.box(x, 0, 0, 0.06, 1.0, Dp * 2, 0x6a4a34);
  for (let x = -6; x <= 6; x += 3) sh.box(x, H - 0.35, 0, 0.3, 0.35, Dp * 2, 0x5a3a26);
  // brick texture on the walls: a few darker bricks
  for (let i = 0; i < 120; i++) { const x = rnd(-W + 0.3, W - 0.3), y = rnd(1.1, H - 0.4); sh.box(x, y, -Dp + 0.11, 0.42, 0.16, 0.02, rpick([0xa86a4a, 0xc88a6a, 0x9a5a3a])); }
  // the big round window on the south wall, with the city outside
  gl.cyl(0, 2.3, Dp - 0.08, 1.5, 0.04, 0xbfe0f4, { rx: Math.PI / 2, seg: 24 });
  gl.box(-0.8, 1.4, Dp - 0.11, 0.5, 0.9, 0.02, 0x7a9ab4); gl.box(0.5, 1.4, Dp - 0.11, 0.6, 1.3, 0.02, 0x6a8aa4); gl.box(-0.2, 1.4, Dp - 0.11, 0.4, 0.6, 0.02, 0x8aaac4);
  m.cyl(0, 2.3, Dp - 0.12, 1.6, 0.1, 0x5a3a26, { rx: Math.PI / 2, seg: 24, rt: 1 });
  m.box(0, 2.25, Dp - 0.16, 3.1, 0.1, 0.08, 0x5a3a26); m.box(0, 0.75, Dp - 0.16, 0.1, 3.1, 0.08, 0x5a3a26);
  // rug
  m.cyl(0, 0, 0.8, 2.8, 0.02, 0x8a3a4a, { seg: 20 }); m.cyl(0, 0.005, 0.8, 2.3, 0.02, 0xc8a050, { seg: 20 }); m.cyl(0, 0.01, 0.8, 1.9, 0.02, 0x7a2a3a, { seg: 20 });
  // ---- the time machine ----
  const mz = -3.6;
  m.cyl(0, 0, mz, 2.3, 0.22, 0x6a6a72, { seg: 24 }); m.cyl(0, 0.22, mz, 2.0, 0.06, 0xb88a3a, { seg: 24 });
  S.solidCircle(0, mz, 2.1, { y1: 0.2 });
  const ring = S.obj((b) => {
    b.geo(new THREE.TorusGeometry(1.65, 0.16, 8, 32), 0, 0, 0, 0xc89a40);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; b.cbox(Math.cos(a) * 1.65, Math.sin(a) * 1.65, 0, 0.16, 0.16, 0.42, 0x8a6a2a, { rz: a }); }
    b.geo(new THREE.TorusGeometry(1.3, 0.05, 6, 32), 0, 0, 0, 0x3a3a3a);
  }, 0, 2.15, mz);
  m.box(-1.9, 0, mz, 0.4, 0.5, 0.6, 0x5a5a62); m.box(1.9, 0, mz, 0.4, 0.5, 0.6, 0x5a5a62);
  m.box(-1.75, 0.5, mz, 0.18, 0.9, 0.24, 0xb88a3a); m.box(1.75, 0.5, mz, 0.18, 0.9, 0.24, 0xb88a3a);
  const swirl = new GB();
  for (let k = 0; k < 3; k++) for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + k * 0.4, r0 = 0.15 + k * 0.38; swirl.cbox(Math.cos(a) * r0, Math.sin(a) * r0, 0, 0.32, 0.08, 0.01, [0xffc94a, 0x3fc1b0, 0xc85aa0][k], { rz: a + 1.2 }); }
  const sw = swirl.mesh(R.mat.glowAdd, { cast: false, receive: false }); sw.position.set(0, 2.15, mz); S.add(sw);
  S.solidBox(0, mz, 3.8, 0.6);
  // the console and its dial: one coloured mark per event, in date order
  const cx = 2.7, cz = -2.4;
  m.box(cx, 0, cz, 0.9, 1.0, 0.7, 0x4a4a52); m.box(cx, 1.0, cz, 1.05, 0.08, 0.85, 0xb88a3a);
  const dial = S.obj((b) => {
    b.cyl(0, 0, 0, 0.36, 0.05, 0xf4ecd8, { seg: 24 });
    const list = Scenarios.sorted();
    list.forEach((sc, i) => { const a = (i / Math.max(1, list.length)) * TAU; b.box(Math.sin(a) * 0.27, 0.04, Math.cos(a) * 0.27, 0.08, 0.03, 0.08, sc.color); });
    b.box(0, 0.05, 0.12, 0.03, 0.03, 0.26, 0x2a2a2a);
  }, cx, 1.08, cz, 0);
  dial.rotation.x = -0.35;
  for (let i = 0; i < 5; i++) gl.box(cx - 0.38 + i * 0.12, 1.08, cz + 0.32, 0.06, 0.03, 0.06, [0xff5a5a, 0x5aff8a, 0xffd25a, 0x5ac8ff, 0xff5a5a][i]);
  m.rod([cx + 0.3, 1.08, cz - 0.2], [cx + 0.42, 1.55, cz - 0.3], 0.03, 0x3a3a3a); m.ball(cx + 0.42, 1.58, cz - 0.3, 0.07, 0xd84a3a);
  S.solidBox(cx, cz, 1.0, 0.8);
  S.spot('dial', cx, cz + 0.5, { y: 0.1, dy: 1.0, label: 'Turn the time dial', use: () => HUD.openEras(travel), reach: 2.6 });
  // ---- the souvenir shelf on the west wall ----
  const shx = -W + 0.45;
  m.box(shx, 0, 0, 0.6, 0.1, 5, 0x6a4a30);
  for (const y of [0.6, 1.3, 2.0]) m.box(shx, y, 0, 0.6, 0.06, 5, 0x7a5a3a);
  for (const z of [-2.5, 2.5]) m.box(shx, 0, z, 0.6, 2.2, 0.06, 0x6a4a30);
  S.solidBox(shx, 0, 0.7, 5.1);
  Scenarios.sorted().forEach((sc, i) => {
    const row = Math.floor(i / 4), col = i % 4, y = [1.36, 0.66, 2.06][row % 3], z = -1.8 + col * 1.2;
    m.box(shx + 0.1, y, z, 0.3, 0.02, 0.5, 0xf4ecd8);
    if (SAVE.data.done[sc.id]) {
      const o = S.obj((b) => { sc.souvenir.build(b); }, shx, y + 0.02, z, Math.PI / 2);
      o.scale.setScalar(sc.souvenir.scale || 1.5);
      S.spot('souv-' + sc.id, shx + 0.6, z, { y: y, dy: 0.15, label: 'Look at the ' + sc.souvenir.name.replace(/^an? /i, ''), reach: 2.6, use: () => HUD.toast(sc.souvenir.name, sc.souvenir.text, 'fact') });
    } else {
      m.ball(shx, y + 0.12, z, 0.1, 0x9a9aa2, { det: 0, sy: 1.2 });
    }
  });
  // ---- the desk with the journal on the east side ----
  const dx = W - 1.3, dz = 1.8;
  m.box(dx, 0.76, dz, 1.4, 0.06, 2.2, 0x7a5232);
  for (const sx of [-0.6, 0.6]) for (const sz of [-1.0, 1.0]) m.box(dx + sx, 0, dz + sz, 0.08, 0.76, 0.08, 0x5a3a22);
  m.box(dx - 0.1, 0.82, dz, 0.5, 0.06, 0.7, 0x7a2a3a); m.box(dx - 0.1, 0.88, dz, 0.46, 0.02, 0.66, 0xf4ecd8);
  m.cyl(dx + 0.4, 0.82, dz - 0.7, 0.1, 0.4, 0x3a3a3a, { seg: 8 }); m.cone(dx + 0.4, 1.2, dz - 0.7, 0.22, 0.2, 0x3a6a4a, { seg: 10 });
  gl.ball(dx + 0.4, 1.17, dz - 0.7, 0.06, 0xfff0c0, { det: 0 });
  S.solidBox(dx, dz, 1.5, 2.3);
  S.spot('journal', dx - 0.8, dz, { y: 0.0, dy: 0.9, label: 'Read your journal', use: () => HUD.openJournal(), reach: 2.4 });
  // bookshelves, a workbench, clocks
  for (const z of [-4.6, 4.6]) {
    m.box(W - 0.4, 0, z, 0.5, 2.6, 1.6, 0x5a3a26);
    for (let s = 0; s < 4; s++) for (let i = 0; i < 9; i++) m.box(W - 0.45, 0.15 + s * 0.62, z - 0.7 + i * 0.16, 0.34, rnd(0.32, 0.48), 0.13, rpick([0x8a2a2a, 0x2a4a7a, 0x3a6a3a, 0xc8a050, 0x5a3a6a]));
    S.solidBox(W - 0.4, z, 0.6, 1.7);
  }
  m.box(-4.4, 0, -5.2, 2.6, 0.9, 0.9, 0x6a4a30); m.box(-4.4, 0.9, -5.2, 2.7, 0.06, 1.0, 0x8a6a40);
  m.box(-5.2, 0.96, -5.3, 0.4, 0.3, 0.3, 0x3a6a8a); m.cyl(-4.3, 0.96, -5.2, 0.12, 0.35, 0xb88a3a, { seg: 8 }); m.ball(-3.6, 1.1, -5.2, 0.14, 0x4a8aaa, { det: 1 });
  S.solidBox(-4.4, -5.2, 2.8, 1.0);
  const clock = S.obj((b) => { b.cyl(0, 0, 0, 0.45, 0.06, 0xf4ecd8, { rx: Math.PI / 2, seg: 20 }); b.geo(new THREE.TorusGeometry(0.46, 0.04, 6, 24), 0, 0, 0, 0xb88a3a); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; b.cbox(Math.sin(a) * 0.38, Math.cos(a) * 0.38, 0.04, 0.03, 0.07, 0.01, 0x2a2a2a, { rz: -a }); } }, -3.2, 3.0, -Dp + 0.15);
  const hand1 = S.obj((b) => b.cbox(0, 0.15, 0, 0.03, 0.3, 0.02, 0x2a2a2a), -3.2, 3.0, -Dp + 0.2), hand2 = S.obj((b) => b.cbox(0, 0.1, 0, 0.04, 0.2, 0.02, 0x2a2a2a), -3.2, 3.0, -Dp + 0.21);
  // a sleeping cat on the rug
  const cat = S.obj((b) => {
    b.ball(0, 0.12, 0, 0.22, 0xd8823a, { sy: 0.55, sz: 0.75 }); b.ball(0.2, 0.14, 0.08, 0.1, 0xd8823a, { det: 1 });
    b.cone(0.25, 0.2, 0.05, 0.035, 0.07, 0xd8823a, { seg: 4 }); b.cone(0.2, 0.2, 0.14, 0.035, 0.07, 0xd8823a, { seg: 4 });
    b.rod([-0.18, 0.06, 0], [-0.1, 0.05, 0.25], 0.03, 0xc8722a); b.rod([-0.1, 0.05, 0.25], [0.1, 0.05, 0.28], 0.03, 0xc8722a);
  }, 1.6, 0, 1.6, 0.6);
  S.spot('cat', 1.6, 1.6, { y: 0, dy: 0.25, label: 'Pet Tock the cat', reach: 2.2, use: () => { HUD.toast('Tock', fpick(['Purrrrr…', 'Tock opens one eye, then goes back to sleep.', 'Mrrrp?', 'Tock stretches and rolls over.'])); AU.tone(90, 0.5, { v: 0.05, type: 'sawtooth' }); } });
  // warm lamps
  const l1 = new THREE.PointLight(0xffc888, 0.9, 14, 1.5); l1.position.set(-2, 3.6, 0); S.add(l1);
  const l2 = new THREE.PointLight(0x8ad8ff, 0.8, 8, 1.5); l2.position.set(0, 2.2, mz + 0.8); S.add(l2);
  for (const x of [-2, 3]) { gl.ball(x, 3.7, 0, 0.16, 0xfff0c0, { det: 1 }); m.rod([x, 3.85, 0], [x, H, 0], 0.015, 0x2a2a2a); }
  S.tick((dt, t) => {
    ring.rotation.z += dt * 0.15; sw.rotation.z -= dt * 1.6; l2.intensity = 0.7 + Math.sin(t * 3) * 0.2;
    const d = new Date(); hand1.rotation.z = -(d.getMinutes() / 60) * TAU; hand2.rotation.z = -((d.getHours() % 12) / 12 + d.getMinutes() / 720) * TAU;
  });
  S.actor('clio', -1.6, -1.2, 0.6);
}

// what Clio says when you arrive in the workshop
function hubSteps() {
  const d = SAVE.data, last = d.last && Scenarios.byId[d.last];
  if (!d.intro) {
    d.intro = true; SAVE.save();
    return [
      { look: 'clio' },
      { chat: [
        ['clio', "There you are! Welcome to my workshop, apprentice. Mind the cat, his name is Tock."],
        ['clio', "Do you see that big brass ring? That's my *time machine*. It can take you to amazing moments in history, while they are happening!"],
        ['clio', "But there's one golden rule. We *never* change history. You'll be a helper: carrying, building, learning from the people who were really there."],
        ['clio', "Everything you learn goes in your *journal* on the desk. Press *J* any time to read it."],
        ['you', 'Where can I go?'],
        ['clio', "Turn the *time dial* on the console and pick a moment. When you come back, bring me a souvenir for the shelf!"],
      ] },
      { goal: 'Turn the *time dial* to choose a moment in history', use: 'dial' },
      { do: () => { HUD.openEras(travel); } },
    ];
  }
  if (last && d.done[last.id] && d.lastSeen !== last.id) {
    d.lastSeen = last.id; SAVE.save();
    const left = Scenarios.sorted().filter((sc) => !d.done[sc.id]);
    return [
      { look: 'clio' },
      { chat: [['clio', last.homeLine || 'Welcome back! What an adventure.'], ['clio', left.length ? `Your souvenir is on the shelf. Ready for the next trip? ${left.length === 1 ? 'There is one more moment on the dial.' : 'There are ' + left.length + ' more moments on the dial.'}` : "That's every moment on the dial! You're a real time apprentice now. You can visit any of them again to find the journal pages you missed."]] },
    ];
  }
  return [];
}
