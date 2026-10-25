// Minigame "approach": fly the famous approach into Kai Tak on a map. Follow the guidance beam toward the
// checkerboard on the hill, then make the big right turn (47 degrees) low over Kowloon City and line up with the
// runway in the harbour.
// params: { wind: 1 }

Minigames.add('approach', {
  title: 'The checkerboard turn',
  how: 'Hold *left* or *right* to steer. Follow the dotted beam toward the checkerboard, then turn right and line up with the runway.',
  buttons() {
    return [
      { id: 'l', label: '◀ Left', key: '← / A', keys: ['ArrowLeft', 'KeyA', 'KeyZ'] },
      { id: 'r', label: 'Right ▶', key: '→ / D', keys: ['ArrowRight', 'KeyD', 'KeyX'] },
    ];
  },
  init(g, p) {
    const T = g.T = [520, 262], rd = g.rd = 45 * D2R, L = 160;
    g.P = [T[0] - Math.cos(rd) * L, T[1] - Math.sin(rd) * L];
    g.bd = -2 * D2R; // the beam heading, a little north of east (088 degrees)
    g.hill = [g.P[0] + 52, g.P[1] - 40];
    const back = g.P[0] - 30;
    g.x = 30; g.y = g.P[1] + Math.tan(-g.bd) * (g.P[0] - 30) + 6; g.h = g.bd + 0.03;
    g.v = 36; g.trail = []; g.end = null; g.endT = 0;
    g.wk = (p.wind == null ? 1 : p.wind) * (1 - Math.min(0.8, g.assist * 0.3));
    g.tolBeam = 34 + g.assist * 12; g.tolLat = 11 + g.assist * 5; g.tolHdg = (9 + g.assist * 4) * D2R;
    g.total = Math.hypot(g.P[0] - g.x, g.P[1] - g.y) + L; g.back = back;
  },
  // signed distance from a line through a with direction angle d (positive = to the right of travel)
  side(x, y, a, d) { return -(x - a[0]) * Math.sin(d) + (y - a[1]) * Math.cos(d); },
  along(x, y, a, d) { return (x - a[0]) * Math.cos(d) + (y - a[1]) * Math.sin(d); },
  update(g, dt) {
    if (g.end) { g.endT += dt; if (g.endT > 1.8) { if (g.end.ok) g.win(g.p.winText); else g.fail(g.end.why); } return; }
    const st = (g.held('r') ? 1 : 0) - (g.held('l') ? 1 : 0);
    g.h += st * 0.5 * dt;
    const wx = Math.sin(g.t * 0.6) * 4 * g.wk, wy = (Math.sin(g.t * 0.37 + 2) * 5 + 2) * g.wk;
    g.x += Math.cos(g.h) * g.v * dt + wx * dt; g.y += Math.sin(g.h) * g.v * dt + wy * dt;
    if (G.frame % 3 === 0) g.trail.push([g.x, g.y]);
    if (Math.random() < dt * 2) AU.burst(0.4, { f: 220, q: 0.5, v: 0.03 });
    const ab = this.along(g.x, g.y, g.P, g.bd), sb = this.side(g.x, g.y, g.P, g.bd);
    const ar = this.along(g.x, g.y, g.T, g.rd), sr = this.side(g.x, g.y, g.T, g.rd);
    const turned = angWrap(g.h - g.bd) > 25 * D2R;
    if (ab < -45 && Math.abs(sb) > g.tolBeam) { g.end = { ok: false, why: 'You drifted too far from the guidance beam. Keep on the dotted line until you are close to the checkerboard.' }; AU.ui('bad'); }
    else if (!turned && ab > 70) { g.end = { ok: false, why: 'Too late! You flew past the checkerboard, toward the hills. Go around! Start the turn just before the checkerboard.' }; AU.ui('bad'); }
    else if (ar >= 0 && turned) {
      const he = Math.abs(angWrap(g.h - g.rd));
      if (Math.abs(sr) <= g.tolLat && he <= g.tolHdg) { g.end = { ok: true }; AU.ui('thud'); AU.ui('win'); }
      else { g.end = { ok: false, why: Math.abs(sr) > g.tolLat ? 'You were not lined up with the runway. Go around! Finish the turn on the dotted line from the runway.' : 'You were pointing the wrong way for the runway. Turn a little more (or less) so you line up with it.' }; AU.ui('bad'); }
    } else if (g.x < -20 || g.x > 980 || g.y < -20 || g.y > 560) { g.end = { ok: false, why: 'Way off course! Go around and try again.' }; AU.ui('bad'); }
    g.ab = ab; g.ar = ar;
  },
  map(c, g) {
    // sea, Kowloon (north), Hong Kong Island (south), the runway on its strip of reclaimed land
    c.fillStyle = '#3a6a88'; c.fillRect(0, 0, 960, 540);
    c.fillStyle = '#8aa070'; c.beginPath(); c.moveTo(0, 0); c.lineTo(960, 0); c.lineTo(960, 170); c.lineTo(760, 200); c.lineTo(640, 250); c.lineTo(520, 248); c.lineTo(430, 300); c.lineTo(300, 330); c.lineTo(160, 350); c.lineTo(0, 330); c.closePath(); c.fill();
    c.fillStyle = '#6a8a58'; c.beginPath(); c.moveTo(500, 0); c.quadraticCurveTo(560, 60, 700, 30); c.lineTo(760, 0); c.fill();
    D.text(c, 'Lion Rock', 640, 34, { size: 14, color: '#2a3a20' });
    c.fillStyle = '#8aa070'; c.beginPath(); c.moveTo(0, 470); c.lineTo(300, 455); c.lineTo(520, 480); c.lineTo(760, 470); c.lineTo(960, 490); c.lineTo(960, 540); c.lineTo(0, 540); c.fill();
    D.text(c, 'Hong Kong Island', 400, 520, { size: 15, color: '#2a3a20' });
    D.text(c, 'Victoria Harbour', 150, 420, { size: 15, color: '#bfe0f0' });
    D.text(c, 'Kowloon', 140, 250, { size: 18, color: '#2a3a20' });
    // the city blocks of Kowloon City under the turn
    const r = mulberry32(3);
    for (let i = 0; i < 70; i++) { const x = 300 + r() * 260, y = 120 + r() * 140; if (y > 260 - (x - 300) * 0.2) continue; c.fillStyle = r() < 0.5 ? '#b8b0a0' : '#a8a090'; c.fillRect(x, y, 8 + r() * 10, 8 + r() * 10); }
    D.text(c, 'Kowloon City', 430, 200, { size: 14, color: '#3a2a20' });
    // runway 13
    const T = g.T, rd = g.rd, L = 250, ex = T[0] + Math.cos(rd) * L, ey = T[1] + Math.sin(rd) * L;
    c.strokeStyle = '#c8c4b8'; c.lineWidth = 26; c.lineCap = 'butt'; c.beginPath(); c.moveTo(T[0] - Math.cos(rd) * 6, T[1] - Math.sin(rd) * 6); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 16; c.beginPath(); c.moveTo(T[0], T[1]); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = '#f4f4f0'; c.lineWidth = 2; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(T[0], T[1]); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]);
    D.text(c, 'Kai Tak · runway 13', ex - 40, ey + 30, { size: 14, color: '#fff' });
    // the checkerboard on the hill
    const [hx, hy] = g.hill;
    c.fillStyle = '#6a8a50'; c.beginPath(); c.ellipse(hx, hy, 34, 22, 0, 0, TAU); c.fill();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#f4f0e8' : '#e8642a'; c.fillRect(hx - 12 + i * 6, hy - 12 + j * 6, 6, 6); }
    D.text(c, 'Checkerboard Hill', hx, hy - 26, { size: 13, align: 'center', color: '#3a1a10' });
    // guidance: the beam toward the hill, and the line of lights from the runway
    c.strokeStyle = 'rgba(255,240,140,.7)'; c.lineWidth = 2; c.setLineDash([4, 8]);
    c.beginPath(); c.moveTo(g.P[0] - Math.cos(g.bd) * 600, g.P[1] - Math.sin(g.bd) * 600); c.lineTo(g.P[0] + Math.cos(g.bd) * 60, g.P[1] + Math.sin(g.bd) * 60); c.stroke();
    c.strokeStyle = 'rgba(255,190,120,.8)'; c.beginPath(); c.moveTo(T[0], T[1]); c.lineTo(T[0] - Math.cos(rd) * 230, T[1] - Math.sin(rd) * 230); c.stroke(); c.setLineDash([]);
    if (g.assist >= 1) {
      // the ideal turn: a circle at the full turn rate, starting a little before the beam meets the runway line
      const R = g.v / 0.5, th = g.rd - g.bd, k = R * Math.tan(th / 2), sx = g.P[0] - Math.cos(g.bd) * k, sy = g.P[1] - Math.sin(g.bd) * k;
      const cx = sx - Math.sin(g.bd) * R, cy = sy + Math.cos(g.bd) * R;
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 8; c.beginPath(); c.arc(cx, cy, R, g.bd - Math.PI / 2, g.rd - Math.PI / 2); c.stroke();
      D.text(c, 'turn here', sx - 30, sy - 12, { size: 13, color: '#fff' });
    }
  },
  plane(c, x, y, h, s = 1) {
    c.save(); c.translate(x, y); c.rotate(h); c.scale(s, s);
    c.fillStyle = '#f4f4f0'; c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(16, 0); c.lineTo(-14, -2.5); c.lineTo(-14, 2.5); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(3, 0); c.lineTo(-5, -15); c.lineTo(-9, -15); c.lineTo(-5, 0); c.lineTo(-9, 15); c.lineTo(-5, 15); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(-15, -6); c.lineTo(-16, 6); c.closePath(); c.fill();
    c.restore();
  },
  // a little pilot's-eye view: where the checkerboard and the runway are, ahead of the nose
  view(c, g) {
    const X = 690, Y = 330, W = 250, H = 150;
    c.save(); D.rr(c, X, Y, W, H, 10); c.clip();
    const sky = c.createLinearGradient(0, Y, 0, Y + H); sky.addColorStop(0, '#9ac0e0'); sky.addColorStop(0.55, '#d8e4ea'); sky.addColorStop(0.56, '#6a7a60'); sky.addColorStop(1, '#4a5a48');
    c.fillStyle = sky; c.fillRect(X, Y, W, H);
    const hor = Y + H * 0.55, at = (px, py) => { const b = angWrap(Math.atan2(py - g.y, px - g.x) - g.h); return [X + W / 2 + b * W * 0.9, Math.hypot(px - g.x, py - g.y)]; };
    const [hx, hd] = at(g.hill[0], g.hill[1]), hs = clamp(1600 / Math.max(20, hd), 6, 60);
    c.fillStyle = '#5a7a48'; c.beginPath(); c.ellipse(hx, hor, hs * 2.2, hs * 1.3, 0, Math.PI, TAU); c.fill();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { c.fillStyle = (i + j) % 2 ? '#f4f0e8' : '#e8642a'; c.fillRect(hx - hs * 0.6 + i * hs * 0.3, hor - hs * 1.05 + j * hs * 0.3, hs * 0.3, hs * 0.3); }
    const [rx, rdist] = at(g.T[0], g.T[1]), rw = clamp(900 / Math.max(10, rdist), 2, 70);
    c.fillStyle = '#3a3a3a'; c.beginPath(); c.moveTo(rx - rw, hor + 30); c.lineTo(rx + rw, hor + 30); c.lineTo(rx + rw * 0.2, hor + 2); c.lineTo(rx - rw * 0.2, hor + 2); c.fill();
    for (let k = 0; k < 6; k++) { c.fillStyle = '#ffe080'; c.fillRect(rx - rw * 0.1 + Math.sin(g.t * 3 + k) * 0.5, hor + 30 + k * 6, 3, 3); }
    // the rooftops of Kowloon City, very close below
    c.fillStyle = 'rgba(160,150,140,.9)'; for (let i = 0; i < 12; i++) c.fillRect(X + i * 22 + ((g.t * 30) % 22), Y + H - 18 - (i % 3) * 5, 18, 30);
    c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = 3; D.rr(c, X, Y, W, H, 10); c.stroke();
    D.text(c, 'from the cockpit', X + 10, Y + 18, { size: 13, color: '#1a2a3a' });
  },
  draw(g, c) {
    this.map(c, g);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.beginPath(); g.trail.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
    this.plane(c, g.x, g.y, g.h, 1.2);
    this.view(c, g);
    const left = clamp(((g.ab || -300) < 0 ? Math.hypot(g.P[0] - g.x, g.P[1] - g.y) + 160 : Math.max(0, -(g.ar || 0))) / g.total, 0, 1);
    D.text(c, `Height: ${Math.round(left * 2500 / 10) * 10} ft`, 30, 36, { size: 20, color: '#fff', stroke: 'rgba(0,0,0,.45)' });
    D.text(c, `Heading: ${String(Math.round(((g.h / D2R) + 90 + 360) % 360)).padStart(3, '0')}°`, 30, 62, { size: 18, color: '#fff', stroke: 'rgba(0,0,0,.45)' });
    if (g.end) D.text(c, g.end.ok ? 'Touchdown!' : 'Go around!', 480, 120, { size: 44, align: 'center', color: g.end.ok ? '#c8ffb0' : '#ffb0a0', stroke: '#1a2a3a', lw: 8 });
  },
});
