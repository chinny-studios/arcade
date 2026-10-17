// Minigame "tunnel": test model wings in a wind tunnel, write down the lift, then pick the best one.
// params: { wings: [{ name, camber (0..0.2), aspect (1..8), lift, note }], need: 3 }

Minigames.add('tunnel', {
  title: 'The wind tunnel',
  how: 'Pick a model wing with ◀ ▶ and press Test. When you have tested them, choose the one that lifts best.',
  buttons() {
    return [
      { id: 'l', label: '◀', key: '←', keys: ['ArrowLeft', 'KeyA'] },
      { id: 'test', label: 'Test this wing', key: 'E', keys: ['KeyE', 'Space', 'Enter'], cls: 'main' },
      { id: 'r', label: '▶', key: '→', keys: ['ArrowRight', 'KeyD'] },
      { id: 'pick', label: 'This one is the best!', key: 'B', keys: ['KeyB', 'KeyF'] },
    ];
  },
  init(g, p) {
    g.wings = p.wings; g.sel = 0; g.results = {}; g.testing = 0; g.needle = 0; g.air = [];
    for (let i = 0; i < 40; i++) g.air.push([Math.random() * 600, 150 + Math.random() * 160, 0.5 + Math.random()]);
  },
  update(g, dt) {
    const n = g.wings.length;
    if (g.testing > 0) {
      g.testing -= dt;
      const w = g.wings[g.sel];
      g.needle = lerp(g.needle, w.lift / 10, Math.min(1, dt * 2.5));
      if (g.testing <= 0) { g.results[g.sel] = w.lift; AU.ui('ok'); g.tip(w.note || 'Written in the notebook.', 3); }
      return;
    }
    g.needle = lerp(g.needle, 0, Math.min(1, dt * 3));
    if (g.hit('l')) { g.sel = (g.sel + n - 1) % n; AU.ui('click'); }
    if (g.hit('r')) { g.sel = (g.sel + 1) % n; AU.ui('click'); }
    if (g.hit('test')) { g.testing = 2.2; AU.ui('engine'); }
    if (g.hit('pick')) {
      const tested = Object.keys(g.results).length, need = Math.max(1, (g.p.need || 3) - g.assist);
      if (tested < need) { AU.ui('bad'); g.tip(`Test at least ${need} wings first. The Wrights trusted their measurements, not guesses!`); return; }
      const best = g.wings.reduce((b, w, i) => (w.lift > g.wings[b].lift ? i : b), 0);
      if (g.sel === best) g.win(g.p.winText);
      else if (g.results[g.sel] == null) { AU.ui('bad'); g.tip('You haven\'t tested that one yet. Test it, then decide.'); }
      else { AU.ui('bad'); g.tip('Look at the notebook. Which wing pushed the needle highest?' + (g.results[best] == null ? ' (There is one you haven\'t tested.)' : '')); }
    }
  },
  tap(g, x, y) {
    if (y > 380 && y < 520) { const n = g.wings.length, w = 880 / n; const i = Math.floor((x - 40) / w); if (i >= 0 && i < n) { g.sel = i; AU.ui('click'); } }
  },
  wingShape(c, w, x, y, s, col) {
    // side view: the curve of the wing
    c.save(); c.translate(x, y); c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-40 * s, 0); c.quadraticCurveTo(0, -w.camber * 300 * s, 40 * s, 0); c.stroke();
    // top view: how long and narrow it is
    const ww = 26 * Math.sqrt(w.aspect) * s, hh = 52 * s / Math.sqrt(w.aspect);
    c.fillStyle = col; c.globalAlpha = 0.85; c.fillRect(-ww, 18 * s, ww * 2, hh); c.globalAlpha = 1;
    c.restore();
  },
  draw(g, c) {
    D.sky(c, '#5a4630', '#3a2c1e');
    // the tunnel: a wooden box with a fan at one end and a glass window on top
    c.fillStyle = '#8a6a44'; c.fillRect(40, 120, 640, 220); c.fillStyle = '#6a4a2c'; c.fillRect(40, 120, 640, 16); c.fillRect(40, 324, 640, 16);
    c.fillStyle = '#d8e8ee'; c.fillRect(260, 150, 200, 160); c.strokeStyle = '#4a3420'; c.lineWidth = 6; c.strokeRect(260, 150, 200, 160);
    // the fan
    c.save(); c.translate(70, 230); c.rotate(g.testing > 0 ? g.t * 30 : 0); c.fillStyle = '#5a5a60'; for (let i = 0; i < 2; i++) { c.rotate(Math.PI); c.fillRect(-6, 0, 12, 80); } c.restore();
    // air
    if (g.testing > 0) for (const a of g.air) { a[0] = (a[0] + a[2] * 12) % 600; c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(80 + a[0], a[1]); c.lineTo(110 + a[0], a[1]); c.stroke(); }
    // the model on its balance
    const w = g.wings[g.sel], lift = g.needle;
    this.wingShape(c, w, 360, 240 - lift * 20, 1, '#f4ecd8');
    c.strokeStyle = '#c8a050'; c.lineWidth = 3; c.beginPath(); c.moveTo(360, 300); c.lineTo(360, 240 - lift * 20); c.stroke();
    // the lift dial
    c.save(); c.translate(560, 250); c.fillStyle = '#f4ecd8'; c.beginPath(); c.arc(0, 0, 60, Math.PI, 0); c.fill();
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; c.beginPath(); c.moveTo(Math.cos(a) * 50, Math.sin(a) * 50); c.lineTo(Math.cos(a) * 58, Math.sin(a) * 58); c.stroke(); }
    const na = Math.PI + clamp(lift, 0, 1) * Math.PI; c.strokeStyle = '#a02020'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(na) * 52, Math.sin(na) * 52); c.stroke();
    D.text(c, 'LIFT', 0, 22, { size: 14, align: 'center', color: '#f4ecd8' }); c.restore();
    // notebook
    c.fillStyle = '#f4ecd0'; D.rr(c, 710, 60, 220, 300, 8); c.fill();
    c.strokeStyle = 'rgba(80,120,200,.25)'; c.lineWidth = 1; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(720, 110 + i * 22); c.lineTo(920, 110 + i * 22); c.stroke(); }
    D.text(c, 'Our notebook', 820, 90, { size: 18, align: 'center', color: '#3a2a1a' });
    g.wings.forEach((wi, i) => {
      const y = 130 + i * 50;
      D.text(c, wi.name, 722, y, { size: 15, color: '#3a2a1a', w: 700 });
      if (g.results[i] != null) { D.bar(c, 722, y + 8, 190, 12, g.results[i] / 10, '#5a8ad8', 'rgba(0,0,0,.08)'); }
      else D.text(c, 'not tested', 722, y + 20, { size: 13, color: '#9a8a7a' });
    });
    // wing cards
    const n = g.wings.length, cw = 880 / n;
    g.wings.forEach((wi, i) => {
      const x = 40 + i * cw;
      D.rr(c, x + 6, 384, cw - 12, 130, 12); c.fillStyle = i === g.sel ? '#fff4d8' : '#e8dcc0'; c.fill();
      c.strokeStyle = i === g.sel ? '#d8962a' : '#a08860'; c.lineWidth = i === g.sel ? 4 : 2; c.stroke();
      this.wingShape(c, wi, x + cw / 2, 430, 0.8, '#6a4a2a');
      D.text(c, wi.name, x + cw / 2, 504, { size: 15, align: 'center', color: '#3a2a1a', w: 700 });
      if (g.results[i] != null) D.text(c, '✓', x + cw - 26, 408, { size: 20, color: '#4a8a3a' });
    });
  },
});
