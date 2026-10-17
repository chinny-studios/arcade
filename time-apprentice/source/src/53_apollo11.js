// Event: the Apollo 11 Moon landing, seen from Mission Control in Houston, 20 July 1969.
// You're a trainee in the Mission Operations Control Room during the landing and the first step.

(() => {
  const ROWS = [{ z: -5, f: 0 }, { z: -1.5, f: 0.4 }, { z: 2, f: 0.8 }, { z: 5.5, f: 1.2 }];
  const COLS = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  const LABELS = [['BOOSTER', 'RETRO', 'FIDO', 'GUIDANCE', 'RTC', 'SPARE'], ['SURGEON', 'CAPCOM', 'EECOM', 'GNC', 'TELMU', 'CONTROL'], ['INCO', 'O & P', 'AFLIGHT', 'FLIGHT', 'FAO', 'NETWORK'], ['', 'PAO', 'MOD', 'FOD', 'DOD', '']];
  function floorAt(x, z) {
    if (z < -3.2) return 0;
    if (z < 0.3) return 0.4;
    if (z < 3.8) return 0.8;
    return 1.2;
  }
  const screenTex = (kind) => canvasTex(512, 320, (c, w, h) => {
    c.fillStyle = '#05140a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#3aff6a'; c.fillStyle = '#3aff6a'; c.lineWidth = 2; c.font = 'bold 20px "Courier New", monospace';
    if (kind === 'traj') {
      c.fillText('LUNAR ORBIT / DESCENT', 16, 30);
      c.beginPath(); c.arc(256, 180, 90, 0, TAU); c.stroke();
      c.beginPath(); c.ellipse(256, 180, 130, 110, 0, 0, TAU); c.setLineDash([6, 6]); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(380, 150); c.quadraticCurveTo(340, 250, 300, 262); c.stroke();
      c.fillText('EAGLE', 384, 140); c.fillText('COLUMBIA', 120, 80);
    } else if (kind === 'map') {
      c.fillStyle = '#2a2a24'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a5a50';
      const r = mulberry32(11); for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(r() * w, r() * h, 4 + r() * 22, 0, TAU); c.fill(); }
      c.strokeStyle = '#ffdd44'; c.lineWidth = 3; c.beginPath(); c.ellipse(280, 170, 90, 30, -0.2, 0, TAU); c.stroke();
      c.fillStyle = '#ffdd44'; c.fillText('SEA OF TRANQUILITY', 16, 30); c.fillText('LANDING SITE 2', 200, 230);
    } else if (kind === 'tv') {
      c.fillStyle = '#1a1a1a'; c.fillRect(0, 0, w, h); const r = mulberry32(5);
      for (let i = 0; i < 3000; i++) { const v = Math.floor(r() * 120); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(r() * w, r() * h, 2, 2); }
      c.fillStyle = '#ddd'; c.fillText('TV: WAITING FOR SIGNAL', 110, 170);
    } else if (kind === 'clock') {
      c.fillStyle = '#100808'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff5a3a'; c.font = 'bold 64px "Courier New", monospace'; c.fillText('102:45:40', 60, 140); c.font = 'bold 22px "Courier New", monospace'; c.fillText('GROUND ELAPSED TIME', 120, 200);
    }
  });
  const labelTex = (row) => canvasTex(1024, 48, (c, w, h) => { c.fillStyle = '#2a2a2e'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8e8e0'; c.font = 'bold 22px Arial, sans-serif'; c.textAlign = 'center'; LABELS[row].forEach((l, i) => c.fillText(l, (i + 0.5) * w / 6, 32)); });

  function buildControl(S) {
    S.bounds(-12.6, -9.4, 12.6, 9.2);
    S.ground(floorAt);
    const sh = S.gb('shell'), m = S.gb('main'), gl = S.gb('glow');
    // floor tiers with carpet, walls, ceiling with light panels
    for (const [z0, z1, f] of [[-10, -3.2, 0], [-3.2, 0.3, 0.4], [0.3, 3.8, 0.8], [3.8, 12, 1.2]]) { sh.box(0, f - 0.4, (z0 + z1) / 2, 26, 0.4, z1 - z0, 0x3a4a5a); if (f > 0) sh.box(0, f - 0.4, z0 + 0.02, 26, 0.4, 0.06, 0x2a3440); }
    sh.box(0, 0, -10, 26, 6, 0.2, 0x2a2e34); sh.box(-13, 0, 0, 0.2, 6, 24, 0x8a8a84); sh.box(13, 0, 0, 0.2, 6, 24, 0x8a8a84); sh.box(0, 6, 0, 26, 0.2, 24, 0x6a6a68);
    for (let x = -10; x <= 10; x += 4) for (let z = -8; z <= 8; z += 4) gl.box(x, 5.88, z, 2.4, 0.04, 1.2, 0xd8dcd4);
    // the glass of the viewing room at the back, with its guests
    m.box(0, 1.2, 9.6, 26, 0.9, 0.2, 0x5a5a58); const glass = new GB(); glass.box(0, 2.1, 9.6, 26, 3.6, 0.04, 0xffffff); S.add(glass.mesh(R.mat.glass, { cast: false }));
    S.solidBox(0, 9.6, 26, 0.3);
    for (let i = 0; i < 10; i++) S.extra({ skin: rpick([SKIN.fair, SKIN.light, SKIN.tan, SKIN.brown]), hair: rpick([0x2a2a2a, 0x6a4a2a, 0xa8a8a8]), hairStyle: rpick(['short', 'flat', 'balding']), top: rpick([0x2a3040, 0x4a4a4a, 0x5a4a3a]), topStyle: 'suit', tie: 0x2a2a2a, bottom: 0x2a2a2a, h: 1.75 }, -9 + i * 2, 10.8, Math.PI, { anim: 'idle', y: 1.2 });
    // the big screens on the front wall
    const scr = (kind, x, y, w, h) => { const t = screenTex(kind); const p = texPlane(t, w, h); p.position.set(x, y, -9.88); S.add(p); m.box(x, y - h / 2 - 0.1, -9.9, w + 0.3, h + 0.2, 0.04, 0x1a1a1a); return p; };
    scr('traj', -7.5, 3.2, 5.2, 3.2); scr('map', 0, 3.2, 6.4, 3.6); S.data.tvScreen = scr('tv', 7.5, 3.2, 5.2, 3.2); scr('clock', 0, 5.4, 3.2, 0.7);
    // four rows of consoles, each with screens and a label strip
    ROWS.forEach((r, ri) => {
      const zd = r.z - 0.75, n = ri === 3 ? 4 : 6, x0 = ri === 3 ? -4.5 : -9, w = ri === 3 ? 12 : 18, cx = x0 + w / 2;
      m.box(cx, r.f, zd, w, 0.74, 0.9, 0x8a8e88); m.box(cx, r.f + 0.74, zd, w + 0.1, 0.05, 1.0, 0x5a5e5a);
      m.box(cx, r.f + 0.78, zd - 0.3, w, 0.62, 0.36, 0x7a7e78, { rx: -0.25 });
      S.solidBox(cx, zd, w, 1.0, 0, { y0: r.f - 0.5 });
      COLS.forEach((x, ci) => {
        if (x < x0 || x > x0 + w) return;
        for (const s of [-0.38, 0.38]) gl.box(x + s, r.f + 0.92, zd - 0.39, 0.62, 0.42, 0.02, ci % 2 ? 0x2a8a4a : 0x3aa860, { rx: -0.25 });
        for (let k = 0; k < 8; k++) gl.box(x - 0.6 + k * 0.17, r.f + 0.76, zd + 0.15, 0.06, 0.02, 0.05, rpick([0xff4a3a, 0xffd23a, 0x3aff6a, 0xe8e8e8]));
        m.box(x, r.f, r.z + 0.35, 0.5, 0.45, 0.5, 0x2a2a2a); m.box(x, r.f + 0.45, r.z + 0.6, 0.5, 0.6, 0.08, 0x2a2a2a);
      });
      const lp = texPlane(labelTex(ri), 18, 0.32); lp.position.set(0, r.f + 1.27, zd - 0.48); lp.rotation.x = -0.25; S.add(lp);
    });
    // the back room desk, where Jack Garman keeps his list of alarms
    m.box(11.4, 0, -6, 1.4, 0.75, 2.4, 0x8a8e88); gl.box(11.0, 0.76, -6, 0.5, 0.02, 0.7, 0xf4f0e0); S.solidBox(11.4, -6, 1.4, 2.4);
    S.spot('front', 0, -7.6, { r: 3 });
    // ashtrays and coffee cups, of course
    for (const x of [-6, -3, 0.5, 3.5, 6.5]) for (const r of ROWS.slice(0, 3)) m.cyl(x, r.f + 0.79, r.z - 0.45, 0.05, 0.1, 0xf4f4f0, { seg: 6 });
    const l1 = new THREE.PointLight(0x9affb0, 0.35, 16, 1.5); l1.position.set(0, 2.5, -3); S.add(l1);
    // the controllers
    const seat = (id, ri, ci, o = {}) => { const r = ROWS[ri]; return S.actor(id, COLS[ci], r.z + 0.35, Math.PI, Object.assign({ anim: 'type', seated: true, y: r.f }, o)); };
    seat('greene', 0, 2); seat('bales', 0, 3); seat('duke', 1, 1); seat('carlton', 1, 5); seat('surgeon', 1, 0);
    S.actor('kranz', COLS[3], ROWS[2].z + 0.5, Math.PI, { anim: 'stand', y: ROWS[2].f });
    S.actor('garman', 11.2, -4.4, -Math.PI / 2 - 0.3, { anim: 'stand' });
    S.actor('poppy', 11.5, -2, -Math.PI / 2, { anim: 'idle' });
    const extra = (ri, ci) => { const r = ROWS[ri]; return S.extra({ skin: rpick([SKIN.fair, SKIN.light, SKIN.tan]), hair: rpick([0x2a2a2a, 0x5a3a20, 0x8a6a40]), hairStyle: rpick(['short', 'flat', 'balding']), top: 0xf4f4f0, topStyle: 'shirt', tie: rpick([0x2a2a4a, 0x4a2a2a, 0x2a4a2a]), bottom: 0x3a3a40, glasses: Math.random() < 0.4, hat: Math.random() < 0.5 ? 'headset' : null, h: rnd(1.7, 1.85) }, COLS[ci], r.z + 0.35, Math.PI, { anim: 'type', seated: true, y: r.f }); };
    for (const [ri, ci] of [[0, 0], [0, 1], [0, 4], [1, 2], [1, 3], [1, 4], [2, 0], [2, 1], [2, 2], [2, 4], [2, 5], [3, 1], [3, 2]]) extra(ri, ci);
    S.data.cheer = (on) => { for (const a of S.actorList()) { if (a.id === 'kranz' && !on) { a.set('stand'); continue; } if (on) { a.prevAnim = a.prevAnim || a.anim; a.set(a.seated ? 'clap' : 'cheer'); } else if (a.prevAnim) { a.set(a.prevAnim); a.prevAnim = null; } } };
  }

  // ---- Tranquility Base, as the black-and-white TV camera on Eagle's side saw it ----
  function buildMoon(S) {
    const h = (x, z) => {
      let y = fbm(x * 0.05, z * 0.05, 3, 31) * 0.6;
      for (const [cx, cz, r] of [[14, -10, 5], [-18, 6, 7], [6, 22, 3], [-8, -24, 9]]) { const d = Math.hypot(x - cx, z - cz) / r; if (d < 1.3) y += d < 1 ? -(1 - d * d) * r * 0.25 : (1.3 - d) * r * 0.2; }
      if (Math.hypot(x, z) < 6) y *= 0.2;
      return y;
    };
    S.bounds(-60, -60, 60, 60); S.ground(h);
    S.add(terrainMesh(-80, -80, 80, 80, 1.6, h, (x, z) => (vnoise(x * 0.3, z * 0.3, 7) > 0.3 ? 0x8a8a86 : 0x7e7e7a)));
    const m = S.gb('main'), gl = S.gb('glow');
    for (let i = 0; i < 60; i++) { const x = rnd(-50, 50), z = rnd(-50, 50); if (Math.hypot(x, z) < 6) continue; m.ball(x, h(x, z), z, rnd(0.1, 0.5), 0x9a9a96, { det: 0, sy: 0.6 }); }
    // Eagle's descent stage: gold foil octagon on four legs, the ladder on the front leg
    const GOLD = 0xc8a040;
    m.cyl(0, 1.3, 0, 2.1, 1.6, GOLD, { seg: 8 }); m.cyl(0, 1.9, 0, 2.12, 0.15, 0x3a3a3a, { seg: 8 });
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + Math.PI / 4, fx = Math.cos(a) * 4.0, fz = Math.sin(a) * 4.0, ax = Math.cos(a) * 1.9, az = Math.sin(a) * 1.9;
      m.rod([ax, 2.4, az], [fx, 0.3, fz], 0.07, 0xd8c070, 6); m.rod([ax, 1.4, az], [fx * 0.8, 0.5, fz * 0.8], 0.04, 0xd8c070, 5);
      m.cyl(fx, 0, fz, 0.45, 0.25, 0xc8c8c0, { seg: 10, rt: 0.8 });
    }
    // front leg (toward +z) with the ladder and the plaque
    m.rod([0, 2.6, 2.0], [0, 0.3, 4.0], 0.08, 0xd8c070, 6); m.cyl(0, 0, 4.0, 0.45, 0.25, 0xc8c8c0, { seg: 10, rt: 0.8 });
    for (let k = 0; k < 8; k++) { const t = k / 8, y = 2.6 - t * 2.1, z = 2.0 + t * 1.8; m.box(0, y, z + 0.1, 0.6, 0.04, 0.04, 0xd8d8d0); }
    m.box(0, 2.8, 2.3, 1.0, 0.08, 0.7, 0xb8b8b0); // the porch
    m.box(0.35, 1.0, 3.05, 0.4, 0.3, 0.02, 0xd8d8d0, { rx: -0.85 });
    // the ascent stage the astronauts will fly home in
    m.box(0, 2.9, -0.2, 3.0, 1.6, 2.6, 0xb8b8b4); m.frustum(0, 4.5, -0.2, 3.0, 0.8, 2.6, 0.6, 0x9a9a98);
    gl.box(-0.6, 3.8, 1.11, 0.5, 0.4, 0.02, 0x101010); gl.box(0.6, 3.8, 1.11, 0.5, 0.4, 0.02, 0x101010);
    m.box(0, 2.9, 1.15, 0.9, 0.9, 0.1, 0x8a8a88); m.cyl(1.6, 5.2, -0.8, 0.5, 0.06, 0xd8d8d0, { rx: 0.8, seg: 12 }); m.rod([1.2, 4.6, -0.6], [1.6, 5.2, -0.8], 0.03, 0x8a8a88);
    // the Earth, low in the black sky
    const earth = S.obj((b) => { b.ball(0, 0, 0, 6, 0x3a6ad8, { det: 2 }); b.ball(1.5, 1.8, 4.2, 2.2, 0xf4f4f4, { det: 1, sz: 0.5 }); b.ball(-2.2, -1, 4.6, 2.0, 0x3a8a3a, { det: 1, sz: 0.4 }); }, -60, 70, -180, 0, { cast: false });
    // Neil Armstrong at the top of the ladder
    const neil = S.actor('armstrong', 0, 2.3, Math.PI, { look: { topStyle: 'spacesuit', top: 0xf0f0ec, h: 1.8 }, talkable: false, seated: true, y: 2.84, anim: 'stand' });
    S.data.ladder = () => new Promise((res) => { let k = 0; S.tick((dt) => { if (k >= 1) return; k = Math.min(1, k + dt / 7); const t = k; neil.fixedY = 2.84 - t * 2.3; neil.z = 2.3 + t * 1.9; neil.anim = 'idle'; neil.t += dt * 2; if (k >= 1) res(); }); });
    S.data.stepOff = () => new Promise((res) => { let k = 0; S.tick((dt) => { if (k >= 1) return; k = Math.min(1, k + dt / 2.4); neil.fixedY = lerp(0.54, h(0, 4.9), k) + Math.sin(k * Math.PI) * 0.25; neil.z = 4.2 + k * 0.9; if (k >= 1) { neil.fixedY = null; neil.anim = 'stand'; res(); } }); });
    S.data.tvCam = { pos: [-3.4, 1.25, 7.4], look: [0, 1.5, 3.0], fov: 56 };
  }

  const look = (o) => Object.assign({ skin: SKIN.fair, hair: 0x2a2a2a, hairStyle: 'short', top: 0xf4f4f0, topStyle: 'shirt', bottom: 0x3a3a40, shoes: 0x1a1a1a, h: 1.78 }, o);
  Scenarios.add({
    id: 'apollo11', title: 'The Moon landing', place: 'Mission Control, Houston, Texas', when: 'July 20, 1969', year: 1969, color: 0x4a4a8a,
    blurb: 'Run the Go/No-Go poll, decode the 1202 alarm, fly along past the boulders, and watch the first step on the Moon from the room where it was all controlled.',
    role: "You're a trainee in Mission Control.",
    homeLine: "Mission Control! Did you hear them say it? The Eagle has landed!",
    souvenir: { name: 'an Apollo 11 mission patch', text: 'An eagle landing on the Moon with an olive branch, for peace. The crew chose not to put their names on it, to honour everyone who worked on Apollo.', build(b) { b.box(0, 0, 0, 0.3, 0.03, 0.3, 0x2a2a3a); b.cyl(0, 0.03, 0, 0.12, 0.02, 0x1a2a6a, { seg: 16 }); b.cyl(0, 0.045, 0.03, 0.07, 0.01, 0x9a9a96, { seg: 12 }); b.box(0, 0.06, -0.01, 0.1, 0.01, 0.04, 0xc89a40); b.ball(-0.06, 0.06, -0.06, 0.025, 0x3a7ad8, { det: 0 }); } },
    note: 'Everyone in Mission Control with a name here was a real person, apart from you. The radio words are what the astronauts and CAPCOM really said, shortened a little.',
    extraSpeakers: [],
    cast: {
      kranz: { name: 'Gene Kranz', title: 'Flight Director', real: true, about: 'The Flight Director in charge during the landing. He wore a white vest made by his wife for each big shift.', voice: { pitch: 0.75, rate: 1.05 },
        look: look({ hairStyle: 'flat', hair: 0x3a3020, vest: 0xf8f8f4, tie: 0x2a2a3a, h: 1.8 }),
        lines: [{ t: 'About four hundred thousand people worked on Apollo: engineers, scientists, factory workers, even seamstresses who sewed the spacesuits.', fact: 'people' }, 'This vest? My wife Marta made it. White team, white vest.', 'In here we stay calm, we work the problem, and we never give up.'] },
      duke: { name: 'Charlie Duke', title: 'CAPCOM', real: true, about: 'An astronaut who was CAPCOM for the landing. He later walked on the Moon himself on Apollo 16.', voice: { pitch: 0.95, rate: 1.1 }, look: look({ hair: 0x5a3a20, hat: 'headset', tie: 0x3a2a2a }),
        lines: ['Only one person talks to the crew, so there\'s no confusion: me, the CAPCOM.', "I'm an astronaut too. Maybe one day I'll walk on the Moon myself!"] },
      bales: { name: 'Steve Bales', title: 'Guidance officer', real: true, about: 'The 26-year-old Guidance officer who made the call to keep going after the 1202 alarm.', voice: { pitch: 1.05, rate: 1.1 }, look: look({ hair: 0x3a2a1a, glasses: true, tie: 0x2a3a5a, hat: 'headset' }),
        lines: ["I'm twenty-six. Most of the people in this room are young. The average age is about twenty-eight!"] },
      garman: { name: 'Jack Garman', title: 'computer expert, back room', real: true, about: 'A 24-year-old engineer who had written down what every computer alarm meant, and knew the 1202 was safe.', voice: { pitch: 1.1, rate: 1.15 }, look: look({ hair: 0x2a1a10, glasses: true, tie: 0x3a3a3a }),
        lines: [{ t: 'Eagle\'s computer has less memory than you\'d believe: a tiny fraction of what a cheap phone has in your time. But it\'s very clever.', fact: 'computer' }] },
      greene: { name: 'Jay Greene', title: 'FIDO, flight dynamics', real: true, about: 'The flight dynamics officer, who tracked exactly where Eagle was and where it was going.', voice: { pitch: 0.85 }, look: look({ hair: 0x4a3a2a, tie: 0x4a2a2a, hat: 'headset' }),
        lines: ['I work out where the spacecraft is, and where it\'s going. Lots of math, very fast!'] },
      carlton: { name: 'Bob Carlton', title: 'CONTROL, the lunar module engines', real: true, about: 'The engineer who watched Eagle\'s engine and fuel and called out the seconds left during the landing.', voice: { pitch: 0.9 }, look: look({ hair: 0x5a5a5a, hairStyle: 'balding', glasses: true, tie: 0x2a2a2a, hat: 'headset' }),
        lines: ['When the fuel gets low, I call out the seconds left. Sixty… thirty… Nobody wants to hear me say those!'] },
      surgeon: { name: 'Flight Surgeon', title: 'the doctor on duty', voice: { pitch: 0.8 }, look: look({ hair: 0x6a6a6a, hairStyle: 'balding', tie: 0x1a3a2a }),
        lines: ['Neil\'s heart is beating fast, about 150 beats a minute during the landing. Mine would be too!'] },
      poppy: { name: 'Poppy Northcutt', title: 'return-to-Earth engineer', real: true, about: 'An engineer in the support rooms who worked out how to bring Apollo crews home. She was the first woman in an engineering job in Mission Control.', voice: { pitch: 1.3, rate: 1.05 }, look: look({ skin: SKIN.fair, hair: 0xd8b060, hairStyle: 'long', top: 0x3a6a8a, topStyle: 'dress', bottom: 0x3a6a8a, bottomStyle: 'dress', h: 1.68 }),
        lines: ['My job is the trip home: working out exactly when to fire the engine to get back to Earth.', 'People ask why I\'m the only woman in here. I just say: I\'m good at math!'] },
      armstrong: { name: 'Neil Armstrong', title: 'Commander, in Eagle', real: true, radio: true, about: 'The commander of Apollo 11, and the first person to walk on the Moon.', voice: { pitch: 0.85, rate: 0.95 } },
      aldrin: { name: 'Buzz Aldrin', title: 'Lunar Module Pilot, in Eagle', real: true, radio: true, about: 'The second person to walk on the Moon.', voice: { pitch: 0.95 } },
    },
    facts: {
      eagle: { t: 'Eagle and Columbia', x: 'Apollo 11 had two spacecraft: the lunar module *Eagle*, which landed on the Moon, and the command module *Columbia*, which stayed in orbit and brought the crew home.' },
      collins: { t: 'The one who waited', x: '*Michael Collins* circled the Moon alone in Columbia while his crewmates landed. Every time he went behind the Moon, he couldn\'t talk to anyone on Earth.' },
      poll: { t: 'Go or No-Go', x: 'Before each big moment, the Flight Director asked every controller: "Go" or "No-Go"? If anyone said No-Go, they would stop.' },
      capcom: { t: 'CAPCOM', x: 'Only one person in Mission Control talked to the astronauts by radio: the *CAPCOM*, short for capsule communicator. It was usually an astronaut. For the landing, it was Charlie Duke.' },
      alarm: { t: 'The 1202 alarm', x: 'During the landing, Eagle\'s computer flashed alarms *1202* and *1201*: it had too many jobs at once. Steve Bales, aged 26, and Jack Garman, 24, quickly said it was safe to keep going.' },
      hamilton: { t: 'Clever software', x: 'The Apollo computer programs were written at MIT by a team led by *Margaret Hamilton*. They were designed to drop less important jobs and keep the most important ones running, and that saved the landing.' },
      computer: { t: 'A tiny computer', x: 'The Apollo Guidance Computer had only about 4 kilobytes of memory it could change, far less than any phone today. Its programs were woven into wires by hand!' },
      landed: { t: 'The Eagle has landed', x: 'On July 20, 1969, Eagle touched down in the *Sea of Tranquility*. Neil Armstrong radioed: "Houston, Tranquility Base here. The Eagle has landed."' },
      fuel: { t: 'A close call', x: 'Armstrong had to fly past a field of boulders to find a safe spot. Eagle landed with less than a minute of fuel to spare before the landing would have been called off.' },
      step: { t: 'One small step', x: 'About six and a half hours after landing, Neil Armstrong stepped onto the Moon and said: "That\'s one small step for man, one giant leap for mankind." About 600 million people watched on TV.' },
      buzz: { t: 'Buzz Aldrin', x: '*Buzz Aldrin* followed Armstrong down the ladder about 20 minutes later. Together they spent about two and a half hours walking on the Moon.' },
      plaque: { t: 'The plaque', x: 'A plaque on Eagle\'s leg says: "Here men from the planet Earth first set foot upon the Moon, July 1969, A.D. We came in peace for all mankind."' },
      footprints: { t: 'Footprints', x: 'There is no wind or rain on the Moon, so the astronauts\' footprints could stay there for millions of years.' },
      people: { t: '400,000 people', x: 'About *400,000 people* worked on the Apollo program: engineers, scientists, factory workers, and even seamstresses who sewed the spacesuits by hand.' },
    },
    sets: {
      control: { amb: 'control', surf: 'carpet', build: buildControl, start: [-11, 7, 'kranz'],
        env: { sky: false, fog: 0x1a1e24, fogD: 0, sun: [0.2, 0.9, 0.4], sunI: 0.35, sunCol: 0xf4f4ec, hemiSky: 0xe8ecf0, hemiGround: 0x3a4048, hemiI: 0.6, amb: 0.16 } },
      moon: { amb: 'moon', surf: 'moon', build: buildMoon, start: [-2.3, 6.0, 0],
        env: { top: 0x000000, hor: 0x000000, bot: 0x000000, sun: [0.9, 0.22, 0.3], sunCol: 0xffffff, sunI: 1.4, sunSize: 2, hemiSky: 0x404040, hemiGround: 0x303030, hemiI: 0.3, amb: 0.06, fog: 0x000000, fogD: 0, stars: 0, clouds: 0 } },
    },
    chapters: [
      { title: 'Mission Control', set: 'control', start: [-11, 7.5, 'kranz'], steps: [
        { chat: [
          ['kranz', "You must be the new trainee. I'm Gene Kranz, Flight Director. Welcome to *Mission Control*."],
          ['kranz', 'Today two men are going to try to land on the Moon: Neil Armstrong and Buzz Aldrin, in the lunar module *Eagle*.'],
        ], fact: 'eagle' },
        { chat: [['kranz', 'Their crewmate Michael Collins is waiting for them, circling the Moon in *Columbia*.']], fact: 'collins' },
        { chat: [
          ['kranz', 'Every person in this room is an expert on one part of the mission. Before Eagle starts down, I ask each of them: *Go or No-Go*?'],
          ['kranz', 'Go round and ask four of them for me: *FIDO*, *Guidance*, *Control* and the *Surgeon*.'],
        ] },
        { goal: 'Ask the controllers: *Go or No-Go?*', each: [
          { talk: 'greene', say: ['greene', 'FIDO here, Flight Dynamics. I watch where the spacecraft is going. FIDO is *Go*!'] },
          { talk: 'bales', say: ['bales', 'Guidance, that\'s me, Steve Bales. I watch the computers on board. Guidance is *Go*!'] },
          { talk: 'carlton', say: ['carlton', 'Control: I watch Eagle\'s engine and fuel. Control is *Go*!'] },
          { talk: 'surgeon', say: ['surgeon', 'I\'m the flight surgeon, a doctor. I can see the astronauts\' heartbeats from here! Surgeon is *Go*!'] },
        ], fact: 'poll' },
        { goal: 'Report back to *Gene Kranz*', talk: 'kranz' },
        { chat: [['kranz', 'All Go? Then here we go.'], ['kranz', 'CAPCOM, we\'re Go for powered descent.'], ['duke', 'Eagle, Houston. You are Go for powered descent.', { radio: true }]], fact: 'capcom' },
      ] },
      { title: 'Program alarm', set: 'control', start: [-0.5, 3.0, 'kranz'], steps: [
        { do: () => AU.ui('alarm'), wait: 0.6 },
        { chat: [
          ['armstrong', 'Program alarm.'],
          ['duke', "It's looking good to us. Over."],
          ['armstrong', "It's a 1202."],
          ['aldrin', '1202.'],
          ['kranz', 'Guidance, what is a 1202? We need to know, quickly!'],
        ] },
        { goal: 'Ask *Jack Garman* in the back room what a 1202 means', talk: 'garman' },
        { chat: [['garman', 'I wrote down every alarm the computer can give, just in case! Help me find it, fast.']] },
        { play: 'lookup', sheet: 'Program alarms: what they mean', alarms: ['1202', '1201'], codes: [
          ['1102', 'Self-test found a problem'],
          ['1107', 'Job list got mixed up'],
          ['1201', 'Too busy: no room for new jobs', 'Too busy again! Same as 1202: the computer drops less important jobs and carries on.'],
          ['1202', 'Too busy: restart, keep important jobs', 'Executive overflow: the computer has too many jobs. It restarts and keeps doing the most important ones. Safe, if it doesn\'t happen too often.'],
          ['1210', 'Two jobs want the same part at once'],
          ['1211', 'A job was interrupted the wrong way'],
          ['1302', 'Tried to take a square root of a negative number'],
          ['1501', 'Keyboard problem'],
          ['1520', 'That command is not allowed now'],
        ], winText: 'Both found! The computer is just too busy. It drops the small jobs and keeps the important ones.' },
        { goal: 'Tell *Steve Bales* what the alarm means', talk: 'bales' },
        { ask: 'bales', q: 'So, do we keep going? Go or No-Go?', a: [
          ['Go! The computer is busy, but it keeps doing the important jobs', true, "That's what I think too. Flight, we're Go on that alarm!"],
          ['No-Go! Turn back right away', false, 'Hmm, are you sure? Remember what the list said: the computer restarts and keeps the most important jobs.'],
          ['Switch the computer off', false, "They can't land without the computer! Remember what the list said it does."],
        ], fact: 'alarm' },
        { chat: [['duke', "Roger. We got you. We're Go on that alarm.", { radio: true }]] },
        { say: 'narrator', text: 'The computer\'s programs had been written by a team at MIT led by Margaret Hamilton. They were built to keep the most important jobs running when things got busy.', fact: 'hamilton' },
      ] },
      { title: 'Sixty seconds', set: 'control', start: [-10.6, -1.2, 'kranz'], steps: [
        { chat: [
          ['armstrong', "We're going long… There's a lot of big rocks down there."],
          ['kranz', "He's taken over and is flying it by hand, past a field of boulders."],
          ['carlton', 'Fuel is getting low, Flight.'],
          ['kranz', 'Trainee, follow along on your console. Find the flat ground with Neil!'],
        ] },
        { play: 'lander', fuel: 64, winText: 'Contact light! Eagle is down, safe and level.' },
        { chat: [
          ['armstrong', 'Houston, Tranquility Base here. The *Eagle* has landed.'],
          ['duke', "Roger, Twan… Tranquility, we copy you on the ground. You got a bunch of guys about to turn blue. We're breathing again. Thanks a lot.", { radio: true }],
        ], fact: 'landed' },
        { do: (S) => { AU.ui('cheer'); S.data.cheer(true); }, wait: 3 },
        { do: (S) => S.data.cheer(false) },
        { chat: [['kranz', 'All right, everybody, settle down! We still have work to do.'], ['kranz', 'They landed with less than a minute of fuel to spare. That was close!']], fact: 'fuel' },
      ] },
      { title: 'One small step', set: 'control', start: [-10.4, -7.6, 'kranz'], setup(S) { S.actors.kranz.tp(1.5, -7.2, 0); S.actors.kranz.fixedY = null; }, steps: [
        { banner: 'About six and a half hours later', small: '', sub: 'Almost 10 o\'clock at night in Houston' },
        { chat: [['kranz', 'The TV picture is coming in, straight from the Moon. Come and watch the big screen with me!']] },
        { goal: 'Watch the big screen at the front', to: 'front' },
        { scene: 'moon', at: [-2.3, 6, 0], setup(S) { PL.cut = S.data.tvCam; document.body.classList.add('tv'); } },
        { do: (S) => S.data.ladder() },
        { chat: [['armstrong', "I'm at the foot of the ladder. The surface appears to be very, very fine grained, almost like a powder."], ['armstrong', "I'm going to step off the LM now."]] },
        { do: (S) => S.data.stepOff(), wait: 0.5 },
        { say: 'armstrong', text: "That's one small step for man… one giant leap for mankind.", fact: 'step' },
        { wait: 1.5 },
        { say: 'narrator', text: 'About twenty minutes later, Buzz Aldrin climbed down to join him. He called the view "magnificent desolation".', fact: 'buzz' },
        { say: 'narrator', text: 'They planted a flag, set up experiments, and left a plaque on Eagle\'s leg: "We came in peace for all mankind."', fact: 'plaque' },
        { scene: 'control', at: [-1.5, -6.6, 'kranz'], setup(S) { PL.cut = null; document.body.classList.remove('tv'); S.actors.kranz.tp(1.5, -7.6, -Math.PI / 2 - 0.4); } },
        { chat: [
          ['kranz', 'There it is, trainee. History, right there on the screen. Thank you for your help today.'],
          ['kranz', "Their footprints will stay up there for millions of years. There's no wind on the Moon to blow them away."],
        ], fact: 'footprints' },
      ] },
    ],
  });
})();
