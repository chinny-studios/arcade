// Minigame "neon": bend a glass tube along a chalk pattern, the way Hong Kong's neon masters made signs by hand.
// At each corner: hold Heat until the glass glows soft (not too little, or it cracks; not too much, or it sags), then
// turn the tube to match the pattern and Bend. At the end the tube is filled with gas and lights up.
// params: { pattern: [[x, y], ...] in a 600 × 360 box, color: '#ff4a3a', label: 'what it is', gas: 'neon' }

Minigames.add('neon', {
  title: 'Bend the neon tube',
  how: 'Hold *Heat* until the glass glows orange, then let go. Turn it with *left* / *right* to follow the chalk line, and *Bend*.',
  buttons() {
    return [
      { id: 'l', label: '↺ Turn', key: '← / A', keys: ['ArrowLeft', 'KeyA', 'KeyZ'] },
      { id: 'heat', label: 'Heat (hold)', key: 'Space / E', keys: ['Space', 'KeyE', 'Enter'], cls: 'main' },
      { id: 'bend', label: 'Bend', key: 'B / F', keys: ['KeyB', 'KeyF', 'ArrowUp', 'KeyW'] },
      { id: 'r', label: 'Turn ↻', key: '→ / D', keys: ['ArrowRight', 'KeyD', 'KeyX'] },
    ];
  },
  init(g, p) {
    const pts = p.pattern || [[0, 300], [0, 60], [300, 0], [600, 60], [600, 300]];
    g.pts = pts.map((q) => [180 + q[0], 110 + q[1]]);
    // the tube runs from pts[0] to pts[v]; the last stretch is still growing while grow < 1
    g.v = 1; g.grow = 1; g.heat = 0; g.phase = 'grow'; g.mist = 0; g.maxMist = 4 + g.assist;
    g.band = [0.58 - g.assist * 0.05, 0.84 + g.assist * 0.04];
    g.tol = 0.2 + g.assist * 0.07; g.ang = 0; g.light = 0; g.msgT = 0;
  },
  dir(g, i) { const a = g.pts[i], b = g.pts[i + 1]; return Math.atan2(b[1] - a[1], b[0] - a[0]); },
  mistake(g, text) { g.mist++; AU.ui('bad'); g.tip(text, 3); if (g.mist >= g.maxMist) g.fail('The glass broke one time too many. A neon master trains for years! Try again: orange glow, then match the line.'); },
  update(g, dt) {
    const n = g.pts.length - 1;
    if (g.phase === 'grow') {
      g.grow = Math.min(1, g.grow + dt * 1.8);
      if (g.grow >= 1) { if (g.v >= n) { g.phase = 'gas'; g.light = 0; AU.ui('ok'); } else { g.phase = 'heat'; g.heat = 0; } }
      return;
    }
    if (g.phase === 'gas') {
      g.light = Math.min(1, g.light + dt * 0.6);
      if (Math.random() < dt * 8) AU.tone(55, 0.12, { v: 0.03, type: 'sawtooth' });
      if (g.light >= 1) { g.phase = 'done'; g.doneT = 0; }
      return;
    }
    if (g.phase === 'done') { g.doneT += dt; if (g.doneT > 1.2) g.win(g.p.winText); return; }
    if (g.phase === 'heat') {
      if (g.held('heat')) { g.heat += dt * (0.5 - g.assist * 0.06); if (Math.random() < dt * 10) AU.ui('sizzle'); if (g.heat > 1) { g.heat = 0; this.mistake(g, 'Too hot! The glass went floppy and sagged. Let go when it glows *orange*.'); } }
      else if (g.heat > 0.05) {
        if (g.heat < g.band[0]) { g.heat = 0; this.mistake(g, 'Too cold! Glass that isn\'t soft enough *cracks* when you bend it. Heat it a little longer.'); }
        else { g.phase = 'turn'; AU.ui('ok'); g.ang = this.dir(g, g.v - 1); g.soft = 1.5; }
      }
      return;
    }
    if (g.phase === 'turn') {
      g.soft -= dt * 0.12;
      const t = (g.held('r') ? 1 : 0) - (g.held('l') ? 1 : 0);
      g.ang += t * dt * 1.6;
      if (g.hit('bend')) {
        const want = this.dir(g, g.v), d = Math.abs(angWrap(g.ang - want));
        if (d <= g.tol) { g.v++; g.grow = 0; g.phase = 'grow'; AU.ui('hit'); }
        else this.mistake(g, `That doesn't match the chalk line. Turn it ${angWrap(want - g.ang) > 0 ? 'clockwise ↻' : 'the other way ↺'} until the glowing end lines up.`);
      }
      if (g.soft <= 0) { g.phase = 'heat'; g.heat = 0; g.tip('It cooled down. Heat it again!', 2); }
    }
  },
  draw(g, c) {
    const p = g.p, col = p.color || '#ff4a3a', on = g.phase === 'gas' || g.phase === 'done';
    // the bench: a sheet with the pattern drawn on it, the burner
    c.fillStyle = on ? '#141018' : '#3a3438'; c.fillRect(0, 0, 960, 540);
    c.fillStyle = on ? '#1e1a22' : '#e8e2d4'; D.rr(c, 150, 80, 660, 420, 10); c.fill();
    c.setLineDash([10, 8]); c.strokeStyle = on ? 'rgba(255,255,255,.08)' : '#7a7a8a'; c.lineWidth = 3;
    c.beginPath(); g.pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke(); c.setLineDash([]);
    if (p.label) D.text(c, p.label, 480, 72, { size: 20, align: 'center', color: '#f4e8d0' });
    // the glass so far
    const path = g.pts.slice(0, g.v), a = g.pts[g.v - 1], b = g.pts[g.v];
    const end = [lerp(a[0], b[0], g.grow), lerp(a[1], b[1], g.grow)]; path.push(end);
    const drawTube = (w, s) => { c.lineWidth = w; c.strokeStyle = s; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); path.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke(); };
    if (on) { c.save(); c.shadowColor = col; c.shadowBlur = 30 * g.light; drawTube(14, col); c.restore(); drawTube(5, mixCss(col, '#ffffff', 0.6)); c.globalAlpha = 1; }
    else { drawTube(11, 'rgba(200,220,230,.55)'); drawTube(3, 'rgba(255,255,255,.8)'); }
    // the end being worked: glow from the heat, and the ghost of where it will point
    if (g.phase === 'heat' || g.phase === 'turn') {
      const k = g.phase === 'heat' ? g.heat : Math.max(0.3, g.soft / 1.5);
      const glow = k < g.band[0] ? mixCss('#c8d8e0', '#ff8a3a', k / g.band[0]) : k <= g.band[1] ? '#ffa040' : '#fff4c0';
      c.save(); c.shadowColor = glow; c.shadowBlur = 24 * k; c.fillStyle = glow; c.beginPath(); c.arc(end[0], end[1], 12, 0, TAU); c.fill(); c.restore();
      const ang = g.phase === 'turn' ? g.ang : this.dir(g, g.v - 1);
      c.strokeStyle = g.phase === 'turn' ? 'rgba(255,170,80,.9)' : 'rgba(200,220,230,.4)'; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(end[0], end[1]); c.lineTo(end[0] + Math.cos(ang) * 90, end[1] + Math.sin(ang) * 90); c.stroke();
      // the burner's flame under the bend
      for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(${90 + i * 30},${140 + i * 20},255,${0.25 + (g.held('heat') ? 0.3 : 0)})`; c.beginPath(); c.ellipse(end[0], end[1] + 26 - i * 4, 8 - i, 18 - i * 2, 0, 0, TAU); c.fill(); }
      // heat gauge
      D.bar(c, 360, 20, 240, 18, g.phase === 'heat' ? g.heat : 0, g.heat > g.band[1] ? '#fff4c0' : g.heat >= g.band[0] ? '#ffa040' : '#9ab8c8');
      c.strokeStyle = '#ffd25a'; c.lineWidth = 2; c.strokeRect(360 + 240 * g.band[0], 16, 240 * (g.band[1] - g.band[0]), 26);
      D.text(c, 'Heat', 350, 35, { size: 16, align: 'right' });
      D.text(c, g.phase === 'heat' ? 'Hold Heat…' : 'Turn to match, then Bend!', 760, 36, { size: 18, align: 'center', color: '#fff8e0' });
    }
    D.text(c, `Corner ${Math.min(g.v, g.pts.length - 2)} of ${g.pts.length - 2}`, 80, 36, { size: 18, color: '#e8dcc8' });
    for (let i = 0; i < g.maxMist; i++) { c.fillStyle = i < g.mist ? '#5a4a4a' : '#bfe0ea'; c.fillRect(80 + i * 22, 46, 14, 8); }
    if (on) D.text(c, (p.gas || 'Neon gas') + ', and power!', 480, 530, { size: 20, align: 'center', color: col });
  },
});
