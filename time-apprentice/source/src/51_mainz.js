// Event: Gutenberg's printing workshop in Mainz, about 1454, while the 42-line Bible is being printed.
// You're the newest apprentice: cast type, set a line backwards, ink and pull the press.

(() => {
  const W = 9, Dp = 6, H = 4.0;
  const PLASTER = 0xece2cc, BEAM = 0x4a3222, WOOD = 0x7a5232, DARK = 0x5a3a24;

  function buildShop(S) {
    S.bounds(-W + 0.4, -Dp + 0.4, W - 0.4, 17.5);
    S.ground(() => 0);
    const sh = S.gb('shell'), m = S.gb('main'), gl = S.gb('glow');
    // floor: boards inside, cobbles in the yard
    for (let i = 0; i < 18; i++) sh.box(-W + i + 0.5, -0.05, 0, 0.98, 0.05, Dp * 2, i % 2 ? 0x8a6a48 : 0x806244, { j: 0.04 });
    for (let x = -W; x < W; x += 0.7) for (let z = Dp; z < 18; z += 0.7) sh.box(x + 0.35, -0.05, z + 0.35, 0.62, 0.06, 0.62, 0x8a8478, { j: 0.12 });
    // walls: plaster between dark timber beams, a door to the yard in the south wall
    const wall = (x, z, w, d) => { sh.box(x, 0, z, w, H, d, PLASTER); S.solidBox(x, z, w, d); };
    wall(0, -Dp, W * 2, 0.3); wall(-W, 0, 0.3, Dp * 2); wall(W, 0, 0.3, Dp * 2);
    wall(-3, Dp, 12, 0.3); wall(7, Dp, 4, 0.3); sh.box(4, 2.6, Dp, 2, H - 2.6, 0.3, PLASTER);
    sh.box(0, H, 0, W * 2 + 0.3, 0.25, Dp * 2 + 0.3, DARK);
    for (let x = -W; x <= W; x += 2.25) { sh.box(x, 0, -Dp + 0.17, 0.22, H, 0.06, BEAM); if (Math.abs(x - 4) > 1.2) sh.box(x, 0, Dp - 0.17, 0.22, H, 0.06, BEAM); }
    for (let z = -Dp; z <= Dp; z += 2) { sh.box(-W + 0.17, 0, z, 0.06, H, 0.22, BEAM); sh.box(W - 0.17, 0, z, 0.06, H, 0.22, BEAM); }
    sh.box(0, 2.0, -Dp + 0.2, W * 2, 0.18, 0.06, BEAM);
    for (let x = -7.5; x <= 7.5; x += 2.5) sh.box(x, H - 0.3, 0, 0.3, 0.3, Dp * 2, BEAM);
    // round-paned windows in the north wall and by the writing desk
    for (const x of [-6, -1.5, 3, 7]) { gl.box(x, 2.2, -Dp + 0.16, 1.2, 1.2, 0.02, 0xd8e8e0); for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) m.ccyl(x - 0.4 + i * 0.4, 2.4 + k * 0.4, -Dp + 0.18, 0.17, 0.02, 0xa8b8a8, { rx: Math.PI / 2, seg: 8 }); m.box(x, 2.1, -Dp + 0.2, 1.4, 0.08, 0.12, BEAM); }
    gl.box(-W + 0.16, 1.4, -1, 0.02, 1.4, 1.4, 0xe8f0e8);
    // the door frame
    m.box(3, 0, Dp, 0.15, 2.6, 0.35, BEAM); m.box(5, 0, Dp, 0.15, 2.6, 0.35, BEAM); m.box(4, 2.5, Dp, 2.15, 0.15, 0.35, BEAM);
    // ---- the press: two uprights, a crosshead, the big screw, the platen and a sliding bed ----
    const px = 2.5, pz = -2.5;
    for (const s of [-0.8, 0.8]) m.box(px + s, 0, pz, 0.3, 2.9, 0.34, DARK);
    m.box(px, 2.6, pz, 2.0, 0.34, 0.5, DARK); m.box(px, 1.55, pz, 1.9, 0.22, 0.44, DARK);
    m.box(px, 0, pz + 1.3, 1.4, 0.8, 3.6, WOOD); m.box(px, 0.8, pz + 1.3, 1.2, 0.05, 3.4, 0x9a7a54);
    m.box(px, 0.85, pz + 1.9, 0.9, 0.05, 0.7, 0x3a3a3e); // the forme of type
    const screw = S.obj((b) => { b.cyl(0, 0, 0, 0.09, 1.0, 0x8a6a40, { seg: 8 }); b.box(0, -0.12, 0, 0.75, 0.1, 0.55, 0x8a6a44); }, px, 1.05, pz);
    const bar = S.obj((b) => { b.box(0.5, 0, 0, 1.0, 0.07, 0.07, 0x6a4a2a); b.ball(1.02, 0, 0, 0.06, 0x5a3a20); }, px, 1.45, pz);
    S.solidBox(px, pz + 1, 2.2, 4.2);
    S.spot('press', px + 1.2, pz + 3.5, { r: 2, label: 'Give the ink balls to Konrad', place: { x: px - 0.3, y: 0.86, z: pz + 2.6 } });
    S.tick((dt, t) => { const k = Math.max(0, Math.sin(t * 1.2)); screw.position.y = 1.05 - k * 0.12; screw.rotation.y = k * 1.2; bar.rotation.y = -0.4 + k * 1.3; });
    // the ink table, with ink balls and the ink stone
    m.box(5.8, 0, -4.8, 1.6, 0.85, 0.8, WOOD); m.box(5.8, 0.85, -4.8, 0.9, 0.04, 0.5, 0x2a2a2a);
    m.lathe(6.4, 0.85, -4.9, [[0, 0], [0.12, 0], [0.14, 0.14], [0.1, 0.18], [0, 0.18]], 0x5a4a3a, 8);
    S.solidBox(5.8, -4.8, 1.6, 0.8);
    const inkballs = S.obj((b) => { for (const s of [-0.12, 0.12]) { b.ball(s, 0.07, 0, 0.09, 0x3a2a1e, { sy: 0.7 }); b.cyl(s, 0.1, 0, 0.025, 0.18, 0x8a6a40, { seg: 6 }); } }, 5.4, 0.87, -4.7);
    S.item('inkballs', inkballs, { label: 'the ink balls', dy: 0.3 });
    // ---- type cases on slanted stands along the north wall ----
    for (const cx of [-5.6, -3.4]) {
      m.box(cx, 0, -4.9, 1.9, 0.95, 0.6, DARK);
      m.box(cx, 0.95, -5.0, 1.9, 0.1, 0.9, WOOD, { rx: -0.45 });
      for (let i = 0; i < 9; i++) for (let k = 0; k < 4; k++) m.box(cx - 0.8 + i * 0.2, 1.01 + k * 0.08, -4.75 - k * 0.18, 0.14, 0.04, 0.14, rpick([0x6a6a70, 0x7a7a80, 0x5a5a62]));
      S.solidBox(cx, -4.9, 1.9, 0.7);
    }
    S.spot('case', -4.5, -3.7, { r: 1.8 });
    const stick = S.obj((b) => { b.box(0, 0, 0, 0.5, 0.06, 0.12, 0x9a9aa2); b.box(-0.24, 0, 0, 0.03, 0.12, 0.12, 0x9a9aa2); }, -4.4, 1.1, -4.4, 0.1);
    // ---- the casting corner: a little furnace, a pot of metal, moulds ----
    const fx = -7.7, fz = 2.6;
    m.box(fx, 0, fz, 1.2, 1.0, 1.2, 0x8a4a34, { j: 0.05 }); m.box(fx, 1.0, fz, 1.3, 0.1, 1.3, 0x6a3a2a);
    m.cyl(fx, 1.1, fz, 0.32, 0.3, 0x3a3a3e, { seg: 10 }); gl.cyl(fx, 1.38, fz, 0.28, 0.02, 0xffa040, { seg: 10 });
    gl.box(fx + 0.61, 0.25, fz, 0.02, 0.35, 0.5, 0xff7a2a);
    m.box(fx, 1.1, fz, 0.25, 2.9, 0.25, 0x6a3a2a);
    S.emitter(fx, 1.5, fz, { color: 0x9a9a9a, size: 0.5, rise: 0.6, life: 2.5, n: 10, opacity: 0.3, spread: 0.1 });
    S.emitter(fx, 1.4, fz, { color: 0xffb050, size: 0.12, rise: 0.8, life: 0.8, n: 8, opacity: 0.9, add: true, spread: 0.2 });
    S.solidBox(fx, fz, 1.3, 1.3);
    m.box(-5.9, 0, 2.6, 2.0, 0.9, 0.8, WOOD); S.solidBox(-5.9, 2.6, 2.0, 0.8);
    for (let i = 0; i < 4; i++) m.box(-6.6 + i * 0.35, 0.9, 2.5, 0.16, 0.24, 0.2, 0x7a6a5a);
    for (let i = 0; i < 20; i++) m.box(-5.3 + (i % 5) * 0.08, 0.9, 2.8 + Math.floor(i / 5) * 0.06, 0.05, 0.12, 0.04, 0x8a8a92);
    S.spot('bench', -5.6, 1.4, { r: 1.8 });
    const furnaceLight = new THREE.PointLight(0xff8a3a, 1.1, 7, 2); furnaceLight.position.set(fx + 0.8, 1.6, fz); S.add(furnaceLight);
    S.tick((dt, t) => { furnaceLight.intensity = 0.9 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.08; });
    // ---- the writing desk by the west window ----
    m.box(-8.1, 0, -1, 0.7, 0.75, 1.3, WOOD); m.box(-8.1, 0.75, -1, 0.8, 0.05, 1.4, 0x8a6a44, { rz: 0.25 });
    m.box(-8.05, 0.86, -1, 0.5, 0.01, 0.7, 0xf4ecd8, { rz: 0.25 }); m.box(-7.7, 0, -1, 0.4, 0.45, 0.4, DARK);
    S.solidBox(-8.1, -1, 0.9, 1.4);
    // ---- drying lines with printed sheets ----
    for (const z of [-1.5, 0, 1.5]) { m.rod([5.6, 2.7, z], [8.8, 2.7, z], 0.01, 0x8a7a5a, 4); for (let i = 0; i < 6; i++) if (!(z === 0 && i === 2)) m.box(5.9 + i * 0.5, 2.25, z, 0.4, 0.45, 0.01, 0xf2ecdc); }
    S.spot('line', 6.9, 0.8, { r: 2, dy: 1.6, label: 'Hang the sheet to dry', place: { x: 6.9, y: 2.25, z: 0, ry: 0 } });
    // stacks of paper and finished pages, a bench, candles
    for (let i = 0; i < 3; i++) { m.box(8.2, 0, 3.4 + i * 0.9, 0.9, 0.8, 0.7, WOOD); for (let k = 0; k < 4; k++) m.box(8.2, 0.8 + k * 0.06, 3.4 + i * 0.9, 0.62, 0.05, 0.44, k % 2 ? 0xf4ecd8 : 0xece2cc); }
    S.solidBox(8.2, 4.3, 0.9, 2.6);
    m.box(4.8, 0, 0.6, 1.4, 0.85, 0.7, WOOD); S.solidBox(4.8, 0.6, 1.4, 0.7);
    const sheet = S.obj((b) => { b.box(0, 0, 0, 0.42, 0.01, 0.56, 0xf6f0e2); for (let c = 0; c < 2; c++) for (let l = 0; l < 14; l++) b.box(-0.1 + c * 0.2, 0.006, -0.24 + l * 0.035, 0.16, 0.004, 0.012, 0x2a2a2a); b.box(-0.17, 0.007, -0.24, 0.04, 0.005, 0.05, 0xb82a2a); }, 4.8, 0.86, 0.6);
    S.item('sheet', sheet, { label: 'the printed sheet', dy: 0.3, carryYaw: Math.PI / 2 });
    sheet.visible = false;
    for (const [x, z] of [[-5.9, 2.9], [4.4, 0.8], [-8.1, -0.4]]) { m.cyl(x, x === -8.1 ? 0.88 : 0.87, z, 0.03, 0.18, 0xf4ecd8, { seg: 6 }); gl.ball(x, (x === -8.1 ? 0.88 : 0.87) + 0.22, z, 0.03, 0xffd080, { det: 0, sy: 1.5 }); }
    const lamp = new THREE.PointLight(0xffd8a0, 0.7, 12, 1.6); lamp.position.set(1, 3.2, 0); S.add(lamp);
    for (const x of [-4, 1, 5.5]) { m.cyl(x, 3.2, 0, 0.4, 0.06, BEAM, { seg: 8 }); for (let i = 0; i < 4; i++) gl.ball(x + Math.cos(i * 1.57) * 0.35, 3.32, Math.sin(i * 1.57) * 0.35, 0.04, 0xffd080, { det: 0 }); m.rod([x, 3.26, 0], [x, H, 0], 0.01, 0x2a2a2a); }
    // ---- the yard: a well, timber-framed houses, and the cathedral beyond ----
    m.cyl(-4, 0, 11, 0.9, 0.8, 0x8a8478, { seg: 12 }); m.cyl(-4, 0.79, 11, 0.7, 0.02, 0x2a3a4a, { seg: 12 });
    m.box(-4.8, 0, 11, 0.12, 2.0, 0.12, BEAM); m.box(-3.2, 0, 11, 0.12, 2.0, 0.12, BEAM); m.box(-4, 2.0, 11, 1.8, 0.12, 0.12, BEAM); m.frustum(-4, 2.05, 11, 2.2, 0.7, 1.2, 0.05, 0x7a3a2a);
    S.solidCircle(-4, 11, 1.0);
    const house = (x0, x1, z, h) => {
      sh.box((x0 + x1) / 2, 0, z, x1 - x0, h, 0.4, PLASTER); S.solidBox((x0 + x1) / 2, z, x1 - x0, 0.4);
      for (let x = x0; x <= x1; x += 1.4) m.box(x, 0, z - 0.22, 0.16, h, 0.06, BEAM);
      for (let y = 0; y <= h; y += h / 3) m.box((x0 + x1) / 2, y, z - 0.22, x1 - x0, 0.16, 0.06, BEAM);
      for (let x = x0 + 0.7; x < x1 - 0.5; x += 2.8) m.box(x, h * 0.45, z - 0.21, 0.16, h * 0.3, 0.06, BEAM, { rz: 0.6 });
      m.frustum((x0 + x1) / 2, h, z + 2, x1 - x0 + 0.6, 2.6, 4.6, 0.05, 0x8a3a2a);
      for (let x = x0 + 1.2; x < x1 - 0.6; x += 2.8) gl.box(x, h * 0.55, z - 0.22, 0.7, 0.8, 0.02, 0x9ab0b0);
    };
    house(-W, 0, 18, 7); house(0.5, W, 18.5, 6.4);
    for (const x of [-W, W]) { sh.box(x, 0, 12, 0.4, 3, 12, 0x8a8478); S.solidBox(x, 12, 0.4, 12); }
    // the cathedral of St Martin, red sandstone towers over the roofs
    for (const [x, h] of [[-14, 46], [10, 40]]) { m.box(x, 0, 60, 8, h, 8, 0xa85a4a); m.frustum(x, h, 60, 8.4, 12, 8.4, 0, 0x5a6a6a); }
    m.box(-2, 0, 64, 26, 22, 12, 0xa85a4a); m.frustum(-2, 22, 64, 26, 9, 12, 0.1, 0x5a6a6a);
    m.box(0, 0, 40, 60, 9, 30, 0x9a8a7a);
    // ---- people ----
    S.actor('gutenberg', 2.2, 1.6, Math.PI);
    S.actor('peter', -7.55, -1, -Math.PI / 2, { anim: 'write', seated: true });
    S.actor('konrad', 4.0, -0.6, -0.4, { anim: 'stand' });
    S.actor('hans', -3.2, -3.4, Math.PI, { anim: 'work' });
    S.actor('fust', -1, 12, 0.3);
    S.extra({ skin: SKIN.fair, hair: 0x6a4a2a, hairStyle: 'short', top: 0x6a5a3a, topStyle: 'tunic', bottom: 0x4a3a2a, apron: 0x9a8a6a, h: 1.7 }, -6.2, 1.7, Math.PI, { anim: 'work' });
    S.extra({ skin: SKIN.fair, hair: 0x3a2a1a, top: 0x5a6a4a, topStyle: 'tunic', bottom: 0x4a4a3a, h: 1.68 }, 3, 13, 2.4, { anim: 'idle' });
  }

  const look = (o) => Object.assign({ skin: SKIN.fair, shoes: 0x2a1a10 }, o);
  Scenarios.add({
    id: 'mainz', title: "Gutenberg's printing press", place: 'Mainz, Germany', when: 'About 1454', year: 1454, color: 0x8a3a6a,
    blurb: 'Cast metal letters, set a line of type backwards, and pull the press in the secret workshop where the first big book in Europe was printed.',
    role: "You're the newest apprentice in Johannes Gutenberg's workshop.",
    homeLine: "Is that ink on your fingers? You've been printing with Gutenberg, haven't you!",
    souvenir: { name: 'a piece of metal type', text: 'A single letter G, cast in lead, tin and antimony from Gutenberg\'s own hand mould. Backwards, of course!', build(b) { b.box(0, 0, 0, 0.3, 0.03, 0.3, 0x5a3a24); b.box(0, 0.03, 0, 0.09, 0.26, 0.09, 0x9aa0a8); b.box(0, 0.29, 0, 0.07, 0.02, 0.07, 0x5a5a62); } },
    note: 'Johannes Gutenberg, Peter Schöffer and Johann Fust were real people. Konrad the pressman and Hans the apprentice are made up. Nobody knows exactly what Gutenberg looked like, or every detail of how his workshop ran; the game follows what historians think is likely.',
    cast: {
      gutenberg: { name: 'Johannes Gutenberg', title: 'master printer', real: true, about: 'A goldsmith from Mainz who, around 1450, made printing with movable metal type work in Europe. He died in 1468.', voice: { pitch: 0.8, rate: 0.95 },
        look: look({ hair: 0x7a6a5a, hairStyle: 'long', beard: 'full', beardCol: 0x8a7a6a, top: 0x6a1a2a, topStyle: 'robe', fur: 0x8a6a4a, bottom: 0x6a1a2a, bottomStyle: 'robe', hat: 'fur', hatCol: 0x6a4a30, hatTop: 0x5a1a22, h: 1.76, w: 1.08 }),
        lines: [{ t: 'Someone wants to paint my portrait? Bah! No time for that. There is printing to do!', fact: 'portrait' }, 'I was trained as a goldsmith. Working with metal and punches is what gave me the idea.', 'Keep the windows shut. I don\'t want every merchant in Mainz knowing our secrets!'] },
      peter: { name: 'Peter Schöffer', title: 'scribe and printer', real: true, about: 'A scribe trained in Paris who worked with Gutenberg and later became a famous printer himself.', voice: { pitch: 1.05, rate: 1.05 },
        look: look({ hair: 0x5a3a1a, hairStyle: 'short', top: 0x2a4a6a, topStyle: 'tunic', bottom: 0x3a3a4a, h: 1.72 }),
        lines: ['A good quill is cut from a goose feather. I sharpen mine with a little knife, a pen-knife!', 'Some pages are printed on vellum, made from calf skin. It lasts for hundreds of years.'] },
      konrad: { name: 'Konrad', title: 'pressman', voice: { pitch: 0.75 },
        look: look({ skin: SKIN.light, hair: 0xa86a3a, hairStyle: 'balding', beard: 'stubble', top: 0x8a7a5a, topStyle: 'shirt', shortSleeves: true, bottom: 0x4a3a2a, apron: 0x6a5a4a, h: 1.82, w: 1.18 }),
        lines: ['Pulling the bar all day makes your arms as strong as an ox!', 'We print the same page over and over before we change the type. Hundreds of copies of each page.'] },
      hans: { name: 'Hans', title: 'apprentice', voice: { pitch: 1.45, rate: 1.1 },
        look: look({ hair: 0xd8b060, hairStyle: 'short', top: 0x7a6a3a, topStyle: 'tunic', bottom: 0x4a3a2a, h: 1.4, kid: true }),
        lines: ['I sort the letters back into the case after printing. "Mind your p\'s and q\'s," Konrad says, because they look so alike backwards!', 'My mother can\'t believe a book can be made without a scribe.'] },
      fust: { name: 'Johann Fust', title: 'merchant', real: true, about: 'A rich merchant from Mainz who lent Gutenberg money, and later ran a printing shop with Peter Schöffer.', voice: { pitch: 0.9 },
        look: look({ hair: 0x2a2a2a, hairStyle: 'short', top: 0x1a3a2a, topStyle: 'robe', fur: 0x3a2a1a, bottom: 0x1a3a2a, bottomStyle: 'robe', hat: 'beret', hatCol: 0x1a1a1a, h: 1.74, w: 1.12 }),
        lines: [{ t: 'I am Johann Fust. I have lent Master Gutenberg a great deal of money for this workshop. I do hope these Bibles sell!', fact: 'fust' }, 'Paper comes all the way from Italy. Vellum costs even more!'] },
    },
    facts: {
      scribes: { t: 'Copied by hand', x: 'Before printing, every book in Europe was copied by hand. Copying a whole Bible could take a scribe more than a year, so books were rare and very expensive.' },
      movable: { t: 'Movable type', x: 'Gutenberg\'s big idea was to make each letter as a separate little metal block, called a *sort*. Sorts could be arranged into any page, printed, then taken apart and used again.' },
      china: { t: 'Printing in Asia first', x: 'Printing wasn\'t new everywhere! In China, *Bi Sheng* made movable type from clay around the year 1040, and in Korea a book called the *Jikji* was printed with metal type in 1377, long before Gutenberg.' },
      mould: { t: 'The hand mould', x: 'To make letters quickly, Gutenberg invented a *hand mould*. A worker poured hot metal in, and a new letter came out in seconds. Every letter came out exactly the same height, so they all printed evenly.' },
      alloy: { t: 'Type metal', x: 'Gutenberg mixed *lead, tin and antimony*. The mix melts easily, fills every corner of the mould, and hardens quickly without shrinking.' },
      sorts: { t: 'Nearly 300 letters', x: 'To make his pages look like beautiful handwriting, Gutenberg used about *290 different characters*: capitals, small letters, letters joined together and short-cut signs.' },
      backwards: { t: 'Backwards letters', x: 'Type is a mirror image of the printed letter. Typesetters learned to read backwards, and even upside down!' },
      fortytwo: { t: 'The 42-line Bible', x: 'Most pages of Gutenberg\'s Bible have two columns of *42 lines*, so it is also called the 42-line Bible.' },
      ink: { t: 'Sticky ink', x: 'Writing ink is watery and would run off metal. Gutenberg used an oily ink, more like paint, made from *soot and linseed oil*.' },
      press: { t: 'A press from the vineyard', x: 'Gutenberg\'s press was probably based on presses used to squeeze grapes for wine. A big wooden screw pushes a flat board, the *platen*, down hard on the paper.' },
      red: { t: 'Painted by hand', x: 'After printing, the red headings and big coloured capital letters were added by hand, so every Gutenberg Bible looks a little different.' },
      bible: { t: 'About 180 copies', x: 'Gutenberg printed about *180 copies* of his Bible, around 1454 and 1455. About 49 still exist today, some on paper and some on vellum (calf skin).' },
      spread: { t: 'Printing spreads', x: 'By the year 1500 there were printing shops in more than *200 towns* across Europe, and millions of books had been printed. Ideas could spread faster than ever before.' },
      portrait: { t: 'No real portrait', x: 'Nobody knows what Gutenberg really looked like! All the pictures of him with a big beard were made long after he died.' },
      fust: { t: 'Trouble over money', x: 'Gutenberg borrowed money from a merchant, *Johann Fust*. In 1455 they went to court, and Fust ended up with much of the workshop. Fust and Peter Schöffer became famous printers themselves.' },
    },
    sets: {
      shop: { amb: 'workshop', surf: 'wood', build: buildShop,
        env: { top: 0x6a8ab0, hor: 0xc8ccd0, bot: 0x8a8478, sun: [0.3, 0.8, 0.5], sunCol: 0xfff0dc, sunI: 0.45, hemiSky: 0xf4ead8, hemiGround: 0x7a5a40, hemiI: 0.62, amb: 0.14, fog: 0xc8ccd0, fogD: 0.006, clouds: 0.7, cloudCol: 0xe8e8ec } },
    },
    chapters: [
      { title: 'The secret workshop', set: 'shop', start: [4, 4.6, 'gutenberg'], steps: [
        { chat: [
          ['gutenberg', 'Ah, my new apprentice! Come in, come in, and close the door. The draught makes the candles flicker.'],
          ['gutenberg', 'I am Johannes Gutenberg. What we do in this workshop is still a secret, so not a word outside!'],
          ['gutenberg', 'First, go and see *Peter* at the writing desk by the window. He will show you why our work matters.'],
        ] },
        { goal: 'Talk to *Peter* at the writing desk', talk: 'peter' },
        { chat: [
          ['peter', "Hello! I'm Peter Schöffer. I learned to be a scribe in Paris, copying books by hand."],
          ['peter', 'See this page? It took me two whole days. Copying a whole Bible takes more than a year!'],
          ['peter', 'That\'s why books are so rare. Only churches, universities and rich people own them.'],
        ], fact: 'scribes' },
        { ask: 'peter', q: 'How could we make lots of copies of a book, much faster?', a: [
          ['Make every letter as a little metal block, and reuse them', true, "That's exactly Master Gutenberg's idea! Little metal letters that can be put together into any page, and used again and again."],
          ['Hire a thousand scribes', false, 'Ha! That would cost a fortune, and every copy would still have mistakes. Think of something cleverer.'],
          ['Carve each whole page out of a block of wood', false, 'People do that for pictures and short texts. But carving every page of a Bible would take forever, and you couldn\'t reuse the letters!'],
        ], fact: 'movable' },
        { say: 'narrator', text: 'Gutenberg didn\'t know it, but printers in China and Korea had already used movable type, hundreds of years earlier.', fact: 'china' },
      ] },
      { title: 'Casting type', set: 'shop', start: [-2, 1.5, 'gutenberg'], setup(S) { S.actors.gutenberg.tp(-5.3, 1.7, Math.PI / 2 + 0.6); }, steps: [
        { goal: 'Help Master Gutenberg at the *casting bench*', talk: 'gutenberg' },
        { chat: [
          ['gutenberg', 'First I carve a letter on the end of a steel *punch*, and strike it into soft copper. That makes a *matrix*, a little mould of the letter.'],
          ['gutenberg', 'The matrix goes into the bottom of my *hand mould*. Pour in the hot metal, and out comes a letter!'],
        ], fact: 'mould' },
        { chat: [
          ['gutenberg', 'The metal is my own recipe: lead, tin and a little antimony. It melts easily and sets hard.'],
          ['gutenberg', 'Careful now. Fill the mould just to the line. Too little and the letter has holes, too much and it spills.'],
        ], fact: 'alloy' },
        { play: 'pour', title: 'Cast three letters', labels: ['G', 'O', 'T'], rounds: 3, winText: 'Three perfect letters! Every one exactly the same height, so they print evenly.' },
        { chat: [['gutenberg', 'We need thousands of these. Capitals, small letters, letters joined together, little signs for short words: nearly three hundred kinds!'], ['gutenberg', 'Now go to the *type case*. Peter will teach you to set a line.']], fact: 'sorts' },
      ] },
      { title: 'Setting the type', set: 'shop', start: [-1, -1, 'peter'], setup(S) { S.actors.peter.tp(-4.6, -4.0, 0).set('stand'); S.actors.peter.seated = false; }, steps: [
        { goal: 'Go to the *type case*', to: 'case' },
        { chat: [
          ['peter', 'Every little box in the type case holds one kind of letter. Capitals go in the upper case, small letters in the lower case.'],
          ['peter', 'We line the letters up in this *composing stick*. But watch out: type is *backwards*! Each letter is a mirror image of how it prints.'],
          ['peter', "Let's set the first words of the Bible: *IN PRINCIPIO*. That's Latin for *In the beginning*."],
        ], fact: 'backwards' },
        { play: 'spell', title: 'Set a line of type', target: [...'IN PRINCIPIO'], decoys: ['E', 'S'], mirror: true, frame: 'stick', prompt: 'Set the words:  IN PRINCIPIO',
          winText: 'IN PRINCIPIO, set in metal! Now it can be printed hundreds of times.' },
        { chat: [['peter', 'Well done! A full page has two columns of forty-two lines. A good typesetter takes about a day to set one.'], ['peter', 'Next, Konrad at the press needs the *ink balls*. They are on the little table by the window.']], fact: 'fortytwo' },
      ] },
      { title: 'Ink and press', set: 'shop', start: [1, 2, 'konrad'], steps: [
        { goal: 'Bring the *ink balls* to Konrad at the press', bring: 'inkballs', use: 'press', hint: 'Pick up the ink balls from the little table by the window first.' },
        { chat: [
          ['konrad', "Thank you, young one. I'm Konrad, the pressman. Smell that? That's our ink: soot and linseed oil, thick like paint."],
          ['konrad', 'Watery ink would just run off the metal. This kind sticks to it.'],
          ['konrad', 'Now, do you know the steps of printing? Show me!'],
        ], fact: 'ink' },
        { play: 'order', title: 'Print a page', prompt: 'Put the printing steps in order', steps: [
          { t: 'Dab ink on the type with the ink balls', hint: 'First the type needs ink, or nothing will print!' },
          { t: 'Lay a damp sheet of paper on the frame', hint: 'Before pressing, there has to be paper ready to go on the type.' },
          { t: 'Fold the frame down over the type', hint: 'The paper has to be lowered onto the inked type.' },
          { t: 'Slide the bed under the press', hint: 'The type and paper have to go under the platen before you can press.' },
          { t: 'Pull the bar to press down hard', hint: 'Everything is in place. Now, press!' },
          { t: 'Lift out the printed sheet', hint: 'Last of all, take out your printed page!' },
        ], winText: 'Perfect order! You\'d make a fine pressman.' },
        { chat: [['konrad', 'This press is like the ones that squeeze grapes for wine. A big screw pushes the platen down.'], ['konrad', 'Now the hard part. Pull the bar with me, nice and steady: one sheet each time!']], fact: 'press' },
        { play: 'rhythm', title: 'Pull the press', how: 'Press *Pull!* (Space or E) each time a circle reaches the line.', lanes: [{ label: 'Pull!', color: '#f0a83a' }], pattern: '0...0...0...0...0...0...0...0...', bpm: 120, scene: 'press', chant: ['Pull!', '', 'and', 'back'],
          winText: 'Eight pages printed! Konrad is impressed.' },
        { do: (S) => { S.items.sheet.obj.visible = true; } },
        { chat: [['konrad', 'Here, this is the best one. Take it and hang it on the *drying line* so the ink can dry.']] },
      ] },
      { title: 'The first page', set: 'shop', start: [4, 1.6, 'gutenberg'], setup(S) { S.items.sheet.obj.visible = true; S.actors.gutenberg.tp(6.2, 2.4, Math.PI + 0.5); }, steps: [
        { goal: 'Hang the printed sheet on the *drying line*', bring: 'sheet', use: 'line', hint: 'Pick up the printed sheet from the table by the press first.' },
        { goal: 'Show Master Gutenberg', talk: 'gutenberg' },
        { chat: [
          ['gutenberg', 'Let me see… Wonderful! Sharp and black, as beautiful as any scribe\'s work.'],
          ['gutenberg', 'Later, the red headings and the big coloured letters will be painted in by hand, so every copy will be a little different.'],
        ], fact: 'red' },
        { chat: [['gutenberg', 'We will print about one hundred and eighty copies of this Bible. Imagine: a hundred and eighty Bibles, in less time than a scribe takes to copy one!']], fact: 'bible' },
        { ask: 'gutenberg', q: 'What do you think will happen when books become cheap and quick to make?', a: [
          ['More people will read, learn and share ideas', true, "Yes! Knowledge won't be locked away any more. Ideas will travel everywhere!"],
          ['Nobody will want books any more', false, 'Oh, I think it will be the opposite! When something is easier to get, more people can enjoy it.'],
          ['Scribes will become kings', false, 'Ha! I don\'t think so. Think about all the people who could suddenly afford a book.'],
        ] },
        { say: 'narrator', text: 'Gutenberg was right. Within fifty years there were printing shops in more than two hundred towns across Europe, and millions of books had been printed.', fact: 'spread' },
      ] },
    ],
  });
})();
