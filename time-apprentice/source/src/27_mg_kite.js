// Minigame "kite": keep a glider level in gusty wind by twisting (warping) its wings with the control cords.
// Seen from behind. params: { time: 15, gust: 1 }

Minigames.add('kite', {
  title: 'Wing-warping',
  how: 'Gusts tip the glider. Press ◀ or ▶ to twist the wings and roll it back level. Keep it steady!',
  buttons() {
    return [
      { id: 'l', label: '◀ Twist left', key: '← / A', keys: ['ArrowLeft', 'KeyA'] },
      { id: 'r', label: 'Twist right ▶', key: '→ / D', keys: ['ArrowRight', 'KeyD'] },
    ];
  },
  init(g, p) {
    g.roll = 0; g.rv = 0; g.gust = 0; g.gustT = 1; g.steady = 0; g.need = p.time || 15; g.warp = 0; g.danger = 0; g.alt = 0;
    g.gk = (p.gust || 1) * (1 - g.assist * 0.2);
  },
  update(g, dt) {
    g.gustT -= dt;
    if (g.gustT <= 0) { g.gustT = 1.2 + Math.random() * 1.6; g.gust = (Math.random() * 2 - 1) * 1.15 * g.gk; }
    const want = (g.held('r') ? 1 : 0) - (g.held('l') ? 1 : 0);
    g.warp = lerp(g.warp, want, Math.min(1, dt * 8));
    // the gust pushes, warping pushes back, and a little natural damping
    g.rv += (g.gust * 0.9 + g.roll * 0.25 - g.warp * 2.2) * dt;
    g.rv *= Math.pow(0.35, dt);
    g.roll += g.rv * dt;
    g.alt = Math.sin(g.t * 0.7) * 10;
    const a = Math.abs(g.roll);
    if (a < 0.35) g.steady += dt; else g.steady = Math.max(0, g.steady - dt * 0.5);
    g.danger = a > 0.55 ? Math.min(1, g.danger + dt) : Math.max(0, g.danger - dt * 2);
    if (a > 0.9) g.fail(g.p.failText || 'It tipped over and dipped into the sand! Try to catch it sooner: twist the other way as soon as it starts to tilt.');
    if (g.steady >= g.need) g.win(g.p.winText);
  },
  draw(g, c) {
    D.sky(c, '#8a9aaa', '#d8dcd8', 380);
    // dunes and the sea
    c.fillStyle = '#6a7a84'; c.fillRect(0, 300, 960, 40);
    c.fillStyle = '#d8c8a0'; c.beginPath(); c.moveTo(0, 340); c.quadraticCurveTo(300, 300, 520, 350); c.quadraticCurveTo(760, 390, 960, 330); c.lineTo(960, 540); c.lineTo(0, 540); c.fill();
    c.fillStyle = '#c8b890'; c.beginPath(); c.moveTo(0, 450); c.quadraticCurveTo(480, 400, 960, 460); c.lineTo(960, 540); c.lineTo(0, 540); c.fill();
    // cords
    const gx = 480, gy = 190 + g.alt;
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(gx - 200 * Math.cos(g.roll), gy + 200 * Math.sin(g.roll) + 20); c.lineTo(420, 560); c.moveTo(gx + 200 * Math.cos(g.roll), gy - 200 * Math.sin(g.roll) + 20); c.lineTo(540, 560); c.stroke();
    // the glider from behind: two long wings with struts, a front elevator and the wingtips twisting
    c.save(); c.translate(gx, gy); c.rotate(-g.roll);
    const span = 230, gap = 34, tw = g.warp * 8;
    c.fillStyle = '#efe6d0'; c.strokeStyle = '#7a5a3a'; c.lineWidth = 2;
    for (const yy of [-gap, 0]) {
      c.beginPath(); c.moveTo(-span, yy - tw); c.lineTo(-span + 30, yy - 5); c.lineTo(span - 30, yy - 5); c.lineTo(span, yy + tw); c.lineTo(span, yy + 5 + tw); c.lineTo(span - 30, yy + 4); c.lineTo(-span + 30, yy + 4); c.lineTo(-span, yy + 5 - tw); c.closePath(); c.fill(); c.stroke();
    }
    c.beginPath(); for (let i = -4; i <= 4; i++) { const x = i * span / 4.4; c.moveTo(x, -gap); c.lineTo(x, 0); } c.stroke();
    c.fillStyle = '#e4dac0'; c.fillRect(-60, 26, 120, 6);
    c.restore();
    // meters
    D.text(c, 'Keep it level', 480, 40, { size: 22, align: 'center', color: '#fff', stroke: 'rgba(0,0,0,.35)' });
    D.bar(c, 330, 56, 300, 18, g.steady / g.need, '#8fdc6a');
    if (g.danger > 0) D.text(c, g.roll > 0 ? 'It\'s tipping! Twist ▶' : 'It\'s tipping! ◀ Twist', 480, 110, { size: 26, align: 'center', color: '#ffd0a0', stroke: '#6a2a1a' });
    // a level indicator
    c.save(); c.translate(860, 470); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.fill();
    c.rotate(-g.roll); c.strokeStyle = Math.abs(g.roll) < 0.35 ? '#8fdc6a' : '#ffb070'; c.lineWidth = 5; c.beginPath(); c.moveTo(-40, 0); c.lineTo(40, 0); c.stroke(); c.restore();
  },
});
