// Minigame "milktea": pull Hong Kong milk tea. Hold to lift the pot high so the tea falls a long way (that makes it
// silky), and steer so the stream lands in the pot below, which your other hand can't keep quite still.
// params: { pours: 3, need: 0.75 }

Minigames.add('milktea', {
  title: 'Pull the milk tea',
  how: 'Hold *Lift* to raise the pot: a long pour makes the tea silky. Steer with *left* and *right* to keep the stream in the pot below. Too high and it splashes!',
  buttons() {
    return [
      { id: 'l', label: '◀ Left', key: '← / A', keys: ['ArrowLeft', 'KeyA', 'KeyZ'] },
      { id: 'up', label: 'Lift', key: 'Space / E (hold)', keys: ['Space', 'KeyE', 'Enter', 'ArrowUp', 'KeyW'], cls: 'main' },
      { id: 'r', label: 'Right ▶', key: '→ / D', keys: ['ArrowRight', 'KeyD', 'KeyX'] },
    ];
  },
  init(g, p) {
    g.pours = p.pours || 3; g.pour = 0; g.tea = 1; g.h = 0.2; g.px = 480; g.vx = 0;
    g.silk = 0; g.spill = 0; g.swap = 0; g.drops = []; g.inCup = true;
    g.need = clamp((p.need || 0.75) - g.assist * 0.08, 0.4, 1);
    const w = g.assist * 0.04; g.band = [0.55 - w, 0.84 + w];
    g.sway = 1 - Math.min(0.5, g.assist * 0.2);
  },
  cupX(g) { return 480 + (Math.sin(g.t * 0.75) * 150 + Math.sin(g.t * 1.9 + 1) * 40) * g.sway; },
  update(g, dt) {
    for (const d of g.drops) { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    g.drops = g.drops.filter((d) => d.y < 560);
    if (g.swap > 0) {
      g.swap -= dt;
      if (g.swap <= 0) { g.pour++; g.tea = 1; g.h = 0.2; if (g.pour >= g.pours) { if (g.silk >= g.need) g.win(g.p.winText); else g.fail(`The tea came out ${Math.round(g.silk * 100)}% silky. Lift the pot higher, into the gold band, and keep the stream in the pot.`); } }
      return;
    }
    const ax = (g.held('r') ? 1 : 0) - (g.held('l') ? 1 : 0);
    g.vx += (ax * 520 - g.vx) * Math.min(1, dt * 6); g.px = clamp(g.px + g.vx * dt, 120, 840);
    g.h = clamp(g.h + (g.held('up') ? 0.75 : -0.9) * dt, 0.05, 1);
    const cx = this.cupX(g), wob = Math.sin(g.t * 9) * g.h * g.h * 26, sx = g.px + 34 + wob;
    g.inCup = Math.abs(sx - cx) < 50;
    const inBand = g.h >= g.band[0] && g.h <= g.band[1], high = g.h > g.band[1];
    if (g.inCup) {
      g.silk = Math.min(1, g.silk + dt * (inBand ? 0.085 : 0.018) / g.pours * 3);
      if (high) { g.spill += dt * 0.18; if (Math.random() < dt * 20) g.drops.push({ x: sx, y: 392, vx: frand(-160, 160), vy: frand(-260, -120) }); }
    } else {
      g.spill += dt * 0.42 * (1 - g.assist * 0.15);
      if (Math.random() < dt * 30) g.drops.push({ x: sx, y: 470, vx: frand(-60, 60), vy: frand(-120, -40) });
    }
    if (Math.random() < dt * 6) AU.ui('pour');
    g.tea -= dt * 0.2;
    if (g.spill >= 1) { g.fail(g.p.spillText || 'Splash! Tea all over the counter. Keep the stream in the pot, and don\'t lift quite so high.'); return; }
    if (g.tea <= 0) { g.swap = 0.9; AU.ui('ok'); if (g.pour + 1 < g.pours) g.tip(fpick(['Swap the pots and pour again!', 'Again! Back and forth makes it smooth.', 'One more time!']), 1.4); }
  },
  pot(c, x, y, tilt, fill, sock) {
    c.save(); c.translate(x, y); c.rotate(tilt);
    // a tall enamel tea pot with a long spout
    c.fillStyle = '#d8dcdc'; c.strokeStyle = '#7a8284'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-34, -60); c.lineTo(34, -60); c.lineTo(30, 30); c.quadraticCurveTo(0, 40, -30, 30); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#b8bec0'; c.fillRect(-36, -64, 72, 8);
    c.beginPath(); c.moveTo(30, 10); c.quadraticCurveTo(58, 0, 70, -36); c.lineTo(62, -40); c.quadraticCurveTo(52, -8, 28, -4); c.closePath(); c.fillStyle = '#c8ced0'; c.fill(); c.stroke();
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 6; c.beginPath(); c.arc(-40, -16, 22, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
    if (fill > 0) { c.fillStyle = 'rgba(150,90,50,.85)'; c.fillRect(-28, -54 + (1 - fill) * 70, 56, 6); }
    if (sock) {
      // the cloth strainer that gives "silk stocking" milk tea its name, stained brown by years of tea
      c.fillStyle = '#9a6a3a'; c.beginPath(); c.moveTo(-18, -64); c.quadraticCurveTo(-26, -110, 0, -130); c.quadraticCurveTo(26, -110, 18, -64); c.closePath(); c.fill();
      c.strokeStyle = '#5a3a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -130); c.lineTo(0, -150); c.stroke();
    }
    c.restore();
  },
  draw(g, c) {
    const p = g.p;
    // the cha chaan teng counter: green tiles, a menu board, the bar
    c.fillStyle = '#2f5a4a'; c.fillRect(0, 0, 960, 540);
    c.fillStyle = 'rgba(255,255,255,.06)'; for (let x = 0; x < 960; x += 40) for (let y = 0; y < 420; y += 40) if ((x + y) % 80 === 0) c.fillRect(x, y, 40, 40);
    c.fillStyle = '#f4ecd8'; D.rr(c, 40, 24, 250, 116, 8); c.fill();
    D.text(c, '奶茶  $7', 60, 64, { size: 26, color: '#a8221e', font: CJK });
    D.text(c, '鴛鴦  $7', 60, 96, { size: 26, color: '#a8221e', font: CJK });
    D.text(c, 'milk tea · yuenyeung', 60, 126, { size: 15, color: '#6a5a4a' });
    c.fillStyle = '#8a5a3a'; c.fillRect(0, 470, 960, 70); c.fillStyle = '#a8724a'; c.fillRect(0, 462, 960, 12);
    // the gold band: how high to lift
    const top = (h) => 400 - (60 + h * 260);
    const b0 = top(g.band[1]), b1 = top(g.band[0]);
    c.fillStyle = 'rgba(255,210,90,.16)'; c.fillRect(870, b0, 60, b1 - b0); c.strokeStyle = '#ffd25a'; c.lineWidth = 2; c.strokeRect(870, b0, 60, b1 - b0);
    D.text(c, 'silky', 900, b0 - 8, { size: 14, align: 'center', color: '#ffe08a' });
    c.fillStyle = '#ffd25a'; c.beginPath(); c.moveTo(866, top(g.h)); c.lineTo(850, top(g.h) - 8); c.lineTo(850, top(g.h) + 8); c.fill();
    // the lower pot (moving), the stream, the upper pot (yours)
    const cx = this.cupX(g), py = top(g.h) - 40, swapK = g.swap > 0 ? 1 - g.swap / 0.9 : 0;
    this.pot(c, cx, 432, 0, 1 - g.tea, false);
    const wob = Math.sin(g.t * 9) * g.h * g.h * 26, sx = g.px + 34 + wob;
    if (g.swap <= 0) {
      c.strokeStyle = 'rgba(160,100,60,.92)'; c.lineWidth = 9 - g.h * 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(g.px + 60, py - 2); c.quadraticCurveTo(g.px + 60, py + 30, sx, g.inCup ? 400 : 470); c.stroke();
    }
    this.pot(c, g.px, py, g.swap > 0 ? -0.2 + swapK * 0.2 : 0.55, g.tea, true);
    for (const d of g.drops) { c.fillStyle = 'rgba(160,100,60,.85)'; c.beginPath(); c.arc(d.x, d.y, 4, 0, TAU); c.fill(); }
    // meters
    D.bar(c, 360, 20, 260, 18, g.silk / g.need, '#ffd25a'); D.text(c, 'Silky', 350, 35, { size: 16, align: 'right', stroke: 'rgba(0,0,0,.5)' });
    D.bar(c, 360, 46, 260, 12, g.spill, '#ff7a5a'); D.text(c, 'Spills', 350, 57, { size: 14, align: 'right', color: '#ffc8b8', stroke: 'rgba(0,0,0,.5)' });
    D.text(c, `Pour ${Math.min(g.pour + 1, g.pours)} of ${g.pours}`, 760, 36, { size: 20, align: 'center', color: '#fff8e0', stroke: 'rgba(0,0,0,.4)' });
    if (!g.inCup && g.swap <= 0) D.text(c, 'Missing the pot!', g.px + 40, py - 90, { size: 22, align: 'center', color: '#ffb0a0', stroke: '#2a1a10' });
  },
});
