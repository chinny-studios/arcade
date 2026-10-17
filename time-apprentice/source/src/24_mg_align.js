// Minigame "align": find north from two stars that circle the pole. When one star is straight above the other,
// a plumb line through both points due north. params: { stars: ['Kochab', 'Mizar'], speed }

Minigames.add('align', {
  title: 'Find true north',
  how: 'Move the plumb line with ← → (or tap left and right). When one star is straight above the other and the line runs through both, press Mark!',
  buttons() {
    return [
      { id: 'l', label: '◀ Move', key: '← / A', keys: ['ArrowLeft', 'KeyA'] },
      { id: 'mark', label: 'Mark north!', key: 'Space / E', keys: ['Space', 'KeyE', 'Enter'], cls: 'main' },
      { id: 'r', label: 'Move ▶', key: '→ / D', keys: ['ArrowRight', 'KeyD'] },
    ];
  },
  init(g, p) {
    g.px = 480; g.py = 190; g.rad = 120;
    g.ang = 0.5 - g.tries * 0.15;
    g.speed = (p.speed || 0.2) * (1 - g.assist * 0.15);
    g.lx = 300 + Math.random() * 60; g.tol = (9 + g.assist * 4) * D2R; g.tolX = 16 + g.assist * 8;
    g.bg = []; const r = mulberry32(42); for (let i = 0; i < 140; i++) g.bg.push([r() * 960, r() * 380, r() * 1.6 + 0.4, r()]);
    g.marked = 0; g.flash = 0;
  },
  update(g, dt) {
    g.ang += g.speed * dt;
    const mv = (g.held('r') ? 1 : 0) - (g.held('l') ? 1 : 0);
    g.lx = clamp(g.lx + mv * 160 * dt, 60, 900);
    g.flash = Math.max(0, g.flash - dt);
    if (g.hit('mark')) {
      // how far the line between the stars is from vertical, either star on top
      const off = Math.abs((((g.ang % Math.PI) + Math.PI) % Math.PI) - Math.PI / 2);
      const dx = Math.abs(g.lx - g.px);
      if (off < g.tol && dx < g.tolX) { g.marked = 1; AU.ui('ok'); g.win(g.p.winText); }
      else if (dx >= g.tolX) { AU.ui('bad'); g.flash = 0.5; g.tip('The plumb line has to run through *both* stars. Move it until it touches them.'); }
      else { AU.ui('bad'); g.flash = 0.5; g.tip(off < 0.6 ? 'Close! Wait until one star is *exactly* above the other.' : 'Not yet. Watch the stars turn, and wait until one is straight above the other.'); }
    }
  },
  tap(g, x) { g.lx = clamp(x, 60, 900); },
  draw(g, c) {
    const p = g.p;
    D.sky(c, '#060a1e', '#1a2448', 420);
    for (const s of g.bg) { c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(g.t * 1.3 + s[3] * 9)); c.fillStyle = '#fff'; c.fillRect(s[0], s[1], s[2], s[2]); }
    c.globalAlpha = 1;
    // the two marker stars with their neighbours, turning about the pole
    const star = (k, name, col, extra) => {
      const a = g.ang + k * Math.PI, x = g.px + Math.cos(a) * g.rad, y = g.py + Math.sin(a) * g.rad;
      for (const e of extra) { const ea = a + e[0], er = g.rad + e[1]; c.fillStyle = 'rgba(220,230,255,.75)'; c.beginPath(); c.arc(g.px + Math.cos(ea) * er, g.py + Math.sin(ea) * er, 2.2, 0, TAU); c.fill(); }
      const gr = c.createRadialGradient(x, y, 0, x, y, 16); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill();
      D.text(c, name, x + 14, y - 10, { size: 15, color: '#c8d4ff' });
    };
    const names = p.stars || ['Kochab', 'Mizar'];
    star(0, names[0], 'rgba(255,190,120,.9)', [[0.22, 22], [0.4, 10], [-0.15, 30]]);
    star(1, names[1], 'rgba(200,220,255,.9)', [[0.25, -18], [0.5, -28], [0.75, -26], [-0.2, 12], [-0.36, 30]]);
    if (g.assist > 1) { c.strokeStyle = 'rgba(255,255,255,.15)'; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(g.px, 40); c.lineTo(g.px, 400); c.stroke(); c.setLineDash([]); }
    // horizon: the circular wall used as a level skyline
    c.fillStyle = '#0c0a10'; c.beginPath(); c.moveTo(0, 420); c.quadraticCurveTo(480, 395, 960, 420); c.lineTo(960, 540); c.lineTo(0, 540); c.fill();
    c.fillStyle = '#2a2018'; c.fillRect(0, 440, 960, 100);
    c.fillStyle = '#3a2c20'; for (let i = 0; i < 16; i++) c.fillRect(i * 62, 440, 58, 22);
    // the plumb line: a string on a frame with a weight
    const lx = g.lx;
    c.strokeStyle = g.flash > 0 ? '#ff9a7a' : '#f0e0b0'; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, 20); c.lineTo(lx, 452); c.stroke();
    c.fillStyle = '#c89a4a'; c.beginPath(); c.moveTo(lx - 8, 452); c.lineTo(lx + 8, 452); c.lineTo(lx, 474); c.fill();
    c.fillStyle = '#6a4a2a'; c.fillRect(lx - 40, 12, 80, 10);
    D.text(c, 'N', lx, 510, { size: 26, align: 'center', color: '#ffd25a' });
  },
});
